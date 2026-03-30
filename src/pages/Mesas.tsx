import { useState } from 'react';
import { Users, Baby, Wine, QrCode, Clock, CreditCard } from 'lucide-react';
import { mockMesas, beverageMenu, type Mesa, PRICING, getAdultPrice, calcMesaTotal } from '@/lib/mock-data';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  livre: { label: 'Livre', color: 'text-success', bg: 'bg-success/10 border-success/30' },
  ocupada: { label: 'Ocupada', color: 'text-primary', bg: 'bg-primary/10 border-primary/30' },
  reservada: { label: 'Reservada', color: 'text-warning', bg: 'bg-warning/10 border-warning/30' },
  conta: { label: 'Conta', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30' },
};

function MesaDetail({ mesa, onClose }: { mesa: Mesa; onClose: () => void }) {
  const [beverages, setBeverages] = useState(mesa.beverages);
  const { coverTotal, beverageTotal, total } = calcMesaTotal({ ...mesa, beverages });

  const addBeverage = (name: string) => {
    const item = beverageMenu.find(b => b.name === name);
    if (!item) return;
    const existing = beverages.find(b => b.name === name);
    if (existing) {
      setBeverages(beverages.map(b => b.name === name ? { ...b, quantity: b.quantity + 1 } : b));
    } else {
      setBeverages([...beverages, { name, quantity: 1, unitPrice: item.price }]);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header info */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-xs">Adultos</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{mesa.adults}</p>
          <p className="text-[10px] text-primary font-medium">€{getAdultPrice().toFixed(2)}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
            <Baby className="h-4 w-4" />
            <span className="text-xs">2–6 anos</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{mesa.children2to6}</p>
          <p className="text-[10px] text-primary font-medium">€{PRICING.child2to6.toFixed(2)}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
            <Baby className="h-4 w-4" />
            <span className="text-xs">7–12 anos</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{mesa.children7to12}</p>
          <p className="text-[10px] text-primary font-medium">€{PRICING.child7to12.toFixed(2)}</p>
        </div>
      </div>

      {mesa.waiter && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Funcionário</span>
          <Badge variant="secondary">{mesa.waiter}</Badge>
        </div>
      )}

      {mesa.openedAt && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Aberta às</span>
          <span className="font-medium text-foreground">{new Date(mesa.openedAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )}

      {/* Beverages */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Wine className="h-4 w-4 text-primary" />
            Bebidas
          </h4>
          <Select onValueChange={addBeverage}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="+ Adicionar" />
            </SelectTrigger>
            <SelectContent>
              {beverageMenu.map(b => (
                <SelectItem key={b.name} value={b.name}>
                  {b.name} — €{b.price.toFixed(2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {beverages.length > 0 ? (
          <div className="space-y-2">
            {beverages.map((b, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                <span className="text-sm text-foreground">{b.quantity}x {b.name}</span>
                <span className="text-sm font-medium text-foreground">€{(b.quantity * b.unitPrice).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="text-sm font-semibold text-foreground">Total</span>
              <span className="text-base font-bold text-primary">€{total.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-3">Nenhuma bebida registada</p>
        )}
      </div>

      {mesa.status === 'conta' && (
        <Button className="w-full gap-2" size="lg">
          <CreditCard className="h-4 w-4" />
          Fechar Conta — €{total.toFixed(2)}
        </Button>
      )}
    </div>
  );
}

export default function Mesas() {
  const [mesas] = useState(mockMesas);
  const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null);

  const totalClients = mesas.reduce((sum, m) => sum + m.adults + m.children2to6 + m.children7to12, 0);
  const occupiedCount = mesas.filter(m => m.status === 'ocupada' || m.status === 'conta').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-foreground">Mesas</h1>
          <p className="mt-1 text-muted-foreground">Gestão de sala em tempo real</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-card border border-border px-4 py-2 text-center">
            <p className="text-xs text-muted-foreground">Em sala</p>
            <p className="text-xl font-bold text-foreground">{totalClients}</p>
          </div>
          <div className="rounded-lg bg-card border border-border px-4 py-2 text-center">
            <p className="text-xs text-muted-foreground">Mesas ocupadas</p>
            <p className="text-xl font-bold text-primary">{occupiedCount}/{mesas.length}</p>
          </div>
        </div>
      </div>

      {/* Grid de mesas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {mesas.map((mesa, i) => {
          const cfg = statusConfig[mesa.status];
          return (
            <motion.div
              key={mesa.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setSelectedMesa(mesa)}
              className={cn(
                'cursor-pointer rounded-xl border-2 p-4 transition-all hover:scale-[1.03] hover:shadow-md',
                cfg.bg
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-foreground">Mesa {mesa.number}</span>
                <QrCode className="h-4 w-4 text-muted-foreground" />
              </div>
              <Badge variant="outline" className={cn('mt-2 text-[10px] border-0', cfg.color, cfg.bg)}>
                {cfg.label}
              </Badge>
              {(mesa.adults > 0 || mesa.children > 0) && (
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{mesa.adults}</span>
                  {mesa.children > 0 && <span className="flex items-center gap-1"><Baby className="h-3 w-3" />{mesa.children}</span>}
                </div>
              )}
              {mesa.waiter && <p className="mt-1 text-xs text-muted-foreground">{mesa.waiter}</p>}
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={cn('h-3 w-3 rounded-full', cfg.bg, 'border')} />
            {cfg.label}
          </span>
        ))}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedMesa} onOpenChange={open => !open && setSelectedMesa(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mesa {selectedMesa?.number}</DialogTitle>
          </DialogHeader>
          {selectedMesa && <MesaDetail mesa={selectedMesa} onClose={() => setSelectedMesa(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
