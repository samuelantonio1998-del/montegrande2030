import { useState } from 'react';
import { TrendingUp, Users, ChefHat, BarChart3, Calendar } from 'lucide-react';
import { mockHistorical, mockFichasTecnicas } from '@/lib/mock-data';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function Previsao() {
  const { user } = useAuth();
  const isGerencia = user?.role === 'gerencia';
  const isCozinha = user?.role === 'cozinha';
  const showOrdem = isCozinha || isGerencia;
  // Simple prediction: average of same day-of-week from history
  const tomorrow = 'Quarta';
  const sameDayData = mockHistorical.filter(d => d.dayOfWeek === tomorrow);
  const avgClients = sameDayData.length > 0
    ? Math.round(sameDayData.reduce((s, d) => s + d.totalClients, 0) / sameDayData.length)
    : 75;
  const avgAdults = sameDayData.length > 0
    ? Math.round(sameDayData.reduce((s, d) => s + d.adults, 0) / sameDayData.length)
    : 62;
  const avgChildren = avgClients - avgAdults;

  // Predicted dish portions based on historical ratios
  const allDishes = new Map<string, number[]>();
  mockHistorical.forEach(day => {
    day.dishes.forEach(d => {
      if (!allDishes.has(d.name)) allDishes.set(d.name, []);
      allDishes.get(d.name)!.push(d.portions);
    });
  });

  const predictedDishes = Array.from(allDishes.entries()).map(([name, portions]) => ({
    name,
    predicted: Math.round(portions.reduce((a, b) => a + b, 0) / portions.length),
    percentage: Math.round((portions.reduce((a, b) => a + b, 0) / portions.length / avgClients) * 100),
  })).sort((a, b) => b.predicted - a.predicted);

  // Chart data for the week
  const weekChartData = mockHistorical.map(d => ({
    day: d.dayOfWeek.slice(0, 3),
    clientes: d.totalClients,
    receita: d.revenue,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-foreground">Previsão de Produção</h1>
        <p className="mt-1 text-muted-foreground">Inteligência baseada no histórico para a cozinha</p>
      </div>

      {/* Prediction card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border-2 border-primary/20 bg-primary/5 p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl text-foreground">Previsão para Amanhã — {tomorrow}</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-card border border-border p-4 text-center">
            <Users className="mx-auto h-6 w-6 text-primary mb-1" />
            <p className="text-xs text-muted-foreground">Total Previsto</p>
            <p className="text-3xl font-bold text-foreground">{avgClients}</p>
            <p className="text-xs text-muted-foreground">±5%</p>
          </div>
          <div className="rounded-lg bg-card border border-border p-4 text-center">
            <Users className="mx-auto h-6 w-6 text-foreground mb-1" />
            <p className="text-xs text-muted-foreground">Adultos</p>
            <p className="text-3xl font-bold text-foreground">{avgAdults}</p>
          </div>
          <div className="rounded-lg bg-card border border-border p-4 text-center">
            <Users className="mx-auto h-6 w-6 text-warning mb-1" />
            <p className="text-xs text-muted-foreground">Crianças</p>
            <p className="text-3xl font-bold text-foreground">{avgChildren}</p>
          </div>
        </div>
      </motion.div>

      <div className={cn("grid grid-cols-1 gap-6", isGerencia ? "lg:grid-cols-2" : "")}>
        {/* Dish predictions - only for gerencia */}
        {isGerencia && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <h2 className="font-display text-xl text-card-foreground flex items-center gap-2 mb-4">
              <ChefHat className="h-5 w-5 text-primary" />
              Ordem de Preparação Sugerida
            </h2>
            <div className="space-y-3">
              {predictedDishes.map((dish, i) => (
                <div key={dish.name} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{dish.name}</span>
                      <span className="text-sm font-bold text-foreground">{dish.predicted} doses</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(dish.percentage * 2, 100)}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{dish.percentage}% dos clientes</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Client trend chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <h2 className="font-display text-xl text-card-foreground flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-primary" />
            Tendência Semanal — Clientes
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weekChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="clientes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}
