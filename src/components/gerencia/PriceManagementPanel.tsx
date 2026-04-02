import { useState, useEffect } from 'react';
import { Save, Euro, UtensilsCrossed, Wine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { beverageMenu, PRICING, type BeverageCategory } from '@/lib/mock-data';
import { motion } from 'framer-motion';

const STORAGE_KEY_BEVERAGES = 'mg_beverage_prices';
const STORAGE_KEY_MEALS = 'mg_meal_prices';

export type MealPrices = typeof PRICING;

export function loadMealPrices(): MealPrices {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_MEALS);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { ...PRICING };
}

export function loadBeveragePrices(): BeverageCategory[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_BEVERAGES);
    if (stored) return JSON.parse(stored);
  } catch {}
  return beverageMenu.map(c => ({ ...c, items: c.items.map(i => ({ ...i })) }));
}

export default function PriceManagementPanel() {
  const [mealPrices, setMealPrices] = useState<MealPrices>(loadMealPrices);
  const [bevPrices, setBevPrices] = useState<BeverageCategory[]>(loadBeveragePrices);
  const [dirty, setDirty] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const updateMeal = (key: keyof MealPrices, val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    setMealPrices(prev => ({ ...prev, [key]: num }));
    setDirty(true);
  };

  const updateBev = (catIdx: number, itemIdx: number, val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    setBevPrices(prev => {
      const next = prev.map(c => ({ ...c, items: c.items.map(i => ({ ...i })) }));
      next[catIdx].items[itemIdx].price = num;
      return next;
    });
    setDirty(true);
  };

  const save = () => {
    localStorage.setItem(STORAGE_KEY_MEALS, JSON.stringify(mealPrices));
    localStorage.setItem(STORAGE_KEY_BEVERAGES, JSON.stringify(bevPrices));

    // Update runtime objects
    (PRICING as any).adultWeekdayLunch = mealPrices.adultWeekdayLunch;
    (PRICING as any).adultPremium = mealPrices.adultPremium;
    (PRICING as any).child2to6 = mealPrices.child2to6;
    (PRICING as any).child7to12 = mealPrices.child7to12;

    bevPrices.forEach((cat, ci) => {
      cat.items.forEach((item, ii) => {
        if (beverageMenu[ci]?.items[ii]) {
          beverageMenu[ci].items[ii].price = item.price;
        }
      });
    });

    setDirty(false);
    toast.success('Preços atualizados com sucesso');
  };

  const mealLabels: Record<keyof MealPrices, string> = {
    adultWeekdayLunch: 'Adulto Almoço (Seg–Sex)',
    adultPremium: 'Adulto Premium (Jantar/Fds/Feriado)',
    child2to6: 'Criança 2–6 anos',
    child7to12: 'Criança 7–12 anos',
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
                <Input
                  type="number"
                  step="0.05"
                  min="0"
                  value={mealPrices[key]}
                  onChange={e => updateMeal(key, e.target.value)}
                  className="w-24 h-8 text-right text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Beverage pricing */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg text-card-foreground flex items-center gap-2 mb-4">
          <Wine className="h-5 w-5 text-primary" /> Preços de Bebidas
        </h2>
        <div className="space-y-2">
          {bevPrices.map((cat, ci) => (
            <div key={cat.category} className="rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setExpandedCat(expandedCat === cat.category ? null : cat.category)}
                className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm font-medium text-foreground">{cat.category}</span>
                <Badge variant="outline" className="text-xs">{cat.items.length} artigos</Badge>
              </button>
              {expandedCat === cat.category && (
                <div className="border-t border-border p-3 space-y-2 bg-muted/20">
                  {cat.items.map((item, ii) => (
                    <div key={item.name} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-foreground truncate flex-1">{item.name}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">€</span>
                        <Input
                          type="number"
                          step="0.05"
                          min="0"
                          value={item.price}
                          onChange={e => updateBev(ci, ii, e.target.value)}
                          className="w-24 h-8 text-right text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Save button */}
      {dirty && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="sticky bottom-4">
          <Button onClick={save} size="lg" className="w-full gap-2">
            <Save className="h-4 w-4" /> Guardar Alterações de Preços
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
