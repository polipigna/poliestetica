import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { FatturaConVoci } from '../services';
import type { Medico } from '@/data/mock';
import { formatDate, formatCurrency, excelToNumber } from '../utils';

interface FatturaRowProps {
  fattura: FatturaConVoci;
  indented?: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  hasAnomalie: boolean;
  anomalie: string[];
  medici: Medico[];
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onAssegnaMedico: (fatturaId: number, medicoId: number, medicoNome: string) => void;
  renderStatoBadge: (stato: string) => React.ReactNode;
  renderAnomalie: (anomalie: string[], fatturaId?: number) => React.ReactNode;
  renderVociDettagli: (fattura: FatturaConVoci) => React.ReactNode;
}

const FatturaRow: React.FC<FatturaRowProps> = ({
  fattura,
  indented = false,
  isExpanded,
  isSelected,
  hasAnomalie,
  anomalie,
  medici,
  onToggleExpand,
  onToggleSelect,
  onAssegnaMedico,
  renderStatoBadge,
  renderAnomalie,
  renderVociDettagli
}) => {
  const handleMedicoSelection = () => {
    const selectElement = document.getElementById(`medico-select-${fattura.id}`) as HTMLSelectElement;
    const medicoId = Math.round(excelToNumber(selectElement?.value)) || 0;
    if (medicoId) {
      const medico = medici.find(m => m.id === medicoId);
      if (medico && confirm(`Confermi l'assegnazione di ${medico.nome} ${medico.cognome} a questa fattura?`)) {
        onAssegnaMedico(fattura.id, medicoId, `${medico.nome} ${medico.cognome}`);
      }
    } else {
      alert('Seleziona un medico prima di confermare');
    }
  };

  return (
    <React.Fragment>
      <tr className={`hover:bg-gray-50 ${indented ? 'pl-8' : ''}`}>
        <td className="w-12 px-6 py-4 whitespace-nowrap">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            disabled={fattura.stato === 'importata' || hasAnomalie}
            className="rounded border-gray-300 text-[#03A6A6] focus:ring-[#03A6A6] disabled:opacity-50 disabled:cursor-not-allowed"
            title={hasAnomalie ? 'Non selezionabile - correggere anomalie prima dell\'importazione' : ''}
          />
        </td>
        <td className="w-24 px-6 py-4 whitespace-nowrap text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate">{fattura.numero}</span>
            {fattura.serie !== 'principale' && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
                {fattura.serie}
              </span>
            )}
          </div>
        </td>
        <td className="w-28 px-6 py-4 whitespace-nowrap text-sm text-gray-600">
          {fattura.data || (fattura.dataEmissione ? formatDate(new Date(fattura.dataEmissione)) : '')}
        </td>
        <td className="w-40 px-6 py-4 text-sm text-gray-900">
          <span className="block truncate">{fattura.paziente || fattura.clienteNome || ''}</span>
        </td>
        <td className="w-40 px-6 py-4 text-sm">
          {fattura.medicoNome ? (
            <span className="text-gray-900 block truncate">{fattura.medicoNome}</span>
          ) : (
            <div className="flex items-center gap-2">
              <select
                className="text-xs border border-gray-300 rounded px-2 py-1"
                id={`medico-select-${fattura.id}`}
                defaultValue=""
              >
                <option value="">Seleziona medico...</option>
                {medici.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.nome} {m.cognome}
                  </option>
                ))}
              </select>
              <button
                onClick={handleMedicoSelection}
                className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                ✓
              </button>
            </div>
          )}
        </td>
        <td className="w-28 px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
          {formatCurrency(fattura.imponibile)}
        </td>
        <td className="w-20 px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
          {fattura.serie === 'IVA' ? formatCurrency(fattura.iva || 0) : '-'}
        </td>
        <td className="w-28 px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
          {formatCurrency(fattura.totale)}
        </td>
        <td className="w-32 px-6 py-4 whitespace-nowrap">
          {renderStatoBadge(fattura.stato || 'da_importare')}
        </td>
        <td className="w-48 px-6 py-4">
          {hasAnomalie && renderAnomalie(anomalie, fattura.id)}
        </td>
        <td className="w-16 px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <button
            onClick={onToggleExpand}
            className="text-[#03A6A6] hover:text-[#028a8a]"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </td>
      </tr>
      {isExpanded && renderVociDettagli(fattura)}
    </React.Fragment>
  );
};

export default FatturaRow;