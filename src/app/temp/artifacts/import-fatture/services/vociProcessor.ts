/**
 * Service per il processing delle voci fattura
 * Gestisce tutte le operazioni di modifica e correzione voci
 */

import { AnomalieProcessor } from './anomalieProcessor';
import type { FatturaConVoci, VoceFatturaEstesa } from './anomalieCalculator';

export class VociProcessor {
  
  /**
   * Imposta il prezzo a zero per una voce
   */
  static impostaPrezzoZero(
    fattura: FatturaConVoci, 
    voceId: number,
    prestazioniMap: Record<string, any>,
    prodottiMap: Record<string, any>
  ): FatturaConVoci {
    if (!fattura.voci) return fattura;
    
    const voci = fattura.voci.map(v => {
      if (v.id === voceId) {
        const voceSenzaAnomalie = AnomalieProcessor.rimuoviAnomalieVoce(v, 'prodotto_con_prezzo');
        return { ...voceSenzaAnomalie, importoNetto: 0, importoLordo: 0 };
      }
      return v;
    });
    
    // Usa AnomalieProcessor per ricalcolare tutto (anomalie + totali + stato)
    return AnomalieProcessor.aggiornaFatturaCompleta(fattura, voci, prestazioniMap, prodottiMap);
  }

  /**
   * Elimina una voce dalla fattura
   */
  static eliminaVoce(
    fattura: FatturaConVoci, 
    voceId: number,
    prestazioniMap: Record<string, any>,
    prodottiMap: Record<string, any>
  ): FatturaConVoci {
    if (!fattura.voci) return fattura;
    
    // Rimuovi la voce
    const voci = fattura.voci.filter(v => v.id !== voceId);
    
    // Usa AnomalieProcessor per ricalcolare tutto
    return AnomalieProcessor.aggiornaFatturaCompleta(fattura, voci, prestazioniMap, prodottiMap);
  }

  /**
   * Aggiorna prezzo e associa prestazione
   */
  static aggiornaPrezzoEAssociaPrestazione(
    fattura: FatturaConVoci, 
    voceId: number, 
    nuovoPrezzo: number, 
    codicePrestazione: string,
    prestazioniMap: Record<string, any>,
    prodottiMap: Record<string, any>
  ): FatturaConVoci {
    if (!fattura.voci) return fattura;
    
    const voci = fattura.voci.map(v => {
      if (v.id === voceId) {
        // Rimuovi anomalie usando AnomalieProcessor
        let voceAggiornata = AnomalieProcessor.rimuoviAnomalieVoce(v, ['prodotto_orfano', 'prodotto_con_prezzo']);
        return { 
          ...voceAggiornata, 
          importoNetto: nuovoPrezzo,
          importoLordo: nuovoPrezzo * 1.22,
          prestazioneAssociata: codicePrestazione
        };
      }
      return v;
    });
    
    // Usa AnomalieProcessor per ricalcolare tutto
    return AnomalieProcessor.aggiornaFatturaCompleta(fattura, voci, prestazioniMap, prodottiMap);
  }

  /**
   * Associa una prestazione a una voce
   */
  static associaPrestazione(
    fattura: FatturaConVoci, 
    voceId: number, 
    codicePrestazione: string,
    prestazioniMap: Record<string, any>,
    prodottiMap: Record<string, any>
  ): FatturaConVoci {
    if (!fattura.voci) return fattura;
    
    const voci = fattura.voci.map(v => {
      if (v.id === voceId) {
        const voceAggiornata = AnomalieProcessor.rimuoviAnomalieVoce(v, 'prodotto_orfano');
        return { 
          ...voceAggiornata, 
          prestazioneAssociata: codicePrestazione
        };
      }
      return v;
    });
    
    // Usa AnomalieProcessor per ricalcolare tutto
    return AnomalieProcessor.aggiornaFatturaCompleta(fattura, voci, prestazioniMap, prodottiMap);
  }

  /**
   * Corregge l'unità di misura
   */
  static correggiUnita(
    fattura: FatturaConVoci, 
    voceId: number, 
    unitaCorretta: string,
    prestazioniMap: Record<string, any>,
    prodottiMap: Record<string, any>
  ): FatturaConVoci {
    if (!fattura.voci) return fattura;
    
    const voci = fattura.voci.map(v => {
      if (v.id === voceId) {
        const voceAggiornata = AnomalieProcessor.rimuoviAnomalieVoce(v, 'unita_non_valida');
        return { ...voceAggiornata, unita: unitaCorretta };
      }
      return v;
    });
    
    // Usa AnomalieProcessor per ricalcolare tutto
    return AnomalieProcessor.aggiornaFatturaCompleta(fattura, voci, prestazioniMap, prodottiMap);
  }

  /**
   * Corregge la quantità
   */
  static correggiQuantita(
    fattura: FatturaConVoci, 
    voceId: number, 
    nuovaQuantita: number,
    prestazioniMap: Record<string, any>,
    prodottiMap: Record<string, any>
  ): FatturaConVoci {
    if (!fattura.voci) return fattura;
    
    const voci = fattura.voci.map(v => {
      if (v.id === voceId) {
        const voceAggiornata = AnomalieProcessor.rimuoviAnomalieVoce(v, 'quantita_zero');
        const prezzoUnitario = v.importoNetto / (v.quantita || 1);
        const nuovoImporto = prezzoUnitario * nuovaQuantita;
        return { 
          ...voceAggiornata, 
          quantita: nuovaQuantita,
          importoNetto: nuovoImporto,
          importoLordo: nuovoImporto * 1.22
        };
      }
      return v;
    });
    
    // Usa AnomalieProcessor per ricalcolare tutto
    return AnomalieProcessor.aggiornaFatturaCompleta(fattura, voci, prestazioniMap, prodottiMap);
  }

  /**
   * Corregge il codice di una voce
   */
  static correggiCodice(
    fattura: FatturaConVoci, 
    voceId: number, 
    nuovoCodice: string, 
    nuovoPrezzo?: number, 
    nuovaQuantita?: number,
    prestazioniMap?: Record<string, any>,
    prodottiMap?: Record<string, any>
  ): FatturaConVoci {
    if (!fattura.voci) return fattura;
    
    // Importa AnomalieCalculator per usare getUnitaCorretta
    const { AnomalieCalculator } = require('./anomalieCalculator');
    
    const voci = fattura.voci.map(v => {
      if (v.id === voceId) {
        // Rimuovi anomalie correlate al codice e unità
        let voceAggiornata = AnomalieProcessor.rimuoviAnomalieVoce(v, ['codice_sconosciuto', 'unita_non_valida']);
        
        const updates: any = { 
          codice: nuovoCodice
        };
        
        // Determina se è una prestazione o prodotto e aggiorna di conseguenza
        const prestazione = prestazioniMap && prestazioniMap[nuovoCodice];
        const prodotto = prodottiMap && prodottiMap[nuovoCodice];
        
        if (prestazione) {
          // È una prestazione - usa sempre 'prestazione' come unità
          updates.tipo = 'prestazione';
          updates.unita = 'prestazione';
          updates.descrizione = prestazione.descrizione || `Prestazione ${nuovoCodice}`;
          // Le prestazioni hanno sempre quantità 1
          updates.quantita = 1;
        } else if (prodotto) {
          // È un prodotto
          updates.tipo = 'prodotto';
          updates.unita = prodotto.unita || 'PZ';
          updates.descrizione = prodotto.nome || `Prodotto ${nuovoCodice}`;
          // Mantieni la quantità o usa quella fornita
          if (nuovaQuantita !== undefined) {
            updates.quantita = nuovaQuantita;
          }
        } else {
          // Codice non riconosciuto, mantieni i valori esistenti ma aggiorna comunque
          updates.descrizione = v.descrizione || `Articolo ${nuovoCodice}`;
          
          // Prova a determinare l'unità corretta usando AnomalieCalculator
          const voceConNuovoCodice = { ...voceAggiornata, codice: nuovoCodice };
          const unitaCorretta = AnomalieCalculator.getUnitaCorretta(voceConNuovoCodice, prestazioniMap || {}, prodottiMap || {});
          if (unitaCorretta) {
            updates.unita = unitaCorretta;
          }
        }
        
        // Gestione del prezzo
        if (nuovoPrezzo !== undefined) {
          updates.importoNetto = nuovoPrezzo;
          updates.importoLordo = nuovoPrezzo * 1.22;
        }
        
        // Se cambia la quantità (e non è già stata gestita sopra)
        if (nuovaQuantita !== undefined && !prestazione) {
          updates.quantita = nuovaQuantita;
          // Ricalcola l'importo se necessario
          if (nuovoPrezzo === undefined && v.quantita && v.quantita > 0) {
            const prezzoUnitario = v.importoNetto / v.quantita;
            updates.importoNetto = prezzoUnitario * nuovaQuantita;
            updates.importoLordo = updates.importoNetto * 1.22;
          }
        }
        
        return { ...voceAggiornata, ...updates };
      }
      return v;
    });
    
    // Usa AnomalieProcessor per ricalcolare tutto
    return AnomalieProcessor.aggiornaFatturaCompleta(fattura, voci, prestazioniMap || {}, prodottiMap || {});
  }

  /**
   * Conferma che una prestazione è completa (rimuove l'anomalia prodotti_mancanti)
   */
  static confermaPrestazioneCompleta(
    fattura: FatturaConVoci, 
    prestazione: string,
    prestazioniMap: Record<string, any>,
    prodottiMap: Record<string, any>
  ): FatturaConVoci {
    if (!fattura.voci) return fattura;
    
    const voci = fattura.voci.map(v => {
      if (v.codice === prestazione) {
        return AnomalieProcessor.rimuoviAnomalieVoce(v, 'prodotti_mancanti');
      }
      return v;
    });
    
    // Usa AnomalieProcessor per ricalcolare tutto
    return AnomalieProcessor.aggiornaFatturaCompleta(fattura, voci, prestazioniMap, prodottiMap);
  }

  /**
   * Conferma che una prestazione con macchinario è completa
   */
  static confermaPrestazioneMacchinarioCompleta(
    fattura: FatturaConVoci, 
    prestazione: string,
    prestazioniMap: Record<string, any>,
    prodottiMap: Record<string, any>
  ): FatturaConVoci {
    if (!fattura.voci) return fattura;
    
    const voci = fattura.voci.map(v => {
      if (v.codice === prestazione) {
        return AnomalieProcessor.rimuoviAnomalieVoce(v, 'macchinario_mancante');
      }
      return v;
    });
    
    // Usa AnomalieProcessor per ricalcolare tutto
    return AnomalieProcessor.aggiornaFatturaCompleta(fattura, voci, prestazioniMap, prodottiMap);
  }
}