import { useState } from 'react';
import { CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import { mockChecklist, type ChecklistItem } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const categories = [
  { key: 'all', label: 'Todas' },
  { key: 'abertura', label: 'Abertura' },
  { key: 'fecho', label: 'Fecho' },
  { key: 'limpeza', label: 'Limpeza' },
] as const;

export default function Checklist() {
  const [items, setItems] = useState<ChecklistItem[]>(mockChecklist);
  const [filter, setFilter] = useState<string>('all');

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, done: !i.done } : i));
  };

  const filtered = filter === 'all' ? items : items.filter(i => i.category === filter);
  const doneCount = items.filter(i => i.done).length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl text-foreground">Checklist Diário</h1>
          <p className="mt-1 text-muted-foreground">{doneCount}/{items.length} tarefas concluídas</p>
        </div>
        <div className="h-2 w-40 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(doneCount / items.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
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

      {/* Items */}
      <div className="space-y-2">
        {filtered.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => toggleItem(item.id)}
            className={cn(
              'flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all',
              item.done
                ? 'border-success/20 bg-success/5'
                : item.critical
                  ? 'border-warning/30 bg-warning/5'
                  : 'border-border bg-card'
            )}
          >
            {item.done ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
            <div className="flex-1">
              <p className={cn(
                'text-sm font-medium',
                item.done ? 'text-muted-foreground line-through' : 'text-foreground'
              )}>
                {item.task}
              </p>
              <p className="text-xs text-muted-foreground">{item.assignee}</p>
            </div>
            <div className="flex items-center gap-2">
              {item.critical && !item.done && (
                <span className="flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                  <AlertTriangle className="h-3 w-3" />
                  Crítica
                </span>
              )}
              <span className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                'bg-muted text-muted-foreground'
              )}>
                {item.category}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
