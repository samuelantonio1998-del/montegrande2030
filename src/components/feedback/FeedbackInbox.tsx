import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Bug, Lightbulb, Check, Clock, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast-with-sound';

type FeedbackItem = {
  id: string;
  tipo: string;
  mensagem: string;
  user_name: string;
  user_role: string;
  estado: string;
  resposta: string | null;
  created_at: string;
};

export default function FeedbackInbox() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [responding, setResponding] = useState<string | null>(null);
  const [resposta, setResposta] = useState('');

  const fetchFeedback = useCallback(async () => {
    const { data } = await supabase.from('feedback' as any).select('*').order('created_at', { ascending: false }).limit(50);
    if (data) setItems(data as unknown as FeedbackItem[]);
  }, []);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

  const updateEstado = async (id: string, estado: string, respostaText?: string) => {
    const payload: any = { estado };
    if (respostaText !== undefined) payload.resposta = respostaText;
    await supabase.from('feedback' as any).update(payload).eq('id', id);
    toast.success(estado === 'resolvido' ? 'Marcado como resolvido' : 'Estado atualizado');
    fetchFeedback();
    setResponding(null);
    setResposta('');
  };

  const pendingCount = items.filter(i => i.estado === 'pendente').length;

  const estadoConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    pendente: { label: 'Pendente', color: 'bg-warning/10 text-warning', icon: Clock },
    visto: { label: 'Visto', color: 'bg-primary/10 text-primary', icon: Eye },
    resolvido: { label: 'Resolvido', color: 'bg-success/10 text-success', icon: Check },
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="mx-auto h-8 w-8 mb-2" />
        <p className="text-sm">Sem feedback recebido</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          Feedback ({pendingCount} pendente{pendingCount !== 1 ? 's' : ''})
        </h3>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {items.map(item => {
          const cfg = estadoConfig[item.estado] || estadoConfig.pendente;
          return (
            <div key={item.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {item.tipo === 'erro' ? <Bug className="h-4 w-4 text-destructive shrink-0" /> : <Lightbulb className="h-4 w-4 text-primary shrink-0" />}
                  <div>
                    <p className="text-sm text-foreground">{item.mensagem}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {item.user_name} ({item.user_role}) · {new Date(item.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={cn('text-[10px] shrink-0', cfg.color)}>
                  {cfg.label}
                </Badge>
              </div>
              {item.resposta && (
                <div className="rounded bg-muted/50 p-2 text-xs text-foreground">
                  💬 {item.resposta}
                </div>
              )}
              {responding === item.id ? (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Resposta..."
                    value={resposta}
                    onChange={e => setResposta(e.target.value)}
                    rows={2}
                    className="text-xs"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setResponding(null)}>Cancelar</Button>
                    <Button size="sm" onClick={() => updateEstado(item.id, 'resolvido', resposta)}>
                      Responder e resolver
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  {item.estado === 'pendente' && (
                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => updateEstado(item.id, 'visto')}>
                      <Eye className="h-3 w-3 mr-1" /> Marcar visto
                    </Button>
                  )}
                  {item.estado !== 'resolvido' && (
                    <>
                      <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setResponding(item.id)}>
                        💬 Responder
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs h-7 text-success" onClick={() => updateEstado(item.id, 'resolvido')}>
                        <Check className="h-3 w-3 mr-1" /> Resolver
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
