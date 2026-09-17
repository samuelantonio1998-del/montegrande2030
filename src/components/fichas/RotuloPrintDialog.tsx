import { useMemo, useState } from 'react';
import { FileDown, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { useFichaRotulo, type FichaRotulo } from '@/hooks/useFichaRotulo';
import { useFichaMarcas } from '@/hooks/useFichaMarca';
import { useUnidade } from '@/contexts/UnidadeContext';
import {
  gerarRotulosPdf, abrirPdf, descarregarPdf, nomeFicheiroRotulo,
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

  const [copias, setCopias] = useState(1);
  const [dataProducao, setDataProducao] = useState('');
  const [validade, setValidade] = useState('');
  const [lote, setLote] = useState('');
  const [tamanho, setTamanho] = useState(7.5);
  const [ajustar, setAjustar] = useState(true);
  const [alturaMax, setAlturaMax] = useState(100);
  const [desactivadas, setDesactivadas] = useState<Set<SeccaoKey>>(new Set());

  const activas = useMemo(
    () => new Set(SECCOES_ORDEM.map(s => s.key).filter(k => !desactivadas.has(k))),
    [desactivadas],
  );

  const nomeComercial = useMemo(() => {
    const row = fichaMarcas.find(f => f.marca_id === marcaId);
    return row?.nome_comercial?.trim() || null;
  }, [fichaMarcas, marcaId]);

  const titulo = (nomeComercial || rotulo?.titulo?.trim() || nomeFicha || '').toUpperCase();

  const seccoes = useMemo(
    () => construirSeccoes(rotulo, activas, { dataProducao, validade, lote }),
    [rotulo, activas, dataProducao, validade, lote],
  );

  const nCopias = Math.min(Math.max(copias || 1, 1), 50);
  const temConteudo = !!titulo && seccoes.length > 0;

  const toggle = (key: SeccaoKey) =>
    setDesactivadas(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  const gerar = (modo: 'abrir' | 'descarregar') => {
    const doc = gerarRotulosPdf([{ titulo, seccoes }], {
      tamanhoLetra: tamanho,
      ajustarParaCaber: ajustar,
      alturaMaxima: alturaMax,
      copias: nCopias,
    });
    const ficheiro = nomeFicheiroRotulo(nomeComercial || nomeFicha);
    if (modo === 'abrir') abrirPdf(doc, ficheiro);
    else descarregarPdf(doc, ficheiro);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rótulo em PDF</DialogTitle>
          <DialogDescription>
            Página de 62 mm de largura, margens de 3 mm e altura conforme o conteúdo. Imprima o PDF pelo
            Brother QL-800 com o rolo contínuo de 62 mm.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">A carregar rótulo…</p>
        ) : !rotulo ? (
          <p className="text-sm text-muted-foreground">
            Esta ficha ainda não tem texto de rótulo preenchido.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Data produção</Label>
                <Input className="mt-1 h-8 text-xs" value={dataProducao} onChange={e => setDataProducao(e.target.value)} placeholder="opcional" />
              </div>
              <div>
                <Label className="text-xs">Validade</Label>
                <Input className="mt-1 h-8 text-xs" value={validade} onChange={e => setValidade(e.target.value)} placeholder="opcional" />
              </div>
              <div>
                <Label className="text-xs">Lote</Label>
                <Input className="mt-1 h-8 text-xs" value={lote} onChange={e => setLote(e.target.value)} placeholder="opcional" />
              </div>
            </div>

            <div>
              <Label className="text-xs">Secções a incluir</Label>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                {SECCOES_ORDEM.map(s => (
                  <label key={s.key} className="flex cursor-pointer items-center gap-2 text-xs">
                    <Checkbox checked={!desactivadas.has(s.key)} onCheckedChange={() => toggle(s.key)} />
                    <span className="truncate">{s.label.replace(':', '')}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Tamanho da letra: {tamanho.toFixed(1)} pt</Label>
                <Slider className="mt-3" min={5} max={12} step={0.5} value={[tamanho]} onValueChange={v => setTamanho(v[0])} />
              </div>
              <div>
                <Label className="text-xs">Altura máxima: {alturaMax} mm</Label>
                <Slider className="mt-3" min={40} max={200} step={5} value={[alturaMax]} onValueChange={v => setAlturaMax(v[0])} disabled={!ajustar} />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <Checkbox checked={ajustar} onCheckedChange={v => setAjustar(!!v)} />
              <span>Reduzir a letra automaticamente para caber numa única etiqueta</span>
            </label>

            <div>
              <p className="mb-2 text-xs text-muted-foreground">Pré-visualização à escala real (62 mm)</p>
              <div className="flex justify-center rounded-lg border border-border bg-muted/30 p-3">
                <div className="rotulo-preview bg-white">
                  <div className="rotulo-label" style={{ fontSize: `${tamanho}pt` }}>
                    {titulo && <div className="rotulo-titulo" style={{ fontSize: `${(tamanho * 1.7).toFixed(1)}pt` }}>{titulo}</div>}
                    {seccoes.map(s => (
                      <p key={s.label} className="rotulo-seccao">
                        <strong>{s.label}</strong> {s.valor}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="w-28">
              <Label className="text-xs">Cópias</Label>
              <Input
                className="mt-1 h-9"
                type="number"
                min={1}
                max={50}
                inputMode="numeric"
                value={copias}
                onChange={e => setCopias(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button variant="outline" className="gap-2" disabled={!temConteudo} onClick={() => gerar('descarregar')}>
            <FileDown className="h-4 w-4" /> Descarregar
          </Button>
          <Button className="gap-2" disabled={!temConteudo} onClick={() => gerar('abrir')}>
            <ExternalLink className="h-4 w-4" /> Abrir PDF{nCopias > 1 ? ` (${nCopias})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RotuloPrintDialog;
