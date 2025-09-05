import { Medico, MedicoRegoleCosti } from '@/data/mock';

export interface CreateMedicoDTO {
  nome: string;
  cognome: string;
  cf: string;
  piva: string;
}

export interface UpdateMedicoDTO {
  nome?: string;
  cognome?: string;
  cf?: string;
  piva?: string;
}

export interface RegoleCompensi {
  tipo: 'percentuale' | 'scaglioni' | 'quota_fissa' | 'fisso';
  valore?: number;
  valoreX?: number;
  valoreY?: number;
  calcolaSu: 'netto' | 'lordo';
  detraiCosti: boolean;
}

export interface CostoProdotto {
  codiceProdotto: string;
  nomeProdotto: string;
  costo: number;
}

export interface Eccezione extends RegoleCompensi {
  codice: string;
  descrizione: string;
}

export interface MedicoExtended extends Medico {
  regolaBase: RegoleCompensi;
  costiProdotti: CostoProdotto[];
  eccezioni: Eccezione[];
}

export interface ExportData {
  medici: MedicoExtended[];
  timestamp: string;
  version: string;
}

export interface ImportData {
  medici?: MedicoExtended[];
  regole?: Record<string, MedicoRegoleCosti>;
}

/**
 * Interface per la gestione dei dati dei medici
 * Implementata da MockDataSource, ApiDataSource, etc.
 */
export interface DataSource {
  // Medici CRUD
  getMedici(): Promise<MedicoExtended[]>;
  getMedico(id: number): Promise<MedicoExtended | null>;
  createMedico(data: CreateMedicoDTO): Promise<MedicoExtended>;
  updateMedico(id: number, data: UpdateMedicoDTO): Promise<MedicoExtended>;
  deleteMedico(id: number): Promise<void>;
  
  // Regole & Costi
  getRegoleCompensi(medicoId: number): Promise<RegoleCompensi>;
  updateRegoleCompensi(medicoId: number, regole: RegoleCompensi): Promise<void>;
  
  // Costi Prodotti
  getCostiProdotti(medicoId: number): Promise<CostoProdotto[]>;
  updateCostiProdotti(medicoId: number, costi: CostoProdotto[]): Promise<void>;
  addCostoProdotto(medicoId: number, costo: CostoProdotto): Promise<void>;
  removeCostoProdotto(medicoId: number, codiceProdotto: string): Promise<void>;
  
  // Eccezioni
  getEccezioni(medicoId: number): Promise<Eccezione[]>;
  updateEccezioni(medicoId: number, eccezioni: Eccezione[]): Promise<void>;
  addEccezione(medicoId: number, eccezione: Eccezione): Promise<void>;
  removeEccezione(medicoId: number, codice: string): Promise<void>;
  
  // Utilities
  reset(): Promise<void>;
  export(): Promise<ExportData>;
  import(data: ImportData): Promise<void>;
  
  // Validazione
  validateMedico(data: CreateMedicoDTO | UpdateMedicoDTO): Promise<boolean>;
  checkDuplicates(cf?: string, piva?: string, excludeId?: number): Promise<boolean>;
}