import { useState, useMemo } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { recipientCapacity, type RecipientSize } from '@/lib/buffet-data';
import { format } from 'date-fns';

type BuffetItemRow = {
  id: string;
  nome: string;
  zona: string;
  ativo: boolean;
};

interface EmentaSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allItems: BuffetItemRow[];
  existingItemIds: Set<string>;
  onConfirm: (items: { buffet_item_id: string; quantidade_prevista: number; recipiente_sugerido: string }[]) => void;
  date: Date;
}

const ZONE_LIMITS: Record<string, { label: string; max: number }> = {
  entradas: { label: 'Entradas', max: 25 },
  pratos_principais: { label: 'Pratos Quentes', max: 6 },
  sobremesas: { label: 'Sobremesas', max: 10 },
};

export default function EmentaSetupDialog({ open, onOpenChange, allItems, existingItemIds, onConfirm, date }: EmentaSetupDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('entradas');

  const filteredItems = useMemo(() => {
    return allItems
      .filter(i => i.zona === tab && i.ativo && !existingItemIds.has(i.id))
      .filter(i => !search || i.nome.toLowerCase().includes(search.toLowerCase()));
  }, [allItems, tab, search, existingItemIds]);

  const selectedByZone = (zona: string) => {
    return allItems.filter(i => i.zona === zona && (selected.has(i.id) || existingItemIds.has(i.id))).length;
  };

  const toggleItem = (id: string) => {
    const item = allItems.find(i => i.id === id);
    if (!item) return;
    const zone = ZONE_LIMITS[item.zona];
    const currentCount = selectedByZone(item.zona);

    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (!zone || currentCount < zone.max) {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const items = Array.from(selected).map(id => ({
      buffet_item_id: id,
      quantidade_prevista: 3,
      recipiente_sugerido: 'couvete_media',
    }));
    onConfirm(items);
    setSelected(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Definir Ementa — {format(date, 'dd/MM/yyyy')}</DialogTitle>
        </DialogHeader>

        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar artigo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 min-h-0">
          <TabsList className="grid grid-cols-3 w-full">
            {Object.entries(ZONE_LIMITS).map(([key, z]) => (
              <TabsTrigger key={key} value={key} className="text-xs">
                {z.label}
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
                  {selectedByZone(key)}/{z.max}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.keys(ZONE_LIMITS).map(zone => (
            <TabsContent key={zone} value={zone} className="overflow-y-auto max-h-[40vh] space-y-1 mt-2">
              {filteredItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={cn(
                    'w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors text-left',
                    selected.has(item.id)
                      ? 'bg-primary/10 border border-primary/30 text-foreground'
                      : 'bg-card border border-border text-foreground hover:bg-muted/50'
                  )}
                >
                  <span>{item.nome}</span>
                  {selected.has(item.id) && <Check className="h-4 w-4 text-primary" />}
                </button>
              ))}
              {filteredItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum artigo disponível</p>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">{selected.size} artigos selecionados</p>
          <Button onClick={handleConfirm} disabled={selected.size === 0} className="gap-1.5">
            <Plus className="h-4 w-4" /> Adicionar à Ementa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
