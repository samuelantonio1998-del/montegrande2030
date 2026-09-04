import { useMemo, useState } from 'react';
import { Loader2, Plus, Search, ShieldCheck, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useUnidade } from '@/contexts/UnidadeContext';
import { useUtilizadores, useUtilizadorMutations, type UtilizadorGerido } from '@/hooks/useGestaoUtilizadores';

const PAPEIS = ['gerencia', 'cozinha', 'sala'] as const;
const SEM_UNIDADE = '__nenhuma__';

export default function GestaoFuncionarios() {
  const { unidades } = useUnidade();
  const { data: utilizadores = [], isLoading } = useUtilizadores();
  const m = useUtilizadorMutations();

  const [pesquisa, setPesquisa] = useState('');
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [novo, setNovo] = useState(false);
  const [editar, setEditar] = useState<UtilizadorGerido | null>(null);
  const [password, setPassword] = useState<UtilizadorGerido | null>(null);

  const [form, setForm] = useState({ nome: '', email: '', password: '', unidade_id: SEM_UNIDADE, role: 'gerencia' });
  const [novaPassword, setNovaPassword] = useState('');

  const lista = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase();
    return utilizadores
      .filter(u => mostrarInativos || u.ativo)
      .filter(u => !termo || u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo));
  }, [utilizadores, pesquisa, mostrarInativos]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-foreground">Gestão de Utilizadores</h1>
          <p className="mt-1 text-muted-foreground">Contas de acesso, papéis e estado.</p>
        </div>
        <Button onClick={() => { setForm({ nome: '', email: '', password: '', unidade_id: SEM_UNIDADE, role: 'gerencia' }); setNovo(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Novo utilizador
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={pesquisa} onChange={e => setPesquisa(e.target.value)} placeholder="Pesquisar nome ou email" className="pl-9" />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={mostrarInativos} onCheckedChange={setMostrarInativos} />
          Mostrar inativos
        </label>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : lista.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Nenhum utilizador encontrado.</p>
      ) : (
        <div className="space-y-3">
          {lista.map(u => (
            <div key={u.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{u.nome}</span>
                    {!u.ativo && <Badge variant="outline" className="text-xs">Inativo</Badge>}
                    {u.funcionario_id && <Badge variant="secondary" className="text-xs">PIN cozinha</Badge>}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                  <p className="text-xs text-muted-foreground">{u.unidade_nome ?? 'Sem local associado'}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {PAPEIS.map(p => {
                      const tem = u.roles.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => m.papel.mutate({ action: tem ? 'role_remove' : 'role_add', id: u.id, role: p })}
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
                            tem ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/50'
                          }`}
                        >
                          {tem && <ShieldCheck className="mr-1 inline h-3 w-3" />}{p}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setForm(f => ({ ...f, nome: u.nome, unidade_id: u.unidade_id ?? SEM_UNIDADE })); setEditar(u); }}>
                    <UserCog className="mr-1.5 h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setNovaPassword(''); setPassword(u); }}>Password</Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => m.definirEstado.mutate({ action: 'user_set_active', id: u.id, ativo: !u.ativo })}
                  >
                    {u.ativo ? 'Desativar' : 'Reativar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm(`Apagar ${u.nome}? Se tiver registos operacionais, desative em vez de apagar.`)) {
                        m.apagar.mutate({ action: 'user_delete', id: u.id });
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

      {/* Novo utilizador */}
      <Dialog open={novo} onOpenChange={setNovo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo utilizador</DialogTitle>
            <DialogDescription>Cria uma conta de acesso à gestão.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Password</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 8 caracteres" /></div>
            <div>
              <Label>Local principal</Label>
              <Select value={form.unidade_id} onValueChange={v => setForm({ ...form, unidade_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_UNIDADE}>Sem local</SelectItem>
                  {unidades.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Papel inicial</Label>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAPEIS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovo(false)}>Cancelar</Button>
            <Button
              disabled={!form.email || form.password.length < 8 || m.criar.isPending}
              onClick={() => {
                m.criar.mutate({
                  action: 'user_create',
                  email: form.email,
                  password: form.password,
                  nome: form.nome,
                  unidade_id: form.unidade_id === SEM_UNIDADE ? null : form.unidade_id,
                  roles: [form.role],
                }, { onSuccess: () => setNovo(false) });
              }}
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar */}
      <Dialog open={!!editar} onOpenChange={o => { if (!o) setEditar(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar utilizador</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
            <div>
              <Label>Local principal</Label>
              <Select value={form.unidade_id} onValueChange={v => setForm({ ...form, unidade_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_UNIDADE}>Sem local</SelectItem>
                  {unidades.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditar(null)}>Cancelar</Button>
            <Button
              onClick={() => editar && m.atualizar.mutate({
                action: 'user_update',
                id: editar.id,
                nome: form.nome,
                unidade_id: form.unidade_id === SEM_UNIDADE ? null : form.unidade_id,
              }, { onSuccess: () => setEditar(null) })}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password */}
      <Dialog open={!!password} onOpenChange={o => { if (!o) setPassword(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir password</DialogTitle>
            <DialogDescription>{password?.email}</DialogDescription>
          </DialogHeader>
          <div><Label>Nova password</Label><Input type="password" value={novaPassword} onChange={e => setNovaPassword(e.target.value)} placeholder="Mínimo 8 caracteres" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPassword(null)}>Cancelar</Button>
            <Button
              disabled={novaPassword.length < 8}
              onClick={() => password && m.definirPassword.mutate(
                { action: 'user_set_password', id: password.id, password: novaPassword },
                { onSuccess: () => setPassword(null) },
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
