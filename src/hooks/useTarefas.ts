import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast-with-sound';
import { useUnidade } from '@/contexts/UnidadeContext';

export type TaskPeriodicity = 'unica' | 'diaria' | 'semanal' | 'mensal' | 'trimestral';

export type TarefaDepartamento = 'sala' | 'cozinha' | 'todos';

export type MomentoDoDia = 'abertura' | 'durante' | 'fecho';

export type Tarefa = {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: 'abertura' | 'fecho' | 'limpeza' | 'manutencao' | 'outro';
  responsavel: string;
  prioridade: 'alta' | 'media' | 'baixa';
  critica: boolean;
  concluida: boolean;
  periodicidade: TaskPeriodicity;
  departamento: TarefaDepartamento;
  unidade_id: string | null;
  created_at: string;
  duracao_estimada_min: number;
  momento_do_dia: MomentoDoDia;
  hora_sugerida: string | null;
};

/** Duração em uso: mediana real a partir de 3 execuções, senão a estimativa. */
export type DuracaoTarefa = { minutos: number; medida: boolean; execucoes: number };


export function useTarefas() {
  const { unidadeId, isConsolidado } = useUnidade();
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [duracoes, setDuracoes] = useState<Record<string, DuracaoTarefa>>({});
  const [emCurso, setEmCurso] = useState<Record<string, { id: string; iniciado_em: string }>>({});
  const [loading, setLoading] = useState(true);

  const fetchExecucoes = useCallback(async (lista: Tarefa[]) => {
    const { data } = await supabase
      .from('tarefa_execucoes')
      .select('id, tarefa_id, iniciado_em, concluido_em, duracao_min')
      .order('iniciado_em', { ascending: true });
    const linhas = (data ?? []) as {
      id: string; tarefa_id: string; iniciado_em: string; concluido_em: string | null; duracao_min: number | null;
    }[];

    const porTarefa: Record<string, number[]> = {};
    const abertas: Record<string, { id: string; iniciado_em: string }> = {};
    for (const l of linhas) {
      if (l.concluido_em && l.duracao_min !== null) (porTarefa[l.tarefa_id] ||= []).push(Number(l.duracao_min));
      else if (!l.concluido_em) abertas[l.tarefa_id] = { id: l.id, iniciado_em: l.iniciado_em };
    }

    const calc: Record<string, DuracaoTarefa> = {};
    for (const t of lista) {
      const vals = (porTarefa[t.id] ?? []).slice(-10).sort((a, b) => a - b);
      if (vals.length >= 3) {
        const mediana = vals.length % 2
          ? vals[(vals.length - 1) / 2]
          : (vals[vals.length / 2 - 1] + vals[vals.length / 2]) / 2;
        calc[t.id] = { minutos: Math.max(1, Math.round(mediana)), medida: true, execucoes: vals.length };
      } else {
        calc[t.id] = { minutos: t.duracao_estimada_min ?? 15, medida: false, execucoes: vals.length };
      }
    }
    setDuracoes(calc);
    setEmCurso(abertas);
  }, []);

  const fetch = useCallback(async () => {
    let query = supabase
      .from('tarefas')
      .select('*')
      .order('created_at', { ascending: false });
    if (!isConsolidado && unidadeId) query = query.eq('unidade_id', unidadeId);
    const { data, error } = await query;
    if (error) {
      console.error('Erro tarefas:', error);
      return;
    }
    const lista = data as unknown as Tarefa[];
    setTarefas(lista);
    setLoading(false);
    await fetchExecucoes(lista);
  }, [unidadeId, isConsolidado, fetchExecucoes]);

  useEffect(() => {
    fetch();
    const ch = supabase
      .channel('tarefas-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tarefas' }, () => fetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tarefa_execucoes' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetch]);

  const addTarefa = useCallback(async (t: Omit<Tarefa, 'id' | 'created_at' | 'concluida' | 'unidade_id'>) => {
    const { error } = await supabase.from('tarefas').insert({
      titulo: t.titulo,
      descricao: t.descricao,
      categoria: t.categoria,
      responsavel: t.responsavel,
      prioridade: t.prioridade,
      critica: t.critica,
      periodicidade: t.periodicidade,
      departamento: t.departamento,
      duracao_estimada_min: t.duracao_estimada_min,
      momento_do_dia: t.momento_do_dia,
      hora_sugerida: t.hora_sugerida || null,
      concluida: false,
      unidade_id: unidadeId,
    });
    if (error) toast.error('Erro ao criar tarefa');
  }, [unidadeId]);

  const updateTarefa = useCallback(async (id: string, campos: Partial<Tarefa>) => {
    const { error } = await supabase.from('tarefas').update(campos).eq('id', id);
    if (error) toast.error('Erro ao actualizar tarefa');
    else fetch();
  }, [fetch]);

  /** Arranque da tarefa: é assim que a duração real fica medida, sem cronómetro. */
  const iniciarTarefa = useCallback(async (id: string) => {
    if (emCurso[id]) return;
    const { error } = await supabase.from('tarefa_execucoes').insert({
      tarefa_id: id,
      iniciado_em: new Date().toISOString(),
    });
    if (error) toast.error('Não foi possível iniciar a tarefa');
    else fetch();
  }, [emCurso, fetch]);

  const completeTarefa = useCallback(async (id: string, periodicidade: TaskPeriodicity) => {
    const aberta = emCurso[id];
    if (aberta) {
      await supabase
        .from('tarefa_execucoes')
        .update({ concluido_em: new Date().toISOString() })
        .eq('id', aberta.id);
    }
    if (periodicidade === 'unica') {
      await supabase.from('tarefas').delete().eq('id', id);
    } else {
      await supabase.from('tarefas').update({ concluida: true }).eq('id', id);
    }
    fetch();
  }, [emCurso, fetch]);

  const deleteTarefa = useCallback(async (id: string) => {
    await supabase.from('tarefas').delete().eq('id', id);
  }, []);

  const resetRecorrentes = useCallback(async () => {
    const { error } = await supabase
      .from('tarefas')
      .update({ concluida: false })
      .neq('periodicidade', 'unica');
    if (error) toast.error('Erro ao reiniciar tarefas');
  }, []);

  return {
    tarefas,
    duracoes,
    emCurso,
    loading,
    addTarefa,
    updateTarefa,
    iniciarTarefa,
    completeTarefa,
    deleteTarefa,
    resetRecorrentes,
  };
}

