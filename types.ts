// types.ts

// --- NUEVO: Interfaz para el Usuario de la Sesión (Login) ---
export interface AppUser {
  id: string;
  name: string;
  pin: string;
  role: 'admin' | 'employee';
}
// -----------------------------------------------------------

export enum TransactionType {
  CASH_SALE = 'Venta Efectivo',
  NEQUI_SALE = 'Venta Nequi',
  RETURN = 'Devolución',
  DAILY_EXPENSE = 'Gasto Diario'
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  createdBy?: string; // <--- NUEVO: Auditoría (Opcional para no romper datos viejos)
}

export interface DayData {
  day: number; // 1-31
  transactions: Transaction[];
  hasData: boolean;
  initialCash?: number; 
}

// Interfaz para Empleados (Nómina) - SE MANTIENE IGUAL PARA NO ROMPER PAGO DE NOMINA
export interface Employee {
  id: string;
  name: string;
  paymentQ1: number;
  paymentQ2: number;
}

// Para Servicios Públicos
export interface ServiceItem {
  id: string;
  name: string;
  amount: number;
  createdBy?: string; // <--- NUEVO: Auditoría
}

// Interfaz para items simples (Bancos y Prov. Ocasionales)
export interface SimpleExpenseItem {
  id: string;
  date: string;       
  description: string;
  amount: number;
  createdBy?: string; // <--- NUEVO: Auditoría
}

// Interfaz para Proveedores Formales
export interface ProviderFormalItem {
  id: string;
  date: string;
  company: string;
  invoiceNumber: string;
  amount: number;
  createdBy?: string; // <--- NUEVO: Auditoría
}

export interface MonthlyFixedExpenses {
  utilities: ServiceItem[];
  payroll: Employee[];
  
  // Bancos ahora es una lista detallada
  bankTransactions: SimpleExpenseItem[]; 
  
  // Proveedores separado en dos listas
  providersOccasional: SimpleExpenseItem[];
  providersFormal: ProviderFormalItem[];

  rent: number;
  others: number;
  
  // Legacy
  bankLoans?: number; 
  suppliers?: number; 
}

export interface AppState {
  currentMonth: number;
  currentYear: number;
  days: Record<number, DayData>;
  fixedExpenses: MonthlyFixedExpenses;
  defaultInitialCash: number;
}

export const INITIAL_FIXED_EXPENSES: MonthlyFixedExpenses = {
  utilities: [],
  payroll: [],
  
  bankTransactions: [],
  providersOccasional: [],
  providersFormal: [],

  rent: 0,
  others: 0,
  
  bankLoans: 0,
  suppliers: 0
};
