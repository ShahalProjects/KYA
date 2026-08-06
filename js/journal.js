  function fmtNum(n) {
    if (!n || isNaN(n)) return '0.00';
    return Number(n).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });
  }
  function evaluateMathExpression(str) {
    let clean = (str || '').toString().replace(/,/g, '').trim();
    if (!clean) return 0;
    clean = clean.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
    if (!/^[0-9.+\-*/()\s]+$/.test(clean)) {
      return NaN;
    }
    try {
      const result = Function(`"use strict"; return (${clean})`)();
      return typeof result === 'number' && isFinite(result) ? result : NaN;
    } catch (e) {
      return NaN;
    }
  }

  function parseAmt(str) {
    const cleanStr = (str || '').toString().replace(/,/g, '').trim();
    if (/[\+\-\*\/\%]/.test(cleanStr)) {
      const evalVal = evaluateMathExpression(cleanStr);
      if (!isNaN(evalVal)) {
        return evalVal;
      }
    }
    const v = parseFloat(cleanStr);
    return isNaN(v) ? 0 : v;
  }
  function genVoucherNo() {
    const y = new Date().getFullYear();
    return `JV-${y}-${String(jvCounter).padStart(3,'0')}`;
  }

  // ── Focus helpers ─────────────────────────────────────────────────
  function focusParticularsOfRow(id) {
    setTimeout(() => {
      const inp = document.querySelector(`[data-row-id="${id}"] .je-particulars-input`);
      if (inp) inp.focus();
    }, 60);
  }
  function focusDebitOfRow(id) {
    setTimeout(() => {
      const tr = document.querySelector(`[data-row-id="${id}"]`);
      if (!tr) return;
      const amtInputs = tr.querySelectorAll('.je-amount-input');
      if (amtInputs[0]) { amtInputs[0].focus(); amtInputs[0].select(); }
    }, 60);
  }

  // Focus the debit/credit amount of the row BEFORE the given row id
  function focusPrevRowDebit(currentId) {
    const idx = jeRows.findIndex(r => r.id === currentId);
    if (idx <= 0) return;               // already the first row
    const prevId = jeRows[idx - 1].id;
    focusDebitOfRow(prevId);
  }
  function focusFirstParticulars() {
    const inp = document.querySelector('#jeEntryBody .je-particulars-input');
    if (inp) inp.focus();
  }

  // ── Date → Enter → first particulars ─────────────────────────────
  document.getElementById('jeDate').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); focusFirstParticulars(); }
  });

  // ── Voucher No → Enter → first particulars ────────────────────────
  document.getElementById('jeVoucherNo').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); focusFirstParticulars(); }
  });

  // ── Narration → Ctrl+Enter → Post Entry & Auto-grow height ─────────
  const jeNarrationEl = document.getElementById('jeNarration');
  if (jeNarrationEl) {
    jeNarrationEl.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        showSavePopup();
      }
    });
    jeNarrationEl.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(Math.max(this.scrollHeight, 72), 180) + 'px';
    });
  }

  // ── Department helpers ────────────────────────────────────────────
  function populateJeDepartments() {
    const sel = document.getElementById('jeDepartment');
    if (!sel) return;
    const cur = sel.value || '';
    sel.innerHTML = '<option value="">&mdash; Select Department &mdash;</option>';
    const depts = ohDepartments || [];
    depts.forEach(d => {
      if (d.id === 'all') return;
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.name;
      sel.appendChild(opt);
    });
    // Restore previous selection if still valid
    if ([...sel.options].some(o => o.value === String(cur))) sel.value = cur;
    else sel.value = '';
  }

  // ── Budget toggle UI updater ──────────────────────────────────────
  function updateJeBudgetToggleUI() {
    const tog = document.getElementById('jeBudgetToggle');
    const left = document.getElementById('jeBudgetLabelLeft');
    const right = document.getElementById('jeBudgetLabelRight');
    if (!tog || !left || !right) return;
    if (tog.checked) {
      // Budget active
      left.style.color  = 'var(--slate-400)';
      left.style.fontWeight = '600';
      right.style.color = 'var(--blue-600)';
      right.style.fontWeight = '700';
    } else {
      // Non Budget active
      left.style.color  = 'var(--slate-800)';
      left.style.fontWeight = '700';
      right.style.color = 'var(--slate-400)';
      right.style.fontWeight = '600';
    }
  }

  // ── Initialise form defaults ──────────────────────────────────────
  function initFormDefaults() {
    const d = new Date();
    const iso = d.toISOString().split('T')[0];
    document.getElementById('jeDate').value = iso;
    const vn = genVoucherNo();
    document.getElementById('jeVoucherNo').value = vn;
    document.getElementById('jeVoucherChipDisplay').textContent = vn;
    document.getElementById('jeNarration').value = '';
    populateJeDepartments();
    const deptSel = document.getElementById('jeDepartment');
    if (deptSel) deptSel.value = '';
    const tog = document.getElementById('jeBudgetToggle');
    if (tog) { tog.checked = false; updateJeBudgetToggleUI(); }
    jeRows = [];
    jeCounter = 1;
    addRow('By');    // first row is always "By" by default
    refreshTotals();
    window._editingJournalEntry = null;
  }

  function loadJournalEntry(entry, isDraft) {
    openTab('journal');
    
    document.getElementById('jeDate').value = entry.date || '';
    document.getElementById('jeVoucherNo').value = entry.voucherNo || '';
    document.getElementById('jeVoucherChipDisplay').textContent = entry.voucherNo || '—';
    document.getElementById('jeNarration').value = entry.narration || '';
    
    const prepEl = document.getElementById('jePreparedBy');
    if (prepEl) prepEl.value = entry.preparedBy || '';
    
    populateJeDepartments();
    const deptSel = document.getElementById('jeDepartment');
    if (deptSel) deptSel.value = entry.departmentId || '';
    
    const tog = document.getElementById('jeBudgetToggle');
    if (tog) {
      tog.checked = !!entry.isBudget;
      updateJeBudgetToggleUI();
    }
    
    jeRows = JSON.parse(JSON.stringify(entry.allRows));
    jeCounter = 1;
    jeRows.forEach(row => {
      row.id = jeCounter++;
    });
    
    renderRows();
    refreshTotals();
    
    window._editingJournalEntry = { id: entry.id, isDraft: isDraft };
  }

  // ── Sync voucher chip with input ──────────────────────────────────
  document.getElementById('jeVoucherNo').addEventListener('input', function() {
    document.getElementById('jeVoucherChipDisplay').textContent = this.value || '—';
  });

  // ── Add a row ─────────────────────────────────────────────────────
  function addRow(defaultType, focusDebit) {
    const id = jeCounter++;
    jeRows.push({ id, type: defaultType || 'By', particular: '', debit: '', credit: '' });
    renderRows();
    if (focusDebit) focusDebitOfRow(id);
    else focusParticularsOfRow(id);
  }

  // ── Delete a row ──────────────────────────────────────────────────
  function deleteRow(id) {
    if (jeRows.length <= 1) return;  // keep at least 1 row
    jeRows = jeRows.filter(r => r.id !== id);
    renderRows();
    refreshTotals();
  }

  // ── Render all rows ───────────────────────────────────────────────
  function renderRows() {
    const tbody = document.getElementById('jeEntryBody');
    tbody.innerHTML = '';

    jeRows.forEach((row, idx) => {
      const isBy  = row.type === 'By';
      const isFirst = idx === 0;

      const tr = document.createElement('tr');
      tr.className = 'je-row';
      tr.dataset.rowId = row.id;

      // ── S.No
      const tdSno = document.createElement('td');
      tdSno.innerHTML = `<span class="je-sno">${idx + 1}</span>`;

      // ── Type select
      const tdType = document.createElement('td');
      const sel = document.createElement('select');
      sel.className = 'je-type-select ' + (isBy ? 'type-by' : 'type-to');
      sel.setAttribute('aria-label', 'Entry type');
      sel.innerHTML = `<option value="By" ${isBy ? 'selected' : ''}>By</option>
                       <option value="To" ${!isBy ? 'selected' : ''}>To</option>`;
      sel.addEventListener('change', () => {
        row.type = sel.value;
        sel.className = 'je-type-select ' + (sel.value === 'By' ? 'type-by' : 'type-to');
        // Move any existing amount to the correct bucket
        if (sel.value === 'By') { row.debit = row.credit || row.debit; row.credit = ''; }
        else                    { row.credit = row.debit || row.credit; row.debit  = ''; }
        refreshTotals();
        renderRows();
      });
      tdType.appendChild(sel);

      // ── Particulars
      const tdPart = document.createElement('td');
      tdPart.appendChild(buildParticularsCell(row, isFirst));

      // ── Single Amount column (Debit if By, Credit if To)
      const tdAmt = document.createElement('td');
      tdAmt.style.textAlign = 'right';

      const inpAmt = document.createElement('input');
      inpAmt.type        = 'text';
      inpAmt.inputMode   = 'decimal';
      inpAmt.placeholder = isBy ? 'Dr Amount' : 'Cr Amount';
      inpAmt.value       = isBy ? (row.debit || '') : (row.credit || '');
      inpAmt.className   = 'je-amount-input ' + (isBy ? 'amt-debit' : 'amt-credit');
      inpAmt.setAttribute('aria-label', isBy ? 'Debit amount' : 'Credit amount');

      inpAmt.addEventListener('focus', () => {
        const thisTr = document.querySelector(`[data-row-id="${row.id}"]`);
        if (thisTr) {
          const partInp = thisTr.querySelector('.je-particulars-input');
          if (partInp && partInp.value.trim() === '') {
            partInp.focus();
            showToast('Please select a ledger account in Particulars first.', 'warning');
          }
        }
      });

      inpAmt.addEventListener('input', () => {
        if (isBy) { row.debit  = inpAmt.value; row.credit = ''; }
        else      { row.credit = inpAmt.value; row.debit  = ''; }
        refreshTotals();
      });

      inpAmt.addEventListener('blur', () => {
        const v = parseAmt(inpAmt.value);
        if (v) {
          const fmt = v.toFixed(2);
          inpAmt.value = fmt;
          if (isBy) { row.debit = fmt; row.credit = ''; }
          else      { row.credit = fmt; row.debit  = ''; }
        } else {
          inpAmt.value = '';
          if (isBy) row.debit = ''; else row.credit = '';
        }
        refreshTotals();
      });

      // ── Keyboard shortcuts on Amount field
      inpAmt.addEventListener('keydown', e => {
        if (e.key === 'Enter' || (e.key === ' ' && !/[\+\-\*\/\(]\s*$/.test(inpAmt.value))) {
          e.preventDefault();

          // Commit current amount first
          const v = parseAmt(inpAmt.value);
          if (!v || v <= 0) {
            showToast('Please enter an amount greater than zero.', 'warning');
            return;
          }

          const fmt = v.toFixed(2);
          inpAmt.value = fmt;
          if (isBy) row.debit = fmt; else row.credit = fmt;
          refreshTotals();

          // After committing, re-check balance
          let totalDr = 0, totalCr = 0;
          jeRows.forEach(r => { totalDr += parseAmt(r.debit); totalCr += parseAmt(r.credit); });
          const balanced = totalDr > 0 && Math.abs(totalDr - totalCr) < 0.005;

          if (balanced) {
            // Entry is balanced → jump straight to Narration
            document.getElementById('jeNarration').focus();
          } else {
            // Not balanced → create next row
            if (e.key === 'Enter') addRow('To');
            else                   addRow('By');
          }

        } else if (e.key === 'Tab') {
          const v = parseAmt(inpAmt.value);
          if (!v || v <= 0) {
            e.preventDefault();
            showToast('Please enter an amount greater than zero.', 'warning');
          }
        } else if (e.key === 'Backspace' && inpAmt.value === '') {
          // Amount is empty → step back to Particulars of the same row
          e.preventDefault();
          const thisTr = document.querySelector(`[data-row-id="${row.id}"]`);
          if (thisTr) {
            const partInp = thisTr.querySelector('.je-particulars-input');
            if (partInp) partInp.focus();
          }
        }
      });

      tdAmt.appendChild(inpAmt);

      // ── Delete button
      const tdDel = document.createElement('td');
      const delBtn = document.createElement('button');
      delBtn.className = 'je-del-btn';
      delBtn.setAttribute('aria-label', 'Delete row');
      delBtn.innerHTML = `<svg viewBox="0 0 13 13" fill="none"><path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
      delBtn.addEventListener('click', () => {
        if (isFirst) {
          // First row: clear fields rather than removing the row
          row.particular = '';
          row.debit      = '';
          row.credit     = '';
          refreshTotals();
          renderRows();
          focusParticularsOfRow(row.id);
        } else {
          focusPrevRowDebit(row.id);
          deleteRow(row.id);
        }
      });
      tdDel.appendChild(delBtn);

      tr.appendChild(tdSno);
      tr.appendChild(tdType);
      tr.appendChild(tdPart);
      tr.appendChild(tdAmt);
      tr.appendChild(tdDel);
      tbody.appendChild(tr);
    });
  }

  // ── Global portal dropdown (single instance shared by all rows) ──────────
  const _jePortal = (() => {
    const el = document.createElement('div');
    el.id = 'je-portal-dropdown';
    document.body.appendChild(el);

    // Group accent colours matching CoA main groups
    const GROUP_COLORS = {
      assets:               '#3b82f6',
      'equity-liabilities': '#8b5cf6',
      income:               '#10b981',
      expense:              '#f59e0b',
    };

    function _dotColor(l) {
      const sg = (typeof COA_SYS_SGS !== 'undefined')
        ? COA_SYS_SGS.find(s => s.id === l.sgId) : null;
      return (sg && GROUP_COLORS[sg.main]) || '#94a3b8';
    }

    function _hl(text, q) {
      if (!q) return text;
      const i = text.toLowerCase().indexOf(q.toLowerCase());
      if (i < 0) return text;
      return text.slice(0, i)
        + `<span class="je-drop-hl">${text.slice(i, i + q.length)}</span>`
        + text.slice(i + q.length);
    }

    let _activeInp    = null;
    let _activeCb     = null;
    let _highlightIdx = -1;
    let _open         = false;

    function _items() { return el.querySelectorAll('.je-drop-item'); }

    function _setHL(idx) {
      const items = _items();
      items.forEach(it => it.classList.remove('highlighted'));
      _highlightIdx = idx;
      if (idx >= 0 && idx < items.length) {
        items[idx].classList.add('highlighted');
        items[idx].scrollIntoView({ block: 'nearest' });
      }
    }

    function _position(inp) {
      const r          = inp.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom - 8;
      const spaceAbove = r.top - 8;
      const maxH       = Math.min(280, Math.max(spaceBelow, spaceAbove) - 8);
      el.style.maxHeight = maxH + 'px';
      el.style.width     = Math.max(r.width, 260) + 'px';
      el.style.left      = r.left + 'px';
      if (spaceBelow >= 140 || spaceBelow >= spaceAbove) {
        el.style.top    = (r.bottom + 6) + 'px';
        el.style.bottom = 'auto';
      } else {
        el.style.top    = 'auto';
        el.style.bottom = (window.innerHeight - r.top + 6) + 'px';
      }
    }

    function open(inp, query, onSelect) {
      _activeInp    = inp;
      _activeCb     = onSelect;
      _highlightIdx = -1;
      const q = (query || '').toLowerCase().trim();

      const matches = coaLedgers
        .filter(l => {
          if (l.type !== 'ledger') return false;
          const nm = l.name.toLowerCase().includes(q);
          const ak = l.aliases && l.aliases.some(a => a.toLowerCase().includes(q));
          return nm || ak;
        })
        .sort((a, b) => {
          const as = a.name.toLowerCase().startsWith(q) ? 0 : 1;
          const bs = b.name.toLowerCase().startsWith(q) ? 0 : 1;
          return as - bs || a.name.localeCompare(b.name);
        });

      el.innerHTML = '';

      if (!matches.length) {
        el.innerHTML = `
          <div class="je-drop-empty">
            <svg class="je-drop-empty-icon" width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="14" cy="14" r="9" stroke="currentColor" stroke-width="1.8"/>
              <path d="M21 21l6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
            <span class="je-drop-empty-txt">No ledger found</span>
            <span class="je-drop-empty-sub">Try a different name or add it in Chart of Accounts</span>
          </div>`;
      } else {
        const GROUP_LABELS = {
          assets: 'Assets', 'equity-liabilities': 'Equity & Liabilities',
          income: 'Income', expense: 'Expense'
        };
        let lastGroup = null;

        matches.forEach(acct => {
          const sg     = (typeof COA_SYS_SGS !== 'undefined')
            ? COA_SYS_SGS.find(s => s.id === acct.sgId) : null;
          const grpKey = sg ? sg.main : '__other__';

          if (grpKey !== lastGroup) {
            lastGroup = grpKey;
            const hdr = document.createElement('div');
            hdr.className   = 'je-drop-header';
            hdr.textContent = GROUP_LABELS[grpKey] || 'Other';
            el.appendChild(hdr);
          }

          const item = document.createElement('div');
          item.className = 'je-drop-item';
          const akaStr = acct.aliases && acct.aliases.length > 0 ? ` [A.K.A: ${acct.aliases.join(', ')}]` : '';
          item.innerHTML = `
            <span class="je-drop-dot" style="background:${_dotColor(acct)}"></span>
            <span class="je-drop-name">${_hl(acct.name, query)}${akaStr ? `<span style="font-size:11px;color:#94a3b8;margin-left:4px">${_hl(akaStr, query)}</span>` : ''}</span>
            ${acct.code ? `<span class="je-drop-code">${acct.code}</span>` : ''}
          `;
          item.addEventListener('mousedown', e => {
            e.preventDefault();
            close();
            if (_activeCb) _activeCb(acct);
          });
          el.appendChild(item);
        });
      }

      _position(inp);
      el.classList.add('open');
      _open = true;
    }

    function close() {
      el.classList.remove('open');
      _open         = false;
      _highlightIdx = -1;
      _activeInp    = null;
    }

    function isOpen()         { return _open; }
    function moveHighlight(d) {
      const items = _items();
      if (!items.length) return;
      _setHL(Math.max(0, Math.min(_highlightIdx + d, items.length - 1)));
    }
    function selectHighlighted() {
      const items = _items();
      const idx   = _highlightIdx >= 0 ? _highlightIdx : 0;
      if (items[idx]) items[idx].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    }

    // Reposition as user scrolls (tracks the anchor input)
    function _reposition() { if (_open && _activeInp) _position(_activeInp); }
    window.addEventListener('scroll', _reposition, true);
    window.addEventListener('resize', _reposition);

    // Click outside → close
    document.addEventListener('mousedown', e => {
      if (_open && !el.contains(e.target) && e.target !== _activeInp) close();
    });

    return { open, close, isOpen, moveHighlight, selectHighlighted };
  })();


  // ── Particulars custom dropdown cell ─────────────────────────────
  function buildParticularsCell(row, isFirstRow) {
    const wrap = document.createElement('div');
    wrap.className = 'je-particulars-wrap';

    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'je-particulars-input';
    inp.placeholder = 'Select or search ledger…';
    inp.value = row.particular;
    inp.setAttribute('aria-label', 'Particulars / ledger account');
    inp.setAttribute('autocomplete', 'off');
    inp.setAttribute('spellcheck', 'false');

    const arrow = document.createElement('span');
    arrow.className = 'je-particulars-arrow';
    arrow.innerHTML = `<svg viewBox="0 0 14 14" fill="none"><path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    function _select(acct) {
      inp.value      = acct.name;
      row.particular = acct.name;
      const tr = inp.closest('[data-row-id]');
      if (tr) focusDebitOfRow(Number(tr.dataset.rowId));
    }

    inp.addEventListener('focus', () => _jePortal.open(inp, inp.value, _select));
    inp.addEventListener('input', () => {
      row.particular = inp.value;
      _jePortal.open(inp, inp.value, _select);
    });

    inp.addEventListener('keydown', e => {
      const open = _jePortal.isOpen();

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!open) _jePortal.open(inp, inp.value, _select);
        _jePortal.moveHighlight(1);

      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        _jePortal.moveHighlight(-1);

      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (open) {
          _jePortal.selectHighlighted();
        } else {
          if (inp.value.trim() === '') {
            showToast('Please select a ledger account in Particulars.', 'warning');
          } else {
            const tr = inp.closest('[data-row-id]');
            if (tr) focusDebitOfRow(Number(tr.dataset.rowId));
          }
        }

      } else if (e.key === 'Escape') {
        e.preventDefault();
        _jePortal.close();

      } else if (e.key === 'Tab') {
        if (inp.value.trim() === '') {
          e.preventDefault();
          showToast('Please select a ledger account in Particulars.', 'warning');
        } else {
          _jePortal.close();
        }

      } else if (e.key === 'Backspace' && !isFirstRow && inp.value === '') {
        e.preventDefault();
        _jePortal.close();
        focusPrevRowDebit(row.id);
        deleteRow(row.id);
      }
    });

    inp.addEventListener('blur', () => {
      // Give portal mousedown time to fire before validating
      setTimeout(() => {
        if (_jePortal.isOpen()) return;
        const val = inp.value.trim().toLowerCase();
        if (val === '') {
          row.particular = '';
        } else {
          const match = coaLedgers.find(l => l.type === 'ledger' && l.name.toLowerCase() === val);
          if (match) {
            inp.value      = match.name;
            row.particular = match.name;
          } else {
            inp.value      = '';
            row.particular = '';
            showToast('Please select a valid ledger from the Chart of Accounts.', 'error');
          }
        }
      }, 200);
    });

    wrap.appendChild(inp);
    wrap.appendChild(arrow);
    return wrap;
  }

  // ── Totals & balance indicator ────────────────────────────────────
  function refreshTotals() {
    let totalDr = 0, totalCr = 0;
    jeRows.forEach(r => {
      totalDr += parseAmt(r.debit);
      totalCr += parseAmt(r.credit);
    });
    document.getElementById('jeTotalDebit').textContent  = fmtNum(totalDr);
    document.getElementById('jeTotalCredit').textContent = fmtNum(totalCr);

    const chip = document.getElementById('jeBalanceChip');
    const txt  = document.getElementById('jeBalanceText');
    const balanced = Math.abs(totalDr - totalCr) < 0.005;
    chip.className = 'je-balance-indicator ' + (balanced ? 'balanced' : 'unbalanced');
    txt.textContent = balanced ? 'Balanced ✓' : 'Unbalanced';
  }

  // ── Add row button ────────────────────────────────────────────────
  document.getElementById('jeAddRow').addEventListener('click', () => addRow('By'));

  // ── Budget toggle listener ────────────────────────────────────────
  document.getElementById('jeBudgetToggle')?.addEventListener('change', updateJeBudgetToggleUI);

  // ── New Entry button ──────────────────────────────────────────────
  document.getElementById('btnNewJE').addEventListener('click', () => {
    jvCounter++;
    initFormDefaults();
  });

  // ── Clear button ──────────────────────────────────────────────────
  document.getElementById('btnClearJE').addEventListener('click', () => {
    initFormDefaults();
    // Focus first particulars after reset
    setTimeout(focusFirstParticulars, 80);
  });

  // ── Save Draft ────────────────────────────────────────────────────
  document.getElementById('btnSaveDraft').addEventListener('click', () => {
    // Require at least one field filled to avoid blank drafts
    const dateVal    = document.getElementById('jeDate').value;
    const voucherVal = document.getElementById('jeVoucherNo').value;
    const hasRow     = jeRows.some(r => r.particular.trim() || parseAmt(r.debit) || parseAmt(r.credit));
    if (!dateVal && !voucherVal && !hasRow) {
      showToast('Nothing to save — please fill in at least one field.', 'error');
      return;
    }
    const firstRow = jeRows[0] || {};
    const amt      = parseAmt(firstRow.debit) || parseAmt(firstRow.credit);
    
    const isEditDraft = window._editingJournalEntry && window._editingJournalEntry.isDraft;
    const entryId = isEditDraft ? window._editingJournalEntry.id : Date.now();
    
    const draftData = {
      id:              entryId,
      date:            dateVal,
      voucherNo:       voucherVal,
      preparedBy:      document.getElementById('jePreparedBy').value,
      departmentId:    document.getElementById('jeDepartment')?.value || '',
      isBudget:        document.getElementById('jeBudgetToggle')?.checked === true,
      firstParticular: firstRow.particular || '—',
      amount:          fmtNum(amt),
      allRows:         JSON.parse(JSON.stringify(jeRows)),
      narration:       document.getElementById('jeNarration').value,
    };
    
    if (isEditDraft) {
      const idx = draftedEntries.findIndex(e => e.id === entryId);
      if (idx > -1) {
        draftedEntries[idx] = draftData;
      } else {
        draftedEntries.unshift(draftData);
      }
    } else {
      draftedEntries.unshift(draftData);
    }
    
    showToast(isEditDraft ? 'Draft updated successfully.' : 'Draft saved successfully.', 'info');
    if (!isEditDraft) {
      jvCounter++;
    }
    window._editingJournalEntry = null;
    triggerAutoBackup();
    setTimeout(initFormDefaults, 900);
  });

  // ── Post Entry ────────────────────────────────────────────────────
  document.getElementById('btnPostJE').addEventListener('click', () => {
    showSavePopup();
  });

  // ── Reverse & Cancel Actions ──────────────────────────────────────
  const reverseBtn = document.getElementById('btnJeReverse');
  if (reverseBtn) {
    reverseBtn.addEventListener('click', () => {
      showToast('Reverse is an upcoming feature!', 'info');
    });
  }
  const cancelBtn = document.getElementById('btnJeCancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      showToast('Cancel is an upcoming feature!', 'info');
    });
  }

  // ── Toast notification ────────────────────────────────────────────
  function showToast(msg, type) {
    let toast = document.getElementById('jeToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'jeToast';
      Object.assign(toast.style, {
        position:'fixed', bottom:'28px', right:'28px', zIndex:'9999',
        padding:'14px 22px', borderRadius:'12px', fontSize:'14px', fontWeight:'600',
        boxShadow:'0 8px 32px rgba(0,0,0,.18)', maxWidth:'340px',
        display:'flex', alignItems:'center', gap:'10px',
        transition:'opacity .3s, transform .3s', fontFamily:'Inter,sans-serif'
      });
      document.body.appendChild(toast);
    }
    const colors = {
      success: { bg:'#d1fae5', color:'#065f46', icon:'✓' },
      error:   { bg:'#fee2e2', color:'#991b1b', icon:'✕' },
      info:    { bg:'#dbeafe', color:'#1e40af', icon:'ℹ' },
    };
    const c = colors[type] || colors.info;
    toast.style.background = c.bg;
    toast.style.color = c.color;
    toast.innerHTML = `<span style="font-size:16px">${c.icon}</span>${msg}`;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
    }, 3200);
  }


  // ── Focus last row's Amount field ────────────────────────────────
  function focusLastRowAmount() {
    if (!jeRows.length) return;
    const lastId = jeRows[jeRows.length - 1].id;
    focusDebitOfRow(lastId);
  }

  // ── Save / Post confirmation popup ───────────────────────────────
  let _savePopupEl = null;

  function buildSavePopup() {
    const overlay = document.createElement('div');
    overlay.id = 'jeSaveOverlay';
    Object.assign(overlay.style, {
      position:'fixed', inset:'0', zIndex:'10000',
      background:'rgba(15,23,42,.52)', backdropFilter:'blur(5px)',
      display:'none', alignItems:'center', justifyContent:'center',
      fontFamily:'Inter,sans-serif'
    });

    overlay.innerHTML = `
      <style>
        @keyframes jePopIn { from { opacity:0; transform:scale(.93) translateY(10px) } to { opacity:1; transform:none } }
        #jeSaveCard { animation: jePopIn .18s cubic-bezier(.34,1.3,.64,1); }
        #jeSaveConfirmBtn:focus { outline: 2.5px solid #93c5fd; outline-offset: 2px; }
        #jeSaveCancelBtn:focus  { outline: 2.5px solid #94a3b8;  outline-offset: 2px; }
      </style>
      <div id="jeSaveCard" style="
        background:#fff; border-radius:22px; padding:38px 40px 32px;
        max-width:420px; width:90%; box-shadow:0 32px 80px rgba(0,0,0,.22);
        text-align:center;">

        <div style="width:60px;height:60px;background:#dbeafe;border-radius:18px;
             display:flex;align-items:center;justify-content:center;margin:0 auto 22px">
          <svg width="30" height="30" viewBox="0 0 20 20" fill="none">
            <rect x="3" y="2" width="13" height="16" rx="2" stroke="#2563eb" stroke-width="1.6"/>
            <rect x="3" y="2" width="4"  height="16" rx="1.5" stroke="#2563eb" stroke-width="1.4" fill="none"/>
            <line x1="9.5" y1="7"  x2="14" y2="7"  stroke="#2563eb" stroke-width="1.4" stroke-linecap="round"/>
            <line x1="9.5" y1="10" x2="14" y2="10" stroke="#2563eb" stroke-width="1.3" stroke-linecap="round"/>
            <line x1="9.5" y1="13" x2="12" y2="13" stroke="#2563eb" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
        </div>

        <div style="font-size:19px;font-weight:700;color:#0f172a;margin-bottom:8px;letter-spacing:-.3px">
          Post Journal Entry?
        </div>
        <div id="jeSavePopupMeta" style="font-size:13.5px;color:#64748b;line-height:1.65;margin-bottom:28px"></div>

        <div style="display:flex;gap:12px">
          <button id="jeSaveCancelBtn" style="
            flex:1;height:46px;border:1.5px solid #e2e8f0;border-radius:13px;
            background:#fff;font-size:14px;font-weight:600;color:#475569;cursor:pointer;
            transition:background .14s,border-color .14s">
            Cancel
          </button>
          <button id="jeSaveConfirmBtn" style="
            flex:1;height:46px;border:none;border-radius:13px;
            background:#2563eb;font-size:14px;font-weight:700;color:#fff;cursor:pointer;
            transition:background .14s;letter-spacing:.01em">
            ✓ &nbsp;Post Entry
          </button>
        </div>

        <div style="margin-top:18px;font-size:11.5px;color:#94a3b8;display:flex;align-items:center;justify-content:center;gap:6px">
          <kbd style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:5px;padding:2px 6px;font-size:10.5px;color:#475569">Enter</kbd>
          <span>to post</span>
          <span style="color:#cbd5e1">·</span>
          <kbd style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:5px;padding:2px 6px;font-size:10.5px;color:#475569">Backspace</kbd>
          <span>to go back</span>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    _savePopupEl = overlay;

    // Hover effects
    const conf = overlay.querySelector('#jeSaveConfirmBtn');
    const canc = overlay.querySelector('#jeSaveCancelBtn');
    conf.addEventListener('mouseenter', () => conf.style.background = '#1d4ed8');
    conf.addEventListener('mouseleave', () => conf.style.background = '#2563eb');
    canc.addEventListener('mouseenter', () => { canc.style.background='#f8fafc'; canc.style.borderColor='#94a3b8'; });
    canc.addEventListener('mouseleave', () => { canc.style.background='#fff';    canc.style.borderColor='#e2e8f0'; });

    // Use mousedown instead of click so it fires before focus-loss hides the overlay
    conf.addEventListener('mousedown', e => { e.preventDefault(); doPostEntry(); });
    canc.addEventListener('click', hideSavePopup);

    // Keyboard shortcuts on the overlay
    overlay.addEventListener('keydown', e => {
      if (e.key === 'Enter')     { e.preventDefault(); doPostEntry(); }
      if (e.key === 'Backspace' || e.key === 'Escape') { e.preventDefault(); hideSavePopup(); }
    });

    // Click outside card to cancel
    overlay.addEventListener('click', e => { if (e.target === overlay) hideSavePopup(); });
  }

  function showSavePopup() {
    // Validate before showing
    const chip = document.getElementById('jeBalanceChip');
    if (chip.classList.contains('unbalanced')) {
      showToast('Entry is not balanced — Debit ≠ Credit.', 'error');
      return;
    }
    const hasEmpty = jeRows.some(r => !r.particular.trim());
    if (hasEmpty) {
      showToast('Please select a ledger account for all rows.', 'error');
      return;
    }
    const invalidRow = jeRows.find(r => {
      const val = r.particular.trim().toLowerCase();
      return !coaLedgers.some(l => l.type === 'ledger' && l.name.toLowerCase() === val);
    });
    if (invalidRow) {
      showToast(`Invalid ledger name: "${invalidRow.particular}". Please select a ledger from the Chart of Accounts.`, 'error');
      return;
    }

    if (!_savePopupEl) buildSavePopup();

    // Populate meta line
    const vn = document.getElementById('jeVoucherNo').value || '—';
    const dt = document.getElementById('jeDate').value || '—';
    let totalDr = 0;
    jeRows.forEach(r => { totalDr += parseAmt(r.debit); });
    document.getElementById('jeSavePopupMeta').innerHTML =
      `Voucher&nbsp;<strong>${vn}</strong>&nbsp;&nbsp;·&nbsp;&nbsp;Date&nbsp;<strong>${dt}</strong><br>` +
      `Amount&nbsp;<strong style="color:#2563eb">₹&thinsp;${fmtNum(totalDr)}</strong>&nbsp;&nbsp;Dr &amp; Cr`;

    _savePopupEl.style.display = 'flex';
    setTimeout(() => { const b = document.getElementById('jeSaveConfirmBtn'); if(b) b.focus(); }, 60);
  }

  function hideSavePopup() {
    if (_savePopupEl) _savePopupEl.style.display = 'none';
    setTimeout(() => { const n = document.getElementById('jeNarration'); if(n) n.focus(); }, 60);
  }

  // ── Posted entries store & panel state ───────────────────────────
  let postedEntries       = [];
  let _ptStyleDone        = false;
  let _ptSelected         = new Set();
  let _ptSearch           = '';
  let _ptDateFrom         = '';
  let _ptDateTo           = '';
  let _ptFilterOpen       = false;

  // ── Drafted entries store & panel state ──────────────────────────
  let draftedEntries      = [];
  let _dtStyleDone        = false;
  let _dtSelected         = new Set();
  let _dtSearch           = '';
  let _dtDateFrom         = '';
  let _dtDateTo           = '';
  let _dtFilterOpen       = false;

  function injectPostedStyles() {
    _ptStyleDone = true;
  }

  function getFilteredPosted() {
    return postedEntries.filter(e => {
      if (_ptSearch) {
        const q = _ptSearch.toLowerCase();
        const hay = (e.voucherNo + e.firstParticular + e.date + e.preparedBy).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (_ptDateFrom && e.date < _ptDateFrom) return false;
      if (_ptDateTo   && e.date > _ptDateTo)   return false;
      return true;
    });
  }

  // ── Shared styled confirmation popup ─────────────────────────────
  // showKyaConfirm({ title, message, confirmLabel, iconBg, iconColor, iconSvg, okBg, onConfirm })
  function showKyaConfirm({ title, message, confirmLabel = 'Confirm', iconBg, iconColor, iconSvg, okBg = '#dc2626', onConfirm }) {
    // Remove any existing overlay
    document.getElementById('kyaConfirmOverlay')?.remove();
    document.getElementById('kyaConfirmStyles')?.remove();

    // Defaults
    if (!iconBg) {
      if (okBg === '#2563eb' || title.toLowerCase().includes('restore') || title.toLowerCase().includes('switch')) {
        iconBg = 'var(--blue-50)'; iconColor = 'var(--blue-600)';
      } else if (okBg === '#16a34a' || title.toLowerCase().includes('post')) {
        iconBg = '#dcfce7'; iconColor = '#16a34a';
      } else {
        iconBg = '#fee2e2'; iconColor = '#dc2626';
      }
    }
    if (!iconColor) iconColor = okBg;
    if (!iconSvg) {
      if (title.toLowerCase().includes('delete')) {
        iconSvg = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
      } else if (title.toLowerCase().includes('post')) {
        iconSvg = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      } else {
        iconSvg = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path></svg>`;
      }
    }

    const overlay = document.createElement('div');
    overlay.id = 'kyaConfirmOverlay';

    // Overlay: full-screen fixed, flex-centered, no external CSS needed
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      width: '100vw',
      height: '100vh',
      background: 'rgba(15,23,42,0.65)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: '99999',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
    });

    const card = document.createElement('div');
    Object.assign(card.style, {
      position: 'relative',
      background: '#ffffff',
      borderRadius: '24px',
      boxShadow: '0 24px 48px -12px rgba(15,23,42,0.35)',
      border: '1px solid #f1f5f9',
      textAlign: 'center',
      fontFamily: 'var(--font-main, Inter, sans-serif)',
      maxWidth: '440px',
      width: '90%',
      padding: '40px 32px 32px',
      boxSizing: 'border-box',
      animation: 'none',
    });

    card.innerHTML = `
      <button id="kyaConfirmClose" style="position:absolute;top:16px;right:16px;border:none;background:none;font-size:22px;color:#94a3b8;cursor:pointer;line-height:1;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:all 0.15s;">&times;</button>
      <div style="background:${iconBg};color:${iconColor};width:64px;height:64px;border-radius:20px;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 -2px 0 rgba(0,0,0,.05);">
        ${iconSvg}
      </div>
      <div style="font-size:20px;font-weight:800;color:#0f172a;margin-bottom:12px;letter-spacing:-0.4px;">${title}</div>
      <div style="font-size:14px;color:#64748b;line-height:1.6;margin-bottom:28px;">${message}</div>
      <div style="display:flex;gap:12px;width:100%;">
        <button id="btnConfirmCancel" style="flex:1;height:46px;border:1.5px solid #e2e8f0;border-radius:12px;background:#fff;font-size:13.5px;font-weight:600;color:#475569;cursor:pointer;transition:all 0.15s;box-sizing:border-box;">Cancel</button>
        <button id="btnConfirmOk" style="flex:1;height:46px;border:none;border-radius:12px;background:${okBg};font-size:13.5px;font-weight:700;color:#fff;cursor:pointer;transition:all 0.15s;box-shadow:0 4px 12px rgba(0,0,0,.15);box-sizing:border-box;">${confirmLabel}</button>
      </div>`;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const close = () => overlay.remove();

    const btnCancel = card.querySelector('#btnConfirmCancel');
    btnCancel.addEventListener('mouseenter', () => { btnCancel.style.background = '#f8fafc'; btnCancel.style.borderColor = '#94a3b8'; });
    btnCancel.addEventListener('mouseleave', () => { btnCancel.style.background = '#fff'; btnCancel.style.borderColor = '#e2e8f0'; });
    btnCancel.addEventListener('click', close);

    const btnOk = card.querySelector('#btnConfirmOk');
    btnOk.addEventListener('mouseenter', () => { btnOk.style.filter = 'brightness(0.88)'; });
    btnOk.addEventListener('mouseleave', () => { btnOk.style.filter = 'none'; });
    btnOk.addEventListener('click', () => { close(); onConfirm(); });

    const closeBtn = card.querySelector('#kyaConfirmClose');
    closeBtn.addEventListener('mouseenter', () => { closeBtn.style.color = '#334155'; closeBtn.style.background = '#f1f5f9'; });
    closeBtn.addEventListener('mouseleave', () => { closeBtn.style.color = '#94a3b8'; closeBtn.style.background = 'none'; });
    closeBtn.addEventListener('click', close);

    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

    btnOk.focus();
  }

  function renderPostedPanel() {
    injectPostedStyles();
    const wrap = document.getElementById('postedTableWrap');
    if (!wrap) return;

    // Preserve search input focus and cursor position
    const activeEl = document.activeElement;
    const isSearchFocused = activeEl && activeEl.id === 'ptSearch';
    let caretStart = 0;
    let caretEnd = 0;
    if (isSearchFocused) {
      caretStart = activeEl.selectionStart;
      caretEnd = activeEl.selectionEnd;
    }

    const filtered    = getFilteredPosted();
    const allIds      = filtered.map(e => e.id);
    const allChecked  = allIds.length > 0 && allIds.every(id => _ptSelected.has(id));
    const selCount    = [..._ptSelected].filter(id => allIds.includes(id)).length;

    wrap.innerHTML = `
      <!-- Toolbar -->
      <div class="ptb">
        <div class="pt-search-wrap">
          <svg class="pt-search-icon" width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M10 10l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <input class="pt-search-inp" id="ptSearch" placeholder="Search voucher, ledger, date, user…" value="${_ptSearch.replace(/"/g,'&quot;')}">
        </div>
        <button class="pt-btn ${_ptFilterOpen ? 'filter-active' : ''}" id="ptFilterToggle">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 3h12M3 7h8M5 11h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          Filter${(_ptDateFrom || _ptDateTo) ? ' ●' : ''}
        </button>
        ${selCount ? `
        <div class="pt-sel-bar">
          <span class="pt-sel-count">${selCount} selected</span>
          <button class="pt-del-btn" id="ptDelSel">✕ Delete Selected</button>
        </div>` : ''}
      </div>

      <!-- Filter panel -->
      <div class="pt-filter-panel" id="ptFilterPanel" style="${_ptFilterOpen ? '' : 'display:none'}">
        <div class="pt-fg">
          <label>Date From</label>
          <input type="date" id="ptDateFrom" value="${_ptDateFrom}">
        </div>
        <div class="pt-fg">
          <label>Date To</label>
          <input type="date" id="ptDateTo" value="${_ptDateTo}">
        </div>
        <button class="pt-clear-btn" id="ptClearFilters">✕ Clear Filters</button>
      </div>

      ${!filtered.length ? `
        <div style="text-align:center;padding:72px 20px;color:#94a3b8">
          <svg width="54" height="54" viewBox="0 0 64 64" fill="none" style="margin:0 auto 16px;display:block">
            <rect x="10" y="8" width="36" height="46" rx="5" fill="#dbeafe" stroke="#93c5fd" stroke-width="2"/>
            <rect x="10" y="8" width="10" height="46" rx="3" fill="#bfdbfe"/>
            <line x1="26" y1="24" x2="40" y2="24" stroke="#60a5fa" stroke-width="2" stroke-linecap="round"/>
            <line x1="26" y1="31" x2="40" y2="31" stroke="#bfdbfe" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <div style="font-size:15px;font-weight:600;color:#64748b;margin-bottom:5px">
            ${postedEntries.length ? 'No results match your search' : 'No posted entries yet'}
          </div>
          <div style="font-size:13px">${postedEntries.length ? 'Try adjusting search or filters.' : 'Post a journal entry to see it here.'}</div>
        </div>
      ` : `
      <div class="pt-table-wrap">
        <table class="pt-table">
          <thead>
            <tr>
              <th style="width:40px;padding:12px 14px">
                <input type="checkbox" class="pt-cb" id="ptSelAll" ${allChecked ? 'checked' : ''}>
              </th>
              <th style="width:32px">#</th>
              <th>Date</th>
              <th>Voucher No.</th>
              <th>Prepared By</th>
              <th>First Ledger</th>
              <th style="text-align:right">Amount</th>
              <th style="width:88px;text-align:center">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((e, i) => `
              <tr class="${_ptSelected.has(e.id) ? 'pt-sel-row' : ''}" data-eid="${e.id}">
                <td><input type="checkbox" class="pt-cb pt-rcb" data-id="${e.id}" ${_ptSelected.has(e.id) ? 'checked' : ''}></td>
                <td style="color:#94a3b8;font-size:12px;font-weight:600">${i + 1}</td>
                <td style="white-space:nowrap">${e.date}</td>
                <td><span class="pt-vbadge">${e.voucherNo}</span></td>
                <td>${e.preparedBy}</td>
                <td style="font-weight:500;color:#1e293b">${e.firstParticular || '—'}</td>
                <td style="text-align:right"><span class="pt-amt">₹&thinsp;${e.amount}</span></td>
                <td style="text-align:center;white-space:nowrap">
                  <button class="pt-view-btn pt-edit" data-id="${e.id}" title="Edit journal entry" style="margin-right:4px">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
                      <path d="M11 2l3 3M3 10v3h3l8.5-8.5-3-3L3 10z" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                  <button class="pt-view-btn pt-view" data-id="${e.id}" title="View full journal entry" style="margin-right:4px">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <ellipse cx="7.5" cy="7.5" rx="6" ry="4.5" stroke="currentColor" stroke-width="1.4"/>
                      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" stroke-width="1.4"/>
                    </svg>
                  </button>
                  <button class="pt-row-del-btn pt-row-del" data-id="${e.id}" title="Delete this entry">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
                  </button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`}`;

    // ── Wire events
    const searchEl = document.getElementById('ptSearch');
    if (searchEl) searchEl.addEventListener('input', e => { _ptSearch = e.target.value; renderPostedPanel(); });

    const filterToggle = document.getElementById('ptFilterToggle');
    if (filterToggle) filterToggle.addEventListener('click', () => { _ptFilterOpen = !_ptFilterOpen; renderPostedPanel(); });

    const dateFrom = document.getElementById('ptDateFrom');
    if (dateFrom) dateFrom.addEventListener('change', e => { _ptDateFrom = e.target.value; renderPostedPanel(); });

    const dateTo = document.getElementById('ptDateTo');
    if (dateTo) dateTo.addEventListener('change', e => { _ptDateTo = e.target.value; renderPostedPanel(); });

    const clearFilters = document.getElementById('ptClearFilters');
    if (clearFilters) clearFilters.addEventListener('click', () => {
      _ptDateFrom = ''; _ptDateTo = '';
      renderPostedPanel();
    });

    const selAll = document.getElementById('ptSelAll');
    if (selAll) selAll.addEventListener('change', e => {
      if (e.target.checked) allIds.forEach(id => _ptSelected.add(id));
      else allIds.forEach(id => _ptSelected.delete(id));
      renderPostedPanel();
    });

    wrap.querySelectorAll('.pt-rcb').forEach(cb => {
      cb.addEventListener('change', e => {
        const id = Number(e.target.dataset.id);
        if (e.target.checked) _ptSelected.add(id);
        else _ptSelected.delete(id);
        renderPostedPanel();
      });
    });

    const delSel = document.getElementById('ptDelSel');
    if (delSel) delSel.addEventListener('click', () => {
      const n = selCount;
      showKyaConfirm({
        title: 'Delete Journal Entries?',
        message: `Permanently delete <strong>${n} selected ${n === 1 ? 'entry' : 'entries'}</strong>?<br>This action cannot be undone.`,
        confirmLabel: '✕ Delete',
        iconBg: '#fee2e2', iconColor: '#dc2626',
        iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        okBg: '#dc2626',
        onConfirm: () => {
          postedEntries = postedEntries.filter(e => !_ptSelected.has(e.id));
          _ptSelected.clear();
          renderPostedPanel();
          refreshAllReports();
          triggerAutoBackup();
        }
      });
    });

    // Per-row delete — Posted
    wrap.querySelectorAll('.pt-row-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        const entry = postedEntries.find(e => e.id === id);
        if (!entry) return;
        showKyaConfirm({
          title: 'Delete this journal entry?',
          message: `Permanently delete voucher <strong>${entry.voucherNo || '—'}</strong>?<br>This action cannot be undone.`,
          confirmLabel: '✕ Delete',
          iconBg: '#fee2e2', iconColor: '#dc2626',
          iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
          okBg: '#dc2626',
          onConfirm: () => {
            postedEntries = postedEntries.filter(e => e.id !== id);
            _ptSelected.delete(id);
            renderPostedPanel();
            refreshAllReports();
            triggerAutoBackup();
          }
        });
      });
    });

    wrap.querySelectorAll('.pt-view').forEach(btn => {
      btn.addEventListener('click', () => {
        const entry = postedEntries.find(e => e.id === Number(btn.dataset.id));
        if (entry) showFullJournalModal(entry);
      });
    });

    wrap.querySelectorAll('.pt-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const entry = postedEntries.find(e => e.id === Number(btn.dataset.id));
        if (entry) loadJournalEntry(entry, false);
      });
    });

    // Restore search input focus and cursor position
    if (isSearchFocused) {
      const searchInput = document.getElementById('ptSearch');
      if (searchInput) {
        searchInput.focus();
        try {
          searchInput.setSelectionRange(caretStart, caretEnd);
        } catch (e) {}
      }
    }
  }

  // ── Drafted panel helpers ─────────────────────────────────────────
  function injectDraftedStyles() {
    if (_dtStyleDone) return;
    _dtStyleDone = true;
    const s = document.createElement('style');
    s.textContent = `
      /* Drafted panel reuses .ptb, .pt-* classes from Posted styles.
         Only the amber accent colours for draft badge are added here. */
      .dt-vbadge {
        background:#fef3c7; color:#92400e;
        font-size:11.5px; font-weight:700;
        padding:3px 9px; border-radius:20px;
      }
      .dt-status-badge {
        display:inline-flex; align-items:center; gap:4px;
        background:#fef9c3; color:#713f12;
        font-size:11px; font-weight:700;
        padding:2px 8px; border-radius:20px;
        border:1px solid #fde68a;
      }
      .fj-draft-banner {
        display:flex; align-items:center; gap:8px;
        background:#fef3c7; border-left:3px solid #f59e0b;
        border-radius:8px; padding:10px 14px;
        font-size:12.5px; color:#92400e;
        margin-bottom:18px; font-weight:600;
      }
      .dt-post-btn {
        width:32px; height:32px; border:1.5px solid #bbf7d0; border-radius:8px;
        background:#f0fdf4; cursor:pointer; display:inline-flex; align-items:center;
        justify-content:center; color:#16a34a; transition:all .15s;
      }
      .dt-post-btn:hover { background:#dcfce7; border-color:#4ade80; color:#15803d; }
      .dt-post-sel-btn {
        height:32px; padding:0 14px; border-radius:8px; border:none;
        background:#dcfce7; color:#15803d; font-size:12.5px; font-weight:700;
        cursor:pointer; font-family:Inter,sans-serif; transition:background .15s;
        display:flex; align-items:center; gap:5px;
      }
      .dt-post-sel-btn:hover { background:#bbf7d0; }
    `;
    document.head.appendChild(s);
  }

  function getFilteredDrafted() {
    return draftedEntries.filter(e => {
      if (_dtSearch) {
        const q = _dtSearch.toLowerCase();
        const hay = (e.voucherNo + e.firstParticular + e.date + e.preparedBy).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (_dtDateFrom && e.date < _dtDateFrom) return false;
      if (_dtDateTo   && e.date > _dtDateTo)   return false;
      return true;
    });
  }

  // ── Post one or more draft entries → move to Posted ──────────────
  function postDraftEntries(ids) {
    const idsSet = new Set(ids);
    const toPost = draftedEntries.filter(e => idsSet.has(e.id));

    // Validate all rows in all to-be-posted drafts
    for (const entry of toPost) {
      const invalidRow = entry.allRows.find(r => {
        const val = r.particular.trim().toLowerCase();
        return !val || !coaLedgers.some(l => l.type === 'ledger' && l.name.toLowerCase() === val);
      });
      if (invalidRow) {
        showToast(`Cannot post draft "${entry.voucherNo || '—'}": it references an invalid or deleted ledger: "${invalidRow.particular || 'Empty'}".`, 'error');
        return;
      }
    }

    // Move matched drafts into postedEntries (preserve newest-first order)
    toPost.forEach(e => postedEntries.unshift(e));
    // Remove from drafts & selection
    draftedEntries = draftedEntries.filter(e => !idsSet.has(e.id));
    ids.forEach(id => _dtSelected.delete(id));
    const n = toPost.length;
    showToast(
      n === 1
        ? `Draft "${toPost[0].voucherNo || '—'}" posted successfully!`
        : `${n} drafts posted successfully!`,
      'success'
    );
    renderDraftedPanel();
    refreshAllReports();
    triggerAutoBackup();
  }

  function renderDraftedPanel() {
    injectPostedStyles();   // reuse Posted CSS for table, toolbar, buttons
    injectDraftedStyles();  // add draft-specific amber styles
    const wrap = document.getElementById('draftedTableWrap');
    if (!wrap) return;

    // Preserve search focus & caret
    const activeEl = document.activeElement;
    const isSearchFocused = activeEl && activeEl.id === 'dtSearch';
    let caretStart = 0, caretEnd = 0;
    if (isSearchFocused) { caretStart = activeEl.selectionStart; caretEnd = activeEl.selectionEnd; }

    const filtered   = getFilteredDrafted();
    const allIds     = filtered.map(e => e.id);
    const allChecked = allIds.length > 0 && allIds.every(id => _dtSelected.has(id));
    const selCount   = [..._dtSelected].filter(id => allIds.includes(id)).length;

    wrap.innerHTML = `
      <!-- Toolbar -->
      <div class="ptb">
        <div class="pt-search-wrap">
          <svg class="pt-search-icon" width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M10 10l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <input class="pt-search-inp" id="dtSearch" placeholder="Search voucher, ledger, date, user…" value="${_dtSearch.replace(/"/g,'&quot;')}">
        </div>
        <button class="pt-btn ${_dtFilterOpen ? 'filter-active' : ''}" id="dtFilterToggle">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 3h12M3 7h8M5 11h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          Filter${(_dtDateFrom || _dtDateTo) ? ' ●' : ''}
        </button>
        ${selCount ? `
        <div class="pt-sel-bar">
          <span class="pt-sel-count">${selCount} selected</span>
          <button class="dt-post-sel-btn" id="dtPostSel">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 6.5l3 3 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Post Selected
          </button>
          <button class="pt-del-btn" id="dtDelSel">✕ Delete Selected</button>
        </div>` : ''}
      </div>

      <!-- Filter panel -->
      <div class="pt-filter-panel" id="dtFilterPanel" style="${_dtFilterOpen ? '' : 'display:none'}">
        <div class="pt-fg">
          <label>Date From</label>
          <input type="date" id="dtDateFrom" value="${_dtDateFrom}">
        </div>
        <div class="pt-fg">
          <label>Date To</label>
          <input type="date" id="dtDateTo" value="${_dtDateTo}">
        </div>
        <button class="pt-clear-btn" id="dtClearFilters">✕ Clear Filters</button>
      </div>

      ${!filtered.length ? `
        <div style="text-align:center;padding:72px 20px;color:#94a3b8">
          <svg width="54" height="54" viewBox="0 0 64 64" fill="none" style="margin:0 auto 16px;display:block">
            <rect x="10" y="8" width="36" height="46" rx="5" fill="#fef3c7" stroke="#fcd34d" stroke-width="2"/>
            <rect x="10" y="8" width="10" height="46" rx="3" fill="#fde68a"/>
            <line x1="26" y1="24" x2="40" y2="24" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
            <line x1="26" y1="31" x2="40" y2="31" stroke="#fde68a" stroke-width="2" stroke-linecap="round"/>
            <line x1="26" y1="38" x2="34" y2="38" stroke="#fde68a" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <div style="font-size:15px;font-weight:600;color:#64748b;margin-bottom:5px">
            ${draftedEntries.length ? 'No results match your search' : 'No drafted entries yet'}
          </div>
          <div style="font-size:13px">${draftedEntries.length ? 'Try adjusting search or filters.' : 'Save a journal entry as draft to see it here.'}</div>
        </div>
      ` : `
      <div class="pt-table-wrap">
        <table class="pt-table">
          <thead>
            <tr style="background:linear-gradient(90deg,#d97706,#f59e0b)">
              <th style="width:40px;padding:12px 14px">
                <input type="checkbox" class="pt-cb" id="dtSelAll" ${allChecked ? 'checked' : ''}>
              </th>
              <th style="width:32px">#</th>
              <th>Date</th>
              <th>Voucher No.</th>
              <th>Prepared By</th>
              <th>First Ledger</th>
              <th style="text-align:right">Amount</th>
              <th style="width:88px;text-align:center">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((e, i) => `
              <tr class="${_dtSelected.has(e.id) ? 'pt-sel-row' : ''}" data-eid="${e.id}">
                <td><input type="checkbox" class="pt-cb dt-rcb" data-id="${e.id}" ${_dtSelected.has(e.id) ? 'checked' : ''}></td>
                <td style="color:#94a3b8;font-size:12px;font-weight:600">${i + 1}</td>
                <td style="white-space:nowrap">${e.date || '—'}</td>
                <td><span class="dt-vbadge">${e.voucherNo || '—'}</span></td>
                <td>${e.preparedBy || '—'}</td>
                <td style="font-weight:500;color:#1e293b">${e.firstParticular || '—'}</td>
                <td style="text-align:right"><span class="pt-amt" style="color:#d97706">₹&thinsp;${e.amount}</span></td>
                <td style="text-align:center;white-space:nowrap">
                  <button class="dt-post-btn dt-post" data-id="${e.id}" title="Post this draft entry" style="margin-right:4px">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 6.5l3 3 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </button>
                  <button class="pt-view-btn dt-edit" data-id="${e.id}" title="Edit draft journal entry" style="margin-right:4px;">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
                      <path d="M11 2l3 3M3 10v3h3l8.5-8.5-3-3L3 10z" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                  <button class="pt-view-btn dt-view" data-id="${e.id}" title="View full draft journal entry" style="margin-right:4px">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <ellipse cx="7.5" cy="7.5" rx="6" ry="4.5" stroke="currentColor" stroke-width="1.4"/>
                      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" stroke-width="1.4"/>
                    </svg>
                  </button>
                  <button class="pt-row-del-btn dt-row-del" data-id="${e.id}" title="Delete this draft entry">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
                  </button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`}`;

    // ── Wire events ───────────────────────────────────────────────────
    const searchEl = document.getElementById('dtSearch');
    if (searchEl) searchEl.addEventListener('input', e => { _dtSearch = e.target.value; renderDraftedPanel(); });

    const filterToggle = document.getElementById('dtFilterToggle');
    if (filterToggle) filterToggle.addEventListener('click', () => { _dtFilterOpen = !_dtFilterOpen; renderDraftedPanel(); });

    const dtDateFrom = document.getElementById('dtDateFrom');
    if (dtDateFrom) dtDateFrom.addEventListener('change', e => { _dtDateFrom = e.target.value; renderDraftedPanel(); });

    const dtDateTo = document.getElementById('dtDateTo');
    if (dtDateTo) dtDateTo.addEventListener('change', e => { _dtDateTo = e.target.value; renderDraftedPanel(); });

    const clearFilters = document.getElementById('dtClearFilters');
    if (clearFilters) clearFilters.addEventListener('click', () => {
      _dtDateFrom = ''; _dtDateTo = '';
      renderDraftedPanel();
    });

    const selAll = document.getElementById('dtSelAll');
    if (selAll) selAll.addEventListener('change', e => {
      if (e.target.checked) allIds.forEach(id => _dtSelected.add(id));
      else allIds.forEach(id => _dtSelected.delete(id));
      renderDraftedPanel();
    });

    wrap.querySelectorAll('.dt-rcb').forEach(cb => {
      cb.addEventListener('change', e => {
        const id = Number(e.target.dataset.id);
        if (e.target.checked) _dtSelected.add(id);
        else _dtSelected.delete(id);
        renderDraftedPanel();
      });
    });

    const delSel = document.getElementById('dtDelSel');
    if (delSel) delSel.addEventListener('click', () => {
      const n = selCount;
      showKyaConfirm({
        title: 'Delete Draft Entries?',
        message: `Permanently delete <strong>${n} selected draft ${n === 1 ? 'entry' : 'entries'}</strong>?<br>This action cannot be undone.`,
        confirmLabel: '✕ Delete',
        iconBg: '#fee2e2', iconColor: '#dc2626',
        iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        okBg: '#dc2626',
        onConfirm: () => {
          draftedEntries = draftedEntries.filter(e => !_dtSelected.has(e.id));
          _dtSelected.clear();
          renderDraftedPanel();
          triggerAutoBackup();
        }
      });
    });

    // Post Selected — with styled popup
    const postSel = document.getElementById('dtPostSel');
    if (postSel) postSel.addEventListener('click', () => {
      const ids = [..._dtSelected].filter(id => allIds.includes(id));
      if (!ids.length) return;
      const n = ids.length;
      showKyaConfirm({
        title: n === 1 ? 'Post this journal entry?' : `Post ${n} journal entries?`,
        message: n === 1
          ? 'This draft will be moved to <strong>Posted</strong>.'
          : `<strong>${n} drafts</strong> will be moved to <strong>Posted</strong>.`,
        confirmLabel: '✓ Post',
        iconBg: '#dcfce7', iconColor: '#16a34a',
        iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        okBg: '#16a34a',
        onConfirm: () => postDraftEntries(ids)
      });
    });

    // Post individual row — with styled popup
    wrap.querySelectorAll('.dt-post').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        const entry = draftedEntries.find(e => e.id === id);
        if (!entry) return;
        showKyaConfirm({
          title: 'Post this journal entry?',
          message: `Draft <strong>${entry.voucherNo || '—'}</strong> will be moved to <strong>Posted</strong>.`,
          confirmLabel: '✓ Post Entry',
          iconBg: '#dcfce7', iconColor: '#16a34a',
          iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
          okBg: '#16a34a',
          onConfirm: () => postDraftEntries([id])
        });
      });
    });

    // Delete individual draft row — with styled popup
    wrap.querySelectorAll('.dt-row-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        const entry = draftedEntries.find(e => e.id === id);
        if (!entry) return;
        showKyaConfirm({
          title: 'Delete this journal entry?',
          message: `Permanently delete draft <strong>${entry.voucherNo || '—'}</strong>?<br>This action cannot be undone.`,
          confirmLabel: '✕ Delete',
          iconBg: '#fee2e2', iconColor: '#dc2626',
          iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
          okBg: '#dc2626',
          onConfirm: () => {
            draftedEntries = draftedEntries.filter(e => e.id !== id);
            _dtSelected.delete(id);
            renderDraftedPanel();
          }
        });
      });
    });

    wrap.querySelectorAll('.dt-view').forEach(btn => {
      btn.addEventListener('click', () => {
        const entry = draftedEntries.find(e => e.id === Number(btn.dataset.id));
        if (entry) showFullJournalModal(entry, true);
      });
    });

    wrap.querySelectorAll('.dt-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const entry = draftedEntries.find(e => e.id === Number(btn.dataset.id));
        if (entry) loadJournalEntry(entry, true);
      });
    });

    // Restore search focus & caret
    if (isSearchFocused) {
      const searchInput = document.getElementById('dtSearch');
      if (searchInput) {
        searchInput.focus();
        try { searchInput.setSelectionRange(caretStart, caretEnd); } catch (e) {}
      }
    }
  }

  // ── Full Journal View modal ────────────────────────────────────────
  function showFullJournalModal(entry, isDraft) {
    document.getElementById('fjOverlay')?.remove();

    const rows = entry.allRows || [];
    let totalDr = 0, totalCr = 0;
    rows.forEach(r => { totalDr += parseAmt(r.debit); totalCr += parseAmt(r.credit); });

    const overlay = document.createElement('div');
    overlay.className = 'fj-overlay';
    overlay.id = 'fjOverlay';
    overlay.setAttribute('tabindex', '-1');

    const headGrad   = isDraft ? 'linear-gradient(90deg,#d97706,#f59e0b)' : 'linear-gradient(90deg,#2563eb,#3b82f6)';
    const statusText = isDraft ? 'Full entry details · Draft' : 'Full entry details · Posted';
    const amtColour  = isDraft ? '#d97706' : '#2563eb';
    const draftBanner = isDraft
      ? `<div class="fj-draft-banner">✏️ &nbsp;This is a <strong>Draft</strong> entry — it has not been posted yet.</div>`
      : '';

    const deptObj = (entry.departmentId && entry.departmentId !== 'all')
      ? (typeof ohGetDeptById === 'function' ? ohGetDeptById(Number(entry.departmentId)) : null)
      : null;
    const deptName = deptObj ? deptObj.name : '—';
    const isBudget = entry.isBudget === true;
    const typeText  = isBudget ? 'Budget' : 'Non Budget';
    const typeColor = isBudget ? '#2563eb' : '#64748b';

    overlay.innerHTML = `
      <div class="fj-card">
        <div class="fj-head" style="background:${headGrad}; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div class="fj-head-title">Journal Voucher — ${entry.voucherNo || '—'}</div>
            <div class="fj-head-sub">${statusText}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 12px; margin-left: auto; margin-right: 16px;">
            <button onclick="editVoucherFromDetails(${entry.id}, ${!!isDraft}); document.getElementById('fjOverlay')?.remove();" title="Edit Entry" style="background: rgba(255,255,255,0.15); border: none; border-radius: 6px; padding: 6px; cursor: pointer; color: #fff; display: flex; align-items: center; justify-content: center; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button onclick="deleteVoucherFromDetails(${entry.id}, ${!!isDraft}); document.getElementById('fjOverlay')?.remove();" title="Delete Entry" style="background: rgba(255,255,255,0.15); border: none; border-radius: 6px; padding: 6px; cursor: pointer; color: #fff; display: flex; align-items: center; justify-content: center; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
          <button class="fj-close-btn" id="fjClose" style="margin-left: 0;">✕</button>
        </div>
        <div class="fj-body">
          ${draftBanner}
          <div class="fj-meta">
            <div class="fj-meta-item"><label>Date</label><span>${entry.date || '—'}</span></div>
            <div class="fj-meta-item"><label>Voucher No.</label><span>${entry.voucherNo || '—'}</span></div>
            <div class="fj-meta-item"><label>Department</label><span>${typeof ohEsc === 'function' ? ohEsc(deptName) : deptName}</span></div>
            <div class="fj-meta-item"><label>Transaction Type</label><span style="color:${typeColor};font-weight:700;">${typeText}</span></div>
            <div class="fj-meta-item"><label>Prepared By</label><span>${entry.preparedBy || '—'}</span></div>
            <div class="fj-meta-item"><label>Total Amount</label><span style="color:${amtColour}">₹ ${entry.amount}</span></div>
          </div>
          <table class="fj-tbl">
            <thead>
              <tr>
                <th style="width:32px">#</th>
                <th style="width:60px">Type</th>
                <th>Particulars</th>
                <th style="text-align:right">Debit</th>
                <th style="text-align:right">Credit</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((r, i) => `
                <tr>
                  <td style="color:#94a3b8;font-size:12px">${i + 1}</td>
                  <td><span class="${r.type === 'By' ? 'fj-by' : 'fj-to'}">${r.type}</span></td>
                  <td style="font-weight:500">${r.particular || '—'}</td>
                  <td style="text-align:right;color:#2563eb;font-weight:600">${parseAmt(r.debit) ? '₹ ' + fmtNum(parseAmt(r.debit)) : '—'}</td>
                  <td style="text-align:right;color:#059669;font-weight:600">${parseAmt(r.credit) ? '₹ ' + fmtNum(parseAmt(r.credit)) : '—'}</td>
                </tr>`).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="text-align:right;font-size:12px;letter-spacing:.04em;text-transform:uppercase">Totals</td>
                <td style="text-align:right;color:#2563eb">₹ ${fmtNum(totalDr)}</td>
                <td style="text-align:right;color:#059669">₹ ${fmtNum(totalCr)}</td>
              </tr>
            </tfoot>
          </table>
          ${entry.narration ? `<div class="fj-narration">📝 &nbsp;${entry.narration}</div>` : ''}
        </div>
      </div>`;

    document.body.appendChild(overlay);
    overlay.focus();

    overlay.querySelector('#fjClose').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.addEventListener('keydown', e => { if (e.key === 'Escape') overlay.remove(); });
  }

  function doPostEntry() {
    if (_savePopupEl) _savePopupEl.style.display = 'none';

    // Capture full entry snapshot before form resets
    const firstRow = jeRows[0] || {};
    const amt      = parseAmt(firstRow.debit) || parseAmt(firstRow.credit);
    
    if (window._editingJournalEntry && window._editingJournalEntry.isDraft) {
      draftedEntries = draftedEntries.filter(e => e.id !== window._editingJournalEntry.id);
    }
    
    const isEditPosted = window._editingJournalEntry && !window._editingJournalEntry.isDraft;
    const entryId = isEditPosted ? window._editingJournalEntry.id : Date.now();
    
    const postData = {
      id:             entryId,
      date:           document.getElementById('jeDate').value,
      voucherNo:      document.getElementById('jeVoucherNo').value,
      preparedBy:     document.getElementById('jePreparedBy').value,
      departmentId:   document.getElementById('jeDepartment')?.value || '',
      isBudget:       document.getElementById('jeBudgetToggle')?.checked === true,
      firstParticular: firstRow.particular || '—',
      amount:         fmtNum(amt),
      allRows:        JSON.parse(JSON.stringify(jeRows)),
      narration:      document.getElementById('jeNarration').value,
    };

    if (isEditPosted) {
      const idx = postedEntries.findIndex(e => e.id === entryId);
      if (idx > -1) {
        postedEntries[idx] = postData;
      } else {
        postedEntries.unshift(postData);
      }
    } else {
      postedEntries.unshift(postData);
    }

    showToast(isEditPosted ? 'Journal entry updated successfully!' : 'Journal entry posted successfully!', 'success');
    if (!isEditPosted) {
      jvCounter++;
    }
    window._editingJournalEntry = null;
    refreshAllReports();
    triggerAutoBackup();
    setTimeout(initFormDefaults, 900);
  }

  // ── Voucher Desk state & logic ───────────────────────────────────
  let _vdSearch = '';
  let _vdTypeFilter = 'All';
  let _vdStatusFilter = 'All';

  function deleteVoucherFromDesk(type, id) {
    if (type === 'Journal') {
      const isDraft = draftedEntries.some(e => e.id === id);
      if (isDraft) {
        const entry = draftedEntries.find(e => e.id === id);
        showKyaConfirm({
          title: 'Delete this journal entry?',
          message: `Permanently delete draft <strong>${entry ? entry.voucherNo || '—' : '—'}</strong>?<br>This action cannot be undone.`,
          confirmLabel: '✕ Delete',
          iconBg: '#fee2e2', iconColor: '#dc2626',
          iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
          okBg: '#dc2626',
          onConfirm: () => {
            draftedEntries = draftedEntries.filter(e => e.id !== id);
            triggerAutoBackup();
            renderVoucherDeskPanel();
          }
        });
      } else {
        const entry = postedEntries.find(e => e.id === id);
        showKyaConfirm({
          title: 'Delete this journal entry?',
          message: `Permanently delete voucher <strong>${entry ? entry.voucherNo || '—' : '—'}</strong>?<br>This action cannot be undone.`,
          confirmLabel: '✕ Delete',
          iconBg: '#fee2e2', iconColor: '#dc2626',
          iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
          okBg: '#dc2626',
          onConfirm: () => {
            postedEntries = postedEntries.filter(e => e.id !== id);
            refreshAllReports();
            triggerAutoBackup();
            renderVoucherDeskPanel();
          }
        });
      }
    }
  }

  function renderVoucherDeskPanel() {
    const wrap = document.getElementById('voucherDeskWrap');
    if (!wrap) return;

    const activeEl = document.activeElement;
    const isSearchFocused = activeEl && activeEl.id === 'vdSearch';
    let caretStart = 0, caretEnd = 0;
    if (isSearchFocused) {
      caretStart = activeEl.selectionStart;
      caretEnd = activeEl.selectionEnd;
    }

    const totalJE = postedEntries.length;
    const totalDrafts = draftedEntries.length;
    const totalVouchers = totalJE + totalDrafts;

    const elTotal = document.getElementById('vdStatTotal');
    const elJE = document.getElementById('vdStatJE');
    const elInv = document.getElementById('vdStatInv');
    const elDrafts = document.getElementById('vdStatDrafts');

    if (elTotal) elTotal.textContent = totalVouchers;
    if (elJE) elJE.textContent = totalJE;
    if (elInv) elInv.textContent = 0;
    if (elDrafts) elDrafts.textContent = totalDrafts;

    let list = [];

    postedEntries.forEach(e => {
      list.push({
        id: e.id,
        date: e.date,
        voucherNo: e.voucherNo,
        type: 'Journal',
        particulars: e.narration || e.firstParticular || '—',
        amount: e.amount,
        isDraft: false,
        raw: e
      });
    });

    draftedEntries.forEach(e => {
      list.push({
        id: e.id,
        date: e.date,
        voucherNo: e.voucherNo,
        type: 'Journal',
        particulars: e.narration || e.firstParticular || '—',
        amount: e.amount,
        isDraft: true,
        raw: e
      });
    });

    list.sort((a, b) => {
      const dComp = (b.date || '').localeCompare(a.date || '');
      if (dComp !== 0) return dComp;
      return b.id - a.id;
    });

    let filtered = list.filter(e => {
      if (_vdTypeFilter !== 'All' && e.type !== _vdTypeFilter) return false;
      
      if (_vdStatusFilter !== 'All') {
        const isDraft = _vdStatusFilter === 'Draft';
        if (e.isDraft !== isDraft) return false;
      }

      if (_vdSearch) {
        const q = _vdSearch.toLowerCase();
        const noMatch = (e.voucherNo || '').toLowerCase().includes(q);
        const partMatch = (e.particulars || '').toLowerCase().includes(q);
        const dateMatch = (e.date || '').toLowerCase().includes(q);
        const amtMatch = (e.amount || '').toLowerCase().includes(q);
        if (!noMatch && !partMatch && !dateMatch && !amtMatch) return false;
      }

      return true;
    });

    let tableHtml = '';
    if (filtered.length === 0) {
      tableHtml = `
        <div class="ptb" style="margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
          <div class="pt-search-wrap" style="flex: 1; min-width: 240px; position: relative;">
            <svg class="pt-search-icon" width="15" height="15" viewBox="0 0 15 15" fill="none" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--slate-400);">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.5"/>
              <path d="M10 10l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <input class="pt-search-inp" id="vdSearch" placeholder="Search voucher #, particulars, amount, date…" style="padding-left: 36px; width: 100%; height: 38px; border-radius: 8px; border: 1.5px solid var(--slate-200); font-size: 13.5px; transition: all 0.15s;" value="${_vdSearch.replace(/"/g,'&quot;')}">
          </div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <select id="vdTypeFilter" style="height: 38px; padding: 0 12px; border-radius: 8px; border: 1.5px solid var(--slate-200); font-size: 13px; font-weight: 600; color: var(--slate-700); background: var(--white);">
              <option value="All" ${_vdTypeFilter === 'All' ? 'selected' : ''}>All Types</option>
              <option value="Journal" ${_vdTypeFilter === 'Journal' ? 'selected' : ''}>Journal Entry</option>
              <option value="Invoice" ${_vdTypeFilter === 'Invoice' ? 'selected' : ''}>Sales Invoice</option>
              <option value="Order" ${_vdTypeFilter === 'Order' ? 'selected' : ''}>Sales Order</option>
              <option value="Reversal" ${_vdTypeFilter === 'Reversal' ? 'selected' : ''}>Sales Reversal</option>
            </select>
          </div>
        </div>

        <div style="text-align: center; padding: 72px 20px; color: #94a3b8;">
          <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 16px; display: block; color: var(--slate-300);">
            <rect x="3" y="4" width="18" height="15" rx="2"/>
            <line x1="3" y1="11" x2="21" y2="11"/>
          </svg>
          <div style="font-size: 15px; font-weight: 600; color: var(--slate-500); margin-bottom: 5px;">No vouchers found</div>
          <div style="font-size: 13px;">Try adjusting your search query or filters.</div>
        </div>
      `;
    } else {
      tableHtml = `
        <div class="ptb" style="margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
          <div class="pt-search-wrap" style="flex: 1; min-width: 240px; position: relative;">
            <svg class="pt-search-icon" width="15" height="15" viewBox="0 0 15 15" fill="none" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--slate-400);">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.5"/>
              <path d="M10 10l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <input class="pt-search-inp" id="vdSearch" placeholder="Search voucher #, particulars, amount, date…" style="padding-left: 36px; width: 100%; height: 38px; border-radius: 8px; border: 1.5px solid var(--slate-200); font-size: 13.5px; transition: all 0.15s;" value="${_vdSearch.replace(/"/g,'&quot;')}">
          </div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <select id="vdTypeFilter" style="height: 38px; padding: 0 12px; border-radius: 8px; border: 1.5px solid var(--slate-200); font-size: 13px; font-weight: 600; color: var(--slate-700); background: var(--white);">
              <option value="All" ${_vdTypeFilter === 'All' ? 'selected' : ''}>All Types</option>
              <option value="Journal" ${_vdTypeFilter === 'Journal' ? 'selected' : ''}>Journal Entry</option>
              <option value="Invoice" ${_vdTypeFilter === 'Invoice' ? 'selected' : ''}>Sales Invoice</option>
              <option value="Order" ${_vdTypeFilter === 'Order' ? 'selected' : ''}>Sales Order</option>
              <option value="Reversal" ${_vdTypeFilter === 'Reversal' ? 'selected' : ''}>Sales Reversal</option>
            </select>
          </div>
        </div>

        <div class="pt-table-wrap">
          <table class="pt-table">
            <thead>
              <tr style="background: linear-gradient(90deg, var(--blue-700), var(--blue-500));">
                <th style="width: 32px; text-align: center;">#</th>
                <th>Date</th>
                <th>Voucher No.</th>
                <th>Type</th>
                <th>Particulars / Narration</th>
                <th style="text-align: right;">Amount</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map((e, index) => {
                const typeBadge = e.type === 'Journal'
                   ? `<span class="tb-badge" style="background:#e0f2fe; color:#0369a1; border:1.5px solid #bae6fd; font-size:11px; padding:3px 8px; text-transform:none;">Journal Entry</span>`
                   : (e.type === 'Reversal'
                      ? `<span class="tb-badge" style="background:#fee2e2; color:#b91c1c; border:1.5px solid #fca5a5; font-size:11px; padding:3px 8px; text-transform:none;">Sales Reversal</span>`
                      : (e.type === 'Order'
                         ? `<span class="tb-badge" style="background:#e0e7ff; color:#4338ca; border:1.5px solid #c7d2fe; font-size:11px; padding:3px 8px; text-transform:none;">Sales Order</span>`
                         : `<span class="tb-badge" style="background:#dcfce7; color:#15803d; border:1.5px solid #bbf7d0; font-size:11px; padding:3px 8px; text-transform:none;">Sales Invoice</span>`));

                let statusBadge = '';
                if (e.isDraft) {
                  statusBadge = `<span class="tb-badge" style="background:#fffbeb; color:#d97706; border:1.5px solid #fde68a; font-size:11px; padding:3px 8px; text-transform:none;">Draft</span>`;
                } else if (e.type === 'Order') {
                  const isCompleted = (window.KYA_STORE.salesVouchers || []).some(v => !v.isOrder && !v.isReturn && v.orderNo === e.voucherNo);
                  if (isCompleted) {
                    statusBadge = `<span class="tb-badge" style="background:#ecfdf5; color:#059669; border:1.5px solid #a7f3d0; font-size:11px; padding:3px 8px; text-transform:none;">Completed</span>`;
                  } else {
                    statusBadge = `<span class="tb-badge" style="background:#e0f2fe; color:#0369a1; border:1.5px solid #bae6fd; font-size:11px; padding:3px 8px; text-transform:none;">Placed</span>`;
                  }
                } else {
                  statusBadge = `<span class="tb-badge" style="background:#ecfdf5; color:#059669; border:1.5px solid #a7f3d0; font-size:11px; padding:3px 8px; text-transform:none;">Posted</span>`;
                }

                const amtColor = e.type === 'Journal' ? 'var(--blue-600)' : (e.type === 'Reversal' ? '#dc2626' : (e.type === 'Order' ? 'var(--emerald-700)' : '#059669'));

                return `
                  <tr data-id="${e.id}" data-type="${e.type}" data-draft="${e.isDraft}" class="vd-row" style="cursor: pointer;">
                    <td style="color:#94a3b8; font-size:12px; font-weight:600; text-align:center;">${index + 1}</td>
                    <td style="white-space:nowrap;">${e.date || '—'}</td>
                    <td><span style="font-family: monospace; font-weight: 700; color: var(--slate-700);">${e.voucherNo || '—'}</span></td>
                    <td>${typeBadge}</td>
                    <td style="font-weight:500; color:var(--slate-800); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${ohEsc(e.particulars)}</td>
                    <td style="text-align:right; font-weight:700; color:${amtColor}; white-space:nowrap;">₹&thinsp;${e.amount}</td>
                    <td style="text-align:center;">${statusBadge}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    wrap.innerHTML = tableHtml;

    // Update active state of top status tab switcher
    document.querySelectorAll('.vd-status-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.status === _vdStatusFilter);
    });

    const searchEl = document.getElementById('vdSearch');
    if (searchEl) {
      searchEl.addEventListener('input', e => {
        _vdSearch = e.target.value;
        renderVoucherDeskPanel();
      });
    }

    const typeFilterEl = document.getElementById('vdTypeFilter');
    if (typeFilterEl) {
      typeFilterEl.addEventListener('change', e => {
        _vdTypeFilter = e.target.value;
        renderVoucherDeskPanel();
      });
    }

    wrap.querySelectorAll('.vd-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = Number(row.dataset.id);
        const type = row.dataset.type;
        const isDraft = row.dataset.draft === 'true';

        if (type === 'Journal') {
          const entry = isDraft
            ? draftedEntries.find(e => e.id === id)
            : postedEntries.find(e => e.id === id);
          if (entry) showFullJournalModal(entry, isDraft);
        } else if (type === 'Invoice' || type === 'Reversal' || type === 'Order') {
          if (isDraft) {
            editSalesDraft(id);
          } else {
            viewPrintInvoice(id);
          }
        }
      });
    });

    if (isSearchFocused) {
      const searchInput = document.getElementById('vdSearch');
      if (searchInput) {
        searchInput.focus();
        try { searchInput.setSelectionRange(caretStart, caretEnd); } catch (e) {}
      }
    }
  }




  // ══════════════════════════════════════════════════════════════════
  //  CHART OF ACCOUNTS
  // ══════════════════════════════════════════════════════════════════

  // ── System data ──────────────────────────────────────────────────
  const COA_MAIN_GROUPS = [
    { id:'assets',             name:'Assets',                  color:'#2563eb', light:'#eff6ff', badge:'#2563eb' },
    { id:'equity-liabilities', name:'Equity and Liabilities',  color:'#7c3aed', light:'#f5f3ff', badge:'#7c3aed' },
    { id:'income',             name:'Income',                  color:'#059669', light:'#ecfdf5', badge:'#059669' },
    { id:'expense',            name:'Expense',                 color:'#dc2626', light:'#fff5f5', badge:'#dc2626' },
  ];

  // parentId:null → L1 sub-group; parentId:'xxx' → L2 sub-group (child of L1)
  const COA_SYS_SGS = [
    // ── Equity and Liabilities ────────────────────────────────────
    { id:'sg-shf',  main:'equity-liabilities', parent:null,     name:"Shareholders' Funds" },
    { id:'sg-sc',   main:'equity-liabilities', parent:'sg-shf', name:'Share Capital' },
    { id:'sg-rs',   main:'equity-liabilities', parent:'sg-shf', name:'Reserves and Surplus' },
    { id:'sg-mrsw', main:'equity-liabilities', parent:'sg-shf', name:'Money Received Against Share Warrants' },
    { id:'sg-ncl',  main:'equity-liabilities', parent:null,     name:'Non-Current Liabilities' },
    { id:'sg-ltb',  main:'equity-liabilities', parent:'sg-ncl', name:'Long-Term Borrowings' },
    { id:'sg-dtl',  main:'equity-liabilities', parent:'sg-ncl', name:'Deferred Tax Liabilities (Net)' },
    { id:'sg-oll',  main:'equity-liabilities', parent:'sg-ncl', name:'Other Long-Term Liabilities' },
    { id:'sg-ltp',  main:'equity-liabilities', parent:'sg-ncl', name:'Long-Term Provisions' },
    { id:'sg-cl',   main:'equity-liabilities', parent:null,     name:'Current Liabilities' },
    { id:'sg-stb',  main:'equity-liabilities', parent:'sg-cl',  name:'Short-Term Borrowings' },
    { id:'sg-tp',   main:'equity-liabilities', parent:'sg-cl',  name:'Trade Payables' },
    { id:'sg-ocl',  main:'equity-liabilities', parent:'sg-cl',  name:'Other Current Liabilities' },
    { id:'sg-stp',  main:'equity-liabilities', parent:'sg-cl',  name:'Short-Term Provisions' },
    // ── Assets ───────────────────────────────────────────────────
    { id:'sg-nca',  main:'assets', parent:null,     name:'Non-Current Assets' },
    { id:'sg-ppe',  main:'assets', parent:'sg-nca', name:'Property, Plant and Equipment (PPE)' },
    { id:'sg-cwip', main:'assets', parent:'sg-nca', name:'Capital Work-in-Progress' },
    { id:'sg-ia',   main:'assets', parent:'sg-nca', name:'Intangible Assets' },
    { id:'sg-iaud', main:'assets', parent:'sg-nca', name:'Intangible Assets Under Development' },
    { id:'sg-nci',  main:'assets', parent:'sg-nca', name:'Non-Current Investments' },
    { id:'sg-ltla', main:'assets', parent:'sg-nca', name:'Long-Term Loans and Advances' },
    { id:'sg-onca', main:'assets', parent:'sg-nca', name:'Other Non-Current Assets' },
    { id:'sg-ca',   main:'assets', parent:null,     name:'Current Assets' },
    { id:'sg-ci',   main:'assets', parent:'sg-ca',  name:'Current Investments' },
    { id:'sg-inv',  main:'assets', parent:'sg-ca',  name:'Inventories' },
    { id:'sg-tr',   main:'assets', parent:'sg-ca',  name:'Trade Receivables' },
    { id:'sg-cce',  main:'assets', parent:'sg-ca',  name:'Cash and Cash Equivalents' },
    { id:'sg-stla', main:'assets', parent:'sg-ca',  name:'Short-Term Loans and Advances' },
    { id:'sg-oca',  main:'assets', parent:'sg-ca',  name:'Other Current Assets' },
    // ── Income ───────────────────────────────────────────────────
    { id:'sg-rfo',  main:'income', parent:null, name:'Revenue from Operations' },
    { id:'sg-oi',   main:'income', parent:null, name:'Other Income' },
    // ── Expense ──────────────────────────────────────────────────
    { id:'sg-cmc',  main:'expense', parent:null, name:'Cost of Materials Consumed' },
    { id:'sg-pst',  main:'expense', parent:null, name:'Purchases of Stock-in-Trade' },
    { id:'sg-cinv', main:'expense', parent:null, name:'Changes in Inventories of Finished Goods, Work-in-Progress and Stock-in-Trade' },
    { id:'sg-ebe',  main:'expense', parent:null, name:'Employee Benefits Expense' },
    { id:'sg-fc',   main:'expense', parent:null, name:'Finance Costs' },
    { id:'sg-da',   main:'expense', parent:null, name:'Depreciation and Amortization Expense' },
    { id:'sg-oe',   main:'expense', parent:null, name:'Other Expenses' },
    { id:'sg-tax',  main:'expense', parent:null, name:'Tax Expense' },
  ];


  // ── State ────────────────────────────────────────────────────────
  let _globalDateFrom = '2024-04-01';
  let _globalDateTo   = '2025-03-31';
  let _tbOptionalCols = { gl: false, sg: false, mg: false, plbs: false };

