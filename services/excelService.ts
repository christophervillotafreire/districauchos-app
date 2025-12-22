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

  // --- 1. Generar 31 Hojas Diarias ---
  for (let i = 1; i <= 31; i++) {
    const dayData = state.days[i];
    
    const wsData: (string | number)[][] = [
      [`DISTRICAUCHOS Y EMPAQUES DEL SUR`],
      [`Fecha: ${i} de ${monthName} de ${year}`],
      [],
      ["Descripción", "Tipo", "Ingreso (+)", "Egreso (-)"]
    ];

    let dayCash = 0;
    let dayNequi = 0;
    let dayReturns = 0;
    let dayExpense = 0;

    if (dayData && dayData.transactions && dayData.transactions.length > 0) {
      dayData.transactions.forEach(t => {
        const amt = Number(t.amount) || 0;
        let ingreso = 0;
        let egreso = 0;

        switch (t.type) {
          case TransactionType.CASH_SALE:
            ingreso = amt;
            dayCash += amt;
            break;
          case TransactionType.NEQUI_SALE:
            ingreso = amt;
            dayNequi += amt;
            break;
          case TransactionType.RETURN:
            egreso = amt;
            dayReturns += amt;
            break;
          case TransactionType.DAILY_EXPENSE:
            egreso = amt;
            dayExpense += amt;
            break;
        }

        wsData.push([
          t.description || "Sin descripción",
          t.type,
          ingreso > 0 ? ingreso : 0,
          egreso > 0 ? egreso : 0
        ]);
      });
    } else {
      wsData.push(["Sin movimientos registrados", "-", 0, 0]);
    }

    wsData.push([]);
    wsData.push(["TOTALES DÍA", "", (dayCash + dayNequi), (dayReturns + dayExpense)]);
    wsData.push(["SALDO NETO DÍA", "", "", (dayCash + dayNequi) - (dayReturns + dayExpense)]);

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
  const totalOperatingIncome = (totalSalesCash + totalSalesNequi) - totalReturns;
  const netIncome = totalOperatingIncome - totalDailyExpenses - totalFixedExpenses;

  const summaryData = [
    ["RESUMEN MENSUAL - DISTRICAUCHOS Y EMPAQUES DEL SUR"],
    [`Periodo: ${monthName} ${year}`],
    [],
    ["CONCEPTO", "VALOR (COP)", "DETALLES"],
    ["INGRESOS"],
    ["  Ventas Efectivo", totalSalesCash, "Total recolectado en billetes"],
    ["  Ventas Nequi", totalSalesNequi, "Total transferencias"],
    ["  (-) Devoluciones", totalReturns, "Mercancía devuelta"],
    ["TOTAL INGRESOS NETOS", totalOperatingIncome, ""],
    [],
    ["EGRESOS DIARIOS"],
    ["  Gastos de Caja", totalDailyExpenses, "Almuerzos, aseo, varios"],
    [],
    ["GASTOS FIJOS (CIERRE)"],
    ["  Servicios Públicos", fE.utilities, ""],
    ["  Nómina", fE.payroll, ""],
    ["  Arriendo", fE.rent, ""],
    ["  Préstamos/Bancos", fE.bankLoans, ""],
    ["  Proveedores", fE.suppliers, ""],
    ["  Otros", fE.others, ""],
    ["TOTAL GASTOS FIJOS", totalFixedExpenses, ""],
    [],
    ["---------------------------", "-------------", ""],
    ["UTILIDAD DEL MES", netIncome, "Ganancia real libre"],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{wch:30}, {wch:20}, {wch:40}];

  XLSX.utils.book_append_sheet(wb, wsSummary, "RESUMEN FINAL");

  XLSX.writeFile(wb, `Contabilidad_Districauchos_${monthName}_${year}.xlsx`);
};