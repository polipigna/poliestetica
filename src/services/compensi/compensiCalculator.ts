export interface RegolaCompenso {
  tipo: 'percentuale' | 'scaglioni' | 'fisso';
  su: 'netto' | 'lordo';
  valore?: number;
  valoreX?: number;
  valoreY?: number;
  detraiCosto: boolean;
}

export interface Eccezione {
  id: number;
  trattamento: string;
  prodotto?: string;
  regola: RegolaCompenso;
}

export interface CostoProdotto {
  id: number;
  nome: string;
  costo: number;
  unitaMisura: string;
  nonDetrarre?: boolean;
}

export interface CalcoloParams {
  importoFattura: number;
  ivaInclusa: boolean;
  trattamento: string;
  prodotto?: string;
  quantita?: number;
  regolaBase: RegolaCompenso;
  eccezioni?: Eccezione[];
  costiProdotti?: CostoProdotto[];
}

export interface RisultatoCalcolo {
  importoLordo: number;
  importoNetto: number;
  compensoBase: number;
  costoProdotto: number;
  compensoNetto: number;
  tipoRegola: string;
  descrizioneCalcolo: string;
  dettagliCosti?: string;
  regolaApplicata: RegolaCompenso;
}

export class CompensiCalculator {
  
  calcola(params: CalcoloParams): RisultatoCalcolo {
    const {
      importoFattura,
      ivaInclusa,
      trattamento,
      prodotto,
      quantita = 1,
      regolaBase,
      eccezioni = [],
      costiProdotti = []
    } = params;

    // Calcola importo netto (scorporo IVA se inclusa)
    const importoLordo = importoFattura;
    const importoNetto = ivaInclusa ? importoFattura / 1.22 : importoFattura;
    
    // Trova la regola da applicare
    const { regolaApplicata, tipoRegola } = this.trovaRegolaApplicabile(
      trattamento,
      prodotto,
      regolaBase,
      eccezioni
    );
    
    // Calcola il compenso base
    const importoCalcolo = regolaApplicata.su === 'netto' ? importoNetto : importoLordo;
    const { compensoBase, descrizioneCalcolo } = this.calcolaCompensoBase(
      importoCalcolo,
      regolaApplicata
    );
    
    // Calcola i costi prodotto se necessario
    const { costoProdotto, dettagliCosti } = this.calcolaCostiProdotto(
      prodotto,
      quantita,
      costiProdotti,
      regolaApplicata.detraiCosto
    );
    
    // Calcola compenso netto
    const compensoNetto = compensoBase - costoProdotto;
    
    return {
      importoLordo,
      importoNetto,
      compensoBase,
      costoProdotto,
      compensoNetto,
      tipoRegola,
      descrizioneCalcolo,
      dettagliCosti,
      regolaApplicata
    };
  }
  
  private trovaRegolaApplicabile(
    trattamento: string,
    prodotto: string | undefined,
    regolaBase: RegolaCompenso,
    eccezioni: Eccezione[]
  ): { regolaApplicata: RegolaCompenso; tipoRegola: string } {
    
    // Controlla se c'è un'eccezione specifica per trattamento + prodotto
    if (prodotto) {
      const eccezioneSpecifica = eccezioni.find(
        e => e.trattamento === trattamento && e.prodotto === prodotto
      );
      if (eccezioneSpecifica) {
        return {
          regolaApplicata: eccezioneSpecifica.regola,
          tipoRegola: `Eccezione "${trattamento} + ${prodotto}"`
        };
      }
    }
    
    // Controlla eccezione solo trattamento
    const eccezioneTrattamento = eccezioni.find(
      e => e.trattamento === trattamento && !e.prodotto
    );
    if (eccezioneTrattamento) {
      return {
        regolaApplicata: eccezioneTrattamento.regola,
        tipoRegola: `Eccezione "${trattamento}" (tutti i prodotti)`
      };
    }
    
    // Usa regola base
    return {
      regolaApplicata: regolaBase,
      tipoRegola: 'Regola base'
    };
  }
  
  private calcolaCompensoBase(
    importoCalcolo: number,
    regola: RegolaCompenso
  ): { compensoBase: number; descrizioneCalcolo: string } {
    let compensoBase = 0;
    let descrizioneCalcolo = '';
    
    switch (regola.tipo) {
      case 'percentuale':
        compensoBase = (importoCalcolo * (regola.valore || 0)) / 100;
        descrizioneCalcolo = `${regola.valore}% di €${importoCalcolo.toFixed(2)}`;
        break;
        
      case 'scaglioni':
        if (importoCalcolo <= (regola.valoreX || 0)) {
          compensoBase = importoCalcolo;
          descrizioneCalcolo = `100% fino a €${regola.valoreX}`;
        } else {
          compensoBase = (regola.valoreX || 0) + 
            ((importoCalcolo - (regola.valoreX || 0)) * (regola.valoreY || 0) / 100);
          descrizioneCalcolo = `100% fino a €${regola.valoreX}, poi ${regola.valoreY}% sull'eccedenza`;
        }
        break;
        
      case 'fisso':
        if ((regola.valoreY || 0) > 0) {
          const compensoPercentuale = (importoCalcolo * (regola.valoreY || 0)) / 100;
          compensoBase = Math.max(regola.valoreX || 0, compensoPercentuale);
          descrizioneCalcolo = `Maggiore tra €${regola.valoreX} e ${regola.valoreY}% (€${compensoPercentuale.toFixed(2)})`;
        } else {
          compensoBase = regola.valoreX || 0;
          descrizioneCalcolo = `Importo fisso di €${regola.valoreX}`;
        }
        break;
    }
    
    return { compensoBase, descrizioneCalcolo };
  }
  
  private calcolaCostiProdotto(
    prodotto: string | undefined,
    quantita: number,
    costiProdotti: CostoProdotto[],
    detraiCosto: boolean
  ): { costoProdotto: number; dettagliCosti?: string } {
    
    if (!detraiCosto || !prodotto) {
      return { costoProdotto: 0 };
    }
    
    const costoProdottoData = costiProdotti.find(p => p.nome === prodotto);
    
    if (!costoProdottoData || costoProdottoData.nonDetrarre) {
      return { costoProdotto: 0 };
    }
    
    const costoProdotto = costoProdottoData.costo * quantita;
    const dettagliCosti = `€${costoProdottoData.costo.toFixed(2)} × ${quantita} ${costoProdottoData.unitaMisura}`;
    
    return { costoProdotto, dettagliCosti };
  }
  
  // Metodo per simulazioni batch
  calcolaBatch(simulazioni: CalcoloParams[]): RisultatoCalcolo[] {
    return simulazioni.map(sim => this.calcola(sim));
  }
  
  // Metodo per analisi what-if
  analizzaScenari(
    baseParams: CalcoloParams,
    variazioni: { campo: keyof CalcoloParams; valori: any[] }[]
  ): Array<{ scenario: Partial<CalcoloParams>; risultato: RisultatoCalcolo }> {
    const risultati: Array<{ scenario: Partial<CalcoloParams>; risultato: RisultatoCalcolo }> = [];
    
    for (const variazione of variazioni) {
      for (const valore of variazione.valori) {
        const scenario = { ...baseParams, [variazione.campo]: valore };
        risultati.push({
          scenario: { [variazione.campo]: valore },
          risultato: this.calcola(scenario)
        });
      }
    }
    
    return risultati;
  }
}