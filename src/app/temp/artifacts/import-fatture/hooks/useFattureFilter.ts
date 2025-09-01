import { useState, useMemo, useEffect } from 'react';
import type { FatturaConVoci } from '../services/anomalieCalculator';

interface UseFattureFilterReturn {
  // Stati filtri
  filtroStato: string;
  filtroDataDa: string;
  filtroDataA: string;
  filtroAnomalia: string;
  filtroMedico: string;
  filtroSerie: string;
  
  // Risultati
  fattureFiltered: FatturaConVoci[];
  filtriAttivi: number;
  
  // Azioni
  setFiltroStato: (stato: string) => void;
  setFiltroDataDa: (data: string) => void;
  setFiltroDataA: (data: string) => void;
  setFiltroAnomalia: (anomalia: string) => void;
  setFiltroMedico: (medico: string) => void;
  setFiltroSerie: (serie: string) => void;
  resetFiltri: () => void;
}

export function useFattureFilter(
  fatture: FatturaConVoci[],
  getAnomalieFattura: (fattura: FatturaConVoci) => string[]
): UseFattureFilterReturn {
  const [filtroStato, setFiltroStato] = useState('tutti');
  const [filtroDataDa, setFiltroDataDa] = useState('');
  const [filtroDataA, setFiltroDataA] = useState('');
  const [filtroAnomalia, setFiltroAnomalia] = useState('tutte');
  const [filtroMedico, setFiltroMedico] = useState('tutti');
  const [filtroSerie, setFiltroSerie] = useState('tutte');

  // Conteggio filtri attivi
  const filtriAttivi = useMemo(() => {
    let count = 0;
    if (filtroStato !== 'tutti') count++;
    if (filtroAnomalia !== 'tutte') count++;
    if (filtroMedico !== 'tutti') count++;
    if (filtroSerie !== 'tutte') count++;
    if (filtroDataDa || filtroDataA) count++;
    return count;
  }, [filtroStato, filtroAnomalia, filtroMedico, filtroSerie, filtroDataDa, filtroDataA]);

  // Reset filtri
  const resetFiltri = () => {
    setFiltroStato('tutti');
    setFiltroAnomalia('tutte');
    setFiltroMedico('tutti');
    setFiltroSerie('tutte');
    setFiltroDataDa('');
    setFiltroDataA('');
  };

  // Filtri applicati
  const fattureFiltered = useMemo(() => {
    return fatture.filter(f => {
      // Filtro stato
      if (filtroStato !== 'tutti' && f.stato !== filtroStato) return false;
      
      // Filtro anomalia
      if (filtroAnomalia !== 'tutte') {
        const anomalieFattura = getAnomalieFattura(f);
        if (filtroAnomalia === 'senza_anomalie' && anomalieFattura.length > 0) return false;
        if (filtroAnomalia !== 'senza_anomalie' && !anomalieFattura.includes(filtroAnomalia)) return false;
      }
      
      // Filtro medico
      if (filtroMedico !== 'tutti') {
        if (filtroMedico === 'non_assegnato' && f.medicoId !== null && f.medicoId !== undefined) return false;
        if (filtroMedico !== 'non_assegnato' && String(f.medicoId) !== filtroMedico) return false;
      }
      
      // Filtro serie
      if (filtroSerie !== 'tutte' && f.serie !== filtroSerie) return false;
      
      // Filtro date
      if (filtroDataDa || filtroDataA) {
        const dataString = f.data || f.dataEmissione;
        if (!dataString) return true;
        
        const dataFattura = new Date(dataString);
        
        if (filtroDataDa) {
          const dataDa = new Date(filtroDataDa);
          if (dataFattura < dataDa) return false;
        }
        
        if (filtroDataA) {
          const dataA = new Date(filtroDataA);
          dataA.setHours(23, 59, 59, 999);
          if (dataFattura > dataA) return false;
        }
      }
      
      return true;
    });
  }, [fatture, filtroStato, filtroDataDa, filtroDataA, filtroAnomalia, filtroMedico, filtroSerie, getAnomalieFattura]);

  return {
    // Stati filtri
    filtroStato,
    filtroDataDa,
    filtroDataA,
    filtroAnomalia,
    filtroMedico,
    filtroSerie,
    
    // Risultati
    fattureFiltered,
    filtriAttivi,
    
    // Azioni
    setFiltroStato,
    setFiltroDataDa,
    setFiltroDataA,
    setFiltroAnomalia,
    setFiltroMedico,
    setFiltroSerie,
    resetFiltri
  };
}