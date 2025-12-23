import React from 'react';
import { DocumentTextIcon, PhotoIcon } from '@heroicons/react/24/outline';

interface EmptyStateProps {
  onScan: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onScan }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white rounded-3xl border border-slate-200 border-dashed m-4">
      <div className="bg-blue-50 p-6 rounded-full mb-4">
        <PhotoIcon className="h-12 w-12 text-blue-600" />
      </div>
      <h3 className="text-lg font-black text-slate-800 mb-2">Empieza tu contabilidad</h3>
      <p className="text-slate-500 text-sm max-w-xs mb-6">
        Puedes seleccionar **varias fotos a la vez** si el registro del día ocupa más de una página.
      </p>
      <button 
        onClick={onScan}
        className="bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-10 rounded-2xl shadow-xl shadow-blue-100 transition-all active:scale-95 uppercase tracking-widest text-xs"
      >
        Escanear Registro(s)
      </button>
    </div>
  );
};