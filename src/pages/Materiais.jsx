import { useState, useEffect } from 'react';
import { getMateriais, addMaterial, updateMaterial } from '../services/db';
import { Plus, Search, Package, Edit, Camera } from 'lucide-react';

export default function Materiais() {
  const [materiais, setMateriais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    codigo_descricao: '',
    descricao: '',
    tipo: 'MATERIAL',
    unidade: 'UN',
    estoque_atual: 0,
    estoque_minimo: 0,
    preco_unitario_medio: 0,
    status: 'ATIVO'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadMateriais();
  }, []);

  async function loadMateriais() {
    try {
      setLoading(true);
      const data = await getMateriais();
      setMateriais(data);
    } catch (error) {
      console.error("Erro ao buscar materiais:", error);
      alert("Para ver os materiais, você precisa habilitar o Firestore no Firebase Console (Build > Firestore Database > Create Database > Start in Test Mode).");
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
        await updateMaterial(editingId, formData);
        alert('Material atualizado com sucesso!');
      } else {
        await addMaterial(formData);
        alert('Material cadastrado com sucesso!');
      }
      closeModal();
      loadMateriais();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar o material. Verifique as permissões do Firestore e se os dados são válidos.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      codigo_descricao: '', descricao: '', tipo: 'MATERIAL', 
      unidade: 'UN', estoque_atual: 0, estoque_minimo: 0, preco_unitario_medio: 0, status: 'ATIVO'
    });
  }

  function handleNew() {
    closeModal();
    setShowModal(true);
  }

  function handleEdit(m) {
    setFormData({
      codigo_descricao: m.codigo_descricao || '',
      descricao: m.descricao || '',
      tipo: m.tipo || 'MATERIAL',
      unidade: m.unidade || 'UN',
      estoque_atual: m.estoque_atual || 0,
      estoque_minimo: m.estoque_minimo || 0,
      preco_unitario_medio: m.preco_unitario_medio || 0,
      status: m.status || 'ATIVO'
    });
    setEditingId(m.id);
    setShowModal(true);
  }

  const filtered = materiais.filter(m => {
    const desc = m.descricao || '';
    const cod = m.codigo_descricao || '';
    const search = (searchTerm || '').toLowerCase();
    return desc.toLowerCase().includes(search) || cod.toLowerCase().includes(search);
  });

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>Materiais</h1>
          <p style={{ color: 'var(--text-muted)' }}>Gerencie o catálogo e o estoque de materiais</p>
        </div>
        <button className="btn btn-primary" onClick={handleNew}>
          <Plus size={18} /> Novo Material
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
            placeholder="Buscar por código ou descrição..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Carregando materiais...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Package size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>Nenhum material encontrado.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>Cód.</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>Descrição</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>Tipo</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>Estoque</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>Preço Médio</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}>{m.codigo_descricao}</td>
                  <td style={{ padding: '1rem', fontWeight: '500' }}>{m.descricao}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem',
                      backgroundColor: m.tipo === 'COMBUSTÍVEL' ? 'var(--warning)20' : 'var(--primary-light)',
                      color: m.tipo === 'COMBUSTÍVEL' ? '#b37700' : 'var(--primary)'
                    }}>
                      {m.tipo}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ fontWeight: '600', color: m.estoque_atual <= (m.estoque_minimo || 0) ? 'var(--danger)' : 'inherit' }}>
                      {m.estoque_atual}
                    </span> {m.unidade}
                    {(m.estoque_minimo > 0) && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mín: {m.estoque_minimo}</div>}
                  </td>
                  <td style={{ padding: '1rem' }}>R$ {Number(m.preco_unitario_medio).toFixed(2)}</td>
                  <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleEdit(m)} style={{ background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Edit size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Novo Material */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', overflowY: 'auto' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '600px', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>{editingId ? 'Editar Material' : 'Adicionar Novo Material'}</h2>
              <button onClick={closeModal} style={{ background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>X</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Descrição do Material *</label>
                  <input required type="text" className="form-input" value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Código (Opcional)</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="text" className="form-input" value={formData.codigo_descricao} onChange={e => setFormData({...formData, codigo_descricao: e.target.value})} />
                    <button type="button" className="btn btn-outline" style={{ padding: '0.5rem' }} title="Ler Código de Barras">
                      <Camera size={20} />
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Tipo *</label>
                  <select className="form-input" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
                    <option value="MATERIAL">MATERIAL</option>
                    <option value="COMBUSTÍVEL">COMBUSTÍVEL</option>
                    <option value="FERRAMENTA">FERRAMENTA</option>
                    <option value="EQUIPAMENTO">EQUIPAMENTO</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Unidade Medida *</label>
                  <select className="form-input" value={formData.unidade} onChange={e => setFormData({...formData, unidade: e.target.value})}>
                    <option value="UN">UN (Unidade)</option>
                    <option value="PÇ">PÇ (Peça)</option>
                    <option value="LT">LT (Litro)</option>
                    <option value="KG">KG (Quilo)</option>
                    <option value="M">M (Metro)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Estoque Inicial</label>
                  <input type="number" step="0.01" className="form-input" value={formData.estoque_atual} onChange={e => setFormData({...formData, estoque_atual: e.target.value})} />
                </div>

                <div className="form-group">
                  <label className="form-label">Estoque Mínimo (Alerta)</label>
                  <input type="number" step="0.01" className="form-input" value={formData.estoque_minimo} onChange={e => setFormData({...formData, estoque_minimo: e.target.value})} />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Preço Médio Inicial (R$)</label>
                  <input type="number" step="0.01" className="form-input" value={formData.preco_unitario_medio} onChange={e => setFormData({...formData, preco_unitario_medio: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-outline" onClick={closeModal} disabled={isSubmitting}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Salvar Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
