import { AlertTriangle, CheckCircle2, Package, UtensilsCrossed, Trash2, Recycle, TrendingUp, Users, BarChart3, ShoppingCart, ChefHat, LogOut, Activity, Clock, Undo2, Edit3 } from 'lucide-react';
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
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { EditInventoryEntryDialog } from '@/components/gerencia/EditInventoryEntryDialog';

type ProdutoStock = { id: string; nome: string; stock_atual: number; stock_minimo: number; stock_maximo: number; custo_medio: number; unidade: string; fornecedor_id: string | null };
type ActivityLog = { id: string; user_name: string; user_role: string; action: string; module: string; details: string; created_at: string; metadata: Record<string, any> | null };

export default function DashboardGerencia() {
  const { user, logout } = useAuth();
  const { mesas } = useMesas();
  const { activeTrays, wasteSummary } = useRegistosProducao();
  const { tarefas } = useTarefas();
  const [lowStock, setLowStock] = useState<ProdutoStock[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logModuleFilter, setLogModuleFilter] = useState<string>('all');
  const [logPeriodFilter, setLogPeriodFilter] = useState<string>('hoje');
  const [editingEntry, setEditingEntry] = useState<ActivityLog | null>(null);

  useEffect(() => {
    supabase.from('produtos').select('id, nome, stock_atual, stock_minimo, stock_maximo, custo_medio, unidade, fornecedor_id')
      .then(({ data }) => {
        if (data) setLowStock((data as unknown as ProdutoStock[]).filter(p => p.stock_atual <= p.stock_minimo));
      });
    // Fetch recent activity logs
    supabase.from('activity_logs').select('id, user_name, user_role, action, module, details, metadata, created_at')
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

  const undoAction = async (entry: ActivityLog) => {
    const meta = entry.metadata;
    if (!meta?.undo_type) {
      toast.error('Esta ação não pode ser desfeita');
      return;
    }
    try {
      switch (meta.undo_type) {
        case 'mesa_fechada':
        case 'mesa_cancelada': {
          // Reopen mesa with original data
          await supabase.from('mesas').update({
            status: 'ocupada',
            adults: meta.adults as number,
            children2to6: meta.children2to6 as number,
            children7to12: meta.children7to12 as number,
            waiter: (meta.waiter as string) || '',
            opened_at: (meta.openedAt as string) || new Date().toISOString(),
            beverages: JSON.parse(JSON.stringify(meta.beverages || [])),
          }).eq('id', meta.mesa_id as string);
          // Remove fecho_mesas record for today if it was a close
          if (meta.undo_type === 'mesa_fechada' && meta.data) {
            await supabase.from('fecho_mesas').delete()
              .eq('mesa_number', meta.mesa_number as number)
              .eq('data', meta.data as string)
              .order('created_at', { ascending: false })
              .limit(1);
            // Reverse stock deductions for beverages
            if (Array.isArray(meta.beverages)) {
              const { data: produtos } = await supabase.from('produtos').select('id, nome, stock_atual');
              if (produtos) {
                for (const bev of meta.beverages as any[]) {
                  const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
                  const bevNorm = normalize(bev.name);
                  const match = produtos.find(p => {
                    const pNorm = normalize(p.nome);
                    return pNorm === bevNorm || pNorm.includes(bevNorm) || bevNorm.includes(pNorm);
                  });
                  if (match) {
                    await supabase.from('produtos').update({ stock_atual: match.stock_atual + bev.quantity }).eq('id', match.id);
                  }
                }
              }
            }
          }
          toast.success(`Mesa ${meta.mesa_number} reaberta`);
          break;
        }
        case 'mesa_aberta': {
          // Close mesa back to livre
          const { error: undoMesaErr } = await supabase.from('mesas').update({
            status: 'livre', adults: 0, children2to6: 0, children7to12: 0, waiter: '', opened_at: null, beverages: [],
          }).eq('id', meta.mesa_id as string);
          if (undoMesaErr) {
            console.error('Erro undo mesa_aberta:', undoMesaErr);
            toast.error('Erro ao reverter abertura da mesa');
            return;
          }
          toast.success(`Mesa ${meta.mesa_number} fechada (undo)`);
          break;
        }
        case 'tarefa_concluida': {
          const periodicidade = meta.periodicidade as string;
          if (periodicidade === 'unica') {
            // Re-insert the task
            await supabase.from('tarefas').insert([{
              titulo: meta.titulo as string,
              categoria: (meta.categoria as string) || 'outro',
              periodicidade,
              concluida: false,
              responsavel: '',
              prioridade: 'media',
            }]);
          } else {
            await supabase.from('tarefas').update({ concluida: false }).eq('id', meta.tarefa_id as string);
          }
          toast.success(`Tarefa "${meta.titulo}" revertida`);
          break;
        }
        case 'reposicao_buffet': {
          // Delete the last production record for this item
          const { data: registos } = await supabase.from('registos_producao')
            .select('id')
            .eq('buffet_item_id', meta.itemId as string)
            .eq('estado', 'no_buffet')
            .order('created_at', { ascending: false })
            .limit(1);
          if (registos?.[0]) {
            await supabase.from('registos_producao').delete().eq('id', registos[0].id);
          }
          toast.success(`Reposição de "${meta.itemName}" revertida`);
          break;
        }
        case 'recolha_tabuleiro': {
          // Revert the last collected tray back to no_buffet
          const { data: recolhidos } = await supabase.from('registos_producao')
            .select('id')
            .eq('buffet_item_id', meta.itemId as string)
            .in('estado', ['aproveitado', 'desperdicio'])
            .order('recolhido_at', { ascending: false })
            .limit(1);
          if (recolhidos?.[0]) {
            await supabase.from('registos_producao').update({
              estado: 'no_buffet', recolhido_at: null, sobra_kg: null, sobra_acao: null, aproveitamento_nota: null,
            }).eq('id', recolhidos[0].id);
          }
          toast.success(`Recolha de "${meta.itemName}" revertida`);
          break;
        }
        case 'dia_fechado': {
          // Remove the vendas_historico entry for that day
          await supabase.from('vendas_historico').delete().eq('data', meta.data as string);
          toast.success(`Fecho do dia ${meta.data} revertido`);
          break;
        }
        default:
          toast.error('Tipo de ação não suportado para undo');
          return;
      }
      // Delete the log entry
      await supabase.from('activity_logs').delete().eq('id', entry.id);
      setLogs(prev => prev.filter(l => l.id !== entry.id));
    } catch (e) {
      console.error('Erro ao desfazer ação:', e);
      toast.error('Erro ao desfazer ação');
    }
  };

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
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-lg text-card-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Registo de Atividade
          </h2>
        </div>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {/* Module filter */}
          {['all', ...Array.from(new Set(logs.map(l => l.module))).sort()].map(mod => (
            <button key={mod} onClick={() => setLogModuleFilter(mod)}
              className={cn('rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                logModuleFilter === mod ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
              {mod === 'all' ? 'Todos' : mod}
            </button>
          ))}
          <span className="text-muted-foreground/30">·</span>
          {/* Period filter */}
          {[
            { key: 'hoje', label: 'Hoje' },
            { key: '7dias', label: '7 dias' },
            { key: '30dias', label: '30 dias' },
            { key: 'tudo', label: 'Tudo' },
          ].map(p => (
            <button key={p.key} onClick={() => setLogPeriodFilter(p.key)}
              className={cn('rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                logPeriodFilter === p.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {(() => {
            const now = new Date();
            const todayStr = now.toISOString().slice(0, 10);
            const cutoff = logPeriodFilter === 'hoje' ? todayStr
              : logPeriodFilter === '7dias' ? new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10)
              : logPeriodFilter === '30dias' ? new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10)
              : '1970-01-01';
            const filtered = logs.filter(l =>
              (logModuleFilter === 'all' || l.module === logModuleFilter) &&
              l.created_at.slice(0, 10) >= cutoff
            );
            if (filtered.length === 0) {
              return (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Clock className="mx-auto h-6 w-6 mb-2" />
                  Sem atividade registada
                </div>
              );
            }
            return filtered.map((entry) => {
              const time = new Date(entry.created_at);
              const timeStr = time.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
              const dateStr = time.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
              const isToday = time.toISOString().slice(0, 10) === todayStr;
              const moduleColors: Record<string, string> = {
                Mesas: 'bg-primary/10 text-primary',
                Cozinha: 'bg-orange-100 text-orange-700',
                Tarefas: 'bg-success/10 text-success',
              };
              const moduleColor = moduleColors[entry.module] || 'bg-muted text-muted-foreground';
              return (
                <div key={entry.id} className="group flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-muted/30 transition-colors">
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
                  <button onClick={() => undoAction(entry)} className="shrink-0 rounded-full p-1.5 opacity-0 group-hover:opacity-100 hover:bg-warning/10 transition-all" title="Desfazer ação">
                    <Undo2 className="h-3.5 w-3.5 text-warning" />
                  </button>
                </div>
              );
            });
          })()}
        </div>
      </motion.div>
    </div>
  );
}
