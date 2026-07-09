import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Delete } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Login() {
  const { login, loginAdmin, requestAdminReset } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('samuelantonio1998@hotmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminBusy, setAdminBusy] = useState(false);

  const handleDigit = async (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      const success = await login(next);
      if (!success) {
        setError(true);
        setTimeout(() => { setPin(''); setError(false); }, 800);
      }
    }
  };

  const handleDelete = () => {
    setPin(p => p.slice(0, -1));
    setError(false);
  };

  const handleAdminLogin = async () => {
    setAdminBusy(true);
    const res = await loginAdmin(adminEmail.trim(), adminPassword);
    setAdminBusy(false);
    if (!res.ok) {
      toast.error(res.error ?? 'Falha ao entrar');
      return;
    }
    setAdminOpen(false);
  };

  const handleAdminReset = async () => {
    if (!adminEmail.trim()) return;
    setAdminBusy(true);
    const res = await requestAdminReset(adminEmail.trim());
    setAdminBusy(false);
    if (!res.ok) {
      toast.error(res.error ?? 'Falha ao enviar email');
      return;
    }
    toast.success('Email de recuperação enviado');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <span className="text-2xl font-bold text-primary-foreground">R</span>
          </div>
          <h1 className="mt-4 font-display text-3xl text-foreground">RestoGest</h1>
          <p className="mt-1 text-muted-foreground">Introduza o seu PIN</p>
        </div>

        <div className="flex justify-center gap-4">
          {[0, 1, 2, 3].map(i => (
            <motion.div
              key={i}
              animate={error ? { x: [0, -8, 8, -4, 4, 0] } : {}}
              transition={{ duration: 0.4 }}
              className={cn(
                'h-4 w-4 rounded-full border-2 transition-all',
                i < pin.length
                  ? error ? 'border-destructive bg-destructive' : 'border-primary bg-primary'
                  : 'border-border bg-transparent'
              )}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {['1','2','3','4','5','6','7','8','9','','0','del'].map((key) => {
            if (key === '') return <div key="empty" />;
            if (key === 'del') return (
              <button
                key="del"
                onClick={handleDelete}
                aria-label="Apagar dígito"
                className="flex h-16 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors hover:bg-muted/80 active:scale-95"
              >
                <Delete className="h-6 w-6" />
              </button>
            );
            return (
              <button
                key={key}
                onClick={() => handleDigit(key)}
                className="flex h-16 items-center justify-center rounded-xl bg-card border border-border text-xl font-semibold text-foreground transition-all hover:bg-muted active:scale-95"
              >
                {key}
              </button>
            );
          })}
        </div>

        <div className="text-center">
          <button
            onClick={() => setAdminOpen(true)}
            className="text-xs text-muted-foreground/70 hover:text-muted-foreground underline underline-offset-4"
          >
            Entrar como administrador
          </button>
        </div>
      </motion.div>

      <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Entrar como administrador</DialogTitle>
            <DialogDescription>Acesso reservado à gerência.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="admin-password">Palavra-passe</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
              />
            </div>
            <Button onClick={handleAdminLogin} disabled={adminBusy || !adminPassword} className="w-full">
              Entrar
            </Button>
            <button
              onClick={handleAdminReset}
              disabled={adminBusy}
              className="w-full text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              Enviar email de recuperação de palavra-passe
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
