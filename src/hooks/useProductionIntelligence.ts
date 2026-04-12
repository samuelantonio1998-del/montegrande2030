import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMesas } from '@/hooks/useMesas';

type HistoricalRatio = {
  dishName: string;
  avgKgPerPax: number;
  totalDays: number;
  avgKgPerDay: number;
  avgPaxPerDay: number;
};

/** Fetch all production records (not just current week) for historical analysis */
function useAllRegistos() {
  return useQuery({
    queryKey: ['registos_producao_all'],
    queryFn: async () => {
      const allData: { dish_name: string; peso_kg: number; enviado_at: string }[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('registos_producao')
          .select('dish_name, peso_kg, enviado_at')
          .order('enviado_at', { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return allData;
    },
    staleTime: 10 * 60 * 1000,
  });
}

function useVendasForIntelligence() {
  return useQuery({
    queryKey: ['vendas_historico_intel'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendas_historico')
        .select('data, total')
        .gt('total', 5)
        .order('data', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useProductionIntelligence() {
  const { mesas } = useMesas();
  const { data: allRegistos = [] } = useAllRegistos();
  const { data: vendas = [] } = useVendasForIntelligence();

  // Current pax in restaurant (occupied tables)
  const currentPax = useMemo(() => {
    return mesas
      .filter(m => m.status === 'ocupada')
      .reduce((sum, m) => sum + m.adults + (m.children2to6 || 0) + (m.children7to12 || 0), 0);
  }, [mesas]);

  const occupiedTables = useMemo(() => {
    return mesas.filter(m => m.status === 'ocupada').length;
  }, [mesas]);

  // Build pax-per-date lookup from vendas
  const paxByDate = useMemo(() => {
    const map = new Map<string, number>();
    vendas.forEach(v => map.set(v.data, v.total));
    return map;
  }, [vendas]);

  // Compute historical kg/pax ratios per dish
  const ratios = useMemo((): Map<string, HistoricalRatio> => {
    // Group production by date + dish
    const byDateDish = new Map<string, Map<string, number>>();
    allRegistos.forEach(r => {
      const date = r.enviado_at.slice(0, 10);
      if (!byDateDish.has(date)) byDateDish.set(date, new Map());
      const dishMap = byDateDish.get(date)!;
      dishMap.set(r.dish_name, (dishMap.get(r.dish_name) || 0) + r.peso_kg);
    });

    // For each dish, compute average kg/pax across days that have pax data
    const dishStats = new Map<string, { totalKg: number; totalPax: number; days: number }>();

    byDateDish.forEach((dishes, date) => {
      const pax = paxByDate.get(date);
      if (!pax || pax < 5) return; // skip days without meaningful pax data

      dishes.forEach((kg, dishName) => {
        if (!dishStats.has(dishName)) dishStats.set(dishName, { totalKg: 0, totalPax: 0, days: 0 });
        const s = dishStats.get(dishName)!;
        s.totalKg += kg;
        s.totalPax += pax;
        s.days += 1;
      });
    });

    const result = new Map<string, HistoricalRatio>();
    dishStats.forEach((stats, dishName) => {
      if (stats.days < 1) return;
      result.set(dishName, {
        dishName,
        avgKgPerPax: stats.totalKg / stats.totalPax,
        totalDays: stats.days,
        avgKgPerDay: stats.totalKg / stats.days,
        avgPaxPerDay: stats.totalPax / stats.days,
      });
    });

    return result;
  }, [allRegistos, paxByDate]);

  /** Get suggested kg for a dish based on current or expected pax */
  function getSuggestion(dishName: string, pax?: number): { suggestedKg: number; basedOnDays: number; avgKgPerPax: number } | null {
    const ratio = ratios.get(dishName);
    if (!ratio || ratio.totalDays < 1) return null;
    const targetPax = pax ?? currentPax;
    if (targetPax < 1) return null;
    return {
      suggestedKg: Math.round(ratio.avgKgPerPax * targetPax * 10) / 10,
      basedOnDays: ratio.totalDays,
      avgKgPerPax: ratio.avgKgPerPax,
    };
  }

  return {
    currentPax,
    occupiedTables,
    ratios,
    getSuggestion,
  };
}
