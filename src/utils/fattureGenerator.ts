import { Fattura } from '@/data/mock';
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

    // Prima genera tutte le fatture senza numero progressivo
    if (scenario === 'test-anomalie') {
      const anomalieScenari = [
        { tipo: 'normale', count: Math.floor(numeroFatture * 0.55) },
        { tipo: 'medico_mancante', count: Math.floor(numeroFatture * 0.10) },
        { tipo: 'prodotto_con_prezzo', count: Math.floor(numeroFatture * 0.05) },
        { tipo: 'prodotto_orfano', count: Math.floor(numeroFatture * 0.05) },
        { tipo: 'prestazione_incompleta', count: Math.floor(numeroFatture * 0.05) },
        { tipo: 'prestazione_duplicata', count: Math.floor(numeroFatture * 0.03) },
        { tipo: 'codice_sconosciuto', count: Math.floor(numeroFatture * 0.03) },
        { tipo: 'unita_incompatibile', count: Math.floor(numeroFatture * 0.04) },
        { tipo: 'quantita_anomala', count: Math.max(5, Math.floor(numeroFatture * 0.10)) }
      ];
      
      let i = 0;
      for (const scenarioAnomalia of anomalieScenari) {
        for (let j = 0; j < scenarioAnomalia.count && i < numeroFatture; j++, i++) {
          const fattura = this.generateSingleFattura(i + 1, null, startDate, rangeGiorni, scenarioAnomalia.tipo);
          newFatture.push(fattura);
        }
      }
      
      // Completa con fatture normali se mancano
      while (newFatture.length < numeroFatture) {
        const fattura = this.generateSingleFattura(newFatture.length + 1, null, startDate, rangeGiorni, 'normale');
        newFatture.push(fattura);
      }
    } else {
      // Generazione normale
      for (let i = 0; i < numeroFatture; i++) {
        const hasAnomalies = Math.random() * 100 < percentualeAnomalie;
        const scenarioTipo = hasAnomalies ? undefined : 'normale';
        const fattura = this.generateSingleFattura(i + 1, null, startDate, rangeGiorni, scenarioTipo);
        newFatture.push(fattura);
      }
    }

    // Ordina per data crescente (dalla più vecchia alla più recente)
    newFatture.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

    // Contatori progressivi separati per serie
    const progressiviSerie = {
      'P': 1000,
      'IVA': 2000,
      'M': 3000
    };

    // Assegna i numeri progressivi in ordine cronologico
    newFatture.forEach(fattura => {
      const numeroProgressivo = progressiviSerie[fattura.serie as keyof typeof progressiviSerie]++;
      fattura.numero = generateNumeroFattura(numeroProgressivo, fattura.serie);
    });

    // Riordina per data decrescente per la visualizzazione
    newFatture.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    this.fatture = newFatture;
    return newFatture;
  }

  private static generateSingleFattura(
    id: number,
    progressiviSerie: { [key: string]: number } | null,
    startDate: Date,
    rangeGiorni: number,
    scenarioTipo?: string
  ): Fattura {
    // Data casuale negli ultimi N giorni
    const randomDays = Math.floor(Math.random() * rangeGiorni);
    const dataFattura = new Date(startDate);
    dataFattura.setDate(dataFattura.getDate() + randomDays);

    // Seleziona paziente casuale
    const pazienteNome = pazienti[Math.floor(Math.random() * pazienti.length)];
    
    // Seleziona medico (null per scenario medico_mancante)
    let medicoId: number | null = null;
    let medicoNome: string | null = null;
    
    if (scenarioTipo !== 'medico_mancante') {
      const medico = medici[Math.floor(Math.random() * medici.length)];
      medicoId = medico.id;
      medicoNome = `${medico.nome} ${medico.cognome}`;
    }

    // Serie fattura (60% P, 30% IVA, 10% M)
    const serieRandom = Math.random();
    const serie = serieRandom < 0.6 ? 'P' : serieRandom < 0.9 ? 'IVA' : 'M';
    
    // Determina se con IVA in base alla serie
    const conIva = serie === 'IVA';

    // Genera voci fattura
    const numeroVoci = scenarioTipo ? 1 : Math.floor(Math.random() * 3) + 1;
    const hasAnomalies = !!(scenarioTipo && scenarioTipo !== 'normale');
    const voci = generateVociFattura(numeroVoci, hasAnomalies, scenarioTipo);

    // Calcola totali
    const imponibile = voci.reduce((sum, voce) => sum + voce.importoNetto, 0);
    const iva = conIva ? imponibile * 0.22 : 0;
    const totale = conIva ? imponibile + iva : imponibile; // Per P e M, totale = imponibile

    // Calcola anomalie
    const anomalie = calculateAnomalie(voci, medicoId, scenarioTipo);

    // Determina stato
    let stato: Fattura['stato'] = 'da_importare';
    if (anomalie.length > 0) {
      stato = 'anomalia';
    }

    // Il numero verrà assegnato dopo l'ordinamento
    const numero = progressiviSerie ? generateNumeroFattura(progressiviSerie[serie]++, serie) : '';
    
    const fattura: Fattura = {
      id,
      numero,
      serie,
      data: dataFattura.toISOString().split('T')[0],
      paziente: pazienteNome,
      medicoId,
      medicoNome,
      imponibile,
      iva,
      totale,
      conIva,
      stato,
      importata: false,
      anomalie,
      voci
    };

    return fattura;
  }

  static generateTestAnomalie(): Fattura[] {
    const fatture: Fattura[] = [];
    const tipiAnomalie = [
      'medico_mancante',
      'prodotto_con_prezzo', 
      'prodotto_orfano',
      'prestazione_incompleta',
      'prestazione_duplicata',
      'codice_sconosciuto',
      'unita_incompatibile',
      'quantita_anomala'
    ];
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    
    // Genera 7 fatture per ogni tipo di anomalia (56 totali)
    for (const tipoAnomalia of tipiAnomalie) {
      for (let i = 0; i < 7; i++) {
        const fattura = this.generateSingleFattura(
          fatture.length + 1,
          null,
          startDate,
          90,
          tipoAnomalia
        );
        fatture.push(fattura);
      }
    }
    
    // Genera 144 fatture normali
    for (let i = 0; i < 144; i++) {
      const fattura = this.generateSingleFattura(
        fatture.length + 1,
        null,
        startDate,
        90,
        'normale'
      );
      fatture.push(fattura);
    }
    
    // Mescola casualmente
    for (let i = fatture.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [fatture[i], fatture[j]] = [fatture[j], fatture[i]];
    }
    
    // Ordina per data crescente (dalla più vecchia alla più recente)
    fatture.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    
    // Contatori progressivi separati per serie
    const progressiviSerie = {
      'P': 1000,
      'IVA': 2000,
      'M': 3000
    };
    
    // Assegna i numeri progressivi in ordine cronologico
    fatture.forEach((fattura, i) => {
      fattura.id = i + 1;
      const numeroProgressivo = progressiviSerie[fattura.serie as keyof typeof progressiviSerie]++;
      fattura.numero = generateNumeroFattura(numeroProgressivo, fattura.serie);
    });
    
    // Riordina per data decrescente per la visualizzazione
    fatture.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    
    this.fatture = fatture;
    this.save();
    return fatture;
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