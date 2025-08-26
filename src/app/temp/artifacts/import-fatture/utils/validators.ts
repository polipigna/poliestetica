/**
 * Funzioni di validazione per l'import delle fatture
 */

/**
 * Valida un codice fiscale italiano
 */
export const isValidCodiceFiscale = (cf: string | null | undefined): boolean => {
  if (!cf) return false;
  
  const cleaned = cf.trim().toUpperCase();
  
  // Controllo lunghezza
  if (cleaned.length !== 16) return false;
  
  // Pattern base per codice fiscale
  const pattern = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
  
  return pattern.test(cleaned);
};

/**
 * Valida una partita IVA italiana
 */
export const isValidPartitaIva = (piva: string | null | undefined): boolean => {
  if (!piva) return false;
  
  let cleaned = piva.trim().toUpperCase();
  
  // Rimuovi prefisso IT se presente
  if (cleaned.startsWith('IT')) {
    cleaned = cleaned.substring(2);
  }
  
  // Deve essere 11 cifre
  if (!/^\d{11}$/.test(cleaned)) return false;
  
  // Algoritmo di controllo partita IVA
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(cleaned[i]);
    if (i % 2 === 0) {
      sum += digit;
    } else {
      const doubled = digit * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    }
  }
  
  return sum % 10 === 0;
};

/**
 * Valida un indirizzo email
 */
export const isValidEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email.trim());
};

/**
 * Valida un numero di telefono italiano
 */
export const isValidPhoneNumber = (phone: string | null | undefined): boolean => {
  if (!phone) return false;
  
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Numeri italiani: fissi o mobili
  const patterns = [
    /^\+39\d{9,10}$/, // Con prefisso internazionale
    /^0039\d{9,10}$/, // Con prefisso 0039
    /^3\d{8,9}$/, // Mobile senza prefisso
    /^0\d{8,10}$/ // Fisso con 0
  ];
  
  return patterns.some(pattern => pattern.test(cleaned));
};

/**
 * Valida un CAP italiano
 */
export const isValidCAP = (cap: string | null | undefined): boolean => {
  if (!cap) return false;
  
  const cleaned = cap.trim();
  return /^\d{5}$/.test(cleaned);
};

/**
 * Valida un importo monetario
 */
export const isValidAmount = (amount: number | null | undefined): boolean => {
  if (amount === null || amount === undefined) return false;
  
  return !isNaN(amount) && isFinite(amount) && amount >= 0;
};

/**
 * Valida una percentuale (0-100)
 */
export const isValidPercentage = (percentage: number | null | undefined): boolean => {
  if (percentage === null || percentage === undefined) return false;
  
  return !isNaN(percentage) && percentage >= 0 && percentage <= 100;
};

/**
 * Valida una data
 */
export const isValidDate = (date: Date | string | null | undefined): boolean => {
  if (!date) return false;
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  return d instanceof Date && !isNaN(d.getTime());
};

/**
 * Valida che una data sia nel range accettabile
 */
export const isDateInRange = (
  date: Date | null | undefined,
  minDate?: Date,
  maxDate?: Date
): boolean => {
  if (!date || !isValidDate(date)) return false;
  
  const d = date instanceof Date ? date : new Date(date);
  
  if (minDate && d < minDate) return false;
  if (maxDate && d > maxDate) return false;
  
  return true;
};

/**
 * Valida un codice prodotto/prestazione
 */
export const isValidCodice = (codice: string | null | undefined): boolean => {
  if (!codice) return false;
  
  const cleaned = codice.trim();
  
  // Non vuoto e lunghezza ragionevole
  return cleaned.length > 0 && cleaned.length <= 50;
};

/**
 * Valida una quantità
 */
export const isValidQuantity = (qty: number | null | undefined): boolean => {
  if (qty === null || qty === undefined) return false;
  
  return !isNaN(qty) && qty > 0 && Number.isInteger(qty);
};

/**
 * Valida il numero di una fattura
 */
export const isValidNumeroFattura = (numero: string | null | undefined): boolean => {
  if (!numero) return false;
  
  const cleaned = numero.trim();
  
  // Deve contenere almeno un carattere alfanumerico
  return cleaned.length > 0 && /[A-Za-z0-9]/.test(cleaned);
};

/**
 * Valida un IBAN italiano
 */
export const isValidIBAN = (iban: string | null | undefined): boolean => {
  if (!iban) return false;
  
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  
  // IBAN italiano: IT + 2 cifre di controllo + 23 caratteri
  if (!/^IT\d{2}[A-Z]\d{22}$/.test(cleaned)) return false;
  
  // Algoritmo di validazione IBAN (semplificato)
  const rearranged = cleaned.substring(4) + cleaned.substring(0, 4);
  let numericString = '';
  
  for (const char of rearranged) {
    if (/\d/.test(char)) {
      numericString += char;
    } else {
      numericString += (char.charCodeAt(0) - 55).toString();
    }
  }
  
  // Modulo 97 check
  let remainder = '';
  for (const digit of numericString) {
    remainder = (parseInt(remainder + digit) % 97).toString();
  }
  
  return remainder === '1';
};

/**
 * Controlla se una stringa è vuota o contiene solo spazi
 */
export const isEmpty = (str: string | null | undefined): boolean => {
  if (!str) return true;
  
  return str.trim().length === 0;
};

/**
 * Controlla se un valore è numerico
 */
export const isNumeric = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  
  if (typeof value === 'number') return !isNaN(value) && isFinite(value);
  
  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '.').replace(/[^\d.-]/g, '');
    return !isNaN(parseFloat(cleaned)) && isFinite(parseFloat(cleaned));
  }
  
  return false;
};

/**
 * Valida una stringa come nome (solo lettere, spazi e apostrofi)
 */
export const isValidName = (name: string | null | undefined): boolean => {
  if (!name) return false;
  
  const cleaned = name.trim();
  
  // Almeno 2 caratteri, solo lettere, spazi, apostrofi e trattini
  return cleaned.length >= 2 && /^[A-Za-zÀ-ÿ\s'-]+$/.test(cleaned);
};

/**
 * Valida un array non vuoto
 */
export const isNonEmptyArray = (arr: any[] | null | undefined): boolean => {
  return Array.isArray(arr) && arr.length > 0;
};

/**
 * Valida che tutti gli elementi di un array soddisfino una condizione
 */
export const allValid = <T>(
  arr: T[] | null | undefined,
  validator: (item: T) => boolean
): boolean => {
  if (!Array.isArray(arr)) return false;
  
  return arr.every(validator);
};

/**
 * Valida che almeno un elemento di un array soddisfi una condizione
 */
export const someValid = <T>(
  arr: T[] | null | undefined,
  validator: (item: T) => boolean
): boolean => {
  if (!Array.isArray(arr)) return false;
  
  return arr.some(validator);
};