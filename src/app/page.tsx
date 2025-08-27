'use client';

import { useState, useEffect } from 'react';
import { useFatture } from '@/hooks/useFatture';
import { medici } from '@/data/mock';
import Link from 'next/link';
import { 
  FileSpreadsheet,
  Calculator,
  Users,
  Archive,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export default function HomePage() {
  const { fatture, isLoading, getConteggiStati } = useFatture();
  const [dashboardData, setDashboardData] = useState({
    totaleFatture: 0,
    fattureImportate: 0,
    fattureDaImportare: 0,
    fattureConAnomalie: 0,
    mediciAttivi: 0,
    compensiMese: 0
  });

  useEffect(() => {
    if (!isLoading && fatture) {
      const conteggi = getConteggiStati();
      
      const compensiTotali = fatture
        .filter(f => f.stato === 'importata')
        .reduce((acc, f) => {
          if (f.medicoId && f.imponibile) {
            return acc + (f.imponibile * 0.5);
          }
          return acc;
        }, 0);

      setDashboardData({
        totaleFatture: fatture.length,
        fattureImportate: conteggi.importata,
        fattureDaImportare: conteggi.da_importare,
        fattureConAnomalie: conteggi.anomalia,
        mediciAttivi: medici.length,
        compensiMese: compensiTotali
      });
    }
  }, [fatture, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#03A6A6] mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    {
      id: 'import',
      title: 'Import Fatture',
      description: 'Sincronizza e importa fatture',
      href: '/import',
      icon: <FileSpreadsheet className="w-8 h-8 text-[#03A6A6]" />,
      stats: `${dashboardData.fattureDaImportare} da importare`,
      alert: dashboardData.fattureConAnomalie > 0
    },
    {
      id: 'compensi',
      title: 'Calcola Compensi',
      description: 'Elabora compensi medici',
      href: '/compensi',
      icon: <Calculator className="w-8 h-8 text-[#6192A9]" />,
      stats: `€ ${dashboardData.compensiMese.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`,
    },
    {
      id: 'medici',
      title: 'Gestione Medici',
      description: 'Configura regole e costi',
      href: '/medici',
      icon: <Users className="w-8 h-8 text-[#8C786C]" />,
      stats: `${dashboardData.mediciAttivi} attivi`,
    },
    {
      id: 'archivio',
      title: 'Archivio',
      description: 'Storico e report',
      href: '/archivio',
      icon: <Archive className="w-8 h-8 text-[#D9AC9C]" />,
      stats: `${dashboardData.fattureImportate} fatture`,
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Totale Fatture</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.totaleFatture}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Importate</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.fattureImportate}</p>
            </div>
            <FileSpreadsheet className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Da Importare</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.fattureDaImportare}</p>
            </div>
            <Archive className="w-8 h-8 text-amber-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Con Anomalie</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.fattureConAnomalie}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Menu Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {menuItems.map(item => (
          <Link
            key={item.id}
            href={item.href}
            className="group relative p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            {item.alert && (
              <div className="absolute top-4 right-4">
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              </div>
            )}
            
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gray-50 rounded-lg group-hover:bg-gray-100 transition-colors">
                {item.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                <p className="text-sm font-medium text-[#03A6A6]">{item.stats}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          Benvenuto nel Sistema Compensi
        </h3>
        <p className="text-blue-800 mb-3">
          Gestisci fatture, calcola compensi e monitora le prestazioni mediche.
        </p>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Usa il menu di navigazione in alto per accedere alle diverse sezioni</li>
          <li>• Le card mostrano un riepilogo in tempo reale dei dati</li>
          <li>• Il pallino rosso indica la presenza di elementi che richiedono attenzione</li>
        </ul>
      </div>
    </div>
  );
}