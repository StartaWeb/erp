import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getMateriais, getHistoricoMovimentacoes } from '../services/db';
import { Package, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ materiais: 0, entradas: 0, saidas: 0, baixoEstoque: 0 });
  const [recentes, setRecentes] = useState([]);

  useEffect(() => {
    async function carregarDados() {
      try {
        const mats = await getMateriais();
        const hist = await getHistoricoMovimentacoes();
        
        const baixoEstoque = mats.filter(m => m.estoque_atual <= (m.estoque_minimo || 0)).length;
        
        // Entradas e saídas do mês atual
        const hoje = new Date();
        const mesAtual = hoje.getMonth();
        const anoAtual = hoje.getFullYear();
        
        let entradasMes = 0;
        let saidasMes = 0;
        
        hist.forEach(mov => {
          const dataMov = mov.dataRegistro?.toDate();
          if (dataMov && dataMov.getMonth() === mesAtual && dataMov.getFullYear() === anoAtual) {
            if (mov.tipo === 'ENTRADA') entradasMes++;
            if (mov.tipo === 'SAIDA') saidasMes++;
          }
        });

        setStats({
          materiais: mats.length,
          entradas: entradasMes,
          saidas: saidasMes,
          baixoEstoque
        });
        
        setRecentes(hist.slice(0, 5)); // Últimas 5 movimentações
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    carregarDados();
  }, []);

  const statCards = [
    { label: 'Total de Materiais', value: loading ? '...' : stats.materiais, icon: Package, color: 'var(--primary)' },
    { label: 'Entradas Mês', value: loading ? '...' : stats.entradas, icon: TrendingUp, color: 'var(--success)' },
    { label: 'Saídas Mês', value: loading ? '...' : stats.saidas, icon: TrendingDown, color: 'var(--info)' },
    { label: 'Estoque Baixo (ou Zerado)', value: loading ? '...' : stats.baixoEstoque, icon: AlertTriangle, color: 'var(--warning)' },
  ];

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
          Olá, {userProfile?.nome || 'Usuário'}! 👋
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Aqui está o resumo do seu almoxarifado hoje.
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {statCards.map((stat, idx) => (
          <div key={idx} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              width: '48px', height: '48px', borderRadius: '12px', 
              backgroundColor: stat.color + '20', color: stat.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <stat.icon size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{stat.label}</p>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--text-main)' }}>{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Movimentações Recentes</h3>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
        ) : recentes.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Nenhuma movimentação recente registrada.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
                <th style={{ padding: '0.75rem', fontWeight: '500', color: 'var(--text-muted)' }}>Data</th>
                <th style={{ padding: '0.75rem', fontWeight: '500', color: 'var(--text-muted)' }}>Tipo</th>
                <th style={{ padding: '0.75rem', fontWeight: '500', color: 'var(--text-muted)' }}>Quantidade</th>
                <th style={{ padding: '0.75rem', fontWeight: '500', color: 'var(--text-muted)' }}>Operador</th>
              </tr>
            </thead>
            <tbody>
              {recentes.map(mov => (
                <tr key={mov.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem' }}>{mov.dataRegistro?.toDate().toLocaleString()}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold',
                      backgroundColor: mov.tipo === 'ENTRADA' ? 'var(--success)20' : 'var(--warning)20',
                      color: mov.tipo === 'ENTRADA' ? 'var(--success)' : 'var(--warning)'
                    }}>
                      {mov.tipo}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem' }}>{mov.quantidade}</td>
                  <td style={{ padding: '0.75rem' }}>{mov.operadorNome || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
