/**
 * Service per il calcolo delle statistiche
 * Gestisce aggregazioni e riepiloghi
 */

import { countAnomalieByType } from '../utils';
import type { FatturaConVoci } from './anomalieCalculator';

interface StatiCount {
  [key: string]: number;
}

interface RiepilogoPerMedico {
  medico: string;
  numeroFatture: number;
  totaleImporto: number;
}

interface RiepilogoPerSerie {
  serie: string;
  numeroFatture: number;
  totaleImporto: number;
}

interface RiepilogoMensile {
  totaleFatture: number;
  totaleImporto: number;
  perStato: StatiCount;
  perMedico: RiepilogoPerMedico[];
  perSerie: RiepilogoPerSerie[];
}

export class StatisticheProcessor {
  
  /**
   * Calcola il conteggio degli stati
   */
  static calcolaStatiCount(fatture: FatturaConVoci[]): StatiCount {
    const anomalieByStato = fatture.map(f => ({ tipo: f.stato || 'da_importare' }));
    return countAnomalieByType(anomalieByStato);
  }

  /**
   * Calcola il riepilogo mensile completo
   */
  static calcolaRiepilogoMensile(
    fatture: FatturaConVoci[],
    fattureFiltered: FatturaConVoci[]
  ): RiepilogoMensile {
    const totaleFatture = fatture.length;
    const totaleImporto = fatture.reduce((acc, f) => acc + (f.totale || 0), 0);
    
    // Per stato
    const perStato: StatiCount = {};
    fatture.forEach(f => {
      const stato = f.stato || 'da_importare';
      perStato[stato] = (perStato[stato] || 0) + 1;
    });
    
    // Per medico - raggruppa e calcola
    const perMedicoMap: { [key: string]: { numeroFatture: number; totaleImporto: number } } = {};
    fattureFiltered.forEach(f => {
      const medico = f.medicoNome || 'Non assegnato';
      if (!perMedicoMap[medico]) {
        perMedicoMap[medico] = { numeroFatture: 0, totaleImporto: 0 };
      }
      perMedicoMap[medico].numeroFatture++;
      perMedicoMap[medico].totaleImporto += (f.totale || 0);
    });
    
    const perMedico = Object.entries(perMedicoMap)
      .map(([medico, data]) => ({ medico, ...data }))
      .sort((a, b) => b.totaleImporto - a.totaleImporto);
    
    // Per serie - raggruppa e calcola
    const perSerieMap: { [key: string]: { numeroFatture: number; totaleImporto: number } } = {};
    fattureFiltered.forEach(f => {
      const serie = f.serie || 'Sconosciuta';
      if (!perSerieMap[serie]) {
        perSerieMap[serie] = { numeroFatture: 0, totaleImporto: 0 };
      }
      perSerieMap[serie].numeroFatture++;
      perSerieMap[serie].totaleImporto += (f.totale || 0);
    });
    
    const perSerie = Object.entries(perSerieMap)
      .map(([serie, data]) => ({ serie, ...data }))
      .sort((a, b) => b.totaleImporto - a.totaleImporto);
    
    return {
      totaleFatture,
      totaleImporto,
      perStato,
      perMedico,
      perSerie
    };
  }

  /**
   * Calcola statistiche per singolo medico
   */
  static calcolaStatisticheMedico(
    fatture: FatturaConVoci[],
    medicoId: number
  ): {
    numeroFatture: number;
    totaleImporto: number;
    numeroAnomalie: number;
  } {
    const fattureMedico = fatture.filter(f => f.medicoId === medicoId);
    
    return {
      numeroFatture: fattureMedico.length,
      totaleImporto: fattureMedico.reduce((acc, f) => acc + (f.totale || 0), 0),
      numeroAnomalie: fattureMedico.filter(f => f.anomalie && f.anomalie.length > 0).length
    };
  }

  /**
   * Raggruppa fatture per periodo (mese/anno)
   */
  static raggruppaPeriodo(
    fatture: FatturaConVoci[],
    periodo: 'mese' | 'anno' = 'mese'
  ): Map<string, FatturaConVoci[]> {
    const grouped = new Map<string, FatturaConVoci[]>();
    
    fatture.forEach(f => {
      const data = f.data || f.dataEmissione;
      if (!data) return;
      
      const date = new Date(data);
      let key: string;
      
      if (periodo === 'mese') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        key = String(date.getFullYear());
      }
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(f);
    });
    
    return grouped;
  }
}