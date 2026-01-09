import React from 'react';
import { MonthlyFixedExpenses, Employee, ServiceItem } from '../types';
import { TrashIcon, CurrencyDollarIcon, UserGroupIcon, PlusIcon, BoltIcon } from '@heroicons/react/24/outline';

interface MonthlySummaryProps {
  expenses: MonthlyFixedExpenses;
  defaultBase: number;
  onChange: (expenses: MonthlyFixedExpenses) => void;
  onBaseChange: (base: number) => void;
  dayCount: number;
  onReset: () => void;
}

export const MonthlySummary: React.FC<MonthlySummaryProps> = ({ expenses, defaultBase, onChange, onBaseChange, onReset }) => {
  
  const updateSimpleField = (field: keyof MonthlyFixedExpenses, value: string) => {
    if (field === 'payroll' || field === 'utilities') return;
    onChange({ ...expenses, [field]: parseFloat(value) || 0 });
  };

  const confirmReset = () => {
    if (window.confirm("¿Borrar TODOS los datos del mes? Esta acción no se puede deshacer.")) onReset();
  };

  // --- LOGICA REPETIDA (Simplificada para el ejemplo) ---
  const addEmployee = () => onChange({ ...expenses, payroll: [...(expenses.payroll||[]), { id: Date.now().toString(), name: '', paymentQ1: 0, paymentQ2: 0 }] });
  const updateEmployee = (id: string, field: keyof Employee, value: any) => onChange({ ...expenses, payroll: (expenses.payroll||[]).map(i => i.id === id ? { ...i, [field]: value } : i) });
  const removeEmployee = (id: string) => { if(confirm('Eliminar?')) onChange({ ...expenses, payroll: (expenses.payroll||[]).filter(i => i.id !== id) }); };
  
  const addService = () => onChange({ ...expenses, utilities: [...(expenses.utilities||[]), { id: Date.now().toString(), name: '', amount: 0 }] });
  const updateService = (id: string, field: keyof ServiceItem, value: any) => onChange({ ...expenses, utilities: (expenses.utilities||[]).map(i => i.id === id ? { ...i, [field]: value } : i) });
  const removeService = (id: string) => { if(confirm('Eliminar?')) onChange({ ...expenses, utilities: (expenses.utilities||[]).filter(i => i.id !== id) }); };

  const totalPayroll = (expenses.payroll||[]).reduce((a,b) => a + (Number(b.paymentQ1)||0) + (Number(b.paymentQ2)||0), 0);
  const totalUtils = (expenses.utilities||[]).reduce((a,b) => a + (Number(b.amount)||0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
          <div>
            <h3 className="font-black flex items-center gap-2 text-sm uppercase"><CurrencyDollarIcon className="h-4 w-4 text-blue-400" /> Cierre de Mes</h3>
          </div>
          <div className="bg-slate-700 px-3 py-1 rounded-full border border-slate-600">
             <span className="text-[10px] font-bold text-slate-300">Base Diaria:</span>
             <input type="number" value={defaultBase||''} onChange={(e) => onBaseChange(parseFloat(e.target.value)||0)} className="w-16 bg-transparent text-right font-black text-white text-xs outline-none ml-2" placeholder="0" />
          </div>
        </div>
        
        <div className="p-5 space-y-6 max-h-[500px] overflow-y-auto custom-scrollbar">
          
          {/* SERVICIOS - Grid de 2 columnas en PC */}
          <div className="bg-cyan-50/50 p-4 rounded-2xl border border-cyan-100">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-black text-cyan-900 uppercase flex items-center gap-2"><BoltIcon className="h-4 w-4" /> Servicios ({totalUtils.toLocaleString()})</h4>
              <button onClick={addService} className="bg-cyan-600 text-white p-1.5 rounded-lg hover:bg-cyan-700"><PlusIcon className="h-3 w-3" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2"> 
              {(expenses.utilities||[]).map((item) => (
                <div key={item.id} className="bg-white p-2 rounded-xl border border-cyan-100 shadow-sm flex items-center gap-2 relative">
                   <div className="flex-1 min-w-0">
                      <input type="text" value={item.name} onChange={(e) => updateService(item.id, 'name', e.target.value)} placeholder="Nombre" className="w-full text-[10px] font-bold border-b border-transparent focus:border-cyan-200 outline-none text-slate-600 mb-0.5" />
                      <input type="number" value={item.amount || ''} onChange={(e) => updateService(item.id, 'amount', parseFloat(e.target.value) || 0)} placeholder="$0" className="w-full text-xs font-black text-cyan-700 outline-none bg-transparent" />
                   </div>
                   <button onClick={() => removeService(item.id)} className="text-red-300 hover:text-red-500"><TrashIcon className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            {(!expenses.utilities?.length) && <p className="text-center text-[10px] text-cyan-400 italic">Sin registros</p>}
          </div>

          {/* NÓMINA - Grid de 1 columna (son tarjetas más grandes) */}
          <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-black text-indigo-900 uppercase flex items-center gap-2"><UserGroupIcon className="h-4 w-4" /> Nómina ({totalPayroll.toLocaleString()})</h4>
              <button onClick={addEmployee} className="bg-indigo-600 text-white p-1.5 rounded-lg hover:bg-indigo-700"><PlusIcon className="h-3 w-3" /></button>
            </div>
            <div className="space-y-2">
              {(expenses.payroll||[]).map((emp) => (
                <div key={emp.id} className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm relative">
                  <button onClick={() => removeEmployee(emp.id)} className="absolute top-2 right-2 text-red-300 hover:text-red-500"><TrashIcon className="h-3 w-3" /></button>
                  <input type="text" value={emp.name} onChange={(e) => updateEmployee(emp.id, 'name', e.target.value)} placeholder="Nombre Empleado" className="w-full text-xs font-bold border-b border-slate-100 pb-1 mb-2 focus:border-indigo-500 outline-none text-slate-800" />
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[8px] font-bold text-slate-400 uppercase">1ra Quincena</label><input type="number" value={emp.paymentQ1 || ''} onChange={(e) => updateEmployee(emp.id, 'paymentQ1', parseFloat(e.target.value) || 0)} className="w-full text-xs font-bold text-slate-600 bg-slate-50 rounded px-2 py-1" /></div>
                    <div><label className="text-[8px] font-bold text-slate-400 uppercase">2da Quincena</label><input type="number" value={emp.paymentQ2 || ''} onChange={(e) => updateEmployee(emp.id, 'paymentQ2', parseFloat(e.target.value) || 0)} className="w-full text-xs font-bold text-slate-600 bg-slate-50 rounded px-2 py-1" /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* OTROS GASTOS - Grid simple */}
          <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Arriendo', key: 'rent' }, { label: 'Bancos', key: 'bankLoans' },
                { label: 'Proveedores', key: 'suppliers' }, { label: 'Otros', key: 'others' },
              ].map((item) => (
                <div key={item.key} className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">{item.label}</label>
                  <input type="number" value={expenses[item.key as keyof MonthlyFixedExpenses] as number || ''} onChange={(e) => updateSimpleField(item.key as keyof MonthlyFixedExpenses, e.target.value)} className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none" placeholder="$0" />
                </div>
              ))}
          </div>

          <div className="pt-2">
             <button onClick={confirmReset} className="w-full py-2 text-[10px] font-black text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-2"><TrashIcon className="h-3 w-3"/> REINICIAR MES</button>
          </div>
        </div>
      </div>
    </div>
  );
};
