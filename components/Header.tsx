import React from 'react';
import { ArchiveBoxIcon, ShareIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

interface HeaderProps {
  onInstall?: () => void;
  onLogout?: () => void; // <--- Agrega esta línea
}

export const Header: React.FC<HeaderProps> = ({ onInstall, onLogout }) => {
  
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Districauchos Finanzas',
          text: 'App de contabilidad para Districauchos y Empaques del Sur',
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado al portapapeles');
    }
  };

  return (
    <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-50 border-b border-blue-900/50 pt-safe-top">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <ArchiveBoxIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">DISTRICAUCHOS Y EMPAQUES DEL SUR</h1>
              <p className="text-[10px] text-blue-400 font-medium uppercase tracking-widest">Finanzas Pro</p>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            <button onClick={handleShare} className="text-slate-400 hover:text-white p-2 active:bg-slate-800 rounded-full transition-colors">
                <ShareIcon className="h-5 w-5" />
            </button>

            {onInstall && (
                <button 
                  onClick={onInstall} 
                  className="bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold py-2 px-3 rounded-lg shadow-lg shadow-green-900/20 active:scale-95 transition-all"
                >
                    INSTALAR APP
                </button>
            )}
          
            {onLogout && (
              <button 
                onClick={onLogout}
                className="flex items-center gap-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white px-3 py-2 rounded-lg transition-all border border-red-900/30 group"
                title="Cerrar Sesión"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold uppercase hidden md:inline">Salir</span>
              </button>
            )}
        </div>
      </div>
    </header>
  );
};
