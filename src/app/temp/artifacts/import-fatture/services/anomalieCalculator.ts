/**
 * Service per il calcolo delle anomalie nelle fatture
 */

import type { 
  Fattura, 
  VoceFattura, 
  Prestazione, 
  Prodotto,
  Macchinario 
} from '@/data/mock';
import { 
  parseCodiceFattura, 
  combinazioni 
} from '@/data/mock';

export interface VoceFatturaEstesa extends VoceFattura {
  prestazionePadre?: string;
}

export interface FatturaConVoci extends Fattura {

  voci: VoceFatturaEstesa[];
  anomalie: string[];
  dataEmissione?: string;
  clienteNome?: string;
}

export type TipoAnomalia = 
  | 'medico_mancante'
  | 'prestazione_incompleta'
  | 'prestazione_senza_macchinario'
  | 'prestazione_duplicata'
  | 'prodotto_con_prezzo'
  | 'prodotto_orfano'
  | 'unita_incompatibile'
  | 'quantita_anomala'
  | 'codice_sconosciuto';

export interface AnomaliaDettaglio {
  tipo: TipoAnomalia;
  descrizione: string;
  severity: 'error' | 'warning' | 'info';
}

export class AnomalieCalculator {
  
  private static readonly DESCRIZIONI_ANOMALIE: Record<TipoAnomalia, AnomaliaDettaglio> = {
    medico_mancante: {
      tipo: 'medico_mancante',
      descrizione: 'Medico non assegnato alla fattura',
      severity: 'error'
    },
    prestazione_incompleta: {
      tipo: 'prestazione_incompleta',
      descrizione: 'Prestazione che richiede prodotti ma non li ha',
      severity: 'warning'
    },
    prestazione_senza_macchinario: {
      tipo: 'prestazione_senza_macchinario',
      descrizione: 'Prestazione che richiede macchinario ma non lo ha',
      severity: 'warning'
    },
    prestazione_duplicata: {
      tipo: 'prestazione_duplicata',
      descrizione: 'Prestazione presente più volte nella stessa fattura',
      severity: 'warning'
    },
    prodotto_con_prezzo: {
      tipo: 'prodotto_con_prezzo',
      descrizione: 'Prodotto con prezzo non zero',
      severity: 'warning'
    },
    prodotto_orfano: {
      tipo: 'prodotto_orfano',
      descrizione: 'Prodotto senza prestazione padre associata',
      severity: 'error'
    },
    unita_incompatibile: {
      tipo: 'unita_incompatibile',
      descrizione: 'Unità di misura non corrisponde al prodotto',
      severity: 'warning'
    },
    quantita_anomala: {
      tipo: 'quantita_anomala',
      descrizione: 'Quantità supera la soglia di anomalia',
      severity: 'warning'
    },
    codice_sconosciuto: {
      tipo: 'codice_sconosciuto',
      descrizione: 'Codice non riconosciuto nel sistema',
      severity: 'error'
    }
  };
  
  /**
   * Verifica le anomalie per una singola voce fattura
   */
  static verificaAnomalieVoce(
    voce: VoceFatturaEstesa,
    voci: VoceFatturaEstesa[],
    prestazioniMap: Record<string, Prestazione>,
    prodottiMap: Record<string, Prodotto>
  ): string[] {
    const anomalie: string[] = [];
    
    // Prima controlla se è una prestazione valida nel sistema
    const prestazione = prestazioniMap[voce.codice];
    if (prestazione) {
      // È una prestazione valida, verifica se richiede prodotti o macchinari
      if (prestazione.richiedeProdotti) {
        const prodottiTrovati = voci.filter(v => {
          const p = parseCodiceFattura(v.codice);
          return p.isProdotto && p.prestazione === voce.codice;
        });
        
        if (prodottiTrovati.length === 0) {
          anomalie.push('prestazione_incompleta');
        }
      }
      
      if (prestazione.richiedeMacchinario) {
        const macchinariTrovati = voci.filter(v => {
          return v.codice.startsWith(voce.codice) && v.codice !== voce.codice;
        });
        
        if (macchinariTrovati.length === 0) {
          anomalie.push('prestazione_senza_macchinario');
        }
      }
      
      // Controllo prestazione duplicata
      const duplicati = voci.filter(v => v.codice === voce.codice && v.id !== voce.id);
      if (duplicati.length > 0) {
        anomalie.push('prestazione_duplicata');
      }
      
      // Controllo unità di misura per prestazioni
      // Le prestazioni devono avere unità "prestazione"
      if (voce.unita && voce.unita !== 'prestazione') {
        anomalie.push('unita_incompatibile');
      }
      
      return anomalie;
    }
    
    // Se non è una prestazione valida, controlla se è un prodotto/macchinario valido
    const parsed = parseCodiceFattura(voce.codice);
    if (!parsed.valido) {
      return ['codice_sconosciuto'];
    }
    
    // Controlla se è una combinazione di tipo prestazione o prestazione+macchinario
    const combinazione = combinazioni.find(c => c.codice === voce.codice);
    if (combinazione && (combinazione.tipo === 'prestazione' || combinazione.tipo === 'prestazione+macchinario')) {
      // Controllo prestazione duplicata anche per combinazioni prestazione/macchinario
      const duplicati = voci.filter(v => v.codice === voce.codice && v.id !== voce.id);
      if (duplicati.length > 0) {
        anomalie.push('prestazione_duplicata');
      }
      
      // Controllo unità di misura per prestazioni
      // Le prestazioni devono avere unità "prestazione"
      if (voce.unita && voce.unita !== 'prestazione') {
        anomalie.push('unita_incompatibile');
      }
    }
    
    if (parsed.isProdotto) {
      // Controllo prodotto con prezzo (escludi macchinari che devono avere prezzo)
      if (voce.tipo === 'prodotto' && voce.importoNetto > 0) {
        anomalie.push('prodotto_con_prezzo');
      }
      
      // Controllo prodotto orfano
      // Verifica prima se ha una prestazionePadre associata manualmente
      if (!voce.prestazionePadre) {
        // Poi cerca la prestazione nel codice
        const prestazionePadre = voci.find(v => 
          v.codice === parsed.prestazione && parseCodiceFattura(v.codice).isPrestazione
        );
        if (!prestazionePadre) {
          anomalie.push('prodotto_orfano');
        }
      } else {
        // Se ha una prestazionePadre, verifica che esista tra le voci
        const prestazioneTrovata = voci.find(v => 
          v.codice === voce.prestazionePadre && v.tipo === 'prestazione'
        );
        if (!prestazioneTrovata) {
          anomalie.push('prodotto_orfano');
        }
      }
      
      // Controllo unità di misura
      if (parsed.accessorio) {
        const prodotto = prodottiMap[parsed.accessorio];
        if (prodotto && voce.unita !== prodotto.unita) {
          anomalie.push('unita_incompatibile');
        }
        
        // Controllo quantità anomala
        // Usa sogliaAnomalia dal prodotto se disponibile
        if (prodotto && prodotto.sogliaAnomalia && voce.quantita > prodotto.sogliaAnomalia) {
          anomalie.push('quantita_anomala');
        }
      }
    }

    return anomalie;
  }
  
  /**
   * Calcola le anomalie per una fattura completa
   */
  static getAnomalieFattura(fattura: FatturaConVoci): string[] {
    const anomalie: string[] = [];
    
    // Controllo medico mancante
    if (!fattura.medicoId) {
      anomalie.push('medico_mancante');
    }
    
    // Analizza voci
    if (fattura.voci.length > 0) {
      // Verifica prestazioni duplicate
      const codiciPrestazioni = fattura.voci
        .filter(v => v.tipo === 'prestazione')
        .map(v => v.codice);
      
      const hasDuplicati = codiciPrestazioni.some((codice, index) => 
        codiciPrestazioni.indexOf(codice) !== index
      );
      
      if (hasDuplicati) {
        anomalie.push('prestazione_duplicata');
      }
      
      // Raccogli le anomalie dalle voci
      fattura.voci.forEach((voce) => {
        const anomalieVoce = voce.anomalie || [];
        anomalie.push(...anomalieVoce);
      });
    }
    
    return [...new Set(anomalie)]; // Rimuovi duplicati
  }
  
  /**
   * Ricalcola le anomalie per una fattura e le sue voci
   */
  static ricalcolaAnomalieFattura(
    fattura: FatturaConVoci,
    prestazioniMap: Record<string, Prestazione>,
    prodottiMap: Record<string, Prodotto>
  ): FatturaConVoci {
    // Prima calcola le anomalie per ogni voce
    const vociConAnomalie = fattura.voci.map(voce => {
      const anomalieVoce = this.verificaAnomalieVoce(voce, fattura.voci, prestazioniMap, prodottiMap);
      return {
        ...voce,
        anomalie: anomalieVoce
      };
    });
    
    // Aggiorna fattura con le voci aggiornate
    const fatturaAggiornata = {
      ...fattura,
      voci: vociConAnomalie
    };
    
    // Calcola le anomalie a livello di fattura
    const anomalieFattura = this.getAnomalieFattura(fatturaAggiornata);
    
    return {
      ...fatturaAggiornata,
      anomalie: anomalieFattura
    };
  }
  
  /**
   * Conta le anomalie per tipo
   */
  static contaAnomaliePerTipo(anomalie: string[]): Record<string, number> {
    return anomalie.reduce((acc, anomalia) => {
      acc[anomalia] = (acc[anomalia] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
  
  /**
   * Ottiene la descrizione dettagliata di un'anomalia
   */
  static getDescrizioneAnomalia(tipo: string): AnomaliaDettaglio | undefined {
    return this.DESCRIZIONI_ANOMALIE[tipo as TipoAnomalia];
  }
  
  /**
   * Filtra anomalie per severity
   */
  static filtraAnomalieBySeverity(
    anomalie: string[], 
    severity: 'error' | 'warning' | 'info'
  ): string[] {
    return anomalie.filter(a => {
      const dettaglio = this.getDescrizioneAnomalia(a);
      return dettaglio?.severity === severity;
    });
  }
  
  /**
   * Verifica se una fattura ha anomalie critiche (error)
   */
  static hasAnomalieCritiche(fattura: FatturaConVoci): boolean {
    const anomalie = fattura.anomalie || [];
    return this.filtraAnomalieBySeverity(anomalie, 'error').length > 0;
  }
  
  /**
   * Determina l'unità di misura corretta per una voce
   */
  static getUnitaCorretta(
    voce: VoceFatturaEstesa,
    prestazioniMap: Record<string, Prestazione>,
    prodottiMap: Record<string, Prodotto>
  ): string | null {
    // Controlla se è una combinazione di tipo prestazione o prestazione+macchinario
    const combinazione = combinazioni.find(c => c.codice === voce.codice);
    if (combinazione && (combinazione.tipo === 'prestazione' || combinazione.tipo === 'prestazione+macchinario')) {
      return 'prestazione';
    }
    
    // Controlla se è nel prestazioniMap (prestazione pura)
    if (prestazioniMap[voce.codice]) {
      return 'prestazione';
    }
    
    // Controlla se è un prodotto
    const parsed = parseCodiceFattura(voce.codice);
    if (parsed.accessorio && prodottiMap[parsed.accessorio]) {
      return prodottiMap[parsed.accessorio].unita;
    }
    
    return null;
  }

  /**
   * Verifica se l'unità di misura di una voce è correggibile
   */
  static isUnitaCorregibile(
    voce: VoceFatturaEstesa,
    prestazioniMap: Record<string, Prestazione>,
    prodottiMap: Record<string, Prodotto>
  ): boolean {
    return this.getUnitaCorretta(voce, prestazioniMap, prodottiMap) !== null;
  }

  /**
   * Calcola statistiche anomalie per un set di fatture
   */
  static calcolaStatisticheAnomalie(fatture: FatturaConVoci[]): {
    totaleAnomalie: number;
    fattureConAnomalie: number;
    anomaliePerTipo: Record<string, number>;
    anomalieCritiche: number;
    anomalieWarning: number;
  } {
    let totaleAnomalie = 0;
    let fattureConAnomalie = 0;
    const anomaliePerTipo: Record<string, number> = {};
    let anomalieCritiche = 0;
    let anomalieWarning = 0;
    
    fatture.forEach(fattura => {
      const anomalie = fattura.anomalie || [];
      if (anomalie.length > 0) {
        fattureConAnomalie++;
        totaleAnomalie += anomalie.length;
        
        anomalie.forEach(anomalia => {
          anomaliePerTipo[anomalia] = (anomaliePerTipo[anomalia] || 0) + 1;
          
          const dettaglio = this.getDescrizioneAnomalia(anomalia);
          if (dettaglio?.severity === 'error') anomalieCritiche++;
          if (dettaglio?.severity === 'warning') anomalieWarning++;
        });
      }
    });
    
    return {
      totaleAnomalie,
      fattureConAnomalie,
      anomaliePerTipo,
      anomalieCritiche,
      anomalieWarning
    };
  }
}