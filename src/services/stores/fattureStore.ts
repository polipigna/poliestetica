import { Fattura } from '@/data/mock';

export interface Periodo {
  mese: number;
  anno: number;
}

export class FattureStore {
  private static readonly STORAGE_KEYS = {
    FATTURE_DISPONIBILI: 'poliestetica-fatture-disponibili',
    FATTURE_IMPORTATE: 'poliestetica-fatture-importate',
  };

  /**
   * Ottiene le fatture disponibili per l'import
   */
  static getFattureDisponibili(): Fattura[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.FATTURE_DISPONIBILI);
      if (!stored) return [];
      
      const fatture = JSON.parse(stored) as Fattura[];
      return Array.isArray(fatture) ? fatture : [];
    } catch (error) {
      console.error('Errore nel caricamento fatture disponibili:', error);
      return [];
    }
  }

  /**
   * Salva le fatture disponibili
   */
  static saveFattureDisponibili(fatture: Fattura[]): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(
        this.STORAGE_KEYS.FATTURE_DISPONIBILI, 
        JSON.stringify(fatture)
      );
    } catch (error) {
      console.error('Errore nel salvataggio fatture disponibili:', error);
    }
  }

  /**
   * Importa fatture nel sistema per un determinato periodo
   */
  static importaFatture(fatture: Fattura[], periodo: Periodo): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Recupera fatture già importate
      const importateEsistenti = this.getFattureImportateAll();
      
      // Marca le fatture con periodo e timestamp import
      const fattureConPeriodo = fatture.map(f => ({
        ...f,
        importata: true,
        stato: 'importata' as const,
        periodoImport: periodo,
        dataImport: new Date().toISOString()
      }));
      
      // Aggiungi alle importate esistenti
      const nuoveImportate = [...importateEsistenti, ...fattureConPeriodo];
      
      // Salva
      localStorage.setItem(
        this.STORAGE_KEYS.FATTURE_IMPORTATE,
        JSON.stringify(nuoveImportate)
      );
      
      // Rimuovi dalle disponibili
      const disponibili = this.getFattureDisponibili();
      const idImportate = fatture.map(f => f.id);
      const nuoveDisponibili = disponibili.filter(f => !idImportate.includes(f.id));
      this.saveFattureDisponibili(nuoveDisponibili);
      
    } catch (error) {
      console.error('Errore durante import fatture:', error);
      throw error;
    }
  }

  /**
   * Ottiene tutte le fatture importate (private helper)
   */
  private static getFattureImportateAll(): Fattura[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.FATTURE_IMPORTATE);
      if (!stored) return [];
      
      const fatture = JSON.parse(stored);
      return Array.isArray(fatture) ? fatture : [];
    } catch (error) {
      console.error('Errore nel caricamento fatture importate:', error);
      return [];
    }
  }

  /**
   * Ottiene le fatture importate filtrate per periodo
   */
  static getFattureImportate(periodo?: Periodo): Fattura[] {
    const tutteImportate = this.getFattureImportateAll();
    
    if (!periodo) {
      return tutteImportate;
    }
    
    // Filtra per periodo
    return tutteImportate.filter(f => {
      const periodoImport = (f as any).periodoImport;
      if (!periodoImport) return false;
      
      return periodoImport.mese === periodo.mese && 
             periodoImport.anno === periodo.anno;
    });
  }

  /**
   * Rimuove fatture dalle disponibili (usato dopo import)
   */
  static rimuoviFattureDisponibili(ids: number[]): void {
    const disponibili = this.getFattureDisponibili();
    const nuoveDisponibili = disponibili.filter(f => !ids.includes(f.id));
    this.saveFattureDisponibili(nuoveDisponibili);
  }

  /**
   * Verifica se esistono fatture importate per un periodo
   */
  static hasFattureImportate(periodo: Periodo): boolean {
    const fatture = this.getFattureImportate(periodo);
    return fatture.length > 0;
  }

  /**
   * Ottiene statistiche sulle fatture
   */
  static getStatistiche(): {
    disponibili: number;
    importate: number;
    totaleImportate: number;
  } {
    const disponibili = this.getFattureDisponibili();
    const importate = this.getFattureImportateAll();
    
    return {
      disponibili: disponibili.length,
      importate: importate.length,
      totaleImportate: importate.reduce((sum, f) => sum + f.totale, 0)
    };
  }

  /**
   * Reset completo dello store
   */
  static reset(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(this.STORAGE_KEYS.FATTURE_DISPONIBILI);
      localStorage.removeItem(this.STORAGE_KEYS.FATTURE_IMPORTATE);
      console.log('FattureStore resettato con successo');
    } catch (error) {
      console.error('Errore durante reset FattureStore:', error);
    }
  }

  /**
   * Export dati per backup
   */
  static export(): {
    disponibili: Fattura[];
    importate: Fattura[];
    timestamp: string;
  } {
    return {
      disponibili: this.getFattureDisponibili(),
      importate: this.getFattureImportateAll(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Import dati da backup
   */
  static import(data: {
    disponibili?: Fattura[];
    importate?: Fattura[];
  }): void {
    if (data.disponibili) {
      this.saveFattureDisponibili(data.disponibili);
    }
    if (data.importate) {
      localStorage.setItem(
        this.STORAGE_KEYS.FATTURE_IMPORTATE,
        JSON.stringify(data.importate)
      );
    }
  }
}