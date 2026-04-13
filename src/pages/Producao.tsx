import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Clock, ArrowRight, Recycle, Trash2, AlertTriangle, ChefHat, RefreshCw, Users, TrendingUp, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { recipientCapacity, type RecipientSize, type TrayStatus } from '@/lib/buffet-data';
import { useRegistosProducao, type RegistoProducao } from '@/hooks/useRegistosProducao';
import { useEmentaDiaria } from '@/hooks/useEmentaDiaria';
import { useAuth } from '@/contexts/AuthContext';
import { useProductionIntelligence } from '@/hooks/useProductionIntelligence';

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  no_buffet: { label: 'No Buffet', color: 'bg-primary/10 text-primary', icon: Clock },
  recolhido: { label: 'Recolhido', color: 'bg-muted text-muted-foreground', icon: ArrowRight },
  aproveitado: { label: 'Aproveitado', color: 'bg-success/10 text-success', icon: Recycle },
  desperdicio: { label: 'Desperdício', color: 'bg-destructive/10 text-destructive', icon: Trash2 },
};

export default function Producao() {
  const { user } = useAuth();
  const { registos, addRegisto, recolherRegisto, activeTrays, completedTrays, wasteSummary } = useRegistosProducao();
  const { currentPax, occupiedTables, getSuggestion } = useProductionIntelligence();
  const today = new Date();
  const { data: ementaItems = [] } = useEmentaDiaria(today);

  const [activeTab, setActiveTab] = useState<'buffet' | 'take_away'>('buffet');

  // Filter trays by canal
  const filteredActiveTrays = useMemo(() => activeTrays.filter(r => (r.canal || 'buffet') === activeTab), [activeTrays, activeTab]);
  const filteredCompletedTrays = useMemo(() => completedTrays.filter(r => (r.canal || 'buffet') === activeTab), [completedTrays, activeTab]);

  const buffetActiveCount = useMemo(() => activeTrays.filter(r => (r.canal || 'buffet') === 'buffet').length, [activeTrays]);
  const takeawayActiveCount = useMemo(() => activeTrays.filter(r => (r.canal || 'buffet') === 'take_away').length, [activeTrays]);

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
    ficha_tecnica_id: e.buffet_item!.ficha_tecnica_id || null,
  })), [ementaItems]);

  const [showNewDialog, setShowNewDialog] = useState(false);
  const [checkoutTarget, setCheckoutTarget] = useState<RegistoProducao | null>(null);
  const [newDish, setNewDish] = useState('');
  const [newRecipient, setNewRecipient] = useState<RecipientSize>('tabuleiro_grande');
  const [newTakeawayKg, setNewTakeawayKg] = useState('');
  const [leftoverKg, setLeftoverKg] = useState('');
  const [leftoverAction, setLeftoverAction] = useState<'aproveitamento' | 'desperdicio'>('aproveitamento');
  const [isReporBuffet, setIsReporBuffet] = useState(false);
  const [aprovNote, setAprovNote] = useState('');

  async function handleSendTray() {
    if (!newDish) return;
    const dish = allEmentaDishes.find(d => d.nome === newDish);

    if (activeTab === 'take_away') {
      const kg = parseFloat(newTakeawayKg) || 0;
      if (kg <= 0) return;
      await addRegisto({
        dish_name: newDish,
        ficha_tecnica_id: dish?.id,
        buffet_item_id: dish?.id,
        recipiente: 'unitario',
        peso_kg: kg,
        registado_por: user?.name || 'Gerente',
        canal: 'take_away',
      });
    } else {
      const cap = recipientCapacity[newRecipient];
      await addRegisto({
        dish_name: newDish,
        ficha_tecnica_id: dish?.id,
        buffet_item_id: dish?.id,
        recipiente: newRecipient,
        peso_kg: cap.capacityKg,
        registado_por: user?.name || 'Gerente',
        canal: 'buffet',
      });
    }

    setShowNewDialog(false);
    setNewDish('');
    setNewRecipient('tabuleiro_grande');
    setNewTakeawayKg('');
  }

  async function handleCheckout() {
    if (!checkoutTarget) return;
    const kg = parseFloat(leftoverKg) || 0;
    const note = leftoverAction === 'aproveitamento'
      ? (isReporBuffet ? `Repor no buffet${aprovNote ? ' — ' + aprovNote : ''}` : aprovNote)
      : null;
    await recolherRegisto(checkoutTarget.id, kg, leftoverAction, note);
    setCheckoutTarget(null);
    setLeftoverKg('');
    setLeftoverAction('aproveitamento');
    setIsReporBuffet(false);
    setAprovNote('');
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  }

  const waste = wasteSummary();
  const alerts = waste.filter(w => w.wastePercentage > 15).map(w => ({
    id: w.dishName,
    message: `${w.dishName} tem ${w.wastePercentage.toFixed(0)}% de desperdício. Considerar recipiente mais pequeno.`,
    priority: w.wastePercentage > 20 ? 'alta' as const : 'media' as const,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl text-foreground">Produção</h1>
          <p className="mt-1 text-muted-foreground">Registo de produção — Buffet e Take Away</p>
        </div>
        <div className="flex items-center gap-3">
          {currentPax > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2">
              <Users className="h-4 w-4 text-primary" />
              <div className="text-right">
                <p className="text-lg font-bold text-primary leading-none">{currentPax}</p>
                <p className="text-[10px] text-muted-foreground">{occupiedTables} mesa{occupiedTables !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )}
          <Button onClick={() => setShowNewDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {activeTab === 'buffet' ? 'Enviar Tabuleiro' : 'Registar Take Away'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'buffet' | 'take_away')}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="buffet" className="gap-2">
            <ChefHat className="h-4 w-4" />
            Buffet
            {buffetActiveCount > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{buffetActiveCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="take_away" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            Take Away
            {takeawayActiveCount > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{takeawayActiveCount}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buffet" className="space-y-8 mt-6">
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

          <ActiveTraysSection
            trays={filteredActiveTrays}
            formatTime={formatTime}
            onCheckout={setCheckoutTarget}
            label="Tabuleiros no Buffet"
            emptyLabel="Nenhum tabuleiro no buffet"
            icon={<ChefHat className="h-5 w-5 text-primary" />}
          />

          <CompletedTraysSection records={filteredCompletedTrays} formatTime={formatTime} />
        </TabsContent>

        <TabsContent value="take_away" className="space-y-8 mt-6">
          <ActiveTraysSection
            trays={filteredActiveTrays}
            formatTime={formatTime}
            onCheckout={setCheckoutTarget}
            label="Pedidos Take Away Ativos"
            emptyLabel="Nenhum pedido take away pendente"
            icon={<ShoppingBag className="h-5 w-5 text-primary" />}
            isTakeaway
          />

          <CompletedTraysSection records={filteredCompletedTrays} formatTime={formatTime} isTakeaway />
        </TabsContent>
      </Tabs>

      {/* Send Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeTab === 'buffet' ? 'Enviar Tabuleiro para Buffet' : 'Registar Saída Take Away'}</DialogTitle>
            <DialogDescription>
              {activeTab === 'buffet' ? 'Registe o prato e recipiente que vai para a sala.' : 'Registe o prato e peso para take away.'}
            </DialogDescription>
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

            {activeTab === 'buffet' ? (
              <div>
                <Label>Recipiente</Label>
                <Select value={newRecipient} onValueChange={v => setNewRecipient(v as RecipientSize)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(recipientCapacity).map(([key, val]) => <SelectItem key={key} value={key}>{val.label} ({val.capacityKg}kg)</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>Peso (kg)</Label>
                <Input type="number" step="0.1" min="0.1" placeholder="Ex: 0.5" value={newTakeawayKg} onChange={e => setNewTakeawayKg(e.target.value)} />
              </div>
            )}

            {/* Production intelligence suggestion (buffet only) */}
            {activeTab === 'buffet' && newDish && (() => {
              const suggestion = getSuggestion(newDish);
              if (!suggestion) return null;
              const alreadySentToday = filteredActiveTrays
                .filter(r => r.dish_name === newDish)
                .reduce((s, r) => s + r.peso_kg, 0);
              const remaining = Math.max(0, suggestion.suggestedKg - alreadySentToday);
              return (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Sugestão IA</span>
                  </div>
                  <p className="text-sm text-foreground">
                    Para <strong>{currentPax} clientes</strong> em sala, o histórico sugere <strong>{suggestion.suggestedKg.toFixed(1)}kg</strong> de {newDish}.
                  </p>
                  {alreadySentToday > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Já enviados hoje: {alreadySentToday.toFixed(1)}kg · Falta: ~{remaining.toFixed(1)}kg
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Baseado em {suggestion.basedOnDays} dias · ~{(suggestion.avgKgPerPax * 1000).toFixed(0)}g/cliente
                  </p>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancelar</Button>
            <Button onClick={handleSendTray} disabled={!newDish || (activeTab === 'take_away' && !(parseFloat(newTakeawayKg) > 0))}>
              {activeTab === 'buffet' ? 'Registar Saída' : 'Registar Take Away'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={!!checkoutTarget} onOpenChange={() => setCheckoutTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{(checkoutTarget?.canal || 'buffet') === 'take_away' ? 'Finalizar Take Away' : 'Recolher Tabuleiro'}</DialogTitle>
            <DialogDescription>{checkoutTarget?.dish_name} — {checkoutTarget && (recipientCapacity[checkoutTarget.recipiente as RecipientSize]?.label || checkoutTarget.recipiente)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Peso da sobra (kg)</Label><Input type="number" step="0.1" min="0" placeholder="Ex: 1.2" value={leftoverKg} onChange={e => setLeftoverKg(e.target.value)} /></div>
            <div>
              <Label className="mb-3 block">O que fazer com a sobra?</Label>
              <RadioGroup value={leftoverAction} onValueChange={v => { setLeftoverAction(v as 'aproveitamento' | 'desperdicio'); if (v === 'desperdicio') setIsReporBuffet(false); }}>
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
              <div className="space-y-3">
                {(checkoutTarget?.canal || 'buffet') === 'buffet' && (
                  <button
                    type="button"
                    onClick={() => setIsReporBuffet(!isReporBuffet)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border-2 p-3 transition-all text-left',
                      isReporBuffet ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                    )}
                  >
                    <RefreshCw className={cn('h-5 w-5', isReporBuffet ? 'text-primary' : 'text-muted-foreground')} />
                    <div>
                      <span className={cn('text-sm font-medium', isReporBuffet ? 'text-primary' : 'text-foreground')}>Repor no buffet</span>
                      <p className="text-[11px] text-muted-foreground">Guardar e servir novamente amanhã (ex: saladas, sobremesas)</p>
                    </div>
                  </button>
                )}
                <div>
                  <Label>{isReporBuffet ? 'Nota adicional (opcional)' : 'Para que preparação?'}</Label>
                  <Input placeholder={isReporBuffet ? 'Ex: Guardar no frio até amanhã' : 'Ex: Recheio de rissóis, Sopa...'} value={aprovNote} onChange={e => setAprovNote(e.target.value)} />
                </div>
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

// === Sub-components ===

function ActiveTraysSection({ trays, formatTime, onCheckout, label, emptyLabel, icon, isTakeaway }: {
  trays: RegistoProducao[];
  formatTime: (iso: string) => string;
  onCheckout: (r: RegistoProducao) => void;
  label: string;
  emptyLabel: string;
  icon: React.ReactNode;
  isTakeaway?: boolean;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, RegistoProducao[]>();
    trays.forEach(r => {
      const list = map.get(r.dish_name) || [];
      list.push(r);
      map.set(r.dish_name, list);
    });
    return map;
  }, [trays]);

  return (
    <div>
      <h2 className="font-display text-xl text-foreground mb-4 flex items-center gap-2">
        {icon} {label} ({trays.length})
      </h2>
      {trays.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">{emptyLabel}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {Array.from(grouped.entries()).map(([dishName, items]) => {
              const totalKg = items.reduce((s, t) => s + t.peso_kg, 0);
              const latestTray = items[0];
              return (
                <motion.div key={dishName} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="rounded-xl border border-primary/20 bg-card p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{dishName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {isTakeaway
                          ? `${items.length} pedido${items.length > 1 ? 's' : ''} · ${totalKg.toFixed(1)}kg total`
                          : `${items.length} reposição${items.length > 1 ? 'ões' : ''} · ${totalKg}kg total`
                        }
                      </p>
                    </div>
                    <Badge className={isTakeaway ? 'bg-accent/10 text-accent-foreground' : statusConfig.no_buffet.color}>
                      {isTakeaway ? <><ShoppingBag className="mr-1 h-3 w-3" /> Take Away</> : <><Clock className="mr-1 h-3 w-3" /> No Buffet</>}
                    </Badge>
                  </div>
                  {items.length > 1 && (
                    <div className="mt-3 space-y-1 border-t border-border pt-2">
                      {items.slice(1).map(record => {
                        const cap = recipientCapacity[record.recipiente as RecipientSize] || { label: record.recipiente, capacityKg: record.peso_kg };
                        return (
                          <p key={record.id} className="text-xs text-muted-foreground">
                            {isTakeaway ? `${record.peso_kg}kg` : `${cap.label} · ${record.peso_kg}kg`} · {formatTime(record.enviado_at)}
                          </p>
                        );
                      })}
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <p className="text-xs text-muted-foreground">
                      {isTakeaway
                        ? `${latestTray.peso_kg}kg · ${formatTime(latestTray.enviado_at)}`
                        : `Último: ${recipientCapacity[latestTray.recipiente as RecipientSize]?.label || latestTray.recipiente} · ${latestTray.peso_kg}kg · ${formatTime(latestTray.enviado_at)}`
                      }
                    </p>
                    <Button size="sm" variant="outline" onClick={() => onCheckout(latestTray)}>
                      {isTakeaway ? 'Finalizar' : 'Recolher'}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function CompletedTraysSection({ records, formatTime, isTakeaway }: {
  records: RegistoProducao[];
  formatTime: (iso: string) => string;
  isTakeaway?: boolean;
}) {
  if (records.length === 0) return null;
  return (
    <div>
      <h2 className="font-display text-xl text-foreground mb-4">Registos do Dia</h2>
      <div className="space-y-3">
        {records.map(record => {
          const cfg = statusConfig[record.estado] || statusConfig.no_buffet;
          const cap = recipientCapacity[record.recipiente as RecipientSize] || { label: record.recipiente, capacityKg: record.peso_kg };
          const Icon = cfg.icon;
          return (
            <motion.div key={record.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{record.dish_name}</span>
                  <Badge className={cfg.color} variant="secondary"><Icon className="mr-1 h-3 w-3" /> {cfg.label}</Badge>
                  {isTakeaway && <Badge variant="outline" className="text-[10px]"><ShoppingBag className="mr-1 h-3 w-3" />TW</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isTakeaway ? `${record.peso_kg}kg` : `${cap.label} · ${record.peso_kg}kg`} · {formatTime(record.enviado_at)} → {record.recolhido_at ? formatTime(record.recolhido_at) : '—'}
                </p>
              </div>
              {record.sobra_kg !== null && (
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{record.sobra_kg}kg sobra</p>
                  {record.aproveitamento_nota?.startsWith('Repor no buffet') ? (
                    <p className="text-xs text-primary flex items-center gap-1 justify-end"><RefreshCw className="h-3 w-3" /> {record.aproveitamento_nota}</p>
                  ) : record.aproveitamento_nota ? (
                    <p className="text-xs text-success">{record.aproveitamento_nota}</p>
                  ) : null}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
