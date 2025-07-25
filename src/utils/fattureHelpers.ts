import { VoceFattura, prestazioni, prodotti, parseCodiceFattura, isCodiceValido, prodottiMap, isQuantitaAnomala } from '@/data/mock';

export function generateVociFattura(
  numeroVoci: number, 
  hasAnomalies: boolean,
  scenario?: string
): VoceFattura[] {
  // Per scenari specifici di anomalia, usa le funzioni helper dedicate
  if (scenario && scenario !== 'normale' && scenario !== 'medico_mancante') {
    switch (scenario) {
      case 'prodotto_con_prezzo':
        return generateProdottoConPrezzo();
      case 'prodotto_orfano':
        return generateProdottoOrfano();
      case 'prestazione_incompleta':
        return generatePrestazioneIncompleta();
      case 'prestazione_duplicata':
        return generatePrestazioneDuplicata();
      case 'prestazione_senza_macchinario':
        return generatePrestazioneSenzaMacchinario();
      case 'codice_sconosciuto':
        return generateCodiceSconsciuto();
      case 'unita_incompatibile':
        return generateUnitaIncompatibile();
      case 'quantita_anomala':
        return generateQuantitaAnomala();
    }
  }
  
  // Per fatture normali o medico_mancante, genera voci standard
  return generateVociStandard(numeroVoci);
}

function generateVociStandard(numeroVoci: number): VoceFattura[] {
  const voci: VoceFattura[] = [];
  const prestazioniDisponibili = [...prestazioni];
  
  for (let i = 0; i < numeroVoci && prestazioniDisponibili.length > 0; i++) {
    const indexPrestazione = Math.floor(Math.random() * prestazioniDisponibili.length);
    const prestazione = prestazioniDisponibili[indexPrestazione];
    prestazioniDisponibili.splice(indexPrestazione, 1);

    const importoPrestazione = Math.round((Math.random() * 900 + 100) / 10) * 10;

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

    // Aggiungi prodotti se la prestazione li richiede
    if (prestazione.richiedeProdotti) {
      const prodottiCompatibili = prodotti.filter(p => 
        isCodiceValido(prestazione.codice + p.codice)
      );

      if (prodottiCompatibili.length > 0) {
        const numeroProdotti = Math.min(
          Math.floor(Math.random() * 2) + 1,
          prodottiCompatibili.length
        );

        const prodottiSelezionati = [...prodottiCompatibili]
          .sort(() => Math.random() - 0.5)
          .slice(0, numeroProdotti);

        for (const prodotto of prodottiSelezionati) {
          let quantita = generateQuantitaStandard(prodotto.unita);

          const voceProdotto: VoceFattura = {
            id: voci.length + 1,
            codice: prestazione.codice + prodotto.codice,
            descrizione: `${prestazione.descrizione} - ${prodotto.nome}`,
            tipo: 'prodotto',
            prestazionePadre: prestazione.codice,
            importoNetto: 0,
            importoLordo: 0,
            quantita,
            unita: prodotto.unita,
            anomalie: []
          };

          voci.push(voceProdotto);
        }
      }
    }
  }

  return voci;
}

function generateQuantitaStandard(unita: string): number {
  switch (unita) {
    case 'fiala':
      return Math.floor(Math.random() * 3) + 1; // 1-3
    case 'ml':
      return [1, 2, 5, 10][Math.floor(Math.random() * 4)];
    case 'siringa':
      return Math.floor(Math.random() * 2) + 1; // 1-2
    default:
      return 1;
  }
}

export function calculateAnomalie(
  voci: VoceFattura[], 
  medicoId: number | null
): string[] {
  const anomalie: string[] = [];

  // 1. Medico mancante
  if (!medicoId) {
    anomalie.push('medico_mancante');
  }

  // 2. Anomalie già presenti nelle voci
  voci.forEach(voce => {
    voce.anomalie.forEach(a => {
      if (!anomalie.includes(a)) {
        anomalie.push(a);
      }
    });
  });

  // 3. Verifica prestazioni duplicate
  const prestazioniCodici = voci
    .filter(v => v.tipo === 'prestazione')
    .map(v => v.codice);
  
  const hasDuplicati = prestazioniCodici.some((codice, index) => 
    prestazioniCodici.indexOf(codice) !== index
  );
  
  if (hasDuplicati) {
    anomalie.push('prestazione_duplicata');
  }

  // 4. Verifica codici sconosciuti
  const hasCodiciInvalidi = voci.some(v => {
    const parsed = parseCodiceFattura(v.codice);
    // Un codice è sconosciuto se:
    // 1. Non è valido secondo il parser
    // 2. O non è riconosciuto nel sistema delle combinazioni valide
    if (!parsed.valido) return true;
    
    // Per le prestazioni, verifica se il codice esiste
    if (v.tipo === 'prestazione') {
      const prestazioneValida = prestazioni.some(p => p.codice === v.codice);
      return !prestazioneValida;
    }
    
    // Per i prodotti, verifica la combinazione
    return !isCodiceValido(v.codice);
  });

  if (hasCodiciInvalidi) {
    anomalie.push('codice_sconosciuto');
  }

  // 5. Verifica unità incompatibili e quantità anomale per prodotti
  voci.forEach(voce => {
    if (voce.tipo === 'prodotto') {
      const parsed = parseCodiceFattura(voce.codice);
      if (parsed.valido && parsed.accessorio && parsed.isProdotto) {
        const prodotto = prodottiMap[parsed.accessorio];
        
        // Unità incompatibile
        if (prodotto && prodotto.unita !== voce.unita && !anomalie.includes('unita_incompatibile')) {
          anomalie.push('unita_incompatibile');
        }
        
        // Quantità anomala
        if (isQuantitaAnomala(parsed.accessorio, voce.quantita) && !anomalie.includes('quantita_anomala')) {
          anomalie.push('quantita_anomala');
        }
      }
    }
  });

  // 6. Verifica prodotti orfani
  const hasProdottoOrfano = voci.some(v => 
    v.tipo === 'prodotto' && !v.prestazionePadre
  );
  
  if (hasProdottoOrfano && !anomalie.includes('prodotto_orfano')) {
    anomalie.push('prodotto_orfano');
  }

  // 7. Verifica prodotti con prezzo
  const hasProdottoConPrezzo = voci.some(v => 
    v.tipo === 'prodotto' && v.importoNetto > 0
  );
  
  if (hasProdottoConPrezzo && !anomalie.includes('prodotto_con_prezzo')) {
    anomalie.push('prodotto_con_prezzo');
  }

  // 8. Verifica prestazioni incomplete
  const prestazioniCheBisognanoProdotti = prestazioni
    .filter(p => p.richiedeProdotti)
    .map(p => p.codice);
    
  const prestazioniCheBisognanoMacchinari = prestazioni
    .filter(p => p.richiedeMacchinario)
    .map(p => p.codice);
    
  const hasPrestazioneIncompleta = voci.some(voce => {
    if (voce.tipo === 'prestazione') {
      // Verifica se richiede prodotti
      if (prestazioniCheBisognanoProdotti.includes(voce.codice)) {
        const hasProdotti = voci.some(v => 
          v.tipo === 'prodotto' && v.prestazionePadre === voce.codice
        );
        if (!hasProdotti) return true;
      }
      
      // Verifica se richiede macchinari
      if (prestazioniCheBisognanoMacchinari.includes(voce.codice)) {
        const hasMacchinari = voci.some(v => {
          // Cerca voci che abbiano il codice della prestazione + codice macchinario
          return v.codice.startsWith(voce.codice) && v.codice !== voce.codice;
        });
        if (!hasMacchinari) {
          // Usa una diversa anomalia per macchinari mancanti
          if (!anomalie.includes('prestazione_senza_macchinario')) {
            anomalie.push('prestazione_senza_macchinario');
          }
          return false; // Non è prestazione_incompleta
        }
      }
    }
    return false;
  });
  
  if (hasPrestazioneIncompleta && !anomalie.includes('prestazione_incompleta')) {
    anomalie.push('prestazione_incompleta');
  }

  return anomalie;
}

export function generateNumeroFattura(progressivo: number, serie: string): string {
  const anno = new Date().getFullYear();
  const numero = progressivo.toString().padStart(4, '0');
  return `${serie}/${anno}/${numero}`;
}

// ========== HELPER FUNCTIONS PER SCENARI DI ANOMALIA ==========

function generateProdottoConPrezzo(): VoceFattura[] {
  return [
    {
      id: 1,
      codice: 'FLL',
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
      codice: 'FLLAFL',
      descrizione: 'Filler labbra - Acido ialuronico',
      tipo: 'prodotto',
      prestazionePadre: 'FLL',
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
      codice: 'FLLAFL', // Codice prodotto valido ma senza prestazione FLL
      descrizione: 'Filler labbra - Acido ialuronico',
      tipo: 'prodotto',
      prestazionePadre: undefined, // Manca la prestazione padre
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
      codice: 'FLL', // Prestazione che richiede prodotti ma non li ha
      descrizione: 'Filler labbra',
      tipo: 'prestazione',
      importoNetto: 300,
      importoLordo: 300,
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
      codice: '2TOX',
      descrizione: 'Tossina bruxismo',
      tipo: 'prestazione',
      importoNetto: 350,
      importoLordo: 350,
      quantita: 1,
      unita: 'prestazione',
      anomalie: []
    },
    {
      id: 2,
      codice: '2TOX', // Stesso codice prestazione (duplicato)
      descrizione: 'Tossina bruxismo',
      tipo: 'prestazione',
      importoNetto: 350,
      importoLordo: 350,
      quantita: 1,
      unita: 'prestazione',
      anomalie: []
    }
  ];
}

function generatePrestazioneSenzaMacchinario(): VoceFattura[] {
  // Usa prestazioni che richiedono macchinario
  const prestazioniConMacchinario = ['RMT', 'RMM', 'EPL', 'RMC', 'RNV', 'RMP'];
  const codicePrestazione = prestazioniConMacchinario[Math.floor(Math.random() * prestazioniConMacchinario.length)];
  
  return [
    {
      id: 1,
      codice: codicePrestazione, // Es: RMM - Rimozione macchie
      descrizione: getDescrizionePrestazione(codicePrestazione),
      tipo: 'prestazione',
      importoNetto: 350,
      importoLordo: 350,
      quantita: 1,
      unita: 'prestazione',
      anomalie: ['prestazione_senza_macchinario']
    }
    // Manca intenzionalmente la voce del macchinario (es: RMMCHR)
  ];
}

function generateCodiceSconsciuto(): VoceFattura[] {
  // Array di codici che NON esistono nelle combinazioni
  // ATTENZIONE: RMM, RMT, EPL sono codici VALIDI che richiedono macchinario
  const codiciNonValidi = ['XXX', 'YYY', 'ZZZ', 'ABC', 'DEF', 'GHI', 'JKL', 'MNO'];
  const codiceInvalido = codiciNonValidi[Math.floor(Math.random() * codiciNonValidi.length)];
  
  return [
    {
      id: 1,
      codice: codiceInvalido, // Codice non valido nel sistema
      descrizione: `${codiceInvalido} - Codice non riconosciuto`,
      tipo: 'prodotto',
      prestazionePadre: undefined,
      importoNetto: 0,
      importoLordo: 0,
      quantita: 2,
      unita: 'fiala',
      anomalie: ['codice_sconosciuto']
    }
  ];
}

function getDescrizionePrestazione(codice: string): string {
  const descrizioni: Record<string, string> = {
    'RMT': 'Rimozione tatuaggi',
    'RMM': 'Rimozione macchie',
    'EPL': 'Epilazione',
    'RMC': 'Rimozione cicatrici',
    'RNV': 'Ringiovanimento viso',
    'RMP': 'Rimozione capillari'
  };
  return descrizioni[codice] || 'Prestazione';
}

function generateUnitaIncompatibile(): VoceFattura[] {
  return [
    {
      id: 1,
      codice: '1TOX',
      descrizione: 'Tossina iperidrosi',
      tipo: 'prestazione',
      importoNetto: 400,
      importoLordo: 400,
      quantita: 1,
      unita: 'prestazione',
      anomalie: []
    },
    {
      id: 2,
      codice: '1TOXVEX', // VEX usa 'unità', non 'fiala'
      descrizione: 'Tossina iperidrosi - Vistabex',
      tipo: 'prodotto',
      prestazionePadre: '1TOX',
      importoNetto: 0,
      importoLordo: 0,
      quantita: 2,
      unita: 'fiala', // Unità sbagliata: VEX usa 'unità'
      anomalie: ['unita_incompatibile']
    }
  ];
}

function generateQuantitaAnomala(): VoceFattura[] {
  return [
    {
      id: 1,
      codice: 'FLL',
      descrizione: 'Filler labbra',
      tipo: 'prestazione',
      importoNetto: 400,
      importoLordo: 400,
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
      quantita: 500, // Quantità anomala (soglia normale: 10)
      unita: 'fiala',
      anomalie: ['quantita_anomala']
    }
  ];
}