import { useState, useMemo } from 'react';
import type { FatturaConVoci } from '../services';

interface UseVistaRaggruppataReturn {
  vistaRaggruppata: boolean;
  setVistaRaggruppata: (value: boolean) => void;
  toggleVistaRaggruppata: () => void;
  fattureRaggruppatePerMedico: Map<string, FatturaConVoci[]>;
  medicoKeys: string[];
}

export function useVistaRaggruppata(fattureFiltered: FatturaConVoci[]): UseVistaRaggruppataReturn {
  const [vistaRaggruppata, setVistaRaggruppata] = useState(false);

  const toggleVistaRaggruppata = () => {
    setVistaRaggruppata(!vistaRaggruppata);
  };

  // Raggruppa le fatture per medico
  const fattureRaggruppatePerMedico = useMemo(() => {
    const grouped = new Map<string, FatturaConVoci[]>();
    
    fattureFiltered.forEach(fattura => {
      const medicoKey = fattura.medicoNome || 'Non assegnato';
      
      if (!grouped.has(medicoKey)) {
        grouped.set(medicoKey, []);
      }
      
      grouped.get(medicoKey)!.push(fattura);
    });
    
    return grouped;
  }, [fattureFiltered]); // Dipende solo da fattureFiltered

  // Ottieni le chiavi ordinate (Non assegnato per ultimo)
  const medicoKeys = useMemo(() => {
    const keys = Array.from(fattureRaggruppatePerMedico.keys());
    
    // Ordina le chiavi mettendo "Non assegnato" per ultimo
    return keys.sort((a, b) => {
      if (a === 'Non assegnato') return 1;
      if (b === 'Non assegnato') return -1;
      return a.localeCompare(b);
    });
  }, [fattureRaggruppatePerMedico]);

  return {
    vistaRaggruppata,
    setVistaRaggruppata,
    toggleVistaRaggruppata,
    fattureRaggruppatePerMedico,
    medicoKeys
  };
}