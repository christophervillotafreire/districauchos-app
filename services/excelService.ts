import * as XLSX from 'xlsx';
import { AppState, TransactionType } from "../types";

export const generateMonthlyReport = (state: AppState) => {
  const wb = XLSX.utils.book_new();
  // HEADER DINÁMICO
  const periodTitle = `${state.monthName} ${state.year}`.toUpperCase();
  
  let totalSalesCash = 0;
  let totalSalesNequi = 0;
  let totalReturns = 0;
  let totalOpExpenses = 0;     // Gastos operativos diarios
  let totalDailyPurchases = 0; // Inversión diaria en mercancía

  // --- 1. HOJAS DIARIAS ---
  // Iteramos fijo hasta 31 días por consistencia visual
  for (let i = 1; i <= 31; i++) {
    const dayData = state.days[i];
    const dayBase = dayData?.initialCash ?? state.defaultInitialCash;

    const wsData: (string | number)[][] = [
      [`DISTRICAUCHOS - REPORTE DIARIO`],
      [`FECHA: Día ${i} de ${periodTitle}`], // FECHA DINÁMICA
      [],
      [`BASE INICIAL:`, dayBase],
      [],
      ["Descripción", "Tipo", "Ingreso (+)", "Egreso (-)", "Inversión (Inv)"]
    ];

    let dCash = 0, dNequi = 0, dExp = 0, dInv = 0, dRet = 0;

    if (dayData && dayData.transactions) {
      dayData.transactions.forEach(t => {
        const amt = Number(t.amount) || 0;
        let cIn = 0, eg = 0, inv = 0;

        switch (t.type) {
          case TransactionType.CASH_SALE: cIn = amt; dCash += amt; break;
          case TransactionType.NEQUI_SALE: dNequi += amt; break; // No suma a columna efectivo visual
          case TransactionType.RETURN: eg = amt; dRet += amt; break;
          case TransactionType.DAILY_EXPENSE: eg = amt; dExp += amt; break;
          case TransactionType.DAILY_PURCHASE: inv = amt; dInv += amt; break; // Nueva columna
        }
        
        // Columna Transferencia visualmente se puede poner en Ingreso o nota
        const labelIngreso = (t.type === TransactionType.CASH_SALE) ? amt : (t.type === TransactionType.NEQUI_SALE ? `(Nequi: ${amt})` : "");
        
        wsData.push([t.description || "Varios", t.type, labelIngreso, eg || "", inv || ""]);
      });
    }

    wsData.push([]);
    wsData.push(["TOTAL VENTAS EFECTIVO", dCash]);
    wsData.push(["TOTAL VENTAS NEQUI", dNequi]);
    wsData.push(["GASTOS OPERATIVOS", dExp]);
    wsData.push(["INVERSIÓN MERCANCÍA", dInv]);
    
    // Cuadre de caja físico: Base + VentasEfec - Devoluciones - Gastos - ComprasFísicas
    const physicalCash = dayBase + dCash - dRet - dExp - dInv;
    
    wsData.push([]);
    wsData.push(["CAJA FINAL FÍSICA", physicalCash]);

    if (dayData) {
        totalSalesCash += dCash;
        totalSalesNequi += dNequi;
        totalReturns += dRet;
        totalOpExpenses += dExp;
        totalDailyPurchases += dInv;
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, `Día ${i}`);
    }
  }

  // --- 2. RESUMEN FINAL ---
  const { fixedExpenses } = state;

  // Calculos de listas
  const totalPayroll = (fixedExpenses.payroll||[]).reduce((a,b) => a + (Number(b.paymentQ1)||0) + (Number(b.paymentQ2)||0), 0);
  const totalUtilities = (fixedExpenses.utilities||[]).reduce((a,b) => a + (Number(b.amount)||0), 0);
  const totalBanks = (fixedExpenses.bankLoans||[]).reduce((a,b) => a + (Number(b.amount)||0), 0);
  const totalSupplierInvoices = (fixedExpenses.suppliers||[]).reduce((a,b) => a + (Number(b.amount)||0), 0);
  const rent = Number(fixedExpenses.rent)||0;
  const others = Number(fixedExpenses.others)||0;

  // AGRUPACIONES
  const totalSales = totalSalesCash + totalSalesNequi;
  const totalFixedOpExpenses = totalPayroll + totalUtilities + rent + others;
  const totalAllOpExpenses = totalFixedOpExpenses + totalOpExpenses + totalReturns; // + Devoluciones como salida op
  
  // INVERSIÓN TOTAL
  const totalInvestment = totalDailyPurchases + totalSupplierInvoices;

  // FLUJO NETO
  const netFlow = totalSales - totalAllOpExpenses - totalInvestment - totalBanks;

  const summaryData: (string | number)[][] = [
    ["RESUMEN FINANCIERO MENSUAL - DISTRICAUCHOS"],
    [`PERIODO: ${periodTitle}`],
    [],
    ["CONCEPTO", "VALOR", "NOTAS"],
    ["(+) TOTAL VENTAS", totalSales, `Efectivo: ${totalSalesCash} / Nequi: ${totalSalesNequi}`],
    [],
    ["(-) GASTOS OPERATIVOS TOTALES", totalAllOpExpenses],
    ["    - Devoluciones", totalReturns],
    ["    - Gastos Menores (Caja)", totalOpExpenses],
    ["    - Nómina", totalPayroll],
    ["    - Servicios", totalUtilities],
    ["    - Arriendo", rent],
    ["    - Otros", others],
    [],
    ["(-) INVERSIÓN EN MERCANCÍA", totalInvestment],
    ["    - Compras Diarias (Efectivo)", totalDailyPurchases],
    ["    - Facturas Proveedores", totalSupplierInvoices],
    [],
    ["(-) PAGOS BANCARIOS", totalBanks],
    [],
    ["==================================", "============"],
    ["(=) FLUJO NETO FINAL (DINERO REAL)", netFlow],
    ["==================================", "============"],
    [],
    ["DETALLE BANCARIO:"],
    ...((fixedExpenses.bankLoans||[]).map(b => [b.date, b.description, b.amount])),
    [],
    ["DETALLE FACTURAS PROVEEDORES:"],
    ...((fixedExpenses.suppliers||[]).map(s => [s.date, s.description, s.amount]))
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "RESUMEN FINAL");
  XLSX.writeFile(wb, `Reporte_${state.monthName}_${state.year}.xlsx`);
};
