import { useState, useMemo } from 'react';
import { Check, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useEmentaDiaria, useBulkAddEmenta } from '@/hooks/useEmentaDiaria';

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
  onConfirm: (items: { buffet_item_id: string; quantidade_prevista: number; recipiente_sugerido: string }[], date: Date) => void;
  date: Date;
  userName?: string;
}

const ZONE_LIMITS: Record<string, { label: string; max: number }> = {
  entradas: { label: 'Entradas', max: 25 },
  pratos_principais: { label: 'Pratos Quentes', max: 6 },
  sobremesas: { label: 'Sobremesas', max: 10 },
};

type ViewMode = 'calendar' | 'items';

export default function EmentaSetupDialog({ open, onOpenChange, allItems, existingItemIds: _existingItemIds, onConfirm, date: initialDate, userName }: EmentaSetupDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('entradas');
  const [calendarMonth, setCalendarMonth] = useState<Date>(initialDate);

  // Fetch ementa for the selected date
  const { data: selectedDateEmenta = [] } = useEmentaDiaria(selectedDate);
  const bulkAdd = useBulkAddEmenta();

  const existingItemIdsForDate = useMemo(
    () => new Set(selectedDateEmenta.map(e => e.buffet_item_id)),
    [selectedDateEmenta]
  );

  const filteredItems = useMemo(() => {
    return allItems
      .filter(i => i.zona === tab && i.ativo && !existingItemIdsForDate.has(i.id))
      .filter(i => !search || i.nome.toLowerCase().includes(search.toLowerCase()));
  }, [allItems, tab, search, existingItemIdsForDate]);

  const selectedByZone = (zona: string) => {
    return allItems.filter(i => i.zona === zona && (selected.has(i.id) || existingItemIdsForDate.has(i.id))).length;
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
    onConfirm(items, selectedDate);
    setSelected(new Set());
    setViewMode('calendar');
  };

  const handleSelectDate = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    setSelected(new Set());
    setSearch('');
    setTab('entradas');
    setViewMode('items');
  };

  const handleBack = () => {
    setViewMode('calendar');
    setSelected(new Set());
  };

  // Count items per day for calendar badges
  const ementaCountForDate = selectedDateEmenta.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {viewMode === 'calendar' ? 'Definir Ementa' : `Ementa — ${format(selectedDate, 'dd/MM/yyyy')}`}
          </DialogTitle>
        </DialogHeader>

        {viewMode === 'calendar' ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Selecione um dia para definir ou editar a ementa
            </p>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleSelectDate}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              locale={pt}
              className="rounded-md border border-border"
            />
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span>Hoje</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-success" />
                <span>Ementa definida</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <Button variant="ghost" size="sm" className="self-start gap-1 text-xs -mt-1 mb-1" onClick={handleBack}>
              <ChevronLeft className="h-3.5 w-3.5" /> Voltar ao calendário
            </Button>

            {/* Existing items count */}
            {existingItemIdsForDate.size > 0 && (
              <div className="rounded-lg bg-success/10 border border-success/20 px-3 py-2 text-xs text-foreground">
                ✓ {existingItemIdsForDate.size} pratos já definidos para este dia
              </div>
            )}

            <div className="relative mb-1">
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
                <TabsContent key={zone} value={zone} className="overflow-y-auto max-h-[35vh] space-y-1 mt-2">
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
