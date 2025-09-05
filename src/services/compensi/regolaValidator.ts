import { RegolaCompenso, Eccezione, CostoProdotto } from './compensiCalculator';

export interface ValidationWarning {
  tipo: 'identica' | 'piu_generosa' | 'conflitto' | 'prodotto_mancante' | 'costo_zero' | 'info';
  messaggio: string;
  gravita: 'info' | 'warning' | 'error';
  eccezione?: Eccezione;
  dettagli?: any;
}

export class RegolaValidator {
  
  validateCoherence(
    regolaBase: RegolaCompenso,
    eccezioni: Eccezione[],
    costiProdotti: CostoProdotto[]
  ): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    
    // Valida eccezioni
    warnings.push(...this.validateEccezioni(regolaBase, eccezioni));
    
    // Valida conflitti tra eccezioni
    warnings.push(...this.validateConflittiEccezioni(eccezioni));
    
    // Valida costi prodotti
    warnings.push(...this.validateCostiProdotti(regolaBase, eccezioni, costiProdotti));
    
    return warnings;
  }
  
  private validateEccezioni(
    regolaBase: RegolaCompenso,
    eccezioni: Eccezione[]
  ): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    
    eccezioni.forEach(eccezione => {
      // 1. Eccezione identica a regola base
      if (this.isRegolaIdentica(eccezione.regola, regolaBase)) {
        warnings.push({
          tipo: 'identica',
          messaggio: `L'eccezione per "${eccezione.trattamento}"${
            eccezione.prodotto ? ` + "${eccezione.prodotto}"` : ''
          } è identica alla regola base`,
          gravita: 'warning',
          eccezione
        });
      }
      
      // 2. Eccezione più generosa (solo per percentuali)
      if (eccezione.regola.tipo === 'percentuale' && regolaBase.tipo === 'percentuale') {
        if ((eccezione.regola.valore || 0) > (regolaBase.valore || 0)) {
          warnings.push({
            tipo: 'piu_generosa',
            messaggio: `L'eccezione per "${eccezione.trattamento}" ha una percentuale più alta della regola base (${eccezione.regola.valore}% vs ${regolaBase.valore}%)`,
            gravita: 'info',
            eccezione
          });
        }
      }
      
      // 3. Validazione valori regola
      if (!this.isRegolaValida(eccezione.regola)) {
        warnings.push({
          tipo: 'conflitto',
          messaggio: `L'eccezione per "${eccezione.trattamento}" ha valori non validi`,
          gravita: 'error',
          eccezione
        });
      }
    });
    
    return warnings;
  }
  
  private validateConflittiEccezioni(eccezioni: Eccezione[]): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    const eccezioniMap = new Map<string, Eccezione[]>();
    
    // Raggruppa eccezioni per trattamento
    eccezioni.forEach(eccezione => {
      const key = eccezione.trattamento;
      if (!eccezioniMap.has(key)) {
        eccezioniMap.set(key, []);
      }
      eccezioniMap.get(key)!.push(eccezione);
    });
    
    // Cerca conflitti
    eccezioniMap.forEach((eccezioniTrattamento, trattamento) => {
      // Controlla se ci sono sia eccezioni generiche che specifiche per prodotto
      const generiche = eccezioniTrattamento.filter(e => !e.prodotto);
      const specifiche = eccezioniTrattamento.filter(e => e.prodotto);
      
      if (generiche.length > 1) {
        warnings.push({
          tipo: 'conflitto',
          messaggio: `Esistono ${generiche.length} eccezioni generiche per il trattamento "${trattamento}"`,
          gravita: 'error',
          dettagli: { eccezioni: generiche }
        });
      }
      
      // Controlla duplicati per stesso prodotto
      const prodottiDuplicati = new Map<string, number>();
      specifiche.forEach(e => {
        if (e.prodotto) {
          prodottiDuplicati.set(
            e.prodotto,
            (prodottiDuplicati.get(e.prodotto) || 0) + 1
          );
        }
      });
      
      prodottiDuplicati.forEach((count, prodotto) => {
        if (count > 1) {
          warnings.push({
            tipo: 'conflitto',
            messaggio: `Esistono ${count} eccezioni per "${trattamento}" + "${prodotto}"`,
            gravita: 'error',
            dettagli: { trattamento, prodotto, count }
          });
        }
      });
    });
    
    return warnings;
  }
  
  private validateCostiProdotti(
    regolaBase: RegolaCompenso,
    eccezioni: Eccezione[],
    costiProdotti: CostoProdotto[]
  ): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    
    // Trova tutti i prodotti referenziati nelle eccezioni
    const prodottiReferenziati = new Set<string>();
    eccezioni.forEach(e => {
      if (e.prodotto && e.regola.detraiCosto) {
        prodottiReferenziati.add(e.prodotto);
      }
    });
    
    // Verifica che i prodotti referenziati abbiano un costo
    prodottiReferenziati.forEach(nomeProdotto => {
      const costoProdotto = costiProdotti.find(p => p.nome === nomeProdotto);
      
      if (!costoProdotto) {
        warnings.push({
          tipo: 'prodotto_mancante',
          messaggio: `Il prodotto "${nomeProdotto}" è referenziato in un'eccezione con detrazione costi ma non ha un costo configurato`,
          gravita: 'error',
          dettagli: { prodotto: nomeProdotto }
        });
      } else if (costoProdotto.costo === 0 && !costoProdotto.nonDetrarre) {
        warnings.push({
          tipo: 'costo_zero',
          messaggio: `Il prodotto "${nomeProdotto}" ha costo €0 ma la detrazione è attiva`,
          gravita: 'warning',
          dettagli: { prodotto: nomeProdotto }
        });
      }
    });
    
    // Verifica prodotti con costi ma non utilizzati
    const prodottiNonUtilizzati = costiProdotti.filter(
      p => p.costo > 0 && !prodottiReferenziati.has(p.nome)
    );
    
    if (prodottiNonUtilizzati.length > 0 && regolaBase.detraiCosto) {
      prodottiNonUtilizzati.forEach(p => {
        warnings.push({
          tipo: 'info',
          messaggio: `Il prodotto "${p.nome}" ha un costo configurato (€${p.costo}) ma non è utilizzato in nessuna eccezione specifica`,
          gravita: 'info',
          dettagli: { prodotto: p.nome, costo: p.costo }
        });
      });
    }
    
    return warnings;
  }
  
  private isRegolaIdentica(regola1: RegolaCompenso, regola2: RegolaCompenso): boolean {
    if (regola1.tipo !== regola2.tipo || 
        regola1.su !== regola2.su || 
        regola1.detraiCosto !== regola2.detraiCosto) {
      return false;
    }
    
    switch (regola1.tipo) {
      case 'percentuale':
        return regola1.valore === regola2.valore;
        
      case 'scaglioni':
        return regola1.valoreX === regola2.valoreX && 
               regola1.valoreY === regola2.valoreY;
        
      case 'fisso':
        return regola1.valoreX === regola2.valoreX && 
               regola1.valoreY === regola2.valoreY;
        
      default:
        return false;
    }
  }
  
  isRegolaValida(regola: RegolaCompenso): boolean {
    switch (regola.tipo) {
      case 'percentuale':
        return regola.valore !== undefined && 
               regola.valore >= 0 && 
               regola.valore <= 100;
        
      case 'scaglioni':
        return regola.valoreX !== undefined && 
               regola.valoreX >= 0 &&
               regola.valoreY !== undefined && 
               regola.valoreY > 0 &&
               regola.valoreX < regola.valoreY;
        
      case 'fisso':
        return regola.valoreX !== undefined && 
               regola.valoreX >= 0 &&
               regola.valoreY !== undefined && 
               regola.valoreY > 0;
        
      default:
        return false;
    }
  }
  
  // Metodi helper per sanitizzazione valori
  sanitizePercentuale(valore: number | undefined): number {
    if (valore === undefined) return 0;
    return Math.min(100, Math.max(0, valore));
  }
  
  sanitizeValorePositivo(valore: number | undefined, minimo: number = 0): number {
    if (valore === undefined) return minimo;
    return Math.max(minimo, valore);
  }
  
  clampValue(value: number | undefined, min: number, max: number): number {
    if (value === undefined) return min;
    return Math.min(max, Math.max(min, value));
  }
  
  // Metodo per suggerimenti di ottimizzazione
  suggestOptimizations(
    regolaBase: RegolaCompenso,
    eccezioni: Eccezione[]
  ): string[] {
    const suggestions: string[] = [];
    
    // Suggerisci raggruppamento eccezioni simili
    const eccezioniSimili = this.findEccezioniSimili(eccezioni);
    if (eccezioniSimili.length > 0) {
      suggestions.push(
        `Considera di raggruppare le eccezioni simili: ${eccezioniSimili.map(
          g => g.map(e => e.trattamento).join(', ')
        ).join('; ')}`
      );
    }
    
    // Suggerisci semplificazione regole complesse
    if (regolaBase.tipo === 'fisso' && regolaBase.valoreY) {
      suggestions.push(
        'La regola base usa un importo fisso con percentuale minima. Considera se una regola più semplice potrebbe essere sufficiente.'
      );
    }
    
    return suggestions;
  }
  
  private findEccezioniSimili(eccezioni: Eccezione[]): Eccezione[][] {
    const gruppi: Eccezione[][] = [];
    const processate = new Set<number>();
    
    eccezioni.forEach((e1, i) => {
      if (processate.has(e1.id)) return;
      
      const gruppo = [e1];
      processate.add(e1.id);
      
      eccezioni.forEach((e2, j) => {
        if (i !== j && !processate.has(e2.id) && 
            this.isRegolaIdentica(e1.regola, e2.regola)) {
          gruppo.push(e2);
          processate.add(e2.id);
        }
      });
      
      if (gruppo.length > 1) {
        gruppi.push(gruppo);
      }
    });
    
    return gruppi;
  }
}