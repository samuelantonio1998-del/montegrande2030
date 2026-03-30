import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ArrowDownCircle, ArrowUpCircle, Trash2, TrendingUp, TrendingDown, AlertTriangle, Package, Calendar, Euro, Building2, Edit3, Save } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

type Produto = {
  id: string;
  nome: string;
  categoria: string;
  unidade: string;
  stock_atual: number;
  stock_minimo: number;
  stock_maximo: number;
  custo_medio: number;
  fornecedor_id: string | null;
};

type Movimentacao = {
  id: string;
  tipo: string;
  quantidade: number;
  custo_unitario: number | null;
  motivo: string | null;
  funcionario: string | null;
  created_at: string;
  fornecedor_id: string | null;
};

type Fornecedor = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
};

type Props = {
  produto: Produto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
};

export function ProductHistoryDialog({ produto, open, onOpenChange, onUpdate }: Props) {
  const { user } = useAuth();
  const [movs, setMovs] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [fornecedor, setFornecedor] = useState<Fornecedor | null>(null);
  const [editingStock, setEditingStock] = useState(false);
  const [stockMin, setStockMin] = useState('');
  const [stockMax, setStockMax] = useState('');

  useEffect(() => {
    if (!produto || !open) return;
    setLoading(true);
    setStockMin(produto.stock_minimo.toString());
    setStockMax(produto.stock_maximo.toString());

    Promise.all([
      supabase.from('movimentacoes').select('*').eq('produto_id', produto.id).order('created_at', { ascending: true }),
      produto.fornecedor_id
        ? supabase.from('fornecedores').select('*').eq('id', produto.fornecedor_id).single()
        : Promise.resolve({ data: null }),
    ]).then(([movRes, fornRes]) => {
      setMovs((movRes.data as Movimentacao[]) || []);
      setFornecedor(fornRes.data as Fornecedor | null);
      setLoading(false);
    });
  }, [produto, open]);

  const handleSaveStock = async () => {
    if (!produto) return;
    await supabase.from('produtos').update({
      stock_minimo: parseFloat(stockMin) || 0,
      stock_maximo: parseFloat(stockMax) || 100,
    }).eq('id', produto.id);
    setEditingStock(false);
    onUpdate?.();
  };

  const analysis = useMemo(() => {
    if (!produto || movs.length === 0) return null;

    const entradas = movs.filter(m => m.tipo === 'entrada' && m.custo_unitario);
    const saidas = movs.filter(m => m.tipo !== 'entrada');

    const priceData = entradas.map(m => ({
      date: new Date(m.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }),
      preco: m.custo_unitario!,
      qty: m.quantidade,
    }));

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

    const monthlySpend: Record<string, number> = {};
    entradas.forEach(m => {
      const key = new Date(m.created_at).toLocaleDateString('pt-PT', { month: 'short', year: '2-digit' });
      monthlySpend[key] = (monthlySpend[key] || 0) + m.quantidade * m.custo_unitario!;
    });
    const spendData = Object.entries(monthlySpend).map(([month, total]) => ({ month, total: Math.round(total * 100) / 100 }));

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

    const totalSpent = entradas.reduce((s, m) => s + m.quantidade * m.custo_unitario!, 0);
    const lastPrice = entradas.length > 0 ? entradas[entradas.length - 1].custo_unitario! : 0;
    const avgPrice = entradas.length > 0 ? entradas.reduce((s, m) => s + m.custo_unitario!, 0) / entradas.length : 0;
    const minPrice = entradas.length > 0 ? Math.min(...entradas.map(m => m.custo_unitario!)) : 0;
    const maxPrice = entradas.length > 0 ? Math.max(...entradas.map(m => m.custo_unitario!)) : 0;
    const lastOrder = entradas.length > 0 ? entradas[entradas.length - 1].created_at : null;

    return {
      priceData, priceTrend, priceChangePercent,
      spendData, spendTrend, spendChangePercent,
      totalSpent, avgPrice, minPrice, maxPrice, lastPrice, lastOrder,
      totalEntries: entradas.length,
      totalExits: saidas.length,
    };
  }, [movs, produto]);

  if (!produto) return null;
  const isGerencia = user?.role === 'gerencia';

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
        ) : (
          <div className="space-y-5">
            {/* Supplier Info */}
            {fornecedor && (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                <Building2 className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{fornecedor.nome}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {fornecedor.email && <span>{fornecedor.email}</span>}
                    {fornecedor.telefone && <span>{fornecedor.telefone}</span>}
                  </div>
                </div>
              </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Stock Atual</p>
                <p className="text-lg font-bold text-foreground">{produto.stock_atual}{produto.unidade}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Último Preço</p>
                <p className="text-lg font-bold text-foreground">€{(analysis?.lastPrice || 0).toFixed(2)}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Custo Médio</p>
                <p className="text-lg font-bold text-foreground">€{produto.custo_medio.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Gasto</p>
                <p className="text-lg font-bold text-foreground">€{(analysis?.totalSpent || 0).toFixed(2)}</p>
              </div>
            </div>

            {/* Stock Min/Max Config (Gerencia only) */}
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">Níveis de Stock</h3>
                {isGerencia && !editingStock && (
                  <Button variant="ghost" size="sm" onClick={() => setEditingStock(true)}>
                    <Edit3 className="h-3.5 w-3.5 mr-1" />Editar
                  </Button>
                )}
              </div>
              {editingStock ? (
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">Mínimo ({produto.unidade})</label>
                    <Input type="number" value={stockMin} onChange={e => setStockMin(e.target.value)} className="h-8" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">Máximo ({produto.unidade})</label>
                    <Input type="number" value={stockMax} onChange={e => setStockMax(e.target.value)} className="h-8" />
                  </div>
                  <Button size="sm" onClick={handleSaveStock}><Save className="h-3.5 w-3.5 mr-1" />Guardar</Button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Mínimo</p>
                    <p className="text-sm font-bold text-destructive">{produto.stock_minimo}{produto.unidade}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Atual</p>
                    <p className={cn("text-sm font-bold", produto.stock_atual <= produto.stock_minimo ? "text-destructive" : "text-foreground")}>{produto.stock_atual}{produto.unidade}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Máximo</p>
                    <p className="text-sm font-bold text-foreground">{produto.stock_maximo}{produto.unidade}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Last order info */}
            {analysis?.lastOrder && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                Última encomenda: {new Date(analysis.lastOrder).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
            )}

            {/* Price Trend Alerts */}
            {analysis?.priceTrend === 'up' && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <TrendingUp className="h-5 w-5 text-destructive shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">Aumento de preço detetado</p>
                  <p className="text-xs text-muted-foreground">Custo subiu ~{Math.abs(analysis.priceChangePercent).toFixed(0)}% (€{analysis.minPrice.toFixed(2)} → €{analysis.maxPrice.toFixed(2)})</p>
                </div>
              </motion.div>
            )}
            {analysis?.priceTrend === 'down' && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/5 p-3">
                <TrendingDown className="h-5 w-5 text-success shrink-0" />
                <div>
                  <p className="text-sm font-medium text-success">Preço em queda</p>
                  <p className="text-xs text-muted-foreground">Desceu ~{Math.abs(analysis.priceChangePercent).toFixed(0)}%</p>
                </div>
              </motion.div>
            )}
            {analysis?.spendTrend === 'up' && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                <div>
                  <p className="text-sm font-medium text-warning">Gasto mensal a subir</p>
                  <p className="text-xs text-muted-foreground">+{Math.abs(analysis.spendChangePercent).toFixed(0)}% vs mês anterior</p>
                </div>
              </motion.div>
            )}

            {/* Price Chart */}
            {analysis && analysis.priceData.length >= 2 && (
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Euro className="h-4 w-4 text-primary" />
                  Evolução do Preço Unitário
                </h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={analysis.priceData}>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `€${v}`} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`€${v.toFixed(2)}`, 'Preço/Un']} />
                    <ReferenceLine y={analysis.avgPrice} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="preco" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--primary))' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Spend Chart */}
            {analysis && analysis.spendData.length >= 2 && (
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Gasto Mensal
                </h3>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={analysis.spendData}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `€${v}`} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`€${v.toFixed(2)}`, 'Total']} />
                    <Line type="monotone" dataKey="total" stroke="hsl(var(--accent-foreground))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Price Range */}
            {analysis && (
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
            )}

            {/* Full History */}
            {movs.length > 0 && (
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/30">
                  <h3 className="text-sm font-semibold text-foreground">Histórico Completo ({movs.length})</h3>
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
            )}

            {movs.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Sem histórico de movimentações para este produto.</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
