import { VoceFattura, prestazioni, prodotti, parseCodiceFattura, isCodiceyValido as isCodiceValido } from '@/data/mock';

// Mapping unità di misura per prodotti
const unitaMisuraMapping: { [key: string]: string[] } = {
  'fiala': ['TOX', 'FIL', 'RES', 'BIO'],
  'ml': ['SKN', 'MES', 'PRP', 'ACI'],
  'unità': ['THR', 'SUP', 'PEE'],
  'applicazione': ['LAS', 'IPL', 'CRY', 'RAD', 'ULT', 'CAV']
};

export function generateVociFattura(
  numeroVoci: number, 
  hasAnomalies: boolean,
  scenario?: string
): VoceFattura[] {
  const voci: VoceFattura[] = [];
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

        // Determina unità di misura
        let unita = 'unità';
        for (const [unit, prefixes] of Object.entries(unitaMisuraMapping)) {
          if (prefixes.some(prefix => prodotto.codice.startsWith(prefix))) {
            unita = unit;
            break;
          }
        }

        // Quantità realistica basata su unità
        let quantita = 1;
        if (unita === 'fiala') {
          quantita = Math.floor(Math.random() * 3) + 1; // 1-3 fiale
        } else if (unita === 'ml') {
          quantita = [1, 2, 5, 10][Math.floor(Math.random() * 4)]; // quantità standard
        }

        // Anomalie prodotto
        let importoProdotto = 0;
        const anomalieProdotto: string[] = [];

        // 10% prodotti con prezzo (anomalia)
        if (hasAnomalies && Math.random() < 0.1) {
          importoProdotto = Math.round(Math.random() * 50 + 10);
          anomalieProdotto.push('prodotto_con_prezzo');
        }

        // 5% quantità anomala
        if (hasAnomalies && Math.random() < 0.05) {
          quantita = Math.floor(Math.random() * 50) + 10;
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

  return anomalie;
}

export function generateNumeroFattura(progressivo: number, conIva: boolean): string {
  const anno = new Date().getFullYear();
  const numero = progressivo.toString().padStart(4, '0');
  const suffisso = conIva ? 'IVA' : '';
  return `FT/${anno}/${numero}${suffisso}`;
}