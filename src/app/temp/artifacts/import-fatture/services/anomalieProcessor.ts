/**
 * Service per il processing completo delle anomalie
 * Gestisce il ricalcolo delle anomalie di una fattura
 */

import { AnomalieCalculator } from './anomalieCalculator';
import type { FatturaConVoci, VoceFatturaEstesa } from './anomalieCalculator';
import { calculateTotaleImponibile, calculateIva } from '../utils';

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

  /**
   * Rimuove anomalie specifiche da una voce
   * @param voce La voce da cui rimuovere le anomalie
   * @param anomalieDaRimuovere Anomalia o array di anomalie da rimuovere
   * @returns La voce aggiornata senza le anomalie specificate
   */
  static rimuoviAnomalieVoce(
    voce: VoceFatturaEstesa, 
    anomalieDaRimuovere: string | string[]
  ): VoceFatturaEstesa {
    const anomalieArray = Array.isArray(anomalieDaRimuovere) 
      ? anomalieDaRimuovere 
      : [anomalieDaRimuovere];
    
    return {
      ...voce,
      anomalie: voce.anomalie 
        ? voce.anomalie.filter((a: string) => !anomalieArray.includes(a)) 
        : []
    };
  }

  /**
   * Aggiorna completamente una fattura: ricalcola anomalie e totali
   * @param fattura La fattura da aggiornare
   * @param voci Le voci aggiornate della fattura
   * @param prestazioniMap Mappa delle prestazioni disponibili
   * @param prodottiMap Mappa dei prodotti disponibili
   * @returns La fattura completamente aggiornata con anomalie e totali
   */
  static aggiornaFatturaCompleta(
    fattura: FatturaConVoci,
    voci: VoceFatturaEstesa[],
    prestazioniMap: Record<string, any>,
    prodottiMap: Record<string, any>
  ): FatturaConVoci {
    // Prima ricalcola le anomalie
    const fatturaConAnomalie = this.ricalcolaAnomalieFattura(
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
      imponibile: totaleImponibile,
      iva: iva,
      totale: totaleImponibile + iva,
      conIva: hasIva // Aggiorna anche il flag conIva per consistenza
    };
  }
}