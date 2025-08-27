import { useState, useMemo, useEffect } from 'react';

interface UsePaginationReturn<T> {
  // Stati
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  
  // Dati paginati
  paginatedItems: T[];
  
  // Azioni
  setCurrentPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  resetPage: () => void;
}

export function usePagination<T>(
  items: T[],
  defaultItemsPerPage: number = 10
): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(defaultItemsPerPage);

  // Reset pagina quando cambiano gli items (es. dopo filtri)
  useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);

  // Calcola items paginati
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  }, [items, currentPage, itemsPerPage]);

  // Calcola numero totale di pagine
  const totalPages = Math.ceil(items.length / itemsPerPage);

  // Azioni di navigazione
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const resetPage = () => {
    setCurrentPage(1);
  };

  return {
    // Stati
    currentPage,
    itemsPerPage,
    totalPages,
    
    // Dati paginati
    paginatedItems,
    
    // Azioni
    setCurrentPage,
    nextPage,
    prevPage,
    goToPage,
    resetPage
  };
}