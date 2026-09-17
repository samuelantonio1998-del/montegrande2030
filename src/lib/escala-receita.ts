/**
 * Escalar receitas das fichas técnicas.
 * Base de cálculo: porções ou peso total (kg), convertidas entre si pelo peso da porção.
 * Sem qualquer arredondamento: as quantidades escaladas são os valores exactos.
 */

export type BaseCalculo = 'porcoes' | 'kg';

/** Unidades que se PESAM (kg, g, l, ml…) vs. as que se CONTAM (unidade, dente, ovo…) */
export function isPesada(unidade: string | null | undefined): boolean {
  const u = (unidade ?? '').trim().toLowerCase();
  return ['kg', 'g', 'l', 'ml', 'lt', 'litro', 'gr'].includes(u);
}

export type IngredienteEscalado = {
  produto_id: string;
  nome: string;
  unidade: string;
  quantidadeBase: number;
  /** valor exacto resultante da multiplicação */
  quantidade: number;
  custo: number;
};

export function escalarIngredientes(
  ingredientes: { produto_id: string; quantidade: number; unidade: string; nome: string; custo_medio: number }[],
  fator: number
): IngredienteEscalado[] {
  return ingredientes.map(ing => {
    const quantidade = ing.quantidade * fator;
    return {
      produto_id: ing.produto_id,
      nome: ing.nome,
      unidade: ing.unidade,
      quantidadeBase: ing.quantidade,
      quantidade,
      custo: quantidade * (ing.custo_medio ?? 0),
    };
  });
}

/** Formata uma quantidade na unidade do produto, sem perder precisão (3 casas nos kg) */
export function formatQtd(valor: number, unidade: string): string {
  if (!Number.isFinite(valor)) return `0 ${unidade}`;
  const u = (unidade ?? '').trim().toLowerCase();
  const casas = isPesada(u) ? 3 : 2;
  const txt = valor.toFixed(casas).replace(/\.?0+$/, '');
  return `${txt || '0'} ${unidade}`;
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
