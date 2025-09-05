import type { 
  Medico,
  MedicoRegoleCosti,
  RegolaCompenso as RegolaBase,
  CostoProdotto,
  Eccezione
} from '@/data/mock';

// Extended types per il componente
export interface MedicoExtended extends Medico {
  specialita?: string;
  email?: string;
  telefono?: string;
  codiceFiscale?: string;
  partitaIva?: string;
  iban?: string;
  indirizzo?: string;
  attivo?: boolean;
  regolaBase?: RegolaCompenso;
  costiProdotti?: CostoProdottoExtended[];
  eccezioni?: EccezioneExtended[];
}

export interface RegolaCompenso {
  tipo: 'percentuale' | 'scaglioni' | 'fisso';
  valore?: number;
  valoreX?: number;
  valoreY?: number;
  su: 'netto' | 'lordo';
  detraiCosto: boolean;
}

export interface CostoProdottoExtended {
  id: number;
  codice: string;        // Codice prodotto (es: "PRT")
  nome: string;          // Nome completo (es: "PREPARATO TRAP")
  displayName?: string;  // Display formattato (es: "PRT - PREPARATO TRAP")
  costo: number;
  unitaMisura: string;
  nonDetrarre: boolean;
}

export interface EccezioneExtended {
  id: number;
  trattamento: string;
  prodotto?: string;
  regola: RegolaCompenso;
}

// DTO types
export interface CreateMedicoDTO {
  nome: string;
  cognome: string;
  cf: string;
  piva: string;
  specialita?: string;
  email?: string;
  telefono?: string;
  iban?: string;
  indirizzo?: string;
  attivo?: boolean;
}

export interface UpdateMedicoDTO extends Partial<CreateMedicoDTO> {
  regolaBase?: RegolaCompenso;
  costiProdotti?: CostoProdottoExtended[];
  eccezioni?: EccezioneExtended[];
}

// Hook return types
export interface UseMediciDataReturn {
  // State
  medici: MedicoExtended[];
  selectedMedico: MedicoExtended | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  selectMedico: (medico: MedicoExtended | null) => void;
  createMedico: (data: CreateMedicoDTO) => Promise<MedicoExtended>;
  updateMedico: (id: number, updates: UpdateMedicoDTO) => Promise<void>;
  deleteMedico: (id: number) => Promise<void>;
  refreshMedici: () => Promise<void>;
}

export interface UseMedicoFormReturn {
  // State
  formData: MedicoExtended | null;
  originalData: MedicoExtended | null;
  hasUnsavedChanges: boolean;
  validationErrors: string[];
  isSaving: boolean;
  
  // Field updates
  updateField: (field: keyof MedicoExtended, value: any) => void;
  updateRegolaBase: (updates: Partial<RegolaCompenso>) => void;
  updateCostiProdotti: (costi: CostoProdottoExtended[]) => void;
  updateEccezioni: (eccezioni: EccezioneExtended[]) => void;
  
  // Actions
  save: () => Promise<void>;
  reset: () => void;
  
  // Computed
  canSave: boolean;
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

// Import/Export types
export interface ImportState {
  file: File | null;
  preview: any | null;
  isProcessing: boolean;
  error: string | null;
}

// Simulazione types  
export interface SimulazioneParams {
  trattamento: string;
  prodotto?: string;
  importoFattura: string;
  ivaInclusa: boolean;
}

export interface RisultatoCalcolo {
  importoLordo: number;
  importoNetto: number;
  compensoBase: number;
  costoProdotto: number;
  compensoNetto: number;
  compensoFinale: number;
  margineClinica: number;
  percentualeMargine: number;
  tipoRegola: string;
  descrizioneCalcolo: string;
  dettagliCosti: any[];
  regolaApplicata: string;
}