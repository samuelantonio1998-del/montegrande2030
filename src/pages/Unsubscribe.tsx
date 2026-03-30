import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { MailX, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'valid' | 'already' | 'invalid' | 'done' | 'error'>('loading');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`, {
      headers: { apikey: anonKey },
    })
      .then(r => r.json())
      .then(data => {
        if (data.valid === false && data.reason === 'already_unsubscribed') setStatus('already');
        else if (data.valid) setStatus('valid');
        else setStatus('invalid');
      })
      .catch(() => setStatus('error'));
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setProcessing(true);
    try {
      const { data } = await supabase.functions.invoke('handle-email-unsubscribe', { body: { token } });
      if (data?.success) setStatus('done');
      else if (data?.reason === 'already_unsubscribed') setStatus('already');
      else setStatus('error');
    } catch { setStatus('error'); }
    setProcessing(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {status === 'loading' && <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />}
        {status === 'valid' && (
          <>
            <MailX className="h-12 w-12 mx-auto text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Cancelar subscrição</h1>
            <p className="text-muted-foreground">Tem a certeza que deseja deixar de receber emails?</p>
            <Button onClick={handleUnsubscribe} disabled={processing} size="lg">
              {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Confirmar
            </Button>
          </>
        )}
        {status === 'done' && (
          <>
            <CheckCircle2 className="h-12 w-12 mx-auto text-success" />
            <h1 className="text-2xl font-bold text-foreground">Subscrição cancelada</h1>
            <p className="text-muted-foreground">Não receberá mais emails nossos.</p>
          </>
        )}
        {status === 'already' && (
          <>
            <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-bold text-foreground">Já cancelado</h1>
            <p className="text-muted-foreground">Esta subscrição já foi cancelada anteriormente.</p>
          </>
        )}
        {(status === 'invalid' || status === 'error') && (
          <>
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
            <h1 className="text-2xl font-bold text-foreground">Link inválido</h1>
            <p className="text-muted-foreground">Este link de cancelamento é inválido ou expirou.</p>
          </>
        )}
      </div>
    </div>
  );
}
