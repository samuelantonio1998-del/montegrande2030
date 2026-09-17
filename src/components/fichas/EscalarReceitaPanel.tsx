import { useMemo, useState, useEffect } from 'react';
import { Printer, Scale, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  escalarIngredientes, calcularFator, formatQtd,
  type BaseCalculo,
} from '@/lib/escala-receita';
import { useFichasTecnicas, useProdutos, useLaborCostPerHour, type FichaComIngredientes } from '@/hooks/useFichasTecnicas';

type Props = {
  /** Usa a ficha directamente, ou passa fichaId para ser carregada */
  ficha?: FichaComIngredientes | null;
  fichaId?: string | null;
  /** quantidade inicial em kg (ex.: vindo do registo de produção) */
  kgInicial?: number | null;
  /** esconde o cabeçalho (quando já existe título no ecrã) */
  semTitulo?: boolean;
};

export function EscalarReceitaPanel({ ficha: fichaProp, fichaId, kgInicial, semTitulo }: Props) {
  const { data: fichas = [] } = useFichasTecnicas();
  const { data: produtos = [] } = useProdutos();
  const laborCostPerHour = useLaborCostPerHour();

  const ficha = fichaProp ?? fichas.find(f => f.id === fichaId) ?? null;

  const porcoesBase = Number(ficha?.porcoes) || 1;
  const pesoPorcaoG = (ficha as any)?.peso_porcao_g != null ? Number((ficha as any).peso_porcao_g) : null;
  const pesoBaseKg = pesoPorcaoG ? (porcoesBase * pesoPorcaoG) / 1000 : null;

  const [base, setBase] = useState<BaseCalculo>(kgInicial ? 'kg' : 'porcoes');
  const [qtd, setQtd] = useState<string>(kgInicial ? String(kgInicial) : '');

  useEffect(() => {
    if (kgInicial && kgInicial > 0) { setBase('kg'); setQtd(String(kgInicial)); }
  }, [kgInicial]);

  const quantidade = parseFloat((qtd || '').replace(',', '.'));
  const fator = calcularFator(base, quantidade, porcoesBase, pesoPorcaoG);

  const produtosMap = useMemo(() => new Map(produtos.map(p => [p.id, p])), [produtos]);

  const linhas = useMemo(() => {
    if (!ficha) return [];
    return escalarIngredientes(
      ficha.ingredientes.map(i => {
        const p = produtosMap.get(i.produto_id);
        return {
          produto_id: i.produto_id,
          quantidade: Number(i.quantidade),
          unidade: p?.unidade || i.unidade,
          nome: p?.nome || i.produto?.nome || '—',
          custo_medio: Number(p?.custo_medio ?? i.produto?.custo_medio ?? 0),
        };
      }),
      fator ?? 1,
    );
  }, [ficha, produtosMap, fator]);

  if (!ficha) return <p className="text-sm text-muted-foreground">Ficha não encontrada.</p>;

  const custoIngredientes = linhas.reduce((s, l) => s + l.custo, 0);
  const custoMO = (((ficha.tempo_preparacao ?? 0) / 60) * laborCostPerHour) * (fator ?? 1);
  const custoTotal = custoIngredientes + custoMO;

  const porcoesResultantes = fator ? porcoesBase * fator : porcoesBase;
  const kgResultantes = pesoBaseKg && fator ? pesoBaseKg * fator : null;

  const semPesoPorcao = !pesoPorcaoG;

  const imprimir = () => {
    const win = window.open('', '_blank', 'width=720,height=900');
    if (!win) return;
    const linhasHtml = linhas.map(l => `
      <tr>
        <td>${l.nome}</td>
        <td class="r"><strong>${formatQtd(l.quantidade, l.unidade)}</strong></td>
      </tr>`).join('');
    win.document.write(`<!doctype html><html lang="pt"><head><meta charset="utf-8">
      <title>${ficha.nome} — lista escalada</title>
      <style>
        body{font-family:system-ui,sans-serif;color:#000;padding:24px;}
        h1{font-size:20px;margin:0 0 4px;text-transform:uppercase;}
        p.sub{margin:0 0 16px;font-size:12px;color:#444;}
        table{width:100%;border-collapse:collapse;font-size:14px;}
        th,td{border-bottom:1px solid #ccc;padding:6px 4px;text-align:left;}
        td.r,th.r{text-align:right;}
        .ex{font-size:10px;color:#666;font-weight:400;}
        .tot{margin-top:14px;font-size:13px;}
        @media print{@page{margin:12mm;}}
      </style></head><body>
      <h1>${ficha.nome}</h1>
      <p class="sub">Receita base: ${porcoesBase} porç${porcoesBase === 1 ? 'ão' : 'ões'}${pesoPorcaoG ? ` de ${pesoPorcaoG} g` : ''} · Factor ×${(fator ?? 1).toFixed(2)} · A produzir: ${porcoesResultantes.toFixed(porcoesResultantes % 1 ? 1 : 0)} porções${kgResultantes ? ` (${kgResultantes.toFixed(2)} kg)` : ''}</p>
      <table><thead><tr><th>Ingrediente</th><th class="r">Quantidade</th></tr></thead><tbody>${linhasHtml}</tbody></table>
      <p class="tot">Custo estimado de ingredientes: €${custoIngredientes.toFixed(2)}</p>
      </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  return (
    <div className="space-y-4">
      {!semTitulo && (
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">Escalar receita</h4>
        </div>
      )}

      {/* Receita base sempre visível */}
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
        <p className="text-xs text-muted-foreground">Receita base</p>
        <p className="font-medium text-foreground">
          {porcoesBase} porç{porcoesBase === 1 ? 'ão' : 'ões'}
          {pesoPorcaoG ? ` de ${pesoPorcaoG} g` : ''}
          {pesoBaseKg ? ` · ${pesoBaseKg.toFixed(2)} kg no total` : ''}
        </p>
        {semPesoPorcao && (
          <p className="mt-1 flex items-start gap-1 text-[11px] text-warning">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            Defina o peso da porção (g) na edição da ficha para poder escalar por peso total.
          </p>
        )}
      </div>

      {/* 1) base de cálculo   2) quantidade */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">1. Base de cálculo</Label>
          <Select value={base} onValueChange={v => { setBase(v as BaseCalculo); setQtd(''); }}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="porcoes">Porções</SelectItem>
              <SelectItem value="kg" disabled={semPesoPorcao}>Peso total (kg)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">
            2. Quantidade {base === 'porcoes' ? '(porções)' : '(kg)'}
          </Label>
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step={base === 'porcoes' ? '1' : '0.1'}
            placeholder={base === 'porcoes' ? 'Ex: 40' : 'Ex: 12.5'}
            value={qtd}
            onChange={e => setQtd(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      {fator && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">
            Factor ×{fator.toFixed(2)}
          </span>
          <span className="text-muted-foreground">
            A produzir: {porcoesResultantes.toFixed(porcoesResultantes % 1 ? 1 : 0)} porções
            {kgResultantes ? ` · ${kgResultantes.toFixed(2)} kg` : ''}
          </span>
        </div>
      )}

      {/* Lista escalada */}
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Ingrediente</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                {fator ? 'Quantidade a usar' : 'Receita base'}
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Custo</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(l => (
              <tr key={l.produto_id} className="border-t border-border">
                <td className="px-3 py-2 text-foreground">{l.nome}</td>
                <td className="px-3 py-2 text-right">
                  <span className="font-semibold text-foreground">{formatQtd(l.quantidade, l.unidade)}</span>
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground">€{l.custo.toFixed(2)}</td>
              </tr>
            ))}
            {linhas.length === 0 && (
              <tr><td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">Sem ingredientes registados</td></tr>
            )}
            <tr className={cn('border-t-2 border-border bg-muted/30')}>
              <td colSpan={2} className="px-3 py-2 font-semibold text-foreground">
                Custo total {(ficha.tempo_preparacao ?? 0) > 0 ? '(com mão-de-obra)' : ''}
              </td>
              <td className="px-3 py-2 text-right font-bold text-foreground">€{custoTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Quantidades exactas, sem arredondamento (até 3 casas decimais nos pesos).
      </p>

      <Button variant="outline" size="sm" className="gap-1.5" onClick={imprimir} disabled={linhas.length === 0}>
        <Printer className="h-3.5 w-3.5" /> Imprimir lista escalada
      </Button>
    </div>
  );
}
