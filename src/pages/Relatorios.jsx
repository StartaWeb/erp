import { useState, useEffect } from 'react';
import { getHistoricoMovimentacoes, getMateriais } from '../services/db';
import { FileText, Download, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Relatorios() {
  const [historico, setHistorico] = useState([]);
  const [materiais, setMateriais] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const [histData, matsData] = await Promise.all([
          getHistoricoMovimentacoes(),
          getMateriais()
        ]);
        
        if (isMounted) {
          const matsMap = {};
          matsData.forEach(m => { matsMap[m.id] = m; });
          
          setMateriais(matsMap);
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

  function exportPDF() {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Relatório de Movimentações (Entradas e Saídas)', 14, 15);
    doc.setFontSize(10);
    doc.text("Gerado em: " + format(new Date(), "dd/MM/yyyy HH:mm"), 14, 22);

    const tableColumn = ["Data", "Tipo", "Material", "Qtd", "R$ Unit.", "Operador/Resp."];
    const tableRows = [];

    historico.forEach(h => {
      const mat = materiais[h.materialId];
      const dataStr = h.dataRegistro ? format(h.dataRegistro.toDate(), 'dd/MM/yyyy HH:mm') : '-';
      const tipoStr = h.tipo;
      const matStr = mat ? ((mat.codigo_descricao ? mat.codigo_descricao+' - ' : '') + mat.descricao) : 'Desconhecido';
      const respStr = h.tipo === 'ENTRADA' ? h.operadorNome : (h.responsavelId + " (Req:" + (h.requisicao || '-') + ")");
      
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

    doc.save('relatorio_movimentacoes.pdf');
  }

  function exportExcel() {
    const dataToExport = historico.map(h => {
      const mat = materiais[h.materialId];
      return {
        'Data Hora': h.dataRegistro ? format(h.dataRegistro.toDate(), 'dd/MM/yyyy HH:mm') : '-',
        'Tipo': h.tipo,
        'Cód. Material': mat?.codigo_descricao || '',
        'Descrição Material': mat?.descricao || 'Desconhecido',
        'Quantidade': h.quantidade,
        'Preço Unitário': h.preco_unitario,
        'Preço Total': h.preco_total,
        'Operador Sistema': h.operadorNome,
        'Fornecedor (Entrada)': h.fornecedorId || '-',
        'NF (Entrada)': h.nf || '-',
        'Encarregado (Saída)': h.responsavelId || '-',
        'Requisição (Saída)': h.requisicao || '-',
        'Equipamento/Placa (Saída)': h.equipamento ? (h.equipamento + " - " + h.placa_serie) : '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Movimentacoes");
    
    XLSX.writeFile(workbook, "historico_almoxarifado.xlsx");
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>Relatórios e Histórico</h1>
          <p style={{ color: 'var(--text-muted)' }}>Acompanhe todas as entradas e saídas do almoxarifado</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={exportExcel} style={{ color: 'var(--success)', borderColor: 'var(--success)' }}>
            <FileSpreadsheet size={18} /> Exportar Excel
          </button>
          <button className="btn btn-primary" onClick={exportPDF}>
            <Download size={18} /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Carregando histórico...
          </div>
        ) : historico.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>Nenhuma movimentação registrada até o momento.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>Data/Hora</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>Tipo</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>Material</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>Qtd</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>Responsável / NF</th>
              </tr>
            </thead>
            <tbody>
              {historico.map(h => {
                const mat = materiais[h.materialId];
                return (
                  <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem' }}>
                      {h.dataRegistro ? format(h.dataRegistro.toDate(), "dd/MMM yy HH:mm", { locale: ptBR }) : '-'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold',
                        backgroundColor: h.tipo === 'ENTRADA' ? 'var(--success)20' : 'var(--warning)20',
                        color: h.tipo === 'ENTRADA' ? 'var(--success)' : 'var(--warning)'
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
                      ) : (
                        <div style={{ fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Encarregado:</span> {h.responsavelId} <br/>
                          <span style={{ color: 'var(--text-muted)' }}>Req:</span> {h.requisicao || '-'}
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
