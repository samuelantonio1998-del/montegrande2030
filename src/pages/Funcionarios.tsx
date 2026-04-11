import { useState } from 'react';
import { Plus, Trash2, Users, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/lib/toast-with-sound';
import { type UserRole, type AppUser } from '@/contexts/AuthContext';
import { useEmployees } from '@/hooks/useEmployees';
import { motion } from 'framer-motion';

const roleLabels: Record<UserRole, string> = {
  sala: 'Sala',
  cozinha: 'Cozinha',
  gerencia: 'Gerência',
};

const roleBadgeClass: Record<UserRole, string> = {
  sala: 'bg-primary/10 text-primary border-primary/20',
  cozinha: 'bg-warning/10 text-warning border-warning/20',
  gerencia: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function Funcionarios() {
  const { employees, addEmployee, removeEmployee, updateRole, updateName } = useEmployees();

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('sala');
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [editingPin, setEditingPin] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleAdd = () => {
    if (!newName.trim() || !newPin.trim()) {
      toast.error('Preencha nome e PIN');
      return;
    }
    if (newPin.length < 4) {
      toast.error('O PIN deve ter pelo menos 4 dígitos');
      return;
    }
    const success = addEmployee({ name: newName.trim(), pin: newPin.trim(), role: newRole });
    if (success) {
      setShowAdd(false);
      setNewName('');
      setNewPin('');
      setNewRole('sala');
      toast.success('Funcionário adicionado');
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    removeEmployee(deleteTarget.pin);
    setDeleteTarget(null);
    toast.success('Funcionário removido');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display text-foreground">Funcionários</h1>
          <p className="text-sm text-muted-foreground">Gerir acessos e permissões da equipa</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>PIN</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map(emp => (
              <TableRow key={emp.pin}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                      {emp.name[0]}
                    </div>
                    <span className="font-medium text-foreground">{emp.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-foreground">{emp.pin}</code>
                </TableCell>
                <TableCell>
                  <Select
                    value={emp.role}
                    onValueChange={(val: UserRole) => {
                      updateRole(emp.pin, val);
                      toast.success(`Perfil de ${emp.name} alterado para ${roleLabels[val]}`);
                    }}
                  >
                    <SelectTrigger className="w-[130px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sala">🏠 Sala</SelectItem>
                      <SelectItem value="cozinha">👨‍🍳 Cozinha</SelectItem>
                      <SelectItem value="gerencia">📊 Gerência</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(emp)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {employees.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum funcionário registado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </motion.div>

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Novo Funcionário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-muted-foreground">Nome</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome do funcionário" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">PIN de acesso</label>
              <Input value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} placeholder="Ex: 1234" maxLength={6} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Perfil de acesso</label>
              <Select value={newRole} onValueChange={(v: UserRole) => setNewRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sala">🏠 Sala</SelectItem>
                  <SelectItem value="cozinha">👨‍🍳 Cozinha</SelectItem>
                  <SelectItem value="gerencia">📊 Gerência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={!newName.trim() || !newPin.trim()}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover funcionário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja remover <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
