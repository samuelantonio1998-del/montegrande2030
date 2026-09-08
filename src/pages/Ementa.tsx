import { useMemo, useState } from 'react';
import { CalendarPlus, Salad, Flame, CakeSlice, Infinity as InfinityIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Permitido } from '@/components/Permitido';
import { PERMISSOES } from '@/lib/permissoes';
import { useAuth } from '@/contexts/AuthContext';
import { useMarca } from '@/contexts/UnidadeContext';
import {
  useEmentaDiaria,
  useBuffetItems,
  useBulkAddEmenta,
  usePermanentEmentaItems,
  useRemoveFromEmenta,
  PERMANENT_DATE,
} from '@/hooks/useEmentaDiaria';
import EmentaSetupDialog from '@/components/cozinha/EmentaSetupDialog';

const ZONES = [
  { key: 'entradas', label: 'Entradas', icon: Salad },
  { key: 'pratos_principais', label: 'Pratos Quentes', icon: Flame },
  { key: 'sobremesas', label: 'Sobremesas', icon: CakeSlice },
] as const;

export default function Ementa() {
  const { user } = useAuth();
  const { marca } = useMarca();
  const today = new Date();
  const [showSetup, setShowSetup] = useState(false);

  const { data: ementaItems = [], isLoading } = useEmentaDiaria(today);
  const { data: allBuffetItems = [] } = useBuffetItems();
  const { data: permanentItems = [] } = usePermanentEmentaItems();
  const bulkAdd = useBulkAddEmenta();
  const removeItem = useRemoveFromEmenta();

  const existingItemIds = useMemo(() => new Set(ementaItems.map(e => e.buffet_item_id)), [ementaItems]);
  const permanentItemIds = useMemo(() => new Set(permanentItems.map(e => e.buffet_item_id)), [permanentItems]);

  const ementaByZone = useMemo(() => {
    const map: Record<string, typeof ementaItems> = { entradas: [], pratos_principais: [], sobremesas: [] };
    ementaItems.forEach(e => {
      const zona = e.buffet_item?.zona;
      if (zona && map[zona]) map[zona].push(e);
    });
    return map;
  }, [ementaItems]);

  const handleBulkAdd = (
    items: { buffet_item_id: string; quantidade_prevista: number; recipiente_sugerido: string }[],
    dates: Date[],
  ) => {
    const rows = dates.flatMap(d =>
      items.map(i => ({ ...i, data: format(d, 'yyyy-MM-dd'), criado_por: user?.name || '' })),
    );
    bulkAdd.mutate(rows);
  };

  const handlePermanentAdd = (
    items: { buffet_item_id: string; quantidade_prevista: number; recipiente_sugerido: string }[],
  ) => {
    bulkAdd.mutate(items.map(i => ({ ...i, data: PERMANENT_DATE, criado_por: user?.name || '' })));
  };

  const dayLabel = format(today, "EEEE, d 'de' MMMM", { locale: pt });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display text-foreground">Ementa</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {dayLabel}
            {marca ? ` · ${marca.nome}` : ''}
          </p>
        </div>
        <Permitido chave={PERMISSOES.ementaDefinir}>
          <Button className="gap-2 self-start" onClick={() => setShowSetup(true)}>
            <CalendarPlus className="h-4 w-4" /> Definir Ementa
          </Button>
        </Permitido>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">A carregar ementa…</p>
      ) : ementaItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Ainda não há pratos definidos para hoje.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {ZONES.map(zone => (
            <div key={zone.key} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <zone.icon className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">{zone.label}</h2>
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  {ementaByZone[zone.key].length}
                </Badge>
              </div>
              <div className="space-y-1.5">
                {ementaByZone[zone.key].length === 0 && (
                  <p className="text-xs text-muted-foreground">Sem pratos.</p>
                )}
                {ementaByZone[zone.key].map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm text-foreground">{item.buffet_item?.nome}</span>
                      {item.data === PERMANENT_DATE && (
                        <Badge variant="outline" className="h-4 shrink-0 border-primary/30 px-1.5 text-[9px] text-primary">
                          <InfinityIcon className="mr-0.5 h-2.5 w-2.5" /> Sempre
                        </Badge>
                      )}
                    </div>
                    <Permitido chave={PERMISSOES.ementaDefinir}>
                      <button
                        onClick={() => removeItem.mutate(item.id)}
                        className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                        aria-label="Remover da ementa"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </Permitido>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <EmentaSetupDialog
        open={showSetup}
        onOpenChange={setShowSetup}
        allItems={allBuffetItems}
        existingItemIds={existingItemIds}
        permanentItemIds={permanentItemIds}
        onConfirm={handleBulkAdd}
        onConfirmPermanent={handlePermanentAdd}
        date={today}
        userName={user?.name || ''}
      />
    </div>
  );
}
