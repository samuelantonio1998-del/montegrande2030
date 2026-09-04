import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast-with-sound';

export type UtilizadorGerido = {
  id: string;
  email: string;
  nome: string;
  unidade_id: string | null;
  unidade_nome: string | null;
  funcionario_id: string | null;
  ativo: boolean;
  roles: string[];
  created_at: string;
};

async function invoke<T = unknown>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('manage-employees', { body });
  if (error) {
    // A edge function devolve o detalhe no corpo mesmo em erro HTTP
    const detalhe = (data as { error?: string } | null)?.error;
    throw new Error(detalhe || error.message);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export function useUtilizadores() {
  return useQuery({
    queryKey: ['gestao-utilizadores'],
    queryFn: async () => {
      const res = await invoke<{ data: UtilizadorGerido[] }>({ action: 'users_list' });
      return res.data ?? [];
    },
  });
}

export function useUtilizadorMutations() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['gestao-utilizadores'] });

  const run = (mensagem: string) =>
    useMutation({
      mutationFn: (body: Record<string, unknown>) => invoke(body),
      onSuccess: () => {
        toast.success(mensagem);
        refresh();
      },
      onError: (err: Error) => toast.error(err.message),
    });

  return {
    criar: run('Utilizador criado'),
    atualizar: run('Utilizador atualizado'),
    definirPassword: run('Password redefinida'),
    definirEstado: run('Estado atualizado'),
    papel: run('Papéis atualizados'),
    apagar: run('Utilizador apagado'),
  };
}
