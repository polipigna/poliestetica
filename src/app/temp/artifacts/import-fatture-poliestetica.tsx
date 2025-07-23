import React, { useState, useEffect, useMemo } from 'react';
import { 
  RefreshCw,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Download,
  Upload,
  FileSpreadsheet,
  Plus,
  ChevronDown,
  ChevronUp,
  Package,
  AlertTriangle,
  Users,
  UserX
} from 'lucide-react';
import type { Fattura, Medico, Prestazione, Prodotto, VoceFattura } from '@/data/mock';
import { 
  isCodiceValido, 
  parseCodiceFattura, 
  prestazioneRichiedeProdotti,
  getProdottiValidiPerPrestazione
} from '@/data/mock';

// Interfacce per gestione voci estesa
interface VoceFatturaEstesa extends VoceFattura {
  // VoceFattura già include tutti i campi necessari
}

interface FatturaConVoci extends Fattura {
  dataEmissione?: string;
  clienteNome?: string;
}

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
  onRegenerate?: (config: any) => void;
  conteggiStati?: {
    da_importare: number;
    verificata: number;
    anomalia: number;
    importata: number;
  };
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
  onUpdateFattura,
  onRegenerate,
  conteggiStati
}) => {
  // Usa le fatture dai props
  const [fatture, setFatture] = useState<FatturaConVoci[]>(fattureProps);
  
  // Aggiorna lo stato quando cambiano i props
  useEffect(() => {
    setFatture(fattureProps);
  }, [fattureProps]);
  
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

  const [selectedFatture, setSelectedFatture] = useState<number[]>([]);
  const [expandedFatture, setExpandedFatture] = useState<number[]>([]);
  const [filtroStato, setFiltroStato] = useState('tutti');
  const [filtroDataDa, setFiltroDataDa] = useState('');
  const [filtroDataA, setFiltroDataA] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAssignMedico, setShowAssignMedico] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [vistaRaggruppata, setVistaRaggruppata] = useState(false);
  const [showImportSummary, setShowImportSummary] = useState(false);
  const [importSummary, setImportSummary] = useState<{ count: number; nuove: number; aggiornate: number } | null>(null);
  const [showSyncSummary, setShowSyncSummary] = useState(false);
  const [syncSummary, setSyncSummary] = useState<{ nuove: number; aggiornate: number; totali: number } | null>(null);
  const [showAddProdottiModal, setShowAddProdottiModal] = useState<{ fatturaId: number; prestazione: string } | null>(null);
  const [quantitaTemp, setQuantitaTemp] = useState<{ fatturaId: number; voceId: number; quantita: number } | null>(null);

  // Mock stati
  const lastSync = '15 minuti fa';
  const lastImport = '10 minuti fa';

  // Filtri applicati
  const fattureFiltered = useMemo(() => {
    return fatture.filter(f => {
      if (filtroStato !== 'tutti' && f.stato !== filtroStato) return false;
      
      // Filtro date (semplificato per demo)
      if (filtroDataDa || filtroDataA) {
        // Ottieni la data della fattura (data o dataEmissione)
        const dataString = f.data || f.dataEmissione;
        if (!dataString) return true; // Se non c'è data, includi la fattura
        
        const dataFattura = new Date(dataString);
        
        if (filtroDataDa) {
          const dataDa = new Date(filtroDataDa);
          if (dataFattura < dataDa) return false;
        }
        
        if (filtroDataA) {
          const dataA = new Date(filtroDataA);
          // Aggiungi 23:59:59 alla data A per includere tutto il giorno
          dataA.setHours(23, 59, 59, 999);
          if (dataFattura > dataA) return false;
        }
      }
      
      return true;
    });
  }, [fatture, filtroStato, filtroDataDa, filtroDataA]);

  // Funzione per verificare anomalie voci
  const verificaAnomalieVoce = (voce: VoceFatturaEstesa, voci: VoceFatturaEstesa[]): string[] => {
    const anomalie: string[] = [];
    const codicePulito = voce.codice.replace(/^\d/, '');
    const parsed = parseCodiceFattura(voce.codice);

    // 1. Verifica codice valido
    if (!isCodiceValido(codicePulito)) {
      anomalie.push('codice_sconosciuto');
    }

    // 2. Per i prodotti
    if (parsed.isProdotto) {
      // Verifica prezzo prodotto (deve essere 0 o null/undefined)
      if (voce.importoNetto !== 0 && voce.importoNetto !== null && voce.importoNetto !== undefined) {
        // Verifica se esiste la prestazione madre
        const prestazioneMadre = voci.find(v => {
          const vParsed = parseCodiceFattura(v.codice);
          return vParsed.isPrestazione && v.codice === parsed.prestazione;
        });
        if (prestazioneMadre) {
          anomalie.push('prodotto_con_prezzo');
        }
      }

      // Verifica prodotto orfano
      const hasPrestazioneMadre = voci.some(v => {
        const vParsed = parseCodiceFattura(v.codice);
        return vParsed.isPrestazione && v.codice === parsed.prestazione;
      });
      if (!hasPrestazioneMadre) {
        anomalie.push('prodotto_orfano');
      }
    }

    // 3. Per le prestazioni
    if (parsed.isPrestazione) {
      // Verifica prestazione incompleta
      if (prestazioneRichiedeProdotti(voce.codice)) {
        const hasProdotti = voci.some(v => {
          const vParsed = parseCodiceFattura(v.codice);
          return vParsed.isProdotto && vParsed.prestazione === voce.codice;
        });
        if (!hasProdotti) {
          anomalie.push('prestazione_incompleta');
        }
      }
      
      // Verifica prestazione duplicata
      const duplicati = voci.filter(v => v.codice === voce.codice && v.id !== voce.id);
      if (duplicati.length > 0) {
        anomalie.push('prestazione_duplicata');
      }
    }
    
    // 4. Verifica unità incompatibile (per prodotti)
    if (parsed.isProdotto && voce.unita) {
      const prodotto = prodottiMap[parsed.accessorio || ''];
      if (prodotto && prodotto.unita !== voce.unita) {
        anomalie.push('unita_incompatibile');
      }
    }
    
    // 5. Verifica quantità anomala
    if (parsed.isProdotto && voce.quantita) {
      const prodotto = prodottiMap[parsed.accessorio || ''];
      // Definiamo soglie di esempio (dovrebbero venire dalla configurazione)
      const soglieAnomalie: Record<string, number> = {
        'VEX': 3000,  // Vistabex max 3000 unità
        'DYS': 1000,  // Dysport max 1000 unità
        'ALL': 10,    // Allergan max 10 fiale
        'XEO': 5      // Xeomin max 5 fiale
      };
      
      const soglia = soglieAnomalie[parsed.accessorio || ''];
      if (soglia && voce.quantita > soglia) {
        anomalie.push('quantita_anomala');
      }
    }

    return anomalie;
  };

  // Calcola anomalie per fattura
  const getAnomalieFattura = (fattura: FatturaConVoci) => {
    const anomalie: string[] = [];
    
    if (!fattura.medicoId) {
      anomalie.push('medico_mancante');
    }
    
    // Analizza voci se esistono
    if (fattura.voci && Array.isArray(fattura.voci)) {
      fattura.voci.forEach((voce) => {
        const anomalieVoce = verificaAnomalieVoce(voce, fattura.voci!);
        anomalie.push(...anomalieVoce);
      });
    }
    
    return [...new Set(anomalie)]; // Rimuovi duplicati
  };

  // Toggle expanded
  const toggleExpanded = (fatturaId: number) => {
    if (expandedFatture.includes(fatturaId)) {
      setExpandedFatture(expandedFatture.filter(id => id !== fatturaId));
    } else {
      setExpandedFatture([...expandedFatture, fatturaId]);
    }
  };

  // Verifica se import è consentito
  const canImportFattura = (fattura: FatturaConVoci): boolean => {
    if (!fattura.medicoId) return false;
    const anomalie = getAnomalieFattura(fattura);
    return anomalie.length === 0;
  };

  // Calcola stati count
  const calcolaStatiCount = () => {
    if (conteggiStati) return conteggiStati;
    
    return fatture.reduce((acc, f) => {
      const stato = f.stato || 'da_importare';
      acc[stato] = (acc[stato] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  // Status delle serie
  const serieStatus = {
    principale: { count: fatture.filter(f => f.serie === 'principale').length, hasIssues: false },
    IVA: { count: fatture.filter(f => f.serie === 'IVA').length, hasIssues: false },
    CASSA: { count: fatture.filter(f => f.serie === 'CASSA').length, hasIssues: false }
  };

  // Gestione selezione
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFatture(fattureFiltered.filter(f => f.stato !== 'importata').map(f => f.id));
    } else {
      setSelectedFatture([]);
    }
  };

  const handleSelectFattura = (id: number) => {
    if (selectedFatture.includes(id)) {
      setSelectedFatture(selectedFatture.filter(fId => fId !== id));
    } else {
      setSelectedFatture([...selectedFatture, id]);
    }
  };

  // Assegna medico
  const handleAssignMedico = (medicoId: number, medicoNome: string) => {
    const fattureToUpdate = fatture.filter(f => selectedFatture.includes(f.id));
    
    fattureToUpdate.forEach(fattura => {
      if (onUpdateFattura) {
        onUpdateFattura(fattura.id, { medicoId, medicoNome });
      }
    });
    
    // Update locale
    setFatture(fatture.map(f => 
      selectedFatture.includes(f.id) 
        ? { ...f, medicoId, medicoNome, stato: 'verificata' }
        : f
    ));
    
    setSelectedFatture([]);
    setShowAssignMedico(false);
  };

  // Azioni risoluzione anomalie
  const handleImpostaPrezzoZero = (fatturaId: number, voceId: number) => {
    setFatture(fatture.map(f => {
      if (f.id === fatturaId && f.voci) {
        const voci = f.voci.map(v => {
          if (v.id === voceId) {
            return { ...v, importoNetto: 0, importoLordo: 0 };
          }
          return v;
        });
        
        // Ricalcola totali
        const totaleNetto = voci.reduce((sum, v) => sum + (v.importoNetto || 0), 0);
        const anomalie = getAnomalieFattura({ ...f, voci });
        const stato = anomalie.length === 0 && f.medicoId ? 'verificata' : 'anomalia';
        
        return { ...f, voci, imponibile: totaleNetto, totale: totaleNetto * 1.22, stato: stato as any };
      }
      return f;
    }));
  };

  const handleEliminaVoce = (fatturaId: number, voceId: number) => {
    setFatture(fatture.map(f => {
      if (f.id === fatturaId && f.voci) {
        const voci = f.voci.filter(v => v.id !== voceId);
        const totaleNetto = voci.reduce((sum, v) => sum + (v.importoNetto || 0), 0);
        const anomalie = getAnomalieFattura({ ...f, voci });
        const stato = anomalie.length === 0 && f.medicoId ? 'verificata' : 'anomalia';
        
        return { 
          ...f, 
          voci, 
          imponibile: totaleNetto,
          totale: totaleNetto * 1.22,
          stato: stato as any 
        };
      }
      return f;
    }));
  };

  const handleAggiungiPrestazioneMancante = (fatturaId: number, codicePrestazione: string) => {
    const prestazione = prestazioniMap[codicePrestazione];
    if (!prestazione) return;

    setFatture(fatture.map(f => {
      if (f.id === fatturaId && f.voci) {
        const nuovaVoce: VoceFattura = {
          id: Date.now(),
          codice: codicePrestazione,
          descrizione: prestazione.descrizione,
          tipo: 'prestazione',
          importoNetto: (prestazione as any).prezzoDefault || 0,
          importoLordo: ((prestazione as any).prezzoDefault || 0) * 1.22,
          quantita: 1,
          unita: '',
          anomalie: []
        };
        
        const voci = [...f.voci, nuovaVoce];
        const totaleNetto = voci.reduce((sum, v) => sum + (v.importoNetto || 0), 0);
        const anomalie = getAnomalieFattura({ ...f, voci });
        const stato = anomalie.length === 0 && f.medicoId ? 'verificata' : 'anomalia';
        
        return {
          ...f,
          voci,
          imponibile: totaleNetto,
          totale: totaleNetto * 1.22,
          stato: stato as any
        };
      }
      return f;
    }));
  };

  const handleAggiungiProdottiMancanti = (fatturaId: number, prestazione: string) => {
    setShowAddProdottiModal({ fatturaId, prestazione });
  };

  const confermaAggiungiProdotti = (prodottiSelezionati: { codice: string; quantita: number }[]) => {
    if (!showAddProdottiModal) return;

    const { fatturaId, prestazione } = showAddProdottiModal;

    setFatture(fatture.map(f => {
      if (f.id === fatturaId && f.voci) {
        const nuoveVoci = prodottiSelezionati.map(ps => {
          const prodotto = prodottiMap[ps.codice];
          return {
            id: Date.now() + Math.random(),
            codice: `${prestazione}${ps.codice}`,
            descrizione: `${prestazioniMap[prestazione]?.descrizione} - ${prodotto?.nome}`,
            tipo: 'prodotto' as const,
            prestazionePadre: prestazione,
            importoNetto: 0,
            importoLordo: 0,
            quantita: ps.quantita,
            unita: prodotto?.unita || '',
            anomalie: []
          };
        });

        const voci = [...f.voci, ...nuoveVoci];
        const anomalie = getAnomalieFattura({ ...f, voci });
        const stato = anomalie.length === 0 && f.medicoId ? 'verificata' : 'anomalia';
        
        return {
          ...f,
          voci,
          stato: stato as any
        };
      }
      return f;
    }));

    setShowAddProdottiModal(null);
  };

  // Handler per correggere unità di misura
  const handleCorreggiUnita = (fatturaId: number, voceId: number, unitaCorretta: string) => {
    if (onUpdateFattura) {
      onUpdateFattura(fatturaId, {
        voci: fatture.find(f => f.id === fatturaId)?.voci?.map(v => 
          v.id === voceId ? { ...v, unita: unitaCorretta } : v
        )
      });
    }
  };

  // Handler per correggere quantità
  const handleCorreggiQuantita = (fatturaId: number, voceId: number, nuovaQuantita: number) => {
    if (onUpdateFattura) {
      onUpdateFattura(fatturaId, {
        voci: fatture.find(f => f.id === fatturaId)?.voci?.map(v => 
          v.id === voceId ? { ...v, quantita: nuovaQuantita } : v
        )
      });
    }
    setQuantitaTemp(null);
  };

  // Genera fatture di test con anomalie
  const handleGenerateTestData = () => {
    if (onRegenerate && confirm('Vuoi generare 50 fatture di test con anomalie? Questo sostituirà i dati attuali.')) {
      onRegenerate({ numeroFatture: 50, scenario: 'test-anomalie' });
      setTimeout(() => window.location.reload(), 100);
    }
  };

  // Sync con Fatture in Cloud
  const handleSync = async () => {
    setIsSyncing(true);
    
    // Simula sync
    setTimeout(() => {
      if (onSync) {
        onSync();
      }
      
      setSyncSummary({
        nuove: 15,
        aggiornate: 3,
        totali: 18
      });
      setShowSyncSummary(true);
      setIsSyncing(false);
    }, 2000);
  };

  // Import selezionate
  const handleImport = async () => {
    if (selectedFatture.length === 0) return;
    
    // Verifica che tutte le fatture selezionate siano importabili
    const fattureImportabili = selectedFatture.filter(id => {
      const fattura = fatture.find(f => f.id === id);
      return fattura && canImportFattura(fattura);
    });

    if (fattureImportabili.length === 0) {
      alert('Nessuna fattura selezionata può essere importata. Verificare medico assegnato e anomalie.');
      return;
    }

    if (fattureImportabili.length < selectedFatture.length) {
      const nonImportabili = selectedFatture.length - fattureImportabili.length;
      if (!confirm(`${nonImportabili} fatture non possono essere importate per anomalie. Importare solo le ${fattureImportabili.length} valide?`)) {
        return;
      }
    }
    
    setIsImporting(true);
    
    // Simula import
    setTimeout(() => {
      if (onImport) {
        onImport(fattureImportabili);
      }
      
      const count = fattureImportabili.length;
      const fattureImportate = fatture.filter(f => fattureImportabili.includes(f.id));
      const nuove = fattureImportate.filter(f => f.stato === 'verificata').length;
      const aggiornate = count - nuove;
      
      // Update stato fatture
      setFatture(fatture.map(f => 
        fattureImportabili.includes(f.id) 
          ? { ...f, stato: 'importata' as const }
          : f
      ));
      
      setImportSummary({ count, nuove, aggiornate });
      setShowImportSummary(true);
      setSelectedFatture([]);
      setIsImporting(false);
    }, 1500);
  };

  // Renderizza anomalie
  const renderAnomalie = (anomalie: string[]) => {
    const anomalieMap: Record<string, { label: string; color: string; icon: any }> = {
      'medico_mancante': { label: 'Medico mancante', color: 'text-red-600', icon: AlertCircle },
      'prodotto_con_prezzo': { label: 'Prodotto con prezzo', color: 'text-amber-600', icon: AlertTriangle },
      'prestazione_incompleta': { label: 'Prodotti mancanti', color: 'text-orange-600', icon: Package },
      'prodotto_orfano': { label: 'Prodotto senza prestazione', color: 'text-purple-600', icon: AlertTriangle },
      'codice_sconosciuto': { label: 'Codice non valido', color: 'text-red-700', icon: X },
      'prestazione_duplicata': { label: 'Prestazione duplicata', color: 'text-blue-600', icon: RefreshCw },
      'unita_incompatibile': { label: 'Unità incompatibile', color: 'text-indigo-600', icon: AlertTriangle },
      'quantita_anomala': { label: 'Quantità anomala', color: 'text-pink-600', icon: AlertCircle }
    };

    return (
      <div className="flex flex-wrap gap-1">
        {[...new Set(anomalie)].map((anomalia, idx) => {
          const config = anomalieMap[anomalia];
          if (!config) return null;
          
          const Icon = config.icon;
          return (
            <span 
              key={idx}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 ${config.color}`}
            >
              <Icon className="w-3 h-3" />
              {config.label}
            </span>
          );
        })}
      </div>
    );
  };


  // Paginazione
  const paginatedFatture = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return fattureFiltered.slice(startIndex, startIndex + itemsPerPage);
  }, [fattureFiltered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(fattureFiltered.length / itemsPerPage);

  // Calcola totali pagina
  const totalsPagina = paginatedFatture.reduce((acc, fattura) => ({
    lordo: acc.lordo + (fattura.totale || 0),
    netto: acc.netto + (fattura.imponibile || 0),
    iva: acc.iva + (fattura.iva || 0)
  }), { lordo: 0, netto: 0, iva: 0 });

  // Export functions
  const handleExportSelected = () => {
    const selectedData = fatture.filter(f => selectedFatture.includes(f.id));
    
    // Per export CSV
    const csv = [
      ['Numero', 'Data', 'Paziente', 'Medico', 'Importo Netto', 'IVA', 'Importo Lordo', 'Stato'],
      ...selectedData.map(f => [
        f.numero,
        f.data,
        f.paziente,
        f.medicoNome || '',
        f.imponibile.toFixed(2),
        f.iva.toFixed(2),
        f.totale.toFixed(2),
        f.stato
      ])
    ];
    
    // Download CSV (mock)
    console.log('Exporting CSV:', csv);
  };

  const handleExportDettaglio = () => {
    const allRows: any[] = [];
    
    fatture.forEach(fattura => {
      // Riga fattura
      allRows.push({
        tipo: 'fattura',
        numero: fattura.numero,
        data: fattura.data,
        paziente: fattura.paziente,
        medico: fattura.medicoNome || '',
        descrizione: '',
        quantita: '',
        unita: '',
        importoNetto: fattura.imponibile,
        importoIva: fattura.iva,
        importoLordo: fattura.totale,
        stato: fattura.stato
      });
      
      // Righe voci
      if (fattura.voci) {
        fattura.voci.forEach((voce: any) => {
          allRows.push({
            tipo: 'voce',
            numero: fattura.numero,
            data: fattura.data,
            paziente: '',
            medico: '',
            descrizione: voce.descrizione,
            quantita: voce.quantita || '',
            unita: voce.unita || '',
            importoNetto: voce.importoNetto || 0,
            importoIva: 0,
            importoLordo: voce.importoNetto * 1.22,
            stato: voce.anomalie?.length > 0 ? 'anomalia' : ''
          });
        });
      }
    });
    
    console.log('Exporting detailed:', allRows);
  };

  // Render table rows
  const renderTableRows = () => {
    if (vistaRaggruppata) {
      // Vista raggruppata per medico su TUTTE le fatture filtrate
      const fattureByMedico = fattureFiltered.reduce((acc: any, fattura) => {
        const medicoKey = fattura.medicoNome || 'Non assegnato';
        if (!acc[medicoKey]) {
          acc[medicoKey] = [];
        }
        acc[medicoKey].push(fattura);
        return acc;
      }, {});
      
      // Ordina le chiavi mettendo "Non assegnato" per ultimo
      const sortedKeys = Object.keys(fattureByMedico).sort((a, b) => {
        if (a === 'Non assegnato') return 1;
        if (b === 'Non assegnato') return -1;
        return a.localeCompare(b);
      });
      
      // Calcola quale gruppo di medici mostrare in base alla paginazione
      const startIndex = (currentPage - 1) * itemsPerPage;
      let currentIndex = 0;
      const rowsToRender: React.ReactNode[] = [];
      
      for (const medicoNome of sortedKeys) {
        const fattureGruppo = fattureByMedico[medicoNome];
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
        <td colSpan={10} className="px-6 py-4 bg-gray-50">
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-gray-900">Dettaglio voci fattura</h4>
            <div className="space-y-2">
              {fattura.voci.map(voce => {
                const anomalieVoce = verificaAnomalieVoce(voce, fattura.voci!);
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
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          Quantità: {voce.quantita} {voce.unita} • 
                          Importo: €{voce.importoNetto?.toFixed(2) || '0.00'}
                        </div>
                        {anomalieVoce.length > 0 && (
                          <div className="mt-2">
                            {renderAnomalie(anomalieVoce)}
                            <div className="mt-2 flex gap-2">
                              {anomalieVoce.includes('prodotto_con_prezzo') && (
                                <button
                                  onClick={() => handleImpostaPrezzoZero(fattura.id, voce.id)}
                                  className="px-2 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700"
                                >
                                  Imposta a €0
                                </button>
                              )}
                              {anomalieVoce.includes('prodotto_orfano') && (
                                <>
                                  <button
                                    onClick={() => handleEliminaVoce(fattura.id, voce.id)}
                                    className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                  >
                                    Elimina
                                  </button>
                                  <button
                                    onClick={() => handleAggiungiPrestazioneMancante(fattura.id, parsed.prestazione!)}
                                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                  >
                                    Aggiungi prestazione {parsed.prestazione}
                                  </button>
                                </>
                              )}
                              {anomalieVoce.includes('prestazione_duplicata') && (
                                <button
                                  onClick={() => handleEliminaVoce(fattura.id, voce.id)}
                                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  Elimina duplicato
                                </button>
                              )}
                              {anomalieVoce.includes('unita_incompatibile') && (
                                <button
                                  onClick={() => {
                                    const prodotto = parsed.accessorio ? prodottiMap[parsed.accessorio] : null;
                                    if (prodotto) {
                                      handleCorreggiUnita(fattura.id, voce.id, prodotto.unita);
                                    }
                                  }}
                                  className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                                >
                                  Correggi a {parsed.accessorio ? prodottiMap[parsed.accessorio]?.unita : 'unità'}
                                </button>
                              )}
                              {anomalieVoce.includes('quantita_anomala') && (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    defaultValue={voce.quantita}
                                    onChange={(e) => setQuantitaTemp({ fatturaId: fattura.id, voceId: voce.id, quantita: parseInt(e.target.value) || 0 })}
                                    className="w-16 px-1 py-0.5 text-xs border rounded"
                                  />
                                  <button
                                    onClick={() => handleCorreggiQuantita(fattura.id, voce.id, quantitaTemp?.quantita || voce.quantita)}
                                    className="px-2 py-1 text-xs bg-pink-600 text-white rounded hover:bg-pink-700"
                                  >
                                    Correggi
                                  </button>
                                </div>
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
              const anomalie = verificaAnomalieVoce(v, fattura.voci!);
              return anomalie.includes('prestazione_incompleta');
            }).map(voce => (
              <div key={`inc-${voce.id}`} className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800">
                  La prestazione <strong>{voce.descrizione}</strong> richiede prodotti
                </p>
                <button
                  onClick={() => handleAggiungiProdottiMancanti(fattura.id, voce.codice)}
                  className="mt-2 px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                >
                  <Plus className="w-3 h-3 inline mr-1" />
                  Aggiungi prodotti
                </button>
              </div>
            ))}
          </div>
        </td>
      </tr>
    );
  };

  // Render singola riga fattura
  const renderFatturaRow = (fattura: FatturaConVoci, indented = false) => {
    const anomalie = getAnomalieFattura(fattura);
    const hasAnomalie = anomalie.length > 0;
    const isExpanded = expandedFatture.includes(fattura.id);
    const canImport = canImportFattura(fattura);
    
    return (
      <React.Fragment key={fattura.id}>
        <tr className={`hover:bg-gray-50 ${indented ? 'pl-8' : ''}`}>
          <td className="px-6 py-4 whitespace-nowrap">
            <input
              type="checkbox"
              checked={selectedFatture.includes(fattura.id)}
              onChange={() => handleSelectFattura(fattura.id)}
              disabled={fattura.stato === 'importata'}
              className="rounded border-gray-300 text-[#03A6A6] focus:ring-[#03A6A6]"
            />
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{fattura.numero}</span>
              {fattura.serie !== 'principale' && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
                  {fattura.serie}
                </span>
              )}
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
            {fattura.data || (fattura.dataEmissione ? new Date(fattura.dataEmissione).toLocaleDateString('it-IT') : '')}
          </td>
          <td className="px-6 py-4 text-sm text-gray-900">
            {fattura.paziente || fattura.clienteNome || ''}
          </td>
          <td className="px-6 py-4 text-sm">
            {fattura.medicoNome ? (
              <span className="text-gray-900">{fattura.medicoNome}</span>
            ) : (
              <span className="text-red-600 font-medium">Non assegnato</span>
            )}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
            <div>
              <div className="font-medium text-gray-900">€ {fattura.imponibile.toFixed(2)}</div>
              <div className="text-xs text-gray-500">+IVA € {(fattura.iva || fattura.imponibile * 0.22).toFixed(2)}</div>
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
            € {fattura.totale.toFixed(2)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex flex-col gap-1">
              {renderStatoBadge(fattura.stato || 'da_importare')}
              {hasAnomalie && renderAnomalie(anomalie)}
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <button
              onClick={() => toggleExpanded(fattura.id)}
              className="text-[#03A6A6] hover:text-[#028a8a]"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-center">
            {!canImport && (
              <div title="Non importabile - correggere anomalie">
                <AlertCircle className="w-4 h-4 text-red-500" />
              </div>
            )}
          </td>
        </tr>
        {isExpanded && renderVociDettagli(fattura)}
      </React.Fragment>
    );
  };

  const renderStatoBadge = (stato: string) => {
    const stateConfig: Record<string, { color: string; label: string }> = {
      'da_importare': { color: 'bg-gray-100 text-gray-800', label: 'Da importare' },
      'verificata': { color: 'bg-green-100 text-green-800', label: 'Verificata' },
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
              <button
                onClick={handleGenerateTestData}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                title="Genera 50 fatture con anomalie per test"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Test Anomalie
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stati Overview */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { key: 'da_importare', label: 'Da importare', color: 'bg-gray-100 text-gray-800' },
            { key: 'verificata', label: 'Verificate', color: 'bg-green-100 text-green-800' },
            { key: 'anomalia', label: 'Con anomalie', color: 'bg-red-100 text-red-800' },
            { key: 'importata', label: 'Importate', color: 'bg-blue-100 text-blue-800' }
          ].map(stato => {
            const statiCount = calcolaStatiCount();
            const count = (statiCount as any)[stato.key] || 0;
            return (
              <button
                key={stato.key}
                onClick={() => setFiltroStato(stato.key)}
                className={`p-4 rounded-lg border ${
                  filtroStato === stato.key ? 'border-[#03A6A6] bg-[#03A6A6]/5' : 'border-gray-200 bg-white'
                } hover:border-[#03A6A6] transition-all`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">{stato.label}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${stato.color}`}>
                    {count}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        
        {/* Riepilogo Anomalie */}
        {(() => {
          const riepilogoAnomalie: Record<string, number> = {};
          fattureFiltered.forEach(fattura => {
            const anomalie = getAnomalieFattura(fattura);
            anomalie.forEach(anomalia => {
              riepilogoAnomalie[anomalia] = (riepilogoAnomalie[anomalia] || 0) + 1;
            });
          });
          
          if (Object.keys(riepilogoAnomalie).length === 0) return null;
          
          const anomalieConfig: Record<string, { label: string; color: string; icon: any }> = {
            'medico_mancante': { label: 'Medico non assegnato', color: 'text-red-600', icon: UserX },
            'prodotto_con_prezzo': { label: 'Prodotto con prezzo', color: 'text-amber-600', icon: AlertCircle },
            'prestazione_incompleta': { label: 'Prestazione senza prodotti', color: 'text-orange-600', icon: Package },
            'prodotto_orfano': { label: 'Prodotto senza prestazione', color: 'text-purple-600', icon: AlertTriangle },
            'codice_sconosciuto': { label: 'Codice non valido', color: 'text-red-700', icon: X },
            'prestazione_duplicata': { label: 'Prestazione duplicata', color: 'text-blue-600', icon: RefreshCw },
            'unita_incompatibile': { label: 'Unità incompatibile', color: 'text-indigo-600', icon: AlertTriangle },
            'quantita_anomala': { label: 'Quantità anomala', color: 'text-pink-600', icon: AlertCircle }
          };
          
          return (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-red-800 mb-3">Riepilogo Anomalie Rilevate</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(riepilogoAnomalie).map(([anomalia, count]) => {
                  const config = anomalieConfig[anomalia];
                  if (!config) return null;
                  const Icon = config.icon;
                  return (
                    <div key={anomalia} className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${config.color}`} />
                      <span className="text-sm text-gray-700">
                        {config.label}: <span className="font-medium">{count}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Filters and Actions */}
      <div className="px-6 pb-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <select
                value={filtroStato}
                onChange={(e) => setFiltroStato(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
              >
                <option value="tutti">Tutti gli stati</option>
                <option value="da_importare">Da importare</option>
                <option value="verificata">Verificate</option>
                <option value="anomalia">Con anomalie</option>
                <option value="importata">Importate</option>
              </select>
              
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={filtroDataDa}
                  onChange={(e) => {
                    const newDataDa = e.target.value;
                    setFiltroDataDa(newDataDa);
                    // Se data da è dopo data a, resetta data a
                    if (filtroDataA && newDataDa > filtroDataA) {
                      setFiltroDataA('');
                    }
                  }}
                  max={filtroDataA || undefined}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                  placeholder="Data da"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="date"
                  value={filtroDataA}
                  onChange={(e) => {
                    const newDataA = e.target.value;
                    setFiltroDataA(newDataA);
                    // Se data a è prima di data da, resetta data da
                    if (filtroDataDa && newDataA < filtroDataDa) {
                      setFiltroDataDa('');
                    }
                  }}
                  min={filtroDataDa || undefined}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                  placeholder="Data a"
                />
              </div>
              
              <button
                onClick={() => setVistaRaggruppata(!vistaRaggruppata)}
                className={`px-3 py-2 text-sm rounded-lg border flex items-center gap-2 ${
                  vistaRaggruppata 
                    ? 'bg-[#03A6A6] text-white border-[#03A6A6]' 
                    : 'bg-white text-gray-700 border-gray-300'
                } hover:border-[#03A6A6] transition-colors`}
              >
                <Users className="w-4 h-4" />
                Raggruppa per medico
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              {selectedFatture.length > 0 && (
                <>
                  <span className="text-sm text-gray-600 mr-2">
                    {selectedFatture.length} selezionate
                  </span>
                  <button
                    onClick={() => setShowAssignMedico(true)}
                    className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Assegna medico
                  </button>
                  <button
                    onClick={handleExportSelected}
                    className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={isImporting}
                    className="px-4 py-2 text-sm bg-[#03A6A6] text-white rounded-lg hover:bg-[#028a8a] disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4 inline mr-2" />
                    {isImporting ? 'Importazione...' : 'Importa selezionate'}
                  </button>
                </>
              )}
              
              <button
                onClick={handleExportDettaglio}
                className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="px-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-[#03A6A6] focus:ring-[#03A6A6]"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Numero
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paziente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Medico
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Imponibile
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Totale
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {renderTableRows()}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={5} className="px-6 py-3 text-sm font-medium text-gray-900">
                    Totali pagina
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                    € {totalsPagina.netto.toFixed(2)}
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                    € {totalsPagina.lordo.toFixed(2)}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Precedente
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Successiva
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Mostrati da{' '}
                    <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
                    {' '}a{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, fattureFiltered.length)}
                    </span>
                    {' '}di{' '}
                    <span className="font-medium">{fattureFiltered.length}</span>
                    {' '}risultati
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === i + 1
                            ? 'z-10 bg-[#03A6A6] border-[#03A6A6] text-white'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
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

      {/* Serie Status */}
      <div className="px-6 py-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Stato Serie</h3>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(serieStatus).map(([serie, status]) => (
              <div key={serie} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">{serie}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{status.count} fatture</span>
                  {status.hasIssues ? (
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAssignMedico && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Assegna medico a {selectedFatture.length} fatture
            </h3>
            <div className="space-y-3">
              {medici.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleAssignMedico(m.id, `${m.nome} ${m.cognome}`)}
                  className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-[#03A6A6] transition-colors"
                >
                  <span className="font-medium">{m.nome}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAssignMedico(false)}
              className="mt-4 w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {showImportSummary && importSummary && (
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
                <p className="mt-2">
                  {importSummary.nuove} nuove • {importSummary.aggiornate} aggiornate
                </p>
              </div>
              <button
                onClick={() => setShowImportSummary(false)}
                className="mt-6 w-full px-4 py-2 bg-[#03A6A6] text-white rounded-lg hover:bg-[#028a8a]"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {showSyncSummary && syncSummary && (
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
                <p className="mt-2">
                  {syncSummary.nuove} nuove • {syncSummary.aggiornate} aggiornate
                </p>
              </div>
              <button
                onClick={() => setShowSyncSummary(false)}
                className="mt-6 w-full px-4 py-2 bg-[#03A6A6] text-white rounded-lg hover:bg-[#028a8a]"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Aggiungi Prodotti */}
      {showAddProdottiModal && (
        <ModalAggiungiProdotti
          prestazione={showAddProdottiModal.prestazione}
          prodottiDisponibili={getProdottiValidiPerPrestazione(showAddProdottiModal.prestazione)}
          onConfirm={confermaAggiungiProdotti}
          onCancel={() => setShowAddProdottiModal(null)}
        />
      )}
    </div>
  );
};

// Modal per aggiungere prodotti
const ModalAggiungiProdotti: React.FC<{
  prestazione: string;
  prodottiDisponibili: Prodotto[];
  onConfirm: (prodotti: { codice: string; quantita: number }[]) => void;
  onCancel: () => void;
}> = ({ prestazione, prodottiDisponibili, onConfirm, onCancel }) => {
  const [prodottiSelezionati, setProdottiSelezionati] = useState<{ codice: string; quantita: number }[]>([]);

  const handleToggleProdotto = (codice: string) => {
    const exists = prodottiSelezionati.find(p => p.codice === codice);
    if (exists) {
      setProdottiSelezionati(prodottiSelezionati.filter(p => p.codice !== codice));
    } else {
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
                        Codice: {prodotto.codice} • €{(prodotto as any).prezzoDefault || 0}/€{(prodotto as any).prezzoBase || 0} per {prodotto.unita}
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
                        onChange={(e) => handleQuantitaChange(prodotto.codice, parseInt(e.target.value) || 1)}
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

export default ImportFatture;