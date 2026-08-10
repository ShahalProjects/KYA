  function renderLedgerPanel() {
    switchLedgerTab(_ledgerActiveTab);

    // Wire sub-tabs
    const tabMap = {
      ledgerTabList: 'list',
      ledgerTabAdd:  'add',
      ledgerTabAlter: 'alter',
    };
    Object.entries(tabMap).forEach(([btnId, tab]) => {
      const btn = document.getElementById(btnId);
      if (btn && !btn._wired) {
        btn._wired = true;
        btn.addEventListener('click', (e) => {
          if (e) e.preventDefault();
          if (tab === 'alter' && !_ledgerEditId) {
            const firstLedger = coaLedgers[0];
            _ledgerEditId = firstLedger ? firstLedger.id : null;
          }
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
  }

  function switchLedgerTab(tab) {
    _ledgerActiveTab = tab;

    const allTabs = [
      ['ledgerTabList',  'list'],
      ['ledgerTabAdd',   'add'],
      ['ledgerTabAlter', 'alter'],
    ];
    const allViews = [
      ['ledger-list-view',  'list'],
      ['ledger-add-view',   'add'],
      ['ledger-alter-view', 'alter'],
      ['ledger-statement-view', 'statement'],
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

    // Toggle full-width layout & hide/show sub-tabs sidebar
    const subTabsNav = document.getElementById('ledgerSubTabsNav');
    if (subTabsNav) {
      subTabsNav.style.display = tab === 'statement' ? 'none' : '';
    }
    const layoutContainer = document.getElementById('ledgerLayoutContainer');
    if (layoutContainer) {
      layoutContainer.classList.toggle('full-width', tab === 'statement');
    }

    if (tab === 'list') {
      renderLedgerListView();
    } else if (tab === 'add') {
      renderLedgerAddView();
    } else if (tab === 'alter') {
      renderLedgerAlterView();
    } else if (tab === 'statement') {
      renderLedgerStatementView();
    }
  }

  function resolveLedgerSubgroupName(l) {
    if (!l) return '-';
    const sgs = (typeof COA_SYS_SGS !== 'undefined' && Array.isArray(COA_SYS_SGS)) ? COA_SYS_SGS : [];
    
    // 1. If it has a glId (parent group ledger), return the group ledger's name
    if (l.glId) {
      const gl = (typeof coaLedgers !== 'undefined' ? coaLedgers : []).find(g => g.id === l.glId);
      if (gl) return gl.name;
    }
    
    // 2. Look up sgId in COA_SYS_SGS
    if (l.sgId) {
      const sg = sgs.find(s => s.id === l.sgId);
      if (sg) return sg.name;

      // 3. What if sgId is actually a Group Ledger ID in coaLedgers?
      const glMatch = (typeof coaLedgers !== 'undefined' ? coaLedgers : []).find(g => String(g.id) === String(l.sgId) || g.id === l.sgId);
      if (glMatch) return glMatch.name;
    }

    // 4. Fallback if it's an internal sg-grp- ID that was unmapped
    if (l.sgId && String(l.sgId).startsWith('sg-grp-')) {
      return 'Custom Group';
    }

    return l.sgId || '-';
  }

  function renderLedgerListView() {
    const wrap = document.getElementById('ledgerListWrap');
    if (!wrap) return;

    // Wire search input event listener once
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

    const q = _ledgerSearchQuery.toLowerCase().trim();
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
    
    // Sort ledgers by name
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

  window.editLedgerFromList = function(id) {
    _ledgerEditId = id;
    switchLedgerTab('alter');
  };

  window.viewLedgerStatement = function(id) {
    _ledgerStatementId = id;
    switchLedgerTab('statement');
  };

  window.viewLedgerFromTree = function(id) {
    _coaActiveTab = 'ledger';
    _ledgerActiveTab = 'statement';
    _ledgerStatementId = id;
    switchCoaTab('ledger');
    navigateTo('chart');
  };

  window.viewVoucherFromStatement = function(id) {
    const entry = postedEntries.find(e => e.id === id);
    if (!entry) return;

    const isSales = (entry.voucherNo || '').startsWith('SV-') || (entry.voucherNo || '').startsWith('SR-');
    if (isSales && window.KYA_STORE && Array.isArray(window.KYA_STORE.salesVouchers)) {
      const cleanNo = entry.voucherNo.replace('SV-', '').replace('SR-', '');
      const salesVoucher = window.KYA_STORE.salesVouchers.find(v => v.journalEntryId === entry.id || String(v.invoiceNo) === cleanNo);
      if (salesVoucher) {
        viewPrintInvoice(salesVoucher.id);
        return;
      }
    }

    // Default fallback to Journal view modal
    showFullJournalModal(entry, false);
  };

  window.editVoucherFromStatement = function(id) {
    const entry = postedEntries.find(e => e.id === id);
    if (!entry) return;

    const isSales = (entry.voucherNo || '').startsWith('SV-') || (entry.voucherNo || '').startsWith('SR-');
    if (isSales && window.KYA_STORE && Array.isArray(window.KYA_STORE.salesVouchers)) {
      const cleanNo = entry.voucherNo.replace('SV-', '').replace('SR-', '');
      const salesVoucher = window.KYA_STORE.salesVouchers.find(v => v.journalEntryId === entry.id || String(v.invoiceNo) === cleanNo);
      if (salesVoucher) {
        loadSalesInvoice(salesVoucher, false);
        return;
      }
    }

    // Default fallback to Journal edit
    loadJournalEntry(entry, false);
  };

  window.deleteVoucherFromStatement = function(id) {
    const entry = postedEntries.find(e => e.id === id);
    if (!entry) return;

    const isSales = (entry.voucherNo || '').startsWith('SV-') || (entry.voucherNo || '').startsWith('SR-');
    if (isSales && window.KYA_STORE && Array.isArray(window.KYA_STORE.salesVouchers)) {
      const cleanNo = entry.voucherNo.replace('SV-', '').replace('SR-', '');
      const salesVoucher = window.KYA_STORE.salesVouchers.find(v => v.journalEntryId === entry.id || String(v.invoiceNo) === cleanNo);
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
            const idx = list.findIndex(v => v.id === salesVoucher.id);
            if (idx > -1) list.splice(idx, 1);
            window.KYA_STORE.salesVouchers = list;
            
            postedEntries = postedEntries.filter(e => e.id !== entry.id);
            
            showToast(isRet ? `Sales Reversal "${salesVoucher.invoiceNo}" deleted.` : `Invoice "${salesVoucher.invoiceNo}" deleted.`, 'success');
            renderLedgerStatementView();
            refreshAllReports();
            triggerAutoBackup();
          }
        });
        return;
      }
    }

    // Default fallback to Journal delete
    showKyaConfirm({
      title: 'Delete this journal entry?',
      message: `Permanently delete voucher <strong>${entry.voucherNo || '—'}</strong>?<br>This action cannot be undone.`,
      confirmLabel: '✕ Delete',
      iconBg: '#fee2e2', iconColor: '#dc2626',
      iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      okBg: '#dc2626',
      onConfirm: () => {
        postedEntries = postedEntries.filter(e => e.id !== id);
        showToast(`Journal voucher "${entry.voucherNo}" deleted.`, 'success');
        renderLedgerStatementView();
        refreshAllReports();
        triggerAutoBackup();
      }
    });
  };

  window.editVoucherFromDetails = function(id, isDraft) {
    // Close every possible overlay before navigating
    ['fjOverlay', 'budgetTxOverlay', 'salesInvoicePrintOverlay'].forEach(oid => {
      document.getElementById(oid)?.remove();
    });

    if (isDraft) {
      const entry = draftedEntries.find(e => e.id === id);
      if (entry) loadJournalEntry(entry, true);
    } else {
      const entry = postedEntries.find(e => e.id === id);
      if (entry) {
        loadJournalEntry(entry, false);
      }
    }
  };

  window.deleteVoucherFromDetails = function(id, isDraft) {
    // Close every possible overlay before acting
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
          draftedEntries = draftedEntries.filter(e => e.id !== id);
          showToast('Draft deleted successfully.', 'success');
          renderDraftedPanel();
          triggerAutoBackup();
        }
      });
    } else {
      const entry = postedEntries.find(e => e.id === id);
      if (entry) {
        showKyaConfirm({
          title: 'Delete this journal entry?',
          message: `Permanently delete voucher <strong>${entry.voucherNo || '—'}</strong>?<br>This action cannot be undone.`,
          confirmLabel: '✕ Delete',
          okBg: '#dc2626',
          onConfirm: () => {
            postedEntries = postedEntries.filter(e => e.id !== id);
            showToast(`Journal voucher "${entry.voucherNo}" deleted.`, 'success');
            renderLedgerStatementView();
            refreshAllReports();
            triggerAutoBackup();
          }
        });
      }
    }
  };

  function getOppositeParticulars(entry, currentLedgerName, isDebit) {
    const opposites = [];
    (entry.allRows || []).forEach(r => {
      if (r.particular.trim() !== currentLedgerName.trim()) {
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
        if (r.particular.trim() !== currentLedgerName.trim()) {
          opposites.push(r.particular.trim());
        }
      });
    }
    return opposites[0] || '';
  }

  function calculateLedgerBalances(ledger, dateFrom, dateTo) {
    const mainGroup = getLedgerMainGroup(ledger);
    const initialOpening = parseFloat(ledger.openingBalance) || 0;

    let preDebitSum = 0;
    let preCreditSum = 0;
    let periodDebitSum = 0;
    let periodCreditSum = 0;

    postedEntries.forEach(entry => {
      (entry.allRows || []).forEach(row => {
        if (row.particular.trim() === ledger.name.trim()) {
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

    // Wire Alter Details button
    const btnEdit = document.getElementById('btnEditLedgerFromStatement');
    if (btnEdit) {
      const newBtn = btnEdit.cloneNode(true);
      btnEdit.parentNode.replaceChild(newBtn, btnEdit);
      newBtn.addEventListener('click', (e) => {
        if (e) e.preventDefault();
        _ledgerEditId = ledger.id;
        switchLedgerTab('alter');
      });
    }

    // Get date values
    const fromInp = document.getElementById('statementDateFrom');
    const toInp = document.getElementById('statementDateTo');
    const dateFrom = fromInp ? fromInp.value : '';
    const dateTo = toInp ? toInp.value : '';

    // Wire input listeners once
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
    const ledgerTrans = [];
    postedEntries.forEach(entry => {
      if (dateFrom && entry.date < dateFrom) return;
      if (dateTo && entry.date > dateTo) return;

      (entry.allRows || []).forEach(row => {
        if (row.particular.trim() === ledger.name.trim()) {
          const dr = parseFloat(row.debit) || 0;
          const cr = parseFloat(row.credit) || 0;
          if (dr > 0 || cr > 0) {
            ledgerTrans.push({
              id: entry.id,
              date: entry.date,
              voucherNo: entry.voucherNo || '-',
              particulars: getOppositeParticulars(entry, ledger.name, dr > 0),
              debit: dr,
              credit: cr
            });
          }
        }
      });
    });

    // Sort transactions by date (oldest first for statement)
    ledgerTrans.sort((a, b) => a.date.localeCompare(b.date));

    let rowsHtml = '';
    
    // Show opening balance row
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
          <td style="white-space: nowrap;"><span class="pt-vbadge" onclick="viewVoucherFromStatement(${tr.id})" title="Click to view details">${ohEsc(tr.voucherNo)}</span></td>
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

    // Display summary balances
    const opBalFormatted = `₹${fmtNum(Math.abs(balances.openingBalance).toFixed(2))} ${balances.openingBalance < 0 ? (mainGroupLabel === 'Dr' ? 'Cr' : 'Dr') : mainGroupLabel}`;
    const curBalFormatted = `₹${fmtNum(Math.abs(balances.periodNet).toFixed(2))} ${balances.periodNet < 0 ? 'Cr' : 'Dr'}`;
    const clBalFormatted = `₹${fmtNum(Math.abs(balances.closingBalance).toFixed(2))} ${balances.closingBalance < 0 ? (mainGroupLabel === 'Dr' ? 'Cr' : 'Dr') : mainGroupLabel}`;

    document.getElementById('statementOpeningBal').textContent = opBalFormatted;
    document.getElementById('statementCurrentBal').textContent = curBalFormatted;
    document.getElementById('statementClosingBal').textContent = clBalFormatted;
  }

  function renderLedgerAddView() {
    const wrap = document.getElementById('ledgerAddWrap');
    if (!wrap) return;

    _ledgerAddAliases = []; // reset aliases

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

    // Handle slider toggling
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

    // Initialize searchable select
    searchableControl = initGenericSearchableSelect(wrap, 'ldgAddParentSelector', 'Select Sub Group / Group Ledger');

    // Initial population
    updateTypeUI();

    // Aliases functionality
    const container = document.getElementById('ldgAddAliasesContainer');
    const addAliasBtn = document.getElementById('ldgAddAddAliasBtn');

    const updateAddBtnVisibility = () => {
      if (!addAliasBtn) return;
      const hasEmpty = _ledgerAddAliases.some(a => a.trim() === '');
      addAliasBtn.style.display = hasEmpty ? 'none' : '';
    };

    const renderAliases = () => {
      container.innerHTML = '';
      _ledgerAddAliases.forEach((alias, idx) => {
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
          _ledgerAddAliases[idx] = e.target.value;
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
          _ledgerAddAliases.splice(idx, 1);
          renderAliases();
        });

        row.appendChild(input);
        row.appendChild(delBtn);
        container.appendChild(row);
      });
      updateAddBtnVisibility();
    };

    addAliasBtn.addEventListener('click', () => {
      _ledgerAddAliases.push('');
      renderAliases();
    });

    // Save and Cancel buttons
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

      // Expand COA tree for the added item
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

  function renderLedgerAlterView() {
    const wrap = document.getElementById('ledgerAlterWrap');
    if (!wrap) return;

    if (coaLedgers.length === 0) {
      wrap.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--slate-400);">No accounts available to alter.</div>`;
      return;
    }

    // Resolve current type based on _ledgerEditId, defaulting to 'ledger'
    let currentLedger = coaLedgers.find(l => l.id === _ledgerEditId);
    let selectedType = currentLedger ? currentLedger.type : 'ledger';

    // If the edit ID is not set or doesn't match selected type, default to first of selected type
    const ledgersOfType = coaLedgers.filter(l => l.type === selectedType);
    if (!currentLedger || currentLedger.type !== selectedType) {
      currentLedger = ledgersOfType.length > 0 ? ledgersOfType[0] : null;
      _ledgerEditId = currentLedger ? currentLedger.id : null;
    }

    _ledgerAlterAliases = currentLedger ? (currentLedger.aliases ? [...currentLedger.aliases] : []) : [];

    // Filter selector options based on selected type
    const ledgersList = [...coaLedgers]
      .filter(l => l.type === selectedType)
      .sort((a, b) => a.name.localeCompare(b.name));

    const ldgSelectorOpts = ledgersList.map(l => {
      return `<option value="${l.id}" ${l.id === _ledgerEditId ? 'selected' : ''}>${l.name}</option>`;
    }).join('');

    // Build combined list of Sub Groups and Group Ledgers for the selector
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
        <!-- Slider toggle -->
        <div class="coa-slider-wrap" style="margin-bottom: 20px; max-width: 600px;">
          <div class="coa-slider-bg ${selectedType === 'ledger' ? 'ledger-active' : 'group-active'}" id="ldgAlterSliderBg"></div>
          <button class="coa-slider-btn${selectedType === 'ledger' ? ' active' : ''}" id="ldgAlterTogLedger" type="button">Ledger</button>
          <button class="coa-slider-btn${selectedType === 'group-ledger' ? ' active' : ''}" id="ldgAlterTogGroup" type="button">Group Ledger</button>
        </div>
        <div style="padding: 20px; text-align: center; color: var(--slate-400);">No ${selectedType === 'group-ledger' ? 'group ledgers' : 'ledgers'} available.</div>
      `;
      // Wire slider toggles
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
      <!-- Slider toggle -->
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

    // Wire slider toggles
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

    // Initialize searchable select
    initGenericSearchableSelect(wrap, 'ldgAlterSelector', 'Select Account to Alter');
    initGenericSearchableSelect(wrap, 'ldgAlterParentSelector', 'Select Sub Group / Group Ledger');

    const parentSel = document.getElementById('ldgAlterParentSelector');

    // Aliases functionality
    const container = document.getElementById('ldgAlterAliasesContainer');
    const addAliasBtn = document.getElementById('ldgAlterAddAliasBtn');

    const updateAddBtnVisibility = () => {
      if (!addAliasBtn) return;
      const hasEmpty = _ledgerAlterAliases.some(a => a.trim() === '');
      addAliasBtn.style.display = hasEmpty ? 'none' : '';
    };

    const renderAliases = () => {
      container.innerHTML = '';
      _ledgerAlterAliases.forEach((alias, idx) => {
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
          _ledgerAlterAliases[idx] = e.target.value;
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
          _ledgerAlterAliases.splice(idx, 1);
          renderAliases();
        });

        row.appendChild(input);
        row.appendChild(delBtn);
        container.appendChild(row);
      });
      updateAddBtnVisibility();
    };

    addAliasBtn.addEventListener('click', () => {
      _ledgerAlterAliases.push('');
      renderAliases();
    });
    renderAliases();

    document.getElementById('ldgAlterCancelBtn').addEventListener('click', () => {
      switchLedgerTab('list');
    });

    document.getElementById('ldgAlterDeleteBtn').addEventListener('click', () => {
      const confirmDelete = confirm(`Are you sure you want to delete "${currentLedger.name}"? This action cannot be undone.`);
      if (confirmDelete) {
        const isGl = currentLedger.type === 'group-ledger';
        if (isGl) {
          coaLedgers = coaLedgers.filter(l => l.glId !== currentLedger.id);
          if (currentLedger.sgId && currentLedger.sgId.startsWith('sg-grp-')) {
            const sgIdx = COA_SYS_SGS.findIndex(s => s.id === currentLedger.sgId);
            if (sgIdx !== -1) COA_SYS_SGS.splice(sgIdx, 1);
          }
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

      const bal = document.getElementById('ldgAlterBalance') ? document.getElementById('ldgAlterBalance').value.trim() : '';
      const aliases = _ledgerAlterAliases.map(a => a.trim()).filter(a => a !== '');

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

      showToast(`${selectedType === 'group-ledger' ? 'Group Ledger' : 'Ledger'} "${name}" updated successfully.`, 'success');
      renderChartPanel();
      refreshAllReports();
      triggerAutoBackup();

      switchLedgerTab('list');
    });
  }

