import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Clock, ArrowRight, Recycle, Trash2, AlertTriangle, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { recipientCapacity, type RecipientSize, type TrayStatus } from '@/lib/buffet-data';
import { useRegistosProducao, type RegistoProducao } from '@/hooks/useRegistosProducao';
import { useEmentaDiaria } from '@/hooks/useEmentaDiaria';
import { useAuth } from '@/contexts/AuthContext';

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  no_buffet: { label: 'No Buffet', color: 'bg-primary/10 text-primary', icon: Clock },
  recolhido: { label: 'Recolhido', color: 'bg-muted text-muted-foreground', icon: ArrowRight },
  aproveitado: { label: 'Aproveitado', color: 'bg-success/10 text-success', icon: Recycle },
  desperdicio: { label: 'Desperdício', color: 'bg-destructive/10 text-destructive', icon: Trash2 },
};

export default function Producao() {
  const { user } = useAuth();
  const { registos, addRegisto, recolherRegisto, activeTrays, completedTrays, wasteSummary } = useRegistosProducao();
  const today = new Date();
  const { data: ementaItems = [] } = useEmentaDiaria(today);

  const ementaByZone = useMemo(() => {
    const zones: Record<string, { id: string; nome: string; recipiente: string }[]> = { entradas: [], pratos_principais: [], sobremesas: [] };
    ementaItems.forEach(e => {
      if (e.buffet_item?.zona && zones[e.buffet_item.zona]) {
        zones[e.buffet_item.zona].push({ id: e.buffet_item.id, nome: e.buffet_item.nome, recipiente: e.recipiente_sugerido });
      }
    });
    return zones;
  }, [ementaItems]);

  const allEmentaDishes = useMemo(() => ementaItems.filter(e => e.buffet_item).map(e => ({
    id: e.buffet_item!.id, nome: e.buffet_item!.nome, recipiente: e.recipiente_sugerido as RecipientSize,
  })), [ementaItems]);

  const [showNewDialog, setShowNewDialog] = useState(false);
  const [checkoutTarget, setCheckoutTarget] = useState<RegistoProducao | null>(null);
  const [newDish, setNewDish] = useState('');
  const [newRecipient, setNewRecipient] = useState<RecipientSize>('tabuleiro_grande');
  const [leftoverKg, setLeftoverKg] = useState('');
  const [leftoverAction, setLeftoverAction] = useState<'aproveitamento' | 'desperdicio'>('aproveitamento');
  const [aprovNote, setAprovNote] = useState('');

  async function handleSendTray() {
    if (!newDish) return;
    const dish = allEmentaDishes.find(d => d.nome === newDish);
    const cap = recipientCapacity[newRecipient];
    await addRegisto({
      dish_name: newDish,
      ficha_tecnica_id: dish?.id,
      buffet_item_id: dish?.id,
      recipiente: newRecipient,
      peso_kg: cap.capacityKg,
      registado_por: user?.name || 'Gerente',
    });
    setShowNewDialog(false);
    setNewDish('');
    setNewRecipient('tabuleiro_grande');
  }

  async function handleCheckout() {
    if (!checkoutTarget) return;
    const kg = parseFloat(leftoverKg) || 0;
    await recolherRegisto(checkoutTarget.id, kg, leftoverAction, leftoverAction === 'aproveitamento' ? aprovNote : null);
    setCheckoutTarget(null);
    setLeftoverKg('');
    setLeftoverAction('aproveitamento');
    setAprovNote('');
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  }

  // Production alerts computed from waste data
  const waste = wasteSummary();
  const alerts = waste.filter(w => w.wastePercentage > 15).map(w => ({
    id: w.dishName,
    message: `${w.dishName} tem ${w.wastePercentage.toFixed(0)}% de desperdício. Considerar recipiente mais pequeno.`,
    priority: w.wastePercentage > 20 ? 'alta' as const : 'media' as const,
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-foreground">Produção Buffet</h1>
          <p className="mt-1 text-muted-foreground">Registo de tabuleiros e ciclo de vida</p>
        </div>
        <Button onClick={() => setShowNewDialog(true)} className="gap-2"><Plus className="h-4 w-4" /> Enviar Tabuleiro</Button>
      </div>

      {alerts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <h2 className="font-display text-lg text-foreground flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning" /> Alertas de Produção</h2>
          {alerts.map(alert => (
            <div key={alert.id} className={cn('rounded-lg border p-4', alert.priority === 'alta' ? 'border-destructive/30 bg-destructive/5' : 'border-warning/30 bg-warning/5')}>
              <p className="text-sm font-medium text-foreground">{alert.message}</p>
            </div>
          ))}
        </motion.div>
      )}

      <div>
        <h2 className="font-display text-xl text-foreground mb-4 flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-primary" /> Tabuleiros no Buffet ({activeTrays.length})
        </h2>
        {(() => {
          // Group active trays by dish name
          const grouped = new Map<string, RegistoProducao[]>();
          activeTrays.forEach(r => {
            const list = grouped.get(r.dish_name) || [];
            list.push(r);
            grouped.set(r.dish_name, list);
          });
          return (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {Array.from(grouped.entries()).map(([dishName, trays]) => {
                  const totalKg = trays.reduce((s, t) => s + t.peso_kg, 0);
                  return (
                    <motion.div key={dishName} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="rounded-xl border border-primary/20 bg-card p-5 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground">{dishName}</h3>
                          <p className="text-sm text-muted-foreground">{trays.length} reposição{trays.length > 1 ? 'ões' : ''} · {totalKg}kg total</p>
                        </div>
                        <Badge className={statusConfig.no_buffet.color}><Clock className="mr-1 h-3 w-3" /> No Buffet</Badge>
                      </div>
                      <div className="mt-3 space-y-2 border-t border-border pt-3">
                        {trays.map(record => {
                          const cap = recipientCapacity[record.recipiente as RecipientSize] || { label: record.recipiente, capacityKg: record.peso_kg };
                          return (
                            <div key={record.id} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{cap.label} · {record.peso_kg}kg · {formatTime(record.enviado_at)}</span>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCheckoutTarget(record)}>Recolher</Button>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          );
        })()}
        {activeTrays.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum tabuleiro no buffet</p>}
      </div>

      <div>
        <h2 className="font-display text-xl text-foreground mb-4">Registos do Dia</h2>
        <div className="space-y-3">
          {completedTrays.map(record => {
            const cfg = statusConfig[record.estado] || statusConfig.no_buffet;
            const cap = recipientCapacity[record.recipiente as RecipientSize] || { label: record.recipiente, capacityKg: record.peso_kg };
            const Icon = cfg.icon;
            return (
              <motion.div key={record.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{record.dish_name}</span>
                    <Badge className={cfg.color} variant="secondary"><Icon className="mr-1 h-3 w-3" /> {cfg.label}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {cap.label} · {record.peso_kg}kg enviado · {formatTime(record.enviado_at)} → {record.recolhido_at ? formatTime(record.recolhido_at) : '—'}
                  </p>
                </div>
                {record.sobra_kg !== null && (
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{record.sobra_kg}kg sobra</p>
                    {record.aproveitamento_nota && <p className="text-xs text-success">{record.aproveitamento_nota}</p>}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Tabuleiro para Buffet</DialogTitle>
            <DialogDescription>Registe o prato e recipiente que vai para a sala.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Prato</Label>
              <Select value={newDish} onValueChange={(v) => { setNewDish(v); const dish = allEmentaDishes.find(d => d.nome === v); if (dish && recipientCapacity[dish.recipiente]) setNewRecipient(dish.recipiente); }}>
                <SelectTrigger><SelectValue placeholder="Selecionar prato da ementa" /></SelectTrigger>
                <SelectContent>
                  {ementaByZone.entradas.length > 0 && <SelectGroup><SelectLabel>Entradas</SelectLabel>{ementaByZone.entradas.map(d => <SelectItem key={d.id} value={d.nome}>{d.nome}</SelectItem>)}</SelectGroup>}
                  {ementaByZone.pratos_principais.length > 0 && <SelectGroup><SelectLabel>Pratos Quentes</SelectLabel>{ementaByZone.pratos_principais.map(d => <SelectItem key={d.id} value={d.nome}>{d.nome}</SelectItem>)}</SelectGroup>}
                  {ementaByZone.sobremesas.length > 0 && <SelectGroup><SelectLabel>Sobremesas</SelectLabel>{ementaByZone.sobremesas.map(d => <SelectItem key={d.id} value={d.nome}>{d.nome}</SelectItem>)}</SelectGroup>}
                  {allEmentaDishes.length === 0 && <SelectItem value="_empty" disabled>Nenhum prato na ementa de hoje</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Recipiente</Label>
              <Select value={newRecipient} onValueChange={v => setNewRecipient(v as RecipientSize)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(recipientCapacity).map(([key, val]) => <SelectItem key={key} value={key}>{val.label} ({val.capacityKg}kg)</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancelar</Button>
            <Button onClick={handleSendTray} disabled={!newDish}>Registar Saída</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!checkoutTarget} onOpenChange={() => setCheckoutTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recolher Tabuleiro</DialogTitle>
            <DialogDescription>{checkoutTarget?.dish_name} — {checkoutTarget && (recipientCapacity[checkoutTarget.recipiente as RecipientSize]?.label || checkoutTarget.recipiente)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Peso da sobra (kg)</Label><Input type="number" step="0.1" min="0" placeholder="Ex: 1.2" value={leftoverKg} onChange={e => setLeftoverKg(e.target.value)} /></div>
            <div>
              <Label className="mb-3 block">O que fazer com a sobra?</Label>
              <RadioGroup value={leftoverAction} onValueChange={v => setLeftoverAction(v as 'aproveitamento' | 'desperdicio')}>
                <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <RadioGroupItem value="aproveitamento" id="aprov" className="mt-0.5" />
                  <Label htmlFor="aprov" className="cursor-pointer"><div className="flex items-center gap-2"><Recycle className="h-4 w-4 text-success" /><span className="font-medium">Aproveitamento</span></div><p className="text-xs text-muted-foreground mt-1">Arrefecer e reutilizar noutra preparação</p></Label>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <RadioGroupItem value="desperdicio" id="desp" className="mt-0.5" />
                  <Label htmlFor="desp" className="cursor-pointer"><div className="flex items-center gap-2"><Trash2 className="h-4 w-4 text-destructive" /><span className="font-medium">Desperdício</span></div><p className="text-xs text-muted-foreground mt-1">Comida exposta que deve ser descartada</p></Label>
                </div>
              </RadioGroup>
            </div>
            {leftoverAction === 'aproveitamento' && (
              <div><Label>Para que preparação?</Label><Input placeholder="Ex: Recheio de rissóis, Sopa..." value={aprovNote} onChange={e => setAprovNote(e.target.value)} /></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutTarget(null)}>Cancelar</Button>
            <Button onClick={handleCheckout}>Confirmar Recolha</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
