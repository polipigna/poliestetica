import { useMemo } from 'react';
import { StatisticheProcessor } from '../services';
import type { FatturaConVoci } from '../services';

interface UseStatisticheReturn {
  statiCount: Record<string, number>;
  riepilogoMensile: {
    totaleFatture: number;
    totaleImporto: number;
    perStato: Record<string, number>;
    perMedico: Array<{
      medico: string;
      numeroFatture: number;
      totaleImporto: number;
    }>;
    perSerie: Array<{
      serie: string;
      numeroFatture: number;
      totaleImporto: number;
    }>;
  };
}

export function useStatistiche(
  fatture: FatturaConVoci[],
  fattureFiltered: FatturaConVoci[]
): UseStatisticheReturn {
  
  // Usa il service per calcolare stati count
  const statiCount = useMemo(() => {
    return StatisticheProcessor.calcolaStatiCount(fatture);
  }, [fatture]);

  // Usa il service per calcolare riepilogo mensile
  const riepilogoMensile = useMemo(() => {
    return StatisticheProcessor.calcolaRiepilogoMensile(fatture, fattureFiltered);
  }, [fatture, fattureFiltered]);

  return {
    statiCount,
    riepilogoMensile
  };
}