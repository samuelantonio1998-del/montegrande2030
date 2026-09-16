/**
 * Motor de planeamento do dia da cozinha.
 *
 * Ordem de cálculo:
 * 1) Necessidades (kg por ficha) → recebidas como input
 * 2) Expansão em passos (duracao_fixa + duracao_por_kg × kg)
 * 3) Agrupamento por operação + zona + equipamento (fixa conta uma vez)
 * 4) Capacidade (abatedor: 10 tabuleiros × 5 kg = 50 kg por ciclo de 98 min)
 * 5) Agendamento para trás a partir da hora de abertura
 * 6) Quando não cabe: adiar adiantáveis para a véspera e avisar o que falta
 */

export const ABATEDOR_TABULEIROS = 10;
export const ABATEDOR_KG_TABULEIRO = 5;
export const ABATEDOR_CICLO_MIN = 98;
export const ABATEDOR_KG_CICLO = ABATEDOR_TABULEIROS * ABATEDOR_KG_TABULEIRO;

export type TipoPasso = 'ativo' | 'espera';

export type PassoFicha = {
  ordem: number;
  descricao: string;
  tipo_passo: TipoPasso;
  operacao: string | null;
  zona_id: string | null;
  equipamento_id: string | null;
  duracao_fixa_min: number;
  duracao_por_kg_min: number;
  adiantavel: boolean;
};

export type Necessidade = { ficha_id: string; nome: string; kg: number };

export type PessoaTurno = { id: string; nome: string; inicio_min: number; fim_min: number };

export type MomentoDia = 'abertura' | 'durante' | 'fecho';

/** Tarefa fixa (limpeza, manutenção, segurança alimentar). Tem sempre de caber. */
export type TarefaFixa = {
  id: string;
  titulo: string;
  duracao_min: number;
  momento_do_dia: MomentoDia;
  hora_sugerida_min: number | null;
  funcionario_id: string | null;
  medida: boolean;
};

export type TarefaPlano = {
  chave: string;
  ordem: number;
  descricao: string;
  operacao: string | null;
  tipo_passo: TipoPasso;
  zona_id: string | null;
  equipamento_id: string | null;
  adiantavel: boolean;
  kg: number;
  duracao_min: number;
  ciclos: number | null;
  fichas: { ficha_id: string; nome: string; kg: number }[];
  inicio_min: number | null;
  fim_min: number | null;
  funcionario_id: string | null;
  vespera: boolean;
  origem: 'producao' | 'tarefa';
  tarefa_id: string | null;
  notas: string | null;
};

export type OcupacaoPessoa = {
  funcionario_id: string;
  nome: string;
  turno_min: number;
  tarefas_min: number;
  producao_min: number;
  livre_min: number;
};

export type ResultadoPlano = {
  tarefas: TarefaPlano[];
  avisos: string[];
  faltamMinutos: number;
  ocupacao: OcupacaoPessoa[];
  resumo: {
    tarefas: number;
    minutosPessoa: number;
    minutosRelogio: number;
    minutosAbatedor: number;
    minutosTarefas: number;
    tarefasVespera: number;
  };
};

export type PlanoInput = {
  necessidades: Necessidade[];
  passosPorFicha: Record<string, PassoFicha[]>;
  pessoas: PessoaTurno[];
  aberturaMin: number;
  abatedorId: string | null;
  tarefasFixas?: TarefaFixa[];
};


export const minutosParaHora = (m: number | null | undefined) => {
  if (m === null || m === undefined) return '—';
  const t = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.round(t % 60)).padStart(2, '0')}`;
};

export const horaParaMin = (h: string) => {
  const [a, b] = h.split(':');
  return Number(a) * 60 + Number(b || 0);
};

type Intervalo = [number, number];

/** Última hora de fim possível ≤ limite em que o bloco cabe em todos os recursos. */
function encaixeMaisTarde(
  recursos: Intervalo[][],
  limite: number,
  minStart: number,
  dur: number,
): number | null {
  let fim = limite;
  for (let guard = 0; guard < 500; guard++) {
    const ini = fim - dur;
    if (ini < minStart) return null;
    let conflito: Intervalo | undefined;
    for (const busy of recursos) {
      conflito = busy.find(([a, b]) => ini < b && a < fim);
      if (conflito) break;
    }
    if (!conflito) return fim;
    fim = conflito[0];
  }
  return null;
}

/** Primeira hora de início ≥ minStart em que o bloco cabe (sem ultrapassar maxEnd). */
function encaixeMaisCedo(busy: Intervalo[], minStart: number, maxEnd: number, dur: number): number | null {
  let ini = minStart;
  for (let guard = 0; guard < 500; guard++) {
    const fim = ini + dur;
    if (fim > maxEnd) return null;
    const conflito = busy.find(([a, b]) => ini < b && a < fim);
    if (!conflito) return ini;
    ini = conflito[1];
  }
  return null;
}

export function gerarPlano(input: PlanoInput): ResultadoPlano {
  const { necessidades, passosPorFicha, pessoas, aberturaMin, abatedorId } = input;
  const tarefasFixas = input.tarefasFixas ?? [];
  const avisos: string[] = [];


  // 2) Expansão
  type Fonte = { ficha_id: string; nome: string; kg: number; passo: PassoFicha };
  const fontes: Fonte[] = [];
  for (const n of necessidades) {
    const passos = passosPorFicha[n.ficha_id] ?? [];
    if (!passos.length) {
      avisos.push(`A ficha "${n.nome}" ainda não tem passos de produção definidos.`);
      continue;
    }
    for (const passo of passos) fontes.push({ ficha_id: n.ficha_id, nome: n.nome, kg: n.kg, passo });
  }

  // 3) Agrupamento: mesma operação + zona + equipamento (+ tipo)
  const grupos = new Map<string, TarefaPlano>();
  const fixaPorGrupo = new Map<string, number>();
  for (const f of fontes) {
    const p = f.passo;
    const chave = [
      (p.operacao ?? p.descricao.trim().toLowerCase()),
      p.zona_id ?? '-',
      p.equipamento_id ?? '-',
      p.tipo_passo,
    ].join('|');
    const porKg = Number(p.duracao_por_kg_min || 0) * f.kg;
    const fixa = Number(p.duracao_fixa_min || 0);
    const existente = grupos.get(chave);
    if (existente) {
      existente.kg += f.kg;
      existente.duracao_min += porKg;
      existente.ordem = Math.max(existente.ordem, p.ordem);
      existente.adiantavel = existente.adiantavel && p.adiantavel;
      existente.fichas.push({ ficha_id: f.ficha_id, nome: f.nome, kg: f.kg });
      fixaPorGrupo.set(chave, Math.max(fixaPorGrupo.get(chave) ?? 0, fixa));
    } else {
      fixaPorGrupo.set(chave, fixa);
      grupos.set(chave, {
        chave,
        ordem: p.ordem,
        descricao: p.operacao ? capitalizar(p.operacao) : p.descricao,
        operacao: p.operacao,
        tipo_passo: p.tipo_passo,
        zona_id: p.zona_id,
        equipamento_id: p.equipamento_id,
        adiantavel: p.adiantavel,
        kg: f.kg,
        duracao_min: porKg,
        ciclos: null,
        fichas: [{ ficha_id: f.ficha_id, nome: f.nome, kg: f.kg }],
        inicio_min: null,
        fim_min: null,
        funcionario_id: null,
        vespera: false,
      });
    }
  }

  const tarefas: TarefaPlano[] = [];
  for (const g of grupos.values()) {
    // A duração fixa conta UMA SÓ VEZ por tarefa agrupada; só a parte por kg é somada
    let duracao = Math.max(1, Math.round((fixaPorGrupo.get(g.chave) ?? 0) + g.duracao_min));
    let ciclos: number | null = null;
    // 4) Capacidade do abatedor: 10 tabuleiros × 5 kg por ciclo de 98 min
    if (abatedorId && g.equipamento_id === abatedorId) {
      ciclos = Math.max(1, Math.ceil(g.kg / ABATEDOR_KG_CICLO));
      duracao = ciclos * ABATEDOR_CICLO_MIN;
    }
    tarefas.push({ ...g, duracao_min: duracao, ciclos });
  }


  // 5) Agendamento para trás
  const ocupPessoa = new Map<string, Intervalo[]>(pessoas.map(p => [p.id, []]));
  const ocupEquip = new Map<string, Intervalo[]>();
  const limiteFicha = new Map<string, number>();
  const getEquip = (id: string) => {
    if (!ocupEquip.has(id)) ocupEquip.set(id, []);
    return ocupEquip.get(id)!;
  };

  const ordenadas = [...tarefas].sort((a, b) => b.ordem - a.ordem);
  let faltamMinutos = 0;

  for (const t of ordenadas) {
    const limite = Math.min(
      aberturaMin,
      ...t.fichas.map(f => limiteFicha.get(f.ficha_id) ?? aberturaMin),
    );
    const equipBusy = t.equipamento_id ? getEquip(t.equipamento_id) : null;

    let melhor: { fim: number; pessoa: string | null } | null = null;

    if (t.tipo_passo === 'espera') {
      // Espera: ocupa relógio e equipamento, nunca uma pessoa
      const minStart = pessoas.length ? Math.min(...pessoas.map(p => p.inicio_min)) : 0;
      const fim = encaixeMaisTarde(equipBusy ? [equipBusy] : [[]], limite, minStart, t.duracao_min);
      if (fim !== null) melhor = { fim, pessoa: null };
    } else {
      for (const p of pessoas) {
        const busyP = ocupPessoa.get(p.id)!;
        const recursos = equipBusy ? [busyP, equipBusy] : [busyP];
        const fim = encaixeMaisTarde(recursos, Math.min(limite, p.fim_min), p.inicio_min, t.duracao_min);
        if (fim !== null && (!melhor || fim > melhor.fim)) melhor = { fim, pessoa: p.id };
      }
    }

    if (melhor) {
      t.fim_min = melhor.fim;
      t.inicio_min = melhor.fim - t.duracao_min;
      t.funcionario_id = melhor.pessoa;
      if (melhor.pessoa) ocupPessoa.get(melhor.pessoa)!.push([t.inicio_min, t.fim_min]);
      if (equipBusy) equipBusy.push([t.inicio_min, t.fim_min]);
    } else if (t.adiantavel) {
      // 6) Empurrar para a véspera
      t.vespera = true;
      t.inicio_min = null;
      t.fim_min = null;
    } else {
      faltamMinutos += t.duracao_min;
      t.vespera = false;
    }

    for (const f of t.fichas) {
      const atual = limiteFicha.get(f.ficha_id) ?? aberturaMin;
      const novo = t.inicio_min ?? atual;
      limiteFicha.set(f.ficha_id, Math.min(atual, novo));
    }
  }

  if (faltamMinutos > 0) {
    avisos.push(
      `O trabalho não cabe no tempo disponível: faltam cerca de ${Math.round(faltamMinutos)} minutos. ` +
      `Já foram agrupadas tarefas iguais, as esperas foram preenchidas com trabalho activo e tudo o que é adiantável foi passado para a véspera. ` +
      `É preciso reduzir quantidades ou retirar um prato.`,
    );
  }

  const minutosPessoa = tarefas.filter(t => t.tipo_passo === 'ativo').reduce((s, t) => s + t.duracao_min, 0);
  const minutosRelogio = tarefas.reduce((s, t) => s + t.duracao_min, 0);
  const minutosAbatedor = abatedorId
    ? tarefas.filter(t => t.equipamento_id === abatedorId).reduce((s, t) => s + t.duracao_min, 0)
    : 0;

  const ordenadasFinal = [...tarefas].sort((a, b) => {
    if (a.vespera !== b.vespera) return a.vespera ? -1 : 1;
    return (a.inicio_min ?? 9999) - (b.inicio_min ?? 9999);
  });

  return {
    tarefas: ordenadasFinal,
    avisos,
    faltamMinutos: Math.round(faltamMinutos),
    resumo: {
      tarefas: tarefas.length,
      minutosPessoa: Math.round(minutosPessoa),
      minutosRelogio: Math.round(minutosRelogio),
      minutosAbatedor: Math.round(minutosAbatedor),
      tarefasVespera: tarefas.filter(t => t.vespera).length,
    },
  };
}

function capitalizar(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
