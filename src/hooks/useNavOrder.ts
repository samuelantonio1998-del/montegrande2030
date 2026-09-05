import { useState, useCallback } from 'react';

const STORAGE_KEY = 'nav-order';

function getStoredOrder(profileKey: string): string[] | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}-${profileKey}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredOrder(profileKey: string, order: string[]) {
  localStorage.setItem(`${STORAGE_KEY}-${profileKey}`, JSON.stringify(order));
}

export function useNavOrder<T extends { to: string }>(items: T[], profileKey: string): {
  orderedItems: T[];
  dragStart: (index: number) => void;
  dragOver: (e: React.DragEvent, index: number) => void;
  dragEnd: () => void;
  dragOverIndex: number | null;
} {
  const stored = getStoredOrder(profileKey);
  const sorted = stored
    ? [...items].sort((a, b) => {
        const ai = stored.indexOf(a.to);
        const bi = stored.indexOf(b.to);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      })
    : items;

  const [orderedItems, setOrderedItems] = useState<T[]>(sorted);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Re-sync if the visible permission set changes.
  const itemKeys = items.map(i => i.to).join(',');
  const [prevKeys, setPrevKeys] = useState(itemKeys);
  if (itemKeys !== prevKeys) {
    setPrevKeys(itemKeys);
    const s = getStoredOrder(profileKey);
    const newSorted = s
      ? [...items].sort((a, b) => {
          const ai = s.indexOf(a.to);
          const bi = s.indexOf(b.to);
          return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        })
      : items;
    setOrderedItems(newSorted);
  }

  const dragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const dragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIdx(index);
  }, []);

  const dragEnd = useCallback(() => {
    if (dragIndex !== null && dragOverIdx !== null && dragIndex !== dragOverIdx) {
      setOrderedItems(prev => {
        const next = [...prev];
        const [moved] = next.splice(dragIndex, 1);
        next.splice(dragOverIdx, 0, moved);
        setStoredOrder(profileKey, next.map(i => i.to));
        return next;
      });
    }
    setDragIndex(null);
    setDragOverIdx(null);
  }, [dragIndex, dragOverIdx, profileKey]);

  return { orderedItems, dragStart, dragOver, dragEnd, dragOverIndex: dragOverIdx };
}
