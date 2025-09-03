/**
 * Service per l'export dei dati in formato Excel
 */

import * as XLSX from 'xlsx';
import type { FatturaConVoci, VoceFatturaEstesa } from './anomalieCalculator';
import { toSlug } from '../utils';

export interface ExportColumn {
  field: string;
  header: string;
  width?: number;
  formatter?: (value: any) => any;
}

export interface ExportOptions {
  filename?: string;
  sheetName?: string;
  columns?: ExportColumn[];
  includeTimestamp?: boolean;
}

export class ExportService {
  
  /**
   * Configurazione colonne per export voci fatture
   */
  private static readonly VOCI_COLUMNS: ExportColumn[] = [
    { field: 'numeroFattura', header: 'Numero Fattura', width: 15 },
    { field: 'serie', header: 'Serie', width: 8 },
    { field: 'dataEmissione', header: 'Data Emissione', width: 12 },
    { field: 'cliente', header: 'Cliente', width: 25 },
    { field: 'medico', header: 'Medico', width: 20 },
    { field: 'statoFattura', header: 'Stato Fattura', width: 15 },
    { field: 'codice', header: 'Codice', width: 20 },
    { field: 'descrizione', header: 'Descrizione', width: 35 },
    { field: 'tipo', header: 'Tipo', width: 12 },
    { field: 'quantita', header: 'Quantità', width: 10 },
    { field: 'unita', header: 'Unità', width: 10 },
    { field: 'importoNetto', header: 'Importo Netto', width: 12 },
    { field: 'importoLordo', header: 'Importo Lordo', width: 12 },
    { field: 'anomalie', header: 'Anomalie', width: 30 }
  ];

  /**
   * Configurazione colonne per export fatture (riepilogo)
   */
  private static readonly FATTURE_COLUMNS: ExportColumn[] = [
    { field: 'numero', header: 'Numero', width: 15 },
    { field: 'serie', header: 'Serie', width: 8 },
    { field: 'data', header: 'Data', width: 12 },
    { field: 'cliente', header: 'Cliente', width: 25 },
    { field: 'medico', header: 'Medico', width: 20 },
    { field: 'stato', header: 'Stato', width: 15 },
    { field: 'imponibile', header: 'Imponibile', width: 12, formatter: (v) => v?.toFixed(2) || '0.00' },
    { field: 'iva', header: 'IVA', width: 12, formatter: (v) => v?.toFixed(2) || '0.00' },
    { field: 'totale', header: 'Totale', width: 12, formatter: (v) => v?.toFixed(2) || '0.00' },
    { field: 'numeroVoci', header: 'N° Voci', width: 10 },
    { field: 'anomalie', header: 'Anomalie', width: 30 }
  ];

  /**
   * Esporta le voci delle fatture in formato Excel
   */
  static exportVociToExcel(
    fatture: FatturaConVoci[], 
    options?: ExportOptions
  ): void {
    // Prepara i dati
    const data = this.prepareVociData(fatture);
    
    // Usa colonne custom o default
    const columns = options?.columns || this.VOCI_COLUMNS;
    
    // Genera e scarica il file
    this.generateAndDownloadExcel(
      data, 
      columns,
      {
        sheetName: options?.sheetName || 'Voci Fatture',
        filename: options?.filename || 'export_voci_fatture',
        includeTimestamp: options?.includeTimestamp !== false
      }
    );
  }

  /**
   * Esporta il riepilogo fatture in formato Excel
   */
  static exportFattureToExcel(
    fatture: FatturaConVoci[],
    options?: ExportOptions
  ): void {
    // Prepara i dati
    const data = this.prepareFattureData(fatture);
    
    // Usa colonne custom o default
    const columns = options?.columns || this.FATTURE_COLUMNS;
    
    // Genera e scarica il file
    this.generateAndDownloadExcel(
      data,
      columns,
      {
        sheetName: options?.sheetName || 'Riepilogo Fatture',
        filename: options?.filename || 'export_fatture',
        includeTimestamp: options?.includeTimestamp !== false
      }
    );
  }

  /**
   * Prepara i dati delle voci per l'export
   */
  private static prepareVociData(fatture: FatturaConVoci[]): Record<string, any>[] {
    const exportData: Record<string, any>[] = [];
    
    fatture.forEach(fattura => {
      if (!fattura.voci) return;
      
      fattura.voci.forEach(voce => {
        exportData.push({
          numeroFattura: fattura.numero || '',
          serie: fattura.serie || '',
          dataEmissione: fattura.dataEmissione || fattura.data || '',
          cliente: fattura.clienteNome || fattura.paziente || '',
          medico: fattura.medicoNome || '',
          statoFattura: fattura.stato || '',
          codice: voce.codice || '',
          descrizione: voce.descrizione || '',
          tipo: voce.tipo || '',
          quantita: voce.quantita || 0,
          unita: voce.unita || '',
          importoNetto: voce.importoNetto || 0,
          importoLordo: voce.importoLordo || 0,
          anomalie: voce.anomalie ? voce.anomalie.join(', ') : ''
        });
      });
    });
    
    return exportData;
  }

  /**
   * Prepara i dati delle fatture per l'export (riepilogo)
   */
  private static prepareFattureData(fatture: FatturaConVoci[]): Record<string, any>[] {
    return fatture.map(fattura => ({
      numero: fattura.numero || '',
      serie: fattura.serie || '',
      data: fattura.data || '',
      cliente: fattura.clienteNome || fattura.paziente || '',
      medico: fattura.medicoNome || '',
      stato: fattura.stato || '',
      imponibile: fattura.imponibile || 0,
      iva: fattura.iva || 0,
      totale: fattura.totale || 0,
      numeroVoci: fattura.voci?.length || 0,
      anomalie: fattura.anomalie ? fattura.anomalie.join(', ') : ''
    }));
  }

  /**
   * Genera il file Excel e lo scarica
   */
  private static generateAndDownloadExcel(
    data: Record<string, any>[],
    columns: ExportColumn[],
    options: {
      sheetName: string;
      filename: string;
      includeTimestamp: boolean;
    }
  ): void {
    // Formatta i dati secondo le colonne specificate
    const formattedData = data.map(row => {
      const formattedRow: Record<string, any> = {};
      columns.forEach(col => {
        const value = row[col.field];
        formattedRow[col.header] = col.formatter ? col.formatter(value) : value;
      });
      return formattedRow;
    });

    // Crea un nuovo workbook
    const wb = XLSX.utils.book_new();
    
    // Crea un worksheet dai dati formattati
    const ws = XLSX.utils.json_to_sheet(formattedData);
    
    // Imposta le larghezze delle colonne
    ws['!cols'] = columns.map(col => ({ wch: col.width || 15 }));
    
    // Aggiungi il worksheet al workbook
    XLSX.utils.book_append_sheet(wb, ws, options.sheetName);
    
    // Genera il nome del file con timestamp opzionale
    const timestamp = options.includeTimestamp ? `_${toSlug(new Date().toISOString())}` : '';
    const fileName = `${options.filename}${timestamp}.xlsx`;
    
    // Scarica il file
    XLSX.writeFile(wb, fileName);
  }

  /**
   * Esporta dati custom in formato Excel
   */
  static exportCustomToExcel(
    data: any[],
    columns: ExportColumn[],
    options?: ExportOptions
  ): void {
    this.generateAndDownloadExcel(
      data,
      columns,
      {
        sheetName: options?.sheetName || 'Export',
        filename: options?.filename || 'export',
        includeTimestamp: options?.includeTimestamp !== false
      }
    );
  }
}