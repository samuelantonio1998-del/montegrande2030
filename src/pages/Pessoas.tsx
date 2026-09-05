import { useMemo, useState } from 'react';
import { KeyRound, Loader2, Lock, Plus, Search, ShieldCheck, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useUnidade } from '@/contexts/UnidadeContext';
import {
  usePessoas, usePapeis, usePessoaMutations, type Pessoa, type Papel,
} from '@/hooks/usePessoas';

const SEM_UNIDADE = '__nenhuma__';
const SEM_PAPEL = '__sem_papel__';

const pinValido = (pin: string) => /^\d{4,6}$/.test(pin);

export default function Pessoas() {
  const { unidades } = useUnidade();
  const { data, isLoading } = usePessoas();
  const pessoas = data?.pessoas ?? [];
  const papeisLista = data?.papeis ?? [];
  const m = usePessoaMutations();

  const [pesquisa, setPesquisa] = useState('');
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [dialogoPessoa, setDialogoPessoa] = useState<'nova' | 'editar' | null>(null);
  const [alvo, setAlvo] = useState<Pessoa | null>(null);
  const [pinAlvo, setPinAlvo] = useState<Pessoa | null>(null);
  const [passAlvo, setPassAlvo] = useState<Pessoa | null>(null);

  const [form, setForm] = useState({
    nome: '', email: '', password: '', pin: '',
    unidade_id: SEM_UNIDADE, role_id: SEM_PAPEL,
  });
  const [pinNovo, setPinNovo] = useState('');
  const [passNova, setPassNova] = useState('');

  const lista = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase();
    return pessoas
      .filter(p => mostrarInativos || p.ativo)
      .filter(p => !termo
        || p.nome.toLowerCase().includes(termo)
        || (p.email ?? '').toLowerCase().includes(termo));
  }, [pessoas, pesquisa, mostrarInativos]);

  const abrirNova = () => {
    setForm({ nome: '', email: '', password: '', pin: '', unidade_id: SEM_UNIDADE, role_id: SEM_PAPEL });
    setDialogoPessoa('nova');
  };

  const abrirEditar = (p: Pessoa) => {
    setAlvo(p);
    setForm({
      nome: p.nome, email: p.email ?? '', password: '', pin: '',
      unidade_id: p.unidade_id ?? SEM_UNIDADE, role_id: p.role_id ?? SEM_PAPEL,
    });
    setDialogoPessoa('editar');
  };

  const tipoAcesso = (p: Pessoa) => {
    if (p.tem_pin && p.tem_conta) return 'PIN + conta de gestão';
    if (p.tem_pin) return 'PIN de cozinha';
    if (p.tem_conta) return 'Conta de gestão';
    return 'Sem acesso';
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-foreground">Pessoas</h1>
        <p className="mt-1 text-muted-foreground">Equipa, acessos e papéis de permissões.</p>
      </header>

      <Tabs defaultValue="pessoas">
        <TabsList>
          <TabsTrigger value="pessoas">Pessoas</TabsTrigger>
          <TabsTrigger value="papeis">Papéis</TabsTrigger>
        </TabsList>

        {/* ---------------- Pessoas ---------------- */}
        <TabsContent value="pessoas" className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder="Pesquisar nome ou email" className="pl-9" />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch checked={mostrarInativos} onCheckedChange={setMostrarInativos} />
              Mostrar inativos
            </label>
            <Button onClick={abrirNova}><Plus className="mr-2 h-4 w-4" /> Nova pessoa</Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : lista.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma pessoa encontrada.</p>
          ) : (
            <div className="space-y-3">
              {lista.map(p => (
                <div key={p.key} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{p.nome}</span>
                        <Badge variant="secondary" className="text-xs">{p.role_nome ?? 'Sem papel'}</Badge>
                        {!p.ativo && <Badge variant="outline" className="text-xs">Inativo</Badge>}
                      </div>
                      {p.email && <p className="truncate text-sm text-muted-foreground">{p.email}</p>}
                      <p className="text-xs text-muted-foreground">
                        {p.unidade_nome ?? 'Sem local associado'} · {tipoAcesso(p)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => abrirEditar(p)}>
                        <UserCog className="mr-1.5 h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setPinNovo(''); setPinAlvo(p); }}>
                        <KeyRound className="mr-1.5 h-3.5 w-3.5" /> {p.tem_pin ? 'Novo PIN' : 'Definir PIN'}
                      </Button>
                      {p.tem_conta && (
                        <Button size="sm" variant="outline" onClick={() => { setPassNova(''); setPassAlvo(p); }}>
                          <Lock className="mr-1.5 h-3.5 w-3.5" /> Password
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => m.definirEstado.mutate({
                          action: 'pessoa_set_active',
                          funcionario_id: p.funcionario_id,
                          user_id: p.user_id,
                          ativo: !p.ativo,
                        })}
                      >
                        {p.ativo ? 'Desativar' : 'Reativar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm(`Apagar ${p.nome}? Se tiver registos operacionais, desative em vez de apagar.`)) {
                            m.apagarPessoa.mutate({
                              action: 'pessoa_delete',
                              funcionario_id: p.funcionario_id,
                              user_id: p.user_id,
                              nome: p.nome,
                            });
                          }
                        }}
                      >
                        Apagar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---------------- Papéis ---------------- */}
        <TabsContent value="papeis" className="pt-4">
          <PainelPapeis />
        </TabsContent>
      </Tabs>

      {/* Nova / editar pessoa */}
      <Dialog open={!!dialogoPessoa} onOpenChange={o => { if (!o) { setDialogoPessoa(null); setAlvo(null); } }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogoPessoa === 'nova' ? 'Nova pessoa' : 'Editar pessoa'}</DialogTitle>
            <DialogDescription>
              {dialogoPessoa === 'nova'
                ? 'Uma pessoa pode ter PIN de cozinha, conta de gestão, ou ambos.'
                : alvo?.nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
            <div>
              <Label>Papel</Label>
              <Select value={form.role_id} onValueChange={v => setForm({ ...form, role_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_PAPEL}>Sem papel</SelectItem>
                  {papeisLista.filter(r => r.ativo).map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Local</Label>
              <Select value={form.unidade_id} onValueChange={v => setForm({ ...form, unidade_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_UNIDADE}>Sem local</SelectItem>
                  {unidades.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {dialogoPessoa === 'nova' && (
              <>
                <div>
                  <Label>PIN de cozinha (opcional, 4 a 6 dígitos)</Label>
                  <Input
                    value={form.pin}
                    inputMode="numeric"
                    maxLength={6}
                    onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    placeholder="Ex: 1234"
                  />
                </div>
                <div><Label>Email da conta de gestão (opcional)</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                {form.email && (
                  <div><Label>Password</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 8 caracteres" /></div>
                )}
              </>
            )}

            {dialogoPessoa === 'editar' && alvo && !alvo.tem_conta && (
              <>
                <div><Label>Criar conta de gestão (opcional)</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.pt" /></div>
                {form.email && (
                  <div><Label>Password</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 8 caracteres" /></div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogoPessoa(null); setAlvo(null); }}>Cancelar</Button>
            <Button
              disabled={!form.nome.trim()
                || (dialogoPessoa === 'nova' && !form.pin && !form.email)
                || (!!form.email && form.password.length < 8 && (dialogoPessoa === 'nova' || !alvo?.tem_conta))
                || (!!form.pin && !pinValido(form.pin))}
              onClick={() => {
                const base = {
                  nome: form.nome.trim(),
                  role_id: form.role_id === SEM_PAPEL ? null : form.role_id,
                  unidade_id: form.unidade_id === SEM_UNIDADE ? null : form.unidade_id,
                };
                if (dialogoPessoa === 'nova') {
                  m.guardarPessoa.mutate({
                    action: 'pessoa_create',
                    ...base,
                    pin: form.pin || null,
                    email: form.email || null,
                    password: form.password || null,
                  }, { onSuccess: () => setDialogoPessoa(null) });
                  return;
                }
                if (!alvo) return;
                m.guardarPessoa.mutate({
                  action: 'pessoa_update',
                  funcionario_id: alvo.funcionario_id,
                  user_id: alvo.user_id,
                  ...base,
                }, {
                  onSuccess: () => {
                    if (form.email && !alvo.tem_conta && alvo.funcionario_id) {
                      m.guardarPessoa.mutate({
                        action: 'pessoa_add_conta',
                        funcionario_id: alvo.funcionario_id,
                        email: form.email,
                        password: form.password,
                        nome: base.nome,
                        unidade_id: base.unidade_id,
                        role_id: base.role_id,
                      });
                    }
                    setDialogoPessoa(null);
                    setAlvo(null);
                  },
                });
              }}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIN */}
      <Dialog open={!!pinAlvo} onOpenChange={o => { if (!o) setPinAlvo(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>PIN de cozinha</DialogTitle>
            <DialogDescription>{pinAlvo?.nome}</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Novo PIN (4 a 6 dígitos)</Label>
            <Input value={pinNovo} inputMode="numeric" maxLength={6} type="password"
              onChange={e => setPinNovo(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinAlvo(null)}>Cancelar</Button>
            <Button
              disabled={!pinValido(pinNovo)}
              onClick={() => pinAlvo && m.definirPin.mutate({
                action: 'pessoa_set_pin',
                funcionario_id: pinAlvo.funcionario_id,
                nome: pinAlvo.nome,
                role_id: pinAlvo.role_id,
                unidade_id: pinAlvo.unidade_id,
                pin: pinNovo,
              }, { onSuccess: () => setPinAlvo(null) })}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password */}
      <Dialog open={!!passAlvo} onOpenChange={o => { if (!o) setPassAlvo(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir password</DialogTitle>
            <DialogDescription>{passAlvo?.email}</DialogDescription>
          </DialogHeader>
          <div><Label>Nova password</Label><Input type="password" value={passNova} onChange={e => setPassNova(e.target.value)} placeholder="Mínimo 8 caracteres" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPassAlvo(null)}>Cancelar</Button>
            <Button
              disabled={passNova.length < 8}
              onClick={() => passAlvo?.user_id && m.definirPassword.mutate(
                { action: 'pessoa_set_password', user_id: passAlvo.user_id, password: passNova },
                { onSuccess: () => setPassAlvo(null) },
              )}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================= Papéis ================= */

function PainelPapeis() {
  const { data, isLoading } = usePapeis();
  const m = usePessoaMutations();
  const papeis = data?.papeis ?? [];
  const permissoes = data?.permissoes ?? [];
  const ligacoes = data?.ligacoes ?? [];

  const [novo, setNovo] = useState(false);
  const [editar, setEditar] = useState<Papel | null>(null);
  const [form, setForm] = useState({ nome: '', chave: '', descricao: '' });
  const [selecionadas, setSelecionadas] = useState<string[]>([]);

  const permsDoPapel = (roleId: string) =>
    ligacoes.filter(l => l.role_id === roleId).map(l => l.permissao_id);

  const abrirEditar = (p: Papel) => {
    setForm({ nome: p.nome, chave: p.chave, descricao: p.descricao ?? '' });
    setSelecionadas(permsDoPapel(p.id));
    setEditar(p);
  };

  const alternar = (id: string) =>
    setSelecionadas(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setForm({ nome: '', chave: '', descricao: '' }); setSelecionadas([]); setNovo(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Novo papel
        </Button>
      </div>

      <div className="space-y-3">
        {papeis.map(p => {
          const total = permsDoPapel(p.id).length;
          return (
            <div key={p.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{p.nome}</span>
                    <Badge variant="outline" className="text-xs">{p.chave}</Badge>
                    {p.is_base && <Badge variant="secondary" className="text-xs">Base</Badge>}
                  </div>
                  {p.descricao && <p className="text-sm text-muted-foreground">{p.descricao}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    <ShieldCheck className="mr-1 inline h-3 w-3" />
                    {total} permiss{total === 1 ? 'ão' : 'ões'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => abrirEditar(p)}>Editar</Button>
                  {!p.is_base && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => {
                        if (confirm(`Apagar o papel ${p.nome}?`)) {
                          m.apagarPapel.mutate({ action: 'role_delete', id: p.id });
                        }
                      }}
                    >
                      Apagar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog
        open={novo || !!editar}
        onOpenChange={o => { if (!o) { setNovo(false); setEditar(null); } }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editar ? `Editar papel — ${editar.nome}` : 'Novo papel'}</DialogTitle>
            <DialogDescription>Escolha as permissões deste papel.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
            <div>
              <Label>Chave</Label>
              <Input
                value={form.chave}
                disabled={!!editar?.is_base}
                onChange={e => setForm({ ...form, chave: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                placeholder="ex: cozinheiro"
              />
              {editar?.is_base && <p className="mt-1 text-xs text-muted-foreground">A chave de um papel base não pode ser alterada.</p>}
            </div>
            <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={2} /></div>
            <div className="space-y-2">
              <Label>Permissões</Label>
              <div className="space-y-2 rounded-lg border border-border p-3">
                {permissoes.map(perm => (
                  <label key={perm.id} className="flex items-start gap-2 text-sm">
                    <Checkbox checked={selecionadas.includes(perm.id)} onCheckedChange={() => alternar(perm.id)} />
                    <span>
                      <span className="text-foreground">{perm.descricao}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground">{perm.chave}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNovo(false); setEditar(null); }}>Cancelar</Button>
            <Button
              disabled={!form.nome.trim() || !form.chave.trim()}
              onClick={() => {
                if (editar) {
                  m.guardarPapel.mutate({
                    action: 'role_update',
                    id: editar.id,
                    nome: form.nome.trim(),
                    chave: editar.is_base ? undefined : form.chave.trim(),
                    descricao: form.descricao || null,
                  }, {
                    onSuccess: () => {
                      m.guardarPermissoes.mutate({ action: 'role_set_permissoes', id: editar.id, permissoes: selecionadas });
                      setEditar(null);
                    },
                  });
                  return;
                }
                m.guardarPapel.mutate({
                  action: 'role_create',
                  nome: form.nome.trim(),
                  chave: form.chave.trim(),
                  descricao: form.descricao || null,
                  permissoes: selecionadas,
                }, { onSuccess: () => setNovo(false) });
              }}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
