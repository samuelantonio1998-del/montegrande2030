import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Building2, Phone, Mail, Calendar, Clock, Package, Edit3, Plus, X, Truck, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const DIAS_SEMANA = [
  { value: 'domingo', label: 'Domingo' },
  { value: 'segunda', label: 'Segunda' },
  { value: 'terca', label: 'Terça' },
  { value: 'quarta', label: 'Quarta' },
  { value: 'quinta', label: 'Quinta' },
  { value: 'sexta', label: 'Sexta' },
  { value: 'sabado', label: 'Sábado' },
];

type Fornecedor = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  dia_encomenda: string | null;
  prazo_entrega_dias: number | null;
  notas: string | null;
};

type Produto = {
  id: string;
  nome: string;
  unidade: string;
  stock_atual: number;
  stock_minimo: number;
  custo_medio: number;
  fornecedor_id: string | null;
};

export default function Fornecedores() {
  const { toast } = useToast();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Fornecedor | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', dia_encomenda: '', prazo_entrega_dias: '', notas: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [fRes, pRes] = await Promise.all([
      supabase.from('fornecedores').select('*').order('nome'),
      supabase.from('produtos').select('*').eq('ativo', true).order('nome'),
    ]);
    if (fRes.data) setFornecedores(fRes.data);
    if (pRes.data) setProdutos(pRes.data as Produto[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = fornecedores.filter(f => f.nome.toLowerCase().includes(search.toLowerCase()));

  const getProductsForSupplier = (fId: string) => produtos.filter(p => p.fornecedor_id === fId);

  const openDetail = (f: Fornecedor) => {
    setSelected(f);
    setForm({
      nome: f.nome, email: f.email || '', telefone: f.telefone || '',
      dia_encomenda: f.dia_encomenda || '', prazo_entrega_dias: f.prazo_entrega_dias?.toString() || '',
      notas: f.notas || '',
    });
    setEditMode(false);
    setDetailOpen(true);
  };

  const openCreate = () => {
    setSelected(null);
    setForm({ nome: '', email: '', telefone: '', dia_encomenda: '', prazo_entrega_dias: '', notas: '' });
    setEditMode(true);
    setCreating(true);
    setDetailOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) return;
    const payload = {
      nome: form.nome.trim(),
      email: form.email.trim() || null,
      telefone: form.telefone.trim() || null,
      dia_encomenda: form.dia_encomenda.trim() || null,
      prazo_entrega_dias: form.prazo_entrega_dias ? parseInt(form.prazo_entrega_dias) : null,
      notas: form.notas.trim() || null,
    };

    if (creating) {
      const { error } = await supabase.from('fornecedores').insert(payload);
      if (error) { toast({ title: 'Erro ao criar', variant: 'destructive' }); return; }
      toast({ title: 'Fornecedor criado' });
    } else if (selected) {
      const { error } = await supabase.from('fornecedores').update(payload).eq('id', selected.id);
      if (error) { toast({ title: 'Erro ao atualizar', variant: 'destructive' }); return; }
      toast({ title: 'Fornecedor atualizado' });
    }
    setDetailOpen(false);
    setCreating(false);
    setEditMode(false);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-foreground">Fornecedores</h1>
          <p className="mt-1 text-muted-foreground">{fornecedores.length} fornecedores registados</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar fornecedor..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(f => {
          const prods = getProductsForSupplier(f.id);
          const lowStock = prods.filter(p => p.stock_atual <= p.stock_minimo);
          return (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openDetail(f)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{f.nome}</h3>
                    {f.email && <p className="text-xs text-muted-foreground">{f.email}</p>}
                  </div>
                </div>
                {lowStock.length > 0 && (
                  <Badge variant="destructive" className="text-xs">{lowStock.length} em falta</Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {f.telefone && (
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{f.telefone}</span>
                )}
                {f.dia_encomenda && (
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{f.dia_encomenda}</span>
                )}
                {f.prazo_entrega_dias && (
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{f.prazo_entrega_dias}d entrega</span>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  <Package className="h-3 w-3 inline mr-1" />
                  {prods.length} produto{prods.length !== 1 ? 's' : ''}
                </p>
              </div>
            </motion.div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Nenhum fornecedor encontrado.</p>
          </div>
        )}
      </div>

      {/* Detail / Edit Dialog */}
      <Dialog open={detailOpen} onOpenChange={(o) => { setDetailOpen(o); if (!o) { setCreating(false); setEditMode(false); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {creating ? 'Novo Fornecedor' : editMode ? 'Editar Fornecedor' : selected?.nome}
            </DialogTitle>
          </DialogHeader>

          {editMode ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nome *</label>
                <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} type="email" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Telefone</label>
                  <Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Dia de Encomenda</label>
                  <Input value={form.dia_encomenda} onChange={e => setForm(f => ({ ...f, dia_encomenda: e.target.value }))} placeholder="ex: Segunda" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Prazo Entrega (dias)</label>
                  <Input type="number" value={form.prazo_entrega_dias} onChange={e => setForm(f => ({ ...f, prazo_entrega_dias: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Notas</label>
                <Input value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} className="flex-1">Guardar</Button>
                {!creating && (
                  <Button variant="outline" onClick={() => setEditMode(false)}>Cancelar</Button>
                )}
              </div>
            </div>
          ) : selected && (
            <div className="space-y-5">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                  <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                  Editar
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {selected.email && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />Email</p>
                    <p className="text-sm font-medium text-foreground mt-1">{selected.email}</p>
                  </div>
                )}
                {selected.telefone && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />Telefone</p>
                    <p className="text-sm font-medium text-foreground mt-1">{selected.telefone}</p>
                  </div>
                )}
                {selected.dia_encomenda && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Dia Encomenda</p>
                    <p className="text-sm font-medium text-foreground mt-1">{selected.dia_encomenda}</p>
                  </div>
                )}
                {selected.prazo_entrega_dias && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Prazo Entrega</p>
                    <p className="text-sm font-medium text-foreground mt-1">{selected.prazo_entrega_dias} dias</p>
                  </div>
                )}
              </div>

              {selected.notas && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Notas</p>
                  <p className="text-sm text-foreground mt-1">{selected.notas}</p>
                </div>
              )}

              {/* Products from this supplier */}
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/30">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    Produtos ({getProductsForSupplier(selected.id).length})
                  </h3>
                </div>
                <div className="divide-y divide-border">
                  {getProductsForSupplier(selected.id).map(p => (
                    <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <p className="text-sm text-foreground">{p.nome}</p>
                        <p className="text-xs text-muted-foreground">Stock: {p.stock_atual}{p.unidade} · Mín: {p.stock_minimo}{p.unidade}</p>
                      </div>
                      <span className="text-xs font-medium text-foreground">€{p.custo_medio.toFixed(2)}/{p.unidade}</span>
                    </div>
                  ))}
                  {getProductsForSupplier(selected.id).length === 0 && (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">Sem produtos associados</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
