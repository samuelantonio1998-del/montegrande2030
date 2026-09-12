import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast-with-sound';

export type Turno = 'almoco' | 'jantar' | 'unico';

export type Horario = {
  id: string;
  funcionario_id: string;
  unidade_id: string | null;
  dia_semana: number;
  hora_inicio: string | null;
  hora_fim: string | null;
  turno: Turno;
  alternado: boolean;
  ativo: boolean;
};

export type Excepcao = {
  id: string;
  funcionario_id: string;
  unidade_id: string | null;
  data: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  ausente: boolean;
  motivo: string | null;
};

export type Escala = {
  id: string;
  unidade_id: string | null;
  semana_inicio: string;
  funcionario_id: string;
  turno: 'almoco' | 'jantar';
};

/** Segunda-feira da semana que contém a data indicada (ISO: semana começa à segunda). */
export function inicioSemana(d: Date): Date {
  const base = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (base.getDay() + 6) % 7;
  base.setDate(base.getDate() - diff);
  return base;
}

export const paraISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const hhmm = (t: string | null) => (t ? t.slice(0, 5) : '');

export function horasEntre(inicio: string | null, fim: string | null): number {
  if (!inicio || !fim) return 0;
  const [hi, mi] = inicio.split(':').map(Number);
  const [hf, mf] = fim.split(':').map(Number);
  const total = hf * 60 + mf - (hi * 60 + mi);
  return total > 0 ? total / 60 : 0;
}

export function useHorarios(semanaISO: string) {
  const fimSemana = (() => {
    const d = new Date(`${semanaISO}T00:00:00`);
    d.setDate(d.getDate() + 6);
    return paraISO(d);
  })();

  return useQuery({
    queryKey: ['horarios', semanaISO],
    queryFn: async () => {
      const [h, e, esc] = await Promise.all([
        supabase.from('horarios_trabalho').select('*').eq('ativo', true),
        supabase.from('horario_excepcoes').select('*').gte('data', semanaISO).lte('data', fimSemana),
        supabase.from('escala_alternancia').select('*').eq('semana_inicio', semanaISO),
      ]);
      if (h.error) throw h.error;
      if (e.error) throw e.error;
      if (esc.error) throw esc.error;
      return {
        horarios: (h.data ?? []) as Horario[],
        excepcoes: (e.data ?? []) as Excepcao[],
        escala: (esc.data ?? []) as Escala[],
      };
    },
  });
}

export function useHorarioMutations(semanaISO: string) {
  const qc = useQueryClient();
  const invalidar = () => qc.invalidateQueries({ queryKey: ['horarios'] });

  const guardarDia = useMutation({
    mutationFn: async (args: {
      funcionario_id: string;
      unidade_id: string | null;
      dia_semana: number;
      folga: boolean;
      alternado: boolean;
      inicio: string;
      fim: string;
      inicioJantar: string;
      fimJantar: string;
      existentes: Horario[];
    }) => {
      const apagar = args.existentes.map(h => h.id);
      if (apagar.length) {
        const { error } = await supabase.from('horarios_trabalho').delete().in('id', apagar);
        if (error) throw error;
      }
      if (args.folga) return;
      const linhas = args.alternado
        ? [
            { turno: 'almoco', hora_inicio: args.inicio, hora_fim: args.fim },
            { turno: 'jantar', hora_inicio: args.inicioJantar, hora_fim: args.fimJantar },
          ]
        : [{ turno: 'unico', hora_inicio: args.inicio, hora_fim: args.fim }];
      const { error } = await supabase.from('horarios_trabalho').insert(
        linhas.map(l => ({
          funcionario_id: args.funcionario_id,
          unidade_id: args.unidade_id,
          dia_semana: args.dia_semana,
          alternado: args.alternado,
          ...l,
        })) as never,
      );
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Horário guardado'); invalidar(); },
    onError: (err: Error) => toast.error(err.message),
  });

  const trocarTurnos = useMutation({
    mutationFn: async (args: {
      unidade_id: string | null;
      pessoas: string[];
      atual: Record<string, 'almoco' | 'jantar'>;
    }) => {
      const linhas = args.pessoas.map((id, i) => ({
        unidade_id: args.unidade_id,
        semana_inicio: semanaISO,
        funcionario_id: id,
        turno: args.atual[id]
          ? args.atual[id] === 'almoco' ? 'jantar' : 'almoco'
          : i === 0 ? 'jantar' : 'almoco',
      }));
      const { error } = await supabase
        .from('escala_alternancia')
        .upsert(linhas as never, { onConflict: 'semana_inicio,funcionario_id' });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Turnos trocados nesta semana'); invalidar(); },
    onError: (err: Error) => toast.error(err.message),
  });

  const guardarExcepcao = useMutation({
    mutationFn: async (args: Omit<Excepcao, 'id'>) => {
      const { error } = await supabase.from('horario_excepcoes').insert(args as never);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Exceção registada'); invalidar(); },
    onError: (err: Error) => toast.error(err.message),
  });

  const apagarExcepcao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('horario_excepcoes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Exceção removida'); invalidar(); },
    onError: (err: Error) => toast.error(err.message),
  });

  return { guardarDia, trocarTurnos, guardarExcepcao, apagarExcepcao };
}
