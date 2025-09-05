import { BaseStore } from './baseStore';
import {
  DataSource,
  MedicoExtended,
  CreateMedicoDTO,
  UpdateMedicoDTO,
  RegoleCompensi,
  CostoProdotto,
  Eccezione,
  ExportData,
  ImportData
} from '../datasources/interfaces';
import { DataSourceFactory } from '../datasources/dataSourceFactory';

/**
 * MediciStore - Gestione centralizzata dei dati dei medici
 * Singleton pattern per garantire un'unica istanza
 */
export class MediciStore extends BaseStore<MedicoExtended[]> {
  private static instance: MediciStore;
  private dataSource: DataSource;
  protected storageKey = 'poliestetica-medici-cache';

  private constructor() {
    super();
    this.dataSource = DataSourceFactory.create();
    this.setCacheTimeout(10 * 60 * 1000); // 10 minuti cache
  }

  /**
   * Ottiene l'istanza singleton dello store
   */
  public static getInstance(): MediciStore {
    if (!MediciStore.instance) {
      MediciStore.instance = new MediciStore();
    }
    return MediciStore.instance;
  }

  /**
   * Ottiene tutti i medici
   */
  public async getMedici(forceRefresh = false): Promise<MedicoExtended[]> {
    try {
      // Se non forziamo il refresh, prova dalla cache
      if (!forceRefresh) {
        const cached = this.getFromCache('medici-list');
        if (cached) {
          return cached;
        }
      }

      // Carica dal data source
      const medici = await this.dataSource.getMedici();
      this.setCache('medici-list', medici);
      
      return medici;
    } catch (error) {
      return this.handleError(error, 'Caricamento medici');
    }
  }

  /**
   * Ottiene un singolo medico
   */
  public async getMedico(id: number, forceRefresh = false): Promise<MedicoExtended | null> {
    try {
      const cacheKey = `medico-${id}`;
      
      if (!forceRefresh) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          return cached;
        }
      }

      const medico = await this.dataSource.getMedico(id);
      if (medico) {
        this.setCache(cacheKey, medico);
      }
      
      return medico;
    } catch (error) {
      return this.handleError(error, `Caricamento medico ${id}`);
    }
  }

  /**
   * Crea un nuovo medico
   */
  public async createMedico(data: CreateMedicoDTO): Promise<MedicoExtended> {
    try {
      // Validazione
      const isValid = await this.dataSource.validateMedico(data);
      if (!isValid) {
        throw new Error('Dati medico non validi');
      }

      // Controllo duplicati
      const hasDuplicates = await this.dataSource.checkDuplicates(data.cf, data.piva);
      if (hasDuplicates) {
        throw new Error('CF o P.IVA già esistenti');
      }

      const nuovoMedico = await this.dataSource.createMedico(data);
      
      // Invalida cache lista
      this.invalidateCacheKey('medici-list');
      this.notifyListeners();
      
      return nuovoMedico;
    } catch (error) {
      return this.handleError(error, 'Creazione medico');
    }
  }

  /**
   * Aggiorna un medico
   */
  public async updateMedico(id: number, data: UpdateMedicoDTO): Promise<MedicoExtended> {
    try {
      // Validazione
      const isValid = await this.dataSource.validateMedico(data);
      if (!isValid) {
        throw new Error('Dati medico non validi');
      }

      // Controllo duplicati (escludendo il medico corrente)
      const hasDuplicates = await this.dataSource.checkDuplicates(data.cf, data.piva, id);
      if (hasDuplicates) {
        throw new Error('CF o P.IVA già esistenti');
      }

      const medicoAggiornato = await this.dataSource.updateMedico(id, data);
      
      // Invalida cache
      this.invalidateCacheKey('medici-list');
      this.invalidateCacheKey(`medico-${id}`);
      this.notifyListeners();
      
      return medicoAggiornato;
    } catch (error) {
      return this.handleError(error, `Aggiornamento medico ${id}`);
    }
  }

  /**
   * Elimina un medico
   */
  public async deleteMedico(id: number): Promise<void> {
    try {
      await this.dataSource.deleteMedico(id);
      
      // Invalida cache
      this.invalidateCacheKey('medici-list');
      this.invalidateCacheKey(`medico-${id}`);
      this.notifyListeners();
    } catch (error) {
      return this.handleError(error, `Eliminazione medico ${id}`);
    }
  }

  /**
   * Aggiorna le regole compensi di un medico
   */
  public async updateRegoleCompensi(medicoId: number, regole: RegoleCompensi): Promise<void> {
    try {
      await this.dataSource.updateRegoleCompensi(medicoId, regole);
      
      // Invalida cache
      this.invalidateCacheKey('medici-list');
      this.invalidateCacheKey(`medico-${medicoId}`);
      this.notifyListeners();
    } catch (error) {
      return this.handleError(error, `Aggiornamento regole medico ${medicoId}`);
    }
  }

  /**
   * Aggiorna i costi prodotti di un medico
   */
  public async updateCostiProdotti(medicoId: number, costi: CostoProdotto[]): Promise<void> {
    try {
      await this.dataSource.updateCostiProdotti(medicoId, costi);
      
      // Invalida cache
      this.invalidateCacheKey('medici-list');
      this.invalidateCacheKey(`medico-${medicoId}`);
      this.notifyListeners();
    } catch (error) {
      return this.handleError(error, `Aggiornamento costi prodotti medico ${medicoId}`);
    }
  }

  /**
   * Aggiunge un costo prodotto
   */
  public async addCostoProdotto(medicoId: number, costo: CostoProdotto): Promise<void> {
    try {
      await this.dataSource.addCostoProdotto(medicoId, costo);
      
      // Invalida cache
      this.invalidateCacheKey('medici-list');
      this.invalidateCacheKey(`medico-${medicoId}`);
      this.notifyListeners();
    } catch (error) {
      return this.handleError(error, `Aggiunta costo prodotto medico ${medicoId}`);
    }
  }

  /**
   * Rimuove un costo prodotto
   */
  public async removeCostoProdotto(medicoId: number, codiceProdotto: string): Promise<void> {
    try {
      await this.dataSource.removeCostoProdotto(medicoId, codiceProdotto);
      
      // Invalida cache
      this.invalidateCacheKey('medici-list');
      this.invalidateCacheKey(`medico-${medicoId}`);
      this.notifyListeners();
    } catch (error) {
      return this.handleError(error, `Rimozione costo prodotto ${codiceProdotto}`);
    }
  }

  /**
   * Aggiorna le eccezioni di un medico
   */
  public async updateEccezioni(medicoId: number, eccezioni: Eccezione[]): Promise<void> {
    try {
      await this.dataSource.updateEccezioni(medicoId, eccezioni);
      
      // Invalida cache
      this.invalidateCacheKey('medici-list');
      this.invalidateCacheKey(`medico-${medicoId}`);
      this.notifyListeners();
    } catch (error) {
      return this.handleError(error, `Aggiornamento eccezioni medico ${medicoId}`);
    }
  }

  /**
   * Aggiunge un'eccezione
   */
  public async addEccezione(medicoId: number, eccezione: Eccezione): Promise<void> {
    try {
      await this.dataSource.addEccezione(medicoId, eccezione);
      
      // Invalida cache
      this.invalidateCacheKey('medici-list');
      this.invalidateCacheKey(`medico-${medicoId}`);
      this.notifyListeners();
    } catch (error) {
      return this.handleError(error, `Aggiunta eccezione medico ${medicoId}`);
    }
  }

  /**
   * Rimuove un'eccezione
   */
  public async removeEccezione(medicoId: number, codice: string): Promise<void> {
    try {
      await this.dataSource.removeEccezione(medicoId, codice);
      
      // Invalida cache
      this.invalidateCacheKey('medici-list');
      this.invalidateCacheKey(`medico-${medicoId}`);
      this.notifyListeners();
    } catch (error) {
      return this.handleError(error, `Rimozione eccezione ${codice}`);
    }
  }

  /**
   * Reset completo dello store
   */
  public async reset(): Promise<void> {
    try {
      await this.dataSource.reset();
      this.invalidateCache();
      this.notifyListeners();
    } catch (error) {
      return this.handleError(error, 'Reset store');
    }
  }

  /**
   * Esporta tutti i dati
   */
  public async export(): Promise<ExportData> {
    try {
      return await this.dataSource.export();
    } catch (error) {
      return this.handleError(error, 'Export dati');
    }
  }

  /**
   * Importa dati
   */
  public async import(data: ImportData): Promise<void> {
    try {
      await this.dataSource.import(data);
      this.invalidateCache();
      this.notifyListeners();
    } catch (error) {
      return this.handleError(error, 'Import dati');
    }
  }

  /**
   * Cerca medici per nome o CF/PIVA
   */
  public async searchMedici(query: string): Promise<MedicoExtended[]> {
    try {
      const medici = await this.getMedici();
      const queryLower = query.toLowerCase();
      
      return medici.filter(m => 
        m.nomeCompleto.toLowerCase().includes(queryLower) ||
        m.cf.toLowerCase().includes(queryLower) ||
        m.piva.includes(query)
      );
    } catch (error) {
      return this.handleError(error, 'Ricerca medici');
    }
  }

  /**
   * Ottiene statistiche sui medici
   */
  public async getStatistiche(): Promise<{
    totale: number;
    conRegolePersonalizzate: number;
    conEccezioni: number;
    conCostiProdotti: number;
  }> {
    try {
      const medici = await this.getMedici();
      
      return {
        totale: medici.length,
        conRegolePersonalizzate: medici.filter(m => 
          m.regolaBase.tipo !== 'percentuale' || m.regolaBase.valore !== 50
        ).length,
        conEccezioni: medici.filter(m => m.eccezioni.length > 0).length,
        conCostiProdotti: medici.filter(m => m.costiProdotti.length > 0).length
      };
    } catch (error) {
      return this.handleError(error, 'Calcolo statistiche');
    }
  }

  /**
   * Batch update per operazioni multiple
   */
  public async batchUpdate(updates: Array<{ id: number; data: UpdateMedicoDTO }>): Promise<void> {
    try {
      for (const { id, data } of updates) {
        await this.dataSource.updateMedico(id, data);
      }
      
      this.invalidateCache();
      this.notifyListeners();
    } catch (error) {
      return this.handleError(error, 'Aggiornamento batch');
    }
  }
}