import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnidade } from '@/contexts/UnidadeContext';

export type SugestaoPrato = {
  /** média de kg realmente consumidos por dia de serviço */
  mediaKg: number;
  /** nº de dias com histórico */
  dias: number;
  /** só há confiança com pelo menos 3 dias */
  suficiente: boolean;
};

const DIAS_MINIMOS = 3;
const JANELA_DIAS = 60;

/**
 * Histórico de produção por prato (buffet_item_id) para a unidade e marca activas.
 * Usado para sugerir a quantidade prevista ao definir a ementa.
 */
export function useSugestaoQuantidade() {
  const { unidadeId, isConsolidado, marcaId } = useUnidade();
  const [mapa, setMapa] = useState<Record<string, SugestaoPrato>>({});
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const desde = new Date();
    desde.setDate(desde.getDate() - JANELA_DIAS);

    let q = supabase
      .from('registos_producao')
      .select('buffet_item_id, peso_kg, sobra_kg, sobra_acao, enviado_at')
      .not('buffet_item_id', 'is', null)
      .gte('enviado_at', `${desde.toISOString().slice(0, 10)}T00:00:00`);
    if (!isConsolidado && unidadeId) q = q.eq('unidade_id', unidadeId);
    if (marcaId) q = q.eq('marca_id', marcaId);

    const { data, error } = await q;
    if (error) {
      setMapa({});
      setLoading(false);
      return;
    }

    // por prato → por dia → kg consumidos (produzido menos sobra)
    const porPrato = new Map<string, Map<string, number>>();
    (data || []).forEach(r => {
      const id = r.buffet_item_id as string;
      const dia = String(r.enviado_at).slice(0, 10);
      const consumido = Math.max(0, Number(r.peso_kg || 0) - Number(r.sobra_kg || 0));
      if (!porPrato.has(id)) porPrato.set(id, new Map());
      const dias = porPrato.get(id)!;
      dias.set(dia, (dias.get(dia) || 0) + consumido);
    });

    const resultado: Record<string, SugestaoPrato> = {};
    porPrato.forEach((dias, id) => {
      const valores = Array.from(dias.values());
      const total = valores.reduce((s, v) => s + v, 0);
      const media = valores.length ? total / valores.length : 0;
      resultado[id] = {
        mediaKg: Number(media.toFixed(2)),
        dias: valores.length,
        suficiente: valores.length >= DIAS_MINIMOS && media > 0,
      };
    });

    setMapa(resultado);
    setLoading(false);
  }, [unidadeId, isConsolidado, marcaId]);

  useEffect(() => { carregar(); }, [carregar]);

  return { sugestoes: mapa, loading, diasMinimos: DIAS_MINIMOS };
}
