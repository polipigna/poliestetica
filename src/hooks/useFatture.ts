'use client';

import { useState, useEffect, useCallback } from 'react';
import { Fattura } from '@/data/mock';
import { FattureGenerator, FattureGeneratorConfig } from '@/utils/fattureGenerator';

export function useFatture() {
  const [fatture, setFatture] = useState<Fattura[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carica fatture all'init
  useEffect(() => {
    const loadFatture = () => {
      try {
        const loadedFatture = FattureGenerator.load();
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
    setIsLoading(true);
    try {
      let newFatture: Fattura[];
      if (config === 'test-anomalie') {
        newFatture = FattureGenerator.generateTestAnomalie();
      } else {
        newFatture = FattureGenerator.generate(config);
        FattureGenerator.save();
      }
      setFatture(newFatture);
      return true;
    } catch (error) {
      console.error('Errore rigenerazione fatture:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reset fatture (cancella e rigenera default)
  const reset = useCallback(() => {
    setIsLoading(true);
    try {
      const newFatture = FattureGenerator.reset();
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