import { useState } from 'react';
import { VociProcessor } from '../services';
import type { FatturaConVoci, VoceFatturaEstesa } from '../services';

interface UseVociManagementReturn {
  // Stati temporanei
  quantitaTemp: { [key: string]: number };
  prezzoTempProdottoOrfano: { [key: string]: number };
  
  // Setters
  setQuantitaTemp: (quantita: { [key: string]: number }) => void;
  setPrezzoTempProdottoOrfano: (prezzi: { [key: string]: number }) => void;
  
  // Handlers per modifiche voci
  handleImpostaPrezzoZero: (fatture: FatturaConVoci[], fatturaId: number, voceId: number) => FatturaConVoci[];
  handleEliminaVoce: (fatture: FatturaConVoci[], fatturaId: number, voceId: number) => FatturaConVoci[];
  handleAssociaPrestazione: (fatture: FatturaConVoci[], fatturaId: number, voceId: number, codicePrestazione: string, nuovoPrezzo?: number) => FatturaConVoci[];
  handleCorreggiUnita: (fatture: FatturaConVoci[], fatturaId: number, voceId: number, unitaCorretta: string) => FatturaConVoci[];
  handleCorreggiQuantita: (fatture: FatturaConVoci[], fatturaId: number, voceId: number, nuovaQuantita: number) => FatturaConVoci[];
  handleCorreggiCodice: (
    fatture: FatturaConVoci[], 
    fatturaId: number, 
    voceId: number, 
    nuovoCodice: string, 
    nuovoPrezzo?: number, 
    nuovaQuantita?: number
  ) => FatturaConVoci[];
  handleConfermaPrestazioneCompleta: (fatture: FatturaConVoci[], fatturaId: number, prestazione: string) => FatturaConVoci[];
  handleConfermaPrestazioneMacchinarioCompleta: (fatture: FatturaConVoci[], fatturaId: number, prestazione: string) => FatturaConVoci[];
}

export function useVociManagement(
  prestazioniMap: Record<string, any>,
  prodottiMap: Record<string, any>
): UseVociManagementReturn {
  const [quantitaTemp, setQuantitaTemp] = useState<{ [key: string]: number }>({});
  const [prezzoTempProdottoOrfano, setPrezzoTempProdottoOrfano] = useState<{ [key: string]: number }>({});

  const handleImpostaPrezzoZero = (fatture: FatturaConVoci[], fatturaId: number, voceId: number): FatturaConVoci[] => {
    return fatture.map(f => {
      if (f.id === fatturaId) {
        return VociProcessor.impostaPrezzoZero(f, voceId, prestazioniMap, prodottiMap);
      }
      return f;
    });
  };

  const handleEliminaVoce = (fatture: FatturaConVoci[], fatturaId: number, voceId: number): FatturaConVoci[] => {
    return fatture.map(f => {
      if (f.id === fatturaId) {
        return VociProcessor.eliminaVoce(f, voceId, prestazioniMap, prodottiMap);
      }
      return f;
    });
  };

  const handleAssociaPrestazione = (fatture: FatturaConVoci[], fatturaId: number, voceId: number, codicePrestazione: string, nuovoPrezzo?: number): FatturaConVoci[] => {
    return fatture.map(f => {
      if (f.id === fatturaId) {
        return VociProcessor.associaPrestazione(f, voceId, codicePrestazione, prestazioniMap, prodottiMap, nuovoPrezzo);
      }
      return f;
    });
  };

  const handleCorreggiUnita = (fatture: FatturaConVoci[], fatturaId: number, voceId: number, unitaCorretta: string): FatturaConVoci[] => {
    return fatture.map(f => {
      if (f.id === fatturaId) {
        return VociProcessor.correggiUnita(f, voceId, unitaCorretta, prestazioniMap, prodottiMap);
      }
      return f;
    });
  };

  const handleCorreggiQuantita = (fatture: FatturaConVoci[], fatturaId: number, voceId: number, nuovaQuantita: number): FatturaConVoci[] => {
    return fatture.map(f => {
      if (f.id === fatturaId) {
        return VociProcessor.correggiQuantita(f, voceId, nuovaQuantita, prestazioniMap, prodottiMap);
      }
      return f;
    });
  };

  const handleCorreggiCodice = (
    fatture: FatturaConVoci[], 
    fatturaId: number, 
    voceId: number, 
    nuovoCodice: string, 
    nuovoPrezzo?: number, 
    nuovaQuantita?: number
  ): FatturaConVoci[] => {
    return fatture.map(f => {
      if (f.id === fatturaId) {
        return VociProcessor.correggiCodice(f, voceId, nuovoCodice, nuovoPrezzo, nuovaQuantita, prestazioniMap, prodottiMap);
      }
      return f;
    });
  };

  const handleConfermaPrestazioneCompleta = (fatture: FatturaConVoci[], fatturaId: number, prestazione: string): FatturaConVoci[] => {
    return fatture.map(f => {
      if (f.id === fatturaId) {
        return VociProcessor.confermaPrestazioneCompleta(f, prestazione, prestazioniMap, prodottiMap);
      }
      return f;
    });
  };

  const handleConfermaPrestazioneMacchinarioCompleta = (fatture: FatturaConVoci[], fatturaId: number, prestazione: string): FatturaConVoci[] => {
    return fatture.map(f => {
      if (f.id === fatturaId) {
        return VociProcessor.confermaPrestazioneMacchinarioCompleta(f, prestazione, prestazioniMap, prodottiMap);
      }
      return f;
    });
  };

  return {
    // Stati temporanei
    quantitaTemp,
    prezzoTempProdottoOrfano,
    
    // Setters
    setQuantitaTemp,
    setPrezzoTempProdottoOrfano,
    
    // Handlers
    handleImpostaPrezzoZero,
    handleEliminaVoce,
    handleAssociaPrestazione,
    handleCorreggiUnita,
    handleCorreggiQuantita,
    handleCorreggiCodice,
    handleConfermaPrestazioneCompleta,
    handleConfermaPrestazioneMacchinarioCompleta
  };
}