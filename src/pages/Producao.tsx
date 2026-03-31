import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Clock, ArrowRight, Recycle, Trash2, AlertTriangle, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  mockProductionAlerts, recipientCapacity,
  type ProductionRecord, type RecipientSize, type TrayStatus
} from '@/lib/buffet-data';
import { mockFichasTecnicas } from '@/lib/mock-data';
import { useProduction } from '@/contexts/ProductionContext';

const statusConfig: Record<TrayStatus, { label: string; color: string; icon: typeof Clock }> = {
  no_buffet: { label: 'No Buffet', color: 'bg-primary/10 text-primary', icon: Clock },
  recolhido: { label: 'Recolhido', color: 'bg-muted text-muted-foreground', icon: ArrowRight },
  aproveitado: { label: 'Aproveitado', color: 'bg-success/10 text-success', icon: Recycle },
  desperdicio: { label: 'Desperdício', color: 'bg-destructive/10 text-destructive', icon: Trash2 },
};

export default function Producao() {
  const { records, addRecord, checkoutRecord, leftoverHistory } = useProduction();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [checkoutTarget, setCheckoutTarget] = useState<ProductionRecord | null>(null);

  // New tray form
  const [newDish, setNewDish] = useState('');
  const [newRecipient, setNewRecipient] = useState<RecipientSize>('tabuleiro_grande');

  // Checkout form
  const [leftoverKg, setLeftoverKg] = useState('');
  const [leftoverAction, setLeftoverAction] = useState<'aproveitamento' | 'desperdicio'>('aproveitamento');
  const [aprovNote, setAprovNote] = useState('');

  const activeTrays = records.filter(r => r.status === 'no_buffet');
  const completedTrays = records.filter(r => r.status !== 'no_buffet');

  function handleSendTray() {
    if (!newDish) return;
    const ficha = mockFichasTecnicas.find(f => f.name === newDish);
    const cap = recipientCapacity[newRecipient];
    const newRecord: ProductionRecord = {
      id: `p${Date.now()}`,
      dishName: newDish,
      fichaTecnicaId: ficha?.id || '',
      recipient: newRecipient,
      weightKg: cap.capacityKg,
      sentAt: new Date().toISOString(),
      returnedAt: null,
      status: 'no_buffet',
      leftoverKg: null,
      leftoverAction: null,
      aproveitamentoNote: null,
      registeredBy: 'Gerente',
    };
    addRecord(newRecord);
    setShowNewDialog(false);
    setNewDish('');
    setNewRecipient('tabuleiro_grande');
  }

  function handleCheckout() {
    if (!checkoutTarget) return;
    const kg = parseFloat(leftoverKg) || 0;
    checkoutRecord(checkoutTarget.id, kg, leftoverAction, leftoverAction === 'aproveitamento' ? aprovNote : null);
    setCheckoutTarget(null);
    setLeftoverKg('');
    setLeftoverAction('aproveitamento');
    setAprovNote('');
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-foreground">Produção Buffet</h1>
          <p className="mt-1 text-muted-foreground">Registo de tabuleiros e ciclo de vida</p>
        </div>
        <Button onClick={() => setShowNewDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Enviar Tabuleiro
        </Button>
      </div>

      {/* Production Alerts */}
      {mockProductionAlerts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <h2 className="font-display text-lg text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" /> Alertas de Produção
          </h2>
          {mockProductionAlerts.map(alert => (
            <div
              key={alert.id}
              className={cn(
                'rounded-lg border p-4',
                alert.priority === 'alta' ? 'border-destructive/30 bg-destructive/5' : 'border-warning/30 bg-warning/5'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{alert.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Baseado em: {alert.basedOn}</p>
                </div>
                <Badge variant="outline" className={alert.priority === 'alta' ? 'border-destructive text-destructive' : 'border-warning text-warning'}>
                  {alert.priority}
                </Badge>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Active Trays */}
      <div>
        <h2 className="font-display text-xl text-foreground mb-4 flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-primary" />
          Tabuleiros no Buffet ({activeTrays.length})
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {activeTrays.map(record => {
              const cap = recipientCapacity[record.recipient];
              return (
                <motion.div
                  key={record.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-xl border border-primary/20 bg-card p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{record.dishName}</h3>
                      <p className="text-sm text-muted-foreground">{cap.label} — {record.weightKg}kg</p>
                    </div>
                    <Badge className={statusConfig.no_buffet.color}>
                      <Clock className="mr-1 h-3 w-3" /> No Buffet
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Saída: {formatTime(record.sentAt)} · {record.registeredBy}
                    </p>
                    <Button size="sm" variant="outline" onClick={() => setCheckoutTarget(record)}>
                      Recolher
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        {activeTrays.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Nenhum tabuleiro no buffet</p>
        )}
      </div>

      {/* Completed today */}
      <div>
        <h2 className="font-display text-xl text-foreground mb-4">Registos do Dia</h2>
        <div className="space-y-3">
          {completedTrays.map(record => {
            const cfg = statusConfig[record.status];
            const cap = recipientCapacity[record.recipient];
            return (
              <motion.div
                key={record.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{record.dishName}</span>
                    <Badge className={cfg.color} variant="secondary">
                      <cfg.icon className="mr-1 h-3 w-3" /> {cfg.label}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {cap.label} · {record.weightKg}kg enviado · {formatTime(record.sentAt)} → {record.returnedAt ? formatTime(record.returnedAt) : '—'}
                  </p>
                </div>
                {record.leftoverKg !== null && (
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{record.leftoverKg}kg sobra</p>
                    {record.aproveitamentoNote && (
                      <p className="text-xs text-success">{record.aproveitamentoNote}</p>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* New Tray Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Tabuleiro para Buffet</DialogTitle>
            <DialogDescription>Registe o prato e recipiente que vai para a sala.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Prato</Label>
              <Select value={newDish} onValueChange={setNewDish}>
                <SelectTrigger><SelectValue placeholder="Selecionar prato" /></SelectTrigger>
                <SelectContent>
                  {mockFichasTecnicas.map(f => (
                    <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>
                  ))}
                  <SelectItem value="Arroz Branco">Arroz Branco</SelectItem>
                  <SelectItem value="Arroz de Pato">Arroz de Pato</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Recipiente</Label>
              <Select value={newRecipient} onValueChange={v => setNewRecipient(v as RecipientSize)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(recipientCapacity).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label} ({val.capacityKg}kg)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancelar</Button>
            <Button onClick={handleSendTray} disabled={!newDish}>Registar Saída</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={!!checkoutTarget} onOpenChange={() => setCheckoutTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recolher Tabuleiro</DialogTitle>
            <DialogDescription>
              {checkoutTarget?.dishName} — {checkoutTarget && recipientCapacity[checkoutTarget.recipient].label}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Peso da sobra (kg)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                placeholder="Ex: 1.2"
                value={leftoverKg}
                onChange={e => setLeftoverKg(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-3 block">O que fazer com a sobra?</Label>
              <RadioGroup value={leftoverAction} onValueChange={v => setLeftoverAction(v as 'aproveitamento' | 'desperdicio')}>
                <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <RadioGroupItem value="aproveitamento" id="aprov" className="mt-0.5" />
                  <Label htmlFor="aprov" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Recycle className="h-4 w-4 text-success" />
                      <span className="font-medium">Aproveitamento</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Arrefecer e reutilizar noutra preparação</p>
                  </Label>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <RadioGroupItem value="desperdicio" id="desp" className="mt-0.5" />
                  <Label htmlFor="desp" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="font-medium">Desperdício</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Comida exposta que deve ser descartada</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>
            {leftoverAction === 'aproveitamento' && (
              <div>
                <Label>Para que preparação?</Label>
                <Input
                  placeholder="Ex: Recheio de rissóis, Sopa..."
                  value={aprovNote}
                  onChange={e => setAprovNote(e.target.value)}
                />
              </div>
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
