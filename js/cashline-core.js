  // ══════════════════════════════════════════════════════════════════
  //  CASHLINE CORE — State, init, tab shell, shared utils
  //  (Split from cashline.js for maintainability)
  // ══════════════════════════════════════════════════════════════════

  function injectCashlineStyles() {
    if (document.getElementById('cashline-styles')) return;
    const s = document.createElement('style');
    s.id = 'cashline-styles';
    s.textContent = `
      .cashline-layout {
        display: block;
        font-family: var(--font-main), 'Inter', sans-serif;
      }
      .cashline-tabs {
        display: flex;
        flex-direction: column;
        gap: 8px;
        background: var(--white);
        border: 1.5px solid var(--slate-150);
        border-radius: 16px;
        padding: 16px;
        align-self: start;
        box-shadow: var(--shadow-sm);
      }
      .cashline-tab-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        border-radius: 10px;
        border: none;
        background: transparent;
        color: var(--slate-600);
        font-size: 13.5px;
        font-weight: 600;
        cursor: pointer;
        text-align: left;
        transition: all 0.2s ease;
      }
      .cashline-tab-btn:hover {
        background: var(--slate-50);
        color: var(--slate-900);
      }
      .cashline-tab-btn.active {
        background: var(--blue-50);
        color: var(--blue-700);
      }
      .cashline-tab-btn svg {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }
      .cashline-content {
        background: var(--white);
        border: 1.5px solid var(--slate-150);
        border-radius: 20px;
        padding: 24px;
        min-height: 480px;
        box-shadow: var(--shadow-sm);
      }
      .cl-sub-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        border-bottom: 1.5px solid var(--slate-100);
        padding-bottom: 16px;
      }
      .cl-sub-title {
        font-size: 18px;
        font-weight: 800;
        color: var(--slate-900);
        margin: 0;
      }
      .cl-sub-desc {
        font-size: 12.5px;
        color: var(--slate-400);
        margin: 4px 0 0 0;
      }
      
      /* Accounts grid styling */
      .cl-accounts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 20px;
        margin-bottom: 24px;
      }
      .cl-account-card {
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 20px;
        padding: 24px;
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }
      .cl-account-card:hover {
        border-color: rgba(59, 130, 246, 0.4);
        box-shadow: 0 20px 35px -5px rgba(0, 0, 0, 0.4), 0 12px 16px -8px rgba(0, 0, 0, 0.4);
        transform: translateY(-4px);
      }
      .cl-account-card::after {
        content: '';
        position: absolute;
        top: -60px;
        right: -60px;
        width: 160px;
        height: 160px;
        background: radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%);
        pointer-events: none;
      }
      .cl-account-header {
        display: flex;
        justify-content: space-between;
        align-items: start;
        margin-bottom: 8px;
      }
      .cl-account-name {
        font-size: 16px;
        font-weight: 800;
        color: #ffffff;
        margin: 0;
        letter-spacing: -0.2px;
      }
      .cl-account-bank {
        font-size: 12.5px;
        color: #94a3b8;
        font-weight: 500;
        margin-top: 2px;
      }
      .cl-account-badge {
        font-size: 9px;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: 12px;
        text-transform: uppercase;
        background: rgba(255, 255, 255, 0.08);
        color: #cbd5e1;
        border: 1px solid rgba(255, 255, 255, 0.05);
      }
      .cl-account-details {
        font-size: 13px;
        color: #cbd5e1;
        margin-bottom: 20px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .cl-account-bal-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 12px;
        border-top: 1px dashed rgba(255, 255, 255, 0.1);
      }
      .cl-account-bal-label {
        font-size: 11px;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .cl-account-bal-val {
        font-size: 15.5px;
        font-weight: 800;
        color: #f8fafc;
      }
      .cl-account-bal-val.reconciled {
        color: #34d399;
      }
      .cl-card-actions {
        display: flex;
        gap: 8px;
        margin-top: 18px;
      }
      .cl-card-btn {
        flex: 1;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 700;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.05);
        color: #cbd5e1;
        cursor: pointer;
        transition: all 0.15s ease;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      .cl-card-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.15);
        color: #ffffff;
      }
      .cl-card-btn.primary {
        background: #2563eb;
        color: #ffffff;
        border: none;
      }
      .cl-card-btn.primary:hover {
        background: #1d4ed8;
      }

      /* Glass Controls for Header Area */
      .cl-glass-control {
        height: 34px;
        background: rgba(255, 255, 255, 0.18) !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
        border: 1px solid rgba(255, 255, 255, 0.35) !important;
        border-radius: 8px !important;
        color: #ffffff !important;
        font-size: 12.5px !important;
        font-weight: 600 !important;
        padding: 0 10px !important;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.25) !important;
        transition: all 0.15s ease !important;
        outline: none !important;
        box-sizing: border-box;
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
        color-scheme: dark;
      }

      /* Reconciliation / Confirmation Pill Switcher */
      .cl-recon-pill-wrap {
        display: inline-flex;
        align-items: center;
        background: rgba(0, 0, 0, 0.22);
        padding: 3px;
        border-radius: 8px;
        border: 1.5px solid rgba(255, 255, 255, 0.35);
        gap: 3px;
      }
      .cl-recon-pill-btn {
        height: 28px;
        padding: 0 12px;
        font-size: 12.5px;
        font-weight: 600;
        border-radius: 6px;
        border: none;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all 0.15s ease;
        background: transparent;
        color: rgba(255, 255, 255, 0.85);
        outline: none;
        user-select: none;
      }
      .cl-recon-pill-btn:hover {
        background: rgba(255, 255, 255, 0.18);
        color: #ffffff;
      }
      .cl-recon-pill-btn.active {
        background: #ffffff !important;
        color: #1e3a8a !important;
        font-weight: 700 !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }

      /* Form inputs styling */
      .cl-form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 16px;
      }
      .cl-form-group label {
        font-size: 11px;
        font-weight: 700;
        color: var(--slate-500);
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .cl-input-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      
      /* Reconciliation styling */
      .recon-stats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        background: var(--slate-50);
        border: 1.5px solid var(--slate-200);
        border-radius: 12px;
        padding: 12px;
        margin-bottom: 20px;
      }
      .recon-stat-card {
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 5px;
        background: #ffffff;
        border: 1px solid var(--slate-200);
        border-radius: 10px;
        padding: 12px 16px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.03);
      }
      .recon-stat-label {
        font-size: 11px;
        font-weight: 700;
        color: var(--slate-500);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .recon-stat-val {
        font-size: 16.5px;
        font-weight: 800;
        color: var(--slate-800);
        font-variant-numeric: tabular-nums;
      }
      .recon-stat-val.diff-error {
        color: var(--red-600);
      }
      .recon-stat-val.diff-success {
        color: var(--emerald-600);
      }
      
      /* Cashbook & Cashflow Report UI */
      .cl-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
      }
      .cl-table th {
        background: var(--slate-50);
        color: var(--slate-600);
        font-weight: 700;
        font-size: 12px;
        padding: 12px 14px;
        text-align: left;
        border-bottom: 2px solid var(--slate-200);
      }
      .cl-table td {
        padding: 12px 14px;
        border-bottom: 1px solid var(--slate-100);
        font-size: 13px;
        color: var(--slate-700);
        vertical-align: middle;
      }
      .cl-table tr:hover {
        background: var(--slate-50);
      }
      .num-val {
        font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        text-align: right;
        font-size: 13px;
      }
      .cashflow-cat-hdr {
        font-weight: 800;
        font-size: 14.5px;
        color: var(--slate-900);
        background: var(--slate-50) !important;
        border-top: 1.5px solid var(--slate-200);
        border-bottom: 1.5px solid var(--slate-200);
      }
      .cashflow-subcat-hdr {
        font-weight: 700;
        font-size: 13px;
        color: var(--slate-700);
        padding-left: 24px !important;
      }
      .cashflow-line-item {
        padding-left: 40px !important;
        color: var(--slate-600);
      }
      .cashflow-total-row {
        font-weight: 700;
        background: var(--blue-50) !important;
        color: var(--blue-900);
        border-top: 1px solid var(--blue-200);
        border-bottom: 2px solid var(--blue-200);
      }
      .cashflow-grand-row {
        font-weight: 800;
        font-size: 14px;
        background: var(--emerald-50) !important;
        color: var(--emerald-900);
        border-top: 2px solid var(--emerald-200);
        border-bottom: 4px double var(--emerald-600) !important;
      }
      .cl-badge {
        font-size: 11px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 20px;
        border: 1px solid transparent;
      }
      .cl-badge.posted {
        background: #ecfdf5;
        color: #059669;
        border-color: #a7f3d0;
      }
      .cl-badge.reconciled {
        background: #eff6ff;
        color: #2563eb;
        border-color: #bfdbfe;
      }
      .cl-badge.unreconciled {
        background: #fffbeb;
        color: #d97706;
        border-color: #fde68a;
      }
      .cl-list-row:hover {
        background: var(--slate-50) !important;
      }
    `;
    document.head.appendChild(s);
  }

  // ── Global Cashline Variables & State ─────────────────────────────
  let _clActiveTopTab = 'banking'; // 'banking', 'books', 'cashflow'
  let _clActiveBankingTab = 'details'; // 'details', 'statement', 'reconciliation'
  let _clBooksSubtab = 'cashbook'; // 'cashbook', 'reconciliation'

  // Reconciliation sub-state
  let _clReconBankId = '';
  let _clReconStmtDate = '';
  let _clReconStmtBal = '';
  let _clReconFilter = 'unreconciled'; // 'all', 'reconciled', 'unreconciled'
  let _clReconSubSection = 'reconciliation'; // 'reconciliation' or 'confirmation'

  // Statement sub-state
  let _clStatementFromDate = '';
  let _clStatementToDate = '';
  let _clStatementSortOrder = 'oldest'; // For confirmation sub-section
  let _clStatementSortColumn = ''; // 'date', 'description', 'status', 'debit', 'credit', 'balance'
  let _clStatementSortDir = ''; // 'asc', 'desc', '' (normal)
  let _clStatementSearchQuery = '';
  let _clStatementSelectMode = false;
  let _clStatementSelectedIndices = new Set();

  // Separate select & sort states for reconciliation & confirmation sub-sections
  let _clReconSelectMode = false;
  let _clReconSelectedIndices = new Set();
  let _clReconSortColumn = '';
  let _clReconSortDir = '';

  let _clConfirmSelectMode = false;
  let _clConfirmSelectedIndices = new Set();
  let _clConfirmSortColumn = '';
  let _clConfirmSortDir = '';

  // Cashbook sub-state
  let _clCashbookAccountId = '';

  // Cashflow sub-state (kept for internal calculations)
  let _clCashflowDateFrom = '';
  let _clCashflowDateTo = '';

  window.setCashlineNavigationState = function(state) {
    if (!state) return;
    if (state.activeTopTab !== undefined) _clActiveTopTab = state.activeTopTab;
    if (state.activeBankingTab !== undefined) _clActiveBankingTab = state.activeBankingTab;
    if (state.reconBankId !== undefined) _clReconBankId = state.reconBankId;
    if (state.cashbookAccountId !== undefined) _clCashbookAccountId = state.cashbookAccountId;
    if (state.reconSubSection !== undefined) _clReconSubSection = state.reconSubSection;
    if (state.reconFilter !== undefined) _clReconFilter = state.reconFilter;
    if (state.statementSearchQuery !== undefined) _clStatementSearchQuery = state.statementSearchQuery;
    if (state.statementFromDate !== undefined) _clStatementFromDate = state.statementFromDate;
    if (state.statementToDate !== undefined) _clStatementToDate = state.statementToDate;
  };

  window.getCashlineNavigationState = function() {
    return {
      activeTopTab: _clActiveTopTab,
      activeBankingTab: _clActiveBankingTab,
      reconBankId: _clReconBankId,
      cashbookAccountId: _clCashbookAccountId,
      reconSubSection: _clReconSubSection,
      reconFilter: _clReconFilter,
      statementSearchQuery: _clStatementSearchQuery,
      statementFromDate: _clStatementFromDate,
      statementToDate: _clStatementToDate,
    };
  };

  // ── Initialize KYA Store Future Variables ──────────────────────────
  function initClStore() {
    window.KYA_STORE = window.KYA_STORE || {};
    window.KYA_STORE.bankAccounts = window.KYA_STORE.bankAccounts || [];
    window.KYA_STORE.reconciliationState = window.KYA_STORE.reconciliationState || {};
    window.KYA_STORE.uploadedStatements = window.KYA_STORE.uploadedStatements || {};
    window.KYA_STORE.statementMappings = window.KYA_STORE.statementMappings || {};
    window.KYA_STORE.statementLedgerMapping = window.KYA_STORE.statementLedgerMapping || {};
    window.KYA_STORE.statementDeptMapping = window.KYA_STORE.statementDeptMapping || {};
    window.KYA_STORE.statementTypeMapping = window.KYA_STORE.statementTypeMapping || {};
    window.KYA_STORE.statementConfirmed = window.KYA_STORE.statementConfirmed || {};
    window.KYA_STORE.statementNarrationMapping = window.KYA_STORE.statementNarrationMapping || {};
    window.KYA_STORE.statementDocMapping = window.KYA_STORE.statementDocMapping || {};
  }

  // ── Sync Bank Accounts with COA ────────────────────────────────────
  function syncBankAccounts() {
    initClStore();
    const bankGroup = coaLedgers.find(l => l.name === 'Bank Account' && l.type === 'group-ledger');
    const bankLedgers = bankGroup ? coaLedgers.filter(l => l.type === 'ledger' && l.glId === bankGroup.id) : [];

    const existingAccounts = window.KYA_STORE.bankAccounts || [];
    const updatedAccounts = [];

    bankLedgers.forEach(l => {
      let acc = existingAccounts.find(a => a.ledgerId === l.id);
      if (!acc) {
        acc = {
          id: Date.now() + Math.random(),
          ledgerId: l.id,
          name: l.name,
          bankName: 'Bank Account',
          accountNumber: '—',
          ifsc: '—',
          branch: 'Branch',
          openingBalance: parseFloat(l.openingBalance) || 0
        };
        existingAccounts.push(acc);
      } else {
        acc.name = l.name;
        acc.openingBalance = parseFloat(l.openingBalance) || 0;
      }
      updatedAccounts.push(acc);
    });

    window.KYA_STORE.bankAccounts = updatedAccounts;
  }

  // ── Main Shell Hook: Called by app-shell.js ───────────────────────
  window.renderCashlinePanel = function() {
    injectCashlineStyles();
    syncBankAccounts();

    const panel = document.getElementById('panel-cashline');
    if (!panel) return;

    // Prefill dates if not set
    if (!_clCashflowDateFrom) _clCashflowDateFrom = _globalDateFrom || '2024-04-01';
    if (!_clCashflowDateTo) _clCashflowDateTo = _globalDateTo || '2025-03-31';

    // Top-level Navigation block above the card (matching sales style)
    const headerHtml = `
      <div class="panel-header" style="border-bottom: 1.5px solid var(--slate-100); padding-bottom: 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: flex-start; gap: 12px; width: 100%;">
        <div class="panel-actions" style="display: flex; gap: 8px; align-items: center;">
          <button class="${_clActiveTopTab === 'banking' ? 'btn btn-primary' : 'btn-sales-action'}" id="clTopTabBanking" type="button" style="display: flex; align-items: center; gap: 6px; height: 38px; font-weight: 600; font-size: 13px; padding: 8px 14px; border-radius: 8px; cursor: pointer;">
            <svg viewBox="0 0 20 20" fill="none" width="14" height="14" style="stroke: currentColor; stroke-width: 1.8; fill: none; display: block;">
              <rect x="2" y="5" width="16" height="10" rx="2" stroke="currentColor"/>
              <line x1="2" y1="9" x2="18" y2="9" stroke="currentColor"/>
              <circle cx="14" cy="12" r="0.5" fill="currentColor"/>
            </svg>
            Banking
          </button>
          <button class="${_clActiveTopTab === 'books' ? 'btn btn-primary' : 'btn-sales-action'}" id="clTopTabBooks" type="button" style="display: flex; align-items: center; gap: 6px; height: 38px; font-weight: 600; font-size: 13px; padding: 8px 14px; border-radius: 8px; cursor: pointer;">
            <svg viewBox="0 0 20 20" fill="none" width="14" height="14" style="stroke: currentColor; stroke-width: 1.8; fill: none; display: block;">
              <path d="M4 4h12M4 9h12M4 14h12" stroke="currentColor"/>
            </svg>
            Books
          </button>
          <button class="${_clActiveTopTab === 'cashflow' ? 'btn btn-primary' : 'btn-sales-action'}" id="clTopTabCashflow" type="button" style="display: flex; align-items: center; gap: 6px; height: 38px; font-weight: 600; font-size: 13px; padding: 8px 14px; border-radius: 8px; cursor: pointer;">
            <svg viewBox="0 0 20 20" fill="none" width="14" height="14" style="stroke: currentColor; stroke-width: 1.8; fill: none; display: block;">
              <path d="M12 5l5 5-5 5M17 10H3" stroke="currentColor"/>
            </svg>
            Cashflow
          </button>
        </div>
      </div>
    `;

    // Dynamic Title & Subtitle for title card
    let title = '', subtitle = '', iconSvg = '';
    if (_clActiveTopTab === 'banking') {
      title = 'Banking';
      subtitle = 'Manage bank accounts, link ledgers, and check current bank balances';
      iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"/><line x1="2" y1="10" x2="22" y2="10"/><circle cx="7" cy="15" r="1.5" fill="currentColor"/><circle cx="12" cy="15" r="1"/></svg>`;
    } else if (_clActiveTopTab === 'books') {
      title = 'Books';
      subtitle = 'Record cashbook receipts/payments and view cash & bank transactions';
      iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`;
    } else if (_clActiveTopTab === 'cashflow') {
      title = 'Cashflow';
      subtitle = 'Indirect cash flow statement of operating, investing, and financing cash movements';
      iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
    }

    panel.innerHTML = `
      ${headerHtml}

      <div class="table-card" style="padding: 24px 28px;">
        <!-- Title card -->
        <div class="je-card-header" style="background: linear-gradient(90deg, var(--blue-700), var(--blue-500)); border-top-left-radius: 12px; border-top-right-radius: 12px; margin: -24px -28px 20px -28px; padding: 18px 28px; display: flex; align-items: center; justify-content: space-between;">
          <div class="je-card-header-left" style="display: flex; align-items: center; gap: 12px;">
            <div class="je-card-icon-wrap" style="background: rgba(255, 255, 255, 0.15); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 8px; color: #fff;">
              ${iconSvg}
            </div>
            <div>
              <div class="je-card-title-text" style="color: var(--white); font-weight: 700; font-size: 16px; margin: 0;">${title}</div>
              <div class="je-card-subtitle-text" style="color: rgba(255, 255, 255, 0.8); font-size: 12px; margin: 2px 0 0 0;">${subtitle}</div>
            </div>
          </div>
          <div id="clTitleCardActions" style="display: flex; gap: 8px; align-items: center;"></div>
        </div>

        <div id="clMainContentArea" style="min-height: 400px;">
          <!-- Active view gets rendered here -->
        </div>
      </div>
    `;

    // Hook up top-level click events
    panel.querySelector('#clTopTabBanking').addEventListener('click', () => {
      _clStatementSelectMode = false;
      _clStatementSelectedIndices.clear();
      _clActiveTopTab = 'banking';
      renderCashlinePanel();
    });
    panel.querySelector('#clTopTabBooks').addEventListener('click', () => {
      _clStatementSelectMode = false;
      _clStatementSelectedIndices.clear();
      _clActiveTopTab = 'books';
      renderCashlinePanel();
    });
    panel.querySelector('#clTopTabCashflow').addEventListener('click', () => {
      _clStatementSelectMode = false;
      _clStatementSelectedIndices.clear();
      _clActiveTopTab = 'cashflow';
      renderCashlinePanel();
    });

    renderActiveTabContent();
  };

  // ── Render Active Tab Content ──────────────────────────────────────
  function renderActiveTabContent() {
    const mainArea = document.getElementById('clMainContentArea');
    const actionsArea = document.getElementById('clTitleCardActions');
    if (!mainArea) return;

    if (_clActiveTopTab === 'banking') {
      renderBankingTab(mainArea, actionsArea);
    } else if (_clActiveTopTab === 'books') {
      renderBooksTab(mainArea, actionsArea);
    } else if (_clActiveTopTab === 'cashflow') {
      renderCashflowView(mainArea);
    }
  }

  // ── Banking Tab: KeepOne-style sidebar with Details/Statement/Reconciliation ──
  function renderBankingTab(mainArea, actionsArea) {
    window.clSwitchBankingTabGlobal = (tab) => {
      switchBankingTab(tab, actionsArea);
    };

    let layoutContainer = document.getElementById('clBankingLayoutContainer');
    if (!layoutContainer || !mainArea.contains(layoutContainer)) {
      mainArea.innerHTML = `
        <div class="oh-layout" id="clBankingLayoutContainer">
          <!-- Sidebar -->
          <div class="oh-sub-tabs" id="clBankingSidebar" role="tablist" aria-label="Banking sections">
          </div>

          <!-- Content -->
          <div class="oh-content-area" id="clBankingContentArea"></div>
        </div>
      `;
    }

    switchBankingTab(_clActiveBankingTab, actionsArea);
  }

  function switchBankingTab(tab, actionsArea) {
    if (_clActiveBankingTab !== tab) {
      _clStatementSelectMode = false;
      _clStatementSelectedIndices.clear();
      _clReconSelectMode = false;
      _clReconSelectedIndices.clear();
      _clConfirmSelectMode = false;
      _clConfirmSelectedIndices.clear();
      _clStatementSortColumn = '';
      _clStatementSortDir = '';
      _clReconSortColumn = '';
      _clReconSortDir = '';
      _clConfirmSortColumn = '';
      _clConfirmSortDir = '';
      _clStatementSortOrder = 'oldest';
    }
    _clActiveBankingTab = tab;

    const container = document.getElementById('clBankingLayoutContainer');
    const sidebar = document.getElementById('clBankingSidebar');
    if (container && sidebar) {
      if (tab === 'statement' || tab === 'reconciliation') {
        container.classList.add('full-width');
        sidebar.style.display = 'none';
      } else {
        container.classList.remove('full-width');
        sidebar.style.display = 'flex';

        sidebar.innerHTML = `
          <button class="oh-sub-tab" id="clBankTabDetails" role="tab" aria-selected="false">
            <div class="oh-tab-icon-wrap">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="5" width="16" height="10" rx="2" stroke="currentColor" stroke-width="1.8"/>
                <line x1="2" y1="9" x2="18" y2="9" stroke="currentColor" stroke-width="1.6"/>
                <circle cx="6" cy="13" r="1" fill="currentColor"/>
                <rect x="9" y="12" width="5" height="1.5" rx="0.5" fill="currentColor"/>
              </svg>
            </div>
            <span class="oh-tab-text">Details</span>
          </button>

          <button class="oh-sub-tab" id="clBankTabStatement" role="tab" aria-selected="false">
            <div class="oh-tab-icon-wrap">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M3 5.5A2.5 2.5 0 015.5 3h9A2.5 2.5 0 0117 5.5v9a2.5 2.5 0 01-2.5 2.5h-9A2.5 2.5 0 013 14.5v-9z" stroke="currentColor" stroke-width="1.8"/>
                <path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </div>
            <span class="oh-tab-text">Statement</span>
          </button>

          <button class="oh-sub-tab" id="clBankTabReconciliation" role="tab" aria-selected="false">
            <div class="oh-tab-icon-wrap">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M16.5 6.5l-8 8-4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <span class="oh-tab-text">Reconciliation</span>
          </button>
        `;

        const allTabs = [
          ['clBankTabDetails',        'details'],
          ['clBankTabStatement',      'statement'],
          ['clBankTabReconciliation', 'reconciliation'],
        ];
        allTabs.forEach(([btnId, t]) => {
          const btn = document.getElementById(btnId);
          if (!btn) return;
          btn.classList.toggle('active', t === tab);
          btn.setAttribute('aria-selected', t === tab);
          btn.addEventListener('click', () => {
            switchBankingTab(t, actionsArea);
          });
        });
      }
    }

    const bankArea = document.getElementById('clBankingContentArea');
    if (!bankArea) return;

    if (tab === 'details') {
      if (actionsArea) actionsArea.innerHTML = '';
      renderAccountsView(bankArea, null, actionsArea);
    } else if (tab === 'statement') {
      renderCashbookView(bankArea, null, actionsArea);
    } else if (tab === 'reconciliation') {
      renderReconciliationView(bankArea, null, actionsArea);
    }
  }

  function renderBooksTab(mainArea, actionsArea) {
    mainArea.innerHTML = `
      <div id="clBooksSubContentArea" style="width: 100%;"></div>
    `;

    const subContent = document.getElementById('clBooksSubContentArea');
    renderCashbookView(subContent, null, actionsArea);
  }

  function renderActiveSubtab() {
    renderActiveTabContent();
  }
  window.renderActiveSubtab = renderActiveSubtab;

  // ── Helper: Format balances ───────────────────────────────────────
  function fmtAmt(v) {
    const val = parseFloat(v) || 0;
    return '₹\u2009' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Helper: Retrieve main group of ledger
  function getLedgerGroup(ledgerId) {
    const l = coaLedgers.find(x => x.id === ledgerId);
    if (!l) return '';
    const sg = COA_SYS_SGS.find(s => s.id === l.sgId);
    return sg ? sg.name : '';
  }

  // ── Helper: Next Journal Voucher Number Generator ───────────────
  function getNextJournalVoucherNo(dateStr, autoIncrement = true) {
    let targetYear = new Date().getFullYear();
    if (dateStr) {
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        targetYear = parsedDate.getFullYear();
      }
    }

    const allEntries = [
      ...(typeof postedEntries !== 'undefined' && Array.isArray(postedEntries) ? postedEntries : []),
      ...(typeof draftedEntries !== 'undefined' && Array.isArray(draftedEntries) ? draftedEntries : []),
      ...((typeof window !== 'undefined' && window.KYA_STORE && Array.isArray(window.KYA_STORE.salesVouchers)) ? window.KYA_STORE.salesVouchers : [])
    ];

    const existingVoucherSet = new Set();
    let maxSeq = 0;

    allEntries.forEach(e => {
      const vNo = (e && (e.voucherNo || e.invoiceNo)) ? String(e.voucherNo || e.invoiceNo).trim() : '';
      if (!vNo) return;
      existingVoucherSet.add(vNo.toUpperCase());

      const m = vNo.match(/JV-(?:(\d{4})-)?(\d+)/i);
      if (m) {
        const yr = m[1] ? parseInt(m[1], 10) : targetYear;
        const num = parseInt(m[2], 10);
        if (!isNaN(num) && yr === targetYear) {
          if (num > maxSeq) maxSeq = num;
        }
      }
    });

    let currentCounter = (typeof jvCounter !== 'undefined' && typeof jvCounter === 'number') ? jvCounter : 1;
    if (typeof window !== 'undefined' && typeof window.jvCounter === 'number' && window.jvCounter > currentCounter) {
      currentCounter = window.jvCounter;
    }

    let candidateNum = Math.max(currentCounter, maxSeq + 1);
    let candidateVoucher = `JV-${targetYear}-${String(candidateNum).padStart(3, '0')}`;

    while (existingVoucherSet.has(candidateVoucher.toUpperCase())) {
      candidateNum++;
      candidateVoucher = `JV-${targetYear}-${String(candidateNum).padStart(3, '0')}`;
    }

    if (autoIncrement) {
      const nextCounter = candidateNum + 1;
      if (typeof jvCounter !== 'undefined') jvCounter = nextCounter;
      if (typeof window !== 'undefined') window.jvCounter = nextCounter;
      if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
    }

    return candidateVoucher;
  }
  window.getNextJournalVoucherNo = getNextJournalVoucherNo;


  // ===================================================================
  //  1. BANK ACCOUNT MANAGEMENT VIEW
  // ===================================================================
