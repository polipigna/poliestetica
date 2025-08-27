import { useState } from 'react';

interface UseSelectionReturn {
  selectedItems: number[];
  isSelected: (id: number) => boolean;
  selectItem: (id: number) => void;
  deselectItem: (id: number) => void;
  toggleSelection: (id: number) => void;
  selectAll: (ids: number[]) => void;
  deselectAll: () => void;
  selectMultiple: (ids: number[]) => void;
}

export function useSelection(): UseSelectionReturn {
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  const isSelected = (id: number): boolean => {
    return selectedItems.includes(id);
  };

  const selectItem = (id: number) => {
    if (!selectedItems.includes(id)) {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const deselectItem = (id: number) => {
    setSelectedItems(selectedItems.filter(itemId => itemId !== id));
  };

  const toggleSelection = (id: number) => {
    if (selectedItems.includes(id)) {
      deselectItem(id);
    } else {
      selectItem(id);
    }
  };

  const selectAll = (ids: number[]) => {
    setSelectedItems(ids);
  };

  const deselectAll = () => {
    setSelectedItems([]);
  };

  const selectMultiple = (ids: number[]) => {
    const newSelections = ids.filter(id => !selectedItems.includes(id));
    setSelectedItems([...selectedItems, ...newSelections]);
  };

  return {
    selectedItems,
    isSelected,
    selectItem,
    deselectItem,
    toggleSelection,
    selectAll,
    deselectAll,
    selectMultiple
  };
}