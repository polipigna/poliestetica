import { useState, useCallback, useMemo } from 'react';

export type TabName = 'anagrafica' | 'regole' | 'eccezioni' | 'simulatore';

export interface Tab {
  name: TabName;
  label: string;
  requiresAdmin?: boolean;
  icon?: string;
}

interface UseTabManagerProps {
  hasUnsavedChanges?: boolean;
  isAdmin?: boolean;
  initialTab?: TabName;
}

interface UseTabManagerReturn {
  // State
  activeTab: TabName;
  availableTabs: Tab[];
  
  // Actions
  switchTab: (tab: TabName) => void;
  switchTabWithConfirm: (tab: TabName) => void;
  forceTabSwitch: (tab: TabName) => void;
  
  // Utilities
  canSwitchTab: (tab: TabName) => boolean;
  isTabActive: (tab: TabName) => boolean;
  isTabAvailable: (tab: TabName) => boolean;
  getTabLabel: (tab: TabName) => string;
  
  // Navigation
  goToNextTab: () => void;
  goToPreviousTab: () => void;
  goToFirstTab: () => void;
  
  // Guards
  hasUnsavedChangesWarning: boolean;
}

// Definizione di tutti i tab disponibili
const ALL_TABS: Tab[] = [
  { name: 'anagrafica', label: 'Anagrafica' },
  { name: 'regole', label: 'Regole & Prodotti' },
  { name: 'eccezioni', label: 'Eccezioni' },
  { name: 'simulatore', label: 'Simulatore', requiresAdmin: true }
];

/**
 * Hook per la gestione della navigazione tra tab
 * Include guard per unsaved changes e controllo permessi
 */
export function useTabManager({
  hasUnsavedChanges = false,
  isAdmin = false,
  initialTab = 'anagrafica'
}: UseTabManagerProps = {}): UseTabManagerReturn {
  
  const [activeTab, setActiveTab] = useState<TabName>(initialTab);
  const [hasUnsavedChangesWarning, setHasUnsavedChangesWarning] = useState(false);
  
  // Tabs disponibili in base ai permessi
  const availableTabs = useMemo(() => {
    return ALL_TABS.filter(tab => {
      // Se il tab richiede admin e l'utente non è admin, escludi
      if (tab.requiresAdmin && !isAdmin) {
        return false;
      }
      return true;
    });
  }, [isAdmin]);
  
  // Check if tab is available
  const isTabAvailable = useCallback((tab: TabName): boolean => {
    return availableTabs.some(t => t.name === tab);
  }, [availableTabs]);
  
  // Check if can switch to tab
  const canSwitchTab = useCallback((tab: TabName): boolean => {
    // Non può switchare se il tab non è disponibile
    if (!isTabAvailable(tab)) {
      return false;
    }
    
    // Non può switchare se è già sul tab corrente
    if (tab === activeTab) {
      return false;
    }
    
    // Se ci sono modifiche non salvate, mostra warning ma permetti switch
    // (la logica di conferma è gestita da switchTabWithConfirm)
    return true;
  }, [activeTab, isTabAvailable]);
  
  // Force tab switch (ignora unsaved changes)
  const forceTabSwitch = useCallback((tab: TabName) => {
    if (isTabAvailable(tab)) {
      setActiveTab(tab);
      setHasUnsavedChangesWarning(false);
    }
  }, [isTabAvailable]);
  
  // Switch tab normale (considera unsaved changes)
  const switchTab = useCallback((tab: TabName) => {
    if (!canSwitchTab(tab)) {
      return;
    }
    
    // Se ci sono modifiche non salvate, mostra warning
    if (hasUnsavedChanges) {
      setHasUnsavedChangesWarning(true);
      // Non switcha automaticamente, aspetta conferma
      return;
    }
    
    // Altrimenti switcha direttamente
    forceTabSwitch(tab);
  }, [canSwitchTab, hasUnsavedChanges, forceTabSwitch]);
  
  // Switch tab con conferma (per unsaved changes)
  const switchTabWithConfirm = useCallback((tab: TabName) => {
    if (!canSwitchTab(tab)) {
      return;
    }
    
    // Se ci sono modifiche non salvate, chiedi conferma
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'Hai modifiche non salvate. Sei sicuro di voler cambiare tab? Le modifiche andranno perse.'
      );
      
      if (confirmed) {
        forceTabSwitch(tab);
      }
    } else {
      forceTabSwitch(tab);
    }
  }, [canSwitchTab, hasUnsavedChanges, forceTabSwitch]);
  
  // Check if tab is active
  const isTabActive = useCallback((tab: TabName): boolean => {
    return activeTab === tab;
  }, [activeTab]);
  
  // Get tab label
  const getTabLabel = useCallback((tab: TabName): string => {
    const tabConfig = ALL_TABS.find(t => t.name === tab);
    return tabConfig?.label || tab;
  }, []);
  
  // Navigation helpers
  const goToNextTab = useCallback(() => {
    const currentIndex = availableTabs.findIndex(t => t.name === activeTab);
    if (currentIndex < availableTabs.length - 1) {
      const nextTab = availableTabs[currentIndex + 1];
      switchTabWithConfirm(nextTab.name);
    }
  }, [activeTab, availableTabs, switchTabWithConfirm]);
  
  const goToPreviousTab = useCallback(() => {
    const currentIndex = availableTabs.findIndex(t => t.name === activeTab);
    if (currentIndex > 0) {
      const prevTab = availableTabs[currentIndex - 1];
      switchTabWithConfirm(prevTab.name);
    }
  }, [activeTab, availableTabs, switchTabWithConfirm]);
  
  const goToFirstTab = useCallback(() => {
    if (availableTabs.length > 0) {
      switchTabWithConfirm(availableTabs[0].name);
    }
  }, [availableTabs, switchTabWithConfirm]);
  
  return {
    // State
    activeTab,
    availableTabs,
    
    // Actions
    switchTab,
    switchTabWithConfirm,
    forceTabSwitch,
    
    // Utilities
    canSwitchTab,
    isTabActive,
    isTabAvailable,
    getTabLabel,
    
    // Navigation
    goToNextTab,
    goToPreviousTab,
    goToFirstTab,
    
    // Guards
    hasUnsavedChangesWarning
  };
}