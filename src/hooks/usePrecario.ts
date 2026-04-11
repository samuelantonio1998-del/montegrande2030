import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast-with-sound';

export type BebidaItem = {
  id: string;
  nome: string;
  preco: number;
  categoria: string;
  ordem: number;
  ativo: boolean;
  tipo_servico: 'unidade' | 'dose';
  dose_ml: number | null;
  garrafa_ml: number | null;
};

export type BeverageItem = { id: string; name: string; price: number; tipoServico: 'unidade' | 'dose'; doseMl: number | null; garrafaMl: number | null; produtoId: string | null };

export type BeverageCategory = {
  category: string;
  items: BeverageItem[];
};

export type MealPrices = {
  adultWeekdayLunch: number;
  adultPremium: number;
  child2to6: number;
  child7to12: number;
  sobremesa: number;
};

const MEAL_KEY_MAP: Record<string, keyof MealPrices> = {
  almoco_semana: 'adultWeekdayLunch',
  almoco_premium: 'adultPremium',
  crianca_2_6: 'child2to6',
  crianca_7_12: 'child7to12',
  sobremesa: 'sobremesa',
};

const MEAL_DEFAULTS: MealPrices = {
  adultWeekdayLunch: 14.75,
  adultPremium: 18.95,
  child2to6: 6.50,
  child7to12: 10.00,
  sobremesa: 3.50,
};

export function usePrecario() {
  const [bebidas, setBebidas] = useState<BebidaItem[]>([]);
  const [mealPrices, setMealPrices] = useState<MealPrices>(MEAL_DEFAULTS);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [bevRes, priceRes] = await Promise.all([
      supabase.from('precario_bebidas').select('*').eq('ativo', true).order('categoria').order('ordem'),
      supabase.from('configuracao_precos').select('*'),
    ]);
    if (bevRes.data) setBebidas(bevRes.data as unknown as BebidaItem[]);
    if (priceRes.data) {
      const prices = { ...MEAL_DEFAULTS };
      (priceRes.data as unknown as { chave: string; valor: number }[]).forEach(row => {
        const key = MEAL_KEY_MAP[row.chave];
        if (key) prices[key] = row.valor;
      });
      setMealPrices(prices);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Grouped by category
  const beverageMenu = useMemo((): BeverageCategory[] => {
    const map = new Map<string, BeverageCategory>();
    bebidas.forEach(b => {
      if (!map.has(b.categoria)) map.set(b.categoria, { category: b.categoria, items: [] });
      map.get(b.categoria)!.items.push({ id: b.id, name: b.nome, price: b.preco, tipoServico: b.tipo_servico, doseMl: b.dose_ml, garrafaMl: b.garrafa_ml, produtoId: (b as any).produto_id || null });
    });
    return Array.from(map.values());
  }, [bebidas]);

  const beverageMenuFlat = useMemo(() => bebidas.map(b => ({ id: b.id, name: b.nome, price: b.preco, tipoServico: b.tipo_servico, doseMl: b.dose_ml, garrafaMl: b.garrafa_ml, produtoId: (b as any).produto_id || null })), [bebidas]);

  // CRUD
  const updateBebidaPrice = useCallback(async (id: string, preco: number) => {
    await supabase.from('precario_bebidas').update({ preco }).eq('id', id);
  }, []);

  const addBebida = useCallback(async (nome: string, preco: number, categoria: string) => {
    const maxOrdem = bebidas.filter(b => b.categoria === categoria).length;
    await supabase.from('precario_bebidas').insert({ nome, preco, categoria, ordem: maxOrdem + 1 });
    await fetchAll();
  }, [bebidas, fetchAll]);

  const deleteBebida = useCallback(async (id: string) => {
    await supabase.from('precario_bebidas').delete().eq('id', id);
    await fetchAll();
  }, [fetchAll]);

  const deleteCategoria = useCallback(async (categoria: string) => {
    await supabase.from('precario_bebidas').delete().eq('categoria', categoria);
    await fetchAll();
  }, [fetchAll]);

  const addCategoria = useCallback(async (nome: string) => {
    // Just a placeholder item to create the category
    // The user will add items afterwards
  }, []);

  const saveMealPrices = useCallback(async (prices: MealPrices) => {
    const updates = Object.entries(MEAL_KEY_MAP).map(([chave, key]) =>
      supabase.from('configuracao_precos').update({ valor: prices[key] }).eq('chave', chave)
    );
    await Promise.all(updates);
    setMealPrices(prices);
    toast.success('Preços atualizados');
  }, []);

  const saveBevPrices = useCallback(async (categories: BeverageCategory[]) => {
    // Batch update all prices
    for (const cat of categories) {
      for (const item of cat.items) {
        if (item.id) {
          await supabase.from('precario_bebidas').update({ preco: item.price }).eq('id', item.id);
        }
      }
    }
    await fetchAll();
  }, [fetchAll]);

  return {
    bebidas, beverageMenu, beverageMenuFlat, mealPrices, loading,
    updateBebidaPrice, addBebida, deleteBebida, deleteCategoria, addCategoria,
    saveMealPrices, saveBevPrices, fetchAll,
  };
}

// Utility functions that work with MealPrices
export function isWeekdayLunch(): boolean {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  return day >= 1 && day <= 5 && hour < 16;
}

export function getAdultPrice(prices: MealPrices): number {
  return isWeekdayLunch() ? prices.adultWeekdayLunch : prices.adultPremium;
}

export function calcMesaTotal(mesa: { adults: number; children2to6: number; children7to12: number; beverages: { quantity: number; unitPrice: number }[] }, prices: MealPrices) {
  const adultPrice = getAdultPrice(prices);
  const coverTotal = mesa.adults * adultPrice + mesa.children2to6 * prices.child2to6 + mesa.children7to12 * prices.child7to12;
  const beverageTotal = mesa.beverages.reduce((s, b) => s + b.quantity * b.unitPrice, 0);
  return { coverTotal, beverageTotal, total: coverTotal + beverageTotal };
}
