import { initializeApp } from "firebase/app";
import { getFirestore, collection, writeBatch, doc } from "firebase/firestore";
import pkg from 'xlsx';
const { readFile, utils } = pkg;

const firebaseConfig = {
  apiKey: "AIzaSyDO-saswGsi9R7KNvHd0SB_Mlp8O7ZOzVk",
  authDomain: "erp-almoxarifado.firebaseapp.com",
  projectId: "erp-almoxarifado",
  storageBucket: "erp-almoxarifado.firebasestorage.app",
  messagingSenderId: "249956829888",
  appId: "1:249956829888:web:9f5dbbac1fe42d53873b25"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const workbook = readFile('../exemplo.xlsx');
const sheet = workbook.Sheets['MATERIAL'];
const data = utils.sheet_to_json(sheet, { header: 1 });

const materiaisRef = collection(db, 'materiais');

async function importData() {
  let count = 0;
  let batch = writeBatch(db);
  let batchCount = 0;

  console.log("Iniciando importação...");
  for(let i=4; i<data.length; i++) {
    const row = data[i];
    if (!row || !row[1] || typeof row[1] !== 'string' || row[1].trim() === '') continue; // Descrição is empty
    
    const descricao = String(row[1]).trim();
    const unidade = String(row[2] || 'UN').trim();
    const codigo = String(row[3] || '').trim();
    const estoque = Number(row[8]) || 0;
    const preco = Number(row[9]) || 0;

    const newDocRef = doc(materiaisRef);
    batch.set(newDocRef, {
      descricao: descricao,
      codigo_descricao: codigo,
      tipo: 'MATERIAL',
      unidade: unidade,
      estoque_atual: estoque,
      estoque_minimo: 0,
      preco_unitario_medio: preco,
      status: 'ATIVO',
      dataCadastro: new Date()
    });
    
    count++;
    batchCount++;

    if (batchCount >= 400) {
      await batch.commit();
      console.log(`Commit de batch feito. Total inserido: ${count}`);
      batch = writeBatch(db);
      batchCount = 0;
    }
  }
  
  if (batchCount > 0) {
    await batch.commit();
    console.log(`Commit do último batch feito. Total inserido: ${count}`);
  }

  console.log(`Importação concluída com sucesso! Total de materiais: ${count}`);
  process.exit(0);
}

importData().catch(console.error);
