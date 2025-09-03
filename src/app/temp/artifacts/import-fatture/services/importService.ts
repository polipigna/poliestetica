/**
 * Service per la gestione dell'import fatture
 * Gestisce validazione, import e generazione summary
 */

import { AnomalieProcessor } from './anomalieProcessor';
import type { FatturaConVoci } from './anomalieCalculator';

export interface ImportSummary {
  totale: number;
  importate: number;
  nuove: number;
  nonImportabili: number;
  importoTotale: number;
  idImportati: number[];
}

export interface ImportWarning {
  tipo: 'non_importabile' | 'anomalia_presente' | 'nessuna_selezione';
  count: number;
  message: string;
}

export interface ImportResult {
  fattureAggiornate: FatturaConVoci[];
  summary: ImportSummary;
  warnings: ImportWarning[];
}

export interface ImportOptions {
  verificaAnomalie?: boolean;
  simulazione?: boolean;
  delayMs?: number;
}

interface ValidationResult {
  totale: number;
  importabili: FatturaConVoci[];
  nonImportabili: FatturaConVoci[];
  idImportabili: number[];
}

export class ImportService {
  
  /**
   * Entry point principale per l'import delle fatture selezionate
   * Gestisce validazione, import e generazione summary
   */
  static async importaFattureSelezionate(
    tutteFatture: FatturaConVoci[],
    idSelezionati: number[],
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    
    // Validazione iniziale
    if (idSelezionati.length === 0) {
      return {
        fattureAggiornate: tutteFatture,
        summary: {
          totale: 0,
          importate: 0,
          nuove: 0,
          nonImportabili: 0,
          importoTotale: 0,
          idImportati: []
        },
        warnings: [{
          tipo: 'nessuna_selezione',
          count: 0,
          message: 'Nessuna fattura selezionata'
        }]
      };
    }
    
    // 1. Validazione e filtraggio
    const validationResult = this.validateFatturePerImport(
      tutteFatture, 
      idSelezionati,
      options.verificaAnomalie !== false
    );
    
    // 2. Esegui import (simulato o reale)
    const fattureAggiornate = await this.eseguiImport(
      tutteFatture,
      validationResult,
      options
    );
    
    // 3. Genera summary completo
    const summary = this.generateImportSummary(validationResult);
    
    // 4. Prepara warnings se presenti
    const warnings = this.generateWarnings(validationResult);
    
    return {
      fattureAggiornate,
      summary,
      warnings
    };
  }
  
  /**
   * Valida e filtra le fatture per l'import
   * Verifica che non abbiano anomalie e che abbiano il medico assegnato
   */
  private static validateFatturePerImport(
    tutteFatture: FatturaConVoci[],
    idSelezionati: number[],
    verificaAnomalie: boolean
  ): ValidationResult {
    const fattureSelezionate = tutteFatture.filter(f => 
      idSelezionati.includes(f.id)
    );
    
    const importabili: FatturaConVoci[] = [];
    const nonImportabili: FatturaConVoci[] = [];
    
    fattureSelezionate.forEach(fattura => {
      // Usa AnomalieProcessor per verificare se è importabile
      const isImportabile = verificaAnomalie 
        ? AnomalieProcessor.canImportFattura(fattura)
        : true;
        
      if (isImportabile) {
        importabili.push(fattura);
      } else {
        nonImportabili.push(fattura);
      }
    });
    
    return {
      totale: fattureSelezionate.length,
      importabili,
      nonImportabili,
      idImportabili: importabili.map(f => f.id)
    };
  }
  
  /**
   * Esegue l'import vero e proprio
   * Cambia lo stato delle fatture da 'da_importare' a 'importata'
   */
  private static async eseguiImport(
    tutteFatture: FatturaConVoci[],
    validationResult: ValidationResult,
    options: ImportOptions
  ): Promise<FatturaConVoci[]> {
    
    // Simula delay per import reale (se non in test)
    if (!options.simulazione && options.delayMs !== 0) {
      await this.simulateImportDelay(options.delayMs || 1500);
    }
    
    // Aggiorna gli stati delle fatture
    const fattureAggiornate = tutteFatture.map(fattura => {
      const isImporting = validationResult.idImportabili.includes(fattura.id);
      
      if (isImporting) {
        return {
          ...fattura,
          stato: 'importata' as const,
          importata: true,
          dataImport: new Date().toISOString()
        };
      }
      
      return fattura;
    });
    
    return fattureAggiornate;
  }
  
  /**
   * Genera il summary dettagliato dell'import
   */
  private static generateImportSummary(
    validationResult: ValidationResult
  ): ImportSummary {
    const { importabili, nonImportabili } = validationResult;
    
    // Calcola quante sono nuove (stato 'da_importare')
    const nuove = importabili.filter(f => 
      f.stato === 'da_importare'
    ).length;
    
    // Calcola l'importo totale delle fatture importate
    const importoTotale = importabili.reduce(
      (sum, f) => sum + (f.totale || 0), 
      0
    );
    
    return {
      totale: validationResult.totale,
      importate: importabili.length,
      nuove: nuove,
      nonImportabili: nonImportabili.length,
      importoTotale,
      idImportati: validationResult.idImportabili
    };
  }
  
  /**
   * Genera i warning per l'utente
   */
  private static generateWarnings(
    validationResult: ValidationResult
  ): ImportWarning[] {
    const warnings: ImportWarning[] = [];
    
    if (validationResult.nonImportabili.length > 0) {
      warnings.push({
        tipo: 'non_importabile',
        count: validationResult.nonImportabili.length,
        message: `${validationResult.nonImportabili.length} fatture non possono essere importate per anomalie o medico mancante`
      });
    }
    
    return warnings;
  }
  
  /**
   * Simula un delay per l'import (per UX)
   */
  private static simulateImportDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Verifica rapidamente se ci sono fatture importabili tra quelle selezionate
   */
  static hasImportableFatture(
    fatture: FatturaConVoci[],
    idSelezionati: number[]
  ): boolean {
    if (idSelezionati.length === 0) return false;
    
    return idSelezionati.some(id => {
      const fattura = fatture.find(f => f.id === id);
      return fattura && AnomalieProcessor.canImportFattura(fattura);
    });
  }
  
  /**
   * Conta quante fatture sono importabili tra quelle selezionate
   */
  static countImportableFatture(
    fatture: FatturaConVoci[],
    idSelezionati: number[]
  ): number {
    return idSelezionati.filter(id => {
      const fattura = fatture.find(f => f.id === id);
      return fattura && AnomalieProcessor.canImportFattura(fattura);
    }).length;
  }
  
  /**
   * Ottiene un riepilogo pre-import senza eseguire l'operazione
   */
  static getImportPreview(
    fatture: FatturaConVoci[],
    idSelezionati: number[]
  ): {
    importabili: number;
    nonImportabili: number;
    nuove: number;
    importoTotale: number;
  } {
    const validation = this.validateFatturePerImport(
      fatture,
      idSelezionati,
      true
    );
    
    const nuove = validation.importabili.filter(f => 
      f.stato === 'da_importare'
    ).length;
    
    const importoTotale = validation.importabili.reduce(
      (sum, f) => sum + (f.totale || 0),
      0
    );
    
    return {
      importabili: validation.importabili.length,
      nonImportabili: validation.nonImportabili.length,
      nuove,
      importoTotale
    };
  }
}