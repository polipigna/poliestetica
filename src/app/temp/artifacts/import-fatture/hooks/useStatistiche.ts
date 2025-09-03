import { useMemo } from 'react';
import { countAnomalieByType, calculateTotaleFattura, calculateIvaStandard } from '../utils';
import type { FatturaConVoci } from '../services';
import { SERIE_CON_IVA } from '../constants';

interface UseStatisticheReturn {
  statiCount: Record<string, number>;
  riepilogoMensile: {
    totaleFatture: number;
    totaleImportate: number;
    totali: {
      imponibile: number;
      iva: number;
      lordo: number;
    };
    perMedico: Record<string, { count: number; imponibile: number; iva: number; lordo: number }>;
    perSerie: Record<string, { count: number; imponibile: number; iva: number; lordo: number }>;
  };
}

export function useStatistiche(fatture: FatturaConVoci[]): UseStatisticheReturn {
  
  // Calcola stati count
  const statiCount = useMemo(() => {
    const anomalieByStato = fatture.map(f => ({ tipo: f.stato || 'da_importare' }));
    return countAnomalieByType(anomalieByStato);
  }, [fatture]);

  // Calcola riepilogo mensile
  const riepilogoMensile = useMemo(() => {
    const totaleFatture = fatture.length;
    const totaleImportate = fatture.filter(f => f.stato === 'importata').length;
    
    const totali = fatture.reduce((acc, f) => {
      const imponibile = f.imponibile || 0;
      const serie = f.serie || 'P';
      
      // Calcola IVA in base alla serie - Solo serie con IVA applicano l'aliquota
      const iva = SERIE_CON_IVA.includes(serie as any) ? calculateIvaStandard(imponibile) : 0;
      const lordo = calculateTotaleFattura(imponibile, iva);
      
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
      
      // Calcola IVA in base alla serie - Solo serie con IVA applicano l'aliquota
      const iva = SERIE_CON_IVA.includes(serie as any) ? calculateIvaStandard(imponibile) : 0;
      const lordo = calculateTotaleFattura(imponibile, iva);
      
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
      
      // Solo serie con IVA applicano l'aliquota
      if (SERIE_CON_IVA.includes(serie as any)) {
        const ivaCalcolata = calculateIvaStandard(f.imponibile || 0);
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

  return {
    statiCount,
    riepilogoMensile
  };
}