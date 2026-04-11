import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast-with-sound';
import { Loader2, Search, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

type ActivityLog = {
  id: string;
  user_name: string;
  user_role: string;
  action: string;
  module: string;
  details: string;
  created_at: string;
  metadata: Record<string, any> | null;
};

type Movimentacao = {
  id: string;
  produto_id: string;
  quantidade: number;
  custo_unitario: number | null;
  tipo: string;
  created_at: string;
};

type Produto = {
  id: string;
  nome: string;
  unidade: string;
  stock_atual: number;
};

type Props = {
  entry: ActivityLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function EditInventoryEntryDialog({ entry, open, onOpenChange, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [finding, setFinding] = useState(false);
  const [mov, setMov] = useState<Movimentacao | null>(null);
  const [produto, setProduto] = useState<Produto | null>(null);
  const [quantidade, setQuantidade] = useState('');
  const [custoUnitario, setCustoUnitario] = useState('');

  // Product reassignment
  const [allProdutos, setAllProdutos] = useState<Produto[]>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [newProdutoId, setNewProdutoId] = useState<string | null>(null);
  const [saveAlias, setSaveAlias] = useState(true);
  const [originalItemName, setOriginalItemName] = useState('');

  useEffect(() => {
    if (!open || !entry?.metadata) {
      setMov(null);
      setProduto(null);
      setShowProductPicker(false);
      setNewProdutoId(null);
      setSaveAlias(true);
      return;
    }
    findMovimentacao();
    fetchProdutos();
  }, [open, entry]);

  const fetchProdutos = async () => {
    const { data } = await supabase.from('produtos').select('id, nome, unidade, stock_atual').eq('ativo', true).order('nome');
    if (data) setAllProdutos(data);
  };

  const findMovimentacao = async () => {
    if (!entry?.metadata) return;
    setFinding(true);
    try {
      const meta = entry.metadata;
      const produtoId = meta.produto_id as string | undefined;
      const logTime = new Date(entry.created_at);

      // Parse original item name from details (e.g. "ITEM NAME +5 kg")
      const detailParts = entry.details?.match(/^(.+?)\s*[+-]\d/);
      setOriginalItemName(detailParts?.[1]?.trim() || entry.details || '');

      let query = supabase.from('movimentacoes').select('id, produto_id, quantidade, custo_unitario, tipo, created_at');
      if (produtoId) query = query.eq('produto_id', produtoId);

      const before = new Date(logTime.getTime() - 5 * 60000).toISOString();
      const after = new Date(logTime.getTime() + 5 * 60000).toISOString();
      query = query.gte('created_at', before).lte('created_at', after).eq('tipo', 'entrada');

      const { data } = await query.order('created_at', { ascending: false }).limit(1);

      if (data?.[0]) {
        const m = data[0] as unknown as Movimentacao;
        setMov(m);
        setQuantidade(String(m.quantidade));
        setCustoUnitario(String(m.custo_unitario ?? ''));
        setNewProdutoId(null);

        const { data: prod } = await supabase.from('produtos').select('id, nome, unidade, stock_atual').eq('id', m.produto_id).single();
        if (prod) setProduto(prod);
      } else {
        setProduto(null);
        setMov(null);
        setQuantidade(String(meta.quantidade ?? ''));
        setCustoUnitario(String(meta.custo_unitario ?? ''));
      }
    } catch (e) {
      console.error('Erro ao encontrar movimentação:', e);
    } finally {
      setFinding(false);
    }
  };

  const filteredProdutos = useMemo(() => {
    if (!productSearch.trim()) return allProdutos;
    const s = productSearch.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return allProdutos.filter(p => p.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(s));
  }, [allProdutos, productSearch]);

  const selectedNewProduto = newProdutoId ? allProdutos.find(p => p.id === newProdutoId) : null;
  const effectiveProduto = selectedNewProduto || produto;

  const handleSave = async () => {
    if (!mov || !entry?.metadata) return;
    const newQty = parseFloat(quantidade);
    const newCost = parseFloat(custoUnitario);
    if (isNaN(newQty) || newQty <= 0) {
      toast.error('Quantidade inválida');
      return;
    }

    setLoading(true);
    try {
      const oldQty = mov.quantidade;
      const isReassigning = newProdutoId && newProdutoId !== mov.produto_id;

      if (isReassigning) {
        // Reverse stock from old product
        const { data: oldProd } = await supabase.from('produtos').select('stock_atual').eq('id', mov.produto_id).single();
        if (oldProd) {
          await supabase.from('produtos').update({ stock_atual: Math.max(0, oldProd.stock_atual - oldQty) }).eq('id', mov.produto_id);
        }

        // Add stock to new product
        const { data: newProd } = await supabase.from('produtos').select('stock_atual').eq('id', newProdutoId).single();
        if (newProd) {
          await supabase.from('produtos').update({
            stock_atual: newProd.stock_atual + newQty,
            ...(isNaN(newCost) ? {} : { custo_medio: newCost }),
          }).eq('id', newProdutoId);
        }

        // Update movimentacao to point to new product
        await supabase.from('movimentacoes').update({
          produto_id: newProdutoId,
          quantidade: newQty,
          custo_unitario: isNaN(newCost) ? null : newCost,
        }).eq('id', mov.id);

        // Save alias if checked
        if (saveAlias && originalItemName && selectedNewProduto) {
          const { data: existing } = await supabase.from('produto_aliases' as any).select('id')
            .eq('alias_nome', originalItemName).eq('produto_id', newProdutoId).limit(1);
          if (!existing?.length) {
            await supabase.from('produto_aliases' as any).insert({
              produto_id: newProdutoId,
              alias_nome: originalItemName,
            });
          }
        }

        toast.success(`Entrada movida para "${selectedNewProduto?.nome}"`);
      } else {
        // Same product, just adjust qty/cost
        const diff = newQty - oldQty;
        await supabase.from('movimentacoes').update({
          quantidade: newQty,
          custo_unitario: isNaN(newCost) ? null : newCost,
        }).eq('id', mov.id);

        if (diff !== 0 || !isNaN(newCost)) {
          const { data: prod } = await supabase.from('produtos').select('stock_atual').eq('id', mov.produto_id).single();
          if (prod) {
            await supabase.from('produtos').update({
              stock_atual: Math.max(0, prod.stock_atual + diff),
              ...(isNaN(newCost) ? {} : { custo_medio: newCost }),
            }).eq('id', mov.produto_id);
          }
        }

        toast.success('Entrada de inventário atualizada');
      }

      // Update activity log
      const targetProdName = effectiveProduto?.nome || originalItemName;
      const targetUnit = effectiveProduto?.unidade || '';
      const newDetails = `${targetProdName} +${newQty} ${targetUnit}`;
      await supabase.from('activity_logs').update({
        details: newDetails,
        metadata: {
          ...entry.metadata,
          produto_id: isReassigning ? newProdutoId : mov.produto_id,
          quantidade: newQty,
          custo_unitario: isNaN(newCost) ? null : newCost,
        } as any,
      } as any).eq('id', entry.id);

      onSaved();
      onOpenChange(false);
    } catch (e) {
      console.error('Erro ao atualizar:', e);
      toast.error('Erro ao atualizar entrada');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Entrada de Inventário</DialogTitle>
        </DialogHeader>

        {finding ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !mov ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Não foi possível encontrar o registo de movimentação associado.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Original item name from invoice */}
            {originalItemName && (
              <div className="rounded-lg bg-muted/50 p-3">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Nome na fatura</Label>
                <p className="text-sm font-medium text-foreground mt-0.5">{originalItemName}</p>
              </div>
            )}

            {/* Current product */}
            <div>
              <Label className="text-xs text-muted-foreground">Produto associado</Label>
              <div className="flex items-center gap-2 mt-1">
                {selectedNewProduto ? (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm text-muted-foreground line-through truncate">{produto?.nome}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-sm font-medium text-primary truncate">{selectedNewProduto.nome}</span>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-foreground flex-1 truncate">{produto?.nome || '—'}</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-xs"
                  onClick={() => { setShowProductPicker(!showProductPicker); setProductSearch(''); }}
                >
                  {showProductPicker ? 'Fechar' : 'Trocar'}
                </Button>
              </div>
            </div>

            {/* Product picker */}
            {showProductPicker && (
              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Procurar produto..."
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                    autoFocus
                  />
                </div>
                <ScrollArea className="h-40">
                  <div className="space-y-0.5">
                    {filteredProdutos.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setNewProdutoId(p.id); setShowProductPicker(false); }}
                        className={cn(
                          'w-full text-left rounded-md px-2.5 py-1.5 text-sm transition-colors',
                          p.id === newProdutoId ? 'bg-primary/10 text-primary font-medium' :
                          p.id === mov.produto_id ? 'bg-muted text-muted-foreground' :
                          'hover:bg-muted/50 text-foreground'
                        )}
                      >
                        <span>{p.nome}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">({parseFloat(p.stock_atual.toFixed(2))} {p.unidade})</span>
                        {p.id === mov.produto_id && <span className="text-[10px] text-muted-foreground ml-1">· atual</span>}
                      </button>
                    ))}
                    {filteredProdutos.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">Nenhum produto encontrado</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Save alias checkbox */}
            {newProdutoId && newProdutoId !== mov.produto_id && (
              <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <Checkbox
                  id="save-alias"
                  checked={saveAlias}
                  onCheckedChange={v => setSaveAlias(!!v)}
                  className="mt-0.5"
                />
                <label htmlFor="save-alias" className="text-xs text-foreground cursor-pointer">
                  Guardar <span className="font-medium">"{originalItemName}"</span> como nome alternativo de <span className="font-medium">"{selectedNewProduto?.nome}"</span>
                  <span className="block text-[10px] text-muted-foreground mt-0.5">
                    Nas próximas faturas, este nome será automaticamente associado ao produto correto.
                  </span>
                </label>
              </div>
            )}

            {/* Quantity & Cost */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-qty" className="text-xs">Quantidade ({effectiveProduto?.unidade || ''})</Label>
                <Input id="edit-qty" type="number" step="0.01" min="0" value={quantidade} onChange={e => setQuantidade(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="edit-cost" className="text-xs">Custo Unitário (€)</Label>
                <Input id="edit-cost" type="number" step="0.01" min="0" value={custoUnitario} onChange={e => setCustoUnitario(e.target.value)} />
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground">
              Alterar a quantidade ou o produto irá ajustar automaticamente o stock.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading || !mov}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
