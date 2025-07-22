import { Fattura, VoceFattura } from '@/data/mock';
import { medici, pazienti } from '@/data/mock';
import { generateVociFattura, calculateAnomalie, generateNumeroFattura } from './fattureHelpers';

export interface FattureGeneratorConfig {
  numeroFatture: number;
  percentualeAnomalie?: number;
  rangeGiorni?: number;
  scenario?: 'normale' | 'test-anomalie' | 'mese-chiuso';
}

export class FattureGenerator {
  private static STORAGE_KEY = 'poliestetica-fatture-mock';
  private static fatture: Fattura[] = [];

  static generate(config: FattureGeneratorConfig): Fattura[] {
    const {
      numeroFatture,
      percentualeAnomalie = 15,
      rangeGiorni = 90,
      scenario = 'normale'
    } = config;

    const newFatture: Fattura[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - rangeGiorni);

    // Contatore progressivo per numero fattura
    let numeroProgressivo = 1000;

    for (let i = 0; i < numeroFatture; i++) {
      // Data casuale negli ultimi N giorni
      const randomDays = Math.floor(Math.random() * rangeGiorni);
      const dataFattura = new Date(startDate);
      dataFattura.setDate(dataFattura.getDate() + randomDays);

      // Determina se questa fattura avrà anomalie
      const hasAnomalies = Math.random() * 100 < percentualeAnomalie || scenario === 'test-anomalie';
      
      // Seleziona paziente casuale
      const pazienteNome = pazienti[Math.floor(Math.random() * pazienti.length)];
      
      // Seleziona medico (15% senza medico se ha anomalie)
      let medicoId: number | null = null;
      let medicoNome: string | null = null;
      
      if (!hasAnomalies || Math.random() > 0.15) {
        const medico = medici[Math.floor(Math.random() * medici.length)];
        medicoId = medico.id;
        medicoNome = `${medico.nome} ${medico.cognome}`;
      }

      // Determina se con IVA (50/50)
      const conIva = Math.random() > 0.5;
      
      // Serie fattura (80% FT, 15% FI, 5% M)
      const serieRandom = Math.random();
      const serie = serieRandom < 0.8 ? 'FT' : serieRandom < 0.95 ? 'FI' : 'M';

      // Genera voci fattura (1-3 prestazioni)
      const numeroVoci = Math.floor(Math.random() * 3) + 1;
      const voci = generateVociFattura(numeroVoci, hasAnomalies, scenario);

      // Calcola totali
      const imponibile = voci.reduce((sum, voce) => sum + voce.importoNetto, 0);
      const iva = conIva ? imponibile * 0.22 : 0;
      const totale = imponibile + iva;

      // Calcola anomalie
      const anomalie = calculateAnomalie(voci, medicoId, scenario);

      // Determina stato
      let stato: Fattura['stato'] = 'da_importare';
      if (anomalie.length > 0) {
        stato = 'anomalia';
      } else if (scenario === 'mese-chiuso') {
        stato = 'importata';
      }

      const fattura: Fattura = {
        id: i + 1,
        numero: generateNumeroFattura(numeroProgressivo++, conIva),
        serie: serie as 'FT' | 'FI' | 'M',
        data: dataFattura.toISOString().split('T')[0],
        paziente: pazienteNome,
        medicoId,
        medicoNome,
        imponibile,
        iva,
        totale,
        conIva,
        stato,
        importata: stato === 'importata',
        anomalie,
        voci
      };

      newFatture.push(fattura);
    }

    // Ordina per data decrescente
    newFatture.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    this.fatture = newFatture;
    return newFatture;
  }

  static save(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.fatture));
    }
  }

  static load(): Fattura[] {
    if (typeof window === 'undefined') return [];

    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        this.fatture = JSON.parse(stored);
        return this.fatture;
      } catch (e) {
        console.error('Errore caricamento fatture:', e);
      }
    }

    // Se non ci sono fatture salvate, genera default
    return this.generate({ numeroFatture: 200 });
  }

  static reset(): Fattura[] {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
    return this.generate({ numeroFatture: 200 });
  }

  static export(): string {
    return JSON.stringify(this.fatture, null, 2);
  }

  static getFatture(): Fattura[] {
    return this.fatture;
  }
}