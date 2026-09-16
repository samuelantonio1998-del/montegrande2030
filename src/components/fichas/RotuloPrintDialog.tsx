import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFichaRotulo } from '@/hooks/useFichaRotulo';
import { useFichaMarcas } from '@/hooks/useFichaMarca';
import { useUnidade } from '@/contexts/UnidadeContext';

type Seccao = { label: string; valor: string };

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

  const nomeComercial = useMemo(() => {
    const row = fichaMarcas.find(f => f.marca_id === marcaId);
    return row?.nome_comercial?.trim() || null;
  }, [fichaMarcas, marcaId]);

  const titulo = (nomeComercial || rotulo?.titulo?.trim() || nomeFicha || '').toUpperCase();

  const seccoes = useMemo<Seccao[]>(() => {
    if (!rotulo) return [];
    const out: Seccao[] = [];
    const add = (label: string, valor?: string | null) => {
      if (valor && valor.trim()) out.push({ label, valor: valor.trim() });
    };
    add('Modo de preparação:', rotulo.modo_preparacao);
    add('Ingredientes:', rotulo.ingredientes);
    add('Declaração nutricional (por 100 g):', rotulo.nutricional);
    add('Alergénios:', rotulo.alergenios);
    add('Conservação:', rotulo.conservacao);
    add('Peso líq. aprox.:', rotulo.peso);
    add('Data de produção:', dataProducao);
    add('Validade:', validade);
    add('Lote:', lote);
    return out;
  }, [rotulo, dataProducao, validade, lote]);

  const nCopias = Math.min(Math.max(copias || 1, 1), 50);

  const etiqueta = (
    <div className="rotulo-label">
      {titulo && <div className="rotulo-titulo">{titulo}</div>}
      {seccoes.map(s => (
        <p key={s.label} className="rotulo-seccao">
          <strong>{s.label}</strong> {s.valor}
        </p>
      ))}
    </div>
  );

  const temConteudo = !!titulo && seccoes.length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Imprimir rótulo</DialogTitle>
            <DialogDescription>
              Rolo contínuo de 62 mm, margens de 3 mm, comprimento conforme o conteúdo.
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
                <p className="mb-2 text-xs text-muted-foreground">Pré-visualização à escala real (62 mm)</p>
                <div className="flex justify-center rounded-lg border border-border bg-muted/30 p-3">
                  <div className="rotulo-preview bg-white">{etiqueta}</div>
                </div>
              </div>

              <div className="flex items-end gap-3">
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
                <p className="pb-2 text-xs text-muted-foreground">
                  A impressão usa o diálogo do navegador; escolha a Brother QL-800.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
            <Button className="gap-2" disabled={!temConteudo} onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Imprimir {nCopias > 1 ? `${nCopias} cópias` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {open && temConteudo &&
        createPortal(
          <div className="rotulo-print-root">
            {Array.from({ length: nCopias }).map((_, i) => (
              <div key={i}>{etiqueta}</div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

export default RotuloPrintDialog;
