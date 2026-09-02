  function injectBalanceSheetStyles() {
    if (_bsStyleDone) return;
    _bsStyleDone = true;
    const s = document.createElement('style');
    s.textContent = `
      .bs-tree { font-family: var(--font-main); display: flex; flex-direction: column; gap: 20px; }
      .bs-mg-card { border: 1.5px solid var(--slate-200); border-radius: 16px; overflow: hidden; background: var(--white); box-shadow: var(--shadow-sm); }
      
      .bs-row {
        display: flex; justify-content: space-between; align-items: center;
        padding: 12px 20px; border-bottom: 1.5px solid var(--slate-100);
        transition: background var(--duration); cursor: pointer; user-select: none;
      }
      .bs-row:hover { background: var(--slate-50); }
      .bs-row:last-child { border-bottom: none; }
      
      .bs-name-col { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
      .bs-name-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13.5px; }
      .bs-amt-col { font-weight: 700; text-align: right; min-width: 150px; flex-shrink: 0; font-family: var(--font-main); font-size: 13.5px; }
      
      /* Level styles */
      .bs-row-l0 { background: var(--blue-50); font-weight: 800; font-size: 15px; color: var(--blue-900); text-transform: uppercase; }
      .bs-row-l0:hover { background: var(--blue-100); }
      .bs-row-l1 { font-weight: 700; font-size: 14px; color: var(--slate-800); text-transform: uppercase; border-top: 1px solid var(--slate-200); }
      .bs-row-l2 { font-weight: 600; font-size: 13.5px; color: var(--slate-700); }
      .bs-row-l3 { font-weight: 600; font-size: 13px; color: #b45309; background: #fffdf5; }
      .bs-row-l4 { font-weight: 400; font-size: 13px; color: var(--slate-500); cursor: default; }
      .bs-row-l4:hover { background: transparent; }
      
      /* Indent widths */
      .bs-indent-l0 { padding-left: 20px; }
      .bs-indent-l1 { padding-left: 36px; }
      .bs-indent-l2 { padding-left: 56px; }
      .bs-indent-l3 { padding-left: 76px; }
      .bs-indent-l4 { padding-left: 96px; }
      
      .bs-subtotal { border-top: 1.5px dashed var(--slate-300); font-weight: 700; }
      .bs-grandtotal {
        background: var(--blue-100) !important; font-weight: 900; font-size: 15px;
        border-top: 1.5px solid var(--blue-400); border-bottom: 4px double var(--blue-800) !important;
        color: var(--blue-950); cursor: default;
      }
      .bs-grandtotal:hover { background: var(--blue-100) !important; }
      .bs-caret {
        width: 12px; height: 12px; transition: transform .18s; color: var(--slate-400);
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      }
      .bs-caret.open { transform: rotate(90deg); }
      .bs-caret-empty { width: 12px; flex-shrink: 0; }
      .bs-chevron {
        width: 16px; height: 16px; transition: transform .18s; color: var(--slate-500);
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      }
      .bs-chevron.open { transform: rotate(180deg); }
      
      .bs-code { font-size: 11px; color: var(--slate-400); font-weight: 700; font-family: monospace; margin-left: 8px; }
    `;
    document.head.appendChild(s);
  }

  function getLedgerMainGroup(ledger) {
    if (!ledger) return null;
    const sgs = (typeof COA_SYS_SGS !== 'undefined' && Array.isArray(COA_SYS_SGS)) ? COA_SYS_SGS : [];
    let sg = sgs.find(s => s.id === ledger.sgId);
    if (!sg && ledger.glId && typeof coaLedgers !== 'undefined') {
      const gl = coaLedgers.find(l => l.id === ledger.glId);
      if (gl) sg = sgs.find(s => s.id === gl.sgId);
    }
    if (!sg && ledger.sgId && typeof coaLedgers !== 'undefined') {
      const gl = coaLedgers.find(l => String(l.id) === String(ledger.sgId));
      if (gl) sg = sgs.find(s => s.id === gl.sgId);
    }
    return sg ? sg.main : null;
  }

  function calculatePnlProfitForPeriod(dateFrom, dateTo) {
    const balances = computeTrialBalanceBalances(dateFrom, dateTo);
    const rfoBal = getPnlNodeBalance('sg-rfo', 'sg', balances);
    const oiBal  = getPnlNodeBalance('sg-oi', 'sg', balances);
    const totalRevenue = rfoBal + oiBal;

    const expSubgroups = COA_SYS_SGS.filter(sg => sg.main === 'expense' && sg.id !== 'sg-tax');
    let totalExpenses = 0;
    expSubgroups.forEach(sg => {
      totalExpenses += getPnlNodeBalance(sg.id, 'sg', balances);
    });

    const pbt = totalRevenue - totalExpenses;
    const taxBal = getPnlNodeBalance('sg-tax', 'sg', balances);
    const pat = pbt - taxBal;
    return pat;
  }

  function calculatePnlProfitFromTrialBalances(balances) {
    const rfoBal = getPnlNodeBalance('sg-rfo', 'sg', balances);
    const oiBal  = getPnlNodeBalance('sg-oi', 'sg', balances);
    const totalRevenue = rfoBal + oiBal;

    const expSubgroups = COA_SYS_SGS.filter(sg => sg.main === 'expense' && sg.id !== 'sg-tax');
    let totalExpenses = 0;
    expSubgroups.forEach(sg => {
      totalExpenses += getPnlNodeBalance(sg.id, 'sg', balances);
    });

    const pbt = totalRevenue - totalExpenses;
    const taxBal = getPnlNodeBalance('sg-tax', 'sg', balances);
    const pat = pbt - taxBal;
    return pat;
  }

  function calculateOpeningDifferenceFromTrial(balances) {
    let totalDr = 0;
    let totalCr = 0;

    coaLedgers.forEach(l => {
      if (l.type !== 'ledger') return;
      const mainGroup = getLedgerMainGroup(l);
      const netVal = balances[l.id] || 0;

      if (mainGroup === 'assets' || mainGroup === 'expense') {
        if (netVal >= 0) {
          totalDr += netVal;
        } else {
          totalCr += -netVal;
        }
      } else if (mainGroup === 'equity-liabilities' || mainGroup === 'income') {
        if (netVal >= 0) {
          totalCr += netVal;
        } else {
          totalDr += -netVal;
        }
      }
    });

    return totalDr - totalCr;
  }

  function getNodeBalance(nodeId, nodeType, ledgerBalances, profitAmount, openingDiffAmount, priorProfit = 0) {
    if (nodeType === 'ledger') {
      if (nodeId === 'virtual-profit') return profitAmount;
      if (nodeId === 'virtual-prior') return priorProfit;
      if (nodeId === 'virtual-diff') return openingDiffAmount;
      return ledgerBalances[nodeId] || 0;
    }

    if (nodeType === 'group-ledger') {
      let sum = 0;
      coaLedgers.forEach(l => {
        if (l.glId === nodeId) {
          if (l.type === 'ledger') {
            sum += getNodeBalance(l.id, 'ledger', ledgerBalances, profitAmount, openingDiffAmount, priorProfit);
          } else if (l.type === 'group-ledger') {
            sum += getNodeBalance(l.id, 'group-ledger', ledgerBalances, profitAmount, openingDiffAmount, priorProfit);
          }
        }
      });
      return sum;
    }

    if (nodeType === 'sg') {
      let sum = 0;
      COA_SYS_SGS.forEach(s => {
        if (s.parent === nodeId) {
          sum += getNodeBalance(s.id, 'sg', ledgerBalances, profitAmount, openingDiffAmount, priorProfit);
        }
      });
      coaLedgers.forEach(l => {
        if (l.sgId === nodeId && l.type === 'group-ledger' && !l.glId) {
          sum += getNodeBalance(l.id, 'group-ledger', ledgerBalances, profitAmount, openingDiffAmount, priorProfit);
        }
      });
      coaLedgers.forEach(l => {
        if (l.sgId === nodeId && l.type === 'ledger' && !l.glId) {
          sum += getNodeBalance(l.id, 'ledger', ledgerBalances, profitAmount, openingDiffAmount, priorProfit);
        }
      });

      if (nodeId === 'sg-rs') {
        sum += profitAmount + priorProfit + openingDiffAmount;
      }

      return sum;
    }

    if (nodeType === 'mg') {
      let sum = 0;
      COA_SYS_SGS.forEach(s => {
        if (s.main === nodeId && s.parent === null) {
          sum += getNodeBalance(s.id, 'sg', ledgerBalances, profitAmount, openingDiffAmount, priorProfit);
        }
      });
      return sum;
    }

    return 0;
  }

  // ── Helper: Format date for report column headers ───────────────────
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

  function formatRptDateRange(fromStr, toStr, defaultLabel = '') {
    if (!fromStr && !toStr) return defaultLabel || 'All Periods';
    if (fromStr && toStr) {
      return `${formatRptDate(fromStr)} – ${formatRptDate(toStr)}`;
    }
    if (toStr) {
      return `Up to ${formatRptDate(toStr)}`;
    }
    return `From ${formatRptDate(fromStr)}`;
  }

  // ── Helper: Check if a single ledger has transactions/activity ──────
  function ledgerHasTransactions(ledger, dateFrom, dateTo, isBalanceSheet = false) {
    if (!ledger || ledger.type !== 'ledger') return false;

    // For Balance Sheet, opening balance is considered an active transaction/starting balance
    if (isBalanceSheet && parseAmt(ledger.openingBalance) !== 0) {
      return true;
    }

    const ledgerNameLower = (ledger.name || '').trim().toLowerCase();
    if (!ledgerNameLower) return false;

    const custs = (ledger.sgId === 'sg-tr' || ledgerNameLower === 'trade receivables')
      ? (typeof getKyaCustomers === 'function' ? getKyaCustomers() : [])
      : [];
    const supps = (ledger.sgId === 'sg-tp' || ledgerNameLower === 'trade payables')
      ? (typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : [])
      : [];
    const custNames = new Set(custs.map(c => (c.name || '').trim().toLowerCase()));
    const suppNames = new Set(supps.map(s => (s.name || '').trim().toLowerCase()));

    const entries = (typeof postedEntries !== 'undefined' && Array.isArray(postedEntries)) ? postedEntries : [];
    return entries.some(entry => {
      if (isBalanceSheet) {
        if (dateTo && entry.date > dateTo) return false;
      } else {
        if (dateFrom && entry.date < dateFrom) return false;
        if (dateTo && entry.date > dateTo) return false;
      }

      return (entry.allRows || []).some(row => {
        const part = (row.particular || '').trim().toLowerCase();
        if (part !== ledgerNameLower && !custNames.has(part) && !suppNames.has(part)) return false;
        const dr = parseAmt(row.debit);
        const cr = parseAmt(row.credit);
        return dr !== 0 || cr !== 0;
      });
    });
  }

  // ── Helper: Check if any P&L transactions exist in period ───────────
  function hasAnyPnlTransactions(dateFrom, dateTo) {
    if (typeof postedEntries === 'undefined' || !Array.isArray(postedEntries)) return false;
    const pnlLedgers = (typeof coaLedgers !== 'undefined' ? coaLedgers : []).filter(l => {
      if (l.type !== 'ledger') return false;
      const mg = getLedgerMainGroup(l);
      return mg === 'income' || mg === 'expense';
    });
    const pnlNames = new Set(pnlLedgers.map(l => (l.name || '').trim().toLowerCase()));

    return postedEntries.some(entry => {
      if (dateFrom && entry.date < dateFrom) return false;
      if (dateTo && entry.date > dateTo) return false;
      return (entry.allRows || []).some(r => {
        const part = (r.particular || '').trim().toLowerCase();
        return pnlNames.has(part) && (parseAmt(r.debit) !== 0 || parseAmt(r.credit) !== 0);
      });
    });
  }

  // ── Helper: Check if a group ledger has any insider ledgers with transactions ──
  function groupLedgerHasTransactions(glId, dateFrom, dateTo, isBalanceSheet = false) {
    if (!glId || typeof coaLedgers === 'undefined') return false;
    const childLedgers = coaLedgers.filter(l => l.glId === glId);
    return childLedgers.some(l => {
      if (l.type === 'ledger') {
        return ledgerHasTransactions(l, dateFrom, dateTo, isBalanceSheet);
      } else if (l.type === 'group-ledger') {
        return groupLedgerHasTransactions(l.id, dateFrom, dateTo, isBalanceSheet);
      }
      return false;
    });
  }

  // ── Helper: Check if a subgroup has any inside ledgers or child subgroups with transactions ──
  function subgroupHasTransactions(sgId, dateFrom, dateTo, isBalanceSheet = false, profitAmt = 0, priorProfit = 0, openingDiff = 0) {
    if (!sgId) return false;

    // Special case for Reserves & Surplus (sg-rs) in Balance Sheet
    if (isBalanceSheet && sgId === 'sg-rs') {
      if (profitAmt !== 0 || priorProfit !== 0 || openingDiff !== 0) {
        return true;
      }
      if (hasAnyPnlTransactions(dateFrom, dateTo)) {
        return true;
      }
    }

    // Direct ledgers under this subgroup
    if (typeof coaLedgers !== 'undefined') {
      const directLedgers = coaLedgers.filter(l => l.sgId === sgId && l.type === 'ledger' && !l.glId);
      if (directLedgers.some(l => ledgerHasTransactions(l, dateFrom, dateTo, isBalanceSheet))) {
        return true;
      }

      // Group ledgers under this subgroup
      const groupLedgers = coaLedgers.filter(l => l.sgId === sgId && l.type === 'group-ledger' && !l.glId);
      if (groupLedgers.some(gl => groupLedgerHasTransactions(gl.id, dateFrom, dateTo, isBalanceSheet))) {
        return true;
      }
    }

    // Child subgroups under this subgroup
    if (typeof COA_SYS_SGS !== 'undefined') {
      const childSgs = COA_SYS_SGS.filter(s => s.parent === sgId);
      if (childSgs.some(csg => subgroupHasTransactions(csg.id, dateFrom, dateTo, isBalanceSheet, profitAmt, priorProfit, openingDiff))) {
        return true;
      }
    }

    return false;
  }

  function renderBalanceSheetPanel() {
    injectBalanceSheetStyles();
    const wrap = document.getElementById('balanceSheetWrap');
    if (!wrap) return;

    const fromInp = document.getElementById('bsDateFrom');
    const toInp   = document.getElementById('bsDateTo');
    if (fromInp && !fromInp.value) fromInp.value = _globalDateFrom;
    if (toInp   && !toInp.value)   toInp.value   = _globalDateTo;

    const dateFrom = fromInp ? fromInp.value : '';
    const dateTo   = toInp ? toInp.value : '';

    const isCompare = document.getElementById('bsCompareCheck')?.checked || false;
    const compFromInp = document.getElementById('bsCompareDateFrom');
    const compToInp   = document.getElementById('bsCompareDateTo');
    const compareDateFrom = (isCompare && compFromInp) ? compFromInp.value : '';
    const compareDateTo   = (isCompare && compToInp) ? compToInp.value : '';

    if (_bsExpanded.size === 0) {
      _bsExpanded.add('mg-assets');
      _bsExpanded.add('mg-equity-liabilities');
      COA_SYS_SGS.forEach(sg => {
        _bsExpanded.add('sg-' + sg.id);
      });
    }

    // 1. Primary Period Trial Balance
    const pnlBalances1 = computeTrialBalanceBalances(dateFrom, dateTo);
    const profitAmt1   = calculatePnlProfitFromTrialBalances(pnlBalances1);
    const ledgerBalances1 = computeTrialBalanceBalances('', dateTo);
    const cumulativeProfit1 = calculatePnlProfitFromTrialBalances(ledgerBalances1);
    const priorProfit1 = cumulativeProfit1 - profitAmt1;
    const openingDiff1 = calculateOpeningDifferenceFromTrial(ledgerBalances1);

    // 2. Comparison Period Trial Balance (if enabled)
    let pnlBalances2 = {};
    let profitAmt2 = 0;
    let ledgerBalances2 = {};
    let priorProfit2 = 0;
    let openingDiff2 = 0;

    if (isCompare) {
      pnlBalances2 = computeTrialBalanceBalances(compareDateFrom, compareDateTo);
      profitAmt2 = calculatePnlProfitFromTrialBalances(pnlBalances2);
      ledgerBalances2 = computeTrialBalanceBalances('', compareDateTo);
      const cumulativeProfit2 = calculatePnlProfitFromTrialBalances(ledgerBalances2);
      priorProfit2 = cumulativeProfit2 - profitAmt2;
      openingDiff2 = calculateOpeningDifferenceFromTrial(ledgerBalances2);
    }

    const col1Title = dateTo ? `As of ${formatRptDate(dateTo)}` : 'Current (₹)';
    const col2Title = compareDateTo ? `As of ${formatRptDate(compareDateTo)}` : 'Compare (₹)';

    function getBsAmtHtml(bal1, bal2) {
      if (isCompare) {
        return `<div class="bs-amt-pair"><span class="amt-col-primary">₹ ${fmtNum(bal1)}</span><span class="amt-col-compare">₹ ${fmtNum(bal2)}</span></div>`;
      }
      return `<div class="bs-amt-col">₹ ${fmtNum(bal1)}</div>`;
    }

    const btnVert = document.getElementById('bsLayoutVertical');
    const btnHoriz = document.getElementById('bsLayoutHorizontal');
    if (btnVert && btnHoriz) {
      if (_bsLayoutMode === 'Vertical') {
        btnVert.className = 'btn btn-primary';
        btnVert.style.background = 'var(--blue-700)';
        btnVert.style.color = '#fff';
        btnVert.style.borderColor = 'var(--blue-700)';
        
        btnHoriz.className = 'btn-sales-action';
        btnHoriz.style.background = 'var(--white)';
        btnHoriz.style.color = 'var(--slate-600)';
        btnHoriz.style.borderColor = 'var(--slate-200)';
      } else {
        btnHoriz.className = 'btn btn-primary';
        btnHoriz.style.background = 'var(--blue-700)';
        btnHoriz.style.color = '#fff';
        btnHoriz.style.borderColor = 'var(--blue-700)';
        
        btnVert.className = 'btn-sales-action';
        btnVert.style.background = 'var(--white)';
        btnVert.style.color = 'var(--slate-600)';
        btnVert.style.borderColor = 'var(--slate-200)';
      }
    }

    let treeHtml = '';
    if (_bsLayoutMode === 'Horizontal') {
      treeHtml = '<div class="bs-tree horizontal-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 24px; align-items: stretch;">';
    } else {
      treeHtml = '<div class="bs-tree">';
    }

    const mainGroupsToRender = _bsLayoutMode === 'Horizontal'
      ? [COA_MAIN_GROUPS.find(mg => mg.id === 'equity-liabilities'), COA_MAIN_GROUPS.find(mg => mg.id === 'assets')]
      : [COA_MAIN_GROUPS.find(mg => mg.id === 'assets'), COA_MAIN_GROUPS.find(mg => mg.id === 'equity-liabilities')];

    mainGroupsToRender.forEach(mg => {
      if (!mg) return;

      const mgBal1 = getNodeBalance(mg.id, 'mg', ledgerBalances1, profitAmt1, openingDiff1, priorProfit1);
      const mgBal2 = isCompare ? getNodeBalance(mg.id, 'mg', ledgerBalances2, profitAmt2, openingDiff2, priorProfit2) : 0;
      const isMgOpen = _bsExpanded.has('mg-' + mg.id);

      treeHtml += `
        <div class="bs-mg-card" style="${_bsLayoutMode === 'Horizontal' ? 'display: flex; flex-direction: column; height: 100%;' : ''}">
          <div class="bs-row bs-row-l0 bs-indent-l0" data-bs-toggle="mg-${mg.id}">
            <div class="bs-name-col">
              <svg class="bs-chevron${isMgOpen ? ' open' : ''}" width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path d="M4 6l5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="bs-name-text">${mg.name}</span>
            </div>
            ${getBsAmtHtml(mgBal1, mgBal2)}
          </div>
          ${isCompare ? `
            <div class="bs-col-hdrs">
              <span>Particulars</span>
              <div class="bs-amt-pair">
                <span class="amt-col-primary">${col1Title}</span>
                <span class="amt-col-compare">${col2Title}</span>
              </div>
            </div>
          ` : ''}
          <div id="bsBody-mg-${mg.id}" style="${isMgOpen ? '' : 'display:none'} ${(_bsLayoutMode === 'Horizontal' && isMgOpen) ? '; display: flex; flex-direction: column; flex-grow: 1;' : ''}">
      `;

      const l1Sgs = COA_SYS_SGS.filter(s => s.main === mg.id && s.parent === null);
      l1Sgs.forEach(l1Sg => {
        const hasTx1 = subgroupHasTransactions(l1Sg.id, dateFrom, dateTo, true, profitAmt1, priorProfit1, openingDiff1);
        const hasTx2 = isCompare && subgroupHasTransactions(l1Sg.id, compareDateFrom, compareDateTo, true, profitAmt2, priorProfit2, openingDiff2);
        if (!hasTx1 && !hasTx2) return;

        const l1Bal1 = getNodeBalance(l1Sg.id, 'sg', ledgerBalances1, profitAmt1, openingDiff1, priorProfit1);
        const l1Bal2 = isCompare ? getNodeBalance(l1Sg.id, 'sg', ledgerBalances2, profitAmt2, openingDiff2, priorProfit2) : 0;
        const isL1Open = _bsExpanded.has('sg-' + l1Sg.id);
        const hasChildrenSg = COA_SYS_SGS.some(s => s.parent === l1Sg.id);

        let bodyHtml = '';

        if (hasChildrenSg) {
          const l2Sgs = COA_SYS_SGS.filter(s => s.parent === l1Sg.id);
          l2Sgs.forEach(l2Sg => {
            const hasL2Tx1 = subgroupHasTransactions(l2Sg.id, dateFrom, dateTo, true, profitAmt1, priorProfit1, openingDiff1);
            const hasL2Tx2 = isCompare && subgroupHasTransactions(l2Sg.id, compareDateFrom, compareDateTo, true, profitAmt2, priorProfit2, openingDiff2);
            if (!hasL2Tx1 && !hasL2Tx2) return;

            const l2Bal1 = getNodeBalance(l2Sg.id, 'sg', ledgerBalances1, profitAmt1, openingDiff1, priorProfit1);
            const l2Bal2 = isCompare ? getNodeBalance(l2Sg.id, 'sg', ledgerBalances2, profitAmt2, openingDiff2, priorProfit2) : 0;
            const isL2Open = _bsExpanded.has('sg-' + l2Sg.id);

            bodyHtml += `
              <div class="bs-row bs-row-l2 bs-indent-l2" data-bs-toggle="sg-${l2Sg.id}">
                <div class="bs-name-col">
                  <svg class="bs-caret${isL2Open ? ' open' : ''}" width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span class="bs-name-text">${l2Sg.name}</span>
                </div>
                ${getBsAmtHtml(l2Bal1, l2Bal2)}
              </div>
              <div id="bsBody-sg-${l2Sg.id}" style="${isL2Open ? '' : 'display:none'}">
                ${renderSubgroupLeafs(l2Sg.id, ledgerBalances1, profitAmt1, openingDiff1, 'bs-indent-l3', 'bs-indent-l4', priorProfit1, dateFrom, dateTo, isCompare, ledgerBalances2, profitAmt2, openingDiff2, priorProfit2, compareDateFrom, compareDateTo)}
              </div>
            `;
          });
        } else {
          bodyHtml += renderSubgroupLeafs(l1Sg.id, ledgerBalances1, profitAmt1, openingDiff1, 'bs-indent-l2', 'bs-indent-l3', priorProfit1, dateFrom, dateTo, isCompare, ledgerBalances2, profitAmt2, openingDiff2, priorProfit2, compareDateFrom, compareDateTo);
        }

        treeHtml += `
          <div class="bs-row bs-row-l1 bs-indent-l1" data-bs-toggle="sg-${l1Sg.id}">
            <div class="bs-name-col">
              <svg class="bs-caret${isL1Open ? ' open' : ''}" width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="bs-name-text">${l1Sg.name}</span>
            </div>
            ${getBsAmtHtml(l1Bal1, l1Bal2)}
          </div>
          <div id="bsBody-sg-${l1Sg.id}" style="${isL1Open ? '' : 'display:none'}">
            ${bodyHtml}
          </div>
        `;
      });

      treeHtml += `
            <div class="bs-row bs-grandtotal bs-indent-l0" style="${_bsLayoutMode === 'Horizontal' ? 'margin-top: auto;' : ''}">
              <span style="text-transform: uppercase;">Total ${mg.name}</span>
              ${getBsAmtHtml(mgBal1, mgBal2)}
            </div>
          </div>
        </div>
      `;
    });

    treeHtml += '</div>';
    wrap.innerHTML = treeHtml;

    // Validation Status Badge for Primary Period
    const badgeWrap = document.getElementById('bsStatusBadgeWrap');
    if (badgeWrap) {
      const totAssets = getNodeBalance('assets', 'mg', ledgerBalances1, profitAmt1, openingDiff1, priorProfit1);
      const totLiab   = getNodeBalance('equity-liabilities', 'mg', ledgerBalances1, profitAmt1, openingDiff1, priorProfit1);
      const isBalanced = Math.abs(totAssets - totLiab) < 0.01;

      if (isBalanced) {
        badgeWrap.innerHTML = `
          <span class="tb-badge tb-badge-success">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="flex-shrink:0;">
              <path d="M13.485 1.929a.75.75 0 0 1 .06 1.057l-7.25 8a.75.75 0 0 1-1.083.03l-3.25-3.5a.75.75 0 1 1 1.096-1.024l2.673 2.879 6.704-7.39a.75.75 0 0 1 1.05-.052z"/>
            </svg>
            Balanced
          </span>
        `;
      } else {
        const diff = Math.abs(totAssets - totLiab);
        badgeWrap.innerHTML = `
          <span class="tb-badge tb-badge-danger" title="Total Assets must equal Total Liabilities and Equity. Difference: ₹ ${fmtNum(diff)}">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="flex-shrink:0;">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0-1.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM8 4a.75.75 0 0 1 .75.75v5a.75.75 0 0 1-1.5 0v-5A.75.75 0 0 1 8 4zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
            </svg>
            Mismatched (Diff: ₹ ${fmtNum(diff)})
          </span>
        `;
      }
    }

    wrap.querySelectorAll('[data-bs-toggle]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = el.dataset.bsToggle;
        if (_bsExpanded.has(id)) _bsExpanded.delete(id);
        else _bsExpanded.add(id);
        renderBalanceSheetPanel();
      });
    });
  }

  function renderSubgroupLeafs(sgId, ledgerBalances1, profitAmt1, openingDiff1, indentClassL3, indentClassL4, priorProfit1 = 0, dateFrom = '', dateTo = '', isCompare = false, ledgerBalances2 = {}, profitAmt2 = 0, openingDiff2 = 0, priorProfit2 = 0, compareDateFrom = '', compareDateTo = '') {
    let html = '';
    const hideZero = document.getElementById('bsHideZero')?.checked || false;

    function getBsAmtHtml(bal1, bal2) {
      if (isCompare) {
        return `<div class="bs-amt-pair"><span class="amt-col-primary">₹ ${fmtNum(bal1)}</span><span class="amt-col-compare">₹ ${fmtNum(bal2)}</span></div>`;
      }
      return `<div class="bs-amt-col">₹ ${fmtNum(bal1)}</div>`;
    }

    if (sgId === 'sg-rs') {
      const hasPnl1 = (profitAmt1 !== 0 || hasAnyPnlTransactions(dateFrom, dateTo));
      const hasPnl2 = isCompare && (profitAmt2 !== 0 || hasAnyPnlTransactions(compareDateFrom, compareDateTo));
      if ((hasPnl1 || hasPnl2) && (!hideZero || profitAmt1 !== 0 || (isCompare && profitAmt2 !== 0))) {
        html += `
          <div class="bs-row bs-row-l4 ${indentClassL3}">
            <div class="bs-name-col">
              <span class="bs-caret-empty"></span>
              <span class="bs-name-text">Profit & Loss A/c (Current Year)</span>
            </div>
            ${getBsAmtHtml(profitAmt1, profitAmt2)}
          </div>
        `;
      }
      const hasPrior1 = priorProfit1 !== 0 || hasAnyPnlTransactions('', dateFrom);
      const hasPrior2 = isCompare && (priorProfit2 !== 0 || hasAnyPnlTransactions('', compareDateFrom));
      if ((!hideZero && (hasPrior1 || hasPrior2)) || (hideZero && (priorProfit1 !== 0 || (isCompare && priorProfit2 !== 0)))) {
        html += `
          <div class="bs-row bs-row-l4 ${indentClassL3}">
            <div class="bs-name-col">
              <span class="bs-caret-empty"></span>
              <span class="bs-name-text">Retained Earnings (Prior to filter)</span>
            </div>
            ${getBsAmtHtml(priorProfit1, priorProfit2)}
          </div>
        `;
      }
      if (openingDiff1 !== 0 || (isCompare && openingDiff2 !== 0)) {
        html += `
          <div class="bs-row bs-row-l4 ${indentClassL3}">
            <div class="bs-name-col">
              <span class="bs-caret-empty"></span>
              <span class="bs-name-text">Difference in Opening Balances</span>
            </div>
            ${getBsAmtHtml(openingDiff1, openingDiff2)}
          </div>
        `;
      }
    }

    const groupLdgs = coaLedgers.filter(l => l.sgId === sgId && l.type === 'group-ledger');
    groupLdgs.forEach(gl => {
      const sg = COA_SYS_SGS.find(s => s.id === gl.sgId);
      if (!sg || (sg.main !== 'assets' && sg.main !== 'equity-liabilities')) return;

      const hasGlTx1 = groupLedgerHasTransactions(gl.id, dateFrom, dateTo, true);
      const hasGlTx2 = isCompare && groupLedgerHasTransactions(gl.id, compareDateFrom, compareDateTo, true);
      if (!hasGlTx1 && !hasGlTx2) return;

      const glBal1 = getNodeBalance(gl.id, 'group-ledger', ledgerBalances1, profitAmt1, openingDiff1, priorProfit1);
      const glBal2 = isCompare ? getNodeBalance(gl.id, 'group-ledger', ledgerBalances2, profitAmt2, openingDiff2, priorProfit2) : 0;
      if (hideZero && glBal1 === 0 && (!isCompare || glBal2 === 0)) return;

      const isGlOpen = _bsExpanded.has('gl-' + gl.id);

      let childHtml = '';
      const childLdgs = coaLedgers.filter(l => l.glId === gl.id && l.type === 'ledger');
      childLdgs.forEach(l => {
        const lSg = COA_SYS_SGS.find(s => s.id === l.sgId);
        if (!lSg || (lSg.main !== 'assets' && lSg.main !== 'equity-liabilities')) return;

        const hasLTx1 = ledgerHasTransactions(l, dateFrom, dateTo, true);
        const hasLTx2 = isCompare && ledgerHasTransactions(l, compareDateFrom, compareDateTo, true);
        if (!hasLTx1 && !hasLTx2) return;

        const bal1 = getNodeBalance(l.id, 'ledger', ledgerBalances1, profitAmt1, openingDiff1, priorProfit1);
        const bal2 = isCompare ? getNodeBalance(l.id, 'ledger', ledgerBalances2, profitAmt2, openingDiff2, priorProfit2) : 0;
        if (hideZero && bal1 === 0 && (!isCompare || bal2 === 0)) return;

        childHtml += `
          <div class="bs-row bs-row-l4 ${indentClassL4}">
            <div class="bs-name-col">
              <span class="bs-caret-empty"></span>
              <span class="bs-name-text">${l.name}</span>
              ${l.code ? `<span class="bs-code">${l.code}</span>` : ''}
            </div>
            ${getBsAmtHtml(bal1, bal2)}
          </div>
        `;
      });

      if (hideZero && glBal1 === 0 && (!isCompare || glBal2 === 0) && childHtml === '') return;

      html += `
        <div class="bs-row bs-row-l3 ${indentClassL3}" data-bs-toggle="gl-${gl.id}">
          <div class="bs-name-col">
            <svg class="bs-caret${isGlOpen ? ' open' : ''}" width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="bs-name-text">📁 ${gl.name}</span>
            ${gl.code ? `<span class="bs-code">${gl.code}</span>` : ''}
          </div>
          ${getBsAmtHtml(glBal1, glBal2)}
        </div>
        <div id="bsBody-gl-${gl.id}" style="${isGlOpen ? '' : 'display:none'}">
          ${childHtml}
        </div>
      `;
    });

    const directLdgs = coaLedgers.filter(l => l.sgId === sgId && l.type === 'ledger' && !l.glId);
    directLdgs.forEach(l => {
      const lSg = COA_SYS_SGS.find(s => s.id === l.sgId);
      if (!lSg || (lSg.main !== 'assets' && lSg.main !== 'equity-liabilities')) return;

      const hasLTx1 = ledgerHasTransactions(l, dateFrom, dateTo, true);
      const hasLTx2 = isCompare && ledgerHasTransactions(l, compareDateFrom, compareDateTo, true);
      if (!hasLTx1 && !hasLTx2) return;

      const bal1 = getNodeBalance(l.id, 'ledger', ledgerBalances1, profitAmt1, openingDiff1, priorProfit1);
      const bal2 = isCompare ? getNodeBalance(l.id, 'ledger', ledgerBalances2, profitAmt2, openingDiff2, priorProfit2) : 0;
      if (hideZero && bal1 === 0 && (!isCompare || bal2 === 0)) return;

      html += `
        <div class="bs-row bs-row-l4 ${indentClassL3}">
          <div class="bs-name-col">
            <span class="bs-caret-empty"></span>
            <span class="bs-name-text">${l.name}</span>
            ${l.code ? `<span class="bs-code">${l.code}</span>` : ''}
          </div>
          ${getBsAmtHtml(bal1, bal2)}
        </div>
      `;
    });

    return html;
  }

  // Helper to compile structured Balance Sheet Report Data for Export
  function getBalanceSheetReportData() {
    const fromInp = document.getElementById('bsDateFrom');
    const toInp   = document.getElementById('bsDateTo');
    const dateFrom = fromInp ? fromInp.value : (_globalDateFrom || '');
    const dateTo   = toInp ? toInp.value : (_globalDateTo || '');

    const isCompare = document.getElementById('bsCompareCheck')?.checked || false;
    const compFromInp = document.getElementById('bsCompareDateFrom');
    const compToInp   = document.getElementById('bsCompareDateTo');
    const compareDateFrom = (isCompare && compFromInp) ? compFromInp.value : '';
    const compareDateTo   = (isCompare && compToInp) ? compToInp.value : '';

    const hideZero = document.getElementById('bsHideZero')?.checked || false;

    // 1. Primary Period Trial Balance
    const pnlBalances1 = computeTrialBalanceBalances(dateFrom, dateTo);
    const profitAmt1   = calculatePnlProfitFromTrialBalances(pnlBalances1);
    const ledgerBalances1 = computeTrialBalanceBalances('', dateTo);
    const cumulativeProfit1 = calculatePnlProfitFromTrialBalances(ledgerBalances1);
    const priorProfit1 = cumulativeProfit1 - profitAmt1;
    const openingDiff1 = calculateOpeningDifferenceFromTrial(ledgerBalances1);

    // 2. Comparison Period Trial Balance
    let pnlBalances2 = {};
    let profitAmt2 = 0;
    let ledgerBalances2 = {};
    let priorProfit2 = 0;
    let openingDiff2 = 0;

    if (isCompare) {
      pnlBalances2 = computeTrialBalanceBalances(compareDateFrom, compareDateTo);
      profitAmt2 = calculatePnlProfitFromTrialBalances(pnlBalances2);
      ledgerBalances2 = computeTrialBalanceBalances('', compareDateTo);
      const cumulativeProfit2 = calculatePnlProfitFromTrialBalances(ledgerBalances2);
      priorProfit2 = cumulativeProfit2 - profitAmt2;
      openingDiff2 = calculateOpeningDifferenceFromTrial(ledgerBalances2);
    }

    const co = (typeof getCompanyDetails === 'function') ? getCompanyDetails() : {};
    const companyName = co.name || 'KYA Accounting';

    function getSubgroupItems(sgId) {
      const items = [];

      if (sgId === 'sg-rs') {
        const hasPnl1 = (profitAmt1 !== 0 || hasAnyPnlTransactions(dateFrom, dateTo));
        const hasPnl2 = isCompare && (profitAmt2 !== 0 || hasAnyPnlTransactions(compareDateFrom, compareDateTo));
        if ((hasPnl1 || hasPnl2) && (!hideZero || profitAmt1 !== 0 || (isCompare && profitAmt2 !== 0))) {
          items.push({ name: 'Profit & Loss A/c (Current Year)', code: '', isGroup: false, amount1: profitAmt1, amount2: profitAmt2 });
        }

        const hasPrior1 = priorProfit1 !== 0 || hasAnyPnlTransactions('', dateFrom);
        const hasPrior2 = isCompare && (priorProfit2 !== 0 || hasAnyPnlTransactions('', compareDateFrom));
        if ((!hideZero && (hasPrior1 || hasPrior2)) || (hideZero && (priorProfit1 !== 0 || (isCompare && priorProfit2 !== 0)))) {
          items.push({ name: 'Retained Earnings (Prior to filter)', code: '', isGroup: false, amount1: priorProfit1, amount2: priorProfit2 });
        }

        if (openingDiff1 !== 0 || (isCompare && openingDiff2 !== 0)) {
          items.push({ name: 'Difference in Opening Balances', code: '', isGroup: false, amount1: openingDiff1, amount2: openingDiff2 });
        }
      }

      const groupLdgs = coaLedgers.filter(l => l.sgId === sgId && l.type === 'group-ledger');
      groupLdgs.forEach(gl => {
        const sg = COA_SYS_SGS.find(s => s.id === gl.sgId);
        if (!sg || (sg.main !== 'assets' && sg.main !== 'equity-liabilities')) return;

        const hasGlTx1 = groupLedgerHasTransactions(gl.id, dateFrom, dateTo, true);
        const hasGlTx2 = isCompare && groupLedgerHasTransactions(gl.id, compareDateFrom, compareDateTo, true);
        if (!hasGlTx1 && !hasGlTx2) return;

        const glBal1 = getNodeBalance(gl.id, 'group-ledger', ledgerBalances1, profitAmt1, openingDiff1, priorProfit1);
        const glBal2 = isCompare ? getNodeBalance(gl.id, 'group-ledger', ledgerBalances2, profitAmt2, openingDiff2, priorProfit2) : 0;
        if (hideZero && glBal1 === 0 && (!isCompare || glBal2 === 0)) return;

        const children = [];
        const childLdgs = coaLedgers.filter(l => l.glId === gl.id && l.type === 'ledger');
        childLdgs.forEach(l => {
          const lSg = COA_SYS_SGS.find(s => s.id === l.sgId);
          if (!lSg || (lSg.main !== 'assets' && lSg.main !== 'equity-liabilities')) return;

          const hasLTx1 = ledgerHasTransactions(l, dateFrom, dateTo, true);
          const hasLTx2 = isCompare && ledgerHasTransactions(l, compareDateFrom, compareDateTo, true);
          if (!hasLTx1 && !hasLTx2) return;

          const bal1 = getNodeBalance(l.id, 'ledger', ledgerBalances1, profitAmt1, openingDiff1, priorProfit1);
          const bal2 = isCompare ? getNodeBalance(l.id, 'ledger', ledgerBalances2, profitAmt2, openingDiff2, priorProfit2) : 0;
          if (hideZero && bal1 === 0 && (!isCompare || bal2 === 0)) return;

          children.push({ name: l.name, code: l.code || '', amount1: bal1, amount2: bal2 });
        });

        items.push({ name: gl.name, code: gl.code || '', isGroup: true, amount1: glBal1, amount2: glBal2, children });
      });

      const directLdgs = coaLedgers.filter(l => l.sgId === sgId && l.type === 'ledger' && !l.glId);
      directLdgs.forEach(l => {
        const lSg = COA_SYS_SGS.find(s => s.id === l.sgId);
        if (!lSg || (lSg.main !== 'assets' && lSg.main !== 'equity-liabilities')) return;

        const hasLTx1 = ledgerHasTransactions(l, dateFrom, dateTo, true);
        const hasLTx2 = isCompare && ledgerHasTransactions(l, compareDateFrom, compareDateTo, true);
        if (!hasLTx1 && !hasLTx2) return;

        const bal1 = getNodeBalance(l.id, 'ledger', ledgerBalances1, profitAmt1, openingDiff1, priorProfit1);
        const bal2 = isCompare ? getNodeBalance(l.id, 'ledger', ledgerBalances2, profitAmt2, openingDiff2, priorProfit2) : 0;
        if (hideZero && bal1 === 0 && (!isCompare || bal2 === 0)) return;

        items.push({ name: l.name, code: l.code || '', isGroup: false, amount1: bal1, amount2: bal2 });
      });

      return items;
    }

    const mainGroups = [];
    const orderedMainGroups = [
      COA_MAIN_GROUPS.find(mg => mg.id === 'equity-liabilities'),
      COA_MAIN_GROUPS.find(mg => mg.id === 'assets')
    ];

    orderedMainGroups.forEach(mg => {
      if (!mg) return;

      const mgBal1 = getNodeBalance(mg.id, 'mg', ledgerBalances1, profitAmt1, openingDiff1, priorProfit1);
      const mgBal2 = isCompare ? getNodeBalance(mg.id, 'mg', ledgerBalances2, profitAmt2, openingDiff2, priorProfit2) : 0;

      const subgroups = [];
      const l1Sgs = COA_SYS_SGS.filter(s => s.main === mg.id && s.parent === null);
      l1Sgs.forEach(l1Sg => {
        const hasTx1 = subgroupHasTransactions(l1Sg.id, dateFrom, dateTo, true, profitAmt1, priorProfit1, openingDiff1);
        const hasTx2 = isCompare && subgroupHasTransactions(l1Sg.id, compareDateFrom, compareDateTo, true, profitAmt2, priorProfit2, openingDiff2);
        if (!hasTx1 && !hasTx2) return;

        const l1Bal1 = getNodeBalance(l1Sg.id, 'sg', ledgerBalances1, profitAmt1, openingDiff1, priorProfit1);
        const l1Bal2 = isCompare ? getNodeBalance(l1Sg.id, 'sg', ledgerBalances2, profitAmt2, openingDiff2, priorProfit2) : 0;
        const hasChildrenSg = COA_SYS_SGS.some(s => s.parent === l1Sg.id);

        if (hasChildrenSg) {
          const l2Subgroups = [];
          const l2Sgs = COA_SYS_SGS.filter(s => s.parent === l1Sg.id);
          l2Sgs.forEach(l2Sg => {
            const hasL2Tx1 = subgroupHasTransactions(l2Sg.id, dateFrom, dateTo, true, profitAmt1, priorProfit1, openingDiff1);
            const hasL2Tx2 = isCompare && subgroupHasTransactions(l2Sg.id, compareDateFrom, compareDateTo, true, profitAmt2, priorProfit2, openingDiff2);
            if (!hasL2Tx1 && !hasL2Tx2) return;

            const l2Bal1 = getNodeBalance(l2Sg.id, 'sg', ledgerBalances1, profitAmt1, openingDiff1, priorProfit1);
            const l2Bal2 = isCompare ? getNodeBalance(l2Sg.id, 'sg', ledgerBalances2, profitAmt2, openingDiff2, priorProfit2) : 0;

            l2Subgroups.push({
              id: l2Sg.id,
              name: l2Sg.name,
              amount1: l2Bal1,
              amount2: l2Bal2,
              items: getSubgroupItems(l2Sg.id)
            });
          });

          subgroups.push({
            id: l1Sg.id,
            name: l1Sg.name,
            amount1: l1Bal1,
            amount2: l1Bal2,
            hasChildren: true,
            l2Subgroups
          });
        } else {
          subgroups.push({
            id: l1Sg.id,
            name: l1Sg.name,
            amount1: l1Bal1,
            amount2: l1Bal2,
            hasChildren: false,
            items: getSubgroupItems(l1Sg.id)
          });
        }
      });

      mainGroups.push({
        id: mg.id,
        name: mg.name,
        total1: mgBal1,
        total2: mgBal2,
        subgroups
      });
    });

    const totAssets1 = getNodeBalance('assets', 'mg', ledgerBalances1, profitAmt1, openingDiff1, priorProfit1);
    const totLiab1   = getNodeBalance('equity-liabilities', 'mg', ledgerBalances1, profitAmt1, openingDiff1, priorProfit1);

    const totAssets2 = isCompare ? getNodeBalance('assets', 'mg', ledgerBalances2, profitAmt2, openingDiff2, priorProfit2) : 0;
    const totLiab2   = isCompare ? getNodeBalance('equity-liabilities', 'mg', ledgerBalances2, profitAmt2, openingDiff2, priorProfit2) : 0;

    return {
      companyName,
      dateFrom,
      dateTo,
      isCompare,
      compareDateFrom,
      compareDateTo,
      mainGroups,
      totAssets1,
      totLiab1,
      totAssets2,
      totLiab2
    };
  }

  // Wire toolbar / 3-dot menu buttons for Balance Sheet
  const bsSubmenu = document.getElementById('bsExportSubmenu');
  const bsSubmenuWrap = document.getElementById('bsExportSubmenuWrap');
  let bsCloseTimer = null;

  document.getElementById('bsExportMenuBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (bsSubmenu) bsSubmenu.classList.toggle('open');
  });

  if (bsSubmenuWrap && bsSubmenu) {
    bsSubmenuWrap.addEventListener('mouseenter', () => {
      if (bsCloseTimer) clearTimeout(bsCloseTimer);
      bsSubmenu.classList.add('open');
    });
    bsSubmenuWrap.addEventListener('mouseleave', () => {
      bsCloseTimer = setTimeout(() => {
        bsSubmenu.classList.remove('open');
      }, 300);
    });
    bsSubmenu.addEventListener('mouseenter', () => {
      if (bsCloseTimer) clearTimeout(bsCloseTimer);
      bsSubmenu.classList.add('open');
    });
  }

  document.getElementById('bsExportPdf')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('bsMoreDropdown')?.classList.remove('open');
    document.getElementById('bsExportSubmenu')?.classList.remove('open');
    const bsData = getBalanceSheetReportData();
    if (typeof window !== 'undefined' && typeof window.exportBalanceSheetToPDF === 'function') {
      window.exportBalanceSheetToPDF(bsData);
    } else if (typeof exportBalanceSheetToPDF === 'function') {
      exportBalanceSheetToPDF(bsData);
    } else {
      console.error('exportBalanceSheetToPDF function is not available.');
    }
  });

  document.getElementById('bsExportExcel')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('bsMoreDropdown')?.classList.remove('open');
    document.getElementById('bsExportSubmenu')?.classList.remove('open');
    const bsData = getBalanceSheetReportData();
    if (typeof window !== 'undefined' && typeof window.exportBalanceSheetToExcel === 'function') {
      window.exportBalanceSheetToExcel(bsData);
    } else if (typeof exportBalanceSheetToExcel === 'function') {
      exportBalanceSheetToExcel(bsData);
    } else {
      console.error('exportBalanceSheetToExcel function is not available.');
    }
  });

  document.getElementById('bsExpandAll')?.addEventListener('click', () => {
    _bsExpanded = new Set([
      'mg-assets', 'mg-equity-liabilities',
      ...COA_SYS_SGS.map(sg => 'sg-' + sg.id),
      ...coaLedgers.filter(l => l.type === 'group-ledger').map(gl => 'gl-' + gl.id)
    ]);
    document.getElementById('bsMoreDropdown')?.classList.remove('open');
    renderBalanceSheetPanel();
  });

  document.getElementById('bsCollapseAll')?.addEventListener('click', () => {
    _bsExpanded = new Set();
    document.getElementById('bsMoreDropdown')?.classList.remove('open');
    renderBalanceSheetPanel();
  });

  document.getElementById('bsLayoutVertical')?.addEventListener('click', () => {
    _bsLayoutMode = 'Vertical';
    renderBalanceSheetPanel();
  });

  document.getElementById('bsLayoutHorizontal')?.addEventListener('click', () => {
    _bsLayoutMode = 'Horizontal';
    renderBalanceSheetPanel();
  });


  // ══════════════════════════════════════════════════════════════════
  //  PROFIT & LOSS STATEMENT
  // ══════════════════════════════════════════════════════════════════
  let _pnlStyleDone = false;
  let _pnlExpanded = new Set();
  let _pnlLayoutMode = 'Schedule';

  function injectPnlStyles() {
    if (_pnlStyleDone) return;
    _pnlStyleDone = true;
    const s = document.createElement('style');
    s.textContent = `
      .pnl-tree { font-family: var(--font-main); display: flex; flex-direction: column; gap: 20px; }
      .pnl-card { border: 1.5px solid var(--slate-200); border-radius: 16px; overflow: hidden; background: var(--white); box-shadow: var(--shadow-sm); margin-bottom: 24px; }
      
      .pnl-row {
        display: flex; justify-content: space-between; align-items: center;
        padding: 12px 20px; border-bottom: 1.5px solid var(--slate-100);
        transition: background var(--duration); cursor: pointer; user-select: none;
      }
      .pnl-row:hover { background: var(--slate-50); }
      .pnl-row:last-child { border-bottom: none; }
      
      .pnl-name-col { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
      .pnl-name-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13.5px; }
      .pnl-amt-col { font-weight: 700; text-align: right; min-width: 150px; flex-shrink: 0; font-family: var(--font-main); font-size: 13.5px; }
      
      /* Level styles */
      .pnl-row-hdr { background: var(--blue-50); font-weight: 800; font-size: 14.5px; color: var(--blue-900); text-transform: uppercase; cursor: default; }
      .pnl-row-hdr:hover { background: var(--blue-50); }
      .pnl-row-l1 { font-weight: 700; font-size: 14px; color: var(--slate-800); }
      .pnl-row-l2 { font-weight: 600; font-size: 13px; color: #b45309; background: #fffdf5; }
      .pnl-row-l3 { font-weight: 400; font-size: 13px; color: var(--slate-500); cursor: default; }
      .pnl-row-l3:hover { background: transparent; }
      
      /* Indent widths */
      .pnl-indent-hdr { padding-left: 20px; }
      .pnl-indent-l1 { padding-left: 36px; }
      .pnl-indent-l2 { padding-left: 56px; }
      .pnl-indent-l3 { padding-left: 76px; }
      
      .pnl-subtotal { border-top: 1.5px dashed var(--slate-300); font-weight: 700; }
      .pnl-total-row {
        background: var(--slate-50) !important; font-weight: 800; font-size: 14px;
        border-top: 1.5px solid var(--slate-300); border-bottom: 1.5px solid var(--slate-300) !important;
        color: var(--slate-800); cursor: default;
      }
      .pnl-total-row:hover { background: var(--slate-50) !important; }
      
      .pnl-grandtotal {
        background: var(--blue-100) !important; font-weight: 900; font-size: 15px;
        border-top: 1.5px solid var(--blue-400); border-bottom: 4px double var(--blue-800) !important;
        color: var(--blue-950); cursor: default;
      }
      .pnl-grandtotal:hover { background: var(--blue-100) !important; }
      
      .pnl-caret {
        width: 12px; height: 12px; transition: transform .18s; color: var(--slate-400);
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      }
      .pnl-caret.open { transform: rotate(90deg); }
      .pnl-caret-empty { width: 12px; flex-shrink: 0; }
      
      .pnl-code { font-size: 11px; color: var(--slate-400); font-weight: 700; font-family: monospace; margin-left: 8px; }

      /* ══════════════════════════════════════════════════════════════════
         SCHEDULE III STATEMENT OF PROFIT AND LOSS STYLES
         ══════════════════════════════════════════════════════════════════ */
      .pnl-sch-card {
        border: 1.5px solid var(--slate-200);
        border-radius: 16px;
        overflow: hidden;
        background: var(--white);
        box-shadow: var(--shadow-sm);
        margin-bottom: 24px;
      }
      .pnl-sch-table-wrap {
        width: 100%;
        overflow-x: auto;
      }
      .pnl-sch-table {
        width: 100%;
        border-collapse: collapse;
        font-family: var(--font-main);
        min-width: 680px;
      }
      .pnl-sch-table thead th {
        background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
        padding: 13px 18px;
        font-size: 12.5px;
        font-weight: 700;
        color: var(--slate-700);
        text-transform: uppercase;
        letter-spacing: 0.03em;
        border-bottom: 2px solid var(--slate-200);
        vertical-align: middle;
      }
      .pnl-sch-th-part { text-align: left; }
      .pnl-sch-th-note { text-align: center; width: 100px; }
      .pnl-sch-th-amt { text-align: right; width: 180px; }
      .pnl-sch-th-title { font-size: 13px; font-weight: 700; color: var(--slate-800); }
      .pnl-sch-th-sub { font-size: 11px; font-weight: 500; color: var(--slate-500); text-transform: none; margin-top: 2px; }

      .pnl-sch-table td {
        padding: 11px 18px;
        border-bottom: 1px solid var(--slate-100);
        font-size: 13.5px;
        vertical-align: middle;
      }
      .pnl-sch-table tbody tr:last-child td { border-bottom: none; }
      
      .pnl-sch-row-main {
        font-weight: 700;
        color: var(--slate-900);
        transition: background var(--duration);
      }
      .pnl-sch-row-main:hover { background: var(--slate-50); }
      
      .pnl-sch-sec-hdr td {
        background: var(--blue-50);
        font-weight: 800;
        font-size: 13.5px;
        color: var(--blue-900);
        text-transform: uppercase;
        letter-spacing: 0.02em;
        padding-top: 12px;
        padding-bottom: 12px;
        border-top: 1.5px solid var(--blue-100);
        border-bottom: 1.5px solid var(--blue-100);
        cursor: default;
      }
      .pnl-sch-sec-hdr:hover td { background: var(--blue-50); }

      .pnl-sch-row-sub {
        font-weight: 600;
        font-size: 13.5px;
        color: var(--slate-800);
        transition: background var(--duration);
      }
      .pnl-sch-row-sub:hover { background: var(--slate-50); }
      .pnl-sch-row-sub .pnl-sch-name { padding-left: 20px; }

      .pnl-sch-subtotal td {
        background: #f8fafc;
        font-weight: 800;
        font-size: 13.5px;
        color: var(--slate-900);
        border-top: 1.5px solid var(--slate-300);
        border-bottom: 1.5px solid var(--slate-300);
      }

      .pnl-sch-row-highlight td {
        background: #fffdf5;
        font-weight: 800;
        font-size: 14px;
        color: #92400e;
        border-top: 1px solid #fef3c7;
        border-bottom: 1px solid #fef3c7;
      }

      .pnl-sch-grandtotal td {
        background: var(--blue-100) !important;
        font-weight: 900;
        font-size: 15px;
        color: var(--blue-950);
        border-top: 2px solid var(--blue-400);
        border-bottom: 4px double var(--blue-800) !important;
      }

      .pnl-sch-amt {
        text-align: right;
        font-weight: 700;
        white-space: nowrap;
        font-family: var(--font-main);
      }
      .pnl-sch-note-cell {
        text-align: center;
      }
      .pnl-note-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 24px;
        height: 22px;
        padding: 0 6px;
        background: #eff6ff;
        color: #1d4ed8;
        border: 1px solid #bfdbfe;
        border-radius: 6px;
        font-size: 11.5px;
        font-weight: 700;
        font-family: monospace;
        transition: transform .15s ease, background .15s ease, box-shadow .15s ease;
      }
      .pnl-note-link {
        cursor: pointer;
      }
      .pnl-note-link:hover {
        background: #2563eb;
        color: #ffffff;
        border-color: #2563eb;
        transform: scale(1.1);
        box-shadow: 0 2px 6px rgba(37,99,235,0.3);
      }
      .pnl-note-empty {
        display: inline-block;
        color: var(--slate-300);
        font-weight: 400;
      }
      .pnl-sch-name {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      /* ══════════════════════════════════════════════════════════════════
         NOTES TO ACCOUNTS STYLES
         ══════════════════════════════════════════════════════════════════ */
      .pnl-notes-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
        font-family: var(--font-main);
      }
      .pnl-notes-hero {
        background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
        border: 1.5px solid #dbeafe;
        border-radius: 14px;
        padding: 16px 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .pnl-notes-hero-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
      }
      .pnl-notes-hero-title {
        font-size: 15px;
        font-weight: 800;
        color: var(--blue-950);
      }
      .pnl-notes-hero-sub {
        font-size: 12px;
        color: var(--slate-500);
        margin-top: 2px;
      }
      .pnl-notes-pills-wrap {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        padding-top: 6px;
        border-top: 1px solid #e2e8f0;
      }
      .pnl-note-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 12px;
        background: #ffffff;
        border: 1px solid #bfdbfe;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        color: #1d4ed8;
        cursor: pointer;
        transition: all .15s ease;
        text-decoration: none;
        user-select: none;
      }
      .pnl-note-pill:hover {
        background: #1d4ed8;
        color: #ffffff;
        border-color: #1d4ed8;
        transform: translateY(-1px);
        box-shadow: 0 2px 5px rgba(29, 78, 216, 0.2);
      }
      .pnl-note-card {
        border: 1.5px solid var(--slate-200);
        border-radius: 14px;
        overflow: hidden;
        background: var(--white);
        box-shadow: var(--shadow-sm);
        scroll-margin-top: 20px;
        transition: all .25s ease;
      }
      .pnl-note-target-highlight {
        border-color: #2563eb !important;
        box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.22), var(--shadow-md) !important;
        animation: pnlNotePulse 2.5s ease forwards;
      }
      @keyframes pnlNotePulse {
        0% { transform: scale(1.01); background: #eff6ff; }
        40% { transform: scale(1.005); background: #f8faff; }
        100% { transform: scale(1); background: #ffffff; }
      }
      .pnl-note-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 13px 20px;
        background: #f8fafc;
        border-bottom: 1.5px solid var(--slate-200);
      }
      .pnl-note-header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .pnl-note-badge-lg {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 3px 10px;
        background: #eff6ff;
        color: #1d4ed8;
        border: 1.5px solid #bfdbfe;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 800;
        font-family: monospace;
      }
      .pnl-note-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--slate-900);
      }
      .pnl-note-table {
        width: 100%;
        border-collapse: collapse;
      }
      .pnl-note-table th {
        padding: 9px 18px;
        font-size: 11.5px;
        font-weight: 700;
        color: var(--slate-600);
        background: #fafafa;
        border-bottom: 1px solid var(--slate-200);
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .pnl-note-table td {
        padding: 8px 18px;
        font-size: 13px;
        border-bottom: 1px solid var(--slate-100);
        vertical-align: middle;
      }
      .pnl-note-table tbody tr:last-child td {
        border-bottom: none;
      }
      .pnl-note-total-row td {
        background: #f8fafc;
        font-weight: 800;
        font-size: 13px;
        color: var(--slate-900);
        border-top: 1.5px solid var(--slate-300);
        border-bottom: 2px solid var(--slate-300) !important;
      }

      /* Glass Controls for Header Area */
      .cl-glass-control {
        height: 34px !important;
        background: rgba(255, 255, 255, 0.18) !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
        border: 1px solid rgba(255, 255, 255, 0.35) !important;
        border-radius: 8px !important;
        color: #ffffff !important;
        font-family: var(--font-main), Inter, sans-serif !important;
        font-size: 12.5px !important;
        font-weight: 600 !important;
        padding: 0 10px !important;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.25) !important;
        transition: all 0.15s ease !important;
        outline: none !important;
        box-sizing: border-box !important;
        cursor: pointer;
      }
      .cl-glass-control:hover {
        background: rgba(255, 255, 255, 0.26) !important;
        border-color: rgba(255, 255, 255, 0.55) !important;
      }
      .cl-glass-control:focus {
        background: rgba(255, 255, 255, 0.3) !important;
        border-color: rgba(255, 255, 255, 0.75) !important;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.35), 0 2px 8px rgba(0, 0, 0, 0.12) !important;
      }
      .cl-glass-control option {
        background: #ffffff !important;
        color: #1e293b !important;
        font-weight: 500 !important;
      }
      .cl-glass-control[type="date"] {
        color-scheme: dark !important;
      }

      /* 3-Dot More Options Dropdown */
      .rpt-more-wrap {
        position: relative;
        display: inline-block;
      }
      .rpt-more-btn {
        width: 34px;
        height: 34px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.35);
        background: rgba(255, 255, 255, 0.18);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        color: #ffffff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.15s ease;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.25);
        padding: 0;
        box-sizing: border-box;
      }
      .rpt-more-btn:hover {
        background: rgba(255, 255, 255, 0.26);
        border-color: rgba(255, 255, 255, 0.55);
      }
      .rpt-more-dropdown {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        background: #ffffff;
        border: 1.5px solid #e2e8f0;
        border-radius: 12px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        padding: 6px;
        min-width: 170px;
        z-index: 1000;
        display: none;
        font-family: var(--font-main), Inter, sans-serif;
        animation: jePopIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .rpt-more-dropdown.open {
        display: block;
      }
      .rpt-menu-item {
        width: 100%;
        padding: 8px 12px;
        font-size: 13px;
        font-weight: 500;
        color: #334155;
        background: transparent;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.12s ease;
        text-align: left;
        box-sizing: border-box;
        font-family: inherit;
      }
      .rpt-menu-item:hover {
        background: #f1f5f9;
        color: #1e293b;
      }
      .rpt-menu-item svg {
        flex-shrink: 0;
      }
      .rpt-submenu-wrap {
        position: relative;
        width: 100%;
      }
      .rpt-submenu-btn {
        justify-content: space-between;
      }
      .rpt-submenu-caret {
        transition: transform 0.15s ease;
      }
      .rpt-submenu-dropdown {
        position: absolute;
        top: 0;
        right: calc(100% + 6px);
        background: #ffffff;
        border: 1.5px solid #e2e8f0;
        border-radius: 12px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
        padding: 6px;
        min-width: 130px;
        z-index: 1001;
        display: none;
      }
      .rpt-submenu-dropdown.open {
        display: block;
      }
      .rpt-menu-sep {
        height: 1px;
        background: #e2e8f0;
        margin: 4px 0;
      }
      .rpt-menu-chk {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        font-size: 13px;
        font-weight: 500;
        color: #334155;
        cursor: pointer;
        user-select: none;
        border-radius: 6px;
        transition: background 0.12s ease;
      }
      .rpt-menu-chk:hover {
        background: #f1f5f9;
      }
      .rpt-menu-chk input[type="checkbox"] {
        cursor: pointer;
        accent-color: var(--blue-600);
      }
    `;
    document.head.appendChild(s);
  }

  function getPnlNodeBalance(nodeId, nodeType, ledgerBalances) {
    if (nodeType === 'ledger') {
      return ledgerBalances[nodeId] || 0;
    }

    if (nodeType === 'group-ledger') {
      let sum = 0;
      coaLedgers.forEach(l => {
        if (l.glId === nodeId) {
          if (l.type === 'ledger') {
            sum += getPnlNodeBalance(l.id, 'ledger', ledgerBalances);
          } else if (l.type === 'group-ledger') {
            sum += getPnlNodeBalance(l.id, 'group-ledger', ledgerBalances);
          }
        }
      });
      return sum;
    }

    if (nodeType === 'sg') {
      let sum = 0;
      coaLedgers.forEach(l => {
        if (l.sgId === nodeId && l.type === 'group-ledger' && !l.glId) {
          sum += getPnlNodeBalance(l.id, 'group-ledger', ledgerBalances);
        }
      });
      coaLedgers.forEach(l => {
        if (l.sgId === nodeId && l.type === 'ledger' && !l.glId) {
          sum += getPnlNodeBalance(l.id, 'ledger', ledgerBalances);
        }
      });

      return sum;
    }

    return 0;
  }

  function getPnlShareCapitalBalance(dateTo) {
    let totalCap = 0;
    coaLedgers.forEach(l => {
      if (l.type !== 'ledger') return;
      const isSg = l.sgId === 'sg-sc' || l.sgId === 'sg-cap';
      const nameLower = (l.name || '').trim().toLowerCase();
      const isName = nameLower.includes('share capital') || nameLower.includes('equity capital') || nameLower === 'capital' || nameLower === 'capital account';
      if (isSg || isName) {
        let bal = parseAmt(l.openingBalance);
        postedEntries.forEach(entry => {
          if (dateTo && entry.date > dateTo) return;
          (entry.allRows || []).forEach(row => {
            const part = (row.particular || '').trim().toLowerCase();
            if (part === nameLower) {
              const dr = parseAmt(row.debit);
              const cr = parseAmt(row.credit);
              bal += (cr - dr);
            }
          });
        });
        if (bal > 0) totalCap += bal;
      }
    });
    return totalCap;
  }

  function getPreviousPeriodDates(dateFrom, dateTo) {
    if (!dateFrom && !dateTo) return { prevFrom: '', prevTo: '' };
    try {
      if (dateFrom && dateTo) {
        const d1 = new Date(dateFrom);
        const d2 = new Date(dateTo);
        if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
          const prevD1 = new Date(d1.getFullYear() - 1, d1.getMonth(), d1.getDate());
          const prevD2 = new Date(d2.getFullYear() - 1, d2.getMonth(), d2.getDate());
          const formatYMD = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
          };
          return { prevFrom: formatYMD(prevD1), prevTo: formatYMD(prevD2) };
        }
      } else if (dateTo) {
        const d2 = new Date(dateTo);
        if (!isNaN(d2.getTime())) {
          const prevD2 = new Date(d2.getFullYear() - 1, d2.getMonth(), d2.getDate());
          const formatYMD = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
          };
          return { prevFrom: '', prevTo: formatYMD(prevD2) };
        }
      }
    } catch(e) {}
    return { prevFrom: '', prevTo: '' };
  }

  function renderPnlScheduleMode(ledgerBalances1, dateFrom, dateTo, isCompare, compareDateFrom, compareDateTo) {
    let ledgerBalances2 = {};
    let prevPeriodFrom = compareDateFrom;
    let prevPeriodTo = compareDateTo;

    if (isCompare) {
      ledgerBalances2 = computeTrialBalanceBalances(compareDateFrom, compareDateTo);
    } else {
      const prevDates = getPreviousPeriodDates(dateFrom, dateTo);
      prevPeriodFrom = prevDates.prevFrom;
      prevPeriodTo = prevDates.prevTo;
      if (prevPeriodFrom || prevPeriodTo) {
        ledgerBalances2 = computeTrialBalanceBalances(prevPeriodFrom, prevPeriodTo);
      }
    }

    const col1Title = formatRptDateRange(dateFrom, dateTo, 'Current Period');
    const col2Title = formatRptDateRange(prevPeriodFrom, prevPeriodTo, 'Previous Period');

    function fmtSchAmt(val) {
      if (typeof val !== 'number' || isNaN(val)) return '₹ 0.00';
      if (val < 0) {
        return `<span style="color: #dc2626;">(₹ ${fmtNum(Math.abs(val))})</span>`;
      }
      return `₹ ${fmtNum(val)}`;
    }

    function fmtNoteBadge(num) {
      if (!num) return `<span class="pnl-note-empty">-</span>`;
      return `<span class="pnl-note-badge pnl-note-link" data-pnl-goto-note="${num}" title="Click to view Note ${num} details in Notes to Accounts">${num}</span>`;
    }

    // Calculations
    const rfoBal1 = getPnlNodeBalance('sg-rfo', 'sg', ledgerBalances1);
    const rfoBal2 = getPnlNodeBalance('sg-rfo', 'sg', ledgerBalances2);

    const oiBal1 = getPnlNodeBalance('sg-oi', 'sg', ledgerBalances1);
    const oiBal2 = getPnlNodeBalance('sg-oi', 'sg', ledgerBalances2);

    const totalRevenue1 = rfoBal1 + oiBal1;
    const totalRevenue2 = rfoBal2 + oiBal2;

    // Standard Expense Subgroups
    const cmcBal1 = getPnlNodeBalance('sg-cmc', 'sg', ledgerBalances1);
    const cmcBal2 = getPnlNodeBalance('sg-cmc', 'sg', ledgerBalances2);

    const pstBal1 = getPnlNodeBalance('sg-pst', 'sg', ledgerBalances1);
    const pstBal2 = getPnlNodeBalance('sg-pst', 'sg', ledgerBalances2);

    const cinvBal1 = getPnlNodeBalance('sg-cinv', 'sg', ledgerBalances1);
    const cinvBal2 = getPnlNodeBalance('sg-cinv', 'sg', ledgerBalances2);

    const ebeBal1 = getPnlNodeBalance('sg-ebe', 'sg', ledgerBalances1);
    const ebeBal2 = getPnlNodeBalance('sg-ebe', 'sg', ledgerBalances2);

    const fcBal1 = getPnlNodeBalance('sg-fc', 'sg', ledgerBalances1);
    const fcBal2 = getPnlNodeBalance('sg-fc', 'sg', ledgerBalances2);

    const daBal1 = getPnlNodeBalance('sg-da', 'sg', ledgerBalances1);
    const daBal2 = getPnlNodeBalance('sg-da', 'sg', ledgerBalances2);

    const oeBal1 = getPnlNodeBalance('sg-oe', 'sg', ledgerBalances1);
    const oeBal2 = getPnlNodeBalance('sg-oe', 'sg', ledgerBalances2);

    // Any other custom expense subgroups (excluding sg-tax and the 7 system ones)
    const stdExpSgIds = new Set(['sg-cmc', 'sg-pst', 'sg-cinv', 'sg-ebe', 'sg-fc', 'sg-da', 'sg-oe', 'sg-tax']);
    const customExpSgs = COA_SYS_SGS.filter(sg => sg.main === 'expense' && !stdExpSgIds.has(sg.id));

    let customExpTotal1 = 0;
    let customExpTotal2 = 0;
    customExpSgs.forEach(sg => {
      customExpTotal1 += getPnlNodeBalance(sg.id, 'sg', ledgerBalances1);
      customExpTotal2 += getPnlNodeBalance(sg.id, 'sg', ledgerBalances2);
    });

    const totalExpenses1 = cmcBal1 + pstBal1 + cinvBal1 + ebeBal1 + fcBal1 + daBal1 + oeBal1 + customExpTotal1;
    const totalExpenses2 = cmcBal2 + pstBal2 + cinvBal2 + ebeBal2 + fcBal2 + daBal2 + oeBal2 + customExpTotal2;

    const pbeita1 = totalRevenue1 - totalExpenses1;
    const pbeita2 = totalRevenue2 - totalExpenses2;

    // Exceptional items & Discontinued ops
    let exceptional1 = 0, exceptional2 = 0;
    let discont1 = 0, discont2 = 0;
    let discontTax1 = 0, discontTax2 = 0;

    coaLedgers.forEach(l => {
      const lName = (l.name || '').toLowerCase();
      if (lName.includes('exceptional')) {
        exceptional1 += getPnlNodeBalance(l.id, l.type, ledgerBalances1);
        exceptional2 += getPnlNodeBalance(l.id, l.type, ledgerBalances2);
      } else if (lName.includes('discontinued') && lName.includes('tax')) {
        discontTax1 += getPnlNodeBalance(l.id, l.type, ledgerBalances1);
        discontTax2 += getPnlNodeBalance(l.id, l.type, ledgerBalances2);
      } else if (lName.includes('discontinued')) {
        discont1 += getPnlNodeBalance(l.id, l.type, ledgerBalances1);
        discont2 += getPnlNodeBalance(l.id, l.type, ledgerBalances2);
      }
    });

    const pbt1 = pbeita1 - exceptional1;
    const pbt2 = pbeita2 - exceptional2;

    // Tax Expense Breakdown
    const taxLedgers = coaLedgers.filter(l => l.sgId === 'sg-tax');
    let currTaxBal1 = 0, currTaxBal2 = 0;
    let defTaxBal1 = 0, defTaxBal2 = 0;

    taxLedgers.forEach(l => {
      const lName = (l.name || '').toLowerCase();
      const b1 = getPnlNodeBalance(l.id, l.type, ledgerBalances1);
      const b2 = getPnlNodeBalance(l.id, l.type, ledgerBalances2);
      if (lName.includes('deferred')) {
        defTaxBal1 += b1;
        defTaxBal2 += b2;
      } else {
        currTaxBal1 += b1;
        currTaxBal2 += b2;
      }
    });
    // Fallback if no specific current/def tax ledgers but sg-tax has balance
    const totalTaxBal1 = getPnlNodeBalance('sg-tax', 'sg', ledgerBalances1);
    const totalTaxBal2 = getPnlNodeBalance('sg-tax', 'sg', ledgerBalances2);
    if (currTaxBal1 === 0 && defTaxBal1 === 0 && totalTaxBal1 !== 0) {
      currTaxBal1 = totalTaxBal1;
    }
    if (currTaxBal2 === 0 && defTaxBal2 === 0 && totalTaxBal2 !== 0) {
      currTaxBal2 = totalTaxBal2;
    }

    const pcont1 = pbt1 - (currTaxBal1 + defTaxBal1);
    const pcont2 = pbt2 - (currTaxBal2 + defTaxBal2);

    const discontAfter1 = discont1 - discontTax1;
    const discontAfter2 = discont2 - discontTax2;

    const pat1 = pcont1 + discontAfter1;
    const pat2 = pcont2 + discontAfter2;

    // EPS
    const shareCapBal1 = getPnlShareCapitalBalance(dateTo);
    const shareCapBal2 = getPnlShareCapitalBalance(prevPeriodTo);
    const numShares1 = shareCapBal1 > 0 ? Math.round(shareCapBal1 / 10) : 0;
    const numShares2 = shareCapBal2 > 0 ? Math.round(shareCapBal2 / 10) : 0;

    const basicEps1 = numShares1 > 0 ? (pat1 / numShares1).toFixed(2) : '0.00';
    const basicEps2 = numShares2 > 0 ? (pat2 / numShares2).toFixed(2) : '0.00';
    const dilutedEps1 = basicEps1;
    const dilutedEps2 = basicEps2;

    function renderSgRow(title, noteNo, bal1, bal2, isMain = true, isSub = false) {
      const rowClass = isMain ? 'pnl-sch-row-main' : (isSub ? 'pnl-sch-row-sub' : 'pnl-sch-row-main');
      return `
        <tr class="${rowClass}" data-pnl-goto-note="${noteNo}" style="cursor: pointer;" title="Click to view Note ${noteNo} in Notes to Accounts">
          <td>
            <div class="pnl-sch-name">
              <span>${title}</span>
            </div>
          </td>
          <td class="pnl-sch-note-cell">${fmtNoteBadge(noteNo)}</td>
          <td class="pnl-sch-amt">${fmtSchAmt(bal1)}</td>
          <td class="pnl-sch-amt">${fmtSchAmt(bal2)}</td>
        </tr>
      `;
    }

    let tableHtml = `
      <div class="pnl-sch-card">
        <div class="pnl-sch-table-wrap">
          <table class="pnl-sch-table">
            <thead>
              <tr>
                <th class="pnl-sch-th-part">Particulars</th>
                <th class="pnl-sch-th-note">Note No.</th>
                <th class="pnl-sch-th-amt">
                  <div class="pnl-sch-th-title">Current Period</div>
                  <div class="pnl-sch-th-sub">${col1Title}</div>
                </th>
                <th class="pnl-sch-th-amt">
                  <div class="pnl-sch-th-title">Previous Period</div>
                  <div class="pnl-sch-th-sub">${col2Title}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <!-- I. Revenue from operations -->
              ${renderSgRow('I. Revenue from operations', '1', rfoBal1, rfoBal2, true, false)}

              <!-- II. Other income -->
              ${renderSgRow('II. Other income', '2', oiBal1, oiBal2, true, false)}

              <!-- III. Total Revenue (I + II) -->
              <tr class="pnl-sch-subtotal">
                <td>
                  <div class="pnl-sch-name">
                    <span>III. Total Revenue (I + II)</span>
                  </div>
                </td>
                <td class="pnl-sch-note-cell"><span class="pnl-note-empty">-</span></td>
                <td class="pnl-sch-amt">${fmtSchAmt(totalRevenue1)}</td>
                <td class="pnl-sch-amt">${fmtSchAmt(totalRevenue2)}</td>
              </tr>

              <!-- IV. Expenses : -->
              <tr class="pnl-sch-sec-hdr">
                <td colspan="4">IV. Expenses :</td>
              </tr>

              <!-- Expense items -->
              ${renderSgRow('Cost of materials consumed', '3', cmcBal1, cmcBal2, false, true)}
              ${renderSgRow('Purchases of Stock-in-Trade', '4', pstBal1, pstBal2, false, true)}
              ${renderSgRow('Changes in inventories of finished goods / Work-in-progress and Stock-In-Trade', '5', cinvBal1, cinvBal2, false, true)}
              ${renderSgRow('Employee Benefits Expenses', '6', ebeBal1, ebeBal2, false, true)}
              ${renderSgRow('Finance Costs', '7', fcBal1, fcBal2, false, true)}
              ${renderSgRow('Depreciation and amortization expense', '8', daBal1, daBal2, false, true)}
              ${renderSgRow('Other expenses', '9', oeBal1, oeBal2, false, true)}
    `;

    // Custom Expense subgroups if any
    let customNoteCtr = 10;
    customExpSgs.forEach(sg => {
      const b1 = getPnlNodeBalance(sg.id, 'sg', ledgerBalances1);
      const b2 = getPnlNodeBalance(sg.id, 'sg', ledgerBalances2);
      tableHtml += renderSgRow(sg.name, String(customNoteCtr++), b1, b2, false, true);
    });

    tableHtml += `
              <!-- Total expenses (IV) -->
              <tr class="pnl-sch-subtotal">
                <td>
                  <div class="pnl-sch-name">
                    <span>Total expenses (IV)</span>
                  </div>
                </td>
                <td class="pnl-sch-note-cell"><span class="pnl-note-empty">-</span></td>
                <td class="pnl-sch-amt">${fmtSchAmt(totalExpenses1)}</td>
                <td class="pnl-sch-amt">${fmtSchAmt(totalExpenses2)}</td>
              </tr>

              <!-- V. Profit/(loss) before exceptional items and tax (I- IV) -->
              <tr class="pnl-sch-row-highlight">
                <td>
                  <div class="pnl-sch-name">
                    <span>V. Profit/(loss) before exceptional items and tax (I- IV)</span>
                  </div>
                </td>
                <td class="pnl-sch-note-cell"><span class="pnl-note-empty">-</span></td>
                <td class="pnl-sch-amt">${fmtSchAmt(pbeita1)}</td>
                <td class="pnl-sch-amt">${fmtSchAmt(pbeita2)}</td>
              </tr>

              <!-- VI. Exceptional Items -->
              ${renderSgRow('VI. Exceptional Items', '10', exceptional1, exceptional2, true, false)}

              <!-- VII. Profit/(loss) before tax (V-VI) -->
              <tr class="pnl-sch-row-highlight">
                <td>
                  <div class="pnl-sch-name">
                    <span>VII. Profit/(loss) before tax (V-VI)</span>
                  </div>
                </td>
                <td class="pnl-sch-note-cell"><span class="pnl-note-empty">-</span></td>
                <td class="pnl-sch-amt">${fmtSchAmt(pbt1)}</td>
                <td class="pnl-sch-amt">${fmtSchAmt(pbt2)}</td>
              </tr>

              <!-- VIII. Tax expense: -->
              <tr class="pnl-sch-sec-hdr">
                <td colspan="4">VIII. Tax expense:</td>
              </tr>

              <!-- (1) Current tax -->
              ${renderSgRow('(1) Current tax', '11', currTaxBal1, currTaxBal2, false, true)}

              <!-- (2) Deferred tax -->
              ${renderSgRow('(2) Deferred tax', '12', defTaxBal1, defTaxBal2, false, true)}

              <!-- IX. Profit (Loss) for the period from continuing operations (VII-VIII) -->
              <tr class="pnl-sch-row-highlight">
                <td>
                  <div class="pnl-sch-name">
                    <span>IX. Profit (Loss) for the period from continuing operations (VII-VIII)</span>
                  </div>
                </td>
                <td class="pnl-sch-note-cell"><span class="pnl-note-empty">-</span></td>
                <td class="pnl-sch-amt">${fmtSchAmt(pcont1)}</td>
                <td class="pnl-sch-amt">${fmtSchAmt(pcont2)}</td>
              </tr>

              <!-- X. Profit/(loss) from discontinued operations -->
              ${renderSgRow('X. Profit/(loss) from discontinued operations', '13', discont1, discont2, true, false)}

              <!-- XI. Tax expense of discontinued operations -->
              ${renderSgRow('XI. Tax expense of discontinued operations', '14', discontTax1, discontTax2, true, false)}

              <!-- XII. Profit/(loss) from Discontinued operations (after tax) (X-XI) -->
              <tr class="pnl-sch-row-highlight">
                <td>
                  <div class="pnl-sch-name">
                    <span>XII. Profit/(loss) from Discontinued operations (after tax) (X-XI)</span>
                  </div>
                </td>
                <td class="pnl-sch-note-cell"><span class="pnl-note-empty">-</span></td>
                <td class="pnl-sch-amt">${fmtSchAmt(discontAfter1)}</td>
                <td class="pnl-sch-amt">${fmtSchAmt(discontAfter2)}</td>
              </tr>

              <!-- XIII. Profit/(loss) for the period (IX+XII) -->
              <tr class="pnl-sch-grandtotal">
                <td>
                  <div class="pnl-sch-name">
                    <span>XIII. Profit/(loss) for the period (IX+XII)</span>
                  </div>
                </td>
                <td class="pnl-sch-note-cell"><span class="pnl-note-empty">-</span></td>
                <td class="pnl-sch-amt">${fmtSchAmt(pat1)}</td>
                <td class="pnl-sch-amt">${fmtSchAmt(pat2)}</td>
              </tr>

              <!-- XV. Earnings per equity share: -->
              <tr class="pnl-sch-sec-hdr">
                <td colspan="4">XV. Earnings per equity share:</td>
              </tr>

              <tr class="pnl-sch-row-sub" data-pnl-goto-note="15" style="cursor: pointer;" title="Click to view Note 15 details in Notes to Accounts">
                <td>
                  <div class="pnl-sch-name">
                    <span>Basic</span>
                  </div>
                </td>
                <td class="pnl-sch-note-cell">${fmtNoteBadge('15')}</td>
                <td class="pnl-sch-amt">₹ ${basicEps1}</td>
                <td class="pnl-sch-amt">₹ ${basicEps2}</td>
              </tr>

              <tr class="pnl-sch-row-sub" data-pnl-goto-note="15" style="cursor: pointer;" title="Click to view Note 15 details in Notes to Accounts">
                <td>
                  <div class="pnl-sch-name">
                    <span>Diluted</span>
                  </div>
                </td>
                <td class="pnl-sch-note-cell">${fmtNoteBadge('15')}</td>
                <td class="pnl-sch-amt">₹ ${dilutedEps1}</td>
                <td class="pnl-sch-amt">₹ ${dilutedEps2}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    return tableHtml;
  }

  function renderPnlNotesMode(ledgerBalances1, dateFrom, dateTo, isCompare, compareDateFrom, compareDateTo) {
    let ledgerBalances2 = {};
    let prevPeriodFrom = compareDateFrom;
    let prevPeriodTo = compareDateTo;

    if (isCompare) {
      ledgerBalances2 = computeTrialBalanceBalances(compareDateFrom, compareDateTo);
    } else {
      const prevDates = getPreviousPeriodDates(dateFrom, dateTo);
      prevPeriodFrom = prevDates.prevFrom;
      prevPeriodTo = prevDates.prevTo;
      if (prevPeriodFrom || prevPeriodTo) {
        ledgerBalances2 = computeTrialBalanceBalances(prevPeriodFrom, prevPeriodTo);
      }
    }

    const col1Title = formatRptDateRange(dateFrom, dateTo, 'Current Period');
    const col2Title = formatRptDateRange(prevPeriodFrom, prevPeriodTo, 'Previous Period');

    function fmtSchAmt(val) {
      if (typeof val !== 'number' || isNaN(val)) return '₹ 0.00';
      if (val < 0) {
        return `<span style="color: #dc2626;">(₹ ${fmtNum(Math.abs(val))})</span>`;
      }
      return `₹ ${fmtNum(val)}`;
    }

    // Calculations
    const rfoBal1 = getPnlNodeBalance('sg-rfo', 'sg', ledgerBalances1);
    const rfoBal2 = getPnlNodeBalance('sg-rfo', 'sg', ledgerBalances2);
    const oiBal1 = getPnlNodeBalance('sg-oi', 'sg', ledgerBalances1);
    const oiBal2 = getPnlNodeBalance('sg-oi', 'sg', ledgerBalances2);
    const totalRevenue1 = rfoBal1 + oiBal1;
    const totalRevenue2 = rfoBal2 + oiBal2;

    const cmcBal1 = getPnlNodeBalance('sg-cmc', 'sg', ledgerBalances1);
    const cmcBal2 = getPnlNodeBalance('sg-cmc', 'sg', ledgerBalances2);
    const pstBal1 = getPnlNodeBalance('sg-pst', 'sg', ledgerBalances1);
    const pstBal2 = getPnlNodeBalance('sg-pst', 'sg', ledgerBalances2);
    const cinvBal1 = getPnlNodeBalance('sg-cinv', 'sg', ledgerBalances1);
    const cinvBal2 = getPnlNodeBalance('sg-cinv', 'sg', ledgerBalances2);
    const ebeBal1 = getPnlNodeBalance('sg-ebe', 'sg', ledgerBalances1);
    const ebeBal2 = getPnlNodeBalance('sg-ebe', 'sg', ledgerBalances2);
    const fcBal1 = getPnlNodeBalance('sg-fc', 'sg', ledgerBalances1);
    const fcBal2 = getPnlNodeBalance('sg-fc', 'sg', ledgerBalances2);
    const daBal1 = getPnlNodeBalance('sg-da', 'sg', ledgerBalances1);
    const daBal2 = getPnlNodeBalance('sg-da', 'sg', ledgerBalances2);
    const oeBal1 = getPnlNodeBalance('sg-oe', 'sg', ledgerBalances1);
    const oeBal2 = getPnlNodeBalance('sg-oe', 'sg', ledgerBalances2);

    const stdExpSgIds = new Set(['sg-cmc', 'sg-pst', 'sg-cinv', 'sg-ebe', 'sg-fc', 'sg-da', 'sg-oe', 'sg-tax']);
    const customExpSgs = COA_SYS_SGS.filter(sg => sg.main === 'expense' && !stdExpSgIds.has(sg.id));

    let customExpTotal1 = 0, customExpTotal2 = 0;
    customExpSgs.forEach(sg => {
      customExpTotal1 += getPnlNodeBalance(sg.id, 'sg', ledgerBalances1);
      customExpTotal2 += getPnlNodeBalance(sg.id, 'sg', ledgerBalances2);
    });

    const totalExpenses1 = cmcBal1 + pstBal1 + cinvBal1 + ebeBal1 + fcBal1 + daBal1 + oeBal1 + customExpTotal1;
    const totalExpenses2 = cmcBal2 + pstBal2 + cinvBal2 + ebeBal2 + fcBal2 + daBal2 + oeBal2 + customExpTotal2;

    const pbeita1 = totalRevenue1 - totalExpenses1;
    const pbeita2 = totalRevenue2 - totalExpenses2;

    let exceptional1 = 0, exceptional2 = 0;
    let discont1 = 0, discont2 = 0;
    let discontTax1 = 0, discontTax2 = 0;

    coaLedgers.forEach(l => {
      const lName = (l.name || '').toLowerCase();
      if (lName.includes('exceptional')) {
        exceptional1 += getPnlNodeBalance(l.id, l.type, ledgerBalances1);
        exceptional2 += getPnlNodeBalance(l.id, l.type, ledgerBalances2);
      } else if (lName.includes('discontinued') && lName.includes('tax')) {
        discontTax1 += getPnlNodeBalance(l.id, l.type, ledgerBalances1);
        discontTax2 += getPnlNodeBalance(l.id, l.type, ledgerBalances2);
      } else if (lName.includes('discontinued')) {
        discont1 += getPnlNodeBalance(l.id, l.type, ledgerBalances1);
        discont2 += getPnlNodeBalance(l.id, l.type, ledgerBalances2);
      }
    });

    const pbt1 = pbeita1 - exceptional1;
    const pbt2 = pbeita2 - exceptional2;

    const taxLedgers = coaLedgers.filter(l => l.sgId === 'sg-tax');
    let currTaxBal1 = 0, currTaxBal2 = 0;
    let defTaxBal1 = 0, defTaxBal2 = 0;

    taxLedgers.forEach(l => {
      const lName = (l.name || '').toLowerCase();
      const b1 = getPnlNodeBalance(l.id, l.type, ledgerBalances1);
      const b2 = getPnlNodeBalance(l.id, l.type, ledgerBalances2);
      if (lName.includes('deferred')) {
        defTaxBal1 += b1;
        defTaxBal2 += b2;
      } else {
        currTaxBal1 += b1;
        currTaxBal2 += b2;
      }
    });

    const totalTaxBal1 = getPnlNodeBalance('sg-tax', 'sg', ledgerBalances1);
    const totalTaxBal2 = getPnlNodeBalance('sg-tax', 'sg', ledgerBalances2);
    if (currTaxBal1 === 0 && defTaxBal1 === 0 && totalTaxBal1 !== 0) currTaxBal1 = totalTaxBal1;
    if (currTaxBal2 === 0 && defTaxBal2 === 0 && totalTaxBal2 !== 0) currTaxBal2 = totalTaxBal2;

    const pcont1 = pbt1 - (currTaxBal1 + defTaxBal1);
    const pcont2 = pbt2 - (currTaxBal2 + defTaxBal2);
    const discontAfter1 = discont1 - discontTax1;
    const discontAfter2 = discont2 - discontTax2;
    const pat1 = pcont1 + discontAfter1;
    const pat2 = pcont2 + discontAfter2;

    const shareCapBal1 = getPnlShareCapitalBalance(dateTo);
    const shareCapBal2 = getPnlShareCapitalBalance(prevPeriodTo);
    const numShares1 = shareCapBal1 > 0 ? Math.round(shareCapBal1 / 10) : 0;
    const numShares2 = shareCapBal2 > 0 ? Math.round(shareCapBal2 / 10) : 0;

    const basicEps1 = numShares1 > 0 ? (pat1 / numShares1).toFixed(2) : '0.00';
    const basicEps2 = numShares2 > 0 ? (pat2 / numShares2).toFixed(2) : '0.00';
    const dilutedEps1 = basicEps1;
    const dilutedEps2 = basicEps2;

    function renderNoteCardForSubgroup(noteNo, title, sgId) {
      const sgBal1 = getPnlNodeBalance(sgId, 'sg', ledgerBalances1);
      const sgBal2 = getPnlNodeBalance(sgId, 'sg', ledgerBalances2);

      let rowsHtml = '';
      let rowCount = 0;

      const groupLdgs = coaLedgers.filter(l => l.sgId === sgId && l.type === 'group-ledger');
      groupLdgs.forEach(gl => {
        const glBal1 = getPnlNodeBalance(gl.id, 'group-ledger', ledgerBalances1);
        const glBal2 = getPnlNodeBalance(gl.id, 'group-ledger', ledgerBalances2);

        rowsHtml += `
          <tr style="background: #fdfefe; font-weight: 600;">
            <td style="padding-left: 20px; color: #b45309;">📁 ${gl.name} ${gl.code ? `<span class="pnl-code">${gl.code}</span>` : ''}</td>
            <td class="pnl-sch-amt">${fmtSchAmt(glBal1)}</td>
            <td class="pnl-sch-amt">${fmtSchAmt(glBal2)}</td>
          </tr>
        `;
        rowCount++;

        const childLdgs = coaLedgers.filter(l => l.glId === gl.id && l.type === 'ledger');
        childLdgs.forEach(l => {
          const b1 = getPnlNodeBalance(l.id, 'ledger', ledgerBalances1);
          const b2 = getPnlNodeBalance(l.id, 'ledger', ledgerBalances2);
          rowsHtml += `
            <tr>
              <td style="padding-left: 38px; color: var(--slate-600);">• ${l.name} ${l.code ? `<span class="pnl-code">${l.code}</span>` : ''}</td>
              <td class="pnl-sch-amt">${fmtSchAmt(b1)}</td>
              <td class="pnl-sch-amt">${fmtSchAmt(b2)}</td>
            </tr>
          `;
          rowCount++;
        });
      });

      const directLdgs = coaLedgers.filter(l => l.sgId === sgId && l.type === 'ledger' && !l.glId);
      directLdgs.forEach(l => {
        const b1 = getPnlNodeBalance(l.id, 'ledger', ledgerBalances1);
        const b2 = getPnlNodeBalance(l.id, 'ledger', ledgerBalances2);
        rowsHtml += `
          <tr>
            <td style="padding-left: 20px; color: var(--slate-700);">• ${l.name} ${l.code ? `<span class="pnl-code">${l.code}</span>` : ''}</td>
            <td class="pnl-sch-amt">${fmtSchAmt(b1)}</td>
            <td class="pnl-sch-amt">${fmtSchAmt(b2)}</td>
          </tr>
        `;
        rowCount++;
      });

      if (rowCount === 0) {
        rowsHtml = `
          <tr>
            <td style="padding-left: 20px; color: var(--slate-400); font-style: italic;">No specific accounts recorded under this note</td>
            <td class="pnl-sch-amt">₹ 0.00</td>
            <td class="pnl-sch-amt">₹ 0.00</td>
          </tr>
        `;
      }

      return `
        <div class="pnl-note-card" id="pnl-note-${noteNo}">
          <div class="pnl-note-header">
            <div class="pnl-note-header-left">
              <span class="pnl-note-badge-lg">Note ${noteNo}</span>
              <span class="pnl-note-title">${title}</span>
            </div>
            <div style="font-size: 13.5px; font-weight: 700; color: var(--blue-900);">
              Total: ${fmtSchAmt(sgBal1)}
            </div>
          </div>
          <table class="pnl-note-table">
            <thead>
              <tr>
                <th style="text-align: left;">Particulars</th>
                <th style="text-align: right; width: 170px;">Current Period (₹)</th>
                <th style="text-align: right; width: 170px;">Previous Period (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr class="pnl-note-total-row">
                <td>Total ${title}</td>
                <td class="pnl-sch-amt">${fmtSchAmt(sgBal1)}</td>
                <td class="pnl-sch-amt">${fmtSchAmt(sgBal2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    function renderTaxNoteCard(noteNo, title, isDeferred = false) {
      const taxLdgs = coaLedgers.filter(l => {
        if (l.sgId !== 'sg-tax') return false;
        const lName = (l.name || '').toLowerCase();
        return isDeferred ? lName.includes('deferred') : !lName.includes('deferred');
      });

      let rowsHtml = '';
      let tot1 = 0, tot2 = 0;

      taxLdgs.forEach(l => {
        const b1 = getPnlNodeBalance(l.id, l.type, ledgerBalances1);
        const b2 = getPnlNodeBalance(l.id, l.type, ledgerBalances2);
        tot1 += b1;
        tot2 += b2;
        rowsHtml += `
          <tr>
            <td style="padding-left: 20px; color: var(--slate-700);">• ${l.name}</td>
            <td class="pnl-sch-amt">${fmtSchAmt(b1)}</td>
            <td class="pnl-sch-amt">${fmtSchAmt(b2)}</td>
          </tr>
        `;
      });

      if (taxLdgs.length === 0) {
        const fallbackTot1 = isDeferred ? defTaxBal1 : currTaxBal1;
        const fallbackTot2 = isDeferred ? defTaxBal2 : currTaxBal2;
        tot1 = fallbackTot1;
        tot2 = fallbackTot2;
        rowsHtml = `
          <tr>
            <td style="padding-left: 20px; color: var(--slate-700);">• ${title} Provision</td>
            <td class="pnl-sch-amt">${fmtSchAmt(tot1)}</td>
            <td class="pnl-sch-amt">${fmtSchAmt(tot2)}</td>
          </tr>
        `;
      }

      return `
        <div class="pnl-note-card" id="pnl-note-${noteNo}">
          <div class="pnl-note-header">
            <div class="pnl-note-header-left">
              <span class="pnl-note-badge-lg">Note ${noteNo}</span>
              <span class="pnl-note-title">${title}</span>
            </div>
            <div style="font-size: 13.5px; font-weight: 700; color: var(--blue-900);">
              Total: ${fmtSchAmt(tot1)}
            </div>
          </div>
          <table class="pnl-note-table">
            <thead>
              <tr>
                <th style="text-align: left;">Particulars</th>
                <th style="text-align: right; width: 170px;">Current Period (₹)</th>
                <th style="text-align: right; width: 170px;">Previous Period (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr class="pnl-note-total-row">
                <td>Total ${title}</td>
                <td class="pnl-sch-amt">${fmtSchAmt(tot1)}</td>
                <td class="pnl-sch-amt">${fmtSchAmt(tot2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    function renderCustomNoteCard(noteNo, title, val1, val2, subtitle = '') {
      return `
        <div class="pnl-note-card" id="pnl-note-${noteNo}">
          <div class="pnl-note-header">
            <div class="pnl-note-header-left">
              <span class="pnl-note-badge-lg">Note ${noteNo}</span>
              <span class="pnl-note-title">${title}</span>
            </div>
            <div style="font-size: 13.5px; font-weight: 700; color: var(--blue-900);">
              Total: ${fmtSchAmt(val1)}
            </div>
          </div>
          <table class="pnl-note-table">
            <thead>
              <tr>
                <th style="text-align: left;">Particulars</th>
                <th style="text-align: right; width: 170px;">Current Period (₹)</th>
                <th style="text-align: right; width: 170px;">Previous Period (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding-left: 20px; color: var(--slate-700);">${subtitle || title}</td>
                <td class="pnl-sch-amt">${fmtSchAmt(val1)}</td>
                <td class="pnl-sch-amt">${fmtSchAmt(val2)}</td>
              </tr>
              <tr class="pnl-note-total-row">
                <td>Total ${title}</td>
                <td class="pnl-sch-amt">${fmtSchAmt(val1)}</td>
                <td class="pnl-sch-amt">${fmtSchAmt(val2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    function renderEpsNoteCard(noteNo) {
      return `
        <div class="pnl-note-card" id="pnl-note-${noteNo}">
          <div class="pnl-note-header">
            <div class="pnl-note-header-left">
              <span class="pnl-note-badge-lg">Note ${noteNo}</span>
              <span class="pnl-note-title">Earnings Per Equity Share (EPS)</span>
            </div>
            <div style="font-size: 13.5px; font-weight: 700; color: var(--blue-900);">
              Basic EPS: ₹ ${basicEps1}
            </div>
          </div>
          <table class="pnl-note-table">
            <thead>
              <tr>
                <th style="text-align: left;">Particulars</th>
                <th style="text-align: right; width: 170px;">Current Period</th>
                <th style="text-align: right; width: 170px;">Previous Period</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding-left: 20px; color: var(--slate-700);">Profit/(loss) for the period after tax (₹)</td>
                <td class="pnl-sch-amt">${fmtSchAmt(pat1)}</td>
                <td class="pnl-sch-amt">${fmtSchAmt(pat2)}</td>
              </tr>
              <tr>
                <td style="padding-left: 20px; color: var(--slate-700);">Weighted average number of equity shares</td>
                <td class="pnl-sch-amt">${numShares1 > 0 ? numShares1.toLocaleString('en-IN') : '0'}</td>
                <td class="pnl-sch-amt">${numShares2 > 0 ? numShares2.toLocaleString('en-IN') : '0'}</td>
              </tr>
              <tr>
                <td style="padding-left: 20px; color: var(--slate-700);">Nominal value per equity share (₹)</td>
                <td class="pnl-sch-amt">${numShares1 > 0 ? '₹ 10.00' : '₹ 0.00'}</td>
                <td class="pnl-sch-amt">${numShares2 > 0 ? '₹ 10.00' : '₹ 0.00'}</td>
              </tr>
              <tr class="pnl-note-total-row">
                <td>Basic Earnings Per Share (₹)</td>
                <td class="pnl-sch-amt">₹ ${basicEps1}</td>
                <td class="pnl-sch-amt">₹ ${basicEps2}</td>
              </tr>
              <tr class="pnl-note-total-row">
                <td>Diluted Earnings Per Share (₹)</td>
                <td class="pnl-sch-amt">₹ ${dilutedEps1}</td>
                <td class="pnl-sch-amt">₹ ${dilutedEps2}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    let notesHtml = `
      <div class="pnl-notes-container">
        <!-- Notes Hero Banner -->
        <div class="pnl-notes-hero">
          <div class="pnl-notes-hero-top">
            <div>
              <div class="pnl-notes-hero-title">Notes to Financial Statements (Profit &amp; Loss)</div>
              <div class="pnl-notes-hero-sub">Schedule III Disclosures &middot; ${col1Title} vs ${col2Title}</div>
            </div>
            <button class="btn btn-sales-action" id="pnlNotesBackToSchBtn" type="button" style="height: 34px; font-size: 12.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; border-radius: 8px;">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8L10 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Back to Profit &amp; Loss Statement
            </button>
          </div>
          <div class="pnl-notes-pills-wrap">
            <a class="pnl-note-pill" href="#pnl-note-1">Note 1: Revenue</a>
            <a class="pnl-note-pill" href="#pnl-note-2">Note 2: Other Income</a>
            <a class="pnl-note-pill" href="#pnl-note-3">Note 3: Material Consumed</a>
            <a class="pnl-note-pill" href="#pnl-note-4">Note 4: Purchases</a>
            <a class="pnl-note-pill" href="#pnl-note-5">Note 5: Inventories</a>
            <a class="pnl-note-pill" href="#pnl-note-6">Note 6: Employee Benefits</a>
            <a class="pnl-note-pill" href="#pnl-note-7">Note 7: Finance Costs</a>
            <a class="pnl-note-pill" href="#pnl-note-8">Note 8: Depreciation</a>
            <a class="pnl-note-pill" href="#pnl-note-9">Note 9: Other Expenses</a>
            <a class="pnl-note-pill" href="#pnl-note-10">Note 10: Exceptional</a>
            <a class="pnl-note-pill" href="#pnl-note-11">Note 11: Current Tax</a>
            <a class="pnl-note-pill" href="#pnl-note-12">Note 12: Deferred Tax</a>
            <a class="pnl-note-pill" href="#pnl-note-15">Note 15: EPS</a>
          </div>
        </div>

        <!-- Note Cards -->
        ${renderNoteCardForSubgroup('1', 'Revenue from Operations', 'sg-rfo')}
        ${renderNoteCardForSubgroup('2', 'Other Income', 'sg-oi')}
        ${renderNoteCardForSubgroup('3', 'Cost of Materials Consumed', 'sg-cmc')}
        ${renderNoteCardForSubgroup('4', 'Purchases of Stock-in-Trade', 'sg-pst')}
        ${renderNoteCardForSubgroup('5', 'Changes in Inventories of Finished Goods, Work-in-Progress and Stock-in-Trade', 'sg-cinv')}
        ${renderNoteCardForSubgroup('6', 'Employee Benefits Expense', 'sg-ebe')}
        ${renderNoteCardForSubgroup('7', 'Finance Costs', 'sg-fc')}
        ${renderNoteCardForSubgroup('8', 'Depreciation and Amortization Expense', 'sg-da')}
        ${renderNoteCardForSubgroup('9', 'Other Expenses', 'sg-oe')}
    `;

    // Custom Expense subgroups Notes
    let noteCtr = 10;
    customExpSgs.forEach(sg => {
      notesHtml += renderNoteCardForSubgroup(String(noteCtr++), sg.name, sg.id);
    });

    notesHtml += `
        ${renderCustomNoteCard('10', 'Exceptional Items', exceptional1, exceptional2, 'Exceptional gains / (losses) during the period')}
        ${renderTaxNoteCard('11', 'Current Tax', false)}
        ${renderTaxNoteCard('12', 'Deferred Tax', true)}
        ${renderCustomNoteCard('13', 'Discontinued Operations', discont1, discont2, 'Profit / (loss) from discontinued operations')}
        ${renderCustomNoteCard('14', 'Tax Expense of Discontinued Operations', discontTax1, discontTax2, 'Tax on discontinued operations')}
        ${renderEpsNoteCard('15')}
      </div>
    `;

    return notesHtml;
  }

  function renderPnlPanel() {
    injectPnlStyles();
    const wrap = document.getElementById('pnlSheetWrap');
    if (!wrap) return;

    const fromInp = document.getElementById('pnlDateFrom');
    const toInp   = document.getElementById('pnlDateTo');
    if (fromInp && !fromInp.value) fromInp.value = _globalDateFrom;
    if (toInp   && !toInp.value)   toInp.value   = _globalDateTo;

    const dateFrom = fromInp ? fromInp.value : '';
    const dateTo   = toInp ? toInp.value : '';

    const isCompare = document.getElementById('pnlCompareCheck')?.checked || false;
    const compFromInp = document.getElementById('pnlCompareDateFrom');
    const compToInp   = document.getElementById('pnlCompareDateTo');
    const compareDateFrom = (isCompare && compFromInp) ? compFromInp.value : '';
    const compareDateTo   = (isCompare && compToInp) ? compToInp.value : '';

    if (_pnlExpanded.size === 0) {
      COA_SYS_SGS.forEach(sg => {
        if (sg.main === 'income' || sg.main === 'expense') {
          _pnlExpanded.add('sg-' + sg.id);
        }
      });
    }

    // Primary Period Calculations
    const ledgerBalances1 = computeTrialBalanceBalances(dateFrom, dateTo);
    const rfoBal1 = getPnlNodeBalance('sg-rfo', 'sg', ledgerBalances1);
    const oiBal1  = getPnlNodeBalance('sg-oi', 'sg', ledgerBalances1);
    const totalRevenue1 = rfoBal1 + oiBal1;

    const expSubgroups = COA_SYS_SGS.filter(sg => sg.main === 'expense' && sg.id !== 'sg-tax');
    let totalExpenses1 = 0;
    expSubgroups.forEach(sg => {
      totalExpenses1 += getPnlNodeBalance(sg.id, 'sg', ledgerBalances1);
    });

    const pbt1 = totalRevenue1 - totalExpenses1;
    const taxBal1 = getPnlNodeBalance('sg-tax', 'sg', ledgerBalances1);
    const pat1 = pbt1 - taxBal1;

    // Comparison Period Calculations
    let ledgerBalances2 = {};
    let totalRevenue2 = 0;
    let totalExpenses2 = 0;
    let pbt2 = 0;
    let taxBal2 = 0;
    let pat2 = 0;

    if (isCompare) {
      ledgerBalances2 = computeTrialBalanceBalances(compareDateFrom, compareDateTo);
      const rfoBal2 = getPnlNodeBalance('sg-rfo', 'sg', ledgerBalances2);
      const oiBal2  = getPnlNodeBalance('sg-oi', 'sg', ledgerBalances2);
      totalRevenue2 = rfoBal2 + oiBal2;
      expSubgroups.forEach(sg => {
        totalExpenses2 += getPnlNodeBalance(sg.id, 'sg', ledgerBalances2);
      });
      pbt2 = totalRevenue2 - totalExpenses2;
      taxBal2 = getPnlNodeBalance('sg-tax', 'sg', ledgerBalances2);
      pat2 = pbt2 - taxBal2;
    }

    const col1Title = formatRptDateRange(dateFrom, dateTo, 'Primary Period');
    const col2Title = formatRptDateRange(compareDateFrom, compareDateTo, 'Comparison Period');

    function getPnlAmtHtml(bal1, bal2) {
      if (isCompare) {
        return `<div class="pnl-amt-pair"><span class="amt-col-primary">₹ ${fmtNum(bal1)}</span><span class="amt-col-compare">₹ ${fmtNum(bal2)}</span></div>`;
      }
      return `<div class="pnl-amt-col">₹ ${fmtNum(bal1)}</div>`;
    }

    const btnSch = document.getElementById('pnlLayoutSchedule');
    const btnNotes = document.getElementById('pnlLayoutNotes');

    function setBtnStyle(btn, isActive) {
      if (!btn) return;
      if (isActive) {
        btn.className = 'btn btn-primary';
        btn.style.background = 'var(--blue-700)';
        btn.style.color = '#fff';
        btn.style.borderColor = 'var(--blue-700)';
      } else {
        btn.className = 'btn-sales-action';
        btn.style.background = 'var(--white)';
        btn.style.color = 'var(--slate-600)';
        btn.style.borderColor = 'var(--slate-200)';
      }
    }

    setBtnStyle(btnSch, _pnlLayoutMode === 'Schedule');
    setBtnStyle(btnNotes, _pnlLayoutMode === 'Notes');

    let treeHtml = '';
    if (_pnlLayoutMode === 'Schedule') {
      treeHtml = renderPnlScheduleMode(ledgerBalances1, dateFrom, dateTo, isCompare, compareDateFrom, compareDateTo);
    } else if (_pnlLayoutMode === 'Notes') {
      treeHtml = renderPnlNotesMode(ledgerBalances1, dateFrom, dateTo, isCompare, compareDateFrom, compareDateTo);
    } else if (_pnlLayoutMode === 'Horizontal') {
      treeHtml = '<div class="pnl-tree horizontal-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 24px; align-items: stretch;">';

      // 1. Left Card: Expenses & Tax
      let leftHtml = `
        <div class="pnl-card" style="display: flex; flex-direction: column; height: 100%; margin-bottom: 0;">
          <div class="pnl-row pnl-row-hdr pnl-indent-hdr">
            <span>II. Expenses &amp; Profit</span>
            ${isCompare ? `<div class="pnl-amt-pair"><span class="amt-col-primary">${col1Title}</span><span class="amt-col-compare">${col2Title}</span></div>` : `<span>Amount (₹)</span>`}
          </div>
          <div style="display: flex; flex-direction: column; flex-grow: 1;">
      `;

      expSubgroups.forEach(sg => {
        const hasTx1 = subgroupHasTransactions(sg.id, dateFrom, dateTo, false);
        const hasTx2 = isCompare && subgroupHasTransactions(sg.id, compareDateFrom, compareDateTo, false);
        if (!hasTx1 && !hasTx2) return;

        const sgBal1 = getPnlNodeBalance(sg.id, 'sg', ledgerBalances1);
        const sgBal2 = isCompare ? getPnlNodeBalance(sg.id, 'sg', ledgerBalances2) : 0;
        const isSgOpen = _pnlExpanded.has('sg-' + sg.id);
        leftHtml += `
          <div class="pnl-row pnl-row-l1 pnl-indent-l1" data-pnl-toggle="sg-${sg.id}">
            <div class="pnl-name-col">
              <svg class="pnl-caret${isSgOpen ? ' open' : ''}" width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="pnl-name-text">${sg.name}</span>
            </div>
            ${getPnlAmtHtml(sgBal1, sgBal2)}
          </div>
          <div id="pnlBody-sg-${sg.id}" style="${isSgOpen ? '' : 'display:none'}">
            ${renderPnlSubgroupLeafs(sg.id, ledgerBalances1, 'pnl-indent-l2', 'pnl-indent-l3', dateFrom, dateTo, isCompare, ledgerBalances2, compareDateFrom, compareDateTo)}
          </div>
        `;
      });

      const taxSg = COA_SYS_SGS.find(sg => sg.id === 'sg-tax');
      const hasTaxActivity1 = taxSg && (taxBal1 !== 0 || subgroupHasTransactions('sg-tax', dateFrom, dateTo, false));
      const hasTaxActivity2 = isCompare && taxSg && (taxBal2 !== 0 || subgroupHasTransactions('sg-tax', compareDateFrom, compareDateTo, false));
      if (taxSg && (hasTaxActivity1 || hasTaxActivity2)) {
        const isTaxOpen = _pnlExpanded.has('sg-sg-tax');
        leftHtml += `
          <div class="pnl-row pnl-row-l1 pnl-indent-l1" data-pnl-toggle="sg-sg-tax">
            <div class="pnl-name-col">
              <svg class="pnl-caret${isTaxOpen ? ' open' : ''}" width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="pnl-name-text">Tax Expense</span>
            </div>
            ${getPnlAmtHtml(taxBal1, taxBal2)}
          </div>
          <div id="pnlBody-sg-sg-tax" style="${isTaxOpen ? '' : 'display:none'}">
            ${renderPnlSubgroupLeafs('sg-tax', ledgerBalances1, 'pnl-indent-l2', 'pnl-indent-l3', dateFrom, dateTo, isCompare, ledgerBalances2, compareDateFrom, compareDateTo)}
          </div>
        `;
      }

      if (pat1 > 0 || (isCompare && pat2 > 0)) {
        leftHtml += `
          <div class="pnl-row pnl-row-l1 pnl-indent-l1" style="background: #f0fdf4; color: #16a34a; font-weight: 700; cursor: default;">
            <div class="pnl-name-col">
              <span class="pnl-caret-empty"></span>
              <span class="pnl-name-text">Profit After Tax (PAT)</span>
            </div>
            ${getPnlAmtHtml(pat1 > 0 ? pat1 : 0, pat2 > 0 ? pat2 : 0)}
          </div>
        `;
      }

      const leftTotal1 = totalExpenses1 + taxBal1 + (pat1 > 0 ? pat1 : 0);
      const leftTotal2 = totalExpenses2 + taxBal2 + (pat2 > 0 ? pat2 : 0);
      leftHtml += `
            <div class="pnl-row pnl-total-row pnl-indent-hdr" style="margin-top: auto;">
              <span>Total Expenses &amp; Profit</span>
              ${getPnlAmtHtml(leftTotal1, leftTotal2)}
            </div>
          </div>
        </div>
      `;

      // 2. Right Card: Revenue & Loss
      let rightHtml = `
        <div class="pnl-card" style="display: flex; flex-direction: column; height: 100%; margin-bottom: 0;">
          <div class="pnl-row pnl-row-hdr pnl-indent-hdr">
            <span>I. Revenue &amp; Income</span>
            ${isCompare ? `<div class="pnl-amt-pair"><span class="amt-col-primary">${col1Title}</span><span class="amt-col-compare">${col2Title}</span></div>` : `<span>Amount (₹)</span>`}
          </div>
          <div style="display: flex; flex-direction: column; flex-grow: 1;">
      `;

      const incSubgroups = COA_SYS_SGS.filter(sg => sg.main === 'income');
      incSubgroups.forEach(sg => {
        const hasTx1 = subgroupHasTransactions(sg.id, dateFrom, dateTo, false);
        const hasTx2 = isCompare && subgroupHasTransactions(sg.id, compareDateFrom, compareDateTo, false);
        if (!hasTx1 && !hasTx2) return;

        const sgBal1 = getPnlNodeBalance(sg.id, 'sg', ledgerBalances1);
        const sgBal2 = isCompare ? getPnlNodeBalance(sg.id, 'sg', ledgerBalances2) : 0;
        const isSgOpen = _pnlExpanded.has('sg-' + sg.id);

        rightHtml += `
          <div class="pnl-row pnl-row-l1 pnl-indent-l1" data-pnl-toggle="sg-${sg.id}">
            <div class="pnl-name-col">
              <svg class="pnl-caret${isSgOpen ? ' open' : ''}" width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="pnl-name-text">${sg.name}</span>
            </div>
            ${getPnlAmtHtml(sgBal1, sgBal2)}
          </div>
          <div id="pnlBody-sg-${sg.id}" style="${isSgOpen ? '' : 'display:none'}">
            ${renderPnlSubgroupLeafs(sg.id, ledgerBalances1, 'pnl-indent-l2', 'pnl-indent-l3', dateFrom, dateTo, isCompare, ledgerBalances2, compareDateFrom, compareDateTo)}
          </div>
        `;
      });

      if (pat1 < 0 || (isCompare && pat2 < 0)) {
        rightHtml += `
          <div class="pnl-row pnl-row-l1 pnl-indent-l1" style="background: #fef2f2; color: #dc2626; font-weight: 700; cursor: default;">
            <div class="pnl-name-col">
              <span class="pnl-caret-empty"></span>
              <span class="pnl-name-text">Loss After Tax</span>
            </div>
            ${getPnlAmtHtml(pat1 < 0 ? Math.abs(pat1) : 0, pat2 < 0 ? Math.abs(pat2) : 0)}
          </div>
        `;
      }

      const rightTotal1 = totalRevenue1 + (pat1 < 0 ? Math.abs(pat1) : 0);
      const rightTotal2 = totalRevenue2 + (pat2 < 0 ? Math.abs(pat2) : 0);
      rightHtml += `
            <div class="pnl-row pnl-total-row pnl-indent-hdr" style="margin-top: auto;">
              <span>Total Revenue &amp; Loss</span>
              ${getPnlAmtHtml(rightTotal1, rightTotal2)}
            </div>
          </div>
        </div>
      `;

      treeHtml += leftHtml + rightHtml + '</div>';

    } else {
      treeHtml = '<div class="pnl-tree">';

      treeHtml += `
        <div class="pnl-card">
          <div class="pnl-row pnl-row-hdr pnl-indent-hdr">
            <span>I. Revenue</span>
            ${isCompare ? `<div class="pnl-amt-pair"><span class="amt-col-primary">${col1Title}</span><span class="amt-col-compare">${col2Title}</span></div>` : `<span>Amount (₹)</span>`}
          </div>
      `;
      const incSubgroups = COA_SYS_SGS.filter(sg => sg.main === 'income');
      incSubgroups.forEach(sg => {
        const hasTx1 = subgroupHasTransactions(sg.id, dateFrom, dateTo, false);
        const hasTx2 = isCompare && subgroupHasTransactions(sg.id, compareDateFrom, compareDateTo, false);
        if (!hasTx1 && !hasTx2) return;

        const sgBal1 = getPnlNodeBalance(sg.id, 'sg', ledgerBalances1);
        const sgBal2 = isCompare ? getPnlNodeBalance(sg.id, 'sg', ledgerBalances2) : 0;
        const isSgOpen = _pnlExpanded.has('sg-' + sg.id);

        treeHtml += `
          <div class="pnl-row pnl-row-l1 pnl-indent-l1" data-pnl-toggle="sg-${sg.id}">
            <div class="pnl-name-col">
              <svg class="pnl-caret${isSgOpen ? ' open' : ''}" width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="pnl-name-text">${sg.name}</span>
            </div>
            ${getPnlAmtHtml(sgBal1, sgBal2)}
          </div>
          <div id="pnlBody-sg-${sg.id}" style="${isSgOpen ? '' : 'display:none'}">
            ${renderPnlSubgroupLeafs(sg.id, ledgerBalances1, 'pnl-indent-l2', 'pnl-indent-l3', dateFrom, dateTo, isCompare, ledgerBalances2, compareDateFrom, compareDateTo)}
          </div>
        `;
      });

      treeHtml += `
          <div class="pnl-row pnl-total-row pnl-indent-hdr">
            <span>Total Revenue (I)</span>
            ${getPnlAmtHtml(totalRevenue1, totalRevenue2)}
          </div>
        </div>
      `;

      treeHtml += `
        <div class="pnl-card">
          <div class="pnl-row pnl-row-hdr pnl-indent-hdr">
            <span>II. Expenses</span>
            ${isCompare ? `<div class="pnl-amt-pair"><span class="amt-col-primary">${col1Title}</span><span class="amt-col-compare">${col2Title}</span></div>` : `<span>Amount (₹)</span>`}
          </div>
      `;
      expSubgroups.forEach(sg => {
        const hasTx1 = subgroupHasTransactions(sg.id, dateFrom, dateTo, false);
        const hasTx2 = isCompare && subgroupHasTransactions(sg.id, compareDateFrom, compareDateTo, false);
        if (!hasTx1 && !hasTx2) return;

        const sgBal1 = getPnlNodeBalance(sg.id, 'sg', ledgerBalances1);
        const sgBal2 = isCompare ? getPnlNodeBalance(sg.id, 'sg', ledgerBalances2) : 0;
        const isSgOpen = _pnlExpanded.has('sg-' + sg.id);

        treeHtml += `
          <div class="pnl-row pnl-row-l1 pnl-indent-l1" data-pnl-toggle="sg-${sg.id}">
            <div class="pnl-name-col">
              <svg class="pnl-caret${isSgOpen ? ' open' : ''}" width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="pnl-name-text">${sg.name}</span>
            </div>
            ${getPnlAmtHtml(sgBal1, sgBal2)}
          </div>
          <div id="pnlBody-sg-${sg.id}" style="${isSgOpen ? '' : 'display:none'}">
            ${renderPnlSubgroupLeafs(sg.id, ledgerBalances1, 'pnl-indent-l2', 'pnl-indent-l3', dateFrom, dateTo, isCompare, ledgerBalances2, compareDateFrom, compareDateTo)}
          </div>
        `;
      });

      treeHtml += `
          <div class="pnl-row pnl-total-row pnl-indent-hdr">
            <span>Total Expenses (II)</span>
            ${getPnlAmtHtml(totalExpenses1, totalExpenses2)}
          </div>
        </div>
      `;

      treeHtml += `
        <div class="pnl-card">
          <div class="pnl-row pnl-row-hdr pnl-indent-hdr">
            <span>III. Profitability</span>
            ${isCompare ? `<div class="pnl-amt-pair"><span class="amt-col-primary">${col1Title}</span><span class="amt-col-compare">${col2Title}</span></div>` : `<span>Amount (₹)</span>`}
          </div>
          
          <div class="pnl-row pnl-total-row pnl-indent-l1">
            <div class="pnl-name-col">
              <span class="pnl-caret-empty"></span>
              <span class="pnl-name-text" style="font-weight:700;">Profit Before Tax (PBT) (I - II)</span>
            </div>
            ${getPnlAmtHtml(pbt1, pbt2)}
          </div>
      `;

      const taxSg = COA_SYS_SGS.find(sg => sg.id === 'sg-tax');
      const hasTaxActivity1 = taxSg && (taxBal1 !== 0 || subgroupHasTransactions('sg-tax', dateFrom, dateTo, false));
      const hasTaxActivity2 = isCompare && taxSg && (taxBal2 !== 0 || subgroupHasTransactions('sg-tax', compareDateFrom, compareDateTo, false));
      if (taxSg && (hasTaxActivity1 || hasTaxActivity2)) {
        const isTaxOpen = _pnlExpanded.has('sg-sg-tax');
        treeHtml += `
          <div class="pnl-row pnl-row-l1 pnl-indent-l1" data-pnl-toggle="sg-sg-tax">
            <div class="pnl-name-col">
              <svg class="pnl-caret${isTaxOpen ? ' open' : ''}" width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="pnl-name-text">Less: Tax Expense</span>
            </div>
            ${getPnlAmtHtml(taxBal1, taxBal2)}
          </div>
          <div id="pnlBody-sg-sg-tax" style="${isTaxOpen ? '' : 'display:none'}">
            ${renderPnlSubgroupLeafs('sg-tax', ledgerBalances1, 'pnl-indent-l2', 'pnl-indent-l3', dateFrom, dateTo, isCompare, ledgerBalances2, compareDateFrom, compareDateTo)}
          </div>
        `;
      }

      treeHtml += `
          <div class="pnl-row pnl-grandtotal pnl-indent-hdr">
            <span>Profit After Tax (PAT)</span>
            ${getPnlAmtHtml(pat1, pat2)}
          </div>
        </div>
      `;

      treeHtml += '</div>';
    }
    wrap.innerHTML = treeHtml;

    wrap.querySelectorAll('[data-pnl-toggle]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = el.dataset.pnlToggle;
        if (_pnlExpanded.has(id)) _pnlExpanded.delete(id);
        else _pnlExpanded.add(id);
        renderPnlPanel();
      });
    });

    wrap.querySelectorAll('[data-pnl-goto-note]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const noteNo = el.dataset.pnlGotoNote;
        if (!noteNo) return;
        _pnlLayoutMode = 'Notes';
        renderPnlPanel();
        setTimeout(() => {
          const targetEl = document.getElementById(`pnl-note-${noteNo}`);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            targetEl.classList.add('pnl-note-target-highlight');
            setTimeout(() => {
              targetEl.classList.remove('pnl-note-target-highlight');
            }, 2500);
          }
        }, 60);
      });
    });

    document.getElementById('pnlNotesBackToSchBtn')?.addEventListener('click', () => {
      _pnlLayoutMode = 'Schedule';
      renderPnlPanel();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    wrap.querySelectorAll('.pnl-note-pill').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = el.getAttribute('href')?.replace('#', '');
        if (targetId) {
          const targetEl = document.getElementById(targetId);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            targetEl.classList.add('pnl-note-target-highlight');
            setTimeout(() => {
              targetEl.classList.remove('pnl-note-target-highlight');
            }, 2500);
          }
        }
      });
    });
  }

  function renderPnlSubgroupLeafs(sgId, ledgerBalances1, indentClassL2, indentClassL3, dateFrom = '', dateTo = '', isCompare = false, ledgerBalances2 = {}, compareDateFrom = '', compareDateTo = '') {
    let html = '';

    function getPnlAmtHtml(bal1, bal2) {
      if (isCompare) {
        return `<div class="pnl-amt-pair"><span class="amt-col-primary">₹ ${fmtNum(bal1)}</span><span class="amt-col-compare">₹ ${fmtNum(bal2)}</span></div>`;
      }
      return `<div class="pnl-amt-col">₹ ${fmtNum(bal1)}</div>`;
    }

    const groupLdgs = coaLedgers.filter(l => l.sgId === sgId && l.type === 'group-ledger');
    groupLdgs.forEach(gl => {
      const hasGlTx1 = groupLedgerHasTransactions(gl.id, dateFrom, dateTo, false);
      const hasGlTx2 = isCompare && groupLedgerHasTransactions(gl.id, compareDateFrom, compareDateTo, false);
      if (!hasGlTx1 && !hasGlTx2) return;

      const glBal1 = getPnlNodeBalance(gl.id, 'group-ledger', ledgerBalances1);
      const glBal2 = isCompare ? getPnlNodeBalance(gl.id, 'group-ledger', ledgerBalances2) : 0;
      const isGlOpen = _pnlExpanded.has('gl-' + gl.id);

      let childHtml = '';
      const childLdgs = coaLedgers.filter(l => l.glId === gl.id && l.type === 'ledger');
      childLdgs.forEach(l => {
        const hasLTx1 = ledgerHasTransactions(l, dateFrom, dateTo, false);
        const hasLTx2 = isCompare && ledgerHasTransactions(l, compareDateFrom, compareDateTo, false);
        if (!hasLTx1 && !hasLTx2) return;

        const bal1 = getPnlNodeBalance(l.id, 'ledger', ledgerBalances1);
        const bal2 = isCompare ? getPnlNodeBalance(l.id, 'ledger', ledgerBalances2) : 0;

        childHtml += `
          <div class="pnl-row pnl-row-l3 ${indentClassL3}">
            <div class="pnl-name-col">
              <span class="pnl-caret-empty"></span>
              <span class="pnl-name-text">${l.name}</span>
              ${l.code ? `<span class="pnl-code">${l.code}</span>` : ''}
            </div>
            ${getPnlAmtHtml(bal1, bal2)}
          </div>
        `;
      });

      if (!childHtml) return;

      html += `
        <div class="pnl-row pnl-row-l2 ${indentClassL2}" data-pnl-toggle="gl-${gl.id}">
          <div class="pnl-name-col">
            <svg class="pnl-caret${isGlOpen ? ' open' : ''}" width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="pnl-name-text">📁 ${gl.name}</span>
            ${gl.code ? `<span class="pnl-code">${gl.code}</span>` : ''}
          </div>
          ${getPnlAmtHtml(glBal1, glBal2)}
        </div>
        <div id="pnlBody-gl-${gl.id}" style="${isGlOpen ? '' : 'display:none'}">
          ${childHtml}
        </div>
      `;
    });

    const directLdgs = coaLedgers.filter(l => l.sgId === sgId && l.type === 'ledger' && !l.glId);
    directLdgs.forEach(l => {
      const hasLTx1 = ledgerHasTransactions(l, dateFrom, dateTo, false);
      const hasLTx2 = isCompare && ledgerHasTransactions(l, compareDateFrom, compareDateTo, false);
      if (!hasLTx1 && !hasLTx2) return;

      const bal1 = getPnlNodeBalance(l.id, 'ledger', ledgerBalances1);
      const bal2 = isCompare ? getPnlNodeBalance(l.id, 'ledger', ledgerBalances2) : 0;

      html += `
        <div class="pnl-row pnl-row-l3 ${indentClassL2}">
          <div class="pnl-name-col">
            <span class="pnl-caret-empty"></span>
            <span class="pnl-name-text">${l.name}</span>
            ${l.code ? `<span class="pnl-code">${l.code}</span>` : ''}
          </div>
          ${getPnlAmtHtml(bal1, bal2)}
        </div>
      `;
    });

    return html;
  }

  // Helper to compile structured P&L Report Data for Export
  // Helper to compile structured P&L Report Data for Export
  function getPnLReportData() {
    const fromInp = document.getElementById('pnlDateFrom');
    const toInp   = document.getElementById('pnlDateTo');
    const dateFrom = fromInp ? fromInp.value : (_globalDateFrom || '');
    const dateTo   = toInp ? toInp.value : (_globalDateTo || '');

    const isCompare = document.getElementById('pnlCompareCheck')?.checked || false;
    const compFromInp = document.getElementById('pnlCompareDateFrom');
    const compToInp   = document.getElementById('pnlCompareDateTo');
    const compareDateFrom = (isCompare && compFromInp) ? compFromInp.value : '';
    const compareDateTo   = (isCompare && compToInp) ? compToInp.value : '';

    const ledgerBalances1 = computeTrialBalanceBalances(dateFrom, dateTo);
    let ledgerBalances2 = {};
    let prevPeriodFrom = compareDateFrom;
    let prevPeriodTo = compareDateTo;

    if (isCompare) {
      ledgerBalances2 = computeTrialBalanceBalances(compareDateFrom, compareDateTo);
    } else {
      const prevDates = getPreviousPeriodDates(dateFrom, dateTo);
      prevPeriodFrom = prevDates.prevFrom;
      prevPeriodTo = prevDates.prevTo;
      if (prevPeriodFrom || prevPeriodTo) {
        ledgerBalances2 = computeTrialBalanceBalances(prevPeriodFrom, prevPeriodTo);
      }
    }

    const co = (typeof getCompanyDetails === 'function') ? getCompanyDetails() : {};
    const companyName = co.name || 'KYA Accounting';

    const col1Title = formatRptDateRange(dateFrom, dateTo, 'Current Period');
    const col2Title = formatRptDateRange(prevPeriodFrom, prevPeriodTo, isCompare ? 'Comparison Period' : 'Previous Period');

    // ── Primary Calculations ──
    const rfoBal1 = getPnlNodeBalance('sg-rfo', 'sg', ledgerBalances1);
    const rfoBal2 = getPnlNodeBalance('sg-rfo', 'sg', ledgerBalances2);
    const oiBal1  = getPnlNodeBalance('sg-oi', 'sg', ledgerBalances1);
    const oiBal2  = getPnlNodeBalance('sg-oi', 'sg', ledgerBalances2);
    const totalRevenue1 = rfoBal1 + oiBal1;
    const totalRevenue2 = rfoBal2 + oiBal2;

    const cmcBal1 = getPnlNodeBalance('sg-cmc', 'sg', ledgerBalances1);
    const cmcBal2 = getPnlNodeBalance('sg-cmc', 'sg', ledgerBalances2);
    const pstBal1 = getPnlNodeBalance('sg-pst', 'sg', ledgerBalances1);
    const pstBal2 = getPnlNodeBalance('sg-pst', 'sg', ledgerBalances2);
    const cinvBal1 = getPnlNodeBalance('sg-cinv', 'sg', ledgerBalances1);
    const cinvBal2 = getPnlNodeBalance('sg-cinv', 'sg', ledgerBalances2);
    const ebeBal1 = getPnlNodeBalance('sg-ebe', 'sg', ledgerBalances1);
    const ebeBal2 = getPnlNodeBalance('sg-ebe', 'sg', ledgerBalances2);
    const fcBal1 = getPnlNodeBalance('sg-fc', 'sg', ledgerBalances1);
    const fcBal2 = getPnlNodeBalance('sg-fc', 'sg', ledgerBalances2);
    const daBal1 = getPnlNodeBalance('sg-da', 'sg', ledgerBalances1);
    const daBal2 = getPnlNodeBalance('sg-da', 'sg', ledgerBalances2);
    const oeBal1 = getPnlNodeBalance('sg-oe', 'sg', ledgerBalances1);
    const oeBal2 = getPnlNodeBalance('sg-oe', 'sg', ledgerBalances2);

    const stdExpSgIds = new Set(['sg-cmc', 'sg-pst', 'sg-cinv', 'sg-ebe', 'sg-fc', 'sg-da', 'sg-oe', 'sg-tax']);
    const customExpSgs = COA_SYS_SGS.filter(sg => sg.main === 'expense' && !stdExpSgIds.has(sg.id));

    let customExpTotal1 = 0;
    let customExpTotal2 = 0;
    const customExpRows = [];
    let customNoteCtr = 10;
    customExpSgs.forEach(sg => {
      const b1 = getPnlNodeBalance(sg.id, 'sg', ledgerBalances1);
      const b2 = getPnlNodeBalance(sg.id, 'sg', ledgerBalances2);
      customExpTotal1 += b1;
      customExpTotal2 += b2;
      customExpRows.push({
        id: sg.id,
        name: sg.name,
        noteNo: String(customNoteCtr++),
        amount1: b1,
        amount2: b2
      });
    });

    const totalExpenses1 = cmcBal1 + pstBal1 + cinvBal1 + ebeBal1 + fcBal1 + daBal1 + oeBal1 + customExpTotal1;
    const totalExpenses2 = cmcBal2 + pstBal2 + cinvBal2 + ebeBal2 + fcBal2 + daBal2 + oeBal2 + customExpTotal2;

    const pbeita1 = totalRevenue1 - totalExpenses1;
    const pbeita2 = totalRevenue2 - totalExpenses2;

    let exceptional1 = 0, exceptional2 = 0;
    let discont1 = 0, discont2 = 0;
    let discontTax1 = 0, discontTax2 = 0;

    coaLedgers.forEach(l => {
      const lName = (l.name || '').toLowerCase();
      if (lName.includes('exceptional')) {
        exceptional1 += getPnlNodeBalance(l.id, l.type, ledgerBalances1);
        exceptional2 += getPnlNodeBalance(l.id, l.type, ledgerBalances2);
      } else if (lName.includes('discontinued') && lName.includes('tax')) {
        discontTax1 += getPnlNodeBalance(l.id, l.type, ledgerBalances1);
        discontTax2 += getPnlNodeBalance(l.id, l.type, ledgerBalances2);
      } else if (lName.includes('discontinued')) {
        discont1 += getPnlNodeBalance(l.id, l.type, ledgerBalances1);
        discont2 += getPnlNodeBalance(l.id, l.type, ledgerBalances2);
      }
    });

    const pbt1 = pbeita1 - exceptional1;
    const pbt2 = pbeita2 - exceptional2;

    const taxLedgers = coaLedgers.filter(l => l.sgId === 'sg-tax');
    let currTaxBal1 = 0, currTaxBal2 = 0;
    let defTaxBal1 = 0, defTaxBal2 = 0;

    taxLedgers.forEach(l => {
      const lName = (l.name || '').toLowerCase();
      const b1 = getPnlNodeBalance(l.id, l.type, ledgerBalances1);
      const b2 = getPnlNodeBalance(l.id, l.type, ledgerBalances2);
      if (lName.includes('deferred')) {
        defTaxBal1 += b1;
        defTaxBal2 += b2;
      } else {
        currTaxBal1 += b1;
        currTaxBal2 += b2;
      }
    });
    const totalTaxBal1 = getPnlNodeBalance('sg-tax', 'sg', ledgerBalances1);
    const totalTaxBal2 = getPnlNodeBalance('sg-tax', 'sg', ledgerBalances2);
    if (currTaxBal1 === 0 && defTaxBal1 === 0 && totalTaxBal1 !== 0) currTaxBal1 = totalTaxBal1;
    if (currTaxBal2 === 0 && defTaxBal2 === 0 && totalTaxBal2 !== 0) currTaxBal2 = totalTaxBal2;

    const pcont1 = pbt1 - (currTaxBal1 + defTaxBal1);
    const pcont2 = pbt2 - (currTaxBal2 + defTaxBal2);

    const discontAfter1 = discont1 - discontTax1;
    const discontAfter2 = discont2 - discontTax2;

    const pat1 = pcont1 + discontAfter1;
    const pat2 = pcont2 + discontAfter2;

    const shareCapBal1 = getPnlShareCapitalBalance(dateTo);
    const shareCapBal2 = getPnlShareCapitalBalance(prevPeriodTo);
    const numShares1 = shareCapBal1 > 0 ? Math.round(shareCapBal1 / 10) : 0;
    const numShares2 = shareCapBal2 > 0 ? Math.round(shareCapBal2 / 10) : 0;

    const basicEps1 = numShares1 > 0 ? (pat1 / numShares1).toFixed(2) : '0.00';
    const basicEps2 = numShares2 > 0 ? (pat2 / numShares2).toFixed(2) : '0.00';
    const dilutedEps1 = basicEps1;
    const dilutedEps2 = basicEps2;

    // ── Build Schedule Rows ──
    const scheduleRows = [
      { particular: 'I. Revenue from operations', noteNo: '1', amount1: rfoBal1, amount2: rfoBal2, type: 'main' },
      { particular: 'II. Other income', noteNo: '2', amount1: oiBal1, amount2: oiBal2, type: 'main' },
      { particular: 'III. Total Revenue (I + II)', noteNo: '', amount1: totalRevenue1, amount2: totalRevenue2, type: 'subtotal-revenue' },
      { particular: 'IV. Expenses :', noteNo: '', amount1: null, amount2: null, type: 'sec-hdr' },
      { particular: 'Cost of materials consumed', noteNo: '3', amount1: cmcBal1, amount2: cmcBal2, type: 'sub' },
      { particular: 'Purchases of Stock-in-Trade', noteNo: '4', amount1: pstBal1, amount2: pstBal2, type: 'sub' },
      { particular: 'Changes in inventories of finished goods / Work-in-progress and Stock-In-Trade', noteNo: '5', amount1: cinvBal1, amount2: cinvBal2, type: 'sub' },
      { particular: 'Employee Benefits Expenses', noteNo: '6', amount1: ebeBal1, amount2: ebeBal2, type: 'sub' },
      { particular: 'Finance Costs', noteNo: '7', amount1: fcBal1, amount2: fcBal2, type: 'sub' },
      { particular: 'Depreciation and amortization expense', noteNo: '8', amount1: daBal1, amount2: daBal2, type: 'sub' },
      { particular: 'Other expenses', noteNo: '9', amount1: oeBal1, amount2: oeBal2, type: 'sub' }
    ];

    customExpRows.forEach(cer => {
      scheduleRows.push({ particular: cer.name, noteNo: cer.noteNo, amount1: cer.amount1, amount2: cer.amount2, type: 'sub' });
    });

    scheduleRows.push(
      { particular: 'Total expenses (IV)', noteNo: '', amount1: totalExpenses1, amount2: totalExpenses2, type: 'subtotal-expense' },
      { particular: 'V. Profit/(loss) before exceptional items and tax (I- IV)', noteNo: '', amount1: pbeita1, amount2: pbeita2, type: 'highlight' },
      { particular: 'VI. Exceptional Items', noteNo: '10', amount1: exceptional1, amount2: exceptional2, type: 'main' },
      { particular: 'VII. Profit/(loss) before tax (V-VI)', noteNo: '', amount1: pbt1, amount2: pbt2, type: 'highlight' },
      { particular: 'VIII. Tax expense:', noteNo: '', amount1: null, amount2: null, type: 'sec-hdr' },
      { particular: '(1) Current tax', noteNo: '11', amount1: currTaxBal1, amount2: currTaxBal2, type: 'sub' },
      { particular: '(2) Deferred tax', noteNo: '12', amount1: defTaxBal1, amount2: defTaxBal2, type: 'sub' },
      { particular: 'IX. Profit (Loss) for the period from continuing operations (VII-VIII)', noteNo: '', amount1: pcont1, amount2: pcont2, type: 'highlight' },
      { particular: 'X. Profit/(loss) from discontinued operations', noteNo: '13', amount1: discont1, amount2: discont2, type: 'main' },
      { particular: 'XI. Tax expense of discontinued operations', noteNo: '14', amount1: discontTax1, amount2: discontTax2, type: 'main' },
      { particular: 'XII. Profit/(loss) from Discontinued operations (after tax) (X-XI)', noteNo: '', amount1: discontAfter1, amount2: discontAfter2, type: 'highlight' },
      { particular: 'XIII. Profit/(loss) for the period (IX+XII)', noteNo: '', amount1: pat1, amount2: pat2, type: 'grandtotal' },
      { particular: 'XV. Earnings per equity share:', noteNo: '', amount1: null, amount2: null, type: 'sec-hdr' },
      { particular: 'Basic', noteNo: '15', amount1: basicEps1, amount2: basicEps2, type: 'eps', isEps: true },
      { particular: 'Diluted', noteNo: '15', amount1: dilutedEps1, amount2: dilutedEps2, type: 'eps', isEps: true }
    );

    // ── Build Notes Data ──
    function buildNoteForSubgroup(noteNo, title, sgId) {
      const sgBal1 = getPnlNodeBalance(sgId, 'sg', ledgerBalances1);
      const sgBal2 = getPnlNodeBalance(sgId, 'sg', ledgerBalances2);
      const items = [];

      const groupLdgs = coaLedgers.filter(l => l.sgId === sgId && l.type === 'group-ledger');
      groupLdgs.forEach(gl => {
        const glBal1 = getPnlNodeBalance(gl.id, 'group-ledger', ledgerBalances1);
        const glBal2 = getPnlNodeBalance(gl.id, 'group-ledger', ledgerBalances2);

        const children = [];
        const childLdgs = coaLedgers.filter(l => l.glId === gl.id && l.type === 'ledger');
        childLdgs.forEach(l => {
          const bal1 = getPnlNodeBalance(l.id, 'ledger', ledgerBalances1);
          const bal2 = getPnlNodeBalance(l.id, 'ledger', ledgerBalances2);
          children.push({ name: l.name, code: l.code || '', amount1: bal1, amount2: bal2 });
        });

        items.push({ name: gl.name, code: gl.code || '', isGroup: true, amount1: glBal1, amount2: glBal2, children });
      });

      const directLdgs = coaLedgers.filter(l => l.sgId === sgId && l.type === 'ledger' && !l.glId);
      directLdgs.forEach(l => {
        const bal1 = getPnlNodeBalance(l.id, 'ledger', ledgerBalances1);
        const bal2 = getPnlNodeBalance(l.id, 'ledger', ledgerBalances2);
        items.push({ name: l.name, code: l.code || '', isGroup: false, amount1: bal1, amount2: bal2 });
      });

      return { noteNo, title, total1: sgBal1, total2: sgBal2, items };
    }

    function buildTaxNote(noteNo, title, isDeferred) {
      const items = [];
      let total1 = 0, total2 = 0;
      taxLedgers.forEach(l => {
        const lName = (l.name || '').toLowerCase();
        const matches = isDeferred ? lName.includes('deferred') : !lName.includes('deferred');
        if (matches) {
          const bal1 = getPnlNodeBalance(l.id, l.type, ledgerBalances1);
          const bal2 = getPnlNodeBalance(l.id, l.type, ledgerBalances2);
          total1 += bal1;
          total2 += bal2;
          items.push({ name: l.name, code: l.code || '', isGroup: false, amount1: bal1, amount2: bal2 });
        }
      });
      if (items.length === 0) {
        const fallback1 = isDeferred ? defTaxBal1 : currTaxBal1;
        const fallback2 = isDeferred ? defTaxBal2 : currTaxBal2;
        if (fallback1 !== 0 || fallback2 !== 0) {
          total1 = fallback1;
          total2 = fallback2;
          items.push({ name: title, code: '', isGroup: false, amount1: fallback1, amount2: fallback2 });
        }
      }
      return { noteNo, title, total1, total2, items };
    }

    function buildCustomNote(noteNo, title, amt1, amt2, desc) {
      return {
        noteNo,
        title,
        total1: amt1,
        total2: amt2,
        items: [{ name: desc || title, code: '', isGroup: false, amount1: amt1, amount2: amt2 }]
      };
    }

    const notesData = [
      buildNoteForSubgroup('1', 'Revenue from Operations', 'sg-rfo'),
      buildNoteForSubgroup('2', 'Other Income', 'sg-oi'),
      buildNoteForSubgroup('3', 'Cost of Materials Consumed', 'sg-cmc'),
      buildNoteForSubgroup('4', 'Purchases of Stock-in-Trade', 'sg-pst'),
      buildNoteForSubgroup('5', 'Changes in Inventories of Finished Goods, Work-in-Progress and Stock-in-Trade', 'sg-cinv'),
      buildNoteForSubgroup('6', 'Employee Benefits Expense', 'sg-ebe'),
      buildNoteForSubgroup('7', 'Finance Costs', 'sg-fc'),
      buildNoteForSubgroup('8', 'Depreciation and Amortization Expense', 'sg-da'),
      buildNoteForSubgroup('9', 'Other Expenses', 'sg-oe')
    ];

    customExpRows.forEach(cer => {
      notesData.push(buildNoteForSubgroup(cer.noteNo, cer.name, cer.id));
    });

    notesData.push(
      buildCustomNote('10', 'Exceptional Items', exceptional1, exceptional2, 'Exceptional gains / (losses) during the period'),
      buildTaxNote('11', 'Current Tax', false),
      buildTaxNote('12', 'Deferred Tax', true),
      buildCustomNote('13', 'Discontinued Operations', discont1, discont2, 'Profit / (loss) from discontinued operations'),
      buildCustomNote('14', 'Tax Expense of Discontinued Operations', discontTax1, discontTax2, 'Tax on discontinued operations'),
      {
        noteNo: '15',
        title: 'Earnings Per Equity Share (EPS)',
        isEps: true,
        pat1,
        pat2,
        numShares1,
        numShares2,
        basicEps1,
        basicEps2,
        dilutedEps1,
        dilutedEps2,
        total1: basicEps1,
        total2: basicEps2,
        items: [
          { name: 'Profit/(loss) for the period after tax (₹)', code: '', isGroup: false, amount1: pat1, amount2: pat2, isCurrency: true },
          { name: 'Weighted average number of equity shares', code: '', isGroup: false, amount1: numShares1, amount2: numShares2, isCount: true },
          { name: 'Nominal value per equity share (₹)', code: '', isGroup: false, amount1: numShares1 > 0 ? 10.00 : 0.00, amount2: numShares2 > 0 ? 10.00 : 0.00, isNominalVal: true, isCurrency: true },
          { name: 'Basic Earnings Per Share (₹)', code: '', isGroup: false, amount1: Number(basicEps1), amount2: Number(basicEps2), isEpsVal: true, isHighlight: true },
          { name: 'Diluted Earnings Per Share (₹)', code: '', isGroup: false, amount1: Number(dilutedEps1), amount2: Number(dilutedEps2), isEpsVal: true, isHighlight: true }
        ]
      }
    );

    return {
      companyName,
      dateFrom,
      dateTo,
      isCompare,
      compareDateFrom,
      compareDateTo,
      prevPeriodFrom,
      prevPeriodTo,
      col1Title,
      col2Title,
      scheduleRows,
      notesData,
      totalRevenue1,
      totalRevenue2,
      totalExpenses1,
      totalExpenses2,
      pbt1,
      pbt2,
      taxBal1: currTaxBal1 + defTaxBal1,
      taxBal2: currTaxBal2 + defTaxBal2,
      pat1,
      pat2
    };
  }

  // Wire toolbar / 3-dot menu buttons for Profit & Loss
  const pnlSubmenu = document.getElementById('pnlExportSubmenu');
  const pnlSubmenuWrap = document.getElementById('pnlExportSubmenuWrap');
  let pnlCloseTimer = null;

  document.getElementById('pnlExportMenuBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (pnlSubmenu) pnlSubmenu.classList.toggle('open');
  });

  if (pnlSubmenuWrap && pnlSubmenu) {
    pnlSubmenuWrap.addEventListener('mouseenter', () => {
      if (pnlCloseTimer) clearTimeout(pnlCloseTimer);
      pnlSubmenu.classList.add('open');
    });
    pnlSubmenuWrap.addEventListener('mouseleave', () => {
      pnlCloseTimer = setTimeout(() => {
        pnlSubmenu.classList.remove('open');
      }, 300);
    });
    pnlSubmenu.addEventListener('mouseenter', () => {
      if (pnlCloseTimer) clearTimeout(pnlCloseTimer);
      pnlSubmenu.classList.add('open');
    });
  }

  document.getElementById('pnlExportPdf')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('pnlMoreDropdown')?.classList.remove('open');
    document.getElementById('pnlExportSubmenu')?.classList.remove('open');
    const pnlData = getPnLReportData();
    if (typeof window !== 'undefined' && typeof window.exportPnLToPDF === 'function') {
      window.exportPnLToPDF(pnlData);
    } else if (typeof exportPnLToPDF === 'function') {
      exportPnLToPDF(pnlData);
    } else {
      console.error('exportPnLToPDF function is not available.');
    }
  });

  document.getElementById('pnlExportExcel')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('pnlMoreDropdown')?.classList.remove('open');
    document.getElementById('pnlExportSubmenu')?.classList.remove('open');
    const pnlData = getPnLReportData();
    if (typeof window !== 'undefined' && typeof window.exportPnLToExcel === 'function') {
      window.exportPnLToExcel(pnlData);
    } else if (typeof exportPnLToExcel === 'function') {
      exportPnLToExcel(pnlData);
    } else {
      console.error('exportPnLToExcel function is not available.');
    }
  });

  document.getElementById('pnlExpandAll')?.addEventListener('click', () => {
    _pnlExpanded = new Set([
      ...COA_SYS_SGS.filter(sg => sg.main === 'income' || sg.main === 'expense').map(sg => 'sg-' + sg.id),
      ...coaLedgers.filter(l => l.type === 'group-ledger').map(gl => 'gl-' + gl.id)
    ]);
    _pnlExpanded.add('sg-sg-tax');
    document.getElementById('pnlMoreDropdown')?.classList.remove('open');
    renderPnlPanel();
  });

  document.getElementById('pnlCollapseAll')?.addEventListener('click', () => {
    _pnlExpanded = new Set();
    document.getElementById('pnlMoreDropdown')?.classList.remove('open');
    renderPnlPanel();
  });

  document.getElementById('pnlLayoutVertical')?.addEventListener('click', () => {
    _pnlLayoutMode = 'Vertical';
    renderPnlPanel();
  });

  document.getElementById('pnlLayoutHorizontal')?.addEventListener('click', () => {
    _pnlLayoutMode = 'Horizontal';
    renderPnlPanel();
  });

  document.getElementById('pnlLayoutSchedule')?.addEventListener('click', () => {
    _pnlLayoutMode = 'Schedule';
    renderPnlPanel();
  });

  document.getElementById('pnlLayoutNotes')?.addEventListener('click', () => {
    _pnlLayoutMode = 'Notes';
    renderPnlPanel();
  });

  ['pnlDateFrom', 'pnlDateTo', 'pnlCompareDateFrom', 'pnlCompareDateTo'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      renderPnlPanel();
    });
  });

  document.getElementById('pnlCompareCheck')?.addEventListener('change', (e) => {
    const wrap = document.getElementById('pnlCompareDateWrap');
    if (wrap) wrap.style.display = e.target.checked ? 'flex' : 'none';
    renderPnlPanel();
  });




  // ══════════════════════════════════════════════════════════════════
  //  TRIAL BALANCE MODULE
  // ══════════════════════════════════════════════════════════════════
  let _trialStyleDone = false;
  function injectTrialBalanceStyles() {
    if (_trialStyleDone) return;
    _trialStyleDone = true;
    const s = document.createElement('style');
    s.textContent = `
      .tb-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
      .tb-table th { background: var(--blue-50); color: var(--blue-900); font-weight: 800; font-size: 13px; text-transform: uppercase; padding: 12px 16px; border-bottom: 2px solid var(--blue-200); text-align: left; }
      .tb-table td { padding: 12px 16px; border-bottom: 1.5px solid var(--slate-100); font-size: 13.5px; color: var(--slate-700); }
      .tb-table tr:hover { background: var(--slate-50); }
      .tb-table .num-col { text-align: right; font-family: var(--font-main); font-weight: 600; min-width: 140px; }
      .tb-table .sl-col { width: 70px; color: var(--slate-400); font-weight: 600; font-size: 12px; }
      .tb-table .particulars-col { font-weight: 500; color: var(--slate-800); }
      
      .tb-total-row { background: var(--slate-50) !important; font-weight: 800; font-size: 14px; border-top: 1.5px solid var(--slate-300); border-bottom: 4px double var(--slate-800) !important; color: var(--slate-800); }
      .tb-total-row:hover { background: var(--slate-50) !important; }
      .tb-total-row td { border-bottom: 4px double var(--slate-800) !important; }
    `;
    document.head.appendChild(s);
  }

  function computeTrialBalanceBalances(dateFrom, dateTo) {
    const balances = {};
    const includeOpening = !dateFrom || (dateFrom <= '2024-04-01');

    coaLedgers.forEach(l => {
      if (l.type === 'ledger') {
        balances[l.id] = includeOpening ? parseAmt(l.openingBalance) : 0;
      }
    });

    postedEntries.forEach(entry => {
      if (dateFrom && entry.date < dateFrom) return;
      if (dateTo && entry.date > dateTo) return;

      (entry.allRows || []).forEach(row => {
        const particular = (row.particular || '').trim();
        if (!particular) return;
        let ldg = coaLedgers.find(l => l.type === 'ledger' && l.name.trim().toLowerCase() === particular.toLowerCase());
        if (!ldg) {
          const custs = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
          const supps = typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : [];
          const isCust = custs.some(c => (c.name || '').trim().toLowerCase() === particular.toLowerCase());
          const isSupp = supps.some(s => (s.name || '').trim().toLowerCase() === particular.toLowerCase());
          if (isCust) {
            ldg = coaLedgers.find(l => l.type === 'ledger' && (l.sgId === 'sg-tr' || l.name.trim().toLowerCase() === 'trade receivables'));
          } else if (isSupp) {
            ldg = coaLedgers.find(l => l.type === 'ledger' && (l.sgId === 'sg-tp' || l.name.trim().toLowerCase() === 'trade payables'));
          }
        }
        if (!ldg) return;

        const mainGroup = getLedgerMainGroup(ldg);
        const amtDr = parseAmt(row.debit);
        const amtCr = parseAmt(row.credit);

        if (mainGroup === 'assets' || mainGroup === 'expense') {
          balances[ldg.id] = (balances[ldg.id] || 0) + amtDr - amtCr;
        } else if (mainGroup === 'equity-liabilities' || mainGroup === 'income') {
          balances[ldg.id] = (balances[ldg.id] || 0) + amtCr - amtDr;
        }
      });
    });

    return balances;
  }

  function renderTrialBalancePanel() {
    injectTrialBalanceStyles();
    const wrap = document.getElementById('trialBalanceWrap');
    if (!wrap) return;

    const fromInp = document.getElementById('trialDateFrom');
    const toInp   = document.getElementById('trialDateTo');
    const dateFrom = fromInp ? fromInp.value : '';
    const dateTo   = toInp ? toInp.value : '';

    const balances = computeTrialBalanceBalances(dateFrom, dateTo);

    // Sync column checkboxes in dropdown
    ['gl', 'sg', 'mg', 'plbs'].forEach(col => {
      const chk = document.getElementById(`col-${col}-check`);
      if (chk) {
        chk.checked = _tbOptionalCols[col];
      }
    });

    let activeColsCount = 0;
    if (_tbOptionalCols.gl) activeColsCount++;
    if (_tbOptionalCols.sg) activeColsCount++;
    if (_tbOptionalCols.mg) activeColsCount++;
    if (_tbOptionalCols.plbs) activeColsCount++;

    let tableHtml = `
      <table class="tb-table">
        <thead>
          <tr>
            <th class="sl-col">Sl No</th>
            <th>Particulars</th>
    `;

    if (_tbOptionalCols.gl) tableHtml += `<th>Group Ledger</th>`;
    if (_tbOptionalCols.sg) tableHtml += `<th>Sub Group</th>`;
    if (_tbOptionalCols.mg) tableHtml += `<th>Main Group</th>`;
    if (_tbOptionalCols.plbs) tableHtml += `<th>PL/BS</th>`;

    tableHtml += `
            <th class="num-col">Dr Amount (₹)</th>
            <th class="num-col">Cr Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
    `;

    let slNo = 1;
    let totalDr = 0;
    let totalCr = 0;

    const ledgers = coaLedgers.filter(l => l.type === 'ledger');

    if (ledgers.length === 0) {
      const colspan = 4 + activeColsCount;
      tableHtml += `
        <tr>
          <td colspan="${colspan}" style="text-align:center;padding:48px;color:#94a3b8">
            No ledger accounts created yet. Go to <a href="#" onclick="openTab('chart');return false;" style="color:var(--blue-600);font-weight:600;">Chart of Accounts</a> to create ledgers.
          </td>
        </tr>
      `;
    } else {
      ledgers.forEach(l => {
        const main = getLedgerMainGroup(l);
        const netVal = balances[l.id] || 0;
        let drVal = 0;
        let crVal = 0;

        if (main === 'assets' || main === 'expense') {
          if (netVal >= 0) {
            drVal = netVal;
          } else {
            crVal = -netVal;
          }
        } else {
          if (netVal >= 0) {
            crVal = netVal;
          } else {
            drVal = -netVal;
          }
        }

        const showAllChk = document.getElementById('trialShowAllCheck');
        const showAll = showAllChk ? showAllChk.checked : false;
        if (!showAll && drVal === 0 && crVal === 0) {
          return;
        }

        totalDr += drVal;
        totalCr += crVal;

        const drText = drVal !== 0 ? `₹ ${fmtNum(drVal)}` : '—';
        const crText = crVal !== 0 ? `₹ ${fmtNum(crVal)}` : '—';

        // Resolve optional attributes
        let glText = '—';
        if (l.glId) {
          const parentGL = coaLedgers.find(parent => parent.type === 'group-ledger' && parent.id === l.glId);
          if (parentGL) {
            glText = parentGL.name;
          }
        }

        let sgText = '—';
        let mainGroupKey = '';
        if (l.sgId) {
          const sg = COA_SYS_SGS.find(s => s.id === l.sgId);
          if (sg) {
            sgText = sg.name;
            mainGroupKey = sg.main;
          }
        }

        let mgText = '—';
        if (mainGroupKey) {
          const mg = COA_MAIN_GROUPS.find(m => m.id === mainGroupKey);
          if (mg) {
            mgText = mg.name;
          }
        }

        let plbsText = '—';
        if (mainGroupKey === 'income' || mainGroupKey === 'expense') {
          plbsText = 'PL';
        } else if (mainGroupKey === 'assets' || mainGroupKey === 'equity-liabilities') {
          plbsText = 'BS';
        }

        tableHtml += `
          <tr>
            <td class="sl-col">${slNo++}</td>
            <td class="particulars-col">${l.name}${l.code ? `<span class="pnl-code">${l.code}</span>` : ''}</td>
        `;

        if (_tbOptionalCols.gl) tableHtml += `<td>${glText}</td>`;
        if (_tbOptionalCols.sg) tableHtml += `<td>${sgText}</td>`;
        if (_tbOptionalCols.mg) tableHtml += `<td>${mgText}</td>`;
        if (_tbOptionalCols.plbs) tableHtml += `<td>${plbsText}</td>`;

        tableHtml += `
            <td class="num-col">${drText}</td>
            <td class="num-col">${crText}</td>
          </tr>
        `;
      });
    }

    const totalColspan = 2 + activeColsCount;
    tableHtml += `
          <tr class="tb-total-row">
            <td colspan="${totalColspan}" style="font-weight: 700; text-align: left; padding-left: 28px;">Total</td>
            <td class="num-col">₹ ${fmtNum(totalDr)}</td>
            <td class="num-col">₹ ${fmtNum(totalCr)}</td>
          </tr>
        </tbody>
      </table>
    `;

    wrap.innerHTML = tableHtml;

    // Update status badge
    const badgeWrap = document.getElementById('trialStatusBadgeWrap');
    if (badgeWrap) {
      const isBalanced = Math.abs(totalDr - totalCr) < 0.01;
      if (isBalanced) {
        badgeWrap.innerHTML = `
          <span class="tb-badge tb-badge-success">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="flex-shrink:0;">
              <path d="M13.485 1.929a.75.75 0 0 1 .06 1.057l-7.25 8a.75.75 0 0 1-1.083.03l-3.25-3.5a.75.75 0 1 1 1.096-1.024l2.673 2.879 6.704-7.39a.75.75 0 0 1 1.05-.052z"/>
            </svg>
            Balanced
          </span>
        `;
      } else {
        const diff = Math.abs(totalDr - totalCr);
        badgeWrap.innerHTML = `
          <span class="tb-badge tb-badge-danger" title="Debit and Credit totals must match. Difference: ₹ ${fmtNum(diff)}">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="flex-shrink:0;">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0-1.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM8 4a.75.75 0 0 1 .75.75v5a.75.75 0 0 1-1.5 0v-5A.75.75 0 0 1 8 4zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
            </svg>
            Mismatched (Diff: ₹ ${fmtNum(diff)})
          </span>
        `;
      }
    }
  }

  // Shared Financial Reporting Helpers & Event Listeners
  function onDateFilterChange() {
    if (activeTabId === 'trial') renderTrialBalancePanel();
    if (activeTabId === 'pnl') renderPnlPanel();
    if (activeTabId === 'balance') renderBalanceSheetPanel();
  }

  function refreshAllReports() {
    if (typeof activeTabId !== 'undefined') {
      if (activeTabId === 'posted' && typeof renderPostedPanel === 'function') renderPostedPanel();
      if (activeTabId === 'drafted' && typeof renderDraftedPanel === 'function') renderDraftedPanel();
      if (activeTabId === 'balance' && typeof renderBalanceSheetPanel === 'function') renderBalanceSheetPanel();
      if (activeTabId === 'pnl' && typeof renderPnlPanel === 'function') renderPnlPanel();
      if (activeTabId === 'trial' && typeof renderTrialBalancePanel === 'function') renderTrialBalancePanel();
      if (activeTabId === 'voucher_desk' && typeof renderVoucherDeskPanel === 'function') renderVoucherDeskPanel();
      if (activeTabId === 'cashline') {
        if (typeof window.renderActiveSubtab === 'function') window.renderActiveSubtab();
        else if (typeof window.renderCashlinePanel === 'function') window.renderCashlinePanel();
      }
      if (activeTabId === 'chart') {
        if (typeof renderLedgerStatementView === 'function') renderLedgerStatementView();
        if (typeof renderCustomerStatementView === 'function') renderCustomerStatementView();
        if (typeof renderSupplierStatementView === 'function') renderSupplierStatementView();
        if (typeof renderLedgerListView === 'function') renderLedgerListView();
      }
      if (activeTabId === 'onehub' && typeof renderOhBudgetView === 'function') renderOhBudgetView();
      if ((activeTabId === 'sales_voucher' || activeTabId === 'sales_posted') && typeof renderSalesPostedPanel === 'function') {
        renderSalesPostedPanel();
      }
      if (activeTabId === 'sales_drafted' && typeof renderSalesDraftedPanel === 'function') {
        renderSalesDraftedPanel();
      }
    }
  }

  // Bind Date Input Events across all panels to keep them synchronized
  ['trialDateFrom', 'pnlDateFrom', 'bsDateFrom'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', (e) => {
      syncGlobalDates(e.target.value, _globalDateTo);
      onDateFilterChange();
    });
  });

  ['trialDateTo', 'pnlDateTo', 'bsDateTo'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', (e) => {
      syncGlobalDates(_globalDateFrom, e.target.value);
      onDateFilterChange();
    });
  });

  // Clear filters
  document.getElementById('trialClearFilters')?.addEventListener('click', () => {
    syncGlobalDates('', '');
    onDateFilterChange();
  });

  // Helper to compile structured Trial Balance Report Data for Export
  function getTrialBalanceReportData() {
    const fromInp = document.getElementById('trialDateFrom');
    const toInp   = document.getElementById('trialDateTo');
    const dateFrom = fromInp ? fromInp.value : '';
    const dateTo   = toInp ? toInp.value : '';

    const balances = computeTrialBalanceBalances(dateFrom, dateTo);

    const co = (typeof getCompanyDetails === 'function') ? getCompanyDetails() : {};
    const companyName = co.name || 'KYA Accounting';

    const showAllChk = document.getElementById('trialShowAllCheck');
    const showAll = showAllChk ? showAllChk.checked : false;

    const ledgers = coaLedgers.filter(l => l.type === 'ledger');
    const items = [];
    let slNo = 1;
    let totalDr = 0;
    let totalCr = 0;

    ledgers.forEach(l => {
      const main = getLedgerMainGroup(l);
      const netVal = balances[l.id] || 0;
      let drVal = 0;
      let crVal = 0;

      if (main === 'assets' || main === 'expense') {
        if (netVal >= 0) {
          drVal = netVal;
        } else {
          crVal = -netVal;
        }
      } else {
        if (netVal >= 0) {
          crVal = netVal;
        } else {
          drVal = -netVal;
        }
      }

      if (!showAll && drVal === 0 && crVal === 0) {
        return;
      }

      totalDr += drVal;
      totalCr += crVal;

      let glText = '';
      if (l.glId) {
        const parentGL = coaLedgers.find(parent => parent.type === 'group-ledger' && parent.id === l.glId);
        if (parentGL) {
          glText = parentGL.name;
        }
      }

      let sgText = '';
      let mainGroupKey = '';
      if (l.sgId) {
        const sg = COA_SYS_SGS.find(s => s.id === l.sgId);
        if (sg) {
          sgText = sg.name;
          mainGroupKey = sg.main;
        }
      }

      let mgText = '';
      if (mainGroupKey) {
        const mg = COA_MAIN_GROUPS.find(m => m.id === mainGroupKey);
        if (mg) {
          mgText = mg.name;
        }
      }

      let plbsText = '';
      if (mainGroupKey === 'income' || mainGroupKey === 'expense') {
        plbsText = 'PL';
      } else if (mainGroupKey === 'assets' || mainGroupKey === 'equity-liabilities') {
        plbsText = 'BS';
      }

      items.push({
        slNo: slNo++,
        name: l.name,
        code: l.code || '',
        gl: glText,
        sg: sgText,
        mg: mgText,
        plbs: plbsText,
        drVal,
        crVal
      });
    });

    return {
      companyName,
      dateFrom,
      dateTo,
      optionalCols: { ..._tbOptionalCols },
      items,
      totalDr,
      totalCr,
      isBalanced: Math.abs(totalDr - totalCr) < 0.01
    };
  }

  // Trial Balance 3-dot More Options Dropdown
  const trialMoreBtn = document.getElementById('trialMoreBtn');
  const trialMoreDropdown = document.getElementById('trialMoreDropdown');
  const trialExportSubmenu = document.getElementById('trialExportSubmenu');
  if (trialMoreBtn && trialMoreDropdown) {
    trialMoreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      trialMoreDropdown.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!trialMoreDropdown.contains(e.target) && e.target !== trialMoreBtn) {
        trialMoreDropdown.classList.remove('open');
        if (trialExportSubmenu) trialExportSubmenu.classList.remove('open');
      }
    });
  }

  const trialSubmenuWrap = document.getElementById('trialExportSubmenuWrap');
  let trialCloseTimer = null;

  document.getElementById('trialExportMenuBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (trialExportSubmenu) trialExportSubmenu.classList.toggle('open');
  });

  if (trialSubmenuWrap && trialExportSubmenu) {
    trialSubmenuWrap.addEventListener('mouseenter', () => {
      if (trialCloseTimer) clearTimeout(trialCloseTimer);
      trialExportSubmenu.classList.add('open');
    });
    trialSubmenuWrap.addEventListener('mouseleave', () => {
      trialCloseTimer = setTimeout(() => {
        trialExportSubmenu.classList.remove('open');
      }, 300);
    });
    trialExportSubmenu.addEventListener('mouseenter', () => {
      if (trialCloseTimer) clearTimeout(trialCloseTimer);
      trialExportSubmenu.classList.add('open');
    });
  }

  document.getElementById('trialExportPdf')?.addEventListener('click', (e) => {
    e.stopPropagation();
    trialMoreDropdown?.classList.remove('open');
    trialExportSubmenu?.classList.remove('open');
    const tbData = getTrialBalanceReportData();
    if (typeof window !== 'undefined' && typeof window.exportTrialBalanceToPDF === 'function') {
      window.exportTrialBalanceToPDF(tbData);
    } else if (typeof exportTrialBalanceToPDF === 'function') {
      exportTrialBalanceToPDF(tbData);
    } else {
      console.error('exportTrialBalanceToPDF function is not available.');
    }
  });

  document.getElementById('trialExportExcel')?.addEventListener('click', (e) => {
    e.stopPropagation();
    trialMoreDropdown?.classList.remove('open');
    trialExportSubmenu?.classList.remove('open');
    const tbData = getTrialBalanceReportData();
    if (typeof window !== 'undefined' && typeof window.exportTrialBalanceToExcel === 'function') {
      window.exportTrialBalanceToExcel(tbData);
    } else if (typeof exportTrialBalanceToExcel === 'function') {
      exportTrialBalanceToExcel(tbData);
    } else {
      console.error('exportTrialBalanceToExcel function is not available.');
    }
  });

  // Trial Balance Show All Event Listener
  document.getElementById('trialShowAllCheck')?.addEventListener('change', () => {
    renderTrialBalancePanel();
  });

  // Balance Sheet Hide Zero Balances Event Listener
  document.getElementById('bsHideZero')?.addEventListener('change', () => {
    renderBalanceSheetPanel();
  });

  // Trial Balance Dynamic Columns Dropdown & Event Listeners
  const trialColToggleBtn = document.getElementById('trialColToggleBtn');
  const trialColDropdown  = document.getElementById('trialColDropdown');
  if (trialColToggleBtn && trialColDropdown) {
    trialColToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      trialColDropdown.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!trialColDropdown.contains(e.target) && e.target !== trialColToggleBtn) {
        trialColDropdown.classList.remove('open');
      }
    });


    ['gl', 'sg', 'mg', 'plbs'].forEach(col => {
      const chk = document.getElementById(`col-${col}-check`);
      if (chk) {
        chk.addEventListener('change', (e) => {
          _tbOptionalCols[col] = e.target.checked;
          renderTrialBalancePanel();
        });
      }
    });
  }


  // Balance Sheet 3-dot More Options Dropdown
  const bsMoreBtn = document.getElementById('bsMoreBtn');
  const bsMoreDropdown = document.getElementById('bsMoreDropdown');
  const bsExportSubmenu = document.getElementById('bsExportSubmenu');
  if (bsMoreBtn && bsMoreDropdown) {
    bsMoreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      bsMoreDropdown.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!bsMoreDropdown.contains(e.target) && e.target !== bsMoreBtn) {
        bsMoreDropdown.classList.remove('open');
        if (bsExportSubmenu) bsExportSubmenu.classList.remove('open');
      }
    });
  }

  // Balance Sheet Comparison Mode Toggle & Date Listeners
  document.getElementById('bsCompareCheck')?.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    const wrap = document.getElementById('bsCompareDateWrap');
    if (wrap) wrap.style.display = isChecked ? 'flex' : 'none';
    if (isChecked) {
      const fromInp = document.getElementById('bsDateFrom');
      const toInp   = document.getElementById('bsDateTo');
      const compFromInp = document.getElementById('bsCompareDateFrom');
      const compToInp   = document.getElementById('bsCompareDateTo');
      if (compFromInp && !compFromInp.value) {
        if (fromInp && fromInp.value) {
          const p = fromInp.value.split('-');
          compFromInp.value = `${parseInt(p[0]) - 1}-${p[1]}-${p[2]}`;
        } else {
          compFromInp.value = '2023-04-01';
        }
      }
      if (compToInp && !compToInp.value) {
        if (toInp && toInp.value) {
          const p = toInp.value.split('-');
          compToInp.value = `${parseInt(p[0]) - 1}-${p[1]}-${p[2]}`;
        } else {
          compToInp.value = '2024-03-31';
        }
      }
    }
    renderBalanceSheetPanel();
  });

  ['bsCompareDateFrom', 'bsCompareDateTo'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      renderBalanceSheetPanel();
    });
  });

  // Profit & Loss 3-dot More Options Dropdown
  const pnlMoreBtn = document.getElementById('pnlMoreBtn');
  const pnlMoreDropdown = document.getElementById('pnlMoreDropdown');
  const pnlExportSubmenu = document.getElementById('pnlExportSubmenu');
  if (pnlMoreBtn && pnlMoreDropdown) {
    pnlMoreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      pnlMoreDropdown.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!pnlMoreDropdown.contains(e.target) && e.target !== pnlMoreBtn) {
        pnlMoreDropdown.classList.remove('open');
        if (pnlExportSubmenu) pnlExportSubmenu.classList.remove('open');
      }
    });
  }

  // Profit & Loss Comparison Mode Toggle & Date Listeners
  document.getElementById('pnlCompareCheck')?.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    const wrap = document.getElementById('pnlCompareDateWrap');
    if (wrap) wrap.style.display = isChecked ? 'flex' : 'none';
    if (isChecked) {
      const fromInp = document.getElementById('pnlDateFrom');
      const toInp   = document.getElementById('pnlDateTo');
      const compFromInp = document.getElementById('pnlCompareDateFrom');
      const compToInp   = document.getElementById('pnlCompareDateTo');
      if (compFromInp && !compFromInp.value) {
        if (fromInp && fromInp.value) {
          const p = fromInp.value.split('-');
          compFromInp.value = `${parseInt(p[0]) - 1}-${p[1]}-${p[2]}`;
        } else {
          compFromInp.value = '2023-04-01';
        }
      }
      if (compToInp && !compToInp.value) {
        if (toInp && toInp.value) {
          const p = toInp.value.split('-');
          compToInp.value = `${parseInt(p[0]) - 1}-${p[1]}-${p[2]}`;
        } else {
          compToInp.value = '2024-03-31';
        }
      }
    }
    renderPnlPanel();
  });

  ['pnlCompareDateFrom', 'pnlCompareDateTo'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      renderPnlPanel();
    });
  });

  // ── Narration keyboard shortcuts ──────────────────────────────────
  document.getElementById('jeNarration').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();         // don't add newline
      showSavePopup();
    } else if (e.key === 'Backspace' && this.value === '') {
      e.preventDefault();         // cursor back to last Amount field
      focusLastRowAmount();
    }
  });


