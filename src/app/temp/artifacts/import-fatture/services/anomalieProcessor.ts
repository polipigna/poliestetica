/**
 * Service per il processing completo delle anomalie
 * Gestisce il ricalcolo delle anomalie di una fattura
 */

import { AnomalieCalculator } from './anomalieCalculator';
import type { FatturaConVoci, VoceFatturaEstesa } from './anomalieCalculator';

export class AnomalieProcessor {
  
  /**
   * Ricalcola tutte le anomalie di una fattura
   */
  static ricalcolaAnomalieFattura(
    fattura: FatturaConVoci,
    prestazioniMap: Record<string, any>,
    prodottiMap: Record<string, any>
  ): FatturaConVoci {
    // Prima calcola le anomalie per ogni voce
    const vociConAnomalie = fattura.voci ? fattura.voci.map(voce => {
      const anomalieVoce = AnomalieCalculator.verificaAnomalieVoce(
        voce, 
        fattura.voci || [], 
        prestazioniMap, 
        prodottiMap
      );
      return { ...voce, anomalie: anomalieVoce };
    }) : [];
    
    // Ora calcola le anomalie della fattura basandosi sulle voci aggiornate
    const anomalieEsistenti: string[] = [];
    
    if (!fattura.medicoId) {
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
    const stato = anomalieUniche.length > 0 ? 'anomalia' : 
                  (fattura.stato === 'importata' ? 'importata' : 'da_importare');
    
    return { 
      ...fattura, 
      voci: vociConAnomalie, 
      stato: stato as any, 
      anomalie: anomalieUniche 
    };
  }

  /**
   * Ricalcola le anomalie per un batch di fatture
   */
  static ricalcolaAnomalieBatch(
    fatture: FatturaConVoci[],
    prestazioniMap: Record<string, any>,
    prodottiMap: Record<string, any>
  ): FatturaConVoci[] {
    return fatture.map(f => 
      this.ricalcolaAnomalieFattura(f, prestazioniMap, prodottiMap)
    );
  }

  /**
   * Verifica se una fattura può essere importata
   */
  static canImportFattura(fattura: FatturaConVoci): boolean {
    if (!fattura.medicoId) return false;
    const anomalie = AnomalieCalculator.getAnomalieFattura(fattura);
    return anomalie.length === 0;
  }

  /**
   * Filtra fatture per tipo di anomalia
   */
  static filterByAnomalia(
    fatture: FatturaConVoci[],
    tipoAnomalia: string
  ): FatturaConVoci[] {
    if (tipoAnomalia === 'senza_anomalie') {
      return fatture.filter(f => {
        const anomalie = AnomalieCalculator.getAnomalieFattura(f);
        return anomalie.length === 0;
      });
    }
    
    return fatture.filter(f => {
      const anomalie = AnomalieCalculator.getAnomalieFattura(f);
      return anomalie.includes(tipoAnomalia);
    });
  }
}