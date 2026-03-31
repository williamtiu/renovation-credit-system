import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type UserRole = 'company_user' | 'customer' | 'reviewer' | 'admin' | null;

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId?: string;
  companyName?: string;
  creditScore?: number;
  trustLevel?: string;
  trustGrade?: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, password: string, role: UserRole, companyName?: string) => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '/api';

const DEMO_USERS: Record<string, User> = {
  'company@demo.com': {
    id: 'u1',
    name: 'Alex Construction',
    email: 'company@demo.com',
    role: 'company_user',
    companyId: 'c1',
    companyName: 'BuildPro Renovation Ltd.',
    creditScore: 3468,
    trustLevel: 'High',
    trustGrade: 'B',
  },
  'customer@demo.com': {
    id: 'u2',
    name: 'Sarah Chen',
    email: 'customer@demo.com',
    role: 'customer',
  },
  'reviewer@demo.com': {
    id: 'u3',
    name: 'James Wilson',
    email: 'reviewer@demo.com',
    role: 'reviewer',
  },
  'admin@demo.com': {
    id: 'u4',
    name: 'Admin User',
    email: 'admin@demo.com',
    role: 'admin',
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const normalizeUser = (payload: any): User => ({
    id: String(payload.id || ''),
    name: payload.name || payload.username || '',
    email: payload.email || '',
    role: (payload.role || null) as UserRole,
    companyId: payload.companyId ? String(payload.companyId) : payload.company_id ? String(payload.company_id) : undefined,
    companyName: payload.companyName || payload.company_name || undefined,
    creditScore: payload.creditScore || payload.credit_score || undefined,
    trustLevel: payload.trustLevel || payload.trust_level || undefined,
    trustGrade: payload.trustGrade || payload.trust_grade || undefined,
    avatar: payload.avatar || undefined,
  });

  const parseApi = async (res: Response) => {
    const json = await res.json();
    if (!res.ok || json?.success === false) {
      throw new Error(json?.error || 'Request failed');
    }
    return json?.data;
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) return;
        const data = await parseApi(res);
        setUser(normalizeUser(data));
      } catch {
        // Keep unauthenticated state when session bootstrap fails.
      }
    };
    void bootstrap();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          identifier: email,
          password,
        }),
      });
      const data = await parseApi(res);
      setUser(normalizeUser(data));
    } catch {
      const demoUser = DEMO_USERS[email];
      if (demoUser) {
        setUser(demoUser);
        return;
      }
      throw new Error('Login failed');
    }
  };

  const register = async (name: string, email: string, password: string, role: UserRole, companyName?: string) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        name,
        username: name,
        email,
        password,
        role,
        companyName,
      }),
    });
    const data = await parseApi(res);
    setUser(normalizeUser(data));
  };

  const logout = () => {
    setUser(null);
    void fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
  };
  const updateUser = (updates: Partial<User>) => setUser(prev => prev ? { ...prev, ...updates } : prev);

  return (
    <AuthContext.Provider value={{ user, login, logout, register, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
