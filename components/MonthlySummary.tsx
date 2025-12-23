import React from 'react';
import { MonthlyFixedExpenses } from '../types';
import { TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface MonthlySummaryProps {
  expenses: MonthlyFixedExpenses;
  onChange: (expenses: MonthlyFixedExpenses) => void;
  dayCount: number;
  onReset: () => void;
}

export const MonthlySummary: React.FC<MonthlySummaryProps> = ({ expenses, onChange, dayCount, onReset }) => {
  
  const updateField = (field: keyof MonthlyFixedExpenses, value: string) => {
    onChange({
      ...expenses,
      [field]: parseFloat(value) || 0
    });
  };

  const confirmReset = () => {
    if (window.confirm("¿Estás seguro de que quieres borrar TODOS los datos de este mes? Esta acción no se puede deshacer y es ideal si terminaste de hacer pruebas.")) {
      onReset();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 p-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-800">Cierre de Mes</h3>
          <p className="text-xs text-slate-500">Se han registrado {dayCount} días este mes</p>
        </div>
        
        <div className="p-4 space-y-4">
          <p className="text-sm font-medium text-slate-700">Gastos Fijos Mensuales:</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Servicios Públicos', key: 'utilities' },
              { label: 'Nómina / Empleados', key: 'payroll' },
              { label: 'Arriendo Local', key: 'rent' },
              { label: 'Cuotas Banco', key: 'bankLoans' },
              { label: 'Proveedores', key: 'suppliers' },
              { label: 'Otros', key: 'others' },
            ].map((item) => (
              <div key={item.key} className="relative">
                <label className="block text-xs text-slate-500 mb-1">{item.label}</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={expenses[item.key as keyof MonthlyFixedExpenses] || ''}
                    onChange={(e) => updateField(item.key as keyof MonthlyFixedExpenses, e.target.value)}
                    className="w-full pl-6 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-red-50 rounded-xl border border-red-100 p-4">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-red-900">Zona de Mantenimiento</h4>
            <p className="text-xs text-red-700 mb-3">Usa este botón si quieres borrar las pruebas y empezar el mes desde cero.</p>
            <button 
              onClick={confirmReset}
              className="flex items-center gap-2 bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-600 hover:text-white transition-all active:scale-95"
            >
              <TrashIcon className="h-4 w-4" />
              BORRAR TODO EL MES
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};