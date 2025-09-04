import React from 'react';
import { 
  UserX,
  AlertCircle,
  Package,
  AlertTriangle,
  X,
  RefreshCw
} from 'lucide-react';
import type { FatturaConVoci } from '../services';

interface StatisticheDashboardProps {
  fatture: FatturaConVoci[];
  fattureFiltered: FatturaConVoci[];
  statiCount: Record<string, number>;
  filtroStato: string;
  filtroAnomalia: string;
  setFiltroStato: (stato: string) => void;
  setFiltroAnomalia: (anomalia: string) => void;
  getAnomalieFattura: (fattura: FatturaConVoci) => string[];
}

const StatisticheDashboard: React.FC<StatisticheDashboardProps> = ({
  fatture,
  fattureFiltered,
  statiCount,
  filtroStato,
  filtroAnomalia,
  setFiltroStato,
  setFiltroAnomalia,
  getAnomalieFattura
}) => {
  const anomalieConfig: Record<string, { label: string; color: string; icon: any }> = {
    'medico_mancante': { label: 'Medico non assegnato', color: 'text-red-600', icon: UserX },
    'prodotto_con_prezzo': { label: 'Prodotto con prezzo', color: 'text-amber-600', icon: AlertCircle },
    'prestazione_incompleta': { label: 'Prestazione senza prodotti', color: 'text-orange-600', icon: Package },
    'prestazione_senza_macchinario': { label: 'Prestazione senza macchinario', color: 'text-yellow-600', icon: AlertTriangle },
    'prodotto_orfano': { label: 'Prodotto senza prestazione', color: 'text-purple-600', icon: AlertTriangle },
    'codice_sconosciuto': { label: 'Codice non valido', color: 'text-red-700', icon: X },
    'prestazione_duplicata': { label: 'Prestazione duplicata', color: 'text-blue-600', icon: RefreshCw },
    'unita_incompatibile': { label: 'Unità incompatibile', color: 'text-indigo-600', icon: AlertTriangle },
    'quantita_anomala': { label: 'Quantità anomala', color: 'text-pink-600', icon: AlertCircle }
  };

  const riepilogoAnomalie: Record<string, number> = {};
  fattureFiltered.forEach(fattura => {
    const anomalie = getAnomalieFattura(fattura);
    anomalie.forEach(anomalia => {
      riepilogoAnomalie[anomalia] = (riepilogoAnomalie[anomalia] || 0) + 1;
    });
  });

  return (
    <div className="px-6 py-6">
      {/* Stati Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={() => setFiltroStato('tutti')}
          className={`p-4 rounded-lg border ${
            filtroStato === 'tutti' ? 'border-[#03A6A6] bg-[#03A6A6]/5' : 'border-gray-200 bg-white'
          } hover:border-[#03A6A6] transition-all`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Tutte le fatture</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              {fatture.length}
            </span>
          </div>
        </button>
        
        {[
          { key: 'da_importare', label: 'Da importare', color: 'bg-gray-100 text-gray-800' },
          { key: 'anomalia', label: 'Con anomalie', color: 'bg-red-100 text-red-800' },
          { key: 'importata', label: 'Importate', color: 'bg-blue-100 text-blue-800' }
        ].map(stato => {
          const count = (statiCount as any)[stato.key] || 0;
          return (
            <button
              key={stato.key}
              onClick={() => setFiltroStato(stato.key)}
              className={`p-4 rounded-lg border ${
                filtroStato === stato.key ? 'border-[#03A6A6] bg-[#03A6A6]/5' : 'border-gray-200 bg-white'
              } hover:border-[#03A6A6] transition-all`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">{stato.label}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${stato.color}`}>
                  {count}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Riepilogo Anomalie */}
      {Object.keys(riepilogoAnomalie).length > 0 && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <h3 className="text-sm font-medium text-red-800 mb-2">Anomalie Rilevate</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(riepilogoAnomalie).map(([anomalia, count]) => {
              const config = anomalieConfig[anomalia];
              if (!config) return null;
              const Icon = config.icon;
              return (
                <button
                  key={anomalia}
                  onClick={() => {
                    if (filtroAnomalia === anomalia) {
                      setFiltroAnomalia('tutte');
                    } else {
                      setFiltroAnomalia(anomalia);
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full transition-colors ${
                    filtroAnomalia === anomalia 
                      ? 'bg-white border-2 border-red-400 shadow-sm' 
                      : 'bg-white hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <span className="text-gray-700">{config.label}</span>
                  <span className="font-bold text-gray-900">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatisticheDashboard;