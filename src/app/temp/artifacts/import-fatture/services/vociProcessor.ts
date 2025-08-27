/**
 * Service per il processing delle voci fattura
 * Gestisce tutte le operazioni di modifica e correzione voci
 */

import { calculateAnomalie } from '@/utils/fattureHelpers';
import { calculateTotaleImponibile } from '../utils';
import type { FatturaConVoci, VoceFatturaEstesa } from './anomalieCalculator';

export class VociProcessor {
  
  /**
   * Imposta il prezzo a zero per una voce
   */
  static impostaPrezzoZero(fattura: FatturaConVoci, voceId: number): FatturaConVoci {
    if (!fattura.voci) return fattura;
    
    const voci = fattura.voci.map(v => {
      if (v.id === voceId) {
        const anomalieFiltrate = v.anomalie ? v.anomalie.filter(a => a !== 'prodotto_con_prezzo') : [];
        return { ...v, importoNetto: 0, importoLordo: 0, anomalie: anomalieFiltrate };
      }
      return v;
    });
    
    // Ricalcola anomalie
    const nuoveAnomalie = calculateAnomalie(voci.map(v => ({ ...v, anomalie: v.anomalie || [] })), fattura.medicoId);
    const stato = nuoveAnomalie.length > 0 ? 'anomalia' : 'da_importare';
    
    // Ricalcola totali
    const totaleNetto = calculateTotaleImponibile(voci.map(v => ({ imponibile: v.importoNetto })));
    
    return { ...fattura, voci, imponibile: totaleNetto, totale: totaleNetto * 1.22, anomalie: nuoveAnomalie, stato: stato as any };
  }

  /**
   * Elimina una voce dalla fattura
   */
  static eliminaVoce(fattura: FatturaConVoci, voceId: number): FatturaConVoci {
    if (!fattura.voci) return fattura;
    
    // Rimuovi la voce
    const voci = fattura.voci.filter(v => v.id !== voceId);
    
    // Ricalcola anomalie
    const nuoveAnomalie = calculateAnomalie(voci.map(v => ({ ...v, anomalie: v.anomalie || [] })), fattura.medicoId);
    const stato = nuoveAnomalie.length > 0 ? 'anomalia' : 'da_importare';
    
    // Ricalcola totali
    const totaleNetto = calculateTotaleImponibile(voci.map(v => ({ imponibile: v.importoNetto })));
    
    return { ...fattura, voci, imponibile: totaleNetto, totale: totaleNetto * 1.22, anomalie: nuoveAnomalie, stato: stato as any };
  }

  /**
   * Aggiunge una prestazione mancante
   */
  static aggiungiPrestazioneMancante(fattura: FatturaConVoci, codicePrestazione: string): FatturaConVoci {
    if (!fattura.voci) return fattura;
    
    // Aggiungi nuova voce prestazione con importo 0
    const nuovaVoce: VoceFatturaEstesa = {
      id: Date.now(),
      codice: codicePrestazione,
      descrizione: `Prestazione ${codicePrestazione}`,
      quantita: 1,
      unita: 'PZ',
      importoNetto: 0,
      importoLordo: 0,
      tipo: 'prestazione',
      anomalie: []
    };
    
    const voci = [...(fattura.voci || []), nuovaVoce];
    
    // Ricalcola anomalie
    const nuoveAnomalie = calculateAnomalie(voci.map(v => ({ ...v, anomalie: v.anomalie || [] })), fattura.medicoId);
    const stato = nuoveAnomalie.length > 0 ? 'anomalia' : 'da_importare';
    
    return { ...fattura, voci, anomalie: nuoveAnomalie, stato: stato as any };
  }

  /**
   * Aggiorna prezzo e associa prestazione
   */
  static aggiornaPrezzoEAssociaPrestazione(
    fattura: FatturaConVoci, 
    voceId: number, 
    nuovoPrezzo: number, 
    codicePrestazione: string
  ): FatturaConVoci {
    if (!fattura.voci) return fattura;
    
    const voci = fattura.voci.map(v => {
      if (v.id === voceId) {
        const anomalieFiltrate = v.anomalie ? 
          v.anomalie.filter(a => a !== 'prodotto_orfano' && a !== 'prodotto_con_prezzo') : [];
        return { 
          ...v, 
          importoNetto: nuovoPrezzo,
          importoLordo: nuovoPrezzo * 1.22,
          prestazioneAssociata: codicePrestazione,
          anomalie: anomalieFiltrate 
        };
      }
      return v;
    });
    
    // Ricalcola anomalie
    const nuoveAnomalie = calculateAnomalie(voci.map(v => ({ ...v, anomalie: v.anomalie || [] })), fattura.medicoId);
    const stato = nuoveAnomalie.length > 0 ? 'anomalia' : 'da_importare';
    
    // Ricalcola totali
    const totaleNetto = calculateTotaleImponibile(voci.map(v => ({ imponibile: v.importoNetto })));
    
    return { ...fattura, voci, imponibile: totaleNetto, totale: totaleNetto * 1.22, anomalie: nuoveAnomalie, stato: stato as any };
  }

  /**
   * Associa una prestazione a una voce
   */
  static associaPrestazione(fattura: FatturaConVoci, voceId: number, codicePrestazione: string): FatturaConVoci {
    if (!fattura.voci) return fattura;
    
    const voci = fattura.voci.map(v => {
      if (v.id === voceId) {
        const anomalieFiltrate = v.anomalie ? v.anomalie.filter(a => a !== 'prodotto_orfano') : [];
        return { 
          ...v, 
          prestazioneAssociata: codicePrestazione,
          anomalie: anomalieFiltrate 
        };
      }
      return v;
    });
    
    // Ricalcola anomalie
    const nuoveAnomalie = calculateAnomalie(voci.map(v => ({ ...v, anomalie: v.anomalie || [] })), fattura.medicoId);
    const stato = nuoveAnomalie.length > 0 ? 'anomalia' : 'da_importare';
    
    return { ...fattura, voci, anomalie: nuoveAnomalie, stato: stato as any };
  }

  /**
   * Corregge l'unità di misura
   */
  static correggiUnita(fattura: FatturaConVoci, voceId: number, unitaCorretta: string): FatturaConVoci {
    if (!fattura.voci) return fattura;
    
    const voci = fattura.voci.map(v => {
      if (v.id === voceId) {
        const anomalieFiltrate = v.anomalie ? v.anomalie.filter(a => a !== 'unita_non_valida') : [];
        return { ...v, unita: unitaCorretta, anomalie: anomalieFiltrate };
      }
      return v;
    });
    
    // Ricalcola anomalie
    const nuoveAnomalie = calculateAnomalie(voci.map(v => ({ ...v, anomalie: v.anomalie || [] })), fattura.medicoId);
    const stato = nuoveAnomalie.length > 0 ? 'anomalia' : 'da_importare';
    
    return { ...fattura, voci, anomalie: nuoveAnomalie, stato: stato as any };
  }

  /**
   * Corregge la quantità
   */
  static correggiQuantita(fattura: FatturaConVoci, voceId: number, nuovaQuantita: number): FatturaConVoci {
    if (!fattura.voci) return fattura;
    
    const voci = fattura.voci.map(v => {
      if (v.id === voceId) {
        const anomalieFiltrate = v.anomalie ? v.anomalie.filter(a => a !== 'quantita_zero') : [];
        const prezzoUnitario = v.importoNetto / (v.quantita || 1);
        const nuovoImporto = prezzoUnitario * nuovaQuantita;
        return { 
          ...v, 
          quantita: nuovaQuantita,
          importoNetto: nuovoImporto,
          importoLordo: nuovoImporto * 1.22,
          anomalie: anomalieFiltrate 
        };
      }
      return v;
    });
    
    // Ricalcola anomalie
    const nuoveAnomalie = calculateAnomalie(voci.map(v => ({ ...v, anomalie: v.anomalie || [] })), fattura.medicoId);
    const stato = nuoveAnomalie.length > 0 ? 'anomalia' : 'da_importare';
    
    // Ricalcola totali
    const totaleNetto = calculateTotaleImponibile(voci.map(v => ({ imponibile: v.importoNetto })));
    
    return { ...fattura, voci, imponibile: totaleNetto, totale: totaleNetto * 1.22, anomalie: nuoveAnomalie, stato: stato as any };
  }

  /**
   * Corregge il codice di una voce
   */
  static correggiCodice(
    fattura: FatturaConVoci, 
    voceId: number, 
    nuovoCodice: string, 
    nuovoPrezzo?: number, 
    nuovaQuantita?: number
  ): FatturaConVoci {
    if (!fattura.voci) return fattura;
    
    const voci = fattura.voci.map(v => {
      if (v.id === voceId) {
        const updates: any = { 
          codice: nuovoCodice,
          anomalie: [] // Reset anomalie dopo correzione codice
        };
        
        if (nuovoPrezzo !== undefined) {
          updates.importoNetto = nuovoPrezzo;
          updates.importoLordo = nuovoPrezzo * 1.22;
        }
        
        if (nuovaQuantita !== undefined) {
          updates.quantita = nuovaQuantita;
          // Se cambia la quantità, ricalcola l'importo basato sul prezzo unitario
          if (nuovoPrezzo === undefined && v.quantita && v.quantita > 0) {
            const prezzoUnitario = v.importoNetto / v.quantita;
            updates.importoNetto = prezzoUnitario * nuovaQuantita;
            updates.importoLordo = updates.importoNetto * 1.22;
          }
        }
        
        return { ...v, ...updates };
      }
      return v;
    });
    
    // Ricalcola anomalie con il nuovo codice
    const nuoveAnomalie = calculateAnomalie(voci.map(v => ({ ...v, anomalie: v.anomalie || [] })), fattura.medicoId);
    const stato = nuoveAnomalie.length > 0 ? 'anomalia' : 'da_importare';
    
    // Ricalcola totali
    const totaleNetto = calculateTotaleImponibile(voci.map(v => ({ imponibile: v.importoNetto })));
    
    return { ...fattura, voci, imponibile: totaleNetto, totale: totaleNetto * 1.22, anomalie: nuoveAnomalie, stato: stato as any };
  }

  /**
   * Conferma che una prestazione è completa (rimuove l'anomalia prodotti_mancanti)
   */
  static confermaPrestazioneCompleta(fattura: FatturaConVoci, prestazione: string): FatturaConVoci {
    if (!fattura.voci) return fattura;
    
    const voci = fattura.voci.map(v => {
      if (v.codice === prestazione && v.anomalie) {
        const anomalieFiltrate = v.anomalie.filter(a => a !== 'prodotti_mancanti');
        return { ...v, anomalie: anomalieFiltrate };
      }
      return v;
    });
    
    // Ricalcola anomalie
    const nuoveAnomalie = calculateAnomalie(voci.map(v => ({ ...v, anomalie: v.anomalie || [] })), fattura.medicoId);
    const stato = nuoveAnomalie.length > 0 ? 'anomalia' : 'da_importare';
    
    return { ...fattura, voci, anomalie: nuoveAnomalie, stato: stato as any };
  }

  /**
   * Conferma che una prestazione con macchinario è completa
   */
  static confermaPrestazioneMacchinarioCompleta(fattura: FatturaConVoci, prestazione: string): FatturaConVoci {
    if (!fattura.voci) return fattura;
    
    const voci = fattura.voci.map(v => {
      if (v.codice === prestazione && v.anomalie) {
        const anomalieFiltrate = v.anomalie.filter(a => a !== 'macchinario_mancante');
        return { ...v, anomalie: anomalieFiltrate };
      }
      return v;
    });
    
    // Ricalcola anomalie
    const nuoveAnomalie = calculateAnomalie(voci.map(v => ({ ...v, anomalie: v.anomalie || [] })), fattura.medicoId);
    const stato = nuoveAnomalie.length > 0 ? 'anomalia' : 'da_importare';
    
    return { ...fattura, voci, anomalie: nuoveAnomalie, stato: stato as any };
  }
}