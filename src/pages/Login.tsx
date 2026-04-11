import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Delete } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      if (!login(next)) {
        setError(true);
        setTimeout(() => { setPin(''); setError(false); }, 800);
      }
    }
  };

  const handleDelete = () => {
    setPin(p => p.slice(0, -1));
    setError(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm space-y-8"
      >
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <span className="text-2xl font-bold text-primary-foreground">R</span>
          </div>
          <h1 className="mt-4 font-display text-3xl text-foreground">RestoGest</h1>
          <p className="mt-1 text-muted-foreground">Introduza o seu PIN</p>
        </div>

        {/* PIN dots */}
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

        {/* Keypad */}
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

      </motion.div>
    </main>
  );
}
