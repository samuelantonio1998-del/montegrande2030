import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast-with-sound';

export type Pessoa = {
  key: string;
  funcionario_id: string | null;
  user_id: string | null;
  nome: string;
  email: string | null;
  unidade_id: string | null;
  unidade_nome: string | null;
  role_id: string | null;
  role_nome: string | null;
  tem_pin: boolean;
  tem_conta: boolean;
  ativo: boolean;
  created_at: string;
};

export type Papel = {
  id: string;
  nome: string;
  chave: string;
  descricao: string | null;
  ativo: boolean;
  is_base: boolean;
};

export type Permissao = { id: string; chave: string; descricao: string };

export async function invocar<T = unknown>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('manage-employees', { body });
  if (error) {
    const detalhe = (data as { error?: string } | null)?.error;
    throw new Error(detalhe || error.message);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as T;
}

export function usePessoas() {
  return useQuery({
    queryKey: ['pessoas'],
    queryFn: async () => {
      const res = await invocar<{ data: Pessoa[]; roles: Papel[] }>({ action: 'pessoas_list' });
      return { pessoas: res.data ?? [], papeis: res.roles ?? [] };
    },
  });
}

export function usePapeis() {
  return useQuery({
    queryKey: ['papeis'],
    queryFn: async () => {
      const res = await invocar<{
        data: Papel[];
        permissoes: Permissao[];
        role_permissoes: { role_id: string; permissao_id: string }[];
      }>({ action: 'roles_list' });
      return {
        papeis: res.data ?? [],
        permissoes: res.permissoes ?? [],
        ligacoes: res.role_permissoes ?? [],
      };
    },
  });
}

export function usePessoaMutations() {
  const qc = useQueryClient();

  const criar = (mensagem: string, chaves: string[]) =>
    useMutation({
      mutationFn: (body: Record<string, unknown>) => invocar(body),
      onSuccess: () => {
        toast.success(mensagem);
        chaves.forEach(k => qc.invalidateQueries({ queryKey: [k] }));
      },
      onError: (err: Error) => toast.error(err.message),
    });

  return {
    guardarPessoa: criar('Pessoa guardada', ['pessoas']),
    definirPin: criar('PIN definido', ['pessoas']),
    definirPassword: criar('Password redefinida', ['pessoas']),
    definirEstado: criar('Estado atualizado', ['pessoas']),
    apagarPessoa: criar('Pessoa apagada', ['pessoas']),
    guardarPapel: criar('Papel guardado', ['papeis', 'pessoas']),
    guardarPermissoes: criar('Permissões atualizadas', ['papeis', 'permissao']),
    apagarPapel: criar('Papel apagado', ['papeis']),
  };
}
