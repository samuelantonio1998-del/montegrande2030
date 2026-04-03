import { useState, useCallback, useMemo } from 'react';
import { Users, AlertTriangle, TrendingUp, UtensilsCrossed, Salad, CakeSlice, Package, LogOut, BarChart3, Trash2, Recycle, Euro, CalendarPlus, Flame } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProduction } from '@/contexts/ProductionContext';
import { recipientCapacity, type RecipientSize } from '@/lib/buffet-data';
import { useMesas } from '@/hooks/useMesas';
import { useRegistosProducao } from '@/hooks/useRegistosProducao';
import { useVendasHistorico, calcularPrevisao } from '@/hooks/useVendasHistorico';
import { useEmentaDiaria, useBuffetItems, useBulkAddEmenta } from '@/hooks/useEmentaDiaria';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import EmentaZonePanel from '@/components/cozinha/EmentaZonePanel';
import EmentaSetupDialog from '@/components/cozinha/EmentaSetupDialog';
import CollectTraysPanel from '@/components/cozinha/CollectTraysPanel';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const ZONES = [
  { key: 'entradas', label: 'Entradas', sublabel: '25 artigos', icon: Salad, color: 'text-emerald-600' },
  { key: 'pratos_principais', label: 'Pratos Quentes', sublabel: '6 pratos + sopa', icon: Flame, color: 'text-orange-600' },
  { key: 'sobremesas', label: 'Sobremesas', sublabel: '10 artigos', icon: CakeSlice, color: 'text-pink-600' },
] as const;

export default function DashboardCozinha() {
  const { user, logout } = useAuth();
  const { trayStates, handleReplenish: ctxReplenish, handleCollect: ctxCollect, leftoverHistory } = useProduction();
  const today = new Date();
  const { data: ementaItems = [], isLoading } = useEmentaDiaria(today);
  const { data: allBuffetItems = [] } = useBuffetItems();
  const bulkAdd = useBulkAddEmenta();
  const { mesas: realMesas } = useMesas();
  const { wasteSummary, activeTrays: prodActiveTrays } = useRegistosProducao();
  const { data: vendasData = [] } = useVendasHistorico();

  const [showSetup, setShowSetup] = useState(false);
  const [activeZone, setActiveZone] = useState<string>('entradas');
  const [showRecolha, setShowRecolha] = useState(false);

  const existingItemIds = useMemo(() => new Set(ementaItems.map(e => e.buffet_item_id)), [ementaItems]);

  const ementaByZone = useMemo(() => {
    const map: Record<string, typeof ementaItems> = { entradas: [], pratos_principais: [], sobremesas: [] };
    ementaItems.forEach(e => {
      if (e.buffet_item?.zona && map[e.buffet_item.zona]) {
        map[e.buffet_item.zona].push(e);
      }
    });
    return map;
  }, [ementaItems]);

  const activeItems = useMemo(() => {
    return ementaItems.filter(e => e.buffet_item).map(e => ({
      id: e.buffet_item!.id,
      name: e.buffet_item!.nome,
      zone: e.buffet_item!.zona as 'entradas' | 'pratos_principais' | 'sobremesas',
      active: true,
    }));
  }, [ementaItems]);

  // Real data: pax from DB
  const currentPax = realMesas.filter(m => m.status === 'ocupada').reduce((s, m) => s + m.adults + m.children, 0);
  
  // Forecast from vendas_historico
  const avgClients = vendasData.length > 0 
    ? Math.round(vendasData.reduce((s, d) => s + d.total, 0) / vendasData.length) 
    : 0;

  // Waste from registos_producao
  const waste = wasteSummary();
  const totalProduced = waste.reduce((s, w) => s + w.totalProducedKg, 0);
  const totalWaste = waste.reduce((s, w) => s + w.totalWasteKg, 0);
  const totalReused = waste.reduce((s, w) => s + w.totalReusedKg, 0);
  const totalLoss = waste.reduce((s, w) => s + w.estimatedLoss, 0);
  const totalSavings = waste.reduce((s, w) => s + w.estimatedSavings, 0);

  // Alerts computed from waste
  const alerts = waste.filter(w => w.wastePercentage > 15).map(w => ({
    id: w.dishName,
    message: `${w.dishName} tem ${w.wastePercentage.toFixed(0)}% de desperdício. Considerar recipiente mais pequeno.`,
    priority: 'alta' as const,
  }));

  const handleReplenish = useCallback((itemId: string, recipient: RecipientSize, weightKg: number) => {
    ctxReplenish(itemId, recipient, weightKg, user?.name || '');
  }, [ctxReplenish, user?.name]);

  const handleCollect = useCallback((itemId: string, leftoverKg: number, action: 'aproveitamento' | 'desperdicio', note: string | null) => {
    const item = activeItems.find(i => i.id === itemId);
    if (!item) return;
    ctxCollect(itemId, item.name, item.zone, leftoverKg, action, note, user?.name || '');
  }, [activeItems, ctxCollect, user?.name]);

  const handleBulkAdd = (items: { buffet_item_id: string; quantidade_prevista: number; recipiente_sugerido: string }[], dates: Date[]) => {
    const rows = dates.flatMap(d =>
      items.map(i => ({
        ...i,
        data: format(d, 'yyyy-MM-dd'),
        criado_por: user?.name || '',
        historico_consumo_kg: [2.5, 3.1, 2.8, 3.5, 2.9, 3.2],
        historico_sobra_kg: [0.5, 0.3, 0.8, 0.2, 0.6, 0.4],
      }))
    );
    bulkAdd.mutate(rows);
  };

  const dayLabel = format(today, "EEEE, d 'de' MMMM", { locale: pt });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-display text-foreground">Cozinha</h1>
            <div className="flex items-center gap-3 text-base text-muted-foreground">
              <Users className="h-5 w-5" />
              <span className="text-2xl font-bold text-foreground">{currentPax}</span>
              <span>em sala</span>
              <span className="text-muted-foreground/50">·</span>
              <TrendingUp className="h-4 w-4 text-primary" />
              <span>prev. {avgClients} pax</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground capitalize">{dayLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="lg" className="gap-2 text-sm font-semibold" onClick={() => setShowSetup(true)}>
            <CalendarPlus className="h-5 w-5" /> Definir Ementa
          </Button>
          <Button variant="ghost" size="icon" onClick={logout}><LogOut className="h-5 w-5" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <div className="rounded-md border border-border bg-card px-2.5 py-1.5 flex items-center gap-2">
          <BarChart3 className="h-3 w-3 text-primary shrink-0" />
          <div><p className="text-[10px] text-muted-foreground leading-none">Produção</p><p className="text-sm font-bold text-foreground">{totalProduced.toFixed(0)}kg</p></div>
        </div>
        <div className="rounded-md border border-border bg-card px-2.5 py-1.5 flex items-center gap-2">
          <Trash2 className="h-3 w-3 text-destructive shrink-0" />
          <div><p className="text-[10px] text-muted-foreground leading-none">Desperdício</p><p className="text-sm font-bold text-destructive">{totalWaste.toFixed(1)}kg</p></div>
        </div>
        <div className="rounded-md border border-border bg-card px-2.5 py-1.5 flex items-center gap-2">
          <Recycle className="h-3 w-3 text-success shrink-0" />
          <div><p className="text-[10px] text-muted-foreground leading-none">Aproveitamento</p><p className="text-sm font-bold text-success">{totalReused.toFixed(1)}kg</p></div>
        </div>
        <div className="rounded-md border border-border bg-card px-2.5 py-1.5 flex items-center gap-2">
          <Recycle className="h-3 w-3 text-primary shrink-0" />
          <div><p className="text-[10px] text-muted-foreground leading-none">Poupança</p><p className={cn('text-sm font-bold', totalSavings >= totalLoss ? 'text-success' : 'text-destructive')}>{totalSavings.toFixed(0)}kg</p></div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-1.5">
          {alerts.map(alert => (
            <motion.div key={alert.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-2.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-warning shrink-0" />
              <p className="text-xs text-foreground">{alert.message}</p>
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 border-b border-border pb-0">
        {ZONES.map(z => (
          <button key={z.key} onClick={() => { setActiveZone(z.key); setShowRecolha(false); }}
            className={cn('flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeZone === z.key && !showRecolha ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            <z.icon className={cn('h-4 w-4', activeZone === z.key && !showRecolha ? z.color : '')} />
            <span className="hidden sm:inline">{z.label}</span>
            <span className="sm:hidden">{z.label.split(' ')[0]}</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{ementaByZone[z.key]?.length || 0}</Badge>
          </button>
        ))}
        <button onClick={() => setShowRecolha(true)}
          className={cn('flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
            showRecolha ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
          <Package className={cn('h-4 w-4', showRecolha ? 'text-primary' : '')} />
          <span className="hidden sm:inline">Recolha</span>
          <span className="sm:hidden">Rec.</span>
        </button>
      </div>

      {!showRecolha ? (
        <div>
          {ZONES.filter(z => z.key === activeZone).map(z => (
            <div key={z.key}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-display text-foreground flex items-center gap-2">
                  <z.icon className={cn('h-5 w-5', z.color)} /> {z.label}
                  <span className="text-xs text-muted-foreground font-normal">({ementaByZone[z.key]?.length || 0} pratos hoje)</span>
                </h2>
              </div>
              <EmentaZonePanel ementaItems={ementaByZone[z.key] || []} trayStates={trayStates} onReplenish={handleReplenish} userName={user?.name || ''} />
            </div>
          ))}
        </div>
      ) : (
        <div>
          <h2 className="text-base font-display text-foreground flex items-center gap-2 mb-3">
            <Package className="h-5 w-5 text-primary" /> Recolha de Tabuleiros
          </h2>
          <CollectTraysPanel items={activeItems} trayStates={trayStates} onCollect={handleCollect} leftoverHistory={leftoverHistory} />
        </div>
      )}

      <EmentaSetupDialog open={showSetup} onOpenChange={setShowSetup} allItems={allBuffetItems} existingItemIds={existingItemIds} onConfirm={handleBulkAdd} date={today} userName={user?.name || ''} />
    </div>
  );
}
