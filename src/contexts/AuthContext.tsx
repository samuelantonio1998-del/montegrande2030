import { createContext, useContext, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'sala' | 'cozinha' | 'gerencia';

export type AppUser = {
  name: string;
  role: UserRole;
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
    try {
      const { data, error } = await supabase.functions.invoke('verify-employee-pin', {
        body: { pin },
      });
      if (error || !data?.success) return false;
      setUser({ name: data.nome, role: data.role as UserRole });
      return true;
    } catch {
      return false;
    }
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
