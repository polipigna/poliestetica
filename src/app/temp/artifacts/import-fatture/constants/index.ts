/**
 * Costanti business domain per il sistema fatture
 */

// ========================================
// ALIQUOTE IVA
// ========================================
/**
 * Aliquota IVA standard italiana (22%)
 * Utilizzata per la maggior parte dei servizi e prodotti
 */
export const ALIQUOTA_IVA_STANDARD = 22;

/**
 * Serie di fatture che applicano l'IVA
 * Le altre serie (principale/P, MEDICI/M) sono esenti
 */
export const SERIE_CON_IVA = ['IVA'] as const;

// ========================================
// SERIE FATTURE
// ========================================
/**
 * Serie fatture valide nel sistema
 * P = Principale (esente IVA)
 * IVA = Con IVA
 * M = Medici (esente IVA)
 */
export const SERIE_FATTURE_VALIDE = ['P', 'IVA', 'M'] as const;
export type SerieFattura = typeof SERIE_FATTURE_VALIDE[number];

/**
 * Mapping serie per retrocompatibilità
 */
export const SERIE_MAPPING: Record<string, SerieFattura> = {
  'principale': 'P',
  'P': 'P',
  'IVA': 'IVA', 
  'medici': 'M',
  'MEDICI': 'M',
  'M': 'M'
};

// ========================================
// STATI FATTURA
// ========================================
export const STATI_FATTURA = {
  DA_IMPORTARE: 'da_importare',
  IMPORTATA: 'importata',
  ANOMALIA: 'anomalia',
  ERRORE: 'errore'
} as const;

export type StatoFattura = typeof STATI_FATTURA[keyof typeof STATI_FATTURA];

// ========================================
// UNITÀ DI MISURA
// ========================================
/**
 * Unità di misura utilizzate nel sistema
 * Basate sui dati reali del mock
 */
export const UNITA_MISURA = {
  FIALA: 'fiala',
  ML: 'ml',
  SIRINGA: 'siringa',
  UNITA: 'unità',
  CONFEZIONE: 'confezione',
  FLACONE: 'flacone',
  PEZZO: 'pz',
  FILO: 'filo',
  PRESTAZIONE: 'prestazione',
  UTILIZZO: 'utilizzo'
} as const;

export type UnitaMisura = typeof UNITA_MISURA[keyof typeof UNITA_MISURA];

/**
 * Array di tutte le unità di misura (per validazione)
 */
export const UNITA_MISURA_ARRAY = Object.values(UNITA_MISURA);

// ========================================
// TIPI VOCE FATTURA
// ========================================
export const TIPI_VOCE = {
  PRESTAZIONE: 'prestazione',
  PRODOTTO: 'prodotto',
  MACCHINARIO: 'macchinario'
} as const;

export type TipoVoce = typeof TIPI_VOCE[keyof typeof TIPI_VOCE];

// ========================================
// EXPORT/IMPORT
// ========================================
/**
 * Nome del foglio Excel per l'export
 */
export const EXCEL_SHEET_NAME = 'Fatture';

/**
 * Estensioni file supportate per l'import
 */
export const FILE_EXTENSIONS_SUPPORTED = ['.xlsx', '.xls', '.csv'] as const;

/**
 * Dimensione massima file per l'upload (in MB)
 */
export const MAX_FILE_SIZE_MB = 10;