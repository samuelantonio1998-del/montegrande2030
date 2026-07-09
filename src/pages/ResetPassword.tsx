import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase parses the recovery token from the URL hash automatically
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async () => {
    if (password.length < 8) {
      toast.error('A palavra-passe deve ter pelo menos 8 caracteres');
      return;
    }
    if (password !== confirm) {
      toast.error('As palavras-passe não coincidem');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Palavra-passe atualizada');
    navigate('/', { replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="font-display text-2xl text-foreground">Nova palavra-passe</h1>
          <p className="mt-1 text-sm text-muted-foreground">Defina a sua nova palavra-passe de administrador.</p>
        </div>
        {!ready && (
          <p className="text-center text-xs text-muted-foreground">A validar link de recuperação…</p>
        )}
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="new-password">Nova palavra-passe</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm-password">Confirmar palavra-passe</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <Button onClick={handleSubmit} disabled={busy || !ready} className="w-full">
            Guardar
          </Button>
        </div>
      </div>
    </main>
  );
}
