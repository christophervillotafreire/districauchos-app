import * as XLSX from 'xlsx';
import { AppState, TransactionType } from "../types";

export const generateMonthlyReport = (state: AppState) => {
  const wb = XLSX.utils.book_new();
  const monthName = new Date(state.currentYear, state.currentMonth).toLocaleString('es-CO', { month: 'long' });
  const year = state.currentYear;

  let totalSalesCash = 0;
  let totalSalesNequi = 0;
  let totalReturns = 0;
  let totalDailyExpenses = 0;
  let totalBaseInMonth = 0;

  // --- 1. Generar Hojas Diarias ---
  const daysInMonth = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    const dayData = state.days[i];
    const dayBase = dayData?.initialCash ?? state.defaultInitialCash;
    
    const wsData: (string | number)[][] = [
      [`DISTRICAUCHOS Y EMPAQUES DEL SUR`],
      [`Fecha: ${i} de ${monthName} de ${year}`],
      [],
      [`BASE DE CAJA INICIAL:`, dayBase],
      [],
      ["Descripción", "Tipo", "Ingreso (+)", "Egreso (-)"]
    ];

    let dayCash = 0;
    let dayNequi = 0;
    let dayReturns = 0;
    let dayExpense = 0;

    if (dayData && dayData.transactions) {
      dayData.transactions.forEach(t => {
        const amt = Number(t.amount) || 0;
        let ingreso = 0;
        let egreso = 0;

        switch (t.type) {
          case TransactionType.CASH_SALE: ingreso = amt; dayCash += amt; break;
          case TransactionType.NEQUI_SALE: ingreso = amt; dayNequi += amt; break;
          case TransactionType.RETURN: egreso = amt; dayReturns += amt; break;
          case TransactionType.DAILY_EXPENSE: egreso = amt; dayExpense += amt; break;
        }

        wsData.push([t.description || "Varios", t.type, ingreso, egreso]);
      });
      totalBaseInMonth += dayBase;
    }

    wsData.push([]);
    wsData.push(["TOTAL VENTAS DÍA", "", (dayCash + dayNequi)]);
    wsData.push(["TOTAL DEVOLUCIONES", "", "", dayReturns]);
    wsData.push(["TOTAL GASTOS DÍA", "", "", dayExpense]);
    wsData.push(["DINERO EN CAJA (BASE + EFECTIVO - GASTOS)", "", "", dayBase + dayCash - dayReturns - dayExpense]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    totalSalesCash += dayCash;
    totalSalesNequi += dayNequi;
    totalReturns += dayReturns;
    totalDailyExpenses += dayExpense;

    XLSX.utils.book_append_sheet(wb, ws, `Día ${i}`);
  }

  // --- 2. Hoja de Resumen Mensual ---
  const { fixedExpenses } = state;
  const fE = {
    utilities: Number(fixedExpenses.utilities) || 0,
    payroll: Number(fixedExpenses.payroll) || 0,
    bankLoans: Number(fixedExpenses.bankLoans) || 0,
    suppliers: Number(fixedExpenses.suppliers) || 0,
    rent: Number(fixedExpenses.rent) || 0,
    others: Number(fixedExpenses.others) || 0,
  };

  const totalFixedExpenses = fE.utilities + fE.payroll + fE.bankLoans + fE.suppliers + fE.rent + fE.others;
  const totalOperatingIncome = (totalSalesCash + totalSalesNequi);
  const netProfit = totalOperatingIncome - totalReturns - totalDailyExpenses - totalFixedExpenses;

  const summaryData = [
    ["RESUMEN MENSUAL - DISTRICAUCHOS Y EMPAQUES DEL SUR"],
    [`Periodo: ${monthName} ${year}`],
    [],
    ["CONCEPTO", "VALOR (COP)", "NOTA"],
    ["1. INGRESOS"],
    ["   Ventas Efectivo", totalSalesCash, ""],
    ["   Ventas Nequi", totalSalesNequi, ""],
    ["   TOTAL INGRESOS BRUTOS", totalOperatingIncome, ""],
    [],
    ["2. EGRESOS OPERATIVOS"],
    ["   (-) Devoluciones", totalReturns, "Garantías y cambios"],
    ["   (-) Gastos Diarios", totalDailyExpenses, "Gastos de caja menor"],
    [],
    ["3. GASTOS FIJOS"],
    ["   Servicios", fE.utilities],
    ["   Nómina", fE.payroll],
    ["   Arriendo", fE.rent],
    ["   Bancos", fE.bankLoans],
    ["   Proveedores", fE.suppliers],
    ["   Otros", fE.others],
    ["   TOTAL GASTOS FIJOS", totalFixedExpenses],
    [],
    ["---------------------------", "-------------"],
    ["UTILIDAD NETA DEL MES", netProfit, "Ganancia real"],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "RESUMEN FINAL");
  XLSX.writeFile(wb, `Contabilidad_Districauchos_${monthName}_${year}.xlsx`);
};