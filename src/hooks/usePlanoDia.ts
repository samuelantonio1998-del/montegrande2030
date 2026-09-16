import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast-with-sound';
import { useUnidade } from '@/contexts/UnidadeContext';
import { useAuth } from '@/contexts/AuthContext';
import { inicioSemana, paraISO } from '@/hooks/useHorarios';
import {
  gerarPlano,
  horaParaMin,
  type MomentoDia,
  type Necessidade,
  type PassoFicha,
  type PessoaTurno,
  type ResultadoPlano,
  type TarefaFixa,
  type TipoPasso,
} from '@/lib/plano-engine';


export const PERMANENT_DATE = '9999-12-31';

export type PlanoTarefa = {
  id: string;
  plano_id: string;
  ordem: number;
  descricao: string;
  operacao: string | null;
  tipo_passo: TipoPasso;
  zona_id: string | null;
  equipamento_id: string | null;
  fichas: { ficha_id: string; nome: string; kg: number }[];
  kg: number;
  duracao_min: number;
  inicio_min: number | null;
  fim_min: number | null;
  funcionario_id: string | null;
  vespera: boolean;
  adiantavel: boolean;
  concluida: boolean;
  notas: string | null;
  origem: 'producao' | 'tarefa';
  tarefa_id: string | null;
  iniciado_em: string | null;
};


export type Plano = {
  id: string;
  data: string;
  unidade_id: string | null;
  abertura: string | null;
  avisos: string[];
  resumo: Record<string, number>;
  gerado_por: string | null;
  updated_at: string;
};

export type DadosPlano = {
  necessidades: Necessidade[];
  passosPorFicha: Record<string, PassoFicha[]>;
  pessoas: PessoaTurno[];
  aberturaMin: number | null;
  abatedorId: string | null;
  zonas: { id: string; nome: string }[];
  equipamentos: { id: string; nome: string }[];
  funcionarios: { id: string; nome: string }[];
  tarefasFixas: TarefaFixa[];
  emFalta: string[];

};

/** Recolhe tudo o que o motor precisa e diz claramente o que falta. */
export function useDadosPlano(dataISO: string) {
  const { unidadeId } = useUnidade();

  return useQuery({
    queryKey: ['plano_dados', unidadeId, dataISO],
    enabled: !!dataISO,
    queryFn: async (): Promise<DadosPlano> => {
      const emFalta: string[] = [];
      const dia = new Date(`${dataISO}T00:00:00`);
      const dow = dia.getDay();
      const semana = paraISO(inicioSemana(dia));

      // 1) Necessidades — ementa do dia de todas as marcas activas do local
      let qEmenta = supabase
        .from('ementa_diaria')
        .select('quantidade_prevista, oculto, buffet_item:buffet_items(id, nome, ficha_tecnica_id)')
        .in('data', [dataISO, PERMANENT_DATE]);
      if (unidadeId) qEmenta = qEmenta.eq('unidade_id', unidadeId);

      const [ementaRes, zonasRes, equipRes, horariosRes, excRes, escalaRes, funcRes, servicoRes] =
        await Promise.all([
          qEmenta,
          supabase.from('zonas_producao').select('id, nome').eq('ativo', true),
          supabase.from('equipamentos').select('id, nome').eq('ativo', true),
          supabase.from('horarios_trabalho').select('*').eq('ativo', true).eq('dia_semana', dow),
          supabase.from('horario_excepcoes').select('*').eq('data', dataISO),
          supabase.from('escala_alternancia').select('*').eq('semana_inicio', semana),
          supabase.from('funcionarios').select('id, nome, unidade_id, role').eq('ativo', true),
          supabase.from('servico_horarios').select('*').eq('ativo', true),
          supabase.from('tarefas').select('*').eq('concluida', false).in('departamento', ['cozinha', 'todos']),
          supabase.from('tarefa_execucoes').select('tarefa_id, duracao_min').not('concluido_em', 'is', null),
        ]);


      if (ementaRes.error) throw ementaRes.error;

      type LinhaEmenta = {
        quantidade_prevista: number | null;
        oculto: boolean | null;
        buffet_item: { id: string; nome: string; ficha_tecnica_id: string | null } | null;
      };
      const linhas = ((ementaRes.data ?? []) as unknown as LinhaEmenta[]).filter(l => !l.oculto);

      const acumulado = new Map<string, Necessidade>();
      let semFicha = 0;
      let semQuantidade = 0;
      for (const l of linhas) {
        const item = l.buffet_item;
        if (!item?.ficha_tecnica_id) { semFicha++; continue; }
        const kg = Number(l.quantidade_prevista || 0);
        if (kg <= 0) { semQuantidade++; continue; }
        const atual = acumulado.get(item.ficha_tecnica_id);
        if (atual) atual.kg += kg;
        else acumulado.set(item.ficha_tecnica_id, { ficha_id: item.ficha_tecnica_id, nome: item.nome, kg });
      }
      const necessidades = [...acumulado.values()];

      if (!linhas.length) emFalta.push('A ementa deste dia ainda não está definida.');
      if (semQuantidade) emFalta.push(`${semQuantidade} prato(s) da ementa estão sem quantidade prevista.`);
      if (semFicha) emFalta.push(`${semFicha} prato(s) da ementa não estão ligados a uma ficha técnica.`);

      // 2) Passos das fichas necessárias
      const passosPorFicha: Record<string, PassoFicha[]> = {};
      if (necessidades.length) {
        const { data: passos, error } = await supabase
          .from('ficha_passos')
          .select('*')
          .in('ficha_id', necessidades.map(n => n.ficha_id))
          .order('ordem');
        if (error) throw error;
        for (const p of (passos ?? []) as Record<string, unknown>[]) {
          const fid = p.ficha_id as string;
          (passosPorFicha[fid] ||= []).push({
            ordem: Number(p.ordem),
            descricao: String(p.descricao),
            tipo_passo: (p.tipo_passo as TipoPasso) ?? 'ativo',
            operacao: (p.operacao as string | null) ?? null,
            zona_id: (p.zona_id as string | null) ?? null,
            equipamento_id: (p.equipamento_id as string | null) ?? null,
            duracao_fixa_min: Number(p.duracao_fixa_min || 0),
            duracao_por_kg_min: Number(p.duracao_por_kg_min || 0),
            adiantavel: Boolean(p.adiantavel),
          });
        }
      }

      // 3) Hora de abertura do serviço
      const horariosServico = (servicoRes.data ?? []).filter(
        (h: Record<string, unknown>) =>
          (!unidadeId || h.unidade_id === unidadeId) &&
          (h.dia_semana === null || h.dia_semana === dow),
      ) as Record<string, unknown>[];
      const aberturas = horariosServico.map(h => horaParaMin(String(h.hora_inicio)));
      const aberturaMin = aberturas.length ? Math.min(...aberturas) : null;
      if (aberturaMin === null) emFalta.push('Não há horário de serviço definido para este local e dia.');

      // 4) Pessoas ao trabalho nesse dia
      const funcionarios = ((funcRes.data ?? []) as Record<string, unknown>[])
        .filter(f => !unidadeId || f.unidade_id === unidadeId)
        .map(f => ({ id: f.id as string, nome: f.nome as string }));
      const nomeDe = (id: string) => funcionarios.find(f => f.id === id)?.nome ?? 'Funcionário';

      const escala = new Map<string, string>(
        ((escalaRes.data ?? []) as Record<string, unknown>[]).map(e => [e.funcionario_id as string, e.turno as string]),
      );
      const excepcoes = (excRes.data ?? []) as Record<string, unknown>[];

      const pessoas: PessoaTurno[] = [];
      const porPessoa = new Map<string, Record<string, unknown>[]>();
      for (const h of (horariosRes.data ?? []) as Record<string, unknown>[]) {
        if (unidadeId && h.unidade_id && h.unidade_id !== unidadeId) continue;
        (porPessoa.get(h.funcionario_id as string) ?? porPessoa.set(h.funcionario_id as string, []).get(h.funcionario_id as string)!)
          .push(h);
      }
      for (const [fid, linhasH] of porPessoa) {
        const exc = excepcoes.find(e => e.funcionario_id === fid);
        if (exc?.ausente) continue;
        let escolhida = linhasH[0];
        if (linhasH.length > 1) {
          const turno = escala.get(fid);
          escolhida = linhasH.find(l => l.turno === turno) ?? linhasH[0];
        }
        const inicio = (exc?.hora_inicio as string | null) ?? (escolhida.hora_inicio as string | null);
        const fim = (exc?.hora_fim as string | null) ?? (escolhida.hora_fim as string | null);
        if (!inicio || !fim) continue;
        pessoas.push({ id: fid, nome: nomeDe(fid), inicio_min: horaParaMin(inicio), fim_min: horaParaMin(fim) });
      }
      if (!pessoas.length) emFalta.push('Não há ninguém com horário de trabalho neste dia.');

      const equipamentos = ((equipRes.data ?? []) as Record<string, unknown>[]).map(e => ({
        id: e.id as string,
        nome: e.nome as string,
      }));
      const abatedorId = equipamentos.find(e => e.nome.toLowerCase().includes('abatedor'))?.id ?? null;

      return {
        necessidades,
        passosPorFicha,
        pessoas,
        aberturaMin,
        abatedorId,
        zonas: ((zonasRes.data ?? []) as Record<string, unknown>[]).map(z => ({ id: z.id as string, nome: z.nome as string })),
        equipamentos,
        funcionarios,
        emFalta,
      };
    },
  });
}

export function calcular(dados: DadosPlano): ResultadoPlano | null {
  if (!dados.necessidades.length || dados.aberturaMin === null || !dados.pessoas.length) return null;
  return gerarPlano({
    necessidades: dados.necessidades,
    passosPorFicha: dados.passosPorFicha,
    pessoas: dados.pessoas,
    aberturaMin: dados.aberturaMin,
    abatedorId: dados.abatedorId,
  });
}

/** Plano já guardado para o dia. */
export function usePlanoGuardado(dataISO: string) {
  const { unidadeId } = useUnidade();
  return useQuery({
    queryKey: ['plano_dia', unidadeId, dataISO],
    queryFn: async (): Promise<{ plano: Plano | null; tarefas: PlanoTarefa[] }> => {
      let q = supabase.from('plano_dia').select('*').eq('data', dataISO);
      if (unidadeId) q = q.eq('unidade_id', unidadeId);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      if (!data) return { plano: null, tarefas: [] };
      const plano = {
        ...data,
        avisos: (data.avisos as unknown as string[]) ?? [],
        resumo: (data.resumo as unknown as Record<string, number>) ?? {},
      } as unknown as Plano;
      const { data: tarefas, error: err2 } = await supabase
        .from('plano_tarefas')
        .select('*')
        .eq('plano_id', plano.id)
        .order('vespera', { ascending: false })
        .order('inicio_min', { nullsFirst: false });
      if (err2) throw err2;
      return {
        plano,
        tarefas: ((tarefas ?? []) as unknown as PlanoTarefa[]).map(t => ({
          ...t,
          fichas: (t.fichas as unknown as PlanoTarefa['fichas']) ?? [],
        })),
      };
    },
  });
}

export function usePlanoMutations(dataISO: string) {
  const qc = useQueryClient();
  const { unidadeId } = useUnidade();
  const { user } = useAuth();
  const invalidar = () => qc.invalidateQueries({ queryKey: ['plano_dia'] });

  const guardar = useMutation({
    mutationFn: async (args: { resultado: ResultadoPlano; aberturaMin: number }) => {
      let del = supabase.from('plano_dia').delete().eq('data', dataISO);
      if (unidadeId) del = del.eq('unidade_id', unidadeId);
      const { error: delErr } = await del;
      if (delErr) throw delErr;

      const abertura = `${String(Math.floor(args.aberturaMin / 60)).padStart(2, '0')}:${String(args.aberturaMin % 60).padStart(2, '0')}`;
      const { data: plano, error } = await supabase
        .from('plano_dia')
        .insert({
          unidade_id: unidadeId,
          data: dataISO,
          abertura,
          avisos: args.resultado.avisos,
          resumo: args.resultado.resumo,
          gerado_por: user?.name ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;

      const linhas = args.resultado.tarefas.map((t, i) => ({
        plano_id: plano.id,
        ordem: i,
        descricao: t.descricao,
        operacao: t.operacao,
        tipo_passo: t.tipo_passo,
        zona_id: t.zona_id,
        equipamento_id: t.equipamento_id,
        fichas: t.fichas,
        kg: Number(t.kg.toFixed(2)),
        duracao_min: t.duracao_min,
        inicio_min: t.inicio_min,
        fim_min: t.fim_min,
        funcionario_id: t.funcionario_id,
        vespera: t.vespera,
        adiantavel: t.adiantavel,
        notas: t.ciclos ? `${t.ciclos} ciclo(s) de abatedor` : null,
      }));
      if (linhas.length) {
        const { error: e2 } = await supabase.from('plano_tarefas').insert(linhas);
        if (e2) throw e2;
      }
    },
    onSuccess: () => { toast.success('Plano do dia guardado'); invalidar(); },
    onError: (e: Error) => toast.error(e.message || 'Não foi possível guardar o plano'),
  });

  const reatribuir = useMutation({
    mutationFn: async (args: { id: string; funcionario_id: string | null }) => {
      const { error } = await supabase
        .from('plano_tarefas')
        .update({ funcionario_id: args.funcionario_id })
        .eq('id', args.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Tarefa reatribuída'); invalidar(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const concluir = useMutation({
    mutationFn: async (args: { id: string; concluida: boolean }) => {
      const { error } = await supabase
        .from('plano_tarefas')
        .update({
          concluida: args.concluida,
          concluida_em: args.concluida ? new Date().toISOString() : null,
          concluida_por: args.concluida ? (user?.name ?? null) : null,
        })
        .eq('id', args.id);
      if (error) throw error;
    },
    onSuccess: () => invalidar(),
    onError: (e: Error) => toast.error(e.message),
  });

  const apagar = useMutation({
    mutationFn: async (planoId: string) => {
      const { error } = await supabase.from('plano_dia').delete().eq('id', planoId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Plano removido'); invalidar(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { guardar, reatribuir, concluir, apagar };
}
