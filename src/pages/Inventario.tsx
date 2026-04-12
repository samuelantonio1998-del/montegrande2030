import { useState, useEffect, useCallback, useRef } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AlertTriangle, CheckCircle2, ShoppingCart, Camera, Package, ArrowDownCircle, ArrowUpCircle, Trash2, Upload, Plus, Search, X, Edit3, Eye, Loader2, ImageIcon, History, Info, ChevronDown, Pencil, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ProductHistoryDialog } from '@/components/inventario/ProductHistoryDialog';
import { useActivityLog } from '@/hooks/useActivityLog';
import { QuickOrderDialog } from '@/components/fornecedores/QuickOrderDialog';

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
  desconto: number;
  fornecedor: string | null;
  sku: string | null;
  selected: boolean;
  produto_id?: string;
};

type InvoiceMeta = {
  numero_fatura: string | null;
  data_fatura: string | null;
  fornecedor_nome: string | null;
};

type ScannerStep = 'idle' | 'preview' | 'processing' | 'review';

// Fuzzy string similarity (bigram Dice + substring bonus)
function normalizeStr(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').trim();
}

function bigrams(s: string): Set<string> {
  const n = normalizeStr(s);
  const set = new Set<string>();
  for (let i = 0; i < n.length - 1; i++) set.add(n.slice(i, i + 2));
  return set;
}

function similarity(a: string, b: string): number {
  const na = normalizeStr(a);
  const nb = normalizeStr(b);
  if (na === nb) return 1;

  // Bigram Dice coefficient
  const bg1 = bigrams(a);
  const bg2 = bigrams(b);
  let dice = 0;
  if (bg1.size > 0 && bg2.size > 0) {
    let intersection = 0;
    bg1.forEach(b => { if (bg2.has(b)) intersection++; });
    dice = (2 * intersection) / (bg1.size + bg2.size);
  }

  // Substring bonus: if the shorter string is fully contained in the longer one
  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length <= nb.length ? nb : na;
  let substringBonus = 0;
  if (shorter.length >= 3 && longer.includes(shorter)) {
    // Boost proportional to how much of the longer string the shorter covers
    substringBonus = 0.3 * (shorter.length / longer.length);
  } else {
    // Check if all words of the shorter string appear in the longer one
    const shortWords = shorter.split(/\s+/).filter(w => w.length >= 2);
    if (shortWords.length > 0) {
      const matched = shortWords.filter(w => longer.includes(w)).length;
      const ratio = matched / shortWords.length;
      if (ratio >= 0.8) {
        substringBonus = 0.25 * ratio * (shorter.length / longer.length);
      }
    }
  }

  return Math.min(1, dice + substringBonus);
}

const FUZZY_THRESHOLD = 0.45;

export default function Inventario() {
  const { toast } = useToast();
  const { log } = useActivityLog();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('entrada');

  // Scanner state
  const [scannerStep, setScannerStep] = useState<ScannerStep>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [confirmingEntry, setConfirmingEntry] = useState(false);
  const [invoiceMeta, setInvoiceMeta] = useState<InvoiceMeta>({ numero_fatura: null, data_fatura: null, fornecedor_nome: null });
  const [duplicateWarning, setDuplicateWarning] = useState<{ found: boolean; created_at?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual entry state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualForm, setManualForm] = useState({ produto_id: '', quantidade: '', custo_unitario: '', tipo: 'entrada' as string });

  // New product inline form
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProductForm, setNewProductForm] = useState({ nome: '', unidade: 'kg', categoria: 'geral', stock_minimo: '0', stock_maximo: '100' });
  const [creatingProduct, setCreatingProduct] = useState(false);

  // Exit state
  const [showExit, setShowExit] = useState(false);

  // History dialog
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [exitForm, setExitForm] = useState({ produto_id: '', quantidade: '', motivo: '', tipo: 'saida' as string });
  const [deletingProduct, setDeletingProduct] = useState<Produto | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editProductName, setEditProductName] = useState('');

  // Movimentações "ver mais"
  const [movLimit, setMovLimit] = useState(10);

  // Confirmation dialogs
  const [confirmExit, setConfirmExit] = useState(false);
  const [confirmInvoice, setConfirmInvoice] = useState(false);
  const [orderFornecedor, setOrderFornecedor] = useState<{ id: string; nome: string; email: string | null } | null>(null);
  const [orderProducts, setOrderProducts] = useState<Produto[]>([]);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    // Fetch movimentações from this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString();
    const [prodRes, fornRes, movRes] = await Promise.all([
      supabase.from('produtos').select('*').eq('ativo', true).order('nome'),
      supabase.from('fornecedores').select('*').order('nome'),
      supabase.from('movimentacoes').select('*, produtos(nome, unidade)').order('created_at', { ascending: false }).gte('created_at', weekAgoStr).limit(200),
    ]);
    if (prodRes.data) setProdutos(prodRes.data.map(p => ({ ...p, stock_atual: parseFloat(p.stock_atual.toFixed(2)), stock_minimo: parseFloat(p.stock_minimo.toFixed(2)), stock_maximo: parseFloat(p.stock_maximo.toFixed(2)), custo_medio: parseFloat(p.custo_medio.toFixed(4)) })));
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

      const meta: InvoiceMeta = {
        numero_fatura: data.numero_fatura || null,
        data_fatura: data.data_fatura || null,
        fornecedor_nome: data.fornecedor_nome || null,
      };
      setInvoiceMeta(meta);

      const hashParts = [meta.numero_fatura, meta.data_fatura, meta.fornecedor_nome].filter(Boolean).map(s => s!.trim().toLowerCase());
      const hashStr = hashParts.join('|');
      if (hashStr) {
        const { data: existing } = await supabase.from('faturas_processadas').select('created_at').eq('hash_identificador', hashStr).maybeSingle();
        if (existing) {
          setDuplicateWarning({ found: true, created_at: existing.created_at });
        } else {
          setDuplicateWarning(null);
        }
      } else {
        setDuplicateWarning(null);
      }

      const { data: aliases } = await supabase.from('produto_aliases' as any).select('alias_nome, produto_id');
      const aliasMap = new Map<string, string>();
      if (aliases) {
        for (const a of aliases as any[]) {
          aliasMap.set((a.alias_nome as string).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(), a.produto_id as string);
        }
      }

      const items: ScannedItem[] = (data.items || []).map((item: any) => {
        const matchBySku = item.sku ? produtos.find(p => p.sku && p.sku.toLowerCase() === item.sku.toLowerCase()) : null;
        const matchByName = produtos.find(p => p.nome.toLowerCase() === item.nome?.toLowerCase());
        const matchByNameAndSupplier = item.fornecedor
          ? produtos.find(p => {
              if (p.nome.toLowerCase() !== item.nome?.toLowerCase()) return false;
              if (!p.fornecedor_id) return false;
              const forn = fornecedores.find(f => f.id === p.fornecedor_id);
              return forn?.nome.toLowerCase() === item.fornecedor?.toLowerCase();
            })
          : null;
        const normalizedItemName = item.nome?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() || '';
        const aliasProductId = aliasMap.get(normalizedItemName);
        const matchByAlias = aliasProductId ? produtos.find(p => p.id === aliasProductId) : null;
        let matchByFuzzy: Produto | null = null;
        if (!matchBySku && !matchByNameAndSupplier && !matchByName && !matchByAlias && item.nome) {
          let bestScore = 0;
          for (const p of produtos) {
            const score = similarity(item.nome, p.nome);
            if (score > bestScore && score >= FUZZY_THRESHOLD) {
              bestScore = score;
              matchByFuzzy = p;
            }
          }
        }
        const match = matchBySku || matchByNameAndSupplier || matchByName || matchByAlias || matchByFuzzy;
        return { ...item, desconto: item.desconto || 0, selected: true, produto_id: match?.id };
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

  // Step 3: Confirm scanned items (with confirmation popup)
  const confirmScannedItems = async () => {
    setConfirmingEntry(true);
    const selected = scannedItems.filter(i => i.selected);

    const supplierCache: Record<string, string> = {};
    for (const item of selected) {
      if (item.fornecedor && item.fornecedor.trim()) {
        const fornNome = item.fornecedor.trim();
        if (!supplierCache[fornNome.toLowerCase()]) {
          const existing = fornecedores.find(f => f.nome.toLowerCase() === fornNome.toLowerCase());
          if (existing) {
            supplierCache[fornNome.toLowerCase()] = existing.id;
          } else {
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
          const effectiveCost = item.quantidade > 0 ? (item.custo_unitario * item.quantidade - item.desconto) / item.quantidade : item.custo_unitario;
          const newStock = parseFloat((produto.stock_atual + item.quantidade).toFixed(2));
          const totalCost = produto.custo_medio * produto.stock_atual + effectiveCost * item.quantidade;
          const newCustoMedio = parseFloat((newStock > 0 ? totalCost / newStock : effectiveCost).toFixed(4));
          const updatePayload: any = { stock_atual: newStock, custo_medio: newCustoMedio };
          if (fornecedorId && !produto.fornecedor_id) updatePayload.fornecedor_id = fornecedorId;
          await supabase.from('produtos').update(updatePayload).eq('id', item.produto_id);
          await supabase.from('movimentacoes').insert({
            produto_id: item.produto_id, tipo: 'entrada', quantidade: item.quantidade,
            custo_unitario: effectiveCost, motivo: item.desconto > 0 ? `Fatura OCR (desc. -€${item.desconto.toFixed(2)})` : 'Fatura OCR',
            fornecedor_id: fornecedorId,
          });

          // Save alias when item name differs from product name (manual association)
          if (item.nome && normalizeStr(item.nome) !== normalizeStr(produto.nome)) {
            const { data: existingAlias } = await supabase.from('produto_aliases').select('id')
              .ilike('alias_nome', item.nome).eq('produto_id', item.produto_id).limit(1);
            if (!existingAlias?.length) {
              await supabase.from('produto_aliases').insert({
                produto_id: item.produto_id,
                alias_nome: item.nome,
                fornecedor_id: fornecedorId,
              });
            }
          }
        }
      } else {
        let existingProd = item.sku
          ? produtos.find(p => p.sku && p.sku.toLowerCase() === item.sku.toLowerCase())
          : null;
        if (!existingProd && fornecedorId) {
          existingProd = produtos.find(p => p.nome.toLowerCase() === item.nome.toLowerCase() && p.fornecedor_id === fornecedorId);
        }
        if (!existingProd) {
          const { data: aliasMatch } = await supabase.from('produto_aliases' as any).select('produto_id')
            .ilike('alias_nome', item.nome).limit(1);
          if (aliasMatch?.[0]) {
            existingProd = produtos.find(p => p.id === (aliasMatch[0] as any).produto_id) || null;
          }
        }
        if (!existingProd) {
          let bestScore = 0;
          for (const p of produtos) {
            const score = similarity(item.nome, p.nome);
            if (score > bestScore && score >= FUZZY_THRESHOLD) {
              bestScore = score;
              existingProd = p;
            }
          }
        }

        if (existingProd) {
          const newStock = parseFloat((existingProd.stock_atual + item.quantidade).toFixed(2));
          const totalCost = existingProd.custo_medio * existingProd.stock_atual + item.custo_unitario * item.quantidade;
          const newCustoMedio = parseFloat((newStock > 0 ? totalCost / newStock : item.custo_unitario).toFixed(4));
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
    const hashParts = [invoiceMeta.numero_fatura, invoiceMeta.data_fatura, invoiceMeta.fornecedor_nome].filter(Boolean).map(s => s!.trim().toLowerCase());
    const hashStr = hashParts.join('|');
    if (hashStr) {
      await supabase.from('faturas_processadas' as any).insert({
        numero_fatura: invoiceMeta.numero_fatura,
        data_fatura: invoiceMeta.data_fatura,
        fornecedor: invoiceMeta.fornecedor_nome,
        hash_identificador: hashStr,
        total_itens: selected.length,
      });
    }

    toast({ title: `${selected.length} itens registados com sucesso` });
    for (const item of selected) {
      await log('Entrada stock (OCR)', 'Inventário', `${item.nome} +${item.quantidade} ${item.unidade}`, { produto_id: item.produto_id, quantidade: item.quantidade, custo_unitario: item.custo_unitario });
    }
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
    setInvoiceMeta({ numero_fatura: null, data_fatura: null, fornecedor_nome: null });
    setDuplicateWarning(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateScannedItem = (index: number, field: keyof ScannedItem, value: any) => {
    const copy = [...scannedItems];
    (copy[index] as any)[field] = value;
    setScannedItems(copy);
  };

  // Helper: parse decimal input accepting both comma and dot
  const parseDecimalInput = (val: string): number => {
    const normalized = val.replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Track raw string values for numeric inputs to allow editing with commas
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({});
  const getRawKey = (idx: number, field: string) => `${idx}_${field}`;
  const getRawValue = (idx: number, field: string, numericValue: number) => {
    const key = getRawKey(idx, field);
    return rawInputs[key] ?? String(numericValue);
  };
  const setRawValue = (idx: number, field: string, val: string) => {
    setRawInputs(prev => ({ ...prev, [getRawKey(idx, field)]: val }));
  };
  const handleDecimalChange = (idx: number, field: keyof ScannedItem, val: string) => {
    // Allow empty, commas, dots while typing
    setRawValue(idx, field, val);
    const normalized = val.replace(',', '.');
    const parsed = parseFloat(normalized);
    if (!isNaN(parsed)) {
      updateScannedItem(idx, field, parsed);
    } else if (val === '' || val === '0' || val === '0,' || val === '0.') {
      updateScannedItem(idx, field, 0);
    }
  };
  const handleDecimalBlur = (idx: number, field: keyof ScannedItem) => {
    const key = getRawKey(idx, field);
    const raw = rawInputs[key];
    if (raw !== undefined) {
      const parsed = parseDecimalInput(raw);
      updateScannedItem(idx, field, parsed);
      setRawInputs(prev => { const n = { ...prev }; delete n[key]; return n; });
    }
  };

  const handleCreateProduct = async () => {
    if (!newProductForm.nome.trim()) {
      toast({ title: 'Nome do produto é obrigatório', variant: 'destructive' });
      return;
    }
    // Check for duplicate name
    const duplicate = produtos.find(p => p.nome.toLowerCase().trim() === newProductForm.nome.toLowerCase().trim());
    if (duplicate) {
      toast({ title: 'Já existe um produto com este nome', description: `"${duplicate.nome}" já está registado no inventário.`, variant: 'destructive' });
      return;
    }
    setCreatingProduct(true);
    try {
      const { data, error } = await supabase.from('produtos').insert({
        nome: newProductForm.nome.trim(),
        unidade: newProductForm.unidade,
        categoria: newProductForm.categoria,
        stock_minimo: parseFloat(newProductForm.stock_minimo) || 0,
        stock_maximo: parseFloat(newProductForm.stock_maximo) || 100,
        stock_atual: 0,
        custo_medio: 0,
      }).select('id').single();

      if (error) throw error;

      toast({ title: `Produto "${newProductForm.nome}" criado` });
      await log('Criar produto', 'Inventário', `Novo produto: ${newProductForm.nome}`);
      setNewProductForm({ nome: '', unidade: 'kg', categoria: 'geral', stock_minimo: '0', stock_maximo: '100' });
      setShowNewProduct(false);
      await fetchData();
      if (data?.id) {
        setManualForm(f => ({ ...f, produto_id: data.id }));
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao criar produto', variant: 'destructive' });
    } finally {
      setCreatingProduct(false);
    }
  };

  const handleManualEntry = async () => {
    if (!manualForm.produto_id || !manualForm.quantidade) return;
    const qty = parseFloat(manualForm.quantidade);
    const cost = parseFloat(manualForm.custo_unitario) || 0;
    const produto = produtos.find(p => p.id === manualForm.produto_id);
    if (!produto) return;
    const newStock = parseFloat((produto.stock_atual + qty).toFixed(2));
    const totalCost = produto.custo_medio * produto.stock_atual + cost * qty;
    const newCustoMedio = parseFloat((newStock > 0 ? totalCost / newStock : cost).toFixed(4));
    await supabase.from('produtos').update({ stock_atual: newStock, custo_medio: newCustoMedio }).eq('id', manualForm.produto_id);
    await supabase.from('movimentacoes').insert({
      produto_id: manualForm.produto_id, tipo: 'entrada', quantidade: qty,
      custo_unitario: cost, motivo: 'Entrada manual',
    });
    toast({ title: 'Entrada registada' });
    await log('Entrada stock (manual)', 'Inventário', `${produto.nome} +${qty} ${produto.unidade}`, { produto_id: produto.id, quantidade: qty, custo_unitario: cost });
    setShowManualEntry(false);
    setManualForm({ produto_id: '', quantidade: '', custo_unitario: '', tipo: 'entrada' });
    fetchData();
  };

  const handleExit = async () => {
    if (!exitForm.produto_id || !exitForm.quantidade) return;
    const qty = parseFloat(exitForm.quantidade);
    const produto = produtos.find(p => p.id === exitForm.produto_id);
    if (!produto) return;
    const newStock = parseFloat(Math.max(0, produto.stock_atual - qty).toFixed(2));
    await supabase.from('produtos').update({ stock_atual: newStock }).eq('id', exitForm.produto_id);
    await supabase.from('movimentacoes').insert({
      produto_id: exitForm.produto_id, tipo: exitForm.tipo, quantidade: qty,
      motivo: exitForm.motivo || (exitForm.tipo === 'quebra' ? 'Desperdício/Estrago' : 'Saída manual'),
    });
    toast({ title: exitForm.tipo === 'quebra' ? 'Quebra registada' : 'Saída registada' });
    await log(exitForm.tipo === 'quebra' ? 'Quebra stock' : 'Saída stock', 'Inventário', `${produto.nome} -${qty} ${produto.unidade}`, { produto_id: produto.id, quantidade: qty, motivo: exitForm.motivo });
    setShowExit(false);
    setExitForm({ produto_id: '', quantidade: '', motivo: '', tipo: 'saida' });
    setConfirmExit(false);
    fetchData();
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    await supabase.from('produtos').update({ ativo: false }).eq('id', deletingProduct.id);
    toast({ title: 'Produto removido', description: `${deletingProduct.nome} foi removido do inventário.` });
    setDeletingProduct(null);
    fetchData();
  };


  // Get selected exit product for showing stock info
  const exitProduct = produtos.find(p => p.id === exitForm.produto_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const selectedCount = scannedItems.filter(i => i.selected).length;
  const totalValue = scannedItems.filter(i => i.selected).reduce((sum, i) => sum + i.quantidade * i.custo_unitario - i.desconto, 0);
  const totalDiscount = scannedItems.filter(i => i.selected).reduce((sum, i) => sum + i.desconto, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-foreground">Inventário</h1>
        <p className="mt-1 text-muted-foreground">
          {produtos.length} produtos · {lowStock.length} abaixo do mínimo
        </p>
      </div>

      {/* Nota informativa sobre unidades */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-start gap-2.5">
        <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-0.5">⚠️ Regra de unidades</p>
          <p>Como deu entrada, tem que dar saída. Se o produto entrou em <strong>kg</strong>, tem que sair em <strong>kg</strong>. Se entrou por <strong>unidade</strong>, sai por <strong>unidade</strong>. Se entrou <strong>congelado</strong>, tem que sair como <strong>congelado</strong>. Verifique sempre as quantidades ao dar entrada e saída.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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

                {duplicateWarning?.found && (
                  <div className="px-4 py-3 bg-warning/15 border-b border-warning/30 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">⚠️ Fatura possivelmente duplicada</p>
                      <p className="text-xs text-muted-foreground">
                        {invoiceMeta.numero_fatura && <>Fatura <strong>{invoiceMeta.numero_fatura}</strong> </>}
                        {invoiceMeta.fornecedor_nome && <>de <strong>{invoiceMeta.fornecedor_nome}</strong> </>}
                        já foi processada em {duplicateWarning.created_at ? new Date(duplicateWarning.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'data desconhecida'}.
                        Pode continuar se pretender processar novamente.
                      </p>
                    </div>
                  </div>
                )}

                {(invoiceMeta.numero_fatura || invoiceMeta.data_fatura || invoiceMeta.fornecedor_nome) && (
                  <div className="px-4 py-2 border-b border-border bg-muted/30 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {invoiceMeta.numero_fatura && <span>📄 <strong>Nº:</strong> {invoiceMeta.numero_fatura}</span>}
                    {invoiceMeta.data_fatura && <span>📅 <strong>Data:</strong> {invoiceMeta.data_fatura}</span>}
                    {invoiceMeta.fornecedor_nome && <span>🏢 <strong>Fornecedor:</strong> {invoiceMeta.fornecedor_nome}</span>}
                  </div>
                )}

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
                    {/* Mobile card layout */}
                    <div className="md:hidden space-y-2 px-2">
                      {scannedItems.map((item, i) => (
                        <div key={i} className={cn(
                          "rounded-lg border border-border p-3 transition-colors",
                          !item.selected && "opacity-40 bg-muted/20",
                          item.selected && "bg-card"
                        )}>
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => updateScannedItem(i, 'selected', !item.selected)}
                              className="accent-primary h-4 w-4 mt-2 shrink-0"
                            />
                            <div className="flex-1 min-w-0 space-y-2">
                              <Input
                                value={item.nome}
                                onChange={(e) => updateScannedItem(i, 'nome', e.target.value)}
                                className="h-8 text-sm font-medium border-transparent bg-transparent hover:border-input focus:border-input px-1"
                              />
                               <div className="grid grid-cols-4 gap-2">
                                <div>
                                  <span className="text-[10px] uppercase text-muted-foreground">Qtd.</span>
                                  <Input
                                    inputMode="decimal"
                                    value={getRawValue(i, 'quantidade', item.quantidade)}
                                    onChange={(e) => handleDecimalChange(i, 'quantidade', e.target.value)}
                                    onBlur={() => handleDecimalBlur(i, 'quantidade')}
                                    className="h-7 text-sm border-transparent bg-muted/40 hover:border-input focus:border-input"
                                  />
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase text-muted-foreground">Un.</span>
                                  <Input
                                    value={item.unidade}
                                    onChange={(e) => updateScannedItem(i, 'unidade', e.target.value)}
                                    className="h-7 text-sm border-transparent bg-muted/40 hover:border-input focus:border-input"
                                  />
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase text-muted-foreground">€/Un</span>
                                  <Input
                                    inputMode="decimal"
                                    value={getRawValue(i, 'custo_unitario', item.custo_unitario)}
                                    onChange={(e) => handleDecimalChange(i, 'custo_unitario', e.target.value)}
                                    onBlur={() => handleDecimalBlur(i, 'custo_unitario')}
                                    className="h-7 text-sm border-transparent bg-muted/40 hover:border-input focus:border-input"
                                  />
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase text-muted-foreground">Desc.</span>
                                  <Input
                                    inputMode="decimal"
                                    value={getRawValue(i, 'desconto', item.desconto)}
                                    onChange={(e) => handleDecimalChange(i, 'desconto', e.target.value)}
                                    onBlur={() => handleDecimalBlur(i, 'desconto')}
                                    className={cn("h-7 text-sm border-transparent bg-muted/40 hover:border-input focus:border-input", item.desconto > 0 && "text-success")}
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-[10px] uppercase text-muted-foreground">SKU</span>
                                  <Input
                                    value={item.sku || ''}
                                    onChange={(e) => updateScannedItem(i, 'sku', e.target.value)}
                                    className="h-7 text-xs border-transparent bg-muted/40 hover:border-input focus:border-input"
                                    placeholder="—"
                                  />
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase text-muted-foreground">Fornecedor</span>
                                  <Input
                                    value={item.fornecedor || ''}
                                    onChange={(e) => updateScannedItem(i, 'fornecedor', e.target.value)}
                                    className="h-7 text-xs border-transparent bg-muted/40 hover:border-input focus:border-input"
                                    placeholder="—"
                                  />
                                </div>
                              </div>
                              <Select
                                value={item.produto_id || 'new'}
                                onValueChange={(v) => updateScannedItem(i, 'produto_id', v === 'new' ? undefined : v)}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue placeholder="Novo produto" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="new">⚡ Criar novo...</SelectItem>
                                  {produtos.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {item.produto_id && (() => {
                                const prod = produtos.find(p => p.id === item.produto_id);
                                return prod ? (
                                  <p className="text-[10px] text-muted-foreground">Stock atual: <strong>{prod.stock_atual}{prod.unidade}</strong></p>
                                ) : null;
                              })()}
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-muted-foreground">
                                  Total: €{(item.quantidade * item.custo_unitario - item.desconto).toFixed(2)}
                                  {item.desconto > 0 && <span className="text-success ml-1">(-€{item.desconto.toFixed(2)})</span>}
                                </span>
                                {!item.produto_id && <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/30">Novo</Badge>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                            <th className="px-3 py-2 w-8"></th>
                            <th className="px-3 py-2">Artigo</th>
                            <th className="px-3 py-2 w-20">Qtd.</th>
                            <th className="px-3 py-2 w-16">Un.</th>
                            <th className="px-3 py-2 w-24">€/Un (s/IVA)</th>
                            <th className="px-3 py-2 w-20">Desc.</th>
                            <th className="px-3 py-2 w-20">Total</th>
                            <th className="px-3 py-2 w-24">SKU</th>
                            <th className="px-3 py-2 w-28">Fornecedor</th>
                            <th className="px-3 py-2 w-36">Associar a</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scannedItems.map((item, i) => (
                            <tr key={i} className={cn(
                              'border-b border-border transition-colors',
                              !item.selected && 'opacity-40 bg-muted/10',
                              item.selected && 'hover:bg-muted/20',
                              !item.produto_id && item.selected && 'bg-primary/5'
                            )}>
                              <td className="px-3 py-2.5">
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
                                  inputMode="decimal"
                                  value={getRawValue(i, 'quantidade', item.quantidade)}
                                  onChange={(e) => handleDecimalChange(i, 'quantidade', e.target.value)}
                                  onBlur={() => handleDecimalBlur(i, 'quantidade')}
                                  className="h-8 text-sm border-transparent bg-transparent hover:border-input focus:border-input"
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <Input
                                  value={item.unidade}
                                  onChange={(e) => updateScannedItem(i, 'unidade', e.target.value)}
                                  className="h-8 text-sm border-transparent bg-transparent hover:border-input focus:border-input"
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <Input
                                  inputMode="decimal"
                                  value={getRawValue(i, 'custo_unitario', item.custo_unitario)}
                                  onChange={(e) => handleDecimalChange(i, 'custo_unitario', e.target.value)}
                                  onBlur={() => handleDecimalBlur(i, 'custo_unitario')}
                                  className="h-8 text-sm border-transparent bg-transparent hover:border-input focus:border-input"
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <Input
                                  inputMode="decimal"
                                  value={getRawValue(i, 'desconto', item.desconto)}
                                  onChange={(e) => handleDecimalChange(i, 'desconto', e.target.value)}
                                  onBlur={() => handleDecimalBlur(i, 'desconto')}
                                  className={cn("h-8 text-sm border-transparent bg-transparent hover:border-input focus:border-input", item.desconto > 0 && "text-success")}
                                  placeholder="0"
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="text-sm font-medium text-foreground">
                                  €{(item.quantidade * item.custo_unitario - item.desconto).toFixed(2)}
                                </span>
                                {item.desconto > 0 && <span className="text-[10px] text-success block">-€{item.desconto.toFixed(2)}</span>}
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

                    {/* Summary & Confirm with confirmation popup */}
                    <div className="px-4 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{selectedCount}</span> itens selecionados
                        {' · '}
                        Total: <span className="font-semibold text-foreground">€{totalValue.toFixed(2)}</span>
                        {totalDiscount > 0 && <span className="text-success ml-1">(desc. -€{totalDiscount.toFixed(2)})</span>}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={resetScanner}>
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setConfirmInvoice(true)}
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
                  <Button variant="ghost" size="sm" onClick={() => { setShowManualEntry(false); setShowNewProduct(false); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Select value={manualForm.produto_id} onValueChange={(v) => { if (v === '__new__') { setShowNewProduct(true); } else { setManualForm(f => ({ ...f, produto_id: v })); } }}>
                      <SelectTrigger><SelectValue placeholder="Produto" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__new__" className="text-primary font-medium">
                          <span className="flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> Criar novo produto</span>
                        </SelectItem>
                        {produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome} ({p.unidade})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input type="number" placeholder="Quantidade" value={manualForm.quantidade} onChange={e => setManualForm(f => ({ ...f, quantidade: e.target.value }))} />
                  <Input type="number" placeholder="Custo/Un (€)" step="0.01" value={manualForm.custo_unitario} onChange={e => setManualForm(f => ({ ...f, custo_unitario: e.target.value }))} />
                </div>

                {/* Inline new product form */}
                <AnimatePresence>
                  {showNewProduct && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3 overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5 text-primary" />
                          Novo Produto
                        </h4>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowNewProduct(false)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input
                          placeholder="Nome do produto *"
                          value={newProductForm.nome}
                          onChange={e => setNewProductForm(f => ({ ...f, nome: e.target.value }))}
                          className="text-sm"
                          autoFocus
                        />
                        <Select value={newProductForm.unidade} onValueChange={v => setNewProductForm(f => ({ ...f, unidade: v }))}>
                          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="un">un</SelectItem>
                            <SelectItem value="lt">lt</SelectItem>
                            <SelectItem value="cx">cx</SelectItem>
                            <SelectItem value="pack">pack</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Select value={newProductForm.categoria} onValueChange={v => setNewProductForm(f => ({ ...f, categoria: v }))}>
                          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="geral">Geral</SelectItem>
                            <SelectItem value="carnes">Carnes</SelectItem>
                            <SelectItem value="peixes">Peixes</SelectItem>
                            <SelectItem value="legumes">Legumes</SelectItem>
                            <SelectItem value="frutas">Frutas</SelectItem>
                            <SelectItem value="laticínios">Laticínios</SelectItem>
                            <SelectItem value="bebidas">Bebidas</SelectItem>
                            <SelectItem value="mercearia">Mercearia</SelectItem>
                            <SelectItem value="congelados">Congelados</SelectItem>
                            <SelectItem value="limpeza">Limpeza</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input type="number" placeholder="Stock mínimo" value={newProductForm.stock_minimo} onChange={e => setNewProductForm(f => ({ ...f, stock_minimo: e.target.value }))} className="text-sm" />
                        <Input type="number" placeholder="Stock máximo" value={newProductForm.stock_maximo} onChange={e => setNewProductForm(f => ({ ...f, stock_maximo: e.target.value }))} className="text-sm" />
                      </div>
                      <Button size="sm" onClick={handleCreateProduct} disabled={!newProductForm.nome.trim() || creatingProduct}>
                        {creatingProduct && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                        Criar Produto
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button onClick={handleManualEntry} disabled={!manualForm.produto_id || !manualForm.quantidade}>
                  Registar Entrada
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recent movements with "ver mais" */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Movimentações Recentes</h3>
              <span className="text-[10px] text-muted-foreground">Últimos 7 dias</span>
            </div>
            <div className="divide-y divide-border">
              {movimentacoes.slice(0, movLimit).map(mov => (
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
                    {mov.tipo === 'entrada' ? '+' : '-'}{parseFloat(mov.quantidade.toFixed(2))}{(mov.produtos as any)?.unidade || ''}
                  </span>
                </div>
              ))}
              {movimentacoes.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">Sem movimentações registadas</p>
              )}
            </div>
            {movimentacoes.length > movLimit && (
              <div className="px-4 py-2 border-t border-border">
                <Button variant="ghost" size="sm" className="w-full gap-1.5 text-xs" onClick={() => setMovLimit(prev => prev + 20)}>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Ver mais ({movimentacoes.length - movLimit} restantes)
                </Button>
              </div>
            )}
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
                  <Input type="number" placeholder={`Quantidade (${exitProduct?.unidade || 'un'})`} value={exitForm.quantidade} onChange={e => setExitForm(f => ({ ...f, quantidade: e.target.value }))} />
                  <Input placeholder="Motivo (opcional)" value={exitForm.motivo} onChange={e => setExitForm(f => ({ ...f, motivo: e.target.value }))} />
                </div>
                {/* Show current stock when product selected */}
                {exitProduct && (
                  <div className="rounded-lg bg-muted/50 p-2.5 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Existências atuais:</span>
                    <span className={cn('text-sm font-bold', exitProduct.stock_atual <= exitProduct.stock_minimo ? 'text-destructive' : 'text-foreground')}>
                      {exitProduct.stock_atual} {exitProduct.unidade}
                    </span>
                  </div>
                )}
                <Button
                  onClick={() => setConfirmExit(true)}
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
                     <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => { if (editingProductId !== p.id) { setSelectedProduto(p); setHistoryOpen(true); } }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            {editingProductId === p.id ? (
                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                <Input
                                  value={editProductName}
                                  onChange={e => setEditProductName(e.target.value)}
                                  className="h-7 text-sm flex-1"
                                  autoFocus
                                  onKeyDown={async e => {
                                    if (e.key === 'Enter' && editProductName.trim()) {
                                      await supabase.from('produtos').update({ nome: editProductName.trim() }).eq('id', p.id);
                                      await fetchData();
                                      setEditingProductId(null);
                                      toast({ title: 'Nome atualizado' });
                                    }
                                    if (e.key === 'Escape') setEditingProductId(null);
                                  }}
                                />
                                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={async () => {
                                  if (editProductName.trim()) {
                                    await supabase.from('produtos').update({ nome: editProductName.trim() }).eq('id', p.id);
                                    await fetchData();
                                    setEditingProductId(null);
                                    toast({ title: 'Nome atualizado' });
                                  }
                                }}>
                                  <Check className="h-3.5 w-3.5 text-success" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setEditingProductId(null)}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <button
                                className="group flex items-center gap-1.5 text-left"
                                onClick={e => { e.stopPropagation(); setEditingProductId(p.id); setEditProductName(p.nome); }}
                              >
                                <p className="text-sm font-medium text-foreground">{p.nome}</p>
                                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
                              </button>
                            )}
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
                        <div className="flex items-center gap-1">
                          <History className="h-4 w-4 text-muted-foreground" />
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeletingProduct(p); }}
                            className="p-1 rounded hover:bg-destructive/10 transition-colors"
                            title="Apagar produto"
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
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
                      <Button size="sm" onClick={() => {
                        setOrderFornecedor({ id: fId, nome: forn?.nome || 'Sem Fornecedor', email: forn?.email || null });
                        setOrderProducts(items);
                        setOrderDialogOpen(true);
                      }}>
                        <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                        Encomendar
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

      <AlertDialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja remover <strong>{deletingProduct?.nome}</strong> do inventário? O produto ficará inativo mas o histórico de movimentações será mantido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation: Exit/Quebra */}
      <AlertDialog open={confirmExit} onOpenChange={setConfirmExit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar {exitForm.tipo === 'quebra' ? 'quebra' : 'saída'}</AlertDialogTitle>
            <AlertDialogDescription>
              {exitProduct && (
                <span>
                  Vai registar a saída de <strong>{exitForm.quantidade} {exitProduct.unidade}</strong> de <strong>{exitProduct.nome}</strong>.
                  <br />Existências atuais: <strong>{exitProduct.stock_atual} {exitProduct.unidade}</strong>
                  <br />Existências após: <strong>{Math.max(0, exitProduct.stock_atual - parseFloat(exitForm.quantidade || '0'))} {exitProduct.unidade}</strong>
                  <br /><br />⚠️ Verifique se o peso/quantidade está correto antes de confirmar.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExit} className={exitForm.tipo === 'quebra' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation: Invoice submission */}
      <AlertDialog open={confirmInvoice} onOpenChange={setConfirmInvoice}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar entrada de fatura</AlertDialogTitle>
            <AlertDialogDescription>
              Vai registar a entrada de <strong>{selectedCount} itens</strong> no valor total de <strong>€{totalValue.toFixed(2)}</strong>.
              <br /><br />⚠️ Verifique se as quantidades e preços estão corretos. As existências serão atualizadas automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Rever</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmInvoice(false); confirmScannedItems(); }}>
              Confirmar Entrada
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick Order Dialog */}
      {orderFornecedor && (
        <QuickOrderDialog
          open={orderDialogOpen}
          onOpenChange={setOrderDialogOpen}
          fornecedor={orderFornecedor}
          produtos={orderProducts}
        />
      )}
    </div>
  );
}
