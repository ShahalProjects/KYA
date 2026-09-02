  // ══════════════════════════════════════════════════════════════════
  //  CHART OF ACCOUNTS — MASTER (LEDGERS, CUSTOMERS, SUPPLIERS)
  // ══════════════════════════════════════════════════════════════════

  function renderLedgerPanel() {
    switchLedgerTab(_ledgerActiveTab || 'list');

    // Wire sub-tabs
    const tabMap = {
      ledgerTabList:      'list',
      ledgerTabCustomers: 'customers',
      ledgerTabSuppliers: 'suppliers',
    };
    Object.entries(tabMap).forEach(([btnId, tab]) => {
      const btn = document.getElementById(btnId);
      if (btn && !btn._wired) {
        btn._wired = true;
        btn.addEventListener('click', (e) => {
          if (e) e.preventDefault();
          switchLedgerTab(tab);
        });
      }
    });

    const btnBack = document.getElementById('btnBackToLedgerList');
    if (btnBack && !btnBack._wired) {
      btnBack._wired = true;
      btnBack.addEventListener('click', (e) => {
        if (e) e.preventDefault();
        switchLedgerTab('list');
      });
    }

    const btnBackCust = document.getElementById('btnBackToCustomerList');
    if (btnBackCust && !btnBackCust._wired) {
      btnBackCust._wired = true;
      btnBackCust.addEventListener('click', (e) => {
        if (e) e.preventDefault();
        switchLedgerTab('customers');
      });
    }

    const btnBackSupp = document.getElementById('btnBackToSupplierList');
    if (btnBackSupp && !btnBackSupp._wired) {
      btnBackSupp._wired = true;
      btnBackSupp.addEventListener('click', (e) => {
        if (e) e.preventDefault();
        switchLedgerTab('suppliers');
      });
    }

    wireMasterCoaMoreDropdown();
  }

  let _masterCoaMoreWired = false;
  function wireMasterCoaMoreDropdown() {
    if (_masterCoaMoreWired) return;
    _masterCoaMoreWired = true;

    const moreBtn = document.getElementById('masterCoaMoreBtn');
    const moreDropdown = document.getElementById('masterCoaMoreDropdown');
    const submenuBtn = document.getElementById('masterCoaExportMenuBtn');
    const submenu = document.getElementById('masterCoaExportSubmenu');
    const pdfBtn = document.getElementById('masterCoaExportPdf');
    const excelBtn = document.getElementById('masterCoaExportExcel');

    if (moreBtn && moreDropdown) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = moreDropdown.classList.contains('active');
        closeAllMasterCoaMenus();
        if (!isOpen) {
          moreDropdown.classList.add('active');
        }
      });
    }

    if (submenuBtn && submenu) {
      let closeTimer = null;
      submenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        submenu.classList.toggle('active');
      });
      const submenuWrap = document.getElementById('masterCoaExportSubmenuWrap');
      if (submenuWrap) {
        submenuWrap.addEventListener('mouseenter', () => {
          if (closeTimer) clearTimeout(closeTimer);
          submenu.classList.add('active');
        });
        submenuWrap.addEventListener('mouseleave', () => {
          closeTimer = setTimeout(() => {
            submenu.classList.remove('active');
          }, 300);
        });
        submenu.addEventListener('mouseenter', () => {
          if (closeTimer) clearTimeout(closeTimer);
          submenu.classList.add('active');
        });
      }
    }

    function closeAllMasterCoaMenus() {
      if (moreDropdown) moreDropdown.classList.remove('active');
      if (submenu) submenu.classList.remove('active');
    }

    if (pdfBtn) {
      pdfBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        closeAllMasterCoaMenus();
        const tab = _ledgerActiveTab || 'list';
        if (tab === 'statement') {
          const data = typeof getLedgerStatementExportData === 'function' ? getLedgerStatementExportData() : null;
          if (data && typeof window.exportStatementToPDF === 'function') {
            await window.exportStatementToPDF(data);
          }
        } else if (tab === 'customer-statement') {
          const data = typeof getCustomerStatementExportData === 'function' ? getCustomerStatementExportData() : null;
          if (data && typeof window.exportStatementToPDF === 'function') {
            await window.exportStatementToPDF(data);
          }
        } else if (tab === 'supplier-statement') {
          const data = typeof getSupplierStatementExportData === 'function' ? getSupplierStatementExportData() : null;
          if (data && typeof window.exportStatementToPDF === 'function') {
            await window.exportStatementToPDF(data);
          }
        } else if (tab === 'customers') {
          if (typeof window.exportCustomersToPDF === 'function') {
            await window.exportCustomersToPDF(window.getCustomersExportData());
          }
        } else if (tab === 'suppliers') {
          if (typeof window.exportSuppliersToPDF === 'function') {
            await window.exportSuppliersToPDF(window.getSuppliersExportData());
          }
        } else {
          if (typeof window.exportLedgersToPDF === 'function') {
            await window.exportLedgersToPDF(window.getLedgersExportData());
          }
        }
      });
    }

    if (excelBtn) {
      excelBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        closeAllMasterCoaMenus();
        const tab = _ledgerActiveTab || 'list';
        if (tab === 'statement') {
          const data = typeof getLedgerStatementExportData === 'function' ? getLedgerStatementExportData() : null;
          if (data && typeof window.exportStatementToExcel === 'function') {
            await window.exportStatementToExcel(data);
          }
        } else if (tab === 'customer-statement') {
          const data = typeof getCustomerStatementExportData === 'function' ? getCustomerStatementExportData() : null;
          if (data && typeof window.exportStatementToExcel === 'function') {
            await window.exportStatementToExcel(data);
          }
        } else if (tab === 'supplier-statement') {
          const data = typeof getSupplierStatementExportData === 'function' ? getSupplierStatementExportData() : null;
          if (data && typeof window.exportStatementToExcel === 'function') {
            await window.exportStatementToExcel(data);
          }
        } else if (tab === 'customers') {
          if (typeof window.exportCustomersToExcel === 'function') {
            await window.exportCustomersToExcel(window.getCustomersExportData());
          }
        } else if (tab === 'suppliers') {
          if (typeof window.exportSuppliersToExcel === 'function') {
            await window.exportSuppliersToExcel(window.getSuppliersExportData());
          }
        } else {
          if (typeof window.exportLedgersToExcel === 'function') {
            await window.exportLedgersToExcel(window.getLedgersExportData());
          }
        }
      });
    }

    document.addEventListener('click', (e) => {
      if (moreDropdown && !moreDropdown.contains(e.target) && (!moreBtn || !moreBtn.contains(e.target))) {
        closeAllMasterCoaMenus();
      }
    });
  }

  function switchLedgerTab(tab) {
    if (tab === 'add' || tab === 'alter') {
      tab = 'list';
    }
    _ledgerActiveTab = tab;

    const allTabs = [
      ['ledgerTabList',      'list'],
      ['ledgerTabCustomers', 'customers'],
      ['ledgerTabSuppliers', 'suppliers'],
    ];
    const allViews = [
      ['ledger-list-view',        'list'],
      ['customer-list-view',      'customers'],
      ['supplier-list-view',      'suppliers'],
      ['ledger-statement-view',   'statement'],
      ['customer-statement-view', 'customer-statement'],
      ['supplier-statement-view', 'supplier-statement'],
    ];

    allTabs.forEach(([btnId, t]) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      const isActive = t === tab;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive);
    });

    allViews.forEach(([viewId, t]) => {
      const view = document.getElementById(viewId);
      if (view) view.style.display = t === tab ? '' : 'none';
    });

    // Toggle full-width layout & hide/show sub-tabs sidebar for statement views
    const isStatement = (tab === 'statement' || tab === 'customer-statement' || tab === 'supplier-statement');
    const subTabsNav = document.getElementById('ledgerSubTabsNav');
    if (subTabsNav) {
      subTabsNav.style.display = isStatement ? 'none' : '';
    }
    const layoutContainer = document.getElementById('ledgerLayoutContainer');
    if (layoutContainer) {
      layoutContainer.classList.toggle('full-width', isStatement);
    }

    if (tab === 'list') {
      renderLedgerListView();
    } else if (tab === 'customers') {
      renderCustomerListView();
    } else if (tab === 'suppliers') {
      renderSupplierListView();
    } else if (tab === 'statement') {
      renderLedgerStatementView();
    } else if (tab === 'customer-statement') {
      renderCustomerStatementView();
    } else if (tab === 'supplier-statement') {
      renderSupplierStatementView();
    }
  }

  function resolveLedgerSubgroupName(l) {
    if (!l) return '-';
    const sgs = (typeof COA_SYS_SGS !== 'undefined' && Array.isArray(COA_SYS_SGS)) ? COA_SYS_SGS : [];
    
    if (l.glId) {
      const gl = (typeof coaLedgers !== 'undefined' ? coaLedgers : []).find(g => g.id === l.glId);
      if (gl) return gl.name;
    }
    
    if (l.sgId) {
      const sg = sgs.find(s => s.id === l.sgId);
      if (sg) return sg.name;

      const glMatch = (typeof coaLedgers !== 'undefined' ? coaLedgers : []).find(g => String(g.id) === String(l.sgId) || g.id === l.sgId);
      if (glMatch) return glMatch.name;
    }

    if (l.sgId && String(l.sgId).startsWith('sg-grp-')) {
      return 'Custom Group';
    }

    return l.sgId || '-';
  }

  // ══════════════════════════════════════════════════════════════════
  //  1. LEDGERS LIST VIEW
  // ══════════════════════════════════════════════════════════════════

  function renderLedgerListView() {
    const wrap = document.getElementById('ledgerListWrap');
    if (!wrap) return;

    const searchInput = document.getElementById('ledgerSearchInput');
    if (searchInput && !searchInput._wired) {
      searchInput._wired = true;
      searchInput.addEventListener('input', (e) => {
        _ledgerSearchQuery = e.target.value;
        renderLedgerListView();
      });
    }

    const onlyLedgers = coaLedgers.filter(l => l.type !== 'group-ledger');

    if (onlyLedgers.length === 0) {
      wrap.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--slate-400);">No ledgers found.</div>`;
      return;
    }

    const q = (_ledgerSearchQuery || '').toLowerCase().trim();
    const filteredLedgers = onlyLedgers.filter(l => {
      const sgName = resolveLedgerSubgroupName(l);
      const nameMatch = l.name.toLowerCase().includes(q);
      const sgMatch = sgName.toLowerCase().includes(q);
      const aliasMatch = l.aliases && l.aliases.some(a => a.toLowerCase().includes(q));
      return nameMatch || sgMatch || aliasMatch;
    });

    if (filteredLedgers.length === 0) {
      wrap.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--slate-400);">No matching ledgers found.</div>`;
      return;
    }

    let rowsHtml = '';
    let index = 1;
    const sortedLedgers = [...filteredLedgers].sort((a, b) => a.name.localeCompare(b.name));

    sortedLedgers.forEach(l => {
      const sgName = resolveLedgerSubgroupName(l);

      rowsHtml += `
        <tr onclick="viewLedgerStatement(${l.id})" style="cursor: pointer;" title="Click to view statement">
          <td class="sl-col">${index++}</td>
          <td class="particulars-col">
            <span style="font-weight: 600; color: var(--slate-800);">${ohEsc(l.name)}</span>
          </td>
          <td>${ohEsc(sgName)}</td>
        </tr>
      `;
    });

    wrap.innerHTML = `
      <table class="tb-table">
        <thead>
          <tr>
            <th class="sl-col">#</th>
            <th>Ledger Name</th>
            <th>Sub Group</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  }

  // ══════════════════════════════════════════════════════════════════
  //  2. CUSTOMERS LIST VIEW (INSIDE MASTER)
  // ══════════════════════════════════════════════════════════════════

  function renderCustomerListView() {
    const wrap = document.getElementById('customerListWrap');
    if (!wrap) return;

    const searchInput = document.getElementById('customerSearchInput');
    if (searchInput && !searchInput._wired) {
      searchInput._wired = true;
      searchInput.addEventListener('input', (e) => {
        _customerSearchQuery = e.target.value;
        renderCustomerListView();
      });
    }

    const customers = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];

    if (customers.length === 0) {
      wrap.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--slate-400);">No customers found.</div>`;
      return;
    }

    const q = (_customerSearchQuery || '').toLowerCase().trim();
    const filtered = customers.filter(c => {
      const nameMatch = (c.name || '').toLowerCase().includes(q);
      const aliasMatch = Array.isArray(c.aliases) && c.aliases.some(a => (a || '').toLowerCase().includes(q));
      return nameMatch || aliasMatch;
    });

    if (filtered.length === 0) {
      wrap.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--slate-400);">No matching customers found.</div>`;
      return;
    }

    let rowsHtml = '';
    let index = 1;
    const sorted = [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    sorted.forEach(c => {
      const cId = c.id || c.name;
      rowsHtml += `
        <tr onclick="viewCustomerStatement('${ohEsc(String(cId))}')" style="cursor: pointer;" title="Click to view statement">
          <td class="sl-col">${index++}</td>
          <td class="particulars-col">
            <span style="font-weight: 600; color: var(--slate-800);">${ohEsc(c.name)}</span>
          </td>
          <td>Trade Receivables</td>
        </tr>
      `;
    });

    wrap.innerHTML = `
      <table class="tb-table">
        <thead>
          <tr>
            <th class="sl-col">#</th>
            <th>Customer Name</th>
            <th>Sub Group</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  }

  // ══════════════════════════════════════════════════════════════════
  //  3. SUPPLIERS LIST VIEW (INSIDE MASTER)
  // ══════════════════════════════════════════════════════════════════

  function renderSupplierListView() {
    const wrap = document.getElementById('supplierListWrap');
    if (!wrap) return;

    const searchInput = document.getElementById('supplierSearchInput');
    if (searchInput && !searchInput._wired) {
      searchInput._wired = true;
      searchInput.addEventListener('input', (e) => {
        _supplierSearchQuery = e.target.value;
        renderSupplierListView();
      });
    }

    const suppliers = typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : [];

    if (suppliers.length === 0) {
      wrap.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--slate-400);">No suppliers found.</div>`;
      return;
    }

    const q = (_supplierSearchQuery || '').toLowerCase().trim();
    const filtered = suppliers.filter(s => {
      const nameMatch = (s.name || '').toLowerCase().includes(q);
      const aliasMatch = Array.isArray(s.aliases) && s.aliases.some(a => (a || '').toLowerCase().includes(q));
      return nameMatch || aliasMatch;
    });

    if (filtered.length === 0) {
      wrap.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--slate-400);">No matching suppliers found.</div>`;
      return;
    }

    let rowsHtml = '';
    let index = 1;
    const sorted = [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    sorted.forEach(s => {
      const sId = s.id || s.name;
      rowsHtml += `
        <tr onclick="viewSupplierStatement('${ohEsc(String(sId))}')" style="cursor: pointer;" title="Click to view statement">
          <td class="sl-col">${index++}</td>
          <td class="particulars-col">
            <span style="font-weight: 600; color: var(--slate-800);">${ohEsc(s.name)}</span>
          </td>
          <td>Trade Payables</td>
        </tr>
      `;
    });

    wrap.innerHTML = `
      <table class="tb-table">
        <thead>
          <tr>
            <th class="sl-col">#</th>
            <th>Supplier Name</th>
            <th>Sub Group</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  }

  // ══════════════════════════════════════════════════════════════════
  //  4. STATEMENT VIEWS (LEDGERS, CUSTOMERS, SUPPLIERS)
  // ══════════════════════════════════════════════════════════════════

  function calculateLedgerBalances(ledger, dateFrom, dateTo) {
    if (!ledger) return { openingBalance: 0, periodNet: 0, closingBalance: 0, periodDebitSum: 0, periodCreditSum: 0 };
    const mainGroup = getLedgerMainGroup(ledger);
    const initialOpening = parseFloat(ledger.openingBalance) || 0;

    let preDebitSum = 0;
    let preCreditSum = 0;
    let periodDebitSum = 0;
    let periodCreditSum = 0;

    const custs = (ledger.sgId === 'sg-tr' || (ledger.name || '').trim().toLowerCase() === 'trade receivables')
      ? (typeof getKyaCustomers === 'function' ? getKyaCustomers() : [])
      : [];
    const supps = (ledger.sgId === 'sg-tp' || (ledger.name || '').trim().toLowerCase() === 'trade payables')
      ? (typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : [])
      : [];
    const custNames = new Set(custs.map(c => (c.name || '').trim().toLowerCase()));
    const suppNames = new Set(supps.map(s => (s.name || '').trim().toLowerCase()));

    postedEntries.forEach(entry => {
      (entry.allRows || []).forEach(row => {
        const rowPart = (row.particular || '').trim().toLowerCase();
        const isMatch = (rowPart === ledger.name.trim().toLowerCase()) ||
          (custNames.size > 0 && custNames.has(rowPart)) ||
          (suppNames.size > 0 && suppNames.has(rowPart));

        if (isMatch) {
          const dr = parseFloat(row.debit) || 0;
          const cr = parseFloat(row.credit) || 0;
          
          if (dateFrom && entry.date < dateFrom) {
            preDebitSum += dr;
            preCreditSum += cr;
          } else if ((!dateFrom || entry.date >= dateFrom) && (!dateTo || entry.date <= dateTo)) {
            periodDebitSum += dr;
            periodCreditSum += cr;
          }
        }
      });
    });

    let openingBalance = 0;
    if (mainGroup === 'assets' || mainGroup === 'expense') {
      openingBalance = initialOpening + preDebitSum - preCreditSum;
    } else {
      openingBalance = initialOpening + preCreditSum - preDebitSum;
    }

    let periodNet = 0;
    if (mainGroup === 'assets' || mainGroup === 'expense') {
      periodNet = periodDebitSum - periodCreditSum;
    } else {
      periodNet = periodCreditSum - periodDebitSum;
    }

    const closingBalance = openingBalance + periodNet;

    return {
      openingBalance,
      periodNet,
      closingBalance,
      periodDebitSum,
      periodCreditSum
    };
  }

  function getCustomerStatementData(customerId, dateFrom, dateTo) {
    const custs = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
    const customer = custs.find(c => String(c.id) === String(customerId) || String(c.name).toLowerCase() === String(customerId).toLowerCase());
    if (!customer) return null;

    const initialOpening = parseFloat(customer.openingBalance) || 0;
    let preInvoiced = 0, preReceived = 0;
    let periodInvoiced = 0, periodReceived = 0;
    const transactions = [];

    const vouchers = (window.KYA_STORE && Array.isArray(window.KYA_STORE.salesVouchers)) ? window.KYA_STORE.salesVouchers : [];

    // Collect all journal entry IDs and voucher numbers linked to sales vouchers to prevent double-counting in postedEntries
    const salesJournalEntryIds = new Set();
    const salesVoucherNos = new Set();

    vouchers.forEach(v => {
      if (!v) return;
      if (v.id) salesVoucherNos.add(String(v.id).toLowerCase());
      if (v.invoiceNo) {
        const invLower = String(v.invoiceNo).toLowerCase();
        salesVoucherNos.add(invLower);
        salesVoucherNos.add(`sv-${invLower}`);
        salesVoucherNos.add(`sr-${invLower}`);
        salesVoucherNos.add(`so-${invLower}`);
        salesVoucherNos.add(`pay-${invLower}`);
        salesVoucherNos.add(`tds-${invLower}`);
      }
      if (v.paymentVoucherNo) salesVoucherNos.add(String(v.paymentVoucherNo).toLowerCase());
      if (v.tdsVoucherNo) salesVoucherNos.add(String(v.tdsVoucherNo).toLowerCase());
      if (v.journalEntryId) salesJournalEntryIds.add(String(v.journalEntryId));
      if (v.tdsJournalEntryId) salesJournalEntryIds.add(String(v.tdsJournalEntryId));
      if (v.paymentJournalEntryId) salesJournalEntryIds.add(String(v.paymentJournalEntryId));
      if (Array.isArray(v.refundJournalEntryIds)) {
        v.refundJournalEntryIds.forEach(id => salesJournalEntryIds.add(String(id)));
      }
    });

    vouchers.forEach(v => {
      if (v.isDraft) return;
      const isMatch = String(v.customerId) === String(customer.id) || (v.customerName && v.customerName.toLowerCase() === customer.name.toLowerCase());
      if (!isMatch) return;

      const vDate = v.date || '';
      const total = parseFloat(v.total) || 0;

      if (v.isReturn) {
        // Sales Reversal / Return
        const refundPaid = (v.paymentStatus === 'Full Refund')
          ? total
          : ((v.refundedAmount !== undefined && v.refundedAmount !== '' && !isNaN(Number(v.refundedAmount)))
            ? parseFloat(v.refundedAmount)
            : (parseFloat(v.paymentAmount) || 0));

        if (dateFrom && vDate < dateFrom) {
          preReceived += total;
          if (refundPaid > 0) preInvoiced += refundPaid;
        } else if ((!dateFrom || vDate >= dateFrom) && (!dateTo || vDate <= dateTo)) {
          periodReceived += total;
          transactions.push({
            id: v.journalEntryId || v.id,
            date: vDate,
            voucherNo: v.invoiceNo || 'SR-' + v.id,
            particulars: 'Sales Reversal',
            debit: 0,
            credit: total,
            isSales: true
          });
          if (refundPaid > 0) {
            periodInvoiced += refundPaid;
            transactions.push({
              id: (v.refundJournalEntryIds && v.refundJournalEntryIds[0]) || v.id,
              date: vDate,
              voucherNo: (v.invoiceNo || 'SR-' + v.id) + ' (Ref)',
              particulars: 'Refund Paid',
              debit: refundPaid,
              credit: 0,
              isSales: true
            });
          }
        }
      } else {
        // Regular Sales Invoice
        const tdsAmt = (v.tdsTcsMode === 'TDS' && parseFloat(v.tdsTcsAmount) > 0)
          ? parseFloat(v.tdsTcsAmount)
          : 0;
        const invoiceTotal = parseFloat(v.total) || 0;
        const grossAmount = invoiceTotal + tdsAmt;

        const paid = (v.paymentStatus === 'Full Payment' || v.paymentStatus === 'Full Refund')
          ? ((v.paymentAmount !== undefined && v.paymentAmount !== '' && !isNaN(Number(v.paymentAmount)) && Number(v.paymentAmount) > 0)
            ? parseFloat(v.paymentAmount)
            : invoiceTotal)
          : (parseFloat(v.paymentAmount) || 0);

        if (dateFrom && vDate < dateFrom) {
          preInvoiced += grossAmount;
          if (tdsAmt > 0) preReceived += tdsAmt;
          if (paid > 0) preReceived += paid;
        } else if ((!dateFrom || vDate >= dateFrom) && (!dateTo || vDate <= dateTo)) {
          periodInvoiced += grossAmount;
          transactions.push({
            id: v.journalEntryId || v.id,
            date: vDate,
            voucherNo: v.invoiceNo || 'INV-' + v.id,
            particulars: 'Sales Invoice',
            debit: grossAmount,
            credit: 0,
            isSales: true
          });
          if (tdsAmt > 0) {
            periodReceived += tdsAmt;
            const tdsEntry = v.tdsJournalEntryId && (typeof postedEntries !== 'undefined')
              ? postedEntries.find(e => String(e.id) === String(v.tdsJournalEntryId))
              : null;
            let tdsVoucherNo = (tdsEntry && tdsEntry.voucherNo) || v.tdsVoucherNo || '';
            if (!tdsVoucherNo || !tdsVoucherNo.startsWith('JV-')) {
              if (v.invoiceNo && v.invoiceNo.match(/^INV-\d{4}-\d+/i)) {
                tdsVoucherNo = v.invoiceNo.replace(/^INV-/i, 'JV-');
              } else if (tdsVoucherNo && tdsVoucherNo.match(/TDS-INV-(\d{4}-\d+)/i)) {
                tdsVoucherNo = tdsVoucherNo.replace(/TDS-INV-/i, 'JV-');
              } else if (tdsVoucherNo && tdsVoucherNo.match(/TDS-(?:SV-)?(\d{4}-\d+)/i)) {
                tdsVoucherNo = tdsVoucherNo.replace(/TDS-(?:SV-)?/i, 'JV-');
              } else if (typeof getNextJournalVoucherNo === 'function') {
                tdsVoucherNo = getNextJournalVoucherNo(vDate, false);
              } else {
                const yr = vDate ? new Date(vDate).getFullYear() : new Date().getFullYear();
                tdsVoucherNo = `JV-${yr}-001`;
              }
            }

            if (tdsEntry && tdsEntry.voucherNo !== tdsVoucherNo) {
              tdsEntry.voucherNo = tdsVoucherNo;
            }
            if (v.tdsVoucherNo !== tdsVoucherNo) {
              v.tdsVoucherNo = tdsVoucherNo;
            }

            transactions.push({
              id: v.tdsJournalEntryId || v.id,
              date: vDate,
              voucherNo: tdsVoucherNo,
              particulars: 'TDS Deducted',
              debit: 0,
              credit: tdsAmt,
              isSales: true
            });
          }
          if (paid > 0) {
            periodReceived += paid;
            const payEntry = v.paymentJournalEntryId && (typeof postedEntries !== 'undefined')
              ? postedEntries.find(e => String(e.id) === String(v.paymentJournalEntryId))
              : null;
            let payVoucherNo = (payEntry && payEntry.voucherNo) || v.paymentVoucherNo || '';
            if (!payVoucherNo || !payVoucherNo.startsWith('JV-')) {
              if (v.invoiceNo && v.invoiceNo.match(/^INV-\d{4}-\d+/i)) {
                payVoucherNo = v.invoiceNo.replace(/^INV-/i, 'JV-');
              } else if (payVoucherNo && payVoucherNo.match(/PAY-INV-(\d{4}-\d+)/i)) {
                payVoucherNo = payVoucherNo.replace(/PAY-INV-/i, 'JV-');
              } else if (payVoucherNo && payVoucherNo.match(/PAY-(?:SV-)?(\d{4}-\d+)/i)) {
                payVoucherNo = payVoucherNo.replace(/PAY-(?:SV-)?/i, 'JV-');
              } else if (typeof getNextJournalVoucherNo === 'function') {
                payVoucherNo = getNextJournalVoucherNo(vDate, false);
              } else {
                const yr = vDate ? new Date(vDate).getFullYear() : new Date().getFullYear();
                payVoucherNo = `JV-${yr}-001`;
              }
            }

            if (payEntry && payEntry.voucherNo !== payVoucherNo) {
              payEntry.voucherNo = payVoucherNo;
            }
            if (v.paymentVoucherNo !== payVoucherNo) {
              v.paymentVoucherNo = payVoucherNo;
            }

            transactions.push({
              id: v.paymentJournalEntryId || v.id,
              date: vDate,
              voucherNo: payVoucherNo,
              particulars: 'Payment Received',
              debit: 0,
              credit: paid,
              isSales: true
            });
          }
        }
      }
    });

    postedEntries.forEach(entry => {
      if (!entry) return;
      // Skip entries originating from Sales Module or linked to sales vouchers
      if (entry.preparedBy === 'Sales Module') return;
      if (entry.jeType === 'invoice' || entry.jeType === 'tds' || entry.jeType === 'payment') return;
      if (salesJournalEntryIds.has(String(entry.id))) return;

      const vNo = (entry.voucherNo || '').toLowerCase();
      if (vNo.startsWith('sv-') || vNo.startsWith('sr-') || vNo.startsWith('so-') || vNo.startsWith('pay-') || vNo.startsWith('tds-')) return;
      if (salesVoucherNos.has(vNo)) return;

      (entry.allRows || []).forEach(row => {
        const rowPart = (row.particular || '').trim().toLowerCase();
        const isCustName = (rowPart === customer.name.toLowerCase());
        const isTradeRec = (rowPart === 'trade receivables' && (entry.narration || '').toLowerCase().includes(customer.name.toLowerCase()));

        if (isCustName || isTradeRec) {
          const dr = parseFloat(row.debit) || 0;
          const cr = parseFloat(row.credit) || 0;
          if (dr > 0 || cr > 0) {
            if (dateFrom && entry.date < dateFrom) {
              preInvoiced += dr;
              preReceived += cr;
            } else if ((!dateFrom || entry.date >= dateFrom) && (!dateTo || entry.date <= dateTo)) {
              periodInvoiced += dr;
              periodReceived += cr;
              transactions.push({
                id: entry.id,
                date: entry.date,
                voucherNo: entry.voucherNo || 'JE-' + entry.id,
                particulars: getOppositeParticulars(entry, row.particular, dr > 0) || 'Journal Entry',
                debit: dr,
                credit: cr,
                isJournal: true
              });
            }
          }
        }
      });
    });

    const openingBalance = initialOpening + preInvoiced - preReceived;
    const periodNet = periodInvoiced - periodReceived;
    const closingBalance = openingBalance + periodNet;

    // Sort transactions chronologically: Old to New
    transactions.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      const cmp = dateA.localeCompare(dateB);
      if (cmp !== 0) return cmp;
      const idA = Number(a.id) || 0;
      const idB = Number(b.id) || 0;
      if (idA !== idB) return idA - idB;
      if (a.debit && !b.debit) return -1;
      if (!a.debit && b.debit) return 1;
      return 0;
    });

    return {
      customer,
      openingBalance,
      periodInvoiced,
      periodReceived,
      periodNet,
      closingBalance,
      transactions
    };
  }

  function getSupplierStatementData(supplierId, dateFrom, dateTo) {
    const supps = typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : [];
    const supplier = supps.find(s => String(s.id) === String(supplierId) || String(s.name).toLowerCase() === String(supplierId).toLowerCase());
    if (!supplier) return null;

    const initialOpening = parseFloat(supplier.openingBalance) || 0;
    let preBilled = 0, prePaid = 0;
    let periodBilled = 0, periodPaid = 0;
    const transactions = [];

    const vouchers = (window.KYA_STORE && Array.isArray(window.KYA_STORE.purchaseVouchers)) ? window.KYA_STORE.purchaseVouchers : [];
    vouchers.forEach(v => {
      if (v.isDraft) return;
      const isMatch = String(v.vendorId) === String(supplier.id) || (v.vendorName && v.vendorName.toLowerCase() === supplier.name.toLowerCase());
      if (!isMatch) return;

      const vDate = v.date || '';
      const total = parseFloat(v.total) || 0;
      const paid = (v.paymentStatus === 'Full Payment') ? total : (parseFloat(v.paymentAmount) || 0);

      if (dateFrom && vDate < dateFrom) {
        preBilled += total;
        prePaid += paid;
      } else if ((!dateFrom || vDate >= dateFrom) && (!dateTo || vDate <= dateTo)) {
        periodBilled += total;
        transactions.push({
          id: v.id,
          date: vDate,
          voucherNo: v.invoiceNo || 'PUR-' + v.id,
          particulars: 'Purchase Bill',
          debit: 0,
          credit: total,
          isPurchase: true
        });
        if (paid > 0) {
          periodPaid += paid;
          transactions.push({
            id: v.id,
            date: vDate,
            voucherNo: (v.invoiceNo || 'PUR-' + v.id) + ' (Pmt)',
            particulars: 'Payment Paid',
            debit: paid,
            credit: 0,
            isPurchase: true
          });
        }
      }
    });

    postedEntries.forEach(entry => {
      if ((entry.voucherNo || '').startsWith('PV-')) return;
      (entry.allRows || []).forEach(row => {
        const rowPart = row.particular.trim().toLowerCase();
        const isSuppName = (rowPart === supplier.name.toLowerCase());
        const isTradePay = (rowPart === 'trade payables' && (entry.narration || '').toLowerCase().includes(supplier.name.toLowerCase()));

        if (isSuppName || isTradePay) {
          const dr = parseFloat(row.debit) || 0;
          const cr = parseFloat(row.credit) || 0;
          if (dr > 0 || cr > 0) {
            if (dateFrom && entry.date < dateFrom) {
              prePaid += dr;
              preBilled += cr;
            } else if ((!dateFrom || entry.date >= dateFrom) && (!dateTo || entry.date <= dateTo)) {
              periodPaid += dr;
              periodBilled += cr;
              transactions.push({
                id: entry.id,
                date: entry.date,
                voucherNo: entry.voucherNo || 'JE-' + entry.id,
                particulars: getOppositeParticulars(entry, row.particular, dr > 0) || 'Journal Entry',
                debit: dr,
                credit: cr,
                isJournal: true
              });
            }
          }
        }
      });
    });

    const openingBalance = initialOpening + preBilled - prePaid;
    const periodNet = periodBilled - periodPaid;
    const closingBalance = openingBalance + periodNet;

    // Sort transactions chronologically: Old to New
    transactions.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      const cmp = dateA.localeCompare(dateB);
      if (cmp !== 0) return cmp;
      const idA = Number(a.id) || 0;
      const idB = Number(b.id) || 0;
      if (idA !== idB) return idA - idB;
      if (a.credit && !b.credit) return -1;
      if (!a.credit && b.credit) return 1;
      return 0;
    });

    return {
      supplier,
      openingBalance,
      periodBilled,
      periodPaid,
      periodNet,
      closingBalance,
      transactions
    };
  }

  function renderLedgerStatementView() {
    const wrap = document.getElementById('statementTableWrap');
    if (!wrap) return;

    const ledger = coaLedgers.find(l => l.id === _ledgerStatementId);
    if (!ledger) {
      wrap.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--slate-400);">Account not found.</div>`;
      return;
    }

    // Set header labels
    document.getElementById('statementLedgerName').textContent = ledger.name;
    document.getElementById('statementSubGroupName').textContent = resolveLedgerSubgroupName(ledger);

    // Get date values
    const fromInp = document.getElementById('statementDateFrom');
    const toInp = document.getElementById('statementDateTo');
    const dateFrom = fromInp ? fromInp.value : '';
    const dateTo = toInp ? toInp.value : '';

    if (fromInp && !fromInp._wired) {
      fromInp._wired = true;
      fromInp.addEventListener('change', renderLedgerStatementView);
    }
    if (toInp && !toInp._wired) {
      toInp._wired = true;
      toInp.addEventListener('change', renderLedgerStatementView);
    }

    // Calculate balances
    const balances = calculateLedgerBalances(ledger, dateFrom, dateTo);

    // Filter transactions
    const custs = (ledger.sgId === 'sg-tr' || (ledger.name || '').trim().toLowerCase() === 'trade receivables')
      ? (typeof getKyaCustomers === 'function' ? getKyaCustomers() : [])
      : [];
    const supps = (ledger.sgId === 'sg-tp' || (ledger.name || '').trim().toLowerCase() === 'trade payables')
      ? (typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : [])
      : [];
    const custNames = new Set(custs.map(c => (c.name || '').trim().toLowerCase()));
    const suppNames = new Set(supps.map(s => (s.name || '').trim().toLowerCase()));

    const ledgerTrans = [];
    postedEntries.forEach(entry => {
      if (dateFrom && entry.date < dateFrom) return;
      if (dateTo && entry.date > dateTo) return;

      (entry.allRows || []).forEach(row => {
        const rowPart = (row.particular || '').trim().toLowerCase();
        const isMatch = (rowPart === ledger.name.trim().toLowerCase()) ||
          (custNames.size > 0 && custNames.has(rowPart)) ||
          (suppNames.size > 0 && suppNames.has(rowPart));

        if (isMatch) {
          const dr = parseFloat(row.debit) || 0;
          const cr = parseFloat(row.credit) || 0;
          if (dr > 0 || cr > 0) {
            ledgerTrans.push({
              id: entry.id,
              date: entry.date,
              voucherNo: entry.voucherNo || '-',
              particulars: getOppositeParticulars(entry, row.particular, dr > 0),
              debit: dr,
              credit: cr
            });
          }
        }
      });
    });

    // Sort transactions chronologically: Old to New
    ledgerTrans.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      const cmp = dateA.localeCompare(dateB);
      if (cmp !== 0) return cmp;
      const idA = Number(a.id) || 0;
      const idB = Number(b.id) || 0;
      return idA - idB;
    });

    let rowsHtml = '';
    const mainGroup = getLedgerMainGroup(ledger);
    const mainGroupLabel = (mainGroup === 'assets' || mainGroup === 'expense') ? 'Dr' : 'Cr';
    const opBalLabel = balances.openingBalance < 0 ? (mainGroupLabel === 'Dr' ? 'Cr' : 'Dr') : mainGroupLabel;
    const opBalText = `₹${fmtNum(Math.abs(balances.openingBalance).toFixed(2))} ${opBalLabel}`;

    rowsHtml += `
      <tr style="background: var(--slate-50); font-style: italic;">
        <td style="white-space: nowrap;">-</td>
        <td>Opening Balance</td>
        <td>-</td>
        <td class="num-col">${(balances.openingBalance >= 0 && mainGroupLabel === 'Dr') || (balances.openingBalance < 0 && mainGroupLabel === 'Cr') ? opBalText : '-'}</td>
        <td class="num-col">${(balances.openingBalance >= 0 && mainGroupLabel === 'Cr') || (balances.openingBalance < 0 && mainGroupLabel === 'Dr') ? opBalText : '-'}</td>
      </tr>
    `;

    ledgerTrans.forEach(tr => {
      const drText = tr.debit ? `₹${fmtNum(tr.debit.toFixed(2))}` : '-';
      const crText = tr.credit ? `₹${fmtNum(tr.credit.toFixed(2))}` : '-';

      let formattedDate = tr.date;
      if (tr.date && tr.date.includes('-')) {
        const parts = tr.date.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
          formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      rowsHtml += `
        <tr>
          <td style="white-space: nowrap;">${formattedDate}</td>
          <td>${ohEsc(tr.particulars)}</td>
          <td style="white-space: nowrap;"><span style="font-family: monospace; font-weight: 700; color: var(--slate-700); cursor:pointer; text-decoration:underline dotted; white-space: nowrap;" onclick="viewVoucherFromStatement(${tr.id})" title="Click to view voucher">${ohEsc(tr.voucherNo)}</span></td>
          <td class="num-col" style="color: var(--red-600);">${drText}</td>
          <td class="num-col" style="color: var(--emerald-600);">${crText}</td>
        </tr>
      `;
    });

    if (ledgerTrans.length === 0 && balances.openingBalance === 0) {
      rowsHtml += `
        <tr>
          <td colspan="5" style="text-align: center; padding: 20px; color: var(--slate-400);">No transactions found in this period.</td>
        </tr>
      `;
    }

    wrap.innerHTML = `
      <table class="tb-table">
        <thead>
          <tr>
            <th style="width: 110px; white-space: nowrap;">Date</th>
            <th>Particular</th>
            <th style="width: 140px; white-space: nowrap;">Voucher No</th>
            <th class="num-col" style="width: 130px;">Debit</th>
            <th class="num-col" style="width: 130px;">Credit</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;

    const opBalFormatted = `₹${fmtNum(Math.abs(balances.openingBalance).toFixed(2))} ${balances.openingBalance < 0 ? (mainGroupLabel === 'Dr' ? 'Cr' : 'Dr') : mainGroupLabel}`;
    const curBalFormatted = `₹${fmtNum(Math.abs(balances.periodNet).toFixed(2))} ${balances.periodNet < 0 ? 'Cr' : 'Dr'}`;
    const clBalFormatted = `₹${fmtNum(Math.abs(balances.closingBalance).toFixed(2))} ${balances.closingBalance < 0 ? (mainGroupLabel === 'Dr' ? 'Cr' : 'Dr') : mainGroupLabel}`;

    document.getElementById('statementOpeningBal').textContent = opBalFormatted;
    document.getElementById('statementCurrentBal').textContent = curBalFormatted;
    document.getElementById('statementClosingBal').textContent = clBalFormatted;
  }

  function renderCustomerStatementView() {
    const wrap = document.getElementById('statementCustTableWrap');
    if (!wrap) return;

    const custs = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
    const customer = custs.find(c => String(c.id) === String(_customerStatementId) || String(c.name).toLowerCase() === String(_customerStatementId).toLowerCase());
    if (!customer) {
      wrap.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--slate-400);">Customer not found.</div>`;
      return;
    }

    document.getElementById('statementCustName').textContent = customer.name;

    const fromInp = document.getElementById('statementCustDateFrom');
    const toInp = document.getElementById('statementCustDateTo');
    const dateFrom = fromInp ? fromInp.value : '';
    const dateTo = toInp ? toInp.value : '';

    if (fromInp && !fromInp._wired) {
      fromInp._wired = true;
      fromInp.addEventListener('change', renderCustomerStatementView);
    }
    if (toInp && !toInp._wired) {
      toInp._wired = true;
      toInp.addEventListener('change', renderCustomerStatementView);
    }

    const data = getCustomerStatementData(customer.id, dateFrom, dateTo);
    if (!data) return;

    let rowsHtml = '';
    const opBalText = `₹${fmtNum(Math.abs(data.openingBalance).toFixed(2))} ${data.openingBalance < 0 ? 'Cr' : 'Dr'}`;

    rowsHtml += `
      <tr style="background: var(--slate-50); font-style: italic;">
        <td style="white-space: nowrap;">-</td>
        <td>Opening Balance</td>
        <td>-</td>
        <td class="num-col">${data.openingBalance >= 0 ? opBalText : '-'}</td>
        <td class="num-col">${data.openingBalance < 0 ? opBalText : '-'}</td>
      </tr>
    `;

    data.transactions.forEach(tr => {
      const drText = tr.debit ? `₹${fmtNum(tr.debit.toFixed(2))}` : '-';
      const crText = tr.credit ? `₹${fmtNum(tr.credit.toFixed(2))}` : '-';

      let formattedDate = tr.date;
      if (tr.date && tr.date.includes('-')) {
        const parts = tr.date.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
          formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      const clickAction = `viewVoucherFromStatement('${tr.id}', '${ohEsc(tr.voucherNo)}')`;

      rowsHtml += `
        <tr>
          <td style="white-space: nowrap;">${formattedDate}</td>
          <td>${ohEsc(tr.particulars)}</td>
          <td style="white-space: nowrap;"><span style="font-family: monospace; font-weight: 700; color: var(--slate-700); cursor:pointer; text-decoration:underline dotted; white-space: nowrap;" onclick="${clickAction}" title="Click to view voucher">${ohEsc(tr.voucherNo)}</span></td>
          <td class="num-col" style="color: var(--red-600);">${drText}</td>
          <td class="num-col" style="color: var(--emerald-600);">${crText}</td>
        </tr>
      `;
    });

    if (data.transactions.length === 0 && data.openingBalance === 0) {
      rowsHtml += `
        <tr>
          <td colspan="5" style="text-align: center; padding: 20px; color: var(--slate-400);">No transactions found in this period.</td>
        </tr>
      `;
    }

    wrap.innerHTML = `
      <table class="tb-table">
        <thead>
          <tr>
            <th style="width: 110px; white-space: nowrap;">Date</th>
            <th>Particular</th>
            <th style="width: 140px; white-space: nowrap;">Voucher No</th>
            <th class="num-col" style="width: 130px;">Debit</th>
            <th class="num-col" style="width: 130px;">Credit</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;

    document.getElementById('statementCustOpeningBal').textContent = `₹${fmtNum(Math.abs(data.openingBalance).toFixed(2))} ${data.openingBalance < 0 ? 'Cr' : 'Dr'}`;
    document.getElementById('statementCustCurrentBal').textContent = `₹${fmtNum(Math.abs(data.periodNet).toFixed(2))} ${data.periodNet < 0 ? 'Cr' : 'Dr'}`;
    document.getElementById('statementCustClosingBal').textContent = `₹${fmtNum(Math.abs(data.closingBalance).toFixed(2))} ${data.closingBalance < 0 ? 'Cr' : 'Dr'}`;
  }

  function renderSupplierStatementView() {
    const wrap = document.getElementById('statementSuppTableWrap');
    if (!wrap) return;

    const supps = typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : [];
    const supplier = supps.find(s => String(s.id) === String(_supplierStatementId) || String(s.name).toLowerCase() === String(_supplierStatementId).toLowerCase());
    if (!supplier) {
      wrap.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--slate-400);">Supplier not found.</div>`;
      return;
    }

    document.getElementById('statementSuppName').textContent = supplier.name;

    const fromInp = document.getElementById('statementSuppDateFrom');
    const toInp = document.getElementById('statementSuppDateTo');
    const dateFrom = fromInp ? fromInp.value : '';
    const dateTo = toInp ? toInp.value : '';

    if (fromInp && !fromInp._wired) {
      fromInp._wired = true;
      fromInp.addEventListener('change', renderSupplierStatementView);
    }
    if (toInp && !toInp._wired) {
      toInp._wired = true;
      toInp.addEventListener('change', renderSupplierStatementView);
    }

    const data = getSupplierStatementData(supplier.id, dateFrom, dateTo);
    if (!data) return;

    let rowsHtml = '';
    const opBalText = `₹${fmtNum(Math.abs(data.openingBalance).toFixed(2))} Cr`;

    rowsHtml += `
      <tr style="background: var(--slate-50); font-style: italic;">
        <td style="white-space: nowrap;">-</td>
        <td>Opening Balance</td>
        <td>-</td>
        <td class="num-col">-</td>
        <td class="num-col">${opBalText}</td>
      </tr>
    `;

    data.transactions.forEach(tr => {
      const drText = tr.debit ? `₹${fmtNum(tr.debit.toFixed(2))}` : '-';
      const crText = tr.credit ? `₹${fmtNum(tr.credit.toFixed(2))}` : '-';

      let formattedDate = tr.date;
      if (tr.date && tr.date.includes('-')) {
        const parts = tr.date.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
          formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      const clickAction = `viewVoucherFromStatement('${tr.id}', '${ohEsc(tr.voucherNo)}')`;

      rowsHtml += `
        <tr>
          <td style="white-space: nowrap;">${formattedDate}</td>
          <td>${ohEsc(tr.particulars)}</td>
          <td style="white-space: nowrap;"><span style="font-family: monospace; font-weight: 700; color: var(--slate-700); cursor:pointer; text-decoration:underline dotted; white-space: nowrap;" onclick="${clickAction}" title="Click to view voucher">${ohEsc(tr.voucherNo)}</span></td>
          <td class="num-col" style="color: var(--red-600);">${drText}</td>
          <td class="num-col" style="color: var(--emerald-600);">${crText}</td>
        </tr>
      `;
    });

    if (data.transactions.length === 0 && data.openingBalance === 0) {
      rowsHtml += `
        <tr>
          <td colspan="5" style="text-align: center; padding: 20px; color: var(--slate-400);">No transactions found in this period.</td>
        </tr>
      `;
    }

    wrap.innerHTML = `
      <table class="tb-table">
        <thead>
          <tr>
            <th style="width: 110px; white-space: nowrap;">Date</th>
            <th>Particular</th>
            <th style="width: 140px; white-space: nowrap;">Voucher No</th>
            <th class="num-col" style="width: 130px;">Debit</th>
            <th class="num-col" style="width: 130px;">Credit</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;

    document.getElementById('statementSuppOpeningBal').textContent = `₹${fmtNum(Math.abs(data.openingBalance).toFixed(2))} Cr`;
    document.getElementById('statementSuppCurrentBal').textContent = `₹${fmtNum(Math.abs(data.periodNet).toFixed(2))} ${data.periodNet >= 0 ? 'Cr' : 'Dr'}`;
    document.getElementById('statementSuppClosingBal').textContent = `₹${fmtNum(Math.abs(data.closingBalance).toFixed(2))} Cr`;
  }

  // ══════════════════════════════════════════════════════════════════
  //  STATEMENT EXPORT HELPERS & WIRING
  // ══════════════════════════════════════════════════════════════════

  function getLedgerStatementExportData() {
    const ledger = coaLedgers.find(l => l.id === _ledgerStatementId);
    if (!ledger) return null;

    const fromInp = document.getElementById('statementDateFrom');
    const toInp = document.getElementById('statementDateTo');
    const dateFrom = fromInp ? fromInp.value : '';
    const dateTo = toInp ? toInp.value : '';

    const balances = calculateLedgerBalances(ledger, dateFrom, dateTo);

    const custs = (ledger.sgId === 'sg-tr' || (ledger.name || '').trim().toLowerCase() === 'trade receivables')
      ? (typeof getKyaCustomers === 'function' ? getKyaCustomers() : [])
      : [];
    const supps = (ledger.sgId === 'sg-tp' || (ledger.name || '').trim().toLowerCase() === 'trade payables')
      ? (typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : [])
      : [];
    const custNames = new Set(custs.map(c => (c.name || '').trim().toLowerCase()));
    const suppNames = new Set(supps.map(s => (s.name || '').trim().toLowerCase()));

    const ledgerTrans = [];
    let totalDebit = 0;
    let totalCredit = 0;

    postedEntries.forEach(entry => {
      if (dateFrom && entry.date < dateFrom) return;
      if (dateTo && entry.date > dateTo) return;

      (entry.allRows || []).forEach(row => {
        const rowPart = (row.particular || '').trim().toLowerCase();
        const isMatch = (rowPart === ledger.name.trim().toLowerCase()) ||
          (custNames.size > 0 && custNames.has(rowPart)) ||
          (suppNames.size > 0 && suppNames.has(rowPart));

        if (isMatch) {
          const dr = parseFloat(row.debit) || 0;
          const cr = parseFloat(row.credit) || 0;
          if (dr > 0 || cr > 0) {
            totalDebit += dr;
            totalCredit += cr;
            ledgerTrans.push({
              id: entry.id,
              date: entry.date,
              voucherNo: entry.voucherNo || '-',
              particulars: getOppositeParticulars(entry, row.particular, dr > 0),
              debit: dr,
              credit: cr
            });
          }
        }
      });
    });

    // Sort transactions chronologically: Old to New
    ledgerTrans.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      const cmp = dateA.localeCompare(dateB);
      if (cmp !== 0) return cmp;
      const idA = Number(a.id) || 0;
      const idB = Number(b.id) || 0;
      return idA - idB;
    });

    const activeCo = (typeof getActiveCompany === 'function' ? getActiveCompany() : null) || {};
    const companyName = activeCo.name || 'KYA Accounting';

    return {
      companyName,
      type: 'ledger',
      title: 'LEDGER STATEMENT',
      accountName: ledger.name,
      code: ledger.code || '',
      subgroupName: resolveLedgerSubgroupName(ledger),
      dateFrom,
      dateTo,
      openingBalance: balances.openingBalance,
      periodNet: balances.periodNet,
      closingBalance: balances.closingBalance,
      totalDebit,
      totalCredit,
      transactions: ledgerTrans
    };
  }

  function getCustomerStatementExportData() {
    const custs = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
    const customer = custs.find(c => String(c.id) === String(_customerStatementId) || String(c.name).toLowerCase() === String(_customerStatementId).toLowerCase());
    if (!customer) return null;

    const fromInp = document.getElementById('statementCustDateFrom');
    const toInp = document.getElementById('statementCustDateTo');
    const dateFrom = fromInp ? fromInp.value : '';
    const dateTo = toInp ? toInp.value : '';

    const data = getCustomerStatementData(customer.id, dateFrom, dateTo);
    if (!data) return null;

    let totalDebit = 0;
    let totalCredit = 0;
    (data.transactions || []).forEach(tr => {
      totalDebit += (parseFloat(tr.debit) || 0);
      totalCredit += (parseFloat(tr.credit) || 0);
    });

    const activeCo = (typeof getActiveCompany === 'function' ? getActiveCompany() : null) || {};
    const companyName = activeCo.name || 'KYA Accounting';

    return {
      companyName,
      type: 'customer',
      title: 'CUSTOMER STATEMENT',
      accountName: customer.name,
      code: customer.code || '',
      subgroupName: 'Trade Receivables (Sundry Debtors)',
      dateFrom,
      dateTo,
      openingBalance: data.openingBalance,
      periodNet: data.periodNet,
      closingBalance: data.closingBalance,
      totalDebit,
      totalCredit,
      transactions: data.transactions || []
    };
  }

  function getSupplierStatementExportData() {
    const supps = typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : [];
    const supplier = supps.find(s => String(s.id) === String(_supplierStatementId) || String(s.name).toLowerCase() === String(_supplierStatementId).toLowerCase());
    if (!supplier) return null;

    const fromInp = document.getElementById('statementSuppDateFrom');
    const toInp = document.getElementById('statementSuppDateTo');
    const dateFrom = fromInp ? fromInp.value : '';
    const dateTo = toInp ? toInp.value : '';

    const data = getSupplierStatementData(supplier.id, dateFrom, dateTo);
    if (!data) return null;

    let totalDebit = 0;
    let totalCredit = 0;
    (data.transactions || []).forEach(tr => {
      totalDebit += (parseFloat(tr.debit) || 0);
      totalCredit += (parseFloat(tr.credit) || 0);
    });

    const activeCo = (typeof getActiveCompany === 'function' ? getActiveCompany() : null) || {};
    const companyName = activeCo.name || 'KYA Accounting';

    return {
      companyName,
      type: 'supplier',
      title: 'SUPPLIER STATEMENT',
      accountName: supplier.name,
      code: supplier.code || '',
      subgroupName: 'Trade Payables (Sundry Creditors)',
      dateFrom,
      dateTo,
      openingBalance: data.openingBalance,
      periodNet: data.periodNet,
      closingBalance: data.closingBalance,
      totalDebit,
      totalCredit,
      transactions: data.transactions || []
    };
  }

  // ══════════════════════════════════════════════════════════════════
  //  5. ADD LEDGERS VIEW (ORIGINAL UNTOUCHED LEDGERS UI)
  // ══════════════════════════════════════════════════════════════════

  function renderLedgerAddView() {
    const wrap = document.getElementById('ledgerAddWrap');
    if (!wrap) return;

    _ledgerAddAliases = [];

    wrap.innerHTML = `
      <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--white);">
        <!-- Slider toggle -->
        <div class="coa-slider-wrap">
          <div class="coa-slider-bg ledger-active" id="ldgAddSliderBg"></div>
          <button class="coa-slider-btn active" id="ldgAddTogLedger" type="button">Ledger</button>
          <button class="coa-slider-btn" id="ldgAddTogGroup" type="button">Group Ledger</button>
        </div>

        <div class="coa-modal-fg">
          <label class="coa-modal-label" id="ldgAddNameLabel">Ledger Name *</label>
          <input class="coa-modal-inp" id="ldgAddName" placeholder="e.g. Cash in Hand">
        </div>

        <div class="coa-modal-fg" style="margin-top: 12px; margin-bottom: 12px;">
          <label class="coa-modal-label">Also Known As (A.K.A) / Aliases</label>
          <div id="ldgAddAliasesContainer" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;"></div>
          <button type="button" class="btn btn-secondary btn-sm" id="ldgAddAddAliasBtn" style="padding: 6px 12px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; color: var(--slate-600);">
            ＋ Add A.K.A
          </button>
        </div>

        <div class="coa-modal-group-box" style="background: var(--slate-50); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
          <div class="coa-modal-fg" style="position: relative;">
            <label class="coa-modal-label" id="ldgAddParentLabel">Sub Group / Group Ledger *</label>
            <select class="coa-modal-sel" id="ldgAddParentSelector" style="display: none;"></select>
            <div class="kya-searchable-select-wrap" id="ldgAddParentSelectorSearchableWrap" style="position: relative; width: 100%;">
              <div class="kya-searchable-select-trigger" id="ldgAddParentSelectorTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10.5px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                <span id="ldgAddParentSelectorTriggerText">Select Sub Group / Group Ledger</span>
                <span style="font-size: 10px; color: var(--slate-400);">▼</span>
              </div>
              <div class="kya-searchable-select-dropdown" id="ldgAddParentSelectorDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 240px; overflow-y: auto; flex-direction: column; gap: 4px; width: 100%; box-sizing: border-box;">
                <input type="text" id="ldgAddParentSelectorSearch" placeholder="Search..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                <div id="ldgAddParentSelectorOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="coa-modal-fg" id="ldgAddBalanceContainer" style="margin-bottom: 20px;">
          <label class="coa-modal-label">Opening Balance (Optional)</label>
          <input class="coa-modal-inp" id="ldgAddBalance" type="number" min="0" step="0.01" placeholder="₹ 0.00">
        </div>

        <div style="display: flex; gap: 12px;">
          <button class="btn btn-primary" id="ldgAddSaveBtn" style="height: 38px;">＋ Add Ledger</button>
          <button class="btn btn-secondary" id="ldgAddCancelBtn" style="height: 38px;">Cancel</button>
        </div>
      </div>
    `;

    let searchableControl = null;
    const parentSel = document.getElementById('ldgAddParentSelector');
    const parentLabel = document.getElementById('ldgAddParentLabel');

    const populateParentOptions = (type) => {
      const options = [];
      if (type === 'ledger') {
        parentLabel.textContent = 'Sub Group / Group Ledger *';
        COA_SYS_SGS.forEach(sg => {
          const indent = sg.parent ? '\u00a0\u00a0\u00a0\u00a0' : '';
          options.push(`<option value="sg:${sg.id}">${indent}${sg.name}</option>`);

          const addGls = (parentId, depth) => {
            const gls = coaLedgers.filter(l => l.sgId === sg.id && l.type === 'group-ledger' && (parentId ? l.glId === parentId : !l.glId));
            gls.forEach(gl => {
              const glIndent = indent + '\u00a0\u00a0\u00a0\u00a0' + '\u00a0\u00a0'.repeat(depth);
              options.push(`<option value="gl:${gl.id}">${glIndent}📁 ${gl.name}</option>`);
              addGls(gl.id, depth + 1);
            });
          };
          addGls(null, 0);
        });
      } else {
        parentLabel.textContent = 'Sub Group / Parent Group *';
        COA_SYS_SGS.forEach(sg => {
          const indent = sg.parent ? '\u00a0\u00a0\u00a0\u00a0' : '';
          options.push(`<option value="sg:${sg.id}">${indent}${sg.name}</option>`);

          const addGls = (parentId, depth) => {
            const gls = coaLedgers.filter(l => l.sgId === sg.id && l.type === 'group-ledger' && (parentId ? l.glId === parentId : !l.glId));
            gls.forEach(gl => {
              const glIndent = indent + '\u00a0\u00a0\u00a0\u00a0' + '\u00a0\u00a0'.repeat(depth);
              options.push(`<option value="gl:${gl.id}">${glIndent}📁 ${gl.name}</option>`);
              addGls(gl.id, depth + 1);
            });
          };
          addGls(null, 0);
        });
      }
      parentSel.innerHTML = options.join('');
      if (searchableControl) searchableControl.refresh();
    };

    let selectedType = 'ledger';
    const sliderBg = document.getElementById('ldgAddSliderBg');
    const togLedger = document.getElementById('ldgAddTogLedger');
    const togGroup = document.getElementById('ldgAddTogGroup');
    const nameLabel = document.getElementById('ldgAddNameLabel');
    const nameInp = document.getElementById('ldgAddName');
    const balContainer = document.getElementById('ldgAddBalanceContainer');
    const saveBtn = document.getElementById('ldgAddSaveBtn');

    const updateTypeUI = () => {
      if (selectedType === 'ledger') {
        sliderBg.className = 'coa-slider-bg ledger-active';
        togLedger.classList.add('active');
        togGroup.classList.remove('active');
        nameLabel.textContent = 'Ledger Name *';
        nameInp.placeholder = 'e.g. Cash in Hand';
        balContainer.style.display = '';
        saveBtn.textContent = '＋ Add Ledger';
        populateParentOptions('ledger');
      } else {
        sliderBg.className = 'coa-slider-bg group-active';
        togLedger.classList.remove('active');
        togGroup.classList.add('active');
        nameLabel.textContent = 'Group Ledger Name *';
        nameInp.placeholder = 'e.g. Fixed Assets Group';
        balContainer.style.display = 'none';
        saveBtn.textContent = '＋ Add Group Ledger';
        populateParentOptions('group-ledger');
      }
    };

    togLedger.addEventListener('click', () => {
      selectedType = 'ledger';
      updateTypeUI();
    });

    togGroup.addEventListener('click', () => {
      selectedType = 'group-ledger';
      updateTypeUI();
    });

    searchableControl = initGenericSearchableSelect(wrap, 'ldgAddParentSelector', 'Select Sub Group / Group Ledger');
    updateTypeUI();

    setupDynamicAliases('ldgAddAliasesContainer', 'ldgAddAddAliasBtn', _ledgerAddAliases);

    document.getElementById('ldgAddCancelBtn').addEventListener('click', () => {
      switchLedgerTab('list');
    });

    document.getElementById('ldgAddSaveBtn').addEventListener('click', () => {
      const nameEl = document.getElementById('ldgAddName');
      const name = nameEl.value.trim();
      if (!name) {
        nameEl.style.borderColor = 'var(--red-600)';
        nameEl.focus();
        return;
      }
      nameEl.style.borderColor = '';

      const parentVal = parentSel.value;
      if (!parentVal) {
        showToast('Please select a Sub Group or Group Ledger.', 'error');
        return;
      }

      const [pType, pId] = parentVal.split(':');
      let sgId = '';
      let glId = null;

      if (pType === 'sg') {
        sgId = pId;
        glId = null;
      } else if (pType === 'gl') {
        const parentGl = coaLedgers.find(l => l.id === Number(pId));
        if (parentGl) {
          sgId = parentGl.sgId;
          glId = parentGl.id;
        } else {
          showToast('Invalid Group Ledger selected.', 'error');
          return;
        }
      }

      const bal = selectedType === 'ledger' ? document.getElementById('ldgAddBalance').value.trim() : '';
      const aliases = _ledgerAddAliases.map(a => a.trim()).filter(a => a !== '');

      coaLedgers.push({
        id: Date.now() + _coaLedgerCtr++,
        sgId,
        glId: glId,
        name,
        code: '',
        openingBalance: selectedType === 'ledger' ? bal : 0,
        type: selectedType,
        aliases: aliases
      });

      const sg = COA_SYS_SGS.find(s => s.id === sgId);
      if (sg) {
        _coaExpanded.add(sgId);
        if (sg.parent) _coaExpanded.add(sg.parent);
        _coaExpanded.add(sg.main);
        if (glId) _coaExpanded.add('gl-' + glId);
      }

      showToast(`${selectedType === 'group-ledger' ? 'Group Ledger' : 'Ledger'} "${name}" added successfully.`, 'success');
      renderChartPanel();
      refreshAllReports();
      triggerAutoBackup();

      switchLedgerTab('list');
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  6. ALTER LEDGERS VIEW (ORIGINAL UNTOUCHED LEDGERS UI)
  // ══════════════════════════════════════════════════════════════════

  function renderLedgerAlterView() {
    const wrap = document.getElementById('ledgerAlterWrap');
    if (!wrap) return;

    if (coaLedgers.length === 0) {
      wrap.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--slate-400);">No accounts available to alter.</div>`;
      return;
    }

    let currentLedger = coaLedgers.find(l => l.id === _ledgerEditId);
    let selectedType = currentLedger ? currentLedger.type : 'ledger';

    const ledgersOfType = coaLedgers.filter(l => l.type === selectedType);
    if (!currentLedger || currentLedger.type !== selectedType) {
      currentLedger = ledgersOfType.length > 0 ? ledgersOfType[0] : null;
      _ledgerEditId = currentLedger ? currentLedger.id : null;
    }

    _ledgerAlterAliases = currentLedger ? (currentLedger.aliases ? [...currentLedger.aliases] : []) : [];

    const ledgersList = [...coaLedgers]
      .filter(l => l.type === selectedType)
      .sort((a, b) => a.name.localeCompare(b.name));

    const ldgSelectorOpts = ledgersList.map(l => {
      return `<option value="${l.id}" ${l.id === _ledgerEditId ? 'selected' : ''}>${l.name}</option>`;
    }).join('');

    const parentOptions = [];
    const isLedger = selectedType === 'ledger';
    const parentLabelText = isLedger ? 'Sub Group / Group Ledger *' : 'Sub Group *';

    if (currentLedger) {
      COA_SYS_SGS.forEach(sg => {
        const indent = sg.parent ? '\u00a0\u00a0\u00a0\u00a0' : '';
        const isSelected = (!currentLedger.glId && sg.id === currentLedger.sgId);
        parentOptions.push(`<option value="sg:${sg.id}" ${isSelected ? 'selected' : ''}>${indent}${sg.name}</option>`);

        const addAlterGls = (parentId, depth) => {
          const gls = coaLedgers.filter(l => l.sgId === sg.id && l.type === 'group-ledger' && l.id !== currentLedger.id && (parentId ? l.glId === parentId : !l.glId));
          gls.forEach(gl => {
            const isGlSelected = (gl.id === currentLedger.glId);
            const glIndent = indent + '\u00a0\u00a0\u00a0\u00a0' + '\u00a0\u00a0'.repeat(depth);
            parentOptions.push(`<option value="gl:${gl.id}" ${isGlSelected ? 'selected' : ''}>${glIndent}📁 ${gl.name}</option>`);
            addAlterGls(gl.id, depth + 1);
          });
        };
        addAlterGls(null, 0);
      });
    }
    const parentOptsHtml = parentOptions.join('');

    if (!currentLedger) {
      wrap.innerHTML = `
        <div class="coa-slider-wrap" style="margin-bottom: 20px; max-width: 600px;">
          <div class="coa-slider-bg ${selectedType === 'ledger' ? 'ledger-active' : 'group-active'}" id="ldgAlterSliderBg"></div>
          <button class="coa-slider-btn${selectedType === 'ledger' ? ' active' : ''}" id="ldgAlterTogLedger" type="button">Ledger</button>
          <button class="coa-slider-btn${selectedType === 'group-ledger' ? ' active' : ''}" id="ldgAlterTogGroup" type="button">Group Ledger</button>
        </div>
        <div style="padding: 20px; text-align: center; color: var(--slate-400);">No ${selectedType === 'group-ledger' ? 'group ledgers' : 'ledgers'} available.</div>
      `;
      document.getElementById('ldgAlterTogLedger').addEventListener('click', () => {
        const firstLedger = coaLedgers.find(l => l.type === 'ledger');
        _ledgerEditId = firstLedger ? firstLedger.id : null;
        renderLedgerAlterView();
      });
      document.getElementById('ldgAlterTogGroup').addEventListener('click', () => {
        const firstGl = coaLedgers.find(l => l.type === 'group-ledger');
        _ledgerEditId = firstGl ? firstGl.id : null;
        renderLedgerAlterView();
      });
      return;
    }

    wrap.innerHTML = `
      <div class="coa-slider-wrap" style="margin-bottom: 20px; max-width: 600px;">
        <div class="coa-slider-bg ${selectedType === 'ledger' ? 'ledger-active' : 'group-active'}" id="ldgAlterSliderBg"></div>
        <button class="coa-slider-btn${selectedType === 'ledger' ? ' active' : ''}" id="ldgAlterTogLedger" type="button">Ledger</button>
        <button class="coa-slider-btn${selectedType === 'group-ledger' ? ' active' : ''}" id="ldgAlterTogGroup" type="button">Group Ledger</button>
      </div>

      <div style="margin-bottom: 20px; max-width: 600px; position: relative;">
        <label class="coa-modal-label">Select Account to Alter</label>
        <select id="ldgAlterSelector" style="display: none;">
          ${ldgSelectorOpts}
        </select>
        <div class="kya-searchable-select-wrap" id="ldgAlterSelectorSearchableWrap" style="position: relative; width: 100%;">
          <div class="kya-searchable-select-trigger" id="ldgAlterSelectorTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10.5px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
            <span id="ldgAlterSelectorTriggerText">Select Account to Alter</span>
            <span style="font-size: 10px; color: var(--slate-400);">▼</span>
          </div>
          <div class="kya-searchable-select-dropdown" id="ldgAlterSelectorDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 240px; overflow-y: auto; flex-direction: column; gap: 4px; width: 100%; box-sizing: border-box;">
            <input type="text" id="ldgAlterSelectorSearch" placeholder="Search..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
            <div id="ldgAlterSelectorOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
          </div>
        </div>
      </div>

      <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--white);">
        <div class="coa-modal-fg">
          <label class="coa-modal-label">${isLedger ? 'Ledger Name *' : 'Group Ledger Name *'}</label>
          <input class="coa-modal-inp" id="ldgAlterName" placeholder="${isLedger ? 'e.g. Cash in Hand' : 'e.g. Fixed Assets Group'}" value="${currentLedger.name.replace(/"/g,'&quot;')}">
        </div>

        <div class="coa-modal-fg" style="margin-top: 12px; margin-bottom: 12px;">
          <label class="coa-modal-label">Also Known As (A.K.A) / Aliases</label>
          <div id="ldgAlterAliasesContainer" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;"></div>
          <button type="button" class="btn btn-secondary btn-sm" id="ldgAlterAddAliasBtn" style="padding: 6px 12px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; color: var(--slate-600);">
            ＋ Add A.K.A
          </button>
        </div>

        <div class="coa-modal-group-box" style="background: var(--slate-50); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
          <div class="coa-modal-fg" style="position: relative;">
            <label class="coa-modal-label" id="ldgAlterParentLabel">${parentLabelText}</label>
            <select class="coa-modal-sel" id="ldgAlterParentSelector" style="display: none;">
              ${parentOptsHtml}
            </select>
            <div class="kya-searchable-select-wrap" id="ldgAlterParentSelectorSearchableWrap" style="position: relative; width: 100%;">
              <div class="kya-searchable-select-trigger" id="ldgAlterParentSelectorTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10.5px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                <span id="ldgAlterParentSelectorTriggerText">Select Sub Group / Group Ledger</span>
                <span style="font-size: 10px; color: var(--slate-400);">▼</span>
              </div>
              <div class="kya-searchable-select-dropdown" id="ldgAlterParentSelectorDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 240px; overflow-y: auto; flex-direction: column; gap: 4px; width: 100%; box-sizing: border-box;">
                <input type="text" id="ldgAlterParentSelectorSearch" placeholder="Search..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                <div id="ldgAlterParentSelectorOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
              </div>
            </div>
          </div>
        </div>

        ${isLedger ? `
        <div class="coa-modal-fg" style="margin-bottom: 20px;">
          <label class="coa-modal-label">Opening Balance (Optional)</label>
          <input class="coa-modal-inp" id="ldgAlterBalance" type="number" min="0" step="0.01" placeholder="₹ 0.00" value="${currentLedger.openingBalance || ''}">
        </div>
        ` : ''}

        <div style="display: flex; gap: 12px; align-items: center;">
          <button class="btn btn-primary" id="ldgAlterSaveBtn" style="height: 38px;">Save Changes</button>
          <button class="btn btn-secondary" id="ldgAlterCancelBtn" style="height: 38px;">Cancel</button>
          <button class="btn btn-secondary" id="ldgAlterDeleteBtn" style="height: 38px; background: var(--white); color: var(--red-600); border-color: var(--red-200); margin-left: auto; display: flex; align-items: center; gap: 4px; border: 1.5px solid var(--red-200); cursor: pointer;">
            <svg viewBox="0 0 15 15" fill="none" style="width: 14px; height: 14px;"><path d="M5.5 2h4M1.5 4h12M2.5 4l1 9.5a1 1 0 001 .5h6a1 1 0 001-.5l1-9.5M5.5 6.5v5M9.5 6.5v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
            Delete
          </button>
        </div>
      </div>
    `;

    document.getElementById('ldgAlterSelector').addEventListener('change', (e) => {
      _ledgerEditId = Number(e.target.value);
      renderLedgerAlterView();
    });

    document.getElementById('ldgAlterTogLedger').addEventListener('click', () => {
      const firstLedger = coaLedgers.find(l => l.type === 'ledger');
      _ledgerEditId = firstLedger ? firstLedger.id : null;
      renderLedgerAlterView();
    });
    document.getElementById('ldgAlterTogGroup').addEventListener('click', () => {
      const firstGl = coaLedgers.find(l => l.type === 'group-ledger');
      _ledgerEditId = firstGl ? firstGl.id : null;
      renderLedgerAlterView();
    });

    initGenericSearchableSelect(wrap, 'ldgAlterSelector', 'Select Account to Alter');
    initGenericSearchableSelect(wrap, 'ldgAlterParentSelector', 'Select Sub Group / Group Ledger');

    setupDynamicAliases('ldgAlterAliasesContainer', 'ldgAlterAddAliasBtn', _ledgerAlterAliases);

    document.getElementById('ldgAlterCancelBtn').addEventListener('click', () => {
      switchLedgerTab('list');
    });

    document.getElementById('ldgAlterDeleteBtn').addEventListener('click', () => {
      const confirmDelete = confirm(`Are you sure you want to delete "${currentLedger.name}"? This action cannot be undone.`);
      if (confirmDelete) {
        const isGl = currentLedger.type === 'group-ledger';
        if (isGl) {
          coaLedgers = coaLedgers.filter(l => l.glId !== currentLedger.id);
        }
        const idx = coaLedgers.findIndex(l => l.id === _ledgerEditId);
        if (idx !== -1) {
          coaLedgers.splice(idx, 1);
          showToast(`${isGl ? 'Group' : 'Account'} "${currentLedger.name}" deleted successfully.`, 'success');
          _ledgerEditId = null;
          renderChartPanel();
          refreshAllReports();
          triggerAutoBackup();
          switchLedgerTab('list');
        }
      }
    });

    document.getElementById('ldgAlterSaveBtn').addEventListener('click', () => {
      const nameEl = document.getElementById('ldgAlterName');
      const name = nameEl.value.trim();
      if (!name) {
        showToast('Please enter a valid name.', 'error');
        return;
      }

      const parentVal = document.getElementById('ldgAlterParentSelector').value;
      if (!parentVal) {
        showToast('Please select a Sub Group or Group Ledger.', 'error');
        return;
      }

      const [pType, pId] = parentVal.split(':');
      let sgId = '';
      let glId = null;

      if (pType === 'sg') {
        sgId = pId;
        glId = null;
      } else if (pType === 'gl') {
        const parentGl = coaLedgers.find(l => l.id === Number(pId));
        if (parentGl) {
          sgId = parentGl.sgId;
          glId = parentGl.id;
        } else {
          showToast('Invalid Group Ledger selected.', 'error');
          return;
        }
      }

      const bal = document.getElementById('ldgAlterBalance') ? document.getElementById('ldgAlterBalance').value.trim() : '';
      const aliases = _ledgerAlterAliases.map(a => a.trim()).filter(Boolean);

      const ldg = coaLedgers.find(l => l.id === _ledgerEditId);
      if (ldg) {
        ldg.name = name;
        ldg.sgId = sgId;
        if (ldg.type === 'ledger') {
          ldg.glId = glId;
          ldg.openingBalance = bal;
        }
        ldg.aliases = aliases;
      }

      showToast(`${isLedger ? 'Ledger' : 'Group Ledger'} "${name}" updated successfully.`, 'success');
      renderChartPanel();
      refreshAllReports();
      triggerAutoBackup();
      switchLedgerTab('list');
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  7. HELPER FUNCTIONS
  // ══════════════════════════════════════════════════════════════════

  function setupDynamicAliases(containerId, addBtnId, aliasesArray) {
    const container = document.getElementById(containerId);
    const addAliasBtn = document.getElementById(addBtnId);
    if (!container || !addAliasBtn) return;

    const updateAddBtnVisibility = () => {
      const hasEmpty = aliasesArray.some(a => a.trim() === '');
      addAliasBtn.style.display = hasEmpty ? 'none' : '';
    };

    const render = () => {
      container.innerHTML = '';
      aliasesArray.forEach((alias, idx) => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '8px';
        row.style.alignItems = 'center';

        const input = document.createElement('input');
        input.className = 'coa-modal-inp';
        input.style.flex = '1';
        input.style.height = '38px';
        input.placeholder = 'Alternate name / Code';
        input.value = alias;
        input.addEventListener('input', (e) => {
          aliasesArray[idx] = e.target.value;
          updateAddBtnVisibility();
        });

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.style.background = 'none';
        delBtn.style.border = 'none';
        delBtn.style.color = 'var(--red-600)';
        delBtn.style.cursor = 'pointer';
        delBtn.style.padding = '8px';
        delBtn.innerHTML = `
          <svg viewBox="0 0 15 15" fill="none" style="width: 14px; height: 14px;">
            <path d="M5.5 2h4M1.5 4h12M2.5 4l1 9.5a1 1 0 001 .5h6a1 1 0 001-.5l1-9.5M5.5 6.5v5M9.5 6.5v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
        `;
        delBtn.addEventListener('click', () => {
          aliasesArray.splice(idx, 1);
          render();
        });

        row.appendChild(input);
        row.appendChild(delBtn);
        container.appendChild(row);
      });
      updateAddBtnVisibility();
    };

    addAliasBtn.onclick = () => {
      aliasesArray.push('');
      render();
    };
    render();
  }

  function getOppositeParticulars(entry, currentLedgerName, isDebit) {
    const opposites = [];
    (entry.allRows || []).forEach(r => {
      if (r.particular.trim().toLowerCase() !== currentLedgerName.trim().toLowerCase()) {
        const dr = parseFloat(r.debit) || 0;
        const cr = parseFloat(r.credit) || 0;
        if (isDebit && cr > 0) {
          opposites.push(r.particular.trim());
        } else if (!isDebit && dr > 0) {
          opposites.push(r.particular.trim());
        }
      }
    });
    if (opposites.length === 0) {
      (entry.allRows || []).forEach(r => {
        if (r.particular.trim().toLowerCase() !== currentLedgerName.trim().toLowerCase()) {
          opposites.push(r.particular.trim());
        }
      });
    }
    return opposites[0] || '';
  }

  // Global window functions
  window.editLedgerFromList = function(id) {
    _ledgerEditId = id;
    switchLedgerTab('alter');
  };

  window.viewLedgerStatement = function(id) {
    _ledgerStatementId = id;
    switchLedgerTab('statement');
  };

  window.viewCustomerStatement = function(id) {
    _customerStatementId = id;
    switchLedgerTab('customer-statement');
  };

  window.viewSupplierStatement = function(id) {
    _supplierStatementId = id;
    switchLedgerTab('supplier-statement');
  };

  window.viewLedgerFromTree = function(id) {
    _coaActiveTab = 'ledger';
    _ledgerActiveTab = 'statement';
    _ledgerStatementId = id;
    switchCoaTab('ledger');
    navigateTo('chart');
  };

  window.viewVoucherFromStatement = function(id, voucherNo) {
    let entry = postedEntries.find(e => String(e.id) === String(id));
    if (!entry && voucherNo) {
      entry = postedEntries.find(e => (e.voucherNo || '').toLowerCase() === String(voucherNo).toLowerCase());
    }
    if (!entry && window.KYA_STORE && Array.isArray(window.KYA_STORE.salesVouchers)) {
      const sInv = window.KYA_STORE.salesVouchers.find(v => String(v.id) === String(id) || (v.invoiceNo && (v.invoiceNo === voucherNo || `PAY-${v.invoiceNo}` === voucherNo || `TDS-${v.invoiceNo}` === voucherNo || (v.paymentVoucherNo && v.paymentVoucherNo === voucherNo) || (v.tdsVoucherNo && v.tdsVoucherNo === voucherNo))));
      if (sInv) {
        if (voucherNo && (voucherNo.startsWith('TDS-') || (sInv.tdsVoucherNo && sInv.tdsVoucherNo === voucherNo)) && sInv.tdsJournalEntryId) {
          entry = postedEntries.find(e => String(e.id) === String(sInv.tdsJournalEntryId));
        } else if (voucherNo && (voucherNo.startsWith('PAY-') || (sInv.paymentVoucherNo && sInv.paymentVoucherNo === voucherNo)) && sInv.paymentJournalEntryId) {
          entry = postedEntries.find(e => String(e.id) === String(sInv.paymentJournalEntryId));
        }
        if (!entry && sInv.journalEntryId) {
          entry = postedEntries.find(e => String(e.id) === String(sInv.journalEntryId));
        }
      }
    }
    if (!entry) return;

    showFullJournalModal(entry, false);
  };

  window.editVoucherFromStatement = function(id) {
    const entry = postedEntries.find(e => String(e.id) === String(id));
    if (!entry) return;

    const isSales = (entry.voucherNo || '').startsWith('SV-') || (entry.voucherNo || '').startsWith('SR-');
    if (isSales && window.KYA_STORE && Array.isArray(window.KYA_STORE.salesVouchers)) {
      const cleanNo = entry.voucherNo.replace('SV-', '').replace('SR-', '');
      const salesVoucher = window.KYA_STORE.salesVouchers.find(v => String(v.journalEntryId) === String(entry.id) || String(v.invoiceNo) === cleanNo);
      if (salesVoucher) {
        loadSalesInvoice(salesVoucher, false);
        return;
      }
    }

    const currentTab = (typeof activeTabId !== 'undefined' && activeTabId) ? activeTabId : 'chart';
    const returnContext = {
      tabId: currentTab,
      clActiveTopTab: typeof _clActiveTopTab !== 'undefined' ? _clActiveTopTab : 'books',
      clActiveBankingTab: typeof _clActiveBankingTab !== 'undefined' ? _clActiveBankingTab : 'details',
      clCashbookAccountId: typeof _clCashbookAccountId !== 'undefined' ? _clCashbookAccountId : null
    };

    loadJournalEntry(entry, false, returnContext);
  };

  window.deleteVoucherFromStatement = function(id) {
    const entry = postedEntries.find(e => String(e.id) === String(id));
    if (!entry) return;

    const isSales = (entry.voucherNo || '').startsWith('SV-') || (entry.voucherNo || '').startsWith('SR-');
    if (isSales && window.KYA_STORE && Array.isArray(window.KYA_STORE.salesVouchers)) {
      const cleanNo = entry.voucherNo.replace('SV-', '').replace('SR-', '');
      const salesVoucher = window.KYA_STORE.salesVouchers.find(v => String(v.journalEntryId) === String(entry.id) || String(v.invoiceNo) === cleanNo);
      if (salesVoucher) {
        const isRet = !!salesVoucher.isReturn;
        showKyaConfirm({
          title: isRet ? 'Delete Posted Reversal?' : 'Delete Posted Invoice?',
          message: isRet
            ? 'Are you sure you want to delete this sales reversal? This will also delete the corresponding journal entry and cannot be undone.'
            : 'Are you sure you want to delete this sales invoice? This will also delete the corresponding journal entry and cannot be undone.',
          confirmLabel: 'Delete',
          okBg: 'var(--red-600)',
          onConfirm: () => {
            const list = window.KYA_STORE.salesVouchers || [];
            const idx = list.findIndex(v => String(v.id) === String(salesVoucher.id));
            if (idx > -1) list.splice(idx, 1);
            window.KYA_STORE.salesVouchers = list;
            
            postedEntries = postedEntries.filter(e => String(e.id) !== String(entry.id));
            if (entry.reconKey && window.KYA_STORE?.reconciliationState) {
              delete window.KYA_STORE.reconciliationState[entry.reconKey];
            }
            
            showToast(isRet ? `Sales Reversal "${salesVoucher.invoiceNo}" deleted.` : `Invoice "${salesVoucher.invoiceNo}" deleted.`, 'success');
            if (typeof window.refreshAllAppViews === 'function') {
              window.refreshAllAppViews();
            } else {
              renderLedgerStatementView();
              refreshAllReports();
              triggerAutoBackup();
            }
          }
        });
        return;
      }
    }

    showKyaConfirm({
      title: 'Delete this journal entry?',
      message: `Permanently delete voucher <strong>${entry.voucherNo || '—'}</strong>?<br>This action cannot be undone.`,
      confirmLabel: '✕ Delete',
      iconBg: '#fee2e2', iconColor: '#dc2626',
      iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      okBg: '#dc2626',
      onConfirm: () => {
        postedEntries = postedEntries.filter(e => String(e.id) !== String(id));
        if (entry.reconKey && window.KYA_STORE?.reconciliationState) {
          delete window.KYA_STORE.reconciliationState[entry.reconKey];
        }
        showToast(`Journal voucher "${entry.voucherNo}" deleted.`, 'success');
        if (typeof window.refreshAllAppViews === 'function') {
          window.refreshAllAppViews();
        } else {
          renderLedgerStatementView();
          refreshAllReports();
          triggerAutoBackup();
        }
      }
    });
  };

  window.editVoucherFromDetails = function(id, isDraft) {
    ['fjOverlay', 'budgetTxOverlay', 'salesInvoicePrintOverlay'].forEach(oid => {
      document.getElementById(oid)?.remove();
    });

    const currentTab = (typeof activeTabId !== 'undefined' && activeTabId) ? activeTabId : 'cashline';
    const returnContext = {
      tabId: currentTab,
      clActiveTopTab: typeof _clActiveTopTab !== 'undefined' ? _clActiveTopTab : 'books',
      clActiveBankingTab: typeof _clActiveBankingTab !== 'undefined' ? _clActiveBankingTab : 'details',
      clCashbookAccountId: typeof _clCashbookAccountId !== 'undefined' ? _clCashbookAccountId : null
    };

    if (isDraft) {
      const entry = draftedEntries.find(e => String(e.id) === String(id));
      if (entry) loadJournalEntry(entry, true, returnContext);
    } else {
      const entry = postedEntries.find(e => String(e.id) === String(id));
      if (entry) loadJournalEntry(entry, false, returnContext);
    }
  };

  window.deleteVoucherFromDetails = function(id, isDraft) {
    ['fjOverlay', 'budgetTxOverlay', 'salesInvoicePrintOverlay'].forEach(oid => {
      document.getElementById(oid)?.remove();
    });
    if (isDraft) {
      showKyaConfirm({
        title: 'Delete this draft?',
        message: 'Are you sure you want to permanently delete this draft journal entry? This action cannot be undone.',
        confirmLabel: '✕ Delete',
        okBg: '#dc2626',
        onConfirm: () => {
          draftedEntries = draftedEntries.filter(e => String(e.id) !== String(id));
          showToast('Draft deleted successfully.', 'success');
          if (typeof window.refreshAllAppViews === 'function') {
            window.refreshAllAppViews();
          } else {
            renderDraftedPanel();
            triggerAutoBackup();
          }
        }
      });
    } else {
      const entry = postedEntries.find(e => String(e.id) === String(id));
      if (entry) {
        const isSales = (entry.voucherNo || '').startsWith('SV-') || (entry.voucherNo || '').startsWith('SR-');
        if (isSales && window.KYA_STORE && Array.isArray(window.KYA_STORE.salesVouchers)) {
          const cleanNo = entry.voucherNo.replace('SV-', '').replace('SR-', '');
          const salesVoucher = window.KYA_STORE.salesVouchers.find(v => String(v.journalEntryId) === String(entry.id) || String(v.invoiceNo) === cleanNo);
          if (salesVoucher) {
            const isRet = !!salesVoucher.isReturn;
            showKyaConfirm({
              title: isRet ? 'Delete Posted Reversal?' : 'Delete Posted Invoice?',
              message: isRet
                ? 'Are you sure you want to delete this sales reversal? This will also delete the corresponding journal entry and cannot be undone.'
                : 'Are you sure you want to delete this sales invoice? This will also delete the corresponding journal entry and cannot be undone.',
              confirmLabel: 'Delete',
              okBg: 'var(--red-600)',
              onConfirm: () => {
                const list = window.KYA_STORE.salesVouchers || [];
                const idx = list.findIndex(v => String(v.id) === String(salesVoucher.id));
                if (idx > -1) list.splice(idx, 1);
                window.KYA_STORE.salesVouchers = list;
                
                postedEntries = postedEntries.filter(e => String(e.id) !== String(entry.id));
                if (entry.reconKey && window.KYA_STORE?.reconciliationState) {
                  delete window.KYA_STORE.reconciliationState[entry.reconKey];
                }
                
                showToast(isRet ? `Sales Reversal "${salesVoucher.invoiceNo}" deleted.` : `Invoice "${salesVoucher.invoiceNo}" deleted.`, 'success');
                if (typeof window.refreshAllAppViews === 'function') {
                  window.refreshAllAppViews();
                } else {
                  renderLedgerStatementView();
                  refreshAllReports();
                  triggerAutoBackup();
                }
              }
            });
            return;
          }
        }

        showKyaConfirm({
          title: 'Delete this journal entry?',
          message: `Permanently delete voucher <strong>${entry.voucherNo || '—'}</strong>?<br>This action cannot be undone.`,
          confirmLabel: '✕ Delete',
          okBg: '#dc2626',
          onConfirm: () => {
            postedEntries = postedEntries.filter(e => String(e.id) !== String(id));
            if (entry.reconKey && window.KYA_STORE?.reconciliationState) {
              delete window.KYA_STORE.reconciliationState[entry.reconKey];
            }
            showToast(`Journal voucher "${entry.voucherNo}" deleted.`, 'success');
            if (typeof window.refreshAllAppViews === 'function') {
              window.refreshAllAppViews();
            } else {
              renderLedgerStatementView();
              refreshAllReports();
              triggerAutoBackup();
            }
          }
        });
      }
    }
  };

  window.getLedgerStatementExportData = getLedgerStatementExportData;
  window.getCustomerStatementExportData = getCustomerStatementExportData;
  window.getSupplierStatementExportData = getSupplierStatementExportData;
