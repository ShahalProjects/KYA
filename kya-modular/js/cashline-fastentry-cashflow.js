  // ══════════════════════════════════════════════════════════════════
  //  CASHLINE FAST ENTRY & CASHFLOW — Quick entry modal, cashflow view
  //  (Split from cashline.js for maintainability)
  // ══════════════════════════════════════════════════════════════════

  function showFastEntryModal(type, targetLedger) {
    // Select all ledgers except CCE to act as counterparty
    const oppOpts = coaLedgers.filter(l => l.type === 'ledger' && l.sgId !== 'sg-cce')
      .map(l => `<option value="${l.id}">${ohEsc(l.name)} (${getLedgerGroup(l.id)})</option>`)
      .join('');

    document.getElementById('clFastModalOverlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'clFastModalOverlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 10006;
      background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(5px);
      display: flex; align-items: center; justify-content: center;
      font-family: var(--font-main), Inter, sans-serif;
    `;

    overlay.innerHTML = `
      <div style="background: #fff; border-radius: 20px; padding: 28px; width: 92%; max-width: 420px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); position: relative; box-sizing: border-box;">
        <button id="clFastModalClose" style="position: absolute; top: 18px; right: 18px; border: none; background: none; font-size: 22px; color: var(--slate-400); cursor: pointer;">×</button>
        
        <h3 style="margin: 0 0 4px 0; font-size: 17px; font-weight: 800; color: var(--slate-900);">Record Cash ${type}</h3>
        <p style="margin: 0 0 20px 0; font-size: 12.5px; color: var(--slate-400);">Select the account and enter amount. Balanced journal entries will be generated.</p>
        
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div class="cl-form-group">
            <label>Date</label>
            <input type="date" id="clFDate" class="je-input" value="${new Date().toISOString().split('T')[0]}" style="height: 38px;" />
          </div>
          
          <div class="cl-form-group">
            <label>Amount (₹) *</label>
            <input type="number" step="0.01" min="0" id="clFAmount" class="je-input" placeholder="0.00" style="height: 38px;" />
          </div>
          
          <div class="cl-form-group">
            <label>Account (Particulars) *</label>
            <select id="clFOppLedgerId" class="je-input" style="height: 38px; cursor: pointer; background: #fff;">
              ${oppOpts}
            </select>
          </div>
          
          <div class="cl-form-group">
            <label>Narration / Description</label>
            <input type="text" id="clFNarration" class="je-input" placeholder="e.g. Cash received from customer" style="height: 38px;" />
          </div>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 24px; justify-content: flex-end;">
          <button class="btn btn-secondary" id="clFastModalCancel" style="padding: 10px 18px;">Cancel</button>
          <button class="btn btn-primary" id="clFastModalSave" style="padding: 10px 18px;">Save Entry</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('#clFastModalClose').addEventListener('click', close);
    overlay.querySelector('#clFastModalCancel').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    // Save direct cash entry
    overlay.querySelector('#clFastModalSave').addEventListener('click', () => {
      const date = overlay.querySelector('#clFDate').value;
      const amt = parseFloat(overlay.querySelector('#clFAmount').value) || 0;
      const oppId = Number(overlay.querySelector('#clFOppLedgerId').value);
      const narr = overlay.querySelector('#clFNarration').value.trim();

      if (amt <= 0) {
        showToast('Please enter a valid amount.', 'warning');
        return;
      }

      const oppLedger = coaLedgers.find(l => l.id === oppId);
      if (!oppLedger) return;

      const voucherNo = genVoucherNo();
      jvCounter++; // Increment globally exported voucher number count

      const newEntry = {
        id: Date.now(),
        date,
        voucherNo,
        narration: narr ? `${narr} [Cashbook]` : `Cashbook ${type}`,
        type: 'Journal',
        amount: amt.toFixed(2),
        preparedBy: '',
        departmentId: '',
        isBudget: false,
        allRows: []
      };

      if (type === 'Receipt') {
        // Cash Receipt: Cash increases (Dr Cash), Counterparty decreases/revenue increases (Cr OppLedger)
        // Debit: Cash (By TargetLedger), Credit: Counterparty (To OppLedger)
        newEntry.allRows.push(
          { id: 1, type: 'By', particular: targetLedger.name, debit: amt.toFixed(2), credit: '' },
          { id: 2, type: 'To', particular: oppLedger.name, debit: '', credit: amt.toFixed(2) }
        );
      } else {
        // Cash Payment: Counterparty increases/expense increases (Dr OppLedger), Cash decreases (Cr TargetLedger)
        // Debit: Counterparty (By OppLedger), Credit: Cash (To TargetLedger)
        newEntry.allRows.push(
          { id: 1, type: 'By', particular: oppLedger.name, debit: amt.toFixed(2), credit: '' },
          { id: 2, type: 'To', particular: targetLedger.name, debit: '', credit: amt.toFixed(2) }
        );
      }

      postedEntries.push(newEntry);
      showToast(`Entry saved successfully. Voucher: ${voucherNo}`, 'success');
      
      close();
      renderActiveSubtab();
      refreshAllReports();
      triggerAutoBackup();
    });
  }


  // ===================================================================
  //  4. CASHFLOW STATEMENT VIEW
  // ===================================================================
  function renderCashflowView(target) {
    const fromVal = _clCashflowDateFrom;
    const toVal = _clCashflowDateTo;

    // Helper to calculate subgroup changes
    function getSubgroupBalDiff(sgId) {
      let totalChange = 0;
      const ledgers = coaLedgers.filter(l => l.type === 'ledger' && l.sgId === sgId);
      
      ledgers.forEach(l => {
        const preBal = calculateLedgerBalances(l, '2024-04-01', fromVal ? getDayBefore(fromVal) : '');
        const currentBal = calculateLedgerBalances(l, '2024-04-01', toVal);
        
        // Net change in closing balances
        const diff = currentBal.closingBalance - preBal.closingBalance;
        totalChange += diff;
      });
      return totalChange;
    }

    function getDayBefore(dateStr) {
      const d = new Date(dateStr);
      d.setDate(d.getDate() - 1);
      return d.toISOString().split('T')[0];
    }

    // ── 1. OPERATING ACTIVITIES ──
    const netProfit = calculatePnlProfitForPeriod(fromVal, toVal);
    
    // Non-Cash adjustments
    const depreciation = getSubgroupBalDiff('sg-da'); // Depreciation (Dr balance increase is positive change)
    const financeCosts = getSubgroupBalDiff('sg-fc'); // Finance costs (interest)
    
    const operatingProfitBeforeWC = netProfit + depreciation + financeCosts;

    // Working Capital adjustments
    const inventoriesChange = getSubgroupBalDiff('sg-inv');     // Increase in Asset = Outflow (-)
    const receivablesChange = getSubgroupBalDiff('sg-tr');       // Increase in Asset = Outflow (-)
    const stLoansAdvancesChange = getSubgroupBalDiff('sg-stla'); // Increase in Asset = Outflow (-)
    const otherCurrentAssetsChange = getSubgroupBalDiff('sg-oca'); // Increase in Asset = Outflow (-)

    const payablesChange = getSubgroupBalDiff('sg-tp');         // Increase in Liability = Inflow (+)
    const otherCurrentLiabilitiesChange = getSubgroupBalDiff('sg-ocl'); // Increase in Liability = Inflow (+)
    const shortTermProvisionsChange = getSubgroupBalDiff('sg-stp'); // Increase in Liability = Inflow (+)

    const wcChangesOutflow = -inventoriesChange - receivablesChange - stLoansAdvancesChange - otherCurrentAssetsChange;
    const wcChangesInflow = payablesChange + otherCurrentLiabilitiesChange + shortTermProvisionsChange;
    
    const cashGeneratedFromOperations = operatingProfitBeforeWC + wcChangesOutflow + wcChangesInflow;

    const taxesPaid = getSubgroupBalDiff('sg-tax'); // Tax Expense
    const netOperatingCash = cashGeneratedFromOperations - taxesPaid;

    // ── 2. INVESTING ACTIVITIES ──
    const ppeChange = getSubgroupBalDiff('sg-ppe');
    const cwipChange = getSubgroupBalDiff('sg-cwip');
    const iaChange = getSubgroupBalDiff('sg-ia');
    const iaudChange = getSubgroupBalDiff('sg-iaud');
    const nciChange = getSubgroupBalDiff('sg-nci');

    // Increase in long-term assets / investments = Outflow (-)
    const netInvestingCash = -ppeChange - cwipChange - iaChange - iaudChange - nciChange;

    // ── 3. FINANCING ACTIVITIES ──
    const shareCapitalChange = getSubgroupBalDiff('sg-sc');  // Increase in Equity = Inflow (+)
    const ltBorrowingsChange = getSubgroupBalDiff('sg-ltb');  // Increase in Loan = Inflow (+)
    const stBorrowingsChange = getSubgroupBalDiff('sg-stb');  // Increase in Loan = Inflow (+)
    const reservesSurplusChange = getSubgroupBalDiff('sg-rs'); // reserves changes (excluding Profit/Loss additions)
    
    const interestPaid = getSubgroupBalDiff('sg-fc'); // Interest Expense

    const netFinancingCash = shareCapitalChange + ltBorrowingsChange + stBorrowingsChange + reservesSurplusChange - interestPaid;

    // ── RECONCILIATION OF CASH AND CASH EQUIVALENTS ──
    const netIncrease = netOperatingCash + netInvestingCash + netFinancingCash;

    // Beginning and Ending Cash balances
    let beginningCash = 0;
    let endingCash = 0;

    const cashLedgers = coaLedgers.filter(l => l.type === 'ledger' && l.sgId === 'sg-cce');
    cashLedgers.forEach(l => {
      const preData = calculateLedgerBalances(l, '2024-04-01', fromVal ? getDayBefore(fromVal) : '');
      const postData = calculateLedgerBalances(l, '2024-04-01', toVal);
      beginningCash += preData.closingBalance;
      endingCash += postData.closingBalance;
    });

    const cashReconDiff = endingCash - (beginningCash + netIncrease);

    target.innerHTML = `
      <div style="display: flex; gap: 12px; align-items: flex-end; margin-bottom: 20px; border-bottom: 1.5px solid var(--slate-100); padding-bottom: 14px;">
        <div class="cl-form-group" style="margin-bottom: 0;">
          <label style="font-size: 11px; font-weight: 700; color: var(--slate-400); text-transform: uppercase;">From Date</label>
          <input type="date" id="clCfFromDate" class="je-input" value="${fromVal}" style="height: 34px; font-size: 13px; padding: 0 8px; border-radius: 6px; width: 130px; margin-top: 4px;" />
        </div>
        <div class="cl-form-group" style="margin-bottom: 0;">
          <label style="font-size: 11px; font-weight: 700; color: var(--slate-400); text-transform: uppercase;">To Date</label>
          <input type="date" id="clCfToDate" class="je-input" value="${toVal}" style="height: 34px; font-size: 13px; padding: 0 8px; border-radius: 6px; width: 130px; margin-top: 4px;" />
        </div>
      </div>

      <div style="border: 1.5px solid var(--slate-200); border-radius: 16px; overflow: hidden; background: #fff; box-shadow: var(--shadow-sm);">
        <table class="cl-table">
          <thead>
            <tr>
              <th>Cash Flow Particulars</th>
              <th style="text-align: right; width: 220px;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <!-- Operating Activities -->
            <tr class="cashflow-cat-hdr">
              <td colspan="2">A. Cash Flow from Operating Activities</td>
            </tr>
            <tr>
              <td class="cashflow-subcat-hdr">Net Profit Before Tax & Extraordinary Items</td>
              <td class="num-val">${fmtAmt(netProfit)}</td>
            </tr>
            <tr>
              <td class="cashflow-line-item">Adjustment: Add back Depreciation & Amortization</td>
              <td class="num-val">${fmtAmt(depreciation)}</td>
            </tr>
            <tr>
              <td class="cashflow-line-item">Adjustment: Add back Interest Expense (Finance Costs)</td>
              <td class="num-val">${fmtAmt(financeCosts)}</td>
            </tr>
            <tr style="font-weight:600; color:var(--slate-800);">
              <td class="cashflow-subcat-hdr">Operating Profit before Working Capital Changes</td>
              <td class="num-val">${fmtAmt(operatingProfitBeforeWC)}</td>
            </tr>
            <tr>
              <td class="cashflow-line-item">Decrease / (Increase) in Inventories</td>
              <td class="num-val">${fmtAmt(-inventoriesChange)}</td>
            </tr>
            <tr>
              <td class="cashflow-line-item">Decrease / (Increase) in Trade Receivables</td>
              <td class="num-val">${fmtAmt(-receivablesChange)}</td>
            </tr>
            <tr>
              <td class="cashflow-line-item">Decrease / (Increase) in Supplier Advances & Current Assets</td>
              <td class="num-val">${fmtAmt(-stLoansAdvancesChange - otherCurrentAssetsChange)}</td>
            </tr>
            <tr>
              <td class="cashflow-line-item">Increase / (Decrease) in Trade Payables</td>
              <td class="num-val">${fmtAmt(payablesChange)}</td>
            </tr>
            <tr>
              <td class="cashflow-line-item">Increase / (Decrease) in Outstanding liabilities & Current Liabilities</td>
              <td class="num-val">${fmtAmt(otherCurrentLiabilitiesChange + shortTermProvisionsChange)}</td>
            </tr>
            <tr>
              <td class="cashflow-line-item">Less: Taxes Paid directly</td>
              <td class="num-val">${fmtAmt(-taxesPaid)}</td>
            </tr>
            <tr class="cashflow-total-row">
              <td>Net Cash Generated from Operating Activities (A)</td>
              <td class="num-val">${fmtAmt(netOperatingCash)}</td>
            </tr>

            <!-- Investing Activities -->
            <tr class="cashflow-cat-hdr">
              <td colspan="2">B. Cash Flow from Investing Activities</td>
            </tr>
            <tr>
              <td class="cashflow-subcat-hdr">Purchase / Sale of Property, Plant & Equipment (PPE)</td>
              <td class="num-val">${fmtAmt(-ppeChange - cwipChange)}</td>
            </tr>
            <tr>
              <td class="cashflow-subcat-hdr">Purchase / Sale of Intangible Assets</td>
              <td class="num-val">${fmtAmt(-iaChange - iaudChange)}</td>
            </tr>
            <tr>
              <td class="cashflow-subcat-hdr">Purchase / Sale of Non-Current Investments</td>
              <td class="num-val">${fmtAmt(-nciChange)}</td>
            </tr>
            <tr class="cashflow-total-row">
              <td>Net Cash used in Investing Activities (B)</td>
              <td class="num-val">${fmtAmt(netInvestingCash)}</td>
            </tr>

            <!-- Financing Activities -->
            <tr class="cashflow-cat-hdr">
              <td colspan="2">C. Cash Flow from Financing Activities</td>
            </tr>
            <tr>
              <td class="cashflow-subcat-hdr">Proceeds from Issue of Share Capital</td>
              <td class="num-val">${fmtAmt(shareCapitalChange)}</td>
            </tr>
            <tr>
              <td class="cashflow-subcat-hdr">Proceeds / (Repayments) of Long-Term Bank Loans</td>
              <td class="num-val">${fmtAmt(ltBorrowingsChange)}</td>
            </tr>
            <tr>
              <td class="cashflow-subcat-hdr">Proceeds / (Repayments) of Short-Term Borrowings</td>
              <td class="num-val">${fmtAmt(stBorrowingsChange)}</td>
            </tr>
            <tr>
              <td class="cashflow-subcat-hdr">Less: Interest Paid on Loans</td>
              <td class="num-val">${fmtAmt(-interestPaid)}</td>
            </tr>
            <tr class="cashflow-total-row">
              <td>Net Cash generated from Financing Activities (C)</td>
              <td class="num-val">${fmtAmt(netFinancingCash)}</td>
            </tr>

            <!-- Summary Reconciliation -->
            <tr class="cashflow-cat-hdr">
              <td colspan="2">Net Summary Reconciliation</td>
            </tr>
            <tr style="font-weight: 700; color: var(--slate-800);">
              <td>Net Increase / (Decrease) in Cash and Cash Equivalents (A + B + C)</td>
              <td class="num-val">${fmtAmt(netIncrease)}</td>
            </tr>
            <tr>
              <td class="cashflow-subcat-hdr">Add: Cash and Cash Equivalents at the Beginning of the Period</td>
              <td class="num-val">${fmtAmt(beginningCash)}</td>
            </tr>
            <tr class="cashflow-grand-row">
              <td>Cash and Cash Equivalents at the End of the Period</td>
              <td class="num-val">${fmtAmt(endingCash)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      ${Math.abs(cashReconDiff) > 0.05 
        ? `<div style="margin-top:16px; padding: 12px; background: #fffbeb; border:1px solid #fde68a; border-radius: 8px; color: #b45309; font-size:12.5px; font-weight: 600; text-align: center;">
            ⚠ Warning: Cashflow reconciliation discrepancy of ${fmtAmt(cashReconDiff)}. Check for entries directly matching cash against cash.
           </div>` 
        : `<div style="margin-top:16px; padding: 12px; background: #ecfdf5; border:1px solid #a7f3d0; border-radius: 8px; color: #065f46; font-size:12.5px; font-weight: 700; text-align: center; display:flex; align-items:center; justify-content:center; gap:6px;">
            <svg viewBox="0 0 20 20" fill="none" width="16" height="16" style="color: #059669;">
              <path d="M7 10l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Reconciles Perfectly: Net Change + Opening Balance = Ending Balance!
           </div>`
      }
    `;

    // Wire actions
    document.getElementById('clCfFromDate').addEventListener('change', (e) => {
      _clCashflowDateFrom = e.target.value;
      syncGlobalDates(_clCashflowDateFrom, _clCashflowDateTo);
      renderActiveSubtab();
    });

    document.getElementById('clCfToDate').addEventListener('change', (e) => {
      _clCashflowDateTo = e.target.value;
      syncGlobalDates(_clCashflowDateFrom, _clCashflowDateTo);
      renderActiveSubtab();
    });
  }

