  // ══════════════════════════════════════════════════════════════════
  //  CASHLINE ACCOUNTS — Bank account list, details, add/edit modal
  //  (Split from cashline.js for maintainability)
  // ══════════════════════════════════════════════════════════════════

  function renderAccountsView(target, controls, actionsArea) {
    if (actionsArea) actionsArea.innerHTML = '';
    syncBankAccounts();
    const accounts = window.KYA_STORE.bankAccounts || [];

    let totalBookBal = 0;
    let totalReconciledBal = 0;
    const processedAccounts = accounts.map(acc => {
      const ledger = coaLedgers.find(l => l.id === acc.ledgerId);
      let bookBal = 0;
      if (ledger) {
        const balData = calculateLedgerBalances(ledger);
        bookBal = balData.closingBalance;
      }
      const unreconciledSum = getUnreconciledSum(acc.ledgerId);
      const reconciledBal = bookBal - unreconciledSum;

      totalBookBal += bookBal;
      totalReconciledBal += reconciledBal;

      return {
        ...acc,
        bookBal,
        reconciledBal
      };
    });

    const statsHtml = `
      <div class="recon-stats" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 20px; padding: 12px 16px;">
        <div class="recon-stat-card">
          <span class="recon-stat-label">No. of Accounts</span>
          <span class="recon-stat-val">${accounts.length}</span>
        </div>
        <div class="recon-stat-card">
          <span class="recon-stat-label">Bank Balance</span>
          <span class="recon-stat-val" style="color: var(--emerald-600);">${fmtAmt(totalReconciledBal)}</span>
        </div>
        <div class="recon-stat-card">
          <span class="recon-stat-label">Book Balance</span>
          <span class="recon-stat-val" style="color: var(--blue-700);">${fmtAmt(totalBookBal)}</span>
        </div>
      </div>
    `;

    let contentHtml = '';
    if (processedAccounts.length === 0) {
      contentHtml = `
        <div style="padding: 48px; text-align: center; border: 1.5px dashed var(--slate-200); border-radius: 16px; background: var(--slate-50);">
          <div style="font-size: 14.5px; font-weight: 700; color: var(--slate-700);">No bank accounts linked yet</div>
          <div style="font-size: 12.5px; color: var(--slate-400); margin-top: 4px;">Link ledgers under the "Bank Account" group ledger inside Chart of Accounts to manage them here.</div>
        </div>
      `;
    } else {
      let rowsHtml = '';
      processedAccounts.forEach(acc => {
        rowsHtml += `
          <tr class="cl-list-row" onclick="window.clShowAccountDetails(${acc.id})" style="transition: background 0.15s ease; border-bottom: 1px solid var(--slate-100); cursor: pointer;">
            <td style="padding: 14px 16px; vertical-align: middle;">
              <div style="font-size: 13.5px; font-weight: 600; color: var(--slate-800);">${ohEsc(acc.name)}</div>
            </td>
            <td style="padding: 14px 16px; vertical-align: middle;">
              <div style="font-size: 13.5px; font-family: monospace; font-weight: 600; color: var(--slate-700);">${ohEsc(acc.accountNumber || '—')}</div>
            </td>
            <td style="padding: 14px 16px; vertical-align: middle;">
              <div style="font-size: 13.5px; font-family: monospace; font-weight: 600; color: var(--slate-700);">${ohEsc(acc.ifsc || '—')}</div>
            </td>
            <td style="padding: 14px 16px; vertical-align: middle; text-align: right;">
              <div style="font-size: 13.5px; font-weight: 600; color: var(--emerald-600); font-family: monospace;">${fmtAmt(acc.reconciledBal)}</div>
            </td>
            <td style="padding: 14px 16px; vertical-align: middle; text-align: right;">
              <div style="font-size: 13.5px; font-weight: 600; color: var(--slate-700); font-family: monospace;">${fmtAmt(acc.bookBal)}</div>
            </td>
          </tr>
        `;
      });

      contentHtml = `
        <div style="border: 1.5px solid var(--slate-150); border-radius: 16px; overflow: hidden; background: var(--white); box-shadow: var(--shadow-sm);">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background: var(--slate-50); border-bottom: 1.5px solid var(--slate-200);">
                <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; color: var(--slate-400); text-transform: uppercase; letter-spacing: 0.05em;">Bank</th>
                <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; color: var(--slate-400); text-transform: uppercase; letter-spacing: 0.05em;">Account No</th>
                <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; color: var(--slate-400); text-transform: uppercase; letter-spacing: 0.05em;">IFSC</th>
                <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; color: var(--slate-400); text-transform: uppercase; letter-spacing: 0.05em; text-align: right; width: 180px;">Bank Balance</th>
                <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; color: var(--slate-400); text-transform: uppercase; letter-spacing: 0.05em; text-align: right; width: 180px;">Book Balance</th>
              </tr>
            </thead>
            <tbody style="background: var(--white);">
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;
    }

    target.innerHTML = `
      <div style="margin-top: 10px;">
        ${statsHtml}
        ${contentHtml}
      </div>
    `;
  }

  // ── Excel Library Loader ───────────────────────────────────────────
  function showAccountDetailsModal(accId) {
    const acc = (window.KYA_STORE.bankAccounts || []).find(x => x.id === accId);
    if (!acc) return;

    const ledger = coaLedgers.find(l => l.id === acc.ledgerId);
    let bookBal = 0;
    if (ledger) {
      const balData = calculateLedgerBalances(ledger);
      bookBal = balData.closingBalance;
    }
    const unreconciledSum = getUnreconciledSum(acc.ledgerId);
    const reconciledBal = bookBal - unreconciledSum;

    document.getElementById('clAccountDetailsOverlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'clAccountDetailsOverlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 10005;
      background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(5px);
      display: flex; align-items: center; justify-content: center;
      font-family: var(--font-main), Inter, sans-serif;
    `;

    overlay.innerHTML = `
      <div style="background: #fff; border-radius: 24px; padding: 32px; width: 92%; max-width: 500px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); position: relative; box-sizing: border-box; max-height: 90vh; overflow-y: auto;">
        
        <div style="margin-bottom: 24px;">
          <h3 style="margin: 0; font-size: 18px; font-weight: 800; color: var(--slate-900);">${ohEsc(acc.name)}</h3>
          <p style="margin: 2px 0 0 0; font-size: 13px; color: var(--slate-400);">${ohEsc(acc.bankName)}</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 28px;">
          <div style="grid-column: 1 / -1; background: var(--slate-50); border-radius: 12px; padding: 14px 16px; border: 1px solid var(--slate-100);">
            <div style="font-size: 11px; font-weight: 700; color: var(--slate-400); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Account Number</div>
            <div style="font-size: 16px; font-family: monospace; font-weight: 700; color: var(--slate-800);">${ohEsc(acc.accountNumber || '—')}</div>
          </div>

          <div style="background: var(--slate-50); border-radius: 12px; padding: 12px 14px; border: 1px solid var(--slate-100);">
            <div style="font-size: 10px; font-weight: 700; color: var(--slate-400); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">IFSC Code</div>
            <div style="font-size: 13.5px; font-family: monospace; font-weight: 700; color: var(--slate-800);">${ohEsc(acc.ifsc || '—')}</div>
          </div>
          
          <div style="background: var(--slate-50); border-radius: 12px; padding: 12px 14px; border: 1px solid var(--slate-100);">
            <div style="font-size: 10px; font-weight: 700; color: var(--slate-400); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Branch</div>
            <div style="font-size: 13.5px; font-weight: 700; color: var(--slate-800);">${ohEsc(acc.branch || '—')}</div>
          </div>

          <!-- Debit Card details -->
          <div style="grid-column: 1 / -1; border-top: 1px solid var(--slate-100); padding-top: 16px; margin-top: 4px;">
            <div style="font-size: 12px; font-weight: 800; color: var(--slate-700); margin-bottom: 12px;">
              Debit Card Information
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
              <div style="grid-column: 1 / -1; background: var(--slate-50); border-radius: 12px; padding: 12px 14px; border: 1px solid var(--slate-100);">
                <div style="font-size: 10px; font-weight: 700; color: var(--slate-400); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Card Number</div>
                <div style="font-size: 14px; font-family: monospace; font-weight: 700; color: var(--slate-800);">${ohEsc(acc.debitCardNo || '—')}</div>
              </div>
              <div style="background: var(--slate-50); border-radius: 12px; padding: 12px 14px; border: 1px solid var(--slate-100);">
                <div style="font-size: 10px; font-weight: 700; color: var(--slate-400); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Expiry Date</div>
                <div style="font-size: 13.5px; font-family: monospace; font-weight: 700; color: var(--slate-800);">${ohEsc(acc.expiryDate || '—')}</div>
              </div>
              <div style="background: var(--slate-50); border-radius: 12px; padding: 12px 14px; border: 1px solid var(--slate-100);">
                <div style="font-size: 10px; font-weight: 700; color: var(--slate-400); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">CVV</div>
                <div style="font-size: 13.5px; font-family: monospace; font-weight: 700; color: var(--slate-800);">${ohEsc(acc.cvv || '—')}</div>
              </div>
            </div>
          </div>

          <!-- Statement & Balance details -->
          <div style="grid-column: 1 / -1; border-top: 1px solid var(--slate-100); padding-top: 16px; margin-top: 4px;">
            <div style="font-size: 12px; font-weight: 800; color: var(--slate-700); margin-bottom: 12px;">
              Statement & Balances
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
              <div style="background: var(--slate-50); border-radius: 12px; padding: 12px 14px; border: 1px solid var(--slate-100);">
                <div style="font-size: 10px; font-weight: 700; color: var(--slate-400); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Last Statement Date</div>
                <div style="font-size: 13.5px; font-weight: 700; color: var(--slate-800);">${ohEsc(acc.lastStatementDate || '—')}</div>
              </div>
              <div style="background: var(--slate-50); border-radius: 12px; padding: 12px 14px; border: 1px solid var(--slate-100);">
                <div style="font-size: 10px; font-weight: 700; color: var(--slate-400); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Opening Balance</div>
                <div style="font-size: 13.5px; font-weight: 700; color: var(--slate-800); font-family: monospace;">${fmtAmt(acc.openingBalance || 0)}</div>
              </div>
              <div style="background: var(--slate-50); border-radius: 12px; padding: 12px 14px; border: 1px solid var(--slate-100);">
                <div style="font-size: 10px; font-weight: 700; color: var(--slate-400); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Bank Balance</div>
                <div style="font-size: 13.5px; font-weight: 700; color: var(--emerald-600); font-family: monospace;">${fmtAmt(reconciledBal)}</div>
              </div>
              <div style="background: var(--slate-50); border-radius: 12px; padding: 12px 14px; border: 1px solid var(--slate-100);">
                <div style="font-size: 10px; font-weight: 700; color: var(--slate-400); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Book Balance</div>
                <div style="font-size: 13.5px; font-weight: 700; color: var(--slate-800); font-family: monospace;">${fmtAmt(bookBal)}</div>
              </div>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid var(--slate-100); padding-top: 20px;">
          <button class="btn btn-secondary" id="clDetailsCloseBtn" style="padding: 10px 20px;">Close</button>
          <button class="btn btn-primary" id="clDetailsEditBtn" style="padding: 10px 20px;">Edit Details</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('#clDetailsCloseBtn').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    overlay.querySelector('#clDetailsEditBtn').addEventListener('click', () => {
      close();
      window.clEditAccount(accId);
    });
  }

  // ── Modal for Adding/Editing Bank Account ──────────────────────────
  function showAddAccountModal(editId = null) {
    const acc = editId ? (window.KYA_STORE.bankAccounts || []).find(x => x.id === editId) : null;
    
    // Get list of existing bank ledgers (under Bank Account Group Ledger) to optionally link
    const bankGroup = coaLedgers.find(l => l.name === 'Bank Account' && l.type === 'group-ledger');
    const bankLedgers = bankGroup ? coaLedgers.filter(l => l.type === 'ledger' && l.glId === bankGroup.id) : [];

    // Find which ledger IDs are already linked to OTHER bank accounts
    const otherLinkedLedgerIds = (window.KYA_STORE.bankAccounts || [])
      .filter(a => !acc || a.id !== acc.id)
      .map(a => a.ledgerId);

    // Filter to only show bank ledgers that are not already linked to another account
    const filteredLedgers = bankLedgers.filter(l => !otherLinkedLedgerIds.includes(l.id));
    
    const ledgOpts = filteredLedgers.map(l => 
      `<option value="${l.id}" ${acc && acc.ledgerId === l.id ? 'selected' : ''}>${ohEsc(l.name)} (Code: ${l.code || 'None'})</option>`
    ).join('');

    const modalTitle = acc ? 'Edit Bank Account' : 'Add Bank Account';
    const confirmLabel = acc ? 'Save Changes' : '＋ Add Account';

    document.getElementById('clAccountModalOverlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'clAccountModalOverlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 10005;
      background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(5px);
      display: flex; align-items: center; justify-content: center;
      font-family: var(--font-main), Inter, sans-serif;
    `;

    overlay.innerHTML = `
      <div style="background: #fff; border-radius: 20px; padding: 28px; width: 92%; max-width: 480px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); position: relative; box-sizing: border-box; max-height: 90vh; overflow-y: auto;">
        
        <h3 style="margin: 0 0 4px 0; font-size: 18px; font-weight: 800; color: var(--slate-900);">${modalTitle}</h3>
        <p style="margin: 0 0 20px 0; font-size: 12.5px; color: var(--slate-400);">Link this account to a General Ledger account to fetch automated book updates.</p>
        
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div class="cl-form-group">
            <label>Account Name *</label>
            <input type="text" id="clMName" class="je-input" placeholder="e.g. HDFC Current A/c" value="${acc ? ohEsc(acc.name) : ''}" style="height: 38px;" />
          </div>
          
          <div class="cl-form-group">
            <label>Bank Name *</label>
            <input type="text" id="clMBankName" class="je-input" placeholder="e.g. HDFC Bank Ltd" value="${acc ? ohEsc(acc.bankName) : ''}" style="height: 38px;" />
          </div>
          
          <div class="cl-input-row">
            <div class="cl-form-group">
              <label>Account Number</label>
              <input type="text" id="clMAccNo" class="je-input" placeholder="e.g. 501002345098" value="${acc ? ohEsc(acc.accountNumber) : ''}" style="height: 38px;" />
            </div>
            <div class="cl-form-group">
              <label>IFSC Code</label>
              <input type="text" id="clMIfsc" class="je-input" placeholder="e.g. HDFC0000124" value="${acc ? ohEsc(acc.ifsc) : ''}" style="height: 38px; text-transform: uppercase;" />
            </div>
          </div>
          
          <div class="cl-input-row">
            <div class="cl-form-group">
              <label>Branch / Location</label>
              <input type="text" id="clMBranch" class="je-input" placeholder="e.g. MG Road, Bengaluru" value="${acc ? ohEsc(acc.branch) : ''}" style="height: 38px;" />
            </div>
            <div class="cl-form-group">
              <label>Opening Balance</label>
              <input type="number" step="0.01" min="0" id="clMOpening" class="je-input" placeholder="₹ 0.00" value="${acc ? acc.openingBalance || '' : ''}" style="height: 38px;" ${acc ? 'disabled' : ''} />
            </div>
          </div>

          <div class="cl-input-row">
            <div class="cl-form-group">
              <label>Debit Card No.</label>
              <input type="text" id="clMDebitCardNo" class="je-input" placeholder="e.g. 4111 2222 3333 4444" value="${acc ? ohEsc(acc.debitCardNo || '') : ''}" style="height: 38px;" />
            </div>
            <div class="cl-form-group">
              <label>Expiry Date</label>
              <input type="text" id="clMExpiryDate" class="je-input" placeholder="MM/YY" value="${acc ? ohEsc(acc.expiryDate || '') : ''}" style="height: 38px;" />
            </div>
          </div>
          
          <div class="cl-input-row">
            <div class="cl-form-group" style="grid-column: 1 / -1;">
              <label>CVV</label>
              <input type="password" id="clMCvv" class="je-input" placeholder="e.g. 123" value="${acc ? ohEsc(acc.cvv || '') : ''}" style="height: 38px; font-family: monospace;" />
            </div>
          </div>

          <div class="cl-form-group" style="display: none;">
            <label>Link Ledger Account</label>
            <select id="clMLedgerId" class="je-input" style="height: 38px; cursor: pointer; background: #fff;">
              <option value="${acc ? acc.ledgerId : 'new'}" selected>${acc ? ohEsc(acc.name) : ''}</option>
            </select>
          </div>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 24px; justify-content: flex-end;">
          <button class="btn btn-secondary" id="clAccountModalCancel" style="padding: 10px 20px;">Cancel</button>
          <button class="btn btn-primary" id="clAccountModalSave" style="padding: 10px 20px;">${confirmLabel}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('#clAccountModalCancel').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    // Handle Save
    overlay.querySelector('#clAccountModalSave').addEventListener('click', () => {
      const name = overlay.querySelector('#clMName').value.trim();
      const bankName = overlay.querySelector('#clMBankName').value.trim();
      const accountNumber = overlay.querySelector('#clMAccNo').value.trim();
      const ifsc = overlay.querySelector('#clMIfsc').value.trim().toUpperCase();
      const branch = overlay.querySelector('#clMBranch').value.trim();
      const opening = parseFloat(overlay.querySelector('#clMOpening').value) || 0;
      const debitCardNo = overlay.querySelector('#clMDebitCardNo').value.trim();
      const expiryDate = overlay.querySelector('#clMExpiryDate').value.trim();
      const cvv = overlay.querySelector('#clMCvv').value.trim();
      let ledgerId = overlay.querySelector('#clMLedgerId').value;

      if (!name || !bankName) {
        showToast('Please fill out all required fields (*).', 'warning');
        return;
      }

      if (editId) {
        // Edit Mode
        const accountIndex = window.KYA_STORE.bankAccounts.findIndex(x => x.id === editId);
        if (accountIndex > -1) {
          const oldAcc = window.KYA_STORE.bankAccounts[accountIndex];
          oldAcc.name = name;
          oldAcc.bankName = bankName;
          oldAcc.accountNumber = accountNumber;
          oldAcc.ifsc = ifsc;
          oldAcc.branch = branch;
          oldAcc.debitCardNo = debitCardNo;
          oldAcc.expiryDate = expiryDate;
          oldAcc.cvv = cvv;
          if (ledgerId !== 'new') {
            oldAcc.ledgerId = Number(ledgerId);
          }
          // Sync name to Chart of Accounts ledger
          const ledger = coaLedgers.find(l => l.id === oldAcc.ledgerId);
          if (ledger) {
            ledger.name = name;
          }
        }
        showToast(`Bank Account "${name}" updated.`, 'success');
      } else {
        // Add Mode
        if (ledgerId === 'new') {
          // Auto create a ledger in Chart of Accounts
          const bankGroup = coaLedgers.find(l => l.name === 'Bank Account' && l.type === 'group-ledger');
          const newLedgerId = Date.now() + 2000;
          const newLedger = {
            id: newLedgerId,
            sgId: 'sg-cce',
            glId: bankGroup ? bankGroup.id : null,
            name: name,
            code: '',
            openingBalance: opening.toString(),
            type: 'ledger',
            aliases: []
          };
          coaLedgers.push(newLedger);
          ledgerId = newLedgerId;
        } else {
          ledgerId = Number(ledgerId);
        }

        window.KYA_STORE.bankAccounts.push({
          id: Date.now(),
          ledgerId,
          name,
          bankName,
          accountNumber,
          ifsc,
          branch,
          openingBalance: opening,
          debitCardNo,
          expiryDate,
          cvv,
          lastStatementDate: '—'
        });
        showToast(`Bank Account "${name}" created and linked.`, 'success');
      }

      close();
      renderActiveSubtab();
      refreshAllReports();
      triggerAutoBackup();
    });
  }

  // Global triggers wired for click handlers inside HTML template strings
  window.clReconcileAccount = function(id) {
    _clReconBankId = id;
    _clActiveTopTab = 'banking';
    _clActiveBankingTab = 'reconciliation';
    // Load state
    const acc = window.KYA_STORE.bankAccounts.find(x => x.id === id);
    if (acc) {
      _clReconStmtDate = new Date().toISOString().split('T')[0];
    }
    renderCashlinePanel();
  };

  window.clShowAccountDetails = function(id) {
    showAccountDetailsModal(id);
  };
 
  window.clEditAccount = function(id) {
    showAddAccountModal(id);
  };

  window.clAutoMatchReconcile = function(bankId) {
    const accounts = window.KYA_STORE.bankAccounts || [];
    const currentAcc = accounts.find(x => x.id === Number(bankId));
    if (!currentAcc) return;

    const uploadedRows = (window.KYA_STORE.uploadedStatements || {})[currentAcc.id] || [];
    if (uploadedRows.length === 0) {
      showToast('No statement transactions uploaded yet.', 'warning');
      return;
    }

    const linkedLedger = coaLedgers.find(l => l.id === currentAcc.ledgerId);
    if (!linkedLedger) return;

    // Build txRows exactly as in renderReconciliationView
    const txRows = [];
    postedEntries.forEach(entry => {
      (entry.allRows || []).forEach(row => {
        if (row.particular.trim() === linkedLedger.name.trim()) {
          const key = entry.id + '_' + row.id;
          const reconDate = window.KYA_STORE.reconciliationState[key] || '';
          const dr = parseFloat(row.debit) || 0;
          const cr = parseFloat(row.credit) || 0;

          txRows.push({
            key,
            date: entry.date,
            debit: dr,
            credit: cr,
            reconDate
          });
        }
      });
    });

    let matchCount = 0;
    txRows.forEach(tx => {
      if (tx.reconDate) return;

      const match = uploadedRows.find(sRow => {
        const bookAmt = tx.debit > 0 ? tx.debit : tx.credit;
        const stmtAmt = tx.debit > 0 ? parseFloat(sRow.debit) || 0 : parseFloat(sRow.credit) || 0;
        
        if (Math.abs(bookAmt - stmtAmt) > 0.01) return false;
        
        const txDate = new Date(tx.date);
        const stmtDate = new Date(sRow.date);
        const diffDays = Math.abs(txDate - stmtDate) / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
      });

      if (match) {
        window.KYA_STORE.reconciliationState[tx.key] = match.date;
        matchCount++;
      }
    });

    if (matchCount > 0) {
      showToast(`Auto-reconciled ${matchCount} matching transactions.`, 'success');
      renderActiveSubtab();
      triggerAutoBackup();
    } else {
      showToast('No unmatched transactions could be automatically matched.', 'info');
    }
  };

  window.clDeleteAccount = function(id) {
    const acc = window.KYA_STORE.bankAccounts.find(x => x.id === id);
    if (!acc) return;

    showKyaConfirm({
      title: 'Remove Bank Account?',
      message: `Are you sure you want to remove the bank account for <strong>${ohEsc(acc.name)}</strong>?<br>The linked ledger account inside Chart of Accounts will NOT be deleted.`,
      confirmLabel: 'Remove',
      okBg: 'var(--red-600)',
      onConfirm: () => {
        // Unlink from Bank Account group ledger in Chart of Accounts
        const ledger = coaLedgers.find(l => l.id === acc.ledgerId);
        if (ledger) {
          ledger.glId = null;
        }
        window.KYA_STORE.bankAccounts = window.KYA_STORE.bankAccounts.filter(x => x.id !== id);
        showToast(`Bank Account "${acc.name}" disconnected.`, 'info');
        renderActiveSubtab();
        triggerAutoBackup();
      }
    });
  };

  // Helper: Sum unreconciled cheques/payments for a bank ledger
