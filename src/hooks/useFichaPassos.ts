import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const OPERACOES = [
  'lavar', 'descascar', 'laminar', 'cubos', 'juliana', 'cozer',
  'saltear', 'arrefecer', 'escorrer', 'misturar', 'temperar', 'montar',
] as const;

export type Operacao = (typeof OPERACOES)[number];
export type TipoPasso = 'ativo' | 'espera';

export type Passo = {
  id: string;
  ficha_id: string;
  ordem: number;
  descricao: string;
  tipo_passo: TipoPasso;
  operacao: Operacao | null;
  zona_id: string | null;
  equipamento_id: string | null;
  duracao_fixa_min: number;
  duracao_por_kg_min: number;
  adiantavel: boolean;
  depende_de: string | null;
  estimado: boolean;
  notas: string | null;
};

export type Zona = { id: string; nome: string };
export type Equipamento = { id: string; nome: string; zona_id: string | null; capacidade: string | null };

export function useZonasEquipamentos() {
  return useQuery({
    queryKey: ['zonas_equipamentos'],
    queryFn: async () => {
      const [zonasRes, equipRes] = await Promise.all([
        supabase.from('zonas_producao').select('id, nome').eq('ativo', true).order('nome'),
        supabase.from('equipamentos').select('id, nome, zona_id, capacidade').eq('ativo', true).order('nome'),
      ]);
      if (zonasRes.error) throw zonasRes.error;
      if (equipRes.error) throw equipRes.error;
      return {
        zonas: (zonasRes.data || []) as Zona[],
        equipamentos: (equipRes.data || []) as Equipamento[],
      };
    },
    staleTime: 300_000,
  });
}

export function useFichaPassos(fichaId?: string) {
  return useQuery({
    queryKey: ['ficha_passos', fichaId],
    enabled: !!fichaId,
    queryFn: async (): Promise<Passo[]> => {
      const { data, error } = await supabase
        .from('ficha_passos')
        .select('*')
        .eq('ficha_id', fichaId!)
        .order('ordem');
      if (error) throw error;
      return (data || []) as unknown as Passo[];
    },
  });
}

export type PassoInput = Omit<Passo, 'id' | 'ficha_id' | 'depende_de'>;

/** Substitui todos os passos da ficha, reatribuindo ordem e dependências sequenciais */
export function useSaveFichaPassos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fichaId, passos }: { fichaId: string; passos: PassoInput[] }) => {
      const { error: delErr } = await supabase.from('ficha_passos').delete().eq('ficha_id', fichaId);
      if (delErr) throw delErr;

      let anterior: string | null = null;
      for (let i = 0; i < passos.length; i++) {
        const p = passos[i];
        const { data, error } = await supabase
          .from('ficha_passos')
          .insert({
            ficha_id: fichaId,
            ordem: i + 1,
            descricao: p.descricao,
            tipo_passo: p.tipo_passo,
            operacao: p.operacao,
            zona_id: p.zona_id,
            equipamento_id: p.equipamento_id,
            duracao_fixa_min: p.duracao_fixa_min,
            duracao_por_kg_min: p.duracao_por_kg_min,
            adiantavel: p.adiantavel,
            estimado: p.estimado,
            notas: p.notas,
            depende_de: anterior,
          })
          .select('id')
          .single();
        if (error) throw error;
        anterior = data.id;
      }
      return passos.length;
    },
    onSuccess: (_n, vars) => {
      qc.invalidateQueries({ queryKey: ['ficha_passos', vars.fichaId] });
      toast({ title: 'Passos guardados' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao guardar passos', description: err.message, variant: 'destructive' });
    },
  });
}

/** Totais: tempo de pessoa (passos ativos) e tempo de relógio (todos) */
export function calcularTotais(passos: { tipo_passo: TipoPasso; duracao_fixa_min: number; duracao_por_kg_min: number }[], kg: number) {
  const dur = (p: { duracao_fixa_min: number; duracao_por_kg_min: number }) =>
    Number(p.duracao_fixa_min || 0) + Number(p.duracao_por_kg_min || 0) * (kg || 0);
  const pessoa = passos.filter(p => p.tipo_passo === 'ativo').reduce((s, p) => s + dur(p), 0);
  const relogio = passos.reduce((s, p) => s + dur(p), 0);
  return { pessoa, relogio };
}
