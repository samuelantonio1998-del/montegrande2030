import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type CartaItem = {
  ficha_tecnica_id: string;
  nome: string;
  nome_comercial: string | null;
  preco_venda: number | null;
  categoria: string;
};

export type Carta = {
  itens: CartaItem[];
  /** false quando a marca ainda não tem nenhuma ficha em ficha_marca (fallback: todas as fichas) */
  definida: boolean;
};

/**
 * Carta comercial de uma marca: fichas técnicas activas associadas em ficha_marca.
 * Fallback: se a marca não tiver carta definida, devolve todas as fichas activas.
 */
export function useCartaMarca(marcaId?: string | null) {
  return useQuery({
    queryKey: ['carta_marca', marcaId ?? 'sem-marca'],
    queryFn: async (): Promise<Carta> => {
      const { data: fichas, error } = await supabase
        .from('fichas_tecnicas')
        .select('id, nome, categoria, preco_venda')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;

      const todas: CartaItem[] = (fichas ?? []).map(f => ({
        ficha_tecnica_id: f.id,
        nome: f.nome,
        nome_comercial: null,
        preco_venda: f.preco_venda,
        categoria: f.categoria,
      }));

      if (!marcaId) return { itens: todas, definida: false };

      const { data: links, error: linkErr } = await supabase
        .from('ficha_marca')
        .select('ficha_tecnica_id, nome_comercial, preco_venda, ativo')
        .eq('marca_id', marcaId)
        .eq('ativo', true);
      if (linkErr) throw linkErr;

      const byId = new Map((links ?? []).map(l => [l.ficha_tecnica_id, l]));
      if (byId.size === 0) return { itens: todas, definida: false };

      const itens = todas
        .filter(f => byId.has(f.ficha_tecnica_id))
        .map(f => {
          const l = byId.get(f.ficha_tecnica_id)!;
          return {
            ...f,
            nome_comercial: l.nome_comercial ?? null,
            preco_venda: l.preco_venda ?? f.preco_venda,
          };
        });

      return { itens, definida: true };
    },
  });
}
