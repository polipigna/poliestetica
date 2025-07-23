import { VoceFattura, prestazioni, prodotti, parseCodiceFattura, isCodiceValido, prodottiMap, isQuantitaAnomala } from '@/data/mock';

export function generateVociFattura(
  numeroVoci: number, 
  hasAnomalies: boolean,
  scenario?: string
): VoceFattura[] {
  const voci: VoceFattura[] = [];
  
  // Gestione scenari specifici
  if (scenario) {
    switch (scenario) {
      case 'prodotto_con_prezzo':
        return generateProdottoConPrezzo();
      case 'prodotto_orfano':
        return generateProdottoOrfano();
      case 'prestazione_incompleta':
        return generatePrestazioneIncompleta();
      case 'prestazione_duplicata':
        return generatePrestazioneDuplicata();
      case 'codice_sconosciuto':
        return generateCodiceSconsciuto();
      case 'unita_incompatibile':
        return generateUnitaIncompatibile();
      case 'quantita_anomala':
        return generateQuantitaAnomala();
      case 'normale':
        hasAnomalies = false;
        break;
    }
  }
  
  const prestazioniDisponibili = [...prestazioni];
  
  for (let i = 0; i < numeroVoci && prestazioniDisponibili.length > 0; i++) {
    // Seleziona prestazione casuale
    const indexPrestazione = Math.floor(Math.random() * prestazioniDisponibili.length);
    const prestazione = prestazioniDisponibili[indexPrestazione];
    prestazioniDisponibili.splice(indexPrestazione, 1);

    // Importo prestazione (100-1000 euro)
    const importoPrestazione = Math.round((Math.random() * 900 + 100) / 10) * 10;

    // Crea voce prestazione
    const vocePrestazione: VoceFattura = {
      id: voci.length + 1,
      codice: prestazione.codice,
      descrizione: prestazione.descrizione,
      tipo: 'prestazione',
      importoNetto: importoPrestazione,
      importoLordo: importoPrestazione,
      quantita: 1,
      unita: 'prestazione',
      anomalie: []
    };

    voci.push(vocePrestazione);

    // Se la prestazione richiede prodotti
    if (prestazione.richiedeProdotti) {
      // Ottieni prodotti compatibili per questa prestazione
      const prodottiCompatibili = prodotti.filter(p => {
        // Verifica se esiste una combinazione valida prestazione+prodotto
        return isCodiceValido(prestazione.codice + p.codice);
      });

      if (prodottiCompatibili.length > 0) {
        // Numero di prodotti da aggiungere (1-2)
        const numeroProdotti = Math.min(
          Math.floor(Math.random() * 2) + 1,
          prodottiCompatibili.length
        );

        const prodottiSelezionati = [...prodottiCompatibili]
          .sort(() => Math.random() - 0.5)
          .slice(0, numeroProdotti);

        for (const prodotto of prodottiSelezionati) {

        // Usa l'unità del prodotto dal sistema
        let unita = prodotto.unita;

        // Quantità realistica basata su unità
        let quantita = 1;
        if (unita === 'fiala') {
          quantita = Math.floor(Math.random() * 3) + 1; // 1-3 fiale
        } else if (unita === 'ml') {
          quantita = [1, 2, 5, 10][Math.floor(Math.random() * 4)]; // quantità standard
        } else if (unita === 'siringa') {
          quantita = Math.floor(Math.random() * 2) + 1; // 1-2 siringhe
        }

        // Anomalie prodotto
        let importoProdotto = 0;
        const anomalieProdotto: string[] = [];

        // 10% prodotti con prezzo (anomalia)
        if (hasAnomalies && Math.random() < 0.1) {
          importoProdotto = Math.round(Math.random() * 50 + 10);
          anomalieProdotto.push('prodotto_con_prezzo');
        }

        // 15% quantità anomala - usa la soglia del prodotto
        if (hasAnomalies && Math.random() < 0.15) {
          quantita = prodotto.sogliaAnomalia + Math.floor(Math.random() * 50) + 10;
          anomalieProdotto.push('quantita_anomala');
        }

        const voceProdotto: VoceFattura = {
          id: voci.length + 1,
          codice: prestazione.codice + prodotto.codice,
          descrizione: `${prestazione.descrizione} - ${prodotto.nome}`,
          tipo: 'prodotto',
          prestazionePadre: prestazione.codice,
          importoNetto: importoProdotto,
          importoLordo: importoProdotto,
          quantita,
          unita,
          anomalie: anomalieProdotto
        };

        voci.push(voceProdotto);
        }
      }
    } else if (hasAnomalies && prestazione.richiedeProdotti && Math.random() < 0.2) {
      // 20% prestazioni che richiedono prodotti ma non li hanno (anomalia)
      vocePrestazione.anomalie.push('prestazione_incompleta');
    }

    // Prodotto orfano (anomalia)
    if (hasAnomalies && Math.random() < 0.05 && i === numeroVoci - 1) {
      const prodottoOrfano = prodotti[Math.floor(Math.random() * prodotti.length)];
      const voceOrfana: VoceFattura = {
        id: voci.length + 1,
        codice: prodottoOrfano.codice,
        descrizione: prodottoOrfano.nome,
        tipo: 'prodotto',
        importoNetto: 0,
        importoLordo: 0,
        quantita: 1,
        unita: 'unità',
        anomalie: ['prodotto_orfano']
      };
      voci.push(voceOrfana);
    }
  }

  return voci;
}

export function calculateAnomalie(
  voci: VoceFattura[], 
  medicoId: number | null,
  scenario?: string
): string[] {
  const anomalie: string[] = [];

  // Medico mancante
  if (!medicoId) {
    anomalie.push('medico_mancante');
  }

  // Raccogli anomalie dalle voci
  const anomalieVoci = voci.flatMap(v => v.anomalie);
  
  // Aggiungi anomalie uniche
  anomalieVoci.forEach(a => {
    if (!anomalie.includes(a)) {
      anomalie.push(a);
    }
  });

  // Verifica prestazioni duplicate
  const prestazioniCodici = voci
    .filter(v => v.tipo === 'prestazione')
    .map(v => v.codice);
  
  const duplicati = prestazioniCodici.filter((codice, index) => 
    prestazioniCodici.indexOf(codice) !== index
  );
  
  if (duplicati.length > 0) {
    anomalie.push('prestazione_duplicata');
  }

  // Verifica codici validi
  const codiciNonValidi = voci.filter(v => {
    const parsed = parseCodiceFattura(v.codice);
    return !isCodiceValido(parsed.prestazione + (parsed.accessorio || ''));
  });

  if (codiciNonValidi.length > 0) {
    anomalie.push('codice_sconosciuto');
  }

  // Verifica unità compatibili per prodotti
  voci.forEach(voce => {
    if (voce.tipo === 'prodotto') {
      const parsed = parseCodiceFattura(voce.codice);
      if (parsed.valido && parsed.accessorio && parsed.isProdotto) {
        const prodotto = prodottiMap[parsed.accessorio];
        if (prodotto && prodotto.unita !== voce.unita) {
          if (!anomalie.includes('unita_incompatibile')) {
            anomalie.push('unita_incompatibile');
          }
          // Aggiungi anomalia anche alla voce specifica
          if (!voce.anomalie.includes('unita_incompatibile')) {
            voce.anomalie.push('unita_incompatibile');
          }
        }
      }
    }
  });

  // Verifica quantità anomale per prodotti
  voci.forEach(voce => {
    if (voce.tipo === 'prodotto') {
      const parsed = parseCodiceFattura(voce.codice);
      if (parsed.valido && parsed.accessorio && parsed.isProdotto) {
        if (isQuantitaAnomala(parsed.accessorio, voce.quantita)) {
          if (!anomalie.includes('quantita_anomala')) {
            anomalie.push('quantita_anomala');
          }
          // Aggiungi anomalia anche alla voce specifica se non presente
          if (!voce.anomalie.includes('quantita_anomala')) {
            voce.anomalie.push('quantita_anomala');
          }
        }
      }
    }
  });

  return anomalie;
}

export function generateNumeroFattura(progressivo: number, serie: string): string {
  const anno = new Date().getFullYear();
  const numero = progressivo.toString().padStart(4, '0');
  return `${serie}/${anno}/${numero}`;
}

// Helper functions per generare specifiche anomalie
function generateProdottoConPrezzo(): VoceFattura[] {
  return [
    {
      id: 1,
      codice: '3FLL',
      descrizione: 'Filler labbra',
      tipo: 'prestazione',
      importoNetto: 300,
      importoLordo: 366,
      quantita: 1,
      unita: 'prestazione',
      anomalie: []
    },
    {
      id: 2,
      codice: '3FLLAFL',
      descrizione: 'Filler labbra - Acido ialuronico',
      tipo: 'prodotto',
      prestazionePadre: '3FLL',
      importoNetto: 50, // ANOMALIA: prodotto con prezzo
      importoLordo: 61,
      quantita: 2,
      unita: 'fiala',
      anomalie: ['prodotto_con_prezzo']
    }
  ];
}

function generateProdottoOrfano(): VoceFattura[] {
  return [
    {
      id: 1,
      codice: 'AFL', // ANOMALIA: prodotto senza prestazione
      descrizione: 'Acido ialuronico',
      tipo: 'prodotto',
      importoNetto: 0,
      importoLordo: 0,
      quantita: 2,
      unita: 'fiala',
      anomalie: ['prodotto_orfano']
    }
  ];
}

function generatePrestazioneIncompleta(): VoceFattura[] {
  return [
    {
      id: 1,
      codice: '3FLL', // Prestazione che richiede prodotti ma non li ha
      descrizione: 'Filler labbra',
      tipo: 'prestazione',
      importoNetto: 300,
      importoLordo: 366,
      quantita: 1,
      unita: 'prestazione',
      anomalie: ['prestazione_incompleta']
    }
  ];
}

function generatePrestazioneDuplicata(): VoceFattura[] {
  return [
    {
      id: 1,
      codice: '2BOT',
      descrizione: 'Botulino',
      tipo: 'prestazione',
      importoNetto: 350,
      importoLordo: 427,
      quantita: 1,
      unita: 'prestazione',
      anomalie: []
    },
    {
      id: 2,
      codice: '2BOT', // ANOMALIA: stesso codice prestazione
      descrizione: 'Botulino',
      tipo: 'prestazione',
      importoNetto: 350,
      importoLordo: 427,
      quantita: 1,
      unita: 'prestazione',
      anomalie: ['prestazione_duplicata']
    }
  ];
}

function generateCodiceSconsciuto(): VoceFattura[] {
  return [
    {
      id: 1,
      codice: '9XXX', // ANOMALIA: codice non nel sistema
      descrizione: 'Trattamento sconosciuto',
      tipo: 'prestazione',
      importoNetto: 200,
      importoLordo: 244,
      quantita: 1,
      unita: 'prestazione',
      anomalie: ['codice_sconosciuto']
    }
  ];
}

function generateUnitaIncompatibile(): VoceFattura[] {
  // Trova un prodotto con unità 'ml' per creare l'anomalia
  const prodottoMl = prodotti.find(p => p.unita === 'ml' && isCodiceValido('3FLL' + p.codice));
  if (!prodottoMl) {
    // Fallback nel caso non trovi prodotti adatti
    return generateProdottoConPrezzo();
  }

  return [
    {
      id: 1,
      codice: '3FLL',
      descrizione: 'Filler labbra',
      tipo: 'prestazione',
      importoNetto: 400,
      importoLordo: 488,
      quantita: 1,
      unita: 'prestazione',
      anomalie: []
    },
    {
      id: 2,
      codice: '3FLL' + prodottoMl.codice,
      descrizione: `Filler labbra - ${prodottoMl.nome}`,
      tipo: 'prodotto',
      prestazionePadre: '3FLL',
      importoNetto: 0,
      importoLordo: 0,
      quantita: 2,
      unita: 'fiala', // ANOMALIA: il prodotto ha unità 'ml'
      anomalie: ['unita_incompatibile']
    }
  ];
}

function generateQuantitaAnomala(): VoceFattura[] {
  // Lista di combinazioni valide note per generare quantità anomale
  const combinazioniValide = [
    { prestazione: 'FLL', prodotto: 'AFL', descPrest: 'Filler labbra' },
    { prestazione: 'FLV', prodotto: 'AEV', descPrest: 'Filler viso' },
    { prestazione: '1TOX', prodotto: 'VEX', descPrest: 'Tossina botulinica 100U' },
    { prestazione: '2TOX', prodotto: 'BCO', descPrest: 'Tossina botulinica 50U' }
  ];
  
  // Seleziona una combinazione casuale
  const combo = combinazioniValide[Math.floor(Math.random() * combinazioniValide.length)];
  const prodotto = prodotti.find(p => p.codice === combo.prodotto);
  
  if (!prodotto) {
    // Fallback con valori hardcoded per garantire quantità anomala
    return [
      {
        id: 1,
        codice: 'FLL',
        descrizione: 'Filler labbra',
        tipo: 'prestazione',
        importoNetto: 400,
        importoLordo: 488,
        quantita: 1,
        unita: 'prestazione',
        anomalie: []
      },
      {
        id: 2,
        codice: 'FLLAFL',
        descrizione: 'Filler labbra - Acido ialuronico',
        tipo: 'prodotto',
        prestazionePadre: 'FLL',
        importoNetto: 0,
        importoLordo: 0,
        quantita: 200, // Quantità molto alta per garantire anomalia
        unita: 'fiala',
        anomalie: ['quantita_anomala']
      }
    ];
  }

  // Genera quantità sicuramente anomala (molto alta)
  const quantitaAnomala = Math.max(100, prodotto.sogliaAnomalia * 10 + Math.floor(Math.random() * 100));

  return [
    {
      id: 1,
      codice: combo.prestazione,
      descrizione: combo.descPrest,
      tipo: 'prestazione',
      importoNetto: 400,
      importoLordo: 488,
      quantita: 1,
      unita: 'prestazione',
      anomalie: []
    },
    {
      id: 2,
      codice: combo.prestazione + combo.prodotto,
      descrizione: `${combo.descPrest} - ${prodotto.nome}`,
      tipo: 'prodotto',
      prestazionePadre: combo.prestazione,
      importoNetto: 0,
      importoLordo: 0,
      quantita: quantitaAnomala,
      unita: prodotto.unita,
      anomalie: ['quantita_anomala']
    }
  ];
}