import { TrendingUp, TrendingDown } from 'lucide-react';
import type { KPI } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function KPICard({ kpi, index }: { kpi: KPI; index: number }) {
  const isPositive = kpi.trend === 'up' && kpi.label !== 'Alertas Ativos';
  const isNegative = kpi.trend === 'up' && kpi.label === 'Alertas Ativos';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
      <p className="mt-2 font-display text-3xl font-normal text-card-foreground">{kpi.value}</p>
      <div className="mt-2 flex items-center gap-1">
        {kpi.trend === 'up' ? (
          <TrendingUp className={cn('h-4 w-4', isNegative ? 'text-destructive' : 'text-success')} />
        ) : (
          <TrendingDown className="h-4 w-4 text-success" />
        )}
        <span className={cn(
          'text-xs font-medium',
          isNegative ? 'text-destructive' : 'text-success'
        )}>
          {kpi.change > 0 ? '+' : ''}{kpi.change}%
        </span>
        <span className="text-xs text-muted-foreground">vs ontem</span>
      </div>
    </motion.div>
  );
}
