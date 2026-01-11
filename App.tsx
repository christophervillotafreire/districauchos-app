import React, { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { DayEditor } from './components/DayEditor';
import { MonthlySummary } from './components/MonthlySummary';
import { parseNotebookPage, FileData } from './services/geminiService';
import { generateMonthlyReport } from './services/excelService';
// IMPORTANTE: Asegúrate de que AppUser esté exportado en types.ts como lo definimos antes
import { AppState, INITIAL_FIXED_EXPENSES, DayData, Transaction, TransactionType, AppUser } from './types';
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
  UserCircleIcon,
  LockClosedIcon,
  UsersIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

// --- FIREBASE IMPORTS ---
import { auth, googleProvider, db } from './firebaseConfig';
import { signInWithPopup, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

// --- CONFIGURACIÓN DE USUARIOS (Hardcoded por seguridad local) ---
const APP_USERS: AppUser[] = [
  { id: 'admin_01', name: 'Carlos', pin: '1307', role: 'admin' },
  { id: 'emp_01', name: 'Jhosept', pin: '0308', role: 'employee' },
  { id: 'emp_02', name: 'Anderson', pin: '0408', role: 'employee' },
  { id: 'emp_02', name: 'David', pin: '1412', role: 'employee' },
];

const App: React.FC = () => {

  // --- ESTADO DE AUTENTICACIÓN (FIREBASE) ---
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  // --- NUEVO: ESTADO DE SESIÓN (EMPLEADO) ---
  const [activeUser, setActiveUser] = useState<AppUser | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [pinEntry, setPinEntry] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');

  // --- ESTADO DE LA APP ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(new Date().getDate());
  const [hasManuallySelected, setHasManuallySelected] = useState<boolean>(false);
  const [editingDay, setEditingDay] = useState<DayData | null>(null);
  
  // El estado isAdmin ahora se deriva del usuario activo, pero mantenemos el estado local para casos manuales si es necesario
  const [isAdmin, setIsAdmin] = useState(false); 

  // Actualizar privilegios cuando cambia el usuario activo
  useEffect(() => {
    if (activeUser?.role === 'admin') {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }, [activeUser]);

  // Manejo de Login de Empleado
  const handleEmployeeLogin = () => {
    const targetUser = APP_USERS.find(u => u.id === selectedUserId);
    if (targetUser && targetUser.pin === pinEntry) {
      setActiveUser(targetUser);
      setPinEntry('');
      setLoginError('');
      setLoading(false);
    } else {
      setLoginError('PIN Incorrecto');
    }
  };

  const handleEmployeeLogout = () => {
    setActiveUser(null);
    setSelectedUserId('');
    setPinEntry('');
    setIsAdmin(false);
  };

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

  // 1. ESCUCHAR EL ESTADO DEL USUARIO Y SINCRONIZAR EN TIEMPO REAL
  useEffect(() => {
    let unsubscribeSnapshot: () => void; 

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      if (currentUser) {
        setLoading(true);
        setLoadingMessage('Sincronizando equipo...');
        
        const docRef = doc(db, "users", currentUser.uid);
        
        unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const cloudData = docSnap.data();
            const cloudFixed = cloudData.fixedExpenses || {};

            const sanitizedFixedExpenses = {
              ...INITIAL_FIXED_EXPENSES,
              ...cloudFixed,
              utilities: Array.isArray(cloudFixed.utilities) ? cloudFixed.utilities : [],
              payroll: Array.isArray(cloudFixed.payroll) ? cloudFixed.payroll : [],
              bankTransactions: Array.isArray(cloudFixed.bankTransactions) ? cloudFixed.bankTransactions : [],
              providersOccasional: Array.isArray(cloudFixed.providersOccasional) ? cloudFixed.providersOccasional : [],
              providersFormal: Array.isArray(cloudFixed.providersFormal) ? cloudFixed.providersFormal : [],
            };

            const newState: AppState = { 
              ...defaultState,
              currentMonth: cloudData.currentMonth ?? defaultState.currentMonth,
              currentYear: cloudData.currentYear ?? defaultState.currentYear,
              defaultInitialCash: cloudData.defaultInitialCash ?? defaultState.defaultInitialCash,
              days: cloudData.days || {},
              fixedExpenses: sanitizedFixedExpenses
            };

            setState(newState);
            setDataLoaded(true);
            setLoading(false);
          } else {
            setDoc(docRef, defaultState);
            setState(defaultState);
            setLoading(false);
            setDataLoaded(true);
          }
        }, (error) => {
          console.error("Error de sincronización:", error);
          setLoading(false);
        });

      } else {
        setDataLoaded(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  // 2. GUARDAR EN FIRESTORE
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
    const timer = setTimeout(() => { saveData(); }, 1000);
    return () => clearTimeout(timer);
  }, [state, user, dataLoaded]);


  // --- FUNCIONES DE AUTH FIREBASE ---
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error(error);
      alert("Error al iniciar sesión");
    }
  };

  const handleLogout = () => {
    const confirm = window.confirm("¿Cerrar sesión de Google? Esto desconectará la base de datos.");
    if(confirm) signOut(auth);
  };

  // --- CALCULOS ---
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
  const dayNetCashGenerated = dayStats.cashSales - dayStats.returns - dayStats.expenses;
  const dayTotalProfit = (dayStats.cashSales + dayStats.nequiSales) - dayStats.returns - dayStats.expenses;

  // --- HANDLERS ---
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Nota: Aquí se podría agregar createdBy a las transacciones de IA también, usando activeUser
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
      
      // INYECTAMOS LA FIRMA DEL USUARIO ACTIVO EN LA IA
      const extractedTransactions: Transaction[] = result.items.map((item: any) => ({
        id: Math.random().toString(36).substr(2, 9), 
        description: item.description, 
        amount: Number(item.amount), 
        type: item.type,
        createdBy: activeUser?.name // <-- FIRMA AUTOMÁTICA
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

  // --- RENDERIZADO 1: CARGANDO AUTH ---
  if (authLoading) {
    return <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-400">Cargando aplicación...</div>;
  }

  // --- RENDERIZADO 2: LOGIN GOOGLE (TIENDA) ---
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full space-y-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ScaleIcon className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-800">Districauchos App</h1>
          <p className="text-slate-500 text-sm">Acceso a Base de Datos en Nube.</p>
          <button onClick={handleLogin} className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-3">
            Entrar con Google
          </button>
        </div>
      </div>
    );
  }

  // --- RENDERIZADO 3: LOGIN PIN (EMPLEADO) ---
  // Si ya cargó Firebase pero no hay usuario "activo" operando la caja
  if (!activeUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border-t-4 border-blue-600">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">¿Quién eres?</h2>
            <button onClick={handleLogout} className="text-xs text-red-400 hover:text-red-600 underline">Salir de Google</button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">Selecciona tu Usuario</label>
              <div className="grid grid-cols-1 gap-2">
                {APP_USERS.map(u => (
                  <button
                    key={u.id}
                    onClick={() => { setSelectedUserId(u.id); setLoginError(''); }}
                    className={`p-3 rounded-lg flex items-center gap-3 border-2 transition-all text-left ${selectedUserId === u.id ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-100 hover:border-slate-300'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                      {u.name.charAt(0)}
                    </div>
                    <span className="font-bold">{u.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {selectedUserId && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-bold text-slate-600 mb-2">Ingresa tu PIN (4 dígitos)</label>
                <input 
                  type="password" 
                  inputMode="numeric"
                  maxLength={4}
                  value={pinEntry}
                  onChange={(e) => setPinEntry(e.target.value)}
                  className="w-full text-center text-3xl tracking-[1em] font-black p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none"
                  placeholder="••••"
                  autoFocus
                />
                {loginError && <p className="text-red-500 text-xs font-bold mt-2 text-center">{loginError}</p>}
                
                <button 
                  onClick={handleEmployeeLogin}
                  disabled={pinEntry.length < 4}
                  className="w-full mt-4 bg-blue-600 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl hover:bg-blue-700 active:scale-95 transition-all"
                >
                  INGRESAR A CAJA
                </button>
              </div>
            )}
          </div>
        </div>
        <p className="mt-8 text-slate-400 text-xs text-center max-w-xs">
          Esta capa de seguridad asegura que cada movimiento quede registrado a tu nombre para la auditoría contable.
        </p>
      </div>
    );
  }

  // --- RENDERIZADO 4: APP PRINCIPAL ---
  return (
    <div className="min-h-screen pb-44 bg-slate-50 font-sans xl:text-xl">
      <Header
        onInstall={installPrompt ? () => installPrompt.prompt() : undefined}
        onLogout={handleLogout} // Esto cierra sesión de Google
      />

      {/* BARRA DE USUARIO ACTIVO */}
      <div className="bg-slate-800 text-white px-4 py-2 flex justify-between items-center text-xs lg:text-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center font-bold text-slate-900">
            {activeUser.name.charAt(0)}
          </div>
          <span>Operando como: <span className="font-bold text-green-400">{activeUser.name}</span></span>
        </div>
        <button 
          onClick={handleEmployeeLogout} 
          className="flex items-center gap-1 hover:text-red-300 transition-colors"
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4"/>
          <span className="hidden sm:inline">Cambiar Usuario</span>
        </button>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,application/pdf" multiple className="hidden" />

      {loading && (
        <div className="fixed inset-0 bg-slate-900/95 z-[100] flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <p className="font-black text-2xl mb-2 text-blue-400">PROCESANDO</p>
          <p className="text-white font-bold uppercase tracking-widest text-xs animate-pulse">{loadingMessage}</p>
        </div>
      )}

      {/* Pasamos activeUser al editor */}
      {editingDay && (
        <DayEditor 
          dayData={editingDay} 
          defaultBase={state.defaultInitialCash} 
          activeUser={activeUser} // <--- PROPS NUEVA
          onSave={saveDayData} 
          onCancel={() => setEditingDay(null)} 
        />
      )}

      <main className="container mx-auto max-w-7xl p-4 lg:p-8 space-y-6">
        
        {/* SECCIÓN 1: Tarjetas y Panel Admin (Simplificado) */}
        {!isAdmin ? (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-600">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-slate-100 rounded-2xl">
                 <LockClosedIcon className="h-8 w-8 text-slate-400" />
               </div>
               <div>
                 <h3 className="font-bold text-lg text-slate-800">Vista de Empleado</h3>
                 <p className="text-slate-400 text-sm">Resumen financiero oculto. Solo puedes registrar operaciones.</p>
               </div>
            </div>
            {/* Ya no hay botón de PIN manual, se debe cambiar de usuario */}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
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
        )}

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
                  {isAdmin && (
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
                  )}

                  {!isAdmin ? (
                    <div className="py-4 text-center text-slate-400 text-sm">
                      <LockClosedIcon className="h-8 w-8 mx-auto mb-2 opacity-30"/>
                      <p>Resumen oculto para empleados</p>
                    </div>
                  ) : (
                    <>
                    <div className="flex justify-between items-center bg-green-50 p-4 rounded-2xl border border-green-100">
                        <div>
                        <span className="block text-[10px] text-green-700 font-black uppercase tracking-widest">Saldo Físico en Caja</span>
                        <span className="text-xs text-green-600 font-medium">Debe haber en la caja</span>
                        </div>
                        <span className="text-xl font-black text-green-700">{formatCurrency(dayNetCaja)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                        <div>
                        <span className="block text-[10px] text-indigo-700 font-black uppercase tracking-widest">Efectivo Neto del Día</span>
                        <span className="text-xs text-indigo-600 font-medium">(Ventas Efec. - Egresos) sin base</span>
                        </div>
                        <span className="text-xl font-black text-indigo-600">{formatCurrency(dayNetCashGenerated)}</span>
                    </div>
                    </>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
        
        {/* --- SECCION PÚBLICA (ARRIENDO, SERVICIOS, BANCOS, PROVEEDORES) --- */}
        <div className="w-full mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
           {/* Pasamos activeUser al MonthlySummary */}
           <MonthlySummary 
              mode="public" 
              activeUser={activeUser} // <--- PROPS NUEVA
              expenses={state.fixedExpenses} 
              defaultBase={state.defaultInitialCash} 
              onChange={(ex) => setState(p => ({...p, fixedExpenses: ex}))} 
              onBaseChange={(base) => setState(p => ({...p, defaultInitialCash: base}))} 
              dayCount={Object.keys(state.days).length} 
              onReset={() => {}} 
            />
        </div>

        {/* --- SECCION ADMIN (NÓMINA Y OTROS GASTOS) --- */}
        <div className="w-full mt-6">
          {isAdmin ? (
            <MonthlySummary 
              mode="admin" 
              activeUser={activeUser} // <--- PROPS NUEVA
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
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center animate-in fade-in opacity-50 hover:opacity-100 transition-opacity">
               <div className="inline-flex bg-slate-200 p-3 rounded-full mb-3">
                 <LockClosedIcon className="h-6 w-6 text-slate-400" />
               </div>
               <p className="text-slate-500 font-bold text-sm">Configuración Avanzada y Nómina Protegida.</p>
               <p className="text-slate-400 text-xs mt-1">Solo visible para el Administrador.</p>
            </div>
          )}
        </div>

      </main>

      {/* Botón de Exportar Excel (Solo visible si es Admin) */}
      {isAdmin && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] z-40 animate-in slide-in-from-bottom-full duration-500">
          <div className="container mx-auto max-w-7xl flex justify-end">
             <button onClick={handleExport} disabled={Object.keys(state.days).length === 0} className={`px-8 py-3 rounded-xl font-black text-white transition-all uppercase text-xs tracking-widest flex items-center gap-3 ${Object.keys(state.days).length === 0 ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 hover:bg-black shadow-xl shadow-slate-200 active:scale-95'}`}>
               <ArrowUpTrayIcon className="h-5 w-5 stroke-[3]" />
               Exportar Excel Contable
             </button>
          </div>
        </div>
      )}
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
