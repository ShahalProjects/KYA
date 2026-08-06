  // ══════════════════════════════════════════════════════════════════
  //  ONEHUB REMINDERS — Helpers, JE preview, form rendering
  //  (Split from onehub.js for maintainability)
  // ══════════════════════════════════════════════════════════════════

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

