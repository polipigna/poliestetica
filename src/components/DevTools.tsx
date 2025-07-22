'use client';

import { useState } from 'react';
import { Settings, X, Download, RefreshCw, Trash2 } from 'lucide-react';
import { FattureGenerator, FattureGeneratorConfig } from '@/utils/fattureGenerator';

export default function DevTools() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<FattureGeneratorConfig>({
    numeroFatture: 200,
    percentualeAnomalie: 15,
    rangeGiorni: 90,
    scenario: 'normale'
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // Solo in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      FattureGenerator.generate(config);
      FattureGenerator.save();
      window.location.reload();
    } catch (error) {
      console.error('Errore generazione fatture:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    if (confirm('Vuoi cancellare tutte le fatture e rigenerare?')) {
      FattureGenerator.reset();
      FattureGenerator.save();
      window.location.reload();
    }
  };

  const handleExport = () => {
    const json = FattureGenerator.export();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fatture-mock-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
        title="DevTools"
      >
        <Settings className="w-6 h-6" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-600" />
                DevTools - Generatore Fatture
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Numero Fatture */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numero Fatture
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={config.numeroFatture}
                  onChange={(e) => setConfig({
                    ...config,
                    numeroFatture: parseInt(e.target.value) || 1
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Percentuale Anomalie */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Percentuale Anomalie (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.percentualeAnomalie}
                  onChange={(e) => setConfig({
                    ...config,
                    percentualeAnomalie: parseInt(e.target.value) || 0
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Range Giorni */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Range Giorni
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={config.rangeGiorni}
                  onChange={(e) => setConfig({
                    ...config,
                    rangeGiorni: parseInt(e.target.value) || 30
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Scenario */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scenario
                </label>
                <select
                  value={config.scenario}
                  onChange={(e) => setConfig({
                    ...config,
                    scenario: e.target.value as 'normale' | 'test-anomalie' | 'mese-chiuso'
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="normale">Normale</option>
                  <option value="test-anomalie">Test Anomalie</option>
                  <option value="mese-chiuso">Mese Chiuso</option>
                </select>
              </div>

              {/* Info Box */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-700">
                <p className="font-medium mb-1">Scenario attuale:</p>
                <p className="text-xs">
                  {config.scenario === 'normale' && 'Genera fatture con distribuzione normale'}
                  {config.scenario === 'test-anomalie' && 'Forza anomalie per test validazione'}
                  {config.scenario === 'mese-chiuso' && 'Genera fatture già importate'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t bg-gray-50 rounded-b-lg">
              <div className="flex gap-2">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  {isGenerating ? 'Generazione...' : 'Rigenera'}
                </button>
                
                <button
                  onClick={handleReset}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Reset
                </button>
                
                <button
                  onClick={handleExport}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}