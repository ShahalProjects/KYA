  // ══════════════════════════════════════════════════════════════════
  //  ONEHUB REMINDERS — Main reminders view renderer
  //  (Split from onehub.js for maintainability)
  // ══════════════════════════════════════════════════════════════════

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

