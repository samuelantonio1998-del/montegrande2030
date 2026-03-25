import { useState } from 'react';
import { ChefHat, Clock, Users, AlertTriangle, Plus, Trash2, Recycle, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { mockProductionRecords, mockProductionAlerts, recipientCapacity, type ProductionRecord, type RecipientSize } from '@/lib/buffet-data';
import { mockMesas, mockHistorical } from '@/lib/mock-data';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { LogOut } from 'lucide-react';

const dishes = ['Arroz de Pato', 'Bacalhau à Brás', 'Frango Grelhado', 'Salada Mista', 'Arroz Branco', 'Bife à Portuguesa', 'Sopa do Dia'];

export default function DashboardCozinha() {
  const { user, logout } = useAuth();
  const [records, setRecords] = useState<ProductionRecord[]>(mockProductionRecords);
  const [showNewTray, setShowNewTray] = useState(false);
  const [showCheckout, setShowCheckout] = useState<ProductionRecord | null>(null);

  // Forecast data
  const today = mockHistorical[mockHistorical.length - 1];
  const avgClients = Math.round(mockHistorical.reduce((s, d) => s + d.totalClients, 0) / mockHistorical.length);
  const currentPax = mockMesas.reduce((s, m) => s + m.adults + m.children, 0);
  const forecastPct = Math.round((currentPax / avgClients) * 100);

  const activeTrays = records.filter(r => r.status === 'no_buffet');
  const completedTrays = records.filter(r => r.status !== 'no_buffet');

  // New tray form
  const [newDish, setNewDish] = useState('');
  const [newRecipient, setNewRecipient] = useState<RecipientSize>('tabuleiro_grande');

  const handleNewTray = () => {
    if (!newDish) return;
    const cap = recipientCapacity[newRecipient];
    const record: ProductionRecord = {
      id: `p${Date.now()}`,
      dishName: newDish,
      fichaTecnicaId: '',
      recipient: newRecipient,
      weightKg: cap.capacityKg,
      sentAt: new Date().toISOString(),
      returnedAt: null,
      status: 'no_buffet',
      leftoverKg: null,
      leftoverAction: null,
      aproveitamentoNote: null,
      registeredBy: user?.name || '',
    };
    setRecords([record, ...records]);
    setShowNewTray(false);
    setNewDish('');
  };

  // Checkout form
  const [leftoverKg, setLeftoverKg] = useState('');
  const [leftoverAction, setLeftoverAction] = useState<'aproveitamento' | 'desperdicio'>('desperdicio');
  const [aprovNote, setAprovNote] = useState('');

  const handleCheckout = () => {
    if (!showCheckout) return;
    setRecords(records.map(r => r.id === showCheckout.id ? {
      ...r,
      status: leftoverAction === 'aproveitamento' ? 'aproveitado' as const : 'desperdicio' as const,
      returnedAt: new Date().toISOString(),
      leftoverKg: parseFloat(leftoverKg) || 0,
      leftoverAction: leftoverAction,
      aproveitamentoNote: leftoverAction === 'aproveitamento' ? aprovNote : null,
    } : r));
    setShowCheckout(null);
    setLeftoverKg('');
    setAprovNote('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display text-foreground">Cozinha</h1>
          <p className="text-sm text-muted-foreground">Olá, {user?.name} · Produção e Reposição</p>
        </div>
        <Button variant="ghost" size="icon" onClick={logout}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>

      {/* Forecast bar */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-display text-card-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" /> Previsão do Dia
          </h2>
          <Badge variant="secondary">{avgClients} pax previsto</Badge>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium text-foreground">{currentPax} / {avgClients} pax ({forecastPct}%)</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(forecastPct, 100)}%` }}
                transition={{ duration: 1 }}
                className={cn('h-full rounded-full', forecastPct > 80 ? 'bg-success' : forecastPct > 50 ? 'bg-warning' : 'bg-primary')}
              />
            </div>
          </div>
          <div className="text-center rounded-lg bg-muted/50 px-4 py-2">
            <Users className="mx-auto h-4 w-4 text-muted-foreground" />
            <p className="text-xl font-bold text-foreground">{currentPax}</p>
            <p className="text-[10px] text-muted-foreground">em sala</p>
          </div>
        </div>
      </motion.div>

      {/* Alerts */}
      {mockProductionAlerts.filter(a => a.priority === 'alta').length > 0 && (
        <div className="space-y-2">
          {mockProductionAlerts.filter(a => a.priority === 'alta').map(alert => (
            <motion.div key={alert.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-warning shrink-0" />
              <p className="text-sm text-foreground">{alert.message}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Active trays */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-display text-foreground flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-primary" />
            Tabuleiros no Buffet ({activeTrays.length})
          </h2>
          <Button size="sm" className="gap-1.5" onClick={() => setShowNewTray(true)}>
            <Plus className="h-4 w-4" /> Novo Tabuleiro
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {activeTrays.map((tray, i) => (
            <motion.div
              key={tray.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-primary/20 bg-primary/5 p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{tray.dishName}</h3>
                <Badge variant="outline" className="text-primary border-primary/30 text-[10px]">No buffet</Badge>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{recipientCapacity[tray.recipient].label}</span>
                <span>·</span>
                <span>{tray.weightKg}kg</span>
                <span>·</span>
                <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{new Date(tray.sentAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <Button variant="outline" size="sm" className="mt-3 w-full gap-1.5" onClick={() => { setShowCheckout(tray); setLeftoverKg(''); setAprovNote(''); setLeftoverAction('desperdicio'); }}>
                Recolher Tabuleiro
              </Button>
            </motion.div>
          ))}
          {activeTrays.length === 0 && (
            <p className="col-span-2 text-center text-sm text-muted-foreground py-8">Nenhum tabuleiro no buffet</p>
          )}
        </div>
      </div>

      {/* Completed today */}
      {completedTrays.length > 0 && (
        <div>
          <h2 className="text-lg font-display text-foreground mb-3">Registos de Hoje</h2>
          <div className="space-y-2">
            {completedTrays.map(r => (
              <div key={r.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.dishName}</p>
                  <p className="text-xs text-muted-foreground">{recipientCapacity[r.recipient].label} · {r.weightKg}kg</p>
                </div>
                <div className="text-right">
                  {r.leftoverAction === 'aproveitamento' ? (
                    <Badge className="bg-success/10 text-success border-0"><Recycle className="h-3 w-3 mr-1" />{r.leftoverKg}kg aproveitado</Badge>
                  ) : (
                    <Badge className="bg-destructive/10 text-destructive border-0"><Trash2 className="h-3 w-3 mr-1" />{r.leftoverKg}kg lixo</Badge>
                  )}
                  {r.aproveitamentoNote && <p className="text-[10px] text-muted-foreground mt-0.5">{r.aproveitamentoNote}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Tray Dialog */}
      <Dialog open={showNewTray} onOpenChange={setShowNewTray}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Enviar Tabuleiro para Buffet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={newDish} onValueChange={setNewDish}>
              <SelectTrigger><SelectValue placeholder="Selecionar prato" /></SelectTrigger>
              <SelectContent>
                {dishes.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={newRecipient} onValueChange={v => setNewRecipient(v as RecipientSize)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(recipientCapacity).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label} ({v.capacityKg}kg)</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={handleNewTray} disabled={!newDish}>
              <Plus className="h-4 w-4 mr-1.5" /> Registar Saída
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={!!showCheckout} onOpenChange={open => !open && setShowCheckout(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Recolher: {showCheckout?.dishName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Saiu às {showCheckout && new Date(showCheckout.sentAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} · {showCheckout && recipientCapacity[showCheckout.recipient].label} ({showCheckout?.weightKg}kg)
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Peso da sobra (kg)</label>
              <Input type="number" step="0.1" min="0" value={leftoverKg} onChange={e => setLeftoverKg(e.target.value)} placeholder="Ex: 0.5" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Destino da sobra</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setLeftoverAction('aproveitamento')}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 transition-all',
                    leftoverAction === 'aproveitamento' ? 'border-success bg-success/10' : 'border-border hover:border-success/50'
                  )}
                >
                  <Recycle className={cn('h-6 w-6', leftoverAction === 'aproveitamento' ? 'text-success' : 'text-muted-foreground')} />
                  <span className="text-sm font-medium text-foreground">Aproveitamento</span>
                  <span className="text-[10px] text-muted-foreground">Reutilizar</span>
                </button>
                <button
                  onClick={() => setLeftoverAction('desperdicio')}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 transition-all',
                    leftoverAction === 'desperdicio' ? 'border-destructive bg-destructive/10' : 'border-border hover:border-destructive/50'
                  )}
                >
                  <Trash2 className={cn('h-6 w-6', leftoverAction === 'desperdicio' ? 'text-destructive' : 'text-muted-foreground')} />
                  <span className="text-sm font-medium text-foreground">Desperdício</span>
                  <span className="text-[10px] text-muted-foreground">Lixo</span>
                </button>
              </div>
            </div>
            {leftoverAction === 'aproveitamento' && (
              <div>
                <label className="text-sm font-medium text-foreground">Nota de aproveitamento</label>
                <Input value={aprovNote} onChange={e => setAprovNote(e.target.value)} placeholder="Ex: Recheio de rissóis" className="mt-1" />
              </div>
            )}
            <Button className="w-full" onClick={handleCheckout}>Confirmar Recolha</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
