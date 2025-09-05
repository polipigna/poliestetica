/**
 * BaseStore - Classe base astratta per tutti gli store
 * Fornisce funzionalità comuni come caching e gestione errori
 */
export abstract class BaseStore<T> {
  protected cache: Map<string, { data: T; timestamp: number }> = new Map();
  protected cacheTimeout: number = 5 * 60 * 1000; // 5 minuti default
  protected listeners: Set<() => void> = new Set();

  /**
   * Chiave storage localStorage
   */
  protected abstract storageKey: string;

  /**
   * Salva dati in localStorage e cache
   */
  protected saveToStorage(data: T): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
        this.setCache(this.storageKey, data);
        this.notifyListeners();
      }
    } catch (error) {
      console.error(`Errore salvataggio in ${this.storageKey}:`, error);
      throw error;
    }
  }

  /**
   * Carica dati da localStorage o cache
   */
  protected loadFromStorage(): T | null {
    try {
      // Prima controlla cache
      const cached = this.getFromCache(this.storageKey);
      if (cached !== null) {
        return cached;
      }

      // Poi localStorage
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const data = JSON.parse(stored);
          this.setCache(this.storageKey, data);
          return data;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Errore caricamento da ${this.storageKey}:`, error);
      return null;
    }
  }

  /**
   * Rimuove dati da localStorage e cache
   */
  protected removeFromStorage(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.storageKey);
      this.cache.delete(this.storageKey);
      this.notifyListeners();
    }
  }

  /**
   * Imposta dati in cache con timestamp
   */
  protected setCache(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Ottiene dati dalla cache se non scaduti
   */
  protected getFromCache(key: string): T | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    // Controlla se la cache è scaduta
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Invalida tutta la cache
   */
  public invalidateCache(): void {
    this.cache.clear();
  }

  /**
   * Invalida una chiave specifica della cache
   */
  public invalidateCacheKey(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Imposta timeout cache (in millisecondi)
   */
  public setCacheTimeout(timeout: number): void {
    this.cacheTimeout = timeout;
  }

  /**
   * Aggiunge un listener per cambiamenti
   */
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    
    // Ritorna funzione di unsubscribe
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notifica tutti i listener di un cambiamento
   */
  protected notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Errore nel listener:', error);
      }
    });
  }

  /**
   * Reset dello store (da implementare nelle sottoclassi)
   */
  public abstract reset(): Promise<void>;

  /**
   * Export dei dati (da implementare nelle sottoclassi)
   */
  public abstract export(): Promise<any>;

  /**
   * Import dei dati (da implementare nelle sottoclassi)
   */
  public abstract import(data: any): Promise<void>;

  /**
   * Utility per gestire errori in modo consistente
   */
  protected handleError(error: any, operation: string): never {
    const message = error instanceof Error ? error.message : String(error);
    const enhancedError = new Error(`${operation} fallito: ${message}`);
    console.error(enhancedError);
    throw enhancedError;
  }

  /**
   * Utility per operazioni async con retry
   */
  protected async withRetry<R>(
    operation: () => Promise<R>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<R> {
    let lastError: any;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    
    throw lastError;
  }
}