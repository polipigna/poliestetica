import { useMemo } from 'react';
import { countAnomalieByType, calculateTotaleFattura, calculateIva } from '../utils';
import type { FatturaConVoci } from '../services';

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
      
      // Calcola IVA in base alla serie - Solo serie "IVA" ha l'IVA
      const iva = (serie === 'IVA') ? imponibile * 0.22 : 0;
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
      
      // Calcola IVA in base alla serie - Solo serie "IVA" ha l'IVA
      const iva = (serie === 'IVA') ? imponibile * 0.22 : 0;
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
      
      // Solo serie "IVA" ha l'IVA 22%
      if (serie === 'IVA') {
        const ivaCalcolata = calculateIva(f.imponibile || 0, 22);
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