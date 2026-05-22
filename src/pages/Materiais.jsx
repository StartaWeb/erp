import { useState, useEffect } from 'react';
import { getMateriais, addMaterial, updateMaterial, getFornecedores } from '../services/db';
import { Plus, Search, Package, Edit, Camera, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Materiais() {
  const [materiais, setMateriais] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
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
    fornecedorId: '',
    status: 'ATIVO'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [mats, forns] = await Promise.all([
        getMateriais(),
        getFornecedores()
      ]);
      setMateriais(mats);
      setFornecedores(forns);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      alert("Para ver os materiais, você precisa habilitar o Firestore no Firebase Console.");
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
      loadData();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar o material.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      codigo_descricao: '', descricao: '', tipo: 'MATERIAL', 
      unidade: 'UN', estoque_atual: 0, estoque_minimo: 0, preco_unitario_medio: 0, 
      fornecedorId: '', status: 'ATIVO'
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
      fornecedorId: m.fornecedorId || '',
      status: m.status || 'ATIVO'
    });
    setEditingId(m.id);
    setShowModal(true);
  }

  function exportToExcel() {
    const dataToExport = filtered.map(m => {
      const fornecedor = fornecedores.find(f => f.id === m.fornecedorId);
      const valorTotal = Number(m.estoque_atual || 0) * Number(m.preco_unitario_medio || 0);
      return {
        'CÓDIGO': m.codigo_descricao,
        'DESCRIÇÃO': m.descricao,
        'TIPO': m.tipo,
        'UNIDADE': m.unidade,
        'FORNECEDOR PADRÃO': fornecedor ? fornecedor.razao_social : '-',
        'ESTOQUE MÍNIMO': m.estoque_minimo,
        'ESTOQUE ATUAL': m.estoque_atual,
        'PREÇO MÉDIO (R$)': Number(m.preco_unitario_medio || 0).toFixed(2),
        'VALOR TOTAL (R$)': valorTotal.toFixed(2)
      };
    });

    // Calcula somatório final
    const somaTotal = dataToExport.reduce((acc, curr) => acc + Number(curr['VALOR TOTAL (R$)']), 0);
    
    // Adiciona linha de totalização
    dataToExport.push({
      'CÓDIGO': '',
      'DESCRIÇÃO': 'TOTAL GERAL',
      'TIPO': '',
      'UNIDADE': '',
      'FORNECEDOR PADRÃO': '',
      'ESTOQUE MÍNIMO': '',
      'ESTOQUE ATUAL': '',
      'PREÇO MÉDIO (R$)': '',
      'VALOR TOTAL (R$)': somaTotal.toFixed(2)
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Materiais");
    XLSX.writeFile(workbook, "Relatorio_Materiais.xlsx");
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
          <h1 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>Materiais e Inventário</h1>
          <p style={{ color: 'var(--text-muted)' }}>Gerencie o catálogo e o estoque de materiais</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-outline" onClick={exportToExcel} style={{ color: '#107c41', borderColor: '#107c41' }}>
            <Download size={18} /> Exportar Excel
          </button>
          <button className="btn btn-primary" onClick={handleNew}>
            <Plus size={18} /> Novo Material
          </button>
        </div>
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
          <div className="excel-table-container">
            <table className="excel-table">
              <thead>
                <tr>
                  <th><div className="resizer">Cód.</div></th>
                  <th><div className="resizer">Descrição</div></th>
                  <th><div className="resizer">Tipo</div></th>
                  <th><div className="resizer">Fornecedor Padrão</div></th>
                  <th style={{ textAlign: 'right' }}><div className="resizer" style={{ justifyContent: 'flex-end' }}>Estoque</div></th>
                  <th style={{ textAlign: 'right' }}><div className="resizer" style={{ justifyContent: 'flex-end' }}>Preço Médio</div></th>
                  <th style={{ textAlign: 'right' }}><div className="resizer" style={{ justifyContent: 'flex-end' }}>Valor Total</div></th>
                  <th style={{ textAlign: 'center' }}><div className="resizer" style={{ justifyContent: 'center' }}>Ações</div></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const fornecedor = fornecedores.find(f => f.id === m.fornecedorId);
                  const valorTotal = Number(m.estoque_atual || 0) * Number(m.preco_unitario_medio || 0);
                  
                  return (
                    <tr key={m.id}>
                      <td>{m.codigo_descricao}</td>
                      <td style={{ fontWeight: '500' }}>{m.descricao}</td>
                      <td>
                        <span style={{ 
                          padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem',
                          backgroundColor: m.tipo === 'COMBUSTÍVEL' ? 'var(--warning)20' : 'var(--primary-light)',
                          color: m.tipo === 'COMBUSTÍVEL' ? '#b37700' : 'var(--primary)'
                        }}>
                          {m.tipo}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {fornecedor ? fornecedor.razao_social : '-'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: '600', color: m.estoque_atual <= (m.estoque_minimo || 0) ? 'var(--danger)' : 'inherit' }}>
                          {m.estoque_atual}
                        </span> <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.unidade}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>R$ {Number(m.preco_unitario_medio || 0).toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: '500' }}>R$ {valorTotal.toFixed(2)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button onClick={() => handleEdit(m)} style={{ background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Edit size={16} /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '1rem', overflowY: 'auto' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '600px', margin: '2rem auto' }}>
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

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Fornecedor Padrão (Opcional)</label>
                  <select className="form-input" value={formData.fornecedorId} onChange={e => setFormData({...formData, fornecedorId: e.target.value})}>
                    <option value="">Sem fornecedor específico</option>
                    {fornecedores.map(f => (
                      <option key={f.id} value={f.id}>{f.razao_social}</option>
                    ))}
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
