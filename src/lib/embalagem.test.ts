import { describe, it, expect } from 'vitest';
import { detectarEmbalagem, converterLinhaParaBase } from './embalagem';

describe('detectarEmbalagem', () => {
  it('saco de 5KG → 5 kg', () => expect(detectarEmbalagem('ARROZ EL VAPORIZADO 5KG')).toEqual({ fator: 5, unidade: 'kg' }));
  it('500GR → 0,5 kg', () => expect(detectarEmbalagem('FUSILI TRICOLOR 500GR')).toEqual({ fator: 0.5, unidade: 'kg' }));
  it('5LT → 5 L', () => expect(detectarEmbalagem('AZEITE 5LT')).toEqual({ fator: 5, unidade: 'L' }));
  it('decimal com vírgula', () => expect(detectarEmbalagem('BROCOLOS SOLTOS 2,250KG')?.fator).toBe(2.25));
  it('ignora packs 24X33CL', () => expect(detectarEmbalagem('COCA COLA 24X33CL')).toBeNull());
});

describe('converterLinhaParaBase', () => {
  it('1 saco a 6,40€ → 5 kg a 1,28€/kg', () => {
    const r = converterLinhaParaBase({ nome: 'ARROZ EL VAPORIZADO 5KG', unidade: 'kg' }, { unidade: 'un', quantidade: 1, custo_unitario: 6.4 });
    expect(r?.quantidade).toBe(5);
    expect(r?.custo_unitario).toBeCloseTo(1.28, 4);
  });
  it('não converte se a fatura já vem em kg', () => {
    expect(converterLinhaParaBase({ nome: 'ARROZ 5KG', unidade: 'kg' }, { unidade: 'kg', quantidade: 5, custo_unitario: 1.28 })).toBeNull();
  });
});
