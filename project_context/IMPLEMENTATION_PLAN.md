# Piano Implementazione Store Persistente

## Obiettivo
Implementare un sistema di persistenza dati con localStorage per testare il flusso completo dell'applicazione prima dell'integrazione con il database reale.

## Architettura

### Service Layer Pattern
```
Components → Services → Storage
    ↓           ↓          ↓
  React      Business    localStorage (ora)
  UI Logic    Logic      Database API (futuro)
```

## Fase 1: Infrastruttura Store ✅ COMPLETATA

### 1.1 Store da Implementare ✅ FATTO

#### FattureStore
```typescript
// services/stores/fattureStore.ts
class FattureStore {
  // Fatture disponibili per import
  getFattureDisponibili(): Fattura[]
  saveFattureDisponibili(fatture: Fattura[]): void
  
  // Fatture importate nel sistema
  importaFatture(fatture: Fattura[], periodo: Periodo): void
  getFattureImportate(periodo?: Periodo): Fattura[]
  
  // Reset
  reset(): void
}
```

#### MediciStore ✅ FATTO
```typescript
// services/stores/mediciStore.ts
class MediciStore {
  // Singleton pattern implementato
  static getInstance(): MediciStore
  
  // Carica medici (da mock o localStorage)
  getMedici(forceRefresh?: boolean): Promise<MedicoExtended[]>
  getMedico(id: number): Promise<MedicoExtended | null>
  
  // CRUD completo
  createMedico(data: CreateMedicoDTO): Promise<MedicoExtended>
  updateMedico(id: number, updates: UpdateMedicoDTO): Promise<MedicoExtended>
  deleteMedico(id: number): Promise<void>
  
  // Salva modifiche a regole/costi
  updateRegoleCompensi(medicoId: number, regole: RegoleCompensi): Promise<void>
  updateCostiProdotti(medicoId: number, costi: CostoProdotto[]): Promise<void>
  updateEccezioni(medicoId: number, eccezioni: Eccezione[]): Promise<void>
  
  // Reset ai dati mock originali
  reset(): Promise<void>
  
  // Export/Import
  export(): Promise<ExportData>
  import(data: ImportData): Promise<void>
}
```

#### PeriodoContabileStore
```typescript
// services/stores/periodoStore.ts
class PeriodoContabileStore {
  getPeriodoCorrente(): { mese: number, anno: number }
  setPeriodoCorrente(mese: number, anno: number): void
  
  isPeriodoChiuso(mese: number, anno: number): boolean
  chiudiPeriodo(mese: number, anno: number): void
  
  reset(): void
}
```

### 1.2 Floating Reset Button ✅ FATTO E AGGIORNATO
```typescript
// components/common/ResetButton.tsx
- Posizione fissa bottom-right
- Icona refresh/trash
- Conferma prima del reset
- Reset completo di tutti gli store:
  ✅ FattureStore.reset()
  ✅ FattureGenerator.reset()
  ✅ MediciStore.reset() (aggiunto)
  ⏳ PeriodoStore.reset() (futuro)
```

### 1.3 Modifiche a FattureGenerator ✅ FATTO
```typescript
// utils/fattureGenerator.ts
class FattureGenerator {
  // Carica da localStorage se esistono, altrimenti genera nuove
  load(): Fattura[]
  
  // Salva fatture disponibili
  save(): void
  
  // Rimuove fatture importate dalle disponibili
  rimuoviFattureImportate(ids: number[]): void
  
  // Reset e rigenera
  reset(): void
}
```

## Fase 2: Integrazione UI

### 2.1 Pagina Import
- Carica fatture disponibili da FattureStore
- Al click "Importa":
  - Salva in fatture-importate
  - Rimuove da fatture-disponibili
  - Aggiorna UI

### 2.2 Pagina Compensi
- Carica solo fatture importate
- Carica medici da MediciStore
- Calcola compensi basandosi su dati persistenti

### 2.3 Hook React
```typescript
// hooks/useFattureImportate.ts
export function useFattureImportate(periodo?: Periodo) {
  // Carica fatture importate dal store
  // Auto-refresh quando cambiano
}

// hooks/useMediciPersistenti.ts
export function useMediciPersistenti() {
  // Carica medici con modifiche persistenti
  // Metodi per update regole/costi
}
```

## Fase 3: Gestione Periodo Contabile

### 3.1 Componente Selezione Periodo
- Mostra mese/anno corrente
- Permette cambio periodo
- Indica periodi chiusi

### 3.2 Store Compensi
```typescript
// services/stores/compensiStore.ts
class CompensiStore {
  salvaCalcolo(periodo: Periodo, compensi: CompensoMedico[]): void
  getCompensi(periodo: Periodo): CompensoMedico[]
  confermaCompensi(periodo: Periodo): void
  exportCompensi(periodo: Periodo): ExportData
}
```

## Migrazione a Database

### Cosa cambierà:
```typescript
// PRIMA (localStorage)
class FattureStore {
  async importaFatture(fatture) {
    const stored = localStorage.getItem('fatture-importate');
    // ... manipolazione localStorage
  }
}

// DOPO (database)
class FattureStore {
  async importaFatture(fatture) {
    const response = await fetch('/api/fatture/import', {
      method: 'POST',
      body: JSON.stringify(fatture)
    });
    return response.json();
  }
}
```

### Cosa NON cambierà:
- Tutti i componenti React
- Business logic
- Hook e utilities
- Interfacce TypeScript

## localStorage Keys

```javascript
// Chiavi localStorage utilizzate
const STORAGE_KEYS = {
  FATTURE_DISPONIBILI: 'poliestetica-fatture-disponibili',
  FATTURE_IMPORTATE: 'poliestetica-fatture-importate',
  MEDICI_DATA: 'poliestetica-medici',
  PERIODO_CORRENTE: 'poliestetica-periodo',
  COMPENSI_CALCOLATI: 'poliestetica-compensi',
  PERIODI_CHIUSI: 'poliestetica-periodi-chiusi'
};
```

## Testing del Flusso

### Scenario Test Completo:
1. **Reset iniziale** → Floating button reset
2. **Import fatture** → Seleziona e importa
3. **Verifica persistenza** → Refresh browser
4. **Modifica medici** → Cambia regole compensi
5. **Calcola compensi** → Su fatture importate
6. **Chiudi periodo** → Blocca modifiche
7. **Export dati** → Per contabilità

## Vantaggi dell'Approccio

✅ **Immediato**: Nessun setup database richiesto
✅ **Realistico**: Simula comportamento production
✅ **Testabile**: Flusso completo end-to-end
✅ **Migrabile**: Cambio minimo per production
✅ **Isolato**: Ogni browser ha i suoi dati test

## Timeline Implementazione

- **Step 1** ✅ COMPLETATO: Store base + Reset button
  - ✅ FattureStore implementato
  - ✅ MediciStore implementato (NEW!)
  - ✅ BaseStore (classe astratta riutilizzabile)
  - ✅ DataSource pattern (interfaces, MockDataSource, Factory)
  - ✅ Reset button aggiornato per tutti gli store
- **Step 2**: Integrazione Import/Compensi
- **Step 3**: Periodo contabile
- **Step 4**: Export e reporting
- **Step 5**: Testing completo flusso

## Note Tecniche

- localStorage limite ~5-10MB
- Dati in formato JSON stringified
- Reset tramite `localStorage.clear()`
- Backup possibile via export JSON
- Compatibile con tutti i browser moderni