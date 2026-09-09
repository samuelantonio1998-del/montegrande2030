import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFichasTecnicas } from '@/hooks/useFichasTecnicas';
import { toast } from '@/lib/toast-with-sound';
import { cn } from '@/lib/utils';

type Linha = { ativo: boolean; nome_comercial: string; preco_venda: string };

export function CartaMarcaPanel() {
  const qc = useQueryClient();
  const { data: fichas = [], isLoading } = useFichasTecnicas();
  const [marcaId, setMarcaId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [linhas, setLinhas] = useState<Record<string, Linha>>({});
  const [saving, setSaving] = useState(false);

  const { data: marcas = [] } = useQuery({
    queryKey: ['marcas_ativas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('marcas').select('id, nome').eq('ativo', true).order('nome');
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!marcaId && marcas.length > 0) setMarcaId(marcas[0].id);
  }, [marcas, marcaId]);

  const { data: existentes = [], isLoading: loadingCarta } = useQuery({
    queryKey: ['ficha_marca_por_marca', marcaId],
    enabled: !!marcaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ficha_marca')
        .select('ficha_tecnica_id, nome_comercial, preco_venda, ativo')
        .eq('marca_id', marcaId);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const mapa: Record<string, Linha> = {};
    for (const f of fichas) {
      const e = existentes.find(x => x.ficha_tecnica_id === f.id);
      mapa[f.id] = {
        ativo: e ? !!e.ativo : false,
        nome_comercial: e?.nome_comercial ?? '',
        preco_venda: e?.preco_venda != null ? String(e.preco_venda) : '',
      };
    }
    setLinhas(mapa);
  }, [fichas, existentes]);

  const filtradas = useMemo(
    () => fichas.filter(f => f.nome.toLowerCase().includes(search.trim().toLowerCase())),
    [fichas, search]
  );

  const totalAtivas = Object.values(linhas).filter(l => l.ativo).length;

  async function guardar() {
    if (!marcaId) return;
    setSaving(true);
    try {
      const rows = Object.entries(linhas).map(([ficha_tecnica_id, l]) => ({
        ficha_tecnica_id,
        marca_id: marcaId,
        nome_comercial: l.nome_comercial.trim() || null,
        preco_venda: l.preco_venda.trim() ? Number(l.preco_venda) : null,
        ativo: l.ativo,
      }));
      const { error } = await supabase
        .from('ficha_marca')
        .upsert(rows, { onConflict: 'ficha_tecnica_id,marca_id' });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['ficha_marca_por_marca', marcaId] });
      qc.invalidateQueries({ queryKey: ['carta_marca'] });
      qc.invalidateQueries({ queryKey: ['ficha_marca'] });
      toast.success('Carta da marca guardada');
    } catch (err) {
      toast.error(`Erro ao guardar carta: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  function set(id: string, patch: Partial<Linha>) {
    setLinhas(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px]">
          <Label>Marca</Label>
          <Select value={marcaId} onValueChange={setMarcaId}>
            <SelectTrigger><SelectValue placeholder="Selecionar marca" /></SelectTrigger>
            <SelectContent>
              {marcas.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Procurar prato..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={guardar} disabled={saving || !marcaId} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar carta
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {totalAtivas} prato{totalAtivas === 1 ? '' : 's'} na carta desta marca. A receita e os ingredientes são partilhados; aqui define apenas o nome comercial e o preço.
      </p>

      {(isLoading || loadingCarta) && (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      )}

      <div className="space-y-2">
        {filtradas.map(f => {
          const l = linhas[f.id] ?? { ativo: false, nome_comercial: '', preco_venda: '' };
          return (
            <div
              key={f.id}
              className={cn(
                'flex flex-wrap items-center gap-3 rounded-lg border p-3',
                l.ativo ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
              )}
            >
              <Checkbox checked={l.ativo} onCheckedChange={v => set(f.id, { ativo: v === true })} aria-label={`Incluir ${f.nome}`} />
              <span className="min-w-[160px] flex-1 text-sm font-medium text-foreground">{f.nome}</span>
              <Input
                className="w-full sm:w-56"
                placeholder="Nome comercial (opcional)"
                value={l.nome_comercial}
                onChange={e => set(f.id, { nome_comercial: e.target.value })}
              />
              <Input
                className="w-28"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder={`€${f.preco_venda.toFixed(2)}`}
                value={l.preco_venda}
                onChange={e => set(f.id, { preco_venda: e.target.value })}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CartaMarcaPanel;
