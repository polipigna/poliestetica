import { Eccezione, RegolaCompenso } from './compensiCalculator';

export interface CreateEccezioneDTO {
  trattamento: string;
  prodotto?: string;
  regola: RegolaCompenso;
}

export interface UpdateEccezioneDTO {
  trattamento?: string;
  prodotto?: string;
  regola?: Partial<RegolaCompenso>;
}

export class EccezioniManager {
  private eccezioni: Eccezione[] = [];
  private nextId: number = 1;
  
  constructor(eccezioniIniziali?: Eccezione[]) {
    if (eccezioniIniziali) {
      this.eccezioni = [...eccezioniIniziali];
      this.nextId = Math.max(...eccezioniIniziali.map(e => e.id), 0) + 1;
    }
  }
  
  // CRUD Operations
  
  getAll(): Eccezione[] {
    return [...this.eccezioni];
  }
  
  getById(id: number): Eccezione | undefined {
    return this.eccezioni.find(e => e.id === id);
  }
  
  getByTrattamento(trattamento: string): Eccezione[] {
    return this.eccezioni.filter(e => e.trattamento === trattamento);
  }
  
  getByTrattamentoAndProdotto(trattamento: string, prodotto?: string): Eccezione | undefined {
    return this.eccezioni.find(
      e => e.trattamento === trattamento && 
           (prodotto ? e.prodotto === prodotto : !e.prodotto)
    );
  }
  
  add(data: CreateEccezioneDTO): Eccezione {
    // Verifica duplicati
    const esistente = this.getByTrattamentoAndProdotto(data.trattamento, data.prodotto);
    if (esistente) {
      throw new Error(
        `Eccezione già esistente per ${data.trattamento}${
          data.prodotto ? ` + ${data.prodotto}` : ''
        }`
      );
    }
    
    const nuovaEccezione: Eccezione = {
      id: this.nextId++,
      ...data
    };
    
    this.eccezioni.push(nuovaEccezione);
    return nuovaEccezione;
  }
  
  update(id: number, updates: UpdateEccezioneDTO): Eccezione {
    const index = this.eccezioni.findIndex(e => e.id === id);
    if (index === -1) {
      throw new Error(`Eccezione con ID ${id} non trovata`);
    }
    
    const eccezioneAttuale = this.eccezioni[index];
    
    // Se si sta cambiando trattamento o prodotto, verifica duplicati
    const nuovoTrattamento = updates.trattamento || eccezioneAttuale.trattamento;
    const nuovoProdotto = updates.prodotto !== undefined ? updates.prodotto : eccezioneAttuale.prodotto;
    
    if (nuovoTrattamento !== eccezioneAttuale.trattamento || nuovoProdotto !== eccezioneAttuale.prodotto) {
      const duplicato = this.getByTrattamentoAndProdotto(nuovoTrattamento, nuovoProdotto);
      if (duplicato && duplicato.id !== id) {
        throw new Error(
          `Eccezione già esistente per ${nuovoTrattamento}${
            nuovoProdotto ? ` + ${nuovoProdotto}` : ''
          }`
        );
      }
    }
    
    // Aggiorna eccezione
    const eccezioneAggiornata: Eccezione = {
      ...eccezioneAttuale,
      trattamento: nuovoTrattamento,
      prodotto: nuovoProdotto,
      regola: updates.regola ? { ...eccezioneAttuale.regola, ...updates.regola } : eccezioneAttuale.regola
    };
    
    this.eccezioni[index] = eccezioneAggiornata;
    return eccezioneAggiornata;
  }
  
  remove(id: number): void {
    const index = this.eccezioni.findIndex(e => e.id === id);
    if (index === -1) {
      throw new Error(`Eccezione con ID ${id} non trovata`);
    }
    
    this.eccezioni.splice(index, 1);
  }
  
  removeAll(): void {
    this.eccezioni = [];
  }
  
  // Utility methods
  
  /**
   * Trova l'eccezione più specifica applicabile
   */
  findApplicableEccezione(trattamento: string, prodotto?: string): Eccezione | undefined {
    // Prima cerca eccezione specifica per trattamento + prodotto
    if (prodotto) {
      const eccezioneSpecifica = this.getByTrattamentoAndProdotto(trattamento, prodotto);
      if (eccezioneSpecifica) {
        return eccezioneSpecifica;
      }
    }
    
    // Poi cerca eccezione generica per solo trattamento
    return this.getByTrattamentoAndProdotto(trattamento);
  }
  
  /**
   * Raggruppa eccezioni per trattamento
   */
  groupByTrattamento(): Map<string, Eccezione[]> {
    const gruppi = new Map<string, Eccezione[]>();
    
    this.eccezioni.forEach(eccezione => {
      if (!gruppi.has(eccezione.trattamento)) {
        gruppi.set(eccezione.trattamento, []);
      }
      gruppi.get(eccezione.trattamento)!.push(eccezione);
    });
    
    return gruppi;
  }
  
  /**
   * Ottieni tutti i trattamenti con eccezioni
   */
  getTrattamentiConEccezioni(): string[] {
    return Array.from(new Set(this.eccezioni.map(e => e.trattamento)));
  }
  
  /**
   * Ottieni tutti i prodotti referenziati nelle eccezioni
   */
  getProdottiReferenziati(): string[] {
    return Array.from(
      new Set(
        this.eccezioni
          .filter(e => e.prodotto)
          .map(e => e.prodotto!)
      )
    );
  }
  
  /**
   * Conta eccezioni per tipo di regola
   */
  countByTipoRegola(): Record<string, number> {
    const conteggio: Record<string, number> = {
      percentuale: 0,
      scaglioni: 0,
      fisso: 0
    };
    
    this.eccezioni.forEach(e => {
      conteggio[e.regola.tipo]++;
    });
    
    return conteggio;
  }
  
  /**
   * Clona il manager con tutte le eccezioni
   */
  clone(): EccezioniManager {
    return new EccezioniManager(this.eccezioni.map(e => ({ ...e, regola: { ...e.regola } })));
  }
  
  /**
   * Export eccezioni per salvataggio
   */
  export(): Eccezione[] {
    return this.eccezioni.map(e => ({
      ...e,
      regola: { ...e.regola }
    }));
  }
  
  /**
   * Import eccezioni da dati esterni
   */
  import(eccezioni: Eccezione[]): void {
    // Valida che non ci siano duplicati nei dati importati
    const seen = new Set<string>();
    eccezioni.forEach(e => {
      const key = `${e.trattamento}-${e.prodotto || ''}`;
      if (seen.has(key)) {
        throw new Error(`Duplicato trovato nell'import: ${e.trattamento}${e.prodotto ? ` + ${e.prodotto}` : ''}`);
      }
      seen.add(key);
    });
    
    this.eccezioni = eccezioni.map((e, index) => ({
      ...e,
      id: index + 1
    }));
    
    this.nextId = this.eccezioni.length + 1;
  }
  
  /**
   * Merge con altre eccezioni (utile per import parziali)
   */
  merge(altreEccezioni: Eccezione[], strategia: 'replace' | 'skip' | 'error' = 'error'): void {
    altreEccezioni.forEach(eccezione => {
      const esistente = this.getByTrattamentoAndProdotto(eccezione.trattamento, eccezione.prodotto);
      
      if (esistente) {
        switch (strategia) {
          case 'replace':
            this.update(esistente.id, {
              regola: eccezione.regola
            });
            break;
          case 'skip':
            // Non fare nulla
            break;
          case 'error':
            throw new Error(
              `Conflitto durante il merge: ${eccezione.trattamento}${
                eccezione.prodotto ? ` + ${eccezione.prodotto}` : ''
              }`
            );
        }
      } else {
        this.add({
          trattamento: eccezione.trattamento,
          prodotto: eccezione.prodotto,
          regola: eccezione.regola
        });
      }
    });
  }
}