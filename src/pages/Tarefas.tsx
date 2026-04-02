import { useState } from 'react';
import { Plus, CheckCircle2, Circle, AlertTriangle, Clock, AlertCircle, Trash2, RefreshCw } from 'lucide-react';
import { mockTasks, staff, type Task, type TaskPeriodicity } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

const categories = [
  { key: 'all', label: 'Todas' },
  { key: 'abertura', label: 'Abertura' },
  { key: 'fecho', label: 'Fecho' },
  { key: 'limpeza', label: 'Limpeza' },
  { key: 'manutencao', label: 'Manutenção' },
  { key: 'outro', label: 'Outro' },
] as const;

const priorityConfig = {
  alta: { color: 'bg-destructive/10 text-destructive', icon: AlertCircle, label: 'Alta' },
  media: { color: 'bg-warning/10 text-warning', icon: Clock, label: 'Média' },
  baixa: { color: 'bg-muted text-muted-foreground', icon: Clock, label: 'Baixa' },
};

const periodicityLabels: Record<TaskPeriodicity, string> = {
  unica: 'Única',
  diaria: 'Diária',
  semanal: 'Semanal',
  mensal: 'Mensal',
  trimestral: 'Trimestral',
};

const periodicityColors: Record<TaskPeriodicity, string> = {
  unica: 'bg-muted text-muted-foreground',
  diaria: 'bg-primary/10 text-primary',
  semanal: 'bg-accent text-accent-foreground',
  mensal: 'bg-warning/10 text-warning',
  trimestral: 'bg-destructive/10 text-destructive',
};

export default function Tarefas() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [filter, setFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    category: 'outro' as Task['category'],
    assignee: staff[0],
    priority: 'media' as Task['priority'],
    critical: false,
    periodicity: 'unica' as TaskPeriodicity,
  });

  // Only show non-done tasks
  const activeTasks = tasks.filter(t => !t.done);
  const filtered = filter === 'all' ? activeTasks : activeTasks.filter(t => t.category === filter);
  const doneCount = tasks.filter(t => t.done).length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  const completeTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    if (task.periodicity === 'unica') {
      // Remove unique tasks when completed
      setTasks(prev => prev.filter(t => t.id !== id));
      toast({ title: 'Tarefa concluída e removida', description: task.title });
    } else {
      // Mark as done (will be hidden from active view)
      setTasks(prev => prev.map(t => t.id === id ? { ...t, done: true } : t));
      toast({
        title: 'Tarefa concluída',
        description: `"${task.title}" — repete ${periodicityLabels[task.periodicity].toLowerCase()}`,
      });
    }
  };

  const deleteTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks(prev => prev.filter(t => t.id !== id));
    toast({ title: 'Tarefa eliminada' });
  };

  const resetRecurring = () => {
    setTasks(prev => prev.map(t => t.periodicity !== 'unica' ? { ...t, done: false } : t));
    toast({ title: 'Tarefas recorrentes reiniciadas' });
  };

  const addTask = () => {
    if (!newTask.title.trim()) return;
    const task: Task = {
      id: `t${Date.now()}`,
      ...newTask,
      done: false,
      createdAt: new Date().toISOString(),
    };
    setTasks(prev => [task, ...prev]);
    setNewTask({ title: '', description: '', category: 'outro', assignee: staff[0], priority: 'media', critical: false, periodicity: 'unica' });
    setShowForm(false);
    toast({ title: 'Tarefa criada', description: task.title });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl text-foreground">Tarefas</h1>
          <p className="mt-1 text-muted-foreground">
            {activeTasks.length} pendente(s) · {doneCount} concluída(s) hoje
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetRecurring} className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            Reiniciar recorrentes
          </Button>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button className="gap-1.5">
                <Plus className="h-4 w-4" />
                Nova Tarefa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Tarefa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Título da tarefa..."
                  value={newTask.title}
                  onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                />
                <Textarea
                  placeholder="Descrição (opcional)..."
                  value={newTask.description}
                  onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))}
                  rows={2}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Select value={newTask.category} onValueChange={v => setNewTask(p => ({ ...p, category: v as Task['category'] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="abertura">Abertura</SelectItem>
                      <SelectItem value="fecho">Fecho</SelectItem>
                      <SelectItem value="limpeza">Limpeza</SelectItem>
                      <SelectItem value="manutencao">Manutenção</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={newTask.assignee} onValueChange={v => setNewTask(p => ({ ...p, assignee: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {staff.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={newTask.priority} onValueChange={v => setNewTask(p => ({ ...p, priority: v as Task['priority'] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={newTask.periodicity} onValueChange={v => setNewTask(p => ({ ...p, periodicity: v as TaskPeriodicity }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unica">Única</SelectItem>
                      <SelectItem value="diaria">Diária</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="trimestral">Trimestral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="critical"
                    checked={newTask.critical}
                    onChange={e => setNewTask(p => ({ ...p, critical: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="critical" className="text-sm text-foreground">Tarefa crítica</label>
                </div>
                <Button onClick={addTask} className="w-full">Criar Tarefa</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Progress */}
      <Progress value={progress} className="h-2" />

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              filter === cat.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Tasks list */}
      <div className="space-y-2">
        <AnimatePresence>
          {filtered.map((task, i) => {
            const pri = priorityConfig[task.priority];
            const PriIcon = pri.icon;
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => completeTask(task.id)}
                className={cn(
                  'flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all hover:shadow-sm',
                  task.critical
                    ? 'border-warning/30 bg-warning/5'
                    : 'border-border bg-card'
                )}
              >
                <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                  {task.description && (
                    <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">{task.assignee}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {task.critical && (
                    <span className="flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                      <AlertTriangle className="h-3 w-3" />
                    </span>
                  )}
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', periodicityColors[task.periodicity])}>
                    {periodicityLabels[task.periodicity]}
                  </span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium capitalize', 'bg-muted text-muted-foreground')}>
                    {task.category === 'manutencao' ? 'Manutenção' : task.category}
                  </span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', pri.color)}>
                    {pri.label}
                  </span>
                  <button
                    onClick={(e) => deleteTask(task.id, e)}
                    className="rounded-lg p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle2 className="mx-auto h-10 w-10 mb-2 text-success" />
            <p className="text-sm">Todas as tarefas concluídas!</p>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground text-center">Clique numa tarefa para a concluir</p>
    </div>
  );
}
