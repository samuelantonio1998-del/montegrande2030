import { useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateFicha, useProdutos } from '@/hooks/useFichasTecnicas';
import { recipientCapacity, type RecipientSize } from '@/lib/buffet-data';

const categorias = [
  { value: 'entrada', label: 'Entrada' },
  { value: 'prato_principal', label: 'Prato Principal' },
  { value: 'sobremesa', label: 'Sobremesa' },
  { value: 'sopa', label: 'Sopa' },
  { value: 'acompanhamento', label: 'Acompanhamento' },
];

type IngredienteLine = {
  produto_id: string;
  quantidade: number;
  unidade: string;
};

export function FichaCreateForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: produtos = [] } = useProdutos();
  const createFicha = useCreateFicha();

  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('prato_principal');
  const [porcoes, setPorcoes] = useState(1);
  const [precoVenda, setPrecoVenda] = useState(0);
  const [tempoPreparacao, setTempoPreparacao] = useState(0);
  const [ingredientes, setIngredientes] = useState<IngredienteLine[]>([
    { produto_id: '', quantidade: 0, unidade: 'kg' },
  ]);

  const addLine = () => setIngredientes([...ingredientes, { produto_id: '', quantidade: 0, unidade: 'kg' }]);
  const removeLine = (i: number) => setIngredientes(ingredientes.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof IngredienteLine, value: string | number) => {
    const updated = [...ingredientes];
    (updated[i] as Record<string, string | number>)[field] = value;
    setIngredientes(updated);
  };

  const totalCost = ingredientes.reduce((sum, ing) => {
    const prod = produtos.find(p => p.id === ing.produto_id);
    return sum + (prod ? ing.quantidade * prod.custo_medio : 0);
  }, 0);
  const costPerDose = porcoes > 0 ? totalCost / porcoes : 0;
  const margem = precoVenda > 0 ? ((precoVenda - costPerDose) / precoVenda) * 100 : 0;
  const racio = precoVenda > 0 ? (costPerDose / precoVenda) * 100 : 0;

  const handleSubmit = () => {
    const validIngredients = ingredientes.filter(i => i.produto_id && i.quantidade > 0);
    createFicha.mutate(
      {
        nome,
        categoria,
        porcoes,
        preco_venda: precoVenda,
        tempo_preparacao: tempoPreparacao,
        ingredientes: validIngredients,
      },
      {
        onSuccess: () => {
          onClose();
          setNome('');
          setCategoria('prato_principal');
          setPorcoes(1);
          setPrecoVenda(0);
          setTempoPreparacao(0);
          setIngredientes([{ produto_id: '', quantidade: 0, unidade: 'kg' }]);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Ficha Técnica</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header fields — matches Excel */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Designação do Produto</label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Bacalhau à Brás" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Categoria</label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categorias.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nº de Doses</label>
              <Input type="number" min={1} value={porcoes} onChange={e => setPorcoes(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Preço de Venda (€)</label>
              <Input type="number" step="0.01" min={0} value={precoVenda} onChange={e => setPrecoVenda(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tempo Preparação (min)</label>
              <Input type="number" min={0} value={tempoPreparacao} onChange={e => setTempoPreparacao(Number(e.target.value))} />
            </div>
          </div>

          {/* Ingredients — matches Excel table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-foreground">Ingredientes</h4>
              <Button size="sm" variant="outline" onClick={addLine} className="gap-1">
                <Plus className="h-3 w-3" /> Linha
              </Button>
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground">Ingrediente</th>
                    <th className="px-2 py-2 text-right font-medium text-muted-foreground w-20">Qtd</th>
                    <th className="px-2 py-2 text-right font-medium text-muted-foreground w-20">Unidade</th>
                    <th className="px-2 py-2 text-right font-medium text-muted-foreground w-20">€/Unid</th>
                    <th className="px-2 py-2 text-right font-medium text-muted-foreground w-20">Total</th>
                    <th className="px-2 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {ingredientes.map((ing, i) => {
                    const prod = produtos.find(p => p.id === ing.produto_id);
                    const subtotal = prod ? ing.quantidade * prod.custo_medio : 0;
                    return (
                      <tr key={i} className="border-t border-border">
                        <td className="px-2 py-1">
                          <Select value={ing.produto_id} onValueChange={v => {
                            const p = produtos.find(pr => pr.id === v);
                            updateLine(i, 'produto_id', v);
                            if (p) updateLine(i, 'unidade', p.unidade);
                          }}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                            <SelectContent>
                              {produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-1">
                          <Input type="number" step="0.01" min={0} className="h-8 text-xs text-right" value={ing.quantidade} onChange={e => updateLine(i, 'quantidade', Number(e.target.value))} />
                        </td>
                        <td className="px-2 py-1 text-right text-xs text-muted-foreground">{ing.unidade}</td>
                        <td className="px-2 py-1 text-right text-xs text-muted-foreground">€{prod ? prod.custo_medio.toFixed(2) : '—'}</td>
                        <td className="px-2 py-1 text-right text-xs font-medium text-foreground">€{subtotal.toFixed(2)}</td>
                        <td className="px-2 py-1">
                          {ingredientes.length > 1 && (
                            <button onClick={() => removeLine(i)} className="text-destructive hover:text-destructive/80">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary row — matches Excel footer */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">Custo Total</p>
              <p className="text-lg font-bold text-foreground">€{totalCost.toFixed(2)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">Custo/Dose</p>
              <p className="text-lg font-bold text-foreground">€{costPerDose.toFixed(2)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">Margem Contrib.</p>
              <p className={`text-lg font-bold ${margem >= 65 ? 'text-success' : margem >= 50 ? 'text-warning' : 'text-destructive'}`}>
                {margem.toFixed(0)}%
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">Rácio Custo</p>
              <p className={`text-lg font-bold ${racio <= 30 ? 'text-success' : racio <= 40 ? 'text-warning' : 'text-destructive'}`}>
                {racio.toFixed(1)}%
              </p>
            </div>
          </div>

          <Button className="w-full gap-2" onClick={handleSubmit} disabled={!nome || createFicha.isPending}>
            <Save className="h-4 w-4" />
            {createFicha.isPending ? 'A guardar...' : 'Guardar Ficha Técnica'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
