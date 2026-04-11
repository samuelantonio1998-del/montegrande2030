import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Recycle, Euro, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { useRegistosProducao } from '@/hooks/useRegistosProducao';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function Desperdicio() {
  const { wasteSummary, loading } = useRegistosProducao();
  const wasteData = useMemo(() => wasteSummary(), [wasteSummary]);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekLabel = `${format(weekStart, 'd', { locale: pt })}–${format(weekEnd, 'd MMMM yyyy', { locale: pt })}`;

  const totalWaste = wasteData.reduce((sum, d) => sum + d.totalWasteKg, 0);
  const totalReused = wasteData.reduce((sum, d) => sum + d.totalReusedKg, 0);
  const totalLoss = wasteData.reduce((sum, d) => sum + d.estimatedLoss, 0);
  const totalSavings = wasteData.reduce((sum, d) => sum + d.estimatedSavings, 0);
  const totalProduced = wasteData.reduce((sum, d) => sum + d.totalProducedKg, 0);

  const sortedByWaste = [...wasteData].sort((a, b) => b.wastePercentage - a.wastePercentage);
  const sortedBySavings = [...wasteData].sort((a, b) => b.estimatedSavings - a.estimatedSavings);

  const chartData = wasteData.map(d => ({
    name: d.dishName.length > 12 ? d.dishName.slice(0, 12) + '…' : d.dishName,
    desperdicio: d.totalWasteKg,
    aproveitamento: d.totalReusedKg,
  }));

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">A carregar…</div>;
  }

  if (wasteData.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl text-foreground">Mapa de Desperdício</h1>
          <p className="mt-1 text-muted-foreground">Relatório semanal · {weekLabel}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
          Sem registos de produção para esta semana.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl text-foreground">Mapa de Desperdício</h1>
        <p className="mt-1 text-muted-foreground">Relatório semanal · {weekLabel}</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Produção Total', value: `${totalProduced.toFixed(0)}kg`, icon: BarChart3, color: 'text-primary' },
          { label: 'Desperdício Total', value: `${totalWaste.toFixed(1)}kg`, icon: Trash2, color: 'text-destructive' },
          { label: 'Aproveitamento', value: `${totalReused.toFixed(1)}kg`, icon: Recycle, color: 'text-success' },
          { label: 'Perdas vs Poupança', value: `€${(totalSavings - totalLoss).toFixed(0)}`, icon: Euro, color: totalSavings > totalLoss ? 'text-success' : 'text-destructive' },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <kpi.icon className={cn('h-5 w-5', kpi.color)} />
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-foreground">{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <h2 className="font-display text-xl text-card-foreground mb-4">Desperdício vs Aproveitamento por Prato</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} unit="kg" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="desperdicio" name="Desperdício" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="aproveitamento" name="Aproveitamento" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Top 3 lists */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Waste */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <h2 className="font-display text-xl text-card-foreground flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" /> Top 3 — Mais Desperdício
          </h2>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Sugere-se diminuir frequência ou quantidade</p>
          <div className="space-y-3">
            {sortedByWaste.filter(i => i.totalWasteKg > 0).slice(0, 3).map((item, i) => (
              <div key={item.dishName} className="flex items-center gap-4 rounded-lg bg-destructive/5 p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-sm font-bold text-destructive">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{item.dishName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.totalWasteKg.toFixed(1)}kg desperdiçados de {item.totalProducedKg.toFixed(1)}kg
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-destructive">{item.wastePercentage.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">-€{item.estimatedLoss.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top Savings */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <h2 className="font-display text-xl text-card-foreground flex items-center gap-2">
            <Recycle className="h-5 w-5 text-success" /> Top 3 — Melhor Aproveitamento
          </h2>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Poupança ao transformar sobras em novos produtos</p>
          <div className="space-y-3">
            {sortedBySavings.filter(i => i.estimatedSavings > 0).slice(0, 3).map((item, i) => (
              <div key={item.dishName} className="flex items-center gap-4 rounded-lg bg-success/5 p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-sm font-bold text-success">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{item.dishName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.totalReusedKg.toFixed(1)}kg reaproveitados
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-success">+€{item.estimatedSavings.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Detailed table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <h2 className="font-display text-xl text-card-foreground mb-4">Detalhe por Prato</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 font-medium text-muted-foreground">Prato</th>
                <th className="pb-3 font-medium text-muted-foreground text-right">Produzido</th>
                <th className="pb-3 font-medium text-muted-foreground text-right">Desperdício</th>
                <th className="pb-3 font-medium text-muted-foreground text-right">Aproveitado</th>
                <th className="pb-3 font-medium text-muted-foreground text-right">% Perda</th>
                <th className="pb-3 font-medium text-muted-foreground text-right">€ Perdido</th>
                <th className="pb-3 font-medium text-muted-foreground text-right">€ Poupado</th>
              </tr>
            </thead>
            <tbody>
              {wasteData.map(item => (
                <tr key={item.dishName} className="border-b border-border/50">
                  <td className="py-3 font-medium text-foreground">{item.dishName}</td>
                  <td className="py-3 text-right text-muted-foreground">{item.totalProducedKg.toFixed(1)}kg</td>
                  <td className="py-3 text-right text-destructive">{item.totalWasteKg.toFixed(1)}kg</td>
                  <td className="py-3 text-right text-success">{item.totalReusedKg.toFixed(1)}kg</td>
                  <td className="py-3 text-right">
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      item.wastePercentage > 15 ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                    )}>
                      {item.wastePercentage.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 text-right text-destructive">-€{item.estimatedLoss.toFixed(2)}</td>
                  <td className="py-3 text-right text-success">+€{item.estimatedSavings.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className="pt-3 text-foreground">Total</td>
                <td className="pt-3 text-right text-foreground">{totalProduced.toFixed(0)}kg</td>
                <td className="pt-3 text-right text-destructive">{totalWaste.toFixed(1)}kg</td>
                <td className="pt-3 text-right text-success">{totalReused.toFixed(1)}kg</td>
                <td className="pt-3 text-right">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {totalProduced > 0 ? ((totalWaste / totalProduced) * 100).toFixed(1) : '0.0'}%
                  </span>
                </td>
                <td className="pt-3 text-right text-destructive">-€{totalLoss.toFixed(2)}</td>
                <td className="pt-3 text-right text-success">+€{totalSavings.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
