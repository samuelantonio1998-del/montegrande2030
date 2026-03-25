import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ShoppingCart } from 'lucide-react';
import { mockInventory, type InventoryItem } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

export default function Inventario() {
  const [items] = useState<InventoryItem[]>(mockInventory);
  const { toast } = useToast();

  const lowStock = items.filter(i => i.currentStock <= i.minStock);

  const handleOrder = (item: InventoryItem) => {
    const qty = (item.maxStock - item.currentStock);
    toast({
      title: 'Pedido de compra gerado',
      description: `${qty}${item.unit} de ${item.name} — Fornecedor: ${item.supplier}`,
    });
  };

  const getStockLevel = (item: InventoryItem) => {
    const pct = (item.currentStock / item.maxStock) * 100;
    if (item.currentStock <= item.minStock) return { color: 'bg-destructive', label: 'Crítico', textColor: 'text-destructive' };
    if (pct < 40) return { color: 'bg-warning', label: 'Baixo', textColor: 'text-warning' };
    return { color: 'bg-success', label: 'OK', textColor: 'text-success' };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-foreground">Inventário</h1>
        <p className="mt-1 text-muted-foreground">
          {items.length} itens · {lowStock.length} abaixo do mínimo
        </p>
      </div>

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-semibold text-destructive">Stock abaixo do mínimo</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map(item => (
              <button
                key={item.id}
                onClick={() => handleOrder(item)}
                className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 text-sm border border-border hover:border-primary transition-colors"
              >
                <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-foreground">{item.name}</span>
                <span className="text-xs text-destructive">{item.currentStock}{item.unit}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ingrediente</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stock</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nível</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Custo/Un</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fornecedor</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ação</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const level = getStockLevel(item);
              return (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-foreground">{item.currentStock}{item.unit}</span>
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn('h-full rounded-full transition-all', level.color)}
                          style={{ width: `${Math.min((item.currentStock / item.maxStock) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                      item.currentStock <= item.minStock ? 'bg-destructive/10 text-destructive' :
                        level.label === 'Baixo' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                    )}>
                      {item.currentStock <= item.minStock ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                      {level.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">€{item.costPerUnit.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{item.supplier}</td>
                  <td className="px-4 py-3 text-right">
                    {item.currentStock <= item.minStock && (
                      <button
                        onClick={() => handleOrder(item)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <ShoppingCart className="h-3 w-3" />
                        Encomendar
                      </button>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
