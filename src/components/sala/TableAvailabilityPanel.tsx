import { useState } from 'react';
import { Users, Clock, ArrowRight, Coffee } from 'lucide-react';
import { type Mesa } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type Props = {
  mesas: Mesa[];
};

type TablePrediction = {
  mesa: Mesa;
  estimatedMinutes: number;
  reason: string;
  confidence: 'alta' | 'media';
};

export default function TableAvailabilityPanel({ mesas }: Props) {
  const occupiedMesas = mesas.filter(m => m.status === 'ocupada' || m.status === 'conta');

  const predictions: TablePrediction[] = occupiedMesas
    .map(mesa => {
      const totalPax = mesa.adults + mesa.children2to6 + mesa.children7to12;
      const openedAt = mesa.openedAt ? new Date(mesa.openedAt) : null;
      const elapsedMin = openedAt ? Math.floor((Date.now() - openedAt.getTime()) / 60000) : 0;

      // Detect if in dessert/coffee phase by checking beverages
      const hasDessert = mesa.beverages.some(b =>
        /sobremesa|doce|gelado|mousse|pudim|bolo|tarte|fruta/i.test(b.name)
      );
      const hasCoffee = mesa.beverages.some(b =>
        /café|cafè|expresso|descafeinado|carioca|abatanado/i.test(b.name)
      );

      let estimatedMinutes: number;
      let reason: string;
      let confidence: 'alta' | 'media' = 'media';

      if (mesa.status === 'conta') {
        estimatedMinutes = 5;
        reason = 'Conta pedida';
        confidence = 'alta';
      } else if (hasCoffee) {
        estimatedMinutes = totalPax <= 4 ? 10 : 20;
        reason = 'Fase do café';
        confidence = 'alta';
      } else if (hasDessert) {
        estimatedMinutes = totalPax <= 4 ? 15 : 25;
        reason = 'Sobremesa servida';
      } else if (elapsedMin > 60) {
        estimatedMinutes = totalPax <= 4 ? 20 : 30;
        reason = `Há ${elapsedMin} min`;
      } else {
        estimatedMinutes = totalPax <= 4 ? 45 : 60;
        reason = `${elapsedMin} min decorridos`;
      }

      return { mesa, estimatedMinutes, reason, confidence };
    })
    .sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);

  const freeMesas = mesas.filter(m => m.status === 'livre');
  const soonAvailable = predictions.filter(p => p.estimatedMinutes <= 20);

  if (occupiedMesas.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="font-display text-base text-card-foreground flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" /> Previsão de Mesas
      </h3>

      {freeMesas.length > 0 && (
        <div className="text-xs text-success font-medium">
          {freeMesas.length} mesa(s) livre(s): {freeMesas.map(m => `Mesa ${m.number}`).join(', ')}
        </div>
      )}

      {soonAvailable.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Libertam em breve:</p>
          {soonAvailable.map(p => {
            const totalPax = p.mesa.adults + p.mesa.children2to6 + p.mesa.children7to12;
            return (
              <div key={p.mesa.id} className={cn(
                'flex items-center justify-between rounded-lg px-3 py-2.5 border',
                p.estimatedMinutes <= 10 ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/20'
              )}>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{p.mesa.number}</p>
                    <p className="text-[10px] text-muted-foreground">mesa</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-foreground">{totalPax} pax</span>
                      {p.reason.includes('café') && <Coffee className="h-3 w-3 text-primary" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{p.reason}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className={cn('text-xs', p.confidence === 'alta' ? 'text-success border-success/30' : 'text-warning border-warning/30')}>
                    ~{p.estimatedMinutes} min
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {predictions.filter(p => p.estimatedMinutes > 20).length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Ocupadas ({predictions.filter(p => p.estimatedMinutes > 20).length}):</p>
          <div className="flex flex-wrap gap-1.5">
            {predictions.filter(p => p.estimatedMinutes > 20).map(p => (
              <span key={p.mesa.id} className="rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">
                Mesa {p.mesa.number} · ~{p.estimatedMinutes} min
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
