'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { 
  LogOut,
  Calendar,
  RefreshCw
} from 'lucide-react';

// Logo Component
const CompanyLogo = () => {
  return (
    <div className="relative w-[100px] h-[100px]">
      <Image
        src="/images/logo.png"
        alt="Poliestetica Logo"
        width={100}
        height={100}
        className="object-contain"
        priority
      />
    </div>
  );
};

interface User {
  name: string;
  role: 'admin' | 'segretaria' | 'responsabile';
  email: string;
}

interface HeaderProps {
  onUserChange?: (user: User) => void;
  onSync?: () => void;
  lastSync?: string;
  currentMonth?: string;
  isMonthClosed?: boolean;
  showSync?: boolean;
}

export default function Header({ 
  onUserChange,
  onSync,
  lastSync = '10 minuti fa',
  currentMonth = 'Dicembre 2024',
  isMonthClosed = false,
  showSync = false
}: HeaderProps) {
  const [currentUser, setCurrentUser] = useState<User>({ 
    name: 'Maria Rossi', 
    role: 'admin',
    email: 'maria.rossi@poliestetica.com'
  });
  
  const [isSyncing, setIsSyncing] = useState(false);

  const demoUsers: User[] = [
    { name: 'Maria Rossi', role: 'admin', email: 'maria.rossi@poliestetica.com' },
    { name: 'Giulia Bianchi', role: 'segretaria', email: 'giulia.bianchi@poliestetica.com' },
    { name: 'Paolo Verdi', role: 'responsabile', email: 'paolo.verdi@poliestetica.com' }
  ];

  const handleUserChange = (email: string) => {
    const user = demoUsers.find(u => u.email === email);
    if (user) {
      setCurrentUser(user);
      onUserChange?.(user);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    await onSync?.();
    setTimeout(() => {
      setIsSyncing(false);
    }, 2000);
  };

  return (
    <>
      <div className="bg-white px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {/* Logo e Brand */}
          <div className="flex items-center gap-4">
            <CompanyLogo />
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Poliestetica Pignatelli</h1>
              <p className="text-sm text-gray-500">Sistema Gestione Compensi</p>
            </div>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Periodo attivo:</span>
              <span className="font-semibold text-gray-800">{currentMonth}</span>
              {isMonthClosed && (
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                  CHIUSO
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4 pl-6 border-l border-gray-200">
              <select
                value={currentUser.email}
                onChange={(e) => handleUserChange(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
              >
                {demoUsers.map(user => (
                  <option key={user.email} value={user.email}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </select>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <LogOut className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Bar (opzionale) */}
      {showSync && (
        <div className="bg-gradient-to-r from-[#E9EDF2] to-[#F5F7FA] px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600">Ultima sincronizzazione:</span>
            <span className="font-medium text-gray-800">{lastSync}</span>
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">
              {isSyncing ? 'Sincronizzazione...' : 'Sincronizza ora'}
            </span>
          </button>
        </div>
      )}
    </>
  );

  // Export per uso in altri componenti
}

export type { User };