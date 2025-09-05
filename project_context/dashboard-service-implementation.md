# Dashboard Service Implementation

## Obiettivo
Rendere la Dashboard reattiva ai dati reali aggregando informazioni da tutti gli store esistenti (FattureStore, MediciStore, RegoleStore).

## File da Creare

### 1. `/src/services/dashboardService.ts`
```typescript
import { FattureStore } from './stores/fattureStore';
import { MediciStore } from './stores/mediciStore';
import type { Periodo } from '@/types';

export interface DashboardStats {
  // Metriche principali
  fattureDaImportare: number;
  anomalieDaGestire: number;
  mediciAttivi: number;
  compensiDaCalcolare: number;
  
  // Stato periodo
  meseCorrente: string;
  statoMese: 'aperto' | 'chiuso';
  
  // Metriche finanziarie
  totaleImportatoMese: number;
  totaleCompensiMese: number;
  margineMese: number;
  
  // Trend (confronto con mese precedente)
  trendFatture: number; // percentuale
  trendCompensi: number; // percentuale
  
  // Attività recenti
  ultimaImportazione: string | null;
  ultimaChiusura: string | null;
  attivitaRecenti: ActivityLog[];
}

interface ActivityLog {
  tipo: 'import' | 'calcolo' | 'chiusura' | 'modifica';
  descrizione: string;
  timestamp: Date;
  utente: string;
}

export class DashboardService {
  private static instance: DashboardService;
  private fattureStore = FattureStore.getInstance();
  private mediciStore = MediciStore.getInstance();
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private CACHE_TTL = 30000; // 30 secondi

  static getInstance(): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService();
    }
    return DashboardService.instance;
  }

  async getDashboardStats(periodo?: Periodo): Promise<DashboardStats> {
    const cacheKey = `dashboard_${periodo?.anno}_${periodo?.mese}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    // Caricamento parallelo di tutti i dati
    const [fatture, medici, fattureImportate] = await Promise.all([
      this.fattureStore.getFattureDisponibili(),
      this.mediciStore.getMedici(),
      this.fattureStore.getFattureImportate(periodo)
    ]);

    // Calcolo metriche
    const stats = this.calculateStats(fatture, medici, fattureImportate, periodo);
    
    // Cache risultato
    this.cache.set(cacheKey, { data: stats, timestamp: Date.now() });
    
    return stats;
  }

  private calculateStats(fatture: any[], medici: any[], fattureImportate: any[], periodo?: Periodo): DashboardStats {
    // Anomalie
    const anomalie = fattureImportate.filter(f => f.anomalie && f.anomalie.length > 0);
    
    // Compensi non calcolati
    const compensiDaCalcolare = fattureImportate.filter(f => 
      f.stato === 'importata' && !f.compensoCalcolato
    );

    // Metriche finanziarie
    const totaleImportato = fattureImportate.reduce((sum, f) => sum + (f.importo || 0), 0);
    const totaleCompensi = fattureImportate.reduce((sum, f) => sum + (f.compensoCalcolato || 0), 0);
    
    // Attività recenti (from localStorage o API)
    const attivitaRecenti = this.getAttivitaRecenti();

    return {
      fattureDaImportare: fatture.length,
      anomalieDaGestire: anomalie.length,
      mediciAttivi: medici.filter(m => m.attivo !== false).length,
      compensiDaCalcolare: compensiDaCalcolare.length,
      meseCorrente: this.formatPeriodo(periodo),
      statoMese: this.getStatoMese(periodo),
      totaleImportatoMese: totaleImportato,
      totaleCompensiMese: totaleCompensi,
      margineMese: totaleImportato - totaleCompensi,
      trendFatture: this.calculateTrend('fatture', periodo),
      trendCompensi: this.calculateTrend('compensi', periodo),
      ultimaImportazione: this.getUltimaImportazione(),
      ultimaChiusura: this.getUltimaChiusura(),
      attivitaRecenti
    };
  }

  // Metodi helper
  private formatPeriodo(periodo?: Periodo): string {
    if (!periodo) {
      const now = new Date();
      return `${now.toLocaleString('it-IT', { month: 'long' })} ${now.getFullYear()}`;
    }
    return `${periodo.mese} ${periodo.anno}`;
  }

  private getStatoMese(periodo?: Periodo): 'aperto' | 'chiuso' {
    // Logica per determinare se il mese è chiuso
    const chiusure = JSON.parse(localStorage.getItem('poliestetica_chiusure') || '{}');
    const key = periodo ? `${periodo.anno}_${periodo.mese}` : 'current';
    return chiusure[key] ? 'chiuso' : 'aperto';
  }

  private calculateTrend(tipo: 'fatture' | 'compensi', periodo?: Periodo): number {
    // Calcolo trend rispetto al mese precedente
    // Per ora ritorna 0, implementare con dati storici
    return 0;
  }

  private getAttivitaRecenti(): ActivityLog[] {
    const logs = JSON.parse(localStorage.getItem('poliestetica_activity_logs') || '[]');
    return logs.slice(0, 10); // Ultime 10 attività
  }

  private getUltimaImportazione(): string | null {
    const logs = this.getAttivitaRecenti();
    const ultima = logs.find(l => l.tipo === 'import');
    return ultima ? new Date(ultima.timestamp).toLocaleString('it-IT') : null;
  }

  private getUltimaChiusura(): string | null {
    const logs = this.getAttivitaRecenti();
    const ultima = logs.find(l => l.tipo === 'chiusura');
    return ultima ? new Date(ultima.timestamp).toLocaleString('it-IT') : null;
  }

  // Sottoscrizione per aggiornamenti real-time
  subscribe(listener: () => void): () => void {
    const unsubscribers = [
      this.fattureStore.subscribe(listener),
      this.mediciStore.subscribe(listener)
    ];

    return () => unsubscribers.forEach(unsub => unsub());
  }

  // Metodo per registrare attività
  logActivity(tipo: ActivityLog['tipo'], descrizione: string, utente: string): void {
    const logs = JSON.parse(localStorage.getItem('poliestetica_activity_logs') || '[]');
    logs.unshift({
      tipo,
      descrizione,
      timestamp: new Date(),
      utente
    });
    // Mantieni solo ultime 100 attività
    localStorage.setItem('poliestetica_activity_logs', JSON.stringify(logs.slice(0, 100)));
    
    // Invalida cache
    this.cache.clear();
  }
}
```

### 2. `/src/hooks/useDashboard.ts`
```typescript
import { useState, useEffect } from 'react';
import { DashboardService } from '@/services/dashboardService';
import type { DashboardStats } from '@/services/dashboardService';
import type { Periodo } from '@/types';

export function useDashboard(periodo?: Periodo) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const dashboardService = DashboardService.getInstance();

  const loadStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await dashboardService.getDashboardStats(periodo);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore caricamento dashboard');
      console.error('Dashboard error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();

    // Sottoscrizione per aggiornamenti real-time
    const unsubscribe = dashboardService.subscribe(() => {
      loadStats();
    });

    return unsubscribe;
  }, [periodo?.anno, periodo?.mese]);

  return { 
    stats, 
    isLoading, 
    error,
    refresh: loadStats 
  };
}
```

### 3. Aggiornamento Dashboard Component

```typescript
// In /src/app/page.tsx o Dashboard.tsx

'use client';

import { useDashboard } from '@/hooks/useDashboard';
import { useUser } from '@/contexts/UserContext';

export default function Dashboard() {
  const { stats, isLoading, error, refresh } = useDashboard();
  const { user, isAdmin } = useUser();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={refresh} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-600">
            Periodo: {stats.meseCorrente} 
            <span className={`ml-2 px-2 py-1 rounded text-xs ${
              stats.statoMese === 'chiuso' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              {stats.statoMese}
            </span>
          </p>
        </div>
        <button onClick={refresh} className="btn-secondary">
          Aggiorna
        </button>
      </div>

      {/* Metriche principali */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Fatture da Importare"
          value={stats.fattureDaImportare}
          trend={stats.trendFatture}
          icon={FileText}
          color="blue"
        />
        
        <MetricCard
          title="Anomalie da Gestire"
          value={stats.anomalieDaGestire}
          icon={AlertTriangle}
          color={stats.anomalieDaGestire > 0 ? "amber" : "green"}
          urgent={stats.anomalieDaGestire > 0}
        />
        
        <MetricCard
          title="Medici Attivi"
          value={stats.mediciAttivi}
          icon={Users}
          color="indigo"
        />
        
        <MetricCard
          title="Compensi da Calcolare"
          value={stats.compensiDaCalcolare}
          icon={Calculator}
          color="purple"
        />
      </div>

      {/* Riepilogo finanziario */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Riepilogo Finanziario</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Totale Importato</p>
            <p className="text-2xl font-bold">€ {stats.totaleImportatoMese.toLocaleString('it-IT')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Totale Compensi</p>
            <p className="text-2xl font-bold">€ {stats.totaleCompensiMese.toLocaleString('it-IT')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Margine</p>
            <p className="text-2xl font-bold">€ {stats.margineMese.toLocaleString('it-IT')}</p>
          </div>
        </div>
      </div>

      {/* Attività recenti */}
      {stats.attivitaRecenti.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Attività Recenti</h2>
          <div className="space-y-2">
            {stats.attivitaRecenti.map((attivita, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-3">
                  <ActivityIcon tipo={attivita.tipo} />
                  <div>
                    <p className="text-sm font-medium">{attivita.descrizione}</p>
                    <p className="text-xs text-gray-500">
                      {attivita.utente} - {new Date(attivita.timestamp).toLocaleString('it-IT')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

## Implementazione Step-by-Step

### Fase 1: Setup Base
1. Creare `dashboardService.ts` con metriche essenziali
2. Creare hook `useDashboard`
3. Integrare in Dashboard component esistente

### Fase 2: Metriche Avanzate
1. Aggiungere calcolo trend
2. Implementare storico attività
3. Aggiungere metriche per ruolo utente

### Fase 3: Ottimizzazioni
1. Implementare cache intelligente
2. Aggiungere debouncing per aggiornamenti
3. Lazy loading per metriche pesanti

### Fase 4: Production
1. Sostituire localStorage con API calls
2. Implementare WebSocket per real-time
3. Aggiungere error boundaries e retry logic

## Note Tecniche

- **Cache TTL**: 30 secondi per bilanciare performance e freshness
- **Activity Logs**: Massimo 100 entries in localStorage
- **Real-time updates**: Sottoscrizione a tutti gli store rilevanti
- **Error handling**: Gestione errori con fallback UI
- **Performance**: Caricamento parallelo con Promise.all()

## Testing

```typescript
// Test del service
describe('DashboardService', () => {
  it('should aggregate data from multiple stores', async () => {
    const stats = await dashboardService.getDashboardStats();
    expect(stats.fattureDaImportare).toBeGreaterThanOrEqual(0);
    expect(stats.mediciAttivi).toBeGreaterThanOrEqual(0);
  });

  it('should cache results', async () => {
    const stats1 = await dashboardService.getDashboardStats();
    const stats2 = await dashboardService.getDashboardStats();
    expect(stats1).toBe(stats2); // Same reference = cached
  });
});
```