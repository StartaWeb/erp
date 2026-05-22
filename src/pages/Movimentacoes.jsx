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

  const gerarRequisicao = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `REQ-${format(new Date(), 'yyyyMMdd')}-${result}`;
  };

  const [materialSearch, setMaterialSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const [formData, setFormData] = useState({
    materialId: '',
    quantidade: '',
    fornecedorId: '',
    nf: '',
    preco_unitario: '',
    frenteTrabalhoId: '',
    empresa: '',
    coletor: '',
    vala_mnd: '',
    responsavelId: '',
    requisicao: '',
    equipamento: '',
    placa_serie: '',
    observacoes: ''
  });

  const [itensRequisicao, setItensRequisicao] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [mats, frents, forns, hist] = await Promise.all([
        getMateriais(), getFrentes(), getFornecedores(), getHistoricoMovimentacoes()
      ]);
      setMateriais(mats);
      setFrentes(frents);
      setFornecedores(forns);
      setHistorico(hist);
    } catch (error) {
      console.error("Erro ao carregar listas", error);
    }
  }

  useEffect(() => {
    if (activeTab === 'DEVOLUCAO' && formData.requisicao) {
      const saidasReq = historico.filter(h => h.tipo === 'SAIDA' && h.requisicao === formData.requisicao);
      const devolucoesReq = historico.filter(h => h.tipo === 'DEVOLUCAO' && h.requisicao === formData.requisicao);

      const itemsMap = {};
      saidasReq.forEach(s => {
        if (!itemsMap[s.materialId]) {
          itemsMap[s.materialId] = { materialId: s.materialId, qtdSaida: 0, qtdDevolvida: 0 };
        }
        itemsMap[s.materialId].qtdSaida += Number(s.quantidade);
        // Preenche o campo de frente e responsável da primeira saída encontrada pra facilitar
        if (!formData.frenteTrabalhoId) {
          setFormData(prev => ({ ...prev, frenteTrabalhoId: s.frenteTrabalhoId, responsavelId: s.responsavelId }));
        }
      });

      devolucoesReq.forEach(d => {
        if (itemsMap[d.materialId]) {
          itemsMap[d.materialId].qtdDevolvida += Number(d.quantidade);
        }
      });

      const list = Object.values(itemsMap).map(item => ({
        ...item,
        qtdRestante: item.qtdSaida - item.qtdDevolvida,
        qtdDevolver: ''
      })).filter(item => item.qtdRestante > 0);

      setItensRequisicao(list);
    } else {
      setItensRequisicao([]);
    }
  }, [formData.requisicao, historico, activeTab]);

  function handleInputChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function handleMaterialSelect(m) {
    setFormData({ ...formData, materialId: m.id });
    setMaterialSearch(`${m.codigo_descricao ? '[' + m.codigo_descricao + '] ' : ''}${m.descricao}`);
    setShowDropdown(false);
  }

  function handleItemDevolverChange(materialId, value) {
    setItensRequisicao(prev => prev.map(item => 
      item.materialId === materialId ? { ...item, qtdDevolver: value } : item
    ));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (activeTab === 'ENTRADA') {
        if (!formData.materialId || !formData.quantidade || Number(formData.quantidade) <= 0) {
          throw new Error('Material e Quantidade válida são obrigatórios.');
        }
        await registrarEntrada({
          fornecedorId: formData.fornecedorId,
          nf: formData.nf,
          operadorId: currentUser.uid,
          operadorNome: userProfile?.nome || currentUser.email
        }, formData.materialId, formData.quantidade, formData.preco_unitario);
        
        setMessage({ type: 'success', text: 'Entrada registrada com sucesso!' });
      } 
      else if (activeTab === 'SAIDA') {
        if (!formData.materialId || !formData.quantidade || Number(formData.quantidade) <= 0) {
          throw new Error('Material e Quantidade válida são obrigatórios.');
        }
        if (!formData.responsavelId) throw new Error('A validação do responsável é obrigatória.');

        await registrarSaida({
          frenteTrabalhoId: formData.frenteTrabalhoId,
          empresa: formData.empresa,
          coletor: formData.coletor,
          vala_mnd: formData.vala_mnd,
          responsavelId: formData.responsavelId,
          requisicao: formData.requisicao || gerarRequisicao(),
          equipamento: formData.equipamento,
          placa_serie: formData.placa_serie,
          operadorId: currentUser.uid,
          operadorNome: userProfile?.nome || currentUser.email
        }, formData.materialId, formData.quantidade);

        setMessage({ type: 'success', text: 'Saída registrada com sucesso!' });
      } 
      else if (activeTab === 'DEVOLUCAO') {
        if (!formData.frenteTrabalhoId) throw new Error('A Frente de Trabalho é obrigatória.');

        if (formData.requisicao && itensRequisicao.length > 0) {
          // Devolução Múltipla via Requisição
          const itensParaDevolver = itensRequisicao.filter(i => Number(i.qtdDevolver) > 0);
          if (itensParaDevolver.length === 0) throw new Error('Informe a quantidade de pelo menos um item para devolver.');

          for (const item of itensParaDevolver) {
            if (Number(item.qtdDevolver) > item.qtdRestante) {
              throw new Error(`Quantidade superior ao pendente no material ID: ${item.materialId}`);
            }
            await registrarDevolucao({
              frenteTrabalhoId: formData.frenteTrabalhoId,
              responsavelId: formData.responsavelId,
              requisicao: formData.requisicao,
              observacoes: formData.observacoes,
              operadorId: currentUser.uid,
              operadorNome: userProfile?.nome || currentUser.email
            }, item.materialId, item.qtdDevolver);
          }
        } else {
          // Devolução Avulsa
          if (!formData.materialId || !formData.quantidade || Number(formData.quantidade) <= 0) {
            throw new Error('Selecione o Material e a Quantidade válida para devolução avulsa.');
          }
          await registrarDevolucao({
            frenteTrabalhoId: formData.frenteTrabalhoId,
            responsavelId: formData.responsavelId,
            requisicao: '',
            observacoes: formData.observacoes,
            operadorId: currentUser.uid,
            operadorNome: userProfile?.nome || currentUser.email
          }, formData.materialId, formData.quantidade);
        }

        setMessage({ type: 'success', text: 'Devolução registrada com sucesso!' });
      }
      
      // Limpar form parcial
      setFormData(prev => ({ ...prev, quantidade: '', preco_unitario: '', nf: '', requisicao: (activeTab==='SAIDA'? gerarRequisicao():''), observacoes: '' }));
      setMaterialSearch('');
      setFormData(prev => ({ ...prev, materialId: '' }));
      loadData();
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

  // ExportPDF / Excel omitted for brevity unless they crash. No, I must include them.
  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório de Movimentações Recentes', 14, 15);
    doc.setFontSize(10);
    doc.text("Gerado em: " + format(new Date(), "dd/MM/yyyy HH:mm"), 14, 22);

    const tableColumn = ["Data", "Tipo", "Material", "Qtd", "Responsável"];
    const tableRows = [];
    const recentes = historico.slice(0, 50);

    recentes.forEach(h => {
      const mat = materiais.find(m => m.id === h.materialId);
      const dataStr = (h.dataRegistro && typeof h.dataRegistro.toDate === 'function') ? format(h.dataRegistro.toDate(), 'dd/MM/yyyy HH:mm') : '-';
      let respStr = h.operadorNome;
      if (h.tipo === 'SAIDA' || h.tipo === 'DEVOLUCAO') respStr = h.responsavelId;
      tableRows.push([dataStr, h.tipo, mat?.descricao || 'Desconhecido', h.quantidade, respStr]);
    });

    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 28, theme: 'grid', styles: { fontSize: 8 }, headStyles: { fillColor: [0, 82, 204] } });
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
        'Responsável': h.responsavelId || '-',
        'Requisição': h.requisicao || '-'
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Movimentacoes");
    XLSX.writeFile(workbook, "movimentacoes.xlsx");
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Registro de Movimentações</h1>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => { setActiveTab('ENTRADA'); setMessage(null); }} style={{ flex: 1, minWidth: '150px', padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: activeTab === 'ENTRADA' ? 'var(--success)' : 'var(--bg-card)', color: activeTab === 'ENTRADA' ? '#fff' : 'var(--text-muted)'}}>Entrada</button>
        <button type="button" onClick={() => { setActiveTab('SAIDA'); setMessage(null); setFormData(prev => ({...prev, requisicao: gerarRequisicao()})); }} style={{ flex: 1, minWidth: '150px', padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: activeTab === 'SAIDA' ? 'var(--warning)' : 'var(--bg-card)', color: activeTab === 'SAIDA' ? '#fff' : 'var(--text-muted)'}}>Saída</button>
        <button type="button" onClick={() => { setActiveTab('DEVOLUCAO'); setMessage(null); setFormData(prev => ({...prev, requisicao: ''})); setItensRequisicao([]); }} style={{ flex: 1, minWidth: '150px', padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: activeTab === 'DEVOLUCAO' ? 'var(--info)' : 'var(--bg-card)', color: activeTab === 'DEVOLUCAO' ? '#fff' : 'var(--text-muted)'}}>Devolução</button>
      </div>

      {message && (
        <div style={{ backgroundColor: message.type === 'error' ? '#ffebe6' : '#e3fcef', color: message.type === 'error' ? 'var(--danger)' : 'var(--success)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
          {message.text}
        </div>
      )}

      <div className="card" style={{ marginBottom: '2rem' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            
            {(activeTab === 'DEVOLUCAO') && (
              <div className="form-group" style={{ gridColumn: '1 / -1', backgroundColor: 'var(--info)10', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--info)' }}>
                <label className="form-label" style={{ color: 'var(--info)', fontWeight: 'bold' }}>Requisição de Origem</label>
                <select name="requisicao" className="form-input" value={formData.requisicao} onChange={handleInputChange} style={{ marginBottom: '1rem' }}>
                  <option value="">-- Devolução Avulsa (Selecione Manualmente) --</option>
                  {[...new Set(historico.filter(h => h.tipo === 'SAIDA' && h.requisicao).map(h => h.requisicao))].map(req => (
                    <option key={req} value={req}>{req}</option>
                  ))}
                </select>

                {formData.requisicao && itensRequisicao.length > 0 && (
                  <div style={{ backgroundColor: '#fff', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '1rem' }}>
                    <h4 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Itens pendentes nesta requisição:</h4>
                    {itensRequisicao.map(item => {
                      const mat = materiais.find(m => m.id === item.materialId);
                      return (
                        <div key={item.materialId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                          <div>
                            <strong>{mat?.descricao}</strong> <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({mat?.unidade})</span>
                            <div style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>Pendente: {item.qtdRestante}</div>
                          </div>
                          <div>
                            <input 
                              type="number" 
                              step="0.01" 
                              min="0" 
                              max={item.qtdRestante} 
                              className="form-input" 
                              placeholder="Qtd Devolver"
                              style={{ width: '120px' }}
                              value={item.qtdDevolver}
                              onChange={e => handleItemDevolverChange(item.materialId, e.target.value)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {formData.requisicao && itensRequisicao.length === 0 && (
                  <div style={{ color: 'var(--success)', fontWeight: 'bold' }}>Todos os itens desta requisição já foram devolvidos!</div>
                )}
              </div>
            )}

            {/* Seleção de Material Único: Oculta se estiver em devolução atrelada à requisição */}
            {!(activeTab === 'DEVOLUCAO' && formData.requisicao) && (
              <div className="form-group" style={{ gridColumn: '1 / -1', position: 'relative' }}>
                <label className="form-label">Selecionar Material (Pesquise) *</label>
                <input 
                  required={!(activeTab === 'DEVOLUCAO' && formData.requisicao) && !formData.materialId}
                  type="text" 
                  className="form-input" 
                  placeholder="Digite o código ou nome do material..."
                  value={materialSearch}
                  onChange={e => { setMaterialSearch(e.target.value); setShowDropdown(true); if (formData.materialId) setFormData({...formData, materialId: ''}); }}
                  onFocus={() => setShowDropdown(true)}
                />
                {showDropdown && materialSearch && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                    {filteredMateriais.map(m => (
                        <div key={m.id} onClick={() => handleMaterialSelect(m)} style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid #f4f5f7' }}>
                          <strong>{m.codigo_descricao ? `[${m.codigo_descricao}] ` : ''}</strong>{m.descricao}
                        </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!(activeTab === 'DEVOLUCAO' && formData.requisicao) && (
              <div className="form-group">
                <label className="form-label">Quantidade *</label>
                <input required={!(activeTab === 'DEVOLUCAO' && formData.requisicao)} type="number" step="0.01" min="0.01" name="quantidade" className="form-input" value={formData.quantidade} onChange={handleInputChange} />
              </div>
            )}

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
                  <input required type="text" name="responsavelId" className="form-input" value={formData.responsavelId} onChange={handleInputChange} />
                </div>
              </>
            )}

            {activeTab === 'SAIDA' && (
              <>
                <div className="form-group">
                  <label className="form-label">Requisição Nº *</label>
                  <input required type="text" name="requisicao" className="form-input" value={formData.requisicao} onChange={handleInputChange} style={{ backgroundColor: 'var(--bg-app)', fontWeight: 'bold' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Coletor / Motorista</label>
                  <input type="text" name="coletor" className="form-input" value={formData.coletor} onChange={handleInputChange} />
                </div>
              </>
            )}

            {activeTab === 'DEVOLUCAO' && (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Observações</label>
                <textarea name="observacoes" className="form-input" rows="3" value={formData.observacoes} onChange={handleInputChange}></textarea>
              </div>
            )}
          </div>

          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
              {loading ? 'Registrando...' : ('Confirmar ' + (activeTab === 'ENTRADA' ? 'Entrada' : activeTab === 'SAIDA' ? 'Saída' : 'Devolução'))}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
