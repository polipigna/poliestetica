import { CostoProdotto } from './compensiCalculator';

export interface CreateProdottoDTO {
  nome: string;
  costo: number;
  unitaMisura: string;
  nonDetrarre?: boolean;
}

export interface UpdateProdottoDTO {
  costo?: number;
  unitaMisura?: string;
  nonDetrarre?: boolean;
}

export interface ImportProdottoData {
  nome: string;
  costo: number;
}

export interface ImportResult {
  modifiche: Array<{
    nome: string;
    vecchioCosto: number;
    nuovoCosto: number;
  }>;
  nuoviProdotti: Array<{
    nome: string;
    costo: number;
    unitaMisura: string;
  }>;
  prodottiNonValidi: string[];
}

export class ProdottiCostiManager {
  private prodotti: CostoProdotto[] = [];
  private nextId: number = 1;
  private prodottiDisponibili: Array<{ nome: string; unitaMisura: string }> = [];
  
  constructor(
    prodottiIniziali?: CostoProdotto[],
    catalogoProdotti?: Array<{ nome: string; unitaMisura: string }>
  ) {
    if (prodottiIniziali) {
      this.prodotti = [...prodottiIniziali];
      this.nextId = Math.max(...prodottiIniziali.map(p => p.id), 0) + 1;
    }
    
    if (catalogoProdotti) {
      this.prodottiDisponibili = catalogoProdotti;
    }
  }
  
  // CRUD Operations
  
  getAll(): CostoProdotto[] {
    return [...this.prodotti];
  }
  
  getById(id: number): CostoProdotto | undefined {
    return this.prodotti.find(p => p.id === id);
  }
  
  getByNome(nome: string): CostoProdotto | undefined {
    return this.prodotti.find(p => p.nome === nome);
  }
  
  add(data: CreateProdottoDTO): CostoProdotto {
    // Verifica duplicati
    if (this.getByNome(data.nome)) {
      throw new Error(`Prodotto "${data.nome}" già esistente`);
    }
    
    // Valida costo
    const costo = Math.max(0, data.costo);
    
    const nuovoProdotto: CostoProdotto = {
      id: this.nextId++,
      nome: data.nome,
      costo,
      unitaMisura: data.unitaMisura,
      nonDetrarre: data.nonDetrarre || costo === 0
    };
    
    this.prodotti.push(nuovoProdotto);
    return nuovoProdotto;
  }
  
  update(id: number, updates: UpdateProdottoDTO): CostoProdotto {
    const index = this.prodotti.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error(`Prodotto con ID ${id} non trovato`);
    }
    
    const prodottoAttuale = this.prodotti[index];
    const nuovoCosto = updates.costo !== undefined 
      ? Math.max(0, updates.costo)
      : prodottoAttuale.costo;
    
    const prodottoAggiornato: CostoProdotto = {
      ...prodottoAttuale,
      costo: nuovoCosto,
      unitaMisura: updates.unitaMisura || prodottoAttuale.unitaMisura,
      nonDetrarre: updates.nonDetrarre !== undefined 
        ? updates.nonDetrarre 
        : (nuovoCosto === 0 || prodottoAttuale.nonDetrarre)
    };
    
    this.prodotti[index] = prodottoAggiornato;
    return prodottoAggiornato;
  }
  
  updateByNome(nome: string, updates: UpdateProdottoDTO): CostoProdotto {
    const prodotto = this.getByNome(nome);
    if (!prodotto) {
      throw new Error(`Prodotto "${nome}" non trovato`);
    }
    return this.update(prodotto.id, updates);
  }
  
  remove(id: number): void {
    const index = this.prodotti.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error(`Prodotto con ID ${id} non trovato`);
    }
    
    this.prodotti.splice(index, 1);
  }
  
  removeByNome(nome: string): void {
    const prodotto = this.getByNome(nome);
    if (prodotto) {
      this.remove(prodotto.id);
    }
  }
  
  removeAll(): void {
    this.prodotti = [];
  }
  
  // Import/Export functionality
  
  /**
   * Prepara i dati per l'import da Excel
   */
  prepareImport(data: ImportProdottoData[]): ImportResult {
    const modifiche: ImportResult['modifiche'] = [];
    const nuoviProdotti: ImportResult['nuoviProdotti'] = [];
    const prodottiNonValidi: string[] = [];
    
    // Crea una mappa dei prodotti attuali
    const prodottiAttualiMap = new Map<string, CostoProdotto>();
    this.prodotti.forEach(p => {
      prodottiAttualiMap.set(p.nome, p);
    });
    
    data.forEach(item => {
      const nomeProdotto = item.nome;
      const nuovoCosto = Math.max(0, item.costo || 0);
      
      if (!nomeProdotto) {
        return; // Salta righe vuote
      }
      
      // Se il prodotto esiste già, registra la modifica
      if (prodottiAttualiMap.has(nomeProdotto)) {
        const prodottoAttuale = prodottiAttualiMap.get(nomeProdotto)!;
        if (prodottoAttuale.costo !== nuovoCosto) {
          modifiche.push({
            nome: nomeProdotto,
            vecchioCosto: prodottoAttuale.costo,
            nuovoCosto: nuovoCosto
          });
        }
      } else {
        // Se il prodotto non esiste, verifica se è nel catalogo
        const prodottoDisponibile = this.prodottiDisponibili.find(
          p => p.nome === nomeProdotto
        );
        
        if (prodottoDisponibile) {
          nuoviProdotti.push({
            nome: nomeProdotto,
            costo: nuovoCosto,
            unitaMisura: prodottoDisponibile.unitaMisura
          });
        } else {
          prodottiNonValidi.push(nomeProdotto);
        }
      }
    });
    
    return {
      modifiche,
      nuoviProdotti,
      prodottiNonValidi
    };
  }
  
  /**
   * Conferma l'import preparato
   */
  confirmImport(importResult: ImportResult): void {
    // Applica modifiche
    importResult.modifiche.forEach(modifica => {
      this.updateByNome(modifica.nome, { costo: modifica.nuovoCosto });
    });
    
    // Aggiungi nuovi prodotti
    importResult.nuoviProdotti.forEach(nuovo => {
      this.add({
        nome: nuovo.nome,
        costo: nuovo.costo,
        unitaMisura: nuovo.unitaMisura
      });
    });
  }
  
  // Utility methods
  
  /**
   * Ottieni prodotti con costo > 0 e detrazione attiva
   */
  getProdottiDetraibili(): CostoProdotto[] {
    return this.prodotti.filter(p => p.costo > 0 && !p.nonDetrarre);
  }
  
  /**
   * Calcola costo totale di un set di prodotti
   */
  calcolaCostoTotale(
    prodotti: Array<{ nome: string; quantita: number }>
  ): { totale: number; dettagli: Array<{ nome: string; costo: number; quantita: number; subtotale: number }> } {
    const dettagli: Array<{ nome: string; costo: number; quantita: number; subtotale: number }> = [];
    let totale = 0;
    
    prodotti.forEach(item => {
      const prodotto = this.getByNome(item.nome);
      if (prodotto && !prodotto.nonDetrarre) {
        const subtotale = prodotto.costo * item.quantita;
        dettagli.push({
          nome: item.nome,
          costo: prodotto.costo,
          quantita: item.quantita,
          subtotale
        });
        totale += subtotale;
      }
    });
    
    return { totale, dettagli };
  }
  
  /**
   * Verifica coerenza prezzi
   */
  verificaCoerenzaPrezzi(): Array<{ prodotto: string; messaggio: string }> {
    const warnings: Array<{ prodotto: string; messaggio: string }> = [];
    
    this.prodotti.forEach(p => {
      // Avvisa per prodotti con costo 0 ma detrazione attiva
      if (p.costo === 0 && !p.nonDetrarre) {
        warnings.push({
          prodotto: p.nome,
          messaggio: 'Costo €0 ma detrazione attiva'
        });
      }
      
      // Avvisa per prodotti con costo alto ma detrazione disattiva
      if (p.costo > 0 && p.nonDetrarre) {
        warnings.push({
          prodotto: p.nome,
          messaggio: `Costo €${p.costo} ma detrazione non attiva`
        });
      }
    });
    
    return warnings;
  }
  
  /**
   * Statistiche sui costi
   */
  getStatistiche(): {
    totale: number;
    media: number;
    minimo: number;
    massimo: number;
    prodottiConCosto: number;
    prodottiSenzaCosto: number;
  } {
    const prodottiConCosto = this.prodotti.filter(p => p.costo > 0);
    const costiArray = prodottiConCosto.map(p => p.costo);
    
    return {
      totale: this.prodotti.length,
      media: costiArray.length > 0 
        ? costiArray.reduce((a, b) => a + b, 0) / costiArray.length 
        : 0,
      minimo: costiArray.length > 0 ? Math.min(...costiArray) : 0,
      massimo: costiArray.length > 0 ? Math.max(...costiArray) : 0,
      prodottiConCosto: prodottiConCosto.length,
      prodottiSenzaCosto: this.prodotti.length - prodottiConCosto.length
    };
  }
  
  /**
   * Export prodotti per salvataggio
   */
  export(): CostoProdotto[] {
    return this.prodotti.map(p => ({ ...p }));
  }
  
  /**
   * Import prodotti da dati esterni
   */
  import(prodotti: CostoProdotto[]): void {
    // Valida che non ci siano duplicati
    const seen = new Set<string>();
    prodotti.forEach(p => {
      if (seen.has(p.nome)) {
        throw new Error(`Duplicato trovato nell'import: ${p.nome}`);
      }
      seen.add(p.nome);
    });
    
    this.prodotti = prodotti.map((p, index) => ({
      ...p,
      id: index + 1,
      costo: Math.max(0, p.costo),
      nonDetrarre: p.nonDetrarre || p.costo === 0
    }));
    
    this.nextId = this.prodotti.length + 1;
  }
  
  /**
   * Clona il manager
   */
  clone(): ProdottiCostiManager {
    return new ProdottiCostiManager(
      this.prodotti.map(p => ({ ...p })),
      this.prodottiDisponibili
    );
  }
  
  /**
   * Imposta il catalogo prodotti disponibili
   */
  setCatalogoProdotti(catalogo: Array<{ nome: string; unitaMisura: string }>): void {
    this.prodottiDisponibili = catalogo;
  }
  
  /**
   * Ottieni prodotti disponibili ma non ancora aggiunti
   */
  getProdottiDisponibiliNonAggiunti(): Array<{ nome: string; unitaMisura: string }> {
    const prodottiAggiunti = new Set(this.prodotti.map(p => p.nome));
    return this.prodottiDisponibili.filter(p => !prodottiAggiunti.has(p.nome));
  }
}