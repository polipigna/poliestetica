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
  handleAggiungiPrestazioneMancante: (fatture: FatturaConVoci[], fatturaId: number, codicePrestazione: string) => FatturaConVoci[];
  handleAggiornaPrezzoEAssociaPrestazione: (
    fatture: FatturaConVoci[], 
    fatturaId: number, 
    voceId: number, 
    nuovoPrezzo: number, 
    codicePrestazione: string
  ) => FatturaConVoci[];
  handleAssociaPrestazione: (fatture: FatturaConVoci[], fatturaId: number, voceId: number, codicePrestazione: string) => FatturaConVoci[];
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
}

export function useVociManagement(): UseVociManagementReturn {
  const [quantitaTemp, setQuantitaTemp] = useState<{ [key: string]: number }>({});
  const [prezzoTempProdottoOrfano, setPrezzoTempProdottoOrfano] = useState<{ [key: string]: number }>({});

  const handleImpostaPrezzoZero = (fatture: FatturaConVoci[], fatturaId: number, voceId: number): FatturaConVoci[] => {
    return fatture.map(f => {
      if (f.id === fatturaId) {
        return VociProcessor.impostaPrezzoZero(f, voceId);
      }
      return f;
    });
  };

  const handleEliminaVoce = (fatture: FatturaConVoci[], fatturaId: number, voceId: number): FatturaConVoci[] => {
    return fatture.map(f => {
      if (f.id === fatturaId) {
        return VociProcessor.eliminaVoce(f, voceId);
      }
      return f;
    });
  };

  const handleAggiungiPrestazioneMancante = (fatture: FatturaConVoci[], fatturaId: number, codicePrestazione: string): FatturaConVoci[] => {
    return fatture.map(f => {
      if (f.id === fatturaId) {
        return VociProcessor.aggiungiPrestazioneMancante(f, codicePrestazione);
      }
      return f;
    });
  };

  const handleAggiornaPrezzoEAssociaPrestazione = (
    fatture: FatturaConVoci[], 
    fatturaId: number, 
    voceId: number, 
    nuovoPrezzo: number, 
    codicePrestazione: string
  ): FatturaConVoci[] => {
    return fatture.map(f => {
      if (f.id === fatturaId) {
        return VociProcessor.aggiornaPrezzoEAssociaPrestazione(f, voceId, nuovoPrezzo, codicePrestazione);
      }
      return f;
    });
  };

  const handleAssociaPrestazione = (fatture: FatturaConVoci[], fatturaId: number, voceId: number, codicePrestazione: string): FatturaConVoci[] => {
    return fatture.map(f => {
      if (f.id === fatturaId) {
        return VociProcessor.associaPrestazione(f, voceId, codicePrestazione);
      }
      return f;
    });
  };

  const handleCorreggiUnita = (fatture: FatturaConVoci[], fatturaId: number, voceId: number, unitaCorretta: string): FatturaConVoci[] => {
    return fatture.map(f => {
      if (f.id === fatturaId) {
        return VociProcessor.correggiUnita(f, voceId, unitaCorretta);
      }
      return f;
    });
  };

  const handleCorreggiQuantita = (fatture: FatturaConVoci[], fatturaId: number, voceId: number, nuovaQuantita: number): FatturaConVoci[] => {
    return fatture.map(f => {
      if (f.id === fatturaId) {
        return VociProcessor.correggiQuantita(f, voceId, nuovaQuantita);
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
        return VociProcessor.correggiCodice(f, voceId, nuovoCodice, nuovoPrezzo, nuovaQuantita);
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
    handleAggiungiPrestazioneMancante,
    handleAggiornaPrezzoEAssociaPrestazione,
    handleAssociaPrestazione,
    handleCorreggiUnita,
    handleCorreggiQuantita,
    handleCorreggiCodice
  };
}