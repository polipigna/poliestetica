import { medici as mockMedici } from '@/data/mock';
import regoleCostiData from '@/data/mock/medici-regole.json';
import {
  DataSource,
  CreateMedicoDTO,
  UpdateMedicoDTO,
  RegoleCompensi,
  CostoProdotto,
  Eccezione,
  MedicoExtended,
  ExportData,
  ImportData
} from './interfaces';

/**
 * MockDataSource - Implementazione con localStorage per development
 * Carica dati iniziali da mock, poi persiste in localStorage
 */
export class MockDataSource implements DataSource {
  private readonly STORAGE_KEYS = {
    MEDICI: 'poliestetica-medici',
    REGOLE: 'poliestetica-medici-regole',
    COSTI: 'poliestetica-medici-costi',
    ECCEZIONI: 'poliestetica-medici-eccezioni',
    LAST_ID: 'poliestetica-medici-last-id'
  };

  /**
   * Ottiene tutti i medici con le loro regole e costi
   */
  async getMedici(): Promise<MedicoExtended[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.MEDICI);
      
      if (!stored) {
        // Prima volta: combina mock medici con regole/costi
        const mediciCompleti = this.initializeMediciWithRegole();
        this.saveMedici(mediciCompleti);
        return mediciCompleti;
      }
      
      return JSON.parse(stored);
    } catch (error) {
      console.error('Errore nel caricamento medici:', error);
      return this.initializeMediciWithRegole();
    }
  }

  /**
   * Ottiene un singolo medico
   */
  async getMedico(id: number): Promise<MedicoExtended | null> {
    const medici = await this.getMedici();
    return medici.find(m => m.id === id) || null;
  }

  /**
   * Crea un nuovo medico
   */
  async createMedico(data: CreateMedicoDTO): Promise<MedicoExtended> {
    const medici = await this.getMedici();
    
    // Genera nuovo ID
    const lastId = this.getLastId();
    const newId = lastId + 1;
    this.setLastId(newId);
    
    const nuovoMedico: MedicoExtended = {
      id: newId,
      nome: data.nome,
      cognome: data.cognome,
      nomeCompleto: `Dott. ${data.nome} ${data.cognome}`,
      cf: data.cf,
      piva: data.piva,
      regolaBase: this.getDefaultRegola(),
      costiProdotti: [],
      eccezioni: []
    };
    
    medici.push(nuovoMedico);
    this.saveMedici(medici);
    
    return nuovoMedico;
  }

  /**
   * Aggiorna un medico esistente
   */
  async updateMedico(id: number, data: UpdateMedicoDTO): Promise<MedicoExtended> {
    const medici = await this.getMedici();
    const index = medici.findIndex(m => m.id === id);
    
    if (index === -1) {
      throw new Error(`Medico con ID ${id} non trovato`);
    }
    
    const medicoAggiornato = {
      ...medici[index],
      ...data,
      nomeCompleto: data.nome && data.cognome 
        ? `Dott. ${data.nome} ${data.cognome}`
        : medici[index].nomeCompleto
    };
    
    medici[index] = medicoAggiornato;
    this.saveMedici(medici);
    
    return medicoAggiornato;
  }

  /**
   * Elimina un medico
   */
  async deleteMedico(id: number): Promise<void> {
    const medici = await this.getMedici();
    const filtrati = medici.filter(m => m.id !== id);
    
    if (filtrati.length === medici.length) {
      throw new Error(`Medico con ID ${id} non trovato`);
    }
    
    this.saveMedici(filtrati);
  }

  /**
   * Ottiene le regole compensi di un medico
   */
  async getRegoleCompensi(medicoId: number): Promise<RegoleCompensi> {
    const medico = await this.getMedico(medicoId);
    if (!medico) {
      throw new Error(`Medico con ID ${medicoId} non trovato`);
    }
    return medico.regolaBase;
  }

  /**
   * Aggiorna le regole compensi di un medico
   */
  async updateRegoleCompensi(medicoId: number, regole: RegoleCompensi): Promise<void> {
    const medici = await this.getMedici();
    const index = medici.findIndex(m => m.id === medicoId);
    
    if (index === -1) {
      throw new Error(`Medico con ID ${medicoId} non trovato`);
    }
    
    medici[index].regolaBase = regole;
    this.saveMedici(medici);
  }

  /**
   * Ottiene i costi prodotti di un medico
   */
  async getCostiProdotti(medicoId: number): Promise<CostoProdotto[]> {
    const medico = await this.getMedico(medicoId);
    if (!medico) {
      throw new Error(`Medico con ID ${medicoId} non trovato`);
    }
    return medico.costiProdotti;
  }

  /**
   * Aggiorna tutti i costi prodotti di un medico
   */
  async updateCostiProdotti(medicoId: number, costi: CostoProdotto[]): Promise<void> {
    const medici = await this.getMedici();
    const index = medici.findIndex(m => m.id === medicoId);
    
    if (index === -1) {
      throw new Error(`Medico con ID ${medicoId} non trovato`);
    }
    
    medici[index].costiProdotti = costi;
    this.saveMedici(medici);
  }

  /**
   * Aggiunge un costo prodotto
   */
  async addCostoProdotto(medicoId: number, costo: CostoProdotto): Promise<void> {
    const medici = await this.getMedici();
    const index = medici.findIndex(m => m.id === medicoId);
    
    if (index === -1) {
      throw new Error(`Medico con ID ${medicoId} non trovato`);
    }
    
    const costiEsistenti = medici[index].costiProdotti;
    const indexProdotto = costiEsistenti.findIndex(c => c.codiceProdotto === costo.codiceProdotto);
    
    if (indexProdotto >= 0) {
      costiEsistenti[indexProdotto] = costo;
    } else {
      costiEsistenti.push(costo);
    }
    
    this.saveMedici(medici);
  }

  /**
   * Rimuove un costo prodotto
   */
  async removeCostoProdotto(medicoId: number, codiceProdotto: string): Promise<void> {
    const medici = await this.getMedici();
    const index = medici.findIndex(m => m.id === medicoId);
    
    if (index === -1) {
      throw new Error(`Medico con ID ${medicoId} non trovato`);
    }
    
    medici[index].costiProdotti = medici[index].costiProdotti.filter(
      c => c.codiceProdotto !== codiceProdotto
    );
    
    this.saveMedici(medici);
  }

  /**
   * Ottiene le eccezioni di un medico
   */
  async getEccezioni(medicoId: number): Promise<Eccezione[]> {
    const medico = await this.getMedico(medicoId);
    if (!medico) {
      throw new Error(`Medico con ID ${medicoId} non trovato`);
    }
    return medico.eccezioni;
  }

  /**
   * Aggiorna tutte le eccezioni di un medico
   */
  async updateEccezioni(medicoId: number, eccezioni: Eccezione[]): Promise<void> {
    const medici = await this.getMedici();
    const index = medici.findIndex(m => m.id === medicoId);
    
    if (index === -1) {
      throw new Error(`Medico con ID ${medicoId} non trovato`);
    }
    
    medici[index].eccezioni = eccezioni;
    this.saveMedici(medici);
  }

  /**
   * Aggiunge un'eccezione
   */
  async addEccezione(medicoId: number, eccezione: Eccezione): Promise<void> {
    const medici = await this.getMedici();
    const index = medici.findIndex(m => m.id === medicoId);
    
    if (index === -1) {
      throw new Error(`Medico con ID ${medicoId} non trovato`);
    }
    
    const eccezioniEsistenti = medici[index].eccezioni;
    const indexEccezione = eccezioniEsistenti.findIndex(e => e.codice === eccezione.codice);
    
    if (indexEccezione >= 0) {
      eccezioniEsistenti[indexEccezione] = eccezione;
    } else {
      eccezioniEsistenti.push(eccezione);
    }
    
    this.saveMedici(medici);
  }

  /**
   * Rimuove un'eccezione
   */
  async removeEccezione(medicoId: number, codice: string): Promise<void> {
    const medici = await this.getMedici();
    const index = medici.findIndex(m => m.id === medicoId);
    
    if (index === -1) {
      throw new Error(`Medico con ID ${medicoId} non trovato`);
    }
    
    medici[index].eccezioni = medici[index].eccezioni.filter(e => e.codice !== codice);
    this.saveMedici(medici);
  }

  /**
   * Reset completo dei dati
   */
  async reset(): Promise<void> {
    Object.values(this.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Reinizializza con dati mock
    const mediciCompleti = this.initializeMediciWithRegole();
    this.saveMedici(mediciCompleti);
  }

  /**
   * Esporta tutti i dati
   */
  async export(): Promise<ExportData> {
    const medici = await this.getMedici();
    
    return {
      medici,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  /**
   * Importa dati
   */
  async import(data: ImportData): Promise<void> {
    if (data.medici) {
      this.saveMedici(data.medici);
    }
    
    if (data.regole) {
      // Converti il vecchio formato se necessario
      const medici = await this.getMedici();
      const mediciAggiornati = medici.map(medico => {
        const regole = data.regole![medico.id.toString()];
        if (regole) {
          return {
            ...medico,
            regolaBase: regole.regolaBase,
            costiProdotti: this.convertCostiProdotti(regole.costiProdotti),
            eccezioni: regole.eccezioni || []
          };
        }
        return medico;
      });
      this.saveMedici(mediciAggiornati);
    }
  }

  /**
   * Valida i dati di un medico
   */
  async validateMedico(data: CreateMedicoDTO | UpdateMedicoDTO): Promise<boolean> {
    // Controlli base
    if ('cf' in data && data.cf) {
      if (data.cf.length !== 16) return false;
    }
    
    if ('piva' in data && data.piva) {
      if (data.piva.length !== 11) return false;
    }
    
    return true;
  }

  /**
   * Controlla duplicati
   */
  async checkDuplicates(cf?: string, piva?: string, excludeId?: number): Promise<boolean> {
    const medici = await this.getMedici();
    
    return medici.some(m => {
      if (excludeId && m.id === excludeId) return false;
      
      if (cf && m.cf === cf) return true;
      if (piva && m.piva === piva) return true;
      
      return false;
    });
  }

  // ============ METODI PRIVATI ============

  /**
   * Inizializza i medici combinando mock data con regole
   */
  private initializeMediciWithRegole(): MedicoExtended[] {
    return mockMedici.map(medico => {
      const regole = (regoleCostiData as any)[medico.id.toString()];
      
      return {
        ...medico,
        regolaBase: regole?.regolaBase || this.getDefaultRegola(),
        costiProdotti: regole?.costiProdotti ? this.convertCostiProdotti(regole.costiProdotti) : [],
        eccezioni: regole?.eccezioni || []
      };
    });
  }

  /**
   * Converte il formato costi prodotti dal vecchio al nuovo
   */
  private convertCostiProdotti(costiOld: Record<string, number> | undefined): CostoProdotto[] {
    if (!costiOld) return [];
    
    return Object.entries(costiOld).map(([codice, costo]) => ({
      codiceProdotto: codice,
      nomeProdotto: codice, // Verrà aggiornato quando avremo i nomi
      costo
    }));
  }

  /**
   * Regola di default per nuovi medici
   */
  private getDefaultRegola(): RegoleCompensi {
    return {
      tipo: 'percentuale',
      valore: 50,
      calcolaSu: 'netto',
      detraiCosti: true
    };
  }

  /**
   * Salva medici in localStorage
   */
  private saveMedici(medici: MedicoExtended[]): void {
    localStorage.setItem(this.STORAGE_KEYS.MEDICI, JSON.stringify(medici));
  }

  /**
   * Gestione ultimo ID generato
   */
  private getLastId(): number {
    const stored = localStorage.getItem(this.STORAGE_KEYS.LAST_ID);
    return stored ? parseInt(stored) : 20; // Inizia da 20 per evitare conflitti
  }

  private setLastId(id: number): void {
    localStorage.setItem(this.STORAGE_KEYS.LAST_ID, id.toString());
  }
}