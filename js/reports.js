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
    const sg = COA_SYS_SGS.find(s => s.id === ledger.sgId);
    if (!sg) return null;
    return sg.main;
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
        if (l.glId === nodeId && l.type === 'ledger') {
          sum += getNodeBalance(l.id, 'ledger', ledgerBalances, profitAmount, openingDiffAmount, priorProfit);
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
        if (l.sgId === nodeId && l.type === 'group-ledger') {
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

    if (_bsExpanded.size === 0) {
      _bsExpanded.add('mg-assets');
      _bsExpanded.add('mg-equity-liabilities');
      COA_SYS_SGS.forEach(sg => {
        _bsExpanded.add('sg-' + sg.id);
      });
    }

    // 1. Posted Journal Entries -> Trial Balance (for filtered period)
    const pnlBalances = computeTrialBalanceBalances(dateFrom, dateTo);

    // 2. Profit & Loss Account generated from filtered Trial Balance
    const profitAmt = calculatePnlProfitFromTrialBalances(pnlBalances);

    // 3. Balance Sheet uses the closing balances from the Trial Balance as of To Date
    const ledgerBalances = computeTrialBalanceBalances('', dateTo);

    // Cumulative profit & prior profit
    const cumulativeProfit = calculatePnlProfitFromTrialBalances(ledgerBalances);
    const priorProfit = cumulativeProfit - profitAmt;

    // Opening Difference computed from Trial Balance balances
    const openingDiff = calculateOpeningDifferenceFromTrial(ledgerBalances);

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

      const mgBal = getNodeBalance(mg.id, 'mg', ledgerBalances, profitAmt, openingDiff, priorProfit);
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
            <div class="bs-amt-col">₹ ${fmtNum(mgBal)}</div>
          </div>
          <div id="bsBody-mg-${mg.id}" style="${isMgOpen ? '' : 'display:none'} ${(_bsLayoutMode === 'Horizontal' && isMgOpen) ? '; display: flex; flex-direction: column; flex-grow: 1;' : ''}">
      `;

      const l1Sgs = COA_SYS_SGS.filter(s => s.main === mg.id && s.parent === null);
      l1Sgs.forEach(l1Sg => {
        const l1Bal = getNodeBalance(l1Sg.id, 'sg', ledgerBalances, profitAmt, openingDiff, priorProfit);
        const isL1Open = _bsExpanded.has('sg-' + l1Sg.id);
        const hasChildrenSg = COA_SYS_SGS.some(s => s.parent === l1Sg.id);

        treeHtml += `
          <div class="bs-row bs-row-l1 bs-indent-l1" data-bs-toggle="sg-${l1Sg.id}">
            <div class="bs-name-col">
              <svg class="bs-caret${isL1Open ? ' open' : ''}" width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="bs-name-text">${l1Sg.name}</span>
            </div>
            <div class="bs-amt-col">₹ ${fmtNum(l1Bal)}</div>
          </div>
          <div id="bsBody-sg-${l1Sg.id}" style="${isL1Open ? '' : 'display:none'}">
        `;

        if (hasChildrenSg) {
          const l2Sgs = COA_SYS_SGS.filter(s => s.parent === l1Sg.id);
          l2Sgs.forEach(l2Sg => {
            const l2Bal = getNodeBalance(l2Sg.id, 'sg', ledgerBalances, profitAmt, openingDiff, priorProfit);
            const isL2Open = _bsExpanded.has('sg-' + l2Sg.id);

            treeHtml += `
              <div class="bs-row bs-row-l2 bs-indent-l2" data-bs-toggle="sg-${l2Sg.id}">
                <div class="bs-name-col">
                  <svg class="bs-caret${isL2Open ? ' open' : ''}" width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span class="bs-name-text">${l2Sg.name}</span>
                </div>
                <div class="bs-amt-col">₹ ${fmtNum(l2Bal)}</div>
              </div>
              <div id="bsBody-sg-${l2Sg.id}" style="${isL2Open ? '' : 'display:none'}">
            `;

            treeHtml += renderSubgroupLeafs(l2Sg.id, ledgerBalances, profitAmt, openingDiff, 'bs-indent-l3', 'bs-indent-l4', priorProfit);

            treeHtml += `</div>`;
          });
        } else {
          treeHtml += renderSubgroupLeafs(l1Sg.id, ledgerBalances, profitAmt, openingDiff, 'bs-indent-l2', 'bs-indent-l3', priorProfit);
        }

        treeHtml += `</div>`;
      });

      treeHtml += `
            <div class="bs-row bs-grandtotal bs-indent-l0" style="${_bsLayoutMode === 'Horizontal' ? 'margin-top: auto;' : ''}">
              <span style="text-transform: uppercase;">Total ${mg.name}</span>
              <div class="bs-amt-col">₹ ${fmtNum(mgBal)}</div>
            </div>
          </div>
        </div>
      `;
    });

    treeHtml += '</div>';
    wrap.innerHTML = treeHtml;

    // Validation Status Badge
    const badgeWrap = document.getElementById('bsStatusBadgeWrap');
    if (badgeWrap) {
      const totAssets = getNodeBalance('assets', 'mg', ledgerBalances, profitAmt, openingDiff, priorProfit);
      const totLiab   = getNodeBalance('equity-liabilities', 'mg', ledgerBalances, profitAmt, openingDiff, priorProfit);
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

  function renderSubgroupLeafs(sgId, ledgerBalances, profitAmt, openingDiff, indentClassL3, indentClassL4, priorProfit = 0) {
    let html = '';
    const hideZero = document.getElementById('bsHideZero')?.checked || false;

    if (sgId === 'sg-rs') {
      if (!hideZero || profitAmt !== 0) {
        html += `
          <div class="bs-row bs-row-l4 ${indentClassL3}">
            <div class="bs-name-col">
              <span class="bs-caret-empty"></span>
              <span class="bs-name-text">Profit & Loss A/c (Current Year)</span>
            </div>
            <div class="bs-amt-col">₹ ${fmtNum(profitAmt)}</div>
          </div>
        `;
      }
      if (!hideZero || priorProfit !== 0) {
        html += `
          <div class="bs-row bs-row-l4 ${indentClassL3}">
            <div class="bs-name-col">
              <span class="bs-caret-empty"></span>
              <span class="bs-name-text">Retained Earnings (Prior to filter)</span>
            </div>
            <div class="bs-amt-col">₹ ${fmtNum(priorProfit)}</div>
          </div>
        `;
      }
      if (!hideZero || openingDiff !== 0) {
        html += `
          <div class="bs-row bs-row-l4 ${indentClassL3}">
            <div class="bs-name-col">
              <span class="bs-caret-empty"></span>
              <span class="bs-name-text">Difference in Opening Balances</span>
            </div>
            <div class="bs-amt-col">₹ ${fmtNum(openingDiff)}</div>
          </div>
        `;
      }
    }

    const groupLdgs = coaLedgers.filter(l => l.sgId === sgId && l.type === 'group-ledger');
    groupLdgs.forEach(gl => {
      const sg = COA_SYS_SGS.find(s => s.id === gl.sgId);
      if (!sg || (sg.main !== 'assets' && sg.main !== 'equity-liabilities')) return;

      const glBal = getNodeBalance(gl.id, 'group-ledger', ledgerBalances, profitAmt, openingDiff, priorProfit);
      if (hideZero && glBal === 0) return;

      const isGlOpen = _bsExpanded.has('gl-' + gl.id);

      let childHtml = '';
      const childLdgs = coaLedgers.filter(l => l.glId === gl.id && l.type === 'ledger');
      childLdgs.forEach(l => {
        const lSg = COA_SYS_SGS.find(s => s.id === l.sgId);
        if (!lSg || (lSg.main !== 'assets' && lSg.main !== 'equity-liabilities')) return;

        const bal = getNodeBalance(l.id, 'ledger', ledgerBalances, profitAmt, openingDiff, priorProfit);
        if (hideZero && bal === 0) return;

        childHtml += `
          <div class="bs-row bs-row-l4 ${indentClassL4}">
            <div class="bs-name-col">
              <span class="bs-caret-empty"></span>
              <span class="bs-name-text">${l.name}</span>
              ${l.code ? `<span class="bs-code">${l.code}</span>` : ''}
            </div>
            <div class="bs-amt-col">₹ ${fmtNum(bal)}</div>
          </div>
        `;
      });

      if (hideZero && glBal === 0 && childHtml === '') return;

      html += `
        <div class="bs-row bs-row-l3 ${indentClassL3}" data-bs-toggle="gl-${gl.id}">
          <div class="bs-name-col">
            <svg class="bs-caret${isGlOpen ? ' open' : ''}" width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="bs-name-text">📁 ${gl.name}</span>
            ${gl.code ? `<span class="bs-code">${gl.code}</span>` : ''}
          </div>
          <div class="bs-amt-col">₹ ${fmtNum(glBal)}</div>
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

      const bal = getNodeBalance(l.id, 'ledger', ledgerBalances, profitAmt, openingDiff, priorProfit);
      if (hideZero && bal === 0) return;

      html += `
        <div class="bs-row bs-row-l4 ${indentClassL3}">
          <div class="bs-name-col">
            <span class="bs-caret-empty"></span>
            <span class="bs-name-text">${l.name}</span>
            ${l.code ? `<span class="bs-code">${l.code}</span>` : ''}
          </div>
          <div class="bs-amt-col">₹ ${fmtNum(bal)}</div>
        </div>
      `;
    });

    return html;
  }

  // Wire toolbar buttons for Balance Sheet
  document.getElementById('bsExpandAll')?.addEventListener('click', () => {
    _bsExpanded = new Set([
      'mg-assets', 'mg-equity-liabilities',
      ...COA_SYS_SGS.map(sg => 'sg-' + sg.id),
      ...coaLedgers.filter(l => l.type === 'group-ledger').map(gl => 'gl-' + gl.id)
    ]);
    renderBalanceSheetPanel();
  });

  document.getElementById('bsCollapseAll')?.addEventListener('click', () => {
    _bsExpanded = new Set();
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
        if (l.glId === nodeId && l.type === 'ledger') {
          sum += getPnlNodeBalance(l.id, 'ledger', ledgerBalances);
        }
      });
      return sum;
    }

    if (nodeType === 'sg') {
      let sum = 0;
      coaLedgers.forEach(l => {
        if (l.sgId === nodeId && l.type === 'group-ledger') {
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

    if (_pnlExpanded.size === 0) {
      COA_SYS_SGS.forEach(sg => {
        if (sg.main === 'income' || sg.main === 'expense') {
          _pnlExpanded.add('sg-' + sg.id);
        }
      });
    }

    const ledgerBalances = computeTrialBalanceBalances(dateFrom, dateTo);

    const rfoBal = getPnlNodeBalance('sg-rfo', 'sg', ledgerBalances);
    const oiBal  = getPnlNodeBalance('sg-oi', 'sg', ledgerBalances);
    const totalRevenue = rfoBal + oiBal;

    const expSubgroups = COA_SYS_SGS.filter(sg => sg.main === 'expense' && sg.id !== 'sg-tax');
    let totalExpenses = 0;
    expSubgroups.forEach(sg => {
      totalExpenses += getPnlNodeBalance(sg.id, 'sg', ledgerBalances);
    });

    const pbt = totalRevenue - totalExpenses;
    const taxBal = getPnlNodeBalance('sg-tax', 'sg', ledgerBalances);
    const pat = pbt - taxBal;

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
            <span>Amount (₹)</span>
          </div>
          <div style="display: flex; flex-direction: column; flex-grow: 1;">
      `;

      expSubgroups.forEach(sg => {
        const sgBal = getPnlNodeBalance(sg.id, 'sg', ledgerBalances);
        const isSgOpen = _pnlExpanded.has('sg-' + sg.id);
        leftHtml += `
          <div class="pnl-row pnl-row-l1 pnl-indent-l1" data-pnl-toggle="sg-${sg.id}">
            <div class="pnl-name-col">
              <svg class="pnl-caret${isSgOpen ? ' open' : ''}" width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="pnl-name-text">${sg.name}</span>
            </div>
            <div class="pnl-amt-col">₹ ${fmtNum(sgBal)}</div>
          </div>
          <div id="pnlBody-sg-${sg.id}" style="${isSgOpen ? '' : 'display:none'}">
            ${renderPnlSubgroupLeafs(sg.id, ledgerBalances, 'pnl-indent-l2', 'pnl-indent-l3')}
          </div>
        `;
      });

      const taxSg = COA_SYS_SGS.find(sg => sg.id === 'sg-tax');
      if (taxSg) {
        const isTaxOpen = _pnlExpanded.has('sg-sg-tax');
        leftHtml += `
          <div class="pnl-row pnl-row-l1 pnl-indent-l1" data-pnl-toggle="sg-sg-tax">
            <div class="pnl-name-col">
              <svg class="pnl-caret${isTaxOpen ? ' open' : ''}" width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="pnl-name-text">Tax Expense</span>
            </div>
            <div class="pnl-amt-col">₹ ${fmtNum(taxBal)}</div>
          </div>
          <div id="pnlBody-sg-sg-tax" style="${isTaxOpen ? '' : 'display:none'}">
            ${renderPnlSubgroupLeafs('sg-tax', ledgerBalances, 'pnl-indent-l2', 'pnl-indent-l3')}
          </div>
        `;
      }

      if (pat > 0) {
        leftHtml += `
          <div class="pnl-row pnl-row-l1 pnl-indent-l1" style="background: #f0fdf4; color: #16a34a; font-weight: 700; cursor: default;">
            <div class="pnl-name-col">
              <span class="pnl-caret-empty"></span>
              <span class="pnl-name-text">Profit After Tax (PAT)</span>
            </div>
            <div class="pnl-amt-col">₹ ${fmtNum(pat)}</div>
          </div>
        `;
      }

      const leftTotal = totalExpenses + taxBal + (pat > 0 ? pat : 0);
      leftHtml += `
            <div class="pnl-row pnl-total-row pnl-indent-hdr" style="margin-top: auto;">
              <span>Total Expenses &amp; Profit</span>
              <div class="pnl-amt-col">₹ ${fmtNum(leftTotal)}</div>
            </div>
          </div>
        </div>
      `;

      // 2. Right Card: Revenue & Loss
      let rightHtml = `
        <div class="pnl-card" style="display: flex; flex-direction: column; height: 100%; margin-bottom: 0;">
          <div class="pnl-row pnl-row-hdr pnl-indent-hdr">
            <span>I. Revenue &amp; Income</span>
            <span>Amount (₹)</span>
          </div>
          <div style="display: flex; flex-direction: column; flex-grow: 1;">
      `;

      const incSubgroups = COA_SYS_SGS.filter(sg => sg.main === 'income');
      incSubgroups.forEach(sg => {
        const sgBal = getPnlNodeBalance(sg.id, 'sg', ledgerBalances);
        const isSgOpen = _pnlExpanded.has('sg-' + sg.id);
        rightHtml += `
          <div class="pnl-row pnl-row-l1 pnl-indent-l1" data-pnl-toggle="sg-${sg.id}">
            <div class="pnl-name-col">
              <svg class="pnl-caret${isSgOpen ? ' open' : ''}" width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="pnl-name-text">${sg.name}</span>
            </div>
            <div class="pnl-amt-col">₹ ${fmtNum(sgBal)}</div>
          </div>
          <div id="pnlBody-sg-${sg.id}" style="${isSgOpen ? '' : 'display:none'}">
            ${renderPnlSubgroupLeafs(sg.id, ledgerBalances, 'pnl-indent-l2', 'pnl-indent-l3')}
          </div>
        `;
      });

      if (pat < 0) {
        rightHtml += `
          <div class="pnl-row pnl-row-l1 pnl-indent-l1" style="background: #fef2f2; color: #dc2626; font-weight: 700; cursor: default;">
            <div class="pnl-name-col">
              <span class="pnl-caret-empty"></span>
              <span class="pnl-name-text">Loss After Tax</span>
            </div>
            <div class="pnl-amt-col">₹ ${fmtNum(Math.abs(pat))}</div>
          </div>
        `;
      }

      const rightTotal = totalRevenue + (pat < 0 ? Math.abs(pat) : 0);
      rightHtml += `
            <div class="pnl-row pnl-total-row pnl-indent-hdr" style="margin-top: auto;">
              <span>Total Revenue &amp; Loss</span>
              <div class="pnl-amt-col">₹ ${fmtNum(rightTotal)}</div>
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
            <span>Amount (₹)</span>
          </div>
      `;
      const incSubgroups = COA_SYS_SGS.filter(sg => sg.main === 'income');
      incSubgroups.forEach(sg => {
        const sgBal = getPnlNodeBalance(sg.id, 'sg', ledgerBalances);
        const isSgOpen = _pnlExpanded.has('sg-' + sg.id);

        treeHtml += `
          <div class="pnl-row pnl-row-l1 pnl-indent-l1" data-pnl-toggle="sg-${sg.id}">
            <div class="pnl-name-col">
              <svg class="pnl-caret${isSgOpen ? ' open' : ''}" width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="pnl-name-text">${sg.name}</span>
            </div>
            <div class="pnl-amt-col">₹ ${fmtNum(sgBal)}</div>
          </div>
          <div id="pnlBody-sg-${sg.id}" style="${isSgOpen ? '' : 'display:none'}">
            ${renderPnlSubgroupLeafs(sg.id, ledgerBalances, 'pnl-indent-l2', 'pnl-indent-l3')}
          </div>
        `;
      });

      treeHtml += `
          <div class="pnl-row pnl-total-row pnl-indent-hdr">
            <span>Total Revenue (I)</span>
            <div class="pnl-amt-col">₹ ${fmtNum(totalRevenue)}</div>
          </div>
        </div>
      `;

      treeHtml += `
        <div class="pnl-card">
          <div class="pnl-row pnl-row-hdr pnl-indent-hdr">
            <span>II. Expenses</span>
            <span>Amount (₹)</span>
          </div>
      `;
      expSubgroups.forEach(sg => {
        const sgBal = getPnlNodeBalance(sg.id, 'sg', ledgerBalances);
        const isSgOpen = _pnlExpanded.has('sg-' + sg.id);

        treeHtml += `
          <div class="pnl-row pnl-row-l1 pnl-indent-l1" data-pnl-toggle="sg-${sg.id}">
            <div class="pnl-name-col">
              <svg class="pnl-caret${isSgOpen ? ' open' : ''}" width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="pnl-name-text">${sg.name}</span>
            </div>
            <div class="pnl-amt-col">₹ ${fmtNum(sgBal)}</div>
          </div>
          <div id="pnlBody-sg-${sg.id}" style="${isSgOpen ? '' : 'display:none'}">
            ${renderPnlSubgroupLeafs(sg.id, ledgerBalances, 'pnl-indent-l2', 'pnl-indent-l3')}
          </div>
        `;
      });

      treeHtml += `
          <div class="pnl-row pnl-total-row pnl-indent-hdr">
            <span>Total Expenses (II)</span>
            <div class="pnl-amt-col">₹ ${fmtNum(totalExpenses)}</div>
          </div>
        </div>
      `;

      treeHtml += `
        <div class="pnl-card">
          <div class="pnl-row pnl-row-hdr pnl-indent-hdr">
            <span>III. Profitability</span>
            <span>Amount (₹)</span>
          </div>
          
          <div class="pnl-row pnl-total-row pnl-indent-l1">
            <div class="pnl-name-col">
              <span class="pnl-caret-empty"></span>
              <span class="pnl-name-text" style="font-weight:700;">Profit Before Tax (PBT) (I - II)</span>
            </div>
            <div class="pnl-amt-col">₹ ${fmtNum(pbt)}</div>
          </div>
      `;

      const taxSg = COA_SYS_SGS.find(sg => sg.id === 'sg-tax');
      if (taxSg) {
        const isTaxOpen = _pnlExpanded.has('sg-sg-tax');
        treeHtml += `
          <div class="pnl-row pnl-row-l1 pnl-indent-l1" data-pnl-toggle="sg-sg-tax">
            <div class="pnl-name-col">
              <svg class="pnl-caret${isTaxOpen ? ' open' : ''}" width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span class="pnl-name-text">Less: Tax Expense</span>
            </div>
            <div class="pnl-amt-col">₹ ${fmtNum(taxBal)}</div>
          </div>
          <div id="pnlBody-sg-sg-tax" style="${isTaxOpen ? '' : 'display:none'}">
            ${renderPnlSubgroupLeafs('sg-tax', ledgerBalances, 'pnl-indent-l2', 'pnl-indent-l3')}
          </div>
        `;
      }

      treeHtml += `
          <div class="pnl-row pnl-grandtotal pnl-indent-hdr">
            <span>Profit After Tax (PAT)</span>
            <div class="pnl-amt-col">₹ ${fmtNum(pat)}</div>
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

  function renderPnlSubgroupLeafs(sgId, ledgerBalances, indentClassL2, indentClassL3) {
    let html = '';

    const groupLdgs = coaLedgers.filter(l => l.sgId === sgId && l.type === 'group-ledger');
    groupLdgs.forEach(gl => {
      const glBal = getPnlNodeBalance(gl.id, 'group-ledger', ledgerBalances);
      if (glBal === 0) return;

      const isGlOpen = _pnlExpanded.has('gl-' + gl.id);

      html += `
        <div class="pnl-row pnl-row-l2 ${indentClassL2}" data-pnl-toggle="gl-${gl.id}">
          <div class="pnl-name-col">
            <svg class="pnl-caret${isGlOpen ? ' open' : ''}" width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span class="pnl-name-text">📁 ${gl.name}</span>
            ${gl.code ? `<span class="pnl-code">${gl.code}</span>` : ''}
          </div>
          <div class="pnl-amt-col">₹ ${fmtNum(glBal)}</div>
        </div>
        <div id="pnlBody-gl-${gl.id}" style="${isGlOpen ? '' : 'display:none'}">
      `;

      const childLdgs = coaLedgers.filter(l => l.glId === gl.id && l.type === 'ledger');
      childLdgs.forEach(l => {
        const bal = getPnlNodeBalance(l.id, 'ledger', ledgerBalances);
        if (bal === 0) return;

        html += `
          <div class="pnl-row pnl-row-l3 ${indentClassL3}">
            <div class="pnl-name-col">
              <span class="pnl-caret-empty"></span>
              <span class="pnl-name-text">${l.name}</span>
              ${l.code ? `<span class="pnl-code">${l.code}</span>` : ''}
            </div>
            <div class="pnl-amt-col">₹ ${fmtNum(bal)}</div>
          </div>
        `;
      });

      html += `</div>`;
    });

    const directLdgs = coaLedgers.filter(l => l.sgId === sgId && l.type === 'ledger' && !l.glId);
    directLdgs.forEach(l => {
      const bal = getPnlNodeBalance(l.id, 'ledger', ledgerBalances);
      if (bal === 0) return;

      html += `
        <div class="pnl-row pnl-row-l3 ${indentClassL2}">
          <div class="pnl-name-col">
            <span class="pnl-caret-empty"></span>
            <span class="pnl-name-text">${l.name}</span>
            ${l.code ? `<span class="pnl-code">${l.code}</span>` : ''}
          </div>
          <div class="pnl-amt-col">₹ ${fmtNum(bal)}</div>
        </div>
      `;
    });

    return html;
  }

  // Wire toolbar buttons for Profit & Loss
  document.getElementById('pnlExpandAll')?.addEventListener('click', () => {
    _pnlExpanded = new Set([
      ...COA_SYS_SGS.filter(sg => sg.main === 'income' || sg.main === 'expense').map(sg => 'sg-' + sg.id),
      ...coaLedgers.filter(l => l.type === 'group-ledger').map(gl => 'gl-' + gl.id)
    ]);
    _pnlExpanded.add('sg-sg-tax');
    renderPnlPanel();
  });

  document.getElementById('pnlCollapseAll')?.addEventListener('click', () => {
    _pnlExpanded = new Set();
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
      .tb-table .sl-col { width: 60px; color: var(--slate-400); font-weight: 600; font-size: 12px; }
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
        const particular = row.particular.trim();
        const ldg = coaLedgers.find(l => l.type === 'ledger' && l.name.trim() === particular);
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
            <th class="sl-col">#</th>
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
    if (activeTabId === 'posted') renderPostedPanel();
    if (activeTabId === 'balance') renderBalanceSheetPanel();
    if (activeTabId === 'pnl') renderPnlPanel();
    if (activeTabId === 'trial') renderTrialBalancePanel();
    if (activeTabId === 'voucher_desk') renderVoucherDeskPanel();
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


