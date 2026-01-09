import React, { useState } from 'react';
import { MonthlyFixedExpenses, Employee, ServiceItem, SimpleExpenseItem, ProviderFormalItem } from '../types';
import { 
  TrashIcon, CurrencyDollarIcon, UserGroupIcon, PlusIcon, BoltIcon, 
  BuildingLibraryIcon, TruckIcon, XMarkIcon, CalendarDaysIcon, 
  DocumentTextIcon, BuildingStoreIcon 
} from '@heroicons/react/24/outline';

interface MonthlySummaryProps {
  expenses: MonthlyFixedExpenses;
  defaultBase: number;
  onChange: (expenses: MonthlyFixedExpenses) => void;
  onBaseChange: (base: number) => void;
  dayCount: number;
  onReset: () => void;
}

// --- SUB-COMPONENTE: MODAL GENÉRICO ---
const Modal = ({ title, onClose, children }: { title: string, onClose: () => void, children: React.ReactNode }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
      <div className="bg-slate-900 px-5 py-4 flex justify-between items-center">
        <h3 className="text-white font-bold text-lg">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto custom-scrollbar p-5">
        {children}
      </div>
    </div>
  </div>
);

export const MonthlySummary: React.FC<MonthlySummaryProps> = ({ expenses, defaultBase, onChange, onBaseChange, onReset }) => {
  
  // Estado para controlar qué modal está abierto
  const [activeModal, setActiveModal] = useState<'NONE' | 'PROVIDERS' | 'BANKS'>('NONE');
  // Estado para la pestaña interna de proveedores (Ocasional vs Formal)
  const [providerTab, setProviderTab] = useState<'OCCASIONAL' | 'FORMAL'>('OCCASIONAL');

  // --- HELPERS GENERALES ---
  const updateSimpleField = (field: keyof MonthlyFixedExpenses, value: string) => {
    // Solo permitimos editar directamente 'rent' y 'others' (y los legacy si fuera necesario)
    if (field === 'payroll' || field === 'utilities' || field === 'providersOccasional' || field === 'providersFormal' || field === 'bankTransactions') return;
    onChange({ ...expenses, [field]: parseFloat(value) || 0 });
  };

  const confirmReset = () => {
    if (window.confirm("¿Borrar TODOS los datos del mes? Esta acción no se puede deshacer.")) onReset();
  };

  // --- LÓGICA DE NÓMINA Y SERVICIOS (Igual que antes) ---
  const addEmployee = () => onChange({ ...expenses, payroll: [...(expenses.payroll||[]), { id: Date.now().toString(), name: '', paymentQ1: 0, paymentQ2: 0 }] });
  const updateEmployee = (id: string, field: keyof Employee, value: any) => onChange({ ...expenses, payroll: (expenses.payroll||[]).map(i => i.id === id ? { ...i, [field]: value } : i) });
  const removeEmployee = (id: string) => { if(confirm('¿Eliminar empleado?')) onChange({ ...expenses, payroll: (expenses.payroll||[]).filter(i => i.id !== id) }); };
  
  const addService = () => onChange({ ...expenses, utilities: [...(expenses.utilities||[]), { id: Date.now().toString(), name: '', amount: 0 }] });
  const updateService = (id: string, field: keyof ServiceItem, value: any) => onChange({ ...expenses, utilities: (expenses.utilities||[]).map(i => i.id === id ? { ...i, [field]: value } : i) });
  const removeService = (id: string) => { if(confirm('¿Eliminar servicio?')) onChange({ ...expenses, utilities: (expenses.utilities||[]).filter(i => i.id !== id) }); };

  // --- LÓGICA DE BANCOS ---
  const addBankItem = () => onChange({ 
    ...expenses, 
    bankTransactions: [...(expenses.bankTransactions||[]), { id: Date.now().toString(), date: new Date().toISOString().split('T')[0], description: '', amount: 0 }] 
  });
  const updateBankItem = (id: string, field: keyof SimpleExpenseItem, value: any) => onChange({ ...expenses, bankTransactions: (expenses.bankTransactions||[]).map(i => i.id === id ? { ...i, [field]: value } : i) });
  const removeBankItem = (id: string) => onChange({ ...expenses, bankTransactions: (expenses.bankTransactions||[]).filter(i => i.id !== id) });

  // --- LÓGICA DE PROVEEDORES (Ocasionales y Formales) ---
  const addOccasional = () => onChange({ 
    ...expenses, 
    providersOccasional: [...(expenses.providersOccasional||[]), { id: Date.now().toString(), date: new Date().toISOString().split('T')[0], description: '', amount: 0 }] 
  });
  const updateOccasional = (id: string, field: keyof SimpleExpenseItem, value: any) => onChange({ ...expenses, providersOccasional: (expenses.providersOccasional||[]).map(i => i.id === id ? { ...i, [field]: value } : i) });
  const removeOccasional = (id: string) => onChange({ ...expenses, providersOccasional: (expenses.providersOccasional||[]).filter(i => i.id !== id) });

  const addFormal = () => onChange({ 
    ...expenses, 
    providersFormal: [...(expenses.providersFormal||[]), { id: Date.now().toString(), date: new Date().toISOString().split('T')[0], company: '', invoiceNumber: '', amount: 0 }] 
  });
  const updateFormal = (id: string, field: keyof ProviderFormalItem, value: any) => onChange({ ...expenses, providersFormal: (expenses.providersFormal||[]).map(i => i.id === id ? { ...i, [field]: value } : i) });
  const removeFormal = (id: string) => onChange({ ...expenses, providersFormal: (expenses.providersFormal||[]).filter(i => i.id !== id) });


  // --- CÁLCULOS DE TOTALES ---
  const totalPayroll = (expenses.payroll||[]).reduce((a,b) => a + (Number(b.paymentQ1)||0) + (Number(b.paymentQ2)||0), 0);
  const totalUtils = (expenses.utilities||[]).reduce((a,b) => a + (Number(b.amount)||0), 0);
  
  const totalBanks = (expenses.bankTransactions||[]).reduce((a,b) => a + (Number(b.amount)||0), 0);
  
  const totalProvOccasional = (expenses.providersOccasional||[]).reduce((a,b) => a + (Number(b.amount)||0), 0);
  const totalProvFormal = (expenses.providersFormal||[]).reduce((a,b) => a + (Number(b.amount)||0), 0);
  const totalProviders = totalProvOccasional + totalProvFormal;

  return (
    <div className="space-y-6">
      
      {/* TARJETA PRINCIPAL DEL RESUMEN */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
          <div>
            <h3 className="font-black flex items-center gap-2 text-sm uppercase"><CurrencyDollarIcon className="h-4 w-4 text-blue-400" /> Cierre de Mes</h3>
          </div>
          <div className="bg-slate-700 px-3 py-1 rounded-full border border-slate-600">
             <span className="text-[10px] font-bold text-slate-300">Base Diaria:</span>
             <input type="number" value={defaultBase||''} onChange={(e) => onBaseChange(parseFloat(e.target.value)||0)} className="w-16 bg-transparent text-right font-black text-white text-xs outline-none ml-2" placeholder="0" />
          </div>
        </div>
        
        <div className="p-5 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
          
          {/* 1. SERVICIOS */}
          <div className="bg-cyan-50/50 p-4 rounded-2xl border border-cyan-100">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-black text-cyan-900 uppercase flex items-center gap-2"><BoltIcon className="h-4 w-4" /> Servicios ({totalUtils.toLocaleString()})</h4>
              <button onClick={addService} className="bg-cyan-600 text-white p-1.5 rounded-lg hover:bg-cyan-700"><PlusIcon className="h-3 w-3" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2"> 
              {(expenses.utilities||[]).map((item) => (
                <div key={item.id} className="bg-white p-2 rounded-xl border border-cyan-100 shadow-sm flex items-center gap-2 relative">
                   <div className="flex-1 min-w-0">
                      <input type="text" value={item.name} onChange={(e) => updateService(item.id, 'name', e.target.value)} placeholder="Nombre" className="w-full text-[10px] font-bold border-b border-transparent focus:border-cyan-200 outline-none text-slate-600 mb-0.5" />
                      <input type="number" value={item.amount || ''} onChange={(e) => updateService(item.id, 'amount', parseFloat(e.target.value) || 0)} placeholder="$0" className="w-full text-xs font-black text-cyan-700 outline-none bg-transparent" />
                   </div>
                   <button onClick={() => removeService(item.id)} className="text-red-300 hover:text-red-500"><TrashIcon className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
            {(!expenses.utilities?.length) && <p className="text-center text-[10px] text-cyan-400 italic">Sin registros</p>}
          </div>

          {/* 2. NÓMINA */}
          <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-black text-indigo-900 uppercase flex items-center gap-2"><UserGroupIcon className="h-4 w-4" /> Nómina ({totalPayroll.toLocaleString()})</h4>
              <button onClick={addEmployee} className="bg-indigo-600 text-white p-1.5 rounded-lg hover:bg-indigo-700"><PlusIcon className="h-3 w-3" /></button>
            </div>
            <div className="space-y-2">
              {(expenses.payroll||[]).map((emp) => (
                <div key={emp.id} className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm relative">
                  <button onClick={() => removeEmployee(emp.id)} className="absolute top-2 right-2 text-red-300 hover:text-red-500"><TrashIcon className="h-3 w-3" /></button>
                  <input type="text" value={emp.name} onChange={(e) => updateEmployee(emp.id, 'name', e.target.value)} placeholder="Nombre Empleado" className="w-full text-xs font-bold border-b border-slate-100 pb-1 mb-2 focus:border-indigo-500 outline-none text-slate-800" />
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[8px] font-bold text-slate-400 uppercase">1ra Quincena</label><input type="number" value={emp.paymentQ1 || ''} onChange={(e) => updateEmployee(emp.id, 'paymentQ1', parseFloat(e.target.value) || 0)} className="w-full text-xs font-bold text-slate-600 bg-slate-50 rounded px-2 py-1" /></div>
                    <div><label className="text-[8px] font-bold text-slate-400 uppercase">2da Quincena</label><input type="number" value={emp.paymentQ2 || ''} onChange={(e) => updateEmployee(emp.id, 'paymentQ2', parseFloat(e.target.value) || 0)} className="w-full text-xs font-bold text-slate-600 bg-slate-50 rounded px-2 py-1" /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. ARRIENDO Y OTROS (Campos Simples) */}
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Arriendo</label>
                <input type="number" value={expenses.rent || ''} onChange={(e) => updateSimpleField('rent', e.target.value)} className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none" placeholder="$0" />
             </div>
             <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">Otros Gastos</label>
                <input type="number" value={expenses.others || ''} onChange={(e) => updateSimpleField('others', e.target.value)} className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none" placeholder="$0" />
             </div>
          </div>

          {/* 4. BANCOS Y PROVEEDORES (Botones de Gestión) */}
          <div className="grid grid-cols-2 gap-3">
            {/* Botón Bancos */}
            <button 
              onClick={() => setActiveModal('BANKS')}
              className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 p-3 rounded-xl flex items-center justify-between group transition-colors"
            >
              <div className="text-left">
                <p className="text-[10px] font-black text-emerald-400 uppercase mb-0.5 group-hover:text-emerald-500">Bancos / Cuotas</p>
                <p className="text-sm font-bold text-emerald-800">{totalBanks.toLocaleString()}</p>
              </div>
              <BuildingLibraryIcon className="h-5 w-5 text-emerald-300 group-hover:text-emerald-600" />
            </button>

            {/* Botón Proveedores */}
            <button 
              onClick={() => setActiveModal('PROVIDERS')}
              className="bg-orange-50 hover:bg-orange-100 border border-orange-100 p-3 rounded-xl flex items-center justify-between group transition-colors"
            >
              <div className="text-left">
                <p className="text-[10px] font-black text-orange-400 uppercase mb-0.5 group-hover:text-orange-500">Proveedores</p>
                <p className="text-sm font-bold text-orange-800">{totalProviders.toLocaleString()}</p>
              </div>
              <TruckIcon className="h-5 w-5 text-orange-300 group-hover:text-orange-600" />
            </button>
          </div>

          <div className="pt-2">
             <button onClick={confirmReset} className="w-full py-2 text-[10px] font-black text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-2"><TrashIcon className="h-3 w-3"/> REINICIAR MES</button>
          </div>
        </div>
      </div>

      {/* --- MODAL DE BANCOS --- */}
      {activeModal === 'BANKS' && (
        <Modal title="Gestionar Bancos" onClose={() => setActiveModal('NONE')}>
          <div className="space-y-4">
            <button onClick={addBankItem} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2">
              <PlusIcon className="h-4 w-4" /> Agregar Cuota / Gasto
            </button>
            <div className="space-y-3">
              {(expenses.bankTransactions||[]).map((item) => (
                <div key={item.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 relative group">
                  <button onClick={() => removeBankItem(item.id)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500"><TrashIcon className="h-4 w-4" /></button>
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div className="col-span-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Descripción</label>
                      <input type="text" value={item.description} onChange={(e) => updateBankItem(item.id, 'description', e.target.value)} className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs font-bold text-slate-700" placeholder="Ej. Cuota Banco X" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Fecha</label>
                      <input type="date" value={item.date} onChange={(e) => updateBankItem(item.id, 'date', e.target.value)} className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs font-bold text-slate-700" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Monto</label>
                      <input type="number" value={item.amount || ''} onChange={(e) => updateBankItem(item.id, 'amount', parseFloat(e.target.value)||0)} className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs font-bold text-slate-700" placeholder="$0" />
                    </div>
                  </div>
                </div>
              ))}
              {expenses.bankTransactions?.length === 0 && <p className="text-center text-xs text-slate-400 py-4">No hay registros bancarios.</p>}
            </div>
            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
              <span className="font-bold text-slate-500 text-sm">Total Bancos:</span>
              <span className="font-black text-emerald-600 text-lg">${totalBanks.toLocaleString()}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* --- MODAL DE PROVEEDORES --- */}
      {activeModal === 'PROVIDERS' && (
        <Modal title="Gestionar Proveedores" onClose={() => setActiveModal('NONE')}>
          
          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
             <button 
               onClick={() => setProviderTab('OCCASIONAL')}
               className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${providerTab === 'OCCASIONAL' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
             >
               <ShoppingBagIcon className="h-4 w-4" /> Compras Menores
             </button>
             <button 
               onClick={() => setProviderTab('FORMAL')}
               className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${providerTab === 'FORMAL' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
             >
               <BuildingStoreIcon className="h-4 w-4" /> Facturas / Abonos
             </button>
          </div>

          <div className="space-y-4">
            
            {/* Contenido Pestaña OCASIONAL */}
            {providerTab === 'OCCASIONAL' && (
              <>
                <button onClick={addOccasional} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2">
                  <PlusIcon className="h-4 w-4" /> Agregar Compra Ambulante
                </button>
                <div className="space-y-3">
                  {(expenses.providersOccasional||[]).map((item) => (
                    <div key={item.id} className="bg-orange-50/50 p-3 rounded-xl border border-orange-100 relative">
                       <button onClick={() => removeOccasional(item.id)} className="absolute top-2 right-2 text-orange-200 hover:text-red-500"><TrashIcon className="h-4 w-4" /></button>
                       <div className="grid grid-cols-2 gap-2">
                          <div className="col-span-2">
                             <input type="text" value={item.description} onChange={(e) => updateOccasional(item.id, 'description', e.target.value)} className="w-full bg-white border border-orange-100 rounded p-1.5 text-xs font-bold text-slate-700" placeholder="Descripción (Ej. Tintos, Aseo)" />
                          </div>
                          <div>
                             <input type="date" value={item.date} onChange={(e) => updateOccasional(item.id, 'date', e.target.value)} className="w-full bg-white border border-orange-100 rounded p-1.5 text-xs font-bold text-slate-500" />
                          </div>
                          <div>
                             <input type="number" value={item.amount || ''} onChange={(e) => updateOccasional(item.id, 'amount', parseFloat(e.target.value)||0)} className="w-full bg-white border border-orange-100 rounded p-1.5 text-xs font-bold text-orange-700" placeholder="$0" />
                          </div>
                       </div>
                    </div>
                  ))}
                  {expenses.providersOccasional?.length === 0 && <p className="text-center text-xs text-slate-400 py-4">No hay compras menores.</p>}
                </div>
              </>
            )}

            {/* Contenido Pestaña FORMAL */}
            {providerTab === 'FORMAL' && (
              <>
                <button onClick={addFormal} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2">
                  <PlusIcon className="h-4 w-4" /> Agregar Factura / Abono
                </button>
                <div className="space-y-3">
                  {(expenses.providersFormal||[]).map((item) => (
                    <div key={item.id} className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 relative">
                       <button onClick={() => removeFormal(item.id)} className="absolute top-2 right-2 text-blue-200 hover:text-red-500"><TrashIcon className="h-4 w-4" /></button>
                       <div className="grid grid-cols-2 gap-2">
                          <div className="col-span-2">
                             <input type="text" value={item.company} onChange={(e) => updateFormal(item.id, 'company', e.target.value)} className="w-full bg-white border border-blue-100 rounded p-1.5 text-xs font-bold text-slate-700" placeholder="Nombre Empresa / Proveedor" />
                          </div>
                          <div>
                             <input type="text" value={item.invoiceNumber} onChange={(e) => updateFormal(item.id, 'invoiceNumber', e.target.value)} className="w-full bg-white border border-blue-100 rounded p-1.5 text-xs font-bold text-slate-500" placeholder="# Factura" />
                          </div>
                          <div>
                             <input type="date" value={item.date} onChange={(e) => updateFormal(item.id, 'date', e.target.value)} className="w-full bg-white border border-blue-100 rounded p-1.5 text-xs font-bold text-slate-500" />
                          </div>
                          <div className="col-span-2">
                             <input type="number" value={item.amount || ''} onChange={(e) => updateFormal(item.id, 'amount', parseFloat(e.target.value)||0)} className="w-full bg-white border border-blue-100 rounded p-1.5 text-xs font-bold text-blue-700" placeholder="Monto Abono ($)" />
                          </div>
                       </div>
                    </div>
                  ))}
                  {expenses.providersFormal?.length === 0 && <p className="text-center text-xs text-slate-400 py-4">No hay facturas registradas.</p>}
                </div>
              </>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
              <span className="font-bold text-slate-500 text-sm">Total {providerTab === 'OCCASIONAL' ? 'Menores' : 'Facturas'}:</span>
              <span className="font-black text-slate-800 text-lg">${(providerTab === 'OCCASIONAL' ? totalProvOccasional : totalProvFormal).toLocaleString()}</span>
            </div>

          </div>
        </Modal>
      )}

    </div>
  );
};
