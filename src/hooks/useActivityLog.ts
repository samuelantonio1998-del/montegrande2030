import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const log = useCallback(async (
    action: string,
    module: string,
    details?: string,
    metadata?: Record<string, unknown>
  ) => {
    try {
      await supabase.functions.invoke('log-activity', {
        body: {
          action,
          module,
          details: details || '',
          metadata: metadata || {},
        },
      });
    } catch (e) {
      console.error('Erro ao registar log:', e);
    }
  }, []);

  return { log };
}

// Standalone version for use outside React components.
// Identity is derived server-side from the caller's JWT — user args are ignored server-side.
export async function logActivity(
  _userName: string,
  _userRole: string,
  action: string,
  module: string,
  details?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await supabase.functions.invoke('log-activity', {
      body: {
        action,
        module,
        details: details || '',
        metadata: metadata || {},
      },
    });
  } catch (e) {
    console.error('Erro ao registar log:', e);
  }
}
