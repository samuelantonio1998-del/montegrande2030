import { createContext, useContext, useState, type ReactNode } from 'react';

export type UserRole = 'sala' | 'cozinha' | 'gerencia';

export type AppUser = {
  name: string;
  role: UserRole;
  pin: string;
};

export const mockUsers: AppUser[] = [
  { name: 'João', role: 'sala', pin: '1111' },
  { name: 'Maria', role: 'sala', pin: '2222' },
  { name: 'Pedro', role: 'cozinha', pin: '3333' },
  { name: 'Ana', role: 'cozinha', pin: '4444' },
  { name: 'Carlos', role: 'gerencia', pin: '5555' },
];

type AuthContextType = {
  user: AppUser | null;
  login: (pin: string) => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);

  const login = (pin: string) => {
    const found = mockUsers.find(u => u.pin === pin);
    if (found) {
      setUser(found);
      return true;
    }
    return false;
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
