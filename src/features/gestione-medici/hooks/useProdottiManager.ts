import { useState, useCallback, useMemo } from 'react';
import { ProdottiCostiManager } from '@/services/compensi';
import * as XLSX from 'xlsx';
import type { 
  MedicoExtended,
  CostoProdottoExtended,
  ImportState
} from './types';

interface UseProdottiManagerProps {
  medico: MedicoExtended | null;
  onUpdate: (costi: CostoProdottoExtended[]) => void;
  prodottiDisponibili?: Array<{ nome: string; unitaMisura: string; prezzoDefault: number }>;
}

interface UseProdottiManagerReturn {
  // State
  prodotti: CostoProdottoExtended[];
  editingProdotto: number | null;
  showAddModal: boolean;
  showImportModal: boolean;
  importState: ImportState;
  
  // CRUD Actions
  addProdotto: (prodotto: Partial<CostoProdottoExtended>) => void;
  updateProdotto: (id: number, costo: number) => void;
  removeProdotto: (id: number) => void;
  startEditing: (id: number) => void;
  stopEditing: () => void;
  
  // Import/Export
  prepareImport: (file: File) => void;
  confirmImport: () => void;
  cancelImport: () => void;
  exportToExcel: () => void;
  
  // Modal controls
  openAddModal: () => void;
  closeAddModal: () => void;
  openImportModal: () => void;
  closeImportModal: () => void;
  
  // Helpers
  canAddProdotto: (nome: string) => boolean;
  getProdottoDisponibile: (nome: string) => any;
}

/**
 * Hook per la gestione completa dei prodotti e costi
 * Include CRUD, import/export Excel e validazioni
 */
export function useProdottiManager({ 
  medico, 
  onUpdate, 
  prodottiDisponibili = [] 
}: UseProdottiManagerProps): UseProdottiManagerReturn {
  
  // State
  const [editingProdotto, setEditingProdotto] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importState, setImportState] = useState<ImportState>({
    file: null,
    preview: null,
    isProcessing: false,
    error: null
  });
  
  // Prodotti correnti dal medico
  const prodotti = useMemo(() => {
    return medico?.costiProdotti || [];
  }, [medico]);
  
  // Manager instance
  const createManager = useCallback(() => {
    return new ProdottiCostiManager(prodotti, prodottiDisponibili);
  }, [prodotti, prodottiDisponibili]);
  
  // Add prodotto
  const addProdotto = useCallback((prodotto: Partial<CostoProdottoExtended>) => {
    if (!medico || !prodotto.nome) return;
    
    const manager = createManager();
    
    try {
      const prodottoDisponibile = prodottiDisponibili.find(p => p.nome === prodotto.nome);
      
      manager.add({
        nome: prodotto.nome,
        costo: prodotto.costo || 0,
        unitaMisura: prodotto.unitaMisura || prodottoDisponibile?.unitaMisura || 'unità',
        nonDetrarre: prodotto.nonDetrarre || false
      });
      
      const updatedProdotti = manager.getAll();
      onUpdate(updatedProdotti);
      setShowAddModal(false);
    } catch (error) {
      console.error('Errore aggiunta prodotto:', error);
      throw error;
    }
  }, [medico, createManager, prodottiDisponibili, onUpdate]);
  
  // Update prodotto
  const updateProdotto = useCallback((id: number, costo: number) => {
    if (!medico) return;
    
    const manager = createManager();
    
    try {
      const nuovoCosto = Math.max(0, costo);
      manager.update(id, {
        costo: nuovoCosto,
        nonDetrarre: nuovoCosto === 0
      });
      
      const updatedProdotti = manager.getAll();
      onUpdate(updatedProdotti);
      setEditingProdotto(null);
    } catch (error) {
      console.error('Errore aggiornamento prodotto:', error);
      throw error;
    }
  }, [medico, createManager, onUpdate]);
  
  // Remove prodotto
  const removeProdotto = useCallback((id: number) => {
    if (!medico) return;
    
    const manager = createManager();
    
    try {
      manager.remove(id);
      const updatedProdotti = manager.getAll();
      onUpdate(updatedProdotti);
    } catch (error) {
      console.error('Errore rimozione prodotto:', error);
      throw error;
    }
  }, [medico, createManager, onUpdate]);
  
  // Editing controls
  const startEditing = useCallback((id: number) => {
    setEditingProdotto(id);
  }, []);
  
  const stopEditing = useCallback(() => {
    setEditingProdotto(null);
  }, []);
  
  // Export to Excel
  const exportToExcel = useCallback(() => {
    if (!medico) return;
    
    try {
      // Prepara i dati per Excel
      const data = prodotti.map(p => ({
        'Nome Prodotto': p.nome,
        'Unità di Misura': p.unitaMisura || 'unità',
        'Costo': p.costo
      }));
      
      // Crea workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Aggiungi worksheet
      XLSX.utils.book_append_sheet(wb, ws, 'Costi Prodotti');
      
      // Nome file
      const fileName = `costi_prodotti_${medico.cognome}_${medico.nome}.xlsx`;
      
      // Download
      try {
        XLSX.writeFile(wb, fileName);
      } catch (error) {
        // Fallback con blob
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
      }
    } catch (error) {
      console.error('Errore export Excel:', error);
      throw error;
    }
  }, [medico, prodotti]);
  
  // Prepare import
  const prepareImport = useCallback((file: File) => {
    if (!medico || !file) return;
    
    setImportState({
      file,
      preview: null,
      isProcessing: true,
      error: null
    });
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Prendi il primo foglio
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        // Usa manager per preparare import
        const manager = createManager();
        
        // Prepara i dati
        const importData = jsonData.map((row: any) => ({
          nome: row['Nome Prodotto'],
          costo: parseFloat(row['Costo']) || 0
        })).filter((item: any) => item.nome);
        
        const importResult = manager.prepareImport(importData);
        
        // Controlla se ci sono modifiche
        if (importResult.modifiche.length === 0 && importResult.nuoviProdotti.length === 0) {
          setImportState({
            file,
            preview: importResult,
            isProcessing: false,
            error: 'Nessuna modifica o nuovo prodotto valido rilevato nel file'
          });
          return;
        }
        
        setImportState({
          file,
          preview: importResult,
          isProcessing: false,
          error: null
        });
        
      } catch (error) {
        setImportState({
          file,
          preview: null,
          isProcessing: false,
          error: error instanceof Error ? error.message : 'Errore lettura file'
        });
      }
    };
    
    reader.onerror = () => {
      setImportState({
        file,
        preview: null,
        isProcessing: false,
        error: 'Errore durante la lettura del file'
      });
    };
    
    reader.readAsBinaryString(file);
  }, [medico, createManager]);
  
  // Confirm import
  const confirmImport = useCallback(() => {
    if (!medico || !importState.preview || importState.error) return;
    
    try {
      const manager = createManager();
      manager.confirmImport(importState.preview);
      
      const updatedProdotti = manager.getAll();
      onUpdate(updatedProdotti);
      
      // Reset import state
      setImportState({
        file: null,
        preview: null,
        isProcessing: false,
        error: null
      });
      setShowImportModal(false);
      
    } catch (error) {
      setImportState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Errore conferma import'
      }));
    }
  }, [medico, importState, createManager, onUpdate]);
  
  // Cancel import
  const cancelImport = useCallback(() => {
    setImportState({
      file: null,
      preview: null,
      isProcessing: false,
      error: null
    });
    setShowImportModal(false);
  }, []);
  
  // Modal controls
  const openAddModal = useCallback(() => setShowAddModal(true), []);
  const closeAddModal = useCallback(() => setShowAddModal(false), []);
  const openImportModal = useCallback(() => setShowImportModal(true), []);
  const closeImportModal = useCallback(() => {
    setShowImportModal(false);
    setImportState({
      file: null,
      preview: null,
      isProcessing: false,
      error: null
    });
  }, []);
  
  // Helper: can add prodotto?
  const canAddProdotto = useCallback((nome: string): boolean => {
    if (!nome) return false;
    return !prodotti.some(p => p.nome === nome);
  }, [prodotti]);
  
  // Helper: get prodotto disponibile
  const getProdottoDisponibile = useCallback((nome: string) => {
    return prodottiDisponibili.find(p => p.nome === nome);
  }, [prodottiDisponibili]);
  
  return {
    // State
    prodotti,
    editingProdotto,
    showAddModal,
    showImportModal,
    importState,
    
    // CRUD Actions
    addProdotto,
    updateProdotto,
    removeProdotto,
    startEditing,
    stopEditing,
    
    // Import/Export
    prepareImport,
    confirmImport,
    cancelImport,
    exportToExcel,
    
    // Modal controls
    openAddModal,
    closeAddModal,
    openImportModal,
    closeImportModal,
    
    // Helpers
    canAddProdotto,
    getProdottoDisponibile
  };
}