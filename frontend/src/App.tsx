import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProviderWrapper } from './contexts/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Tournaments from './pages/Tournaments';
import Registrations from './pages/Registrations';
import Bans from './pages/Bans';
import Support from './pages/Support';
import TournamentDetails from './pages/TournamentDetails';
import ClientTournaments from './pages/ClientTournaments';
import AllTournaments from './pages/AllTournaments';
import MyTournaments from './pages/MyTournaments';
import TournamentApplications from './pages/TournamentApplications';
import Profile from './pages/Profile';
import Messenger from './pages/Messenger';
import Subscription from './pages/Subscription';
import Friends from './pages/Friends';
import Themes from './pages/Themes';
import Wallet from './pages/Wallet';
import WalletPayments from './pages/WalletPayments';

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

// Организатор или менеджер
const StaffRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <div>Загрузка...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (user?.role !== 'organizer' && user?.role !== 'manager') {
    return <Navigate to="/client/tournaments" />;
  }
  return <>{children}</>;
};

// Защищённый маршрут для всех авторизованных
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

// Маршрут для деталей турнира - доступен и менеджеру, и организатору
const TournamentDetailsRoute: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <div>Загрузка...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (user?.role !== 'manager' && user?.role !== 'organizer') {
    return <Navigate to="/client/tournaments" />;
  }
  return <TournamentDetails />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      <Route path="/" element={<Navigate to="/client/tournaments" />} />
      <Route path="/client/tournaments" element={<ClientTournaments />} />
      <Route path="/client/all-tournaments" element={<AllTournaments />} />

      <Route path="/my-tournaments" element={
        <StaffRoute>
          <MyTournaments />
        </StaffRoute>
      } />

      <Route path="/tournament-applications" element={
        <StaffRoute>
          <TournamentApplications />
        </StaffRoute>
      } />

      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />
      
      <Route path="/themes" element={
        <ProtectedRoute>
          <Themes />
        </ProtectedRoute>
      } />
      
      <Route path="/messenger" element={
        <ProtectedRoute>
          <Messenger />
        </ProtectedRoute>
      } />
      
      <Route path="/subscription" element={
        <ProtectedRoute>
          <Subscription />
        </ProtectedRoute>
      } />
      
      <Route path="/friends" element={
        <ProtectedRoute>
          <Friends />
        </ProtectedRoute>
      } />

      <Route path="/wallet" element={
        <ProtectedRoute>
          <Wallet />
        </ProtectedRoute>
      } />
      
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
      
      {/* Исправленный маршрут для деталей турнира - без AdminRoute */}
      <Route path="/tournaments/:id" element={<TournamentDetailsRoute />} />
      
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

      <Route path="/wallet-payments" element={
        <AdminRoute>
          <WalletPayments />
        </AdminRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProviderWrapper>
            <AppRoutes />
          </ThemeProviderWrapper>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;