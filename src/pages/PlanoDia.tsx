import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, Info, Moon, RefreshCw, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissao } from '@/hooks/usePermissao';
import { PERMISSOES } from '@/lib/permissoes';
import { minutosParaHora } from '@/lib/plano-engine';
import {
  calcular,
  useDadosPlano,
  usePlanoGuardado,
  usePlanoMutations,
  type PlanoTarefa,
} from '@/hooks/usePlanoDia';

const SEM_PESSOA = '__sem__';

export default function PlanoDia() {
  const [dataISO, setDataISO] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { user } = useAuth();
  const { permitido: podeGerir } = usePermissao(PERMISSOES.planoGerir);

  const { data: dados, isLoading } = useDadosPlano(dataISO);
  const { data: guardado } = usePlanoGuardado(dataISO);
  const { guardar, reatribuir, iniciar, concluir, apagar } = usePlanoMutations(dataISO);

  const previsto = useMemo(() => (dados ? calcular(dados) : null), [dados]);

  const nomePessoa = (id: string | null) =>
    dados?.funcionarios.find(f => f.id === id)?.nome ?? 'Por atribuir';
  const nomeZona = (id: string | null) => dados?.zonas.find(z => z.id === id)?.nome ?? null;
  const nomeEquip = (id: string | null) => dados?.equipamentos.find(e => e.id === id)?.nome ?? null;

  const tarefas = guardado?.tarefas ?? [];
  const vespera = tarefas.filter(t => t.vespera);
  const doDia = tarefas.filter(t => !t.vespera);

  // Vista simples de tablet: funcionário com PIN vê só as suas tarefas
  const modoFuncionario = !!user?.funcionarioId && !podeGerir;

  if (modoFuncionario) {
    const minhas = tarefas
      .filter(t => t.funcionario_id === user!.funcionarioId)
      .sort((a, b) => (Number(a.vespera) - Number(b.vespera)) || ((a.inicio_min ?? 0) - (b.inicio_min ?? 0)));
    return (
      <div className="space-y-4 p-4">
        <h1 className="font-serif text-2xl">O meu dia</h1>
        <p className="text-sm text-muted-foreground">{dataISO}</p>
        {minhas.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground">Ainda não tem nada atribuído neste dia.</Card>
        )}
        {minhas.map(t => (
          <Card key={t.id} className={`p-4 ${t.concluida ? 'opacity-60' : ''}`}>
            <div className="flex items-start gap-4">
              <Checkbox
                className="mt-1 h-6 w-6"
                checked={t.concluida}
                onCheckedChange={v => concluir.mutate({ id: t.id, concluida: !!v, origem: t.origem, tarefa_id: t.tarefa_id })}
              />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-medium">{t.descricao}</p>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${t.origem === 'tarefa' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                    {t.origem === 'tarefa' ? 'Tarefa' : 'Produção'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {minutosParaHora(t.inicio_min)} – {minutosParaHora(t.fim_min)}
                  {Number(t.kg) > 0 ? ` · ${Number(t.kg).toFixed(1)} kg` : ''}
                  {nomeEquip(t.equipamento_id) ? ` · ${nomeEquip(t.equipamento_id)}` : ''}
                </p>
                {t.fichas.length > 0 && <p className="mt-1 text-sm">{t.fichas.map(f => f.nome).join(' · ')}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {t.vespera && <Badge variant="secondary">Véspera</Badge>}
                  {!t.concluida && !t.iniciado_em && (
                    <Button size="sm" variant="outline" onClick={() => iniciar.mutate(t)}>Iniciar</Button>
                  )}
                  {!t.concluida && t.iniciado_em && <Badge variant="outline">A decorrer</Badge>}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }


  const porPessoa = new Map<string, PlanoTarefa[]>();
  for (const t of doDia) {
    const k = t.funcionario_id ?? SEM_PESSOA;
    (porPessoa.get(k) ?? porPessoa.set(k, []).get(k)!).push(t);
  }
  const equipamentosUsados = Array.from(
    new Set(doDia.filter(t => t.equipamento_id).map(t => t.equipamento_id!)),
  );

  const emFalta = dados?.emFalta ?? [];
  const podeGerar = !!previsto;

  return (
    <div className="space-y-6 p-4 pb-24 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Plano do Dia</h1>
          <p className="text-sm text-muted-foreground">
            O que tem de acontecer na cozinha, hora a hora, para o serviço abrir a horas.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <input
            type="date"
            value={dataISO}
            onChange={e => setDataISO(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          />
          {podeGerir && (
            <Button
              onClick={() => previsto && dados?.aberturaMin !== null && dados &&
                guardar.mutate({ resultado: previsto, aberturaMin: dados.aberturaMin! })}
              disabled={!podeGerar || guardar.isPending}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {guardado?.plano ? 'Regenerar plano' : 'Gerar plano'}
            </Button>
          )}
          {podeGerir && guardado?.plano && (
            <Button variant="outline" size="icon" onClick={() => apagar.mutate(guardado.plano!.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      {isLoading && <Card className="p-6 text-muted-foreground">A recolher a informação do dia…</Card>}

      {!isLoading && emFalta.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5 p-4">
          <div className="mb-2 flex items-center gap-2 font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" /> Falta informação para gerar o plano
          </div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
            {emFalta.map(m => <li key={m}>{m}</li>)}
          </ul>
        </Card>
      )}

      {!isLoading && dados && (
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
            <Resumo titulo="Abertura do serviço" valor={minutosParaHora(dados.aberturaMin)} />
            <Resumo titulo="Pratos a produzir" valor={String(dados.necessidades.length)} />
            <Resumo
              titulo="Quilos totais"
              valor={`${dados.necessidades.reduce((s, n) => s + n.kg, 0).toFixed(1)} kg`}
            />
            <Resumo titulo="Pessoas ao trabalho" valor={String(dados.pessoas.length)} />
            <Resumo
              titulo="Abatedor"
              valor={`${(guardado?.plano?.resumo?.minutosAbatedor ?? previsto?.resumo.minutosAbatedor ?? 0)} min`}
            />
          </div>
          {dados.pessoas.length > 0 && (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {dados.pessoas.map(p => (
                <span key={p.id}>
                  {p.nome} {minutosParaHora(p.inicio_min)}–{minutosParaHora(p.fim_min)}
                </span>
              ))}
            </p>
          )}
        </Card>
      )}

      {previsto && !guardado?.plano && (
        <Card className="border-primary/40 bg-primary/5 p-4 text-sm">
          <div className="flex items-center gap-2 font-medium"><Info className="h-4 w-4" /> Pré-visualização</div>
          <p className="mt-1 text-muted-foreground">
            {previsto.resumo.tarefas} tarefas agrupadas · {previsto.resumo.minutosPessoa} min de pessoa ·{' '}
            {previsto.resumo.minutosRelogio} min de relógio · {previsto.resumo.tarefasVespera} de véspera.
            Carregue em Gerar plano para guardar.
          </p>
        </Card>
      )}

      {(guardado?.plano?.avisos ?? previsto?.avisos ?? []).map(a => (
        <Card key={a} className="border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>{a}</span>
          </div>
        </Card>
      ))}

      {vespera.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 font-serif text-xl">
            <Moon className="h-5 w-5" /> Fazer de véspera
            <Badge variant="secondary">{vespera.length}</Badge>
          </h2>
          <Card className="divide-y">
            {vespera.map(t => (
              <LinhaTarefa
                key={t.id} t={t} podeGerir={podeGerir}
                funcionarios={dados?.funcionarios ?? []}
                nomeZona={nomeZona} nomeEquip={nomeEquip}
                onPessoa={id => reatribuir.mutate({ id: t.id, funcionario_id: id })}
                onConcluir={v => concluir.mutate({ id: t.id, concluida: v, origem: t.origem, tarefa_id: t.tarefa_id })}
              />
            ))}
          </Card>
        </section>
      )}

      {doDia.length > 0 && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 font-serif text-xl">
            <CalendarClock className="h-5 w-5" /> Linha do tempo por pessoa
          </h2>
          {[...porPessoa.entries()].map(([pid, lista]) => {
            const pessoa = dados?.pessoas.find(p => p.id === pid);
            const turno = pessoa ? Math.max(0, pessoa.fim_min - pessoa.inicio_min) : 0;
            const minTarefas = lista.filter(t => t.origem === 'tarefa').reduce((s, t) => s + Number(t.duracao_min), 0);
            const minProducao = lista.filter(t => t.origem !== 'tarefa').reduce((s, t) => s + Number(t.duracao_min), 0);
            const livre = Math.max(0, turno - minTarefas - minProducao);
            return (
            <Card key={pid} className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2">
                <span className="font-medium">{pid === SEM_PESSOA ? 'Por atribuir' : nomePessoa(pid)}</span>
                <span className="text-xs text-muted-foreground">
                  {minTarefas} min em tarefas · {minProducao} min de produção
                  {turno > 0 ? ` · ${livre} min livres de ${turno}` : ''}
                </span>
              </div>

              <div className="divide-y">
                {lista
                  .sort((a, b) => (a.inicio_min ?? 0) - (b.inicio_min ?? 0))
                  .map(t => (
                    <LinhaTarefa
                      key={t.id} t={t} podeGerir={podeGerir}
                      funcionarios={dados?.funcionarios ?? []}
                      nomeZona={nomeZona} nomeEquip={nomeEquip}
                      onPessoa={id => reatribuir.mutate({ id: t.id, funcionario_id: id })}
                      onConcluir={v => concluir.mutate({ id: t.id, concluida: v, origem: t.origem, tarefa_id: t.tarefa_id })}
                    />
                  ))}
              </div>
            </Card>
            );
          })}

        </section>
      )}

      {equipamentosUsados.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 font-serif text-xl">
            <Clock className="h-5 w-5" /> Ocupação dos equipamentos
          </h2>
          <Card className="divide-y">
            {equipamentosUsados.map(eid => {
              const lista = doDia.filter(t => t.equipamento_id === eid)
                .sort((a, b) => (a.inicio_min ?? 0) - (b.inicio_min ?? 0));
              return (
                <div key={eid} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{nomeEquip(eid)}</span>
                    <span className="text-xs text-muted-foreground">
                      {lista.reduce((s, t) => s + Number(t.duracao_min), 0)} min ocupado
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {lista.map(t => (
                      <span key={t.id} className="rounded bg-muted px-2 py-0.5">
                        {minutosParaHora(t.inicio_min)}–{minutosParaHora(t.fim_min)} · {t.descricao}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {!isLoading && !guardado?.plano && !previsto && emFalta.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground">
          Ainda não há plano para este dia.
        </Card>
      )}
    </div>
  );
}

function Resumo({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className="font-serif text-lg">{valor}</p>
    </div>
  );
}

function LinhaTarefa({
  t, podeGerir, funcionarios, nomeZona, nomeEquip, onPessoa, onConcluir,
}: {
  t: PlanoTarefa;
  podeGerir: boolean;
  funcionarios: { id: string; nome: string }[];
  nomeZona: (id: string | null) => string | null;
  nomeEquip: (id: string | null) => string | null;
  onPessoa: (id: string | null) => void;
  onConcluir: (v: boolean) => void;
}) {
  const detalhes = [nomeZona(t.zona_id), nomeEquip(t.equipamento_id)].filter(Boolean).join(' · ');
  return (
    <div className={`flex flex-wrap items-start gap-3 px-4 py-3 ${t.concluida ? 'opacity-60' : ''}`}>
      <Checkbox checked={t.concluida} onCheckedChange={v => onConcluir(!!v)} className="mt-1" />
      <div className="min-w-[200px] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{t.descricao}</span>
          <Badge variant={t.tipo_passo === 'espera' ? 'secondary' : 'outline'}>
            {t.tipo_passo === 'espera' ? 'Espera' : 'Activo'}
          </Badge>
          <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${t.origem === 'tarefa' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
            {t.origem === 'tarefa' ? 'Tarefa' : 'Produção'}
          </span>
          {t.fichas.length > 1 && <Badge variant="secondary">Agrupada · {t.fichas.length} pratos</Badge>}

          {t.concluida && <CheckCircle2 className="h-4 w-4 text-primary" />}
        </div>
        <p className="text-xs text-muted-foreground">
          {t.vespera ? 'Véspera' : `${minutosParaHora(t.inicio_min)} – ${minutosParaHora(t.fim_min)}`} ·{' '}
          {Number(t.duracao_min)} min · {Number(t.kg).toFixed(1)} kg{detalhes ? ` · ${detalhes}` : ''}
          {t.notas ? ` · ${t.notas}` : ''}
        </p>
        <p className="mt-0.5 text-xs">{t.fichas.map(f => `${f.nome} (${f.kg.toFixed(1)} kg)`).join(' · ')}</p>
      </div>
      {podeGerir && (
        <Select
          value={t.funcionario_id ?? SEM_PESSOA}
          onValueChange={v => onPessoa(v === SEM_PESSOA ? null : v)}
        >
          <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={SEM_PESSOA}>Por atribuir</SelectItem>
            {funcionarios.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
