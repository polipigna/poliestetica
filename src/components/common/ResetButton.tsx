'use client';

import React, { useState } from 'react';
import { FattureStore } from '@/services/stores/fattureStore';
import { FattureGenerator } from '@/utils/fattureGenerator';

export default function ResetButton() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    
    try {
      // Reset FattureStore
      FattureStore.reset();
      
      // Reset e rigenera FattureGenerator
      FattureGenerator.reset();
      
      // Ricarica la pagina per aggiornare tutti i componenti
      window.location.reload();
    } catch (error) {
      console.error('Errore durante il reset:', error);
      alert('Errore durante il reset. Riprova.');
    } finally {
      setIsResetting(false);
      setShowConfirm(false);
    }
  };

  const buttonBaseClass = "fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-4";
  const buttonColorClass = showConfirm 
    ? "bg-red-600 hover:bg-red-700 focus:ring-red-500/50" 
    : "bg-gray-700 hover:bg-gray-800 focus:ring-gray-500/50";

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setShowConfirm(!showConfirm)}
        className={`${buttonBaseClass} ${buttonColorClass}`}
        title={showConfirm ? "Annulla reset" : "Reset dati test"}
        disabled={isResetting}
      >
        {isResetting ? (
          // Loading spinner
          <svg 
            className="animate-spin h-6 w-6 text-white" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : showConfirm ? (
          // X icon for cancel
          <svg 
            className="h-6 w-6 text-white" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" 
            />
          </svg>
        ) : (
          // Refresh icon
          <svg 
            className="h-6 w-6 text-white" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
        )}
      </button>

      {/* Confirmation Dialog */}
      {showConfirm && !isResetting && (
        <div className="fixed bottom-24 right-6 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-80">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Conferma Reset
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Questa azione resetterà tutti i dati di test inclusi:
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-300 mb-4 space-y-1">
            <li>• Fatture disponibili</li>
            <li>• Fatture importate</li>
            <li>• Medici e regole (in futuro)</li>
            <li>• Periodi contabili (in futuro)</li>
          </ul>
          <p className="text-sm text-red-600 dark:text-red-400 font-semibold mb-4">
            I dati saranno rigenerati automaticamente.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              Reset Tutto
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md text-sm font-medium transition-colors"
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </>
  );
}