/**
 * Authentication Context
 * Manages user authentication state globally
 */

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiClient } from '../services/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const profile = await apiClient.getProfile();
      setUser(profile);
    } catch (error) {
      console.error('Auth check failed:', error);
      apiClient.clearAuthToken();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    console.log('AuthContext: Starting login...');
    await apiClient.login(username, password);
    console.log('AuthContext: Login API call successful, fetching profile...');
    const profile = await apiClient.getProfile();
    console.log('AuthContext: Profile fetched:', profile);
    setUser(profile);
    console.log('AuthContext: User state updated');
  };

  const logout = async () => {
    await apiClient.logout();
    setUser(null);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
