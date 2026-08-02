  // ══════════════════════════════════════════════════════════════════
  //  CASHLINE STATEMENT IMPORT — CSV/Excel parsing, upload wizard
  //  (Split from cashline.js for maintainability)
  // ══════════════════════════════════════════════════════════════════

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
    if (!dateStr) return '';
    const clean = dateStr.trim();
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

    try {
      const parsed = new Date(clean);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    } catch(e) {}
    
    return clean;
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
              <p style="margin: 0; font-size: 12.5px; color: var(--slate-400);">Choose heading row and map statement columns. Date, Debit, and Credit columns are mandatory.</p>
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
                <label style="font-weight: 700; font-size: 12px; color: #475569; margin-bottom: 4px; display: block;">Debit / Deposit Column *</label>
                <select id="clWzMapDebit" class="je-input" style="height: 38px; background:#fff; cursor:pointer; border-radius:8px; width:100%;"></select>
              </div>
              <div class="cl-form-group">
                <label style="font-weight: 700; font-size: 12px; color: #475569; margin-bottom: 4px; display: block;">Credit / Withdrawal Column *</label>
                <select id="clWzMapCredit" class="je-input" style="height: 38px; background:#fff; cursor:pointer; border-radius:8px; width:100%;"></select>
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

        const fields = ['Date', 'Description', 'Debit', 'Credit', 'Balance'];
        fields.forEach(f => {
          const select = overlay.querySelector('#clWzMap' + f);
          if (!select) return;
          select.innerHTML = '<option value="">-- Choose Column --</option>' + optionsHtml;

          // Attempt saved mapping match
          const savedColName = savedConfig[f.toLowerCase() + 'Col'];
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
            } else if (fL === 'debit') {
              const idx = lowerH.findIndex(h => h.includes('debit') || h.includes('deposit') || h.includes('receipt') || h.includes('in') || h.includes('dr'));
              if (idx > -1) select.value = idx;
            } else if (fL === 'credit') {
              const idx = lowerH.findIndex(h => h.includes('credit') || h.includes('withdrawal') || h.includes('payment') || h.includes('out') || h.includes('cr'));
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
        const debitVal = overlay.querySelector('#clWzMapDebit').value;
        const creditVal = overlay.querySelector('#clWzMapCredit').value;
        const balVal = overlay.querySelector('#clWzMapBalance').value;

        if (dateVal === '' || debitVal === '' || creditVal === '') {
          showToast('Date, Debit, and Credit column mappings are mandatory.', 'warning');
          return;
        }

        const headers = parsedRows[hIdx] || [];
        const dateColName = headers[Number(dateVal)] || '';
        const descColName = descVal !== '' ? headers[Number(descVal)] : '';
        const debitColName = headers[Number(debitVal)] || '';
        const creditColName = headers[Number(creditVal)] || '';
        const balanceColName = balVal !== '' ? headers[Number(balVal)] : '';

        // Save mapping config
        window.KYA_STORE.statementMappings = window.KYA_STORE.statementMappings || {};
        window.KYA_STORE.statementMappings[bankId] = {
          headerRowIndex: hIdx,
          dateCol: dateColName,
          descCol: descColName,
          debitCol: debitColName,
          creditCol: creditColName,
          balanceCol: balanceColName
        };

        const statementRows = [];
        const dCol = Number(dateVal);
        const descCol = descVal !== '' ? Number(descVal) : -1;
        const drCol = Number(debitVal);
        const crCol = Number(creditVal);
        const bCol = balVal !== '' ? Number(balVal) : -1;

        for (let i = hIdx + 1; i < parsedRows.length; i++) {
          const row = parsedRows[i];
          if (!row || row.length === 0) continue;

          const rawDate = row[dCol];
          if (!rawDate) continue;

          const date = parseStatementDate(String(rawDate));
          if (!date) continue; // Skip invalid rows

          const description = descCol !== -1 ? String(row[descCol] || '').trim() : '';
          const debit = parseFloat(row[drCol]) || 0;
          const credit = parseFloat(row[crCol]) || 0;
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
