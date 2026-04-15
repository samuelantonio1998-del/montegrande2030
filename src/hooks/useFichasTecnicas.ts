import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type FichaTecnicaDB = {
  id: string;
  nome: string;
  categoria: string;
  porcoes: number;
  preco_venda: number;
  tempo_preparacao: number | null;
  foto_url: string | null;
  notas_preparacao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

/** Custo de mão-de-obra por hora (sem IVA) */
export const LABOR_COST_PER_HOUR = 11;

export type IngredienteDB = {
  id: string;
  ficha_id: string;
  produto_id: string;
  quantidade: number;
  unidade: string;
  produto?: { id: string; nome: string; custo_medio: number; unidade: string };
};

export type FichaComIngredientes = FichaTecnicaDB & {
  ingredientes: IngredienteDB[];
};

export function useFichasTecnicas() {
  return useQuery({
    queryKey: ['fichas_tecnicas'],
    queryFn: async (): Promise<FichaComIngredientes[]> => {
      const { data: fichas, error } = await supabase
        .from('fichas_tecnicas')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;

      const { data: ingredientes, error: ingError } = await supabase
        .from('ficha_ingredientes')
        .select('*, produto:produtos(id, nome, custo_medio, unidade)');

      if (ingError) throw ingError;

      return (fichas || []).map(f => ({
        ...f,
        ingredientes: (ingredientes || []).filter(i => i.ficha_id === f.id).map(i => ({
          ...i,
          produto: i.produto as unknown as IngredienteDB['produto'],
        })),
      }));
    },
  });
}

export function useCreateFicha() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      nome: string;
      categoria: string;
      porcoes: number;
      preco_venda: number;
      tempo_preparacao: number;
      foto_url?: string | null;
      notas_preparacao?: string | null;
      ingredientes: { produto_id: string; quantidade: number; unidade: string }[];
    }) => {
      const { data: ficha, error } = await supabase
        .from('fichas_tecnicas')
        .insert({
          nome: data.nome,
          categoria: data.categoria,
          porcoes: data.porcoes,
          preco_venda: data.preco_venda,
          tempo_preparacao: data.tempo_preparacao,
          foto_url: data.foto_url || null,
          notas_preparacao: data.notas_preparacao || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (data.ingredientes.length > 0) {
        const { error: ingError } = await supabase
          .from('ficha_ingredientes')
          .insert(
            data.ingredientes.map(ing => ({
              ficha_id: ficha.id,
              produto_id: ing.produto_id,
              quantidade: ing.quantidade,
              unidade: ing.unidade,
            }))
          );
        if (ingError) throw ingError;
      }

      // Auto-link to buffet items by name match
      await supabase
        .from('buffet_items')
        .update({ ficha_tecnica_id: ficha.id })
        .ilike('nome', data.nome);

      return ficha;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fichas_tecnicas'] });
      toast({ title: 'Ficha criada com sucesso' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao criar ficha', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateFicha() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: string;
      nome: string;
      categoria: string;
      porcoes: number;
      preco_venda: number;
      tempo_preparacao: number;
      foto_url?: string | null;
      notas_preparacao?: string | null;
      ingredientes: { produto_id: string; quantidade: number; unidade: string }[];
    }) => {
      const { data: ficha, error } = await supabase
        .from('fichas_tecnicas')
        .update({
          nome: data.nome,
          categoria: data.categoria,
          porcoes: data.porcoes,
          preco_venda: data.preco_venda,
          tempo_preparacao: data.tempo_preparacao,
          foto_url: data.foto_url || null,
          notas_preparacao: data.notas_preparacao || null,
        })
        .eq('id', data.id)
        .select()
        .single();
      if (error) throw error;

      // Delete existing ingredients and re-insert
      await supabase.from('ficha_ingredientes').delete().eq('ficha_id', data.id);

      if (data.ingredientes.length > 0) {
        const { error: ingError } = await supabase
          .from('ficha_ingredientes')
          .insert(
            data.ingredientes.map(ing => ({
              ficha_id: data.id,
              produto_id: ing.produto_id,
              quantidade: ing.quantidade,
              unidade: ing.unidade,
            }))
          );
        if (ingError) throw ingError;
      }

      await supabase
        .from('buffet_items')
        .update({ ficha_tecnica_id: data.id })
        .ilike('nome', data.nome);

      return {
        ...ficha,
        ingredientes: data.ingredientes.map(ing => ({
          id: `${data.id}-${ing.produto_id}`,
          ficha_id: data.id,
          produto_id: ing.produto_id,
          quantidade: ing.quantidade,
          unidade: ing.unidade,
        })),
      };
    },
    onSuccess: (updatedFicha) => {
      qc.setQueryData(['fichas_tecnicas'], (current: FichaComIngredientes[] | undefined) =>
        (current || []).map(ficha =>
          ficha.id === updatedFicha.id
            ? {
                ...ficha,
                ...updatedFicha,
                ingredientes: updatedFicha.ingredientes.map(ing => ({
                  ...ing,
                  produto: ficha.ingredientes.find(existing => existing.produto_id === ing.produto_id)?.produto,
                })),
              }
            : ficha
        )
      );
      qc.invalidateQueries({ queryKey: ['fichas_tecnicas'] });
      toast({ title: 'Ficha atualizada com sucesso' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao atualizar ficha', description: err.message, variant: 'destructive' });
    },
  });
}

export function useDeleteFicha() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fichas_tecnicas')
        .update({ ativo: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fichas_tecnicas'] });
      toast({ title: 'Ficha removida' });
    },
  });
}

export function useProdutos() {
  return useQuery({
    queryKey: ['produtos_ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, custo_medio, unidade, categoria')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data || [];
    },
  });
}
