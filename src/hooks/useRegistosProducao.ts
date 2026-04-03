import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RecipientSize } from '@/lib/buffet-data';
import { LABOR_COST_PER_HOUR } from '@/hooks/useFichasTecnicas';

export type RegistoProducao = {
  id: string;
  dish_name: string;
  ficha_tecnica_id: string | null;
  buffet_item_id: string | null;
  recipiente: string;
  peso_kg: number;
  enviado_at: string;
  recolhido_at: string | null;
  estado: 'no_buffet' | 'recolhido' | 'aproveitado' | 'desperdicio';
  sobra_kg: number | null;
  sobra_acao: 'aproveitamento' | 'desperdicio' | null;
  aproveitamento_nota: string | null;
  registado_por: string;
  created_at: string;
};

/** Cost per kg for a ficha técnica, computed from ingredients + labor */
type FichaCostInfo = {
  totalCost: number; // ingredients + labor
  capacityKg: number; // porcoes (= recipient capacity in kg)
  costPerKg: number;
};

const FALLBACK_COST_PER_KG = 5; // €5/kg when no ficha linked

export function useRegistosProducao() {
  const [registos, setRegistos] = useState<RegistoProducao[]>([]);
  const [loading, setLoading] = useState(true);
  const [fichaCosts, setFichaCosts] = useState<Map<string, FichaCostInfo>>(new Map());

  const fetchFichaCosts = useCallback(async () => {
    const { data: fichas } = await supabase
      .from('fichas_tecnicas')
      .select('id, porcoes, tempo_preparacao')
      .eq('ativo', true);
    
    const { data: ingredientes } = await supabase
      .from('ficha_ingredientes')
      .select('ficha_id, quantidade, produto:produtos(custo_medio)');

    if (!fichas) return;

    // Sum ingredient costs per ficha
    const ingCostMap = new Map<string, number>();
    (ingredientes || []).forEach((ing: any) => {
      const cost = ing.quantidade * (ing.produto?.custo_medio ?? 0);
      ingCostMap.set(ing.ficha_id, (ingCostMap.get(ing.ficha_id) ?? 0) + cost);
    });

    const map = new Map<string, FichaCostInfo>();
    fichas.forEach(f => {
      const ingredientCost = ingCostMap.get(f.id) ?? 0;
      const laborCost = ((f.tempo_preparacao ?? 0) / 60) * LABOR_COST_PER_HOUR;
      const totalCost = ingredientCost + laborCost;
      const capacityKg = f.porcoes || 1;
      map.set(f.id, {
        totalCost,
        capacityKg,
        costPerKg: capacityKg > 0 ? totalCost / capacityKg : FALLBACK_COST_PER_KG,
      });
    });
    setFichaCosts(map);
  }, []);

  // Also build a buffet_item → ficha_tecnica_id map
  const [buffetFichaMap, setBuffetFichaMap] = useState<Map<string, string>>(new Map());

  const fetchBuffetFichaMap = useCallback(async () => {
    const { data } = await supabase
      .from('buffet_items')
      .select('id, ficha_tecnica_id')
      .not('ficha_tecnica_id', 'is', null);
    if (!data) return;
    const map = new Map<string, string>();
    data.forEach(b => { if (b.ficha_tecnica_id) map.set(b.id, b.ficha_tecnica_id); });
    setBuffetFichaMap(map);
  }, []);

  const fetchRegistos = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('registos_producao')
      .select('*')
      .gte('enviado_at', `${today}T00:00:00`)
      .order('enviado_at', { ascending: false });
    if (error) {
      console.error('Erro registos:', error);
      return;
    }
    setRegistos(data as unknown as RegistoProducao[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRegistos();
    fetchFichaCosts();
    fetchBuffetFichaMap();
    const ch = supabase
      .channel('registos-producao-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registos_producao' }, () => fetchRegistos())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchRegistos, fetchFichaCosts, fetchBuffetFichaMap]);

  /** Get cost per kg for a registo, using ficha técnica if available */
  const getCostPerKg = useCallback((r: RegistoProducao): number => {
    // Try direct ficha link first
    let fichaId = r.ficha_tecnica_id;
    // Fallback: buffet_item → ficha_tecnica_id
    if (!fichaId && r.buffet_item_id) {
      fichaId = buffetFichaMap.get(r.buffet_item_id) ?? null;
    }
    if (fichaId) {
      const info = fichaCosts.get(fichaId);
      if (info) return info.costPerKg;
    }
    return FALLBACK_COST_PER_KG;
  }, [fichaCosts, buffetFichaMap]);

  const addRegisto = useCallback(async (r: {
    dish_name: string;
    ficha_tecnica_id?: string;
    buffet_item_id?: string;
    recipiente: string;
    peso_kg: number;
    registado_por: string;
  }) => {
    const { error } = await supabase.from('registos_producao').insert({
      dish_name: r.dish_name,
      ficha_tecnica_id: r.ficha_tecnica_id || null,
      buffet_item_id: r.buffet_item_id || null,
      recipiente: r.recipiente,
      peso_kg: r.peso_kg,
      registado_por: r.registado_por,
      estado: 'no_buffet',
    });
    if (error) {
      toast.error('Erro ao registar produção');
      console.error(error);
    }
  }, []);

  const recolherRegisto = useCallback(async (id: string, sobra_kg: number, sobra_acao: 'aproveitamento' | 'desperdicio', nota: string | null) => {
    const { error } = await supabase.from('registos_producao').update({
      recolhido_at: new Date().toISOString(),
      estado: sobra_acao === 'aproveitamento' ? 'aproveitado' : 'desperdicio',
      sobra_kg,
      sobra_acao,
      aproveitamento_nota: nota,
    }).eq('id', id);
    if (error) {
      toast.error('Erro ao recolher');
      console.error(error);
    }
  }, []);

  const activeTrays = registos.filter(r => r.estado === 'no_buffet');
  const completedTrays = registos.filter(r => r.estado !== 'no_buffet');

  // Derive tray states from DB registos (persisted across refresh)
  const derivedTrayStates = useMemo(() => {
    const states: Record<string, import('@/lib/buffet-zones').BuffetTrayState> = {};
    registos.forEach(r => {
      if (!r.buffet_item_id) return;
      const itemId = r.buffet_item_id;
      if (!states[itemId]) {
        states[itemId] = { itemId, replenishments: [], totalSentKg: 0, currentRecipient: null, isOnBuffet: false };
      }
      const s = states[itemId];
      s.replenishments.push({
        id: r.id,
        itemId,
        recipient: r.recipiente,
        weightKg: r.peso_kg,
        timestamp: r.enviado_at,
        registeredBy: r.registado_por,
      });
      s.totalSentKg += r.peso_kg;
      s.currentRecipient = r.recipiente;
      if (r.estado === 'no_buffet') {
        s.isOnBuffet = true;
      }
    });
    return states;
  }, [registos]);

  // Waste summary with real costs from fichas técnicas
  // Cost is proportional: if recipe costs €10 for 5kg, sending 2.5kg costs €5
  const wasteSummary = useCallback(() => {
    const map = new Map<string, { dishName: string; totalProducedKg: number; totalWasteKg: number; totalReusedKg: number; estimatedLoss: number; estimatedSavings: number }>();
    registos.forEach(r => {
      if (!map.has(r.dish_name)) {
        map.set(r.dish_name, { dishName: r.dish_name, totalProducedKg: 0, totalWasteKg: 0, totalReusedKg: 0, estimatedLoss: 0, estimatedSavings: 0 });
      }
      const m = map.get(r.dish_name)!;
      m.totalProducedKg += r.peso_kg;

      const costPerKg = getCostPerKg(r);

      if (r.sobra_acao === 'desperdicio' && r.sobra_kg) {
        m.totalWasteKg += r.sobra_kg;
        m.estimatedLoss += r.sobra_kg * costPerKg;
      }
      if (r.sobra_acao === 'aproveitamento' && r.sobra_kg) {
        m.totalReusedKg += r.sobra_kg;
        m.estimatedSavings += r.sobra_kg * costPerKg;
      }
    });
    return Array.from(map.values()).map(m => ({
      ...m,
      wastePercentage: m.totalProducedKg > 0 ? (m.totalWasteKg / m.totalProducedKg) * 100 : 0,
    }));
  }, [registos, getCostPerKg]);

  return { registos, loading, addRegisto, recolherRegisto, activeTrays, completedTrays, wasteSummary, derivedTrayStates };
}
