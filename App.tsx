import React, { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { EmptyState } from './components/EmptyState';
import { DayEditor } from './components/DayEditor';
import { MonthlySummary } from './components/MonthlySummary';
import { parseNotebookPage } from './services/geminiService';
import { generateMonthlyReport } from './services/excelService';
import { AppState, INITIAL_FIXED_EXPENSES, DayData, Transaction, MonthlyFixedExpenses } from './types';
import { ArrowUpTrayIcon, CalendarIcon } from '@heroicons/react/24/outline';

const App: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('districauchos_state');
    if (saved) return JSON.parse(saved);
    return {
      currentMonth: new Date().getMonth(),
      currentYear: new Date().getFullYear(),
      days: {},
      fixedExpenses: INITIAL_FIXED_EXPENSES
    };
  });

  const [editingDay, setEditingDay] = useState<DayData | null>(null);

  useEffect(() => {
    localStorage.setItem('districauchos_state', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setLoadingMessage('Leyendo archivo...');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = (reader.result as string).split(',')[1];
          const mimeType = file.type;

          setLoadingMessage('Gemini analizando cuaderno...');
          const result = await parseNotebookPage(base64String, mimeType);
          
          if (!result || !result.items) {
            throw new Error("La IA no pudo leer datos claros de la imagen.");
          }

          const extractedTransactions: Transaction[] = result.items.map((item: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            description: item.description || 'Sin descripción',
            amount: Number(item.amount) || 0,
            type: item.type
          }));

          const estimatedDay = result.dayEstimate || new Date().getDate();

          const newDayData: DayData = {
            day: estimatedDay,
            hasData: true,
            transactions: extractedTransactions
          };

          setEditingDay(newDayData);
        } catch (err: any) {
          alert("Error: " + err.message);
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      alert("Error al cargar el archivo.");
      setLoading(false);
    } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const saveDayData = (data: DayData) => {
    setState(prev => ({
      ...prev,
      days: { ...prev.days, [data.day]: data }
    }));
    setEditingDay(null);
  };

  const handleExpenseChange = (expenses: MonthlyFixedExpenses) => {
    setState(prev => ({ ...prev, fixedExpenses: expenses }));
  };

  const handleExport = () => {
    generateMonthlyReport(state);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const daysWithData = Object.values(state.days).length;

  return (
    <div className="min-h-screen pb-32 bg-slate-50">
      <Header onInstall={installPrompt ? handleInstallClick : undefined} />

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        accept="image/*,application/pdf" 
        className="hidden" 
      />

      {loading && (
        <div className="fixed inset-0 bg-slate-900/90 z-[100] flex flex-col items-center justify-center text-white p-6 text-center">
          <div className="relative w-20 h-20 mb-6">
            <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-xl font-bold tracking-wide">{loadingMessage}</p>
          <p className="text-blue-400 mt-2 text-sm animate-pulse">Digitalizando Districauchos...</p>
        </div>
      )}

      {editingDay && (
        <DayEditor 
          dayData={editingDay} 
          onSave={saveDayData} 
          onCancel={() => setEditingDay(null)} 
        />
      )}

      <main className="container mx-auto max-w-lg p-4 space-y-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="font-black text-slate-800 text-xl flex items-center gap-2">
                <CalendarIcon className="h-6 w-6 text-blue-600"/>
                REGISTRO DIARIO
              </h2>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-tighter">Control de Ventas y Gastos</p>
            </div>
            <button 
              onClick={triggerFileInput}
              className="bg-blue-600 text-white p-3 rounded-full shadow-lg shadow-blue-200 active:scale-90 transition-transform"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
              </svg>
            </button>
          </div>

          {daysWithData === 0 ? (
            <EmptyState onScan={triggerFileInput} />
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                const hasData = !!state.days[day];
                return (
                  <button
                    key={day}
                    onClick={() => {
                        if(hasData) {
                            setEditingDay(state.days[day]);
                        } else {
                            setEditingDay({ day, hasData: true, transactions: [] });
                        }
                    }}
                    className={`
                      aspect-square rounded-xl flex flex-col items-center justify-center border-2 text-sm transition-all relative
                      ${hasData 
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md transform scale-105 z-10' 
                        : 'bg-white text-slate-400 border-slate-100 hover:border-blue-200'
                      }
                    `}
                  >
                    <span className="font-black text-base">{day}</span>
                    {hasData && <div className="absolute top-1 right-1 w-2 h-2 bg-green-400 rounded-full border border-blue-600 animate-pulse"></div>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <MonthlySummary 
          expenses={state.fixedExpenses} 
          onChange={handleExpenseChange} 
          dayCount={daysWithData}
        />
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 pb-safe-bottom shadow-2xl z-40">
        <div className="container mx-auto max-w-lg flex items-center justify-between gap-4">
           <div className="flex flex-col">
             <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Estado</span>
             <span className="text-sm font-bold text-slate-800">{daysWithData} días listos</span>
           </div>
           <button
             onClick={handleExport}
             disabled={daysWithData === 0}
             className={`
               flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-white transition-all uppercase tracking-tighter
               ${daysWithData === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-xl shadow-green-100 active:scale-95'}
             `}
           >
             <ArrowUpTrayIcon className="h-5 w-5 stroke-[3]" />
             Exportar Excel
           </button>
        </div>
      </div>
    </div>
  );
};

export default App;