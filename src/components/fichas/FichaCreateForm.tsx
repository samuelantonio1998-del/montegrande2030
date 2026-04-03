import { useState, useRef } from 'react';
import { Plus, Trash2, Save, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateFicha, useProdutos, LABOR_COST_PER_HOUR } from '@/hooks/useFichasTecnicas';
import { recipientCapacity, type RecipientSize } from '@/lib/buffet-data';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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

/** Dose options from recipientes */
const doseOptions = Object.entries(recipientCapacity).map(([key, val]) => ({
  value: key,
  label: key === 'unitario' ? 'Unitário (un)' : `${val.label} (${val.capacityKg}kg)`,
}));

export function FichaCreateForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: produtos = [] } = useProdutos();
  const createFicha = useCreateFicha();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('prato_principal');
  const [porcoes, setPorcoes] = useState(1);
  const [precoVenda, setPrecoVenda] = useState(14.90);
  const [tempoPreparacao, setTempoPreparacao] = useState(0);
  const [notasPreparacao, setNotasPreparacao] = useState('');
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setFotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!fotoFile) return null;
    setUploading(true);
    const ext = fotoFile.name.split('.').pop();
    const path = `fichas/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('pratos').upload(path, fotoFile);
    setUploading(false);
    if (error) return null;
    const { data: urlData } = supabase.storage.from('pratos').getPublicUrl(path);
    return urlData.publicUrl;
  };

  const ingredientCost = ingredientes.reduce((sum, ing) => {
    const prod = produtos.find(p => p.id === ing.produto_id);
    return sum + (prod ? ing.quantidade * prod.custo_medio : 0);
  }, 0);
  const laborCost = (tempoPreparacao / 60) * LABOR_COST_PER_HOUR;
  const totalCost = ingredientCost + laborCost;
  const costPerDose = porcoes > 0 ? totalCost / porcoes : 0;
  const margem = precoVenda > 0 ? ((precoVenda - costPerDose) / precoVenda) * 100 : 0;
  const racio = precoVenda > 0 ? (costPerDose / precoVenda) * 100 : 0;

  const canSubmit = nome && tempoPreparacao > 0 && !createFicha.isPending && !uploading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const fotoUrl = await uploadPhoto();
    const validIngredients = ingredientes.filter(i => i.produto_id && i.quantidade > 0);
    createFicha.mutate(
      {
        nome,
        categoria,
        porcoes,
        preco_venda: precoVenda,
        tempo_preparacao: tempoPreparacao,
        foto_url: fotoUrl,
        notas_preparacao: notasPreparacao || null,
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
          setNotasPreparacao('');
          setFotoPreview(null);
          setFotoFile(null);
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
          {/* Photo + name row */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'relative shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-border overflow-hidden',
                'flex items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors group'
              )}
            >
              {fotoPreview ? (
                <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <ImageIcon className="h-6 w-6 mx-auto text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="text-[10px] text-muted-foreground mt-1 block">Foto</span>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </button>
            <div className="flex-1 space-y-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Designação do Produto</label>
                <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Bacalhau à Brás" />
              </div>
              <div className="grid grid-cols-2 gap-2">
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
                  <label className="text-xs font-medium text-muted-foreground">Nº de Doses (Recipiente)</label>
                  <Select
                    value={Object.entries(recipientCapacity).find(([_, v]) => v.capacityKg === porcoes)?.[0] ?? 'unitario'}
                    onValueChange={v => setPorcoes(recipientCapacity[v as RecipientSize]?.capacityKg ?? 1)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {doseOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Preço de Venda (€)</label>
              <Input type="number" step="0.01" min={0} value={precoVenda} onChange={e => setPrecoVenda(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Tempo Preparação (min) <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                min={1}
                value={tempoPreparacao || ''}
                onChange={e => setTempoPreparacao(Number(e.target.value))}
                placeholder="Obrigatório"
                className={cn(!tempoPreparacao && 'border-destructive/50')}
              />
              {tempoPreparacao > 0 && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Custo M.O.: €{laborCost.toFixed(2)} (€{LABOR_COST_PER_HOUR}/h s/ IVA)
                </p>
              )}
            </div>
          </div>

          {/* Ingredients */}
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
                  {/* Labor cost row */}
                  {tempoPreparacao > 0 && (
                    <tr className="border-t border-border bg-muted/20">
                      <td className="px-2 py-1 text-xs text-muted-foreground" colSpan={4}>
                        Mão-de-obra ({tempoPreparacao} min × €{LABOR_COST_PER_HOUR}/h)
                      </td>
                      <td className="px-2 py-1 text-right text-xs font-medium text-foreground">€{laborCost.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notas de preparação */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nota de Preparação / Confecção</label>
            <Textarea
              value={notasPreparacao}
              onChange={e => setNotasPreparacao(e.target.value)}
              placeholder="Instruções de preparação, dicas de confecção, temperaturas..."
              rows={3}
              className="mt-1 resize-none"
            />
          </div>

          {/* Summary */}
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

          <Button className="w-full gap-2" onClick={handleSubmit} disabled={!canSubmit}>
            <Save className="h-4 w-4" />
            {uploading ? 'A enviar foto...' : createFicha.isPending ? 'A guardar...' : 'Guardar Ficha Técnica'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
