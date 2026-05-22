import { db } from '../firebase';
import { 
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, Timestamp, runTransaction
} from 'firebase/firestore';

function parseNum(val) {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const parsed = Number(String(val).replace(',', '.'));
  return isNaN(parsed) ? 0 : parsed;
}

// --- MATERIAIS ---
export const materiaisRef = collection(db, 'materiais');

export async function getMateriais() {
  const q = query(materiaisRef, orderBy('descricao', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getMaterial(id) {
  const docRef = doc(db, 'materiais', id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}

export async function addMaterial(data) {
  return addDoc(materiaisRef, {
    ...data,
    estoque_atual: parseNum(data.estoque_atual),
    estoque_minimo: parseNum(data.estoque_minimo),
    preco_unitario_medio: parseNum(data.preco_unitario_medio),
    dataCadastro: Timestamp.now()
  });
}

export async function updateMaterial(id, data) {
  const docRef = doc(db, 'materiais', id);
  const cleanData = { ...data };
  if (cleanData.estoque_atual !== undefined) cleanData.estoque_atual = parseNum(cleanData.estoque_atual);
  if (cleanData.estoque_minimo !== undefined) cleanData.estoque_minimo = parseNum(cleanData.estoque_minimo);
  if (cleanData.preco_unitario_medio !== undefined) cleanData.preco_unitario_medio = parseNum(cleanData.preco_unitario_medio);
  return updateDoc(docRef, cleanData);
}

// --- FRENTES DE TRABALHO ---
export const frentesRef = collection(db, 'frentes_trabalho');

export async function getFrentes() {
  const q = query(frentesRef, orderBy('nome', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addFrente(data) {
  return addDoc(frentesRef, {
    ...data,
    dataCadastro: Timestamp.now()
  });
}

export async function updateFrente(id, data) {
  const docRef = doc(db, 'frentes_trabalho', id);
  return updateDoc(docRef, data);
}

export async function deleteFrente(id) {
  const docRef = doc(db, 'frentes_trabalho', id);
  return deleteDoc(docRef);
}

// --- FORNECEDORES ---
export const fornecedoresRef = collection(db, 'fornecedores');

export async function getFornecedores() {
  const q = query(fornecedoresRef, orderBy('razao_social', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addFornecedor(data) {
  return addDoc(fornecedoresRef, {
    ...data,
    dataCadastro: Timestamp.now()
  });
}

export async function updateFornecedor(id, data) {
  const docRef = doc(db, 'fornecedores', id);
  return updateDoc(docRef, data);
}

export async function deleteFornecedor(id) {
  const docRef = doc(db, 'fornecedores', id);
  return deleteDoc(docRef);
}

// --- MATERIAIS ALUGADOS ---
export const materiaisAlugadosRef = collection(db, 'materiais_alugados');

export async function getMateriaisAlugados() {
  const q = query(materiaisAlugadosRef, orderBy('dataCadastro', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addMaterialAlugado(data) {
  return addDoc(materiaisAlugadosRef, {
    ...data,
    dataCadastro: Timestamp.now()
  });
}

export async function updateMaterialAlugado(id, data) {
  const docRef = doc(db, 'materiais_alugados', id);
  return updateDoc(docRef, data);
}

export async function deleteMaterialAlugado(id) {
  const docRef = doc(db, 'materiais_alugados', id);
  return deleteDoc(docRef);
}

// --- MOVIMENTAÇÕES (Transações) ---
export const entradasRef = collection(db, 'entradas');
export const saidasRef = collection(db, 'saidas');
export const devolucoesRef = collection(db, 'devolucoes');

export async function registrarEntrada(entradaData, materialId, quantidade, precoUnitario) {
  const materialRef = doc(db, 'materiais', materialId);
  
  await runTransaction(db, async (transaction) => {
    const materialDoc = await transaction.get(materialRef);
    if (!materialDoc.exists()) {
      throw new Error("Material não encontrado!");
    }

    const materialData = materialDoc.data();
    const estoqueAntigo = parseNum(materialData.estoque_atual);
    const precoMedioAntigo = parseNum(materialData.preco_unitario_medio);
    const qtdNova = parseNum(quantidade);
    const precoNovo = parseNum(precoUnitario);

    const valorEstoqueAntigo = estoqueAntigo * precoMedioAntigo;
    const valorEntrada = qtdNova * precoNovo;
    const estoqueFinal = estoqueAntigo + qtdNova;
    const precoMedioFinal = estoqueFinal > 0 ? (valorEstoqueAntigo + valorEntrada) / estoqueFinal : precoNovo;

    transaction.update(materialRef, {
      estoque_atual: estoqueFinal,
      preco_unitario_medio: precoMedioFinal
    });

    const novaEntradaRef = doc(entradasRef);
    transaction.set(novaEntradaRef, {
      ...entradaData,
      materialId,
      quantidade: qtdNova,
      preco_unitario: precoNovo,
      preco_total: valorEntrada,
      tipo: 'ENTRADA',
      dataRegistro: Timestamp.now()
    });
  });
}

export async function registrarSaida(saidaData, materialId, quantidade) {
  const materialRef = doc(db, 'materiais', materialId);
  
  await runTransaction(db, async (transaction) => {
    const materialDoc = await transaction.get(materialRef);
    if (!materialDoc.exists()) {
      throw new Error("Material não encontrado!");
    }

    const materialData = materialDoc.data();
    const estoqueAtual = parseNum(materialData.estoque_atual);
    const qtdSaida = parseNum(quantidade);

    if (estoqueAtual < qtdSaida) {
      throw new Error("Estoque insuficiente! Disponível: " + estoqueAtual);
    }

    const estoqueFinal = estoqueAtual - qtdSaida;
    const precoMedio = parseNum(materialData.preco_unitario_medio);
    const valorSaida = qtdSaida * precoMedio;

    transaction.update(materialRef, {
      estoque_atual: estoqueFinal
    });

    const novaSaidaRef = doc(saidasRef);
    transaction.set(novaSaidaRef, {
      ...saidaData,
      materialId,
      quantidade: qtdSaida,
      preco_unitario: precoMedio,
      preco_total: valorSaida,
      tipo: 'SAIDA',
      dataRegistro: Timestamp.now()
    });
  });
}

export async function registrarDevolucao(devolucaoData, materialId, quantidade) {
  const materialRef = doc(db, 'materiais', materialId);
  
  await runTransaction(db, async (transaction) => {
    const materialDoc = await transaction.get(materialRef);
    if (!materialDoc.exists()) {
      throw new Error("Material não encontrado!");
    }

    const materialData = materialDoc.data();
    const estoqueAtual = parseNum(materialData.estoque_atual);
    const qtdDevolucao = parseNum(quantidade);
    const precoMedio = parseNum(materialData.preco_unitario_medio);

    const estoqueFinal = estoqueAtual + qtdDevolucao;
    const valorDevolucao = qtdDevolucao * precoMedio;

    transaction.update(materialRef, {
      estoque_atual: estoqueFinal
    });

    const novaDevolucaoRef = doc(devolucoesRef);
    transaction.set(novaDevolucaoRef, {
      ...devolucaoData,
      materialId,
      quantidade: qtdDevolucao,
      preco_unitario: precoMedio,
      preco_total: valorDevolucao,
      tipo: 'DEVOLUCAO',
      dataRegistro: Timestamp.now()
    });
  });
}

// --- RELATÓRIOS E HISTÓRICO ---
export async function getHistoricoMovimentacoes() {
  const entradasSnapshot = await getDocs(query(entradasRef, orderBy('dataRegistro', 'desc')));
  const saidasSnapshot = await getDocs(query(saidasRef, orderBy('dataRegistro', 'desc')));
  const devolucoesSnapshot = await getDocs(query(devolucoesRef, orderBy('dataRegistro', 'desc')));
  
  const entradas = entradasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const saidas = saidasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const devolucoes = devolucoesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // Combina e ordena por data descrescente
  const historico = [...entradas, ...saidas, ...devolucoes].sort((a, b) => {
    const timeA = a.dataRegistro ? (typeof a.dataRegistro.toMillis === 'function' ? a.dataRegistro.toMillis() : 0) : 0;
    const timeB = b.dataRegistro ? (typeof b.dataRegistro.toMillis === 'function' ? b.dataRegistro.toMillis() : 0) : 0;
    return timeB - timeA;
  });
  
  return historico;
}
