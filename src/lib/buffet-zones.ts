export type BuffetZone = 'entradas' | 'pratos_principais' | 'sobremesas';

export const buffetZoneLabels: Record<BuffetZone, string> = {
  entradas: 'Entradas',
  pratos_principais: 'Pratos Principais',
  sobremesas: 'Sobremesas',
};

export type BuffetItem = {
  id: string;
  name: string;
  zone: BuffetZone;
  active: boolean;
};

export type ReplenishmentLog = {
  id: string;
  itemId: string;
  recipient: string; // from recipientCapacity
  weightKg: number;
  timestamp: string;
  registeredBy: string;
};

export type BuffetTrayState = {
  itemId: string;
  replenishments: ReplenishmentLog[];
  totalSentKg: number;
  currentRecipient: string | null;
  isOnBuffet: boolean;
};

export type LeftoverRecord = {
  id: string;
  itemId: string;
  itemName: string;
  zone: BuffetZone;
  leftoverKg: number;
  action: 'aproveitamento' | 'desperdicio';
  note: string | null;
  date: string;
  registeredBy: string;
};

// Default buffet items per zone
export const defaultBuffetItems: BuffetItem[] = [
  // === ENTRADAS (25) ===
  { id: 'e1', name: 'Salada Mista', zone: 'entradas', active: true },
  { id: 'e2', name: 'Salada de Tomate', zone: 'entradas', active: true },
  { id: 'e3', name: 'Salada Russa', zone: 'entradas', active: true },
  { id: 'e4', name: 'Salada de Grão', zone: 'entradas', active: true },
  { id: 'e5', name: 'Salada de Feijão Frade', zone: 'entradas', active: true },
  { id: 'e6', name: 'Coleslaw', zone: 'entradas', active: true },
  { id: 'e7', name: 'Azeitonas', zone: 'entradas', active: true },
  { id: 'e8', name: 'Pickles', zone: 'entradas', active: true },
  { id: 'e9', name: 'Paté de Atum', zone: 'entradas', active: true },
  { id: 'e10', name: 'Hummus', zone: 'entradas', active: true },
  { id: 'e11', name: 'Queijos Variados', zone: 'entradas', active: true },
  { id: 'e12', name: 'Fiambre/Presunto', zone: 'entradas', active: true },
  { id: 'e13', name: 'Pão Variado', zone: 'entradas', active: true },
  { id: 'e14', name: 'Manteiga/Azeite', zone: 'entradas', active: true },
  { id: 'e15', name: 'Camarão Cozido', zone: 'entradas', active: true },
  { id: 'e16', name: 'Mexilhão Vinagrete', zone: 'entradas', active: true },
  { id: 'e17', name: 'Pastéis de Bacalhau', zone: 'entradas', active: true },
  { id: 'e18', name: 'Croquetes', zone: 'entradas', active: true },
  { id: 'e19', name: 'Rissóis', zone: 'entradas', active: true },
  { id: 'e20', name: 'Chamuças', zone: 'entradas', active: true },
  { id: 'e21', name: 'Salmão Fumado', zone: 'entradas', active: true },
  { id: 'e22', name: 'Carpaccio', zone: 'entradas', active: true },
  { id: 'e23', name: 'Cogumelos Marinados', zone: 'entradas', active: true },
  { id: 'e24', name: 'Pimentos Assados', zone: 'entradas', active: true },
  { id: 'e25', name: 'Tabouleh', zone: 'entradas', active: true },

  // === PRATOS PRINCIPAIS (15 + Sopa) ===
  { id: 'pp0', name: 'Sopa do Dia', zone: 'pratos_principais', active: true },
  { id: 'pp1', name: 'Arroz de Pato', zone: 'pratos_principais', active: true },
  { id: 'pp2', name: 'Bacalhau à Brás', zone: 'pratos_principais', active: true },
  { id: 'pp3', name: 'Frango Grelhado', zone: 'pratos_principais', active: true },
  { id: 'pp4', name: 'Bife à Portuguesa', zone: 'pratos_principais', active: true },
  { id: 'pp5', name: 'Arroz Branco', zone: 'pratos_principais', active: true },
  { id: 'pp6', name: 'Batata Assada', zone: 'pratos_principais', active: true },
  { id: 'pp7', name: 'Legumes Salteados', zone: 'pratos_principais', active: true },
  { id: 'pp8', name: 'Massa Carbonara', zone: 'pratos_principais', active: true },
  { id: 'pp9', name: 'Feijoada', zone: 'pratos_principais', active: true },
  { id: 'pp10', name: 'Peixe Grelhado', zone: 'pratos_principais', active: true },
  { id: 'pp11', name: 'Carne de Porco à Alentejana', zone: 'pratos_principais', active: true },
  { id: 'pp12', name: 'Arroz de Marisco', zone: 'pratos_principais', active: true },
  { id: 'pp13', name: 'Lasanha', zone: 'pratos_principais', active: true },
  { id: 'pp14', name: 'Vitela Assada', zone: 'pratos_principais', active: true },
  { id: 'pp15', name: 'Rojões', zone: 'pratos_principais', active: true },

  // === SOBREMESAS (10) ===
  { id: 's1', name: 'Mousse de Chocolate', zone: 'sobremesas', active: true },
  { id: 's2', name: 'Pudim Flan', zone: 'sobremesas', active: true },
  { id: 's3', name: 'Arroz Doce', zone: 'sobremesas', active: true },
  { id: 's4', name: 'Leite Creme', zone: 'sobremesas', active: true },
  { id: 's5', name: 'Fruta da Época', zone: 'sobremesas', active: true },
  { id: 's6', name: 'Salada de Fruta', zone: 'sobremesas', active: true },
  { id: 's7', name: 'Bolo de Bolacha', zone: 'sobremesas', active: true },
  { id: 's8', name: 'Tarte de Amêndoa', zone: 'sobremesas', active: true },
  { id: 's9', name: 'Gelado Variado', zone: 'sobremesas', active: true },
  { id: 's10', name: 'Panna Cotta', zone: 'sobremesas', active: true },
];
