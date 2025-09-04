# 📁 Struttura Progetto PoliEstetica

## 🏗️ Architettura

Il progetto segue un'architettura **feature-based** con separazione chiara tra:
- **Presentazione** (pages in `/app`)
- **Logica Business** (componenti in `/features`)
- **Servizi** (logica condivisa in `/services`)
- **Dati** (mock in `/data`, future API in `/app/api`)

## 📂 Struttura Directory

```
src/
├── app/                            # Next.js App Router
│   ├── import/                     # Route import fatture
│   │   └── page.tsx               # Wrapper sottile per ImportFatture
│   │
│   ├── medici/                     # Route gestione medici
│   │   └── page.tsx               # Wrapper sottile per GestioneMedici
│   │
│   ├── compensi/                   # Route calcolo compensi
│   │   └── page.tsx               # Wrapper sottile per CalcolaCompensi
│   │
│   ├── archivio/                   # Route archivio fatture
│   │   └── page.tsx               # Wrapper per componente Archivio
│   │
│   ├── statistiche/                # Route statistiche/dashboard
│   │   └── page.tsx               # Dashboard con statistiche
│   │
│   ├── impostazioni/               # Route impostazioni
│   │   └── page.tsx               # Pagina impostazioni
│   │
│   ├── api/                        # API Routes (vuoto per ora, ready per prod)
│   │
│   ├── layout.tsx                  # Layout principale con NavigationBar
│   ├── page.tsx                    # Homepage/Landing
│   └── globals.css                 # Stili globali
│
├── features/                       # Componenti feature (business logic)
│   ├── import-fatture/            # Feature completa import
│   │   ├── ImportFatture.tsx      # Componente principale
│   │   ├── hooks/                 # Hook specifici feature
│   │   │   ├── useAnomalie.ts
│   │   │   ├── useVociManagement.ts
│   │   │   ├── useFattureFilter.ts
│   │   │   └── ...
│   │   ├── services/              # Servizi specifici feature
│   │   │   ├── importService.ts
│   │   │   ├── anomalieCalculator.ts
│   │   │   ├── exportService.ts
│   │   │   └── ...
│   │   ├── utils/                 # Utility specifiche feature
│   │   │   ├── calculators.ts
│   │   │   ├── formatters.ts
│   │   │   └── validators.ts
│   │   └── constants/             # Costanti feature
│   │       └── index.ts
│   │
│   ├── calcolo-compensi/          # Feature calcolo compensi
│   │   └── CalcolaCompensi.tsx    # Componente principale
│   │
│   ├── gestione-medici/           # Feature gestione medici
│   │   └── GestioneMedici.tsx     # Componente principale
│   │
│   ├── archivio/                  # Feature archivio
│   │   └── Archivio.tsx           # Da implementare
│   │
│   └── dashboard/                 # Feature dashboard
│       └── DashboardInteractive.tsx
│
├── components/                     # Componenti UI riutilizzabili
│   ├── NavigationBar.tsx          # Barra navigazione principale
│   └── ui/                        # Future: componenti UI base
│       ├── Button.tsx
│       ├── Card.tsx
│       └── Modal.tsx
│
├── hooks/                         # Hook globali
│   └── useFatture.ts             # Hook per gestione fatture
│
├── data/                          # Dati mock (da sostituire in prod)
│   └── mock.ts                    # Tutti i dati mock
│
├── services/                      # Servizi condivisi (vuoto per ora)
│   ├── excel/                    # Future: parser Excel
│   ├── pdf/                      # Future: generazione PDF
│   └── api/                      # Future: client API
│
├── lib/                          # Utility generali (vuoto per ora)
│   ├── constants.ts              # Future: costanti globali
│   └── utils.ts                  # Future: utility condivise
│
└── types/                        # TypeScript types (vuoto per ora)
    └── index.ts                  # Future: types centralizzati
```

## 🎯 Pattern Architetturale

### Pages (Wrapper Components)
Le pagine in `/app/[route]/page.tsx` sono **wrapper sottili** che:
1. Recuperano i dati (da mock o hook)
2. Passano i dati ai componenti feature
3. NON contengono logica business

**Esempio:**
```typescript
// app/import/page.tsx
import ImportFatture from '@/features/import-fatture/ImportFatture';
import { medici, prestazioni } from '@/data/mock';
import { useFatture } from '@/hooks/useFatture';

export default function ImportPage() {
  const { fatture, updateFattura } = useFatture();
  
  return (
    <ImportFatture 
      fatture={fatture}
      medici={medici}
      prestazioni={prestazioni}
      onUpdateFattura={updateFattura}
    />
  );
}
```

### Feature Components
I componenti in `/features` sono **componenti puri** che:
1. Ricevono tutti i dati via props
2. Contengono tutta la logica UI e business
3. Sono completamente testabili
4. NON fanno data fetching diretto

**Esempio:**
```typescript
// features/import-fatture/ImportFatture.tsx
interface ImportFattureProps {
  fatture: Fattura[];
  medici: Medico[];
  prestazioni: Prestazione[];
  onUpdateFattura: (id: number, updates: Partial<Fattura>) => void;
}

export const ImportFatture: React.FC<ImportFattureProps> = (props) => {
  // Tutta la logica UI e business qui
  // Nessun data fetching, tutto via props
}
```

## 🔄 Migrazione a Production

### Fase 1: Attuale (Mock Data)
- Dati da `/data/mock.ts`
- Pages importano direttamente i mock
- Nessuna API

### Fase 2: Hook Intermedi
- Creare hook in `/hooks` per ogni entità
- Hook usano ancora mock internamente
- Pages usano hook invece di import diretti

### Fase 3: API Integration
- Implementare API routes in `/app/api`
- Hook chiamano API invece di mock
- Componenti feature NON cambiano!

## 📝 Convenzioni

### Naming
- **Pages**: PascalCase con suffisso `Page` (es. `ImportPage`)
- **Features**: PascalCase nome feature (es. `ImportFatture`)
- **Hooks**: camelCase con prefisso `use` (es. `useFatture`)
- **Services**: camelCase con suffisso `Service` (es. `importService`)

### Import Paths
```typescript
// Usa alias assoluti
import { ImportFatture } from '@/features/import-fatture/ImportFatture';
import { useFatture } from '@/hooks/useFatture';
import { medici } from '@/data/mock';

// NON usare path relativi per cross-feature
// ❌ import { something } from '../../../features/...'
// ✅ import { something } from '@/features/...'
```

### Props Pattern
Tutti i componenti feature devono:
1. Definire interfaccia Props esplicita
2. Ricevere tutti i dati necessari via props
3. Ricevere callback per modifiche via props
4. NON fare data fetching interno

## 🚀 Prossimi Step

### Immediati
- [x] Struttura directory base
- [x] Migrazione componenti da temp/artifacts
- [ ] Update import paths nei componenti
- [ ] Test build

### Breve Termine
- [ ] Estrarre componenti UI comuni
- [ ] Creare hook per ogni entità
- [ ] Standardizzare types

### Lungo Termine
- [ ] Implementare API routes
- [ ] Sostituire mock con API calls
- [ ] Aggiungere autenticazione
- [ ] Deploy production

## 🛠️ Comandi Utili

```bash
# Development
npm run dev

# Build
npm run build

# Test build locale
npm run build && npm run start

# Type check
npm run type-check

# Lint
npm run lint
```

## 📚 Note Tecniche

- **Framework**: Next.js 14+ con App Router
- **Styling**: Tailwind CSS
- **State Management**: React hooks + Context (se necessario)
- **Data Fetching**: SWR o React Query (future)
- **Type Safety**: TypeScript strict mode