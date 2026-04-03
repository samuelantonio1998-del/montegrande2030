import { useState } from 'react';
import { Save, Euro, UtensilsCrossed, Wine, Plus, Trash2, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { usePrecario, type MealPrices } from '@/hooks/usePrecario';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const mealLabels: Record<keyof MealPrices, string> = {
  adultWeekdayLunch: 'Adulto Almoço (Seg–Sex)',
  adultPremium: 'Adulto Premium (Jantar/Fds/Feriado)',
  child2to6: 'Criança 2–6 anos',
  child7to12: 'Criança 7–12 anos',
  sobremesa: 'Sobremesa (preço único)',
};

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

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{ catIdx: number; itemIdx?: number } | null>(null);

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
          {(Object.keys(mealLabels) as (keyof MealPrices)[]).map(key => (
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
                    <div key={item.id || item.name + ii} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-foreground truncate flex-1">{item.name}</span>
                      <div className="flex items-center gap-1">
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
