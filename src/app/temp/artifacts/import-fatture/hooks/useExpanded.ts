import { useState } from 'react';

interface UseExpandedReturn {
  expandedItems: number[];
  isExpanded: (id: number) => boolean;
  toggleExpanded: (id: number) => void;
  expandAll: (ids: number[]) => void;
  collapseAll: () => void;
}

export function useExpanded(): UseExpandedReturn {
  const [expandedItems, setExpandedItems] = useState<number[]>([]);

  const isExpanded = (id: number): boolean => {
    return expandedItems.includes(id);
  };

  const toggleExpanded = (id: number) => {
    if (expandedItems.includes(id)) {
      setExpandedItems(expandedItems.filter(itemId => itemId !== id));
    } else {
      setExpandedItems([...expandedItems, id]);
    }
  };

  const expandAll = (ids: number[]) => {
    setExpandedItems(ids);
  };

  const collapseAll = () => {
    setExpandedItems([]);
  };

  return {
    expandedItems,
    isExpanded,
    toggleExpanded,
    expandAll,
    collapseAll
  };
}