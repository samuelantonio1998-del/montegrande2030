import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ArrowDownCircle, ArrowUpCircle, Trash2, TrendingUp, TrendingDown, AlertTriangle, Package, Calendar, Euro } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Badge } from '@/components/ui/badge';

type Produto = {
  id: string;
  nome: string;
  categoria: string;
  unidade: string;
  stock_atual: number;
  stock_minimo: number;
  stock_maximo: number;
  custo_medio: number;
};

type Movimentacao = {
  id: string;
  tipo: string;
  quantidade: number;
  custo_unitario: number | null;
  motivo: string | null;
  funcionario: string | null;
  created_at: string;
};

type Props = {
  produto: Produto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProductHistoryDialog({ produto, open, onOpenChange }: Props) {
  const [movs, setMovs] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!produto || !open) return;
    setLoading(true);
    supabase
      .from('movimentacoes')
      .select('*')
      .eq('produto_id', produto.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMovs((data as Movimentacao[]) || []);
        setLoading(false);
      });
  }, [produto, open]);

  const analysis = useMemo(() => {
    if (!produto || movs.length === 0) return null;

    const entradas = movs.filter(m => m.tipo === 'entrada' && m.custo_unitario);
    const saidas = movs.filter(m => m.tipo !== 'entrada');

    // Price chart data (entries only)
    const priceData = entradas.map(m => ({
      date: new Date(m.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }),
      preco: m.custo_unitario!,
      qty: m.quantidade,
    }));

    // Price trend: compare last 3 vs previous 3
    let priceTrend: 'up' | 'down' | 'stable' = 'stable';
    let priceChangePercent = 0;
    if (entradas.length >= 2) {
      const recent = entradas.slice(-3);
      const older = entradas.slice(0, Math.max(entradas.length - 3, 1));
      const avgRecent = recent.reduce((s, m) => s + m.custo_unitario!, 0) / recent.length;
      const avgOlder = older.reduce((s, m) => s + m.custo_unitario!, 0) / older.length;
      priceChangePercent = avgOlder > 0 ? ((avgRecent - avgOlder) / avgOlder) * 100 : 0;
      if (priceChangePercent > 5) priceTrend = 'up';
      else if (priceChangePercent < -5) priceTrend = 'down';
    }

    // Spending by month
    const monthlySpend: Record<string, number> = {};
    entradas.forEach(m => {
      const key = new Date(m.created_at).toLocaleDateString('pt-PT', { month: 'short', year: '2-digit' });
      monthlySpend[key] = (monthlySpend[key] || 0) + m.quantidade * m.custo_unitario!;
    });
    const spendData = Object.entries(monthlySpend).map(([month, total]) => ({ month, total: Math.round(total * 100) / 100 }));

    // Spending trend
    const spendValues = Object.values(monthlySpend);
    let spendTrend: 'up' | 'down' | 'stable' = 'stable';
    let spendChangePercent = 0;
    if (spendValues.length >= 2) {
      const last = spendValues[spendValues.length - 1];
      const prev = spendValues[spendValues.length - 2];
      spendChangePercent = prev > 0 ? ((last - prev) / prev) * 100 : 0;
      if (spendChangePercent > 15) spendTrend = 'up';
      else if (spendChangePercent < -15) spendTrend = 'down';
    }

    // Total spent
    const totalSpent = entradas.reduce((s, m) => s + m.quantidade * m.custo_unitario!, 0);
    const totalQtyIn = entradas.reduce((s, m) => s + m.quantidade, 0);
    const totalQtyOut = saidas.reduce((s, m) => s + m.quantidade, 0);
    const avgPrice = entradas.length > 0 ? entradas.reduce((s, m) => s + m.custo_unitario!, 0) / entradas.length : 0;
    const minPrice = entradas.length > 0 ? Math.min(...entradas.map(m => m.custo_unitario!)) : 0;
    const maxPrice = entradas.length > 0 ? Math.max(...entradas.map(m => m.custo_unitario!)) : 0;

    return {
      priceData, priceTrend, priceChangePercent,
      spendData, spendTrend, spendChangePercent,
      totalSpent, totalQtyIn, totalQtyOut, avgPrice, minPrice, maxPrice,
      totalEntries: entradas.length,
      totalExits: saidas.length,
    };
  }, [movs, produto]);

  if (!produto) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Package className="h-5 w-5 text-primary" />
            {produto.nome}
            <Badge variant="outline" className="text-xs font-normal">{produto.categoria}</Badge>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : movs.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Sem histórico de movimentações para este produto.</p>
          </div>
        ) : analysis && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Stock Atual</p>
                <p className="text-lg font-bold text-foreground">{produto.stock_atual}{produto.unidade}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Gasto</p>
                <p className="text-lg font-bold text-foreground">€{analysis.totalSpent.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Preço Médio</p>
                <p className="text-lg font-bold text-foreground">€{analysis.avgPrice.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Entradas</p>
                <p className="text-lg font-bold text-foreground">{analysis.totalEntries}</p>
              </div>
            </div>

            {/* Price Trend Alert */}
            {analysis.priceTrend === 'up' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3"
              >
                <TrendingUp className="h-5 w-5 text-destructive shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">Aumento de preço detetado</p>
                  <p className="text-xs text-muted-foreground">
                    O custo unitário subiu ~{Math.abs(analysis.priceChangePercent).toFixed(0)}% nas últimas compras
                    (de €{analysis.minPrice.toFixed(2)} a €{analysis.maxPrice.toFixed(2)})
                  </p>
                </div>
              </motion.div>
            )}
            {analysis.priceTrend === 'down' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/5 p-3"
              >
                <TrendingDown className="h-5 w-5 text-success shrink-0" />
                <div>
                  <p className="text-sm font-medium text-success">Preço em queda</p>
                  <p className="text-xs text-muted-foreground">
                    O custo unitário desceu ~{Math.abs(analysis.priceChangePercent).toFixed(0)}% nas últimas compras
                  </p>
                </div>
              </motion.div>
            )}

            {/* Spending Trend Alert */}
            {analysis.spendTrend === 'up' && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3"
              >
                <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                <div>
                  <p className="text-sm font-medium text-warning">Gasto mensal a subir</p>
                  <p className="text-xs text-muted-foreground">
                    Aumento de ~{Math.abs(analysis.spendChangePercent).toFixed(0)}% em relação ao mês anterior
                  </p>
                </div>
              </motion.div>
            )}

            {/* Price Evolution Chart */}
            {analysis.priceData.length >= 2 && (
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Euro className="h-4 w-4 text-primary" />
                  Evolução do Preço Unitário
                </h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={analysis.priceData}>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `€${v}`} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => [`€${v.toFixed(2)}`, 'Preço/Un']}
                    />
                    <ReferenceLine y={analysis.avgPrice} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" label={{ value: 'Média', position: 'right', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <Line type="monotone" dataKey="preco" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--primary))' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Monthly Spend Chart */}
            {analysis.spendData.length >= 2 && (
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Gasto Mensal
                </h3>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={analysis.spendData}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `€${v}`} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => [`€${v.toFixed(2)}`, 'Total']}
                    />
                    <Line type="monotone" dataKey="total" stroke="hsl(var(--accent-foreground))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Price Range Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-success/5 p-3 text-center">
                <p className="text-xs text-muted-foreground">Preço Mín.</p>
                <p className="text-sm font-bold text-success">€{analysis.minPrice.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Preço Médio</p>
                <p className="text-sm font-bold text-foreground">€{analysis.avgPrice.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border border-border bg-destructive/5 p-3 text-center">
                <p className="text-xs text-muted-foreground">Preço Máx.</p>
                <p className="text-sm font-bold text-destructive">€{analysis.maxPrice.toFixed(2)}</p>
              </div>
            </div>

            {/* Full Movement History */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <h3 className="text-sm font-semibold text-foreground">Histórico Completo</h3>
              </div>
              <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
                {[...movs].reverse().map(m => (
                  <div key={m.id} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full shrink-0',
                        m.tipo === 'entrada' ? 'bg-success/10 text-success' :
                        m.tipo === 'quebra' ? 'bg-destructive/10 text-destructive' :
                        'bg-warning/10 text-warning'
                      )}>
                        {m.tipo === 'entrada' ? <ArrowDownCircle className="h-3.5 w-3.5" /> :
                         m.tipo === 'quebra' ? <Trash2 className="h-3.5 w-3.5" /> :
                         <ArrowUpCircle className="h-3.5 w-3.5" />}
                      </div>
                      <div>
                        <p className="text-sm text-foreground">
                          {m.tipo === 'entrada' ? '+' : '-'}{m.quantidade}{produto.unidade}
                          {m.custo_unitario ? ` · €${m.custo_unitario.toFixed(2)}/${produto.unidade}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(m.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {m.motivo ? ` · ${m.motivo}` : ''}
                        </p>
                      </div>
                    </div>
                    {m.custo_unitario && m.tipo === 'entrada' && (
                      <span className="text-xs font-medium text-muted-foreground">
                        €{(m.quantidade * m.custo_unitario).toFixed(2)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
