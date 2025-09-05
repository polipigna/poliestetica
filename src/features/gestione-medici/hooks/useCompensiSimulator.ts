import { useState, useCallback, useMemo } from 'react';
import { CompensiCalculator, RegolaValidator } from '@/services/compensi';
import type { 
  MedicoExtended,
  SimulazioneParams,
  RisultatoCalcolo
} from './types';
import type { CalcoloParams } from '@/services/compensi';

interface UseCompensiSimulatorReturn {
  // State
  simulazione: SimulazioneParams;
  risultato: RisultatoCalcolo | null;
  isCalculating: boolean;
  error: string | null;
  
  // Actions
  updateSimulazione: (params: Partial<SimulazioneParams>) => void;
  setTrattamento: (trattamento: string) => void;
  setProdotto: (prodotto: string) => void;
  setImportoFattura: (importo: string) => void;
  setIvaInclusa: (inclusa: boolean) => void;
  calcola: () => void;
  reset: () => void;
  
  // Computed
  canCalculate: boolean;
  margineClinica: number;
  percentualeMargine: number;
}

/**
 * Hook per la simulazione del calcolo compensi
 * Gestisce il simulatore con calcoli e validazioni
 */
export function useCompensiSimulator(medico: MedicoExtended | null): UseCompensiSimulatorReturn {
  // State
  const [simulazione, setSimulazione] = useState<SimulazioneParams>({
    trattamento: '',
    prodotto: '',
    importoFattura: '',
    ivaInclusa: true
  });
  
  const [risultato, setRisultato] = useState<RisultatoCalcolo | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Istanze dei servizi
  const compensiCalculator = useMemo(() => new CompensiCalculator(), []);
  const regolaValidator = useMemo(() => new RegolaValidator(), []);
  
  // Update simulazione
  const updateSimulazione = useCallback((params: Partial<SimulazioneParams>) => {
    setSimulazione(prev => ({
      ...prev,
      ...params
    }));
    // Reset risultato quando cambiano i parametri
    if (risultato) {
      setRisultato(null);
    }
    setError(null);
  }, [risultato]);
  
  // Setter specifici per convenienza
  const setTrattamento = useCallback((trattamento: string) => {
    updateSimulazione({ trattamento, prodotto: '' }); // Reset prodotto quando cambia trattamento
  }, [updateSimulazione]);
  
  const setProdotto = useCallback((prodotto: string) => {
    updateSimulazione({ prodotto });
  }, [updateSimulazione]);
  
  const setImportoFattura = useCallback((importoFattura: string) => {
    updateSimulazione({ importoFattura });
  }, [updateSimulazione]);
  
  const setIvaInclusa = useCallback((ivaInclusa: boolean) => {
    updateSimulazione({ ivaInclusa });
  }, [updateSimulazione]);
  
  // Calcola compenso
  const calcola = useCallback(() => {
    if (!medico || !simulazione.trattamento || !simulazione.importoFattura) {
      setError('Parametri mancanti per il calcolo');
      return;
    }
    
    const importo = parseFloat(simulazione.importoFattura);
    if (isNaN(importo) || importo <= 0) {
      setError('Inserisci un importo valido');
      return;
    }
    
    if (!medico.regolaBase) {
      setError('Regola base non configurata per questo medico');
      return;
    }
    
    setIsCalculating(true);
    setError(null);
    
    try {
      // Valida la regola prima del calcolo
      if (!regolaValidator.isRegolaValida(medico.regolaBase)) {
        setError('Regola base non valida');
        setIsCalculating(false);
        return;
      }
      
      // Prepara parametri per il calculator
      const params: CalcoloParams = {
        importoFattura: importo,
        ivaInclusa: simulazione.ivaInclusa,
        trattamento: simulazione.trattamento,
        prodotto: simulazione.prodotto || undefined,
        quantita: 1,
        regolaBase: medico.regolaBase,
        eccezioni: medico.eccezioni || [],
        costiProdotti: medico.costiProdotti || []
      };
      
      // Esegui il calcolo
      const risultatoCalcolo = compensiCalculator.calcola(params);
      
      // Calcola valori aggiuntivi per la UI
      const compensoFinale = risultatoCalcolo.compensoNetto;
      const margineClinica = risultatoCalcolo.importoNetto - compensoFinale;
      const percentualeMargine = risultatoCalcolo.importoNetto > 0 
        ? (margineClinica / risultatoCalcolo.importoNetto) * 100 
        : 0;
      
      // Adatta il risultato al formato esteso
      const risultatoCompleto: RisultatoCalcolo = {
        importoLordo: risultatoCalcolo.importoLordo,
        importoNetto: risultatoCalcolo.importoNetto,
        compensoBase: risultatoCalcolo.compensoBase,
        costoProdotto: risultatoCalcolo.costoProdotto,
        compensoNetto: risultatoCalcolo.compensoNetto,
        compensoFinale: compensoFinale,
        margineClinica: margineClinica,
        percentualeMargine: percentualeMargine,
        tipoRegola: risultatoCalcolo.tipoRegola,
        descrizioneCalcolo: risultatoCalcolo.descrizioneCalcolo,
        dettagliCosti: risultatoCalcolo.dettagliCosti,
        regolaApplicata: risultatoCalcolo.regolaApplicata
      };
      
      setRisultato(risultatoCompleto);
    } catch (err) {
      console.error('Errore nel calcolo:', err);
      setError(err instanceof Error ? err.message : 'Errore durante il calcolo');
    } finally {
      setIsCalculating(false);
    }
  }, [medico, simulazione, compensiCalculator, regolaValidator]);
  
  // Reset simulazione
  const reset = useCallback(() => {
    setSimulazione({
      trattamento: '',
      prodotto: '',
      importoFattura: '',
      ivaInclusa: true
    });
    setRisultato(null);
    setError(null);
    setIsCalculating(false);
  }, []);
  
  // Computed: può calcolare?
  const canCalculate = useMemo(() => {
    if (!medico || !simulazione.trattamento || !simulazione.importoFattura) {
      return false;
    }
    
    const importo = parseFloat(simulazione.importoFattura);
    if (isNaN(importo) || importo <= 0) {
      return false;
    }
    
    return !isCalculating;
  }, [medico, simulazione, isCalculating]);
  
  // Computed: margine clinica
  const margineClinica = useMemo(() => {
    return risultato?.margineClinica || 0;
  }, [risultato]);
  
  // Computed: percentuale margine
  const percentualeMargine = useMemo(() => {
    return risultato?.percentualeMargine || 0;
  }, [risultato]);
  
  return {
    // State
    simulazione,
    risultato,
    isCalculating,
    error,
    
    // Actions
    updateSimulazione,
    setTrattamento,
    setProdotto,
    setImportoFattura,
    setIvaInclusa,
    calcola,
    reset,
    
    // Computed
    canCalculate,
    margineClinica,
    percentualeMargine
  };
}