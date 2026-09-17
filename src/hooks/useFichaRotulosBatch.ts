import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FichaRotulo } from '@/hooks/useFichaRotulo';

/** Nomes comerciais de todas as fichas para uma marca. */
export function useNomesComerciaisMarca(marcaId?: string | null) {
  return useQuery({
    queryKey: ['ficha_marca_nomes', marcaId],
    enabled: !!marcaId,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase
        .from('ficha_marca')
        .select('ficha_tecnica_id, nome_comercial')
        .eq('marca_id', marcaId!);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((r: { ficha_tecnica_id: string; nome_comercial: string | null }) => {
        if (r.nome_comercial?.trim()) map[r.ficha_tecnica_id] = r.nome_comercial.trim();
      });
      return map;
    },
  });
}

/** Todos os rótulos indexados por ficha (inclui fichas sem título). */
export function useTodosRotulos() {
  return useQuery({
    queryKey: ['ficha_rotulos_todos'],
    queryFn: async (): Promise<Record<string, FichaRotulo>> => {
      const { data, error } = await supabase.from('ficha_rotulos').select('*');
      if (error) throw error;
      const map: Record<string, FichaRotulo> = {};
      ((data ?? []) as FichaRotulo[]).forEach(r => { map[r.ficha_id] = r; });
      return map;
    },
  });
}
