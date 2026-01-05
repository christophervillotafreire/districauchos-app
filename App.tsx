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
  CurrencyDollarIcon,
  ArchiveBoxArrowDownIcon
} from '@heroicons/react/24/outline';

const App: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(new Date().getDate());
  const [hasManuallySelected, setHasManuallySelected] = useState<boolean>(false);

  // --- ESTADO INICIAL Y MIGRACIÓN ---
  const [state, setState] = useState<AppState>(() => {
    const today = new Date();
    const defaultMonth = new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(today);
    
    const saved = localStorage.getItem('districauchos_state');
    if (saved) {
      try {
        const parsedState = JSON.parse(saved);
        
        // MIGRACIÓN: Bancos (Number -> Array)
        if (typeof parsedState.fixedExpenses?.bankLoans === 'number') {
           const val = parsedState.fixedExpenses.bankLoans;
           parsedState.fixedExpenses.bankLoans = val > 0 ? [{ id: 'mig_bank', date: '01', description: 'Deuda General', amount: val }] : [];
        }
        // MIGRACIÓN: Proveedores (Number -> Array)
        if (typeof parsedState.fixedExpenses?.suppliers === 'number') {
           const val = parsedState.fixedExpenses.suppliers;
           parsedState.fixedExpenses.suppliers = val > 0 ? [{ id: 'mig_supp', date: '01', description: 'Facturas Varias', amount: val }] : [];
        }

        // Asegurar arrays
        if (!Array.isArray(parsedState.fixedExpenses?.payroll)) parsedState.fixedExpenses.payroll = [];
        if (!Array.isArray(parsedState.fixedExpenses?.utilities)) parsedState.fixedExpenses.utilities = [];
        if (!Array.isArray(parsedState.fixedExpenses?.bankLoans)) parsedState.fixedExpenses.bankLoans = [];
        if (!Array.isArray(parsedState.fixedExpenses?.suppliers)) parsedState.fixedExpenses.suppliers = [];

        // Inicializar campos nuevos de fecha si no existen
        return {
            ...parsedState,
            monthName: parsedState.monthName || defaultMonth,
            year: parsedState.year || today.getFullYear()
        };

      } catch (e) {
        return { monthName: defaultMonth, year: today.getFullYear(), currentMonth: today.getMonth(), days: {}, fixedExpenses: INITIAL_FIXED_EXPENSES, defaultInitialCash: 0 };
      }
    }
    return { monthName: defaultMonth, year: today.getFullYear(), currentMonth: today.getMonth(), days: {}, fixedExpenses: INITIAL_FIXED_EXPENSES, defaultInitialCash: 0 };
  });

  const [editingDay, setEditingDay] = useState<DayData | null>(null);

  useEffect(() => {
    localStorage.setItem('districauchos_state', JSON.stringify(state));
  }, [state]);

  // --- CÁLCULOS ESTADÍSTICOS ---
  const monthlyStats = (Object.values(state.days) as DayData[]).reduce(
    (acc, day) => {
      day.transactions.forEach((t: Transaction) => {
        const amt = Number(t.amount) || 0;
        if (t.type === TransactionType.CASH_SALE) acc.cashSales += amt;
        if (t.type === TransactionType.NEQUI_SALE) acc.nequiSales += amt;
        if (t.type === TransactionType.DAILY_EXPENSE) acc.expenses += amt;
        if (t.type === TransactionType.RETURN) acc.returns += amt;
        if (t.type === TransactionType.DAILY_PURCHASE) acc.investments += amt; // Sumamos compras diarias
      });
      return acc;
    },
    { cashSales: 0, nequiSales: 0, expenses: 0, returns: 0, investments: 0 }
  );

  const selectedDayData = state.days[selectedDayNumber] || null;
  const dayStats = selectedDayData?.transactions.reduce((acc, t) => {
    const amt = Number(t.amount) || 0;
    if (t.type === TransactionType.CASH_SALE) acc.cashSales += amt;
    else if (t.type === TransactionType.NEQUI_SALE) acc.nequiSales += amt;
    else if (t.type === TransactionType.RETURN) acc.returns += amt;
    else if (t.type === TransactionType.DAILY_EXPENSE) acc.expenses += amt;
    else if (t.type === TransactionType.DAILY_PURCHASE) acc.investments += amt;
    return acc;
  }, { cashSales: 0, nequiSales: 0, returns: 0, expenses: 0, investments: 0 }) || { cashSales: 0, nequiSales: 0, returns: 0, expenses: 0, investments: 0 };

  const currentDayBase = selectedDayData ? (selectedDayData.initialCash ?? state.defaultInitialCash) : state.defaultInitialCash;
  
  // LÓGICA DE CAJA: Efectivo Inicial + Ventas Efectivo - Devoluciones - Gastos - COMPRAS DIARIAS (salen de la caja)
  const dayNetCaja = currentDayBase + dayStats.cashSales - dayStats.returns - dayStats.expenses - dayStats.investments;
  
  // Utilidad Operativa del Día (Sin descontar inversión, pues eso es activo, no gasto)
  // Aunque para "bolsillo" se siente como gasto, contablemente es cambio de activo.
  // Sin embargo, para el reporte simple de utilidad diaria, solemos restar todo lo que sale.
  // Aquí RESTAREMOS gastos operativos, pero las compras diarias las dejamos como flujo aparte en el excel final.
  const dayTotalProfit = (dayStats.cashSales + dayStats.nequiSales) - dayStats.returns - dayStats.expenses;

  // --- HANDLERS ---
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // ... (Misma lógica de antes)
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setLoading(true);
    setLoadingMessage('Analizando...');
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
      // Nota: Gemini podría necesitar un prompt update para distinguir compras de gastos, 
      // pero por ahora el usuario puede cambiar el tipo manualmente en DayEditor.
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
  };

  const handleExport = () => generateMonthlyReport(state);
  const formatCurrency = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="min-h-screen pb-44 bg-slate-50 font-sans">
      <Header onInstall={installPrompt ? () => installPrompt.prompt() : undefined} />
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,application/pdf" multiple className="hidden" />

      {loading && (
        <div className="fixed inset-0 bg-slate-900/95 z-[100] flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <p className="font-black text-2xl mb-2 text-blue-400">PROCESANDO</p>
        </div>
      )}

      {editingDay && <DayEditor dayData={editingDay} defaultBase={state.defaultInitialCash} onSave={saveDayData} onCancel={() => setEditingDay(null)} />}

      <main className="container mx-auto max-w-7xl p-4 lg:p-8 space-y-6">
        
        {/* SECCIÓN 1: Tarjetas Superiores */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={<BanknotesIcon className="text-green-600"/>} label="Ventas Efec." value={monthlyStats.cashSales} color="bg-green-50" />
          <StatCard icon={<CreditCardIcon className="text-purple-600"/>} label="Ventas Nequi" value={monthlyStats.nequiSales} color="bg-purple-50" />
          <StatCard icon={<ShoppingBagIcon className="text-red-600"/>} label="Gastos Oper." value={monthlyStats.expenses} color="bg-red-50" />
          <StatCard icon={<ArchiveBoxArrowDownIcon className="text-orange-600"/>} label="Inversión Día" value={monthlyStats.investments} color="bg-orange-50" />
          {/* ... resto de tarjetas ... */}
        </div>

        {/* SECCIÓN 2: Layout Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 h-full">
              
              {/* INPUTS DINÁMICOS DE FECHA */}
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                   <CalendarIcon className="h-8 w-8 text-blue-600"/>
                   <div className="flex flex-col">
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configuración Periodo</label>
                     <div className="flex items-baseline gap-2">
                       <input 
                         type="text" 
                         value={state.monthName}
                         onChange={(e) => setState(p => ({...p, monthName: e.target.value}))}
                         className="text-xl font-black text-slate-800 uppercase bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 outline-none w-32"
                         placeholder="MES"
                       />
                       <input 
                         type="number" 
                         value={state.year}
                         onChange={(e) => setState(p => ({...p, year: parseInt(e.target.value) || new Date().getFullYear()}))}
                         className="text-xl font-black text-slate-400 bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 outline-none w-20"
                       />
                     </div>
                   </div>
                </div>

                {/* BOTÓN CÁMARA LIMPIO */}
                <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 text-white p-4 rounded-full shadow-xl hover:bg-blue-700 active:scale-95 transition-all">
                  <CameraIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-7 gap-2 lg:gap-3">
                {['D','L','M','M','J','V','S'].map(d => <span key={d} className="text-center text-xs font-bold text-slate-300 mb-2">{d}</span>)}
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                  const hasData = !!state.days[day];
                  const isSelected = selectedDayNumber === day;
                  return (
                    <button
                      key={day}
                      onClick={() => { setSelectedDayNumber(day); setHasManuallySelected(true); }}
                      className={`aspect-square rounded-xl flex items-center justify-center text-sm lg:text-base font-bold transition-all border-2
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

          <div className="lg:col-span-5 space-y-6">
            
            {selectedDayNumber && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-right-4 duration-500">
                <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
                  <div>
                    <span className="block font-black text-lg uppercase tracking-tight">Día {selectedDayNumber}</span>
                    <span className="text-xs text-blue-400 font-bold uppercase tracking-widest">Caja y Compras</span>
                  </div>
                  <button onClick={() => setEditingDay(selectedDayData || { day: selectedDayNumber, hasData: true, transactions: [], initialCash: state.defaultInitialCash })} className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-full text-xs font-black uppercase transition-colors">
                    {selectedDayData ? 'Editar' : 'Registrar'}
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  {/* Detalles Día... */}
                  <div className="flex justify-between items-center bg-green-50 p-4 rounded-2xl border border-green-100">
                    <div>
                      <span className="block text-[10px] text-green-700 font-black uppercase tracking-widest">Saldo Físico Real</span>
                      <span className="text-[10px] text-green-600 font-medium">(Tras gastos y compras diarias)</span>
                    </div>
                    <span className="text-xl font-black text-green-700">{formatCurrency(dayNetCaja)}</span>
                  </div>
                  
                  {/* Mostrar Inversión Diaria si existe */}
                  {dayStats.investments > 0 && (
                     <div className="flex justify-between items-center bg-orange-50 p-3 rounded-xl border border-orange-100">
                        <span className="text-[10px] text-orange-700 font-bold uppercase">Compra Mercancía (Hoy)</span>
                        <span className="text-sm font-black text-orange-700">-{formatCurrency(dayStats.investments)}</span>
                     </div>
                  )}
                </div>
              </div>
            )}

            <MonthlySummary 
              expenses={state.fixedExpenses} 
              defaultBase={state.defaultInitialCash} 
              onChange={(ex) => setState(p => ({...p, fixedExpenses: ex}))} 
              onBaseChange={(base) => setState(p => ({...p, defaultInitialCash: base}))} 
              onReset={() => setState(p => ({...p, days: {}, fixedExpenses: INITIAL_FIXED_EXPENSES, defaultInitialCash: 0}))} 
            />
          </div>
        </div>
      </main>

      {/* Botón Flotante Exportar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] z-40">
        <div className="container mx-auto max-w-7xl flex justify-end">
           <button onClick={handleExport} disabled={Object.keys(state.days).length === 0} className="bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest flex items-center gap-3 shadow-xl shadow-slate-200">
             <ArrowUpTrayIcon className="h-5 w-5 stroke-[3]" />
             Exportar Excel Contable
           </button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: any) => {
  const format = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);
  return (
    <div className={`bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 ${color} bg-opacity-30`}>
       <div className={`${color} p-2 rounded-lg bg-opacity-100`}>{React.cloneElement(icon, { className: "h-5 w-5" })}</div>
       <div className="min-w-0"><p className="text-[9px] font-black text-slate-400 uppercase truncate">{label}</p><p className="text-sm font-bold text-slate-800 truncate">{format(value)}</p></div>
    </div>
  )
}

export default App;
