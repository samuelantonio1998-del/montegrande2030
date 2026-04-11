import { useState, useEffect } from 'react';
import { CalendarOff, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type ClosureDay = { start: string; end: string; motivo: string };

const STORAGE_KEY = 'closure-days';

// Easter calculation (anonymous gregorian)
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export default function ClosureDaysPanel() {
  const [days, setDays] = useState<ClosureDay[]>([]);
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newMotivo, setNewMotivo] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setDays(JSON.parse(saved));
  }, []);

  const save = (updated: ClosureDay[]) => {
    setDays(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const addDay = () => {
    if (!newStart || !newEnd) return;
    save([...days, { start: newStart, end: newEnd, motivo: newMotivo || 'Encerramento' }]);
    setNewStart(''); setNewEnd(''); setNewMotivo('');
  };

  const removeDay = (index: number) => {
    save(days.filter((_, i) => i !== index));
  };

  // Auto-suggest Easter week
  const year = new Date().getFullYear();
  const easter = getEasterDate(year);
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);
  const easterFriday = new Date(easterMonday);
  easterFriday.setDate(easterMonday.getDate() + 4);
  const easterWeekStart = easterMonday.toISOString().slice(0, 10);
  const easterWeekEnd = easterFriday.toISOString().slice(0, 10);
  const hasEasterClosure = days.some(d => d.start === easterWeekStart);

  const today = new Date().toISOString().slice(0, 10);
  const activeClosure = days.find(d => today >= d.start && today <= d.end);
  const upcomingClosures = days.filter(d => d.start > today).sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-card-foreground flex items-center gap-2">
          <CalendarOff className="h-5 w-5 text-destructive" /> Dias de Fecho
        </h3>
      </div>

      {activeClosure && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-sm font-medium text-destructive">⚠ Estabelecimento encerrado hoje</p>
          <p className="text-xs text-muted-foreground">{activeClosure.motivo} · até {new Date(activeClosure.end).toLocaleDateString('pt-PT')}</p>
        </div>
      )}

      {!hasEasterClosure && easterWeekStart >= today && (
        <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">🐣 Semana após a Páscoa</p>
            <p className="text-xs text-muted-foreground">
              {new Date(easterWeekStart).toLocaleDateString('pt-PT')} — {new Date(easterWeekEnd).toLocaleDateString('pt-PT')}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => save([...days, { start: easterWeekStart, end: easterWeekEnd, motivo: 'Semana após Páscoa' }])}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
          </Button>
        </div>
      )}

      {/* Existing closures */}
      <div className="space-y-2">
        {days.map((d, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-foreground">{d.motivo}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(d.start).toLocaleDateString('pt-PT')} — {new Date(d.end).toLocaleDateString('pt-PT')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {d.start <= today && d.end >= today && <Badge variant="destructive" className="text-[10px]">Ativo</Badge>}
              {d.start > today && <Badge variant="outline" className="text-[10px] text-warning border-warning/30">Próximo</Badge>}
              <button onClick={() => removeDay(i)} className="rounded-full p-1 hover:bg-destructive/10 transition-colors">
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add new */}
      <div className="rounded-lg border border-border p-3 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Adicionar período de fecho</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-[10px]">Início</Label>
            <Input type="date" value={newStart} onChange={e => setNewStart(e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Fim</Label>
            <Input type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Motivo</Label>
            <Input value={newMotivo} onChange={e => setNewMotivo(e.target.value)} placeholder="Ex: Férias" className="h-8 text-xs" />
          </div>
        </div>
        <Button size="sm" onClick={addDay} disabled={!newStart || !newEnd}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Fecho
        </Button>
      </div>
    </div>
  );
}
