import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type LogEntry = {
  id: string;
  user_name: string;
  user_role: string;
  action: string;
  module: string;
  details: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export function useActivityLog() {
  const { user } = useAuth();

  const log = useCallback(async (
    action: string,
    module: string,
    details?: string,
    metadata?: Record<string, unknown>
  ) => {
    try {
      await supabase.from('activity_logs').insert({
        user_name: user?.name || 'Sistema',
        user_role: user?.role || '',
        action,
        module,
        details: details || '',
        metadata: metadata || {},
      });
    } catch (e) {
      console.error('Erro ao registar log:', e);
    }
  }, [user?.name, user?.role]);

  return { log };
}

// Standalone version for use outside React components
export async function logActivity(
  userName: string,
  userRole: string,
  action: string,
  module: string,
  details?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await supabase.from('activity_logs').insert({
      user_name: userName,
      user_role: userRole,
      action,
      module,
      details: details || '',
      metadata: metadata || {},
    });
  } catch (e) {
    console.error('Erro ao registar log:', e);
  }
}
