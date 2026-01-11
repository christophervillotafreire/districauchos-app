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
      // NUEVA COLUMNA AL FINAL: "Responsable"
      ["Descripción", "Tipo", "Efectivo (+)", "Transferencia (+)", "Egresos (-)", "Responsable"]
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

        // AQUÍ AGREGAMOS t.createdBy || "Sistema"
        wsData.push([
          t.description || "Varios", 
          t.type, 
          cashIn || "", 
          transferIn || "", 
          egreso || "",
          t.createdBy || "Sistema" // <--- DATO DE AUDITORÍA
        ]);
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
    
    // Ajustar ancho de columnas para que se vea bien
    ws['!cols'] = [
      { wch: 30 }, // Descripción
      { wch: 20 }, // Tipo
      { wch: 15 }, // Efec
      { wch: 15 }, // Transf
      { wch: 15 }, // Egresos
      { wch: 20 }  // Responsable
    ];

    totalSalesCash += dayCash;
    totalSalesNequi += dayNequi;
    totalReturns += dayReturns;
    totalDailyExpenses += dayExpense;

    XLSX.utils.book_append_sheet(wb, ws, `Día ${i}`);
  }

  // --- 2. Hoja de Resumen Mensual ---
  const { fixedExpenses } = state;

  // A. CALCULO NÓMINA
  let totalPayroll = 0;
  const payrollRows: (string | number)[][] = [];
  if (Array.isArray(fixedExpenses.payroll)) {
    fixedExpenses.payroll.forEach(emp => {
      const val = (Number(emp.paymentQ1)||0) + (Number(emp.paymentQ2)||0);
      totalPayroll += val;
      if (val > 0) payrollRows.push([`      ↳ Empleado: ${emp.name}`, val, "Pago de Nómina", "Admin"]);
    });
  }

  // B. CALCULO SERVICIOS (Con Responsable)
  let totalUtilities = 0;
  const utilityRows: (string | number)[][] = [];
  if (Array.isArray(fixedExpenses.utilities)) {
    fixedExpenses.utilities.forEach(item => {
      const val = Number(item.amount) || 0;
      totalUtilities += val;
      if (val > 0) utilityRows.push([
        `      ↳ Servicio: ${item.name}`, 
        val, 
        "Servicios Públicos",
        item.createdBy || "Sistema" // <--- AUDITORÍA
      ]);
    });
  }

  // C. CALCULO BANCOS (Con Responsable)
  let totalBanks = 0;
  const bankRows: (string | number)[][] = [];
  if (Array.isArray(fixedExpenses.bankTransactions)) {
    fixedExpenses.bankTransactions.forEach(item => {
      const val = Number(item.amount) || 0;
      totalBanks += val;
      bankRows.push([
        `      ↳ [${item.date}] ${item.description}`, 
        val, 
        "Obligación Bancaria",
        item.createdBy || "Sistema" // <--- AUDITORÍA
      ]);
    });
  }

  // D. CALCULO PROVEEDORES (Con Responsable)
  let totalProviders = 0;
  const providerRows: (string | number)[][] = [];

  // D1. Ocasionales
  if (Array.isArray(fixedExpenses.providersOccasional)) {
    fixedExpenses.providersOccasional.forEach(item => {
      const val = Number(item.amount) || 0;
      totalProviders += val;
      providerRows.push([
        `      ↳ [${item.date}] Ambulante: ${item.description}`, 
        val, 
        "Proveedor Ocasional",
        item.createdBy || "Sistema" // <--- AUDITORÍA
      ]);
    });
  }

  // D2. Formales
  if (Array.isArray(fixedExpenses.providersFormal)) {
    fixedExpenses.providersFormal.forEach(item => {
      const val = Number(item.amount) || 0;
      totalProviders += val;
      providerRows.push([
        `      ↳ [${item.date}] ${item.company} (Fact: ${item.invoiceNumber})`, 
        val, 
        "Proveedor Formal",
        item.createdBy || "Sistema" // <--- AUDITORÍA
      ]);
    });
  }


  // E. TOTALES FINALES
  const rentVal = Number(fixedExpenses.rent) || 0;
  const othersVal = Number(fixedExpenses.others) || 0;

  const totalFixedExpenses = totalUtilities + totalPayroll + totalBanks + totalProviders + rentVal + othersVal;
  
  const totalOperatingIncome = (totalSalesCash + totalSalesNequi);
  const netProfit = totalOperatingIncome - totalReturns - totalDailyExpenses - totalFixedExpenses;
  const cashProfit = totalSalesCash - totalReturns - totalDailyExpenses;

  // CONSTRUCCIÓN TABLA RESUMEN (Ahora con 4 columnas)
  const summaryData: (string | number)[][] = [
    ["RESUMEN MENSUAL - DISTRICAUCHOS Y EMPAQUES DEL SUR"],
    [`Periodo: ${monthName} ${year}`],
    [],
    ["CONCEPTO", "VALOR (COP)", "DETALLE", "RESPONSABLE"], // <--- Header Modificado
    ["1. INGRESOS POR VENTAS"],
    ["   (+) Ventas en Efectivo", totalSalesCash, "Recaudado en local", "Varios"],
    ["   (+) Ventas por Transferencia", totalSalesNequi, "Consignaciones Nequi/Otros", "Varios"],
    ["   TOTAL VENTAS BRUTAS", totalOperatingIncome, "", ""],
    [],
    ["2. EGRESOS OPERATIVOS (CAJA)"],
    ["   (-) Devoluciones / Garantías", totalReturns, "", "Varios"],
    ["   (-) Gastos Diarios Menores", totalDailyExpenses, "", "Varios"],
    [],
    ["   (=) GANANCIA EN EFECTIVO", cashProfit, "Flujo de dinero físico del mes", ""],
    [],
    ["3. GASTOS FIJOS DEL MES"],
  ];
  
  // Servicios
  summaryData.push(["   --- SERVICIOS PÚBLICOS ---", totalUtilities]);
  utilityRows.forEach(r => summaryData.push(r));

  // Nómina
  summaryData.push(["   --- NÓMINA ---", totalPayroll]);
  payrollRows.forEach(r => summaryData.push(r));

  // Bancos
  summaryData.push(["   --- OBLIGACIONES BANCARIAS ---", totalBanks]);
  if(bankRows.length > 0) {
      bankRows.forEach(r => summaryData.push(r));
  } else {
      summaryData.push(["      (Sin registros)", 0]);
  }

  // Proveedores
  summaryData.push(["   --- PROVEEDORES (Mercancía) ---", totalProviders]);
  if(providerRows.length > 0) {
      providerRows.forEach(r => summaryData.push(r));
  } else {
      summaryData.push(["      (Sin registros)", 0]);
  }

  // Otros Gastos
  summaryData.push(
    ["   Arriendo Local", rentVal, "Gasto Fijo", "Admin"],
    ["   Otros Gastos Varios", othersVal, "Gasto Fijo", "Admin"],
    [],
    ["   TOTAL GASTOS FIJOS", totalFixedExpenses],
    [],
    ["---------------------------", "-------------"],
    ["UTILIDAD NETA FINAL", netProfit, "Resultado neto del ejercicio"],
  );

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  
  // Ajuste final de anchos para el Resumen
  wsSummary['!cols'] = [
    { wch: 40 }, // Concepto
    { wch: 15 }, // Valor
    { wch: 25 }, // Detalle
    { wch: 20 }  // Responsable
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, "RESUMEN FINAL");
  XLSX.writeFile(wb, `Contabilidad_Districauchos_${monthName}_${year}.xlsx`);
};
