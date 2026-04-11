import { useState } from 'react';
import { MessageSquarePlus, Bot, Bug, Lightbulb, Send, Loader2, X, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import ReactMarkdown from 'react-markdown';

type Mode = 'menu' | 'feedback' | 'ai';
type ChatMsg = { role: 'user' | 'assistant'; content: string };

export default function FloatingActionButton() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('menu');

  // Feedback state
  const [tipo, setTipo] = useState<'erro' | 'melhoria'>('erro');
  const [mensagem, setMensagem] = useState('');
  const [sending, setSending] = useState(false);

  // AI chat state
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => setMode('menu'), 300);
  };

  const handleFeedback = async () => {
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
      toast.success('Feedback enviado!');
      setMensagem('');
      handleClose();
    } catch {
      toast.error('Erro ao enviar feedback');
    } finally {
      setSending(false);
    }
  };

  const sendAI = async () => {
    if (!input.trim() || isStreaming) return;
    const userMsg: ChatMsg = { role: 'user', content: input.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setIsStreaming(true);

    let assistantSoFar = '';

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-help`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: allMessages }),
        }
      );

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        toast.error(errData.error || 'Erro ao contactar IA');
        setIsStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
          }
          return [...prev, { role: 'assistant', content: assistantSoFar }];
        });
      };

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsert(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch {
      toast.error('Erro de ligação à IA');
    } finally {
      setIsStreaming(false);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setOpen(true)}
            className={cn(
              'fixed z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors',
              isMobile ? 'bottom-20 right-4' : 'bottom-6 right-6'
            )}
          >
            <MessageSquarePlus className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-50 bg-black/30" onClick={handleClose} />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'fixed z-50 flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden',
                isMobile
                  ? 'bottom-20 right-3 left-3 max-h-[70vh]'
                  : 'bottom-6 right-6 w-96 max-h-[500px]'
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <h3 className="text-sm font-semibold text-foreground">
                  {mode === 'menu' && 'Como posso ajudar?'}
                  {mode === 'feedback' && 'Reportar'}
                  {mode === 'ai' && 'Assistente IA'}
                </h3>
                <div className="flex items-center gap-1">
                  {mode !== 'menu' && (
                    <button onClick={() => setMode('menu')} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">
                      <ChevronUp className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={handleClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Menu */}
              {mode === 'menu' && (
                <div className="p-4 space-y-2">
                  <button
                    onClick={() => setMode('ai')}
                    className="flex w-full items-center gap-3 rounded-xl border border-border p-4 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Pedir ajuda à IA</p>
                      <p className="text-xs text-muted-foreground">Dúvidas, como fazer, sugestões</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setMode('feedback')}
                    className="flex w-full items-center gap-3 rounded-xl border border-border p-4 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                      <Bug className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Reportar erro ou melhoria</p>
                      <p className="text-xs text-muted-foreground">A gerência será notificada</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Feedback form */}
              {mode === 'feedback' && (
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setTipo('erro')}
                      className={cn('rounded-lg border-2 p-3 text-center transition-all', tipo === 'erro' ? 'border-destructive bg-destructive/5' : 'border-border')}
                    >
                      <Bug className={cn('mx-auto h-5 w-5 mb-1', tipo === 'erro' ? 'text-destructive' : 'text-muted-foreground')} />
                      <p className="text-xs font-medium">Erro</p>
                    </button>
                    <button
                      onClick={() => setTipo('melhoria')}
                      className={cn('rounded-lg border-2 p-3 text-center transition-all', tipo === 'melhoria' ? 'border-primary bg-primary/5' : 'border-border')}
                    >
                      <Lightbulb className={cn('mx-auto h-5 w-5 mb-1', tipo === 'melhoria' ? 'text-primary' : 'text-muted-foreground')} />
                      <p className="text-xs font-medium">Melhoria</p>
                    </button>
                  </div>
                  <Textarea
                    placeholder={tipo === 'erro' ? 'Descreva o que aconteceu...' : 'Descreva a sua sugestão...'}
                    value={mensagem}
                    onChange={e => setMensagem(e.target.value)}
                    rows={3}
                  />
                  <Button className="w-full gap-2" onClick={handleFeedback} disabled={!mensagem.trim() || sending}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Enviar
                  </Button>
                </div>
              )}

              {/* AI Chat */}
              {mode === 'ai' && (
                <div className="flex flex-col flex-1 min-h-0">
                  <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: '320px' }}>
                    {messages.length === 0 && (
                      <div className="text-center py-6">
                        <Bot className="h-10 w-10 mx-auto mb-2 text-primary/40" />
                        <p className="text-sm text-muted-foreground">Olá! Pergunta-me qualquer coisa sobre a app.</p>
                      </div>
                    )}
                    {messages.map((msg, i) => (
                      <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                        <div className={cn(
                          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm',
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted text-foreground rounded-bl-md'
                        )}>
                          {msg.role === 'assistant' ? (
                            <div className="prose prose-sm max-w-none dark:prose-invert [&>p]:mb-1.5 [&>p:last-child]:mb-0 [&>ul]:my-1 [&>ol]:my-1">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          ) : msg.content}
                        </div>
                      </div>
                    ))}
                    {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-2xl rounded-bl-md px-3.5 py-2.5">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-border p-3 flex gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendAI()}
                      placeholder="Escreve a tua dúvida..."
                      className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      disabled={isStreaming}
                    />
                    <Button size="icon" onClick={sendAI} disabled={!input.trim() || isStreaming}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
