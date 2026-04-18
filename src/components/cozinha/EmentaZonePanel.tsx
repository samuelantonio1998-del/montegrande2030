import { useState } from 'react';
import { Plus, RotateCcw, Clock, Scale, UtensilsCrossed, ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { recipientCapacity, type RecipientSize } from '@/lib/buffet-data';
import type { EmentaItem } from '@/hooks/useEmentaDiaria';
import type { BuffetTrayState } from '@/lib/buffet-zones';
import { useFichasTecnicas, type FichaComIngredientes } from '@/hooks/useFichasTecnicas';
import { FichaDetailDialog } from '@/components/fichas/FichaDetailDialog';

interface EmentaZonePanelProps {
  ementaItems: EmentaItem[];
  trayStates: Record<string, BuffetTrayState>;
  onReplenish: (itemId: string, recipient: RecipientSize, weightKg: number) => void;
  userName: string;
}

export default function EmentaZonePanel({ ementaItems, trayStates, onReplenish, userName }: EmentaZonePanelProps) {
  const [replenishItem, setReplenishItem] = useState<EmentaItem | null>(null);
  const [recipient, setRecipient] = useState<RecipientSize>('couvete_media');
  const [customWeight, setCustomWeight] = useState('');
  const [selectedFicha, setSelectedFicha] = useState<FichaComIngredientes | null>(null);

  const { data: fichas = [] } = useFichasTecnicas();

  const handleReplenish = () => {
    if (!replenishItem) return;
    const cap = recipientCapacity[recipient];
    const weight = customWeight ? parseFloat(customWeight) : cap.capacityKg;
    onReplenish(replenishItem.buffet_item_id, recipient, weight);
    setReplenishItem(null);
    setCustomWeight('');
  };

  const normalizeDishName = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const getFichaForItem = (fichaTecnicaId: string | null | undefined, itemName: string): FichaComIngredientes | undefined => {
    if (fichaTecnicaId) {
      const linkedFicha = fichas.find(f => f.id === fichaTecnicaId);
      if (linkedFicha) return linkedFicha;
    }

    const normalizedItemName = normalizeDishName(itemName);
    return fichas.find(f => normalizeDishName(f.nome) === normalizedItemName);
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {ementaItems.map((ementa, i) => {
          const item = ementa.buffet_item;
          if (!item) return null;
          const state = trayStates[item.id];
          const repCount = state?.replenishments.length || 0;
          const totalKg = state?.totalSentKg || 0;
          const isOnBuffet = state?.isOnBuffet || false;
          const ficha = getFichaForItem(item.ficha_tecnica_id, item.nome);
          const fotoUrl = ficha?.foto_url
            ? `${ficha.foto_url}?v=${new Date(ficha.updated_at).getTime()}`
            : null;

          return (
            <motion.div
              key={ementa.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              className={cn(
                'rounded-xl border overflow-hidden transition-all group cursor-pointer',
                isOnBuffet ? 'border-primary/30 shadow-sm' : 'border-border',
                'hover:shadow-md hover:border-primary/20'
              )}
              onClick={() => {
                if (ficha) setSelectedFicha(ficha);
              }}
            >
              {/* Image area */}
              <div className="relative aspect-[4/3] bg-muted/30 overflow-hidden">
                {fotoUrl ? (
                  <img
                    src={fotoUrl}
                    alt={item.nome}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UtensilsCrossed className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}

                {/* Status badge overlay */}
                {isOnBuffet && (
                  <Badge className="absolute top-1.5 left-1.5 text-[9px] bg-primary/90 text-primary-foreground">
                    Ativo
                  </Badge>
                )}

                {/* Replenishment count overlay */}
                {repCount > 0 && (
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-card/90 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                    <RotateCcw className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="text-[9px] font-medium text-foreground">{repCount}x</span>
                  </div>
                )}

                {/* Replenish button overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Button
                    size="sm"
                    className="h-7 text-[11px] gap-1 shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReplenishItem(ementa);
                      setRecipient((ementa.recipiente_sugerido as RecipientSize) || 'couvete_media');
                      setCustomWeight('');
                    }}
                  >
                    <Plus className="h-3 w-3" /> Repor
                  </Button>
                </div>
              </div>

              {/* Card body */}
              <div className="p-2.5">
                <p className="text-xs font-medium text-foreground truncate leading-tight">{item.nome}</p>
                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                  <Scale className="h-2.5 w-2.5 shrink-0" />
                  <span>{ementa.quantidade_prevista}kg</span>
                  {repCount > 0 && (
                    <>
                      <span>·</span>
                      <span>{totalKg.toFixed(1)}kg enviado</span>
                    </>
                  )}
                </div>
                {ficha && (
                  <p className="text-[10px] text-primary/70 mt-0.5 truncate">
                    €{ficha.preco_venda.toFixed(2)}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Ficha Técnica Detail */}
      <FichaDetailDialog ficha={selectedFicha} onClose={() => setSelectedFicha(null)} />

      {/* Replenish Dialog */}
      <Dialog open={!!replenishItem} onOpenChange={open => !open && setReplenishItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Repor: {replenishItem?.buffet_item?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
