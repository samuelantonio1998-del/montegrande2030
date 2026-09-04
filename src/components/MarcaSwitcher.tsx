import { Tag } from 'lucide-react';
import { useUnidade } from '@/contexts/UnidadeContext';
import { cn } from '@/lib/utils';

/**
 * Mostra a marca (identidade comercial) sob a qual se está a operar.
 * Se houver mais do que uma marca no local activo, permite trocar.
 */
export function MarcaSwitcher({ className }: { className?: string }) {
  const { marcas, marcaId, marca, setMarcaId, loading } = useUnidade();

  if (loading || marcas.length === 0) return null;

  if (marcas.length === 1) {
    return (
      <div className={cn('flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs', className)}>
        <Tag className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="truncate font-medium text-foreground">{marca?.nome}</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2', className)}>
      <Tag className="h-3.5 w-3.5 shrink-0 text-primary" />
      <select
        value={marcaId ?? ''}
        onChange={e => setMarcaId(e.target.value || null)}
        className="cursor-pointer bg-transparent text-xs font-medium text-foreground outline-none"
        aria-label="Marca activa"
      >
        {marcas.map(m => (
          <option key={m.id} value={m.id}>{m.nome}</option>
        ))}
      </select>
    </div>
  );
}

export default MarcaSwitcher;
