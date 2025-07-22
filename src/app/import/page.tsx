'use client';

import { useFatture } from '@/hooks/useFatture';
import { medici, prestazioni, prodotti } from '@/data/mock';
import ImportFatture from '../temp/artifacts/import-fatture-poliestetica';

export default function ImportPage() {
  const { 
    fatture, 
    isLoading,
    updateFattura,
    getConteggiStati
  } = useFatture();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#03A6A6] mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento fatture...</p>
        </div>
      </div>
    );
  }

  const conteggi = getConteggiStati();

  // Handler per sync
  const handleSync = () => {
    console.log('Sincronizzazione con Fatture in Cloud...');
    // In produzione, qui chiameresti l'API per sincronizzare
  };

  // Handler per import
  const handleImport = (ids: number[]) => {
    console.log('Importazione fatture:', ids);
    // In produzione, qui aggiorneresti lo stato delle fatture
    ids.forEach(id => {
      updateFattura(id, { stato: 'importata' });
    });
  };

  return (
    <ImportFatture 
      fatture={fatture}
      medici={medici}
      prestazioni={prestazioni}
      prodotti={prodotti}
      isLoading={isLoading}
      onUpdateFattura={updateFattura}
      conteggiStati={conteggi}
      onSync={handleSync}
      onImport={handleImport}
    />
  );
}