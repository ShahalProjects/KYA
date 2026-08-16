/**
 * KYA - Financial Reports Excel Exporter
 * Generates formatted, stylized Excel (.xlsx) workbooks using ExcelJS.
 * Ensures strict cell-level formatting (no trailing/infinite row/column formats).
 */

(function (global) {
  'use strict';

  // ── Global Formatting Constants ─────────────────────────────────────
  const thinBorder = {
    style: 'thin',
    color: { argb: 'FFE2E8F0' }
  };

  const mediumBorder = {
    style: 'medium',
    color: { argb: 'FFCBD5E1' }
  };

  const doubleBorder = {
    style: 'double',
    color: { argb: 'FF94A3B8' }
  };

  const numFormat = '₹ #,##0.00;[Red]₹ (#,##0.00);"-"';

  function ensureExcelJSLoaded() {
    return new Promise((resolve, reject) => {
      if (global.ExcelJS) return resolve();

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
      script.onload = () => resolve();
      script.onerror = (err) => reject(err);
      document.head.appendChild(script);
    });
  }

  function formatRptDate(dateStr) {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }
      }
    } catch(e) {}
    return dateStr;
  }

  // ════════════════════════════════════════════════════════════════════
  // 1. PROFIT & LOSS STATEMENT EXCEL EXPORT
  // ════════════════════════════════════════════════════════════════════
  async function exportPnLToExcel(data) {
    try {
      await ensureExcelJSLoaded();

      if (!global.ExcelJS) {
        throw new Error('ExcelJS library could not be loaded.');
      }

      const workbook = new global.ExcelJS.Workbook();
      workbook.creator = 'KYA Accounting';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Profit & Loss', {
        views: [{ state: 'frozen', ySplit: 5, showGridLines: true }]
      });

      const isCompare = !!data.isCompare;
      const maxCols = isCompare ? 3 : 2;
      const lastColLetter = isCompare ? 'C' : 'B';

      // Column Widths
      sheet.getColumn(1).width = 48;
      sheet.getColumn(2).width = 24;
      if (isCompare) {
        sheet.getColumn(3).width = 24;
      }

      // 1. Company Name
      const compName = (data.companyName || 'KYA Accounting').toUpperCase();
      const r1 = sheet.addRow([compName]);
      r1.height = 24;
      sheet.mergeCells(`A1:${lastColLetter}1`);
      const cA1 = sheet.getCell('A1');
      cA1.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF1E3A8A' } };
      cA1.alignment = { vertical: 'middle', horizontal: 'left' };

      // 2. Title
      const r2 = sheet.addRow(['PROFIT & LOSS STATEMENT']);
      r2.height = 20;
      sheet.mergeCells(`A2:${lastColLetter}2`);
      const cA2 = sheet.getCell('A2');
      cA2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F172A' } };
      cA2.alignment = { vertical: 'middle', horizontal: 'left' };

      // 3. Date / Period Subtitle
      let periodText = 'Statement of Income and Expenses';
      if (data.dateFrom || data.dateTo) {
        periodText = `Period: ${formatRptDate(data.dateFrom) || 'Beginning'} to ${formatRptDate(data.dateTo) || 'End'}`;
      }
      if (isCompare && (data.compareDateFrom || data.compareDateTo)) {
        periodText += `  |  Compare: ${formatRptDate(data.compareDateFrom) || 'Beginning'} to ${formatRptDate(data.compareDateTo) || 'End'}`;
      }
      const r3 = sheet.addRow([periodText]);
      r3.height = 18;
      sheet.mergeCells(`A3:${lastColLetter}3`);
      const cA3 = sheet.getCell('A3');
      cA3.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
      cA3.alignment = { vertical: 'middle', horizontal: 'left' };

      // 4. Spacer Row
      const r4 = sheet.addRow([]);
      r4.height = 10;

      // 5. Table Column Headers
      const col1Hdr = data.dateTo ? `Amount (${formatRptDate(data.dateTo)})` : 'Amount (INR)';
      const col2Hdr = data.compareDateTo ? `Amount (${formatRptDate(data.compareDateTo)})` : 'Compare Amount (INR)';
      const headerValues = isCompare ? ['Particulars', col1Hdr, col2Hdr] : ['Particulars', col1Hdr];
      const r5 = sheet.addRow(headerValues);
      r5.height = 24;

      for (let c = 1; c <= maxCols; c++) {
        const cell = r5.getCell(c);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E3A8A' }
        };
        cell.border = { top: thinBorder, bottom: mediumBorder, left: thinBorder, right: thinBorder };
        cell.alignment = {
          vertical: 'middle',
          horizontal: c === 1 ? 'left' : 'right',
          indent: c === 1 ? 1 : 0
        };
      }

      function appendRow(particulars, val1, val2, type = 'item') {
        const rowVals = isCompare ? [particulars, val1, val2] : [particulars, val1];
        const row = sheet.addRow(rowVals);
        row.height = 20;

        const c1 = row.getCell(1);
        c1.alignment = { vertical: 'middle', horizontal: 'left' };

        if (typeof val1 === 'number') {
          const c2 = row.getCell(2);
          c2.numFmt = numFormat;
          c2.alignment = { vertical: 'middle', horizontal: 'right' };
        }
        if (isCompare && typeof val2 === 'number') {
          const c3 = row.getCell(3);
          c3.numFmt = numFormat;
          c3.alignment = { vertical: 'middle', horizontal: 'right' };
        }

        for (let c = 1; c <= maxCols; c++) {
          const cell = row.getCell(c);
          cell.border = {
            top: thinBorder,
            bottom: thinBorder,
            left: thinBorder,
            right: thinBorder
          };

          if (type === 'section-hdr') {
            cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
            cell.border = { top: mediumBorder, bottom: mediumBorder, left: thinBorder, right: thinBorder };
          } else if (type === 'subgroup') {
            cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
          } else if (type === 'group-ledger') {
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB45309' } };
          } else if (type === 'child-ledger' || type === 'ledger') {
            cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF475569' } };
          } else if (type === 'subtotal-revenue') {
            cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF166534' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
            cell.border = { top: thinBorder, bottom: mediumBorder, left: thinBorder, right: thinBorder };
          } else if (type === 'subtotal-expense') {
            cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF991B1B' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
            cell.border = { top: thinBorder, bottom: mediumBorder, left: thinBorder, right: thinBorder };
          } else if (type === 'subtotal-pbt') {
            cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            cell.border = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
          } else if (type === 'grandtotal-pat') {
            cell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
            cell.border = { top: mediumBorder, bottom: doubleBorder, left: thinBorder, right: thinBorder };
          }
        }
      }

      function appendBlankRow() {
        const emptyVals = isCompare ? ['', '', ''] : ['', ''];
        const r = sheet.addRow(emptyVals);
        r.height = 8;
      }

      // 1. REVENUE
      appendRow('I. REVENUE & INCOME', '', '', 'section-hdr');
      (data.incomeData || []).forEach(sg => {
        appendRow(sg.name, sg.amount1, sg.amount2, 'subgroup');
        (sg.items || []).forEach(item => {
          if (item.isGroup) {
            appendRow(`    📁 ${item.name}`, item.amount1, item.amount2, 'group-ledger');
            (item.children || []).forEach(child => {
              appendRow(`        ${child.name}`, child.amount1, child.amount2, 'child-ledger');
            });
          } else {
            appendRow(`    ${item.name}`, item.amount1, item.amount2, 'ledger');
          }
        });
      });
      appendRow('Total Revenue (I)', data.totalRevenue1, data.totalRevenue2, 'subtotal-revenue');

      appendBlankRow();

      // 2. EXPENSES
      appendRow('II. EXPENSES', '', '', 'section-hdr');
      (data.expenseData || []).forEach(sg => {
        appendRow(sg.name, sg.amount1, sg.amount2, 'subgroup');
        (sg.items || []).forEach(item => {
          if (item.isGroup) {
            appendRow(`    📁 ${item.name}`, item.amount1, item.amount2, 'group-ledger');
            (item.children || []).forEach(child => {
              appendRow(`        ${child.name}`, child.amount1, child.amount2, 'child-ledger');
            });
          } else {
            appendRow(`    ${item.name}`, item.amount1, item.amount2, 'ledger');
          }
        });
      });
      appendRow('Total Expenses (II)', data.totalExpenses1, data.totalExpenses2, 'subtotal-expense');

      appendBlankRow();

      // 3. PROFITABILITY
      appendRow('III. PROFITABILITY', '', '', 'section-hdr');
      appendRow('Profit Before Tax (PBT) (I - II)', data.pbt1, data.pbt2, 'subtotal-pbt');
      if (data.taxBal1 !== 0 || (isCompare && data.taxBal2 !== 0)) {
        appendRow('Less: Tax Expense', data.taxBal1, data.taxBal2, 'ledger');
      }
      appendRow('PROFIT AFTER TAX (PAT)', data.pat1, data.pat2, 'grandtotal-pat');

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const sDate = data.dateFrom || 'Start';
      const eDate = data.dateTo || 'End';
      const fileName = `PnL_${sDate}_${eDate}.xlsx`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      return true;
    } catch (err) {
      console.error('Failed to export P&L to Excel:', err);
      alert('Could not export Excel: ' + err.message);
      return false;
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // 2. BALANCE SHEET STATEMENT EXCEL EXPORT
  // ════════════════════════════════════════════════════════════════════
  async function exportBalanceSheetToExcel(data) {
    try {
      await ensureExcelJSLoaded();

      if (!global.ExcelJS) {
        throw new Error('ExcelJS library could not be loaded.');
      }

      const workbook = new global.ExcelJS.Workbook();
      workbook.creator = 'KYA Accounting';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Balance Sheet', {
        views: [{ state: 'frozen', ySplit: 5, showGridLines: true }]
      });

      const isCompare = !!data.isCompare;
      const maxCols = isCompare ? 3 : 2;
      const lastColLetter = isCompare ? 'C' : 'B';

      sheet.getColumn(1).width = 48;
      sheet.getColumn(2).width = 24;
      if (isCompare) {
        sheet.getColumn(3).width = 24;
      }

      const compName = (data.companyName || 'KYA Accounting').toUpperCase();
      const r1 = sheet.addRow([compName]);
      r1.height = 24;
      sheet.mergeCells(`A1:${lastColLetter}1`);
      const cA1 = sheet.getCell('A1');
      cA1.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF1E3A8A' } };
      cA1.alignment = { vertical: 'middle', horizontal: 'left' };

      const r2 = sheet.addRow(['BALANCE SHEET']);
      r2.height = 20;
      sheet.mergeCells(`A2:${lastColLetter}2`);
      const cA2 = sheet.getCell('A2');
      cA2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F172A' } };
      cA2.alignment = { vertical: 'middle', horizontal: 'left' };

      let periodText = 'Statement of Financial Position';
      if (data.dateTo) {
        periodText = `As of: ${formatRptDate(data.dateTo)}`;
      }
      if (isCompare && data.compareDateTo) {
        periodText += `  |  Compare: As of ${formatRptDate(data.compareDateTo)}`;
      }
      const r3 = sheet.addRow([periodText]);
      r3.height = 18;
      sheet.mergeCells(`A3:${lastColLetter}3`);
      const cA3 = sheet.getCell('A3');
      cA3.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
      cA3.alignment = { vertical: 'middle', horizontal: 'left' };

      const r4 = sheet.addRow([]);
      r4.height = 10;

      const col1Title = data.dateTo ? `As of ${formatRptDate(data.dateTo)}` : 'Amount (INR)';
      const col2Title = data.compareDateTo ? `As of ${formatRptDate(data.compareDateTo)}` : 'Compare (INR)';
      const headerValues = isCompare ? ['Particulars', col1Title, col2Title] : ['Particulars', col1Title];
      const r5 = sheet.addRow(headerValues);
      r5.height = 24;

      for (let c = 1; c <= maxCols; c++) {
        const cell = r5.getCell(c);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E3A8A' }
        };
        cell.border = { top: thinBorder, bottom: mediumBorder, left: thinBorder, right: thinBorder };
        cell.alignment = {
          vertical: 'middle',
          horizontal: c === 1 ? 'left' : 'right',
          indent: c === 1 ? 1 : 0
        };
      }

      function appendRow(particulars, val1, val2, type = 'item') {
        const rowVals = isCompare ? [particulars, val1, val2] : [particulars, val1];
        const row = sheet.addRow(rowVals);
        row.height = 20;

        const c1 = row.getCell(1);
        c1.alignment = { vertical: 'middle', horizontal: 'left' };

        if (typeof val1 === 'number') {
          const c2 = row.getCell(2);
          c2.numFmt = numFormat;
          c2.alignment = { vertical: 'middle', horizontal: 'right' };
        }
        if (isCompare && typeof val2 === 'number') {
          const c3 = row.getCell(3);
          c3.numFmt = numFormat;
          c3.alignment = { vertical: 'middle', horizontal: 'right' };
        }

        for (let c = 1; c <= maxCols; c++) {
          const cell = row.getCell(c);
          cell.border = {
            top: thinBorder,
            bottom: thinBorder,
            left: thinBorder,
            right: thinBorder
          };

          if (type === 'section-hdr') {
            cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
            cell.border = { top: mediumBorder, bottom: mediumBorder, left: thinBorder, right: thinBorder };
          } else if (type === 'subgroup') {
            cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
          } else if (type === 'subgroup-l2') {
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF334155' } };
          } else if (type === 'group-ledger') {
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB45309' } };
          } else if (type === 'child-ledger' || type === 'ledger') {
            cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF475569' } };
          } else if (type === 'subtotal-mg') {
            cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF166534' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
            cell.border = { top: thinBorder, bottom: mediumBorder, left: thinBorder, right: thinBorder };
          }
        }
      }

      function appendBlankRow() {
        const emptyVals = isCompare ? ['', '', ''] : ['', ''];
        const r = sheet.addRow(emptyVals);
        r.height = 8;
      }

      function appendItems(items, indentLevel = 1) {
        const pad = '    '.repeat(indentLevel);
        (items || []).forEach(item => {
          if (item.isGroup) {
            appendRow(`${pad}📁 ${item.name}`, item.amount1, item.amount2, 'group-ledger');
            (item.children || []).forEach(ch => {
              appendRow(`${pad}    ${ch.name}`, ch.amount1, ch.amount2, 'child-ledger');
            });
          } else {
            appendRow(`${pad}${item.name}`, item.amount1, item.amount2, 'ledger');
          }
        });
      }

      (data.mainGroups || []).forEach((mg, mgIdx) => {
        if (mgIdx > 0) appendBlankRow();

        appendRow(mg.name.toUpperCase(), mg.total1, mg.total2, 'section-hdr');

        (mg.subgroups || []).forEach(sg => {
          appendRow(`  ${sg.name}`, sg.amount1, sg.amount2, 'subgroup');
          if (sg.hasChildren && sg.l2Subgroups) {
            sg.l2Subgroups.forEach(l2 => {
              appendRow(`    ${l2.name}`, l2.amount1, l2.amount2, 'subgroup-l2');
              appendItems(l2.items, 3);
            });
          } else {
            appendItems(sg.items, 2);
          }
        });

        appendRow(`Total ${mg.name}`, mg.total1, mg.total2, 'subtotal-mg');
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const sDate = data.dateFrom || 'Start';
      const eDate = data.dateTo || 'End';
      const fileName = `BalanceSheet_${sDate}_${eDate}.xlsx`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      return true;
    } catch (err) {
      console.error('Failed to export Balance Sheet to Excel:', err);
      alert('Could not export Excel: ' + err.message);
      return false;
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // 3. TRIAL BALANCE EXCEL EXPORT
  // ════════════════════════════════════════════════════════════════════
  async function exportTrialBalanceToExcel(data) {
    try {
      await ensureExcelJSLoaded();

      if (!global.ExcelJS) {
        throw new Error('ExcelJS library could not be loaded.');
      }

      const workbook = new global.ExcelJS.Workbook();
      workbook.creator = 'KYA Accounting';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Trial Balance', {
        views: [{ state: 'frozen', ySplit: 5, showGridLines: true }]
      });

      const optCols = data.optionalCols || {};
      const headers = ['#', 'Particulars'];
      if (optCols.gl) headers.push('Group Ledger');
      if (optCols.sg) headers.push('Sub Group');
      if (optCols.mg) headers.push('Main Group');
      if (optCols.plbs) headers.push('PL/BS');
      headers.push('Dr Amount (INR)', 'Cr Amount (INR)');

      const maxCols = headers.length;
      const lastColLetter = String.fromCharCode(64 + maxCols);

      sheet.getColumn(1).width = 8;
      sheet.getColumn(2).width = 40;
      let currCol = 3;
      if (optCols.gl) { sheet.getColumn(currCol++).width = 24; }
      if (optCols.sg) { sheet.getColumn(currCol++).width = 24; }
      if (optCols.mg) { sheet.getColumn(currCol++).width = 20; }
      if (optCols.plbs) { sheet.getColumn(currCol++).width = 12; }
      const drColNum = currCol++;
      const crColNum = currCol++;
      sheet.getColumn(drColNum).width = 22;
      sheet.getColumn(crColNum).width = 22;

      const compName = (data.companyName || 'KYA Accounting').toUpperCase();
      const r1 = sheet.addRow([compName]);
      r1.height = 24;
      sheet.mergeCells(`A1:${lastColLetter}1`);
      const cA1 = sheet.getCell('A1');
      cA1.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF1E3A8A' } };
      cA1.alignment = { vertical: 'middle', horizontal: 'left' };

      const r2 = sheet.addRow(['TRIAL BALANCE']);
      r2.height = 20;
      sheet.mergeCells(`A2:${lastColLetter}2`);
      const cA2 = sheet.getCell('A2');
      cA2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F172A' } };
      cA2.alignment = { vertical: 'middle', horizontal: 'left' };

      let periodText = 'Summary of ledger balances';
      if (data.dateFrom || data.dateTo) {
        periodText = `Period: ${formatRptDate(data.dateFrom) || 'Beginning'} to ${formatRptDate(data.dateTo) || 'End'}`;
      }
      const r3 = sheet.addRow([periodText]);
      r3.height = 18;
      sheet.mergeCells(`A3:${lastColLetter}3`);
      const cA3 = sheet.getCell('A3');
      cA3.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
      cA3.alignment = { vertical: 'middle', horizontal: 'left' };

      const r4 = sheet.addRow([]);
      r4.height = 10;

      const r5 = sheet.addRow(headers);
      r5.height = 24;

      for (let c = 1; c <= maxCols; c++) {
        const cell = r5.getCell(c);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E3A8A' }
        };
        cell.border = { top: thinBorder, bottom: mediumBorder, left: thinBorder, right: thinBorder };
        cell.alignment = {
          vertical: 'middle',
          horizontal: (c === drColNum || c === crColNum) ? 'right' : (c === 1 ? 'center' : 'left'),
          indent: (c !== 1 && c !== drColNum && c !== crColNum) ? 1 : 0
        };
      }

      (data.items || []).forEach(item => {
        const rowVals = [
          item.slNo,
          item.name + (item.code ? ` (${item.code})` : '')
        ];
        if (optCols.gl) rowVals.push(item.gl || '-');
        if (optCols.sg) rowVals.push(item.sg || '-');
        if (optCols.mg) rowVals.push(item.mg || '-');
        if (optCols.plbs) rowVals.push(item.plbs || '-');
        rowVals.push(item.drVal !== 0 ? item.drVal : '');
        rowVals.push(item.crVal !== 0 ? item.crVal : '');

        const row = sheet.addRow(rowVals);
        row.height = 20;

        for (let c = 1; c <= maxCols; c++) {
          const cell = row.getCell(c);
          cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };
          cell.border = {
            top: thinBorder,
            bottom: thinBorder,
            left: thinBorder,
            right: thinBorder
          };

          if (c === drColNum || c === crColNum) {
            const val = cell.value;
            if (typeof val === 'number' && val !== 0) {
              cell.numFmt = numFormat;
            }
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
          } else if (c === 1) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
          }
        }
      });

      const totRowVals = ['TOTAL'];
      for (let i = 2; i < maxCols - 1; i++) {
        totRowVals.push('');
      }
      totRowVals.push(data.totalDr || 0);
      totRowVals.push(data.totalCr || 0);

      const totRow = sheet.addRow(totRowVals);
      totRow.height = 22;

      const nonAmtEndColLetter = String.fromCharCode(64 + maxCols - 2);
      sheet.mergeCells(`A${totRow.number}:${nonAmtEndColLetter}${totRow.number}`);

      for (let c = 1; c <= maxCols; c++) {
        const cell = totRow.getCell(c);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0FDF4' }
        };
        cell.border = {
          top: mediumBorder,
          bottom: doubleBorder,
          left: thinBorder,
          right: thinBorder
        };

        if (c === drColNum || c === crColNum) {
          cell.numFmt = numFormat;
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else if (c === 1) {
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const sDate = data.dateFrom || 'Start';
      const eDate = data.dateTo || 'End';
      const fileName = `TrialBalance_${sDate}_${eDate}.xlsx`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      return true;
    } catch (err) {
      console.error('Failed to export Trial Balance to Excel:', err);
      alert('Could not export Excel: ' + err.message);
      return false;
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // 4. CHART OF ACCOUNTS EXCEL EXPORT
  // ════════════════════════════════════════════════════════════════════
  async function exportChartOfAccountsToExcel(data) {
    try {
      await ensureExcelJSLoaded();
      if (!global.ExcelJS) throw new Error('ExcelJS library could not be loaded.');

      const workbook = new global.ExcelJS.Workbook();
      workbook.creator = 'KYA Accounting';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Chart of Accounts', {
        views: [{ state: 'frozen', ySplit: 5, showGridLines: true }]
      });

      const maxCols = 5;
      const lastColLetter = 'E';

      sheet.getColumn(1).width = 44;
      sheet.getColumn(2).width = 16;
      sheet.getColumn(3).width = 18;
      sheet.getColumn(4).width = 28;
      sheet.getColumn(5).width = 24;

      const compName = (data.companyName || 'KYA Accounting').toUpperCase();
      const r1 = sheet.addRow([compName]);
      r1.height = 24;
      sheet.mergeCells(`A1:${lastColLetter}1`);
      const cA1 = sheet.getCell('A1');
      cA1.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF1E3A8A' } };
      cA1.alignment = { vertical: 'middle', horizontal: 'left' };

      const r2 = sheet.addRow(['CHART OF ACCOUNTS']);
      r2.height = 20;
      sheet.mergeCells(`A2:${lastColLetter}2`);
      const cA2 = sheet.getCell('A2');
      cA2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F172A' } };
      cA2.alignment = { vertical: 'middle', horizontal: 'left' };

      const r3 = sheet.addRow(['Complete Master Accounts Hierarchy']);
      r3.height = 18;
      sheet.mergeCells(`A3:${lastColLetter}3`);
      const cA3 = sheet.getCell('A3');
      cA3.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
      cA3.alignment = { vertical: 'middle', horizontal: 'left' };

      const r4 = sheet.addRow([]);
      r4.height = 8;

      const r5 = sheet.addRow(['Account / Group Name', 'Code', 'Type', 'Sub Group / Parent', 'Opening Bal (INR)']);
      r5.height = 24;
      for (let c = 1; c <= maxCols; c++) {
        const cell = r5.getCell(c);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
        cell.border = { top: thinBorder, bottom: mediumBorder, left: thinBorder, right: thinBorder };
        cell.alignment = { vertical: 'middle', horizontal: c === 5 ? 'right' : (c === 2 || c === 3 ? 'center' : 'left'), indent: (c === 1 || c === 4) ? 1 : 0 };
      }

      function appendRow(name, code, type, parentName, opBal, rowType = 'item') {
        const row = sheet.addRow([name, code || '', type || '', parentName || '', typeof opBal === 'number' && opBal !== 0 ? opBal : (opBal ? String(opBal) : '')]);
        row.height = rowType === 'section-hdr' ? 22 : 20;

        for (let c = 1; c <= maxCols; c++) {
          const cell = row.getCell(c);
          cell.border = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

          if (rowType === 'section-hdr') {
            cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
            cell.border = { top: mediumBorder, bottom: mediumBorder, left: thinBorder, right: thinBorder };
          } else if (rowType === 'group') {
            cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFB45309' } };
          } else {
            cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };
          }

          if (c === 5) {
            if (typeof opBal === 'number' && opBal !== 0) cell.numFmt = numFormat;
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
          } else if (c === 2 || c === 3) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'left', indent: c === 1 ? 1 : 0 };
          }
        }
      }

      (data.mainGroups || []).forEach((mg, idx) => {
        if (idx > 0) {
          const emptyRow = sheet.addRow(['', '', '', '', '']);
          emptyRow.height = 8;
        }
        appendRow(mg.name.toUpperCase(), '', 'Main Group', '', '', 'section-hdr');
        (mg.items || []).forEach(item => {
          const indent = '  '.repeat(item.level || 1);
          appendRow(indent + (item.isGroup ? `📁 ${item.name}` : item.name), item.code, item.type, item.parentName, item.openingBalance, item.isGroup ? 'group' : 'ledger');
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'ChartOfAccounts.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      return true;
    } catch (err) {
      console.error('Failed to export Chart of Accounts to Excel:', err);
      alert('Could not export Excel: ' + err.message);
      return false;
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // 5. LEDGERS LIST EXCEL EXPORT
  // ════════════════════════════════════════════════════════════════════
  async function exportLedgersToExcel(data) {
    try {
      await ensureExcelJSLoaded();
      if (!global.ExcelJS) throw new Error('ExcelJS library could not be loaded.');

      const workbook = new global.ExcelJS.Workbook();
      workbook.creator = 'KYA Accounting';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Ledgers', {
        views: [{ state: 'frozen', ySplit: 5, showGridLines: true }]
      });

      const maxCols = 6;
      const lastColLetter = 'F';

      sheet.getColumn(1).width = 8;
      sheet.getColumn(2).width = 38;
      sheet.getColumn(3).width = 16;
      sheet.getColumn(4).width = 28;
      sheet.getColumn(5).width = 24;
      sheet.getColumn(6).width = 22;

      const compName = (data.companyName || 'KYA Accounting').toUpperCase();
      const r1 = sheet.addRow([compName]);
      r1.height = 24;
      sheet.mergeCells(`A1:${lastColLetter}1`);
      const cA1 = sheet.getCell('A1');
      cA1.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF1E3A8A' } };
      cA1.alignment = { vertical: 'middle', horizontal: 'left' };

      const r2 = sheet.addRow(['LIST OF ACCOUNTS (LEDGERS)']);
      r2.height = 20;
      sheet.mergeCells(`A2:${lastColLetter}2`);
      const cA2 = sheet.getCell('A2');
      cA2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F172A' } };
      cA2.alignment = { vertical: 'middle', horizontal: 'left' };

      const r3 = sheet.addRow([`Total Accounts: ${(data.items || []).length}`]);
      r3.height = 18;
      sheet.mergeCells(`A3:${lastColLetter}3`);
      const cA3 = sheet.getCell('A3');
      cA3.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
      cA3.alignment = { vertical: 'middle', horizontal: 'left' };

      const r4 = sheet.addRow([]);
      r4.height = 8;

      const r5 = sheet.addRow(['#', 'Ledger Name', 'Code', 'Sub Group', 'Main Group', 'Opening Bal (INR)']);
      r5.height = 24;
      for (let c = 1; c <= maxCols; c++) {
        const cell = r5.getCell(c);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
        cell.border = { top: thinBorder, bottom: mediumBorder, left: thinBorder, right: thinBorder };
        cell.alignment = { vertical: 'middle', horizontal: c === 6 ? 'right' : (c === 1 || c === 3 ? 'center' : 'left'), indent: (c === 2 || c === 4 || c === 5) ? 1 : 0 };
      }

      let totalOpBal = 0;
      (data.items || []).forEach((item, idx) => {
        const opVal = Number(item.openingBalance) || 0;
        totalOpBal += opVal;
        const row = sheet.addRow([idx + 1, item.name, item.code || '', item.sgName || '', item.mgName || '', opVal !== 0 ? opVal : '']);
        row.height = 20;

        for (let c = 1; c <= maxCols; c++) {
          const cell = row.getCell(c);
          cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };
          cell.border = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

          if (c === 6) {
            if (opVal !== 0) cell.numFmt = numFormat;
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
          } else if (c === 1 || c === 3) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
          }
        }
      });

      const totRow = sheet.addRow(['TOTAL', '', '', '', '', totalOpBal]);
      totRow.height = 22;
      sheet.mergeCells(`A${totRow.number}:E${totRow.number}`);
      for (let c = 1; c <= maxCols; c++) {
        const cell = totRow.getCell(c);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        cell.border = { top: mediumBorder, bottom: doubleBorder, left: thinBorder, right: thinBorder };
        if (c === 6) {
          cell.numFmt = numFormat;
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'Ledgers_List.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      return true;
    } catch (err) {
      console.error('Failed to export Ledgers to Excel:', err);
      alert('Could not export Excel: ' + err.message);
      return false;
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // 6. CUSTOMERS LIST EXCEL EXPORT
  // ════════════════════════════════════════════════════════════════════
  async function exportCustomersToExcel(data) {
    try {
      await ensureExcelJSLoaded();
      if (!global.ExcelJS) throw new Error('ExcelJS library could not be loaded.');

      const workbook = new global.ExcelJS.Workbook();
      workbook.creator = 'KYA Accounting';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Customers', {
        views: [{ state: 'frozen', ySplit: 5, showGridLines: true }]
      });

      const maxCols = 7;
      const lastColLetter = 'G';

      sheet.getColumn(1).width = 8;
      sheet.getColumn(2).width = 36;
      sheet.getColumn(3).width = 18;
      sheet.getColumn(4).width = 20;
      sheet.getColumn(5).width = 26;
      sheet.getColumn(6).width = 22;
      sheet.getColumn(7).width = 22;

      const compName = (data.companyName || 'KYA Accounting').toUpperCase();
      const r1 = sheet.addRow([compName]);
      r1.height = 24;
      sheet.mergeCells(`A1:${lastColLetter}1`);
      const cA1 = sheet.getCell('A1');
      cA1.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF1E3A8A' } };
      cA1.alignment = { vertical: 'middle', horizontal: 'left' };

      const r2 = sheet.addRow(['CUSTOMERS MASTER LIST']);
      r2.height = 20;
      sheet.mergeCells(`A2:${lastColLetter}2`);
      const cA2 = sheet.getCell('A2');
      cA2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F172A' } };
      cA2.alignment = { vertical: 'middle', horizontal: 'left' };

      const r3 = sheet.addRow([`Total Customers: ${(data.items || []).length} • Trade Receivables`]);
      r3.height = 18;
      sheet.mergeCells(`A3:${lastColLetter}3`);
      const cA3 = sheet.getCell('A3');
      cA3.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
      cA3.alignment = { vertical: 'middle', horizontal: 'left' };

      const r4 = sheet.addRow([]);
      r4.height = 8;

      const r5 = sheet.addRow(['#', 'Customer Name', 'Code / Alias', 'Phone / Mobile', 'Email', 'GSTIN / State', 'Opening Bal (INR)']);
      r5.height = 24;
      for (let c = 1; c <= maxCols; c++) {
        const cell = r5.getCell(c);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
        cell.border = { top: thinBorder, bottom: mediumBorder, left: thinBorder, right: thinBorder };
        cell.alignment = { vertical: 'middle', horizontal: c === 7 ? 'right' : (c === 1 || c === 3 ? 'center' : 'left'), indent: (c === 2 || (c >= 4 && c <= 6)) ? 1 : 0 };
      }

      let totalOpBal = 0;
      (data.items || []).forEach((item, idx) => {
        const opVal = Number(item.openingBalance) || 0;
        totalOpBal += opVal;
        const codeAlias = item.code || (Array.isArray(item.aliases) ? item.aliases.join(', ') : '') || '';
        const row = sheet.addRow([idx + 1, item.name, codeAlias, item.phone || '', item.email || '', item.gstin || item.state || '', opVal !== 0 ? opVal : '']);
        row.height = 20;

        for (let c = 1; c <= maxCols; c++) {
          const cell = row.getCell(c);
          cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };
          cell.border = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

          if (c === 7) {
            if (opVal !== 0) cell.numFmt = numFormat;
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
          } else if (c === 1 || c === 3) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
          }
        }
      });

      const totRow = sheet.addRow(['TOTAL', '', '', '', '', '', totalOpBal]);
      totRow.height = 22;
      sheet.mergeCells(`A${totRow.number}:F${totRow.number}`);
      for (let c = 1; c <= maxCols; c++) {
        const cell = totRow.getCell(c);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        cell.border = { top: mediumBorder, bottom: doubleBorder, left: thinBorder, right: thinBorder };
        if (c === 7) {
          cell.numFmt = numFormat;
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'Customers_List.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      return true;
    } catch (err) {
      console.error('Failed to export Customers to Excel:', err);
      alert('Could not export Excel: ' + err.message);
      return false;
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // 7. SUPPLIERS LIST EXCEL EXPORT
  // ════════════════════════════════════════════════════════════════════
  async function exportSuppliersToExcel(data) {
    try {
      await ensureExcelJSLoaded();
      if (!global.ExcelJS) throw new Error('ExcelJS library could not be loaded.');

      const workbook = new global.ExcelJS.Workbook();
      workbook.creator = 'KYA Accounting';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Suppliers', {
        views: [{ state: 'frozen', ySplit: 5, showGridLines: true }]
      });

      const maxCols = 7;
      const lastColLetter = 'G';

      sheet.getColumn(1).width = 8;
      sheet.getColumn(2).width = 36;
      sheet.getColumn(3).width = 18;
      sheet.getColumn(4).width = 20;
      sheet.getColumn(5).width = 26;
      sheet.getColumn(6).width = 22;
      sheet.getColumn(7).width = 22;

      const compName = (data.companyName || 'KYA Accounting').toUpperCase();
      const r1 = sheet.addRow([compName]);
      r1.height = 24;
      sheet.mergeCells(`A1:${lastColLetter}1`);
      const cA1 = sheet.getCell('A1');
      cA1.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF1E3A8A' } };
      cA1.alignment = { vertical: 'middle', horizontal: 'left' };

      const r2 = sheet.addRow(['SUPPLIERS MASTER LIST']);
      r2.height = 20;
      sheet.mergeCells(`A2:${lastColLetter}2`);
      const cA2 = sheet.getCell('A2');
      cA2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F172A' } };
      cA2.alignment = { vertical: 'middle', horizontal: 'left' };

      const r3 = sheet.addRow([`Total Suppliers: ${(data.items || []).length} • Trade Payables`]);
      r3.height = 18;
      sheet.mergeCells(`A3:${lastColLetter}3`);
      const cA3 = sheet.getCell('A3');
      cA3.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
      cA3.alignment = { vertical: 'middle', horizontal: 'left' };

      const r4 = sheet.addRow([]);
      r4.height = 8;

      const r5 = sheet.addRow(['#', 'Supplier Name', 'Code / Alias', 'Phone / Mobile', 'Email', 'GSTIN / State', 'Opening Bal (INR)']);
      r5.height = 24;
      for (let c = 1; c <= maxCols; c++) {
        const cell = r5.getCell(c);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
        cell.border = { top: thinBorder, bottom: mediumBorder, left: thinBorder, right: thinBorder };
        cell.alignment = { vertical: 'middle', horizontal: c === 7 ? 'right' : (c === 1 || c === 3 ? 'center' : 'left'), indent: (c === 2 || (c >= 4 && c <= 6)) ? 1 : 0 };
      }

      let totalOpBal = 0;
      (data.items || []).forEach((item, idx) => {
        const opVal = Number(item.openingBalance) || 0;
        totalOpBal += opVal;
        const codeAlias = item.code || (Array.isArray(item.aliases) ? item.aliases.join(', ') : '') || '';
        const row = sheet.addRow([idx + 1, item.name, codeAlias, item.phone || '', item.email || '', item.gstin || item.state || '', opVal !== 0 ? opVal : '']);
        row.height = 20;

        for (let c = 1; c <= maxCols; c++) {
          const cell = row.getCell(c);
          cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };
          cell.border = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

          if (c === 7) {
            if (opVal !== 0) cell.numFmt = numFormat;
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
          } else if (c === 1 || c === 3) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
          }
        }
      });

      const totRow = sheet.addRow(['TOTAL', '', '', '', '', '', totalOpBal]);
      totRow.height = 22;
      sheet.mergeCells(`A${totRow.number}:F${totRow.number}`);
      for (let c = 1; c <= maxCols; c++) {
        const cell = totRow.getCell(c);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        cell.border = { top: mediumBorder, bottom: doubleBorder, left: thinBorder, right: thinBorder };
        if (c === 7) {
          cell.numFmt = numFormat;
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'Suppliers_List.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      return true;
    } catch (err) {
      console.error('Failed to export Suppliers to Excel:', err);
      alert('Could not export Excel: ' + err.message);
      return false;
    }
  }

  /**
   * Export Statement (Ledger, Customer, Supplier) to Excel (.xlsx)
   */
  async function exportStatementToExcel(data) {
    try {
      await ensureExcelJSLoaded();
      if (!global.ExcelJS) throw new Error('ExcelJS library could not be loaded.');

      const workbook = new global.ExcelJS.Workbook();
      workbook.creator = 'KYA Accounting';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Statement', {
        views: [{ state: 'frozen', ySplit: 5, showGridLines: true }]
      });

      const maxCols = 5;
      const lastColLetter = 'E';

      sheet.getColumn(1).width = 16;
      sheet.getColumn(2).width = 44;
      sheet.getColumn(3).width = 18;
      sheet.getColumn(4).width = 22;
      sheet.getColumn(5).width = 22;

      const compName = (data.companyName || 'KYA Accounting').toUpperCase();
      const r1 = sheet.addRow([compName]);
      r1.height = 24;
      sheet.mergeCells(`A1:${lastColLetter}1`);
      const cA1 = sheet.getCell('A1');
      cA1.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF1E3A8A' } };
      cA1.alignment = { vertical: 'middle', horizontal: 'left' };

      const r2 = sheet.addRow([data.title || 'STATEMENT OF ACCOUNT']);
      r2.height = 20;
      sheet.mergeCells(`A2:${lastColLetter}2`);
      const cA2 = sheet.getCell('A2');
      cA2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F172A' } };
      cA2.alignment = { vertical: 'middle', horizontal: 'left' };

      let subInfo = `Account: ${data.accountName || '—'}`;
      if (data.subgroupName) subInfo += `  |  Group: ${data.subgroupName}`;
      const r3 = sheet.addRow([subInfo]);
      r3.height = 18;
      sheet.mergeCells(`A3:${lastColLetter}3`);
      const cA3 = sheet.getCell('A3');
      cA3.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF475569' } };
      cA3.alignment = { vertical: 'middle', horizontal: 'left' };

      let periodText = 'Period: All recorded transactions';
      if (data.dateFrom || data.dateTo) {
        periodText = `Period: ${formatRptDate(data.dateFrom) || 'Beginning'} to ${formatRptDate(data.dateTo) || 'End'}`;
      }
      const r4 = sheet.addRow([periodText]);
      r4.height = 18;
      sheet.mergeCells(`A4:${lastColLetter}4`);
      const cA4 = sheet.getCell('A4');
      cA4.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
      cA4.alignment = { vertical: 'middle', horizontal: 'left' };

      const r5 = sheet.addRow(['Date', 'Particulars', 'Voucher No', 'Debit (INR)', 'Credit (INR)']);
      r5.height = 24;
      for (let c = 1; c <= maxCols; c++) {
        const cell = r5.getCell(c);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
        cell.border = { top: thinBorder, bottom: mediumBorder, left: thinBorder, right: thinBorder };
        cell.alignment = {
          vertical: 'middle',
          horizontal: c >= 4 ? 'right' : (c === 1 || c === 3 ? 'center' : 'left'),
          indent: c === 2 ? 1 : 0
        };
      }

      // Opening Balance Row
      const opBal = Number(data.openingBalance) || 0;
      const opRow = sheet.addRow([
        '—',
        'Opening Balance',
        '—',
        opBal > 0 ? opBal : '',
        opBal < 0 ? Math.abs(opBal) : ''
      ]);
      opRow.height = 20;
      for (let c = 1; c <= maxCols; c++) {
        const cell = opRow.getCell(c);
        cell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        cell.border = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
        if (c >= 4) {
          if (typeof cell.value === 'number') cell.numFmt = numFormat;
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else if (c === 1 || c === 3) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        }
      }

      // Transaction Rows
      (data.transactions || []).forEach(tr => {
        let fDate = tr.date || '';
        if (tr.date && tr.date.includes('-')) {
          const parts = tr.date.split('-');
          if (parts.length === 3 && parts[0].length === 4) {
            fDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
        }
        const row = sheet.addRow([
          fDate,
          tr.particulars || '',
          tr.voucherNo || '',
          tr.debit ? tr.debit : '',
          tr.credit ? tr.credit : ''
        ]);
        row.height = 20;

        for (let c = 1; c <= maxCols; c++) {
          const cell = row.getCell(c);
          cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };
          cell.border = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

          if (c >= 4) {
            if (typeof cell.value === 'number') cell.numFmt = numFormat;
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
          } else if (c === 1 || c === 3) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
          }
        }
      });

      // Total Row
      const totRow = sheet.addRow(['TOTAL', '', '', data.totalDebit || 0, data.totalCredit || 0]);
      totRow.height = 22;
      sheet.mergeCells(`A${totRow.number}:C${totRow.number}`);
      for (let c = 1; c <= maxCols; c++) {
        const cell = totRow.getCell(c);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF166534' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        cell.border = { top: mediumBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
        if (c >= 4) {
          cell.numFmt = numFormat;
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        }
      }

      // Closing Balance Row
      const clBal = Number(data.closingBalance) || 0;
      const clRow = sheet.addRow([
        'CLOSING BALANCE',
        '',
        '',
        clBal >= 0 ? clBal : '',
        clBal < 0 ? Math.abs(clBal) : ''
      ]);
      clRow.height = 22;
      sheet.mergeCells(`A${clRow.number}:C${clRow.number}`);
      for (let c = 1; c <= maxCols; c++) {
        const cell = clRow.getCell(c);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
        cell.border = { top: thinBorder, bottom: doubleBorder, left: thinBorder, right: thinBorder };
        if (c >= 4) {
          if (typeof cell.value === 'number') cell.numFmt = numFormat;
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const cleanName = (data.accountName || 'Statement').replace(/[^a-zA-Z0-9_-]/g, '_');
      const sDate = data.dateFrom || 'Start';
      const eDate = data.dateTo || 'End';
      link.download = `Statement_${cleanName}_${sDate}_${eDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      return true;
    } catch (err) {
      console.error('Failed to export Statement to Excel:', err);
      alert('Could not export Excel: ' + err.message);
      return false;
    }
  }

  /**
   * Export Individual Voucher to Excel (.xlsx)
   */
  async function exportVoucherToExcel(entry) {
    try {
      await ensureExcelJSLoaded();
      if (!global.ExcelJS) throw new Error('ExcelJS library could not be loaded.');

      const workbook = new global.ExcelJS.Workbook();
      workbook.creator = 'KYA Accounting';
      workbook.created = new Date();

      const isDraft = !!entry.isDraft;
      const sheet = workbook.addWorksheet(entry.voucherNo || 'Voucher', {
        views: [{ state: 'frozen', ySplit: 6, showGridLines: true }]
      });

      const maxCols = 5;
      const lastColLetter = 'E';

      sheet.getColumn(1).width = 8;
      sheet.getColumn(2).width = 14;
      sheet.getColumn(3).width = 44;
      sheet.getColumn(4).width = 22;
      sheet.getColumn(5).width = 22;

      const activeCo = (typeof getActiveCompany === 'function' ? getActiveCompany() : null) || {};
      const compName = (activeCo.name || 'KYA Accounting').toUpperCase();

      // Row 1: Company Name
      const r1 = sheet.addRow([compName]);
      r1.height = 24;
      sheet.mergeCells(`A1:${lastColLetter}1`);
      const cA1 = sheet.getCell('A1');
      cA1.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF1E3A8A' } };
      cA1.alignment = { vertical: 'middle', horizontal: 'left' };

      // Row 2: Title
      const r2 = sheet.addRow([isDraft ? 'DRAFT JOURNAL VOUCHER' : 'JOURNAL VOUCHER']);
      r2.height = 20;
      sheet.mergeCells(`A2:${lastColLetter}2`);
      const cA2 = sheet.getCell('A2');
      cA2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F172A' } };
      cA2.alignment = { vertical: 'middle', horizontal: 'left' };

      // Row 3: Voucher No & Date
      const r3 = sheet.addRow([`Voucher No: ${entry.voucherNo || '—'}`, '', `Date: ${formatRptDate(entry.date) || '—'}`]);
      r3.height = 18;
      sheet.mergeCells('A3:B3');
      sheet.mergeCells(`C3:${lastColLetter}3`);
      r3.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
      r3.getCell(3).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };

      // Row 4: Department & Type
      const deptObj = (entry.departmentId && entry.departmentId !== 'all')
        ? (typeof ohGetDeptById === 'function' ? ohGetDeptById(Number(entry.departmentId)) : null)
        : null;
      const deptName = deptObj ? deptObj.name : '—';
      const typeText = entry.isBudget === true ? 'Budget' : 'Non Budget';

      const r4 = sheet.addRow([`Department: ${deptName}`, '', `Type: ${typeText}  |  Prepared By: ${entry.preparedBy || '—'}`]);
      r4.height = 18;
      sheet.mergeCells('A4:B4');
      sheet.mergeCells(`C4:${lastColLetter}4`);
      r4.getCell(1).font = { name: 'Calibri', size: 10, color: { argb: 'FF64748B' } };
      r4.getCell(3).font = { name: 'Calibri', size: 10, color: { argb: 'FF64748B' } };

      // Row 5: Spacer
      const r5 = sheet.addRow([]);
      r5.height = 8;

      // Row 6: Column Headers
      const r6 = sheet.addRow(['#', 'Type', 'Particulars (Account Name)', 'Debit (INR)', 'Credit (INR)']);
      r6.height = 24;
      for (let c = 1; c <= maxCols; c++) {
        const cell = r6.getCell(c);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
        cell.border = { top: thinBorder, bottom: mediumBorder, left: thinBorder, right: thinBorder };
        cell.alignment = {
          vertical: 'middle',
          horizontal: c >= 4 ? 'right' : (c <= 2 ? 'center' : 'left'),
          indent: c === 3 ? 1 : 0
        };
      }

      // Data Rows
      const rows = entry.allRows || [];
      let totalDr = 0;
      let totalCr = 0;

      rows.forEach((r, idx) => {
        const dr = parseFloat(r.debit) || 0;
        const cr = parseFloat(r.credit) || 0;
        totalDr += dr;
        totalCr += cr;

        const row = sheet.addRow([
          idx + 1,
          r.type || (dr > 0 ? 'By' : 'To'),
          r.particular || '',
          dr ? dr : '',
          cr ? cr : ''
        ]);
        row.height = 20;

        for (let c = 1; c <= maxCols; c++) {
          const cell = row.getCell(c);
          cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };
          cell.border = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

          if (c >= 4) {
            if (typeof cell.value === 'number') cell.numFmt = numFormat;
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
          } else if (c <= 2) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
          }
        }
      });

      // Total Row
      const totRow = sheet.addRow(['TOTALS', '', '', totalDr, totalCr]);
      totRow.height = 22;
      sheet.mergeCells(`A${totRow.number}:C${totRow.number}`);
      for (let c = 1; c <= maxCols; c++) {
        const cell = totRow.getCell(c);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF166534' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        cell.border = { top: mediumBorder, bottom: doubleBorder, left: thinBorder, right: thinBorder };
        if (c >= 4) {
          cell.numFmt = numFormat;
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        }
      }

      // Narration Row
      if (entry.narration) {
        const rNarrSpacer = sheet.addRow([]);
        rNarrSpacer.height = 8;
        const rNarr = sheet.addRow([`Narration: ${entry.narration}`]);
        rNarr.height = 20;
        sheet.mergeCells(`A${rNarr.number}:${lastColLetter}${rNarr.number}`);
        const cNarr = rNarr.getCell(1);
        cNarr.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
        cNarr.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const vNum = (entry.voucherNo || 'Voucher').replace(/[^a-zA-Z0-9_-]/g, '_');
      const vDate = entry.date || 'Date';
      link.download = `Voucher_${vNum}_${vDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      return true;
    } catch (err) {
      console.error('Failed to export Voucher to Excel:', err);
      alert('Could not export Excel: ' + err.message);
      return false;
    }
  }

  /**
   * Export Individual Invoice to Excel (.xlsx)
   */
  async function exportInvoiceToExcel(inv) {
    try {
      await ensureExcelJSLoaded();
      if (!global.ExcelJS) throw new Error('ExcelJS library could not be loaded.');

      const workbook = new global.ExcelJS.Workbook();
      workbook.creator = 'KYA Accounting';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet(inv.invoiceNo || 'Invoice', {
        views: [{ state: 'frozen', ySplit: 6, showGridLines: true }]
      });

      const maxCols = 7;
      const lastColLetter = 'G';

      sheet.getColumn(1).width = 6;
      sheet.getColumn(2).width = 38;
      sheet.getColumn(3).width = 10;
      sheet.getColumn(4).width = 16;
      sheet.getColumn(5).width = 14;
      sheet.getColumn(6).width = 12;
      sheet.getColumn(7).width = 20;

      const activeCo = (typeof getActiveCompany === 'function' ? getActiveCompany() : null) || {};
      const compName = (activeCo.name || 'KYA Accounting').toUpperCase();
      const title = inv.isReturn ? 'CREDIT NOTE / SALES REVERSAL' : (inv.isOrder ? 'SALES PRE INVOICE' : 'TAX INVOICE');

      // Row 1: Company Name
      const r1 = sheet.addRow([compName]);
      r1.height = 24;
      sheet.mergeCells(`A1:${lastColLetter}1`);
      const cA1 = sheet.getCell('A1');
      cA1.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF1E3A8A' } };
      cA1.alignment = { vertical: 'middle', horizontal: 'left' };

      // Row 2: Title
      const r2 = sheet.addRow([title]);
      r2.height = 20;
      sheet.mergeCells(`A2:${lastColLetter}2`);
      const cA2 = sheet.getCell('A2');
      cA2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F172A' } };
      cA2.alignment = { vertical: 'middle', horizontal: 'left' };

      // Row 3: Invoice No & Date
      const customer = (typeof coaLedgers !== 'undefined' ? coaLedgers.find(l => l.id == inv.customerId) : null) || { name: 'Unknown Customer' };
      const r3 = sheet.addRow([`Invoice No: ${inv.invoiceNo || '—'}`, '', '', `Billed To: ${customer.name || '—'}`, '', `Date: ${formatRptDate(inv.date) || '—'}`]);
      r3.height = 18;
      sheet.mergeCells('A3:C3');
      sheet.mergeCells('D3:E3');
      sheet.mergeCells(`F3:${lastColLetter}3`);
      r3.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
      r3.getCell(4).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
      r3.getCell(6).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };

      // Row 4: Supply Type & Due Date
      const r4 = sheet.addRow([`Supply: ${inv.salesSupplyType || 'Intra-State'}`, '', '', `Due Date: ${formatRptDate(inv.dueDate || inv.date) || '—'}`]);
      r4.height = 18;
      sheet.mergeCells('A4:C4');
      sheet.mergeCells(`D4:${lastColLetter}4`);
      r4.getCell(1).font = { name: 'Calibri', size: 10, color: { argb: 'FF64748B' } };
      r4.getCell(4).font = { name: 'Calibri', size: 10, color: { argb: 'FF64748B' } };

      // Row 5: Spacer
      const r5 = sheet.addRow([]);
      r5.height = 8;

      // Row 6: Column Headers
      const r6 = sheet.addRow(['#', 'Description', 'Qty', 'Rate (INR)', 'Discount', 'Tax %', 'Amount (INR)']);
      r6.height = 24;
      for (let c = 1; c <= maxCols; c++) {
        const cell = r6.getCell(c);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
        cell.border = { top: thinBorder, bottom: mediumBorder, left: thinBorder, right: thinBorder };
        cell.alignment = {
          vertical: 'middle',
          horizontal: (c === 1 ? 'center' : (c === 2 ? 'left' : 'right')),
          indent: c === 2 ? 1 : 0
        };
      }

      // Data Rows
      (inv.rows || []).forEach((r, idx) => {
        let desc = '';
        let qty = 1;
        let rate = 0;
        if (inv.type === 'Product') {
          desc = r.item || 'Item';
          qty = r.qty || 1;
          rate = r.rate || 0;
        } else {
          const rev = (typeof coaLedgers !== 'undefined' ? coaLedgers.find(l => l.id == r.revenueLedgerId) : null);
          desc = rev ? rev.name : 'Revenue Account';
          qty = 1;
          rate = r.baseAmount || 0;
        }
        const base = qty * rate;
        const discAmt = r.discountType === 'pct' ? (base * (r.discount / 100)) : (r.discount || 0);
        const itemTotal = base - discAmt;
        const taxAmt = itemTotal * ((r.tax || 0) / 100);
        const finalAmt = itemTotal + taxAmt;
        const discStr = r.discountType === 'pct' ? `${r.discount}%` : (discAmt ? discAmt : '');

        const row = sheet.addRow([
          idx + 1,
          desc,
          qty,
          rate,
          discStr,
          r.tax ? `${r.tax}%` : '0%',
          finalAmt
        ]);
        row.height = 20;

        for (let c = 1; c <= maxCols; c++) {
          const cell = row.getCell(c);
          cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };
          cell.border = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

          if (c === 4 || c === 7) {
            cell.numFmt = numFormat;
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
          } else if (c === 3 || c === 5 || c === 6) {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
          } else if (c === 1) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
          }
        }
      });

      // Sub Total & Taxes
      const addSummaryRow = (label, val, isBold = false, isFinal = false) => {
        const row = sheet.addRow(['', '', '', '', '', label, val]);
        row.height = isFinal ? 22 : 20;
        sheet.mergeCells(`A${row.number}:E${row.number}`);
        for (let c = 1; c <= maxCols; c++) {
          const cell = row.getCell(c);
          cell.font = { name: 'Calibri', size: isFinal ? 11 : 10, bold: isBold, color: isFinal ? { argb: 'FF166534' } : { argb: 'FF334155' } };
          if (isFinal) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
            cell.border = { top: mediumBorder, bottom: doubleBorder, left: thinBorder, right: thinBorder };
          } else {
            cell.border = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
          }
          if (c === 7) {
            if (typeof cell.value === 'number') cell.numFmt = numFormat;
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
          } else if (c === 6) {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
          }
        }
      };

      addSummaryRow('Sub Total', inv.subTotal || 0, true);
      if (inv.taxTotal) addSummaryRow('Tax Total', inv.taxTotal);
      if (inv.tdsTcsMode && inv.tdsTcsMode !== 'None') {
        addSummaryRow(`${inv.tdsTcsMode} (${inv.tdsTcsRate}%)`, inv.tdsTcsAmount);
      }
      if (inv.adjustments) addSummaryRow('Round off', inv.adjustments);
      addSummaryRow('TOTAL AMOUNT', inv.total || 0, true, true);

      // Notes
      if (inv.notes) {
        const rNarrSpacer = sheet.addRow([]);
        rNarrSpacer.height = 8;
        const rNarr = sheet.addRow([`Terms & Notes: ${inv.notes}`]);
        rNarr.height = 20;
        sheet.mergeCells(`A${rNarr.number}:${lastColLetter}${rNarr.number}`);
        const cNarr = rNarr.getCell(1);
        cNarr.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
        cNarr.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const invNum = (inv.invoiceNo || 'Invoice').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `Invoice_${invNum}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      return true;
    } catch (err) {
      console.error('Failed to export Invoice to Excel:', err);
      alert('Could not export Excel: ' + err.message);
      return false;
    }
  }

  /**
   * Export Voucher Desk Register to Excel (.xlsx)
   */
  async function exportVoucherDeskToExcel(data) {
    try {
      await ensureExcelJSLoaded();
      if (!global.ExcelJS) throw new Error('ExcelJS library could not be loaded.');

      const workbook = new global.ExcelJS.Workbook();
      workbook.creator = 'KYA Accounting';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Voucher_Desk', {
        views: [{ state: 'frozen', ySplit: 5, showGridLines: true }]
      });

      const maxCols = 7;
      const lastColLetter = 'G';

      sheet.getColumn(1).width = 8;
      sheet.getColumn(2).width = 14;
      sheet.getColumn(3).width = 20;
      sheet.getColumn(4).width = 20;
      sheet.getColumn(5).width = 38;
      sheet.getColumn(6).width = 20;
      sheet.getColumn(7).width = 14;

      const compName = (data.companyName || 'KYA Accounting').toUpperCase();

      // Row 1: Company Name
      const r1 = sheet.addRow([compName]);
      r1.height = 24;
      sheet.mergeCells(`A1:${lastColLetter}1`);
      const cA1 = sheet.getCell('A1');
      cA1.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF1E3A8A' } };
      cA1.alignment = { vertical: 'middle', horizontal: 'left' };

      // Row 2: Title
      const r2 = sheet.addRow(['VOUCHER DESK / TRANSACTION REGISTER']);
      r2.height = 20;
      sheet.mergeCells(`A2:${lastColLetter}2`);
      const cA2 = sheet.getCell('A2');
      cA2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F172A' } };
      cA2.alignment = { vertical: 'middle', horizontal: 'left' };

      // Row 3: Subtitle / Filter Details
      const items = data.items || [];
      const filterStr = `Filter: Status: ${data.filterStatus || 'All'} • Type: ${data.filterType || 'All'} • Total Vouchers: ${items.length}`;
      const genStr = `Generated on: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
      const r3 = sheet.addRow([filterStr, '', '', '', '', '', genStr]);
      r3.height = 18;
      sheet.mergeCells('A3:E3');
      sheet.mergeCells(`F3:${lastColLetter}3`);
      r3.getCell(1).font = { name: 'Calibri', size: 9.5, color: { argb: 'FF64748B' } };
      r3.getCell(6).font = { name: 'Calibri', size: 9.5, color: { argb: 'FF64748B' } };
      r3.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };

      // Row 4: Spacer
      const r4 = sheet.addRow([]);
      r4.height = 6;

      // Row 5: Header Row
      const r5 = sheet.addRow(['#', 'Date', 'Voucher No.', 'Type', 'Particulars / Narration', 'Amount (INR)', 'Status']);
      r5.height = 24;
      for (let c = 1; c <= maxCols; c++) {
        const cell = r5.getCell(c);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
        cell.border = { top: thinBorder, bottom: mediumBorder, left: thinBorder, right: thinBorder };
        cell.alignment = {
          vertical: 'middle',
          horizontal: (c === 1 || c === 7 ? 'center' : (c === 6 ? 'right' : 'left')),
          indent: (c === 3 || c === 4 || c === 5 ? 1 : 0)
        };
      }

      let totalAmt = 0;
      items.forEach((item, idx) => {
        const cleanAmt = typeof item.amount === 'string' ? parseFloat(item.amount.replace(/,/g, '')) : Number(item.amount);
        const val = isNaN(cleanAmt) ? 0 : cleanAmt;
        totalAmt += val;

        const row = sheet.addRow([
          idx + 1,
          item.date || '—',
          item.voucherNo || '—',
          item.type || 'Journal Entry',
          item.particulars || '—',
          val,
          item.status || (item.isDraft ? 'Draft' : 'Posted')
        ]);
        row.height = 20;

        for (let c = 1; c <= maxCols; c++) {
          const cell = row.getCell(c);
          cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };
          cell.border = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

          if (c === 6) {
            cell.numFmt = numFormat;
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E3A8A' } };
          } else if (c === 1 || c === 7) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else if (c === 2) {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
          }
        }
      });

      // Total Row
      const rTot = sheet.addRow(['TOTAL AMOUNT', '', '', '', '', totalAmt, `${items.length} vouchers`]);
      rTot.height = 22;
      sheet.mergeCells(`A${rTot.number}:E${rTot.number}`);
      for (let c = 1; c <= maxCols; c++) {
        const cell = rTot.getCell(c);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        cell.border = { top: mediumBorder, bottom: doubleBorder, left: thinBorder, right: thinBorder };
        if (c === 6) {
          cell.numFmt = numFormat;
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
        } else if (c === 7) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF64748B' } };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'Voucher_Desk_Register.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      return true;
    } catch (err) {
      console.error('Failed to export Voucher Desk to Excel:', err);
      alert('Could not export Excel: ' + err.message);
      return false;
    }
  }

  // Export to global scope
  global.exportPnLToExcel = exportPnLToExcel;
  global.exportBalanceSheetToExcel = exportBalanceSheetToExcel;
  global.exportTrialBalanceToExcel = exportTrialBalanceToExcel;
  global.exportChartOfAccountsToExcel = exportChartOfAccountsToExcel;
  global.exportLedgersToExcel = exportLedgersToExcel;
  global.exportCustomersToExcel = exportCustomersToExcel;
  global.exportSuppliersToExcel = exportSuppliersToExcel;
  global.exportStatementToExcel = exportStatementToExcel;
  global.exportLedgerStatementToExcel = exportStatementToExcel;
  global.exportCustomerStatementToExcel = exportStatementToExcel;
  global.exportSupplierStatementToExcel = exportStatementToExcel;
  global.exportVoucherToExcel = exportVoucherToExcel;
  global.exportInvoiceToExcel = exportInvoiceToExcel;
  global.exportVoucherDeskToExcel = exportVoucherDeskToExcel;

})(typeof window !== 'undefined' ? window : this);
