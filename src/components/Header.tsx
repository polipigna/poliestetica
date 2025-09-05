'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { 
  LogOut,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { useUser, DEMO_USERS } from '@/contexts/UserContext';

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
  onSync?: () => void;
  lastSync?: string;
  currentMonth?: string;
  isMonthClosed?: boolean;
  showSync?: boolean;
}

export default function Header({ 
  onSync,
  lastSync = '10 minuti fa',
  currentMonth = 'Dicembre 2024',
  isMonthClosed = false,
  showSync = false
}: HeaderProps) {
  const { user, setUser, isDemoMode } = useUser();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleUserChange = (email: string) => {
    const newUser = DEMO_USERS.find(u => u.email === email);
    if (newUser) {
      setUser(newUser);
    }
  };

  const handleSync = () => {
    setIsSyncing(true);
    onSync?.();
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
              {isDemoMode ? (
                <select
                  value={user.email}
                  onChange={(e) => handleUserChange(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#03A6A6] focus:border-transparent"
                >
                  {DEMO_USERS.map(u => (
                    <option key={u.email} value={u.email}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-sm">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-gray-500 text-xs">{user.role}</div>
                </div>
              )}
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