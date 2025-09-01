import { useMemo } from 'react';
import { AnomalieCalculator, AnomalieProcessor } from '../services';
import type { VoceFatturaEstesa, FatturaConVoci } from '../services';
import { calculateTotaleImponibile, calculateIva } from '../utils';

interface UseAnomalieReturn {
  verificaAnomalieVoce: (voce: VoceFatturaEstesa, voci: VoceFatturaEstesa[]) => string[];
  getAnomalieFattura: (fattura: FatturaConVoci) => string[];
  ricalcolaAnomalieFattura: (fattura: FatturaConVoci) => FatturaConVoci;
  getUnitaCorretta: (voce: VoceFatturaEstesa) => string | null;
  isUnitaCorregibile: (voce: VoceFatturaEstesa) => boolean;
  rimuoviAnomalieVoce: (voce: VoceFatturaEstesa, anomalieDaRimuovere: string | string[]) => VoceFatturaEstesa;
  aggiornaFatturaCompleta: (fattura: FatturaConVoci, voci: VoceFatturaEstesa[]) => FatturaConVoci;
}

export function useAnomalie(
  prestazioniMap: Record<string, any>,
  prodottiMap: Record<string, any>
): UseAnomalieReturn {
  
  // Funzione per verificare anomalie voci
  const verificaAnomalieVoce = useMemo(() => {
    return (voce: VoceFatturaEstesa, voci: VoceFatturaEstesa[]): string[] => {
      return AnomalieCalculator.verificaAnomalieVoce(voce, voci, prestazioniMap, prodottiMap);
    };
  }, [prodottiMap, prestazioniMap]);

  // Calcola anomalie per fattura
  const getAnomalieFattura = useMemo(() => {
    return (fattura: FatturaConVoci) => {
      return AnomalieCalculator.getAnomalieFattura(fattura);
    };
  }, []);

  // Funzione per ricalcolare le anomalie di una fattura - usa il service
  const ricalcolaAnomalieFattura = (f: FatturaConVoci): FatturaConVoci => {
    return AnomalieProcessor.ricalcolaAnomalieFattura(f, prestazioniMap, prodottiMap);
  };

  // Funzione per determinare l'unità corretta per una voce
  const getUnitaCorretta = useMemo(() => {
    return (voce: VoceFatturaEstesa): string | null => {
      return AnomalieCalculator.getUnitaCorretta(voce, prestazioniMap, prodottiMap);
    };
  }, [prestazioniMap, prodottiMap]);

  // Funzione per verificare se l'unità è correggibile
  const isUnitaCorregibile = useMemo(() => {
    return (voce: VoceFatturaEstesa): boolean => {
      return AnomalieCalculator.isUnitaCorregibile(voce, prestazioniMap, prodottiMap);
    };
  }, [prestazioniMap, prodottiMap]);

  // Funzione per rimuovere anomalie specifiche da una voce
  const rimuoviAnomalieVoce = useMemo(() => {
    return (voce: VoceFatturaEstesa, anomalieDaRimuovere: string | string[]): VoceFatturaEstesa => {
      const anomalieArray = Array.isArray(anomalieDaRimuovere) ? anomalieDaRimuovere : [anomalieDaRimuovere];
      return {
        ...voce,
        anomalie: voce.anomalie ? voce.anomalie.filter((a: string) => !anomalieArray.includes(a)) : []
      };
    };
  }, []);

  // Funzione completa per aggiornare fattura con anomalie e totali
  const aggiornaFatturaCompleta = useMemo(() => {
    return (fattura: FatturaConVoci, voci: VoceFatturaEstesa[]): FatturaConVoci => {
      // Prima ricalcola le anomalie
      const fatturaConAnomalie = AnomalieProcessor.ricalcolaAnomalieFattura(
        { ...fattura, voci }, 
        prestazioniMap, 
        prodottiMap
      );
      
      // Poi calcola i totali basandosi sulle voci aggiornate
      const totaleImponibile = calculateTotaleImponibile(
        fatturaConAnomalie.voci.map(v => ({ imponibile: v.importoNetto }))
      );
      
      // Determina se la fattura ha IVA - gestisce vari casi
      const hasIva = fattura.conIva || fattura.iva > 0 || fattura.serie === 'IVA';
      const aliquotaIva = 22; // Aliquota IVA standard al 22%
      const iva = hasIva ? calculateIva(totaleImponibile, aliquotaIva) : 0;
      
      // Ritorna la fattura completa con tutti i campi preservati
      return {
        ...fatturaConAnomalie,
        imponibile: totaleImponibile, // Usa solo 'imponibile' che è il campo esistente nel tipo Fattura
        iva: iva,
        totale: totaleImponibile + iva,
        conIva: hasIva // Aggiorna anche il flag conIva per consistenza
      };
    };
  }, [prestazioniMap, prodottiMap]);

  return {
    verificaAnomalieVoce,
    getAnomalieFattura,
    ricalcolaAnomalieFattura,
    getUnitaCorretta,
    isUnitaCorregibile,
    rimuoviAnomalieVoce,
    aggiornaFatturaCompleta
  };
}