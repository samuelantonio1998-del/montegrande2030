import { useState } from 'react';
import { Plus, CheckCircle2, Circle, AlertTriangle, Clock, AlertCircle, Trash2, RefreshCw } from 'lucide-react';
import { useTarefas, type Tarefa, type TaskPeriodicity } from '@/hooks/useTarefas';
import { useEmployees } from '@/hooks/useEmployees';
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
  unica: 'Única', diaria: 'Diária', semanal: 'Semanal', mensal: 'Mensal', trimestral: 'Trimestral',
};

const periodicityColors: Record<TaskPeriodicity, string> = {
  unica: 'bg-muted text-muted-foreground',
  diaria: 'bg-primary/10 text-primary',
  semanal: 'bg-accent text-accent-foreground',
  mensal: 'bg-warning/10 text-warning',
  trimestral: 'bg-destructive/10 text-destructive',
};

export default function Tarefas() {
  const { tarefas, loading, addTarefa, completeTarefa, deleteTarefa, resetRecorrentes } = useTarefas();
  const { employees } = useEmployees();
  const staffNames = employees.map(e => e.name);
  const [filter, setFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const [newTask, setNewTask] = useState({
    titulo: '',
    descricao: '',
    categoria: 'outro' as Tarefa['categoria'],
    responsavel: staffNames[0] || '',
    prioridade: 'media' as Tarefa['prioridade'],
    critica: false,
    periodicidade: 'unica' as TaskPeriodicity,
  });

  const activeTasks = tarefas.filter(t => !t.concluida);
  const filtered = filter === 'all' ? activeTasks : activeTasks.filter(t => t.categoria === filter);
  const doneCount = tarefas.filter(t => t.concluida).length;
  const progress = tarefas.length > 0 ? (doneCount / tarefas.length) * 100 : 0;

  const handleComplete = async (task: Tarefa) => {
    await completeTarefa(task.id, task.periodicidade);
    toast({
      title: task.periodicidade === 'unica' ? 'Tarefa concluída e removida' : 'Tarefa concluída',
      description: task.titulo,
    });
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteTarefa(id);
    toast({ title: 'Tarefa eliminada' });
  };

  const handleReset = async () => {
    await resetRecorrentes();
    toast({ title: 'Tarefas recorrentes reiniciadas' });
  };

  const handleAdd = async () => {
    if (!newTask.titulo.trim()) return;
    await addTarefa({ ...newTask, descricao: newTask.descricao || null });
    setNewTask({ titulo: '', descricao: '', categoria: 'outro', responsavel: staffNames[0] || '', prioridade: 'media', critica: false, periodicidade: 'unica' });
    setShowForm(false);
    toast({ title: 'Tarefa criada' });
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">A carregar...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl text-foreground">Tarefas</h1>
          <p className="mt-1 text-muted-foreground">{activeTasks.length} pendente(s) · {doneCount} concluída(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Reiniciar recorrentes
          </Button>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button className="gap-1.5"><Plus className="h-4 w-4" /> Nova Tarefa</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Título da tarefa..." value={newTask.titulo} onChange={e => setNewTask(p => ({ ...p, titulo: e.target.value }))} />
                <Textarea placeholder="Descrição (opcional)..." value={newTask.descricao} onChange={e => setNewTask(p => ({ ...p, descricao: e.target.value }))} rows={2} />
                <div className="grid grid-cols-2 gap-3">
                  <Select value={newTask.categoria} onValueChange={v => setNewTask(p => ({ ...p, categoria: v as Tarefa['categoria'] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="abertura">Abertura</SelectItem>
                      <SelectItem value="fecho">Fecho</SelectItem>
                      <SelectItem value="limpeza">Limpeza</SelectItem>
                      <SelectItem value="manutencao">Manutenção</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={newTask.responsavel} onValueChange={v => setNewTask(p => ({ ...p, responsavel: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {staffNames.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={newTask.prioridade} onValueChange={v => setNewTask(p => ({ ...p, prioridade: v as Tarefa['prioridade'] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={newTask.periodicidade} onValueChange={v => setNewTask(p => ({ ...p, periodicidade: v as TaskPeriodicity }))}>
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
                  <input type="checkbox" id="critical" checked={newTask.critica} onChange={e => setNewTask(p => ({ ...p, critica: e.target.checked }))} className="rounded" />
                  <label htmlFor="critical" className="text-sm text-foreground">Tarefa crítica</label>
                </div>
                <Button onClick={handleAdd} className="w-full">Criar Tarefa</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Progress value={progress} className="h-2" />

      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button key={cat.key} onClick={() => setFilter(cat.key)} className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-colors', filter === cat.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
            {cat.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {filtered.map((task, i) => {
            const pri = priorityConfig[task.prioridade];
            return (
              <motion.div key={task.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12, height: 0 }} transition={{ delay: i * 0.03 }}
                onClick={() => handleComplete(task)}
                className={cn('flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all hover:shadow-sm', task.critica ? 'border-warning/30 bg-warning/5' : 'border-border bg-card')}>
                <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{task.titulo}</p>
                  {task.descricao && <p className="text-xs text-muted-foreground truncate">{task.descricao}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">{task.responsavel}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {task.critica && <span className="flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning"><AlertTriangle className="h-3 w-3" /></span>}
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', periodicityColors[task.periodicidade])}>{periodicityLabels[task.periodicidade]}</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium capitalize bg-muted text-muted-foreground')}>{task.categoria === 'manutencao' ? 'Manutenção' : task.categoria}</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', pri.color)}>{pri.label}</span>
                  <button onClick={(e) => handleDelete(task.id, e)} className="rounded-lg p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
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
