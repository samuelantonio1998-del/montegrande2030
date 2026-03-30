import { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle, CheckCircle2, ShoppingCart, Camera, Package, ArrowDownCircle, ArrowUpCircle, Trash2, Upload, Plus, Search, X, Edit3, Eye, Loader2, ImageIcon, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ProductHistoryDialog } from '@/components/inventario/ProductHistoryDialog';

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

type ScannerStep = 'idle' | 'preview' | 'processing' | 'review';

export default function Inventario() {
  const { toast } = useToast();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Scanner state
  const [scannerStep, setScannerStep] = useState<ScannerStep>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [confirmingEntry, setConfirmingEntry] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual entry state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualForm, setManualForm] = useState({ produto_id: '', quantidade: '', custo_unitario: '', tipo: 'entrada' as string });

  // Exit state
  const [showExit, setShowExit] = useState(false);

  // History dialog
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
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

  // Step 1: File selected → show preview
  const handleFileSelected = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setPreviewFile(file);
    setScannerStep('preview');
  };

  // Step 2: Confirm photo → process OCR
  const handleConfirmPhoto = async () => {
    if (!previewFile) return;
    setScannerStep('processing');
    setProcessingProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 90) { clearInterval(progressInterval); return 90; }
        return prev + Math.random() * 15;
      });
    }, 400);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(previewFile);
      });

      const { data, error } = await supabase.functions.invoke('scan-invoice', {
        body: { imageBase64: base64 },
      });

      clearInterval(progressInterval);
      setProcessingProgress(100);

      if (error) throw error;

      const items: ScannedItem[] = (data.items || []).map((item: any) => {
        // Match by SKU first (most reliable), then by SKU + supplier, then by name
        const matchBySku = item.sku ? produtos.find(p => p.sku && p.sku.toLowerCase() === item.sku.toLowerCase()) : null;
        const matchByName = produtos.find(p => p.nome.toLowerCase() === item.nome?.toLowerCase());
        // If we have a supplier, try to match name + supplier for disambiguation
        const matchByNameAndSupplier = item.fornecedor
          ? produtos.find(p => {
              if (p.nome.toLowerCase() !== item.nome?.toLowerCase()) return false;
              if (!p.fornecedor_id) return false;
              const forn = fornecedores.find(f => f.id === p.fornecedor_id);
              return forn?.nome.toLowerCase() === item.fornecedor?.toLowerCase();
            })
          : null;
        const match = matchBySku || matchByNameAndSupplier || matchByName;
        return { ...item, selected: true, produto_id: match?.id };
      });

      setTimeout(() => {
        setScannedItems(items);
        setScannerStep('review');
        toast({ title: `${items.length} itens detetados na fatura` });
      }, 500);
    } catch (err: any) {
      clearInterval(progressInterval);
      toast({ title: 'Erro no scanner', description: err.message, variant: 'destructive' });
      resetScanner();
    }
  };

  // Step 3: Confirm scanned items
  const confirmScannedItems = async () => {
    setConfirmingEntry(true);
    const selected = scannedItems.filter(i => i.selected);

    // Auto-create/find suppliers from scanned items
    const supplierCache: Record<string, string> = {};
    for (const item of selected) {
      if (item.fornecedor && item.fornecedor.trim()) {
        const fornNome = item.fornecedor.trim();
        if (!supplierCache[fornNome.toLowerCase()]) {
          // Check if supplier exists
          const existing = fornecedores.find(f => f.nome.toLowerCase() === fornNome.toLowerCase());
          if (existing) {
            supplierCache[fornNome.toLowerCase()] = existing.id;
          } else {
            // Create new supplier
            const { data: newForn } = await supabase.from('fornecedores').insert({ nome: fornNome }).select().single();
            if (newForn) {
              supplierCache[fornNome.toLowerCase()] = newForn.id;
            }
          }
        }
      }
    }

    for (const item of selected) {
      const fornecedorId = item.fornecedor ? supplierCache[item.fornecedor.trim().toLowerCase()] || null : null;

      if (item.produto_id) {
        const produto = produtos.find(p => p.id === item.produto_id);
        if (produto) {
          const newStock = produto.stock_atual + item.quantidade;
          const totalCost = produto.custo_medio * produto.stock_atual + item.custo_unitario * item.quantidade;
          const newCustoMedio = newStock > 0 ? totalCost / newStock : item.custo_unitario;
          const updatePayload: any = { stock_atual: newStock, custo_medio: newCustoMedio };
          if (fornecedorId && !produto.fornecedor_id) updatePayload.fornecedor_id = fornecedorId;
          await supabase.from('produtos').update(updatePayload).eq('id', item.produto_id);
          await supabase.from('movimentacoes').insert({
            produto_id: item.produto_id, tipo: 'entrada', quantidade: item.quantidade,
            custo_unitario: item.custo_unitario, motivo: 'Fatura OCR',
            fornecedor_id: fornecedorId,
          });
        }
      } else {
        // Double-check: try to find existing product by SKU or name+supplier before creating
        let existingProd = item.sku
          ? produtos.find(p => p.sku && p.sku.toLowerCase() === item.sku.toLowerCase())
          : null;
        if (!existingProd && fornecedorId) {
          existingProd = produtos.find(p => p.nome.toLowerCase() === item.nome.toLowerCase() && p.fornecedor_id === fornecedorId);
        }

        if (existingProd) {
          // Found a match - update instead of creating duplicate
          const newStock = existingProd.stock_atual + item.quantidade;
          const totalCost = existingProd.custo_medio * existingProd.stock_atual + item.custo_unitario * item.quantidade;
          const newCustoMedio = newStock > 0 ? totalCost / newStock : item.custo_unitario;
          const updatePayload: any = { stock_atual: newStock, custo_medio: newCustoMedio };
          if (item.sku && !existingProd.sku) updatePayload.sku = item.sku;
          if (fornecedorId && !existingProd.fornecedor_id) updatePayload.fornecedor_id = fornecedorId;
          await supabase.from('produtos').update(updatePayload).eq('id', existingProd.id);
          await supabase.from('movimentacoes').insert({
            produto_id: existingProd.id, tipo: 'entrada', quantidade: item.quantidade,
            custo_unitario: item.custo_unitario, motivo: 'Fatura OCR',
            fornecedor_id: fornecedorId,
          });
        } else {
        const { data: newProd } = await supabase.from('produtos').insert({
          nome: item.nome, unidade: item.unidade, stock_atual: item.quantidade,
          custo_medio: item.custo_unitario, sku: item.sku,
          fornecedor_id: fornecedorId,
        }).select().single();
        if (newProd) {
          await supabase.from('movimentacoes').insert({
            produto_id: newProd.id, tipo: 'entrada', quantidade: item.quantidade,
            custo_unitario: item.custo_unitario, motivo: 'Fatura OCR - Novo produto',
            fornecedor_id: fornecedorId,
          });
        }
        }
      }
    }
    toast({ title: `${selected.length} itens registados com sucesso` });
    setConfirmingEntry(false);
    resetScanner();
    fetchData();
  };

  const resetScanner = () => {
    setScannerStep('idle');
    setPreviewUrl(null);
    setPreviewFile(null);
    setScannedItems([]);
    setProcessingProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateScannedItem = (index: number, field: keyof ScannedItem, value: any) => {
    const copy = [...scannedItems];
    (copy[index] as any)[field] = value;
    setScannedItems(copy);
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
      produto_id: manualForm.produto_id, tipo: 'entrada', quantidade: qty,
      custo_unitario: cost, motivo: 'Entrada manual',
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
      produto_id: exitForm.produto_id, tipo: exitForm.tipo, quantidade: qty,
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
    toast({ title: 'Encomenda gerada', description: `${forn?.nome || 'Fornecedor'}: ${itemList}` });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const selectedCount = scannedItems.filter(i => i.selected).length;
  const totalValue = scannedItems.filter(i => i.selected).reduce((sum, i) => sum + i.quantidade * i.custo_unitario, 0);

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
          
          {/* Scanner Flow */}
          <AnimatePresence mode="wait">
            {/* STEP: IDLE - Show action buttons */}
            {scannerStep === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-wrap gap-3"
              >
                <Button
                  size="lg"
                  className="flex items-center gap-3 h-auto py-4 px-6"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-6 w-6" />
                  <div className="text-left">
                    <p className="font-semibold">Abrir Câmara</p>
                    <p className="text-xs opacity-80">Scan de fatura via OCR</p>
                  </div>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
                />
                <Button variant="outline" size="lg" className="h-auto py-4 px-6" onClick={() => setShowManualEntry(true)}>
                  <Plus className="h-5 w-5 mr-2" />
                  Entrada Manual
                </Button>
              </motion.div>
            )}

            {/* STEP: PREVIEW - Show photo preview */}
            {scannerStep === 'preview' && previewUrl && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-xl border-2 border-primary/30 bg-card overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-primary/5">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Pré-visualização da Fatura</h3>
                  </div>
                  <Button variant="ghost" size="sm" onClick={resetScanner}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-4 space-y-4">
                  <div className="relative rounded-lg overflow-hidden bg-muted flex items-center justify-center max-h-[400px]">
                    <img
                      src={previewUrl}
                      alt="Pré-visualização da fatura"
                      className="max-h-[400px] w-auto object-contain"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={resetScanner}>
                      <Camera className="h-4 w-4 mr-2" />
                      Tirar outra foto
                    </Button>
                    <Button className="flex-1" onClick={handleConfirmPhoto}>
                      <Upload className="h-4 w-4 mr-2" />
                      Processar Fatura
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP: PROCESSING - Loading animation */}
            {scannerStep === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-xl border-2 border-primary/20 bg-card p-8 text-center space-y-5"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="mx-auto w-fit"
                >
                  <Loader2 className="h-12 w-12 text-primary" />
                </motion.div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">A processar fatura...</h3>
                  <p className="text-sm text-muted-foreground">
                    A IA está a extrair artigos, quantidades e preços
                  </p>
                </div>
                <div className="max-w-xs mx-auto space-y-1">
                  <Progress value={processingProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground">{Math.round(processingProgress)}%</p>
                </div>
                {previewUrl && (
                  <div className="mx-auto w-24 h-24 rounded-lg overflow-hidden opacity-50">
                    <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP: REVIEW - Editable verification table */}
            {scannerStep === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-xl border-2 border-primary/20 bg-card overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-primary/5">
                  <div className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">
                      Verificação — {scannedItems.length} itens detetados
                    </h3>
                  </div>
                  <Button variant="ghost" size="sm" onClick={resetScanner}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {scannedItems.length === 0 ? (
                  <div className="p-8 text-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-foreground font-medium">Nenhum item detetado</p>
                    <p className="text-sm text-muted-foreground mt-1">Tente outra foto com melhor iluminação</p>
                    <Button variant="outline" className="mt-4" onClick={resetScanner}>
                      <Camera className="h-4 w-4 mr-2" />
                      Tentar novamente
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="w-10 px-3 py-2.5"></th>
                            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Artigo</th>
                            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-24">Qtd.</th>
                            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-20">Un.</th>
                            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">Preço/Un <span className="normal-case font-normal">(s/IVA)</span></th>
                            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">Total</th>
                            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-24">Ref.</th>
                            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-32">Fornecedor</th>
                            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-44">Produto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scannedItems.map((item, i) => (
                            <tr key={i} className={cn(
                              "border-b border-border transition-colors",
                              !item.selected && "opacity-40 bg-muted/20",
                              item.selected && "hover:bg-muted/30"
                            )}>
                              <td className="px-3 py-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.selected}
                                  onChange={() => updateScannedItem(i, 'selected', !item.selected)}
                                  className="accent-primary h-4 w-4"
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <Input
                                  value={item.nome}
                                  onChange={(e) => updateScannedItem(i, 'nome', e.target.value)}
                                  className="h-8 text-sm border-transparent bg-transparent hover:border-input focus:border-input"
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <Input
                                  type="number"
                                  value={item.quantidade}
                                  onChange={(e) => updateScannedItem(i, 'quantidade', parseFloat(e.target.value) || 0)}
                                  className="h-8 text-sm w-20 border-transparent bg-transparent hover:border-input focus:border-input"
                                  step="0.01"
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <Input
                                  value={item.unidade}
                                  onChange={(e) => updateScannedItem(i, 'unidade', e.target.value)}
                                  className="h-8 text-sm w-16 border-transparent bg-transparent hover:border-input focus:border-input"
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <Input
                                  type="number"
                                  value={item.custo_unitario}
                                  onChange={(e) => updateScannedItem(i, 'custo_unitario', parseFloat(e.target.value) || 0)}
                                  className="h-8 text-sm w-24 border-transparent bg-transparent hover:border-input focus:border-input"
                                  step="0.01"
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="text-sm font-medium text-foreground">
                                  €{(item.quantidade * item.custo_unitario).toFixed(2)}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="text-xs text-muted-foreground font-mono">
                                  {item.sku || '—'}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="text-xs text-foreground">
                                  {item.fornecedor || '—'}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                <Select
                                  value={item.produto_id || 'new'}
                                  onValueChange={(v) => updateScannedItem(i, 'produto_id', v === 'new' ? undefined : v)}
                                >
                                  <SelectTrigger className="h-8 text-xs border-transparent bg-transparent hover:border-input">
                                    <SelectValue placeholder="Novo produto" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="new">⚡ Criar novo...</SelectItem>
                                    {produtos.map(p => (
                                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Summary & Confirm */}
                    <div className="px-4 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{selectedCount}</span> itens selecionados
                        {' · '}
                        Total: <span className="font-semibold text-foreground">€{totalValue.toFixed(2)}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={resetScanner}>
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={confirmScannedItems}
                          disabled={selectedCount === 0 || confirmingEntry}
                        >
                          {confirmingEntry ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                          )}
                          Confirmar Entrada
                        </Button>
                      </div>
                    </div>
                  </>
                )}
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
            <Button
              size="lg"
              className="flex items-center gap-3 h-auto py-4 px-6"
              onClick={() => { setShowExit(true); setExitForm(f => ({ ...f, tipo: 'saida' })); }}
            >
              <ArrowUpCircle className="h-6 w-6" />
              <div className="text-left">
                <p className="font-semibold">Saída por Unidade</p>
                <p className="text-xs opacity-80">Registo de saída de stock</p>
              </div>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-auto py-4 px-6"
              onClick={() => { setShowExit(true); setExitForm(f => ({ ...f, tipo: 'quebra' })); }}
            >
              <Trash2 className="h-5 w-5 mr-2" />
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
                   <th className="px-4 py-3 w-10"></th>
                 </tr>
              </thead>
              <tbody>
                {filteredProdutos.map(p => {
                  const level = getStockLevel(p);
                  return (
                     <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => { setSelectedProduto(p); setHistoryOpen(true); }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-sm font-medium text-foreground">{p.nome}</p>
                            <p className="text-xs text-muted-foreground">{p.categoria} · {p.sku || 'Sem SKU'}</p>
                          </div>
                        </div>
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
                      <td className="px-4 py-3">
                        <History className="h-4 w-4 text-muted-foreground" />
                      </td>
                    </tr>
                  );
                })}
                {filteredProdutos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
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

      <ProductHistoryDialog
        produto={selectedProduto}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onUpdate={fetchData}
      />
    </div>
  );
}
