import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useCreateFicha, useProdutos } from '@/hooks/useFichasTecnicas';

type ParsedFicha = {
  nome: string;
  doses: number;
  racio: number;
  ingredientes: { nome: string; quantidade: number; unidade_compra: number }[];
  status: 'pending' | 'importing' | 'done' | 'error';
  error?: string;
};

function parseExcelFicha(data: XLSX.WorkSheet): ParsedFicha | null {
  const cell = (ref: string) => {
    const c = data[ref];
    return c ? c.v : null;
  };

  const nome = cell('G6');
  if (!nome) return null;

  const doses = Number(cell('G9')) || 1;
  const racio = Number(cell('J36')) || 0.3;

  const ingredientes: ParsedFicha['ingredientes'] = [];
  for (let r = 18; r <= 32; r++) {
    const ingName = cell(`F${r}`);
    const qty = Number(cell(`G${r}`)) || 0;
    const unidCompra = Number(cell(`I${r}`)) || 1;
    if (ingName && qty > 0) {
      ingredientes.push({ nome: String(ingName).trim(), quantidade: qty, unidade_compra: unidCompra });
    }
  }

  return {
    nome: String(nome).replace(/ \/ tabuleiro$/i, '').trim(),
    doses,
    racio,
    ingredientes,
    status: 'pending',
  };
}

const categorias = [
  { value: 'prato_principal', label: 'Prato Principal' },
  { value: 'entrada', label: 'Entrada' },
  { value: 'sobremesa', label: 'Sobremesa' },
  { value: 'sopa', label: 'Sopa' },
  { value: 'acompanhamento', label: 'Acompanhamento' },
  { value: 'carne', label: 'Carne' },
  { value: 'peixe', label: 'Peixe' },
  { value: 'vegetariano', label: 'Vegetariano' },
];

export function FichaImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: produtos = [] } = useProdutos();
  const createFicha = useCreateFicha();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fichas, setFichas] = useState<ParsedFicha[]>([]);
  const [categoria, setCategoria] = useState('prato_principal');
  const [tempoPrep, setTempoPrep] = useState(30);
  const [precoVenda, setPrecoVenda] = useState(14.90);
  const [importing, setImporting] = useState(false);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const parsed: ParsedFicha[] = [];
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const wb = XLSX.read(evt.target?.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const ficha = parseExcelFicha(ws);
          if (ficha) {
            parsed.push(ficha);
          }
        } catch {
          // skip invalid files
        }
        if (parsed.length > 0 || files.indexOf(file) === files.length - 1) {
          setFichas(prev => [...prev, ...parsed.filter(p => !prev.some(e => e.nome === p.nome))]);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function matchProduct(ingName: string) {
    const normalized = ingName.toLowerCase().replace(/\s*(kg|lt|l|un)\s*$/i, '').trim();
    return produtos.find(p => {
      const pNorm = p.nome.toLowerCase();
      return pNorm === normalized || pNorm.includes(normalized) || normalized.includes(pNorm);
    });
  }

  async function handleImportAll() {
    setImporting(true);
    for (let i = 0; i < fichas.length; i++) {
      const f = fichas[i];
      if (f.status === 'done') continue;
      
      setFichas(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'importing' } : p));

      const ingredients = f.ingredientes.map(ing => {
        const prod = matchProduct(ing.nome);
        return prod ? {
          produto_id: prod.id,
          quantidade: ing.quantidade / ing.unidade_compra,
          unidade: prod.unidade,
        } : null;
      }).filter(Boolean) as { produto_id: string; quantidade: number; unidade: string }[];

      try {
        await new Promise<void>((resolve, reject) => {
          createFicha.mutate({
            nome: f.nome,
            categoria,
            porcoes: f.doses,
            preco_venda: precoVenda,
            tempo_preparacao: tempoPrep,
            ingredientes: ingredients,
          }, {
            onSuccess: () => resolve(),
            onError: (err) => reject(err),
          });
        });
        setFichas(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'done' } : p));
      } catch (err: any) {
        setFichas(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'error', error: err.message } : p));
      }
    }
    setImporting(false);
  }

  const removeFicha = (idx: number) => setFichas(prev => prev.filter((_, i) => i !== idx));
  const doneCount = fichas.filter(f => f.status === 'done').length;
  const allDone = fichas.length > 0 && doneCount === fichas.length;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) { onClose(); setFichas([]); } }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar Fichas Técnicas
          </DialogTitle>
          <DialogDescription>
            Carregue ficheiros Excel (.xlsx) com o formato de ficha técnica de cozinha.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload area */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-xl border-2 border-dashed border-border p-6 text-center hover:bg-muted/30 transition-colors"
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Clique para selecionar ficheiros Excel
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Suporta múltiplos ficheiros em simultâneo
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              multiple
              className="hidden"
              onChange={handleFiles}
            />
          </button>

          {/* Default settings */}
          {fichas.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categorias.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tempo Prep. (min)</label>
                <Input type="number" min={1} value={tempoPrep} onChange={e => setTempoPrep(Number(e.target.value))} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">P. Venda (€)</label>
                <Input type="number" step="0.01" min={0} value={precoVenda} onChange={e => setPrecoVenda(Number(e.target.value))} className="h-8 text-xs" />
              </div>
            </div>
          )}

          {/* Parsed fichas list */}
          {fichas.length > 0 && (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {fichas.map((f, i) => {
                  const matchedCount = f.ingredientes.filter(ing => matchProduct(ing.nome)).length;
                  return (
                    <div key={i} className={cn(
                      'rounded-lg border border-border p-3 transition-colors',
                      f.status === 'done' && 'bg-success/5 border-success/30',
                      f.status === 'error' && 'bg-destructive/5 border-destructive/30',
                      f.status === 'importing' && 'bg-primary/5 border-primary/30',
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {f.status === 'importing' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                          {f.status === 'done' && <CheckCircle2 className="h-4 w-4 text-success" />}
                          {f.status === 'error' && <AlertCircle className="h-4 w-4 text-destructive" />}
                          <span className="text-sm font-medium text-foreground">{f.nome}</span>
                        </div>
                        {f.status === 'pending' && (
                          <button onClick={() => removeFicha(i)} className="text-muted-foreground hover:text-destructive">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-[10px]">{f.doses} doses</Badge>
                        <span>{f.ingredientes.length} ingredientes</span>
                        <span className={cn(matchedCount === f.ingredientes.length ? 'text-success' : 'text-warning')}>
                          ({matchedCount}/{f.ingredientes.length} encontrados)
                        </span>
                      </div>
                      {f.error && <p className="text-xs text-destructive mt-1">{f.error}</p>}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          {allDone ? (
            <Button onClick={() => { onClose(); setFichas([]); }} className="w-full">
              Concluído ({doneCount} importadas)
            </Button>
          ) : (
            <Button
              onClick={handleImportAll}
              disabled={fichas.length === 0 || importing || tempoPrep <= 0}
              className="w-full gap-2"
            >
              {importing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> A importar...</>
              ) : (
                <><Upload className="h-4 w-4" /> Importar {fichas.filter(f => f.status !== 'done').length} fichas</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
