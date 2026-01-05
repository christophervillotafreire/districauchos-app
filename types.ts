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

// NUEVA INTERFAZ: Para Inversión
export interface Suppliers {
  id: string;
  name: string;
  amount: number;
}

// NUEVA INTERFAZ: Para Bancos
export interface BankLoans {
  id: string;
  name: string;
  amount: number;
}

export interface MonthlyFixedExpenses {
  utilities: ServiceItem[]; // CAMBIO: Ahora es una lista
  payroll: Employee[];
  bankLoans: BankLoans[] ;
  suppliers: Suppliers[];
  rent: number;
  others: number;
}

export interface AppState {
  currentMonth: number;
  currentYear: number;
  days: Record<number, DayData>;
  fixedExpenses: MonthlyFixedExpenses;
  defaultInitialCash: number;
}

export const INITIAL_FIXED_EXPENSES: MonthlyFixedExpenses = {
  utilities: [], // Inicializa como array vacío
  payroll: [],
  bankLoans: [],
  suppliers: [],
  rent: 0,
  others: 0
};
