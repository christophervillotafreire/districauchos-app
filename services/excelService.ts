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

  // --- 1. Generar Hojas Diarias (Sin Cambios) ---
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
      ["Descripción", "Tipo", "Efectivo (+)", "Transferencia (+)", "Egresos (-)"]
    ];

    let dayCash = 0;
    let dayNequi = 0;
    let dayReturns = 0;
    let dayExpense = 0;

    if (dayData && dayData.transactions) {
      dayData.transactions.forEach(t => {
        const amt = Number(t.amount) || 0;
        let cashIn = 0;
        let transferIn = 0;
        let egreso = 0;

        switch (t.type) {
          case TransactionType.CASH_SALE: cashIn = amt; dayCash += amt; break;
          case TransactionType.NEQUI_SALE: transferIn = amt; dayNequi += amt; break;
          case TransactionType.RETURN: egreso = amt; dayReturns += amt; break;
          case TransactionType.DAILY_EXPENSE: egreso = amt; dayExpense += amt; break;
        }

        wsData.push([t.description || "Varios", t.type, cashIn || "", transferIn || "", egreso || ""]);
      });
      totalBaseInMonth += dayBase;
    }

    wsData.push([]);
    wsData.push(["TOTAL VENTAS EFECTIVO", "", dayCash]);
    wsData.push(["TOTAL VENTAS NEQUI", "", "", dayNequi]);
    wsData.push(["TOTAL DEVOLUCIONES", "", "", "", dayReturns]);
    wsData.push(["TOTAL GASTOS CAJA", "", "", "", dayExpense]);
    wsData.push([]);
    wsData.push(["EFECTIVO EN CAJA (DINERO FÍSICO)", "", (dayBase + dayCash - dayReturns - dayExpense)]);
    wsData.push(["UTILIDAD DEL DÍA (TOTAL)", "", (dayCash + dayNequi - dayReturns - dayExpense)]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    totalSalesCash += dayCash;
    totalSalesNequi += dayNequi;
    totalReturns += dayReturns;
    totalDailyExpenses += dayExpense;

    XLSX.utils.book_append_sheet(wb, ws, `Día ${i}`);
  }

  // --- 2. Hoja de Resumen Mensual ---
  const { fixedExpenses } = state;

  // A. CALCULO NÓMINA (Array)
  let totalPayroll = 0;
  const payrollRows: (string | number)[][] = [];
  if (Array.isArray(fixedExpenses.payroll)) {
    fixedExpenses.payroll.forEach(emp => {
      const val = (Number(emp.paymentQ1)||0) + (Number(emp.paymentQ2)||0);
      totalPayroll += val;
      if (val > 0) payrollRows.push([`      ↳ Empleado: ${emp.name}`, val, "Pago de Nómina"]);
    });
  } else {
    totalPayroll = Number(fixedExpenses.payroll) || 0;
  }

  // B. CALCULO SERVICIOS (Array) - NUEVO
  let totalUtilities = 0;
  const utilityRows: (string | number)[][] = [];
  if (Array.isArray(fixedExpenses.utilities)) {
    fixedExpenses.utilities.forEach(item => {
      const val = Number(item.amount) || 0;
      totalUtilities += val;
      if (val > 0) utilityRows.push([`      ↳ Servicio: ${item.name}`, val, "Servicios Públicos"]);
    });
  } else {
    totalUtilities = Number(fixedExpenses.utilities) || 0;
  }

  const fE = {
    utilities: totalUtilities, // Total Calculado
    payroll: totalPayroll,     // Total Calculado
    bankLoans: Number(fixedExpenses.bankLoans) || 0,
    suppliers: Number(fixedExpenses.suppliers) || 0,
    rent: Number(fixedExpenses.rent) || 0,
    others: Number(fixedExpenses.others) || 0,
  };

  const totalFixedExpenses = fE.utilities + fE.payroll + fE.bankLoans + fE.suppliers + fE.rent + fE.others;
  const totalOperatingIncome = (totalSalesCash + totalSalesNequi);
  const netProfit = totalOperatingIncome - totalReturns - totalDailyExpenses - totalFixedExpenses;
  const cashProfit = totalSalesCash - totalReturns - totalDailyExpenses;

  // CONSTRUCCIÓN TABLA RESUMEN
  const summaryData: (string | number)[][] = [
    ["RESUMEN MENSUAL - DISTRICAUCHOS Y EMPAQUES DEL SUR"],
    [`Periodo: ${monthName} ${year}`],
    [],
    ["CONCEPTO", "VALOR (COP)", "DETALLE"],
    ["1. INGRESOS POR VENTAS"],
    ["   (+) Ventas en Efectivo", totalSalesCash, "Recaudado en local"],
    ["   (+) Ventas por Transferencia", totalSalesNequi, "Consignaciones Nequi/Otros"],
    ["   TOTAL VENTAS BRUTAS", totalOperatingIncome, ""],
    [],
    ["2. EGRESOS OPERATIVOS (CAJA)"],
    ["   (-) Devoluciones / Garantías", totalReturns, ""],
    ["   (-) Gastos Diarios Menores", totalDailyExpenses, ""],
    [],
    ["   (=) GANANCIA EN EFECTIVO", cashProfit, "Flujo de dinero físico del mes"],
    [],
    ["3. GASTOS FIJOS DEL MES"],
    // Servicios
    ["   --- SERVICIOS PÚBLICOS ---", fE.utilities],
  ];
  utilityRows.forEach(r => summaryData.push(r));

  // Nómina
  summaryData.push(["   --- NÓMINA ---", fE.payroll]);
  payrollRows.forEach(r => summaryData.push(r));

  // Resto de gastos
  summaryData.push(
    ["   Arriendo", fE.rent],
    ["   Obligaciones Bancarias", fE.bankLoans],
    ["   Proveedores", fE.suppliers],
    ["   Otros Gastos", fE.others],
    [],
    ["   TOTAL GASTOS FIJOS", totalFixedExpenses],
    [],
    ["---------------------------", "-------------"],
    ["UTILIDAD NETA FINAL", netProfit, "Resultado neto del ejercicio"],
  );

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "RESUMEN FINAL");
  XLSX.writeFile(wb, `Contabilidad_Districauchos_${monthName}_${year}.xlsx`);
};
