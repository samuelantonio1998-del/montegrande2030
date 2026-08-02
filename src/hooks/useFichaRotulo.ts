import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type FichaRotulo = {
  id: string;
  ficha_id: string;
  titulo: string | null;
  modo_preparacao: string | null;
  ingredientes: string | null;
  nutricional: string | null;
  alergenios: string | null;
  conservacao: string | null;
  peso: string | null;
};

export type RotuloInput = {
  titulo: string;
  modo_preparacao: string;
  ingredientes: string;
  nutricional: string;
  alergenios: string;
  conservacao: string;
  peso: string;
};

export const emptyRotulo: RotuloInput = {
  titulo: '',
  modo_preparacao: '',
  ingredientes: '',
  nutricional: '',
  alergenios: '',
  conservacao: '',
  peso: '',
};

export function useFichaRotulo(fichaId: string | null | undefined) {
  return useQuery({
    queryKey: ['ficha_rotulo', fichaId],
    enabled: !!fichaId,
    queryFn: async (): Promise<FichaRotulo | null> => {
      const { data, error } = await supabase
        .from('ficha_rotulos')
        .select('*')
        .eq('ficha_id', fichaId!)
        .maybeSingle();
      if (error) throw error;
      return data as FichaRotulo | null;
    },
  });
}

export function useSaveFichaRotulo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fichaId, rotulo }: { fichaId: string; rotulo: RotuloInput }) => {
      const payload = {
        ficha_id: fichaId,
        titulo: rotulo.titulo || null,
        modo_preparacao: rotulo.modo_preparacao || null,
        ingredientes: rotulo.ingredientes || null,
        nutricional: rotulo.nutricional || null,
        alergenios: rotulo.alergenios || null,
        conservacao: rotulo.conservacao || null,
        peso: rotulo.peso || null,
      };
      const { error } = await supabase
        .from('ficha_rotulos')
        .upsert(payload, { onConflict: 'ficha_id' });
      if (error) throw error;
      return payload;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['ficha_rotulo', vars.fichaId] });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao guardar rótulo', description: err.message, variant: 'destructive' });
    },
  });
}
