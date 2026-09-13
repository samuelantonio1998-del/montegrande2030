import { useEffect, useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Save, Clock, User, Snowflake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  OPERACOES, calcularTotais, useFichaPassos, useSaveFichaPassos, useZonasEquipamentos,
  type PassoInput, type TipoPasso, type Operacao,
} from '@/hooks/useFichaPassos';

const NENHUM = '__nenhum__';

const passoVazio = (): PassoInput => ({
  ordem: 0,
  descricao: '',
  tipo_passo: 'ativo',
  operacao: null,
  zona_id: null,
  equipamento_id: null,
  duracao_fixa_min: 0,
  duracao_por_kg_min: 0,
  adiantavel: false,
  estimado: true,
  notas: null,
});

export function FichaPassosPanel({ fichaId, kg }: { fichaId: string; kg: number }) {
  const { data: passosDb = [], isLoading } = useFichaPassos(fichaId);
  const { data: catalogo } = useZonasEquipamentos();
  const salvar = useSaveFichaPassos();
  const [passos, setPassos] = useState<PassoInput[]>([]);

  useEffect(() => {
    setPassos(passosDb.map(p => ({
      ordem: p.ordem,
      descricao: p.descricao,
      tipo_passo: p.tipo_passo,
      operacao: p.operacao,
      zona_id: p.zona_id,
      equipamento_id: p.equipamento_id,
      duracao_fixa_min: Number(p.duracao_fixa_min),
      duracao_por_kg_min: Number(p.duracao_por_kg_min),
      adiantavel: p.adiantavel,
      estimado: p.estimado,
      notas: p.notas,
    })));
  }, [passosDb]);

  const zonas = catalogo?.zonas ?? [];
  const equipamentos = catalogo?.equipamentos ?? [];
  const abatedor = equipamentos.find(e => e.nome.toLowerCase().includes('abatedor'));

  const { pessoa, relogio } = calcularTotais(passos, kg);
  const minAbatedor = passos
    .filter(p => abatedor && p.equipamento_id === abatedor.id)
    .reduce((s, p) => s + Number(p.duracao_fixa_min || 0), 0);

  const atualizar = (idx: number, patch: Partial<PassoInput>) =>
    setPassos(passos.map((p, i) => (i === idx ? { ...p, ...patch } : p)));

  const mover = (idx: number, delta: number) => {
    const alvo = idx + delta;
    if (alvo < 0 || alvo >= passos.length) return;
    const copia = [...passos];
    [copia[idx], copia[alvo]] = [copia[alvo], copia[idx]];
    setPassos(copia);
  };

  if (isLoading) return <p className="text-sm text-muted-foreground py-6 text-center">A carregar passos...</p>;

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-xs text-muted-foreground">Passos</p>
          <p className="text-lg font-bold text-foreground">{passos.length}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><User className="h-3 w-3" /> Pessoa</p>
          <p className="text-lg font-bold text-foreground">{Math.round(pessoa)} min</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Clock className="h-3 w-3" /> Relógio</p>
          <p className="text-lg font-bold text-foreground">{Math.round(relogio)} min</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Snowflake className="h-3 w-3" /> Abatedor</p>
          <p className="text-lg font-bold text-foreground">{minAbatedor} min</p>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Durações estimadas para cozinha profissional — some o tempo fixo com o tempo por kg ({kg} kg). Pode editar tudo.
      </p>

      {/* Lista */}
      <div className="space-y-3">
        {passos.map((p, idx) => (
          <div key={idx} className="rounded-lg border border-border p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0 mt-1">{idx + 1}</Badge>
              <Input
                value={p.descricao}
                onChange={e => atualizar(idx, { descricao: e.target.value })}
                placeholder="Descrição do passo"
                className="h-8 text-sm"
              />
              <div className="flex gap-0.5 shrink-0">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => mover(idx, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => mover(idx, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setPassos(passos.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Select value={p.tipo_passo} onValueChange={(v: TipoPasso) => atualizar(idx, { tipo_passo: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="espera">Espera</SelectItem>
                </SelectContent>
              </Select>

              <Select value={p.operacao ?? NENHUM} onValueChange={v => atualizar(idx, { operacao: v === NENHUM ? null : (v as Operacao) })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Operação" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NENHUM}>Sem operação</SelectItem>
                  {OPERACOES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={p.zona_id ?? NENHUM} onValueChange={v => atualizar(idx, { zona_id: v === NENHUM ? null : v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Zona" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NENHUM}>Sem zona</SelectItem>
                  {zonas.map(z => <SelectItem key={z.id} value={z.id}>{z.nome}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={p.equipamento_id ?? NENHUM} onValueChange={v => atualizar(idx, { equipamento_id: v === NENHUM ? null : v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Equipamento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NENHUM}>Sem equipamento</SelectItem>
                  {equipamentos.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="text-[11px] text-muted-foreground flex items-center gap-1">
                Fixo (min)
                <Input
                  type="number" inputMode="decimal" min={0}
                  value={p.duracao_fixa_min}
                  onChange={e => atualizar(idx, { duracao_fixa_min: parseFloat(e.target.value) || 0 })}
                  className="h-8 w-20 text-xs"
                />
              </label>
              <label className="text-[11px] text-muted-foreground flex items-center gap-1">
                Por kg (min)
                <Input
                  type="number" inputMode="decimal" min={0} step="0.5"
                  value={p.duracao_por_kg_min}
                  onChange={e => atualizar(idx, { duracao_por_kg_min: parseFloat(e.target.value) || 0 })}
                  className="h-8 w-20 text-xs"
                />
              </label>
              <label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Switch checked={p.adiantavel} onCheckedChange={v => atualizar(idx, { adiantavel: v })} /> Adiantável
              </label>
              <label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Switch checked={p.estimado} onCheckedChange={v => atualizar(idx, { estimado: v })} /> Estimado
              </label>
            </div>
          </div>
        ))}

        {passos.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Ainda não há passos definidos para esta ficha.</p>
        )}
      </div>

      <div className="flex justify-between gap-2">
        <Button variant="outline" size="sm" className="gap-1" onClick={() => setPassos([...passos, passoVazio()])}>
          <Plus className="h-3.5 w-3.5" /> Adicionar passo
        </Button>
        <Button size="sm" className="gap-1.5" disabled={salvar.isPending} onClick={() => salvar.mutate({ fichaId, passos })}>
          <Save className="h-3.5 w-3.5" /> {salvar.isPending ? 'A guardar...' : 'Guardar passos'}
        </Button>
      </div>
    </div>
  );
}

export default FichaPassosPanel;
