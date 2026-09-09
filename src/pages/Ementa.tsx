import { useEffect, useMemo, useState } from 'react';
import {
  CalendarPlus, Salad, Flame, CakeSlice, Infinity as InfinityIcon, Trash2,
  Plus, Clock, Recycle, ChefHat, ShoppingBag, RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Permitido } from '@/components/Permitido';
import { PERMISSOES } from '@/lib/permissoes';
import { usePermissao } from '@/hooks/usePermissao';
import { useAuth } from '@/contexts/AuthContext';
import { useUnidade } from '@/contexts/UnidadeContext';
import { MarcaSwitcher } from '@/components/MarcaSwitcher';
import { recipientCapacity, type RecipientSize } from '@/lib/buffet-data';
import { useRegistosProducao, type RegistoProducao } from '@/hooks/useRegistosProducao';
import { DecisaoReposicaoCard } from '@/components/producao/DecisaoReposicaoCard';
import {
  useEmentaDiaria,
  useBuffetItems,
  useBulkAddEmenta,
  usePermanentEmentaItems,
  useRemoveFromEmenta,
  PERMANENT_DATE,
} from '@/hooks/useEmentaDiaria';
import EmentaSetupDialog from '@/components/cozinha/EmentaSetupDialog';

const ZONES = [
  { key: 'entradas', label: 'Entradas', icon: Salad },
  { key: 'pratos_principais', label: 'Pratos Quentes', icon: Flame },
  { key: 'sobremesas', label: 'Sobremesas', icon: CakeSlice },
] as const;

type Canal = 'buffet' | 'take_away' | 'delivery';
const canalLabels: Record<Canal, string> = { buffet: 'Buffet', take_away: 'Take Away', delivery: 'Delivery' };

function decorrido(iso: string, agora: number) {
  const mins = Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}`;
}

export default function Ementa() {
  const { user } = useAuth();
  const { marca, servicos } = useUnidade();
  const today = new Date();
  const [showSetup, setShowSetup] = useState(false);
  const { permitido: podeRegistar } = usePermissao(PERMISSOES.producaoRegistar);

  const { data: ementaItems = [], isLoading } = useEmentaDiaria(today);
  const { data: allBuffetItems = [] } = useBuffetItems();
  const { data: permanentItems = [] } = usePermanentEmentaItems();
  const bulkAdd = useBulkAddEmenta();
  const removeItem = useRemoveFromEmenta();
  const { registos, addRegisto, recolherRegisto, activeTrays } = useRegistosProducao();

  // relógio para o tempo decorrido
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // serviços disponíveis (local activo × marca activa)
  const abas = useMemo<Canal[]>(() => {
    const list: Canal[] = [];
    if (servicos.includes('buffet')) list.push('buffet');
    if (servicos.includes('takeaway')) list.push('take_away');
    if (servicos.includes('delivery')) list.push('delivery');
    return list.length ? list : ['buffet'];
  }, [servicos]);
  const [tab, setTab] = useState<Canal>('buffet');
  const canal: Canal = abas.includes(tab) ? tab : abas[0];

  const existingItemIds = useMemo(() => new Set(ementaItems.map(e => e.buffet_item_id)), [ementaItems]);
  const permanentItemIds = useMemo(() => new Set(permanentItems.map(e => e.buffet_item_id)), [permanentItems]);

  const ementaByZone = useMemo(() => {
    const map: Record<string, typeof ementaItems> = { entradas: [], pratos_principais: [], sobremesas: [] };
    ementaItems.forEach(e => {
      const zona = e.buffet_item?.zona;
      if (zona && map[zona]) map[zona].push(e);
    });
    return map;
  }, [ementaItems]);

  /** tabuleiros activos deste canal, agrupados por prato */
  const traysPorPrato = useMemo(() => {
    const map = new Map<string, RegistoProducao[]>();
    activeTrays
      .filter(r => (r.canal || 'buffet') === canal)
      .forEach(r => {
        const key = r.buffet_item_id || r.dish_name;
        const list = map.get(key) || [];
        list.push(r);
        map.set(key, list);
      });
    return map;
  }, [activeTrays, canal]);

  // === registo de produção ===
  const [sendTarget, setSendTarget] = useState<{ id: string; nome: string; ficha: string | null; recipiente: RecipientSize; previsto: number } | null>(null);
  const [newRecipient, setNewRecipient] = useState<RecipientSize>('tabuleiro_grande');
  const [pesoKg, setPesoKg] = useState('');
  const [checkoutTarget, setCheckoutTarget] = useState<RegistoProducao | null>(null);
  const [decisaoRegistoId, setDecisaoRegistoId] = useState<string | null>(null);
  const [leftoverKg, setLeftoverKg] = useState('');
  const [leftoverAction, setLeftoverAction] = useState<'aproveitamento' | 'desperdicio'>('aproveitamento');
  const [isReporBuffet, setIsReporBuffet] = useState(false);
  const [aprovNote, setAprovNote] = useState('');

  function abrirEnvio(item: (typeof ementaItems)[number]) {
    const rec = (item.recipiente_sugerido as RecipientSize) in recipientCapacity
      ? (item.recipiente_sugerido as RecipientSize)
      : 'tabuleiro_grande';
    setSendTarget({
      id: item.buffet_item!.id,
      nome: item.buffet_item!.nome,
      ficha: item.buffet_item!.ficha_tecnica_id ?? null,
      recipiente: rec,
      previsto: Number(item.quantidade_prevista) || 0,
    });
    setNewRecipient(rec);
    setPesoKg(canal === 'buffet' ? '' : (Number(item.quantidade_prevista) > 0 ? String(item.quantidade_prevista) : ''));
  }

  async function confirmarEnvio() {
    if (!sendTarget) return;
    let kg: number;
    let recipiente: string;
    if (canal === 'buffet' && newRecipient !== 'unitario') {
      recipiente = newRecipient;
      kg = recipientCapacity[newRecipient].capacityKg;
    } else {
      recipiente = 'unitario';
      kg = parseFloat(pesoKg.replace(',', '.')) || 0;
      if (kg <= 0) return;
    }
    await addRegisto({
      dish_name: sendTarget.nome,
      ficha_tecnica_id: sendTarget.ficha || undefined,
      buffet_item_id: sendTarget.id,
      recipiente,
      peso_kg: kg,
      registado_por: user?.name || 'Gerente',
      canal,
    });
    setSendTarget(null);
    setPesoKg('');
  }

  async function handleCheckout() {
    if (!checkoutTarget) return;
    const kg = parseFloat(leftoverKg.replace(',', '.')) || 0;
    const note = leftoverAction === 'aproveitamento'
      ? (isReporBuffet ? `Repor no buffet${aprovNote ? ' — ' + aprovNote : ''}` : aprovNote)
      : null;
    await recolherRegisto(checkoutTarget.id, kg, leftoverAction, note);
    setDecisaoRegistoId(checkoutTarget.id);
    setCheckoutTarget(null);
    setLeftoverKg('');
    setLeftoverAction('aproveitamento');
    setIsReporBuffet(false);
    setAprovNote('');
  }

  async function handleReporSugerido(kg: number, recipiente: RecipientSize) {
    if (!decisaoRegistoId) return;
    const registo = registos.find(r => r.id === decisaoRegistoId);
    if (!registo) return;
    await addRegisto({
      dish_name: registo.dish_name,
      ficha_tecnica_id: registo.ficha_tecnica_id || undefined,
      buffet_item_id: registo.buffet_item_id || undefined,
      recipiente,
      peso_kg: kg,
      registado_por: user?.name || 'Gerente',
      canal: (registo.canal || 'buffet') as Canal,
    });
  }

  const handleBulkAdd = (
    items: { buffet_item_id: string; quantidade_prevista: number; recipiente_sugerido: string }[],
    dates: Date[],
  ) => {
    const rows = dates.flatMap(d =>
      items.map(i => ({ ...i, data: format(d, 'yyyy-MM-dd'), criado_por: user?.name || '' })),
    );
    bulkAdd.mutate(rows);
  };

  const handlePermanentAdd = (
    items: { buffet_item_id: string; quantidade_prevista: number; recipiente_sugerido: string }[],
  ) => {
    bulkAdd.mutate(items.map(i => ({ ...i, data: PERMANENT_DATE, criado_por: user?.name || '' })));
  };

  const dayLabel = format(today, "EEEE, d 'de' MMMM", { locale: pt });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display text-foreground">Ementa / Produção</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {dayLabel}
            {marca ? ` · ${marca.nome}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MarcaSwitcher />
          <Permitido chave={PERMISSOES.ementaDefinir}>
            <Button className="gap-2" onClick={() => setShowSetup(true)}>
              <CalendarPlus className="h-4 w-4" /> Definir Ementa
            </Button>
          </Permitido>
        </div>
      </div>

      {abas.length > 1 && (
        <Tabs value={canal} onValueChange={v => setTab(v as Canal)}>
          <TabsList className="w-full sm:w-auto">
            {abas.map(a => (
              <TabsTrigger key={a} value={a} className="gap-2">
                {a === 'buffet' ? <ChefHat className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
                {canalLabels[a]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {decisaoRegistoId && (
        <DecisaoReposicaoCard
          registoId={decisaoRegistoId}
          onRepor={handleReporSugerido}
          onDismiss={() => setDecisaoRegistoId(null)}
        />
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">A carregar ementa…</p>
      ) : ementaItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Ainda não há pratos definidos para hoje.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {ZONES.map(zone => (
            <div key={zone.key} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <zone.icon className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">{zone.label}</h2>
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  {ementaByZone[zone.key].length}
                </Badge>
              </div>
              <div className="space-y-2">
                {ementaByZone[zone.key].length === 0 && (
                  <p className="text-xs text-muted-foreground">Sem pratos.</p>
                )}
                {ementaByZone[zone.key].map(item => {
                  const trays = traysPorPrato.get(item.buffet_item_id) || traysPorPrato.get(item.buffet_item?.nome || '') || [];
                  return (
                    <div key={item.id} className="rounded-md border border-border bg-background px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm text-foreground">{item.buffet_item?.nome}</span>
                          {item.data === PERMANENT_DATE && (
                            <Badge variant="outline" className="h-4 shrink-0 border-primary/30 px-1.5 text-[9px] text-primary">
                              <InfinityIcon className="mr-0.5 h-2.5 w-2.5" /> Sempre
                            </Badge>
                          )}
                          {trays.length > 0 && (
                            <Badge className="h-4 shrink-0 bg-primary/10 px-1.5 text-[9px] text-primary">{trays.length}</Badge>
                          )}
                        </div>
                        <Permitido chave={PERMISSOES.ementaDefinir}>
                          <button
                            onClick={() => removeItem.mutate(item.id)}
                            className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                            aria-label="Remover da ementa"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </Permitido>
                      </div>

                      {podeRegistar && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 h-7 w-full gap-1.5 text-xs"
                          onClick={() => abrirEnvio(item)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {canal === 'buffet' ? 'Enviar tabuleiro' : `Registar ${canalLabels[canal]}`}
                        </Button>
                      )}

                      {trays.length > 0 && (
                        <div className="mt-2 space-y-1 border-t border-border pt-2">
                          {trays.map(t => (
                            <div key={t.id} className="flex items-center justify-between gap-2">
                              <p className="truncate text-[11px] text-muted-foreground">
                                <Clock className="mr-1 inline h-3 w-3" />
                                {decorrido(t.enviado_at, agora)} · {t.peso_kg}kg
                                {canal === 'buffet' && ` · ${recipientCapacity[t.recipiente as RecipientSize]?.label || t.recipiente}`}
                              </p>
                              {podeRegistar && (
                                <Button size="sm" variant="ghost" className="h-6 shrink-0 px-2 text-[11px]" onClick={() => setCheckoutTarget(t)}>
                                  {canal === 'buffet' ? 'Recolher' : 'Finalizar'}
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enviar / registar produção */}
      <Dialog open={!!sendTarget} onOpenChange={o => { if (!o) setSendTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{canal === 'buffet' ? 'Enviar tabuleiro' : `Registar ${canalLabels[canal]}`}</DialogTitle>
            <DialogDescription>{sendTarget?.nome}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {sendTarget && sendTarget.previsto > 0 && (
              <p className="text-xs text-muted-foreground">Previsto na ementa de hoje: {sendTarget.previsto} kg</p>
            )}
            {canal === 'buffet' && (
              <div>
                <Label>Recipiente</Label>
                <Select value={newRecipient} onValueChange={v => { setNewRecipient(v as RecipientSize); setPesoKg(''); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(recipientCapacity).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label} ({val.capacityKg}kg)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(canal !== 'buffet' || newRecipient === 'unitario') && (
              <div>
                <Label>Peso (kg)</Label>
                <Input type="number" inputMode="decimal" step="0.1" min="0.1" placeholder="Ex: 2.5"
                  value={pesoKg} onChange={e => setPesoKg(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendTarget(null)}>Cancelar</Button>
            <Button
              onClick={confirmarEnvio}
              disabled={(canal !== 'buffet' || newRecipient === 'unitario') && !(parseFloat(pesoKg.replace(',', '.')) > 0)}
            >
              Registar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recolha */}
      <Dialog open={!!checkoutTarget} onOpenChange={() => setCheckoutTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{(checkoutTarget?.canal || 'buffet') === 'buffet' ? 'Recolher Tabuleiro' : 'Finalizar'}</DialogTitle>
            <DialogDescription>
              {checkoutTarget?.dish_name} — {checkoutTarget && (recipientCapacity[checkoutTarget.recipiente as RecipientSize]?.label || checkoutTarget.recipiente)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Peso da sobra (kg)</Label>
              <Input type="number" inputMode="decimal" step="0.1" min="0" placeholder="Ex: 1.2"
                value={leftoverKg} onChange={e => setLeftoverKg(e.target.value)} />
            </div>
            <div>
              <Label className="mb-3 block">O que fazer com a sobra?</Label>
              <RadioGroup value={leftoverAction} onValueChange={v => { setLeftoverAction(v as 'aproveitamento' | 'desperdicio'); if (v === 'desperdicio') setIsReporBuffet(false); }}>
                <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <RadioGroupItem value="aproveitamento" id="aprov" className="mt-0.5" />
                  <Label htmlFor="aprov" className="cursor-pointer">
                    <div className="flex items-center gap-2"><Recycle className="h-4 w-4 text-success" /><span className="font-medium">Aproveitamento</span></div>
                    <p className="mt-1 text-xs text-muted-foreground">Arrefecer e reutilizar noutra preparação</p>
                  </Label>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <RadioGroupItem value="desperdicio" id="desp" className="mt-0.5" />
                  <Label htmlFor="desp" className="cursor-pointer">
                    <div className="flex items-center gap-2"><Trash2 className="h-4 w-4 text-destructive" /><span className="font-medium">Desperdício</span></div>
                    <p className="mt-1 text-xs text-muted-foreground">Comida exposta que deve ser descartada</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>
            {leftoverAction === 'aproveitamento' && (
              <div className="space-y-3">
                {(checkoutTarget?.canal || 'buffet') === 'buffet' && (
                  <button
                    type="button"
                    onClick={() => setIsReporBuffet(!isReporBuffet)}
                    className={cn('flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left transition-all',
                      isReporBuffet ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50')}
                  >
                    <RefreshCw className={cn('h-5 w-5', isReporBuffet ? 'text-primary' : 'text-muted-foreground')} />
                    <div>
                      <span className={cn('text-sm font-medium', isReporBuffet ? 'text-primary' : 'text-foreground')}>Repor no buffet</span>
                      <p className="text-[11px] text-muted-foreground">Guardar e servir novamente amanhã</p>
                    </div>
                  </button>
                )}
                <div>
                  <Label>{isReporBuffet ? 'Nota adicional (opcional)' : 'Para que preparação?'}</Label>
                  <Input placeholder={isReporBuffet ? 'Ex: Guardar no frio até amanhã' : 'Ex: Recheio de rissóis, Sopa...'}
                    value={aprovNote} onChange={e => setAprovNote(e.target.value)} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutTarget(null)}>Cancelar</Button>
            <Button onClick={handleCheckout}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EmentaSetupDialog
        open={showSetup}
        onOpenChange={setShowSetup}
        allItems={allBuffetItems}
        existingItemIds={existingItemIds}
        permanentItemIds={permanentItemIds}
        onConfirm={handleBulkAdd}
        onConfirmPermanent={handlePermanentAdd}
        date={today}
        userName={user?.name || ''}
      />
    </div>
  );
}
