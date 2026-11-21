import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { flushSync } from 'react-dom';
import { Printer, Settings2, X, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, addDays, addMonths, addYears, parse, isValid } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useFichaRotulo, type FichaRotulo } from '@/hooks/useFichaRotulo';
import { useFichaMarcas } from '@/hooks/useFichaMarca';
import { useUnidade } from '@/contexts/UnidadeContext';
import {
  calcularTamanhoLetra,
  gerarRotulosPdf,
  abrirPdf,
  nomeFicheiroRotulo,
  isSafariWebKit,
  type RotuloSeccao,
} from '@/lib/rotulo-pdf';

export type SeccaoKey =
  | 'modo_preparacao' | 'ingredientes' | 'nutricional'
  | 'alergenios' | 'conservacao' | 'peso'
  | 'data_producao' | 'validade' | 'lote';

export const SECCOES_ORDEM: { key: SeccaoKey; label: string }[] = [
  { key: 'modo_preparacao', label: 'Modo de preparação:' },
  { key: 'ingredientes', label: 'Ingredientes:' },
  { key: 'nutricional', label: 'Declaração nutricional (por 100 g):' },
  { key: 'alergenios', label: 'Alergénios:' },
  { key: 'conservacao', label: 'Conservação:' },
  { key: 'peso', label: 'Peso líq. aprox.:' },
  { key: 'data_producao', label: 'Data de produção:' },
  { key: 'validade', label: 'Validade:' },
  { key: 'lote', label: 'Lote:' },
];

type Atalho = { n: number; u: 'd' | 'm' | 'a' };
const ATALHOS_DEFAULT: Atalho[] = [{ n: 0, u: 'd' }, { n: 3, u: 'd' }, { n: 3, u: 'm' }, { n: 6, u: 'm' }, { n: 1, u: 'a' }];
const diasAprox = (a: Atalho) => a.n * (a.u === 'd' ? 1 : a.u === 'm' ? 30 : 365);
const aplicarAtalho = (d: Date, a: Atalho) => a.u === 'd' ? addDays(d, a.n) : a.u === 'm' ? addMonths(d, a.n) : addYears(d, a.n);
const rotuloAtalho = (a: Atalho) => a.n === 0 ? 'Hoje' : `+${a.n} ${a.u === 'd' ? (a.n === 1 ? 'dia' : 'dias') : a.u === 'm' ? (a.n === 1 ? 'mês' : 'meses') : (a.n === 1 ? 'ano' : 'anos')}`;

export type ExtrasRotulo = { dataProducao?: string; validade?: string; lote?: string };

/** Constrói as secções de um rótulo, omitindo as vazias e as desactivadas. */
export function construirSeccoes(
  rotulo: FichaRotulo | null | undefined,
  activas: Set<SeccaoKey>,
  extras: ExtrasRotulo = {},
): RotuloSeccao[] {
  if (!rotulo) return [];
  const valores: Record<SeccaoKey, string | null | undefined> = {
    modo_preparacao: rotulo.modo_preparacao,
    ingredientes: rotulo.ingredientes,
    nutricional: rotulo.nutricional,
    alergenios: rotulo.alergenios,
    conservacao: rotulo.conservacao,
    peso: rotulo.peso,
    data_producao: extras.dataProducao,
    validade: extras.validade,
    lote: extras.lote,
  };
  return SECCOES_ORDEM
    .filter(s => activas.has(s.key))
    .map(s => ({ label: s.label, valor: (valores[s.key] || '').trim() }))
    .filter(s => !!s.valor);
}

const FMT = 'dd/MM/yyyy';
const hojeStr = () => format(new Date(), FMT);
const hojeIso = () => format(new Date(), 'yyyy-MM-dd');

/** Incrementa a parte numérica final preservando prefixo e zeros à esquerda ("L007" -> "L008"). */
export function proximoLote(atual: string): string {
  const m = (atual || '').match(/^(.*?)(\d+)$/);
  if (!m) return atual ? `${atual}1` : '1';
  const n = String(Number(m[2]) + 1).padStart(m[2].length, '0');
  return m[1] + n;
}

export function RotuloPrintDialog({
  fichaId,
  nomeFicha,
  open,
  onOpenChange,
}: {
  fichaId: string | null;
  nomeFicha: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: rotulo, isLoading } = useFichaRotulo(open ? fichaId : null);
  const { data: fichaMarcas = [] } = useFichaMarcas(open ? fichaId ?? undefined : undefined);
  const { marcaId } = useUnidade();

  const [dataProducao, setDataProducao] = useState('');
  const [validade, setValidade] = useState('');
  const [lote, setLote] = useState('');
  const [loteSugerido, setLoteSugerido] = useState('');
  const [loteHoje, setLoteHoje] = useState(false);
  const [atalhos, setAtalhos] = useState<Atalho[]>(ATALHOS_DEFAULT);
  const [editarAtalhos, setEditarAtalhos] = useState(false);
  const [novoN, setNovoN] = useState('');
  const [novoU, setNovoU] = useState<Atalho['u']>('d');
  const [aImprimir, setAImprimir] = useState<{ titulo: string; seccoes: RotuloSeccao[]; size: number } | null>(null);

  const nomeComercial = useMemo(() => {
    const row = fichaMarcas.find(f => f.marca_id === marcaId);
    return row?.nome_comercial?.trim() || null;
  }, [fichaMarcas, marcaId]);

  const titulo = (nomeComercial || rotulo?.titulo?.trim() || nomeFicha || '').toUpperCase();
  const todas = useMemo(() => new Set(SECCOES_ORDEM.map(s => s.key)), []);

  useEffect(() => {
    if (!open) return;
    setDataProducao(hojeStr());
    setValidade('');
    let cancel = false;
    supabase.from('rotulo_config').select('lote_atual, lote_data, atalhos_validade').eq('id', 1).maybeSingle().then(({ data }) => {
      if (cancel) return;
      const atual = data?.lote_atual ?? '';
      const mesmoDia = data?.lote_data === hojeIso();
      const sug = mesmoDia ? atual : proximoLote(atual);
      setLoteHoje(mesmoDia);
      setLoteSugerido(sug);
      setLote(sug);
      const at = (data as any)?.atalhos_validade;
      if (Array.isArray(at)) setAtalhos(at as Atalho[]);
    });
    return () => { cancel = true; };
  }, [open]);

  const gravarAtalhos = async (lista: Atalho[]) => {
    const ord = [...lista].sort((a, b) => diasAprox(a) - diasAprox(b));
    setAtalhos(ord);
    await supabase.from('rotulo_config').update({ atalhos_validade: ord as any }).eq('id', 1);
  };
  const adicionarAtalho = () => {
    const n = parseInt(novoN, 10);
    if (!Number.isFinite(n) || n < 0) return;
    if (atalhos.some(a => a.n === n && a.u === novoU)) return;
    gravarAtalhos([...atalhos, { n, u: novoU }]);
    setNovoN('');
  };

  const definirValidade = (fn: (d: Date) => Date) => {
    const base = parse(dataProducao, FMT, new Date());
    const d = isValid(base) ? base : new Date();
    setValidade(format(fn(d), FMT));
  };

  const gravarLote = async () => {
    const v = lote.trim();
    if (!v) return;
    if (loteHoje && v === loteSugerido) return;
    await supabase.from('rotulo_config').update({ lote_atual: v, lote_data: hojeIso() }).eq('id', 1);
    setLoteHoje(true); setLoteSugerido(v);
  };

  useEffect(() => {
    const limpar = () => setAImprimir(null);
    window.addEventListener('afterprint', limpar);
    return () => window.removeEventListener('afterprint', limpar);
  }, []);

  const imprimir = () => {
    void gravarLote();
    const seccoes = construirSeccoes(rotulo, todas, { dataProducao, validade, lote });
    const opts = { tamanhoLetra: 7.5, ajustarParaCaber: true, alturaMaxima: 150 };
    if (isSafariWebKit()) {
      // Safari ignora @page size: usar PDF de 61,9 mm (tamanho embutido, respeitado pelo AirPrint).
      const doc = gerarRotulosPdf([{ titulo, seccoes }], opts);
      abrirPdf(doc, nomeFicheiroRotulo(titulo));
      return;
    }
    const size = calcularTamanhoLetra({ titulo, seccoes }, opts);
    flushSync(() => setAImprimir({ titulo, seccoes, size }));
    window.print();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm p-4 sm:p-6">
          <DialogHeader className="pr-6 text-left">
            <DialogTitle>Imprimir rótulo</DialogTitle>
            <DialogDescription>Campos opcionais. Depois escolha a impressora.</DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">A carregar rótulo…</p>
          ) : !rotulo ? (
            <p className="text-sm text-muted-foreground">Esta ficha ainda não tem texto de rótulo preenchido.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Data de produção</Label>
                <div className="mt-1 flex gap-2">
                  <Input value={dataProducao} onChange={e => setDataProducao(e.target.value)} placeholder="dd/mm/aaaa" />
                  <Button type="button" variant="outline" size="sm" onClick={() => setDataProducao(hojeStr())}>Hoje</Button>
                </div>
              </div>
              <div>
                <Label className="text-xs">Validade</Label>
                <Input className="mt-1" value={validade} onChange={e => setValidade(e.target.value)} placeholder="dd/mm/aaaa" />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {atalhos.map(a => (
                    <span key={a.n + a.u} className="inline-flex items-center">
                      <Button type="button" variant="secondary" size="sm" className="h-7 px-2 text-xs" onClick={() => definirValidade(d => aplicarAtalho(d, a))}>{rotuloAtalho(a)}</Button>
                      {editarAtalhos && (
                        <button type="button" aria-label="Remover atalho" className="ml-0.5 text-muted-foreground hover:text-destructive" onClick={() => gravarAtalhos(atalhos.filter(x => x !== a))}><X className="h-3.5 w-3.5" /></button>
                      )}
                    </span>
                  ))}
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2" aria-label="Configurar atalhos" onClick={() => setEditarAtalhos(v => !v)}><Settings2 className="h-4 w-4" /></Button>
                </div>
                {editarAtalhos && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <Input inputMode="numeric" className="h-8 w-16" value={novoN} onChange={e => setNovoN(e.target.value)} placeholder="nº" />
                    <select className="h-8 rounded-md border border-input bg-background px-2 text-sm" value={novoU} onChange={e => setNovoU(e.target.value as Atalho['u'])}>
                      <option value="d">dias</option><option value="m">meses</option><option value="a">anos</option>
                    </select>
                    <Button type="button" size="sm" className="h-8 gap-1" onClick={adicionarAtalho}><Plus className="h-3.5 w-3.5" />Adicionar</Button>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs">Lote</Label>
                <Input className="mt-1" value={lote} onChange={e => setLote(e.target.value)} placeholder="opcional" />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button className="gap-2" disabled={!rotulo || !titulo} onClick={imprimir}>
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {aImprimir && createPortal(
        <div id="rotulo-print">
          <div className="rotulo-label" style={{ fontSize: `${aImprimir.size}pt` }}>
            <div className="rotulo-titulo" style={{ fontSize: `${(aImprimir.size * 1.7).toFixed(1)}pt` }}>{aImprimir.titulo}</div>
            {aImprimir.seccoes.map(s => (
              <p key={s.label} className="rotulo-seccao"><strong>{s.label}</strong> {s.valor}</p>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

export default RotuloPrintDialog;
