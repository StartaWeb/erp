import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getMateriais, getFrentes, getFornecedores, getHistoricoMovimentacoes, registrarEntrada, registrarSaida, registrarDevolucao } from '../services/db';
import { ArrowDownLeft, ArrowUpRight, RotateCcw, AlertCircle, CheckCircle2, FileText, Download, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Movimentacoes() {
  const { userProfile, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('ENTRADA');
  const [materiais, setMateriais] = useState([]);
  const [frentes, setFrentes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Autocomplete state
  const [materialSearch, setMaterialSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const [formData, setFormData] = useState({
    materialId: '',
    quantidade: '',
    // Campos Entrada
    fornecedorId: '',
    nf: '',
    preco_unitario: '',
    // Campos Saída e Devolução
    frenteTrabalhoId: '',
    // Extra Saída
    empresa: '',
    coletor: '',
    vala_mnd: '',
    responsavelId: '',
    requisicao: '',
    equipamento: '',
    placa_serie: '',
    // Extra Devolução
    observacoes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [mats, frents, forns, hist] = await Promise.all([
        getMateriais(), 
        getFrentes(), 
        getFornecedores(),
        getHistoricoMovimentacoes()
      ]);
      setMateriais(mats);
      setFrentes(frents);
      setFornecedores(forns);
      setHistorico(hist);
    } catch (error) {
      console.error("Erro ao carregar listas", error);
    }
  }

  function handleInputChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function handleMaterialSelect(m) {
    setFormData({ ...formData, materialId: m.id });
    setMaterialSearch(`${m.codigo_descricao ? '[' + m.codigo_descricao + '] ' : ''}${m.descricao}`);
    setShowDropdown(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.materialId || !formData.quantidade || Number(formData.quantidade) <= 0) {
      setMessage({ type: 'error', text: 'Material e Quantidade válida são obrigatórios.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (activeTab === 'ENTRADA') {
        await registrarEntrada({
          fornecedorId: formData.fornecedorId,
          nf: formData.nf,
          operadorId: currentUser.uid,
          operadorNome: userProfile?.nome || currentUser.email
        }, formData.materialId, formData.quantidade, formData.preco_unitario);
        
        setMessage({ type: 'success', text: 'Entrada registrada com sucesso!' });
      } else if (activeTab === 'SAIDA') {
        if (!formData.responsavelId) {
          throw new Error('A validação do responsável é obrigatória para retiradas.');
        }

        await registrarSaida({
          frenteTrabalhoId: formData.frenteTrabalhoId,
          empresa: formData.empresa,
          coletor: formData.coletor,
          vala_mnd: formData.vala_mnd,
          responsavelId: formData.responsavelId,
          requisicao: formData.requisicao,
          equipamento: formData.equipamento,
          placa_serie: formData.placa_serie,
          operadorId: currentUser.uid,
          operadorNome: userProfile?.nome || currentUser.email
        }, formData.materialId, formData.quantidade);

        setMessage({ type: 'success', text: 'Saída registrada com sucesso!' });
      } else if (activeTab === 'DEVOLUCAO') {
        if (!formData.frenteTrabalhoId) {
          throw new Error('A Frente de Trabalho de origem é obrigatória para devoluções.');
        }

        await registrarDevolucao({
          frenteTrabalhoId: formData.frenteTrabalhoId,
          responsavelId: formData.responsavelId,
          observacoes: formData.observacoes,
          operadorId: currentUser.uid,
          operadorNome: userProfile?.nome || currentUser.email
        }, formData.materialId, formData.quantidade);

        setMessage({ type: 'success', text: 'Devolução registrada com sucesso!' });
      }
      
      // Limpa form parcial
      setFormData(prev => ({ ...prev, quantidade: '', preco_unitario: '', nf: '', requisicao: '', observacoes: '' }));
      setMaterialSearch('');
      setFormData(prev => ({ ...prev, materialId: '' }));
      loadData(); // recarrega estoques e historico
    } catch (error) {
      console.error("Erro transação:", error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  const selectedMaterial = materiais.find(m => m.id === formData.materialId);
  const filteredMateriais = materiais.filter(m => {
    const search = materialSearch.toLowerCase();
    return (m.descricao || '').toLowerCase().includes(search) || (m.codigo_descricao || '').toLowerCase().includes(search);
  });

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório de Movimentações Recentes', 14, 15);
    doc.setFontSize(10);
    doc.text("Gerado em: " + format(new Date(), "dd/MM/yyyy HH:mm"), 14, 22);

    const tableColumn = ["Data", "Tipo", "Material", "Qtd", "Responsável"];
    const tableRows = [];

    // Pegar apenas os 50 mais recentes pro PDF na tela de Movimentações pra não ficar gigante
    const recentes = historico.slice(0, 50);

    recentes.forEach(h => {
      const mat = materiais.find(m => m.id === h.materialId);
      const dataStr = (h.dataRegistro && typeof h.dataRegistro.toDate === 'function') ? format(h.dataRegistro.toDate(), 'dd/MM/yyyy HH:mm') : '-';
      const tipoStr = h.tipo;
      const matStr = mat ? ((mat.codigo_descricao ? mat.codigo_descricao+' - ' : '') + mat.descricao) : 'Desconhecido';
      
      let respStr = h.operadorNome;
      if (h.tipo === 'SAIDA' || h.tipo === 'DEVOLUCAO') respStr = h.responsavelId;
      
      tableRows.push([dataStr, tipoStr, matStr, h.quantidade, respStr]);
    });

    doc.autoTable({
      head: [tableColumn], body: tableRows, startY: 28, theme: 'grid', styles: { fontSize: 8 }, headStyles: { fillColor: [0, 82, 204] }
    });
    doc.save('movimentacoes_recentes.pdf');
  }

  function exportExcel() {
    const dataToExport = historico.map(h => {
      const mat = materiais.find(m => m.id === h.materialId);
      const forn = fornecedores.find(f => f.id === h.fornecedorId);
      const frente = frentes.find(f => f.id === h.frenteTrabalhoId);

      return {
        'Data Hora': (h.dataRegistro && typeof h.dataRegistro.toDate === 'function') ? format(h.dataRegistro.toDate(), 'dd/MM/yyyy HH:mm') : '-',
        'Tipo Movimento': h.tipo,
        'Cód. Material': mat?.codigo_descricao || '',
        'Descrição Material': mat?.descricao || 'Desconhecido',
        'Quantidade': h.quantidade,
        'Preço Unitário': h.preco_unitario,
        'Operador Sistema': h.operadorNome,
        'Fornecedor (Entrada)': forn ? forn.razao_social : (h.fornecedorId || '-'),
        'NF (Entrada)': h.nf || '-',
        'Destino/Origem (Frente)': frente ? frente.nome : (h.frenteTrabalhoId || '-'),
        'Responsável (Saída/Dev)': h.responsavelId || '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Movimentacoes_Completas");
    XLSX.writeFile(workbook, "movimentacoes_completas.xlsx");
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Registro de Movimentações</h1>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button 
          type="button"
          onClick={() => { setActiveTab('ENTRADA'); setMessage(null); }}
          style={{ 
            flex: 1, minWidth: '150px', padding: '1rem', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            backgroundColor: activeTab === 'ENTRADA' ? 'var(--success)' : 'var(--bg-card)',
            color: activeTab === 'ENTRADA' ? '#fff' : 'var(--text-muted)',
            boxShadow: activeTab === 'ENTRADA' ? 'var(--shadow-md)' : 'var(--shadow-sm)',
            transition: 'all 0.2s'
          }}
        >
          <ArrowDownLeft size={20} /> <span style={{ fontWeight: '600' }}>Entrada</span>
        </button>
        <button 
          type="button"
          onClick={() => { setActiveTab('SAIDA'); setMessage(null); }}
          style={{ 
            flex: 1, minWidth: '150px', padding: '1rem', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            backgroundColor: activeTab === 'SAIDA' ? 'var(--warning)' : 'var(--bg-card)',
            color: activeTab === 'SAIDA' ? '#fff' : 'var(--text-muted)',
            boxShadow: activeTab === 'SAIDA' ? 'var(--shadow-md)' : 'var(--shadow-sm)',
            transition: 'all 0.2s'
          }}
        >
          <ArrowUpRight size={20} /> <span style={{ fontWeight: '600' }}>Saída</span>
        </button>
        <button 
          type="button"
          onClick={() => { setActiveTab('DEVOLUCAO'); setMessage(null); }}
          style={{ 
            flex: 1, minWidth: '150px', padding: '1rem', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            backgroundColor: activeTab === 'DEVOLUCAO' ? 'var(--info)' : 'var(--bg-card)',
            color: activeTab === 'DEVOLUCAO' ? '#fff' : 'var(--text-muted)',
            boxShadow: activeTab === 'DEVOLUCAO' ? 'var(--shadow-md)' : 'var(--shadow-sm)',
            transition: 'all 0.2s'
          }}
        >
          <RotateCcw size={20} /> <span style={{ fontWeight: '600' }}>Devolução</span>
        </button>
      </div>

      {message && (
        <div style={{
          backgroundColor: message.type === 'error' ? '#ffebe6' : '#e3fcef',
          color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
          padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="card" style={{ marginBottom: '2rem' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            
            <div className="form-group" style={{ gridColumn: '1 / -1', position: 'relative' }}>
              <label className="form-label">Selecionar Material (Pesquise) *</label>
              <input 
                required={!formData.materialId}
                type="text" 
                className="form-input" 
                placeholder="Digite o código ou nome do material..."
                value={materialSearch}
                onChange={e => {
                  setMaterialSearch(e.target.value);
                  setShowDropdown(true);
                  if (formData.materialId) setFormData({...formData, materialId: ''});
                }}
                onFocus={() => setShowDropdown(true)}
              />
              {showDropdown && materialSearch && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: 'var(--shadow-md)' }}>
                  {filteredMateriais.length === 0 ? (
                    <div style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>Nenhum material encontrado.</div>
                  ) : (
                    filteredMateriais.map(m => (
                      <div 
                        key={m.id} 
                        onClick={() => handleMaterialSelect(m)}
                        style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid #f4f5f7' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--primary-light)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <strong>{m.codigo_descricao ? `[${m.codigo_descricao}] ` : ''}</strong>{m.descricao}
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Estoque: {m.estoque_atual} {m.unidade}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              {formData.materialId && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle2 size={14} /> Material selecionado
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Quantidade *</label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input required type="number" step="0.01" min="0.01" name="quantidade" className="form-input" style={{ borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)' }} value={formData.quantidade} onChange={handleInputChange} />
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)', borderLeft: 'none', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0', color: 'var(--text-muted)' }}>
                  {selectedMaterial?.unidade || 'UN'}
                </div>
              </div>
            </div>

            {activeTab === 'ENTRADA' && (
              <div className="form-group">
                <label className="form-label">Preço Unitário (R$) *</label>
                <input required type="number" step="0.01" name="preco_unitario" className="form-input" value={formData.preco_unitario} onChange={handleInputChange} />
              </div>
            )}

            {activeTab === 'ENTRADA' && (
              <>
                <div className="form-group">
                  <label className="form-label">Fornecedor *</label>
                  <select required name="fornecedorId" className="form-input" value={formData.fornecedorId} onChange={handleInputChange}>
                    <option value="">-- Selecione o Fornecedor --</option>
                    {fornecedores.map(f => <option key={f.id} value={f.id}>{f.razao_social}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Número da NF</label>
                  <input type="text" name="nf" className="form-input" value={formData.nf} onChange={handleInputChange} />
                </div>
              </>
            )}

            {(activeTab === 'SAIDA' || activeTab === 'DEVOLUCAO') && (
              <>
                <div className="form-group">
                  <label className="form-label">{activeTab === 'SAIDA' ? 'Destino' : 'Origem'} (Frente de Trabalho) *</label>
                  <select required name="frenteTrabalhoId" className="form-input" value={formData.frenteTrabalhoId} onChange={handleInputChange}>
                    <option value="">-- Selecione a Frente --</option>
                    {frentes.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Responsável *</label>
                  <input required type="text" name="responsavelId" className="form-input" placeholder="Nome/Assinatura do Encarregado" value={formData.responsavelId} onChange={handleInputChange} />
                </div>
              </>
            )}

            {activeTab === 'SAIDA' && (
              <>
                <div className="form-group">
                  <label className="form-label">Requisição Nº</label>
                  <input type="text" name="requisicao" className="form-input" value={formData.requisicao} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Coletor / Motorista</label>
                  <input type="text" name="coletor" className="form-input" value={formData.coletor} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Equipamento Aplicado</label>
                  <input type="text" name="equipamento" className="form-input" value={formData.equipamento} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Placa / Série</label>
                  <input type="text" name="placa_serie" className="form-input" value={formData.placa_serie} onChange={handleInputChange} />
                </div>
              </>
            )}

            {activeTab === 'DEVOLUCAO' && (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Observações / Motivo da Devolução</label>
                <textarea name="observacoes" className="form-input" rows="3" value={formData.observacoes} onChange={handleInputChange}></textarea>
              </div>
            )}
          </div>

          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={loading || !formData.materialId} className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
              {loading ? 'Registrando...' : ('Confirmar ' + (activeTab === 'ENTRADA' ? 'Entrada' : activeTab === 'SAIDA' ? 'Saída' : 'Devolução'))}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem' }}>Histórico Geral de Movimentações</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-outline" onClick={exportExcel} style={{ color: 'var(--success)', borderColor: 'var(--success)', fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
              <FileSpreadsheet size={16} /> Exportar Excel
            </button>
            <button className="btn btn-outline" onClick={exportPDF} style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
              <Download size={16} /> Imprimir PDF Recentes
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {historico.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Nenhuma movimentação registrada no sistema.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.75rem', fontWeight: '600' }}>Data</th>
                  <th style={{ padding: '0.75rem', fontWeight: '600' }}>Tipo</th>
                  <th style={{ padding: '0.75rem', fontWeight: '600' }}>Material</th>
                  <th style={{ padding: '0.75rem', fontWeight: '600' }}>Qtd</th>
                  <th style={{ padding: '0.75rem', fontWeight: '600' }}>Responsável</th>
                </tr>
              </thead>
              <tbody>
                {historico.slice(0, 10).map(h => {
                  const mat = materiais.find(m => m.id === h.materialId);
                  return (
                    <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem' }}>{(h.dataRegistro && typeof h.dataRegistro.toDate === 'function') ? format(h.dataRegistro.toDate(), "dd/MM HH:mm") : '-'}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ 
                          padding: '0.15rem 0.35rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold',
                          backgroundColor: h.tipo === 'ENTRADA' ? 'var(--success)20' : (h.tipo === 'DEVOLUCAO' ? 'var(--info)20' : 'var(--warning)20'),
                          color: h.tipo === 'ENTRADA' ? 'var(--success)' : (h.tipo === 'DEVOLUCAO' ? 'var(--info)' : 'var(--warning)')
                        }}>
                          {h.tipo}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontWeight: '500' }}>{mat?.descricao || 'Desconhecido'}</td>
                      <td style={{ padding: '0.75rem' }}>{h.quantidade}</td>
                      <td style={{ padding: '0.75rem' }}>{h.tipo === 'ENTRADA' ? h.operadorNome : h.responsavelId}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {historico.length > 10 && (
             <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
               Mostrando os 10 mais recentes na tela. Exporte para Excel para ver os {historico.length}.
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
