import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast-with-sound';

export type FichaMarca = {
  ficha_tecnica_id: string;
  marca_id: string;
  nome_comercial: string | null;
  preco_venda: number | null;
  ativo: boolean;
};

/** Camada comercial de uma ficha técnica: nome e preço por marca. */
export function useFichaMarcas(fichaId?: string) {
  return useQuery({
    queryKey: ['ficha_marca', fichaId],
    enabled: !!fichaId,
    queryFn: async (): Promise<FichaMarca[]> => {
      const { data, error } = await supabase
        .from('ficha_marca')
        .select('*')
        .eq('ficha_tecnica_id', fichaId!);
      if (error) throw error;
      return (data ?? []) as unknown as FichaMarca[];
    },
  });
}

export function useSaveFichaMarca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: FichaMarca) => {
      const { error } = await supabase
        .from('ficha_marca')
        .upsert(row, { onConflict: 'ficha_tecnica_id,marca_id' });
      if (error) throw error;
    },
    onSuccess: (_d, row) => {
      qc.invalidateQueries({ queryKey: ['ficha_marca', row.ficha_tecnica_id] });
    },
    onError: (err: Error) => toast.error(`Erro ao guardar marca: ${err.message}`),
  });
}
