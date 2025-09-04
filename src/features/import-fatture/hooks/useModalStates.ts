import { useState } from 'react';

interface ModalStates {
  showImportDialog: boolean;
  showMappingModal: boolean;
  showImportSummary: boolean;
  showSyncSummary: boolean;
  showAddProdottiModal: { fatturaId: number; prestazione: string } | null;
  showAddMacchinarioModal: { fatturaId: number; prestazione: string } | null;
  showCorreggiCodiceModal: { fatturaId: number; voceId: number; codiceAttuale: string } | null;
}

interface UseModalStatesReturn extends ModalStates {
  // Toggle functions
  toggleImportDialog: () => void;
  toggleMappingModal: () => void;
  toggleImportSummary: () => void;
  toggleSyncSummary: () => void;
  
  // Set functions
  setShowImportDialog: (show: boolean) => void;
  setShowMappingModal: (show: boolean) => void;
  setShowImportSummary: (show: boolean) => void;
  setShowSyncSummary: (show: boolean) => void;
  setShowAddProdottiModal: (data: { fatturaId: number; prestazione: string } | null) => void;
  setShowAddMacchinarioModal: (data: { fatturaId: number; prestazione: string } | null) => void;
  setShowCorreggiCodiceModal: (data: { fatturaId: number; voceId: number; codiceAttuale: string } | null) => void;
  
  // Close all modals
  closeAllModals: () => void;
}

export function useModalStates(): UseModalStatesReturn {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [showImportSummary, setShowImportSummary] = useState(false);
  const [showSyncSummary, setShowSyncSummary] = useState(false);
  const [showAddProdottiModal, setShowAddProdottiModal] = useState<{ fatturaId: number; prestazione: string } | null>(null);
  const [showAddMacchinarioModal, setShowAddMacchinarioModal] = useState<{ fatturaId: number; prestazione: string } | null>(null);
  const [showCorreggiCodiceModal, setShowCorreggiCodiceModal] = useState<{ fatturaId: number; voceId: number; codiceAttuale: string } | null>(null);

  // Toggle functions
  const toggleImportDialog = () => setShowImportDialog(!showImportDialog);
  const toggleMappingModal = () => setShowMappingModal(!showMappingModal);
  const toggleImportSummary = () => setShowImportSummary(!showImportSummary);
  const toggleSyncSummary = () => setShowSyncSummary(!showSyncSummary);

  // Close all modals
  const closeAllModals = () => {
    setShowImportDialog(false);
    setShowMappingModal(false);
    setShowImportSummary(false);
    setShowSyncSummary(false);
    setShowAddProdottiModal(null);
    setShowAddMacchinarioModal(null);
    setShowCorreggiCodiceModal(null);
  };

  return {
    // States
    showImportDialog,
    showMappingModal,
    showImportSummary,
    showSyncSummary,
    showAddProdottiModal,
    showAddMacchinarioModal,
    showCorreggiCodiceModal,
    
    // Toggle functions
    toggleImportDialog,
    toggleMappingModal,
    toggleImportSummary,
    toggleSyncSummary,
    
    // Set functions
    setShowImportDialog,
    setShowMappingModal,
    setShowImportSummary,
    setShowSyncSummary,
    setShowAddProdottiModal,
    setShowAddMacchinarioModal,
    setShowCorreggiCodiceModal,
    
    // Close all
    closeAllModals
  };
}