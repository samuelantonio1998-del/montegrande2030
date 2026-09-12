import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarPlus, Loader2, Repeat, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { usePessoas } from '@/hooks/usePessoas';
import {
  useHorarios, useHorarioMutations, inicioSemana, paraISO, hhmm, horasEntre,
  type Horario, type Excepcao,
} from '@/hooks/useHorarios';

const DIAS = [
  { dia: 1, label: 'Seg' },
  { dia: 2, label: 'Ter' },
  { dia: 3, label: 'Qua' },
  { dia: 4, label: 'Qui' },
  { dia: 5, label: 'Sex' },
  { dia: 6, label: 'Sáb' },
  { dia: 0, label: 'Dom' },
];

const dataCurta = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

type EdicaoDia = {
  funcionario_id: string;
  nome: string;
  unidade_id: string | null;
  dia_semana: number;
  existentes: Horario[];
};

export default function HorariosPanel() {
  const { data: pessoasData } = usePessoas();
  const [semanaBase, setSemanaBase] = useState(() => inicioSemana(new Date()));
  const semanaISO = paraISO(semanaBase);
  const { data, isLoading } = useHorarios(semanaISO);
  const m = useHorarioMutations(semanaISO);

  const [edicao, setEdicao] = useState<EdicaoDia | null>(null);
  const [form, setForm] = useState({
    folga: false, alternado: false,
    inicio: '09:30', fim: '16:30', inicioJantar: '17:30', fimJantar: '23:30',
  });
  const [dialogoExcepcao, setDialogoExcepcao] = useState(false);
  const [formExc, setFormExc] = useState({
    funcionario_id: '', data: paraISO(new Date()), ausente: true,
    hora_inicio: '09:30', hora_fim: '16:30', motivo: '',
  });

  const horarios = data?.horarios ?? [];
  const excepcoes = data?.excepcoes ?? [];
  const escala = data?.escala ?? [];

  const equipa = useMemo(
    () => (pessoasData?.pessoas ?? [])
      .filter(p => p.funcionario_id && p.ativo)
      .filter(p => horarios.some(h => h.funcionario_id === p.funcionario_id)
        || (p.role_nome ?? '').toLowerCase().includes('cozinh')),
    [pessoasData, horarios],
  );

  const datasSemana = useMemo(
    () => DIAS.map((_, i) => {
      const d = new Date(semanaBase);
      d.setDate(d.getDate() + i);
      return d;
    }),
    [semanaBase],
  );

  const turnoDaSemana = (funcionarioId: string): 'almoco' | 'jantar' =>
    (escala.find(e => e.funcionario_id === funcionarioId)?.turno ?? 'almoco');

  const alternantes = useMemo(
    () => Array.from(new Set(horarios.filter(h => h.alternado).map(h => h.funcionario_id))),
    [horarios],
  );

  const excepcaoDe = (funcionarioId: string, data: Date) =>
    excepcoes.find(e => e.funcionario_id === funcionarioId && e.data === paraISO(data));

  const horariosDe = (funcionarioId: string, dia: number) =>
    horarios.filter(h => h.funcionario_id === funcionarioId && h.dia_semana === dia);

  /** Linhas que realmente contam nesta semana (resolve a alternância). */
  const efetivos = (funcionarioId: string, dia: number) => {
    const linhas = horariosDe(funcionarioId, dia);
    if (!linhas.some(l => l.alternado)) return linhas;
    const turno = turnoDaSemana(funcionarioId);
    return linhas.filter(l => !l.alternado || l.turno === turno);
  };

  const totalHoras = (funcionarioId: string) =>
    datasSemana.reduce((acc, dataDia, i) => {
      const exc = excepcaoDe(funcionarioId, dataDia);
      if (exc) return acc + (exc.ausente ? 0 : horasEntre(exc.hora_inicio, exc.hora_fim));
      return acc + efetivos(funcionarioId, DIAS[i].dia)
        .reduce((s, l) => s + horasEntre(l.hora_inicio, l.hora_fim), 0);
    }, 0);

  const abrirEdicao = (p: { funcionario_id: string | null; nome: string; unidade_id: string | null }, dia: number) => {
    if (!p.funcionario_id) return;
    const existentes = horariosDe(p.funcionario_id, dia);
    const alternado = existentes.some(h => h.alternado);
    const almoco = existentes.find(h => h.turno === 'almoco') ?? existentes[0];
    const jantar = existentes.find(h => h.turno === 'jantar');
    setForm({
      folga: existentes.length === 0,
      alternado,
      inicio: hhmm(almoco?.hora_inicio ?? null) || '09:30',
      fim: hhmm(almoco?.hora_fim ?? null) || '16:30',
      inicioJantar: hhmm(jantar?.hora_inicio ?? null) || '17:30',
      fimJantar: hhmm(jantar?.hora_fim ?? null) || '23:30',
    });
    setEdicao({
      funcionario_id: p.funcionario_id, nome: p.nome,
      unidade_id: p.unidade_id, dia_semana: dia, existentes,
    });
  };

  const mudarSemana = (delta: number) => {
    const d = new Date(semanaBase);
    d.setDate(d.getDate() + delta * 7);
    setSemanaBase(d);
  };

  const guardarDia = async () => {
    if (!edicao) return;
    await m.guardarDia.mutateAsync({
      funcionario_id: edicao.funcionario_id,
      unidade_id: edicao.unidade_id,
      dia_semana: edicao.dia_semana,
      folga: form.folga,
      alternado: form.alternado,
      inicio: form.inicio,
      fim: form.fim,
      inicioJantar: form.inicioJantar,
      fimJantar: form.fimJantar,
      existentes: edicao.existentes,
    });
    setEdicao(null);
  };

  const registarExcepcao = async () => {
    if (!formExc.funcionario_id) return;
    const pessoa = equipa.find(p => p.funcionario_id === formExc.funcionario_id);
    await m.guardarExcepcao.mutateAsync({
      funcionario_id: formExc.funcionario_id,
      unidade_id: pessoa?.unidade_id ?? null,
      data: formExc.data,
      ausente: formExc.ausente,
      hora_inicio: formExc.ausente ? null : formExc.hora_inicio,
      hora_fim: formExc.ausente ? null : formExc.hora_fim,
      motivo: formExc.motivo || null,
    });
    setDialogoExcepcao(false);
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={() => mudarSemana(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-medium text-foreground">
            Semana de {dataCurta(datasSemana[0])} a {dataCurta(datasSemana[6])}
          </span>
          <Button size="icon" variant="outline" onClick={() => mudarSemana(1)}><ChevronRight className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setSemanaBase(inicioSemana(new Date()))}>Esta semana</Button>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {alternantes.length >= 2 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => m.trocarTurnos.mutate({
                unidade_id: equipa.find(p => p.funcionario_id === alternantes[0])?.unidade_id ?? null,
                pessoas: alternantes,
                atual: Object.fromEntries(escala.map(e => [e.funcionario_id, e.turno])),
              })}
            >
              <Repeat className="mr-1.5 h-3.5 w-3.5" /> Trocar almoço/jantar desta semana
            </Button>
          )}
          <Button size="sm" onClick={() => { setFormExc(f => ({ ...f, funcionario_id: equipa[0]?.funcionario_id ?? '' })); setDialogoExcepcao(true); }}>
            <CalendarPlus className="mr-1.5 h-3.5 w-3.5" /> Nova exceção
          </Button>
        </div>
      </div>

      {alternantes.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {alternantes.map(id => (
            <Badge key={id} variant="secondary">
              {equipa.find(p => p.funcionario_id === id)?.nome ?? '—'} · sexta e sábado ao{' '}
              {turnoDaSemana(id) === 'almoco' ? 'almoço' : 'jantar'}
            </Badge>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : equipa.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Ainda não há pessoas com horário.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left font-medium text-muted-foreground">Pessoa</th>
                {DIAS.map((d, i) => (
                  <th key={d.dia} className="p-3 text-left font-medium text-muted-foreground">
                    {d.label} <span className="text-xs font-normal">{dataCurta(datasSemana[i])}</span>
                  </th>
                ))}
                <th className="p-3 text-right font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {equipa.map(p => (
                <tr key={p.key} className="border-t border-border">
                  <td className="p-3">
                    <div className="font-medium text-foreground">{p.nome}</div>
                    <div className="text-xs text-muted-foreground">{p.role_nome ?? 'Sem papel'}</div>
                  </td>
                  {DIAS.map((d, i) => {
                    const exc = excepcaoDe(p.funcionario_id!, datasSemana[i]);
                    const linhas = efetivos(p.funcionario_id!, d.dia);
                    return (
                      <td key={d.dia} className="p-2 align-top">
                        <button
                          type="button"
                          onClick={() => abrirEdicao(p, d.dia)}
                          className="w-full rounded-md border border-transparent p-2 text-left hover:border-border hover:bg-muted/40"
                        >
                          {exc ? (
                            <span className="text-xs text-amber-700 dark:text-amber-400">
                              {exc.ausente ? (exc.motivo || 'Ausente') : `${hhmm(exc.hora_inicio)}–${hhmm(exc.hora_fim)}`}
                            </span>
                          ) : linhas.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Folga</span>
                          ) : (
                            linhas.map(l => (
                              <span key={l.id} className="block text-xs text-foreground">
                                {hhmm(l.hora_inicio)}–{hhmm(l.hora_fim)}
                                {l.alternado && <span className="ml-1 text-muted-foreground">({l.turno === 'almoco' ? 'almoço' : 'jantar'})</span>}
                              </span>
                            ))
                          )}
                        </button>
                      </td>
                    );
                  })}
                  <td className="p-3 text-right font-medium text-foreground">
                    {totalHoras(p.funcionario_id!).toFixed(1)} h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {excepcoes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Exceções desta semana</h3>
          {excepcoes.map(e => (
            <div key={e.id} className="flex items-center justify-between rounded-md border border-border bg-card p-3 text-sm">
              <span>
                <strong>{equipa.find(p => p.funcionario_id === e.funcionario_id)?.nome ?? '—'}</strong>{' '}
                · {e.data} · {e.ausente ? 'Ausente' : `${hhmm(e.hora_inicio)}–${hhmm(e.hora_fim)}`}
                {e.motivo && <span className="text-muted-foreground"> · {e.motivo}</span>}
              </span>
              <Button size="sm" variant="ghost" onClick={() => m.apagarExcepcao.mutate(e.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Editar dia */}
      <Dialog open={!!edicao} onOpenChange={o => !o && setEdicao(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edicao?.nome} · {DIAS.find(d => d.dia === edicao?.dia_semana)?.label}</DialogTitle>
            <DialogDescription>Defina as horas deste dia, marque folga ou ative a alternância semanal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.folga} onCheckedChange={v => setForm(f => ({ ...f, folga: v }))} /> Folga
            </label>
            {!form.folga && (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={form.alternado} onCheckedChange={v => setForm(f => ({ ...f, alternado: v }))} />
                  Alterna semanalmente entre almoço e jantar
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{form.alternado ? 'Almoço · início' : 'Início'}</Label>
                    <Input type="time" value={form.inicio} onChange={e => setForm(f => ({ ...f, inicio: e.target.value }))} />
                  </div>
                  <div>
                    <Label>{form.alternado ? 'Almoço · fim' : 'Fim'}</Label>
                    <Input type="time" value={form.fim} onChange={e => setForm(f => ({ ...f, fim: e.target.value }))} />
                  </div>
                  {form.alternado && (
                    <>
                      <div>
                        <Label>Jantar · início</Label>
                        <Input type="time" value={form.inicioJantar} onChange={e => setForm(f => ({ ...f, inicioJantar: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Jantar · fim</Label>
                        <Input type="time" value={form.fimJantar} onChange={e => setForm(f => ({ ...f, fimJantar: e.target.value }))} />
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdicao(null)}>Cancelar</Button>
            <Button onClick={guardarDia} disabled={m.guardarDia.isPending}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exceção */}
      <Dialog open={dialogoExcepcao} onOpenChange={setDialogoExcepcao}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova exceção</DialogTitle>
            <DialogDescription>Férias, falta ou troca pontual. Substitui o horário normal nesse dia.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Pessoa</Label>
              <Select value={formExc.funcionario_id} onValueChange={v => setFormExc(f => ({ ...f, funcionario_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Escolher" /></SelectTrigger>
                <SelectContent>
                  {equipa.map(p => (
                    <SelectItem key={p.funcionario_id!} value={p.funcionario_id!}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={formExc.data} onChange={e => setFormExc(f => ({ ...f, data: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={formExc.ausente} onCheckedChange={v => setFormExc(f => ({ ...f, ausente: v }))} /> Ausente todo o dia
            </label>
            {!formExc.ausente && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Início</Label>
                  <Input type="time" value={formExc.hora_inicio} onChange={e => setFormExc(f => ({ ...f, hora_inicio: e.target.value }))} />
                </div>
                <div>
                  <Label>Fim</Label>
                  <Input type="time" value={formExc.hora_fim} onChange={e => setFormExc(f => ({ ...f, hora_fim: e.target.value }))} />
                </div>
              </div>
            )}
            <div>
              <Label>Motivo</Label>
              <Input value={formExc.motivo} onChange={e => setFormExc(f => ({ ...f, motivo: e.target.value }))} placeholder="Férias, falta, troca…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogoExcepcao(false)}>Cancelar</Button>
            <Button onClick={registarExcepcao} disabled={m.guardarExcepcao.isPending}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export type { Excepcao };
