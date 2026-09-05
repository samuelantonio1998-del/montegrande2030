import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnidade } from '@/contexts/UnidadeContext';
import { useProductionIntelligence } from '@/hooks/useProductionIntelligence';
import { useEmentaDiaria } from '@/hooks/useEmentaDiaria';
import {
  useServicoHorarios,
  periodoActivo,
  horaParaMinutos,
  minutosAgora,
  type ServicoHorario,
} from '@/hooks/useServicoHorarios';
import { recipientCapacity, type RecipientSize } from '@/lib/buffet-data';
import { useRegistosProducao, type RegistoProducao } from '@/hooks/useRegistosProducao';

export type TipoRecomendacao = 'tabuleiro_inteiro' | 'meio_tabuleiro' | 'tabuleiro_pequeno' | 'nao_repor';

export type DecisaoReposicao = {
  loading: boolean;
  /** null quando não foi possível identificar o registo */
  registo: RegistoProducao | null;
  recomendacao: TipoRecomendacao;
  titulo: string;
  /** kg sugeridos para a reposição (já arredondados) */
  quantidadeSugeridaKg: number;
  recipienteSugerido: RecipientSize;
  /** frases simples que explicam a decisão */
  razoes: string[];
  minutosRestantes: number | null;
  periodo: string | null;
  pessoasPorServir: number;
  /** kg/hora; null quando não há histórico suficiente */
  ritmoKgHora: number | null;
  temHistorico: boolean;
  estimativaKg: number;
};

const CANAL_SERVICO: Record<string, string> = {
  buffet: 'buffet',
  take_away: 'takeaway',
  delivery: 'delivery',
};

function arredonda(n: number) {
  return Math.round(n * 10) / 10;
}

function dentroDoPeriodo(iso: string, periodo: ServicoHorario | null) {
  if (!periodo) return true;
  const d = new Date(iso);
  const min = d.getHours() * 60 + d.getMinutes();
  return min >= horaParaMinutos(periodo.hora_inicio) - 60 && min <= horaParaMinutos(periodo.hora_fim) + 60;
}

/** Histórico de recolhas do mesmo prato, para calcular o ritmo de consumo. */
function useHistoricoPrato(dishName: string | undefined) {
  const { unidadeId, marcaId } = useUnidade();
  return useQuery({
    queryKey: ['historico_ritmo', dishName, unidadeId, marcaId],
    enabled: !!dishName,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      let q = supabase
        .from('registos_producao')
        .select('peso_kg, sobra_kg, enviado_at, recolhido_at')
        .eq('dish_name', dishName!)
        .not('recolhido_at', 'is', null)
        .order('enviado_at', { ascending: false })
        .limit(30);
      if (unidadeId) q = q.eq('unidade_id', unidadeId);
      if (marcaId) q = q.eq('marca_id', marcaId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Média de pax do mesmo dia da semana, por período. */
function usePrevisaoPax() {
  return useQuery({
    queryKey: ['previsao_pax_dia_semana'],
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendas_historico')
        .select('data, almoco, jantar')
        .order('data', { ascending: false })
        .limit(120);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Responde a "repor ou não" quando um tabuleiro é recolhido.
 * Cruza tempo restante de serviço, pessoas por servir e ritmo de consumo do prato.
 */
export function useDecisaoReposicao(registoId: string | null): DecisaoReposicao {
  const { registos } = useRegistosProducao();
  const registo = registos.find(r => r.id === registoId) ?? null;
  const canal = registo?.canal || 'buffet';
  const servico = CANAL_SERVICO[canal] ?? 'buffet';

  const { data: horarios = [], isLoading: loadingHorarios } = useServicoHorarios(servico);
  const { data: historico = [], isLoading: loadingHist } = useHistoricoPrato(registo?.dish_name);
  const { data: vendas = [] } = usePrevisaoPax();
  const { currentPax } = useProductionIntelligence();
  const { data: ementaItems = [] } = useEmentaDiaria(new Date());

  const agora = new Date();
  const periodo = periodoActivo(horarios as ServicoHorario[], agora);
  const minutosRestantes = periodo ? Math.max(0, horaParaMinutos(periodo.hora_fim) - minutosAgora(agora)) : null;
  const duracaoPeriodo = periodo ? Math.max(1, horaParaMinutos(periodo.hora_fim) - horaParaMinutos(periodo.hora_inicio)) : null;

  // --- ritmo de consumo (kg/hora) ---
  const amostras = (historico as { peso_kg: number; sobra_kg: number | null; enviado_at: string; recolhido_at: string | null }[])
    .filter(h => h.recolhido_at && dentroDoPeriodo(h.enviado_at, periodo))
    .map(h => {
      const horas = (new Date(h.recolhido_at!).getTime() - new Date(h.enviado_at).getTime()) / 3_600_000;
      const consumido = h.peso_kg - (h.sobra_kg ?? 0);
      if (horas < 0.1 || consumido <= 0) return null;
      return consumido / horas;
    })
    .filter((v): v is number => v !== null)
    .slice(0, 5);

  const temHistorico = amostras.length >= 2;
  const ritmoKgHora = temHistorico ? arredonda(amostras.reduce((a, b) => a + b, 0) / amostras.length) : null;

  // --- pessoas por servir ---
  const dow = agora.getDay();
  const paxSemelhantes = (vendas as { data: string; almoco: number; jantar: number }[])
    .filter(v => new Date(`${v.data}T12:00:00`).getDay() === dow)
    .slice(0, 8);
  const isJantar = (periodo?.periodo ?? '').toLowerCase().startsWith('jant');
  const mediaPaxPeriodo = paxSemelhantes.length
    ? paxSemelhantes.reduce((s, v) => s + (isJantar ? v.jantar : v.almoco), 0) / paxSemelhantes.length
    : 0;
  const fracaoRestante = minutosRestantes !== null && duracaoPeriodo ? minutosRestantes / duracaoPeriodo : 0;
  const previsaoRestante = Math.round(mediaPaxPeriodo * fracaoRestante);
  const pessoasPorServir = Math.max(currentPax, previsaoRestante);

  // --- estimativa do que ainda se vai consumir ---
  const horasRestantes = (minutosRestantes ?? 0) / 60;
  const ementa = ementaItems.find(
    e => e.buffet_item?.id === registo?.buffet_item_id || e.buffet_item?.nome === registo?.dish_name,
  );
  const previstaEmenta = ementa?.quantidade_prevista ?? null;
  const estimativaKg = temHistorico
    ? arredonda((ritmoKgHora ?? 0) * horasRestantes)
    : arredonda((previstaEmenta ?? 0) * fracaoRestante);

  const capacidade = registo ? recipientCapacity[registo.recipiente as RecipientSize]?.capacityKg ?? registo.peso_kg : 5;

  // --- recomendação ---
  let recomendacao: TipoRecomendacao = 'nao_repor';
  let recipienteSugerido: RecipientSize = 'couvete_pequena';
  let quantidadeSugeridaKg = 0;

  if (periodo && minutosRestantes !== null) {
    if (minutosRestantes <= 20 || estimativaKg < 0.5) {
      recomendacao = 'nao_repor';
      quantidadeSugeridaKg = 0;
    } else if (estimativaKg >= capacidade * 0.8) {
      recomendacao = 'tabuleiro_inteiro';
      recipienteSugerido = (registo?.recipiente as RecipientSize) ?? 'tabuleiro_grande';
      quantidadeSugeridaKg = arredonda(capacidade);
    } else if (estimativaKg >= capacidade * 0.35) {
      recomendacao = 'meio_tabuleiro';
      recipienteSugerido = 'couvete_grande';
      quantidadeSugeridaKg = arredonda(Math.max(0.5, estimativaKg));
    } else {
      recomendacao = 'tabuleiro_pequeno';
      recipienteSugerido = 'couvete_pequena';
      quantidadeSugeridaKg = arredonda(Math.max(0.5, estimativaKg));
    }
  }

  const titulo =
    recomendacao === 'tabuleiro_inteiro'
      ? 'Repor tabuleiro inteiro'
      : recomendacao === 'meio_tabuleiro'
      ? 'Repor meio tabuleiro'
      : recomendacao === 'tabuleiro_pequeno'
      ? 'Repor só um tabuleiro pequeno'
      : periodo
      ? 'Não repor — falta pouco tempo'
      : 'Não repor — serviço fechado';

  const razoes: string[] = [];
  if (!periodo) {
    razoes.push('Neste momento não há serviço aberto para esta marca.');
  } else {
    razoes.push(`Faltam ${minutosRestantes} minutos para fechar o ${periodo.periodo}.`);
    razoes.push(`Cerca de ${pessoasPorServir} pessoa${pessoasPorServir === 1 ? '' : 's'} por servir.`);
    if (temHistorico) {
      razoes.push(`Ritmo deste prato: ${ritmoKgHora?.toFixed(1).replace('.', ',')} kg por hora.`);
      razoes.push(`Estimativa até ao fecho: ${estimativaKg.toFixed(1).replace('.', ',')} kg.`);
    } else if (previstaEmenta) {
      razoes.push('Ainda não há registos suficientes deste prato para calcular o ritmo de consumo.');
      razoes.push(
        `Sugestão baseada na quantidade prevista da ementa (${previstaEmenta.toFixed(1).replace('.', ',')} kg): cerca de ${estimativaKg
          .toFixed(1)
          .replace('.', ',')} kg até ao fecho.`,
      );
    } else {
      razoes.push('Ainda não há registos suficientes deste prato nem quantidade prevista na ementa — decida com base no que vê no buffet.');
    }
  }

  return {
    loading: loadingHorarios || loadingHist,
    registo,
    recomendacao,
    titulo,
    quantidadeSugeridaKg,
    recipienteSugerido,
    razoes,
    minutosRestantes,
    periodo: periodo?.periodo ?? null,
    pessoasPorServir,
    ritmoKgHora,
    temHistorico,
    estimativaKg,
  };
}
