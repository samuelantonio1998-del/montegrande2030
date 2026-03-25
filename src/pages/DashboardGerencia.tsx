import { AlertTriangle, CheckCircle2, Package, UtensilsCrossed, Trash2, Recycle, TrendingUp, Users, BarChart3, ShoppingCart, ChefHat } from 'lucide-react';
import { KPICard } from '@/components/KPICard';
import { mockKPIs, mockChecklist, mockInventory, mockOrders, mockMesas, mockHistorical } from '@/lib/mock-data';
import { mockProductionRecords, mockProductionAlerts, mockWeeklyWaste } from '@/lib/buffet-data';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function DashboardGerencia() {
  const { user, logout } = useAuth();

  const lowStock = mockInventory.filter(i => i.currentStock <= i.minStock);
  const pendingChecklist = mockChecklist.filter(i => !i.done);
  const activeTrays = mockProductionRecords.filter(r => r.status === 'no_buffet');
  const totalWeeklyWaste = mockWeeklyWaste.reduce((s, d) => s + d.totalWasteKg, 0);
  const totalWeeklySavings = mockWeeklyWaste.reduce((s, d) => s + d.estimatedSavings, 0);
  const totalWeeklyLoss = mockWeeklyWaste.reduce((s, d) => s + d.estimatedLoss, 0);
  const totalPax = mockMesas.reduce((s, m) => s + m.adults + m.children, 0);

  // Waste chart data
  const wasteChartData = mockWeeklyWaste
    .sort((a, b) => b.wastePercentage - a.wastePercentage)
    .slice(0, 5)
    .map(w => ({ name: w.dishName.length > 12 ? w.dishName.slice(0, 12) + '…' : w.dishName, desperdicio: w.totalWasteKg, aproveitamento: w.totalReusedKg }));

  // Team performance (mock)
  const teamPerf = [
    { name: 'João', mesas: 12, tabuleiros: 8 },
    { name: 'Maria', mesas: 15, tabuleiros: 6 },
    { name: 'Pedro', mesas: 8, tabuleiros: 14 },
    { name: 'Ana', mesas: 10, tabuleiros: 10 },
    { name: 'Carlos', mesas: 6, tabuleiros: 12 },
  ];

  // Purchase alerts
  const purchaseAlerts = lowStock.map(item => {
    const avgDailyUsage = item.maxStock * 0.1;
    const daysLeft = Math.ceil(item.currentStock / avgDailyUsage);
    return { ...item, daysLeft, urgency: daysLeft <= 1 ? 'critico' : 'aviso' };
  });

  // Menu engineering insights
  const menuInsights = mockWeeklyWaste
    .filter(w => w.wastePercentage > 12)
    .map(w => ({
      dish: w.dishName,
      waste: w.wastePercentage,
      suggestion: w.wastePercentage > 15
        ? `Reduzir quantidade inicial em 30%`
        : `Monitorizar — considerar couvete mais pequena`,
    }));

  const COLORS = ['hsl(var(--destructive))', 'hsl(var(--success))'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display text-foreground">Painel de Gerência</h1>
          <p className="text-sm text-muted-foreground">Olá, {user?.name} · Terça-feira, 25 de Março 2026</p>
        </div>
        <Button variant="ghost" size="icon" onClick={logout}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {mockKPIs.map((kpi, i) => (
          <KPICard key={kpi.label} kpi={kpi} index={i} />
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Waste analysis chart */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-lg text-card-foreground flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" /> Análise de Desperdício
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Cozinhado vs. Lixo vs. Aproveitamento (kg/semana)</p>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wasteChartData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="kg" />
                <Tooltip />
                <Bar dataKey="desperdicio" fill="hsl(var(--destructive))" radius={[4,4,0,0]} name="Desperdício" />
                <Bar dataKey="aproveitamento" fill="hsl(var(--success))" radius={[4,4,0,0]} name="Aproveitamento" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total perdido: <span className="text-destructive font-medium">€{totalWeeklyLoss.toFixed(0)}</span></span>
            <span className="text-muted-foreground">Total poupado: <span className="text-success font-medium">€{totalWeeklySavings.toFixed(0)}</span></span>
          </div>
        </motion.div>

        {/* Menu engineering */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-lg text-card-foreground flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-primary" /> Engenharia de Menu
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Sugestões baseadas no histórico 2023–2026</p>
          <div className="mt-4 space-y-3">
            {menuInsights.map((insight, i) => (
              <div key={i} className="rounded-lg border border-warning/20 bg-warning/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{insight.dish}</span>
                  <Badge variant="outline" className="text-destructive border-destructive/30 text-[10px]">{insight.waste.toFixed(0)}% desperdício</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">💡 {insight.suggestion}</p>
              </div>
            ))}
            {mockProductionAlerts.map(alert => (
              <div key={alert.id} className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-sm text-foreground">{alert.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Baseado em: {alert.basedOn}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Team performance */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-lg text-card-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Performance da Equipa
          </h2>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamPerf} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={60} />
                <Tooltip />
                <Bar dataKey="mesas" fill="hsl(var(--primary))" radius={[0,4,4,0]} name="Mesas abertas" />
                <Bar dataKey="tabuleiros" fill="hsl(var(--warning))" radius={[0,4,4,0]} name="Tabuleiros" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Purchase alerts + summary */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-lg text-card-foreground flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-warning" /> Alertas de Compras
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Stock vs. previsão próximo fim de semana</p>
          <div className="mt-4 space-y-3">
            {purchaseAlerts.map(item => (
              <div key={item.id} className={cn(
                'flex items-center justify-between rounded-lg p-3',
                item.urgency === 'critico' ? 'bg-destructive/10 border border-destructive/20' : 'bg-warning/10 border border-warning/20'
              )}>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.currentStock}{item.unit} em stock · mín: {item.minStock}{item.unit}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className={cn(
                    'text-[10px]',
                    item.urgency === 'critico' ? 'text-destructive border-destructive/30' : 'text-warning border-warning/30'
                  )}>
                    {item.daysLeft <= 1 ? 'Encomendar HOJE' : `~${item.daysLeft} dias`}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-0.5">€{(item.minStock * item.costPerUnit).toFixed(2)} estimado</p>
                </div>
              </div>
            ))}
            {purchaseAlerts.length === 0 && (
              <div className="text-center py-6 text-sm text-muted-foreground">Stock dentro dos limites ✓</div>
            )}
          </div>

          {/* Quick summary row */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">Em sala</p>
              <p className="text-lg font-bold text-foreground">{totalPax}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">Tabuleiros</p>
              <p className="text-lg font-bold text-primary">{activeTrays.length}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">Checklist</p>
              <p className="text-lg font-bold text-foreground">{mockChecklist.filter(i => i.done).length}/{mockChecklist.length}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
