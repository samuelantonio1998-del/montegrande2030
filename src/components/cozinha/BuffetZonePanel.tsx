import { useState } from 'react';
import { Clock, Plus, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { recipientCapacity, type RecipientSize } from '@/lib/buffet-data';
import type { BuffetItem, BuffetTrayState, ReplenishmentLog } from '@/lib/buffet-zones';

interface BuffetZonePanelProps {
  items: BuffetItem[];
  trayStates: Record<string, BuffetTrayState>;
  onReplenish: (itemId: string, recipient: RecipientSize, weightKg: number) => void;
  onCollect: (itemId: string) => void;
  userName: string;
}

export default function BuffetZonePanel({ items, trayStates, onReplenish, onCollect, userName }: BuffetZonePanelProps) {
  const [replenishItem, setReplenishItem] = useState<BuffetItem | null>(null);
  const [recipient, setRecipient] = useState<RecipientSize>('couvete_media');
  const [customWeight, setCustomWeight] = useState('');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const activeItems = items.filter(i => i.active);

  const handleReplenish = () => {
    if (!replenishItem) return;
    const cap = recipientCapacity[recipient];
    const weight = customWeight ? parseFloat(customWeight) : cap.capacityKg;
    onReplenish(replenishItem.id, recipient, weight);
    setReplenishItem(null);
    setCustomWeight('');
  };

  return (
    <>
      <div className="space-y-2">
        {activeItems.map((item, i) => {
          const state = trayStates[item.id];
          const repCount = state?.replenishments.length || 0;
          const totalKg = state?.totalSentKg || 0;
          const isOnBuffet = state?.isOnBuffet || false;
          const isExpanded = expandedItem === item.id;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={cn(
                'rounded-lg border p-3 transition-colors',
                isOnBuffet ? 'border-primary/20 bg-primary/5' : 'border-border bg-card'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button
                    onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      {repCount > 0 && (
                        <>
                          <span className="flex items-center gap-0.5">
                            <RotateCcw className="h-3 w-3" /> {repCount}x
                          </span>
                          <span>·</span>
                          <span>{totalKg.toFixed(1)}kg total</span>
                        </>
                      )}
                      {state?.currentRecipient && (
                        <>
                          <span>·</span>
                          <span>{recipientCapacity[state.currentRecipient as RecipientSize]?.label}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isOnBuffet && (
                    <Badge variant="outline" className="text-primary border-primary/30 text-[10px]">
                      Ativo
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 text-xs"
                    onClick={() => {
                      setReplenishItem(item);
                      setCustomWeight('');
                    }}
                  >
                    <Plus className="h-3 w-3" /> Repor
                  </Button>
                </div>
              </div>

              {/* Expanded: replenishment history */}
              <AnimatePresence>
                {isExpanded && state && state.replenishments.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 pt-2 border-t border-border space-y-1">
                      {state.replenishments.map((rep, idx) => (
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
            <DialogTitle>Repor: {replenishItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
                Peso (kg) <span className="text-muted-foreground font-normal">— deixe vazio para capacidade padrão</span>
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
