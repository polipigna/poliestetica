import { useState, useMemo, useEffect } from 'react';

interface UsePaginationReturn<T> {
  // Stati
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  
  // Dati paginati
  paginatedItems: T[];
  
  // Info aggiuntive
  startIndex: number;
  endIndex: number;
  totalItems: number;
  itemsShowingFrom: number;
  itemsShowingTo: number;
  
  // Azioni
  setCurrentPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  resetPage: () => void;
  
  // Helper per generare numeri di pagina
  getPageNumbers: (maxVisible?: number) => (number | string)[];
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

  // Calcola numero totale di pagine e indici
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, items.length);
  const totalItems = items.length;
  
  // Info per mostrare "Mostrando X-Y di Z risultati"
  const itemsShowingFrom = items.length > 0 ? startIndex + 1 : 0;
  const itemsShowingTo = endIndex;

  // Helper per generare i numeri di pagina con ellissi
  const getPageNumbers = (maxVisible: number = 7): (number | string)[] => {
    const pageNumbers: (number | string)[] = [];
    
    if (totalPages <= maxVisible) {
      // Mostra tutte le pagine se sono poche
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Sempre mostra la prima pagina
      pageNumbers.push(1);
      
      if (currentPage <= 4) {
        // Se siamo vicini all'inizio
        for (let i = 2; i <= 5; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // Se siamo vicini alla fine
        pageNumbers.push('...');
        for (let i = totalPages - 4; i < totalPages; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push(totalPages);
      } else {
        // Se siamo nel mezzo
        pageNumbers.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }
    
    return pageNumbers;
  };

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
    
    // Info aggiuntive
    startIndex,
    endIndex,
    totalItems,
    itemsShowingFrom,
    itemsShowingTo,
    
    // Azioni
    setCurrentPage,
    nextPage,
    prevPage,
    goToPage,
    resetPage,
    
    // Helper
    getPageNumbers
  };
}