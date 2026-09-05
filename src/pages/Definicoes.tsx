import { useState } from 'react';
import { Clock, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUnidade } from '@/contexts/UnidadeContext';
import { useTodosHorarios, useHorariosMutations, type ServicoHorario } from '@/hooks/useServicoHorarios';

const SERVICOS = [
  { valor: 'buffet', label: 'Buffet' },
  { valor: 'takeaway', label: 'Take Away' },
  { valor: 'delivery', label: 'Delivery' },
  { valor: 'mesa', label: 'Mesa' },
];

const PERIODOS = [
  { valor: 'almoco', label: 'Almoço' },
  { valor: 'jantar', label: 'Jantar' },
  { valor: 'continuo', label: 'Contínuo' },
];

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

type Rascunho = {
  id?: string;
  marca_id: string;
  servico: string;
  periodo: string;
  dia_semana: number | null;
  hora_inicio: string;
  hora_fim: string;
  ativo: boolean;
};

function hhmm(h: string) {
  return h?.slice(0, 5) ?? '';
}

export default function Definicoes() {
  const { marcas, nomeMarca, unidade } = useUnidade();
  const { data: horarios = [], isLoading } = useTodosHorarios();
  const { guardar, remover } = useHorariosMutations();
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);

  function novo() {
    setRascunho({
      marca_id: marcas[0]?.id ?? '',
      servico: 'buffet',
      periodo: 'almoco',
      dia_semana: null,
      hora_inicio: '12:00',
      hora_fim: '14:30',
      ativo: true,
    });
    setAberto(true);
  }

  function editar(h: ServicoHorario) {
    setRascunho({
      id: h.id,
      marca_id: h.marca_id,
      servico: h.servico,
      periodo: h.periodo,
      dia_semana: h.dia_semana,
      hora_inicio: hhmm(h.hora_inicio),
      hora_fim: hhmm(h.hora_fim),
      ativo: h.ativo,
    });
    setAberto(true);
  }

  async function submeter() {
    if (!rascunho?.marca_id) return;
    await guardar.mutateAsync(rascunho);
    setAberto(false);
    setRascunho(null);
  }

  const porMarca = marcas.map(m => ({
    marca: m,
    linhas: horarios.filter(h => h.marca_id === m.id),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl text-foreground">Definições</h1>
          <p className="mt-1 text-muted-foreground">
            Horários de serviço{unidade ? ` — ${unidade.nome}` : ''}
          </p>
        </div>
        <Button onClick={novo} className="gap-2" disabled={marcas.length === 0}>
          <Plus className="h-4 w-4" /> Novo horário
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">A carregar…</p>}

      {!isLoading && porMarca.map(({ marca, linhas }) => (
        <section key={marca.id} className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-xl text-foreground">{marca.nome}</h2>
          {linhas.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Sem horários definidos.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {linhas.map(h => (
                <div key={h.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">
                    {SERVICOS.find(s => s.valor === h.servico)?.label ?? h.servico}
                  </span>
                  <Badge variant="secondary">{PERIODOS.find(p => p.valor === h.periodo)?.label ?? h.periodo}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {hhmm(h.hora_inicio)} — {hhmm(h.hora_fim)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {h.dia_semana === null ? 'Todos os dias' : DIAS[h.dia_semana]}
                  </span>
                  {!h.ativo && <Badge variant="outline">Inativo</Badge>}
                  <div className="ml-auto flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => editar(h)} className="gap-1">
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remover.mutate(h.id)} className="gap-1 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" /> Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{rascunho?.id ? 'Editar horário' : 'Novo horário'}</DialogTitle>
            <DialogDescription>Defina a que horas cada serviço abre e fecha.</DialogDescription>
          </DialogHeader>
          {rascunho && (
            <div className="space-y-4">
              <div>
                <Label>Marca</Label>
                <Select value={rascunho.marca_id} onValueChange={v => setRascunho({ ...rascunho, marca_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Escolher marca" /></SelectTrigger>
                  <SelectContent>
                    {marcas.map(m => <SelectItem key={m.id} value={m.id}>{nomeMarca(m.id)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Serviço</Label>
                  <Select value={rascunho.servico} onValueChange={v => setRascunho({ ...rascunho, servico: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SERVICOS.map(s => <SelectItem key={s.valor} value={s.valor}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Período</Label>
                  <Select value={rascunho.periodo} onValueChange={v => setRascunho({ ...rascunho, periodo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PERIODOS.map(p => <SelectItem key={p.valor} value={p.valor}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Dia</Label>
                <Select
                  value={rascunho.dia_semana === null ? 'todos' : String(rascunho.dia_semana)}
                  onValueChange={v => setRascunho({ ...rascunho, dia_semana: v === 'todos' ? null : Number(v) })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os dias</SelectItem>
                    {DIAS.map((d, i) => <SelectItem key={d} value={String(i)}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Abre</Label>
                  <Input type="time" value={rascunho.hora_inicio} onChange={e => setRascunho({ ...rascunho, hora_inicio: e.target.value })} />
                </div>
                <div>
                  <Label>Fecha</Label>
                  <Input type="time" value={rascunho.hora_fim} onChange={e => setRascunho({ ...rascunho, hora_fim: e.target.value })} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button onClick={submeter} disabled={guardar.isPending || !rascunho?.marca_id}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
