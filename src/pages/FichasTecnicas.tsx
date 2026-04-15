import { useState } from 'react';
import { ChefHat, Plus, Clock, Search, Utensils, Loader2, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFichasTecnicas, LABOR_COST_PER_HOUR, type FichaComIngredientes } from '@/hooks/useFichasTecnicas';
import { FichaDetailDialog } from '@/components/fichas/FichaDetailDialog';
import { FichaCreateForm } from '@/components/fichas/FichaCreateForm';
import { FichaImportDialog } from '@/components/fichas/FichaImportDialog';

const categoryLabels: Record<string, string> = {
  entrada: 'Entrada',
  prato_principal: 'Prato Principal',
  sobremesa: 'Sobremesa',
  sopa: 'Sopa',
  acompanhamento: 'Acompanhamento',
  carne: 'Carne',
  peixe: 'Peixe',
  vegetariano: 'Vegetariano',
  geral: 'Geral',
};

const categoryColors: Record<string, string> = {
  entrada: 'bg-secondary text-secondary-foreground',
  prato_principal: 'bg-primary/10 text-primary',
  sobremesa: 'bg-warning/10 text-warning',
  sopa: 'bg-success/10 text-success',
  acompanhamento: 'bg-muted text-muted-foreground',
  carne: 'bg-destructive/10 text-destructive',
  peixe: 'bg-primary/10 text-primary',
  vegetariano: 'bg-success/10 text-success',
  geral: 'bg-muted text-muted-foreground',
};

function calcCost(ficha: FichaComIngredientes) {
  const ingredientCost = ficha.ingredientes.reduce((sum, ing) => {
    const cost = ing.produto?.custo_medio ?? 0;
    return sum + ing.quantidade * cost;
  }, 0);
  const laborCost = ((ficha.tempo_preparacao ?? 0) / 60) * LABOR_COST_PER_HOUR;
  return ingredientCost + laborCost;
}

export default function FichasTecnicas() {
  const { data: fichas = [], isLoading } = useFichasTecnicas();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedFicha, setSelectedFicha] = useState<FichaComIngredientes | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const categories = ['all', ...new Set(fichas.map(f => f.categoria))];

  const filtered = fichas.filter(f => {
    const matchSearch = f.nome.toLowerCase().includes(search.toLowerCase());
    const matchCategory = selectedCategory === 'all' || f.categoria === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-foreground">Fichas Técnicas</h1>
          <p className="mt-1 text-muted-foreground">Receitas, ingredientes e custos de cada prato</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4" />
            Importar Excel
          </Button>
          <Button className="gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Nova Ficha
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Procurar prato..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
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

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12">
          <ChefHat className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-2 text-muted-foreground">Nenhuma ficha técnica encontrada</p>
          <Button variant="outline" className="mt-4 gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Criar primeira ficha
          </Button>
        </div>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((ficha, i) => {
            const cost = calcCost(ficha);
            const costPerPortion = ficha.porcoes > 0 ? cost / ficha.porcoes : 0;
            const margin = ficha.preco_venda > 0
              ? ((ficha.preco_venda - costPerPortion) / ficha.preco_venda) * 100
              : 0;

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
                {ficha.foto_url ? (
                  <div className="-mx-5 -mt-5 mb-3 aspect-[16/9] overflow-hidden rounded-t-xl">
                    <img src={ficha.foto_url} alt={ficha.nome} className="w-full h-full object-cover" />
                  </div>
                ) : null}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {!ficha.foto_url && (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <ChefHat className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-sans text-sm font-semibold text-card-foreground">{ficha.nome}</h3>
                      <Badge variant="secondary" className={cn('mt-1 text-[10px]', categoryColors[ficha.categoria])}>
                        {categoryLabels[ficha.categoria] || ficha.categoria}
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
                    <p className="text-sm font-bold text-foreground">€{ficha.preco_venda.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Margem</p>
                    <p className={cn('text-sm font-bold', margin >= 65 ? 'text-success' : margin >= 50 ? 'text-warning' : 'text-destructive')}>
                      {margin.toFixed(0)}%
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Utensils className="h-3 w-3" />{ficha.ingredientes.length} ingredientes</span>
                  {ficha.tempo_preparacao && (
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{ficha.tempo_preparacao} min</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Dialogs */}
      <FichaDetailDialog ficha={selectedFicha} onClose={() => setSelectedFicha(null)} />
      <FichaCreateForm open={showCreate} onClose={() => setShowCreate(false)} />
      <FichaImportDialog open={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
}
