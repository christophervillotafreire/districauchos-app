import React from 'react';
import { MonthlyFixedExpenses } from '../types';
import { TrashIcon, ExclamationTriangleIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

interface MonthlySummaryProps {
  expenses: MonthlyFixedExpenses;
  defaultBase: number;
  onChange: (expenses: MonthlyFixedExpenses) => void;
  onBaseChange: (base: number) => void;
  dayCount: number;
  onReset: () => void;
}

export const MonthlySummary: React.FC<MonthlySummaryProps> = ({ expenses, defaultBase, onChange, onBaseChange, dayCount, onReset }) => {
  
  const updateField = (field: keyof MonthlyFixedExpenses, value: string) => {
    onChange({ ...expenses, [field]: parseFloat(value) || 0 });
  };

  const confirmReset = () => {
    if (window.confirm("¿Borrar TODOS los datos del mes? Esta acción no se puede deshacer.")) {
      onReset();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-blue-600 p-4 text-white">
          <h3 className="font-black flex items-center gap-2">
            <CurrencyDollarIcon className="h-5 w-5" />
            CONFIGURACIÓN DE CAJA
          </h3>
          <p className="text-[10px] opacity-80 font-bold uppercase">Ajustes Generales del Negocio</p>
        </div>
        
        <div className="p-4 space-y-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-tighter">Base de Caja Diaria Predeterminada:</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 font-bold text-slate-400">$</span>
              <input
                type="number"
                value={defaultBase || ''}
                onChange={(e) => onBaseChange(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-blue-600 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 100000"
              />
            </div>
            <p className="text-[9px] text-slate-400 mt-2 italic">* Este valor se usará automáticamente en cada día nuevo.</p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-black text-slate-800 uppercase tracking-tighter">Gastos Fijos Mensuales (Cierre):</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Servicios', key: 'utilities' },
                { label: 'Nómina', key: 'payroll' },
                { label: 'Arriendo', key: 'rent' },
                { label: 'Bancos', key: 'bankLoans' },
                { label: 'Proveedores', key: 'suppliers' },
                { label: 'Otros', key: 'others' },
              ].map((item) => (
                <div key={item.key}>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">{item.label}</label>
                  <div className="relative">
                    <span className="absolute left-2 top-2 text-[10px] text-slate-300">$</span>
                    <input
                      type="number"
                      value={expenses[item.key as keyof MonthlyFixedExpenses] || ''}
                      onChange={(e) => updateField(item.key as keyof MonthlyFixedExpenses, e.target.value)}
                      className="w-full pl-5 pr-2 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold focus:bg-white outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-red-50 rounded-2xl border border-red-100 p-4">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-red-900">Mantenimiento</h4>
            <p className="text-[10px] text-red-700 mb-3 uppercase font-bold">Borrar historial de este mes</p>
            <button onClick={confirmReset} className="flex items-center gap-2 bg-white border border-red-200 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-red-600 hover:text-white transition-all">
              <TrashIcon className="h-4 w-4" />
              REINICIAR TODO EL MES
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};