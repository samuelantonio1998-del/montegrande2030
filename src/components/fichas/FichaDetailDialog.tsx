import { useState, useEffect } from 'react';
import { ChefHat, Clock, Edit3, Save, X, Plus, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useProdutos, useUpdateFicha, type FichaComIngredientes } from '@/hooks/useFichasTecnicas';
import { recipientCapacity, type RecipientSize } from '@/lib/buffet-data';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

type EditIngredient = {
  produto_id: string;
  quantidade: number;
  unidade: string;
};

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
  const [editing, setEditing] = useState(false);

  // Edit state
  const [editNome, setEditNome] = useState('');
  const [editPorcoes, setEditPorcoes] = useState(1);
  const [editPreco, setEditPreco] = useState(0);
  const [editTempo, setEditTempo] = useState(0);
  const [editIngredientes, setEditIngredientes] = useState<EditIngredient[]>([]);

  const produtosMap = new Map(produtos.map(p => [p.id, p]));

  useEffect(() => {
    if (ficha) {
      setEditNome(ficha.nome);
      setEditPorcoes(ficha.porcoes);
      setEditPreco(ficha.preco_venda);
      setEditTempo(ficha.tempo_preparacao ?? 0);
      setEditIngredientes(
        ficha.ingredientes.map(i => ({
          produto_id: i.produto_id,
          quantidade: i.quantidade,
          unidade: i.unidade,
        }))
      );
      setEditing(false);
    }
  }, [ficha]);

  if (!ficha) return null;

  const currentIngredientes = editing ? editIngredientes : ficha.ingredientes.map(i => ({
    produto_id: i.produto_id, quantidade: i.quantidade, unidade: i.unidade,
  }));

  const totalCost = calcCostFromProdutos(currentIngredientes, produtosMap);
  const porcoes = editing ? editPorcoes : ficha.porcoes;
  const precoVenda = editing ? editPreco : ficha.preco_venda;
  const costPerPortion = porcoes > 0 ? totalCost / porcoes : 0;
  const margin = precoVenda > 0 ? ((precoVenda - costPerPortion) / precoVenda) * 100 : 0;
  const racio = precoVenda > 0 ? (costPerPortion / precoVenda) * 100 : 0;

  const handleSave = async () => {
    await updateFicha.mutateAsync({
      id: ficha.id,
      nome: editNome,
      categoria: ficha.categoria,
      porcoes: editPorcoes,
      preco_venda: editPreco,
      tempo_preparacao: editTempo,
      foto_url: ficha.foto_url,
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
    // Auto-set unidade from produto
    if (field === 'produto_id') {
      const p = produtosMap.get(value);
      if (p) copy[index].unidade = p.unidade;
    }
    setEditIngredientes(copy);
  };

  // Produtos not yet used in this ficha
  const usedProdutoIds = new Set(editIngredientes.map(i => i.produto_id));

  return (
    <Dialog open={!!ficha} onOpenChange={open => { if (!open) { setEditing(false); onClose(); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Photo header */}
        {ficha.foto_url ? (
          <div className="relative -mx-6 -mt-6 mb-4 aspect-[16/9] overflow-hidden rounded-t-lg">
            <img src={ficha.foto_url} alt={ficha.nome} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
              <h2 className="text-lg font-display text-white">{editing ? editNome : ficha.nome}</h2>
              {!editing && (
                <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => setEditing(true)}>
                  <Edit3 className="h-3.5 w-3.5" /> Editar
                </Button>
              )}
            </div>
          </div>
        ) : (
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-primary" />
                {editing ? editNome : ficha.nome}
              </DialogTitle>
              {!editing && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditing(true)}>
                  <Edit3 className="h-3.5 w-3.5" /> Editar
                </Button>
              )}
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
              <label className="text-xs text-muted-foreground">Recipiente (Dose)</label>
              <Select value={String(editPorcoes)} onValueChange={v => setEditPorcoes(Number(v))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(recipientCapacity).map(([key, val]) => (
                    <SelectItem key={key} value={String(val.capacityKg)}>
                      {val.label} ({val.capacityKg}kg)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Preço Venda (€)</label>
              <Input type="number" step="0.01" value={editPreco} onChange={e => setEditPreco(parseFloat(e.target.value) || 0)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Tempo Prep. (min)</label>
              <Input type="number" value={editTempo} onChange={e => setEditTempo(parseInt(e.target.value) || 0)} className="mt-1" />
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
            <p className="text-xs text-muted-foreground">Custo/Dose</p>
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
                      <td className="px-3 py-2 text-right text-muted-foreground">€{cost.toFixed(2)}</td>
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
                <tr className="border-t-2 border-border bg-muted/30">
                  <td colSpan={3} className="px-3 py-2 font-semibold text-foreground">
                    Total ({Object.values(recipientCapacity).find(r => r.capacityKg === porcoes)?.label ?? `${porcoes}kg`})
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-foreground">€{totalCost.toFixed(2)}</td>
                  {editing && <td></td>}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {!editing && ficha.tempo_preparacao ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Tempo de preparação: {ficha.tempo_preparacao} min</span>
          </div>
        ) : null}

        {/* Save/Cancel buttons */}
        {editing && (
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => {
              setEditing(false);
              // Reset to original
              setEditIngredientes(ficha.ingredientes.map(i => ({ produto_id: i.produto_id, quantidade: i.quantidade, unidade: i.unidade })));
              setEditPorcoes(ficha.porcoes);
              setEditPreco(ficha.preco_venda);
              setEditTempo(ficha.tempo_preparacao ?? 0);
              setEditNome(ficha.nome);
            }}>
              <X className="h-4 w-4 mr-1.5" /> Cancelar
            </Button>
            <Button onClick={handleSave} disabled={updateFicha.isPending}>
              <Save className="h-4 w-4 mr-1.5" />
              {updateFicha.isPending ? 'A guardar...' : 'Guardar'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
