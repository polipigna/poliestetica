# Analisi e Piano di Refactoring - Componente CalcoloCompensi

## 📊 Analisi del Componente Attuale

### Dimensioni e Complessità
- **Linee di codice**: 1889 righe
- **File**: `/src/features/calcolo-compensi/CalcolaCompensi.tsx`
- **Complessità**: MOLTO ALTA - il componente gestisce troppe responsabilità

### Problemi Principali Identificati

#### 1. **Errori di Stato e Props**
- Uso di `setMedici` e `setMeseCorrente` che non esistono nelle props
- Mutazione diretta dello stato invece di usare callback props
- Stati non tipizzati correttamente (any types)

#### 2. **Violazione Single Responsibility**
Il componente gestisce:
- Calcolo compensi
- Gestione anomalie
- Chiusura medici/mese
- Modifica compensi
- Mappatura prodotti
- Verifica fatture
- Export PDF
- UI complessa con tabs e modali

#### 3. **Stati Non Gestiti Correttamente**
- 20+ useState in un singolo componente
- Stati derivati calcolati inline invece che con useMemo
- Logica business mescolata con UI

#### 4. **Mancanza di Type Safety**
- Uso di `any` in diversi punti
- Funzioni non tipizzate
- Event handlers con tipi impliciti

#### 5. **Performance Issues**
- Ricalcoli non ottimizzati
- Mancanza di memoization dove necessario
- Re-render non necessari

## 🎯 Piano di Refactoring Dettagliato

### Fase 1: Estrazione Custom Hooks

#### `useCompensiCalculation`
```typescript
// hooks/useCompensiCalculation.ts
interface UseCompensiCalculationProps {
  fatture: Fattura[];
  medici: Medico[];
  regoleCosti: Record<string, MedicoRegoleCosti>;
  meseSelezionato: string;
}

interface VoceFattura {
  id: number;
  medicoId: number;
  numeroFattura: string;
  dataFattura: string;
  paziente: string;
  prestazione: string;
  prodotto: string | null;
  quantita: number;
  unita: string;
  importoLordo: number;
  importoNetto: number;
  costoProdotto: number;
  compensoCalcolato: number;
  compensoFinale: number;
  regolaApplicata: string;
  modificatoDa: string | null;
  tipoFattura: 'conIVA' | 'senzaIVA';
}

export function useCompensiCalculation({
  fatture,
  medici,
  regoleCosti,
  meseSelezionato
}: UseCompensiCalculationProps) {
  // Logica di calcolo compensi
  // Stati derivati
  // Funzioni di aggiornamento
}
```

#### `useChiusuraMese`
```typescript
// hooks/useChiusuraMese.ts
interface UseChiusuraMeseProps {
  meseSelezionato: string;
  meseChiuso: boolean;
  onChiudiMese?: () => void;
}

export function useChiusuraMese({
  meseSelezionato,
  meseChiuso,
  onChiudiMese
}: UseChiusuraMeseProps) {
  // Gestione stato chiusura mese
  // Validazioni
  // Handler chiusura/riapertura
}
```

#### `useAnomalieGestione`
```typescript
// hooks/useAnomalieGestione.ts
interface UseAnomalieGestioneProps {
  fatture: Fattura[];
  regoleCosti: Record<string, MedicoRegoleCosti>;
}

export function useAnomalieGestione({
  fatture,
  regoleCosti
}: UseAnomalieGestioneProps) {
  // Identificazione anomalie
  // Gestione mappatura prodotti
  // Risoluzione anomalie
}
```

### Fase 2: Componenti Atomici

#### Struttura delle Cartelle
```
src/features/calcolo-compensi/
├── CalcoloCompensi.tsx (componente principale ridotto)
├── components/
│   ├── RiepilogoMedici.tsx
│   ├── DettaglioMedico.tsx
│   ├── TabellaVociFatture.tsx
│   ├── GestioneAnomalie.tsx
│   ├── ModificaCompenso.tsx
│   ├── ChiusuraMedico.tsx
│   ├── ChiusuraMese.tsx
│   ├── MappaturaProdotto.tsx
│   └── ExportActions.tsx
├── hooks/
│   ├── useCompensiCalculation.ts
│   ├── useChiusuraMese.ts
│   ├── useAnomalieGestione.ts
│   ├── useMediciStati.ts
│   └── useExportPDF.ts
├── utils/
│   ├── compensiCalculator.ts
│   ├── anomalieDetector.ts
│   ├── regolaFormatter.ts
│   └── validations.ts
└── types/
    ├── compensi.types.ts
    └── chiusura.types.ts
```

### Fase 3: Componenti Specifici

#### `RiepilogoMedici.tsx`
```typescript
interface RiepilogoMediciProps {
  medici: MedicoWithTotals[];
  onSelectMedico: (medicoId: number) => void;
  statiChiusura: Record<number, boolean>;
}

export function RiepilogoMedici({
  medici,
  onSelectMedico,
  statiChiusura
}: RiepilogoMediciProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {medici.map(medico => (
        <MedicoCard 
          key={medico.id}
          medico={medico}
          isChiuso={statiChiusura[medico.id]}
          onClick={() => onSelectMedico(medico.id)}
        />
      ))}
    </div>
  );
}
```

#### `TabellaVociFatture.tsx`
```typescript
interface TabellaVociFattureProps {
  voci: VoceFattura[];
  medicoId?: number;
  isReadOnly: boolean;
  onModificaCompenso: (voceId: number) => void;
  onRipristinaCompenso: (voceId: number) => void;
}

export function TabellaVociFatture({
  voci,
  medicoId,
  isReadOnly,
  onModificaCompenso,
  onRipristinaCompenso
}: TabellaVociFattureProps) {
  // Tabella con paginazione
  // Sorting e filtering
  // Actions per modifica/ripristino
}
```

### Fase 4: State Management con Context

#### `CompensiContext.tsx`
```typescript
interface CompensiContextValue {
  // Stati
  vociFatture: VoceFattura[];
  anomalie: Anomalia[];
  mediciStati: Record<number, MedicoStato>;
  meseStato: MeseStato;
  
  // Actions
  updateCompenso: (fatturaId: number, compenso: number) => void;
  chiudiMedico: (medicoId: number) => Promise<void>;
  chiudiMese: () => Promise<void>;
  risolviAnomalia: (anomaliaId: number, soluzione: SoluzioneAnomalia) => void;
}

export const CompensiProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Gestione centralizzata dello stato
  // Logica business
  // API calls
};
```

### Fase 5: Utilities e Helpers

#### `compensiCalculator.ts`
```typescript
export function calcolaCompensoFattura(
  fattura: Fattura,
  regole: MedicoRegoleCosti
): number {
  // Logica di calcolo isolata e testabile
}

export function calcolaTotaliMedico(
  voci: VoceFattura[]
): TotaliMedico {
  // Calcolo totali con memoization
}

export function getRegolaApplicataDescrizione(
  fattura: Fattura,
  regole: MedicoRegoleCosti
): string {
  // Formattazione descrizioni regole
}
```

### Fase 6: Validazioni e Type Guards

#### `validations.ts`
```typescript
export function canModifyCompenso(
  medicoStato: MedicoStato,
  meseStato: MeseStato,
  userRole: UserRole
): boolean {
  return (
    medicoStato.stato === 'aperto' &&
    meseStato.stato === 'aperto' &&
    (userRole === 'admin' || userRole === 'operatore')
  );
}

export function canChiudiMedico(
  medico: Medico,
  anomalie: Anomalia[],
  checklist: Checklist
): ValidationResult {
  // Validazioni complete per chiusura
}
```

### Fase 7: Componente Principale Refactored

```typescript
// CalcoloCompensi.tsx - VERSIONE REFACTORED
export default function CalcoloCompensi({
  fatture,
  medici,
  regoleCosti,
  meseSelezionato,
  statiChiusura = {},
  meseChiuso = false,
  onSaveCompenso,
  onChiudiMedico,
  onChiudiMese,
  isLoading = false
}: CalcoloCompensiProps) {
  const { vociFatture, anomalie, totaliMedici } = useCompensiCalculation({
    fatture,
    medici,
    regoleCosti,
    meseSelezionato
  });

  const { mediciStati, handleChiusuraMedico } = useMediciStati({
    medici,
    statiChiusura,
    onChiudiMedico
  });

  const { meseStato, handleChiusuraMese } = useChiusuraMese({
    meseSelezionato,
    meseChiuso,
    onChiudiMese
  });

  const [activeTab, setActiveTab] = useState<'riepilogo' | 'dettaglio' | 'anomalie'>('riepilogo');
  const [selectedMedicoId, setSelectedMedicoId] = useState<number | null>(null);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (vociFatture.length === 0) {
    return <EmptyState message="Nessuna fattura importata per il periodo selezionato." />;
  }

  return (
    <CompensiProvider value={{...}}>
      <div className="space-y-6">
        <Header 
          mese={meseSelezionato}
          meseStato={meseStato}
          onChiudiMese={handleChiusuraMese}
        />

        <TabNavigation 
          activeTab={activeTab}
          onTabChange={setActiveTab}
          anomalieCount={anomalie.length}
        />

        {activeTab === 'riepilogo' && (
          <RiepilogoMedici
            medici={totaliMedici}
            onSelectMedico={setSelectedMedicoId}
            statiChiusura={mediciStati}
          />
        )}

        {activeTab === 'dettaglio' && selectedMedicoId && (
          <DettaglioMedico
            medicoId={selectedMedicoId}
            vociFatture={vociFatture.filter(v => v.medicoId === selectedMedicoId)}
            isReadOnly={mediciStati[selectedMedicoId]?.stato === 'chiuso'}
          />
        )}

        {activeTab === 'anomalie' && (
          <GestioneAnomalie
            anomalie={anomalie}
            onRisolvi={(anomaliaId, soluzione) => {...}}
          />
        )}
      </div>
    </CompensiProvider>
  );
}
```

## 📋 Checklist Implementazione

### Priorità 1 - Risoluzione Errori Critici
- [ ] Rimuovere `setMedici` e `setMeseCorrente` non definiti
- [ ] Sostituire con callback props corrette
- [ ] Tipizzare tutti gli `any`
- [ ] Aggiungere tipi mancanti per eventi DOM

### Priorità 2 - Estrazione Logica
- [ ] Creare hook `useCompensiCalculation`
- [ ] Creare hook `useMediciStati`
- [ ] Creare hook `useChiusuraMese`
- [ ] Estrarre utility functions

### Priorità 3 - Componentizzazione
- [ ] Creare componente `RiepilogoMedici`
- [ ] Creare componente `TabellaVociFatture`
- [ ] Creare componente `GestioneAnomalie`
- [ ] Creare componenti modali separati

### Priorità 4 - Ottimizzazione
- [ ] Implementare memoization corretta
- [ ] Ottimizzare re-renders
- [ ] Lazy loading per componenti pesanti
- [ ] Virtual scrolling per tabelle grandi

### Priorità 5 - Testing
- [ ] Unit test per utility functions
- [ ] Test hooks custom
- [ ] Integration test componenti
- [ ] E2E test flussi principali

## 🎉 Benefici del Refactoring

1. **Manutenibilità**: Codice modulare e facile da modificare
2. **Testabilità**: Ogni parte può essere testata in isolamento
3. **Performance**: Rendering ottimizzato e calcoli memoizzati
4. **Type Safety**: Errori catturati a compile-time
5. **Riusabilità**: Componenti e hooks riutilizzabili
6. **Scalabilità**: Facile aggiungere nuove funzionalità
7. **Developer Experience**: Codice più leggibile e debuggabile

## 🚀 Prossimi Passi

1. Iniziare con la risoluzione degli errori critici
2. Estrarre gradualmente la logica in hooks
3. Creare componenti atomici uno alla volta
4. Testare ogni parte man mano che viene refactored
5. Documentare le nuove API dei componenti