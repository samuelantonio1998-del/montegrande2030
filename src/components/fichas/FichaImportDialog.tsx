import { useState, useRef, useMemo } from 'react';
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, X, Search, ChevronDown, ChevronUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useCreateFicha, useProdutos } from '@/hooks/useFichasTecnicas';

type ParsedIngrediente = {
  nome: string;
  quantidade: number;
  unidade_compra: number;
  produto_id?: string; // manually mapped
};

type ParsedFicha = {
  nome: string;
  doses: number;
  racio: number;
  ingredientes: ParsedIngrediente[];
  status: 'pending' | 'importing' | 'done' | 'error';
  error?: string;
  expanded?: boolean;
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

  const ingredientes: ParsedIngrediente[] = [];
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
    expanded: false,
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

function ProductPicker({ produtos, value, onChange }: {
  produtos: { id: string; nome: string; unidade: string }[];
  value: string | undefined;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = produtos.find(p => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-1 rounded-md border px-2 py-1 text-xs w-full text-left transition-colors',
            value ? 'border-success/40 bg-success/5 text-foreground' : 'border-warning/40 bg-warning/5 text-warning'
          )}
        >
          <Search className="h-3 w-3 shrink-0 opacity-60" />
          <span className="truncate flex-1">
            {selected ? selected.nome : 'Selecionar produto…'}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Procurar produto…" />
          <CommandList>
            <CommandEmpty>Nenhum produto encontrado</CommandEmpty>
            <CommandGroup>
              {produtos.map(p => (
                <CommandItem
                  key={p.id}
                  value={p.nome}
                  onSelect={() => { onChange(p.id); setOpen(false); }}
                >
                  <span className="truncate">{p.nome}</span>
                  <Badge variant="secondary" className="ml-auto text-[10px]">{p.unidade}</Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function FichaImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: produtos = [] } = useProdutos();
  const createFicha = useCreateFicha();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fichas, setFichas] = useState<ParsedFicha[]>([]);
  const [categoria, setCategoria] = useState('prato_principal');
  const [tempoPrep, setTempoPrep] = useState(30);
  const [precoVenda, setPrecoVenda] = useState(14.90);
  const [importing, setImporting] = useState(false);

  function autoMatchProduct(ingName: string) {
    const normalized = ingName.toLowerCase().replace(/\s*(kg|lt|l|un)\s*$/i, '').trim();
    return produtos.find(p => {
      const pNorm = p.nome.toLowerCase();
      return pNorm === normalized || pNorm.includes(normalized) || normalized.includes(pNorm);
    });
  }

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
            // Auto-match ingredients
            ficha.ingredientes = ficha.ingredientes.map(ing => {
              const match = autoMatchProduct(ing.nome);
              return match ? { ...ing, produto_id: match.id } : ing;
            });
            parsed.push(ficha);
          }
        } catch { /* skip */ }
        if (parsed.length > 0 || files.indexOf(file) === files.length - 1) {
          setFichas(prev => [...prev, ...parsed.filter(p => !prev.some(e => e.nome === p.nome))]);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function setIngredientProduct(fichaIdx: number, ingIdx: number, produtoId: string) {
    setFichas(prev => prev.map((f, fi) => {
      if (fi !== fichaIdx) return f;
      const newIngs = [...f.ingredientes];
      newIngs[ingIdx] = { ...newIngs[ingIdx], produto_id: produtoId };
      return { ...f, ingredientes: newIngs };
    }));
  }

  function toggleExpand(idx: number) {
    setFichas(prev => prev.map((f, i) => i === idx ? { ...f, expanded: !f.expanded } : f));
  }

  const resolvedProduct = (ing: ParsedIngrediente) => {
    return produtos.find(p => p.id === ing.produto_id);
  };

  async function handleImportAll() {
    setImporting(true);
    for (let i = 0; i < fichas.length; i++) {
      const f = fichas[i];
      if (f.status === 'done') continue;

      setFichas(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'importing' } : p));

      const ingredients = f.ingredientes
        .filter(ing => ing.produto_id)
        .map(ing => {
          const prod = resolvedProduct(ing);
          return {
            produto_id: ing.produto_id!,
            quantidade: ing.quantidade / ing.unidade_compra,
            unidade: prod?.unidade || 'kg',
          };
        });

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

  const unmatchedTotal = useMemo(() =>
    fichas.reduce((sum, f) => sum + f.ingredientes.filter(i => !i.produto_id).length, 0),
    [fichas]
  );

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
            <p className="mt-2 text-sm text-muted-foreground">Clique para selecionar ficheiros Excel</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Suporta múltiplos ficheiros em simultâneo</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" multiple className="hidden" onChange={handleFiles} />
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

          {/* Unmatched warning */}
          {fichas.length > 0 && unmatchedTotal > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2">
              <AlertCircle className="h-4 w-4 text-warning shrink-0" />
              <p className="text-xs text-warning">
                {unmatchedTotal} ingrediente{unmatchedTotal > 1 ? 's' : ''} sem correspondência — expanda cada ficha para atribuir manualmente.
              </p>
            </div>
          )}

          {/* Parsed fichas list */}
          {fichas.length > 0 && (
            <ScrollArea className="max-h-[350px]">
              <div className="space-y-2">
                {fichas.map((f, i) => {
                  const matchedCount = f.ingredientes.filter(ing => ing.produto_id).length;
                  const allMatched = matchedCount === f.ingredientes.length;
                  return (
                    <div key={i} className={cn(
                      'rounded-lg border border-border transition-colors',
                      f.status === 'done' && 'bg-success/5 border-success/30',
                      f.status === 'error' && 'bg-destructive/5 border-destructive/30',
                      f.status === 'importing' && 'bg-primary/5 border-primary/30',
                    )}>
                      <div className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {f.status === 'importing' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                            {f.status === 'done' && <CheckCircle2 className="h-4 w-4 text-success" />}
                            {f.status === 'error' && <AlertCircle className="h-4 w-4 text-destructive" />}
                            <span className="text-sm font-medium text-foreground">{f.nome}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {f.status === 'pending' && (
                              <button onClick={() => toggleExpand(i)} className="text-muted-foreground hover:text-foreground p-1">
                                {f.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            )}
                            {f.status === 'pending' && (
                              <button onClick={() => removeFicha(i)} className="text-muted-foreground hover:text-destructive p-1">
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="text-[10px]">{f.doses} kg</Badge>
                          <span>{f.ingredientes.length} ingredientes</span>
                          <span className={cn(allMatched ? 'text-success' : 'text-warning')}>
                            ({matchedCount}/{f.ingredientes.length} encontrados)
                          </span>
                          {!allMatched && f.status === 'pending' && !f.expanded && (
                            <button onClick={() => toggleExpand(i)} className="text-primary text-[10px] underline">
                              mapear
                            </button>
                          )}
                        </div>
                        {f.error && <p className="text-xs text-destructive mt-1">{f.error}</p>}
                      </div>

                      {/* Expanded ingredient mapping */}
                      {f.expanded && f.status === 'pending' && (
                        <div className="border-t border-border px-3 pb-3 pt-2 space-y-1.5">
                          {f.ingredientes.map((ing, j) => (
                            <div key={j} className="flex items-center gap-2">
                              <span className={cn(
                                'text-xs w-[120px] truncate shrink-0',
                                ing.produto_id ? 'text-muted-foreground' : 'text-warning font-medium'
                              )}>
                                {ing.nome}
                              </span>
                              <div className="flex-1 min-w-0">
                                <ProductPicker
                                  produtos={produtos}
                                  value={ing.produto_id}
                                  onChange={(id) => setIngredientProduct(i, j, id)}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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
