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

// NUEVA INTERFAZ: Estructura para cada empleado
export interface Employee {
  id: string;
  name: string;
  paymentQ1: number; // Pago Quincena 1
  paymentQ2: number; // Pago Quincena 2
}

export interface MonthlyFixedExpenses {
  utilities: number;
  payroll: Employee[]; // CAMBIO: Ahora es una lista de empleados, no un número
  bankLoans: number;
  suppliers: number;
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
  utilities: 0,
  payroll: [], // CAMBIO: Inicializa como array vacío
  bankLoans: 0,
  suppliers: 0,
  rent: 0,
  others: 0
};
