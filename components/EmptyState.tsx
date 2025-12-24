import React from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';

export const EmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white rounded-3xl border border-slate-200 border-dashed m-4">
      <div className="bg-blue-50 p-6 rounded-full mb-4">
        <PhotoIcon className="h-12 w-12 text-blue-600" />
      </div>
      <h3 className="text-lg font-black text-slate-800 mb-2">Empieza tu contabilidad</h3>
      <p className="text-slate-500 text-sm max-w-xs">
        Usa el botón de la cámara arriba en el calendario para escanear tus hojas.
      </p>
    </div>
  );
};