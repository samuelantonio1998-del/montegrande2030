import { useEffect, useMemo, useState } from 'react';
import { FileDown, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { useUnidade } from '@/contexts/UnidadeContext';
import { useNomesComerciaisMarca, useTodosRotulos } from '@/hooks/useFichaRotulosBatch';
import { construirSeccoes, SECCOES_ORDEM, type SeccaoKey } from '@/components/fichas/RotuloPrintDialog';
import { gerarRotulosPdf, abrirPdf, descarregarPdf, nomeFicheiroRotulo, type RotuloDados } from '@/lib/rotulo-pdf';

export type PratoRotulo = { fichaId: string; nome: string };

export function RotulosEmentaDialog({
  pratos,
  open,
  onOpenChange,
}: {
  pratos: PratoRotulo[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { marcaId } = useUnidade();
  const { data: rotulos = {}, isLoading } = useTodosRotulos();
  const { data: nomesComerciais = {} } = useNomesComerciaisMarca(marcaId);

  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [desactivadas, setDesactivadas] = useState<Set<SeccaoKey>>(
    () => new Set<SeccaoKey>(['data_producao', 'validade', 'lote']),
  );
  const [tamanho, setTamanho] = useState(7.5);
  const [ajustar, setAjustar] = useState(true);
  const [alturaMax, setAlturaMax] = useState(100);
  const [copias, setCopias] = useState(1);

  const disponiveis = useMemo(
    () => pratos.filter(p => !!rotulos[p.fichaId]),
    [pratos, rotulos],
  );
  const semRotulo = pratos.length - disponiveis.length;

  useEffect(() => {
    if (open) setSeleccionados(new Set(disponiveis.map(p => p.fichaId)));
  }, [open, disponiveis]);

  const activas = useMemo(
    () => new Set(SECCOES_ORDEM.map(s => s.key).filter(k => !desactivadas.has(k))),
    [desactivadas],
  );

  const dados = useMemo<RotuloDados[]>(() =>
    disponiveis
      .filter(p => seleccionados.has(p.fichaId))
      .map(p => {
        const rot = rotulos[p.fichaId];
        const titulo = (nomesComerciais[p.fichaId] || rot?.titulo?.trim() || p.nome).toUpperCase();
        return { titulo, seccoes: construirSeccoes(rot, activas) };
      })
      .filter(d => d.seccoes.length > 0),
  [disponiveis, seleccionados, rotulos, nomesComerciais, activas]);

  const nCopias = Math.min(Math.max(copias || 1, 1), 50);

  const gerar = (modo: 'abrir' | 'descarregar') => {
    const doc = gerarRotulosPdf(dados, {
      tamanhoLetra: tamanho,
      ajustarParaCaber: ajustar,
      alturaMaxima: alturaMax,
      copias: nCopias,
    });
    const ficheiro = nomeFicheiroRotulo('ementa', true);
    if (modo === 'abrir') abrirPdf(doc, ficheiro);
    else descarregarPdf(doc, ficheiro);
  };

  const togglePrato = (id: string) =>
    setSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const toggleSeccao = (key: SeccaoKey) =>
    setDesactivadas(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rótulos da ementa em PDF</DialogTitle>
          <DialogDescription>
            Um PDF único com uma página de 62 mm por rótulo, pronto a imprimir no Brother QL-800.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">A carregar rótulos…</p>
        ) : disponiveis.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum prato da ementa de hoje tem texto de rótulo preenchido.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Pratos ({seleccionados.size}/{disponiveis.length})</Label>
              <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-border p-2">
                {disponiveis.map(p => (
                  <label key={p.fichaId} className="flex cursor-pointer items-center gap-2 text-xs">
                    <Checkbox checked={seleccionados.has(p.fichaId)} onCheckedChange={() => togglePrato(p.fichaId)} />
                    <span className="truncate">{nomesComerciais[p.fichaId] || p.nome}</span>
                  </label>
                ))}
              </div>
              {semRotulo > 0 && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {semRotulo} prato(s) sem texto de rótulo ficaram de fora.
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs">Secções a incluir</Label>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                {SECCOES_ORDEM.filter(s => !['data_producao', 'validade', 'lote'].includes(s.key)).map(s => (
                  <label key={s.key} className="flex cursor-pointer items-center gap-2 text-xs">
                    <Checkbox checked={!desactivadas.has(s.key)} onCheckedChange={() => toggleSeccao(s.key)} />
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

            <div className="w-28">
              <Label className="text-xs">Cópias de cada</Label>
              <Input className="mt-1 h-9" type="number" min={1} max={50} inputMode="numeric"
                value={copias} onChange={e => setCopias(parseInt(e.target.value) || 1)} />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button variant="outline" className="gap-2" disabled={!dados.length} onClick={() => gerar('descarregar')}>
            <FileDown className="h-4 w-4" /> Descarregar
          </Button>
          <Button className="gap-2" disabled={!dados.length} onClick={() => gerar('abrir')}>
            <ExternalLink className="h-4 w-4" /> Abrir PDF ({dados.length * nCopias})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RotulosEmentaDialog;
