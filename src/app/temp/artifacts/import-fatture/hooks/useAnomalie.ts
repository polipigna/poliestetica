import { useMemo } from 'react';
import { AnomalieCalculator, AnomalieProcessor } from '../services';
import type { VoceFatturaEstesa, FatturaConVoci } from '../services';

interface UseAnomalieReturn {
  verificaAnomalieVoce: (voce: VoceFatturaEstesa, voci: VoceFatturaEstesa[]) => string[];
  getAnomalieFattura: (fattura: FatturaConVoci) => string[];
  ricalcolaAnomalieFattura: (fattura: FatturaConVoci) => FatturaConVoci;
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

  return {
    verificaAnomalieVoce,
    getAnomalieFattura,
    ricalcolaAnomalieFattura
  };
}