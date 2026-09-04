import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type Servico = 'buffet' | 'takeaway' | 'delivery' | 'mesa';

export type Unidade = {
  id: string;
  nome: string;
  slug: string;
  tem_cozinha_propria: boolean;
  e_central: boolean;
  ativo: boolean;
};

const STORAGE_KEY = 'restogest.unidade-ativa';
const CONSOLIDADO = '__todas__';

type UnidadeContextType = {
  /** null quando está em visão consolidada (todas as unidades) */
  unidadeId: string | null;
  unidade: Unidade | null;
  unidades: Unidade[];
  servicos: Servico[];
  eCentral: boolean;
  temCozinhaPropria: boolean;
  isConsolidado: boolean;
  /** true apenas para gerência sem sessão de funcionário */
  podeEscolher: boolean;
  setUnidadeId: (id: string | null) => void;
  nomeUnidade: (id: string | null | undefined) => string;
  loading: boolean;
};

const UnidadeContext = createContext<UnidadeContextType | null>(null);

export function UnidadeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [servicosMap, setServicosMap] = useState<Record<string, Servico[]>>({});
  const [funcionarioUnidadeId, setFuncionarioUnidadeId] = useState<string | null>(null);
  const [escolha, setEscolha] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Funcionário (PIN) nunca escolhe unidade: gerência autenticada sim
  const podeEscolher = !!user && user.role === 'gerencia' && !user.funcionarioId;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      setLoading(true);
      const [uRes, sRes] = await Promise.all([
        supabase.from('unidades').select('*').eq('ativo', true).order('nome'),
        supabase.from('unidade_servicos').select('unidade_id, servico, ativo').eq('ativo', true),
      ]);
      if (cancelled) return;

      const lista = (uRes.data ?? []) as unknown as Unidade[];
      const map: Record<string, Servico[]> = {};
      (sRes.data ?? []).forEach((s: { unidade_id: string; servico: string }) => {
        (map[s.unidade_id] ??= []).push(s.servico as Servico);
      });
      setUnidades(lista);
      setServicosMap(map);

      if (user.funcionarioId) {
        const { data } = await supabase
          .from('funcionarios')
          .select('unidade_id')
          .eq('id', user.funcionarioId)
          .maybeSingle();
        if (cancelled) return;
        setFuncionarioUnidadeId((data?.unidade_id as string | null) ?? lista[0]?.id ?? null);
      } else if (podeEscolher) {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === CONSOLIDADO) setEscolha(CONSOLIDADO);
        else if (saved && lista.some(u => u.id === saved)) setEscolha(saved);
        else setEscolha(lista[0]?.id ?? null);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user, podeEscolher]);

  const setUnidadeId = useCallback((id: string | null) => {
    if (!podeEscolher) return;
    setEscolha(id ?? CONSOLIDADO);
    localStorage.setItem(STORAGE_KEY, id ?? CONSOLIDADO);
  }, [podeEscolher]);

  const value = useMemo<UnidadeContextType>(() => {
    const activeId = user?.funcionarioId
      ? funcionarioUnidadeId
      : escolha === CONSOLIDADO ? null : escolha;
    const unidade = unidades.find(u => u.id === activeId) ?? null;
    return {
      unidadeId: activeId,
      unidade,
      unidades,
      servicos: activeId ? (servicosMap[activeId] ?? []) : (['buffet', 'takeaway', 'delivery', 'mesa'] as Servico[]),
      eCentral: unidade?.e_central ?? false,
      temCozinhaPropria: unidade?.tem_cozinha_propria ?? true,
      isConsolidado: podeEscolher && escolha === CONSOLIDADO,
      podeEscolher,
      setUnidadeId,
      nomeUnidade: (id) => unidades.find(u => u.id === id)?.nome ?? '—',
      loading,
    };
  }, [user, funcionarioUnidadeId, escolha, unidades, servicosMap, podeEscolher, setUnidadeId, loading]);

  return <UnidadeContext.Provider value={value}>{children}</UnidadeContext.Provider>;
}

export function useUnidade() {
  const ctx = useContext(UnidadeContext);
  if (!ctx) throw new Error('useUnidade must be used within UnidadeProvider');
  return ctx;
}
