import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  UserX,
  FileSpreadsheet,
  FileUp,
  Info,
  Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Fattura, Medico, Prestazione, Prodotto, VoceFattura, Macchinario } from '@/data/mock';
import { 
  parseCodiceFattura, 
  prestazioneRichiedeProdotti,
  getProdottiValidiPerPrestazione,
  combinazioni,
  macchinari
} from '@/data/mock';
import { calculateAnomalie } from '@/utils/fattureHelpers';

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
  
  // Stati per import file
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<any[]>([]);
  const [fileColumns, setFileColumns] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [dataFiltro, setDataFiltro] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportSummary, setShowImportSummary] = useState(false);
  const [importSummary, setImportSummary] = useState<{ count: number; nuove: number; aggiornate: number } | null>(null);
  const [showSyncSummary, setShowSyncSummary] = useState(false);
  const [syncSummary, setSyncSummary] = useState<{ nuove: number; aggiornate: number; totali: number } | null>(null);
  const [showAddProdottiModal, setShowAddProdottiModal] = useState<{ fatturaId: number; prestazione: string } | null>(null);
  const [showAddMacchinarioModal, setShowAddMacchinarioModal] = useState<{ fatturaId: number; prestazione: string } | null>(null);
  const [showCorreggiCodiceModal, setShowCorreggiCodiceModal] = useState<{ fatturaId: number; voceId: number; codiceAttuale: string } | null>(null);
  const [quantitaTemp, setQuantitaTemp] = useState<{ [key: string]: number }>({});
  const [prezzoTempProdottoOrfano, setPrezzoTempProdottoOrfano] = useState<{ [key: string]: number }>({});
  const [filtroRiepilogoMedico, setFiltroRiepilogoMedico] = useState('tutti');
  const [filtroRiepilogoSerie, setFiltroRiepilogoSerie] = useState('tutte');

  // Mock stati
  const lastSync = '15 minuti fa';

  // Funzione per processare il file Excel
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Verifica estensione file
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!['xls', 'xlsx'].includes(fileExtension || '')) {
      alert('Per favore seleziona un file Excel (.xls o .xlsx)');
      if (event.target) event.target.value = '';
      return;
    }
    
    setUploadedFile(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        if (jsonData.length > 4) {
          // I nomi dei campi sono alla riga 4 (indice 3 nell'array)
          const headerRow = 3; // Riga 4 in Excel = indice 3 nell'array (0-based)
          const headers = (jsonData[headerRow] as any[]).filter(h => h !== undefined && h !== null);
          
          // Verifica che ci siano headers validi
          if (headers.length === 0) {
            alert('Il file Excel non contiene intestazioni valide alla riga 4');
            if (event.target) event.target.value = '';
            return;
          }
          
          console.log('Headers trovati alla riga 4:', headers);
          setFileColumns(headers.map(h => String(h).trim()));
          
          // Converti in array di oggetti partendo dalla riga 5 (indice 4)
          const dataRows = jsonData.slice(headerRow + 1).map((row: any) => {
            const obj: any = {};
            headers.forEach((header, index) => {
              if (row[index] !== undefined && row[index] !== null) {
                obj[String(header).trim()] = row[index];
              }
            });
            return obj;
          }).filter(row => Object.keys(row).length > 0); // Filtra righe vuote
          
          if (dataRows.length === 0) {
            alert('Il file Excel non contiene dati validi dopo la riga 5');
            if (event.target) event.target.value = '';
            return;
          }
          
          console.log('Numero righe dati trovate:', dataRows.length);
          console.log('Prima riga dati:', dataRows[0]);
          
          setFileData(dataRows);
          setShowImportDialog(false);
          setShowMappingModal(true);
          
          // Inizializza mapping automatico basato su nomi simili
          initializeAutoMapping(headers.map(h => String(h).trim()));
        } else {
          alert('Il file Excel deve contenere almeno 5 righe (headers alla riga 4 + dati)');
          if (event.target) event.target.value = '';
        }
      } catch (error) {
        console.error('Errore nella lettura del file:', error);
        alert('Errore nella lettura del file. Assicurati che sia un file Excel valido.');
        if (event.target) event.target.value = '';
      }
    };
    
    reader.readAsArrayBuffer(file);
  };
  
  // Inizializza mapping automatico
  const initializeAutoMapping = (headers: string[]) => {
    const mapping: Record<string, string> = {};
    const campiSistema = [
      { key: 'numero', patterns: ['numero', 'n.', 'n°', 'numero fattura', 'n fattura'] },
      { key: 'data', patterns: ['data', 'emissione', 'data documento', 'data fattura'] },
      { key: 'paziente', patterns: ['cliente', 'paziente', 'nominativo', 'intestatario', 'ragione sociale', 'denominazione'] },
      { key: 'codice', patterns: ['codice', 'articolo', 'cod.', 'servizio', 'cod', 'codice articolo'] },
      { key: 'serie', patterns: ['serie', 'serie fattura', 'serie documento'] },
      { key: 'quantita', patterns: ['quantità', 'quantita', 'qta', 'q.tà', 'qt', 'qty'] },
      { key: 'unita', patterns: ['u.m.', 'um', 'unità', 'unita', 'unità misura', 'unita misura'] },
      { key: 'importo', patterns: ['prezzo totale', 'importo', 'prezzo', 'totale', 'imponibile', 'netto'] },
      { key: 'iva', patterns: ['iva', 'imposta', 'aliquota', 'tax', '% iva'] }
    ];
    
    console.log('Headers disponibili per mapping:', headers);
    
    campiSistema.forEach(campo => {
      const matchedHeader = headers.find(h => {
        // Controlla che h sia definito e sia una stringa
        if (!h || typeof h !== 'string') return false;
        const headerLower = h.toLowerCase().trim();
        return campo.patterns.some(p => {
          const patternLower = p.toLowerCase();
          // Controlla corrispondenza esatta o parziale
          return headerLower === patternLower || headerLower.includes(patternLower);
        });
      });
      if (matchedHeader) {
        console.log(`Mappato campo ${campo.key} -> ${matchedHeader}`);
        mapping[campo.key] = matchedHeader;
      }
    });
    
    setFieldMapping(mapping);
  };
  
  // Processa i dati importati
  const processImportedData = () => {
    if (!fieldMapping.numero || !fieldMapping.data) {
      alert('Per favore mappa almeno i campi Numero Fattura e Data');
      return;
    }
    
    console.log('Dati da processare:', fileData.length, 'righe');
    console.log('Field mapping:', fieldMapping);
    console.log('Esempio prima riga:', fileData[0]);
    
    // Filtra per data se specificato
    let dataFiltered = [...fileData];
    if (dataFiltro) {
      const filterDate = new Date(dataFiltro);
      console.log('Filtro data attivo:', dataFiltro, 'filterDate:', filterDate);
      dataFiltered = fileData.filter(row => {
        // Gestisce le date in formato Excel (numero seriale)
        let dataFattura;
        const dataValue = row[fieldMapping.data];
        
        if (typeof dataValue === 'number') {
          // È un numero seriale di Excel (giorni dal 1/1/1900)
          // Excel usa 1/1/1900 come giorno 1, ma c'è un bug storico per cui conta anche il 29/2/1900
          // Quindi sottraiamo 25569 giorni per convertire al timestamp Unix
          const excelEpoch = new Date(1899, 11, 30); // 30/12/1899
          dataFattura = new Date(excelEpoch.getTime() + dataValue * 24 * 60 * 60 * 1000);
        } else {
          // Prova a parsare come stringa normale
          dataFattura = new Date(dataValue);
        }
        
        console.log('Confronto date:', dataValue, '->', dataFattura, '>', filterDate, dataFattura > filterDate);
        return dataFattura > filterDate;
      });
      console.log('Dopo filtro data:', dataFiltered.length, 'righe');
    }
    
    // Converti i dati nel formato fatture
    const nuoveFatture = dataFiltered.map((row, index) => {
      const voci: VoceFatturaEstesa[] = [];
      
      // Se abbiamo mappato codice, crea una voce
      if (fieldMapping.codice && row[fieldMapping.codice]) {
        const codice = row[fieldMapping.codice];
        const importoNetto = parseFloat(row[fieldMapping.importo]) || 0;
        
        // Determina la descrizione dal codice
        let descrizione = '';
        const prestazione = prestazioniMap[codice];
        const prodotto = prodottiMap[codice];
        const combinazione = combinazioni.find(c => c.codice === codice);
        
        if (prestazione) {
          descrizione = prestazione.descrizione;
        } else if (prodotto) {
          descrizione = prodotto.nome;
        } else if (combinazione) {
          if (combinazione.tipo === 'prestazione+prodotto') {
            const prest = prestazioniMap[combinazione.prestazione];
            const prod = prodottiMap[combinazione.accessorio!];
            descrizione = `${prest?.descrizione || ''} - ${prod?.nome || ''}`;
          } else if (combinazione.tipo === 'prestazione+macchinario') {
            const prest = prestazioniMap[combinazione.prestazione];
            const macc = macchinari.find(m => m.codice === combinazione.accessorio);
            descrizione = `${prest?.descrizione || ''} - ${macc?.nome || ''}`;
          }
        } else {
          descrizione = codice; // Se non trovato, usa il codice stesso
        }
        
        // Determina l'unità di misura
        let unita = row[fieldMapping.unita] || '';
        if (!unita && prodotto) {
          unita = prodotto.unita; // Default dal prodotto se vuoto
        } else if (!unita) {
          unita = 'pz'; // Default generico
        }
        
        voci.push({
          id: Date.now() + index,
          codice: codice,
          descrizione: descrizione,
          quantita: parseFloat(row[fieldMapping.quantita]) || 1,
          unita: unita,
          importoNetto: importoNetto,
          importoLordo: importoNetto,
          tipo: 'prestazione',
          anomalie: []
        });
      }
      
      // Gestione serie: usa quella mappata o default 'P' (principale)
      let serie = row[fieldMapping.serie] || 'P';
      if (serie === 'P') serie = 'principale';
      
      // Calcola importo e IVA dal file
      const imponibile = parseFloat(row[fieldMapping.importo]) || 0;
      let iva = 0;
      let totale = imponibile;
      
      // Se c'è il campo IVA mappato, lo usa per il calcolo
      if (fieldMapping.iva && row[fieldMapping.iva]) {
        iva = parseFloat(row[fieldMapping.iva]) || 0;
        totale = imponibile + iva;
      }
      
      // Gestisce le date in formato Excel (numero seriale)
      let dataFormatted;
      let dataEmissione;
      const dataValue = row[fieldMapping.data];
      
      if (typeof dataValue === 'number') {
        // È un numero seriale di Excel
        const excelEpoch = new Date(1899, 11, 30);
        const dataDate = new Date(excelEpoch.getTime() + dataValue * 24 * 60 * 60 * 1000);
        dataFormatted = dataDate.toLocaleDateString('it-IT');
        dataEmissione = dataDate.toISOString().split('T')[0];
      } else {
        const dataDate = new Date(dataValue);
        dataFormatted = dataDate.toLocaleDateString('it-IT');
        dataEmissione = dataValue;
      }
      
      const fattura: FatturaConVoci = {
        id: Date.now() + index,
        numero: row[fieldMapping.numero],
        data: dataFormatted,
        dataEmissione: dataEmissione,
        paziente: row[fieldMapping.paziente] || '',
        clienteNome: row[fieldMapping.paziente] || '',
        medicoId: null,
        medicoNome: null,
        imponibile: imponibile,
        iva: iva,
        totale: totale,
        conIva: iva > 0,
        importata: false,
        stato: 'da_importare',
        serie: serie,
        voci,
        anomalie: []
      };
      
      // Calcola anomalie
      const anomalieCalcolate = calculateAnomalie(voci, null);
      fattura.anomalie = anomalieCalcolate;
      if (anomalieCalcolate.length > 0) {
        fattura.stato = 'anomalia';
      }
      
      return fattura;
    });
    
    console.log('Fatture create:', nuoveFatture.length);
    console.log('Esempio prima fattura:', nuoveFatture[0]);
    
    // Aggiungi le nuove fatture
    setFatture([...fatture, ...nuoveFatture]);
    
    // Chiudi modal e resetta
    setShowMappingModal(false);
    setUploadedFile(null);
    setFileData([]);
    setFileColumns([]);
    setFieldMapping({});
    setDataFiltro('');
    
    alert(`Importate ${nuoveFatture.length} fatture. Eventuali anomalie sono state rilevate.`);
  };
  
  // Reset della pagina corrente quando cambiano i filtri o la vista
  useEffect(() => {
    setCurrentPage(1);
  }, [filtroStato, filtroAnomalia, filtroMedico, filtroSerie, filtroDataDa, filtroDataA, vistaRaggruppata]);

  // Funzione per verificare anomalie voci - Mossa prima di useMemo per evitare hoisting issues
  const verificaAnomalieVoce = useMemo(() => {
    return (voce: VoceFatturaEstesa, voci: VoceFatturaEstesa[]): string[] => {
    const anomalie: string[] = [];
    
    // Prima controlla se è una prestazione valida nel sistema
    const prestazione = prestazioniMap[voce.codice];
    if (prestazione) {
      // È una prestazione valida, verifica se richiede prodotti o macchinari
      if (prestazione.richiedeProdotti) {
        const prodottiTrovati = voci.filter(v => {
          const p = parseCodiceFattura(v.codice);
          return p.isProdotto && p.prestazione === voce.codice;
        });
        
        if (prodottiTrovati.length === 0) {
          anomalie.push('prestazione_incompleta');
        }
      }
      
      if (prestazione.richiedeMacchinario) {
        const macchinariTrovati = voci.filter(v => {
          return v.codice.startsWith(voce.codice) && v.codice !== voce.codice;
        });
        
        if (macchinariTrovati.length === 0) {
          anomalie.push('prestazione_senza_macchinario');
        }
      }
      
      // Controllo prestazione duplicata
      const duplicati = voci.filter(v => v.codice === voce.codice && v.id !== voce.id);
      if (duplicati.length > 0) {
        anomalie.push('prestazione_duplicata');
      }
      
      return anomalie;
    }
    
    // Se non è una prestazione valida, controlla se è un prodotto/macchinario valido
    const parsed = parseCodiceFattura(voce.codice);
    if (!parsed.valido) {
      return ['codice_sconosciuto'];
    }
    
    // Controlla se è una combinazione di tipo prestazione o prestazione+macchinario
    const combinazione = combinazioni.find(c => c.codice === voce.codice);
    if (combinazione && (combinazione.tipo === 'prestazione' || combinazione.tipo === 'prestazione+macchinario')) {
      // Controllo prestazione duplicata anche per combinazioni prestazione/macchinario
      const duplicati = voci.filter(v => v.codice === voce.codice && v.id !== voce.id);
      if (duplicati.length > 0) {
        anomalie.push('prestazione_duplicata');
      }
    }
    
    if (parsed.isProdotto) {
      // Controllo prodotto con prezzo (escludi macchinari che devono avere prezzo)
      if (voce.tipo === 'prodotto' && voce.importoNetto > 0) {
        anomalie.push('prodotto_con_prezzo');
      }
      
      // Controllo prodotto orfano
      // Verifica prima se ha una prestazionePadre associata manualmente
      if (!voce.prestazionePadre) {
        // Poi cerca la prestazione nel codice
        const prestazionePadre = voci.find(v => 
          v.codice === parsed.prestazione && parseCodiceFattura(v.codice).isPrestazione
        );
        if (!prestazionePadre) {
          anomalie.push('prodotto_orfano');
        }
      } else {
        // Se ha una prestazionePadre, verifica che esista tra le voci
        const prestazioneTrovata = voci.find(v => 
          v.codice === voce.prestazionePadre && v.tipo === 'prestazione'
        );
        if (!prestazioneTrovata) {
          anomalie.push('prodotto_orfano');
        }
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
    }

    return anomalie;
    };
  }, [prodottiMap, prestazioniMap]);

  // Calcola anomalie per fattura - Mossa prima di useMemo per evitare hoisting issues
  const getAnomalieFattura = useMemo(() => {
    return (fattura: FatturaConVoci) => {
    const anomalie: string[] = [];
    
    // NON includere le vecchie anomalie della fattura quando ricalcoliamo
    // Ricalcoliamo tutto basandoci solo sulle voci attuali
    
    if (!fattura.medicoId) {
      anomalie.push('medico_mancante');
    }
    
    // Analizza voci se esistono
    if (fattura.voci && Array.isArray(fattura.voci)) {
      // Verifica prestazioni duplicate
      const codiciPrestazioni = fattura.voci
        .filter(v => v.tipo === 'prestazione')
        .map(v => v.codice);
      
      const hasDuplicati = codiciPrestazioni.some((codice, index) => 
        codiciPrestazioni.indexOf(codice) !== index
      );
      
      if (hasDuplicati) {
        anomalie.push('prestazione_duplicata');
      }
      
      // Raccogli le anomalie dalle voci
      fattura.voci.forEach((voce) => {
        const anomalieVoce = voce.anomalie || [];
        anomalie.push(...anomalieVoce);
      });
    }
    
    return [...new Set(anomalie)]; // Rimuovi duplicati
    };
  }, []);
  

  // Ricalcola sempre le anomalie quando cambiano le props
  useEffect(() => {
    // Il componente è responsabile del calcolo delle anomalie
    // Ignora le anomalie dal generator e ricalcola sempre
      const fattureConAnomalie = fattureProps.map(f => {
        // Prima calcola le anomalie per ogni voce se non le hanno già
        const vociConAnomalie = f.voci ? f.voci.map(voce => {
          // Se la voce ha già anomalie calcolate, preservale
          if (voce.anomalie && voce.anomalie.length > 0) {
            return voce;
          }
          // Altrimenti calcola le anomalie per questa voce
          const anomalieVoce = verificaAnomalieVoce(voce, f.voci || []);
          return { ...voce, anomalie: anomalieVoce };
        }) : [];
        
        // Ora calcola le anomalie della fattura basandosi sulle voci aggiornate
        const anomalieEsistenti: string[] = [];
        
        if (!f.medicoId) {
          anomalieEsistenti.push('medico_mancante');
        }
        
        // Raccogli anomalie dalle voci
        vociConAnomalie.forEach(voce => {
          if (voce.anomalie && voce.anomalie.length > 0) {
            anomalieEsistenti.push(...voce.anomalie);
          }
        });
        
        // Verifica prestazioni duplicate a livello fattura
        const codiciPrestazioni = vociConAnomalie
          .filter(v => v.tipo === 'prestazione')
          .map(v => v.codice);
        
        const hasDuplicati = codiciPrestazioni.some((codice, index) => 
          codiciPrestazioni.indexOf(codice) !== index
        );
        
        if (hasDuplicati) {
          anomalieEsistenti.push('prestazione_duplicata');
        }
        
        const anomalieUniche = [...new Set(anomalieEsistenti)];
        const stato = anomalieUniche.length > 0 ? 'anomalia' : (f.stato === 'importata' ? 'importata' : 'da_importare');
        
        return { ...f, voci: vociConAnomalie, stato: stato as any, anomalie: anomalieUniche };
      });
      setFatture(fattureConAnomalie);
  }, [fattureProps, verificaAnomalieVoce]);
  
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

  // Assegna medico singolo (per anomalia)
  const handleAssegnaMedicoSingolo = (fatturaId: number, medicoId: number, medicoNome: string) => {
    setFatture(fatture.map(f => {
      if (f.id === fatturaId) {
        // Ricalcola anomalie con il nuovo medico
        const nuoveAnomalie = calculateAnomalie(f.voci || [], medicoId);
        const stato = nuoveAnomalie.length > 0 ? 'anomalia' : 'da_importare';
        
        const updatedFattura = { 
          ...f, 
          medicoId, 
          medicoNome, 
          anomalie: nuoveAnomalie,
          stato: stato as any 
        };
        
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
    setFatture(fatture.map(f => {
      if (f.id === fatturaId && f.voci) {
        // Aggiorna l'importo a 0 e rimuovi l'anomalia
        const voci = f.voci.map(v => {
          if (v.id === voceId) {
            const anomalieFiltrate = v.anomalie ? v.anomalie.filter(a => a !== 'prodotto_con_prezzo') : [];
            return { ...v, importoNetto: 0, importoLordo: 0, anomalie: anomalieFiltrate };
          }
          return v;
        });
        
        // Ricalcola anomalie
        const nuoveAnomalie = calculateAnomalie(voci, f.medicoId);
        const stato = nuoveAnomalie.length > 0 ? 'anomalia' : 'da_importare';
        
        // Ricalcola totali
        const totaleNetto = voci.reduce((sum, v) => sum + (v.importoNetto || 0), 0);
        
        return { ...f, voci, imponibile: totaleNetto, totale: totaleNetto * 1.22, anomalie: nuoveAnomalie, stato: stato as any };
      }
      return f;
    }));
  };

  const handleEliminaVoce = (fatturaId: number, voceId: number) => {
    setFatture(fatture.map(f => {
      if (f.id === fatturaId && f.voci) {
        // Rimuovi la voce
        const vociRimanenti = f.voci.filter(v => v.id !== voceId);
        
        // Ricalcola le anomalie per tutte le voci rimanenti
        const vociConAnomalieAggiornate = vociRimanenti.map(v => {
          const anomalieVoce = verificaAnomalieVoce(v, vociRimanenti);
          return { ...v, anomalie: anomalieVoce };
        });
        
        // Calcola totali
        const totaleNetto = vociConAnomalieAggiornate.reduce((sum, v) => sum + (v.importoNetto || 0), 0);
        
        // Calcola anomalie a livello fattura
        const anomalie = getAnomalieFattura({ ...f, voci: vociConAnomalieAggiornate });
        const stato = anomalie.length > 0 ? 'anomalia' : 'da_importare';
        
        return { 
          ...f, 
          voci: vociConAnomalieAggiornate, 
          imponibile: totaleNetto,
          totale: totaleNetto * 1.22,
          anomalie,
          stato: stato as any 
        };
      }
      return f;
    }));
  };

  const handleAggiungiPrestazioneMancante = (fatturaId: number, codicePrestazione: string) => {
    const prestazione = prestazioniMap[codicePrestazione];
    if (!prestazione) {
      console.error('Prestazione non trovata:', codicePrestazione);
      return;
    }

    setFatture(fatture.map(f => {
      if (f.id === fatturaId && f.voci) {
        const nuovaVoce: VoceFattura = {
          id: Date.now(),
          codice: codicePrestazione,
          descrizione: prestazione.descrizione,
          tipo: 'prestazione',
          importoNetto: 300, // Importo standard per prestazione
          importoLordo: 300,
          quantita: 1,
          unita: 'prestazione',
          anomalie: []
        };
        
        const voci = [...f.voci, nuovaVoce];
        
        // Ricalcola anomalie con le nuove voci
        const nuoveAnomalie = calculateAnomalie(voci, f.medicoId);
        const stato = nuoveAnomalie.length > 0 ? 'anomalia' : 'da_importare';
        
        // Ricalcola totali
        const totaleNetto = voci.reduce((sum, v) => sum + (v.importoNetto || 0), 0);
        const iva = f.conIva ? totaleNetto * 0.22 : 0;
        const totale = totaleNetto + iva;
        
        const updatedFattura = {
          ...f,
          voci,
          imponibile: totaleNetto,
          iva,
          totale,
          anomalie: nuoveAnomalie,
          stato: stato as any
        };
        
        if (onUpdateFattura) {
          onUpdateFattura(fatturaId, updatedFattura);
        }
        
        return updatedFattura;
      }
      return f;
    }));
    
    // Se la prestazione richiede prodotti, apri il modal per aggiungerli
    if (prestazione.richiedeProdotti) {
      setTimeout(() => {
        setShowAddProdottiModal({ fatturaId, prestazione: codicePrestazione });
      }, 500);
    }
  };

  const handleAggiornaPrezzoEAssociaPrestazione = (fatturaId: number, voceId: number, nuovoPrezzo: number, codicePrestazione: string) => {
    setFatture(fatture.map(f => {
      if (f.id === fatturaId && f.voci) {
        const prestazione = prestazioniMap[codicePrestazione];
        if (!prestazione) return f;
        
        // Crea la nuova voce prestazione con il prezzo inserito
        const nuovaVocePrestazione: VoceFattura = {
          id: Date.now() + Math.random(),
          codice: codicePrestazione,
          descrizione: prestazione.descrizione,
          tipo: 'prestazione',
          importoNetto: nuovoPrezzo,
          importoLordo: nuovoPrezzo,
          quantita: 1,
          unita: 'prestazione',
          anomalie: []
        };
        
        // Aggiorna la voce prodotto esistente: associala alla prestazione e azzera il prezzo
        const vociAggiornate = f.voci.map(v => {
          if (v.id === voceId) {
            return {
              ...v,
              prestazionePadre: codicePrestazione,
              importoNetto: 0, // I prodotti hanno sempre prezzo 0
              importoLordo: 0,
              // Rimuovi le anomalie prodotto_orfano e prodotto_con_prezzo se presente
              anomalie: v.anomalie ? v.anomalie.filter(a => a !== 'prodotto_orfano' && a !== 'prodotto_con_prezzo') : []
            };
          }
          return v;
        });
        
        // Aggiungi la nuova voce prestazione all'inizio
        const vociComplete = [nuovaVocePrestazione, ...vociAggiornate];
        
        // Ricalcola tutte le anomalie
        const vociConAnomalieRicalcolate = vociComplete.map(v => {
          const anomalieVoce = verificaAnomalieVoce(v, vociComplete);
          return { ...v, anomalie: anomalieVoce };
        });
        
        // Calcola totali
        const totaleNetto = vociConAnomalieRicalcolate.reduce((sum, v) => sum + (v.importoNetto || 0), 0);
        
        // Calcola anomalie a livello fattura
        const anomalie = getAnomalieFattura({ ...f, voci: vociConAnomalieRicalcolate });
        const stato = anomalie.length > 0 ? 'anomalia' : 'da_importare';
        
        const updatedFattura = {
          ...f,
          voci: vociConAnomalieRicalcolate,
          imponibile: totaleNetto,
          totale: f.conIva ? totaleNetto * 1.22 : totaleNetto,
          anomalie,
          stato: stato as any
        };
        
        if (onUpdateFattura) {
          onUpdateFattura(fatturaId, updatedFattura);
        }
        
        // Pulisci il prezzo temporaneo
        setPrezzoTempProdottoOrfano(prev => {
          const newState = { ...prev };
          delete newState[`prezzo-${fatturaId}-${voceId}`];
          return newState;
        });
        
        return updatedFattura;
      }
      return f;
    }));
  };

  const handleAssociaPrestazione = (fatturaId: number, voceId: number, codicePrestazione: string) => {
    setFatture(fatture.map(f => {
      if (f.id === fatturaId && f.voci) {
        // Prima aggiorna la voce e rimuovi l'anomalia
        const voci = f.voci.map(v => {
          if (v.id === voceId) {
            // Aggiorna la voce prodotto per associarla alla prestazione
            return {
              ...v,
              prestazionePadre: codicePrestazione,
              // Rimuovi l'anomalia prodotto_orfano
              anomalie: v.anomalie ? v.anomalie.filter(a => a !== 'prodotto_orfano') : []
            };
          }
          return v;
        });
        
        // Poi ricalcola tutte le anomalie per essere sicuri
        const vociConAnomalieRicalcolate = voci.map(v => {
          const anomalieVoce = verificaAnomalieVoce(v, voci);
          return { ...v, anomalie: anomalieVoce };
        });
        
        // Calcola anomalie a livello fattura
        const anomalie = getAnomalieFattura({ ...f, voci: vociConAnomalieRicalcolate });
        const stato = anomalie.length > 0 ? 'anomalia' : 'da_importare';
        
        const updatedFattura = {
          ...f,
          voci: vociConAnomalieRicalcolate,
          anomalie,
          stato: stato as any
        };
        
        if (onUpdateFattura) {
          onUpdateFattura(fatturaId, updatedFattura);
        }
        
        return updatedFattura;
      }
      return f;
    }));
  };

  const handleAggiungiProdottiMancanti = (fatturaId: number, prestazione: string) => {
    setShowAddProdottiModal({ fatturaId, prestazione });
  };

  const handleAggiungiMacchinarioMancante = (fatturaId: number, prestazione: string) => {
    setShowAddMacchinarioModal({ fatturaId, prestazione });
  };

  const handleConfermaPrestazioneMacchinarioCompleta = (fatturaId: number, prestazione: string) => {
    setFatture(fatture.map(f => {
      if (f.id === fatturaId && f.voci) {
        const voci = f.voci.map(v => {
          if (v.codice === prestazione && v.anomalie?.includes('prestazione_senza_macchinario')) {
            return {
              ...v,
              anomalie: v.anomalie.filter(a => a !== 'prestazione_senza_macchinario')
            };
          }
          return v;
        });
        
        const anomalie = getAnomalieFattura({ ...f, voci });
        const stato = anomalie.length > 0 ? 'anomalia' : 'da_importare';
        
        return {
          ...f,
          voci,
          anomalie,
          stato: stato as any
        };
      }
      return f;
    }));
  };

  const handleConfermaPrestazioneCompleta = (fatturaId: number, prestazione: string) => {
    setFatture(fatture.map(f => {
      if (f.id === fatturaId && f.voci) {
        const voci = f.voci.map(v => {
          if (v.codice === prestazione && v.anomalie?.includes('prestazione_incompleta')) {
            return {
              ...v,
              anomalie: v.anomalie.filter(a => a !== 'prestazione_incompleta')
            };
          }
          return v;
        });
        
        const anomalie = getAnomalieFattura({ ...f, voci });
        const stato = anomalie.length > 0 ? 'anomalia' : 'da_importare';
        
        return {
          ...f,
          voci,
          anomalie,
          stato: stato as any
        };
      }
      return f;
    }));
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

  const confermaAggiungiMacchinario = (macchinarioSelezionato: string) => {
    if (!showAddMacchinarioModal) return;
    
    const { fatturaId, prestazione } = showAddMacchinarioModal;
    
    setFatture(fatture.map(f => {
      if (f.id === fatturaId && f.voci) {
        // Trova il macchinario selezionato
        const macchinario = macchinari.find(m => m.codice === macchinarioSelezionato);
        if (!macchinario) return f;
        
        // Aggiorna la voce esistente della prestazione trasformandola in prestazione+macchinario
        const voci = f.voci.map(v => {
          if (v.codice === prestazione && v.anomalie?.includes('prestazione_senza_macchinario')) {
            // Aggiorna la voce esistente
            return {
              ...v,
              codice: `${prestazione}${macchinarioSelezionato}`,
              descrizione: `${prestazioniMap[prestazione]?.descrizione} - ${macchinario.nome}`,
              tipo: 'macchinario' as const,
              // Mantieni l'importo esistente della prestazione
              anomalie: v.anomalie.filter(a => a !== 'prestazione_senza_macchinario')
            } as VoceFattura;
          }
          return v;
        });
        
        // Ricalcola anomalie
        const anomalie = getAnomalieFattura({ ...f, voci });
        const stato = anomalie.length > 0 ? 'anomalia' : 'da_importare';
        
        return {
          ...f,
          voci,
          anomalie,
          stato: stato as any
        };
      }
      return f;
    }));
    
    setShowAddMacchinarioModal(null);
  };

  // Handler per correggere unità di misura
  const handleCorreggiUnita = (fatturaId: number, voceId: number, unitaCorretta: string) => {
    setFatture(fatture.map(f => {
      if (f.id === fatturaId && f.voci) {
        const voci = f.voci.map(v => {
          if (v.id === voceId) {
            // Rimuovi l'anomalia unita_incompatibile
            const anomalieFiltrate = v.anomalie ? v.anomalie.filter(a => a !== 'unita_incompatibile') : [];
            return { ...v, unita: unitaCorretta, anomalie: anomalieFiltrate };
          }
          return v;
        });
        
        // Ricalcola tutte le anomalie
        const nuoveAnomalie = calculateAnomalie(voci, f.medicoId);
        const stato = nuoveAnomalie.length > 0 ? 'anomalia' : 'da_importare';
        
        const updatedFattura = { ...f, voci, anomalie: nuoveAnomalie, stato: stato as any };
        
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
    console.log('Correzione quantità:', { fatturaId, voceId, nuovaQuantita });
    
    setFatture(fatture.map(f => {
      if (f.id === fatturaId && f.voci) {
        const voci = f.voci.map(v => {
          if (v.id === voceId) {
            // Aggiorna la quantità e rimuovi sempre l'anomalia quantita_anomala
            const anomalieFiltrate = v.anomalie ? v.anomalie.filter(a => a !== 'quantita_anomala') : [];
            return { ...v, quantita: nuovaQuantita, anomalie: anomalieFiltrate };
          }
          return v;
        });
        
        
        // Ricalcola tutte le anomalie basandosi sulle voci aggiornate
        const nuoveAnomalie = calculateAnomalie(voci, f.medicoId);
        const stato = nuoveAnomalie.length > 0 ? 'anomalia' : 'da_importare';
        
        const updatedFattura = { ...f, voci, anomalie: nuoveAnomalie, stato: stato as any };
        
        if (onUpdateFattura) {
          onUpdateFattura(fatturaId, updatedFattura);
        }
        
        return updatedFattura;
      }
      return f;
    }));
    
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
    console.log('Correzione codice:', { fatturaId, voceId, nuovoCodice });
    
    setFatture(fatture.map(f => {
      if (f.id === fatturaId && f.voci) {
        // Prima passo: aggiorna il codice della voce
        let vociConNuovoCodice = f.voci.map(v => {
          if (v.id === voceId) {
            let nuovaDescrizione = v.descrizione;
            let nuovoTipo: 'prestazione' | 'prodotto' | 'macchinario' = v.tipo || 'prestazione';
            let nuovaPrestazionePadre: string | undefined = v.prestazionePadre;
            let nuovaUnita = v.unita;
            let nuovoImportoNetto = v.importoNetto;
            let nuovoImportoLordo = v.importoLordo;
            let quantitaAggiornata = nuovaQuantita !== undefined ? nuovaQuantita : v.quantita;
            
            // Prima cerca nelle combinazioni per capire il tipo
            const combinazione = combinazioni.find(c => c.codice === nuovoCodice);
            console.log('Combinazione trovata:', combinazione);
            
            // Se non è una combinazione, potrebbe essere una prestazione semplice
            if (!combinazione) {
              const prestazioneSemplice = prestazioniMap[nuovoCodice];
              if (prestazioneSemplice) {
                nuovaDescrizione = prestazioneSemplice.descrizione;
                nuovoTipo = 'prestazione';
                nuovaPrestazionePadre = undefined;
                nuovaUnita = 'prestazione';
                quantitaAggiornata = 1; // Prestazioni sempre quantità 1
                // Se viene fornito un nuovo prezzo per la prestazione
                if (nuovoPrezzo !== undefined && nuovoPrezzo > 0) {
                  nuovoImportoNetto = nuovoPrezzo;
                  nuovoImportoLordo = nuovoPrezzo;
                }
              }
            } else if (combinazione) {
              if (combinazione.tipo === 'prestazione') {
                // È una prestazione semplice
                const prestazione = prestazioniMap[combinazione.prestazione!];
                if (prestazione) {
                  nuovaDescrizione = prestazione.descrizione;
                  nuovoTipo = 'prestazione';
                  nuovaPrestazionePadre = undefined; // Le prestazioni non hanno prestazione padre
                  nuovaUnita = 'prestazione';
                  quantitaAggiornata = 1; // Prestazioni sempre quantità 1
                  // Se viene fornito un nuovo prezzo per la prestazione
                  if (nuovoPrezzo !== undefined && nuovoPrezzo > 0) {
                    nuovoImportoNetto = nuovoPrezzo;
                    nuovoImportoLordo = nuovoPrezzo;
                  }
                }
              } else if (combinazione.tipo === 'prestazione+prodotto') {
                // È un prodotto
                const prestazione = prestazioniMap[combinazione.prestazione!];
                const prodotto = prodottiMap[combinazione.accessorio!];
                if (prestazione && prodotto) {
                  nuovaDescrizione = `${prestazione.descrizione} - ${prodotto.nome}`;
                  nuovoTipo = 'prodotto';
                  // Imposta la prestazione padre per evitare l'anomalia prodotto_orfano
                  nuovaPrestazionePadre = combinazione.prestazione;
                  nuovaUnita = prodotto.unita; // Usa l'unità corretta del prodotto
                  // I prodotti hanno sempre prezzo 0
                  nuovoImportoNetto = 0;
                  nuovoImportoLordo = 0;
                }
              } else if (combinazione.tipo === 'prestazione+macchinario') {
                // È un macchinario
                const prestazione = prestazioniMap[combinazione.prestazione!];
                const macchinario = macchinari.find(m => m.codice === combinazione.accessorio);
                if (prestazione && macchinario) {
                  nuovaDescrizione = `${prestazione.descrizione} - ${macchinario.nome}`;
                  nuovoTipo = 'macchinario';
                  nuovaPrestazionePadre = combinazione.prestazione;
                  nuovaUnita = 'utilizzo'; // I macchinari usano sempre 'utilizzo'
                  quantitaAggiornata = 1; // Macchinari sempre quantità 1
                  // Se viene fornito un nuovo prezzo per il macchinario
                  if (nuovoPrezzo !== undefined && nuovoPrezzo > 0) {
                    nuovoImportoNetto = nuovoPrezzo;
                    nuovoImportoLordo = nuovoPrezzo;
                  }
                }
              }
            }
            
            const voceAggiornata = { 
              ...v, 
              codice: nuovoCodice, 
              descrizione: nuovaDescrizione, 
              tipo: nuovoTipo,
              prestazionePadre: nuovaPrestazionePadre,
              unita: nuovaUnita,
              importoNetto: nuovoImportoNetto,
              importoLordo: nuovoImportoLordo,
              quantita: quantitaAggiornata
            };
            
            console.log('Voce prima:', v);
            console.log('Voce aggiornata:', voceAggiornata);
            return voceAggiornata;
          }
          return v;
        });
        
        // Secondo passo: ricalcola le anomalie per tutte le voci
        const voci = vociConNuovoCodice.map(v => {
          const anomalieVoce = verificaAnomalieVoce(v, vociConNuovoCodice);
          console.log(`Anomalie ricalcolate per voce ${v.id} (${v.codice}):`, {
            codice: v.codice,
            tipo: v.tipo,
            prestazionePadre: v.prestazionePadre,
            anomalie: anomalieVoce,
            vociPresenti: vociConNuovoCodice.map(vx => ({ codice: vx.codice, tipo: vx.tipo }))
          });
          return { ...v, anomalie: anomalieVoce };
        });
        
        // Ricalcola importi se necessario
        const totaleNetto = voci.reduce((sum, v) => sum + (v.importoNetto || 0), 0);
        const totaleIva = totaleNetto * 0.22;
        
        const anomalie = getAnomalieFattura({ ...f, voci });
        console.log('Anomalie fattura dopo correzione:', anomalie);
        const stato = anomalie.length > 0 ? 'anomalia' : 'da_importare';
        console.log('Nuovo stato fattura:', stato);
        
        const updatedFattura = { 
          ...f, 
          voci, 
          anomalie, 
          stato: stato as any,
          imponibile: totaleNetto,
          iva: totaleIva,
          totale: totaleNetto + totaleIva
        };
        
        console.log('Fattura aggiornata:', updatedFattura);
        
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
      'prestazione_senza_macchinario': { label: 'Macchinario mancante', color: 'text-yellow-600', icon: AlertTriangle },
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
                <div className="flex items-center gap-2">
                  <select
                    className="text-xs border border-gray-300 rounded px-2 py-1"
                    id={`medico-select-${fatturaId}`}
                    defaultValue=""
                  >
                    <option value="">Seleziona medico...</option>
                    {medici.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nome} {m.cognome}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      const selectElement = document.getElementById(`medico-select-${fatturaId}`) as HTMLSelectElement;
                      const medicoId = parseInt(selectElement?.value || '0');
                      if (medicoId) {
                        const medico = medici.find(m => m.id === medicoId);
                        if (medico && confirm(`Confermi l'assegnazione di ${medico.nome} ${medico.cognome} a questa fattura?`)) {
                          handleAssegnaMedicoSingolo(fatturaId, medicoId, `${medico.nome} ${medico.cognome}`);
                        }
                      } else {
                        alert('Seleziona un medico prima di confermare');
                      }
                    }}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Conferma
                  </button>
                </div>
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
  const handleExportXLSX = () => {
    // Prepara i dati per l'export - tutte le voci delle fatture filtrate
    const exportData: any[] = [];
    
    fattureFiltered.forEach(fattura => {
      if (!fattura.voci) return;
      
      fattura.voci.forEach(voce => {
        exportData.push({
          'Numero Fattura': fattura.numero || '',
          'Serie': fattura.serie || '',
          'Data Emissione': fattura.dataEmissione || fattura.data || '',
          'Cliente': fattura.clienteNome || fattura.paziente || '',
          'Medico': fattura.medicoNome || '',
          'Stato Fattura': fattura.stato || '',
          'Codice': voce.codice || '',
          'Descrizione': voce.descrizione || '',
          'Tipo': voce.tipo || '',
          'Quantità': voce.quantita || 0,
          'Unità': voce.unita || '',
          'Importo Netto': voce.importoNetto || 0,
          'Importo Lordo': voce.importoLordo || 0,
          'Anomalie': voce.anomalie ? voce.anomalie.join(', ') : ''
        });
      });
    });
    
    // Crea un nuovo workbook
    const wb = XLSX.utils.book_new();
    
    // Crea un worksheet dai dati
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Imposta le larghezze delle colonne
    const columnWidths = [
      { wch: 15 }, // Numero Fattura
      { wch: 8 },  // Serie
      { wch: 12 }, // Data
      { wch: 25 }, // Cliente
      { wch: 20 }, // Medico
      { wch: 15 }, // Stato
      { wch: 20 }, // Codice
      { wch: 35 }, // Descrizione
      { wch: 12 }, // Tipo
      { wch: 10 }, // Quantità
      { wch: 10 }, // Unità
      { wch: 12 }, // Importo Netto
      { wch: 12 }, // Importo Lordo
      { wch: 30 }  // Anomalie
    ];
    ws['!cols'] = columnWidths;
    
    // Aggiungi il worksheet al workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Voci Fatture');
    
    // Genera il file e scaricalo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const fileName = `export_voci_fatture_${timestamp}.xlsx`;
    XLSX.writeFile(wb, fileName);
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
                                  const prestazione = prestazioniMap[prestazioneSuggerita];
                                  const prezzoKey = `prezzo-${fattura.id}-${voce.id}`;
                                  const prezzoTemp = prezzoTempProdottoOrfano[prezzoKey] ?? voce.importoNetto;
                                  
                                  return (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-600">
                                          Associa a: <strong>{prestazioneSuggerita}</strong> - {prestazione?.descrizione}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-600">Prezzo:</span>
                                        <input
                                          type="number"
                                          min="0.01"
                                          step="0.01"
                                          value={prezzoTemp}
                                          onChange={(e) => {
                                            const nuovoPrezzo = parseFloat(e.target.value) || 0;
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
                                            // Prima aggiorna il prezzo se necessario
                                            if (prezzoTemp !== voce.importoNetto && prezzoTemp > 0) {
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
                                        [key]: parseInt(e.target.value) || 0
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
              const anomalie = v.anomalie || [];
              return anomalie.includes('prestazione_incompleta');
            }).map(voce => {
              // Controlla se ci sono già prodotti per questa prestazione
              const prodottiPresenti = fattura.voci.filter(v => 
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
              const macchinariPresenti = fattura.voci.filter(v => 
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
    // Usa le anomalie già presenti nella fattura se esistono
    const anomalie = fattura.anomalie && fattura.anomalie.length > 0 
      ? fattura.anomalie 
      : getAnomalieFattura(fattura);
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
    const [prodottiGiaPresenti, setProdottiGiaPresenti] = useState<string[]>([]);
    const [showDuplicateWarning, setShowDuplicateWarning] = useState<string | null>(null);
    
    // Trova i prodotti già presenti per questa prestazione
    useEffect(() => {
      if (!showAddProdottiModal) return;
      
      const fattura = fatture.find(f => f.id === showAddProdottiModal.fatturaId);
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
    }, [showAddProdottiModal, fatture, prestazione]);

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
                  onChange={(e) => setPrezzoSuggerito(parseFloat(e.target.value) || 0)}
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
                  onChange={(e) => setQuantitaProdotto(parseInt(e.target.value) || 1)}
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

      {/* Stati Overview */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => setFiltroStato('tutti')}
            className={`p-4 rounded-lg border ${
              filtroStato === 'tutti' ? 'border-[#03A6A6] bg-[#03A6A6]/5' : 'border-gray-200 bg-white'
            } hover:border-[#03A6A6] transition-all`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Tutte le fatture</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                {fatture.length}
              </span>
            </div>
          </button>
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
            'prestazione_senza_macchinario': { label: 'Prestazione senza macchinario', color: 'text-yellow-600', icon: AlertTriangle },
            'prodotto_orfano': { label: 'Prodotto senza prestazione', color: 'text-purple-600', icon: AlertTriangle },
            'codice_sconosciuto': { label: 'Codice non valido', color: 'text-red-700', icon: X },
            'prestazione_duplicata': { label: 'Prestazione duplicata', color: 'text-blue-600', icon: RefreshCw },
            'unita_incompatibile': { label: 'Unità incompatibile', color: 'text-indigo-600', icon: AlertTriangle },
            'quantita_anomala': { label: 'Quantità anomala', color: 'text-pink-600', icon: AlertCircle }
          };
          
          return (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <h3 className="text-sm font-medium text-red-800 mb-2">Anomalie Rilevate</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(riepilogoAnomalie).map(([anomalia, count]) => {
                  const config = anomalieConfig[anomalia];
                  if (!config) return null;
                  const Icon = config.icon;
                  return (
                    <button
                      key={anomalia}
                      onClick={() => {
                        if (filtroAnomalia === anomalia) {
                          setFiltroAnomalia('tutte');
                        } else {
                          setFiltroAnomalia(anomalia);
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full transition-colors ${
                        filtroAnomalia === anomalia 
                          ? 'bg-white border-2 border-red-400 shadow-sm' 
                          : 'bg-white hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${config.color}`} />
                      <span className="text-gray-700">{config.label}</span>
                      <span className="font-bold text-gray-900">{count}</span>
                    </button>
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
              <div className="flex items-center gap-2">
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
              {/* Pulsanti Import/Export sempre visibili */}
              <button
                onClick={() => setShowImportDialog(true)}
                className="px-3 py-2 text-sm bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                title="Importa dati da file Excel"
              >
                <FileUp className="w-4 h-4" />
                Import
              </button>
              
              <button
                onClick={handleExportXLSX}
                className="px-3 py-2 text-sm bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                title="Esporta voci fatture filtrate in Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export
              </button>
              
              {/* Separatore */}
              {selectedFatture.length > 0 && (
                <div className="h-6 w-px bg-gray-300 mx-2" />
              )}
              
              {/* Azioni per selezione */}
              {selectedFatture.length > 0 && (
                <>
                  <span className="text-sm text-gray-600 mr-2">
                    {selectedFatture.length} selezionate
                  </span>
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
      
      {/* Modal Aggiungi Macchinario */}
      {showAddMacchinarioModal && (
        <ModalAggiungiMacchinario
          prestazione={showAddMacchinarioModal.prestazione}
          onConfirm={confermaAggiungiMacchinario}
          onCancel={() => setShowAddMacchinarioModal(null)}
        />
      )}
      
      {/* Modal Correggi Codice */}
      {showCorreggiCodiceModal && (() => {
        const fattura = fatture.find(f => f.id === showCorreggiCodiceModal.fatturaId);
        const voce = fattura?.voci?.find(v => v.id === showCorreggiCodiceModal.voceId);
        if (!voce) return null;
        
        return (
          <ModalCorreggiCodice
            codiceAttuale={showCorreggiCodiceModal.codiceAttuale}
            voceCorrente={voce}
            onConfirm={(nuovoCodice, prezzo, quantita) => handleCorreggiCodice(showCorreggiCodiceModal.fatturaId, showCorreggiCodiceModal.voceId, nuovoCodice, prezzo, quantita)}
            onCancel={() => setShowCorreggiCodiceModal(null)}
          />
        );
      })()}
      
      {/* Dialog Import File */}
      {showImportDialog && (
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
              onChange={handleFileUpload}
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
                onClick={() => setShowImportDialog(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Mappatura Campi */}
      {showMappingModal && (
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
                      value={fieldMapping[campo.key] || ''}
                      onChange={(e) => setFieldMapping({
                        ...fieldMapping,
                        [campo.key]: e.target.value
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
                <h4 className="text-sm font-medium text-gray-700 mb-2">
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
                  setShowMappingModal(false);
                  setUploadedFile(null);
                  setFileData([]);
                  setFileColumns([]);
                  setFieldMapping({});
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={processImportedData}
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