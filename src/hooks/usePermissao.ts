import { useQueries, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TODAS_PERMISSOES } from '@/lib/permissoes';

async function verificar(chave: string): Promise<boolean> {
  if (!chave) return false;
  const { data, error } = await supabase.rpc('tem_permissao' as never, {
    p_permissao: chave,
  } as never);
  if (error) return false;
  return Boolean(data);
}

/** Verifica se o utilizador autenticado tem uma permissão (RPC tem_permissao). */
export function usePermissao(chave: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['permissao', chave],
    staleTime: 5 * 60 * 1000,
    enabled: !!chave,
    queryFn: () => verificar(chave),
  });

  return { permitido: data === true, loading: isLoading };
}

/** Conjunto de todas as permissões conhecidas que o utilizador tem. */
export function useMinhasPermissoes() {
  const results = useQueries({
    queries: TODAS_PERMISSOES.map(chave => ({
      queryKey: ['permissao', chave],
      staleTime: 5 * 60 * 1000,
      queryFn: () => verificar(chave),
    })),
  });

  const loading = results.some(r => r.isLoading);
  const permissoes = new Set<string>(
    TODAS_PERMISSOES.filter((_, i) => results[i]?.data === true),
  );

  return {
    loading,
    permissoes,
    tem: (chave?: string) => (chave ? permissoes.has(chave) : true),
  };
}
