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

