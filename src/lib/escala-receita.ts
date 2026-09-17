/**
 * Escalar receitas das fichas técnicas.
 * Base de cálculo: porções ou peso total (kg), convertidas entre si pelo peso da porção.
 */

export type BaseCalculo = 'porcoes' | 'kg';

/** Unidades que se PESAM (arredondamento prático) vs. as que se CONTAM (arredondar para cima) */
export function isPesada(unidade: string | null | undefined): boolean {
  const u = (unidade ?? '').trim().toLowerCase();
  return ['kg', 'g', 'l', 'ml', 'lt', 'litro', 'gr'].includes(u);
}

/**
 * Arredondamento prático para ingredientes pesados (valor em kg):
 * - abaixo de 1 kg → múltiplos de 10 g
 * - a partir de 1 kg → múltiplos de 50 g
 */
export function arredondarPesado(kg: number): number {
  if (!Number.isFinite(kg) || kg <= 0) return 0;
  const passo = kg < 1 ? 0.01 : 0.05;
  return Math.round(kg / passo) * passo;
}

export type IngredienteEscalado = {
  produto_id: string;
  nome: string;
  unidade: string;
  quantidadeBase: number;
  /** valor exacto (sem arredondar) */
  exato: number;
  /** valor prático a usar na bancada */
  arredondado: number;
  /** true quando o arredondado difere do exacto */
  foiArredondado: boolean;
  /** true quando é contado à unidade e foi arredondado para cima */
  arredondadoParaCima: boolean;
  custo: number;
};

export function escalarIngredientes(
  ingredientes: { produto_id: string; quantidade: number; unidade: string; nome: string; custo_medio: number }[],
  fator: number
): IngredienteEscalado[] {
  return ingredientes.map(ing => {
    const exato = ing.quantidade * fator;
    const pesada = isPesada(ing.unidade);
    const arredondado = pesada ? arredondarPesado(exato) : Math.ceil(exato - 1e-9);
    const diff = Math.abs(arredondado - exato) > (pesada ? 0.0005 : 1e-6);
    return {
      produto_id: ing.produto_id,
      nome: ing.nome,
      unidade: ing.unidade,
      quantidadeBase: ing.quantidade,
      exato,
      arredondado,
      foiArredondado: diff,
      arredondadoParaCima: !pesada && diff,
      custo: arredondado * (ing.custo_medio ?? 0),
    };
  });
}

/** Formata uma quantidade na unidade do produto (kg com 3 casas, unidades inteiras) */
export function formatQtd(valor: number, unidade: string): string {
  if (isPesada(unidade)) {
    const u = (unidade ?? '').trim().toLowerCase();
    if (u === 'kg' && valor < 1) return `${Math.round(valor * 1000)} g`;
    return `${valor.toFixed(u === 'kg' ? 3 : 2).replace(/0+$/, '').replace(/[.,]$/, '')} ${unidade}`;
  }
  return `${valor % 1 === 0 ? valor : valor.toFixed(2)} ${unidade}`;
}

/** Converte a quantidade introduzida para o factor de multiplicação da receita base */
export function calcularFator(
  base: BaseCalculo,
  quantidade: number,
  porcoesBase: number,
  pesoPorcaoG: number | null
): number | null {
  if (!Number.isFinite(quantidade) || quantidade <= 0) return null;
  if (base === 'porcoes') {
    if (!porcoesBase || porcoesBase <= 0) return null;
    return quantidade / porcoesBase;
  }
  // base em kg
  if (!pesoPorcaoG || pesoPorcaoG <= 0 || !porcoesBase || porcoesBase <= 0) return null;
  const pesoBaseKg = (porcoesBase * pesoPorcaoG) / 1000;
  if (pesoBaseKg <= 0) return null;
  return quantidade / pesoBaseKg;
}
