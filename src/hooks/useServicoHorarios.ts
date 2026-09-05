import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast-with-sound';
import { useUnidade } from '@/contexts/UnidadeContext';

export type ServicoHorario = {
  id: string;
  unidade_id: string;
  marca_id: string;
  servico: string;
  periodo: string;
  dia_semana: number | null;
  hora_inicio: string;
  hora_fim: string;
  ativo: boolean;
};

/** minutos desde a meia-noite para 'HH:MM[:SS]' */
export function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(':');
  return Number(h) * 60 + Number(m || 0);
}

export function minutosAgora(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** Devolve o período (almoço/jantar/...) activo agora, ou null se estiver fora de serviço. */
export function periodoActivo(horarios: ServicoHorario[], agora: Date = new Date()): ServicoHorario | null {
  const dow = agora.getDay();
  const min = minutosAgora(agora);
  const candidatos = horarios.filter(
    h => h.ativo && (h.dia_semana === null || h.dia_semana === dow),
  );
  return (
    candidatos.find(h => min >= horaParaMinutos(h.hora_inicio) && min <= horaParaMinutos(h.hora_fim)) ?? null
  );
}

export function useServicoHorarios(servico?: string) {
  const { unidadeId, marcaId } = useUnidade();

  return useQuery({
    queryKey: ['servico_horarios', unidadeId, marcaId, servico ?? 'todos'],
    queryFn: async (): Promise<ServicoHorario[]> => {
      let q = supabase.from('servico_horarios').select('*').order('hora_inicio');
      if (unidadeId) q = q.eq('unidade_id', unidadeId);
      if (marcaId) q = q.eq('marca_id', marcaId);
      if (servico) q = q.eq('servico', servico);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ServicoHorario[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Todos os horários do local activo (para o ecrã de Definições). */
export function useTodosHorarios() {
  const { unidadeId } = useUnidade();
  return useQuery({
    queryKey: ['servico_horarios_todos', unidadeId],
    queryFn: async (): Promise<ServicoHorario[]> => {
      let q = supabase.from('servico_horarios').select('*').order('servico').order('hora_inicio');
      if (unidadeId) q = q.eq('unidade_id', unidadeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ServicoHorario[];
    },
  });
}

export function useHorariosMutations() {
  const qc = useQueryClient();
  const { unidadeId } = useUnidade();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['servico_horarios'] });
    qc.invalidateQueries({ queryKey: ['servico_horarios_todos'] });
  };

  const guardar = useMutation({
    mutationFn: async (h: Partial<ServicoHorario> & { marca_id: string; servico: string; periodo: string; hora_inicio: string; hora_fim: string }) => {
      if (h.id) {
        const { error } = await supabase
          .from('servico_horarios')
          .update({
            servico: h.servico,
            periodo: h.periodo,
            dia_semana: h.dia_semana ?? null,
            hora_inicio: h.hora_inicio,
            hora_fim: h.hora_fim,
            ativo: h.ativo ?? true,
          })
          .eq('id', h.id);
        if (error) throw error;
      } else {
        if (!unidadeId) throw new Error('Sem local activo');
        const { error } = await supabase.from('servico_horarios').insert({
          unidade_id: unidadeId,
          marca_id: h.marca_id,
          servico: h.servico,
          periodo: h.periodo,
          dia_semana: h.dia_semana ?? null,
          hora_inicio: h.hora_inicio,
          hora_fim: h.hora_fim,
          ativo: h.ativo ?? true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidate(); toast.success('Horário guardado'); },
    onError: (e: Error) => toast.error(e.message || 'Não foi possível guardar'),
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('servico_horarios').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Horário removido'); },
    onError: (e: Error) => toast.error(e.message || 'Não foi possível remover'),
  });

  return { guardar, remover };
}
