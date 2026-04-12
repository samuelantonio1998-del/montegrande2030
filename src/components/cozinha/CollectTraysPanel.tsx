import { useState } from 'react';
import { Trash2, Recycle, Package, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { recipientCapacity, type RecipientSize } from '@/lib/buffet-data';
import type { BuffetItem, BuffetTrayState, LeftoverRecord } from '@/lib/buffet-zones';

interface CollectTraysPanelProps {
  items: BuffetItem[];
  trayStates: Record<string, BuffetTrayState>;
  onCollect: (itemId: string, leftoverKg: number, action: 'aproveitamento' | 'desperdicio', note: string | null) => void;
  leftoverHistory: LeftoverRecord[];
}

export default function CollectTraysPanel({ items, trayStates, onCollect, leftoverHistory }: CollectTraysPanelProps) {
  const [collectItem, setCollectItem] = useState<BuffetItem | null>(null);
  const [leftoverKg, setLeftoverKg] = useState('');
  const [leftoverAction, setLeftoverAction] = useState<'aproveitamento' | 'desperdicio'>('desperdicio');
  const [aprovNote, setAprovNote] = useState('');

  const activeOnBuffet = items.filter(i => trayStates[i.id]?.isOnBuffet);

  const handleCollect = () => {
    if (!collectItem) return;
    onCollect(
      collectItem.id,
      parseFloat(leftoverKg) || 0,
      leftoverAction,
      leftoverAction === 'aproveitamento' ? aprovNote : null
    );
    setCollectItem(null);
    setLeftoverKg('');
    setAprovNote('');
    setLeftoverAction('desperdicio');
  };

  // Group leftover history by date for display
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayLeftovers = leftoverHistory.filter(l => l.date.slice(0, 10) === todayStr);
  const aproveitamentos = leftoverHistory.filter(l => l.action === 'aproveitamento');

  return (
    <>
      <div className="space-y-4">
        {/* Active trays to collect */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Tabuleiros Ativos ({activeOnBuffet.length})
          </h3>
          {activeOnBuffet.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum tabuleiro ativo no buffet</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {activeOnBuffet.map(item => {
                const state = trayStates[item.id];
                return (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {state.replenishments.length}x reposições · {state.totalSentKg.toFixed(1)}kg total
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => {
                        setCollectItem(item);
                        setLeftoverKg('');
                        setAprovNote('');
                        setLeftoverAction('desperdicio');
                      }}
                    >
                      Recolher
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Today's registrations */}
        {todayLeftovers.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">Registos de Hoje</h3>
            <div className="space-y-1.5">
              {todayLeftovers.map(r => (
                <div key={r.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.itemName}</p>
                    <p className="text-[11px] text-muted-foreground">{r.zone === 'entradas' ? 'Entrada' : r.zone === 'pratos_principais' ? 'Prato' : 'Sobremesa'}</p>
                  </div>
                  <div className="text-right">
                    {r.action === 'aproveitamento' ? (
                      <Badge className="bg-success/10 text-success border-0 text-[10px]"><Recycle className="h-3 w-3 mr-0.5" />{r.leftoverKg}kg</Badge>
                    ) : (
                      <Badge className="bg-destructive/10 text-destructive border-0 text-[10px]"><Trash2 className="h-3 w-3 mr-0.5" />{r.leftoverKg}kg</Badge>
                    )}
                    {r.note && <p className="text-[10px] text-muted-foreground mt-0.5">{r.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leftover history (aproveitamentos) */}
        {aproveitamentos.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <Recycle className="h-4 w-4 text-success" />
              Histórico de Aproveitamentos
            </h3>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {aproveitamentos.map(r => (
                <div key={r.id} className="flex items-center justify-between rounded-lg bg-success/5 border border-success/10 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.itemName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(r.date).toLocaleDateString('pt-PT')} · {r.leftoverKg}kg
                    </p>
                  </div>
                  {r.note && (
                    <p className="text-xs text-success max-w-[150px] text-right">{r.note}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Collect Dialog */}
      <Dialog open={!!collectItem} onOpenChange={open => !open && setCollectItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Recolher: {collectItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {collectItem && trayStates[collectItem.id] && (
              <div className="text-sm text-muted-foreground">
                {trayStates[collectItem.id].replenishments.length}x reposições · {trayStates[collectItem.id].totalSentKg.toFixed(1)}kg enviados
              </div>
            )}
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
                <Input value={aprovNote} onChange={e => setAprovNote(e.target.value)} placeholder="Ex: Recheio de rissóis amanhã" className="mt-1" />
              </div>
            )}
            <Button className="w-full" onClick={handleCollect}>Confirmar Recolha</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
