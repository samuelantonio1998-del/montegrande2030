/**
 * Deteta o peso/volume de uma embalagem a partir do nome do produto.
 * Ex.: "ARROZ EL VAPORIZADO 5KG" → { fator: 5, unidade: 'kg' }
 *      "FUSILI 500GR"            → { fator: 0.5, unidade: 'kg' }
 *      "AZEITE 5LT"              → { fator: 5, unidade: 'L' }
 * Ignora padrões de pack ("24X33CL"). Com vários valores, usa o maior.
 */
export type Embalagem = { fator: number; unidade: 'kg' | 'L' };

const RE = /(?<![X0-9.,])(\d+(?:[.,]\d+)?)\s*(KGR|KG|GRS|GR|G|LTS|LT|L)(?![A-Z])/g;

export function detectarEmbalagem(nome: string | null | undefined): Embalagem | null {
  if (!nome) return null;
  const up = nome.toUpperCase();
  let best: Embalagem | null = null;
  for (const m of up.matchAll(RE)) {
    const v = parseFloat(m[1].replace(',', '.'));
    if (!(v > 0)) continue;
    const u = m[2];
    const e: Embalagem = ['KG', 'KGR'].includes(u)
      ? { fator: v, unidade: 'kg' }
      : ['G', 'GR', 'GRS'].includes(u)
        ? { fator: v / 1000, unidade: 'kg' }
        : { fator: v, unidade: 'L' };
    if (!best || e.fator > best.fator) best = e;
  }
  return best;
}

export const isUnidadeBase = (u: string | null | undefined) =>
  !!u && ['kg', 'l', 'lt'].includes(u.trim().toLowerCase());

/**
 * Converte uma linha de fatura (em embalagens) para a unidade do produto (kg/L).
 * Só converte quando o produto está em kg/L, a linha não vem já em kg/L,
 * e o nome (produto ou linha) indica o peso da embalagem.
 */
export function converterLinhaParaBase(
  produto: { nome: string; unidade: string },
  linha: { nome?: string; unidade?: string; quantidade: number; custo_unitario: number },
): { quantidade: number; custo_unitario: number; fator: number } | null {
  if (!isUnidadeBase(produto.unidade) || isUnidadeBase(linha.unidade)) return null;
  const emb = detectarEmbalagem(produto.nome) ?? detectarEmbalagem(linha.nome);
  if (!emb || emb.unidade.toLowerCase() !== produto.unidade.trim().toLowerCase().replace('lt', 'l')) return null;
  return {
    quantidade: linha.quantidade * emb.fator,
    custo_unitario: linha.custo_unitario / emb.fator,
    fator: emb.fator,
  };
}
