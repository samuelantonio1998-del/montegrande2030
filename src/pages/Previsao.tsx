import { useState, useMemo } from 'react';
import { TrendingUp, Users, Calendar, BarChart3, Sun, Moon, AlertTriangle, ChefHat } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useVendasHistorico, calcularPrevisao, calcularTendenciaSemanal } from '@/hooks/useVendasHistorico';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function Previsao() {
  const { user } = useAuth();
  const isGerencia = user?.role === 'gerencia';
  const isCozinha = user?.role === 'cozinha';
  const showOrdem = isCozinha || isGerencia;

  const { data: vendas = [], isLoading } = useVendasHistorico();

  const [semanaOffset, setSemanaOffset] = useState(0);

  const hoje = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + semanaOffset * 7);
    return d;
  }, [semanaOffset]);

  const previsoes = useMemo(() => calcularPrevisao(vendas, hoje, 7), [vendas, hoje]);
  const tendencia = useMemo(() => calcularTendenciaSemanal(vendas), [vendas]);

  const amanha = previsoes[1]; // tomorrow's prediction

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-foreground">Previsão de Produção</h1>
        <p className="mt-1 text-muted-foreground">
          Baseada em {vendas.length.toLocaleString()} registos históricos (2015–2026)
        </p>
      </div>

      {/* Navigation between weeks */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSemanaOffset(s => s - 1)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-accent"
        >
          ← Semana anterior
        </button>
        <button
          onClick={() => setSemanaOffset(0)}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-sm",
            semanaOffset === 0
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:bg-accent"
          )}
        >
          Esta semana
        </button>
        <button
          onClick={() => setSemanaOffset(s => s + 1)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-accent"
        >
          Semana seguinte →
        </button>
      </div>

      {/* Tomorrow highlight */}
      {amanha && semanaOffset === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-xl border-2 p-6",
            amanha.isFestivo
              ? "border-warning/40 bg-warning/5"
              : "border-primary/20 bg-primary/5"
          )}
        >
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl text-foreground">
              Previsão para Amanhã — {amanha.diaSemana}
            </h2>
            {amanha.isFestivo && (
              <span className="ml-2 flex items-center gap-1 rounded-full bg-warning/20 px-2.5 py-0.5 text-xs font-medium text-warning">
                <AlertTriangle className="h-3 w-3" />
                {amanha.nomeFestivo}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-lg bg-card border border-border p-4 text-center">
              <Users className="mx-auto h-6 w-6 text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Total Previsto</p>
              <p className="text-3xl font-bold text-foreground">{amanha.previsaoTotal}</p>
              <p className="text-xs text-muted-foreground">
                min {amanha.minHistorico} · max {amanha.maxHistorico}
              </p>
            </div>
            <div className="rounded-lg bg-card border border-border p-4 text-center">
              <Sun className="mx-auto h-6 w-6 text-warning mb-1" />
              <p className="text-xs text-muted-foreground">Almoço</p>
              <p className="text-3xl font-bold text-foreground">{amanha.previsaoAlmoco}</p>
            </div>
            <div className="rounded-lg bg-card border border-border p-4 text-center">
              <Moon className="mx-auto h-6 w-6 text-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Jantar</p>
              <p className="text-3xl font-bold text-foreground">{amanha.previsaoJantar}</p>
            </div>
            <div className="rounded-lg bg-card border border-border p-4 text-center">
              <BarChart3 className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Confiança</p>
              <p className="text-3xl font-bold text-foreground">{amanha.confianca}%</p>
              <p className="text-xs text-muted-foreground">{amanha.anosComDados} anos de dados</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Weekly forecast table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <h2 className="font-display text-xl text-card-foreground flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-primary" />
          Previsão Semanal (Semana {previsoes[0]?.semanaAno})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Dia</th>
                <th className="text-center py-2 px-3 text-muted-foreground font-medium">Data</th>
                <th className="text-center py-2 px-3 text-muted-foreground font-medium">
                  <Sun className="inline h-3.5 w-3.5 mr-1" />Almoço
                </th>
                <th className="text-center py-2 px-3 text-muted-foreground font-medium">
                  <Moon className="inline h-3.5 w-3.5 mr-1" />Jantar
                </th>
                <th className="text-center py-2 px-3 text-muted-foreground font-medium">Total</th>
                <th className="text-center py-2 px-3 text-muted-foreground font-medium">Min–Max</th>
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Notas</th>
              </tr>
            </thead>
            <tbody>
              {previsoes.map((p, i) => (
                <tr
                  key={p.data}
                  className={cn(
                    "border-b border-border/50 transition-colors",
                    p.isWeekend && "bg-accent/30",
                    p.isFestivo && "bg-warning/5",
                    i === 0 && semanaOffset === 0 && "font-medium"
                  )}
                >
                  <td className="py-2.5 px-3 font-medium text-foreground">{p.diaSemana}</td>
                  <td className="py-2.5 px-3 text-center text-muted-foreground text-xs">
                    {new Date(p.data).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
                  </td>
                  <td className="py-2.5 px-3 text-center text-foreground font-semibold">{p.previsaoAlmoco}</td>
                  <td className="py-2.5 px-3 text-center text-foreground font-semibold">{p.previsaoJantar}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-bold text-primary">
                      {p.previsaoTotal}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-xs text-muted-foreground">
                    {p.minHistorico}–{p.maxHistorico}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1">
                      {p.isFestivo && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-medium text-warning">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          {p.nomeFestivo}
                        </span>
                      )}
                      {p.isWeekend && !p.isFestivo && (
                        <span className="text-[10px] text-muted-foreground">Fim-de-semana</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold">
                <td className="py-2.5 px-3 text-foreground" colSpan={2}>Total Semana</td>
                <td className="py-2.5 px-3 text-center text-foreground">
                  {previsoes.reduce((s, p) => s + p.previsaoAlmoco, 0)}
                </td>
                <td className="py-2.5 px-3 text-center text-foreground">
                  {previsoes.reduce((s, p) => s + p.previsaoJantar, 0)}
                </td>
                <td className="py-2.5 px-3 text-center text-primary font-bold">
                  {previsoes.reduce((s, p) => s + p.previsaoTotal, 0)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </motion.div>

      <div className={cn("grid grid-cols-1 gap-6", "lg:grid-cols-2")}>
        {/* Weekly chart - forecast */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <h2 className="font-display text-xl text-card-foreground flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-primary" />
            Previsão da Semana
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={previsoes.map(p => ({
              dia: p.diaSemana.slice(0, 3),
              almoco: p.previsaoAlmoco,
              jantar: p.previsaoJantar,
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="dia" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="almoco" name="Almoço" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="jantar" name="Jantar" fill="hsl(var(--primary) / 0.5)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Historical trend by day of week */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <h2 className="font-display text-xl text-card-foreground flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            Média Histórica por Dia da Semana
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={tendencia}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="diaSemana" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="mediaAlmoco" name="Almoço" fill="hsl(var(--primary))" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="mediaJantar" name="Jantar" fill="hsl(var(--primary) / 0.5)" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Yearly comparison - gerencia only */}
      {isGerencia && vendas.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <h2 className="font-display text-xl text-card-foreground flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-success" />
            Comparação Anual — Semana {previsoes[0]?.semanaAno}
          </h2>
          <YearlyComparisonChart vendas={vendas} targetWeek={previsoes[0]?.semanaAno || 1} />
        </motion.div>
      )}
    </div>
  );
}

function YearlyComparisonChart({ vendas, targetWeek }: { vendas: { data: string; total: number }[]; targetWeek: number }) {
  const getISOWeek = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const byYear: Record<number, number> = {};
  vendas.forEach(v => {
    const d = new Date(v.data);
    const w = getISOWeek(d);
    if (Math.abs(w - targetWeek) <= 1 && v.total > 5) {
      const y = d.getFullYear();
      if (!byYear[y]) byYear[y] = 0;
      byYear[y] += v.total;
    }
  });

  const chartData = Object.entries(byYear)
    .map(([year, total]) => ({ ano: year, total: Math.round(total / 7) }))
    .sort((a, b) => a.ano.localeCompare(b.ano));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="ano" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value: number) => [`${value} refeições/dia`, 'Média diária']}
        />
        <Line type="monotone" dataKey="total" stroke="hsl(var(--success))" strokeWidth={2} dot={{ fill: 'hsl(var(--success))' }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
