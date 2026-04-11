import { useState, useEffect } from 'react';
import { Save, Euro, UtensilsCrossed, Wine, Plus, Trash2, FolderPlus, CakeSlice, GlassWater, Droplets, Pencil, Check, X, Link, Unlink, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/lib/toast-with-sound';
import { cn } from '@/lib/utils';
import { usePrecario, type MealPrices, type BeverageItem } from '@/hooks/usePrecario';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

const mealLabels: Record<string, string> = {
  adultWeekdayLunch: 'Adulto Almoço (Seg–Sex)',
  adultPremium: 'Adulto Premium (Jantar/Fds/Feriado)',
  child2to6: 'Criança 2–6 anos',
  child7to12: 'Criança 7–12 anos',
};

const MEAL_KEYS: (keyof MealPrices)[] = ['adultWeekdayLunch', 'adultPremium', 'child2to6', 'child7to12'];

export default function PriceManagementPanel() {
  const { beverageMenu, mealPrices, saveMealPrices, saveBevPrices, addBebida, deleteBebida, deleteCategoria, fetchAll } = usePrecario();
  
  const [localMealPrices, setLocalMealPrices] = useState<MealPrices>(mealPrices);
  const [localBev, setLocalBev] = useState(beverageMenu);
  const [dirty, setDirty] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  // Sync when data loads
  const [prevMeal, setPrevMeal] = useState(mealPrices);
  if (JSON.stringify(mealPrices) !== JSON.stringify(prevMeal)) {
    setPrevMeal(mealPrices);
    setLocalMealPrices(mealPrices);
  }
  const [prevBev, setPrevBev] = useState(beverageMenu);
  if (JSON.stringify(beverageMenu) !== JSON.stringify(prevBev)) {
    setPrevBev(beverageMenu);
    setLocalBev(beverageMenu);
  }

  // Add item dialog
  const [addDialogCat, setAddDialogCat] = useState<number | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  // Add category dialog
  const [showCatDialog, setShowCatDialog] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<{ catIdx: number; itemIdx?: number } | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [linkItem, setLinkItem] = useState<BeverageItem | null>(null);
  const [produtos, setProdutos] = useState<{ id: string; nome: string; unidade: string; categoria: string }[]>([]);
  const [linkSearch, setLinkSearch] = useState('');

  useEffect(() => {
    if (linkItem) {
      supabase.from('produtos').select('id, nome, unidade, categoria').eq('ativo', true).order('nome')
        .then(({ data }) => { if (data) setProdutos(data); });
      setLinkSearch(linkItem.name);
    }
  }, [linkItem]);

  const filteredProdutos = produtos.filter(p =>
    p.nome.toLowerCase().includes(linkSearch.toLowerCase())
  ).slice(0, 15);

  const linkToProduto = async (bevId: string, produtoId: string | null) => {
    await supabase.from('precario_bebidas').update({ produto_id: produtoId }).eq('id', bevId);
    await fetchAll();
    setLinkItem(null);
    toast.success(produtoId ? 'Artigo ligado ao inventário' : 'Ligação removida');
  };

  const updateMeal = (key: keyof MealPrices, val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    setLocalMealPrices(prev => ({ ...prev, [key]: num }));
    setDirty(true);
  };

  const updateBev = (catIdx: number, itemIdx: number, val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    setLocalBev(prev => {
      const next = prev.map(c => ({ ...c, items: c.items.map(i => ({ ...i })) }));
      next[catIdx].items[itemIdx].price = num;
      return next;
    });
    setDirty(true);
  };

  const handleAddItem = async () => {
    if (addDialogCat === null || !newItemName.trim()) return;
    const price = parseFloat(newItemPrice) || 0;
    const categoria = localBev[addDialogCat]?.category;
    if (categoria) {
      await addBebida(newItemName.trim(), price, categoria);
    }
    setAddDialogCat(null);
    setNewItemName('');
    setNewItemPrice('');
  };

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    // Add a placeholder item to create the category
    await addBebida('Novo artigo', 0, newCatName.trim());
    setExpandedCat(newCatName.trim());
    setShowCatDialog(false);
    setNewCatName('');
  };

  const toggleServico = async (item: BeverageItem) => {
    if (!item.id) return;
    const isDose = item.tipoServico === 'dose';
    const newTipo = isDose ? 'unidade' : 'dose';
    const newDose = isDose ? null : 50;
    const newGarrafa = isDose ? null : 750;
    await supabase.from('precario_bebidas').update({
      tipo_servico: newTipo,
      dose_ml: newDose,
      garrafa_ml: newGarrafa,
    }).eq('id', item.id);
    await fetchAll();
    toast.success(isDose ? `${item.name}: servido à unidade` : `${item.name}: servido à dose (50ml)`);
  };

  const renameItem = async (itemId: string, newName: string) => {
    if (!newName.trim()) return;
    await supabase.from('precario_bebidas').update({ nome: newName.trim() }).eq('id', itemId);
    await fetchAll();
    setEditingItemId(null);
    toast.success('Nome atualizado');
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.itemIdx !== undefined) {
      const item = localBev[deleteTarget.catIdx]?.items[deleteTarget.itemIdx];
      if (item?.id) await deleteBebida(item.id);
    } else {
      const cat = localBev[deleteTarget.catIdx];
      if (cat) await deleteCategoria(cat.category);
    }
    setDeleteTarget(null);
  };

  const save = async () => {
    await saveMealPrices(localMealPrices);
    await saveBevPrices(localBev);
    setDirty(false);
    toast.success('Preços atualizados com sucesso');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
      {/* Meal pricing */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-card-foreground flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-primary" /> Preços de Refeição
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MEAL_KEYS.map(key => (
            <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <span className="text-sm text-foreground">{mealLabels[key]}</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">€</span>
                <Input type="number" step="0.05" min="0" value={localMealPrices[key]} onChange={e => updateMeal(key, e.target.value)} className="w-24 h-8 text-right text-sm" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dessert pricing */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-card-foreground flex items-center gap-2">
            <CakeSlice className="h-5 w-5 text-primary" /> Preços de Sobremesa
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <span className="text-sm text-foreground">Sobremesa (preço único)</span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">€</span>
              <Input type="number" step="0.05" min="0" value={localMealPrices.sobremesa} onChange={e => updateMeal('sobremesa', e.target.value)} className="w-24 h-8 text-right text-sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Beverage pricing */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-card-foreground flex items-center gap-2">
            <Wine className="h-5 w-5 text-primary" /> Preços de Bebidas
          </h2>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowCatDialog(true)}>
            <FolderPlus className="h-4 w-4" /> Nova Categoria
          </Button>
        </div>
        <div className="space-y-2">
          {localBev.map((cat, ci) => (
            <div key={cat.category + ci} className="rounded-lg border border-border overflow-hidden">
              <button onClick={() => setExpandedCat(expandedCat === cat.category ? null : cat.category)} className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                <span className="text-sm font-medium text-foreground">{cat.category}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{cat.items.length} artigos</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); setDeleteTarget({ catIdx: ci }); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </button>
              {expandedCat === cat.category && (
                <div className="border-t border-border p-3 space-y-2 bg-muted/20">
                   {cat.items.map((item, ii) => (
                    <div key={item.id || item.name + ii} className="flex items-center justify-between gap-2">
                      {editingItemId === item.id ? (
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <Input
                            value={editItemName}
                            onChange={e => setEditItemName(e.target.value)}
                            className="h-7 text-sm flex-1"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter' && item.id) renameItem(item.id, editItemName);
                              if (e.key === 'Escape') setEditingItemId(null);
                            }}
                          />
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => item.id && renameItem(item.id, editItemName)}>
                            <Check className="h-3.5 w-3.5 text-success" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setEditingItemId(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          className="group flex items-center gap-1.5 text-sm text-foreground truncate flex-1 text-left hover:text-primary transition-colors"
                          onClick={() => { setEditingItemId(item.id || null); setEditItemName(item.name); }}
                        >
                          {item.name}
                          <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
                        </button>
                       )}
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn('h-7 w-7 shrink-0', item.produtoId ? 'text-success' : 'text-muted-foreground')}
                          onClick={() => setLinkItem(item)}
                          title={item.produtoId ? 'Ligado ao inventário (clique para alterar)' : 'Sem ligação ao inventário (clique para ligar)'}
                        >
                          {item.produtoId ? <Link className="h-3.5 w-3.5" /> : <Unlink className="h-3.5 w-3.5" />}
                        </Button>
                        <button
                          onClick={() => toggleServico(item)}
                          className={cn(
                            'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors shrink-0',
                            item.tipoServico === 'dose'
                              ? 'bg-primary/10 text-primary hover:bg-primary/20'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          )}
                          title={item.tipoServico === 'dose' ? `Dose: ${item.doseMl}ml (garrafa ${item.garrafaMl}ml)` : 'Unidade inteira'}
                        >
                          {item.tipoServico === 'dose' ? (
                            <><Droplets className="h-3 w-3" /> {item.doseMl}ml</>
                          ) : (
                            <><GlassWater className="h-3 w-3" /> Un.</>
                          )}
                        </button>
                        <span className="text-xs text-muted-foreground">€</span>
                        <Input type="number" step="0.05" min="0" value={item.price} onChange={e => updateBev(ci, ii, e.target.value)} className="w-24 h-8 text-right text-sm" />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ catIdx: ci, itemIdx: ii })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full gap-1.5 mt-2" onClick={() => { setAddDialogCat(ci); setNewItemName(''); setNewItemPrice(''); }}>
                    <Plus className="h-4 w-4" /> Adicionar Artigo
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {dirty && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="sticky bottom-4">
          <Button onClick={save} size="lg" className="w-full gap-2"><Save className="h-4 w-4" /> Guardar Alterações de Preços</Button>
        </motion.div>
      )}

      <Dialog open={addDialogCat !== null} onOpenChange={open => { if (!open) setAddDialogCat(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Adicionar Artigo</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><label className="text-sm text-muted-foreground">Nome</label><Input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Ex: Água c/ Gás 0,5l" /></div>
            <div><label className="text-sm text-muted-foreground">Preço (€)</label><Input type="number" step="0.05" min="0" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} placeholder="0.00" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogCat(null)}>Cancelar</Button>
            <Button onClick={handleAddItem} disabled={!newItemName.trim()}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCatDialog} onOpenChange={setShowCatDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nova Categoria</DialogTitle></DialogHeader>
          <div className="py-2"><label className="text-sm text-muted-foreground">Nome da categoria</label><Input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Ex: Sobremesas" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCatDialog(false)}>Cancelar</Button>
            <Button onClick={addCategory} disabled={!newCatName.trim()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminação</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.itemIdx !== undefined
                ? `Eliminar "${localBev[deleteTarget.catIdx]?.items[deleteTarget.itemIdx]?.name}"?`
                : `Eliminar a categoria "${localBev[deleteTarget?.catIdx ?? 0]?.category}" e todos os seus artigos?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
