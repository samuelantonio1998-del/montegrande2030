import { useState } from 'react';
import { MessageSquarePlus, Bug, Lightbulb, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function FeedbackDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<'erro' | 'melhoria'>('erro');
  const [mensagem, setMensagem] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!mensagem.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from('feedback' as any).insert({
        tipo,
        mensagem: mensagem.trim(),
        user_name: user?.name || '',
        user_role: user?.role || '',
      });
      if (error) throw error;
      toast.success('Feedback enviado! A gerência será notificada.');
      setMensagem('');
      setOpen(false);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao enviar feedback');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Reportar erro ou sugestão">
          <MessageSquarePlus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            Reportar
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTipo('erro')}
              className={`rounded-lg border-2 p-3 text-center transition-all ${tipo === 'erro' ? 'border-destructive bg-destructive/5' : 'border-border'}`}
            >
              <Bug className={`mx-auto h-5 w-5 mb-1 ${tipo === 'erro' ? 'text-destructive' : 'text-muted-foreground'}`} />
              <p className="text-xs font-medium">Erro</p>
            </button>
            <button
              onClick={() => setTipo('melhoria')}
              className={`rounded-lg border-2 p-3 text-center transition-all ${tipo === 'melhoria' ? 'border-primary bg-primary/5' : 'border-border'}`}
            >
              <Lightbulb className={`mx-auto h-5 w-5 mb-1 ${tipo === 'melhoria' ? 'text-primary' : 'text-muted-foreground'}`} />
              <p className="text-xs font-medium">Melhoria</p>
            </button>
          </div>
          <Textarea
            placeholder={tipo === 'erro' ? 'Descreva o que aconteceu...' : 'Descreva a sua sugestão...'}
            value={mensagem}
            onChange={e => setMensagem(e.target.value)}
            rows={4}
          />
          <Button className="w-full gap-2" onClick={handleSubmit} disabled={!mensagem.trim() || sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
