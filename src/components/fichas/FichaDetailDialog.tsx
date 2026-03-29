import { ChefHat, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { FichaComIngredientes } from '@/hooks/useFichasTecnicas';

function calcCost(ficha: FichaComIngredientes) {
  return ficha.ingredientes.reduce((sum, ing) => {
    const cost = ing.produto?.custo_medio ?? 0;
    return sum + ing.quantidade * cost;
  }, 0);
}

export function FichaDetailDialog({
  ficha,
  onClose,
}: {
  ficha: FichaComIngredientes | null;
  onClose: () => void;
}) {
  if (!ficha) return null;

  const totalCost = calcCost(ficha);
  const costPerPortion = totalCost / ficha.porcoes;
  const margin = ficha.preco_venda > 0
    ? ((ficha.preco_venda - costPerPortion) / ficha.preco_venda) * 100
    : 0;
  const racio = ficha.preco_venda > 0 ? (costPerPortion / ficha.preco_venda) * 100 : 0;

  return (
    <Dialog open={!!ficha} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-primary" />
            {ficha.nome}
          </DialogTitle>
        </DialogHeader>

        {/* Summary stats — matches Excel layout */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Custo Total</p>
            <p className="text-lg font-bold text-foreground">€{totalCost.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Custo/Dose</p>
            <p className="text-lg font-bold text-foreground">€{costPerPortion.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">Preço Venda</p>
            <p className="text-lg font-bold text-foreground">€{ficha.preco_venda.toFixed(2)}</p>
          </div>
          <div className={cn('rounded-lg p-3 text-center', margin >= 65 ? 'bg-success/10' : margin >= 50 ? 'bg-warning/10' : 'bg-destructive/10')}>
            <p className="text-xs text-muted-foreground">Margem</p>
            <p className={cn('text-lg font-bold', margin >= 65 ? 'text-success' : margin >= 50 ? 'text-warning' : 'text-destructive')}>
              {margin.toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Rácio de custo */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Rácio Unitário de Custo</span>
          <span className={cn('text-sm font-bold', racio <= 30 ? 'text-success' : racio <= 40 ? 'text-warning' : 'text-destructive')}>
            {racio.toFixed(1)}%
          </span>
        </div>

        {/* Ingredients table */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-foreground">Ingredientes</h4>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Ingrediente</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Qtd</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">€/Unid</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {ficha.ingredientes.map((ing) => {
                  const cost = ing.produto?.custo_medio ?? 0;
                  return (
                    <tr key={ing.id} className="border-t border-border">
                      <td className="px-3 py-2 text-foreground">{ing.produto?.nome ?? '—'}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{ing.quantidade} {ing.unidade}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">€{cost.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-medium text-foreground">€{(ing.quantidade * cost).toFixed(2)}</td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-border bg-muted/30">
                  <td colSpan={3} className="px-3 py-2 font-semibold text-foreground">Total ({ficha.porcoes} dose{ficha.porcoes > 1 ? 's' : ''})</td>
                  <td className="px-3 py-2 text-right font-bold text-foreground">€{totalCost.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {ficha.tempo_preparacao && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Tempo de preparação: {ficha.tempo_preparacao} min</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
