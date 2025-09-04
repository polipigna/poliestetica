'use client';

import { medici as mediciData, mediciRegoleCosti } from '@/data/mock';
import GestioneMedici from '@/features/gestione-medici/GestioneMedici';

export default function MediciPage() {
  return (
    <GestioneMedici 
      mediciIniziali={mediciData}
      regoleCosti={mediciRegoleCosti}
    />
  );
}