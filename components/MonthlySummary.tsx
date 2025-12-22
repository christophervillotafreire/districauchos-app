import React from 'react';
import { MonthlyFixedExpenses } from '../types';

interface MonthlySummaryProps {
  expenses: MonthlyFixedExpenses;
  onChange: (expenses: MonthlyFixedExpenses) => void;
  dayCount: number;
}

export const MonthlySummary: React.FC<MonthlySummaryProps> = ({ expenses, onChange, dayCount }) => {
  
  const updateField = (field: keyof MonthlyFixedExpenses, value: string) => {
    onChange({
      ...expenses,
      [field]: parseFloat(value) || 0
    });
  };

  return (
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
  );
};