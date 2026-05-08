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

const queryClient = new QueryClient();

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
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            // внутри Routes добавь:
            <Route path="/tournaments/:id" element={
              <ProtectedRoute>
                <TournamentDetails />
              </ProtectedRoute>
            } />
            <Route path="/tournaments" element={
              <ProtectedRoute>
                <Tournaments />
              </ProtectedRoute>
            } />
            <Route path="/registrations" element={
              <ProtectedRoute>
                <Registrations />
              </ProtectedRoute>
            } />
            <Route path="/bans" element={
              <ProtectedRoute>
                <Bans />
              </ProtectedRoute>
            } />
            <Route path="/support" element={
              <ProtectedRoute>
                <Support />
              </ProtectedRoute>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;