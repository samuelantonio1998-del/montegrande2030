import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type VendaHistorico = {
  id: string;
  data: string;
  almoco: number;
  jantar: number;
  total: number;
  dia_festivo: string | null;
};

// Portuguese public holidays (fixed dates)
const FERIADOS_FIXOS: Record<string, string> = {
  '01-01': 'Ano Novo',
  '04-25': 'Dia da Liberdade',
  '05-01': 'Dia do Trabalhador',
  '06-10': 'Dia de Portugal',
  '06-13': 'Sto António (Lisboa)',
  '06-24': 'S. João (Porto)',
  '08-15': 'Assunção de Nossa Sra.',
  '10-05': 'Implantação da República',
  '11-01': 'Todos os Santos',
  '12-01': 'Restauração da Independência',
  '12-08': 'Imaculada Conceição',
  '12-25': 'Natal',
};

// Easter dates (pre-computed for relevant years)
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

function getMovableHolidays(year: number): Record<string, string> {
  const easter = getEasterDate(year);
  const holidays: Record<string, string> = {};
  
  const addDays = (d: Date, n: number) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  };
  
  const fmt = (d: Date) => {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  };

  holidays[fmt(addDays(easter, -47))] = 'Carnaval';
  holidays[fmt(addDays(easter, -2))] = 'Sexta-feira Santa';
  holidays[fmt(easter)] = 'Páscoa';
  holidays[fmt(addDays(easter, 60))] = 'Corpo de Deus';
  
  // Dia da Mulher
  holidays[`${year}-03-08`] = 'Dia da Mulher';
  // Dia dos Namorados
  holidays[`${year}-02-14`] = 'Dia dos Namorados';
  // Dia da Mãe (1st Sunday of May)
  const may1 = new Date(year, 4, 1);
  const dayOfWeek = may1.getDay();
  const motherDay = dayOfWeek === 0 ? may1 : new Date(year, 4, 1 + (7 - dayOfWeek));
  holidays[fmt(motherDay)] = 'Dia da Mãe';
  // Dia do Pai
  holidays[`${year}-03-19`] = 'Dia do Pai';

  return holidays;
}

function isNearHoliday(dateStr: string, holidays: Set<string>): string | null {
  const d = new Date(dateStr);
  for (let offset = -2; offset <= 2; offset++) {
    const check = new Date(d);
    check.setDate(check.getDate() + offset);
    const key = check.toISOString().slice(0, 10);
    if (holidays.has(key)) {
      return offset === 0 ? key : `próximo de ${key}`;
    }
  }
  return null;
}

// ISO week number
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function useVendasHistorico() {
  return useQuery({
    queryKey: ['vendas_historico'],
    queryFn: async (): Promise<VendaHistorico[]> => {
      // Fetch all records (may exceed default 1000 limit)
      const allData: VendaHistorico[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('vendas_historico')
          .select('*')
          .order('data', { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return allData;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export type PrevisaoDia = {
  data: string;
  diaSemana: string;
  semanaAno: number;
  previsaoTotal: number;
  previsaoAlmoco: number;
  previsaoJantar: number;
  confianca: number; // 0-100
  isFestivo: boolean;
  nomeFestivo?: string;
  isWeekend: boolean;
  mediaHistorica: number;
  minHistorico: number;
  maxHistorico: number;
  anosComDados: number;
};

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function calcularPrevisao(
  vendas: VendaHistorico[],
  dataAlvo: Date,
  diasFuturos: number = 7
): PrevisaoDia[] {
  if (!vendas.length) return [];

  // Build holiday set for all years in data + target year
  const years = new Set<number>();
  vendas.forEach(v => years.add(new Date(v.data).getFullYear()));
  years.add(dataAlvo.getFullYear());
  
  const allHolidays = new Map<string, string>();
  years.forEach(y => {
    const fixed = Object.entries(FERIADOS_FIXOS);
    fixed.forEach(([md, name]) => allHolidays.set(`${y}-${md}`, name));
    const movable = getMovableHolidays(y);
    Object.entries(movable).forEach(([d, name]) => allHolidays.set(d, name));
  });

  const holidaySet = new Set(allHolidays.keys());

  // Enrich vendas with week number and day of week
  const enriched = vendas
    .filter(v => v.total > 5) // filter out anomalously low days (likely closed or partial)
    .map(v => {
      const d = new Date(v.data);
      return {
        ...v,
        weekNum: getISOWeek(d),
        dayOfWeek: d.getDay(),
        year: d.getFullYear(),
        nearHoliday: isNearHoliday(v.data, holidaySet),
        holidayName: allHolidays.get(v.data) || null,
      };
    });

  const previsoes: PrevisaoDia[] = [];

  for (let i = 0; i < diasFuturos; i++) {
    const target = new Date(dataAlvo);
    target.setDate(target.getDate() + i);
    const targetWeek = getISOWeek(target);
    const targetDow = target.getDay();
    const isWeekend = targetDow === 0 || targetDow === 6;
    const targetDateStr = target.toISOString().slice(0, 10);
    const holidayName = allHolidays.get(targetDateStr);
    const nearHoliday = isNearHoliday(targetDateStr, holidaySet);
    const isFestivo = !!holidayName || !!nearHoliday;

    // Strategy: find similar days using week number + day of week
    // Primary: same week number ± 1, same day of week
    // Secondary: same day of week, same month
    // Tertiary: same day of week overall
    
    let candidates = enriched.filter(v => 
      v.dayOfWeek === targetDow && 
      Math.abs(v.weekNum - targetWeek) <= 1
    );

    // If target is near a holiday, prefer historical days also near holidays
    if (isFestivo) {
      const holidayCandidates = candidates.filter(v => v.nearHoliday);
      if (holidayCandidates.length >= 3) {
        candidates = holidayCandidates;
      }
    }

    // If not enough data, broaden to same week ± 2
    if (candidates.length < 3) {
      candidates = enriched.filter(v => 
        v.dayOfWeek === targetDow && 
        Math.abs(v.weekNum - targetWeek) <= 2
      );
    }

    // Still not enough? Same day of week, any week
    if (candidates.length < 3) {
      candidates = enriched.filter(v => v.dayOfWeek === targetDow);
    }

    if (candidates.length === 0) {
      candidates = enriched;
    }

    // Weight more recent years more heavily
    const maxYear = Math.max(...candidates.map(c => c.year));
    const weighted = candidates.map(c => ({
      ...c,
      weight: 1 + (c.year - (maxYear - 10)) * 0.15, // recent years weighted more
    }));

    const totalWeight = weighted.reduce((s, c) => s + Math.max(c.weight, 0.1), 0);
    const avgTotal = Math.round(weighted.reduce((s, c) => s + c.total * Math.max(c.weight, 0.1), 0) / totalWeight);
    const avgAlmoco = Math.round(weighted.reduce((s, c) => s + c.almoco * Math.max(c.weight, 0.1), 0) / totalWeight);
    const avgJantar = Math.round(weighted.reduce((s, c) => s + c.jantar * Math.max(c.weight, 0.1), 0) / totalWeight);

    const totals = candidates.map(c => c.total);
    const uniqueYears = new Set(candidates.map(c => c.year)).size;

    previsoes.push({
      data: targetDateStr,
      diaSemana: DIAS_SEMANA[targetDow],
      semanaAno: targetWeek,
      previsaoTotal: avgTotal,
      previsaoAlmoco: avgAlmoco,
      previsaoJantar: avgJantar,
      confianca: Math.min(100, Math.round((uniqueYears / 5) * 100)),
      isFestivo,
      nomeFestivo: holidayName || (nearHoliday ? `Próx. feriado` : undefined),
      isWeekend,
      mediaHistorica: avgTotal,
      minHistorico: Math.min(...totals),
      maxHistorico: Math.max(...totals),
      anosComDados: uniqueYears,
    });
  }

  return previsoes;
}

// Weekly trend from historical data
export function calcularTendenciaSemanal(vendas: VendaHistorico[]): {
  diaSemana: string;
  media: number;
  mediaAlmoco: number;
  mediaJantar: number;
}[] {
  const byDow: Record<number, { total: number[]; almoco: number[]; jantar: number[] }> = {};
  
  vendas.filter(v => v.total > 5).forEach(v => {
    const dow = new Date(v.data).getDay();
    if (!byDow[dow]) byDow[dow] = { total: [], almoco: [], jantar: [] };
    byDow[dow].total.push(v.total);
    byDow[dow].almoco.push(v.almoco);
    byDow[dow].jantar.push(v.jantar);
  });

  return [1, 2, 3, 4, 5, 6, 0].map(dow => ({
    diaSemana: DIAS_SEMANA[dow].slice(0, 3),
    media: Math.round((byDow[dow]?.total.reduce((a, b) => a + b, 0) || 0) / (byDow[dow]?.total.length || 1)),
    mediaAlmoco: Math.round((byDow[dow]?.almoco.reduce((a, b) => a + b, 0) || 0) / (byDow[dow]?.almoco.length || 1)),
    mediaJantar: Math.round((byDow[dow]?.jantar.reduce((a, b) => a + b, 0) || 0) / (byDow[dow]?.jantar.length || 1)),
  }));
}
