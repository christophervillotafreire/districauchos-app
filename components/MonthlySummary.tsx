import React, { useState } from 'react';
import { MonthlyFixedExpenses, Employee, ServiceItem, BankItem, SupplierInvoice } from '../types';
import { TrashIcon, CurrencyDollarIcon, UserGroupIcon, PlusIcon, BoltIcon, BuildingLibraryIcon, TruckIcon } from '@heroicons/react/24/outline';

interface MonthlySummaryProps {
  expenses: MonthlyFixedExpenses;
  defaultBase: number;
  onChange: (expenses: MonthlyFixedExpenses) => void;
  onBaseChange: (base: number) => void;
  onReset: () => void;
}

export const MonthlySummary: React.FC<MonthlySummaryProps> = ({ expenses, defaultBase, onChange, onBaseChange, onReset }) => {
  
  // Estado local para formularios pequeños
  const [bankForm, setBankForm] = useState({ date: '', desc: '', amount: '' });
  const [suppForm, setSuppForm] = useState({ date: '', desc: '', amount: '' });

  const confirmReset = () => { if (window.confirm("¿Borrar TODOS los datos?")) onReset(); };

  // --- HELPERS GENÉRICOS ---
  const addToList = (listKey: keyof MonthlyFixedExpenses, item: any) => {
    const list = Array.isArray(expenses[listKey]) ? expenses[listKey] as any[] : [];
    onChange({ ...expenses, [listKey]: [...list, item] });
  };
  const removeFromList = (listKey: keyof MonthlyFixedExpenses, id: string) => {
    if(!confirm('¿Eliminar?')) return;
    const list = Array.isArray(expenses[listKey]) ? expenses[listKey] as any[] : [];
    onChange({ ...expenses, [listKey]: list.filter(i => i.id !== id) });
  };

  // --- BANCOS ---
  const addBank = () => {
    if (!bankForm.amount) return;
    addToList('bankLoans', { id: Date.now().toString(), date: bankForm.date || '??', description: bankForm.desc || 'Cuota', amount: parseFloat(bankForm.amount) });
    setBankForm({ date: '', desc: '', amount: '' });
  };

  // --- PROVEEDORES (FACTURAS) ---
  const addSupplier = () => {
    if (!suppForm.amount) return;
    addToList('suppliers', { id: Date.now().toString(), date: suppForm.date || '??', description: suppForm.desc || 'Factura', amount: parseFloat(suppForm.amount) });
    setSuppForm({ date: '', desc: '', amount: '' });
  };

  // Calculadora de totales
  const totalUtils = (expenses.utilities||[]).reduce((a,b) => a + (Number(b.amount)||0), 0);
  const totalPayroll = (expenses.payroll||[]).reduce((a,b) => a + (Number(b.paymentQ1)||0) + (Number(b.paymentQ2)||0), 0);
  const totalBanks = (expenses.bankLoans||[]).reduce((a,b) => a + (Number(b.amount)||0), 0);
  const totalSuppliers = (expenses.suppliers||[]).reduce((a,b) => a + (Number(b.amount)||0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
          <h3 className="font-black flex items-center gap-2 text-sm uppercase"><CurrencyDollarIcon className="h-4 w-4 text-blue-400" /> Finanzas Mes</h3>
          <div className="bg-slate-700 px-3 py-1 rounded-full border border-slate-600 flex items-center">
             <span className="text-[10px] font-bold text-slate-300 mr-2">Base Caja:</span>
             <input type="number" value={defaultBase||''} onChange={(e) => onBaseChange(parseFloat(e.target.value)||0)} className="w-20 bg-transparent text-right font-black text-white text-xs outline-none" />
          </div>
        </div>
        
        <div className="p-5 space-y-6 max-h-[600px] overflow-y-auto custom-scrollbar">
          
          {/* 1. SERVICIOS (Igual que antes) */}
          {/* ... (código servicios omitido para brevedad, es igual al anterior pero asegurando tipos) ... */}
          {/* (Puedes pegar aquí el bloque de servicios del mensaje anterior) */}

          {/* 2. NÓMINA (Igual que antes) */}
          {/* ... (código nómina omitido para brevedad) ... */}

          {/* 3. BANCOS - NUEVO (Lista de cuotas) */}
          <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100">
            <div className="flex justify-between items-center mb-3">
               <h4 className="text-xs font-black text-red-900 uppercase flex items-center gap-2"><BuildingLibraryIcon className="h-4 w-4"/> Bancos ({totalBanks.toLocaleString()})</h4>
            </div>
            <div className="flex gap-2 mb-3 items-end">
               <input type="text" value={bankForm.date} onChange={e=>setBankForm({...bankForm, date:e.target.value})} placeholder="Día" className="w-12 text-xs p-2 rounded border border-red-200" />
               <input type="text" value={bankForm.desc} onChange={e=>setBankForm({...bankForm, desc:e.target.value})} placeholder="Banco/Desc" className="flex-1 text-xs p-2 rounded border border-red-200" />
               <input type="number" value={bankForm.amount} onChange={e=>setBankForm({...bankForm, amount:e.target.value})} placeholder="$" className="w-20 text-xs p-2 rounded border border-red-200" />
               <button onClick={addBank} className="bg-red-600 text-white p-2 rounded"><PlusIcon className="h-4 w-4"/></button>
            </div>
            <div className="space-y-1">
              {(expenses.bankLoans||[]).map(item => (
                <div key={item.id} className="flex justify-between text-xs bg-white p-2 rounded border border-red-100">
                   <span className="font-bold text-slate-500 w-8">{item.date}</span>
                   <span className="flex-1 text-slate-700">{item.description}</span>
                   <span className="font-black text-slate-800 mx-2">${item.amount.toLocaleString()}</span>
                   <button onClick={() => removeFromList('bankLoans', item.id)} className="text-red-400"><TrashIcon className="h-3 w-3"/></button>
                </div>
              ))}
            </div>
          </div>

          {/* 4. PROVEEDORES (FACTURAS) - NUEVO */}
          <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
            <div className="flex justify-between items-center mb-3">
               <h4 className="text-xs font-black text-orange-900 uppercase flex items-center gap-2"><TruckIcon className="h-4 w-4"/> Facturas Prov. ({totalSuppliers.toLocaleString()})</h4>
            </div>
            <div className="flex gap-2 mb-3 items-end">
               <input type="text" value={suppForm.date} onChange={e=>setSuppForm({...suppForm, date:e.target.value})} placeholder="Día" className="w-12 text-xs p-2 rounded border border-orange-200" />
               <input type="text" value={suppForm.desc} onChange={e=>setSuppForm({...suppForm, desc:e.target.value})} placeholder="Proveedor" className="flex-1 text-xs p-2 rounded border border-orange-200" />
               <input type="number" value={suppForm.amount} onChange={e=>setSuppForm({...suppForm, amount:e.target.value})} placeholder="$" className="w-20 text-xs p-2 rounded border border-orange-200" />
               <button onClick={addSupplier} className="bg-orange-600 text-white p-2 rounded"><PlusIcon className="h-4 w-4"/></button>
            </div>
            <div className="space-y-1">
              {(expenses.suppliers||[]).map(item => (
                <div key={item.id} className="flex justify-between text-xs bg-white p-2 rounded border border-orange-100">
                   <span className="font-bold text-slate-500 w-8">{item.date}</span>
                   <span className="flex-1 text-slate-700">{item.description}</span>
                   <span className="font-black text-slate-800 mx-2">${item.amount.toLocaleString()}</span>
                   <button onClick={() => removeFromList('suppliers', item.id)} className="text-orange-400"><TrashIcon className="h-3 w-3"/></button>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-orange-400 mt-2 italic">* Registre aquí solo facturas grandes. Las compras "de paso" regístrelas en el día correspondiente.</p>
          </div>

          {/* OTROS GASTOS SIMPLES */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
               <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Arriendo</label>
               <input type="number" value={expenses.rent || ''} onChange={(e) => onChange({...expenses, rent: parseFloat(e.target.value)||0})} className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none" />
            </div>
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
               <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Otros</label>
               <input type="number" value={expenses.others || ''} onChange={(e) => onChange({...expenses, others: parseFloat(e.target.value)||0})} className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none" />
            </div>
          </div>

          <div className="pt-2">
             <button onClick={confirmReset} className="w-full py-2 text-[10px] font-black text-red-400 hover:text-red-600 rounded-lg flex items-center justify-center gap-2"><TrashIcon className="h-3 w-3"/> REINICIAR TODO</button>
          </div>
        </div>
      </div>
    </div>
  );
};
