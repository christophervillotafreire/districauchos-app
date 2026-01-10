import React, { useState } from 'react';
import { Transaction, TransactionType, DayData } from '../types';
import { TrashIcon, PlusIcon, XMarkIcon, BanknotesIcon, CreditCardIcon, ArrowUturnLeftIcon, ShoppingBagIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

interface DayEditorProps {
  dayData: DayData;
  defaultBase: number;
  onSave: (data: DayData) => void;
  onCancel: () => void;
}

export const DayEditor: React.FC<DayEditorProps> = ({ dayData, defaultBase, onSave, onCancel }) => {
  const [transactions, setTransactions] = useState<Transaction[]>(dayData.transactions || []);
  const [initialCash, setInitialCash] = useState<number>(dayData.initialCash ?? defaultBase);
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

  const cashSales = transactions.filter(t => t.type === TransactionType.CASH_SALE).reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const nequiSales = transactions.filter(t => t.type === TransactionType.NEQUI_SALE).reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const returns = transactions.filter(t => t.type === TransactionType.RETURN).reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const dailyExpenses = transactions.filter(t => t.type === TransactionType.DAILY_EXPENSE).reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  const netCaja = initialCash + cashSales - returns - dailyExpenses; // Solo efectivo físico
  const totalProfit = (cashSales + nequiSales) - returns - dailyExpenses; // Rendimiento total

  return (
    <div className="fixed inset-0 bg-slate-50 z-[60] flex flex-col animate-in fade-in duration-200 overflow-hidden">
      <div className="bg-slate-900 text-white p-4 pt-safe-top flex justify-between items-center shadow-lg">
        <button onClick={onCancel} className="p-2 -ml-2 text-slate-400"><XMarkIcon className="h-6 w-6" /></button>
        <div className="text-center">
          <h2 className="font-bold text-base">Día {dayData.day}</h2>
          <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Editor de Registro</p>
        </div>
        <button onClick={() => onSave({ ...dayData, transactions, initialCash, hasData: true })} className="bg-blue-600 px-4 py-1.5 rounded-lg text-xs font-bold shadow-lg shadow-blue-900/20">GUARDAR</button>
      </div>

      <div className="p-3 bg-white border-b border-slate-200">
        <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100 flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CurrencyDollarIcon className="h-5 w-5 text-blue-600" />
            <span className="text-xs font-bold text-blue-900 uppercase">Base de Caja Inicial</span>
          </div>
          <input 
            type="number" 
            value={initialCash || ''} 
            onChange={(e) => setInitialCash(parseFloat(e.target.value) || 0)}
            className="w-32 p-1.5 bg-white border border-blue-200 rounded-lg text-right font-black text-blue-700 outline-none"
          />
        </div>

       <div className="grid grid-cols-4 gap-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center shadow-sm">
            <BanknotesIcon className="h-6 w-6 text-green-600 mb-1" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Efectivo</span>
            <p className="font-black text-slate-900 text-base lg:text-lg">{formatCurrency(cashSales)}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center shadow-sm">
            <CreditCardIcon className="h-6 w-6 text-purple-600 mb-1" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Transfer</span>
            <p className="font-black text-slate-900 text-base lg:text-lg">{formatCurrency(nequiSales)}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center shadow-sm">
            <ArrowUturnLeftIcon className="h-6 w-6 text-orange-600 mb-1" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Devolu.</span>
            <p className="font-black text-slate-900 text-base lg:text-lg">{formatCurrency(returns)}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center shadow-sm">
            <ShoppingBagIcon className="h-6 w-6 text-red-600 mb-1" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Gastos</span>
            <p className="font-black text-slate-900 text-base lg:text-lg">{formatCurrency(dailyExpenses)}</p>
          </div>
        </div>
      </div>

      <div className="flex bg-white border-b border-slate-200">
        <button onClick={() => setActiveTab('income')} className={`flex-1 py-3 text-xs font-black tracking-widest transition-all ${activeTab === 'income' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/20' : 'text-slate-400'}`}>INGRESOS</button>
        <button onClick={() => setActiveTab('expense')} className={`flex-1 py-3 text-xs font-black tracking-widest transition-all ${activeTab === 'expense' ? 'text-red-600 border-b-2 border-red-600 bg-red-50/20' : 'text-slate-400'}`}>EGRESOS</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32 bg-slate-50/50">
        {transactions
          .filter(t => activeTab === 'income' 
            ? (t.type === TransactionType.CASH_SALE || t.type === TransactionType.NEQUI_SALE)
            : (t.type === TransactionType.DAILY_EXPENSE || t.type === TransactionType.RETURN)
          )
          .map((t) => (
            <div key={t.id} className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 animate-in slide-in-from-bottom-2">
              <div className="grid grid-cols-12 gap-2 mb-2">
                <input 
                  type="text" 
                  value={t.description} 
                  onChange={(e) => updateTransaction(t.id, 'description', e.target.value)} 
                  placeholder="Descripción" 
                  className="col-span-7 lg:col-span-9 w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm lg:text-base outline-none focus:border-blue-300 focus:bg-white transition-colors" 
                />
                <input 
                  type="number" 
                  value={t.amount || ''} 
                  onChange={(e) => updateTransaction(t.id, 'amount', parseFloat(e.target.value) || 0)} 
                  placeholder="0" 
                  className="col-span-5 lg:col-span-3 w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-base lg:text-lg font-bold text-right outline-none focus:border-blue-300 focus:bg-white transition-colors" 
                />
              </div>
              <div className="flex justify-between items-center">
                <select value={t.type} onChange={(e) => updateTransaction(t.id, 'type', e.target.value)} className="text-[10px] font-bold bg-slate-100 p-1.5 rounded-lg border-none text-slate-600 uppercase">
                  {activeTab === 'income' ? (
                    <>
                      <option value={TransactionType.CASH_SALE}>VENTA EFECTIVO</option>
                      <option value={TransactionType.NEQUI_SALE}>VENTA TRANSFERENCIA</option>
                    </>
                  ) : (
                    <>
                      <option value={TransactionType.DAILY_EXPENSE}>GASTO DIARIO</option>
                      <option value={TransactionType.RETURN}>DEVOLUCIÓN</option>
                    </>
                  )}
                </select>
                <button onClick={() => handleDelete(t.id)} className="text-slate-300 hover:text-red-500 p-1"><TrashIcon className="h-5 w-5" /></button>
              </div>
            </div>
        ))}
        <button onClick={handleAdd} className="w-full py-6 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-blue-500 bg-white/50 transition-colors">
          <PlusIcon className="h-6 w-6" />
          <span className="text-[10px] font-bold uppercase">Añadir Registro Manual</span>
        </button>
      </div>

      {/* BLOQUE CORREGIDO: FOOTER CON 3 DATOS */}
      <div className="bg-slate-900 p-5 pb-safe-bottom text-white flex flex-col gap-4 shadow-[0_-5px_20px_rgba(0,0,0,0.2)]">
        
        {/* 1. TOTAL EN CAJA (Verde) */}
        <div className="flex justify-between items-center border-b border-slate-700 pb-3">
          <div className="flex flex-col">
            <span className="text-xs lg:text-sm font-black text-green-400 uppercase tracking-widest">Total en la Caja</span>
            <span className="text-[10px] lg:text-xs text-slate-400 font-medium">(Base + Efectivo - Egresos)</span>
          </div>
          <span className="text-2xl lg:text-3xl font-black text-green-400 tracking-tight">{formatCurrency(netCaja)}</span>
        </div>

        {/* 2. NUEVO: EFECTIVO NETO GENERADO (Índigo/Violeta) */}
        <div className="flex justify-between items-center border-b border-slate-700 pb-3">
          <div className="flex flex-col">
            <span className="text-xs lg:text-sm font-black text-indigo-400 uppercase tracking-widest">Efectivo Neto</span>
            <span className="text-[10px] lg:text-xs text-slate-400 font-medium">(Ventas Efec. - Gastos - Devol.)</span>
          </div>
          <span className="text-xl lg:text-2xl font-bold text-indigo-400 tracking-tight">
            {formatCurrency(stats.cashSales - stats.returns - stats.dailyExpenses)}
          </span>
        </div>

        {/* 3. UTILIDADES DEL DÍA (Azul) */}
        <div className="flex justify-between items-center opacity-90">
          <div className="flex flex-col">
            <span className="text-xs lg:text-sm font-black text-blue-300 uppercase tracking-widest">Utilidades del Día</span>
            <span className="text-[10px] lg:text-xs text-slate-400 font-medium">(Todas las Ventas - Egresos)</span>
          </div>
          <span className="text-xl lg:text-2xl font-bold text-blue-300 tracking-tight">{formatCurrency(totalProfit)}</span>
        </div>

      </div>
    </div>
  );
};
