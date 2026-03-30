import { useState } from 'react';
import { Plus, RotateCcw, ChevronDown, ChevronUp, Clock, TrendingDown, Scale, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { recipientCapacity, type RecipientSize } from '@/lib/buffet-data';
import type { EmentaItem } from '@/hooks/useEmentaDiaria';
import type { BuffetTrayState, ReplenishmentLog } from '@/lib/buffet-zones';

interface EmentaZonePanelProps {
  ementaItems: EmentaItem[];
  trayStates: Record<string, BuffetTrayState>;
  onReplenish: (itemId: string, recipient: RecipientSize, weightKg: number) => void;
  userName: string;
}

function MiniBarChart({ data, label, color }: { data: number[]; label: string; color: string }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 0.1);
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
      <div className="flex items-end gap-0.5 h-8">
        {data.slice(-8).map((v, i) => (
          <div
            key={i}
            className={cn('rounded-sm w-3 min-h-[2px]', color)}
            style={{ height: `${(v / max) * 100}%` }}
            title={`${v.toFixed(1)}kg`}
          />
        ))}
      </div>
    </div>
  );
}

export default function EmentaZonePanel({ ementaItems, trayStates, onReplenish, userName }: EmentaZonePanelProps) {
  const [replenishItem, setReplenishItem] = useState<EmentaItem | null>(null);
  const [recipient, setRecipient] = useState<RecipientSize>('couvete_media');
  const [customWeight, setCustomWeight] = useState('');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const handleReplenish = () => {
    if (!replenishItem) return;
    const cap = recipientCapacity[recipient];
    const weight = customWeight ? parseFloat(customWeight) : cap.capacityKg;
    onReplenish(replenishItem.buffet_item_id, recipient, weight);
    setReplenishItem(null);
    setCustomWeight('');
  };

  if (ementaItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Nenhum prato definido para esta zona hoje.</p>
        <p className="text-xs mt-1">A gerência pode programar a ementa ou pode adicionar pratos manualmente.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {ementaItems.map((ementa, i) => {
          const item = ementa.buffet_item;
          if (!item) return null;
          const state = trayStates[item.id];
          const repCount = state?.replenishments.length || 0;
          const totalKg = state?.totalSentKg || 0;
          const isOnBuffet = state?.isOnBuffet || false;
          const isExpanded = expandedItem === item.id;
          const suggestedRecip = recipientCapacity[ementa.recipiente_sugerido as RecipientSize];

          return (
            <motion.div
              key={ementa.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={cn(
                'rounded-lg border p-3 transition-colors',
                isOnBuffet ? 'border-primary/20 bg-primary/5' : 'border-border bg-card'
              )}
            >
              {/* Main row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button
                    onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{item.nome}</p>
                      {isOnBuffet && (
                        <Badge variant="outline" className="text-primary border-primary/30 text-[10px] shrink-0">Ativo</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-0.5">
                        <Scale className="h-3 w-3" />
                        {ementa.quantidade_prevista}kg previsto
                      </span>
                      {suggestedRecip && (
                        <>
                          <span>·</span>
                          <span>{suggestedRecip.label}</span>
                        </>
                      )}
                      {repCount > 0 && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <RotateCcw className="h-3 w-3" /> {repCount}x ({totalKg.toFixed(1)}kg)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-xs shrink-0"
                  onClick={() => {
                    setReplenishItem(ementa);
                    setRecipient((ementa.recipiente_sugerido as RecipientSize) || 'couvete_media');
                    setCustomWeight('');
                  }}
                >
                  <Plus className="h-3 w-3" /> Repor
                </Button>
              </div>

              {/* Expanded: predictions + history */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 pt-3 border-t border-border space-y-3">
                      {/* Prediction charts */}
                      <div className="grid grid-cols-2 gap-4">
                        <MiniBarChart
                          data={ementa.historico_consumo_kg}
                          label="Consumo (últimos dias iguais)"
                          color="bg-primary"
                        />
                        <MiniBarChart
                          data={ementa.historico_sobra_kg}
                          label="Sobras (últimos dias iguais)"
                          color="bg-warning"
                        />
                      </div>

                      {/* Prediction note */}
                      {ementa.notas && (
                        <div className="flex items-start gap-1.5 text-[11px] bg-muted/50 rounded-md px-2 py-1.5">
                          <TrendingDown className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                          <span className="text-muted-foreground">{ementa.notas}</span>
                        </div>
                      )}

                      {/* Replenishment history */}
                      {state && state.replenishments.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground font-medium">Reposições hoje</p>
                          {state.replenishments.map((rep) => (
                            <div key={rep.id} className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(rep.timestamp).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span>{recipientCapacity[rep.recipient as RecipientSize]?.label || rep.recipient}</span>
                              <span>{rep.weightKg}kg</span>
                              <span>{rep.registeredBy}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Replenish Dialog */}
      <Dialog open={!!replenishItem} onOpenChange={open => !open && setReplenishItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Repor: {replenishItem?.buffet_item?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Suggested info */}
            {replenishItem && (
              <div className="rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
                <p>Previsão: <strong className="text-foreground">{replenishItem.quantidade_prevista}kg</strong></p>
                <p>Recipiente sugerido: <strong className="text-foreground">{recipientCapacity[replenishItem.recipiente_sugerido as RecipientSize]?.label}</strong></p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Recipiente</label>
              <Select value={recipient} onValueChange={v => setRecipient(v as RecipientSize)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(recipientCapacity).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label} ({v.capacityKg}kg)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Peso (kg) <span className="text-muted-foreground font-normal">— vazio = capacidade padrão</span>
              </label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={customWeight}
                onChange={e => setCustomWeight(e.target.value)}
                placeholder={`${recipientCapacity[recipient].capacityKg}kg`}
              />
            </div>
            <Button className="w-full" onClick={handleReplenish}>
              <Plus className="h-4 w-4 mr-1.5" /> Confirmar Reposição
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
