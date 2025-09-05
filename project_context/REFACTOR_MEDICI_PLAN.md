# Piano di Refactoring GestioneMedici

## Executive Summary

Refactoring completo del componente monolitico `GestioneMedici.tsx` (3266 righe) in un'architettura modulare, mantenibile e pronta per la transizione da mock data a database reale.

## Analisi Stato Attuale

### Problematiche Identificate

1. **Componente Monolitico** (3266 righe)
   - Troppe responsabilità in un singolo file
   - Difficile da mantenere e testare
   - Logica di business mescolata con UI
   - Performance issues con re-render non necessari

2. **Gestione State Complessa**
   - 20+ useState hooks
   - State management non ottimizzato
   - Mancanza di un pattern consistente
   - Duplicazione di logica

3. **Logica Business nella UI**
   - Calcoli compensi embedded nel componente
   - Validazioni sparse nel codice
   - Trasformazioni dati inline
   - Nessuna separazione delle concerns

4. **Mancanza di Persistenza**
   - Dati persi al refresh
   - Non allineato con IMPLEMENTATION_PLAN
   - Mock data hardcoded
   - Nessuna preparazione per API future

5. **UI Components Non Riutilizzabili**
   - Modal duplicati
   - Form non estratti
   - Tabelle inline
   - Nessun design system

## Architettura Target

### Layer Architecture

```
┌─────────────────────────────────────────────────┐
│                  UI Components                   │
│         (React Components & Hooks)               │
├─────────────────────────────────────────────────┤
│                Service Layer                     │
│         (Business Logic & Storage)               │
├─────────────────────────────────────────────────┤
│                 Data Sources                     │
│      (Mock → localStorage → API)                 │
└─────────────────────────────────────────────────┘
```

### Struttura File System

```
src/
├── features/
│   └── gestione-medici/
│       ├── GestioneMedici.tsx                 // Container principale (<200 righe)
│       ├── components/
│       │   ├── MediciList/
│       │   │   ├── index.tsx
│       │   │   ├── MediciList.tsx
│       │   │   ├── MedicoCard.tsx
│       │   │   └── MedicoListSkeleton.tsx
│       │   ├── MedicoDetail/
│       │   │   ├── index.tsx
│       │   │   ├── MedicoDetail.tsx
│       │   │   ├── MedicoDetailHeader.tsx
│       │   │   └── tabs/
│       │   │       ├── AnagraficaTab.tsx
│       │   │       ├── RegoleTab.tsx
│       │   │       ├── ProdottiTab.tsx
│       │   │       ├── EccezioniTab.tsx
│       │   │       └── SimulatoreTab.tsx
│       │   ├── modals/
│       │   │   ├── AddMedicoModal.tsx
│       │   │   ├── AddProdottoModal.tsx
│       │   │   ├── AddEccezioneModal.tsx
│       │   │   ├── ImportProdottiModal.tsx
│       │   │   └── ConfirmImportModal.tsx
│       │   └── shared/
│       │       ├── RegolaForm.tsx
│       │       ├── ValidationWarnings.tsx
│       │       ├── ExportControls.tsx
│       │       └── UnsavedChangesWarning.tsx
│       ├── hooks/
│       │   ├── useMediciData.ts
│       │   ├── useCompensiCalc.ts
│       │   ├── useImportExport.ts
│       │   ├── useValidation.ts
│       │   └── useSimulatore.ts
│       ├── types/
│       │   ├── index.ts
│       │   ├── medici.types.ts
│       │   ├── regole.types.ts
│       │   └── compensi.types.ts
│       └── utils/
│           ├── validators.ts
│           ├── formatters.ts
│           └── exportHelpers.ts
│
├── services/
│   ├── stores/
│   │   ├── mediciStore.ts
│   │   ├── regoleStore.ts
│   │   └── baseStore.ts
│   ├── compensi/
│   │   ├── compensiCalculator.ts
│   │   ├── regolaValidator.ts
│   │   ├── eccezioniManager.ts
│   │   └── prodottiCostiManager.ts
│   └── datasources/
│       ├── interfaces.ts
│       ├── mockDataSource.ts
│       ├── apiDataSource.ts
│       └── dataSourceFactory.ts
```

## Service Layer Architecture

### 1. Data Source Interface

```typescript
// services/datasources/interfaces.ts
export interface DataSource {
  // Medici CRUD
  getMedici(): Promise<Medico[]>;
  getMedico(id: number): Promise<Medico | null>;
  createMedico(data: CreateMedicoDTO): Promise<Medico>;
  updateMedico(id: number, data: UpdateMedicoDTO): Promise<Medico>;
  deleteMedico(id: number): Promise<void>;
  
  // Regole & Costi
  getRegoleCompensi(medicoId: number): Promise<MedicoRegoleCosti>;
  updateRegoleCompensi(medicoId: number, regole: RegoleCompensi): Promise<void>;
  updateCostiProdotti(medicoId: number, costi: CostiProdotti[]): Promise<void>;
  
  // Utilities
  reset(): Promise<void>;
  export(): Promise<ExportData>;
  import(data: ImportData): Promise<void>;
}
```

### 2. Mock Data Source Implementation

```typescript
// services/datasources/mockDataSource.ts
import { medici as mockMedici, regoleCosti } from '@/data/mock';

export class MockDataSource implements DataSource {
  private readonly STORAGE_KEYS = {
    MEDICI: 'poliestetica-medici',
    REGOLE: 'poliestetica-medici-regole',
    COSTI: 'poliestetica-medici-costi',
  };
  
  async getMedici(): Promise<Medico[]> {
    // Prima volta: carica da mock
    const stored = localStorage.getItem(this.STORAGE_KEYS.MEDICI);
    if (!stored) {
      // Combina medici con regole costi
      const mediciCompleti = this.mergeWithRegoleCosti(mockMedici, regoleCosti);
      localStorage.setItem(this.STORAGE_KEYS.MEDICI, JSON.stringify(mediciCompleti));
      return mediciCompleti;
    }
    return JSON.parse(stored);
  }
  
  async updateMedico(id: number, updates: UpdateMedicoDTO): Promise<Medico> {
    const medici = await this.getMedici();
    const index = medici.findIndex(m => m.id === id);
    if (index === -1) throw new Error(`Medico ${id} not found`);
    
    const updated = { ...medici[index], ...updates };
    medici[index] = updated;
    
    localStorage.setItem(this.STORAGE_KEYS.MEDICI, JSON.stringify(medici));
    return updated;
  }
  
  async reset(): Promise<void> {
    Object.values(this.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
  
  private mergeWithRegoleCosti(medici: Medico[], regole: any): MedicoExtended[] {
    return medici.map(medico => {
      const regoleMedico = regole[medico.id.toString()];
      return {
        ...medico,
        regolaBase: regoleMedico?.regolaBase || this.getDefaultRegola(),
        costiProdotti: regoleMedico?.costiProdotti || [],
        eccezioni: regoleMedico?.eccezioni || []
      };
    });
  }
}
```

### 3. API Data Source (Future)

```typescript
// services/datasources/apiDataSource.ts
export class ApiDataSource implements DataSource {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
  
  async getMedici(): Promise<Medico[]> {
    const response = await fetch(`${this.baseUrl}/medici`);
    if (!response.ok) throw new Error('Failed to fetch medici');
    return response.json();
  }
  
  async updateMedico(id: number, updates: UpdateMedicoDTO): Promise<Medico> {
    const response = await fetch(`${this.baseUrl}/medici/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update medico');
    return response.json();
  }
  
  // ... altri metodi
}
```

### 4. Data Source Factory

```typescript
// services/datasources/dataSourceFactory.ts
export class DataSourceFactory {
  static create(): DataSource {
    const mode = process.env.NEXT_PUBLIC_DATA_MODE || 'auto';
    
    switch(mode) {
      case 'mock':
        return new MockDataSource();
      case 'api':
        return new ApiDataSource();
      case 'hybrid':
        return new HybridDataSource();
      default:
        // Auto-detect: dev=mock, prod=api
        return process.env.NODE_ENV === 'development'
          ? new MockDataSource()
          : new ApiDataSource();
    }
  }
}
```

### 5. Store Layer

```typescript
// services/stores/mediciStore.ts
export class MediciStore {
  private static instance: MediciStore;
  private dataSource: DataSource;
  private cache: Map<string, any> = new Map();
  
  private constructor() {
    this.dataSource = DataSourceFactory.create();
  }
  
  static getInstance(): MediciStore {
    if (!MediciStore.instance) {
      MediciStore.instance = new MediciStore();
    }
    return MediciStore.instance;
  }
  
  async getMedici(forceRefresh = false): Promise<Medico[]> {
    const cacheKey = 'medici-list';
    
    if (!forceRefresh && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const medici = await this.dataSource.getMedici();
    this.cache.set(cacheKey, medici);
    return medici;
  }
  
  async updateMedico(id: number, updates: UpdateMedicoDTO): Promise<Medico> {
    const updated = await this.dataSource.updateMedico(id, updates);
    this.invalidateCache();
    return updated;
  }
  
  private invalidateCache(): void {
    this.cache.clear();
  }
}
```

## React Hooks Implementation

### 1. useMediciData Hook

```typescript
// features/gestione-medici/hooks/useMediciData.ts
export function useMediciData() {
  const [medici, setMedici] = useState<Medico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const store = useMemo(() => MediciStore.getInstance(), []);
  
  // Load initial data
  useEffect(() => {
    loadMedici();
  }, []);
  
  const loadMedici = async () => {
    try {
      setLoading(true);
      const data = await store.getMedici();
      setMedici(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const updateMedico = async (id: number, updates: UpdateMedicoDTO) => {
    try {
      const updated = await store.updateMedico(id, updates);
      setMedici(prev => prev.map(m => m.id === id ? updated : m));
      setHasUnsavedChanges(false);
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };
  
  const resetData = async () => {
    if (confirm('Sicuro di voler resettare tutti i dati?')) {
      await store.reset();
      await loadMedici();
      setHasUnsavedChanges(false);
    }
  };
  
  return {
    medici,
    loading,
    error,
    hasUnsavedChanges,
    updateMedico,
    resetData,
    reload: loadMedici
  };
}
```

### 2. useCompensiCalc Hook

```typescript
// features/gestione-medici/hooks/useCompensiCalc.ts
export function useCompensiCalc(medico: Medico | null) {
  const calculator = useMemo(() => new CompensiCalculator(), []);
  
  const calcola = useCallback((params: CalcoloParams) => {
    if (!medico) return null;
    
    return calculator.calcola({
      medico,
      ...params
    });
  }, [medico, calculator]);
  
  const simulazione = useCallback((params: SimulazioneParams) => {
    if (!medico) return null;
    
    return calculator.simula({
      medico,
      ...params
    });
  }, [medico, calculator]);
  
  return {
    calcola,
    simulazione
  };
}
```

## Fasi di Implementazione

### Fase 1: Infrastruttura Base (2-3 giorni)

#### Sprint Tasks
1. **Setup Service Layer**
   - [ ] Creare interfaces DataSource
   - [ ] Implementare MockDataSource
   - [ ] Implementare MediciStore
   - [ ] Setup DataSourceFactory
   - [ ] Unit tests per services

2. **Business Logic Extraction**
   - [ ] Creare CompensiCalculator
   - [ ] Creare RegolaValidator
   - [ ] Creare EccezioniManager
   - [ ] Creare ProdottiCostiManager
   - [ ] Unit tests per business logic

3. **Custom Hooks**
   - [ ] Implementare useMediciData
   - [ ] Implementare useCompensiCalc
   - [ ] Implementare useValidation
   - [ ] Implementare useSimulatore
   - [ ] Tests per hooks

### Fase 2: Component Extraction (3-4 giorni)

#### Sprint Tasks
1. **Lista Medici**
   - [ ] Estrarre MediciList component
   - [ ] Creare MedicoCard
   - [ ] Implementare ricerca/filtri
   - [ ] Aggiungere skeleton loading

2. **Dettaglio Medico**
   - [ ] Creare MedicoDetail container
   - [ ] Estrarre MedicoDetailHeader
   - [ ] Setup tab navigation
   - [ ] Gestione unsaved changes

3. **Tab Components**
   - [ ] AnagraficaTab
   - [ ] RegoleTab
   - [ ] ProdottiTab
   - [ ] EccezioniTab
   - [ ] SimulatoreTab

### Fase 3: Modal Components (2 giorni)

#### Sprint Tasks
1. **Modal Extraction**
   - [ ] AddMedicoModal
   - [ ] AddProdottoModal
   - [ ] AddEccezioneModal
   - [ ] ImportProdottiModal
   - [ ] ConfirmImportModal

2. **Shared Components**
   - [ ] RegolaForm
   - [ ] ValidationWarnings
   - [ ] ExportControls
   - [ ] UnsavedChangesWarning

### Fase 4: Integration & Testing (2 giorni)

#### Sprint Tasks
1. **Integration**
   - [ ] Collegare tutti i componenti
   - [ ] Implementare routing interno
   - [ ] Gestione errori globale
   - [ ] Performance optimization

2. **Testing**
   - [ ] Integration tests
   - [ ] E2E test scenarios
   - [ ] Performance testing
   - [ ] Accessibility audit

3. **Documentation**
   - [ ] Component documentation
   - [ ] API documentation
   - [ ] Migration guide
   - [ ] Developer guide

## Metriche di Successo

### Performance
- [ ] Tempo di caricamento iniziale < 500ms
- [ ] Re-render ridotti del 70%
- [ ] Bundle size ridotto del 40%
- [ ] Lighthouse score > 90

### Code Quality
- [ ] Nessun componente > 300 righe
- [ ] Test coverage > 80%
- [ ] Zero TypeScript errors
- [ ] ESLint warnings < 10

### Maintainability
- [ ] Cyclomatic complexity < 10
- [ ] Duplicazione codice < 5%
- [ ] Dependency coupling < 0.3
- [ ] Documentation coverage > 90%

## Migration Path

### Step 1: Development (Current)
```typescript
// .env.development
NEXT_PUBLIC_DATA_MODE=mock
```

### Step 2: Staging
```typescript
// .env.staging
NEXT_PUBLIC_DATA_MODE=hybrid
NEXT_PUBLIC_API_URL=https://staging-api.poliestetica.com
```

### Step 3: Production
```typescript
// .env.production
NEXT_PUBLIC_DATA_MODE=api
NEXT_PUBLIC_API_URL=https://api.poliestetica.com
```

## Risk Mitigation

### Rischi Identificati
1. **Breaking changes durante refactor**
   - Mitigation: Feature flags per rollback
   - Testing incrementale
   - Canary deployment

2. **Performance degradation**
   - Mitigation: Performance monitoring
   - Lazy loading
   - Code splitting

3. **Data loss durante migrazione**
   - Mitigation: Backup localStorage
   - Export functionality
   - Rollback mechanism

## Checklist Pre-Implementazione

- [ ] Review architettura con il team
- [ ] Setup ambiente di test
- [ ] Backup del codice esistente
- [ ] Configurare feature flags
- [ ] Setup monitoring tools
- [ ] Preparare rollback plan

## Checklist Post-Implementazione

- [ ] Tutti i test passano
- [ ] Performance metrics soddisfatte
- [ ] Documentazione completa
- [ ] Code review completato
- [ ] Staging deployment testato
- [ ] Production deployment plan pronto

## Note Tecniche

### localStorage Limits
- Max size: ~5-10MB
- Sync operations only
- String data only
- Per-domain isolation

### Performance Considerations
- Use React.memo for expensive components
- Implement virtual scrolling for long lists
- Lazy load tab contents
- Debounce search inputs

### Security Considerations
- Sanitize all inputs
- Validate data before storage
- No sensitive data in localStorage
- HTTPS only for API calls

## Conclusione

Questo refactoring trasformerà un componente monolitico di 3266 righe in un'architettura modulare, testabile e scalabile. L'approccio incrementale garantisce che l'applicazione rimanga funzionante durante tutto il processo, mentre la struttura a layers permette una transizione seamless da mock data a database reale senza modifiche ai componenti UI.

Timeline stimata: **10-12 giorni lavorativi**
ROI atteso: **Riduzione 60% tempo manutenzione, 80% facilità nuove features**