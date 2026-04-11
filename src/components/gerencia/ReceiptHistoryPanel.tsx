import { useState, useEffect } from 'react';
import { Receipt, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type FechoMesa = {
  id: string;
  mesa_number: number;
  adults: number;
  children2to6: number;
  children7to12: number;
  total_pax: number;
  periodo: string;
  funcionario: string | null;
  data: string;
  created_at: string;
};

export default function ReceiptHistoryPanel() {
  const [receipts, setReceipts] = useState<FechoMesa[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from('fecho_mesas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (data) setReceipts(data);
      setLoading(false);
    };
    fetch();
  }, [limit]);

  // Group by date
  const grouped = receipts.reduce<Record<string, FechoMesa[]>>((acc, r) => {
    const key = r.data;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-4">
      <h3 className="font-display text-lg text-card-foreground flex items-center gap-2">
        <Receipt className="h-5 w-5 text-primary" /> Histórico de Talões
      </h3>

      {loading ? (
        <div className="text-center py-6 text-muted-foreground text-sm">A carregar...</div>
      ) : sortedDates.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">Sem talões registados</div>
      ) : (
        <div className="space-y-3">
          {sortedDates.map(date => {
            const items = grouped[date];
            const totalPax = items.reduce((s, r) => s + r.total_pax, 0);
            const almoco = items.filter(r => r.periodo === 'almoco').reduce((s, r) => s + r.total_pax, 0);
            const jantar = items.filter(r => r.periodo === 'jantar').reduce((s, r) => s + r.total_pax, 0);
            const isExpanded = expanded === date;

            return (
              <div key={date} className="rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setExpanded(isExpanded ? null : date)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">
                      {new Date(date + 'T00:00:00').toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                    </span>
                    <Badge variant="outline" className="text-[10px]">{items.length} talões</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{almoco} alm · {jantar} jant</span>
                    <span className="text-sm font-semibold text-foreground">{totalPax} pax</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border bg-muted/10 divide-y divide-border">
                    {items.map(r => (
                      <div key={r.id} className="flex items-center justify-between px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-foreground">Mesa {r.mesa_number}</span>
                          <Badge variant="outline" className={cn('text-[10px]', r.periodo === 'almoco' ? 'text-warning border-warning/30' : 'text-primary border-primary/30')}>
                            {r.periodo === 'almoco' ? 'Almoço' : 'Jantar'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{r.adults} ad · {r.children2to6 + r.children7to12} cr</span>
                          <span className="font-medium text-foreground">{r.total_pax} pax</span>
                          {r.funcionario && <span>{r.funcionario}</span>}
                          <span>{new Date(r.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {receipts.length >= limit && (
        <div className="text-center">
          <Button variant="outline" size="sm" onClick={() => setLimit(l => l + 30)}>
            Ver mais talões
          </Button>
        </div>
      )}
    </div>
  );
}
