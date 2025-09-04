/**
 * Hook per la gestione dell'aggiunta di prodotti e macchinari mancanti
 * Wrappa il service ProdottiMacchinariService per l'uso nei componenti React
 */

import { useCallback } from 'react';
import { ProdottiMacchinariService } from '../services/prodottiMacchinariService';
import type { FatturaConVoci } from '../services';
import type { Prestazione, Prodotto, Macchinario } from '@/data/mock';

interface UseProdottiMacchinariReturn {
  // Handlers principali
  handleAggiungiProdotti: (
    fatture: FatturaConVoci[],
    fatturaId: number,
    prestazione: string,
    prodottiSelezionati: { codice: string; quantita: number }[]
  ) => FatturaConVoci[];
  
  handleAggiungiMacchinario: (
    fatture: FatturaConVoci[],
    fatturaId: number,
    prestazione: string,
    macchinarioCodice: string
  ) => FatturaConVoci[];
  
  // Utility functions
  prestazioneNecessitaProdotti: (fattura: FatturaConVoci, prestazione: string) => boolean;
  prestazioneNecessitaMacchinario: (fattura: FatturaConVoci, prestazione: string) => boolean;
  getProdottiValidiPerPrestazione: (prestazione: string) => Prodotto[];
  getMacchinariValidiPerPrestazione: (prestazione: string) => Macchinario[];
}

export function useProdottiMacchinari(
  prestazioniMap: Record<string, Prestazione>,
  prodottiMap: Record<string, Prodotto>,
  macchinari: Macchinario[]
): UseProdottiMacchinariReturn {
  
  /**
   * Handler per aggiungere prodotti mancanti a una prestazione
   */
  const handleAggiungiProdotti = useCallback((
    fatture: FatturaConVoci[],
    fatturaId: number,
    prestazione: string,
    prodottiSelezionati: { codice: string; quantita: number }[]
  ): FatturaConVoci[] => {
    return fatture.map(f => {
      if (f.id === fatturaId) {
        return ProdottiMacchinariService.aggiungiProdottiMancanti(
          f,
          prestazione,
          prodottiSelezionati,
          prestazioniMap,
          prodottiMap
        );
      }
      return f;
    });
  }, [prestazioniMap, prodottiMap]);
  
  /**
   * Handler per aggiungere un macchinario mancante a una prestazione
   */
  const handleAggiungiMacchinario = useCallback((
    fatture: FatturaConVoci[],
    fatturaId: number,
    prestazione: string,
    macchinarioCodice: string
  ): FatturaConVoci[] => {
    return fatture.map(f => {
      if (f.id === fatturaId) {
        return ProdottiMacchinariService.aggiungiMacchinarioMancante(
          f,
          prestazione,
          macchinarioCodice,
          prestazioniMap,
          prodottiMap,
          macchinari
        );
      }
      return f;
    });
  }, [prestazioniMap, prodottiMap, macchinari]);
  
  /**
   * Verifica se una prestazione necessita di prodotti
   */
  const prestazioneNecessitaProdotti = useCallback((
    fattura: FatturaConVoci,
    prestazione: string
  ): boolean => {
    return ProdottiMacchinariService.prestazioneNecessitaProdotti(fattura, prestazione);
  }, []);
  
  /**
   * Verifica se una prestazione necessita di macchinario
   */
  const prestazioneNecessitaMacchinario = useCallback((
    fattura: FatturaConVoci,
    prestazione: string
  ): boolean => {
    return ProdottiMacchinariService.prestazioneNecessitaMacchinario(fattura, prestazione);
  }, []);
  
  /**
   * Ottiene i prodotti validi per una prestazione
   */
  const getProdottiValidiPerPrestazione = useCallback((
    prestazione: string
  ): Prodotto[] => {
    return ProdottiMacchinariService.getProdottiValidiPerPrestazione(prestazione, prodottiMap);
  }, [prodottiMap]);
  
  /**
   * Ottiene i macchinari validi per una prestazione
   */
  const getMacchinariValidiPerPrestazione = useCallback((
    prestazione: string
  ): Macchinario[] => {
    return ProdottiMacchinariService.getMacchinariValidiPerPrestazione(prestazione, macchinari);
  }, [macchinari]);
  
  return {
    handleAggiungiProdotti,
    handleAggiungiMacchinario,
    prestazioneNecessitaProdotti,
    prestazioneNecessitaMacchinario,
    getProdottiValidiPerPrestazione,
    getMacchinariValidiPerPrestazione
  };
}