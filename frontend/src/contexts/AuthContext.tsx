// AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth';
import { User, LoginRequest, RegisterRequest } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  isAuthenticated: boolean;
  isManager: boolean;
  isOrganizer: boolean;
  canManageTournaments: boolean;  
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    const init = async () => {
      if (savedToken && savedUser) {
        setToken(savedToken);
        const parsed = JSON.parse(savedUser) as User;
        setUser(parsed);
        try {
          const res = await fetch('http://localhost:8080/api/auth/me', {
            headers: { Authorization: `Bearer ${savedToken}` },
          });
          if (res.ok) {
            const me = await res.json();
            const merged = { ...parsed, ...me };
            setUser(merged);
            localStorage.setItem('user', JSON.stringify(merged));
          }
        } catch {
          /* ignore */
        }
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const login = async (data: LoginRequest) => {
    const response = await authApi.login(data);
    const { token, user } = response.data;
    
    setToken(token);
    setUser(user);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  };

  const register = async (data: RegisterRequest) => {
    const response = await authApi.register(data);
    const { token, user } = response.data;
    
    setToken(token);
    setUser(user);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    authApi.logout();
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const isAuthenticated = !!token;
  const isManager = user?.role === 'manager';
  const isOrganizer = user?.role === 'organizer';
  const canManageTournaments = isOrganizer || isManager; 

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      login,
      register,
      logout,
      updateUser,
      isAuthenticated,
      isManager,
      isOrganizer,
      canManageTournaments,  
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};