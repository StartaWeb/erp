import { useState, useEffect } from 'react';
import { getFornecedores, addFornecedor, updateFornecedor, deleteFornecedor } from '../services/db';
import { Plus, Search, Building2, Edit, Trash2 } from 'lucide-react';

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    razao_social: '',
    cnpj: '',
    contato: '',
    telefone: '',
    email: '',
    observacoes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadFornecedores();
  }, []);

  async function loadFornecedores() {
    try {
      setLoading(true);
      const data = await getFornecedores();
      setFornecedores(data);
    } catch (error) {
      console.error("Erro ao buscar fornecedores:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      if (editingId) {
        await updateFornecedor(editingId, formData);
        alert('Fornecedor atualizado com sucesso!');
      } else {
        await addFornecedor(formData);
        alert('Fornecedor cadastrado com sucesso!');
      }
      closeModal();
      loadFornecedores();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar o fornecedor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (window.confirm("Tem certeza que deseja excluir este fornecedor?")) {
      try {
        await deleteFornecedor(id);
        alert('Fornecedor excluído com sucesso!');
        loadFornecedores();
      } catch (error) {
        console.error("Erro ao excluir:", error);
        alert("Erro ao excluir fornecedor.");
      }
    }
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      razao_social: '', cnpj: '', contato: '', telefone: '', email: '', observacoes: ''
    });
  }

  function handleNew() {
    closeModal();
    setShowModal(true);
  }

  function handleEdit(f) {
    setFormData({
      razao_social: f.razao_social || '',
      cnpj: f.cnpj || '',
      contato: f.contato || '',
      telefone: f.telefone || '',
      email: f.email || '',
      observacoes: f.observacoes || ''
    });
    setEditingId(f.id);
    setShowModal(true);
  }

  const filtered = fornecedores.filter(f => {
    const search = (searchTerm || '').toLowerCase();
    return (f.razao_social || '').toLowerCase().includes(search) || 
           (f.cnpj || '').toLowerCase().includes(search);
  });

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>Fornecedores</h1>
          <p style={{ color: 'var(--text-muted)' }}>Gerencie os fornecedores de materiais e serviços</p>
        </div>
        <button className="btn btn-primary" onClick={handleNew}>
          <Plus size={18} /> Novo Fornecedor
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <div style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <Search size={18} />
          </div>
          <input 
            type="text" 
            className="form-input" 
            style={{ paddingLeft: '2.5rem' }} 
            placeholder="Buscar por razão social ou CNPJ..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Carregando fornecedores...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Building2 size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>Nenhum fornecedor encontrado.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>Razão Social</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>CNPJ</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>Contato</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>Telefone</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem', fontWeight: '500' }}>{f.razao_social}</td>
                  <td style={{ padding: '1rem' }}>{f.cnpj}</td>
                  <td style={{ padding: '1rem' }}>{f.contato}</td>
                  <td style={{ padding: '1rem' }}>{f.telefone}</td>
                  <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleEdit(f)} style={{ background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Edit size={18} /></button>
                    <button onClick={() => handleDelete(f.id)} style={{ background: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Novo Fornecedor */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '600px', margin: '2rem auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>{editingId ? 'Editar Fornecedor' : 'Adicionar Novo Fornecedor'}</h2>
              <button onClick={closeModal} style={{ background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>X</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Razão Social *</label>
                  <input required type="text" className="form-input" value={formData.razao_social} onChange={e => setFormData({...formData, razao_social: e.target.value})} />
                </div>
                
                <div className="form-group">
                  <label className="form-label">CNPJ</label>
                  <input type="text" className="form-input" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} />
                </div>

                <div className="form-group">
                  <label className="form-label">Pessoa de Contato</label>
                  <input type="text" className="form-input" value={formData.contato} onChange={e => setFormData({...formData, contato: e.target.value})} />
                </div>

                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input type="text" className="form-input" value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})} />
                </div>
                
                <div className="form-group">
                  <label className="form-label">E-mail</label>
                  <input type="email" className="form-input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Observações</label>
                  <textarea className="form-input" rows="3" value={formData.observacoes} onChange={e => setFormData({...formData, observacoes: e.target.value})}></textarea>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-outline" onClick={closeModal} disabled={isSubmitting}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Salvar Fornecedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
