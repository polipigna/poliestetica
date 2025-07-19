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

// Configurazione prestazioni (in produzione verrà da DB/API)
const configPrestazioni = {
  'BTX': { descrizione: 'Botox viso', richiedeProdotti: true },
  'FLL': { descrizione: 'Filler labbra', richiedeProdotti: true },
  'FLG': { descrizione: 'Filler guance', richiedeProdotti: true },
  'BRV': { descrizione: 'Biorivitalizzazione', richiedeProdotti: true },
  'CNS': { descrizione: 'Consulenza estetica', richiedeProdotti: false },
  'PEL': { descrizione: 'Peeling chimico', richiedeProdotti: false },
  'VIS': { descrizione: 'Visita specialistica', richiedeProdotti: false }
};

// Prodotti disponibili per prestazione (in produzione da API)
const prodottiPerPrestazione = {
  'BTX': [
    { codice: 'ALL', nome: 'Allergan', unita: 'fiale' },
    { codice: 'XEO', nome: 'Xeomin', unita: 'fiale' },
    { codice: 'DYS', nome: 'Dysport', unita: 'fiale' }
  ],
  'FLL': [
    { codice: 'JUV', nome: 'Juvederm', unita: 'ml' },
    { codice: 'RES', nome: 'Restylane', unita: 'ml' },
    { codice: 'SUR', nome: 'Surgiderm', unita: 'ml' }
  ],
  'FLG': [
    { codice: 'JUV', nome: 'Juvederm Voluma', unita: 'ml' },
    { codice: 'RES', nome: 'Restylane Lyft', unita: 'ml' }
  ],
  'BRV': [
    { codice: 'PRF', nome: 'Profhilo', unita: 'fiale' },
    { codice: 'NUC', nome: 'Nucleofill', unita: 'fiale' }
  ]
};

// Import Fatture Component
const ImportFatture = ({ handleMenuClick, currentUser }) => {
  const medici = [
    { id: 1, nome: 'Dott.ssa Scutari' },
    { id: 2, nome: 'Dott. Rossi' },
    { id: 3, nome: 'Dott. Verdi' },
    { id: 4, nome: 'Dott.ssa Bianchi' }
  ];

  const [fatture, setFatture] = useState([
    { 
      id: 1, 
      numero: 'FT/2024/1251', 
      data: '20/12/2024', 
      paziente: 'Mario Rossi', 
      medico: 'Dott.ssa Scutari', 
      importoLordo: 900, 
      importoNetto: 737.70, 
      iva: 162.30, 
      stato: 'verificata', 
      serie: 'principale', 
      voci: [
        { id: 1, codice: 'BTX', descrizione: 'Botox viso', quantita: 1, unita: null, importoNetto: 286.89 },
        { id: 2, codice: 'BTX-ALL', descrizione: 'BOTOX VISO - ALLERGAN 2 fiale', quantita: 2, unita: 'fiale', importoNetto: 0 },
        { id: 3, codice: 'BTX-XEO', descrizione: 'BOTOX VISO - XEOMIN 1 fiala', quantita: 1, unita: 'fiala', importoNetto: 0 },
        { id: 4, codice: 'CNS', descrizione: 'Consulenza estetica', quantita: 1, unita: null, importoNetto: 122.95 },
        { id: 5, codice: 'FLL', descrizione: 'Filler labbra', quantita: 1, unita: null, importoNetto: 327.86 },
        { id: 6, codice: 'FLL-JUV', descrizione: 'FILLER LABBRA - JUVEDERM 2ml', quantita: 2, unita: 'ml', importoNetto: 0 }
      ] 
    },
    { 
      id: 2, 
      numero: 'FT/2024/1252', 
      data: '20/12/2024', 
      paziente: 'Laura Bianchi', 
      medico: null, 
      importoLordo: 850, 
      importoNetto: 696.72, 
      iva: 153.28, 
      stato: 'anomalia', 
      anomalia: 'medico_mancante',
      serie: 'principale', 
      voci: [
        { id: 7, codice: 'BTX', descrizione: 'Botox viso', quantita: 1, unita: null, importoNetto: 286.89 },
        { id: 8, codice: 'BTX-ALL', descrizione: 'BOTOX VISO - ALLERGAN 2 fiale', quantita: 2, unita: 'fiale', importoNetto: 0 },
        { id: 9, codice: 'BTX-XEO', descrizione: 'BOTOX VISO - XEOMIN 1 fiala', quantita: 1, unita: 'fiala', importoNetto: 40.98, anomalia: 'prodotto_con_prezzo' },
        { id: 10, codice: 'FLL', descrizione: 'Filler labbra', quantita: 1, unita: null, importoNetto: 327.86, anomalia: 'prestazione_incompleta' },
        { id: 11, codice: 'FLL-JUV', descrizione: 'FILLER LABBRA - JUVEDERM 2ml', quantita: 2, unita: 'ml', importoNetto: 163.93, anomalia: 'prodotto_orfano' }
      ] 
    },
    { 
      id: 3, 
      numero: 'FT/2024/853IVA', 
      data: '20/12/2024', 
      paziente: 'Giuseppe Verdi', 
      medico: 'Dott. Rossi', 
      importoLordo: 450, 
      importoNetto: 450, 
      iva: 0, 
      stato: 'verificata', 
      serie: 'IVA', 
      voci: [
        { id: 12, codice: 'VIS', descrizione: 'Visita specialistica', quantita: 1, unita: null, importoNetto: 150 },
        { id: 13, codice: 'BRV', descrizione: 'Biorivitalizzazione', quantita: 1, unita: null, importoNetto: 300 },
        { id: 14, codice: 'BRV-PRF', descrizione: 'BIORIVITALIZZAZIONE - PROFHILO 2 fiale', quantita: 2, unita: 'fiale', importoNetto: 0 }
      ] 
    },
    { 
      id: 4, 
      numero: 'FT/2024/1253', 
      data: '21/12/2024', 
      paziente: 'Anna Rosa', 
      medico: 'Dott.ssa Bianchi', 
      importoLordo: 750, 
      importoNetto: 614.75, 
      iva: 135.25, 
      stato: 'anomalia',
      serie: 'principale', 
      voci: [
        { id: 15, codice: 'FLL', descrizione: 'Filler labbra', quantita: 1, unita: null, importoNetto: 327.86 },
        { id: 16, codice: 'FLL', descrizione: 'Filler labbra', quantita: 1, unita: null, importoNetto: 286.89, anomalia: 'prestazione_duplicata' }
      ] 
    },
    // Fatture aggiuntive per testare paginazione
    ...Array.from({ length: 30 }, (_, i) => ({
      id: 10 + i,
      numero: `FT/2024/${1260 + i}`,
      data: `${20 + Math.floor(i / 10)}/12/2024`,
      paziente: `Paziente ${i + 1}`,
      medico: i % 3 === 0 ? null : medici[i % 4]?.nome,
      importoLordo: 300 + (i * 50),
      importoNetto: (300 + (i * 50)) * 0.82,
      iva: (300 + (i * 50)) * 0.18,
      stato: i % 4 === 0 ? 'anomalia' : 'verificata',
      anomalia: i % 4 === 0 ? 'medico_mancante' : null,
      serie: i % 10 === 0 ? 'IVA' : 'principale',
      voci: i % 2 === 0 ? [
        {
          id: 100 + i * 3,
          codice: ['BTX', 'FLL', 'BRV'][i % 3],
          descrizione: ['Botox viso', 'Filler labbra', 'Biorivitalizzazione'][i % 3],
          quantita: 1,
          unita: null,
          importoNetto: (300 + (i * 50)) * 0.82
        }
      ] : [
        {
          id: 100 + i * 3,
          codice: ['BTX', 'FLL', 'BRV'][i % 3],
          descrizione: ['Botox viso', 'Filler labbra', 'Biorivitalizzazione'][i % 3],
          quantita: 1,
          unita: null,
          importoNetto: (300 + (i * 50)) * 0.82
        },
        {
          id: 101 + i * 3,
          codice: ['BTX-ALL', 'FLL-JUV', 'BRV-PRF'][i % 3],
          descrizione: ['BOTOX VISO - ALLERGAN 2 fiale', 'FILLER LABBRA - JUVEDERM 2ml', 'BIORIVITALIZZAZIONE - PROFHILO 1 fiala'][i % 3],
          quantita: [2, 2, 1][i % 3],
          unita: ['fiale', 'ml', 'fiala'][i % 3],
          importoNetto: 0
        }
      ]
    })),
    // Fatture importate per demo
    { 
      id: 5, 
      numero: 'FT/2024/1240', 
      data: '19/12/2024', 
      paziente: 'Lucia Verde', 
      medico: 'Dott.ssa Scutari', 
      importoLordo: 450, 
      importoNetto: 368.85, 
      iva: 81.15, 
      stato: 'importata', 
      serie: 'principale', 
      voci: [
        { id: 17, codice: 'FLL', descrizione: 'Filler zigomi', quantita: 1, unita: null, importoNetto: 368.85 },
        { id: 18, codice: 'FLL-JUV', descrizione: 'FILLER ZIGOMI - JUVEDERM 2ml', quantita: 2, unita: 'ml', importoNetto: 0 }
      ], 
      dataImport: '20/12/2024 14:30' 
    }
  ]);

  const [selectedFatture, setSelectedFatture] = useState([]);
  const [filtroStato, setFiltroStato] = useState('tutti');
  const [filtroDataDa, setFiltroDataDa] = useState('');
  const [filtroDataA, setFiltroDataA] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAssignMedico, setShowAssignMedico] = useState(false);
  const [selectedMedico, setSelectedMedico] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [vistaRaggruppata, setVistaRaggruppata] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showImportSummary, setShowImportSummary] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [showSyncSummary, setShowSyncSummary] = useState(false);
  const [syncSummary, setSyncSummary] = useState(null);
  const [showAddProdotti, setShowAddProdotti] = useState(null);
  const [prodottiDaAggiungere, setProdottiDaAggiungere] = useState({});
  const [showAddPrestazione, setShowAddPrestazione] = useState(null);
  const [prezzoPrestazione, setPrezzoPrestazione] = useState('');
  const itemsPerPage = 50;

  // Reset pagina quando cambiano i filtri
  useEffect(() => {
    setCurrentPage(1);
  }, [filtroStato, filtroDataDa, filtroDataA]);

  const lastImport = {
    data: '22/12/2024 09:15',
    nuove: 35,
    conAnomalie: 4
  };

  // Calcola se una fattura ha anomalie (considera sia fattura che voci)
  const haAnomalie = (fattura) => {
    if (fattura.anomalia) return true;
    if (fattura.voci && fattura.voci.some(v => v.anomalia)) return true;
    // Controlla anche prestazioni che richiedono prodotti
    const prestazioni = raggruppaVociPerPrestazione(fattura.voci);
    for (const p of prestazioni) {
      if (!p.isOrfano && p.voce.codice && configPrestazioni[p.voce.codice]) {
        const config = configPrestazioni[p.voce.codice];
        if (config.richiedeProdotti && p.prodotti.length === 0) {
          return true;
        }
      }
    }
    return false;
  };

  // Funzione per raggruppare voci per prestazione
  const raggruppaVociPerPrestazione = (voci) => {
    const prestazioni = [];
    const vociProdotto = [];
    
    // Prima passa: identifica prestazioni e prodotti
    voci.forEach(voce => {
      if (voce.importoNetto > 0 && !voce.codice.includes('-')) {
        prestazioni.push({
          voce: voce,
          prodotti: []
        });
      } else if (voce.codice.includes('-')) {
        vociProdotto.push(voce);
      }
    });
    
    // Seconda passa: associa prodotti a prestazioni
    vociProdotto.forEach(prodotto => {
      const codicePrestazione = prodotto.codice.split('-')[0];
      const prestazione = prestazioni.find(p => p.voce.codice === codicePrestazione);
      
      if (prestazione) {
        prestazione.prodotti.push(prodotto);
      } else {
        // Prodotto orfano
        prestazioni.push({
          voce: prodotto,
          prodotti: [],
          isOrfano: true
        });
      }
    });
    
    return prestazioni;
  };

  // Calcola totali per stato includendo le nuove anomalie
  const calcolaStatiCount = useMemo(() => {
    const count = {
      tutti: fatture.length,
      verificate: 0,
      anomalie: 0,
      importate: 0
    };
    
    fatture.forEach(f => {
      if (f.stato === 'importata') {
        count.importate++;
      } else if (haAnomalie(f)) {
        count.anomalie++;
      } else {
        count.verificate++;
      }
    });
    
    return count;
  }, [fatture]); // haAnomalie è una funzione pura, non serve come dipendenza

  const serieStatus = [
    { serie: 'Principale', ultima: 'FT/2024/1250', daImportare: 3 },
    { serie: 'IVA', ultima: 'FT/2024/852', daImportare: 1 },
    { serie: 'M', ultima: 'FT/2024/320', daImportare: 0 }
  ];

  const handleSelectAll = (checked) => {
    if (checked) {
      const fattureSelezionabili = filteredFatture
        .filter(f => f.stato !== 'importata' && !haAnomalie(f))
        .map(f => f.id);
      setSelectedFatture(fattureSelezionabili);
    } else {
      setSelectedFatture([]);
    }
  };

  const handleSelectFattura = (id) => {
    const fattura = fatture.find(f => f.id === id);
    
    if (fattura && fattura.stato !== 'importata' && !haAnomalie(fattura)) {
      if (selectedFatture.includes(id)) {
        setSelectedFatture(selectedFatture.filter(fId => fId !== id));
      } else {
        setSelectedFatture([...selectedFatture, id]);
      }
    }
  };

  const handleAssignMedico = () => {
    if (selectedMedico && selectedFatture.length > 0) {
      setFatture(fatture.map(f => {
        if (selectedFatture.includes(f.id) && f.anomalia === 'medico_mancante') {
          // Rimuovi solo l'anomalia del medico, non cambiare lo stato automaticamente
          const updatedFattura = { ...f, medico: selectedMedico, anomalia: null };
          // Lo stato sarà 'verificata' solo se non ci sono altre anomalie
          if (!haAnomalie(updatedFattura)) {
            updatedFattura.stato = 'verificata';
          }
          return updatedFattura;
        }
        return f;
      }));
      // Aggiorna la selezione per includere solo fatture senza anomalie
      setSelectedFatture(prev => prev.filter(id => {
        const fattura = fatture.find(f => f.id === id);
        if (!fattura) return false;
        const updatedFattura = fattura.anomalia === 'medico_mancante' 
          ? { ...fattura, medico: selectedMedico, anomalia: null } 
          : fattura;
        return !haAnomalie(updatedFattura);
      }));
      setShowAssignMedico(false);
      setSelectedMedico('');
    }
  };

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      
      const nuoveFatture = 12;
      const fattureConAnomalie = 2;
      const fattureAggiornate = 1;
      
      setSyncSummary({
        nuove: nuoveFatture,
        aggiornate: fattureAggiornate,
        anomalie: fattureConAnomalie,
        totaleProcessate: nuoveFatture + fattureAggiornate,
        timestamp: new Date().toLocaleString('it-IT'),
        fonte: 'Fatture in Cloud API'
      });
      setShowSyncSummary(true);
    }, 2000);
  };

  const handleImport = () => {
    if (selectedFatture.length === 0) return;
    
    setIsImporting(true);
    setTimeout(() => {
      const fattureImportate = fatture.filter(f => selectedFatture.includes(f.id));
      const totaleImportato = fattureImportate.reduce((sum, f) => sum + f.importoLordo, 0);
      const mediciCoinvolti = [...new Set(fattureImportate.map(f => f.medico))].filter(Boolean);
      
      const now = new Date();
      const dataImport = `${now.toLocaleDateString('it-IT')} ${now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
      
      setFatture(fatture.map(f => 
        selectedFatture.includes(f.id) 
          ? { ...f, stato: 'importata', dataImport }
          : f
      ));
      
      setImportSummary({
        count: selectedFatture.length,
        totale: totaleImportato,
        medici: mediciCoinvolti,
        timestamp: dataImport
      });
      setShowImportSummary(true);
      
      setSelectedFatture([]);
      setIsImporting(false);
    }, 2000);
  };

  const getStatoIcon = (stato, anomalia, voci) => {
    // Raccoglie tutte le anomalie (fattura + voci)
    const anomaliePresenti = [];
    
    if (anomalia) {
      anomaliePresenti.push(anomalia);
    }
    
    if (voci) {
      voci.forEach(v => {
        if (v.anomalia && !anomaliePresenti.includes(v.anomalia)) {
          anomaliePresenti.push(v.anomalia);
        }
      });
    }
    
    // Se non ci sono anomalie
    if (anomaliePresenti.length === 0) {
      if (stato === 'importata') return '📥';
      return '✅';
    }
    
    // Se c'è una sola anomalia
    if (anomaliePresenti.length === 1) {
      switch (anomaliePresenti[0]) {
        case 'medico_mancante': return '👤';
        case 'prodotto_orfano': return '❓';
        case 'prodotto_con_prezzo': return '💰';
        case 'prestazione_incompleta': return '📦';
        case 'prestazione_duplicata': return '📋';
        default: return '⚠️';
      }
    }
    
    // Se ci sono più anomalie, mostra i simboli multipli
    const simboli = anomaliePresenti.map(a => {
      switch (a) {
        case 'medico_mancante': return '👤';
        case 'prodotto_orfano': return '❓';
        case 'prodotto_con_prezzo': return '💰';
        case 'prestazione_incompleta': return '📦';
        case 'prestazione_duplicata': return '📋';
        default: return '⚠️';
      }
    });
    
    return simboli.join('');
  };

  const getAnomaliaText = (anomalia) => {
    switch (anomalia) {
      case 'medico_mancante': return 'Medico non identificato';
      case 'prodotto_con_prezzo': return 'Prodotto con prezzo non valido';
      case 'prodotto_orfano': return 'Prodotto senza prestazione';
      case 'prestazione_incompleta': return 'Prestazione senza prodotti';
      case 'prestazione_duplicata': return 'Prestazione duplicata';
      default: return 'Anomalia';
    }
  };

  const handleImpostaZero = (fatturaId, voceId) => {
    setFatture(fatture.map(f => {
      if (f.id === fatturaId) {
        return {
          ...f,
          voci: f.voci.map(v => {
            if (v.id === voceId) {
              return { ...v, importoNetto: 0, anomalia: null };
            }
            return v;
          })
        };
      }
      return f;
    }));
  };

  const handleEliminaVoce = (fatturaId, voceId) => {
    setFatture(fatture.map(f => {
      if (f.id === fatturaId) {
        const nuoveVoci = f.voci.filter(v => v.id !== voceId);
        const nuovoImportoNetto = nuoveVoci.reduce((sum, v) => sum + v.importoNetto, 0);
        const nuovoImportoLordo = nuovoImportoNetto * 1.22;
        const nuovaIva = nuovoImportoLordo - nuovoImportoNetto;
        
        return {
          ...f,
          voci: nuoveVoci,
          importoNetto: nuovoImportoNetto,
          importoLordo: nuovoImportoLordo,
          iva: nuovaIva
        };
      }
      return f;
    }));
  };

  const handleAggiungiPrestazione = (fatturaId, voceProdotto) => {
    const codicePrestazione = voceProdotto.codice.split('-')[0];
    const config = configPrestazioni[codicePrestazione];
    
    if (config) {
      setShowAddPrestazione({ fatturaId, voceProdotto, config });
      setPrezzoPrestazione(voceProdotto.importoNetto.toString());
    }
  };

  const confermaAggiungiPrestazione = () => {
    if (!showAddPrestazione) return;
    
    const { fatturaId, voceProdotto, config } = showAddPrestazione;
    const prezzo = parseFloat(prezzoPrestazione) || 0;
    
    setFatture(fatture.map(f => {
      if (f.id === fatturaId) {
        // Crea nuova prestazione
        const nuovaPrestazione = {
          id: Date.now(),
          codice: voceProdotto.codice.split('-')[0],
          descrizione: config.descrizione,
          quantita: 1,
          unita: null,
          importoNetto: prezzo
        };
        
        // Azzera prezzo prodotto e rimuovi anomalia
        const vociAggiornate = f.voci.map(v => {
          if (v.id === voceProdotto.id) {
            return { ...v, importoNetto: 0, anomalia: null };
          }
          return v;
        });
        
        // Inserisci prestazione prima del prodotto
        const indexProdotto = vociAggiornate.findIndex(v => v.id === voceProdotto.id);
        vociAggiornate.splice(indexProdotto, 0, nuovaPrestazione);
        
        // Ricalcola totali
        const nuovoImportoNetto = vociAggiornate.reduce((sum, v) => sum + v.importoNetto, 0);
        const nuovoImportoLordo = f.serie === 'IVA' ? nuovoImportoNetto : nuovoImportoNetto * 1.22;
        const nuovaIva = nuovoImportoLordo - nuovoImportoNetto;
        
        const updatedFattura = {
          ...f,
          voci: vociAggiornate,
          importoNetto: nuovoImportoNetto,
          importoLordo: nuovoImportoLordo,
          iva: nuovaIva
        };
        
        // Imposta stato verificata solo se non ci sono anomalie
        if (!haAnomalie(updatedFattura)) {
          updatedFattura.stato = 'verificata';
        }
        
        return updatedFattura;
      }
      return f;
    }));
    
    setShowAddPrestazione(null);
    setPrezzoPrestazione('');
  };

  const handleAggiungiProdotti = (fatturaId, vocePrestazione) => {
    setShowAddProdotti({ fatturaId, vocePrestazione });
    setProdottiDaAggiungere({});
  };

  const confermaAggiungiProdotti = () => {
    if (!showAddProdotti) return;
    
    const { fatturaId, vocePrestazione } = showAddProdotti;
    const prodottiSelezionati = Object.entries(prodottiDaAggiungere)
      .filter(([_, data]) => data.selezionato && data.quantita > 0);
    
    if (prodottiSelezionati.length === 0) return;
    
    setFatture(fatture.map(f => {
      if (f.id === fatturaId) {
        // Rimuovi anomalia dalla prestazione
        const vociAggiornate = f.voci.map(v => {
          if (v.id === vocePrestazione.id) {
            return { ...v, anomalia: null };
          }
          return v;
        });
        
        // Trova posizione dopo la prestazione
        const indexPrestazione = vociAggiornate.findIndex(v => v.id === vocePrestazione.id);
        
        // Crea nuove voci prodotto
        const nuoviProdotti = prodottiSelezionati.map(([codiceProdotto, data]) => ({
          id: Date.now() + Math.random(),
          codice: `${vocePrestazione.codice}-${codiceProdotto}`,
          descrizione: `${vocePrestazione.descrizione.toUpperCase()} - ${data.nome} ${data.quantita} ${data.unita}`,
          quantita: data.quantita,
          unita: data.unita,
          importoNetto: 0
        }));
        
        // Inserisci prodotti dopo la prestazione
        vociAggiornate.splice(indexPrestazione + 1, 0, ...nuoviProdotti);
        
        return {
          ...f,
          voci: vociAggiornate
        };
      }
      return f;
    }));
    
    setShowAddProdotti(null);
    setProdottiDaAggiungere({});
  };

  const handleRisolviDuplicato = (fatturaId, voceId) => {
    setFatture(fatture.map(f => {
      if (f.id === fatturaId) {
        const nuoveVoci = f.voci.filter(v => v.id !== voceId);
        const nuovoImportoNetto = nuoveVoci.reduce((sum, v) => sum + v.importoNetto, 0);
        const nuovoImportoLordo = f.serie === 'IVA' ? nuovoImportoNetto : nuovoImportoNetto * 1.22;
        const nuovaIva = nuovoImportoLordo - nuovoImportoNetto;
        
        return {
          ...f,
          voci: nuoveVoci,
          importoNetto: nuovoImportoNetto,
          importoLordo: nuovoImportoLordo,
          iva: nuovaIva
        };
      }
      return f;
    }));
  };

  const filteredFatture = fatture.filter(f => {
    if (filtroStato !== 'tutti') {
      if (filtroStato === 'verificate' && (f.stato === 'importata' || haAnomalie(f))) return false;
      if (filtroStato === 'anomalie' && !haAnomalie(f)) return false;
      if (filtroStato === 'importate' && f.stato !== 'importata') return false;
      if (filtroStato.startsWith('anomalia_') && f.anomalia !== filtroStato.replace('anomalia_', '')) return false;
    }
    
    if (filtroDataDa || filtroDataA) {
      const dataFattura = new Date(f.data.split('/').reverse().join('-'));
      if (filtroDataDa) {
        const dataDa = new Date(filtroDataDa);
        if (dataFattura < dataDa) return false;
      }
      if (filtroDataA) {
        const dataA = new Date(filtroDataA);
        if (dataFattura > dataA) return false;
      }
    }
    
    return true;
  });

  const totalPages = Math.ceil(filteredFatture.length / itemsPerPage);
  const paginatedFatture = filteredFatture.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const totalsGlobal = filteredFatture.reduce((acc, f) => ({
    lordo: acc.lordo + f.importoLordo,
    netto: acc.netto + f.importoNetto,
    iva: acc.iva + f.iva,
    count: acc.count + 1
  }), { lordo: 0, netto: 0, iva: 0, count: 0 });

  const fatturePerMedico = filteredFatture.reduce((acc, fattura) => {
    const medico = fattura.medico || 'Non assegnato';
    if (!acc[medico]) {
      acc[medico] = {
        fatture: [],
        totale: 0,
        count: 0
      };
    }
    acc[medico].fatture.push(fattura);
    acc[medico].totale += fattura.importoLordo;
    acc[medico].count += 1;
    return acc;
  }, {});

  const renderTableRows = () => {
    if (vistaRaggruppata) {
      const allRows = [];
      let currentIndex = 0;
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = currentPage * itemsPerPage;
      
      Object.entries(fatturePerMedico).forEach(([medico, dati]) => {
        const fattureDelMedico = dati.fatture;
        const indiciFatture = [];
        
        for (let i = 0; i < fattureDelMedico.length; i++) {
          if (currentIndex >= startIndex && currentIndex < endIndex) {
            indiciFatture.push(i);
          }
          currentIndex++;
        }
        
        if (indiciFatture.length > 0) {
          allRows.push(
            <tr key={`header-${medico}`} className="bg-gray-50">
              <td colSpan="8" className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">👥</span>
                    <span className="font-semibold text-gray-800">{medico}</span>
                    <span className="text-sm text-gray-600">
                      ({dati.count} {dati.count === 1 ? 'fattura' : 'fatture'})
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-700">
                    Totale: € {dati.totale.toFixed(2)}
                  </div>
                </div>
              </td>
            </tr>
          );
          
          indiciFatture.forEach(idx => {
            const fattura = fattureDelMedico[idx];
            allRows.push(renderFatturaRow(fattura, true));
            if (expandedRow === fattura.id) {
              allRows.push(renderFatturaDetails(fattura));
            }
          });
        }
      });
      
      return allRows;
    } else {
      const allRows = [];
      paginatedFatture.forEach(fattura => {
        allRows.push(renderFatturaRow(fattura, false));
        if (expandedRow === fattura.id) {
          allRows.push(renderFatturaDetails(fattura));
        }
      });
      return allRows;
    }
  };

  const renderFatturaRow = (fattura, indented) => {
    const hasAnomaliePresenti = haAnomalie(fattura);
    const isSelectable = fattura.stato !== 'importata' && !hasAnomaliePresenti;
    
    return (
      <tr key={fattura.id} className={`hover:bg-gray-50 ${hasAnomaliePresenti ? 'bg-red-50' : fattura.stato === 'importata' ? 'bg-gray-50 opacity-75' : ''}`}>
        <td className={`px-4 py-3 ${indented ? 'pl-8' : ''}`}>
          <input
            type="checkbox"
            checked={selectedFatture.includes(fattura.id)}
            onChange={() => handleSelectFattura(fattura.id)}
            disabled={!isSelectable}
            className="rounded border-gray-300 text-[#03A6A6] focus:ring-[#03A6A6] disabled:opacity-50 disabled:cursor-not-allowed"
            title={!isSelectable ? (fattura.stato === 'importata' ? 'Già importata' : 'Risolvi anomalie prima di importare') : 'Seleziona per import'}
          />
        </td>
        <td className="px-4 py-3 text-sm font-medium text-gray-900">
          {fattura.numero}
          <span className="ml-2 text-xs text-gray-500">({fattura.serie})</span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">{fattura.data}</td>
        <td className="px-4 py-3 text-sm text-gray-900">{fattura.paziente}</td>
        <td className="px-4 py-3 text-sm">
          {fattura.medico ? (
            <span className="text-gray-900">{fattura.medico}</span>
          ) : (
            <span className="text-red-600 font-medium">Non assegnato</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-right">
          <div className="text-gray-900 font-medium">€ {fattura.importoLordo.toFixed(2)}</div>
          <div className="text-xs text-gray-500">Netto: € {fattura.importoNetto.toFixed(2)}</div>
        </td>
        <td className="px-4 py-3 text-center">
          <span className="text-lg" title={
            fattura.stato === 'importata' ? `Importata il ${fattura.dataImport}` : 
            hasAnomaliePresenti ? 'Anomalie da risolvere' : 
            'Verificata'
          }>
            {getStatoIcon(fattura.stato, fattura.anomalia, fattura.voci)}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          <button
            onClick={() => setExpandedRow(expandedRow === fattura.id ? null : fattura.id)}
            className="text-[#03A6A6] hover:text-[#028a8a] text-sm font-medium"
          >
            {expandedRow === fattura.id ? 'Chiudi' : 'Dettagli'}
          </button>
        </td>
      </tr>
    );
  };

  const renderFatturaDetails = (fattura) => {
    const prestazioniRaggrupate = raggruppaVociPerPrestazione(fattura.voci);
    
    return (
      <tr key={`${fattura.id}-expanded`}>
        <td colSpan="8" className="px-4 py-3 bg-gray-50">
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-800">
                  FATTURA {fattura.numero} - {fattura.paziente} - {fattura.medico || 'Non assegnato'}
                  {fattura.anomalia === 'medico_mancante' && ' ⚠️'}
                </h4>
                {fattura.stato === 'importata' && (
                  <span className="text-sm text-green-600 font-medium">
                    ✅ Importata il {fattura.dataImport}
                  </span>
                )}
              </div>
              
              <div className="space-y-3">
                <div className="font-medium text-gray-700 mb-2">Voci fattura:</div>
                
                {prestazioniRaggrupate.map((prestazione, idx) => {
                  const voce = prestazione.voce;
                  const isOrfano = prestazione.isOrfano;
                  const config = configPrestazioni[voce.codice];
                  const hasBisognoProdotti = config && config.richiedeProdotti && prestazione.prodotti.length === 0 && !isOrfano;
                  
                  return (
                    <div key={voce.id} className={`${idx > 0 ? 'mt-3' : ''}`}>
                      {/* Prestazione o prodotto orfano */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${isOrfano || voce.anomalia ? 'text-red-600' : 'text-gray-800'}`}>
                            {isOrfano ? '⚠️' : voce.anomalia === 'prestazione_duplicata' ? '⚠️' : '✅'} 
                            {voce.codice.includes('-') ? '' : `[${voce.codice}]`} {voce.descrizione}
                          </span>
                          {voce.quantita && voce.unita && (
                            <span className="text-gray-600 text-sm">
                              {voce.quantita} {voce.unita}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {voce.importoNetto > 0 && (
                            <span className={`font-medium ${voce.anomalia === 'prodotto_con_prezzo' ? 'text-red-600' : 'text-gray-800'}`}>
                              € {voce.importoNetto.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Prodotti associati */}
                      {prestazione.prodotti.length > 0 && (
                        <div className="ml-6 mt-2 space-y-1">
                          {prestazione.prodotti.map(prodotto => (
                            <div key={prodotto.id} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className={prodotto.anomalia ? 'text-red-600' : 'text-gray-600'}>
                                  {prodotto.anomalia ? '└── ⚠️' : '└──'} {prodotto.descrizione}
                                </span>
                                <span className="text-gray-500">
                                  {prodotto.quantita} {prodotto.unita}
                                </span>
                              </div>
                              {prodotto.importoNetto > 0 && (
                                <span className="text-red-600 font-medium">
                                  € {prodotto.importoNetto.toFixed(2)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Gestione anomalie */}
                      {voce.anomalia === 'prodotto_con_prezzo' && prestazione.prodotti.length === 0 && (
                        <div className="ml-6 mt-2 p-3 bg-amber-100 border border-amber-300 rounded-lg">
                          <p className="text-sm text-amber-800 mb-2">
                            └─ Prodotto con prezzo non valido
                          </p>
                          <button
                            onClick={() => handleImpostaZero(fattura.id, voce.id)}
                            className="px-3 py-1 bg-amber-500 text-white rounded text-sm hover:bg-amber-600"
                          >
                            Imposta a €0
                          </button>
                        </div>
                      )}
                      
                      {voce.anomalia === 'prodotto_orfano' && (
                        <div className="ml-6 mt-2 p-3 bg-amber-100 border border-amber-300 rounded-lg">
                          <p className="text-sm text-amber-800 mb-2">
                            └─ Prodotto senza prestazione associata
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEliminaVoce(fattura.id, voce.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" /> Elimina
                            </button>
                            <button
                              onClick={() => handleAggiungiPrestazione(fattura.id, voce)}
                              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Aggiungi prestazione
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {voce.anomalia === 'prestazione_incompleta' || hasBisognoProdotti && (
                        <div className="ml-6 mt-2 p-3 bg-amber-100 border border-amber-300 rounded-lg">
                          <p className="text-sm text-amber-800 mb-2">
                            └─ Prestazione richiede indicazione prodotti
                          </p>
                          <button
                            onClick={() => handleAggiungiProdotti(fattura.id, voce)}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Aggiungi prodotti utilizzati
                          </button>
                        </div>
                      )}
                      
                      {voce.anomalia === 'prestazione_duplicata' && (
                        <div className="ml-6 mt-2 p-3 bg-amber-100 border border-amber-300 rounded-lg">
                          <p className="text-sm text-amber-800 mb-2">
                            └─ Prestazione duplicata nella fattura
                          </p>
                          <button
                            onClick={() => handleRisolviDuplicato(fattura.id, voce.id)}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Elimina duplicato
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Anomalia medico mancante */}
              {fattura.anomalia === 'medico_mancante' && (
                <div className="mt-4 p-3 bg-amber-100 border border-amber-300 rounded-lg">
                  <p className="text-sm font-medium text-amber-800 mb-2">
                    ⚠️ Medico non identificato
                  </p>
                  <div className="flex items-center gap-2">
                    <select 
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                      onChange={(e) => {
                        if (e.target.value) {
                          setFatture(fatture.map(f => {
                            if (f.id === fattura.id) {
                              const updatedFattura = { ...f, medico: e.target.value, anomalia: null };
                              // Verifica se ci sono altre anomalie prima di impostare stato verificata
                              if (!haAnomalie(updatedFattura)) {
                                updatedFattura.stato = 'verificata';
                              }
                              return updatedFattura;
                            }
                            return f;
                          }));
                        }
                      }}
                    >
                      <option value="">Seleziona medico...</option>
                      {medici.map(m => (
                        <option key={m.id} value={m.nome}>{m.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              
              {/* Riepilogo anomalie */}
              {(fattura.anomalia || haAnomalie(fattura)) && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-800 mb-2">
                    ⚠️ ANOMALIE DA RISOLVERE:
                  </p>
                  <ul className="text-sm text-red-700 space-y-1">
                    {fattura.anomalia === 'medico_mancante' && <li>• Medico non assegnato</li>}
                    {fattura.voci.filter(v => v.anomalia).map(v => (
                      <li key={v.id}>• {getAnomaliaText(v.anomalia)} ({v.descrizione})</li>
                    ))}
                    {/* Verifica prestazioni incomplete */}
                    {prestazioniRaggrupate.map(p => {
                      if (!p.isOrfano && p.voce.codice && configPrestazioni[p.voce.codice]) {
                        const config = configPrestazioni[p.voce.codice];
                        if (config.richiedeProdotti && p.prodotti.length === 0 && !p.voce.anomalia) {
                          return <li key={p.voce.id}>• Prestazione incompleta ({p.voce.descrizione})</li>;
                        }
                      }
                      return null;
                    }).filter(Boolean)}
                  </ul>
                </div>
              )}
              
              <div className="border-t pt-3 mt-4 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Riepilogo fattura:</span>
                </div>
                <div className="mt-1">
                  • Imponibile: € {fattura.importoNetto.toFixed(2)}<br />
                  • IVA: € {fattura.iva.toFixed(2)}<br />
                  • Totale: € {fattura.importoLordo.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {/* Banner informativo */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <div className="text-blue-600 text-xl">ℹ️</div>
        <div className="text-sm text-blue-800">
          <strong>Nuovo formato fatture:</strong> 
          <span className="ml-2">Prestazioni principali + Prodotti utilizzati (a €0) per tracciabilità completa</span>
          <div className="text-xs text-blue-600 mt-1">
            Es: "Botox viso €350" seguito da "BOTOX VISO - ALLERGAN 2 fiale €0"
          </div>
        </div>
      </div>

      {/* Header con stato import e pulsanti azioni principali */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Stato Import */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-[#03A6A6]" />
              Stato Import Giornaliero
            </h3>
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className="text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 font-medium shadow-sm"
              style={{ 
                backgroundColor: isSyncing ? '#5581a0' : '#6192A9',
                color: '#FFFFFF'
              }}
              onMouseEnter={(e) => !isSyncing && (e.target.style.backgroundColor = '#5581a0')}
              onMouseLeave={(e) => !isSyncing && (e.target.style.backgroundColor = '#6192A9')}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sincronizzando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Sincronizza da Fatture in Cloud
                </>
              )}
            </button>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-2 text-gray-600">Ultimo import:</td>
                <td className="py-2 text-right font-medium">{lastImport.data}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-600">Fatture nuove:</td>
                <td className="py-2 text-right font-medium text-green-600">{lastImport.nuove}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-600">Con anomalie:</td>
                <td className="py-2 text-right font-medium text-amber-600">{lastImport.conAnomalie}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Stato Serie */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Stato Serie Fatture</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-medium text-gray-700">Serie</th>
                <th className="text-center py-2 font-medium text-gray-700">Ultima</th>
                <th className="text-right py-2 font-medium text-gray-700">Da importare</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {serieStatus.map(serie => (
                <tr key={serie.serie}>
                  <td className="py-2 text-gray-600">{serie.serie}</td>
                  <td className="py-2 text-center font-mono text-sm">{serie.ultima}</td>
                  <td className="py-2 text-right">
                    {serie.daImportare > 0 ? (
                      <span className="font-semibold text-[#03A6A6]">+{serie.daImportare}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="text-gray-400 italic">
                <td className="py-2">E</td>
                <td className="py-2 text-center">-</td>
                <td className="py-2 text-right">ignorata</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Import Excel */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">📁 Import Manuale</h3>
          <p className="text-sm text-gray-600 mb-4">
            In caso di problemi di connessione, importa da file Excel
          </p>
          <button className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 px-4 text-sm text-gray-600 hover:border-[#03A6A6] hover:text-[#03A6A6] transition-colors">
            📤 Carica File Excel
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Nota: richiederà mapping manuale prodotti
          </p>
        </div>
      </div>

      {/* Filtri e azioni */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-3">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Stato:</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFiltroStato('tutti')}
                className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all ${
                  filtroStato === 'tutti' 
                    ? 'bg-[#03A6A6] text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={filtroStato === 'tutti' ? { backgroundColor: '#03A6A6' } : {}}
              >
                Tutte ({calcolaStatiCount.tutti})
              </button>
              <button
                onClick={() => setFiltroStato('verificate')}
                className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all flex items-center gap-1 ${
                  filtroStato === 'verificate' 
                    ? 'bg-[#03A6A6] text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={filtroStato === 'verificate' ? { backgroundColor: '#03A6A6' } : {}}
              >
                <span>✅</span> Verificate ({calcolaStatiCount.verificate})
              </button>
              <button
                onClick={() => setFiltroStato('anomalie')}
                className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all flex items-center gap-1 ${
                  filtroStato === 'anomalie' 
                    ? 'bg-[#03A6A6] text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={filtroStato === 'anomalie' ? { backgroundColor: '#03A6A6' } : {}}
              >
                <span>⚠️</span> Con anomalie ({calcolaStatiCount.anomalie})
              </button>
              <button
                onClick={() => setFiltroStato('importate')}
                className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all flex items-center gap-1 ${
                  filtroStato === 'importate' 
                    ? 'bg-[#03A6A6] text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={filtroStato === 'importate' ? { backgroundColor: '#03A6A6' } : {}}
              >
                <span>📥</span> Importate ({calcolaStatiCount.importate})
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Periodo:</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filtroDataDa}
                onChange={(e) => setFiltroDataDa(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
              />
              <span className="text-gray-500">-</span>
              <input
                type="date"
                value={filtroDataA}
                onChange={(e) => setFiltroDataA(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
              />
            </div>
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="ml-2">
              <button
                onClick={() => setVistaRaggruppata(!vistaRaggruppata)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                  vistaRaggruppata 
                    ? 'bg-[#6192A9] text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={vistaRaggruppata ? { backgroundColor: '#6192A9' } : {}}
              >
                👥 Vista per Medico
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {selectedFatture.length > 0 && (
              <>
                <div className="text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-lg">
                  {selectedFatture.length} {selectedFatture.length === 1 ? 'fattura selezionata' : 'fatture selezionate'}
                  {(() => {
                    const selInPage = selectedFatture.filter(id => paginatedFatture.find(f => f.id === id)).length;
                    const selInOtherPages = selectedFatture.length - selInPage;
                    return selInOtherPages > 0 ? ` (${selInOtherPages} in altre pagine)` : '';
                  })()}
                </div>
                {fatture.filter(f => selectedFatture.includes(f.id) && f.anomalia === 'medico_mancante').length > 0 && (
                  <button
                    onClick={() => setShowAssignMedico(true)}
                    className="px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium"
                    style={{ 
                      backgroundColor: '#6192A9',
                      color: '#FFFFFF'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#5581a0'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#6192A9'}
                  >
                    Assegna Medico
                  </button>
                )}
              </>
            )}
            <button 
              onClick={handleImport}
              disabled={isImporting || selectedFatture.length === 0}
              className="text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-sm"
              style={{ 
                backgroundColor: (isImporting || selectedFatture.length === 0) ? '#9CA3AF' : '#03A6A6',
                color: '#FFFFFF',
                cursor: (isImporting || selectedFatture.length === 0) ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={(e) => !(isImporting || selectedFatture.length === 0) && (e.target.style.backgroundColor = '#028a8a')}
              onMouseLeave={(e) => !(isImporting || selectedFatture.length === 0) && (e.target.style.backgroundColor = '#03A6A6')}
            >
              {isImporting ? (
                <>
                  <Download className="w-4 h-4 animate-pulse" />
                  Importando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Importa nel Database
                  {selectedFatture.length > 0 && (
                    <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
                      {selectedFatture.length}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tabella fatture */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={filteredFatture.filter(f => f.stato !== 'importata' && !haAnomalie(f)).length > 0 && 
                            selectedFatture.length === filteredFatture.filter(f => f.stato !== 'importata' && !haAnomalie(f)).length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-[#03A6A6] focus:ring-[#03A6A6]"
                    disabled={filteredFatture.filter(f => f.stato !== 'importata' && !haAnomalie(f)).length === 0}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Numero</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Data</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Paziente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Medico</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Importo</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Stato</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {renderTableRows()}
            </tbody>
          </table>
        </div>
        
        {/* Paginazione */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            {vistaRaggruppata ? (
              <span>
                {totalPages > 1 && (
                  <>Pagina <span className="font-medium">{currentPage}</span> di 
                  <span className="font-medium"> {totalPages}</span> - </>
                )}
                Totale <span className="font-medium">{filteredFatture.length}</span> fatture
              </span>
            ) : (
              <span>
                {filteredFatture.length > 0 ? (
                  <>
                    Mostra <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> - 
                    <span className="font-medium"> {Math.min(currentPage * itemsPerPage, filteredFatture.length)}</span> di 
                    <span className="font-medium"> {filteredFatture.length}</span> fatture
                  </>
                ) : (
                  'Nessuna fattura trovata'
                )}
              </span>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Precedente
              </button>
              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1;
                if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        currentPage === pageNum
                          ? 'bg-[#03A6A6] text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                      style={currentPage === pageNum ? { backgroundColor: '#03A6A6' } : {}}
                    >
                      {pageNum}
                    </button>
                  );
                } else if (pageNum === currentPage - 3 || pageNum === currentPage + 3) {
                  return <span key={pageNum} className="px-2">...</span>;
                }
                return null;
              })}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Successiva
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Riepilogo */}
      <div className="space-y-4">
        {/* Riepilogo Mensile */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              📅 Riepilogo {filtroStato !== 'tutti' || filtroDataDa || filtroDataA ? 'Filtrato' : 'Mensile'} - Dicembre 2024
            </h3>
            <div className="flex gap-2">
              <button 
                className="px-4 py-2 bg-[#03A6A6] text-white rounded-lg hover:bg-[#028a8a] transition-colors flex items-center gap-2 text-sm font-medium"
                onClick={() => alert('Export Excel delle fatture filtrate')}
              >
                <FileText className="w-4 h-4" />
                Export Excel
              </button>
              <button 
                className="px-4 py-2 bg-[#6192A9] text-white rounded-lg hover:bg-[#5581a0] transition-colors flex items-center gap-2 text-sm font-medium"
                onClick={() => alert('Export PDF delle fatture filtrate')}
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{totalsGlobal.count}</div>
              <div className="text-sm text-gray-600">Fatture Filtrate</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-900">€ {totalsGlobal.lordo.toFixed(2)}</div>
              <div className="text-sm text-blue-700">Totale Lordo</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-900">€ {totalsGlobal.netto.toFixed(2)}</div>
              <div className="text-sm text-green-700">Totale Netto</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-900">€ {totalsGlobal.iva.toFixed(2)}</div>
              <div className="text-sm text-purple-700">Totale IVA</div>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-900">
                {filteredFatture.filter(f => f.stato === 'importata').length}
              </div>
              <div className="text-sm text-amber-700">Già Importate</div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <span>
              {filtroStato !== 'tutti' || filtroDataDa || filtroDataA ? (
                <>Filtri attivi: {filtroStato !== 'tutti' && `Stato: ${filtroStato}`} 
                   {filtroDataDa && ` Dal: ${new Date(filtroDataDa).toLocaleDateString('it-IT')}`}
                   {filtroDataA && ` Al: ${new Date(filtroDataA).toLocaleDateString('it-IT')}`}
                </>
              ) : (
                'Import automatico programmato ogni giorno alle 22:00'
              )}
            </span>
            <span>Totale visualizzato: {filteredFatture.length} su {fatture.length} fatture</span>
          </div>
        </div>

        {/* Export Fatture Database */}
        <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">📊 Export Fatture Database</h3>
              <p className="text-sm text-gray-600">
                Scarica le fatture già importate nel database
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Fatture nel database: <span className="font-semibold">1.247</span> | 
                Periodo disponibile: <span className="font-semibold">01/01/2024 - 22/12/2024</span>
              </p>
            </div>
            
            <div className="flex flex-col lg:flex-row lg:items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Periodo export
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    defaultValue="2024-01-01"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="date"
                    defaultValue="2024-12-22"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <button 
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
                  onClick={() => alert('Download Excel con le fatture del periodo selezionato')}
                >
                  <FileText className="w-4 h-4" />
                  Excel
                </button>
                <button 
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
                  onClick={() => alert('Download PDF con le fatture del periodo selezionato')}
                >
                  <Download className="w-4 h-4" />
                  PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Assegna Medico */}
      {showAssignMedico && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Assegna Medico a {selectedFatture.length} fatture</h3>
            <select
              value={selectedMedico}
              onChange={(e) => setSelectedMedico(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
            >
              <option value="">Seleziona un medico...</option>
              {medici.map(m => (
                <option key={m.id} value={m.nome}>{m.nome}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAssignMedico(false);
                  setSelectedMedico('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={handleAssignMedico}
                disabled={!selectedMedico}
                className="flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50"
                style={{ 
                  backgroundColor: !selectedMedico ? '#9CA3AF' : '#03A6A6',
                  color: '#FFFFFF',
                  cursor: !selectedMedico ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => selectedMedico && (e.target.style.backgroundColor = '#028a8a')}
                onMouseLeave={(e) => selectedMedico && (e.target.style.backgroundColor = '#03A6A6')}
              >
                Assegna
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Aggiungi Prestazione */}
      {showAddPrestazione && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              Creazione prestazione "{showAddPrestazione.config.descrizione}"
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prezzo prestazione:
              </label>
              <input
                type="number"
                value={prezzoPrestazione}
                onChange={(e) => setPrezzoPrestazione(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddPrestazione(null);
                  setPrezzoPrestazione('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={confermaAggiungiPrestazione}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Aggiungi Prodotti */}
      {showAddProdotti && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              Aggiungi prodotti per: {showAddProdotti.vocePrestazione.descrizione}
            </h3>
            <div className="mb-4 space-y-3">
              <p className="text-sm text-gray-600">Prodotti disponibili per questa prestazione:</p>
              {prodottiPerPrestazione[showAddProdotti.vocePrestazione.codice]?.map(prodotto => (
                <div key={prodotto.codice} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                  <input
                    type="checkbox"
                    checked={prodottiDaAggiungere[prodotto.codice]?.selezionato || false}
                    onChange={(e) => {
                      setProdottiDaAggiungere({
                        ...prodottiDaAggiungere,
                        [prodotto.codice]: {
                          ...prodotto,
                          selezionato: e.target.checked,
                          quantita: e.target.checked ? 1 : 0
                        }
                      });
                    }}
                    className="rounded border-gray-300 text-[#03A6A6] focus:ring-[#03A6A6]"
                  />
                  <span className="flex-1">{prodotto.nome}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Quantità:</span>
                    <input
                      type="number"
                      value={prodottiDaAggiungere[prodotto.codice]?.quantita || 0}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        setProdottiDaAggiungere({
                          ...prodottiDaAggiungere,
                          [prodotto.codice]: {
                            ...prodotto,
                            selezionato: value > 0,
                            quantita: value
                          }
                        });
                      }}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                      min="0"
                      disabled={!prodottiDaAggiungere[prodotto.codice]?.selezionato}
                    />
                    <span className="text-sm text-gray-600">{prodotto.unita}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddProdotti(null);
                  setProdottiDaAggiungere({});
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={confermaAggiungiProdotti}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Aggiungi selezionati
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Riepilogo Import */}
      {showImportSummary && importSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">✅ Import Completato</h3>
              <button
                onClick={() => setShowImportSummary(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-800 mb-2">
                  Riepilogo operazione:
                </p>
                <div className="space-y-1 text-sm text-green-700">
                  <div>📄 Fatture importate: <span className="font-semibold">{importSummary.count}</span></div>
                  <div>💰 Totale importato: <span className="font-semibold">€ {importSummary.totale.toFixed(2)}</span></div>
                  <div>👥 Medici coinvolti: <span className="font-semibold">{importSummary.medici.length}</span></div>
                  <div className="text-xs text-green-600 mt-2">
                    {importSummary.medici.join(', ')}
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-gray-500">
                <div>🕐 Timestamp: {importSummary.timestamp}</div>
                <div>👤 Operatore: {currentUser.name}</div>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-3">
                  Le fatture sono ora disponibili per il calcolo compensi.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowImportSummary(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                  >
                    Chiudi
                  </button>
                  <button
                    onClick={() => {
                      setShowImportSummary(false);
                      handleMenuClick('calcola');
                    }}
                    className="flex-1 px-4 py-2 bg-[#03A6A6] text-white rounded-lg hover:bg-[#028a8a] text-sm font-medium"
                  >
                    Vai a Calcola Compensi
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Riepilogo Sincronizzazione */}
      {showSyncSummary && syncSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">🔄 Sincronizzazione Completata</h3>
              <button
                onClick={() => setShowSyncSummary(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-800 mb-2">
                  Riepilogo sincronizzazione:
                </p>
                <div className="space-y-1 text-sm text-blue-700">
                  <div>📥 Nuove fatture: <span className="font-semibold">{syncSummary.nuove}</span></div>
                  <div>🔄 Fatture aggiornate: <span className="font-semibold">{syncSummary.aggiornate}</span></div>
                  <div>⚠️ Con anomalie: <span className="font-semibold">{syncSummary.anomalie}</span></div>
                  <div className="pt-2 border-t border-blue-300 mt-2">
                    📊 Totale processate: <span className="font-semibold">{syncSummary.totaleProcessate}</span>
                  </div>
                </div>
              </div>
              
              {syncSummary.anomalie > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800">
                    ⚠️ Ci sono {syncSummary.anomalie} fatture con anomalie da risolvere prima dell'import.
                  </p>
                </div>
              )}
              
              <div className="text-xs text-gray-500">
                <div>🕐 Timestamp: {syncSummary.timestamp}</div>
                <div>📡 Fonte: {syncSummary.fonte}</div>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-3">
                  Le nuove fatture sono pronte per essere verificate e importate.
                </p>
                <button
                  onClick={() => {
                    setShowSyncSummary(false);
                    setFiltroStato('verificate');
                  }}
                  className="w-full px-4 py-2 bg-[#03A6A6] text-white rounded-lg hover:bg-[#028a8a] text-sm font-medium"
                >
                  Visualizza Nuove Fatture
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// App wrapper per demo standalone
export default function App() {
  const mockHandleMenuClick = (menuId) => {
    console.log(`Menu clicked: ${menuId}`);
    alert(`Navigazione a: ${menuId}\n\nQuesto è un componente standalone demo.`);
  };
  
  const mockCurrentUser = {
    name: 'Demo User',
    role: 'admin',
    email: 'demo@poliestetica.com'
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Import Fatture - Demo Standalone
          </h1>
          <p className="text-gray-600">
            Componente con nuova struttura prestazioni + prodotti
          </p>
        </div>
        
        <ImportFatture 
          handleMenuClick={mockHandleMenuClick}
          currentUser={mockCurrentUser}
        />
      </div>
    </div>
  );
}