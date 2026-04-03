import { Users, CheckCircle2, Circle, AlertTriangle, Clock, LogOut, ClipboardCheck } from 'lucide-react';
import { useTarefas, type Tarefa } from '@/hooks/useTarefas';
import { useMesas } from '@/hooks/useMesas';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLog } from '@/hooks/useActivityLog';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useState } from 'react';

const categories = [
  { key: 'all', label: 'Todas' },
  { key: 'abertura', label: 'Abertura' },
  { key: 'fecho', label: 'Fecho' },
  { key: 'limpeza', label: 'Limpeza' },
] as const;

export default function DashboardSala() {
  const { user, logout } = useAuth();
  const { tarefas, completeTarefa } = useTarefas();
  const { mesas } = useMesas();
  const [filter, setFilter] = useState<string>('all');

  const totalInRoom = mesas.filter(m => m.status === 'ocupada' || m.status === 'conta').reduce((s, m) => s + m.adults + m.children2to6 + m.children7to12, 0);
  const occupiedCount = mesas.filter(m => m.status === 'ocupada' || m.status === 'conta').length;

  const toggleItem = async (task: Tarefa) => {
    if (!task.concluida) {
      await completeTarefa(task.id, task.periodicidade);
    }
  };

  const activeTasks = tarefas.filter(i => !i.concluida);
  const filtered = filter === 'all' ? activeTasks : activeTasks.filter(i => i.categoria === filter);
  const doneCount = tarefas.filter(i => i.concluida).length;
  const progress = tarefas.length > 0 ? (doneCount / tarefas.length) * 100 : 0;

  const myTasks = tarefas.filter(i => i.responsavel === user?.name);
  const myDoneCount = myTasks.filter(i => i.concluida).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display text-foreground">Olá, {user?.name}</h1>
          <p className="text-sm text-muted-foreground">Sala · {totalInRoom} pessoas em sala</p>
        </div>
        <Button variant="ghost" size="icon" onClick={logout}><LogOut className="h-5 w-5" /></Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <Users className="mx-auto h-5 w-5 text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{totalInRoom}</p>
          <p className="text-xs text-muted-foreground">Em sala</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <Clock className="mx-auto h-5 w-5 text-warning mb-1" />
          <p className="text-2xl font-bold text-foreground">{occupiedCount}/{mesas.length}</p>
          <p className="text-xs text-muted-foreground">Mesas ocupadas</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <ClipboardCheck className="mx-auto h-5 w-5 text-success mb-1" />
          <p className="text-2xl font-bold text-foreground">{doneCount}/{tarefas.length}</p>
          <p className="text-xs text-muted-foreground">Tarefas feitas</p>
        </div>
      </div>

      {myTasks.length > 0 && (
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">As minhas tarefas</h3>
            <Badge variant="outline" className="text-xs">{myDoneCount}/{myTasks.length}</Badge>
          </div>
          <Progress value={myTasks.length > 0 ? (myDoneCount / myTasks.length) * 100 : 0} className="h-2" />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Tarefas do dia</h2>
          <div className="flex gap-1.5">
            {categories.map(cat => (
              <button key={cat.key} onClick={() => setFilter(cat.key)} className={cn('rounded-lg px-3 py-1.5 text-xs font-medium transition-colors', filter === cat.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <Progress value={progress} className="h-2 mb-4" />

        <div className="space-y-2">
          {filtered.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              onClick={() => toggleItem(item)}
              className={cn('flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all active:scale-[0.98]',
                item.concluida ? 'border-success/20 bg-success/5' : item.critica ? 'border-warning/30 bg-warning/5' : 'border-border bg-card')}>
              {item.concluida ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" /> : <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />}
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium truncate', item.concluida ? 'text-muted-foreground line-through' : 'text-foreground')}>{item.titulo}</p>
                <p className="text-xs text-muted-foreground">{item.responsavel}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {item.critica && !item.concluida && <span className="flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning"><AlertTriangle className="h-3 w-3" /></span>}
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">{item.categoria === 'manutencao' ? 'Manutenção' : item.categoria}</span>
              </div>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="mx-auto h-8 w-8 mb-2 text-success" />
              <p className="text-sm">Tudo feito!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
