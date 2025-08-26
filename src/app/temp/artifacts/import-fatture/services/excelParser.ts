/**
 * Excel parsing service per l'import delle fatture
 */

import * as XLSX from 'xlsx';
import { cleanString, excelToDate } from '../utils';

export interface ParsedExcelData {
  headers: string[];
  validHeaders: string[];
  dataRows: any[];
  headerRowIndex: number;
}

export interface ExcelColumn {
  key: string;
  patterns: string[];
}

export class ExcelParser {
  /**
   * Legge un file Excel e restituisce i dati parsati
   */
  static async parseFile(file: File): Promise<ParsedExcelData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          
          if (jsonData.length === 0) {
            throw new Error('Il file Excel è vuoto');
          }
          
          // Trova la riga degli headers
          const headerRowIndex = this.findHeaderRow(jsonData);
          if (headerRowIndex === -1) {
            throw new Error('Non riesco a trovare la riga degli headers. Cerco una riga che contenga "Data" nelle prime 20 righe del file.');
          }
          
          // Estrai gli headers
          const { headers, validHeaders } = this.extractHeaders(jsonData[headerRowIndex] as any[]);
          
          if (validHeaders.length === 0) {
            throw new Error(`Il file Excel non contiene intestazioni valide alla riga ${headerRowIndex + 1}`);
          }
          
          // Converti in array di oggetti
          const dataRows = this.extractDataRows(jsonData, headerRowIndex, headers);
          
          if (dataRows.length === 0) {
            throw new Error('Il file Excel non contiene dati validi dopo la riga degli headers');
          }
          
          resolve({
            headers,
            validHeaders,
            dataRows,
            headerRowIndex
          });
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Errore nella lettura del file'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  }
  
  /**
   * Trova la riga che contiene gli headers nel file Excel
   */
  static findHeaderRow(jsonData: any[]): number {
    const maxRowsToCheck = Math.min(jsonData.length, 20);
    
    for (let i = 0; i < maxRowsToCheck; i++) {
      const row = jsonData[i] as any[];
      if (row && row.length > 0) {
        // Controlla ogni cella della riga per trovare "data" o "Data"
        for (let j = 0; j < row.length; j++) {
          const cellValue = row[j];
          if (cellValue && typeof cellValue === 'string') {
            const cellLower = cleanString(cellValue.toLowerCase());
            if (cellLower === 'data' || cellLower.includes('data')) {
              console.log(`Trovata riga headers alla posizione ${i + 1} (riga Excel ${i + 1})`);
              return i;
            }
          }
        }
      }
    }
    
    return -1;
  }
  
  /**
   * Estrae gli headers dalla riga identificata
   */
  static extractHeaders(rawHeaders: any[]): { headers: string[], validHeaders: string[] } {
    // Trova l'ultimo indice con un valore valido
    let lastValidIndex = -1;
    for (let i = rawHeaders.length - 1; i >= 0; i--) {
      if (rawHeaders[i] !== undefined && 
          rawHeaders[i] !== null && 
          cleanString(String(rawHeaders[i])) !== '') {
        lastValidIndex = i;
        break;
      }
    }
    
    if (lastValidIndex === -1) {
      return { headers: [], validHeaders: [] };
    }
    
    // Prendi tutti gli headers fino all'ultimo valido (preservando le posizioni vuote)
    const headers = rawHeaders.slice(0, lastValidIndex + 1).map(h => 
      (h === undefined || h === null || cleanString(String(h)) === '') ? '' : cleanString(String(h))
    );
    
    // Filtra solo per il controllo
    const validHeaders = headers.filter(h => h !== '');
    
    console.log('Headers trovati:', headers);
    console.log('Headers validi:', validHeaders);
    
    return { headers, validHeaders };
  }
  
  /**
   * Estrae le righe di dati dal file Excel
   */
  static extractDataRows(jsonData: any[], headerRowIndex: number, headers: string[]): any[] {
    return jsonData.slice(headerRowIndex + 1)
      .map((row: any) => {
        const obj: any = {};
        headers.forEach((header, index) => {
          // Solo se l'header non è vuoto e il valore esiste
          if (header !== '' && row[index] !== undefined && row[index] !== null) {
            obj[header] = row[index];
          }
        });
        return obj;
      })
      .filter(row => Object.keys(row).length > 0); // Filtra righe vuote
  }
  
  /**
   * Crea un mapping automatico tra campi Excel e campi sistema
   */
  static createAutoMapping(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};
    
    const campiSistema: ExcelColumn[] = [
      { key: 'numero', patterns: ['numero', 'n.', 'n°', 'numero fattura', 'n fattura'] },
      { key: 'data', patterns: ['data', 'emissione', 'data documento', 'data fattura'] },
      { key: 'paziente', patterns: ['cliente', 'paziente', 'nominativo', 'intestatario', 'ragione sociale', 'denominazione'] },
      { key: 'codice', patterns: ['codice', 'articolo', 'cod.', 'servizio', 'cod', 'codice articolo'] },
      { key: 'serie', patterns: ['serie', 'serie fattura', 'serie documento'] },
      { key: 'quantita', patterns: ['quantità', 'quantita', 'qta', 'q.tà', 'qt', 'qty'] },
      { key: 'unita', patterns: ['u.m.', 'U.M.', 'um', 'UM', 'unità', 'unita', 'unità misura', 'unita misura', 'unità di misura', 'unita di misura'] },
      { key: 'importo', patterns: ['prezzo totale', 'importo', 'prezzo', 'totale', 'imponibile', 'netto'] },
      { key: 'iva', patterns: ['iva', 'imposta', 'aliquota', 'tax', '% iva'] }
    ];
    
    console.log('Headers disponibili per mapping:', headers);
    
    campiSistema.forEach(campo => {
      const matchedHeader = headers.find(h => {
        if (!h || typeof h !== 'string') return false;
        const headerLower = cleanString(h.toLowerCase());
        return campo.patterns.some(p => {
          const patternLower = p.toLowerCase();
          return headerLower === patternLower || headerLower.includes(patternLower);
        });
      });
      
      if (matchedHeader) {
        console.log(`Mappato campo ${campo.key} -> ${matchedHeader}`);
        mapping[campo.key] = matchedHeader;
      }
    });
    
    return mapping;
  }
  
  /**
   * Valida l'estensione del file
   */
  static validateFileExtension(fileName: string): boolean {
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    return ['xls', 'xlsx'].includes(fileExtension || '');
  }
  
  /**
   * Filtra i dati per data
   */
  static filterDataByDate(
    data: any[], 
    dateFieldKey: string, 
    filterDate: Date
  ): any[] {
    console.log('Filtro data attivo:', filterDate);
    
    return data.filter(row => {
      const dataValue = row[dateFieldKey];
      const dataFattura = excelToDate(dataValue) || new Date();
      
      console.log('Confronto date:', dataValue, '->', dataFattura, '>', filterDate, dataFattura > filterDate);
      return dataFattura > filterDate;
    });
  }
  
  /**
   * Crea un file Excel da esportare
   */
  static createExcelFile(data: any[], sheetName: string = 'Dati'): XLSX.WorkBook {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return wb;
  }
  
  /**
   * Scarica un file Excel
   */
  static downloadExcelFile(workbook: XLSX.WorkBook, fileName: string): void {
    XLSX.writeFile(workbook, fileName);
  }
}