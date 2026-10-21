  // ══════════════════════════════════════════════════════════════════
  //  ONEHUB BUDGET — Budget management module
  //  (Split from onehub.js for maintainability)
  // ══════════════════════════════════════════════════════════════════

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

  // Budget is shown in Track Recorder → Budget
  function ohBudgetInTrackRecorder() {
    return typeof isTrackRecorderShowing === 'function' && isTrackRecorderShowing('budget');
  }

  function ohBudgetViewWrap() {
    return ohBudgetInTrackRecorder() ? document.getElementById('trBudgetView') : null;
  }

  // "Go to Departments" (no departments yet): Master Desk → Team Masters → Department
  function ohBudgetGoToDepartments() {
    openTab('master_desk');
    document.getElementById('masterTabDepartment')?.click();
  }

  // Department chips of a budget
  function ohBudgetDeptHtml(b) {
    const deptIds = b.deptIds !== undefined ? b.deptIds : (b.deptId !== undefined ? b.deptId : 'all');
    if (deptIds === 'all') return '<span class="oh-dept-chip">All Departments</span>';
    const ids = Array.isArray(deptIds) ? deptIds : [Number(deptIds)];
    const deptHtml = ids.map(id => {
      const d = ohGetDeptById(id);
      return d ? `<span class="oh-dept-chip">${ohEsc(d.name)}</span>` : '';
    }).filter(Boolean).join(' ');
    return deptHtml || '<span class="oh-no-dept-chip">Unassigned</span>';
  }

  // Department names of a budget (HTML-escaped): ['All Departments'] or one per department
  function ohBudgetDeptNames(b) {
    const deptIds = b.deptIds !== undefined ? b.deptIds : (b.deptId !== undefined ? b.deptId : 'all');
    if (deptIds === 'all') return ['All Departments'];
    const ids = Array.isArray(deptIds) ? deptIds : [Number(deptIds)];
    const names = ids.map(id => {
      const d = ohGetDeptById(id);
      return d ? ohEsc(d.name) : '';
    }).filter(Boolean);
    return names.length ? names : ['Unassigned'];
  }

  // Expense ledger names of a budget (HTML-escaped): ['All Expenses'] or one per ledger
  function ohBudgetLedgerNames(b) {
    const ledgerIds = b.ledgerIds !== undefined ? b.ledgerIds : (b.ledgerId !== undefined ? b.ledgerId : 'all');
    if (ledgerIds === 'all') return ['All Expenses'];
    const ids = Array.isArray(ledgerIds) ? ledgerIds : [Number(ledgerIds)];
    const names = ids.map(id => {
      const l = coaLedgers.find(x => x.id === id);
      return l ? ohEsc(l.name) : '';
    }).filter(Boolean);
    return names.length ? names : ['Unknown Ledger'];
  }

  function ohBudgetLedgerText(b) {
    return ohBudgetLedgerNames(b).join(', ');
  }

  // Spent, remaining and utilization of a budget, with its status badge and colour
  function ohBudgetUsage(b) {
    const expVal = ohGetBudgetExpense(b);
    const limitVal = Number(b.amount || 0);
    const remainVal = limitVal - expVal;
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
    return { expVal, limitVal, remainVal, realPct, barColor, statusBadge };
  }

  function renderOhBudgetView() {
    const wrap = ohBudgetViewWrap();
    if (!wrap) return;
    const inTr = ohBudgetInTrackRecorder();   // Track Recorder's list adds a Budget No. column

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
          <button class="oh-action-btn primary" style="margin-top: 16px; height: 36px; padding: 0 16px; border-radius: 8px;" onclick="ohBudgetGoToDepartments()">
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

      <!-- Toolbar (Track Recorder shows its search and department filter in the back bar) -->
      ${inTr ? '' : `
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
      </div>`}

      <!-- Data Table Card -->
      <div class="oh-table-card">
        <table class="oh-table">
          <thead>
            <tr>
              ${inTr ? '<th>Budget No.</th>' : ''}
              <th>Period</th>
              ${inTr ? '' : `
              <th>Department</th>
              <th>Ledger Account</th>`}
              <th style="text-align:right;">Budget Limit</th>
              <th style="text-align:right;">Actual Spent</th>
              <th style="text-align:right;">Remaining</th>
              ${inTr ? '' : `
              <th style="width:160px;">Utilization</th>
              <th>Status</th>
              <th style="text-align:right; width:120px;">Actions</th>`}
            </tr>
          </thead>
          <tbody>
    `;

    if (budgetsToRender.length === 0) {
      html += `
        <tr>
          <td colspan="${inTr ? 5 : 9}" class="oh-empty" style="padding:40px 16px;">
            <div class="oh-empty-title">No matching budgets found</div>
            <div class="oh-empty-desc">Adjust your search query or department filter.</div>
          </td>
        </tr>
      `;
    } else {
      budgetsToRender.forEach(b => {
        const deptHtml = ohBudgetDeptHtml(b);
        const ledgerText = ohBudgetLedgerText(b);
        const { expVal, limitVal, remainVal, realPct, barColor, statusBadge } = ohBudgetUsage(b);

        // Track Recorder's list: Budget No., Period, Budget Limit, Actual Spent, Remaining only;
        // the rest is in the row's Details / Transaction popup
        html += `
          <tr class="${b.isPaused ? 'oh-budget-row-paused' : ''}" data-bid="${b.id}" style="cursor:pointer;" title="${inTr ? 'Click to view details' : 'Click to view transactions'}">
            ${inTr ? `<td style="white-space:nowrap; font-weight:600; color:var(--slate-800);">${b.budgetNo ? ohEsc(b.budgetNo) : '&mdash;'}</td>` : ''}
            <td style="white-space:nowrap; font-weight:500;">
              ${b.fromDate} &rarr; ${b.toDate}
            </td>
            ${inTr ? '' : `
            <td>
              <div style="display:flex; flex-wrap:wrap; gap:4px;">${deptHtml}</div>
            </td>
            <td style="font-weight:600; color:var(--slate-800); max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${ledgerText}">
              ${ledgerText}
            </td>`}
            <td style="text-align:right; font-weight:600; font-variant-numeric: tabular-nums;">
              ${ohFmtAmt(limitVal)}
            </td>
            <td style="text-align:right; font-variant-numeric: tabular-nums;">
              ${ohFmtAmt(expVal)}
            </td>
            <td style="text-align:right; font-variant-numeric: tabular-nums; white-space:nowrap;" class="oh-budget-variance ${remainVal >= 0 ? 'positive' : 'negative'}">
              ${remainVal >= 0 ? '+' : ''}${ohFmtAmt(remainVal)}
            </td>
            ${inTr ? '' : `
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
            </td>`}
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
        if (inTr) showOhBudgetDetails(Number(row.dataset.bid));
        else showBudgetTransactions(Number(row.dataset.bid));
      });
    });
  }

  // Budget-flagged postings to the budget's expense ledgers within its period (and departments)
  function ohGetBudgetTransactions(b) {
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

    return { rows, ledgerLabel };
  }

  // Transactions table: Date, Particular, Voucher No, Debit, Credit and a Total row;
  // clicking a row opens its voucher
  function ohBudgetTransactionsTableHtml(rows) {
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

    return `
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
    `;
  }

  function showBudgetTransactions(budgetId) {
    const b = ohBudgets.find(x => x.id === budgetId);
    if (!b) return;
    const { rows, ledgerLabel } = ohGetBudgetTransactions(b);

    // Build modal
    document.getElementById('budgetTxOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'budgetTxOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:20px;';

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
          ${ohBudgetTransactionsTableHtml(rows)}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector('#budgetTxClose').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  }

  // ── Track Recorder: a budget row opens this popup ─────────────────
  // Blue title card: the Budget No., and on the right the Pause / Edit / Delete icons (as in the
  // Quotation / Proforma preview header), then the Details / Transaction slider (as Master Desk's
  // Create / Alter). Below it, the budget's full details or its transactions.
  // It sits under the voucher view (z-index 10001), so a transaction's voucher opens on top.
  // redraw: true when re-opened in place (after Pause / Resume), so it doesn't pop in again
  function showOhBudgetDetails(budgetId, view, redraw) {
    const b = ohBudgets.find(x => x.id === budgetId);
    if (!b) return;
    let current = view === 'transactions' ? 'transactions' : 'details';

    const { expVal, limitVal, remainVal, realPct, barColor, statusBadge } = ohBudgetUsage(b);
    const { rows } = ohGetBudgetTransactions(b);

    const detailRow = (label, valueHtml) => `
      <div style="display: grid; grid-template-columns: 150px 1fr; gap: 12px; align-items: start; padding: 10px 0; border-bottom: 1px solid var(--slate-100);">
        <div style="font-size: 12.5px; font-weight: 600; color: var(--slate-500); line-height: 20px;">${label}</div>
        <div style="font-size: 13.5px; font-weight: 600; color: var(--slate-800); font-variant-numeric: tabular-nums; line-height: 20px;">${valueHtml}</div>
      </div>`;
    // "All Departments" / "All Expenses" as one line; separate ones listed one under another
    const nameLines = names => names.map(n => `<div>${n}</div>`).join('');

    const headerIconBtn = (act, title, svg) => `
      <button type="button" data-bd-act="${act}" title="${title}" aria-label="${title}" style="background: rgba(255,255,255,0.15); border: none; border-radius: 8px; width: 34px; height: 34px; padding: 0; cursor: pointer; color: #fff; display: flex; align-items: center; justify-content: center; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">${svg}</button>`;
    const sliderBtn = (v, label) => `
      <button type="button" data-bd-view="${v}" role="tab" style="height: 28px; padding: 0 12px; font-size: 12.5px; border-radius: 6px; border: none; cursor: pointer; display: inline-flex; align-items: center; transition: all 0.15s ease; font-family: inherit;">${label}</button>`;

    const detailsHtml = [
      detailRow('Period', `${b.fromDate} &rarr; ${b.toDate}`),
      detailRow('Department', nameLines(ohBudgetDeptNames(b))),
      detailRow('Expense Account', nameLines(ohBudgetLedgerNames(b))),
      detailRow('Budget Limit', ohFmtAmt(limitVal)),
      detailRow('Actual Spent', ohFmtAmt(expVal)),
      detailRow('Remaining', `<span class="oh-budget-variance ${remainVal >= 0 ? 'positive' : 'negative'}">${remainVal >= 0 ? '+' : ''}${ohFmtAmt(remainVal)}</span>`),
      detailRow('Utilization', `<span style="color:${barColor};">${b.isPaused ? '—' : realPct.toFixed(0) + '%'}</span>`),
      detailRow('Status', statusBadge)
    ].join('');

    document.getElementById('ohBudgetDetailsOverlay')?._close?.();
    const overlay = document.createElement('div');
    overlay.className = 'oh-modal-overlay';
    overlay.id = 'ohBudgetDetailsOverlay';
    overlay.style.zIndex = '9999';
    if (redraw) overlay.style.animation = 'none';

    overlay.innerHTML = `
      <div class="oh-modal-card" role="dialog" aria-modal="true" aria-label="Budget ${ohEsc(b.budgetNo || '')}" style="max-width: 760px; padding: 0; overflow: hidden; display: flex; flex-direction: column;${redraw ? ' animation: none;' : ''}">
        <!-- Blue title card: Budget No. on the left; action icons, then the Details / Transaction slider on the right -->
        <div style="background: linear-gradient(90deg, var(--blue-700), var(--blue-500)); padding: 14px 24px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; flex-shrink: 0;">
          <div style="color: var(--white); font-weight: 700; font-size: 16px; margin-right: auto;">${b.budgetNo ? ohEsc(b.budgetNo) : ''}</div>
          ${b.isPaused
            ? headerIconBtn('pause', 'Resume Budget', '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>')
            : headerIconBtn('pause', 'Pause Budget', '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>')}
          ${headerIconBtn('edit', 'Edit Budget', '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>')}
          ${headerIconBtn('delete', 'Delete Budget', '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>')}
          <div role="tablist" aria-label="Budget view" style="display: inline-flex; align-items: center; background: rgba(0, 0, 0, 0.22); padding: 3px; border-radius: 8px; border: 1.5px solid rgba(255, 255, 255, 0.35); gap: 3px; margin-left: 8px;">
            ${sliderBtn('details', 'Details')}
            ${sliderBtn('transactions', 'Transaction')}
          </div>
        </div>

        <div style="padding: 10px 28px 24px; overflow-y: auto;">
          <div data-bd-pane="details" style="display: ${current === 'details' ? 'block' : 'none'};">${detailsHtml}</div>
          <div data-bd-pane="transactions" style="display: ${current === 'transactions' ? 'block' : 'none'}; margin-top: 10px; border: 1px solid var(--slate-200); border-radius: 12px; overflow: auto; max-height: 55vh;">
            ${ohBudgetTransactionsTableHtml(rows)}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    };
    overlay._close = close;   // used when it is redrawn, and when its budget is deleted
    const onKey = e => {
      // Escape closes this popup unless another popup (voucher, confirm, edit) is open over it
      if (e.key === 'Escape' && !document.querySelector('.fj-overlay, #kyaConfirmOverlay, #ohBudgetModal')) close();
    };
    document.addEventListener('keydown', onKey);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    // Slider: the active option is a white pill (as Master Desk's Create / Alter); swap the pane
    const applySlider = () => {
      overlay.querySelectorAll('[data-bd-view]').forEach(x => {
        const on = x.dataset.bdView === current;
        x.setAttribute('aria-selected', String(on));
        x.style.fontWeight = on ? '700' : '600';
        x.style.background = on ? '#ffffff' : 'transparent';
        x.style.color = on ? '#1e3a8a' : 'rgba(255,255,255,0.85)';
        x.style.boxShadow = on ? '0 1px 3px rgba(0,0,0,0.2)' : 'none';
      });
      overlay.querySelectorAll('[data-bd-pane]').forEach(p => {
        p.style.display = p.dataset.bdPane === current ? 'block' : 'none';
      });
    };
    applySlider();
    overlay.querySelectorAll('[data-bd-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        current = btn.dataset.bdView;
        applySlider();
      });
    });

    overlay.querySelector('[data-bd-act="pause"]').addEventListener('click', () => {
      toggleOhBudgetPause(budgetId);
      showOhBudgetDetails(budgetId, current, true);   // redraw with the new status
    });
    overlay.querySelector('[data-bd-act="edit"]').addEventListener('click', () => {
      close();
      openOhBudgetModal(budgetId);
    });
    overlay.querySelector('[data-bd-act="delete"]').addEventListener('click', () => deleteOhBudget(budgetId));
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

  // ── Budget No. (Track Recorder's pop-up) ──────────────────────────
  // Auto: the next free number from the number format (✎ in the box opens the Number Format
  // popup shared with the Invoice / Quotation: prefix, starting number, digits). Manual: typed
  // over. Like invoice numbers, a saved number stays used even after its budget is deleted.
  const OH_BUDGET_NO_KIND = 'budget';

  function ohBudgetNoSettings() {
    if (typeof getSalesNumberingSettings === 'function') return getSalesNumberingSettings(OH_BUDGET_NO_KIND);
    return { prefix: `BGT-${new Date().getFullYear()}-`, start: 1, digits: 3 };
  }

  function ohFormatBudgetNo(s, n) {
    return s.prefix + String(n).padStart(s.digits, '0');
  }

  // Every number in use: the register of numbers ever saved plus the budgets on file
  function ohGetUsedBudgetNos() {
    const reg = ((window.KYA_STORE || {}).salesUsedInvoiceNos || {})[OH_BUDGET_NO_KIND] || [];
    const used = new Set(reg.map(n => String(n).trim().toLowerCase()));
    ohBudgets.forEach(b => {
      const no = String(b.budgetNo || '').trim().toLowerCase();
      if (no) used.add(no);
    });
    return used;
  }

  // True when the number is taken. The budget being edited may keep its own number.
  function ohIsBudgetNoUsed(budgetNo, ownId) {
    const no = String(budgetNo || '').trim().toLowerCase();
    if (!no) return false;
    const own = ownId ? ohBudgets.find(x => x.id === ownId) : null;
    if (own && String(own.budgetNo || '').trim().toLowerCase() === no) return false;
    return ohGetUsedBudgetNos().has(no);
  }

  function ohGetNextBudgetNo() {
    const s = ohBudgetNoSettings();
    const used = ohGetUsedBudgetNos();
    let n = s.start;
    while (used.has(ohFormatBudgetNo(s, n).toLowerCase())) n++;
    return ohFormatBudgetNo(s, n);
  }

  // Shows or clears the "already used" line under the Budget No. box
  function ohValidateBudgetNoField() {
    const inp = document.getElementById('ohBudgetNo');
    if (!inp) return true;
    const no = inp.value.trim();
    const used = ohIsBudgetNoUsed(no, _ohBudgetModalEditId);
    inp.style.borderColor = used ? '#ef4444' : '';
    const wrap = inp.parentElement;
    wrap.classList.toggle('has-invno-error', used);
    if (used) wrap.setAttribute('data-error-full', `"${no}" is already used. Budget numbers can't be reused, even after deletion.`);
    else wrap.removeAttribute('data-error-full');
    const err = document.getElementById('ohBudgetNoError');
    if (err) {
      err.textContent = used ? `"${no}" is already used` : '';
      err.style.display = used ? 'block' : 'none';
    }
    return !used;
  }

  function ohOpenBudgetNoFormat() {
    if (typeof openKyaNumberingModal !== 'function') return;
    openKyaNumberingModal({
      kind: OH_BUDGET_NO_KIND,
      noun: 'Budget',
      getUsed: ohGetUsedBudgetNos,
      onSaved: () => {
        const inp = document.getElementById('ohBudgetNo');
        if (!inp) return;
        const s = ohBudgetNoSettings();
        inp.placeholder = ohFormatBudgetNo(s, s.start);
        // A new budget takes the new format; a saved one keeps its number
        const own = _ohBudgetModalEditId ? ohBudgets.find(x => x.id === _ohBudgetModalEditId) : null;
        if (!(own && own.budgetNo)) inp.value = ohGetNextBudgetNo();
        ohValidateBudgetNoField();
      }
    });
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

    // Track Recorder's form: From / To, Department, Expense Account and Amount only (no Pause switch),
    // and no title or × (it closes with Cancel or a click outside)
    const trForm = ohBudgetInTrackRecorder();
    const noFmt = ohBudgetNoSettings();

    overlay.innerHTML = `
      <div class="oh-modal-card" role="dialog" aria-modal="true" aria-label="${b ? 'Edit Budget' : 'New Budget'}">
        ${trForm ? '' : `
        <div class="oh-modal-hdr">
          <div class="oh-modal-title">${b ? 'Edit Budget' : 'New Budget'}</div>
          <button class="oh-modal-close" id="ohBudgetModalClose" aria-label="Close">&times;</button>
        </div>`}
        <div class="oh-modal-body">
          ${trForm ? `
          <div class="oh-fg">
            <label class="oh-label" for="ohBudgetNo">Budget No. <span class="req">*</span></label>
            <div class="kya-docno-wrap" style="position: relative; width: 100%;">
              <input class="oh-input" id="ohBudgetNo" type="text" aria-describedby="ohBudgetNoError" style="padding-right: 40px;"
                     value="${ohEsc(b && b.budgetNo ? b.budgetNo : ohGetNextBudgetNo())}" placeholder="${ohEsc(ohFormatBudgetNo(noFmt, noFmt.start))}">
              <button type="button" id="ohBudgetNoFormatBtn" class="sales-invno-edit-btn" style="top: 6px;" title="Set budget number prefix" aria-label="Set budget number prefix">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
              </button>
              <div id="ohBudgetNoError" role="alert" class="sales-invno-error" style="display: none;"></div>
            </div>
          </div>` : ''}
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
            <label class="oh-label">${trForm ? 'Expense Account' : 'Ledger Account'} <span class="req">*</span></label>
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
          ${trForm ? '' : `
          <div class="oh-fg" style="margin-top: 20px; display: flex; align-items: center; justify-content: space-between; background: var(--slate-50); padding: 12px 16px; border-radius: 14px; border: 1px solid var(--slate-100);">
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <span style="font-size: 13.5px; font-weight: 700; color: var(--slate-800);">Pause Budget</span>
              <span style="font-size: 11.5px; color: var(--slate-400);">Temporarily suspend calculations and limit enforcement</span>
            </div>
            <label class="switch-toggle" style="margin-bottom: 0;">
              <input type="checkbox" id="ohBudgetIsPaused" ${b && b.isPaused ? 'checked' : ''}>
              <span class="switch-slider"></span>
            </label>
          </div>`}
        </div>
        <div class="oh-modal-btns">
          <button class="oh-btn-cancel" id="ohBudgetCancelBtn">Cancel</button>
          <button class="oh-btn-save" id="ohBudgetSaveBtn">${b ? 'Save Changes' : 'Create Budget'}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('ohBudgetNo')?.addEventListener('input', ohValidateBudgetNoField);
    document.getElementById('ohBudgetNoFormatBtn')?.addEventListener('click', e => {
      e.preventDefault();
      ohOpenBudgetNoFormat();
    });

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

    document.getElementById('ohBudgetModalClose')?.addEventListener('click', closeOhBudgetModal);
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
    const noInp     = document.getElementById('ohBudgetNo');   // Track Recorder's pop-up only
    const budgetNo  = noInp ? noInp.value.trim() : '';

    let err = false;

    if (noInp && !budgetNo) { noInp.classList.add('error'); err = true; }
    if (noInp && ohIsBudgetNoUsed(budgetNo, _ohBudgetModalEditId)) {
      showToast(`Budget No. "${budgetNo}" is already used (even deleted numbers can't be reused). Please use another number.`, 'danger');
      ohValidateBudgetNoField();
      err = true;
    }
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
        noInp?.classList.remove('error');
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

    // Track Recorder's form has no Pause switch: an edited budget keeps its paused state
    const pauseInp = document.getElementById('ohBudgetIsPaused');
    const editingBudget = _ohBudgetModalEditId ? ohBudgets.find(x => x.id === _ohBudgetModalEditId) : null;
    const isPausedVal = pauseInp ? pauseInp.checked === true : !!(editingBudget && editingBudget.isPaused);

    if (_ohBudgetModalEditId) {
      const b = ohBudgets.find(x => x.id === _ohBudgetModalEditId);
      if (b) {
        if (noInp) b.budgetNo = budgetNo;
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
        ...(noInp ? { budgetNo } : {}),
        deptIds,
        ledgerIds,
        fromDate,
        toDate,
        amount: amt,
        isPaused: isPausedVal
      });
      showToast('Budget created successfully.', 'success');
    }

    // A saved Budget No. stays used for good, even if the budget is deleted later
    if (budgetNo && typeof registerUsedSalesInvoiceNo === 'function') registerUsedSalesInvoiceNo(OH_BUDGET_NO_KIND, budgetNo);

    closeOhBudgetModal();
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
        document.getElementById('ohBudgetDetailsOverlay')?._close?.();   // Track Recorder's popup
        showToast('Budget deleted.', 'success');
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
      renderOhBudgetView();
      triggerAutoBackup();
    }
  }

