'use client';

import React from 'react';
import Header from './Header';
import NavigationBar from './NavigationBar';
import { useUser } from '@/contexts/UserContext';

interface AppLayoutProps {
  children: React.ReactNode;
  showSync?: boolean;
  currentMonth?: string;
  isMonthClosed?: boolean;
}

export default function AppLayout({ 
  children, 
  showSync = false,
  currentMonth = 'Dicembre 2024',
  isMonthClosed = false
}: AppLayoutProps) {
  const { user } = useUser();

  const handleSync = async () => {
    // Qui potresti aggiungere la logica di sincronizzazione
    console.log('Syncing...');
    // Simulazione API call
    return new Promise(resolve => setTimeout(resolve, 1000));
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col">
      <header className="bg-white shadow-sm">
        <Header 
          onSync={handleSync}
          showSync={showSync}
          currentMonth={currentMonth}
          isMonthClosed={isMonthClosed}
        />
        <NavigationBar userRole={user.role} />
      </header>
      
      <main className="flex-1 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto px-6 py-4 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span>Sistema Compensi v1.0</span>
            <span>•</span>
            <span>© 2024 Poliestetica Pignatelli</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-[#03A6A6] transition-colors">Manuale utente</a>
            <a href="#" className="hover:text-[#03A6A6] transition-colors">Supporto tecnico</a>
          </div>
        </div>
      </footer>
    </div>
  );
}