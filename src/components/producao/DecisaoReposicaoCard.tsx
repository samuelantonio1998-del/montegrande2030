import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, X, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useDecisaoReposicao } from '@/hooks/useDecisaoReposicao';
import { recipientCapacity, type RecipientSize } from '@/lib/buffet-data';

type Props = {
  registoId: string;
  onRepor: (kg: number, recipiente: RecipientSize) => void | Promise<void>;
  onDismiss: () => void;
};

/** Cartão que responde a "repor ou não" logo a seguir à recolha de um tabuleiro. */
export function DecisaoReposicaoCard({ registoId, onRepor, onDismiss }: Props) {
  const d = useDecisaoReposicao(registoId);
  const [kg, setKg] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (d.quantidadeSugeridaKg > 0) setKg(String(d.quantidadeSugeridaKg));
  }, [d.quantidadeSugeridaKg]);

  if (d.loading || !d.registo) return null;

  const repor = d.recomendacao !== 'nao_repor';

  async function confirmar() {
    const valor = parseFloat(kg.replace(',', '.'));
    if (!(valor > 0)) return;
    setEnviando(true);
    await onRepor(valor, d.recipienteSugerido);
    setEnviando(false);
    onDismiss();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border-2 p-5',
        repor ? 'border-primary/40 bg-primary/5' : 'border-muted-foreground/25 bg-muted/40',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {repor ? <RefreshCw className="h-5 w-5 text-primary" /> : <Clock className="h-5 w-5 text-muted-foreground" />}
          <div>
            <h3 className={cn('font-semibold', repor ? 'text-primary' : 'text-foreground')}>{d.titulo}</h3>
            <p className="text-xs text-muted-foreground">{d.registo.dish_name}</p>
          </div>
        </div>
        <button onClick={onDismiss} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Fechar">
          <X className="h-4 w-4" />
        </button>
      </div>

      <ul className="mt-3 space-y-1">
        {d.razoes.map((r, i) => (
          <li key={i} className="text-sm text-foreground/80">• {r}</li>
        ))}
      </ul>

      {!d.temHistorico && (
        <Badge variant="outline" className="mt-3 text-[10px]">Sem histórico suficiente deste prato</Badge>
      )}

      {repor && (
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
          <div className="w-32">
            <Label className="text-xs">Quantidade (kg)</Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0.1"
              value={kg}
              onChange={e => setKg(e.target.value)}
            />
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            {recipientCapacity[d.recipienteSugerido]?.label ?? d.recipienteSugerido}
          </p>
          <Button onClick={confirmar} disabled={enviando || !(parseFloat(kg.replace(',', '.')) > 0)} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Registar reposição
          </Button>
        </div>
      )}
    </motion.div>
  );
}

export default DecisaoReposicaoCard;
