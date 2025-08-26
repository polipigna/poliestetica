/**
 * Service per il processing delle fatture importate
 */

import { 
  cleanString, 
  excelToNumber, 
  excelToDate,
  formatDate 
} from '../utils';
import { 
  parseCodiceFattura,
  combinazioni,
  macchinari,
  type Prestazione,
  type Prodotto,
  type Macchinario
} from '@/data/mock';
import type { VoceFatturaEstesa, FatturaConVoci } from './anomalieCalculator';
import { AnomalieCalculator } from './anomalieCalculator';

export interface FieldMapping {
  numero?: string;
  data?: string;
  paziente?: string;
  codice?: string;
  serie?: string;
  quantita?: string;
  unita?: string;
  importo?: string;
  iva?: string;
}

export interface ProcessingOptions {
  dataFiltro?: string;
  prestazioniMap: Record<string, Prestazione>;
  prodottiMap: Record<string, Prodotto>;
}

export class FattureProcessor {
  
  /**
   * Processa i dati importati e crea le fatture
   */
  static processImportedData(
    fileData: any[],
    fieldMapping: FieldMapping,
    options: ProcessingOptions
  ): FatturaConVoci[] {
    
    // Validazione campi obbligatori
    if (!fieldMapping.numero || !fieldMapping.data) {
      throw new Error('Per favore mappa almeno i campi Numero Fattura e Data');
    }
    
    console.log('Dati da processare:', fileData.length, 'righe');
    console.log('Field mapping:', fieldMapping);
    console.log('Esempio prima riga:', fileData[0]);
    
    // Filtra per data se specificato
    let dataFiltered = [...fileData];
    if (options.dataFiltro) {
      const filterDate = new Date(options.dataFiltro);
      console.log('Filtro data attivo:', options.dataFiltro, 'filterDate:', filterDate);
      
      dataFiltered = fileData.filter(row => {
        const dataValue = row[fieldMapping.data!];
        const dataFattura = excelToDate(dataValue) || new Date();
        
        console.log('Confronto date:', dataValue, '->', dataFattura, '>', filterDate, dataFattura > filterDate);
        return dataFattura > filterDate;
      });
      
      console.log('Dopo filtro data:', dataFiltered.length, 'righe');
    }
    
    // Raggruppa le righe per numero fattura e serie
    const fattureRaggruppate = this.raggruppaRighePerFattura(dataFiltered, fieldMapping);
    
    console.log('Fatture raggruppate:', fattureRaggruppate.size, 'fatture da', dataFiltered.length, 'righe');
    
    // Converti i dati raggruppati nel formato fatture
    const nuoveFatture = this.convertiInFatture(
      fattureRaggruppate, 
      fieldMapping, 
      options.prestazioniMap, 
      options.prodottiMap
    );
    
    console.log('Fatture create:', nuoveFatture.length);
    console.log('Esempio prima fattura:', nuoveFatture[0]);
    
    return nuoveFatture;
  }
  
  /**
   * Raggruppa le righe Excel per numero fattura e serie
   */
  private static raggruppaRighePerFattura(
    dataFiltered: any[], 
    fieldMapping: FieldMapping
  ): Map<string, any[]> {
    const fattureRaggruppate: Map<string, any[]> = new Map();
    
    dataFiltered.forEach(row => {
      // Gestione serie: usa quella mappata o default 'P' (principale)
      let serie = this.determinaSerie(row[fieldMapping.serie!]);
      const numero = row[fieldMapping.numero!];
      const chiave = `${serie}_${numero}`;
      
      if (!fattureRaggruppate.has(chiave)) {
        fattureRaggruppate.set(chiave, []);
      }
      fattureRaggruppate.get(chiave)!.push(row);
    });
    
    return fattureRaggruppate;
  }
  
  /**
   * Determina la serie dalla cella Excel
   */
  private static determinaSerie(serieValue: any): string {
    let serie = serieValue || 'P';
    if (!serie || cleanString(serie) === '') serie = 'P';
    if (serie === 'P') serie = 'principale';
    return serie;
  }
  
  /**
   * Converte i dati raggruppati in fatture
   */
  private static convertiInFatture(
    fattureRaggruppate: Map<string, any[]>,
    fieldMapping: FieldMapping,
    prestazioniMap: Record<string, Prestazione>,
    prodottiMap: Record<string, Prodotto>
  ): FatturaConVoci[] {
    let fatturaIndex = 0;
    
    return Array.from(fattureRaggruppate.entries()).map(([chiave, righe]) => {
      const voci = this.creaVociFattura(
        righe, 
        fieldMapping, 
        prestazioniMap, 
        prodottiMap, 
        fatturaIndex
      );
      
      // Calcola totali
      const imponibileTotale = voci.reduce((sum, v) => sum + v.importoNetto, 0);
      const ivaTotale = this.calcolaIvaTotale(righe, fieldMapping);
      
      // Prendi i dati comuni dalla prima riga
      const primaRiga = righe[0];
      
      // Gestione serie dalla chiave
      const serie = chiave.split('_')[0];
      
      // Gestisce le date
      const { dataFormatted, dataEmissione } = this.processaDataFattura(
        primaRiga[fieldMapping.data!]
      );
      
      const fattura: FatturaConVoci = {
        id: Date.now() + fatturaIndex,
        numero: primaRiga[fieldMapping.numero!],
        data: dataFormatted,
        dataEmissione: dataEmissione,
        paziente: primaRiga[fieldMapping.paziente!] || '',
        clienteNome: primaRiga[fieldMapping.paziente!] || '',
        medicoId: null,
        medicoNome: null,
        imponibile: imponibileTotale,
        iva: ivaTotale,
        totale: imponibileTotale + ivaTotale,
        conIva: ivaTotale > 0,
        importata: false,
        stato: 'da_importare',
        serie: serie,
        voci,
        anomalie: []
      };
      
      // Calcola anomalie
      const fatturaConAnomalie = AnomalieCalculator.ricalcolaAnomalieFattura(
        fattura,
        prestazioniMap,
        prodottiMap
      );
      
      // Aggiorna stato se ci sono anomalie
      if (fatturaConAnomalie.anomalie && fatturaConAnomalie.anomalie.length > 0) {
        fatturaConAnomalie.stato = 'anomalia';
      }
      
      fatturaIndex++;
      return fatturaConAnomalie;
    });
  }
  
  /**
   * Crea le voci fattura dalle righe Excel
   */
  private static creaVociFattura(
    righe: any[],
    fieldMapping: FieldMapping,
    prestazioniMap: Record<string, Prestazione>,
    prodottiMap: Record<string, Prodotto>,
    fatturaIndex: number
  ): VoceFatturaEstesa[] {
    const voci: VoceFatturaEstesa[] = [];
    
    righe.forEach((row, voceIndex) => {
      // Se abbiamo mappato codice, crea una voce
      if (fieldMapping.codice && row[fieldMapping.codice]) {
        const codice = row[fieldMapping.codice];
        const importoNetto = excelToNumber(row[fieldMapping.importo!]);
        
        // Determina i dettagli della voce
        const dettagliVoce = this.determinaDettagliVoce(
          codice,
          prestazioniMap,
          prodottiMap
        );
        
        // Determina l'unità di misura
        let unita = row[fieldMapping.unita!] || '';
        if (!unita && prodottiMap[codice]) {
          unita = prodottiMap[codice].unita; // Default dal prodotto se vuoto
        } else if (!unita) {
          unita = 'pz'; // Default generico
        }
        
        voci.push({
          id: Date.now() + fatturaIndex * 1000 + voceIndex,
          codice: codice,
          descrizione: dettagliVoce.descrizione,
          quantita: excelToNumber(row[fieldMapping.quantita!]) || 1,
          unita: unita,
          importoNetto: importoNetto,
          importoLordo: importoNetto,
          tipo: dettagliVoce.tipo,
          prestazionePadre: dettagliVoce.prestazionePadre,
          anomalie: [] // Verranno calcolate dopo
        });
      }
    });
    
    return voci;
  }
  
  /**
   * Determina i dettagli di una voce dal codice
   */
  private static determinaDettagliVoce(
    codice: string,
    prestazioniMap: Record<string, Prestazione>,
    prodottiMap: Record<string, Prodotto>
  ): {
    descrizione: string;
    tipo: 'prestazione' | 'prodotto' | 'macchinario';
    prestazionePadre?: string;
  } {
    let descrizione = '';
    let tipo: 'prestazione' | 'prodotto' | 'macchinario' = 'prestazione';
    let prestazionePadre: string | undefined;
    
    const prestazione = prestazioniMap[codice];
    const prodotto = prodottiMap[codice];
    const combinazione = combinazioni.find(c => c.codice === codice);
    
    // Usa parseCodiceFattura per determinare se il codice è valido
    const parsed = parseCodiceFattura(codice);
    
    if (prestazione) {
      descrizione = prestazione.descrizione;
      tipo = 'prestazione';
    } else if (prodotto) {
      descrizione = prodotto.nome;
      tipo = 'prodotto';
      // Estrai la prestazione padre dal codice prodotto
      if (parsed.isProdotto && parsed.prestazione) {
        prestazionePadre = parsed.prestazione;
      }
    } else if (combinazione) {
      if (combinazione.tipo === 'prestazione+prodotto') {
        const prest = prestazioniMap[combinazione.prestazione];
        const prod = prodottiMap[combinazione.accessorio!];
        descrizione = `${prest?.descrizione || ''} - ${prod?.nome || ''}`;
        tipo = 'prodotto';
        prestazionePadre = combinazione.prestazione;
      } else if (combinazione.tipo === 'prestazione+macchinario') {
        const prest = prestazioniMap[combinazione.prestazione];
        const macc = macchinari.find(m => m.codice === combinazione.accessorio);
        descrizione = `${prest?.descrizione || ''} - ${macc?.nome || ''}`;
        tipo = 'macchinario';
        prestazionePadre = combinazione.prestazione;
      } else if (combinazione.tipo === 'prestazione') {
        // Combinazione di tipo prestazione
        tipo = 'prestazione';
        descrizione = prestazioniMap[combinazione.prestazione]?.descrizione || codice;
      }
    } else {
      // Codice sconosciuto
      descrizione = codice;
      // Se parseCodiceFattura dice che è un prodotto, mantieni quel tipo
      if (parsed.isProdotto) {
        tipo = 'prodotto';
        if (parsed.prestazione) {
          prestazionePadre = parsed.prestazione;
        }
      }
    }
    
    return { descrizione, tipo, prestazionePadre };
  }
  
  /**
   * Calcola il totale IVA dalle righe
   */
  private static calcolaIvaTotale(righe: any[], fieldMapping: FieldMapping): number {
    let ivaTotale = 0;
    
    righe.forEach(row => {
      if (fieldMapping.iva && row[fieldMapping.iva]) {
        ivaTotale += excelToNumber(row[fieldMapping.iva]);
      }
    });
    
    return ivaTotale;
  }
  
  /**
   * Processa la data della fattura
   */
  private static processaDataFattura(dataValue: any): {
    dataFormatted: string;
    dataEmissione: string;
  } {
    const dataDate = excelToDate(dataValue);
    
    if (dataDate) {
      return {
        dataFormatted: formatDate(dataDate),
        dataEmissione: dataDate.toISOString().split('T')[0]
      };
    } else {
      return {
        dataFormatted: '',
        dataEmissione: ''
      };
    }
  }
  
  /**
   * Raggruppa fatture per medico
   */
  static raggruppeFatturePerMedico(fatture: FatturaConVoci[]): Map<string, FatturaConVoci[]> {
    const fatturePerMedico = new Map<string, FatturaConVoci[]>();
    
    fatture.forEach(fattura => {
      const medico = fattura.medicoNome || 'Non assegnato';
      
      if (!fatturePerMedico.has(medico)) {
        fatturePerMedico.set(medico, []);
      }
      
      fatturePerMedico.get(medico)!.push(fattura);
    });
    
    return fatturePerMedico;
  }
  
  /**
   * Calcola statistiche per medico
   */
  static calcolaStatistichePerMedico(fatture: FatturaConVoci[]): Array<{
    medico: string;
    numeroFatture: number;
    totaleImponibile: number;
    totaleIva: number;
    totaleFattura: number;
  }> {
    const fatturePerMedico = this.raggruppeFatturePerMedico(fatture);
    const statistiche: any[] = [];
    
    fatturePerMedico.forEach((fattureMedico, medico) => {
      const stats = {
        medico,
        numeroFatture: fattureMedico.length,
        totaleImponibile: 0,
        totaleIva: 0,
        totaleFattura: 0
      };
      
      fattureMedico.forEach(f => {
        stats.totaleImponibile += f.imponibile || 0;
        stats.totaleIva += f.iva || 0;
        stats.totaleFattura += f.totale || 0;
      });
      
      statistiche.push(stats);
    });
    
    // Ordina per totale fattura decrescente
    return statistiche.sort((a, b) => b.totaleFattura - a.totaleFattura);
  }
}