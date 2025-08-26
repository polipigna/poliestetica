/**
 * Utility functions per la formattazione dei dati nell'import fatture
 */

/**
 * Formatta una data nel formato italiano gg/mm/aaaa
 */
export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
};

/**
 * Formatta un importo in euro con 2 decimali
 */
export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '€ 0,00';
  
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Formatta un numero con separatori di migliaia italiani
 */
export const formatNumber = (num: number | null | undefined, decimals: number = 2): string => {
  if (num === null || num === undefined) return '0';
  
  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

/**
 * Formatta una percentuale
 */
export const formatPercentage = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '0%';
  
  return new Intl.NumberFormat('it-IT', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value / 100);
};

/**
 * Pulisce e normalizza una stringa rimuovendo spazi extra e caratteri speciali
 */
export const cleanString = (str: string | null | undefined): string => {
  if (!str) return '';
  
  return str
    .toString()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\n\r\t]/g, '')
    .replace(/\u00A0/g, ' '); // Rimuove non-breaking spaces
};

/**
 * Converte una stringa in formato slug (per ID e chiavi)
 */
export const toSlug = (str: string | null | undefined): string => {
  if (!str) return '';
  
  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[àáäâ]/g, 'a')
    .replace(/[èéëê]/g, 'e')
    .replace(/[ìíïî]/g, 'i')
    .replace(/[òóöô]/g, 'o')
    .replace(/[ùúüû]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Tronca una stringa alla lunghezza specificata aggiungendo ellipsis
 */
export const truncateString = (str: string | null | undefined, maxLength: number = 50): string => {
  if (!str) return '';
  
  const cleaned = cleanString(str);
  if (cleaned.length <= maxLength) return cleaned;
  
  return `${cleaned.substring(0, maxLength - 3)}...`;
};

/**
 * Capitalizza la prima lettera di una stringa
 */
export const capitalize = (str: string | null | undefined): string => {
  if (!str) return '';
  
  const cleaned = cleanString(str).toLowerCase();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

/**
 * Formatta il codice fiscale in maiuscolo
 */
export const formatCodiceFiscale = (cf: string | null | undefined): string => {
  if (!cf) return '';
  
  return cleanString(cf).toUpperCase().substring(0, 16);
};

/**
 * Formatta la partita IVA aggiungendo il prefisso IT se mancante
 */
export const formatPartitaIva = (piva: string | null | undefined): string => {
  if (!piva) return '';
  
  const cleaned = cleanString(piva).replace(/[^\w]/g, '');
  
  if (cleaned.match(/^\d{11}$/)) {
    return `IT${cleaned}`;
  }
  
  return cleaned.toUpperCase();
};

/**
 * Formatta un numero di telefono italiano
 */
export const formatPhoneNumber = (phone: string | null | undefined): string => {
  if (!phone) return '';
  
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  if (cleaned.startsWith('+39')) {
    return cleaned;
  } else if (cleaned.startsWith('0039')) {
    return `+39${cleaned.substring(4)}`;
  } else if (cleaned.match(/^3\d{8,9}$/)) {
    return `+39${cleaned}`;
  }
  
  return cleaned;
};

/**
 * Converte un valore Excel in stringa pulita
 */
export const excelToString = (value: any): string => {
  if (value === null || value === undefined) return '';
  
  if (typeof value === 'number') {
    return value.toString();
  }
  
  if (value instanceof Date) {
    return formatDate(value);
  }
  
  return cleanString(value.toString());
};

/**
 * Converte un valore Excel in numero
 */
export const excelToNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  
  if (typeof value === 'number') return value;
  
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  
  return 0;
};

/**
 * Converte un valore Excel in data
 */
export const excelToDate = (value: any): Date | null => {
  if (!value) return null;
  
  if (value instanceof Date) return value;
  
  if (typeof value === 'number') {
    // Excel serial date
    const date = new Date((value - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) return date;
  }
  
  if (typeof value === 'string') {
    // Prova diversi formati di data
    const formats = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // dd/mm/yyyy
      /(\d{4})-(\d{1,2})-(\d{1,2})/, // yyyy-mm-dd
      /(\d{1,2})-(\d{1,2})-(\d{4})/ // dd-mm-yyyy
    ];
    
    for (const format of formats) {
      const match = value.match(format);
      if (match) {
        const [, p1, p2, p3] = match;
        let date: Date;
        
        if (format === formats[0] || format === formats[2]) {
          // dd/mm/yyyy o dd-mm-yyyy
          date = new Date(`${p3}-${p2}-${p1}`);
        } else {
          // yyyy-mm-dd
          date = new Date(`${p1}-${p2}-${p3}`);
        }
        
        if (!isNaN(date.getTime())) return date;
      }
    }
  }
  
  return null;
};