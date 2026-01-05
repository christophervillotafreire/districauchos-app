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

  // --- ESTADO ---
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('districauchos_state');
    if (saved) {
      try {
        const parsedState = JSON.parse(saved);
        
        // MIGRACIONES (Payroll y Utilities)
        if (typeof parsedState.fixedExpenses?.payroll === 'number') {
          const oldAmount = parsedState.fixedExpenses.payroll;
          parsedState.fixedExpenses.payroll = oldAmount > 0 ? [{ id: 'legacy_p', name: 'Nómina General', paymentQ1: oldAmount, paymentQ2: 0 }] : [];
        }
        if (typeof parsedState.fixedExpenses?.utilities === 'number') {
           const oldUtils = parsedState.fixedExpenses.utilities;
           parsedState.fixedExpenses.utilities = oldUtils > 0 ? [{ id: 'legacy_u', name: 'Servicios Generales', amount: oldUtils }] : [];
        }
        if (!Array.isArray(parsedState.fixedExpenses?.payroll)) parsedState.fixedExpenses.payroll = [];
        if (!Array.isArray(parsedState.fixedExpenses?.utilities)) parsedState.fixedExpenses.utilities = [];

        return parsedState;
      } catch (e) {
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

  // --- CALCULOS ---
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

  // --- HANDLERS ---
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setLoading(true);
    setLoadingMessage(files.length > 1 ? `Procesando ${files.length} img...` : 'Analizando IA...');
    try {
      const filePromises = Array.from(files).map((file: File) => new Promise<FileData>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve({ inlineData: { mimeType: file.type, data: (reader.result as string).split(',')[1] } });
          reader.onerror = reject;
          reader.readAsDataURL(file);
      }));
      const filesData = await Promise.all(filePromises);
      const result = await parseNotebookPage(filesData);
      const extractedTransactions: Transaction[] = result.items.map((item: any) => ({
        id: Math.random().toString(36).substr(2, 9), description: item.description, amount: Number(item.amount), type: item.type
      }));
      const targetDay = hasManuallySelected ? selectedDayNumber : (result.dayEstimate || selectedDayNumber);
      const newDayData: DayData = { day: targetDay, hasData: true, transactions: extractedTransactions, initialCash: state.days[targetDay]?.initialCash ?? state.defaultInitialCash };
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
    <div className="min-h-screen pb-44 bg-slate-50 font-sans">
      <Header onInstall={installPrompt ? () => installPrompt.prompt() : undefined} />
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,application/pdf" multiple className="hidden" />

      {loading && (
        <div className="fixed inset-0 bg-slate-900/95 z-[100] flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <p className="font-black text-2xl mb-2 text-blue-400">PROCESANDO</p>
          <p className="text-white font-bold uppercase tracking-widest text-xs animate-pulse">{loadingMessage}</p>
        </div>
      )}

      {editingDay && <DayEditor dayData={editingDay} defaultBase={state.defaultInitialCash} onSave={saveDayData} onCancel={() => setEditingDay(null)} />}

      {/* CAMBIO CLAVE: Container más ancho y Grilla Responsiva */}
      <main className="container mx-auto max-w-7xl p-4 lg:p-8 space-y-6">
        
        {/* SECCIÓN 1: Tarjetas Superiores (Grid 2 cols en móvil, 6 en PC) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={<BanknotesIcon className="text-green-600"/>} label="Ventas Efec." value={monthlyStats.cashSales} color="bg-green-50" />
          <StatCard icon={<CreditCardIcon className="text-purple-600"/>} label="Ventas Nequi" value={monthlyStats.nequiSales} color="bg-purple-50" />
          <StatCard icon={<ShoppingBagIcon className="text-red-600"/>} label="Gastos Caja" value={monthlyStats.expenses} color="bg-red-50" />
          <StatCard icon={<ArrowUturnLeftIcon className="text-orange-600"/>} label="Devoluciones" value={monthlyStats.returns} color="bg-orange-50" />
          
          <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg shadow-emerald-100 flex items-center gap-3 text-white col-span-2 md:col-span-1 lg:col-span-1">
             <div className="bg-emerald-500/30 p-2 rounded-lg"><CurrencyDollarIcon className="h-5 w-5 text-white"/></div>
             <div className="min-w-0"><p className="text-[10px] font-black text-emerald-200 uppercase">Ganancia Efec.</p><p className="text-sm font-black truncate">{formatCurrency(monthlyCashProfit)}</p></div>
          </div>
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-100 flex items-center gap-3 text-white col-span-2 md:col-span-1 lg:col-span-1">
             <div className="bg-blue-500/30 p-2 rounded-lg"><ScaleIcon className="h-5 w-5 text-white"/></div>
             <div className="min-w-0"><p className="text-[10px] font-black text-blue-200 uppercase">Ganancia Bruta</p><p className="text-sm font-black truncate">{formatCurrency(monthlyGrossProfit)}</p></div>
          </div>
        </div>

        {/* SECCIÓN 2: Layout Principal (1 col en Móvil, 12 cols en PC) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUMNA IZQUIERDA (Calendario) - Ocupa 7/12 en PC */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 h-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                  <CalendarIcon className="h-7 w-7 text-blue-600"/>
                  {monthName} <span className="text-slate-400">{state.currentYear}</span>
                </h2>
                <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 text-white px-5 py-2.5 rounded-full shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-wide">
                  <CameraIcon className="h-5 w-5" />
                  Escanear
                </button>
              </div>
              
              {/* Calendario Responsive */}
              <div className="grid grid-cols-7 gap-2 lg:gap-3">
                {['D','L','M','M','J','V','S'].map(d => <span key={d} className="text-center text-xs font-bold text-slate-300 mb-2">{d}</span>)}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const hasData = !!state.days[day];
                  const isSelected = selectedDayNumber === day;
                  return (
                    <button
                      key={day}
                      onClick={() => { setSelectedDayNumber(day); setHasManuallySelected(true); }}
                      className={`
                        aspect-square rounded-xl flex items-center justify-center text-sm lg:text-base font-bold transition-all border-2
                        ${isSelected ? 'border-blue-600 bg-blue-50 text-blue-700 scale-105 shadow-md' : 'border-transparent hover:bg-slate-50'}
                        ${hasData ? 'bg-blue-600 text-white shadow-sm shadow-blue-200 hover:bg-blue-700' : 'text-slate-400'}
                      `}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA (Detalles + Config) - Ocupa 5/12 en PC */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Panel Día Seleccionado */}
            {selectedDayNumber && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-right-4 duration-500">
                <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
                  <div>
                    <span className="block font-black text-lg uppercase tracking-tight">Día {selectedDayNumber}</span>
                    <span className="text-xs text-blue-400 font-bold uppercase tracking-widest">Resumen Diario</span>
                  </div>
                  <button 
                    onClick={() => setEditingDay(selectedDayData || { day: selectedDayNumber, hasData: true, transactions: [], initialCash: state.defaultInitialCash })}
                    className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-full text-xs font-black uppercase transition-colors"
                  >
                    {selectedDayData ? 'Editar / Ver' : 'Registrar'}
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                     <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Efec. Ventas</p>
                        <p className="text-lg font-bold text-slate-800">{formatCurrency(dayStats.cashSales)}</p>
                     </div>
                     <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Transferencia</p>
                        <p className="text-lg font-bold text-purple-600">{formatCurrency(dayStats.nequiSales)}</p>
                     </div>
                  </div>

                  <div className="flex justify-between items-center bg-green-50 p-4 rounded-2xl border border-green-100">
                    <div>
                      <span className="block text-[10px] text-green-700 font-black uppercase tracking-widest">Saldo Físico en Caja</span>
                      <span className="text-[10px] text-green-600 font-medium">Debe haber en billetes</span>
                    </div>
                    <span className="text-xl font-black text-green-700">{formatCurrency(dayNetCaja)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <div>
                      <span className="block text-[10px] text-blue-700 font-black uppercase tracking-widest">Utilidad Real del Día</span>
                      <span className="text-[10px] text-blue-600 font-medium">Ganancia neta</span>
                    </div>
                    <span className="text-xl font-black text-blue-700">{formatCurrency(dayTotalProfit)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Panel Configuración (Resumen Mensual) */}
            <MonthlySummary 
              expenses={state.fixedExpenses} 
              defaultBase={state.defaultInitialCash} 
              onChange={(ex) => setState(p => ({...p, fixedExpenses: ex}))} 
              onBaseChange={(base) => setState(p => ({...p, defaultInitialCash: base}))} 
              dayCount={Object.keys(state.days).length} 
              onReset={() => setState(p => ({...p, days: {}, fixedExpenses: INITIAL_FIXED_EXPENSES, defaultInitialCash: 0}))} 
            />
          </div>
        </div>
      </main>

      {/* Botón Flotante Exportar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] z-40">
        <div className="container mx-auto max-w-7xl flex justify-end">
           <button onClick={handleExport} disabled={Object.keys(state.days).length === 0} className={`px-8 py-3 rounded-xl font-black text-white transition-all uppercase text-xs tracking-widest flex items-center gap-3 ${Object.keys(state.days).length === 0 ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 hover:bg-black shadow-xl shadow-slate-200 active:scale-95'}`}>
             <ArrowUpTrayIcon className="h-5 w-5 stroke-[3]" />
             Exportar Excel Contable
           </button>
        </div>
      </div>
    </div>
  );
};

// Componente auxiliar para tarjetas pequeñas
const StatCard = ({ icon, label, value, color }: any) => {
  const format = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);
  return (
    <div className={`bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 ${color} bg-opacity-30`}>
       <div className={`${color} p-2 rounded-lg bg-opacity-100`}>
         {React.cloneElement(icon, { className: "h-5 w-5" })}
       </div>
       <div className="min-w-0">
         <p className="text-[9px] font-black text-slate-400 uppercase truncate">{label}</p>
         <p className="text-sm font-bold text-slate-800 truncate">{format(value)}</p>
       </div>
    </div>
  )
}

export default App;
