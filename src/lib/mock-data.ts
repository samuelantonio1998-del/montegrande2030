export type ChecklistItem = {
  id: string;
  task: string;
  category: 'abertura' | 'fecho' | 'limpeza';
  assignee: string;
  done: boolean;
  critical: boolean;
};

export type InventoryItem = {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  costPerUnit: number;
  supplier: string;
  leadTimeDays: number;
};

export type ServiceOrder = {
  id: string;
  title: string;
  description: string;
  assignee: string;
  priority: 'alta' | 'media' | 'baixa';
  status: 'pendente' | 'em_progresso' | 'concluida';
  createdAt: string;
};

export type KPI = {
  label: string;
  value: string;
  change: number;
  trend: 'up' | 'down';
};

export const mockChecklist: ChecklistItem[] = [
  { id: '1', task: 'Verificar temperatura câmara fria', category: 'abertura', assignee: 'João', done: false, critical: true },
  { id: '2', task: 'Ligar fornos e equipamentos', category: 'abertura', assignee: 'Maria', done: true, critical: true },
  { id: '3', task: 'Preparar mise en place', category: 'abertura', assignee: 'Pedro', done: false, critical: false },
  { id: '4', task: 'Verificar stock de bebidas', category: 'abertura', assignee: 'Ana', done: true, critical: false },
  { id: '5', task: 'Limpar mesas e cadeiras', category: 'abertura', assignee: 'Carlos', done: true, critical: false },
  { id: '6', task: 'Desligar equipamentos', category: 'fecho', assignee: 'João', done: false, critical: true },
  { id: '7', task: 'Limpar cozinha profunda', category: 'fecho', assignee: 'Maria', done: false, critical: true },
  { id: '8', task: 'Fechar caixa do dia', category: 'fecho', assignee: 'Ana', done: false, critical: true },
  { id: '9', task: 'Desinfetar superfícies', category: 'limpeza', assignee: 'Carlos', done: true, critical: false },
  { id: '10', task: 'Lavar chão da cozinha', category: 'limpeza', assignee: 'Pedro', done: false, critical: false },
];

export const mockInventory: InventoryItem[] = [
  { id: '1', name: 'Carne de Vaca', unit: 'kg', currentStock: 8, minStock: 10, maxStock: 50, costPerUnit: 12.50, supplier: 'Carnes Lisboa', leadTimeDays: 2 },
  { id: '2', name: 'Frango', unit: 'kg', currentStock: 15, minStock: 8, maxStock: 40, costPerUnit: 5.80, supplier: 'Carnes Lisboa', leadTimeDays: 2 },
  { id: '3', name: 'Tomate', unit: 'kg', currentStock: 3, minStock: 5, maxStock: 20, costPerUnit: 2.10, supplier: 'Horta Fresca', leadTimeDays: 1 },
  { id: '4', name: 'Azeite', unit: 'L', currentStock: 12, minStock: 5, maxStock: 30, costPerUnit: 8.90, supplier: 'Olivais do Sul', leadTimeDays: 3 },
  { id: '5', name: 'Arroz', unit: 'kg', currentStock: 25, minStock: 10, maxStock: 60, costPerUnit: 1.50, supplier: 'Grossista Central', leadTimeDays: 2 },
  { id: '6', name: 'Cerveja', unit: 'un', currentStock: 48, minStock: 24, maxStock: 120, costPerUnit: 0.85, supplier: 'Bebidas Norte', leadTimeDays: 1 },
  { id: '7', name: 'Vinho Tinto', unit: 'garrafa', currentStock: 6, minStock: 12, maxStock: 36, costPerUnit: 4.50, supplier: 'Vinhos do Douro', leadTimeDays: 3 },
  { id: '8', name: 'Pão', unit: 'un', currentStock: 40, minStock: 30, maxStock: 80, costPerUnit: 0.15, supplier: 'Padaria Local', leadTimeDays: 1 },
];

export const mockOrders: ServiceOrder[] = [
  { id: '1', title: 'Verificar fuga de água na pia 2', description: 'A pia da cozinha está com gotejamento constante. Verificar e reparar.', assignee: 'Carlos', priority: 'alta', status: 'pendente', createdAt: '2026-03-25T08:30:00' },
  { id: '2', title: 'Repor stock de guardanapos', description: 'Guardanapos do salão estão acabando. Buscar no armazém.', assignee: 'Ana', priority: 'media', status: 'em_progresso', createdAt: '2026-03-25T09:15:00' },
  { id: '3', title: 'Treinar novo funcionário no POS', description: 'O Miguel precisa de formação no sistema de caixa.', assignee: 'Maria', priority: 'baixa', status: 'pendente', createdAt: '2026-03-25T10:00:00' },
  { id: '4', title: 'Limpar exaustor da cozinha', description: 'Limpeza profunda programada para hoje.', assignee: 'Pedro', priority: 'media', status: 'concluida', createdAt: '2026-03-24T14:00:00' },
];

export const mockKPIs: KPI[] = [
  { label: 'Vendas Hoje', value: '€2.480', change: 12, trend: 'up' },
  { label: 'Food Cost', value: '31%', change: -2, trend: 'down' },
  { label: 'Pratos Servidos', value: '142', change: 8, trend: 'up' },
  { label: 'Alertas Ativos', value: '3', change: 1, trend: 'up' },
];

export const staff = ['João', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Miguel'];
