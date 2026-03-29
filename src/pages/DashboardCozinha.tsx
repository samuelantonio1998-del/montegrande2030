import { useState, useCallback, useMemo } from 'react';
import { ChefHat, Users, AlertTriangle, TrendingUp, UtensilsCrossed, Salad, CakeSlice, Package, LogOut, BarChart3, Trash2, Recycle, Euro } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { mockProductionAlerts, mockWeeklyWaste, recipientCapacity, type RecipientSize } from '@/lib/buffet-data';
import { mockMesas, mockHistorical } from '@/lib/mock-data';
import { defaultBuffetItems, type BuffetItem, type BuffetTrayState, type ReplenishmentLog, type LeftoverRecord, type BuffetZone, buffetZoneLabels } from '@/lib/buffet-zones';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BuffetZonePanel from '@/components/cozinha/BuffetZonePanel';
import CollectTraysPanel from '@/components/cozinha/CollectTraysPanel';

export default function DashboardCozinha() {
  const { user, logout } = useAuth();
  const [items] = useState<BuffetItem[]>(defaultBuffetItems);
  const [trayStates, setTrayStates] = useState<Record<string, BuffetTrayState>>({});
  const [leftoverHistory, setLeftoverHistory] = useState<LeftoverRecord[]>([]);

  // Forecast
  const avgClients = Math.round(mockHistorical.reduce((s, d) => s + d.totalClients, 0) / mockHistorical.length);
  const currentPax = mockMesas.reduce((s, m) => s + m.adults + m.children, 0);
  const forecastPct = Math.round((currentPax / avgClients) * 100);

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
    const item = items.find(i => i.id === itemId);
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
      [itemId]: {
        ...prev[itemId],
        isOnBuffet: false,
      },
    }));
  }, [items, user?.name]);

  const zoneItems = (zone: BuffetZone) => items.filter(i => i.zone === zone);

  const zoneIcon = (zone: BuffetZone) => {
    switch (zone) {
      case 'entradas': return <Salad className="h-4 w-4" />;
      case 'pratos_principais': return <UtensilsCrossed className="h-4 w-4" />;
      case 'sobremesas': return <CakeSlice className="h-4 w-4" />;
    }
  };

  const zoneActiveCount = (zone: BuffetZone) => {
    return zoneItems(zone).filter(i => trayStates[i.id]?.isOnBuffet).length;
  };

  // Waste summary from mock data
  const totalProduced = mockWeeklyWaste.reduce((s, w) => s + w.totalProducedKg, 0);
  const totalWaste = mockWeeklyWaste.reduce((s, w) => s + w.totalWasteKg, 0);
  const totalReused = mockWeeklyWaste.reduce((s, w) => s + w.totalReusedKg, 0);
  const totalLoss = mockWeeklyWaste.reduce((s, w) => s + w.estimatedLoss, 0);
  const totalSavings = mockWeeklyWaste.reduce((s, w) => s + w.estimatedSavings, 0);
  const netLoss = totalSavings - totalLoss;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display text-foreground">Cozinha</h1>
          <p className="text-sm text-muted-foreground">Olá, {user?.name} · Produção e Reposição</p>
        </div>
        <Button variant="ghost" size="icon" onClick={logout}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      {/* Waste summary cards */}
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

      {/* Forecast bar */}
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

      {/* Buffet Zones Tabs */}
      <Tabs defaultValue="entradas" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          {(['entradas', 'pratos_principais', 'sobremesas'] as BuffetZone[]).map(zone => (
            <TabsTrigger key={zone} value={zone} className="gap-1.5 text-xs">
              {zoneIcon(zone)}
              <span className="hidden sm:inline">{buffetZoneLabels[zone]}</span>
              <span className="sm:hidden">{zone === 'entradas' ? 'Ent.' : zone === 'pratos_principais' ? 'Pratos' : 'Sobr.'}</span>
              {zoneActiveCount(zone) > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{zoneActiveCount(zone)}</Badge>
              )}
            </TabsTrigger>
          ))}
          <TabsTrigger value="recolha" className="gap-1.5 text-xs">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Recolha</span>
            <span className="sm:hidden">Rec.</span>
          </TabsTrigger>
        </TabsList>

        {(['entradas', 'pratos_principais', 'sobremesas'] as BuffetZone[]).map(zone => (
          <TabsContent key={zone} value={zone}>
            <div className="flex items-center justify-between mb-3 mt-1">
              <h2 className="text-base font-display text-foreground flex items-center gap-2">
                {zoneIcon(zone)} {buffetZoneLabels[zone]}
                <span className="text-xs text-muted-foreground font-normal">({zoneItems(zone).length} artigos)</span>
              </h2>
            </div>
            <BuffetZonePanel
              items={zoneItems(zone)}
              trayStates={trayStates}
              onReplenish={handleReplenish}
              onCollect={() => {}}
              userName={user?.name || ''}
            />
          </TabsContent>
        ))}

        <TabsContent value="recolha">
          <div className="mt-1">
            <h2 className="text-base font-display text-foreground flex items-center gap-2 mb-3">
              <Package className="h-5 w-5 text-primary" /> Recolha de Tabuleiros
            </h2>
            <CollectTraysPanel
              items={items}
              trayStates={trayStates}
              onCollect={handleCollect}
              leftoverHistory={leftoverHistory}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
