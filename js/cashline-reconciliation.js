  // ══════════════════════════════════════════════════════════════════
  //  CASHLINE RECONCILIATION — Unreconciled sums, reconciliation view, adjustments
  //  (Split from cashline.js for maintainability)
  // ══════════════════════════════════════════════════════════════════

  function getUnreconciledSum(ledgerId) {
    const ledger = coaLedgers.find(l => l.id === ledgerId);
    if (!ledger) return 0;
    
    let sum = 0;
    
    return sum;
  }


  // ===================================================================
  //  2. BANK RECONCILIATION VIEW
  // ===================================================================
  function renderReconciliationView(target, controls, actionsArea) {
    return renderCashbookView(target, controls, actionsArea);
  }
  window.renderReconciliationView = renderReconciliationView;

  // ── Toggle Reconciled State ───────────────────────────────────────
  window.clToggleReconcile = function(key, checked) {
    if (checked) {
      const today = new Date().toISOString().split('T')[0];
      window.KYA_STORE.reconciliationState[key] = today;
    } else {
      delete window.KYA_STORE.reconciliationState[key];
    }
    renderActiveSubtab();
    triggerAutoBackup();
  };

  window.clSetReconFilter = function(filter) {
    _clReconFilter = filter;
    renderActiveSubtab();
  };

  // ── Modal for Bank Adjustments (Charges / Interest) ───────────────
  function showAdjustmentModal(type, bankLedger) {
    if (!bankLedger) return;
    
    // Suggest default counterparty ledgers
    let defaultOppLedgerName = type === 'Charges' ? 'Bank Charges' : 'Interest Income';
    let defaultOppLedger = coaLedgers.find(l => l.name === defaultOppLedgerName);

    // Build select options
    const oppOpts = coaLedgers.filter(l => l.type === 'ledger' && l.name !== bankLedger.name)
      .map(l => `<option value="${l.id}" ${defaultOppLedger && defaultOppLedger.id === l.id ? 'selected' : ''}>${ohEsc(l.name)}</option>`)
      .join('');

    document.getElementById('clAdjModalOverlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'clAdjModalOverlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 10006;
      background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(5px);
      display: flex; align-items: center; justify-content: center;
      font-family: var(--font-main), Inter, sans-serif;
    `;

    overlay.innerHTML = `
      <div style="background: #fff; border-radius: 20px; padding: 28px; width: 92%; max-width: 420px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); position: relative; box-sizing: border-box;">
        <button id="clAdjModalClose" style="position: absolute; top: 18px; right: 18px; border: none; background: none; font-size: 22px; color: var(--slate-400); cursor: pointer;">×</button>
        
        <h3 style="margin: 0 0 4px 0; font-size: 17px; font-weight: 800; color: var(--slate-900);">Record Bank ${type}</h3>
        <p style="margin: 0 0 20px 0; font-size: 12.5px; color: var(--slate-400);">This will automatically post a balanced journal entry in your ledger.</p>
        
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div class="cl-form-group">
            <label>Date</label>
            <input type="date" id="clADate" class="je-input" value="${new Date().toISOString().split('T')[0]}" style="height: 38px;" />
          </div>
          
          <div class="cl-form-group">
            <label>Amount (₹) *</label>
            <input type="number" step="0.01" min="0" id="clAAmount" class="je-input" placeholder="0.00" style="height: 38px;" />
          </div>
          
          <div class="cl-form-group">
            <label>Counterparty Account *</label>
            <select id="clAOppLedgerId" class="je-input" style="height: 38px; cursor: pointer; background: #fff;">
              ${oppOpts}
            </select>
          </div>
          
          <div class="cl-form-group">
            <label>Narration / Note</label>
            <input type="text" id="clANarration" class="je-input" placeholder="e.g. Bank processing fee" value="${type === 'Charges' ? 'Bank charges debited' : 'Interest credited by bank'}" style="height: 38px;" />
          </div>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 24px; justify-content: flex-end;">
          <button class="btn btn-secondary" id="clAdjModalCancel" style="padding: 10px 18px;">Cancel</button>
          <button class="btn btn-primary" id="clAdjModalSave" style="padding: 10px 18px;">Post Entry</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('#clAdjModalClose').addEventListener('click', close);
    overlay.querySelector('#clAdjModalCancel').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    // Save adjustment JV
    overlay.querySelector('#clAdjModalSave').addEventListener('click', () => {
      const date = overlay.querySelector('#clADate').value;
      const amt = parseFloat(overlay.querySelector('#clAAmount').value) || 0;
      const oppId = Number(overlay.querySelector('#clAOppLedgerId').value);
      const narr = overlay.querySelector('#clANarration').value.trim();

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
        narration: narr + ' [Adjusted]',
        type: 'Journal',
        amount: amt.toFixed(2),
        preparedBy: '',
        departmentId: '',
        isBudget: false,
        allRows: []
      };

      if (type === 'Charges') {
        // Bank charges debited (Bank decreases, Charges increases)
        // Debit: Charges (By OppLedger), Credit: Bank (To BankLedger)
        newEntry.allRows.push(
          { id: 1, type: 'By', particular: oppLedger.name, debit: amt.toFixed(2), credit: '' },
          { id: 2, type: 'To', particular: bankLedger.name, debit: '', credit: amt.toFixed(2) }
        );
      } else {
        // Interest credited (Bank increases, Interest increases)
        // Debit: Bank (By BankLedger), Credit: Interest (To OppLedger)
        newEntry.allRows.push(
          { id: 1, type: 'By', particular: bankLedger.name, debit: amt.toFixed(2), credit: '' },
          { id: 2, type: 'To', particular: oppLedger.name, debit: '', credit: amt.toFixed(2) }
        );
      }

      postedEntries.push(newEntry);
      showToast(`Adjustment posted: Voucher "${voucherNo}"`, 'success');
      
      close();
      renderActiveSubtab();
      refreshAllReports();
      triggerAutoBackup();
    });
  }
  window.showAdjustmentModal = showAdjustmentModal;


  // ===================================================================
  //  3. CASHBOOK (CASH RECEIPTS & PAYMENTS) VIEW
  // ===================================================================
