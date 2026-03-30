import { useState, useCallback, useMemo } from 'react';
import { Users, AlertTriangle, TrendingUp, UtensilsCrossed, Salad, CakeSlice, Package, LogOut, BarChart3, Trash2, Recycle, Euro, CalendarPlus, Flame } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { mockProductionAlerts, mockWeeklyWaste, recipientCapacity, type RecipientSize } from '@/lib/buffet-data';
import { mockMesas, mockHistorical } from '@/lib/mock-data';
import type { BuffetTrayState, ReplenishmentLog, LeftoverRecord } from '@/lib/buffet-zones';
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
  const today = new Date();
  const { data: ementaItems = [], isLoading } = useEmentaDiaria(today);
  const { data: allBuffetItems = [] } = useBuffetItems();
  const bulkAdd = useBulkAddEmenta();

  const [trayStates, setTrayStates] = useState<Record<string, BuffetTrayState>>({});
  const [leftoverHistory, setLeftoverHistory] = useState<LeftoverRecord[]>([]);
  const [showSetup, setShowSetup] = useState(false);
  const [activeZone, setActiveZone] = useState<string>('entradas');
  const [showRecolha, setShowRecolha] = useState(false);

  // Items already in today's menu
  const existingItemIds = useMemo(() => new Set(ementaItems.map(e => e.buffet_item_id)), [ementaItems]);

  // Items by zone
  const ementaByZone = useMemo(() => {
    const map: Record<string, typeof ementaItems> = { entradas: [], pratos_principais: [], sobremesas: [] };
    ementaItems.forEach(e => {
      if (e.buffet_item?.zona && map[e.buffet_item.zona]) {
        map[e.buffet_item.zona].push(e);
      }
    });
    return map;
  }, [ementaItems]);

  // Build buffet_items as the items list for CollectTraysPanel
  const activeItems = useMemo(() => {
    return ementaItems
      .filter(e => e.buffet_item)
      .map(e => ({
        id: e.buffet_item!.id,
        name: e.buffet_item!.nome,
        zone: e.buffet_item!.zona as 'entradas' | 'pratos_principais' | 'sobremesas',
        active: true,
      }));
  }, [ementaItems]);

  // Forecast
  const avgClients = Math.round(mockHistorical.reduce((s, d) => s + d.totalClients, 0) / mockHistorical.length);
  const currentPax = mockMesas.reduce((s, m) => s + m.adults + m.children, 0);
  const forecastPct = Math.round((currentPax / avgClients) * 100);

  // Waste summary
  const totalProduced = mockWeeklyWaste.reduce((s, w) => s + w.totalProducedKg, 0);
  const totalWaste = mockWeeklyWaste.reduce((s, w) => s + w.totalWasteKg, 0);
  const totalReused = mockWeeklyWaste.reduce((s, w) => s + w.totalReusedKg, 0);
  const totalLoss = mockWeeklyWaste.reduce((s, w) => s + w.estimatedLoss, 0);
  const totalSavings = mockWeeklyWaste.reduce((s, w) => s + w.estimatedSavings, 0);
  const netLoss = totalSavings - totalLoss;

  const handleReplenish = useCallback((itemId: string, recipient: RecipientSize, weightKg: number) => {
    const log: ReplenishmentLog = {
      id: `r${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      itemId,
      recipient,
      weightKg,
      timestamp: new Date().toISOString(),
      registeredBy: user?.name || '',
    };
    setTrayStates(prev => {
      const existing = prev[itemId] || { itemId, replenishments: [], totalSentKg: 0, currentRecipient: null, isOnBuffet: false };
      return {
        ...prev,
        [itemId]: {
          ...existing,
          replenishments: [...existing.replenishments, log],
          totalSentKg: existing.totalSentKg + weightKg,
          currentRecipient: recipient,
          isOnBuffet: true,
        },
      };
    });
  }, [user?.name]);

  const handleCollect = useCallback((itemId: string, leftoverKg: number, action: 'aproveitamento' | 'desperdicio', note: string | null) => {
    const item = activeItems.find(i => i.id === itemId);
    if (!item) return;
    const record: LeftoverRecord = {
      id: `l${Date.now()}`,
      itemId,
      itemName: item.name,
      zone: item.zone,
      leftoverKg,
      action,
      note,
      date: new Date().toISOString(),
      registeredBy: user?.name || '',
    };
    setLeftoverHistory(prev => [record, ...prev]);
    setTrayStates(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], isOnBuffet: false },
    }));
  }, [activeItems, user?.name]);

  const handleBulkAdd = (items: { buffet_item_id: string; quantidade_prevista: number; recipiente_sugerido: string }[], date?: Date) => {
    const targetDate = date || today;
    bulkAdd.mutate(items.map(i => ({
      ...i,
      data: format(targetDate, 'yyyy-MM-dd'),
      criado_por: user?.name || '',
      historico_consumo_kg: [2.5, 3.1, 2.8, 3.5, 2.9, 3.2],
      historico_sobra_kg: [0.5, 0.3, 0.8, 0.2, 0.6, 0.4],
    })));
  };

  const dayLabel = format(today, "EEEE, d 'de' MMMM", { locale: pt });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display text-foreground">Cozinha</h1>
          <p className="text-sm text-muted-foreground capitalize">{dayLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowSetup(true)}>
            <CalendarPlus className="h-3.5 w-3.5" /> Definir Ementa
          </Button>
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <BarChart3 className="h-3.5 w-3.5 text-primary" /> Produção Total
          </div>
          <p className="text-xl font-bold text-foreground">{totalProduced.toFixed(0)}kg</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Trash2 className="h-3.5 w-3.5 text-destructive" /> Desperdício
          </div>
          <p className="text-xl font-bold text-destructive">{totalWaste.toFixed(1)}kg</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Recycle className="h-3.5 w-3.5 text-success" /> Aproveitamento
          </div>
          <p className="text-xl font-bold text-success">{totalReused.toFixed(1)}kg</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Euro className="h-3.5 w-3.5" /> Perdas vs Poupança
          </div>
          <p className={cn('text-xl font-bold', netLoss >= 0 ? 'text-success' : 'text-destructive')}>€{netLoss >= 0 ? '+' : ''}{netLoss.toFixed(0)}</p>
        </motion.div>
      </div>

      {/* Forecast + Pax */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-display text-card-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Previsão do Dia
          </h2>
          <Badge variant="secondary" className="text-xs">{avgClients} pax</Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium text-foreground">{currentPax}/{avgClients} ({forecastPct}%)</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(forecastPct, 100)}%` }}
                transition={{ duration: 1 }}
                className={cn('h-full rounded-full', forecastPct > 80 ? 'bg-success' : forecastPct > 50 ? 'bg-warning' : 'bg-primary')}
              />
            </div>
          </div>
          <div className="text-center rounded-lg bg-muted/50 px-3 py-1.5">
            <Users className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-lg font-bold text-foreground">{currentPax}</p>
            <p className="text-[10px] text-muted-foreground">em sala</p>
          </div>
        </div>
      </motion.div>

      {/* Alerts */}
      {mockProductionAlerts.filter(a => a.priority === 'alta').length > 0 && (
        <div className="space-y-1.5">
          {mockProductionAlerts.filter(a => a.priority === 'alta').map(alert => (
            <motion.div key={alert.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-2.5">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-warning shrink-0" />
              <p className="text-xs text-foreground">{alert.message}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* 3 Zone panels - horizontal navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-0">
        {ZONES.map(z => (
          <button
            key={z.key}
            onClick={() => { setActiveZone(z.key); setShowRecolha(false); }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeZone === z.key && !showRecolha
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <z.icon className={cn('h-4 w-4', activeZone === z.key && !showRecolha ? z.color : '')} />
            <span className="hidden sm:inline">{z.label}</span>
            <span className="sm:hidden">{z.label.split(' ')[0]}</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {ementaByZone[z.key]?.length || 0}
            </Badge>
          </button>
        ))}
        <button
          onClick={() => setShowRecolha(true)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
            showRecolha
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Package className={cn('h-4 w-4', showRecolha ? 'text-primary' : '')} />
          <span className="hidden sm:inline">Recolha</span>
          <span className="sm:hidden">Rec.</span>
        </button>
      </div>

      {/* Zone content */}
      {!showRecolha ? (
        <div>
          {ZONES.filter(z => z.key === activeZone).map(z => (
            <div key={z.key}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-display text-foreground flex items-center gap-2">
                  <z.icon className={cn('h-5 w-5', z.color)} />
                  {z.label}
                  <span className="text-xs text-muted-foreground font-normal">
                    ({ementaByZone[z.key]?.length || 0} pratos hoje)
                  </span>
                </h2>
              </div>
              <EmentaZonePanel
                ementaItems={ementaByZone[z.key] || []}
                trayStates={trayStates}
                onReplenish={handleReplenish}
                userName={user?.name || ''}
              />
            </div>
          ))}
        </div>
      ) : (
        <div>
          <h2 className="text-base font-display text-foreground flex items-center gap-2 mb-3">
            <Package className="h-5 w-5 text-primary" /> Recolha de Tabuleiros
          </h2>
          <CollectTraysPanel
            items={activeItems}
            trayStates={trayStates}
            onCollect={handleCollect}
            leftoverHistory={leftoverHistory}
          />
        </div>
      )}

      {/* Setup dialog */}
      <EmentaSetupDialog
        open={showSetup}
        onOpenChange={setShowSetup}
        allItems={allBuffetItems}
        existingItemIds={existingItemIds}
        onConfirm={handleBulkAdd}
        date={today}
      />
    </div>
  );
}
