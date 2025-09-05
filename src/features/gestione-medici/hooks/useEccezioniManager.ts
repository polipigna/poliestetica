import { useState, useCallback, useMemo } from 'react';
import { EccezioniManager, RegolaValidator } from '@/services/compensi';
import type { 
  MedicoExtended,
  EccezioneExtended,
  RegolaCompenso
} from './types';
import type { ValidationWarning } from '@/services/compensi';

interface UseEccezioniManagerProps {
  medico: MedicoExtended | null;
  onUpdate: (eccezioni: EccezioneExtended[]) => void;
  trattamentiDisponibili?: Array<{ codice: string; nome: string }>;
  prodottiDisponibili?: Array<{ nome: string }>;
}

interface NewEccezioneState {
  trattamento: string;
  prodotto: string;
  regola: RegolaCompenso;
}

interface UseEccezioniManagerReturn {
  // State
  eccezioni: EccezioneExtended[];
  editingEccezione: number | null;
  showAddModal: boolean;
  newEccezione: NewEccezioneState;
  validationWarnings: ValidationWarning[];
  
  // CRUD Actions
  addEccezione: () => void;
  updateEccezione: (id: number, updates: Partial<EccezioneExtended>) => void;
  removeEccezione: (id: number) => void;
  startEditing: (id: number) => void;
  stopEditing: () => void;
  
  // New eccezione form
  updateNewEccezione: (updates: Partial<NewEccezioneState>) => void;
  updateNewRegolaField: (field: keyof RegolaCompenso, value: any) => void;
  validateNewEccezione: () => boolean;
  resetNewEccezione: () => void;
  
  // Modal controls
  openAddModal: () => void;
  closeAddModal: () => void;
  
  // Validation
  validateCoherence: () => ValidationWarning[];
  hasConflicts: boolean;
  hasErrors: boolean;
}

const DEFAULT_NEW_ECCEZIONE: NewEccezioneState = {
  trattamento: '',
  prodotto: '',
  regola: {
    tipo: 'percentuale',
    valore: 50,
    su: 'netto',
    detraiCosto: true
  }
};

/**
 * Hook per la gestione completa delle eccezioni
 * Include CRUD, validazioni e gestione conflitti
 */
export function useEccezioniManager({ 
  medico, 
  onUpdate,
  trattamentiDisponibili = [],
  prodottiDisponibili = []
}: UseEccezioniManagerProps): UseEccezioniManagerReturn {
  
  // State
  const [editingEccezione, setEditingEccezione] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEccezione, setNewEccezione] = useState<NewEccezioneState>(DEFAULT_NEW_ECCEZIONE);
  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([]);
  
  // Services
  const regolaValidator = useMemo(() => new RegolaValidator(), []);
  
  // Eccezioni correnti dal medico
  const eccezioni = useMemo(() => {
    return medico?.eccezioni || [];
  }, [medico]);
  
  // Create manager instance
  const createManager = useCallback(() => {
    return new EccezioniManager(eccezioni);
  }, [eccezioni]);
  
  // Validate coherence
  const validateCoherence = useCallback((): ValidationWarning[] => {
    if (!medico || !medico.regolaBase) return [];
    
    const warnings = regolaValidator.validateCoherence(
      medico.regolaBase,
      eccezioni,
      medico.costiProdotti || []
    );
    
    setValidationWarnings(warnings);
    return warnings;
  }, [medico, eccezioni, regolaValidator]);
  
  // Add eccezione
  const addEccezione = useCallback(() => {
    if (!medico || !newEccezione.trattamento) return;
    
    // Valida prima di aggiungere
    if (!validateNewEccezione()) {
      return;
    }
    
    const manager = createManager();
    
    try {
      // Genera nuovo ID
      const newId = Math.max(...eccezioni.map(e => e.id), 0) + 1;
      
      manager.add({
        trattamento: newEccezione.trattamento,
        prodotto: newEccezione.prodotto || undefined,
        regola: newEccezione.regola
      });
      
      const updatedEccezioni = manager.getAll().map((ecc, idx) => ({
        ...ecc,
        id: ecc.id || idx + 1
      }));
      
      onUpdate(updatedEccezioni);
      
      // Reset form e chiudi modal
      resetNewEccezione();
      setShowAddModal(false);
      
      // Rivalidata coerenza
      validateCoherence();
      
    } catch (error) {
      console.error('Errore aggiunta eccezione:', error);
      alert(error instanceof Error ? error.message : 'Errore nell\'aggiunta dell\'eccezione');
    }
  }, [medico, newEccezione, createManager, eccezioni, onUpdate, validateCoherence]);
  
  // Update eccezione
  const updateEccezione = useCallback((id: number, updates: Partial<EccezioneExtended>) => {
    if (!medico) return;
    
    const manager = createManager();
    
    try {
      manager.update(id, updates);
      
      const updatedEccezioni = manager.getAll();
      onUpdate(updatedEccezioni);
      
      if (editingEccezione === id) {
        setEditingEccezione(null);
      }
      
      // Rivalidata coerenza
      validateCoherence();
      
    } catch (error) {
      console.error('Errore aggiornamento eccezione:', error);
      alert(error instanceof Error ? error.message : 'Errore nell\'aggiornamento dell\'eccezione');
    }
  }, [medico, createManager, onUpdate, editingEccezione, validateCoherence]);
  
  // Remove eccezione
  const removeEccezione = useCallback((id: number) => {
    if (!medico) return;
    
    const manager = createManager();
    
    try {
      manager.remove(id);
      
      const updatedEccezioni = manager.getAll();
      onUpdate(updatedEccezioni);
      
      if (editingEccezione === id) {
        setEditingEccezione(null);
      }
      
      // Rivalidata coerenza
      validateCoherence();
      
    } catch (error) {
      console.error('Errore rimozione eccezione:', error);
      alert(error instanceof Error ? error.message : 'Errore nella rimozione dell\'eccezione');
    }
  }, [medico, createManager, onUpdate, editingEccezione, validateCoherence]);
  
  // Editing controls
  const startEditing = useCallback((id: number) => {
    setEditingEccezione(id);
  }, []);
  
  const stopEditing = useCallback(() => {
    setEditingEccezione(null);
  }, []);
  
  // New eccezione form management
  const updateNewEccezione = useCallback((updates: Partial<NewEccezioneState>) => {
    setNewEccezione(prev => ({
      ...prev,
      ...updates
    }));
  }, []);
  
  const updateNewRegolaField = useCallback((field: keyof RegolaCompenso, value: any) => {
    setNewEccezione(prev => ({
      ...prev,
      regola: {
        ...prev.regola,
        [field]: value
      }
    }));
  }, []);
  
  const validateNewEccezione = useCallback((): boolean => {
    // Validazione base
    if (!newEccezione.trattamento) {
      alert('Seleziona un trattamento');
      return false;
    }
    
    // Valida regola
    if (!regolaValidator.isRegolaValida(newEccezione.regola)) {
      alert('Regola non valida. Verifica i valori inseriti.');
      return false;
    }
    
    // Validazione scaglioni
    if (newEccezione.regola.tipo === 'scaglioni') {
      const x = newEccezione.regola.valoreX || 0;
      const y = newEccezione.regola.valoreY || 0;
      if (x >= y) {
        alert('Per la regola a scaglioni, X deve essere minore di Y');
        return false;
      }
    }
    
    // Controlla duplicati
    const esistente = eccezioni.find(e => 
      e.trattamento === newEccezione.trattamento && 
      e.prodotto === newEccezione.prodotto
    );
    
    if (esistente) {
      const msg = newEccezione.prodotto 
        ? `Esiste già un'eccezione per ${newEccezione.trattamento} + ${newEccezione.prodotto}`
        : `Esiste già un'eccezione per ${newEccezione.trattamento}`;
      alert(msg);
      return false;
    }
    
    // Controlla se il prodotto ha un costo configurato (se detraiCosto è true)
    if (newEccezione.prodotto && newEccezione.regola.detraiCosto && medico) {
      const prodottoConfigurato = (medico.costiProdotti || []).some(
        cp => cp.codice === newEccezione.prodotto || cp.nome === newEccezione.prodotto
      );
      
      if (!prodottoConfigurato) {
        const continua = confirm(
          `Attenzione: il prodotto "${newEccezione.prodotto}" non ha un costo configurato. ` +
          `La detrazione costi non avrà effetto. Vuoi continuare comunque?`
        );
        if (!continua) return false;
      }
    }
    
    return true;
  }, [newEccezione, eccezioni, medico, regolaValidator]);
  
  const resetNewEccezione = useCallback(() => {
    setNewEccezione(DEFAULT_NEW_ECCEZIONE);
  }, []);
  
  // Modal controls
  const openAddModal = useCallback(() => {
    resetNewEccezione();
    setShowAddModal(true);
  }, [resetNewEccezione]);
  
  const closeAddModal = useCallback(() => {
    setShowAddModal(false);
    resetNewEccezione();
  }, [resetNewEccezione]);
  
  // Computed: has conflicts?
  const hasConflicts = useMemo(() => {
    return validationWarnings.some(w => w.tipo === 'conflitto');
  }, [validationWarnings]);
  
  // Computed: has errors?
  const hasErrors = useMemo(() => {
    return validationWarnings.some(w => w.gravita === 'error');
  }, [validationWarnings]);
  
  return {
    // State
    eccezioni,
    editingEccezione,
    showAddModal,
    newEccezione,
    validationWarnings,
    
    // CRUD Actions
    addEccezione,
    updateEccezione,
    removeEccezione,
    startEditing,
    stopEditing,
    
    // New eccezione form
    updateNewEccezione,
    updateNewRegolaField,
    validateNewEccezione,
    resetNewEccezione,
    
    // Modal controls
    openAddModal,
    closeAddModal,
    
    // Validation
    validateCoherence,
    hasConflicts,
    hasErrors
  };
}