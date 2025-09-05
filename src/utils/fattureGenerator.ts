import { Fattura, VoceFattura } from '@/data/mock';
import { medici, pazienti } from '@/data/mock';
import { generateVociFattura, calculateAnomalie, generateNumeroFattura } from './fattureHelpers';
import { FattureStore } from '@/services/stores/fattureStore';

export interface FattureGeneratorConfig {
  numeroFatture: number;
  percentualeAnomalie?: number;
  rangeGiorni?: number;
  scenario?: 'normale' | 'test-anomalie' | 'mese-chiuso';
}

export class FattureGenerator {
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
        { tipo: 'normale', count: Math.floor(numeroFatture * 0.50) },
        { tipo: 'medico_mancante', count: Math.floor(numeroFatture * 0.10) },
        { tipo: 'prodotto_con_prezzo', count: Math.floor(numeroFatture * 0.05) },
        { tipo: 'prodotto_orfano', count: Math.floor(numeroFatture * 0.05) },
        { tipo: 'prestazione_incompleta', count: Math.floor(numeroFatture * 0.04) },
        { tipo: 'prestazione_senza_macchinario', count: Math.floor(numeroFatture * 0.05) },
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
    // 1. Genera data casuale
    const dataFattura = this.generateRandomDate(startDate, rangeGiorni);
    
    // 2. Seleziona paziente
    const pazienteNome = pazienti[Math.floor(Math.random() * pazienti.length)];
    
    // 3. Gestione medico
    const { medicoId, medicoNome } = this.generateMedico(scenarioTipo);
    
    // 4. Determina serie e IVA
    const { serie, conIva } = this.generateSerieAndIva();
    
    // 5. Genera voci fattura basate sullo scenario
    const voci = this.generateVociForScenario(scenarioTipo);
    
    // 6. Calcola importi
    const { imponibile, iva, totale } = this.calculateImporti(voci, conIva);
    
    // 7. Determina anomalie finali
    const anomalie = this.determineAnomalie(voci, medicoId, scenarioTipo);
    
    // 8. Determina stato
    const stato = anomalie.length > 0 ? 'anomalia' : 'da_importare';
    
    return {
      id,
      numero: '', // Assegnato successivamente
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
  }
  
  private static generateRandomDate(startDate: Date, rangeGiorni: number): Date {
    const randomDays = Math.floor(Math.random() * rangeGiorni);
    const date = new Date(startDate);
    date.setDate(date.getDate() + randomDays);
    return date;
  }
  
  private static generateMedico(scenarioTipo?: string): { medicoId: number | null; medicoNome: string | null } {
    if (scenarioTipo === 'medico_mancante') {
      return { medicoId: null, medicoNome: null };
    }
    
    const medico = medici[Math.floor(Math.random() * medici.length)];
    return {
      medicoId: medico.id,
      medicoNome: `${medico.nome} ${medico.cognome}`
    };
  }
  
  private static generateSerieAndIva(): { serie: string; conIva: boolean } {
    const random = Math.random();
    const serie = random < 0.6 ? 'P' : random < 0.9 ? 'IVA' : 'M';
    return { serie, conIva: serie === 'IVA' };
  }
  
  private static generateVociForScenario(scenarioTipo?: string): VoceFattura[] {
    if (!scenarioTipo || scenarioTipo === 'normale') {
      const numeroVoci = Math.floor(Math.random() * 3) + 1;
      return generateVociFattura(numeroVoci, false, 'normale');
    }
    
    return generateVociFattura(1, true, scenarioTipo);
  }
  
  private static calculateImporti(voci: VoceFattura[], conIva: boolean): { imponibile: number; iva: number; totale: number } {
    const imponibile = voci.reduce((sum, voce) => sum + voce.importoNetto, 0);
    const iva = conIva ? imponibile * 0.22 : 0;
    const totale = imponibile + iva;
    return { imponibile, iva, totale };
  }
  
  private static determineAnomalie(voci: VoceFattura[], medicoId: number | null, scenarioTipo?: string): string[] {
    if (scenarioTipo === 'normale') {
      return [];
    }
    
    // Per scenari specifici, ritorna SOLO l'anomalia richiesta
    // senza calcolare altre anomalie che potrebbero interferire
    if (scenarioTipo && scenarioTipo !== 'normale') {
      switch (scenarioTipo) {
        case 'medico_mancante':
          return ['medico_mancante'];
        case 'prodotto_con_prezzo':
          return ['prodotto_con_prezzo'];
        case 'prodotto_orfano':
          return ['prodotto_orfano'];
        case 'prestazione_incompleta':
          return ['prestazione_incompleta'];
        case 'prestazione_duplicata':
          return ['prestazione_duplicata'];
        case 'prestazione_senza_macchinario':
          return ['prestazione_senza_macchinario'];
        case 'codice_sconosciuto':
          return ['codice_sconosciuto'];
        case 'unita_incompatibile':
          return ['unita_incompatibile'];
        case 'quantita_anomala':
          return ['quantita_anomala'];
        default:
          return [scenarioTipo];
      }
    }
    
    // Solo per fatture senza scenario specifico, calcola anomalie
    return calculateAnomalie(voci, medicoId);
  }

  static generateTestAnomalie(): Fattura[] {
    const TOTALE_FATTURE = 200;
    const ANOMALIE_PER_TIPO = 8;
    const tipiAnomalie = [
      'medico_mancante',
      'prodotto_con_prezzo', 
      'prodotto_orfano',
      'prestazione_incompleta',
      'prestazione_senza_macchinario',
      'prestazione_duplicata',
      'codice_sconosciuto',
      'unita_incompatibile',
      'quantita_anomala'
    ];
    
    const fatture: Fattura[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    
    // 1. Genera esattamente 8 fatture per ogni tipo di anomalia (64 totali)
    tipiAnomalie.forEach(tipoAnomalia => {
      for (let i = 0; i < ANOMALIE_PER_TIPO; i++) {
        const fattura = this.generateFatturaConAnomalia(
          fatture.length + 1,
          startDate,
          tipoAnomalia
        );
        fatture.push(fattura);
      }
    });
    
    // 2. Genera le rimanenti fatture normali (136 fatture)
    const fattureNormaliDaGenerare = TOTALE_FATTURE - fatture.length;
    for (let i = 0; i < fattureNormaliDaGenerare; i++) {
      const fattura = this.generateFatturaNormale(
        fatture.length + 1,
        startDate
      );
      fatture.push(fattura);
    }
    
    // 3. Mescola casualmente per distribuzione naturale
    this.shuffleArray(fatture);
    
    // 4. Ordina per data e assegna numeri progressivi
    fatture.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
    
    const progressiviSerie = { 'P': 1000, 'IVA': 2000, 'M': 3000 };
    fatture.forEach((fattura, index) => {
      fattura.id = index + 1;
      const numeroProgressivo = progressiviSerie[fattura.serie as keyof typeof progressiviSerie]++;
      fattura.numero = generateNumeroFattura(numeroProgressivo, fattura.serie);
    });
    
    // 5. Riordina per data decrescente per visualizzazione
    fatture.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    
    // 6. Log di verifica
    this.logDistribuzioneAnomalie(fatture);
    
    this.fatture = fatture;
    return fatture;
  }
  
  private static generateFatturaConAnomalia(
    id: number,
    startDate: Date,
    tipoAnomalia: string
  ): Fattura {
    const fattura = this.generateSingleFattura(id, null, startDate, 90, tipoAnomalia);
    
    // Garantisci che l'anomalia sia presente
    if (!fattura.anomalie.includes(tipoAnomalia)) {
      fattura.anomalie = [tipoAnomalia];
      fattura.stato = 'anomalia';
    }
    
    return fattura;
  }
  
  private static generateFatturaNormale(
    id: number,
    startDate: Date
  ): Fattura {
    const fattura = this.generateSingleFattura(id, null, startDate, 90, 'normale');
    
    // Garantisci che non ci siano anomalie
    fattura.anomalie = [];
    fattura.stato = 'da_importare';
    
    return fattura;
  }
  
  private static shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  
  private static logDistribuzioneAnomalie(fatture: Fattura[]): void {
    const conteggio: Record<string, number> = {};
    let totaleConAnomalie = 0;
    
    fatture.forEach(f => {
      if (f.anomalie.length > 0) {
        totaleConAnomalie++;
        f.anomalie.forEach(a => {
          conteggio[a] = (conteggio[a] || 0) + 1;
        });
      }
    });
    
    console.log('=== GENERAZIONE FATTURE COMPLETATA ===');
    console.log(`Totale fatture: ${fatture.length}`);
    console.log(`Fatture con anomalie: ${totaleConAnomalie}`);
    console.log('Distribuzione anomalie:', conteggio);
  }

  /**
   * Salva le fatture disponibili nello store
   */
  static save(): void {
    FattureStore.saveFattureDisponibili(this.fatture);
  }

  /**
   * Carica fatture da localStorage se esistono, altrimenti genera nuove
   */
  static load(): Fattura[] {
    if (typeof window === 'undefined') return [];

    // Prima prova a caricare da localStorage
    const fattureEsistenti = FattureStore.getFattureDisponibili();
    
    if (fattureEsistenti.length > 0) {
      console.log('FattureGenerator.load() - Caricate', fattureEsistenti.length, 'fatture da localStorage');
      this.fatture = fattureEsistenti;
      return fattureEsistenti;
    }
    
    // Se non ci sono fatture salvate, genera nuove con test anomalie
    const newFatture = this.generateTestAnomalie();
    console.log('FattureGenerator.load() - Generate', newFatture.length, 'nuove fatture');
    
    // Salva automaticamente le nuove fatture generate
    this.fatture = newFatture;
    this.save();
    
    // Conta anomalie per debug
    const conteggioAnomalie: Record<string, number> = {};
    newFatture.forEach(f => {
      if (f.anomalie && f.anomalie.length > 0) {
        f.anomalie.forEach(a => {
          conteggioAnomalie[a] = (conteggioAnomalie[a] || 0) + 1;
        });
      }
    });
    
    console.log('Distribuzione anomalie:', conteggioAnomalie);
    
    return newFatture;
  }

  /**
   * Reset e rigenera fatture
   */
  static reset(): Fattura[] {
    // Reset store
    FattureStore.reset();
    
    // Genera nuove fatture
    const nuoveFatture = this.generateTestAnomalie();
    this.fatture = nuoveFatture;
    
    // Salva le nuove fatture generate
    this.save();
    
    console.log('FattureGenerator.reset() - Generate', nuoveFatture.length, 'nuove fatture');
    return nuoveFatture;
  }

  /**
   * Rimuove fatture importate dalle disponibili
   */
  static rimuoviFattureImportate(ids: number[]): void {
    // Rimuovi da array interno
    this.fatture = this.fatture.filter(f => !ids.includes(f.id));
    
    // Rimuovi dallo store
    FattureStore.rimuoviFattureDisponibili(ids);
    
    console.log('FattureGenerator.rimuoviFattureImportate() - Rimosse', ids.length, 'fatture');
  }

  static export(): string {
    return JSON.stringify(this.fatture, null, 2);
  }

  static getFatture(): Fattura[] {
    return this.fatture;
  }
}