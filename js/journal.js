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
  if (typeof window !== 'undefined') window.getNextJournalVoucherNo = getNextJournalVoucherNo;

  function genVoucherNo(dateStr) {
    return getNextJournalVoucherNo(dateStr || (document.getElementById('jeDate')?.value), false);
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

  let _jeLastSelectedDate = '';
  try {
    _jeLastSelectedDate = localStorage.getItem('kya_je_last_date') || '';
  } catch (e) {}

  // ── Date listeners ───────────────────────────────────────────────
  const jeDateEl = document.getElementById('jeDate');
  if (jeDateEl) {
    jeDateEl.addEventListener('change', function() {
      if (this.value) {
        _jeLastSelectedDate = this.value;
        try { localStorage.setItem('kya_je_last_date', this.value); } catch(e) {}
        if (!window._editingJournalEntry) {
          const curVn = (document.getElementById('jeVoucherNo')?.value || '').trim();
          if (!curVn || /^JV-\d{4}-\d+$/i.test(curVn)) {
            const newVn = genVoucherNo(this.value);
            document.getElementById('jeVoucherNo').value = newVn;
            document.getElementById('jeVoucherChipDisplay').textContent = newVn;
          }
        }
      }
    });
    jeDateEl.addEventListener('input', function() {
      if (this.value) {
        _jeLastSelectedDate = this.value;
        try { localStorage.setItem('kya_je_last_date', this.value); } catch(e) {}
      }
    });
    jeDateEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); focusFirstParticulars(); }
    });
  }

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
    const bg = document.getElementById('jeTxSliderBg');
    const btnNon = document.getElementById('btnJeTxNonBudget');
    const btnBud = document.getElementById('btnJeTxBudget');
    if (!tog) return;
    const isBudget = !!tog.checked;
    if (bg) {
      bg.className = 'je-tx-slider-bg ' + (isBudget ? 'budget-active' : 'non-budget-active');
    }
    if (btnNon) btnNon.classList.toggle('active', !isBudget);
    if (btnBud) btnBud.classList.toggle('active', isBudget);
  }

  // ── Document Attachment Helpers ────────────────────────────────────
  window._jeUploadedDoc = null;

  function formatJeDocBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function updateJeDocUI(doc) {
    const emptyState = document.getElementById('jeDocEmptyState');
    const selectedState = document.getElementById('jeDocSelectedState');
    const badge = document.getElementById('jeDocStatusBadge');
    const nameEl = document.getElementById('jeDocFileName');
    const sizeEl = document.getElementById('jeDocFileSize');
    const iconEl = document.getElementById('jeDocFileIcon');
    const previewBtn = document.getElementById('jeDocPreviewBtn');
    const fileInp = document.getElementById('jeDocFileInput');

    if (!doc || !doc.fileData) {
      window._jeUploadedDoc = null;
      if (emptyState) emptyState.style.display = 'flex';
      if (selectedState) selectedState.style.display = 'none';
      if (badge) badge.style.display = 'none';
      if (fileInp) fileInp.value = '';
      return;
    }

    window._jeUploadedDoc = doc;
    if (emptyState) emptyState.style.display = 'none';
    if (selectedState) selectedState.style.display = 'flex';
    if (badge) badge.style.display = 'inline-block';
    
    if (nameEl) nameEl.textContent = doc.fileName || 'Attachment';
    if (sizeEl) sizeEl.textContent = doc.fileSize || formatJeDocBytes(doc.fileBytes || 0);
    
    const ext = (doc.fileName || '').split('.').pop().toUpperCase();
    if (iconEl) {
      iconEl.textContent = ext.substring(0, 4) || 'DOC';
      if (['PDF'].includes(ext)) {
        iconEl.style.background = '#fee2e2'; iconEl.style.color = '#991b1b';
      } else if (['JPG','JPEG','PNG','WEBP'].includes(ext)) {
        iconEl.style.background = '#e0e7ff'; iconEl.style.color = '#3730a3';
      } else if (['XLS','XLSX','CSV'].includes(ext)) {
        iconEl.style.background = '#dcfce7'; iconEl.style.color = '#166534';
      } else {
        iconEl.style.background = '#dbeafe'; iconEl.style.color = '#1e40af';
      }
    }
    
    if (previewBtn) {
      previewBtn.href = doc.fileData;
      previewBtn.download = doc.fileName || 'document';
    }
  }

  function handleJeDocUpload(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('File size exceeds 10MB limit.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const doc = {
        fileName: file.name,
        fileSize: formatJeDocBytes(file.size),
        fileBytes: file.size,
        fileData: e.target.result
      };
      updateJeDocUI(doc);
      showToast(`Document "${file.name}" attached.`, 'success');
    };
    reader.readAsDataURL(file);
  }

  function setupJeDocEventListeners() {
    const fileInp = document.getElementById('jeDocFileInput');
    const dropzone = document.getElementById('jeDocDropzone');
    const removeBtn = document.getElementById('jeDocRemoveBtn');

    if (dropzone && fileInp && !dropzone.dataset.bound) {
      dropzone.dataset.bound = 'true';
      dropzone.addEventListener('click', (e) => {
        if (e.target.closest('#jeDocRemoveBtn') || e.target.closest('#jeDocPreviewBtn')) return;
        fileInp.click();
      });

      fileInp.addEventListener('change', () => {
        if (fileInp.files && fileInp.files[0]) {
          handleJeDocUpload(fileInp.files[0]);
        }
      });

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--blue-500)';
        dropzone.style.background = 'var(--blue-50)';
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'var(--slate-300)';
        dropzone.style.background = 'var(--white)';
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--slate-300)';
        dropzone.style.background = 'var(--white)';
        if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
          handleJeDocUpload(e.dataTransfer.files[0]);
        }
      });
    }

    if (removeBtn && !removeBtn.dataset.bound) {
      removeBtn.dataset.bound = 'true';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateJeDocUI(null);
        showToast('Attached document removed.', 'info');
      });
    }
  }

  // ── Initialise form defaults ──────────────────────────────────────
  function initFormDefaults() {
    const d = new Date();
    const iso = d.toISOString().split('T')[0];
    const targetDate = _jeLastSelectedDate || iso;
    const dateInput = document.getElementById('jeDate');
    if (dateInput) dateInput.value = targetDate;
    const vn = genVoucherNo(targetDate);
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
    updateJeDocUI(null);
    setupJeDocEventListeners();
    window._editingJournalEntry = null;
  }

  function loadJournalEntry(entry, isDraft, returnContext) {
    const existingReconPop = document.getElementById('clReconLedgerPopover');
    if (existingReconPop) existingReconPop.remove();

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
    
    jeRows = JSON.parse(JSON.stringify(entry.allRows || []));
    jeCounter = 1;
    jeRows.forEach(row => {
      row.id = jeCounter++;
    });
    
    renderRows();
    refreshTotals();
    updateJeDocUI(entry.uploadedDoc || null);
    setupJeDocEventListeners();
    
    window._editingJournalEntry = { 
      id: entry.id, 
      isDraft: isDraft,
      returnContext: returnContext || window._pendingJournalReturnContext || null
    };

    if (jeRows.length > 1 && jeRows[0].lockParticular) {
      setTimeout(() => {
        focusParticularsOfRow(jeRows[1].id);
      }, 100);
    } else {
      setTimeout(focusFirstParticulars, 100);
    }
  }
  window.loadJournalEntry = loadJournalEntry;

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
      if (row.lockType) {
        sel.disabled = true;
        sel.style.cursor = 'default';
        sel.style.opacity = '1';
        sel.title = 'Bank entry type is fixed';
      } else {
        sel.addEventListener('change', () => {
          row.type = sel.value;
          sel.className = 'je-type-select ' + (sel.value === 'By' ? 'type-by' : 'type-to');
          // Move any existing amount to the correct bucket
          if (sel.value === 'By') { row.debit = row.credit || row.debit; row.credit = ''; }
          else                    { row.credit = row.debit || row.credit; row.debit  = ''; }
          refreshTotals();
          renderRows();
        });
      }
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

      if (row.lockAmount) {
        inpAmt.readOnly = true;
        inpAmt.style.backgroundColor = '#f8fafc';
        inpAmt.style.color = '#1e293b';
        inpAmt.style.fontWeight = '700';
        inpAmt.style.cursor = 'not-allowed';
        inpAmt.tabIndex = -1;
        inpAmt.title = 'Bank statement amount is fixed and cannot be edited';
      } else {
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

            let v = parseAmt(inpAmt.value);

            // Auto amount (tally amount) only if current row type can actually balance Total Dr and Cr
            if ((!v || v <= 0) && inpAmt.value.trim() === '') {
              let otherDr = 0;
              let otherCr = 0;
              jeRows.forEach(r => {
                if (r.id !== row.id) {
                  otherDr += parseAmt(r.debit);
                  otherCr += parseAmt(r.credit);
                }
              });

              let tallyAmt = 0;
              if (row.type === 'To' && otherDr > otherCr) {
                tallyAmt = otherDr - otherCr;
              } else if (row.type === 'By' && otherCr > otherDr) {
                tallyAmt = otherCr - otherDr;
              }

              if (tallyAmt > 0) {
                v = tallyAmt;
              }
            }

            if (!v || v <= 0) {
              showToast('Please enter an amount greater than zero.', 'warning');
              return;
            }

            const fmt = v.toFixed(2);
            inpAmt.value = fmt;
            if (row.type === 'By') { row.debit = fmt; row.credit = ''; }
            else                   { row.credit = fmt; row.debit = ''; }

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
              const nextType = totalDr > totalCr ? 'To' : 'By';
              if (e.key === 'Enter') addRow(nextType);
              else                   addRow('By');
            }

          } else if (e.key === 'Tab') {
            let v = parseAmt(inpAmt.value);
            if ((!v || v <= 0) && inpAmt.value.trim() === '') {
              let otherDr = 0, otherCr = 0;
              jeRows.forEach(r => {
                if (r.id !== row.id) {
                  otherDr += parseAmt(r.debit);
                  otherCr += parseAmt(r.credit);
                }
              });
              let tallyAmt = 0;
              if (row.type === 'To' && otherDr > otherCr) {
                tallyAmt = otherDr - otherCr;
              } else if (row.type === 'By' && otherCr > otherDr) {
                tallyAmt = otherCr - otherDr;
              }
              if (tallyAmt > 0) {
                v = tallyAmt;
                const fmt = v.toFixed(2);
                inpAmt.value = fmt;
                if (row.type === 'By') { row.debit = fmt; row.credit = ''; }
                else                   { row.credit = fmt; row.debit = ''; }
                refreshTotals();
              }
            }
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
      }

      tdAmt.appendChild(inpAmt);

      // ── Delete button
      const tdDel = document.createElement('td');
      const delBtn = document.createElement('button');
      delBtn.className = 'je-del-btn';
      delBtn.setAttribute('aria-label', 'Delete row');
      delBtn.innerHTML = `
        <svg viewBox="0 0 15 15" fill="none" style="width: 13px; height: 13px;">
          <path d="M5.5 2h4M1.5 4h12M2.5 4l1 9.5a1 1 0 001 .5h6a1 1 0 001-.5l1-9.5M5.5 6.5v5M9.5 6.5v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
      `;
      if (row.isBankRow || row.lockDelete) {
        delBtn.disabled = true;
        delBtn.style.opacity = '0.2';
        delBtn.style.cursor = 'not-allowed';
        delBtn.style.pointerEvents = 'none';
        delBtn.title = 'Bank statement line cannot be deleted';
      } else {
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
      }
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

    // Group accent colours matching CoA main groups and party types
    const GROUP_COLORS = {
      assets:               '#3b82f6',
      'equity-liabilities': '#8b5cf6',
      income:               '#10b981',
      expense:              '#f59e0b',
      customers:            '#0284c7',
      suppliers:            '#d97706',
    };

    function _dotColor(item) {
      if (item.category === 'customer') return '#0284c7';
      if (item.category === 'supplier') return '#d97706';
      const sg = (typeof COA_SYS_SGS !== 'undefined')
        ? COA_SYS_SGS.find(s => s.id === item.sgId) : null;
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

    function _items() { return el.querySelectorAll('.je-drop-item, .je-drop-create-item'); }

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
      if (!inp || !inp.isConnected) return;
      const r = inp.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) {
        requestAnimationFrame(() => {
          if (_open && _activeInp === inp) _position(inp);
        });
        return;
      }
      const spaceBelow = window.innerHeight - r.bottom - 8;
      const spaceAbove = r.top - 8;
      const maxH       = Math.min(280, Math.max(spaceBelow, spaceAbove) - 8);
      el.style.maxHeight = maxH + 'px';
      el.style.width     = Math.max(r.width, 260) + 'px';
      el.style.left      = Math.max(8, Math.min(r.left, window.innerWidth - Math.max(r.width, 260) - 8)) + 'px';
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

      const items = [];

      // 1. Chart of Accounts Ledgers
      if (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) {
        coaLedgers.forEach(l => {
          if (l.type !== 'ledger') return;
          const sg = (typeof COA_SYS_SGS !== 'undefined') ? COA_SYS_SGS.find(s => s.id === l.sgId) : null;
          const grpKey = sg ? sg.main : '__other__';
          items.push({
            name: l.name,
            aliases: l.aliases || [],
            code: l.code || '',
            category: 'ledger',
            groupKey: grpKey,
            sgId: l.sgId,
            raw: l
          });
        });
      }

      // 2. Customers
      const custs = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
      custs.forEach(c => {
        items.push({
          name: c.name,
          aliases: c.aliases || [],
          code: c.code || '',
          category: 'customer',
          groupKey: 'customers',
          raw: c
        });
      });

      // 3. Suppliers
      const supps = typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : [];
      supps.forEach(s => {
        items.push({
          name: s.name,
          aliases: s.aliases || [],
          code: s.code || '',
          category: 'supplier',
          groupKey: 'suppliers',
          raw: s
        });
      });

      const GROUP_ORDER = {
        'assets': 1,
        'equity-liabilities': 2,
        'income': 3,
        'expense': 4,
        'customers': 5,
        'suppliers': 6,
        '__other__': 7
      };

      const matches = items
        .filter(item => {
          const nm = (item.name || '').toLowerCase().includes(q);
          const ak = item.aliases && item.aliases.some(a => (a || '').toLowerCase().includes(q));
          const cd = (item.code || '').toLowerCase().includes(q);
          return nm || ak || cd;
        })
        .sort((a, b) => {
          const ga = GROUP_ORDER[a.groupKey] || 99;
          const gb = GROUP_ORDER[b.groupKey] || 99;
          if (ga !== gb) return ga - gb;

          const as = (a.name || '').toLowerCase().startsWith(q) ? 0 : 1;
          const bs = (b.name || '').toLowerCase().startsWith(q) ? 0 : 1;
          return as - bs || (a.name || '').localeCompare(b.name || '');
        });

      el.innerHTML = '';

      if (!matches.length) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'je-drop-empty';
        emptyDiv.innerHTML = `
          <svg class="je-drop-empty-icon" width="28" height="28" viewBox="0 0 32 32" fill="none">
            <circle cx="14" cy="14" r="9" stroke="currentColor" stroke-width="1.8"/>
            <path d="M21 21l6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          <span class="je-drop-empty-txt">No account, customer, or supplier found</span>
          <button type="button" class="je-drop-create-item" id="jeDropCreateLedgerBtn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Create Ledger</span>
          </button>
        `;
        const createBtn = emptyDiv.querySelector('#jeDropCreateLedgerBtn');
        if (createBtn) {
          createBtn.addEventListener('mousedown', e => {
            e.preventDefault();
            e.stopPropagation();
            const targetInp = _activeInp;
            const rowEl = targetInp ? targetInp.closest('[data-row-id]') : null;
            const rowId = rowEl ? Number(rowEl.dataset.rowId) : null;
            const searchVal = query ? query.trim() : (targetInp ? targetInp.value.trim() : '');
            window._jeOpeningMasterDesk = true;
            close();
            triggerCreateLedgerFromJournal(searchVal, rowId);
          });
        }
        el.appendChild(emptyDiv);
        _setHL(0);
      } else {
        const GROUP_LABELS = {
          assets: 'Assets', 'equity-liabilities': 'Equity & Liabilities',
          income: 'Income', expense: 'Expense',
          customers: 'Customers', suppliers: 'Suppliers'
        };
        let lastGroup = null;

        matches.forEach(acct => {
          const grpKey = acct.groupKey || '__other__';

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
          const badgeHtml = acct.category === 'customer'
            ? `<span class="je-drop-badge badge-customer">Customer</span>`
            : (acct.category === 'supplier'
              ? `<span class="je-drop-badge badge-supplier">Supplier</span>`
              : '');

          item.innerHTML = `
            <span class="je-drop-dot" style="background:${_dotColor(acct)}"></span>
            <span class="je-drop-name">${_hl(acct.name, query)}${akaStr ? `<span style="font-size:11px;color:#94a3b8;margin-left:4px">${_hl(akaStr, query)}</span>` : ''}</span>
            ${badgeHtml}
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
      requestAnimationFrame(() => {
        if (_open && _activeInp === inp) _position(inp);
      });
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

  function triggerCreateLedgerFromJournal(initialName, rowId) {
    window._jeOpeningMasterDesk = true;
    if (typeof window.openMasterDeskCreateLedger === 'function') {
      window.openMasterDeskCreateLedger({
        initialName: initialName || '',
        rowId: rowId,
        returnTab: 'journal'
      });
    } else {
      if (typeof openTab === 'function') openTab('master_desk');
      else if (typeof window.openTab === 'function') window.openTab('master_desk');
      else if (typeof navigateTo === 'function') navigateTo('master_desk');
    }
  }

  window.onLedgerCreatedForJournal = function(newLedger, rowId) {
    window._jeOpeningMasterDesk = false;
    if (!newLedger || !newLedger.name) return;

    let targetRow = (typeof rowId === 'number') ? jeRows.find(r => r.id === rowId) : null;
    if (!targetRow && jeRows.length > 0) {
      targetRow = jeRows[jeRows.length - 1];
    }

    if (targetRow) {
      targetRow.particular = newLedger.name;
      setTimeout(() => {
        const tr = document.querySelector(`[data-row-id="${targetRow.id}"]`);
        if (tr) {
          const inp = tr.querySelector('.je-particulars-input');
          if (inp) {
            inp.value = newLedger.name;
            const wrap = inp.closest('.je-particulars-wrap');
            if (wrap) updateParticularsBalanceBadge(wrap, newLedger.name);
          }
        }
        focusDebitOfRow(targetRow.id);
      }, 60);
    }
  };

  window.onLedgerCreationCancelledForJournal = function(rowId, initialName) {
    window._jeOpeningMasterDesk = false;
    let targetRow = (typeof rowId === 'number') ? jeRows.find(r => r.id === rowId) : null;
    if (!targetRow && jeRows.length > 0) {
      targetRow = jeRows[0];
    }
    if (targetRow) {
      if (initialName !== undefined && initialName !== null) {
        targetRow.particular = initialName;
      }
      setTimeout(() => {
        const tr = document.querySelector(`[data-row-id="${targetRow.id}"]`);
        if (tr) {
          const inp = tr.querySelector('.je-particulars-input');
          if (inp) {
            if (initialName !== undefined && initialName !== null) {
              inp.value = initialName;
            }
            inp.focus();
            _jePortal.open(inp, inp.value, function(acct) {
              inp.value = acct.name;
              targetRow.particular = acct.name;
              const wrap = inp.closest('.je-particulars-wrap');
              if (wrap) updateParticularsBalanceBadge(wrap, acct.name);
              focusDebitOfRow(targetRow.id);
            });
          }
        }
      }, 60);
    }
  };

  // ── Calculate net unposted Dr/Cr impact from current form rows ───
  function getCurrentFormNetImpact(particularName) {
    if (!particularName || !particularName.trim()) return { dr: 0, cr: 0 };
    const nameTrimmed = particularName.trim().toLowerCase();
    let dr = 0;
    let cr = 0;

    // If editing an existing posted voucher, subtract the original entry's amounts to avoid double-counting
    let origDr = 0;
    let origCr = 0;
    if (window._editingJournalEntry && !window._editingJournalEntry.isDraft && typeof postedEntries !== 'undefined') {
      const origEntry = postedEntries.find(e => String(e.id) === String(window._editingJournalEntry.id));
      if (origEntry && Array.isArray(origEntry.allRows)) {
        origEntry.allRows.forEach(r => {
          if ((r.particular || '').trim().toLowerCase() === nameTrimmed) {
            origDr += parseAmt(r.debit);
            origCr += parseAmt(r.credit);
          }
        });
      }
    }

    if (Array.isArray(jeRows)) {
      jeRows.forEach(r => {
        if ((r.particular || '').trim().toLowerCase() === nameTrimmed) {
          dr += parseAmt(r.debit);
          cr += parseAmt(r.credit);
        }
      });
    }

    return {
      dr: dr - origDr,
      cr: cr - origCr
    };
  }

  // ── Helper to calculate closing balance for an account/party ──────
  function getAccountClosingBalance(particularName) {
    if (!particularName || !particularName.trim()) return null;
    const nameTrimmed = particularName.trim().toLowerCase();
    const impact = getCurrentFormNetImpact(nameTrimmed);

    // 1. Check Customer
    const custs = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
    const cust = custs.find(c => (c.name || '').trim().toLowerCase() === nameTrimmed);
    if (cust) {
      if (typeof getCustomerStatementData === 'function') {
        const data = getCustomerStatementData(cust.id);
        if (data) {
          const baseBal = data.closingBalance || 0;
          const liveBal = baseBal + impact.dr - impact.cr;
          const balType = liveBal > 0.004 ? 'Dr' : (liveBal < -0.004 ? 'Cr' : '');
          return {
            amount: Math.abs(liveBal),
            type: balType,
            text: `₹${fmtNum(Math.abs(liveBal))}${balType ? ' ' + balType : ''}`,
            rawBal: liveBal,
            category: 'customer'
          };
        }
      }
    }

    // 2. Check Supplier
    const supps = typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : [];
    const supp = supps.find(s => (s.name || '').trim().toLowerCase() === nameTrimmed);
    if (supp) {
      if (typeof getSupplierStatementData === 'function') {
        const data = getSupplierStatementData(supp.id);
        if (data) {
          const baseBal = data.closingBalance || 0;
          const liveBal = baseBal + impact.cr - impact.dr;
          const balType = liveBal > 0.004 ? 'Cr' : (liveBal < -0.004 ? 'Dr' : '');
          return {
            amount: Math.abs(liveBal),
            type: balType,
            text: `₹${fmtNum(Math.abs(liveBal))}${balType ? ' ' + balType : ''}`,
            rawBal: liveBal,
            category: 'supplier'
          };
        }
      }
    }

    // 3. Check General CoA Ledger
    if (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) {
      const ldg = coaLedgers.find(l => l.type === 'ledger' && (l.name || '').trim().toLowerCase() === nameTrimmed);
      if (ldg) {
        if (typeof calculateLedgerBalances === 'function') {
          const balances = calculateLedgerBalances(ldg);
          const mainGroup = typeof getLedgerMainGroup === 'function' ? getLedgerMainGroup(ldg) : 'assets';
          const isDrGroup = (mainGroup === 'assets' || mainGroup === 'expense');
          const baseBal = balances.closingBalance || 0;
          
          let liveBal = 0;
          if (isDrGroup) {
            liveBal = baseBal + impact.dr - impact.cr;
          } else {
            liveBal = baseBal + impact.cr - impact.dr;
          }

          let balType = '';
          if (liveBal > 0.004) {
            balType = isDrGroup ? 'Dr' : 'Cr';
          } else if (liveBal < -0.004) {
            balType = isDrGroup ? 'Cr' : 'Dr';
          }

          return {
            amount: Math.abs(liveBal),
            type: balType,
            text: `₹${fmtNum(Math.abs(liveBal))}${balType ? ' ' + balType : ''}`,
            rawBal: liveBal,
            category: 'ledger'
          };
        }
      }
    }

    return null;
  }

  function updateParticularsBalanceBadge(wrap, particularName) {
    if (!wrap) return;
    const inp = wrap.querySelector('.je-particulars-input');
    const balBadge = wrap.querySelector('.je-particulars-bal-badge');
    if (!balBadge || !inp) return;

    const info = getAccountClosingBalance(particularName || (inp ? inp.value : ''));
    if (info) {
      balBadge.textContent = info.text;
      balBadge.style.display = 'inline-flex';
      balBadge.title = `Closing Balance: ₹${fmtNum(info.amount)}${info.type ? ' ' + info.type : ''}`;
      
      if (info.type === 'Dr') {
        balBadge.className = 'je-particulars-bal-badge bal-dr';
      } else if (info.type === 'Cr') {
        balBadge.className = 'je-particulars-bal-badge bal-cr';
      } else {
        balBadge.className = 'je-particulars-bal-badge bal-zero';
      }
      inp.classList.add('has-bal-badge');
    } else {
      balBadge.textContent = '';
      balBadge.style.display = 'none';
      inp.classList.remove('has-bal-badge');
    }
  }

  function updateAllParticularsBalanceBadges() {
    const tbody = document.getElementById('jeEntryBody');
    if (!tbody) return;
    const wraps = tbody.querySelectorAll('.je-particulars-wrap');
    wraps.forEach(wrap => {
      const inp = wrap.querySelector('.je-particulars-input');
      const tr = wrap.closest('[data-row-id]');
      const rowId = tr ? Number(tr.dataset.rowId) : null;
      const row = (rowId !== null) ? jeRows.find(r => r.id === rowId) : null;
      const partName = (row && row.particular) ? row.particular : (inp ? inp.value : '');
      updateParticularsBalanceBadge(wrap, partName);
    });
  }

  // ── Particulars custom dropdown cell ─────────────────────────────
  function buildParticularsCell(row, isFirstRow) {
    const wrap = document.createElement('div');
    wrap.className = 'je-particulars-wrap';

    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'je-particulars-input';
    inp.placeholder = 'Select or search ledger, customer, supplier…';
    inp.value = row.particular || '';
    inp.setAttribute('aria-label', 'Particulars / ledger account, customer, or supplier');
    inp.setAttribute('autocomplete', 'off');
    inp.setAttribute('spellcheck', 'false');

    const rightAddons = document.createElement('div');
    rightAddons.className = 'je-particulars-right-addons';

    const balBadge = document.createElement('span');
    balBadge.className = 'je-particulars-bal-badge';
    balBadge.style.display = 'none';

    const arrow = document.createElement('span');
    arrow.className = 'je-particulars-arrow';
    arrow.innerHTML = `<svg viewBox="0 0 14 14" fill="none"><path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    rightAddons.appendChild(balBadge);
    rightAddons.appendChild(arrow);

    if (row.lockParticular) {
      inp.readOnly = true;
      inp.style.backgroundColor = '#f8fafc';
      inp.style.color = '#1e293b';
      inp.style.fontWeight = '600';
      inp.style.cursor = 'default';
      inp.title = 'Bank account is fixed from statement';
      arrow.style.display = 'none';
      setTimeout(() => {
        updateParticularsBalanceBadge(wrap, row.particular);
      }, 50);
    } else {
      function _select(acct) {
        inp.value      = acct.name;
        row.particular = acct.name;
        updateAllParticularsBalanceBadges();
        const tr = inp.closest('[data-row-id]');
        if (tr) focusDebitOfRow(Number(tr.dataset.rowId));
      }

      inp.addEventListener('focus', () => _jePortal.open(inp, inp.value, _select));
      inp.addEventListener('input', () => {
        row.particular = inp.value;
        updateAllParticularsBalanceBadges();
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
              showToast('Please select a ledger, customer, or supplier in Particulars.', 'warning');
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
            showToast('Please select a ledger, customer, or supplier in Particulars.', 'warning');
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
          if (window._jeOpeningMasterDesk) return;
          const val = inp.value.trim().toLowerCase();
          if (val === '') {
            row.particular = '';
          } else {
            const custs = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
            const supps = typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : [];
            const match = (coaLedgers && coaLedgers.find(l => l.type === 'ledger' && (l.name || '').toLowerCase() === val))
              || custs.find(c => (c.name || '').toLowerCase() === val)
              || supps.find(s => (s.name || '').toLowerCase() === val);
            if (match) {
              inp.value      = match.name;
              row.particular = match.name;
            } else {
              inp.value      = '';
              row.particular = '';
              showToast('Please select a valid ledger, customer, or supplier.', 'error');
            }
          }
          updateAllParticularsBalanceBadges();
        }, 200);
      });
    }

    wrap.appendChild(inp);
    wrap.appendChild(rightAddons);

    // Initialize balance badge if row already has a particular
    updateParticularsBalanceBadge(wrap, row.particular);

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

    updateAllParticularsBalanceBadges();
  }

  // ── Add row button ────────────────────────────────────────────────
  document.getElementById('jeAddRow').addEventListener('click', () => addRow('By'));

  // ── Budget toggle listener ────────────────────────────────────────
  document.getElementById('btnJeTxNonBudget')?.addEventListener('click', () => {
    const tog = document.getElementById('jeBudgetToggle');
    if (tog) {
      tog.checked = false;
      updateJeBudgetToggleUI();
      tog.dispatchEvent(new Event('change'));
    }
  });

  document.getElementById('btnJeTxBudget')?.addEventListener('click', () => {
    const tog = document.getElementById('jeBudgetToggle');
    if (tog) {
      tog.checked = true;
      updateJeBudgetToggleUI();
      tog.dispatchEvent(new Event('change'));
    }
  });

  document.getElementById('jeBudgetToggle')?.addEventListener('change', updateJeBudgetToggleUI);

  // ── New Entry button ──────────────────────────────────────────────
  document.getElementById('btnNewJE').addEventListener('click', () => {
    jvCounter++;
    initFormDefaults();
  });

  // ── Clear button ──────────────────────────────────────────────────
  document.getElementById('btnClearJE').addEventListener('click', () => {
    const returnContext = window._editingJournalEntry?.returnContext || window._pendingJournalReturnContext;
    if (returnContext) {
      if (returnContext.cashlineNavState && typeof window.setCashlineNavigationState === 'function') {
        window.setCashlineNavigationState(returnContext.cashlineNavState);
      } else if (typeof window.setCashlineNavigationState === 'function') {
        window.setCashlineNavigationState({
          activeTopTab: returnContext.clActiveTopTab,
          activeBankingTab: returnContext.clActiveBankingTab,
          reconBankId: returnContext.clReconBankId,
          cashbookAccountId: returnContext.clCashbookAccountId,
          reconSubSection: returnContext.clReconSubSection,
          reconFilter: returnContext.clReconFilter
        });
      }
      window._editingJournalEntry = null;
      window._pendingJournalReturnContext = null;
      initFormDefaults();
      const returnTabId = returnContext.tabId || 'cashline';
      if (typeof closeTab === 'function') {
        closeTab('journal', null, returnTabId);
      } else if (typeof openTab === 'function') {
        openTab(returnTabId);
      }
      if (returnTabId === 'cashline') {
        if (typeof renderCashlinePanel === 'function') renderCashlinePanel();
        else if (typeof window.renderCashlinePanel === 'function') window.renderCashlinePanel();
      }
    } else {
      initFormDefaults();
      // Focus first particulars after reset
      setTimeout(focusFirstParticulars, 80);
    }
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
    
    const editingCtx = window._editingJournalEntry;
    const isEditDraft = editingCtx && editingCtx.isDraft;
    const entryId = isEditDraft ? editingCtx.id : Date.now();
    
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
      uploadedDoc:     window._jeUploadedDoc || null,
    };
    
    if (isEditDraft) {
      const idx = draftedEntries.findIndex(e => String(e.id) === String(entryId));
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

    if (dateVal) {
      _jeLastSelectedDate = dateVal;
      try { localStorage.setItem('kya_je_last_date', dateVal); } catch(e) {}
    }

    const returnContext = editingCtx?.returnContext || window._pendingJournalReturnContext || null;
    window._editingJournalEntry = null;
    window._pendingJournalReturnContext = null;

    triggerAutoBackup();
    if (typeof window.refreshAllAppViews === 'function') {
      window.refreshAllAppViews();
    }

    if (returnContext) {
      if (returnContext.cashlineNavState && typeof window.setCashlineNavigationState === 'function') {
        window.setCashlineNavigationState(returnContext.cashlineNavState);
      } else if (typeof window.setCashlineNavigationState === 'function') {
        window.setCashlineNavigationState({
          activeTopTab: returnContext.clActiveTopTab,
          activeBankingTab: returnContext.clActiveBankingTab,
          reconBankId: returnContext.clReconBankId,
          cashbookAccountId: returnContext.clCashbookAccountId,
          reconSubSection: returnContext.clReconSubSection,
          reconFilter: returnContext.clReconFilter
        });
      }

      initFormDefaults();

      const returnTabId = returnContext.tabId || 'cashline';
      if (typeof closeTab === 'function') {
        closeTab('journal', null, returnTabId);
      } else if (typeof openTab === 'function') {
        openTab(returnTabId);
      }

      if (returnTabId === 'cashline') {
        if (typeof renderCashlinePanel === 'function') renderCashlinePanel();
        else if (typeof window.renderCashlinePanel === 'function') window.renderCashlinePanel();
        else if (typeof renderActiveSubtab === 'function') renderActiveSubtab();
      }
    } else {
      setTimeout(initFormDefaults, 900);
    }
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
      const returnContext = window._editingJournalEntry?.returnContext || window._pendingJournalReturnContext;
      if (returnContext) {
        if (returnContext.cashlineNavState && typeof window.setCashlineNavigationState === 'function') {
          window.setCashlineNavigationState(returnContext.cashlineNavState);
        } else if (typeof window.setCashlineNavigationState === 'function') {
          window.setCashlineNavigationState({
            activeTopTab: returnContext.clActiveTopTab,
            activeBankingTab: returnContext.clActiveBankingTab,
            reconBankId: returnContext.clReconBankId,
            cashbookAccountId: returnContext.clCashbookAccountId,
            reconSubSection: returnContext.clReconSubSection,
            reconFilter: returnContext.clReconFilter
          });
        }
        window._editingJournalEntry = null;
        window._pendingJournalReturnContext = null;
        initFormDefaults();
        const returnTabId = returnContext.tabId || 'cashline';
        if (typeof closeTab === 'function') closeTab('journal', null, returnTabId);
        else if (typeof openTab === 'function') openTab(returnTabId);
        if (returnTabId === 'cashline') {
          if (typeof renderCashlinePanel === 'function') renderCashlinePanel();
          else if (typeof window.renderCashlinePanel === 'function') window.renderCashlinePanel();
        }
      } else {
        initFormDefaults();
        showToast('Journal entry reset.', 'info');
      }
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
      showToast('Please select an account, customer, or supplier for all rows.', 'error');
      return;
    }
    const custs = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
    const supps = typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : [];
    const invalidRow = jeRows.find(r => {
      const val = r.particular.trim().toLowerCase();
      const isCoa = coaLedgers.some(l => l.type === 'ledger' && (l.name || '').toLowerCase() === val);
      const isCust = custs.some(c => (c.name || '').toLowerCase() === val);
      const isSupp = supps.some(s => (s.name || '').toLowerCase() === val);
      return !isCoa && !isCust && !isSupp;
    });
    if (invalidRow) {
      showToast(`Invalid account name: "${invalidRow.particular}". Please select a valid ledger, customer, or supplier.`, 'error');
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
                <td><span class="pt-vbadge">${e.voucherNo}</span>${e.uploadedDoc && e.uploadedDoc.fileData ? `<span title="Attachment: ${typeof ohEsc === 'function' ? ohEsc(e.uploadedDoc.fileName) : e.uploadedDoc.fileName}" style="margin-left: 5px; color: #2563eb; display: inline-flex; vertical-align: middle;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></span>` : ''}</td>
                <td>${e.preparedBy}</td>
                <td style="font-weight:500;color:#1e293b">${e.firstParticular || '—'}</td>
                <td style="text-align:right"><span class="pt-amt">₹&thinsp;${e.amount || (e.allRows && e.allRows[0] ? (e.allRows[0].debit || e.allRows[0].credit) : '0.00')}</span></td>
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
          if (typeof window.refreshAllAppViews === 'function') {
            window.refreshAllAppViews();
          } else {
            renderPostedPanel();
            refreshAllReports();
            triggerAutoBackup();
          }
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
            if (entry.reconKey && window.KYA_STORE?.reconciliationState) {
              delete window.KYA_STORE.reconciliationState[entry.reconKey];
            }
            _ptSelected.delete(id);
            if (typeof window.refreshAllAppViews === 'function') {
              window.refreshAllAppViews();
            } else {
              renderPostedPanel();
              refreshAllReports();
              triggerAutoBackup();
            }
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
    const idsSet = new Set(ids.map(x => String(x)));
    const toPost = (typeof draftedEntries !== 'undefined' ? draftedEntries : []).filter(e => idsSet.has(String(e.id)));
    if (!toPost.length) {
      // If already moved to postedEntries, silently succeed without showing an error
      const alreadyPosted = (typeof postedEntries !== 'undefined' ? postedEntries : []).some(e => idsSet.has(String(e.id)));
      if (alreadyPosted) {
        return true;
      }
      return false;
    }

    // Filter out completely empty trailing rows from each entry
    toPost.forEach(entry => {
      if (Array.isArray(entry.allRows)) {
        const meaningful = entry.allRows.filter(r => (r.particular || '').trim() || parseAmt(r.debit) || parseAmt(r.credit));
        if (meaningful.length > 0) {
          entry.allRows = meaningful;
        }
      }
    });

    // Move matched drafts into postedEntries (preserve newest-first order)
    toPost.forEach(e => {
      if (!e.firstParticular && Array.isArray(e.allRows) && e.allRows.length > 0) {
        e.firstParticular = e.allRows[0].particular || '—';
      }
      if (!e.amount && Array.isArray(e.allRows) && e.allRows.length > 0) {
        const firstRow = e.allRows[0];
        const amt = parseAmt(firstRow.debit) || parseAmt(firstRow.credit);
        e.amount = fmtNum(amt);
      }
      postedEntries.unshift(e);
    });

    // Remove from drafts & selection
    draftedEntries = draftedEntries.filter(e => !idsSet.has(String(e.id)));
    ids.forEach(id => {
      if (typeof _dtSelected !== 'undefined') {
        _dtSelected.delete(Number(id));
        _dtSelected.delete(String(id));
      }
    });

    const n = toPost.length;
    if (typeof showToast === 'function') {
      showToast(
        n === 1
          ? `Draft "${toPost[0].voucherNo || '—'}" posted successfully!`
          : `${n} drafts posted successfully!`,
        'success'
      );
    }

    if (typeof window.refreshAllAppViews === 'function') {
      window.refreshAllAppViews();
    } else {
      if (typeof renderDraftedPanel === 'function') renderDraftedPanel();
      if (typeof renderPostedPanel === 'function') renderPostedPanel();
      if (typeof renderVoucherDeskPanel === 'function') renderVoucherDeskPanel();
      if (typeof refreshAllReports === 'function') refreshAllReports();
    }
    if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
    return true;
  }
  window.postDraftEntries = postDraftEntries;

  let _postingVoucherLock = false;
  function postVoucherFromDetails(id) {
    if (_postingVoucherLock) return;
    _postingVoucherLock = true;
    setTimeout(() => { _postingVoucherLock = false; }, 800);

    let entry = (typeof draftedEntries !== 'undefined' ? draftedEntries : []).find(e => String(e.id) === String(id) || e.id == id);
    if (!entry && typeof window !== 'undefined' && window._currentViewingJournalEntry) {
      if (String(window._currentViewingJournalEntry.id) === String(id)) {
        entry = window._currentViewingJournalEntry;
      }
    }

    // Close modal instantly
    document.getElementById('fjOverlay')?.remove();
    window._currentViewingJournalEntry = null;

    if (!entry) {
      const alreadyPosted = (typeof postedEntries !== 'undefined' ? postedEntries : []).some(e => String(e.id) === String(id) || e.id == id);
      if (alreadyPosted) return;
      if (typeof showToast === 'function') showToast('Draft entry not found.', 'error');
      return;
    }

    // Post entry instantly
    postDraftEntries([entry.id]);
  }
  window.postVoucherFromDetails = postVoucherFromDetails;


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
                <td><span class="dt-vbadge">${e.voucherNo || '—'}</span>${e.uploadedDoc && e.uploadedDoc.fileData ? `<span title="Attachment: ${typeof ohEsc === 'function' ? ohEsc(e.uploadedDoc.fileName) : e.uploadedDoc.fileName}" style="margin-left: 5px; color: #d97706; display: inline-flex; vertical-align: middle;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></span>` : ''}</td>
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
    window._currentViewingJournalEntry = entry;
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
      ? `<div class="fj-draft-banner" style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>This is a <strong>Draft</strong> entry — it has not been posted yet.</span>
          </div>
          <button id="fjBannerPostBtn" type="button" style="background: #16a34a; border: none; border-radius: 6px; padding: 5px 12px; cursor: pointer; color: #fff; display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; transition: background 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.1);" onmouseover="this.style.background='#15803d'" onmouseout="this.style.background='#16a34a'">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Post Entry</span>
          </button>
        </div>`
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
          <div style="display: flex; align-items: center; gap: 8px; margin-left: auto; margin-right: 16px;">
            <!-- Export dropdown wrap -->
            <div class="rpt-more-wrap" style="position: relative;">
              <button id="fjExportBtn" title="Export Voucher" style="background: rgba(255,255,255,0.15); border: none; border-radius: 6px; padding: 6px 10px; cursor: pointer; color: #fff; display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Export</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: -2px;">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              <div id="fjExportDropdown" class="rpt-more-dropdown" style="top: calc(100% + 6px); right: 0; min-width: 130px;">
                <button class="rpt-menu-item" id="fjExportPdfBtn" type="button">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                  PDF
                </button>
                <button class="rpt-menu-item" id="fjExportExcelBtn" type="button">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="8" y1="13" x2="16" y2="17"></line>
                    <line x1="16" y1="13" x2="8" y2="17"></line>
                  </svg>
                  Excel
                </button>
              </div>
            </div>

            <!-- Edit Entry Button -->
            <button onclick="editVoucherFromDetails(${entry.id}, ${!!isDraft}); document.getElementById('fjOverlay')?.remove();" title="Edit Entry" style="background: rgba(255,255,255,0.15); border: none; border-radius: 6px; padding: 6px; cursor: pointer; color: #fff; display: flex; align-items: center; justify-content: center; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <!-- Delete Entry Button -->
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
          ${entry.uploadedDoc && entry.uploadedDoc.fileData ? `
            <div style="margin-top: 16px; padding: 12px 14px; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
              <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
                <div style="width: 32px; height: 32px; border-radius: 8px; background: #dbeafe; color: #1e40af; font-size: 10px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; text-transform: uppercase;">
                  ${((entry.uploadedDoc.fileName || '').split('.').pop() || 'DOC').toUpperCase().substring(0, 4)}
                </div>
                <div style="display: flex; flex-direction: column; overflow: hidden; text-align: left;">
                  <span style="font-size: 13px; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px;">${typeof ohEsc === 'function' ? ohEsc(entry.uploadedDoc.fileName) : entry.uploadedDoc.fileName}</span>
                  <span style="font-size: 11px; color: #64748b; font-weight: 500;">${entry.uploadedDoc.fileSize || ''}</span>
                </div>
              </div>
              <a href="${entry.uploadedDoc.fileData}" download="${typeof ohEsc === 'function' ? ohEsc(entry.uploadedDoc.fileName) : entry.uploadedDoc.fileName}" target="_blank" style="padding: 6px 12px; font-size: 12px; font-weight: 700; color: #2563eb; background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; transition: all 0.2s;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download Attachment
              </a>
            </div>
          ` : ''}
        </div>
      </div>`;

    document.body.appendChild(overlay);
    overlay.focus();

    // Wire Post Entry Button (Drafts)
    const bannerPostBtn = overlay.querySelector('#fjBannerPostBtn');
    if (bannerPostBtn) {
      bannerPostBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        bannerPostBtn.disabled = true;
        bannerPostBtn.style.pointerEvents = 'none';
        bannerPostBtn.style.opacity = '0.5';
        if (typeof postVoucherFromDetails === 'function') {
          postVoucherFromDetails(entry.id);
        } else if (typeof window.postVoucherFromDetails === 'function') {
          window.postVoucherFromDetails(entry.id);
        }
      });
    }

    // Wire Export Dropdown
    const expBtn = overlay.querySelector('#fjExportBtn');
    const expDropdown = overlay.querySelector('#fjExportDropdown');
    const expPdfBtn = overlay.querySelector('#fjExportPdfBtn');
    const expExcelBtn = overlay.querySelector('#fjExportExcelBtn');

    if (expBtn && expDropdown) {
      expBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        expDropdown.classList.toggle('active');
      });
    }

    if (expPdfBtn) {
      expPdfBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (expDropdown) expDropdown.classList.remove('active');
        const entryPayload = { ...entry, isDraft: !!isDraft };
        if (typeof window.exportVoucherToPDF === 'function') {
          await window.exportVoucherToPDF(entryPayload);
        }
      });
    }

    if (expExcelBtn) {
      expExcelBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (expDropdown) expDropdown.classList.remove('active');
        const entryPayload = { ...entry, isDraft: !!isDraft };
        if (typeof window.exportVoucherToExcel === 'function') {
          await window.exportVoucherToExcel(entryPayload);
        }
      });
    }

    overlay.querySelector('#fjClose').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { 
      if (expDropdown && !expDropdown.contains(e.target) && expBtn && !expBtn.contains(e.target)) {
        expDropdown.classList.remove('active');
      }
      if (e.target === overlay) overlay.remove(); 
    });
    overlay.addEventListener('keydown', e => { if (e.key === 'Escape') overlay.remove(); });
  }

  function doPostEntry() {
    if (_savePopupEl) _savePopupEl.style.display = 'none';

    // Capture full entry snapshot before form resets
    const firstRow = jeRows[0] || {};
    const amt      = parseAmt(firstRow.debit) || parseAmt(firstRow.credit);
    
    const editingCtx = window._editingJournalEntry;
    const isEditDraft = editingCtx && editingCtx.isDraft;
    if (isEditDraft) {
      draftedEntries = draftedEntries.filter(e => String(e.id) !== String(editingCtx.id));
    }
    
    const isEditPosted = editingCtx && !editingCtx.isDraft;
    const entryId = isEditPosted ? editingCtx.id : (isEditDraft ? editingCtx.id : Date.now());
    
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
      uploadedDoc:    window._jeUploadedDoc || null,
    };

    const returnContext = editingCtx?.returnContext || window._pendingJournalReturnContext || null;

    if (returnContext && returnContext.reconKey) {
      postData.reconKey = returnContext.reconKey;
      window.KYA_STORE = window.KYA_STORE || {};
      window.KYA_STORE.reconciliationState = window.KYA_STORE.reconciliationState || {};
      window.KYA_STORE.statementConfirmed = window.KYA_STORE.statementConfirmed || {};
      window.KYA_STORE.statementLedgerMapping = window.KYA_STORE.statementLedgerMapping || {};
      window.KYA_STORE.statementNarrationMapping = window.KYA_STORE.statementNarrationMapping || {};
      window.KYA_STORE.statementDeptMapping = window.KYA_STORE.statementDeptMapping || {};
      window.KYA_STORE.statementTypeMapping = window.KYA_STORE.statementTypeMapping || {};
      window.KYA_STORE.statementDocMapping = window.KYA_STORE.statementDocMapping || {};

      window.KYA_STORE.reconciliationState[returnContext.reconKey] = postData.date;
      window.KYA_STORE.statementConfirmed[returnContext.reconKey] = true;

      // Identify contra ledger(s)
      const bankName = returnContext.bankLedgerName || '';
      const oppRows = (postData.allRows || []).filter(r => r.particular && r.particular !== bankName);
      let contraLedgerId = '';
      if (oppRows.length > 0) {
        const firstOpp = oppRows[0].particular;
        const foundLedger = (typeof coaLedgers !== 'undefined' ? coaLedgers : []).find(l => l.name === firstOpp);
        if (foundLedger) contraLedgerId = foundLedger.id;
        else contraLedgerId = firstOpp;
      }
      if (contraLedgerId) {
        window.KYA_STORE.statementLedgerMapping[returnContext.reconKey] = contraLedgerId;
      }
      if (postData.narration) {
        window.KYA_STORE.statementNarrationMapping[returnContext.reconKey] = postData.narration;
      }
      if (postData.departmentId) {
        window.KYA_STORE.statementDeptMapping[returnContext.reconKey] = postData.departmentId;
      }
      window.KYA_STORE.statementTypeMapping[returnContext.reconKey] = postData.isBudget ? 'budget' : 'non-budget';
      if (postData.uploadedDoc) {
        window.KYA_STORE.statementDocMapping[returnContext.reconKey] = postData.uploadedDoc;
      }
    }

    if (isEditPosted) {
      const idx = postedEntries.findIndex(e => String(e.id) === String(entryId));
      if (idx > -1) {
        postedEntries[idx] = postData;
      } else {
        postedEntries.unshift(postData);
      }
    } else {
      postedEntries.unshift(postData);
    }

    showToast(isEditPosted ? 'Journal entry updated successfully!' : 'Journal entry posted successfully!', 'success');
    if (!isEditPosted && !isEditDraft) {
      jvCounter++;
    }

    if (postData.date) {
      _jeLastSelectedDate = postData.date;
      try { localStorage.setItem('kya_je_last_date', postData.date); } catch(e) {}
    }

    window._editingJournalEntry = null;
    window._pendingJournalReturnContext = null;

    triggerAutoBackup();
    if (typeof window.refreshAllAppViews === 'function') {
      window.refreshAllAppViews();
    } else {
      refreshAllReports();
    }

    if (returnContext) {
      if (returnContext.cashlineNavState && typeof window.setCashlineNavigationState === 'function') {
        window.setCashlineNavigationState(returnContext.cashlineNavState);
      } else if (typeof window.setCashlineNavigationState === 'function') {
        window.setCashlineNavigationState({
          activeTopTab: returnContext.clActiveTopTab,
          activeBankingTab: returnContext.clActiveBankingTab,
          reconBankId: returnContext.clReconBankId,
          cashbookAccountId: returnContext.clCashbookAccountId,
          reconSubSection: returnContext.clReconSubSection,
          reconFilter: returnContext.clReconFilter
        });
      }

      initFormDefaults();

      const returnTabId = returnContext.tabId || 'cashline';
      if (typeof closeTab === 'function') {
        closeTab('journal', null, returnTabId);
      } else if (typeof openTab === 'function') {
        openTab(returnTabId);
      }

      if (returnTabId === 'cashline') {
        if (typeof renderCashlinePanel === 'function') renderCashlinePanel();
        else if (typeof window.renderCashlinePanel === 'function') window.renderCashlinePanel();
        else if (typeof renderActiveSubtab === 'function') renderActiveSubtab();
      }
    } else {
      setTimeout(initFormDefaults, 900);
    }
  }

  // ── Voucher Desk state & logic ───────────────────────────────────
  let _vdSearch = '';
  let _vdTypeFilter = 'All';
  let _vdStatusFilter = 'All';
  let _vdSelectMode = false;
  let _vdSelectedKeys = new Set();

  function deleteVoucherFromDesk(type, id) {
    if (type === 'Journal') {
      const isDraft = draftedEntries.some(e => String(e.id) === String(id));
      if (isDraft) {
        const entry = draftedEntries.find(e => String(e.id) === String(id));
        showKyaConfirm({
          title: 'Delete this journal entry?',
          message: `Permanently delete draft <strong>${entry ? entry.voucherNo || '—' : '—'}</strong>?<br>This action cannot be undone.`,
          confirmLabel: '✕ Delete',
          iconBg: '#fee2e2', iconColor: '#dc2626',
          iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
          okBg: '#dc2626',
          onConfirm: () => {
            draftedEntries = draftedEntries.filter(e => String(e.id) !== String(id));
            if (typeof window.refreshAllAppViews === 'function') {
              window.refreshAllAppViews();
            } else {
              triggerAutoBackup();
              renderVoucherDeskPanel();
            }
          }
        });
      } else {
        const entry = postedEntries.find(e => String(e.id) === String(id));
        showKyaConfirm({
          title: 'Delete this journal entry?',
          message: `Permanently delete voucher <strong>${entry ? entry.voucherNo || '—' : '—'}</strong>?<br>This action cannot be undone.`,
          confirmLabel: '✕ Delete',
          iconBg: '#fee2e2', iconColor: '#dc2626',
          iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
          okBg: '#dc2626',
          onConfirm: () => {
            postedEntries = postedEntries.filter(e => String(e.id) !== String(id));
            if (entry && entry.reconKey && window.KYA_STORE?.reconciliationState) {
              delete window.KYA_STORE.reconciliationState[entry.reconKey];
            }
            if (typeof window.refreshAllAppViews === 'function') {
              window.refreshAllAppViews();
            } else {
              refreshAllReports();
              triggerAutoBackup();
              renderVoucherDeskPanel();
            }
          }
        });
      }
    } else if (type === 'Invoice' || type === 'Order' || type === 'Reversal') {
      const isSalesDraft = (window.KYA_STORE?.salesVouchersDrafts || []).some(d => d.id === id);
      if (isSalesDraft) {
        showKyaConfirm({
          title: 'Delete this draft?',
          message: 'Permanently delete this sales voucher draft?<br>This action cannot be undone.',
          confirmLabel: '✕ Delete',
          iconBg: '#fee2e2', iconColor: '#dc2626',
          iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
          okBg: '#dc2626',
          onConfirm: () => {
            if (window.KYA_STORE?.salesVouchersDrafts) {
              window.KYA_STORE.salesVouchersDrafts = window.KYA_STORE.salesVouchersDrafts.filter(d => d.id !== id);
            }
            if (typeof renderSalesDraftedPanel === 'function') renderSalesDraftedPanel();
            triggerAutoBackup();
            renderVoucherDeskPanel();
          }
        });
      } else {
        showKyaConfirm({
          title: 'Delete this voucher?',
          message: 'Permanently delete this sales voucher?<br>This action cannot be undone.',
          confirmLabel: '✕ Delete',
          iconBg: '#fee2e2', iconColor: '#dc2626',
          iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
          okBg: '#dc2626',
          onConfirm: () => {
            const list = window.KYA_STORE?.salesVouchers || [];
            const idx = list.findIndex(v => String(v.id) === String(id) || String(v.journalEntryId) === String(id));
            if (idx > -1) {
              const inv = list[idx];
              list.splice(idx, 1);
              window.KYA_STORE.salesVouchers = list;
              if (inv.journalEntryId) {
                postedEntries = postedEntries.filter(e => String(e.id) !== String(inv.journalEntryId) && String(e.id) !== String(id));
              }
            } else {
              postedEntries = postedEntries.filter(e => String(e.id) !== String(id));
            }
            if (typeof window.refreshAllAppViews === 'function') {
              window.refreshAllAppViews();
            } else {
              refreshAllReports();
              if (typeof renderSalesPostedPanel === 'function') renderSalesPostedPanel();
              if (typeof renderLedgerStatementView === 'function') renderLedgerStatementView();
              triggerAutoBackup();
              renderVoucherDeskPanel();
            }
          }
        });
      }
    }
  }

  function getVoucherParticularsName(e, type) {
    if (!e) return '—';
    const isSales = (type === 'Invoice' || type === 'Order' || type === 'Reversal' || type === 'Sales Invoice' || type === 'Sales Order' || type === 'Sales Reversal' || (e.preparedBy === 'Sales Module'));
    const isPurch = (type === 'Purchase' || type === 'Purchase Voucher' || (e.preparedBy === 'Purchase Module'));

    // 1. Sales Voucher / Customer Name
    if (isSales) {
      if (e.partyOverride && e.partyOverride.name) return e.partyOverride.name;
      if (e.customerName && e.customerName.trim() !== '') return e.customerName.trim();
      const custs = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
      if (e.customerId) {
        const cust = custs.find(c => String(c.id) === String(e.customerId)) || (typeof coaLedgers !== 'undefined' ? coaLedgers.find(l => String(l.id) === String(e.customerId)) : null);
        if (cust && cust.name) return cust.name;
      }
      const salesList = [
        ...(window.KYA_STORE && Array.isArray(window.KYA_STORE.salesVouchers) ? window.KYA_STORE.salesVouchers : []),
        ...(window.KYA_STORE && Array.isArray(window.KYA_STORE.salesVouchersDrafts) ? window.KYA_STORE.salesVouchersDrafts : [])
      ];
      const sv = salesList.find(v => 
        (v.journalEntryId && String(v.journalEntryId) === String(e.id)) || 
        String(v.id) === String(e.id) || 
        v.invoiceNo === e.voucherNo || 
        `SV-${v.invoiceNo}` === e.voucherNo || 
        `SR-${v.invoiceNo}` === e.voucherNo || 
        `SO-${v.invoiceNo}` === e.voucherNo
      );
      if (sv) {
        if (sv.partyOverride && sv.partyOverride.name) return sv.partyOverride.name;
        if (sv.customerName && sv.customerName.trim() !== '') return sv.customerName.trim();
        const cust = custs.find(c => String(c.id) === String(sv.customerId)) || (typeof coaLedgers !== 'undefined' ? coaLedgers.find(l => String(l.id) === String(sv.customerId)) : null);
        if (cust && cust.name) return cust.name;
      }
    }

    // 2. Purchase Voucher / Supplier Name
    if (isPurch) {
      if (e.partyOverride && e.partyOverride.name) return e.partyOverride.name;
      if (e.vendorName && e.vendorName.trim() !== '') return e.vendorName.trim();
      if (e.supplierName && e.supplierName.trim() !== '') return e.supplierName.trim();
      const supps = typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : [];
      const sid = e.vendorId || e.supplierId;
      if (sid) {
        const supp = supps.find(s => String(s.id) === String(sid)) || (typeof coaLedgers !== 'undefined' ? coaLedgers.find(l => String(l.id) === String(sid)) : null);
        if (supp && supp.name) return supp.name;
      }
      const purchList = [
        ...(window.KYA_STORE && Array.isArray(window.KYA_STORE.purchaseVouchers) ? window.KYA_STORE.purchaseVouchers : []),
        ...(window.KYA_STORE && Array.isArray(window.KYA_STORE.purchaseVouchersDrafts) ? window.KYA_STORE.purchaseVouchersDrafts : [])
      ];
      const pv = purchList.find(v => 
        String(v.id) === String(e.id) || 
        v.invoiceNo === e.voucherNo || 
        `PV-${v.invoiceNo}` === e.voucherNo
      );
      if (pv) {
        if (pv.partyOverride && pv.partyOverride.name) return pv.partyOverride.name;
        if (pv.vendorName && pv.vendorName.trim() !== '') return pv.vendorName.trim();
        const supp = supps.find(s => String(s.id) === String(pv.vendorId)) || (typeof coaLedgers !== 'undefined' ? coaLedgers.find(l => String(l.id) === String(pv.vendorId)) : null);
        if (supp && supp.name) return supp.name;
      }
    }

    // 3. Journal Entry / Ledger Name
    if (e.firstParticular && e.firstParticular !== '—' && e.firstParticular !== 'undefined') {
      return e.firstParticular;
    }
    if (Array.isArray(e.allRows)) {
      const validRow = e.allRows.find(r => r && r.particular && r.particular.trim() !== '' && r.particular !== '—');
      if (validRow) return validRow.particular;
    }
    if (e.particulars && e.particulars !== '—') return e.particulars;
    if (e.oppName) return e.oppName;

    return '—';
  }

  function updateVdPostAllOptionVisibility() {
    const postAllOption = document.getElementById('vdPostAllOption');
    const postAllSep = document.getElementById('vdPostAllSep');
    const postAllText = document.getElementById('vdPostAllText');
    if (!postAllOption) return;

    const selectedDraftKeys = [..._vdSelectedKeys].filter(k => k.endsWith('_true'));
    const count = selectedDraftKeys.length;

    if (count > 0) {
      postAllOption.style.display = 'flex';
      if (postAllSep) postAllSep.style.display = 'block';
      if (postAllText) {
        postAllText.textContent = count > 1 ? `Post All (${count})` : 'Post All';
      }
    } else {
      postAllOption.style.display = 'none';
      if (postAllSep) postAllSep.style.display = 'none';
    }
  }

  let _vdPostAllLock = false;
  function executeVoucherDeskPostAll() {
    if (_vdPostAllLock) return;
    _vdPostAllLock = true;
    setTimeout(() => { _vdPostAllLock = false; }, 800);

    const journalDraftIds = [];
    _vdSelectedKeys.forEach(key => {
      if (!key.endsWith('_true')) return;
      const parts = key.split('_');
      const type = parts[0];
      const id = parts.slice(1, parts.length - 1).join('_');
      if (type === 'Journal') {
        journalDraftIds.push(id);
      }
    });

    if (journalDraftIds.length === 0) {
      if (typeof showToast === 'function') {
        showToast('No drafted journal entries selected to post.', 'info');
      }
      return;
    }

    // Clean posted keys from selection
    journalDraftIds.forEach(id => {
      _vdSelectedKeys.delete(`Journal_${id}_true`);
    });

    // Close any open menus
    const moreDropdown = document.getElementById('vdMoreDropdown');
    if (moreDropdown) moreDropdown.classList.remove('active');

    // Post all drafts instantly (one click all post)
    postDraftEntries(journalDraftIds);
  }
  window.executeVoucherDeskPostAll = executeVoucherDeskPostAll;

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

    let list = [];

    // 1. Process Journal & Sales entries posted in postedEntries
    postedEntries.forEach(e => {
      let type = 'Journal';
      const vNo = e.voucherNo || '';
      if (vNo.startsWith('SR-') || vNo.startsWith('REV-')) {
        type = 'Reversal';
      } else if (vNo.startsWith('SO-')) {
        type = 'Order';
      } else if (vNo.startsWith('SV-') || vNo.startsWith('INV-') || e.preparedBy === 'Sales Module') {
        type = 'Invoice';
      } else if (vNo.startsWith('PV-') || e.preparedBy === 'Purchase Module') {
        type = 'Purchase';
      }

      let formattedAmount = e.amount;
      if (!formattedAmount || formattedAmount === 'undefined') {
        let calcAmt = 0;
        if (Array.isArray(e.allRows) && e.allRows.length > 0) {
          const firstDebit = parseFloat(e.allRows[0].debit) || 0;
          const firstCredit = parseFloat(e.allRows[0].credit) || 0;
          calcAmt = firstDebit || firstCredit || 0;
        }
        formattedAmount = typeof fmtNum === 'function' ? fmtNum(calcAmt) : (calcAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      }

      list.push({
        id: e.id,
        date: e.date,
        voucherNo: e.voucherNo,
        type: type,
        particulars: getVoucherParticularsName(e, type),
        amount: formattedAmount,
        isDraft: false,
        raw: e
      });
    });

    // 2. Process Journal drafts
    draftedEntries.forEach(e => {
      list.push({
        id: e.id,
        date: e.date,
        voucherNo: e.voucherNo,
        type: 'Journal',
        particulars: getVoucherParticularsName(e, 'Journal'),
        amount: e.amount,
        isDraft: true,
        raw: e
      });
    });

    // 3. Process Sales drafts from KYA_STORE
    const salesDrafts = (window.KYA_STORE && Array.isArray(window.KYA_STORE.salesVouchersDrafts)) ? window.KYA_STORE.salesVouchersDrafts : [];
    salesDrafts.forEach(d => {
      const vType = d.isReturn ? 'Reversal' : 'Invoice';
      const vAmt = typeof fmtNum === 'function' ? fmtNum(d.total) : (parseFloat(d.total) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      list.push({
        id: d.id,
        date: d.date,
        voucherNo: d.invoiceNo || 'Draft',
        type: vType,
        particulars: getVoucherParticularsName(d, vType),
        amount: vAmt,
        isDraft: true,
        raw: d
      });
    });

    // 4. Process any Sales Vouchers not captured in postedEntries
    const salesPosted = (window.KYA_STORE && Array.isArray(window.KYA_STORE.salesVouchers)) ? window.KYA_STORE.salesVouchers : [];
    salesPosted.forEach(v => {
      const alreadyInList = list.some(item => !item.isDraft && (
        item.id === v.journalEntryId || 
        item.id === v.id || 
        item.voucherNo === v.invoiceNo || 
        item.voucherNo === `SV-${v.invoiceNo}` || 
        item.voucherNo === `SR-${v.invoiceNo}`
      ));

      if (!alreadyInList) {
        const vType = v.isReturn ? 'Reversal' : 'Invoice';
        const prefix = v.isReturn ? 'SR-' : 'SV-';
        const vNo = (v.invoiceNo.startsWith(prefix) || v.invoiceNo.startsWith('INV-')) ? v.invoiceNo : `${prefix}${v.invoiceNo}`;
        const vAmt = typeof fmtNum === 'function' ? fmtNum(v.total) : (parseFloat(v.total) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        list.push({
          id: v.id,
          date: v.date,
          voucherNo: vNo,
          type: vType,
          particulars: getVoucherParticularsName(v, vType),
          amount: vAmt,
          isDraft: false,
          raw: v
        });
      }
    });

    // 5. Process Purchase drafts
    const purchDrafts = (window.KYA_STORE && Array.isArray(window.KYA_STORE.purchaseVouchersDrafts)) ? window.KYA_STORE.purchaseVouchersDrafts : [];
    purchDrafts.forEach(d => {
      const vAmt = typeof fmtNum === 'function' ? fmtNum(d.total) : (parseFloat(d.total) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const vNo = d.invoiceNo ? (d.invoiceNo.startsWith('PV-') ? d.invoiceNo : `PV-${d.invoiceNo}`) : 'Draft';

      list.push({
        id: d.id,
        date: d.date,
        voucherNo: vNo,
        type: 'Purchase',
        particulars: getVoucherParticularsName(d, 'Purchase'),
        amount: vAmt,
        isDraft: true,
        raw: d
      });
    });

    // 6. Process Purchase Posted
    const purchPosted = (window.KYA_STORE && Array.isArray(window.KYA_STORE.purchaseVouchers)) ? window.KYA_STORE.purchaseVouchers : [];
    purchPosted.forEach(v => {
      const alreadyInList = list.some(item => !item.isDraft && (
        item.id === v.id || 
        item.voucherNo === v.invoiceNo || 
        item.voucherNo === `PV-${v.invoiceNo}`
      ));

      if (!alreadyInList) {
        const vNo = v.invoiceNo ? (v.invoiceNo.startsWith('PV-') ? v.invoiceNo : `PV-${v.invoiceNo}`) : '—';
        const vAmt = typeof fmtNum === 'function' ? fmtNum(v.total) : (parseFloat(v.total) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        list.push({
          id: v.id,
          date: v.date,
          voucherNo: vNo,
          type: 'Purchase',
          particulars: getVoucherParticularsName(v, 'Purchase'),
          amount: vAmt,
          isDraft: false,
          raw: v
        });
      }
    });

    // 7. Date inputs & filtering
    const fromInp = document.getElementById('vdDateFrom');
    const toInp   = document.getElementById('vdDateTo');
    if (fromInp && !fromInp.value) fromInp.value = _globalDateFrom || '2024-04-01';
    if (toInp   && !toInp.value)   toInp.value   = _globalDateTo || '2025-03-31';

    const dateFrom = fromInp ? fromInp.value : '';
    const dateTo   = toInp ? toInp.value : '';

    const dateFilteredList = list.filter(e => {
      if (dateFrom && e.date && e.date < dateFrom) return false;
      if (dateTo && e.date && e.date > dateTo) return false;
      return true;
    });

    // Update Stat counters based on date range
    const totalJournal = dateFilteredList.filter(e => e.type === 'Journal' && !e.isDraft).length;
    const totalSales = dateFilteredList.filter(e => (e.type === 'Invoice' || e.type === 'Order' || e.type === 'Reversal') && !e.isDraft).length;
    const totalDrafts = dateFilteredList.filter(e => e.isDraft).length;
    const totalVouchers = dateFilteredList.length;

    const elTotal = document.getElementById('vdStatTotal');
    const elJE = document.getElementById('vdStatJE');
    const elInv = document.getElementById('vdStatInv');
    const elDrafts = document.getElementById('vdStatDrafts');

    if (elTotal) elTotal.textContent = totalVouchers;
    if (elJE) elJE.textContent = totalJournal;
    if (elInv) elInv.textContent = totalSales;
    if (elDrafts) elDrafts.textContent = totalDrafts;

    dateFilteredList.sort((a, b) => {
      const dComp = (b.date || '').localeCompare(a.date || '');
      if (dComp !== 0) return dComp;
      const vComp = (a.voucherNo || '').localeCompare(b.voucherNo || '', undefined, { numeric: true, sensitivity: 'base' });
      if (vComp !== 0) return vComp;
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    });

    let filtered = dateFilteredList.filter(e => {
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

    const allKeys = filtered.map(e => `${e.type}_${e.id}_${e.isDraft}`);
    const allChecked = allKeys.length > 0 && allKeys.every(k => _vdSelectedKeys.has(k));
    const selCount = [..._vdSelectedKeys].filter(k => allKeys.includes(k)).length;
    const selectedDraftCount = filtered.filter(item => item.isDraft && _vdSelectedKeys.has(`${item.type}_${item.id}_${item.isDraft}`)).length;

    // Synchronize 3-dot menu select text
    const toggleSelectText = document.getElementById('vdToggleSelectText');
    if (toggleSelectText) {
      toggleSelectText.textContent = _vdSelectMode ? 'Exit Select Mode' : 'Select';
    }
    updateVdPostAllOptionVisibility();

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
          <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
            ${_vdSelectMode ? `
              <div class="pt-sel-bar" style="margin: 0; padding: 4px 12px; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
                <span class="pt-sel-count" style="font-size: 12.5px; font-weight: 600;">${selCount} selected</span>
                <button id="vdBtnExitSelect" class="btn btn-secondary" style="height: 30px; padding: 0 10px; font-size: 12px; font-weight: 600; border-radius: 6px; border: 1px solid var(--slate-200); background: #fff; cursor: pointer;" type="button">
                  Exit Select
                </button>
              </div>
            ` : ''}
            <select id="vdTypeFilter" style="height: 38px; padding: 0 12px; border-radius: 8px; border: 1.5px solid var(--slate-200); font-size: 13px; font-weight: 600; color: var(--slate-700); background: var(--white);">
              <option value="All" ${_vdTypeFilter === 'All' ? 'selected' : ''}>All Types</option>
              <option value="Journal" ${_vdTypeFilter === 'Journal' ? 'selected' : ''}>Journal Entry</option>
              <option value="Invoice" ${_vdTypeFilter === 'Invoice' ? 'selected' : ''}>Sales Invoice</option>
              <option value="Reversal" ${_vdTypeFilter === 'Reversal' ? 'selected' : ''}>Sales Reversal</option>
              <option value="Purchase" ${_vdTypeFilter === 'Purchase' ? 'selected' : ''}>Purchase Voucher</option>
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
          <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
            ${_vdSelectMode ? `
              <div class="pt-sel-bar" style="margin: 0; padding: 4px 12px; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
                <span class="pt-sel-count" style="font-size: 12.5px; font-weight: 600;">${selCount} selected</span>
                ${selectedDraftCount > 0 ? `
                  <button class="dt-post-sel-btn" id="vdPostSel" type="button" style="height: 30px; padding: 0 10px; font-size: 12px; display: flex; align-items: center; gap: 5px; border-radius: 6px; border: none; background: #dcfce7; color: #15803d; font-weight: 700; cursor: pointer; transition: background 0.15s;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Post Selected
                  </button>
                ` : ''}
                ${selCount > 0 ? `
                  <button class="pt-del-btn" id="vdDelSelected" type="button" style="height: 30px; padding: 0 10px; font-size: 12px; display: flex; align-items: center; gap: 5px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                    </svg>
                    Delete Selected
                  </button>
                ` : ''}
                <button id="vdBtnExitSelect" class="btn btn-secondary" style="height: 30px; padding: 0 10px; font-size: 12px; font-weight: 600; border-radius: 6px; border: 1px solid var(--slate-200); background: #fff; cursor: pointer;" type="button">
                  Exit Select
                </button>
              </div>
            ` : ''}
            <select id="vdTypeFilter" style="height: 38px; padding: 0 12px; border-radius: 8px; border: 1.5px solid var(--slate-200); font-size: 13px; font-weight: 600; color: var(--slate-700); background: var(--white);">
              <option value="All" ${_vdTypeFilter === 'All' ? 'selected' : ''}>All Types</option>
              <option value="Journal" ${_vdTypeFilter === 'Journal' ? 'selected' : ''}>Journal Entry</option>
              <option value="Invoice" ${_vdTypeFilter === 'Invoice' ? 'selected' : ''}>Sales Invoice</option>
              <option value="Reversal" ${_vdTypeFilter === 'Reversal' ? 'selected' : ''}>Sales Reversal</option>
              <option value="Purchase" ${_vdTypeFilter === 'Purchase' ? 'selected' : ''}>Purchase Voucher</option>
            </select>
          </div>
        </div>

        <div class="pt-table-wrap">
          <table class="pt-table">
            <thead>
              <tr style="background: linear-gradient(90deg, var(--blue-700), var(--blue-500));">
                ${_vdSelectMode ? `
                  <th style="width: 40px; text-align: center; padding: 10px 12px;">
                    <input type="checkbox" class="pt-cb" id="vdSelAll" ${allChecked ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px; accent-color: #2563eb;">
                  </th>
                ` : ''}
                <th style="width: 60px; text-align: center;">Sl No</th>
                <th>Date</th>
                <th>Voucher No.</th>
                <th>Type</th>
                <th>Particulars</th>
                <th style="text-align: right;">Amount</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map((e, index) => {
                const itemKey = `${e.type}_${e.id}_${e.isDraft}`;
                const isSelected = _vdSelectedKeys.has(itemKey);

                const typeBadge = e.type === 'Journal'
                   ? `<span class="tb-badge" style="background:#e0f2fe; color:#0369a1; border:1.5px solid #bae6fd; font-size:11px; padding:3px 8px; text-transform:none;">Journal Entry</span>`
                   : (e.type === 'Reversal'
                      ? `<span class="tb-badge" style="background:#fee2e2; color:#b91c1c; border:1.5px solid #fca5a5; font-size:11px; padding:3px 8px; text-transform:none;">Sales Reversal</span>`
                      : (e.type === 'Purchase'
                         ? `<span class="tb-badge" style="background:#fef3c7; color:#b45309; border:1.5px solid #fde68a; font-size:11px; padding:3px 8px; text-transform:none;">Purchase Voucher</span>`
                         : `<span class="tb-badge" style="background:#dcfce7; color:#15803d; border:1.5px solid #bbf7d0; font-size:11px; padding:3px 8px; text-transform:none;">Sales Invoice</span>`));

                let statusBadge = '';
                if (e.isDraft) {
                  statusBadge = `<span class="tb-badge" style="background:#fffbeb; color:#d97706; border:1.5px solid #fde68a; font-size:11px; padding:3px 8px; text-transform:none;">Draft</span>`;
                } else {
                  statusBadge = `<span class="tb-badge" style="background:#ecfdf5; color:#059669; border:1.5px solid #a7f3d0; font-size:11px; padding:3px 8px; text-transform:none;">Posted</span>`;
                }

                const amtColor = e.type === 'Journal' ? 'var(--blue-600)' : (e.type === 'Reversal' ? '#dc2626' : (e.type === 'Purchase' ? 'var(--amber-700)' : '#059669'));

                return `
                  <tr data-id="${e.id}" data-type="${e.type}" data-draft="${e.isDraft}" data-key="${itemKey}" class="vd-row ${isSelected ? 'pt-sel-row' : ''}" style="cursor: pointer;">
                    ${_vdSelectMode ? `
                      <td style="text-align: center; padding: 10px 12px;" onclick="event.stopPropagation()">
                        <input type="checkbox" class="pt-cb vd-rcb" data-key="${itemKey}" ${isSelected ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px; accent-color: #2563eb;">
                      </td>
                    ` : ''}
                    <td style="color:#94a3b8; font-size:12px; font-weight:600; text-align:center;">${index + 1}</td>
                    <td style="white-space:nowrap;">${e.date || '—'}</td>
                    <td><span style="font-family: monospace; font-weight: 700; color: var(--slate-700);">${e.voucherNo || '—'}</span></td>
                    <td>${typeBadge}</td>
                    <td style="font-weight:600; color:var(--slate-800); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${ohEsc(e.particulars)}</td>
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

    const vdDateFromEl = document.getElementById('vdDateFrom');
    if (vdDateFromEl && !vdDateFromEl._isWired) {
      vdDateFromEl._isWired = true;
      vdDateFromEl.addEventListener('change', () => {
        renderVoucherDeskPanel();
      });
    }

    const vdDateToEl = document.getElementById('vdDateTo');
    if (vdDateToEl && !vdDateToEl._isWired) {
      vdDateToEl._isWired = true;
      vdDateToEl.addEventListener('change', () => {
        renderVoucherDeskPanel();
      });
    }

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

    const selAll = document.getElementById('vdSelAll');
    if (selAll) {
      selAll.addEventListener('change', e => {
        if (e.target.checked) allKeys.forEach(k => _vdSelectedKeys.add(k));
        else allKeys.forEach(k => _vdSelectedKeys.delete(k));
        renderVoucherDeskPanel();
      });
    }

    wrap.querySelectorAll('.vd-rcb').forEach(cb => {
      cb.addEventListener('change', e => {
        const key = e.target.dataset.key;
        if (e.target.checked) _vdSelectedKeys.add(key);
        else _vdSelectedKeys.delete(key);
        renderVoucherDeskPanel();
      });
    });

    const exitSelectBtn = document.getElementById('vdBtnExitSelect');
    if (exitSelectBtn) {
      exitSelectBtn.addEventListener('click', () => {
        _vdSelectMode = false;
        _vdSelectedKeys.clear();
        const selectText = document.getElementById('vdToggleSelectText');
        if (selectText) selectText.textContent = 'Select';
        renderVoucherDeskPanel();
      });
    }

    const postSelBtn = document.getElementById('vdPostSel');
    if (postSelBtn) {
      postSelBtn.addEventListener('click', () => {
        executeVoucherDeskPostAll();
      });
    }

    const delSelBtn = document.getElementById('vdDelSelected');
    if (delSelBtn) {
      delSelBtn.addEventListener('click', () => {
        const n = selCount;
        showKyaConfirm({
          title: 'Delete Selected Vouchers?',
          message: `Permanently delete <strong>${n} selected ${n === 1 ? 'voucher' : 'vouchers'}</strong>?<br>This action cannot be undone.`,
          confirmLabel: '✕ Delete',
          iconBg: '#fee2e2', iconColor: '#dc2626',
          iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
          okBg: '#dc2626',
          onConfirm: () => {
            const selectedItems = filtered.filter(item => _vdSelectedKeys.has(`${item.type}_${item.id}_${item.isDraft}`));
            selectedItems.forEach(item => {
              const id = item.id;
              const type = item.type;
              const isDraft = item.isDraft;

              if (type === 'Journal') {
                if (isDraft) {
                  draftedEntries = draftedEntries.filter(e => String(e.id) !== String(id));
                } else {
                  postedEntries = postedEntries.filter(e => String(e.id) !== String(id));
                }
              } else if (type === 'Invoice' || type === 'Order' || type === 'Reversal') {
                if (isDraft) {
                  if (window.KYA_STORE?.salesVouchersDrafts) {
                    window.KYA_STORE.salesVouchersDrafts = window.KYA_STORE.salesVouchersDrafts.filter(d => String(d.id) !== String(id));
                  }
                } else {
                  const sList = window.KYA_STORE?.salesVouchers || [];
                  const idx = sList.findIndex(v => String(v.id) === String(id) || String(v.journalEntryId) === String(id));
                  if (idx > -1) {
                    const inv = sList[idx];
                    sList.splice(idx, 1);
                    window.KYA_STORE.salesVouchers = sList;
                    if (inv.journalEntryId) {
                      postedEntries = postedEntries.filter(e => String(e.id) !== String(inv.journalEntryId) && String(e.id) !== String(id));
                    }
                  } else {
                    postedEntries = postedEntries.filter(e => String(e.id) !== String(id));
                  }
                }
              } else if (type === 'Purchase') {
                if (isDraft) {
                  if (window.KYA_STORE?.purchaseVouchersDrafts) {
                    window.KYA_STORE.purchaseVouchersDrafts = window.KYA_STORE.purchaseVouchersDrafts.filter(d => String(d.id) !== String(id));
                  }
                } else {
                  const pList = window.KYA_STORE?.purchaseVouchers || [];
                  const idx = pList.findIndex(v => String(v.id) === String(id));
                  if (idx > -1) {
                    pList.splice(idx, 1);
                    window.KYA_STORE.purchaseVouchers = pList;
                  }
                  postedEntries = postedEntries.filter(e => String(e.id) !== String(id));
                }
              }
            });

            _vdSelectedKeys.clear();
            if (typeof showToast === 'function') {
              showToast(`${n} ${n === 1 ? 'voucher' : 'vouchers'} deleted successfully.`, 'success');
            }
            if (typeof window.refreshAllAppViews === 'function') {
              window.refreshAllAppViews();
            } else {
              refreshAllReports();
              if (typeof renderSalesPostedPanel === 'function') renderSalesPostedPanel();
              if (typeof renderSalesDraftedPanel === 'function') renderSalesDraftedPanel();
              if (typeof renderLedgerStatementView === 'function') renderLedgerStatementView();
              triggerAutoBackup();
              renderVoucherDeskPanel();
            }
          }
        });
      });
    }

    wrap.querySelectorAll('.vd-row').forEach(row => {
      row.addEventListener('click', () => {
        const key = row.dataset.key;
        if (_vdSelectMode) {
          if (_vdSelectedKeys.has(key)) _vdSelectedKeys.delete(key);
          else _vdSelectedKeys.add(key);
          renderVoucherDeskPanel();
          return;
        }

        const id = Number(row.dataset.id);
        const type = row.dataset.type;
        const isDraft = row.dataset.draft === 'true';

        if (type === 'Journal') {
          const entry = isDraft
            ? draftedEntries.find(e => String(e.id) === String(id) || e.id == id)
            : postedEntries.find(e => String(e.id) === String(id) || e.id == id);
          if (entry) showFullJournalModal(entry, isDraft);
        } else if (type === 'Invoice' || type === 'Reversal' || type === 'Order') {
          if (isDraft) {
            if (typeof editSalesDraft === 'function') editSalesDraft(id);
          } else {
            let sInv = (window.KYA_STORE?.salesVouchers || []).find(v => v.id === id || v.journalEntryId === id);
            if (!sInv) {
              const vNo = (row.querySelector('td:nth-child(3)')?.textContent || '').trim();
              const cleanNo = vNo.replace(/^(SV-|SR-|SO-|INV-)/, '');
              sInv = (window.KYA_STORE?.salesVouchers || []).find(v => v.invoiceNo === cleanNo || v.invoiceNo === vNo);
            }
            if (sInv && typeof viewPrintInvoice === 'function') {
              viewPrintInvoice(sInv.id);
            } else {
              const entry = postedEntries.find(e => e.id === id);
              if (entry) showFullJournalModal(entry, false);
            }
          }
        } else if (type === 'Purchase') {
          if (typeof loadPurchaseVoucher === 'function') {
            loadPurchaseVoucher(id, isDraft);
            if (typeof openTab === 'function') openTab('purchase_voucher');
          } else {
            const entry = isDraft
              ? draftedEntries.find(e => e.id === id)
              : postedEntries.find(e => e.id === id);
            if (entry) showFullJournalModal(entry, isDraft);
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

    wireVoucherDeskMoreDropdown();
  }

  function getVoucherDeskExportData() {
    let list = [];
    const fromInp = document.getElementById('vdDateFrom');
    const toInp   = document.getElementById('vdDateTo');
    const dateFrom = fromInp ? fromInp.value : '';
    const dateTo   = toInp ? toInp.value : '';

    // 1. Process Journal & Sales entries posted in postedEntries
    postedEntries.forEach(e => {
      let type = 'Journal Entry';
      const vNo = e.voucherNo || '';
      if (vNo.startsWith('SR-') || vNo.startsWith('REV-')) {
        type = 'Sales Reversal';
      } else if (vNo.startsWith('SO-')) {
        type = 'Sales Order';
      } else if (vNo.startsWith('SV-') || vNo.startsWith('INV-') || e.preparedBy === 'Sales Module') {
        type = 'Sales Invoice';
      } else if (vNo.startsWith('PV-') || e.preparedBy === 'Purchase Module') {
        type = 'Purchase';
      }

      let formattedAmount = e.amount;
      if (!formattedAmount || formattedAmount === 'undefined') {
        let calcAmt = 0;
        if (Array.isArray(e.allRows) && e.allRows.length > 0) {
          const firstDebit = parseFloat(e.allRows[0].debit) || 0;
          const firstCredit = parseFloat(e.allRows[0].credit) || 0;
          calcAmt = firstDebit || firstCredit || 0;
        }
        formattedAmount = typeof fmtNum === 'function' ? fmtNum(calcAmt) : (calcAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      }

      list.push({
        id: e.id,
        date: e.date,
        voucherNo: e.voucherNo,
        type: type,
        rawType: (type === 'Journal Entry' ? 'Journal' : (type === 'Sales Reversal' ? 'Reversal' : (type === 'Sales Order' ? 'Order' : (type === 'Purchase' ? 'Purchase' : 'Invoice')))),
        particulars: getVoucherParticularsName(e, type),
        amount: formattedAmount,
        status: 'Posted',
        isDraft: false
      });
    });

    // 2. Process Journal drafts
    draftedEntries.forEach(e => {
      list.push({
        id: e.id,
        date: e.date,
        voucherNo: e.voucherNo,
        type: 'Journal Entry',
        rawType: 'Journal',
        particulars: getVoucherParticularsName(e, 'Journal'),
        amount: e.amount,
        status: 'Draft',
        isDraft: true
      });
    });

    // 3. Process Sales drafts
    const salesDrafts = (window.KYA_STORE && Array.isArray(window.KYA_STORE.salesVouchersDrafts)) ? window.KYA_STORE.salesVouchersDrafts : [];
    salesDrafts.forEach(d => {
      const vType = d.isReturn ? 'Sales Reversal' : 'Sales Invoice';
      const vAmt = typeof fmtNum === 'function' ? fmtNum(d.total) : (parseFloat(d.total) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      list.push({
        id: d.id,
        date: d.date,
        voucherNo: d.invoiceNo || 'Draft',
        type: vType,
        rawType: d.isReturn ? 'Reversal' : 'Invoice',
        particulars: getVoucherParticularsName(d, vType),
        amount: vAmt,
        status: 'Draft',
        isDraft: true
      });
    });

    // 4. Process any Sales Vouchers not in postedEntries
    const salesPosted = (window.KYA_STORE && Array.isArray(window.KYA_STORE.salesVouchers)) ? window.KYA_STORE.salesVouchers : [];
    salesPosted.forEach(v => {
      const alreadyInList = list.some(item => !item.isDraft && (
        item.id === v.journalEntryId || 
        item.id === v.id || 
        item.voucherNo === v.invoiceNo || 
        item.voucherNo === `SV-${v.invoiceNo}` || 
        item.voucherNo === `SR-${v.invoiceNo}`
      ));

      if (!alreadyInList) {
        const vType = v.isReturn ? 'Sales Reversal' : 'Sales Invoice';
        const prefix = v.isReturn ? 'SR-' : 'SV-';
        const vNo = (v.invoiceNo && (v.invoiceNo.startsWith(prefix) || v.invoiceNo.startsWith('INV-'))) ? v.invoiceNo : `${prefix}${v.invoiceNo || ''}`;
        const vAmt = typeof fmtNum === 'function' ? fmtNum(v.total) : (parseFloat(v.total) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        const status = 'Posted';

        list.push({
          id: v.id,
          date: v.date,
          voucherNo: vNo,
          type: vType,
          rawType: v.isReturn ? 'Reversal' : 'Invoice',
          particulars: getVoucherParticularsName(v, vType),
          amount: vAmt,
          status: status,
          isDraft: false
        });
      }
    });

    // 5. Process Purchase drafts
    const purchDrafts = (window.KYA_STORE && Array.isArray(window.KYA_STORE.purchaseVouchersDrafts)) ? window.KYA_STORE.purchaseVouchersDrafts : [];
    purchDrafts.forEach(d => {
      const vAmt = typeof fmtNum === 'function' ? fmtNum(d.total) : (parseFloat(d.total) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const vNo = d.invoiceNo ? (d.invoiceNo.startsWith('PV-') ? d.invoiceNo : `PV-${d.invoiceNo}`) : 'Draft';

      list.push({
        id: d.id,
        date: d.date,
        voucherNo: vNo,
        type: 'Purchase Voucher',
        rawType: 'Purchase',
        particulars: getVoucherParticularsName(d, 'Purchase'),
        amount: vAmt,
        status: 'Draft',
        isDraft: true
      });
    });

    // 6. Process Purchase Posted
    const purchPosted = (window.KYA_STORE && Array.isArray(window.KYA_STORE.purchaseVouchers)) ? window.KYA_STORE.purchaseVouchers : [];
    purchPosted.forEach(v => {
      const alreadyInList = list.some(item => !item.isDraft && (
        item.id === v.id || 
        item.voucherNo === v.invoiceNo || 
        item.voucherNo === `PV-${v.invoiceNo}`
      ));

      if (!alreadyInList) {
        const vNo = v.invoiceNo ? (v.invoiceNo.startsWith('PV-') ? v.invoiceNo : `PV-${v.invoiceNo}`) : '—';
        const vAmt = typeof fmtNum === 'function' ? fmtNum(v.total) : (parseFloat(v.total) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        list.push({
          id: v.id,
          date: v.date,
          voucherNo: vNo,
          type: 'Purchase Voucher',
          rawType: 'Purchase',
          particulars: getVoucherParticularsName(v, 'Purchase'),
          amount: vAmt,
          status: 'Posted',
          isDraft: false
        });
      }
    });

    list.sort((a, b) => {
      const dComp = (b.date || '').localeCompare(a.date || '');
      if (dComp !== 0) return dComp;
      const vComp = (a.voucherNo || '').localeCompare(b.voucherNo || '', undefined, { numeric: true, sensitivity: 'base' });
      if (vComp !== 0) return vComp;
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    });

    // Apply current active filters if any
    let filtered = list.filter(e => {
      if (dateFrom && e.date && e.date < dateFrom) return false;
      if (dateTo && e.date && e.date > dateTo) return false;
      if (_vdTypeFilter && _vdTypeFilter !== 'All' && e.rawType !== _vdTypeFilter) return false;
      if (_vdStatusFilter && _vdStatusFilter !== 'All') {
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

    const activeCo = (typeof getActiveCompany === 'function' ? getActiveCompany() : null) || {};
    return {
      companyName: activeCo.name || 'KYA Accounting',
      filterStatus: _vdStatusFilter || 'All',
      filterType: _vdTypeFilter || 'All',
      dateFrom,
      dateTo,
      items: filtered
    };
  }

  function wireVoucherDeskMoreDropdown() {
    const moreBtn = document.getElementById('vdMoreBtn');
    const moreDropdown = document.getElementById('vdMoreDropdown');
    const submenuBtn = document.getElementById('vdExportMenuBtn');
    const submenu = document.getElementById('vdExportSubmenu');
    const pdfBtn = document.getElementById('vdExportPdf');
    const excelBtn = document.getElementById('vdExportExcel');

    if (!moreBtn || moreBtn._isWired) return;
    moreBtn._isWired = true;

    function closeAllVdMenus() {
      if (moreDropdown) moreDropdown.classList.remove('active');
      if (submenu) submenu.classList.remove('active');
    }

    if (moreDropdown) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = moreDropdown.classList.contains('active');
        closeAllVdMenus();
        if (!isOpen) {
          updateVdPostAllOptionVisibility();
          moreDropdown.classList.add('active');
        }
      });
    }

    if (submenuBtn && submenu) {
      let closeTimer = null;
      submenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        submenu.classList.toggle('active');
      });
      const submenuWrap = document.getElementById('vdExportSubmenuWrap');
      if (submenuWrap) {
        submenuWrap.addEventListener('mouseenter', () => {
          if (closeTimer) clearTimeout(closeTimer);
          submenu.classList.add('active');
        });
        submenuWrap.addEventListener('mouseleave', () => {
          closeTimer = setTimeout(() => {
            submenu.classList.remove('active');
          }, 300);
        });
        submenu.addEventListener('mouseenter', () => {
          if (closeTimer) clearTimeout(closeTimer);
          submenu.classList.add('active');
        });
      }
    }

    if (pdfBtn) {
      pdfBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        closeAllVdMenus();
        if (typeof window.exportVoucherDeskToPDF === 'function') {
          await window.exportVoucherDeskToPDF(getVoucherDeskExportData());
        }
      });
    }

    if (excelBtn) {
      excelBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        closeAllVdMenus();
        if (typeof window.exportVoucherDeskToExcel === 'function') {
          await window.exportVoucherDeskToExcel(getVoucherDeskExportData());
        }
      });
    }

    const toggleSelectBtn = document.getElementById('vdToggleSelectMode');
    if (toggleSelectBtn) {
      toggleSelectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllVdMenus();
        _vdSelectMode = !_vdSelectMode;
        if (!_vdSelectMode) {
          _vdSelectedKeys.clear();
        }
        const selectText = document.getElementById('vdToggleSelectText');
        if (selectText) {
          selectText.textContent = _vdSelectMode ? 'Exit Select Mode' : 'Select';
        }
        renderVoucherDeskPanel();
      });
    }

    const postAllOption = document.getElementById('vdPostAllOption');
    if (postAllOption) {
      postAllOption.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllVdMenus();
        executeVoucherDeskPostAll();
      });
    }

    document.addEventListener('click', (e) => {
      if (moreDropdown && !moreDropdown.contains(e.target) && moreBtn && !moreBtn.contains(e.target)) {
        closeAllVdMenus();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllVdMenus();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireVoucherDeskMoreDropdown);
  } else {
    wireVoucherDeskMoreDropdown();
  }

  window.getVoucherDeskExportData = getVoucherDeskExportData;
  //  CHART OF ACCOUNTS
  // ══════════════════════════════════════════════════════════════════

  // ── System data ──────────────────────────────────────────────────
  const COA_MAIN_GROUPS = [
    { id:'assets',             name:'Assets',                  color:'#2563eb', light:'#eff6ff', badge:'#2563eb' },
    { id:'equity-liabilities', name:'Equity and Liabilities',  color:'#7c3aed', light:'#f5f3ff', badge:'#7c3aed' },
    { id:'income',             name:'Income',                  color:'#059669', light:'#ecfdf5', badge:'#059669' },
    { id:'expense',            name:'Expense',                 color:'#dc2626', light:'#fff5f5', badge:'#dc2626' },
  ];

  const DEFAULT_COA_SYS_SGS = [
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

  function loadCoaSubGroups() {
    try {
      const saved = localStorage.getItem('kya_coa_subgroups');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = [...DEFAULT_COA_SYS_SGS];
          parsed.forEach(p => {
            if (!merged.some(m => m.id === p.id)) {
              merged.push(p);
            }
          });
          return merged;
        }
      }
    } catch (e) {
      console.error('Failed to parse kya_coa_subgroups from localStorage:', e);
    }
    return [...DEFAULT_COA_SYS_SGS];
  }

  function saveCoaSubGroups() {
    try {
      if (typeof COA_SYS_SGS !== 'undefined') {
        localStorage.setItem('kya_coa_subgroups', JSON.stringify(COA_SYS_SGS));
      }
    } catch (e) {
      console.error('Failed to save kya_coa_subgroups to localStorage:', e);
    }
  }

  // parentId:null → L1 sub-group; parentId:'xxx' → L2 sub-group (child of L1)
  COA_SYS_SGS = loadCoaSubGroups();
  window.COA_SYS_SGS = COA_SYS_SGS;
  window.DEFAULT_COA_SYS_SGS = DEFAULT_COA_SYS_SGS;
  window.saveCoaSubGroups = saveCoaSubGroups;
  window.loadCoaSubGroups = loadCoaSubGroups;


  // ── State ────────────────────────────────────────────────────────
  let _globalDateFrom = '2024-04-01';
  let _globalDateTo   = '2025-03-31';
  let _tbOptionalCols = { gl: false, sg: false, mg: false, plbs: false };

