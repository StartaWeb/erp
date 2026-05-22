import { useState, useEffect } from 'react';
import { getMateriaisAlugados, addMaterialAlugado, updateMaterialAlugado, deleteMaterialAlugado, getFrentes } from '../services/db';
import { Plus, Search, CalendarClock, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { format, isAfter, isBefore, addDays } from 'date-fns';

export default function MateriaisAlugados() {
  const [materiais, setMateriais] = useState([]);
  const [frentes, setFrentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    descricao: '',
    frenteId: '',
    data_entrada: '',
    data_previa_saida: '',
    status: 'EM USO',
    observacoes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [mats, fts] = await Promise.all([
        getMateriaisAlugados(),
        getFrentes()
      ]);
      setMateriais(mats);
      setFrentes(fts);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
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
        await updateMaterialAlugado(editingId, formData);
        alert('Material alugado atualizado com sucesso!');
      } else {
        await addMaterialAlugado(formData);
        alert('Material alugado cadastrado com sucesso!');
      }
      closeModal();
      loadData();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar o material alugado.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (window.confirm("Tem certeza que deseja excluir este registro de material alugado?")) {
      try {
        await deleteMaterialAlugado(id);
        alert('Registro excluído com sucesso!');
        loadData();
      } catch (error) {
        console.error("Erro ao excluir:", error);
        alert("Erro ao excluir registro.");
      }
    }
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      descricao: '', frenteId: '', data_entrada: '', data_previa_saida: '', status: 'EM USO', observacoes: ''
    });
  }

  function handleNew() {
    closeModal();
    setShowModal(true);
  }

  function handleEdit(m) {
    setFormData({
      descricao: m.descricao || '',
      frenteId: m.frenteId || '',
      data_entrada: m.data_entrada || '',
      data_previa_saida: m.data_previa_saida || '',
      status: m.status || 'EM USO',
      observacoes: m.observacoes || ''
    });
    setEditingId(m.id);
    setShowModal(true);
  }

  const filtered = materiais.filter(m => {
    const search = (searchTerm || '').toLowerCase();
    return (m.descricao || '').toLowerCase().includes(search);
  });

  const hoje = new Date();
  
  // Alertas
  const materiaisAtrasados = materiais.filter(m => 
    m.status === 'EM USO' && m.data_previa_saida && isBefore(new Date(m.data_previa_saida), hoje)
  );
  const materiaisProximosVencimento = materiais.filter(m => {
    if (m.status !== 'EM USO' || !m.data_previa_saida) return false;
    const dataSaida = new Date(m.data_previa_saida);
    return isAfter(dataSaida, hoje) && isBefore(dataSaida, addDays(hoje, 3));
  });

  function getFrenteNome(id) {
    const f = frentes.find(fr => fr.id === id);
    return f ? f.nome : 'Não vinculada';
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>Materiais Alugados</h1>
          <p style={{ color: 'var(--text-muted)' }}>Controle de equipamentos locados e prazos de devolução</p>
        </div>
        <button className="btn btn-primary" onClick={handleNew}>
          <Plus size={18} /> Novo Aluguel
        </button>
      </div>

      {(materiaisAtrasados.length > 0 || materiaisProximosVencimento.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {materiaisAtrasados.map(m => (
            <div key={`atraso-${m.id}`} style={{ backgroundColor: 'var(--danger)20', borderLeft: '4px solid var(--danger)', padding: '1rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <AlertTriangle color="var(--danger)" />
              <div>
                <strong style={{ color: 'var(--danger)' }}>Atrasado!</strong> O material <strong>{m.descricao}</strong> alocado na frente <strong>{getFrenteNome(m.frenteId)}</strong> deveria ter sido devolvido em {format(new Date(m.data_previa_saida), 'dd/MM/yyyy')}.
              </div>
            </div>
          ))}
          {materiaisProximosVencimento.map(m => (
            <div key={`prox-${m.id}`} style={{ backgroundColor: 'var(--warning)20', borderLeft: '4px solid var(--warning)', padding: '1rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <CalendarClock color="#b37700" />
              <div>
                <strong style={{ color: '#b37700' }}>Devolução Próxima:</strong> O material <strong>{m.descricao}</strong> alocado na frente <strong>{getFrenteNome(m.frenteId)}</strong> tem devolução prevista para {format(new Date(m.data_previa_saida), 'dd/MM/yyyy')}.
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <div style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <Search size={18} />
          </div>
          <input 
            type="text" 
            className="form-input" 
            style={{ paddingLeft: '2.5rem' }} 
            placeholder="Buscar material..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CalendarClock size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>Nenhum material alugado encontrado.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>Material</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>Frente de Trabalho</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>Entrada</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>Saída Prev.</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>Status</th>
                <th style={{ padding: '1rem', fontWeight: '500', color: 'var(--text-muted)' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem', fontWeight: '500' }}>{m.descricao}</td>
                  <td style={{ padding: '1rem' }}>{getFrenteNome(m.frenteId)}</td>
                  <td style={{ padding: '1rem' }}>{m.data_entrada ? format(new Date(m.data_entrada), 'dd/MM/yyyy') : '-'}</td>
                  <td style={{ padding: '1rem' }}>{m.data_previa_saida ? format(new Date(m.data_previa_saida), 'dd/MM/yyyy') : '-'}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem',
                      backgroundColor: m.status === 'EM USO' ? 'var(--primary-light)' : (m.status === 'MANUTENÇÃO' ? 'var(--warning)20' : 'var(--text-muted)20'),
                      color: m.status === 'EM USO' ? 'var(--primary)' : (m.status === 'MANUTENÇÃO' ? '#b37700' : 'var(--text-muted)')
                    }}>
                      {m.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleEdit(m)} style={{ background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Edit size={18} /></button>
                    <button onClick={() => handleDelete(m.id)} style={{ background: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '600px', margin: '2rem auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>{editingId ? 'Editar Aluguel' : 'Adicionar Material Alugado'}</h2>
              <button onClick={closeModal} style={{ background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>X</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Material (Descrição) *</label>
                  <input required type="text" className="form-input" value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} />
                </div>
                
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Frente de Trabalho *</label>
                  <select required className="form-input" value={formData.frenteId} onChange={e => setFormData({...formData, frenteId: e.target.value})}>
                    <option value="">Selecione a Frente</option>
                    {frentes.map(f => (
                      <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Data de Entrada *</label>
                  <input required type="date" className="form-input" value={formData.data_entrada} onChange={e => setFormData({...formData, data_entrada: e.target.value})} />
                </div>

                <div className="form-group">
                  <label className="form-label">Data Prévia de Saída/Devolução</label>
                  <input type="date" className="form-input" value={formData.data_previa_saida} onChange={e => setFormData({...formData, data_previa_saida: e.target.value})} />
                </div>
                
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Status *</label>
                  <select className="form-input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="EM USO">EM USO</option>
                    <option value="MANUTENÇÃO">MANUTENÇÃO</option>
                    <option value="DEVOLVIDO/DESCARTE">DEVOLVIDO/DESCARTE</option>
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Observações</label>
                  <textarea className="form-input" rows="3" value={formData.observacoes} onChange={e => setFormData({...formData, observacoes: e.target.value})}></textarea>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-outline" onClick={closeModal} disabled={isSubmitting}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
