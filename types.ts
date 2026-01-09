// types.ts

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
}

export interface DayData {
  day: number; // 1-31
  transactions: Transaction[];
  hasData: boolean;
  initialCash?: number; // Base de caja del día
}

// Interfaz para Empleados (Nómina)
export interface Employee {
  id: string;
  name: string;
  paymentQ1: number;
  paymentQ2: number;
}

// NUEVA INTERFAZ: Para Servicios Públicos
export interface ServiceItem {
  id: string;
  name: string;
  amount: number;
}

// NUEVO: Interfaz para items simples (Bancos y Prov. Ocasionales)
export interface SimpleExpenseItem {
  id: string;
  date: string;       // Guardaremos fecha YYYY-MM-DD
  description: string;
  amount: number;
}

// NUEVO: Interfaz para Proveedores Formales
export interface ProviderFormalItem {
  id: string;
  date: string;
  company: string;
  invoiceNumber: string;
  amount: number;
}

export interface MonthlyFixedExpenses {
  utilities: ServiceItem[];
  payroll: Employee[];
  
  // MODIFICADO: Bancos ahora es una lista detallada
  bankTransactions: SimpleExpenseItem[]; 
  
  // MODIFICADO: Proveedores separado en dos listas
  providersOccasional: SimpleExpenseItem[];
  providersFormal: ProviderFormalItem[];

  rent: number;
  others: number;
  
  // Mantenemos estos para compatibilidad temporal si es necesario, pero los dejaremos de usar visualmente
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
  
  // Nuevas listas vacías
  bankTransactions: [],
  providersOccasional: [],
  providersFormal: [],

  rent: 0,
  others: 0,
  
  // Valores legacy en 0
  bankLoans: 0,
  suppliers: 0
};
