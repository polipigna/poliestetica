'use client';

import { useState, useEffect, useCallback } from 'react';
import { Fattura } from '@/data/mock';
import { FattureGenerator, FattureGeneratorConfig } from '@/utils/fattureGenerator';

export function useFatture() {
  const [fatture, setFatture] = useState<Fattura[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carica fatture all'init
  useEffect(() => {
    console.log('useFatture useEffect - loading fatture...');
    const loadFatture = () => {
      try {
        // Genera sempre nuove fatture con test anomalie
        const loadedFatture = FattureGenerator.load();
        console.log('useFatture - loaded', loadedFatture.length, 'fatture');
        setFatture(loadedFatture);
      } catch (error) {
        console.error('Errore caricamento fatture:', error);
        // In caso di errore, genera fatture default
        const newFatture = FattureGenerator.generate({ numeroFatture: 200 });
        FattureGenerator.save();
        setFatture(newFatture);
      } finally {
        setIsLoading(false);
      }
    };

    loadFatture();
  }, []);

  // Rigenera fatture con config personalizzata
  const regenerate = useCallback((config: FattureGeneratorConfig | 'test-anomalie') => {
    console.log('regenerate called with:', config);
    setIsLoading(true);
    try {
      let newFatture: Fattura[];
      if (config === 'test-anomalie') {
        console.log('Generating test anomalie...');
        newFatture = FattureGenerator.generateTestAnomalie();
        console.log('Generated fatture:', newFatture.length);
        console.log('Fatture with anomalie:', newFatture.filter(f => f.anomalie.length > 0).length);
      } else {
        newFatture = FattureGenerator.generate(config);
      }
      // Non serve chiamare save() perché sia generateTestAnomalie che generate lo fanno già
      console.log('Saved to localStorage by generator');
      setFatture(newFatture);
      console.log('State updated with', newFatture.length, 'fatture');
      return true;
    } catch (error) {
      console.error('Errore rigenerazione fatture:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reset fatture (cancella e rigenera con anomalie)
  const reset = useCallback(() => {
    setIsLoading(true);
    try {
      // Cancella localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('poliestetica-fatture-mock');
      }
      // Genera sempre 200 fatture con test anomalie
      const newFatture = FattureGenerator.generateTestAnomalie();
      setFatture(newFatture);
      return true;
    } catch (error) {
      console.error('Errore reset fatture:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Export dati fatture
  const exportData = useCallback(() => {
    try {
      const json = FattureGenerator.export();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fatture-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('Errore export fatture:', error);
      return false;
    }
  }, []);

  // Aggiorna singola fattura
  const updateFattura = useCallback((id: number, updates: Partial<Fattura>) => {
    setFatture(prev => {
      const updated = prev.map(f => 
        f.id === id ? { ...f, ...updates } : f
      );
      // Salva in localStorage
      FattureGenerator['fatture'] = updated;
      FattureGenerator.save();
      return updated;
    });
  }, []);

  // Filtra fatture per stato
  const getFattureByStato = useCallback((stato: Fattura['stato']) => {
    return fatture.filter(f => f.stato === stato);
  }, [fatture]);

  // Conta fatture per stato
  const getConteggiStati = useCallback(() => {
    return fatture.reduce((acc, f) => {
      acc[f.stato] = (acc[f.stato] || 0) + 1;
      return acc;
    }, {} as Record<Fattura['stato'], number>);
  }, [fatture]);

  return {
    fatture,
    isLoading,
    regenerate,
    reset,
    exportData,
    updateFattura,
    getFattureByStato,
    getConteggiStati,
    totale: fatture.length,
    anomalie: fatture.filter(f => f.anomalie.length > 0).length
  };
}