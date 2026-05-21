import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getMateriais, getFrentes, registrarEntrada, registrarSaida } from '../services/db';
import { ArrowDownLeft, ArrowUpRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Movimentacoes() {
  const { userProfile, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('ENTRADA');
  const [materiais, setMateriais] = useState([]);
  const [frentes, setFrentes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const [formData, setFormData] = useState({
    materialId: '',
    quantidade: '',
    // Campos Entrada
    fornecedorId: '',
    nf: '',
    preco_unitario: '',
    // Campos Saída
    frenteTrabalhoId: '',
    empresa: '',
    coletor: '',
    vala_mnd: '',
    responsavelId: '',
    requisicao: '',
    equipamento: '',
    placa_serie: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [mats, frents] = await Promise.all([getMateriais(), getFrentes()]);
      setMateriais(mats);
      setFrentes(frents);
    } catch (error) {
      console.error("Erro ao carregar listas", error);
    }
  }

  function handleInputChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
      } else {
        // Validação dupla (simulada na interface, idealmente deve pedir senha ou confirmação via push)
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
      }
      
      // Limpa form parcial
      setFormData(prev => ({ ...prev, quantidade: '', preco_unitario: '', nf: '', requisicao: '' }));
      loadData(); // recarrega estoques
    } catch (error) {
      console.error("Erro transação:", error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }

  const selectedMaterial = materiais.find(m => m.id === formData.materialId);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Registro de Movimentações</h1>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          onClick={() => { setActiveTab('ENTRADA'); setMessage(null); }}
          style={{ 
            flex: 1, padding: '1rem', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            backgroundColor: activeTab === 'ENTRADA' ? 'var(--success)' : 'var(--bg-card)',
            color: activeTab === 'ENTRADA' ? '#fff' : 'var(--text-muted)',
            boxShadow: activeTab === 'ENTRADA' ? 'var(--shadow-md)' : 'var(--shadow-sm)',
            transition: 'all 0.2s'
          }}
        >
          <ArrowDownLeft size={24} /> <h2>Entrada</h2>
        </button>
        <button 
          onClick={() => { setActiveTab('SAIDA'); setMessage(null); }}
          style={{ 
            flex: 1, padding: '1rem', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            backgroundColor: activeTab === 'SAIDA' ? 'var(--warning)' : 'var(--bg-card)',
            color: activeTab === 'SAIDA' ? '#fff' : 'var(--text-muted)',
            boxShadow: activeTab === 'SAIDA' ? 'var(--shadow-md)' : 'var(--shadow-sm)',
            transition: 'all 0.2s'
          }}
        >
          <ArrowUpRight size={24} /> <h2>Saída</h2>
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

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Selecionar Material *</label>
              <select required name="materialId" className="form-input" value={formData.materialId} onChange={handleInputChange}>
                <option value="">-- Escolha o Material --</option>
                {materiais.map(m => (
                  <option key={m.id} value={m.id}>{m.codigo_descricao ? '[' + m.codigo_descricao + '] ' : ''}{m.descricao} (Estoque: {m.estoque_atual} {m.unidade})</option>
                ))}
              </select>
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
                  <label className="form-label">Fornecedor / Loja</label>
                  <input type="text" name="fornecedorId" className="form-input" placeholder="Nome ou Razão Social" value={formData.fornecedorId} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Número da NF</label>
                  <input type="text" name="nf" className="form-input" value={formData.nf} onChange={handleInputChange} />
                </div>
              </>
            )}

            {activeTab === 'SAIDA' && (
              <>
                <div className="form-group">
                  <label className="form-label">Frente de Trabalho / Destino *</label>
                  <select required name="frenteTrabalhoId" className="form-input" value={formData.frenteTrabalhoId} onChange={handleInputChange}>
                    <option value="">-- Selecione o Destino --</option>
                    {frentes.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Validação Dupla (Responsável) *</label>
                  <input required type="text" name="responsavelId" className="form-input" placeholder="Nome/Assinatura do Encarregado" value={formData.responsavelId} onChange={handleInputChange} />
                </div>
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
          </div>

          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
              {loading ? 'Registrando...' : ('Confirmar ' + (activeTab === 'ENTRADA' ? 'Entrada' : 'Saída'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
