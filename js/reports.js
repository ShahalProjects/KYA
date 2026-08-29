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
  let _pnlLayoutMode = 'Vertical';

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

    const btnVert = document.getElementById('pnlLayoutVertical');
    const btnHoriz = document.getElementById('pnlLayoutHorizontal');
    if (btnVert && btnHoriz) {
      if (_pnlLayoutMode === 'Vertical') {
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
    if (_pnlLayoutMode === 'Horizontal') {
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
    const ledgerBalances2 = isCompare ? computeTrialBalanceBalances(compareDateFrom, compareDateTo) : {};

    const co = (typeof getCompanyDetails === 'function') ? getCompanyDetails() : {};
    const companyName = co.name || 'KYA Accounting';

    // 1. Income Data
    const incSubgroups = COA_SYS_SGS.filter(sg => sg.main === 'income');
    const incomeData = [];
    let totalRevenue1 = 0;
    let totalRevenue2 = 0;

    incSubgroups.forEach(sg => {
      const hasTx1 = subgroupHasTransactions(sg.id, dateFrom, dateTo, false);
      const hasTx2 = isCompare && subgroupHasTransactions(sg.id, compareDateFrom, compareDateTo, false);
      if (!hasTx1 && !hasTx2) return;

      const sgBal1 = getPnlNodeBalance(sg.id, 'sg', ledgerBalances1);
      const sgBal2 = isCompare ? getPnlNodeBalance(sg.id, 'sg', ledgerBalances2) : 0;
      totalRevenue1 += sgBal1;
      totalRevenue2 += sgBal2;

      const items = [];
      const groupLdgs = coaLedgers.filter(l => l.sgId === sg.id && l.type === 'group-ledger');
      groupLdgs.forEach(gl => {
        const hasGlTx1 = groupLedgerHasTransactions(gl.id, dateFrom, dateTo, false);
        const hasGlTx2 = isCompare && groupLedgerHasTransactions(gl.id, compareDateFrom, compareDateTo, false);
        if (!hasGlTx1 && !hasGlTx2) return;

        const glBal1 = getPnlNodeBalance(gl.id, 'group-ledger', ledgerBalances1);
        const glBal2 = isCompare ? getPnlNodeBalance(gl.id, 'group-ledger', ledgerBalances2) : 0;

        const children = [];
        const childLdgs = coaLedgers.filter(l => l.glId === gl.id && l.type === 'ledger');
        childLdgs.forEach(l => {
          const hasLTx1 = ledgerHasTransactions(l, dateFrom, dateTo, false);
          const hasLTx2 = isCompare && ledgerHasTransactions(l, compareDateFrom, compareDateTo, false);
          if (!hasLTx1 && !hasLTx2) return;

          const bal1 = getPnlNodeBalance(l.id, 'ledger', ledgerBalances1);
          const bal2 = isCompare ? getPnlNodeBalance(l.id, 'ledger', ledgerBalances2) : 0;
          children.push({ name: l.name, code: l.code || '', amount1: bal1, amount2: bal2 });
        });

        items.push({ name: gl.name, code: gl.code || '', isGroup: true, amount1: glBal1, amount2: glBal2, children });
      });

      const directLdgs = coaLedgers.filter(l => l.sgId === sg.id && l.type === 'ledger' && !l.glId);
      directLdgs.forEach(l => {
        const hasLTx1 = ledgerHasTransactions(l, dateFrom, dateTo, false);
        const hasLTx2 = isCompare && ledgerHasTransactions(l, compareDateFrom, compareDateTo, false);
        if (!hasLTx1 && !hasLTx2) return;

        const bal1 = getPnlNodeBalance(l.id, 'ledger', ledgerBalances1);
        const bal2 = isCompare ? getPnlNodeBalance(l.id, 'ledger', ledgerBalances2) : 0;
        items.push({ name: l.name, code: l.code || '', isGroup: false, amount1: bal1, amount2: bal2 });
      });

      incomeData.push({ id: sg.id, name: sg.name, amount1: sgBal1, amount2: sgBal2, items });
    });

    // 2. Expense Data
    const expSubgroups = COA_SYS_SGS.filter(sg => sg.main === 'expense' && sg.id !== 'sg-tax');
    const expenseData = [];
    let totalExpenses1 = 0;
    let totalExpenses2 = 0;

    expSubgroups.forEach(sg => {
      const hasTx1 = subgroupHasTransactions(sg.id, dateFrom, dateTo, false);
      const hasTx2 = isCompare && subgroupHasTransactions(sg.id, compareDateFrom, compareDateTo, false);
      if (!hasTx1 && !hasTx2) return;

      const sgBal1 = getPnlNodeBalance(sg.id, 'sg', ledgerBalances1);
      const sgBal2 = isCompare ? getPnlNodeBalance(sg.id, 'sg', ledgerBalances2) : 0;
      totalExpenses1 += sgBal1;
      totalExpenses2 += sgBal2;

      const items = [];
      const groupLdgs = coaLedgers.filter(l => l.sgId === sg.id && l.type === 'group-ledger');
      groupLdgs.forEach(gl => {
        const hasGlTx1 = groupLedgerHasTransactions(gl.id, dateFrom, dateTo, false);
        const hasGlTx2 = isCompare && groupLedgerHasTransactions(gl.id, compareDateFrom, compareDateTo, false);
        if (!hasGlTx1 && !hasGlTx2) return;

        const glBal1 = getPnlNodeBalance(gl.id, 'group-ledger', ledgerBalances1);
        const glBal2 = isCompare ? getPnlNodeBalance(gl.id, 'group-ledger', ledgerBalances2) : 0;

        const children = [];
        const childLdgs = coaLedgers.filter(l => l.glId === gl.id && l.type === 'ledger');
        childLdgs.forEach(l => {
          const hasLTx1 = ledgerHasTransactions(l, dateFrom, dateTo, false);
          const hasLTx2 = isCompare && ledgerHasTransactions(l, compareDateFrom, compareDateTo, false);
          if (!hasLTx1 && !hasLTx2) return;

          const bal1 = getPnlNodeBalance(l.id, 'ledger', ledgerBalances1);
          const bal2 = isCompare ? getPnlNodeBalance(l.id, 'ledger', ledgerBalances2) : 0;
          children.push({ name: l.name, code: l.code || '', amount1: bal1, amount2: bal2 });
        });

        items.push({ name: gl.name, code: gl.code || '', isGroup: true, amount1: glBal1, amount2: glBal2, children });
      });

      const directLdgs = coaLedgers.filter(l => l.sgId === sg.id && l.type === 'ledger' && !l.glId);
      directLdgs.forEach(l => {
        const hasLTx1 = ledgerHasTransactions(l, dateFrom, dateTo, false);
        const hasLTx2 = isCompare && ledgerHasTransactions(l, compareDateFrom, compareDateTo, false);
        if (!hasLTx1 && !hasLTx2) return;

        const bal1 = getPnlNodeBalance(l.id, 'ledger', ledgerBalances1);
        const bal2 = isCompare ? getPnlNodeBalance(l.id, 'ledger', ledgerBalances2) : 0;
        items.push({ name: l.name, code: l.code || '', isGroup: false, amount1: bal1, amount2: bal2 });
      });

      expenseData.push({ id: sg.id, name: sg.name, amount1: sgBal1, amount2: sgBal2, items });
    });

    const pbt1 = totalRevenue1 - totalExpenses1;
    const pbt2 = totalRevenue2 - totalExpenses2;

    const taxBal1 = getPnlNodeBalance('sg-tax', 'sg', ledgerBalances1);
    const taxBal2 = isCompare ? getPnlNodeBalance('sg-tax', 'sg', ledgerBalances2) : 0;

    const pat1 = pbt1 - taxBal1;
    const pat2 = pbt2 - taxBal2;

    return {
      companyName,
      dateFrom,
      dateTo,
      isCompare,
      compareDateFrom,
      compareDateTo,
      incomeData,
      totalRevenue1,
      totalRevenue2,
      expenseData,
      totalExpenses1,
      totalExpenses2,
      pbt1,
      pbt2,
      taxBal1,
      taxBal2,
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


