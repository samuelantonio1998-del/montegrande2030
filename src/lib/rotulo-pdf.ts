import { jsPDF } from 'jspdf';

export type RotuloSeccao = { label: string; valor: string };

export type RotuloDados = {
  titulo: string;
  seccoes: RotuloSeccao[];
};

export type RotuloOpcoes = {
  /** tamanho base da letra do corpo, em pt */
  tamanhoLetra?: number;
  /** reduzir automaticamente a letra para caber numa só etiqueta */
  ajustarParaCaber?: boolean;
  /** altura máxima da etiqueta em mm quando se ajusta para caber */
  alturaMaxima?: number;
  /** número de cópias de cada rótulo */
  copias?: number;
};

const LARGURA_MM = 62;
const MARGEM_MM = 3;
const CONTEUDO_MM = LARGURA_MM - MARGEM_MM * 2;
const PT_PARA_MM = 0.352778;

type Token = { texto: string; bold: boolean };
type Linha = { tokens: Token[]; size: number; align: 'left' | 'center'; altura: number };

function alturaLinha(size: number) {
  return size * PT_PARA_MM * 1.28;
}

function quebrar(doc: jsPDF, tokens: Token[], size: number, align: 'left' | 'center'): Linha[] {
  const linhas: Linha[] = [];
  let atual: Token[] = [];
  let largura = 0;

  const medir = (t: Token) => {
    doc.setFont('helvetica', t.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    return doc.getTextWidth(t.texto);
  };

  for (const token of tokens) {
    const espaco = /^\s+$/.test(token.texto);
    if (espaco && atual.length === 0) continue;
    const w = medir(token);
    if (largura + w > CONTEUDO_MM && atual.length > 0) {
      linhas.push({ tokens: atual, size, align, altura: alturaLinha(size) });
      atual = [];
      largura = 0;
      if (espaco) continue;
    }
    atual.push(token);
    largura += w;
  }
  if (atual.length) linhas.push({ tokens: atual, size, align, altura: alturaLinha(size) });
  return linhas;
}

function montarLinhas(doc: jsPDF, dados: RotuloDados, size: number) {
  const tituloSize = Math.round(size * 1.7 * 10) / 10;
  const linhas: Linha[] = [];

  if (dados.titulo.trim()) {
    const tokens = dados.titulo
      .toUpperCase()
      .split(/(\s+)/)
      .filter(Boolean)
      .map(t => ({ texto: t, bold: true }));
    linhas.push(...quebrar(doc, tokens, tituloSize, 'center'));
    linhas.push({ tokens: [], size, align: 'left', altura: size * PT_PARA_MM * 0.9 });
  }

  dados.seccoes.forEach((s, i) => {
    const tokens: Token[] = [];
    s.label.split(/(\s+)/).filter(Boolean).forEach(t => tokens.push({ texto: t, bold: true }));
    tokens.push({ texto: ' ', bold: false });
    s.valor.split(/(\s+)/).filter(Boolean).forEach(t => tokens.push({ texto: t, bold: false }));
    linhas.push(...quebrar(doc, tokens, size, 'left'));
    if (i < dados.seccoes.length - 1) {
      linhas.push({ tokens: [], size, align: 'left', altura: size * PT_PARA_MM * 0.5 });
    }
  });

  const altura = MARGEM_MM * 2 + linhas.reduce((a, l) => a + l.altura, 0);
  return { linhas, altura };
}

/** Calcula o layout final, reduzindo a letra se necessário para caber numa etiqueta. */
function calcularPagina(doc: jsPDF, dados: RotuloDados, opts: RotuloOpcoes) {
  const base = opts.tamanhoLetra ?? 7.5;
  const maxAltura = opts.alturaMaxima ?? 150;
  let size = base;
  let r = montarLinhas(doc, dados, size);
  if (opts.ajustarParaCaber) {
    while (r.altura > maxAltura && size > 4) {
      size = Math.round((size - 0.25) * 100) / 100;
      r = montarLinhas(doc, dados, size);
    }
  }
  return { ...r, size };
}

function desenhar(doc: jsPDF, linhas: Linha[]) {
  doc.setTextColor(0, 0, 0);
  let y = MARGEM_MM;
  for (const linha of linhas) {
    if (linha.tokens.length) {
      const baseline = y + linha.size * PT_PARA_MM * 0.92;
      let larguraTotal = 0;
      if (linha.align === 'center') {
        for (const t of linha.tokens) {
          doc.setFont('helvetica', t.bold ? 'bold' : 'normal');
          doc.setFontSize(linha.size);
          larguraTotal += doc.getTextWidth(t.texto);
        }
      }
      let x = linha.align === 'center' ? MARGEM_MM + (CONTEUDO_MM - larguraTotal) / 2 : MARGEM_MM;
      for (const t of linha.tokens) {
        doc.setFont('helvetica', t.bold ? 'bold' : 'normal');
        doc.setFontSize(linha.size);
        doc.text(t.texto, x, baseline);
        x += doc.getTextWidth(t.texto);
      }
    }
    y += linha.altura;
  }
}

/** Gera um PDF com uma página por rótulo (62 mm de largura, altura conforme o conteúdo). */
export function gerarRotulosPdf(rotulos: RotuloDados[], opts: RotuloOpcoes = {}): jsPDF {
  const copias = Math.min(Math.max(opts.copias ?? 1, 1), 50);
  const lista: RotuloDados[] = [];
  rotulos.forEach(r => {
    for (let i = 0; i < copias; i++) lista.push(r);
  });

  const doc = new jsPDF({ unit: 'mm', format: [LARGURA_MM, 100], compress: true });

  lista.forEach((dados, idx) => {
    const { linhas, altura } = calcularPagina(doc, dados, opts);
    const alturaPagina = Math.max(altura, 20);
    if (idx === 0) {
      // substitui a primeira página pela altura correcta
      doc.deletePage(1);
      doc.addPage([LARGURA_MM, alturaPagina], 'portrait');
    } else {
      doc.addPage([LARGURA_MM, alturaPagina], 'portrait');
    }
    desenhar(doc, linhas);
  });

  return doc;
}

export function nomeFicheiroRotulo(nome: string, multiplos = false) {
  const slug = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'rotulo';
  const data = new Date().toISOString().slice(0, 10);
  return `${multiplos ? 'rotulos' : 'rotulo'}-${slug}-${data}.pdf`;
}

export function abrirPdf(doc: jsPDF, nomeFicheiro: string) {
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    descarregarBlob(blob, nomeFicheiro);
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function descarregarPdf(doc: jsPDF, nomeFicheiro: string) {
  descarregarBlob(doc.output('blob'), nomeFicheiro);
}

function descarregarBlob(blob: Blob, nomeFicheiro: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeFicheiro;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
