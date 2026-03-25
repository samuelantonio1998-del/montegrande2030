export type RecipientSize = 'tabuleiro_grande' | 'tabuleiro_medio' | 'couvete_grande' | 'couvete_media' | 'couvete_pequena';

export const recipientCapacity: Record<RecipientSize, { label: string; capacityKg: number }> = {
  tabuleiro_grande: { label: 'Tabuleiro Grande', capacityKg: 5 },
  tabuleiro_medio: { label: 'Tabuleiro Médio', capacityKg: 3 },
  couvete_grande: { label: 'Couvete Grande', capacityKg: 2.5 },
  couvete_media: { label: 'Couvete Média', capacityKg: 2 },
  couvete_pequena: { label: 'Couvete Pequena', capacityKg: 1 },
};

export type TrayStatus = 'no_buffet' | 'recolhido' | 'aproveitado' | 'desperdicio';

export type ProductionRecord = {
  id: string;
  dishName: string;
  fichaTecnicaId: string;
  recipient: RecipientSize;
  weightKg: number;
  sentAt: string; // ISO timestamp
  returnedAt: string | null;
  status: TrayStatus;
  leftoverKg: number | null;
  leftoverAction: 'aproveitamento' | 'desperdicio' | null;
  aproveitamentoNote: string | null; // e.g. "Recheio de rissóis"
  registeredBy: string;
};

export type WasteSummary = {
  dishName: string;
  totalProducedKg: number;
  totalWasteKg: number;
  totalReusedKg: number;
  wastePercentage: number;
  estimatedLoss: number; // €
  estimatedSavings: number; // €
};

export type ProductionAlert = {
  id: string;
  type: 'reducao' | 'aumento' | 'substituicao';
  message: string;
  dishName: string;
  suggestedRecipient: RecipientSize;
  basedOn: string; // e.g. "Histórico quartas-feiras Março"
  priority: 'alta' | 'media';
};

// === Mock data ===

export const mockProductionRecords: ProductionRecord[] = [
  { id: 'p1', dishName: 'Arroz de Pato', fichaTecnicaId: '1', recipient: 'tabuleiro_grande', weightKg: 5, sentAt: '2026-03-25T11:45:00', returnedAt: null, status: 'no_buffet', leftoverKg: null, leftoverAction: null, aproveitamentoNote: null, registeredBy: 'João' },
  { id: 'p2', dishName: 'Bacalhau à Brás', fichaTecnicaId: '3', recipient: 'tabuleiro_grande', weightKg: 5, sentAt: '2026-03-25T11:30:00', returnedAt: '2026-03-25T13:15:00', status: 'aproveitado', leftoverKg: 1.2, leftoverAction: 'aproveitamento', aproveitamentoNote: 'Pastéis de bacalhau amanhã', registeredBy: 'Maria' },
  { id: 'p3', dishName: 'Frango Grelhado', fichaTecnicaId: '2', recipient: 'tabuleiro_medio', weightKg: 3, sentAt: '2026-03-25T11:50:00', returnedAt: '2026-03-25T13:30:00', status: 'desperdicio', leftoverKg: 0.8, leftoverAction: 'desperdicio', aproveitamentoNote: null, registeredBy: 'Pedro' },
  { id: 'p4', dishName: 'Salada Mista', fichaTecnicaId: '4', recipient: 'couvete_grande', weightKg: 2.5, sentAt: '2026-03-25T11:40:00', returnedAt: null, status: 'no_buffet', leftoverKg: null, leftoverAction: null, aproveitamentoNote: null, registeredBy: 'Ana' },
  { id: 'p5', dishName: 'Arroz Branco', fichaTecnicaId: '5', recipient: 'tabuleiro_grande', weightKg: 5, sentAt: '2026-03-25T12:00:00', returnedAt: '2026-03-25T13:45:00', status: 'aproveitado', leftoverKg: 1.5, leftoverAction: 'aproveitamento', aproveitamentoNote: 'Arroz de tomate amanhã', registeredBy: 'Carlos' },
  { id: 'p6', dishName: 'Bife à Portuguesa', fichaTecnicaId: '1', recipient: 'couvete_media', weightKg: 2, sentAt: '2026-03-25T12:15:00', returnedAt: '2026-03-25T14:00:00', status: 'desperdicio', leftoverKg: 0.5, leftoverAction: 'desperdicio', aproveitamentoNote: null, registeredBy: 'João' },
  { id: 'p7', dishName: 'Bacalhau à Brás', fichaTecnicaId: '3', recipient: 'couvete_media', weightKg: 2, sentAt: '2026-03-25T13:20:00', returnedAt: null, status: 'no_buffet', leftoverKg: null, leftoverAction: null, aproveitamentoNote: null, registeredBy: 'Maria' },
];

export const mockWeeklyWaste: WasteSummary[] = [
  { dishName: 'Frango Grelhado', totalProducedKg: 24, totalWasteKg: 4.2, totalReusedKg: 1.5, wastePercentage: 17.5, estimatedLoss: 24.36, estimatedSavings: 8.70 },
  { dishName: 'Bacalhau à Brás', totalProducedKg: 30, totalWasteKg: 3.8, totalReusedKg: 4.2, wastePercentage: 12.7, estimatedLoss: 68.40, estimatedSavings: 75.60 },
  { dishName: 'Arroz de Pato', totalProducedKg: 35, totalWasteKg: 2.5, totalReusedKg: 3.0, wastePercentage: 7.1, estimatedLoss: 18.75, estimatedSavings: 22.50 },
  { dishName: 'Salada Mista', totalProducedKg: 15, totalWasteKg: 3.0, totalReusedKg: 0, wastePercentage: 20.0, estimatedLoss: 12.60, estimatedSavings: 0 },
  { dishName: 'Bife à Portuguesa', totalProducedKg: 18, totalWasteKg: 2.0, totalReusedKg: 1.0, wastePercentage: 11.1, estimatedLoss: 25.00, estimatedSavings: 12.50 },
  { dishName: 'Arroz Branco', totalProducedKg: 40, totalWasteKg: 5.0, totalReusedKg: 6.0, wastePercentage: 12.5, estimatedLoss: 7.50, estimatedSavings: 9.00 },
];

export const mockProductionAlerts: ProductionAlert[] = [
  { id: 'a1', type: 'reducao', message: 'Reduzir tabuleiro de Frango para Couvete Média (2kg) após as 14:00. Histórico indica quebra de consumo neste horário.', dishName: 'Frango Grelhado', suggestedRecipient: 'couvete_media', basedOn: 'Histórico quartas-feiras Março 2023-2025', priority: 'alta' },
  { id: 'a2', type: 'reducao', message: 'Salada Mista tem 20% de desperdício semanal. Considerar passar de Couvete Grande para Couvete Média.', dishName: 'Salada Mista', suggestedRecipient: 'couvete_media', basedOn: 'Dados últimas 4 semanas', priority: 'alta' },
  { id: 'a3', type: 'substituicao', message: 'Bacalhau à Brás gera bom aproveitamento (14%). Manter produção atual mas preparar receita de Pastéis de Bacalhau.', dishName: 'Bacalhau à Brás', suggestedRecipient: 'tabuleiro_grande', basedOn: 'Taxa de aproveitamento 14%', priority: 'media' },
];
