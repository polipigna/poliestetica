import { useState, useCallback, useMemo } from 'react';

export type ModalName = 
  | 'newMedico' 
  | 'deleteConfirm' 
  | 'addProdotto' 
  | 'importProdotti'
  | 'importConfirm'
  | 'addEccezione';

interface ModalState {
  newMedico: boolean;
  deleteConfirm: number | null; // ID del medico da eliminare
  addProdotto: boolean;
  importProdotti: boolean;
  importConfirm: boolean;
  addEccezione: boolean;
}

interface UseModalManagerReturn {
  // State
  modals: ModalState;
  
  // Generic actions
  openModal: (modalName: ModalName, data?: any) => void;
  closeModal: (modalName: ModalName) => void;
  closeAll: () => void;
  
  // Specific modal actions
  openNewMedico: () => void;
  closeNewMedico: () => void;
  
  openDeleteConfirm: (medicoId: number) => void;
  closeDeleteConfirm: () => void;
  
  openAddProdotto: () => void;
  closeAddProdotto: () => void;
  
  openImportProdotti: () => void;
  closeImportProdotti: () => void;
  
  openImportConfirm: () => void;
  closeImportConfirm: () => void;
  
  openAddEccezione: () => void;
  closeAddEccezione: () => void;
  
  // Utilities
  isAnyModalOpen: boolean;
  activeModalCount: number;
  isModalOpen: (modalName: ModalName) => boolean;
}

const INITIAL_STATE: ModalState = {
  newMedico: false,
  deleteConfirm: null,
  addProdotto: false,
  importProdotti: false,
  importConfirm: false,
  addEccezione: false
};

/**
 * Hook per la gestione centralizzata di tutti i modali
 * Previene apertura multipla e gestisce lo stato in modo consistente
 */
export function useModalManager(): UseModalManagerReturn {
  const [modals, setModals] = useState<ModalState>(INITIAL_STATE);
  
  // Generic open modal
  const openModal = useCallback((modalName: ModalName, data?: any) => {
    setModals(prev => {
      const newState = { ...prev };
      
      switch (modalName) {
        case 'deleteConfirm':
          // Per deleteConfirm, data è l'ID del medico
          newState.deleteConfirm = data as number;
          break;
        case 'newMedico':
          newState.newMedico = true;
          break;
        case 'addProdotto':
          newState.addProdotto = true;
          break;
        case 'importProdotti':
          newState.importProdotti = true;
          break;
        case 'importConfirm':
          newState.importConfirm = true;
          // Quando apriamo importConfirm, chiudiamo importProdotti
          newState.importProdotti = false;
          break;
        case 'addEccezione':
          newState.addEccezione = true;
          break;
      }
      
      return newState;
    });
  }, []);
  
  // Generic close modal
  const closeModal = useCallback((modalName: ModalName) => {
    setModals(prev => {
      const newState = { ...prev };
      
      switch (modalName) {
        case 'deleteConfirm':
          newState.deleteConfirm = null;
          break;
        case 'newMedico':
          newState.newMedico = false;
          break;
        case 'addProdotto':
          newState.addProdotto = false;
          break;
        case 'importProdotti':
          newState.importProdotti = false;
          break;
        case 'importConfirm':
          newState.importConfirm = false;
          break;
        case 'addEccezione':
          newState.addEccezione = false;
          break;
      }
      
      return newState;
    });
  }, []);
  
  // Close all modals
  const closeAll = useCallback(() => {
    setModals(INITIAL_STATE);
  }, []);
  
  // Specific modal actions for convenience
  const openNewMedico = useCallback(() => openModal('newMedico'), [openModal]);
  const closeNewMedico = useCallback(() => closeModal('newMedico'), [closeModal]);
  
  const openDeleteConfirm = useCallback((medicoId: number) => {
    openModal('deleteConfirm', medicoId);
  }, [openModal]);
  const closeDeleteConfirm = useCallback(() => closeModal('deleteConfirm'), [closeModal]);
  
  const openAddProdotto = useCallback(() => openModal('addProdotto'), [openModal]);
  const closeAddProdotto = useCallback(() => closeModal('addProdotto'), [closeModal]);
  
  const openImportProdotti = useCallback(() => openModal('importProdotti'), [openModal]);
  const closeImportProdotti = useCallback(() => closeModal('importProdotti'), [closeModal]);
  
  const openImportConfirm = useCallback(() => openModal('importConfirm'), [openModal]);
  const closeImportConfirm = useCallback(() => {
    closeModal('importConfirm');
    // Quando chiudiamo importConfirm, assicuriamoci che importProdotti sia chiuso
    closeModal('importProdotti');
  }, [closeModal]);
  
  const openAddEccezione = useCallback(() => openModal('addEccezione'), [openModal]);
  const closeAddEccezione = useCallback(() => closeModal('addEccezione'), [closeModal]);
  
  // Check if specific modal is open
  const isModalOpen = useCallback((modalName: ModalName): boolean => {
    switch (modalName) {
      case 'deleteConfirm':
        return modals.deleteConfirm !== null;
      case 'newMedico':
        return modals.newMedico;
      case 'addProdotto':
        return modals.addProdotto;
      case 'importProdotti':
        return modals.importProdotti;
      case 'importConfirm':
        return modals.importConfirm;
      case 'addEccezione':
        return modals.addEccezione;
      default:
        return false;
    }
  }, [modals]);
  
  // Computed: is any modal open?
  const isAnyModalOpen = useMemo(() => {
    return modals.newMedico || 
           modals.deleteConfirm !== null || 
           modals.addProdotto || 
           modals.importProdotti || 
           modals.importConfirm || 
           modals.addEccezione;
  }, [modals]);
  
  // Computed: active modal count
  const activeModalCount = useMemo(() => {
    let count = 0;
    if (modals.newMedico) count++;
    if (modals.deleteConfirm !== null) count++;
    if (modals.addProdotto) count++;
    if (modals.importProdotti) count++;
    if (modals.importConfirm) count++;
    if (modals.addEccezione) count++;
    return count;
  }, [modals]);
  
  return {
    // State
    modals,
    
    // Generic actions
    openModal,
    closeModal,
    closeAll,
    
    // Specific modal actions
    openNewMedico,
    closeNewMedico,
    openDeleteConfirm,
    closeDeleteConfirm,
    openAddProdotto,
    closeAddProdotto,
    openImportProdotti,
    closeImportProdotti,
    openImportConfirm,
    closeImportConfirm,
    openAddEccezione,
    closeAddEccezione,
    
    // Utilities
    isAnyModalOpen,
    activeModalCount,
    isModalOpen
  };
}