import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { formatCurrency } from '../utils';

interface RiepilogoData {
  totaleFatture: number;
  totaleImportate: number;
  totali: {
    imponibile: number;
    iva: number;
    lordo: number;
  };
  perMedico: Record<string, {
    count: number;
    imponibile: number;
    iva: number;
    lordo: number;
  }>;
  perSerie: Record<string, {
    count: number;
    imponibile: number;
    iva: number;
    lordo: number;
  }>;
}

interface RiepilogoMensileProps {
  riepilogoMensile: RiepilogoData;
}

const RiepilogoMensile: React.FC<RiepilogoMensileProps> = ({ riepilogoMensile }) => {
  const [filtroRiepilogoMedico, setFiltroRiepilogoMedico] = useState('tutti');
  const [filtroRiepilogoSerie, setFiltroRiepilogoSerie] = useState('tutte');

  return (
    <div className="px-6 py-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Riepilogo Mensile</h3>
        
        {/* Totali Generali */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Totale Fatture</p>
                <p className="text-2xl font-bold text-gray-900">{riepilogoMensile.totaleFatture}</p>
              </div>
              <div className="p-3 bg-gray-200 rounded-full">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Importate</p>
                <p className="text-2xl font-bold text-blue-900">{riepilogoMensile.totaleImportate}</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <Check className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Imponibile</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(riepilogoMensile.totali.imponibile)}</p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">IVA</p>
                <p className="text-2xl font-bold text-yellow-900">{formatCurrency(riepilogoMensile.totali.iva)}</p>
              </div>
              <div className="p-3 bg-yellow-200 rounded-full">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Lordo Totale</p>
                <p className="text-2xl font-bold text-purple-900">{formatCurrency(riepilogoMensile.totali.lordo)}</p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        {/* Filtri Riepilogo */}
        <div className="flex gap-4 mb-4">
          <select
            value={filtroRiepilogoMedico}
            onChange={(e) => setFiltroRiepilogoMedico(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
          >
            <option value="tutti">Tutti i medici</option>
            {Object.keys(riepilogoMensile.perMedico).map(medico => (
              <option key={medico} value={medico}>{medico}</option>
            ))}
          </select>
          
          <select
            value={filtroRiepilogoSerie}
            onChange={(e) => setFiltroRiepilogoSerie(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
          >
            <option value="tutte">Tutte le serie</option>
            {Object.keys(riepilogoMensile.perSerie).map(serie => (
              <option key={serie} value={serie}>Serie {serie}</option>
            ))}
          </select>
        </div>
        
        {/* Riepilogo Dettagliato */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Per Medico */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Riepilogo per Medico</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(riepilogoMensile.perMedico)
                .filter(([medico]) => filtroRiepilogoMedico === 'tutti' || medico === filtroRiepilogoMedico)
                .sort(([, a], [, b]) => b.lordo - a.lordo)
                .map(([medico, dati]) => (
                  <div key={medico} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{medico}</p>
                      <p className="text-sm text-gray-600">{dati.count} fatture</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(dati.lordo)}</p>
                      <p className="text-xs text-gray-500">Netto: {formatCurrency(dati.imponibile)}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
          
          {/* Per Serie */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Riepilogo per Serie</h4>
            <div className="space-y-2">
              {Object.entries(riepilogoMensile.perSerie)
                .filter(([serie]) => filtroRiepilogoSerie === 'tutte' || serie === filtroRiepilogoSerie)
                .map(([serie, dati]) => (
                  <div key={serie} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Serie {serie.toUpperCase()}</p>
                      <p className="text-sm text-gray-600">{dati.count} fatture</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(dati.lordo)}</p>
                      <p className="text-xs text-gray-500">IVA: {formatCurrency(dati.iva)}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiepilogoMensile;