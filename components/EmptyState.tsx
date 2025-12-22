import React from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

interface EmptyStateProps {
  onScan: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onScan }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="bg-slate-200 p-6 rounded-full mb-4">
        <DocumentTextIcon className="h-12 w-12 text-slate-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-2">Empieza tu contabilidad</h3>
      <p className="text-slate-500 max-w-xs mb-6">
        Sube una foto de tu cuaderno o un PDF escaneado para procesar las ventas del día.
      </p>
      <button 
        onClick={onScan}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-xl shadow-md transition-all active:scale-95"
      >
        Escanear Día
      </button>
    </div>
  );
};