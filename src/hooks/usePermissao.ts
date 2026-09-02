import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Verifica se o utilizador autenticado tem uma permissão (RPC tem_permissao). */
export function usePermissao(chave: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['permissao', chave],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('tem_permissao' as never, {
        p_permissao: chave,
      } as never);
      if (error) return false;
      return Boolean(data);
    },
  });

  return { permitido: data === true, loading: isLoading };
}
