'use client';

import { medici as mediciData, mediciRegoleCosti } from '@/data/mock';
import GestioneMedici from '@/app/temp/artifacts/gestione-medici-v4';

export default function MediciPage() {
  return (
    <GestioneMedici 
      mediciIniziali={mediciData}
      regoleCosti={mediciRegoleCosti}
    />
  );
}