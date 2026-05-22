import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Package, LayoutDashboard, ArrowLeftRight, 
  LogOut, Menu, X, Users, Wrench, FileText, Building2, CalendarClock
} from 'lucide-react';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  }

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/materiais', label: 'Materiais', icon: Package },
    { path: '/materiais-alugados', label: 'Materiais Alugados', icon: CalendarClock },
    { path: '/movimentacoes', label: 'Movimentações', icon: ArrowLeftRight },
    { path: '/frentes', label: 'Frentes de Trabalho', icon: Wrench },
    { path: '/fornecedores', label: 'Fornecedores', icon: Building2 },
    { path: '/relatorios', label: 'Relatórios', icon: FileText },
    { path: '/usuarios', label: 'Usuários', icon: Users, adminOnly: true },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        width: '260px',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-color)',
        zIndex: 50,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform var(--transition-normal)',
        display: 'flex',
        flexDirection: 'column'
      }}
      className="sidebar-desktop"
      >
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '0.5rem', borderRadius: '8px' }}>
            <Package size={24} />
          </div>
          <span style={{ fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--text-main)' }}>R&C Controles</span>
          
          <button 
            className="mobile-only"
            onClick={() => setSidebarOpen(false)}
            style={{ marginLeft: 'auto', background: 'none', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        <nav style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {menuItems.map((item) => {
            if (item.adminOnly && userProfile?.perfil !== 'admin') return null;
            
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: isActive ? '500' : '400',
                  textAlign: 'left',
                  transition: 'all var(--transition-fast)',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {userProfile?.nome?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {userProfile?.nome || currentUser?.email}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {userProfile?.perfil || 'Usuário'}
              </p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', width: '100%', color: 'var(--danger)', background: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)'
            }}
          >
            <LogOut size={18} /> Sair
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', transition: 'margin-left var(--transition-normal)' }} className="main-content">
        <header style={{ 
          height: '64px', 
          backgroundColor: 'var(--bg-card)', 
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 1.5rem',
          position: 'sticky',
          top: 0,
          zIndex: 30
        }}>
          <button 
            className="menu-button"
            onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', color: 'var(--text-main)', marginRight: '1rem' }}
          >
            <Menu size={24} />
          </button>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '500' }}>
            {menuItems.find(i => i.path === location.pathname)?.label || 'Sistema'}
          </h2>
        </header>

        <div style={{ padding: '1.5rem', flex: 1, overflowX: 'auto' }}>
          <Outlet />
        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        @media (min-width: 768px) {
          .sidebar-desktop { transform: translateX(0) !important; }
          .mobile-only { display: none !important; }
          .menu-button { display: none !important; }
          .main-content { margin-left: 260px; width: calc(100% - 260px) !important; }
        }
      `}} />
    </div>
  );
}
