/**
 * Funzioni di calcolo per l'import delle fatture
 */

import { ALIQUOTA_IVA_STANDARD } from '../constants';

/**
 * Calcola l'imponibile totale da un array di voci
 */
export const calculateTotaleImponibile = (voci: Array<{ imponibile?: number }>): number => {
  if (!Array.isArray(voci)) return 0;
  
  return voci.reduce((sum, voce) => {
    const imponibile = voce.imponibile || 0;
    return sum + imponibile;
  }, 0);
};

/**
 * Calcola l'IVA totale da un array di voci
 */
export const calculateTotaleIva = (voci: Array<{ iva?: number }>): number => {
  if (!Array.isArray(voci)) return 0;
  
  return voci.reduce((sum, voce) => {
    const iva = voce.iva || 0;
    return sum + iva;
  }, 0);
};

/**
 * Calcola il totale fattura (imponibile + IVA)
 */
export const calculateTotaleFattura = (imponibile: number, iva: number): number => {
  return (imponibile || 0) + (iva || 0);
};

/**
 * Calcola l'IVA da imponibile e aliquota
 */
export const calculateIva = (imponibile: number, aliquota: number): number => {
  if (!imponibile || !aliquota) return 0;
  
  return imponibile * (aliquota / 100);
};

/**
 * Calcola l'imponibile da totale e aliquota IVA
 */
export const calculateImponibileFromTotale = (totale: number, aliquota: number): number => {
  if (!totale) return 0;
  if (!aliquota) return totale;
  
  return totale / (1 + (aliquota / 100));
};

/**
 * Calcola lo sconto in valore assoluto
 */
export const calculateSconto = (imponibile: number, percentualeSconto: number): number => {
  if (!imponibile || !percentualeSconto) return 0;
  
  return imponibile * (percentualeSconto / 100);
};

/**
 * Calcola l'imponibile scontato
 */
export const calculateImponibileScontato = (
  imponibile: number,
  percentualeSconto: number
): number => {
  if (!imponibile) return 0;
  if (!percentualeSconto) return imponibile;
  
  const sconto = calculateSconto(imponibile, percentualeSconto);
  return imponibile - sconto;
};

/**
 * Calcola il prezzo unitario da totale e quantità
 */
export const calculatePrezzoUnitario = (totale: number, quantita: number): number => {
  if (!totale || !quantita) return 0;
  
  return totale / quantita;
};

/**
 * Calcola il lordo da netto e aliquota IVA
 * Formula: lordo = netto * (1 + aliquota/100)
 * @param netto Importo netto
 * @param aliquota Aliquota IVA (default: 22%)
 */
export const calculateLordo = (
  netto: number,
  aliquota: number = ALIQUOTA_IVA_STANDARD
): number => {
  if (!netto) return 0;
  return netto * (1 + aliquota / 100);
};

/**
 * Calcola il netto da lordo e aliquota IVA
 * Formula: netto = lordo / (1 + aliquota/100)
 * @param lordo Importo lordo
 * @param aliquota Aliquota IVA (default: 22%)
 */
export const calculateNettoFromLordo = (
  lordo: number,
  aliquota: number = ALIQUOTA_IVA_STANDARD
): number => {
  if (!lordo) return 0;
  return lordo / (1 + aliquota / 100);
};

/**
 * Calcola l'IVA con aliquota standard (22%)
 * Funzione helper per evitare di passare sempre l'aliquota
 */
export const calculateIvaStandard = (imponibile: number): number => {
  return calculateIva(imponibile, ALIQUOTA_IVA_STANDARD);
};

/**
 * Calcola il lordo con aliquota standard (22%)
 * Funzione helper per evitare di passare sempre l'aliquota
 */
export const calculateLordoStandard = (netto: number): number => {
  return calculateLordo(netto, ALIQUOTA_IVA_STANDARD);
};

/**
 * Calcola il totale da prezzo unitario e quantità
 */
export const calculateTotaleRiga = (
  prezzoUnitario: number,
  quantita: number,
  sconto: number = 0
): number => {
  if (!prezzoUnitario || !quantita) return 0;
  
  const totale = prezzoUnitario * quantita;
  
  if (sconto > 0) {
    return totale - (totale * (sconto / 100));
  }
  
  return totale;
};

/**
 * Arrotonda un numero a n decimali
 */
export const roundToDecimals = (num: number, decimals: number = 2): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
};

/**
 * Calcola la differenza tra due importi
 */
export const calculateDifferenza = (valore1: number, valore2: number): number => {
  return Math.abs((valore1 || 0) - (valore2 || 0));
};

/**
 * Verifica se due importi sono uguali considerando una tolleranza
 */
export const areAmountsEqual = (
  amount1: number,
  amount2: number,
  tolerance: number = 0.01
): boolean => {
  const diff = calculateDifferenza(amount1, amount2);
  return diff <= tolerance;
};

/**
 * Calcola la percentuale di un valore sul totale
 */
export const calculatePercentuale = (valore: number, totale: number): number => {
  if (!totale) return 0;
  
  return (valore / totale) * 100;
};

/**
 * Calcola il totale con ritenuta d'acconto
 */
export const calculateTotaleConRitenuta = (
  imponibile: number,
  percentualeRitenuta: number
): number => {
  if (!imponibile) return 0;
  if (!percentualeRitenuta) return imponibile;
  
  const ritenuta = imponibile * (percentualeRitenuta / 100);
  return imponibile - ritenuta;
};

/**
 * Calcola il bollo su fattura (se supera la soglia)
 */
export const calculateBollo = (totaleFattura: number, soglia: number = 77.47): number => {
  if (totaleFattura > soglia) {
    return 2.00; // Bollo standard di 2 euro
  }
  return 0;
};

/**
 * Somma un array di numeri
 */
export const sumArray = (numbers: number[]): number => {
  if (!Array.isArray(numbers)) return 0;
  
  return numbers.reduce((sum, num) => sum + (num || 0), 0);
};

/**
 * Calcola la media di un array di numeri
 */
export const calculateAverage = (numbers: number[]): number => {
  if (!Array.isArray(numbers) || numbers.length === 0) return 0;
  
  const sum = sumArray(numbers);
  return sum / numbers.length;
};

/**
 * Trova il valore minimo in un array
 */
export const findMin = (numbers: number[]): number => {
  if (!Array.isArray(numbers) || numbers.length === 0) return 0;
  
  return Math.min(...numbers.filter(n => !isNaN(n)));
};

/**
 * Trova il valore massimo in un array
 */
export const findMax = (numbers: number[]): number => {
  if (!Array.isArray(numbers) || numbers.length === 0) return 0;
  
  return Math.max(...numbers.filter(n => !isNaN(n)));
};

/**
 * Calcola il numero di giorni tra due date
 */
export const calculateGiorniTraDate = (data1: Date, data2: Date): number => {
  if (!data1 || !data2) return 0;
  
  const diffTime = Math.abs(data2.getTime() - data1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * Calcola la data di scadenza aggiungendo giorni
 */
export const calculateDataScadenza = (dataEmissione: Date, giorniScadenza: number): Date => {
  if (!dataEmissione) return new Date();
  
  const scadenza = new Date(dataEmissione);
  scadenza.setDate(scadenza.getDate() + giorniScadenza);
  
  return scadenza;
};

/**
 * Verifica se una fattura è scaduta
 */
export const isFatturaScaduta = (dataScadenza: Date): boolean => {
  if (!dataScadenza) return false;
  
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  
  return dataScadenza < oggi;
};

/**
 * Calcola il totale delle anomalie per tipo
 */
export const countAnomalieByType = (
  anomalie: Array<{ tipo: string }>
): Record<string, number> => {
  if (!Array.isArray(anomalie)) return {};
  
  return anomalie.reduce((acc, anomalia) => {
    const tipo = anomalia.tipo || 'altro';
    acc[tipo] = (acc[tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
};

/**
 * Calcola statistiche riepilogative
 */
export const calculateStatistiche = (fatture: Array<{
  totaleImponibile?: number;
  totaleIva?: number;
  totaleFattura?: number;
  stato?: string;
}>): {
  numeroFatture: number;
  totaleImponibile: number;
  totaleIva: number;
  totaleFattura: number;
  mediaFattura: number;
  fattureImportate: number;
  fattureDaImportare: number;
  fattureConErrori: number;
} => {
  if (!Array.isArray(fatture)) {
    return {
      numeroFatture: 0,
      totaleImponibile: 0,
      totaleIva: 0,
      totaleFattura: 0,
      mediaFattura: 0,
      fattureImportate: 0,
      fattureDaImportare: 0,
      fattureConErrori: 0
    };
  }
  
  const totaleImponibile = fatture.reduce((sum, f) => sum + (f.totaleImponibile || 0), 0);
  const totaleIva = fatture.reduce((sum, f) => sum + (f.totaleIva || 0), 0);
  const totaleFattura = fatture.reduce((sum, f) => sum + (f.totaleFattura || 0), 0);
  
  return {
    numeroFatture: fatture.length,
    totaleImponibile: roundToDecimals(totaleImponibile),
    totaleIva: roundToDecimals(totaleIva),
    totaleFattura: roundToDecimals(totaleFattura),
    mediaFattura: fatture.length > 0 ? roundToDecimals(totaleFattura / fatture.length) : 0,
    fattureImportate: fatture.filter(f => f.stato === 'importata').length,
    fattureDaImportare: fatture.filter(f => f.stato === 'da_importare').length,
    fattureConErrori: fatture.filter(f => f.stato === 'errore').length
  };
};