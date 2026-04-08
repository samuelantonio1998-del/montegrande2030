import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

type ActivityLog = {
  id: string;
  user_name: string;
  user_role: string;
  action: string;
  module: string;
  details: string;
  created_at: string;
  metadata: Record<string, any> | null;
};

type Movimentacao = {
  id: string;
  produto_id: string;
  quantidade: number;
  custo_unitario: number | null;
  tipo: string;
  created_at: string;
};

type Props = {
  entry: ActivityLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function EditInventoryEntryDialog({ entry, open, onOpenChange, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [finding, setFinding] = useState(false);
  const [mov, setMov] = useState<Movimentacao | null>(null);
  const [produtoNome, setProdutoNome] = useState('');
  const [unidade, setUnidade] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [custoUnitario, setCustoUnitario] = useState('');

  useEffect(() => {
    if (!open || !entry?.metadata) {
      setMov(null);
      return;
    }
    findMovimentacao();
  }, [open, entry]);

  const findMovimentacao = async () => {
    if (!entry?.metadata) return;
    setFinding(true);
    try {
      const meta = entry.metadata;
      const produtoId = meta.produto_id as string | undefined;
      const logTime = new Date(entry.created_at);

      // Try to find the movimentacao by produto_id and close timestamp
      let query = supabase.from('movimentacoes').select('id, produto_id, quantidade, custo_unitario, tipo, created_at');

      if (produtoId) {
        query = query.eq('produto_id', produtoId);
      }

      // Look within 5 minutes of the log entry
      const before = new Date(logTime.getTime() - 5 * 60000).toISOString();
      const after = new Date(logTime.getTime() + 5 * 60000).toISOString();
      query = query.gte('created_at', before).lte('created_at', after).eq('tipo', 'entrada');

      const { data } = await query.order('created_at', { ascending: false }).limit(1);

      if (data?.[0]) {
        const m = data[0] as unknown as Movimentacao;
        setMov(m);
        setQuantidade(String(m.quantidade));
        setCustoUnitario(String(m.custo_unitario ?? ''));

        // Get produto info
        const { data: prod } = await supabase.from('produtos').select('nome, unidade').eq('id', m.produto_id).single();
        if (prod) {
          setProdutoNome(prod.nome);
          setUnidade(prod.unidade);
        }
      } else {
        // Fallback: parse from details
        setProdutoNome(entry.details?.split('+')[0]?.trim() || '');
        setQuantidade(String(meta.quantidade ?? ''));
        setCustoUnitario(String(meta.custo_unitario ?? ''));
        setUnidade('');
        setMov(null);
      }
    } catch (e) {
      console.error('Erro ao encontrar movimentação:', e);
    } finally {
      setFinding(false);
    }
  };

  const handleSave = async () => {
    if (!mov || !entry?.metadata) return;
    const newQty = parseFloat(quantidade);
    const newCost = parseFloat(custoUnitario);
    if (isNaN(newQty) || newQty <= 0) {
      toast.error('Quantidade inválida');
      return;
    }

    setLoading(true);
    try {
      const oldQty = mov.quantidade;
      const diff = newQty - oldQty;

      // Update movimentacao
      await supabase.from('movimentacoes').update({
        quantidade: newQty,
        custo_unitario: isNaN(newCost) ? null : newCost,
      }).eq('id', mov.id);

      // Adjust stock
      if (diff !== 0) {
        const { data: prod } = await supabase.from('produtos').select('stock_atual, custo_medio').eq('id', mov.produto_id).single();
        if (prod) {
          const newStock = Math.max(0, prod.stock_atual + diff);
          await supabase.from('produtos').update({
            stock_atual: newStock,
            ...(isNaN(newCost) ? {} : { custo_medio: newCost }),
          }).eq('id', mov.produto_id);
        }
      } else if (!isNaN(newCost)) {
        await supabase.from('produtos').update({ custo_medio: newCost }).eq('id', mov.produto_id);
      }

      // Update activity log details
      const newDetails = `${produtoNome} +${newQty} ${unidade}`;
      await supabase.from('activity_logs').update({
        details: newDetails,
        metadata: { ...entry.metadata, quantidade: newQty, custo_unitario: isNaN(newCost) ? null : newCost } as any,
      } as any).eq('id', entry.id);

      toast.success('Entrada de inventário atualizada');
      onSaved();
      onOpenChange(false);
    } catch (e) {
      console.error('Erro ao atualizar:', e);
      toast.error('Erro ao atualizar entrada');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Entrada de Inventário</DialogTitle>
        </DialogHeader>

        {finding ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !mov ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Não foi possível encontrar o registo de movimentação associado.
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Produto</Label>
              <p className="text-sm font-medium text-foreground">{produtoNome}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-qty" className="text-xs">Quantidade ({unidade})</Label>
                <Input id="edit-qty" type="number" step="0.01" min="0" value={quantidade} onChange={e => setQuantidade(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="edit-cost" className="text-xs">Custo Unitário (€)</Label>
                <Input id="edit-cost" type="number" step="0.01" min="0" value={custoUnitario} onChange={e => setCustoUnitario(e.target.value)} />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Alterar a quantidade irá ajustar automaticamente o stock atual do produto.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading || !mov}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
