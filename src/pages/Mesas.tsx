import { useState, useEffect } from 'react';
import { Users, Baby, Wine, QrCode, Clock, CreditCard, Plus, Minus, CakeSlice, XCircle, CalendarCheck } from 'lucide-react';
import { type Mesa } from '@/lib/mock-data';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { printReceipt } from '@/components/mesas/ReceiptPrint';
import { PinDialog } from '@/components/mesas/PinDialog';
import { useMesas } from '@/hooks/useMesas';
import { usePrecario, getAdultPrice, isWeekdayLunch, calcMesaTotal } from '@/hooks/usePrecario';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  livre: { label: 'Livre', color: 'text-success', bg: 'bg-success/10 border-success/30' },
  ocupada: { label: 'Ocupada', color: 'text-primary', bg: 'bg-primary/10 border-primary/30' },
  reservada: { label: 'Reservada', color: 'text-warning', bg: 'bg-warning/10 border-warning/30' },
  conta: { label: 'Conta', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30' },
};

/* ── Open Mesa Dialog ── */
function OpenMesaDialog({ mesa, onOpen, mealPrices }: { mesa: Mesa; onOpen: (adults: number, c2to6: number, c7to12: number) => void; mealPrices: { adultWeekdayLunch: number; adultPremium: number; child2to6: number; child7to12: number } }) {
  const [adults, setAdults] = useState(2);
  const [c2to6, setC2to6] = useState(0);
  const [c7to12, setC7to12] = useState(0);

  const adultPrice = getAdultPrice(mealPrices);
  const previewTotal = adults * adultPrice + c2to6 * mealPrices.child2to6 + c7to12 * mealPrices.child7to12;

  return (
    <div className="space-y-6">
      <div className="text-center text-xs text-muted-foreground">
        {isWeekdayLunch() ? 'Almoço dias úteis' : 'Fim-de-semana / jantar / feriado'} — Adulto €{adultPrice.toFixed(2)}
      </div>

      <div className="grid grid-cols-3 gap-4">
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
        <div className="text-center space-y-2">
          <Baby className="mx-auto h-7 w-7 text-warning" />
          <p className="text-sm font-medium text-foreground">2–6 anos</p>
          <p className="text-[10px] text-muted-foreground">€{mealPrices.child2to6.toFixed(2)}</p>
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setC2to6(Math.max(0, c2to6 - 1))} className="rounded-full h-9 w-9 bg-muted flex items-center justify-center active:scale-95"><Minus className="h-4 w-4" /></button>
            <span className="text-2xl font-bold text-foreground w-7 text-center">{c2to6}</span>
            <button onClick={() => setC2to6(c2to6 + 1)} className="rounded-full h-9 w-9 bg-primary text-primary-foreground flex items-center justify-center active:scale-95"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="text-center space-y-2">
          <Baby className="mx-auto h-7 w-7 text-warning" />
          <p className="text-sm font-medium text-foreground">7–12 anos</p>
          <p className="text-[10px] text-muted-foreground">€{mealPrices.child7to12.toFixed(2)}</p>
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setC7to12(Math.max(0, c7to12 - 1))} className="rounded-full h-9 w-9 bg-muted flex items-center justify-center active:scale-95"><Minus className="h-4 w-4" /></button>
            <span className="text-2xl font-bold text-foreground w-7 text-center">{c7to12}</span>
            <button onClick={() => setC7to12(c7to12 + 1)} className="rounded-full h-9 w-9 bg-primary text-primary-foreground flex items-center justify-center active:scale-95"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      <Button className="w-full" size="lg" onClick={() => onOpen(adults, c2to6, c7to12)}>
        Abrir Mesa
      </Button>
    </div>
  );
}

/* ── Mesa Detail (occupied/conta) ── */
function MesaDetail({ mesa, onUpdate, onCancel, beverageMenu, beverageMenuFlat, mealPrices }: {
  mesa: Mesa;
  onUpdate: (m: Mesa) => void;
  onCancel: () => void;
  beverageMenu: { category: string; items: { id: string; name: string; price: number }[] }[];
  beverageMenuFlat: { id: string; name: string; price: number }[];
  mealPrices: { adultWeekdayLunch: number; adultPremium: number; child2to6: number; child7to12: number };
}) {
  const [pinAction, setPinAction] = useState<'cancel' | null>(null);
  const { coverTotal, beverageTotal, total } = calcMesaTotal(mesa, mealPrices);

  const dessertCategory = 'Sobremesas';
  const beverageMenuNoDesserts = beverageMenu.filter(c => c.category !== dessertCategory);
  const dessertMenu = beverageMenu.find(c => c.category === dessertCategory);
  const dessertMenuFlat = dessertMenu ? dessertMenu.items : [];

  const mesaBeverages = mesa.beverages.filter(b => !dessertMenuFlat.some(d => d.name === b.name));
  const mesaDesserts = mesa.beverages.filter(b => dessertMenuFlat.some(d => d.name === b.name));

  const addItem = (name: string) => {
    const item = beverageMenuFlat.find(b => b.name === name);
    if (!item) return;
    const existing = mesa.beverages.find(b => b.name === name);
    if (existing) {
      onUpdate({ ...mesa, beverages: mesa.beverages.map(b => b.name === name ? { ...b, quantity: b.quantity + 1 } : b) });
    } else {
      onUpdate({ ...mesa, beverages: [...mesa.beverages, { name, quantity: 1, unitPrice: item.price }] });
    }
  };

  const removeItem = (name: string) => {
    const existing = mesa.beverages.find(b => b.name === name);
    if (!existing) return;
    if (existing.quantity <= 1) {
      onUpdate({ ...mesa, beverages: mesa.beverages.filter(b => b.name !== name) });
    } else {
      onUpdate({ ...mesa, beverages: mesa.beverages.map(b => b.name === name ? { ...b, quantity: b.quantity - 1 } : b) });
    }
  };

  const renderItemList = (items: typeof mesa.beverages) => (
    items.length > 0 ? (
      <div className="space-y-2">
        {items.map((b) => (
          <div key={b.name} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
            <span className="text-sm text-foreground">{b.name}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => removeItem(b.name)} className="rounded-full p-1 hover:bg-muted"><Minus className="h-3.5 w-3.5 text-muted-foreground" /></button>
              <span className="w-6 text-center text-sm font-medium text-foreground">{b.quantity}</span>
              <button onClick={() => addItem(b.name)} className="rounded-full p-1 hover:bg-muted"><Plus className="h-3.5 w-3.5 text-primary" /></button>
              <span className="ml-2 text-sm font-medium text-foreground w-16 text-right">€{(b.quantity * b.unitPrice).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    ) : null
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
            <Users className="h-4 w-4" /><span className="text-xs">Adultos</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{mesa.adults}</p>
          <p className="text-[10px] text-primary font-medium">€{getAdultPrice(mealPrices).toFixed(2)}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
            <Baby className="h-4 w-4" /><span className="text-xs">2–6 anos</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{mesa.children2to6}</p>
          <p className="text-[10px] text-primary font-medium">€{mealPrices.child2to6.toFixed(2)}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
            <Baby className="h-4 w-4" /><span className="text-xs">7–12 anos</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{mesa.children7to12}</p>
          <p className="text-[10px] text-primary font-medium">€{mealPrices.child7to12.toFixed(2)}</p>
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
            <Wine className="h-4 w-4 text-primary" /> Bebidas
          </h4>
          <Select onValueChange={addItem}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="+ Adicionar" /></SelectTrigger>
            <SelectContent className="max-h-60">
              {beverageMenuNoDesserts.map(cat => (
                <SelectGroup key={cat.category}>
                  <SelectLabel className="text-xs font-semibold text-primary">{cat.category}</SelectLabel>
                  {cat.items.map(b => (
                    <SelectItem key={b.name} value={b.name} className="text-xs">{b.name} — €{b.price.toFixed(2)}</SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
        {renderItemList(mesaBeverages) || <p className="text-sm text-muted-foreground text-center py-3">Nenhuma bebida registada</p>}
      </div>

      {/* Desserts */}
      {dessertMenu && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <CakeSlice className="h-4 w-4 text-primary" /> Sobremesas
            </h4>
            <Select onValueChange={addItem}>
              <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="+ Adicionar" /></SelectTrigger>
              <SelectContent className="max-h-60">
                {dessertMenu.items.map(b => (
                  <SelectItem key={b.name} value={b.name} className="text-xs">{b.name} — €{b.price.toFixed(2)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {renderItemList(mesaDesserts) || <p className="text-sm text-muted-foreground text-center py-3">Nenhuma sobremesa registada</p>}
        </div>
      )}

      {/* Total */}
      {(coverTotal > 0 || beverageTotal > 0) && (
        <div className="rounded-lg bg-muted/30 p-3 space-y-1">
          {beverageTotal > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Bebidas</span>
              <span className="font-medium text-foreground">€{beverageTotal.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {mesa.status === 'ocupada' && (
          <>
            <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setPinAction('cancel')}>
              <XCircle className="h-4 w-4" /> Cancelar
            </Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={() => onUpdate({ ...mesa, status: 'conta' })}>Pedir Conta</Button>
          </>
        )}
        {mesa.status === 'conta' && (
          <>
            <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => setPinAction('cancel')}>
              <XCircle className="h-4 w-4" /> Cancelar
            </Button>
            <Button className="flex-1 gap-2" onClick={async () => {
              printReceipt(mesa);
              try {
                const { data: produtos } = await supabase.from('produtos').select('id, nome, stock_atual');
                if (produtos && mesa.beverages.length > 0) {
                  for (const bev of mesa.beverages) {
                    const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
                    const bevNorm = normalize(bev.name);
                    let bestMatch: typeof produtos[0] | null = null;
                    let bestScore = 0;
                    for (const p of produtos) {
                      const pNorm = normalize(p.nome);
                      if (pNorm === bevNorm || pNorm.includes(bevNorm) || bevNorm.includes(pNorm)) { bestMatch = p; bestScore = 1; break; }
                      const bg = (s: string) => { const b: string[] = []; for (let i = 0; i < s.length - 1; i++) b.push(s.slice(i, i + 2)); return b; };
                      const a = bg(bevNorm), b2 = bg(pNorm);
                      const inter = a.filter(x => b2.includes(x)).length;
                      const score = a.length + b2.length > 0 ? (2 * inter) / (a.length + b2.length) : 0;
                      if (score > bestScore && score >= 0.5) { bestScore = score; bestMatch = p; }
                    }
                    if (bestMatch) {
                      await supabase.from('produtos').update({ stock_atual: Math.max(0, bestMatch.stock_atual - bev.quantity) }).eq('id', bestMatch.id);
                      await supabase.from('movimentacoes').insert({ produto_id: bestMatch.id, tipo: 'saida', quantidade: bev.quantity, motivo: `Mesa ${mesa.number} — ${bev.name}`, funcionario: mesa.waiter || null });
                    }
                  }
                  toast.success('Stock de bebidas atualizado');
                }
              } catch (e) {
                console.error('Erro ao descontar stock:', e);
                toast.error('Erro ao descontar stock de bebidas');
              }
              onUpdate({ ...mesa, status: 'livre', adults: 0, children: 0, children2to6: 0, children7to12: 0, beverages: [], openedAt: null, waiter: '' });
            }}>
              <CreditCard className="h-4 w-4" /> Fechar Conta — €{total.toFixed(2)}
            </Button>
          </>
        )}
      </div>

      <PinDialog open={pinAction === 'cancel'} onOpenChange={(o) => !o && setPinAction(null)} title="Cancelar Mesa"
        description={`Cancelar mesa ${mesa.number}? Todos os consumos serão revertidos.`} allowedRoles={['gerencia']}
        onAuthorized={() => { setPinAction(null); onCancel(); }} />
    </div>
  );
}

/* ── Main Page ── */
export default function Mesas() {
  const { mesas, loading, updateMesa } = useMesas();
  const { beverageMenu, beverageMenuFlat, mealPrices } = usePrecario();
  const [selectedMesa, setSelectedMesa] = useState<Mesa | null>(null);
  const [openingMesa, setOpeningMesa] = useState<Mesa | null>(null);

  const totalClients = mesas.reduce((sum, m) => sum + m.adults + m.children2to6 + m.children7to12, 0);
  const occupiedCount = mesas.filter(m => m.status === 'ocupada' || m.status === 'conta').length;

  const handleUpdate = async (updated: Mesa) => {
    await updateMesa(updated);
    if (updated.status === 'livre') setSelectedMesa(null);
    else setSelectedMesa(updated);
  };

  const handleCancelMesa = async (mesa: Mesa) => {
    const reset: Mesa = { ...mesa, status: 'livre', adults: 0, children: 0, children2to6: 0, children7to12: 0, beverages: [], openedAt: null, waiter: '' };
    await updateMesa(reset);
    setSelectedMesa(null);
    toast.success(`Mesa ${mesa.number} cancelada`);
  };

  const handleOpenMesa = async (mesa: Mesa, adults: number, c2to6: number, c7to12: number) => {
    const opened: Mesa = { ...mesa, status: 'ocupada', adults, children: c2to6 + c7to12, children2to6: c2to6, children7to12: c7to12, waiter: '', openedAt: new Date().toISOString(), beverages: [] };
    await updateMesa(opened);
    setOpeningMesa(null);
    setSelectedMesa(opened);
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">A carregar mesas...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-foreground">Talão de Mesa</h1>
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {mesas.map((mesa, i) => {
          const cfg = statusConfig[mesa.status];
          return (
            <motion.div key={mesa.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              onClick={() => mesa.status === 'livre' ? setOpeningMesa(mesa) : setSelectedMesa(mesa)}
              className={cn('cursor-pointer rounded-xl border-2 p-4 transition-all hover:scale-[1.03] hover:shadow-md', cfg.bg)}>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-foreground">Mesa {mesa.number}</span>
                <QrCode className="h-4 w-4 text-muted-foreground" />
              </div>
              <Badge variant="outline" className={cn('mt-2 text-[10px] border-0', cfg.color, cfg.bg)}>{cfg.label}</Badge>
              {(mesa.adults > 0 || mesa.children2to6 > 0 || mesa.children7to12 > 0) && (
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{mesa.adults}</span>
                  {(mesa.children2to6 + mesa.children7to12) > 0 && <span className="flex items-center gap-1"><Baby className="h-3 w-3" />{mesa.children2to6 + mesa.children7to12}</span>}
                </div>
              )}
              {mesa.waiter && <p className="mt-1 text-xs text-muted-foreground">{mesa.waiter}</p>}
            </motion.div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-1.5"><span className={cn('h-3 w-3 rounded-full', cfg.bg, 'border')} />{cfg.label}</span>
        ))}
      </div>

      <Dialog open={!!openingMesa} onOpenChange={open => !open && setOpeningMesa(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Abrir Mesa {openingMesa?.number}</DialogTitle></DialogHeader>
          {openingMesa && <OpenMesaDialog mesa={openingMesa} onOpen={(a, c2, c7) => handleOpenMesa(openingMesa, a, c2, c7)} mealPrices={mealPrices} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedMesa} onOpenChange={open => !open && setSelectedMesa(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Mesa {selectedMesa?.number}
              {selectedMesa && <Badge variant="outline" className={cn('text-xs', statusConfig[selectedMesa.status].color)}>{statusConfig[selectedMesa.status].label}</Badge>}
            </DialogTitle>
          </DialogHeader>
          {selectedMesa && <MesaDetail mesa={selectedMesa} onUpdate={handleUpdate} onCancel={() => handleCancelMesa(selectedMesa)} beverageMenu={beverageMenu} beverageMenuFlat={beverageMenuFlat} mealPrices={mealPrices} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
