import { useState, useEffect, useRef } from 'react';
import { ChefHat, Clock, Edit3, Save, X, Plus, Trash2, TrendingUp, TrendingDown, Minus, FileText, AlertTriangle, ImageIcon, Camera } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useProdutos, useUpdateFicha, useDeleteFicha, LABOR_COST_PER_HOUR, type FichaComIngredientes } from '@/hooks/useFichasTecnicas';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

type EditIngredient = {
  produto_id: string;
  quantidade: number;
  unidade: string;
};

/** No longer using container-based doses — recipes specify output in KG */

function calcCostFromProdutos(
  ingredientes: EditIngredient[],
  produtosMap: Map<string, { custo_medio: number; nome: string; unidade: string }>
) {
  return ingredientes.reduce((sum, ing) => {
    const p = produtosMap.get(ing.produto_id);
    return sum + ing.quantidade * (p?.custo_medio ?? 0);
  }, 0);
}

function CostHistoryPopover({ produtoId, currentCost, unidade }: { produtoId: string; currentCost: number; unidade: string }) {
  const [history, setHistory] = useState<{ date: string; cost: number }[] | null>(null);
  const [loading, setLoading] = useState(false);

  const loadHistory = async () => {
    if (history !== null) return;
    setLoading(true);
    const { data } = await supabase
      .from('movimentacoes')
      .select('created_at, custo_unitario')
      .eq('produto_id', produtoId)
      .eq('tipo', 'entrada')
      .not('custo_unitario', 'is', null)
      .order('created_at', { ascending: true })
      .limit(20);
    const entries = (data || [])
      .filter(d => d.custo_unitario != null)
      .map(d => ({ date: d.created_at, cost: d.custo_unitario as number }));
    setHistory(entries);
    setLoading(false);
  };

  const trend = history && history.length >= 2 ? history[history.length - 1].cost - history[history.length - 2].cost : 0;
  const trendPct = history && history.length >= 2 && history[history.length - 2].cost > 0
    ? ((trend / history[history.length - 2].cost) * 100) : 0;

  const renderSparkline = (items: { cost: number }[]) => {
    if (items.length < 2) return null;
    const costs = items.map(d => d.cost);
    const min = Math.min(...costs);
    const max = Math.max(...costs);
    const range = max - min || 1;
    const w = 180, h = 40;
    const points = costs.map((c, i) => {
      const x = (i / (costs.length - 1)) * w;
      const y = h - ((c - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    }).join(' ');
    const isUp = costs[costs.length - 1] > costs[0];
    return (
      <svg width={w} height={h} className="mt-2">
        <polyline points={points} fill="none" stroke={isUp ? 'hsl(var(--destructive))' : 'hsl(var(--success))'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {costs.map((c, i) => {
          const x = (i / (costs.length - 1)) * w;
          const y = h - ((c - min) / range) * (h - 4) - 2;
          return <circle key={i} cx={x} cy={y} r="2.5" fill={i === costs.length - 1 ? (isUp ? 'hsl(var(--destructive))' : 'hsl(var(--success))') : 'hsl(var(--muted-foreground))'} opacity={i === costs.length - 1 ? 1 : 0.4} />;
        })}
      </svg>
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button onClick={loadHistory} className="text-right text-muted-foreground hover:text-foreground transition-colors cursor-pointer underline decoration-dotted underline-offset-2">
          €{currentCost.toFixed(2)}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" side="left">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Histórico de Custo</p>
            {history && history.length >= 2 && (
              <div className={cn('flex items-center gap-0.5 text-[10px] font-medium rounded-full px-1.5 py-0.5',
                trendPct > 0 ? 'bg-destructive/10 text-destructive' : trendPct < 0 ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground')}>
                {trendPct > 0 ? <TrendingUp className="h-3 w-3" /> : trendPct < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {trendPct > 0 ? '+' : ''}{trendPct.toFixed(1)}%
              </div>
            )}
          </div>
          {loading && <p className="text-xs text-muted-foreground">A carregar...</p>}
          {history && history.length === 0 && <p className="text-xs text-muted-foreground">Sem entradas registadas</p>}
          {history && history.length > 0 && (
            <>
              {renderSparkline(history)}
              <div className="space-y-1 max-h-32 overflow-y-auto mt-2">
                {[...history].reverse().slice(0, 8).map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">{format(new Date(h.date), 'dd MMM yy', { locale: pt })}</span>
                    <span className={cn('font-medium', i === 0 ? 'text-foreground' : 'text-muted-foreground')}>€{h.cost.toFixed(2)}/{unidade}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function FichaDetailDialog({
  ficha,
  onClose,
}: {
  ficha: FichaComIngredientes | null;
  onClose: () => void;
}) {
  const { data: produtos = [] } = useProdutos();
  const updateFicha = useUpdateFicha();
  const deleteFicha = useDeleteFicha();
  const [editing, setEditing] = useState(false);
  const [editFotoPreview, setEditFotoPreview] = useState<string | null>(null);
  const [editFotoFile, setEditFotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editNome, setEditNome] = useState('');
  const [editPorcoes, setEditPorcoes] = useState(1);
  const [editPreco, setEditPreco] = useState(0);
  const [editTempo, setEditTempo] = useState(0);
  const [editNotas, setEditNotas] = useState('');
  const [editIngredientes, setEditIngredientes] = useState<EditIngredient[]>([]);

  const produtosMap = new Map(produtos.map(p => [p.id, p]));

  useEffect(() => {
    if (ficha) {
      setEditNome(ficha.nome);
      setEditPorcoes(ficha.porcoes);
      setEditPreco(ficha.preco_venda);
      setEditTempo(ficha.tempo_preparacao ?? 0);
      setEditNotas((ficha as any).notas_preparacao ?? '');
      setEditIngredientes(
        ficha.ingredientes.map(i => ({
          produto_id: i.produto_id,
          quantidade: i.quantidade,
          unidade: i.unidade,
        }))
      );
      setEditFotoPreview(null);
      setEditFotoFile(null);
      setEditing(false);
    }
  }, [ficha]);

  if (!ficha) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditFotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setEditFotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!editFotoFile) return ficha.foto_url;
    setUploading(true);
    const ext = editFotoFile.name.split('.').pop();
    const path = `fichas/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('pratos').upload(path, editFotoFile, { upsert: true });
    setUploading(false);
    if (error) {
      console.error('Upload error:', error);
      toast({ title: 'Erro ao carregar foto', description: error.message, variant: 'destructive' });
      return ficha.foto_url;
    }
    const { data: urlData } = supabase.storage.from('pratos').getPublicUrl(path);
    return urlData.publicUrl;
  };

  const currentIngredientes = editing ? editIngredientes : ficha.ingredientes.map(i => ({
    produto_id: i.produto_id, quantidade: i.quantidade, unidade: i.unidade,
  }));

  const ingredientCost = calcCostFromProdutos(currentIngredientes, produtosMap);
  const tempo = editing ? editTempo : (ficha.tempo_preparacao ?? 0);
  const laborCost = (tempo / 60) * LABOR_COST_PER_HOUR;
  const totalCost = ingredientCost + laborCost;
  const porcoes = editing ? editPorcoes : ficha.porcoes;
  const precoVenda = editing ? editPreco : ficha.preco_venda;
  const costPerPortion = porcoes > 0 ? totalCost / porcoes : 0;
  const margin = precoVenda > 0 ? ((precoVenda - costPerPortion) / precoVenda) * 100 : 0;
  const racio = precoVenda > 0 ? (costPerPortion / precoVenda) * 100 : 0;

  const handleSave = async () => {
    const fotoUrl = await uploadPhoto();
    await updateFicha.mutateAsync({
      id: ficha.id,
      nome: editNome,
      categoria: ficha.categoria,
      porcoes: editPorcoes,
      preco_venda: editPreco,
      tempo_preparacao: editTempo,
      foto_url: fotoUrl,
      notas_preparacao: editNotas || null,
      ingredientes: editIngredientes.filter(i => i.produto_id && i.quantidade > 0),
    });
    setEditing(false);
    onClose();
  };

  const addIngredient = () => {
    setEditIngredientes([...editIngredientes, { produto_id: '', quantidade: 0, unidade: 'kg' }]);
  };

  const removeIngredient = (index: number) => {
    setEditIngredientes(editIngredientes.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof EditIngredient, value: any) => {
    const copy = [...editIngredientes];
    (copy[index] as any)[field] = value;
    if (field === 'produto_id') {
      const p = produtosMap.get(value);
      if (p) copy[index].unidade = p.unidade;
    }
    setEditIngredientes(copy);
  };

  const usedProdutoIds = new Set(editIngredientes.map(i => i.produto_id));
  const notasPreparacao = editing ? editNotas : ((ficha as any).notas_preparacao ?? '');

  return (
    <Dialog open={!!ficha} onOpenChange={open => { if (!open) { setEditing(false); onClose(); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        {/* Photo header */}
        {(editFotoPreview || ficha.foto_url) ? (
          <div className="relative -mx-6 -mt-6 mb-4 aspect-[16/9] overflow-hidden rounded-t-lg">
            <img src={editFotoPreview || ficha.foto_url!} alt={ficha.nome} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
              <h2 className="text-lg font-display text-white">{editing ? editNome : ficha.nome}</h2>
              <div className="flex gap-1.5">
                {editing && (
                  <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => fileInputRef.current?.click()}>
                    <Camera className="h-3.5 w-3.5" /> Alterar foto
                  </Button>
                )}
                {!editing && (
                  <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => setEditing(true)}>
                    <Edit3 className="h-3.5 w-3.5" /> Editar
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-primary" />
                {editing ? editNome : ficha.nome}
              </DialogTitle>
              <div className="flex gap-1.5">
                {editing && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => fileInputRef.current?.click()}>
                    <ImageIcon className="h-3.5 w-3.5" /> Adicionar foto
                  </Button>
                )}
                {!editing && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditing(true)}>
                    <Edit3 className="h-3.5 w-3.5" /> Editar
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
        )}

        {/* Edit header fields */}
        {editing && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Nome</label>
              <Input value={editNome} onChange={e => setEditNome(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Rendimento (kg)</label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={editPorcoes}
                onChange={e => setEditPorcoes(parseFloat(e.target.value) || 1)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Preço Venda (€)</label>
              <Input type="number" step="0.01" value={editPreco} onChange={e => setEditPreco(parseFloat(e.target.value) || 0)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Tempo Prep. (min) <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                min={1}
                value={editTempo || ''}
                onChange={e => setEditTempo(parseInt(e.target.value) || 0)}
                className={cn('mt-1', !editTempo && 'border-destructive/50')}
              />
              {editTempo > 0 && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  M.O.: €{laborCost.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Custo Total</p>
            <p className="text-lg font-bold text-foreground">€{totalCost.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Custo/kg</p>
            <p className="text-lg font-bold text-foreground">€{costPerPortion.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Preço Venda</p>
            <p className="text-lg font-bold text-foreground">€{precoVenda.toFixed(2)}</p>
          </div>
          <div className={cn('rounded-lg p-3 text-center', margin >= 65 ? 'bg-success/10' : margin >= 50 ? 'bg-warning/10' : 'bg-destructive/10')}>
            <p className="text-xs text-muted-foreground">Margem</p>
            <p className={cn('text-lg font-bold', margin >= 65 ? 'text-success' : margin >= 50 ? 'text-warning' : 'text-destructive')}>
              {margin.toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Rácio */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Rácio Unitário de Custo</span>
          <span className={cn('text-sm font-bold', racio <= 30 ? 'text-success' : racio <= 40 ? 'text-warning' : 'text-destructive')}>
            {racio.toFixed(1)}%
          </span>
        </div>

        {/* Ingredients */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-foreground">
              Ingredientes (produto cru)
            </h4>
            {editing && (
              <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={addIngredient}>
                <Plus className="h-3 w-3" /> Adicionar
              </Button>
            )}
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Ingrediente</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Qtd (cru)</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">€/Un</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Subtotal</th>
                  {editing && <th className="px-3 py-2 w-10"></th>}
                </tr>
              </thead>
              <tbody>
                {currentIngredientes.map((ing, idx) => {
                  const p = produtosMap.get(ing.produto_id);
                  const cost = p?.custo_medio ?? 0;
                  return (
                    <tr key={idx} className="border-t border-border">
                      <td className="px-3 py-2">
                        {editing ? (
                          <Select value={ing.produto_id} onValueChange={v => updateIngredient(idx, 'produto_id', v)}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              {produtos.map(prod => (
                                <SelectItem key={prod.id} value={prod.id} disabled={usedProdutoIds.has(prod.id) && prod.id !== ing.produto_id}>
                                  {prod.nome} ({prod.unidade})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-foreground">{p?.nome ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {editing ? (
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              step="0.001"
                              min="0"
                              value={ing.quantidade}
                              onChange={e => updateIngredient(idx, 'quantidade', parseFloat(e.target.value) || 0)}
                              className="h-8 w-20 text-xs text-right"
                            />
                            <span className="text-xs text-muted-foreground w-6">{ing.unidade}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{ing.quantidade} {ing.unidade}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {editing ? (
                          <span className="text-muted-foreground">€{cost.toFixed(2)}</span>
                        ) : (
                          <CostHistoryPopover produtoId={ing.produto_id} currentCost={cost} unidade={p?.unidade || 'un'} />
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-foreground">€{(ing.quantidade * cost).toFixed(2)}</td>
                      {editing && (
                        <td className="px-1 py-2">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeIngredient(idx)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {/* Labor cost row */}
                {tempo > 0 && (
                  <tr className="border-t border-border bg-muted/20">
                    <td className="px-3 py-2 text-xs text-muted-foreground" colSpan={3}>
                      Mão-de-obra ({tempo} min × €{LABOR_COST_PER_HOUR}/h s/ IVA)
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-foreground">€{laborCost.toFixed(2)}</td>
                    {editing && <td></td>}
                  </tr>
                )}
                <tr className="border-t-2 border-border bg-muted/30">
                  <td colSpan={3} className="px-3 py-2 font-semibold text-foreground">
                    Total ({porcoes} kg)
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-foreground">€{totalCost.toFixed(2)}</td>
                  {editing && <td></td>}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Notas de preparação */}
        {editing ? (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nota de Preparação / Confecção</label>
            <Textarea
              value={editNotas}
              onChange={e => setEditNotas(e.target.value)}
              placeholder="Instruções de preparação, dicas de confecção, temperaturas..."
              rows={3}
              className="mt-1 resize-none"
            />
          </div>
        ) : notasPreparacao ? (
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">Nota de Preparação</span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{notasPreparacao}</p>
          </div>
        ) : null}

        {!editing && tempo > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Tempo de preparação: {tempo} min (M.O.: €{laborCost.toFixed(2)})</span>
          </div>
        )}

        {/* Save/Cancel/Delete buttons */}
        {editing ? (
          <div className="flex justify-between gap-2 pt-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5">
                  <Trash2 className="h-4 w-4" /> Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Eliminar ficha técnica?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    A ficha "{ficha.nome}" será desativada e deixará de aparecer na lista.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => { deleteFicha.mutate(ficha.id); onClose(); }}
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                setEditing(false);
                setEditIngredientes(ficha.ingredientes.map(i => ({ produto_id: i.produto_id, quantidade: i.quantidade, unidade: i.unidade })));
                setEditPorcoes(ficha.porcoes);
                setEditPreco(ficha.preco_venda);
                setEditTempo(ficha.tempo_preparacao ?? 0);
                setEditNome(ficha.nome);
                setEditNotas((ficha as any).notas_preparacao ?? '');
                setEditFotoPreview(null);
                setEditFotoFile(null);
              }}>
                <X className="h-4 w-4 mr-1.5" /> Cancelar
              </Button>
              <Button onClick={handleSave} disabled={updateFicha.isPending || uploading || !editTempo}>
                <Save className="h-4 w-4 mr-1.5" />
                {uploading ? 'A enviar foto...' : updateFicha.isPending ? 'A guardar...' : 'Guardar'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end pt-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar ficha
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Eliminar ficha técnica?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    A ficha "{ficha.nome}" será desativada e deixará de aparecer na lista.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => { deleteFicha.mutate(ficha.id); onClose(); }}
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
