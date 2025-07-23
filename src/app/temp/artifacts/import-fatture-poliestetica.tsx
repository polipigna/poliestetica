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
  parseCodiceFattura, 
  prestazioneRichiedeProdotti,
  getProdottiValidiPerPrestazione,
  combinazioni,
  macchinari
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
  onRegenerate
}) => {
  // Usa le fatture dai props
  const [fatture, setFatture] = useState<FatturaConVoci[]>(fattureProps);
  
  // REMOVED - Will be added after getAnomalieFattura is defined
  
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
  const [filtroAnomalia, setFiltroAnomalia] = useState('tutte');
  const [filtroMedico, setFiltroMedico] = useState('tutti');
  const [filtroSerie, setFiltroSerie] = useState('tutte');
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
  const [showCorreggiCodiceModal, setShowCorreggiCodiceModal] = useState<{ fatturaId: number; voceId: number; codiceAttuale: string } | null>(null);
  const [filtroRiepilogoMedico, setFiltroRiepilogoMedico] = useState('tutti');
  const [filtroRiepilogoSerie, setFiltroRiepilogoSerie] = useState('tutte');

  // Mock stati
  const lastSync = '15 minuti fa';

  // Funzione per verificare anomalie voci - Mossa prima di useMemo per evitare hoisting issues
  const verificaAnomalieVoce = useMemo(() => {
    return (voce: VoceFatturaEstesa, voci: VoceFatturaEstesa[]): string[] => {
    const anomalie: string[] = [];
    
    // Controlla se è un prodotto o prestazione
    const parsed = parseCodiceFattura(voce.codice);
    if (!parsed.valido) {
      return ['codice_sconosciuto'];
    }
    
    if (parsed.isProdotto) {
      // Controllo prodotto con prezzo
      if (voce.importoNetto > 0) {
        anomalie.push('prodotto_con_prezzo');
      }
      
      // Controllo prodotto orfano
      const prestazionePadre = voci.find(v => 
        v.codice === parsed.prestazione && parseCodiceFattura(v.codice).isPrestazione
      );
      if (!prestazionePadre) {
        anomalie.push('prodotto_orfano');
      }
      
      // Controllo unità di misura
      if (parsed.accessorio) {
        const prodotto = prodottiMap[parsed.accessorio];
        if (prodotto && voce.unita !== prodotto.unita) {
          anomalie.push('unita_incompatibile');
        }
        
        // Controllo quantità anomala
        // Usa sogliaAnomalia dal prodotto se disponibile
        if (prodotto && prodotto.sogliaAnomalia && voce.quantita > prodotto.sogliaAnomalia) {
          anomalie.push('quantita_anomala');
        }
      }
    } else if (parsed.isPrestazione) {
      // Controllo prestazione che richiede prodotti
      const prestazione = prestazioniMap[voce.codice];
      if (prestazione && prestazioneRichiedeProdotti(voce.codice)) {
        const prodottiTrovati = voci.filter(v => {
          const p = parseCodiceFattura(v.codice);
          return p.isProdotto && p.prestazione === voce.codice;
        });
        
        if (prodottiTrovati.length === 0) {
          anomalie.push('prestazione_incompleta');
        }
      }
      
      // Controllo prestazione duplicata
      const duplicati = voci.filter(v => v.codice === voce.codice && v.id !== voce.id);
      if (duplicati.length > 0) {
        anomalie.push('prestazione_duplicata');
      }
    }

    return anomalie;
    };
  }, [prodottiMap, prestazioniMap]);

  // Calcola anomalie per fattura - Mossa prima di useMemo per evitare hoisting issues
  const getAnomalieFattura = useMemo(() => {
    return (fattura: FatturaConVoci) => {
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
  }, [prodottiMap, prestazioniMap, verificaAnomalieVoce]);
  
  // Aggiorna fatture con anomalie quando cambiano i props o le dipendenze
  useEffect(() => {
    const fattureConAnomalie = fattureProps.map(f => {
      const anomalie = getAnomalieFattura(f);
      const stato = anomalie.length > 0 ? 'anomalia' : (f.stato === 'importata' ? 'importata' : 'da_importare');
      return { ...f, stato: stato as any, anomalie };
    });
    setFatture(fattureConAnomalie);
  }, [fattureProps, getAnomalieFattura]);
  
  // Conteggio filtri attivi
  const filtriAttivi = useMemo(() => {
    let count = 0;
    if (filtroStato !== 'tutti') count++;
    if (filtroAnomalia !== 'tutte') count++;
    if (filtroMedico !== 'tutti') count++;
    if (filtroSerie !== 'tutte') count++;
    if (filtroDataDa || filtroDataA) count++;
    return count;
  }, [filtroStato, filtroAnomalia, filtroMedico, filtroSerie, filtroDataDa, filtroDataA]);
  
  // Reset filtri
  const resetFiltri = () => {
    setFiltroStato('tutti');
    setFiltroAnomalia('tutte');
    setFiltroMedico('tutti');
    setFiltroSerie('tutte');
    setFiltroDataDa('');
    setFiltroDataA('');
  };
  
  // Filtri applicati
  const fattureFiltered = useMemo(() => {
    return fatture.filter(f => {
      // Filtro stato
      if (filtroStato !== 'tutti' && f.stato !== filtroStato) return false;
      
      // Filtro anomalia
      if (filtroAnomalia !== 'tutte') {
        const anomalieFattura = getAnomalieFattura(f);
        if (filtroAnomalia === 'senza_anomalie' && anomalieFattura.length > 0) return false;
        if (filtroAnomalia !== 'senza_anomalie' && !anomalieFattura.includes(filtroAnomalia)) return false;
      }
      
      // Filtro medico
      if (filtroMedico !== 'tutti') {
        if (filtroMedico === 'non_assegnato' && f.medicoId) return false;
        if (filtroMedico !== 'non_assegnato' && f.medicoId?.toString() !== filtroMedico) return false;
      }
      
      // Filtro serie
      if (filtroSerie !== 'tutte' && f.serie !== filtroSerie) return false;
      
      // Filtro date
      if (filtroDataDa || filtroDataA) {
        const dataString = f.data || f.dataEmissione;
        if (!dataString) return true;
        
        const dataFattura = new Date(dataString);
        
        if (filtroDataDa) {
          const dataDa = new Date(filtroDataDa);
          if (dataFattura < dataDa) return false;
        }
        
        if (filtroDataA) {
          const dataA = new Date(filtroDataA);
          dataA.setHours(23, 59, 59, 999);
          if (dataFattura > dataA) return false;
        }
      }
      
      return true;
    });
  }, [fatture, filtroStato, filtroDataDa, filtroDataA, filtroAnomalia, filtroMedico, filtroSerie, getAnomalieFattura]);


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

  // Calcola stati count sempre dalle fatture locali per avere i numeri aggiornati
  const statiCount = useMemo(() => {
    return fatture.reduce((acc, f) => {
      const stato = f.stato || 'da_importare';
      acc[stato] = (acc[stato] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [fatture]);


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
    setFatture(fatture.map(f => {
      if (selectedFatture.includes(f.id)) {
        // Rimuovi anomalia medico_mancante se presente
        const nuoveAnomalie = (f.anomalie || []).filter(a => a !== 'medico_mancante');
        const stato = nuoveAnomalie.length > 0 ? 'anomalia' : 'da_importare';
        
        const updatedFattura = { 
          ...f, 
          medicoId, 
          medicoNome, 
          anomalie: nuoveAnomalie,
          stato: stato as any 
        };
        
        if (onUpdateFattura) {
          onUpdateFattura(f.id, updatedFattura);
        }
        
        return updatedFattura;
      }
      return f;
    }));
    
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
        const stato = anomalie.length > 0 ? 'anomalia' : 'da_importare';
        
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
        const stato = anomalie.length > 0 ? 'anomalia' : 'da_importare';
        
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
        const stato = anomalie.length > 0 ? 'anomalia' : 'da_importare';
        
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
        const stato = anomalie.length > 0 ? 'anomalia' : 'da_importare';
        
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
    setFatture(fatture.map(f => {
      if (f.id === fatturaId && f.voci) {
        const voci = f.voci.map(v => 
          v.id === voceId ? { ...v, unita: unitaCorretta } : v
        );
        
        const anomalie = getAnomalieFattura({ ...f, voci });
        const stato = anomalie.length > 0 ? 'anomalia' : 'da_importare';
        
        const updatedFattura = { ...f, voci, anomalie, stato: stato as any };
        
        if (onUpdateFattura) {
          onUpdateFattura(fatturaId, updatedFattura);
        }
        
        return updatedFattura;
      }
      return f;
    }));
  };

  // Handler per correggere quantità
  const handleCorreggiQuantita = (fatturaId: number, voceId: number, nuovaQuantita: number) => {
    setFatture(fatture.map(f => {
      if (f.id === fatturaId && f.voci) {
        const voci = f.voci.map(v => 
          v.id === voceId ? { ...v, quantita: nuovaQuantita } : v
        );
        
        const anomalie = getAnomalieFattura({ ...f, voci });
        const stato = anomalie.length > 0 ? 'anomalia' : 'da_importare';
        
        const updatedFattura = { ...f, voci, anomalie, stato: stato as any };
        
        if (onUpdateFattura) {
          onUpdateFattura(fatturaId, updatedFattura);
        }
        
        return updatedFattura;
      }
      return f;
    }));
    setQuantitaTemp(null);
  };

  // Handler per approvare quantità anomala
  const handleApprovaQuantitaAnomala = (fatturaId: number, voceId: number) => {
    setFatture(fatture.map(f => {
      if (f.id === fatturaId && f.voci) {
        const voci = f.voci.map(v => {
          if (v.id === voceId) {
            // Rimuovi l'anomalia quantita_anomala dalla voce
            const anomalieFiltrate = v.anomalie.filter(a => a !== 'quantita_anomala');
            return { ...v, anomalie: anomalieFiltrate };
          }
          return v;
        });
        
        // Ricalcola le anomalie della fattura
        const anomalie = getAnomalieFattura({ ...f, voci });
        const stato = anomalie.length > 0 ? 'anomalia' : 'da_importare';
        
        const updatedFattura = { ...f, voci, anomalie, stato: stato as any };
        
        if (onUpdateFattura) {
          onUpdateFattura(fatturaId, updatedFattura);
        }
        
        return updatedFattura;
      }
      return f;
    }));
  };

  // Handler per correggere codice
  const handleCorreggiCodice = (fatturaId: number, voceId: number, nuovoCodice: string) => {
    setFatture(fatture.map(f => {
      if (f.id === fatturaId && f.voci) {
        const voci = f.voci.map(v => {
          if (v.id === voceId) {
            let nuovaDescrizione = v.descrizione;
            let nuovoTipo: 'prestazione' | 'prodotto' = v.tipo || 'prestazione';
            
            // Prima cerca nelle combinazioni per capire il tipo
            const combinazione = combinazioni.find(c => c.codice === nuovoCodice);
            
            if (combinazione) {
              if (combinazione.tipo === 'prestazione') {
                // È una prestazione semplice
                const prestazione = prestazioniMap[combinazione.prestazione!];
                if (prestazione) {
                  nuovaDescrizione = prestazione.descrizione;
                  nuovoTipo = 'prestazione';
                }
              } else if (combinazione.tipo === 'prestazione+prodotto') {
                // È un prodotto
                const prestazione = prestazioniMap[combinazione.prestazione!];
                const prodotto = prodottiMap[combinazione.accessorio!];
                if (prestazione && prodotto) {
                  nuovaDescrizione = `${prestazione.descrizione} - ${prodotto.nome}`;
                  nuovoTipo = 'prodotto';
                }
              } else if (combinazione.tipo === 'prestazione+macchinario') {
                // È un macchinario
                const prestazione = prestazioniMap[combinazione.prestazione!];
                const macchinario = macchinari.find(m => m.codice === combinazione.accessorio);
                if (prestazione && macchinario) {
                  nuovaDescrizione = `${prestazione.descrizione} - ${macchinario.nome}`;
                  nuovoTipo = 'prestazione'; // I macchinari sono trattati come prestazioni
                }
              }
            }
            
            return { ...v, codice: nuovoCodice, descrizione: nuovaDescrizione, tipo: nuovoTipo };
          }
          return v;
        });
        
        // Ricalcola importi se necessario
        const totaleNetto = voci.reduce((sum, v) => sum + (v.importoNetto || 0), 0);
        const totaleIva = totaleNetto * 0.22;
        
        const anomalie = getAnomalieFattura({ ...f, voci });
        const stato = anomalie.length > 0 ? 'anomalia' : 'da_importare';
        
        const updatedFattura = { 
          ...f, 
          voci, 
          anomalie, 
          stato: stato as any,
          imponibile: totaleNetto,
          iva: totaleIva,
          totale: totaleNetto + totaleIva
        };
        
        if (onUpdateFattura) {
          onUpdateFattura(fatturaId, updatedFattura);
        }
        
        return updatedFattura;
      }
      return f;
    }));
    setShowCorreggiCodiceModal(null);
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
      const nuove = fattureImportate.filter(f => f.stato === 'da_importare').length;
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
  const renderAnomalie = (anomalie: string[], fatturaId?: number) => {
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
            <div key={idx} className="flex items-center gap-2">
              <span 
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 ${config.color}`}
              >
                <Icon className="w-3 h-3" />
                {config.label}
              </span>
              {anomalia === 'medico_mancante' && fatturaId && (
                <select
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                  onChange={(e) => {
                    const medicoId = parseInt(e.target.value);
                    if (medicoId && onUpdateFattura) {
                      const medico = medici.find(m => m.id === medicoId);
                      if (medico) {
                        const nuoveAnomalie = anomalie.filter(a => a !== 'medico_mancante');
                        onUpdateFattura(fatturaId, { 
                          medicoId, 
                          medicoNome: `${medico.nome} ${medico.cognome}`,
                          anomalie: nuoveAnomalie,
                          stato: nuoveAnomalie.length > 0 ? 'anomalia' : 'da_importare'
                        });
                      }
                    }
                  }}
                >
                  <option value="">Seleziona medico...</option>
                  {medici.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nome} {m.cognome}
                    </option>
                  ))}
                </select>
              )}
            </div>
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

  // Calcola riepilogo dati
  const riepilogoMensile = useMemo(() => {
    const totaleFatture = fatture.length;
    const totaleImportate = fatture.filter(f => f.stato === 'importata').length;
    
    const totali = fatture.reduce((acc, f) => {
      const imponibile = f.imponibile || 0;
      const serie = f.serie || 'P';
      
      // Calcola IVA in base alla serie - Solo serie "IVA" ha l'IVA
      const iva = (serie === 'IVA') ? imponibile * 0.22 : 0;
      const lordo = imponibile + iva;
      
      return {
        imponibile: acc.imponibile + imponibile,
        iva: acc.iva + iva,
        lordo: acc.lordo + lordo
      };
    }, { imponibile: 0, iva: 0, lordo: 0 });
    
    // Riepilogo per medico
    const perMedico = fatture.reduce((acc, f) => {
      const medico = f.medicoNome || 'Non assegnato';
      const imponibile = f.imponibile || 0;
      const serie = f.serie || 'P';
      
      // Calcola IVA in base alla serie - Solo serie "IVA" ha l'IVA
      const iva = (serie === 'IVA') ? imponibile * 0.22 : 0;
      const lordo = imponibile + iva;
      
      if (!acc[medico]) {
        acc[medico] = { count: 0, imponibile: 0, iva: 0, lordo: 0 };
      }
      acc[medico].count++;
      acc[medico].imponibile += imponibile;
      acc[medico].iva += iva;
      acc[medico].lordo += lordo;
      return acc;
    }, {} as Record<string, { count: number; imponibile: number; iva: number; lordo: number }>);
    
    // Riepilogo per serie
    const perSerie = fatture.reduce((acc, f) => {
      const serie = f.serie || 'P';
      if (!acc[serie]) {
        acc[serie] = { count: 0, imponibile: 0, iva: 0, lordo: 0 };
      }
      acc[serie].count++;
      acc[serie].imponibile += f.imponibile || 0;
      
      // Solo serie "IVA" ha l'IVA 22%
      if (serie === 'IVA') {
        const ivaCalcolata = (f.imponibile || 0) * 0.22;
        acc[serie].iva += ivaCalcolata;
        acc[serie].lordo += (f.imponibile || 0) + ivaCalcolata;
      } else {
        // Serie P e M sono esenti IVA
        acc[serie].iva += 0;
        acc[serie].lordo += f.imponibile || 0; // Lordo = Imponibile per serie esente
      }
      
      return acc;
    }, {} as Record<string, { count: number; imponibile: number; iva: number; lordo: number }>);
    
    return {
      totaleFatture,
      totaleImportate,
      totali,
      perMedico,
      perSerie
    };
  }, [fatture]);

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
                                  <span className="text-xs text-gray-600">
                                    Soglia: {parsed.accessorio ? prodottiMap[parsed.accessorio]?.sogliaAnomalia : 'n/a'}
                                  </span>
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
                                  <button
                                    onClick={() => handleApprovaQuantitaAnomala(fattura.id, voce.id)}
                                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                  >
                                    Approva
                                  </button>
                                </div>
                              )}
                              {anomalieVoce.includes('codice_sconosciuto') && (
                                <button
                                  onClick={() => setShowCorreggiCodiceModal({ fatturaId: fattura.id, voceId: voce.id, codiceAttuale: voce.codice })}
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
    
    // Debug: verifica coerenza stato/anomalie
    if (fattura.stato === 'anomalia' && !hasAnomalie) {
      console.warn(`Fattura ${fattura.numero} ha stato 'anomalia' ma nessuna anomalia rilevata`);
    }
    
    return (
      <React.Fragment key={fattura.id}>
        <tr className={`hover:bg-gray-50 ${indented ? 'pl-8' : ''}`}>
          <td className="px-6 py-4 whitespace-nowrap">
            <input
              type="checkbox"
              checked={selectedFatture.includes(fattura.id)}
              onChange={() => handleSelectFattura(fattura.id)}
              disabled={fattura.stato === 'importata' || hasAnomalie}
              className="rounded border-gray-300 text-[#03A6A6] focus:ring-[#03A6A6] disabled:opacity-50 disabled:cursor-not-allowed"
              title={hasAnomalie ? 'Non selezionabile - correggere anomalie prima dell\'importazione' : ''}
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
              {fattura.serie === 'IVA' && (
                <div className="text-xs text-gray-500">+IVA € {(fattura.iva || 0).toFixed(2)}</div>
              )}
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
            € {fattura.totale.toFixed(2)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex flex-col gap-1">
              {renderStatoBadge(fattura.stato || 'da_importare')}
              {hasAnomalie && renderAnomalie(anomalie, fattura.id)}
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

  // Modal per correggere codice
  const ModalCorreggiCodice: React.FC<{
    codiceAttuale: string;
    onConfirm: (nuovoCodice: string) => void;
    onCancel: () => void;
  }> = ({ codiceAttuale, onConfirm, onCancel }) => {
    const [nuovoCodice, setNuovoCodice] = useState(codiceAttuale);
    
    const isValidCode = (code: string) => {
      // Confronta il codice completo, non rimuovere la cifra iniziale
      return combinazioni.some(c => c.codice === code);
    };
    
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
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nuovo codice
            </label>
            <input
              type="text"
              value={nuovoCodice}
              onChange={(e) => setNuovoCodice(e.target.value.toUpperCase())}
              className={`w-full px-3 py-2 border rounded-lg text-sm font-mono ${
                isValidCode(nuovoCodice) 
                  ? 'border-green-500 focus:ring-green-500' 
                  : 'border-gray-300 focus:ring-[#03A6A6]'
              } focus:border-transparent focus:ring-2`}
              placeholder="Es: RT, RTGG01, EM..."
            />
            {nuovoCodice && (
              <p className={`mt-1 text-xs ${isValidCode(nuovoCodice) ? 'text-green-600' : 'text-red-600'}`}>
                {isValidCode(nuovoCodice) ? '✓ Codice valido' : '✗ Codice non trovato nel database'}
              </p>
            )}
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Annulla
            </button>
            <button
              onClick={() => onConfirm(nuovoCodice)}
              disabled={!isValidCode(nuovoCodice)}
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
              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={() => {
                    if (onRegenerate && confirm('Vuoi generare 200 fatture di test (56 con anomalie, 7 per tipo)? Questo sostituirà i dati attuali.')) {
                      onRegenerate('test-anomalie');
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset Demo
                </button>
              )}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { key: 'da_importare', label: 'Da importare', color: 'bg-gray-100 text-gray-800' },
            { key: 'anomalia', label: 'Con anomalie', color: 'bg-red-100 text-red-800' },
            { key: 'importata', label: 'Importate', color: 'bg-blue-100 text-blue-800' }
          ].map(stato => {
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
          <div className="flex flex-col gap-4">
            {/* Prima riga: Filtri principali */}
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={filtroStato}
                onChange={(e) => setFiltroStato(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
              >
                <option value="tutti">Tutti gli stati</option>
                <option value="da_importare">Da importare</option>
                <option value="anomalia">Con anomalie</option>
                <option value="importata">Importate</option>
              </select>
              
              <select
                value={filtroAnomalia}
                onChange={(e) => setFiltroAnomalia(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
              >
                <option value="tutte">Tutte le anomalie</option>
                <option value="senza_anomalie">Senza anomalie</option>
                <option value="medico_mancante">Medico mancante</option>
                <option value="prodotto_con_prezzo">Prodotto con prezzo</option>
                <option value="prodotto_orfano">Prodotto orfano</option>
                <option value="prestazione_incompleta">Prestazione incompleta</option>
                <option value="prestazione_duplicata">Prestazione duplicata</option>
                <option value="codice_sconosciuto">Codice sconosciuto</option>
                <option value="unita_incompatibile">Unità incompatibile</option>
                <option value="quantita_anomala">Quantità anomala</option>
              </select>
              
              <select
                value={filtroMedico}
                onChange={(e) => setFiltroMedico(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
              >
                <option value="tutti">Tutti i medici</option>
                <option value="non_assegnato">Non assegnato</option>
                {medici.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.nome} {m.cognome}
                  </option>
                ))}
              </select>
              
              <select
                value={filtroSerie}
                onChange={(e) => setFiltroSerie(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
              >
                <option value="tutte">Tutte le serie</option>
                <option value="P">Serie P (Principale)</option>
                <option value="IVA">Serie IVA</option>
                <option value="M">Serie M (Milano)</option>
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
              
              {filtriAttivi > 0 && (
                <button
                  onClick={resetFiltri}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Reset filtri ({filtriAttivi})
                </button>
              )}
            </div>
            
            {/* Seconda riga: Azioni e vista */}
            <div className="flex items-center justify-between">
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
            </div>
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

      {/* Riepilogo Mensile */}
      <div className="px-6 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Riepilogo Mensile</h3>
          
          {/* Totali Generali */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Totale Fatture</p>
                  <p className="text-2xl font-bold text-gray-900">{riepilogoMensile.totaleFatture}</p>
                </div>
                <div className="p-3 bg-gray-200 rounded-full">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Importate</p>
                  <p className="text-2xl font-bold text-blue-900">{riepilogoMensile.totaleImportate}</p>
                </div>
                <div className="p-3 bg-blue-200 rounded-full">
                  <Check className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Imponibile</p>
                  <p className="text-2xl font-bold text-green-900">€ {riepilogoMensile.totali.imponibile.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-green-200 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600">IVA</p>
                  <p className="text-2xl font-bold text-yellow-900">€ {riepilogoMensile.totali.iva.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-yellow-200 rounded-full">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">Lordo Totale</p>
                  <p className="text-2xl font-bold text-purple-900">€ {riepilogoMensile.totali.lordo.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-purple-200 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          {/* Filtri Riepilogo */}
          <div className="flex gap-4 mb-4">
            <select
              value={filtroRiepilogoMedico}
              onChange={(e) => setFiltroRiepilogoMedico(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
            >
              <option value="tutti">Tutti i medici</option>
              {Object.keys(riepilogoMensile.perMedico).map(medico => (
                <option key={medico} value={medico}>{medico}</option>
              ))}
            </select>
            
            <select
              value={filtroRiepilogoSerie}
              onChange={(e) => setFiltroRiepilogoSerie(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
            >
              <option value="tutte">Tutte le serie</option>
              {Object.keys(riepilogoMensile.perSerie).map(serie => (
                <option key={serie} value={serie}>Serie {serie}</option>
              ))}
            </select>
          </div>
          
          {/* Riepilogo Dettagliato */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Per Medico */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Riepilogo per Medico</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {Object.entries(riepilogoMensile.perMedico)
                  .filter(([medico]) => filtroRiepilogoMedico === 'tutti' || medico === filtroRiepilogoMedico)
                  .sort(([, a], [, b]) => b.lordo - a.lordo)
                  .map(([medico, dati]) => (
                    <div key={medico} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{medico}</p>
                        <p className="text-sm text-gray-600">{dati.count} fatture</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">€ {dati.lordo.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">Netto: € {dati.imponibile.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            
            {/* Per Serie */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Riepilogo per Serie</h4>
              <div className="space-y-2">
                {Object.entries(riepilogoMensile.perSerie)
                  .filter(([serie]) => filtroRiepilogoSerie === 'tutte' || serie === filtroRiepilogoSerie)
                  .map(([serie, dati]) => (
                    <div key={serie} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">Serie {serie.toUpperCase()}</p>
                        <p className="text-sm text-gray-600">{dati.count} fatture</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">€ {dati.lordo.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">IVA: € {dati.iva.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-8">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              <p>Sistema Import Fatture Poliestetica v1.0</p>
            </div>
            <div className="flex items-center gap-4">
              <span>© 2024 Poliestetica</span>
              <span className="text-gray-400">•</span>
              <span>Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}</span>
            </div>
          </div>
        </div>
      </footer>

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
                  <span className="font-medium">{m.nome} {m.cognome}</span>
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
      
      {/* Modal Correggi Codice */}
      {showCorreggiCodiceModal && (
        <ModalCorreggiCodice
          codiceAttuale={showCorreggiCodiceModal.codiceAttuale}
          onConfirm={(nuovoCodice) => handleCorreggiCodice(showCorreggiCodiceModal.fatturaId, showCorreggiCodiceModal.voceId, nuovoCodice)}
          onCancel={() => setShowCorreggiCodiceModal(null)}
        />
      )}
    </div>
  );
}

export default ImportFatture;