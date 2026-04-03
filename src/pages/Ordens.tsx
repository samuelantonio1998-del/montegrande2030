import { useState } from 'react';
import { Plus, Clock, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { useTarefas, type Tarefa } from '@/hooks/useTarefas';
import { useEmployees } from '@/hooks/useEmployees';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

const priorityConfig = {
  alta: { color: 'bg-destructive/10 text-destructive', icon: AlertCircle },
  media: { color: 'bg-warning/10 text-warning', icon: Clock },
  baixa: { color: 'bg-muted text-muted-foreground', icon: Clock },
};

const statusMap = (t: Tarefa) => {
  if (t.concluida) return { color: 'bg-success/10 text-success', label: 'Concluída' };
  return { color: 'bg-warning/10 text-warning', label: 'Pendente' };
};

export default function Ordens() {
  const { tarefas, loading, addTarefa, completeTarefa, deleteTarefa } = useTarefas();
  const { employees } = useEmployees();
  const staffNames = employees.map(e => e.name);
  const { toast } = useToast();
  
  // Filter to only show 'manutencao' and 'outro' categories (service orders)
  const orders = tarefas.filter(t => t.categoria === 'manutencao' || t.categoria === 'outro');
  
  const [showForm, setShowForm] = useState(false);
  const [newOrder, setNewOrder] = useState({ title: '', description: '', assignee: staffNames[0] || '', priority: 'media' as 'alta' | 'media' | 'baixa' });

  const cycleStatus = async (task: Tarefa) => {
    if (!task.concluida) {
      await completeTarefa(task.id, task.periodicidade);
      toast({ title: 'Ordem concluída', description: task.titulo });
    }
  };

  const addOrder = async () => {
    if (!newOrder.title) return;
    await addTarefa({
      titulo: newOrder.title,
      descricao: newOrder.description || null,
      categoria: 'manutencao',
      responsavel: newOrder.assignee,
      prioridade: newOrder.priority,
      critica: newOrder.priority === 'alta',
      periodicidade: 'unica',
    });
    setNewOrder({ title: '', description: '', assignee: staffNames[0] || '', priority: 'media' });
    setShowForm(false);
    toast({ title: 'Ordem criada' });
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">A carregar...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl text-foreground">Ordens de Serviço</h1>
          <p className="mt-1 text-muted-foreground">{orders.filter(o => !o.concluida).length} pendente(s)</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Nova Ordem
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <input placeholder="Título da ordem..." value={newOrder.title} onChange={e => setNewOrder(p => ({ ...p, title: e.target.value }))}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <textarea placeholder="Descrição..." value={newOrder.description} onChange={e => setNewOrder(p => ({ ...p, description: e.target.value }))}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" rows={2} />
          <div className="flex gap-3">
            <select value={newOrder.assignee} onChange={e => setNewOrder(p => ({ ...p, assignee: e.target.value }))} className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground">
              {staffNames.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={newOrder.priority} onChange={e => setNewOrder(p => ({ ...p, priority: e.target.value as any }))} className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground">
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
            <button onClick={addOrder} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Criar</button>
          </div>
        </motion.div>
      )}

      <div className="space-y-3">
        {orders.map((task, i) => {
          const pri = priorityConfig[task.prioridade];
          const stat = statusMap(task);
          const PriIcon = pri.icon;
          return (
            <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={cn('rounded-xl border p-4 transition-all cursor-pointer hover:shadow-sm', task.concluida ? 'border-success/20 bg-success/5 opacity-60' : 'border-border bg-card')}
              onClick={() => cycleStatus(task)}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {task.concluida ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" /> : <PriIcon className={cn('mt-0.5 h-5 w-5', task.prioridade === 'alta' ? 'text-destructive' : 'text-warning')} />}
                  <div>
                    <p className={cn('text-sm font-medium', task.concluida ? 'text-muted-foreground line-through' : 'text-foreground')}>{task.titulo}</p>
                    {task.descricao && <p className="mt-0.5 text-xs text-muted-foreground">{task.descricao}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{task.responsavel}</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', stat.color)}>{stat.label}</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', pri.color)}>{task.prioridade}</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteTarefa(task.id); }} className="rounded-lg p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground text-center">Clique numa ordem para a concluir</p>
    </div>
  );
}
