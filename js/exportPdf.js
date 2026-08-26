/**
 * KYA - Financial Reports PDF Exporter
 * Generates beautifully formatted, print-ready PDF statements using jsPDF and jspdf-autotable.
 * Ensures strict horizontal number presentation with no vertical wrapping or clipping.
 */

(function (global) {
  'use strict';

  // ── Helper: Dynamically load jsPDF and jspdf-autotable if not present ─
  function ensureJsPDFLoaded() {
    return new Promise((resolve, reject) => {
      if (global.jspdf && global.jspdf.jsPDF && !global.jsPDF) {
        global.jsPDF = global.jspdf.jsPDF;
      }
      const hasJsPdf = !!(global.jspdf && global.jspdf.jsPDF) || !!global.jsPDF;
      const hasAutoTable = !!(global.jspdfAutotable || (global.jspdf && global.jspdf.jsPDF && global.jspdf.jsPDF.API && global.jspdf.jsPDF.API.autoTable) || (global.jsPDF && global.jsPDF.API && global.jsPDF.API.autoTable));
      
      if (hasJsPdf && hasAutoTable) {
        return resolve();
      }

      function loadScript(src) {
        return new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = src;
          s.onload = () => res();
          s.onerror = (e) => rej(e);
          document.head.appendChild(s);
        });
      }

      const p1 = hasJsPdf ? Promise.resolve() : loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      p1.then(() => {
        if (global.jspdf && global.jspdf.jsPDF && !global.jsPDF) {
          global.jsPDF = global.jspdf.jsPDF;
        }
        return loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
      }).then(() => {
        if (global.jspdf && global.jspdf.jsPDF && !global.jsPDF) {
          global.jsPDF = global.jspdf.jsPDF;
        }
        resolve();
      }).catch(reject);
    });
  }

  function fmtNum(val) {
    if (val === null || val === undefined || isNaN(val)) return '0.00';
    const num = Math.abs(Number(val));
    const formatted = num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return (val < 0 ? `(${formatted})` : formatted);
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

  // ── Helper: Draw Clean Vector Folder Icon ─────────────────────────
  function drawPdfFolderIcon(doc, x, y) {
    // Folder tab (back)
    doc.setFillColor(217, 119, 6); // Amber 600
    doc.roundedRect(x, y - 0.7, 1.8, 0.9, 0.2, 0.2, 'F');
    // Folder body (front)
    doc.setFillColor(245, 158, 11); // Amber 500
    doc.roundedRect(x, y, 3.8, 2.8, 0.3, 0.3, 'F');
    // Top highlight line
    doc.setDrawColor(254, 243, 199); // Amber 100
    doc.setLineWidth(0.18);
    doc.line(x + 0.5, y + 0.4, x + 3.3, y + 0.4);
  }

  // ── Helper: Draw Clean Vector Ledger Document Icon ────────────────
  function drawPdfLedgerIcon(doc, x, y) {
    // Miniature document / ledger page
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.setDrawColor(100, 116, 139); // Slate 500
    doc.setLineWidth(0.2);
    doc.roundedRect(x + 0.4, y - 0.3, 2.6, 3.2, 0.3, 0.3, 'FD');
    // Document text lines
    doc.setDrawColor(148, 163, 184); // Slate 400
    doc.setLineWidth(0.16);
    doc.line(x + 0.9, y + 0.5, x + 2.4, y + 0.5);
    doc.line(x + 0.9, y + 1.2, x + 2.4, y + 1.2);
    doc.line(x + 0.9, y + 1.9, x + 1.9, y + 1.9);
  }

  // ════════════════════════════════════════════════════════════════════
  // 1. PROFIT & LOSS STATEMENT PDF EXPORT
  // ════════════════════════════════════════════════════════════════════
  async function exportPnLToPDF(data) {
    try {
      await ensureJsPDFLoaded();

      const { jsPDF } = global.jspdf || global;
      if (!jsPDF) {
        throw new Error('jsPDF library could not be loaded.');
      }

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const isCompare = !!data.isCompare;

      // ── Branded Header Bar ──────────────────────────────────────────
      doc.setFillColor(30, 58, 138); // Navy Blue
      doc.rect(0, 0, pageWidth, 5, 'F');

      // ── Company & Document Titles ────────────────────────────────────
      const compName = (data.companyName || 'KYA Accounting').toUpperCase();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(30, 58, 138);
      doc.text(compName, 14, 16);

      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42); // Slate 900
      doc.text('PROFIT & LOSS STATEMENT', 14, 23);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139); // Slate 500

      let periodText = 'Statement of Income and Expenses';
      if (data.dateFrom || data.dateTo) {
        periodText = `Period: ${formatRptDate(data.dateFrom) || 'Beginning'} to ${formatRptDate(data.dateTo) || 'End'}`;
      }
      if (isCompare && (data.compareDateFrom || data.compareDateTo)) {
        periodText += `  |  Compare: ${formatRptDate(data.compareDateFrom) || 'Beginning'} to ${formatRptDate(data.compareDateTo) || 'End'}`;
      }
      doc.text(periodText, 14, 29);

      const genDateStr = `Generated on: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
      doc.text(genDateStr, pageWidth - 14, 29, { align: 'right' });

      // ── Divider ─────────────────────────────────────────────────────
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 32, pageWidth - 14, 32);

      // ── Build Table Headers & Columns ───────────────────────────────
      const col1Hdr = data.dateTo ? `Amount (${formatRptDate(data.dateTo)})` : 'Amount (INR)';
      const col2Hdr = data.compareDateTo ? `Amount (${formatRptDate(data.compareDateTo)})` : 'Compare Amount (INR)';

      let tableHeaders = [];
      if (isCompare) {
        tableHeaders = [['Particulars', col1Hdr, col2Hdr]];
      } else {
        tableHeaders = [['Particulars', col1Hdr]];
      }

      // ── Build Table Rows ────────────────────────────────────────────
      const tableBody = [];
      const rowMeta = [];

      function addRow(particulars, amt1, amt2, type = 'item', level = 0, isGroup = false) {
        const row = [particulars, typeof amt1 === 'number' ? fmtNum(amt1) : (amt1 || '')];
        if (isCompare) {
          row.push(typeof amt2 === 'number' ? fmtNum(amt2) : (amt2 || ''));
        }
        tableBody.push(row);
        rowMeta.push({ type, level, isGroup });
      }

      function addEmptyRow() {
        const row = isCompare ? ['', '', ''] : ['', ''];
        tableBody.push(row);
        rowMeta.push({ type: 'empty', level: 0, isGroup: false });
      }

      // 1. REVENUE
      addRow('I. REVENUE & INCOME', '', '', 'section-hdr', 0);
      (data.incomeData || []).forEach(sg => {
        addRow(sg.name, sg.amount1, sg.amount2, 'subgroup', 0);
        (sg.items || []).forEach(item => {
          if (item.isGroup) {
            addRow(`      ${item.name}`, item.amount1, item.amount2, 'group-ledger', 1, true);
            (item.children || []).forEach(child => {
              addRow(`          ${child.name}`, child.amount1, child.amount2, 'child-ledger', 2, false);
            });
          } else {
            addRow(`      ${item.name}`, item.amount1, item.amount2, 'ledger', 1, false);
          }
        });
      });
      addRow('Total Revenue (I)', data.totalRevenue1, data.totalRevenue2, 'subtotal-revenue', 0);

      addEmptyRow();

      // 2. EXPENSES
      addRow('II. EXPENSES', '', '', 'section-hdr', 0);
      (data.expenseData || []).forEach(sg => {
        addRow(sg.name, sg.amount1, sg.amount2, 'subgroup', 0);
        (sg.items || []).forEach(item => {
          if (item.isGroup) {
            addRow(`      ${item.name}`, item.amount1, item.amount2, 'group-ledger', 1, true);
            (item.children || []).forEach(child => {
              addRow(`          ${child.name}`, child.amount1, child.amount2, 'child-ledger', 2, false);
            });
          } else {
            addRow(`      ${item.name}`, item.amount1, item.amount2, 'ledger', 1, false);
          }
        });
      });
      addRow('Total Expenses (II)', data.totalExpenses1, data.totalExpenses2, 'subtotal-expense', 0);

      addEmptyRow();

      // 3. PROFITABILITY
      addRow('III. PROFITABILITY', '', '', 'section-hdr', 0);
      addRow('Profit Before Tax (PBT) (I - II)', data.pbt1, data.pbt2, 'subtotal-pbt', 0);
      if (data.taxBal1 !== 0 || (isCompare && data.taxBal2 !== 0)) {
        addRow('Less: Tax Expense', data.taxBal1, data.taxBal2, 'ledger', 1);
      }
      addRow('PROFIT AFTER TAX (PAT)', data.pat1, data.pat2, 'grandtotal-pat', 0);

      // ── AutoTable Generation ────────────────────────────────────────
      const autoTableConfig = {
        startY: 36,
        head: tableHeaders,
        body: tableBody,
        theme: 'plain',
        styles: {
          font: 'helvetica',
          fontSize: 8.5,
          cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 },
          textColor: [51, 65, 85],
          lineColor: [241, 245, 249],
          lineWidth: 0.2
        },
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'left'
        },
        columnStyles: isCompare ? {
          0: { cellWidth: 'auto', halign: 'left' },
          1: { cellWidth: 44, halign: 'right', fontStyle: 'bold' },
          2: { cellWidth: 44, halign: 'right', fontStyle: 'bold' }
        } : {
          0: { cellWidth: 'auto', halign: 'left' },
          1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: function (hookData) {
          if (hookData.section === 'head') {
            if (hookData.column.index > 0) {
              hookData.cell.styles.halign = 'right';
            }
            return;
          }

          const meta = rowMeta[hookData.row.index];
          if (!meta) return;

          if (meta.type === 'section-hdr') {
            hookData.cell.styles.fillColor = [226, 232, 240];
            hookData.cell.styles.textColor = [30, 58, 138];
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.fontSize = 9;
          } else if (meta.type === 'subgroup') {
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.textColor = [15, 23, 42];
          } else if (meta.type === 'group-ledger') {
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.textColor = [180, 83, 9];
          } else if (meta.type === 'child-ledger' || meta.type === 'ledger') {
            hookData.cell.styles.textColor = [100, 116, 139];
            if (hookData.column.index === 0) {
              hookData.cell.styles.fontStyle = 'normal';
            }
          } else if (meta.type === 'subtotal-revenue') {
            hookData.cell.styles.fillColor = [240, 253, 244];
            hookData.cell.styles.textColor = [22, 101, 52];
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.lineWidth = { top: 0.5, bottom: 0.5 };
            hookData.cell.styles.lineColor = [187, 247, 208];
          } else if (meta.type === 'subtotal-expense') {
            hookData.cell.styles.fillColor = [254, 242, 242];
            hookData.cell.styles.textColor = [153, 27, 27];
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.lineWidth = { top: 0.5, bottom: 0.5 };
            hookData.cell.styles.lineColor = [254, 202, 202];
          } else if (meta.type === 'subtotal-pbt') {
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.textColor = [15, 23, 42];
            hookData.cell.styles.fillColor = [248, 250, 252];
          } else if (meta.type === 'grandtotal-pat') {
            hookData.cell.styles.fillColor = [30, 58, 138];
            hookData.cell.styles.textColor = [255, 255, 255];
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.fontSize = 9.5;
          } else if (meta.type === 'empty') {
            hookData.cell.styles.cellPadding = 1;
          }

          if (hookData.column.index > 0) {
            hookData.cell.styles.halign = 'right';
          }
        },
        didDrawCell: function (hookData) {
          if (hookData.section !== 'body' || hookData.column.index !== 0) return;
          const meta = rowMeta[hookData.row.index];
          if (!meta || !meta.isGroup) return;

          const iconX = hookData.cell.x + 3.5 + (meta.level || 1) * 3.5;
          const iconY = hookData.cell.y + (hookData.cell.height / 2) - 1.4;
          drawPdfFolderIcon(doc, iconX, iconY);
        },
        didDrawPage: function (pageData) {
          const str = `Page ${doc.internal.getNumberOfPages()}`;
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(str, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
          doc.text('KYA Accounting • Confidential', 14, doc.internal.pageSize.getHeight() - 8);
        },
        margin: { left: 14, right: 14, bottom: 16 }
      };

      if (typeof doc.autoTable === 'function') {
        doc.autoTable(autoTableConfig);
      } else if (global.jspdf && typeof global.jspdf.autoTable === 'function') {
        global.jspdf.autoTable(doc, autoTableConfig);
      } else if (typeof global.autoTable === 'function') {
        global.autoTable(doc, autoTableConfig);
      } else if (global.jsPDF && global.jsPDF.API && typeof global.jsPDF.API.autoTable === 'function') {
        global.jsPDF.API.autoTable.call(doc, autoTableConfig);
      } else {
        throw new Error('jspdf-autotable plugin is not available on jsPDF instance.');
      }

      // ── Download PDF ────────────────────────────────────────────────
      const sDate = data.dateFrom || 'Start';
      const eDate = data.dateTo || 'End';
      const fileName = `PnL_${sDate}_${eDate}.pdf`;
      doc.save(fileName);
      return true;
    } catch (err) {
      console.error('Failed to export P&L to PDF:', err);
      alert('Could not export PDF: ' + err.message);
      return false;
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // 2. BALANCE SHEET STATEMENT PDF EXPORT
  // ════════════════════════════════════════════════════════════════════
  async function exportBalanceSheetToPDF(data) {
    try {
      await ensureJsPDFLoaded();

      const { jsPDF } = global.jspdf || global;
      if (!jsPDF) {
        throw new Error('jsPDF library could not be loaded.');
      }

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const isCompare = !!data.isCompare;

      // ── Branded Header Bar ──────────────────────────────────────────
      doc.setFillColor(30, 58, 138); // Navy Blue
      doc.rect(0, 0, pageWidth, 5, 'F');

      // ── Company & Document Titles ────────────────────────────────────
      const compName = (data.companyName || 'KYA Accounting').toUpperCase();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(30, 58, 138);
      doc.text(compName, 14, 16);

      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42); // Slate 900
      doc.text('BALANCE SHEET', 14, 23);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139); // Slate 500

      let periodText = 'Statement of Financial Position';
      if (data.dateTo) {
        periodText = `As of: ${formatRptDate(data.dateTo)}`;
      }
      if (isCompare && data.compareDateTo) {
        periodText += `  |  Compare: As of ${formatRptDate(data.compareDateTo)}`;
      }
      doc.text(periodText, 14, 29);

      const genDateStr = `Generated on: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
      doc.text(genDateStr, pageWidth - 14, 29, { align: 'right' });

      // ── Divider ─────────────────────────────────────────────────────
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 32, pageWidth - 14, 32);

      // ── Build Table Headers & Columns ───────────────────────────────
      const col1Title = data.dateTo ? `As of ${formatRptDate(data.dateTo)}` : 'Amount (INR)';
      const col2Title = data.compareDateTo ? `As of ${formatRptDate(data.compareDateTo)}` : 'Compare (INR)';

      let tableHeaders = [];
      if (isCompare) {
        tableHeaders = [['Particulars', col1Title, col2Title]];
      } else {
        tableHeaders = [['Particulars', col1Title]];
      }

      // ── Build Table Rows ────────────────────────────────────────────
      const tableBody = [];
      const rowMeta = [];

      function addRow(particulars, amt1, amt2, type = 'item', level = 0, isGroup = false) {
        const row = [particulars, typeof amt1 === 'number' ? fmtNum(amt1) : (amt1 || '')];
        if (isCompare) {
          row.push(typeof amt2 === 'number' ? fmtNum(amt2) : (amt2 || ''));
        }
        tableBody.push(row);
        rowMeta.push({ type, level, isGroup });
      }

      function addEmptyRow() {
        const row = isCompare ? ['', '', ''] : ['', ''];
        tableBody.push(row);
        rowMeta.push({ type: 'empty', level: 0, isGroup: false });
      }

      function renderItems(items, indentLevel = 1) {
        (items || []).forEach(item => {
          if (item.isGroup) {
            addRow(`      ${item.name}`, item.amount1, item.amount2, 'group-ledger', indentLevel, true);
            (item.children || []).forEach(ch => {
              addRow(`          ${ch.name}`, ch.amount1, ch.amount2, 'child-ledger', indentLevel + 1, false);
            });
          } else {
            addRow(`      ${item.name}`, item.amount1, item.amount2, 'ledger', indentLevel, false);
          }
        });
      }

      (data.mainGroups || []).forEach((mg, mgIdx) => {
        if (mgIdx > 0) addEmptyRow();

        // Main group header
        addRow(mg.name.toUpperCase(), mg.total1, mg.total2, 'section-hdr', 0, false);

        (mg.subgroups || []).forEach(sg => {
          addRow(`  ${sg.name}`, sg.amount1, sg.amount2, 'subgroup', 0, false);
          if (sg.hasChildren && sg.l2Subgroups) {
            sg.l2Subgroups.forEach(l2 => {
              addRow(`    ${l2.name}`, l2.amount1, l2.amount2, 'subgroup-l2', 1, false);
              renderItems(l2.items, 2);
            });
          } else {
            renderItems(sg.items, 1);
          }
        });

        addRow(`Total ${mg.name}`, mg.total1, mg.total2, 'subtotal-mg', 0, false);
      });

      // ── AutoTable Generation ────────────────────────────────────────
      const autoTableConfig = {
        startY: 36,
        head: tableHeaders,
        body: tableBody,
        theme: 'plain',
        styles: {
          font: 'helvetica',
          fontSize: 8.5,
          cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 },
          textColor: [51, 65, 85],
          lineColor: [241, 245, 249],
          lineWidth: 0.2
        },
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'left'
        },
        columnStyles: isCompare ? {
          0: { cellWidth: 'auto', halign: 'left' },
          1: { cellWidth: 44, halign: 'right', fontStyle: 'bold' },
          2: { cellWidth: 44, halign: 'right', fontStyle: 'bold' }
        } : {
          0: { cellWidth: 'auto', halign: 'left' },
          1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: function (hookData) {
          if (hookData.section === 'head') {
            if (hookData.column.index > 0) {
              hookData.cell.styles.halign = 'right';
            }
            return;
          }

          const meta = rowMeta[hookData.row.index];
          if (!meta) return;

          if (meta.type === 'section-hdr') {
            hookData.cell.styles.fillColor = [226, 232, 240];
            hookData.cell.styles.textColor = [30, 58, 138];
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.fontSize = 9;
          } else if (meta.type === 'subgroup') {
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.textColor = [15, 23, 42];
          } else if (meta.type === 'subgroup-l2') {
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.textColor = [51, 65, 85];
          } else if (meta.type === 'group-ledger') {
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.textColor = [180, 83, 9];
          } else if (meta.type === 'child-ledger' || meta.type === 'ledger') {
            hookData.cell.styles.textColor = [100, 116, 139];
            if (hookData.column.index === 0) {
              hookData.cell.styles.fontStyle = 'normal';
            }
          } else if (meta.type === 'subtotal-mg') {
            hookData.cell.styles.fillColor = [240, 253, 244];
            hookData.cell.styles.textColor = [22, 101, 52];
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.fontSize = 9;
            hookData.cell.styles.lineWidth = { top: 0.5, bottom: 0.5 };
            hookData.cell.styles.lineColor = [187, 247, 208];
          } else if (meta.type === 'empty') {
            hookData.cell.styles.cellPadding = 1;
          }

          if (hookData.column.index > 0) {
            hookData.cell.styles.halign = 'right';
          }
        },
        didDrawCell: function (hookData) {
          if (hookData.section !== 'body' || hookData.column.index !== 0) return;
          const meta = rowMeta[hookData.row.index];
          if (!meta || !meta.isGroup) return;

          const iconX = hookData.cell.x + 3.5 + (meta.level || 1) * 3.5;
          const iconY = hookData.cell.y + (hookData.cell.height / 2) - 1.4;
          drawPdfFolderIcon(doc, iconX, iconY);
        },
        didDrawPage: function (pageData) {
          const str = `Page ${doc.internal.getNumberOfPages()}`;
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(str, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
          doc.text('KYA Accounting • Confidential', 14, doc.internal.pageSize.getHeight() - 8);
        },
        margin: { left: 14, right: 14, bottom: 16 }
      };

      if (typeof doc.autoTable === 'function') {
        doc.autoTable(autoTableConfig);
      } else if (global.jspdf && typeof global.jspdf.autoTable === 'function') {
        global.jspdf.autoTable(doc, autoTableConfig);
      } else if (typeof global.autoTable === 'function') {
        global.autoTable(doc, autoTableConfig);
      } else if (global.jsPDF && global.jsPDF.API && typeof global.jsPDF.API.autoTable === 'function') {
        global.jsPDF.API.autoTable.call(doc, autoTableConfig);
      } else {
        throw new Error('jspdf-autotable plugin is not available on jsPDF instance.');
      }

      // ── Download PDF ────────────────────────────────────────────────
      const sDate = data.dateFrom || 'Start';
      const eDate = data.dateTo || 'End';
      const fileName = `BalanceSheet_${sDate}_${eDate}.pdf`;
      doc.save(fileName);
      return true;
    } catch (err) {
      console.error('Failed to export Balance Sheet to PDF:', err);
      alert('Could not export PDF: ' + err.message);
      return false;
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // 3. TRIAL BALANCE PDF EXPORT
  // ════════════════════════════════════════════════════════════════════
  async function exportTrialBalanceToPDF(data) {
    try {
      await ensureJsPDFLoaded();

      const { jsPDF } = global.jspdf || global;
      if (!jsPDF) {
        throw new Error('jsPDF library could not be loaded.');
      }

      const optCols = data.optionalCols || {};
      const headRow = ['#', 'Particulars'];
      if (optCols.gl) headRow.push('Group Ledger');
      if (optCols.sg) headRow.push('Sub Group');
      if (optCols.mg) headRow.push('Main Group');
      if (optCols.plbs) headRow.push('PL/BS');
      headRow.push('Dr (INR)', 'Cr (INR)');

      const totalColsCount = headRow.length;
      const isLandscape = totalColsCount > 4;

      const doc = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();

      // ── Branded Header Bar ──────────────────────────────────────────
      doc.setFillColor(30, 58, 138); // Navy Blue
      doc.rect(0, 0, pageWidth, 5, 'F');

      // ── Company & Document Titles ────────────────────────────────────
      const compName = (data.companyName || 'KYA Accounting').toUpperCase();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(30, 58, 138);
      doc.text(compName, 14, 16);

      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('TRIAL BALANCE', 14, 23);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);

      let periodText = 'Summary of ledger balances';
      if (data.dateFrom || data.dateTo) {
        periodText = `Period: ${formatRptDate(data.dateFrom) || 'Beginning'} to ${formatRptDate(data.dateTo) || 'End'}`;
      }
      doc.text(periodText, 14, 29);

      const genDateStr = `Generated on: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
      doc.text(genDateStr, pageWidth - 14, 29, { align: 'right' });

      // ── Divider ─────────────────────────────────────────────────────
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 32, pageWidth - 14, 32);

      // ── Build Table Headers & Columns ───────────────────────────────
      const tableHeaders = [headRow];
      const tableBody = [];
      const rowMeta = [];

      (data.items || []).forEach(item => {
        const row = [
          { content: String(item.slNo), styles: { halign: 'center' } },
          item.name + (item.code ? ` (${item.code})` : '')
        ];
        if (optCols.gl) row.push(item.gl || '—');
        if (optCols.sg) row.push(item.sg || '—');
        if (optCols.mg) row.push(item.mg || '—');
        if (optCols.plbs) row.push({ content: item.plbs || '—', styles: { halign: 'center' } });
        
        row.push({
          content: item.drVal !== 0 ? fmtNum(item.drVal) : '—',
          styles: { halign: 'right', fontStyle: item.drVal !== 0 ? 'bold' : 'normal' }
        });
        row.push({
          content: item.crVal !== 0 ? fmtNum(item.crVal) : '—',
          styles: { halign: 'right', fontStyle: item.crVal !== 0 ? 'bold' : 'normal' }
        });
        tableBody.push(row);
        rowMeta.push({ type: 'item' });
      });

      const drColIdx = totalColsCount - 2;
      const crColIdx = totalColsCount - 1;
      const nonAmountColsCount = totalColsCount - 2;

      // Total row spanning horizontally across non-amount columns
      const totRow = [
        {
          content: 'TOTAL',
          colSpan: nonAmountColsCount,
          styles: { halign: 'left', fontStyle: 'bold' }
        },
        {
          content: fmtNum(data.totalDr),
          styles: { halign: 'right', fontStyle: 'bold' }
        },
        {
          content: fmtNum(data.totalCr),
          styles: { halign: 'right', fontStyle: 'bold' }
        }
      ];
      tableBody.push(totRow);
      rowMeta.push({ type: 'total' });

      // ── AutoTable Generation ────────────────────────────────────────
      const columnStyles = {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 'auto', halign: 'left' }
      };

      if (optCols.gl) {
        columnStyles[2] = { cellWidth: isLandscape ? 38 : 26, halign: 'left' };
      }
      if (optCols.sg) {
        columnStyles[optCols.gl ? 3 : 2] = { cellWidth: isLandscape ? 38 : 26, halign: 'left' };
      }
      if (optCols.mg) {
        columnStyles[(optCols.gl ? 1 : 0) + (optCols.sg ? 1 : 0) + 2] = { cellWidth: isLandscape ? 34 : 22, halign: 'left' };
      }
      if (optCols.plbs) {
        columnStyles[drColIdx - 1] = { cellWidth: 16, halign: 'center' };
      }

      columnStyles[drColIdx] = { cellWidth: isLandscape ? 44 : 38, halign: 'right', fontStyle: 'bold' };
      columnStyles[crColIdx] = { cellWidth: isLandscape ? 44 : 38, halign: 'right', fontStyle: 'bold' };

      const autoTableConfig = {
        startY: 36,
        head: tableHeaders,
        body: tableBody,
        theme: 'plain',
        styles: {
          font: 'helvetica',
          fontSize: 8.5,
          cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 },
          textColor: [51, 65, 85],
          lineColor: [241, 245, 249],
          lineWidth: 0.2
        },
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'left'
        },
        columnStyles,
        didParseCell: function (hookData) {
          if (hookData.section === 'head') {
            if (hookData.column.index === 0) {
              hookData.cell.styles.halign = 'center';
            } else if (hookData.column.index >= drColIdx) {
              hookData.cell.styles.halign = 'right';
            }
            return;
          }

          const meta = rowMeta[hookData.row.index];
          if (!meta) return;

          if (meta.type === 'total') {
            hookData.cell.styles.fillColor = [240, 253, 244];
            hookData.cell.styles.textColor = [30, 58, 138];
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.fontSize = 9;
            hookData.cell.styles.lineWidth = { top: 0.5, bottom: 0.5 };
            hookData.cell.styles.lineColor = [187, 247, 208];
            if (hookData.column.index >= drColIdx) {
              hookData.cell.styles.halign = 'right';
            }
          }
        },
        didDrawPage: function (pageData) {
          const str = `Page ${doc.internal.getNumberOfPages()}`;
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(str, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
          doc.text('KYA Accounting • Confidential', 14, doc.internal.pageSize.getHeight() - 8);
        },
        margin: { left: 14, right: 14, bottom: 16 }
      };

      if (typeof doc.autoTable === 'function') {
        doc.autoTable(autoTableConfig);
      } else if (global.jspdf && typeof global.jspdf.autoTable === 'function') {
        global.jspdf.autoTable(doc, autoTableConfig);
      } else if (typeof global.autoTable === 'function') {
        global.autoTable(doc, autoTableConfig);
      } else if (global.jsPDF && global.jsPDF.API && typeof global.jsPDF.API.autoTable === 'function') {
        global.jsPDF.API.autoTable.call(doc, autoTableConfig);
      } else {
        throw new Error('jspdf-autotable plugin is not available on jsPDF instance.');
      }

      // ── Download PDF ────────────────────────────────────────────────
      const sDate = data.dateFrom || 'Start';
      const eDate = data.dateTo || 'End';
      const fileName = `TrialBalance_${sDate}_${eDate}.pdf`;
      doc.save(fileName);
      return true;
    } catch (err) {
      console.error('Failed to export Trial Balance to PDF:', err);
      alert('Could not export PDF: ' + err.message);
      return false;
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // 4. CHART OF ACCOUNTS PDF EXPORT
  // ════════════════════════════════════════════════════════════════════
  async function exportChartOfAccountsToPDF(data) {
    try {
      await ensureJsPDFLoaded();
      const { jsPDF } = global.jspdf || global;
      if (!jsPDF) throw new Error('jsPDF library could not be loaded.');

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, pageWidth, 5, 'F');

      const compName = (data.companyName || 'KYA Accounting').toUpperCase();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(30, 58, 138);
      doc.text(compName, 14, 16);

      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('CHART OF ACCOUNTS', 14, 23);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Complete Master Accounts Hierarchy', 14, 29);

      const genDateStr = `Generated on: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
      doc.text(genDateStr, pageWidth - 14, 29, { align: 'right' });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 32, pageWidth - 14, 32);

      const tableHeaders = [['Account / Group Name', 'Code', 'Type', 'Sub Group / Parent', 'Opening Bal (INR)']];
      const tableBody = [];
      const rowMeta = [];

      function addRow(name, code, type, sgParent, opBal, rowType = 'item', level = 1, isGroup = false) {
        const balStr = (typeof opBal === 'number' && opBal !== 0) ? fmtNum(opBal) : (opBal ? String(opBal) : '—');
        tableBody.push([name, code || '—', type || '—', sgParent || '—', balStr]);
        rowMeta.push({ type: rowType, level: level, isGroup: isGroup });
      }

      (data.mainGroups || []).forEach((mg, idx) => {
        if (idx > 0) {
          tableBody.push(['', '', '', '', '']);
          rowMeta.push({ type: 'empty', level: 0, isGroup: false });
        }
        addRow(mg.name.toUpperCase(), '', 'Main Group', '', '', 'section-hdr', 0, false);
        (mg.items || []).forEach(item => {
          const isGrp = !!item.isGroup;
          addRow(item.name, item.code, item.type, item.parentName, item.openingBalance, isGrp ? 'group' : 'ledger', item.level || 1, isGrp);
        });
      });

      const autoTableConfig = {
        startY: 36,
        head: tableHeaders,
        body: tableBody,
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 8.5, cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 }, textColor: [51, 65, 85], lineColor: [241, 245, 249], lineWidth: 0.2 },
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'left' },
        columnStyles: {
          0: { cellWidth: 'auto', halign: 'left' },
          1: { cellWidth: 24, halign: 'left' },
          2: { cellWidth: 26, halign: 'left' },
          3: { cellWidth: 38, halign: 'left' },
          4: { cellWidth: 38, halign: 'right' }
        },
        didParseCell: function (hookData) {
          if (hookData.section === 'head') {
            if (hookData.column.index === 4) hookData.cell.styles.halign = 'right';
            return;
          }
          const meta = rowMeta[hookData.row.index];
          if (!meta) return;
          if (meta.type === 'section-hdr') {
            hookData.cell.styles.fillColor = [226, 232, 240];
            hookData.cell.styles.textColor = [30, 58, 138];
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.fontSize = 9;
          } else if (meta.type === 'group') {
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.textColor = [180, 83, 9];
          } else if (meta.type === 'empty') {
            hookData.cell.styles.cellPadding = 1;
          }

          if (hookData.column.index === 0 && meta.type !== 'section-hdr' && meta.type !== 'empty') {
            const indentLevel = meta.level || 1;
            hookData.cell.styles.cellPadding = {
              top: 2.2,
              bottom: 2.2,
              left: 3 + indentLevel * 4.2 + 5.5,
              right: 3
            };
          }

          if (hookData.column.index === 4) {
            hookData.cell.styles.halign = 'right';
          }
        },
        didDrawCell: function (hookData) {
          if (hookData.section !== 'body' || hookData.column.index !== 0) return;
          const meta = rowMeta[hookData.row.index];
          if (!meta || meta.type === 'section-hdr' || meta.type === 'empty') return;

          const indentLevel = meta.level || 1;
          const iconX = hookData.cell.x + 3 + indentLevel * 4.2;
          const iconY = hookData.cell.y + (hookData.cell.height / 2) - 1.4;

          if (meta.isGroup || meta.type === 'group') {
            drawPdfFolderIcon(doc, iconX, iconY);
          } else {
            drawPdfLedgerIcon(doc, iconX, iconY);
          }
        },
        didDrawPage: function () {
          const str = `Page ${doc.internal.getNumberOfPages()}`;
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(str, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
          doc.text('KYA Accounting • Confidential', 14, doc.internal.pageSize.getHeight() - 8);
        },
        margin: { left: 14, right: 14, bottom: 16 }
      };

      if (typeof doc.autoTable === 'function') doc.autoTable(autoTableConfig);
      else if (global.jspdf && typeof global.jspdf.autoTable === 'function') global.jspdf.autoTable(doc, autoTableConfig);
      else if (typeof global.autoTable === 'function') global.autoTable(doc, autoTableConfig);

      doc.save('ChartOfAccounts.pdf');
      return true;
    } catch (err) {
      console.error('Failed to export Chart of Accounts to PDF:', err);
      alert('Could not export PDF: ' + err.message);
      return false;
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // 5. LEDGERS LIST PDF EXPORT
  // ════════════════════════════════════════════════════════════════════
  async function exportLedgersToPDF(data) {
    try {
      await ensureJsPDFLoaded();
      const { jsPDF } = global.jspdf || global;
      if (!jsPDF) throw new Error('jsPDF library could not be loaded.');

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, pageWidth, 5, 'F');

      const compName = (data.companyName || 'KYA Accounting').toUpperCase();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(30, 58, 138);
      doc.text(compName, 14, 16);

      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('LIST OF ACCOUNTS (LEDGERS)', 14, 23);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Total Accounts: ${(data.items || []).length}`, 14, 29);

      const genDateStr = `Generated on: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
      doc.text(genDateStr, pageWidth - 14, 29, { align: 'right' });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 32, pageWidth - 14, 32);

      const tableHeaders = [['#', 'Ledger Name', 'Code', 'Sub Group', 'Main Group', 'Opening Bal (INR)']];
      const tableBody = [];
      let totalOpBal = 0;

      (data.items || []).forEach((item, idx) => {
        const opVal = Number(item.openingBalance) || 0;
        totalOpBal += opVal;
        tableBody.push([
          { content: String(idx + 1), styles: { halign: 'center' } },
          item.name,
          item.code || '—',
          item.sgName || '—',
          item.mgName || '—',
          { content: opVal !== 0 ? fmtNum(opVal) : '—', styles: { halign: 'right' } }
        ]);
      });

      // Total row
      tableBody.push([
        { content: 'TOTAL', colSpan: 5, styles: { halign: 'left', fontStyle: 'bold', fillColor: [240, 253, 244], textColor: [30, 58, 138] } },
        { content: fmtNum(totalOpBal), styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 253, 244], textColor: [30, 58, 138] } }
      ]);

      const autoTableConfig = {
        startY: 36,
        head: tableHeaders,
        body: tableBody,
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 8.5, cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 }, textColor: [51, 65, 85], lineColor: [241, 245, 249], lineWidth: 0.2 },
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'left' },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 'auto', halign: 'left', fontStyle: 'bold' },
          2: { cellWidth: 24, halign: 'left' },
          3: { cellWidth: 38, halign: 'left' },
          4: { cellWidth: 32, halign: 'left' },
          5: { cellWidth: 38, halign: 'right' }
        },
        didParseCell: function (hookData) {
          if (hookData.section === 'head') {
            if (hookData.column.index === 0) hookData.cell.styles.halign = 'center';
            if (hookData.column.index === 5) hookData.cell.styles.halign = 'right';
          }
        },
        didDrawPage: function () {
          const str = `Page ${doc.internal.getNumberOfPages()}`;
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(str, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
          doc.text('KYA Accounting • Confidential', 14, doc.internal.pageSize.getHeight() - 8);
        },
        margin: { left: 14, right: 14, bottom: 16 }
      };

      if (typeof doc.autoTable === 'function') doc.autoTable(autoTableConfig);
      else if (global.jspdf && typeof global.jspdf.autoTable === 'function') global.jspdf.autoTable(doc, autoTableConfig);
      else if (typeof global.autoTable === 'function') global.autoTable(doc, autoTableConfig);

      doc.save('Ledgers_List.pdf');
      return true;
    } catch (err) {
      console.error('Failed to export Ledgers to PDF:', err);
      alert('Could not export PDF: ' + err.message);
      return false;
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // 6. CUSTOMERS LIST PDF EXPORT
  // ════════════════════════════════════════════════════════════════════
  async function exportCustomersToPDF(data) {
    try {
      await ensureJsPDFLoaded();
      const { jsPDF } = global.jspdf || global;
      if (!jsPDF) throw new Error('jsPDF library could not be loaded.');

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, pageWidth, 5, 'F');

      const compName = (data.companyName || 'KYA Accounting').toUpperCase();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(30, 58, 138);
      doc.text(compName, 14, 16);

      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('CUSTOMERS MASTER LIST', 14, 23);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Total Customers: ${(data.items || []).length} • Trade Receivables`, 14, 29);

      const genDateStr = `Generated on: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
      doc.text(genDateStr, pageWidth - 14, 29, { align: 'right' });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 32, pageWidth - 14, 32);

      const tableHeaders = [['#', 'Customer Name', 'Code / Alias', 'Phone / Mobile', 'Email', 'GSTIN / State', 'Opening Bal (INR)']];
      const tableBody = [];
      let totalOpBal = 0;

      (data.items || []).forEach((item, idx) => {
        const opVal = Number(item.openingBalance) || 0;
        totalOpBal += opVal;
        tableBody.push([
          { content: String(idx + 1), styles: { halign: 'center' } },
          item.name,
          item.code || (Array.isArray(item.aliases) ? item.aliases.join(', ') : '—') || '—',
          item.phone || '—',
          item.email || '—',
          item.gstin || item.state || '—',
          { content: opVal !== 0 ? fmtNum(opVal) : '—', styles: { halign: 'right' } }
        ]);
      });

      // Total row
      tableBody.push([
        { content: 'TOTAL', colSpan: 6, styles: { halign: 'left', fontStyle: 'bold', fillColor: [240, 253, 244], textColor: [30, 58, 138] } },
        { content: fmtNum(totalOpBal), styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 253, 244], textColor: [30, 58, 138] } }
      ]);

      const autoTableConfig = {
        startY: 36,
        head: tableHeaders,
        body: tableBody,
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 8.5, cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 }, textColor: [51, 65, 85], lineColor: [241, 245, 249], lineWidth: 0.2 },
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'left' },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 'auto', halign: 'left', fontStyle: 'bold' },
          2: { cellWidth: 32, halign: 'left' },
          3: { cellWidth: 35, halign: 'left' },
          4: { cellWidth: 42, halign: 'left' },
          5: { cellWidth: 38, halign: 'left' },
          6: { cellWidth: 42, halign: 'right' }
        },
        didParseCell: function (hookData) {
          if (hookData.section === 'head') {
            if (hookData.column.index === 0) hookData.cell.styles.halign = 'center';
            if (hookData.column.index === 6) hookData.cell.styles.halign = 'right';
          }
        },
        didDrawPage: function () {
          const str = `Page ${doc.internal.getNumberOfPages()}`;
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(str, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
          doc.text('KYA Accounting • Confidential', 14, doc.internal.pageSize.getHeight() - 8);
        },
        margin: { left: 14, right: 14, bottom: 16 }
      };

      if (typeof doc.autoTable === 'function') doc.autoTable(autoTableConfig);
      else if (global.jspdf && typeof global.jspdf.autoTable === 'function') global.jspdf.autoTable(doc, autoTableConfig);
      else if (typeof global.autoTable === 'function') global.autoTable(doc, autoTableConfig);

      doc.save('Customers_List.pdf');
      return true;
    } catch (err) {
      console.error('Failed to export Customers to PDF:', err);
      alert('Could not export PDF: ' + err.message);
      return false;
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // 7. SUPPLIERS LIST PDF EXPORT
  // ════════════════════════════════════════════════════════════════════
  async function exportSuppliersToPDF(data) {
    try {
      await ensureJsPDFLoaded();
      const { jsPDF } = global.jspdf || global;
      if (!jsPDF) throw new Error('jsPDF library could not be loaded.');

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, pageWidth, 5, 'F');

      const compName = (data.companyName || 'KYA Accounting').toUpperCase();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(30, 58, 138);
      doc.text(compName, 14, 16);

      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('SUPPLIERS MASTER LIST', 14, 23);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Total Suppliers: ${(data.items || []).length} • Trade Payables`, 14, 29);

      const genDateStr = `Generated on: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
      doc.text(genDateStr, pageWidth - 14, 29, { align: 'right' });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 32, pageWidth - 14, 32);

      const tableHeaders = [['#', 'Supplier Name', 'Code / Alias', 'Phone / Mobile', 'Email', 'GSTIN / State', 'Opening Bal (INR)']];
      const tableBody = [];
      let totalOpBal = 0;

      (data.items || []).forEach((item, idx) => {
        const opVal = Number(item.openingBalance) || 0;
        totalOpBal += opVal;
        tableBody.push([
          { content: String(idx + 1), styles: { halign: 'center' } },
          item.name,
          item.code || (Array.isArray(item.aliases) ? item.aliases.join(', ') : '—') || '—',
          item.phone || '—',
          item.email || '—',
          item.gstin || item.state || '—',
          { content: opVal !== 0 ? fmtNum(opVal) : '—', styles: { halign: 'right' } }
        ]);
      });

      // Total row
      tableBody.push([
        { content: 'TOTAL', colSpan: 6, styles: { halign: 'left', fontStyle: 'bold', fillColor: [240, 253, 244], textColor: [30, 58, 138] } },
        { content: fmtNum(totalOpBal), styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 253, 244], textColor: [30, 58, 138] } }
      ]);

      const autoTableConfig = {
        startY: 36,
        head: tableHeaders,
        body: tableBody,
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 8.5, cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 }, textColor: [51, 65, 85], lineColor: [241, 245, 249], lineWidth: 0.2 },
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'left' },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 'auto', halign: 'left', fontStyle: 'bold' },
          2: { cellWidth: 32, halign: 'left' },
          3: { cellWidth: 35, halign: 'left' },
          4: { cellWidth: 42, halign: 'left' },
          5: { cellWidth: 38, halign: 'left' },
          6: { cellWidth: 42, halign: 'right' }
        },
        didParseCell: function (hookData) {
          if (hookData.section === 'head') {
            if (hookData.column.index === 0) hookData.cell.styles.halign = 'center';
            if (hookData.column.index === 6) hookData.cell.styles.halign = 'right';
          }
        },
        didDrawPage: function () {
          const str = `Page ${doc.internal.getNumberOfPages()}`;
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(str, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
          doc.text('KYA Accounting • Confidential', 14, doc.internal.pageSize.getHeight() - 8);
        },
        margin: { left: 14, right: 14, bottom: 16 }
      };

      if (typeof doc.autoTable === 'function') doc.autoTable(autoTableConfig);
      else if (global.jspdf && typeof global.jspdf.autoTable === 'function') global.jspdf.autoTable(doc, autoTableConfig);
      else if (typeof global.autoTable === 'function') global.autoTable(doc, autoTableConfig);

      doc.save('Suppliers_List.pdf');
      return true;
    } catch (err) {
      console.error('Failed to export Suppliers to PDF:', err);
      alert('Could not export PDF: ' + err.message);
      return false;
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // 8. STATEMENT PDF EXPORT (LEDGERS, CUSTOMERS, SUPPLIERS)
  // ════════════════════════════════════════════════════════════════════
  async function exportStatementToPDF(data) {
    try {
      await ensureJsPDFLoaded();
      const { jsPDF } = global.jspdf || global;
      if (!jsPDF) throw new Error('jsPDF library could not be loaded.');

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, pageWidth, 5, 'F');

      const compName = (data.companyName || 'KYA Accounting').toUpperCase();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(30, 58, 138);
      doc.text(compName, 14, 16);

      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(data.title || 'STATEMENT OF ACCOUNT', 14, 23);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);

      let subInfo = `Account: ${data.accountName || '—'}`;
      if (data.subgroupName) subInfo += `  |  Group: ${data.subgroupName}`;
      doc.text(subInfo, 14, 28.5);

      let periodText = 'Period: All recorded transactions';
      if (data.dateFrom || data.dateTo) {
        periodText = `Period: ${formatRptDate(data.dateFrom) || 'Beginning'} to ${formatRptDate(data.dateTo) || 'End'}`;
      }
      doc.text(periodText, 14, 33.5);

      const genDateStr = `Generated on: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
      doc.text(genDateStr, pageWidth - 14, 33.5, { align: 'right' });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 36.5, pageWidth - 14, 36.5);

      const tableHeaders = [['Date', 'Particulars', 'Voucher No', 'Debit (INR)', 'Credit (INR)']];
      const tableBody = [];
      const rowMeta = [];

      // Opening balance
      const opBal = Number(data.openingBalance) || 0;
      tableBody.push([
        { content: '—', styles: { halign: 'center' } },
        'Opening Balance',
        { content: '—', styles: { halign: 'center' } },
        { content: opBal > 0 ? fmtNum(opBal) : (opBal === 0 ? '—' : '—'), styles: { halign: 'right' } },
        { content: opBal < 0 ? fmtNum(Math.abs(opBal)) : (opBal === 0 ? '—' : '—'), styles: { halign: 'right' } }
      ]);
      rowMeta.push({ type: 'opening' });

      // Transactions
      (data.transactions || []).forEach(tr => {
        let fDate = tr.date || '—';
        if (tr.date && tr.date.includes('-')) {
          const parts = tr.date.split('-');
          if (parts.length === 3 && parts[0].length === 4) {
            fDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
        }
        tableBody.push([
          { content: fDate, styles: { halign: 'center' } },
          tr.particulars || '—',
          { content: tr.voucherNo || '—', styles: { halign: 'center' } },
          { content: tr.debit ? fmtNum(tr.debit) : '—', styles: { halign: 'right' } },
          { content: tr.credit ? fmtNum(tr.credit) : '—', styles: { halign: 'right' } }
        ]);
        rowMeta.push({ type: 'item' });
      });

      // Total row
      tableBody.push([
        { content: 'TOTAL', colSpan: 3, styles: { halign: 'left', fontStyle: 'bold' } },
        { content: fmtNum(data.totalDebit || 0), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: fmtNum(data.totalCredit || 0), styles: { halign: 'right', fontStyle: 'bold' } }
      ]);
      rowMeta.push({ type: 'total' });

      // Closing Balance row
      const clBal = Number(data.closingBalance) || 0;
      tableBody.push([
        { content: 'CLOSING BALANCE', colSpan: 3, styles: { halign: 'left', fontStyle: 'bold' } },
        { content: clBal >= 0 ? fmtNum(clBal) : '—', styles: { halign: 'right', fontStyle: 'bold' } },
        { content: clBal < 0 ? fmtNum(Math.abs(clBal)) : '—', styles: { halign: 'right', fontStyle: 'bold' } }
      ]);
      rowMeta.push({ type: 'closing' });

      const autoTableConfig = {
        startY: 40,
        head: tableHeaders,
        body: tableBody,
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 8.5, cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 }, textColor: [51, 65, 85], lineColor: [241, 245, 249], lineWidth: 0.2 },
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'left' },
        columnStyles: {
          0: { cellWidth: 26, halign: 'center' },
          1: { cellWidth: 'auto', halign: 'left' },
          2: { cellWidth: 32, halign: 'center' },
          3: { cellWidth: 38, halign: 'right' },
          4: { cellWidth: 38, halign: 'right' }
        },
        didParseCell: function (hookData) {
          if (hookData.section === 'head') {
            if (hookData.column.index === 0 || hookData.column.index === 2) hookData.cell.styles.halign = 'center';
            if (hookData.column.index >= 3) hookData.cell.styles.halign = 'right';
            return;
          }
          const meta = rowMeta[hookData.row.index];
          if (!meta) return;
          if (meta.type === 'opening') {
            hookData.cell.styles.fillColor = [248, 250, 252];
            hookData.cell.styles.fontStyle = 'italic';
            hookData.cell.styles.textColor = [100, 116, 139];
          } else if (meta.type === 'total') {
            hookData.cell.styles.fillColor = [240, 253, 244];
            hookData.cell.styles.textColor = [22, 101, 52];
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.fontSize = 9;
            hookData.cell.styles.lineWidth = { top: 0.5, bottom: 0.5 };
            hookData.cell.styles.lineColor = [187, 247, 208];
          } else if (meta.type === 'closing') {
            hookData.cell.styles.fillColor = [238, 242, 255];
            hookData.cell.styles.textColor = [30, 58, 138];
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.fontSize = 9;
          }
          if (hookData.column.index >= 3) {
            hookData.cell.styles.halign = 'right';
          }
        },
        didDrawPage: function () {
          const str = `Page ${doc.internal.getNumberOfPages()}`;
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(str, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
          doc.text('KYA Accounting • Confidential', 14, doc.internal.pageSize.getHeight() - 8);
        },
        margin: { left: 14, right: 14, bottom: 16 }
      };

      if (typeof doc.autoTable === 'function') doc.autoTable(autoTableConfig);
      else if (global.jspdf && typeof global.jspdf.autoTable === 'function') global.jspdf.autoTable(doc, autoTableConfig);
      else if (typeof global.autoTable === 'function') global.autoTable(doc, autoTableConfig);

      const cleanName = (data.accountName || 'Statement').replace(/[^a-zA-Z0-9_-]/g, '_');
      const sDate = data.dateFrom || 'Start';
      const eDate = data.dateTo || 'End';
      doc.save(`Statement_${cleanName}_${sDate}_${eDate}.pdf`);
      return true;
    } catch (err) {
      console.error('Failed to export Statement to PDF:', err);
      alert('Could not export PDF: ' + err.message);
      return false;
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // 9. INDIVIDUAL VOUCHER PDF EXPORT
  // ════════════════════════════════════════════════════════════════════
  async function exportVoucherToPDF(entry) {
    try {
      await ensureJsPDFLoaded();
      const { jsPDF } = global.jspdf || global;
      if (!jsPDF) throw new Error('jsPDF library could not be loaded.');

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      const activeCo = (typeof getActiveCompany === 'function' ? getActiveCompany() : null) || {};
      const compName = (activeCo.name || 'KYA Accounting').toUpperCase();
      const isDraft = !!entry.isDraft;

      // Top Navy Bar
      doc.setFillColor(isDraft ? 217 : 30, isDraft ? 119 : 58, isDraft ? 6 : 138);
      doc.rect(0, 0, pageWidth, 5, 'F');

      // Company Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(30, 58, 138);
      doc.text(compName, 14, 16);

      // Voucher Title
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text(isDraft ? 'DRAFT JOURNAL VOUCHER' : 'JOURNAL VOUCHER', 14, 23);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      const genDateStr = `Generated on: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
      doc.text(genDateStr, pageWidth - 14, 23, { align: 'right' });

      // Divider line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 26.5, pageWidth - 14, 26.5);

      // Metadata Info Box
      const deptObj = (entry.departmentId && entry.departmentId !== 'all')
        ? (typeof ohGetDeptById === 'function' ? ohGetDeptById(Number(entry.departmentId)) : null)
        : null;
      const deptName = deptObj ? deptObj.name : '—';
      const isBudget = entry.isBudget === true;
      const typeText = isBudget ? 'Budget' : 'Non Budget';

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 29, pageWidth - 28, 22, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 29, pageWidth - 28, 22, 2, 2, 'D');

      // Row 1 of metadata
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Voucher No:', 18, 35);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(String(entry.voucherNo || '—'), 38, 35);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Date:', 85, 35);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(formatRptDate(entry.date) || '—', 96, 35);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Status:', 145, 35);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isDraft ? 217 : 22, isDraft ? 119 : 101, isDraft ? 6 : 52);
      doc.text(isDraft ? 'DRAFT' : 'POSTED', 158, 35);

      // Row 2 of metadata
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Department:', 18, 44);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(String(deptName), 38, 44);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Type:', 85, 44);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(typeText, 96, 44);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Prepared By:', 145, 44);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(String(entry.preparedBy || '—'), 166, 44);

      // Table Data
      const rows = entry.allRows || [];
      let totalDr = 0;
      let totalCr = 0;

      const tableHeaders = [['#', 'Type', 'Particulars (Account Name)', 'Debit (INR)', 'Credit (INR)']];
      const tableBody = [];

      rows.forEach((r, idx) => {
        const dr = parseFloat(r.debit) || 0;
        const cr = parseFloat(r.credit) || 0;
        totalDr += dr;
        totalCr += cr;

        tableBody.push([
          idx + 1,
          r.type || (dr > 0 ? 'By' : 'To'),
          r.particular || '—',
          dr ? fmtNum(dr) : '—',
          cr ? fmtNum(cr) : '—'
        ]);
      });

      // Total row
      tableBody.push([
        { content: 'TOTALS', colSpan: 3, styles: { halign: 'left', fontStyle: 'bold', fillColor: [240, 253, 244], textColor: [22, 101, 52] } },
        { content: fmtNum(totalDr), styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 253, 244], textColor: [22, 101, 52] } },
        { content: fmtNum(totalCr), styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 253, 244], textColor: [22, 101, 52] } }
      ]);

      const autoTableConfig = {
        startY: 55,
        head: tableHeaders,
        body: tableBody,
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 9, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 }, textColor: [51, 65, 85], lineColor: [226, 232, 240], lineWidth: 0.3 },
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9.5, halign: 'left' },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 'auto', halign: 'left' },
          3: { cellWidth: 38, halign: 'right' },
          4: { cellWidth: 38, halign: 'right' }
        },
        didParseCell: function (hookData) {
          if (hookData.section === 'head') {
            if (hookData.column.index === 0 || hookData.column.index === 1) hookData.cell.styles.halign = 'center';
            if (hookData.column.index >= 3) hookData.cell.styles.halign = 'right';
          }
        },
        margin: { left: 14, right: 14, bottom: 20 }
      };

      if (typeof doc.autoTable === 'function') doc.autoTable(autoTableConfig);
      else if (global.jspdf && typeof global.jspdf.autoTable === 'function') global.jspdf.autoTable(doc, autoTableConfig);
      else if (typeof global.autoTable === 'function') global.autoTable(doc, autoTableConfig);

      let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : 120;

      // Narration
      if (entry.narration) {
        if (finalY > doc.internal.pageSize.getHeight() - 40) {
          doc.addPage();
          finalY = 20;
        }
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, finalY, pageWidth - 28, 16, 2, 2, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, finalY, pageWidth - 28, 16, 2, 2, 'D');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Narration:', 18, finalY + 5.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        doc.text(String(entry.narration), 18, finalY + 11.5);
        finalY += 24;
      }

      // Signatures
      if (finalY > doc.internal.pageSize.getHeight() - 35) {
        doc.addPage();
        finalY = 20;
      }
      finalY += 8;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.line(20, finalY + 15, 70, finalY + 15);
      doc.line(pageWidth - 70, finalY + 15, pageWidth - 20, finalY + 15);

      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Prepared By', 45, finalY + 20, { align: 'center' });
      doc.text('Authorized Signatory', pageWidth - 45, finalY + 20, { align: 'center' });

      // Footer
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
        doc.text('KYA Accounting • Official Voucher Record', 14, doc.internal.pageSize.getHeight() - 8);
      }

      const vNum = (entry.voucherNo || 'Voucher').replace(/[^a-zA-Z0-9_-]/g, '_');
      const vDate = entry.date || 'Date';
      doc.save(`Voucher_${vNum}_${vDate}.pdf`);
      return true;
    } catch (err) {
      console.error('Failed to export Voucher to PDF:', err);
      alert('Could not export PDF: ' + err.message);
      return false;
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // 10. INDIVIDUAL INVOICE PDF EXPORT
  // ════════════════════════════════════════════════════════════════════
  async function exportInvoiceToPDF(inv) {
    try {
      await ensureJsPDFLoaded();
      const { jsPDF } = global.jspdf || global;
      if (!jsPDF) throw new Error('jsPDF library could not be loaded.');

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      const activeCo = (typeof getActiveCompany === 'function' ? getActiveCompany() : null) || {};
      const compName = (activeCo.name || 'KYA Accounting').toUpperCase();
      const title = inv.isReturn ? 'CREDIT NOTE / SALES REVERSAL' : (inv.isOrder ? 'SALES PRE INVOICE' : 'TAX INVOICE');

      // Top Navy Bar
      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, pageWidth, 5, 'F');

      // Company Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(30, 58, 138);
      doc.text(compName, 14, 16);

      // Title
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text(title, 14, 23);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(37, 99, 235);
      const invNoText = `# ${inv.invoiceNo || '—'}`;
      doc.text(invNoText, pageWidth - 14, 16, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      const genDateStr = `Generated on: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
      doc.text(genDateStr, pageWidth - 14, 23, { align: 'right' });

      // Divider line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 26.5, pageWidth - 14, 26.5);

      // Metadata Info Box
      const customer = (typeof findPartyById === 'function' ? findPartyById(inv.customerId, 'Customer') : null) || (typeof coaLedgers !== 'undefined' ? coaLedgers.find(l => l.id == inv.customerId) : null) || { name: 'Unknown Customer' };
      const partyName = (inv.partyOverride && inv.partyOverride.name) || customer.name || 'Unknown Customer';
      const partyAddr = (inv.partyOverride && inv.partyOverride.address) || customer.address || '';
      const partyGstin = (inv.partyOverride && inv.partyOverride.gstin) || customer.gstin || '';
      
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 29, pageWidth - 28, 26, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 29, pageWidth - 28, 26, 2, 2, 'D');

      // Left: Billed To
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('BILLED TO:', 18, 35);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(partyName || 'Unknown Customer', 18, 41);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      if (partyGstin) {
        doc.text(`GSTIN: ${partyGstin}`, 18, 47);
      } else if (partyAddr) {
        doc.text(partyAddr.length > 35 ? partyAddr.substring(0, 32) + '...' : partyAddr, 18, 47);
      } else {
        doc.text('Trade Receivables Account', 18, 47);
      }

      // Right: Dates and Supply
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Invoice Date:', 110, 35);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(formatRptDate(inv.date) || '—', 135, 35);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Due Date:', 110, 42);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(formatRptDate(inv.dueDate || inv.date) || '—', 135, 42);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Supply Type:', 110, 49);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(String(inv.salesSupplyType || 'Intra-State'), 135, 49);

      // Table of Items
      const tableHeaders = [['#', 'Description', 'Qty', 'Rate', 'Discount', 'Tax', 'Amount']];
      const tableBody = [];

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
        const discStr = r.discountType === 'pct' ? `${r.discount}%` : (discAmt ? `₹${fmtNum(discAmt)}` : '—');

        tableBody.push([
          idx + 1,
          desc,
          qty,
          fmtNum(rate),
          discStr,
          r.tax ? `${r.tax}%` : '0%',
          fmtNum(finalAmt)
        ]);
      });

      // Sub Total & Taxes rows in table footer
      tableBody.push([
        { content: 'Sub Total', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: fmtNum(inv.subTotal || 0), styles: { halign: 'right', fontStyle: 'bold', fillColor: [248, 250, 252] } }
      ]);
      if (inv.taxTotal) {
        tableBody.push([
          { content: 'Tax Amount', colSpan: 6, styles: { halign: 'right', fontStyle: 'normal', fillColor: [248, 250, 252] } },
          { content: fmtNum(inv.taxTotal), styles: { halign: 'right', fontStyle: 'normal', fillColor: [248, 250, 252] } }
        ]);
      }
      if (inv.tdsTcsMode && inv.tdsTcsMode !== 'None') {
        tableBody.push([
          { content: `${inv.tdsTcsMode} (${inv.tdsTcsRate}%)`, colSpan: 6, styles: { halign: 'right', fontStyle: 'normal', fillColor: [248, 250, 252] } },
          { content: `${inv.tdsTcsMode === 'TDS' ? '-' : '+'} ${fmtNum(inv.tdsTcsAmount)}`, styles: { halign: 'right', fontStyle: 'normal', fillColor: [248, 250, 252] } }
        ]);
      }
      if (inv.adjustments) {
        tableBody.push([
          { content: 'Round off', colSpan: 6, styles: { halign: 'right', fontStyle: 'normal', fillColor: [248, 250, 252] } },
          { content: fmtNum(inv.adjustments), styles: { halign: 'right', fontStyle: 'normal', fillColor: [248, 250, 252] } }
        ]);
      }
      tableBody.push([
        { content: 'TOTAL AMOUNT', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 253, 244], textColor: [22, 101, 52] } },
        { content: `INR ${fmtNum(inv.total || 0)}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 253, 244], textColor: [22, 101, 52] } }
      ]);

      const autoTableConfig = {
        startY: 59,
        head: tableHeaders,
        body: tableBody,
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 9, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 }, textColor: [51, 65, 85], lineColor: [226, 232, 240], lineWidth: 0.3 },
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'left' },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 'auto', halign: 'left' },
          2: { cellWidth: 15, halign: 'right' },
          3: { cellWidth: 26, halign: 'right' },
          4: { cellWidth: 22, halign: 'right' },
          5: { cellWidth: 18, halign: 'right' },
          6: { cellWidth: 32, halign: 'right' }
        },
        margin: { left: 14, right: 14, bottom: 20 }
      };

      if (typeof doc.autoTable === 'function') doc.autoTable(autoTableConfig);
      else if (global.jspdf && typeof global.jspdf.autoTable === 'function') global.jspdf.autoTable(doc, autoTableConfig);
      else if (typeof global.autoTable === 'function') global.autoTable(doc, autoTableConfig);

      let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : 140;

      // Terms & Notes
      if (inv.notes) {
        if (finalY > doc.internal.pageSize.getHeight() - 40) {
          doc.addPage();
          finalY = 20;
        }
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, finalY, pageWidth - 28, 16, 2, 2, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, finalY, pageWidth - 28, 16, 2, 2, 'D');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Terms & Notes:', 18, finalY + 5.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        doc.text(String(inv.notes), 18, finalY + 11.5);
        finalY += 24;
      }

      // Signatures
      if (finalY > doc.internal.pageSize.getHeight() - 35) {
        doc.addPage();
        finalY = 20;
      }
      finalY += 6;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.line(20, finalY + 15, 70, finalY + 15);
      doc.line(pageWidth - 70, finalY + 15, pageWidth - 20, finalY + 15);

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Customer Signature', 45, finalY + 20, { align: 'center' });
      doc.text('Authorized Signatory', pageWidth - 45, finalY + 20, { align: 'center' });

      // Footer
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
        doc.text('KYA Accounting • Official Invoice Record', 14, doc.internal.pageSize.getHeight() - 8);
      }

      const invNum = (inv.invoiceNo || 'Invoice').replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`Invoice_${invNum}.pdf`);
      return true;
    } catch (err) {
      console.error('Failed to export Invoice to PDF:', err);
      alert('Could not export PDF: ' + err.message);
      return false;
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // 12. VOUCHER DESK REGISTER PDF EXPORT
  // ════════════════════════════════════════════════════════════════════
  async function exportVoucherDeskToPDF(data) {
    try {
      await ensureJsPDFLoaded();
      const { jsPDF } = global.jspdf || global;
      if (!jsPDF) throw new Error('jsPDF library could not be loaded.');

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, pageWidth, 5, 'F');

      const compName = (data.companyName || 'KYA Accounting').toUpperCase();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(30, 58, 138);
      doc.text(compName, 14, 16);

      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('VOUCHER DESK / TRANSACTION REGISTER', 14, 23);

      const items = data.items || [];
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Status: ${data.filterStatus || 'All'} • Type: ${data.filterType || 'All'} • Total Vouchers: ${items.length}`, 14, 29);

      const genDateStr = `Generated on: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
      doc.text(genDateStr, pageWidth - 14, 29, { align: 'right' });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(14, 32, pageWidth - 14, 32);

      const tableHeaders = [['#', 'Date', 'Voucher No.', 'Type', 'Particulars', 'Amount (INR)', 'Status']];
      const tableBody = [];
      let totalAmt = 0;

      items.forEach((item, idx) => {
        const cleanAmt = typeof item.amount === 'string' ? parseFloat(item.amount.replace(/,/g, '')) : Number(item.amount);
        const val = isNaN(cleanAmt) ? 0 : cleanAmt;
        totalAmt += val;

        tableBody.push([
          { content: String(idx + 1), styles: { halign: 'center' } },
          item.date || '—',
          item.voucherNo || '—',
          item.type || 'Journal Entry',
          item.particulars || '—',
          { content: typeof fmtNum === 'function' ? fmtNum(val) : val.toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right' } },
          { content: item.status || (item.isDraft ? 'Draft' : 'Posted'), styles: { halign: 'center' } }
        ]);
      });

      // Total Row
      tableBody.push([
        { content: 'TOTAL AMOUNT', colSpan: 5, styles: { halign: 'left', fontStyle: 'bold', fillColor: [240, 253, 244], textColor: [30, 58, 138] } },
        { content: typeof fmtNum === 'function' ? fmtNum(totalAmt) : totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 253, 244], textColor: [30, 58, 138] } },
        { content: `${items.length} vouchers`, styles: { halign: 'center', fontStyle: 'bold', fillColor: [240, 253, 244], textColor: [100, 116, 139] } }
      ]);

      const autoTableConfig = {
        startY: 36,
        head: tableHeaders,
        body: tableBody,
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 8.5, cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 }, textColor: [51, 65, 85], lineColor: [241, 245, 249], lineWidth: 0.2 },
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, halign: 'left' },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 24, halign: 'left' },
          2: { cellWidth: 32, halign: 'left', fontStyle: 'bold' },
          3: { cellWidth: 30, halign: 'left' },
          4: { cellWidth: 'auto', halign: 'left' },
          5: { cellWidth: 36, halign: 'right' },
          6: { cellWidth: 24, halign: 'center' }
        },
        didParseCell: function (hookData) {
          if (hookData.section === 'head') {
            if (hookData.column.index === 0 || hookData.column.index === 6) hookData.cell.styles.halign = 'center';
            if (hookData.column.index === 5) hookData.cell.styles.halign = 'right';
          }
        },
        didDrawPage: function () {
          const str = `Page ${doc.internal.getNumberOfPages()}`;
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(str, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
          doc.text('KYA Accounting • Voucher Desk Register', 14, doc.internal.pageSize.getHeight() - 8);
        },
        margin: { left: 14, right: 14, bottom: 16 }
      };

      if (typeof doc.autoTable === 'function') doc.autoTable(autoTableConfig);
      else if (global.jspdf && typeof global.jspdf.autoTable === 'function') global.jspdf.autoTable(doc, autoTableConfig);
      else if (typeof global.autoTable === 'function') global.autoTable(doc, autoTableConfig);

      doc.save('Voucher_Desk_Register.pdf');
      return true;
    } catch (err) {
      console.error('Failed to export Voucher Desk to PDF:', err);
      alert('Could not export PDF: ' + err.message);
      return false;
    }
  }

  // Export to global scope
  global.exportPnLToPDF = exportPnLToPDF;
  global.exportBalanceSheetToPDF = exportBalanceSheetToPDF;
  global.exportTrialBalanceToPDF = exportTrialBalanceToPDF;
  global.exportChartOfAccountsToPDF = exportChartOfAccountsToPDF;
  global.exportLedgersToPDF = exportLedgersToPDF;
  global.exportCustomersToPDF = exportCustomersToPDF;
  global.exportSuppliersToPDF = exportSuppliersToPDF;
  global.exportStatementToPDF = exportStatementToPDF;
  global.exportLedgerStatementToPDF = exportStatementToPDF;
  global.exportCustomerStatementToPDF = exportStatementToPDF;
  global.exportSupplierStatementToPDF = exportStatementToPDF;
  global.exportCashbookToPDF = exportStatementToPDF;
  global.exportVoucherToPDF = exportVoucherToPDF;
  global.exportInvoiceToPDF = exportInvoiceToPDF;
  global.exportVoucherDeskToPDF = exportVoucherDeskToPDF;

})(typeof window !== 'undefined' ? window : this);
