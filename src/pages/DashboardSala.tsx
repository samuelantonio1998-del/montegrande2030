import { useState } from 'react';
import { Users, Baby, Wine, QrCode, Clock, CreditCard, LogOut, Plus, Minus } from 'lucide-react';
import { mockMesas, beverageMenu, type Mesa, PRICING, getAdultPrice, calcMesaTotal, isWeekdayLunch } from '@/lib/mock-data';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  livre: { label: 'Livre', color: 'text-success', bg: 'bg-success/10 border-success/30' },
  ocupada: { label: 'A comer', color: 'text-primary', bg: 'bg-primary/10 border-primary/30' },
  reservada: { label: 'Reservada', color: 'text-warning', bg: 'bg-warning/10 border-warning/30' },
  conta: { label: 'Pediu conta', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30' },
};

function QuickBeveragePanel({ mesa, onUpdate }: { mesa: Mesa; onUpdate: (m: Mesa) => void }) {
  const addBev = (name: string, price: number) => {
    const existing = mesa.beverages.find(b => b.name === name);
    if (existing) {
      onUpdate({ ...mesa, beverages: mesa.beverages.map(b => b.name === name ? { ...b, quantity: b.quantity + 1 } : b) });
    } else {
      onUpdate({ ...mesa, beverages: [...mesa.beverages, { name, quantity: 1, unitPrice: price }] });
    }
  };

  const removeBev = (name: string) => {
    const existing = mesa.beverages.find(b => b.name === name);
    if (!existing) return;
    if (existing.quantity <= 1) {
      onUpdate({ ...mesa, beverages: mesa.beverages.filter(b => b.name !== name) });
    } else {
      onUpdate({ ...mesa, beverages: mesa.beverages.map(b => b.name === name ? { ...b, quantity: b.quantity - 1 } : b) });
    }
  };

  const { coverTotal, beverageTotal, total } = calcMesaTotal(mesa);

  return (
    <div className="space-y-4">
      {/* Guest info */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <Users className="mx-auto h-5 w-5 text-muted-foreground" />
          <p className="text-2xl font-bold text-foreground">{mesa.adults}</p>
          <p className="text-xs text-muted-foreground">Adultos</p>
          <p className="text-[10px] text-primary font-medium">€{getAdultPrice().toFixed(2)}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <Baby className="mx-auto h-5 w-5 text-warning" />
          <p className="text-2xl font-bold text-foreground">{mesa.children2to6}</p>
          <p className="text-xs text-muted-foreground">2–6 anos</p>
          <p className="text-[10px] text-primary font-medium">€{PRICING.child2to6.toFixed(2)}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <Baby className="mx-auto h-5 w-5 text-warning" />
          <p className="text-2xl font-bold text-foreground">{mesa.children7to12}</p>
          <p className="text-xs text-muted-foreground">7–12 anos</p>
          <p className="text-[10px] text-primary font-medium">€{PRICING.child7to12.toFixed(2)}</p>
        </div>
      </div>

      {mesa.openedAt && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Aberta às</span>
          <span className="font-medium text-foreground">{new Date(mesa.openedAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )}

      {/* Quick beverage buttons */}
      <div>
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-3">
          <Wine className="h-4 w-4 text-primary" /> Bebidas
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {beverageMenu.map(b => {
            const qty = mesa.beverages.find(bev => bev.name === b.name)?.quantity || 0;
            return (
              <button
                key={b.name}
                onClick={() => addBev(b.name, b.price)}
                className={cn(
                  'relative flex flex-col items-center rounded-xl border-2 p-3 transition-all active:scale-95',
                  qty > 0 ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'
                )}
              >
                <span className="text-sm font-medium text-foreground">{b.name}</span>
                <span className="text-xs text-muted-foreground">€{b.price.toFixed(2)}</span>
                {qty > 0 && (
                  <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {qty}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Current order summary */}
      {(mesa.beverages.length > 0 || coverTotal > 0) && (
        <div className="space-y-2 rounded-lg bg-muted/30 p-3">
          {coverTotal > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Refeições ({mesa.adults}A + {mesa.children2to6 + mesa.children7to12}C)</span>
              <span className="font-medium text-foreground">€{coverTotal.toFixed(2)}</span>
            </div>
          )}
          {mesa.beverages.map(b => (
            <div key={b.name} className="flex items-center justify-between">
              <span className="text-sm text-foreground">{b.name}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => removeBev(b.name)} className="rounded-full p-1 hover:bg-muted"><Minus className="h-3.5 w-3.5 text-muted-foreground" /></button>
                <span className="w-6 text-center text-sm font-medium text-foreground">{b.quantity}</span>
                <button onClick={() => addBev(b.name, b.unitPrice)} className="rounded-full p-1 hover:bg-muted"><Plus className="h-3.5 w-3.5 text-primary" /></button>
                <span className="ml-2 text-sm font-medium text-foreground w-16 text-right">€{(b.quantity * b.unitPrice).toFixed(2)}</span>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-border pt-2 mt-2">
            <span className="text-sm font-semibold text-foreground">Total</span>
            <span className="text-lg font-bold text-primary">€{total.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {mesa.status === 'ocupada' && (
          <Button variant="outline" className="flex-1 gap-2" onClick={() => onUpdate({ ...mesa, status: 'conta' })}>
            Pedir Conta
          </Button>
        )}
        {mesa.status === 'conta' && (
          <Button className="flex-1 gap-2" onClick={() => onUpdate({ ...mesa, status: 'livre', adults: 0, children: 0, children2to6: 0, children7to12: 0, beverages: [], openedAt: null, waiter: '' })}>
            <CreditCard className="h-4 w-4" />
            Fechar — €{total.toFixed(2)}
          </Button>
        )}
      </div>
    </div>
  );
}

function OpenMesaDialog({ mesa, onOpen }: { mesa: Mesa; onOpen: (adults: number, c2to6: number, c7to12: number) => void }) {
  const [adults, setAdults] = useState(2);
  const [c2to6, setC2to6] = useState(0);
  const [c7to12, setC7to12] = useState(0);

  const adultPrice = getAdultPrice();
  const previewTotal = adults * adultPrice + c2to6 * PRICING.child2to6 + c7to12 * PRICING.child7to12;

  return (
    <div className="space-y-6">
      {/* Pricing info */}
      <div className="text-center text-xs text-muted-foreground">
        {isWeekdayLunch() ? 'Almoço dias úteis' : 'Fim-de-semana / jantar / feriado'} — Adulto €{adultPrice.toFixed(2)}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Adults */}
        <div className="text-center space-y-2">
          <Users className="mx-auto h-7 w-7 text-primary" />
          <p className="text-sm font-medium text-foreground">Adultos</p>
          <p className="text-[10px] text-muted-foreground">€{adultPrice.toFixed(2)}</p>
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setAdults(Math.max(0, adults - 1))} className="rounded-full h-9 w-9 bg-muted flex items-center justify-center active:scale-95"><Minus className="h-4 w-4" /></button>
            <span className="text-2xl font-bold text-foreground w-7 text-center">{adults}</span>
            <button onClick={() => setAdults(adults + 1)} className="rounded-full h-9 w-9 bg-primary text-primary-foreground flex items-center justify-center active:scale-95"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
        {/* Children 2-6 */}
        <div className="text-center space-y-2">
          <Baby className="mx-auto h-7 w-7 text-warning" />
          <p className="text-sm font-medium text-foreground">2–6 anos</p>
          <p className="text-[10px] text-muted-foreground">€{PRICING.child2to6.toFixed(2)}</p>
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setC2to6(Math.max(0, c2to6 - 1))} className="rounded-full h-9 w-9 bg-muted flex items-center justify-center active:scale-95"><Minus className="h-4 w-4" /></button>
            <span className="text-2xl font-bold text-foreground w-7 text-center">{c2to6}</span>
            <button onClick={() => setC2to6(c2to6 + 1)} className="rounded-full h-9 w-9 bg-primary text-primary-foreground flex items-center justify-center active:scale-95"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
        {/* Children 7-12 */}
        <div className="text-center space-y-2">
          <Baby className="mx-auto h-7 w-7 text-warning" />
          <p className="text-sm font-medium text-foreground">7–12 anos</p>
          <p className="text-[10px] text-muted-foreground">€{PRICING.child7to12.toFixed(2)}</p>
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setC7to12(Math.max(0, c7to12 - 1))} className="rounded-full h-9 w-9 bg-muted flex items-center justify-center active:scale-95"><Minus className="h-4 w-4" /></button>
            <span className="text-2xl font-bold text-foreground w-7 text-center">{c7to12}</span>
            <button onClick={() => setC7to12(c7to12 + 1)} className="rounded-full h-9 w-9 bg-primary text-primary-foreground flex items-center justify-center active:scale-95"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      <Button className="w-full" size="lg" onClick={() => onOpen(adults, c2to6, c7to12)}>
        Abrir Mesa — €{previewTotal.toFixed(2)}
      </Button>
    </div>
  );
}

export default function DashboardSala() {
  const { user, logout } = useAuth();
  const [mesas, setMesas] = useState(mockMesas);
  const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null);
  const [openingMesa, setOpeningMesa] = useState<Mesa | null>(null);

  const totalInRoom = mesas.reduce((s, m) => s + m.adults + m.children2to6 + m.children7to12, 0);
  const occupiedCount = mesas.filter(m => m.status === 'ocupada' || m.status === 'conta').length;

  const updateMesa = (updated: Mesa) => {
    setMesas(mesas.map(m => m.id === updated.id ? updated : m));
    setSelectedMesa(updated);
  };

  const handleOpenMesa = (mesa: Mesa, adults: number, c2to6: number, c7to12: number) => {
    const opened: Mesa = {
      ...mesa,
      status: 'ocupada',
      adults,
      children: c2to6 + c7to12,
      children2to6: c2to6,
      children7to12: c7to12,
      waiter: user?.name || '',
      openedAt: new Date().toISOString(),
      beverages: [],
    };
    setMesas(mesas.map(m => m.id === mesa.id ? opened : m));
    setOpeningMesa(null);
    setSelectedMesa(opened);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display text-foreground">Olá, {user?.name}</h1>
          <p className="text-sm text-muted-foreground">Sala · {totalInRoom} pessoas em sala</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-card border border-border px-4 py-2 text-center">
            <p className="text-xs text-muted-foreground">Mesas</p>
            <p className="text-xl font-bold text-primary">{occupiedCount}/{mesas.length}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mesa grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {mesas.map((mesa, i) => {
          const cfg = statusConfig[mesa.status];
          return (
            <motion.div
              key={mesa.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => mesa.status === 'livre' ? setOpeningMesa(mesa) : setSelectedMesa(mesa)}
              className={cn(
                'cursor-pointer rounded-xl border-2 p-4 transition-all hover:scale-[1.02] active:scale-[0.98]',
                cfg.bg
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-foreground">{mesa.number}</span>
                <QrCode className="h-4 w-4 text-muted-foreground" />
              </div>
              <Badge variant="outline" className={cn('mt-2 text-[10px] border-0', cfg.color, cfg.bg)}>
                {cfg.label}
              </Badge>
              {(mesa.adults > 0 || mesa.children > 0) && (
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{mesa.adults}</span>
                  {mesa.children > 0 && <span className="flex items-center gap-0.5"><Baby className="h-3 w-3" />{mesa.children}</span>}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={cn('h-3 w-3 rounded-full border', cfg.bg)} />
            {cfg.label}
          </span>
        ))}
      </div>

      {/* Open mesa dialog */}
      <Dialog open={!!openingMesa} onOpenChange={open => !open && setOpeningMesa(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Abrir Mesa {openingMesa?.number}</DialogTitle>
          </DialogHeader>
          {openingMesa && <OpenMesaDialog mesa={openingMesa} onOpen={(a, c) => handleOpenMesa(openingMesa, a, c)} />}
        </DialogContent>
      </Dialog>

      {/* Mesa detail dialog */}
      <Dialog open={!!selectedMesa} onOpenChange={open => !open && setSelectedMesa(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Mesa {selectedMesa?.number}
              {selectedMesa && <Badge variant="outline" className={cn('text-xs', statusConfig[selectedMesa.status].color)}>{statusConfig[selectedMesa.status].label}</Badge>}
            </DialogTitle>
          </DialogHeader>
          {selectedMesa && <QuickBeveragePanel mesa={selectedMesa} onUpdate={updateMesa} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
