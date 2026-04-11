import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Copy, Send, Minus, Plus, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type Produto = {
  id: string;
  nome: string;
  unidade: string;
  stock_atual: number;
  stock_minimo: number;
  stock_maximo: number;
  custo_medio: number;
};

type Fornecedor = {
  id: string;
  nome: string;
  email: string | null;
};

type OrderLine = {
  produto: Produto;
  quantidade: number;
  selected: boolean;
};

interface QuickOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fornecedor: Fornecedor;
  produtos: Produto[];
}

export function QuickOrderDialog({ open, onOpenChange, fornecedor, produtos }: QuickOrderDialogProps) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const initialLines = useMemo(() => {
    return produtos.map(p => {
      const needsRestock = p.stock_atual <= p.stock_minimo;
      const suggestedQty = needsRestock
        ? Math.max(1, Math.round((p.stock_maximo - p.stock_atual) * 10) / 10)
        : 0;
      return {
        produto: p,
        quantidade: suggestedQty,
        selected: needsRestock,
      };
    });
  }, [produtos]);

  const [lines, setLines] = useState<OrderLine[]>(initialLines);

  // Reset lines when dialog opens
  const handleOpenChange = (o: boolean) => {
    if (o) {
      setLines(initialLines);
    }
    onOpenChange(o);
  };

  const toggleLine = (idx: number) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, selected: !l.selected, quantidade: !l.selected && l.quantidade === 0 ? 1 : l.quantidade } : l));
  };

  const updateQty = (idx: number, qty: number) => {
    if (qty < 0) return;
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, quantidade: qty } : l));
  };

  const selectedLines = lines.filter(l => l.selected && l.quantidade > 0);

  const buildOrderText = () => {
    const date = new Date().toLocaleDateString('pt-PT');
    let text = `ENCOMENDA — ${fornecedor.nome}\nData: ${date}\n\n`;
    text += selectedLines.map((l, i) =>
      `${i + 1}. ${l.produto.nome} — ${l.quantidade} ${l.produto.unidade}`
    ).join('\n');
    text += `\n\nTotal: ${selectedLines.length} artigo(s)`;
    text += '\n\n— Quinta Monte Grande';
    return text;
  };

  const copyToClipboard = async () => {
    const text = buildOrderText();
    await navigator.clipboard.writeText(text);
    toast({ title: 'Encomenda copiada', description: 'Texto copiado para a área de transferência' });
  };

  const sendByEmail = async () => {
    if (!fornecedor.email) {
      toast({ title: 'Sem email', description: 'Este fornecedor não tem email configurado', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      // Log the order in activity_logs
      await supabase.from('activity_logs').insert({
        action: 'encomenda_manual',
        module: 'fornecedores',
        user_name: 'Gerência',
        user_role: 'gerencia',
        details: `Encomenda manual a ${fornecedor.nome}: ${selectedLines.map(l => `${l.produto.nome} (${l.quantidade}${l.produto.unidade})`).join(', ')}`,
        metadata: {
          fornecedor_id: fornecedor.id,
          fornecedor_nome: fornecedor.nome,
          items: selectedLines.map(l => ({ produto_id: l.produto.id, nome: l.produto.nome, quantidade: l.quantidade, unidade: l.produto.unidade })),
        },
      });

      // Enqueue email
      const payload = {
        template: 'supplier-order',
        to: fornecedor.email,
        subject: `Encomenda — Quinta Monte Grande`,
        data: {
          supplier_name: fornecedor.nome,
          items: selectedLines.map(l => ({ name: l.produto.nome, quantity: l.quantidade, unit: l.produto.unidade })),
          date: new Date().toLocaleDateString('pt-PT'),
        },
      };
      await supabase.rpc('enqueue_email', { queue_name: 'transactional_emails', payload: JSON.stringify(payload) });

      toast({ title: 'Encomenda enviada', description: `Email enviado para ${fornecedor.email}` });
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Erro ao enviar', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const estimatedTotal = selectedLines.reduce((sum, l) => sum + l.quantidade * l.produto.custo_medio, 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Encomenda — {fornecedor.nome}
          </DialogTitle>
        </DialogHeader>

        {produtos.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sem produtos associados a este fornecedor.</p>
        ) : (
          <div className="space-y-4">
            {/* Product lines */}
            <div className="space-y-2">
              {lines.map((line, idx) => {
                const isLow = line.produto.stock_atual <= line.produto.stock_minimo;
                return (
                  <div
                    key={line.produto.id}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3 transition-colors cursor-pointer',
                      line.selected ? 'border-primary/30 bg-primary/5' : 'border-border bg-card',
                      isLow && !line.selected && 'border-destructive/20'
                    )}
                    onClick={() => toggleLine(idx)}
                  >
                    <input
                      type="checkbox"
                      checked={line.selected}
                      onChange={() => toggleLine(idx)}
                      className="h-4 w-4 rounded border-input accent-primary"
                      onClick={e => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{line.produto.nome}</p>
                        {isLow && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Stock: {line.produto.stock_atual}{line.produto.unidade} · Mín: {line.produto.stock_minimo}{line.produto.unidade}
                      </p>
                    </div>
                    {line.selected && (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          className="rounded p-1 hover:bg-muted transition-colors"
                          onClick={() => updateQty(idx, Math.max(0, Math.round((line.quantidade - 1) * 10) / 10))}
                        >
                          <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <Input
                          type="number"
                          value={line.quantidade}
                          onChange={e => updateQty(idx, parseFloat(e.target.value) || 0)}
                          className="w-16 h-8 text-center text-sm px-1"
                          min={0}
                          step={0.1}
                        />
                        <button
                          className="rounded p-1 hover:bg-muted transition-colors"
                          onClick={() => updateQty(idx, Math.round((line.quantidade + 1) * 10) / 10)}
                        >
                          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <span className="text-xs text-muted-foreground w-6">{line.produto.unidade}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            {selectedLines.length > 0 && (
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{selectedLines.length} artigo(s) selecionado(s)</span>
                  <span className="font-medium text-foreground">≈ €{estimatedTotal.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={copyToClipboard}
                disabled={selectedLines.length === 0}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
              <Button
                className="flex-1"
                onClick={sendByEmail}
                disabled={selectedLines.length === 0 || sending || !fornecedor.email}
              >
                <Send className="h-4 w-4 mr-2" />
                {sending ? 'A enviar...' : 'Enviar Email'}
              </Button>
            </div>
            {!fornecedor.email && (
              <p className="text-xs text-muted-foreground text-center">Configure o email do fornecedor para enviar por email.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
