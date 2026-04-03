import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RecipientSize } from '@/lib/buffet-data';

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

export function useRegistosProducao() {
  const [registos, setRegistos] = useState<RegistoProducao[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    // Only fetch today's records
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
    fetch();
    const ch = supabase
      .channel('registos-producao-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registos_producao' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetch]);

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

  // Waste summary (computed from registos)
  const wasteSummary = useCallback(() => {
    const map = new Map<string, { dishName: string; totalProducedKg: number; totalWasteKg: number; totalReusedKg: number }>();
    registos.forEach(r => {
      if (!map.has(r.dish_name)) {
        map.set(r.dish_name, { dishName: r.dish_name, totalProducedKg: 0, totalWasteKg: 0, totalReusedKg: 0 });
      }
      const m = map.get(r.dish_name)!;
      m.totalProducedKg += r.peso_kg;
      if (r.sobra_acao === 'desperdicio' && r.sobra_kg) m.totalWasteKg += r.sobra_kg;
      if (r.sobra_acao === 'aproveitamento' && r.sobra_kg) m.totalReusedKg += r.sobra_kg;
    });
    return Array.from(map.values()).map(m => ({
      ...m,
      wastePercentage: m.totalProducedKg > 0 ? (m.totalWasteKg / m.totalProducedKg) * 100 : 0,
      estimatedLoss: m.totalWasteKg * 5, // rough estimate €5/kg
      estimatedSavings: m.totalReusedKg * 5,
    }));
  }, [registos]);

  return { registos, loading, addRegisto, recolherRegisto, activeTrays, completedTrays, wasteSummary };
}
