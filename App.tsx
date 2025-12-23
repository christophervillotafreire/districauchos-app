import React, { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { EmptyState } from './components/EmptyState';
import { DayEditor } from './components/DayEditor';
import { MonthlySummary } from './components/MonthlySummary';
import { parseNotebookPage } from './services/geminiService';
import { generateMonthlyReport } from './services/excelService';
import { AppState, INITIAL_FIXED_EXPENSES, DayData, Transaction, MonthlyFixedExpenses, TransactionType } from './types';
import { ArrowUpTrayIcon, CalendarIcon, BanknotesIcon, ShoppingBagIcon, ScaleIcon, PencilSquareIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';

const App: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(new Date().getDate());
  
  const today = new Date();
  
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('districauchos_state');
    if (saved) return JSON.parse(saved);
    return {
      currentMonth: today.getMonth(),
      currentYear: today.getFullYear(),
      days: {},
      fixedExpenses: INITIAL_FIXED_EXPENSES,
      defaultInitialCash: 0
    };
  });

  const [editingDay, setEditingDay] = useState<DayData | null>(null);

  const daysInMonth = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
  const monthName = new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(new Date(state.currentYear, state.currentMonth)).toUpperCase();

  useEffect(() => {
    localStorage.setItem('districauchos_state', JSON.stringify(state));
  }, [state]);

  // Cálculos Mensuales para el Dashboard
  const monthlyStats = (Object.values(state.days) as DayData[]).reduce(
    (acc: { sales: number; expenses: number; returns: number; totalBase: number }, day: DayData) => {
      acc.totalBase += (day.initialCash ?? state.defaultInitialCash);
      day.transactions.forEach((t: Transaction) => {
        const amt = Number(t.amount) || 0;
        if (t.type === TransactionType.CASH_SALE || t.type === TransactionType.NEQUI_SALE) acc.sales += amt;
        if (t.type === TransactionType.DAILY_EXPENSE) acc.expenses += amt;
        if (t.type === TransactionType.RETURN) acc.returns += amt;
      });
      return acc;
    },
    { sales: 0, expenses: 0, returns: 0, totalBase: 0 }
  );

  // La "Caja" es lo que debería haber físicamente hoy (si seleccionamos un día) o el acumulado esperado
  const selectedDayData = selectedDayNumber ? state.days[selectedDayNumber] : null;
  const dayStats = selectedDayData?.transactions.reduce((acc, t) => {
    const amt = Number(t.amount) || 0;
    if (t.type === TransactionType.CASH_SALE || t.type === TransactionType.NEQUI_SALE) acc.sales += amt;
    else if (t.type === TransactionType.RETURN) acc.returns += amt;
    else if (t.type === TransactionType.DAILY_EXPENSE) acc.expenses += amt;
    return acc;
  }, { sales: 0, returns: 0, expenses: 0 }) || { sales: 0, returns: 0, expenses: 0 };

  const currentDayBase = selectedDayData ? (selectedDayData.initialCash ?? state.defaultInitialCash) : state.defaultInitialCash;
  const dayNetCaja = currentDayBase + dayStats.sales - dayStats.returns - dayStats.expenses;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setLoadingMessage('Analizando con IA...');
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = (reader.result as string).split(',')[1];
          const result = await parseNotebookPage(base64String, file.type);
          const extractedTransactions: Transaction[] = result.items.map((item: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            description: item.description,
            amount: Number(item.amount),
            type: item.type
          }));
          const day = result.dayEstimate || selectedDayNumber || today.getDate();
          const newDayData: DayData = { 
            day, 
            hasData: true, 
            transactions: extractedTransactions,
            initialCash: state.days[day]?.initialCash ?? state.defaultInitialCash
          };
          setEditingDay(newDayData);
        } catch (err: any) { alert("Error: " + err.message); } finally { setLoading(false); }
      };
      reader.readAsDataURL(file);
    } catch (error) { setLoading(false); }
  };

  const saveDayData = (data: DayData) => {
    setState(prev => ({ ...prev, days: { ...prev.days, [data.day]: data } }));
    setEditingDay(null);
    setSelectedDayNumber(data.day);
  };

  const handleExport = () => generateMonthlyReport(state);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="min-h-screen pb-32 bg-slate-50">
      <Header onInstall={installPrompt ? () => installPrompt.prompt() : undefined} />
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />

      {loading && (
        <div className="fixed inset-0 bg-slate-900/90 z-[100] flex flex-col items-center justify-center text-white">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-bold">{loadingMessage}</p>
        </div>
      )}

      {editingDay && (
        <DayEditor 
          dayData={editingDay} 
          defaultBase={state.defaultInitialCash}
          onSave={saveDayData} 
          onCancel={() => setEditingDay(null)} 
        />
      )}

      <main className="container mx-auto max-w-lg p-4 space-y-4">
        
        {/* DASHBOARD MENSUAL - 4 BOXES */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
             <div className="bg-green-50 p-2 rounded-lg"><BanknotesIcon className="h-4 w-4 text-green-600"/></div>
             <div>
               <p className="text-[9px] font-black text-slate-400 uppercase">Ventas</p>
               <p className="text-sm font-bold text-slate-800 truncate">{formatCurrency(monthlyStats.sales)}</p>
             </div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
             <div className="bg-orange-50 p-2 rounded-lg"><ArrowUturnLeftIcon className="h-4 w-4 text-orange-600"/></div>
             <div>
               <p className="text-[9px] font-black text-slate-400 uppercase">Devolu.</p>
               <p className="text-sm font-bold text-slate-800 truncate">{formatCurrency(monthlyStats.returns)}</p>
             </div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
             <div className="bg-red-50 p-2 rounded-lg"><ShoppingBagIcon className="h-4 w-4 text-red-600"/></div>
             <div>
               <p className="text-[9px] font-black text-slate-400 uppercase">Gastos</p>
               <p className="text-sm font-bold text-slate-800 truncate">{formatCurrency(monthlyStats.expenses)}</p>
             </div>
          </div>
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-100 flex items-center gap-3">
             <div className="bg-blue-500/30 p-2 rounded-lg"><ScaleIcon className="h-4 w-4 text-white"/></div>
             <div>
               <p className="text-[9px] font-black text-blue-200 uppercase">Utilidad</p>
               <p className="text-sm font-bold text-white truncate">{formatCurrency(monthlyStats.sales - monthlyStats.returns - monthlyStats.expenses)}</p>
             </div>
          </div>
        </div>

        {/* CALENDARIO */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-black text-slate-800 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-blue-600"/>
              {monthName} {state.currentYear}
            </h2>
            <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 text-white p-2.5 rounded-full shadow-lg active:scale-90 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const hasData = !!state.days[day];
              const isSelected = selectedDayNumber === day;
              const isToday = day === today.getDate() && state.currentMonth === today.getMonth();
              
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDayNumber(day)}
                  className={`
                    aspect-square rounded-xl flex items-center justify-center text-xs font-bold transition-all border-2
                    ${isSelected ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-transparent'}
                    ${hasData ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 text-slate-400'}
                    ${isToday && !hasData ? 'ring-2 ring-blue-300 ring-offset-1' : ''}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* RESUMEN DEL DÍA SELECCIONADO */}
        {selectedDayNumber && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-top-4">
            <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
              <div className="flex flex-col">
                <span className="font-black">DÍA {selectedDayNumber}</span>
                <span className="text-[10px] text-blue-400 font-bold uppercase">Resumen de Caja</span>
              </div>
              <button 
                onClick={() => setEditingDay(selectedDayData || { day: selectedDayNumber, hasData: true, transactions: [], initialCash: state.defaultInitialCash })}
                className="flex items-center gap-1.5 bg-blue-600 px-3 py-1.5 rounded-full text-[10px] font-black uppercase"
              >
                <PencilSquareIcon className="h-3 w-3" />
                {selectedDayData ? 'Editar' : 'Registrar'}
              </button>
            </div>
            
            <div className="p-4 grid grid-cols-2 gap-y-4 gap-x-6">
              <div className="flex flex-col">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Base de Caja</p>
                <p className="text-sm font-bold text-slate-600">{formatCurrency(currentDayBase)}</p>
              </div>
              <div className="flex flex-col">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Ventas (+)</p>
                <p className="text-sm font-bold text-green-600">{formatCurrency(dayStats.sales)}</p>
              </div>
              <div className="flex flex-col">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Devoluciones (-)</p>
                <p className="text-sm font-bold text-orange-600">{formatCurrency(dayStats.returns)}</p>
              </div>
              <div className="flex flex-col">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Gastos (-)</p>
                <p className="text-sm font-bold text-red-600">{formatCurrency(dayStats.expenses)}</p>
              </div>
              
              <div className="col-span-2 pt-3 border-t border-slate-100 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest">Efectivo en Caja</span>
                  <span className="text-xs text-slate-400 font-medium">Lo que debe haber físicamente</span>
                </div>
                <span className="text-lg font-black text-blue-700">
                  {formatCurrency(dayNetCaja)}
                </span>
              </div>
            </div>
          </div>
        )}

        <MonthlySummary 
          expenses={state.fixedExpenses} 
          defaultBase={state.defaultInitialCash}
          onChange={(ex) => setState(p => ({...p, fixedExpenses: ex}))} 
          onBaseChange={(base) => setState(p => ({...p, defaultInitialCash: base}))}
          dayCount={Object.keys(state.days).length} 
          onReset={() => setState(p => ({...p, days: {}, fixedExpenses: INITIAL_FIXED_EXPENSES, defaultInitialCash: 0}))} 
        />
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-2xl z-40 pb-safe-bottom">
        <div className="container mx-auto max-w-lg">
           <button onClick={handleExport} disabled={Object.keys(state.days).length === 0} className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-white transition-all uppercase ${Object.keys(state.days).length === 0 ? 'bg-slate-200 text-slate-400' : 'bg-green-600 active:scale-95 shadow-xl shadow-green-100'}`}>
             <ArrowUpTrayIcon className="h-5 w-5 stroke-[3]" />
             Exportar Excel Contable
           </button>
        </div>
      </div>
    </div>
  );
};

export default App;