import React from 'react';
import { MonthlyFixedExpenses, Employee } from '../types';
import { TrashIcon, ExclamationTriangleIcon, CurrencyDollarIcon, UserGroupIcon, PlusIcon } from '@heroicons/react/24/outline';

interface MonthlySummaryProps {
  expenses: MonthlyFixedExpenses;
  defaultBase: number;
  onChange: (expenses: MonthlyFixedExpenses) => void;
  onBaseChange: (base: number) => void;
  dayCount: number;
  onReset: () => void;
}

export const MonthlySummary: React.FC<MonthlySummaryProps> = ({ expenses, defaultBase, onChange, onBaseChange, dayCount, onReset }) => {
  
  // Actualizar campos simples (Arriendo, Servicios, etc.)
  const updateSimpleField = (field: keyof MonthlyFixedExpenses, value: string) => {
    if (field === 'payroll') return; // La nómina se maneja aparte
    onChange({ ...expenses, [field]: parseFloat(value) || 0 });
  };

  // --- LÓGICA DE EMPLEADOS ---

  const addEmployee = () => {
    const newEmployee: Employee = {
      id: Date.now().toString(), // ID temporal simple
      name: '',
      paymentQ1: 0,
      paymentQ2: 0
    };
    
    // Aseguramos que payroll sea un array (por si viene null o undefined de versiones viejas)
    const currentPayroll = Array.isArray(expenses.payroll) ? expenses.payroll : [];
    
    onChange({
      ...expenses,
      payroll: [...currentPayroll, newEmployee]
    });
  };

  const updateEmployee = (id: string, field: keyof Employee, value: string | number) => {
    const currentPayroll = Array.isArray(expenses.payroll) ? expenses.payroll : [];
    
    const updatedPayroll = currentPayroll.map(emp => {
      if (emp.id === id) {
        return { ...emp, [field]: value };
      }
      return emp;
    });

    onChange({ ...expenses, payroll: updatedPayroll });
  };

  const removeEmployee = (id: string) => {
    if (window.confirm('¿Eliminar este empleado?')) {
      const currentPayroll = Array.isArray(expenses.payroll) ? expenses.payroll : [];
      onChange({
        ...expenses,
        payroll: currentPayroll.filter(emp => emp.id !== id)
      });
    }
  };

  const calculateTotalPayroll = () => {
    if (!Array.isArray(expenses.payroll)) return 0;
    return expenses.payroll.reduce((total, emp) => total + (Number(emp.paymentQ1) || 0) + (Number(emp.paymentQ2) || 0), 0);
  };

  const confirmReset = () => {
    if (window.confirm("¿Borrar TODOS los datos del mes? Esta acción no se puede deshacer.")) {
      onReset();
    }
  };

  // Campos simples excluyendo 'payroll'
  const simpleFields = [
    { label: 'Servicios', key: 'utilities' },
    { label: 'Arriendo', key: 'rent' },
    { label: 'Bancos', key: 'bankLoans' },
    { label: 'Proveedores', key: 'suppliers' },
    { label: 'Otros', key: 'others' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-blue-600 p-4 text-white">
          <h3 className="font-black flex items-center gap-2">
            <CurrencyDollarIcon className="h-5 w-5" />
            CONFIGURACIÓN DE CAJA
          </h3>
          <p className="text-[10px] opacity-80 font-bold uppercase">Ajustes Generales del Negocio</p>
        </div>
        
        <div className="p-4 space-y-6">
          {/* BASE DE CAJA */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-tighter">Base de Caja Diaria Predeterminada:</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 font-bold text-slate-400">$</span>
              <input
                type="number"
                value={defaultBase || ''}
                onChange={(e) => onBaseChange(parseFloat(e.target.value) || 0)}
                className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-blue-600 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 100000"
              />
            </div>
            <p className="text-[9px] text-slate-400 mt-2 italic">* Este valor se usará automáticamente en cada día nuevo.</p>
          </div>

          <div className="border-t border-slate-100 my-4"></div>

          {/* SECCIÓN DE NÓMINA (EMPLEADOS) */}
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-xs font-black text-indigo-900 uppercase flex items-center gap-2">
                  <UserGroupIcon className="h-4 w-4" />
                  Nómina / Empleados
                </h4>
                <p className="text-[10px] text-indigo-600 font-bold mt-1">
                  Total Nómina: ${calculateTotalPayroll().toLocaleString()}
                </p>
              </div>
              <button 
                onClick={addEmployee}
                className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {Array.isArray(expenses.payroll) && expenses.payroll.map((emp) => (
                <div key={emp.id} className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm relative group">
                  <button 
                    onClick={() => removeEmployee(emp.id)}
                    className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </button>
                  
                  <div className="mb-2">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Nombre Empleado</label>
                    <input 
                      type="text"
                      value={emp.name}
                      onChange={(e) => updateEmployee(emp.id, 'name', e.target.value)}
                      placeholder="Ej: Juan Pérez"
                      className="w-full text-xs font-bold border-b border-slate-200 py-1 focus:border-indigo-500 outline-none text-slate-700"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Quincena 1</label>
                      <div className="relative">
                        <span className="absolute left-0 top-1 text-slate-300 text-xs">$</span>
                        <input 
                          type="number"
                          value={emp.paymentQ1 || ''}
                          onChange={(e) => updateEmployee(emp.id, 'paymentQ1', parseFloat(e.target.value) || 0)}
                          className="w-full pl-3 py-1 text-xs font-bold border-b border-slate-200 outline-none focus:border-indigo-500 text-slate-700"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Quincena 2</label>
                      <div className="relative">
                        <span className="absolute left-0 top-1 text-slate-300 text-xs">$</span>
                        <input 
                          type="number"
                          value={emp.paymentQ2 || ''}
                          onChange={(e) => updateEmployee(emp.id, 'paymentQ2', parseFloat(e.target.value) || 0)}
                          className="w-full pl-3 py-1 text-xs font-bold border-b border-slate-200 outline-none focus:border-indigo-500 text-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {(!expenses.payroll || expenses.payroll.length === 0) && (
                <p className="text-center text-[10px] text-indigo-400 py-2 italic">No hay empleados registrados</p>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 my-4"></div>

          {/* GASTOS FIJOS SIMPLES */}
          <div className="space-y-3">
            <p className="text-xs font-black text-slate-800 uppercase tracking-tighter">Otros Gastos Fijos:</p>
            <div className="grid grid-cols-2 gap-3">
              {simpleFields.map((item) => (
                <div key={item.key}>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">{item.label}</label>
                  <div className="relative">
                    <span className="absolute left-2 top-2 text-[10px] text-slate-300">$</span>
                    <input
                      type="number"
                      value={expenses[item.key as keyof MonthlyFixedExpenses] as number || ''}
                      onChange={(e) => updateSimpleField(item.key as keyof MonthlyFixedExpenses, e.target.value)}
                      className="w-full pl-5 pr-2 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold focus:bg-white outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-red-50 rounded-2xl border border-red-100 p-4">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-red-900">Mantenimiento</h4>
            <p className="text-[10px] text-red-700 mb-3 uppercase font-bold">Borrar historial de este mes</p>
            <button onClick={confirmReset} className="flex items-center gap-2 bg-white border border-red-200 text-red-600 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-red-600 hover:text-white transition-all">
              <TrashIcon className="h-4 w-4" />
              REINICIAR TODO EL MES
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
