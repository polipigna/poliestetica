// src/data/mock/index.ts

// Import tutti i file JSON
import codiciData from '../codici_poliestetica_app.json';
import pazientiData from './pazienti.json';
import regoleCostiData from './medici-regole.json';
import utentiData from './utenti.json';

// ==================== TYPES ====================
export interface Utente {
  id: number;
  username: string;
  password: string;
  nome: string;
  ruolo: 'admin' | 'segretaria' | 'responsabile';
  email: string;
}

export interface Medico {
  id: number;
  nome: string;
  cognome: string;
  nomeCompleto: string;
  cf: string;
  piva: string;
}

export interface Prestazione {
  codice: string;
  descrizione: string;
  richiedeProdotti: boolean;
  richiedeMacchinario: boolean;
}

export interface Prodotto {
  codice: string;
  nome: string;
  unita: string;
  prezzoDefault: number;
  sogliaAnomalia: number;
}

export interface Macchinario {
  codice: string;
  nome: string;
}

export interface Combinazione {
  codice: string;
  prestazione: string;
  accessorio: string | null;
  tipo: 'prestazione' | 'prestazione+prodotto' | 'prestazione+macchinario';
}

export interface RegolaCompenso {
  tipo: 'percentuale' | 'scaglioni' | 'quota_fissa' | 'fisso';
  valore?: number;
  valoreX?: number;
  valoreY?: number;
  calcolaSu: 'netto' | 'lordo';
  detraiCosti: boolean;
}

export interface EccezioneCompenso extends RegolaCompenso {
  codice: string;
}

export interface MedicoRegoleCosti {
  medicoId: number;
  nome: string;
  regolaBase: RegolaCompenso;
  eccezioni: EccezioneCompenso[];
  costiProdotti: { [codiceProdotto: string]: number };
}

export interface VoceFattura {
  id: number;
  codice: string;
  descrizione: string;
  tipo: 'prestazione' | 'prodotto';
  prestazionePadre?: string;
  importoNetto: number;
  importoLordo: number;
  quantita: number;
  unita: string;
  anomalie: string[];
}

export interface Fattura {
  id: number;
  numero: string;
  serie: string;
  data: string;
  paziente: string;
  medicoId: number | null;
  medicoNome: string | null;
  imponibile: number;
  iva: number;
  totale: number;
  conIva: boolean;
  stato: 'da_importare' | 'verificata' | 'importata' | 'anomalia';
  importata: boolean;
  anomalie: string[];
  voci: VoceFattura[];
}

// ==================== ESTRAZIONE MEDICI DA REGOLE ====================
// Estrai i medici dal file medici-regole
export const medici: Medico[] = Object.values(regoleCostiData).map((regola: any) => {
  // Rimuovi titolo e splitta nome/cognome
  const nomeCompleto = regola.nome;
  const nomeSenzaTitolo = nomeCompleto.replace(/^(Dott\.?|Dott\.ssa)\s+/, '');
  const partiNome = nomeSenzaTitolo.split(' ');
  
  // Assume che il primo sia il nome e il resto sia cognome
  const nome = partiNome[0];
  const cognome = partiNome.slice(1).join(' ');
  
  // Genera CF e PIVA fittizi ma realistici
  const cfBase = `${cognome.toUpperCase().substring(0, 3)}${nome.toUpperCase().substring(0, 3)}`;
  const annoNascita = 60 + Math.floor(regola.medicoId * 3); // Anni '60-'90
  const genere = nomeCompleto.includes('Dott.ssa') ? 'F' : 'M';
  const giorno = genere === 'F' ? 40 + regola.medicoId : regola.medicoId;
  
  return {
    id: regola.medicoId,
    nome: nome,
    cognome: cognome,
    nomeCompleto: nomeCompleto,
    cf: `${cfBase}${annoNascita}${genere}${giorno < 10 ? '0' + giorno : giorno}H501X`,
    piva: `0${regola.medicoId}234567890`.padEnd(11, '0').substring(0, 11)
  };
});

// ==================== EXPORTS DA CODICI ====================
// Arrays originali
export const prestazioni: Prestazione[] = codiciData.prestazioni;
export const prodotti: Prodotto[] = codiciData.prodotti;
export const macchinari: Macchinario[] = codiciData.macchinari;
export const combinazioni: Combinazione[] = codiciData.combinazioni as Combinazione[];

// Mappe per accesso rapido
export const prestazioniMap: { [key: string]: Prestazione } = Object.fromEntries(
  prestazioni.map(p => [p.codice, p])
);
export const prodottiMap: { [key: string]: Prodotto } = Object.fromEntries(
  prodotti.map(p => [p.codice, p])
);
export const macchinariMap: { [key: string]: Macchinario } = Object.fromEntries(
  macchinari.map(m => [m.codice, m])
);

// ==================== ALTRI EXPORTS ====================
export const pazienti: string[] = pazientiData;
export const utenti: Utente[] = utentiData.utenti as Utente[];
export const mediciRegoleCosti: { [key: string]: MedicoRegoleCosti } = regoleCostiData as { [key: string]: MedicoRegoleCosti };

// ==================== HELPER FUNCTIONS ====================

/**
 * Ottiene un medico per ID
 */
export function getMedicoById(id: number): Medico | undefined {
  return medici.find(m => m.id === id);
}

/**
 * Ottiene un utente per username
 */
export function getUtenteByUsername(username: string): Utente | undefined {
  return utenti.find(u => u.username === username);
}

/**
 * Valida credenziali utente
 */
export function validaCredenziali(username: string, password: string): Utente | null {
  const utente = utenti.find(u => 
    u.username === username && u.password === password
  );
  return utente || null;
}

/**
 * Ottiene il costo di un prodotto per un medico
 */
export function getCostoProdotto(medicoId: number, codiceProdotto: string): number {
  const regole = mediciRegoleCosti[medicoId.toString()];
  
  if (!regole) {
    const prodotto = prodottiMap[codiceProdotto];
    return prodotto?.prezzoDefault || 0;
  }
  
  // Costo personalizzato o default
  if (regole.costiProdotti[codiceProdotto] !== undefined) {
    return regole.costiProdotti[codiceProdotto];
  }
  
  const prodotto = prodottiMap[codiceProdotto];
  return prodotto?.prezzoDefault || 0;
}

/**
 * Valida se un codice è nel sistema
 */
export function isCodiceValido(codice: string): boolean {
  return combinazioni.some(c => c.codice === codice);
}

/**
 * Parsa un codice fattura [N]PPP[MMM]
 */
export function parseCodiceFattura(codice: string) {
  // Prima cerca il codice completo (con eventuale cifra iniziale)
  let combinazione = combinazioni.find(c => c.codice === codice);
  
  // Se non trova, prova rimuovendo la cifra IVA iniziale se presente
  if (!combinazione) {
    const codiceUtile = codice.replace(/^\d/, '');
    combinazione = combinazioni.find(c => c.codice === codiceUtile);
  }
  
  if (combinazione) {
    return {
      valido: true,
      tipo: combinazione.tipo,
      prestazione: combinazione.prestazione,
      accessorio: combinazione.accessorio,
      codicePulito: combinazione.codice,
      isPrestazione: combinazione.tipo === 'prestazione',
      isProdotto: combinazione.tipo === 'prestazione+prodotto',
      isMacchinario: combinazione.tipo === 'prestazione+macchinario'
    };
  }
  
  return {
    valido: false,
    codicePulito: codice,
    tipo: null,
    prestazione: null,
    accessorio: null,
    isPrestazione: false,
    isProdotto: false,
    isMacchinario: false
  };
}

/**
 * Ottiene le combinazioni valide per una prestazione
 */
export function getCombinazioniValide(codicePrestazione: string): string[] {
  return combinazioni
    .filter(c => c.prestazione === codicePrestazione && c.accessorio !== null)
    .map(c => c.accessorio as string);
}

/**
 * Ottiene i prodotti validi per una prestazione
 */
export function getProdottiValidiPerPrestazione(codicePrestazione: string): Prodotto[] {
  const codiciProdotti = getCombinazioniValide(codicePrestazione);
  return prodotti.filter(p => codiciProdotti.includes(p.codice));
}

/**
 * Verifica se una prestazione richiede prodotti
 */
export function prestazioneRichiedeProdotti(codicePrestazione: string): boolean {
  return prestazioniMap[codicePrestazione]?.richiedeProdotti || false;
}

/**
 * Verifica se una prestazione richiede macchinario
 */
export function prestazioneRichiedeMacchinario(codicePrestazione: string): boolean {
  return prestazioniMap[codicePrestazione]?.richiedeMacchinario || false;
}

/**
 * Ottiene la regola compenso per medico e prestazione
 */
export function getRegolaCompenso(medicoId: number, codicePrestazione: string): RegolaCompenso {
  const regole = mediciRegoleCosti[medicoId.toString()];
  if (!regole) {
    throw new Error(`Regole non trovate per medico ${medicoId}`);
  }
  
  // Cerca nelle eccezioni
  const eccezione = regole.eccezioni.find(e => e.codice === codicePrestazione);
  if (eccezione) {
    const { codice, ...regola } = eccezione;
    return regola;
  }
  
  // Usa regola base
  return regole.regolaBase;
}

/**
 * Calcola il totale costi prodotti
 */
export function calcolaCostiProdotti(
  medicoId: number, 
  vociProdotti: VoceFattura[]
): number {
  return vociProdotti.reduce((totale, voce) => {
    const parsed = parseCodiceFattura(voce.codice);
    if (parsed.valido && parsed.accessorio && parsed.isProdotto) {
      const costoProdotto = getCostoProdotto(medicoId, parsed.accessorio);
      return totale + (costoProdotto * voce.quantita);
    }
    return totale;
  }, 0);
}

/**
 * Calcola il compenso secondo la regola
 */
export function calcolaCompenso(
  importoBase: number,
  costiProdotti: number,
  regola: RegolaCompenso
): number {
  let base = importoBase;
  
  // Detrai costi se richiesto
  if (regola.detraiCosti) {
    base = Math.max(0, base - costiProdotti);
  }
  
  // Applica regola
  switch (regola.tipo) {
    case 'percentuale':
      return base * ((regola.valore || 0) / 100);
      
    case 'fisso':
      return regola.valore || 0;
      
    case 'scaglioni':
      if (!regola.valoreX || !regola.valoreY) return 0;
      const scaglioni = Math.floor(base / regola.valoreY);
      return scaglioni * regola.valoreX;
      
    case 'quota_fissa':
      // Gestito altrove (per conteggio prestazioni)
      return 0;
      
    default:
      return 0;
  }
}

/**
 * Verifica anomalie quantità
 */
export function isQuantitaAnomala(codiceProdotto: string, quantita: number): boolean {
  const prodotto = prodottiMap[codiceProdotto];
  if (!prodotto) return false;
  return quantita > prodotto.sogliaAnomalia;
}

/**
 * Ottiene le voci prodotto per una prestazione
 */
export function getVociProdottiPerPrestazione(
  voci: VoceFattura[], 
  codicePrestazione: string
): VoceFattura[] {
  return voci.filter(v => 
    v.tipo === 'prodotto' && 
    v.prestazionePadre === codicePrestazione
  );
}

// ==================== TIPI ANOMALIE ====================
export const TIPI_ANOMALIE = {
  MEDICO_MANCANTE: 'medico_mancante',
  PRODOTTO_CON_PREZZO: 'prodotto_con_prezzo',
  PRODOTTO_ORFANO: 'prodotto_orfano',
  PRESTAZIONE_INCOMPLETA: 'prestazione_incompleta',
  PRESTAZIONE_DUPLICATA: 'prestazione_duplicata',
  CODICE_SCONOSCIUTO: 'codice_sconosciuto',
  UNITA_INCOMPATIBILE: 'unita_incompatibile',
  QUANTITA_ANOMALA: 'quantita_anomala'
} as const;

// ==================== COSTANTI ====================
export const SERIE_FATTURE_VALIDE = ['P', 'IVA', 'M'];
export const ALIQUOTA_IVA = 0.22;
export const UNITA_MISURA = ['fiala', 'ml', 'siringa', 'unità', 'confezione', 'flacone', 'pz', 'filo'] as const;

// ==================== STATISTICHE MOCK ====================
export const MOCK_STATS = {
  totaliCodici: combinazioni.length,
  prestazioni: prestazioni.length,
  prodotti: prodotti.length,
  macchinari: macchinari.length,
  medici: medici.length,
  pazienti: pazienti.length,
  utenti: utenti.length
};