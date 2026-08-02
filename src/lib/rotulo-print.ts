import type { FichaRotulo } from '@/hooks/useFichaRotulo';

const WIDTH = 696;
const MARGIN = 24;
const CONTENT_WIDTH = WIDTH - MARGIN * 2;

type Section = { label: string; value: string; inlineLabel?: boolean };

function buildSections(rotulo: FichaRotulo): Section[] {
  const out: Section[] = [];
  const add = (label: string, value: string | null) => {
    if (value && value.trim()) out.push({ label, value: value.trim() });
  };
  add('Modo de preparação: ', rotulo.modo_preparacao);
  add('Ingredientes: ', rotulo.ingredientes);
  add('Declaração nutricional (por 100 g): ', rotulo.nutricional);
  add('Alergénios: ', rotulo.alergenios);
  add('Conservação: ', rotulo.conservacao);
  if (rotulo.peso && rotulo.peso.trim()) out.push({ label: 'Peso líq. aprox. ', value: rotulo.peso.trim() });
  return out;
}

type Token = { text: string; bold: boolean };

function layoutSection(ctx: CanvasRenderingContext2D, section: Section, fontSize: number) {
  const tokens: Token[] = [];
  section.label.split(/(\s+)/).filter(Boolean).forEach(t => tokens.push({ text: t, bold: true }));
  section.value.split(/(\s+)/).filter(Boolean).forEach(t => tokens.push({ text: t, bold: false }));

  const lines: Token[][] = [];
  let line: Token[] = [];
  let lineWidth = 0;

  const measure = (t: Token) => {
    ctx.font = `${t.bold ? 'bold ' : ''}${fontSize}px sans-serif`;
    return ctx.measureText(t.text).width;
  };

  for (const token of tokens) {
    if (/^\s+$/.test(token.text) && line.length === 0) continue;
    const w = measure(token);
    if (lineWidth + w > CONTENT_WIDTH && line.length > 0) {
      lines.push(line);
      line = [];
      lineWidth = 0;
      if (/^\s+$/.test(token.text)) continue;
    }
    line.push(token);
    lineWidth += w;
  }
  if (line.length) lines.push(line);
  return lines;
}

function wrapTitle(ctx: CanvasRenderingContext2D, title: string, fontSize: number) {
  ctx.font = `bold ${fontSize}px sans-serif`;
  const words = title.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (ctx.measureText(next).width > CONTENT_WIDTH && current) {
      lines.push(current);
      current = w;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function renderRotuloCanvas(rotulo: FichaRotulo): HTMLCanvasElement {
  const TITLE_SIZE = 40;
  const BODY_SIZE = 20;
  const TITLE_LINE_HEIGHT = Math.round(TITLE_SIZE * 1.25);
  const BODY_LINE_HEIGHT = Math.round(BODY_SIZE * 1.45);
  const SECTION_GAP = 18;

  const measureCanvas = document.createElement('canvas');
  const mctx = measureCanvas.getContext('2d')!;

  const titleLines = wrapTitle(mctx, (rotulo.titulo || '').toUpperCase(), TITLE_SIZE);
  const sections = buildSections(rotulo).map(s => layoutSection(mctx, s, BODY_SIZE));

  let height = MARGIN;
  height += titleLines.length * TITLE_LINE_HEIGHT;
  if (sections.length) height += SECTION_GAP;
  sections.forEach((lines, i) => {
    height += lines.length * BODY_LINE_HEIGHT;
    if (i < sections.length - 1) height += SECTION_GAP;
  });
  height += MARGIN;

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = Math.max(Math.round(height), 120);
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'top';

  let y = MARGIN;

  ctx.textAlign = 'center';
  ctx.font = `bold ${TITLE_SIZE}px sans-serif`;
  for (const line of titleLines) {
    ctx.fillText(line, WIDTH / 2, y);
    y += TITLE_LINE_HEIGHT;
  }
  if (sections.length) y += SECTION_GAP;

  ctx.textAlign = 'left';
  sections.forEach((lines, i) => {
    for (const line of lines) {
      let x = MARGIN;
      for (const token of line) {
        ctx.font = `${token.bold ? 'bold ' : ''}${BODY_SIZE}px sans-serif`;
        ctx.fillText(token.text, x, y);
        x += ctx.measureText(token.text).width;
      }
      y += BODY_LINE_HEIGHT;
    }
    if (i < sections.length - 1) y += SECTION_GAP;
  });

  return canvas;
}

export async function printRotulo(rotulo: FichaRotulo, nomeFicha: string) {
  const canvas = renderRotuloCanvas(rotulo);
  const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Não foi possível gerar a imagem do rótulo');

  const safeName = nomeFicha.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase() || 'ficha';
  const fileName = `rotulo_${safeName}.png`;
  const file = new File([blob], fileName, { type: 'image/png' });

  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: rotulo.titulo || nomeFicha });
      return 'shared' as const;
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return 'cancelled' as const;
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded' as const;
}
