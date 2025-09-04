import React from 'react';
import { 
  X,
  Users,
  FileUp,
  FileSpreadsheet,
  Upload
} from 'lucide-react';
import type { Medico } from '@/data/mock';

interface FiltriToolbarProps {
  filtroMedico: string;
  filtroSerie: string;
  filtroDataDa: string;
  filtroDataA: string;
  filtriAttivi: number;
  vistaRaggruppata: boolean;
  selectedFatture: number[];
  isImporting: boolean;
  medici: Medico[];
  setFiltroMedico: (value: string) => void;
  setFiltroSerie: (value: string) => void;
  setFiltroDataDa: (value: string) => void;
  setFiltroDataA: (value: string) => void;
  resetFiltri: () => void;
  toggleVistaRaggruppata: () => void;
  handleImport: () => void;
  handleExportXLSX: () => void;
  setShowImportDialog: (show: boolean) => void;
}

const FiltriToolbar: React.FC<FiltriToolbarProps> = ({
  filtroMedico,
  filtroSerie,
  filtroDataDa,
  filtroDataA,
  filtriAttivi,
  vistaRaggruppata,
  selectedFatture,
  isImporting,
  medici,
  setFiltroMedico,
  setFiltroSerie,
  setFiltroDataDa,
  setFiltroDataA,
  resetFiltri,
  toggleVistaRaggruppata,
  handleImport,
  handleExportXLSX,
  setShowImportDialog
}) => {
  return (
    <div className="px-6 pb-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col gap-4">
          {/* Prima riga: Filtri principali */}
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={filtroMedico}
              onChange={(e) => setFiltroMedico(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
            >
              <option value="tutti">Tutti i medici</option>
              <option value="non_assegnato">Non assegnato</option>
              {medici.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nome} {m.cognome}
                </option>
              ))}
            </select>
            
            <select
              value={filtroSerie}
              onChange={(e) => setFiltroSerie(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
            >
              <option value="tutte">Tutte le serie</option>
              <option value="P">Serie P (Principale)</option>
              <option value="IVA">Serie IVA</option>
              <option value="M">Serie M (Milano)</option>
            </select>
            
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filtroDataDa}
                onChange={(e) => {
                  const newDataDa = e.target.value;
                  setFiltroDataDa(newDataDa);
                  if (filtroDataA && newDataDa > filtroDataA) {
                    setFiltroDataA('');
                  }
                }}
                max={filtroDataA || undefined}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                placeholder="Data da"
              />
              <span className="text-gray-500">-</span>
              <input
                type="date"
                value={filtroDataA}
                onChange={(e) => {
                  const newDataA = e.target.value;
                  setFiltroDataA(newDataA);
                  if (filtroDataDa && newDataA < filtroDataDa) {
                    setFiltroDataDa('');
                  }
                }}
                min={filtroDataDa || undefined}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                placeholder="Data a"
              />
            </div>
            
            {filtriAttivi > 0 && (
              <button
                onClick={resetFiltri}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Reset filtri ({filtriAttivi})
              </button>
            )}
          </div>
          
          {/* Seconda riga: Azioni e vista */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleVistaRaggruppata}
                className={`px-3 py-2 text-sm rounded-lg border flex items-center gap-2 ${
                  vistaRaggruppata 
                    ? 'bg-[#03A6A6] text-white border-[#03A6A6]' 
                    : 'bg-white text-gray-700 border-gray-300'
                } hover:border-[#03A6A6] transition-colors`}
              >
                <Users className="w-4 h-4" />
                Raggruppa per medico
              </button>
            </div>
          
            <div className="flex items-center gap-2">
              {/* Pulsanti Import/Export sempre visibili */}
              <button
                onClick={() => setShowImportDialog(true)}
                className="px-3 py-2 text-sm bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                title="Importa dati da file Excel"
              >
                <FileUp className="w-4 h-4" />
                Import
              </button>
              
              <button
                onClick={handleExportXLSX}
                className="px-3 py-2 text-sm bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                title="Esporta voci fatture filtrate in Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export
              </button>
              
              {/* Separatore */}
              {selectedFatture.length > 0 && (
                <div className="h-6 w-px bg-gray-300 mx-2" />
              )}
              
              {/* Azioni per selezione */}
              {selectedFatture.length > 0 && (
                <>
                  <span className="text-sm text-gray-600 mr-2">
                    {selectedFatture.length} selezionate
                  </span>
                  <button
                    onClick={handleImport}
                    disabled={isImporting}
                    className="px-4 py-2 text-sm bg-[#03A6A6] text-white rounded-lg hover:bg-[#028a8a] disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4 inline mr-2" />
                    {isImporting ? 'Importazione...' : 'Importa selezionate'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FiltriToolbar;