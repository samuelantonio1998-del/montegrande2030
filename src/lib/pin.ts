// Regras de PIN partilhadas pela interface (o servidor valida o mesmo).
export const PIN_LENGTH = 4;

export const pinFormatoValido = (pin: string) => new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);

const OBVIOS = new Set(['1234', '4321', '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1122', '2211', '1212', '2121', '1010', '0101', '2580', '0852', '1379']);

/** Devolve a razão de recusa, ou null se o PIN for aceitável. */
export function pinFraco(pin: string): string | null {
  if (!pinFormatoValido(pin)) return `O PIN tem de ter exatamente ${PIN_LENGTH} dígitos.`;
  if (OBVIOS.has(pin)) return 'Este PIN é demasiado óbvio. Escolha outra combinação.';

  const d = pin.split('').map(Number);
  if (d.every(n => n === d[0])) return 'O PIN não pode ter todos os dígitos iguais.';

  const passo = d[1] - d[0];
  if ((passo === 1 || passo === -1) && d.every((n, i) => i === 0 || n - d[i - 1] === passo)) {
    return 'O PIN não pode ser uma sequência simples de dígitos.';
  }
  // Padrões repetidos: aabb ou abab
  if (d[0] === d[1] && d[2] === d[3]) return 'O PIN não pode ser um padrão repetido.';
  if (d[0] === d[2] && d[1] === d[3]) return 'O PIN não pode ser um padrão repetido.';

  return null;
}

/** Gera um PIN de 4 dígitos que passa nas regras acima. */
export function gerarPin(): string {
  for (let i = 0; i < 200; i++) {
    const pin = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    if (!pinFraco(pin)) return pin;
  }
  return '5837';
}
