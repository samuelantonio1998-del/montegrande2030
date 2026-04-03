import { AlertTriangle, CheckCircle2, Package, UtensilsCrossed, Trash2, Recycle, TrendingUp, Users, BarChart3, ShoppingCart, ChefHat, LogOut, Activity, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMesas } from '@/hooks/useMesas';
import { useRegistosProducao } from '@/hooks/useRegistosProducao';
import { useTarefas } from '@/hooks/useTarefas';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

type ProdutoStock = { id: string; nome: string; stock_atual: number; stock_minimo: number; stock_maximo: number; custo_medio: number; unidade: string; fornecedor_id: string | null };
type ActivityLog = { id: string; user_name: string; user_role: string; action: string; module: string; details: string; created_at: string };

export default function DashboardGerencia() {
  const { user, logout } = useAuth();
  const { mesas } = useMesas();
  const { activeTrays, wasteSummary } = useRegistosProducao();
  const { tarefas } = useTarefas();
  const [lowStock, setLowStock] = useState<ProdutoStock[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  useEffect(() => {
    supabase.from('produtos').select('id, nome, stock_atual, stock_minimo, stock_maximo, custo_medio, unidade, fornecedor_id')
      .then(({ data }) => {
        if (data) setLowStock((data as unknown as ProdutoStock[]).filter(p => p.stock_atual <= p.stock_minimo));
      });
    // Fetch recent activity logs
    supabase.from('activity_logs').select('id, user_name, user_role, action, module, details, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setLogs(data as unknown as ActivityLog[]);
      });
  }, []);

  const totalPax = mesas.filter(m => m.status === 'ocupada').reduce((s, m) => s + m.adults + m.children2to6 + m.children7to12, 0);
  const occupiedCount = mesas.filter(m => m.status === 'ocupada' || m.status === 'conta').length;

  const waste = wasteSummary();
  const totalWeeklyWaste = waste.reduce((s, d) => s + d.totalWasteKg, 0);
  const totalWeeklySavings = waste.reduce((s, d) => s + d.estimatedSavings, 0);
  const totalWeeklyLoss = waste.reduce((s, d) => s + d.estimatedLoss, 0);

  const wasteChartData = waste
    .sort((a, b) => b.wastePercentage - a.wastePercentage)
    .slice(0, 5)
    .map(w => ({ name: w.dishName.length > 12 ? w.dishName.slice(0, 12) + '…' : w.dishName, desperdicio: w.totalWasteKg, aproveitamento: w.totalReusedKg }));

  const doneCount = tarefas.filter(t => t.concluida).length;
  const totalTasks = tarefas.length;

  const purchaseAlerts = lowStock.map(item => {
    const avgDailyUsage = item.stock_maximo * 0.1;
    const daysLeft = avgDailyUsage > 0 ? Math.ceil(item.stock_atual / avgDailyUsage) : 99;
    return { ...item, daysLeft, urgency: daysLeft <= 1 ? 'critico' as const : 'aviso' as const };
  });

  const menuInsights = waste
    .filter(w => w.wastePercentage > 12)
    .map(w => ({
      dish: w.dishName,
      waste: w.wastePercentage,
      suggestion: w.wastePercentage > 15 ? 'Reduzir quantidade inicial em 30%' : 'Monitorizar — considerar couvete mais pequena',
    }));

  const alerts = waste.filter(w => w.wastePercentage > 15).map(w => ({
    id: w.dishName,
    message: `${w.dishName} tem ${w.wastePercentage.toFixed(0)}% de desperdício.`,
    basedOn: 'Dados de produção de hoje',
  }));

  const today = new Date();
  const dayLabel = format(today, "EEEE, d 'de' MMMM yyyy", { locale: pt });

  // Compute revenue from occupied tables (rough estimate)
  const totalRevenue = mesas.filter(m => m.status === 'ocupada' || m.status === 'conta')
    .reduce((s, m) => s + m.beverages.reduce((bs, b) => bs + b.quantity * b.unitPrice, 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display text-foreground">Painel de Gerência</h1>
          <p className="text-sm text-muted-foreground capitalize">Olá, {user?.name} · {dayLabel}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={logout}><LogOut className="h-5 w-5" /></Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">Em Sala</p>
          <p className="text-2xl font-bold text-foreground">{totalPax}</p>
          <p className="text-xs text-muted-foreground">{occupiedCount} mesas ocupadas</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">Tabuleiros Ativos</p>
          <p className="text-2xl font-bold text-primary">{activeTrays.length}</p>
          <p className="text-xs text-muted-foreground">no buffet agora</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">Desperdício Hoje</p>
          <p className="text-2xl font-bold text-destructive">{totalWeeklyWaste.toFixed(1)}kg</p>
          <p className="text-xs text-muted-foreground">€{totalWeeklyLoss.toFixed(0)} perdidos</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">Tarefas</p>
          <p className="text-2xl font-bold text-foreground">{doneCount}/{totalTasks}</p>
          <p className="text-xs text-muted-foreground">concluídas</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Waste chart */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-lg text-card-foreground flex items-center gap-2"><Trash2 className="h-5 w-5 text-destructive" /> Análise de Desperdício</h2>
          <p className="text-xs text-muted-foreground mt-1">Desperdício vs. Aproveitamento (kg/hoje)</p>
          <div className="mt-4 h-52">
            {wasteChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wasteChartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="kg" />
                  <Tooltip />
                  <Bar dataKey="desperdicio" fill="hsl(var(--destructive))" radius={[4,4,0,0]} name="Desperdício" />
                  <Bar dataKey="aproveitamento" fill="hsl(var(--success))" radius={[4,4,0,0]} name="Aproveitamento" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Sem dados de produção hoje</div>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total perdido: <span className="text-destructive font-medium">€{totalWeeklyLoss.toFixed(0)}</span></span>
            <span className="text-muted-foreground">Total poupado: <span className="text-success font-medium">€{totalWeeklySavings.toFixed(0)}</span></span>
          </div>
        </motion.div>

        {/* Menu engineering */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-lg text-card-foreground flex items-center gap-2"><ChefHat className="h-5 w-5 text-primary" /> Engenharia de Menu</h2>
          <p className="text-xs text-muted-foreground mt-1">Sugestões baseadas nos dados de produção</p>
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
            {alerts.map(alert => (
              <div key={alert.id} className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-sm text-foreground">{alert.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Baseado em: {alert.basedOn}</p>
              </div>
            ))}
            {menuInsights.length === 0 && alerts.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">Sem alertas de desperdício hoje</div>
            )}
          </div>
        </motion.div>

        {/* Purchase alerts */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <h2 className="font-display text-lg text-card-foreground flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-warning" /> Alertas de Compras</h2>
          <p className="text-xs text-muted-foreground mt-1">Produtos com stock abaixo do mínimo</p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {purchaseAlerts.map(item => (
              <div key={item.id} className={cn('flex items-center justify-between rounded-lg p-3', item.urgency === 'critico' ? 'bg-destructive/10 border border-destructive/20' : 'bg-warning/10 border border-warning/20')}>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.nome}</p>
                  <p className="text-xs text-muted-foreground">{item.stock_atual} {item.unidade} em stock · mín: {item.stock_minimo} {item.unidade}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className={cn('text-[10px]', item.urgency === 'critico' ? 'text-destructive border-destructive/30' : 'text-warning border-warning/30')}>
                    {item.daysLeft <= 1 ? 'Encomendar HOJE' : `~${item.daysLeft} dias`}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-0.5">€{(item.stock_minimo * item.custo_medio).toFixed(2)} estimado</p>
                </div>
              </div>
            ))}
            {purchaseAlerts.length === 0 && <div className="text-center py-6 text-sm text-muted-foreground sm:col-span-2">Stock dentro dos limites ✓</div>}
          </div>
        </motion.div>
      </div>

      {/* Activity Feed */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg text-card-foreground flex items-center gap-2 mb-1">
          <Activity className="h-5 w-5 text-primary" /> Registo de Atividade
        </h2>
        <p className="text-xs text-muted-foreground mb-4">Últimas ações da equipa</p>
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {logs.map((entry) => {
            const time = new Date(entry.created_at);
            const timeStr = time.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
            const dateStr = time.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
            const isToday = time.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);

            const moduleColors: Record<string, string> = {
              Mesas: 'bg-primary/10 text-primary',
              Cozinha: 'bg-orange-100 text-orange-700',
              Tarefas: 'bg-success/10 text-success',
            };
            const moduleColor = moduleColors[entry.module] || 'bg-muted text-muted-foreground';

            return (
              <div key={entry.id} className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-muted/30 transition-colors">
                <div className="flex flex-col items-center shrink-0 pt-0.5">
                  <span className="text-[10px] text-muted-foreground">{isToday ? timeStr : dateStr}</span>
                  {!isToday && <span className="text-[10px] text-muted-foreground">{timeStr}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{entry.action}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', moduleColor)}>{entry.module}</span>
                  </div>
                  {entry.details && <p className="text-xs text-muted-foreground truncate">{entry.details}</p>}
                  <p className="text-[10px] text-muted-foreground/70">{entry.user_name}{entry.user_role ? ` · ${entry.user_role}` : ''}</p>
                </div>
              </div>
            );
          })}
          {logs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Clock className="mx-auto h-6 w-6 mb-2" />
              Sem atividade registada
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
