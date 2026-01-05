// types.ts

export enum TransactionType {
  CASH_SALE = 'Venta Efectivo',
  NEQUI_SALE = 'Venta Nequi',
  RETURN = 'Devolución',
  DAILY_EXPENSE = 'Gasto Diario',
  DAILY_PURCHASE = 'Compra Mercancía (Diaria)' // NUEVO: Afecta caja, es inversión
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
}

export interface DayData {
  day: number;
  transactions: Transaction[];
  hasData: boolean;
  initialCash?: number;
}

// Estructura para NÓMINA
export interface Employee {
  id: string;
  name: string;
  paymentQ1: number;
  paymentQ2: number;
}

// Estructura para SERVICIOS
export interface ServiceItem {
  id: string;
  name: string;
  amount: number;
}

// NUEVO: Estructura para BANCOS (Cuotas)
export interface BankItem {
  id: string;
  date: string; // Ej: "15" o fecha completa
  description: string;
  amount: number;
}

// NUEVO: Estructura para FACTURAS PROVEEDORES (Formales)
export interface SupplierInvoice {
  id: string;
  date: string;
  description: string;
  amount: number;
}

export interface MonthlyFixedExpenses {
  utilities: ServiceItem[];
  payroll: Employee[];
  bankLoans: BankItem[];        // CAMBIO: Ahora es lista
  suppliers: SupplierInvoice[]; // CAMBIO: Ahora son facturas formales
  rent: number;
  others: number;
}

export interface AppState {
  monthName: string; // NUEVO: Dinámico
  year: number;      // NUEVO: Dinámico
  currentMonth: number; // Mantenemos para lógica interna de JS si es necesario
  days: Record<number, DayData>;
  fixedExpenses: MonthlyFixedExpenses;
  defaultInitialCash: number;
}

export const INITIAL_FIXED_EXPENSES: MonthlyFixedExpenses = {
  utilities: [],
  payroll: [],
  bankLoans: [],
  suppliers: [],
  rent: 0,
  others: 0
};
