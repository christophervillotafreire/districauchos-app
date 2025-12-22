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
}

export interface MonthlyFixedExpenses {
  utilities: number;
  payroll: number;
  bankLoans: number;
  suppliers: number;
  rent: number;
  others: number;
}

export interface AppState {
  currentMonth: number;
  currentYear: number;
  days: Record<number, DayData>; // Map of day number to data
  fixedExpenses: MonthlyFixedExpenses;
}

export const INITIAL_FIXED_EXPENSES: MonthlyFixedExpenses = {
  utilities: 0,
  payroll: 0,
  bankLoans: 0,
  suppliers: 0,
  rent: 0,
  others: 0
};