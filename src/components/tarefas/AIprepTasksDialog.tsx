import { useState } from 'react';
import { Sparkles, Loader2, AlertTriangle, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, addDays } from 'date-fns';
import { pt } from 'date-fns/locale';

type AISuggestedTask = {
  titulo: string;
  descricao: string;
  prioridade: 'alta' | 'media' | 'baixa';
  selected: boolean;
};

type StockAlert = {
  produto: string;
  motivo: string;
};

const prioColors = {
  alta: 'bg-destructive/10 text-destructive border-destructive/20',
  media: 'bg-warning/10 text-warning border-warning/20',
  baixa: 'bg-muted text-muted-foreground border-border',
};

const prioLabels = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };

type Props = {
  onTasksAdded: () => void;
};

export default function AIprepTasksDialog({ onTasksAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [tasks, setTasks] = useState<AISuggestedTask[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const tomorrow = addDays(new Date(), 1);
  const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
  const tomorrowLabel = format(tomorrow, "EEEE, d 'de' MMMM", { locale: pt });

  const generate = async () => {
    setLoading(true);
    setError(null);
    setTasks([]);
    setStockAlerts([]);

    try {
      const { data, error: fnErr } = await supabase.functions.invoke('generate-prep-tasks', {
        body: { targetDate: tomorrowStr },
      });

      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);

      if (data?.message && (!data.tasks || data.tasks.length === 0)) {
        setError(data.message);
        return;
      }

      setTasks((data.tasks || []).map((t: any) => ({ ...t, selected: true })));
      setStockAlerts(data.stock_alerts || []);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Erro ao gerar tarefas');
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = (index: number) => {
    setTasks(prev => prev.map((t, i) => i === index ? { ...t, selected: !t.selected } : t));
  };

  const toggleAll = () => {
    const allSelected = tasks.every(t => t.selected);
    setTasks(prev => prev.map(t => ({ ...t, selected: !allSelected })));
  };

  const addSelected = async () => {
    const selected = tasks.filter(t => t.selected);
    if (selected.length === 0) return;

    setAdding(true);
    try {
      const rows = selected.map(t => ({
        titulo: t.titulo,
        descricao: t.descricao,
        categoria: 'abertura' as const,
        responsavel: '',
        prioridade: t.prioridade,
        critica: t.prioridade === 'alta',
        periodicidade: 'unica' as const,
        concluida: false,
      }));

      const { error } = await supabase.from('tarefas').insert(rows);
      if (error) throw error;

      toast({ title: `${selected.length} tarefa(s) adicionada(s)` });
      onTasksAdded();
      setOpen(false);
      setTasks([]);
    } catch (e: any) {
      toast({ title: 'Erro ao adicionar tarefas', description: e.message, variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const selectedCount = tasks.filter(t => t.selected).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v && tasks.length === 0 && !loading) generate(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Sparkles className="h-4 w-4" /> Prep IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Preparação para amanhã
          </DialogTitle>
          <p className="text-sm text-muted-foreground capitalize">{tomorrowLabel}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">A analisar ementa e stocks...</p>
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={generate}>Tentar novamente</Button>
            </div>
          )}

          {stockAlerts.length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-1">
              <p className="text-xs font-medium text-warning flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Alertas de stock
              </p>
              {stockAlerts.map((a, i) => (
                <p key={i} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{a.produto}</span> — {a.motivo}
                </p>
              ))}
            </div>
          )}

          {tasks.length > 0 && !loading && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{tasks.length} tarefa(s) sugerida(s)</p>
                <button onClick={toggleAll} className="text-xs text-primary hover:underline">
                  {tasks.every(t => t.selected) ? 'Desselecionar todas' : 'Selecionar todas'}
                </button>
              </div>
              {tasks.map((task, i) => (
                <div
                  key={i}
                  onClick={() => toggleTask(i)}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all',
                    task.selected ? 'border-primary/30 bg-primary/5' : 'border-border bg-card opacity-60'
                  )}
                >
                  <div className={cn(
                    'mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors',
                    task.selected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'
                  )}>
                    {task.selected && <Check className="h-3 w-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{task.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{task.descricao}</p>
                  </div>
                  <Badge variant="outline" className={cn('text-[10px] shrink-0', prioColors[task.prioridade])}>
                    {prioLabels[task.prioridade]}
                  </Badge>
                </div>
              ))}
            </>
          )}
        </div>

        {tasks.length > 0 && !loading && (
          <div className="flex items-center gap-2 pt-3 border-t">
            <Button variant="outline" size="sm" onClick={generate} className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Regenerar
            </Button>
            <div className="flex-1" />
            <Button onClick={addSelected} disabled={selectedCount === 0 || adding} className="gap-1.5">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar {selectedCount} tarefa(s)
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
