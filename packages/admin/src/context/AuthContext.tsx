import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storage } from '../utils/storage';
import { adminRequestInit, clearLegacyAdminKey } from '../utils/adminKey';

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
    // 로그인 여부는 브라우저가 아니라 서버가 판단한다.
    // (쿠키는 HttpOnly라 JS가 읽을 수 없으므로 서버에 물어봐야 한다)
    clearLegacyAdminKey();
    let alive = true;
    fetch(`${API_BASE_URL}/admin/session`, adminRequestInit())
      .then((res) => (res.ok ? res.json() : { authenticated: false }))
      .then((data) => {
        if (!alive) return;
        const ok = Boolean(data?.authenticated);
        setIsAuthenticated(ok);
        if (!ok) storage.clearAuth();
      })
      .catch(() => {
        if (alive) {
          setIsAuthenticated(false);
          storage.clearAuth();
        }
      })
      .finally(() => {
        if (alive) setIsAuthLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // 입력한 키가 맞는지 서버에 확인한 뒤에만 로그인 처리한다.
  const login = async (adminKey: string): Promise<boolean> => {
    const trimmed = adminKey.trim();
    if (!trimmed) return false;

    // 키는 이 요청에서만 쓰이고 브라우저에 저장되지 않는다.
    // 서버가 HttpOnly 쿠키를 내려주면 이후에는 그 쿠키로만 인증한다.
    try {
      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': trimmed },
        ...adminRequestInit(),
      });
      if (!response.ok) return false;
    } catch {
      // 서버에 닿지 못하면 로그인 성공으로 처리하지 않는다
      return false;
    }

    setIsAuthenticated(true);
    storage.saveAuth({ isAuthenticated: true, loginTime: new Date().toISOString() });
    return true;
  };

  const logout = () => {
    setIsAuthenticated(false);
    storage.clearAuth();
    clearLegacyAdminKey();
    // 서버가 쿠키를 지우게 한다 (JS로는 HttpOnly 쿠키를 못 지운다)
    fetch(`${API_BASE_URL}/admin/logout`, { method: 'POST', ...adminRequestInit() }).catch(() => undefined);
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
