
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


  // ════════════════════════════════════
  //  DEPARTMENTS VIEW
  // ════════════════════════════════════
  function renderOhDeptView() {
    const wrap = document.getElementById('ohDeptViewInner');
    if (!wrap) return;

    const totalDepts = ohDepartments.length;
    const totalEmps  = ohEmployees.length;
    const unassigned = ohEmployees.filter(e => !e.deptId || !ohGetDeptById(e.deptId)).length;

    let html = `
      <div class="oh-stats-row">
        <div class="oh-stat">
          <div class="oh-stat-icon" style="background:#dbeafe;">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style="color:#2563eb;">
              <rect x="2" y="6" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.6"/>
              <path d="M6 6V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="oh-stat-label">Departments</div>
          <div class="oh-stat-value">${totalDepts}</div>
          <div class="oh-stat-sub">${totalDepts === 0 ? 'None created yet' : totalDepts + ' total'}</div>
        </div>
        <div class="oh-stat">
          <div class="oh-stat-icon" style="background:#d1fae5;">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style="color:#059669;">
              <circle cx="10" cy="6" r="3.5" stroke="currentColor" stroke-width="1.6"/>
              <path d="M3 18c0-4 3.1-7 7-7s7 3 7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="oh-stat-label">Employees</div>
          <div class="oh-stat-value">${totalEmps}</div>
          <div class="oh-stat-sub">${totalEmps === 0 ? 'None added yet' : totalEmps + ' total'}</div>
        </div>
        <div class="oh-stat">
          <div class="oh-stat-icon" style="background:#fef3c7;">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style="color:#d97706;">
              <path d="M10 9v4M10 15h.01" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
              <path d="M2 16L10 3l8 13H2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="oh-stat-label">Unassigned</div>
          <div class="oh-stat-value">${unassigned}</div>
          <div class="oh-stat-sub">${unassigned === 0 ? 'All assigned \u2713' : 'Need assignment'}</div>
        </div>
      </div>`;

    if (ohDepartments.length === 0) {
      html += `
        <div class="oh-empty">
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
            <rect x="10" y="20" width="40" height="30" rx="5" fill="#dbeafe" stroke="#93c5fd" stroke-width="2"/>
            <path d="M20 20V14a4 4 0 014-4h12a4 4 0 014 4v6" stroke="#93c5fd" stroke-width="2" stroke-linecap="round"/>
            <path d="M24 35h12M30 30v10" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <div class="oh-empty-title">No departments yet</div>
          <div class="oh-empty-desc">Create your first department to start organising your team hierarchy.</div>
        </div>`;
    } else {
      html += `<div class="oh-dept-grid">`;
      ohDepartments.forEach(dept => {
        const emps     = ohGetDeptEmps(dept.id);
        const head     = dept.headEmpId ? ohGetEmpById(dept.headEmpId) : null;
        const preview  = emps.slice(0, 3);
        const overflow = emps.length - 3;
        html += `
          <div class="oh-dept-card">
            <div class="oh-dept-card-top">
              <div class="oh-dept-name">${ohEsc(dept.name)}</div>
              <div class="oh-dept-head-row">
                ${head
                  ? `<div class="oh-dept-head-avatar">${ohInitials(head.name)}</div>
                     <span>Head: <span class="oh-dept-head-name">${ohEsc(head.name)}</span></span>`
                  : `<span class="oh-dept-no-head">\u2014 No head assigned \u2014</span>`}
              </div>
            </div>
            <div class="oh-dept-card-mid">
              <div class="oh-dept-emp-count">${emps.length} Employee${emps.length !== 1 ? 's' : ''}</div>
              <div class="oh-dept-emp-list">
                ${preview.map(e => `
                  <div class="oh-dept-emp-item">
                    <span class="oh-dept-emp-dot"></span>
                    <span>${ohEsc(e.name)}${e.designation ? ` <span style="color:var(--slate-400);font-size:11px;">(${ohEsc(e.designation)})</span>` : ''}</span>
                  </div>`).join('')}
                ${overflow > 0 ? `<div class="oh-dept-overflow" data-dept-detail="${dept.id}">+${overflow} more&hellip;</div>` : ''}
                ${emps.length === 0 ? `<div style="font-size:12px;color:var(--slate-300);font-style:italic;">No employees assigned</div>` : ''}
              </div>
            </div>
            <div class="oh-dept-card-actions">
              <button class="oh-action-btn primary oh-dept-detail-btn" data-id="${dept.id}">
                <svg viewBox="0 0 12 12" fill="none"><path d="M1 6s1.8-4 5-4 5 4 5 4-1.8 4-5 4-5-4-5-4z" stroke="currentColor" stroke-width="1.3"/><circle cx="6" cy="6" r="1.5" stroke="currentColor" stroke-width="1.3"/></svg>
                View
              </button>
              <button class="oh-action-btn oh-dept-edit-btn" data-id="${dept.id}">
                <svg viewBox="0 0 12 12" fill="none"><path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Edit
              </button>
              <button class="oh-action-btn danger oh-dept-del-btn" data-id="${dept.id}" style="margin-left:auto;">
                <svg viewBox="0 0 12 12" fill="none"><path d="M2 3h8M5 3V2h2v1M4.5 5v4M7.5 5v4M3 3l.7 7h4.6L9 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Delete
              </button>
            </div>
          </div>`;
      });
      html += `</div>`;
    }

    wrap.innerHTML = html;

    wrap.querySelectorAll('.oh-dept-edit-btn').forEach(btn =>
      btn.addEventListener('click', () => openOhDeptModal(Number(btn.dataset.id))));
    wrap.querySelectorAll('.oh-dept-del-btn').forEach(btn =>
      btn.addEventListener('click', () => deleteOhDept(Number(btn.dataset.id))));
    wrap.querySelectorAll('.oh-dept-detail-btn').forEach(btn =>
      btn.addEventListener('click', () => openOhDeptDetail(Number(btn.dataset.id))));
    wrap.querySelectorAll('.oh-dept-overflow').forEach(el =>
      el.addEventListener('click', () => openOhDeptDetail(Number(el.dataset.deptDetail))));
  }


  // ════════════════════════════════════
  //  EMPLOYEES VIEW
  // ════════════════════════════════════
  function renderOhEmpView() {
    const wrap = document.getElementById('ohEmpViewInner');
    if (!wrap) return;

    let filtered = ohEmployees.filter(emp => {
      if (_ohEmpDeptFilter && emp.deptId !== Number(_ohEmpDeptFilter)) return false;
      if (_ohEmpSearch) {
        const q = _ohEmpSearch.toLowerCase();
        const hay = [emp.name, emp.code, emp.designation, emp.phone, emp.email].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const deptOptions = ohDepartments.map(d =>
      `<option value="${d.id}" ${String(d.id) === String(_ohEmpDeptFilter) ? 'selected' : ''}>${ohEsc(d.name)}</option>`
    ).join('');

    let html = `
      <div class="oh-emp-toolbar">
        <div class="oh-search-wrap">
          <svg viewBox="0 0 15 15" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="M10 10l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          <input id="ohEmpSearch" placeholder="Search by name, code, designation, phone&hellip;" value="${_ohEmpSearch.replace(/"/g,'&quot;')}">
        </div>
        <select class="oh-filter-sel" id="ohDeptFilter">
          <option value="">All Departments</option>
          ${deptOptions}
        </select>
      </div>
      <div class="oh-table-card">`;

    if (filtered.length === 0) {
      html += `
        <div class="oh-empty">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="18" r="10" fill="#dbeafe" stroke="#93c5fd" stroke-width="2"/>
            <path d="M8 48c0-10 9-18 20-18s20 8 20 18" stroke="#93c5fd" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <div class="oh-empty-title">${ohEmployees.length ? 'No employees match your filter' : 'No employees yet'}</div>
          <div class="oh-empty-desc">${ohEmployees.length ? 'Try adjusting your search or department filter.' : 'Add your first employee using the button above.'}</div>
        </div>`;
    } else {
      html += `
        <table class="oh-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Code</th>
              <th>Name &amp; Designation</th>
              <th>Department</th>
              <th>Phone</th>
              <th>Joining Date</th>
              <th>Salary</th>
              <th style="text-align:center;width:100px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((emp, i) => {
              const dept   = emp.deptId ? ohGetDeptById(emp.deptId) : null;
              const isHead = dept && dept.headEmpId === emp.id;
              return `
                <tr data-emp-id="${emp.id}">
                  <td style="color:var(--slate-400);font-size:12px;font-weight:600;">${i+1}</td>
                  <td><span class="oh-emp-code">${ohEsc(emp.code)}</span></td>
                  <td>
                    <div class="oh-emp-name">${ohEsc(emp.name)}</div>
                    ${emp.designation ? `<div style="font-size:11.5px;color:var(--slate-400);margin-top:2px;">${ohEsc(emp.designation)}</div>` : ''}
                  </td>
                  <td>${dept ? `<span class="oh-dept-chip">${ohEsc(dept.name)}${isHead ? ' \uD83D\uDC51' : ''}</span>` : `<span class="oh-no-dept-chip">Unassigned</span>`}</td>
                  <td style="white-space:nowrap;">${ohEsc(emp.phone || '\u2014')}</td>
                  <td style="white-space:nowrap;">${ohEsc(emp.joiningDate || '\u2014')}</td>
                  <td style="font-weight:600;">${ohFmtSalary(emp.salary)}</td>
                  <td style="text-align:center;white-space:nowrap;">
                    <button class="oh-action-btn primary oh-emp-edit-btn" data-id="${emp.id}" title="Edit">Edit</button>
                    <button class="oh-action-btn danger oh-emp-del-btn" data-id="${emp.id}" title="Delete" style="margin-left:4px;">
                      <svg viewBox="0 0 12 12" fill="none"><path d="M2 3h8M5 3V2h2v1M4.5 5v4M7.5 5v4M3 3l.7 7h4.6L9 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>`;
    }

    html += `</div>`;
    wrap.innerHTML = html;

    const srch = document.getElementById('ohEmpSearch');
    if (srch) srch.addEventListener('input', e => { _ohEmpSearch = e.target.value; renderOhEmpView(); });
    const deptF = document.getElementById('ohDeptFilter');
    if (deptF) deptF.addEventListener('change', e => { _ohEmpDeptFilter = e.target.value; renderOhEmpView(); });

    wrap.querySelectorAll('.oh-emp-edit-btn').forEach(btn =>
      btn.addEventListener('click', () => openOhEmpModal(Number(btn.dataset.id))));
    wrap.querySelectorAll('.oh-emp-del-btn').forEach(btn =>
      btn.addEventListener('click', () => deleteOhEmp(Number(btn.dataset.id))));
  }


  // ════════════════════════════════════
  //  DEPARTMENT MODAL  (Add / Edit)
  // ════════════════════════════════════
  let _ohDeptModalEditId = null;

  function openOhDeptModal(editId) {
    _ohDeptModalEditId = editId || null;
    const dept = editId ? ohGetDeptById(editId) : null;

    const empOptions = ohEmployees.map(e =>
      `<option value="${e.id}" ${dept && dept.headEmpId === e.id ? 'selected' : ''}>${ohEsc(e.name)}${e.designation ? ' \u2013 ' + ohEsc(e.designation) : ''}</option>`
    ).join('');

    const overlay = document.createElement('div');
    overlay.className = 'oh-modal-overlay';
    overlay.id = 'ohDeptModal';
    overlay.innerHTML = `
      <div class="oh-modal-card" role="dialog" aria-modal="true">
        <div class="oh-modal-hdr">
          <div class="oh-modal-title">${dept ? 'Edit Department' : 'New Department'}</div>
          <button class="oh-modal-close" id="ohDeptModalClose" aria-label="Close">&times;</button>
        </div>
        <div class="oh-fg">
          <label class="oh-label" for="ohDeptName">Department Name <span class="req">*</span></label>
          <input class="oh-input" id="ohDeptName" type="text" placeholder="e.g. Engineering, Finance, HR&hellip;" value="${dept ? ohEsc(dept.name) : ''}" autocomplete="off">
        </div>
        <div class="oh-fg">
          <label class="oh-label" for="ohDeptHead">Department Head</label>
          <select class="oh-select" id="ohDeptHead">
            <option value="">&mdash; No head assigned &mdash;</option>
            ${empOptions}
          </select>
          ${ohEmployees.length === 0 ? '<div class="oh-input-hint">\u26A0 No employees available. Add employees first to assign a head.</div>' : ''}
        </div>
        <div class="oh-modal-btns">
          <button class="oh-btn-cancel" id="ohDeptCancelBtn">Cancel</button>
          <button class="oh-btn-save" id="ohDeptSaveBtn">${dept ? 'Save Changes' : 'Create Department'}</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    document.getElementById('ohDeptModalClose').addEventListener('click', closeOhDeptModal);
    document.getElementById('ohDeptCancelBtn').addEventListener('click', closeOhDeptModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeOhDeptModal(); });
    document.getElementById('ohDeptSaveBtn').addEventListener('click', saveOhDept);
    const nameInp = document.getElementById('ohDeptName');
    nameInp.focus();
    nameInp.addEventListener('keydown', e => { if (e.key === 'Enter') saveOhDept(); });
  }

  function closeOhDeptModal() {
    document.getElementById('ohDeptModal')?.remove();
    _ohDeptModalEditId = null;
  }

  function saveOhDept() {
    const nameInp = document.getElementById('ohDeptName');
    const headSel = document.getElementById('ohDeptHead');
    const name = nameInp.value.trim();

    if (!name) {
      nameInp.classList.add('error');
      nameInp.focus();
      setTimeout(() => nameInp.classList.remove('error'), 1500);
      return;
    }

    const dup = ohDepartments.find(d => d.name.toLowerCase() === name.toLowerCase() && d.id !== _ohDeptModalEditId);
    if (dup) {
      nameInp.classList.add('error');
      showToast(`Department "${name}" already exists.`, 'error');
      setTimeout(() => nameInp.classList.remove('error'), 1500);
      return;
    }

    const headId = headSel.value ? Number(headSel.value) : null;

    if (_ohDeptModalEditId) {
      const dept = ohGetDeptById(_ohDeptModalEditId);
      if (dept) { dept.name = name; dept.headEmpId = headId; }
      showToast('Department updated successfully.', 'success');
    } else {
      ohDepartments.push({ id: _ohDeptCtr++, name, headEmpId: headId });
      showToast(`Department "${name}" created.`, 'success');
    }

    closeOhDeptModal();
    updateOhBadges();
    renderOhDeptView();
    triggerAutoBackup();
  }

  function deleteOhDept(id) {
    const dept = ohGetDeptById(id);
    if (!dept) return;
    const empCount = ohGetDeptEmps(id).length;
    if (empCount > 0) {
      showToast(`Cannot delete "${dept.name}" \u2014 it has ${empCount} employee${empCount > 1 ? 's' : ''}. Transfer or remove them first.`, 'error');
      return;
    }
    showKyaConfirm({
      title: 'Delete Department?',
      message: `Permanently delete <strong>${ohEsc(dept.name)}</strong>?<br>This action cannot be undone.`,
      confirmLabel: '\u2715 Delete',
      iconBg: '#fee2e2', iconColor: '#dc2626',
      iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      okBg: '#dc2626',
      onConfirm: () => {
        ohDepartments = ohDepartments.filter(d => d.id !== id);
        showToast(`Department "${dept.name}" deleted.`, 'success');
        updateOhBadges();
        renderOhDeptView();
        triggerAutoBackup();
      }
    });
  }


  // ════════════════════════════════════
  //  EMPLOYEE MODAL  (Add / Edit)
  // ════════════════════════════════════
  let _ohEmpModalEditId = null;
  let _ohEmpCodeMode = 'auto';

  function openOhEmpModal(editId) {
    _ohEmpModalEditId = editId || null;
    const emp = editId ? ohGetEmpById(editId) : null;
    _ohEmpCodeMode = 'auto';

    const deptOptions = ohDepartments.map(d =>
      `<option value="${d.id}" ${emp && emp.deptId === d.id ? 'selected' : ''}>${ohEsc(d.name)}</option>`
    ).join('');

    const autoCode = emp ? emp.code : ohAutoCode();

    const overlay = document.createElement('div');
    overlay.className = 'oh-modal-overlay';
    overlay.id = 'ohEmpModal';
    overlay.innerHTML = `
      <div class="oh-modal-card" role="dialog" aria-modal="true">
        <div class="oh-modal-hdr">
          <div class="oh-modal-title">${emp ? 'Edit Employee' : 'New Employee'}</div>
          <button class="oh-modal-close" id="ohEmpModalClose" aria-label="Close">&times;</button>
        </div>

        <div class="oh-modal-section-title">Basic Information</div>

        <div class="oh-fg">
          <label class="oh-label">Employee Code <span class="req">*</span></label>
          <div class="oh-code-toggle">
            <button class="oh-code-mode-btn active" id="ohCodeAuto" type="button">Auto</button>
            <button class="oh-code-mode-btn" id="ohCodeManual" type="button">Manual</button>
          </div>
          <input class="oh-input" id="ohEmpCode" type="text" value="${ohEsc(autoCode)}" placeholder="Employee code" readonly style="background:var(--slate-50);color:var(--slate-400);">
          <div class="oh-input-hint" id="ohCodeHint">Code is auto-generated. Switch to Manual to customise.</div>
        </div>

        <div class="oh-fg-row">
          <div class="oh-fg">
            <label class="oh-label" for="ohEmpName">Full Name <span class="req">*</span></label>
            <input class="oh-input" id="ohEmpName" type="text" placeholder="e.g. Rahul Sharma" value="${ohEsc(emp?.name || '')}">
          </div>
          <div class="oh-fg">
            <label class="oh-label" for="ohEmpDesig">Designation</label>
            <input class="oh-input" id="ohEmpDesig" type="text" placeholder="e.g. Manager, Engineer&hellip;" value="${ohEsc(emp?.designation || '')}">
          </div>
        </div>

        <div class="oh-fg-row">
          <div class="oh-fg">
            <label class="oh-label" for="ohEmpDept">Department <span class="req">*</span></label>
            <select class="oh-select" id="ohEmpDept">
              <option value="">&mdash; Select Department &mdash;</option>
              ${deptOptions}
            </select>
            ${ohDepartments.length === 0 ? '<div class="oh-input-hint">\u26A0 No departments yet. Create one first.</div>' : ''}
          </div>
          <div class="oh-fg">
            <label class="oh-label" for="ohEmpJoining">Joining Date</label>
            <input class="oh-input" id="ohEmpJoining" type="date" value="${ohEsc(emp?.joiningDate || '')}">
          </div>
        </div>

        <div class="oh-fg">
          <label class="oh-label" for="ohEmpSalary">Salary (\u20B9)</label>
          <input class="oh-input" id="ohEmpSalary" type="number" min="0" step="0.01" placeholder="e.g. 50000" value="${emp?.salary ?? ''}">
        </div>

        <div class="oh-modal-section-title">Contact Details</div>

        <div class="oh-fg-row">
          <div class="oh-fg">
            <label class="oh-label" for="ohEmpPhone">Phone No.</label>
            <input class="oh-input" id="ohEmpPhone" type="tel" placeholder="+91 XXXXX XXXXX" value="${ohEsc(emp?.phone || '')}">
          </div>
          <div class="oh-fg">
            <label class="oh-label" for="ohEmpEmail">Email</label>
            <input class="oh-input" id="ohEmpEmail" type="email" placeholder="employee@company.com" value="${ohEsc(emp?.email || '')}">
          </div>
        </div>

        <div class="oh-fg">
          <label class="oh-label" for="ohEmpPan">PAN Number</label>
          <input class="oh-input" id="ohEmpPan" type="text" placeholder="ABCDE1234F" maxlength="10" style="text-transform:uppercase;" value="${ohEsc(emp?.pan || '')}">
        </div>

        <div class="oh-fg">
          <label class="oh-label" for="ohEmpAddress">Address</label>
          <input class="oh-input" id="ohEmpAddress" type="text" placeholder="Full address&hellip;" value="${ohEsc(emp?.address || '')}">
        </div>

        <div class="oh-modal-btns">
          <button class="oh-btn-cancel" id="ohEmpCancelBtn">Cancel</button>
          <button class="oh-btn-save" id="ohEmpSaveBtn">${emp ? 'Save Changes' : 'Add Employee'}</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    // Code mode toggle
    const codeInp  = document.getElementById('ohEmpCode');
    const codeHint = document.getElementById('ohCodeHint');
    const btnAuto  = document.getElementById('ohCodeAuto');
    const btnMan   = document.getElementById('ohCodeManual');

    btnAuto.addEventListener('click', () => {
      _ohEmpCodeMode = 'auto';
      btnAuto.classList.add('active'); btnMan.classList.remove('active');
      codeInp.value = emp ? emp.code : ohAutoCode();
      codeInp.readOnly = true;
      codeInp.style.background = 'var(--slate-50)'; codeInp.style.color = 'var(--slate-400)';
      codeHint.textContent = 'Code is auto-generated. Switch to Manual to customise.';
    });
    btnMan.addEventListener('click', () => {
      _ohEmpCodeMode = 'manual';
      btnMan.classList.add('active'); btnAuto.classList.remove('active');
      codeInp.readOnly = false;
      codeInp.style.background = ''; codeInp.style.color = '';
      codeHint.textContent = 'Enter a custom employee code.';
      codeInp.focus(); codeInp.select();
    });

    document.getElementById('ohEmpModalClose').addEventListener('click', closeOhEmpModal);
    document.getElementById('ohEmpCancelBtn').addEventListener('click', closeOhEmpModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeOhEmpModal(); });
    document.getElementById('ohEmpSaveBtn').addEventListener('click', saveOhEmp);
    document.getElementById('ohEmpName').focus();
  }

  function closeOhEmpModal() {
    document.getElementById('ohEmpModal')?.remove();
    _ohEmpModalEditId = null;
  }

  function saveOhEmp() {
    const nameInp  = document.getElementById('ohEmpName');
    const codeInp  = document.getElementById('ohEmpCode');
    const deptSel  = document.getElementById('ohEmpDept');
    const name     = nameInp.value.trim();
    const code     = codeInp.value.trim();
    const deptId   = deptSel.value ? Number(deptSel.value) : null;

    let err = false;
    if (!name)  { nameInp.classList.add('error'); err = true; }
    if (!code)  { codeInp.classList.add('error'); err = true; }
    if (!deptId) { deptSel.classList.add('error'); err = true; }
    if (err) {
      showToast('Please fill in all required fields (Name, Code, Department).', 'error');
      setTimeout(() => { nameInp.classList.remove('error'); codeInp.classList.remove('error'); deptSel.classList.remove('error'); }, 1500);
      return;
    }

    const dupCode = ohEmployees.find(e => e.code.trim().toLowerCase() === code.toLowerCase() && e.id !== _ohEmpModalEditId);
    if (dupCode) {
      codeInp.classList.add('error');
      showToast(`Employee code "${code}" is already in use.`, 'error');
      setTimeout(() => codeInp.classList.remove('error'), 1500);
      return;
    }

    const salary      = document.getElementById('ohEmpSalary').value;
    const pan         = document.getElementById('ohEmpPan').value.trim().toUpperCase();
    const phone       = document.getElementById('ohEmpPhone').value.trim();
    const email       = document.getElementById('ohEmpEmail').value.trim();
    const address     = document.getElementById('ohEmpAddress').value.trim();
    const joiningDate = document.getElementById('ohEmpJoining').value;
    const designation = document.getElementById('ohEmpDesig').value.trim();

    if (_ohEmpModalEditId) {
      const emp = ohGetEmpById(_ohEmpModalEditId);
      if (emp) {
        const oldDeptId = emp.deptId;
        // Transfer rule: auto-clear head of old dept if this employee was head
        if (oldDeptId && oldDeptId !== deptId) {
          const oldDept = ohGetDeptById(oldDeptId);
          if (oldDept && oldDept.headEmpId === emp.id) {
            oldDept.headEmpId = null;
            showToast(`${name} was transferred. Head of "${oldDept.name}" has been cleared automatically.`, 'success');
          }
        }
        emp.code = code; emp.name = name; emp.designation = designation;
        emp.deptId = deptId; emp.joiningDate = joiningDate;
        emp.salary = salary !== '' ? Number(salary) : null;
        emp.pan = pan; emp.phone = phone; emp.email = email; emp.address = address;
      }
      showToast('Employee updated successfully.', 'success');
    } else {
      ohEmployees.push({
        id: _ohEmpCtr++, code, name, designation, deptId, joiningDate,
        salary: salary !== '' ? Number(salary) : null,
        pan, phone, email, address
      });
      showToast(`Employee "${name}" added successfully.`, 'success');
    }

    closeOhEmpModal();
    updateOhBadges();
    if (_ohActiveTab === 'dept') renderOhDeptView();
    else if (_ohActiveTab === 'emp') renderOhEmpView();
    triggerAutoBackup();
  }

  function deleteOhEmp(id) {
    const emp = ohGetEmpById(id);
    if (!emp) return;
    showKyaConfirm({
      title: 'Delete Employee?',
      message: `Permanently delete <strong>${ohEsc(emp.name)}</strong> (${ohEsc(emp.code)})?<br>This cannot be undone.`,
      confirmLabel: '✕ Delete',
      iconBg: '#fee2e2', iconColor: '#dc2626',
      iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.8"/></svg>',
      okBg: '#dc2626',
      onConfirm: () => {
        // Clear dept head if this employee was head of any dept
        ohDepartments.forEach(d => { if (d.headEmpId === id) d.headEmpId = null; });
        ohEmployees = ohEmployees.filter(e => e.id !== id);
        showToast(`Employee "${emp.name}" deleted.`, 'success');
        updateOhBadges();
        if (_ohActiveTab === 'dept') renderOhDeptView();
        else if (_ohActiveTab === 'emp') renderOhEmpView();
        triggerAutoBackup();
      }
    });
  }


  // ════════════════════════════════════
  //  DEPARTMENT DETAIL OVERLAY
  // ════════════════════════════════════
  function openOhDeptDetail(id) {
    const dept = ohGetDeptById(id);
    if (!dept) return;
    const emps = ohGetDeptEmps(id);
    const head = dept.headEmpId ? ohGetEmpById(dept.headEmpId) : null;

    const overlay = document.createElement('div');
    overlay.className = 'oh-detail-overlay';
    overlay.id = 'ohDetailOverlay';
    overlay.innerHTML = `
      <div class="oh-detail-card" role="dialog" aria-modal="true">
        <div class="oh-detail-hdr-wrap">
          <div class="oh-detail-hdr">
            <div class="oh-detail-title">${ohEsc(dept.name)}</div>
            <div class="oh-detail-sub">
              ${head ? 'Head: ' + ohEsc(head.name) : 'No department head assigned'}
              &nbsp;&middot;&nbsp; ${emps.length} employee${emps.length !== 1 ? 's' : ''}
            </div>
          </div>
          <button class="oh-detail-close" id="ohDetailClose" aria-label="Close">&times;</button>
        </div>
        <div class="oh-detail-body">
          ${emps.length === 0 ? `
            <div class="oh-empty" style="padding:40px 16px;">
              <div class="oh-empty-title">No employees in this department</div>
              <div class="oh-empty-desc">Add employees and assign them to this department.</div>
            </div>` : emps.map(e => `
            <div class="oh-detail-emp-row">
              <div class="oh-detail-emp-avatar">${ohInitials(e.name)}</div>
              <div style="flex:1;min-width:0;">
                <div class="oh-detail-emp-name">${ohEsc(e.name)}</div>
                <div class="oh-detail-emp-meta">
                  <span class="oh-emp-code" style="font-size:10.5px;padding:2px 6px;">${ohEsc(e.code)}</span>
                  ${e.designation ? ' &middot; ' + ohEsc(e.designation) : ''}
                  ${e.phone ? ' &middot; ' + ohEsc(e.phone) : ''}
                </div>
              </div>
              ${dept.headEmpId === e.id ? '<span class="oh-detail-emp-is-head">👑 Head</span>' : ''}
            </div>`).join('')}
        </div>
      </div>`;

    document.body.appendChild(overlay);
    document.getElementById('ohDetailClose').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  }

  // ════════════════════════════════════
  //  BUDGET MANAGEMENT MODULE
  // ════════════════════════════════════
  let _ohBudgetSearch = '';
  let _ohBudgetDeptFilter = '';
  let _ohBudgetPeriodFilter = 'all';
  let _ohBudgetModalEditId = null;
  let _ohBudgetSelectedDepts = [];
  let _ohBudgetSelectedLedgers = [];

  function ohGetBudgetExpense(budget) {
    let ledgersToSum = [];
    const expenseLedgers = coaLedgers.filter(l => l.type === 'ledger' && getLedgerMainGroup(l) === 'expense');
    
    const ledgerIds = budget.ledgerIds !== undefined ? budget.ledgerIds : (budget.ledgerId !== undefined ? budget.ledgerId : 'all');

    if (ledgerIds === 'all') {
      ledgersToSum = expenseLedgers;
    } else {
      const ids = Array.isArray(ledgerIds) ? ledgerIds : [Number(ledgerIds)];
      ledgersToSum = expenseLedgers.filter(l => ids.includes(l.id));
    }
    if (ledgersToSum.length === 0) return 0;
    
    let total = 0;
    const fromDate = budget.fromDate;
    const toDate = budget.toDate;

    // Resolve budget's department scope
    const budgetDepts = budget.deptIds !== undefined ? budget.deptIds
                      : (budget.deptId  !== undefined ? budget.deptId  : 'all');
    
    postedEntries.forEach(entry => {
      // Only count Budget-flagged transactions
      if (entry.isBudget !== true) return;

      // Date range filter
      if (fromDate && entry.date < fromDate) return;
      if (toDate   && entry.date > toDate)   return;
      
      // Department scope filter
      if (budgetDepts !== 'all') {
        const deptIds = Array.isArray(budgetDepts) ? budgetDepts : [Number(budgetDepts)];
        const entryDept = entry.departmentId !== undefined ? entry.departmentId : 'all';
        // 'all' entries match any department budget; specific entries must match
        if (entryDept !== 'all' && !deptIds.includes(Number(entryDept))) return;
      }
      
      (entry.allRows || []).forEach(row => {
        const particular = row.particular.trim();
        const matchingLdg = ledgersToSum.find(l => l.name.trim() === particular);
        if (!matchingLdg) return;
        
        const mainGroup = getLedgerMainGroup(matchingLdg);
        const amtDr = parseAmt(row.debit);
        const amtCr = parseAmt(row.credit);
        
        if (mainGroup === 'expense' || mainGroup === 'assets') {
          total += (amtDr - amtCr);
        } else {
          total += (amtCr - amtDr);
        }
      });
    });
    return total;
  }

  function ohFmtAmt(v) {
    if (v === null || v === undefined || v === '') return '₹ 0.00';
    return '₹\u202F' + Number(v).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2});
  }

  function renderOhBudgetView() {
    const wrap = document.getElementById('oh-budget-view');
    if (!wrap) return;

    if (ohDepartments.length === 0) {
      wrap.innerHTML = `
        <div class="oh-empty" style="padding: 80px 24px;">
          <div class="oh-empty-icon-ring" style="background:#fee2e2; color:#ef4444; margin:0 auto 26px;">
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div class="oh-empty-title">No Departments Available</div>
          <div class="oh-empty-desc">You need at least one department before you can configure a budget.</div>
          <button class="oh-action-btn primary" style="margin-top: 16px; height: 36px; padding: 0 16px; border-radius: 8px;" onclick="switchOhTab('dept')">
            Go to Departments
          </button>
        </div>
      `;
      return;
    }

    const ledgers = coaLedgers.filter(l => l.type === 'ledger' && getLedgerMainGroup(l) === 'expense');
    if (ledgers.length === 0) {
      wrap.innerHTML = `
        <div class="oh-empty" style="padding: 80px 24px;">
          <div class="oh-empty-icon-ring" style="background:#fee2e2; color:#ef4444; margin:0 auto 26px;">
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div class="oh-empty-title">No Expense Ledger Accounts Available</div>
          <div class="oh-empty-desc">You need at least one ledger account under the Expense subgroup in your Chart of Accounts before you can configure a budget.</div>
          <button class="oh-action-btn primary" style="margin-top: 16px; height: 36px; padding: 0 16px; border-radius: 8px;" onclick="openTab('chart'); return false;">
            Go to Chart of Accounts
          </button>
        </div>
      `;
      return;
    }

    if (ohBudgets.length === 0) {
      wrap.innerHTML = `
        <div class="oh-empty" style="padding: 80px 24px;">
          <div class="oh-empty-icon-ring" style="background:var(--blue-50); color:var(--blue-600); margin:0 auto 26px;">
            <svg width="38" height="38" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="4" width="16" height="13" rx="2" stroke="currentColor" stroke-width="1.4"/>
              <path d="M7 10h6M7 13h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
              <path d="M10 4V2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="oh-empty-title">No Budgets Set Yet</div>
          <div class="oh-empty-desc">Define a department budget limit to track costs against actual transactions.</div>
          <button class="oh-action-btn primary" style="margin-top: 16px; height: 36px; padding: 0 16px; border-radius: 8px;" onclick="openOhBudgetModal()">
            ＋ Add Budget
          </button>
        </div>
      `;
      return;
    }

    // Resolve current date safely in local timezone
    const now = new Date();
    const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    // Compute period counts
    let cntOngoing = 0;
    let cntUpcoming = 0;
    let cntExpired = 0;
    ohBudgets.forEach(b => {
      if (b.fromDate <= todayStr && b.toDate >= todayStr) {
        cntOngoing++;
      } else if (b.fromDate > todayStr) {
        cntUpcoming++;
      } else if (b.toDate < todayStr) {
        cntExpired++;
      }
    });

    // Filter budgets
    const budgetsToRender = ohBudgets.filter(b => {
      // Period filter
      if (_ohBudgetPeriodFilter === 'ongoing') {
        if (!(b.fromDate <= todayStr && b.toDate >= todayStr)) return false;
      } else if (_ohBudgetPeriodFilter === 'upcoming') {
        if (!(b.fromDate > todayStr)) return false;
      } else if (_ohBudgetPeriodFilter === 'expired') {
        if (!(b.toDate < todayStr)) return false;
      }

      const deptIds = b.deptIds !== undefined ? b.deptIds : (b.deptId !== undefined ? b.deptId : 'all');
      const ledgerIds = b.ledgerIds !== undefined ? b.ledgerIds : (b.ledgerId !== undefined ? b.ledgerId : 'all');
      
      let deptNames = '';
      if (deptIds === 'all') {
        deptNames = 'all departments';
      } else {
        const ids = Array.isArray(deptIds) ? deptIds : [Number(deptIds)];
        deptNames = ids.map(id => {
          const d = ohGetDeptById(id);
          return d ? d.name.toLowerCase() : '';
        }).join(' ');
      }
      
      let ledgerNames = '';
      if (ledgerIds === 'all') {
        ledgerNames = 'all expenses';
      } else {
        const ids = Array.isArray(ledgerIds) ? ledgerIds : [Number(ledgerIds)];
        ledgerNames = ids.map(id => {
          const l = coaLedgers.find(x => x.id === id);
          return l ? l.name.toLowerCase() : '';
        }).join(' ');
      }
      
      const q = _ohBudgetSearch.trim().toLowerCase();
      if (q) {
        if (!deptNames.includes(q) && !ledgerNames.includes(q)) return false;
      }
      
      if (_ohBudgetDeptFilter) {
        if (deptIds !== 'all') {
          const ids = Array.isArray(deptIds) ? deptIds : [Number(deptIds)];
          if (!ids.includes(Number(_ohBudgetDeptFilter))) return false;
        }
      }
      
      return true;
    });

    // Compute sums
    let totBudget = 0;
    let totExpense = 0;
    ohBudgets.forEach(b => {
      if (b.isPaused) return;
      totBudget += Number(b.amount || 0);
      totExpense += ohGetBudgetExpense(b);
    });
    const totRemaining = totBudget - totExpense;

    let html = `
      <!-- Stats Row -->
      <div class="oh-stats-row">
        <div class="oh-stat">
          <div class="oh-stat-icon" style="background:#e0f2fe; color:#0284c7;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div class="oh-stat-label">Total Allocated Budget</div>
          <div class="oh-stat-value">${ohFmtAmt(totBudget)}</div>
          <div class="oh-stat-sub">${ohBudgets.filter(x => !x.isPaused).length} Active Budgets</div>
        </div>
        
        <div class="oh-stat">
          <div class="oh-stat-icon" style="background:#fee2e2; color:#dc2626;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <div class="oh-stat-label">Total Actual Spent</div>
          <div class="oh-stat-value">${ohFmtAmt(totExpense)}</div>
          <div class="oh-stat-sub">Based on Posted Vouchers</div>
        </div>

        <div class="oh-stat">
          <div class="oh-stat-icon" style="background:${totRemaining >= 0 ? '#dcfce7' : '#fee2e2'}; color:${totRemaining >= 0 ? '#15803d' : '#dc2626'};">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div class="oh-stat-label">${totRemaining >= 0 ? 'Remaining Balance' : 'Budget Deficit'}</div>
          <div class="oh-stat-value" style="color:${totRemaining >= 0 ? 'inherit' : '#dc2626'}">${ohFmtAmt(Math.abs(totRemaining))}</div>
          <div class="oh-stat-sub">${totBudget > 0 ? ((totExpense / totBudget) * 100).toFixed(0) + '% spent' : '0% spent'}</div>
        </div>
      </div>

      <!-- Period Status Filter Tabs -->
      <div class="oh-budget-period-filter" role="tablist" aria-label="Budget period filters">
        <button class="oh-period-tab ${_ohBudgetPeriodFilter === 'all' ? 'active' : ''}" data-period="all" role="tab" aria-selected="${_ohBudgetPeriodFilter === 'all'}">
          All <span class="badge" style="margin-left: 4px; padding: 2px 6px; font-size: 10px; border-radius: 10px; background: ${_ohBudgetPeriodFilter === 'all' ? 'var(--blue-100)' : 'var(--slate-200)'}; color: ${_ohBudgetPeriodFilter === 'all' ? 'var(--blue-700)' : 'var(--slate-600)'}; font-weight: 700;">${ohBudgets.length}</span>
        </button>
        <button class="oh-period-tab ${_ohBudgetPeriodFilter === 'ongoing' ? 'active' : ''}" data-period="ongoing" role="tab" aria-selected="${_ohBudgetPeriodFilter === 'ongoing'}">
          Ongoing <span class="badge" style="margin-left: 4px; padding: 2px 6px; font-size: 10px; border-radius: 10px; background: ${_ohBudgetPeriodFilter === 'ongoing' ? 'var(--blue-100)' : 'var(--slate-200)'}; color: ${_ohBudgetPeriodFilter === 'ongoing' ? 'var(--blue-700)' : 'var(--slate-600)'}; font-weight: 700;">${cntOngoing}</span>
        </button>
        <button class="oh-period-tab ${_ohBudgetPeriodFilter === 'upcoming' ? 'active' : ''}" data-period="upcoming" role="tab" aria-selected="${_ohBudgetPeriodFilter === 'upcoming'}">
          Upcoming <span class="badge" style="margin-left: 4px; padding: 2px 6px; font-size: 10px; border-radius: 10px; background: ${_ohBudgetPeriodFilter === 'upcoming' ? 'var(--blue-100)' : 'var(--slate-200)'}; color: ${_ohBudgetPeriodFilter === 'upcoming' ? 'var(--blue-700)' : 'var(--slate-600)'}; font-weight: 700;">${cntUpcoming}</span>
        </button>
        <button class="oh-period-tab ${_ohBudgetPeriodFilter === 'expired' ? 'active' : ''}" data-period="expired" role="tab" aria-selected="${_ohBudgetPeriodFilter === 'expired'}">
          Expired <span class="badge" style="margin-left: 4px; padding: 2px 6px; font-size: 10px; border-radius: 10px; background: ${_ohBudgetPeriodFilter === 'expired' ? 'var(--blue-100)' : 'var(--slate-200)'}; color: ${_ohBudgetPeriodFilter === 'expired' ? 'var(--blue-700)' : 'var(--slate-600)'}; font-weight: 700;">${cntExpired}</span>
        </button>
      </div>

      <!-- Toolbar -->
      <div class="oh-emp-toolbar">
        <div class="oh-search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input id="ohBudgetSearch" placeholder="Search by department or ledger..." value="${_ohBudgetSearch.replace(/"/g,'&quot;')}">
        </div>
        
        <select class="oh-filter-sel" id="ohBudgetDeptFilter">
          <option value="">-- All Departments --</option>
          ${ohDepartments.map(d => `<option value="${d.id}" ${String(d.id) === String(_ohBudgetDeptFilter) ? 'selected' : ''}>${ohEsc(d.name)}</option>`).join('')}
        </select>
      </div>

      <!-- Data Table Card -->
      <div class="oh-table-card">
        <table class="oh-table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Department</th>
              <th>Ledger Account</th>
              <th style="text-align:right;">Budget Limit</th>
              <th style="text-align:right;">Actual Spent</th>
              <th style="text-align:right;">Remaining</th>
              <th style="width:160px;">Utilization</th>
              <th>Status</th>
              <th style="text-align:right; width:120px;">Actions</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (budgetsToRender.length === 0) {
      html += `
        <tr>
          <td colspan="9" class="oh-empty" style="padding:40px 16px;">
            <div class="oh-empty-title">No matching budgets found</div>
            <div class="oh-empty-desc">Adjust your search query or department filter.</div>
          </td>
        </tr>
      `;
    } else {
      budgetsToRender.forEach(b => {
        const deptIds = b.deptIds !== undefined ? b.deptIds : (b.deptId !== undefined ? b.deptId : 'all');
        const ledgerIds = b.ledgerIds !== undefined ? b.ledgerIds : (b.ledgerId !== undefined ? b.ledgerId : 'all');
        
        let deptHtml = '';
        if (deptIds === 'all') {
          deptHtml = '<span class="oh-dept-chip">All Departments</span>';
        } else {
          const ids = Array.isArray(deptIds) ? deptIds : [Number(deptIds)];
          deptHtml = ids.map(id => {
            const d = ohGetDeptById(id);
            return d ? `<span class="oh-dept-chip">${ohEsc(d.name)}</span>` : '';
          }).filter(Boolean).join(' ');
          if (!deptHtml) deptHtml = '<span class="oh-no-dept-chip">Unassigned</span>';
        }
        
        let ledgerText = '';
        if (ledgerIds === 'all') {
          ledgerText = 'All Expenses';
        } else {
          const ids = Array.isArray(ledgerIds) ? ledgerIds : [Number(ledgerIds)];
          const names = ids.map(id => {
            const l = coaLedgers.find(x => x.id === id);
            return l ? ohEsc(l.name) : '';
          }).filter(Boolean);
          ledgerText = names.join(', ');
          if (!ledgerText) ledgerText = 'Unknown Ledger';
        }
        
        const expVal = ohGetBudgetExpense(b);
        const limitVal = Number(b.amount || 0);
        const remainVal = limitVal - expVal;
        
        const pct = limitVal > 0 ? Math.min((expVal / limitVal) * 100, 100) : 0;
        const realPct = limitVal > 0 ? (expVal / limitVal) * 100 : 0;
        
        let barColor = '#10b981'; // Green
        let statusBadge = '<span class="oh-budget-status-badge safe">✓ Safe</span>';
        
        if (b.isPaused) {
          barColor = '#94a3b8'; // Grey
          statusBadge = '<span class="oh-budget-status-badge paused">⏸ Paused</span>';
        } else if (realPct >= 100) {
          barColor = '#ef4444'; // Red
          statusBadge = '<span class="oh-budget-status-badge danger">⚠ Exceeded</span>';
        } else if (realPct >= 85) {
          barColor = '#f59e0b'; // Orange
          statusBadge = '<span class="oh-budget-status-badge warn">⚠ Warning</span>';
        }

        html += `
          <tr class="${b.isPaused ? 'oh-budget-row-paused' : ''}" data-bid="${b.id}" style="cursor:pointer;" title="Click to view transactions">
            <td style="white-space:nowrap; font-weight:500;">
              ${b.fromDate} &rarr; ${b.toDate}
            </td>
            <td>
              <div style="display:flex; flex-wrap:wrap; gap:4px;">${deptHtml}</div>
            </td>
            <td style="font-weight:600; color:var(--slate-800); max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${ledgerText}">
              ${ledgerText}
            </td>
            <td style="text-align:right; font-weight:600; font-variant-numeric: tabular-nums;">
              ${ohFmtAmt(limitVal)}
            </td>
            <td style="text-align:right; font-variant-numeric: tabular-nums;">
              ${ohFmtAmt(expVal)}
            </td>
            <td style="text-align:right; font-variant-numeric: tabular-nums; white-space:nowrap;" class="oh-budget-variance ${remainVal >= 0 ? 'positive' : 'negative'}">
              ${remainVal >= 0 ? '+' : ''}${ohFmtAmt(remainVal)}
            </td>
            <td style="text-align:center; font-variant-numeric: tabular-nums; font-weight:600; color:${barColor}; font-size:13px;">
              ${b.isPaused ? '—' : realPct.toFixed(0) + '%'}
            </td>
            <td>
              ${statusBadge}
            </td>
            <td style="text-align:right; white-space:nowrap;">
              <button class="oh-action-btn ${b.isPaused ? 'primary' : 'warn'} oh-budget-pause-btn" data-id="${b.id}" title="${b.isPaused ? 'Resume Budget' : 'Pause Budget'}" style="margin-right:4px;">
                ${b.isPaused ? `
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px; height:12px;">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                ` : `
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px; height:12px;">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                  </svg>
                `}
              </button>
              <button class="oh-action-btn oh-budget-edit-btn" data-id="${b.id}" title="Edit Budget">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M11 2l3 3M3 10v3h3l8.5-8.5-3-3L3 10z" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              <button class="oh-action-btn danger oh-budget-del-btn" data-id="${b.id}" title="Delete Budget" style="margin-left:4px;">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M2 4h12M4 4v9a2 2 0 002 2h4a2 2 0 002-2V4M6 7v5M10 7v5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </td>
          </tr>
        `;
      });
    }

    html += `
          </tbody>
        </table>
      </div>
    `;

    wrap.innerHTML = html;

    // Attach listeners
    const searchInp = document.getElementById('ohBudgetSearch');
    if (searchInp) {
      searchInp.addEventListener('input', e => {
        _ohBudgetSearch = e.target.value;
        renderOhBudgetView();
      });
    }
    const filterDept = document.getElementById('ohBudgetDeptFilter');
    if (filterDept) {
      filterDept.addEventListener('change', e => {
        _ohBudgetDeptFilter = e.target.value;
        renderOhBudgetView();
      });
    }

    wrap.querySelectorAll('.oh-budget-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openOhBudgetModal(Number(btn.dataset.id)));
    });
    wrap.querySelectorAll('.oh-budget-del-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteOhBudget(Number(btn.dataset.id)));
    });
    wrap.querySelectorAll('.oh-budget-pause-btn').forEach(btn => {
      btn.addEventListener('click', () => toggleOhBudgetPause(Number(btn.dataset.id)));
    });

    wrap.querySelectorAll('.oh-period-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        _ohBudgetPeriodFilter = btn.dataset.period;
        renderOhBudgetView();
      });
    });

    // Row click → show transactions
    wrap.querySelectorAll('tr[data-bid]').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('button')) return; // ignore action btn clicks
        showBudgetTransactions(Number(row.dataset.bid));
      });
    });
  }

  function showBudgetTransactions(budgetId) {
    const b = ohBudgets.find(x => x.id === budgetId);
    if (!b) return;

    const ledgerIds = b.ledgerIds !== undefined ? b.ledgerIds : (b.ledgerId !== undefined ? b.ledgerId : 'all');
    const deptIds   = b.deptIds   !== undefined ? b.deptIds   : (b.deptId   !== undefined ? b.deptId   : 'all');
    const expenseLedgers = coaLedgers.filter(l => l.type === 'ledger' && getLedgerMainGroup(l) === 'expense');

    let ledgersToSum;
    if (ledgerIds === 'all') {
      ledgersToSum = expenseLedgers;
    } else {
      const ids = Array.isArray(ledgerIds) ? ledgerIds : [Number(ledgerIds)];
      ledgersToSum = expenseLedgers.filter(l => ids.includes(l.id));
    }
    const ledgerNames = ledgersToSum.map(l => l.name.trim());

    // Collect matching transactions
    const rows = [];
    postedEntries.forEach(entry => {
      if (entry.isBudget !== true) return;
      if (b.fromDate && entry.date < b.fromDate) return;
      if (b.toDate   && entry.date > b.toDate)   return;
      if (deptIds !== 'all') {
        const ids = Array.isArray(deptIds) ? deptIds : [Number(deptIds)];
        const ed  = entry.departmentId !== undefined ? entry.departmentId : 'all';
        if (ed !== 'all' && !ids.includes(Number(ed))) return;
      }
      (entry.allRows || []).forEach(row => {
        if (!ledgerNames.includes(row.particular.trim())) return;
        const dr = parseAmt(row.debit);
        const cr = parseAmt(row.credit);
        if (dr > 0 || cr > 0) {
          rows.push({
            date:       entry.date,
            particular: row.particular.trim(),
            voucherNo:  entry.voucherNo || '—',
            entryId:    entry.id,
            debit:      dr,
            credit:     cr
          });
        }
      });
    });
    rows.sort((a, b) => a.date.localeCompare(b.date));

    // Ledger label for title
    const ledgerLabel = ledgerIds === 'all' ? 'All Expenses'
      : ledgersToSum.map(l => l.name).join(', ');

    // Build modal
    document.getElementById('budgetTxOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'budgetTxOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:20px;';

    let bodyHtml = '';
    if (rows.length === 0) {
      bodyHtml = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--slate-400);">No budget transactions found for this period.</td></tr>`;
    } else {
      let totDr = 0, totCr = 0;
      rows.forEach(r => { totDr += r.debit; totCr += r.credit; });
      bodyHtml = rows.map(r => `
        <tr style="border-bottom:1px solid var(--slate-100); cursor:pointer;" onclick="viewVoucherFromStatement(${r.entryId})" title="Click to view voucher">
          <td style="padding:10px 14px;white-space:nowrap;color:var(--slate-500);font-size:13px;">${r.date}</td>
          <td style="padding:10px 14px;font-weight:500;">${ohEsc(r.particular)}</td>
          <td style="padding:10px 14px;"><span class="pt-vbadge">${ohEsc(r.voucherNo)}</span></td>
          <td style="padding:10px 14px;text-align:right;font-weight:600;color:var(--blue-700);font-variant-numeric:tabular-nums;">${r.debit  ? '₹\u202F' + r.debit.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—'}</td>
          <td style="padding:10px 14px;text-align:right;font-weight:600;color:var(--red-600);font-variant-numeric:tabular-nums;">${r.credit ? '₹\u202F' + r.credit.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—'}</td>
        </tr>
      `).join('');
      bodyHtml += `
        <tr style="background:var(--slate-50);font-weight:700;border-top:2px solid var(--slate-200);">
          <td colspan="3" style="padding:10px 14px;">Total</td>
          <td style="padding:10px 14px;text-align:right;color:var(--blue-700);font-variant-numeric:tabular-nums;">${totDr ? '₹\u202F' + totDr.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—'}</td>
          <td style="padding:10px 14px;text-align:right;color:var(--red-600);font-variant-numeric:tabular-nums;">${totCr ? '₹\u202F' + totCr.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—'}</td>
        </tr>
      `;
    }

    overlay.innerHTML = `
      <div style="background:#fff;border-radius:18px;box-shadow:0 24px 64px rgba(0,0,0,.18);width:100%;max-width:820px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;">
        <!-- Header -->
        <div style="background:linear-gradient(90deg,#2563eb,#3b82f6);padding:20px 24px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
          <div>
            <div style="color:#fff;font-size:17px;font-weight:700;">Budget Transactions</div>
            <div style="color:rgba(255,255,255,.75);font-size:12.5px;margin-top:3px;">${ohEsc(ledgerLabel)} &nbsp;·&nbsp; ${b.fromDate} → ${b.toDate}</div>
          </div>
          <button id="budgetTxClose" style="background:rgba(255,255,255,.15);border:none;border-radius:8px;width:32px;height:32px;cursor:pointer;color:#fff;font-size:18px;display:flex;align-items:center;justify-content:center;">✕</button>
        </div>
        <!-- Table -->
        <div style="overflow-y:auto;flex:1;">
          <table style="width:100%;border-collapse:collapse;font-family:Inter,sans-serif;font-size:13.5px;">
            <thead>
              <tr style="background:var(--slate-50);border-bottom:2px solid var(--slate-200);">
                <th style="padding:10px 14px;text-align:left;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--slate-500);white-space:nowrap;">Date</th>
                <th style="padding:10px 14px;text-align:left;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--slate-500);">Particular</th>
                <th style="padding:10px 14px;text-align:left;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--slate-500);">Voucher No</th>
                <th style="padding:10px 14px;text-align:right;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--slate-500);">Debit</th>
                <th style="padding:10px 14px;text-align:right;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--slate-500);">Credit</th>
              </tr>
            </thead>
            <tbody>${bodyHtml}</tbody>
          </table>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector('#budgetTxClose').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  }

  let _activeDropdownType = null;
  let _multiselectSearchQueries = { dept: '', ledger: '' };

  function updateOhMultiselectBtnText(type) {
    const btnText = document.getElementById(`ohBudget${type === 'dept' ? 'Dept' : 'Ledger'}BtnText`);
    if (!btnText) return;
    
    if (type === 'dept') {
      if (_ohBudgetSelectedDepts === 'all') {
        btnText.textContent = 'All Departments';
      } else if (_ohBudgetSelectedDepts.length === 0) {
        btnText.textContent = '-- Select Departments --';
      } else if (_ohBudgetSelectedDepts.length === ohDepartments.length) {
        btnText.textContent = 'All Departments';
      } else {
        const names = _ohBudgetSelectedDepts.map(id => {
          const d = ohGetDeptById(id);
          return d ? d.name : '';
        }).filter(Boolean);
        btnText.textContent = names.join(', ');
      }
    } else {
      if (_ohBudgetSelectedLedgers === 'all') {
        btnText.textContent = 'All Expenses';
      } else if (_ohBudgetSelectedLedgers.length === 0) {
        btnText.textContent = '-- Select Ledgers --';
      } else {
        const expenseLedgers = coaLedgers.filter(l => l.type === 'ledger' && getLedgerMainGroup(l) === 'expense');
        if (_ohBudgetSelectedLedgers.length === expenseLedgers.length) {
          btnText.textContent = 'All Expenses';
        } else {
          const names = _ohBudgetSelectedLedgers.map(id => {
            const l = coaLedgers.find(x => x.id === id);
            return l ? l.name : '';
          }).filter(Boolean);
          btnText.textContent = names.join(', ');
        }
      }
    }
  }

  function renderOhMultiselectDropdown(type) {
    const wrap = document.getElementById(`ohBudget${type === 'dept' ? 'Dept' : 'Ledger'}Wrap`);
    if (!wrap) return;

    wrap.querySelector('.oh-multiselect-dropdown')?.remove();
    wrap.classList.remove('open');

    if (_activeDropdownType !== type) {
      if (_activeDropdownType) {
        const otherWrap = document.getElementById(`ohBudget${_activeDropdownType === 'dept' ? 'Dept' : 'Ledger'}Wrap`);
        otherWrap?.querySelector('.oh-multiselect-dropdown')?.remove();
        otherWrap?.classList.remove('open');
      }
      _activeDropdownType = type;
      wrap.classList.add('open');
    } else {
      _activeDropdownType = null;
      return;
    }

    const dropdown = document.createElement('div');
    dropdown.className = 'oh-multiselect-dropdown';

    const searchBox = document.createElement('div');
    searchBox.className = 'oh-multiselect-search-box';
    const searchInp = document.createElement('input');
    searchInp.type = 'text';
    searchInp.className = 'oh-multiselect-search-input';
    searchInp.placeholder = `Search ${type === 'dept' ? 'departments' : 'ledgers'}...`;
    searchInp.value = _multiselectSearchQueries[type];
    searchBox.appendChild(searchInp);
    dropdown.appendChild(searchBox);

    const optionsList = document.createElement('div');
    optionsList.className = 'oh-multiselect-options-list';
    dropdown.appendChild(optionsList);

    wrap.appendChild(dropdown);
    searchInp.focus();

    dropdown.addEventListener('click', e => {
      e.stopPropagation();
    });

    searchInp.addEventListener('input', e => {
      _multiselectSearchQueries[type] = e.target.value;
      populateOptions();
    });

    function populateOptions() {
      optionsList.innerHTML = '';
      const query = _multiselectSearchQueries[type].trim().toLowerCase();

      if (type === 'dept') {
        const isAllChecked = _ohBudgetSelectedDepts === 'all';
        
        if (!query || 'all departments'.includes(query)) {
          const allOpt = document.createElement('label');
          allOpt.className = 'oh-multiselect-option all-opt';
          allOpt.innerHTML = `<input type="checkbox" id="ohMultiselectAllDepts" ${isAllChecked ? 'checked' : ''}> All Departments`;
          optionsList.appendChild(allOpt);

          allOpt.querySelector('input').addEventListener('change', e => {
            if (e.target.checked) {
              _ohBudgetSelectedDepts = 'all';
            } else {
              _ohBudgetSelectedDepts = [];
            }
            populateOptions();
            updateOhMultiselectBtnText('dept');
          });
        }

        ohDepartments.forEach(d => {
          if (query && !d.name.toLowerCase().includes(query)) return;

          const isChecked = isAllChecked || (Array.isArray(_ohBudgetSelectedDepts) && _ohBudgetSelectedDepts.includes(d.id));
          const opt = document.createElement('label');
          opt.className = 'oh-multiselect-option';
          opt.innerHTML = `<input type="checkbox" data-id="${d.id}" ${isChecked ? 'checked' : ''}> ${ohEsc(d.name)}`;
          optionsList.appendChild(opt);

          opt.querySelector('input').addEventListener('change', e => {
            if (_ohBudgetSelectedDepts === 'all') {
              _ohBudgetSelectedDepts = ohDepartments.map(x => x.id).filter(id => id !== d.id);
            } else {
              if (!Array.isArray(_ohBudgetSelectedDepts)) _ohBudgetSelectedDepts = [];
              if (e.target.checked) {
                if (!_ohBudgetSelectedDepts.includes(d.id)) {
                  _ohBudgetSelectedDepts.push(d.id);
                }
              } else {
                _ohBudgetSelectedDepts = _ohBudgetSelectedDepts.filter(id => id !== d.id);
              }
            }

            if (Array.isArray(_ohBudgetSelectedDepts) && _ohBudgetSelectedDepts.length === ohDepartments.length) {
              _ohBudgetSelectedDepts = 'all';
            }

            populateOptions();
            updateOhMultiselectBtnText('dept');
          });
        });

      } else {
        const expenseLedgers = coaLedgers.filter(l => l.type === 'ledger' && getLedgerMainGroup(l) === 'expense');
        const isAllChecked = _ohBudgetSelectedLedgers === 'all';

        if (!query || 'all expenses'.includes(query)) {
          const allOpt = document.createElement('label');
          allOpt.className = 'oh-multiselect-option all-opt';
          allOpt.innerHTML = `<input type="checkbox" id="ohMultiselectAllLedgers" ${isAllChecked ? 'checked' : ''}> All Expenses`;
          optionsList.appendChild(allOpt);

          allOpt.querySelector('input').addEventListener('change', e => {
            if (e.target.checked) {
              _ohBudgetSelectedLedgers = 'all';
            } else {
              _ohBudgetSelectedLedgers = [];
            }
            populateOptions();
            updateOhMultiselectBtnText('ledger');
          });
        }

        expenseLedgers.forEach(l => {
          if (query && !l.name.toLowerCase().includes(query)) return;

          const isChecked = isAllChecked || (Array.isArray(_ohBudgetSelectedLedgers) && _ohBudgetSelectedLedgers.includes(l.id));
          const opt = document.createElement('label');
          opt.className = 'oh-multiselect-option';
          opt.innerHTML = `<input type="checkbox" data-id="${l.id}" ${isChecked ? 'checked' : ''}> ${ohEsc(l.name)}`;
          optionsList.appendChild(opt);

          opt.querySelector('input').addEventListener('change', e => {
            if (_ohBudgetSelectedLedgers === 'all') {
              _ohBudgetSelectedLedgers = expenseLedgers.map(x => x.id).filter(id => id !== l.id);
            } else {
              if (!Array.isArray(_ohBudgetSelectedLedgers)) _ohBudgetSelectedLedgers = [];
              if (e.target.checked) {
                if (!_ohBudgetSelectedLedgers.includes(l.id)) {
                  _ohBudgetSelectedLedgers.push(l.id);
                }
              } else {
                _ohBudgetSelectedLedgers = _ohBudgetSelectedLedgers.filter(id => id !== l.id);
              }
            }

            if (Array.isArray(_ohBudgetSelectedLedgers) && _ohBudgetSelectedLedgers.length === expenseLedgers.length) {
              _ohBudgetSelectedLedgers = 'all';
            }

            populateOptions();
            updateOhMultiselectBtnText('ledger');
          });
        });
      }
    }

    populateOptions();
  }

  function openOhBudgetModal(editId) {
    _ohBudgetModalEditId = editId || null;
    const b = editId ? ohBudgets.find(x => x.id === editId) : null;
    
    if (b) {
      const dIds = b.deptIds !== undefined ? b.deptIds : (b.deptId !== undefined ? b.deptId : 'all');
      _ohBudgetSelectedDepts = dIds === 'all' ? 'all' : (Array.isArray(dIds) ? [...dIds] : [Number(dIds)]);
      
      const lIds = b.ledgerIds !== undefined ? b.ledgerIds : (b.ledgerId !== undefined ? b.ledgerId : 'all');
      _ohBudgetSelectedLedgers = lIds === 'all' ? 'all' : (Array.isArray(lIds) ? [...lIds] : [Number(lIds)]);
    } else {
      _ohBudgetSelectedDepts = [];
      _ohBudgetSelectedLedgers = [];
    }

    document.getElementById('ohBudgetModal')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'oh-modal-overlay';
    overlay.id = 'ohBudgetModal';

    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString().split('T')[0];
    const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0];

    const fromDateVal = b ? b.fromDate : firstDay;
    const toDateVal = b ? b.toDate : lastDay;

    overlay.innerHTML = `
      <div class="oh-modal-card" role="dialog" aria-modal="true">
        <div class="oh-modal-hdr">
          <div class="oh-modal-title">${b ? 'Edit Budget' : 'New Budget'}</div>
          <button class="oh-modal-close" id="ohBudgetModalClose" aria-label="Close">&times;</button>
        </div>
        <div class="oh-modal-body">
          <div class="oh-fg-row">
            <div class="oh-fg">
              <label class="oh-label" for="ohBudgetFromDate">From Date <span class="req">*</span></label>
              <input class="oh-input" id="ohBudgetFromDate" type="date" value="${fromDateVal}">
            </div>
            <div class="oh-fg">
              <label class="oh-label" for="ohBudgetToDate">To Date <span class="req">*</span></label>
              <input class="oh-input" id="ohBudgetToDate" type="date" value="${toDateVal}">
            </div>
          </div>
          
          <div class="oh-fg">
            <label class="oh-label">Department <span class="req">*</span></label>
            <div class="oh-multiselect-wrap" id="ohBudgetDeptWrap">
              <button class="oh-multiselect-btn" type="button" id="ohBudgetDeptBtn">
                <span class="oh-multiselect-btn-text" id="ohBudgetDeptBtnText">-- Select Departments --</span>
                <span class="oh-multiselect-chevron">▼</span>
              </button>
            </div>
          </div>
          
          <div class="oh-fg">
            <label class="oh-label">Ledger Account <span class="req">*</span></label>
            <div class="oh-multiselect-wrap" id="ohBudgetLedgerWrap">
              <button class="oh-multiselect-btn" type="button" id="ohBudgetLedgerBtn">
                <span class="oh-multiselect-btn-text" id="ohBudgetLedgerBtnText">-- Select Ledgers --</span>
                <span class="oh-multiselect-chevron">▼</span>
              </button>
            </div>
          </div>
          
          <div class="oh-fg">
            <label class="oh-label" for="ohBudgetAmount">Budget Amount (₹) <span class="req">*</span></label>
            <input class="oh-input" id="ohBudgetAmount" type="number" step="0.01" min="0" placeholder="e.g. 50000.00" value="${b ? b.amount : ''}">
          </div>

          <div class="oh-fg" style="margin-top: 20px; display: flex; align-items: center; justify-content: space-between; background: var(--slate-50); padding: 12px 16px; border-radius: 14px; border: 1px solid var(--slate-100);">
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <span style="font-size: 13.5px; font-weight: 700; color: var(--slate-800);">Pause Budget</span>
              <span style="font-size: 11.5px; color: var(--slate-400);">Temporarily suspend calculations and limit enforcement</span>
            </div>
            <label class="switch-toggle" style="margin-bottom: 0;">
              <input type="checkbox" id="ohBudgetIsPaused" ${b && b.isPaused ? 'checked' : ''}>
              <span class="switch-slider"></span>
            </label>
          </div>
        </div>
        <div class="oh-modal-btns">
          <button class="oh-btn-cancel" id="ohBudgetCancelBtn">Cancel</button>
          <button class="oh-btn-save" id="ohBudgetSaveBtn">${b ? 'Save Changes' : 'Create Budget'}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    updateOhMultiselectBtnText('dept');
    updateOhMultiselectBtnText('ledger');

    document.getElementById('ohBudgetDeptBtn').addEventListener('click', e => {
      e.stopPropagation();
      renderOhMultiselectDropdown('dept');
    });

    document.getElementById('ohBudgetLedgerBtn').addEventListener('click', e => {
      e.stopPropagation();
      renderOhMultiselectDropdown('ledger');
    });

    document.getElementById('ohBudgetModalClose').addEventListener('click', closeOhBudgetModal);
    document.getElementById('ohBudgetCancelBtn').addEventListener('click', closeOhBudgetModal);
    
    overlay.addEventListener('click', e => {
      if (!e.target.closest('.oh-multiselect-wrap')) {
        if (_activeDropdownType) {
          const activeWrap = document.getElementById(`ohBudget${_activeDropdownType === 'dept' ? 'Dept' : 'Ledger'}Wrap`);
          activeWrap?.querySelector('.oh-multiselect-dropdown')?.remove();
          activeWrap?.classList.remove('open');
          _activeDropdownType = null;
        }
      }
      if (e.target === overlay) closeOhBudgetModal();
    });

    document.getElementById('ohBudgetSaveBtn').addEventListener('click', saveOhBudget);

    const amtInp = document.getElementById('ohBudgetAmount');
    if (amtInp) amtInp.addEventListener('keydown', e => { if (e.key === 'Enter') saveOhBudget(); });
  }

  function closeOhBudgetModal() {
    document.getElementById('ohBudgetModal')?.remove();
    _ohBudgetModalEditId = null;
    _activeDropdownType = null;
    _multiselectSearchQueries = { dept: '', ledger: '' };
  }

  function clearKyaData() {
    coaLedgers = [];
    postedEntries = [];
    draftedEntries = [];
    jvCounter = 1;
    ohDepartments = [];
    ohEmployees = [];
    ohBudgets = [];
    _ohDeptCtr = 1;
    _ohEmpCtr = 1;
    _ohBudgetCtr = 1;
    _ohBudgetPeriodFilter = 'all';
    if (window.KYA_STORE) {
      window.KYA_STORE = {};
    }
    populateJeDepartments();
    initDefaultLedgers();
  }

  function saveOhBudget() {
    const fromInp   = document.getElementById('ohBudgetFromDate');
    const toInp     = document.getElementById('ohBudgetToDate');
    const deptBtn   = document.getElementById('ohBudgetDeptBtn');
    const ledgerBtn = document.getElementById('ohBudgetLedgerBtn');
    const amtInp    = document.getElementById('ohBudgetAmount');

    let err = false;

    if (!fromInp.value) { fromInp.classList.add('error'); err = true; }
    if (!toInp.value) { toInp.classList.add('error'); err = true; }
    
    const hasDept = _ohBudgetSelectedDepts === 'all' || (Array.isArray(_ohBudgetSelectedDepts) && _ohBudgetSelectedDepts.length > 0);
    if (!hasDept) { deptBtn.classList.add('error'); err = true; }
    
    const hasLedger = _ohBudgetSelectedLedgers === 'all' || (Array.isArray(_ohBudgetSelectedLedgers) && _ohBudgetSelectedLedgers.length > 0);
    if (!hasLedger) { ledgerBtn.classList.add('error'); err = true; }
    
    const amt = parseFloat(amtInp.value);
    if (isNaN(amt) || amt <= 0) { amtInp.classList.add('error'); err = true; }

    if (fromInp.value && toInp.value && fromInp.value > toInp.value) {
      fromInp.classList.add('error');
      toInp.classList.add('error');
      showToast('From Date cannot be after To Date.', 'error');
      err = true;
    }

    if (err) {
      setTimeout(() => {
        fromInp.classList.remove('error');
        toInp.classList.remove('error');
        deptBtn.classList.remove('error');
        ledgerBtn.classList.remove('error');
        amtInp.classList.remove('error');
      }, 1500);
      return;
    }

    const deptIds = _ohBudgetSelectedDepts;
    const ledgerIds = _ohBudgetSelectedLedgers;
    const fromDate = fromInp.value;
    const toDate = toInp.value;

    const isPausedVal = document.getElementById('ohBudgetIsPaused')?.checked === true;

    if (_ohBudgetModalEditId) {
      const b = ohBudgets.find(x => x.id === _ohBudgetModalEditId);
      if (b) {
        b.deptIds = deptIds;
        b.ledgerIds = ledgerIds;
        b.fromDate = fromDate;
        b.toDate = toDate;
        b.amount = amt;
        b.isPaused = isPausedVal;
        delete b.deptId;
        delete b.ledgerId;
      }
      showToast('Budget updated successfully.', 'success');
    } else {
      ohBudgets.push({
        id: _ohBudgetCtr++,
        deptIds,
        ledgerIds,
        fromDate,
        toDate,
        amount: amt,
        isPaused: isPausedVal
      });
      showToast('Budget created successfully.', 'success');
    }

    closeOhBudgetModal();
    updateOhBadges();
    renderOhBudgetView();
    triggerAutoBackup();
  }

  function deleteOhBudget(id) {
    const b = ohBudgets.find(x => x.id === id);
    if (!b) return;

    const deptIds = b.deptIds !== undefined ? b.deptIds : (b.deptId !== undefined ? b.deptId : 'all');
    const ledgerIds = b.ledgerIds !== undefined ? b.ledgerIds : (b.ledgerId !== undefined ? b.ledgerId : 'all');

    let deptLabel = '';
    if (deptIds === 'all') {
      deptLabel = 'All Departments';
    } else {
      const ids = Array.isArray(deptIds) ? deptIds : [Number(deptIds)];
      deptLabel = ids.map(id => {
        const d = ohGetDeptById(id);
        return d ? d.name : '';
      }).filter(Boolean).join(', ');
      if (!deptLabel) deptLabel = 'Unassigned';
    }

    let ledgerLabel = '';
    if (ledgerIds === 'all') {
      ledgerLabel = 'All Expenses';
    } else {
      const ids = Array.isArray(ledgerIds) ? ledgerIds : [Number(ledgerIds)];
      ledgerLabel = ids.map(id => {
        const l = coaLedgers.find(x => x.id === id);
        return l ? l.name : '';
      }).filter(Boolean).join(', ');
      if (!ledgerLabel) ledgerLabel = 'Unknown';
    }

    const label = `${deptLabel} - ${ledgerLabel}`;

    showKyaConfirm({
      title: 'Delete Budget?',
      message: `Permanently delete budget for <strong>${ohEsc(label)}</strong> (${b.fromDate} to ${b.toDate})?<br>This cannot be undone.`,
      confirmLabel: '✕ Delete',
      onConfirm: () => {
        ohBudgets = ohBudgets.filter(x => x.id !== id);
        showToast('Budget deleted.', 'success');
        updateOhBadges();
        renderOhBudgetView();
        triggerAutoBackup();
      }
    });
  }

  function toggleOhBudgetPause(id) {
    const b = ohBudgets.find(x => x.id === id);
    if (b) {
      b.isPaused = !b.isPaused;
      showToast(b.isPaused ? 'Budget paused successfully.' : 'Budget resumed successfully.', 'success');
      updateOhBadges();
      renderOhBudgetView();
      triggerAutoBackup();
    }
  }

  function getNextOccurrenceDate(dayNum) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    const todayDay = now.getDate();
    
    let targetMonth = currentMonth;
    let targetYear = currentYear;
    
    if (todayDay > dayNum) {
      targetMonth += 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
    }
    
    const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
    const clampedDay = Math.min(dayNum, maxDays);
    
    return new Date(targetYear, targetMonth, clampedDay);
  }

  function getLedgerColor(name) {
    if (!name) return '#64748b';
    const colors = ['#0284c7', '#7c3aed', '#059669', '#ea580c', '#db2777', '#0891b2', '#4f46e5'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  function getOrdinalSuffix(i) {
    var j = i % 10,
        k = i % 100;
    if (j == 1 && k != 11) {
        return "st";
    }
    if (j == 2 && k != 12) {
        return "nd";
    }
    if (j == 3 && k != 13) {
        return "rd";
    }
    return "th";
  }

  function renderFriendlyDateArea(r, overrideDateString) {
    if (!r.dueDate) return '';
    const nowTime = new Date().setHours(0,0,0,0);
    
    if (r.type === 'Recurring') {
      const dayNum = parseInt(r.dueDate) || 1;
      let nextOccur;
      if (overrideDateString) {
        nextOccur = new Date(overrideDateString);
      } else {
        nextOccur = getNextOccurrenceDate(dayNum);
      }
      const diffDays = Math.ceil((nextOccur.getTime() - nowTime) / (1000 * 60 * 60 * 24));
      
      const options = { day: 'numeric', month: 'short' };
      const formattedNext = nextOccur.toLocaleDateString('en-US', options);
      
      let relativeText = `in ${diffDays} days`;
      if (diffDays === 0) relativeText = 'today';
      else if (diffDays === 1) relativeText = 'tomorrow';
      
      return `
        <div style="font-size:12px; font-weight:700; color:var(--slate-700); display:flex; align-items:center; gap:4px; justify-content:flex-end;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;color:var(--slate-400);"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
          Every month on ${dayNum}${getOrdinalSuffix(dayNum)}
        </div>
        <div style="font-size:10px; font-weight:600; color:${diffDays <= 7 ? '#c2410c' : 'var(--slate-400)'}; margin-top:2px;">
          Next: ${formattedNext} (${relativeText})
        </div>
      `;
    } else {
      const dueTime = new Date(r.dueDate).getTime();
      const diffDays = Math.ceil((dueTime - nowTime) / (1000 * 60 * 60 * 24));
      
      const options = { day: 'numeric', month: 'short', year: 'numeric' };
      const formattedDate = new Date(r.dueDate).toLocaleDateString('en-US', options);
      
      let relativeText = `in ${diffDays} days`;
      if (diffDays < 0) relativeText = `${Math.abs(diffDays)} days ago`;
      else if (diffDays === 0) relativeText = 'today';
      else if (diffDays === 1) relativeText = 'tomorrow';
      
      return `
        <div style="font-size:12px; font-weight:700; color:var(--slate-700); display:flex; align-items:center; gap:4px; justify-content:flex-end;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;color:var(--slate-400);"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          ${formattedDate}
        </div>
        <div style="font-size:10px; font-weight:600; color:${diffDays <= 7 && diffDays >= 0 ? '#c2410c' : diffDays < 0 ? '#dc2626' : 'var(--slate-400)'}; margin-top:2px;">
          ${relativeText}
        </div>
      `;
    }
  }

  function postReminderJournalEntry(r) {
    const entryId = Date.now();
    const now = new Date();
    const dateVal = now.toISOString().split('T')[0];
    const y = now.getFullYear().toString().substring(2);
    const voucherNoVal = `JV-${y}-${String(jvCounter).padStart(3,'0')}`;
    
    jvCounter++;

    const rows = [];
    let rowId = 1;

    const mainLedger = coaLedgers.find(l => l.id == r.ledgerId) || { name: 'General Ledger' };
    const mainAmt = parseFloat(r.amount) || 0;
    const mainIsDr = r.drCr !== 'Credit';

    rows.push({
      id: rowId++,
      type: mainIsDr ? 'By' : 'To',
      particular: mainLedger.name,
      debit: mainIsDr ? mainAmt.toFixed(2) : '',
      credit: mainIsDr ? '' : mainAmt.toFixed(2)
    });

    const oppDrCr = mainIsDr ? 'Credit' : 'Debit';

    if (Array.isArray(r.oppEntries)) {
      r.oppEntries.forEach(opp => {
        const oppLedger = coaLedgers.find(l => l.id == opp.ledgerId) || { name: 'General Ledger' };
        const oppAmt = parseFloat(opp.amount) || 0;
        const oppIsDr = oppDrCr === 'Debit';

        rows.push({
          id: rowId++,
          type: oppIsDr ? 'By' : 'To',
          particular: oppLedger.name,
          debit: oppIsDr ? oppAmt.toFixed(2) : '',
          credit: oppIsDr ? '' : oppAmt.toFixed(2)
        });
      });
    }

    const postData = {
      id:             entryId,
      date:           dateVal,
      voucherNo:      voucherNoVal,
      preparedBy:     'Reminders Module',
      departmentId:   r.departmentId || '',
      isBudget:       r.isBudget === true,
      firstParticular: mainLedger.name,
      amount:         fmtNum(mainAmt),
      allRows:        rows,
      narration:      r.narration || r.title || 'Auto posted from reminders'
    };

    postedEntries.unshift(postData);
    
    if (typeof refreshAllReports === 'function') {
      refreshAllReports();
    }
    
    return entryId;
  }

  function renderReminderJePreview() {
    const container = document.getElementById('ohReminderJePreviewContainer');
    if (!container) return;

    if (!_ohNewReminderAutoJournal || !_ohNewReminderAmount) {
      container.innerHTML = '';
      return;
    }

    const ledgers = coaLedgers.filter(l => l.type === 'ledger');
    
    const mainLedger = ledgers.find(l => l.id == _ohNewReminderLedgerId) || { name: '—' };
    const mainAmt = parseFloat(_ohNewReminderAmount) || 0;
    const mainIsDr = _ohNewReminderDrCr !== 'Credit';

    const previewRows = [];
    
    previewRows.push({
      particular: mainLedger.name,
      debit: mainIsDr ? mainAmt : 0,
      credit: mainIsDr ? 0 : mainAmt,
      isMain: true
    });

    let totalOppAmt = 0;
    _ohNewReminderOppEntries.forEach(opp => {
      const oppLedger = ledgers.find(l => l.id == opp.ledgerId) || { name: '—' };
      const oppAmt = parseFloat(opp.amount) || 0;
      totalOppAmt += oppAmt;
      
      const oppIsDr = !mainIsDr;

      previewRows.push({
        particular: oppLedger.name,
        debit: oppIsDr ? oppAmt : 0,
        credit: oppIsDr ? 0 : oppAmt,
        isMain: false
      });
    });

    const totalDr = mainIsDr ? mainAmt : totalOppAmt;
    const totalCr = mainIsDr ? totalOppAmt : mainAmt;
    const difference = Math.abs(totalDr - totalCr);
    const isBalanced = difference <= 0.01;

    let balanceBadge = '';
    if (isBalanced) {
      balanceBadge = `<span style="font-size:10px; font-weight:700; color:#15803d; background:#dcfce7; padding:2px 8px; border-radius:12px; display:inline-flex; align-items:center; gap:2px;">
        <svg viewBox="0 0 20 20" fill="currentColor" style="width:10px;height:10px;"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
        Balanced
      </span>`;
    } else {
      balanceBadge = `<span style="font-size:10px; font-weight:700; color:#b91c1c; background:#fee2e2; padding:2px 8px; border-radius:12px; display:inline-flex; align-items:center; gap:2px;">
        <svg viewBox="0 0 20 20" fill="currentColor" style="width:10px;height:10px;"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
        Unbalanced (Diff: ₹${difference.toFixed(2)})
      </span>`;
    }

    let rowsHtml = '';
    previewRows.forEach(row => {
      rowsHtml += `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 6px 8px; font-size: 11px; color: ${row.isMain ? 'var(--blue-700)' : 'var(--slate-700)'}; font-weight: ${row.isMain ? '700' : '500'};">
            ${row.isMain ? 'By ' : 'To '}${ohEsc(row.particular)}
          </td>
          <td style="padding: 6px 8px; font-size: 11px; text-align: right; color: var(--slate-600); font-family: monospace;">
            ${row.debit > 0 ? `₹${row.debit.toFixed(2)}` : ''}
          </td>
          <td style="padding: 6px 8px; font-size: 11px; text-align: right; color: var(--slate-600); font-family: monospace;">
            ${row.credit > 0 ? `₹${row.credit.toFixed(2)}` : ''}
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div style="font-size:10px; font-weight:700; color:var(--slate-500); margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
        <span>DRAFTED JOURNAL ENTRY PREVIEW</span>
        ${balanceBadge}
      </div>
      <table style="width:100%; border-collapse:collapse; background:#ffffff; border:1px solid #e2e8f0; border-radius:6px; overflow:hidden;">
        <thead>
          <tr style="background:#f8fafc; border-bottom:1px solid #e2e8f0;">
            <th style="padding:6px 8px; text-align:left; font-size:10px; font-weight:700; color:var(--slate-500);">Particulars</th>
            <th style="padding:6px 8px; text-align:right; font-size:10px; font-weight:700; color:var(--slate-500); width:80px;">Debit (Dr)</th>
            <th style="padding:6px 8px; text-align:right; font-size:10px; font-weight:700; color:var(--slate-500); width:80px;">Credit (Cr)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
        <tfoot>
          <tr style="background:#f8fafc; border-top:1px solid #e2e8f0; font-weight:700;">
            <td style="padding:6px 8px; font-size:11px; color:var(--slate-700);">Total</td>
            <td style="padding:6px 8px; font-size:11px; text-align:right; color:var(--slate-700); font-family:monospace;">₹${totalDr.toFixed(2)}</td>
            <td style="padding:6px 8px; font-size:11px; text-align:right; color:var(--slate-700); font-family:monospace;">₹${totalCr.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    `;
  }

  function renderOppEntriesListHtml() {
    const listContainer = document.getElementById('ohOppEntriesList');
    if (!listContainer) return;
    
    const ledgers = coaLedgers.filter(l => l.type === 'ledger');
    const oppDrCr = _ohNewReminderDrCr === 'Debit' ? 'Credit' : 'Debit';
    
    let html = '';
    if (_ohNewReminderOppEntries.length === 0) {
      html = `<div style="padding: 10px; font-size: 11px; color: var(--slate-400); text-align: center;">No balancing accounts added yet.</div>`;
    } else {
      _ohNewReminderOppEntries.forEach((opp, idx) => {
        opp.drCr = oppDrCr;
        const oppLedger = ledgers.find(l => l.id == opp.ledgerId) || { name: 'Select Ledger', id: '' };
        
        html += `
          <div style="display: grid; grid-template-columns: 2fr 40px 1fr auto; gap: 8px; align-items: center;">
            <div style="position: relative;">
              <button type="button" class="oh-opp-ledger-trigger oh-day-picker-btn" data-index="${idx}" style="width:100%; height:32px; font-size:11px; padding:0 8px; justify-content:space-between; font-weight:500;">
                <span>${ohEsc(oppLedger.name)}</span>
                <svg viewBox="0 0 20 20" fill="currentColor" style="width:10px;height:10px;color:#94a3b8;flex-shrink:0;"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
              </button>
              <div id="ohOppLedgerDropdown-${idx}" class="oh-opp-ledger-dropdown" style="display:none; position:absolute; top:34px; left:0; right:0; z-index:10020; background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); padding:6px; box-sizing:border-box;">
                <input type="text" class="oh-opp-ledger-search" data-index="${idx}" placeholder="Search ledger..." style="width:100%; height:28px; border:1px solid #e2e8f0; border-radius:6px; padding:0 8px; font-size:11px; outline:none; box-sizing:border-box; margin-bottom:6px;">
                <div class="oh-opp-ledger-list" data-index="${idx}" style="max-height:120px; overflow-y:auto; display:flex; flex-direction:column; gap:2px;">
                  <!-- Dynamic items -->
                </div>
              </div>
            </div>
            
            <div style="text-align: center; font-size: 10px; font-weight: 700; color: var(--slate-500); background: #f1f5f9; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid #e2e8f0;">
              ${oppDrCr === 'Debit' ? 'Dr' : 'Cr'}
            </div>

            <div>
              <input type="number" class="oh-opp-amount-input" data-index="${idx}" value="${ohEsc(opp.amount)}" placeholder="Amount" style="width:100%; height:32px; border:1px solid #e2e8f0; border-radius:6px; padding:0 8px; font-size:11px; outline:none; box-sizing:border-box;">
            </div>

            <button type="button" class="oh-del-opp-row-btn" data-index="${idx}" style="color: #cbd5e1; border: none; background: transparent; padding: 4px; cursor: pointer; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s;" onmouseover="this.style.color='#ef4444'; this.style.background='#fee2e2';" onmouseout="this.style.color='#cbd5e1'; this.style.background='transparent';">
              <svg viewBox="0 0 12 12" fill="none" style="width: 12px; height: 12px;"><path d="M2 3h8M5 3V2h2v1M4.5 5v4M7.5 5v4M3 3l.7 7h4.6L9 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        `;
      });
    }
    listContainer.innerHTML = html;
    
    wireOppEntriesListEvents();
    renderReminderJePreview();
  }

  function wireOppEntriesListEvents() {
    const listContainer = document.getElementById('ohOppEntriesList');
    if (!listContainer) return;

    const ledgers = coaLedgers.filter(l => l.type === 'ledger');

    listContainer.querySelectorAll('.oh-opp-ledger-trigger').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(trigger.dataset.index);
        const dropdown = document.getElementById(`ohOppLedgerDropdown-${idx}`);
        const searchInput = dropdown?.querySelector('.oh-opp-ledger-search');
        
        listContainer.querySelectorAll('.oh-opp-ledger-dropdown').forEach(d => {
          if (d.id !== `ohOppLedgerDropdown-${idx}`) d.style.display = 'none';
        });

        if (dropdown) {
          const isOpen = dropdown.style.display === 'block';
          dropdown.style.display = isOpen ? 'none' : 'block';
          if (!isOpen && searchInput) {
            searchInput.value = '';
            searchInput.focus();
            filterOppList(idx, '');
          }
        }
      });
    });

    const filterOppList = (rowIdx, query = '') => {
      const dropdown = document.getElementById(`ohOppLedgerDropdown-${rowIdx}`);
      const listEl = dropdown?.querySelector('.oh-opp-ledger-list');
      if (!listEl) return;

      const q = query.toLowerCase().trim();
      const filtered = ledgers.filter(l => l.name.toLowerCase().includes(q));

      let itemsHtml = '';
      if (filtered.length === 0) {
        itemsHtml = `<div style="padding:6px; font-size:11px; color:#94a3b8; text-align:center;">No match</div>`;
      } else {
        itemsHtml = filtered.map(l => {
          const isSelected = l.id == _ohNewReminderOppEntries[rowIdx].ledgerId;
          return `
            <div class="oh-ledger-opt-item-opp" data-row-idx="${rowIdx}" data-id="${l.id}" data-name="${ohEsc(l.name)}" style="padding: 4px 6px; font-size: 11px; border-radius: 4px; cursor: pointer; color: ${isSelected ? '#ffffff' : 'var(--slate-700)'}; background: ${isSelected ? 'var(--blue-600)' : 'transparent'}; transition: all 0.1s;" onmouseover="if(this.style.background!=='var(--blue-600)') this.style.background='var(--slate-100)';" onmouseout="if(this.style.background!=='var(--blue-600)') this.style.background='transparent';">
              ${ohEsc(l.name)}
            </div>
          `;
        }).join('');
      }
      listEl.innerHTML = itemsHtml;
    };

    listContainer.querySelectorAll('.oh-opp-ledger-search').forEach(search => {
      search.addEventListener('input', (e) => {
        const idx = parseInt(search.dataset.index);
        filterOppList(idx, e.target.value);
      });
      search.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    });

    listContainer.querySelectorAll('.oh-opp-amount-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(inp.dataset.index);
        _ohNewReminderOppEntries[idx].amount = e.target.value.trim();
        renderReminderJePreview();
      });
    });

    // Option item click
    listContainer.addEventListener('click', (e) => {
      const opt = e.target.closest('.oh-ledger-opt-item-opp');
      if (opt) {
        e.stopPropagation();
        const rowIdx = parseInt(opt.dataset.rowIdx);
        _ohNewReminderOppEntries[rowIdx].ledgerId = opt.dataset.id;
        
        const trigger = listContainer.querySelector(`.oh-opp-ledger-trigger[data-index="${rowIdx}"]`);
        const span = trigger?.querySelector('span');
        if (span) span.textContent = opt.dataset.name;
        
        const dropdown = document.getElementById(`ohOppLedgerDropdown-${rowIdx}`);
        if (dropdown) dropdown.style.display = 'none';
        
        renderReminderJePreview();
      }
    });

    listContainer.querySelectorAll('.oh-del-opp-row-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index);
        _ohNewReminderOppEntries.splice(idx, 1);
        renderOppEntriesListHtml();
      });
    });
  }

  function renderNewReminderFormHtml() {
    let dateInputHtml = '';
    if (_ohNewReminderType === 'Recurring') {
      const selectedDay = parseInt(_ohNewReminderDueDate) || 1;
      dateInputHtml = `
        <button id="ohNewReminderDayBtn" class="oh-day-picker-btn" style="width:100%;">
          <div style="display:flex;align-items:center;gap:6px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;color:#94a3b8;flex-shrink:0;">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>Day ${selectedDay}</span>
          </div>
          <svg viewBox="0 0 20 20" fill="currentColor" style="width:12px;height:12px;color:#94a3b8;flex-shrink:0;"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
        </button>
      `;
    } else {
      dateInputHtml = `
        <div class="oh-date-input-wrap">
          <input type="date" id="ohNewReminderDateVal" value="${ohEsc(_ohNewReminderDueDate)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); width: 13px; height: 13px; color: #94a3b8; pointer-events: none; flex-shrink: 0;">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
      `;
    }

    const ledgers = coaLedgers.filter(l => l.type === 'ledger');
    const selectedLedger = ledgers.find(l => l.id == _ohNewReminderLedgerId) || { name: 'General Ledger', id: 'general' };

    const isEdit = _ohReminderEditIndex !== null;

    return `
      <div class="oh-reminder-form-card" style="background:#ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); animation: ohPopIn 0.2s ease-out;">
        <div style="font-size: 14px; font-weight: 700; color: var(--slate-800); margin-bottom: 12px; display:flex; align-items:center; gap:6px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;color:var(--blue-600);"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          ${isEdit ? 'Edit Reminder Details' : 'Create New Reminder'}
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px;">
          <div>
            <label style="display:block; font-size:11px; font-weight:600; color:var(--slate-500); margin-bottom:4px;">Type</label>
            <div class="oh-segmented-control" style="display:flex; background:#f1f5f9; border-radius:8px; padding:3px; height:36px; box-sizing:border-box; width:100%; border:1px solid #e2e8f0;">
              <button type="button" class="oh-type-segment-btn" data-value="One Time" style="flex:1; border:none; outline:none; font-size:12px; font-weight:700; border-radius:6px; cursor:pointer; transition:all 0.15s ease; background:${_ohNewReminderType === 'One Time' ? '#ffffff' : 'transparent'}; color:${_ohNewReminderType === 'One Time' ? 'var(--blue-600)' : '#64748b'}; box-shadow:${_ohNewReminderType === 'One Time' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'};">
                One Time
              </button>
              <button type="button" class="oh-type-segment-btn" data-value="Recurring" style="flex:1; border:none; outline:none; font-size:12px; font-weight:700; border-radius:6px; cursor:pointer; transition:all 0.15s ease; background:${_ohNewReminderType === 'Recurring' ? '#ffffff' : 'transparent'}; color:${_ohNewReminderType === 'Recurring' ? 'var(--blue-600)' : '#64748b'}; box-shadow:${_ohNewReminderType === 'Recurring' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'};">
                Recurring
              </button>
            </div>
          </div>
          <div>
            <label style="display:block; font-size:11px; font-weight:600; color:var(--slate-500); margin-bottom:4px;">Due Date / Day</label>
            ${dateInputHtml}
          </div>
          <div>
            <label style="display:block; font-size:11px; font-weight:600; color:var(--slate-500); margin-bottom:4px;">Show in Upcoming (Days Before)</label>
            <input type="number" id="ohNewReminderShowDaysBefore" value="${_ohNewReminderShowDaysBefore !== undefined ? _ohNewReminderShowDaysBefore : '7'}" placeholder="e.g. 7" style="width:100%; height:36px; border:1px solid #e2e8f0; border-radius:6px; padding:0 12px; font-size:13px; outline:none; box-sizing:border-box;">
          </div>
          <div style="grid-column: span 3;">
            <label style="display:block; font-size:11px; font-weight:600; color:var(--slate-500); margin-bottom:4px;">Reminder / Task Name</label>
            <input type="text" id="ohNewReminderTitle" value="${ohEsc(_ohNewReminderTitle)}" placeholder="e.g. GST filing, ROC returns" style="width:100%; height:36px; border:1px solid #e2e8f0; border-radius:6px; padding:0 12px; font-size:13px; outline:none; box-sizing:border-box;">
          </div>
          <div style="grid-column: span 3; position: relative;">
            <label style="display:block; font-size:11px; font-weight:600; color:var(--slate-500); margin-bottom:4px;">Ledger</label>
            <div class="oh-searchable-select" style="position:relative; width:100%;">
              <button type="button" id="ohNewReminderLedgerTrigger" class="oh-day-picker-btn" style="width:100%; text-align:left; justify-content:space-between; font-weight: 500;">
                <span>${ohEsc(selectedLedger.name)}</span>
                <svg viewBox="0 0 20 20" fill="currentColor" style="width:12px;height:12px;color:#94a3b8;flex-shrink:0;"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
              </button>
              <div id="ohNewReminderLedgerDropdown" style="display:none; position:absolute; top:38px; left:0; right:0; z-index:10010; background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); padding:8px; box-sizing:border-box;">
                <input type="text" id="ohNewReminderLedgerSearch" placeholder="Search ledger..." style="width:100%; height:32px; border:1px solid #e2e8f0; border-radius:6px; padding:0 8px; font-size:12px; outline:none; box-sizing:border-box; margin-bottom:8px;">
                <div id="ohNewReminderLedgerList" style="max-height:160px; overflow-y:auto; display:flex; flex-direction:column; gap:2px;">
                  <!-- Dynamic items -->
                </div>
              </div>
            </div>
          </div>
          <div>
            <label style="display:block; font-size:11px; font-weight:600; color:var(--slate-500); margin-bottom:4px;">Amount (Optional)</label>
            <input type="number" id="ohNewReminderAmount" value="${ohEsc(_ohNewReminderAmount)}" placeholder="e.g. 5000" style="width:100%; height:36px; border:1px solid #e2e8f0; border-radius:6px; padding:0 12px; font-size:13px; outline:none; box-sizing:border-box;">
          </div>
          <div id="ohNewReminderDrCrContainer" style="display: ${_ohNewReminderAmount ? 'block' : 'none'}; animation: ohPopIn 0.2s ease-out;">
            <label style="display:block; font-size:11px; font-weight:600; color:var(--slate-500); margin-bottom:4px;">Debit / Credit</label>
            <div class="oh-segmented-control" style="display:flex; background:#f1f5f9; border-radius:8px; padding:3px; height:36px; box-sizing:border-box; width:100%; border:1px solid #e2e8f0;">
              <button type="button" class="oh-drcr-segment-btn" data-value="Debit" style="flex:1; border:none; outline:none; font-size:12px; font-weight:700; border-radius:6px; cursor:pointer; transition:all 0.15s ease; background:${_ohNewReminderDrCr === 'Debit' ? '#ffffff' : 'transparent'}; color:${_ohNewReminderDrCr === 'Debit' ? 'var(--blue-600)' : '#64748b'}; box-shadow:${_ohNewReminderDrCr === 'Debit' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'};">
                Debit (Dr)
              </button>
              <button type="button" class="oh-drcr-segment-btn" data-value="Credit" style="flex:1; border:none; outline:none; font-size:12px; font-weight:700; border-radius:6px; cursor:pointer; transition:all 0.15s ease; background:${_ohNewReminderDrCr === 'Credit' ? '#ffffff' : 'transparent'}; color:${_ohNewReminderDrCr === 'Credit' ? 'var(--blue-600)' : '#64748b'}; box-shadow:${_ohNewReminderDrCr === 'Credit' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'};">
                Credit (Cr)
              </button>
            </div>
          </div>
          
          <div id="ohNewReminderAutoJournalContainer" style="display: ${_ohNewReminderAmount ? 'block' : 'none'}; margin-top: 4px; grid-column: span 3;">
            <label style="display:block; font-size:11px; font-weight:600; color:var(--slate-500); margin-bottom:4px;">Auto Journal Posting</label>
            <div class="oh-segmented-control" style="display:flex; background:#f1f5f9; border-radius:8px; padding:3px; height:36px; box-sizing:border-box; width:100%; border:1px solid #e2e8f0; margin-bottom: 8px;">
              <button type="button" class="oh-autojournal-segment-btn" data-value="false" style="flex:1; border:none; outline:none; font-size:12px; font-weight:700; border-radius:6px; cursor:pointer; transition:all 0.15s ease; background:${_ohNewReminderAutoJournal === false ? '#ffffff' : 'transparent'}; color:${_ohNewReminderAutoJournal === false ? 'var(--blue-600)' : '#64748b'}; box-shadow:${_ohNewReminderAutoJournal === false ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'};">
                Disabled
              </button>
              <button type="button" class="oh-autojournal-segment-btn" data-value="true" style="flex:1; border:none; outline:none; font-size:12px; font-weight:700; border-radius:6px; cursor:pointer; transition:all 0.15s ease; background:${_ohNewReminderAutoJournal === true ? '#ffffff' : 'transparent'}; color:${_ohNewReminderAutoJournal === true ? 'var(--blue-600)' : '#64748b'}; box-shadow:${_ohNewReminderAutoJournal === true ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'};">
                Enabled
              </button>
            </div>
            
            <div id="ohNewReminderAutoJournalPart" style="display: ${_ohNewReminderAutoJournal === true ? 'block' : 'none'}; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc; animation: ohPopIn 0.2s ease-out; margin-top: 8px;">
              <div style="font-size:11px; font-weight:700; color:var(--slate-700); margin-bottom:10px; display:flex; align-items:center; gap:4px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:12px;height:12px;color:var(--blue-600);"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Auto Journal Configuration
              </div>
              
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
                <div>
                  <label style="display:block; font-size:10px; font-weight:600; color:var(--slate-500); margin-bottom:4px;">Department</label>
                  <select id="ohNewReminderDept" style="width:100%; height:34px; border:1px solid #e2e8f0; border-radius:6px; padding:0 8px; font-size:12px; outline:none; background:#fff; box-sizing:border-box;">
                    <option value="">&mdash; None &mdash;</option>
                    ${ohDepartments.map(d => `<option value="${d.id}" ${String(_ohNewReminderDeptId) === String(d.id) ? 'selected' : ''}>${ohEsc(d.name)}</option>`).join('')}
                  </select>
                </div>
                <div>
                  <label style="display:block; font-size:10px; font-weight:600; color:var(--slate-500); margin-bottom:4px;">Transaction Type</label>
                  <div class="oh-segmented-control" style="display:flex; background:#f1f5f9; border-radius:6px; padding:2px; height:34px; box-sizing:border-box; width:100%; border:1px solid #e2e8f0;">
                    <button type="button" class="oh-budget-segment-btn" data-value="false" style="flex:1; border:none; outline:none; font-size:11px; font-weight:700; border-radius:4px; cursor:pointer; transition:all 0.15s ease; background:${_ohNewReminderIsBudget === false ? '#ffffff' : 'transparent'}; color:${_ohNewReminderIsBudget === false ? 'var(--blue-600)' : '#64748b'}; box-shadow:${_ohNewReminderIsBudget === false ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'};">
                      Non Budget
                    </button>
                    <button type="button" class="oh-budget-segment-btn" data-value="true" style="flex:1; border:none; outline:none; font-size:11px; font-weight:700; border-radius:4px; cursor:pointer; transition:all 0.15s ease; background:${_ohNewReminderIsBudget === true ? '#ffffff' : 'transparent'}; color:${_ohNewReminderIsBudget === true ? 'var(--blue-600)' : '#64748b'}; box-shadow:${_ohNewReminderIsBudget === true ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'};">
                      Budget
                    </button>
                  </div>
                </div>
              </div>

              <div style="border-top:1px solid #e2e8f0; padding-top:10px; margin-top:10px; margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <span style="font-size:10px; font-weight:700; color:var(--slate-600);">Opposite Entries (Balancing Accounts)</span>
                  <button type="button" id="ohAddOppEntryBtn" style="border:none; background:var(--blue-50); color:var(--blue-600); font-size:10px; font-weight:700; padding:4px 8px; border-radius:4px; cursor:pointer; display:flex; align-items:center; gap:2px; transition:all 0.15s;" onmouseover="this.style.background='var(--blue-100)';" onmouseout="this.style.background='var(--blue-50)';">
                    <svg viewBox="0 0 15 15" fill="none" style="width: 10px; height: 10px;"><path d="M7.5 2v11M2 7.5h11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    Add Row
                  </button>
                </div>
                
                <div id="ohOppEntriesList" style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px;">
                  <!-- Opposite rows list -->
                </div>
              </div>

              <div style="border-top:1px solid #e2e8f0; padding-top:10px; margin-top:10px; margin-bottom:12px;">
                <label style="display:block; font-size:10px; font-weight:600; color:var(--slate-500); margin-bottom:4px;">Narration / Description</label>
                <input type="text" id="ohNewReminderNarration" value="${ohEsc(_ohNewReminderNarration)}" placeholder="e.g. Auto posted GST filing payout" style="width:100%; height:34px; border:1px solid #e2e8f0; border-radius:6px; padding:0 10px; font-size:12px; outline:none; box-sizing:border-box;">
              </div>

              <div id="ohReminderJePreviewContainer" style="border-top:1px solid #e2e8f0; padding-top:10px; margin-top:10px;">
                <!-- Drafted Journal Entry Preview -->
              </div>
            </div>
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button id="ohCancelNewReminder" class="btn" style="background:#f1f5f9; color:#475569; border:none; height:34px; padding:0 16px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; transition:all 0.2s;">Cancel</button>
          <button id="ohSubmitNewReminder" class="btn" style="background:var(--blue-600); color:#ffffff; border:none; height:34px; padding:0 16px; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; transition:all 0.2s;">${isEdit ? 'Save Changes' : 'Create Reminder'}</button>
        </div>
      </div>
    `;
  }

  function showDayPickerPopover(btn, idx) {
    document.getElementById('ohDayPickerPopover')?.remove();

    const rect = btn.getBoundingClientRect();
    const selectedDay = idx === -1
      ? (parseInt(_ohNewReminderDueDate) || 1)
      : (parseInt(ohReminders[idx].dueDate) || 1);

    const popover = document.createElement('div');
    popover.id = 'ohDayPickerPopover';
    popover.style.cssText = `
      position: absolute;
      top: ${rect.bottom + window.scrollY + 4}px;
      left: ${rect.left + window.scrollX}px;
      z-index: 10005;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.15);
      padding: 10px;
      width: 210px;
      box-sizing: border-box;
      font-family: var(--font-main, Inter, sans-serif);
      animation: ohPopIn 0.15s ease-out;
    `;

    // Styles are injected dynamically on renderOhRemindersView start

    let gridHtml = `<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; justify-items: center;">`;
    for (let day = 1; day <= 31; day++) {
      const isSelected = selectedDay === day;
      gridHtml += `
        <div class="oh-day-cell ${isSelected ? 'selected' : ''}" data-day="${day}">
          ${day}
        </div>
      `;
    }
    gridHtml += `</div>`;

    popover.innerHTML = `
      <div style="font-size: 11px; font-weight: 700; color: var(--slate-400); text-transform: uppercase; margin-bottom: 8px; padding-left: 4px; letter-spacing: 0.05em;">Select Day of Month</div>
      ${gridHtml}
    `;

    document.body.appendChild(popover);

    const popoverRect = popover.getBoundingClientRect();
    if (popoverRect.right > window.innerWidth) {
      popover.style.left = `${window.innerWidth - popoverRect.width - 12}px`;
    }
    if (popoverRect.bottom > window.innerHeight) {
      popover.style.top = `${rect.top + window.scrollY - popoverRect.height - 4}px`;
    }

    popover.addEventListener('click', (e) => {
      const cell = e.target.closest('.oh-day-cell');
      if (cell) {
        const day = parseInt(cell.dataset.day);
        if (idx === -1) {
          _ohNewReminderDueDate = String(day);
          const labelSpan = btn.querySelector('span');
          if (labelSpan) labelSpan.textContent = `Day ${day}`;
        } else {
          ohReminders[idx].dueDate = String(day);
        }
        
        popover.remove();
        updateOhBadges();
        renderOhRemindersView();
        triggerAutoBackup();
      }
    });

    const dismissHandler = (e) => {
      if (!popover.contains(e.target) && !btn.contains(e.target)) {
        popover.remove();
        document.removeEventListener('click', dismissHandler);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', dismissHandler);
    }, 10);
  }

  function renderOhRemindersView() {
    const wrap = document.getElementById('ohRemindersViewInner');
    if (!wrap) return;

    if (!document.getElementById('ohDayPickerStyles')) {
      const style = document.createElement('style');
      style.id = 'ohDayPickerStyles';
      style.innerHTML = `
        @keyframes ohPopIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .oh-day-cell {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-size: 12px;
          font-weight: 600;
          color: var(--slate-700);
          cursor: pointer;
          transition: all 0.12s ease;
          user-select: none;
        }
        .oh-day-cell:hover {
          background: var(--slate-100);
          color: var(--slate-900);
        }
        .oh-day-cell.selected {
          background: var(--blue-600) !important;
          color: #ffffff !important;
        }
        .oh-day-picker-btn {
          width: 100%;
          height: 34px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: #ffffff;
          color: var(--slate-800);
          font-size: 13px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 10px;
          cursor: pointer;
          box-sizing: border-box;
          outline: none;
          transition: all 0.15s ease;
        }
        .oh-day-picker-btn:hover {
          border-color: #cbd5e1;
          background: #fafbfc;
        }
        .oh-day-picker-btn:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, .12);
        }
        .oh-date-input-wrap {
          position: relative;
          width: 100%;
          box-sizing: border-box;
        }
        .oh-date-input-wrap input[type="date"]::-webkit-calendar-picker-indicator {
          opacity: 0;
          width: 100%;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0;
          cursor: pointer;
        }
        .oh-date-input-wrap input[type="date"] {
          width: 100%;
          height: 34px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 0 30px 0 10px;
          outline: none;
          font-size: 13px;
          box-sizing: border-box;
          background: #ffffff;
          color: var(--slate-800);
          transition: all 0.15s ease;
        }
        .oh-date-input-wrap input[type="date"]:hover {
          border-color: #cbd5e1;
        }
        .oh-date-input-wrap input[type="date"]:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, .12);
        }
      `;
      document.head.appendChild(style);
    }

    const total = ohReminders.length;
    const recurring = ohReminders.filter(r => r.type === 'Recurring').length;
    
    const nowTime = new Date().setHours(0,0,0,0);
    const urgent = ohReminders.filter(r => {
      if (r.status === 'Completed' || !r.dueDate) return false;
      let dueTime;
      if (r.type === 'Recurring') {
        const dayNum = parseInt(r.dueDate) || 1;
        dueTime = getNextOccurrenceDate(dayNum).getTime();
      } else {
        dueTime = new Date(r.dueDate).getTime();
      }
      const diffDays = Math.ceil((dueTime - nowTime) / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }).length;

    let html = `
      <div class="oh-stats-row">
        <div class="oh-stat">
          <div class="oh-stat-icon" style="background:#e0f2fe;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <div class="oh-stat-label">Total Reminders</div>
          <div class="oh-stat-value">${total}</div>
          <div class="oh-stat-sub">${total === 0 ? 'No reminders logged' : total + ' total logged'}</div>
        </div>
        <div class="oh-stat">
          <div class="oh-stat-icon" style="background:#f1f5f9;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div class="oh-stat-label">Recurring</div>
          <div class="oh-stat-value">${recurring}</div>
          <div class="oh-stat-sub">${recurring === 0 ? 'No active schedules' : recurring + ' active schedules'}</div>
        </div>
        <div class="oh-stat">
          <div class="oh-stat-icon" style="background:#fee2e2;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div class="oh-stat-label">Urgent (7 days)</div>
          <div class="oh-stat-value">${urgent}</div>
          <div class="oh-stat-sub">${urgent === 0 ? 'No immediate deadlines' : urgent + ' due soon'}</div>
        </div>
      </div>
    `;

    // Render form at the top if open
    if (_ohReminderFormOpen) {
      html += renderNewReminderFormHtml();
    }

    // Render upcoming/completed/templates filter bar
    html += `
      <div style="display: flex; gap: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; margin-top: 20px; margin-bottom: 16px;">
        <button class="oh-filter-tab" id="ohFilterUpcoming" style="background:none; border:none; padding: 8px 16px; font-size:13px; font-weight:700; cursor:pointer; color: ${_ohRemindersFilter === 'upcoming' ? 'var(--blue-600)' : 'var(--slate-500)'}; border-bottom: 2px solid ${_ohRemindersFilter === 'upcoming' ? 'var(--blue-600)' : 'transparent'}; transition: all 0.2s;">
          Upcoming
        </button>
        <button class="oh-filter-tab" id="ohFilterCompleted" style="background:none; border:none; padding: 8px 16px; font-size:13px; font-weight:700; cursor:pointer; color: ${_ohRemindersFilter === 'completed' ? 'var(--blue-600)' : 'var(--slate-500)'}; border-bottom: 2px solid ${_ohRemindersFilter === 'completed' ? 'var(--blue-600)' : 'transparent'}; transition: all 0.2s;">
          Completed
        </button>
        <button class="oh-filter-tab" id="ohFilterTemplates" style="background:none; border:none; padding: 8px 16px; font-size:13px; font-weight:700; cursor:pointer; color: ${_ohRemindersFilter === 'templates' ? 'var(--blue-600)' : 'var(--slate-500)'}; border-bottom: 2px solid ${_ohRemindersFilter === 'templates' ? 'var(--blue-600)' : 'transparent'}; transition: all 0.2s;">
          Templates
        </button>
      </div>
    `;

    // Filter list dynamically based on calculated days to show
    const filteredList = [];
    ohReminders.forEach((r, originalIdx) => {
      if (r.status === 'Completed') {
        if (_ohRemindersFilter === 'completed') {
          filteredList.push({ ...r, originalIdx, computedState: 'completed', displayDueDate: r.dueDate });
        }
        return;
      }

      let daysUntilDue = 999999;
      let currentOccurDateString = '';
      if (r.dueDate) {
        if (r.type === 'Recurring') {
          const dayNum = parseInt(r.dueDate) || 1;
          const nextOccur = getNextOccurrenceDate(dayNum);
          daysUntilDue = Math.ceil((nextOccur.getTime() - nowTime) / (1000 * 60 * 60 * 24));
          
          const yyyy = nextOccur.getFullYear();
          const mm = String(nextOccur.getMonth() + 1).padStart(2, '0');
          const dd = String(nextOccur.getDate()).padStart(2, '0');
          currentOccurDateString = `${yyyy}-${mm}-${dd}`;
        } else {
          const dueTime = new Date(r.dueDate).getTime();
          daysUntilDue = Math.ceil((dueTime - nowTime) / (1000 * 60 * 60 * 24));
          currentOccurDateString = r.dueDate;
        }
      }

      const showDaysBefore = r.showDaysBefore !== undefined ? parseInt(r.showDaysBefore) : 7;

      if (r.type === 'Recurring') {
        // Recurring template is ALWAYS in templates tab
        if (_ohRemindersFilter === 'templates') {
          let nextMonthOccur = '';
          const dayNum = parseInt(r.dueDate) || 1;
          const nextOccur = getNextOccurrenceDate(dayNum);
          const isCurrentOccurrenceActive = (daysUntilDue <= showDaysBefore) || (r.lastCompletedOccurrence === currentOccurDateString);
          
          if (isCurrentOccurrenceActive) {
            const nextMonthDate = new Date(nextOccur.getFullYear(), nextOccur.getMonth() + 1, dayNum);
            const y = nextMonthDate.getFullYear();
            const m = String(nextMonthDate.getMonth() + 1).padStart(2, '0');
            const d = String(nextMonthDate.getDate()).padStart(2, '0');
            nextMonthOccur = `${y}-${m}-${d}`;
          }

          filteredList.push({ 
            ...r, 
            originalIdx, 
            computedState: 'templates',
            displayDueDate: nextMonthOccur || currentOccurDateString
          });
        }

        // Upcoming tab
        if (_ohRemindersFilter === 'upcoming') {
          const alreadyCompleted = r.lastCompletedOccurrence === currentOccurDateString;
          if (daysUntilDue <= showDaysBefore && !alreadyCompleted) {
            filteredList.push({ 
              ...r, 
              originalIdx, 
              computedState: 'upcoming',
              displayDueDate: currentOccurDateString
            });
          }
        }
      } else {
        // One Time reminder
        let computedState = 'templates';
        if (daysUntilDue <= showDaysBefore) {
          computedState = 'upcoming';
        }

        if (computedState === _ohRemindersFilter) {
          filteredList.push({ 
            ...r, 
            originalIdx, 
            computedState,
            displayDueDate: currentOccurDateString
          });
        }
      }
    });

    if (filteredList.length === 0) {
      html += `
        <div class="oh-empty" style="margin-top:10px; padding: 40px 20px; background:#fff; border: 1px dashed #e2e8f0; border-radius:12px;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="color:#94a3b8;">
            <circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>
          </svg>
          <div class="oh-empty-title" style="font-size:14px; font-weight:700; color:var(--slate-500); margin-top:8px;">No ${_ohRemindersFilter} reminders</div>
          <div class="oh-empty-desc" style="font-size:12px; color:var(--slate-400); margin-top:4px;">
            ${_ohRemindersFilter === 'completed' ? 'Keep checking off your active reminders!' : _ohRemindersFilter === 'templates' ? 'Reminders and recurring templates configured will appear here.' : 'All clean! Active tasks scheduled to show up soon will appear here.'}
          </div>
        </div>
      `;
    } else {
      html += `<div class="oh-reminder-list-wrapper">`;
      
      filteredList.forEach((item) => {
        const idx = item.originalIdx;
        const r = ohReminders[idx];
        
        let isUrgent = false;
        if (item.displayDueDate && r.status !== 'Completed') {
          const dueTime = new Date(item.displayDueDate).getTime();
          const diffDays = Math.ceil((dueTime - nowTime) / (1000 * 60 * 60 * 24));
          if (diffDays <= 7) isUrgent = true;
        }

        html += `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 12px; background: ${isUrgent ? '#fff7ed' : '#ffffff'}; border-left: 4px solid ${isUrgent ? '#ea580c' : r.status==='Completed' ? '#10b981' : 'var(--blue-600)'}; margin-bottom: 10px; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
              ${_ohRemindersFilter === 'upcoming' ? `
                <!-- Tick check button -->
                <button class="oh-toggle-complete-btn" data-index="${idx}" style="background: none; border: none; padding: 0; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; outline: none; transition: transform 0.15s ease;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width: 22px; height: 22px; color: #cbd5e1;"><circle cx="12" cy="12" r="10"/></svg>
                </button>
              ` : ''}
              
              <!-- Title and ledger labels -->
              <div style="min-width: 0; flex: 1;">
                <div style="font-size: 13px; font-weight: 600; color: ${isUrgent ? '#c2410c' : 'var(--slate-800)'}; text-decoration: ${r.status === 'Completed' ? 'line-through' : 'none'}; opacity: ${r.status === 'Completed' ? 0.5 : 1}; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                  ${ohEsc(r.title || 'Untitled Reminder')}
                  ${r.amount ? ` <span style="color:#64748b; font-weight:500; font-size:12px;">(&#8377;${parseFloat(r.amount).toLocaleString('en-IN')} ${r.drCr === 'Credit' ? 'Cr' : 'Dr'})</span>` : ''}
                </div>
                <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
                  <span style="font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; background: ${getLedgerColor(coaLedgers.find(l => l.id == r.ledgerId)?.name || r.category || 'General')}; color: #ffffff; letter-spacing:0.02em;">
                    ${coaLedgers.find(l => l.id == r.ledgerId)?.name || r.category || 'General'}
                  </span>
                  <span style="font-size: 10px; color: var(--slate-400); font-weight:500;">&middot; ${r.type}</span>
                </div>
              </div>
            </div>
            
            <!-- Date Area & Action Icon -->
            <div style="display: flex; align-items: center; gap: 12px; flex-shrink: 0;">
              <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
                ${renderFriendlyDateArea(r, item.displayDueDate)}
              </div>
              
              <div style="display: flex; align-items: center; gap: 4px;">
                ${_ohRemindersFilter === 'completed' ? `
                  <!-- Revise button -->
                  <button class="oh-revise-reminder-btn" data-index="${idx}" style="border:1px solid #fed7aa; background:#ffedd5; color:#ea580c; height:26px; padding:0 10px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px; transition:all 0.15s; outline:none;" onmouseover="this.style.background='#ffdbb5';" onmouseout="this.style.background='#ffedd5';">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:11px;height:11px;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                    Revise
                  </button>
                ` : ''}

                ${_ohRemindersFilter === 'upcoming' ? `
                  <!-- Delete button (icon only) -->
                  <button class="oh-del-reminder-btn" data-index="${idx}" style="color: #cbd5e1; border: none; background: transparent; padding: 6px; cursor: pointer; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s; outline:none;" onmouseover="this.style.color='#ef4444'; this.style.background='#fee2e2';" onmouseout="this.style.color='#cbd5e1'; this.style.background='transparent';">
                    <svg viewBox="0 0 12 12" fill="none" style="width: 14px; height: 14px;"><path d="M2 3h8M5 3V2h2v1M4.5 5v4M7.5 5v4M3 3l.7 7h4.6L9 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </button>
                ` : ''}

                ${_ohRemindersFilter === 'templates' ? `
                  <!-- Edit button (icon only) -->
                  <button class="oh-edit-reminder-btn" data-index="${idx}" style="color: #cbd5e1; border: none; background: transparent; padding: 6px; cursor: pointer; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s; outline:none;" onmouseover="this.style.color='var(--blue-600)'; this.style.background='var(--blue-50)';" onmouseout="this.style.color='#cbd5e1'; this.style.background='transparent';">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  </button>

                  <!-- Delete button (icon only) -->
                  <button class="oh-del-reminder-btn" data-index="${idx}" style="color: #cbd5e1; border: none; background: transparent; padding: 6px; cursor: pointer; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s; outline:none;" onmouseover="this.style.color='#ef4444'; this.style.background='#fee2e2';" onmouseout="this.style.color='#cbd5e1'; this.style.background='transparent';">
                    <svg viewBox="0 0 12 12" fill="none" style="width: 14px; height: 14px;"><path d="M2 3h8M5 3V2h2v1M4.5 5v4M7.5 5v4M3 3l.7 7h4.6L9 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      });
      
      html += `</div>`;
    }

    wrap.innerHTML = html;

    // Attach filters click listeners
    const filterUpcoming = document.getElementById('ohFilterUpcoming');
    if (filterUpcoming) {
      filterUpcoming.addEventListener('click', () => {
        _ohRemindersFilter = 'upcoming';
        renderOhRemindersView();
      });
    }

    const filterCompleted = document.getElementById('ohFilterCompleted');
    if (filterCompleted) {
      filterCompleted.addEventListener('click', () => {
        _ohRemindersFilter = 'completed';
        renderOhRemindersView();
      });
    }

    const filterTemplates = document.getElementById('ohFilterTemplates');
    if (filterTemplates) {
      filterTemplates.addEventListener('click', () => {
        _ohRemindersFilter = 'templates';
        renderOhRemindersView();
      });
    }

    // Attach form controls click/change listeners if open
    if (_ohReminderFormOpen) {
      // Searchable ledger dropdown handlers
      const ledgerTrigger = document.getElementById('ohNewReminderLedgerTrigger');
      const ledgerDropdown = document.getElementById('ohNewReminderLedgerDropdown');
      const ledgerSearch = document.getElementById('ohNewReminderLedgerSearch');
      const ledgerList = document.getElementById('ohNewReminderLedgerList');

      const renderList = (searchQuery = '') => {
        if (!ledgerList) return;
        const ledgers = coaLedgers.filter(l => l.type === 'ledger');
        const query = searchQuery.toLowerCase().trim();
        const filtered = ledgers.filter(l => l.name.toLowerCase().includes(query));

        let listHtml = '';
        if (filtered.length === 0) {
          listHtml = `<div style="padding: 8px; font-size: 12px; color: var(--slate-400); text-align: center;">No matching ledgers</div>`;
        } else {
          listHtml = filtered.map(l => {
            const isSelected = l.id == _ohNewReminderLedgerId;
            return `
              <div class="oh-ledger-opt-item" data-id="${l.id}" data-name="${ohEsc(l.name)}" style="padding: 6px 8px; font-size: 12px; border-radius: 4px; cursor: pointer; color: ${isSelected ? '#ffffff' : 'var(--slate-700)'}; background: ${isSelected ? 'var(--blue-600)' : 'transparent'}; transition: all 0.12s;" onmouseover="if(this.style.background!=='var(--blue-600)') this.style.background='var(--slate-100)';" onmouseout="if(this.style.background!=='var(--blue-600)') this.style.background='transparent';">
                ${ohEsc(l.name)}
              </div>
            `;
          }).join('');
        }
        ledgerList.innerHTML = listHtml;
      };

      if (ledgerTrigger && ledgerDropdown) {
        ledgerTrigger.addEventListener('click', (e) => {
          e.stopPropagation();
          const isOpen = ledgerDropdown.style.display === 'block';
          ledgerDropdown.style.display = isOpen ? 'none' : 'block';
          if (!isOpen) {
            if (ledgerSearch) {
              ledgerSearch.value = '';
              ledgerSearch.focus();
            }
            renderList('');
          }
        });
      }

      if (ledgerSearch) {
        ledgerSearch.addEventListener('input', (e) => {
          renderList(e.target.value);
        });
        ledgerSearch.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }

      if (ledgerList) {
        ledgerList.addEventListener('click', (e) => {
          const item = e.target.closest('.oh-ledger-opt-item');
          if (item) {
            _ohNewReminderLedgerId = item.dataset.id;
            const span = ledgerTrigger.querySelector('span');
            if (span) span.textContent = item.dataset.name;
            ledgerDropdown.style.display = 'none';
            renderReminderJePreview();
          }
        });
      }

      // Close dropdown on click outside
      const closeDropdownHandler = (e) => {
        if (ledgerDropdown && !ledgerDropdown.contains(e.target) && !ledgerTrigger.contains(e.target)) {
          ledgerDropdown.style.display = 'none';
          document.removeEventListener('click', closeDropdownHandler);
        }
      };
      document.addEventListener('click', closeDropdownHandler);

      // Type Segment buttons click listeners
      const typeBtns = document.querySelectorAll('.oh-type-segment-btn');
      typeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const val = btn.dataset.value;
          _ohNewReminderType = val;
          if (_ohNewReminderType === 'Recurring') {
            if (_ohNewReminderDueDate && _ohNewReminderDueDate.includes('-')) {
              _ohNewReminderDueDate = String(parseInt(_ohNewReminderDueDate.split('-')[2]) || 1);
            } else {
              _ohNewReminderDueDate = '1';
            }
          } else {
            const dayNum = parseInt(_ohNewReminderDueDate) || 1;
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(dayNum).padStart(2, '0');
            _ohNewReminderDueDate = `${yyyy}-${mm}-${dd}`;
          }
          renderOhRemindersView();
        });
      });

      const dateInput = document.getElementById('ohNewReminderDateVal');
      if (dateInput) {
        dateInput.addEventListener('change', (e) => {
          _ohNewReminderDueDate = e.target.value;
        });
      }

      const dayBtn = document.getElementById('ohNewReminderDayBtn');
      if (dayBtn) {
        dayBtn.addEventListener('click', () => {
          showDayPickerPopover(dayBtn, -1);
        });
      }

      const titleInput = document.getElementById('ohNewReminderTitle');
      if (titleInput) {
        titleInput.addEventListener('input', (e) => {
          _ohNewReminderTitle = e.target.value;
        });
      }

      const daysBeforeInput = document.getElementById('ohNewReminderShowDaysBefore');
      if (daysBeforeInput) {
        daysBeforeInput.addEventListener('input', (e) => {
          _ohNewReminderShowDaysBefore = e.target.value;
        });
      }

      const amountInput = document.getElementById('ohNewReminderAmount');
      if (amountInput) {
        amountInput.addEventListener('input', (e) => {
          const val = e.target.value.trim();
          _ohNewReminderAmount = val;
          const drcrContainer = document.getElementById('ohNewReminderDrCrContainer');
          if (drcrContainer) {
            drcrContainer.style.display = val !== '' ? 'block' : 'none';
          }
          const ajContainer = document.getElementById('ohNewReminderAutoJournalContainer');
          if (ajContainer) {
            ajContainer.style.display = val !== '' ? 'block' : 'none';
          }
          renderReminderJePreview();
        });
      }

      // Auto Journal toggleSegment click listeners
      const autojournalBtns = document.querySelectorAll('.oh-autojournal-segment-btn');
      autojournalBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const val = btn.dataset.value === 'true';
          _ohNewReminderAutoJournal = val;
          autojournalBtns.forEach(b => {
            const active = (b.dataset.value === 'true') === _ohNewReminderAutoJournal;
            b.style.background = active ? '#ffffff' : 'transparent';
            b.style.color = active ? 'var(--blue-600)' : '#64748b';
            b.style.boxShadow = active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none';
          });
          
          const part = document.getElementById('ohNewReminderAutoJournalPart');
          if (part) {
            part.style.display = _ohNewReminderAutoJournal ? 'block' : 'none';
            if (_ohNewReminderAutoJournal) {
              renderOppEntriesListHtml();
            } else {
              renderReminderJePreview();
            }
          }
        });
      });

      const deptSel = document.getElementById('ohNewReminderDept');
      if (deptSel) {
        deptSel.addEventListener('change', (e) => {
          _ohNewReminderDeptId = e.target.value;
        });
      }

      const budgetBtns = document.querySelectorAll('.oh-budget-segment-btn');
      budgetBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const val = btn.dataset.value === 'true';
          _ohNewReminderIsBudget = val;
          budgetBtns.forEach(b => {
            const active = (b.dataset.value === 'true') === _ohNewReminderIsBudget;
            b.style.background = active ? '#ffffff' : 'transparent';
            b.style.color = active ? 'var(--blue-600)' : '#64748b';
            b.style.boxShadow = active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none';
          });
        });
      });

      const narrationInp = document.getElementById('ohNewReminderNarration');
      if (narrationInp) {
        narrationInp.addEventListener('input', (e) => {
          _ohNewReminderNarration = e.target.value;
        });
      }

      const addOppBtn = document.getElementById('ohAddOppEntryBtn');
      if (addOppBtn) {
        addOppBtn.addEventListener('click', () => {
          const oppDrCr = _ohNewReminderDrCr === 'Debit' ? 'Credit' : 'Debit';
          _ohNewReminderOppEntries.push({
            ledgerId: '',
            drCr: oppDrCr,
            amount: ''
          });
          renderOppEntriesListHtml();
        });
      }

      if (_ohReminderFormOpen && _ohNewReminderAutoJournal) {
        renderOppEntriesListHtml();
      }

      // Dr/Cr Segment buttons click listeners
      const drcrBtns = document.querySelectorAll('.oh-drcr-segment-btn');
      drcrBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const val = btn.dataset.value;
          _ohNewReminderDrCr = val;
          drcrBtns.forEach(b => {
            const active = b.dataset.value === _ohNewReminderDrCr;
            b.style.background = active ? '#ffffff' : 'transparent';
            b.style.color = active ? 'var(--blue-600)' : '#64748b';
            b.style.boxShadow = active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none';
          });
          
          if (_ohNewReminderAutoJournal) {
            renderOppEntriesListHtml();
          } else {
            renderReminderJePreview();
          }
        });
      });

      const submitBtn = document.getElementById('ohSubmitNewReminder');
      if (submitBtn) {
        submitBtn.addEventListener('click', () => {
          const title = document.getElementById('ohNewReminderTitle')?.value.trim();
          const amount = document.getElementById('ohNewReminderAmount')?.value.trim();
          const showDays = document.getElementById('ohNewReminderShowDaysBefore')?.value || '0';
          _ohNewReminderShowDaysBefore = parseInt(showDays) || 0;
          
          if (!title) {
            showToast('Please enter a reminder name.', 'error');
            return;
          }

          const isEdit = _ohReminderEditIndex !== null;
          if (isEdit) {
            const r = ohReminders[_ohReminderEditIndex];
            r.title = title;
            r.type = _ohNewReminderType;
            r.dueDate = _ohNewReminderDueDate;
            r.ledgerId = _ohNewReminderLedgerId;
            r.amount = amount;
            r.drCr = _ohNewReminderDrCr;
            r.autoJournal = _ohNewReminderAutoJournal;
            r.departmentId = _ohNewReminderDeptId;
            r.isBudget = _ohNewReminderIsBudget;
            r.transactionType = _ohNewReminderIsBudget ? 'Budget' : 'Non Budget';
            r.narration = _ohNewReminderNarration;
            r.oppEntries = _ohNewReminderOppEntries;
            r.showDaysBefore = _ohNewReminderShowDaysBefore;
          } else {
            ohReminders.push({
              title: title,
              type: _ohNewReminderType,
              dueDate: _ohNewReminderDueDate,
              ledgerId: _ohNewReminderLedgerId,
              amount: amount,
              drCr: _ohNewReminderDrCr,
              autoJournal: _ohNewReminderAutoJournal,
              departmentId: _ohNewReminderDeptId,
              isBudget: _ohNewReminderIsBudget,
              transactionType: _ohNewReminderIsBudget ? 'Budget' : 'Non Budget',
              narration: _ohNewReminderNarration,
              oppEntries: _ohNewReminderOppEntries,
              showDaysBefore: _ohNewReminderShowDaysBefore,
              status: 'Pending'
            });
          }

          _ohReminderFormOpen = false;
          _ohReminderEditIndex = null;
          _ohNewReminderTitle = '';
          _ohNewReminderAmount = '';
          _ohNewReminderDrCr = 'Debit';
          _ohNewReminderAutoJournal = false;
          _ohNewReminderDeptId = '';
          _ohNewReminderIsBudget = false;
          _ohNewReminderNarration = '';
          _ohNewReminderOppEntries = [];
          _ohNewReminderShowDaysBefore = 7;
          updateOhBadges();
          renderOhRemindersView();
          triggerAutoBackup();
          showToast(isEdit ? 'Reminder updated successfully.' : 'Reminder created successfully.', 'success');
        });
      }

      const cancelBtn = document.getElementById('ohCancelNewReminder');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          _ohReminderFormOpen = false;
          _ohReminderEditIndex = null;
          _ohNewReminderTitle = '';
          _ohNewReminderAmount = '';
          _ohNewReminderDrCr = 'Debit';
          _ohNewReminderAutoJournal = false;
          _ohNewReminderDeptId = '';
          _ohNewReminderIsBudget = false;
          _ohNewReminderNarration = '';
          _ohNewReminderOppEntries = [];
          _ohNewReminderShowDaysBefore = 7;
          renderOhRemindersView();
        });
      }

      // Automatically focus title input if creating new and it's empty
      if (_ohReminderEditIndex === null) {
        document.getElementById('ohNewReminderTitle')?.focus();
      }
    }

    if (!wrap._wired) {
      wrap._wired = true;
 
      // Handle delete, day picker, and checkbox toggle clicks
      wrap.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('.oh-toggle-complete-btn');
        if (toggleBtn) {
          const index = parseInt(toggleBtn.dataset.index);
          if (!isNaN(index)) {
            const r = ohReminders[index];
            if (r.status === 'Completed') return;

            let currentOccurDateString = '';
            if (r.type === 'Recurring' && r.dueDate) {
              const dayNum = parseInt(r.dueDate) || 1;
              const nextOccur = getNextOccurrenceDate(dayNum);
              const yyyy = nextOccur.getFullYear();
              const mm = String(nextOccur.getMonth() + 1).padStart(2, '0');
              const dd = String(nextOccur.getDate()).padStart(2, '0');
              currentOccurDateString = `${yyyy}-${mm}-${dd}`;
            }

            let entryId = '';
            if (r.autoJournal && r.amount) {
              const mainAmt = parseFloat(r.amount) || 0;
              let totalOppDr = 0;
              let totalOppCr = 0;
              
              (r.oppEntries || []).forEach(opp => {
                const amt = parseFloat(opp.amount) || 0;
                if (opp.drCr === 'Debit') totalOppDr += amt;
                else totalOppCr += amt;
              });

              const mainIsDr = r.drCr !== 'Credit';
              const mainDr = mainIsDr ? mainAmt : 0;
              const mainCr = mainIsDr ? 0 : mainAmt;

              const finalDr = mainDr + totalOppDr;
              const finalCr = mainCr + totalOppCr;

              if (Math.abs(finalDr - finalCr) > 0.01) {
                showToast('Cannot auto-post journal entry: Debits and Credits do not balance.', 'error');
                updateOhBadges();
                renderOhRemindersView();
                return;
              }

              const savedDueDate = r.dueDate;
              if (r.type === 'Recurring') {
                r.dueDate = currentOccurDateString;
              }
              entryId = postReminderJournalEntry(r);
              r.dueDate = savedDueDate;
            }

            if (r.type === 'Recurring') {
              if (!r.id) {
                r.id = 'rec_' + Math.random().toString(36).substr(2, 9);
              }
              r.lastCompletedOccurrence = currentOccurDateString;
              
              const occDate = new Date(currentOccurDateString);
              const formattedMonth = occDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

              const compRecord = {
                id: 'comp_' + Math.random().toString(36).substr(2, 9),
                title: `${r.title} (${formattedMonth})`,
                type: 'One Time',
                dueDate: currentOccurDateString,
                ledgerId: r.ledgerId,
                amount: r.amount,
                drCr: r.drCr,
                autoJournal: r.autoJournal,
                departmentId: r.departmentId,
                isBudget: r.isBudget,
                transactionType: r.transactionType,
                narration: r.narration,
                oppEntries: JSON.parse(JSON.stringify(r.oppEntries || [])),
                showDaysBefore: r.showDaysBefore,
                status: 'Completed',
                postedJournalId: entryId || undefined,
                recurringTemplateId: r.id
              };
              ohReminders.push(compRecord);
            } else {
              r.status = 'Completed';
              if (entryId) r.postedJournalId = entryId;
            }

            updateOhBadges();
            renderOhRemindersView();
            triggerAutoBackup();
            showToast('Reminder marked as completed.', 'success');
          }
        }

        const reviseBtn = e.target.closest('.oh-revise-reminder-btn');
        if (reviseBtn) {
          const index = parseInt(reviseBtn.dataset.index);
          if (!isNaN(index)) {
            const r = ohReminders[index];
            showKyaConfirm({
              title: 'Revise Completed Reminder?',
              message: 'Revising this completed reminder will set it back to Pending status and permanently delete its auto-posted journal entry. Are you sure you want to proceed?',
              confirmLabel: '↺ Revise',
              onConfirm: () => {
                if (r.recurringTemplateId) {
                  const template = ohReminders.find(t => t.id === r.recurringTemplateId);
                  if (template) {
                    template.lastCompletedOccurrence = '';
                  }
                  ohReminders.splice(index, 1);
                } else {
                  r.status = 'Pending';
                }

                if (r.postedJournalId) {
                  postedEntries = postedEntries.filter(ent => ent.id !== r.postedJournalId);
                  if (typeof refreshAllReports === 'function') {
                    refreshAllReports();
                  }
                }

                updateOhBadges();
                renderOhRemindersView();
                triggerAutoBackup();
                showToast('Reminder reverted to Pending.', 'success');
              }
            });
          }
        }
 
        const pickerBtn = e.target.closest('.oh-day-picker-btn');
        if (pickerBtn) {
          const index = parseInt(pickerBtn.dataset.index);
          if (!isNaN(index)) {
            showDayPickerPopover(pickerBtn, index);
          }
        }

        const editBtn = e.target.closest('.oh-edit-reminder-btn');
        if (editBtn) {
          const index = parseInt(editBtn.dataset.index);
          if (!isNaN(index)) {
            const r = ohReminders[index];
            _ohReminderFormOpen = true;
            _ohReminderEditIndex = index;
            _ohNewReminderType = r.type || 'One Time';
            _ohNewReminderDueDate = r.dueDate || '';
            _ohNewReminderLedgerId = r.ledgerId || '';
            _ohNewReminderTitle = r.title || '';
            _ohNewReminderAmount = r.amount || '';
            _ohNewReminderDrCr = r.drCr || 'Debit';
            _ohNewReminderAutoJournal = r.autoJournal === true;
            _ohNewReminderDeptId = r.departmentId || '';
            _ohNewReminderIsBudget = r.isBudget === true;
            _ohNewReminderNarration = r.narration || '';
            _ohNewReminderOppEntries = JSON.parse(JSON.stringify(r.oppEntries || []));
            _ohNewReminderShowDaysBefore = r.showDaysBefore !== undefined ? r.showDaysBefore : 7;
            renderOhRemindersView();
            
            // Focus and scroll
            setTimeout(() => {
              const inp = document.getElementById('ohNewReminderTitle');
              if (inp) {
                inp.focus();
                inp.select();
              }
              document.querySelector('.oh-reminder-form-card')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }
        }
 
        const delBtn = e.target.closest('.oh-del-reminder-btn');
        if (delBtn) {
          const index = parseInt(delBtn.dataset.index);
          if (!isNaN(index)) {
            const rem = ohReminders[index];
            showKyaConfirm({
              title: 'Delete Reminder?',
              message: `Permanently delete reminder <strong>${ohEsc(rem.title || 'Untitled')}</strong>?<br>This action cannot be undone.`,
              confirmLabel: '✕ Delete',
              onConfirm: () => {
                if (rem.postedJournalId) {
                  postedEntries = postedEntries.filter(ent => ent.id !== rem.postedJournalId);
                  if (typeof refreshAllReports === 'function') {
                    refreshAllReports();
                  }
                }
                ohReminders.splice(index, 1);
                updateOhBadges();
                renderOhRemindersView();
                triggerAutoBackup();
                showToast('Reminder deleted successfully.', 'success');
              }
            });
          }
        }
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  SETTINGS & VAULT (Local Storage Backup / Restore)
  // ══════════════════════════════════════════════════════════════════
  let _settingsActiveTab = ''; // empty/welcome state by default
  let _vaultWired = false;
  let _activeFolderHandle = null;
  let _activeFolderPermission = false;

  const KYA_DB_NAME = 'KyaFolderStorage';
  const KYA_STORE_NAME = 'handles';

