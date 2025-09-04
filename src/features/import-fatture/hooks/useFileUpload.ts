import { useState, useRef } from 'react';
import { ExcelParser, FattureProcessor } from '../services';
import type { FieldMapping } from '../services/fattureProcessor';

interface UseFileUploadReturn {
  // Stati
  uploadedFile: File | null;
  fileData: any[];
  fileColumns: string[];
  fieldMapping: FieldMapping;
  dataFiltro: string;
  
  // Azioni
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  processImportedData: (onSuccess: (nuoveFatture: any[]) => void) => void;
  resetFileUpload: () => void;
  
  // Setters
  setFieldMapping: (mapping: FieldMapping) => void;
  setDataFiltro: (data: string) => void;
  
  // Ref
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

interface ProcessDataOptions {
  prestazioniMap: Record<string, any>;
  prodottiMap: Record<string, any>;
}

export function useFileUpload(
  options: ProcessDataOptions
): UseFileUploadReturn {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<any[]>([]);
  const [fileColumns, setFileColumns] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [dataFiltro, setDataFiltro] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Verifica estensione file
    if (!ExcelParser.validateFileExtension(file.name)) {
      alert('Per favore seleziona un file Excel (.xls o .xlsx)');
      if (event.target) event.target.value = '';
      return;
    }
    
    setUploadedFile(file);
    
    try {
      // Usa il servizio ExcelParser per leggere il file
      const parsedData = await ExcelParser.parseFile(file);
      
      console.log(`Headers trovati alla riga ${parsedData.headerRowIndex + 1}:`, parsedData.headers);
      console.log('Headers validi:', parsedData.validHeaders);
      console.log('Numero righe dati trovate:', parsedData.dataRows.length);
      console.log('Prima riga dati:', parsedData.dataRows[0]);
      
      setFileColumns(parsedData.validHeaders);
      setFileData(parsedData.dataRows);
      
      // Inizializza mapping automatico
      const autoMapping = ExcelParser.createAutoMapping(parsedData.validHeaders);
      setFieldMapping(autoMapping);
      
    } catch (error: any) {
      console.error('Errore nella lettura del file:', error);
      alert(error.message || 'Errore nella lettura del file. Assicurati che sia un file Excel valido.');
      if (event.target) event.target.value = '';
    }
  };

  const processImportedData = (onSuccess: (nuoveFatture: any[]) => void) => {
    try {
      // Usa il servizio FattureProcessor direttamente importato
      const nuoveFatture = FattureProcessor.processImportedData(
        fileData,
        fieldMapping,
        {
          dataFiltro,
          prestazioniMap: options.prestazioniMap,
          prodottiMap: options.prodottiMap
        }
      );
      
      // Callback di successo
      onSuccess(nuoveFatture);
      
      // Chiudi modal e resetta
      resetFileUpload();
      
      alert(`Importate ${nuoveFatture.length} fatture. Eventuali anomalie sono state rilevate.`);
      
    } catch (error: any) {
      alert(error.message || 'Errore nel processamento dei dati');
    }
  };

  const resetFileUpload = () => {
    setUploadedFile(null);
    setFileData([]);
    setFileColumns([]);
    setFieldMapping({});
    setDataFiltro('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return {
    // Stati
    uploadedFile,
    fileData,
    fileColumns,
    fieldMapping,
    dataFiltro,
    
    // Azioni
    handleFileUpload,
    processImportedData,
    resetFileUpload,
    
    // Setters
    setFieldMapping,
    setDataFiltro,
    
    // Ref
    fileInputRef
  };
}