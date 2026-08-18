// ── CASHLINE MODULE: BANKING, CASHBOOK & CASHFLOW ──────────────────

(function() {
  // Styles Injected dynamically for maximum design layout flexibility
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
  let _clStatementSortOrder = 'oldest'; // 'oldest' (old to new) or 'newest' (new to old)
  let _clStatementSearchQuery = '';
  let _clStatementSelectMode = false;
  let _clStatementSelectedIndices = new Set();

  // Cashbook sub-state
  let _clCashbookAccountId = '';

  // Cashflow sub-state (kept for internal calculations)
  let _clCashflowDateFrom = '';
  let _clCashflowDateTo = '';

  // ── Initialize KYA Store Future Variables ──────────────────────────
  function initClStore() {
    window.KYA_STORE = window.KYA_STORE || {};
    window.KYA_STORE.bankAccounts = window.KYA_STORE.bankAccounts || [];
    window.KYA_STORE.reconciliationState = window.KYA_STORE.reconciliationState || {};
    window.KYA_STORE.uploadedStatements = window.KYA_STORE.uploadedStatements || {};
    window.KYA_STORE.statementMappings = window.KYA_STORE.statementMappings || {};
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
      subtitle = 'Record cashbook receipts/payments and clear outstanding bank transactions';
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
      _clActiveTopTab = 'banking';
      renderCashlinePanel();
    });
    panel.querySelector('#clTopTabBooks').addEventListener('click', () => {
      _clActiveTopTab = 'books';
      renderCashlinePanel();
    });
    panel.querySelector('#clTopTabCashflow').addEventListener('click', () => {
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
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1.5px solid var(--slate-100); padding-bottom: 14px; flex-wrap: wrap; gap: 12px; width: 100%;">
        <div style="display: flex; gap: 8px;">
          <button class="btn ${_clBooksSubtab === 'cashbook' ? 'btn-primary' : 'btn-secondary'}" id="clBooksSubTabCashbook" style="height: 34px; font-size: 12.5px; border-radius: 6px; padding: 0 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
            <svg viewBox="0 0 20 20" fill="none" width="13" height="13" style="stroke: currentColor; stroke-width: 1.8;">
              <path d="M3 5.5A2.5 2.5 0 015.5 3h9A2.5 2.5 0 0117 5.5v9a2.5 2.5 0 01-2.5 2.5h-9A2.5 2.5 0 013 14.5v-9z"/>
              <path d="M7 6h6M7 10h6M7 14h4"/>
            </svg>
            Cashbook
          </button>
          <button class="btn ${_clBooksSubtab === 'reconciliation' ? 'btn-primary' : 'btn-secondary'}" id="clBooksSubTabRecon" style="height: 34px; font-size: 12.5px; border-radius: 6px; padding: 0 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
            <svg viewBox="0 0 20 20" fill="none" width="13" height="13" style="stroke: currentColor; stroke-width: 1.8;">
              <path d="M16.5 6.5l-8 8-4-4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Reconciliation
          </button>
        </div>
        <div id="clBooksControlsArea" style="display: flex; gap: 8px; align-items: center;"></div>
      </div>
      <div id="clBooksSubContentArea" style="width: 100%;"></div>
    `;

    mainArea.querySelector('#clBooksSubTabCashbook').addEventListener('click', () => {
      _clBooksSubtab = 'cashbook';
      renderBooksTab(mainArea, actionsArea);
    });
    mainArea.querySelector('#clBooksSubTabRecon').addEventListener('click', () => {
      _clBooksSubtab = 'reconciliation';
      renderBooksTab(mainArea, actionsArea);
    });

    const subContent = document.getElementById('clBooksSubContentArea');
    const controls = document.getElementById('clBooksControlsArea');

    if (_clBooksSubtab === 'cashbook') {
      renderCashbookView(subContent, controls, null);
    } else if (_clBooksSubtab === 'reconciliation') {
      renderReconciliationView(subContent, controls, actionsArea);
    }
  }

  function renderActiveSubtab() {
    renderActiveTabContent();
  }

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


  // ===================================================================
  //  1. BANK ACCOUNT MANAGEMENT VIEW
  // ===================================================================
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
      <div class="cl-stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 24px;">
        <div class="cl-stat-card" style="background: var(--white); border: 1.5px solid var(--slate-150); border-radius: 14px; padding: 18px 20px; display: flex; flex-direction: column; gap: 6px; box-shadow: var(--shadow-sm);">
          <span style="font-size: 11px; font-weight: 700; color: var(--slate-400); text-transform: uppercase; letter-spacing: 0.05em;">No. of Accounts</span>
          <span style="font-size: 24px; font-weight: 800; color: var(--slate-800);">${accounts.length}</span>
        </div>
        <div class="cl-stat-card" style="background: var(--white); border: 1.5px solid var(--slate-150); border-radius: 14px; padding: 18px 20px; display: flex; flex-direction: column; gap: 6px; box-shadow: var(--shadow-sm);">
          <span style="font-size: 11px; font-weight: 700; color: var(--slate-400); text-transform: uppercase; letter-spacing: 0.05em;">Bank Balance</span>
          <span style="font-size: 24px; font-weight: 800; color: var(--slate-800);">${fmtAmt(totalBookBal)}</span>
        </div>
        <div class="cl-stat-card" style="background: var(--white); border: 1.5px solid var(--slate-150); border-radius: 14px; padding: 18px 20px; display: flex; flex-direction: column; gap: 6px; box-shadow: var(--shadow-sm);">
          <span style="font-size: 11px; font-weight: 700; color: var(--slate-400); text-transform: uppercase; letter-spacing: 0.05em;">Book Balance</span>
          <span style="font-size: 24px; font-weight: 800; color: var(--emerald-600);">${fmtAmt(totalReconciledBal)}</span>
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
  function loadXLSXLibrary(callback) {
    if (window.XLSX) {
      callback();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.onload = () => callback();
    script.onerror = () => {
      showToast('Failed to load Excel parsing library. Please check your internet connection.', 'error');
    };
    document.head.appendChild(script);
  }

  // ── CSV Parser with Quote-Handling ──────────────────────────────────
  function parseCSV(text) {
    const lines = text.split(/\r\n|\n/);
    return lines.map(line => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    }).filter(row => row.length > 0 && row.some(cell => cell !== ''));
  }

  // ── Excel Parser ───────────────────────────────────────────────────
  function parseExcel(arrayBuffer, callback) {
    try {
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      callback(rows);
    } catch (err) {
      console.error(err);
      showToast('Error parsing Excel file.', 'error');
    }
  }

  // ── Date Normalization ─────────────────────────────────────────────
  function parseStatementDate(dateStr) {
    if (!dateStr && dateStr !== 0) return '';
    const clean = String(dateStr).trim();
    if (!clean) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
    
    // DD-MM-YYYY or DD/MM/YYYY
    let m = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (m) {
      const d = m[1].padStart(2, '0');
      const month = m[2].padStart(2, '0');
      const y = m[3];
      return `${y}-${month}-${d}`;
    }

    // DD-MM-YY or DD/MM/YY
    m = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/);
    if (m) {
      const d = m[1].padStart(2, '0');
      const month = m[2].padStart(2, '0');
      const y = '20' + m[3];
      return `${y}-${month}-${d}`;
    }

    // Excel numeric serial date
    if (!isNaN(clean) && Number(clean) > 20000 && Number(clean) < 80000) {
      try {
        const utc_days = Math.floor(Number(clean) - 25569);
        const utc_value = utc_days * 86400;
        const date_info = new Date(utc_value * 1000);
        return date_info.toISOString().split('T')[0];
      } catch(e) {}
    }

    try {
      const parsed = new Date(clean);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    } catch(e) {}
    
    return '';
  }

  // ── Upload Statement Wizard Flow ──────────────────────────────────
  function showUploadStatementWizard() {
    initClStore();
    const accounts = window.KYA_STORE.bankAccounts || [];
    if (accounts.length === 0) {
      showToast('No bank accounts available to import statements for.', 'warning');
      return;
    }

    // Render Step 1
    document.getElementById('clUploadWizardOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'clUploadWizardOverlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 10005;
      background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
      font-family: var(--font-main), Inter, sans-serif;
    `;

    overlay.innerHTML = `
      <div class="cl-wizard-container">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div class="cl-wizard-header-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              Statement Import
            </div>
            <h3 style="margin: 0 0 4px 0; font-size: 18px; font-weight: 800; color: var(--slate-900);">Upload Bank Statement</h3>
            <p style="margin: 0; font-size: 12.5px; color: var(--slate-400);">Choose target bank account and select your statement file.</p>
          </div>
          <button id="clWzCloseBtn" style="background: transparent; border: none; font-size: 18px; font-weight: 700; color: #94a3b8; cursor: pointer; padding: 4px; line-height: 1;" type="button">✕</button>
        </div>

        <!-- Step Progress Indicator -->
        <div class="cl-wizard-progress">
          <div class="cl-wizard-step-item active">
            <span class="cl-wizard-step-num">1</span>
            <span>Select File</span>
          </div>
          <div class="cl-wizard-step-divider"></div>
          <div class="cl-wizard-step-item">
            <span class="cl-wizard-step-num">2</span>
            <span>Map Columns</span>
          </div>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 18px;">
          <div class="cl-form-group">
            <label style="font-weight: 700; font-size: 12px; color: #475569; margin-bottom: 6px; display: block;">Target Bank Account *</label>
            <select id="clWzBankSelect" class="je-input" style="height: 40px; cursor: pointer; background: #fff; border-radius: 10px; border: 1.5px solid #cbd5e1; font-weight: 600; width: 100%; font-size: 13.5px; padding: 0 12px;">
              ${accounts.map(a => `<option value="${a.id}">${ohEsc(a.name)}</option>`).join('')}
            </select>
          </div>

          <div class="cl-form-group">
            <label style="font-weight: 700; font-size: 12px; color: #475569; margin-bottom: 6px; display: block;">Bank Statement File *</label>
            
            <!-- Hidden actual file input -->
            <input type="file" id="clWzFileInput" accept=".csv, .xls, .xlsx" style="display: none;" />

            <!-- Custom Modern Dropzone -->
            <div id="clWzDropzone" class="cl-dropzone">
              <div class="cl-dropzone-icon-bg">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <div class="cl-dropzone-title">Click to upload or drag & drop</div>
              <div class="cl-dropzone-subtitle">CSV, XLS, or XLSX bank statements (max 10MB)</div>
              <div class="cl-dropzone-tags">
                <span class="cl-dropzone-tag">.CSV</span>
                <span class="cl-dropzone-tag">.XLS</span>
                <span class="cl-dropzone-tag">.XLSX</span>
              </div>
            </div>

            <!-- File Selected Preview Card (Hidden initially) -->
            <div id="clWzSelectedCard" class="cl-file-card" style="display: none;">
              <div id="clWzFileIcon" class="cl-file-icon excel">XLS</div>
              <div class="cl-file-info">
                <div id="clWzFileName" class="cl-file-name">statement.xlsx</div>
                <div class="cl-file-meta">
                  <span id="clWzFileSize">0 KB</span>
                  <span>•</span>
                  <span class="cl-file-badge success">✓ File Ready</span>
                </div>
              </div>
              <button id="clWzChangeFileBtn" class="cl-file-remove-btn" type="button">Change</button>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 26px; justify-content: flex-end; border-top: 1px solid #f1f5f9; padding-top: 18px;">
          <button class="btn btn-secondary" id="clWzCancel1" style="padding: 10px 20px; border-radius: 10px; font-weight: 600;">Cancel</button>
          <button class="btn btn-primary" id="clWzNext1" style="padding: 10px 22px; border-radius: 10px; font-weight: 700; background: linear-gradient(135deg, #2563eb, #1d4ed8); box-shadow: 0 4px 12px rgba(37,99,235,0.25);">Next Step ➔</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('#clWzCancel1').addEventListener('click', close);
    overlay.querySelector('#clWzCloseBtn')?.addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    // Wire up interactive Dropzone & File preview
    const dropzone = overlay.querySelector('#clWzDropzone');
    const fileInput = overlay.querySelector('#clWzFileInput');
    const selectedCard = overlay.querySelector('#clWzSelectedCard');
    const fileNameEl = overlay.querySelector('#clWzFileName');
    const fileSizeEl = overlay.querySelector('#clWzFileSize');
    const fileIconEl = overlay.querySelector('#clWzFileIcon');
    const changeFileBtn = overlay.querySelector('#clWzChangeFileBtn');

    function formatBytes(bytes) {
      if (!bytes || bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function updateSelectedFileUI(file) {
      if (!file) {
        dropzone.style.display = 'flex';
        selectedCard.style.display = 'none';
        return;
      }
      const name = file.name;
      const ext = name.split('.').pop().toLowerCase();
      
      fileIconEl.textContent = ext.toUpperCase();
      if (ext === 'csv') {
        fileIconEl.className = 'cl-file-icon csv';
      } else {
        fileIconEl.className = 'cl-file-icon excel';
      }
      
      fileNameEl.textContent = name;
      fileSizeEl.textContent = formatBytes(file.size);
      
      dropzone.style.display = 'none';
      selectedCard.style.display = 'flex';
    }

    dropzone.addEventListener('click', () => fileInput.click());
    changeFileBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        updateSelectedFileUI(fileInput.files[0]);
      }
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      }, false);
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt?.files;
      if (files && files.length > 0) {
        try {
          fileInput.files = files;
        } catch (err) {}
        updateSelectedFileUI(files[0]);
      }
    });

    overlay.querySelector('#clWzNext1').addEventListener('click', () => {
      const bankId = Number(overlay.querySelector('#clWzBankSelect').value);
      const fileInput = overlay.querySelector('#clWzFileInput');
      if (!fileInput.files || fileInput.files.length === 0) {
        showToast('Please select a bank statement file to upload.', 'warning');
        return;
      }

      const file = fileInput.files[0];
      const fileName = file.name.toLowerCase();
      const isExcel = fileName.endsWith('.xls') || fileName.endsWith('.xlsx');
      const isCSV = fileName.endsWith('.csv');

      if (!isCSV && !isExcel) {
        showToast('Unsupported file type. Please upload a CSV or Excel file.', 'warning');
        return;
      }

      showToast('Reading file...', 'info');

      const reader = new FileReader();
      if (isCSV) {
        reader.onload = function(e) {
          const text = e.target.result;
          const rows = parseCSV(text);
          if (rows.length === 0) {
            showToast('The CSV file is empty or could not be parsed.', 'warning');
            return;
          }
          renderMappingStep(rows, bankId);
        };
        reader.readAsText(file);
      } else {
        // Load SheetJS, then read excel array buffer
        loadXLSXLibrary(() => {
          reader.onload = function(e) {
            const buffer = e.target.result;
            parseExcel(buffer, (rows) => {
              if (rows.length === 0) {
                showToast('The Excel file is empty or could not be parsed.', 'warning');
                return;
              }
              renderMappingStep(rows, bankId);
            });
          };
          reader.readAsArrayBuffer(file);
        });
      }
    });

    function renderMappingStep(parsedRows, bankId) {
      const savedConfig = window.KYA_STORE.statementMappings[bankId] || {};
      const savedHeaderRow = typeof savedConfig.headerRowIndex !== 'undefined' ? savedConfig.headerRowIndex : 0;

      overlay.innerHTML = `
        <div class="cl-wizard-container cl-wizard-container-lg">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div class="cl-wizard-header-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Statement Import
              </div>
              <h3 style="margin: 0 0 4px 0; font-size: 18px; font-weight: 800; color: var(--slate-900);">Configure Column Mapping</h3>
              <p style="margin: 0; font-size: 12.5px; color: var(--slate-400);">Choose heading row and map statement columns. Date, Withdrawal, and Deposit columns are mandatory.</p>
            </div>
            <button id="clWzCloseBtn2" style="background: transparent; border: none; font-size: 18px; font-weight: 700; color: #94a3b8; cursor: pointer; padding: 4px; line-height: 1;" type="button">✕</button>
          </div>

          <!-- Step Progress Indicator -->
          <div class="cl-wizard-progress">
            <div class="cl-wizard-step-item completed">
              <span class="cl-wizard-step-num">✓</span>
              <span>Select File</span>
            </div>
            <div class="cl-wizard-step-divider active"></div>
            <div class="cl-wizard-step-item active">
              <span class="cl-wizard-step-num">2</span>
              <span>Map Columns</span>
            </div>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div class="cl-form-group">
              <label style="font-weight: 700; font-size: 12px; color: #475569; margin-bottom: 6px; display: block;">Which row contains headings? * (Enter row number, e.g. 1, 2, 3...)</label>
              <input type="number" min="1" id="clWzHeaderRowInput" class="je-input" value="${Number(savedHeaderRow) + 1}" style="height: 38px; border-radius: 8px;" />
            </div>

            <!-- Mapping fields grid -->
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; border-top: 1px solid var(--slate-100); padding-top: 16px;">
              <div class="cl-form-group">
                <label style="font-weight: 700; font-size: 12px; color: #475569; margin-bottom: 4px; display: block;">Date Column *</label>
                <select id="clWzMapDate" class="je-input" style="height: 38px; background:#fff; cursor:pointer; border-radius:8px; width:100%;"></select>
              </div>
              <div class="cl-form-group">
                <label style="font-weight: 700; font-size: 12px; color: #475569; margin-bottom: 4px; display: block;">Description Column</label>
                <select id="clWzMapDescription" class="je-input" style="height: 38px; background:#fff; cursor:pointer; border-radius:8px; width:100%;"></select>
              </div>
              <div class="cl-form-group">
                <label style="font-weight: 700; font-size: 12px; color: #475569; margin-bottom: 4px; display: block;">Withdrawal Column *</label>
                <select id="clWzMapWithdrawal" class="je-input" style="height: 38px; background:#fff; cursor:pointer; border-radius:8px; width:100%;"></select>
              </div>
              <div class="cl-form-group">
                <label style="font-weight: 700; font-size: 12px; color: #475569; margin-bottom: 4px; display: block;">Deposit Column *</label>
                <select id="clWzMapDeposit" class="je-input" style="height: 38px; background:#fff; cursor:pointer; border-radius:8px; width:100%;"></select>
              </div>
              <div class="cl-form-group" style="grid-column: 1 / -1;">
                <label style="font-weight: 700; font-size: 12px; color: #475569; margin-bottom: 4px; display: block;">Balance Column</label>
                <select id="clWzMapBalance" class="je-input" style="height: 38px; background:#fff; cursor:pointer; border-radius:8px; width:100%;"></select>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 10px; margin-top: 26px; justify-content: flex-end; border-top: 1px solid var(--slate-100); padding-top: 18px;">
            <button class="btn btn-secondary" id="clWzBack2" style="padding: 10px 20px; border-radius: 10px; font-weight: 600;">➔ Back</button>
            <button class="btn btn-primary" id="clWzImport2" style="padding: 10px 22px; border-radius: 10px; font-weight: 700; background: linear-gradient(135deg, #2563eb, #1d4ed8); box-shadow: 0 4px 12px rgba(37,99,235,0.25);">Import Statement</button>
          </div>
        </div>
      `;

      overlay.querySelector('#clWzCloseBtn2')?.addEventListener('click', close);


      // Cancel button goes back to first step
      overlay.querySelector('#clWzBack2').addEventListener('click', () => {
        showUploadStatementWizard();
      });

      const headerInput = overlay.querySelector('#clWzHeaderRowInput');
      
      const updateMappingDropdowns = () => {
        const rowNum = parseInt(headerInput.value) || 1;
        const hIdx = Math.max(0, rowNum - 1);
        const headers = parsedRows[hIdx] || [];
        const optionsHtml = headers.map((h, cIdx) => {
          const label = h ? String(h).trim() : `Column ${cIdx + 1}`;
          return `<option value="${cIdx}">${ohEsc(label)}</option>`;
        }).join('');

        const fields = ['Date', 'Description', 'Withdrawal', 'Deposit', 'Balance'];
        fields.forEach(f => {
          const select = overlay.querySelector('#clWzMap' + f);
          if (!select) return;
          select.innerHTML = '<option value="">-- Choose Column --</option>' + optionsHtml;

          // Attempt saved mapping match
          let savedColName = savedConfig[f.toLowerCase() + 'Col'];
          if (!savedColName && f === 'Withdrawal') savedColName = savedConfig.debitCol;
          if (!savedColName && f === 'Deposit') savedColName = savedConfig.creditCol;

          if (savedColName && headers.includes(savedColName)) {
            select.value = headers.indexOf(savedColName);
          } else {
            // Heuristic matching
            const lowerH = headers.map(h => String(h || '').toLowerCase().trim());
            const fL = f.toLowerCase();
            if (fL === 'date') {
              const idx = lowerH.findIndex(h => h.includes('date') || h.includes('dt'));
              if (idx > -1) select.value = idx;
            } else if (fL === 'description') {
              const idx = lowerH.findIndex(h => h.includes('desc') || h.includes('particular') || h.includes('narr') || h.includes('remark') || h.includes('info'));
              if (idx > -1) select.value = idx;
            } else if (fL === 'withdrawal') {
              const idx = lowerH.findIndex(h => h.includes('withdrawal') || h.includes('withdraw') || h.includes('dr') || h.includes('debit') || h.includes('payment') || h.includes('paid') || h.includes('out'));
              if (idx > -1) select.value = idx;
            } else if (fL === 'deposit') {
              const idx = lowerH.findIndex(h => h.includes('deposit') || h.includes('cr') || h.includes('credit') || h.includes('receipt') || h.includes('received') || h.includes('in'));
              if (idx > -1) select.value = idx;
            } else if (fL === 'balance') {
              const idx = lowerH.findIndex(h => h.includes('bal'));
              if (idx > -1) select.value = idx;
            }
          }
        });
      };

      headerInput.addEventListener('input', updateMappingDropdowns);
      updateMappingDropdowns();

      // Trigger Import
      overlay.querySelector('#clWzImport2').addEventListener('click', () => {
        const rowNum = parseInt(headerInput.value) || 1;
        const hIdx = Math.max(0, rowNum - 1);
        const dateVal = overlay.querySelector('#clWzMapDate').value;
        const descVal = overlay.querySelector('#clWzMapDescription').value;
        const withdrawalVal = overlay.querySelector('#clWzMapWithdrawal').value;
        const depositVal = overlay.querySelector('#clWzMapDeposit').value;
        const balVal = overlay.querySelector('#clWzMapBalance').value;

        if (dateVal === '' || descVal === '' || withdrawalVal === '' || depositVal === '') {
          showToast('Date, Description, Withdrawal, and Deposit column mappings are mandatory.', 'warning');
          return;
        }

        const headers = parsedRows[hIdx] || [];
        const dateColName = headers[Number(dateVal)] || '';
        const descColName = descVal !== '' ? headers[Number(descVal)] : '';
        const withdrawalColName = headers[Number(withdrawalVal)] || '';
        const depositColName = headers[Number(depositVal)] || '';
        const balanceColName = balVal !== '' ? headers[Number(balVal)] : '';

        // Save mapping config
        window.KYA_STORE.statementMappings = window.KYA_STORE.statementMappings || {};
        window.KYA_STORE.statementMappings[bankId] = {
          headerRowIndex: hIdx,
          dateCol: dateColName,
          descCol: descColName,
          withdrawalCol: withdrawalColName,
          depositCol: depositColName,
          debitCol: withdrawalColName,
          creditCol: depositColName,
          balanceCol: balanceColName
        };

        const statementRows = [];
        const dCol = Number(dateVal);
        const descCol = descVal !== '' ? Number(descVal) : -1;
        const wCol = Number(withdrawalVal);
        const depCol = Number(depositVal);
        const bCol = balVal !== '' ? Number(balVal) : -1;

        for (let i = hIdx + 1; i < parsedRows.length; i++) {
          const row = parsedRows[i];
          if (!row || row.length === 0) continue;

          const rawDate = dCol !== -1 ? row[dCol] : '';
          if (!rawDate) continue;

          const date = parseStatementDate(String(rawDate));
          if (!date) continue; // Skip invalid rows or rows without a valid date

          const description = descCol !== -1 ? String(row[descCol] || '').trim() : '';
          if (!description) continue; // Skip rows without description

          const debit = parseFloat(row[wCol]) || 0;
          const credit = parseFloat(row[depCol]) || 0;
          const balance = bCol !== -1 ? parseFloat(row[bCol]) || 0 : 0;

          // Skip if all values are zero
          if (debit === 0 && credit === 0 && balance === 0) continue;

          statementRows.push({
            date,
            description,
            debit: debit.toFixed(2),
            credit: credit.toFixed(2),
            balance: balance.toFixed(2)
          });
        }

        if (statementRows.length > 1) {
          const firstDate = statementRows[0].date;
          const lastDate = statementRows[statementRows.length - 1].date;
          if (firstDate && lastDate && firstDate > lastDate) {
            // Descending order (newest date to previous date):
            // Reverse so the last entry becomes the first entry and preserves statement pattern
            statementRows.reverse();
          }
        }

        window.KYA_STORE.uploadedStatements = window.KYA_STORE.uploadedStatements || {};
        const existingRows = window.KYA_STORE.uploadedStatements[bankId] || [];

        const makeMatchKey = (r) => {
          const dateStr = String(r.date || '').trim();
          const descStr = String(r.description || '').trim().toLowerCase();
          const dr = (parseFloat(r.debit) || 0).toFixed(2);
          const cr = (parseFloat(r.credit) || 0).toFixed(2);
          return `${dateStr}|${descStr}|${dr}|${cr}`;
        };

        const existingKeySet = new Set(existingRows.map(r => makeMatchKey(r)));
        const newValidRows = [];
        let duplicateCount = 0;

        statementRows.forEach(row => {
          const key = makeMatchKey(row);
          if (existingKeySet.has(key)) {
            duplicateCount++;
          } else {
            existingKeySet.add(key);
            newValidRows.push(row);
          }
        });

        const updatedStatements = [...existingRows, ...newValidRows];
        window.KYA_STORE.uploadedStatements[bankId] = updatedStatements;

        if (duplicateCount > 0) {
          showToast(`Statement imported: ${newValidRows.length} new entries added (${duplicateCount} duplicate entries skipped).`, 'info');
        } else {
          showToast(`Statement successfully imported with ${newValidRows.length} transactions.`, 'success');
        }
        overlay.remove();
        renderActiveSubtab();
        triggerAutoBackup();
      });
    }
  }

  // ── Modal for Showing Bank Account Details ─────────────────────────
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
        
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: var(--blue-50); color: var(--blue-600); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700;">
            🏛️
          </div>
          <div>
            <h3 style="margin: 0; font-size: 18px; font-weight: 800; color: var(--slate-900);">${ohEsc(acc.name)}</h3>
            <p style="margin: 2px 0 0 0; font-size: 13px; color: var(--slate-400);">${ohEsc(acc.bankName)}</p>
          </div>
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
            <div style="font-size: 12px; font-weight: 800; color: var(--slate-700); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
              💳 Debit Card Information
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
            <div style="font-size: 12px; font-weight: 800; color: var(--slate-700); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
              📊 Statement & Balances
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


  // ===================================================================
  //  3. CASHBOOK (CASH RECEIPTS & PAYMENTS) VIEW
  // ===================================================================
  function renderCashbookView(target, controls, actionsArea) {
    const isBankingMode = _clActiveTopTab === 'banking';

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

      const isReconciliationMode = (_clActiveTopTab === 'banking' && _clActiveBankingTab === 'reconciliation') || (_clActiveTopTab === 'books' && _clBooksSubtab === 'reconciliation');
      const allLedgers = (typeof coaLedgers !== 'undefined' ? coaLedgers : []).filter(l => l.type === 'ledger');
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
          if (document.getElementById('clStmtShowingCount')) {
            document.getElementById('clStmtShowingCount').textContent = showingCountText;
          }

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
          const popoverWidth = Math.max(300, Math.min(360, btnRect.width || 280));
          
          const spaceBelow = window.innerHeight - btnRect.bottom;
          const spaceAbove = btnRect.top;
          const placeAbove = spaceBelow < 240 && spaceAbove > spaceBelow;

          let maxListHeight;
          if (placeAbove) {
            const availableHeight = Math.max(160, spaceAbove - 20);
            maxListHeight = Math.max(90, Math.min(220, availableHeight - 165));
          } else {
            const availableHeight = Math.max(160, spaceBelow - 20);
            maxListHeight = Math.max(90, Math.min(220, availableHeight - 165));
          }

          popover.style.cssText = `
            position: fixed;
            z-index: 10000;
            width: ${popoverWidth}px;
            background: #ffffff;
            border: 1.5px solid #cbd5e1;
            border-radius: 12px;
            box-shadow: 0 20px 35px -5px rgba(15, 23, 42, 0.2), 0 10px 15px -5px rgba(15, 23, 42, 0.1);
            padding: 10px;
            font-family: Inter, sans-serif;
            box-sizing: border-box;
            outline: none;
          `;

          // Align right edge of popover with right edge of button to prevent hiding Description/Amount columns
          let leftPos = btnRect.right - popoverWidth;
          if (leftPos < 10) leftPos = Math.max(10, btnRect.left);
          if (leftPos + popoverWidth > window.innerWidth - 10) {
            leftPos = Math.max(10, window.innerWidth - popoverWidth - 10);
          }
          popover.style.left = `${leftPos}px`;

          // Vertical positioning: strictly above or below without overlapping the row/button
          if (placeAbove) {
            popover.style.bottom = `${window.innerHeight - btnRect.top + 4}px`;
            popover.style.top = 'auto';
          } else {
            popover.style.top = `${btnRect.bottom + 4}px`;
            popover.style.bottom = 'auto';
          }

          popover.innerHTML = `
            <div style="position: sticky; top: 0; background: #ffffff; z-index: 10; padding-bottom: 6px; margin-bottom: 6px; border-bottom: 1px solid #f1f5f9;">
              <!-- Transaction Summary Header -->
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 10px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
                <div style="min-width: 0; flex: 1; padding-right: 8px;">
                  <div style="font-size: 11.5px; font-weight: 700; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${ohEsc(btn.dataset.description || '')}">
                    ${ohEsc(btn.dataset.description || '—')}
                  </div>
                  <div style="font-size: 10px; color: #64748b; margin-top: 1px; display: flex; gap: 6px;">
                    <span>${btn.dataset.date || ''}</span>
                    <span>•</span>
                    <span style="font-weight: 600; color: ${btn.dataset.typeColor || 'var(--slate-800)'};">${btn.dataset.type || ''}</span>
                  </div>
                </div>
                <div style="font-size: 12.5px; font-weight: 800; color: ${btn.dataset.typeColor || 'var(--slate-800)'}; white-space: nowrap;">
                  ${btn.dataset.amount || ''}
                </div>
              </div>

              <!-- Currently Selected Ledger Banner -->
              ${currentSelectedLedger ? `
                <div id="clReconCurrentSelectionBanner" style="background: #eff6ff; border: 1.5px solid #93c5fd; border-radius: 8px; padding: 6px 10px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
                  <div style="min-width: 0; flex: 1; padding-right: 8px;">
                    <div style="font-size: 9.5px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1px;">Currently Selected:</div>
                    <div style="font-size: 12.5px; font-weight: 800; color: #1e3a8a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ✓ ${ohEsc(currentSelectedLedger.name)}
                    </div>
                  </div>
                  <button type="button" id="clBtnClearCurrentSelection" style="background: #fee2e2; border: 1px solid #fca5a5; color: #dc2626; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px; white-space: nowrap;">
                    <svg viewBox="0 0 15 15" fill="none" style="width: 12px; height: 12px; display: block;" stroke="currentColor">
                      <path d="M5.5 2h4M1.5 4h12M2.5 4l1 9.5a1 1 0 001 .5h6a1 1 0 001-.5l1-9.5M5.5 6.5v5M9.5 6.5v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                    </svg>
                    <span>Remove</span>
                  </button>
                </div>
              ` : ''}

              <!-- Dedicated Search Input Box -->
              <div style="position: relative; margin-bottom: 6px;">
                <input type="text" id="clReconSearchInput" placeholder="Search ledger name..." style="width: 100%; height: 32px; font-size: 12px; padding: 0 8px 0 28px; border: 1.5px solid #cbd5e1; border-radius: 6px; outline: none; box-sizing: border-box; font-family: Inter, sans-serif; background: #fff;" autocomplete="off" />
                <span style="position: absolute; left: 8px; top: 7px; font-size: 12px; color: #94a3b8; pointer-events: none;">🔍</span>
              </div>

              <!-- Category filter tabs -->
              <div id="clReconCategoryTabs" style="display: flex; gap: 4px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none;">
                <button type="button" class="cl-cat-tab active" data-cat="all" style="padding: 3px 8px; font-size: 11px; font-weight: 700; border-radius: 6px; border: 1px solid #2563eb; background: #eff6ff; color: #2563eb; cursor: pointer; white-space: nowrap;">All</button>
                <button type="button" class="cl-cat-tab" data-cat="expenses" style="padding: 3px 8px; font-size: 11px; font-weight: 600; border-radius: 6px; border: 1px solid #e2e8f0; background: #fff; color: #64748b; cursor: pointer; white-space: nowrap;">Expenses</button>
                <button type="button" class="cl-cat-tab" data-cat="income" style="padding: 3px 8px; font-size: 11px; font-weight: 600; border-radius: 6px; border: 1px solid #e2e8f0; background: #fff; color: #64748b; cursor: pointer; white-space: nowrap;">Income</button>
                <button type="button" class="cl-cat-tab" data-cat="assets" style="padding: 3px 8px; font-size: 11px; font-weight: 600; border-radius: 6px; border: 1px solid #e2e8f0; background: #fff; color: #64748b; cursor: pointer; white-space: nowrap;">Assets/Liab</button>
              </div>
            </div>
            <div id="clReconLedgerList" style="max-height: ${maxListHeight}px; overflow-y: auto; display: flex; flex-direction: column; gap: 3px; padding-right: 2px;">
            </div>
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #64748b; font-weight: 500;">
              <span>Type to search</span>
              <span><kbd style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:3px; padding:1px 3px; font-size:9px;">↑↓</kbd> Navigate</span>
              <span><kbd style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:3px; padding:1px 3px; font-size:9px;">↵</kbd> Select</span>
              <span><kbd style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:3px; padding:1px 3px; font-size:9px;">Bksp</kbd> Remove</span>
            </div>
          `;

          document.body.appendChild(popover);

          const searchInput = popover.querySelector('#clReconSearchInput');
          const listContainer = popover.querySelector('#clReconLedgerList');
          const clearBannerBtn = popover.querySelector('#clBtnClearCurrentSelection');
          if (clearBannerBtn) {
            clearBannerBtn.addEventListener('click', () => {
              closePopover();
              selectOptionAndAdvance('', 'none');
            });
          }

          let activeIndex = 0;
          let currentCatFilter = 'all';

          function updateHighlight() {
            const opts = Array.from(listContainer.querySelectorAll('.cl-recon-opt'));
            if (opts.length === 0) return;
            if (activeIndex < 0) activeIndex = 0;
            if (activeIndex >= opts.length) activeIndex = opts.length - 1;

            opts.forEach((opt, idx) => {
              const isSel = String(opt.dataset.id) === String(currentSelectedId);
              if (idx === activeIndex) {
                opt.style.background = isSel ? '#bfdbfe' : '#f1f5f9';
                opt.style.border = isSel ? '2px solid #2563eb' : '1px solid #2563eb';
                opt.scrollIntoView({ block: 'nearest' });
              } else {
                opt.style.border = isSel ? '2px solid #2563eb' : '1px solid transparent';
                opt.style.background = isSel ? '#dbeafe' : 'transparent';
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
              <div class="cl-recon-opt" data-id="" style="padding: 8px 10px; font-size: 12px; font-weight: 700; color: #dc2626; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; background: #fff5f5; border: 1px dashed #fca5a5; margin-bottom: 4px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <svg viewBox="0 0 15 15" fill="none" style="width: 13px; height: 13px; display: block;" stroke="currentColor">
                    <path d="M5.5 2h4M1.5 4h12M2.5 4l1 9.5a1 1 0 001 .5h6a1 1 0 001-.5l1-9.5M5.5 6.5v5M9.5 6.5v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                  </svg>
                  <span>Clear / Remove Selected Ledger</span>
                </div>
                <kbd style="background: #fee2e2; border: 1px solid #fecaca; border-radius: 3px; padding: 1px 5px; font-size: 9px; color: #991b1b;">Backspace</kbd>
              </div>
            `;

            if (filtered.length > 0) {
              filtered.forEach(l => {
                const isSel = String(l.id) === String(currentSelectedId);
                const groupName = getLedgerGroup(l.id);

                html += `
                  <div class="cl-recon-opt" data-id="${l.id}" style="padding: 8px 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.1s ease; border: 1.5px solid ${isSel ? '#2563eb' : 'transparent'}; background: ${isSel ? '#dbeafe' : 'transparent'};">
                    <div style="display: flex; flex-direction: column; gap: 1.5px; min-width: 0; padding-right: 8px;">
                      <div style="font-size: 12.5px; font-weight: ${isSel ? '800' : '600'}; color: ${isSel ? '#1e40af' : '#1e293b'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${isSel ? '<span style="color: #2563eb; margin-right: 4px;">✓</span>' : ''}${ohEsc(l.name)}
                      </div>
                      ${groupName ? `
                        <div style="font-size: 10.5px; font-weight: 500; color: ${isSel ? '#2563eb' : '#64748b'}; display: flex; align-items: center; gap: 4px;">
                          <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: ${isSel ? '#2563eb' : '#94a3b8'}; flex-shrink: 0;"></span>
                          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${ohEsc(groupName)}</span>
                        </div>
                      ` : ''}
                    </div>
                    ${isSel ? `
                      <div style="background: #2563eb; color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 10.5px; font-weight: 800; flex-shrink: 0;">
                        ✓ Selected
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
                closePopover();
                selectOptionAndAdvance(opt.dataset.id, 'next');
              });
            });

            activeIndex = (query && filtered.length > 0) ? 1 : 0;
            updateHighlight();
          }

          searchInput.addEventListener('input', () => {
            renderOptions(searchInput.value, currentCatFilter);
          });

          searchInput.addEventListener('focus', () => {
            searchInput.style.borderColor = '#2563eb';
            searchInput.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.15)';
          });
          searchInput.addEventListener('blur', () => {
            searchInput.style.borderColor = '#cbd5e1';
            searchInput.style.boxShadow = 'none';
          });

          searchInput.addEventListener('keydown', (ev) => {
            if (ev.key === 'Backspace' && searchInput.value === '') {
              ev.preventDefault();
              if (btn.dataset.selectedId) {
                closePopover();
                selectOptionAndAdvance('', 'none');
              } else {
                closePopover();
                goToPrevRow();
              }
            } else if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp' || ev.key === 'Enter' || ev.key === 'Escape') {
              handleKeydown(ev);
            }
          });

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

              renderOptions(searchInput.value, tabBtn.dataset.cat);
              searchInput.focus();
            });
          });

          renderOptions();

          const handleKeydown = (ev) => {
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
                closePopover();
                selectOptionAndAdvance(opts[activeIndex].dataset.id, 'next');
              }
            } else if (ev.key === 'Escape') {
              ev.preventDefault();
              closePopover();
              btn.focus();
            } else if (ev.key === 'Backspace' && document.activeElement !== searchInput) {
              ev.preventDefault();
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

})();
