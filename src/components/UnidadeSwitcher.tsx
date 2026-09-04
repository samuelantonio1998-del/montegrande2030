import { Store } from 'lucide-react';
import { useUnidade } from '@/contexts/UnidadeContext';
import { cn } from '@/lib/utils';

const CONSOLIDADO = '__todas__';

/** Mostra (e, para gerência, permite trocar) a unidade activa. Discreto. */
export function UnidadeSwitcher({ className }: { className?: string }) {
  const { unidade, unidades, podeEscolher, isConsolidado, setUnidadeId, loading } = useUnidade();

  if (loading) return null;

  if (!podeEscolher) {
    if (!unidade) return null;
    return (
      <div className={cn('flex items-center gap-2 text-xs text-sidebar-foreground/60', className)}>
        <Store className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{unidade.nome}</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Store className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/60" />
      <select
        value={isConsolidado ? CONSOLIDADO : unidade?.id ?? CONSOLIDADO}
        onClick={e => e.stopPropagation()}
        onChange={e => setUnidadeId(e.target.value === CONSOLIDADO ? null : e.target.value)}
        className="w-full truncate bg-transparent text-xs text-sidebar-foreground/70 outline-none cursor-pointer"
      >
        {unidades.map(u => (
          <option key={u.id} value={u.id} className="text-foreground">{u.nome}</option>
        ))}
        <option value={CONSOLIDADO} className="text-foreground">Todas as unidades</option>
      </select>
    </div>
  );
}
