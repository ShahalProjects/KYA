  // ══════════════════════════════════════════════════════════════════
  //  CASHLINE CASHBOOK — Cash receipts & payments view
  //  (Split from cashline.js for maintainability)
  // ══════════════════════════════════════════════════════════════════

  function renderCashbookView(target, controls, actionsArea) {
    const isBankingMode = _clActiveTopTab === 'banking';

    function formatToDDMMYYYY(dateStr) {
      if (!dateStr) return '';
      const parts = String(dateStr).trim().split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return String(dateStr).trim();
      }
      return String(dateStr).trim();
    }

    if (isBankingMode) {
      const bankAccounts = window.KYA_STORE.bankAccounts || [];
      if (bankAccounts.length === 0) {
        if (actionsArea) actionsArea.innerHTML = '';
        if (controls) controls.innerHTML = '';
        target.innerHTML = `
          <div style="margin-bottom: 16px;">
            <button class="btn btn-secondary" id="clInlineTabBackNoAcc" style="height:34px; font-size:12.5px; padding: 0 14px; font-weight:600; cursor:pointer; border-radius:6px; display:inline-flex; align-items:center; gap:6px;">
              ← Back
            </button>
          </div>
          <div style="padding: 48px; text-align: center; border: 1.5px dashed var(--slate-200); border-radius: 16px; background: var(--slate-50);">
            <div style="font-size: 32px; margin-bottom: 12px;">🏛️</div>
            <div style="font-size: 14.5px; font-weight: 700; color: var(--slate-700);">No Bank Accounts defined</div>
            <div style="font-size: 12.5px; color: var(--slate-400); margin-top: 4px; margin-bottom: 16px;">Please create a Bank account first.</div>
            <button class="btn btn-primary" id="clBtnBackToAccounts" style="height:36px; font-size:13px; padding: 0 16px; font-weight:600; cursor:pointer; border-radius:8px; display:inline-flex; align-items:center; gap:6px;">
              ← Back to Accounts
            </button>
          </div>
        `;
        const handleGoBack = () => {
          if (typeof window.clSwitchBankingTabGlobal === 'function') {
            window.clSwitchBankingTabGlobal('details');
          }
        };
        document.getElementById('clInlineTabBackNoAcc')?.addEventListener('click', handleGoBack);
        document.getElementById('clBtnBackToAccounts')?.addEventListener('click', handleGoBack);
        return;
      }

      if (!_clReconBankId && bankAccounts.length > 0) {
        _clReconBankId = bankAccounts[0].id;
      }

      const currentAcc = bankAccounts.find(x => x.id === Number(_clReconBankId)) || bankAccounts[0];
      const selectedLedger = coaLedgers.find(l => l.id === currentAcc.ledgerId);

      if (!selectedLedger) {
        target.innerHTML = `
          <div style="margin-bottom: 16px;">
            <button class="btn btn-secondary" id="clInlineTabBackNoLdg" style="height:34px; font-size:12.5px; padding: 0 14px; font-weight:600; cursor:pointer; border-radius:6px; display:inline-flex; align-items:center; gap:6px;">
              ← Back
            </button>
          </div>
          <div style="padding: 48px; text-align: center; border: 1.5px dashed var(--slate-200); border-radius: 16px; background: var(--slate-50);">
            <div style="font-size: 14.5px; font-weight: 700; color: var(--slate-700);">Linked ledger not found</div>
            <div style="margin-top: 16px;">
              <button class="btn btn-primary" id="clBtnBackToAccountsLdg" style="height:36px; font-size:13px; padding: 0 16px; font-weight:600; cursor:pointer; border-radius:8px; display:inline-flex; align-items:center; gap:6px;">
                ← Back to Accounts
              </button>
            </div>
          </div>
        `;
        const handleGoBack = () => {
          if (typeof window.clSwitchBankingTabGlobal === 'function') {
            window.clSwitchBankingTabGlobal('details');
          }
        };
        document.getElementById('clInlineTabBackNoLdg')?.addEventListener('click', handleGoBack);
        document.getElementById('clBtnBackToAccountsLdg')?.addEventListener('click', handleGoBack);
        return;
      }

      const rawStatementRows = (window.KYA_STORE.uploadedStatements || {})[currentAcc.id] || [];
      const statementRows = rawStatementRows
        .map((line, origIdx) => ({ ...line, origIdx }))
        .filter(line => line.date && String(line.date).trim() !== '' && line.description && String(line.description).trim() !== '');

      let openingBal = parseFloat(selectedLedger.openingBalance) || 0;
      if (statementRows.length > 0) {
        const firstRow = statementRows[0];
        const parsedFirstBal = parseFloat(firstRow.balance) || 0;
        const parsedFirstDb = parseFloat(firstRow.debit) || 0;
        const parsedFirstCr = parseFloat(firstRow.credit) || 0;
        if (parsedFirstBal !== 0) {
          openingBal = parsedFirstBal + parsedFirstDb - parsedFirstCr;
        }
      }

      // Chronological sort to calculate running balances correctly
      const chronoRows = [...statementRows].sort((a, b) => a.date.localeCompare(b.date));
      let runningBal = openingBal;
      chronoRows.forEach((line) => {
        const dbVal = parseFloat(line.debit) || 0;
        const crVal = parseFloat(line.credit) || 0;
        const parsedBal = parseFloat(line.balance) || 0;
        if (parsedBal !== 0) {
          runningBal = parsedBal;
        } else {
          runningBal = runningBal + dbVal - crVal;
        }
        line.computedBalance = runningBal;
      });

      // Filter by date range
      let displayRows = [...chronoRows];
      if (_clStatementFromDate) {
        displayRows = displayRows.filter(line => line.date >= _clStatementFromDate);
      }
      if (_clStatementToDate) {
        displayRows = displayRows.filter(line => line.date <= _clStatementToDate);
      }

      // Filter by search query
      if (_clStatementSearchQuery) {
        const query = _clStatementSearchQuery.toLowerCase().trim();
        displayRows = displayRows.filter(line => {
          const desc = (line.description || '').toLowerCase();
          const dateStr = formatToDDMMYYYY(line.date).toLowerCase();
          const debit = String(line.debit || '').toLowerCase();
          const credit = String(line.credit || '').toLowerCase();
          return desc.includes(query) || dateStr.includes(query) || debit.includes(query) || credit.includes(query);
        });
      }

      // Sort display rows
      if (_clStatementSortOrder === 'newest') {
        displayRows.sort((a, b) => b.date.localeCompare(a.date));
      } else {
        displayRows.sort((a, b) => a.date.localeCompare(b.date));
      }

      // Calculate stats based on period
      let periodOpeningBal = openingBal;
      let periodClosingBal = openingBal;
      let periodRows = chronoRows;
      if (chronoRows.length > 0) {
        if (_clStatementFromDate) {
          const beforeRows = chronoRows.filter(r => r.date < _clStatementFromDate);
          if (beforeRows.length > 0) {
            periodOpeningBal = beforeRows[beforeRows.length - 1].computedBalance;
          }
          periodRows = periodRows.filter(r => r.date >= _clStatementFromDate);
        }
        if (_clStatementToDate) {
          const onOrBeforeRows = chronoRows.filter(r => r.date <= _clStatementToDate);
          if (onOrBeforeRows.length > 0) {
            periodClosingBal = onOrBeforeRows[onOrBeforeRows.length - 1].computedBalance;
          } else {
            periodClosingBal = periodOpeningBal;
          }
          periodRows = periodRows.filter(r => r.date <= _clStatementToDate);
        } else {
          periodClosingBal = chronoRows[chronoRows.length - 1].computedBalance;
        }
      }

      const periodDebitedBal = periodRows.reduce((sum, r) => sum + (parseFloat(r.debit) || 0), 0);
      const periodCreditedBal = periodRows.reduce((sum, r) => sum + (parseFloat(r.credit) || 0), 0);

      const isReconciliationMode = (_clActiveTopTab === 'banking' && _clActiveBankingTab === 'reconciliation');
      const rawLedgers = (typeof coaLedgers !== 'undefined' ? coaLedgers : []).filter(l => l.type === 'ledger');
      const rawCustomers = typeof getKyaCustomers === 'function' ? getKyaCustomers() : (window.KYA_STORE?.customers || []);
      const rawSuppliers = typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : (window.KYA_STORE?.suppliers || []);

      const customerLedgers = rawCustomers.map(c => ({
        id: c.id,
        name: c.name,
        aliases: c.aliases || [],
        type: 'customer',
        groupName: 'Customer',
        sgId: 'sg-tr'
      }));

      const supplierLedgers = rawSuppliers.map(s => ({
        id: s.id,
        name: s.name,
        aliases: s.aliases || [],
        type: 'supplier',
        groupName: 'Supplier',
        sgId: 'sg-tp'
      }));

      const allLedgers = [...rawLedgers, ...customerLedgers, ...supplierLedgers];
      window.KYA_STORE.statementLedgerMapping = window.KYA_STORE.statementLedgerMapping || {};
      window.KYA_STORE.reconciliationState = window.KYA_STORE.reconciliationState || {};
      window.KYA_STORE.statementDeptMapping = window.KYA_STORE.statementDeptMapping || {};
      window.KYA_STORE.statementTypeMapping = window.KYA_STORE.statementTypeMapping || {};

      const bankLedger = coaLedgers.find(l => l.id === currentAcc.ledgerId) || { name: currentAcc.name };

      const allUnreconciledRows = statementRows.filter(line => !window.KYA_STORE.statementLedgerMapping[`${currentAcc.id}_${line.origIdx}`]);
      const allConfirmedRows = statementRows.filter(line => !!window.KYA_STORE.statementLedgerMapping[`${currentAcc.id}_${line.origIdx}`]);

      const unreconciledRows = displayRows.filter(line => !window.KYA_STORE.statementLedgerMapping[`${currentAcc.id}_${line.origIdx}`]);
      const confirmedRows = displayRows.filter(line => !!window.KYA_STORE.statementLedgerMapping[`${currentAcc.id}_${line.origIdx}`]);

      const reconTargetRows = isReconciliationMode
        ? (_clReconSubSection === 'reconciliation' ? unreconciledRows : confirmedRows)
        : displayRows;

      const totalTargetRowsCount = isReconciliationMode
        ? (_clReconSubSection === 'reconciliation' ? allUnreconciledRows.length : allConfirmedRows.length)
        : statementRows.length;

      const showingCountText = `Showing ${reconTargetRows.length} of ${totalTargetRowsCount} entries`;

      const allDisplayedSelected = reconTargetRows.length > 0 && reconTargetRows.every(r => _clStatementSelectedIndices.has(r.origIdx));

      let rowsHtml = '';
      if (reconTargetRows.length > 0) {
        reconTargetRows.forEach((line) => {
          const dbVal = parseFloat(line.debit) || 0;
          const crVal = parseFloat(line.credit) || 0;
          const amt = dbVal > 0 ? dbVal : crVal;
          const isChecked = _clStatementSelectedIndices.has(line.origIdx);
          const key = `${currentAcc.id}_${line.origIdx}`;
          let isPosted = !!window.KYA_STORE.reconciliationState[key];
          if (isPosted && typeof postedEntries !== 'undefined') {
            const voucherCode = 'REC-' + (Number(line.origIdx) + 1);
            const existsInJournal = postedEntries.some(e => e.reconKey === key || e.voucherNo === voucherCode);
            if (!existsInJournal) {
              isPosted = false;
              delete window.KYA_STORE.reconciliationState[key];
            }
          }
          
          if (isReconciliationMode) {
            const amtColor = dbVal > 0 ? 'var(--red-600)' : (crVal > 0 ? 'var(--emerald-600)' : 'var(--slate-700)');
            const amtDisplay = dbVal > 0 ? fmtAmt(dbVal) : (crVal > 0 ? fmtAmt(crVal) : '—');
            const savedLedgerId = window.KYA_STORE.statementLedgerMapping[key] || '';
            const savedLedger = allLedgers.find(l => String(l.id) === String(savedLedgerId));

            if (_clReconSubSection === 'reconciliation') {
              rowsHtml += `
                <tr class="cl-recon-row" style="${isChecked ? 'background: #eff6ff;' : ''}; cursor: pointer;">
                  ${_clStatementSelectMode ? `
                    <td style="text-align: center; width: 42px;">
                      <input type="checkbox" class="cl-stmt-row-cb" data-index="${line.origIdx}" ${isChecked ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer; accent-color: #2563eb;">
                    </td>
                  ` : ''}
                  <td style="white-space: nowrap;">${formatToDDMMYYYY(line.date)}</td>
                  <td>
                    <div style="font-weight: 600; color: var(--slate-800);">${ohEsc(line.description || '—')}</div>
                  </td>
                  <td class="num-val" style="color: ${amtColor}; text-align: right;">${amtDisplay}</td>
                  <td style="width: 280px; position: relative;">
                    <button type="button" 
                            class="cl-recon-ledger-btn" 
                            data-index="${line.origIdx}"
                            data-account-id="${currentAcc.id}"
                            data-selected-id="${savedLedgerId}"
                            data-description="${ohEsc(line.description || '—')}"
                            data-amount="${amtDisplay}"
                            data-date="${formatToDDMMYYYY(line.date)}"
                            data-type="${dbVal > 0 ? 'Withdrawal' : 'Deposit'}"
                            data-type-color="${amtColor}"
                            style="width: 100%; height: 36px; padding: 0 10px; font-size: 13px; text-align: left; background: ${savedLedger ? '#eff6ff' : '#fff'}; border: ${savedLedger ? '1.5px solid #2563eb' : '1px solid var(--slate-300)'}; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; color: ${savedLedger ? '#1e3a8a' : 'var(--slate-400)'}; transition: all 0.15s ease;">
                      ${savedLedger ? `
                        <div style="display: flex; align-items: center; gap: 6px; min-width: 0;">
                          <span style="color: #2563eb; font-weight: 800; font-size: 12px; background: rgba(37,99,235,0.15); border-radius: 4px; padding: 1px 4px;">✓</span>
                          <span class="cl-recon-ledger-label" style="font-weight: 700; color: #1e3a8a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${ohEsc(savedLedger.name)}
                          </span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 4px;">
                          <span class="cl-recon-clear-btn" data-index="${line.origIdx}" data-account-id="${currentAcc.id}" title="Remove selection (Backspace)" style="background: rgba(220,38,38,0.1); color: #dc2626; border-radius: 4px; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; line-height: 1;">
                            <svg viewBox="0 0 15 15" fill="none" style="width: 13px; height: 13px; display: block;" stroke="currentColor">
                              <path d="M5.5 2h4M1.5 4h12M2.5 4l1 9.5a1 1 0 001 .5h6a1 1 0 001-.5l1-9.5M5.5 6.5v5M9.5 6.5v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                            </svg>
                          </span>
                          <span style="font-size: 8px; color: #3b82f6;">▼</span>
                        </div>
                      ` : `
                        <span class="cl-recon-ledger-label" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--slate-400); font-weight: 500;">
                          Select Ledger...
                        </span>
                        <span style="font-size: 9px; margin-left: 6px; color: var(--slate-400);">▼</span>
                      `}
                    </button>
                  </td>
                </tr>
              `;
            } else {
              // Confirmation section row: Date, Journal Entry & Description, Department, Transaction Type, Action
              const savedDeptId = window.KYA_STORE.statementDeptMapping[key] || '';
              const savedTxType = window.KYA_STORE.statementTypeMapping[key] || 'non-budget';
              const depts = (typeof ohDepartments !== 'undefined' ? ohDepartments : []).filter(d => d.id !== 'all');
              const isBudgetTx = savedTxType === 'budget';

              rowsHtml += `
                <tr class="cl-confirm-row" style="background: ${isPosted ? '#fafdfb' : (isChecked ? '#eff6ff' : '#ffffff')}; border-bottom: 1px solid #f1f5f9;">
                  ${_clStatementSelectMode ? `
                    <td style="text-align: center; width: 42px; vertical-align: middle; padding: 12px 8px;">
                      <input type="checkbox" class="cl-stmt-row-cb" data-index="${line.origIdx}" ${isChecked ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer; accent-color: #2563eb;">
                    </td>
                  ` : ''}
                  <!-- 1. Date -->
                  <td style="white-space: nowrap; vertical-align: middle; padding: 12px 14px; width: 110px;">
                    <div style="display: inline-flex; align-items: center; gap: 6px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; color: #1e293b; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                      <span>${formatToDDMMYYYY(line.date)}</span>
                    </div>
                  </td>
                  <!-- 2. Journal Entry & Description -->
                  <td style="vertical-align: middle; padding: 10px 14px; min-width: 320px;">
                    <div style="background: #ffffff; border: 1.5px solid ${isPosted ? '#bbf7d0' : '#e2e8f0'}; border-radius: 10px; padding: 9px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                      ${dbVal > 0 ? `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                          <div style="display: flex; align-items: center; gap: 7px; min-width: 0;">
                            <span style="background: #dbeafe; color: #1d4ed8; font-size: 10.5px; font-weight: 800; padding: 1.5px 6px; border-radius: 5px; letter-spacing: 0.02em;">By</span>
                            <span style="font-weight: 700; color: #0f172a; font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ohEsc(savedLedger?.name || '—')}</span>
                          </div>
                          <span style="font-weight: 800; color: #dc2626; font-size: 12.5px; font-variant-numeric: tabular-nums; margin-left: 12px;">${fmtAmt(dbVal)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; padding-left: 14px; margin-bottom: 6px;">
                          <div style="display: flex; align-items: center; gap: 7px; min-width: 0;">
                            <span style="background: #d1fae5; color: #065f46; font-size: 10.5px; font-weight: 800; padding: 1.5px 6px; border-radius: 5px; letter-spacing: 0.02em;">To</span>
                            <span style="font-weight: 700; color: #334155; font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ohEsc(bankLedger?.name || currentAcc.name)}</span>
                          </div>
                          <span style="font-weight: 800; color: #dc2626; font-size: 12.5px; font-variant-numeric: tabular-nums; margin-left: 12px;">${fmtAmt(dbVal)}</span>
                        </div>
                      ` : `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                          <div style="display: flex; align-items: center; gap: 7px; min-width: 0;">
                            <span style="background: #dbeafe; color: #1d4ed8; font-size: 10.5px; font-weight: 800; padding: 1.5px 6px; border-radius: 5px; letter-spacing: 0.02em;">By</span>
                            <span style="font-weight: 700; color: #0f172a; font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ohEsc(bankLedger?.name || currentAcc.name)}</span>
                          </div>
                          <span style="font-weight: 800; color: #059669; font-size: 12.5px; font-variant-numeric: tabular-nums; margin-left: 12px;">${fmtAmt(crVal)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; padding-left: 14px; margin-bottom: 6px;">
                          <div style="display: flex; align-items: center; gap: 7px; min-width: 0;">
                            <span style="background: #d1fae5; color: #065f46; font-size: 10.5px; font-weight: 800; padding: 1.5px 6px; border-radius: 5px; letter-spacing: 0.02em;">To</span>
                            <span style="font-weight: 700; color: #334155; font-size: 12.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ohEsc(savedLedger?.name || '—')}</span>
                          </div>
                          <span style="font-weight: 800; color: #059669; font-size: 12.5px; font-variant-numeric: tabular-nums; margin-left: 12px;">${fmtAmt(crVal)}</span>
                        </div>
                      `}
                      <div style="display: flex; align-items: center; gap: 6px; background: #f8fafc; border-top: 1px solid #f1f5f9; padding-top: 5px; margin-top: 2px; font-size: 11.5px; color: #64748b;">
                        <span style="color: #94a3b8; font-size: 10.5px; flex-shrink: 0;">💬 Narration:</span>
                        <span style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #475569;" title="${ohEsc(line.description || '—')}">${ohEsc(line.description || '—')}</span>
                      </div>
                    </div>
                  </td>
                  <!-- 3. Department -->
                  <td style="vertical-align: middle; padding: 10px 14px; width: 170px;">
                    <select class="je-input cl-recon-dept-select" data-index="${line.origIdx}" style="height: 36px; font-size: 12px; width: 100%; padding: 0 10px; cursor: pointer; background: #ffffff; border: 1.5px solid ${savedDeptId ? '#bfdbfe' : '#e2e8f0'}; border-radius: 8px; font-weight: 600; color: ${savedDeptId ? '#1e40af' : '#475569'}; box-shadow: 0 1px 2px rgba(0,0,0,0.02); transition: all 0.15s ease;">
                      <option value="">— Select Dept —</option>
                      ${depts.map(d => `<option value="${d.id}" ${String(d.id) === String(savedDeptId) ? 'selected' : ''}>${ohEsc(d.name)}</option>`).join('')}
                    </select>
                  </td>
                  <!-- 4. Transaction Type -->
                  <td style="vertical-align: middle; padding: 10px 14px; width: 180px;">
                    <div class="cl-recon-type-toggle-box" data-index="${line.origIdx}" style="display: inline-flex; align-items: center; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 2px; user-select: none; box-shadow: inset 0 1px 2px rgba(0,0,0,0.04);">
                      <button type="button" class="cl-recon-type-btn ${isBudgetTx ? 'active' : ''}" data-val="budget" data-index="${line.origIdx}" style="border: none; cursor: pointer; padding: 5px 10px; font-size: 11px; font-weight: 700; border-radius: 6px; font-family: var(--font-main); transition: all 0.15s ease; ${isBudgetTx ? 'background: #2563eb; color: #ffffff; box-shadow: 0 1px 4px rgba(37,99,235,0.3);' : 'background: transparent; color: #64748b;'}">
                        Budget
                      </button>
                      <button type="button" class="cl-recon-type-btn ${!isBudgetTx ? 'active' : ''}" data-val="non-budget" data-index="${line.origIdx}" style="border: none; cursor: pointer; padding: 5px 10px; font-size: 11px; font-weight: 700; border-radius: 6px; font-family: var(--font-main); transition: all 0.15s ease; ${!isBudgetTx ? 'background: #ffffff; color: #1e293b; box-shadow: 0 1px 3px rgba(0,0,0,0.08);' : 'background: transparent; color: #64748b;'}">
                        Non-Budget
                      </button>
                    </div>
                  </td>
                  <!-- 5. Action -->
                  <td style="vertical-align: middle; padding: 10px 14px; width: 170px; text-align: right;">
                    ${isPosted ? `
                      <div style="display: flex; gap: 6px; justify-content: flex-end; align-items: center;">
                        <span style="display: inline-flex; align-items: center; gap: 4px; background: #ecfdf5; border: 1.5px solid #a7f3d0; color: #047857; border-radius: 8px; padding: 5px 10px; font-size: 11.5px; font-weight: 700;">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#047857" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          Posted
                        </span>
                        <button type="button" class="cl-btn-revert-single" data-index="${line.origIdx}" title="Revert entry back to Reconciliation" style="display: inline-flex; align-items: center; gap: 4px; height: 32px; padding: 0 10px; font-size: 11.5px; font-weight: 600; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #ffffff; color: #64748b; cursor: pointer; transition: all 0.15s ease;">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                          Revert
                        </button>
                      </div>
                    ` : `
                      <div style="display: flex; gap: 6px; justify-content: flex-end; align-items: center;">
                        <button type="button" class="btn btn-success cl-btn-post-single" data-index="${line.origIdx}" style="display: inline-flex; align-items: center; gap: 4px; height: 32px; padding: 0 12px; font-size: 11.5px; font-weight: 700; border-radius: 8px; cursor: pointer; box-shadow: 0 2px 6px rgba(5,150,105,0.25);">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          Post
                        </button>
                        <button type="button" class="cl-btn-revert-single" data-index="${line.origIdx}" title="Revert entry back to Reconciliation" style="display: inline-flex; align-items: center; gap: 4px; height: 32px; padding: 0 10px; font-size: 11.5px; font-weight: 600; border-radius: 8px; border: 1.5px solid #e2e8f0; background: #ffffff; color: #64748b; cursor: pointer; transition: all 0.15s ease;">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                          Revert
                        </button>
                      </div>
                    `}
                  </td>
                </tr>
              `;
            }
          } else {
            rowsHtml += `
              <tr style="${isChecked ? 'background: #eff6ff;' : ''}">
                ${_clStatementSelectMode ? `
                  <td style="text-align: center; width: 42px;">
                    <input type="checkbox" class="cl-stmt-row-cb" data-index="${line.origIdx}" ${isChecked ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer; accent-color: #2563eb;">
                  </td>
                ` : ''}
                <td style="white-space: nowrap;">${formatToDDMMYYYY(line.date)}</td>
                <td>
                  <div style="font-weight: 600; color: var(--slate-800);">${ohEsc(line.description || '—')}</div>
                </td>
                <td class="num-val" style="color: var(--red-600); text-align: right;">${dbVal > 0 ? fmtAmt(dbVal) : '—'}</td>
                <td class="num-val" style="color: var(--emerald-600); text-align: right;">${crVal > 0 ? fmtAmt(crVal) : '—'}</td>
                <td class="num-val" style="text-align: right;">${fmtAmt(line.computedBalance)}</td>
              </tr>
            `;
          }
        });
      } else {
        const colCount = isReconciliationMode ? (_clReconSubSection === 'confirmation' ? (_clStatementSelectMode ? 6 : 5) : (_clStatementSelectMode ? 5 : 4)) : (_clStatementSelectMode ? 6 : 5);
        let emptyTitle = 'No statement entries found';
        let emptySub = 'Try adjusting your search query, date filters, or import a new statement.';
        let emptyIcon = '📄';

        if (isReconciliationMode) {
          if (_clReconSubSection === 'confirmation') {
            emptyIcon = '✅';
            emptyTitle = 'No confirmed transactions yet';
            emptySub = 'Select ledgers in the Reconciliation section to confirm transactions.';
          } else {
            if (allConfirmedRows.length > 0 && allUnreconciledRows.length === 0) {
              emptyIcon = '🎉';
              emptyTitle = 'All transactions reconciled';
              emptySub = 'All statement entries for this bank account have been assigned ledgers. Go to Confirmation to review and post.';
            } else {
              emptyIcon = '📄';
              emptyTitle = 'No unreconciled entries found';
              emptySub = 'Try adjusting your search query, date filters, or import a new statement.';
            }
          }
        }

        rowsHtml = `
          <tr>
            <td colspan="${colCount}" style="text-align: center; color: var(--slate-400); padding: 48px;">
              <div style="font-size: 28px; margin-bottom: 8px;">${emptyIcon}</div>
              <div style="font-size: 13.5px; font-weight: 700; color: var(--slate-700);">${ohEsc(emptyTitle)}</div>
              <div style="font-size: 12px; margin-top: 4px; color: var(--slate-400);">${ohEsc(emptySub)}</div>
            </td>
          </tr>
        `;
      }

      // Actions in Blue Card header
      if (actionsArea) {
        if (isReconciliationMode) {
          const unpostedConfirmedCount = confirmedRows.filter(line => {
            const k = `${currentAcc.id}_${line.origIdx}`;
            return !window.KYA_STORE.reconciliationState[k];
          }).length;

          actionsArea.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <button type="button" id="clSubTabReconSection" style="height: 32px; padding: 0 12px; font-size: 12.5px; font-weight: 700; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease; border: ${_clReconSubSection === 'reconciliation' ? 'none' : '1px solid rgba(255,255,255,0.35)'}; background: ${_clReconSubSection === 'reconciliation' ? '#ffffff' : 'rgba(255,255,255,0.18)'}; color: ${_clReconSubSection === 'reconciliation' ? '#1e40af' : '#ffffff'};">
                Reconciliation <span style="background: ${_clReconSubSection === 'reconciliation' ? '#dbeafe' : 'rgba(255,255,255,0.25)'}; color: ${_clReconSubSection === 'reconciliation' ? '#1e40af' : '#ffffff'}; padding: 1px 6px; border-radius: 10px; font-size: 11px; font-weight: 800;">${unreconciledRows.length}</span>
              </button>
              <button type="button" id="clSubTabConfirmSection" style="height: 32px; padding: 0 12px; font-size: 12.5px; font-weight: 700; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease; border: ${_clReconSubSection === 'confirmation' ? 'none' : '1px solid rgba(255,255,255,0.35)'}; background: ${_clReconSubSection === 'confirmation' ? '#ffffff' : 'rgba(255,255,255,0.18)'}; color: ${_clReconSubSection === 'confirmation' ? '#1e40af' : '#ffffff'};">
                Confirmation <span style="background: ${_clReconSubSection === 'confirmation' ? '#dbeafe' : 'rgba(255,255,255,0.25)'}; color: ${_clReconSubSection === 'confirmation' ? '#1e40af' : '#ffffff'}; padding: 1px 6px; border-radius: 10px; font-size: 11px; font-weight: 800;">${confirmedRows.length}</span>
              </button>
              ${_clReconSubSection === 'confirmation' && unpostedConfirmedCount > 0 ? `
                <button type="button" id="clBtnPostAllConfirmed" style="height: 32px; padding: 0 12px; font-size: 12px; font-weight: 700; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; border: none; background: #10b981; color: #ffffff; box-shadow: 0 2px 8px rgba(16,185,129,0.3); transition: all 0.15s ease; margin-left: 4px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Post All (${unpostedConfirmedCount})
                </button>
              ` : ''}
            </div>
          `;
          actionsArea.querySelector('#clSubTabReconSection')?.addEventListener('click', () => {
            _clReconSubSection = 'reconciliation';
            _clStatementSelectedIndices.clear();
            renderActiveSubtab();
          });
          actionsArea.querySelector('#clSubTabConfirmSection')?.addEventListener('click', () => {
            _clReconSubSection = 'confirmation';
            _clStatementSelectedIndices.clear();
            renderActiveSubtab();
          });
        } else {
          actionsArea.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; position: relative;">
              <button class="cl-card-btn" id="btnClUploadStatement" style="padding: 0 12px; height: 32px; border-color:rgba(255,255,255,0.4); background:rgba(255,255,255,0.15); color:#fff; font-size:12.5px; border-radius:6px; cursor:pointer;">
                Upload Statement
              </button>
              <div style="position: relative;">
                <button class="cl-card-btn" id="btnClStmtMoreMenu" style="width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; border-color:rgba(255,255,255,0.4); background:rgba(255,255,255,0.15); color:#fff; font-size:16px; border-radius:6px; cursor:pointer; font-weight: 800;" title="More Statement Options" type="button">
                  ⋮
                </button>
                <!-- 3-Dot Dropdown Menu -->
                <div id="clStmtDropdownMenu" style="display: none; position: absolute; right: 0; top: 38px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2); width: 210px; z-index: 1000; overflow: hidden; font-family: Inter, sans-serif;">
                  <div style="padding: 6px 0;">
                    <button type="button" id="clMenuToggleSelectMode" class="cl-dropdown-item" style="width: 100%; text-align: left; padding: 9px 16px; background: transparent; border: none; font-size: 13px; font-weight: 600; color: #334155; cursor: pointer; display: flex; align-items: center; gap: 10px;">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="m9 12 2 2 4-4"/></svg>
                      ${_clStatementSelectMode ? 'Exit Select Mode' : 'Select Entries'}
                    </button>
                    ${statementRows.length > 0 ? `
                      <button type="button" id="clMenuDeleteSelected" class="cl-dropdown-item" style="width: 100%; text-align: left; padding: 9px 16px; background: transparent; border: none; font-size: 13px; font-weight: 600; color: ${_clStatementSelectedIndices.size > 0 ? '#dc2626' : '#94a3b8'}; cursor: ${_clStatementSelectedIndices.size > 0 ? 'pointer' : 'default'}; display: flex; align-items: center; gap: 10px;" ${_clStatementSelectedIndices.size === 0 ? 'disabled' : ''}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${_clStatementSelectedIndices.size > 0 ? '#dc2626' : '#94a3b8'}" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        Delete Selected ${_clStatementSelectedIndices.size > 0 ? `(${_clStatementSelectedIndices.size})` : ''}
                      </button>
                      <div style="height: 1px; background: #f1f5f9; margin: 4px 0;"></div>
                      <button type="button" id="clMenuDeleteAll" class="cl-dropdown-item" style="width: 100%; text-align: left; padding: 9px 16px; background: transparent; border: none; font-size: 13px; font-weight: 600; color: #dc2626; cursor: pointer; display: flex; align-items: center; gap: 10px;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        Clear All Statement
                      </button>
                    ` : ''}
                  </div>
                </div>
              </div>
            </div>
          `;
          document.getElementById('btnClUploadStatement')?.addEventListener('click', () => {
            showUploadStatementWizard();
          });

          const moreBtn = document.getElementById('btnClStmtMoreMenu');
          const dropdownMenu = document.getElementById('clStmtDropdownMenu');
          if (moreBtn && dropdownMenu) {
            moreBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
            });
            document.addEventListener('click', (e) => {
              if (!moreBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.style.display = 'none';
              }
            });
          }

          document.getElementById('clMenuToggleSelectMode')?.addEventListener('click', () => {
            _clStatementSelectMode = !_clStatementSelectMode;
            if (!_clStatementSelectMode) _clStatementSelectedIndices.clear();
            if (dropdownMenu) dropdownMenu.style.display = 'none';
            renderActiveSubtab();
          });

          document.getElementById('clMenuDeleteSelected')?.addEventListener('click', () => {
            if (dropdownMenu) dropdownMenu.style.display = 'none';
            if (_clStatementSelectedIndices.size > 0) {
              confirmDeleteStatementEntries(Array.from(_clStatementSelectedIndices), currentAcc.id, false);
            }
          });

          document.getElementById('clMenuDeleteAll')?.addEventListener('click', () => {
            if (dropdownMenu) dropdownMenu.style.display = 'none';
            confirmDeleteStatementEntries(statementRows.map(r => r.origIdx), currentAcc.id, true);
          });
        }
      }

      function confirmDeleteStatementEntries(indicesToDelete, bankId, isAll) {
        if (!indicesToDelete || indicesToDelete.length === 0) return;

        const count = indicesToDelete.length;
        const msg = isAll
          ? `Are you sure you want to delete ALL ${count} statement entries for this bank account? This cannot be undone.`
          : `Are you sure you want to delete ${count} selected statement entry(ies)?`;

        document.getElementById('kyaConfirmOverlay')?.remove();
        const overlay = document.createElement('div');
        overlay.className = 'kya-confirm-overlay';
        overlay.id = 'kyaConfirmOverlay';
        overlay.innerHTML = `
          <div class="kya-confirm-card">
            <div class="kya-confirm-icon" style="background:#fee2e2; color:#dc2626;">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </div>
            <div class="kya-confirm-title">${isAll ? 'Clear Entire Statement' : 'Delete Statement Entries'}</div>
            <div class="kya-confirm-msg">${ohEsc(msg)}</div>
            <div class="kya-confirm-btns">
              <button class="kya-confirm-cancel" id="clConfirmCancel">Cancel</button>
              <button class="kya-confirm-ok" id="clConfirmOk" style="background:#dc2626;">Delete</button>
            </div>
          </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('#clConfirmCancel').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

        overlay.querySelector('#clConfirmOk').addEventListener('click', () => {
          overlay.remove();
          const currentStatements = (window.KYA_STORE.uploadedStatements || {})[bankId] || [];
          const toDeleteSet = new Set(indicesToDelete);
          const updated = currentStatements.filter((_, idx) => !toDeleteSet.has(idx));
          
          window.KYA_STORE.uploadedStatements = window.KYA_STORE.uploadedStatements || {};
          window.KYA_STORE.uploadedStatements[bankId] = updated;

          _clStatementSelectedIndices.clear();
          if (updated.length === 0) {
            _clStatementSelectMode = false;
          }

          showToast(isAll ? 'Bank statement cleared.' : `Deleted ${count} statement entry(ies).`, 'success');
          renderActiveSubtab();
          triggerAutoBackup();
        });
      }

      function attachConfirmationRowListeners() {
        document.querySelectorAll('.cl-btn-post-single').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const origIdx = e.currentTarget.dataset.index;
            const line = statementRows.find(r => String(r.origIdx) === String(origIdx));
            if (!line) return;

            const key = `${currentAcc.id}_${origIdx}`;
            const dbVal = parseFloat(line.debit) || 0;
            const crVal = parseFloat(line.credit) || 0;
            const amt = dbVal > 0 ? dbVal : crVal;
            const savedLedgerId = window.KYA_STORE.statementLedgerMapping[key];
            const selectedLedger = allLedgers.find(l => String(l.id) === String(savedLedgerId));
            if (!selectedLedger) return;

            const voucherCode = 'REC-' + (Number(origIdx) + 1);
            const savedDeptId = window.KYA_STORE.statementDeptMapping[key] || '';
            const savedType = window.KYA_STORE.statementTypeMapping[key] || 'non-budget';

            const newEntry = {
              id: Date.now() + Math.floor(Math.random() * 1000),
              date: line.date,
              voucherNo: voucherCode,
              reconKey: key,
              departmentId: savedDeptId,
              isBudget: savedType === 'budget',
              narration: line.description || 'Bank Reconciliation Entry',
              allRows: dbVal > 0 ? [
                { id: 1, type: 'By', particular: selectedLedger.name, debit: amt.toFixed(2), credit: '' },
                { id: 2, type: 'To', particular: bankLedger.name, debit: '', credit: amt.toFixed(2) }
              ] : [
                { id: 1, type: 'By', particular: bankLedger.name, debit: amt.toFixed(2), credit: '' },
                { id: 2, type: 'To', particular: selectedLedger.name, debit: '', credit: amt.toFixed(2) }
              ]
            };

            if (typeof postedEntries !== 'undefined') postedEntries.push(newEntry);
            window.KYA_STORE.reconciliationState[key] = line.date;
            showToast('Journal Entry posted to books!', 'success');
            renderActiveSubtab();
            if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
          });
        });

        document.querySelectorAll('.cl-btn-revert-single').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const origIdx = e.currentTarget.dataset.index;
            const key = `${currentAcc.id}_${origIdx}`;

            if (typeof postedEntries !== 'undefined') {
              const voucherCode = 'REC-' + (Number(origIdx) + 1);
              const pIdx = postedEntries.findIndex(ent => ent.reconKey === key || ent.voucherNo === voucherCode);
              if (pIdx !== -1) {
                postedEntries.splice(pIdx, 1);
              }
            }

            delete window.KYA_STORE.statementLedgerMapping[key];
            delete window.KYA_STORE.reconciliationState[key];
            delete window.KYA_STORE.statementDeptMapping[key];
            delete window.KYA_STORE.statementTypeMapping[key];
            showToast('Transaction moved back to Reconciliation section.', 'info');
            renderActiveSubtab();
            if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
          });
        });

        document.querySelectorAll('.cl-recon-dept-select').forEach(sel => {
          sel.addEventListener('change', (e) => {
            const origIdx = e.target.dataset.index;
            const key = `${currentAcc.id}_${origIdx}`;
            window.KYA_STORE.statementDeptMapping[key] = e.target.value;
            if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
          });
        });

        document.querySelectorAll('.cl-recon-type-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const origIdx = btn.dataset.index;
            const val = btn.dataset.val;
            const key = `${currentAcc.id}_${origIdx}`;
            window.KYA_STORE.statementTypeMapping[key] = val;
            renderActiveSubtab();
            if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
          });
        });

        document.querySelectorAll('.cl-recon-type-checkbox').forEach(chk => {
          chk.addEventListener('change', (e) => {
            const origIdx = e.target.dataset.index;
            const key = `${currentAcc.id}_${origIdx}`;
            window.KYA_STORE.statementTypeMapping[key] = e.target.checked ? 'budget' : 'non-budget';
            renderActiveSubtab();
            if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
          });
        });

        const postAllBtn = document.getElementById('clBtnPostAllConfirmed');
        if (postAllBtn) {
          postAllBtn.addEventListener('click', () => {
            let postCount = 0;
            confirmedRows.forEach(line => {
              const key = `${currentAcc.id}_${line.origIdx}`;
              const voucherCode = 'REC-' + (Number(line.origIdx) + 1);
              const existsInJournal = typeof postedEntries !== 'undefined' && postedEntries.some(e => e.reconKey === key || e.voucherNo === voucherCode);
              if (window.KYA_STORE.reconciliationState[key] && existsInJournal) return;

              const dbVal = parseFloat(line.debit) || 0;
              const crVal = parseFloat(line.credit) || 0;
              const amt = dbVal > 0 ? dbVal : crVal;
              const savedLedgerId = window.KYA_STORE.statementLedgerMapping[key];
              const selectedLedger = allLedgers.find(l => String(l.id) === String(savedLedgerId));
              if (!selectedLedger) return;

              const savedDeptId = window.KYA_STORE.statementDeptMapping[key] || '';
              const savedType = window.KYA_STORE.statementTypeMapping[key] || 'non-budget';

              const newEntry = {
                id: Date.now() + Math.floor(Math.random() * 1000) + postCount,
                date: line.date,
                voucherNo: voucherCode,
                reconKey: key,
                departmentId: savedDeptId,
                isBudget: savedType === 'budget',
                narration: line.description || 'Bank Reconciliation Entry',
                allRows: dbVal > 0 ? [
                  { id: 1, type: 'By', particular: selectedLedger.name, debit: amt.toFixed(2), credit: '' },
                  { id: 2, type: 'To', particular: bankLedger.name, debit: '', credit: amt.toFixed(2) }
                ] : [
                  { id: 1, type: 'By', particular: bankLedger.name, debit: amt.toFixed(2), credit: '' },
                  { id: 2, type: 'To', particular: selectedLedger.name, debit: '', credit: amt.toFixed(2) }
                ]
              };

              if (typeof postedEntries !== 'undefined') postedEntries.push(newEntry);
              window.KYA_STORE.reconciliationState[key] = line.date;
              postCount++;
            });

            if (postCount > 0) {
              showToast(`Successfully posted ${postCount} journal entry(ies) to books!`, 'success');
              renderActiveSubtab();
              if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
            } else {
              showToast('All confirmed entries are already posted to books.', 'info');
            }
          });
        }
      }

      // Check if statement container already exists in DOM to avoid focus loss
      const existingContainer = document.getElementById('clStmtContainer');
      if (existingContainer) {
          // Update stats
          const statsEl = existingContainer.querySelector('.recon-stats');
          if (isReconciliationMode) {
            if (statsEl) statsEl.style.display = 'none';
          } else {
            if (statsEl) statsEl.style.display = 'grid';
            if (document.getElementById('clStmtOpeningBalVal')) document.getElementById('clStmtOpeningBalVal').innerHTML = fmtAmt(periodOpeningBal);
            if (document.getElementById('clStmtDebitedBalVal')) {
              const el = document.getElementById('clStmtDebitedBalVal');
              el.innerHTML = fmtAmt(periodDebitedBal);
              el.style.color = 'var(--red-600)';
            }
            if (document.getElementById('clStmtCreditedBalVal')) {
              const el = document.getElementById('clStmtCreditedBalVal');
              el.innerHTML = fmtAmt(periodCreditedBal);
              el.style.color = 'var(--emerald-600)';
            }
            if (document.getElementById('clStmtClosingBalVal')) document.getElementById('clStmtClosingBalVal').innerHTML = fmtAmt(periodClosingBal);
          }

          // Update entries count
          if (document.getElementById('clStmtShowingCount')) {
            document.getElementById('clStmtShowingCount').textContent = showingCountText;
          }

          // Update sub-section toggle buttons in header if in reconciliation mode
          if (actionsArea && isReconciliationMode) {
            const unpostedConfirmedCount = confirmedRows.filter(line => {
              const k = `${currentAcc.id}_${line.origIdx}`;
              return !window.KYA_STORE.reconciliationState[k];
            }).length;

            actionsArea.innerHTML = `
              <div style="display: flex; align-items: center; gap: 8px;">
                <button type="button" id="clSubTabReconSection" style="height: 32px; padding: 0 12px; font-size: 12.5px; font-weight: 700; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease; border: ${_clReconSubSection === 'reconciliation' ? 'none' : '1px solid rgba(255,255,255,0.35)'}; background: ${_clReconSubSection === 'reconciliation' ? '#ffffff' : 'rgba(255,255,255,0.18)'}; color: ${_clReconSubSection === 'reconciliation' ? '#1e40af' : '#ffffff'};">
                  Reconciliation <span style="background: ${_clReconSubSection === 'reconciliation' ? '#dbeafe' : 'rgba(255,255,255,0.25)'}; color: ${_clReconSubSection === 'reconciliation' ? '#1e40af' : '#ffffff'}; padding: 1px 6px; border-radius: 10px; font-size: 11px; font-weight: 800;">${unreconciledRows.length}</span>
                </button>
                <button type="button" id="clSubTabConfirmSection" style="height: 32px; padding: 0 12px; font-size: 12.5px; font-weight: 700; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease; border: ${_clReconSubSection === 'confirmation' ? 'none' : '1px solid rgba(255,255,255,0.35)'}; background: ${_clReconSubSection === 'confirmation' ? '#ffffff' : 'rgba(255,255,255,0.18)'}; color: ${_clReconSubSection === 'confirmation' ? '#1e40af' : '#ffffff'};">
                  Confirmation <span style="background: ${_clReconSubSection === 'confirmation' ? '#dbeafe' : 'rgba(255,255,255,0.25)'}; color: ${_clReconSubSection === 'confirmation' ? '#1e40af' : '#ffffff'}; padding: 1px 6px; border-radius: 10px; font-size: 11px; font-weight: 800;">${confirmedRows.length}</span>
                </button>
                ${_clReconSubSection === 'confirmation' && unpostedConfirmedCount > 0 ? `
                  <button type="button" id="clBtnPostAllConfirmed" style="height: 32px; padding: 0 12px; font-size: 12px; font-weight: 700; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; border: none; background: #10b981; color: #ffffff; box-shadow: 0 2px 8px rgba(16,185,129,0.3); transition: all 0.15s ease; margin-left: 4px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Post All (${unpostedConfirmedCount})
                  </button>
                ` : ''}
              </div>
            `;
            actionsArea.querySelector('#clSubTabReconSection')?.addEventListener('click', () => {
              _clReconSubSection = 'reconciliation';
              _clStatementSelectedIndices.clear();
              renderActiveSubtab();
            });
            actionsArea.querySelector('#clSubTabConfirmSection')?.addEventListener('click', () => {
              _clReconSubSection = 'confirmation';
              _clStatementSelectedIndices.clear();
              renderActiveSubtab();
            });
          }

          // Update table header & body
          const tableHead = existingContainer.querySelector('thead tr');
          if (tableHead) {
            if (isReconciliationMode) {
              if (_clReconSubSection === 'confirmation') {
                tableHead.innerHTML = `
                  ${_clStatementSelectMode ? `
                    <th style="width: 42px; text-align: center;">
                      <input type="checkbox" id="clStmtSelectAllCb" ${allDisplayedSelected ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer; accent-color: #2563eb;">
                    </th>
                  ` : ''}
                  <th style="width: 110px;">Date</th>
                  <th>Journal Entry & Description</th>
                  <th style="width: 170px;">Department</th>
                  <th style="width: 180px;">Transaction Type</th>
                  <th style="text-align: right; width: 170px;">Action</th>
                `;
              } else {
                tableHead.innerHTML = `
                  ${_clStatementSelectMode ? `
                    <th style="width: 42px; text-align: center;">
                      <input type="checkbox" id="clStmtSelectAllCb" ${allDisplayedSelected ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer; accent-color: #2563eb;">
                    </th>
                  ` : ''}
                  <th style="width: 110px;">Date</th>
                  <th>Description</th>
                  <th style="text-align: right; width: 140px;">Amount</th>
                  <th style="width: 280px;">Select Ledger</th>
                `;
              }
            } else {
              tableHead.innerHTML = `
                ${_clStatementSelectMode ? `
                  <th style="width: 42px; text-align: center;">
                    <input type="checkbox" id="clStmtSelectAllCb" ${allDisplayedSelected ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer; accent-color: #2563eb;">
                  </th>
                ` : ''}
                <th style="width: 110px;">Date</th>
                <th>Description</th>
                <th style="text-align: right; width: 120px;">Debit</th>
                <th style="text-align: right; width: 120px;">Credit</th>
                <th style="text-align: right; width: 130px;">Balance</th>
              `;
            }
          }

          // Render batch bar container if present or update
          let batchBar = document.getElementById('clStmtBatchBar');
          if (_clStatementSelectMode) {
            if (!batchBar) {
              batchBar = document.createElement('div');
              batchBar.id = 'clStmtBatchBar';
              existingContainer.insertBefore(batchBar, document.querySelector('.recon-stats'));
            }
            batchBar.innerHTML = `
              <div style="display: flex; align-items: center; justify-content: space-between; background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 12px; padding: 10px 16px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="font-size: 13px; font-weight: 700; color: #1e40af;">
                    📌 ${_clStatementSelectedIndices.size} of ${reconTargetRows.length} entries selected
                  </span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  ${_clStatementSelectedIndices.size > 0 ? `
                    <button id="clBtnDeleteSelectedBatch" class="pt-del-btn" style="height: 34px; padding: 0 16px; font-size: 12.5px;" type="button">
                      Delete Selected (${_clStatementSelectedIndices.size})
                    </button>
                  ` : ''}
                  <button id="clBtnExitSelectMode" class="btn btn-secondary" style="height: 34px; padding: 0 14px; font-size: 12.5px; font-weight: 600; border-radius: 8px;" type="button">
                    Done
                  </button>
                </div>
              </div>
            `;
          } else if (batchBar) {
            batchBar.remove();
          }

          document.getElementById('clStmtTableBody').innerHTML = rowsHtml;
          attachConfirmationRowListeners();
        } else {
          // Render the full structure
          target.innerHTML = `
            <div id="clStmtContainer">
              <!-- Inline bank selection header -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; background: var(--slate-50); border: 1.5px solid var(--slate-200); border-radius: 12px; padding: 12px 16px;">
                <div style="display: flex; gap: 10px; align-items: center;">
                  <button class="btn btn-secondary" id="clInlineTabBack" style="height:34px; font-size:12.5px; padding: 0 14px; font-weight:600; cursor:pointer; border-radius:6px; display:inline-flex; align-items:center; gap:6px; margin-right:12px;">
                    ← Back
                  </button>
                  <span style="font-size: 13px; font-weight: 700; color: var(--slate-700);">Select Bank Account:</span>
                  <select id="clCbSelectBankInline" class="je-input" style="height: 34px; font-size: 13.5px; padding: 0 8px; cursor: pointer; background: #fff; border-radius: 6px; width: 220px; font-weight: 600; color: var(--slate-800);">
                    ${bankAccounts.map(a => `<option value="${a.id}" ${a.id === currentAcc.id ? 'selected' : ''}>${ohEsc(a.name)}</option>`).join('')}
                  </select>
                </div>
                <div id="clStmtShowingCount" style="font-size: 12.5px; color: var(--slate-400); font-weight: 600;">
                  ${showingCountText}
                </div>
              </div>



              <!-- Statement Filter Control Bar -->
              <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 20px; flex-wrap: wrap; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; padding: 12px 16px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <label style="font-size: 12.5px; font-weight: 600; color: var(--slate-600);">From:</label>
                  <input type="date" id="clStmtDateFrom" class="je-input" style="height: 34px; padding: 0 8px; font-size: 12.5px; width: 135px;" value="${_clStatementFromDate}" />
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <label style="font-size: 12.5px; font-weight: 600; color: var(--slate-600);">To:</label>
                  <input type="date" id="clStmtDateTo" class="je-input" style="height: 34px; padding: 0 8px; font-size: 12.5px; width: 135px;" value="${_clStatementToDate}" />
                </div>

                <div style="display: flex; align-items: center; gap: 6px; margin-left: 10px;">
                  <label style="font-size: 12.5px; font-weight: 600; color: var(--slate-600);">Sort:</label>
                  <select id="clStmtSortOrder" class="je-input" style="height: 34px; padding: 0 8px; font-size: 12.5px; background: #fff; cursor: pointer; width: 140px;">
                    <option value="oldest" ${_clStatementSortOrder === 'oldest' ? 'selected' : ''}>Oldest First</option>
                    <option value="newest" ${_clStatementSortOrder === 'newest' ? 'selected' : ''}>Newest First</option>
                  </select>
                </div>

                <div style="position: relative; flex-grow: 1; min-width: 180px; margin-left: 10px;">
                  <input type="text" id="clStmtSearchInput" placeholder="Search description, amount..." class="je-input" style="width: 100%; height: 34px; padding: 0 12px 0 32px; font-size: 12.5px; box-sizing: border-box;" value="${ohEsc(_clStatementSearchQuery)}" />
                  <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); display: flex; align-items: center; color: var(--slate-400); pointer-events: none;">
                    <svg width="12" height="12" viewBox="0 0 17 17" fill="none">
                      <circle cx="7.5" cy="7.5" r="5" stroke="currentColor" stroke-width="1.8"/>
                      <path d="M11.5 11.5l3.5 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    </svg>
                  </span>
                </div>
              </div>

              ${_clStatementSelectMode ? `
                <div id="clStmtBatchBar">
                  <div style="display: flex; align-items: center; justify-content: space-between; background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 12px; padding: 10px 16px; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <span style="font-size: 13px; font-weight: 700; color: #1e40af;">
                        📌 ${_clStatementSelectedIndices.size} of ${reconTargetRows.length} entries selected
                      </span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      ${_clStatementSelectedIndices.size > 0 ? `
                        <button id="clBtnDeleteSelectedBatch" class="pt-del-btn" style="height: 34px; padding: 0 16px; font-size: 12.5px;" type="button">
                          Delete Selected (${_clStatementSelectedIndices.size})
                        </button>
                      ` : ''}
                      <button id="clBtnExitSelectMode" class="btn btn-secondary" style="height: 34px; padding: 0 14px; font-size: 12.5px; font-weight: 600; border-radius: 8px;" type="button">
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              ` : ''}

              ${!isReconciliationMode ? `
                <!-- Stats row -->
                <div class="recon-stats" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 20px; padding: 12px 16px;">
                  <div class="recon-stat-card">
                    <span class="recon-stat-label">Opening Balance</span>
                    <span class="recon-stat-val" id="clStmtOpeningBalVal">${fmtAmt(periodOpeningBal)}</span>
                  </div>
                  <div class="recon-stat-card">
                    <span class="recon-stat-label">Debited Balance</span>
                    <span class="recon-stat-val" id="clStmtDebitedBalVal" style="color: var(--red-600);">${fmtAmt(periodDebitedBal)}</span>
                  </div>
                  <div class="recon-stat-card">
                    <span class="recon-stat-label">Credited Balance</span>
                    <span class="recon-stat-val" id="clStmtCreditedBalVal" style="color: var(--emerald-600);">${fmtAmt(periodCreditedBal)}</span>
                  </div>
                  <div class="recon-stat-card">
                    <span class="recon-stat-label">Closing Balance</span>
                    <span class="recon-stat-val" id="clStmtClosingBalVal" style="color:var(--blue-700);">${fmtAmt(periodClosingBal)}</span>
                  </div>
                </div>
              ` : ''}

              <div style="border: 1.5px solid var(--slate-200); border-radius: 12px; max-height: 70vh; overflow-y: auto; background: #fff;">
                <table class="cl-table">
                  <thead>
                    <tr>
                      ${_clStatementSelectMode ? `
                        <th style="width: 42px; text-align: center;">
                          <input type="checkbox" id="clStmtSelectAllCb" ${allDisplayedSelected ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer; accent-color: #2563eb;">
                        </th>
                      ` : ''}
                      ${isReconciliationMode ? `
                        ${_clReconSubSection === 'confirmation' ? `
                          <th style="width: 110px;">Date</th>
                          <th>Journal Entry & Description</th>
                          <th style="width: 170px;">Department</th>
                          <th style="width: 180px;">Transaction Type</th>
                          <th style="text-align: right; width: 170px;">Action</th>
                        ` : `
                          <th style="width: 110px;">Date</th>
                          <th>Description</th>
                          <th style="text-align: right; width: 140px;">Amount</th>
                          <th style="width: 280px;">Select Ledger</th>
                        `}
                      ` : `
                        <th style="width: 110px;">Date</th>
                        <th>Description</th>
                        <th style="text-align: right; width: 120px;">Debit</th>
                        <th style="text-align: right; width: 120px;">Credit</th>
                        <th style="text-align: right; width: 130px;">Balance</th>
                      `}
                    </tr>
                  </thead>
                  <tbody id="clStmtTableBody">
                    ${rowsHtml}
                  </tbody>
                </table>
              </div>
            </div>
          `;

          // Wire event listeners on initial full render
          document.getElementById('clInlineTabBack').addEventListener('click', () => {
            if (typeof window.clSwitchBankingTabGlobal === 'function') {
              window.clSwitchBankingTabGlobal('details');
            }
          });

          document.getElementById('clSubTabReconSection')?.addEventListener('click', () => {
            _clReconSubSection = 'reconciliation';
            _clStatementSelectedIndices.clear();
            renderActiveSubtab();
          });

          document.getElementById('clSubTabConfirmSection')?.addEventListener('click', () => {
            _clReconSubSection = 'confirmation';
            _clStatementSelectedIndices.clear();
            renderActiveSubtab();
          });

          attachConfirmationRowListeners();

        document.getElementById('clStmtDateFrom').addEventListener('change', (e) => {
          _clStatementFromDate = e.target.value;
          renderActiveSubtab();
        });

        document.getElementById('clStmtDateTo').addEventListener('change', (e) => {
          _clStatementToDate = e.target.value;
          renderActiveSubtab();
        });

        document.getElementById('clStmtSortOrder').addEventListener('change', (e) => {
          _clStatementSortOrder = e.target.value;
          renderActiveSubtab();
        });

        document.getElementById('clStmtSearchInput').addEventListener('input', (e) => {
          _clStatementSearchQuery = e.target.value;
          renderActiveSubtab();
        });

        document.getElementById('clCbSelectBankInline').addEventListener('change', (e) => {
          _clReconBankId = Number(e.target.value);
          _clStatementFromDate = '';
          _clStatementToDate = '';
          _clStatementSearchQuery = '';
          _clStatementSortOrder = 'oldest';
          _clStatementSelectMode = false;
          _clStatementSelectedIndices.clear();
          // Clear target so that it full-renders and resets the HTML state
          target.innerHTML = '';
          renderActiveSubtab();
        });
      }

      // Wire row checkboxes & action listeners
      document.querySelectorAll('.cl-stmt-row-cb').forEach(cb => {
        cb.addEventListener('change', (e) => {
          const idx = Number(e.target.dataset.index);
          if (e.target.checked) {
            _clStatementSelectedIndices.add(idx);
          } else {
            _clStatementSelectedIndices.delete(idx);
          }
          renderActiveSubtab();
        });
      });

      const clearActiveRowHighlights = () => {
        document.querySelectorAll('#clStmtTableBody tr').forEach(r => {
          r.classList.remove('cl-recon-active-row');
          if (r.dataset.origBg !== undefined) {
            r.style.background = r.dataset.origBg;
            r.style.boxShadow = '';
          }
        });
      };

      document.querySelectorAll('.cl-recon-ledger-btn').forEach(btn => {
        const tr = btn.closest('tr');
        if (tr) {
          tr.addEventListener('click', (ev) => {
            if (ev.target.closest('.cl-stmt-row-cb') || ev.target.closest('.cl-recon-clear-btn') || ev.target.closest('.cl-recon-ledger-btn')) return;
            btn.click();
          });
        }

        function goToPrevRow() {
          const allBtns = Array.from(document.querySelectorAll('.cl-recon-ledger-btn'));
          const currentBtnIdx = allBtns.indexOf(btn);
          if (currentBtnIdx > 0) {
            const prevBtn = allBtns[currentBtnIdx - 1];
            setTimeout(() => {
              prevBtn.focus();
              prevBtn.click();
            }, 50);
          }
        }

        btn.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault();
            btn.click();
          } else if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            if (btn.dataset.selectedId) {
              selectOptionAndAdvance('', 'none');
            } else {
              goToPrevRow();
            }
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            goToPrevRow();
          }
        });

        // Wire up initial clear button if present
        const initClearBtn = btn.querySelector('.cl-recon-clear-btn');
        if (initClearBtn) {
          initClearBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            selectOptionAndAdvance('', 'none');
          });
        }

        function selectOptionAndAdvance(selectedId, direction = 'next') {
          const origIdx = btn.dataset.index;
          const bankId = btn.dataset.accountId;

          window.KYA_STORE.statementLedgerMapping = window.KYA_STORE.statementLedgerMapping || {};
          if (selectedId) {
            window.KYA_STORE.statementLedgerMapping[`${bankId}_${origIdx}`] = selectedId;
          } else {
            delete window.KYA_STORE.statementLedgerMapping[`${bankId}_${origIdx}`];
          }

          const chosenLedger = allLedgers.find(l => String(l.id) === String(selectedId));
          btn.dataset.selectedId = selectedId || '';

          if (chosenLedger) {
            btn.style.background = '#eff6ff';
            btn.style.border = '1.5px solid #2563eb';
            btn.style.color = '#1e3a8a';
            btn.innerHTML = `
              <div style="display: flex; align-items: center; gap: 6px; min-width: 0;">
                <span style="color: #2563eb; font-weight: 800; font-size: 12px; background: rgba(37,99,235,0.15); border-radius: 4px; padding: 1px 4px;">✓</span>
                <span class="cl-recon-ledger-label" style="font-weight: 700; color: #1e3a8a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${ohEsc(chosenLedger.name)}
                </span>
              </div>
              <div style="display: flex; align-items: center; gap: 4px;">
                <span class="cl-recon-clear-btn" data-index="${origIdx}" data-account-id="${bankId}" title="Remove selection (Backspace)" style="background: rgba(220,38,38,0.1); color: #dc2626; border-radius: 4px; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; line-height: 1;">
                  <svg viewBox="0 0 15 15" fill="none" style="width: 13px; height: 13px; display: block;" stroke="currentColor">
                    <path d="M5.5 2h4M1.5 4h12M2.5 4l1 9.5a1 1 0 001 .5h6a1 1 0 001-.5l1-9.5M5.5 6.5v5M9.5 6.5v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                  </svg>
                </span>
                <span style="font-size: 8px; color: #3b82f6;">▼</span>
              </div>
            `;
          } else {
            btn.style.background = '#ffffff';
            btn.style.border = '1px solid var(--slate-300)';
            btn.style.color = 'var(--slate-400)';
            btn.innerHTML = `
              <span class="cl-recon-ledger-label" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--slate-400); font-weight: 500;">
                Select Ledger...
              </span>
              <span style="font-size: 9px; margin-left: 6px; color: var(--slate-400);">▼</span>
            `;
          }

          const dynamicClearBtn = btn.querySelector('.cl-recon-clear-btn');
          if (dynamicClearBtn) {
            dynamicClearBtn.addEventListener('click', (ev) => {
              ev.stopPropagation();
              selectOptionAndAdvance('', 'none');
            });
          }

          // Update live tab counter badges
          const curUnrecCount = displayRows.filter(r => !window.KYA_STORE.statementLedgerMapping[`${currentAcc.id}_${r.origIdx}`]).length;
          const curConfCount = displayRows.filter(r => !!window.KYA_STORE.statementLedgerMapping[`${currentAcc.id}_${r.origIdx}`]).length;
          const rBadge = document.querySelector('#clSubTabReconSection span');
          if (rBadge) rBadge.textContent = curUnrecCount;
          const cBadge = document.querySelector('#clSubTabConfirmSection span');
          if (cBadge) cBadge.textContent = curConfCount;

          clearActiveRowHighlights();
          const existingPopover = document.getElementById('clReconLedgerPopover');
          if (existingPopover) existingPopover.remove();

          if (typeof triggerAutoBackup === 'function') triggerAutoBackup();

          if (direction === 'next') {
            const allBtns = Array.from(document.querySelectorAll('.cl-recon-ledger-btn'));
            const currentBtnIdx = allBtns.indexOf(btn);
            if (currentBtnIdx > -1 && currentBtnIdx + 1 < allBtns.length) {
              const nextBtn = allBtns[currentBtnIdx + 1];
              setTimeout(() => {
                nextBtn.focus();
                nextBtn.click();
              }, 50);
            }
          } else if (direction === 'prev') {
            const allBtns = Array.from(document.querySelectorAll('.cl-recon-ledger-btn'));
            const currentBtnIdx = allBtns.indexOf(btn);
            if (currentBtnIdx > 0) {
              const prevBtn = allBtns[currentBtnIdx - 1];
              setTimeout(() => {
                prevBtn.focus();
                prevBtn.click();
              }, 50);
            }
          } else {
            btn.focus();
          }
        }

        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          
          const existingPopover = document.getElementById('clReconLedgerPopover');
          if (existingPopover) {
            const wasSameBtn = existingPopover.dataset.btnIndex === btn.dataset.index;
            clearActiveRowHighlights();
            existingPopover.remove();
            if (wasSameBtn) return;
          } else {
            clearActiveRowHighlights();
          }

          const origIdx = btn.dataset.index;
          const bankId = btn.dataset.accountId;
          const currentSelectedId = btn.dataset.selectedId || '';
          const currentSelectedLedger = allLedgers.find(l => String(l.id) === String(currentSelectedId));

          const tr = btn.closest('tr');
          if (tr) {
            if (tr.dataset.origBg === undefined) {
              tr.dataset.origBg = tr.style.background || '';
            }
            tr.classList.add('cl-recon-active-row');
            tr.style.background = '#dbeafe';
            tr.style.boxShadow = 'inset 4px 0 0 #2563eb';
            tr.style.transition = 'background 0.15s ease, box-shadow 0.15s ease';
          }

          const popover = document.createElement('div');
          popover.id = 'clReconLedgerPopover';
          popover.dataset.btnIndex = origIdx;
          popover.tabIndex = -1;

          const btnRect = btn.getBoundingClientRect();
          const popoverWidth = Math.max(280, Math.min(340, btnRect.width || 280));
          
          const spaceBelow = window.innerHeight - btnRect.bottom;
          const spaceAbove = btnRect.top;
          const placeAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
          const maxListHeight = Math.max(100, Math.min(220, (placeAbove ? spaceAbove : spaceBelow) - 70));

          popover.style.cssText = `
            position: fixed;
            z-index: 10000;
            width: ${popoverWidth}px;
            background: #ffffff;
            border: 1.5px solid #cbd5e1;
            border-radius: 10px;
            box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1);
            padding: 8px;
            font-family: Inter, sans-serif;
            box-sizing: border-box;
            outline: none;
          `;

          let leftPos = btnRect.right - popoverWidth;
          if (leftPos < 10) leftPos = Math.max(10, btnRect.left);
          if (leftPos + popoverWidth > window.innerWidth - 10) {
            leftPos = Math.max(10, window.innerWidth - popoverWidth - 10);
          }
          popover.style.left = `${leftPos}px`;

          if (placeAbove) {
            popover.style.bottom = `${window.innerHeight - btnRect.top + 4}px`;
            popover.style.top = 'auto';
          } else {
            popover.style.top = `${btnRect.bottom + 4}px`;
            popover.style.bottom = 'auto';
          }

          popover.innerHTML = `
            <div style="position: relative; margin-bottom: 6px;">
              <input type="text" id="clReconSearchInput" placeholder="Search ledger..." style="width: 100%; height: 32px; font-size: 12.5px; padding: 0 8px 0 28px; border: 1.5px solid #cbd5e1; border-radius: 6px; outline: none; box-sizing: border-box; font-family: inherit; background: #fff; color: #1e293b;" autocomplete="off" />
              <span style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); display: flex; align-items: center; color: #94a3b8; pointer-events: none;">
                <svg width="13" height="13" viewBox="0 0 17 17" fill="none">
                  <circle cx="7.5" cy="7.5" r="5" stroke="currentColor" stroke-width="1.8"/>
                  <path d="M11.5 11.5l3.5 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
              </span>
            </div>
            <div id="clReconLedgerList" style="max-height: ${maxListHeight}px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; scrollbar-width: thin;">
            </div>
          `;

          document.body.appendChild(popover);

          const searchInput = popover.querySelector('#clReconSearchInput');
          const listContainer = popover.querySelector('#clReconLedgerList');

          let activeIndex = 0;

          function getGroupDotColor(ledgerId) {
            const l = allLedgers.find(x => String(x.id) === String(ledgerId));
            if (!l) return '#94a3b8';
            if (l.type === 'customer') return '#10b981';
            if (l.type === 'supplier') return '#f59e0b';
            const sg = (typeof COA_SYS_SGS !== 'undefined') ? COA_SYS_SGS.find(s => s.id === l.sgId) : null;
            const GROUP_COLORS = {
              assets: '#3b82f6',
              'equity-liabilities': '#8b5cf6',
              income: '#10b981',
              expense: '#f59e0b',
            };
            return (sg && GROUP_COLORS[sg.main]) || '#94a3b8';
          }

          function highlightText(text, q) {
            if (!q) return ohEsc(text);
            const idx = text.toLowerCase().indexOf(q.toLowerCase());
            if (idx < 0) return ohEsc(text);
            return ohEsc(text.slice(0, idx)) +
              `<span class="cl-recon-hl" style="background: #fef08a; color: #854d0e; font-weight: 700; border-radius: 2px; padding: 0 1px;">${ohEsc(text.slice(idx, idx + q.length))}</span>` +
              ohEsc(text.slice(idx + q.length));
          }

          function handleCreateAction(createType, searchVal) {
            closePopover();
            const creationCtx = {
              returnTab: 'cashline',
              origIdx: origIdx,
              bankId: bankId,
              reconBankId: _clReconBankId,
              activeTopTab: _clActiveTopTab,
              activeBankingTab: _clActiveBankingTab,
              reconSubSection: _clReconSubSection,
              statementSearchQuery: _clStatementSearchQuery
            };
            window._clPendingReconCreation = creationCtx;
            const initialName = (searchVal || '').trim();
            if (createType === 'ledger') {
              if (typeof window.openMasterDeskCreateLedger === 'function') {
                window.openMasterDeskCreateLedger({
                  ...creationCtx,
                  initialName: initialName
                });
              }
            } else if (createType === 'customer') {
              if (typeof window.openMasterDeskCreateParty === 'function') {
                window.openMasterDeskCreateParty({
                  ...creationCtx,
                  type: 'customer',
                  initialName: initialName
                });
              }
            } else if (createType === 'supplier') {
              if (typeof window.openMasterDeskCreateParty === 'function') {
                window.openMasterDeskCreateParty({
                  ...creationCtx,
                  type: 'supplier',
                  initialName: initialName
                });
              }
            }
          }

          function updateHighlight() {
            const opts = Array.from(listContainer.querySelectorAll('.cl-recon-opt'));
            if (opts.length === 0) return;
            if (activeIndex < 0) activeIndex = 0;
            if (activeIndex >= opts.length) activeIndex = opts.length - 1;

            opts.forEach((opt, idx) => {
              const isHighlight = (idx === activeIndex);
              const isClearBtn = opt.dataset.id === '' && !opt.dataset.createType;
              const createType = opt.dataset.createType;
              const isSel = String(opt.dataset.id) === String(currentSelectedId) && !isClearBtn && !createType;
              const nameEl = opt.querySelector('.cl-recon-opt-name');
              const hlEls = opt.querySelectorAll('.cl-recon-hl');
              const grpEl = opt.querySelector('.cl-recon-opt-grp');
              const checkEl = opt.querySelector('.cl-recon-opt-check');

              if (createType) {
                if (createType === 'ledger') {
                  opt.style.background = isHighlight ? '#2563eb' : '#eff6ff';
                  opt.style.color = isHighlight ? '#ffffff' : '#2563eb';
                  if (nameEl) nameEl.style.color = isHighlight ? '#ffffff' : '#2563eb';
                } else if (createType === 'customer') {
                  opt.style.background = isHighlight ? '#059669' : '#ecfdf5';
                  opt.style.color = isHighlight ? '#ffffff' : '#059669';
                  if (nameEl) nameEl.style.color = isHighlight ? '#ffffff' : '#059669';
                } else if (createType === 'supplier') {
                  opt.style.background = isHighlight ? '#d97706' : '#fffbeb';
                  opt.style.color = isHighlight ? '#ffffff' : '#d97706';
                  if (nameEl) nameEl.style.color = isHighlight ? '#ffffff' : '#d97706';
                }
              } else if (isClearBtn) {
                if (isHighlight) {
                  opt.style.background = '#dc2626';
                  opt.style.color = '#ffffff';
                } else {
                  opt.style.background = '#fef2f2';
                  opt.style.color = '#dc2626';
                }
              } else if (isHighlight) {
                opt.style.background = '#2563eb';
                opt.style.color = '#ffffff';
                if (nameEl) nameEl.style.color = '#ffffff';
                hlEls.forEach(hl => {
                  hl.style.background = 'rgba(255, 255, 255, 0.3)';
                  hl.style.color = '#ffffff';
                });
                if (grpEl) grpEl.style.color = 'rgba(255, 255, 255, 0.8)';
                if (checkEl) checkEl.style.color = '#ffffff';
              } else if (isSel) {
                opt.style.background = '#eff6ff';
                opt.style.color = '#1e40af';
                if (nameEl) nameEl.style.color = '#1e40af';
                hlEls.forEach(hl => {
                  hl.style.background = '#fef08a';
                  hl.style.color = '#854d0e';
                });
                if (grpEl) grpEl.style.color = '#64748b';
                if (checkEl) checkEl.style.color = '#2563eb';
              } else {
                opt.style.background = 'transparent';
                opt.style.color = '#334155';
                if (nameEl) nameEl.style.color = '#1e293b';
                hlEls.forEach(hl => {
                  hl.style.background = '#fef08a';
                  hl.style.color = '#854d0e';
                });
                if (grpEl) grpEl.style.color = '#94a3b8';
                if (checkEl) checkEl.style.color = 'transparent';
              }

              if (isHighlight) {
                opt.scrollIntoView({ block: 'nearest' });
              }
            });
          }

          function renderOptions(filterQuery = '') {
            const query = filterQuery.toLowerCase().trim();
            const rawQuery = filterQuery.trim();

            const filtered = allLedgers.filter(l => {
              if (!query) return true;
              const nameMatch = l.name && l.name.toLowerCase().includes(query);
              const grp = (l.groupName || getLedgerGroup(l.id) || (l.type === 'customer' ? 'Customer' : (l.type === 'supplier' ? 'Supplier' : ''))).toLowerCase();
              const groupMatch = grp.includes(query);
              const aliasMatch = l.aliases && l.aliases.some(a => a.toLowerCase().includes(query));
              return nameMatch || groupMatch || aliasMatch;
            });

            if (query) {
              filtered.sort((a, b) => {
                const aStart = a.name.toLowerCase().startsWith(query) ? 0 : 1;
                const bStart = b.name.toLowerCase().startsWith(query) ? 0 : 1;
                return aStart - bStart || a.name.localeCompare(b.name);
              });
            }

            let html = '';

            if (currentSelectedId && !query) {
              html += `
                <div class="cl-recon-opt" data-id="" style="padding: 7px 10px; font-size: 12px; font-weight: 600; color: #dc2626; background: #fef2f2; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: background 0.1s ease; margin-bottom: 2px;">
                  <span style="font-size: 12px; line-height: 1;">✕</span>
                  <span>Clear Selection</span>
                </div>
              `;
            }

            if (filtered.length > 0) {
              filtered.forEach(l => {
                const isSel = String(l.id) === String(currentSelectedId);
                const groupName = l.groupName || getLedgerGroup(l.id) || (l.type === 'customer' ? 'Customer' : (l.type === 'supplier' ? 'Supplier' : ''));
                const dotColor = getGroupDotColor(l.id);

                html += `
                  <div class="cl-recon-opt" data-id="${l.id}" style="padding: 7px 10px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 8px; transition: background 0.1s ease; background: ${isSel ? '#eff6ff' : 'transparent'}; color: ${isSel ? '#1e40af' : '#334155'}; user-select: none;">
                    <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
                      <span style="width: 7px; height: 7px; border-radius: 50%; background: ${dotColor}; flex-shrink: 0;"></span>
                      <span class="cl-recon-opt-name" style="font-size: 12.5px; font-weight: ${isSel ? '700' : '500'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: ${isSel ? '#1e40af' : '#1e293b'};">
                        ${highlightText(l.name, query)}
                      </span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                      ${groupName ? `<span class="cl-recon-opt-grp" style="font-size: 10.5px; color: ${isSel ? '#64748b' : '#94a3b8'}; font-weight: 500; max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${ohEsc(groupName)}</span>` : ''}
                      ${isSel ? `<span class="cl-recon-opt-check" style="color: #2563eb; font-weight: 800; font-size: 12px;">✓</span>` : ''}
                    </div>
                  </div>
                `;
              });
            } else {
              html += `
                <div style="padding: 8px 6px 4px; font-size: 11.5px; font-weight: 600; color: #64748b; text-align: center;">No matching accounts</div>
                <div style="border-top: 1px dashed #e2e8f0; padding-top: 6px; margin-top: 4px; display: flex; flex-direction: column; gap: 4px;">
                  <div class="cl-recon-opt cl-recon-create-opt" data-create-type="ledger" style="padding: 7px 10px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: #2563eb; background: #eff6ff; border: 1px dashed #bfdbfe; transition: all 0.1s ease;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    <span class="cl-recon-opt-name" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Create Ledger ${rawQuery ? `"${ohEsc(rawQuery)}"` : ''}</span>
                  </div>
                </div>
              `;
            }

            listContainer.innerHTML = html;

            const opts = Array.from(listContainer.querySelectorAll('.cl-recon-opt'));
            opts.forEach((opt, idx) => {
              opt.addEventListener('mouseenter', () => {
                activeIndex = idx;
                updateHighlight();
              });
              opt.addEventListener('click', (ev) => {
                ev.stopPropagation();
                if (opt.dataset.createType) {
                  handleCreateAction(opt.dataset.createType, searchInput.value);
                } else {
                  closePopover();
                  selectOptionAndAdvance(opt.dataset.id, 'next');
                }
              });
            });

            if (currentSelectedId && !query) {
              const selIdx = opts.findIndex(o => String(o.dataset.id) === String(currentSelectedId));
              activeIndex = selIdx >= 0 ? selIdx : 0;
            } else {
              activeIndex = 0;
            }
            updateHighlight();
          }

          searchInput.addEventListener('input', () => {
            renderOptions(searchInput.value);
          });

          searchInput.addEventListener('focus', () => {
            searchInput.style.borderColor = '#2563eb';
            searchInput.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.15)';
          });
          searchInput.addEventListener('blur', () => {
            searchInput.style.borderColor = '#cbd5e1';
            searchInput.style.boxShadow = 'none';
          });

          renderOptions();

          const handleKeydown = (ev) => {
            const opts = Array.from(listContainer.querySelectorAll('.cl-recon-opt'));
            if (ev.key === 'ArrowDown') {
              ev.preventDefault();
              ev.stopPropagation();
              if (opts.length > 0) {
                activeIndex = (activeIndex + 1) % opts.length;
                updateHighlight();
              }
            } else if (ev.key === 'ArrowUp') {
              ev.preventDefault();
              ev.stopPropagation();
              if (opts.length > 0) {
                activeIndex = (activeIndex - 1 + opts.length) % opts.length;
                updateHighlight();
              }
            } else if (ev.key === 'Enter') {
              ev.preventDefault();
              ev.stopPropagation();
              if (opts.length > 0 && activeIndex >= 0 && activeIndex < opts.length) {
                const opt = opts[activeIndex];
                if (opt.dataset.createType) {
                  handleCreateAction(opt.dataset.createType, searchInput.value);
                } else {
                  const chosenId = opt.dataset.id;
                  closePopover();
                  selectOptionAndAdvance(chosenId, 'next');
                }
              }
            } else if (ev.key === 'Escape') {
              ev.preventDefault();
              ev.stopPropagation();
              closePopover();
              btn.focus();
            } else if (ev.key === 'Backspace' && searchInput.value === '') {
              ev.preventDefault();
              ev.stopPropagation();
              if (btn.dataset.selectedId) {
                closePopover();
                selectOptionAndAdvance('', 'none');
              } else {
                closePopover();
                goToPrevRow();
              }
            }
          };

          popover.addEventListener('keydown', handleKeydown);

          const closePopover = () => {
            if (tr) {
              tr.classList.remove('cl-recon-active-row');
              tr.style.background = tr.dataset.origBg || '';
              tr.style.boxShadow = '';
            }
            popover.remove();
            document.removeEventListener('click', closeHandler);
          };

          const closeHandler = (evt) => {
            if (!popover.contains(evt.target) && !btn.contains(evt.target)) {
              closePopover();
            }
          };
          setTimeout(() => {
            document.addEventListener('click', closeHandler);
            searchInput.focus();
          }, 10);
        });
      });

      document.getElementById('clStmtSelectAllCb')?.addEventListener('change', (e) => {
        if (e.target.checked) {
          reconTargetRows.forEach(r => _clStatementSelectedIndices.add(r.origIdx));
        } else {
          reconTargetRows.forEach(r => _clStatementSelectedIndices.delete(r.origIdx));
        }
        renderActiveSubtab();
      });

      document.getElementById('clBtnDeleteSelectedBatch')?.addEventListener('click', () => {
        if (_clStatementSelectedIndices.size > 0) {
          confirmDeleteStatementEntries(Array.from(_clStatementSelectedIndices), currentAcc.id, false);
        }
      });

      document.getElementById('clBtnExitSelectMode')?.addEventListener('click', () => {
        _clStatementSelectMode = false;
        _clStatementSelectedIndices.clear();
        renderActiveSubtab();
      });

      return;
    }

    // --- BOOKS MODE (Cash & Cash Equivalents general ledger cashbook) ---
    function evaluateMathExpression(str) {
      let clean = (str || '').toString().replace(/,/g, '').trim();
      if (!clean) return 0;
      clean = clean.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
      if (!/^[0-9.+\-*/()\s]+$/.test(clean)) {
        return NaN;
      }
      try {
        const result = Function(`"use strict"; return (${clean})`)();
        return typeof result === 'number' && isFinite(result) ? result : NaN;
      } catch (e) {
        return NaN;
      }
    }

    function parseAmt(str) {
      const cleanStr = (str || '').toString().replace(/,/g, '').trim();
      if (/[\+\-\*\/\%]/.test(cleanStr)) {
        const evalVal = evaluateMathExpression(cleanStr);
        if (!isNaN(evalVal)) {
          return evalVal;
        }
      }
      const v = parseFloat(cleanStr);
      return isNaN(v) ? 0 : v;
    }

    const cceAccounts = coaLedgers.filter(l => l.type === 'ledger' && l.sgId === 'sg-cce');
    if (cceAccounts.length === 0) {
      if (actionsArea) actionsArea.innerHTML = '';
      if (controls) controls.innerHTML = '';
      target.innerHTML = `
        <div style="padding: 48px; text-align: center; border: 1.5px dashed var(--slate-200); border-radius: 16px; background: var(--slate-50);">
          <div style="font-size: 32px; margin-bottom: 12px;">💸</div>
          <div style="font-size: 14.5px; font-weight: 700; color: var(--slate-700);">No Cash/Bank Accounts defined</div>
          <div style="font-size: 12.5px; color: var(--slate-400); margin-top: 4px;">Please create a Cash or Bank account in the Chart of Accounts first.</div>
        </div>
      `;
      return;
    }

    if (!_clCashbookAccountId) {
      _clCashbookAccountId = cceAccounts[0].id.toString();
    }

    const selectedLedger = cceAccounts.find(l => l.id.toString() === _clCashbookAccountId) || cceAccounts[0];
    const fromVal = _clCashflowDateFrom;
    const toVal = _clCashflowDateTo;

    const balData = calculateLedgerBalances(selectedLedger, fromVal, toVal);
    const openingBal = balData.openingBalance;
    const closingBal = balData.closingBalance;

    const cbLines = [];
    postedEntries.forEach(entry => {
      if (fromVal && entry.date < fromVal) return;
      if (toVal && entry.date > toVal) return;

      const selName = (selectedLedger?.name || '').trim().toLowerCase();

      (entry.allRows || []).forEach(row => {
        if ((row.particular || '').trim().toLowerCase() === selName) {
          const dr = parseFloat(row.debit) || 0;
          const cr = parseFloat(row.credit) || 0;

          if (dr > 0) {
            // Receipt into this ledger: look for opposite credit rows
            let oppRows = (entry.allRows || []).filter(r => (parseFloat(r.credit) || 0) > 0 && (r.particular || '').trim().toLowerCase() !== selName);
            if (oppRows.length === 0) {
              oppRows = (entry.allRows || []).filter(r => (r.particular || '').trim().toLowerCase() !== selName);
            }

            if (oppRows.length === 0) {
              cbLines.push({
                id: entry.id,
                date: entry.date,
                voucherNo: entry.voucherNo || '—',
                opposite: '—',
                narration: entry.narration || '',
                receipt: dr,
                payment: 0,
                uploadedDoc: entry.uploadedDoc || null
              });
            } else if (oppRows.length === 1) {
              cbLines.push({
                id: entry.id,
                date: entry.date,
                voucherNo: entry.voucherNo || '—',
                opposite: (oppRows[0].particular || '—').trim(),
                narration: entry.narration || '',
                receipt: dr,
                payment: 0,
                uploadedDoc: entry.uploadedDoc || null
              });
            } else {
              const totalOppCr = oppRows.reduce((sum, r) => sum + (parseFloat(r.credit) || 0), 0);
              oppRows.forEach(opp => {
                const oppCr = parseFloat(opp.credit) || 0;
                const lineAmt = totalOppCr > 0 ? (oppCr / totalOppCr) * dr : (dr / oppRows.length);
                cbLines.push({
                  id: entry.id,
                  date: entry.date,
                  voucherNo: entry.voucherNo || '—',
                  opposite: (opp.particular || '—').trim(),
                  narration: entry.narration || '',
                  receipt: lineAmt,
                  payment: 0,
                  uploadedDoc: entry.uploadedDoc || null
                });
              });
            }
          } else if (cr > 0) {
            // Payment out of this ledger: look for opposite debit rows
            let oppRows = (entry.allRows || []).filter(r => (parseFloat(r.debit) || 0) > 0 && (r.particular || '').trim().toLowerCase() !== selName);
            if (oppRows.length === 0) {
              oppRows = (entry.allRows || []).filter(r => (r.particular || '').trim().toLowerCase() !== selName);
            }

            if (oppRows.length === 0) {
              cbLines.push({
                id: entry.id,
                date: entry.date,
                voucherNo: entry.voucherNo || '—',
                opposite: '—',
                narration: entry.narration || '',
                receipt: 0,
                payment: cr,
                uploadedDoc: entry.uploadedDoc || null
              });
            } else if (oppRows.length === 1) {
              cbLines.push({
                id: entry.id,
                date: entry.date,
                voucherNo: entry.voucherNo || '—',
                opposite: (oppRows[0].particular || '—').trim(),
                narration: entry.narration || '',
                receipt: 0,
                payment: cr,
                uploadedDoc: entry.uploadedDoc || null
              });
            } else {
              const totalOppDr = oppRows.reduce((sum, r) => sum + (parseFloat(r.debit) || 0), 0);
              oppRows.forEach(opp => {
                const oppDr = parseFloat(opp.debit) || 0;
                const lineAmt = totalOppDr > 0 ? (oppDr / totalOppDr) * cr : (cr / oppRows.length);
                cbLines.push({
                  id: entry.id,
                  date: entry.date,
                  voucherNo: entry.voucherNo || '—',
                  opposite: (opp.particular || '—').trim(),
                  narration: entry.narration || '',
                  receipt: 0,
                  payment: lineAmt,
                  uploadedDoc: entry.uploadedDoc || null
                });
              });
            }
          } else {
            cbLines.push({
              id: entry.id,
              date: entry.date,
              voucherNo: entry.voucherNo || '—',
              opposite: getOppositeParticulars(entry, selectedLedger.name, true),
              narration: entry.narration || '',
              receipt: 0,
              payment: 0,
              uploadedDoc: entry.uploadedDoc || null
            });
          }
        }
      });
    });

    cbLines.sort((a, b) => a.date.localeCompare(b.date));

    let rowsHtml = `
      <tr style="background:#fafbfc; font-weight: 700;">
        <td colspan="3">Opening Balance</td>
        <td class="num-val">—</td>
        <td class="num-val">—</td>
        <td class="num-val" style="color:var(--slate-800);">${fmtAmt(openingBal)}</td>
      </tr>
    `;

    let runningBal = openingBal;
    let totalReceipt = 0;
    let totalPayment = 0;
    cbLines.forEach((line) => {
      totalReceipt += (line.receipt || 0);
      totalPayment += (line.payment || 0);
      runningBal = runningBal + line.receipt - line.payment;
      rowsHtml += `
        <tr>
          <td style="white-space: nowrap;">${formatToDDMMYYYY(line.date)}</td>
          <td style="white-space: nowrap;">
            <span style="font-family: monospace; font-weight: 700; color: var(--slate-700); cursor:pointer; text-decoration:underline dotted; white-space: nowrap;" 
                  onclick="window.viewVoucherFromStatement(${line.id})" title="Click to view voucher">${ohEsc(line.voucherNo)}</span>
            ${line.uploadedDoc && line.uploadedDoc.fileData ? `<span title="Attachment: ${typeof ohEsc === 'function' ? ohEsc(line.uploadedDoc.fileName) : line.uploadedDoc.fileName}" style="margin-left: 5px; color: #2563eb; display: inline-flex; vertical-align: middle;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></span>` : ''}
          </td>
          <td class="cl-cb-opp-cell" data-entry-id="${line.id}" data-target-opp="${ohEsc(line.opposite)}" style="cursor: pointer; position: relative;"
              title="Click to edit entry">
            <div>
              <div style="font-weight: 600; color: var(--slate-800);">${ohEsc(line.opposite)}</div>
              ${line.narration ? `<div style="font-size: 11.5px; color: var(--slate-400); font-weight: 500; margin-top: 2px;">${ohEsc(line.narration)}</div>` : ''}
            </div>
          </td>
          <td class="num-val" style="color: var(--emerald-600); white-space: nowrap;">${line.receipt > 0 ? fmtAmt(line.receipt) : '—'}</td>
          <td class="num-val" style="color: var(--red-600); white-space: nowrap;">${line.payment > 0 ? fmtAmt(line.payment) : '—'}</td>
          <td class="num-val" style="white-space: nowrap;">${fmtAmt(runningBal)}</td>
        </tr>
      `;
    });

    if (actionsArea) {
      actionsArea.innerHTML = `
        <div style="display: flex; gap: 8px; align-items: center;">
          <select id="clCbSelectAccount" class="cl-glass-control" style="cursor: pointer; width: 145px;">
            ${cceAccounts.map(a => `<option value="${a.id}" ${a.id.toString() === selectedLedger.id.toString() ? 'selected' : ''}>${ohEsc(a.name)}</option>`).join('')}
          </select>
          <input type="date" id="clCbFromDate" class="cl-glass-control" value="${fromVal}" style="width: 125px;" />
          <input type="date" id="clCbToDate" class="cl-glass-control" value="${toVal}" style="width: 125px;" />
          
          <!-- 3-dot more options dropdown -->
          <div class="rpt-more-wrap" style="position: relative;">
            <button class="rpt-more-btn" id="clBooksMoreBtn" title="More Options" type="button" aria-label="More Options">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="1.5"></circle>
                <circle cx="12" cy="5" r="1.5"></circle>
                <circle cx="12" cy="19" r="1.5"></circle>
              </svg>
            </button>
            <div class="rpt-more-dropdown" id="clBooksMoreDropdown" style="top: calc(100% + 8px); right: 0; min-width: 170px;">
              <!-- Export Submenu -->
              <div class="rpt-submenu-wrap" id="clBooksExportSubmenuWrap">
                <button class="rpt-menu-item rpt-submenu-btn" id="clBooksExportMenuBtn" type="button">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    <span>Export</span>
                  </div>
                  <svg class="rpt-submenu-caret" width="10" height="10" viewBox="0 0 14 14" fill="none">
                    <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                <div class="rpt-submenu-dropdown" id="clBooksExportSubmenu">
                  <button class="rpt-menu-item" id="clBooksExportPdf" type="button">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    PDF
                  </button>
                  <button class="rpt-menu-item" id="clBooksExportExcel" type="button">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="8" y1="13" x2="16" y2="17"></line>
                      <line x1="16" y1="13" x2="8" y2="17"></line>
                    </svg>
                    Excel
                  </button>
                </div>
              </div>
              <div class="rpt-menu-sep"></div>
              <button class="rpt-menu-item" id="clBooksConfigBtn" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1.51 1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                <span>Configuration</span>
              </button>
            </div>
          </div>
        </div>
      `;
      if (controls && controls !== actionsArea) {
        controls.innerHTML = '';
      }
      document.getElementById('clCbSelectAccount')?.addEventListener('change', (e) => {
        _clCashbookAccountId = e.target.value;
        renderActiveSubtab();
      });
      document.getElementById('clCbFromDate')?.addEventListener('change', (e) => {
        _clCashflowDateFrom = e.target.value;
        syncGlobalDates(_clCashflowDateFrom, _clCashflowDateTo);
        renderActiveSubtab();
      });
      document.getElementById('clCbToDate')?.addEventListener('change', (e) => {
        _clCashflowDateTo = e.target.value;
        syncGlobalDates(_clCashflowDateFrom, _clCashflowDateTo);
        renderActiveSubtab();
      });

      // 3-dot dropdown wiring
      const moreBtn = document.getElementById('clBooksMoreBtn');
      const moreDropdown = document.getElementById('clBooksMoreDropdown');
      const submenuWrap = document.getElementById('clBooksExportSubmenuWrap');
      const submenu = document.getElementById('clBooksExportSubmenu');
      const exportMenuBtn = document.getElementById('clBooksExportMenuBtn');

      if (moreBtn && moreDropdown) {
        moreBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          moreDropdown.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
          if (!moreDropdown.contains(e.target) && e.target !== moreBtn) {
            moreDropdown.classList.remove('open');
            if (submenu) submenu.classList.remove('open');
          }
        });
      }

      if (exportMenuBtn && submenu) {
        exportMenuBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          submenu.classList.toggle('open');
        });
      }

      let subCloseTimer = null;
      if (submenuWrap && submenu) {
        submenuWrap.addEventListener('mouseenter', () => {
          if (subCloseTimer) clearTimeout(subCloseTimer);
          submenu.classList.add('open');
        });
        submenuWrap.addEventListener('mouseleave', () => {
          subCloseTimer = setTimeout(() => {
            submenu.classList.remove('open');
          }, 300);
        });
        submenu.addEventListener('mouseenter', () => {
          if (subCloseTimer) clearTimeout(subCloseTimer);
          submenu.classList.add('open');
        });
      }

      document.getElementById('clBooksExportPdf')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        moreDropdown?.classList.remove('open');
        submenu?.classList.remove('open');
        const data = getCashbookExportData();
        if (data && typeof window.exportStatementToPDF === 'function') {
          await window.exportStatementToPDF(data);
        } else {
          console.error('exportStatementToPDF is not available');
        }
      });

      document.getElementById('clBooksExportExcel')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        moreDropdown?.classList.remove('open');
        submenu?.classList.remove('open');
        const data = getCashbookExportData();
        if (data && typeof window.exportStatementToExcel === 'function') {
          await window.exportStatementToExcel(data);
        } else {
          console.error('exportStatementToExcel is not available');
        }
      });

      document.getElementById('clBooksConfigBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        moreDropdown?.classList.remove('open');
        if (submenu) submenu.classList.remove('open');
        window._clOpenedConfigFromBooks = true;
        try { sessionStorage.setItem('kya_cl_opened_config_from_books', 'true'); } catch (err) {}
        if (typeof _settingsActiveTab !== 'undefined') _settingsActiveTab = 'cashline';
        if (typeof window._settingsActiveTab !== 'undefined') window._settingsActiveTab = 'cashline';
        if (typeof openTab === 'function') {
          openTab('settings');
        } else if (typeof window.openTab === 'function') {
          window.openTab('settings');
        }
        if (typeof switchSettingsTab === 'function') {
          switchSettingsTab('cashline');
        } else if (typeof window.switchSettingsTab === 'function') {
          window.switchSettingsTab('cashline');
        }
      });
    } else if (controls) {
      controls.innerHTML = `
        <div style="display: flex; gap: 8px; align-items: center;">
          <select id="clCbSelectAccount" class="je-input" style="height: 34px; font-size: 13px; padding: 0 8px; cursor: pointer; background: #fff; border-radius: 6px; width: 140px;">
            ${cceAccounts.map(a => `<option value="${a.id}" ${a.id.toString() === selectedLedger.id.toString() ? 'selected' : ''}>${ohEsc(a.name)}</option>`).join('')}
          </select>
          <input type="date" id="clCbFromDate" class="je-input" value="${fromVal}" style="height: 34px; font-size: 13px; padding: 0 8px; border-radius: 6px; width: 120px;" />
          <input type="date" id="clCbToDate" class="je-input" value="${toVal}" style="height: 34px; font-size: 13px; padding: 0 8px; border-radius: 6px; width: 120px;" />
          
          <!-- 3-dot more options dropdown -->
          <div class="rpt-more-wrap" style="position: relative;">
            <button class="rpt-more-btn" id="clBooksMoreBtn" title="More Options" type="button" aria-label="More Options" style="background: var(--slate-100); border: 1px solid var(--slate-200); color: var(--slate-700); height: 34px; width: 34px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="1.5"></circle>
                <circle cx="12" cy="5" r="1.5"></circle>
                <circle cx="12" cy="19" r="1.5"></circle>
              </svg>
            </button>
            <div class="rpt-more-dropdown" id="clBooksMoreDropdown" style="top: calc(100% + 8px); right: 0; min-width: 170px;">
              <!-- Export Submenu -->
              <div class="rpt-submenu-wrap" id="clBooksExportSubmenuWrap">
                <button class="rpt-menu-item rpt-submenu-btn" id="clBooksExportMenuBtn" type="button">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    <span>Export</span>
                  </div>
                  <svg class="rpt-submenu-caret" width="10" height="10" viewBox="0 0 14 14" fill="none">
                    <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                <div class="rpt-submenu-dropdown" id="clBooksExportSubmenu">
                  <button class="rpt-menu-item" id="clBooksExportPdf" type="button">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    PDF
                  </button>
                  <button class="rpt-menu-item" id="clBooksExportExcel" type="button">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="8" y1="13" x2="16" y2="17"></line>
                      <line x1="16" y1="13" x2="8" y2="17"></line>
                    </svg>
                    Excel
                  </button>
                </div>
              </div>
              <div class="rpt-menu-sep"></div>
              <button class="rpt-menu-item" id="clBooksConfigBtn" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1.51 1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                <span>Configuration</span>
              </button>
            </div>
          </div>
        </div>
      `;
      document.getElementById('clCbSelectAccount')?.addEventListener('change', (e) => {
        _clCashbookAccountId = e.target.value;
        renderActiveSubtab();
      });
      document.getElementById('clCbFromDate')?.addEventListener('change', (e) => {
        _clCashflowDateFrom = e.target.value;
        syncGlobalDates(_clCashflowDateFrom, _clCashflowDateTo);
        renderActiveSubtab();
      });
      document.getElementById('clCbToDate')?.addEventListener('change', (e) => {
        _clCashflowDateTo = e.target.value;
        syncGlobalDates(_clCashflowDateFrom, _clCashflowDateTo);
        renderActiveSubtab();
      });

      // 3-dot dropdown wiring (controls fallback)
      const moreBtn = document.getElementById('clBooksMoreBtn');
      const moreDropdown = document.getElementById('clBooksMoreDropdown');
      const submenuWrap = document.getElementById('clBooksExportSubmenuWrap');
      const submenu = document.getElementById('clBooksExportSubmenu');
      const exportMenuBtn = document.getElementById('clBooksExportMenuBtn');

      if (moreBtn && moreDropdown) {
        moreBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          moreDropdown.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
          if (!moreDropdown.contains(e.target) && e.target !== moreBtn) {
            moreDropdown.classList.remove('open');
            if (submenu) submenu.classList.remove('open');
          }
        });
      }

      if (exportMenuBtn && submenu) {
        exportMenuBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          submenu.classList.toggle('open');
        });
      }

      let subCloseTimer = null;
      if (submenuWrap && submenu) {
        submenuWrap.addEventListener('mouseenter', () => {
          if (subCloseTimer) clearTimeout(subCloseTimer);
          submenu.classList.add('open');
        });
        submenuWrap.addEventListener('mouseleave', () => {
          subCloseTimer = setTimeout(() => {
            submenu.classList.remove('open');
          }, 300);
        });
        submenu.addEventListener('mouseenter', () => {
          if (subCloseTimer) clearTimeout(subCloseTimer);
          submenu.classList.add('open');
        });
      }

      document.getElementById('clBooksExportPdf')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        moreDropdown?.classList.remove('open');
        submenu?.classList.remove('open');
        const data = getCashbookExportData();
        if (data && typeof window.exportStatementToPDF === 'function') {
          await window.exportStatementToPDF(data);
        } else {
          console.error('exportStatementToPDF is not available');
        }
      });

      document.getElementById('clBooksExportExcel')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        moreDropdown?.classList.remove('open');
        submenu?.classList.remove('open');
        const data = getCashbookExportData();
        if (data && typeof window.exportStatementToExcel === 'function') {
          await window.exportStatementToExcel(data);
        } else {
          console.error('exportStatementToExcel is not available');
        }
      });

      document.getElementById('clBooksConfigBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        moreDropdown?.classList.remove('open');
        if (submenu) submenu.classList.remove('open');
        window._clOpenedConfigFromBooks = true;
        try { sessionStorage.setItem('kya_cl_opened_config_from_books', 'true'); } catch (err) {}
        if (typeof _settingsActiveTab !== 'undefined') _settingsActiveTab = 'cashline';
        if (typeof window._settingsActiveTab !== 'undefined') window._settingsActiveTab = 'cashline';
        if (typeof openTab === 'function') {
          openTab('settings');
        } else if (typeof window.openTab === 'function') {
          window.openTab('settings');
        }
        if (typeof switchSettingsTab === 'function') {
          switchSettingsTab('cashline');
        } else if (typeof window.switchSettingsTab === 'function') {
          window.switchSettingsTab('cashline');
        }
      });
    }

    const oppOpts = (typeof coaLedgers !== 'undefined' ? coaLedgers : [])
      .filter(l => l.type === 'ledger' && (!selectedLedger || l.id !== selectedLedger.id))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(l => `<option value="${l.id}">${ohEsc(l.name)}</option>`)
      .join('');

    const pendingState = window._clPendingQuickEntryState;
    const todayStr = (pendingState && pendingState.quickDate) ? pendingState.quickDate : new Date().toISOString().split('T')[0];
    const nextVoucher = (pendingState && pendingState.quickVoucher) ? pendingState.quickVoucher : ((typeof genVoucherNo === 'function') ? genVoucherNo() : `JV-${new Date().getFullYear()}-${String(typeof jvCounter !== 'undefined' ? jvCounter : 1).padStart(3, '0')}`);
    const initialType = (pendingState && pendingState.quickType) ? pendingState.quickType : '';
    const initialAmount = (pendingState && pendingState.quickAmount) ? pendingState.quickAmount : '';
    const initialLedgerId = (pendingState && pendingState.quickLedgerId) ? pendingState.quickLedgerId : '';
    const initialLedgerName = (pendingState && pendingState.quickLedgerSearch) ? pendingState.quickLedgerSearch : '';

    target.innerHTML = `
      <!-- Quick Direct Entry Bar -->
      <div class="cl-quick-entry-bar" style="background: #ffffff; border: 1.5px solid var(--slate-200); border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        <div style="display: flex; align-items: flex-end; gap: 10px; flex-wrap: wrap; width: 100%;">
          <!-- Date -->
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <label style="font-size: 11px; font-weight: 700; color: var(--slate-500); text-transform: uppercase; letter-spacing: 0.04em;">Date</label>
            <input type="date" id="clQuickEntryDate" class="je-input" value="${todayStr}" style="height: 34px; font-size: 12.5px; font-weight: 600; padding: 0 8px; border-radius: 6px; width: 130px;" />
          </div>

          <!-- Voucher No -->
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <label style="font-size: 11px; font-weight: 700; color: var(--slate-500); text-transform: uppercase; letter-spacing: 0.04em;">Voucher No.</label>
            <input type="text" id="clQuickEntryVoucher" class="je-input" value="${nextVoucher}" placeholder="Voucher No" style="height: 34px; font-size: 12.5px; font-weight: 600; padding: 0 8px; border-radius: 6px; width: 120px;" />
          </div>

          <!-- Ledger (Searchable) -->
          <div style="display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 200px;">
            <label style="font-size: 11px; font-weight: 700; color: var(--slate-500); text-transform: uppercase; letter-spacing: 0.04em;">Ledger</label>
            <div class="cl-searchable-ledger-wrap" style="position: relative; width: 100%;">
              <input type="text" id="clQuickEntryLedgerSearch" class="je-input" value="${ohEsc(initialLedgerName)}" placeholder="Search or select Ledger..." autocomplete="off" style="height: 34px; font-size: 12.5px; font-weight: 600; padding: 0 28px 0 10px; border-radius: 6px; width: 100%; cursor: pointer;" />
              <input type="hidden" id="clQuickEntryLedger" value="${ohEsc(initialLedgerId)}" />
              <span style="position: absolute; right: 9px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--slate-400); font-size: 10px;">▼</span>

              <div id="clQuickEntryLedgerDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #ffffff; border: 1.5px solid var(--slate-200); border-radius: 8px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1); z-index: 1000; padding: 6px; max-height: 240px; overflow-y: auto; box-sizing: border-box;">
                <div id="clQuickEntryLedgerOptions" style="display: flex; flex-direction: column; gap: 2px;"></div>
              </div>
            </div>
          </div>

          <!-- Receipt / Payment dropdown -->
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <label style="font-size: 11px; font-weight: 700; color: var(--slate-500); text-transform: uppercase; letter-spacing: 0.04em;">Receipt / Payment</label>
            <select id="clQuickEntryType" class="je-input" style="height: 34px; font-size: 12.5px; font-weight: 600; padding: 0 8px; cursor: pointer; background: #fff; border-radius: 6px; width: 140px;">
              <option value="" ${!initialType ? 'selected' : ''} disabled hidden>Select</option>
              <option value="Receipt" ${initialType === 'Receipt' ? 'selected' : ''}>Receipt</option>
              <option value="Payment" ${initialType === 'Payment' ? 'selected' : ''}>Payment</option>
            </select>
          </div>

          <!-- Amount -->
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <label style="font-size: 11px; font-weight: 700; color: var(--slate-500); text-transform: uppercase; letter-spacing: 0.04em;">Amount (₹)</label>
            <input type="text" inputmode="decimal" id="clQuickEntryAmount" class="je-input" value="${ohEsc(initialAmount)}" placeholder="0.00" style="height: 34px; font-size: 12.5px; font-weight: 600; padding: 0 8px; border-radius: 6px; width: 115px;" />
          </div>

          <!-- Post Button -->
          <div style="display: flex; align-items: flex-end;">
            <button id="clBtnQuickPost" class="btn btn-primary" style="height: 34px; padding: 0 18px; font-size: 13px; font-weight: 700; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; white-space: nowrap;">
              <svg viewBox="0 0 20 20" fill="none" width="14" height="14" style="stroke: currentColor; stroke-width: 2.2;">
                <path d="M4 10l4 4 8-8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Post
            </button>
          </div>
        </div>
      </div>

      <div class="recon-stats" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 20px; padding: 12px 16px;">
        <div class="recon-stat-card">
          <span class="recon-stat-label">Opening Balance</span>
          <span class="recon-stat-val">${fmtAmt(openingBal)}</span>
        </div>
        <div class="recon-stat-card">
          <span class="recon-stat-label">Total Receipt</span>
          <span class="recon-stat-val" style="color: var(--emerald-600);">${fmtAmt(totalReceipt)}</span>
        </div>
        <div class="recon-stat-card">
          <span class="recon-stat-label">Total Payment</span>
          <span class="recon-stat-val" style="color: var(--red-600);">${fmtAmt(totalPayment)}</span>
        </div>
        <div class="recon-stat-card">
          <span class="recon-stat-label">Closing Balance</span>
          <span class="recon-stat-val" style="color:var(--blue-700);">${fmtAmt(closingBal)}</span>
        </div>
      </div>

      <div style="border: 1.5px solid var(--slate-200); border-radius: 12px; max-height: 480px; overflow-y: auto; background: #fff;">
        <table class="cl-table">
          <thead>
            <tr>
              <th style="width: 110px; white-space: nowrap;">Date</th>
              <th style="width: 110px; white-space: nowrap;">Voucher</th>
              <th>Ledger</th>
              <th style="text-align: right; width: 120px;">Receipt</th>
              <th style="text-align: right; width: 120px;">Payment</th>
              <th style="text-align: right; width: 130px;">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;

    const getAvailableLedgerList = () => {
      const list = (typeof coaLedgers !== 'undefined' ? coaLedgers : [])
        .filter(l => l.type === 'ledger' && (!selectedLedger || l.id !== selectedLedger.id))
        .map(l => ({ id: l.id, name: l.name }));

      const existingNames = new Set(list.map(l => (l.name || '').trim().toLowerCase()));

      const customers = (typeof getKyaCustomers === 'function' ? getKyaCustomers() : (window.KYA_STORE?.customers || []));
      customers.forEach(c => {
        if (c && c.name && !existingNames.has(c.name.trim().toLowerCase())) {
          list.push({ id: `cust_${c.id}`, name: c.name, isCustomer: true });
          existingNames.add(c.name.trim().toLowerCase());
        }
      });

      const suppliers = (typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : (window.KYA_STORE?.suppliers || []));
      suppliers.forEach(s => {
        if (s && s.name && !existingNames.has(s.name.trim().toLowerCase())) {
          list.push({ id: `supp_${s.id}`, name: s.name, isSupplier: true });
          existingNames.add(s.name.trim().toLowerCase());
        }
      });

      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      return list;
    };

    // Searchable Ledger Setup
    const setupSearchableLedger = () => {
      const searchInp = document.getElementById('clQuickEntryLedgerSearch');
      const hiddenInp = document.getElementById('clQuickEntryLedger');
      const dropdown = document.getElementById('clQuickEntryLedgerDropdown');
      const optionsContainer = document.getElementById('clQuickEntryLedgerOptions');
      const wrap = searchInp?.closest('.cl-searchable-ledger-wrap');

      if (!searchInp || !hiddenInp || !dropdown || !optionsContainer) return;

      const availableLedgers = getAvailableLedgerList();

      let highlightedIndex = -1;
      let currentFiltered = [];

      const renderOptions = (filterText = '') => {
        optionsContainer.innerHTML = '';
        const q = filterText.toLowerCase().trim();

        currentFiltered = availableLedgers.filter(l => {
          if (!q) return true;
          return (l.name || '').toLowerCase().includes(q);
        });

        if (currentFiltered.length === 0) {
          optionsContainer.innerHTML = `
            <div style="padding: 8px 6px 4px; font-size: 11.5px; font-weight: 600; color: var(--slate-400); text-align: center;">No matching ledgers</div>
            <div style="border-top: 1px dashed var(--slate-200); padding-top: 6px; margin-top: 4px; display: flex; flex-direction: column; gap: 4px;">
              <div class="cl-ledger-create-btn" data-create-type="ledger" style="padding: 7px 10px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: #2563eb; background: #eff6ff; border: 1px dashed #bfdbfe; transition: all 0.1s ease;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>Create Ledger ${q ? `"${ohEsc(filterText.trim())}"` : ''}</span>
              </div>
            </div>
          `;
          attachCreateListeners();
          return;
        }

        currentFiltered.forEach((l, idx) => {
          const isSelected = hiddenInp.value === String(l.id);
          const item = document.createElement('div');
          item.className = 'cl-ledger-opt-item';
          item.dataset.index = idx;
          item.dataset.id = l.id;
          item.style.cssText = `
            padding: 8px 12px;
            font-size: 13px;
            border-radius: 6px;
            cursor: pointer;
            background: ${isSelected ? 'var(--blue-50)' : 'transparent'};
            color: ${isSelected ? 'var(--blue-700)' : 'var(--slate-800)'};
            font-weight: ${isSelected ? '700' : '500'};
            transition: all 0.12s ease;
          `;
          item.textContent = l.name;

          item.addEventListener('mouseenter', () => {
            highlightedIndex = idx;
            updateHighlight();
          });

          item.addEventListener('click', (e) => {
            e.stopPropagation();
            selectLedger(l);
          });

          optionsContainer.appendChild(item);
        });

        if (q) {
          const createSection = document.createElement('div');
          createSection.style.cssText = 'border-top: 1px dashed var(--slate-200); padding-top: 6px; margin-top: 6px; display: flex; flex-direction: column; gap: 4px;';
          createSection.innerHTML = `
            <div class="cl-ledger-create-btn" data-create-type="ledger" style="padding: 6px 10px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 11.5px; font-weight: 600; color: #2563eb; background: #eff6ff; border: 1px dashed #bfdbfe; transition: all 0.1s ease;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              <span>Create Ledger "${ohEsc(filterText.trim())}"</span>
            </div>
          `;
          optionsContainer.appendChild(createSection);
        }

        attachCreateListeners();

        highlightedIndex = 0;
        updateHighlight();
      };

      const attachCreateListeners = () => {
        optionsContainer.querySelectorAll('.cl-ledger-create-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleQuickCreate(btn.dataset.createType, searchInp.value);
          });
        });
      };

      const handleQuickCreate = (createType, name) => {
        dropdown.style.display = 'none';
        const initialName = (name || searchInp.value || '').trim();
        const ctx = {
          returnTab: 'cashline',
          isCashbookQuickEntry: true,
          activeTopTab: typeof _clActiveTopTab !== 'undefined' ? _clActiveTopTab : 'banking',
          activeBankingTab: typeof _clActiveBankingTab !== 'undefined' ? _clActiveBankingTab : 'books',
          cashbookAccountId: typeof _clCashbookAccountId !== 'undefined' ? _clCashbookAccountId : null,
          quickDate: document.getElementById('clQuickEntryDate')?.value || '',
          quickVoucher: document.getElementById('clQuickEntryVoucher')?.value || '',
          quickType: document.getElementById('clQuickEntryType')?.value || 'Receipt',
          quickAmount: document.getElementById('clQuickEntryAmount')?.value || '',
          quickLedgerSearch: initialName,
          initialName: initialName
        };
        window._clPendingQuickEntryState = ctx;

        if (createType === 'ledger') {
          if (typeof window.openMasterDeskCreateLedger === 'function') {
            window.openMasterDeskCreateLedger(ctx);
          } else {
            const newId = Date.now() + Math.floor(Math.random() * 1000);
            if (typeof coaLedgers !== 'undefined' && initialName) {
              coaLedgers.push({
                id: newId,
                sgId: 'sg-oe',
                glId: null,
                name: initialName,
                code: '',
                openingBalance: 0,
                type: 'ledger'
              });
              hiddenInp.value = newId;
              searchInp.value = initialName;
              window._clPendingQuickEntryState = null;
              showToast(`Ledger "${initialName}" created.`, 'success');
              document.getElementById('clQuickEntryAmount')?.focus();
            }
          }
        } else if (createType === 'customer') {
          if (typeof window.openMasterDeskCreateParty === 'function') {
            window.openMasterDeskCreateParty({ ...ctx, type: 'customer' });
          } else {
            const newId = Date.now() + Math.floor(Math.random() * 1000);
            if (initialName) {
              if (window.KYA_STORE && Array.isArray(window.KYA_STORE.customers)) {
                window.KYA_STORE.customers.push({ id: newId, name: initialName });
              }
              hiddenInp.value = `cust_${newId}`;
              searchInp.value = initialName;
              window._clPendingQuickEntryState = null;
              showToast(`Customer "${initialName}" created.`, 'success');
              document.getElementById('clQuickEntryAmount')?.focus();
            }
          }
        } else if (createType === 'supplier') {
          if (typeof window.openMasterDeskCreateParty === 'function') {
            window.openMasterDeskCreateParty({ ...ctx, type: 'supplier' });
          } else {
            const newId = Date.now() + Math.floor(Math.random() * 1000);
            if (initialName) {
              if (window.KYA_STORE && Array.isArray(window.KYA_STORE.suppliers)) {
                window.KYA_STORE.suppliers.push({ id: newId, name: initialName });
              }
              hiddenInp.value = `supp_${newId}`;
              searchInp.value = initialName;
              window._clPendingQuickEntryState = null;
              showToast(`Vendor "${initialName}" created.`, 'success');
              document.getElementById('clQuickEntryAmount')?.focus();
            }
          }
        }
      };

      if (pendingState) {
        window._clPendingQuickEntryState = null;
        if (initialLedgerId) {
          setTimeout(() => document.getElementById('clQuickEntryAmount')?.focus(), 60);
        } else {
          setTimeout(() => document.getElementById('clQuickEntryLedgerSearch')?.focus(), 60);
        }
      }

      const updateHighlight = () => {
        const items = optionsContainer.querySelectorAll('.cl-ledger-opt-item');
        items.forEach((it, i) => {
          if (i === highlightedIndex) {
            it.style.background = 'var(--blue-50)';
            it.style.color = 'var(--blue-700)';
            it.scrollIntoView({ block: 'nearest' });
          } else {
            const isSel = hiddenInp.value === it.dataset.id;
            it.style.background = isSel ? 'var(--blue-50)' : 'transparent';
            it.style.color = isSel ? 'var(--blue-700)' : 'var(--slate-800)';
          }
        });
      };

      const selectLedger = (l) => {
        hiddenInp.value = l.id;
        searchInp.value = l.name;
        dropdown.style.display = 'none';
        document.getElementById('clQuickEntryAmount')?.focus();
      };

      const openDropdown = () => {
        renderOptions(searchInp.value);
        dropdown.style.display = 'block';
      };

      const closeDropdown = () => {
        dropdown.style.display = 'none';
      };

      searchInp.addEventListener('focus', () => {
        searchInp.select();
        openDropdown();
      });

      searchInp.addEventListener('click', () => {
        openDropdown();
      });

      searchInp.addEventListener('input', (e) => {
        hiddenInp.value = '';
        openDropdown();
        renderOptions(e.target.value);
      });

      searchInp.addEventListener('keydown', (e) => {
        if (dropdown.style.display === 'none') {
          if (e.key === 'ArrowDown' || e.key === 'Enter') {
            openDropdown();
            return;
          }
        }

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (highlightedIndex < currentFiltered.length - 1) {
            highlightedIndex++;
            updateHighlight();
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (highlightedIndex > 0) {
            highlightedIndex--;
            updateHighlight();
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (currentFiltered[highlightedIndex]) {
            selectLedger(currentFiltered[highlightedIndex]);
          }
        } else if (e.key === 'Escape') {
          closeDropdown();
        }
      });

      document.addEventListener('click', (e) => {
        if (wrap && !wrap.contains(e.target)) {
          closeDropdown();
        }
      });
    };

    setupSearchableLedger();

    // ── Opposite Account cell click → Journal Voucher edit modal ────────
    const setupOppCellPopovers = () => {
      const POPOVER_ID = 'clCbOppPopover';

      const removePopover = () => {
        document.getElementById(POPOVER_ID)?.remove();
      };

      document.querySelectorAll('.cl-cb-opp-cell').forEach(cell => {
        cell.addEventListener('click', (e) => {
          e.stopPropagation();
          removePopover();

          const entryId = cell.dataset.entryId;
          const entry = (typeof postedEntries !== 'undefined' ? postedEntries : [])
            .find(en => String(en.id) === String(entryId));
          if (!entry) return;

          const currentNarration = entry.narration || '';
          const currentDeptId    = entry.departmentId || '';
          const currentIsBudget  = !!entry.isBudget;

          const depts = (typeof ohDepartments !== 'undefined' ? ohDepartments : []).filter(d => d.id !== 'all');
          // Build Department options
          const deptOptions = depts.map(d =>
            `<option value="${d.id}" ${String(d.id) === String(currentDeptId) ? 'selected' : ''}>${ohEsc(d.name)}</option>`
          ).join('');

          // ── Clean Edit Entry modal ──
          const overlay = document.createElement('div');
          overlay.className = 'fj-overlay';
          overlay.id = POPOVER_ID;
          overlay.setAttribute('tabindex', '-1');

          overlay.innerHTML = `
            <div class="fj-card" style="width:min(96vw,540px);" onclick="event.stopPropagation()">

              <!-- Header -->
              <div class="fj-head" style="background:linear-gradient(90deg,#2563eb,#3b82f6);display:flex;justify-content:space-between;align-items:center;padding:18px 24px;">
                <div>
                  <div class="fj-head-title" style="font-size:16px;font-weight:700;">Edit Entry</div>
                  <div class="fj-head-sub" style="font-size:12px;opacity:0.85;">${ohEsc(entry.voucherNo || '—')} &nbsp;·&nbsp; ${ohEsc(entry.date || '—')}</div>
                </div>
                <button class="fj-close-btn" id="clCbOppClose">✕</button>
              </div>

              <!-- Body -->
              <div class="fj-body" style="padding:22px 24px 24px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px 18px;">

                  <!-- Department -->
                  <div>
                    <label style="font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.07em;display:block;margin-bottom:6px;">Department</label>
                    <select id="clOppPopDept" style="width:100%;height:38px;font-size:13px;font-weight:600;padding:0 10px;border:1.5px solid #e2e8f0;border-radius:8px;background:#fff;color:#1e293b;cursor:pointer;box-sizing:border-box;outline:none;font-family:var(--font-main);">
                      <option value="">— Select Department —</option>
                      ${deptOptions}
                    </select>
                  </div>

                  <!-- Transaction Type -->
                  <div>
                    <label style="font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.07em;display:block;margin-bottom:6px;">Transaction Type</label>
                    <div style="display:inline-flex;align-items:center;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:9px;padding:2px;height:38px;box-sizing:border-box;user-select:none;">
                      <button type="button" id="clOppPopNonBudgetBtn"
                        style="border:none;cursor:pointer;padding:6px 16px;font-size:12px;font-weight:700;border-radius:7px;font-family:var(--font-main);transition:all 0.15s ease;${!currentIsBudget ? 'background:#2563eb;color:#ffffff;box-shadow:0 1px 4px rgba(37,99,235,0.3);' : 'background:transparent;color:#64748b;'}">Non-Budget</button>
                      <button type="button" id="clOppPopBudgetBtn"
                        style="border:none;cursor:pointer;padding:6px 16px;font-size:12px;font-weight:700;border-radius:7px;font-family:var(--font-main);transition:all 0.15s ease;${currentIsBudget ? 'background:#2563eb;color:#ffffff;box-shadow:0 1px 4px rgba(37,99,235,0.3);' : 'background:transparent;color:#64748b;'}">Budget</button>
                    </div>
                  </div>

                  <!-- Narration (full width) -->
                  <div style="grid-column:1/-1;">
                    <label style="font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.07em;display:block;margin-bottom:6px;">Narration</label>
                    <input type="text" id="clOppPopNarration"
                      value="${ohEsc(currentNarration)}"
                      placeholder="Enter narration…"
                      style="width:100%;height:38px;font-size:13px;font-weight:500;padding:0 12px;border:1.5px solid #e2e8f0;border-radius:8px;box-sizing:border-box;outline:none;color:#1e293b;font-family:var(--font-main);" />
                  </div>

                  <!-- Upload Document / Attachment (full width) -->
                  <div style="grid-column:1/-1;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                      <label style="font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.07em;display:flex;align-items:gap:5px;margin:0;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                        </svg>
                        &nbsp;Upload Document / Attachment
                      </label>
                      <span id="clOppDocStatusBadge" style="display:${entry.uploadedDoc && entry.uploadedDoc.fileData ? 'inline-block' : 'none'};font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:#ecfdf5;color:#059669;text-transform:uppercase;">Attached</span>
                    </div>

                    <input type="file" id="clOppDocFileInput" style="display:none;" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv,.zip" />

                    <div id="clOppDocDropzone" style="border:1.5px dashed #cbd5e1;border-radius:10px;padding:12px 14px;text-align:center;background:#ffffff;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.borderColor='#2563eb';this.style.background='#eff6ff';" onmouseout="this.style.borderColor='#cbd5e1';this.style.background='#ffffff';">
                      
                      <!-- Empty State -->
                      <div id="clOppDocEmptyState" style="display:${entry.uploadedDoc && entry.uploadedDoc.fileData ? 'none' : 'flex'};align-items:center;justify-content:center;gap:10px;">
                        <div style="width:28px;height:28px;border-radius:50%;background:#f8fafc;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;color:#2563eb;flex-shrink:0;">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                          </svg>
                        </div>
                        <div style="display:flex;flex-direction:column;align-items:flex-start;text-align:left;">
                          <span style="font-size:12.5px;font-weight:600;color:#334155;">Click or Drag to Upload Document</span>
                          <span style="font-size:10.5px;color:#94a3b8;">PDF, Image, Excel, Word (Max 10MB)</span>
                        </div>
                      </div>

                      <!-- Selected State -->
                      <div id="clOppDocSelectedState" style="display:${entry.uploadedDoc && entry.uploadedDoc.fileData ? 'flex' : 'none'};align-items:center;justify-content:space-between;gap:10px;">
                        <div style="display:flex;align-items:center;gap:10px;overflow:hidden;">
                          <div id="clOppDocFileIcon" style="width:30px;height:30px;border-radius:6px;background:#dbeafe;color:#1e40af;font-size:9.5px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;text-transform:uppercase;">
                            ${((entry.uploadedDoc?.fileName || '').split('.').pop() || 'DOC').toUpperCase().substring(0, 4)}
                          </div>
                          <div style="display:flex;flex-direction:column;align-items:flex-start;overflow:hidden;text-align:left;">
                            <span id="clOppDocFileName" style="font-size:12.5px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;">
                              ${ohEsc(entry.uploadedDoc?.fileName || '')}
                            </span>
                            <span id="clOppDocFileSize" style="font-size:10.5px;color:#64748b;font-weight:500;">
                              ${ohEsc(entry.uploadedDoc?.fileSize || '')}
                            </span>
                          </div>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                          <a id="clOppDocPreviewBtn" href="${entry.uploadedDoc?.fileData || '#'}" download="${ohEsc(entry.uploadedDoc?.fileName || 'document')}" target="_blank" style="padding:4px 9px;font-size:11.5px;font-weight:600;color:#2563eb;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;text-decoration:none;display:inline-flex;align-items:center;gap:4px;" title="Download / View document">
                            View
                          </a>
                          <button id="clOppDocRemoveBtn" type="button" style="background:none;border:none;color:#dc2626;cursor:pointer;padding:4px;border-radius:4px;display:flex;align-items:center;" title="Remove document">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"/>
                              <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>

                <!-- Actions -->
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:22px;">
                  <button id="clOppPopCancel" style="height:38px;padding:0 20px;font-size:13px;font-weight:600;border-radius:9px;border:1.5px solid #e2e8f0;background:#fff;color:#475569;cursor:pointer;font-family:var(--font-main);">Cancel</button>
                  <button id="clOppPopSave" style="height:38px;padding:0 22px;font-size:13px;font-weight:700;border-radius:9px;border:none;background:#2563eb;color:#fff;cursor:pointer;box-shadow:0 2px 8px rgba(37,99,235,0.28);font-family:var(--font-main);display:inline-flex;align-items:center;gap:6px;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Save Changes
                  </button>
                </div>

              </div><!-- /fj-body -->
            </div><!-- /fj-card -->
          `;

          document.body.appendChild(overlay);

          // ── Document upload state & handlers ──
          let currentUploadedDoc = entry.uploadedDoc || null;

          const formatDocBytes = (bytes) => {
            if (!bytes || bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
          };

          const updateDocUI = (doc) => {
            currentUploadedDoc = doc;
            const emptyState = document.getElementById('clOppDocEmptyState');
            const selectedState = document.getElementById('clOppDocSelectedState');
            const badge = document.getElementById('clOppDocStatusBadge');
            const nameEl = document.getElementById('clOppDocFileName');
            const sizeEl = document.getElementById('clOppDocFileSize');
            const iconEl = document.getElementById('clOppDocFileIcon');
            const previewBtn = document.getElementById('clOppDocPreviewBtn');
            const fileInp = document.getElementById('clOppDocFileInput');

            if (!doc || !doc.fileData) {
              if (emptyState) emptyState.style.display = 'flex';
              if (selectedState) selectedState.style.display = 'none';
              if (badge) badge.style.display = 'none';
              if (fileInp) fileInp.value = '';
              return;
            }

            if (emptyState) emptyState.style.display = 'none';
            if (selectedState) selectedState.style.display = 'flex';
            if (badge) badge.style.display = 'inline-block';

            if (nameEl) nameEl.textContent = doc.fileName || 'Attachment';
            if (sizeEl) sizeEl.textContent = doc.fileSize || formatDocBytes(doc.fileBytes || 0);

            const ext = (doc.fileName || '').split('.').pop().toUpperCase();
            if (iconEl) {
              iconEl.textContent = ext.substring(0, 4) || 'DOC';
              if (['PDF'].includes(ext)) {
                iconEl.style.background = '#fee2e2'; iconEl.style.color = '#991b1b';
              } else if (['JPG','JPEG','PNG','WEBP'].includes(ext)) {
                iconEl.style.background = '#e0e7ff'; iconEl.style.color = '#3730a3';
              } else if (['XLS','XLSX','CSV'].includes(ext)) {
                iconEl.style.background = '#dcfce7'; iconEl.style.color = '#166534';
              } else {
                iconEl.style.background = '#dbeafe'; iconEl.style.color = '#1e40af';
              }
            }

            if (previewBtn) {
              previewBtn.href = doc.fileData;
              previewBtn.download = doc.fileName || 'document';
            }
          };

          const handleDocUpload = (file) => {
            if (!file) return;
            if (file.size > 10 * 1024 * 1024) {
              showToast('File size exceeds 10MB limit.', 'error');
              return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
              const doc = {
                fileName: file.name,
                fileSize: formatDocBytes(file.size),
                fileBytes: file.size,
                fileData: ev.target.result
              };
              updateDocUI(doc);
              showToast(`Document "${file.name}" attached.`, 'success');
            };
            reader.readAsDataURL(file);
          };

          const docFileInp = document.getElementById('clOppDocFileInput');
          const docDropzone = document.getElementById('clOppDocDropzone');
          const docRemoveBtn = document.getElementById('clOppDocRemoveBtn');

          if (docDropzone && docFileInp) {
            docDropzone.addEventListener('click', (ev) => {
              if (ev.target.closest('#clOppDocRemoveBtn') || ev.target.closest('#clOppDocPreviewBtn')) return;
              docFileInp.click();
            });

            docFileInp.addEventListener('change', () => {
              if (docFileInp.files && docFileInp.files[0]) {
                handleDocUpload(docFileInp.files[0]);
              }
            });

            docDropzone.addEventListener('dragover', (ev) => {
              ev.preventDefault();
              docDropzone.style.borderColor = '#2563eb';
              docDropzone.style.background = '#eff6ff';
            });

            docDropzone.addEventListener('dragleave', () => {
              docDropzone.style.borderColor = '#cbd5e1';
              docDropzone.style.background = '#ffffff';
            });

            docDropzone.addEventListener('drop', (ev) => {
              ev.preventDefault();
              docDropzone.style.borderColor = '#cbd5e1';
              docDropzone.style.background = '#ffffff';
              if (ev.dataTransfer?.files && ev.dataTransfer.files[0]) {
                handleDocUpload(ev.dataTransfer.files[0]);
              }
            });
          }

          if (docRemoveBtn) {
            docRemoveBtn.addEventListener('click', (ev) => {
              ev.stopPropagation();
              updateDocUI(null);
              showToast('Attached document removed.', 'info');
            });
          }

          // ── Budget toggle logic ──
          let isBudget = currentIsBudget;
          const budgetBtn = document.getElementById('clOppPopBudgetBtn');
          const nonBudgetBtn = document.getElementById('clOppPopNonBudgetBtn');
          const refreshToggle = () => {
            const activeStyle   = 'border:none; cursor:pointer; padding:6px 16px; font-size:12px; font-weight:700; border-radius:7px; font-family:var(--font-main); transition:all 0.15s ease; background:#2563eb; color:#ffffff; box-shadow:0 1px 4px rgba(37,99,235,0.3);';
            const inactiveStyle = 'border:none; cursor:pointer; padding:6px 16px; font-size:12px; font-weight:700; border-radius:7px; font-family:var(--font-main); transition:all 0.15s ease; background:transparent; color:#64748b;';
            if (isBudget) {
              budgetBtn.style.cssText    = activeStyle;
              nonBudgetBtn.style.cssText = inactiveStyle;
            } else {
              nonBudgetBtn.style.cssText = activeStyle;
              budgetBtn.style.cssText    = inactiveStyle;
            }
          };
          budgetBtn.addEventListener('click', () => { isBudget = true; refreshToggle(); });
          nonBudgetBtn.addEventListener('click', () => { isBudget = false; refreshToggle(); });

          // ── Save ──
          document.getElementById('clOppPopSave').addEventListener('click', () => {
            const newDeptId    = document.getElementById('clOppPopDept').value;
            const newNarration = document.getElementById('clOppPopNarration').value.trim();

            entry.narration    = newNarration;
            entry.departmentId = newDeptId;
            entry.isBudget     = isBudget;
            entry.uploadedDoc  = currentUploadedDoc;

            removePopover();
            showToast('Entry updated.', 'success');
            renderActiveSubtab();
            if (typeof refreshAllReports === 'function') refreshAllReports();
            if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
          });

          // ── Cancel / close / backdrop / Escape ──
          document.getElementById('clOppPopCancel').addEventListener('click', removePopover);
          document.getElementById('clCbOppClose').addEventListener('click', removePopover);
          overlay.addEventListener('click', (ev) => { if (ev.target === overlay) removePopover(); });
          overlay.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') removePopover(); });

        });
      });
    };

    setupOppCellPopovers();

    const commitQuickPost = (entryData) => {
      const {
        date,
        voucherNo,
        oppName,
        type,
        amt,
        departmentId = '',
        isBudget = false,
        narration = '',
        uploadedDoc = null
      } = entryData;

      const newEntry = {
        id: Date.now(),
        date,
        voucherNo,
        narration: (narration || '').trim(),
        type: 'Journal',
        amount: amt.toFixed(2),
        preparedBy: '',
        departmentId: departmentId || '',
        isBudget: !!isBudget,
        uploadedDoc: uploadedDoc || null,
        allRows: []
      };

      if (type === 'Receipt') {
        newEntry.allRows.push(
          { id: 1, type: 'By', particular: selectedLedger.name, debit: amt.toFixed(2), credit: '' },
          { id: 2, type: 'To', particular: oppName, debit: '', credit: amt.toFixed(2) }
        );
      } else {
        newEntry.allRows.push(
          { id: 1, type: 'By', particular: oppName, debit: amt.toFixed(2), credit: '' },
          { id: 2, type: 'To', particular: selectedLedger.name, debit: '', credit: amt.toFixed(2) }
        );
      }

      if (typeof postedEntries !== 'undefined') {
        postedEntries.push(newEntry);
      }
      if (typeof jvCounter !== 'undefined') {
        jvCounter++;
      }

      showToast(`Entry posted successfully. Voucher: ${voucherNo}`, 'success');

      renderActiveSubtab();
      if (typeof refreshAllReports === 'function') refreshAllReports();
      if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
    };

    const showEditEntryBeforePostModal = (entryData) => {
      const { date, voucherNo, oppName, type, amt } = entryData;

      document.getElementById('clEditEntryBeforePostOverlay')?.remove();

      const depts = (typeof ohDepartments !== 'undefined' ? ohDepartments : []).filter(d => d.id !== 'all');
      const deptOptions = depts.map(d => `<option value="${d.id}">${ohEsc(d.name)}</option>`).join('');

      const overlay = document.createElement('div');
      overlay.className = 'fj-overlay';
      overlay.id = 'clEditEntryBeforePostOverlay';
      overlay.setAttribute('tabindex', '-1');

      overlay.innerHTML = `
        <div class="fj-card" style="width:min(96vw,560px);" onclick="event.stopPropagation()">
          <!-- Header -->
          <div class="fj-head" style="background:linear-gradient(90deg,#2563eb,#3b82f6);display:flex;justify-content:space-between;align-items:center;padding:18px 24px;">
            <div>
              <div class="fj-head-title" style="font-size:16px;font-weight:700;">Edit Entry</div>
              <div class="fj-head-sub" style="font-size:12px;opacity:0.85;">${ohEsc(voucherNo)} &nbsp;·&nbsp; ${ohEsc(date)} &nbsp;·&nbsp; ${ohEsc(type)} ₹${amt.toFixed(2)}</div>
            </div>
            <button class="fj-close-btn" id="clEditBeforePostClose">✕</button>
          </div>

          <!-- Body -->
          <div class="fj-body" style="padding:22px 24px 24px;">
            <!-- Summary Info Badge Card -->
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
              <div>
                <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Account</span>
                <div style="font-size:13px;font-weight:700;color:#1e293b;">${ohEsc(selectedLedger.name)}</div>
              </div>
              <div>
                <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Ledger / Party</span>
                <div style="font-size:13px;font-weight:700;color:#1e293b;">${ohEsc(oppName)}</div>
              </div>
              <div>
                <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Type</span>
                <div style="font-size:13px;font-weight:700;color:${type === 'Receipt' ? '#059669' : '#dc2626'};">${ohEsc(type)}</div>
              </div>
              <div>
                <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">Amount</span>
                <div style="font-size:14px;font-weight:800;color:#2563eb;">₹${amt.toFixed(2)}</div>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px 18px;">
              <!-- Department -->
              <div>
                <label style="font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.07em;display:block;margin-bottom:6px;">Department</label>
                <select id="clEditBeforePostDept" style="width:100%;height:38px;font-size:13px;font-weight:600;padding:0 10px;border:1.5px solid #e2e8f0;border-radius:8px;background:#fff;color:#1e293b;cursor:pointer;box-sizing:border-box;outline:none;font-family:var(--font-main);">
                  <option value="">— Select Department —</option>
                  ${deptOptions}
                </select>
              </div>

              <!-- Transaction Type -->
              <div>
                <label style="font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.07em;display:block;margin-bottom:6px;">Transaction Type</label>
                <div style="display:inline-flex;align-items:center;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:9px;padding:2px;height:38px;box-sizing:border-box;user-select:none;">
                  <button type="button" id="clEditBeforePostNonBudgetBtn"
                    style="border:none;cursor:pointer;padding:6px 16px;font-size:12px;font-weight:700;border-radius:7px;font-family:var(--font-main);transition:all 0.15s ease;background:#2563eb;color:#ffffff;box-shadow:0 1px 4px rgba(37,99,235,0.3);">Non-Budget</button>
                  <button type="button" id="clEditBeforePostBudgetBtn"
                    style="border:none;cursor:pointer;padding:6px 16px;font-size:12px;font-weight:700;border-radius:7px;font-family:var(--font-main);transition:all 0.15s ease;background:transparent;color:#64748b;">Budget</button>
                </div>
              </div>

              <!-- Narration -->
              <div style="grid-column:1/-1;">
                <label style="font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.07em;display:block;margin-bottom:6px;">Narration</label>
                <input type="text" id="clEditBeforePostNarration"
                  value=""
                  placeholder="Enter narration…"
                  style="width:100%;height:38px;font-size:13px;font-weight:500;padding:0 12px;border:1.5px solid #e2e8f0;border-radius:8px;box-sizing:border-box;outline:none;color:#1e293b;font-family:var(--font-main);" />
              </div>

              <!-- Upload Document / Attachment -->
              <div style="grid-column:1/-1;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                  <label style="font-size:10.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.07em;display:flex;align-items:center;gap:5px;margin:0;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                    </svg>
                    &nbsp;Upload Document / Attachment
                  </label>
                  <span id="clEditBeforePostDocStatusBadge" style="display:none;font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:#ecfdf5;color:#059669;text-transform:uppercase;">Attached</span>
                </div>

                <input type="file" id="clEditBeforePostDocFileInput" style="display:none;" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv,.zip" />

                <div id="clEditBeforePostDocDropzone" style="border:1.5px dashed #cbd5e1;border-radius:10px;padding:12px 14px;text-align:center;background:#ffffff;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.borderColor='#2563eb';this.style.background='#eff6ff';" onmouseout="this.style.borderColor='#cbd5e1';this.style.background='#ffffff';">
                  <!-- Empty State -->
                  <div id="clEditBeforePostDocEmptyState" style="display:flex;align-items:center;justify-content:center;gap:10px;">
                    <div style="width:28px;height:28px;border-radius:50%;background:#f8fafc;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:center;color:#2563eb;flex-shrink:0;">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                    </div>
                    <div style="display:flex;flex-direction:column;align-items:flex-start;text-align:left;">
                      <span style="font-size:12.5px;font-weight:600;color:#334155;">Click or Drag to Upload Document</span>
                      <span style="font-size:10.5px;color:#94a3b8;">PDF, Image, Excel, Word (Max 10MB)</span>
                    </div>
                  </div>

                  <!-- Selected State -->
                  <div id="clEditBeforePostDocSelectedState" style="display:none;align-items:center;justify-content:space-between;gap:10px;">
                    <div style="display:flex;align-items:center;gap:10px;overflow:hidden;">
                      <div id="clEditBeforePostDocFileIcon" style="width:30px;height:30px;border-radius:6px;background:#dbeafe;color:#1e40af;font-size:9.5px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;text-transform:uppercase;">
                        DOC
                      </div>
                      <div style="display:flex;flex-direction:column;align-items:flex-start;overflow:hidden;text-align:left;">
                        <span id="clEditBeforePostDocFileName" style="font-size:12.5px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;"></span>
                        <span id="clEditBeforePostDocFileSize" style="font-size:10.5px;color:#64748b;font-weight:500;"></span>
                      </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                      <a id="clEditBeforePostDocPreviewBtn" href="#" target="_blank" style="padding:4px 9px;font-size:11.5px;font-weight:600;color:#2563eb;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;text-decoration:none;display:inline-flex;align-items:center;gap:4px;" title="Download / View document">
                        View
                      </a>
                      <button id="clEditBeforePostDocRemoveBtn" type="button" style="background:none;border:none;color:#dc2626;cursor:pointer;padding:4px;border-radius:4px;display:flex;align-items:center;" title="Remove document">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:22px;">
              <button id="clEditBeforePostCancel" style="height:38px;padding:0 20px;font-size:13px;font-weight:600;border-radius:9px;border:1.5px solid #e2e8f0;background:#fff;color:#475569;cursor:pointer;font-family:var(--font-main);">Cancel</button>
              <button id="clEditBeforePostSubmit" style="height:38px;padding:0 22px;font-size:13px;font-weight:700;border-radius:9px;border:none;background:#2563eb;color:#fff;cursor:pointer;box-shadow:0 2px 8px rgba(37,99,235,0.28);font-family:var(--font-main);display:inline-flex;align-items:center;gap:6px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Post Entry
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      let currentUploadedDoc = null;
      const formatDocBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
      };

      const updateDocUI = (doc) => {
        currentUploadedDoc = doc;
        const emptyState = document.getElementById('clEditBeforePostDocEmptyState');
        const selectedState = document.getElementById('clEditBeforePostDocSelectedState');
        const badge = document.getElementById('clEditBeforePostDocStatusBadge');
        const nameEl = document.getElementById('clEditBeforePostDocFileName');
        const sizeEl = document.getElementById('clEditBeforePostDocFileSize');
        const iconEl = document.getElementById('clEditBeforePostDocFileIcon');
        const previewBtn = document.getElementById('clEditBeforePostDocPreviewBtn');
        const fileInp = document.getElementById('clEditBeforePostDocFileInput');

        if (!doc || !doc.fileData) {
          if (emptyState) emptyState.style.display = 'flex';
          if (selectedState) selectedState.style.display = 'none';
          if (badge) badge.style.display = 'none';
          if (fileInp) fileInp.value = '';
          return;
        }

        if (emptyState) emptyState.style.display = 'none';
        if (selectedState) selectedState.style.display = 'flex';
        if (badge) badge.style.display = 'inline-block';

        if (nameEl) nameEl.textContent = doc.fileName || 'Attachment';
        if (sizeEl) sizeEl.textContent = doc.fileSize || formatDocBytes(doc.fileBytes || 0);

        const ext = (doc.fileName || '').split('.').pop().toUpperCase();
        if (iconEl) {
          iconEl.textContent = ext.substring(0, 4) || 'DOC';
          if (['PDF'].includes(ext)) {
            iconEl.style.background = '#fee2e2'; iconEl.style.color = '#991b1b';
          } else if (['JPG','JPEG','PNG','WEBP'].includes(ext)) {
            iconEl.style.background = '#e0e7ff'; iconEl.style.color = '#3730a3';
          } else if (['XLS','XLSX','CSV'].includes(ext)) {
            iconEl.style.background = '#dcfce7'; iconEl.style.color = '#166534';
          } else {
            iconEl.style.background = '#dbeafe'; iconEl.style.color = '#1e40af';
          }
        }

        if (previewBtn) {
          previewBtn.href = doc.fileData;
          previewBtn.download = doc.fileName || 'document';
        }
      };

      const handleDocUpload = (file) => {
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
          showToast('File size exceeds 10MB limit.', 'error');
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          const doc = {
            fileName: file.name,
            fileSize: formatDocBytes(file.size),
            fileBytes: file.size,
            fileData: ev.target.result
          };
          updateDocUI(doc);
          showToast(`Document "${file.name}" attached.`, 'success');
        };
        reader.readAsDataURL(file);
      };

      const docFileInp = document.getElementById('clEditBeforePostDocFileInput');
      const docDropzone = document.getElementById('clEditBeforePostDocDropzone');
      const docRemoveBtn = document.getElementById('clEditBeforePostDocRemoveBtn');

      if (docDropzone && docFileInp) {
        docDropzone.addEventListener('click', (ev) => {
          if (ev.target.closest('#clEditBeforePostDocRemoveBtn') || ev.target.closest('#clEditBeforePostDocPreviewBtn')) return;
          docFileInp.click();
        });

        docFileInp.addEventListener('change', () => {
          if (docFileInp.files && docFileInp.files[0]) {
            handleDocUpload(docFileInp.files[0]);
          }
        });

        docDropzone.addEventListener('dragover', (ev) => {
          ev.preventDefault();
          docDropzone.style.borderColor = '#2563eb';
          docDropzone.style.background = '#eff6ff';
        });

        docDropzone.addEventListener('dragleave', () => {
          docDropzone.style.borderColor = '#cbd5e1';
          docDropzone.style.background = '#ffffff';
        });

        docDropzone.addEventListener('drop', (ev) => {
          ev.preventDefault();
          docDropzone.style.borderColor = '#cbd5e1';
          docDropzone.style.background = '#ffffff';
          if (ev.dataTransfer?.files && ev.dataTransfer.files[0]) {
            handleDocUpload(ev.dataTransfer.files[0]);
          }
        });
      }

      if (docRemoveBtn) {
        docRemoveBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          updateDocUI(null);
          showToast('Attached document removed.', 'info');
        });
      }

      let isBudget = false;
      const budgetBtn = document.getElementById('clEditBeforePostBudgetBtn');
      const nonBudgetBtn = document.getElementById('clEditBeforePostNonBudgetBtn');
      const refreshToggle = () => {
        const activeStyle   = 'border:none; cursor:pointer; padding:6px 16px; font-size:12px; font-weight:700; border-radius:7px; font-family:var(--font-main); transition:all 0.15s ease; background:#2563eb; color:#ffffff; box-shadow:0 1px 4px rgba(37,99,235,0.3);';
        const inactiveStyle = 'border:none; cursor:pointer; padding:6px 16px; font-size:12px; font-weight:700; border-radius:7px; font-family:var(--font-main); transition:all 0.15s ease; background:transparent; color:#64748b;';
        if (isBudget) {
          budgetBtn.style.cssText    = activeStyle;
          nonBudgetBtn.style.cssText = inactiveStyle;
        } else {
          nonBudgetBtn.style.cssText = activeStyle;
          budgetBtn.style.cssText    = inactiveStyle;
        }
      };
      budgetBtn.addEventListener('click', () => { isBudget = true; refreshToggle(); });
      nonBudgetBtn.addEventListener('click', () => { isBudget = false; refreshToggle(); });

      const removeModal = () => {
        overlay.remove();
      };

      document.getElementById('clEditBeforePostClose')?.addEventListener('click', removeModal);
      document.getElementById('clEditBeforePostCancel')?.addEventListener('click', removeModal);
      overlay.addEventListener('click', (ev) => { if (ev.target === overlay) removeModal(); });
      overlay.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') removeModal(); });

      document.getElementById('clEditBeforePostSubmit')?.addEventListener('click', () => {
        const departmentId = document.getElementById('clEditBeforePostDept')?.value || '';
        const narration = document.getElementById('clEditBeforePostNarration')?.value || '';
        
        removeModal();
        commitQuickPost({
          ...entryData,
          departmentId,
          isBudget,
          narration,
          uploadedDoc: currentUploadedDoc
        });
      });
    };

    // Hook up Quick Post listener

    const handleQuickPost = () => {
      const date = document.getElementById('clQuickEntryDate')?.value;
      const voucherNo = document.getElementById('clQuickEntryVoucher')?.value?.trim() || ((typeof genVoucherNo === 'function') ? genVoucherNo() : `JV-${new Date().getFullYear()}-001`);
      let oppId = document.getElementById('clQuickEntryLedger')?.value || '';
      const searchVal = document.getElementById('clQuickEntryLedgerSearch')?.value?.trim() || '';
      const type = document.getElementById('clQuickEntryType')?.value || '';
      const amtVal = document.getElementById('clQuickEntryAmount')?.value || '';
      const amt = parseAmt(amtVal) || 0;

      const availableLedgers = getAvailableLedgerList();

      if (!date) {
        showToast('Please select a date.', 'warning');
        return;
      }

      // If oppId is not set, try auto-resolving from search input
      if (!oppId && searchVal) {
        const matched = availableLedgers.find(l => (l.name || '').toLowerCase() === searchVal.toLowerCase())
                     || availableLedgers.find(l => (l.name || '').toLowerCase().includes(searchVal.toLowerCase()));
        if (matched) {
          oppId = matched.id;
        }
      }

      if (!oppId) {
        showToast('Please search and select a valid ledger, customer or vendor.', 'warning');
        document.getElementById('clQuickEntryLedgerSearch')?.focus();
        return;
      }
      if (!type) {
        showToast('Please select Receipt or Payment.', 'warning');
        document.getElementById('clQuickEntryType')?.focus();
        return;
      }
      if (amt <= 0) {
        showToast('Please enter a valid amount greater than 0.', 'warning');
        document.getElementById('clQuickEntryAmount')?.focus();
        return;
      }
      if (!selectedLedger) {
        showToast('Please select a Cash/Bank account.', 'warning');
        return;
      }

      // Resolve Opp Ledger Name
      let oppName = '';
      const chosenItem = availableLedgers.find(l => String(l.id) === String(oppId));
      if (chosenItem) {
        oppName = chosenItem.name;
        if (typeof coaLedgers !== 'undefined') {
          let existing = coaLedgers.find(l => l.type === 'ledger' && (l.name || '').trim().toLowerCase() === oppName.trim().toLowerCase());
          if (!existing) {
            const sgId = chosenItem.isCustomer ? 'sg-tr' : (chosenItem.isSupplier ? 'sg-tp' : 'sg-oe');
            existing = {
              id: Date.now() + Math.floor(Math.random() * 1000),
              sgId: sgId,
              glId: null,
              name: oppName,
              code: '',
              openingBalance: 0,
              type: 'ledger'
            };
            coaLedgers.push(existing);
          }
        }
      } else {
        const coaLdg = (typeof coaLedgers !== 'undefined' ? coaLedgers : []).find(l => String(l.id) === String(oppId));
        if (coaLdg) oppName = coaLdg.name;
      }

      if (!oppName) {
        showToast('Selected ledger / party not found.', 'warning');
        return;
      }

      const isMoreOptionsOn = localStorage.getItem('kya_books_more_options_before_post') === 'true' || window._clBooksMoreOptionsBeforePost === true;

      const entryPayload = {
        date,
        voucherNo,
        oppName,
        type,
        amt
      };

      if (isMoreOptionsOn) {
        showEditEntryBeforePostModal(entryPayload);
      } else {
        commitQuickPost(entryPayload);
      }
    };

    document.getElementById('clBtnQuickPost')?.addEventListener('click', handleQuickPost);
    const amtInput = document.getElementById('clQuickEntryAmount');
    if (amtInput) {
      amtInput.addEventListener('blur', () => {
        const raw = amtInput.value.trim();
        if (!raw) return;
        const v = parseAmt(raw);
        if (!isNaN(v) && v > 0) {
          amtInput.value = v.toFixed(2);
        } else if (isNaN(v) || v <= 0) {
          amtInput.value = '';
        }
      });
      amtInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const raw = amtInput.value.trim();
          const v = parseAmt(raw);
          if (!isNaN(v) && v > 0) {
            amtInput.value = v.toFixed(2);
          }
          handleQuickPost();
        }
      });
    }
  }

  window.onLedgerCreatedForCashline = function(newLedger, ctx) {
    const p = ctx || window._clPendingQuickEntryState || window._clPendingReconCreation;
    if (p) {
      if (p.activeTopTab) _clActiveTopTab = p.activeTopTab;
      if (p.activeBankingTab) _clActiveBankingTab = p.activeBankingTab;
      if (p.cashbookAccountId) _clCashbookAccountId = p.cashbookAccountId;
      if (p.reconBankId) _clReconBankId = p.reconBankId;
      if (p.reconSubSection) _clReconSubSection = p.reconSubSection;
      
      if (p.isCashbookQuickEntry && newLedger) {
        window._clPendingQuickEntryState = {
          ...p,
          quickLedgerId: newLedger.id,
          quickLedgerSearch: newLedger.name
        };
      }

      const bankId = p.bankId || p.reconBankId;
      const origIdx = p.origIdx;
      if (newLedger && bankId && origIdx !== undefined) {
        window.KYA_STORE = window.KYA_STORE || {};
        window.KYA_STORE.statementLedgerMapping = window.KYA_STORE.statementLedgerMapping || {};
        window.KYA_STORE.statementLedgerMapping[`${bankId}_${origIdx}`] = newLedger.id;
      }
    }
    window._clPendingReconCreation = null;
    if (typeof renderCashlinePanel === 'function') {
      renderCashlinePanel();
    } else if (typeof renderActiveSubtab === 'function') {
      renderActiveSubtab();
    }
  };

  window.onPartyCreatedForCashline = function(newParty, partyType, ctx) {
    const p = ctx || window._clPendingQuickEntryState || window._clPendingReconCreation;
    if (p) {
      if (p.activeTopTab) _clActiveTopTab = p.activeTopTab;
      if (p.activeBankingTab) _clActiveBankingTab = p.activeBankingTab;
      if (p.cashbookAccountId) _clCashbookAccountId = p.cashbookAccountId;
      if (p.reconBankId) _clReconBankId = p.reconBankId;
      if (p.reconSubSection) _clReconSubSection = p.reconSubSection;

      if (p.isCashbookQuickEntry && newParty) {
        const prefix = partyType === 'customer' ? 'cust_' : 'supp_';
        window._clPendingQuickEntryState = {
          ...p,
          quickLedgerId: `${prefix}${newParty.id}`,
          quickLedgerSearch: newParty.name
        };
      }

      const bankId = p.bankId || p.reconBankId;
      const origIdx = p.origIdx;
      if (newParty && bankId && origIdx !== undefined) {
        window.KYA_STORE = window.KYA_STORE || {};
        window.KYA_STORE.statementLedgerMapping = window.KYA_STORE.statementLedgerMapping || {};
        window.KYA_STORE.statementLedgerMapping[`${bankId}_${origIdx}`] = newParty.id;
      }
    }
    window._clPendingReconCreation = null;
    if (typeof renderCashlinePanel === 'function') {
      renderCashlinePanel();
    } else if (typeof renderActiveSubtab === 'function') {
      renderActiveSubtab();
    }
  };

  window.onCreationCancelledForCashline = function(ctx) {
    const p = ctx || window._clPendingQuickEntryState || window._clPendingReconCreation;
    if (p) {
      if (p.activeTopTab) _clActiveTopTab = p.activeTopTab;
      if (p.activeBankingTab) _clActiveBankingTab = p.activeBankingTab;
      if (p.cashbookAccountId) _clCashbookAccountId = p.cashbookAccountId;
      if (p.reconBankId) _clReconBankId = p.reconBankId;
      if (p.reconSubSection) _clReconSubSection = p.reconSubSection;

      if (p.isCashbookQuickEntry) {
        window._clPendingQuickEntryState = p;
      }
    }
    window._clPendingReconCreation = null;
    if (typeof renderCashlinePanel === 'function') {
      renderCashlinePanel();
    } else if (typeof renderActiveSubtab === 'function') {
      renderActiveSubtab();
    }
    if (p && p.origIdx !== undefined) {
      setTimeout(() => {
        const btn = document.querySelector(`.cl-recon-ledger-btn[data-index="${p.origIdx}"]`);
        if (btn) btn.focus();
      }, 60);
    }
  };

  // ── Cashbook Export Data Builder ─────────────────────────────────
  function getCashbookExportData() {
    const cceAccounts = (typeof coaLedgers !== 'undefined' ? coaLedgers : []).filter(l => l.type === 'ledger' && l.sgId === 'sg-cce');
    if (!cceAccounts.length) return null;
    const selectedLedger = cceAccounts.find(l => l.id.toString() === _clCashbookAccountId) || cceAccounts[0];
    if (!selectedLedger) return null;

    const fromVal = _clCashflowDateFrom || '';
    const toVal = _clCashflowDateTo || '';
    const balData = typeof calculateLedgerBalances === 'function' ? calculateLedgerBalances(selectedLedger, fromVal, toVal) : { openingBalance: 0, closingBalance: 0, periodNet: 0 };

    const ledgerTrans = [];
    let totalDebit = 0;
    let totalCredit = 0;

    const selName = (selectedLedger.name || '').trim().toLowerCase();

    postedEntries.forEach(entry => {
      if (fromVal && entry.date < fromVal) return;
      if (toVal && entry.date > toVal) return;

      (entry.allRows || []).forEach(row => {
        if ((row.particular || '').trim().toLowerCase() === selName) {
          const dr = parseFloat(row.debit) || 0;
          const cr = parseFloat(row.credit) || 0;

          if (dr > 0) {
            let oppRows = (entry.allRows || []).filter(r => (parseFloat(r.credit) || 0) > 0 && (r.particular || '').trim().toLowerCase() !== selName);
            if (oppRows.length === 0) oppRows = (entry.allRows || []).filter(r => (r.particular || '').trim().toLowerCase() !== selName);

            totalDebit += dr;
            if (oppRows.length <= 1) {
              ledgerTrans.push({
                id: entry.id,
                date: entry.date,
                voucherNo: entry.voucherNo || '-',
                particulars: oppRows.length === 1 ? oppRows[0].particular : (typeof getOppositeParticulars === 'function' ? getOppositeParticulars(entry, selectedLedger.name, true) : '—'),
                debit: dr,
                credit: 0
              });
            } else {
              const totalOppCr = oppRows.reduce((sum, r) => sum + (parseFloat(r.credit) || 0), 0);
              oppRows.forEach(opp => {
                const oppCr = parseFloat(opp.credit) || 0;
                const lineAmt = totalOppCr > 0 ? (oppCr / totalOppCr) * dr : (dr / oppRows.length);
                ledgerTrans.push({
                  id: entry.id,
                  date: entry.date,
                  voucherNo: entry.voucherNo || '-',
                  particulars: opp.particular || '—',
                  debit: lineAmt,
                  credit: 0
                });
              });
            }
          } else if (cr > 0) {
            let oppRows = (entry.allRows || []).filter(r => (parseFloat(r.debit) || 0) > 0 && (r.particular || '').trim().toLowerCase() !== selName);
            if (oppRows.length === 0) oppRows = (entry.allRows || []).filter(r => (r.particular || '').trim().toLowerCase() !== selName);

            totalCredit += cr;
            if (oppRows.length <= 1) {
              ledgerTrans.push({
                id: entry.id,
                date: entry.date,
                voucherNo: entry.voucherNo || '-',
                particulars: oppRows.length === 1 ? oppRows[0].particular : (typeof getOppositeParticulars === 'function' ? getOppositeParticulars(entry, selectedLedger.name, false) : '—'),
                debit: 0,
                credit: cr
              });
            } else {
              const totalOppDr = oppRows.reduce((sum, r) => sum + (parseFloat(r.debit) || 0), 0);
              oppRows.forEach(opp => {
                const oppDr = parseFloat(opp.debit) || 0;
                const lineAmt = totalOppDr > 0 ? (oppDr / totalOppDr) * cr : (cr / oppRows.length);
                ledgerTrans.push({
                  id: entry.id,
                  date: entry.date,
                  voucherNo: entry.voucherNo || '-',
                  particulars: opp.particular || '—',
                  debit: 0,
                  credit: lineAmt
                });
              });
            }
          }
        }
      });
    });

    ledgerTrans.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    const activeCo = (typeof getActiveCompany === 'function' ? getActiveCompany() : null) || {};
    const companyName = activeCo.name || 'KYA Accounting';

    return {
      companyName,
      type: 'cashbook',
      title: `${(selectedLedger.name || 'CASH & BANK BOOK').toUpperCase()} STATEMENT`,
      accountName: selectedLedger.name,
      code: selectedLedger.code || '',
      subgroupName: 'Cash & Cash Equivalents',
      dateFrom: fromVal,
      dateTo: toVal,
      openingBalance: balData.openingBalance,
      periodNet: balData.periodNet,
      closingBalance: balData.closingBalance,
      totalDebit,
      totalCredit,
      transactions: ledgerTrans
    };
  }
  window.getCashbookExportData = getCashbookExportData;

