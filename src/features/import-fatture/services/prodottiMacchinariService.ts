/**
 * Service per la gestione dell'aggiunta di prodotti e macchinari mancanti
 * Gestisce la logica business per completare prestazioni incomplete
 */

import { AnomalieProcessor } from './anomalieProcessor';
import type { FatturaConVoci, VoceFatturaEstesa } from './anomalieCalculator';
import type { Prestazione, Prodotto, Macchinario } from '@/data/mock';

export class ProdottiMacchinariService {
  
  /**
   * Aggiunge prodotti mancanti a una prestazione incompleta
   * @param fattura La fattura da aggiornare
   * @param prestazione Il codice della prestazione a cui aggiungere i prodotti
   * @param prodottiSelezionati Array di prodotti con codice e quantità
   * @param prestazioniMap Mappa delle prestazioni disponibili
   * @param prodottiMap Mappa dei prodotti disponibili
   * @returns La fattura aggiornata con i nuovi prodotti e anomalie ricalcolate
   */
  static aggiungiProdottiMancanti(
    fattura: FatturaConVoci,
    prestazione: string,
    prodottiSelezionati: { codice: string; quantita: number }[],
    prestazioniMap: Record<string, Prestazione>,
    prodottiMap: Record<string, Prodotto>
  ): FatturaConVoci {
    if (!fattura.voci) return fattura;
    
    // Crea le nuove voci prodotto
    const nuoveVoci: VoceFatturaEstesa[] = prodottiSelezionati.map(ps => {
      const prodotto = prodottiMap[ps.codice];
      const prestazionePadre = prestazioniMap[prestazione];
      
      return {
        id: Date.now() + Math.random(),
        codice: `${prestazione}${ps.codice}`,
        descrizione: `${prestazionePadre?.descrizione || prestazione} - ${prodotto?.nome || ps.codice}`,
        tipo: 'prodotto',
        prestazionePadre: prestazione,
        importoNetto: 0,
        importoLordo: 0,
        quantita: ps.quantita,
        unita: prodotto?.unita || 'PZ',
        anomalie: []
      };
    });
    
    // Aggiungi le nuove voci alla fattura
    const vociAggiornate = [...fattura.voci, ...nuoveVoci];
    
    // Usa AnomalieProcessor per ricalcolare anomalie e totali
    return AnomalieProcessor.aggiornaFatturaCompleta(
      fattura, 
      vociAggiornate, 
      prestazioniMap, 
      prodottiMap
    );
  }
  
  /**
   * Aggiunge un macchinario mancante trasformando una prestazione in prestazione+macchinario
   * @param fattura La fattura da aggiornare
   * @param prestazione Il codice della prestazione che richiede macchinario
   * @param macchinarioCodice Il codice del macchinario da aggiungere
   * @param prestazioniMap Mappa delle prestazioni disponibili
   * @param prodottiMap Mappa dei prodotti disponibili
   * @param macchinari Array dei macchinari disponibili
   * @returns La fattura aggiornata con il macchinario e anomalie ricalcolate
   */
  static aggiungiMacchinarioMancante(
    fattura: FatturaConVoci,
    prestazione: string,
    macchinarioCodice: string,
    prestazioniMap: Record<string, Prestazione>,
    prodottiMap: Record<string, Prodotto>,
    macchinari: Macchinario[]
  ): FatturaConVoci {
    if (!fattura.voci) return fattura;
    
    // Trova il macchinario selezionato
    const macchinario = macchinari.find(m => m.codice === macchinarioCodice);
    if (!macchinario) return fattura;
    
    const prestazionePadre = prestazioniMap[prestazione];
    
    // Aggiorna la voce esistente della prestazione trasformandola in prestazione+macchinario
    const vociAggiornate = fattura.voci.map(v => {
      if (v.codice === prestazione && v.anomalie?.includes('prestazione_senza_macchinario')) {
        // Rimuovi l'anomalia e trasforma in prestazione+macchinario
        const voceSenzaAnomalie = AnomalieProcessor.rimuoviAnomalieVoce(v, 'prestazione_senza_macchinario');
        
        return {
          ...voceSenzaAnomalie,
          codice: `${prestazione}${macchinarioCodice}`,
          descrizione: `${prestazionePadre?.descrizione || prestazione} - ${macchinario.nome}`,
          tipo: 'macchinario' as const
        };
      }
      return v;
    });
    
    // Usa AnomalieProcessor per ricalcolare anomalie e totali
    return AnomalieProcessor.aggiornaFatturaCompleta(
      fattura, 
      vociAggiornate, 
      prestazioniMap, 
      prodottiMap
    );
  }
  
  /**
   * Verifica se una prestazione necessita di prodotti
   * @param fattura La fattura da verificare
   * @param prestazione Il codice della prestazione
   * @returns true se la prestazione necessita di prodotti e non li ha
   */
  static prestazioneNecessitaProdotti(
    fattura: FatturaConVoci,
    prestazione: string
  ): boolean {
    if (!fattura.voci) return false;
    
    // Verifica se c'è una voce con anomalia prestazione_incompleta per questa prestazione
    return fattura.voci.some(v => 
      v.codice === prestazione && 
      v.anomalie?.includes('prestazione_incompleta')
    );
  }
  
  /**
   * Verifica se una prestazione necessita di macchinario
   * @param fattura La fattura da verificare
   * @param prestazione Il codice della prestazione
   * @returns true se la prestazione necessita di macchinario e non lo ha
   */
  static prestazioneNecessitaMacchinario(
    fattura: FatturaConVoci,
    prestazione: string
  ): boolean {
    if (!fattura.voci) return false;
    
    // Verifica se c'è una voce con anomalia prestazione_senza_macchinario per questa prestazione
    return fattura.voci.some(v => 
      v.codice === prestazione && 
      v.anomalie?.includes('prestazione_senza_macchinario')
    );
  }
  
  /**
   * Ottiene i prodotti validi per una prestazione
   * @param prestazione Il codice della prestazione
   * @param prodottiMap Mappa dei prodotti disponibili
   * @returns Array di prodotti validi per la prestazione
   */
  static getProdottiValidiPerPrestazione(
    prestazione: string,
    prodottiMap: Record<string, Prodotto>
  ): Prodotto[] {
    // Qui potresti implementare logica per filtrare solo i prodotti compatibili
    // Per ora restituiamo tutti i prodotti
    return Object.values(prodottiMap);
  }
  
  /**
   * Ottiene i macchinari validi per una prestazione
   * @param prestazione Il codice della prestazione
   * @param macchinari Array dei macchinari disponibili
   * @returns Array di macchinari validi per la prestazione
   */
  static getMacchinariValidiPerPrestazione(
    prestazione: string,
    macchinari: Macchinario[]
  ): Macchinario[] {
    // Qui potresti implementare logica per filtrare solo i macchinari compatibili
    // Per ora restituiamo tutti i macchinari
    return macchinari;
  }
}