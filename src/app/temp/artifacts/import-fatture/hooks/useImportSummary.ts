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
  showImportSummary: boolean;
  showSyncSummary: boolean;
  
  // Azioni
  setImportSummary: (summary: ImportSummary | null) => void;
  setSyncSummary: (summary: SyncSummary | null) => void;
  setShowImportSummary: (show: boolean) => void;
  setShowSyncSummary: (show: boolean) => void;
  
  // Helpers
  createImportSummary: (count: number, nuove: number, aggiornate: number) => void;
  createSyncSummary: (nuove: number, aggiornate: number, totali: number) => void;
  clearSummaries: () => void;
}

export function useImportSummary(): UseImportSummaryReturn {
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);
  const [showImportSummary, setShowImportSummary] = useState(false);
  const [showSyncSummary, setShowSyncSummary] = useState(false);

  const createImportSummary = (count: number, nuove: number, aggiornate: number) => {
    setImportSummary({ count, nuove, aggiornate });
    setShowImportSummary(true);
  };

  const createSyncSummary = (nuove: number, aggiornate: number, totali: number) => {
    setSyncSummary({ nuove, aggiornate, totali });
    setShowSyncSummary(true);
  };

  const clearSummaries = () => {
    setImportSummary(null);
    setSyncSummary(null);
    setShowImportSummary(false);
    setShowSyncSummary(false);
  };

  return {
    // Stati
    importSummary,
    syncSummary,
    showImportSummary,
    showSyncSummary,
    
    // Azioni
    setImportSummary,
    setSyncSummary,
    setShowImportSummary,
    setShowSyncSummary,
    
    // Helpers
    createImportSummary,
    createSyncSummary,
    clearSummaries
  };
}