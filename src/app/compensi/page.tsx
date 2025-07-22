'use client';

import { useFatture } from '@/hooks/useFatture';
import { medici } from '@/data/mock';
import CalcolaCompensi from '../temp/artifacts/calcola-compensi-poliestetica (1)';

export default function CompensiPage() {
  const { fatture, isLoading } = useFatture();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#03A6A6] mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento dati...</p>
        </div>
      </div>
    );
  }

  // Filtra solo fatture importate per il calcolo compensi
  const fattureImportate = fatture.filter(f => f.stato === 'importata');

  return (
    <CalcolaCompensi 
      fatture={fattureImportate}
      medici={medici}
    />
  );
}