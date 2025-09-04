import { useState, useCallback } from 'react';

interface UseExpandedReturn {
  expandedFatture: number[];
  isExpanded: (fatturaId: number) => boolean;
  toggleExpanded: (fatturaId: number) => void;
  expandAll: (fattureIds: number[]) => void;
  collapseAll: () => void;
  setExpandedFatture: React.Dispatch<React.SetStateAction<number[]>>;
}

export function useExpanded(initialExpanded: number[] = []): UseExpandedReturn {
  const [expandedFatture, setExpandedFatture] = useState<number[]>(initialExpanded);

  const isExpanded = useCallback((fatturaId: number): boolean => {
    return expandedFatture.includes(fatturaId);
  }, [expandedFatture]);

  const toggleExpanded = useCallback((fatturaId: number): void => {
    setExpandedFatture(prev => 
      prev.includes(fatturaId) 
        ? prev.filter(id => id !== fatturaId)
        : [...prev, fatturaId]
    );
  }, []);

  const expandAll = useCallback((fattureIds: number[]): void => {
    setExpandedFatture(fattureIds);
  }, []);

  const collapseAll = useCallback((): void => {
    setExpandedFatture([]);
  }, []);

  return {
    expandedFatture,
    isExpanded,
    toggleExpanded,
    expandAll,
    collapseAll,
    setExpandedFatture
  };
}