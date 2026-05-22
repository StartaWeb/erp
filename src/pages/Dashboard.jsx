import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getMateriais, getHistoricoMovimentacoes, getMateriaisAlugados } from '../services/db';
import { Package, TrendingUp, TrendingDown, AlertTriangle, DollarSign, CalendarClock } from 'lucide-react';
import { format, isBefore, addDays, isAfter } from 'date-fns';

export default function Dashboard() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ 
    materiais: 0, 
    valorEstoque: 0,
    entradas: 0, 
    saidas: 0, 
    baixoEstoque: 0,
    alugadosEmUso: 0,
    alugadosAtrasados: 0
  });
  const [recentes, setRecentes] = useState([]);
  const [alugadosAlerta, setAlugadosAlerta] = useState([]);

  useEffect(() => {
    async function carregarDados() {
      try {
        const [mats, hist, alugados] = await Promise.all([
          getMateriais(),
          getHistoricoMovimentacoes(),
          getMateriaisAlugados()
        ]);
        
        const baixoEstoque = mats.filter(m => m.estoque_atual <= (m.estoque_minimo || 0)).length;
        
        // Calcular valor total do estoque
        const valorEstoque = mats.reduce((acc, m) => {
          return acc + (Number(m.estoque_atual || 0) * Number(m.preco_unitario_medio || 0));
        }, 0);

        // Entradas e saídas do mês atual
        const hoje = new Date();
        const mesAtual = hoje.getMonth();
        const anoAtual = hoje.getFullYear();
        
        let entradasMes = 0;
        let saidasMes = 0;
        
        hist.forEach(mov => {
          const dataMov = (mov.dataRegistro && typeof mov.dataRegistro.toDate === 'function') ? mov.dataRegistro.toDate() : null;
          if (dataMov && dataMov.getMonth() === mesAtual && dataMov.getFullYear() === anoAtual) {
            if (mov.tipo === 'ENTRADA') entradasMes++;
            if (mov.tipo === 'SAIDA') saidasMes++;
          }
        });

        // Alugados
        const emUso = alugados.filter(a => a.status === 'EM USO');
        let atrasados = 0;
        const alertasLocacao = [];

        emUso.forEach(a => {
          if (a.data_previa_saida) {
            const dataSaida = new Date(a.data_previa_saida);
            if (isBefore(dataSaida, hoje)) {
              atrasados++;
              alertasLocacao.push({ ...a, tipoAlerta: 'ATRASADO' });
            } else if (isAfter(dataSaida, hoje) && isBefore(dataSaida, addDays(hoje, 3))) {
              alertasLocacao.push({ ...a, tipoAlerta: 'PROXIMO' });
            }
          }
        });

        setStats({
          materiais: mats.length,
          valorEstoque,
          entradas: entradasMes,
          saidas: saidasMes,
          baixoEstoque,
          alugadosEmUso: emUso.length,
          alugadosAtrasados: atrasados
        });
        
        setRecentes(hist.slice(0, 5)); // Últimas 5 movimentações
        setAlugadosAlerta(alertasLocacao);
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
    { label: 'Valor em Estoque', value: loading ? '...' : `R$ ${stats.valorEstoque.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, icon: DollarSign, color: '#107c41' },
    { label: 'Entradas Mês', value: loading ? '...' : stats.entradas, icon: TrendingUp, color: 'var(--success)' },
    { label: 'Saídas Mês', value: loading ? '...' : stats.saidas, icon: TrendingDown, color: 'var(--info)' },
    { label: 'Estoque Baixo', value: loading ? '...' : stats.baixoEstoque, icon: AlertTriangle, color: 'var(--warning)' },
    { label: 'Equip. Alugados', value: loading ? '...' : stats.alugadosEmUso, icon: CalendarClock, color: '#8a2be2' },
  ];

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
          Dashboard Geral 👋
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Aqui está o resumo do seu almoxarifado hoje.
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {statCards.map((stat, idx) => (
          <div key={idx} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
            <div style={{ 
              width: '48px', height: '48px', borderRadius: '12px', 
              backgroundColor: stat.color + '20', color: stat.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <stat.icon size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{stat.label}</p>
              <h3 style={{ fontSize: '1.3rem', color: 'var(--text-main)' }}>{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)', fontSize: '1.1rem' }}>Movimentações Recentes</h3>
          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
          ) : recentes.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Nenhuma movimentação recente registrada.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)' }}>
                  <th style={{ padding: '0.75rem', fontWeight: '500', color: 'var(--text-muted)' }}>Data</th>
                  <th style={{ padding: '0.75rem', fontWeight: '500', color: 'var(--text-muted)' }}>Tipo</th>
                  <th style={{ padding: '0.75rem', fontWeight: '500', color: 'var(--text-muted)' }}>Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {recentes.map(mov => (
                  <tr key={mov.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem' }}>{mov.dataRegistro && typeof mov.dataRegistro.toDate === 'function' ? mov.dataRegistro.toDate().toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}) : '-'}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold',
                        backgroundColor: mov.tipo === 'ENTRADA' ? 'var(--success)20' : (mov.tipo === 'DEVOLUCAO' ? 'var(--info)20' : 'var(--warning)20'),
                        color: mov.tipo === 'ENTRADA' ? 'var(--success)' : (mov.tipo === 'DEVOLUCAO' ? 'var(--info)' : 'var(--warning)')
                      }}>
                        {mov.tipo}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>{mov.quantidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarClock size={20} color="#8a2be2" /> Alertas de Locação
          </h3>
          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
          ) : alugadosAlerta.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={32} color="var(--success)" style={{ margin: '0 auto 0.5rem' }} />
              <p>Todos os materiais alugados estão no prazo.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {alugadosAlerta.map(a => (
                <div key={a.id} style={{ 
                  padding: '0.75rem', 
                  borderRadius: 'var(--radius-sm)', 
                  borderLeft: `4px solid ${a.tipoAlerta === 'ATRASADO' ? 'var(--danger)' : 'var(--warning)'}`,
                  backgroundColor: a.tipoAlerta === 'ATRASADO' ? 'var(--danger)10' : 'var(--warning)10',
                  fontSize: '0.9rem'
                }}>
                  <strong style={{ color: a.tipoAlerta === 'ATRASADO' ? 'var(--danger)' : '#b37700' }}>
                    {a.tipoAlerta === 'ATRASADO' ? 'Atrasado: ' : 'Próximo do Vencimento: '}
                  </strong> 
                  {a.descricao} (Previsto: {format(new Date(a.data_previa_saida), 'dd/MM/yyyy')})
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
