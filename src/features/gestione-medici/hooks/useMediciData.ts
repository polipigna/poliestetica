import { useState, useEffect, useMemo, useCallback } from 'react';
import { MediciStore } from '@/services/stores/mediciStore';
import { prodottiMap } from '@/data/mock';
import type { 
  MedicoExtended, 
  CreateMedicoDTO, 
  UpdateMedicoDTO,
  UseMediciDataReturn 
} from './types';

/**
 * Hook per la gestione dei dati dei medici
 * Gestisce il caricamento, selezione e CRUD operations
 */
export function useMediciData(): UseMediciDataReturn {
  // State
  const [medici, setMedici] = useState<MedicoExtended[]>([]);
  const [selectedMedico, setSelectedMedico] = useState<MedicoExtended | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Istanza singleton dello store
  const mediciStore = useMemo(() => MediciStore.getInstance(), []);
  
  // Funzione helper per trasformare i dati dal formato store al formato extended
  const transformToExtended = useCallback((mediciFromStore: any[]): MedicoExtended[] => {
    return mediciFromStore.map(m => {
      const medicoEsteso: MedicoExtended = {
        ...m,
        specialita: m.specialita || 'Medicina Estetica',
        email: m.email || `${m.nome.toLowerCase()}.${m.cognome.toLowerCase()}@email.com`,
        telefono: m.telefono || `333 ${Math.floor(Math.random() * 9000000 + 1000000)}`,
        codiceFiscale: m.cf,
        partitaIva: m.piva,
        iban: m.iban || `IT${Math.random().toString().slice(2, 27)}`,
        indirizzo: m.indirizzo || 'Via Demo 123, Padova',
        attivo: m.attivo !== undefined ? m.attivo : true,
        regolaBase: m.regolaBase ? {
          tipo: m.regolaBase.tipo,
          valore: m.regolaBase.valore,
          valoreX: m.regolaBase.valoreX,
          valoreY: m.regolaBase.valoreY,
          su: m.regolaBase.calcolaSu || m.regolaBase.su || 'netto',
          detraiCosto: m.regolaBase.detraiCosti !== undefined ? m.regolaBase.detraiCosti : true
        } : {
          tipo: 'percentuale',
          valore: 50,
          su: 'netto',
          detraiCosto: true
        },
        costiProdotti: (m.costiProdotti || []).map((cp: any, idx: number) => {
          // Trova il prodotto di riferimento per ottenere nome completo e unità
          const prodottoRef = prodottiMap[cp.codiceProdotto || cp.codice];
          
          return {
            id: cp.id || idx + 1,
            codice: cp.codiceProdotto || cp.codice || '',
            nome: prodottoRef?.nome || cp.nomeProdotto || cp.codiceProdotto || cp.nome || '',
            displayName: prodottoRef ? `${cp.codiceProdotto} - ${prodottoRef.nome}` : (cp.codiceProdotto || cp.nome),
            costo: cp.costo || 0,
            unitaMisura: prodottoRef?.unita || cp.unitaMisura || 'unità',
            nonDetrarre: cp.nonDetrarre || false
          };
        }),
        eccezioni: (m.eccezioni || []).map((ecc: any, idx: number) => ({
          id: ecc.id || idx + 1,
          trattamento: ecc.codice || ecc.trattamento,
          prodotto: ecc.prodotto || '',
          regola: {
            tipo: ecc.tipo || ecc.regola?.tipo || 'percentuale',
            valore: ecc.valore || ecc.regola?.valore,
            valoreX: ecc.valoreX || ecc.regola?.valoreX,
            valoreY: ecc.valoreY || ecc.regola?.valoreY,
            su: ecc.calcolaSu || ecc.regola?.su || 'netto',
            detraiCosto: ecc.detraiCosti !== undefined ? ecc.detraiCosti : (ecc.regola?.detraiCosto !== undefined ? ecc.regola.detraiCosto : true)
          }
        }))
      };
      return medicoEsteso;
    });
  }, []);
  
  // Funzione per caricare i medici
  const loadMedici = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const mediciFromStore = await mediciStore.getMedici();
      const mediciCompleti = transformToExtended(mediciFromStore);
      
      setMedici(mediciCompleti);
      
      // Se c'è un medico selezionato, aggiorna anche quello
      if (selectedMedico) {
        const updatedSelected = mediciCompleti.find(m => m.id === selectedMedico.id);
        if (updatedSelected) {
          setSelectedMedico(updatedSelected);
        }
      }
    } catch (err) {
      console.error('Errore caricamento medici:', err);
      setError(err instanceof Error ? err.message : 'Errore nel caricamento dei medici');
    } finally {
      setLoading(false);
    }
  }, [mediciStore, transformToExtended, selectedMedico]);
  
  // Carica medici al mount e sottoscrivi agli aggiornamenti
  useEffect(() => {
    loadMedici();
    
    // Sottoscrivi agli aggiornamenti dello store
    const unsubscribe = mediciStore.subscribe(() => {
      loadMedici();
    });
    
    // Cleanup
    return () => {
      unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Seleziona un medico
  const selectMedico = useCallback((medico: MedicoExtended | null) => {
    setSelectedMedico(medico);
  }, []);
  
  // Crea un nuovo medico
  const createMedico = useCallback(async (data: CreateMedicoDTO): Promise<MedicoExtended> => {
    try {
      setError(null);
      
      // Genera ID temporaneo
      const tempId = Math.max(...medici.map(m => m.id), 0) + 1;
      
      // Crea oggetto medico base
      const newMedico = {
        id: tempId,
        nome: data.nome,
        cognome: data.cognome,
        cf: data.cf,
        piva: data.piva
      };
      
      // Salva nello store
      await mediciStore.createMedico(newMedico);
      
      // Ricarica la lista
      await loadMedici();
      
      // Trova e ritorna il medico appena creato
      const created = medici.find(m => m.cf === data.cf);
      if (!created) {
        throw new Error('Medico creato ma non trovato');
      }
      
      return created;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Errore nella creazione del medico';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [medici, mediciStore, loadMedici]);
  
  // Aggiorna un medico esistente
  const updateMedico = useCallback(async (id: number, updates: UpdateMedicoDTO): Promise<void> => {
    try {
      setError(null);
      
      // Prepara i dati per lo store nel formato corretto
      const storeUpdates: any = {
        ...updates
      };
      
      // Trasforma regolaBase nel formato store se presente
      if (updates.regolaBase) {
        storeUpdates.regolaBase = {
          tipo: updates.regolaBase.tipo,
          valore: updates.regolaBase.valore,
          valoreX: updates.regolaBase.valoreX,
          valoreY: updates.regolaBase.valoreY,
          calcolaSu: updates.regolaBase.su,
          detraiCosti: updates.regolaBase.detraiCosto
        };
      }
      
      // Trasforma costiProdotti nel formato store se presenti
      if (updates.costiProdotti) {
        storeUpdates.costiProdotti = updates.costiProdotti.map(cp => ({
          codiceProdotto: cp.codice || cp.nome,
          nomeProdotto: cp.nome,
          costo: cp.costo,
          unitaMisura: cp.unitaMisura,
          nonDetrarre: cp.nonDetrarre
        }));
      }
      
      // Trasforma eccezioni nel formato store se presenti
      if (updates.eccezioni) {
        storeUpdates.eccezioni = updates.eccezioni.map(ecc => ({
          codice: ecc.trattamento,
          prodotto: ecc.prodotto,
          tipo: ecc.regola.tipo,
          valore: ecc.regola.valore,
          valoreX: ecc.regola.valoreX,
          valoreY: ecc.regola.valoreY,
          calcolaSu: ecc.regola.su,
          detraiCosti: ecc.regola.detraiCosto
        }));
      }
      
      // Salva nello store
      await mediciStore.updateMedico(id, storeUpdates);
      
      // Se stiamo aggiornando solo costi prodotti, usa il metodo specifico
      if (updates.costiProdotti && !updates.regolaBase && !updates.eccezioni) {
        await mediciStore.updateCostiProdotti(id, storeUpdates.costiProdotti);
      }
      
      // Se stiamo aggiornando le regole, usa il metodo specifico
      if (updates.regolaBase || updates.eccezioni) {
        await mediciStore.updateRegoleCompensi(id, {
          regolaBase: storeUpdates.regolaBase,
          eccezioni: storeUpdates.eccezioni
        });
      }
      
      // Ricarica la lista (lo store notificherà automaticamente)
      // La ricarica avverrà tramite la subscription
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Errore nell\'aggiornamento del medico';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [mediciStore]);
  
  // Elimina un medico
  const deleteMedico = useCallback(async (id: number): Promise<void> => {
    try {
      setError(null);
      
      // Elimina dallo store
      await mediciStore.deleteMedico(id);
      
      // Se era il medico selezionato, deseleziona
      if (selectedMedico?.id === id) {
        setSelectedMedico(null);
      }
      
      // Ricarica la lista (avverrà tramite subscription)
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Errore nell\'eliminazione del medico';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [mediciStore, selectedMedico]);
  
  return {
    // State
    medici,
    selectedMedico,
    loading,
    error,
    
    // Actions
    selectMedico,
    createMedico,
    updateMedico,
    deleteMedico,
    refreshMedici: loadMedici
  };
}