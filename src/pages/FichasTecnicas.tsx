import { useState } from 'react';
import { ChefHat, Plus, Euro, Clock, Search, Utensils } from 'lucide-react';
import { mockFichasTecnicas, type FichaTecnica } from '@/lib/mock-data';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const categoryLabels: Record<string, string> = {
  carne: 'Carne',
  peixe: 'Peixe',
  vegetariano: 'Vegetariano',
  sobremesa: 'Sobremesa',
  entrada: 'Entrada',
};

const categoryColors: Record<string, string> = {
  carne: 'bg-destructive/10 text-destructive',
  peixe: 'bg-primary/10 text-primary',
  vegetariano: 'bg-success/10 text-success',
  sobremesa: 'bg-warning/10 text-warning',
  entrada: 'bg-secondary text-secondary-foreground',
};

function calcCost(ficha: FichaTecnica) {
  return ficha.ingredients.reduce((sum, ing) => sum + ing.quantity * ing.costPerUnit, 0);
}

function FichaDetail({ ficha }: { ficha: FichaTecnica }) {
  const totalCost = calcCost(ficha);
  const costPerPortion = totalCost / ficha.portions;
  const margin = ((ficha.sellingPrice - costPerPortion) / ficha.sellingPrice) * 100;

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-xs text-muted-foreground">Custo/Dose</p>
          <p className="text-lg font-bold text-foreground">€{costPerPortion.toFixed(2)}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-xs text-muted-foreground">Preço Venda</p>
          <p className="text-lg font-bold text-foreground">€{ficha.sellingPrice.toFixed(2)}</p>
        </div>
        <div className={cn('rounded-lg p-3 text-center', margin >= 65 ? 'bg-success/10' : margin >= 50 ? 'bg-warning/10' : 'bg-destructive/10')}>
          <p className="text-xs text-muted-foreground">Margem</p>
          <p className={cn('text-lg font-bold', margin >= 65 ? 'text-success' : margin >= 50 ? 'text-warning' : 'text-destructive')}>
            {margin.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Ingredients table */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-foreground">Ingredientes</h4>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Ingrediente</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Qtd</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">€/Unid</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {ficha.ingredients.map((ing, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-3 py-2 text-foreground">{ing.name}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{ing.quantity} {ing.unit}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">€{ing.costPerUnit.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-medium text-foreground">€{(ing.quantity * ing.costPerUnit).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-border bg-muted/30">
                <td colSpan={3} className="px-3 py-2 font-semibold text-foreground">Total ({ficha.portions} dose{ficha.portions > 1 ? 's' : ''})</td>
                <td className="px-3 py-2 text-right font-bold text-foreground">€{totalCost.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Tempo de preparação: {ficha.preparationTime} min</span>
      </div>
    </div>
  );
}

export default function FichasTecnicas() {
  const [fichas] = useState(mockFichasTecnicas);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFicha, setSelectedFicha] = useState<FichaTecnica | null>(null);

  const categories = ['all', ...new Set(fichas.map(f => f.category))];

  const filtered = fichas.filter(f => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = selectedCategory === 'all' || f.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-foreground">Fichas Técnicas</h1>
          <p className="mt-1 text-muted-foreground">Receitas, ingredientes e custos de cada prato</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Ficha
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Procurar prato..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {cat === 'all' ? 'Todos' : categoryLabels[cat] || cat}
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((ficha, i) => {
            const cost = calcCost(ficha);
            const costPerPortion = cost / ficha.portions;
            const margin = ((ficha.sellingPrice - costPerPortion) / ficha.sellingPrice) * 100;

            return (
              <motion.div
                key={ficha.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedFicha(ficha)}
                className="cursor-pointer rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <ChefHat className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-sans text-sm font-semibold text-card-foreground">{ficha.name}</h3>
                      <Badge variant="secondary" className={cn('mt-1 text-[10px]', categoryColors[ficha.category])}>
                        {categoryLabels[ficha.category]}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Custo</p>
                    <p className="text-sm font-bold text-foreground">€{costPerPortion.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Venda</p>
                    <p className="text-sm font-bold text-foreground">€{ficha.sellingPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Margem</p>
                    <p className={cn('text-sm font-bold', margin >= 65 ? 'text-success' : margin >= 50 ? 'text-warning' : 'text-destructive')}>
                      {margin.toFixed(0)}%
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Utensils className="h-3 w-3" />{ficha.ingredients.length} ingredientes</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{ficha.preparationTime} min</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedFicha} onOpenChange={open => !open && setSelectedFicha(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-primary" />
              {selectedFicha?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedFicha && <FichaDetail ficha={selectedFicha} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
