  // ══════════════════════════════════════════════════════════════════
  //  CASHLINE CASHBOOK — Cash receipts & payments view
  //  (Split from cashline.js for maintainability)
  // ══════════════════════════════════════════════════════════════════

  function renderCashbookView(target, controls, actionsArea) {
    const isBankingMode = _clActiveTopTab === 'banking';

    if (isBankingMode) {
      const bankAccounts = window.KYA_STORE.bankAccounts || [];
      if (bankAccounts.length === 0) {
        if (actionsArea) actionsArea.innerHTML = '';
        if (controls) controls.innerHTML = '';
        target.innerHTML = `
          <div style="padding: 48px; text-align: center; border: 1.5px dashed var(--slate-200); border-radius: 16px; background: var(--slate-50);">
            <div style="font-size: 32px; margin-bottom: 12px;">🏛️</div>
            <div style="font-size: 14.5px; font-weight: 700; color: var(--slate-700);">No Bank Accounts defined</div>
            <div style="font-size: 12.5px; color: var(--slate-400); margin-top: 4px;">Please create a Bank account first.</div>
          </div>
        `;
        return;
      }

      if (!_clReconBankId && bankAccounts.length > 0) {
        _clReconBankId = bankAccounts[0].id;
      }

      const currentAcc = bankAccounts.find(x => x.id === Number(_clReconBankId)) || bankAccounts[0];
      const selectedLedger = coaLedgers.find(l => l.id === currentAcc.ledgerId);

      if (!selectedLedger) {
        target.innerHTML = `
          <div style="padding: 48px; text-align: center; border: 1.5px dashed var(--slate-200); border-radius: 16px; background: var(--slate-50);">
            <div style="font-size: 14.5px; font-weight: 700; color: var(--slate-700);">Linked ledger not found</div>
          </div>
        `;
        return;
      }

      const rawStatementRows = (window.KYA_STORE.uploadedStatements || {})[currentAcc.id] || [];
      const statementRows = rawStatementRows.map((line, origIdx) => ({ ...line, origIdx }));

      let openingBal = parseFloat(selectedLedger.openingBalance) || 0;
      if (statementRows.length > 0) {
        const firstRow = statementRows[0];
        const parsedFirstBal = parseFloat(firstRow.balance) || 0;
        const parsedFirstDb = parseFloat(firstRow.debit) || 0;
        const parsedFirstCr = parseFloat(firstRow.credit) || 0;
        if (parsedFirstBal !== 0) {
          openingBal = parsedFirstBal - parsedFirstDb + parsedFirstCr;
        }
      }

      function formatToDDMMYYYY(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dateStr;
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

      const allDisplayedSelected = displayRows.length > 0 && displayRows.every(r => _clStatementSelectedIndices.has(r.origIdx));

      const isReconciliationMode = (_clActiveTopTab === 'banking' && _clActiveBankingTab === 'reconciliation') || (_clActiveTopTab === 'books' && _clBooksSubtab === 'reconciliation');
      const allLedgers = (typeof coaLedgers !== 'undefined' ? coaLedgers : []).filter(l => l.type === 'ledger');
      window.KYA_STORE.statementLedgerMapping = window.KYA_STORE.statementLedgerMapping || {};
      window.KYA_STORE.reconciliationState = window.KYA_STORE.reconciliationState || {};
      window.KYA_STORE.statementDeptMapping = window.KYA_STORE.statementDeptMapping || {};
      window.KYA_STORE.statementTypeMapping = window.KYA_STORE.statementTypeMapping || {};

      const bankLedger = coaLedgers.find(l => l.id === currentAcc.ledgerId) || { name: currentAcc.name };

      const unreconciledRows = displayRows.filter(line => !window.KYA_STORE.statementLedgerMapping[`${currentAcc.id}_${line.origIdx}`]);
      const confirmedRows = displayRows.filter(line => !!window.KYA_STORE.statementLedgerMapping[`${currentAcc.id}_${line.origIdx}`]);

      const reconTargetRows = isReconciliationMode
        ? (_clReconSubSection === 'reconciliation' ? unreconciledRows : confirmedRows)
        : displayRows;

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
                  <td class="num-val" style="color: ${amtColor}; text-align: right;">${amtDisplay}</td>
                  <td style="width: 280px; position: relative;">
                    <button type="button" 
                            class="cl-recon-ledger-btn" 
                            data-index="${line.origIdx}"
                            data-account-id="${currentAcc.id}"
                            data-selected-id="${savedLedgerId}"
                            style="width: 100%; height: 36px; padding: 0 12px; font-size: 13px; font-weight: 600; text-align: left; background: #fff; border: 1px solid var(--slate-300); border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; color: ${savedLedger ? 'var(--slate-800)' : 'var(--slate-400)'}; transition: all 0.15s ease;">
                      <span class="cl-recon-ledger-label" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${savedLedger ? ohEsc(savedLedger.name) : 'Select Ledger...'}
                      </span>
                      <span style="font-size: 9px; margin-left: 6px; color: var(--slate-400);">▼</span>
                    </button>
                  </td>
                </tr>
              `;
            } else {
              // Confirmation section row: Date, Journal Entry Model (normal text at top), Description (under model), Department, Transaction Type (slider toggle), Action
              const savedDeptId = window.KYA_STORE.statementDeptMapping[key] || '';
              const savedTxType = window.KYA_STORE.statementTypeMapping[key] || 'non-budget';
              const depts = (typeof ohDepartments !== 'undefined' ? ohDepartments : []).filter(d => d.id !== 'all');
              const isBudgetTx = savedTxType === 'budget';

              rowsHtml += `
                <tr style="${isChecked ? 'background: #eff6ff;' : ''}">
                  ${_clStatementSelectMode ? `
                    <td style="text-align: center; width: 42px; vertical-align: top; padding-top: 12px;">
                      <input type="checkbox" class="cl-stmt-row-cb" data-index="${line.origIdx}" ${isChecked ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer; accent-color: #2563eb;">
                    </td>
                  ` : ''}
                  <td style="white-space: nowrap; vertical-align: top; padding-top: 12px;">${formatToDDMMYYYY(line.date)}</td>
                  <td style="vertical-align: top; padding-top: 10px; min-width: 280px;">
                    <div style="margin-bottom: 6px; font-size: 12px; line-height: 1.4;">
                      ${dbVal > 0 ? `
                        <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                          <span><strong style="color: #2563eb; font-size: 11.5px;">By</strong> ${ohEsc(savedLedger?.name || '—')}</span>
                          <span style="font-weight: 700; color: var(--red-600); margin-left: 16px;">${fmtAmt(dbVal)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 2px 0; padding-left: 12px;">
                          <span><strong style="color: #059669; font-size: 11.5px;">To</strong> ${ohEsc(bankLedger?.name || currentAcc.name)}</span>
                          <span style="font-weight: 700; color: var(--red-600); margin-left: 16px;">${fmtAmt(dbVal)}</span>
                        </div>
                      ` : `
                        <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                          <span><strong style="color: #2563eb; font-size: 11.5px;">By</strong> ${ohEsc(bankLedger?.name || currentAcc.name)}</span>
                          <span style="font-weight: 700; color: var(--emerald-600); margin-left: 16px;">${fmtAmt(crVal)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 2px 0; padding-left: 12px;">
                          <span><strong style="color: #059669; font-size: 11.5px;">To</strong> ${ohEsc(savedLedger?.name || '—')}</span>
                          <span style="font-weight: 700; color: var(--emerald-600); margin-left: 16px;">${fmtAmt(crVal)}</span>
                        </div>
                      `}
                    </div>
                    <div style="font-weight: 500; color: var(--slate-600); font-size: 12px; line-height: 1.3;">${ohEsc(line.description || '—')}</div>
                  </td>
                  <td style="vertical-align: top; padding-top: 10px; width: 150px;">
                    <select class="je-input cl-recon-dept-select" data-index="${line.origIdx}" style="height: 32px; font-size: 12px; width: 100%; padding: 0 6px; cursor: pointer; background: #fff; border-radius: 6px;">
                      <option value="">&mdash; Select Dept &mdash;</option>
                      ${depts.map(d => `<option value="${d.id}" ${String(d.id) === String(savedDeptId) ? 'selected' : ''}>${ohEsc(d.name)}</option>`).join('')}
                    </select>
                  </td>
                  <td style="vertical-align: top; padding-top: 12px; width: 140px;">
                    <label class="cl-recon-type-toggle" style="display: inline-flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;">
                      <div style="position: relative; width: 38px; height: 20px; background: ${isBudgetTx ? '#2563eb' : '#cbd5e1'}; border-radius: 10px; transition: background 0.2s ease;">
                        <input type="checkbox" class="cl-recon-type-checkbox" data-index="${line.origIdx}" ${isBudgetTx ? 'checked' : ''} style="opacity: 0; width: 0; height: 0; position: absolute;">
                        <span style="position: absolute; top: 2px; left: ${isBudgetTx ? '20px' : '2px'}; width: 16px; height: 16px; background: #fff; border-radius: 50%; transition: left 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></span>
                      </div>
                      <span style="font-size: 12px; font-weight: 600; color: ${isBudgetTx ? '#1e40af' : 'var(--slate-600)'};">
                        ${isBudgetTx ? 'Budget' : 'Non Budget'}
                      </span>
                    </label>
                  </td>
                  <td style="width: 140px; text-align: right; vertical-align: top; padding-top: 10px;">
                    ${isPosted ? `
                      <span class="cl-badge reconciled" style="font-size: 11.5px; padding: 4px 10px;">Posted</span>
                    ` : `
                      <div style="display: flex; gap: 6px; justify-content: flex-end;">
                        <button type="button" class="btn btn-success btn-sm cl-btn-post-single" data-index="${line.origIdx}" style="padding: 4px 10px; font-size: 11.5px; font-weight: 700; border-radius: 6px; cursor: pointer;">Post</button>
                        <button type="button" class="btn btn-secondary btn-sm cl-btn-revert-single" data-index="${line.origIdx}" style="padding: 4px 8px; font-size: 11.5px; font-weight: 600; border-radius: 6px; cursor: pointer;">Revert</button>
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
        const emptyTitle = isReconciliationMode
          ? (_clReconSubSection === 'reconciliation' ? 'No transactions pending reconciliation' : 'No confirmed transactions yet')
          : 'No statement entries found';
        const emptySub = isReconciliationMode
          ? (_clReconSubSection === 'reconciliation' ? 'All statement entries have been mapped and moved to Confirmation.' : 'Select ledgers in the Reconciliation section to confirm transactions.')
          : 'Try adjusting your search query, date filters, or import a new statement.';

        rowsHtml = `
          <tr>
            <td colspan="${colCount}" style="text-align: center; color: var(--slate-400); padding: 48px;">
              <div style="font-size: 28px; margin-bottom: 8px;">${isReconciliationMode && _clReconSubSection === 'confirmation' ? '✅' : '📄'}</div>
              <div style="font-size: 13.5px; font-weight: 700; color: var(--slate-700);">${ohEsc(emptyTitle)}</div>
              <div style="font-size: 12px; margin-top: 4px; color: var(--slate-400);">${ohEsc(emptySub)}</div>
            </td>
          </tr>
        `;
      }

      // Actions in Blue Card header
      if (actionsArea) {
        if (isReconciliationMode) {
          actionsArea.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <button type="button" id="clSubTabReconSection" style="height: 32px; padding: 0 12px; font-size: 12.5px; font-weight: 700; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease; border: ${_clReconSubSection === 'reconciliation' ? 'none' : '1px solid rgba(255,255,255,0.35)'}; background: ${_clReconSubSection === 'reconciliation' ? '#ffffff' : 'rgba(255,255,255,0.18)'}; color: ${_clReconSubSection === 'reconciliation' ? '#1e40af' : '#ffffff'};">
                Reconciliation <span style="background: ${_clReconSubSection === 'reconciliation' ? '#dbeafe' : 'rgba(255,255,255,0.25)'}; color: ${_clReconSubSection === 'reconciliation' ? '#1e40af' : '#ffffff'}; padding: 1px 6px; border-radius: 10px; font-size: 11px; font-weight: 800;">${unreconciledRows.length}</span>
              </button>
              <button type="button" id="clSubTabConfirmSection" style="height: 32px; padding: 0 12px; font-size: 12.5px; font-weight: 700; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease; border: ${_clReconSubSection === 'confirmation' ? 'none' : '1px solid rgba(255,255,255,0.35)'}; background: ${_clReconSubSection === 'confirmation' ? '#ffffff' : 'rgba(255,255,255,0.18)'}; color: ${_clReconSubSection === 'confirmation' ? '#1e40af' : '#ffffff'};">
                Confirmation <span style="background: ${_clReconSubSection === 'confirmation' ? '#dbeafe' : 'rgba(255,255,255,0.25)'}; color: ${_clReconSubSection === 'confirmation' ? '#1e40af' : '#ffffff'}; padding: 1px 6px; border-radius: 10px; font-size: 11px; font-weight: 800;">${confirmedRows.length}</span>
              </button>
            </div>
          `;
          actionsArea.querySelector('#clSubTabReconSection')?.addEventListener('click', () => {
            _clReconSubSection = 'reconciliation';
            renderActiveSubtab();
          });
          actionsArea.querySelector('#clSubTabConfirmSection')?.addEventListener('click', () => {
            _clReconSubSection = 'confirmation';
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
          });
        });

        document.querySelectorAll('.cl-recon-type-checkbox').forEach(chk => {
          chk.addEventListener('change', (e) => {
            const origIdx = e.target.dataset.index;
            const key = `${currentAcc.id}_${origIdx}`;
            window.KYA_STORE.statementTypeMapping[key] = e.target.checked ? 'budget' : 'non-budget';
            renderActiveSubtab();
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
          document.getElementById('clStmtShowingCount').textContent = `Showing ${displayRows.length} of ${statementRows.length} entries`;

          // Update sub-section toggle buttons in header if in reconciliation mode
          if (actionsArea && isReconciliationMode) {
            actionsArea.innerHTML = `
              <div style="display: flex; align-items: center; gap: 8px;">
                <button type="button" id="clSubTabReconSection" style="height: 32px; padding: 0 12px; font-size: 12.5px; font-weight: 700; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease; border: ${_clReconSubSection === 'reconciliation' ? 'none' : '1px solid rgba(255,255,255,0.35)'}; background: ${_clReconSubSection === 'reconciliation' ? '#ffffff' : 'rgba(255,255,255,0.18)'}; color: ${_clReconSubSection === 'reconciliation' ? '#1e40af' : '#ffffff'};">
                  Reconciliation <span style="background: ${_clReconSubSection === 'reconciliation' ? '#dbeafe' : 'rgba(255,255,255,0.25)'}; color: ${_clReconSubSection === 'reconciliation' ? '#1e40af' : '#ffffff'}; padding: 1px 6px; border-radius: 10px; font-size: 11px; font-weight: 800;">${unreconciledRows.length}</span>
                </button>
                <button type="button" id="clSubTabConfirmSection" style="height: 32px; padding: 0 12px; font-size: 12.5px; font-weight: 700; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease; border: ${_clReconSubSection === 'confirmation' ? 'none' : '1px solid rgba(255,255,255,0.35)'}; background: ${_clReconSubSection === 'confirmation' ? '#ffffff' : 'rgba(255,255,255,0.18)'}; color: ${_clReconSubSection === 'confirmation' ? '#1e40af' : '#ffffff'};">
                  Confirmation <span style="background: ${_clReconSubSection === 'confirmation' ? '#dbeafe' : 'rgba(255,255,255,0.25)'}; color: ${_clReconSubSection === 'confirmation' ? '#1e40af' : '#ffffff'}; padding: 1px 6px; border-radius: 10px; font-size: 11px; font-weight: 800;">${confirmedRows.length}</span>
                </button>
              </div>
            `;
            actionsArea.querySelector('#clSubTabReconSection')?.addEventListener('click', () => {
              _clReconSubSection = 'reconciliation';
              renderActiveSubtab();
            });
            actionsArea.querySelector('#clSubTabConfirmSection')?.addEventListener('click', () => {
              _clReconSubSection = 'confirmation';
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
                  <th style="width: 100px;">Date</th>
                  <th>Journal Entry & Description</th>
                  <th style="width: 150px;">Department</th>
                  <th style="width: 140px;">Transaction Type</th>
                  <th style="text-align: right; width: 140px;">Action</th>
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
                    📌 ${_clStatementSelectedIndices.size} of ${displayRows.length} entries selected
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
                  Showing ${displayRows.length} of ${statementRows.length} entries
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
                        📌 ${_clStatementSelectedIndices.size} of ${displayRows.length} entries selected
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
                          <th style="width: 100px;">Date</th>
                          <th>Journal Entry & Description</th>
                          <th style="width: 150px;">Department</th>
                          <th style="width: 140px;">Transaction Type</th>
                          <th style="text-align: right; width: 140px;">Action</th>
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
            renderActiveSubtab();
          });

          document.getElementById('clSubTabConfirmSection')?.addEventListener('click', () => {
            _clReconSubSection = 'confirmation';
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

      document.querySelectorAll('.cl-recon-ledger-btn').forEach(btn => {
        btn.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault();
            btn.click();
          } else if (e.key === 'Backspace') {
            e.preventDefault();
            selectOptionAndAdvance('', 'prev');
          }
        });

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
          const labelSpan = btn.querySelector('.cl-recon-ledger-label');
          if (labelSpan) {
            labelSpan.textContent = chosenLedger ? chosenLedger.name : 'Select Ledger...';
          }
          btn.style.color = chosenLedger ? 'var(--slate-800)' : 'var(--slate-400)';
          btn.dataset.selectedId = selectedId || '';

          const existingPopover = document.getElementById('clReconLedgerPopover');
          if (existingPopover) existingPopover.remove();

          if (typeof triggerAutoBackup === 'function') triggerAutoBackup();

          const allBtns = Array.from(document.querySelectorAll('.cl-recon-ledger-btn'));
          const currentBtnIdx = allBtns.indexOf(btn);

          if (direction === 'next' && currentBtnIdx > -1 && currentBtnIdx + 1 < allBtns.length) {
            const nextBtn = allBtns[currentBtnIdx + 1];
            setTimeout(() => {
              nextBtn.focus();
              nextBtn.click();
            }, 50);
          } else if (direction === 'prev' && currentBtnIdx > 0) {
            const prevBtn = allBtns[currentBtnIdx - 1];
            setTimeout(() => {
              prevBtn.focus();
              prevBtn.click();
            }, 50);
          }
        }

        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          
          const existingPopover = document.getElementById('clReconLedgerPopover');
          if (existingPopover) {
            const wasSameBtn = existingPopover.dataset.btnIndex === btn.dataset.index;
            existingPopover.remove();
            if (wasSameBtn) return;
          }

          const origIdx = btn.dataset.index;
          const bankId = btn.dataset.accountId;
          const currentSelectedId = btn.dataset.selectedId || '';

          const popover = document.createElement('div');
          popover.id = 'clReconLedgerPopover';
          popover.dataset.btnIndex = origIdx;
          popover.tabIndex = -1;
          popover.style.cssText = `
            position: fixed;
            z-index: 10000;
            width: 320px;
            background: #ffffff;
            border: 1.5px solid #cbd5e1;
            border-radius: 12px;
            box-shadow: 0 20px 35px -5px rgba(15, 23, 42, 0.2), 0 10px 15px -5px rgba(15, 23, 42, 0.1);
            padding: 10px;
            font-family: Inter, sans-serif;
            box-sizing: border-box;
            outline: none;
          `;

          popover.innerHTML = `
            <div style="position: sticky; top: 0; background: #ffffff; z-index: 10; padding-bottom: 6px; margin-bottom: 6px; border-bottom: 1px solid #f1f5f9;">
              <div id="clTypeaheadBadge" style="display: none; align-items: center; justify-content: space-between; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 4px 8px; margin-bottom: 6px; font-size: 11.5px; font-weight: 600; color: #1d4ed8;">
                <span style="display: flex; align-items: center; gap: 4px;">🔍 Match: "<span id="clTypeaheadText" style="font-weight: 700;"></span>"</span>
                <span style="font-size: 10px; color: #64748b; font-weight: 400;">(typing...)</span>
              </div>
              <div id="clReconCategoryTabs" style="display: flex; gap: 4px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none;">
                <button type="button" class="cl-cat-tab active" data-cat="all" style="padding: 4px 10px; font-size: 11.5px; font-weight: 700; border-radius: 6px; border: 1px solid #2563eb; background: #eff6ff; color: #2563eb; cursor: pointer; white-space: nowrap;">All</button>
                <button type="button" class="cl-cat-tab" data-cat="expenses" style="padding: 4px 10px; font-size: 11.5px; font-weight: 600; border-radius: 6px; border: 1px solid #e2e8f0; background: #fff; color: #64748b; cursor: pointer; white-space: nowrap;">Expenses</button>
                <button type="button" class="cl-cat-tab" data-cat="income" style="padding: 4px 10px; font-size: 11.5px; font-weight: 600; border-radius: 6px; border: 1px solid #e2e8f0; background: #fff; color: #64748b; cursor: pointer; white-space: nowrap;">Income</button>
                <button type="button" class="cl-cat-tab" data-cat="assets" style="padding: 4px 10px; font-size: 11.5px; font-weight: 600; border-radius: 6px; border: 1px solid #e2e8f0; background: #fff; color: #64748b; cursor: pointer; white-space: nowrap;">Assets/Liab</button>
              </div>
            </div>
            <div id="clReconLedgerList" style="max-height: 230px; overflow-y: auto; display: flex; flex-direction: column; gap: 3px; padding-right: 2px;">
            </div>
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; font-size: 10.5px; color: #64748b; font-weight: 500;">
              <span>Type letters to search</span>
              <span><kbd style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:3px; padding:1px 4px; font-size:9.5px;">↵ Enter</kbd> Select</span>
              <span><kbd style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:3px; padding:1px 4px; font-size:9.5px;">Esc</kbd> Exit</span>
            </div>
          `;

          const btnRect = btn.getBoundingClientRect();
          const popoverHeight = 280;
          const spaceBelow = window.innerHeight - btnRect.bottom;
          const spaceAbove = btnRect.top;

          popover.style.position = 'fixed';

          if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
            const topPos = Math.max(10, btnRect.top - popoverHeight - 4);
            popover.style.top = `${topPos}px`;
          } else {
            const topPos = Math.min(btnRect.bottom + 4, window.innerHeight - popoverHeight - 10);
            popover.style.top = `${Math.max(10, topPos)}px`;
          }

          const leftPos = Math.max(10, Math.min(btnRect.left, window.innerWidth - 335));
          popover.style.left = `${leftPos}px`;

          document.body.appendChild(popover);

          const listContainer = popover.querySelector('#clReconLedgerList');
          let activeIndex = 0;
          let currentCatFilter = 'all';
          let typeaheadQuery = '';
          let typeaheadTimer = null;

          function updateHighlight() {
            const opts = Array.from(listContainer.querySelectorAll('.cl-recon-opt'));
            if (opts.length === 0) return;
            if (activeIndex < 0) activeIndex = 0;
            if (activeIndex >= opts.length) activeIndex = opts.length - 1;

            opts.forEach((opt, idx) => {
              const isSel = String(opt.dataset.id) === String(currentSelectedId);
              if (idx === activeIndex) {
                opt.style.background = isSel ? '#dbeafe' : '#f1f5f9';
                opt.style.border = '1px solid #2563eb';
                opt.scrollIntoView({ block: 'nearest' });
              } else {
                opt.style.border = isSel ? '1px solid #bfdbfe' : '1px solid transparent';
                opt.style.background = isSel ? '#eff6ff' : 'transparent';
              }
            });
          }

          function renderOptions(filterQuery = '', cat = currentCatFilter) {
            const query = filterQuery.toLowerCase().trim();
            currentCatFilter = cat;

            let categoryFiltered = allLedgers;
            if (cat === 'expenses') {
              categoryFiltered = allLedgers.filter(l => {
                const g = (getLedgerGroup(l.id) || '').toLowerCase();
                return g.includes('expense') || g.includes('purchase') || g.includes('direct') || g.includes('indirect') || g.includes('cost');
              });
            } else if (cat === 'income') {
              categoryFiltered = allLedgers.filter(l => {
                const g = (getLedgerGroup(l.id) || '').toLowerCase();
                return g.includes('income') || g.includes('sale') || g.includes('revenue') || g.includes('gain');
              });
            } else if (cat === 'assets') {
              categoryFiltered = allLedgers.filter(l => {
                const g = (getLedgerGroup(l.id) || '').toLowerCase();
                return g.includes('asset') || g.includes('liab') || g.includes('bank') || g.includes('capital') || g.includes('loan') || g.includes('duty') || g.includes('tax');
              });
            }

            const filtered = categoryFiltered.filter(l => {
              if (!query) return true;
              const nameMatch = l.name.toLowerCase().includes(query);
              const groupMatch = (getLedgerGroup(l.id) || '').toLowerCase().includes(query);
              return nameMatch || groupMatch;
            });

            // Sort so exact/prefix matches come first
            if (query) {
              filtered.sort((a, b) => {
                const aStart = a.name.toLowerCase().startsWith(query);
                const bStart = b.name.toLowerCase().startsWith(query);
                if (aStart && !bStart) return -1;
                if (!aStart && bStart) return 1;
                return 0;
              });
            }

            let html = `
              <div class="cl-recon-opt" data-id="" style="padding: 7px 10px; font-size: 12px; font-weight: 600; color: #64748b; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; background: #f8fafc; border: 1px dashed #cbd5e1; margin-bottom: 2px;">
                <span style="font-size: 13px; color: #94a3b8;">↺</span>
                <span>-- Clear / Unmap --</span>
              </div>
            `;

            if (filtered.length > 0) {
              filtered.forEach(l => {
                const isSel = String(l.id) === String(currentSelectedId);
                const groupName = getLedgerGroup(l.id);

                html += `
                  <div class="cl-recon-opt" data-id="${l.id}" style="padding: 8px 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.1s ease; border: 1px solid ${isSel ? '#bfdbfe' : 'transparent'}; background: ${isSel ? '#eff6ff' : 'transparent'};">
                    <div style="display: flex; flex-direction: column; gap: 1.5px; min-width: 0; padding-right: 8px;">
                      <div style="font-size: 12.5px; font-weight: 600; color: ${isSel ? '#1d4ed8' : '#1e293b'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${ohEsc(l.name)}
                      </div>
                      ${groupName ? `
                        <div style="font-size: 10.5px; font-weight: 500; color: ${isSel ? '#3b82f6' : '#64748b'}; display: flex; align-items: center; gap: 4px;">
                          <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: ${isSel ? '#3b82f6' : '#94a3b8'}; flex-shrink: 0;"></span>
                          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${ohEsc(groupName)}</span>
                        </div>
                      ` : ''}
                    </div>
                    ${isSel ? `
                      <div style="background: #2563eb; color: #fff; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; flex-shrink: 0;">
                        ✓
                      </div>
                    ` : ''}
                  </div>
                `;
              });
            } else {
              html += `<div style="padding: 16px 10px; font-size: 12px; color: #94a3b8; text-align: center;">No matching ledgers</div>`;
            }

            listContainer.innerHTML = html;

            listContainer.querySelectorAll('.cl-recon-opt').forEach((opt, idx) => {
              opt.addEventListener('mouseenter', () => {
                activeIndex = idx;
                updateHighlight();
              });
              opt.addEventListener('click', () => {
                selectOptionAndAdvance(opt.dataset.id, 'next');
              });
            });

            activeIndex = (query && filtered.length > 0) ? 1 : 0;
            updateHighlight();
          }

          function updateTypeaheadFilter() {
            const badge = popover.querySelector('#clTypeaheadBadge');
            const txtSpan = popover.querySelector('#clTypeaheadText');
            if (badge && txtSpan) {
              if (typeaheadQuery) {
                txtSpan.textContent = typeaheadQuery;
                badge.style.display = 'flex';
              } else {
                badge.style.display = 'none';
              }
            }
            renderOptions(typeaheadQuery);
          }

          popover.querySelectorAll('.cl-cat-tab').forEach(tabBtn => {
            tabBtn.addEventListener('click', () => {
              popover.querySelectorAll('.cl-cat-tab').forEach(t => {
                t.style.border = '1px solid #e2e8f0';
                t.style.background = '#fff';
                t.style.color = '#64748b';
                t.style.fontWeight = '600';
              });
              tabBtn.style.border = '1px solid #2563eb';
              tabBtn.style.background = '#eff6ff';
              tabBtn.style.color = '#2563eb';
              tabBtn.style.fontWeight = '700';

              renderOptions(typeaheadQuery, tabBtn.dataset.cat);
            });
          });

          renderOptions();
          popover.focus();

          popover.addEventListener('keydown', (ev) => {
            const opts = Array.from(listContainer.querySelectorAll('.cl-recon-opt'));
            if (ev.key === 'ArrowDown') {
              ev.preventDefault();
              if (opts.length > 0) {
                activeIndex = (activeIndex + 1) % opts.length;
                updateHighlight();
              }
            } else if (ev.key === 'ArrowUp') {
              ev.preventDefault();
              if (opts.length > 0) {
                activeIndex = (activeIndex - 1 + opts.length) % opts.length;
                updateHighlight();
              }
            } else if (ev.key === 'Enter') {
              ev.preventDefault();
              if (opts.length > 0 && activeIndex >= 0 && activeIndex < opts.length) {
                selectOptionAndAdvance(opts[activeIndex].dataset.id, 'next');
              }
            } else if (ev.key === 'Escape') {
              ev.preventDefault();
              popover.remove();
              btn.focus();
            } else if (ev.key === 'Backspace') {
              ev.preventDefault();
              if (typeaheadQuery.length > 0) {
                typeaheadQuery = typeaheadQuery.slice(0, -1);
                updateTypeaheadFilter();
              } else {
                selectOptionAndAdvance('', 'prev');
              }
            } else if (ev.key.length === 1 && !ev.ctrlKey && !ev.altKey && !ev.metaKey) {
              ev.preventDefault();
              typeaheadQuery += ev.key.toLowerCase();
              updateTypeaheadFilter();

              clearTimeout(typeaheadTimer);
              typeaheadTimer = setTimeout(() => {
                typeaheadQuery = '';
                updateTypeaheadFilter();
              }, 2000);
            }
          });

          const closeHandler = (evt) => {
            if (!popover.contains(evt.target) && !btn.contains(evt.target)) {
              popover.remove();
              document.removeEventListener('click', closeHandler);
            }
          };
          setTimeout(() => {
            document.addEventListener('click', closeHandler);
          }, 10);
        });
      });

      document.getElementById('clStmtSelectAllCb')?.addEventListener('change', (e) => {
        if (e.target.checked) {
          displayRows.forEach(r => _clStatementSelectedIndices.add(r.origIdx));
        } else {
          displayRows.forEach(r => _clStatementSelectedIndices.delete(r.origIdx));
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

      (entry.allRows || []).forEach(row => {
        if (row.particular.trim() === selectedLedger.name.trim()) {
          const dr = parseFloat(row.debit) || 0;
          const cr = parseFloat(row.credit) || 0;

          cbLines.push({
            id: entry.id,
            date: entry.date,
            voucherNo: entry.voucherNo || '—',
            opposite: getOppositeParticulars(entry, selectedLedger.name, dr > 0),
            narration: entry.narration || '',
            receipt: dr,
            payment: cr
          });
        }
      });
    });

    cbLines.sort((a, b) => a.date.localeCompare(b.date));

    let rowsHtml = `
      <tr style="background:#fafbfc; font-weight: 700;">
        <td colspan="4">Opening Balance</td>
        <td class="num-val">—</td>
        <td class="num-val">—</td>
        <td class="num-val" style="color:var(--slate-800);">${fmtAmt(openingBal)}</td>
      </tr>
    `;

    let runningBal = openingBal;
    cbLines.forEach((line) => {
      runningBal = runningBal + line.receipt - line.payment;
      rowsHtml += `
        <tr>
          <td>${line.date}</td>
          <td>
            <span style="font-family: monospace; font-weight: 700; color: var(--slate-700); cursor:pointer; text-decoration:underline dotted;" 
                  onclick="window.viewVoucherFromStatement(${line.id})" title="Click to view voucher">${line.voucherNo}</span>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--slate-800);">${ohEsc(line.opposite)}</div>
            ${line.narration ? `<div style="font-size: 11.5px; color: var(--slate-400); font-weight: 500; margin-top: 2px;">${ohEsc(line.narration)}</div>` : ''}
          </td>
          <td style="text-align: center;">
            ${line.receipt > 0 
              ? `<span class="cl-badge reconciled" style="font-size:10px;">Receipt</span>` 
              : `<span class="cl-badge unreconciled" style="font-size:10px; background:#fef2f2; color:#ef4444; border-color:#fee2e2;">Payment</span>`
            }
          </td>
          <td class="num-val" style="color: var(--emerald-600);">${line.receipt > 0 ? fmtAmt(line.receipt) : '—'}</td>
          <td class="num-val" style="color: var(--red-600);">${line.payment > 0 ? fmtAmt(line.payment) : '—'}</td>
          <td class="num-val">${fmtAmt(runningBal)}</td>
        </tr>
      `;
    });

    if (actionsArea) {
      actionsArea.innerHTML = `
        <button class="btn btn-success" id="btnClRecordReceipt" style="height: 32px; font-size: 12.5px; padding: 0 12px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
          ＋ Receipt
        </button>
        <button class="btn btn-danger" id="btnClRecordPayment" style="height: 32px; font-size: 12.5px; padding: 0 12px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
          － Payment
        </button>
      `;
      document.getElementById('btnClRecordReceipt').addEventListener('click', () => {
        showFastEntryModal('Receipt', selectedLedger);
      });
      document.getElementById('btnClRecordPayment').addEventListener('click', () => {
        showFastEntryModal('Payment', selectedLedger);
      });
    }

    if (controls) {
      controls.innerHTML = `
        <div style="display: flex; gap: 8px; align-items: center;">
          <select id="clCbSelectAccount" class="je-input" style="height: 34px; font-size: 13px; padding: 0 8px; cursor: pointer; background: #fff; border-radius: 6px; width: 140px;">
            ${cceAccounts.map(a => `<option value="${a.id}" ${a.id.toString() === selectedLedger.id.toString() ? 'selected' : ''}>${ohEsc(a.name)}</option>`).join('')}
          </select>
          <input type="date" id="clCbFromDate" class="je-input" value="${fromVal}" style="height: 34px; font-size: 13px; padding: 0 8px; border-radius: 6px; width: 120px;" />
          <input type="date" id="clCbToDate" class="je-input" value="${toVal}" style="height: 34px; font-size: 13px; padding: 0 8px; border-radius: 6px; width: 120px;" />
        </div>
      `;
      document.getElementById('clCbSelectAccount').addEventListener('change', (e) => {
        _clCashbookAccountId = e.target.value;
        renderActiveSubtab();
      });
      document.getElementById('clCbFromDate').addEventListener('change', (e) => {
        _clCashflowDateFrom = e.target.value;
        syncGlobalDates(_clCashflowDateFrom, _clCashflowDateTo);
        renderActiveSubtab();
      });
      document.getElementById('clCbToDate').addEventListener('change', (e) => {
        _clCashflowDateTo = e.target.value;
        syncGlobalDates(_clCashflowDateFrom, _clCashflowDateTo);
        renderActiveSubtab();
      });
    }

    target.innerHTML = `
      <div class="recon-stats" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 20px; padding: 12px 16px;">
        <div class="recon-stat-card">
          <span class="recon-stat-label">Opening Balance</span>
          <span class="recon-stat-val">${fmtAmt(openingBal)}</span>
        </div>
        <div class="recon-stat-card">
          <span class="recon-stat-label">Net Period Change</span>
          <span class="recon-stat-val" style="color: ${closingBal >= openingBal ? 'var(--emerald-600)' : 'var(--red-600)'};">
            ${fmtAmt(closingBal - openingBal)}
          </span>
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
              <th style="width: 100px;">Date</th>
              <th style="width: 100px;">Voucher</th>
              <th>Opposite Account / Description</th>
              <th style="width: 90px; text-align: center;">Type</th>
              <th style="text-align: right; width: 120px;">Receipt (Dr)</th>
              <th style="text-align: right; width: 120px;">Payment (Cr)</th>
              <th style="text-align: right; width: 130px;">Running Bal</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  // ── Modal for Rapid Cash Receipts / Payments ──────────────────────
