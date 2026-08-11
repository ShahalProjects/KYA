// ══════════════════════════════════════════════════════════════════
//  MASTER DESK — Central Master Control & Enterprise Workspace
// ══════════════════════════════════════════════════════════════════

(function() {
  let _masterDeskInitialized = false;
  let currentMasterDeskSubtype = 'Create';
  let currentMasterDeskTab = 'group';
  let _masterGroupAliases = [];
  let _masterLedgerAliases = [];
  let _masterCustomerAliases = [];
  let _masterSupplierAliases = [];

  function renderMasterDeskPanel() {
    const wrap = document.getElementById('panel-master-desk');
    if (!wrap) return;

    if (!_masterDeskInitialized || !wrap.children.length) {
      initMasterDesk(wrap);
      _masterDeskInitialized = true;
    } else {
      updateMasterDeskContent();
    }
  }

  function setMasterDeskSubtype(subtype) {
    currentMasterDeskSubtype = subtype;

    const btnCreate = document.getElementById('btnMasterCreate');
    const btnAlter = document.getElementById('btnMasterAlter');

    const buttonBaseStyle = "display: flex; align-items: center; gap: 6px; height: 38px; font-weight: 600; font-size: 13px; padding: 8px 14px; border-radius: 8px; cursor: pointer;";

    if (subtype === 'Create') {
      if (btnCreate) {
        btnCreate.className = 'btn btn-primary';
        btnCreate.style.cssText = buttonBaseStyle;
      }
      if (btnAlter) {
        btnAlter.className = 'btn-master-action';
        btnAlter.style.cssText = buttonBaseStyle;
      }
    } else {
      if (btnCreate) {
        btnCreate.className = 'btn-master-action';
        btnCreate.style.cssText = buttonBaseStyle;
      }
      if (btnAlter) {
        btnAlter.className = 'btn btn-primary';
        btnAlter.style.cssText = buttonBaseStyle;
      }
    }
    updateMasterDeskContent();
  }

  function setMasterDeskTab(tab) {
    currentMasterDeskTab = tab;

    const btnGroup = document.getElementById('masterTabGroup');
    const btnLedger = document.getElementById('masterTabLedger');
    const btnCustomers = document.getElementById('masterTabCustomers');
    const btnSuppliers = document.getElementById('masterTabSuppliers');

    if (btnGroup) {
      btnGroup.classList.toggle('active', tab === 'group');
      btnGroup.setAttribute('aria-selected', tab === 'group');
    }
    if (btnLedger) {
      btnLedger.classList.toggle('active', tab === 'ledger');
      btnLedger.setAttribute('aria-selected', tab === 'ledger');
    }
    if (btnCustomers) {
      btnCustomers.classList.toggle('active', tab === 'customers');
      btnCustomers.setAttribute('aria-selected', tab === 'customers');
    }
    if (btnSuppliers) {
      btnSuppliers.classList.toggle('active', tab === 'suppliers');
      btnSuppliers.setAttribute('aria-selected', tab === 'suppliers');
    }
    updateMasterDeskContent();
  }

  function ensureCleanCoaTradeParties() {
    if (typeof coaLedgers === 'undefined' || !Array.isArray(coaLedgers)) return;
    const customers = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
    const suppliers = typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : [];

    for (let i = coaLedgers.length - 1; i >= 0; i--) {
      const l = coaLedgers[i];
      if (l.type === 'ledger' && l.sgId === 'sg-tr' && l.name !== 'Trade Receivables') {
        if (!customers.some(c => c.name.toLowerCase() === l.name.toLowerCase())) {
          customers.push({
            id: 'cust-' + (l.id || Date.now()),
            name: l.name,
            aliases: l.aliases || [],
            openingBalance: l.openingBalance || 0,
            contactName: l.contactName || '',
            address: l.address || '',
            city: l.city || '',
            pincode: l.pincode || '',
            state: l.state || '',
            country: l.country || 'India',
            bankName: l.bankName || '',
            accountNo: l.accountNo || '',
            ifsc: l.ifsc || '',
            branch: l.branch || '',
            gstin: l.gstin || '',
            pan: l.pan || ''
          });
        }
        coaLedgers.splice(i, 1);
      } else if (l.type === 'ledger' && l.sgId === 'sg-tp' && l.name !== 'Trade Payables') {
        if (!suppliers.some(s => s.name.toLowerCase() === l.name.toLowerCase())) {
          suppliers.push({
            id: 'supp-' + (l.id || Date.now()),
            name: l.name,
            aliases: l.aliases || [],
            openingBalance: l.openingBalance || 0,
            contactName: l.contactName || '',
            address: l.address || '',
            city: l.city || '',
            pincode: l.pincode || '',
            state: l.state || '',
            country: l.country || 'India',
            bankName: l.bankName || '',
            accountNo: l.accountNo || '',
            ifsc: l.ifsc || '',
            branch: l.branch || '',
            gstin: l.gstin || '',
            pan: l.pan || ''
          });
        }
        coaLedgers.splice(i, 1);
      }
    }

    // Ensure Trade Receivables and Trade Payables ledgers exist
    let trLedger = coaLedgers.find(l => l.type === 'ledger' && l.sgId === 'sg-tr' && l.name === 'Trade Receivables');
    if (!trLedger) {
      coaLedgers.push({ id: 104, name: 'Trade Receivables', sgId: 'sg-tr', type: 'ledger', openingBalance: 0 });
    }
    let tpLedger = coaLedgers.find(l => l.type === 'ledger' && l.sgId === 'sg-tp' && l.name === 'Trade Payables');
    if (!tpLedger) {
      coaLedgers.push({ id: 125, name: 'Trade Payables', sgId: 'sg-tp', type: 'ledger', openingBalance: 0 });
    }
  }

  function findDuplicateCoaNameOrAlias(term) {
    if (!term) return null;
    const q = term.trim().toLowerCase();
    if (!q) return null;

    // 1. Check in coaLedgers (Active Ledgers and Group Ledgers)
    if (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) {
      for (const ldg of coaLedgers) {
        if (ldg.name && ldg.name.trim().toLowerCase() === q) {
          return { name: ldg.name, type: ldg.type === 'group-ledger' ? 'Group' : 'Ledger' };
        }
        if (Array.isArray(ldg.aliases)) {
          for (const al of ldg.aliases) {
            if (al && al.trim().toLowerCase() === q) {
              return { name: al, type: 'Alias', parentName: ldg.name };
            }
          }
        }
      }
    }

    // 2. Check in COA_SYS_SGS (Subgroups / Groups)
    if (typeof COA_SYS_SGS !== 'undefined' && Array.isArray(COA_SYS_SGS)) {
      for (const sg of COA_SYS_SGS) {
        if (sg.id && sg.id.startsWith('sg-grp-')) {
          const stillActive = typeof coaLedgers !== 'undefined' && coaLedgers.some(l => l.sgId === sg.id || l.name === sg.name);
          if (!stillActive) continue;
        }

        if (sg.name && sg.name.trim().toLowerCase() === q) {
          return { name: sg.name, type: 'Group' };
        }
        if (Array.isArray(sg.aliases)) {
          for (const al of sg.aliases) {
            if (al && al.trim().toLowerCase() === q) {
              return { name: al, type: 'Group Alias', parentName: sg.name };
            }
          }
        }
      }
    }

    // 3. Check in Customers Directory
    if (typeof getKyaCustomers === 'function') {
      for (const cust of getKyaCustomers()) {
        if (cust.name && cust.name.trim().toLowerCase() === q) {
          return { name: cust.name, type: 'Customer' };
        }
        if (Array.isArray(cust.aliases)) {
          for (const al of cust.aliases) {
            if (al && al.trim().toLowerCase() === q) {
              return { name: al, type: 'Customer Alias', parentName: cust.name };
            }
          }
        }
      }
    }

    // 4. Check in Suppliers Directory
    if (typeof getKyaSuppliers === 'function') {
      for (const supp of getKyaSuppliers()) {
        if (supp.name && supp.name.trim().toLowerCase() === q) {
          return { name: supp.name, type: 'Supplier' };
        }
        if (Array.isArray(supp.aliases)) {
          for (const al of supp.aliases) {
            if (al && al.trim().toLowerCase() === q) {
              return { name: al, type: 'Supplier Alias', parentName: supp.name };
            }
          }
        }
      }
    }

    return null;
  }

  function isTradePartyGroup(groupVal) {
    if (!groupVal) return false;
    const [pType, pId] = groupVal.split(':');

    let targetSgId = pId;
    let targetName = '';

    if (pType === 'gl') {
      const gl = typeof coaLedgers !== 'undefined' ? coaLedgers.find(l => String(l.id) === String(pId)) : null;
      if (gl) {
        targetSgId = gl.sgId;
        targetName = (gl.name || '').toLowerCase();
      }
    }

    if (targetSgId === 'sg-tr' || targetSgId === 'sg-tp') return true;

    if (targetName && (
      targetName.includes('receivable') ||
      targetName.includes('payable') ||
      targetName.includes('debtor') ||
      targetName.includes('creditor') ||
      targetName.includes('customer') ||
      targetName.includes('supplier') ||
      targetName.includes('vendor')
    )) {
      return true;
    }

    if (typeof COA_SYS_SGS !== 'undefined') {
      const sg = COA_SYS_SGS.find(s => s.id === targetSgId);
      if (sg) {
        if (sg.id === 'sg-tr' || sg.id === 'sg-tp' || sg.parent === 'sg-tr' || sg.parent === 'sg-tp') return true;
        const sName = (sg.name || '').toLowerCase();
        if (
          sName.includes('receivable') ||
          sName.includes('payable') ||
          sName.includes('debtor') ||
          sName.includes('creditor') ||
          sName.includes('customer') ||
          sName.includes('supplier') ||
          sName.includes('vendor')
        ) {
          return true;
        }
      }
    }

    return false;
  }

  function validateMasterGroupAliasesLive() {
    const container = document.getElementById('masterGroupAliasesContainer');
    const nameInp = document.getElementById('masterGroupName');
    if (!container) return true;

    const currentName = nameInp ? nameInp.value.trim().toLowerCase() : '';
    const rows = container.querySelectorAll('.master-alias-row-wrap');
    let hasAnyError = false;

    // Collect all lower-cased non-empty values with their counts to detect duplicates
    const aliasValues = [];
    rows.forEach(row => {
      const input = row.querySelector('.master-alias-input');
      const val = input ? input.value.trim() : '';
      aliasValues.push(val.toLowerCase());
    });

    rows.forEach((row, idx) => {
      const input = row.querySelector('.master-alias-input');
      const errDiv = row.querySelector('.master-alias-err');
      if (!input || !errDiv) return;

      const val = input.value.trim();
      const valLower = val.toLowerCase();

      if (!val) {
        errDiv.style.display = 'none';
        errDiv.textContent = '';
        input.style.borderColor = 'var(--slate-200)';
        input.style.boxShadow = 'none';
        return;
      }

      // Check 1: Duplicate of current form Group Name
      if (currentName && valLower === currentName) {
        const errorText = `"${val}" matches the Group Name in this form.`;
        errDiv.textContent = errorText;
        errDiv.style.display = 'block';
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.12)';
        hasAnyError = true;
        return;
      }

      // Check 2: Duplicate of another alias in current form
      const duplicateInForm = aliasValues.some((otherVal, otherIdx) => otherIdx !== idx && otherVal !== '' && otherVal === valLower);
      if (duplicateInForm) {
        const errorText = `"${val}" is already entered as another alias in this form.`;
        errDiv.textContent = errorText;
        errDiv.style.display = 'block';
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.12)';
        hasAnyError = true;
        return;
      }

      // Check 3: Duplicate of existing CoA entity
      const dup = findDuplicateCoaNameOrAlias(val);
      if (dup) {
        const typeLabel = dup.parentName ? `Alias of "${dup.parentName}"` : dup.type;
        const errorText = `"${val}" already exists in system (${typeLabel}).`;
        errDiv.textContent = errorText;
        errDiv.style.display = 'block';
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.12)';
        hasAnyError = true;
        return;
      }

      // No error
      errDiv.style.display = 'none';
      errDiv.textContent = '';
      input.style.borderColor = 'var(--slate-200)';
      input.style.boxShadow = 'none';
    });

    return !hasAnyError;
  }

  function renderMasterGroupAliases() {
    const container = document.getElementById('masterGroupAliasesContainer');
    const addAliasBtn = document.getElementById('masterGroupAddAliasBtn');
    if (!container) return;

    container.innerHTML = '';
    const hasEmpty = _masterGroupAliases.some(a => a.trim() === '');
    if (addAliasBtn) {
      addAliasBtn.style.display = hasEmpty ? 'none' : 'inline-flex';
    }

    _masterGroupAliases.forEach((alias, idx) => {
      const block = document.createElement('div');
      block.className = 'master-alias-row-wrap';
      block.style.display = 'flex';
      block.style.flexDirection = 'column';
      block.style.gap = '2px';

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.style.alignItems = 'center';

      const input = document.createElement('input');
      input.className = 'master-alias-input';
      input.placeholder = `Alias #${idx + 1} (e.g. Alternate name / Code)`;
      input.value = alias;
      input.style.cssText = `
        flex: 1;
        height: 38px;
        padding: 8px 12px;
        font-size: 13.5px;
        font-family: inherit;
        color: var(--slate-800);
        background: #ffffff;
        border: 1.5px solid var(--slate-200);
        border-radius: 8px;
        box-sizing: border-box;
        outline: none;
        transition: border-color 0.15s, box-shadow 0.15s;
      `;

      input.addEventListener('focus', () => {
        if (!input.style.borderColor || input.style.borderColor === 'var(--slate-200)' || input.style.borderColor === 'rgb(226, 232, 240)') {
          input.style.borderColor = '#3b82f6';
          input.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.12)';
        }
      });

      input.addEventListener('blur', () => {
        validateMasterGroupAliasesLive();
      });

      input.addEventListener('input', (e) => {
        _masterGroupAliases[idx] = e.target.value;
        const nowHasEmpty = _masterGroupAliases.some(a => a.trim() === '');
        if (addAliasBtn) addAliasBtn.style.display = nowHasEmpty ? 'none' : 'inline-flex';
        validateMasterGroupAliasesLive();
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-master-alias-del';
      delBtn.title = 'Remove Alias';
      delBtn.style.cssText = `
        width: 38px;
        height: 38px;
        min-width: 38px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: 1.5px solid var(--slate-200);
        border-radius: 8px;
        background: #ffffff;
        color: var(--slate-400);
        cursor: pointer;
        transition: all 0.15s ease;
      `;
      delBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;

      delBtn.addEventListener('mouseenter', () => {
        delBtn.style.background = '#fef2f2';
        delBtn.style.color = '#dc2626';
        delBtn.style.borderColor = '#fecaca';
      });
      delBtn.addEventListener('mouseleave', () => {
        delBtn.style.background = '#ffffff';
        delBtn.style.color = 'var(--slate-400)';
        delBtn.style.borderColor = 'var(--slate-200)';
      });

      delBtn.addEventListener('click', () => {
        _masterGroupAliases.splice(idx, 1);
        renderMasterGroupAliases();
      });

      const errDiv = document.createElement('div');
      errDiv.className = 'master-alias-err';
      errDiv.style.cssText = `
        display: none;
        font-size: 12px;
        font-weight: 600;
        color: #dc2626;
        margin-top: 4px;
        line-height: 1.4;
      `;

      row.appendChild(input);
      row.appendChild(delBtn);
      block.appendChild(row);
      block.appendChild(errDiv);
      container.appendChild(block);
    });

    validateMasterGroupAliasesLive();
  }

  function validateMasterLedgerAliasesLive() {
    const container = document.getElementById('masterLedgerAliasesContainer');
    const nameInp = document.getElementById('masterLedgerName');
    if (!container) return true;

    const currentName = nameInp ? nameInp.value.trim().toLowerCase() : '';
    const rows = container.querySelectorAll('.master-alias-row-wrap');
    let hasAnyError = false;

    const aliasValues = [];
    rows.forEach(row => {
      const input = row.querySelector('.master-alias-input');
      const val = input ? input.value.trim() : '';
      aliasValues.push(val.toLowerCase());
    });

    rows.forEach((row, idx) => {
      const input = row.querySelector('.master-alias-input');
      const errDiv = row.querySelector('.master-alias-err');
      if (!input || !errDiv) return;

      const val = input.value.trim();
      const valLower = val.toLowerCase();

      if (!val) {
        errDiv.style.display = 'none';
        errDiv.textContent = '';
        input.style.borderColor = 'var(--slate-200)';
        input.style.boxShadow = 'none';
        return;
      }

      // Check 1: Duplicate of current form Ledger Name
      if (currentName && valLower === currentName) {
        const errorText = `"${val}" matches the Ledger Name in this form.`;
        errDiv.textContent = errorText;
        errDiv.style.display = 'block';
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.12)';
        hasAnyError = true;
        return;
      }

      // Check 2: Duplicate of another alias in current form
      const duplicateInForm = aliasValues.some((otherVal, otherIdx) => otherIdx !== idx && otherVal !== '' && otherVal === valLower);
      if (duplicateInForm) {
        const errorText = `"${val}" is already entered as another alias in this form.`;
        errDiv.textContent = errorText;
        errDiv.style.display = 'block';
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.12)';
        hasAnyError = true;
        return;
      }

      // Check 3: Duplicate of existing CoA entity
      const dup = findDuplicateCoaNameOrAlias(val);
      if (dup) {
        const typeLabel = dup.parentName ? `Alias of "${dup.parentName}"` : dup.type;
        const errorText = `"${val}" already exists in system (${typeLabel}).`;
        errDiv.textContent = errorText;
        errDiv.style.display = 'block';
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.12)';
        hasAnyError = true;
        return;
      }

      // No error
      errDiv.style.display = 'none';
      errDiv.textContent = '';
      input.style.borderColor = 'var(--slate-200)';
      input.style.boxShadow = 'none';
    });

    return !hasAnyError;
  }

  function renderMasterLedgerAliases() {
    const container = document.getElementById('masterLedgerAliasesContainer');
    const addAliasBtn = document.getElementById('masterLedgerAddAliasBtn');
    if (!container) return;

    container.innerHTML = '';
    const hasEmpty = _masterLedgerAliases.some(a => a.trim() === '');
    if (addAliasBtn) {
      addAliasBtn.style.display = hasEmpty ? 'none' : 'inline-flex';
    }

    _masterLedgerAliases.forEach((alias, idx) => {
      const block = document.createElement('div');
      block.className = 'master-alias-row-wrap';
      block.style.display = 'flex';
      block.style.flexDirection = 'column';
      block.style.gap = '2px';

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.style.alignItems = 'center';

      const input = document.createElement('input');
      input.className = 'master-alias-input';
      input.placeholder = `Alias #${idx + 1} (e.g. Alternate name / Code)`;
      input.value = alias;
      input.style.cssText = `
        flex: 1;
        height: 38px;
        padding: 8px 12px;
        font-size: 13.5px;
        font-family: inherit;
        color: var(--slate-800);
        background: #ffffff;
        border: 1.5px solid var(--slate-200);
        border-radius: 8px;
        box-sizing: border-box;
        outline: none;
        transition: border-color 0.15s, box-shadow 0.15s;
      `;

      input.addEventListener('focus', () => {
        if (!input.style.borderColor || input.style.borderColor === 'var(--slate-200)' || input.style.borderColor === 'rgb(226, 232, 240)') {
          input.style.borderColor = '#3b82f6';
          input.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.12)';
        }
      });

      input.addEventListener('blur', () => {
        validateMasterLedgerAliasesLive();
      });

      input.addEventListener('input', (e) => {
        _masterLedgerAliases[idx] = e.target.value;
        const nowHasEmpty = _masterLedgerAliases.some(a => a.trim() === '');
        if (addAliasBtn) addAliasBtn.style.display = nowHasEmpty ? 'none' : 'inline-flex';
        validateMasterLedgerAliasesLive();
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-master-alias-del';
      delBtn.title = 'Remove Alias';
      delBtn.style.cssText = `
        width: 38px;
        height: 38px;
        min-width: 38px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: 1.5px solid var(--slate-200);
        border-radius: 8px;
        background: #ffffff;
        color: var(--slate-400);
        cursor: pointer;
        transition: all 0.15s ease;
      `;
      delBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;

      delBtn.addEventListener('mouseenter', () => {
        delBtn.style.background = '#fef2f2';
        delBtn.style.color = '#dc2626';
        delBtn.style.borderColor = '#fecaca';
      });
      delBtn.addEventListener('mouseleave', () => {
        delBtn.style.background = '#ffffff';
        delBtn.style.color = 'var(--slate-400)';
        delBtn.style.borderColor = 'var(--slate-200)';
      });

      delBtn.addEventListener('click', () => {
        _masterLedgerAliases.splice(idx, 1);
        renderMasterLedgerAliases();
      });

      const errDiv = document.createElement('div');
      errDiv.className = 'master-alias-err';
      errDiv.style.cssText = `
        display: none;
        font-size: 12px;
        font-weight: 600;
        color: #dc2626;
        margin-top: 4px;
        line-height: 1.4;
      `;

      row.appendChild(input);
      row.appendChild(delBtn);
      block.appendChild(row);
      block.appendChild(errDiv);
      container.appendChild(block);
    });

    validateMasterLedgerAliasesLive();
  }

  function validateMasterCustomerAliasesLive() {
    const container = document.getElementById('masterCustomerAliasesContainer');
    const nameInp = document.getElementById('masterCustomerName');
    if (!container) return true;

    const currentName = nameInp ? nameInp.value.trim().toLowerCase() : '';
    const rows = container.querySelectorAll('.master-alias-row-wrap');
    let hasAnyError = false;

    const aliasValues = [];
    rows.forEach(row => {
      const input = row.querySelector('.master-alias-input');
      const val = input ? input.value.trim() : '';
      aliasValues.push(val.toLowerCase());
    });

    rows.forEach((row, idx) => {
      const input = row.querySelector('.master-alias-input');
      const errDiv = row.querySelector('.master-alias-err');
      if (!input || !errDiv) return;

      const val = input.value.trim();
      const valLower = val.toLowerCase();

      if (!val) {
        errDiv.style.display = 'none';
        errDiv.textContent = '';
        input.style.borderColor = 'var(--slate-200)';
        input.style.boxShadow = 'none';
        return;
      }

      // Check 1: Duplicate of current form Customer Name
      if (currentName && valLower === currentName) {
        const errorText = `"${val}" matches the Customer Name in this form.`;
        errDiv.textContent = errorText;
        errDiv.style.display = 'block';
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.12)';
        hasAnyError = true;
        return;
      }

      // Check 2: Duplicate of another alias in current form
      const duplicateInForm = aliasValues.some((otherVal, otherIdx) => otherIdx !== idx && otherVal !== '' && otherVal === valLower);
      if (duplicateInForm) {
        const errorText = `"${val}" is already entered as another alias in this form.`;
        errDiv.textContent = errorText;
        errDiv.style.display = 'block';
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.12)';
        hasAnyError = true;
        return;
      }

      // Check 3: Duplicate of existing CoA entity
      const dup = findDuplicateCoaNameOrAlias(val);
      if (dup) {
        const typeLabel = dup.parentName ? `Alias of "${dup.parentName}"` : dup.type;
        const errorText = `"${val}" already exists in system (${typeLabel}).`;
        errDiv.textContent = errorText;
        errDiv.style.display = 'block';
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.12)';
        hasAnyError = true;
        return;
      }

      // No error
      errDiv.style.display = 'none';
      errDiv.textContent = '';
      input.style.borderColor = 'var(--slate-200)';
      input.style.boxShadow = 'none';
    });

    return !hasAnyError;
  }

  function renderMasterCustomerAliases() {
    const container = document.getElementById('masterCustomerAliasesContainer');
    const addAliasBtn = document.getElementById('masterCustomerAddAliasBtn');
    if (!container) return;

    container.innerHTML = '';
    const hasEmpty = _masterCustomerAliases.some(a => a.trim() === '');
    if (addAliasBtn) {
      addAliasBtn.style.display = hasEmpty ? 'none' : 'inline-flex';
    }

    _masterCustomerAliases.forEach((alias, idx) => {
      const block = document.createElement('div');
      block.className = 'master-alias-row-wrap';
      block.style.display = 'flex';
      block.style.flexDirection = 'column';
      block.style.gap = '2px';

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.style.alignItems = 'center';

      const input = document.createElement('input');
      input.className = 'master-alias-input';
      input.placeholder = `Alias #${idx + 1} (e.g. Alternate name / Code)`;
      input.value = alias;
      input.style.cssText = `
        flex: 1;
        height: 38px;
        padding: 8px 12px;
        font-size: 13.5px;
        font-family: inherit;
        color: var(--slate-800);
        background: #ffffff;
        border: 1.5px solid var(--slate-200);
        border-radius: 8px;
        box-sizing: border-box;
        outline: none;
        transition: border-color 0.15s, box-shadow 0.15s;
      `;

      input.addEventListener('focus', () => {
        if (!input.style.borderColor || input.style.borderColor === 'var(--slate-200)' || input.style.borderColor === 'rgb(226, 232, 240)') {
          input.style.borderColor = '#3b82f6';
          input.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.12)';
        }
      });

      input.addEventListener('blur', () => {
        validateMasterCustomerAliasesLive();
      });

      input.addEventListener('input', (e) => {
        _masterCustomerAliases[idx] = e.target.value;
        const nowHasEmpty = _masterCustomerAliases.some(a => a.trim() === '');
        if (addAliasBtn) addAliasBtn.style.display = nowHasEmpty ? 'none' : 'inline-flex';
        validateMasterCustomerAliasesLive();
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-master-alias-del';
      delBtn.title = 'Remove Alias';
      delBtn.style.cssText = `
        width: 38px;
        height: 38px;
        min-width: 38px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: 1.5px solid var(--slate-200);
        border-radius: 8px;
        background: #ffffff;
        color: var(--slate-400);
        cursor: pointer;
        transition: all 0.15s ease;
      `;
      delBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;

      delBtn.addEventListener('mouseenter', () => {
        delBtn.style.background = '#fef2f2';
        delBtn.style.color = '#dc2626';
        delBtn.style.borderColor = '#fecaca';
      });
      delBtn.addEventListener('mouseleave', () => {
        delBtn.style.background = '#ffffff';
        delBtn.style.color = 'var(--slate-400)';
        delBtn.style.borderColor = 'var(--slate-200)';
      });

      delBtn.addEventListener('click', () => {
        _masterCustomerAliases.splice(idx, 1);
        renderMasterCustomerAliases();
      });

      const errDiv = document.createElement('div');
      errDiv.className = 'master-alias-err';
      errDiv.style.cssText = `
        display: none;
        font-size: 12px;
        font-weight: 600;
        color: #dc2626;
        margin-top: 4px;
        line-height: 1.4;
      `;

      row.appendChild(input);
      row.appendChild(delBtn);
      block.appendChild(row);
      block.appendChild(errDiv);
      container.appendChild(block);
    });

    validateMasterCustomerAliasesLive();
  }

  function validateMasterSupplierAliasesLive() {
    const container = document.getElementById('masterSupplierAliasesContainer');
    const nameInp = document.getElementById('masterSupplierName');
    if (!container) return true;

    const currentName = nameInp ? nameInp.value.trim().toLowerCase() : '';
    const rows = container.querySelectorAll('.master-alias-row-wrap');
    let hasAnyError = false;

    const aliasValues = [];
    rows.forEach(row => {
      const input = row.querySelector('.master-alias-input');
      const val = input ? input.value.trim() : '';
      aliasValues.push(val.toLowerCase());
    });

    rows.forEach((row, idx) => {
      const input = row.querySelector('.master-alias-input');
      const errDiv = row.querySelector('.master-alias-err');
      if (!input || !errDiv) return;

      const val = input.value.trim();
      const valLower = val.toLowerCase();

      if (!val) {
        errDiv.style.display = 'none';
        errDiv.textContent = '';
        input.style.borderColor = 'var(--slate-200)';
        input.style.boxShadow = 'none';
        return;
      }

      if (currentName && valLower === currentName) {
        const errorText = `"${val}" matches the Supplier Name in this form.`;
        errDiv.textContent = errorText;
        errDiv.style.display = 'block';
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.12)';
        hasAnyError = true;
        return;
      }

      const duplicateInForm = aliasValues.some((otherVal, otherIdx) => otherIdx !== idx && otherVal !== '' && otherVal === valLower);
      if (duplicateInForm) {
        const errorText = `"${val}" is already entered as another alias in this form.`;
        errDiv.textContent = errorText;
        errDiv.style.display = 'block';
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.12)';
        hasAnyError = true;
        return;
      }

      const dup = findDuplicateCoaNameOrAlias(val);
      if (dup) {
        const typeLabel = dup.parentName ? `Alias of "${dup.parentName}"` : dup.type;
        const errorText = `"${val}" already exists in system (${typeLabel}).`;
        errDiv.textContent = errorText;
        errDiv.style.display = 'block';
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.12)';
        hasAnyError = true;
        return;
      }

      errDiv.style.display = 'none';
      errDiv.textContent = '';
      input.style.borderColor = 'var(--slate-200)';
      input.style.boxShadow = 'none';
    });

    return !hasAnyError;
  }

  function renderMasterSupplierAliases() {
    const container = document.getElementById('masterSupplierAliasesContainer');
    const addAliasBtn = document.getElementById('masterSupplierAddAliasBtn');
    if (!container) return;

    container.innerHTML = '';
    const hasEmpty = _masterSupplierAliases.some(a => a.trim() === '');
    if (addAliasBtn) {
      addAliasBtn.style.display = hasEmpty ? 'none' : 'inline-flex';
    }

    _masterSupplierAliases.forEach((alias, idx) => {
      const block = document.createElement('div');
      block.className = 'master-alias-row-wrap';
      block.style.display = 'flex';
      block.style.flexDirection = 'column';
      block.style.gap = '2px';

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.style.alignItems = 'center';

      const input = document.createElement('input');
      input.className = 'master-alias-input';
      input.placeholder = `Alias #${idx + 1} (e.g. Alternate name / Code)`;
      input.value = alias;
      input.style.cssText = `
        flex: 1;
        height: 38px;
        padding: 8px 12px;
        font-size: 13.5px;
        font-family: inherit;
        color: var(--slate-800);
        background: #ffffff;
        border: 1.5px solid var(--slate-200);
        border-radius: 8px;
        box-sizing: border-box;
        outline: none;
        transition: border-color 0.15s, box-shadow 0.15s;
      `;

      input.addEventListener('focus', () => {
        if (!input.style.borderColor || input.style.borderColor === 'var(--slate-200)' || input.style.borderColor === 'rgb(226, 232, 240)') {
          input.style.borderColor = '#3b82f6';
          input.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.12)';
        }
      });

      input.addEventListener('blur', () => {
        validateMasterSupplierAliasesLive();
      });

      input.addEventListener('input', (e) => {
        _masterSupplierAliases[idx] = e.target.value;
        const nowHasEmpty = _masterSupplierAliases.some(a => a.trim() === '');
        if (addAliasBtn) addAliasBtn.style.display = nowHasEmpty ? 'none' : 'inline-flex';
        validateMasterSupplierAliasesLive();
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-master-alias-del';
      delBtn.title = 'Remove Alias';
      delBtn.style.cssText = `
        width: 38px;
        height: 38px;
        min-width: 38px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: 1.5px solid var(--slate-200);
        border-radius: 8px;
        background: #ffffff;
        color: var(--slate-400);
        cursor: pointer;
        transition: all 0.15s ease;
      `;
      delBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;

      delBtn.addEventListener('mouseenter', () => {
        delBtn.style.background = '#fef2f2';
        delBtn.style.color = '#dc2626';
        delBtn.style.borderColor = '#fecaca';
      });
      delBtn.addEventListener('mouseleave', () => {
        delBtn.style.background = '#ffffff';
        delBtn.style.color = 'var(--slate-400)';
        delBtn.style.borderColor = 'var(--slate-200)';
      });

      delBtn.addEventListener('click', () => {
        _masterSupplierAliases.splice(idx, 1);
        renderMasterSupplierAliases();
      });

      const errDiv = document.createElement('div');
      errDiv.className = 'master-alias-err';
      errDiv.style.cssText = `
        display: none;
        font-size: 12px;
        font-weight: 600;
        color: #dc2626;
        margin-top: 4px;
        line-height: 1.4;
      `;

      row.appendChild(input);
      row.appendChild(delBtn);
      block.appendChild(row);
      block.appendChild(errDiv);
      container.appendChild(block);
    });

    validateMasterSupplierAliasesLive();
  }

  function initSearchableSelectHelper(container, prefix, placeholderText) {
    if (typeof initGenericSearchableSelect === 'function') {
      return initGenericSearchableSelect(container, prefix, placeholderText);
    }
    const realSelect = container.querySelector('#' + prefix);
    const trigger = container.querySelector('#' + prefix + 'Trigger');
    const dropdown = container.querySelector('#' + prefix + 'Dropdown');
    const searchInput = container.querySelector('#' + prefix + 'Search');
    const optionsList = container.querySelector('#' + prefix + 'OptionsList');
    const triggerText = container.querySelector('#' + prefix + 'TriggerText');
    if (!realSelect || !trigger || !dropdown || !searchInput || !optionsList || !triggerText) return null;

    const updateTriggerText = () => {
      const allOpts = Array.from(realSelect.querySelectorAll('option'));
      const selectedOpt = allOpts.find(opt => opt.value === realSelect.value) || realSelect.options[realSelect.selectedIndex];
      if (selectedOpt) {
        triggerText.textContent = selectedOpt.textContent.trim();
      } else {
        triggerText.textContent = placeholderText || 'Select option...';
      }
    };

    const populateList = (filter = '') => {
      optionsList.innerHTML = '';
      const query = filter.toLowerCase().trim();

      const children = Array.from(realSelect.children);
      const hasOptgroups = children.some(ch => ch.tagName === 'OPTGROUP');

      const renderOptionItem = (opt) => {
        const text = opt.textContent;
        const value = opt.value;
        if (query && !text.toLowerCase().includes(query)) return;

        const isSelected = opt.selected || realSelect.value === value;
        const item = document.createElement('div');
        item.style.padding = '8.5px 12px';
        item.style.fontSize = '13.5px';
        item.style.borderRadius = '6px';
        item.style.cursor = 'pointer';
        item.style.fontWeight = isSelected ? '700' : '500';
        item.style.background = isSelected ? 'var(--blue-50)' : 'transparent';
        item.style.color = isSelected ? 'var(--blue-700)' : 'var(--slate-700)';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.justifyContent = 'space-between';
        item.style.whiteSpace = 'pre-wrap';

        const labelSpan = document.createElement('span');
        labelSpan.textContent = text;
        item.appendChild(labelSpan);

        if (opt.dataset && opt.dataset.badge) {
          const badgeSpan = document.createElement('span');
          badgeSpan.style.fontSize = '11px';
          badgeSpan.style.fontWeight = '600';
          badgeSpan.style.padding = '2px 7px';
          badgeSpan.style.borderRadius = '4px';
          if (opt.dataset.badge === 'Primary') {
            badgeSpan.style.background = '#eff6ff';
            badgeSpan.style.color = '#1d4ed8';
            badgeSpan.style.border = '1px solid #dbeafe';
          } else {
            badgeSpan.style.background = '#f8fafc';
            badgeSpan.style.color = '#64748b';
            badgeSpan.style.border = '1px solid #e2e8f0';
          }
          badgeSpan.textContent = opt.dataset.badge;
          item.appendChild(badgeSpan);
        }

        item.addEventListener('mouseover', () => {
          if (realSelect.value !== value) item.style.background = 'var(--slate-50)';
        });
        item.addEventListener('mouseout', () => {
          if (realSelect.value !== value) item.style.background = 'transparent';
        });

        item.addEventListener('click', () => {
          realSelect.value = value;
          Array.from(realSelect.querySelectorAll('option')).forEach(o => {
            o.selected = (o.value === value);
          });
          realSelect.dispatchEvent(new Event('change'));
          updateTriggerText();
          dropdown.style.display = 'none';
        });

        optionsList.appendChild(item);
      };

      if (hasOptgroups) {
        children.forEach(child => {
          if (child.tagName === 'OPTGROUP') {
            const groupLabel = child.label;
            const matchingOpts = Array.from(child.children).filter(opt => !query || opt.textContent.toLowerCase().includes(query));
            if (matchingOpts.length > 0) {
              const grpHdr = document.createElement('div');
              grpHdr.style.padding = '8px 12px 4px 12px';
              grpHdr.style.fontSize = '11px';
              grpHdr.style.fontWeight = '700';
              grpHdr.style.color = 'var(--slate-400)';
              grpHdr.style.textTransform = 'uppercase';
              grpHdr.style.letterSpacing = '0.5px';
              if (optionsList.children.length > 0) {
                grpHdr.style.borderTop = '1px solid var(--slate-100)';
                grpHdr.style.marginTop = '6px';
                grpHdr.style.paddingTop = '8px';
              }
              grpHdr.textContent = groupLabel;
              optionsList.appendChild(grpHdr);

              matchingOpts.forEach(renderOptionItem);
            }
          } else if (child.tagName === 'OPTION') {
            renderOptionItem(child);
          }
        });
      } else {
        Array.from(realSelect.options).forEach(renderOptionItem);
      }

      if (optionsList.children.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.style.padding = '12px';
        emptyState.style.fontSize = '13px';
        emptyState.style.color = 'var(--slate-400)';
        emptyState.style.textAlign = 'center';
        emptyState.textContent = 'No matching options found';
        optionsList.appendChild(emptyState);
      }
    };

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.style.display === 'flex';
      dropdown.style.display = isOpen ? 'none' : 'flex';
      if (!isOpen) {
        searchInput.value = '';
        populateList('');
        setTimeout(() => searchInput.focus(), 50);
      }
    });

    searchInput.addEventListener('input', (e) => populateList(e.target.value));

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });

    updateTriggerText();
    return { refresh: () => { updateTriggerText(); populateList(''); } };
  }

  function updateMasterDeskContent() {
    const contentArea = document.getElementById('masterDeskContentArea');
    if (!contentArea) return;

    if (currentMasterDeskSubtype === 'Create' && currentMasterDeskTab === 'group') {
      _masterGroupAliases = [];

      let groupOptionsHtml = '';
      if (typeof COA_SYS_SGS !== 'undefined') {
        COA_SYS_SGS.forEach(sg => {
          const sgIndent = sg.parent ? '\u00a0\u00a0\u00a0\u00a0' : '';
          groupOptionsHtml += `<option value="group:sg:${sg.id}" data-badge="Group">${sgIndent}${sg.name}</option>`;

          if (typeof coaLedgers !== 'undefined') {
            const addGlOptions = (parentId, depth) => {
              const gls = coaLedgers.filter(l => l.sgId === sg.id && l.type === 'group-ledger' && (parentId ? l.glId === parentId : !l.glId));
              gls.forEach(gl => {
                const glIndent = sgIndent + '\u00a0\u00a0\u00a0\u00a0' + '\u00a0\u00a0'.repeat(depth);
                groupOptionsHtml += `<option value="group:gl:${gl.id}" data-badge="Group">${glIndent}📁 ${gl.name}</option>`;
                addGlOptions(gl.id, depth + 1);
              });
            };
            addGlOptions(null, 0);
          }
        });
      }

      contentArea.innerHTML = `
        <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--white); margin: 0 0 20px 0;">
          <h3 style="font-size: 15px; font-weight: 700; color: var(--slate-800); margin: 0 0 18px 0; display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            Create Group
          </h3>

          <!-- Name field -->
          <div class="coa-modal-fg" style="margin-bottom: 16px;">
            <label class="coa-modal-label" for="masterGroupName" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Name *</label>
            <input class="coa-modal-inp" id="masterGroupName" placeholder="e.g. Current Assets / Bank Accounts" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box;">
            <div id="masterGroupNameError" style="display: none; font-size: 12px; font-weight: 600; color: #dc2626; margin-top: 5px;"></div>
          </div>

          <!-- Also Known As field -->
          <div class="coa-modal-fg" style="margin-bottom: 16px;">
            <label class="coa-modal-label" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Also Known As</label>
            <div id="masterGroupAliasesContainer" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;"></div>
            <button type="button" id="masterGroupAddAliasBtn" style="padding: 7px 14px; font-size: 12.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; border: 1.5px dashed var(--slate-300); border-radius: 8px; background: #f8fafc; cursor: pointer; color: var(--slate-600); transition: all 0.15s ease;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add A.K.A
            </button>
          </div>

          <!-- Under field (Single box with separated Primary Categories & Parent Groups) -->
          <div class="coa-modal-fg" style="margin-bottom: 24px;">
            <label class="coa-modal-label" for="masterGroupUnderCombinedSel" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Under *</label>
            <select class="coa-modal-sel" id="masterGroupUnderCombinedSel" style="display: none;">
              <optgroup label="Primary Categories">
                <option value="primary:assets" data-badge="Primary" selected>Asset</option>
                <option value="primary:equity-liabilities" data-badge="Primary">Liability</option>
                <option value="primary:expense" data-badge="Primary">Expense</option>
                <option value="primary:income" data-badge="Primary">Income</option>
              </optgroup>
              <optgroup label="Parent Groups">
                ${groupOptionsHtml}
              </optgroup>
            </select>
            <div class="kya-searchable-select-wrap" id="masterGroupUnderCombinedSelSearchableWrap" style="position: relative; width: 100%;">
              <div class="kya-searchable-select-trigger" id="masterGroupUnderCombinedSelTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                <span id="masterGroupUnderCombinedSelTriggerText">Asset</span>
                <span style="font-size: 10px; color: var(--slate-400);">▼</span>
              </div>
              <div class="kya-searchable-select-dropdown" id="masterGroupUnderCombinedSelDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                <input type="text" id="masterGroupUnderCombinedSelSearch" placeholder="Search primary category or parent group..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                <div id="masterGroupUnderCombinedSelOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 12px; align-items: center;">
            <button class="btn btn-primary" id="masterGroupSaveBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">＋ Create Group</button>
            <button class="btn btn-secondary" id="masterGroupCancelBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Cancel</button>
          </div>
        </div>
      `;

      renderMasterGroupAliases();

      const addAliasBtn = contentArea.querySelector('#masterGroupAddAliasBtn');
      if (addAliasBtn) {
        addAliasBtn.addEventListener('click', () => {
          _masterGroupAliases.push('');
          renderMasterGroupAliases();
          const inputs = contentArea.querySelectorAll('.master-alias-input');
          if (inputs.length) {
            inputs[inputs.length - 1].focus();
          }
        });
      }

      const searchableUnderControl = initSearchableSelectHelper(contentArea, 'masterGroupUnderCombinedSel', 'Select category or parent group');

      const saveBtn = contentArea.querySelector('#masterGroupSaveBtn');
      const cancelBtn = contentArea.querySelector('#masterGroupCancelBtn');
      const nameInp = contentArea.querySelector('#masterGroupName');
      const nameErr = contentArea.querySelector('#masterGroupNameError');

      const validateNameInputLive = () => {
        const val = nameInp ? nameInp.value.trim() : '';
        if (!val) {
          if (nameErr) { nameErr.style.display = 'none'; nameErr.textContent = ''; }
          if (nameInp) nameInp.style.borderColor = 'var(--slate-200)';
          return null;
        }

        const dup = findDuplicateCoaNameOrAlias(val);
        if (dup) {
          const typeLabel = dup.parentName ? `Alias of "${dup.parentName}"` : dup.type;
          const errorText = `"${val}" already exists (${typeLabel}).`;
          if (nameErr) {
            nameErr.textContent = errorText;
            nameErr.style.display = 'block';
          }
          if (nameInp) nameInp.style.borderColor = '#ef4444';
          return errorText;
        } else {
          if (nameErr) { nameErr.style.display = 'none'; nameErr.textContent = ''; }
          if (nameInp) nameInp.style.borderColor = 'var(--slate-200)';
          return null;
        }
      };

      if (nameInp) {
        nameInp.addEventListener('input', () => {
          validateNameInputLive();
          // revalidate aliases against new name without destroying DOM
          validateMasterGroupAliasesLive();
        });
      }

      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const name = nameInp ? nameInp.value.trim() : '';
          if (!name) {
            if (typeof showToast === 'function') showToast('Please enter a group name.', 'warning');
            else alert('Please enter a group name.');
            if (nameInp) nameInp.focus();
            return;
          }

          // Check if Group Name already exists in system
          const liveNameErr = validateNameInputLive();
          if (liveNameErr) {
            if (typeof showToast === 'function') showToast(liveNameErr, 'error');
            else alert(liveNameErr);
            if (nameInp) nameInp.focus();
            return;
          }

          // Check if any Alias has errors
          const aliasesValid = validateMasterGroupAliasesLive();
          if (!aliasesValid) {
            const msg = 'Please fix duplicate or invalid Also Known As entries.';
            if (typeof showToast === 'function') showToast(msg, 'error');
            else alert(msg);
            return;
          }

          const underSel = contentArea.querySelector('#masterGroupUnderCombinedSel');
          const underVal = underSel && underSel.value ? underSel.value : 'primary:assets';
          const isPrimary = underVal.startsWith('primary:');
          const aliases = _masterGroupAliases.map(a => a.trim()).filter(a => a !== '');

          // Check if any Alias duplicates the Name, another Alias in form, or already exists in system
          const formNamesSet = new Set([name.toLowerCase()]);
          for (let i = 0; i < aliases.length; i++) {
            const al = aliases[i];
            const alLower = al.toLowerCase();

            if (formNamesSet.has(alLower)) {
              const msg = `Duplicate entry "${al}" found in the form. Name and A.K.A must be unique.`;
              if (typeof showToast === 'function') showToast(msg, 'error');
              else alert(msg);
              return;
            }
            formNamesSet.add(alLower);

            const dupAl = findDuplicateCoaNameOrAlias(al);
            if (dupAl) {
              const typeLabel = dupAl.parentName ? `Alias of "${dupAl.parentName}"` : dupAl.type;
              const msg = `"${al}" already exists (${typeLabel}).`;
              if (typeof showToast === 'function') showToast(msg, 'error');
              else alert(msg);
              return;
            }
          }

          if (isPrimary) {
            const mainNature = underVal.replace('primary:', ''); // 'assets', 'equity-liabilities', 'expense', 'income'
            const newSgId = 'sg-grp-' + Date.now();
            const newSg = {
              id: newSgId,
              main: mainNature,
              parent: null,
              name: name,
              aliases: aliases
            };
            if (typeof COA_SYS_SGS !== 'undefined') {
              COA_SYS_SGS.push(newSg);
              if (typeof saveCoaSubGroups === 'function') saveCoaSubGroups();
            }

            if (typeof _coaExpanded !== 'undefined') {
              _coaExpanded.add(mainNature);
              _coaExpanded.add(newSgId);
            }
          } else {
            const selectedVal = underVal.replace('group:', '');
            let parentSgId = selectedVal;
            let parentGlId = null;

            if (selectedVal.startsWith('gl:')) {
              const targetGlId = Number(selectedVal.replace('gl:', ''));
              const targetGl = typeof coaLedgers !== 'undefined' ? coaLedgers.find(l => l.id === targetGlId) : null;
              if (targetGl) {
                parentSgId = targetGl.sgId;
                parentGlId = targetGl.id;
              }
            } else if (selectedVal.startsWith('sg:')) {
              parentSgId = selectedVal.replace('sg:', '');
            }

            const parentSg = typeof COA_SYS_SGS !== 'undefined' ? COA_SYS_SGS.find(s => s.id === parentSgId) : null;
            const newGroup = {
              id: Date.now(),
              name: name,
              sgId: parentSgId,
              glId: parentGlId,
              type: 'group-ledger',
              balance: 0,
              aliases: aliases
            };
            if (typeof coaLedgers !== 'undefined') {
              coaLedgers.push(newGroup);
            }

            if (typeof _coaExpanded !== 'undefined') {
              if (parentSg) {
                _coaExpanded.add(parentSg.main);
                _coaExpanded.add(parentSg.id);
                if (parentSg.parent) _coaExpanded.add(parentSg.parent);
              }
              if (parentGlId) _coaExpanded.add('gl-' + parentGlId);
              _coaExpanded.add('gl-' + newGroup.id);
            }
          }

          if (typeof renderChartPanel === 'function') {
            renderChartPanel();
          }

          if (typeof refreshAllReports === 'function') {
            refreshAllReports();
          }

          if (typeof triggerAutoBackup === 'function') {
            triggerAutoBackup();
          }

          showToast(`Group "${name}" created successfully.`, 'success');

          _masterGroupAliases = [];
          updateMasterDeskContent();
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          _masterGroupAliases = [];
          updateMasterDeskContent();
        });
      }
    } else if (currentMasterDeskSubtype === 'Create' && currentMasterDeskTab === 'ledger') {
      _masterLedgerAliases = [];

      let ledgerGroupOptionsHtml = '';
      let firstGroupLabel = 'Select Group';

      const mainCategories = [
        { key: 'assets', label: 'Assets' },
        { key: 'equity-liabilities', label: 'Liabilities & Equity' },
        { key: 'expense', label: 'Expenses' },
        { key: 'income', label: 'Income' }
      ];

      if (typeof COA_SYS_SGS !== 'undefined') {
        mainCategories.forEach(cat => {
          const sgsInCat = COA_SYS_SGS.filter(s => s.main === cat.key);
          if (sgsInCat.length === 0) return;

          let catOptionsHtml = '';
          sgsInCat.forEach(sg => {
            const sgIndent = sg.parent ? '\u00a0\u00a0\u00a0\u00a0' : '';
            catOptionsHtml += `<option value="sg:${sg.id}" data-badge="Group">${sgIndent}${sg.name}</option>`;
            if (firstGroupLabel === 'Select Group') {
              firstGroupLabel = sg.name;
            }

            if (typeof coaLedgers !== 'undefined') {
              const addGlOptions = (parentId, depth) => {
                const gls = coaLedgers.filter(l => l.sgId === sg.id && l.type === 'group-ledger' && (parentId ? l.glId === parentId : !l.glId));
                gls.forEach(gl => {
                  const glIndent = sgIndent + '\u00a0\u00a0\u00a0\u00a0' + '\u00a0\u00a0'.repeat(depth);
                  catOptionsHtml += `<option value="gl:${gl.id}" data-badge="Group Ledger">${glIndent}📁 ${gl.name}</option>`;
                  addGlOptions(gl.id, depth + 1);
                });
              };
              addGlOptions(null, 0);
            }
          });

          if (catOptionsHtml) {
            ledgerGroupOptionsHtml += `<optgroup label="${cat.label}">${catOptionsHtml}</optgroup>`;
          }
        });
      }

      contentArea.innerHTML = `
        <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--white); margin: 0 0 20px 0;">
          <h3 style="font-size: 15px; font-weight: 700; color: var(--slate-800); margin: 0 0 18px 0; display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="var(--blue-600)" stroke-width="1.8" stroke-linecap="round">
              <path d="M4 5h12M4 10h8M4 15h10"/>
            </svg>
            Create Ledger
          </h3>

          <!-- Name field -->
          <div class="coa-modal-fg" style="margin-bottom: 16px;">
            <label class="coa-modal-label" for="masterLedgerName" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Name *</label>
            <input class="coa-modal-inp" id="masterLedgerName" placeholder="e.g. ICICI Bank / Rent Expense / Office Supplies" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box;">
            <div id="masterLedgerNameError" style="display: none; font-size: 12px; font-weight: 600; color: #dc2626; margin-top: 5px;"></div>
          </div>

          <!-- Also Known As field -->
          <div class="coa-modal-fg" style="margin-bottom: 16px;">
            <label class="coa-modal-label" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Also Known As</label>
            <div id="masterLedgerAliasesContainer" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;"></div>
            <button type="button" id="masterLedgerAddAliasBtn" style="padding: 7px 14px; font-size: 12.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; border: 1.5px dashed var(--slate-300); border-radius: 8px; background: #f8fafc; cursor: pointer; color: var(--slate-600); transition: all 0.15s ease;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add A.K.A
            </button>
          </div>

          <!-- Group field (Groups and Group Ledgers) -->
          <div class="coa-modal-fg" style="margin-bottom: 16px;">
            <label class="coa-modal-label" for="masterLedgerGroupCombinedSel" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Group *</label>
            <select class="coa-modal-sel" id="masterLedgerGroupCombinedSel" style="display: none;">
              ${ledgerGroupOptionsHtml}
            </select>
            <div class="kya-searchable-select-wrap" id="masterLedgerGroupCombinedSelSearchableWrap" style="position: relative; width: 100%;">
              <div class="kya-searchable-select-trigger" id="masterLedgerGroupCombinedSelTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                <span id="masterLedgerGroupCombinedSelTriggerText">${firstGroupLabel}</span>
                <span style="font-size: 10px; color: var(--slate-400);">▼</span>
              </div>
              <div class="kya-searchable-select-dropdown" id="masterLedgerGroupCombinedSelDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                <input type="text" id="masterLedgerGroupCombinedSelSearch" placeholder="Search group or group ledger..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                <div id="masterLedgerGroupCombinedSelOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
              </div>
            </div>
          </div>

          <!-- Additional Information (Dynamic for Trade Receivable / Payable) -->
          <div id="masterLedgerAdditionalInfoWrap" style="display: none; background: #f8fafc; border: 1.5px solid var(--slate-200); border-radius: 10px; padding: 18px; margin-bottom: 20px; transition: all 0.2s ease;">
            
            <div style="font-size: 13.5px; font-weight: 700; color: var(--slate-800); margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 7px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>Additional Information</span>
              </div>
              <span style="font-size: 11px; font-weight: 600; background: #eff6ff; color: #1d4ed8; padding: 2px 8px; border-radius: 12px; border: 1px solid #dbeafe;">Party Profile</span>
            </div>

            <!-- 1. Address & Location Details -->
            <div style="margin-bottom: 16px;">
              <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--slate-500); margin-bottom: 8px; display: flex; align-items: center; gap: 5px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                Name & Address
              </div>
              <div style="display: flex; flex-direction: column; gap: 10px;">
                <div>
                  <input type="text" id="masterLedgerContactName" placeholder="Contact Person / Trade Name (Optional)" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                </div>
                <div>
                  <textarea id="masterLedgerAddress" placeholder="Street Address / Building / Area" rows="2" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; resize: vertical; font-family: inherit; outline: none; background: #fff;"></textarea>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <input type="text" id="masterLedgerCity" placeholder="City / Town" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                  <input type="text" id="masterLedgerPincode" placeholder="PIN / Postal Code" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <input type="text" id="masterLedgerState" placeholder="State (e.g. Maharashtra)" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                  <input type="text" id="masterLedgerCountry" placeholder="Country" value="India" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                </div>
              </div>
            </div>

            <div style="border-top: 1px dashed var(--slate-200); margin-bottom: 16px;"></div>

            <!-- 2. Bank Information -->
            <div style="margin-bottom: 16px;">
              <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--slate-500); margin-bottom: 8px; display: flex; align-items: center; gap: 5px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                  <line x1="2" y1="10" x2="22" y2="10"></line>
                </svg>
                Bank Information
              </div>
              <div style="display: flex; flex-direction: column; gap: 10px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <input type="text" id="masterLedgerBankName" placeholder="Bank Name (e.g. HDFC Bank)" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                  <input type="text" id="masterLedgerAccountNo" placeholder="Account Number" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <input type="text" id="masterLedgerIfsc" placeholder="IFSC Code (e.g. HDFC0001234)" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff; text-transform: uppercase;">
                  <input type="text" id="masterLedgerBranch" placeholder="Branch Name (Optional)" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                </div>
              </div>
            </div>

            <div style="border-top: 1px dashed var(--slate-200); margin-bottom: 16px;"></div>

            <!-- 3. Tax Details (GSTIN & PAN) -->
            <div>
              <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--slate-500); margin-bottom: 8px; display: flex; align-items: center; gap: 5px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                GSTIN & PAN
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <input type="text" id="masterLedgerGstin" placeholder="GSTIN (e.g. 27AAAAA0000A1Z5)" maxlength="15" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff; text-transform: uppercase;">
                <input type="text" id="masterLedgerPan" placeholder="PAN (e.g. AAAAA0000A)" maxlength="10" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff; text-transform: uppercase;">
              </div>
            </div>

          </div>

          <!-- Opening Balance field (Optional) -->
          <div class="coa-modal-fg" style="margin-bottom: 24px;">
            <label class="coa-modal-label" for="masterLedgerBalance" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Opening Balance (Optional)</label>
            <input class="coa-modal-inp" id="masterLedgerBalance" type="number" min="0" step="0.01" placeholder="0.00" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box;">
          </div>

          <div style="display: flex; gap: 12px; align-items: center;">
            <button class="btn btn-primary" id="masterLedgerSaveBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">＋ Create Ledger</button>
            <button class="btn btn-secondary" id="masterLedgerCancelBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Cancel</button>
          </div>
        </div>
      `;

      renderMasterLedgerAliases();

      const addAliasBtn = contentArea.querySelector('#masterLedgerAddAliasBtn');
      if (addAliasBtn) {
        addAliasBtn.addEventListener('click', () => {
          _masterLedgerAliases.push('');
          renderMasterLedgerAliases();
          const inputs = contentArea.querySelectorAll('.master-alias-input');
          if (inputs.length) {
            inputs[inputs.length - 1].focus();
          }
        });
      }

      const searchableGroupControl = initSearchableSelectHelper(contentArea, 'masterLedgerGroupCombinedSel', 'Select Group');

      // Additional Information Dynamic Visibility
      const groupSel = contentArea.querySelector('#masterLedgerGroupCombinedSel');
      const addInfoWrap = contentArea.querySelector('#masterLedgerAdditionalInfoWrap');
      const updateAdditionalInfoVisibility = () => {
        if (!groupSel || !addInfoWrap) return;
        const isParty = isTradePartyGroup(groupSel.value);
        addInfoWrap.style.display = isParty ? 'block' : 'none';
      };

      if (groupSel) {
        groupSel.addEventListener('change', updateAdditionalInfoVisibility);
        updateAdditionalInfoVisibility();
      }

      // GSTIN / PAN / IFSC Auto Uppercase & Auto-fill
      const gstinInp = contentArea.querySelector('#masterLedgerGstin');
      const panInp = contentArea.querySelector('#masterLedgerPan');
      const ifscInp = contentArea.querySelector('#masterLedgerIfsc');

      if (gstinInp) {
        gstinInp.addEventListener('input', (e) => {
          const val = e.target.value.toUpperCase();
          e.target.value = val;
          if (val.length >= 12 && panInp && !panInp.value) {
            panInp.value = val.substring(2, 12);
          }
        });
      }
      if (panInp) {
        panInp.addEventListener('input', (e) => {
          e.target.value = e.target.value.toUpperCase();
        });
      }
      if (ifscInp) {
        ifscInp.addEventListener('input', (e) => {
          e.target.value = e.target.value.toUpperCase();
        });
      }

      const saveBtn = contentArea.querySelector('#masterLedgerSaveBtn');
      const cancelBtn = contentArea.querySelector('#masterLedgerCancelBtn');
      const nameInp = contentArea.querySelector('#masterLedgerName');
      const nameErr = contentArea.querySelector('#masterLedgerNameError');

      const validateLedgerNameInputLive = () => {
        const val = nameInp ? nameInp.value.trim() : '';
        if (!val) {
          if (nameErr) { nameErr.style.display = 'none'; nameErr.textContent = ''; }
          if (nameInp) nameInp.style.borderColor = 'var(--slate-200)';
          return null;
        }

        const dup = findDuplicateCoaNameOrAlias(val);
        if (dup) {
          const typeLabel = dup.parentName ? `Alias of "${dup.parentName}"` : dup.type;
          const errorText = `"${val}" already exists (${typeLabel}).`;
          if (nameErr) {
            nameErr.textContent = errorText;
            nameErr.style.display = 'block';
          }
          if (nameInp) nameInp.style.borderColor = '#ef4444';
          return errorText;
        } else {
          if (nameErr) { nameErr.style.display = 'none'; nameErr.textContent = ''; }
          if (nameInp) nameInp.style.borderColor = 'var(--slate-200)';
          return null;
        }
      };

      if (nameInp) {
        nameInp.addEventListener('input', () => {
          validateLedgerNameInputLive();
          validateMasterLedgerAliasesLive();
        });
      }

      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const name = nameInp ? nameInp.value.trim() : '';
          if (!name) {
            if (typeof showToast === 'function') showToast('Please enter a ledger name.', 'warning');
            else alert('Please enter a ledger name.');
            if (nameInp) nameInp.focus();
            return;
          }

          const liveNameErr = validateLedgerNameInputLive();
          if (liveNameErr) {
            if (typeof showToast === 'function') showToast(liveNameErr, 'error');
            else alert(liveNameErr);
            if (nameInp) nameInp.focus();
            return;
          }

          const aliasesValid = validateMasterLedgerAliasesLive();
          if (!aliasesValid) {
            const msg = 'Please fix duplicate or invalid Also Known As entries.';
            if (typeof showToast === 'function') showToast(msg, 'error');
            else alert(msg);
            return;
          }

          const groupVal = groupSel && groupSel.value ? groupSel.value : '';
          if (!groupVal) {
            if (typeof showToast === 'function') showToast('Please select a group.', 'warning');
            else alert('Please select a group.');
            return;
          }

          const aliases = _masterLedgerAliases.map(a => a.trim()).filter(a => a !== '');

          const formNamesSet = new Set([name.toLowerCase()]);
          for (let i = 0; i < aliases.length; i++) {
            const al = aliases[i];
            const alLower = al.toLowerCase();

            if (formNamesSet.has(alLower)) {
              const msg = `Duplicate entry "${al}" found in the form. Name and A.K.A must be unique.`;
              if (typeof showToast === 'function') showToast(msg, 'error');
              else alert(msg);
              return;
            }
            formNamesSet.add(alLower);

            const dupAl = findDuplicateCoaNameOrAlias(al);
            if (dupAl) {
              const typeLabel = dupAl.parentName ? `Alias of "${dupAl.parentName}"` : dupAl.type;
              const msg = `"${al}" already exists (${typeLabel}).`;
              if (typeof showToast === 'function') showToast(msg, 'error');
              else alert(msg);
              return;
            }
          }

          const [pType, pId] = groupVal.split(':');
          let sgId = '';
          let glId = null;

          if (pType === 'sg') {
            sgId = pId;
            glId = null;
          } else if (pType === 'gl') {
            const parentGl = typeof coaLedgers !== 'undefined' ? coaLedgers.find(l => l.id === Number(pId)) : null;
            if (parentGl) {
              sgId = parentGl.sgId;
              glId = parentGl.id;
            } else {
              sgId = pId;
            }
          }

          const balInp = contentArea.querySelector('#masterLedgerBalance');
          const balVal = balInp ? balInp.value.trim() : '';
          const openingBalance = balVal ? parseFloat(balVal) || 0 : 0;

          // Additional Information fields
          const contactName = contentArea.querySelector('#masterLedgerContactName')?.value?.trim() || '';
          const address = contentArea.querySelector('#masterLedgerAddress')?.value?.trim() || '';
          const city = contentArea.querySelector('#masterLedgerCity')?.value?.trim() || '';
          const pincode = contentArea.querySelector('#masterLedgerPincode')?.value?.trim() || '';
          const state = contentArea.querySelector('#masterLedgerState')?.value?.trim() || '';
          const country = contentArea.querySelector('#masterLedgerCountry')?.value?.trim() || '';
          const bankName = contentArea.querySelector('#masterLedgerBankName')?.value?.trim() || '';
          const accountNo = contentArea.querySelector('#masterLedgerAccountNo')?.value?.trim() || '';
          const ifsc = contentArea.querySelector('#masterLedgerIfsc')?.value?.trim() || '';
          const branch = contentArea.querySelector('#masterLedgerBranch')?.value?.trim() || '';
          const gstin = contentArea.querySelector('#masterLedgerGstin')?.value?.trim() || '';
          const pan = contentArea.querySelector('#masterLedgerPan')?.value?.trim() || '';

          const newLedgerId = Date.now() + (typeof _coaLedgerCtr !== 'undefined' ? _coaLedgerCtr++ : 0);
          const newLedger = {
            id: newLedgerId,
            sgId: sgId,
            glId: glId,
            name: name,
            code: '',
            openingBalance: openingBalance,
            type: 'ledger',
            aliases: aliases,
            contactName: contactName,
            address: address,
            city: city,
            pincode: pincode,
            state: state,
            country: country,
            bankName: bankName,
            accountNo: accountNo,
            ifsc: ifsc,
            branch: branch,
            gstin: gstin,
            pan: pan
          };

          if (typeof coaLedgers !== 'undefined') {
            coaLedgers.push(newLedger);
          }

          if (typeof _coaExpanded !== 'undefined') {
            const sg = typeof COA_SYS_SGS !== 'undefined' ? COA_SYS_SGS.find(s => s.id === sgId) : null;
            if (sg) {
              _coaExpanded.add(sg.main);
              _coaExpanded.add(sg.id);
              if (sg.parent) _coaExpanded.add(sg.parent);
            }
            if (glId) _coaExpanded.add('gl-' + glId);
            _coaExpanded.add(newLedger.id);
          }

          if (typeof renderChartPanel === 'function') {
            renderChartPanel();
          }
          if (typeof refreshAllReports === 'function') {
            refreshAllReports();
          }
          if (typeof triggerAutoBackup === 'function') {
            triggerAutoBackup();
          }
          if (typeof populateSalesCustomers === 'function') {
            populateSalesCustomers();
          }
          if (typeof populatePurchaseVendors === 'function') {
            populatePurchaseVendors();
          }

          showToast(`Ledger "${name}" created successfully.`, 'success');

          _masterLedgerAliases = [];
          updateMasterDeskContent();
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          _masterLedgerAliases = [];
          updateMasterDeskContent();
        });
      }
    } else if (currentMasterDeskSubtype === 'Create' && currentMasterDeskTab === 'customers') {
      _masterCustomerAliases = [];

      contentArea.innerHTML = `
        <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--white); margin: 0 0 20px 0;">
          <h3 style="font-size: 15px; font-weight: 700; color: var(--slate-800); margin: 0 0 18px 0; display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Create Customer
          </h3>

          <!-- Name field -->
          <div class="coa-modal-fg" style="margin-bottom: 16px;">
            <label class="coa-modal-label" for="masterCustomerName" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Name *</label>
            <input class="coa-modal-inp" id="masterCustomerName" placeholder="e.g. Acme Corp / Rahul Sharma / TechNova Ltd" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box;">
            <div id="masterCustomerNameError" style="display: none; font-size: 12px; font-weight: 600; color: #dc2626; margin-top: 5px;"></div>
          </div>

          <!-- Also Known As field -->
          <div class="coa-modal-fg" style="margin-bottom: 16px;">
            <label class="coa-modal-label" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Also Known As</label>
            <div id="masterCustomerAliasesContainer" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;"></div>
            <button type="button" id="masterCustomerAddAliasBtn" style="padding: 7px 14px; font-size: 12.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; border: 1.5px dashed var(--slate-300); border-radius: 8px; background: #f8fafc; cursor: pointer; color: var(--slate-600); transition: all 0.15s ease;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add A.K.A
            </button>
          </div>

          <!-- Additional Information (Party Profile) -->
          <div id="masterCustomerAdditionalInfoWrap" style="background: #f8fafc; border: 1.5px solid var(--slate-200); border-radius: 10px; padding: 18px; margin-bottom: 20px;">
            <div style="font-size: 13.5px; font-weight: 700; color: var(--slate-800); margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 7px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>Additional Information</span>
              </div>
              <span style="font-size: 11px; font-weight: 600; background: #eff6ff; color: #1d4ed8; padding: 2px 8px; border-radius: 12px; border: 1px solid #dbeafe;">Trade Receivables</span>
            </div>

            <!-- 1. Address & Location Details -->
            <div style="margin-bottom: 16px;">
              <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--slate-500); margin-bottom: 8px; display: flex; align-items: center; gap: 5px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                Name & Address
              </div>
              <div style="display: flex; flex-direction: column; gap: 10px;">
                <div>
                  <input type="text" id="masterCustomerContactName" placeholder="Contact Person / Trade Name (Optional)" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                </div>
                <div>
                  <textarea id="masterCustomerAddress" placeholder="Street Address / Building / Area" rows="2" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; resize: vertical; font-family: inherit; outline: none; background: #fff;"></textarea>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <input type="text" id="masterCustomerCity" placeholder="City / Town" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                  <input type="text" id="masterCustomerPincode" placeholder="PIN / Postal Code" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <input type="text" id="masterCustomerState" placeholder="State (e.g. Maharashtra)" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                  <input type="text" id="masterCustomerCountry" placeholder="Country" value="India" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                </div>
              </div>
            </div>

            <div style="border-top: 1px dashed var(--slate-200); margin-bottom: 16px;"></div>

            <!-- 2. Bank Information -->
            <div style="margin-bottom: 16px;">
              <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--slate-500); margin-bottom: 8px; display: flex; align-items: center; gap: 5px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                  <line x1="2" y1="10" x2="22" y2="10"></line>
                </svg>
                Bank Information
              </div>
              <div style="display: flex; flex-direction: column; gap: 10px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <input type="text" id="masterCustomerBankName" placeholder="Bank Name (e.g. HDFC Bank)" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                  <input type="text" id="masterCustomerAccountNo" placeholder="Account Number" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <input type="text" id="masterCustomerIfsc" placeholder="IFSC Code (e.g. HDFC0001234)" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff; text-transform: uppercase;">
                  <input type="text" id="masterCustomerBranch" placeholder="Branch Name (Optional)" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                </div>
              </div>
            </div>

            <div style="border-top: 1px dashed var(--slate-200); margin-bottom: 16px;"></div>

            <!-- 3. Tax Details (GSTIN & PAN) -->
            <div>
              <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--slate-500); margin-bottom: 8px; display: flex; align-items: center; gap: 5px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                GSTIN & PAN
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <input type="text" id="masterCustomerGstin" placeholder="GSTIN (e.g. 27AAAAA0000A1Z5)" maxlength="15" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff; text-transform: uppercase;">
                <input type="text" id="masterCustomerPan" placeholder="PAN (e.g. AAAAA0000A)" maxlength="10" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff; text-transform: uppercase;">
              </div>
            </div>

          </div>

          <!-- Opening Balance field (Optional) -->
          <div class="coa-modal-fg" style="margin-bottom: 24px;">
            <label class="coa-modal-label" for="masterCustomerBalance" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Opening Balance (Optional)</label>
            <input class="coa-modal-inp" id="masterCustomerBalance" type="number" min="0" step="0.01" placeholder="0.00" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box;">
          </div>

          <div style="display: flex; gap: 12px; align-items: center;">
            <button class="btn btn-primary" id="masterCustomerSaveBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">＋ Create Customer</button>
            <button class="btn btn-secondary" id="masterCustomerCancelBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Cancel</button>
          </div>
        </div>
      `;

      renderMasterCustomerAliases();

      const addAliasBtn = contentArea.querySelector('#masterCustomerAddAliasBtn');
      if (addAliasBtn) {
        addAliasBtn.addEventListener('click', () => {
          _masterCustomerAliases.push('');
          renderMasterCustomerAliases();
          const inputs = contentArea.querySelectorAll('.master-alias-input');
          if (inputs.length) {
            inputs[inputs.length - 1].focus();
          }
        });
      }

      // GSTIN / PAN / IFSC Auto Uppercase & Auto-fill
      const gstinInp = contentArea.querySelector('#masterCustomerGstin');
      const panInp = contentArea.querySelector('#masterCustomerPan');
      const ifscInp = contentArea.querySelector('#masterCustomerIfsc');

      if (gstinInp) {
        gstinInp.addEventListener('input', (e) => {
          const val = e.target.value.toUpperCase();
          e.target.value = val;
          if (val.length >= 12 && panInp && !panInp.value) {
            panInp.value = val.substring(2, 12);
          }
        });
      }
      if (panInp) {
        panInp.addEventListener('input', (e) => {
          e.target.value = e.target.value.toUpperCase();
        });
      }
      if (ifscInp) {
        ifscInp.addEventListener('input', (e) => {
          e.target.value = e.target.value.toUpperCase();
        });
      }

      const saveBtn = contentArea.querySelector('#masterCustomerSaveBtn');
      const cancelBtn = contentArea.querySelector('#masterCustomerCancelBtn');
      const nameInp = contentArea.querySelector('#masterCustomerName');
      const nameErr = contentArea.querySelector('#masterCustomerNameError');

      const validateCustomerNameInputLive = () => {
        const val = nameInp ? nameInp.value.trim() : '';
        if (!val) {
          if (nameErr) { nameErr.style.display = 'none'; nameErr.textContent = ''; }
          if (nameInp) nameInp.style.borderColor = 'var(--slate-200)';
          return null;
        }

        const dup = findDuplicateCoaNameOrAlias(val);
        if (dup) {
          const typeLabel = dup.parentName ? `Alias of "${dup.parentName}"` : dup.type;
          const errorText = `"${val}" already exists (${typeLabel}).`;
          if (nameErr) {
            nameErr.textContent = errorText;
            nameErr.style.display = 'block';
          }
          if (nameInp) nameInp.style.borderColor = '#ef4444';
          return errorText;
        } else {
          if (nameErr) { nameErr.style.display = 'none'; nameErr.textContent = ''; }
          if (nameInp) nameInp.style.borderColor = 'var(--slate-200)';
          return null;
        }
      };

      if (nameInp) {
        nameInp.addEventListener('input', () => {
          validateCustomerNameInputLive();
          validateMasterCustomerAliasesLive();
        });
      }

      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const name = nameInp ? nameInp.value.trim() : '';
          if (!name) {
            if (typeof showToast === 'function') showToast('Please enter a customer name.', 'warning');
            else alert('Please enter a customer name.');
            if (nameInp) nameInp.focus();
            return;
          }

          const liveNameErr = validateCustomerNameInputLive();
          if (liveNameErr) {
            if (typeof showToast === 'function') showToast(liveNameErr, 'error');
            else alert(liveNameErr);
            if (nameInp) nameInp.focus();
            return;
          }

          const aliasesValid = validateMasterCustomerAliasesLive();
          if (!aliasesValid) {
            const msg = 'Please fix duplicate or invalid Also Known As entries.';
            if (typeof showToast === 'function') showToast(msg, 'error');
            else alert(msg);
            return;
          }

          const aliases = _masterCustomerAliases.map(a => a.trim()).filter(a => a !== '');

          const formNamesSet = new Set([name.toLowerCase()]);
          for (let i = 0; i < aliases.length; i++) {
            const al = aliases[i];
            const alLower = al.toLowerCase();

            if (formNamesSet.has(alLower)) {
              const msg = `Duplicate entry "${al}" found in the form. Name and A.K.A must be unique.`;
              if (typeof showToast === 'function') showToast(msg, 'error');
              else alert(msg);
              return;
            }
            formNamesSet.add(alLower);

            const dupAl = findDuplicateCoaNameOrAlias(al);
            if (dupAl) {
              const typeLabel = dupAl.parentName ? `Alias of "${dupAl.parentName}"` : dupAl.type;
              const msg = `"${al}" already exists (${typeLabel}).`;
              if (typeof showToast === 'function') showToast(msg, 'error');
              else alert(msg);
              return;
            }
          }

          const balInp = contentArea.querySelector('#masterCustomerBalance');
          const balVal = balInp ? balInp.value.trim() : '';
          const openingBalance = balVal ? parseFloat(balVal) || 0 : 0;

          // Additional Information fields
          const contactName = contentArea.querySelector('#masterCustomerContactName')?.value?.trim() || '';
          const address = contentArea.querySelector('#masterCustomerAddress')?.value?.trim() || '';
          const city = contentArea.querySelector('#masterCustomerCity')?.value?.trim() || '';
          const pincode = contentArea.querySelector('#masterCustomerPincode')?.value?.trim() || '';
          const state = contentArea.querySelector('#masterCustomerState')?.value?.trim() || '';
          const country = contentArea.querySelector('#masterCustomerCountry')?.value?.trim() || '';
          const bankName = contentArea.querySelector('#masterCustomerBankName')?.value?.trim() || '';
          const accountNo = contentArea.querySelector('#masterCustomerAccountNo')?.value?.trim() || '';
          const ifsc = contentArea.querySelector('#masterCustomerIfsc')?.value?.trim() || '';
          const branch = contentArea.querySelector('#masterCustomerBranch')?.value?.trim() || '';
          const gstin = contentArea.querySelector('#masterCustomerGstin')?.value?.trim() || '';
          const pan = contentArea.querySelector('#masterCustomerPan')?.value?.trim() || '';

          // Save into Customer Directory (does NOT create separate CoA ledger)
          const customers = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
          const newCustomer = {
            id: 'cust-' + Date.now(),
            name: name,
            aliases: aliases,
            openingBalance: openingBalance,
            contactName: contactName,
            address: address,
            city: city,
            pincode: pincode,
            state: state,
            country: country,
            bankName: bankName,
            accountNo: accountNo,
            ifsc: ifsc,
            branch: branch,
            gstin: gstin,
            pan: pan,
            createdAt: Date.now()
          };

          customers.push(newCustomer);

          // Ensure central Trade Receivables ledger exists in CoA and update combined balance
          if (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) {
            let trLedger = coaLedgers.find(l => l.type === 'ledger' && l.sgId === 'sg-tr' && l.name === 'Trade Receivables');
            if (!trLedger) {
              trLedger = { id: 104, name: 'Trade Receivables', sgId: 'sg-tr', type: 'ledger', openingBalance: 0 };
              coaLedgers.push(trLedger);
            }
            const totalCustOp = customers.reduce((sum, c) => sum + (parseFloat(c.openingBalance) || 0), 0);
            trLedger.openingBalance = totalCustOp;
          }

          if (typeof _coaExpanded !== 'undefined') {
            _coaExpanded.add('assets');
            _coaExpanded.add('sg-tr');
          }

          if (typeof renderChartPanel === 'function') renderChartPanel();
          if (typeof refreshAllReports === 'function') refreshAllReports();
          if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
          if (typeof populateSalesCustomers === 'function') populateSalesCustomers();

          showToast(`Customer "${name}" created successfully (linked to Trade Receivables).`, 'success');

          _masterCustomerAliases = [];
          updateMasterDeskContent();
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          _masterCustomerAliases = [];
          updateMasterDeskContent();
        });
      }
    } else if (currentMasterDeskSubtype === 'Create' && currentMasterDeskTab === 'suppliers') {
      _masterSupplierAliases = [];

      contentArea.innerHTML = `
        <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--white); margin: 0 0 20px 0;">
          <h3 style="font-size: 15px; font-weight: 700; color: var(--slate-800); margin: 0 0 18px 0; display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="1" y="3" width="15" height="13"></rect>
              <polygon points="16 8 20 8 23 11 23 16 16 8"></polygon>
              <circle cx="5.5" cy="18.5" r="2.5"></circle>
              <circle cx="18.5" cy="18.5" r="2.5"></circle>
            </svg>
            Create Supplier / Vendor
          </h3>

          <!-- Name field -->
          <div class="coa-modal-fg" style="margin-bottom: 16px;">
            <label class="coa-modal-label" for="masterSupplierName" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Name *</label>
            <input class="coa-modal-inp" id="masterSupplierName" placeholder="e.g. Apex Industries / Global Supplies Ltd" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box;">
            <div id="masterSupplierNameError" style="display: none; font-size: 12px; font-weight: 600; color: #dc2626; margin-top: 5px;"></div>
          </div>

          <!-- Also Known As field -->
          <div class="coa-modal-fg" style="margin-bottom: 16px;">
            <label class="coa-modal-label" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Also Known As</label>
            <div id="masterSupplierAliasesContainer" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;"></div>
            <button type="button" id="masterSupplierAddAliasBtn" style="padding: 7px 14px; font-size: 12.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; border: 1.5px dashed var(--slate-300); border-radius: 8px; background: #f8fafc; cursor: pointer; color: var(--slate-600); transition: all 0.15s ease;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add A.K.A
            </button>
          </div>

          <!-- Additional Information (Party Profile) -->
          <div id="masterSupplierAdditionalInfoWrap" style="background: #f8fafc; border: 1.5px solid var(--slate-200); border-radius: 10px; padding: 18px; margin-bottom: 20px;">
            <div style="font-size: 13.5px; font-weight: 700; color: var(--slate-800); margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 7px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>Additional Information</span>
              </div>
              <span style="font-size: 11px; font-weight: 600; background: #f0fdf4; color: #15803d; padding: 2px 8px; border-radius: 12px; border: 1px solid #bbf7d0;">Trade Payables</span>
            </div>

            <!-- 1. Address & Location Details -->
            <div style="margin-bottom: 16px;">
              <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--slate-500); margin-bottom: 8px; display: flex; align-items: center; gap: 5px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                Name & Address
              </div>
              <div style="display: flex; flex-direction: column; gap: 10px;">
                <div>
                  <input type="text" id="masterSupplierContactName" placeholder="Contact Person / Trade Name (Optional)" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                </div>
                <div>
                  <textarea id="masterSupplierAddress" placeholder="Street Address / Building / Area" rows="2" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; resize: vertical; font-family: inherit; outline: none; background: #fff;"></textarea>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <input type="text" id="masterSupplierCity" placeholder="City / Town" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                  <input type="text" id="masterSupplierPincode" placeholder="PIN / Postal Code" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <input type="text" id="masterSupplierState" placeholder="State (e.g. Maharashtra)" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                  <input type="text" id="masterSupplierCountry" placeholder="Country" value="India" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                </div>
              </div>
            </div>

            <div style="border-top: 1px dashed var(--slate-200); margin-bottom: 16px;"></div>

            <!-- 2. Bank Information -->
            <div style="margin-bottom: 16px;">
              <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--slate-500); margin-bottom: 8px; display: flex; align-items: center; gap: 5px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                  <line x1="2" y1="10" x2="22" y2="10"></line>
                </svg>
                Bank Information
              </div>
              <div style="display: flex; flex-direction: column; gap: 10px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <input type="text" id="masterSupplierBankName" placeholder="Bank Name (e.g. ICICI Bank)" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                  <input type="text" id="masterSupplierAccountNo" placeholder="Account Number" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <input type="text" id="masterSupplierIfsc" placeholder="IFSC Code (e.g. ICIC0001234)" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff; text-transform: uppercase;">
                  <input type="text" id="masterSupplierBranch" placeholder="Branch Name (Optional)" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                </div>
              </div>
            </div>

            <div style="border-top: 1px dashed var(--slate-200); margin-bottom: 16px;"></div>

            <!-- 3. Tax Details (GSTIN & PAN) -->
            <div>
              <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--slate-500); margin-bottom: 8px; display: flex; align-items: center; gap: 5px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                GSTIN & PAN
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <input type="text" id="masterSupplierGstin" placeholder="GSTIN (e.g. 27AAAAA0000A1Z5)" maxlength="15" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff; text-transform: uppercase;">
                <input type="text" id="masterSupplierPan" placeholder="PAN (e.g. AAAAA0000A)" maxlength="10" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff; text-transform: uppercase;">
              </div>
            </div>

          </div>

          <!-- Opening Balance field (Optional) -->
          <div class="coa-modal-fg" style="margin-bottom: 24px;">
            <label class="coa-modal-label" for="masterSupplierBalance" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Opening Balance (Optional)</label>
            <input class="coa-modal-inp" id="masterSupplierBalance" type="number" min="0" step="0.01" placeholder="0.00" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box;">
          </div>

          <div style="display: flex; gap: 12px; align-items: center;">
            <button class="btn btn-primary" id="masterSupplierSaveBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">＋ Create Supplier</button>
            <button class="btn btn-secondary" id="masterSupplierCancelBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Cancel</button>
          </div>
        </div>
      `;

      renderMasterSupplierAliases();

      const addAliasBtn = contentArea.querySelector('#masterSupplierAddAliasBtn');
      if (addAliasBtn) {
        addAliasBtn.addEventListener('click', () => {
          _masterSupplierAliases.push('');
          renderMasterSupplierAliases();
          const inputs = contentArea.querySelectorAll('.master-alias-input');
          if (inputs.length) {
            inputs[inputs.length - 1].focus();
          }
        });
      }

      // GSTIN / PAN / IFSC Auto Uppercase & Auto-fill
      const gstinInp = contentArea.querySelector('#masterSupplierGstin');
      const panInp = contentArea.querySelector('#masterSupplierPan');
      const ifscInp = contentArea.querySelector('#masterSupplierIfsc');

      if (gstinInp) {
        gstinInp.addEventListener('input', (e) => {
          const val = e.target.value.toUpperCase();
          e.target.value = val;
          if (val.length >= 12 && panInp && !panInp.value) {
            panInp.value = val.substring(2, 12);
          }
        });
      }
      if (panInp) {
        panInp.addEventListener('input', (e) => {
          e.target.value = e.target.value.toUpperCase();
        });
      }
      if (ifscInp) {
        ifscInp.addEventListener('input', (e) => {
          e.target.value = e.target.value.toUpperCase();
        });
      }

      const saveBtn = contentArea.querySelector('#masterSupplierSaveBtn');
      const cancelBtn = contentArea.querySelector('#masterSupplierCancelBtn');
      const nameInp = contentArea.querySelector('#masterSupplierName');
      const nameErr = contentArea.querySelector('#masterSupplierNameError');

      const validateSupplierNameInputLive = () => {
        const val = nameInp ? nameInp.value.trim() : '';
        if (!val) {
          if (nameErr) { nameErr.style.display = 'none'; nameErr.textContent = ''; }
          if (nameInp) nameInp.style.borderColor = 'var(--slate-200)';
          return null;
        }

        const dup = findDuplicateCoaNameOrAlias(val);
        if (dup) {
          const typeLabel = dup.parentName ? `Alias of "${dup.parentName}"` : dup.type;
          const errorText = `"${val}" already exists (${typeLabel}).`;
          if (nameErr) {
            nameErr.textContent = errorText;
            nameErr.style.display = 'block';
          }
          if (nameInp) nameInp.style.borderColor = '#ef4444';
          return errorText;
        } else {
          if (nameErr) { nameErr.style.display = 'none'; nameErr.textContent = ''; }
          if (nameInp) nameInp.style.borderColor = 'var(--slate-200)';
          return null;
        }
      };

      if (nameInp) {
        nameInp.addEventListener('input', () => {
          validateSupplierNameInputLive();
          validateMasterSupplierAliasesLive();
        });
      }

      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const name = nameInp ? nameInp.value.trim() : '';
          if (!name) {
            if (typeof showToast === 'function') showToast('Please enter a supplier name.', 'warning');
            else alert('Please enter a supplier name.');
            if (nameInp) nameInp.focus();
            return;
          }

          const liveNameErr = validateSupplierNameInputLive();
          if (liveNameErr) {
            if (typeof showToast === 'function') showToast(liveNameErr, 'error');
            else alert(liveNameErr);
            if (nameInp) nameInp.focus();
            return;
          }

          const aliasesValid = validateMasterSupplierAliasesLive();
          if (!aliasesValid) {
            const msg = 'Please fix duplicate or invalid Also Known As entries.';
            if (typeof showToast === 'function') showToast(msg, 'error');
            else alert(msg);
            return;
          }

          const aliases = _masterSupplierAliases.map(a => a.trim()).filter(a => a !== '');

          const formNamesSet = new Set([name.toLowerCase()]);
          for (let i = 0; i < aliases.length; i++) {
            const al = aliases[i];
            const alLower = al.toLowerCase();

            if (formNamesSet.has(alLower)) {
              const msg = `Duplicate entry "${al}" found in the form. Name and A.K.A must be unique.`;
              if (typeof showToast === 'function') showToast(msg, 'error');
              else alert(msg);
              return;
            }
            formNamesSet.add(alLower);

            const dupAl = findDuplicateCoaNameOrAlias(al);
            if (dupAl) {
              const typeLabel = dupAl.parentName ? `Alias of "${dupAl.parentName}"` : dupAl.type;
              const msg = `"${al}" already exists (${typeLabel}).`;
              if (typeof showToast === 'function') showToast(msg, 'error');
              else alert(msg);
              return;
            }
          }

          const balInp = contentArea.querySelector('#masterSupplierBalance');
          const balVal = balInp ? balInp.value.trim() : '';
          const openingBalance = balVal ? parseFloat(balVal) || 0 : 0;

          // Additional Information fields
          const contactName = contentArea.querySelector('#masterSupplierContactName')?.value?.trim() || '';
          const address = contentArea.querySelector('#masterSupplierAddress')?.value?.trim() || '';
          const city = contentArea.querySelector('#masterSupplierCity')?.value?.trim() || '';
          const pincode = contentArea.querySelector('#masterSupplierPincode')?.value?.trim() || '';
          const state = contentArea.querySelector('#masterSupplierState')?.value?.trim() || '';
          const country = contentArea.querySelector('#masterSupplierCountry')?.value?.trim() || '';
          const bankName = contentArea.querySelector('#masterSupplierBankName')?.value?.trim() || '';
          const accountNo = contentArea.querySelector('#masterSupplierAccountNo')?.value?.trim() || '';
          const ifsc = contentArea.querySelector('#masterSupplierIfsc')?.value?.trim() || '';
          const branch = contentArea.querySelector('#masterSupplierBranch')?.value?.trim() || '';
          const gstin = contentArea.querySelector('#masterSupplierGstin')?.value?.trim() || '';
          const pan = contentArea.querySelector('#masterSupplierPan')?.value?.trim() || '';

          // Save into Supplier Directory (does NOT create separate CoA ledger)
          const suppliers = typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : [];
          const newSupplier = {
            id: 'supp-' + Date.now(),
            name: name,
            aliases: aliases,
            openingBalance: openingBalance,
            contactName: contactName,
            address: address,
            city: city,
            pincode: pincode,
            state: state,
            country: country,
            bankName: bankName,
            accountNo: accountNo,
            ifsc: ifsc,
            branch: branch,
            gstin: gstin,
            pan: pan,
            createdAt: Date.now()
          };

          suppliers.push(newSupplier);

          // Ensure central Trade Payables ledger exists in CoA and update combined balance
          if (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) {
            let tpLedger = coaLedgers.find(l => l.type === 'ledger' && l.sgId === 'sg-tp' && l.name === 'Trade Payables');
            if (!tpLedger) {
              tpLedger = { id: 125, name: 'Trade Payables', sgId: 'sg-tp', type: 'ledger', openingBalance: 0 };
              coaLedgers.push(tpLedger);
            }
            const totalSuppOp = suppliers.reduce((sum, s) => sum + (parseFloat(s.openingBalance) || 0), 0);
            tpLedger.openingBalance = totalSuppOp;
          }

          if (typeof _coaExpanded !== 'undefined') {
            _coaExpanded.add('equity-liabilities');
            _coaExpanded.add('sg-tp');
          }

          if (typeof renderChartPanel === 'function') renderChartPanel();
          if (typeof refreshAllReports === 'function') refreshAllReports();
          if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
          if (typeof populatePurchaseVendors === 'function') populatePurchaseVendors();

          showToast(`Supplier "${name}" created successfully (linked to Trade Payables).`, 'success');

          _masterSupplierAliases = [];
          updateMasterDeskContent();
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          _masterSupplierAliases = [];
          updateMasterDeskContent();
        });
      }
    } else if (currentMasterDeskSubtype === 'Alter') {
      // ══════════════════════════════════════════════════════════════════
      //  ALTER MODE: Groups, Ledgers, Customers, and Suppliers
      // ══════════════════════════════════════════════════════════════════
      if (currentMasterDeskTab === 'customers') {
        const customers = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
        contentArea.innerHTML = `
          <div style="background: var(--white); border: 1px solid var(--slate-200); border-radius: 12px; padding: 20px; box-shadow: var(--shadow-sm);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div>
                <h3 style="font-size: 15px; font-weight: 700; color: var(--slate-800); margin: 0 0 2px 0;">Alter Customers (${customers.length})</h3>
                <div style="font-size: 12px; color: var(--slate-500);">Connected under Trade Receivables (Current Assets)</div>
              </div>
              <input type="text" id="alterCustomerSearch" placeholder="Search customers..." style="padding: 6px 12px; font-size: 12.5px; border-radius: 7px; border: 1.5px solid var(--slate-200); outline: none; width: 220px;">
            </div>

            <div id="alterCustomerListWrap" style="display: flex; flex-direction: column; gap: 8px;"></div>
          </div>
        `;

        const listWrap = contentArea.querySelector('#alterCustomerListWrap');
        const searchInp = contentArea.querySelector('#alterCustomerSearch');

        const renderCustomerList = (filter = '') => {
          listWrap.innerHTML = '';
          const q = filter.toLowerCase().trim();
          const filtered = customers.filter(c => {
            const aliasStr = Array.isArray(c.aliases) ? c.aliases.join(' ') : '';
            return !q || `${c.name} ${aliasStr} ${c.gstin || ''} ${c.city || ''}`.toLowerCase().includes(q);
          });

          if (filtered.length === 0) {
            listWrap.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--slate-400); font-size: 13px;">No customers found.</div>`;
            return;
          }

          filtered.forEach(c => {
            const row = document.createElement('div');
            row.style.cssText = `
              display: flex; justify-content: space-between; align-items: center; padding: 12px 16px;
              background: #f8fafc; border: 1.5px solid var(--slate-200); border-radius: 8px;
            `;
            const bal = parseFloat(c.openingBalance) || 0;
            const balStr = typeof fmtNum === 'function' ? fmtNum(bal) : bal.toFixed(2);
            const aliasStr = Array.isArray(c.aliases) && c.aliases.length > 0 ? `<span style="color: var(--blue-600); font-size: 11.5px; margin-left: 6px;">[A.K.A: ${c.aliases.join(', ')}]</span>` : '';

            row.innerHTML = `
              <div>
                <div style="font-weight: 700; font-size: 13.5px; color: var(--slate-800);">${c.name} ${aliasStr}</div>
                <div style="font-size: 11.5px; color: var(--slate-500); margin-top: 3px;">
                  ${c.contactName ? `<span>Attn: ${c.contactName}</span> &bull; ` : ''}
                  ${c.city ? `<span>${c.city}, ${c.state || ''}</span> &bull; ` : ''}
                  ${c.gstin ? `<span style="font-family: monospace; color: #047857; background: #ecfdf5; padding: 1px 4px; border-radius: 3px;">${c.gstin}</span>` : ''}
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 14px;">
                <div style="text-align: right; font-size: 12.5px;">
                  <div style="color: var(--slate-400); font-size: 10.5px; font-weight: 600; text-transform: uppercase;">Balance</div>
                  <div style="font-weight: 700; color: var(--slate-800);">₹ ${balStr}</div>
                </div>
                <button class="btn btn-secondary btn-del-cust" style="height: 30px; padding: 4px 10px; font-size: 12px; color: #dc2626; border-color: #fecaca; background: #fef2f2;">Delete</button>
              </div>
            `;

            row.querySelector('.btn-del-cust').addEventListener('click', () => {
              if (confirm(`Are you sure you want to delete customer "${c.name}"?`)) {
                const idx = customers.findIndex(item => item.id === c.id);
                if (idx >= 0) {
                  customers.splice(idx, 1);
                  if (typeof coaLedgers !== 'undefined') {
                    const tr = coaLedgers.find(l => l.type === 'ledger' && l.sgId === 'sg-tr' && l.name === 'Trade Receivables');
                    if (tr) tr.openingBalance = customers.reduce((sum, item) => sum + (parseFloat(item.openingBalance) || 0), 0);
                  }
                  if (typeof populateSalesCustomers === 'function') populateSalesCustomers();
                  if (typeof refreshAllReports === 'function') refreshAllReports();
                  if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
                  showToast(`Customer "${c.name}" deleted.`, 'info');
                  renderCustomerList(searchInp ? searchInp.value : '');
                }
              }
            });

            listWrap.appendChild(row);
          });
        };

        renderCustomerList('');
        if (searchInp) searchInp.addEventListener('input', e => renderCustomerList(e.target.value));

      } else if (currentMasterDeskTab === 'suppliers') {
        const suppliers = typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : [];
        contentArea.innerHTML = `
          <div style="background: var(--white); border: 1px solid var(--slate-200); border-radius: 12px; padding: 20px; box-shadow: var(--shadow-sm);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div>
                <h3 style="font-size: 15px; font-weight: 700; color: var(--slate-800); margin: 0 0 2px 0;">Alter Suppliers (${suppliers.length})</h3>
                <div style="font-size: 12px; color: var(--slate-500);">Connected under Trade Payables (Current Liabilities)</div>
              </div>
              <input type="text" id="alterSupplierSearch" placeholder="Search suppliers..." style="padding: 6px 12px; font-size: 12.5px; border-radius: 7px; border: 1.5px solid var(--slate-200); outline: none; width: 220px;">
            </div>

            <div id="alterSupplierListWrap" style="display: flex; flex-direction: column; gap: 8px;"></div>
          </div>
        `;

        const listWrap = contentArea.querySelector('#alterSupplierListWrap');
        const searchInp = contentArea.querySelector('#alterSupplierSearch');

        const renderSupplierList = (filter = '') => {
          listWrap.innerHTML = '';
          const q = filter.toLowerCase().trim();
          const filtered = suppliers.filter(s => {
            const aliasStr = Array.isArray(s.aliases) ? s.aliases.join(' ') : '';
            return !q || `${s.name} ${aliasStr} ${s.gstin || ''} ${s.city || ''}`.toLowerCase().includes(q);
          });

          if (filtered.length === 0) {
            listWrap.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--slate-400); font-size: 13px;">No suppliers found.</div>`;
            return;
          }

          filtered.forEach(s => {
            const row = document.createElement('div');
            row.style.cssText = `
              display: flex; justify-content: space-between; align-items: center; padding: 12px 16px;
              background: #f8fafc; border: 1.5px solid var(--slate-200); border-radius: 8px;
            `;
            const bal = parseFloat(s.openingBalance) || 0;
            const balStr = typeof fmtNum === 'function' ? fmtNum(bal) : bal.toFixed(2);
            const aliasStr = Array.isArray(s.aliases) && s.aliases.length > 0 ? `<span style="color: var(--blue-600); font-size: 11.5px; margin-left: 6px;">[A.K.A: ${s.aliases.join(', ')}]</span>` : '';

            row.innerHTML = `
              <div>
                <div style="font-weight: 700; font-size: 13.5px; color: var(--slate-800);">${s.name} ${aliasStr}</div>
                <div style="font-size: 11.5px; color: var(--slate-500); margin-top: 3px;">
                  ${s.contactName ? `<span>Attn: ${s.contactName}</span> &bull; ` : ''}
                  ${s.city ? `<span>${s.city}, ${s.state || ''}</span> &bull; ` : ''}
                  ${s.gstin ? `<span style="font-family: monospace; color: #047857; background: #ecfdf5; padding: 1px 4px; border-radius: 3px;">${s.gstin}</span>` : ''}
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 14px;">
                <div style="text-align: right; font-size: 12.5px;">
                  <div style="color: var(--slate-400); font-size: 10.5px; font-weight: 600; text-transform: uppercase;">Balance</div>
                  <div style="font-weight: 700; color: var(--slate-800);">₹ ${balStr}</div>
                </div>
                <button class="btn btn-secondary btn-del-supp" style="height: 30px; padding: 4px 10px; font-size: 12px; color: #dc2626; border-color: #fecaca; background: #fef2f2;">Delete</button>
              </div>
            `;

            row.querySelector('.btn-del-supp').addEventListener('click', () => {
              if (confirm(`Are you sure you want to delete supplier "${s.name}"?`)) {
                const idx = suppliers.findIndex(item => item.id === s.id);
                if (idx >= 0) {
                  suppliers.splice(idx, 1);
                  if (typeof coaLedgers !== 'undefined') {
                    const tp = coaLedgers.find(l => l.type === 'ledger' && l.sgId === 'sg-tp' && l.name === 'Trade Payables');
                    if (tp) tp.openingBalance = suppliers.reduce((sum, item) => sum + (parseFloat(item.openingBalance) || 0), 0);
                  }
                  if (typeof populatePurchaseVendors === 'function') populatePurchaseVendors();
                  if (typeof refreshAllReports === 'function') refreshAllReports();
                  if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
                  showToast(`Supplier "${s.name}" deleted.`, 'info');
                  renderSupplierList(searchInp ? searchInp.value : '');
                }
              }
            });

            listWrap.appendChild(row);
          });
        };

        renderSupplierList('');
        if (searchInp) searchInp.addEventListener('input', e => renderSupplierList(e.target.value));

      } else {
        let tabName = currentMasterDeskTab === 'ledger' ? 'Ledger' : 'Group';
        contentArea.innerHTML = `
          <div style="text-align: center; padding: 64px 20px; color: var(--slate-400);">
            <div style="width: 56px; height: 56px; border-radius: 16px; background: var(--slate-100); border: 1.5px solid var(--slate-200); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: var(--slate-600);">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
            </div>
            <div id="masterDeskModeTitle" style="font-size: 16px; font-weight: 700; color: var(--slate-700); margin-bottom: 6px;">Master Desk Workspace — ${tabName} (${currentMasterDeskSubtype})</div>
            <div id="masterDeskModeDesc" style="font-size: 13px; color: var(--slate-400); max-width: 380px; margin: 0 auto; line-height: 1.5;">Central master workspace is ready for ${currentMasterDeskSubtype.toLowerCase()}ing ${tabName.toLowerCase()} entries.</div>
          </div>
        `;
      }
    }
  }

  function initMasterDesk(container) {
    ensureCleanCoaTradeParties();
    if (!container) container = document.getElementById('panel-master-desk');
    if (!container) return;

    container.innerHTML = `
      <!-- Page header -->
      <div class="panel-header" style="border-bottom: 1.5px solid var(--slate-100); padding-bottom: 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: flex-start; gap: 12px; width: 100%;">
        <style>
          .btn-master-action {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            font-size: 13px;
            font-weight: 600;
            color: var(--slate-600);
            background: var(--white);
            border: 1.5px solid var(--slate-200);
            border-radius: 8px;
            cursor: pointer;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            transition: all 0.2s ease;
          }
          .btn-master-action:hover {
            background: var(--slate-50) !important;
            color: var(--slate-800) !important;
            border-color: var(--slate-300) !important;
          }
        </style>
        <div class="panel-actions" style="display: flex; gap: 8px; align-items: center;">
          <button class="btn btn-primary" id="btnMasterCreate" type="button" aria-label="Create Master" style="display: flex; align-items: center; gap: 6px; height: 38px; font-weight: 600; font-size: 13px; padding: 8px 14px; border-radius: 8px; cursor: pointer;">
            <svg viewBox="0 0 16 16" fill="none" style="width: 14px; height: 14px;">
              <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
            Create
          </button>
          <button class="btn-master-action" id="btnMasterAlter" type="button" aria-label="Alter Master" style="display: flex; align-items: center; gap: 6px; height: 38px; font-weight: 600; font-size: 13px; padding: 8px 14px; border-radius: 8px; cursor: pointer;">
            <svg viewBox="0 0 16 16" fill="none" style="width: 14px; height: 14px;">
              <path d="M11 2H4a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 4 15h8a1.5 1.5 0 0 0 1.5-1.5V5L11 2z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M11 2v3h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M8.5 7.5l-3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
            Alter
          </button>
        </div>
      </div>

      <div class="table-card" style="padding: 24px 28px;">
        <!-- Colored header strip -->
        <div class="je-card-header" style="background: linear-gradient(90deg, var(--blue-700), var(--blue-500)); border-top-left-radius: 12px; border-top-right-radius: 12px; margin: -24px -28px 20px -28px; padding: 18px 28px; display: flex; align-items: center; justify-content: space-between;">
          <div class="je-card-header-left" style="display: flex; align-items: center; gap: 12px;">
            <div class="je-card-icon-wrap" style="background: rgba(255, 255, 255, 0.15); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px; color: var(--white);">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
            </div>
            <div>
              <div class="je-card-title-text" style="color: var(--white); font-weight: 700; font-size: 16px; margin: 0;">Master Desk</div>
              <div class="je-card-subtitle-text" style="color: rgba(255, 255, 255, 0.8); font-size: 12px; margin: 2px 0 0 0;">Central master control and enterprise workspace</div>
            </div>
          </div>
        </div>

        <div class="oh-layout">
          <!-- Sub-tabs (Left side options cards) -->
          <div class="oh-sub-tabs" role="tablist" aria-label="Master Desk sections">
            <button class="oh-sub-tab active" id="masterTabGroup" role="tab" aria-selected="true">
              <div class="oh-tab-icon-wrap">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.6"/>
                  <line x1="2" y1="7" x2="14" y2="7" stroke="currentColor" stroke-width="1.6"/>
                </svg>
              </div>
              <span class="oh-tab-text">Group</span>
            </button>

            <button class="oh-sub-tab" id="masterTabLedger" role="tab" aria-selected="false">
              <div class="oh-tab-icon-wrap">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 5h12M4 10h8M4 15h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                </svg>
              </div>
              <span class="oh-tab-text">Ledger</span>
            </button>

            <button class="oh-sub-tab" id="masterTabCustomers" role="tab" aria-selected="false">
              <div class="oh-tab-icon-wrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <span class="oh-tab-text">Customers</span>
            </button>

            <button class="oh-sub-tab" id="masterTabSuppliers" role="tab" aria-selected="false">
              <div class="oh-tab-icon-wrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="1" y="3" width="15" height="13"></rect>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 8"></polygon>
                  <circle cx="5.5" cy="18.5" r="2.5"></circle>
                  <circle cx="18.5" cy="18.5" r="2.5"></circle>
                </svg>
              </div>
              <span class="oh-tab-text">Suppliers</span>
            </button>
          </div>

          <!-- Right Content View Area -->
          <div class="oh-content-area" id="masterDeskContentArea">
          </div>
        </div>
      </div>
    `;

    const btnCreate = container.querySelector('#btnMasterCreate');
    const btnAlter = container.querySelector('#btnMasterAlter');
    const btnGroup = container.querySelector('#masterTabGroup');
    const btnLedger = container.querySelector('#masterTabLedger');
    const btnCustomers = container.querySelector('#masterTabCustomers');
    const btnSuppliers = container.querySelector('#masterTabSuppliers');

    if (btnCreate) {
      btnCreate.addEventListener('click', () => setMasterDeskSubtype('Create'));
    }
    if (btnAlter) {
      btnAlter.addEventListener('click', () => setMasterDeskSubtype('Alter'));
    }
    if (btnGroup) {
      btnGroup.addEventListener('click', () => setMasterDeskTab('group'));
    }
    if (btnLedger) {
      btnLedger.addEventListener('click', () => setMasterDeskTab('ledger'));
    }
    if (btnCustomers) {
      btnCustomers.addEventListener('click', () => setMasterDeskTab('customers'));
    }
    if (btnSuppliers) {
      btnSuppliers.addEventListener('click', () => setMasterDeskTab('suppliers'));
    }

    updateMasterDeskContent();
  }

  // Expose global functions
  window.renderMasterDeskPanel = renderMasterDeskPanel;
  window.initMasterDesk = initMasterDesk;
})();
