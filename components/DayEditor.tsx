import React, { useState } from 'react';
import { Transaction, TransactionType, DayData } from '../types';
import { TrashIcon, PlusIcon, XMarkIcon, BanknotesIcon, CreditCardIcon, ArrowUturnLeftIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';

interface DayEditorProps {
  dayData: DayData;
  onSave: (data: DayData) => void;
  onCancel: () => void;
}

export const DayEditor: React.FC<DayEditorProps> = ({ dayData, onSave, onCancel }) => {
  const [transactions, setTransactions] = useState<Transaction[]>(dayData.transactions || []);
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('income');

  const handleDelete = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleAdd = () => {
    const newTx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      description: '',
      amount: 0,
      type: activeTab === 'income' ? TransactionType.CASH_SALE : TransactionType.DAILY_EXPENSE
    };
    setTransactions([...transactions, newTx]);
  };

  const updateTransaction = (id: string, field: keyof Transaction, value: any) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP', 
      maximumFractionDigits: 0 
    }).format(val || 0);
  };

  const cashSales = transactions
    .filter(t => t.type === TransactionType.CASH_SALE)
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  const nequiSales = transactions
    .filter(t => t.type === TransactionType.NEQUI_SALE)
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  const returns = transactions
    .filter(t => t.type === TransactionType.RETURN)
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  const dailyExpenses = transactions
    .filter(t => t.type === TransactionType.DAILY_EXPENSE)
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  const netTotal = (cashSales + nequiSales) - (returns + dailyExpenses);

  return (
    <div className="fixed inset-0 bg-slate-50 z-[60] flex flex-col animate-in fade-in duration-200">
      <div className="bg-slate-900 text-white p-4 pt-safe-top flex justify-between items-center shadow-lg">
        <button onClick={onCancel} className="p-2 -ml-2 text-slate-400">
          <XMarkIcon className="h-6 w-6" />
        </button>
        <div className="text-center">
          <h2 className="font-bold text-base">Día {dayData.day}</h2>
          <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Editor de Registro</p>
        </div>
        <button 
          onClick={() => onSave({ ...dayData, transactions, hasData: true })} 
          className="bg-blue-600 px-4 py-1.5 rounded-lg text-xs font-bold"
        >
          GUARDAR
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 bg-white border-b border-slate-200">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <BanknotesIcon className="h-4 w-4 text-green-600" />
            <span className="text-[9px] font-bold text-slate-500 uppercase">Efectivo</span>
          </div>
          <p className="font-bold text-slate-900 text-sm">{formatCurrency(cashSales)}</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <CreditCardIcon className="h-4 w-4 text-purple-600" />
            <span className="text-[9px] font-bold text-slate-500 uppercase">Nequi</span>
          </div>
          <p className="font-bold text-slate-900 text-sm">{formatCurrency(nequiSales)}</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBagIcon className="h-4 w-4 text-orange-600" />
            <span className="text-[9px] font-bold text-slate-500 uppercase">Gastos</span>
          </div>
          <p className="font-bold text-slate-900 text-sm">{formatCurrency(dailyExpenses)}</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUturnLeftIcon className="h-4 w-4 text-red-600" />
            <span className="text-[9px] font-bold text-slate-500 uppercase">Devolu.</span>
          </div>
          <p className="font-bold text-slate-900 text-sm">{formatCurrency(returns)}</p>
        </div>
      </div>

      <div className="flex bg-white border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('income')}
          className={`flex-1 py-3 text-xs font-black tracking-widest transition-all ${activeTab === 'income' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}
        >
          INGRESOS
        </button>
        <button 
          onClick={() => setActiveTab('expense')}
          className={`flex-1 py-3 text-xs font-black tracking-widest transition-all ${activeTab === 'expense' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-400'}`}
        >
          EGRESOS
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {transactions
          .filter(t => activeTab === 'income' 
            ? (t.type === TransactionType.CASH_SALE || t.type === TransactionType.NEQUI_SALE)
            : (t.type === TransactionType.DAILY_EXPENSE || t.type === TransactionType.RETURN)
          )
          .map((t) => (
            <div key={t.id} className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 animate-in slide-in-from-bottom-2">
              <div className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  value={t.description} 
                  onChange={(e) => updateTransaction(t.id, 'description', e.target.value)}
                  placeholder="Ej: Kit de empaques"
                  className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                />
                <input 
                  type="number" 
                  value={t.amount || ''} 
                  onChange={(e) => updateTransaction(t.id, 'amount', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-24 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-right outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-between items-center">
                <select 
                  value={t.type} 
                  onChange={(e) => updateTransaction(t.id, 'type', e.target.value)}
                  className="text-[10px] font-bold bg-slate-100 p-1.5 rounded-lg border-none outline-none text-slate-600"
                >
                  {activeTab === 'income' ? (
                    <>
                      <option value={TransactionType.CASH_SALE}>EFECTIVO</option>
                      <option value={TransactionType.NEQUI_SALE}>NEQUI</option>
                    </>
                  ) : (
                    <>
                      <option value={TransactionType.DAILY_EXPENSE}>GASTO DIARIO</option>
                      <option value={TransactionType.RETURN}>DEVOLUCIÓN</option>
                    </>
                  )}
                </select>
                <button onClick={() => handleDelete(t.id)} className="text-slate-300 hover:text-red-500 p-1">
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
        ))}

        <button 
          onClick={handleAdd}
          className="w-full py-6 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-all bg-white/50"
        >
          <PlusIcon className="h-6 w-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Añadir Registro Manual</span>
        </button>
      </div>

      <div className="bg-slate-900 p-4 pb-safe-bottom text-white flex justify-between items-center">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Neto Hoy</span>
        <span className="text-xl font-black">{formatCurrency(netTotal)}</span>
      </div>
    </div>
  );
};