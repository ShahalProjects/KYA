  // ══════════════════════════════════════════════════════════════════
  //  ONEHUB SHELL — Panel entry, tab switching, badges, upcoming views
  //  (Split from onehub.js for maintainability)
  // ══════════════════════════════════════════════════════════════════


  // ══════════════════════════════════════════════════════════════════
  //  ONEHUB — HR MODULE  (Departments & Employees)
  // ══════════════════════════════════════════════════════════════════

  // ── Data ──────────────────────────────────────────────────────────
  // (State variables are declared at the top of the script to prevent bootstrapping ReferenceErrors)

  // ── UI State ──────────────────────────────────────────────────────
  let _ohActiveTab     = '';  // empty by default (no tab open on load)
  let _ohEmpSearch     = '';
  let _ohEmpDeptFilter = '';      // '' = all, or dept id string

  let _ohReminderFormOpen   = false;
  let _ohReminderEditIndex  = null;
  let _ohRemindersFilter     = 'upcoming';
  let _ohNewReminderType     = 'One Time';
  let _ohNewReminderDueDate  = '';
  let _ohNewReminderLedgerId = '';
  let _ohNewReminderTitle     = '';
  let _ohNewReminderAmount    = '';
  let _ohNewReminderDrCr      = 'Debit';
  let _ohNewReminderAutoJournal   = false;
  let _ohNewReminderDeptId        = '';
  let _ohNewReminderIsBudget      = false;
  let _ohNewReminderNarration     = '';
  let _ohNewReminderOppEntries    = [];
  let _ohNewReminderShowDaysBefore = 7;

  // ── HTML-escape helper ────────────────────────────────────────────
  function ohEsc(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Data helpers ──────────────────────────────────────────────────
  function ohGetDeptEmps(deptId) { return ohEmployees.filter(e => e.deptId === deptId); }
  function ohGetEmpById(id)      { return ohEmployees.find(e => e.id === id); }
  function ohGetDeptById(id)     { return ohDepartments.find(d => d.id === id); }
  function ohInitials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).slice(0,2).map(w => w[0].toUpperCase()).join('');
  }
  function ohAutoCode() { return 'EMP-' + String(_ohEmpCtr).padStart(3,'0'); }
  function ohFmtSalary(v) {
    if (v === null || v === undefined || v === '') return '\u2014';
    return '\u20B9\u202F' + Number(v).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2});
  }

  // ── Entry point (called by switchToActivePanel) ───────────────────
  // Upcoming module configs
  const OH_UPCOMING = {
    budget: {
      label: 'Budget',
      icon: `<svg width="38" height="38" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="4" width="16" height="13" rx="2" stroke="currentColor" stroke-width="1.4"/>
        <path d="M7 10h6M7 13h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M10 4V2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>`,
      desc: 'Plan and track departmental budgets, set spending caps, and monitor variance against actuals.',
      features: ['Budget Allocation', 'Spend Tracking', 'Variance Reports', 'Approval Workflows'],
    },
    paytrack: {
      label: 'PayTrack',
      icon: `<svg width="38" height="38" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.4"/>
        <path d="M10 5.5v1.2M10 13.3v1.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        <path d="M8 8c0-.8.9-1.5 2-1.5s2 .7 2 1.5-1 1.3-2 1.5-2 .7-2 1.5.9 1.5 2 1.5 2-.7 2-1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      </svg>`,
      desc: 'Manage employee payroll, salaries, deductions, and generate payslips — all from one place.',
      features: ['Payroll Processing', 'Salary Slips', 'TDS & Deductions', 'Pay History'],
    },
    underledger: {
      label: 'Mini Ledger',
      icon: `<svg width="38" height="38" viewBox="0 0 20 20" fill="none">
        <path d="M4 5h12M4 9h8M4 13h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        <circle cx="16" cy="13" r="3.5" stroke="currentColor" stroke-width="1.4"/>
        <path d="M15 13h2M16 12v2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      </svg>`,
      desc: 'Link employees and departments directly to ledger accounts for seamless cost-centre accounting.',
      features: ['Ledger Mapping', 'Cost Centres', 'Department P&L', 'Auto Journal Lines'],
    },
  };

  function renderOneHubPanel() {
    updateOhBadges();
    
    // Switch to active tab (or empty state if not set)
    switchOhTab(_ohActiveTab);

    // Wire all tabs (once)
    const tabMap = {
      ohTabDept:        'dept',
      ohTabEmp:         'emp',
      ohTabBudget:      'budget',
      ohTabReminders:   'reminders',
      ohTabPaytrack:    'paytrack',
      ohTabUnderLedger: 'underledger',
    };
    Object.entries(tabMap).forEach(([btnId, tab]) => {
      const btn = document.getElementById(btnId);
      if (btn && !btn._ohWired) {
        btn._ohWired = true;
        btn.addEventListener('click', () => switchOhTab(tab));
      }
    });
  }

  function switchOhTab(tab) {
    _ohActiveTab = tab;

    // All tab IDs → which tab key they represent
    const allTabs = [
      ['ohTabDept',        'dept'],
      ['ohTabEmp',         'emp'],
      ['ohTabBudget',      'budget'],
      ['ohTabReminders',   'reminders'],
      ['ohTabPaytrack',    'paytrack'],
      ['ohTabUnderLedger', 'underledger'],
    ];
    const allViews = [
      ['oh-dept-view',        'dept'],
      ['oh-emp-view',         'emp'],
      ['oh-budget-view',      'budget'],
      ['oh-reminders-view',   'reminders'],
      ['oh-paytrack-view',    'paytrack'],
      ['oh-underledger-view', 'underledger'],
      ['oh-empty-view',       ''],
    ];

    allTabs.forEach(([btnId, t]) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      const isActive = t === tab;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive);
    });
    allViews.forEach(([viewId, t]) => {
      const view = document.getElementById(viewId);
      if (view) view.style.display = t === tab ? '' : 'none';
    });

    updateOhHeaderBtn();
    if (tab === 'dept')        renderOhDeptView();
    else if (tab === 'emp')    renderOhEmpView();
    else if (tab === 'budget') renderOhBudgetView();
    else if (tab === 'reminders') renderOhRemindersView();
    else if (tab)              _renderOhUpcomingView(tab);
  }

  function _renderOhUpcomingView(key) {
    const viewIdMap = {
      budget:      'oh-budget-view',
      paytrack:    'oh-paytrack-view',
      underledger: 'oh-underledger-view',
    };
    const wrap = document.getElementById(viewIdMap[key]);
    if (!wrap) return;
    const cfg = OH_UPCOMING[key];
    if (!cfg) return;

    const featureTags = cfg.features
      .map(f => `<span class="oh-upcoming-feat-tag">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="#10b981" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        ${f}
      </span>`)
      .join('');

    wrap.innerHTML = `
      <div class="oh-upcoming-wrap">
        <div class="oh-upcoming-icon-ring" style="color:#b45309;">
          ${cfg.icon}
        </div>
        <div class="oh-upcoming-title">${cfg.label}</div>
        <div class="oh-upcoming-subtitle">${cfg.desc}</div>
        <div class="oh-upcoming-pill">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          Upcoming Feature
        </div>
        <div class="oh-upcoming-features">${featureTags}</div>
      </div>
    `;
  }

  function updateOhBadges() {
    const db = document.getElementById('ohDeptBadge');
    const eb = document.getElementById('ohEmpBadge');
    const bb = document.getElementById('ohBudgetBadge');
    const rb = document.getElementById('ohRemindersBadge');
    if (db) db.textContent = ohDepartments.length;
    if (eb) eb.textContent = ohEmployees.length;
    if (bb) bb.textContent = ohBudgets.length;
    if (rb) rb.textContent = ohReminders.length;
  }

  function updateOhHeaderBtn() {
    const wrap = document.getElementById('ohHeaderActions');
    if (!wrap) return;
    if (_ohActiveTab === 'dept') {
      wrap.innerHTML = `
        <button class="btn" id="ohAddDeptBtn" aria-label="Add Department" style="background: var(--white) !important; color: var(--blue-700) !important; border: none; font-weight: 700; height: 36px; padding: 0 16px; border-radius: 8px; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: all 0.2s ease;">
          <svg viewBox="0 0 15 15" fill="none" style="width: 14px; height: 14px;"><path d="M7.5 2v11M2 7.5h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          Add Department
        </button>`;
      document.getElementById('ohAddDeptBtn')?.addEventListener('click', () => openOhDeptModal());
    } else if (_ohActiveTab === 'emp') {
      wrap.innerHTML = `
        <button class="btn" id="ohAddEmpBtn" aria-label="Add Employee" style="background: var(--white) !important; color: var(--blue-700) !important; border: none; font-weight: 700; height: 36px; padding: 0 16px; border-radius: 8px; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: all 0.2s ease;">
          <svg viewBox="0 0 15 15" fill="none" style="width: 14px; height: 14px;"><path d="M7.5 2v11M2 7.5h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          Add Employee
        </button>`;
      document.getElementById('ohAddEmpBtn')?.addEventListener('click', () => openOhEmpModal());
    } else if (_ohActiveTab === 'budget') {
      wrap.innerHTML = `
        <button class="btn" id="ohAddBudgetBtn" aria-label="Add Budget" style="background: var(--white) !important; color: var(--blue-700) !important; border: none; font-weight: 700; height: 36px; padding: 0 16px; border-radius: 8px; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: all 0.2s ease;">
          <svg viewBox="0 0 15 15" fill="none" style="width: 14px; height: 14px;"><path d="M7.5 2v11M2 7.5h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          Add Budget
        </button>`;
      document.getElementById('ohAddBudgetBtn')?.addEventListener('click', () => openOhBudgetModal());
    } else if (_ohActiveTab === 'reminders') {
      wrap.innerHTML = `
        <button class="btn" id="ohAddReminderBtn" aria-label="Add Reminder" style="background: var(--white) !important; color: var(--blue-700) !important; border: none; font-weight: 700; height: 36px; padding: 0 16px; border-radius: 8px; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: all 0.2s ease;">
          <svg viewBox="0 0 15 15" fill="none" style="width: 14px; height: 14px;"><path d="M7.5 2v11M2 7.5h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          Add Reminder
        </button>`;
      document.getElementById('ohAddReminderBtn')?.addEventListener('click', () => {
        _ohReminderFormOpen = !_ohReminderFormOpen;
        _ohReminderEditIndex = null;
        if (_ohReminderFormOpen) {
          _ohNewReminderType = 'One Time';
          _ohNewReminderDueDate = new Date().toISOString().split('T')[0];
          const ledgers = coaLedgers.filter(l => l.type === 'ledger');
          _ohNewReminderLedgerId = ledgers.length > 0 ? ledgers[0].id : 'general';
          _ohNewReminderTitle = '';
          _ohNewReminderAmount = '';
          _ohNewReminderDrCr = 'Debit';
          _ohNewReminderAutoJournal = false;
          _ohNewReminderDeptId = '';
          _ohNewReminderIsBudget = false;
          _ohNewReminderNarration = '';
          _ohNewReminderOppEntries = [];
          _ohNewReminderShowDaysBefore = 7;
        }
        renderOhRemindersView();
      });
    } else {
      // Upcoming feature tabs — no action button
      wrap.innerHTML = '';
    }
  }


