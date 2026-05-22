import { useState, useEffect } from 'react';
import { getHistoricoMovimentacoes, getMateriais, getFornecedores, getFrentes } from '../services/db';
import { FileText, Download, FileSpreadsheet, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Relatorios() {
  const [historico, setHistorico] = useState([]);
  const [materiais, setMateriais] = useState({});
  const [fornecedores, setFornecedores] = useState({});
  const [frentes, setFrentes] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Filtros de Auditoria
  const [materialFiltroId, setMaterialFiltroId] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const [histData, matsData, fornsData, frentsData] = await Promise.all([
          getHistoricoMovimentacoes(),
          getMateriais(),
          getFornecedores(),
          getFrentes()
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

  const dadosFiltrados = materialFiltroId 
    ? historico.filter(h => h.materialId === materialFiltroId)
    : historico;

  function exportPDF() {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text(materialFiltroId ? 'Auditoria de Material' : 'Relatório de Movimentações Gerais', 14, 15);
    doc.setFontSize(10);
    doc.text("Gerado em: " + format(new Date(), "dd/MM/yyyy HH:mm"), 14, 22);

    const tableColumn = ["Data", "Tipo", "Material", "Qtd", "R$ Unit.", "Operador/Resp."];
    const tableRows = [];

    dadosFiltrados.forEach(h => {
      const mat = materiais[h.materialId];
      const dataStr = h.dataRegistro ? format(h.dataRegistro.toDate(), 'dd/MM/yyyy HH:mm') : '-';
      const tipoStr = h.tipo;
      const matStr = mat ? ((mat.codigo_descricao ? mat.codigo_descricao+' - ' : '') + mat.descricao) : 'Desconhecido';
      
      let respStr = h.operadorNome;
      if (h.tipo === 'SAIDA') respStr = h.responsavelId + " (Req:" + (h.requisicao || '-') + ")";
      if (h.tipo === 'DEVOLUCAO') respStr = h.responsavelId + " (Devolução)";
      
      tableRows.push([
        dataStr,
        tipoStr,
        matStr,
        h.quantidade,
        "R$ " + Number(h.preco_unitario).toFixed(2),
        respStr
      ]);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 82, 204] }
    });

    doc.save('relatorio_auditoria.pdf');
  }

  function exportExcel() {
    const dataToExport = dadosFiltrados.map(h => {
      const mat = materiais[h.materialId];
      const forn = fornecedores[h.fornecedorId];
      const frente = frentes[h.frenteTrabalhoId];

      return {
        'Data Hora': h.dataRegistro ? format(h.dataRegistro.toDate(), 'dd/MM/yyyy HH:mm') : '-',
        'Tipo Movimento': h.tipo,
        'Cód. Material': mat?.codigo_descricao || '',
        'Descrição Material': mat?.descricao || 'Desconhecido',
        'Quantidade': h.quantidade,
        'Preço Unitário': h.preco_unitario,
        'Preço Total': h.preco_total,
        'Operador Sistema': h.operadorNome,
        'Fornecedor (Entrada)': forn ? forn.razao_social : (h.fornecedorId || '-'),
        'NF (Entrada)': h.nf || '-',
        'Destino/Origem (Frente)': frente ? frente.nome : (h.frenteTrabalhoId || '-'),
        'Responsável (Saída/Dev)': h.responsavelId || '-',
        'Requisição (Saída)': h.requisicao || '-',
        'Equipamento/Placa (Saída)': h.equipamento ? (h.equipamento + " - " + h.placa_serie) : '-',
        'Observações': h.observacoes || '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Auditoria");
    
    XLSX.writeFile(workbook, "auditoria_materiais.xlsx");
  }

  function exportInventarioExcel() {
    const dataToExport = Object.values(materiais).map(m => {
      const valorTotal = Number(m.estoque_atual || 0) * Number(m.preco_unitario_medio || 0);
      return {
        'CÓDIGO': m.codigo_descricao || '',
        'DESCRIÇÃO': m.descricao,
        'TIPO': m.tipo,
        'UNIDADE': m.unidade,
        'ESTOQUE MÍNIMO': m.estoque_minimo,
        'ESTOQUE ATUAL': m.estoque_atual,
        'PREÇO MÉDIO (R$)': Number(m.preco_unitario_medio || 0).toFixed(2),
        'VALOR TOTAL (R$)': valorTotal.toFixed(2)
      };
    });

    const somaTotal = dataToExport.reduce((acc, curr) => acc + Number(curr['VALOR TOTAL (R$)']), 0);
    
    dataToExport.push({
      'CÓDIGO': '', 'DESCRIÇÃO': 'TOTAL GERAL', 'TIPO': '', 'UNIDADE': '',
      'ESTOQUE MÍNIMO': '', 'ESTOQUE ATUAL': '', 'PREÇO MÉDIO (R$)': '',
      'VALOR TOTAL (R$)': somaTotal.toFixed(2)
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");
    XLSX.writeFile(workbook, "Inventario_Geral.xlsx");
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>Relatórios de Auditoria e Inventário</h1>
          <p style={{ color: 'var(--text-muted)' }}>Histórico completo de movimentações e posições de estoque</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={exportInventarioExcel} style={{ color: '#107c41', borderColor: '#107c41' }}>
            <FileSpreadsheet size={18} /> Exportar Inventário (Estoque Atual)
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Filtro de Auditoria</h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <select className="form-input" value={materialFiltroId} onChange={e => setMaterialFiltroId(e.target.value)}>
              <option value="">Todas as Movimentações (Histórico Geral)</option>
              {Object.values(materiais).map(m => (
                <option key={m.id} value={m.id}>{m.codigo_descricao ? `[${m.codigo_descricao}] ` : ''}{m.descricao}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-outline" onClick={exportExcel}>
              <Download size={18} /> Exportar Excel (Auditoria)
            </button>
            <button className="btn btn-primary" onClick={exportPDF}>
              <FileText size={18} /> Exportar PDF
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Carregando histórico...
          </div>
        ) : dadosFiltrados.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Search size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>Nenhuma movimentação registrada para os filtros selecionados.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>Data/Hora</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>Tipo</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>Material</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>Qtd</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>Responsável / Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {dadosFiltrados.map(h => {
                const mat = materiais[h.materialId];
                return (
                  <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem' }}>
                      {h.dataRegistro ? format(h.dataRegistro.toDate(), "dd/MMM yy HH:mm", { locale: ptBR }) : '-'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold',
                        backgroundColor: h.tipo === 'ENTRADA' ? 'var(--success)20' : (h.tipo === 'DEVOLUCAO' ? 'var(--info)20' : 'var(--warning)20'),
                        color: h.tipo === 'ENTRADA' ? 'var(--success)' : (h.tipo === 'DEVOLUCAO' ? 'var(--info)' : 'var(--warning)')
                      }}>
                        {h.tipo}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: '500' }}>{mat?.descricao || 'Desconhecido'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cód: {mat?.codigo_descricao || '-'}</div>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '600' }}>{h.quantidade}</td>
                    <td style={{ padding: '1rem' }}>
                      {h.tipo === 'ENTRADA' ? (
                        <div style={{ fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>NF:</span> {h.nf || '-'} <br/>
                          <span style={{ color: 'var(--text-muted)' }}>Operador:</span> {h.operadorNome}
                        </div>
                      ) : h.tipo === 'DEVOLUCAO' ? (
                        <div style={{ fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Devolvido por:</span> {h.responsavelId} <br/>
                          <span style={{ color: 'var(--text-muted)' }}>Frente:</span> {frentes[h.frenteTrabalhoId]?.nome || h.frenteTrabalhoId}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Encarregado:</span> {h.responsavelId} <br/>
                          <span style={{ color: 'var(--text-muted)' }}>Frente:</span> {frentes[h.frenteTrabalhoId]?.nome || h.frenteTrabalhoId}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
