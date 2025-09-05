// Export all hooks from single entry point
export { useMediciData } from './useMediciData';
export { useMedicoForm } from './useMedicoForm';
export { useCompensiSimulator } from './useCompensiSimulator';
export { useProdottiManager } from './useProdottiManager';
export { useEccezioniManager } from './useEccezioniManager';
export { useModalManager } from './useModalManager';
export { useTabManager } from './useTabManager';
export { useNewMedicoForm } from './useNewMedicoForm';

// Export types
export type { ModalName } from './useModalManager';
export type { TabName, Tab } from './useTabManager';
export type {
  MedicoExtended,
  RegolaCompenso,
  CostoProdottoExtended,
  EccezioneExtended,
  CreateMedicoDTO,
  UpdateMedicoDTO,
  UseMediciDataReturn,
  UseMedicoFormReturn,
  ValidationError,
  ImportState,
  SimulazioneParams,
  RisultatoCalcolo
} from './types';