import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, role?: UserRole, name?: string, institution?: string) => Promise<void>;
  register: (name: string, email: string, role: UserRole, institution?: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('certledger_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setUser(data.user);
          } else {
            logout();
          }
        })
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      // Default to Student login for initial frictionless experience
      login('student@mit.edu', 'STUDENT').finally(() => setLoading(false));
    }
  }, []);

  const login = async (email: string, role?: UserRole, name?: string, institution?: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, name, institution })
      });
      const data = await res.json();

      if (data.success) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('certledger_token', data.token);
      } else {
        throw new Error(data.error || 'Login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, role: UserRole, institution?: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role, institution })
      });
      const data = await res.json();

      if (data.success) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('certledger_token', data.token);
      } else {
        throw new Error(data.error || 'Registration failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const switchRole = async (role: UserRole) => {
    let email = 'student@mit.edu';
    if (role === 'TEACHER') email = 'teacher@university.edu';
    if (role === 'SUPER_ADMIN') email = 'admin@edx.org';

    await login(email, role);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('certledger_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, switchRole, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
