import { describe, it, expect } from 'vitest';
import { formatQtd } from './escala-receita';

describe('formatQtd', () => {
  it('abaixo de 1 kg mostra gramas', () => expect(formatQtd(0.072, 'kg')).toBe('72 g'));
  it('1 kg ou mais mostra kg', () => expect(formatQtd(2.25, 'kg')).toBe('2,25 kg'));
  it('abaixo de 1 L mostra ml', () => expect(formatQtd(0.088, 'L')).toBe('88 ml'));
  it('1 L ou mais mostra L', () => expect(formatQtd(1.5, 'l')).toBe('1,5 L'));
  it('unidades de contagem não mudam', () => expect(formatQtd(2, 'un')).toBe('2 un'));
});
