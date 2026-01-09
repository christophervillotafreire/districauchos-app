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
  UserCircleIcon // Nuevo icono
} from '@heroicons/react/24/outline';

// --- FIREBASE IMPORTS ---
import { auth, googleProvider, db } from './firebaseConfig';
import { signInWithPopup, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const App: React.FC = () => {
  // --- ESTADO DE AUTENTICACIÓN ---
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false); // Para saber si ya bajamos datos de la nube

  // --- ESTADO DE LA APP ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(new Date().getDate());
  const [hasManuallySelected, setHasManuallySelected] = useState<boolean>(false);
  const [editingDay, setEditingDay] = useState<DayData | null>(null);
  
  const today = new Date();

  // Estado inicial por defecto
  const defaultState: AppState = { 
    currentMonth: today.getMonth(), 
    currentYear: today.getFullYear(), 
    days: {}, 
    fixedExpenses: INITIAL_FIXED_EXPENSES, 
    defaultInitialCash: 0 
  };

  const [state, setState] = useState<AppState>(defaultState);

  // 1. ESCUCHAR EL ESTADO DEL USUARIO (LOGIN/LOGOUT)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      if (currentUser) {
        setLoadingMessage('Sincronizando datos...');
        setLoading(true);
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const cloudData = docSnap.data(); // Obtenemos datos crudos sin forzar tipo todavía
            
            // --- ESTRATEGIA DE FUSIÓN SEGURA (A PRUEBA DE FALLOS) ---
            
            // 1. Creamos un "esqueleto" nuevo y perfecto
            const safeState: AppState = { ...defaultState };

            // 2. Recuperamos datos básicos si existen
            if (cloudData.currentMonth !== undefined) safeState.currentMonth = cloudData.currentMonth;
            if (cloudData.currentYear !== undefined) safeState.currentYear = cloudData.currentYear;
            if (cloudData.defaultInitialCash !== undefined) safeState.defaultInitialCash = cloudData.defaultInitialCash;
            if (cloudData.days) safeState.days = cloudData.days;

            // 3. Reconstrucción quirúrgica de FixedExpenses
            // (Tomamos los valores de la nube, pero si faltan listas, usamos las vacías del nuevo sistema)
            const cloudFixed = cloudData.fixedExpenses || {};
            
            safeState.fixedExpenses = {
              ...INITIAL_FIXED_EXPENSES, // Cargamos la estructura nueva primero (garantiza que existan providersOccasional, etc)
              ...cloudFixed,             // Sobreescribimos con los datos viejos (renta, valores antiguos)
            };

            // 4. Validación final obligatoria de Arrays (Evita que .map() explote)
            safeState.fixedExpenses.payroll = Array.isArray(cloudFixed.payroll) ? cloudFixed.payroll : [];
            safeState.fixedExpenses.utilities = Array.isArray(cloudFixed.utilities) ? cloudFixed.utilities : [];
            
            // Aquí está la magia: Si en la nube no existen, usamos [] (Array vacío)
            safeState.fixedExpenses.bankTransactions = Array.isArray(cloudFixed.bankTransactions) ? cloudFixed.bankTransactions : [];
            safeState.fixedExpenses.providersOccasional = Array.isArray(cloudFixed.providersOccasional) ? cloudFixed.providersOccasional : [];
            safeState.fixedExpenses.providersFormal = Array.isArray(cloudFixed.providersFormal) ? cloudFixed.providersFormal : [];

            setState(safeState);
          } else {
            setState(defaultState);
          }
        } catch (error) {
          console.error("Error cargando datos:", error);
          // En caso de emergencia, cargamos el estado por defecto para que no se quede pegado
          setState(defaultState);
        } finally {
          setLoading(false);
          setDataLoaded(true); 
        }
      } else {
        setDataLoaded(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. GUARDAR EN FIRESTORE CUANDO EL ESTADO CAMBIA
  // Reemplaza al useEffect de localStorage
  useEffect(() => {
    const saveData = async () => {
      if (user && dataLoaded) {
        try {
          await setDoc(doc(db, "users", user.uid), state);
          console.log("Datos guardados en nube");
        } catch (e) {
          console.error("Error guardando:", e);
        }
      }
    };

    // Usamos un pequeño delay (debounce) para no saturar la base de datos si escribes rápido
    const timer = setTimeout(() => {
      saveData();
    }, 1000);

    return () => clearTimeout(timer);
  }, [state, user, dataLoaded]);


  // --- FUNCIONES DE AUTH ---
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error(error);
      alert("Error al iniciar sesión");
    }
  };

  const handleLogout = () => {
    const confirm = window.confirm("¿Cerrar sesión? Los datos ya están guardados en la nube.");
    if(confirm) signOut(auth);
  };

  // --- CALCULOS (TU LÓGICA ORIGINAL) ---
  const daysInMonth = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
  const monthName = new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(new Date(state.currentYear, state.currentMonth)).toUpperCase();

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

  // --- RENDERIZADO CONDICIONAL (LOGIN vs APP) ---

  if (authLoading) {
    return <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-400">Cargando aplicación...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full space-y-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ScaleIcon className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-800">Districauchos App</h1>
          <p className="text-slate-500 text-sm">Inicia sesión para acceder a tus registros financieros de forma segura y sincronizada.</p>
          
          <button 
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.24.81-.6z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Entrar con Google
          </button>
        </div>
      </div>
    );
  }

  // --- APP PRINCIPAL (SOLO SI HAY USUARIO) ---
  return (
    <div className="min-h-screen pb-44 bg-slate-50 font-sans xl:text-xl">
      {/* Modificación en Header para Logout */}
      <Header
        onInstall={installPrompt ? () => installPrompt.prompt() : undefined}
        onLogout={handleLogout}
      />

      <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,application/pdf" multiple className="hidden" />

      {loading && (
        <div className="fixed inset-0 bg-slate-900/95 z-[100] flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <p className="font-black text-2xl mb-2 text-blue-400">PROCESANDO</p>
          <p className="text-white font-bold uppercase tracking-widest text-xs animate-pulse">{loadingMessage}</p>
        </div>
      )}

      {editingDay && <DayEditor dayData={editingDay} defaultBase={state.defaultInitialCash} onSave={saveDayData} onCancel={() => setEditingDay(null)} />}

      <main className="container mx-auto max-w-7xl p-4 lg:p-8 space-y-6">
        
        {/* SECCIÓN 1: Tarjetas */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={<BanknotesIcon className="text-green-600"/>} label="Ventas Efect." value={monthlyStats.cashSales} color="bg-green-50" />
          <StatCard icon={<CreditCardIcon className="text-purple-600"/>} label="Ventas Transf" value={monthlyStats.nequiSales} color="bg-purple-50" />
          <StatCard icon={<ShoppingBagIcon className="text-red-600"/>} label="Gastos Caja" value={monthlyStats.expenses} color="bg-red-50" />
          <StatCard icon={<ArrowUturnLeftIcon className="text-orange-600"/>} label="Devoluciones" value={monthlyStats.returns} color="bg-orange-50" />
          
          <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg shadow-emerald-100 flex items-center gap-3 text-white col-span-2 md:col-span-1 lg:col-span-1">
             <div className="bg-emerald-500/30 p-2 rounded-lg"><CurrencyDollarIcon className="h-5 w-5 text-white"/></div>
             <div className="min-w-0"><p className="text-[10px] font-black text-emerald-200 uppercase">Ganancia Efec.</p><p className="text-sm font-black truncate">{formatCurrency(monthlyCashProfit)}</p></div>
          </div>
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-100 flex items-center gap-3 text-white col-span-2 md:col-span-1 lg:col-span-1">
             <div className="bg-blue-500/30 p-2 rounded-lg"><ScaleIcon className="h-5 w-5 text-white"/></div>
             <div className="min-w-0"><p className="text-[10px] font-black text-blue-200 uppercase">Ganancia Neta</p><p className="text-sm font-black truncate">{formatCurrency(monthlyGrossProfit)}</p></div>
          </div>
        </div>

        {/* SECCIÓN 2: Layout Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 h-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                  <CalendarIcon className="h-7 w-7 text-blue-600"/>
                  {monthName} <span className="text-slate-400">{state.currentYear}</span>
                </h2>
                <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 text-white px-5 py-2.5 rounded-full shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-wide">
                  <CameraIcon className="h-5 w-5" />
                </button>
              </div>
              
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

          <div className="lg:col-span-5 space-y-6">
            
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
                      <span className="text-xs text-green-600 font-medium">Debe haber en billetes</span>
                    </div>
                    <span className="text-xl font-black text-green-700">{formatCurrency(dayNetCaja)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <div>
                      <span className="block text-[10px] text-blue-700 font-black uppercase tracking-widest">Utilidad Real del Día</span>
                      <span className="text-xs text-blue-600 font-medium">Ganancia neta</span>
                    </div>
                    <span className="text-xl font-black text-blue-700">{formatCurrency(dayTotalProfit)}</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
        <div className="w-full mt-6">
          <MonthlySummary 
              expenses={state.fixedExpenses} 
              defaultBase={state.defaultInitialCash} 
              onChange={(ex) => setState(p => ({...p, fixedExpenses: ex}))} 
              onBaseChange={(base) => setState(p => ({...p, defaultInitialCash: base}))} 
              dayCount={Object.keys(state.days).length} 
              onReset={() => {
                if(confirm("¿Deseas cerrar el mes actual e iniciar uno nuevo?")) {
                  const now = new Date(); 
                  setState({
                    currentMonth: now.getMonth(), 
                    currentYear: now.getFullYear(), 
                    days: {}, 
                    fixedExpenses: state.fixedExpenses, 
                    defaultInitialCash: 0 
                  });
                }
              }} 
            />
        </div>

      </main>


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
