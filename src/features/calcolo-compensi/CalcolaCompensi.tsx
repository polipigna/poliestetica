import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
  Check,
  Lock,
  Unlock,
  Edit2,
  RotateCcw,
  User,
  Calendar,
  TrendingUp,
  Package,
  RefreshCw,
  Loader2
} from 'lucide-react';
import type { Fattura, Medico, MedicoRegoleCosti } from '@/data/mock';
import { getCostoProdotto, calcolaCompenso, calcolaCostiProdotti } from '@/data/mock';
import { useUser } from '@/contexts/UserContext';

interface CalcolaCompensiProps {
  fatture: Fattura[];
  medici: Medico[];
  regoleCosti: { [key: string]: MedicoRegoleCosti };
  meseSelezionato: string; // formato "YYYY-MM"
  statiChiusura?: { [medicoId: string]: boolean };
  meseChiuso?: boolean;
  onSaveCompenso?: (fatturaId: number, compenso: number) => void;
  onChiudiMedico?: (medicoId: number) => void;
  onChiudiMese?: () => void;
  isLoading?: boolean;
}

export default function CalcolaCompensi({
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
}: CalcolaCompensiProps) {
  // Filtra solo fatture importate o verificate
  const fattureValide = fatture.filter(f => 
    f.stato === 'importata' || f.stato === 'verificata'
  );

  // Se non ci sono fatture valide, mostra messaggio
  if (fattureValide.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-500 mb-4">
            Nessuna fattura importata per il periodo selezionato.
          </p>
          <p className="text-sm text-gray-400">
            Vai su Import Fatture per importare.
          </p>
        </div>
      </div>
    );
  }

  // Stati principali
  const { user, isAdmin } = useUser();
  const userRole = user.role;
  const [activeTab, setActiveTab] = useState('riepilogo');
  const [selectedMedico, setSelectedMedico] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showChiusuraMedico, setShowChiusuraMedico] = useState<number | null>(null);
  const [showChiusuraMese, setShowChiusuraMese] = useState(false);
  const [showModificaCompenso, setShowModificaCompenso] = useState<number | null>(null);
  const [showMappaProdotto, setShowMappaProdotto] = useState<number | null>(null);
  const [checklistMedico, setChecklistMedico] = useState<{[key: number]: any}>({});
  const [fattureAggiornate, setFattureAggiornate] = useState<{[key: number]: any}>({});
  const [isVerificandoFatture, setIsVerificandoFatture] = useState(false);
  const [compensoModificato, setCompensoModificato] = useState('');
  const [errorCompenso, setErrorCompenso] = useState('');
  const [showSuccessMapping, setShowSuccessMapping] = useState(false);
  const [filtroTipoFattura, setFiltroTipoFattura] = useState('generale');
  const itemsPerPage = 50;
  
  // Estrai mese e anno da meseSelezionato
  const [anno, mese] = meseSelezionato.split('-');
  const meseNome = new Date(parseInt(anno), parseInt(mese) - 1).toLocaleString('it-IT', { month: 'long', year: 'numeric' });
  const meseCorrente = { mese: meseNome, stato: meseChiuso ? 'chiuso' : 'aperto' };

  // Stati medici con chiusura
  const [mediciStati, setMediciStati] = useState<{[key: number]: { stato: string; checklistCompleta: boolean; dataChiusura: string | null }}>(
    medici.reduce((acc, m) => ({
      ...acc,
      [m.id]: {
        stato: statiChiusura[m.id] ? 'chiuso' : 'aperto',
        checklistCompleta: statiChiusura[m.id] || false,
        dataChiusura: null
      }
    }), {})
  );

  // Processa le fatture valide e calcola i compensi
  const [vociFatture, setVociFatture] = useState(() => {
    return fattureValide.map(f => {
      const compensoCalcolato = calcolaCompenso(f, regoleCosti);
      const costiProdotti = calcolaCostiProdotti(f, regoleCosti);
      
      return {
        id: f.id,
        medico: f.medicoId,
        numeroFattura: f.numero,
        dataFattura: f.data,
        paziente: f.paziente,
        prestazione: f.prestazione,
        prodotto: f.prodotti?.length > 0 ? f.prodotti[0].nome : null,
        quantita: f.prodotti?.length > 0 ? f.prodotti[0].quantita : 0,
        unita: f.prodotti?.length > 0 ? f.prodotti[0].unitaMisura : '',
        importoLordo: f.importo,
        importoNetto: f.imponibile,
        costoProdotto: costiProdotti,
        compensoCalcolato: compensoCalcolato,
        compensoFinale: compensoCalcolato,
        regolaApplicata: getRegolaApplicataDescrizione(f, regoleCosti),
        modificatoDa: null,
        tipoFattura: f.conRitenutaAcconto ? 'senzaIVA' : 'conIVA'
      };
    });
  });

  // Fatture con anomalie (prodotti non mappati)
  const anomalie = fattureValide.filter(f => 
    f.prodotti?.some(p => !getCostoProdotto(f.medicoId, p.nome, regoleCosti))
  ).map(f => ({
    id: f.id,
    medico: f.medicoId,
    numeroFattura: f.numero,
    dataFattura: f.data,
    paziente: f.paziente,
    prestazione: f.prestazione,
    prodotto: f.prodotti?.find(p => !getCostoProdotto(f.medicoId, p.nome, regoleCosti))?.nome || '',
    quantita: f.prodotti?.find(p => !getCostoProdotto(f.medicoId, p.nome, regoleCosti))?.quantita || 0,
    unita: f.prodotti?.find(p => !getCostoProdotto(f.medicoId, p.nome, regoleCosti))?.unitaMisura || '',
    importoLordo: f.importo,
    tipoFattura: f.conRitenutaAcconto ? 'senzaIVA' : 'conIVA'
  }));
  
  const [anomalieState, setAnomalieState] = useState(anomalie);

  // Helper per ottenere descrizione regola applicata
  function getRegolaApplicataDescrizione(fattura: Fattura, regole: { [key: string]: MedicoRegoleCosti }): string {
    const regoleMedico = regole[fattura.medicoId.toString()];
    if (!regoleMedico) return 'Regole non configurate';
    
    // Cerca eccezioni
    const eccezione = regoleMedico.eccezioni?.find(e => 
      e.prestazione === fattura.prestazione && 
      (!e.prodotto || fattura.prodotti?.some(p => p.nome === e.prodotto))
    );
    
    if (eccezione) {
      return `Eccezione: ${eccezione.tipo === 'percentuale' ? eccezione.valore + '%' : '€' + eccezione.valore} su ${eccezione.calcolaSu || 'netto'}`;
    }
    
    // Regola base
    const regola = regoleMedico.regolaBase;
    if (regola.tipo === 'percentuale') {
      return `${regola.valore}% su ${regola.calcolaSu}`;
    } else if (regola.tipo === 'fisso') {
      return `€${regola.valore} fisso`;
    } else if (regola.tipo === 'scaglioni') {
      return `€${regola.valoreX} ogni €${regola.valoreY} ${regola.calcolaSu}`;
    }
    
    return 'Regola non configurata';
  }

  // Calcola totali con useMemo per ottimizzare performance
  const totaliMedici = useMemo(() => {
    return medici.map(medico => {
      const vociMedico = vociFatture.filter(v => v.medico === medico.id);
      const anomalieMedico = anomalie.filter(a => a.medico === medico.id);
      return {
        ...medico,
        totaleCalcolato: vociMedico.reduce((sum, v) => sum + v.compensoFinale, 0),
        totaleLordo: vociMedico.reduce((sum, v) => sum + v.importoLordo, 0),
        numeroVoci: vociMedico.length,
        numeroAnomalie: anomalieMedico.length
      };
    });
  }, [medici, vociFatture, anomalie]);

  const handleChiusuraMedico = (medicoId) => {
    const fattureAggiornateMedico = fattureAggiornate[medicoId];
    const anomalieMedico = anomalie.filter(a => a.medico === medicoId);
    const hasAnomalie = anomalieMedico.length > 0;
    
    if (fattureAggiornateMedico?.checked && !fattureAggiornateMedico?.hasUpdates && !hasAnomalie && checklistMedico[medicoId]?.calcoli) {
      const dataChiusura = new Date().toLocaleString('it-IT');
      
      setMedici(prevMedici => prevMedici.map(m => 
        m.id === medicoId 
          ? { 
              ...m, 
              stato: 'chiuso', 
              checklistCompleta: true,
              dataChiusura: dataChiusura
            }
          : m
      ));
      
      // Aggiorna anche selectedMedico se è quello chiuso
      if (selectedMedico && selectedMedico.id === medicoId) {
        setSelectedMedico(prev => ({
          ...prev,
          stato: 'chiuso',
          checklistCompleta: true,
          dataChiusura: dataChiusura
        }));
      }
      
      setShowChiusuraMedico(null);
      setChecklistMedico({});
      setFattureAggiornate({});
      setIsVerificandoFatture(false);
    }
  };

  const handleRiaperturaMedico = (medicoId) => {
    setMedici(prevMedici => prevMedici.map(m => 
      m.id === medicoId 
        ? { 
            ...m, 
            stato: 'aperto', 
            checklistCompleta: false,
            dataChiusura: null
          }
        : m
    ));
    
    // Aggiorna anche selectedMedico se è quello riaperto
    if (selectedMedico && selectedMedico.id === medicoId) {
      setSelectedMedico(prev => ({
        ...prev,
        stato: 'aperto',
        checklistCompleta: false,
        dataChiusura: null
      }));
    }
  };

  const handleChiusuraMese = () => {
    setMeseCorrente({ ...meseCorrente, stato: 'chiuso' });
    setShowChiusuraMese(false);
    alert('Chiusura mese completata! Il mese è ora bloccato per modifiche.');
  };

  const handleRiaperturaMese = () => {
    // Solo admin può riaprire il mese
    if (userRole !== 'admin') {
      alert('Solo l\'amministratore può riaprire il mese.');
      return;
    }
    
    setMeseCorrente({ ...meseCorrente, stato: 'aperto' });
    alert('Il mese è stato riaperto con successo.');
  };

  // Funzione per ripristinare compenso originale
  const handleRipristinaCompenso = (voceId) => {
    const voce = vociFatture.find(v => v.id === voceId);
    if (!voce) return;
    
    const medicoVoce = medici.find(m => m.id === voce.medico);
    if (!medicoVoce || medicoVoce.stato === 'chiuso' || meseCorrente.stato === 'chiuso') {
      alert('Non è possibile ripristinare compensi quando il medico o il mese sono chiusi.');
      return;
    }
    
    setVociFatture(vociFatture.map(v => 
      v.id === voceId 
        ? { ...v, compensoFinale: v.compensoCalcolato, modificatoDa: null }
        : v
    ));
  };

  // Funzione per salvare compenso modificato
  const handleSalvaCompenso = () => {
    if (!compensoModificato || !showModificaCompenso) return;
    
    // Verifica che sia possibile modificare
    const medicoVoce = medici.find(m => m.id === showModificaCompenso.medico);
    if (!medicoVoce || medicoVoce.stato === 'chiuso' || meseCorrente.stato === 'chiuso') {
      alert('Non è possibile modificare compensi quando il medico o il mese sono chiusi.');
      return;
    }
    
    const nuovoCompenso = parseFloat(compensoModificato);
    const voce = showModificaCompenso;
    
    // Validazioni
    if (nuovoCompenso < 1) {
      setErrorCompenso('Il compenso deve essere almeno €1');
      return;
    }
    
    if (nuovoCompenso > voce.importoLordo) {
      setErrorCompenso(`Il compenso non può superare l'importo lordo di €${voce.importoLordo}`);
      return;
    }
    
    // Se il valore è uguale all'originale, non segnare come modificato
    if (nuovoCompenso === voce.compensoCalcolato) {
      setVociFatture(vociFatture.map(v => 
        v.id === voce.id 
          ? { ...v, compensoFinale: nuovoCompenso, modificatoDa: null }
          : v
      ));
    } else {
      // Salva il compenso come modificato solo se diverso
      setVociFatture(vociFatture.map(v => 
        v.id === voce.id 
          ? { ...v, compensoFinale: nuovoCompenso, modificatoDa: userRole }
          : v
      ));
    }
    
    setShowModificaCompenso(null);
    setCompensoModificato('');
    setErrorCompenso('');
  };

  // Funzione per mappare prodotto
  const handleMappaProdotto = (anomaliaId, prodottoSelezionato, costo, isNuovoProdotto) => {
    if (!anomaliaId || !prodottoSelezionato || !costo) return;
    
    const anomalia = anomalie.find(a => a.id === anomaliaId);
    if (!anomalia) return;
    
    // Calcola importo netto in base al tipo fattura
    const importoNetto = anomalia.tipoFattura === 'conIVA' 
      ? anomalia.importoLordo / 1.22  // Scorporo IVA 22%
      : anomalia.importoLordo;         // Senza IVA lordo = netto
    
    // Crea nuova voce fattura dalla anomalia risolta
    const nuovaVoce = {
      id: vociFatture.length + 10, // ID temporaneo
      medico: anomalia.medico,
      numeroFattura: anomalia.numeroFattura,
      dataFattura: anomalia.dataFattura,
      paziente: anomalia.paziente,
      prestazione: anomalia.prestazione,
      prodotto: prodottoSelezionato,
      quantita: anomalia.quantita,
      unita: anomalia.unita,
      importoLordo: anomalia.importoLordo,
      importoNetto: importoNetto,
      costoProdotto: costo * anomalia.quantita,
      compensoCalcolato: (importoNetto - (costo * anomalia.quantita)) * 0.5, // Esempio calcolo 50%
      compensoFinale: (importoNetto - (costo * anomalia.quantita)) * 0.5,
      regolaApplicata: '50% su netto - costo',
      modificatoDa: null,
      tipoFattura: anomalia.tipoFattura
    };
    
    // Aggiungi la voce fattura
    setVociFatture([...vociFatture, nuovaVoce]);
    
    // Rimuovi dalle anomalie
    setAnomalie(anomalie.filter(a => a.id !== anomaliaId));
    
    // Se è un nuovo prodotto, aggiungi alla lista prodotti disponibili
    if (isNuovoProdotto) {
      const unitaMisura = anomalia.unita || 'fiala';
      prodottiDisponibili.push({
        nome: prodottoSelezionato,
        prezzoDefault: costo,
        unitaMisura: unitaMisura
      });
    }
    
    // Mostra messaggio successo
    setShowSuccessMapping(true);
    setTimeout(() => setShowSuccessMapping(false), 5000);
    
    setShowMappaProdotto(null);
  };

  // Vista Riepilogo con tabella compensi
  const renderRiepilogo = () => {
    const totaleGenerale = totaliMedici.reduce((sum, m) => sum + m.totaleCalcolato, 0);
    const totaleLordoGenerale = totaliMedici.reduce((sum, m) => sum + m.totaleLordo, 0);
    const medichiChiusi = medici.filter(m => m.stato === 'chiuso').length;
    const tuttiChiusi = medichiChiusi === medici.length;
    
    const vociPaginate = vociFatture.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
    const totalPages = Math.ceil(vociFatture.length / itemsPerPage);

    return (
      <div className="space-y-6">
        {/* Header Riepilogo */}
        <div className="bg-gradient-to-r from-blue-50 to-white rounded-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Riepilogo {meseCorrente.mese}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Stato: <span className={`font-semibold ${meseCorrente.stato === 'aperto' ? 'text-green-600' : 'text-red-600'}`}>
                  {meseCorrente.stato === 'aperto' ? 'APERTO' : 'CHIUSO'}
                </span>
                {meseCorrente.stato === 'chiuso' && userRole === 'admin' && (
                  <button
                    onClick={handleRiaperturaMese}
                    className="ml-3 text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    Riapri mese
                  </button>
                )}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {tuttiChiusi && meseCorrente.stato === 'aperto' && (
                <button
                  onClick={() => setShowChiusuraMese(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 font-medium"
                >
                  <Lock className="w-4 h-4" />
                  Chiudi Mese
                </button>
              )}
              
              <div className="flex gap-2">
                <button 
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-medium"
                  disabled={meseCorrente.stato === 'aperto' && userRole !== 'admin'}
                  onClick={() => alert('Download Excel con tutte le colonne')}
                >
                  <FileText className="w-4 h-4" />
                  Excel
                </button>
                <button 
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm font-medium"
                  disabled={meseCorrente.stato === 'aperto' && userRole !== 'admin'}
                  onClick={() => alert('Download PDF con tutte le colonne')}
                >
                  <Download className="w-4 h-4" />
                  PDF
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">€ {totaleGenerale.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Totale Compensi</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-2xl font-bold text-blue-900">€ {totaleLordoGenerale.toFixed(2)}</div>
              <div className="text-sm text-blue-700">Totale Fatturato</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-2xl font-bold text-green-900">
                {totaleLordoGenerale > 0 ? ((totaleGenerale / totaleLordoGenerale) * 100).toFixed(1) : '0.0'}%
              </div>
              <div className="text-sm text-green-700">% Media Compensi</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-2xl font-bold text-purple-900">{medichiChiusi}/{medici.length}</div>
              <div className="text-sm text-purple-700">Medici Chiusi</div>
            </div>
          </div>
        </div>

        {/* Info permessi download */}
        {meseCorrente.stato === 'aperto' && userRole !== 'admin' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              ℹ️ I download saranno disponibili dopo la chiusura del mese
            </p>
          </div>
        )}

        {/* Tabella compensi (spostata qui dal tab dettaglio) */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Dettaglio Compensi Calcolati</h3>
            <p className="text-sm text-gray-600 mt-1">Include fatture con IVA e senza IVA</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Fattura</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Paziente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Medico</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Prestazione</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Prodotto</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Lordo</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Imponibile</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Compenso</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {vociPaginate.map(voce => {
                  const medico = medici.find(m => m.id === voce.medico);
                  return (
                    <tr key={voce.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {voce.numeroFattura}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{voce.dataFattura}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{voce.paziente}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        Dott. {medico?.cognome}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{voce.prestazione}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {voce.prodotto || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        € {voce.importoLordo.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        € {voce.importoNetto.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setShowModificaCompenso(voce);
                              setCompensoModificato(voce.compensoFinale.toString());
                              setErrorCompenso('');
                            }}
                            className={`font-medium hover:underline ${voce.modificatoDa ? 'text-amber-600' : 'text-gray-900'}`}
                          >
                            € {voce.compensoFinale.toFixed(2)}
                          </button>
                          {voce.modificatoDa && medico?.stato === 'aperto' && meseCorrente.stato === 'aperto' && (
                            <button
                              onClick={() => handleRipristinaCompenso(voce.id)}
                              className="text-amber-600 hover:text-amber-700"
                              title={`Modificato da ${voce.modificatoDa}. Clicca per ripristinare`}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                          {voce.modificatoDa && (medico?.stato === 'chiuso' || meseCorrente.stato === 'chiuso') && (
                            <RotateCcw className="w-4 h-4 text-amber-600" title={`Modificato da ${voce.modificatoDa}`} />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {medico?.stato === 'chiuso' ? (
                          <Lock className="w-4 h-4 text-red-600 mx-auto" />
                        ) : (
                          <Unlock className="w-4 h-4 text-green-600 mx-auto" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Paginazione */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostra {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, vociFatture.length)} di {vociFatture.length} voci
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 text-sm">
                  Pagina {currentPage} di {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info Chiusura */}
        {!tuttiChiusi && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              ⚠️ Per chiudere il mese, tutti i medici devono essere chiusi individualmente.
            </p>
          </div>
        )}
      </div>
    );
  };

  // Funzione per renderizzare tabella voci con o senza colonna lordo
  const renderTabellaVoci = (voci, conIVA) => {
    const totalPages = Math.ceil(voci.length / itemsPerPage);
    const vociPaginate = voci.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );

    return (
      <>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Fattura</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Data</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Paziente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Prestazione</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Prodotto</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Q.tà</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">U.M.</th>
                {conIVA && <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Lordo</th>}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Imponibile</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Costo</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Compenso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {vociPaginate.map(voce => (
                <tr key={voce.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {voce.numeroFattura}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{voce.dataFattura}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{voce.paziente}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{voce.prestazione}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {voce.prodotto || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-gray-900">{voce.quantita}</td>
                  <td className="px-4 py-3 text-sm text-center text-gray-600">{voce.unita}</td>
                  {conIVA && (
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      € {voce.importoLordo.toFixed(2)}
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm text-right text-gray-900">
                    € {voce.importoNetto.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-red-600">
                    € {voce.costoProdotto.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setShowModificaCompenso(voce);
                          setCompensoModificato(voce.compensoFinale.toString());
                          setErrorCompenso('');
                        }}
                        className={`font-medium hover:underline ${voce.modificatoDa ? 'text-amber-600' : 'text-green-600'}`}
                      >
                        € {voce.compensoFinale.toFixed(2)}
                      </button>
                      {voce.modificatoDa && selectedMedico.stato === 'aperto' && meseCorrente.stato === 'aperto' ? (
                        <button
                          onClick={() => handleRipristinaCompenso(voce.id)}
                          className="text-amber-600 hover:text-amber-700"
                          title={`Modificato da ${voce.modificatoDa}. Clicca per ripristinare`}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      ) : voce.modificatoDa && (selectedMedico.stato === 'chiuso' || meseCorrente.stato === 'chiuso') ? (
                        <RotateCcw className="w-4 h-4 text-amber-600" title={`Modificato da ${voce.modificatoDa}`} />
                      ) : selectedMedico.stato === 'aperto' && meseCorrente.stato === 'aperto' && (
                        <button
                          onClick={() => {
                            setShowModificaCompenso(voce);
                            setCompensoModificato(voce.compensoFinale.toString());
                            setErrorCompenso('');
                          }}
                          className="text-gray-400 hover:text-gray-600"
                          title="Modifica compenso"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Paginazione */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostra {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, voci.length)} di {voci.length} voci
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-sm">
                Pagina {currentPage} di {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

  // Vista Dettaglio Medico (nuovo tab)
  const renderDettaglioMedici = () => {
    return (
      <div className="space-y-6">
        {/* Lista Medici */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Medici</h3>
            <p className="text-sm text-gray-600 mt-1">Clicca su un medico per vedere il dettaglio</p>
          </div>
          <div className="divide-y divide-gray-200">
            {totaliMedici.map(medico => (
              <div key={medico.id} className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                   onClick={() => setSelectedMedico(medico)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        Dott. {medico.cognome} {medico.nome}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {medico.numeroVoci} voci elaborate
                        {medico.numeroAnomalie > 0 && (
                          <span className="text-amber-600 ml-2">
                            • {medico.numeroAnomalie} anomalie da risolvere
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        € {medico.totaleCalcolato.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        su € {medico.totaleLordo.toFixed(2)} lordo
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {medico.stato === 'chiuso' ? (
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Chiuso
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
                          <Unlock className="w-3 h-3" />
                          Aperto
                        </span>
                      )}
                      
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
                
                {medico.dataChiusura && (
                  <p className="text-xs text-gray-500 mt-2 ml-14">
                    Chiuso il {medico.dataChiusura}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Vista Anomalie
  const renderAnomalie = () => {
    return (
      <div className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-amber-900 mb-2">
            ⚠️ Prodotti Non Mappati
          </h3>
          <p className="text-sm text-amber-800">
            I seguenti prodotti non sono configurati nel sistema. Mappali per procedere con il calcolo.
          </p>
        </div>

        {anomalie.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="divide-y divide-gray-200">
              {anomalie.map(anomalia => {
                const medico = medici.find(m => m.id === anomalia.medico);
                return (
                  <div key={anomalia.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <span className="font-medium text-gray-900">
                            {anomalia.numeroFattura}
                          </span>
                          <span className="text-sm text-gray-600">
                            {anomalia.dataFattura}
                          </span>
                          <span className="text-sm text-gray-600">
                            Dott. {medico?.cognome}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Paziente:</span>
                            <span className="ml-2 text-gray-900">{anomalia.paziente}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Prestazione:</span>
                            <span className="ml-2 text-gray-900">{anomalia.prestazione}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Prodotto:</span>
                            <span className="ml-2 text-red-600 font-medium">{anomalia.prodotto}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Quantità:</span>
                            <span className="ml-2 text-gray-900">{anomalia.quantita} {anomalia.unita}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Importo:</span>
                            <span className="ml-2 text-gray-900">
                              € {anomalia.importoLordo.toFixed(2)}
                              {anomalia.tipoFattura === 'senzaIVA' && <span className="text-xs text-gray-500"> (esente)</span>}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setShowMappaProdotto(anomalia)}
                        className="ml-4 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-medium"
                      >
                        Mappa Prodotto
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
            <Check className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <p className="text-green-800 font-medium">
              Nessuna anomalia da risolvere!
            </p>
            <p className="text-sm text-green-600 mt-1">
              Tutti i prodotti sono correttamente mappati
            </p>
          </div>
        )}
      </div>
    );
  };

  // Vista Dettaglio Medico
  const renderDettaglioMedico = () => {
    if (!selectedMedico) return null;
    
    const vociMedico = vociFatture.filter(v => v.medico === selectedMedico.id);
    const vociConIVA = vociMedico.filter(v => v.tipoFattura === 'conIVA');
    const vociSenzaIVA = vociMedico.filter(v => v.tipoFattura === 'senzaIVA');
    const anomalieMedico = anomalie.filter(a => a.medico === selectedMedico.id);
    
    // Voci filtrate in base alla selezione
    let vociFiltrate;
    if (filtroTipoFattura === 'conIVA') {
      vociFiltrate = vociConIVA;
    } else if (filtroTipoFattura === 'senzaIVA') {
      vociFiltrate = vociSenzaIVA;
    } else {
      vociFiltrate = vociMedico;
    }
    
    // Calcoli per riepilogo GENERALE (sempre fisso)
    const totaleCompensiGenerale = vociMedico.reduce((sum, v) => sum + v.compensoFinale, 0);
    const totaleLordoGenerale = vociMedico.reduce((sum, v) => sum + v.importoLordo, 0);
    const totaleNettoGenerale = vociMedico.reduce((sum, v) => sum + v.importoNetto, 0);
    const totaleCostiGenerale = vociMedico.reduce((sum, v) => sum + v.costoProdotto, 0);
    
    // Calcoli per riepilogo SPECIFICO (in base al filtro)
    const totaleCompensi = vociFiltrate.reduce((sum, v) => sum + v.compensoFinale, 0);
    const totaleLordo = vociFiltrate.reduce((sum, v) => sum + v.importoLordo, 0);
    const totaleNetto = vociFiltrate.reduce((sum, v) => sum + v.importoNetto, 0);
    const totaleCosti = vociFiltrate.reduce((sum, v) => sum + v.costoProdotto, 0);

    return (
      <div className="space-y-6">
        {/* Header con breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedMedico(null);
                setFiltroTipoFattura('generale'); // Reset filtro quando si torna indietro
              }}
              className="text-gray-600 hover:text-gray-800 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Torna alla lista
            </button>
            <span className="text-gray-400">/</span>
            <h2 className="text-xl font-semibold text-gray-800">
              Dott. {selectedMedico.cognome} {selectedMedico.nome}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            {selectedMedico.stato === 'aperto' ? (
              <button
                onClick={() => setShowChiusuraMedico(selectedMedico.id)}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center gap-2 font-medium"
              >
                <Lock className="w-4 h-4" />
                Chiudi Mese Medico
              </button>
            ) : (
              <>
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                  Chiuso il {selectedMedico.dataChiusura}
                </span>
                {/* Riapri disponibile solo se: mese aperto O utente admin */}
                {(meseCorrente.stato === 'aperto' || userRole === 'admin') && (
                  <button
                    onClick={() => handleRiaperturaMedico(selectedMedico.id)}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium flex items-center gap-1"
                  >
                    <Unlock className="w-3 h-3" />
                    Riapri
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Riepilogo GENERALE Medico (sempre fisso, non cambia con filtri) */}
        <div className="bg-gradient-to-r from-blue-50 to-white rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Riepilogo Generale Compensi</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Totale Lordo</p>
              <p className="text-xl font-bold text-gray-900">€ {totaleLordoGenerale.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Totale Netto</p>
              <p className="text-xl font-bold text-blue-900">€ {totaleNettoGenerale.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Costi Prodotti</p>
              <p className="text-xl font-bold text-red-900">€ {totaleCostiGenerale.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Compenso Finale</p>
              <p className="text-xl font-bold text-green-900">€ {totaleCompensiGenerale.toFixed(2)}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-sm text-gray-600">
              Percentuale media: <span className="font-semibold">{totaleLordoGenerale > 0 ? ((totaleCompensiGenerale / totaleLordoGenerale) * 100).toFixed(1) : '0.0'}%</span> | 
              Voci elaborate: <span className="font-semibold">{vociMedico.length}</span> totali
              (<span className="text-blue-600">{vociConIVA.length} con IVA</span>, 
              <span className="text-green-600">{vociSenzaIVA.length} esenti</span>)
              {anomalieMedico.length > 0 && (
                <span className="text-amber-600 font-semibold ml-2">
                  | ⚠️ {anomalieMedico.length} anomalie da risolvere
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Alert Anomalie */}
        {anomalieMedico.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Ci sono {anomalieMedico.length} prodotti non mappati per questo medico
                </p>
                <p className="text-sm text-amber-700">
                  Risolvi le anomalie prima di poter chiudere il mese del medico
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveTab('anomalie');
                setSelectedMedico(null);
                setFiltroTipoFattura('generale');
              }}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-medium"
            >
              Vai alle Anomalie
            </button>
          </div>
        )}

        {/* Info permessi riapertura medico quando mese chiuso */}
        {meseCorrente.stato === 'chiuso' && userRole !== 'admin' && selectedMedico.stato === 'chiuso' && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-sm text-gray-700">
              ℹ️ Il mese è chiuso. Solo l'amministratore può riaprire i medici quando il mese è chiuso.
            </p>
          </div>
        )}

        {/* Tab di selezione tipo fattura */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setFiltroTipoFattura('generale')}
                className={`px-6 py-3 text-sm font-medium ${
                  filtroTipoFattura === 'generale'
                    ? 'text-[#03A6A6] border-b-2 border-[#03A6A6]'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Tutte
              </button>
              <button
                onClick={() => setFiltroTipoFattura('conIVA')}
                className={`px-6 py-3 text-sm font-medium ${
                  filtroTipoFattura === 'conIVA'
                    ? 'text-[#03A6A6] border-b-2 border-[#03A6A6]'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Con IVA ({vociConIVA.length})
              </button>
              <button
                onClick={() => setFiltroTipoFattura('senzaIVA')}
                className={`px-6 py-3 text-sm font-medium ${
                  filtroTipoFattura === 'senzaIVA'
                    ? 'text-[#03A6A6] border-b-2 border-[#03A6A6]'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Senza IVA ({vociSenzaIVA.length})
              </button>
              
              {/* Export per tipologia spostato nei tab */}
              <div className="ml-auto flex items-center gap-2 px-6">
                {(meseCorrente.stato === 'chiuso' || userRole === 'admin') && (
                  <>
                    <button 
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-medium"
                      onClick={() => alert(`Download Excel ${filtroTipoFattura === 'generale' ? 'completo' : filtroTipoFattura === 'conIVA' ? 'Con IVA' : 'Senza IVA'}`)}
                    >
                      <FileText className="w-4 h-4" />
                      Excel
                    </button>
                    <button 
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm font-medium"
                      onClick={() => alert(`Download PDF ${filtroTipoFattura === 'generale' ? 'completo' : filtroTipoFattura === 'conIVA' ? 'Con IVA' : 'Senza IVA'}`)}
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </button>
                  </>
                )}
              </div>
            </nav>
          </div>
        </div>

        {/* Tabella singola in base al tab selezionato */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">
              Dettaglio Voci Fattura
              {filtroTipoFattura === 'conIVA' && ' - Con IVA (22%)'}
              {filtroTipoFattura === 'senzaIVA' && ' - Esenti IVA'}
            </h3>
          </div>
          {renderTabellaVoci(vociFiltrate, filtroTipoFattura !== 'senzaIVA')}
        </div>

        {/* Riepilogo SPECIFICO per tipologia (sotto la tabella) */}
        {filtroTipoFattura !== 'generale' && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Riepilogo {filtroTipoFattura === 'conIVA' ? 'Fatture con IVA' : 'Fatture Esenti IVA'}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Voci</p>
                <p className="font-semibold text-gray-900">{vociFiltrate.length}</p>
              </div>
              <div>
                <p className="text-gray-600">Totale Lordo</p>
                <p className="font-semibold text-gray-900">€ {totaleLordo.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600">Totale Netto</p>
                <p className="font-semibold text-blue-900">€ {totaleNetto.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600">Costi Prodotti</p>
                <p className="font-semibold text-red-900">€ {totaleCosti.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600">Compenso</p>
                <p className="font-semibold text-green-900">€ {totaleCompensi.toFixed(2)}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-300">
              <p className="text-xs text-gray-600">
                % Media su lordo: <span className="font-semibold">{totaleLordo > 0 ? ((totaleCompensi / totaleLordo) * 100).toFixed(1) : '0.0'}%</span>
                {filtroTipoFattura === 'conIVA' && (
                  <span className="ml-3">IVA totale: <span className="font-semibold">€ {(totaleLordo - totaleNetto).toFixed(2)}</span></span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Reset current page quando cambia tab, medico o filtro tipo fattura
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedMedico, filtroTipoFattura]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header principale */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Calcola Compensi</h1>
              <p className="text-gray-600 mt-1">Gestione compensi medici - {meseCorrente.mese}</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Ruolo ora gestito globalmente dall'Header */}
            </div>
          </div>
        </div>

        {/* Messaggio successo mappatura */}
        {showSuccessMapping && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">
                Anomalia risolta con successo!
              </p>
              <p className="text-sm text-green-700 mt-1">
                • La voce fattura è stata aggiunta al riepilogo e al dettaglio del medico
              </p>
              <p className="text-sm text-green-700">
                • Il prodotto è stato configurato nel sistema
              </p>
              <p className="text-sm text-green-700">
                • I costi prodotto sono stati aggiornati in Gestione Medici
              </p>
            </div>
          </div>
        )}

        {/* Content based on selected medico or tabs */}
        {selectedMedico ? (
          renderDettaglioMedico()
        ) : (
          <>
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="border-b border-gray-200">
                <nav className="flex">
                  <button
                    onClick={() => setActiveTab('riepilogo')}
                    className={`px-6 py-3 text-sm font-medium ${
                      activeTab === 'riepilogo'
                        ? 'text-[#03A6A6] border-b-2 border-[#03A6A6]'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Riepilogo
                  </button>
                  <button
                    onClick={() => setActiveTab('dettaglio-medici')}
                    className={`px-6 py-3 text-sm font-medium ${
                      activeTab === 'dettaglio-medici'
                        ? 'text-[#03A6A6] border-b-2 border-[#03A6A6]'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Dettaglio Medici
                  </button>
                  <button
                    onClick={() => setActiveTab('anomalie')}
                    className={`px-6 py-3 text-sm font-medium ${
                      activeTab === 'anomalie'
                        ? 'text-[#03A6A6] border-b-2 border-[#03A6A6]'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Anomalie
                    {anomalie.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-amber-500 text-white rounded-full text-xs">
                        {anomalie.length}
                      </span>
                    )}
                  </button>
                </nav>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'riepilogo' && renderRiepilogo()}
            {activeTab === 'dettaglio-medici' && renderDettaglioMedici()}
            {activeTab === 'anomalie' && renderAnomalie()}
          </>
        )}

        {/* Modal Chiusura Medico */}
        {showChiusuraMedico && (() => {
          const medicoSelezionato = medici.find(m => m.id === showChiusuraMedico);
          const anomalieMedico = anomalie.filter(a => a.medico === showChiusuraMedico);
          const hasAnomalie = anomalieMedico.length > 0;
          const fattureAggiornateMedico = fattureAggiornate[showChiusuraMedico];
          
          // Simula controllo API fatture aggiornate
          const handleVerificaFatture = async () => {
            setIsVerificandoFatture(true);
            
            // Simula delay API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // In produzione: chiamata API reale a Fatture in Cloud
            // GET /c/{company_id}/issued_documents?supplier_id={medicoId}&modified_after={lastImportDate}
            
            // DEMO: Simuliamo che il 30% delle volte ci siano fatture aggiornate
            const hasFattureAggiornate = Math.random() < 0.3;
            const numeroFattureAggiornate = hasFattureAggiornate ? Math.floor(Math.random() * 3) + 1 : 0;
            
            setFattureAggiornate({
              ...fattureAggiornate,
              [showChiusuraMedico]: {
                checked: !hasFattureAggiornate, // Auto-spunta solo se non ci sono aggiornamenti
                hasUpdates: hasFattureAggiornate,
                count: numeroFattureAggiornate,
                fatture: hasFattureAggiornate ? [
                  { numero: 'FT/2024/1234IVA', data: '22/12/2024', modificata: '24/12/2024 10:30' },
                  { numero: 'FT/2024/1235', data: '23/12/2024', modificata: '24/12/2024 14:15' },
                  { numero: 'FT/2024/1236IVA', data: '23/12/2024', modificata: '24/12/2024 16:45' }
                ].slice(0, numeroFattureAggiornate) : []
              }
            });
            
            setIsVerificandoFatture(false);
          };
          
          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full relative">
                <h3 className="text-lg font-semibold mb-4">Chiusura Mese Medico</h3>
                
                {/* Se ci sono fatture aggiornate, mostra avviso */}
                {fattureAggiornateMedico?.hasUpdates ? (
                  <>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-amber-800 font-medium">
                            ⚠️ Trovate {fattureAggiornateMedico.count} fatture aggiornate
                          </p>
                          <p className="text-sm text-amber-700 mt-1">
                            Le seguenti fatture sono state modificate dopo l'ultimo import:
                          </p>
                          <ul className="text-sm text-amber-700 mt-2 space-y-1">
                            {fattureAggiornateMedico.fatture.map((f, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <span className="text-amber-500">•</span>
                                <span>{f.numero} del {f.data}</span>
                                {f.modificata && (
                                  <span className="text-xs text-amber-600">
                                    (modificata il {f.modificata})
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                      <p className="text-sm text-blue-800">
                        💡 Prima di chiudere il medico, è consigliato importare le fatture aggiornate per assicurarsi che i compensi siano calcolati correttamente.
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        Dopo l'import, dovrai tornare qui e ri-verificare le fatture.
                      </p>
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowChiusuraMedico(null);
                          setChecklistMedico({});
                          setFattureAggiornate({});
                          setIsVerificandoFatture(false);
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        Annulla
                      </button>
                      <button
                        onClick={() => {
                          setShowChiusuraMedico(null);
                          setFattureAggiornate({});
                          setIsVerificandoFatture(false);
                          setActiveTab('import-fatture'); // Va a Import Fatture
                          alert('Reindirizzamento a Import Fatture...');
                        }}
                        className="flex-1 px-4 py-2 text-white rounded-lg hover:opacity-90 font-medium shadow-md"
                        style={{ backgroundColor: '#03A6A6', borderColor: '#03A6A6', border: '1px solid' }}
                      >
                        Vai a Import Fatture
                      </button>
                    </div>
                  </>
                ) : (
                  /* Checklist normale se non ci sono fatture aggiornate */
                  <div className="relative">
                    {/* Loading overlay durante verifica */}
                    {isVerificandoFatture && (
                      <div className="absolute inset-0 bg-white bg-opacity-90 rounded-lg flex items-center justify-center z-10">
                        <div className="text-center">
                          <Loader2 className="w-8 h-8 animate-spin text-[#03A6A6] mx-auto mb-3" />
                          <p className="text-sm font-medium text-gray-800">Verifica fatture in corso...</p>
                          <p className="text-xs text-gray-600 mt-1">
                            Controllo modifiche su Fatture in Cloud
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            Potrebbero volerci alcuni secondi
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-3 mb-6">
                      {/* Riga verifica fatture con pulsante */}
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={fattureAggiornateMedico?.checked || false}
                          disabled={true} // Non cliccabile direttamente
                          className="mt-1 rounded border-gray-300 text-[#03A6A6] focus:ring-[#03A6A6] disabled:opacity-70"
                        />
                        <div className="flex-1">
                          <span className="text-sm text-gray-700">
                            Tutte le fatture del medico sono state importate e aggiornate
                            {fattureAggiornateMedico?.checked && !fattureAggiornateMedico?.hasUpdates && (
                              <span className="text-xs text-green-600 block">
                                ✓ Verificato: nessuna fattura da aggiornare
                              </span>
                            )}
                          </span>
                          <button
                            onClick={handleVerificaFatture}
                            disabled={isVerificandoFatture}
                            className={`mt-2 px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors shadow-md ${
                              isVerificandoFatture
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : fattureAggiornateMedico?.checked
                                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-400'
                                : 'text-white hover:opacity-90'
                            }`}
                            style={
                              !isVerificandoFatture && !fattureAggiornateMedico?.checked
                                ? { backgroundColor: '#03A6A6', borderColor: '#03A6A6', border: '1px solid' }
                                : {}
                            }
                          >
                            {isVerificandoFatture ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Verifica in corso...
                              </>
                            ) : fattureAggiornateMedico?.checked ? (
                              <>
                                <RefreshCw className="w-4 h-4" />
                                Ri-verifica
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-4 h-4" />
                                Verifica fatture
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      
                      <label className={`flex items-center gap-3 ${hasAnomalie ? 'opacity-50' : ''}`}>
                        <input
                          type="checkbox"
                          checked={!hasAnomalie}
                          disabled={hasAnomalie}
                          className="rounded border-gray-300 text-[#03A6A6] focus:ring-[#03A6A6]"
                        />
                        <span className="text-sm text-gray-700">
                          Tutte le anomalie sono state risolte
                          {hasAnomalie ? (
                            <span className="text-xs text-red-600 block">
                              ⚠️ Ci sono ancora {anomalieMedico.length} anomalie da risolvere
                            </span>
                          ) : (
                            <span className="text-xs text-green-600 block">
                              ✓ Nessuna anomalia presente
                            </span>
                          )}
                        </span>
                      </label>
                      
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checklistMedico[showChiusuraMedico]?.calcoli || false}
                          onChange={(e) => setChecklistMedico({
                            ...checklistMedico,
                            [showChiusuraMedico]: {
                              ...checklistMedico[showChiusuraMedico],
                              calcoli: e.target.checked
                            }
                          })}
                          className="rounded border-gray-300 text-[#03A6A6] focus:ring-[#03A6A6]"
                        />
                        <span className="text-sm text-gray-700">
                          Tutti i calcoli sono stati verificati
                        </span>
                      </label>
                    </div>
                    
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                      <p className="text-sm text-amber-800">
                        ⚠️ La chiusura è reversibile fino alla chiusura del mese generale
                      </p>
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowChiusuraMedico(null);
                          setChecklistMedico({});
                          setFattureAggiornate({});
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        Annulla
                      </button>
                      <button
                        onClick={() => handleChiusuraMedico(showChiusuraMedico)}
                        disabled={!fattureAggiornateMedico?.checked || 
                                 hasAnomalie || 
                                 !checklistMedico[showChiusuraMedico]?.calcoli}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors shadow-md ${
                          fattureAggiornateMedico?.checked && 
                          !hasAnomalie && 
                          checklistMedico[showChiusuraMedico]?.calcoli
                            ? 'text-white hover:opacity-90'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
                        }`}
                        style={
                          fattureAggiornateMedico?.checked && 
                          !hasAnomalie && 
                          checklistMedico[showChiusuraMedico]?.calcoli
                            ? { backgroundColor: '#f59e0b', borderColor: '#d97706', border: '1px solid' }
                            : {}
                        }
                      >
                        Chiudi Medico
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Modal Chiusura Mese */}
        {showChiusuraMese && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4 text-red-800">⚠️ Chiusura Mese</h3>
              
              <div className="space-y-4 mb-6">
                <p className="text-gray-700">
                  Stai per chiudere definitivamente il mese di <strong>{meseCorrente.mese}</strong>.
                </p>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800 font-medium mb-2">
                    Questa operazione è IRREVERSIBILE e comporta:
                  </p>
                  <ul className="text-sm text-red-700 ml-4 list-disc space-y-1">
                    <li>Blocco di tutte le modifiche ai compensi</li>
                    <li>Impossibilità di importare nuove fatture per questo mese</li>
                    <li>Abilitazione download PDF/Excel per tutti gli utenti</li>
                    <li>Passaggio al mese successivo</li>
                  </ul>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    ✅ Tutti i {medici.length} medici sono stati chiusi correttamente
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowChiusuraMese(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  onClick={handleChiusuraMese}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Conferma Chiusura Mese
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Modifica Compenso */}
        {showModificaCompenso && (() => {
          const medicoVoce = medici.find(m => m.id === showModificaCompenso.medico);
          
          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {(medicoVoce && medicoVoce.stato === 'chiuso') || meseCorrente.stato === 'chiuso' ? 'Dettaglio Calcolo Compenso' : 'Dettaglio e Modifica Compenso'}
                  </h3>
                  <button
                    onClick={() => setShowModificaCompenso(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  {/* Info Fattura */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Fattura:</span>
                        <span className="ml-2 font-medium">{showModificaCompenso.numeroFattura}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Paziente:</span>
                        <span className="ml-2 font-medium">{showModificaCompenso.paziente}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Prestazione:</span>
                        <span className="ml-2 font-medium">{showModificaCompenso.prestazione}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Prodotto:</span>
                        <span className="ml-2 font-medium">{showModificaCompenso.prodotto || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Quantità:</span>
                        <span className="ml-2 font-medium">{showModificaCompenso.quantita} {showModificaCompenso.unita}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Regola applicata:</span>
                        <span className="ml-2 font-medium text-[#03A6A6]">{showModificaCompenso.regolaApplicata}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Calcolo Step by Step */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-800">Calcolo compenso:</h4>
                    <div className="bg-blue-50 rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Importo {showModificaCompenso.tipoFattura === 'conIVA' ? 'lordo' : 'imponibile'} fattura:</span>
                        <span className="font-medium">€ {showModificaCompenso.importoLordo.toFixed(2)}</span>
                      </div>
                      {showModificaCompenso.tipoFattura === 'conIVA' && (
                        <div className="flex justify-between">
                          <span>Importo netto (base calcolo):</span>
                          <span className="font-medium">€ {showModificaCompenso.importoNetto.toFixed(2)}</span>
                        </div>
                      )}
                      {showModificaCompenso.costoProdotto > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>- Costo prodotto:</span>
                          <span className="font-medium">€ {showModificaCompenso.costoProdotto.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-blue-200">
                        <span className="font-medium">Compenso calcolato:</span>
                        <span className="font-bold text-lg">€ {showModificaCompenso.compensoCalcolato.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Modifica Compenso - Solo se medico aperto E mese aperto */}
                  {medicoVoce && medicoVoce.stato === 'aperto' && meseCorrente.stato === 'aperto' && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-800 mb-2">Modifica compenso manuale:</h4>
                      {showModificaCompenso.modificatoDa ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-sm text-amber-800">
                            ✏️ Compenso modificato da <strong>{showModificaCompenso.modificatoDa}</strong>
                          </p>
                          <p className="text-sm text-amber-700 mt-1">
                            Valore originale: € {showModificaCompenso.compensoCalcolato.toFixed(2)} → 
                            Valore attuale: € {showModificaCompenso.compensoFinale.toFixed(2)}
                          </p>
                          <button
                            onClick={() => {
                              handleRipristinaCompenso(showModificaCompenso.id);
                              setShowModificaCompenso(null);
                            }}
                            className="mt-2 text-amber-600 hover:text-amber-700 text-sm font-medium flex items-center gap-1"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Ripristina valore originale
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600">Nuovo compenso:</span>
                            <input
                              type="number"
                              value={compensoModificato}
                              onChange={(e) => {
                                setCompensoModificato(e.target.value);
                                setErrorCompenso('');
                              }}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6]"
                              step="0.01"
                              min="1"
                              max={showModificaCompenso.importoLordo}
                            />
                            <button
                              onClick={handleSalvaCompenso}
                              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-medium"
                            >
                              Salva Modifica
                            </button>
                          </div>
                          {errorCompenso && (
                            <p className="text-sm text-red-600">{errorCompenso}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            Il compenso deve essere compreso tra €1 e €{showModificaCompenso.importoLordo} (importo lordo)
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Info solo lettura quando medico o mese chiuso */}
                  {((medicoVoce && medicoVoce.stato === 'chiuso') || meseCorrente.stato === 'chiuso') && (
                    <div className="border-t pt-4">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <p className="text-sm text-gray-700">
                          ℹ️ {meseCorrente.stato === 'chiuso' ? 'Il mese è chiuso' : 'Il medico è chiuso'}. Il compenso non può essere modificato.
                        </p>
                        {showModificaCompenso.modificatoDa && (
                          <p className="text-sm text-gray-600 mt-1">
                            Ultima modifica effettuata da: <strong>{showModificaCompenso.modificatoDa}</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowModificaCompenso(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Chiudi
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Modal Mappa Prodotto */}
        {showMappaProdotto && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-5 max-w-sm w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-3">Mappa Prodotto</h3>
              
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-sm">
                  <p className="text-amber-800">
                    <strong>{showMappaProdotto.prodotto}</strong>
                  </p>
                  <p className="text-amber-700 text-xs mt-1">
                    {showMappaProdotto.prestazione} • {showMappaProdotto.quantita} {showMappaProdotto.unita}
                  </p>
                </div>
                
                {/* Opzione 1: Prodotto Esistente */}
                <div className="border border-gray-200 rounded-lg p-3">
                  <h4 className="font-medium text-gray-800 mb-2 text-sm flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">OPZIONE 1</span>
                    Prodotto Esistente
                  </h4>
                  
                  <div className="space-y-2">
                    <select 
                      id="prodotto-esistente-select"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] text-sm"
                    >
                      <option value="">Seleziona...</option>
                      {prodottiDisponibili.map(p => (
                        <option key={p.nome} value={p.nome}>
                          {p.nome} (€{p.prezzoDefault}/{p.unitaMisura})
                        </option>
                      ))}
                    </select>
                    
                    <input
                      id="costo-esistente-input"
                      type="number"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] text-sm"
                      placeholder="€ costo/unità"
                      step="0.01"
                      min="0"
                    />
                    
                    <button
                      onClick={() => {
                        const prodotto = document.getElementById('prodotto-esistente-select').value;
                        const costoInput = document.getElementById('costo-esistente-input').value;
                        const prodottoSelezionato = prodottiDisponibili.find(p => p.nome === prodotto);
                        const costo = costoInput ? parseFloat(costoInput) : (prodottoSelezionato?.prezzoDefault || 0);
                        
                        if (prodotto && costo > 0) {
                          handleMappaProdotto(showMappaProdotto.id, prodotto, costo, false);
                        }
                      }}
                      className="w-full px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Usa Esistente
                    </button>
                  </div>
                </div>

                {/* Opzione 2: Nuovo Prodotto */}
                <div className="border border-gray-200 rounded-lg p-3">
                  <h4 className="font-medium text-gray-800 mb-2 text-sm flex items-center gap-2">
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">OPZIONE 2</span>
                    Nuovo Prodotto
                  </h4>
                  
                  <div className="bg-green-50 border border-green-200 rounded p-2 mb-2">
                    <p className="text-xs text-green-800">
                      ℹ️ Verrà aggiunto in Gestione Medici
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <input
                      id="nuovo-prodotto-nome"
                      type="text"
                      defaultValue={showMappaProdotto.prodotto}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] text-sm"
                      placeholder="Nome prodotto"
                    />
                    
                    <input
                      id="nuovo-prodotto-costo"
                      type="number"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03A6A6] text-sm"
                      placeholder="€ costo/unità"
                      step="0.01"
                      min="0"
                    />
                    
                    <button
                      onClick={() => {
                        const nome = document.getElementById('nuovo-prodotto-nome').value;
                        const costo = parseFloat(document.getElementById('nuovo-prodotto-costo').value);
                        
                        if (nome && costo > 0) {
                          handleMappaProdotto(showMappaProdotto.id, nome, costo, true);
                        }
                      }}
                      className="w-full px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                    >
                      Crea Nuovo
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-200">
                <button
                  onClick={() => setShowMappaProdotto(null)}
                  className="w-full px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}