import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Tournaments from './pages/Tournaments';
import Registrations from './pages/Registrations';
import Bans from './pages/Bans';
import Support from './pages/Support';
import TournamentDetails from './pages/TournamentDetails';
import ClientTournaments from './pages/ClientTournaments';
import Profile from './pages/Profile';
import Friends from './pages/Friends';

const queryClient = new QueryClient();

// Защищённый маршрут только для менеджеров
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  if (isLoading) {
    return <div>Загрузка...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (user?.role !== 'manager') {
    return <Navigate to="/client/tournaments" />;
  }
  
  return <>{children}</>;
};

// Защищённый маршрут для всех авторизованных пользователей
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>Загрузка...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Публичные маршруты */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Клиентский модуль (доступен всем) */}
            <Route path="/" element={<Navigate to="/client/tournaments" />} />
            <Route path="/client/tournaments" element={<ClientTournaments />} />
            
            {/* Профиль (только для авторизованных) */}
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            {/* Модуль клиентский друзья*/}
            <Route path="/friends" element={
              <ProtectedRoute>
               <Friends />
             </ProtectedRoute>
            } />
            
            {/* Административная панель (только для менеджеров) */}
            <Route path="/dashboard" element={
              <AdminRoute>
                <Dashboard />
              </AdminRoute>
            } />
            <Route path="/tournaments" element={
              <AdminRoute>
                <Tournaments />
              </AdminRoute>
            } />
            <Route path="/tournaments/:id" element={
              <AdminRoute>
                <TournamentDetails />
              </AdminRoute>
            } />
            <Route path="/registrations" element={
              <AdminRoute>
                <Registrations />
              </AdminRoute>
            } />
            <Route path="/bans" element={
              <AdminRoute>
                <Bans />
              </AdminRoute>
            } />
            <Route path="/support" element={
              <AdminRoute>
                <Support />
              </AdminRoute>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;