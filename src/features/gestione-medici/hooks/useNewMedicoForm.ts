import { useState, useCallback } from 'react';
import type { CreateMedicoDTO, RegolaCompenso } from './types';

interface NewMedicoFormState extends CreateMedicoDTO {
  regolaBase: RegolaCompenso;
}

interface UseNewMedicoFormReturn {
  // State
  formData: NewMedicoFormState;
  errors: string[];
  
  // Field updates
  updateField: (field: keyof NewMedicoFormState, value: any) => void;
  updateRegolaBase: (updates: Partial<RegolaCompenso>) => void;
  
  // Validation
  validate: () => boolean;
  clearErrors: () => void;
  
  // Actions
  reset: () => void;
  getCreateDTO: () => CreateMedicoDTO;
}

const INITIAL_STATE: NewMedicoFormState = {
  nome: '',
  cognome: '',
  cf: '',
  piva: '',
  specialita: 'Medicina Estetica',
  email: '',
  telefono: '',
  iban: '',
  indirizzo: '',
  attivo: true,
  regolaBase: {
    tipo: 'percentuale',
    valore: 50,
    valoreX: 50,
    valoreY: 200,
    su: 'netto',
    detraiCosto: true
  }
};

/**
 * Hook per gestire il form di creazione nuovo medico
 * Separa la logica dal componente modale
 */
export function useNewMedicoForm(): UseNewMedicoFormReturn {
  const [formData, setFormData] = useState<NewMedicoFormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<string[]>([]);
  
  // Update field
  const updateField = useCallback((field: keyof NewMedicoFormState, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear errors when user types
    if (errors.length > 0) {
      setErrors([]);
    }
  }, [errors]);
  
  // Update regola base
  const updateRegolaBase = useCallback((updates: Partial<RegolaCompenso>) => {
    setFormData(prev => ({
      ...prev,
      regolaBase: {
        ...prev.regolaBase,
        ...updates
      }
    }));
  }, []);
  
  // Validate form
  const validate = useCallback((): boolean => {
    const newErrors: string[] = [];
    
    // Campi obbligatori
    if (!formData.nome.trim()) {
      newErrors.push('Il nome è obbligatorio');
    }
    
    if (!formData.cognome.trim()) {
      newErrors.push('Il cognome è obbligatorio');
    }
    
    if (!formData.cf.trim()) {
      newErrors.push('Il codice fiscale è obbligatorio');
    } else if (formData.cf.length !== 16) {
      newErrors.push('Il codice fiscale deve essere di 16 caratteri');
    }
    
    if (!formData.piva.trim()) {
      newErrors.push('La partita IVA è obbligatoria');
    } else if (formData.piva.length !== 11) {
      newErrors.push('La partita IVA deve essere di 11 cifre');
    }
    
    // Validazione email se fornita
    if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.push('Email non valida');
    }
    
    // Validazione IBAN se fornito
    if (formData.iban) {
      const ibanRegex = /^IT\d{2}[A-Z]\d{22}$/;
      if (!ibanRegex.test(formData.iban.replace(/\s/g, ''))) {
        newErrors.push('IBAN non valido (formato: IT + 25 caratteri)');
      }
    }
    
    // Validazione regola base
    switch (formData.regolaBase.tipo) {
      case 'percentuale':
        if (!formData.regolaBase.valore || formData.regolaBase.valore <= 0 || formData.regolaBase.valore > 100) {
          newErrors.push('La percentuale deve essere tra 1 e 100');
        }
        break;
      case 'scaglioni':
        if (!formData.regolaBase.valoreX || formData.regolaBase.valoreX <= 0) {
          newErrors.push('Il valore X degli scaglioni deve essere maggiore di 0');
        }
        if (!formData.regolaBase.valoreY || formData.regolaBase.valoreY <= 0) {
          newErrors.push('Il valore Y degli scaglioni deve essere maggiore di 0');
        }
        if (formData.regolaBase.valoreX && formData.regolaBase.valoreY && 
            formData.regolaBase.valoreX >= formData.regolaBase.valoreY) {
          newErrors.push('Il valore X deve essere minore di Y negli scaglioni');
        }
        break;
      case 'fisso':
        if (!formData.regolaBase.valoreX || formData.regolaBase.valoreX <= 0) {
          newErrors.push('L\'importo fisso deve essere maggiore di 0');
        }
        if (!formData.regolaBase.valoreY || formData.regolaBase.valoreY <= 0) {
          newErrors.push('Il numero di prestazioni deve essere maggiore di 0');
        }
        break;
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  }, [formData]);
  
  // Clear errors
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);
  
  // Reset form
  const reset = useCallback(() => {
    setFormData(INITIAL_STATE);
    setErrors([]);
  }, []);
  
  // Get DTO for creation
  const getCreateDTO = useCallback((): CreateMedicoDTO => {
    return {
      nome: formData.nome.trim(),
      cognome: formData.cognome.trim(),
      cf: formData.cf.trim().toUpperCase(),
      piva: formData.piva.trim(),
      specialita: formData.specialita,
      email: formData.email.trim(),
      telefono: formData.telefono.trim(),
      iban: formData.iban.trim().toUpperCase(),
      indirizzo: formData.indirizzo.trim(),
      attivo: formData.attivo
    };
  }, [formData]);
  
  return {
    // State
    formData,
    errors,
    
    // Field updates
    updateField,
    updateRegolaBase,
    
    // Validation
    validate,
    clearErrors,
    
    // Actions
    reset,
    getCreateDTO
  };
}