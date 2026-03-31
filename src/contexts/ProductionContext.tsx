import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { mockProductionRecords, type ProductionRecord, type RecipientSize, type TrayStatus, recipientCapacity } from '@/lib/buffet-data';
import type { BuffetTrayState, ReplenishmentLog, LeftoverRecord } from '@/lib/buffet-zones';

interface ProductionContextType {
  // Production records (Producao page)
  records: ProductionRecord[];
  addRecord: (record: ProductionRecord) => void;
  checkoutRecord: (id: string, leftoverKg: number, action: 'aproveitamento' | 'desperdicio', note: string | null) => void;

  // Tray states (DashboardCozinha zones)
  trayStates: Record<string, BuffetTrayState>;
  handleReplenish: (itemId: string, recipient: RecipientSize, weightKg: number, userName: string) => void;

  // Leftover history (shared)
  leftoverHistory: LeftoverRecord[];
  addLeftover: (record: LeftoverRecord) => void;

  // Collect from buffet (DashboardCozinha recolha)
  handleCollect: (itemId: string, itemName: string, zone: 'entradas' | 'pratos_principais' | 'sobremesas', leftoverKg: number, action: 'aproveitamento' | 'desperdicio', note: string | null, userName: string) => void;
}

const ProductionContext = createContext<ProductionContextType | null>(null);

export function ProductionProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<ProductionRecord[]>(mockProductionRecords);
  const [trayStates, setTrayStates] = useState<Record<string, BuffetTrayState>>({});
  const [leftoverHistory, setLeftoverHistory] = useState<LeftoverRecord[]>([]);

  const addRecord = useCallback((record: ProductionRecord) => {
    setRecords(prev => [record, ...prev]);
  }, []);

  const checkoutRecord = useCallback((id: string, leftoverKg: number, action: 'aproveitamento' | 'desperdicio', note: string | null) => {
    setRecords(prev =>
      prev.map(r =>
        r.id === id
          ? {
              ...r,
              returnedAt: new Date().toISOString(),
              status: (action === 'aproveitamento' ? 'aproveitado' : 'desperdicio') as TrayStatus,
              leftoverKg,
              leftoverAction: action,
              aproveitamentoNote: note,
            }
          : r
      )
    );

    // Also add to leftover history for cross-page visibility
    const record = records.find(r => r.id === id);
    if (record) {
      const lr: LeftoverRecord = {
        id: `l${Date.now()}`,
        itemId: id,
        itemName: record.dishName,
        zone: 'pratos_principais',
        leftoverKg,
        action,
        note,
        date: new Date().toISOString(),
        registeredBy: record.registeredBy,
      };
      setLeftoverHistory(prev => [lr, ...prev]);
    }
  }, [records]);

  const handleReplenish = useCallback((itemId: string, recipient: RecipientSize, weightKg: number, userName: string) => {
    const log: ReplenishmentLog = {
      id: `r${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      itemId,
      recipient,
      weightKg,
      timestamp: new Date().toISOString(),
      registeredBy: userName,
    };
    setTrayStates(prev => {
      const existing = prev[itemId] || { itemId, replenishments: [], totalSentKg: 0, currentRecipient: null, isOnBuffet: false };
      return {
        ...prev,
        [itemId]: {
          ...existing,
          replenishments: [...existing.replenishments, log],
          totalSentKg: existing.totalSentKg + weightKg,
          currentRecipient: recipient,
          isOnBuffet: true,
        },
      };
    });

    // Also add as a production record for Producao page
    const cap = recipientCapacity[recipient];
    const newRecord: ProductionRecord = {
      id: `p${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dishName: '', // will be filled by caller context
      fichaTecnicaId: '',
      recipient,
      weightKg,
      sentAt: new Date().toISOString(),
      returnedAt: null,
      status: 'no_buffet',
      leftoverKg: null,
      leftoverAction: null,
      aproveitamentoNote: null,
      registeredBy: userName,
    };
    // We skip adding unnamed records; the replenish from ementa will use item names
  }, []);

  const handleCollect = useCallback((
    itemId: string, itemName: string, zone: 'entradas' | 'pratos_principais' | 'sobremesas',
    leftoverKg: number, action: 'aproveitamento' | 'desperdicio', note: string | null, userName: string
  ) => {
    const record: LeftoverRecord = {
      id: `l${Date.now()}`,
      itemId,
      itemName,
      zone,
      leftoverKg,
      action,
      note,
      date: new Date().toISOString(),
      registeredBy: userName,
    };
    setLeftoverHistory(prev => [record, ...prev]);
    setTrayStates(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], isOnBuffet: false },
    }));
  }, []);

  const addLeftover = useCallback((record: LeftoverRecord) => {
    setLeftoverHistory(prev => [record, ...prev]);
  }, []);

  return (
    <ProductionContext.Provider value={{
      records, addRecord, checkoutRecord,
      trayStates, handleReplenish,
      leftoverHistory, addLeftover, handleCollect,
    }}>
      {children}
    </ProductionContext.Provider>
  );
}

export function useProduction() {
  const ctx = useContext(ProductionContext);
  if (!ctx) throw new Error('useProduction must be used within ProductionProvider');
  return ctx;
}
