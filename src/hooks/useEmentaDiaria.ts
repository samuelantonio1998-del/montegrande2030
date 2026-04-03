import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export const PERMANENT_DATE = '9999-12-31';

export type EmentaItem = {
  id: string;
  data: string;
  buffet_item_id: string;
  quantidade_prevista: number;
  recipiente_sugerido: string;
  historico_consumo_kg: number[];
  historico_sobra_kg: number[];
  notas: string | null;
  criado_por: string | null;
  buffet_item?: {
    id: string;
    nome: string;
    zona: string;
    ativo: boolean;
    ficha_tecnica_id: string | null;
  };
};

export function useEmentaDiaria(date?: Date) {
  const dateStr = format(date || new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['ementa_diaria', dateStr],
    queryFn: async (): Promise<EmentaItem[]> => {
      const { data, error } = await supabase
        .from('ementa_diaria')
        .select('*, buffet_item:buffet_items(id, nome, zona, ativo, ficha_tecnica_id)')
        .in('data', [dateStr, PERMANENT_DATE])
        .order('created_at');

      if (error) throw error;
      
      // Deduplicate: if an item exists for today AND as permanent, prefer today's entry
      const seen = new Set<string>();
      const result: EmentaItem[] = [];
      const allItems = (data || []).map(d => ({
        ...d,
        historico_consumo_kg: (d.historico_consumo_kg as number[]) || [],
        historico_sobra_kg: (d.historico_sobra_kg as number[]) || [],
        buffet_item: d.buffet_item as unknown as EmentaItem['buffet_item'],
      }));
      
      // First pass: today's items
      for (const item of allItems) {
        if (item.data !== PERMANENT_DATE) {
          seen.add(item.buffet_item_id);
          result.push(item);
        }
      }
      // Second pass: permanent items not already covered by today
      for (const item of allItems) {
        if (item.data === PERMANENT_DATE && !seen.has(item.buffet_item_id)) {
          seen.add(item.buffet_item_id);
          result.push(item);
        }
      }
      
      return result;
    },
  });
}

export function usePermanentEmentaItems() {
  return useQuery({
    queryKey: ['ementa_diaria', PERMANENT_DATE],
    queryFn: async (): Promise<EmentaItem[]> => {
      const { data, error } = await supabase
        .from('ementa_diaria')
        .select('*, buffet_item:buffet_items(id, nome, zona, ativo, ficha_tecnica_id)')
        .eq('data', PERMANENT_DATE)
        .order('created_at');
      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        historico_consumo_kg: (d.historico_consumo_kg as number[]) || [],
        historico_sobra_kg: (d.historico_sobra_kg as number[]) || [],
        buffet_item: d.buffet_item as unknown as EmentaItem['buffet_item'],
      }));
    },
  });
}

export function useAddToEmenta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      data: string;
      buffet_item_id: string;
      quantidade_prevista: number;
      recipiente_sugerido: string;
      historico_consumo_kg?: number[];
      historico_sobra_kg?: number[];
      notas?: string;
      criado_por?: string;
    }) => {
      const { error } = await supabase.from('ementa_diaria').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ementa_diaria'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao adicionar à ementa', description: err.message, variant: 'destructive' });
    },
  });
}

export function useRemoveFromEmenta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ementa_diaria').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ementa_diaria'] });
    },
  });
}

export function useBulkAddEmenta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: {
      data: string;
      buffet_item_id: string;
      quantidade_prevista: number;
      recipiente_sugerido: string;
      historico_consumo_kg?: number[];
      historico_sobra_kg?: number[];
      criado_por?: string;
    }[]) => {
      const { error } = await supabase.from('ementa_diaria').insert(items);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ementa_diaria'] });
      toast({ title: 'Ementa do dia criada' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao criar ementa', description: err.message, variant: 'destructive' });
    },
  });
}

export function useBuffetItems() {
  return useQuery({
    queryKey: ['buffet_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buffet_items')
        .select('*')
        .eq('ativo', true)
        .not('ficha_tecnica_id', 'is', null)
        .order('nome');
      if (error) throw error;
      return data || [];
    },
  });
}
