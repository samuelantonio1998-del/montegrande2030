import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast-with-sound';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Produto = {
  id: string;
  nome: string;
  unidade: string;
  stock_atual: number;
  stock_minimo: number | null;
  stock_maximo: number | null;
};

type Props = {
  produto: Produto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Unidades já existentes no sistema (para não inventar novas). */
  unidadesExistentes: string[];
  onSaved: () => void;
};

const BASE_UNITS = ['kg', 'un'];

const round2 = (n: number) => Math.round(n * 100) / 100;

export function ChangeUnitDialog({ produto, open, onOpenChange, unidadesExistentes, onSaved }: Props) {
  const { log } = useActivityLog();
  const { user } = useAuth();
  const [novaUnidade, setNovaUnidade] = useState('');
  const [modo, setModo] = useState<'converter' | 'manter'>('manter');
  const [fator, setFator] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && produto) {
      setNovaUnidade(produto.unidade);
      setModo('manter');
      setFator('');
    }
  }, [open, produto]);

  const opcoes = useMemo(() => {
    const set = new Set<string>(BASE_UNITS);
    unidadesExistentes.forEach(u => { if (u?.trim()) set.add(u.trim()); });
    if (produto?.unidade) set.add(produto.unidade);
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt'));
  }, [unidadesExistentes, produto]);

  if (!produto) return null;

  const mudou = novaUnidade && novaUnidade !== produto.unidade;
  const f = parseFloat((fator || '').replace(',', '.'));
  const fatorValido = !isNaN(f) && f > 0;

  const preview = fatorValido
    ? {
        stock: round2(produto.stock_atual * f),
        min: produto.stock_minimo === null ? null : round2(produto.stock_minimo * f),
        max: produto.stock_maximo === null ? null : round2(produto.stock_maximo * f),
      }
    : null;

  const handleSave = async () => {
    if (!mudou) return;
    if (modo === 'converter' && !fatorValido) {
      toast.error('Indique um fator de conversão válido (maior que zero).');
      return;
    }
    setSaving(true);
    try {
      const update: Record<string, unknown> = {
        unidade: novaUnidade,
        unidade_anterior: produto.unidade,
        unidade_alterada_em: new Date().toISOString(),
        unidade_alterada_por: user?.name ?? 'Desconhecido',
        unidade_fator_conversao: modo === 'converter' ? f : null,
      };
      if (modo === 'converter' && preview) {
        update.stock_atual = preview.stock;
        update.stock_minimo = preview.min;
        update.stock_maximo = preview.max;
      }

      const { error } = await supabase.from('produtos').update(update as never).eq('id', produto.id);
      if (error) throw error;

      await log(
        'Alteração de unidade',
        'Inventário',
        `${produto.nome}: ${produto.unidade} → ${novaUnidade}${modo === 'converter' ? ` (convertido ×${f})` : ' (valores mantidos)'}`,
        {
          produto_id: produto.id,
          unidade_anterior: produto.unidade,
          unidade_nova: novaUnidade,
          modo,
          fator: modo === 'converter' ? f : null,
        }
      );

      toast.success(
        modo === 'converter'
          ? `Unidade alterada e valores convertidos para ${novaUnidade}.`
          : `Unidade alterada para ${novaUnidade}. Valores mantidos.`
      );
      onSaved();
      onOpenChange(false);
    } catch (e) {
      console.error('Erro ao alterar unidade:', e);
      toast.error('Não foi possível alterar a unidade.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Unidade de {produto.nome}</DialogTitle>
          <DialogDescription>
            Unidade actual: <strong>{produto.unidade}</strong> · Stock: {parseFloat(produto.stock_atual.toFixed(2))} {produto.unidade}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Nova unidade</Label>
            <Select value={novaUnidade} onValueChange={setNovaUnidade}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Escolher unidade" /></SelectTrigger>
              <SelectContent>
                {opcoes.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {mudou && (
            <>
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-1.5">
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0" /> Atenção antes de mudar
                </p>
                <p className="text-xs text-muted-foreground">
                  O stock actual e os níveis mínimo e máximo estão em <strong>{produto.unidade}</strong>. Se mudar para{' '}
                  <strong>{novaUnidade}</strong> sem converter, esses números ficam com o significado antigo.
                </p>
                <p className="text-xs text-muted-foreground">
                  As movimentações já registadas <strong>nunca são convertidas</strong> — são registos históricos e ficam sempre em{' '}
                  <strong>{produto.unidade}</strong>. A partir desta mudança, as novas entradas e saídas passam a ser em{' '}
                  <strong>{novaUnidade}</strong>.
                </p>
              </div>

              <RadioGroup value={modo} onValueChange={v => setModo(v as 'converter' | 'manter')} className="space-y-2">
                <label className={cn('flex gap-2 rounded-lg border p-3 cursor-pointer', modo === 'converter' ? 'border-primary bg-primary/5' : 'border-border')}>
                  <RadioGroupItem value="converter" id="modo-converter" className="mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Converter os valores existentes</p>
                    <p className="text-xs text-muted-foreground">
                      Aplica um fator ao stock actual e aos níveis mínimo e máximo.
                    </p>
                  </div>
                </label>
                <label className={cn('flex gap-2 rounded-lg border p-3 cursor-pointer', modo === 'manter' ? 'border-primary bg-primary/5' : 'border-border')}>
                  <RadioGroupItem value="manter" id="modo-manter" className="mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Manter os valores como estão</p>
                    <p className="text-xs text-muted-foreground">
                      Nada é recalculado. Fica guardada a data da mudança para saber a partir de quando o histórico muda de unidade.
                    </p>
                  </div>
                </label>
              </RadioGroup>

              {modo === 'converter' && (
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <Label className="text-xs">Fator de conversão</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground whitespace-nowrap">1 {produto.unidade} =</span>
                    <Input
                      inputMode="decimal"
                      placeholder="0,4"
                      value={fator}
                      onChange={e => setFator(e.target.value)}
                      className="h-9 w-28"
                    />
                    <span className="text-muted-foreground">{novaUnidade}</span>
                  </div>
                  {preview && (
                    <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground space-y-0.5">
                      <p>Stock: {parseFloat(produto.stock_atual.toFixed(2))} {produto.unidade} → <strong className="text-foreground">{preview.stock} {novaUnidade}</strong></p>
                      <p>Mínimo: {produto.stock_minimo ?? '—'} → <strong className="text-foreground">{preview.min ?? '—'}</strong></p>
                      <p>Máximo: {produto.stock_maximo ?? '—'} → <strong className="text-foreground">{preview.max ?? '—'}</strong></p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!mudou || saving || (modo === 'converter' && !fatorValido)}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar mudança
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
