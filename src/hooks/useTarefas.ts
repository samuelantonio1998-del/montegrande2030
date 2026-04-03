import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type TaskPeriodicity = 'unica' | 'diaria' | 'semanal' | 'mensal' | 'trimestral';

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
  created_at: string;
};

export function useTarefas() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('tarefas')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Erro tarefas:', error);
      return;
    }
    setTarefas(data as unknown as Tarefa[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const ch = supabase
      .channel('tarefas-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tarefas' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetch]);

  const addTarefa = useCallback(async (t: Omit<Tarefa, 'id' | 'created_at' | 'concluida'>) => {
    const { error } = await supabase.from('tarefas').insert({
      titulo: t.titulo,
      descricao: t.descricao,
      categoria: t.categoria,
      responsavel: t.responsavel,
      prioridade: t.prioridade,
      critica: t.critica,
      periodicidade: t.periodicidade,
      concluida: false,
    });
    if (error) toast.error('Erro ao criar tarefa');
  }, []);

  const completeTarefa = useCallback(async (id: string, periodicidade: TaskPeriodicity) => {
    if (periodicidade === 'unica') {
      await supabase.from('tarefas').delete().eq('id', id);
    } else {
      await supabase.from('tarefas').update({ concluida: true }).eq('id', id);
    }
  }, []);

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

  return { tarefas, loading, addTarefa, completeTarefa, deleteTarefa, resetRecorrentes };
}
