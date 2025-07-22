import React, { useState, useEffect, useMemo } from 'react';
import { 
  RefreshCw,
  Check,
  X,
  Calendar,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Eye,
  FileText,
  Download,
  Upload,
  FileSpreadsheet,
  Trash2,
  Plus
} from 'lucide-react';
import type { Fattura, Medico, Prestazione, Prodotto } from '@/data/mock';

// Props interface
interface ImportFattureProps {
  fatture: Fattura[];
  medici: Medico[];
  prestazioni: Prestazione[];
  prodotti: Prodotto[];
  isLoading?: boolean;
  onSync?: () => void;
  onImport?: (ids: number[]) => void;
  onUpdateFattura?: (id: number, updates: Partial<Fattura>) => void;
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
  conteggiStati
}) => {
  // Usa le fatture dai props
  const [fatture, setFatture] = useState<Fattura[]>(fattureProps);
  
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

  const [selectedFatture, setSelectedFatture] = useState<number[]>([]);
  const [filtroStato, setFiltroStato] = useState('tutti');
  const [filtroDataDa, setFiltroDataDa] = useState('');
  const [filtroDataA, setFiltroDataA] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAssignMedico, setShowAssignMedico] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [vistaRaggruppata, setVistaRaggruppata] = useState(false);
  const [addingVoce, setAddingVoce] = useState<{ fatturaId: number; tipo: 'prestazione' | 'prodotto' } | null>(null);
  const [showImportSummary, setShowImportSummary] = useState(false);
  const [importSummary, setImportSummary] = useState<{ count: number; nuove: number; aggiornate: number } | null>(null);
  const [showSyncSummary, setShowSyncSummary] = useState(false);
  const [syncSummary, setSyncSummary] = useState<{ nuove: number; aggiornate: number; totali: number } | null>(null);

  // Mock stati
  const lastSync = '15 minuti fa';
  const lastImport = '10 minuti fa';

  // Filtri applicati
  const fattureFiltered = useMemo(() => {
    return fatture.filter(f => {
      if (filtroStato !== 'tutti' && f.stato !== filtroStato) return false;
      
      // Filtro date (semplificato per demo)
      if (filtroDataDa || filtroDataA) {
        // Implementare logica date reale
      }
      
      return true;
    });
  }, [fatture, filtroStato, filtroDataDa, filtroDataA]);

  // Calcola anomalie per fattura
  const getAnomalieFattura = (fattura: Fattura) => {
    const anomalie: string[] = [];
    
    if (!fattura.medicoId) {
      anomalie.push('medico_mancante');
    }
    
    // Analizza voci se esistono
    if (fattura.voci && Array.isArray(fattura.voci)) {
      fattura.voci.forEach((voce: any) => {
        // Check anomalie voce
        if (voce.anomalie && voce.anomalie.length > 0) {
          anomalie.push(...voce.anomalie);
        }
      });
    }
    
    return [...new Set(anomalie)]; // Rimuovi duplicati
  };

  // Analizza voci fattura
  const analizzaVociFattura = (voci: any[]) => {
    const prestazioni: any[] = [];
    const vociProdotto: any[] = [];
    
    voci.forEach(voce => {
      const codicePulito = voce.codice.replace(/^\d/, '');
      
      // Se contiene un '-', è un prodotto
      if (codicePulito.includes('-')) {
        vociProdotto.push(voce);
      } else {
        prestazioni.push(voce);
      }
    });
    
    // Verifica se i prodotti hanno prestazioni corrispondenti
    vociProdotto.forEach(prod => {
      const [codPrest] = prod.codice.replace(/^\d/, '').split('-');
      const hasPrestazione = prestazioni.some(p => p.codice === codPrest);
      if (!hasPrestazione) {
        prod.anomalia = 'prodotto_orfano';
      }
    });
    
    // Verifica se le prestazioni che richiedono prodotti li hanno
    prestazioni.forEach(prest => {
      const prestazione = prestazioniMap[prest.codice];
      if (prestazione?.richiedeProdotti) {
        const hasProdotti = vociProdotto.some(p => p.codice.startsWith(prest.codice));
        if (!hasProdotti) {
          prest.anomalia = 'prestazione_incompleta';
        }
      }
    });
    
    return { prestazioni, vociProdotto };
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
    
    setIsImporting(true);
    
    // Simula import
    setTimeout(() => {
      if (onImport) {
        onImport(selectedFatture);
      }
      
      const count = selectedFatture.length;
      const fattureImportate = fatture.filter(f => selectedFatture.includes(f.id));
      const nuove = fattureImportate.filter(f => f.stato === 'verificata').length;
      const aggiornate = count - nuove;
      
      // Update stato fatture
      setFatture(fatture.map(f => 
        selectedFatture.includes(f.id) 
          ? { ...f, stato: 'importata' }
          : f
      ));
      
      setImportSummary({ count, nuove, aggiornate });
      setShowImportSummary(true);
      setSelectedFatture([]);
      setIsImporting(false);
    }, 1500);
  };

  // Renderizza anomalie
  const renderAnomalie = (stato: string, anomalia?: string, voci?: any[]) => {
    if (stato !== 'anomalia') return null;
    
    const anomaliePresenti: string[] = [];
    
    if (anomalia) {
      anomaliePresenti.push(anomalia);
    }
    
    // Aggiungi anomalie dalle voci
    if (voci) {
      voci.forEach(v => {
        if (v.anomalie && v.anomalie.length > 0) {
          anomaliePresenti.push(...v.anomalie);
        }
      });
    }
    
    const anomalieMap: Record<string, { label: string; color: string }> = {
      'medico_mancante': { label: 'Medico mancante', color: 'text-red-600' },
      'prodotto_con_prezzo': { label: 'Prodotto con prezzo', color: 'text-amber-600' },
      'prestazione_incompleta': { label: 'Prodotti mancanti', color: 'text-orange-600' },
      'prodotto_orfano': { label: 'Prodotto senza prestazione', color: 'text-purple-600' },
      'prestazione_duplicata': { label: 'Prestazione duplicata', color: 'text-blue-600' }
    };
    
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {[...new Set(anomaliePresenti)].map((anomalia, idx) => {
          const config = anomalieMap[anomalia];
          if (!config) return null;
          
          return (
            <span 
              key={idx}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color} bg-gray-50`}
            >
              <AlertCircle className="w-3 h-3" />
              {config.label}
            </span>
          );
        })}
      </div>
    );
  };

  // Rimuovi voce
  const handleRemoveVoce = (fatturaId: number, voceId: number) => {
    setFatture(fatture.map(f => {
      if (f.id === fatturaId && f.voci) {
        const nuoveVoci = f.voci.filter((v: any) => v.id !== voceId);
        const totaleNetto = nuoveVoci.reduce((sum: number, v: any) => sum + (v.importoNetto || 0), 0);
        return {
          ...f,
          voci: nuoveVoci,
          imponibile: totaleNetto,
          totale: totaleNetto * 1.22
        };
      }
      return f;
    }));
  };

  // Modifica importo voce
  const handleEditImporto = (fatturaId: number, voceId: number) => {
    setFatture(fatture.map(f => {
      if (f.id === fatturaId && f.voci) {
        const voci = f.voci.map((v: any) => v.id === voceId ? { ...v, isEditing: true } : v);
        return { ...f, voci };
      }
      return f;
    }));
  };

  // Conferma modifica importo
  const handleConfirmEditImporto = (fatturaId: number, voceId: number, nuovoImporto: number) => {
    setFatture(fatture.map(f => {
      if (f.id === fatturaId && f.voci) {
        const voci = f.voci.map((v: any) => v.id === voceId ? { ...v, importoNetto: nuovoImporto, isEditing: false } : v);
        const totaleNetto = voci.reduce((sum: number, v: any) => sum + (v.importoNetto || 0), 0);
        return {
          ...f,
          voci,
          imponibile: totaleNetto,
          totale: totaleNetto * 1.22
        };
      }
      return f;
    }));
  };

  // Aggiungi voce prodotto
  const handleAddVoceProdotto = (fatturaId: number, voceProdotto: any) => {
    const prestazione = voceProdotto.prestazione;
    const prestazioneData = prestazioniMap[prestazione];
    
    if (!prestazioneData) return;
    
    setAddingVoce({ fatturaId, tipo: 'prodotto' });
  };

  // Conferma aggiunta prestazione
  const confermaAggiungiPrestazione = (data: any) => {
    if (!addingVoce) return;
    
    setFatture(fatture.map(f => {
      if (f.id === addingVoce.fatturaId && f.voci) {
        const nuovaVoce = {
          id: Date.now(),
          codice: data.prestazione,
          descrizione: prestazioniMap[data.prestazione]?.descrizione || '',
          tipo: 'prestazione' as const,
          importoNetto: parseFloat(data.importo) || 0,
          importoLordo: (parseFloat(data.importo) || 0) * 1.22,
          quantita: 1,
          unita: '',
          anomalie: []
        };
        
        const voci = [...f.voci, nuovaVoce];
        const totaleNetto = voci.reduce((sum: number, v: any) => sum + (v.importoNetto || 0), 0);
        
        return {
          ...f,
          voci,
          imponibile: totaleNetto,
          totale: totaleNetto * 1.22
        };
      }
      return f;
    }));
    
    setAddingVoce(null);
  };

  // Conferma aggiunta prodotti
  const confermaAggiungiProdotti = (data: any) => {
    if (!addingVoce) return;
    
    setFatture(fatture.map(f => {
      if (f.id === addingVoce.fatturaId && f.voci) {
        const prestazione = data.prestazione;
        const nuovaVocePrestazione = {
          id: Date.now(),
          codice: prestazione,
          descrizione: prestazioniMap[prestazione]?.descrizione || '',
          tipo: 'prestazione' as const,
          importoNetto: parseFloat(data.importoPrestazione) || 0,
          importoLordo: (parseFloat(data.importoPrestazione) || 0) * 1.22,
          quantita: 1,
          unita: '',
          anomalie: []
        };
        
        const nuoveVociProdotti = data.prodotti.map((p: any, idx: number) => ({
          id: Date.now() + idx + 1,
          codice: `${prestazione}-${p.codice}`,
          descrizione: `${prestazioniMap[prestazione]?.descrizione} - ${p.nome} ${p.quantita}${p.unita}`,
          tipo: 'prodotto' as const,
          prestazionePadre: prestazione,
          importoNetto: 0,
          importoLordo: 0,
          quantita: parseFloat(p.quantita) || 0,
          unita: p.unita,
          anomalie: []
        }));
        
        const voci = [...f.voci, nuovaVocePrestazione, ...nuoveVociProdotti];
        const totaleNetto = voci.reduce((sum: number, v: any) => sum + (v.importoNetto || 0), 0);
        
        return {
          ...f,
          voci,
          imponibile: totaleNetto,
          totale: totaleNetto * 1.22
        };
      }
      return f;
    }));
    
    setAddingVoce(null);
  };

  // Elimina voce
  const handleDeleteVoce = (fatturaId: number, voceId: number) => {
    setFatture(fatture.map(f => {
      if (f.id === fatturaId && f.voci) {
        const nuoveVoci = f.voci.filter((v: any) => v.id !== voceId);
        const totaleNetto = nuoveVoci.reduce((sum: number, v: any) => sum + (v.importoNetto || 0), 0);
        return {
          ...f,
          voci: nuoveVoci,
          imponibile: totaleNetto,
          totale: totaleNetto * 1.22
        };
      }
      return f;
    }));
  };

  // Paginazione
  const paginatedFatture = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return fattureFiltered.slice(startIndex, startIndex + itemsPerPage);
  }, [fattureFiltered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(fattureFiltered.length / itemsPerPage);

  // Calcola totali
  const totalsGlobal = fattureFiltered.reduce((acc, f) => ({
    lordo: acc.lordo + (f.totale || 0),
    netto: acc.netto + (f.imponibile || 0),
    iva: acc.iva + (f.iva || 0)
  }), { lordo: 0, netto: 0, iva: 0 });

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
      // Vista raggruppata per paziente
      const fattureByPaziente = paginatedFatture.reduce((acc: any, fattura) => {
        if (!acc[fattura.paziente]) {
          acc[fattura.paziente] = [];
        }
        acc[fattura.paziente].push(fattura);
        return acc;
      }, {});
      
      return Object.entries(fattureByPaziente).map(([paziente, fattureGroup]) => (
        <React.Fragment key={paziente}>
          <tr className="bg-gray-50">
            <td colSpan={10} className="px-6 py-3 text-sm font-semibold text-gray-900">
              {paziente} ({(fattureGroup as any[]).length} fatture)
            </td>
          </tr>
          {(fattureGroup as any[]).map(fattura => renderFatturaRow(fattura, true))}
        </React.Fragment>
      ));
    }
    
    return paginatedFatture.map(fattura => renderFatturaRow(fattura));
  };

  // Render singola riga fattura
  const renderFatturaRow = (fattura: Fattura, indented = false) => {
    const anomalie = getAnomalieFattura(fattura);
    const hasAnomalie = anomalie.length > 0;
    
    return (
      <tr key={fattura.id} className={`hover:bg-gray-50 ${indented ? 'pl-8' : ''}`}>
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
          {fattura.data}
        </td>
        <td className="px-6 py-4 text-sm text-gray-900">
          <div className="flex items-start gap-2">
            <span>{fattura.paziente}</span>
            <button className="text-[#03A6A6] hover:text-[#028a8a]">
              <Eye className="w-4 h-4" />
            </button>
          </div>
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
            <div className="text-xs text-gray-500">+IVA € {fattura.iva.toFixed(2)}</div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
          € {fattura.totale.toFixed(2)}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              fattura.stato === 'verificata' ? 'bg-green-100 text-green-800' :
              fattura.stato === 'anomalia' ? 'bg-red-100 text-red-800' :
              fattura.stato === 'importata' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {fattura.stato === 'verificata' && <Check className="w-3 h-3 mr-1" />}
              {fattura.stato === 'anomalia' && <X className="w-3 h-3 mr-1" />}
              {fattura.stato === 'importata' && <FileText className="w-3 h-3 mr-1" />}
              {fattura.stato}
            </span>
            {hasAnomalie && renderAnomalie('anomalia', undefined, fattura.voci)}
          </div>
        </td>
        <td className="px-6 py-4 text-sm">
          <button
            onClick={() => {/* Expand/collapse voci */}}
            className="text-[#03A6A6] hover:text-[#028a8a]"
          >
            Vedi dettagli
          </button>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <button className="text-gray-400 hover:text-gray-600">
            <ChevronRight className="w-5 h-5" />
          </button>
        </td>
      </tr>
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
                  onChange={(e) => setFiltroDataDa(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                  placeholder="Data da"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="date"
                  value={filtroDataA}
                  onChange={(e) => setFiltroDataA(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                  placeholder="Data a"
                />
              </div>
              
              <button
                onClick={() => setVistaRaggruppata(!vistaRaggruppata)}
                className={`px-3 py-2 text-sm rounded-lg border ${
                  vistaRaggruppata 
                    ? 'bg-[#03A6A6] text-white border-[#03A6A6]' 
                    : 'bg-white text-gray-700 border-gray-300'
                } hover:border-[#03A6A6] transition-colors`}
              >
                Vista raggruppata
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
    </div>
  );
};

export default ImportFatture;