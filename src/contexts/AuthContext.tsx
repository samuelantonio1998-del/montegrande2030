import { createContext, useContext, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'sala' | 'cozinha' | 'gerencia';

export type AppUser = {
  name: string;
  role: UserRole;
  pin: string;
};

type AuthContextType = {
  user: AppUser | null;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);

  const login = async (pin: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('funcionarios')
      .select('nome, role, pin')
      .eq('pin', pin)
      .eq('ativo', true)
      .maybeSingle();
    if (error || !data) return false;
    setUser({ name: data.nome, role: data.role as UserRole, pin: data.pin });
    return true;
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
