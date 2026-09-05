import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissao } from '@/hooks/usePermissao';
import { PERMISSOES } from '@/lib/permissoes';

export type Servico = 'buffet' | 'takeaway' | 'delivery' | 'mesa';

/** Local físico (ex.: Central de Produção) */
export type Unidade = {
  id: string;
  nome: string;
  slug: string;
  tem_cozinha_propria: boolean;
  e_central: boolean;
  ativo: boolean;
};

/** Identidade comercial (ex.: Restaurante Monte Grande) */
export type Marca = {
  id: string;
  nome: string;
  slug: string;
  ativo: boolean;
};

const STORAGE_KEY = 'restogest.unidade-ativa';
const MARCA_KEY = 'restogest.marca-ativa';
const CONSOLIDADO = '__todas__';

type ServicoRow = { unidade_id: string; marca_id: string; servico: Servico };

type UnidadeContextType = {
  /** null quando está em visão consolidada (todos os locais) */
  unidadeId: string | null;
  unidade: Unidade | null;
  unidades: Unidade[];
  /** marcas disponíveis no local activo */
  marcas: Marca[];
  marcaId: string | null;
  marca: Marca | null;
  setMarcaId: (id: string | null) => void;
  nomeMarca: (id: string | null | undefined) => string;
  /** serviços do par (local activo × marca activa) */
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
  const { permitido: podeGerirUnidades } = usePermissao(PERMISSOES.unidadesGerir);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [marcasAll, setMarcasAll] = useState<Marca[]>([]);
  const [servicoRows, setServicoRows] = useState<ServicoRow[]>([]);
  const [funcionarioUnidadeId, setFuncionarioUnidadeId] = useState<string | null>(null);
  const [escolha, setEscolha] = useState<string | null>(null);
  const [escolhaMarca, setEscolhaMarca] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Funcionário (PIN) nunca escolhe local: gerência autenticada sim
  const podeEscolher = !!user && podeGerirUnidades && !user.funcionarioId;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      setLoading(true);
      const [uRes, mRes, sRes] = await Promise.all([
        supabase.from('unidades').select('*').eq('ativo', true).order('nome'),
        supabase.from('marcas').select('*').eq('ativo', true).order('nome'),
        supabase.from('unidade_marca_servicos').select('unidade_id, marca_id, servico, ativo').eq('ativo', true),
      ]);
      if (cancelled) return;

      const lista = (uRes.data ?? []) as unknown as Unidade[];
      setUnidades(lista);
      setMarcasAll((mRes.data ?? []) as unknown as Marca[]);
      setServicoRows(((sRes.data ?? []) as unknown as ServicoRow[]));

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
      setEscolhaMarca(localStorage.getItem(MARCA_KEY));
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user, podeEscolher]);

  const setUnidadeId = useCallback((id: string | null) => {
    if (!podeEscolher) return;
    setEscolha(id ?? CONSOLIDADO);
    localStorage.setItem(STORAGE_KEY, id ?? CONSOLIDADO);
  }, [podeEscolher]);

  const setMarcaId = useCallback((id: string | null) => {
    setEscolhaMarca(id);
    if (id) localStorage.setItem(MARCA_KEY, id);
    else localStorage.removeItem(MARCA_KEY);
  }, []);

  const value = useMemo<UnidadeContextType>(() => {
    const activeId = user?.funcionarioId
      ? funcionarioUnidadeId
      : escolha === CONSOLIDADO ? null : escolha;
    const unidade = unidades.find(u => u.id === activeId) ?? null;

    // Marcas disponíveis no local activo (ou todas, em visão consolidada)
    const marcaIdsLocal = new Set(
      servicoRows.filter(r => !activeId || r.unidade_id === activeId).map(r => r.marca_id)
    );
    const marcas = marcasAll.filter(m => marcaIdsLocal.has(m.id));
    const marcaAtivaId = marcas.some(m => m.id === escolhaMarca) ? escolhaMarca : (marcas[0]?.id ?? null);
    const marca = marcas.find(m => m.id === marcaAtivaId) ?? null;

    const servicos = Array.from(new Set(
      servicoRows
        .filter(r => (!activeId || r.unidade_id === activeId) && (!marcaAtivaId || r.marca_id === marcaAtivaId))
        .map(r => r.servico)
    ));

    return {
      unidadeId: activeId,
      unidade,
      unidades,
      marcas,
      marcaId: marcaAtivaId,
      marca,
      setMarcaId,
      nomeMarca: (id) => marcasAll.find(m => m.id === id)?.nome ?? '—',
      servicos,
      eCentral: unidade?.e_central ?? false,
      temCozinhaPropria: unidade?.tem_cozinha_propria ?? true,
      isConsolidado: podeEscolher && escolha === CONSOLIDADO,
      podeEscolher,
      setUnidadeId,
      nomeUnidade: (id) => unidades.find(u => u.id === id)?.nome ?? '—',
      loading,
    };
  }, [user, funcionarioUnidadeId, escolha, escolhaMarca, unidades, marcasAll, servicoRows, podeEscolher, setUnidadeId, setMarcaId, loading]);

  return <UnidadeContext.Provider value={value}>{children}</UnidadeContext.Provider>;
}

export function useUnidade() {
  const ctx = useContext(UnidadeContext);
  if (!ctx) throw new Error('useUnidade must be used within UnidadeProvider');
  return ctx;
}

/** Atalho para a camada comercial (marcas) do local activo. */
export function useMarca() {
  const { marcas, marcaId, marca, setMarcaId, nomeMarca, servicos, loading } = useUnidade();
  return { marcas, marcaId, marca, setMarcaId, nomeMarca, servicos, loading };
}
