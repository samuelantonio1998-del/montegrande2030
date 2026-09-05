import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

export type AppUser = {
  name: string;
  role: string;
  funcionarioId?: string;
};

type AuthContextType = {
  user: AppUser | null;
  loading: boolean;
  login: (pin: string) => Promise<boolean>;
  loginAdmin: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  requestAdminReset: (email: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

function deriveUser(session: Session | null): AppUser | null {
  if (!session?.user) return null;
  const meta = (session.user.app_metadata ?? {}) as Record<string, unknown>;
  const umeta = (session.user.user_metadata ?? {}) as Record<string, unknown>;
  const funcionarioId = meta.funcionario_id as string | undefined;
  const role = typeof meta.role === 'string' ? meta.role : undefined;

  // Case 1: PIN-based employee session — must have funcionario_id + role
  if (funcionarioId && role) {
    const name = (meta.nome as string) ?? (umeta.nome as string) ?? 'Funcionário';
    return { name, role, funcionarioId };
  }

  // Case 2: conta de gestão (sem funcionario_id) — o perfil vem do metadata
  if (!funcionarioId && session.user.email) {
    const emailName = session.user.email.split('@')[0];
    const name = (meta.nome as string) ?? (umeta.nome as string) ?? emailName ?? 'Administrador';
    return { name, role: role ?? 'utilizador' };
  }

  // Sessão inválida
  return null;

}


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Register listener FIRST to avoid missing events
    const handle = (session: Session | null) => {
      const derived = deriveUser(session);
      if (session && !derived) {
        // Invalid session (no funcionario_id and not gerencia) — force logout
        console.error('Sessão inválida: sem funcionario_id e sem role=gerencia. A terminar sessão.');
        supabase.auth.signOut();
        setUser(null);
        return;
      }
      setUser(derived);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      handle(session);
    });

    supabase.auth.getSession().then(({ data }) => {
      handle(data.session);
      setLoading(false);
    });


    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = async (pin: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('employee-login', {
        body: { pin },
      });
      if (error || !data?.success || !data?.token_hash) return false;

      const { error: verifyErr } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: 'magiclink',
      });
      if (verifyErr) return false;
      return true;
    } catch {
      return false;
    }
  };

  const loginAdmin = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const requestAdminReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };


  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginAdmin, requestAdminReset, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
