import { AlertTriangle, CheckCircle2, Package } from 'lucide-react';
import { KPICard } from '@/components/KPICard';
import { mockKPIs, mockChecklist, mockInventory, mockOrders } from '@/lib/mock-data';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const pendingChecklist = mockChecklist.filter(i => !i.done);
  const lowStock = mockInventory.filter(i => i.currentStock <= i.minStock);
  const pendingOrders = mockOrders.filter(o => o.status !== 'concluida');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl text-foreground">Bom dia, Gerente</h1>
        <p className="mt-1 text-muted-foreground">Terça-feira, 25 de Março 2026</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {mockKPIs.map((kpi, i) => (
          <KPICard key={kpi.label} kpi={kpi} index={i} />
        ))}
      </div>

      {/* Alerts + Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <h2 className="font-display text-xl text-card-foreground">Alertas</h2>
          <div className="mt-4 space-y-3">
            {lowStock.map(item => (
              <div key={item.id} className="flex items-start gap-3 rounded-lg bg-destructive/10 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-foreground">Stock baixo: {item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.currentStock}{item.unit} restantes (mín: {item.minStock}{item.unit})
                  </p>
                </div>
              </div>
            ))}
            {pendingChecklist.filter(i => i.critical).map(item => (
              <div key={item.id} className="flex items-start gap-3 rounded-lg bg-warning/10 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
                <div>
                  <p className="text-sm font-medium text-foreground">Tarefa crítica pendente</p>
                  <p className="text-xs text-muted-foreground">{item.task} — {item.assignee}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick overview */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <h2 className="font-display text-xl text-card-foreground">Resumo do Dia</h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm font-medium text-foreground">Checklist</p>
                  <p className="text-xs text-muted-foreground">
                    {mockChecklist.filter(i => i.done).length}/{mockChecklist.length} concluídas
                  </p>
                </div>
              </div>
              <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-success transition-all"
                  style={{ width: `${(mockChecklist.filter(i => i.done).length / mockChecklist.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Inventário</p>
                  <p className="text-xs text-muted-foreground">
                    {lowStock.length} item(ns) abaixo do mínimo
                  </p>
                </div>
              </div>
              <span className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-medium',
                lowStock.length > 0 ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'
              )}>
                {lowStock.length > 0 ? 'Atenção' : 'OK'}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-sm font-medium text-foreground">Ordens de Serviço</p>
                  <p className="text-xs text-muted-foreground">
                    {pendingOrders.length} pendente(s)
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">
                {pendingOrders.length}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
