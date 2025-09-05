import { DataSource } from './interfaces';
import { MockDataSource } from './mockDataSource';

/**
 * Factory pattern per la creazione del DataSource appropriato
 * Permette di switchare facilmente tra diverse implementazioni
 */
export class DataSourceFactory {
  private static instance: DataSource | null = null;

  /**
   * Crea o ritorna l'istanza del DataSource appropriato
   * basandosi sulla configurazione environment
   */
  public static create(): DataSource {
    // Se abbiamo già un'istanza, la ritorniamo (singleton)
    if (DataSourceFactory.instance) {
      return DataSourceFactory.instance;
    }

    const mode = process.env.NEXT_PUBLIC_DATA_MODE || 'auto';
    
    switch (mode) {
      case 'mock':
        // Sempre mock data con localStorage
        DataSourceFactory.instance = new MockDataSource();
        break;
        
      case 'api':
        // TODO: Implementare ApiDataSource quando avremo il backend
        // DataSourceFactory.instance = new ApiDataSource();
        // Per ora fallback a mock
        console.warn('API mode non ancora implementato, uso mock');
        DataSourceFactory.instance = new MockDataSource();
        break;
        
      case 'hybrid':
        // TODO: Implementare HybridDataSource per transizione graduale
        // DataSourceFactory.instance = new HybridDataSource();
        // Per ora fallback a mock
        console.warn('Hybrid mode non ancora implementato, uso mock');
        DataSourceFactory.instance = new MockDataSource();
        break;
        
      case 'auto':
      default:
        // Auto-detect basato su environment
        if (process.env.NODE_ENV === 'development') {
          DataSourceFactory.instance = new MockDataSource();
        } else {
          // In produzione useremo API, per ora mock
          console.info('Produzione: futuro API mode, attualmente mock');
          DataSourceFactory.instance = new MockDataSource();
        }
        break;
    }

    console.info(`DataSource inizializzato in modalità: ${mode}`);
    return DataSourceFactory.instance;
  }

  /**
   * Reset dell'istanza singleton (utile per testing)
   */
  public static reset(): void {
    DataSourceFactory.instance = null;
  }

  /**
   * Ottiene il tipo di DataSource corrente
   */
  public static getCurrentType(): string {
    if (!DataSourceFactory.instance) {
      return 'none';
    }
    
    if (DataSourceFactory.instance instanceof MockDataSource) {
      return 'mock';
    }
    
    // Future implementazioni
    // if (DataSourceFactory.instance instanceof ApiDataSource) {
    //   return 'api';
    // }
    
    return 'unknown';
  }

  /**
   * Utility per verificare se stiamo usando dati mock
   */
  public static isMockMode(): boolean {
    return DataSourceFactory.getCurrentType() === 'mock';
  }

  /**
   * Forza un tipo specifico di DataSource (utile per testing)
   */
  public static forceMode(mode: 'mock' | 'api' | 'hybrid'): void {
    DataSourceFactory.reset();
    
    switch (mode) {
      case 'mock':
        DataSourceFactory.instance = new MockDataSource();
        break;
      // Altri casi quando saranno implementati
      default:
        DataSourceFactory.instance = new MockDataSource();
    }
  }
}