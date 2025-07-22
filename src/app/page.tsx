'use client';

import { useState, useEffect } from 'react';
import { useFatture } from '@/hooks/useFatture';
import { medici } from '@/data/mock';
import Dashboard from './temp/artifacts/dashboard-interactive';

export default function HomePage() {
  const { fatture, isLoading, getConteggiStati } = useFatture();
  const [dashboardData, setDashboardData] = useState({
    totaleFatture: 0,
    fattureImportate: 0,
    fattureDaImportare: 0,
    fattureConAnomalie: 0,
    mediciAttivi: 0,
    compensiMese: 0
  });

  useEffect(() => {
    if (!isLoading && fatture) {
      const conteggi = getConteggiStati();
      
      // Calcola compensi del mese per fatture importate
      const compensiTotali = fatture
        .filter(f => f.stato === 'importata')
        .reduce((acc, f) => {
          // Per ora usiamo un calcolo semplificato del 50% sull'imponibile
          // In un sistema reale, questo verrebbe calcolato in base alle regole del medico
          if (f.medicoId && f.imponibile) {
            return acc + (f.imponibile * 0.5);
          }
          return acc;
        }, 0);

      setDashboardData({
        totaleFatture: fatture.length,
        fattureImportate: conteggi.importata,
        fattureDaImportare: conteggi.da_importare,
        fattureConAnomalie: conteggi.anomalia,
        mediciAttivi: medici.length,
        compensiMese: compensiTotali
      });
    }
  }, [fatture, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#03A6A6] mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}