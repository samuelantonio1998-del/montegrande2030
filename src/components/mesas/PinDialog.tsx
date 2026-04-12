import { useState } from 'react';
import { ShieldAlert, Delete } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/contexts/AuthContext';

type PinDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  allowedRoles?: ('sala' | 'cozinha' | 'gerencia')[];
  onAuthorized: (userName: string) => void;
};

export function PinDialog({ open, onOpenChange, title, description, allowedRoles, onAuthorized }: PinDialogProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = async (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      try {
        const { data } = await supabase.functions.invoke('verify-employee-role', {
          body: { pin: next, allowedRoles },
        });
        if (data?.success) {
          setPin('');
          onOpenChange(false);
          onAuthorized(data.nome);
        } else {
          setError(true);
          setTimeout(() => { setPin(''); setError(false); }, 800);
        }
      } catch {
        setError(true);
        setTimeout(() => { setPin(''); setError(false); }, 800);
      }
    }
  };

  const handleDelete = () => {
    setPin(p => p.slice(0, -1));
    setError(false);
  };

  const handleClose = (o: boolean) => {
    if (!o) { setPin(''); setError(false); }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            {title}
          </DialogTitle>
        </DialogHeader>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}

        <div className="flex justify-center gap-4 py-3">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={cn(
                'h-4 w-4 rounded-full border-2 transition-all',
                i < pin.length
                  ? error ? 'border-destructive bg-destructive' : 'border-primary bg-primary'
                  : 'border-border bg-transparent'
              )}
            />
          ))}
        </div>

        {error && <p className="text-center text-xs text-destructive">PIN inválido ou sem permissão</p>}

        <div className="grid grid-cols-3 gap-2">
          {['1','2','3','4','5','6','7','8','9','','0','del'].map(k => {
            if (k === '') return <div key="empty" />;
            if (k === 'del') return (
              <button key="del" onClick={handleDelete} className="flex items-center justify-center rounded-lg bg-muted h-12 active:scale-95 transition-transform">
                <Delete className="h-5 w-5 text-muted-foreground" />
              </button>
            );
            return (
              <button key={k} onClick={() => handleDigit(k)} className="flex items-center justify-center rounded-lg bg-muted h-12 text-lg font-semibold text-foreground active:scale-95 transition-transform hover:bg-muted/80">
                {k}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
