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

export type Ingredient = {
  itemId: string;
  name: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
};

export type FichaTecnica = {
  id: string;
  name: string;
  category: 'carne' | 'peixe' | 'vegetariano' | 'sobremesa' | 'entrada';
  portions: number;
  ingredients: Ingredient[];
  preparationTime: number; // minutes
  sellingPrice: number;
};

export type Mesa = {
  id: string;
  number: number;
  status: 'livre' | 'ocupada' | 'reservada' | 'conta';
  adults: number;
  children2to6: number;
  children7to12: number;
  /** @deprecated use children2to6 + children7to12 */
  children: number;
  waiter: string;
  openedAt: string | null;
  beverages: { name: string; quantity: number; unitPrice: number }[];
};

export const PRICING = {
  adultWeekdayLunch: 14.75,
  adultPremium: 18.95, // fim-de-semana, jantares, feriados
  child2to6: 6.50,
  child7to12: 10.00,
};

export function isWeekdayLunch(): boolean {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 6=Sat
  const hour = now.getHours();
  const isWeekday = day >= 1 && day <= 5;
  const isLunch = hour < 16; // almoço até às 16h
  return isWeekday && isLunch;
}

export function getAdultPrice(): number {
  return isWeekdayLunch() ? PRICING.adultWeekdayLunch : PRICING.adultPremium;
}

export function calcMesaTotal(mesa: Mesa): { coverTotal: number; beverageTotal: number; total: number } {
  const adultPrice = getAdultPrice();
  const coverTotal =
    mesa.adults * adultPrice +
    mesa.children2to6 * PRICING.child2to6 +
    mesa.children7to12 * PRICING.child7to12;
  const beverageTotal = mesa.beverages.reduce((s, b) => s + b.quantity * b.unitPrice, 0);
  return { coverTotal, beverageTotal, total: coverTotal + beverageTotal };
}

export type HistoricalDay = {
  date: string;
  dayOfWeek: string;
  totalClients: number;
  adults: number;
  children: number;
  dishes: { name: string; portions: number }[];
  revenue: number;
};

// === Existing mock data ===

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

// === New mock data ===

export const mockFichasTecnicas: FichaTecnica[] = [
  {
    id: '1',
    name: 'Bife à Portuguesa',
    category: 'carne',
    portions: 1,
    preparationTime: 25,
    sellingPrice: 14.50,
    ingredients: [
      { itemId: '1', name: 'Carne de Vaca', quantity: 0.2, unit: 'kg', costPerUnit: 12.50 },
      { itemId: 'e1', name: 'Batata', quantity: 0.15, unit: 'kg', costPerUnit: 1.20 },
      { itemId: 'e2', name: 'Ovo', quantity: 1, unit: 'un', costPerUnit: 0.25 },
      { itemId: '4', name: 'Azeite', quantity: 0.02, unit: 'L', costPerUnit: 8.90 },
    ],
  },
  {
    id: '2',
    name: 'Frango Grelhado c/ Arroz',
    category: 'carne',
    portions: 1,
    preparationTime: 20,
    sellingPrice: 10.90,
    ingredients: [
      { itemId: '2', name: 'Frango', quantity: 0.25, unit: 'kg', costPerUnit: 5.80 },
      { itemId: '5', name: 'Arroz', quantity: 0.1, unit: 'kg', costPerUnit: 1.50 },
      { itemId: '4', name: 'Azeite', quantity: 0.015, unit: 'L', costPerUnit: 8.90 },
      { itemId: 'e3', name: 'Limão', quantity: 0.5, unit: 'un', costPerUnit: 0.30 },
    ],
  },
  {
    id: '3',
    name: 'Bacalhau à Brás',
    category: 'peixe',
    portions: 1,
    preparationTime: 30,
    sellingPrice: 13.90,
    ingredients: [
      { itemId: 'e4', name: 'Bacalhau', quantity: 0.18, unit: 'kg', costPerUnit: 18.00 },
      { itemId: 'e1', name: 'Batata Palha', quantity: 0.1, unit: 'kg', costPerUnit: 3.50 },
      { itemId: 'e2', name: 'Ovo', quantity: 2, unit: 'un', costPerUnit: 0.25 },
      { itemId: 'e5', name: 'Cebola', quantity: 0.08, unit: 'kg', costPerUnit: 1.10 },
      { itemId: '4', name: 'Azeite', quantity: 0.03, unit: 'L', costPerUnit: 8.90 },
    ],
  },
  {
    id: '4',
    name: 'Salada Mista',
    category: 'vegetariano',
    portions: 1,
    preparationTime: 10,
    sellingPrice: 7.50,
    ingredients: [
      { itemId: 'e6', name: 'Alface', quantity: 0.08, unit: 'kg', costPerUnit: 2.50 },
      { itemId: '3', name: 'Tomate', quantity: 0.1, unit: 'kg', costPerUnit: 2.10 },
      { itemId: 'e5', name: 'Cebola', quantity: 0.03, unit: 'kg', costPerUnit: 1.10 },
      { itemId: '4', name: 'Azeite', quantity: 0.015, unit: 'L', costPerUnit: 8.90 },
    ],
  },
  {
    id: '5',
    name: 'Mousse de Chocolate',
    category: 'sobremesa',
    portions: 4,
    preparationTime: 15,
    sellingPrice: 4.50,
    ingredients: [
      { itemId: 'e7', name: 'Chocolate Negro', quantity: 0.2, unit: 'kg', costPerUnit: 12.00 },
      { itemId: 'e2', name: 'Ovo', quantity: 4, unit: 'un', costPerUnit: 0.25 },
      { itemId: 'e8', name: 'Natas', quantity: 0.2, unit: 'L', costPerUnit: 3.80 },
    ],
  },
];

export const mockMesas: Mesa[] = [
  { id: '1', number: 1, status: 'ocupada', adults: 2, children: 0, children2to6: 0, children7to12: 0, waiter: 'João', openedAt: '2026-03-25T12:30:00', beverages: [{ name: 'Cerveja', quantity: 2, unitPrice: 2.50 }, { name: 'Água', quantity: 1, unitPrice: 1.50 }] },
  { id: '2', number: 2, status: 'ocupada', adults: 3, children: 1, children2to6: 1, children7to12: 0, waiter: 'Maria', openedAt: '2026-03-25T12:45:00', beverages: [{ name: 'Vinho Tinto', quantity: 1, unitPrice: 12.00 }, { name: 'Sumo Laranja', quantity: 1, unitPrice: 2.80 }] },
  { id: '3', number: 3, status: 'livre', adults: 0, children: 0, children2to6: 0, children7to12: 0, waiter: '', openedAt: null, beverages: [] },
  { id: '4', number: 4, status: 'reservada', adults: 0, children: 0, children2to6: 0, children7to12: 0, waiter: '', openedAt: null, beverages: [] },
  { id: '5', number: 5, status: 'conta', adults: 4, children: 2, children2to6: 1, children7to12: 1, waiter: 'Pedro', openedAt: '2026-03-25T12:15:00', beverages: [{ name: 'Cerveja', quantity: 4, unitPrice: 2.50 }, { name: 'Coca-Cola', quantity: 2, unitPrice: 2.00 }] },
  { id: '6', number: 6, status: 'livre', adults: 0, children: 0, children2to6: 0, children7to12: 0, waiter: '', openedAt: null, beverages: [] },
  { id: '7', number: 7, status: 'ocupada', adults: 2, children: 1, children2to6: 0, children7to12: 1, waiter: 'Ana', openedAt: '2026-03-25T13:00:00', beverages: [{ name: 'Água', quantity: 2, unitPrice: 1.50 }] },
  { id: '8', number: 8, status: 'livre', adults: 0, children: 0, children2to6: 0, children7to12: 0, waiter: '', openedAt: null, beverages: [] },
  { id: '9', number: 9, status: 'ocupada', adults: 6, children: 0, children2to6: 0, children7to12: 0, waiter: 'Carlos', openedAt: '2026-03-25T12:50:00', beverages: [{ name: 'Vinho Tinto', quantity: 2, unitPrice: 12.00 }, { name: 'Cerveja', quantity: 3, unitPrice: 2.50 }] },
  { id: '10', number: 10, status: 'livre', adults: 0, children: 0, children2to6: 0, children7to12: 0, waiter: '', openedAt: null, beverages: [] },
];

export const mockHistorical: HistoricalDay[] = [
  { date: '2026-03-18', dayOfWeek: 'Quarta', totalClients: 72, adults: 60, children: 12, dishes: [{ name: 'Bife à Portuguesa', portions: 22 }, { name: 'Frango Grelhado', portions: 18 }, { name: 'Bacalhau à Brás', portions: 15 }, { name: 'Salada Mista', portions: 8 }], revenue: 1890 },
  { date: '2026-03-19', dayOfWeek: 'Quinta', totalClients: 85, adults: 70, children: 15, dishes: [{ name: 'Bife à Portuguesa', portions: 28 }, { name: 'Frango Grelhado', portions: 20 }, { name: 'Bacalhau à Brás', portions: 18 }, { name: 'Salada Mista', portions: 10 }], revenue: 2210 },
  { date: '2026-03-20', dayOfWeek: 'Sexta', totalClients: 110, adults: 92, children: 18, dishes: [{ name: 'Bife à Portuguesa', portions: 38 }, { name: 'Frango Grelhado', portions: 25 }, { name: 'Bacalhau à Brás', portions: 24 }, { name: 'Salada Mista', portions: 12 }], revenue: 2950 },
  { date: '2026-03-21', dayOfWeek: 'Sábado', totalClients: 130, adults: 105, children: 25, dishes: [{ name: 'Bife à Portuguesa', portions: 42 }, { name: 'Frango Grelhado', portions: 30 }, { name: 'Bacalhau à Brás', portions: 28 }, { name: 'Salada Mista', portions: 15 }], revenue: 3480 },
  { date: '2026-03-22', dayOfWeek: 'Domingo', totalClients: 120, adults: 95, children: 25, dishes: [{ name: 'Bife à Portuguesa', portions: 40 }, { name: 'Frango Grelhado', portions: 28 }, { name: 'Bacalhau à Brás', portions: 26 }, { name: 'Salada Mista', portions: 14 }], revenue: 3200 },
  { date: '2026-03-23', dayOfWeek: 'Segunda', totalClients: 55, adults: 48, children: 7, dishes: [{ name: 'Bife à Portuguesa', portions: 16 }, { name: 'Frango Grelhado', portions: 14 }, { name: 'Bacalhau à Brás', portions: 10 }, { name: 'Salada Mista', portions: 6 }], revenue: 1450 },
  { date: '2026-03-24', dayOfWeek: 'Terça', totalClients: 68, adults: 58, children: 10, dishes: [{ name: 'Bife à Portuguesa', portions: 20 }, { name: 'Frango Grelhado', portions: 16 }, { name: 'Bacalhau à Brás', portions: 14 }, { name: 'Salada Mista', portions: 8 }], revenue: 1780 },
];

export type BeverageCategory = {
  category: string;
  items: { name: string; price: number }[];
};

export const beverageMenu: BeverageCategory[] = [
  {
    category: 'Diversos',
    items: [
      { name: 'Água', price: 1.70 },
      { name: 'Água c/ Gás', price: 2.00 },
      { name: 'Refrigerantes', price: 2.35 },
      { name: 'Compal', price: 2.15 },
      { name: 'Cerveja Sagres', price: 2.25 },
      { name: 'Cerveja Bohemia', price: 2.35 },
      { name: 'Cerveja Sagres Preta', price: 2.35 },
      { name: 'Cerveja Sagres S/ Álcool', price: 2.35 },
      { name: 'Vinho a copo', price: 3.00 },
      { name: 'Sumo natural', price: 3.15 },
      { name: 'Café', price: 1.00 },
      { name: 'Chá / Meia de Leite', price: 1.30 },
      { name: 'Cidra', price: 3.15 },
    ],
  },
  {
    category: 'Vinhos Verdes',
    items: [
      { name: 'Alvarinho Deu-La-Deu 0,75l', price: 15.80 },
      { name: 'Muralhas 0,75l', price: 13.00 },
    ],
  },
  {
    category: 'Vinhos Brancos',
    items: [
      { name: 'João Pires 0,75l', price: 12.50 },
      { name: 'Sobroso Branco 0,75l', price: 15.50 },
      { name: 'Monte das Servas Branco 0,75l', price: 14.20 },
      { name: 'Vale de Donas Branco 0,75l', price: 11.00 },
      { name: 'Vale de Donas Branco 0,37l', price: 5.50 },
    ],
  },
  {
    category: 'Vinhos Tintos',
    items: [
      { name: 'Duas Quintas 0,75l', price: 23.00 },
      { name: 'Duas Quintas 0,37l', price: 11.70 },
      { name: 'Quinta Nova 0,75l', price: 17.20 },
      { name: 'Quinta do Sobreiró de Cima Reserva 0,75l', price: 15.70 },
      { name: 'Vale de Escadas 0,75l', price: 15.30 },
      { name: 'Taboadela 0,75l', price: 17.90 },
      { name: 'Cartuxa 0,75l', price: 28.00 },
      { name: 'Rocim 0,75l', price: 17.70 },
      { name: 'Sobroso Tinto 0,75l', price: 15.50 },
      { name: 'Quinta do Paral 0,75l', price: 15.50 },
      { name: 'Ald. Juromenha Syrah Reserva 0,75l', price: 15.30 },
      { name: 'Monte das Servas Tinto 0,75l', price: 14.20 },
      { name: 'Monte das Servas Tinto 0,37l', price: 7.20 },
      { name: 'Vale de Donas Tinto 0,75l', price: 11.00 },
      { name: 'Vale de Donas Tinto 0,37l', price: 5.50 },
    ],
  },
  {
    category: 'Rosé / Frisante',
    items: [
      { name: 'Mateus Rosé 0,75l', price: 12.50 },
      { name: 'Viadores Frisante 0,75l', price: 11.00 },
      { name: 'Viadores Frisante 0,37l', price: 5.50 },
    ],
  },
  {
    category: 'Espumantes',
    items: [
      { name: 'Aliança Bruto 0,75l', price: 15.50 },
      { name: 'Aliança Bruto Baga Reserva 0,75l', price: 17.15 },
      { name: 'Asti Gancia Doce 0,75l', price: 14.50 },
      { name: 'Santero Doce 0,75l', price: 12.40 },
    ],
  },
  {
    category: 'Sangria',
    items: [
      { name: 'Sangria Branca', price: 13.90 },
      { name: 'Sangria Tinta', price: 13.90 },
      { name: 'Sangria Espumante Santero', price: 16.90 },
    ],
  },
  {
    category: 'Digestivos',
    items: [
      { name: 'Moscatel Setúbal', price: 2.75 },
      { name: 'São Domingos', price: 2.75 },
      { name: 'Aguardente 1920', price: 3.30 },
      { name: 'Macieira', price: 3.30 },
      { name: 'Croft', price: 3.30 },
      { name: 'CRF', price: 3.80 },
      { name: 'Amarguinha', price: 3.80 },
      { name: 'Aliança Velha', price: 3.80 },
      { name: 'Antiqua', price: 4.40 },
      { name: 'Chancella', price: 3.80 },
      { name: 'Famouse Grouse', price: 3.80 },
      { name: 'Licor Beirão', price: 3.80 },
      { name: 'Logan 12 anos', price: 4.90 },
      { name: 'Cardhu 12 anos', price: 7.70 },
    ],
  },
];

/** Flat list helper for lookups */
export const beverageMenuFlat = beverageMenu.flatMap(cat => cat.items);
