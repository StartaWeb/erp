import React, { useState, useEffect } from 'react';
import { getHistoricoMovimentacoes, getMateriais, getFornecedores, getFrentes, getMateriaisAlugados } from '../services/db';
import { FileText, Download, FileSpreadsheet, Search, Package, Users, Wrench, CalendarClock, Building2, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

function safeFormatDate(dateVal, formatStr, options) {
  if (!dateVal) return '-';
  const d = typeof dateVal.toDate === 'function' ? dateVal.toDate() : new Date(dateVal);
  return isNaN(d.getTime()) ? '-' : format(d, formatStr, options);
}

export default function Relatorios() {
  const [historico, setHistorico] = useState([]);
  const [materiais, setMateriais] = useState({});
  const [fornecedores, setFornecedores] = useState({});
  const [frentes, setFrentes] = useState({});
  const [alugados, setAlugados] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('INVENTARIO');
  const [materialFiltroId, setMaterialFiltroId] = useState('');
  const [requisicaoFiltro, setRequisicaoFiltro] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const [histData, matsData, fornsData, frentsData, alugData] = await Promise.all([
          getHistoricoMovimentacoes(),
          getMateriais(),
          getFornecedores(),
          getFrentes(),
          getMateriaisAlugados()
        ]);
        
        if (isMounted) {
          const matsMap = {};
          matsData.forEach(m => { matsMap[m.id] = m; });
          
          const fornsMap = {};
          fornsData.forEach(f => { fornsMap[f.id] = f; });

          const frentsMap = {};
          frentsData.forEach(f => { frentsMap[f.id] = f; });
          
          setMateriais(matsMap);
          setFornecedores(fornsMap);
          setFrentes(frentsMap);
          setHistorico(histData);
          setAlugados(alugData);
        }
      } catch (error) {
        console.error("Erro ao carregar relatórios", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  const arrayMateriais = Object.values(materiais);
  const arrayFornecedores = Object.values(fornecedores);
  const arrayFrentes = Object.values(frentes);

  const dadosAuditoria = materialFiltroId 
    ? historico.filter(h => h.materialId === materialFiltroId)
    : historico;

  const dadosRequisicao = requisicaoFiltro
    ? historico.filter(h => h.requisicao?.toLowerCase().includes(requisicaoFiltro.toLowerCase()))
    : historico.filter(h => h.requisicao); // Só mostra os que tem requisição

  // --- Exportações Gerais ---
  function exportarTabela(titulo, colunas, linhas, nomeArquivo) {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(titulo, 14, 15);
    doc.setFontSize(10);
    doc.text("Gerado em: " + format(new Date(), "dd/MM/yyyy HH:mm"), 14, 22);

    doc.autoTable({
      head: [colunas], body: linhas, startY: 28, theme: 'grid', styles: { fontSize: 8 }, headStyles: { fillColor: [0, 82, 204] }
    });
    doc.save(nomeArquivo + '.pdf');
  }

  function exportarExcel(dataToExport, nomeAba, nomeArquivo) {
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, nomeAba);
    XLSX.writeFile(workbook, nomeArquivo + ".xlsx");
  }

  // --- Funções de Exportação por Aba ---

  // INVENTÁRIO
  function exportInventarioPDF() {
    const linhas = [];
    let somaGeral = 0;
    arrayMateriais.forEach(m => {
      const valorTotal = Number(m.estoque_atual || 0) * Number(m.preco_unitario_medio || 0);
      somaGeral += valorTotal;
      linhas.push([m.codigo_descricao || '-', m.descricao, m.estoque_atual + ' ' + m.unidade, "R$ " + Number(m.preco_unitario_medio || 0).toFixed(2), "R$ " + valorTotal.toFixed(2)]);
    });
    linhas.push(["", "TOTAL GERAL NO ESTOQUE:", "", "", "R$ " + somaGeral.toFixed(2)]);
    exportarTabela('Relatório de Inventário (Materiais)', ["Cód.", "Descrição", "Estoque", "Preço Médio", "Valor Total"], linhas, 'relatorio_inventario');
  }
  function exportInventarioExcel() {
    const data = arrayMateriais.map(m => ({
      'CÓDIGO': m.codigo_descricao || '', 'DESCRIÇÃO': m.descricao, 'TIPO': m.tipo, 'ESTOQUE ATUAL': m.estoque_atual, 'VALOR TOTAL (R$)': (Number(m.estoque_atual || 0) * Number(m.preco_unitario_medio || 0)).toFixed(2)
    }));
    exportarExcel(data, "Inventario", "Inventario_Geral");
  }

  // AUDITORIA (MOVIMENTAÇÕES)
  function exportAuditoriaPDF() {
    const colunas = ["Data", "Tipo", "Material", "Qtd", "Responsável"];
    const linhas = dadosAuditoria.map(h => [
      safeFormatDate(h.dataRegistro, 'dd/MM/yyyy HH:mm'), h.tipo, materiais[h.materialId]?.descricao || 'Desconhecido', h.quantidade, h.tipo === 'SAIDA' ? h.responsavelId + " (Req: " + (h.requisicao||'-') + ")" : h.tipo === 'ENTRADA' ? h.operadorNome : h.responsavelId
    ]);
    exportarTabela('Relatório de Movimentações', colunas, linhas, 'relatorio_auditoria');
  }
  function exportAuditoriaExcel() {
    const data = dadosAuditoria.map(h => ({
      'Data Hora': safeFormatDate(h.dataRegistro, 'dd/MM/yyyy HH:mm'), 'Tipo Movimento': h.tipo, 'Material': materiais[h.materialId]?.descricao || 'Desconhecido', 'Quantidade': h.quantidade, 'Responsável': h.responsavelId || h.operadorNome, 'Requisição': h.requisicao || '-'
    }));
    exportarExcel(data, "Auditoria", "auditoria_movimentacoes");
  }

  // REQUISIÇÕES
  function exportRequisicaoPDF() {
    const colunas = ["Requisição", "Data", "Material", "Qtd", "Responsável", "Frente"];
    const linhas = dadosRequisicao.map(h => [
      h.requisicao, safeFormatDate(h.dataRegistro, 'dd/MM/yyyy HH:mm'), materiais[h.materialId]?.descricao || 'Desconhecido', h.quantidade, h.responsavelId, frentes[h.frenteTrabalhoId]?.nome || h.frenteTrabalhoId
    ]);
    exportarTabela('Relatório de Requisições', colunas, linhas, 'relatorio_requisicoes');
  }
  function exportRequisicaoExcel() {
    const data = dadosRequisicao.map(h => ({
      'Requisição': h.requisicao, 'Data': safeFormatDate(h.dataRegistro, 'dd/MM/yyyy HH:mm'), 'Material': materiais[h.materialId]?.descricao || 'Desconhecido', 'Qtd': h.quantidade, 'Responsável': h.responsavelId, 'Frente': frentes[h.frenteTrabalhoId]?.nome || h.frenteTrabalhoId
    }));
    exportarExcel(data, "Requisicoes", "relatorio_requisicoes");
  }

  // FORNECEDORES
  function exportFornecedoresPDF() {
    const colunas = ["Razão Social", "CNPJ", "Telefone", "Email"];
    const linhas = arrayFornecedores.map(f => [f.razao_social, f.cnpj || '-', f.telefone || '-', f.email || '-']);
    exportarTabela('Relatório de Fornecedores', colunas, linhas, 'relatorio_fornecedores');
  }
  function exportFornecedoresExcel() {
    exportarExcel(arrayFornecedores, "Fornecedores", "relatorio_fornecedores");
  }

  // FRENTES DE TRABALHO
  function exportFrentesPDF() {
    const colunas = ["Nome da Frente", "Endereço", "Responsável", "Status"];
    const linhas = arrayFrentes.map(f => [f.nome, f.endereco || '-', f.responsavel || '-', f.status]);
    exportarTabela('Relatório de Frentes de Trabalho', colunas, linhas, 'relatorio_frentes');
  }
  function exportFrentesExcel() {
    exportarExcel(arrayFrentes, "Frentes", "relatorio_frentes");
  }

  // MATERIAIS ALUGADOS
  function exportAlugadosPDF() {
    const colunas = ["Material", "Frente", "Status", "Previsão Devolução"];
    const linhas = alugados.map(a => [a.descricao, frentes[a.frenteId]?.nome || '-', a.status, safeFormatDate(a.data_previa_saida, 'dd/MM/yyyy')]);
    exportarTabela('Relatório de Materiais Alugados', colunas, linhas, 'relatorio_alugados');
  }
  function exportAlugadosExcel() {
    const data = alugados.map(a => ({
      'Material': a.descricao, 'Frente': frentes[a.frenteId]?.nome || '-', 'Status': a.status, 'Previsão': safeFormatDate(a.data_previa_saida, 'dd/MM/yyyy')
    }));
    exportarExcel(data, "Alugados", "relatorio_alugados");
  }

  // --- Renderização ---
  const abas = [
    { id: 'INVENTARIO', label: 'Materiais (Inventário)', icon: Package },
    { id: 'AUDITORIA', label: 'Movimentações', icon: FileText },
    { id: 'REQUISICAO', label: 'Requisições', icon: ClipboardList },
    { id: 'ALUGADOS', label: 'Materiais Alugados', icon: CalendarClock },
    { id: 'FORNECEDORES', label: 'Fornecedores', icon: Building2 },
    { id: 'FRENTES', label: 'Frentes de Trabalho', icon: Wrench },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>Relatórios do Sistema</h1>
        <p style={{ color: 'var(--text-muted)' }}>Exporte informações de diversas áreas do sistema</p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column', md: { flexDirection: 'row'} }}>
        
        {/* SIDEBAR DE ABAS */}
        <div className="card" style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '280px' }}>
          {abas.map(aba => (
            <button 
              key={aba.id}
              onClick={() => setActiveTab(aba.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '4px',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                backgroundColor: activeTab === aba.id ? 'var(--primary-light)' : 'transparent',
                color: activeTab === aba.id ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: activeTab === aba.id ? '500' : '400',
                transition: 'all 0.2s'
              }}
            >
              <aba.icon size={18} /> {aba.label}
            </button>
          ))}
        </div>

        {/* CONTEÚDO DO RELATÓRIO */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{abas.find(a => a.id === activeTab)?.label}</h2>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-outline" style={{ color: '#107c41', borderColor: '#107c41' }} onClick={() => {
                if(activeTab==='INVENTARIO') exportInventarioExcel();
                if(activeTab==='AUDITORIA') exportAuditoriaExcel();
                if(activeTab==='REQUISICAO') exportRequisicaoExcel();
                if(activeTab==='ALUGADOS') exportAlugadosExcel();
                if(activeTab==='FORNECEDORES') exportFornecedoresExcel();
                if(activeTab==='FRENTES') exportFrentesExcel();
              }}>
                <FileSpreadsheet size={18} /> Exportar Excel
              </button>
              <button className="btn btn-primary" onClick={() => {
                if(activeTab==='INVENTARIO') exportInventarioPDF();
                if(activeTab==='AUDITORIA') exportAuditoriaPDF();
                if(activeTab==='REQUISICAO') exportRequisicaoPDF();
                if(activeTab==='ALUGADOS') exportAlugadosPDF();
                if(activeTab==='FORNECEDORES') exportFornecedoresPDF();
                if(activeTab==='FRENTES') exportFrentesPDF();
              }}>
                <Download size={18} /> Exportar PDF
              </button>
            </div>
          </div>

          {/* Filtros específicos por aba */}
          {activeTab === 'AUDITORIA' && (
            <div className="card" style={{ padding: '1rem' }}>
              <label className="form-label">Filtrar por Material</label>
              <select className="form-input" value={materialFiltroId} onChange={e => setMaterialFiltroId(e.target.value)}>
                <option value="">Todas as Movimentações</option>
                {arrayMateriais.map(m => <option key={m.id} value={m.id}>{m.descricao}</option>)}
              </select>
            </div>
          )}

          {activeTab === 'REQUISICAO' && (
            <div className="card" style={{ padding: '1rem' }}>
              <label className="form-label">Buscar Requisição</label>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}/>
                <input type="text" className="form-input" style={{ paddingLeft: '2.5rem' }} placeholder="Digite o número da requisição..." value={requisicaoFiltro} onChange={e => setRequisicaoFiltro(e.target.value)} />
              </div>
            </div>
          )}

          {/* Tabela de Previsualização */}
          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
                    {activeTab === 'INVENTARIO' && <><th style={{padding:'1rem'}}>Descrição</th><th style={{padding:'1rem'}}>Estoque</th></>}
                    {activeTab === 'AUDITORIA' && <><th style={{padding:'1rem'}}>Data</th><th style={{padding:'1rem'}}>Tipo</th><th style={{padding:'1rem'}}>Material</th><th style={{padding:'1rem'}}>Qtd</th></>}
                    {activeTab === 'REQUISICAO' && <><th style={{padding:'1rem'}}>Requisição</th><th style={{padding:'1rem'}}>Material</th><th style={{padding:'1rem'}}>Qtd</th></>}
                    {activeTab === 'ALUGADOS' && <><th style={{padding:'1rem'}}>Material</th><th style={{padding:'1rem'}}>Frente</th><th style={{padding:'1rem'}}>Status</th></>}
                    {activeTab === 'FORNECEDORES' && <><th style={{padding:'1rem'}}>Razão Social</th><th style={{padding:'1rem'}}>CNPJ</th></>}
                    {activeTab === 'FRENTES' && <><th style={{padding:'1rem'}}>Nome da Frente</th><th style={{padding:'1rem'}}>Status</th></>}
                  </tr>
                </thead>
                <tbody>
                  {activeTab === 'INVENTARIO' && arrayMateriais.slice(0, 50).map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{padding:'1rem'}}>{m.descricao}</td><td style={{padding:'1rem'}}>{m.estoque_atual}</td>
                    </tr>
                  ))}
                  {activeTab === 'AUDITORIA' && dadosAuditoria.slice(0, 50).map(h => (
                    <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{padding:'1rem'}}>{safeFormatDate(h.dataRegistro, 'dd/MM/yyyy HH:mm')}</td><td style={{padding:'1rem'}}>{h.tipo}</td><td style={{padding:'1rem'}}>{materiais[h.materialId]?.descricao}</td><td style={{padding:'1rem'}}>{h.quantidade}</td>
                    </tr>
                  ))}
                  {activeTab === 'REQUISICAO' && dadosRequisicao.slice(0, 50).map(h => (
                    <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{padding:'1rem'}}>{h.requisicao}</td><td style={{padding:'1rem'}}>{materiais[h.materialId]?.descricao}</td><td style={{padding:'1rem'}}>{h.quantidade}</td>
                    </tr>
                  ))}
                  {activeTab === 'ALUGADOS' && alugados.slice(0, 50).map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{padding:'1rem'}}>{a.descricao}</td><td style={{padding:'1rem'}}>{frentes[a.frenteId]?.nome}</td><td style={{padding:'1rem'}}>{a.status}</td>
                    </tr>
                  ))}
                  {activeTab === 'FORNECEDORES' && arrayFornecedores.slice(0, 50).map(f => (
                    <tr key={f.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{padding:'1rem'}}>{f.razao_social}</td><td style={{padding:'1rem'}}>{f.cnpj || '-'}</td>
                    </tr>
                  ))}
                  {activeTab === 'FRENTES' && arrayFrentes.slice(0, 50).map(f => (
                    <tr key={f.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{padding:'1rem'}}>{f.nome}</td><td style={{padding:'1rem'}}>{f.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Mostrando prévia. Exporte para ver todos os registros e colunas completas.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
