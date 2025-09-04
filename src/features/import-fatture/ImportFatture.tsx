import React, { useState, useEffect, useMemo } from 'react';
import { 
  RefreshCw,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Plus,
  Package,
  AlertTriangle,
  UserX,
  Info,
  Calendar,
  FileSpreadsheet
} from 'lucide-react';
import type { Medico, Prestazione, Prodotto, VoceFattura, Macchinario } from '@/data/mock';
import { 
  parseCodiceFattura, 
  getProdottiValidiPerPrestazione,
  combinazioni,
  macchinari
} from '@/data/mock';

// Import delle utility functions
import {
  // Formatters
  formatCurrency,
  excelToNumber
} from './utils';

// Import dei services
import {
  type FatturaConVoci,
  type FieldMapping,
  type TipoAnomalia,
  ExportService,
  ImportService,
  FattureProcessor,
  AnomalieCalculator
} from './services';

// Import degli hooks
import { useAnomalie } from './hooks/useAnomalie';
import { useVociManagement } from './hooks/useVociManagement';
import { useProdottiMacchinari } from './hooks/useProdottiMacchinari';
import { useExpanded } from './hooks/useExpanded';
import { useFattureFilter } from './hooks/useFattureFilter';
import { useFileUpload } from './hooks/useFileUpload';
import { useImportSummary } from './hooks/useImportSummary';
import { useModalStates } from './hooks/useModalStates';
import { usePagination } from './hooks/usePagination';
import { useSelection } from './hooks/useSelection';
import { useStatistiche } from './hooks/useStatistiche';
import { useVistaRaggruppata } from './hooks/useVistaRaggruppata';

// Import dei componenti estratti
import StatisticheDashboard from './components/StatisticheDashboard';
import FiltriToolbar from './components/FiltriToolbar';
import FatturaRow from './components/FatturaRow';
import RiepilogoMensile from './components/RiepilogoMensile';

// Le interfacce sono ora importate dai services

// Props interface
interface ImportFattureProps {
  fatture: FatturaConVoci[];
  medici: Medico[];
  prestazioni: Prestazione[];
  prodotti: Prodotto[];
  isLoading?: boolean;
  onSync?: () => void;
  onImport?: (ids: number[]) => void;
  onUpdateFattura?: (id: number, updates: Partial<FatturaConVoci>) => void;
}

// Import Fatture Component
const ImportFatture: React.FC<ImportFattureProps> = ({ 
  fatture: fattureProps,
  medici,
  prestazioni,
  prodotti,
  isLoading = false,
  onSync,
  onImport,
  onUpdateFattura
}) => {
  // Crea una mappa delle prestazioni per accesso rapido
  const prestazioniMap = useMemo(() => {
    const map: Record<string, Prestazione> = {};
    prestazioni.forEach(p => {
      map[p.codice] = p;
    });
    return map;
  }, [prestazioni]);

  // Crea una mappa dei prodotti per accesso rapido
  const prodottiMap = useMemo(() => {
    const map: Record<string, Prodotto> = {};
    prodotti.forEach(p => {
      map[p.codice] = p;
    });
    return map;
  }, [prodotti]);

  // Usa l'hook useAnomalie per gestire le anomalie
  const anomalieHelper = useAnomalie(
    prestazioniMap,
    prodottiMap
  );
  const { 
    getAnomalieFattura, 
    ricalcolaAnomalieFattura,
    getUnitaCorretta,
    isUnitaCorregibile
  } = anomalieHelper;

  // Inizializza useVociManagement per il test incrementale
  const vociManagement = useVociManagement(prestazioniMap, prodottiMap);
  const { 
    quantitaTemp, 
    setQuantitaTemp,
    prezzoTempProdottoOrfano,
    setPrezzoTempProdottoOrfano 
  } = vociManagement;
  
  // Inizializza useProdottiMacchinari per gestire prodotti e macchinari mancanti
  const prodottiMacchinariManagement = useProdottiMacchinari(prestazioniMap, prodottiMap, macchinari);
  

  // Usa l'hook useExpanded per gestire lo stato delle fanontture espanse
  const { isExpanded: isFatturaExpanded, toggleExpanded } = useExpanded();


  // Usa le fatture dai props - inizializza con anomalie calcolate una sola volta
  const [fatture, setFatture] = useState<FatturaConVoci[]>(() => {
    // Calcola anomalie SOLO all'inizializzazione
    return fattureProps.map(fattura => ricalcolaAnomalieFattura(fattura));
  });

  // Usa l'hook useFattureFilter per gestire i filtri
  const {
    filtroStato,
    filtroDataDa,
    filtroDataA,
    filtroAnomalia,
    filtroMedico,
    filtroSerie,
    fattureFiltered,
    filtriAttivi,
    setFiltroStato,
    setFiltroDataDa,
    setFiltroDataA,
    setFiltroAnomalia,
    setFiltroMedico,
    setFiltroSerie,
    resetFiltri
  } = useFattureFilter(fatture, getAnomalieFattura);

  // Usa l'hook useSelection per gestire la selezione delle fatture
  const {
    selectedItems: selectedFatture,
    toggleSelection: toggleFatturaSelection,
    selectAll: selectAllFatture,
    deselectAll: deselectAllFatture
  } = useSelection();
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Usa l'hook useVistaRaggruppata per gestire la vista raggruppata
  const {
    vistaRaggruppata,
    toggleVistaRaggruppata,
    fattureRaggruppatePerMedico,
    medicoKeys
  } = useVistaRaggruppata(fattureFiltered);
  
  // Hook per la gestione degli stati dei modal
  const modalStates = useModalStates();
  
  // Usa l'hook useFileUpload per gestire l'importazione file
  const {
    uploadedFile,
    fileData,
    fileColumns,
    fieldMapping,
    dataFiltro,
    handleFileUpload,
    processImportedData: processImportedDataHook,
    resetFileUpload,
    setFieldMapping,
    setDataFiltro,
    fileInputRef
  } = useFileUpload({ prestazioniMap, prodottiMap });
  
  // Usa l'hook useImportSummary per gestire i riepiloghi
  const {
    importSummary,
    syncSummary,
    createImportSummary,
    createSyncSummary
  } = useImportSummary();
  
  
  // Gestisci la conferma del mapping
  const handleMappingConfirm = () => {
    processImportedDataHook((nuoveFatture) => {
      // Aggiungi le nuove fatture con anomalie calcolate
      const nuoveFattureConAnomalie = nuoveFatture.map(f => ricalcolaAnomalieFattura(f));
      setFatture([...fatture, ...nuoveFattureConAnomalie]);
    });
    modalStates.setShowMappingModal(false);
  };
  
  // Gestisci l'upload del file
  const handleFileUploadWrapper = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(event);
    modalStates.setShowImportDialog(false);
    modalStates.setShowMappingModal(true);
  };

  // Mock stati
  const lastSync = '15 minuti fa';

  
  



  // Usa l'hook useStatistiche per calcolare statistiche e riepiloghi
  const { statiCount, riepilogoMensile } = useStatistiche(fatture);



  // Gestione selezione
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      selectAllFatture(fattureFiltered.filter(f => f.stato !== 'importata').map(f => f.id));
    } else {
      deselectAllFatture();
    }
  };



  // Assegna medico singolo (per anomalia)
  const handleAssegnaMedicoSingolo = (fatturaId: number, medicoId: number, medicoNome: string) => {
    setFatture(fatture.map(f => {
      if (f.id === fatturaId) {
        // Usa FattureProcessor per assegnare il medico e ricalcolare
        const updatedFattura = FattureProcessor.assegnaMedicoAFattura(
          f,
          medicoId,
          medicoNome,
          prestazioniMap,
          prodottiMap
        );
        
        if (onUpdateFattura) {
          onUpdateFattura(fatturaId, updatedFattura);
        }
        
        return updatedFattura;
      }
      return f;
    }));
  };

  // Azioni risoluzione anomalie
  const handleImpostaPrezzoZero = (fatturaId: number, voceId: number) => {
    const nuoveFatture = vociManagement.handleImpostaPrezzoZero(fatture, fatturaId, voceId);
    setFatture(nuoveFatture);
  };

  const handleEliminaVoce = (fatturaId: number, voceId: number) => {
    const nuoveFatture = vociManagement.handleEliminaVoce(fatture, fatturaId, voceId);
    setFatture(nuoveFatture);
  };

  const handleAggiornaPrezzoEAssociaPrestazione = (fatturaId: number, voceId: number, nuovoPrezzo: number, codicePrestazione: string) => {
    const nuoveFatture = vociManagement.handleAssociaPrestazione(fatture, fatturaId, voceId, codicePrestazione, nuovoPrezzo);
    setFatture(nuoveFatture);
    
    if (onUpdateFattura) {
      const fatturaModificata = nuoveFatture.find(f => f.id === fatturaId);
      if (fatturaModificata) {
        onUpdateFattura(fatturaId, fatturaModificata);
      }
    }
    
    // Pulisci il prezzo temporaneo
    setPrezzoTempProdottoOrfano(prev => {
      const newState = { ...prev };
      delete newState[`prezzo-${fatturaId}-${voceId}`];
      return newState;
    });
  };

  const handleAssociaPrestazione = (fatturaId: number, voceId: number, codicePrestazione: string) => {
    const nuoveFatture = vociManagement.handleAssociaPrestazione(fatture, fatturaId, voceId, codicePrestazione);
    setFatture(nuoveFatture);
    
    if (onUpdateFattura) {
      const fatturaModificata = nuoveFatture.find(f => f.id === fatturaId);
      if (fatturaModificata) {
        onUpdateFattura(fatturaId, fatturaModificata);
      }
    }
  };

  const handleAggiungiProdottiMancanti = (fatturaId: number, prestazione: string) => {
    modalStates.setShowAddProdottiModal({ fatturaId, prestazione });
  };

  const handleAggiungiMacchinarioMancante = (fatturaId: number, prestazione: string) => {
    modalStates.setShowAddMacchinarioModal({ fatturaId, prestazione });
  };

  // Handler per conferma prestazione macchinario completa
  const handleConfermaPrestazioneMacchinarioCompleta = (fatturaId: number, prestazione: string) => {
    const nuoveFatture = vociManagement.handleConfermaPrestazioneMacchinarioCompleta(fatture, fatturaId, prestazione);
    setFatture(nuoveFatture);
    
    if (onUpdateFattura) {
      const fatturaModificata = nuoveFatture.find(f => f.id === fatturaId);
      if (fatturaModificata) {
        onUpdateFattura(fatturaId, fatturaModificata);
      }
    }
  };

  // Handler per conferma prestazione completa
  const handleConfermaPrestazioneCompleta = (fatturaId: number, prestazione: string) => {
    const nuoveFatture = vociManagement.handleConfermaPrestazioneCompleta(fatture, fatturaId, prestazione);
    setFatture(nuoveFatture);
    
    if (onUpdateFattura) {
      const fatturaModificata = nuoveFatture.find(f => f.id === fatturaId);
      if (fatturaModificata) {
        onUpdateFattura(fatturaId, fatturaModificata);
      }
    }
  };

  const confermaAggiungiProdotti = (prodottiSelezionati: { codice: string; quantita: number }[]) => {
    if (!modalStates.showAddProdottiModal) return;

    const { fatturaId, prestazione } = modalStates.showAddProdottiModal;

    // Usa il nuovo hook per aggiungere prodotti
    const nuoveFatture = prodottiMacchinariManagement.handleAggiungiProdotti(
      fatture,
      fatturaId,
      prestazione,
      prodottiSelezionati
    );
    
    setFatture(nuoveFatture);
    modalStates.setShowAddProdottiModal(null);
  };

  const confermaAggiungiMacchinario = (macchinarioSelezionato: string) => {
    if (!modalStates.showAddMacchinarioModal) return;
    
    const { fatturaId, prestazione } = modalStates.showAddMacchinarioModal;
    
    // Usa il nuovo hook per aggiungere macchinario
    const nuoveFatture = prodottiMacchinariManagement.handleAggiungiMacchinario(
      fatture,
      fatturaId,
      prestazione,
      macchinarioSelezionato
    );
    
    setFatture(nuoveFatture);
    modalStates.setShowAddMacchinarioModal(null);
  };

  // Handler per correggere unità di misura
  const handleCorreggiUnita = (fatturaId: number, voceId: number, unitaCorretta: string) => {
    const nuoveFatture = vociManagement.handleCorreggiUnita(fatture, fatturaId, voceId, unitaCorretta);
    setFatture(nuoveFatture);
    
    if (onUpdateFattura) {
      const fatturaModificata = nuoveFatture.find(f => f.id === fatturaId);
      if (fatturaModificata) {
        onUpdateFattura(fatturaId, fatturaModificata);
      }
    }
  };

  // Handler per correggere quantità
  const handleCorreggiQuantita = (fatturaId: number, voceId: number, nuovaQuantita: number) => {
    const nuoveFatture = vociManagement.handleCorreggiQuantita(fatture, fatturaId, voceId, nuovaQuantita);
    setFatture(nuoveFatture);
    
    if (onUpdateFattura) {
      const fatturaModificata = nuoveFatture.find(f => f.id === fatturaId);
      if (fatturaModificata) {
        onUpdateFattura(fatturaId, fatturaModificata);
      }
    }
    
    // Pulisci il valore temporaneo dopo l'uso
    const key = `${fatturaId}-${voceId}`;
    setQuantitaTemp(prev => {
      const newTemp = { ...prev };
      delete newTemp[key];
      return newTemp;
    });
  };


  // Handler per correggere codice
  const handleCorreggiCodice = (fatturaId: number, voceId: number, nuovoCodice: string, nuovoPrezzo?: number, nuovaQuantita?: number) => {
    const nuoveFatture = vociManagement.handleCorreggiCodice(fatture, fatturaId, voceId, nuovoCodice, nuovoPrezzo, nuovaQuantita);
    setFatture(nuoveFatture);
    
    if (onUpdateFattura) {
      const fatturaModificata = nuoveFatture.find(f => f.id === fatturaId);
      if (fatturaModificata) {
        onUpdateFattura(fatturaId, fatturaModificata);
      }
    }
    

    modalStates.setShowCorreggiCodiceModal(null);
  };


  // Sync con Fatture in Cloud
  const handleSync = async () => {
    setIsSyncing(true);
    
    // Simula sync
    setTimeout(() => {
      if (onSync) {
        onSync();
      }
      
      createSyncSummary(15, 3, 18);
      modalStates.setShowSyncSummary(true);
      setIsSyncing(false);
    }, 2000);
  };

  // Import selezionate
  const handleImport = async () => {
    if (selectedFatture.length === 0) return;
    
    setIsImporting(true);
    
    try {
      // Usa ImportService per gestire l'import
      const result = await ImportService.importaFattureSelezionate(
        fatture,
        selectedFatture,
        { verificaAnomalie: true }
      );
      
      // Gestisci warnings se presenti
      if (result.warnings.length > 0) {
        const warning = result.warnings[0];
        if (warning.tipo === 'nessuna_selezione') {
          alert(warning.message);
          return;
        }
        
        if (warning.tipo === 'non_importabile') {
          if (result.summary.importate === 0) {
            alert('Nessuna fattura selezionata può essere importata. Verificare medico assegnato e anomalie.');
            return;
          }
          
          if (!confirm(`${warning.message}. Importare solo le ${result.summary.importate} valide?`)) {
            return;
          }
        }
      }
      
      // Aggiorna stato
      setFatture(result.fattureAggiornate);
      
      // Crea summary (rimuovi riferimento ad "aggiornate")
      createImportSummary(
        result.summary.importate,
        result.summary.nuove,
        0  // Non tracciamo più le "aggiornate"
      );
      
      modalStates.setShowImportSummary(true);
      deselectAllFatture();
      
      // Callback opzionale con gli ID importati
      if (onImport) {
        onImport(result.summary.idImportati);
      }
      
    } finally {
      setIsImporting(false);
    }
  };

  // UI Adapter per le anomalie
  type UIConfig = {
    label: string;
    iconName: 'AlertCircle' | 'X' | 'Package' | 'AlertTriangle' | 'RefreshCw' | 'UserX';
    colorToken: 'danger' | 'warning' | 'info' | 'secondary';
  };

  const getAnomaliaUI = (tipo: TipoAnomalia): UIConfig => {
    const uiMap: Record<TipoAnomalia, UIConfig> = {
      'codice_sconosciuto': { 
        label: 'Codice non valido', 
        iconName: 'X', 
        colorToken: 'danger' 
      },
      'medico_mancante': { 
        label: 'Medico mancante', 
        iconName: 'UserX', 
        colorToken: 'danger' 
      },
      'prestazione_incompleta': { 
        label: 'Prodotti mancanti', 
        iconName: 'Package', 
        colorToken: 'warning' 
      },
      'prestazione_senza_macchinario': { 
        label: 'Macchinario mancante', 
        iconName: 'AlertTriangle', 
        colorToken: 'warning' 
      },
      'unita_incompatibile': { 
        label: 'Unità incompatibile', 
        iconName: 'AlertTriangle', 
        colorToken: 'info' 
      },
      'prodotto_con_prezzo': { 
        label: 'Prodotto con prezzo', 
        iconName: 'AlertTriangle', 
        colorToken: 'warning' 
      },
      'prodotto_orfano': { 
        label: 'Prodotto senza prestazione', 
        iconName: 'AlertTriangle', 
        colorToken: 'danger' 
      },
      'quantita_anomala': { 
        label: 'Quantità anomala', 
        iconName: 'AlertCircle', 
        colorToken: 'warning' 
      },
      'prestazione_duplicata': { 
        label: 'Prestazione duplicata', 
        iconName: 'RefreshCw', 
        colorToken: 'warning' 
      }
    };
    
    return uiMap[tipo];
  };

  const getColorClasses = (colorToken: string) => {
    // Manteniamo i colori specifici attuali
    const colorMap: Record<string, string> = {
      'danger': 'text-red-700',
      'warning': 'text-amber-600', 
      'info': 'text-indigo-600',
      'secondary': 'text-gray-600'
    };
    return colorMap[colorToken] || colorMap.secondary;
  };

  // Map specifico per i colori originali delle anomalie (per mantenere compatibilità)
  const getSpecificColorForAnomalia = (tipo: TipoAnomalia): string => {
    const colorMap: Record<TipoAnomalia, string> = {
      'codice_sconosciuto': 'text-red-700',
      'medico_mancante': 'text-red-600',
      'prestazione_incompleta': 'text-orange-600',
      'prestazione_senza_macchinario': 'text-yellow-600',
      'unita_incompatibile': 'text-indigo-600',
      'prodotto_con_prezzo': 'text-amber-600',
      'prodotto_orfano': 'text-purple-600',
      'quantita_anomala': 'text-pink-600',
      'prestazione_duplicata': 'text-blue-600'
    };
    return colorMap[tipo];
  };

  // Renderizza anomalie - mostra solo la principale con contatore (o tutte se showAll = true)
  const renderAnomalie = (anomalie: string[], fatturaId?: number, showAll: boolean = false) => {
    // Usa il service per ordinare (business logic)
    const anomalieOrdinate = AnomalieCalculator.getAnomalieOrdinate(anomalie);

    if (anomalieOrdinate.length === 0) return null;

    // Map icone string -> React components
    const iconComponents = {
      'AlertCircle': AlertCircle,
      'X': X,
      'Package': Package,
      'AlertTriangle': AlertTriangle,
      'RefreshCw': RefreshCw,
      'UserX': UserX
    };

    // Render badge per singola anomalia
    const renderBadge = (tipo: TipoAnomalia) => {
      const uiConfig = getAnomaliaUI(tipo);
      const Icon = iconComponents[uiConfig.iconName];
      const color = getSpecificColorForAnomalia(tipo); // Usa i colori specifici originali
      
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 ${color} whitespace-nowrap`}>
          <Icon className="w-3 h-3" />
          {uiConfig.label}
        </span>
      );
    };

    // Se showAll è true, mostra tutte le anomalie
    if (showAll) {
      return (
        <div className="flex flex-wrap gap-1">
          {anomalieOrdinate.map((anomalia, idx) => (
            <React.Fragment key={idx}>
              {renderBadge(anomalia)}
            </React.Fragment>
          ))}
        </div>
      );
    }

    // Altrimenti mostra solo la principale con contatore
    const anomaliaPrincipale = anomalieOrdinate[0];
    const numeroAltre = anomalieOrdinate.length - 1;

    return (
      <div className="flex items-center gap-2">
        {renderBadge(anomaliaPrincipale)}
        {numeroAltre > 0 && (
          <span className="px-1.5 py-0.5 text-xs font-bold text-gray-600 bg-gray-200 rounded-full"
                title={anomalieOrdinate.slice(1).map(a => getAnomaliaUI(a).label).join(', ')}>
            +{numeroAltre}
          </span>
        )}
      </div>
    );
  };


  // Hook per la paginazione
  const {
    currentPage,
    itemsPerPage,
    totalPages,
    paginatedItems: paginatedFatture,
    startIndex,
    itemsShowingFrom,
    itemsShowingTo,
    setCurrentPage,
    nextPage,
    prevPage,
    goToPage,
    getPageNumbers
  } = usePagination(fattureFiltered, 10);
  
  // Reset della pagina quando cambiano i filtri o la vista
  useEffect(() => {
    setCurrentPage(1);
  }, [filtroStato, filtroAnomalia, filtroMedico, filtroSerie, filtroDataDa, filtroDataA, vistaRaggruppata]);


  // Export functions
  const handleExportXLSX = () => {
    ExportService.exportVociToExcel(fattureFiltered);
  };

  // Funzione non utilizzata - commentata
  // const handleExportDettaglio = () => {
  //   const allRows: any[] = [];
  //   
  //   fatture.forEach(fattura => {
  //     // Riga fattura
  //     allRows.push({
  //       tipo: 'fattura',
  //       numero: fattura.numero,
  //       data: fattura.data,
  //       paziente: fattura.paziente,
  //       medico: fattura.medicoNome || '',
  //       descrizione: '',
  //       quantita: '',
  //       unita: '',
  //       importoNetto: fattura.imponibile,
  //       importoIva: fattura.iva,
  //       importoLordo: fattura.totale,
  //       stato: fattura.stato
  //     });
  //     
  //     // Righe voci
  //     if (fattura.voci) {
  //       fattura.voci.forEach((voce: any) => {
  //         allRows.push({
  //           tipo: 'voce',
  //           numero: fattura.numero,
  //           data: fattura.data,
  //           paziente: '',
  //           medico: '',
  //           descrizione: voce.descrizione,
  //           quantita: voce.quantita || '',
  //           unita: voce.unita || '',
  //           importoNetto: voce.importoNetto || 0,
  //           importoIva: 0,
  //           importoLordo: voce.importoNetto * 1.22,
  //           stato: voce.anomalie?.length > 0 ? 'anomalia' : ''
  //         });
  //       });
  //     }
  //   });
  //   
  //   console.log('Exporting detailed:', allRows);
  // };

  // Render stato badge - Definita prima dell'uso
  const renderStatoBadge = (stato: string) => {
    const stateConfig: Record<string, { color: string; label: string }> = {
      'da_importare': { color: 'bg-gray-100 text-gray-800', label: 'Da importare' },
      'anomalia': { color: 'bg-red-100 text-red-800', label: 'Anomalia' },
      'importata': { color: 'bg-blue-100 text-blue-800', label: 'Importata' }
    };

    const config = stateConfig[stato] || stateConfig['da_importare'];

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Render table rows
  const renderTableRows = () => {
    if (vistaRaggruppata) {
      // startIndex è già fornito dall'hook usePagination
      let currentIndex = 0;
      const rowsToRender: React.ReactNode[] = [];
      
      for (const medicoNome of medicoKeys) {
        const fattureGruppo = fattureRaggruppatePerMedico.get(medicoNome) || [];
        const gruppoTotale = fattureGruppo.length;
        
        // Header del gruppo sempre visibile se almeno una fattura del gruppo è nella pagina corrente
        if (currentIndex + gruppoTotale > startIndex && currentIndex < startIndex + itemsPerPage) {
          rowsToRender.push(
            <tr key={`header-${medicoNome}`} className="bg-gray-50">
              <td colSpan={10} className="px-6 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-gray-900">
                      {medicoNome}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">
                      ({gruppoTotale} fatture totali)
                    </span>
                  </div>
                  {medicoNome === 'Non assegnato' && (
                    <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                      Richiede assegnazione
                    </span>
                  )}
                </div>
              </td>
            </tr>
          );
          
          // Aggiungi solo le fatture che rientrano nella pagina corrente
          fattureGruppo.forEach((fattura: FatturaConVoci, index: number) => {
            const fatturaIndex = currentIndex + index;
            if (fatturaIndex >= startIndex && fatturaIndex < startIndex + itemsPerPage) {
              rowsToRender.push(renderFatturaRow(fattura, true));
            }
          });
        }
        
        currentIndex += gruppoTotale;
      }
      
      return rowsToRender;
    }
    
    return paginatedFatture.map(fattura => renderFatturaRow(fattura));
  };

  // Render dettagli voci
  const renderVociDettagli = (fattura: FatturaConVoci) => {
    if (!fattura.voci || fattura.voci.length === 0) return null;

    return (
      <tr>
        <td colSpan={12} className="px-6 py-4 bg-gray-50">
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-900">Dettaglio voci fattura</h4>
            <div className="space-y-2">
              {fattura.voci.map(voce => {
                const anomalieVoce = voce.anomalie || [];
                const parsed = parseCodiceFattura(voce.codice);
                
                return (
                  <div key={voce.id} className={`p-3 rounded-lg border ${anomalieVoce.length > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">[{voce.codice}]</span>
                          <span className="text-sm text-gray-700">{voce.descrizione}</span>
                          {voce.tipo === 'prodotto' && (
                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Prodotto</span>
                          )}
                          {voce.tipo === 'macchinario' && (
                            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">Macchinario</span>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          Quantità: {voce.quantita} {voce.unita} • 
                          Importo: {formatCurrency(voce.importoNetto)}
                        </div>
                        {anomalieVoce.length > 0 && (
                          <div className="mt-2">
                            {renderAnomalie(anomalieVoce, undefined, true)}
                            <div className="mt-2 flex gap-2">
                              {anomalieVoce.includes('prodotto_con_prezzo') && (
                                <button
                                  onClick={() => handleImpostaPrezzoZero(fattura.id, voce.id)}
                                  className="px-2 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700"
                                >
                                  Imposta a €0
                                </button>
                              )}
                              {anomalieVoce.includes('prodotto_orfano') && (() => {
                                // Trova automaticamente la prestazione dal codice
                                const parsedCode = parseCodiceFattura(voce.codice);
                                let prestazioneSuggerita = '';
                                
                                if (parsedCode.prestazione) {
                                  prestazioneSuggerita = parsedCode.prestazione;
                                } else {
                                  // Prova a estrarre il codice prestazione dai primi 3-4 caratteri
                                  const possiblePrestazione = voce.codice.substring(0, 3);
                                  if (prestazioniMap[possiblePrestazione]) {
                                    prestazioneSuggerita = possiblePrestazione;
                                  } else {
                                    const possiblePrestazione2 = voce.codice.substring(0, 4);
                                    if (prestazioniMap[possiblePrestazione2]) {
                                      prestazioneSuggerita = possiblePrestazione2;
                                    }
                                  }
                                }
                                
                                if (prestazioneSuggerita) {
                                  const prezzoKey = `prezzo-${fattura.id}-${voce.id}`;
                                  const prezzoTemp = prezzoTempProdottoOrfano[prezzoKey] ?? voce.importoNetto;
                                  
                                  return (
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs text-gray-600">
                                        Associa a: <strong>{prestazioneSuggerita}</strong>
                                      </span>
                                      <span className="text-xs text-gray-600">
                                        Prezzo:
                                      </span>
                                      <input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={prezzoTemp}
                                        onChange={(e) => {
                                          const nuovoPrezzo = excelToNumber(e.target.value);
                                          setPrezzoTempProdottoOrfano(prev => ({
                                            ...prev,
                                            [prezzoKey]: nuovoPrezzo
                                          }));
                                        }}
                                        className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                                        placeholder="0.00"
                                      />
                                      <span className="text-xs text-gray-600">€</span>
                                      <button
                                        onClick={() => {
                                          console.log('Correggi prodotto orfano:', { 
                                            fatturaId: fattura.id, 
                                            voceId: voce.id, 
                                            prestazione: prestazioneSuggerita,
                                            prezzo: prezzoTemp
                                          });
                                          // Se il prezzo è > 0, usa sempre handleAggiornaPrezzoEAssociaPrestazione
                                          if (prezzoTemp > 0) {
                                            handleAggiornaPrezzoEAssociaPrestazione(fattura.id, voce.id, prezzoTemp, prestazioneSuggerita);
                                          } else {
                                            handleAssociaPrestazione(fattura.id, voce.id, prestazioneSuggerita);
                                          }
                                        }}
                                        disabled={prezzoTemp <= 0}
                                        className={`px-2 py-1 text-xs rounded ${
                                          prezzoTemp > 0 
                                            ? 'bg-purple-600 text-white hover:bg-purple-700' 
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        }`}
                                      >
                                        Correggi
                                      </button>
                                    </div>
                                  );
                                } else {
                                  // Se non trova automaticamente, mostra il select
                                  return (
                                    <div className="flex items-center gap-2">
                                      <select
                                        className="text-xs border border-gray-300 rounded px-2 py-1"
                                        id={`prestazione-select-${fattura.id}-${voce.id}`}
                                      >
                                        <option value="">Seleziona prestazione</option>
                                        {prestazioni.map(p => (
                                          <option key={p.codice} value={p.codice}>
                                            {p.codice} - {p.descrizione}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        onClick={() => {
                                          const selectElement = document.getElementById(`prestazione-select-${fattura.id}-${voce.id}`) as HTMLSelectElement;
                                          const codicePrestazione = selectElement?.value;
                                          if (codicePrestazione) {
                                            handleAssociaPrestazione(fattura.id, voce.id, codicePrestazione);
                                          } else {
                                            alert('Seleziona una prestazione');
                                          }
                                        }}
                                        className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                                      >
                                        Associa
                                      </button>
                                    </div>
                                  );
                                }
                              })()}
                              {anomalieVoce.includes('prestazione_duplicata') && (voce.tipo === 'prestazione' || voce.tipo === 'macchinario') && (
                                <button
                                  onClick={() => handleEliminaVoce(fattura.id, voce.id)}
                                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                  <X className="w-3 h-3 inline mr-1" />
                                  Cancella
                                </button>
                              )}
                              {anomalieVoce.includes('unita_incompatibile') && (() => {
                                const unitaCorretta = getUnitaCorretta(voce);
                                const isCorregibile = isUnitaCorregibile(voce);
                                
                                return (
                                  <button
                                    onClick={() => {
                                      if (unitaCorretta) {
                                        handleCorreggiUnita(fattura.id, voce.id, unitaCorretta);
                                      }
                                    }}
                                    disabled={!isCorregibile}
                                    className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Correggi a {unitaCorretta || 'unità'}
                                  </button>
                                );
                              })()}
                              {anomalieVoce.includes('quantita_anomala') && (
                                <div className="flex items-center gap-2 relative z-10">
                                  <span className="text-xs text-gray-600">
                                    Quantità attuale: {voce.quantita} (Soglia: {parsed.accessorio ? prodottiMap[parsed.accessorio]?.sogliaAnomalia : 'n/a'})
                                  </span>
                                  <input
                                    type="number"
                                    defaultValue={voce.quantita}
                                    onChange={(e) => {
                                      const key = `${fattura.id}-${voce.id}`;
                                      setQuantitaTemp(prev => ({
                                        ...prev,
                                        [key]: Math.round(excelToNumber(e.target.value)) || 0
                                      }));
                                    }}
                                    className="w-20 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-pink-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const key = `${fattura.id}-${voce.id}`;
                                      const nuovaQuantita = quantitaTemp[key] ?? voce.quantita;
                                      console.log('Click su Correggi:', { key, nuovaQuantita });
                                      handleCorreggiQuantita(fattura.id, voce.id, nuovaQuantita);
                                    }}
                                    className="px-3 py-1 text-xs bg-pink-600 text-white rounded hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer"
                                  >
                                    Correggi
                                  </button>
                                </div>
                              )}
                              {anomalieVoce.includes('codice_sconosciuto') && (
                                <button
                                  onClick={() => modalStates.setShowCorreggiCodiceModal({ fatturaId: fattura.id, voceId: voce.id, codiceAttuale: voce.codice })}
                                  className="px-2 py-1 text-xs bg-red-700 text-white rounded hover:bg-red-800"
                                >
                                  Correggi codice
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Verifica prestazioni incomplete */}
            {fattura.voci.filter(v => {
              const anomalie = v.anomalie || [];
              return anomalie.includes('prestazione_incompleta');
            }).map(voce => {
              // Controlla se ci sono già prodotti per questa prestazione
              const prodottiPresenti = (fattura.voci || []).filter(v => 
                v.tipo === 'prodotto' && 
                (v.prestazionePadre === voce.codice || 
                 (parseCodiceFattura(v.codice).isProdotto && parseCodiceFattura(v.codice).prestazione === voce.codice))
              );
              
              return (
                <div key={`inc-${voce.id}`} className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800">
                    La prestazione <strong>{voce.descrizione}</strong> richiede prodotti
                    {prodottiPresenti.length > 0 && (
                      <span className="text-orange-700"> (trovati {prodottiPresenti.length} prodotti)</span>
                    )}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleAggiungiProdottiMancanti(fattura.id, voce.codice)}
                      className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                    >
                      <Plus className="w-3 h-3 inline mr-1" />
                      Aggiungi prodotti
                    </button>
                    {prodottiPresenti.length > 0 && (
                      <button
                        onClick={() => handleConfermaPrestazioneCompleta(fattura.id, voce.codice)}
                        className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        <Check className="w-3 h-3 inline mr-1" />
                        Conferma
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Verifica prestazioni senza macchinario */}
            {fattura.voci.filter(v => {
              const anomalie = v.anomalie || [];
              return anomalie.includes('prestazione_senza_macchinario');
            }).map(voce => {
              // Controlla se ci sono già macchinari per questa prestazione
              const macchinariPresenti = (fattura.voci || []).filter(v => 
                v.codice.startsWith(voce.codice) && v.codice !== voce.codice
              );
              
              return (
                <div key={`mac-${voce.id}`} className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    La prestazione <strong>{voce.descrizione}</strong> richiede un macchinario
                    {macchinariPresenti.length > 0 && (
                      <span className="text-yellow-700"> (trovati {macchinariPresenti.length} macchinari)</span>
                    )}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleAggiungiMacchinarioMancante(fattura.id, voce.codice)}
                      className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                    >
                      <Plus className="w-3 h-3 inline mr-1" />
                      Aggiungi macchinario
                    </button>
                    {macchinariPresenti.length > 0 && (
                      <button
                        onClick={() => handleConfermaPrestazioneMacchinarioCompleta(fattura.id, voce.codice)}
                        className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        <Check className="w-3 h-3 inline mr-1" />
                        Conferma
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </td>
      </tr>
    );
  };

  // Render singola riga fattura
  const renderFatturaRow = (fattura: FatturaConVoci, indented = false) => {
    const anomalie = fattura.anomalie && fattura.anomalie.length > 0 
      ? fattura.anomalie 
      : getAnomalieFattura(fattura);
    const hasAnomalie = anomalie.length > 0;
    const isExpanded = isFatturaExpanded(fattura.id);
    const isSelected = selectedFatture.includes(fattura.id);
    
    if (fattura.stato === 'anomalia' && !hasAnomalie) {
      console.warn(`Fattura ${fattura.numero} ha stato 'anomalia' ma nessuna anomalia rilevata`);
    }
    
    return (
      <FatturaRow
        key={fattura.id}
        fattura={fattura}
        indented={indented}
        isExpanded={isExpanded}
        isSelected={isSelected}
        hasAnomalie={hasAnomalie}
        anomalie={anomalie}
        medici={medici}
        onToggleExpand={() => toggleExpanded(fattura.id)}
        onToggleSelect={() => toggleFatturaSelection(fattura.id)}
        onAssegnaMedico={handleAssegnaMedicoSingolo}
        renderStatoBadge={renderStatoBadge}
        renderAnomalie={renderAnomalie}
        renderVociDettagli={renderVociDettagli}
      />
    );
  };


  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#03A6A6] mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento fatture...</p>
        </div>
      </div>
    );
  }

  // Modal per aggiungere prodotti
  const ModalAggiungiProdotti: React.FC<{
    prestazione: string;
    prodottiDisponibili: Prodotto[];
    onConfirm: (prodotti: { codice: string; quantita: number }[]) => void;
    onCancel: () => void;
  }> = ({ prestazione, prodottiDisponibili, onConfirm, onCancel }) => {
    const [prodottiSelezionati, setProdottiSelezionati] = useState<{ codice: string; quantita: number }[]>([]);
    const [prodottiGiaPresenti, setProdottiGiaPresenti] = useState<string[]>([]);
    const [showDuplicateWarning, setShowDuplicateWarning] = useState<string | null>(null);
    
    // Trova i prodotti già presenti per questa prestazione
    useEffect(() => {
      if (!modalStates.showAddProdottiModal) return;
      
      const fattura = fatture.find(f => f.id === modalStates.showAddProdottiModal?.fatturaId);
      if (fattura && fattura.voci) {
        const prodottiEsistenti = fattura.voci
          .filter(v => v.prestazionePadre === prestazione && v.tipo === 'prodotto')
          .map(v => {
            const parsed = parseCodiceFattura(v.codice);
            return parsed.accessorio || '';
          })
          .filter(Boolean);
        setProdottiGiaPresenti(prodottiEsistenti);
      }
    }, [modalStates.showAddProdottiModal, fatture, prestazione]);

    const handleToggleProdotto = (codice: string) => {
      const exists = prodottiSelezionati.find(p => p.codice === codice);
      if (exists) {
        setProdottiSelezionati(prodottiSelezionati.filter(p => p.codice !== codice));
        setShowDuplicateWarning(null);
      } else {
        // Controlla se il prodotto è già presente
        if (prodottiGiaPresenti.includes(codice)) {
          setShowDuplicateWarning(codice);
        }
        setProdottiSelezionati([...prodottiSelezionati, { codice, quantita: 1 }]);
      }
    };

    const handleQuantitaChange = (codice: string, quantita: number) => {
      setProdottiSelezionati(prodottiSelezionati.map(p => 
        p.codice === codice ? { ...p, quantita } : p
      ));
    };

    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Aggiungi prodotti per la prestazione {prestazione}
          </h3>
          
          <div className="space-y-3">
            {prodottiDisponibili.map(prodotto => {
              const isSelected = prodottiSelezionati.some(p => p.codice === prodotto.codice);
              const selectedProdotto = prodottiSelezionati.find(p => p.codice === prodotto.codice);
              
              return (
                <div 
                  key={prodotto.codice}
                  className={`p-4 rounded-lg border ${isSelected ? 'border-[#03A6A6] bg-blue-50' : 'border-gray-200'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleProdotto(prodotto.codice)}
                        className="rounded border-gray-300 text-[#03A6A6] focus:ring-[#03A6A6]"
                      />
                      <div>
                        <p className="font-medium">{prodotto.nome}</p>
                        <p className="text-sm text-gray-600">
                          Codice: {prodotto.codice} • {formatCurrency((prodotto as any).prezzoDefault || 0)}/{formatCurrency((prodotto as any).prezzoBase || 0)} per {prodotto.unita}
                        </p>
                      </div>
                    </div>
                    
                    {isSelected && (
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Quantità:</label>
                        <input
                          type="number"
                          min="1"
                          value={selectedProdotto?.quantita || 1}
                          onChange={(e) => handleQuantitaChange(prodotto.codice, Math.round(excelToNumber(e.target.value)) || 1)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <span className="text-sm text-gray-600">{prodotto.unita}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Warning per prodotti duplicati */}
          {showDuplicateWarning && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-yellow-800">
                    Attenzione: Il prodotto <strong>{prodottiMap[showDuplicateWarning]?.nome}</strong> è già presente per questa prestazione.
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Puoi comunque aggiungerlo nuovamente se necessario.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Annulla
            </button>
            <button
              onClick={() => onConfirm(prodottiSelezionati)}
              disabled={prodottiSelezionati.length === 0}
              className="px-4 py-2 text-sm bg-[#03A6A6] text-white rounded-lg hover:bg-[#028a8a] disabled:opacity-50"
            >
              Aggiungi {prodottiSelezionati.length} prodott{prodottiSelezionati.length === 1 ? 'o' : 'i'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Modal per aggiungere macchinario
  const ModalAggiungiMacchinario: React.FC<{
    prestazione: string;
    onConfirm: (macchinario: string) => void;
    onCancel: () => void;
  }> = ({ prestazione, onConfirm, onCancel }) => {
    const [macchinarioSelezionato, setMacchinarioSelezionato] = useState<string>('');
    
    // Trova i macchinari validi per questa prestazione
    const macchinariValidi = useMemo(() => {
      return combinazioni
        .filter(c => c.tipo === 'prestazione+macchinario' && c.prestazione === prestazione)
        .map(c => c.accessorio)
        .filter(Boolean)
        .map(codice => macchinari.find(m => m.codice === codice))
        .filter(Boolean) as Macchinario[];
    }, [prestazione]);
    
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-xl w-full">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Seleziona macchinario per {prestazione}
          </h3>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              La prestazione <strong>{prestazioniMap[prestazione]?.descrizione}</strong> richiede un macchinario.
            </p>
          </div>
          
          <div className="space-y-3 mb-6">
            {macchinariValidi.map(macchinario => (
              <label
                key={macchinario.codice}
                className={`block p-4 rounded-lg border cursor-pointer transition-colors ${
                  macchinarioSelezionato === macchinario.codice
                    ? 'border-[#03A6A6] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="macchinario"
                    value={macchinario.codice}
                    checked={macchinarioSelezionato === macchinario.codice}
                    onChange={(e) => setMacchinarioSelezionato(e.target.value)}
                    className="text-[#03A6A6] focus:ring-[#03A6A6]"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{macchinario.nome}</p>
                    <p className="text-sm text-gray-600">
                      Codice: {macchinario.codice} • L'importo potrà essere modificato dopo l'aggiunta
                    </p>
                  </div>
                </div>
              </label>
            ))}
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Annulla
            </button>
            <button
              onClick={() => {
                if (macchinarioSelezionato) {
                  onConfirm(macchinarioSelezionato);
                }
              }}
              disabled={!macchinarioSelezionato}
              className="px-4 py-2 text-sm text-white bg-[#03A6A6] rounded-lg hover:bg-[#028989] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Aggiungi macchinario
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Modal per correggere codice
  const ModalCorreggiCodice: React.FC<{
    codiceAttuale: string;
    voceCorrente: VoceFattura;
    onConfirm: (nuovoCodice: string, prezzo?: number, quantita?: number) => void;
    onCancel: () => void;
  }> = ({ codiceAttuale, voceCorrente, onConfirm, onCancel }) => {
    const [nuovoCodice, setNuovoCodice] = useState(codiceAttuale);
    const [prezzoSuggerito, setPrezzoSuggerito] = useState(voceCorrente.importoNetto || 0);
    const [quantitaProdotto, setQuantitaProdotto] = useState(voceCorrente.quantita || 1);
    
    // Analizza il codice inserito
    const analizzaCodice = (code: string) => {
      // Prima controlla se è nelle combinazioni
      const combinazione = combinazioni.find(c => c.codice === code);
      if (combinazione) {
        const anomalie: string[] = [];
        // Se è un prodotto, potrebbe causare anomalia prodotto_orfano
        if (combinazione.tipo === 'prestazione+prodotto') {
          anomalie.push('prodotto_orfano');
        }
        
        return {
          valido: true,
          tipo: combinazione.tipo,
          descrizione: getDescrizioneCombinazione(combinazione),
          richiedePrezzo: combinazione.tipo === 'prestazione' || combinazione.tipo === 'prestazione+macchinario',
          richiedeQuantita: combinazione.tipo === 'prestazione+prodotto',
          possibiliAnomalie: anomalie,
          unitaMisura: combinazione.tipo === 'prestazione+prodotto' ? prodottiMap[combinazione.accessorio!]?.unita : 
                       combinazione.tipo === 'prestazione+macchinario' ? 'utilizzo' : 'prestazione',
          prestazionePadre: combinazione.prestazione
        };
      }
      
      // Poi controlla se è una prestazione semplice
      const prestazione = prestazioniMap[code];
      if (prestazione) {
        const possibiliAnomalie: string[] = [];
        if (prestazione.richiedeMacchinario) {
          possibiliAnomalie.push('prestazione_senza_macchinario');
        }
        if (prestazione.richiedeProdotti) {
          possibiliAnomalie.push('prestazione_incompleta');
        }
        
        return {
          valido: true,
          tipo: 'prestazione',
          descrizione: prestazione.descrizione,
          richiedePrezzo: true, // Sempre chiedi il prezzo per le prestazioni
          richiedeQuantita: false,
          possibiliAnomalie,
          unitaMisura: 'prestazione',
          prestazionePadre: undefined
        };
      }
      
      return { valido: false, tipo: null, descrizione: null, richiedePrezzo: false, possibiliAnomalie: [] as string[] };
    };
    
    const getDescrizioneCombinazione = (comb: any) => {
      if (comb.tipo === 'prestazione') {
        return prestazioniMap[comb.prestazione]?.descrizione || '';
      } else if (comb.tipo === 'prestazione+prodotto') {
        const prest = prestazioniMap[comb.prestazione];
        const prod = prodottiMap[comb.accessorio];
        return `${prest?.descrizione} - ${prod?.nome}`;
      } else if (comb.tipo === 'prestazione+macchinario') {
        const prest = prestazioniMap[comb.prestazione];
        const macc = macchinari.find(m => m.codice === comb.accessorio);
        return `${prest?.descrizione} - ${macc?.nome}`;
      }
      return '';
    };
    
    const analisi = analizzaCodice(nuovoCodice);
    
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-xl w-full">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Correggi codice non valido
          </h3>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Codice attuale: <span className="font-mono font-medium text-red-600">{codiceAttuale}</span>
            </p>
            <p className="text-sm text-gray-500">
              Il codice non è presente nel database. Inserisci un codice valido.
            </p>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nuovo codice
            </label>
            <input
              type="text"
              value={nuovoCodice}
              onChange={(e) => setNuovoCodice(e.target.value.toUpperCase())}
              className={`w-full px-3 py-2 border rounded-lg text-sm font-mono ${
                analisi.valido 
                  ? 'border-green-500 focus:ring-green-500' 
                  : 'border-gray-300 focus:ring-[#03A6A6]'
              } focus:border-transparent focus:ring-2`}
              placeholder="Es: RT, RTGG01, EM..."
            />
            {nuovoCodice && (
              <>
                <p className={`mt-1 text-xs ${analisi.valido ? 'text-green-600' : 'text-red-600'}`}>
                  {analisi.valido ? `✓ Codice valido: ${analisi.descrizione}` : '✗ Codice non trovato nel database'}
                </p>
                {analisi.valido && analisi.unitaMisura && (
                  <p className="mt-1 text-xs text-blue-600">
                    📏 Unità di misura: {analisi.unitaMisura}
                  </p>
                )}
                {analisi.valido && analisi.possibiliAnomalie.includes('prodotto_orfano') && (
                  <p className="mt-1 text-xs text-amber-600">
                    ⚠ Attenzione: questo è un codice prodotto. Potrebbe generare anomalia "prodotto senza prestazione" se manca la prestazione {analisi.prestazionePadre} nella fattura
                  </p>
                )}
                {analisi.valido && analisi.possibiliAnomalie.filter(a => a !== 'prodotto_orfano').length > 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    ⚠ Attenzione: questo codice potrebbe generare nuove anomalie
                  </p>
                )}
              </>
            )}
          </div>
          
          {analisi.valido && analisi.richiedePrezzo && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prezzo {analisi.tipo === 'prestazione+macchinario' ? 'macchinario' : 
                       analisi.tipo === 'prestazione' ? 'prestazione' : ''}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={prezzoSuggerito}
                  onChange={(e) => setPrezzoSuggerito(excelToNumber(e.target.value))}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#03A6A6] focus:border-transparent"
                  placeholder="0.00"
                />
                <span className="text-sm text-gray-600">€</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {analisi.tipo === 'prestazione+macchinario' ? 'Il macchinario' : 'La prestazione'} richiede un prezzo maggiore di zero
              </p>
            </div>
          )}
          
          {analisi.valido && analisi.richiedeQuantita && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantità prodotto
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantitaProdotto}
                  onChange={(e) => setQuantitaProdotto(Math.round(excelToNumber(e.target.value)) || 1)}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#03A6A6] focus:border-transparent"
                  placeholder="1"
                />
                <span className="text-sm text-gray-600">{analisi.unitaMisura}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Conferma la quantità per questo prodotto
              </p>
            </div>
          )}
          
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Annulla
            </button>
            <button
              onClick={() => {
                if (analisi.richiedePrezzo && prezzoSuggerito > 0) {
                  onConfirm(nuovoCodice, prezzoSuggerito);
                } else if (analisi.richiedeQuantita) {
                  onConfirm(nuovoCodice, undefined, quantitaProdotto);
                } else {
                  onConfirm(nuovoCodice);
                }
              }}
              disabled={!analisi.valido || (analisi.richiedePrezzo && prezzoSuggerito <= 0)}
              className="px-4 py-2 text-sm bg-[#03A6A6] text-white rounded-lg hover:bg-[#028a8a] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Applica correzione
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Render principale del componente ImportFatture
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Import Fatture</h1>
              <p className="mt-1 text-sm text-gray-600">
                Sincronizza e importa fatture da Fatture in Cloud
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <span>Ultima sincronizzazione: </span>
                <span className="font-medium">{lastSync}</span>
              </div>
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center gap-2 px-4 py-2 bg-[#03A6A6] text-white rounded-lg hover:bg-[#028a8a] transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Sincronizzazione...' : 'Sincronizza ora'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiche Dashboard */}
      <StatisticheDashboard
        fatture={fatture}
        fattureFiltered={fattureFiltered}
        statiCount={statiCount}
        filtroStato={filtroStato}
        filtroAnomalia={filtroAnomalia}
        setFiltroStato={setFiltroStato}
        setFiltroAnomalia={setFiltroAnomalia}
        getAnomalieFattura={getAnomalieFattura}
      />

      {/* Filtri Toolbar */}
      <FiltriToolbar
        filtroMedico={filtroMedico}
        filtroSerie={filtroSerie}
        filtroDataDa={filtroDataDa}
        filtroDataA={filtroDataA}
        filtriAttivi={filtriAttivi}
        vistaRaggruppata={vistaRaggruppata}
        selectedFatture={selectedFatture}
        isImporting={isImporting}
        medici={medici}
        setFiltroMedico={setFiltroMedico}
        setFiltroSerie={setFiltroSerie}
        setFiltroDataDa={setFiltroDataDa}
        setFiltroDataA={setFiltroDataA}
        resetFiltri={resetFiltri}
        toggleVistaRaggruppata={toggleVistaRaggruppata}
        handleImport={handleImport}
        handleExportXLSX={handleExportXLSX}
        setShowImportDialog={modalStates.setShowImportDialog}
      />

      {/* Table */}
      <div className="px-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-[#03A6A6] focus:ring-[#03A6A6]"
                    />
                  </th>
                  <th className="w-24 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Numero
                  </th>
                  <th className="w-28 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="w-40 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paziente
                  </th>
                  <th className="w-40 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Medico
                  </th>
                  <th className="w-28 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Imponibile
                  </th>
                  <th className="w-20 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IVA
                  </th>
                  <th className="w-28 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Totale
                  </th>
                  <th className="w-32 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stato
                  </th>
                  <th className="w-48 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Anomalie
                  </th>
                  <th className="w-16 px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {renderTableRows()}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Precedente
                </button>
                <button
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Successiva
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Mostrati da{' '}
                    <span className="font-medium">{itemsShowingFrom}</span>
                    {' '}a{' '}
                    <span className="font-medium">
                      {itemsShowingTo}
                    </span>
                    {' '}di{' '}
                    <span className="font-medium">{fattureFiltered.length}</span>
                    {' '}risultati
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={prevPage}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    {getPageNumbers().map((number, index) => {
                        if (number === '...') {
                          return (
                            <span
                              key={`ellipsis-${index}`}
                              className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                            >
                              ...
                            </span>
                          );
                        }
                        
                        return (
                          <button
                            key={number}
                            onClick={() => goToPage(number as number)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === number
                                ? 'z-10 bg-[#03A6A6] border-[#03A6A6] text-white'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {number}
                          </button>
                        );
                      })}
                    <button
                      onClick={nextPage}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Riepilogo Mensile */}
      <RiepilogoMensile riepilogoMensile={riepilogoMensile} />


      {/* Modals */}

      {modalStates.showImportSummary && importSummary && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Import completato
              </h3>
              <div className="mt-4 text-sm text-gray-600">
                <p>{importSummary.count} fatture importate con successo</p>
                {importSummary.nuove > 0 && (
                  <p className="mt-2">
                    {importSummary.nuove} nuove fatture
                  </p>
                )}
              </div>
              <button
                onClick={() => modalStates.setShowImportSummary(false)}
                className="mt-6 w-full px-4 py-2 bg-[#03A6A6] text-white rounded-lg hover:bg-[#028a8a]"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {modalStates.showSyncSummary && syncSummary && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                <RefreshCw className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Sincronizzazione completata
              </h3>
              <div className="mt-4 text-sm text-gray-600">
                <p>{syncSummary.totali} fatture sincronizzate</p>
                {syncSummary.nuove > 0 && (
                  <p className="mt-2">
                    {syncSummary.nuove} nuove fatture
                  </p>
                )}
              </div>
              <button
                onClick={() => modalStates.setShowSyncSummary(false)}
                className="mt-6 w-full px-4 py-2 bg-[#03A6A6] text-white rounded-lg hover:bg-[#028a8a]"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Aggiungi Prodotti */}
      {modalStates.showAddProdottiModal && (
        <ModalAggiungiProdotti
          prestazione={modalStates.showAddProdottiModal.prestazione}
          prodottiDisponibili={getProdottiValidiPerPrestazione(modalStates.showAddProdottiModal.prestazione)}
          onConfirm={confermaAggiungiProdotti}
          onCancel={() => modalStates.setShowAddProdottiModal(null)}
        />
      )}
      
      {/* Modal Aggiungi Macchinario */}
      {modalStates.showAddMacchinarioModal && (
        <ModalAggiungiMacchinario
          prestazione={modalStates.showAddMacchinarioModal.prestazione}
          onConfirm={confermaAggiungiMacchinario}
          onCancel={() => modalStates.setShowAddMacchinarioModal(null)}
        />
      )}
      
      {/* Modal Correggi Codice */}
      {modalStates.showCorreggiCodiceModal && (() => {
        const fattura = fatture.find(f => f.id === modalStates.showCorreggiCodiceModal?.fatturaId);
        const voce = fattura?.voci?.find(v => v.id === modalStates.showCorreggiCodiceModal?.voceId);
        if (!voce) return null;
        
        return (
          <ModalCorreggiCodice
            codiceAttuale={modalStates.showCorreggiCodiceModal?.codiceAttuale || ''}
            voceCorrente={{ ...voce, anomalie: voce.anomalie || [] }}
            onConfirm={(nuovoCodice, prezzo, quantita) => handleCorreggiCodice(modalStates.showCorreggiCodiceModal?.fatturaId || 0, modalStates.showCorreggiCodiceModal?.voceId || 0, nuovoCodice, prezzo, quantita)}
            onCancel={() => modalStates.setShowCorreggiCodiceModal(null)}
          />
        );
      })()}
      
      {/* Dialog Import File */}
      {modalStates.showImportDialog && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <Info className="w-6 h-6 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900">Importa Fatture da Excel</h3>
            </div>
            
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Per scaricare il file da Fattura in Cloud:</strong>
              </p>
              <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
                <li>Vai su Fattura in Cloud</li>
                <li>Seleziona "Fatture"</li>
                <li>Clicca su "Dettaglio righe" in basso a destra</li>
                <li>Scarica il file Excel</li>
              </ol>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Formati supportati: <strong>.xls</strong> o <strong>.xlsx</strong>
              </p>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".xls,.xlsx"
              onChange={handleFileUploadWrapper}
              className="hidden"
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 px-4 py-2 bg-[#03A6A6] text-white rounded-lg hover:bg-[#028a8a] flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Seleziona File
              </button>
              <button
                onClick={() => modalStates.setShowImportDialog(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Mappatura Campi */}
      {modalStates.showMappingModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Mappatura Campi - {uploadedFile?.name}
            </h3>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                Associa i campi del file Excel con i campi richiesti dal sistema. 
                I campi contrassegnati con * sono obbligatori.
              </p>
              
              {/* Filtro data */}
              <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Calendar className="w-4 h-4" />
                  Importa solo fatture emesse dopo il:
                </label>
                <input
                  type="date"
                  value={dataFiltro}
                  onChange={(e) => setDataFiltro(e.target.value)}
                  className="mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  La data specificata non sarà inclusa (solo date successive)
                </p>
              </div>
              
              {/* Tabella mappatura */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 font-medium text-sm text-gray-700 pb-2 border-b">
                  <div>Campo Sistema</div>
                  <div>Campo File Excel</div>
                </div>
                
                {[
                  { key: 'numero', label: 'Numero Fattura *', required: true },
                  { key: 'data', label: 'Data Emissione *', required: true },
                  { key: 'paziente', label: 'Paziente/Cliente', required: false },
                  { key: 'serie', label: 'Serie Sistema', required: false },
                  { key: 'codice', label: 'Codice Articolo', required: false },
                  { key: 'quantita', label: 'Quantità', required: false },
                  { key: 'unita', label: 'Unità di Misura', required: false },
                  { key: 'importo', label: 'Importo/Prezzo', required: false }
                ].map(campo => (
                  <div key={campo.key} className="grid grid-cols-2 gap-4 items-center">
                    <div className="text-sm">
                      {campo.label}
                      {campo.required && <span className="text-red-500 ml-1">*</span>}
                    </div>
                    <select
                      value={fieldMapping[campo.key as keyof FieldMapping] || ''}
                      onChange={(e) => setFieldMapping({
                        ...fieldMapping,
                        [campo.key]:
                         e.target.value
                      })}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                    >
                      <option value="">-- Seleziona campo --</option>
                      {fileColumns.map((col, index) => (
                        <option key={`${col}-${index}`} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Anteprima dati */}
            {fileData.length > 0 && (
              <div className="mb-4">
                <h4 className
                ="text-sm font-medium text-gray-700 mb-2">
                  Anteprima dati ({fileData.length} righe totali)
                </h4>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {fileColumns.slice(0, 5).map((col, index) => (
                          <th key={`header-${col}-${index}`} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {fileData.slice(0, 3).map((row, idx) => (
                        <tr key={`row-${idx}`}>
                          {fileColumns.slice(0, 5).map((col, colIndex) => (
                            <td key={`cell-${idx}-${colIndex}`} className="px-3 py-2 text-sm text-gray-900">
                              {row[col] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  resetFileUpload();
                  modalStates.setShowMappingModal(false);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={handleMappingConfirm}
                disabled={!fieldMapping.numero || !fieldMapping.data}
                className="px-4 py-2 bg-[#03A6A6] text-white rounded-lg hover:bg-[#028a8a] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Processa e Importa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImportFatture;