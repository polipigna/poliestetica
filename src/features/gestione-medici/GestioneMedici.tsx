import React, { useState, useEffect } from 'react';
import { 
  Eye,
  Download,
  Upload,
  ChevronLeft,
  AlertCircle,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Medico, MedicoRegoleCosti } from '@/data/mock';
import { prestazioni, prodotti } from '@/data/mock';
import { MediciStore } from '@/services/stores/mediciStore';
import type { MedicoExtended as MedicoExtendedStore } from '@/services/datasources/interfaces';

// Transform prestazioni to trattamentiDisponibili format
const trattamentiDisponibili = prestazioni.map(p => ({
  codice: p.codice,
  nome: p.descrizione
}));

// Transform prodotti to prodottiDisponibili format
const prodottiDisponibili = prodotti.map(p => ({
  nome: p.codice,
  unitaMisura: p.unita,
  prezzoDefault: p.prezzoDefault
}));

// Props interface
interface GestioneMediciProps {
  mediciIniziali: Medico[];
  regoleCosti: { [key: string]: MedicoRegoleCosti };
}

// Extended Medico interface for internal use
interface MedicoExtended extends Medico {
  specialita?: string;
  email?: string;
  telefono?: string;
  codiceFiscale?: string;
  partitaIva?: string;
  iban?: string;
  indirizzo?: string;
  attivo?: boolean;
  regolaBase?: any;
  costiProdotti?: any[];
  eccezioni?: any[];
}

// Gestione Medici Component
const GestioneMedici: React.FC<GestioneMediciProps> = ({ 
  mediciIniziali,
  regoleCosti
}) => {
  // Simulazione ruolo utente - in produzione verrebbe da auth/context
  const [userRole, setUserRole] = useState('admin'); // 'admin', 'segretaria', 'responsabile'
  const isAdmin = userRole === 'admin';
  
  // Trasforma i medici iniziali nel formato esteso
  const [medici, setMedici] = useState<MedicoExtended[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Ottieni istanza singleton dello store
  const mediciStore = MediciStore.getInstance();
  
  // Funzione per caricare medici dallo store
  const loadMedici = async () => {
    try {
      setIsLoading(true);
      
      // Carica medici dallo store (prima volta da mock, poi da localStorage)
      const mediciFromStore = await mediciStore.getMedici();
      
      // Trasforma nel formato interno del componente
      const mediciCompleti = mediciFromStore.map(m => {
        const medicoEsteso: MedicoExtended = {
          ...m,
          specialita: 'Medicina Estetica',
          email: `${m.nome.toLowerCase()}.${m.cognome.toLowerCase()}@email.com`,
          telefono: '333 ' + Math.floor(Math.random() * 9000000 + 1000000),
          codiceFiscale: m.cf,
          partitaIva: m.piva,
          iban: 'IT' + Math.random().toString().slice(2, 27),
          indirizzo: 'Via Demo 123, Padova',
          attivo: true,
          regolaBase: {
            tipo: m.regolaBase.tipo,
            valore: m.regolaBase.valore,
            valoreX: m.regolaBase.valoreX,
            valoreY: m.regolaBase.valoreY,
            su: m.regolaBase.calcolaSu,
            detraiCosto: m.regolaBase.detraiCosti
          },
          costiProdotti: m.costiProdotti.map((cp, idx) => ({
            id: idx + 1,
            nome: cp.codiceProdotto,
            costo: cp.costo,
            unitaMisura: 'unità',
            nonDetrarre: false
          })),
          eccezioni: m.eccezioni.map((ecc, idx) => ({
            id: idx + 1,
            trattamento: ecc.codice,
            prodotto: '',
            regola: {
              tipo: ecc.tipo,
              valore: ecc.valore,
              valoreX: ecc.valoreX,
              valoreY: ecc.valoreY,
              su: ecc.calcolaSu,
              detraiCosto: ecc.detraiCosti
            }
          }))
        };
        return medicoEsteso;
      });
      
      setMedici(mediciCompleti);
    } catch (error) {
      console.error('Errore caricamento medici dallo store:', error);
      alert('Errore nel caricamento dei medici');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Carica medici al mount del componente
    loadMedici();
    
    // Sottoscrivi agli aggiornamenti dello store per refresh automatici
    const unsubscribe = mediciStore.subscribe(() => {
      loadMedici();
    });
    
    // Cleanup
    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Array vuoto = solo al mount
  

  const [selectedMedico, setSelectedMedico] = useState<MedicoExtended | null>(null);
  const [activeTab, setActiveTab] = useState('anagrafica');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [showAddProdotto, setShowAddProdotto] = useState(false);
  const [editingProdotto, setEditingProdotto] = useState<any>(null);
  const [editingEccezione, setEditingEccezione] = useState<any>(null);
  const [showImportProdotti, setShowImportProdotti] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  
  // Stati per il simulatore
  const [simulazione, setSimulazione] = useState({
    trattamento: '',
    prodotto: '',
    importoFattura: '',
    ivaInclusa: true
  });
  const [risultatoSimulazione, setRisultatoSimulazione] = useState<any>(null);


  const [showNewMedico, setShowNewMedico] = useState(false);
  const [newMedico, setNewMedico] = useState({
    nome: '',
    cognome: '',
    specialita: 'Medicina Estetica',
    email: '',
    telefono: '',
    codiceFiscale: '',
    partitaIva: '',
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
    },
    costiProdotti: [],
    eccezioni: []
  });
  const [showAddEccezione, setShowAddEccezione] = useState(false);
  const [newEccezione, setNewEccezione] = useState({
    trattamento: '',
    prodotto: '',
    regola: {
      tipo: 'percentuale',
      valore: 50,
      valoreX: 50,
      valoreY: 200,
      su: 'netto',
      detraiCosto: true
    }
  });

  const calcolaCompenso = () => {
    if (!simulazione.trattamento || !simulazione.importoFattura || !selectedMedico) {
      return;
    }
    
    const importo = parseFloat(simulazione.importoFattura);
    if (isNaN(importo) || importo <= 0) {
      alert('Inserisci un importo valido');
      return;
    }
    
    // Calcola importo netto (scorporo IVA se inclusa)
    const importoLordo = importo;
    const importoNetto = simulazione.ivaInclusa ? importo / 1.22 : importo;
    
    // Trova la regola da applicare
    let regolaApplicata = selectedMedico.regolaBase;
    let tipoRegola = 'Regola base';
    
    // Controlla se c'è un'eccezione specifica per trattamento + prodotto
    if (simulazione.prodotto) {
      const eccezioneSpecifica = (selectedMedico?.eccezioni || []).find(
        e => e.trattamento === simulazione.trattamento && e.prodotto === simulazione.prodotto
      );
      if (eccezioneSpecifica) {
        regolaApplicata = eccezioneSpecifica.regola;
        tipoRegola = `Eccezione "${simulazione.trattamento} + ${simulazione.prodotto}"`;
      }
    }
    
    // Se non c'è eccezione specifica, controlla eccezione solo trattamento
    if (tipoRegola === 'Regola base') {
      const eccezioneTrattamento = (selectedMedico?.eccezioni || []).find(
        e => e.trattamento === simulazione.trattamento && !e.prodotto
      );
      if (eccezioneTrattamento) {
        regolaApplicata = eccezioneTrattamento.regola;
        tipoRegola = `Eccezione "${simulazione.trattamento}" (tutti i prodotti)`;
      }
    }
    
    // Calcola il compenso base
    const importoCalcolo = regolaApplicata.su === 'netto' ? importoNetto : importoLordo;
    let compensoBase = 0;
    let descrizioneCalcolo = '';
    
    switch (regolaApplicata.tipo) {
      case 'percentuale':
        compensoBase = (importoCalcolo * regolaApplicata.valore) / 100;
        descrizioneCalcolo = `${regolaApplicata.valore}% di €${importoCalcolo.toFixed(2)}`;
        break;
      case 'scaglioni':
        compensoBase = (importoCalcolo / regolaApplicata.valoreY) * regolaApplicata.valoreX;
        descrizioneCalcolo = `€${regolaApplicata.valoreX} ogni €${regolaApplicata.valoreY} di imponibile`;
        break;
      case 'fisso':
        compensoBase = regolaApplicata.valoreX / regolaApplicata.valoreY;
        descrizioneCalcolo = `€${regolaApplicata.valoreX} ogni ${regolaApplicata.valoreY} prestazioni`;
        break;
    }
    
    // Calcola detrazione costo prodotto
    let costoProdotto = 0;
    if (simulazione.prodotto && regolaApplicata.detraiCosto) {
      const prodottoConfig = (selectedMedico?.costiProdotti || []).find(
        cp => cp.nome === simulazione.prodotto
      );
      if (prodottoConfig) {
        costoProdotto = prodottoConfig.costo;
      }
    }
    
    const compensoFinale = compensoBase - costoProdotto;
    const margineClinica = importoNetto - compensoFinale;
    const percentualeMargine = (margineClinica / importoNetto) * 100;
    
    setRisultatoSimulazione({
      importoLordo,
      importoNetto,
      tipoRegola,
      regolaApplicata,
      descrizioneCalcolo,
      compensoBase,
      costoProdotto,
      compensoFinale,
      margineClinica,
      percentualeMargine
    });
  };

  const handleConfirmImport = () => {
    if (importPreview && !importPreview.error) {
      // Applica le modifiche ai prodotti esistenti
      let updatedCostiProdotti = (selectedMedico?.costiProdotti || []).map((p: any) => {
        const modifica = importPreview.modifiche.find((m: any) => m.nome === p.nome);
        if (modifica) {
          return {
            ...p,
            costo: modifica.nuovoCosto,
            nonDetrarre: modifica.nuovoCosto === 0
          };
        }
        return p;
      });
      
      // Aggiungi i nuovi prodotti
      importPreview.nuoviProdotti.forEach((np: any) => {
        updatedCostiProdotti.push({
          id: Date.now() + Math.random(), // ID unico
          nome: np.nome,
          costo: np.costo,
          unitaMisura: np.unitaMisura || 'unità',
          nonDetrarre: np.costo === 0
        });
      });
      
      const updatedMedico = {
        ...(selectedMedico as MedicoExtended),
        costiProdotti: updatedCostiProdotti
      };
      
      setSelectedMedico(updatedMedico);
      setHasUnsavedChanges(true);
      setShowImportConfirm(false);
      setImportFile(null);
      setImportPreview(null);
    }
  };

  const handleSave = async () => {
    // Se non è admin, salva solo i costi prodotti
    if (!isAdmin) {
      if (!selectedMedico) return;
      
      try {
        const costiProdotti = (selectedMedico.costiProdotti || []).map(cp => ({
          codiceProdotto: cp.nome,
          nomeProdotto: cp.nome,
          costo: cp.costo
        }));
        await mediciStore.updateCostiProdotti(selectedMedico.id, costiProdotti);
        
        setHasUnsavedChanges(false);
        alert('Costi prodotti salvati con successo!');
      } catch (error) {
        console.error('Errore salvataggio costi:', error);
        alert('Errore nel salvataggio dei costi prodotti');
      }
      return;
    }
    
    // Validazione regola base (solo per admin)
    if (!selectedMedico) return;
    const regola = selectedMedico.regolaBase;
    if (regola.tipo === 'percentuale' && (!regola.valore || regola.valore === '' || regola.valore === 0)) {
      alert('Inserisci una percentuale valida nella regola base');
      return;
    }
    if (regola.tipo === 'scaglioni') {
      if (!regola.valoreX || !regola.valoreY || regola.valoreX === 0 || regola.valoreY === 0) {
        alert('Inserisci valori validi per gli scaglioni nella regola base (X e Y devono essere maggiori di 0)');
        return;
      }
      if (regola.valoreX >= regola.valoreY) {
        alert('Nella regola base a scaglioni, X deve essere minore di Y (non puoi dare più di quanto incassi)');
        return;
      }
    }
    if (regola.tipo === 'fisso' && (!regola.valoreX || !regola.valoreY || regola.valoreX === 0 || regola.valoreY === 0)) {
      alert('Inserisci valori validi per la quota fissa nella regola base (X e Y devono essere maggiori di 0)');
      return;
    }
    
    // Validazione eccezioni
    for (const eccezione of selectedMedico.eccezioni || []) {
      if (!eccezione.trattamento) {
        alert('Tutte le eccezioni devono avere un trattamento selezionato');
        return;
      }
      
      const ecc = eccezione.regola;
      if (ecc.tipo === 'percentuale' && (!ecc.valore || ecc.valore === '' || ecc.valore === 0)) {
        alert(`L'eccezione per "${eccezione.trattamento}" deve avere una percentuale valida`);
        return;
      }
      if (ecc.tipo === 'scaglioni') {
        if (!ecc.valoreX || !ecc.valoreY || ecc.valoreX === 0 || ecc.valoreY === 0) {
          alert(`L'eccezione per "${eccezione.trattamento}" deve avere valori validi per gli scaglioni`);
          return;
        }
        if (ecc.valoreX >= ecc.valoreY) {
          alert(`L'eccezione per "${eccezione.trattamento}" ha valori scaglioni errati: X deve essere minore di Y`);
          return;
        }
      }
      if (ecc.tipo === 'fisso' && (!ecc.valoreX || !ecc.valoreY || ecc.valoreX === 0 || ecc.valoreY === 0)) {
        alert(`L'eccezione per "${eccezione.trattamento}" deve avere valori validi per la quota fissa`);
        return;
      }
      
      // Validazione prodotto non configurato con detrazione costo
      if (eccezione.prodotto && eccezione.regola.detraiCosto) {
        const prodottoConfigurato = (selectedMedico.costiProdotti || []).some(
          cp => cp.nome === eccezione.prodotto
        );
        if (!prodottoConfigurato) {
          alert(`L'eccezione per "${eccezione.trattamento}" con prodotto "${eccezione.prodotto}" ha la detrazione costi attiva ma il prodotto non è configurato nella lista costi. Configura il prodotto o disattiva la detrazione costi.`);
          return;
        }
      }
    }
    
    // Salva nello store tutti i dati del medico
    try {
      // Aggiorna dati base medico
      await mediciStore.updateMedico(selectedMedico.id, {
        nome: selectedMedico.nome,
        cognome: selectedMedico.cognome,
        cf: selectedMedico.codiceFiscale || selectedMedico.cf,
        piva: selectedMedico.partitaIva || selectedMedico.piva
      });
      
      // Aggiorna regole compensi
      await mediciStore.updateRegoleCompensi(selectedMedico.id, {
        tipo: selectedMedico.regolaBase.tipo,
        valore: selectedMedico.regolaBase.valore,
        valoreX: selectedMedico.regolaBase.valoreX,
        valoreY: selectedMedico.regolaBase.valoreY,
        calcolaSu: selectedMedico.regolaBase.su,
        detraiCosti: selectedMedico.regolaBase.detraiCosto
      });
      
      // Aggiorna costi prodotti (in aggiunta a quello già fatto sopra per non-admin)
      const costiProdotti = (selectedMedico.costiProdotti || []).map(cp => ({
        codiceProdotto: cp.nome,
        nomeProdotto: cp.nome,
        costo: cp.costo
      }));
      await mediciStore.updateCostiProdotti(selectedMedico.id, costiProdotti);
      
      // Aggiorna eccezioni
      const eccezioni = (selectedMedico.eccezioni || []).map(ecc => ({
        codice: ecc.trattamento,
        descrizione: ecc.trattamento,
        tipo: ecc.regola.tipo,
        valore: ecc.regola.valore,
        valoreX: ecc.regola.valoreX,
        valoreY: ecc.regola.valoreY,
        calcolaSu: ecc.regola.su,
        detraiCosti: ecc.regola.detraiCosto
      }));
      await mediciStore.updateEccezioni(selectedMedico.id, eccezioni);
      
      setHasUnsavedChanges(false);
      alert('Modifiche salvate con successo!');
      // loadMedici verrà chiamato automaticamente dal subscribe
    } catch (error) {
      console.error('Errore salvataggio:', error);
      alert('Errore nel salvataggio delle modifiche');
    }
  };

  const handleDeleteMedico = async (id: number) => {
    try {
      await mediciStore.deleteMedico(id);
      setShowDeleteConfirm(null);
      if (selectedMedico?.id === id) {
        setSelectedMedico(null);
      }
      alert('Medico eliminato con successo');
      // loadMedici verrà chiamato automaticamente dal subscribe
    } catch (error) {
      console.error('Errore eliminazione:', error);
      alert('Errore nell\'eliminazione del medico');
    }
  };

  const handleAddProdotto = (prodotto: any) => {
    if (selectedMedico && prodotto) {
      // Verifica se il prodotto esiste già
      const prodottoEsistente = (selectedMedico.costiProdotti || []).some(
        (cp: any) => cp.nome === prodotto.nome
      );
      
      if (prodottoEsistente) {
        alert(`Il prodotto "${prodotto.nome}" è già stato configurato per questo medico`);
        return;
      }
      
      // Trova l'unità di misura dal prodotto disponibile
      const prodottoDisponibile = prodottiDisponibili.find(p => p.nome === prodotto.nome);
      
      const newProdotto = {
        id: Date.now(),
        nome: prodotto.nome,
        costo: prodotto.costo,
        unitaMisura: prodottoDisponibile?.unitaMisura || 'unità',
        nonDetrarre: prodotto.nonDetrarre
      };
      
      const updatedMedico = {
        ...selectedMedico,
        costiProdotti: [...(selectedMedico.costiProdotti || []), newProdotto]
      };
      
      setSelectedMedico(updatedMedico);
      setHasUnsavedChanges(true);
    }
  };

  const handleExportProdotti = () => {
    if (selectedMedico) {
      // Prepara i dati per Excel
      const data = (selectedMedico.costiProdotti || []).map(p => ({
        'Nome Prodotto': p.nome,
        'Unità di Misura': p.unitaMisura || 'unità',
        'Costo': p.costo
      }));
      
      // Crea un nuovo workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Aggiungi il worksheet al workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Costi Prodotti');
      
      // Genera il nome del file
      const fileName = `costi_prodotti_${selectedMedico.cognome}_${selectedMedico.nome}.xlsx`;
      
      try {
        // Prova il download diretto
        XLSX.writeFile(wb, fileName);
      } catch (error) {
        // Se fallisce, crea un blob e un link manuale
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        
        // Crea un link temporaneo e cliccalo
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
      }
    }
  };

  const handleImportProdotti = () => {
    if (!importFile || !selectedMedico) {
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Prendi il primo foglio
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        // Prepara le modifiche e i nuovi prodotti da confermare
        const modifiche: any[] = [];
        const nuoviProdotti: any[] = [];
        const prodottiNonValidi: any[] = [];
        
        const prodottiAttualiMap: Record<string, any> = {};
        (selectedMedico?.costiProdotti || []).forEach((p: any) => {
          prodottiAttualiMap[p.nome] = p;
        });
        
        jsonData.forEach((row: any) => {
          const nomeProdotto = row['Nome Prodotto'];
          const nuovoCosto = Math.max(0, parseFloat(row['Costo']) || 0);
          
          if (nomeProdotto) {
            // Se il prodotto esiste già, registra la modifica
            if (prodottiAttualiMap[nomeProdotto]) {
              const vecchioCosto = prodottiAttualiMap[nomeProdotto].costo;
              if (vecchioCosto !== nuovoCosto) {
                modifiche.push({
                  nome: nomeProdotto,
                  vecchioCosto: vecchioCosto,
                  nuovoCosto: nuovoCosto
                });
              }
            } else {
              // Se il prodotto non esiste, verifica se è nella lista disponibili
              const prodottoDisponibile = prodottiDisponibili.find(p => p.nome === nomeProdotto);
              if (prodottoDisponibile) {
                nuoviProdotti.push({
                  nome: nomeProdotto,
                  costo: nuovoCosto,
                  unitaMisura: prodottoDisponibile.unitaMisura
                });
              } else {
                prodottiNonValidi.push(nomeProdotto);
              }
            }
          }
        });
        
        // Se ci sono prodotti non validi, li includiamo nel preview
        if (modifiche.length === 0 && nuoviProdotti.length === 0) {
          // Usa setState invece di alert
          setImportPreview({
            error: 'Nessuna modifica o nuovo prodotto valido rilevato nel file importato.',
            prodottiNonValidi: prodottiNonValidi
          });
          setShowImportConfirm(true);
          return;
        }
        
        // Salva il preview per il modal di conferma
        setImportPreview({
          modifiche,
          nuoviProdotti,
          prodottiNonValidi
        });
        setShowImportConfirm(true);
        setShowImportProdotti(false); // Chiudi il modal di import
        
      } catch (error) {
        setImportPreview({
          error: `Errore durante la lettura del file Excel: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`
        });
        setShowImportConfirm(true);
      }
    };
    
    reader.onerror = (error) => {
      setImportPreview({
        error: 'Errore durante la lettura del file'
      });
      setShowImportConfirm(true);
    };
    
    // Leggi il file come binary string
    reader.readAsBinaryString(importFile);
  };

  const handleUpdateProdotto = (id: number, costo: string | number) => {
    if (selectedMedico) {
      const nuovoCosto = Math.max(0, parseFloat(String(costo)) || 0); // Previene valori negativi
      const updatedMedico = {
        ...selectedMedico,
        costiProdotti: (selectedMedico.costiProdotti || []).map((p: any) =>
          p.id === id ? { 
            ...p, 
            costo: nuovoCosto,
            nonDetrarre: nuovoCosto === 0 
          } : p
        )
      };
      
      setSelectedMedico(updatedMedico);
      setHasUnsavedChanges(true);
      setEditingProdotto(null);
    }
  };

  const handleRemoveProdotto = (id: number) => {
    if (selectedMedico) {
      const updatedMedico = {
        ...selectedMedico,
        costiProdotti: (selectedMedico.costiProdotti || []).filter((p: any) => p.id !== id)
      };
      
      setSelectedMedico(updatedMedico);
      setHasUnsavedChanges(true);
    }
  };

  const handleUpdateEccezione = (id: number, updates: any) => {
    if (selectedMedico) {
      const updatedMedico = {
        ...selectedMedico,
        eccezioni: (selectedMedico.eccezioni || []).map((e: any) =>
          e.id === id ? { ...e, ...updates } : e
        )
      };
      
      setSelectedMedico(updatedMedico);
      setHasUnsavedChanges(true);
    }
  };

  const handleRemoveEccezione = (id: number) => {
    if (selectedMedico) {
      const updatedMedico = {
        ...selectedMedico,
        eccezioni: (selectedMedico.eccezioni || []).filter((e: any) => e.id !== id)
      };
      
      setSelectedMedico(updatedMedico);
      setHasUnsavedChanges(true);
      if (editingEccezione === id) {
        setEditingEccezione(null);
      }
    }
  };

  const validateCoherence = (regolaBase: any, eccezioni: any[], costiProdotti: any[]) => {
    const warnings: any[] = [];
    
    eccezioni.forEach((eccezione: any) => {
      // 1. Eccezione identica a regola base
      if (eccezione.regola.tipo === regolaBase.tipo &&
          eccezione.regola.su === regolaBase.su &&
          eccezione.regola.detraiCosto === regolaBase.detraiCosto) {
        
        let isIdentical = false;
        
        if (eccezione.regola.tipo === 'percentuale' && 
            eccezione.regola.valore === regolaBase.valore) {
          isIdentical = true;
        } else if (eccezione.regola.tipo === 'scaglioni' &&
                   eccezione.regola.valoreX === regolaBase.valoreX &&
                   eccezione.regola.valoreY === regolaBase.valoreY) {
          isIdentical = true;
        } else if (eccezione.regola.tipo === 'fisso' &&
                   eccezione.regola.valoreX === regolaBase.valoreX &&
                   eccezione.regola.valoreY === regolaBase.valoreY) {
          isIdentical = true;
        }
        
        if (isIdentical) {
          warnings.push({
            tipo: 'identica',
            eccezione: eccezione,
            messaggio: `L'eccezione per "${eccezione.trattamento}" è identica alla regola base`
          });
        }
      }
      
      // 2. Eccezione più generosa (solo per percentuali)
      if (eccezione.regola.tipo === 'percentuale' && regolaBase.tipo === 'percentuale') {
        if (eccezione.regola.valore > regolaBase.valore) {
          warnings.push({
            tipo: 'generosa',
            eccezione: eccezione,
            messaggio: `L'eccezione per "${eccezione.trattamento}" (${eccezione.regola.valore}%) è più alta della regola base (${regolaBase.valore}%)`
          });
        }
      }
      
      // 3. Prodotto non configurato con detrazione costo
      if (eccezione.prodotto && eccezione.regola.detraiCosto) {
        const prodottoConfigurato = costiProdotti.some(cp => cp.nome === eccezione.prodotto);
        if (!prodottoConfigurato) {
          warnings.push({
            tipo: 'prodotto-mancante',
            eccezione: eccezione,
            messaggio: `L'eccezione per "${eccezione.trattamento}" con prodotto "${eccezione.prodotto}" ha la detrazione costi attiva ma il prodotto non è configurato`
          });
        }
      }
    });
    
    return warnings;
  };

  const getRegolaDescription = (regola: any) => {
    switch (regola.tipo) {
      case 'percentuale':
        return regola.valore && regola.valore !== '' ? `${regola.valore}% su ${regola.su}` : 'Percentuale non configurata';
      case 'scaglioni':
        return regola.valoreX && regola.valoreY && regola.valoreX !== '' && regola.valoreY !== '' 
          ? `€${regola.valoreX} ogni €${regola.valoreY} ${regola.su}` 
          : 'Scaglioni non configurati';
      case 'fisso':
        return regola.valoreX && regola.valoreY && regola.valoreX !== '' && regola.valoreY !== '' 
          ? `€${regola.valoreX} ogni ${regola.valoreY} prestazioni` 
          : 'Quota fissa non configurata';
      default:
        return '-';
    }
  };

  // Vista Lista Medici
  if (!selectedMedico) {
    return (
      <div className="space-y-6">
        {/* Header con selector ruolo */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-800">Gestione Medici</h2>
          <div className="flex items-center gap-4">
            {/* Selector ruolo per demo */}
            <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
              <span className="text-sm text-gray-600">Ruolo:</span>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                className="bg-transparent text-sm font-medium text-gray-800 focus:outline-none"
              >
                <option value="admin">Admin</option>
                <option value="segretaria">Segretaria</option>
                <option value="responsabile">Responsabile</option>
              </select>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowNewMedico(true)}
                className="px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium shadow-md"
                style={{ backgroundColor: '#03A6A6', color: '#FFFFFF' }}
                onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#028a8a'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#03A6A6'}
              >
                <span className="text-lg" style={{ color: '#FFFFFF' }}>➕</span>
                <span style={{ color: '#FFFFFF' }}>Aggiungi Medico</span>
              </button>
            )}
          </div>
        </div>

        {/* Lista Medici */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {medici.map(medico => (
            <div
              key={medico.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedMedico(medico);
                setActiveTab('anagrafica');
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {medico.cognome} {medico.nome}
                  </h3>
                  <p className="text-sm text-gray-600">{medico.specialita}</p>
                </div>
                <div className="flex items-center gap-2">
                  {medico.attivo ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      Attivo
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                      Inattivo
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="font-medium">Regola base:</span>
                  <span className="text-[#03A6A6] font-medium">
                    {getRegolaDescription(medico.regolaBase)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="font-medium">Prodotti configurati:</span>
                  <span>{(medico.costiProdotti || []).length}</span>
                  {medico.costiProdotti && medico.costiProdotti.length > 0 && (
                    <span className="text-xs text-gray-500">
                      ({(medico.costiProdotti || []).slice(0, 2).map(p => p.unitaMisura || 'unità').join(', ')}
                      {(medico.costiProdotti || []).length > 2 && '...'})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="font-medium">Eccezioni:</span>
                  <span>{(medico.eccezioni || []).length}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMedico(medico);
                    setActiveTab('anagrafica');
                  }}
                  className="text-[#03A6A6] hover:text-[#028a8a] text-sm font-medium flex items-center gap-1"
                >
                  <Eye className="w-4 h-4" />
                  Dettagli
                </button>
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(medico.id);
                    }}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    🗑️ Elimina
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Conferma Eliminazione */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Conferma Eliminazione</h3>
              <p className="text-gray-600 mb-6">
                Sei sicuro di voler eliminare questo medico? L'operazione non può essere annullata.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium"
                  style={{ backgroundColor: '#FFFFFF', color: '#374151' }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#F9FAFB'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#FFFFFF'}
                >
                  Annulla
                </button>
                <button
                  onClick={() => handleDeleteMedico(showDeleteConfirm)}
                  className="flex-1 px-4 py-2 rounded-lg font-medium"
                  style={{ backgroundColor: '#DC2626', color: '#FFFFFF' }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#B91C1C'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#DC2626'}
                >
                  Elimina
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Nuovo Medico */}
        {showNewMedico && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Nuovo Medico</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                    <input
                      type="text"
                      value={newMedico.nome}
                      onChange={(e) => setNewMedico({ ...newMedico, nome: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                      placeholder="Nome"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cognome *</label>
                    <input
                      type="text"
                      value={newMedico.cognome}
                      onChange={(e) => setNewMedico({ ...newMedico, cognome: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                      placeholder="Cognome"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specialità</label>
                  <select 
                    value={newMedico.specialita}
                    onChange={(e) => setNewMedico({ ...newMedico, specialita: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                  >
                    <option value="Medicina Estetica">Medicina Estetica</option>
                    <option value="Dermatologia">Dermatologia</option>
                    <option value="Chirurgia Plastica">Chirurgia Plastica</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Codice Fiscale *</label>
                    <input
                      type="text"
                      value={newMedico.codiceFiscale}
                      onChange={(e) => setNewMedico({ ...newMedico, codiceFiscale: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                      placeholder="RSSMRA80A01H501Z"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Partita IVA *</label>
                    <input
                      type="text"
                      value={newMedico.partitaIva}
                      onChange={(e) => setNewMedico({ ...newMedico, partitaIva: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                      placeholder="12345678901"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
                  <input
                    type="text"
                    value={newMedico.iban}
                    onChange={(e) => setNewMedico({ ...newMedico, iban: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                    placeholder="IT60X0542811101000000123456"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={newMedico.email}
                      onChange={(e) => setNewMedico({ ...newMedico, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                      placeholder="email@esempio.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                    <input
                      type="tel"
                      value={newMedico.telefono}
                      onChange={(e) => setNewMedico({ ...newMedico, telefono: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                      placeholder="+39 333 1234567"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
                  <input
                    type="text"
                    value={newMedico.indirizzo}
                    onChange={(e) => setNewMedico({ ...newMedico, indirizzo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                    placeholder="Via Roma 123, Città"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setShowNewMedico(false);
                    setNewMedico({
                      nome: '',
                      cognome: '',
                      specialita: 'Medicina Estetica',
                      email: '',
                      telefono: '',
                      codiceFiscale: '',
                      partitaIva: '',
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
                      },
                      costiProdotti: [],
                      eccezioni: []
                    });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  onClick={() => {
                    if (newMedico.nome && newMedico.cognome && newMedico.codiceFiscale && newMedico.partitaIva && newMedico.email) {
                      // Crea nuovo medico nello store
                      mediciStore.createMedico({
                        nome: newMedico.nome,
                        cognome: newMedico.cognome,
                        cf: newMedico.codiceFiscale,
                        piva: newMedico.partitaIva
                      }).then(async (createdMedico) => {
                        // Se ha regole personalizzate, aggiornale
                        if (newMedico.regolaBase.tipo !== 'percentuale' || newMedico.regolaBase.valore !== 50) {
                          await mediciStore.updateRegoleCompensi(createdMedico.id, {
                            tipo: newMedico.regolaBase.tipo as 'percentuale' | 'scaglioni' | 'quota_fissa' | 'fisso',
                            valore: newMedico.regolaBase.valore,
                            valoreX: newMedico.regolaBase.valoreX,
                            valoreY: newMedico.regolaBase.valoreY,
                            calcolaSu: newMedico.regolaBase.su as 'netto' | 'lordo',
                            detraiCosti: newMedico.regolaBase.detraiCosto
                          });
                        }
                        alert('Medico creato con successo');
                        // loadMedici verrà chiamato automaticamente dal subscribe
                      }).catch(error => {
                        console.error('Errore creazione medico:', error);
                        alert('Errore nella creazione del medico');
                      });
                      
                      setShowNewMedico(false);
                      setNewMedico({
                        nome: '',
                        cognome: '',
                        specialita: 'Medicina Estetica',
                        email: '',
                        telefono: '',
                        codiceFiscale: '',
                        partitaIva: '',
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
                        },
                        costiProdotti: [],
                        eccezioni: []
                      });
                    } else {
                      alert('Compila tutti i campi obbligatori (*)');
                    }
                  }}
                  className="flex-1 px-4 py-2 rounded-lg font-medium"
                  style={{ backgroundColor: '#03A6A6', color: '#FFFFFF' }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#028a8a'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#03A6A6'}
                >
                  Salva Medico
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Vista Dettaglio Medico
  return (
    <div className="space-y-6">
      {/* Header con breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedMedico(null)}
            className="text-gray-600 hover:text-gray-800 flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Torna alla lista
          </button>
          <span className="text-gray-400">/</span>
          <h2 className="text-2xl font-semibold text-gray-800">
            {selectedMedico.cognome} {selectedMedico.nome}
          </h2>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Indicatore ruolo */}
          <div className="bg-gray-100 px-3 py-1 rounded-lg">
            <span className="text-sm text-gray-600">Ruolo: <strong>{userRole}</strong></span>
          </div>
          
          {hasUnsavedChanges && (
            <span className="text-amber-600 text-sm font-medium bg-amber-50 px-3 py-1 rounded-lg flex items-center gap-2 animate-pulse">
              <AlertCircle className="w-4 h-4" />
              Modifiche non salvate
            </span>
          )}
          {(isAdmin || hasUnsavedChanges) && (
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                hasUnsavedChanges
                  ? ''
                  : 'cursor-not-allowed'
              }`}
              style={{ 
                backgroundColor: hasUnsavedChanges ? '#03A6A6' : '#E5E7EB',
                color: hasUnsavedChanges ? '#FFFFFF' : '#9CA3AF'
              }}
              onMouseEnter={(e) => hasUnsavedChanges && ((e.target as HTMLElement).style.backgroundColor = '#028a8a')}
              onMouseLeave={(e) => hasUnsavedChanges && ((e.target as HTMLElement).style.backgroundColor = '#03A6A6')}
            >
              💾 Salva Modifiche
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex">
            {['anagrafica', 'regole', 'eccezioni', ...(isAdmin ? ['simulatore'] : [])].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'text-[#03A6A6] border-b-2 border-[#03A6A6]'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab === 'regole' ? 'Regole Compenso' : tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Tab Anagrafica */}
          {activeTab === 'anagrafica' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Dati Generali</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                    <input
                      type="text"
                      value={selectedMedico.nome}
                      onChange={(e) => {
                        if (isAdmin) {
                          setSelectedMedico({ ...selectedMedico, nome: e.target.value });
                          setHasUnsavedChanges(true);
                        }
                      }}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent ${!isAdmin ? 'bg-gray-100' : ''}`}
                      readOnly={!isAdmin}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cognome</label>
                    <input
                      type="text"
                      value={selectedMedico.cognome}
                      onChange={(e) => {
                        if (isAdmin) {
                          setSelectedMedico({ ...selectedMedico, cognome: e.target.value });
                          setHasUnsavedChanges(true);
                        }
                      }}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent ${!isAdmin ? 'bg-gray-100' : ''}`}
                      readOnly={!isAdmin}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Specialità</label>
                    <select 
                      value={selectedMedico.specialita}
                      onChange={(e) => {
                        if (isAdmin) {
                          setSelectedMedico({ ...selectedMedico, specialita: e.target.value });
                          setHasUnsavedChanges(true);
                        }
                      }}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent ${!isAdmin ? 'bg-gray-100' : ''}`}
                      disabled={!isAdmin}
                    >
                      <option value="Medicina Estetica">Medicina Estetica</option>
                      <option value="Dermatologia">Dermatologia</option>
                      <option value="Chirurgia Plastica">Chirurgia Plastica</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stato</label>
                    <select 
                      value={selectedMedico.attivo ? 'attivo' : 'inattivo'}
                      onChange={(e) => {
                        if (isAdmin) {
                          setSelectedMedico({ ...selectedMedico, attivo: e.target.value === 'attivo' });
                          setHasUnsavedChanges(true);
                        }
                      }}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent ${!isAdmin ? 'bg-gray-100' : ''}`}
                      disabled={!isAdmin}
                    >
                      <option value="attivo">Attivo</option>
                      <option value="inattivo">Inattivo</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Dati di Fatturazione</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Codice Fiscale</label>
                    <input
                      type="text"
                      value={selectedMedico.codiceFiscale}
                      onChange={(e) => {
                        if (isAdmin) {
                          setSelectedMedico({ ...selectedMedico, codiceFiscale: e.target.value });
                          setHasUnsavedChanges(true);
                        }
                      }}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent ${!isAdmin ? 'bg-gray-100' : ''}`}
                      readOnly={!isAdmin}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Partita IVA</label>
                    <input
                      type="text"
                      value={selectedMedico.partitaIva}
                      onChange={(e) => {
                        if (isAdmin) {
                          setSelectedMedico({ ...selectedMedico, partitaIva: e.target.value });
                          setHasUnsavedChanges(true);
                        }
                      }}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent ${!isAdmin ? 'bg-gray-100' : ''}`}
                      readOnly={!isAdmin}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
                    <input
                      type="text"
                      value={selectedMedico.iban}
                      onChange={(e) => {
                        if (isAdmin) {
                          setSelectedMedico({ ...selectedMedico, iban: e.target.value });
                          setHasUnsavedChanges(true);
                        }
                      }}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent ${!isAdmin ? 'bg-gray-100' : ''}`}
                      placeholder="IT60X0542811101000000123456"
                      readOnly={!isAdmin}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={selectedMedico.email}
                      onChange={(e) => {
                        if (isAdmin) {
                          setSelectedMedico({ ...selectedMedico, email: e.target.value });
                          setHasUnsavedChanges(true);
                        }
                      }}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent ${!isAdmin ? 'bg-gray-100' : ''}`}
                      readOnly={!isAdmin}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                    <input
                      type="tel"
                      value={selectedMedico.telefono}
                      onChange={(e) => {
                        if (isAdmin) {
                          setSelectedMedico({ ...selectedMedico, telefono: e.target.value });
                          setHasUnsavedChanges(true);
                        }
                      }}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent ${!isAdmin ? 'bg-gray-100' : ''}`}
                      readOnly={!isAdmin}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
                    <input
                      type="text"
                      value={selectedMedico.indirizzo}
                      onChange={(e) => {
                        if (isAdmin) {
                          setSelectedMedico({ ...selectedMedico, indirizzo: e.target.value });
                          setHasUnsavedChanges(true);
                        }
                      }}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent ${!isAdmin ? 'bg-gray-100' : ''}`}
                      readOnly={!isAdmin}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Regole Compenso */}
          {activeTab === 'regole' && (
            <div className="space-y-6">
              {/* Avviso permessi limitati */}
              {!isAdmin && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800">
                    ⚠️ Modalità sola lettura. Solo i costi prodotti possono essere modificati.
                  </p>
                </div>
              )}
              
              {/* Regola Base */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Regola Base</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo di Regola</label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => {
                          if (isAdmin) {
                            setSelectedMedico({
                              ...selectedMedico,
                              regolaBase: { ...selectedMedico.regolaBase, tipo: 'percentuale' }
                            });
                            setHasUnsavedChanges(true);
                          }
                        }}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          selectedMedico.regolaBase.tipo === 'percentuale'
                            ? 'border-[#03A6A6] bg-[#03A6A6]/10'
                            : 'border-gray-300 hover:border-gray-400'
                        } ${!isAdmin ? 'cursor-not-allowed opacity-60' : ''}`}
                        disabled={!isAdmin}
                      >
                        <div className="font-medium">Percentuale</div>
                        <div className="text-sm text-gray-600">% su netto/lordo</div>
                      </button>
                      <button
                        onClick={() => {
                          if (isAdmin) {
                            setSelectedMedico({
                              ...selectedMedico,
                              regolaBase: { ...selectedMedico.regolaBase, tipo: 'scaglioni' }
                            });
                            setHasUnsavedChanges(true);
                          }
                        }}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          selectedMedico.regolaBase.tipo === 'scaglioni'
                            ? 'border-[#03A6A6] bg-[#03A6A6]/10'
                            : 'border-gray-300 hover:border-gray-400'
                        } ${!isAdmin ? 'cursor-not-allowed opacity-60' : ''}`}
                        disabled={!isAdmin}
                      >
                        <div className="font-medium">A Scaglioni</div>
                        <div className="text-sm text-gray-600">€X ogni €Y</div>
                      </button>
                      <button
                        onClick={() => {
                          if (isAdmin) {
                            setSelectedMedico({
                              ...selectedMedico,
                              regolaBase: { ...selectedMedico.regolaBase, tipo: 'fisso' }
                            });
                            setHasUnsavedChanges(true);
                          }
                        }}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          selectedMedico.regolaBase.tipo === 'fisso'
                            ? 'border-[#03A6A6] bg-[#03A6A6]/10'
                            : 'border-gray-300 hover:border-gray-400'
                        } ${!isAdmin ? 'cursor-not-allowed opacity-60' : ''}`}
                        disabled={!isAdmin}
                      >
                        <div className="font-medium">Quota Fissa</div>
                        <div className="text-sm text-gray-600">€X ogni Y prestazioni</div>
                      </button>
                    </div>
                  </div>

                  {/* Configurazione per tipo */}
                  {selectedMedico.regolaBase.tipo === 'percentuale' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Percentuale</label>
                        <input
                          type="number"
                          value={selectedMedico.regolaBase.valore === '' ? '' : selectedMedico.regolaBase.valore}
                          onChange={(e) => {
                            if (isAdmin) {
                              const value = e.target.value;
                              setSelectedMedico({
                                ...selectedMedico,
                                regolaBase: { 
                                  ...selectedMedico.regolaBase, 
                                  valore: Math.min(100, Math.max(0, parseInt(value) || 0))
                                }
                              });
                              setHasUnsavedChanges(true);
                            }
                          }}
                          onBlur={(e) => {
                            if (isAdmin && e.target.value === '') {
                              setSelectedMedico({
                                ...selectedMedico,
                                regolaBase: { ...selectedMedico.regolaBase, valore: 0 }
                              });
                            }
                          }}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent ${!isAdmin ? 'bg-gray-100' : ''}`}
                          min="0"
                          max="100"
                          readOnly={!isAdmin}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Calcola su</label>
                        <select
                          value={selectedMedico.regolaBase.su}
                          onChange={(e) => {
                            if (isAdmin) {
                              setSelectedMedico({
                                ...selectedMedico,
                                regolaBase: { ...selectedMedico.regolaBase, su: e.target.value }
                              });
                              setHasUnsavedChanges(true);
                            }
                          }}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent ${!isAdmin ? 'bg-gray-100' : ''}`}
                          disabled={!isAdmin}
                        >
                          <option value="netto">Importo Netto</option>
                          <option value="lordo">Importo Lordo</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {selectedMedico.regolaBase.tipo === 'scaglioni' && (
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Euro da dare (X) 
                          <span className="text-xs text-gray-500 font-normal ml-1">- compenso medico</span>
                        </label>
                        <input
                          type="number"
                          value={selectedMedico.regolaBase.valoreX === '' ? '' : selectedMedico.regolaBase.valoreX}
                          onChange={(e) => {
                            if (isAdmin) {
                              const value = e.target.value;
                              setSelectedMedico({
                                ...selectedMedico,
                                regolaBase: { 
                                  ...selectedMedico.regolaBase, 
                                  valoreX: Math.max(0, parseInt(value) || 0)
                                }
                              });
                              setHasUnsavedChanges(true);
                            }
                          }}
                          onBlur={(e) => {
                            if (isAdmin && e.target.value === '') {
                              setSelectedMedico({
                                ...selectedMedico,
                                regolaBase: { ...selectedMedico.regolaBase, valoreX: 0 }
                              });
                            }
                          }}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent ${!isAdmin ? 'bg-gray-100' : ''}`}
                          min="0"
                          readOnly={!isAdmin}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ogni euro (Y)
                          <span className="text-xs text-gray-500 font-normal ml-1">- di imponibile</span>
                        </label>
                        <input
                          type="number"
                          value={selectedMedico.regolaBase.valoreY === '' ? '' : selectedMedico.regolaBase.valoreY}
                          onChange={(e) => {
                            if (isAdmin) {
                              const value = e.target.value;
                              setSelectedMedico({
                                ...selectedMedico,
                                regolaBase: { 
                                  ...selectedMedico.regolaBase, 
                                  valoreY: Math.max(1, parseInt(value) || 1)
                                }
                              });
                              setHasUnsavedChanges(true);
                            }
                          }}
                          onBlur={(e) => {
                            if (isAdmin && (e.target.value === '' || e.target.value === '0')) {
                              setSelectedMedico({
                                ...selectedMedico,
                                regolaBase: { ...selectedMedico.regolaBase, valoreY: 1 }
                              });
                            }
                          }}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent ${!isAdmin ? 'bg-gray-100' : ''}`}
                          min="1"
                          readOnly={!isAdmin}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Calcola su</label>
                        <select
                          value={selectedMedico.regolaBase.su}
                          onChange={(e) => {
                            if (isAdmin) {
                              setSelectedMedico({
                                ...selectedMedico,
                                regolaBase: { ...selectedMedico.regolaBase, su: e.target.value }
                              });
                              setHasUnsavedChanges(true);
                            }
                          }}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent ${!isAdmin ? 'bg-gray-100' : ''}`}
                          disabled={!isAdmin}
                        >
                          <option value="netto">Importo Netto</option>
                          <option value="lordo">Importo Lordo</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {selectedMedico.regolaBase.tipo === 'scaglioni' && selectedMedico.regolaBase.valoreX >= selectedMedico.regolaBase.valoreY && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      ⚠️ Attenzione: X deve essere minore di Y (non puoi dare €{selectedMedico.regolaBase.valoreX} ogni €{selectedMedico.regolaBase.valoreY})
                    </div>
                  )}

                  {selectedMedico.regolaBase.tipo === 'fisso' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Euro fisso (X)</label>
                        <input
                          type="number"
                          value={selectedMedico.regolaBase.valoreX === '' ? '' : selectedMedico.regolaBase.valoreX}
                          onChange={(e) => {
                            if (isAdmin) {
                              const value = e.target.value;
                              setSelectedMedico({
                                ...selectedMedico,
                                regolaBase: { 
                                  ...selectedMedico.regolaBase, 
                                  valoreX: Math.max(0, parseInt(value) || 0)
                                }
                              });
                              setHasUnsavedChanges(true);
                            }
                          }}
                          onBlur={(e) => {
                            if (isAdmin && e.target.value === '') {
                              setSelectedMedico({
                                ...selectedMedico,
                                regolaBase: { ...selectedMedico.regolaBase, valoreX: 0 }
                              });
                            }
                          }}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent ${!isAdmin ? 'bg-gray-100' : ''}`}
                          min="0"
                          readOnly={!isAdmin}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ogni prestazioni (Y)</label>
                        <input
                          type="number"
                          value={selectedMedico.regolaBase.valoreY === '' ? '' : selectedMedico.regolaBase.valoreY}
                          onChange={(e) => {
                            if (isAdmin) {
                              const value = e.target.value;
                              setSelectedMedico({
                                ...selectedMedico,
                                regolaBase: { 
                                  ...selectedMedico.regolaBase, 
                                  valoreY: Math.max(1, parseInt(value) || 1)
                                }
                              });
                              setHasUnsavedChanges(true);
                            }
                          }}
                          onBlur={(e) => {
                            if (isAdmin && (e.target.value === '' || e.target.value === '0')) {
                              setSelectedMedico({
                                ...selectedMedico,
                                regolaBase: { ...selectedMedico.regolaBase, valoreY: 1 }
                              });
                            }
                          }}
                          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent ${!isAdmin ? 'bg-gray-100' : ''}`}
                          min="1"
                          readOnly={!isAdmin}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="detraiCosto"
                      checked={selectedMedico.regolaBase.detraiCosto}
                      onChange={(e) => {
                        if (isAdmin) {
                          setSelectedMedico({
                            ...selectedMedico,
                            regolaBase: { ...selectedMedico.regolaBase, detraiCosto: e.target.checked }
                          });
                          setHasUnsavedChanges(true);
                        }
                      }}
                      className={`rounded border-gray-300 text-[#03A6A6] focus:ring-[#03A6A6] ${!isAdmin ? 'cursor-not-allowed' : ''}`}
                      disabled={!isAdmin}
                    />
                    <label htmlFor="detraiCosto" className={`text-sm font-medium text-gray-700 ${!isAdmin ? 'opacity-60' : ''}`}>
                      Detrai costo prodotto dal compenso
                    </label>
                  </div>
                </div>
              </div>

              {/* Costo Prodotti */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Costo Prodotti</h3>
                    {!isAdmin && (
                      <span className="text-sm text-green-600">
                        ✓ Puoi modificare i costi prodotti
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportProdotti}
                      className="px-3 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2"
                      style={{ backgroundColor: '#10B981', color: '#FFFFFF' }}
                      onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#059669'}
                      onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#10B981'}
                      title="Esporta lista prodotti in Excel"
                    >
                      <Download className="w-4 h-4" />
                      <span style={{ color: '#FFFFFF' }}>Export Excel</span>
                    </button>
                    <button
                      onClick={() => setShowImportProdotti(true)}
                      className="px-3 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2"
                      style={{ backgroundColor: '#6192A9', color: '#FFFFFF' }}
                      onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#5581a0'}
                      onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#6192A9'}
                      title="Importa lista prodotti da Excel"
                    >
                      <Upload className="w-4 h-4" />
                      <span style={{ color: '#FFFFFF' }}>Import Excel</span>
                    </button>
                    <button
                      onClick={() => setShowAddProdotto(true)}
                      className="px-4 py-2 rounded-lg text-sm font-medium shadow-md flex items-center gap-2"
                      style={{ backgroundColor: '#03A6A6', color: '#FFFFFF' }}
                      onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#028a8a'}
                      onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#03A6A6'}
                    >
                      <span className="text-lg" style={{ color: '#FFFFFF' }}>➕</span>
                      <span style={{ color: '#FFFFFF' }}>Aggiungi Prodotto</span>
                    </button>
                  </div>
                </div>
                
                {selectedMedico.costiProdotti && selectedMedico.costiProdotti.length > 0 ? (
                  <div className="space-y-2">
                    {(selectedMedico.costiProdotti || []).map((prodotto) => (
                      <div
                        key={prodotto.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <span className="text-gray-800 font-medium">{prodotto.nome}</span>
                          <span className="text-xs text-gray-500">per {prodotto.unitaMisura}</span>
                          {prodotto.costo === 0 && (
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                              Non detratto
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {editingProdotto === prodotto.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-700">€</span>
                              <input
                                type="number"
                                defaultValue={prodotto.costo}
                                onBlur={(e) => handleUpdateProdotto(prodotto.id, (e.target as HTMLInputElement).value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateProdotto(prodotto.id, (e.target as HTMLInputElement).value);
                                  }
                                }}
                                className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                                min="0"
                                step="0.01"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <>
                              <span className="font-medium text-gray-700">€ {prodotto.costo}</span>
                              <button
                                onClick={() => setEditingProdotto(prodotto.id)}
                                className="text-[#03A6A6] hover:text-[#028a8a] p-1"
                              >
                                ✏️
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleRemoveProdotto(prodotto.id)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            Rimuovi
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Nessun prodotto configurato
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-xs text-gray-500 italic">
                    💡 Usa Import Excel per aggiungere/aggiornare rapidamente molti prodotti o copiare configurazioni tra medici
                  </p>
                  {selectedMedico.costiProdotti && selectedMedico.costiProdotti.length > 0 && (
                    <span className="text-xs text-gray-600 font-medium">
                      {(selectedMedico.costiProdotti || []).length} prodotti configurati
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab Eccezioni */}
          {activeTab === 'eccezioni' && (
            <div className="space-y-6">
              {/* Box informativo gerarchia */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <span className="text-lg">ℹ️</span>
                  Ordine di priorità delle regole
                </h4>
                <ol className="text-sm text-blue-800 space-y-1 ml-6 list-decimal">
                  <li><strong>Eccezione con prodotto specifico</strong> (es. "Botox + Allergan")</li>
                  <li><strong>Eccezione solo trattamento</strong> (es. "Botox - tutti i prodotti")</li>
                  <li><strong>Regola base</strong> (si applica a tutto il resto)</li>
                </ol>
                <p className="text-xs text-blue-700 mt-2 italic">
                  La regola più specifica ha sempre la precedenza
                </p>
              </div>

              {/* Analisi coerenza */}
              {(() => {
                const warnings = validateCoherence(
                  selectedMedico?.regolaBase || {}, 
                  selectedMedico?.eccezioni || [],
                  selectedMedico?.costiProdotti || []
                );
                const identiche = warnings.filter(w => w.tipo === 'identica').length;
                const generose = warnings.filter(w => w.tipo === 'generosa').length;
                const prodottiMancanti = warnings.filter(w => w.tipo === 'prodotto-mancante').length;
                
                if (warnings.length > 0) {
                  return (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h4 className="font-medium text-amber-900 mb-2">Analisi Coerenza Regole</h4>
                      <div className="space-y-1 text-sm">
                        {identiche > 0 && (
                          <div className="text-amber-700">
                            ⚠️ {identiche} eccezione{identiche > 1 ? 'i' : ''} identica{identiche > 1 ? 'e' : ''} alla regola base
                          </div>
                        )}
                        {generose > 0 && (
                          <div className="text-blue-700">
                            ℹ️ {generose} eccezione{generose > 1 ? 'i' : ''} più generosa{generose > 1 ? 'e' : ''} della regola base
                          </div>
                        )}
                        {prodottiMancanti > 0 && (
                          <div className="text-red-700">
                            ❌ {prodottiMancanti} eccezione{prodottiMancanti > 1 ? 'i' : ''} con prodotto non configurato e detrazione attiva
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-sm text-green-700 flex items-center gap-2">
                      <span>✓</span>
                      <span>Nessun problema di coerenza rilevato</span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Eccezioni alle Regole</h3>
                {isAdmin && (
                  <button
                    onClick={() => setShowAddEccezione(true)}
                    className="px-4 py-2 rounded-lg text-sm font-medium shadow-md flex items-center gap-2"
                    style={{ backgroundColor: '#03A6A6', color: '#FFFFFF' }}
                    onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#028a8a'}
                    onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#03A6A6'}
                  >
                    <span className="text-lg" style={{ color: '#FFFFFF' }}>➕</span>
                    <span style={{ color: '#FFFFFF' }}>Aggiungi Eccezione</span>
                  </button>
                )}
              </div>

              {(selectedMedico?.eccezioni || []).length > 0 ? (
                <div className="space-y-4">
                  {(selectedMedico?.eccezioni || []).map((eccezione) => {
                    // Trova avvisi per questa eccezione
                    const warnings = validateCoherence(
                      selectedMedico?.regolaBase || {},
                      selectedMedico?.eccezioni || [],
                      selectedMedico?.costiProdotti || []
                    ).filter((w: any) => w.eccezione?.id === eccezione.id);
                    
                    return (
                      <div key={eccezione.id}>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                          {editingEccezione === eccezione.id ? (
                        <>
                          {/* Form di modifica eccezione */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Trattamento</label>
                              <select
                                value={eccezione.trattamento}
                                onChange={(e) => handleUpdateEccezione(eccezione.id, { 
                                  trattamento: e.target.value,
                                  prodotto: '' // Reset prodotto quando cambia trattamento
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                              >
                                <option value="">Seleziona trattamento...</option>
                                {trattamentiDisponibili.map(tratt => (
                                  <option key={tratt.nome} value={tratt.nome}>{tratt.nome}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Prodotto (opzionale)</label>
                              <select
                                value={eccezione.prodotto || ''}
                                onChange={(e) => handleUpdateEccezione(eccezione.id, { prodotto: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                                disabled={!eccezione.trattamento}
                              >
                                <option value="">Tutti i prodotti</option>
                                {eccezione.trattamento && 
                                  trattamentiDisponibili
                                    .find(t => t.nome === eccezione.trattamento)
                                    ? prodottiDisponibili.map((prod: any) => {
                                      const isConfigurato = (selectedMedico?.costiProdotti || []).some(cp => cp.nome === prod);
                                      return (
                                        <option key={prod} value={prod}>
                                          {prod} {!isConfigurato && '⚠️ Non configurato'}
                                        </option>
                                      );
                                    })
                                  : null}
                              </select>
                              {/* Avviso inline se prodotto non configurato */}
                              {eccezione.prodotto && eccezione.regola.detraiCosto && 
                               !(selectedMedico.costiProdotti || []).some(cp => cp.nome === eccezione.prodotto) && (
                                <p className="text-xs text-red-600 mt-1">
                                  ⚠️ Prodotto non configurato - disattiva detrazione o configura il prodotto
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Rule builder per eccezione */}
                          <div className="border-t pt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo di Regola</label>
                            <div className="grid grid-cols-3 gap-3 mb-4">
                              <button
                                onClick={() => handleUpdateEccezione(eccezione.id, {
                                  regola: { ...eccezione.regola, tipo: 'percentuale' }
                                })}
                                className={`p-2 rounded-lg border-2 transition-all text-sm ${
                                  eccezione.regola.tipo === 'percentuale'
                                    ? 'border-[#03A6A6] bg-[#03A6A6]/10'
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                              >
                                Percentuale
                              </button>
                              <button
                                onClick={() => handleUpdateEccezione(eccezione.id, {
                                  regola: { ...eccezione.regola, tipo: 'scaglioni' }
                                })}
                                className={`p-2 rounded-lg border-2 transition-all text-sm ${
                                  eccezione.regola.tipo === 'scaglioni'
                                    ? 'border-[#03A6A6] bg-[#03A6A6]/10'
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                              >
                                A Scaglioni
                              </button>
                              <button
                                onClick={() => handleUpdateEccezione(eccezione.id, {
                                  regola: { ...eccezione.regola, tipo: 'fisso' }
                                })}
                                className={`p-2 rounded-lg border-2 transition-all text-sm ${
                                  eccezione.regola.tipo === 'fisso'
                                    ? 'border-[#03A6A6] bg-[#03A6A6]/10'
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                              >
                                Quota Fissa
                              </button>
                            </div>

                            {/* Configurazione specifica per tipo */}
                            {eccezione.regola.tipo === 'percentuale' && (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Percentuale</label>
                                  <input
                                    type="number"
                                    value={eccezione.regola.valore === '' ? '' : eccezione.regola.valore || 0}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      handleUpdateEccezione(eccezione.id, {
                                        regola: { 
                                          ...eccezione.regola, 
                                          valore: Math.min(100, Math.max(0, parseInt(value) || 0))
                                        }
                                      });
                                    }}
                                    onBlur={(e) => {
                                      if (e.target.value === '') {
                                        handleUpdateEccezione(eccezione.id, {
                                          regola: { ...eccezione.regola, valore: 0 }
                                        });
                                      }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                                    min="0"
                                    max="100"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Calcola su</label>
                                  <select
                                    value={eccezione.regola.su}
                                    onChange={(e) => handleUpdateEccezione(eccezione.id, {
                                      regola: { ...eccezione.regola, su: e.target.value }
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                                  >
                                    <option value="netto">Importo Netto</option>
                                    <option value="lordo">Importo Lordo</option>
                                  </select>
                                </div>
                              </div>
                            )}

                            {eccezione.regola.tipo === 'scaglioni' && (
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Euro da dare (X)</label>
                                  <input
                                    type="number"
                                    value={eccezione.regola.valoreX === '' ? '' : eccezione.regola.valoreX || 0}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      handleUpdateEccezione(eccezione.id, {
                                        regola: { 
                                          ...eccezione.regola, 
                                          valoreX: Math.max(0, parseInt(value) || 0)
                                        }
                                      });
                                    }}
                                    onBlur={(e) => {
                                      if (e.target.value === '') {
                                        handleUpdateEccezione(eccezione.id, {
                                          regola: { ...eccezione.regola, valoreX: 0 }
                                        });
                                      }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                                    min="0"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Ogni euro (Y)</label>
                                  <input
                                    type="number"
                                    value={eccezione.regola.valoreY === '' ? '' : eccezione.regola.valoreY || 0}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      handleUpdateEccezione(eccezione.id, {
                                        regola: { 
                                          ...eccezione.regola, 
                                          valoreY: Math.max(1, parseInt(value) || 1)
                                        }
                                      });
                                    }}
                                    onBlur={(e) => {
                                      if (e.target.value === '' || e.target.value === '0') {
                                        handleUpdateEccezione(eccezione.id, {
                                          regola: { ...eccezione.regola, valoreY: 1 }
                                        });
                                      }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                                    min="1"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Calcola su</label>
                                  <select
                                    value={eccezione.regola.su}
                                    onChange={(e) => handleUpdateEccezione(eccezione.id, {
                                      regola: { ...eccezione.regola, su: e.target.value }
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                                  >
                                    <option value="netto">Importo Netto</option>
                                    <option value="lordo">Importo Lordo</option>
                                  </select>
                                </div>
                              </div>
                            )}

                            {eccezione.regola.tipo === 'scaglioni' && eccezione.regola.valoreX >= eccezione.regola.valoreY && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                                ⚠️ X deve essere minore di Y
                              </div>
                            )}

                            {eccezione.regola.tipo === 'fisso' && (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Euro fisso (X)</label>
                                  <input
                                    type="number"
                                    value={eccezione.regola.valoreX === '' ? '' : eccezione.regola.valoreX || 0}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      handleUpdateEccezione(eccezione.id, {
                                        regola: { 
                                          ...eccezione.regola, 
                                          valoreX: Math.max(0, parseInt(value) || 0)
                                        }
                                      });
                                    }}
                                    onBlur={(e) => {
                                      if (e.target.value === '') {
                                        handleUpdateEccezione(eccezione.id, {
                                          regola: { ...eccezione.regola, valoreX: 0 }
                                        });
                                      }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                                    min="0"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Ogni prestazioni (Y)</label>
                                  <input
                                    type="number"
                                    value={eccezione.regola.valoreY === '' ? '' : eccezione.regola.valoreY || 0}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      handleUpdateEccezione(eccezione.id, {
                                        regola: { 
                                          ...eccezione.regola, 
                                          valoreY: Math.max(1, parseInt(value) || 1)
                                        }
                                      });
                                    }}
                                    onBlur={(e) => {
                                      if (e.target.value === '' || e.target.value === '0') {
                                        handleUpdateEccezione(eccezione.id, {
                                          regola: { ...eccezione.regola, valoreY: 1 }
                                        });
                                      }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                                    min="1"
                                  />
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-2 mt-4">
                              <input
                                type="checkbox"
                                id={`eccezione-detraiCosto-${eccezione.id}`}
                                checked={eccezione.regola.detraiCosto}
                                onChange={(e) => handleUpdateEccezione(eccezione.id, {
                                  regola: { ...eccezione.regola, detraiCosto: e.target.checked }
                                })}
                                className="rounded border-gray-300 text-[#03A6A6] focus:ring-[#03A6A6]"
                              />
                              <label htmlFor={`eccezione-detraiCosto-${eccezione.id}`} className="text-sm font-medium text-gray-700">
                                Detrai costo prodotto dal compenso
                              </label>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              onClick={() => {
                                // Validazione prima di confermare
                                if (eccezione.regola.tipo === 'scaglioni' && 
                                    eccezione.regola.valoreX >= eccezione.regola.valoreY) {
                                  alert('Nella regola a scaglioni, X deve essere minore di Y (non puoi dare più di quanto incassi)');
                                  return;
                                }
                                
                                // Validazione prodotto non configurato con detrazione costo
                                if (eccezione.prodotto && eccezione.regola.detraiCosto) {
                                  const prodottoConfigurato = (selectedMedico.costiProdotti || []).some(
                                    cp => cp.nome === eccezione.prodotto
                                  );
                                  if (!prodottoConfigurato) {
                                    alert(`Il prodotto "${eccezione.prodotto}" non è configurato nella lista costi. Configura prima il prodotto o disattiva la detrazione costi.`);
                                    return;
                                  }
                                }
                                
                                setEditingEccezione(null);
                              }}
                              className="px-3 py-1 rounded text-sm"
                              style={{ backgroundColor: '#10B981', color: '#FFFFFF' }}
                              onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#059669'}
                              onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#10B981'}
                            >
                              Conferma
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Vista eccezione */}
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium text-gray-800">
                                {eccezione.trattamento || 'Trattamento non specificato'}
                              </span>
                              {eccezione.prodotto && (
                                <span className="ml-2 text-sm text-gray-600">
                                  - {eccezione.prodotto}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {isAdmin && (
                                <>
                                  <button
                                    onClick={() => setEditingEccezione(eccezione.id)}
                                    className="text-[#03A6A6] hover:text-[#028a8a] text-sm font-medium"
                                  >
                                    ✏️ Modifica
                                  </button>
                                  <button
                                    onClick={() => handleRemoveEccezione(eccezione.id)}
                                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                                  >
                                    🗑️ Rimuovi
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-[#03A6A6] font-medium">
                            Regola: {getRegolaDescription(eccezione.regola)}
                            {!eccezione.regola.detraiCosto && ' (senza detrazione prodotti)'}
                          </div>
                        </>
                      )}
                    </div>
                    
                    {/* Avvisi inline per questa eccezione */}
                    {warnings.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {warnings.map((warning, idx) => (
                          <div 
                            key={idx} 
                            className={`p-2 rounded text-sm flex items-start gap-2 ${
                              warning.tipo === 'identica' ? 'bg-amber-50 border border-amber-200' :
                              warning.tipo === 'generosa' ? 'bg-blue-50 border border-blue-200' :
                              'bg-red-50 border border-red-200'
                            }`}
                          >
                            <span>
                              {warning.tipo === 'identica' ? '⚠️' :
                               warning.tipo === 'generosa' ? 'ℹ️' : '❌'}
                            </span>
                            <span className={
                              warning.tipo === 'identica' ? 'text-amber-700' :
                              warning.tipo === 'generosa' ? 'text-blue-700' :
                              'text-red-700'
                            }>
                              {warning.messaggio}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Nessuna eccezione configurata
                </div>
              )}
            </div>
          )}

          {/* Tab Simulatore (solo per admin) */}
          {activeTab === 'simulatore' && isAdmin && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Simulatore Compensi</h3>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  ℹ️ Usa questo simulatore per testare le regole configurate e vedere come viene calcolato il compenso per diverse prestazioni.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trattamento</label>
                    <select
                      value={simulazione.trattamento}
                      onChange={(e) => {
                        setSimulazione({ 
                          ...simulazione, 
                          trattamento: e.target.value,
                          prodotto: '' // Reset prodotto quando cambia trattamento
                        });
                        setRisultatoSimulazione(null);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                    >
                      <option value="">Seleziona trattamento...</option>
                      {trattamentiDisponibili.map(tratt => (
                        <option key={tratt.codice} value={tratt.codice}>{tratt.nome}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prodotto (opzionale)</label>
                    <select
                      value={simulazione.prodotto}
                      onChange={(e) => {
                        setSimulazione({ ...simulazione, prodotto: e.target.value });
                        setRisultatoSimulazione(null);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                      disabled={!simulazione.trattamento}
                    >
                      <option value="">Nessun prodotto specifico</option>
                      {simulazione.trattamento && 
                        trattamentiDisponibili
                          .find(t => t.codice === simulazione.trattamento)
                          ? prodottiDisponibili.map((prod: any) => {
                            const costoConfig = (selectedMedico?.costiProdotti || []).find(cp => cp.nome === prod.nome);
                            return (
                              <option key={prod.nome} value={prod.nome}>
                                {prod.nome} {costoConfig ? `(€${costoConfig.costo}/${costoConfig.unitaMisura})` : '(non configurato)'}
                              </option>
                            );
                          })
                        : null
                      }
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Importo Fattura (€)</label>
                    <input
                      type="number"
                      value={simulazione.importoFattura}
                      onChange={(e) => {
                        setSimulazione({ ...simulazione, importoFattura: e.target.value });
                        setRisultatoSimulazione(null);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">IVA</label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={simulazione.ivaInclusa}
                            onChange={() => {
                              setSimulazione({ ...simulazione, ivaInclusa: true });
                              setRisultatoSimulazione(null);
                            }}
                            className="mr-2 text-[#03A6A6] focus:ring-[#03A6A6]"
                          />
                          <span className="text-sm">IVA inclusa</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            checked={!simulazione.ivaInclusa}
                            onChange={() => {
                              setSimulazione({ ...simulazione, ivaInclusa: false });
                              setRisultatoSimulazione(null);
                            }}
                            className="mr-2 text-[#03A6A6] focus:ring-[#03A6A6]"
                          />
                          <span className="text-sm">IVA esclusa</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={calcolaCompenso}
                    className="w-full px-4 py-2 rounded-lg font-medium"
                    style={{ backgroundColor: '#03A6A6', color: '#FFFFFF' }}
                    onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#028a8a'}
                    onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#03A6A6'}
                  >
                    Calcola Compenso
                  </button>
                </div>
              </div>

              {/* Risultato simulazione */}
              {risultatoSimulazione && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
                  <h4 className="font-semibold text-gray-800 text-lg">Risultato Simulazione</h4>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-gray-600">Importo lordo (con IVA):</span>
                        <p className="text-lg font-medium">€ {risultatoSimulazione.importoLordo.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Importo netto (senza IVA):</span>
                        <p className="text-lg font-medium">€ {risultatoSimulazione.importoNetto.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Regola applicata:</span>
                        <p className="text-sm font-medium text-[#03A6A6]">{risultatoSimulazione.tipoRegola}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-gray-600">Calcolo compenso:</span>
                        <p className="text-sm">{risultatoSimulazione.descrizioneCalcolo}</p>
                        <p className="text-lg font-medium">€ {risultatoSimulazione.compensoBase.toFixed(2)}</p>
                      </div>
                      {risultatoSimulazione.costoProdotto > 0 && (
                        <div>
                          <span className="text-sm text-gray-600">Costo prodotto detratto:</span>
                          <p className="text-lg font-medium text-red-600">- € {risultatoSimulazione.costoProdotto.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="border-t pt-4 mt-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-[#03A6A6]/10 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Compenso Medico</p>
                        <p className="text-2xl font-bold text-[#03A6A6]">
                          € {risultatoSimulazione.compensoFinale.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Margine Clinica</p>
                        <p className="text-2xl font-bold text-blue-600">
                          € {risultatoSimulazione.margineClinica.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">% Margine</p>
                        <p className="text-2xl font-bold text-green-600">
                          {risultatoSimulazione.percentualeMargine.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Dettagli regola applicata */}
                  <div className="bg-gray-50 rounded-lg p-4 text-sm">
                    <p className="font-medium text-gray-700 mb-2">Dettagli regola applicata:</p>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Tipo: {risultatoSimulazione.regolaApplicata.tipo}</li>
                      <li>• Calcolo su: {risultatoSimulazione.regolaApplicata.su === 'netto' ? 'Importo netto' : 'Importo lordo'}</li>
                      <li>• Detrazione costo prodotto: {risultatoSimulazione.regolaApplicata.detraiCosto ? 'Sì' : 'No'}</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Aggiungi Prodotto */}
      {showAddProdotto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Aggiungi Costo Prodotto</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prodotto</label>
                <select
                  id="nuovo-prodotto-nome"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                  onChange={(e) => {
                    const prodotto = prodottiDisponibili.find(p => p.nome === e.target.value);
                    if (prodotto) {
                      const costoInput = document.getElementById('nuovo-prodotto-costo') as HTMLInputElement;
                      const checkboxInput = document.getElementById('usa-prezzo-default') as HTMLInputElement;
                      if (costoInput) costoInput.value = String(prodotto.prezzoDefault);
                      if (checkboxInput) checkboxInput.checked = true;
                    }
                  }}
                >
                  <option value="">Seleziona prodotto...</option>
                  {prodottiDisponibili
                    .filter(prod => !(selectedMedico.costiProdotti || []).some(cp => cp.nome === prod.nome))
                    .map(prod => {
                      // Verifica se questo prodotto è richiesto da eccezioni con detrazione
                      const richiestoPerEccezioni = (selectedMedico.eccezioni || []).some(
                        ecc => ecc.prodotto === prod.nome && ecc.regola.detraiCosto
                      );
                      
                      return (
                        <option key={prod.nome} value={prod.nome}>
                          {prod.nome} (€{prod.prezzoDefault}/{prod.unitaMisura})
                          {richiestoPerEccezioni && ' ⚠️ Richiesto per eccezioni'}
                        </option>
                      );
                    })}
                </select>
              </div>
              
              {/* Messaggio se tutti i prodotti sono già stati aggiunti */}
              {prodottiDisponibili.every(prod => 
                (selectedMedico.costiProdotti || []).some(cp => cp.nome === prod.nome)
              ) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                  <p className="text-amber-800">
                    ⚠️ Tutti i prodotti disponibili sono già stati configurati per questo medico
                  </p>
                </div>
              )}
              
              {/* Avviso prodotti mancanti per eccezioni */}
              {(() => {
                const prodottiMancanti = (selectedMedico.eccezioni || [])
                  .filter(ecc => ecc.prodotto && ecc.regola.detraiCosto)
                  .map(ecc => ecc.prodotto)
                  .filter(prod => !(selectedMedico.costiProdotti || []).some(cp => cp.nome === prod))
                  .filter((value, index, self) => self.indexOf(value) === index); // rimuovi duplicati
                
                if (prodottiMancanti.length > 0) {
                  return (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                      <p className="text-red-800 font-medium mb-1">
                        ❌ Prodotti richiesti da eccezioni con detrazione:
                      </p>
                      <ul className="ml-4 list-disc text-red-700">
                        {prodottiMancanti.map(prod => (
                          <li key={prod}>{prod}</li>
                        ))}
                      </ul>
                    </div>
                  );
                }
                return null;
              })()}
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="usa-prezzo-default"
                  defaultChecked
                  onChange={(e) => {
                    const select = document.getElementById('nuovo-prodotto-nome') as HTMLSelectElement;
                    const prodotto = prodottiDisponibili.find(p => p.nome === select?.value);
                    const costoInput = document.getElementById('nuovo-prodotto-costo') as HTMLInputElement;
                    if (e.target.checked && prodotto && costoInput) {
                      costoInput.value = prodotto.prezzoDefault.toString();
                      costoInput.disabled = true;
                    } else if (costoInput) {
                      costoInput.disabled = false;
                    }
                  }}
                  className="rounded border-gray-300 text-[#03A6A6] focus:ring-[#03A6A6]"
                />
                <label htmlFor="usa-prezzo-default" className="text-sm font-medium text-gray-700">
                  Usa prezzo di listino
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Costo (€){(() => {
                    const nomeInput = document.getElementById('nuovo-prodotto-nome') as HTMLInputElement;
                    const selectedProd = prodottiDisponibili.find((p: any) => p.nome === nomeInput?.value);
                    return selectedProd ? ` per ${selectedProd.unitaMisura}` : '';
                  })()}
                </label>
                <input
                  type="number"
                  id="nuovo-prodotto-costo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  disabled
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                <p className="text-amber-800">
                  ℹ️ Se il costo è 0, il prodotto verrà automaticamente marcato come "Non detratto"
                </p>
                <p className="text-amber-800 text-xs mt-1">
                  L'unità di misura verrà assegnata automaticamente dal sistema
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowAddProdotto(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  const nomeInput = document.getElementById('nuovo-prodotto-nome') as HTMLInputElement;
                  const costoInput = document.getElementById('nuovo-prodotto-costo') as HTMLInputElement;
                  const nome = nomeInput?.value || '';
                  const costo = costoInput?.value || '0';
                  
                  if (nome) {
                    // Verifica duplicato prima di aggiungere
                    if ((selectedMedico.costiProdotti || []).some(cp => cp.nome === nome)) {
                      alert(`Il prodotto "${nome}" è già stato configurato per questo medico`);
                      return;
                    }
                    
                    const costoNum = Math.max(0, parseFloat(costo) || 0); // Previene valori negativi
                    handleAddProdotto({
                      nome: nome,
                      costo: costoNum,
                      nonDetrarre: costoNum === 0
                    });
                    setShowAddProdotto(false);
                  } else {
                    alert('Seleziona un prodotto dalla lista');
                  }
                }}
                className="flex-1 px-4 py-2 rounded-lg font-medium"
                style={{ backgroundColor: '#03A6A6', color: '#FFFFFF' }}
                onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#028a8a'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#03A6A6'}
              >
                Aggiungi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aggiungi Eccezione */}
      {showAddEccezione && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Nuova Eccezione</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trattamento *</label>
                  <select
                    value={newEccezione.trattamento}
                    onChange={(e) => {
                      setNewEccezione({ 
                        ...newEccezione, 
                        trattamento: e.target.value,
                        prodotto: '' // Reset prodotto quando cambia trattamento
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                  >
                    <option value="">Seleziona trattamento...</option>
                    {trattamentiDisponibili.map(tratt => (
                      <option key={tratt.nome} value={tratt.nome}>{tratt.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prodotto (opzionale)</label>
                  <select
                    value={newEccezione.prodotto}
                    onChange={(e) => setNewEccezione({ ...newEccezione, prodotto: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                    disabled={!newEccezione.trattamento}
                  >
                    <option value="">Tutti i prodotti</option>
                    {newEccezione.trattamento && 
                      trattamentiDisponibili
                        .find(t => t.nome === newEccezione.trattamento)
                        ? prodottiDisponibili.map((prod: any) => {
                          const isConfigurato = (selectedMedico?.costiProdotti || []).some(cp => cp.nome === prod);
                          return (
                            <option key={prod} value={prod}>
                              {prod} {!isConfigurato && '⚠️ Non configurato'}
                            </option>
                          );
                        })
                      : null
                    }
                  </select>
                </div>
              </div>

              {/* Avviso se combinazione già esistente */}
              {newEccezione.trattamento && 
               (selectedMedico.eccezioni || []).some(e => 
                 e.trattamento === newEccezione.trattamento && 
                 e.prodotto === newEccezione.prodotto
               ) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                  <p className="text-red-800">
                    ⚠️ Questa combinazione di trattamento e prodotto è già presente nelle eccezioni
                  </p>
                </div>
              )}
              
              {/* Avviso prodotto non configurato */}
              {newEccezione.prodotto && newEccezione.regola.detraiCosto && 
               !(selectedMedico.costiProdotti || []).some(cp => cp.nome === newEccezione.prodotto) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                  <p className="text-red-800">
                    ❌ Il prodotto "{newEccezione.prodotto}" non è configurato nella lista costi.
                  </p>
                  <p className="text-red-700 text-xs mt-1">
                    Devi prima configurarlo nel tab "Regole Compenso" oppure disattivare la detrazione costi.
                  </p>
                </div>
              )}

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo di Regola</label>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <button
                    onClick={() => setNewEccezione({
                      ...newEccezione,
                      regola: { ...newEccezione.regola, tipo: 'percentuale' }
                    })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      newEccezione.regola.tipo === 'percentuale'
                        ? 'border-[#03A6A6] bg-[#03A6A6]/10'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium">Percentuale</div>
                    <div className="text-sm text-gray-600">% su netto/lordo</div>
                  </button>
                  <button
                    onClick={() => setNewEccezione({
                      ...newEccezione,
                      regola: { ...newEccezione.regola, tipo: 'scaglioni' }
                    })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      newEccezione.regola.tipo === 'scaglioni'
                        ? 'border-[#03A6A6] bg-[#03A6A6]/10'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium">A Scaglioni</div>
                    <div className="text-sm text-gray-600">€X ogni €Y</div>
                  </button>
                  <button
                    onClick={() => setNewEccezione({
                      ...newEccezione,
                      regola: { ...newEccezione.regola, tipo: 'fisso' }
                    })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      newEccezione.regola.tipo === 'fisso'
                        ? 'border-[#03A6A6] bg-[#03A6A6]/10'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium">Quota Fissa</div>
                    <div className="text-sm text-gray-600">€X ogni Y prestazioni</div>
                  </button>
                </div>

                {/* Configurazione per tipo */}
                {newEccezione.regola.tipo === 'percentuale' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Percentuale</label>
                      <input
                        type="number"
                        value={newEccezione.regola.valore || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setNewEccezione({
                            ...newEccezione,
                            regola: { 
                              ...newEccezione.regola, 
                              valore: Math.min(100, Math.max(0, parseInt(value) || 0))
                            }
                          });
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '') {
                            setNewEccezione({
                              ...newEccezione,
                              regola: { ...newEccezione.regola, valore: 50 }
                            });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                        min="0"
                        max="100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Calcola su</label>
                      <select
                        value={newEccezione.regola.su}
                        onChange={(e) => setNewEccezione({
                          ...newEccezione,
                          regola: { ...newEccezione.regola, su: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                      >
                        <option value="netto">Importo Netto</option>
                        <option value="lordo">Importo Lordo</option>
                      </select>
                    </div>
                  </div>
                )}

                {newEccezione.regola.tipo === 'scaglioni' && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Euro da dare (X)</label>
                      <input
                        type="number"
                        value={newEccezione.regola.valoreX || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setNewEccezione({
                            ...newEccezione,
                            regola: { 
                              ...newEccezione.regola, 
                              valoreX: Math.max(0, parseInt(value) || 0)
                            }
                          });
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '') {
                            setNewEccezione({
                              ...newEccezione,
                              regola: { ...newEccezione.regola, valoreX: 50 }
                            });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ogni euro (Y)</label>
                      <input
                        type="number"
                        value={newEccezione.regola.valoreY || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setNewEccezione({
                            ...newEccezione,
                            regola: { 
                              ...newEccezione.regola, 
                              valoreY: Math.max(1, parseInt(value) || 1)
                            }
                          });
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '' || e.target.value === '0') {
                            setNewEccezione({
                              ...newEccezione,
                              regola: { ...newEccezione.regola, valoreY: 200 }
                            });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Calcola su</label>
                      <select
                        value={newEccezione.regola.su}
                        onChange={(e) => setNewEccezione({
                          ...newEccezione,
                          regola: { ...newEccezione.regola, su: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                      >
                        <option value="netto">Importo Netto</option>
                        <option value="lordo">Importo Lordo</option>
                      </select>
                    </div>
                  </div>
                )}

                {newEccezione.regola.tipo === 'scaglioni' && newEccezione.regola.valoreX >= newEccezione.regola.valoreY && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    ⚠️ X deve essere minore di Y
                  </div>
                )}

                {newEccezione.regola.tipo === 'fisso' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Euro fisso (X)</label>
                      <input
                        type="number"
                        value={newEccezione.regola.valoreX || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setNewEccezione({
                            ...newEccezione,
                            regola: { 
                              ...newEccezione.regola, 
                              valoreX: Math.max(0, parseInt(value) || 0)
                            }
                          });
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '') {
                            setNewEccezione({
                              ...newEccezione,
                              regola: { ...newEccezione.regola, valoreX: 50 }
                            });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ogni prestazioni (Y)</label>
                      <input
                        type="number"
                        value={newEccezione.regola.valoreY || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setNewEccezione({
                            ...newEccezione,
                            regola: { 
                              ...newEccezione.regola, 
                              valoreY: Math.max(1, parseInt(value) || 1)
                            }
                          });
                        }}
                        onBlur={(e) => {
                          if (e.target.value === '' || e.target.value === '0') {
                            setNewEccezione({
                              ...newEccezione,
                              regola: { ...newEccezione.regola, valoreY: 1 }
                            });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                        min="1"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-4">
                  <input
                    type="checkbox"
                    id="nuova-eccezione-detraiCosto"
                    checked={newEccezione.regola.detraiCosto}
                    onChange={(e) => setNewEccezione({
                      ...newEccezione,
                      regola: { ...newEccezione.regola, detraiCosto: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-[#03A6A6] focus:ring-[#03A6A6]"
                  />
                  <label htmlFor="nuova-eccezione-detraiCosto" className="text-sm font-medium text-gray-700">
                    Detrai costo prodotto dal compenso
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowAddEccezione(false);
                  setNewEccezione({
                    trattamento: '',
                    prodotto: '',
                    regola: {
                      tipo: 'percentuale',
                      valore: 50,
                      valoreX: 50,
                      valoreY: 200,
                      su: 'netto',
                      detraiCosto: true
                    }
                  });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  if (newEccezione.trattamento && selectedMedico) {
                    // Verifica che non esista già questa combinazione
                    const esisteGia = (selectedMedico.eccezioni || []).some(e => 
                      e.trattamento === newEccezione.trattamento && 
                      e.prodotto === newEccezione.prodotto
                    );
                    
                    if (esisteGia) {
                      alert('Questa combinazione di trattamento e prodotto è già presente nelle eccezioni');
                      return;
                    }
                    
                    // Validazione regola scaglioni
                    if (newEccezione.regola.tipo === 'scaglioni') {
                      if (!newEccezione.regola.valoreX || !newEccezione.regola.valoreY || 
                          newEccezione.regola.valoreX === 0 || newEccezione.regola.valoreY === 0) {
                        alert('Inserisci valori validi per gli scaglioni (X e Y devono essere maggiori di 0)');
                        return;
                      }
                      if (newEccezione.regola.valoreX >= newEccezione.regola.valoreY) {
                        alert('Nella regola a scaglioni, X deve essere minore di Y (non puoi dare più di quanto incassi)');
                        return;
                      }
                    }
                    
                    // Validazione prodotto non configurato con detrazione costo
                    if (newEccezione.prodotto && newEccezione.regola.detraiCosto) {
                      const prodottoConfigurato = (selectedMedico.costiProdotti || []).some(
                        cp => cp.nome === newEccezione.prodotto
                      );
                      if (!prodottoConfigurato) {
                        alert(`Il prodotto "${newEccezione.prodotto}" non è configurato nella lista costi. Configura prima il prodotto o disattiva la detrazione costi per questa eccezione.`);
                        return;
                      }
                    }
                    
                    const eccezioneToAdd = {
                      ...newEccezione,
                      id: Date.now()
                    };
                    
                    const updatedMedico = {
                      ...selectedMedico,
                      eccezioni: [...(selectedMedico.eccezioni || []), eccezioneToAdd]
                    };
                    
                    setSelectedMedico(updatedMedico);
                    setHasUnsavedChanges(true);
                    setShowAddEccezione(false);
                    setNewEccezione({
                      trattamento: '',
                      prodotto: '',
                      regola: {
                        tipo: 'percentuale',
                        valore: 50,
                        valoreX: 50,
                        valoreY: 200,
                        su: 'netto',
                        detraiCosto: true
                      }
                    });
                  } else {
                    alert('Seleziona almeno un trattamento');
                  }
                }}
                className="flex-1 px-4 py-2 rounded-lg font-medium"
                style={{ backgroundColor: '#03A6A6', color: '#FFFFFF' }}
                onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#028a8a'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#03A6A6'}
              >
                Aggiungi Eccezione
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import Prodotti */}
      {showImportProdotti && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Import Prodotti da Excel</h3>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 mb-2">
                  ℹ️ Il file Excel deve contenere le colonne:
                </p>
                <ul className="text-xs text-blue-700 ml-4 list-disc">
                  <li><strong>Nome Prodotto</strong> - nome esatto del prodotto</li>
                  <li><strong>Unità di Misura</strong> - (opzionale) verrà presa dal sistema</li>
                  <li><strong>Costo</strong> - valore numerico (es. 120 o 120.50)</li>
                </ul>
                <p className="text-xs text-blue-700 mt-2">
                  La prima riga deve contenere le intestazioni delle colonne.
                </p>
                <details className="mt-2">
                  <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                    Prodotti disponibili nel sistema ▼
                  </summary>
                  <div className="mt-1 text-xs text-blue-700">
                    {prodottiDisponibili.map(p => `${p.nome} (${p.unitaMisura})`).join(', ')}
                  </div>
                </details>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#03A6A6] transition-colors">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                  {importFile ? (
                    <p className="text-sm text-[#03A6A6] font-medium">{importFile.name}</p>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Clicca per selezionare il file Excel
                    </p>
                  )}
                </label>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800">
                  ⚠️ L'import può:
                  <br />• Aggiornare i costi dei prodotti già configurati
                  <br />• Aggiungere nuovi prodotti (solo se presenti nel listino)
                  <br />• Ti verrà chiesta conferma prima di applicare le modifiche
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowImportProdotti(false);
                  setImportFile(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={handleImportProdotti}
                disabled={!importFile}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ 
                  backgroundColor: importFile ? '#03A6A6' : '#E5E7EB',
                  color: importFile ? '#FFFFFF' : '#9CA3AF',
                  cursor: importFile ? 'pointer' : 'not-allowed'
                }}
                onMouseEnter={(e) => importFile && ((e.target as HTMLElement).style.backgroundColor = '#028a8a')}
                onMouseLeave={(e) => importFile && ((e.target as HTMLElement).style.backgroundColor = '#03A6A6')}
              >
                Importa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Conferma Import */}
      {showImportConfirm && importPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Conferma Import Prodotti</h3>
            
            {importPreview.error ? (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">{importPreview.error}</p>
                </div>
                {importPreview.prodottiNonValidi && importPreview.prodottiNonValidi.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-800 font-medium mb-2">
                      Prodotti non disponibili nel sistema:
                    </p>
                    <p className="text-sm text-amber-700">
                      {importPreview.prodottiNonValidi.join(', ')}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => {
                    setShowImportConfirm(false);
                    setImportPreview(null);
                    setImportFile(null);
                  }}
                  className="w-full px-4 py-2 rounded-lg font-medium"
                  style={{ backgroundColor: '#03A6A6', color: '#FFFFFF' }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#028a8a'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#03A6A6'}
                >
                  Chiudi
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Prodotti non validi */}
                {importPreview.prodottiNonValidi && importPreview.prodottiNonValidi.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-800 font-medium mb-2">
                      ⚠️ I seguenti prodotti non sono disponibili nel sistema e verranno ignorati:
                    </p>
                    <p className="text-sm text-amber-700">
                      {importPreview.prodottiNonValidi.join(', ')}
                    </p>
                  </div>
                )}
                
                {/* Modifiche */}
                {importPreview.modifiche && importPreview.modifiche.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">
                      Modifiche ai prodotti esistenti ({importPreview.modifiche.length}):
                    </h4>
                    <div className="bg-blue-50 rounded-lg p-3 space-y-1">
                      {importPreview.modifiche.map((m: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">
                            {m.nome} 
                            <span className="text-xs text-gray-500 ml-1">
                              per {(selectedMedico.costiProdotti || []).find(p => p.nome === m.nome)?.unitaMisura || 'unità'}
                            </span>
                          </span>
                          <span className="text-gray-600">
                            €{m.vecchioCosto} → <span className="font-medium text-blue-700">€{m.nuovoCosto}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Nuovi prodotti */}
                {importPreview.nuoviProdotti && importPreview.nuoviProdotti.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">
                      Nuovi prodotti da aggiungere ({importPreview.nuoviProdotti.length}):
                    </h4>
                    <div className="bg-green-50 rounded-lg p-3 space-y-1">
                      {importPreview.nuoviProdotti.map((p: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700">
                            {p.nome} <span className="text-xs text-gray-500">per {p.unitaMisura}</span>
                          </span>
                          <span className="font-medium text-green-700">€{p.costo}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Riepilogo */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-800">
                    Riepilogo operazioni:
                  </p>
                  <ul className="text-sm text-gray-600 mt-1 ml-4 list-disc">
                    <li>{importPreview.modifiche?.length || 0} prodotti da aggiornare</li>
                    <li>{importPreview.nuoviProdotti?.length || 0} prodotti da aggiungere</li>
                    <li className="font-medium">
                      Totale: {(importPreview.modifiche?.length || 0) + (importPreview.nuoviProdotti?.length || 0)} operazioni
                    </li>
                  </ul>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowImportConfirm(false);
                      setImportPreview(null);
                      setShowImportProdotti(true); // Riapri il modal import
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    className="flex-1 px-4 py-2 rounded-lg font-medium"
                    style={{ backgroundColor: '#03A6A6', color: '#FFFFFF' }}
                    onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#028a8a'}
                    onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = '#03A6A6'}
                  >
                    Conferma Import
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GestioneMedici;
