import { useState } from 'react';
import { Plus, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { mockOrders, staff, type ServiceOrder } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const priorityConfig = {
  alta: { color: 'bg-destructive/10 text-destructive', icon: AlertCircle },
  media: { color: 'bg-warning/10 text-warning', icon: Clock },
  baixa: { color: 'bg-muted text-muted-foreground', icon: Clock },
};

const statusConfig = {
  pendente: { color: 'bg-warning/10 text-warning', label: 'Pendente' },
  em_progresso: { color: 'bg-primary/10 text-primary', label: 'Em Progresso' },
  concluida: { color: 'bg-success/10 text-success', label: 'Concluída' },
};

export default function Ordens() {
  const [orders, setOrders] = useState<ServiceOrder[]>(mockOrders);
  const [showForm, setShowForm] = useState(false);
  const [newOrder, setNewOrder] = useState({ title: '', description: '', assignee: staff[0], priority: 'media' as const });

  const cycleStatus = (id: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== id) return o;
      const next = o.status === 'pendente' ? 'em_progresso' : o.status === 'em_progresso' ? 'concluida' : 'pendente';
      return { ...o, status: next };
    }));
  };

  const addOrder = () => {
    if (!newOrder.title) return;
    setOrders(prev => [...prev, {
      id: String(Date.now()),
      ...newOrder,
      status: 'pendente',
      createdAt: new Date().toISOString(),
    }]);
    setNewOrder({ title: '', description: '', assignee: staff[0], priority: 'media' });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl text-foreground">Ordens de Serviço</h1>
          <p className="mt-1 text-muted-foreground">
            {orders.filter(o => o.status !== 'concluida').length} pendente(s)
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova Ordem
        </button>
      </div>

      {/* New order form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4"
        >
          <input
            placeholder="Título da ordem..."
            value={newOrder.title}
            onChange={e => setNewOrder(p => ({ ...p, title: e.target.value }))}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <textarea
            placeholder="Descrição..."
            value={newOrder.description}
            onChange={e => setNewOrder(p => ({ ...p, description: e.target.value }))}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            rows={2}
          />
          <div className="flex gap-3">
            <select
              value={newOrder.assignee}
              onChange={e => setNewOrder(p => ({ ...p, assignee: e.target.value }))}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              {staff.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={newOrder.priority}
              onChange={e => setNewOrder(p => ({ ...p, priority: e.target.value as any }))}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
            <button
              onClick={addOrder}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Criar
            </button>
          </div>
        </motion.div>
      )}

      {/* Orders list */}
      <div className="space-y-3">
        {orders.map((order, i) => {
          const pri = priorityConfig[order.priority];
          const stat = statusConfig[order.status];
          const PriIcon = pri.icon;
          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                'rounded-xl border p-4 transition-all cursor-pointer hover:shadow-sm',
                order.status === 'concluida' ? 'border-success/20 bg-success/5 opacity-60' : 'border-border bg-card'
              )}
              onClick={() => cycleStatus(order.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {order.status === 'concluida' ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
                  ) : (
                    <PriIcon className={cn('mt-0.5 h-5 w-5', order.priority === 'alta' ? 'text-destructive' : 'text-warning')} />
                  )}
                  <div>
                    <p className={cn(
                      'text-sm font-medium',
                      order.status === 'concluida' ? 'text-muted-foreground line-through' : 'text-foreground'
                    )}>
                      {order.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{order.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{order.assignee}</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', stat.color)}>
                    {stat.label}
                  </span>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', pri.color)}>
                    {order.priority}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground text-center">Clique numa ordem para avançar o status</p>
    </div>
  );
}
