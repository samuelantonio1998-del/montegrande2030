import { useState, useMemo } from 'react';
import { Check, Plus, Search, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

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
  onConfirm: (items: { buffet_item_id: string; quantidade_prevista: number; recipiente_sugerido: string }[], dates: Date[]) => void;
  date: Date;
  userName?: string;
}

const ZONE_LIMITS: Record<string, { label: string; max: number }> = {
  entradas: { label: 'Entradas', max: 25 },
  pratos_principais: { label: 'Pratos Quentes', max: 6 },
  sobremesas: { label: 'Sobremesas', max: 10 },
};

type Step = 'items' | 'dates';

export default function EmentaSetupDialog({ open, onOpenChange, allItems, existingItemIds, onConfirm, date: initialDate, userName }: EmentaSetupDialogProps) {
  const [step, setStep] = useState<Step>('items');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('entradas');
  const [calendarMonth, setCalendarMonth] = useState<Date>(initialDate);

  const filteredItems = useMemo(() => {
    return allItems
      .filter(i => i.zona === tab && i.ativo)
      .filter(i => !search || i.nome.toLowerCase().includes(search.toLowerCase()));
  }, [allItems, tab, search]);

  const selectedByZone = (zona: string) => {
    return allItems.filter(i => i.zona === zona && selected.has(i.id)).length;
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

  const toggleDate = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDates(prev => {
      const exists = prev.find(d => format(d, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
      if (exists) {
        return prev.filter(d => format(d, 'yyyy-MM-dd') !== format(date, 'yyyy-MM-dd'));
      }
      return [...prev, date];
    });
  };

  const handleConfirm = () => {
    if (selectedDates.length === 0 || selected.size === 0) return;
    const items = Array.from(selected).map(id => ({
      buffet_item_id: id,
      quantidade_prevista: 3,
      recipiente_sugerido: 'couvete_media',
    }));
    onConfirm(items, selectedDates);
    resetState();
    onOpenChange(false);
  };

  const resetState = () => {
    setSelected(new Set());
    setSelectedDates([]);
    setStep('items');
    setSearch('');
    setTab('entradas');
  };

  const handleClose = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const totalSelected = selected.size;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'items' ? 'Definir Ementa — Selecionar Pratos' : 'Definir Ementa — Escolher Datas'}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs mb-1">
          <div className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium transition-colors',
            step === 'items' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
          )}>
            <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">1</span>
            Pratos
          </div>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <div className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium transition-colors',
            step === 'dates' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
          )}>
            <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">2</span>
            Datas
          </div>
        </div>

        {step === 'items' ? (
          <>
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
              <p className="text-xs text-muted-foreground">{totalSelected} artigos selecionados</p>
              <Button onClick={() => setStep('dates')} disabled={totalSelected === 0} className="gap-1.5">
                <CalendarDays className="h-4 w-4" /> Escolher Datas
              </Button>
            </div>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" className="self-start gap-1 text-xs -mt-1 mb-1" onClick={() => setStep('items')}>
              <ChevronLeft className="h-3.5 w-3.5" /> Voltar aos pratos
            </Button>

            {/* Summary of selected items */}
            <div className="rounded-lg bg-muted/50 border border-border px-3 py-2 text-xs text-foreground space-y-0.5">
              <p className="font-medium">{totalSelected} pratos selecionados:</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {Object.entries(ZONE_LIMITS).map(([key, z]) => {
                  const count = selectedByZone(key);
                  if (count === 0) return null;
                  return (
                    <Badge key={key} variant="secondary" className="text-[10px]">
                      {z.label}: {count}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Selecione os dias para aplicar esta ementa
              </p>
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={(dates) => setSelectedDates(dates || [])}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                locale={pt}
                className="rounded-md border border-border"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {selectedDates.length === 0
                  ? 'Nenhum dia selecionado'
                  : `${selectedDates.length} dia${selectedDates.length > 1 ? 's' : ''} selecionado${selectedDates.length > 1 ? 's' : ''}`}
              </p>
              <Button onClick={handleConfirm} disabled={selectedDates.length === 0} className="gap-1.5">
                <Plus className="h-4 w-4" /> Aplicar Ementa
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
