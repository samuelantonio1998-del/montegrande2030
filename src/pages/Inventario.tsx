import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, ShoppingCart, Camera, Package, ArrowDownCircle, ArrowUpCircle, Trash2, Upload, Plus, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Produto = {
  id: string;
  nome: string;
  categoria: string;
  unidade: string;
  stock_atual: number;
  stock_minimo: number;
  stock_maximo: number;
  custo_medio: number;
  fornecedor_id: string | null;
  sku: string | null;
  ativo: boolean;
};

type Fornecedor = {
  id: string;
  nome: string;
  email: string | null;
  dia_encomenda: string | null;
  prazo_entrega_dias: number | null;
};

type Movimentacao = {
  id: string;
  produto_id: string;
  tipo: string;
  quantidade: number;
  custo_unitario: number | null;
  motivo: string | null;
  funcionario: string | null;
  created_at: string;
  produtos?: { nome: string; unidade: string } | null;
};

type ScannedItem = {
  nome: string;
  quantidade: number;
  unidade: string;
  custo_unitario: number;
  fornecedor: string | null;
  sku: string | null;
  selected: boolean;
  produto_id?: string;
};

export default function Inventario() {
  const { toast } = useToast();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // OCR state
  const [scanning, setScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [showScanned, setShowScanned] = useState(false);

  // Manual entry state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualForm, setManualForm] = useState({ produto_id: '', quantidade: '', custo_unitario: '', tipo: 'entrada' as string });

  // Exit state
  const [showExit, setShowExit] = useState(false);
  const [exitForm, setExitForm] = useState({ produto_id: '', quantidade: '', motivo: '', tipo: 'saida' as string });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [prodRes, fornRes, movRes] = await Promise.all([
      supabase.from('produtos').select('*').eq('ativo', true).order('nome'),
      supabase.from('fornecedores').select('*').order('nome'),
      supabase.from('movimentacoes').select('*, produtos(nome, unidade)').order('created_at', { ascending: false }).limit(50),
    ]);
    if (prodRes.data) setProdutos(prodRes.data);
    if (fornRes.data) setFornecedores(fornRes.data);
    if (movRes.data) setMovimentacoes(movRes.data as unknown as Movimentacao[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const lowStock = produtos.filter(p => p.stock_atual <= p.stock_minimo);
  const filteredProdutos = produtos.filter(p => p.nome.toLowerCase().includes(search.toLowerCase()));

  // Group low stock by supplier
  const faltasByFornecedor = lowStock.reduce((acc, p) => {
    const fId = p.fornecedor_id || 'sem-fornecedor';
    if (!acc[fId]) acc[fId] = [];
    acc[fId].push(p);
    return acc;
  }, {} as Record<string, Produto[]>);

  const getStockLevel = (p: Produto) => {
    const pct = (p.stock_atual / p.stock_maximo) * 100;
    if (p.stock_atual <= p.stock_minimo) return { color: 'bg-destructive', label: 'Crítico' };
    if (pct < 40) return { color: 'bg-warning', label: 'Baixo' };
    return { color: 'bg-success', label: 'OK' };
  };

  // OCR Scanner
  const handleScanInvoice = async (file: File) => {
    setScanning(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('scan-invoice', {
        body: { imageBase64: base64 },
      });

      if (error) throw error;

      const items: ScannedItem[] = (data.items || []).map((item: any) => {
        const match = produtos.find(p => p.nome.toLowerCase() === item.nome?.toLowerCase());
        return { ...item, selected: true, produto_id: match?.id };
      });

      setScannedItems(items);
      setShowScanned(true);
      toast({ title: `${items.length} itens detetados na fatura` });
    } catch (err: any) {
      toast({ title: 'Erro no scanner', description: err.message, variant: 'destructive' });
    } finally {
      setScanning(false);
    }
  };

  const confirmScannedItems = async () => {
    const selected = scannedItems.filter(i => i.selected);
    for (const item of selected) {
      if (item.produto_id) {
        // Update existing product stock
        const produto = produtos.find(p => p.id === item.produto_id);
        if (produto) {
          const newStock = produto.stock_atual + item.quantidade;
          const totalCost = produto.custo_medio * produto.stock_atual + item.custo_unitario * item.quantidade;
          const newCustoMedio = newStock > 0 ? totalCost / newStock : item.custo_unitario;
          
          await supabase.from('produtos').update({ stock_atual: newStock, custo_medio: newCustoMedio }).eq('id', item.produto_id);
          await supabase.from('movimentacoes').insert({
            produto_id: item.produto_id,
            tipo: 'entrada',
            quantidade: item.quantidade,
            custo_unitario: item.custo_unitario,
            motivo: 'Fatura OCR',
          });
        }
      } else {
        // Create new product
        const { data: newProd } = await supabase.from('produtos').insert({
          nome: item.nome,
          unidade: item.unidade,
          stock_atual: item.quantidade,
          custo_medio: item.custo_unitario,
          sku: item.sku,
        }).select().single();

        if (newProd) {
          await supabase.from('movimentacoes').insert({
            produto_id: newProd.id,
            tipo: 'entrada',
            quantidade: item.quantidade,
            custo_unitario: item.custo_unitario,
            motivo: 'Fatura OCR - Novo produto',
          });
        }
      }
    }
    toast({ title: `${selected.length} itens registados com sucesso` });
    setShowScanned(false);
    setScannedItems([]);
    fetchData();
  };

  const handleManualEntry = async () => {
    if (!manualForm.produto_id || !manualForm.quantidade) return;
    const qty = parseFloat(manualForm.quantidade);
    const cost = parseFloat(manualForm.custo_unitario) || 0;
    const produto = produtos.find(p => p.id === manualForm.produto_id);
    if (!produto) return;

    const newStock = produto.stock_atual + qty;
    const totalCost = produto.custo_medio * produto.stock_atual + cost * qty;
    const newCustoMedio = newStock > 0 ? totalCost / newStock : cost;

    await supabase.from('produtos').update({ stock_atual: newStock, custo_medio: newCustoMedio }).eq('id', manualForm.produto_id);
    await supabase.from('movimentacoes').insert({
      produto_id: manualForm.produto_id,
      tipo: 'entrada',
      quantidade: qty,
      custo_unitario: cost,
      motivo: 'Entrada manual',
    });

    toast({ title: 'Entrada registada' });
    setShowManualEntry(false);
    setManualForm({ produto_id: '', quantidade: '', custo_unitario: '', tipo: 'entrada' });
    fetchData();
  };

  const handleExit = async () => {
    if (!exitForm.produto_id || !exitForm.quantidade) return;
    const qty = parseFloat(exitForm.quantidade);
    const produto = produtos.find(p => p.id === exitForm.produto_id);
    if (!produto) return;

    const newStock = Math.max(0, produto.stock_atual - qty);
    await supabase.from('produtos').update({ stock_atual: newStock }).eq('id', exitForm.produto_id);
    await supabase.from('movimentacoes').insert({
      produto_id: exitForm.produto_id,
      tipo: exitForm.tipo,
      quantidade: qty,
      motivo: exitForm.motivo || (exitForm.tipo === 'quebra' ? 'Desperdício/Estrago' : 'Saída manual'),
    });

    toast({ title: exitForm.tipo === 'quebra' ? 'Quebra registada' : 'Saída registada' });
    setShowExit(false);
    setExitForm({ produto_id: '', quantidade: '', motivo: '', tipo: 'saida' });
    fetchData();
  };

  const handleOrder = (fornecedorId: string, items: Produto[]) => {
    const forn = fornecedores.find(f => f.id === fornecedorId);
    const itemList = items.map(p => `${p.stock_maximo - p.stock_atual}${p.unidade} ${p.nome}`).join(', ');
    toast({
      title: 'Encomenda gerada',
      description: `${forn?.nome || 'Fornecedor'}: ${itemList}`,
    });
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
      <div>
        <h1 className="text-3xl text-foreground">Inventário</h1>
        <p className="mt-1 text-muted-foreground">
          {produtos.length} produtos · {lowStock.length} abaixo do mínimo
        </p>
      </div>

      <Tabs defaultValue="entrada" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="entrada" className="flex items-center gap-2">
            <ArrowDownCircle className="h-4 w-4" />
            Entrada
          </TabsTrigger>
          <TabsTrigger value="saidas" className="flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4" />
            Saídas
          </TabsTrigger>
          <TabsTrigger value="faltas" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Faltas ({lowStock.length})
          </TabsTrigger>
        </TabsList>

        {/* ===== ENTRADA DE STOCK ===== */}
        <TabsContent value="entrada" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <label className={cn(
              "flex items-center gap-2 cursor-pointer rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-6 py-4 transition-colors hover:bg-primary/10",
              scanning && "opacity-50 pointer-events-none"
            )}>
              <Camera className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">
                {scanning ? 'A processar...' : 'Scan de Fatura (OCR)'}
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleScanInvoice(e.target.files[0])}
              />
            </label>
            <Button variant="outline" onClick={() => setShowManualEntry(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Entrada Manual
            </Button>
          </div>

          {/* Scanned items review */}
          <AnimatePresence>
            {showScanned && scannedItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-xl border border-primary/20 bg-card p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Itens Detetados ({scannedItems.length})</h3>
                  <Button variant="ghost" size="sm" onClick={() => { setShowScanned(false); setScannedItems([]); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {scannedItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => {
                          const copy = [...scannedItems];
                          copy[i].selected = !copy[i].selected;
                          setScannedItems(copy);
                        }}
                        className="accent-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantidade}{item.unidade} · €{item.custo_unitario.toFixed(2)}/un
                          {item.produto_id ? ' ✓ Produto existente' : ' ⚡ Novo produto'}
                        </p>
                      </div>
                      {!item.produto_id && (
                        <Select
                          value={item.produto_id || ''}
                          onValueChange={(v) => {
                            const copy = [...scannedItems];
                            copy[i].produto_id = v;
                            setScannedItems(copy);
                          }}
                        >
                          <SelectTrigger className="w-40 h-8 text-xs">
                            <SelectValue placeholder="Associar produto" />
                          </SelectTrigger>
                          <SelectContent>
                            {produtos.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ))}
                </div>
                <Button onClick={confirmScannedItems} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Confirmar {scannedItems.filter(i => i.selected).length} Itens
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Manual entry form */}
          <AnimatePresence>
            {showManualEntry && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-xl border border-border bg-card p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Entrada Manual</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowManualEntry(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Select value={manualForm.produto_id} onValueChange={(v) => setManualForm(f => ({ ...f, produto_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Produto" /></SelectTrigger>
                    <SelectContent>
                      {produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome} ({p.unidade})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="Quantidade" value={manualForm.quantidade} onChange={e => setManualForm(f => ({ ...f, quantidade: e.target.value }))} />
                  <Input type="number" placeholder="Custo/Un (€)" step="0.01" value={manualForm.custo_unitario} onChange={e => setManualForm(f => ({ ...f, custo_unitario: e.target.value }))} />
                </div>
                <Button onClick={handleManualEntry} disabled={!manualForm.produto_id || !manualForm.quantidade}>
                  Registar Entrada
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recent movements */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Movimentações Recentes</h3>
            </div>
            <div className="divide-y divide-border">
              {movimentacoes.slice(0, 10).map(mov => (
                <div key={mov.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full',
                      mov.tipo === 'entrada' ? 'bg-success/10 text-success' :
                      mov.tipo === 'quebra' ? 'bg-destructive/10 text-destructive' :
                      'bg-warning/10 text-warning'
                    )}>
                      {mov.tipo === 'entrada' ? <ArrowDownCircle className="h-4 w-4" /> :
                       mov.tipo === 'quebra' ? <Trash2 className="h-4 w-4" /> :
                       <ArrowUpCircle className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{(mov.produtos as any)?.nome || 'Produto'}</p>
                      <p className="text-xs text-muted-foreground">{mov.motivo || mov.tipo} · {new Date(mov.created_at).toLocaleDateString('pt-PT')}</p>
                    </div>
                  </div>
                  <span className={cn(
                    'text-sm font-medium',
                    mov.tipo === 'entrada' ? 'text-success' : 'text-destructive'
                  )}>
                    {mov.tipo === 'entrada' ? '+' : '-'}{mov.quantidade}{(mov.produtos as any)?.unidade || ''}
                  </span>
                </div>
              ))}
              {movimentacoes.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">Sem movimentações registadas</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ===== SAÍDAS DE STOCK ===== */}
        <TabsContent value="saidas" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => { setShowExit(true); setExitForm(f => ({ ...f, tipo: 'saida' })); }}>
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              Saída por Unidade
            </Button>
            <Button variant="outline" onClick={() => { setShowExit(true); setExitForm(f => ({ ...f, tipo: 'quebra' })); }}>
              <Trash2 className="h-4 w-4 mr-2" />
              Desperdício / Estrago
            </Button>
          </div>

          <AnimatePresence>
            {showExit && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-xl border border-border bg-card p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    {exitForm.tipo === 'quebra' ? 'Registar Quebra' : 'Saída de Stock'}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowExit(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Select value={exitForm.produto_id} onValueChange={(v) => setExitForm(f => ({ ...f, produto_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Produto" /></SelectTrigger>
                    <SelectContent>
                      {produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome} ({p.stock_atual}{p.unidade})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="Quantidade" value={exitForm.quantidade} onChange={e => setExitForm(f => ({ ...f, quantidade: e.target.value }))} />
                  <Input placeholder="Motivo (opcional)" value={exitForm.motivo} onChange={e => setExitForm(f => ({ ...f, motivo: e.target.value }))} />
                </div>
                <Button
                  onClick={handleExit}
                  disabled={!exitForm.produto_id || !exitForm.quantidade}
                  variant={exitForm.tipo === 'quebra' ? 'destructive' : 'default'}
                >
                  {exitForm.tipo === 'quebra' ? 'Registar Quebra' : 'Registar Saída'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stock overview table */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="px-4 py-3 border-b border-border flex items-center gap-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar produto..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
              />
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Produto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stock</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nível</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Custo Médio</th>
                </tr>
              </thead>
              <tbody>
                {filteredProdutos.map(p => {
                  const level = getStockLevel(p);
                  return (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-foreground">{p.nome}</p>
                        <p className="text-xs text-muted-foreground">{p.categoria} · {p.sku || 'Sem SKU'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-foreground">{p.stock_atual}{p.unidade}</span>
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn('h-full rounded-full transition-all', level.color)}
                              style={{ width: `${Math.min((p.stock_atual / p.stock_maximo) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                          p.stock_atual <= p.stock_minimo ? 'bg-destructive/10 text-destructive' :
                          level.label === 'Baixo' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                        )}>
                          {p.stock_atual <= p.stock_minimo ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                          {level.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">€{p.custo_medio.toFixed(2)}/{p.unidade}</td>
                    </tr>
                  );
                })}
                {filteredProdutos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      {produtos.length === 0 ? 'Sem produtos. Use o scanner ou adicione manualmente.' : 'Nenhum resultado.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ===== FALTAS E ENCOMENDAS ===== */}
        <TabsContent value="faltas" className="space-y-4">
          {lowStock.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
              <p className="text-foreground font-medium">Stock OK</p>
              <p className="text-sm text-muted-foreground">Todos os produtos estão acima do mínimo.</p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-semibold text-destructive">{lowStock.length} produtos abaixo do mínimo</span>
                </div>
              </div>

              {Object.entries(faltasByFornecedor).map(([fId, items]) => {
                const forn = fornecedores.find(f => f.id === fId);
                return (
                  <motion.div
                    key={fId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{forn?.nome || 'Sem Fornecedor'}</p>
                        {forn?.email && <p className="text-xs text-muted-foreground">{forn.email}</p>}
                        {forn?.dia_encomenda && <p className="text-xs text-muted-foreground">Encomenda: {forn.dia_encomenda}</p>}
                      </div>
                      <Button size="sm" onClick={() => handleOrder(fId, items)}>
                        <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                        Gerar Encomenda
                      </Button>
                    </div>
                    <div className="divide-y divide-border">
                      {items.map(p => (
                        <div key={p.id} className="flex items-center justify-between px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{p.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              Stock: {p.stock_atual}{p.unidade} · Mín: {p.stock_minimo}{p.unidade}
                            </p>
                          </div>
                          <span className="text-sm font-medium text-primary">
                            Pedir: {p.stock_maximo - p.stock_atual}{p.unidade}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
