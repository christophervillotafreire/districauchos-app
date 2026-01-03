import React, { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { DayEditor } from './components/DayEditor';
import { MonthlySummary } from './components/MonthlySummary';
import { parseNotebookPage, FileData } from './services/geminiService';
import { generateMonthlyReport } from './services/excelService';
import { AppState, INITIAL_FIXED_EXPENSES, DayData, Transaction, TransactionType } from './types';
import { 
  ArrowUpTrayIcon, 
  CalendarIcon, 
  BanknotesIcon, 
  ShoppingBagIcon, 
  ScaleIcon, 
  CameraIcon, 
  ArrowUturnLeftIcon, 
  CreditCardIcon, 
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

const App: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(new Date().getDate());
  const [hasManuallySelected, setHasManuallySelected] = useState<boolean>(false);

  const today = new Date();

  // --- ESTADO CON MIGRACIÓN (PAYROLL Y UTILITIES) ---
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('districauchos_state');
    if (saved) {
      try {
        const parsedState = JSON.parse(saved);
        
        // 1. MIGRACIÓN NÓMINA
        if (typeof parsedState.fixedExpenses?.payroll === 'number') {
          const oldAmount = parsedState.fixedExpenses.payroll;
          parsedState.fixedExpenses.payroll = oldAmount > 0 ? [{
            id: 'legacy_payroll', name: 'Nómina General (Migrado)', paymentQ1: oldAmount, paymentQ2: 0
          }] : [];
        }

        // 2. MIGRACIÓN SERVICIOS (Nuevo)
        if (typeof parsedState.fixedExpenses?.utilities === 'number') {
           const oldUtils = parsedState.fixedExpenses.utilities;
           parsedState.fixedExpenses.utilities = oldUtils > 0 ? [{
             id: 'legacy_utils', name: 'Servicios Generales (Migrado)', amount: oldUtils
           }] : [];
        }

        // Asegurar arrays
        if (!Array.isArray(parsedState.fixedExpenses?.payroll)) parsedState.fixedExpenses.payroll = [];
        if (!Array.isArray(parsedState.fixedExpenses?.utilities)) parsedState.fixedExpenses.utilities = [];

        return parsedState;
      } catch (e) {
        console.error("Error migrando estado", e);
        return { currentMonth: today.getMonth(), currentYear: today.getFullYear(), days: {}, fixedExpenses: INITIAL_FIXED_EXPENSES, defaultInitialCash: 0 };
      }
    }
    return { currentMonth: today.getMonth(), currentYear: today.getFullYear(), days: {}, fixedExpenses: INITIAL_FIXED_EXPENSES, defaultInitialCash: 0 };
  });

  const [editingDay, setEditingDay] = useState<DayData | null>(null);

  const daysInMonth = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
  const monthName = new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(new Date(state.currentYear, state.currentMonth)).toUpperCase();

  useEffect(() => {
    localStorage.setItem('districauchos_state', JSON.stringify(state));
  }, [state]);

  const monthlyStats = (Object.values(state.days) as DayData[]).reduce(
    (acc: { cashSales: number; nequiSales: number; expenses: number; returns: number }, day: DayData) => {
      day.transactions.forEach((t: Transaction) => {
        const amt = Number(t.amount) || 0;
        if (t.type === TransactionType.CASH_SALE) acc.cashSales += amt;
        if (t.type === TransactionType.NEQUI_SALE) acc.nequiSales += amt;
        if (t.type === TransactionType.DAILY_EXPENSE) acc.expenses += amt;
        if (t.type === TransactionType.RETURN) acc.returns += amt;
      });
      return acc;
    },
    { cashSales: 0, nequiSales: 0, expenses: 0, returns: 0 }
  );

  const selectedDayData = state.days[selectedDayNumber] || null;
  const dayStats = selectedDayData?.transactions.reduce((acc, t) => {
    const amt = Number(t.amount) || 0;
    if (t.type === TransactionType.CASH_SALE) acc.cashSales += amt;
    else if (t.type === TransactionType.NEQUI_SALE) acc.nequiSales += amt;
    else if (t.type === TransactionType.RETURN) acc.returns += amt;
    else if (t.type === TransactionType.DAILY_EXPENSE) acc.expenses += amt;
    return acc;
  }, { cashSales: 0, nequiSales: 0, returns: 0, expenses: 0 }) || { cashSales: 0, nequiSales: 0, returns: 0, expenses: 0 };

  const currentDayBase = selectedDayData ? (selectedDayData.initialCash ?? state.defaultInitialCash) : state.defaultInitialCash;
  const dayNetCaja = currentDayBase + dayStats.cashSales - dayStats.returns - dayStats.expenses;
  const dayTotalProfit = (dayStats.cashSales + dayStats.nequiSales) - dayStats.returns - dayStats.expenses;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    setLoadingMessage(files.length > 1 ? `Consolidando ${files.length} páginas...` : 'Analizando con IA...');

    try {
      const filePromises = Array.from(files).map((file: File) => {
        return new Promise<FileData>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({ inlineData: { mimeType: file.type, data: (reader.result as string).split(',')[1] } });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const filesData = await Promise.all(filePromises);
      const result = await parseNotebookPage(filesData);

      const extractedTransactions: Transaction[] = result.items.map((item: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        description: item.description,
        amount: Number(item.amount),
        type: item.type
      }));

      const targetDay = hasManuallySelected ? selectedDayNumber : (result.dayEstimate || selectedDayNumber);
      const newDayData: DayData = { 
        day: targetDay, 
        hasData: true, 
        transactions: extractedTransactions,
        initialCash: state.days[targetDay]?.initialCash ?? state.defaultInitialCash
      };
      setEditingDay(newDayData);
      setSelectedDayNumber(targetDay);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) { alert("Error: " + err.message); } finally { setLoading(false); }
  };

  const saveDayData = (data: DayData) => {
    setState(prev => ({ ...prev, days: { ...prev.days, [data.day]: data } }));
    setEditingDay(null);
    setSelectedDayNumber(data.day);
  };

  const handleExport = () => generateMonthlyReport(state);
  const formatCurrency = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const monthlyCashProfit = monthlyStats.cashSales - monthlyStats.returns - monthlyStats.expenses;
  const monthlyGrossProfit = (monthlyStats.cashSales + monthlyStats.nequiSales) - monthlyStats.returns - monthlyStats.expenses;

  return (
    <div className="min-h-screen pb-44 bg-slate-50">
      <Header onInstall={installPrompt ? () => installPrompt.prompt() : undefined} />
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,application/pdf" multiple className="hidden" />

      {loading && (
        <div className="fixed inset-0 bg-slate-900/95 z-[100] flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <p className="font-black text-2xl mb-2 text-blue-400">DISTRI</p>
          <p className="text-white font-bold uppercase tracking-widest text-xs animate-pulse">{loadingMessage}</p>
        </div>
      )}

      {editingDay && <DayEditor dayData={editingDay} defaultBase={state.defaultInitialCash} onSave={saveDayData} onCancel={() => setEditingDay(null)} />}

      <main className="container mx-auto max-w-lg p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {/* Tarjetas de Resumen (Sin cambios) */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
             <div className="bg-green-50 p-2 rounded-lg"><BanknotesIcon className="h-4 w-4 text-green-600"/></div>
             <div><p className="text-[9px] font-black text-slate-400 uppercase">Ventas Efec.</p><p className="text-xs font-bold text-slate-800 truncate">{formatCurrency(monthlyStats.cashSales)}</p></div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
             <div className="bg-purple-50 p-2 rounded-lg"><CreditCardIcon className="h-4 w-4 text-purple-600"/></div>
             <div><p className="text-[9px] font-black text-slate-400 uppercase">Ventas Nequi</p><p className="text-xs font-bold text-slate-800 truncate">{formatCurrency(monthlyStats.nequiSales)}</p></div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
             <div className="bg-red-50 p-2 rounded-lg"><ShoppingBagIcon className="h-4 w-4 text-red-600"/></div>
             <div><p className="text-[9px] font-black text-slate-400 uppercase">Gastos</p><p className="text-xs font-bold text-slate-800 truncate">{formatCurrency(monthlyStats.expenses)}</p></div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
             <div className="bg-orange-50 p-2 rounded-lg"><ArrowUturnLeftIcon className="h-4 w-4 text-orange-600"/></div>
             <div><p className="text-[9px] font-black text-slate-400 uppercase">Devolu.</p><p className="text-xs font-bold text-slate-800 truncate">{formatCurrency(monthlyStats.returns)}</p></div>
          </div>
          <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg shadow-emerald-100 flex items-center gap-3 text-white">
             <div className="bg-emerald-500/30 p-2 rounded-lg"><CurrencyDollarIcon className="h-4 w-4 text-white"/></div>
             <div><p className="text-[9px] font-black text-emerald-200 uppercase">Ganancia Efec.</p><p className="text-xs font-black truncate">{formatCurrency(monthlyCashProfit)}</p></div>
          </div>
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-100 flex items-center gap-3 text-white">
             <div className="bg-blue-500/30 p-2 rounded-lg"><ScaleIcon className="h-4 w-4 text-white"/></div>
             <div><p className="text-[9px] font-black text-blue-200 uppercase">Ganancia Bruta</p><p className="text-xs font-black truncate">{formatCurrency(monthlyGrossProfit)}</p></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-black text-slate-800 flex items-center gap-2"><CalendarIcon className="h-5 w-5 text-blue-600"/>{monthName} {state.currentYear}</h2>
            <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 text-white p-3 rounded-full shadow-lg active:scale-90 transition-transform flex items-center justify-center"><CameraIcon className="h-6 w-6" /></button>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const hasData = !!state.days[day];
              return (
                <button key={day} onClick={() => { setSelectedDayNumber(day); setHasManuallySelected(true); }} className={`aspect-square rounded-xl flex items-center justify-center text-xs font-bold transition-all border-2 ${selectedDayNumber === day ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-transparent'} ${hasData ? 'bg-blue-600 text-white shadow-sm shadow-blue-200' : 'bg-slate-50 text-slate-400'}`}>{day}</button>
              );
            })}
          </div>
        </div>

        {selectedDayNumber && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-top-4">
             <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
               <div className="flex flex-col"><span className="font-black text-sm uppercase">Resumen Día {selectedDayNumber}</span><span className="text-[10px] text-blue-400 font-bold uppercase">Estado de Caja</span></div>
               <button onClick={() => setEditingDay(selectedDayData || { day: selectedDayNumber, hasData: true, transactions: [], initialCash: state.defaultInitialCash })} className="flex items-center gap-1.5 bg-blue-600 px-4 py-2 rounded-full text-[10px] font-black uppercase">{selectedDayData ? 'Editar' : 'Registrar'}</button>
             </div>
             <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                   <div className="flex flex-col"><p className="text-[10px] text-slate-400 font-bold uppercase">Efec. Ventas</p><p className="text-sm font-bold text-slate-800">{formatCurrency(dayStats.cashSales)}</p></div>
                   <div className="flex flex-col"><p className="text-[10px] text-slate-400 font-bold uppercase">Transferencia</p><p className="text-sm font-bold text-purple-600">{formatCurrency(dayStats.nequiSales)}</p></div>
                </div>
                <div className="flex justify-between items-center bg-green-50/50 p-3 rounded-2xl border border-green-100">
                   <div className="flex flex-col"><span className="text-[10px] text-green-700 font-black uppercase tracking-widest">Saldo Físico</span><span className="text-[9px] text-green-600 font-medium">Dinero real esperado</span></div>
                   <span className="text-lg font-black text-green-700">{formatCurrency(dayNetCaja)}</span>
                </div>
                <div className="flex justify-between items-center bg-blue-50/50 p-3 rounded-2xl border border-blue-100">
                   <div className="flex flex-col"><span className="text-[10px] text-blue-700 font-black uppercase tracking-widest">Utilidad Día</span><span className="text-[9px] text-blue-600 font-medium">Rendimiento total</span></div>
                   <span className="text-lg font-black text-blue-700">{formatCurrency(dayTotalProfit)}</span>
                </div>
             </div>
          </div>
        )}

        <MonthlySummary expenses={state.fixedExpenses} defaultBase={state.defaultInitialCash} onChange={(ex) => setState(p => ({...p, fixedExpenses: ex}))} onBaseChange={(base) => setState(p => ({...p, defaultInitialCash: base}))} dayCount={Object.keys(state.days).length} onReset={() => setState(p => ({...p, days: {}, fixedExpenses: INITIAL_FIXED_EXPENSES, defaultInitialCash: 0}))} />
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] z-40 pb-safe-bottom">
        <div className="container mx-auto max-w-lg">
           <button onClick={handleExport} disabled={Object.keys(state.days).length === 0} className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-white transition-all uppercase text-xs tracking-widest ${Object.keys(state.days).length === 0 ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 active:scale-95 shadow-xl shadow-slate-200'}`}>
             <ArrowUpTrayIcon className="h-5 w-5 stroke-[3]" />
             Exportar Excel Contable
           </button>
        </div>
      </div>
    </div>
  );
};
export default App;
