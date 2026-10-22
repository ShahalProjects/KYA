/**
 * KYA Modular - Track Recorder Module
 * Overview, Budget, Reminders and PayTracker. Budget, Reminders and PayTracker open full screen (left menu hidden)
 * with a Back button to return to Overview, like Reports and Master Desk.
 * Budget and Reminders use onehub-budget.js / onehub-reminders-view.js; PayTracker uses pay-tracker.js
 * (Receivable | Payable, switched from the back bar).
 */

(function() {
  'use strict';

  let _trActiveSection = 'overview';   // overview | budget | reminders | paytracker
  let _trPayView = 'receivable';       // PayTracker list: receivable | payable
  let _trPaySearch = '';               // PayTracker back bar search: invoice no. or customer / vendor

  // Sections that open full screen (left menu hidden) with a Back button to return to Overview
  const TR_FULL_SCREEN = ['budget', 'reminders', 'paytracker'];

  // PayTracker lists, switched from the back bar (as Master Desk's back-bar buttons)
  const TR_PAY_VIEWS = [['receivable', 'Receivable'], ['payable', 'Payable']];

  const TR_ICONS = {
    overview: `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
        <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
        <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
        <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
      </svg>`,
    budget: `
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="4" width="16" height="13" rx="2" stroke="currentColor" stroke-width="1.8"/>
        <path d="M7 10h6M7 13h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M10 4V2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>`,
    reminders: `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    paytracker: `
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <path d="M4 7h11l-3-3M16 13H5l3 3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
  };

  const TR_PLUS_ICON = '<svg viewBox="0 0 15 15" fill="none" style="width: 14px; height: 14px;"><path d="M7.5 2v11M2 7.5h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  // Back bar search box and department filter: the same look as Stock Book's search bar and filter
  function injectTrackRecorderStyles() {
    if (document.getElementById('track-recorder-styles')) return;
    const style = document.createElement('style');
    style.id = 'track-recorder-styles';
    style.textContent = `
      #trBackBar .stock-search-box {
        position: relative;
        flex: 1;
        min-width: 240px;
      }
      #trBackBar .stock-search-box svg {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--slate-400, #94a3b8);
        pointer-events: none;
      }
      #trBackBar .stock-search-input {
        width: 100%;
        padding: 8px 12px 8px 36px;
        font-size: 13px;
        border-radius: 7px;
        border: 1.5px solid var(--slate-200, #e2e8f0);
        outline: none;
        box-sizing: border-box;
        transition: border-color 0.15s ease;
        background: #ffffff;
      }
      #trBackBar .stock-search-input:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
      }
      #trBackBar .stock-select-filter {
        padding: 7.5px 12px;
        font-size: 12.5px;
        font-weight: 500;
        color: var(--slate-700, #334155);
        border: 1.5px solid var(--slate-200, #e2e8f0);
        border-radius: 7px;
        background: #ffffff;
        outline: none;
        cursor: pointer;
      }
      /* Overview: KPI cards in the KYA Dashboard style (as Stock Book's Details), no sparkline */
      #panel-track-recorder .tr-kpi-strip { margin-bottom: 20px; }
      #panel-track-recorder .tr-kpi-strip .db-kpi-card { padding-bottom: 18px; cursor: default; }
      #panel-track-recorder .tr-kpi-strip .db-kpi-top { margin-bottom: 14px; }
      #panel-track-recorder .tr-kpi-strip .db-kpi-value { overflow-wrap: anywhere; }
      #panel-track-recorder .tr-kpi-strip .db-kpi-sub { margin-bottom: 0; }
      /* Card / tile columns follow the Overview's own width (as Stock Book's Details) */
      #panel-track-recorder .tr-ov { container-type: inline-size; }
      #panel-track-recorder .tr-ov-tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
      @container (max-width: 900px) { #panel-track-recorder .tr-kpi-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      @container (max-width: 520px) { #panel-track-recorder .tr-ov-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      @container (max-width: 380px) { #panel-track-recorder .tr-kpi-strip { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(style);
  }

  // True while the Track Recorder panel is on screen with the given section open
  function isTrackRecorderShowing(section) {
    const panel = document.getElementById('panel-track-recorder');
    return !!panel && panel.style.display !== 'none' && _trActiveSection === section;
  }

  function renderTrSubTab(id, label) {
    const isActive = _trActiveSection === id;
    return `
      <button class="oh-sub-tab ${isActive ? 'active' : ''}" data-tr-section="${id}" role="tab" aria-selected="${isActive}">
        <div class="oh-tab-icon-wrap">${TR_ICONS[id]}</div>
        <span class="oh-tab-text">${label}</span>
      </button>
    `;
  }

  function renderTrHeaderActions() {
    if (_trActiveSection === 'budget') {
      // Glass look of KYA's blue title-card controls (cl-glass-control, as on Balance Sheet / Cashline)
      return `<button type="button" class="cl-glass-control" id="trAddBudgetBtn" aria-label="Add Budget" style="display: inline-flex; align-items: center; gap: 6px;">${TR_PLUS_ICON} Add Budget</button>`;
    }
    if (_trActiveSection === 'reminders') {
      return `<button type="button" class="cl-glass-control" id="trAddReminderBtn" aria-label="Add Reminder" style="display: inline-flex; align-items: center; gap: 6px;">${TR_PLUS_ICON} Add Reminder</button>`;
    }
    return '';
  }

  // Budget list: search box and department filter sit in the back bar, next to the Back button
  function renderTrBudgetFilters() {
    if (_trActiveSection !== 'budget') return '';
    const search = typeof _ohBudgetSearch === 'string' ? _ohBudgetSearch : '';
    const deptFilter = typeof _ohBudgetDeptFilter !== 'undefined' ? String(_ohBudgetDeptFilter) : '';
    const depts = typeof ohDepartments !== 'undefined' ? ohDepartments : [];
    return `
      <div class="stock-search-box">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" class="stock-search-input" id="trBudgetSearch" placeholder="Search by department or ledger..." value="${ohEsc(search)}" aria-label="Search by department or ledger">
      </div>
      <select class="stock-select-filter" id="trBudgetDeptFilter" aria-label="Department filter">
        <option value="">-- All Departments --</option>
        ${depts.map(d => `<option value="${d.id}" ${String(d.id) === deptFilter ? 'selected' : ''}>${ohEsc(d.name)}</option>`).join('')}
      </select>
    `;
  }

  // Reminders list: search box in the back bar, next to the Back button (task name or ledger)
  function renderTrRemindersSearch() {
    if (_trActiveSection !== 'reminders') return '';
    const search = typeof _ohRemindersSearch === 'string' ? _ohRemindersSearch : '';
    return `
      <div class="stock-search-box">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" class="stock-search-input" id="trRemindersSearch" placeholder="Search by task name or ledger..." value="${ohEsc(search)}" aria-label="Search by task name or ledger">
      </div>
    `;
  }

  // PayTracker back bar, after ←: the search box, then the Receivable | Payable buttons, the one
  // on screen in blue (Master Desk's back-bar buttons)
  function renderTrPayBar() {
    if (_trActiveSection !== 'paytracker') return '';
    const buttons = TR_PAY_VIEWS.map(([view, label]) => {
      const on = _trPayView === view;
      return `<button type="button" class="btn ${on ? 'btn-primary' : 'btn-secondary'} master-back-bar-nav" data-tr-pay="${view}" aria-current="${on ? 'page' : 'false'}" style="height:34px; font-size:12.5px; padding: 0 14px; font-weight:600; cursor:pointer; border-radius:6px; display:inline-flex; align-items:center; gap:6px;${on ? ' background: var(--blue-600); color: #ffffff; border-color: var(--blue-600);' : ''}">${label}</button>`;
    }).join('');
    return `
      <div class="stock-search-box">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" class="stock-search-input" id="trPaySearch" placeholder="Search by invoice no. or customer / vendor..." value="${ohEsc(_trPaySearch)}" aria-label="Search by invoice no. or customer / vendor">
      </div>
      <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">${buttons}</div>
    `;
  }

  // Overview: Dashboard-style KPI cards, then a Master Desk-style card of count tiles.
  // Figures follow the Budget, Reminders and PayTracker screens (paused budgets are left out of the totals).
  function renderTrOverview() {
    const budgets = typeof ohBudgets !== 'undefined' ? ohBudgets : [];
    const reminders = typeof ohReminders !== 'undefined' ? ohReminders : [];
    const now = new Date();
    const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];

    let totBudget = 0, totSpent = 0, active = 0, exceeded = 0, ongoing = 0, upcoming = 0, expired = 0;
    budgets.forEach(b => {
      if (b.fromDate <= today && b.toDate >= today) ongoing++;
      else if (b.fromDate > today) upcoming++;
      else if (b.toDate < today) expired++;
      if (b.isPaused) return;
      active++;
      const u = ohBudgetUsage(b);
      totBudget += u.limitVal;
      totSpent += u.expVal;
      if (u.realPct >= 100) exceeded++;
    });
    const remaining = totBudget - totSpent;
    const spentPct = totBudget > 0 ? Math.round((totSpent / totBudget) * 100) : 0;
    const dueSoon = ohRemindersDueSoonCount();

    // PayTracker: balances still due (pay-tracker.js)
    const pt = typeof getPayTrackerData === 'function'
      ? getPayTrackerData() : { receivable: [], payable: [] };
    const weekEnd = new Date(new Date(today + 'T00:00:00').getTime() + 7 * 86400000);
    const week = new Date(weekEnd.getTime() - weekEnd.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const sumOf = list => list.reduce((s, x) => s + x.amount, 0);
    const overdueOf = list => list.filter(x => x.dueDate && x.dueDate < today).length;
    const overdueSumOf = list => sumOf(list.filter(x => x.dueDate && x.dueDate < today));
    const dueSoonOf = list => list.filter(x => x.dueDate >= today && x.dueDate <= week).length;
    const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

    const kpi = (icon, value, label, sub) => `
      <div class="db-kpi-card">
        <div class="db-kpi-top"><div class="db-kpi-icon-wrap">${icon}</div></div>
        <div class="db-kpi-value">${value}</div>
        <div class="db-kpi-label">${label}</div>
        <div class="db-kpi-sub">${sub}</div>
      </div>`;

    // Same tile as Master Desk's Overview
    const tile = (count, label, iconSvg) => `
      <div style="border: 1.5px solid var(--slate-200); border-radius: 10px; padding: 16px 14px; text-align: center; background: #f8fafc;">
        <div style="width: 32px; height: 32px; margin: 0 auto 8px auto; border-radius: 8px; background: var(--blue-50, #eff6ff); display: flex; align-items: center; justify-content: center; color: var(--blue-600);">
          ${iconSvg}
        </div>
        <div style="font-size: 22px; font-weight: 700; color: var(--slate-800); line-height: 1.2;">${count}</div>
        <div style="font-size: 11px; font-weight: 600; color: var(--slate-500); text-transform: uppercase; letter-spacing: 0.04em; margin-top: 4px;">${label}</div>
      </div>`;
    const sectionLabel = (text, first) => `<div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--slate-400); margin: ${first ? '0' : '22px'} 0 10px 0;">${text}</div>`;

    const icoRupee = '<svg viewBox="0 0 20 20" fill="none"><path d="M10 2v16M6 6h6a2 2 0 1 1 0 4H8a2 2 0 1 0 0 4h7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
    const icoSpent = '<svg viewBox="0 0 20 20" fill="none"><path d="M3 6h14M3 10h10M3 14h7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="15" cy="14" r="3" stroke="currentColor" stroke-width="1.5"/></svg>';
    const icoTrend = '<svg viewBox="0 0 20 20" fill="none"><path d="M3 14l4-5 3 3 4-6 3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const icoBell = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
    const icoBudget = '<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="13" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M7 10h6M7 13h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M10 4V2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    const icoPlay = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>';
    const icoCalendar = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
    const icoHistory = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
    const icoAlert = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>';
    const icoBellSm = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
    const icoRepeat = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>';
    const icoCheck = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>';
    const icoIn = '<svg viewBox="0 0 20 20" fill="none"><path d="M10 3v10M6 9l4 4 4-4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 16h14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
    const icoOut = '<svg viewBox="0 0 20 20" fill="none"><path d="M10 13V3M6 7l4-4 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 16h14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
    const icoAlertKpi = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>';
    const icoDoc = '<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M5 2.5h7l3.5 3.5v11.5H5V2.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 10h5M8 13h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';

    return `
      <div class="tr-ov">
      <div class="db-kpi-strip tr-kpi-strip">
        ${kpi(icoRupee, ohFmtAmt(totBudget), 'Total Budget', `${active} active budget${active === 1 ? '' : 's'}`)}
        ${kpi(icoSpent, ohFmtAmt(totSpent), 'Actual Spent', `${spentPct}% spent`)}
        ${kpi(icoTrend, ohFmtAmt(Math.abs(remaining)), remaining >= 0 ? 'Remaining' : 'Over Budget', remaining >= 0 ? 'Within limit' : 'Over the limit')}
        ${kpi(icoBell, dueSoon, 'Due in 7 Days', `reminder${dueSoon === 1 ? '' : 's'}`)}
      </div>
      <div class="db-kpi-strip tr-kpi-strip">
        ${kpi(icoIn, ohFmtAmt(sumOf(pt.receivable)), 'Receivable', `${plural(pt.receivable.length, 'item')} from customers & vendors`)}
        ${kpi(icoOut, ohFmtAmt(sumOf(pt.payable)), 'Payable', `${plural(pt.payable.length, 'item')} to vendors & customers`)}
        ${kpi(icoAlertKpi, ohFmtAmt(overdueSumOf(pt.receivable)), 'Overdue Receivable', `${plural(overdueOf(pt.receivable), 'item')} overdue`)}
        ${kpi(icoAlertKpi, ohFmtAmt(overdueSumOf(pt.payable)), 'Overdue Payable', `${plural(overdueOf(pt.payable), 'item')} overdue`)}
      </div>

      <div class="coa-modal-card" style="max-width: none; width: auto; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--white); margin: 0;">
        <h3 style="font-size: 15px; font-weight: 700; color: var(--slate-800); margin: 0 0 4px 0; display: flex; align-items: center; gap: 8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          Overview
        </h3>
        <p style="font-size: 12.5px; color: var(--slate-500); margin: 0 0 18px 0;">Snapshot of your budgets, reminders and payments.</p>

        ${sectionLabel('Budgets', true)}
        <div class="tr-ov-tiles">
          ${tile(budgets.length, 'Total', icoBudget)}
          ${tile(ongoing, 'Ongoing', icoPlay)}
          ${tile(upcoming, 'Upcoming', icoCalendar)}
          ${tile(expired, 'Expired', icoHistory)}
          ${tile(exceeded, 'Exceeded', icoAlert)}
        </div>

        ${sectionLabel('Reminders')}
        <div class="tr-ov-tiles">
          ${tile(reminders.length, 'Total', icoBellSm)}
          ${tile(reminders.filter(r => r.type === 'Recurring').length, 'Recurring', icoRepeat)}
          ${tile(ohRemindersUpcomingCount(), 'Upcoming', icoCalendar)}
          ${tile(reminders.filter(r => r.status === 'Completed').length, 'Completed', icoCheck)}
        </div>

        ${sectionLabel('Receivable')}
        <div class="tr-ov-tiles">
          ${tile(pt.receivable.length, 'Open', icoDoc)}
          ${tile(overdueOf(pt.receivable), 'Overdue', icoAlert)}
          ${tile(dueSoonOf(pt.receivable), 'Due in 7 Days', icoHistory)}
        </div>

        ${sectionLabel('Payable')}
        <div class="tr-ov-tiles">
          ${tile(pt.payable.length, 'Open', icoDoc)}
          ${tile(overdueOf(pt.payable), 'Overdue', icoAlert)}
          ${tile(dueSoonOf(pt.payable), 'Due in 7 Days', icoHistory)}
        </div>
      </div>
      </div>
    `;
  }

  function renderTrContent() {
    if (_trActiveSection === 'budget') return '<div id="trBudgetView"></div>';
    if (_trActiveSection === 'reminders') return '<div id="trRemindersView"></div>';
    if (_trActiveSection === 'paytracker') {
      return typeof renderPayTrackerListHtml === 'function' ? renderPayTrackerListHtml(_trPayView, _trPaySearch) : '';
    }
    return renderTrOverview();
  }

  function renderTrackRecorderPanel() {
    const container = document.getElementById('panel-track-recorder');
    if (!container) return;
    injectTrackRecorderStyles();

    const isFullScreen = TR_FULL_SCREEN.includes(_trActiveSection);

    container.innerHTML = `
      <div class="table-card" style="padding: 24px 28px;">
        <!-- Colored header strip -->
        <div class="je-card-header" style="background: linear-gradient(90deg, var(--blue-700), var(--blue-500)); border-top-left-radius: 12px; border-top-right-radius: 12px; margin: -24px -28px 20px -28px; padding: 18px 28px; display: flex; align-items: center; justify-content: space-between;">
          <div class="je-card-header-left" style="display: flex; align-items: center; gap: 12px;">
            <div class="je-card-icon-wrap" style="background: rgba(255, 255, 255, 0.15); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
              <svg viewBox="0 0 20 20" fill="none" style="width: 20px; height: 20px; color: var(--white);">
                <rect x="4" y="3.5" width="12" height="14" rx="2" stroke="currentColor" stroke-width="1.6"/>
                <path d="M7.5 3.5V2.5h5v1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M7 10.5l2 2 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div>
              <div class="je-card-title-text" style="color: var(--white); font-weight: 700; font-size: 16px; margin: 0;">Track Recorder</div>
              <div class="je-card-subtitle-text" style="color: rgba(255, 255, 255, 0.8); font-size: 12px; margin: 2px 0 0 0;">Budgets, Reminders &amp; PayTracker</div>
            </div>
          </div>
          <div class="panel-actions" style="display: flex; gap: 8px; align-items: center;">${renderTrHeaderActions()}</div>
        </div>

        <div class="oh-layout ${isFullScreen ? 'full-width' : ''}" id="trLayoutContainer">
          <!-- Sub-tabs (Left side options cards) -->
          <div class="oh-sub-tabs" id="trSidebar" role="tablist" aria-label="Track Recorder sections" style="display: ${isFullScreen ? 'none' : 'flex'};">
            ${renderTrSubTab('overview', 'Overview')}
            ${renderTrSubTab('budget', 'Budget')}
            ${renderTrSubTab('reminders', 'Reminders')}
            ${renderTrSubTab('paytracker', 'PayTracker')}
          </div>

          <!-- Right Content View Area -->
          <div class="oh-content-area">
            <div id="trBackBar" style="display: ${isFullScreen ? 'flex' : 'none'}; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; background: var(--slate-50); border: 1.5px solid var(--slate-200); border-radius: 12px; padding: 12px 16px;">
              <div style="display: flex; gap: 10px; align-items: center;">
                <button type="button" class="kya-back-btn" id="trBackBtn" title="Back" aria-label="Back">
                  <svg viewBox="0 0 20 20" fill="none" width="18" height="18" aria-hidden="true"><path d="M12.5 15l-5-5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
              </div>
              ${renderTrPayBar()}
              ${renderTrBudgetFilters()}
              ${renderTrRemindersSearch()}
            </div>
            <div id="trContentArea">${renderTrContent()}</div>
          </div>
        </div>
      </div>
    `;

    container.querySelectorAll('.oh-sub-tab[data-tr-section]').forEach(btn => {
      btn.addEventListener('click', () => {
        _trActiveSection = btn.dataset.trSection;
        if (_trActiveSection === 'paytracker') {   // PayTracker opens on Receivable, search cleared
          _trPayView = 'receivable';
          _trPaySearch = '';
        }
        renderTrackRecorderPanel();
      });
    });

    container.querySelector('#trBackBtn')?.addEventListener('click', () => {
      _trActiveSection = 'overview';
      renderTrackRecorderPanel();
    });

    container.querySelectorAll('[data-tr-pay]').forEach(btn => {
      btn.addEventListener('click', () => {
        _trPayView = btn.dataset.trPay;
        renderTrackRecorderPanel();
      });
    });
    // PayTracker search re-draws only the list, so the search box keeps its focus
    container.querySelector('#trPaySearch')?.addEventListener('input', e => {
      _trPaySearch = e.target.value;
      const area = document.getElementById('trContentArea');
      if (area && typeof renderPayTrackerListHtml === 'function') area.innerHTML = renderPayTrackerListHtml(_trPayView, _trPaySearch);
    });

    container.querySelector('#trAddBudgetBtn')?.addEventListener('click', () => {
      if (typeof openOhBudgetModal === 'function') openOhBudgetModal();
    });
    container.querySelector('#trAddReminderBtn')?.addEventListener('click', () => {
      if (typeof ohToggleNewReminderForm === 'function') ohToggleNewReminderForm();
    });

    // Back bar search / department filter re-draw only the list, so the search box keeps its focus
    container.querySelector('#trBudgetSearch')?.addEventListener('input', e => {
      _ohBudgetSearch = e.target.value;
      renderOhBudgetView();
    });
    container.querySelector('#trBudgetDeptFilter')?.addEventListener('change', e => {
      _ohBudgetDeptFilter = e.target.value;
      renderOhBudgetView();
    });
    container.querySelector('#trRemindersSearch')?.addEventListener('input', e => {
      _ohRemindersSearch = e.target.value;
      renderOhRemindersView();
    });

    if (_trActiveSection === 'budget' && typeof renderOhBudgetView === 'function') renderOhBudgetView();
    if (_trActiveSection === 'reminders' && typeof renderOhRemindersView === 'function') renderOhRemindersView();
  }

  // Opens Track Recorder on a section (the top bar's 🔔 opens Reminders)
  function openTrackRecorderSection(section) {
    _trActiveSection = section;
    if (typeof navigateTo === 'function') navigateTo('track_recorder');
    renderTrackRecorderPanel();
  }

  // Global exports
  window.openTrackRecorderSection = openTrackRecorderSection;
  window.renderTrackRecorderPanel = renderTrackRecorderPanel;
  window.isTrackRecorderShowing = isTrackRecorderShowing;

})();
