import { useState, useEffect, useCallback, useMemo } from 'react';
import { RegolaValidator } from '@/services/compensi';
import { useUser } from '@/contexts/UserContext';
import type { 
  MedicoExtended,
  RegolaCompenso,
  CostoProdottoExtended,
  EccezioneExtended,
  UseMedicoFormReturn,
  UpdateMedicoDTO
} from './types';

interface UseMedicoFormProps {
  medico: MedicoExtended | null;
  onSave: (id: number, updates: UpdateMedicoDTO) => Promise<void>;
}

/**
 * Hook per la gestione del form di modifica medico
 * Gestisce lo stato del form, validazioni e tracking delle modifiche
 */
export function useMedicoForm({ medico, onSave }: UseMedicoFormProps): UseMedicoFormReturn {
  // User context per verificare permessi
  const { isAdmin } = useUser();
  
  // State del form
  const [formData, setFormData] = useState<MedicoExtended | null>(null);
  const [originalData, setOriginalData] = useState<MedicoExtended | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Istanza del validator
  const regolaValidator = useMemo(() => new RegolaValidator(), []);
  
  // Inizializza/aggiorna il form quando cambia il medico
  useEffect(() => {
    if (medico) {
      // Crea una copia profonda per evitare mutazioni
      const medicoClone = JSON.parse(JSON.stringify(medico));
      setFormData(medicoClone);
      setOriginalData(medicoClone);
      setHasUnsavedChanges(false);
      setValidationErrors([]);
    } else {
      setFormData(null);
      setOriginalData(null);
      setHasUnsavedChanges(false);
      setValidationErrors([]);
    }
  }, [medico]);
  
  // Funzione per confrontare se ci sono modifiche
  const checkForChanges = useCallback((current: MedicoExtended | null, original: MedicoExtended | null): boolean => {
    if (!current || !original) return false;
    
    // Confronto profondo serializzando gli oggetti
    const currentStr = JSON.stringify({
      nome: current.nome,
      cognome: current.cognome,
      cf: current.codiceFiscale,
      piva: current.partitaIva,
      email: current.email,
      telefono: current.telefono,
      iban: current.iban,
      indirizzo: current.indirizzo,
      specialita: current.specialita,
      attivo: current.attivo,
      regolaBase: current.regolaBase,
      costiProdotti: current.costiProdotti,
      eccezioni: current.eccezioni
    });
    
    const originalStr = JSON.stringify({
      nome: original.nome,
      cognome: original.cognome,
      cf: original.codiceFiscale,
      piva: original.partitaIva,
      email: original.email,
      telefono: original.telefono,
      iban: original.iban,
      indirizzo: original.indirizzo,
      specialita: original.specialita,
      attivo: original.attivo,
      regolaBase: original.regolaBase,
      costiProdotti: original.costiProdotti,
      eccezioni: original.eccezioni
    });
    
    return currentStr !== originalStr;
  }, []);
  
  // Aggiorna un campo generico
  const updateField = useCallback((field: keyof MedicoExtended, value: any) => {
    if (!formData) return;
    
    const updated = {
      ...formData,
      [field]: value
    };
    
    setFormData(updated);
    setHasUnsavedChanges(checkForChanges(updated, originalData));
  }, [formData, originalData, checkForChanges]);
  
  // Aggiorna la regola base
  const updateRegolaBase = useCallback((updates: Partial<RegolaCompenso>) => {
    if (!formData) return;
    
    const updated = {
      ...formData,
      regolaBase: {
        ...formData.regolaBase!,
        ...updates
      }
    };
    
    setFormData(updated);
    setHasUnsavedChanges(checkForChanges(updated, originalData));
  }, [formData, originalData, checkForChanges]);
  
  // Aggiorna i costi prodotti
  const updateCostiProdotti = useCallback((costi: CostoProdottoExtended[]) => {
    if (!formData) return;
    
    const updated = {
      ...formData,
      costiProdotti: costi
    };
    
    setFormData(updated);
    setHasUnsavedChanges(checkForChanges(updated, originalData));
  }, [formData, originalData, checkForChanges]);
  
  // Aggiorna le eccezioni
  const updateEccezioni = useCallback((eccezioni: EccezioneExtended[]) => {
    if (!formData) return;
    
    const updated = {
      ...formData,
      eccezioni: eccezioni
    };
    
    setFormData(updated);
    setHasUnsavedChanges(checkForChanges(updated, originalData));
  }, [formData, originalData, checkForChanges]);
  
  // Valida il form
  const validate = useCallback((): string[] => {
    const errors: string[] = [];
    
    if (!formData) {
      errors.push('Nessun dato da salvare');
      return errors;
    }
    
    // Validazioni base
    if (!formData.nome || !formData.cognome) {
      errors.push('Nome e cognome sono obbligatori');
    }
    
    if (!formData.codiceFiscale || !formData.partitaIva) {
      errors.push('Codice fiscale e partita IVA sono obbligatori');
    }
    
    // Validazione email
    if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.push('Email non valida');
    }
    
    // Validazione regola base (solo admin può modificarla)
    if (isAdmin && formData.regolaBase) {
      if (!regolaValidator.isRegolaValida(formData.regolaBase)) {
        errors.push('Regola base non valida');
      }
      
      // Valida coerenza generale
      const warnings = regolaValidator.validateCoherence(
        formData.regolaBase,
        formData.eccezioni || [],
        formData.costiProdotti || []
      );
      
      // Aggiungi solo errori critici
      const criticalErrors = warnings.filter(w => w.gravita === 'error');
      criticalErrors.forEach(err => {
        errors.push(err.messaggio);
      });
    }
    
    return errors;
  }, [formData, isAdmin, regolaValidator]);
  
  // Salva le modifiche
  const save = useCallback(async (): Promise<void> => {
    if (!formData || !hasUnsavedChanges) return;
    
    // Valida prima di salvare
    const errors = validate();
    setValidationErrors(errors);
    
    if (errors.length > 0) {
      throw new Error(errors[0]);
    }
    
    setIsSaving(true);
    
    try {
      // Prepara gli aggiornamenti
      const updates: UpdateMedicoDTO = {};
      
      // Se admin, può modificare tutto
      if (isAdmin) {
        updates.nome = formData.nome;
        updates.cognome = formData.cognome;
        updates.cf = formData.codiceFiscale;
        updates.piva = formData.partitaIva;
        updates.email = formData.email;
        updates.telefono = formData.telefono;
        updates.iban = formData.iban;
        updates.indirizzo = formData.indirizzo;
        updates.specialita = formData.specialita;
        updates.attivo = formData.attivo;
        updates.regolaBase = formData.regolaBase;
        updates.eccezioni = formData.eccezioni;
      }
      
      // Tutti possono modificare i costi prodotti
      updates.costiProdotti = formData.costiProdotti;
      
      // Salva tramite callback
      await onSave(formData.id, updates);
      
      // Aggiorna original data dopo salvataggio riuscito
      setOriginalData(JSON.parse(JSON.stringify(formData)));
      setHasUnsavedChanges(false);
      setValidationErrors([]);
      
    } catch (error) {
      console.error('Errore durante il salvataggio:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [formData, hasUnsavedChanges, validate, isAdmin, onSave]);
  
  // Reset alle modifiche originali
  const reset = useCallback(() => {
    if (originalData) {
      setFormData(JSON.parse(JSON.stringify(originalData)));
      setHasUnsavedChanges(false);
      setValidationErrors([]);
    }
  }, [originalData]);
  
  // Computed: può salvare?
  const canSave = useMemo(() => {
    return hasUnsavedChanges && !isSaving && validationErrors.length === 0;
  }, [hasUnsavedChanges, isSaving, validationErrors]);
  
  return {
    // State
    formData,
    originalData,
    hasUnsavedChanges,
    validationErrors,
    isSaving,
    
    // Field updates
    updateField,
    updateRegolaBase,
    updateCostiProdotti,
    updateEccezioni,
    
    // Actions
    save,
    reset,
    
    // Computed
    canSave
  };
}