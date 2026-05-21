import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Materiais from './pages/Materiais';
import Frentes from './pages/Frentes';
import Movimentacoes from './pages/Movimentacoes';
import Relatorios from './pages/Relatorios';
import MainLayout from './components/MainLayout';

function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={
        <PrivateRoute>
          <MainLayout />
        </PrivateRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="materiais" element={<Materiais />} />
        <Route path="movimentacoes" element={<Movimentacoes />} />
        <Route path="frentes" element={<Frentes />} />
        <Route path="relatorios" element={<Relatorios />} />
        <Route path="usuarios" element={<div className="card">Gestão de Usuários em desenvolvimento...</div>} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
