import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { type Mesa, PRICING, getAdultPrice } from '@/lib/mock-data';
import { toast } from '@/lib/toast-with-sound';

type DbMesa = {
  id: string;
  number: number;
  status: string;
  adults: number;
  children2to6: number;
  children7to12: number;
  waiter: string;
  opened_at: string | null;
  beverages: { name: string; quantity: number; unitPrice: number }[];
};

function dbToMesa(row: DbMesa): Mesa {
  return {
    id: row.id,
    number: row.number,
    status: row.status as Mesa['status'],
    adults: row.adults,
    children: row.children2to6 + row.children7to12,
    children2to6: row.children2to6,
    children7to12: row.children7to12,
    waiter: row.waiter,
    openedAt: row.opened_at,
    beverages: Array.isArray(row.beverages) ? row.beverages : [],
  };
}

export function useMesas() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMesas = useCallback(async () => {
    const { data, error } = await supabase
      .from('mesas')
      .select('*')
      .order('number');
    if (error) {
      console.error('Erro ao carregar mesas:', error);
      toast.error('Erro ao carregar mesas');
      return;
    }
    setMesas((data as unknown as DbMesa[]).map(dbToMesa));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMesas();

    const channel = supabase
      .channel('mesas-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, () => {
        fetchMesas();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchMesas]);

  const updateMesa = useCallback(async (mesa: Mesa) => {
    const { error } = await supabase
      .from('mesas')
      .update({
        status: mesa.status,
        adults: mesa.adults,
        children2to6: mesa.children2to6,
        children7to12: mesa.children7to12,
        waiter: mesa.waiter,
        opened_at: mesa.openedAt,
        beverages: JSON.parse(JSON.stringify(mesa.beverages)),
        updated_at: new Date().toISOString(),
      })
      .eq('id', mesa.id);
    if (error) {
      console.error('Erro ao atualizar mesa:', error);
      toast.error('Erro ao atualizar mesa');
    }
  }, []);

  return { mesas, loading, updateMesa };
}
