import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storage } from '../utils/storage';
import { adminAuthHeaders, clearAdminKey, getAdminKey, saveAdminKey } from '../utils/adminKey';

interface AuthContextType {
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  login: (adminKey: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.tourstream.kr/api';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    // 저장된 키가 있어야만 로그인 상태로 인정 (키 없이 화면만 열려 있으면 쓰기가 전부 실패하므로)
    const auth = storage.getAuth();
    if (auth && auth.isAuthenticated && getAdminKey()) {
      setIsAuthenticated(true);
    } else {
      storage.clearAuth();
      clearAdminKey();
    }
    setIsAuthLoading(false);
  }, []);

  // 입력한 키가 맞는지 서버에 확인한 뒤에만 로그인 처리한다.
  const login = async (adminKey: string): Promise<boolean> => {
    const trimmed = adminKey.trim();
    if (!trimmed) return false;

    saveAdminKey(trimmed);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/verify-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders() },
      });
      if (!response.ok) {
        clearAdminKey();
        return false;
      }
    } catch {
      // 서버에 닿지 못하면 로그인 성공으로 처리하지 않는다
      clearAdminKey();
      return false;
    }

    setIsAuthenticated(true);
    storage.saveAuth({ isAuthenticated: true, loginTime: new Date().toISOString() });
    return true;
  };

  const logout = () => {
    setIsAuthenticated(false);
    storage.clearAuth();
    clearAdminKey();
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAuthLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
