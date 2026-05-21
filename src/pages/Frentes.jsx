import React, { useState, useEffect } from 'react';
import { getFrentes, addFrente } from '../services/db';
import { Plus, Wrench, MapPin } from 'lucide-react';

export default function Frentes() {
  const [frentes, setFrentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'OBRA',
    status: 'ATIVO',
    encarregadoId: '',
    localizacao: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadFrentes();
  }, []);

  async function loadFrentes() {
    try {
      setLoading(true);
      const data = await getFrentes();
      setFrentes(data);
    } catch (error) {
      console.error("Erro ao buscar frentes:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      await addFrente(formData);
      setShowModal(false);
      setFormData({ nome: '', tipo: 'OBRA', status: 'ATIVO', encarregadoId: '', localizacao: '' });
      alert("Frente cadastrada com sucesso!");
      loadFrentes();
    } catch (error) {
      console.error("Erro ao adicionar frente:", error);
      alert("Erro ao salvar.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>Frentes de Trabalho</h1>
          <p style={{ color: 'var(--text-muted)' }}>Obras, Valas e Locais de Destino dos materiais</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Nova Frente
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
        ) : frentes.length === 0 ? (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Wrench size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>Nenhuma frente de trabalho cadastrada.</p>
          </div>
        ) : (
          frentes.map(frente => (
            <div key={frente.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>{frente.nome}</h3>
                <span style={{ 
                  padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold',
                  backgroundColor: frente.status === 'ATIVO' ? 'var(--success)20' : 'var(--danger)20',
                  color: frente.status === 'ATIVO' ? 'var(--success)' : 'var(--danger)'
                }}>
                  {frente.status}
                </span>
              </div>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  <Wrench size={16} /> <span>Tipo: {frente.tipo}</span>
                </div>
                {frente.localizacao && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <MapPin size={16} /> <span>{frente.localizacao}</span>
                  </div>
                )}
              </div>
              
              <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Encarregado: {frente.encarregadoId || 'Não atribuído'}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', overflowY: 'auto' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Nova Frente de Trabalho</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', color: 'var(--text-muted)' }}>X</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nome da Frente / Vala / MND *</label>
                <input required type="text" className="form-input" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Tipo *</label>
                  <select className="form-input" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
                    <option value="OBRA">Obra</option>
                    <option value="VALA">Vala</option>
                    <option value="MND">MND</option>
                    <option value="CANTEIRO">Canteiro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status *</label>
                  <select className="form-input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="ATIVO">Ativo</option>
                    <option value="CONCLUIDO">Concluído</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Encarregado (Responsável)</label>
                <input type="text" className="form-input" placeholder="Nome do Responsável" value={formData.encarregadoId} onChange={e => setFormData({...formData, encarregadoId: e.target.value})} />
              </div>

              <div className="form-group">
                <label className="form-label">Localização (Opcional)</label>
                <input type="text" className="form-input" value={formData.localizacao} onChange={e => setFormData({...formData, localizacao: e.target.value})} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)} disabled={isSubmitting}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Salvar Frente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
