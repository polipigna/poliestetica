import { useState } from 'react';

interface ImportSummary {
  count: number;
  nuove: number;
  aggiornate: number;
}

interface SyncSummary {
  nuove: number;
  aggiornate: number;
  totali: number;
}

interface UseImportSummaryReturn {
  // Stati
  importSummary: ImportSummary | null;
  syncSummary: SyncSummary | null;
  
  // Azioni
  setImportSummary: (summary: ImportSummary | null) => void;
  setSyncSummary: (summary: SyncSummary | null) => void;
  
  // Helpers
  createImportSummary: (count: number, nuove: number, aggiornate: number) => void;
  createSyncSummary: (nuove: number, aggiornate: number, totali: number) => void;
  clearSummaries: () => void;
}

export function useImportSummary(): UseImportSummaryReturn {
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);

  const createImportSummary = (count: number, nuove: number, aggiornate: number) => {
    setImportSummary({ count, nuove, aggiornate });
  };

  const createSyncSummary = (nuove: number, aggiornate: number, totali: number) => {
    setSyncSummary({ nuove, aggiornate, totali });
  };

  const clearSummaries = () => {
    setImportSummary(null);
    setSyncSummary(null);
  };

  return {
    // Stati
    importSummary,
    syncSummary,
    
    // Azioni
    setImportSummary,
    setSyncSummary,
    
    // Helpers
    createImportSummary,
    createSyncSummary,
    clearSummaries
  };
}