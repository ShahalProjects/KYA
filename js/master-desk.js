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
  let _masterDeskReturnContext = null;

  let _masterAlterSelectedGroupId = null;
  let _masterAlterSelectedLedgerId = null;
  let _masterAlterSelectedCustomerId = null;
  let _masterAlterSelectedSupplierId = null;

  let _masterAlterGroupAliases = [];
  let _masterAlterLedgerAliases = [];
  let _masterAlterCustomerAliases = [];
  let _masterAlterSupplierAliases = [];

  let _masterStockGroupAliases = [];
  let _masterStockItemAliases = [];
  let _masterStockCategoryAliases = [];
  let _masterUnitAliases = [];
  let _masterWarehouseAliases = [];

  let _masterAlterSelectedStockGroupId = null;
  let _masterAlterSelectedStockItemId = null;
  let _masterAlterSelectedStockCategoryId = null;
  let _masterAlterSelectedUnitId = null;
  let _masterAlterSelectedWarehouseId = null;

  let _masterAlterStockGroupAliases = [];
  let _masterAlterStockItemAliases = [];
  let _masterAlterStockCategoryAliases = [];
  let _masterAlterUnitAliases = [];
  let _masterAlterWarehouseAliases = [];

  const KYA_STOCK_GROUPS_KEY = 'kya_master_stock_groups';
  const KYA_STOCK_CATEGORIES_KEY = 'kya_master_stock_categories';
  const KYA_UNITS_KEY = 'kya_master_units';
  const KYA_WAREHOUSES_KEY = 'kya_master_warehouses';
  const KYA_STOCK_ITEMS_KEY = 'kya_master_stock_items';

  function loadMasterData(key, fallback) {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load ' + key + ' from localStorage', e);
    }
    return fallback;
  }

  function saveMasterData(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save ' + key + ' to localStorage', e);
    }
  }

  let _masterStockGroups = loadMasterData(KYA_STOCK_GROUPS_KEY, []);
  let _masterStockCategories = loadMasterData(KYA_STOCK_CATEGORIES_KEY, []);
  let _masterUnits = loadMasterData(KYA_UNITS_KEY, []);
  let _masterWarehouses = loadMasterData(KYA_WAREHOUSES_KEY, []);
  const SAMPLE_STOCK_SKUS = ['RAW-COT-01', 'RAW-ZIP-05', 'FG-DNM-32', 'FG-DNM-34', 'FG-TSH-02', 'PKG-BOX-12', 'RAW-THR-01', 'TRD-BLT-36', 'PKG-BAG-02'];
  let _masterStockItems = loadMasterData(KYA_STOCK_ITEMS_KEY, []).filter(item => !SAMPLE_STOCK_SKUS.includes(item.sku));

  function persistMasterStockGroups() {
    window._masterStockGroups = _masterStockGroups;
    saveMasterData(KYA_STOCK_GROUPS_KEY, _masterStockGroups);
  }
  function persistMasterStockCategories() {
    window._masterStockCategories = _masterStockCategories;
    saveMasterData(KYA_STOCK_CATEGORIES_KEY, _masterStockCategories);
  }
  function persistMasterUnits() {
    window._masterUnits = _masterUnits;
    saveMasterData(KYA_UNITS_KEY, _masterUnits);
  }
  function persistMasterWarehouses() {
    window._masterWarehouses = _masterWarehouses;
    saveMasterData(KYA_WAREHOUSES_KEY, _masterWarehouses);
  }
  function persistMasterStockItems() {
    window._masterStockItems = _masterStockItems;
    saveMasterData(KYA_STOCK_ITEMS_KEY, _masterStockItems);
  }

  persistMasterStockGroups();
  persistMasterStockCategories();
  persistMasterUnits();
  persistMasterWarehouses();
  persistMasterStockItems();

  window.saveMasterStockGroups = persistMasterStockGroups;
  window.saveMasterStockCategories = persistMasterStockCategories;
  window.saveMasterUnits = persistMasterUnits;
  window.saveMasterWarehouses = persistMasterWarehouses;
  window.saveMasterStockItems = persistMasterStockItems;

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function syncStockGroupsToCoa() {
    if (typeof coaLedgers === 'undefined' || !Array.isArray(coaLedgers)) return;

    const masterGroups = Array.isArray(_masterStockGroups) ? _masterStockGroups : [];
    const validGroupIds = new Set(masterGroups.map(g => g.id));
    const validGroupNames = new Set(masterGroups.map(g => (g.name || '').toLowerCase().trim()));

    // 1. Remove any ledgers/groups under sg-inv that are NOT in Master Desk
    for (let i = coaLedgers.length - 1; i >= 0; i--) {
      const l = coaLedgers[i];
      if (l.sgId === 'sg-inv') {
        const isMatch = (l.stockGroupId && validGroupIds.has(l.stockGroupId)) ||
                        validGroupNames.has((l.name || '').toLowerCase().trim());
        if (!isMatch) {
          coaLedgers.splice(i, 1);
        }
      }
    }

    // 2. Ensure each stock group in Master Desk exists as a group-ledger in COA
    masterGroups.forEach(sg => {
      let existingGl = coaLedgers.find(l => l.sgId === 'sg-inv' && (l.stockGroupId === sg.id || l.name.toLowerCase().trim() === sg.name.toLowerCase().trim()));

      if (!existingGl) {
        existingGl = {
          id: Date.now() + Math.floor(Math.random() * 1000000),
          sgId: 'sg-inv',
          glId: null,
          stockGroupId: sg.id,
          name: sg.name,
          code: '',
          openingBalance: 0,
          type: 'group-ledger',
          aliases: sg.aliases ? [...sg.aliases] : []
        };
        coaLedgers.push(existingGl);
      } else {
        existingGl.type = 'group-ledger';
        existingGl.stockGroupId = sg.id;
        existingGl.name = sg.name;
        existingGl.sgId = 'sg-inv';
        existingGl.aliases = sg.aliases ? [...sg.aliases] : [];
      }
    });

    // 3. Resolve parent hierarchy (glId) for nested stock groups
    masterGroups.forEach(sg => {
      const currentGl = coaLedgers.find(l => l.stockGroupId === sg.id || (l.sgId === 'sg-inv' && l.name.toLowerCase().trim() === sg.name.toLowerCase().trim()));
      if (!currentGl) return;

      if (!sg.parent || sg.parent === 'Inventories' || sg.parent === 'Primary') {
        currentGl.glId = null;
      } else {
        const parentSg = masterGroups.find(p => p.name.toLowerCase().trim() === sg.parent.toLowerCase().trim() || p.id === sg.parent);
        if (parentSg) {
          const parentGl = coaLedgers.find(l => l.stockGroupId === parentSg.id || (l.sgId === 'sg-inv' && l.name.toLowerCase().trim() === parentSg.name.toLowerCase().trim()));
          if (parentGl && parentGl.id !== currentGl.id) {
            currentGl.glId = parentGl.id;
          } else {
            currentGl.glId = null;
          }
        } else {
          currentGl.glId = null;
        }
      }
    });

    persistMasterStockGroups();
  }
  window.syncStockGroupsToCoa = syncStockGroupsToCoa;

  function getStockGroupUnderOptionsHtml(selectedParentName, excludeGroupId) {
    let isInvSelected = (!selectedParentName || selectedParentName === 'Inventories' || selectedParentName === 'Primary');
    let html = `<option value="Inventories" data-badge="Inventories" ${isInvSelected ? 'selected' : ''}>Inventories</option>`;

    // Find all descendant IDs if excludeGroupId is provided
    const excludedIds = new Set();
    if (excludeGroupId) {
      excludedIds.add(excludeGroupId);
      let added = true;
      while (added) {
        added = false;
        _masterStockGroups.forEach(g => {
          if (!excludedIds.has(g.id)) {
            const parentGroup = _masterStockGroups.find(p => p.name === g.parent || p.id === g.parent);
            if (parentGroup && excludedIds.has(parentGroup.id)) {
              excludedIds.add(g.id);
              added = true;
            }
          }
        });
      }
    }

    const renderLevel = (parentName, depth) => {
      const children = _masterStockGroups.filter(g => {
        if (excludedIds.has(g.id)) return false;
        if (parentName === 'Inventories') {
          return !g.parent || g.parent === 'Inventories' || g.parent === 'Primary';
        }
        return g.parent === parentName;
      });

      children.forEach(g => {
        const isSel = (!isInvSelected && (selectedParentName === g.name || selectedParentName === g.id));
        const indent = '\u00a0\u00a0\u00a0\u00a0'.repeat(depth);
        const prefix = depth > 0 ? '↳ ' : '';
        html += `<option value="${escapeHtml(g.name)}" data-badge="Stock Group" ${isSel ? 'selected' : ''}>${indent}${prefix}${escapeHtml(g.name)}</option>`;
        renderLevel(g.name, depth + 1);
      });
    };

    renderLevel('Inventories', 0);
    return html;
  }

  // Initial sync call
  setTimeout(syncStockGroupsToCoa, 50);

  function renderMasterDeskPanel() {
    const wrap = document.getElementById('panel-master-desk');
    if (!wrap) return;

    syncStockGroupsToCoa();

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
    const btnStockGroup = document.getElementById('masterTabStockGroup');
    const btnStockItem = document.getElementById('masterTabStockItem');
    const btnStockCategory = document.getElementById('masterTabStockCategory');
    const btnUnit = document.getElementById('masterTabUnit');
    const btnWarehouse = document.getElementById('masterTabWarehouse');

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
    if (btnStockGroup) {
      btnStockGroup.classList.toggle('active', tab === 'stock_group');
      btnStockGroup.setAttribute('aria-selected', tab === 'stock_group');
    }
    if (btnStockItem) {
      btnStockItem.classList.toggle('active', tab === 'stock_item');
      btnStockItem.setAttribute('aria-selected', tab === 'stock_item');
    }
    if (btnStockCategory) {
      btnStockCategory.classList.toggle('active', tab === 'stock_category');
      btnStockCategory.setAttribute('aria-selected', tab === 'stock_category');
    }
    if (btnUnit) {
      btnUnit.classList.toggle('active', tab === 'unit');
      btnUnit.setAttribute('aria-selected', tab === 'unit');
    }
    if (btnWarehouse) {
      btnWarehouse.classList.toggle('active', tab === 'warehouse');
      btnWarehouse.setAttribute('aria-selected', tab === 'warehouse');
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

  function findDuplicateCoaNameOrAlias(term, exclude) {
    if (!term) return null;
    const q = term.trim().toLowerCase();
    if (!q) return null;

    // 1. Check in coaLedgers (Active Ledgers and Group Ledgers)
    if (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) {
      for (const ldg of coaLedgers) {
        if (exclude && (
          (exclude.id !== undefined && exclude.id !== null && String(ldg.id) === String(exclude.id)) ||
          (exclude.originalName && ldg.name && ldg.name.trim().toLowerCase() === exclude.originalName.trim().toLowerCase())
        )) {
          continue;
        }
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
        if (exclude && (
          (exclude.id !== undefined && exclude.id !== null && String(sg.id) === String(exclude.id)) ||
          (exclude.originalName && sg.name && sg.name.trim().toLowerCase() === exclude.originalName.trim().toLowerCase())
        )) {
          continue;
        }
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
        if (exclude && (
          (exclude.id !== undefined && exclude.id !== null && String(cust.id) === String(exclude.id)) ||
          (exclude.originalName && cust.name && cust.name.trim().toLowerCase() === exclude.originalName.trim().toLowerCase())
        )) {
          continue;
        }
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
        if (exclude && (
          (exclude.id !== undefined && exclude.id !== null && String(supp.id) === String(exclude.id)) ||
          (exclude.originalName && supp.name && supp.name.trim().toLowerCase() === exclude.originalName.trim().toLowerCase())
        )) {
          continue;
        }
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

  function validateMasterAlterGroupAliasesLive(excludeObj) {
    const container = document.getElementById('masterAlterGroupAliasesContainer');
    const nameInp = document.getElementById('masterAlterGroupName');
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
        const errorText = `"${val}" matches the Group Name in this form.`;
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

      const dup = findDuplicateCoaNameOrAlias(val, excludeObj);
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

  function renderMasterAlterGroupAliases(excludeObj) {
    const container = document.getElementById('masterAlterGroupAliasesContainer');
    const addAliasBtn = document.getElementById('masterAlterGroupAddAliasBtn');
    if (!container) return;

    container.innerHTML = '';
    const hasEmpty = _masterAlterGroupAliases.some(a => a.trim() === '');
    if (addAliasBtn) {
      addAliasBtn.style.display = hasEmpty ? 'none' : 'inline-flex';
    }

    _masterAlterGroupAliases.forEach((alias, idx) => {
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
        validateMasterAlterGroupAliasesLive(excludeObj);
      });

      input.addEventListener('input', (e) => {
        _masterAlterGroupAliases[idx] = e.target.value;
        const nowHasEmpty = _masterAlterGroupAliases.some(a => a.trim() === '');
        if (addAliasBtn) addAliasBtn.style.display = nowHasEmpty ? 'none' : 'inline-flex';
        validateMasterAlterGroupAliasesLive(excludeObj);
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
        _masterAlterGroupAliases.splice(idx, 1);
        renderMasterAlterGroupAliases(excludeObj);
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

    validateMasterAlterGroupAliasesLive(excludeObj);
  }

  function validateMasterAlterLedgerAliasesLive(excludeObj) {
    const container = document.getElementById('masterAlterLedgerAliasesContainer');
    const nameInp = document.getElementById('masterAlterLedgerName');
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
        const errorText = `"${val}" matches the Ledger Name in this form.`;
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

      const dup = findDuplicateCoaNameOrAlias(val, excludeObj);
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

  function renderMasterAlterLedgerAliases(excludeObj) {
    const container = document.getElementById('masterAlterLedgerAliasesContainer');
    const addAliasBtn = document.getElementById('masterAlterLedgerAddAliasBtn');
    if (!container) return;

    container.innerHTML = '';
    const hasEmpty = _masterAlterLedgerAliases.some(a => a.trim() === '');
    if (addAliasBtn) {
      addAliasBtn.style.display = hasEmpty ? 'none' : 'inline-flex';
    }

    _masterAlterLedgerAliases.forEach((alias, idx) => {
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
        validateMasterAlterLedgerAliasesLive(excludeObj);
      });

      input.addEventListener('input', (e) => {
        _masterAlterLedgerAliases[idx] = e.target.value;
        const nowHasEmpty = _masterAlterLedgerAliases.some(a => a.trim() === '');
        if (addAliasBtn) addAliasBtn.style.display = nowHasEmpty ? 'none' : 'inline-flex';
        validateMasterAlterLedgerAliasesLive(excludeObj);
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
        _masterAlterLedgerAliases.splice(idx, 1);
        renderMasterAlterLedgerAliases(excludeObj);
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

    validateMasterAlterLedgerAliasesLive(excludeObj);
  }

  function validateMasterAlterCustomerAliasesLive(excludeObj) {
    const container = document.getElementById('masterAlterCustomerAliasesContainer');
    const nameInp = document.getElementById('masterAlterCustomerName');
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
        const errorText = `"${val}" matches the Customer Name in this form.`;
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

      const dup = findDuplicateCoaNameOrAlias(val, excludeObj);
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

  function renderMasterAlterCustomerAliases(excludeObj) {
    const container = document.getElementById('masterAlterCustomerAliasesContainer');
    const addAliasBtn = document.getElementById('masterAlterCustomerAddAliasBtn');
    if (!container) return;

    container.innerHTML = '';
    const hasEmpty = _masterAlterCustomerAliases.some(a => a.trim() === '');
    if (addAliasBtn) {
      addAliasBtn.style.display = hasEmpty ? 'none' : 'inline-flex';
    }

    _masterAlterCustomerAliases.forEach((alias, idx) => {
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
        validateMasterAlterCustomerAliasesLive(excludeObj);
      });

      input.addEventListener('input', (e) => {
        _masterAlterCustomerAliases[idx] = e.target.value;
        const nowHasEmpty = _masterAlterCustomerAliases.some(a => a.trim() === '');
        if (addAliasBtn) addAliasBtn.style.display = nowHasEmpty ? 'none' : 'inline-flex';
        validateMasterAlterCustomerAliasesLive(excludeObj);
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
        _masterAlterCustomerAliases.splice(idx, 1);
        renderMasterAlterCustomerAliases(excludeObj);
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

    validateMasterAlterCustomerAliasesLive(excludeObj);
  }

  function validateMasterAlterSupplierAliasesLive(excludeObj) {
    const container = document.getElementById('masterAlterSupplierAliasesContainer');
    const nameInp = document.getElementById('masterAlterSupplierName');
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

      const dup = findDuplicateCoaNameOrAlias(val, excludeObj);
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

  function renderMasterAlterSupplierAliases(excludeObj) {
    const container = document.getElementById('masterAlterSupplierAliasesContainer');
    const addAliasBtn = document.getElementById('masterAlterSupplierAddAliasBtn');
    if (!container) return;

    container.innerHTML = '';
    const hasEmpty = _masterAlterSupplierAliases.some(a => a.trim() === '');
    if (addAliasBtn) {
      addAliasBtn.style.display = hasEmpty ? 'none' : 'inline-flex';
    }

    _masterAlterSupplierAliases.forEach((alias, idx) => {
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
        validateMasterAlterSupplierAliasesLive(excludeObj);
      });

      input.addEventListener('input', (e) => {
        _masterAlterSupplierAliases[idx] = e.target.value;
        const nowHasEmpty = _masterAlterSupplierAliases.some(a => a.trim() === '');
        if (addAliasBtn) addAliasBtn.style.display = nowHasEmpty ? 'none' : 'inline-flex';
        validateMasterAlterSupplierAliasesLive(excludeObj);
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
        _masterAlterSupplierAliases.splice(idx, 1);
        renderMasterAlterSupplierAliases(excludeObj);
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

    validateMasterAlterSupplierAliasesLive(excludeObj);
  }

  function renderGenericAliasRows(containerId, addBtnId, aliasesArray, placeholderPrefix) {
    const container = document.getElementById(containerId);
    const addBtn = document.getElementById(addBtnId);
    if (!container) return;

    container.innerHTML = '';
    const hasEmpty = aliasesArray.some(a => a.trim() === '');
    if (addBtn) {
      addBtn.style.display = hasEmpty ? 'none' : 'inline-flex';
    }

    aliasesArray.forEach((alias, idx) => {
      const block = document.createElement('div');
      block.className = 'master-alias-row-wrap';
      block.style.cssText = 'display: flex; flex-direction: column; gap: 2px;';

      const row = document.createElement('div');
      row.style.cssText = 'display: flex; gap: 8px; align-items: center;';

      const input = document.createElement('input');
      input.className = 'master-alias-input';
      input.placeholder = `Alias #${idx + 1} (e.g. ${placeholderPrefix || 'Alternate name / Code'})`;
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
        input.style.borderColor = '#3b82f6';
        input.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.12)';
      });
      input.addEventListener('blur', () => {
        input.style.borderColor = 'var(--slate-200)';
        input.style.boxShadow = 'none';
      });
      input.addEventListener('input', (e) => {
        aliasesArray[idx] = e.target.value;
        const nowHasEmpty = aliasesArray.some(a => a.trim() === '');
        if (addBtn) addBtn.style.display = nowHasEmpty ? 'none' : 'inline-flex';
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
        aliasesArray.splice(idx, 1);
        renderGenericAliasRows(containerId, addBtnId, aliasesArray, placeholderPrefix);
      });

      row.appendChild(input);
      row.appendChild(delBtn);
      block.appendChild(row);
      container.appendChild(block);
    });
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
          if (opt.dataset.badge === 'Primary' || opt.dataset.badge === 'Inventories') {
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
      if (!isOpen) {
        document.querySelectorAll('.kya-searchable-select-dropdown').forEach(dd => {
          if (dd !== dropdown) dd.style.display = 'none';
        });
        dropdown.style.display = 'flex';
        searchInput.value = '';
        populateList('');
        setTimeout(() => searchInput.focus(), 50);
      } else {
        dropdown.style.display = 'none';
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

          if (_masterDeskReturnContext) {
            const ctx = _masterDeskReturnContext;
            _masterDeskReturnContext = null;
            _masterLedgerAliases = [];

            if (ctx.returnTab === 'sales_voucher') {
              if (typeof closeTab === 'function') closeTab('master_desk', null, 'sales_voucher');
              else if (typeof window.closeTab === 'function') window.closeTab('master_desk', null, 'sales_voucher');
              if (typeof openTab === 'function') openTab('sales_voucher');
              else if (typeof window.openTab === 'function') window.openTab('sales_voucher');
              if (typeof window.onPartyCreatedForSales === 'function') {
                window.onPartyCreatedForSales(newLedger, 'ledger');
              }
              return;
            }

            if (ctx.returnTab === 'purchase_voucher') {
              if (typeof closeTab === 'function') closeTab('master_desk', null, 'purchase_voucher');
              else if (typeof window.closeTab === 'function') window.closeTab('master_desk', null, 'purchase_voucher');
              if (typeof openTab === 'function') openTab('purchase_voucher');
              else if (typeof window.openTab === 'function') window.openTab('purchase_voucher');
              if (typeof window.onPartyCreatedForPurchase === 'function') {
                window.onPartyCreatedForPurchase(newLedger, 'ledger');
              }
              return;
            }

            if (ctx.returnTab === 'journal') {
              if (typeof closeTab === 'function') closeTab('master_desk', null, 'journal');
              else if (typeof window.closeTab === 'function') window.closeTab('master_desk', null, 'journal');
              if (typeof openTab === 'function') openTab('journal');
              else if (typeof window.openTab === 'function') window.openTab('journal');
              if (typeof window.onLedgerCreatedForJournal === 'function') {
                window.onLedgerCreatedForJournal(newLedger, ctx.rowId);
              }
              return;
            }
          }

          updateMasterDeskContent();
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          _masterLedgerAliases = [];
          if (cancelMasterDeskReturn()) return;
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

          if (_masterDeskReturnContext && _masterDeskReturnContext.returnTab === 'sales_voucher') {
            const ctx = _masterDeskReturnContext;
            _masterDeskReturnContext = null;
            _masterCustomerAliases = [];

            if (typeof closeTab === 'function') closeTab('master_desk', null, 'sales_voucher');
            else if (typeof window.closeTab === 'function') window.closeTab('master_desk', null, 'sales_voucher');
            if (typeof openTab === 'function') openTab('sales_voucher');
            else if (typeof window.openTab === 'function') window.openTab('sales_voucher');

            if (typeof window.onPartyCreatedForSales === 'function') {
              window.onPartyCreatedForSales(newCustomer, 'customer');
            }
            return;
          }

          updateMasterDeskContent();
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          _masterCustomerAliases = [];
          if (cancelMasterDeskReturn()) return;
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

          if (_masterDeskReturnContext && _masterDeskReturnContext.returnTab === 'purchase_voucher') {
            const ctx = _masterDeskReturnContext;
            _masterDeskReturnContext = null;
            _masterSupplierAliases = [];

            if (typeof closeTab === 'function') closeTab('master_desk', null, 'purchase_voucher');
            else if (typeof window.closeTab === 'function') window.closeTab('master_desk', null, 'purchase_voucher');
            if (typeof openTab === 'function') openTab('purchase_voucher');
            else if (typeof window.openTab === 'function') window.openTab('purchase_voucher');

            if (typeof window.onPartyCreatedForPurchase === 'function') {
              window.onPartyCreatedForPurchase(newSupplier, 'supplier');
            }
            return;
          }

          updateMasterDeskContent();
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          _masterSupplierAliases = [];
          if (cancelMasterDeskReturn()) return;
          updateMasterDeskContent();
        });
      }
    } else if (currentMasterDeskSubtype === 'Create' && currentMasterDeskTab === 'stock_group') {
      _masterStockGroupAliases = [];

      let groupOptionsHtml = getStockGroupUnderOptionsHtml('Inventories');

      contentArea.innerHTML = `
        <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--white); margin: 0 0 20px 0;">
          <h3 style="font-size: 15px; font-weight: 700; color: var(--slate-800); margin: 0 0 18px 0; display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            Create Stock Group
          </h3>

          <!-- Name field -->
          <div class="coa-modal-fg" style="margin-bottom: 16px;">
            <label class="coa-modal-label" for="masterStockGroupName" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Name *</label>
            <input class="coa-modal-inp" id="masterStockGroupName" placeholder="e.g. Raw Materials / Finished Goods / Electronics" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none;">
          </div>

          <!-- Also Known As field -->
          <div class="coa-modal-fg" style="margin-bottom: 16px;">
            <label class="coa-modal-label" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Also Known As</label>
            <div id="masterStockGroupAliasesContainer" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;"></div>
            <button type="button" id="masterStockGroupAddAliasBtn" style="padding: 7px 14px; font-size: 12.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; border: 1.5px dashed var(--slate-300); border-radius: 8px; background: #f8fafc; cursor: pointer; color: var(--slate-600); transition: all 0.15s ease;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add A.K.A
            </button>
          </div>

          <!-- Under Parent Group (Searchable Option) -->
          <div class="coa-modal-fg" style="margin-bottom: 16px;">
            <label class="coa-modal-label" for="masterStockGroupUnderSel" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Under *</label>
            <select class="coa-modal-sel" id="masterStockGroupUnderSel" style="display: none;">
              ${groupOptionsHtml}
            </select>
            <div class="kya-searchable-select-wrap" id="masterStockGroupUnderSelSearchableWrap" style="position: relative; width: 100%;">
              <div class="kya-searchable-select-trigger" id="masterStockGroupUnderSelTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                <span id="masterStockGroupUnderSelTriggerText">Inventories</span>
                <span style="font-size: 10px; color: var(--slate-400);">▼</span>
              </div>
              <div class="kya-searchable-select-dropdown" id="masterStockGroupUnderSelDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                <input type="text" id="masterStockGroupUnderSelSearch" placeholder="Search parent stock group..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                <div id="masterStockGroupUnderSelOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
              </div>
            </div>
          </div>

          <!-- Should Quantities of Items be added? -->
          <div class="coa-modal-fg" style="margin-bottom: 16px;">
            <label class="coa-modal-label" for="masterStockGroupAddQty" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Should quantities of items be added? *</label>
            <select class="coa-modal-sel" id="masterStockGroupAddQty" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box; background: #fff; outline: none;">
              <option value="Yes" selected>Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          <!-- Description (Optional) -->
          <div class="coa-modal-fg" style="margin-bottom: 24px;">
            <label class="coa-modal-label" for="masterStockGroupDesc" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Description / Notes (Optional)</label>
            <input class="coa-modal-inp" id="masterStockGroupDesc" placeholder="e.g. Primary category for all raw cloth materials" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none;">
          </div>

          <div style="display: flex; gap: 12px; align-items: center;">
            <button class="btn btn-primary" id="masterStockGroupSaveBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">＋ Create Stock Group</button>
            <button class="btn btn-secondary" id="masterStockGroupCancelBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Cancel</button>
          </div>
        </div>
      `;

      renderGenericAliasRows('masterStockGroupAliasesContainer', 'masterStockGroupAddAliasBtn', _masterStockGroupAliases, 'Group Code / Alias');

      const addAliasBtn = contentArea.querySelector('#masterStockGroupAddAliasBtn');
      if (addAliasBtn) {
        addAliasBtn.addEventListener('click', () => {
          _masterStockGroupAliases.push('');
          renderGenericAliasRows('masterStockGroupAliasesContainer', 'masterStockGroupAddAliasBtn', _masterStockGroupAliases, 'Group Code / Alias');
          const inputs = contentArea.querySelectorAll('.master-alias-input');
          if (inputs.length) inputs[inputs.length - 1].focus();
        });
      }

      initSearchableSelectHelper(contentArea, 'masterStockGroupUnderSel', 'Select parent stock group');

      const saveBtn = contentArea.querySelector('#masterStockGroupSaveBtn');
      const cancelBtn = contentArea.querySelector('#masterStockGroupCancelBtn');
      const nameInp = contentArea.querySelector('#masterStockGroupName');

      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const name = nameInp ? nameInp.value.trim() : '';
          if (!name) {
            if (typeof showToast === 'function') showToast('Please enter a stock group name.', 'warning');
            else alert('Please enter a stock group name.');
            if (nameInp) nameInp.focus();
            return;
          }

          const underSel = contentArea.querySelector('#masterStockGroupUnderSel');
          const addQtySel = contentArea.querySelector('#masterStockGroupAddQty');
          const newGroup = {
            id: 'sg-' + Date.now(),
            name: name,
            parent: underSel ? underSel.value : 'Inventories',
            addQty: addQtySel ? addQtySel.value : 'Yes',
            aliases: _masterStockGroupAliases.filter(a => a.trim() !== '')
          };
          _masterStockGroups.push(newGroup);
          persistMasterStockGroups();

          // Synchronize immediately to Chart of Accounts as group-ledger under sg-inv
          syncStockGroupsToCoa();

          if (typeof _coaExpanded !== 'undefined') {
            _coaExpanded.add('assets');
            _coaExpanded.add('sg-inv');
          }

          if (typeof renderChartPanel === 'function') renderChartPanel();
          if (typeof refreshAllReports === 'function') refreshAllReports();
          if (typeof triggerAutoBackup === 'function') triggerAutoBackup();

          if (typeof showToast === 'function') showToast(`Stock Group "${name}" created successfully.`, 'success');
          _masterStockGroupAliases = [];
          updateMasterDeskContent();
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          _masterStockGroupAliases = [];
          updateMasterDeskContent();
        });
      }
    } else if (currentMasterDeskSubtype === 'Create' && currentMasterDeskTab === 'stock_item') {
      _masterStockItemAliases = [];

      let uomList = (_masterUnits && _masterUnits.length > 0)
        ? _masterUnits
        : [
            { symbol: 'Pcs', formalName: 'Pieces' },
            { symbol: 'Box', formalName: 'Boxes' },
            { symbol: 'Kgs', formalName: 'Kilograms' },
            { symbol: 'Nos', formalName: 'Numbers' },
            { symbol: 'Mtr', formalName: 'Meters' },
            { symbol: 'Rolls', formalName: 'Rolls' },
            { symbol: 'Sets', formalName: 'Sets' },
            { symbol: 'Dzn', formalName: 'Dozens' },
            { symbol: 'Pair', formalName: 'Pairs' }
          ];

      let uomOpts = '';
      uomList.forEach(u => {
        const isSel = (u.symbol === 'Pcs');
        uomOpts += `<option value="${escapeHtml(u.symbol)}" ${isSel ? 'selected' : ''}>${escapeHtml(u.symbol)} (${escapeHtml(u.formalName || u.symbol)})</option>`;
      });

      let groupList = (_masterStockGroups && _masterStockGroups.length > 0)
        ? _masterStockGroups
        : [{ name: 'Inventories' }, { name: 'Raw Materials' }, { name: 'Finished Goods' }, { name: 'Packaging Materials' }, { name: 'Trading Goods' }];

      let groupOpts = '';
      groupList.forEach((g, idx) => {
        const isSel = (idx === 0);
        const badge = (g.name === 'Inventories' || g.name === 'Primary') ? 'Inventories' : '';
        groupOpts += `<option value="${escapeHtml(g.name)}" ${badge ? `data-badge="${badge}"` : ''} ${isSel ? 'selected' : ''}>${escapeHtml(g.name)}</option>`;
      });
      const initialGroupText = groupList.length > 0 ? groupList[0].name : 'Inventories';

      let catOpts = '<option value="" selected>-- None / Primary --</option>';
      _masterStockCategories.forEach(c => {
        catOpts += `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`;
      });

      let whOpts = '<option value="" selected>-- None / Default Location --</option>';
      _masterWarehouses.forEach(w => {
        whOpts += `<option value="${escapeHtml(w.name)}">${escapeHtml(w.name)}</option>`;
      });

      contentArea.innerHTML = `
        <div class="coa-modal-card" style="max-width: 640px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--white); margin: 0 0 20px 0;">
          <h3 style="font-size: 15px; font-weight: 700; color: var(--slate-800); margin: 0 0 18px 0; display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            Create Stock Item
          </h3>

          <!-- Name & SKU -->
          <div class="coa-modal-fg" style="margin-bottom: 16px;">
            <label class="coa-modal-label" for="masterStockItemName" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Item Name *</label>
            <input class="coa-modal-inp" id="masterStockItemName" placeholder="e.g. Premium Cotton Fabric / Industrial Zipper #5" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none;">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
            <div>
              <label class="coa-modal-label" for="masterStockItemSku" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">SKU / Item Code</label>
              <input class="coa-modal-inp" id="masterStockItemSku" placeholder="e.g. RAW-COT-01" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; text-transform: uppercase;">
            </div>
            <div>
              <label class="coa-modal-label" for="masterStockItemUomSel" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Unit of Measure (UoM) *</label>
              <select class="coa-modal-sel" id="masterStockItemUomSel" style="display: none;">
                ${uomOpts}
              </select>
              <div class="kya-searchable-select-wrap" id="masterStockItemUomSelSearchableWrap" style="position: relative; width: 100%;">
                <div class="kya-searchable-select-trigger" id="masterStockItemUomSelTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                  <span id="masterStockItemUomSelTriggerText">Pcs (Pieces)</span>
                  <span style="font-size: 10px; color: var(--slate-400);">▼</span>
                </div>
                <div class="kya-searchable-select-dropdown" id="masterStockItemUomSelDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg, 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                  <input type="text" id="masterStockItemUomSelSearch" placeholder="Search Unit of Measure (UoM)..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                  <div id="masterStockItemUomSelOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Also Known As -->
          <div class="coa-modal-fg" style="margin-bottom: 16px;">
            <label class="coa-modal-label" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Also Known As</label>
            <div id="masterStockItemAliasesContainer" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;"></div>
            <button type="button" id="masterStockItemAddAliasBtn" style="padding: 7px 14px; font-size: 12.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; border: 1.5px dashed var(--slate-300); border-radius: 8px; background: #f8fafc; cursor: pointer; color: var(--slate-600); transition: all 0.15s ease;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add A.K.A
            </button>
          </div>

          <!-- Group & Category -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
            <div>
              <label class="coa-modal-label" for="masterStockItemGroupSel" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Stock Group *</label>
              <select class="coa-modal-sel" id="masterStockItemGroupSel" style="display: none;">
                ${groupOpts}
              </select>
              <div class="kya-searchable-select-wrap" id="masterStockItemGroupSelSearchableWrap" style="position: relative; width: 100%;">
                <div class="kya-searchable-select-trigger" id="masterStockItemGroupSelTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                  <span id="masterStockItemGroupSelTriggerText">${escapeHtml(initialGroupText)}</span>
                  <span style="font-size: 10px; color: var(--slate-400);">▼</span>
                </div>
                <div class="kya-searchable-select-dropdown" id="masterStockItemGroupSelDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg, 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                  <input type="text" id="masterStockItemGroupSelSearch" placeholder="Search Stock Group..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                  <div id="masterStockItemGroupSelOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                </div>
              </div>
            </div>
            <div>
              <label class="coa-modal-label" for="masterStockItemCategorySel" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Stock Category</label>
              <select class="coa-modal-sel" id="masterStockItemCategorySel" style="display: none;">
                ${catOpts}
              </select>
              <div class="kya-searchable-select-wrap" id="masterStockItemCategorySelSearchableWrap" style="position: relative; width: 100%;">
                <div class="kya-searchable-select-trigger" id="masterStockItemCategorySelTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                  <span id="masterStockItemCategorySelTriggerText">-- None / Primary --</span>
                  <span style="font-size: 10px; color: var(--slate-400);">▼</span>
                </div>
                <div class="kya-searchable-select-dropdown" id="masterStockItemCategorySelDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg, 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                  <input type="text" id="masterStockItemCategorySelSearch" placeholder="Search Stock Category..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                  <div id="masterStockItemCategorySelOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Warehouse / Default Location -->
          <div class="coa-modal-fg" style="margin-bottom: 16px;">
            <label class="coa-modal-label" for="masterStockItemWarehouseSel" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Default Warehouse / Godown</label>
            <select class="coa-modal-sel" id="masterStockItemWarehouseSel" style="display: none;">
              ${whOpts}
            </select>
            <div class="kya-searchable-select-wrap" id="masterStockItemWarehouseSelSearchableWrap" style="position: relative; width: 100%;">
              <div class="kya-searchable-select-trigger" id="masterStockItemWarehouseSelTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                <span id="masterStockItemWarehouseSelTriggerText">-- None / Default Location --</span>
                <span style="font-size: 10px; color: var(--slate-400);">▼</span>
              </div>
              <div class="kya-searchable-select-dropdown" id="masterStockItemWarehouseSelDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg, 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                <input type="text" id="masterStockItemWarehouseSelSearch" placeholder="Search Warehouse / Godown..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                <div id="masterStockItemWarehouseSelOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
              </div>
            </div>
          </div>

          <!-- Opening Balance & Rates Card -->
          <div style="background: #f8fafc; border: 1.5px solid var(--slate-200); border-radius: 10px; padding: 18px; margin-bottom: 20px;">
            <div style="font-size: 13px; font-weight: 700; color: var(--slate-800); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
              </svg>
              Opening Stock & Valuation
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
              <div>
                <label style="font-size: 11.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 4px; display: block;">Opening Quantity</label>
                <input type="number" min="0" step="1" id="masterStockItemQty" placeholder="0" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
              </div>
              <div>
                <label style="font-size: 11.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 4px; display: block;">Rate per Unit (₹)</label>
                <input type="number" min="0" step="0.01" id="masterStockItemRate" placeholder="0.00" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
              </div>
              <div>
                <label style="font-size: 11.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 4px; display: block;">Total Opening Value</label>
                <input type="text" readonly id="masterStockItemVal" placeholder="₹ 0.00" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: var(--slate-100); color: var(--slate-700); font-weight: 600;">
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px;">
              <div>
                <label style="font-size: 11.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 4px; display: block;">Reorder Level (Units)</label>
                <input type="number" min="0" id="masterStockItemReorder" placeholder="e.g. 20" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
              </div>
              <div>
                <label style="font-size: 11.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 4px; display: block;">GST / Tax Rate (%)</label>
                <select id="masterStockItemGstSel" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                  <option value="0">0% (Nil / Exempt)</option>
                  <option value="5">5% GST</option>
                  <option value="12">12% GST</option>
                  <option value="18" selected>18% GST</option>
                  <option value="28">28% GST</option>
                </select>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 12px; align-items: center;">
            <button class="btn btn-primary" id="masterStockItemSaveBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">＋ Create Stock Item</button>
            <button class="btn btn-secondary" id="masterStockItemCancelBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Cancel</button>
          </div>
        </div>
      `;

      renderGenericAliasRows('masterStockItemAliasesContainer', 'masterStockItemAddAliasBtn', _masterStockItemAliases, 'Alternate Code / Tag');

      const addAliasBtn = contentArea.querySelector('#masterStockItemAddAliasBtn');
      if (addAliasBtn) {
        addAliasBtn.addEventListener('click', () => {
          _masterStockItemAliases.push('');
          renderGenericAliasRows('masterStockItemAliasesContainer', 'masterStockItemAddAliasBtn', _masterStockItemAliases, 'Alternate Code / Tag');
          const inputs = contentArea.querySelectorAll('.master-alias-input');
          if (inputs.length) inputs[inputs.length - 1].focus();
        });
      }

      initSearchableSelectHelper(contentArea, 'masterStockItemUomSel', 'Select Unit of Measure');
      initSearchableSelectHelper(contentArea, 'masterStockItemGroupSel', 'Select Stock Group');
      initSearchableSelectHelper(contentArea, 'masterStockItemCategorySel', 'Select Stock Category');
      initSearchableSelectHelper(contentArea, 'masterStockItemWarehouseSel', 'Select Warehouse / Godown');

      const qtyInp = contentArea.querySelector('#masterStockItemQty');
      const rateInp = contentArea.querySelector('#masterStockItemRate');
      const valInp = contentArea.querySelector('#masterStockItemVal');
      const calcVal = () => {
        const q = parseFloat(qtyInp?.value) || 0;
        const r = parseFloat(rateInp?.value) || 0;
        if (valInp) valInp.value = '₹ ' + (q * r).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };
      if (qtyInp) qtyInp.addEventListener('input', calcVal);
      if (rateInp) rateInp.addEventListener('input', calcVal);

      const saveBtn = contentArea.querySelector('#masterStockItemSaveBtn');
      const cancelBtn = contentArea.querySelector('#masterStockItemCancelBtn');
      const nameInp = contentArea.querySelector('#masterStockItemName');

      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const name = nameInp ? nameInp.value.trim() : '';
          if (!name) {
            if (typeof showToast === 'function') showToast('Please enter a stock item name.', 'warning');
            else alert('Please enter a stock item name.');
            if (nameInp) nameInp.focus();
            return;
          }

          const sku = contentArea.querySelector('#masterStockItemSku')?.value?.trim() || '';
          const uom = contentArea.querySelector('#masterStockItemUomSel')?.value || 'Pcs';
          const grp = contentArea.querySelector('#masterStockItemGroupSel')?.value || 'Raw Materials';
          const cat = contentArea.querySelector('#masterStockItemCategorySel')?.value || '';
          const wh = contentArea.querySelector('#masterStockItemWarehouseSel')?.value || '';
          const qty = parseFloat(qtyInp?.value) || 0;
          const rate = parseFloat(rateInp?.value) || 0;
          const reorder = parseFloat(contentArea.querySelector('#masterStockItemReorder')?.value) || 0;
          const gst = parseFloat(contentArea.querySelector('#masterStockItemGstSel')?.value) || 18;

          const newItem = {
            id: 'item-' + Date.now(),
            name: name,
            sku: sku || ('SKU-' + Date.now().toString().slice(-4)),
            group: grp,
            category: cat,
            uom: uom,
            warehouse: wh,
            qty: qty,
            rate: rate,
            reorder: reorder,
            gst: gst,
            aliases: _masterStockItemAliases.filter(a => a.trim() !== '')
          };
          _masterStockItems.push(newItem);
          persistMasterStockItems();

          if (typeof showToast === 'function') showToast(`Stock Item "${name}" created successfully.`, 'success');
          _masterStockItemAliases = [];
          updateMasterDeskContent();
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          _masterStockItemAliases = [];
          updateMasterDeskContent();
        });
      }
    } else if (currentMasterDeskSubtype === 'Create' && currentMasterDeskTab === 'stock_category') {
      _masterStockCategoryAliases = [];

      let catUnderOpts = '<option value="Primary" data-badge="Primary" selected>Primary</option>';
      _masterStockCategories.forEach(c => {
        catUnderOpts += `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`;
      });

      contentArea.innerHTML = `
        <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--white); margin: 0 0 20px 0;">
          <h3 style="font-size: 15px; font-weight: 700; color: var(--slate-800); margin: 0 0 18px 0; display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            Create Stock Category
          </h3>

          <!-- Name field -->
          <div class="coa-modal-fg" style="margin-bottom: 16px;">
            <label class="coa-modal-label" for="masterStockCategoryName" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Category Name *</label>
            <input class="coa-modal-inp" id="masterStockCategoryName" placeholder="e.g. Fabrics & Textiles / Garments / Packaging" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none;">
          </div>

          <!-- Also Known As field -->
          <div class="coa-modal-fg" style="margin-bottom: 16px;">
            <label class="coa-modal-label" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Also Known As</label>
            <div id="masterStockCategoryAliasesContainer" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;"></div>
            <button type="button" id="masterStockCategoryAddAliasBtn" style="padding: 7px 14px; font-size: 12.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; border: 1.5px dashed var(--slate-300); border-radius: 8px; background: #f8fafc; cursor: pointer; color: var(--slate-600); transition: all 0.15s ease;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add A.K.A
            </button>
          </div>

          <!-- Under Parent Category (Searchable Option) -->
          <div class="coa-modal-fg" style="margin-bottom: 16px;">
            <label class="coa-modal-label" for="masterStockCategoryUnderSel" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Under *</label>
            <select class="coa-modal-sel" id="masterStockCategoryUnderSel" style="display: none;">
              ${catUnderOpts}
            </select>
            <div class="kya-searchable-select-wrap" id="masterStockCategoryUnderSelSearchableWrap" style="position: relative; width: 100%;">
              <div class="kya-searchable-select-trigger" id="masterStockCategoryUnderSelTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                <span id="masterStockCategoryUnderSelTriggerText">Primary</span>
                <span style="font-size: 10px; color: var(--slate-400);">▼</span>
              </div>
              <div class="kya-searchable-select-dropdown" id="masterStockCategoryUnderSelDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                <input type="text" id="masterStockCategoryUnderSelSearch" placeholder="Search parent category..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                <div id="masterStockCategoryUnderSelOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
              </div>
            </div>
          </div>

          <!-- Description / Notes -->
          <div class="coa-modal-fg" style="margin-bottom: 24px;">
            <label class="coa-modal-label" for="masterStockCategoryDesc" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Description / Classification</label>
            <input class="coa-modal-inp" id="masterStockCategoryDesc" placeholder="e.g. Classification for all woven textile materials" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none;">
          </div>

          <div style="display: flex; gap: 12px; align-items: center;">
            <button class="btn btn-primary" id="masterStockCategorySaveBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">＋ Create Stock Category</button>
            <button class="btn btn-secondary" id="masterStockCategoryCancelBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Cancel</button>
          </div>
        </div>
      `;

      renderGenericAliasRows('masterStockCategoryAliasesContainer', 'masterStockCategoryAddAliasBtn', _masterStockCategoryAliases, 'Category Code / Tag');

      const addAliasBtn = contentArea.querySelector('#masterStockCategoryAddAliasBtn');
      if (addAliasBtn) {
        addAliasBtn.addEventListener('click', () => {
          _masterStockCategoryAliases.push('');
          renderGenericAliasRows('masterStockCategoryAliasesContainer', 'masterStockCategoryAddAliasBtn', _masterStockCategoryAliases, 'Category Code / Tag');
          const inputs = contentArea.querySelectorAll('.master-alias-input');
          if (inputs.length) inputs[inputs.length - 1].focus();
        });
      }

      initSearchableSelectHelper(contentArea, 'masterStockCategoryUnderSel', 'Select parent category');

      const saveBtn = contentArea.querySelector('#masterStockCategorySaveBtn');
      const cancelBtn = contentArea.querySelector('#masterStockCategoryCancelBtn');
      const nameInp = contentArea.querySelector('#masterStockCategoryName');

      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const name = nameInp ? nameInp.value.trim() : '';
          if (!name) {
            if (typeof showToast === 'function') showToast('Please enter a category name.', 'warning');
            else alert('Please enter a category name.');
            if (nameInp) nameInp.focus();
            return;
          }

          const underSel = contentArea.querySelector('#masterStockCategoryUnderSel');
          const descInp = contentArea.querySelector('#masterStockCategoryDesc');
          const newCat = {
            id: 'cat-' + Date.now(),
            name: name,
            parent: underSel ? underSel.value : 'Primary',
            desc: descInp ? descInp.value.trim() : '',
            aliases: _masterStockCategoryAliases.filter(a => a.trim() !== '')
          };
          _masterStockCategories.push(newCat);
          persistMasterStockCategories();

          if (typeof showToast === 'function') showToast(`Stock Category "${name}" created successfully.`, 'success');
          _masterStockCategoryAliases = [];
          updateMasterDeskContent();
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          _masterStockCategoryAliases = [];
          updateMasterDeskContent();
        });
      }
    } else if (currentMasterDeskSubtype === 'Create' && currentMasterDeskTab === 'unit') {
      _masterUnitAliases = [];

      const GST_UQC_OPTIONS = [
        { code: 'PCS-PIECES', name: 'Pieces' },
        { code: 'KGS-KILOGRAMS', name: 'Kilograms' },
        { code: 'BOX-BOXES', name: 'Boxes' },
        { code: 'MTR-METRES', name: 'Metres' },
        { code: 'NOS-NUMBERS', name: 'Numbers' },
        { code: 'ROL-ROLLS', name: 'Rolls' },
        { code: 'LTR-LITRES', name: 'Litres' },
        { code: 'SET-SETS', name: 'Sets' },
        { code: 'SQF-SQUARE FEET', name: 'Square Feet' },
        { code: 'SQM-SQUARE METRES', name: 'Square Metres' },
        { code: 'BAG-BAGS', name: 'Bags' },
        { code: 'BTL-BOTTLES', name: 'Bottles' },
        { code: 'CAN-CANS', name: 'Cans' },
        { code: 'CTN-CARTONS', name: 'Cartons' },
        { code: 'DOZ-DOZENS', name: 'Dozens' },
        { code: 'GMS-GRAMMES', name: 'Grammes' },
        { code: 'KLR-KILOLITRES', name: 'Kilolitres' },
        { code: 'PAC-PACKETS', name: 'Packets' },
        { code: 'PRS-PAIRS', name: 'Pairs' },
        { code: 'QTL-QUINTAL', name: 'Quintal' },
        { code: 'THD-THOUSANDS', name: 'Thousands' },
        { code: 'TUB-TUBES', name: 'Tubes' },
        { code: 'UNT-UNITS', name: 'Units' },
        { code: 'YDS-YARDS', name: 'Yards' },
        { code: 'OTH-OTHERS', name: 'Others' }
      ];

      let uqcOptionsHtml = '';
      GST_UQC_OPTIONS.forEach(u => {
        const isSel = (u.code === 'PCS-PIECES');
        uqcOptionsHtml += `<option value="${u.code}" ${isSel ? 'selected' : ''}>${u.code} (${u.name})</option>`;
      });

      contentArea.innerHTML = `
        <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--white); margin: 0 0 20px 0;">
          <h3 style="font-size: 15px; font-weight: 700; color: var(--slate-800); margin: 0 0 18px 0; display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <line x1="3.27" y1="6.96" x2="12" y2="12.01"/>
              <line x1="12" y1="12.01" x2="20.73" y2="6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12.01"/>
            </svg>
            Create Unit of Measure (UoM)
          </h3>

          <!-- Type selector -->
          <div class="coa-modal-fg" style="margin-bottom: 16px;">
            <label class="coa-modal-label" for="masterUnitTypeSel" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Type *</label>
            <select class="coa-modal-sel" id="masterUnitTypeSel" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box; background: #fff; outline: none;">
              <option value="Simple" selected>Simple (Single Unit)</option>
              <option value="Compound">Compound Unit</option>
            </select>
          </div>

          <!-- Symbol & Formal Name -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div>
              <label class="coa-modal-label" for="masterUnitSymbol" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Symbol *</label>
              <input class="coa-modal-inp" id="masterUnitSymbol" placeholder="e.g. Pcs / Kgs / Mtr / Box" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none;">
            </div>
            <div>
              <label class="coa-modal-label" for="masterUnitFormalName" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Formal Name</label>
              <input class="coa-modal-inp" id="masterUnitFormalName" placeholder="e.g. Pieces / Kilograms / Meters" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none;">
            </div>
          </div>

          <!-- Also Known As field -->
          <div class="coa-modal-fg" style="margin-bottom: 16px;">
            <label class="coa-modal-label" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Also Known As</label>
            <div id="masterUnitAliasesContainer" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;"></div>
            <button type="button" id="masterUnitAddAliasBtn" style="padding: 7px 14px; font-size: 12.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; border: 1.5px dashed var(--slate-300); border-radius: 8px; background: #f8fafc; cursor: pointer; color: var(--slate-600); transition: all 0.15s ease;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add A.K.A
            </button>
          </div>

          <!-- Unit Quantity Code (UQC) & Decimal Places -->
          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-bottom: 24px;">
            <div>
              <label class="coa-modal-label" for="masterUnitUqcSel" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Unit Quantity Code (UQC for GST)</label>
              <select class="coa-modal-sel" id="masterUnitUqcSel" style="display: none;">
                ${uqcOptionsHtml}
              </select>
              <div class="kya-searchable-select-wrap" id="masterUnitUqcSelSearchableWrap" style="position: relative; width: 100%;">
                <div class="kya-searchable-select-trigger" id="masterUnitUqcSelTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                  <span id="masterUnitUqcSelTriggerText">PCS-PIECES (Pieces)</span>
                  <span style="font-size: 10px; color: var(--slate-400);">▼</span>
                </div>
                <div class="kya-searchable-select-dropdown" id="masterUnitUqcSelDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                  <input type="text" id="masterUnitUqcSelSearch" placeholder="Search UQC code or unit name..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                  <div id="masterUnitUqcSelOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                </div>
              </div>
            </div>
            <div>
              <label class="coa-modal-label" for="masterUnitDecimalsSel" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Decimal Places</label>
              <select class="coa-modal-sel" id="masterUnitDecimalsSel" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box; background: #fff; outline: none;">
                <option value="0" selected>0 (e.g. 10 Pcs)</option>
                <option value="1">1 (e.g. 10.5)</option>
                <option value="2">2 (e.g. 10.25 Kgs)</option>
                <option value="3">3 (e.g. 10.125 Mtr)</option>
                <option value="4">4 (e.g. 10.1250)</option>
              </select>
            </div>
          </div>

          <div style="display: flex; gap: 12px; align-items: center;">
            <button class="btn btn-primary" id="masterUnitSaveBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">＋ Create Unit</button>
            <button class="btn btn-secondary" id="masterUnitCancelBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Cancel</button>
          </div>
        </div>
      `;

      renderGenericAliasRows('masterUnitAliasesContainer', 'masterUnitAddAliasBtn', _masterUnitAliases, 'Unit Tag / Alias');

      const addAliasBtn = contentArea.querySelector('#masterUnitAddAliasBtn');
      if (addAliasBtn) {
        addAliasBtn.addEventListener('click', () => {
          _masterUnitAliases.push('');
          renderGenericAliasRows('masterUnitAliasesContainer', 'masterUnitAddAliasBtn', _masterUnitAliases, 'Unit Tag / Alias');
          const inputs = contentArea.querySelectorAll('.master-alias-input');
          if (inputs.length) inputs[inputs.length - 1].focus();
        });
      }

      initSearchableSelectHelper(contentArea, 'masterUnitUqcSel', 'Select UQC Code...');

      const saveBtn = contentArea.querySelector('#masterUnitSaveBtn');
      const cancelBtn = contentArea.querySelector('#masterUnitCancelBtn');
      const symbolInp = contentArea.querySelector('#masterUnitSymbol');

      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const symbol = symbolInp ? symbolInp.value.trim() : '';
          if (!symbol) {
            if (typeof showToast === 'function') showToast('Please enter a unit symbol (e.g. Pcs, Kgs).', 'warning');
            else alert('Please enter a unit symbol.');
            if (symbolInp) symbolInp.focus();
            return;
          }

          const typeSel = contentArea.querySelector('#masterUnitTypeSel');
          const formalNameInp = contentArea.querySelector('#masterUnitFormalName');
          const uqcSel = contentArea.querySelector('#masterUnitUqcSel');
          const decimalsSel = contentArea.querySelector('#masterUnitDecimalsSel');

          const newUnit = {
            id: 'uom-' + Date.now(),
            type: typeSel ? typeSel.value : 'Simple',
            symbol: symbol,
            formalName: formalNameInp ? formalNameInp.value.trim() : '',
            uqc: uqcSel ? uqcSel.value : 'OTH-OTHERS',
            decimalPlaces: parseInt(decimalsSel ? decimalsSel.value : '0', 10) || 0,
            aliases: _masterUnitAliases.filter(a => a.trim() !== '')
          };
          _masterUnits.push(newUnit);
          persistMasterUnits();

          if (typeof showToast === 'function') showToast(`Unit "${symbol}" created successfully.`, 'success');
          _masterUnitAliases = [];
          updateMasterDeskContent();
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          _masterUnitAliases = [];
          updateMasterDeskContent();
        });
      }
    } else if (currentMasterDeskSubtype === 'Create' && currentMasterDeskTab === 'warehouse') {
      _masterWarehouseAliases = [];

      let whUnderOpts = '<option value="Primary" selected>Primary</option>';
      _masterWarehouses.forEach(w => {
        whUnderOpts += `<option value="${escapeHtml(w.name)}">${escapeHtml(w.name)}</option>`;
      });

      contentArea.innerHTML = `
        <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--white); margin: 0 0 20px 0;">
          <h3 style="font-size: 15px; font-weight: 700; color: var(--slate-800); margin: 0 0 18px 0; display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 21h18"/>
              <path d="M5 21V7l7-4 7 4v14"/>
              <path d="M9 21v-8a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v8"/>
            </svg>
            Create Warehouse / Godown
          </h3>

          <!-- Name & Code -->
          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div>
              <label class="coa-modal-label" for="masterWarehouseName" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Warehouse Name *</label>
              <input class="coa-modal-inp" id="masterWarehouseName" placeholder="e.g. Main Warehouse (WH-A) / Store Showroom" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none;">
            </div>
            <div>
              <label class="coa-modal-label" for="masterWarehouseCode" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Code</label>
              <input class="coa-modal-inp" id="masterWarehouseCode" placeholder="e.g. WH-A" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; text-transform: uppercase;">
            </div>
          </div>

          <!-- Also Known As field -->
          <div class="coa-modal-fg" style="margin-bottom: 16px;">
            <label class="coa-modal-label" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Also Known As</label>
            <div id="masterWarehouseAliasesContainer" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;"></div>
            <button type="button" id="masterWarehouseAddAliasBtn" style="padding: 7px 14px; font-size: 12.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; border: 1.5px dashed var(--slate-300); border-radius: 8px; background: #f8fafc; cursor: pointer; color: var(--slate-600); transition: all 0.15s ease;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add A.K.A
            </button>
          </div>

          <!-- Under Location (Searchable Option) -->
          <div class="coa-modal-fg" style="margin-bottom: 16px;">
            <label class="coa-modal-label" for="masterWarehouseUnderSel" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Under Location *</label>
            <select class="coa-modal-sel" id="masterWarehouseUnderSel" style="display: none;">
              ${whUnderOpts}
            </select>
            <div class="kya-searchable-select-wrap" id="masterWarehouseUnderSelSearchableWrap" style="position: relative; width: 100%;">
              <div class="kya-searchable-select-trigger" id="masterWarehouseUnderSelTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                <span id="masterWarehouseUnderSelTriggerText">Primary</span>
                <span style="font-size: 10px; color: var(--slate-400);">▼</span>
              </div>
              <div class="kya-searchable-select-dropdown" id="masterWarehouseUnderSelDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                <input type="text" id="masterWarehouseUnderSelSearch" placeholder="Search parent location..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                <div id="masterWarehouseUnderSelOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
              </div>
            </div>
          </div>

          <!-- Location & Contact Details -->
          <div style="background: #f8fafc; border: 1.5px solid var(--slate-200); border-radius: 10px; padding: 18px; margin-bottom: 20px;">
            <div style="font-size: 13px; font-weight: 700; color: var(--slate-800); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              Address & Facility Details
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <input type="text" id="masterWarehouseAddress" placeholder="Street Address / Building / Plot No." style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <input type="text" id="masterWarehouseCity" placeholder="City / Town" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                <input type="text" id="masterWarehousePincode" placeholder="PIN / Postal Code" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <input type="text" id="masterWarehouseState" placeholder="State (e.g. Maharashtra)" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                <input type="text" id="masterWarehouseCountry" placeholder="Country" value="India" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <input type="text" id="masterWarehouseSupervisor" placeholder="Supervisor / Manager Name" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                <input type="text" id="masterWarehouseType" placeholder="Storage Type (e.g. Bulk / Cold Storage)" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 12px; align-items: center;">
            <button class="btn btn-primary" id="masterWarehouseSaveBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">＋ Create Warehouse</button>
            <button class="btn btn-secondary" id="masterWarehouseCancelBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Cancel</button>
          </div>
        </div>
      `;

      renderGenericAliasRows('masterWarehouseAliasesContainer', 'masterWarehouseAddAliasBtn', _masterWarehouseAliases, 'Location Code / Alias');

      const addAliasBtn = contentArea.querySelector('#masterWarehouseAddAliasBtn');
      if (addAliasBtn) {
        addAliasBtn.addEventListener('click', () => {
          _masterWarehouseAliases.push('');
          renderGenericAliasRows('masterWarehouseAliasesContainer', 'masterWarehouseAddAliasBtn', _masterWarehouseAliases, 'Location Code / Alias');
          const inputs = contentArea.querySelectorAll('.master-alias-input');
          if (inputs.length) inputs[inputs.length - 1].focus();
        });
      }

      initSearchableSelectHelper(contentArea, 'masterWarehouseUnderSel', 'Select parent location');

      const saveBtn = contentArea.querySelector('#masterWarehouseSaveBtn');
      const cancelBtn = contentArea.querySelector('#masterWarehouseCancelBtn');
      const nameInp = contentArea.querySelector('#masterWarehouseName');

      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const name = nameInp ? nameInp.value.trim() : '';
          if (!name) {
            if (typeof showToast === 'function') showToast('Please enter a warehouse name.', 'warning');
            else alert('Please enter a warehouse name.');
            if (nameInp) nameInp.focus();
            return;
          }

          const code = contentArea.querySelector('#masterWarehouseCode')?.value?.trim() || '';
          const underSel = contentArea.querySelector('#masterWarehouseUnderSel');
          const address = contentArea.querySelector('#masterWarehouseAddress')?.value?.trim() || '';
          const city = contentArea.querySelector('#masterWarehouseCity')?.value?.trim() || '';
          const pincode = contentArea.querySelector('#masterWarehousePincode')?.value?.trim() || '';
          const state = contentArea.querySelector('#masterWarehouseState')?.value?.trim() || '';
          const supervisor = contentArea.querySelector('#masterWarehouseSupervisor')?.value?.trim() || '';
          const type = contentArea.querySelector('#masterWarehouseType')?.value?.trim() || 'Bulk Storage';

          const newWh = {
            id: 'wh-' + Date.now(),
            name: name,
            code: code,
            parent: underSel ? underSel.value : 'Primary',
            address: address,
            city: city,
            pincode: pincode,
            state: state,
            supervisor: supervisor,
            type: type,
            aliases: _masterWarehouseAliases.filter(a => a.trim() !== '')
          };
          _masterWarehouses.push(newWh);
          persistMasterWarehouses();

          if (typeof showToast === 'function') showToast(`Warehouse "${name}" created successfully.`, 'success');
          _masterWarehouseAliases = [];
          updateMasterDeskContent();
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          _masterWarehouseAliases = [];
          updateMasterDeskContent();
        });
      }
    } else if (currentMasterDeskSubtype === 'Alter') {
      // ══════════════════════════════════════════════════════════════════
      //  ALTER MODE: Groups, Ledgers, Customers, and Suppliers
      // ══════════════════════════════════════════════════════════════════
      if (currentMasterDeskTab === 'group') {
        const allGroups = [];
        if (typeof COA_SYS_SGS !== 'undefined') {
          COA_SYS_SGS.forEach(sg => {
            allGroups.push({
              id: 'sg:' + sg.id,
              rawId: sg.id,
              name: sg.name,
              main: sg.main,
              parent: sg.parent,
              aliases: sg.aliases || [],
              isSysSg: true,
              isCustomSg: String(sg.id).startsWith('sg-grp-')
            });
          });
        }
        if (typeof coaLedgers !== 'undefined') {
          coaLedgers.filter(l => l.type === 'group-ledger').forEach(gl => {
            allGroups.push({
              id: 'gl:' + gl.id,
              rawId: gl.id,
              name: gl.name,
              sgId: gl.sgId,
              glId: gl.glId,
              aliases: gl.aliases || [],
              isSysSg: false,
              isCustomSg: true
            });
          });
        }

        if (allGroups.length === 0) {
          contentArea.innerHTML = `
            <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 32px 24px; background: var(--white); text-align: center; margin: 0 0 20px 0;">
              <div style="font-size: 14px; font-weight: 600; color: var(--slate-600); margin-bottom: 8px;">No groups found to alter.</div>
              <div style="font-size: 12.5px; color: var(--slate-400); margin-bottom: 16px;">Create a new group first using the Create tab.</div>
              <button class="btn btn-primary" id="btnAlterGoToCreateGroup" style="font-size: 13px; font-weight: 600; padding: 8px 16px;">Go to Create Group</button>
            </div>
          `;
          const btnGo = contentArea.querySelector('#btnAlterGoToCreateGroup');
          if (btnGo) btnGo.addEventListener('click', () => setMasterDeskSubtype('Create'));
          return;
        }

        let currentGroup = allGroups.find(g => g.id === _masterAlterSelectedGroupId);
        if (!currentGroup) {
          currentGroup = allGroups[0];
          _masterAlterSelectedGroupId = currentGroup.id;
        }

        _masterAlterGroupAliases = currentGroup.aliases ? [...currentGroup.aliases] : [];

        const excludeObj = {
          id: currentGroup.rawId,
          originalName: currentGroup.name
        };

        let groupSelectorOptionsHtml = '';
        allGroups.forEach(g => {
          const isSel = (g.id === currentGroup.id);
          const badge = g.isSysSg ? (g.isCustomSg ? 'Custom Group' : 'Group') : 'Group Ledger';
          groupSelectorOptionsHtml += `<option value="${g.id}" data-badge="${badge}" ${isSel ? 'selected' : ''}>${escapeHtml(g.name)}</option>`;
        });

        // Determine current "Under"
        let currentUnderVal = 'primary:assets';
        if (currentGroup.isSysSg) {
          if (currentGroup.parent) {
            currentUnderVal = 'group:sg:' + currentGroup.parent;
          } else {
            currentUnderVal = 'primary:' + (currentGroup.main || 'assets');
          }
        } else {
          if (currentGroup.glId) {
            currentUnderVal = 'group:gl:' + currentGroup.glId;
          } else {
            currentUnderVal = 'group:sg:' + currentGroup.sgId;
          }
        }

        // Build Under Options (excluding currentGroup itself and its descendant group ledgers to avoid cycles)
        let groupUnderOptionsHtml = '';
        if (typeof COA_SYS_SGS !== 'undefined') {
          COA_SYS_SGS.forEach(sg => {
            if (currentGroup.isSysSg && sg.id === currentGroup.rawId) return; // Cannot place under itself
            const sgIndent = sg.parent ? '\u00a0\u00a0\u00a0\u00a0' : '';
            const isOptSel = (currentUnderVal === 'group:sg:' + sg.id);
            groupUnderOptionsHtml += `<option value="group:sg:${sg.id}" data-badge="Group" ${isOptSel ? 'selected' : ''}>${sgIndent}${escapeHtml(sg.name)}</option>`;

            if (typeof coaLedgers !== 'undefined') {
              const addGlOptions = (parentId, depth) => {
                const gls = coaLedgers.filter(l => l.sgId === sg.id && l.type === 'group-ledger' && (parentId ? l.glId === parentId : !l.glId));
                gls.forEach(gl => {
                  if (!currentGroup.isSysSg && gl.id === currentGroup.rawId) return; // Cannot place under itself
                  const glIndent = sgIndent + '\u00a0\u00a0\u00a0\u00a0' + '\u00a0\u00a0'.repeat(depth);
                  const isGlOptSel = (currentUnderVal === 'group:gl:' + gl.id);
                  groupUnderOptionsHtml += `<option value="group:gl:${gl.id}" data-badge="Group" ${isGlOptSel ? 'selected' : ''}>${glIndent}📁 ${escapeHtml(gl.name)}</option>`;
                  addGlOptions(gl.id, depth + 1);
                });
              };
              addGlOptions(null, 0);
            }
          });
        }

        const isLockedGroup = currentGroup.isSysSg && !currentGroup.isCustomSg;

        contentArea.innerHTML = `
          <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--white); margin: 0 0 20px 0;">
            <h3 style="font-size: 15px; font-weight: 700; color: var(--slate-800); margin: 0 0 18px 0; display: flex; align-items: center; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              Alter Group
            </h3>

            <!-- Select Group to Alter field -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" for="masterAlterGroupSelector" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Select Group to Alter *</label>
              <select class="coa-modal-sel" id="masterAlterGroupSelector" style="display: none;">
                ${groupSelectorOptionsHtml}
              </select>
              <div class="kya-searchable-select-wrap" id="masterAlterGroupSelectorSearchableWrap" style="position: relative; width: 100%;">
                <div class="kya-searchable-select-trigger" id="masterAlterGroupSelectorTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                  <span id="masterAlterGroupSelectorTriggerText">${escapeHtml(currentGroup.name)}</span>
                  <span style="font-size: 10px; color: var(--slate-400);">▼</span>
                </div>
                <div class="kya-searchable-select-dropdown" id="masterAlterGroupSelectorDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                  <input type="text" id="masterAlterGroupSelectorSearch" placeholder="Search group..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                  <div id="masterAlterGroupSelectorOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                </div>
              </div>
            </div>

            <!-- Name field -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" for="masterAlterGroupName" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Name *</label>
              <input class="coa-modal-inp" id="masterAlterGroupName" value="${escapeHtml(currentGroup.name)}" placeholder="e.g. Current Assets / Bank Accounts" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box;">
              <div id="masterAlterGroupNameError" style="display: none; font-size: 12px; font-weight: 600; color: #dc2626; margin-top: 5px;"></div>
            </div>

            <!-- Also Known As field -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Also Known As</label>
              <div id="masterAlterGroupAliasesContainer" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;"></div>
              <button type="button" id="masterAlterGroupAddAliasBtn" style="padding: 7px 14px; font-size: 12.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; border: 1.5px dashed var(--slate-300); border-radius: 8px; background: #f8fafc; cursor: pointer; color: var(--slate-600); transition: all 0.15s ease;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add A.K.A
              </button>
            </div>

            <!-- Under field (Single box with separated Primary Categories & Parent Groups) -->
            <div class="coa-modal-fg" style="margin-bottom: 24px;">
              <label class="coa-modal-label" for="masterAlterGroupUnderCombinedSel" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Under *</label>
              <select class="coa-modal-sel" id="masterAlterGroupUnderCombinedSel" style="display: none;">
                <optgroup label="Primary Categories">
                  <option value="primary:assets" data-badge="Primary" ${currentUnderVal === 'primary:assets' ? 'selected' : ''}>Asset</option>
                  <option value="primary:equity-liabilities" data-badge="Primary" ${currentUnderVal === 'primary:equity-liabilities' ? 'selected' : ''}>Liability</option>
                  <option value="primary:expense" data-badge="Primary" ${currentUnderVal === 'primary:expense' ? 'selected' : ''}>Expense</option>
                  <option value="primary:income" data-badge="Primary" ${currentUnderVal === 'primary:income' ? 'selected' : ''}>Income</option>
                </optgroup>
                <optgroup label="Parent Groups">
                  ${groupUnderOptionsHtml}
                </optgroup>
              </select>
              <div class="kya-searchable-select-wrap" id="masterAlterGroupUnderCombinedSelSearchableWrap" style="position: relative; width: 100%;">
                <div class="kya-searchable-select-trigger" id="masterAlterGroupUnderCombinedSelTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                  <span id="masterAlterGroupUnderCombinedSelTriggerText">Select category or parent group</span>
                  <span style="font-size: 10px; color: var(--slate-400);">▼</span>
                </div>
                <div class="kya-searchable-select-dropdown" id="masterAlterGroupUnderCombinedSelDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                  <input type="text" id="masterAlterGroupUnderCombinedSelSearch" placeholder="Search primary category or parent group..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                  <div id="masterAlterGroupUnderCombinedSelOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; gap: 12px; align-items: center;">
                <button class="btn btn-primary" id="masterAlterGroupSaveBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Save Changes</button>
                <button class="btn btn-secondary" id="masterAlterGroupCancelBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Cancel</button>
              </div>
              <button class="btn btn-secondary" id="masterAlterGroupDelBtn" style="height: 38px; padding: 8px 14px; font-size: 12.5px; font-weight: 600; color: #dc2626; border-color: #fecaca; background: #fef2f2; display: ${isLockedGroup ? 'none' : 'inline-flex'}; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
                Delete Group
              </button>
            </div>
          </div>
        `;

        renderMasterAlterGroupAliases(excludeObj);

        const groupSelector = contentArea.querySelector('#masterAlterGroupSelector');
        initSearchableSelectHelper(contentArea, 'masterAlterGroupSelector', 'Select Group to Alter');

        if (groupSelector) {
          groupSelector.addEventListener('change', () => {
            _masterAlterSelectedGroupId = groupSelector.value;
            updateMasterDeskContent();
          });
        }

        const addAliasBtn = contentArea.querySelector('#masterAlterGroupAddAliasBtn');
        if (addAliasBtn) {
          addAliasBtn.addEventListener('click', () => {
            _masterAlterGroupAliases.push('');
            renderMasterAlterGroupAliases(excludeObj);
            const inputs = contentArea.querySelectorAll('.master-alias-input');
            if (inputs.length) inputs[inputs.length - 1].focus();
          });
        }

        initSearchableSelectHelper(contentArea, 'masterAlterGroupUnderCombinedSel', 'Select category or parent group');

        const saveBtn = contentArea.querySelector('#masterAlterGroupSaveBtn');
        const cancelBtn = contentArea.querySelector('#masterAlterGroupCancelBtn');
        const delBtn = contentArea.querySelector('#masterAlterGroupDelBtn');
        const nameInp = contentArea.querySelector('#masterAlterGroupName');
        const nameErr = contentArea.querySelector('#masterAlterGroupNameError');

        const validateNameInputLive = () => {
          const val = nameInp ? nameInp.value.trim() : '';
          if (!val) {
            if (nameErr) { nameErr.style.display = 'none'; nameErr.textContent = ''; }
            if (nameInp) nameInp.style.borderColor = 'var(--slate-200)';
            return null;
          }

          const dup = findDuplicateCoaNameOrAlias(val, excludeObj);
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
            validateMasterAlterGroupAliasesLive(excludeObj);
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

            const liveNameErr = validateNameInputLive();
            if (liveNameErr) {
              if (typeof showToast === 'function') showToast(liveNameErr, 'error');
              else alert(liveNameErr);
              if (nameInp) nameInp.focus();
              return;
            }

            const aliasesValid = validateMasterAlterGroupAliasesLive(excludeObj);
            if (!aliasesValid) {
              const msg = 'Please fix duplicate or invalid Also Known As entries.';
              if (typeof showToast === 'function') showToast(msg, 'error');
              else alert(msg);
              return;
            }

            const underSel = contentArea.querySelector('#masterAlterGroupUnderCombinedSel');
            const underVal = underSel && underSel.value ? underSel.value : 'primary:assets';
            const isPrimary = underVal.startsWith('primary:');
            const aliases = _masterAlterGroupAliases.map(a => a.trim()).filter(a => a !== '');

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

              const dupAl = findDuplicateCoaNameOrAlias(al, excludeObj);
              if (dupAl) {
                const typeLabel = dupAl.parentName ? `Alias of "${dupAl.parentName}"` : dupAl.type;
                const msg = `"${al}" already exists (${typeLabel}).`;
                if (typeof showToast === 'function') showToast(msg, 'error');
                else alert(msg);
                return;
              }
            }

            if (currentGroup.isSysSg) {
              if (typeof COA_SYS_SGS !== 'undefined') {
                const sg = COA_SYS_SGS.find(s => s.id === currentGroup.rawId);
                if (sg) {
                  sg.name = name;
                  sg.aliases = aliases;
                  if (isPrimary) {
                    sg.main = underVal.replace('primary:', '');
                    sg.parent = null;
                  } else {
                    const selectedVal = underVal.replace('group:', '');
                    if (selectedVal.startsWith('sg:')) {
                      sg.parent = selectedVal.replace('sg:', '');
                      const parentSg = COA_SYS_SGS.find(s => s.id === sg.parent);
                      if (parentSg) sg.main = parentSg.main;
                    }
                  }
                  if (typeof saveCoaSubGroups === 'function') saveCoaSubGroups();
                }
              }
            } else {
              if (typeof coaLedgers !== 'undefined') {
                const gl = coaLedgers.find(l => l.id === currentGroup.rawId && l.type === 'group-ledger');
                if (gl) {
                  gl.name = name;
                  gl.aliases = aliases;
                  if (isPrimary) {
                    const mainNature = underVal.replace('primary:', '');
                    const rootSg = typeof COA_SYS_SGS !== 'undefined' ? COA_SYS_SGS.find(s => s.main === mainNature && !s.parent) : null;
                    gl.sgId = rootSg ? rootSg.id : 'sg-cce';
                    gl.glId = null;
                  } else {
                    const selectedVal = underVal.replace('group:', '');
                    let parentSgId = selectedVal;
                    let parentGlId = null;

                    if (selectedVal.startsWith('gl:')) {
                      const targetGlId = Number(selectedVal.replace('gl:', ''));
                      const targetGl = coaLedgers.find(l => l.id === targetGlId);
                      if (targetGl) {
                        parentSgId = targetGl.sgId;
                        parentGlId = targetGl.id;
                      }
                    } else if (selectedVal.startsWith('sg:')) {
                      parentSgId = selectedVal.replace('sg:', '');
                    }
                    gl.sgId = parentSgId;
                    gl.glId = parentGlId;
                  }
                }
              }
            }

            if (typeof renderChartPanel === 'function') renderChartPanel();
            if (typeof refreshAllReports === 'function') refreshAllReports();
            if (typeof triggerAutoBackup === 'function') triggerAutoBackup();

            showToast(`Group "${name}" updated successfully.`, 'success');
            _masterAlterSelectedGroupId = currentGroup.id;
            updateMasterDeskContent();
          });
        }

        if (delBtn) {
          delBtn.addEventListener('click', () => {
            if (confirm(`Are you sure you want to delete group "${currentGroup.name}"?`)) {
              if (currentGroup.isSysSg) {
                if (typeof COA_SYS_SGS !== 'undefined') {
                  COA_SYS_SGS = COA_SYS_SGS.filter(s => s.id !== currentGroup.rawId && s.parent !== currentGroup.rawId);
                  if (typeof saveCoaSubGroups === 'function') saveCoaSubGroups();
                }
                if (typeof coaLedgers !== 'undefined') {
                  coaLedgers = coaLedgers.filter(l => l.sgId !== currentGroup.rawId);
                }
              } else {
                if (typeof coaLedgers !== 'undefined') {
                  coaLedgers = coaLedgers.filter(l => l.id !== currentGroup.rawId && l.glId !== currentGroup.rawId);
                }
              }

              if (typeof renderChartPanel === 'function') renderChartPanel();
              if (typeof refreshAllReports === 'function') refreshAllReports();
              if (typeof triggerAutoBackup === 'function') triggerAutoBackup();

              showToast(`Group "${currentGroup.name}" deleted.`, 'info');
              _masterAlterSelectedGroupId = null;
              updateMasterDeskContent();
            }
          });
        }

        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => {
            updateMasterDeskContent();
          });
        }

      } else if (currentMasterDeskTab === 'ledger') {
        const allLedgers = typeof coaLedgers !== 'undefined' ? coaLedgers.filter(l => l.type === 'ledger') : [];

        if (allLedgers.length === 0) {
          contentArea.innerHTML = `
            <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 32px 24px; background: var(--white); text-align: center; margin: 0 0 20px 0;">
              <div style="font-size: 14px; font-weight: 600; color: var(--slate-600); margin-bottom: 8px;">No ledgers found to alter.</div>
              <div style="font-size: 12.5px; color: var(--slate-400); margin-bottom: 16px;">Create a new ledger first using the Create tab.</div>
              <button class="btn btn-primary" id="btnAlterGoToCreateLedger" style="font-size: 13px; font-weight: 600; padding: 8px 16px;">Go to Create Ledger</button>
            </div>
          `;
          const btnGo = contentArea.querySelector('#btnAlterGoToCreateLedger');
          if (btnGo) btnGo.addEventListener('click', () => setMasterDeskSubtype('Create'));
          return;
        }

        let currentLedger = allLedgers.find(l => l.id === _masterAlterSelectedLedgerId);
        if (!currentLedger) {
          currentLedger = allLedgers[0];
          _masterAlterSelectedLedgerId = currentLedger.id;
        }

        _masterAlterLedgerAliases = currentLedger.aliases ? [...currentLedger.aliases] : [];

        const excludeObj = {
          id: currentLedger.id,
          originalName: currentLedger.name
        };

        let ledgerSelectorOptionsHtml = '';
        allLedgers.forEach(l => {
          const isSel = (l.id === currentLedger.id);
          ledgerSelectorOptionsHtml += `<option value="${l.id}" ${isSel ? 'selected' : ''}>${escapeHtml(l.name)}</option>`;
        });

        // Group selector options for this ledger
        let ledgerGroupOptionsHtml = '';
        let selectedGroupText = 'Select Group';
        const currentLedgerGroupVal = currentLedger.glId ? ('gl:' + currentLedger.glId) : ('sg:' + currentLedger.sgId);

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
              const isSgSel = (currentLedgerGroupVal === 'sg:' + sg.id);
              catOptionsHtml += `<option value="sg:${sg.id}" data-badge="Group" ${isSgSel ? 'selected' : ''}>${sgIndent}${escapeHtml(sg.name)}</option>`;
              if (isSgSel) selectedGroupText = sg.name;

              if (typeof coaLedgers !== 'undefined') {
                const addGlOptions = (parentId, depth) => {
                  const gls = coaLedgers.filter(l => l.sgId === sg.id && l.type === 'group-ledger' && (parentId ? l.glId === parentId : !l.glId));
                  gls.forEach(gl => {
                    const glIndent = sgIndent + '\u00a0\u00a0\u00a0\u00a0' + '\u00a0\u00a0'.repeat(depth);
                    const isGlSel = (currentLedgerGroupVal === 'gl:' + gl.id);
                    catOptionsHtml += `<option value="gl:${gl.id}" data-badge="Group Ledger" ${isGlSel ? 'selected' : ''}>${glIndent}📁 ${escapeHtml(gl.name)}</option>`;
                    if (isGlSel) selectedGroupText = gl.name;
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

        const balVal = (currentLedger.openingBalance !== undefined && currentLedger.openingBalance !== null && currentLedger.openingBalance !== 0) ? currentLedger.openingBalance : '';

        contentArea.innerHTML = `
          <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--white); margin: 0 0 20px 0;">
            <h3 style="font-size: 15px; font-weight: 700; color: var(--slate-800); margin: 0 0 18px 0; display: flex; align-items: center; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="var(--blue-600)" stroke-width="1.8" stroke-linecap="round">
                <path d="M4 5h12M4 10h8M4 15h10"/>
              </svg>
              Alter Ledger
            </h3>

            <!-- Select Ledger to Alter field -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" for="masterAlterLedgerSelector" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Select Ledger to Alter *</label>
              <select class="coa-modal-sel" id="masterAlterLedgerSelector" style="display: none;">
                ${ledgerSelectorOptionsHtml}
              </select>
              <div class="kya-searchable-select-wrap" id="masterAlterLedgerSelectorSearchableWrap" style="position: relative; width: 100%;">
                <div class="kya-searchable-select-trigger" id="masterAlterLedgerSelectorTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                  <span id="masterAlterLedgerSelectorTriggerText">${escapeHtml(currentLedger.name)}</span>
                  <span style="font-size: 10px; color: var(--slate-400);">▼</span>
                </div>
                <div class="kya-searchable-select-dropdown" id="masterAlterLedgerSelectorDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                  <input type="text" id="masterAlterLedgerSelectorSearch" placeholder="Search ledger..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                  <div id="masterAlterLedgerSelectorOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                </div>
              </div>
            </div>

            <!-- Name field -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" for="masterAlterLedgerName" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Name *</label>
              <input class="coa-modal-inp" id="masterAlterLedgerName" value="${escapeHtml(currentLedger.name)}" placeholder="e.g. ICICI Bank / Rent Expense / Office Supplies" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box;">
              <div id="masterAlterLedgerNameError" style="display: none; font-size: 12px; font-weight: 600; color: #dc2626; margin-top: 5px;"></div>
            </div>

            <!-- Also Known As field -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Also Known As</label>
              <div id="masterAlterLedgerAliasesContainer" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;"></div>
              <button type="button" id="masterAlterLedgerAddAliasBtn" style="padding: 7px 14px; font-size: 12.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; border: 1.5px dashed var(--slate-300); border-radius: 8px; background: #f8fafc; cursor: pointer; color: var(--slate-600); transition: all 0.15s ease;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add A.K.A
              </button>
            </div>

            <!-- Group field (Groups and Group Ledgers) -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" for="masterAlterLedgerGroupCombinedSel" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Group *</label>
              <select class="coa-modal-sel" id="masterAlterLedgerGroupCombinedSel" style="display: none;">
                ${ledgerGroupOptionsHtml}
              </select>
              <div class="kya-searchable-select-wrap" id="masterAlterLedgerGroupCombinedSelSearchableWrap" style="position: relative; width: 100%;">
                <div class="kya-searchable-select-trigger" id="masterAlterLedgerGroupCombinedSelTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                  <span id="masterAlterLedgerGroupCombinedSelTriggerText">${escapeHtml(selectedGroupText)}</span>
                  <span style="font-size: 10px; color: var(--slate-400);">▼</span>
                </div>
                <div class="kya-searchable-select-dropdown" id="masterAlterLedgerGroupCombinedSelDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                  <input type="text" id="masterAlterLedgerGroupCombinedSelSearch" placeholder="Search group or group ledger..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                  <div id="masterAlterLedgerGroupCombinedSelOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                </div>
              </div>
            </div>

            <!-- Additional Information (Dynamic for Trade Receivable / Payable) -->
            <div id="masterAlterLedgerAdditionalInfoWrap" style="display: none; background: #f8fafc; border: 1.5px solid var(--slate-200); border-radius: 10px; padding: 18px; margin-bottom: 20px; transition: all 0.2s ease;">
              
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
                    <input type="text" id="masterAlterLedgerContactName" value="${escapeHtml(currentLedger.contactName || '')}" placeholder="Contact Person / Trade Name (Optional)" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                  </div>
                  <div>
                    <textarea id="masterAlterLedgerAddress" placeholder="Street Address / Building / Area" rows="2" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; resize: vertical; font-family: inherit; outline: none; background: #fff;">${escapeHtml(currentLedger.address || '')}</textarea>
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <input type="text" id="masterAlterLedgerCity" value="${escapeHtml(currentLedger.city || '')}" placeholder="City / Town" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                    <input type="text" id="masterAlterLedgerPincode" value="${escapeHtml(currentLedger.pincode || '')}" placeholder="PIN / Postal Code" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <input type="text" id="masterAlterLedgerState" value="${escapeHtml(currentLedger.state || '')}" placeholder="State (e.g. Maharashtra)" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                    <input type="text" id="masterAlterLedgerCountry" value="${escapeHtml(currentLedger.country || 'India')}" placeholder="Country" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
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
                    <input type="text" id="masterAlterLedgerBankName" value="${escapeHtml(currentLedger.bankName || '')}" placeholder="Bank Name (e.g. HDFC Bank)" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                    <input type="text" id="masterAlterLedgerAccountNo" value="${escapeHtml(currentLedger.accountNo || '')}" placeholder="Account Number" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <input type="text" id="masterAlterLedgerIfsc" value="${escapeHtml(currentLedger.ifsc || '')}" placeholder="IFSC Code (e.g. HDFC0001234)" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff; text-transform: uppercase;">
                    <input type="text" id="masterAlterLedgerBranch" value="${escapeHtml(currentLedger.branch || '')}" placeholder="Branch Name (Optional)" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
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
                  <input type="text" id="masterAlterLedgerGstin" value="${escapeHtml(currentLedger.gstin || '')}" placeholder="GSTIN (e.g. 27AAAAA0000A1Z5)" maxlength="15" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff; text-transform: uppercase;">
                  <input type="text" id="masterAlterLedgerPan" value="${escapeHtml(currentLedger.pan || '')}" placeholder="PAN (e.g. AAAAA0000A)" maxlength="10" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff; text-transform: uppercase;">
                </div>
              </div>

            </div>

            <!-- Opening Balance field (Optional) -->
            <div class="coa-modal-fg" style="margin-bottom: 24px;">
              <label class="coa-modal-label" for="masterAlterLedgerBalance" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Opening Balance (Optional)</label>
              <input class="coa-modal-inp" id="masterAlterLedgerBalance" type="number" min="0" step="0.01" value="${balVal}" placeholder="0.00" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box;">
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; gap: 12px; align-items: center;">
                <button class="btn btn-primary" id="masterAlterLedgerSaveBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Save Changes</button>
                <button class="btn btn-secondary" id="masterAlterLedgerCancelBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Cancel</button>
              </div>
              <button class="btn btn-secondary" id="masterAlterLedgerDelBtn" style="height: 38px; padding: 8px 14px; font-size: 12.5px; font-weight: 600; color: #dc2626; border-color: #fecaca; background: #fef2f2; display: inline-flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
                Delete Ledger
              </button>
            </div>
          </div>
        `;

        renderMasterAlterLedgerAliases(excludeObj);

        const ledgerSelector = contentArea.querySelector('#masterAlterLedgerSelector');
        initSearchableSelectHelper(contentArea, 'masterAlterLedgerSelector', 'Select Ledger to Alter');

        if (ledgerSelector) {
          ledgerSelector.addEventListener('change', () => {
            _masterAlterSelectedLedgerId = Number(ledgerSelector.value);
            updateMasterDeskContent();
          });
        }

        const addAliasBtn = contentArea.querySelector('#masterAlterLedgerAddAliasBtn');
        if (addAliasBtn) {
          addAliasBtn.addEventListener('click', () => {
            _masterAlterLedgerAliases.push('');
            renderMasterAlterLedgerAliases(excludeObj);
            const inputs = contentArea.querySelectorAll('.master-alias-input');
            if (inputs.length) inputs[inputs.length - 1].focus();
          });
        }

        initSearchableSelectHelper(contentArea, 'masterAlterLedgerGroupCombinedSel', 'Select Group');

        const groupSel = contentArea.querySelector('#masterAlterLedgerGroupCombinedSel');
        const addInfoWrap = contentArea.querySelector('#masterAlterLedgerAdditionalInfoWrap');
        const updateAdditionalInfoVisibility = () => {
          if (!groupSel || !addInfoWrap) return;
          const isParty = isTradePartyGroup(groupSel.value);
          addInfoWrap.style.display = isParty ? 'block' : 'none';
        };

        if (groupSel) {
          groupSel.addEventListener('change', updateAdditionalInfoVisibility);
          updateAdditionalInfoVisibility();
        }

        const gstinInp = contentArea.querySelector('#masterAlterLedgerGstin');
        const panInp = contentArea.querySelector('#masterAlterLedgerPan');
        const ifscInp = contentArea.querySelector('#masterAlterLedgerIfsc');

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

        const saveBtn = contentArea.querySelector('#masterAlterLedgerSaveBtn');
        const cancelBtn = contentArea.querySelector('#masterAlterLedgerCancelBtn');
        const delBtn = contentArea.querySelector('#masterAlterLedgerDelBtn');
        const nameInp = contentArea.querySelector('#masterAlterLedgerName');
        const nameErr = contentArea.querySelector('#masterAlterLedgerNameError');

        const validateNameInputLive = () => {
          const val = nameInp ? nameInp.value.trim() : '';
          if (!val) {
            if (nameErr) { nameErr.style.display = 'none'; nameErr.textContent = ''; }
            if (nameInp) nameInp.style.borderColor = 'var(--slate-200)';
            return null;
          }

          const dup = findDuplicateCoaNameOrAlias(val, excludeObj);
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
            validateMasterAlterLedgerAliasesLive(excludeObj);
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

            const liveNameErr = validateNameInputLive();
            if (liveNameErr) {
              if (typeof showToast === 'function') showToast(liveNameErr, 'error');
              else alert(liveNameErr);
              if (nameInp) nameInp.focus();
              return;
            }

            const aliasesValid = validateMasterAlterLedgerAliasesLive(excludeObj);
            if (!aliasesValid) {
              const msg = 'Please fix duplicate or invalid Also Known As entries.';
              if (typeof showToast === 'function') showToast(msg, 'error');
              else alert(msg);
              return;
            }

            const aliases = _masterAlterLedgerAliases.map(a => a.trim()).filter(a => a !== '');
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

              const dupAl = findDuplicateCoaNameOrAlias(al, excludeObj);
              if (dupAl) {
                const typeLabel = dupAl.parentName ? `Alias of "${dupAl.parentName}"` : dupAl.type;
                const msg = `"${al}" already exists (${typeLabel}).`;
                if (typeof showToast === 'function') showToast(msg, 'error');
                else alert(msg);
                return;
              }
            }

            const groupVal = groupSel ? groupSel.value : 'sg:sg-cce';
            const [parentType, parentRawId] = groupVal.split(':');
            let parentSgId = parentRawId;
            let parentGlId = null;

            if (parentType === 'gl') {
              parentGlId = Number(parentRawId);
              const targetGl = typeof coaLedgers !== 'undefined' ? coaLedgers.find(l => l.id === parentGlId) : null;
              if (targetGl) parentSgId = targetGl.sgId;
            }

            const balInp = contentArea.querySelector('#masterAlterLedgerBalance');
            const openingBal = balInp && balInp.value ? parseFloat(balInp.value) : 0;

            const isParty = isTradePartyGroup(groupVal);
            const contactName = isParty && contentArea.querySelector('#masterAlterLedgerContactName') ? contentArea.querySelector('#masterAlterLedgerContactName').value.trim() : '';
            const address = isParty && contentArea.querySelector('#masterAlterLedgerAddress') ? contentArea.querySelector('#masterAlterLedgerAddress').value.trim() : '';
            const city = isParty && contentArea.querySelector('#masterAlterLedgerCity') ? contentArea.querySelector('#masterAlterLedgerCity').value.trim() : '';
            const pincode = isParty && contentArea.querySelector('#masterAlterLedgerPincode') ? contentArea.querySelector('#masterAlterLedgerPincode').value.trim() : '';
            const state = isParty && contentArea.querySelector('#masterAlterLedgerState') ? contentArea.querySelector('#masterAlterLedgerState').value.trim() : '';
            const country = isParty && contentArea.querySelector('#masterAlterLedgerCountry') ? contentArea.querySelector('#masterAlterLedgerCountry').value.trim() : 'India';
            const bankName = isParty && contentArea.querySelector('#masterAlterLedgerBankName') ? contentArea.querySelector('#masterAlterLedgerBankName').value.trim() : '';
            const accountNo = isParty && contentArea.querySelector('#masterAlterLedgerAccountNo') ? contentArea.querySelector('#masterAlterLedgerAccountNo').value.trim() : '';
            const ifsc = isParty && contentArea.querySelector('#masterAlterLedgerIfsc') ? contentArea.querySelector('#masterAlterLedgerIfsc').value.trim() : '';
            const branch = isParty && contentArea.querySelector('#masterAlterLedgerBranch') ? contentArea.querySelector('#masterAlterLedgerBranch').value.trim() : '';
            const gstin = isParty && contentArea.querySelector('#masterAlterLedgerGstin') ? contentArea.querySelector('#masterAlterLedgerGstin').value.trim() : '';
            const pan = isParty && contentArea.querySelector('#masterAlterLedgerPan') ? contentArea.querySelector('#masterAlterLedgerPan').value.trim() : '';

            currentLedger.name = name;
            currentLedger.aliases = aliases;
            currentLedger.sgId = parentSgId;
            currentLedger.glId = parentGlId;
            currentLedger.openingBalance = openingBal;
            if (isParty) {
              currentLedger.contactName = contactName;
              currentLedger.address = address;
              currentLedger.city = city;
              currentLedger.pincode = pincode;
              currentLedger.state = state;
              currentLedger.country = country;
              currentLedger.bankName = bankName;
              currentLedger.accountNo = accountNo;
              currentLedger.ifsc = ifsc;
              currentLedger.branch = branch;
              currentLedger.gstin = gstin;
              currentLedger.pan = pan;
            }

            if (typeof renderChartPanel === 'function') renderChartPanel();
            if (typeof refreshAllReports === 'function') refreshAllReports();
            if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
            if (typeof populateSalesCustomers === 'function') populateSalesCustomers();
            if (typeof populatePurchaseVendors === 'function') populatePurchaseVendors();

            showToast(`Ledger "${name}" updated successfully.`, 'success');
            _masterAlterSelectedLedgerId = currentLedger.id;
            updateMasterDeskContent();
          });
        }

        if (delBtn) {
          delBtn.addEventListener('click', () => {
            if (confirm(`Are you sure you want to delete ledger "${currentLedger.name}"?`)) {
              if (typeof coaLedgers !== 'undefined') {
                const idx = coaLedgers.findIndex(l => l.id === currentLedger.id);
                if (idx >= 0) coaLedgers.splice(idx, 1);
              }

              if (typeof renderChartPanel === 'function') renderChartPanel();
              if (typeof refreshAllReports === 'function') refreshAllReports();
              if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
              if (typeof populateSalesCustomers === 'function') populateSalesCustomers();
              if (typeof populatePurchaseVendors === 'function') populatePurchaseVendors();

              showToast(`Ledger "${currentLedger.name}" deleted.`, 'info');
              _masterAlterSelectedLedgerId = null;
              updateMasterDeskContent();
            }
          });
        }

        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => {
            updateMasterDeskContent();
          });
        }

      } else if (currentMasterDeskTab === 'customers') {
        const customers = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];

        if (customers.length === 0) {
          contentArea.innerHTML = `
            <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 32px 24px; background: var(--white); text-align: center; margin: 0 0 20px 0;">
              <div style="font-size: 14px; font-weight: 600; color: var(--slate-600); margin-bottom: 8px;">No customers found to alter.</div>
              <div style="font-size: 12.5px; color: var(--slate-400); margin-bottom: 16px;">Create a new customer first using the Create tab.</div>
              <button class="btn btn-primary" id="btnAlterGoToCreateCustomer" style="font-size: 13px; font-weight: 600; padding: 8px 16px;">Go to Create Customer</button>
            </div>
          `;
          const btnGo = contentArea.querySelector('#btnAlterGoToCreateCustomer');
          if (btnGo) btnGo.addEventListener('click', () => setMasterDeskSubtype('Create'));
          return;
        }

        let currentCustomer = customers.find(c => c.id === _masterAlterSelectedCustomerId);
        if (!currentCustomer) {
          currentCustomer = customers[0];
          _masterAlterSelectedCustomerId = currentCustomer.id;
        }

        _masterAlterCustomerAliases = currentCustomer.aliases ? [...currentCustomer.aliases] : [];

        const excludeObj = {
          id: currentCustomer.id,
          originalName: currentCustomer.name
        };

        let customerSelectorOptionsHtml = '';
        customers.forEach(c => {
          const isSel = (c.id === currentCustomer.id);
          customerSelectorOptionsHtml += `<option value="${c.id}" ${isSel ? 'selected' : ''}>${escapeHtml(c.name)}</option>`;
        });

        const balVal = (currentCustomer.openingBalance !== undefined && currentCustomer.openingBalance !== null && currentCustomer.openingBalance !== 0) ? currentCustomer.openingBalance : '';

        contentArea.innerHTML = `
          <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--white); margin: 0 0 20px 0;">
            <h3 style="font-size: 15px; font-weight: 700; color: var(--slate-800); margin: 0 0 18px 0; display: flex; align-items: center; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Alter Customer
            </h3>

            <!-- Select Customer to Alter field -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" for="masterAlterCustomerSelector" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Select Customer to Alter *</label>
              <select class="coa-modal-sel" id="masterAlterCustomerSelector" style="display: none;">
                ${customerSelectorOptionsHtml}
              </select>
              <div class="kya-searchable-select-wrap" id="masterAlterCustomerSelectorSearchableWrap" style="position: relative; width: 100%;">
                <div class="kya-searchable-select-trigger" id="masterAlterCustomerSelectorTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                  <span id="masterAlterCustomerSelectorTriggerText">${escapeHtml(currentCustomer.name)}</span>
                  <span style="font-size: 10px; color: var(--slate-400);">▼</span>
                </div>
                <div class="kya-searchable-select-dropdown" id="masterAlterCustomerSelectorDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                  <input type="text" id="masterAlterCustomerSelectorSearch" placeholder="Search customer..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                  <div id="masterAlterCustomerSelectorOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                </div>
              </div>
            </div>

            <!-- Name field -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" for="masterAlterCustomerName" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Name *</label>
              <input class="coa-modal-inp" id="masterAlterCustomerName" value="${escapeHtml(currentCustomer.name)}" placeholder="e.g. Acme Corp / Rahul Sharma / TechNova Ltd" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box;">
              <div id="masterAlterCustomerNameError" style="display: none; font-size: 12px; font-weight: 600; color: #dc2626; margin-top: 5px;"></div>
            </div>

            <!-- Also Known As field -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Also Known As</label>
              <div id="masterAlterCustomerAliasesContainer" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;"></div>
              <button type="button" id="masterAlterCustomerAddAliasBtn" style="padding: 7px 14px; font-size: 12.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; border: 1.5px dashed var(--slate-300); border-radius: 8px; background: #f8fafc; cursor: pointer; color: var(--slate-600); transition: all 0.15s ease;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add A.K.A
              </button>
            </div>

            <!-- Additional Information (Party Profile) -->
            <div id="masterAlterCustomerAdditionalInfoWrap" style="background: #f8fafc; border: 1.5px solid var(--slate-200); border-radius: 10px; padding: 18px; margin-bottom: 20px;">
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
                    <input type="text" id="masterAlterCustomerContactName" value="${escapeHtml(currentCustomer.contactName || '')}" placeholder="Contact Person / Trade Name (Optional)" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                  </div>
                  <div>
                    <textarea id="masterAlterCustomerAddress" placeholder="Street Address / Building / Area" rows="2" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; resize: vertical; font-family: inherit; outline: none; background: #fff;">${escapeHtml(currentCustomer.address || '')}</textarea>
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <input type="text" id="masterAlterCustomerCity" value="${escapeHtml(currentCustomer.city || '')}" placeholder="City / Town" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                    <input type="text" id="masterAlterCustomerPincode" value="${escapeHtml(currentCustomer.pincode || '')}" placeholder="PIN / Postal Code" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <input type="text" id="masterAlterCustomerState" value="${escapeHtml(currentCustomer.state || '')}" placeholder="State (e.g. Maharashtra)" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                    <input type="text" id="masterAlterCustomerCountry" value="${escapeHtml(currentCustomer.country || 'India')}" placeholder="Country" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
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
                    <input type="text" id="masterAlterCustomerBankName" value="${escapeHtml(currentCustomer.bankName || '')}" placeholder="Bank Name (e.g. HDFC Bank)" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                    <input type="text" id="masterAlterCustomerAccountNo" value="${escapeHtml(currentCustomer.accountNo || '')}" placeholder="Account Number" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <input type="text" id="masterAlterCustomerIfsc" value="${escapeHtml(currentCustomer.ifsc || '')}" placeholder="IFSC Code (e.g. HDFC0001234)" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff; text-transform: uppercase;">
                    <input type="text" id="masterAlterCustomerBranch" value="${escapeHtml(currentCustomer.branch || '')}" placeholder="Branch Name (Optional)" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
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
                  <input type="text" id="masterAlterCustomerGstin" value="${escapeHtml(currentCustomer.gstin || '')}" placeholder="GSTIN (e.g. 27AAAAA0000A1Z5)" maxlength="15" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff; text-transform: uppercase;">
                  <input type="text" id="masterAlterCustomerPan" value="${escapeHtml(currentCustomer.pan || '')}" placeholder="PAN (e.g. AAAAA0000A)" maxlength="10" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff; text-transform: uppercase;">
                </div>
              </div>

            </div>

            <!-- Opening Balance field (Optional) -->
            <div class="coa-modal-fg" style="margin-bottom: 24px;">
              <label class="coa-modal-label" for="masterAlterCustomerBalance" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Opening Balance (Optional)</label>
              <input class="coa-modal-inp" id="masterAlterCustomerBalance" type="number" min="0" step="0.01" value="${balVal}" placeholder="0.00" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box;">
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; gap: 12px; align-items: center;">
                <button class="btn btn-primary" id="masterAlterCustomerSaveBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Save Changes</button>
                <button class="btn btn-secondary" id="masterAlterCustomerCancelBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Cancel</button>
              </div>
              <button class="btn btn-secondary" id="masterAlterCustomerDelBtn" style="height: 38px; padding: 8px 14px; font-size: 12.5px; font-weight: 600; color: #dc2626; border-color: #fecaca; background: #fef2f2; display: inline-flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
                Delete Customer
              </button>
            </div>
          </div>
        `;

        renderMasterAlterCustomerAliases(excludeObj);

        const customerSelector = contentArea.querySelector('#masterAlterCustomerSelector');
        initSearchableSelectHelper(contentArea, 'masterAlterCustomerSelector', 'Select Customer to Alter');

        if (customerSelector) {
          customerSelector.addEventListener('change', () => {
            _masterAlterSelectedCustomerId = customerSelector.value;
            updateMasterDeskContent();
          });
        }

        const addAliasBtn = contentArea.querySelector('#masterAlterCustomerAddAliasBtn');
        if (addAliasBtn) {
          addAliasBtn.addEventListener('click', () => {
            _masterAlterCustomerAliases.push('');
            renderMasterAlterCustomerAliases(excludeObj);
            const inputs = contentArea.querySelectorAll('.master-alias-input');
            if (inputs.length) inputs[inputs.length - 1].focus();
          });
        }

        const gstinInp = contentArea.querySelector('#masterAlterCustomerGstin');
        const panInp = contentArea.querySelector('#masterAlterCustomerPan');
        const ifscInp = contentArea.querySelector('#masterAlterCustomerIfsc');

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

        const saveBtn = contentArea.querySelector('#masterAlterCustomerSaveBtn');
        const cancelBtn = contentArea.querySelector('#masterAlterCustomerCancelBtn');
        const delBtn = contentArea.querySelector('#masterAlterCustomerDelBtn');
        const nameInp = contentArea.querySelector('#masterAlterCustomerName');
        const nameErr = contentArea.querySelector('#masterAlterCustomerNameError');

        const validateNameInputLive = () => {
          const val = nameInp ? nameInp.value.trim() : '';
          if (!val) {
            if (nameErr) { nameErr.style.display = 'none'; nameErr.textContent = ''; }
            if (nameInp) nameInp.style.borderColor = 'var(--slate-200)';
            return null;
          }

          const dup = findDuplicateCoaNameOrAlias(val, excludeObj);
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
            validateMasterAlterCustomerAliasesLive(excludeObj);
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

            const liveNameErr = validateNameInputLive();
            if (liveNameErr) {
              if (typeof showToast === 'function') showToast(liveNameErr, 'error');
              else alert(liveNameErr);
              if (nameInp) nameInp.focus();
              return;
            }

            const aliasesValid = validateMasterAlterCustomerAliasesLive(excludeObj);
            if (!aliasesValid) {
              const msg = 'Please fix duplicate or invalid Also Known As entries.';
              if (typeof showToast === 'function') showToast(msg, 'error');
              else alert(msg);
              return;
            }

            const aliases = _masterAlterCustomerAliases.map(a => a.trim()).filter(a => a !== '');
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

              const dupAl = findDuplicateCoaNameOrAlias(al, excludeObj);
              if (dupAl) {
                const typeLabel = dupAl.parentName ? `Alias of "${dupAl.parentName}"` : dupAl.type;
                const msg = `"${al}" already exists (${typeLabel}).`;
                if (typeof showToast === 'function') showToast(msg, 'error');
                else alert(msg);
                return;
              }
            }

            const contactName = contentArea.querySelector('#masterAlterCustomerContactName') ? contentArea.querySelector('#masterAlterCustomerContactName').value.trim() : '';
            const address = contentArea.querySelector('#masterAlterCustomerAddress') ? contentArea.querySelector('#masterAlterCustomerAddress').value.trim() : '';
            const city = contentArea.querySelector('#masterAlterCustomerCity') ? contentArea.querySelector('#masterAlterCustomerCity').value.trim() : '';
            const pincode = contentArea.querySelector('#masterAlterCustomerPincode') ? contentArea.querySelector('#masterAlterCustomerPincode').value.trim() : '';
            const state = contentArea.querySelector('#masterAlterCustomerState') ? contentArea.querySelector('#masterAlterCustomerState').value.trim() : '';
            const country = contentArea.querySelector('#masterAlterCustomerCountry') ? contentArea.querySelector('#masterAlterCustomerCountry').value.trim() : 'India';
            const bankName = contentArea.querySelector('#masterAlterCustomerBankName') ? contentArea.querySelector('#masterAlterCustomerBankName').value.trim() : '';
            const accountNo = contentArea.querySelector('#masterAlterCustomerAccountNo') ? contentArea.querySelector('#masterAlterCustomerAccountNo').value.trim() : '';
            const ifsc = contentArea.querySelector('#masterAlterCustomerIfsc') ? contentArea.querySelector('#masterAlterCustomerIfsc').value.trim() : '';
            const branch = contentArea.querySelector('#masterAlterCustomerBranch') ? contentArea.querySelector('#masterAlterCustomerBranch').value.trim() : '';
            const gstin = contentArea.querySelector('#masterAlterCustomerGstin') ? contentArea.querySelector('#masterAlterCustomerGstin').value.trim() : '';
            const pan = contentArea.querySelector('#masterAlterCustomerPan') ? contentArea.querySelector('#masterAlterCustomerPan').value.trim() : '';
            const balInp = contentArea.querySelector('#masterAlterCustomerBalance');
            const openingBal = balInp && balInp.value ? parseFloat(balInp.value) : 0;

            currentCustomer.name = name;
            currentCustomer.aliases = aliases;
            currentCustomer.contactName = contactName;
            currentCustomer.address = address;
            currentCustomer.city = city;
            currentCustomer.pincode = pincode;
            currentCustomer.state = state;
            currentCustomer.country = country;
            currentCustomer.bankName = bankName;
            currentCustomer.accountNo = accountNo;
            currentCustomer.ifsc = ifsc;
            currentCustomer.branch = branch;
            currentCustomer.gstin = gstin;
            currentCustomer.pan = pan;
            currentCustomer.openingBalance = openingBal;

            // Recalculate Trade Receivables opening balance in CoA
            if (typeof coaLedgers !== 'undefined') {
              const tr = coaLedgers.find(l => l.type === 'ledger' && l.sgId === 'sg-tr' && l.name === 'Trade Receivables');
              if (tr) tr.openingBalance = customers.reduce((sum, item) => sum + (parseFloat(item.openingBalance) || 0), 0);
            }

            if (typeof populateSalesCustomers === 'function') populateSalesCustomers();
            if (typeof refreshAllReports === 'function') refreshAllReports();
            if (typeof triggerAutoBackup === 'function') triggerAutoBackup();

            showToast(`Customer "${name}" updated successfully.`, 'success');
            _masterAlterSelectedCustomerId = currentCustomer.id;
            updateMasterDeskContent();
          });
        }

        if (delBtn) {
          delBtn.addEventListener('click', () => {
            if (confirm(`Are you sure you want to delete customer "${currentCustomer.name}"?`)) {
              const idx = customers.findIndex(item => item.id === currentCustomer.id);
              if (idx >= 0) {
                customers.splice(idx, 1);
                if (typeof coaLedgers !== 'undefined') {
                  const tr = coaLedgers.find(l => l.type === 'ledger' && l.sgId === 'sg-tr' && l.name === 'Trade Receivables');
                  if (tr) tr.openingBalance = customers.reduce((sum, item) => sum + (parseFloat(item.openingBalance) || 0), 0);
                }
                if (typeof populateSalesCustomers === 'function') populateSalesCustomers();
                if (typeof refreshAllReports === 'function') refreshAllReports();
                if (typeof triggerAutoBackup === 'function') triggerAutoBackup();

                showToast(`Customer "${currentCustomer.name}" deleted.`, 'info');
                _masterAlterSelectedCustomerId = null;
                updateMasterDeskContent();
              }
            }
          });
        }

        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => {
            updateMasterDeskContent();
          });
        }

      } else if (currentMasterDeskTab === 'suppliers') {
        const suppliers = typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : [];

        if (suppliers.length === 0) {
          contentArea.innerHTML = `
            <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 32px 24px; background: var(--white); text-align: center; margin: 0 0 20px 0;">
              <div style="font-size: 14px; font-weight: 600; color: var(--slate-600); margin-bottom: 8px;">No suppliers found to alter.</div>
              <div style="font-size: 12.5px; color: var(--slate-400); margin-bottom: 16px;">Create a new supplier first using the Create tab.</div>
              <button class="btn btn-primary" id="btnAlterGoToCreateSupplier" style="font-size: 13px; font-weight: 600; padding: 8px 16px;">Go to Create Supplier</button>
            </div>
          `;
          const btnGo = contentArea.querySelector('#btnAlterGoToCreateSupplier');
          if (btnGo) btnGo.addEventListener('click', () => setMasterDeskSubtype('Create'));
          return;
        }

        let currentSupplier = suppliers.find(s => s.id === _masterAlterSelectedSupplierId);
        if (!currentSupplier) {
          currentSupplier = suppliers[0];
          _masterAlterSelectedSupplierId = currentSupplier.id;
        }

        _masterAlterSupplierAliases = currentSupplier.aliases ? [...currentSupplier.aliases] : [];

        const excludeObj = {
          id: currentSupplier.id,
          originalName: currentSupplier.name
        };

        let supplierSelectorOptionsHtml = '';
        suppliers.forEach(s => {
          const isSel = (s.id === currentSupplier.id);
          supplierSelectorOptionsHtml += `<option value="${s.id}" ${isSel ? 'selected' : ''}>${escapeHtml(s.name)}</option>`;
        });

        const balVal = (currentSupplier.openingBalance !== undefined && currentSupplier.openingBalance !== null && currentSupplier.openingBalance !== 0) ? currentSupplier.openingBalance : '';

        contentArea.innerHTML = `
          <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--white); margin: 0 0 20px 0;">
            <h3 style="font-size: 15px; font-weight: 700; color: var(--slate-800); margin: 0 0 18px 0; display: flex; align-items: center; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="1" y="3" width="15" height="13"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
              Alter Supplier / Vendor
            </h3>

            <!-- Select Supplier to Alter field -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" for="masterAlterSupplierSelector" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Select Supplier to Alter *</label>
              <select class="coa-modal-sel" id="masterAlterSupplierSelector" style="display: none;">
                ${supplierSelectorOptionsHtml}
              </select>
              <div class="kya-searchable-select-wrap" id="masterAlterSupplierSelectorSearchableWrap" style="position: relative; width: 100%;">
                <div class="kya-searchable-select-trigger" id="masterAlterSupplierSelectorTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                  <span id="masterAlterSupplierSelectorTriggerText">${escapeHtml(currentSupplier.name)}</span>
                  <span style="font-size: 10px; color: var(--slate-400);">▼</span>
                </div>
                <div class="kya-searchable-select-dropdown" id="masterAlterSupplierSelectorDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                  <input type="text" id="masterAlterSupplierSelectorSearch" placeholder="Search supplier..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                  <div id="masterAlterSupplierSelectorOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                </div>
              </div>
            </div>

            <!-- Name field -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" for="masterAlterSupplierName" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Name *</label>
              <input class="coa-modal-inp" id="masterAlterSupplierName" value="${escapeHtml(currentSupplier.name)}" placeholder="e.g. Apex Industries / Global Supplies Ltd" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box;">
              <div id="masterAlterSupplierNameError" style="display: none; font-size: 12px; font-weight: 600; color: #dc2626; margin-top: 5px;"></div>
            </div>

            <!-- Also Known As field -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Also Known As</label>
              <div id="masterAlterSupplierAliasesContainer" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;"></div>
              <button type="button" id="masterAlterSupplierAddAliasBtn" style="padding: 7px 14px; font-size: 12.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; border: 1.5px dashed var(--slate-300); border-radius: 8px; background: #f8fafc; cursor: pointer; color: var(--slate-600); transition: all 0.15s ease;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add A.K.A
              </button>
            </div>

            <!-- Additional Information (Party Profile) -->
            <div id="masterAlterSupplierAdditionalInfoWrap" style="background: #f8fafc; border: 1.5px solid var(--slate-200); border-radius: 10px; padding: 18px; margin-bottom: 20px;">
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
                    <input type="text" id="masterAlterSupplierContactName" value="${escapeHtml(currentSupplier.contactName || '')}" placeholder="Contact Person / Trade Name (Optional)" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                  </div>
                  <div>
                    <textarea id="masterAlterSupplierAddress" placeholder="Street Address / Building / Area" rows="2" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; resize: vertical; font-family: inherit; outline: none; background: #fff;">${escapeHtml(currentSupplier.address || '')}</textarea>
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <input type="text" id="masterAlterSupplierCity" value="${escapeHtml(currentSupplier.city || '')}" placeholder="City / Town" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                    <input type="text" id="masterAlterSupplierPincode" value="${escapeHtml(currentSupplier.pincode || '')}" placeholder="PIN / Postal Code" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <input type="text" id="masterAlterSupplierState" value="${escapeHtml(currentSupplier.state || '')}" placeholder="State (e.g. Maharashtra)" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                    <input type="text" id="masterAlterSupplierCountry" value="${escapeHtml(currentSupplier.country || 'India')}" placeholder="Country" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
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
                    <input type="text" id="masterAlterSupplierBankName" value="${escapeHtml(currentSupplier.bankName || '')}" placeholder="Bank Name (e.g. ICICI Bank)" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                    <input type="text" id="masterAlterSupplierAccountNo" value="${escapeHtml(currentSupplier.accountNo || '')}" placeholder="Account Number" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <input type="text" id="masterAlterSupplierIfsc" value="${escapeHtml(currentSupplier.ifsc || '')}" placeholder="IFSC Code (e.g. ICIC0001234)" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff; text-transform: uppercase;">
                    <input type="text" id="masterAlterSupplierBranch" value="${escapeHtml(currentSupplier.branch || '')}" placeholder="Branch Name (Optional)" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
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
                  <input type="text" id="masterAlterSupplierGstin" value="${escapeHtml(currentSupplier.gstin || '')}" placeholder="GSTIN (e.g. 27AAAAA0000A1Z5)" maxlength="15" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff; text-transform: uppercase;">
                  <input type="text" id="masterAlterSupplierPan" value="${escapeHtml(currentSupplier.pan || '')}" placeholder="PAN (e.g. AAAAA0000A)" maxlength="10" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff; text-transform: uppercase;">
                </div>
              </div>

            </div>

            <!-- Opening Balance field (Optional) -->
            <div class="coa-modal-fg" style="margin-bottom: 24px;">
              <label class="coa-modal-label" for="masterAlterSupplierBalance" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Opening Balance (Optional)</label>
              <input class="coa-modal-inp" id="masterAlterSupplierBalance" type="number" min="0" step="0.01" value="${balVal}" placeholder="0.00" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box;">
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; gap: 12px; align-items: center;">
                <button class="btn btn-primary" id="masterAlterSupplierSaveBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Save Changes</button>
                <button class="btn btn-secondary" id="masterAlterSupplierCancelBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Cancel</button>
              </div>
              <button class="btn btn-secondary" id="masterAlterSupplierDelBtn" style="height: 38px; padding: 8px 14px; font-size: 12.5px; font-weight: 600; color: #dc2626; border-color: #fecaca; background: #fef2f2; display: inline-flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
                Delete Supplier
              </button>
            </div>
          </div>
        `;

        renderMasterAlterSupplierAliases(excludeObj);

        const supplierSelector = contentArea.querySelector('#masterAlterSupplierSelector');
        initSearchableSelectHelper(contentArea, 'masterAlterSupplierSelector', 'Select Supplier to Alter');

        if (supplierSelector) {
          supplierSelector.addEventListener('change', () => {
            _masterAlterSelectedSupplierId = supplierSelector.value;
            updateMasterDeskContent();
          });
        }

        const addAliasBtn = contentArea.querySelector('#masterAlterSupplierAddAliasBtn');
        if (addAliasBtn) {
          addAliasBtn.addEventListener('click', () => {
            _masterAlterSupplierAliases.push('');
            renderMasterAlterSupplierAliases(excludeObj);
            const inputs = contentArea.querySelectorAll('.master-alias-input');
            if (inputs.length) inputs[inputs.length - 1].focus();
          });
        }

        const gstinInp = contentArea.querySelector('#masterAlterSupplierGstin');
        const panInp = contentArea.querySelector('#masterAlterSupplierPan');
        const ifscInp = contentArea.querySelector('#masterAlterSupplierIfsc');

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

        const saveBtn = contentArea.querySelector('#masterAlterSupplierSaveBtn');
        const cancelBtn = contentArea.querySelector('#masterAlterSupplierCancelBtn');
        const delBtn = contentArea.querySelector('#masterAlterSupplierDelBtn');
        const nameInp = contentArea.querySelector('#masterAlterSupplierName');
        const nameErr = contentArea.querySelector('#masterAlterSupplierNameError');

        const validateNameInputLive = () => {
          const val = nameInp ? nameInp.value.trim() : '';
          if (!val) {
            if (nameErr) { nameErr.style.display = 'none'; nameErr.textContent = ''; }
            if (nameInp) nameInp.style.borderColor = 'var(--slate-200)';
            return null;
          }

          const dup = findDuplicateCoaNameOrAlias(val, excludeObj);
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
            validateMasterAlterSupplierAliasesLive(excludeObj);
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

            const liveNameErr = validateNameInputLive();
            if (liveNameErr) {
              if (typeof showToast === 'function') showToast(liveNameErr, 'error');
              else alert(liveNameErr);
              if (nameInp) nameInp.focus();
              return;
            }

            const aliasesValid = validateMasterAlterSupplierAliasesLive(excludeObj);
            if (!aliasesValid) {
              const msg = 'Please fix duplicate or invalid Also Known As entries.';
              if (typeof showToast === 'function') showToast(msg, 'error');
              else alert(msg);
              return;
            }

            const aliases = _masterAlterSupplierAliases.map(a => a.trim()).filter(a => a !== '');
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

              const dupAl = findDuplicateCoaNameOrAlias(al, excludeObj);
              if (dupAl) {
                const typeLabel = dupAl.parentName ? `Alias of "${dupAl.parentName}"` : dupAl.type;
                const msg = `"${al}" already exists (${typeLabel}).`;
                if (typeof showToast === 'function') showToast(msg, 'error');
                else alert(msg);
                return;
              }
            }

            const contactName = contentArea.querySelector('#masterAlterSupplierContactName') ? contentArea.querySelector('#masterAlterSupplierContactName').value.trim() : '';
            const address = contentArea.querySelector('#masterAlterSupplierAddress') ? contentArea.querySelector('#masterAlterSupplierAddress').value.trim() : '';
            const city = contentArea.querySelector('#masterAlterSupplierCity') ? contentArea.querySelector('#masterAlterSupplierCity').value.trim() : '';
            const pincode = contentArea.querySelector('#masterAlterSupplierPincode') ? contentArea.querySelector('#masterAlterSupplierPincode').value.trim() : '';
            const state = contentArea.querySelector('#masterAlterSupplierState') ? contentArea.querySelector('#masterAlterSupplierState').value.trim() : '';
            const country = contentArea.querySelector('#masterAlterSupplierCountry') ? contentArea.querySelector('#masterAlterSupplierCountry').value.trim() : 'India';
            const bankName = contentArea.querySelector('#masterAlterSupplierBankName') ? contentArea.querySelector('#masterAlterSupplierBankName').value.trim() : '';
            const accountNo = contentArea.querySelector('#masterAlterSupplierAccountNo') ? contentArea.querySelector('#masterAlterSupplierAccountNo').value.trim() : '';
            const ifsc = contentArea.querySelector('#masterAlterSupplierIfsc') ? contentArea.querySelector('#masterAlterSupplierIfsc').value.trim() : '';
            const branch = contentArea.querySelector('#masterAlterSupplierBranch') ? contentArea.querySelector('#masterAlterSupplierBranch').value.trim() : '';
            const gstin = contentArea.querySelector('#masterAlterSupplierGstin') ? contentArea.querySelector('#masterAlterSupplierGstin').value.trim() : '';
            const pan = contentArea.querySelector('#masterAlterSupplierPan') ? contentArea.querySelector('#masterAlterSupplierPan').value.trim() : '';
            const balInp = contentArea.querySelector('#masterAlterSupplierBalance');
            const openingBal = balInp && balInp.value ? parseFloat(balInp.value) : 0;

            currentSupplier.name = name;
            currentSupplier.aliases = aliases;
            currentSupplier.contactName = contactName;
            currentSupplier.address = address;
            currentSupplier.city = city;
            currentSupplier.pincode = pincode;
            currentSupplier.state = state;
            currentSupplier.country = country;
            currentSupplier.bankName = bankName;
            currentSupplier.accountNo = accountNo;
            currentSupplier.ifsc = ifsc;
            currentSupplier.branch = branch;
            currentSupplier.gstin = gstin;
            currentSupplier.pan = pan;
            currentSupplier.openingBalance = openingBal;

            // Recalculate Trade Payables opening balance in CoA
            if (typeof coaLedgers !== 'undefined') {
              const tp = coaLedgers.find(l => l.type === 'ledger' && l.sgId === 'sg-tp' && l.name === 'Trade Payables');
              if (tp) tp.openingBalance = suppliers.reduce((sum, item) => sum + (parseFloat(item.openingBalance) || 0), 0);
            }

            if (typeof populatePurchaseVendors === 'function') populatePurchaseVendors();
            if (typeof refreshAllReports === 'function') refreshAllReports();
            if (typeof triggerAutoBackup === 'function') triggerAutoBackup();

            showToast(`Supplier "${name}" updated successfully.`, 'success');
            _masterAlterSelectedSupplierId = currentSupplier.id;
            updateMasterDeskContent();
          });
        }

        if (delBtn) {
          delBtn.addEventListener('click', () => {
            if (confirm(`Are you sure you want to delete supplier "${currentSupplier.name}"?`)) {
              const idx = suppliers.findIndex(item => item.id === currentSupplier.id);
              if (idx >= 0) {
                suppliers.splice(idx, 1);
                if (typeof coaLedgers !== 'undefined') {
                  const tp = coaLedgers.find(l => l.type === 'ledger' && l.sgId === 'sg-tp' && l.name === 'Trade Payables');
                  if (tp) tp.openingBalance = suppliers.reduce((sum, item) => sum + (parseFloat(item.openingBalance) || 0), 0);
                }
                if (typeof populatePurchaseVendors === 'function') populatePurchaseVendors();
                if (typeof refreshAllReports === 'function') refreshAllReports();
                if (typeof triggerAutoBackup === 'function') triggerAutoBackup();

                showToast(`Supplier "${currentSupplier.name}" deleted.`, 'info');
                _masterAlterSelectedSupplierId = null;
                updateMasterDeskContent();
              }
            }
          });
        }

        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => {
            updateMasterDeskContent();
          });
        }
      } else if (currentMasterDeskTab === 'stock_group') {
        if (_masterStockGroups.length === 0) {
          contentArea.innerHTML = `
            <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 32px 24px; background: var(--white); text-align: center; margin: 0 0 20px 0;">
              <div style="font-size: 14px; font-weight: 600; color: var(--slate-600); margin-bottom: 8px;">No stock groups found to alter.</div>
              <div style="font-size: 12.5px; color: var(--slate-400); margin-bottom: 16px;">Create a new stock group first using the Create tab.</div>
              <button class="btn btn-primary" id="btnAlterGoToCreateStockGroup" style="font-size: 13px; font-weight: 600; padding: 8px 16px;">Go to Create Stock Group</button>
            </div>
          `;
          const btnGo = contentArea.querySelector('#btnAlterGoToCreateStockGroup');
          if (btnGo) btnGo.addEventListener('click', () => setMasterDeskSubtype('Create'));
          return;
        }

        let currentGroup = _masterStockGroups.find(g => g.id === _masterAlterSelectedStockGroupId);
        if (!currentGroup) {
          currentGroup = _masterStockGroups[0];
          _masterAlterSelectedStockGroupId = currentGroup.id;
        }

        _masterAlterStockGroupAliases = currentGroup.aliases ? [...currentGroup.aliases] : [];

        let groupSelectorOpts = '';
        _masterStockGroups.forEach(g => {
          const isSel = (g.id === currentGroup.id);
          groupSelectorOpts += `<option value="${g.id}" ${isSel ? 'selected' : ''}>${escapeHtml(g.name)}</option>`;
        });

        let underOpts = getStockGroupUnderOptionsHtml(currentGroup.parent || 'Inventories', currentGroup.id);

        contentArea.innerHTML = `
          <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--white); margin: 0 0 20px 0;">
            <h3 style="font-size: 15px; font-weight: 700; color: var(--slate-800); margin: 0 0 18px 0; display: flex; align-items: center; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              Alter Stock Group
            </h3>

            <!-- Select to Alter -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" for="masterAlterStockGroupSelector" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Select Stock Group to Alter *</label>
              <select class="coa-modal-sel" id="masterAlterStockGroupSelector" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box; background: #fff; outline: none;">
                ${groupSelectorOpts}
              </select>
            </div>

            <!-- Name -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" for="masterAlterStockGroupName" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Name *</label>
              <input class="coa-modal-inp" id="masterAlterStockGroupName" value="${escapeHtml(currentGroup.name)}" placeholder="e.g. Raw Materials" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none;">
            </div>

            <!-- Also Known As -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Also Known As</label>
              <div id="masterAlterStockGroupAliasesContainer" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;"></div>
              <button type="button" id="masterAlterStockGroupAddAliasBtn" style="padding: 7px 14px; font-size: 12.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; border: 1.5px dashed var(--slate-300); border-radius: 8px; background: #f8fafc; cursor: pointer; color: var(--slate-600); transition: all 0.15s ease;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add A.K.A
              </button>
            </div>

            <!-- Under (Searchable Option) -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" for="masterAlterStockGroupUnderSel" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Under *</label>
              <select class="coa-modal-sel" id="masterAlterStockGroupUnderSel" style="display: none;">
                ${underOpts}
              </select>
              <div class="kya-searchable-select-wrap" id="masterAlterStockGroupUnderSelSearchableWrap" style="position: relative; width: 100%;">
                <div class="kya-searchable-select-trigger" id="masterAlterStockGroupUnderSelTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                  <span id="masterAlterStockGroupUnderSelTriggerText">${escapeHtml(currentGroup.parent && currentGroup.parent !== 'Primary' ? currentGroup.parent : 'Inventories')}</span>
                  <span style="font-size: 10px; color: var(--slate-400);">▼</span>
                </div>
                <div class="kya-searchable-select-dropdown" id="masterAlterStockGroupUnderSelDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                  <input type="text" id="masterAlterStockGroupUnderSelSearch" placeholder="Search parent stock group..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                  <div id="masterAlterStockGroupUnderSelOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                </div>
              </div>
            </div>

            <!-- Should Quantities be added? -->
            <div class="coa-modal-fg" style="margin-bottom: 24px;">
              <label class="coa-modal-label" for="masterAlterStockGroupAddQty" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Should quantities of items be added? *</label>
              <select class="coa-modal-sel" id="masterAlterStockGroupAddQty" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box; background: #fff; outline: none;">
                <option value="Yes" ${currentGroup.addQty === 'Yes' ? 'selected' : ''}>Yes</option>
                <option value="No" ${currentGroup.addQty === 'No' ? 'selected' : ''}>No</option>
              </select>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; gap: 12px; align-items: center;">
                <button class="btn btn-primary" id="masterAlterStockGroupSaveBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Save Changes</button>
                <button class="btn btn-secondary" id="masterAlterStockGroupCancelBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Cancel</button>
              </div>
              <button class="btn btn-secondary" id="masterAlterStockGroupDelBtn" style="height: 38px; padding: 8px 14px; font-size: 12.5px; font-weight: 600; color: #dc2626; border-color: #fecaca; background: #fef2f2; display: inline-flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
                Delete Stock Group
              </button>
            </div>
          </div>
        `;

        renderGenericAliasRows('masterAlterStockGroupAliasesContainer', 'masterAlterStockGroupAddAliasBtn', _masterAlterStockGroupAliases, 'Group Code / Alias');

        const groupSel = contentArea.querySelector('#masterAlterStockGroupSelector');
        if (groupSel) {
          groupSel.addEventListener('change', () => {
            _masterAlterSelectedStockGroupId = groupSel.value;
            updateMasterDeskContent();
          });
        }

        const addAliasBtn = contentArea.querySelector('#masterAlterStockGroupAddAliasBtn');
        if (addAliasBtn) {
          addAliasBtn.addEventListener('click', () => {
            _masterAlterStockGroupAliases.push('');
            renderGenericAliasRows('masterAlterStockGroupAliasesContainer', 'masterAlterStockGroupAddAliasBtn', _masterAlterStockGroupAliases, 'Group Code / Alias');
            const inputs = contentArea.querySelectorAll('.master-alias-input');
            if (inputs.length) inputs[inputs.length - 1].focus();
          });
        }

        initSearchableSelectHelper(contentArea, 'masterAlterStockGroupUnderSel', 'Select parent stock group');

        const saveBtn = contentArea.querySelector('#masterAlterStockGroupSaveBtn');
        const cancelBtn = contentArea.querySelector('#masterAlterStockGroupCancelBtn');
        const delBtn = contentArea.querySelector('#masterAlterStockGroupDelBtn');
        const nameInp = contentArea.querySelector('#masterAlterStockGroupName');

        if (saveBtn) {
          saveBtn.addEventListener('click', () => {
            const name = nameInp ? nameInp.value.trim() : '';
            if (!name) {
              if (typeof showToast === 'function') showToast('Please enter a stock group name.', 'warning');
              else alert('Please enter a stock group name.');
              if (nameInp) nameInp.focus();
              return;
            }

            const oldName = currentGroup.name;
            const underSel = contentArea.querySelector('#masterAlterStockGroupUnderSel');
            const addQtySel = contentArea.querySelector('#masterAlterStockGroupAddQty');

            currentGroup.name = name;
            currentGroup.parent = underSel ? underSel.value : 'Inventories';
            currentGroup.addQty = addQtySel ? addQtySel.value : 'Yes';
            currentGroup.aliases = _masterAlterStockGroupAliases.filter(a => a.trim() !== '');

            // Update any children whose parent was oldName
            if (oldName !== name) {
              _masterStockGroups.forEach(g => {
                if (g.parent === oldName) g.parent = name;
              });
              _masterStockItems.forEach(item => {
                if (item.group === oldName) item.group = name;
              });
            }

            // Synchronize to Chart of Accounts
            persistMasterStockGroups();
            persistMasterStockItems();
            syncStockGroupsToCoa();
            if (typeof renderChartPanel === 'function') renderChartPanel();
            if (typeof refreshAllReports === 'function') refreshAllReports();
            if (typeof triggerAutoBackup === 'function') triggerAutoBackup();

            showToast(`Stock Group "${name}" updated successfully.`, 'success');
            updateMasterDeskContent();
          });
        }

        if (delBtn) {
          delBtn.addEventListener('click', () => {
            if (confirm(`Are you sure you want to delete stock group "${currentGroup.name}"?`)) {
              const deletedId = currentGroup.id;
              const deletedName = currentGroup.name;
              const idx = _masterStockGroups.findIndex(g => g.id === deletedId);
              if (idx >= 0) {
                _masterStockGroups.splice(idx, 1);

                // Update children of deleted group to Inventories
                _masterStockGroups.forEach(g => {
                  if (g.parent === deletedName || g.parent === deletedId) {
                    g.parent = 'Inventories';
                  }
                });

                // Remove from coaLedgers
                if (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) {
                  const glIdx = coaLedgers.findIndex(l => l.stockGroupId === deletedId || (l.type === 'group-ledger' && l.sgId === 'sg-inv' && l.name.toLowerCase() === deletedName.toLowerCase()));
                  if (glIdx !== -1) {
                    const glId = coaLedgers[glIdx].id;
                    coaLedgers.splice(glIdx, 1);
                    // Point children to null
                    coaLedgers.forEach(l => {
                      if (l.glId === glId) l.glId = null;
                    });
                  }
                }

                persistMasterStockGroups();
                syncStockGroupsToCoa();
                if (typeof renderChartPanel === 'function') renderChartPanel();
                if (typeof refreshAllReports === 'function') refreshAllReports();
                if (typeof triggerAutoBackup === 'function') triggerAutoBackup();

                showToast(`Stock Group "${deletedName}" deleted.`, 'info');
                _masterAlterSelectedStockGroupId = null;
                updateMasterDeskContent();
              }
            }
          });
        }

        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => {
            updateMasterDeskContent();
          });
        }
      } else if (currentMasterDeskTab === 'stock_item') {
        if (_masterStockItems.length === 0) {
          contentArea.innerHTML = `
            <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 32px 24px; background: var(--white); text-align: center; margin: 0 0 20px 0;">
              <div style="font-size: 14px; font-weight: 600; color: var(--slate-600); margin-bottom: 8px;">No stock items found to alter.</div>
              <div style="font-size: 12.5px; color: var(--slate-400); margin-bottom: 16px;">Create a new stock item first using the Create tab.</div>
              <button class="btn btn-primary" id="btnAlterGoToCreateStockItem" style="font-size: 13px; font-weight: 600; padding: 8px 16px;">Go to Create Stock Item</button>
            </div>
          `;
          const btnGo = contentArea.querySelector('#btnAlterGoToCreateStockItem');
          if (btnGo) btnGo.addEventListener('click', () => setMasterDeskSubtype('Create'));
          return;
        }

        let currentItem = _masterStockItems.find(item => item.id === _masterAlterSelectedStockItemId);
        if (!currentItem) {
          currentItem = _masterStockItems[0];
          _masterAlterSelectedStockItemId = currentItem.id;
        }

        _masterAlterStockItemAliases = currentItem.aliases ? [...currentItem.aliases] : [];

        let itemSelectorOpts = '';
        _masterStockItems.forEach(item => {
          const isSel = (item.id === currentItem.id);
          itemSelectorOpts += `<option value="${item.id}" ${isSel ? 'selected' : ''}>${escapeHtml(item.name)} (${item.sku || 'No SKU'})</option>`;
        });

        let groupList = (_masterStockGroups && _masterStockGroups.length > 0)
          ? _masterStockGroups
          : [{ name: 'Inventories' }, { name: 'Raw Materials' }, { name: 'Finished Goods' }, { name: 'Packaging Materials' }, { name: 'Trading Goods' }];
        if (currentItem.group && !groupList.some(g => g.name === currentItem.group)) {
          groupList = [{ name: currentItem.group }, ...groupList];
        }
        let groupOpts = '';
        let alterGroupText = currentItem.group || 'Inventories';
        groupList.forEach(g => {
          const isSel = (g.name === currentItem.group);
          const badge = (g.name === 'Inventories' || g.name === 'Primary') ? 'Inventories' : '';
          if (isSel) alterGroupText = g.name;
          groupOpts += `<option value="${escapeHtml(g.name)}" ${badge ? `data-badge="${badge}"` : ''} ${isSel ? 'selected' : ''}>${escapeHtml(g.name)}</option>`;
        });

        let catOpts = `<option value="" ${!currentItem.category ? 'selected' : ''}>-- None / Primary --</option>`;
        let alterCatText = '-- None / Primary --';
        _masterStockCategories.forEach(c => {
          const isSel = (c.name === currentItem.category);
          if (isSel) alterCatText = c.name;
          catOpts += `<option value="${escapeHtml(c.name)}" ${isSel ? 'selected' : ''}>${escapeHtml(c.name)}</option>`;
        });
        if (currentItem.category && !_masterStockCategories.some(c => c.name === currentItem.category)) {
          catOpts += `<option value="${escapeHtml(currentItem.category)}" selected>${escapeHtml(currentItem.category)}</option>`;
          alterCatText = currentItem.category;
        }

        let uomList = (_masterUnits && _masterUnits.length > 0)
          ? _masterUnits
          : [
              { symbol: 'Pcs', formalName: 'Pieces' },
              { symbol: 'Box', formalName: 'Boxes' },
              { symbol: 'Kgs', formalName: 'Kilograms' },
              { symbol: 'Nos', formalName: 'Numbers' },
              { symbol: 'Mtr', formalName: 'Meters' },
              { symbol: 'Rolls', formalName: 'Rolls' },
              { symbol: 'Sets', formalName: 'Sets' },
              { symbol: 'Dzn', formalName: 'Dozens' },
              { symbol: 'Pair', formalName: 'Pairs' }
            ];
        if (currentItem.uom && !uomList.some(u => u.symbol === currentItem.uom)) {
          uomList = [{ symbol: currentItem.uom, formalName: currentItem.uom }, ...uomList];
        }
        let uomOpts = '';
        let alterUomText = 'Pcs (Pieces)';
        uomList.forEach(u => {
          const isSel = (u.symbol === currentItem.uom);
          const label = `${u.symbol} (${u.formalName || u.symbol})`;
          if (isSel) alterUomText = label;
          uomOpts += `<option value="${escapeHtml(u.symbol)}" ${isSel ? 'selected' : ''}>${escapeHtml(label)}</option>`;
        });

        let whOpts = `<option value="" ${!currentItem.warehouse ? 'selected' : ''}>-- None / Default Location --</option>`;
        let alterWhText = '-- None / Default Location --';
        _masterWarehouses.forEach(w => {
          const isSel = (w.name === currentItem.warehouse);
          if (isSel) alterWhText = w.name;
          whOpts += `<option value="${escapeHtml(w.name)}" ${isSel ? 'selected' : ''}>${escapeHtml(w.name)}</option>`;
        });
        if (currentItem.warehouse && !_masterWarehouses.some(w => w.name === currentItem.warehouse)) {
          whOpts += `<option value="${escapeHtml(currentItem.warehouse)}" selected>${escapeHtml(currentItem.warehouse)}</option>`;
          alterWhText = currentItem.warehouse;
        }

        const totalVal = (currentItem.qty || 0) * (currentItem.rate || 0);

        contentArea.innerHTML = `
          <div class="coa-modal-card" style="max-width: 640px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--white); margin: 0 0 20px 0;">
            <h3 style="font-size: 15px; font-weight: 700; color: var(--slate-800); margin: 0 0 18px 0; display: flex; align-items: center; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              Alter Stock Item
            </h3>

            <!-- Select Item to Alter -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" for="masterAlterStockItemSelector" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Select Stock Item to Alter *</label>
              <select class="coa-modal-sel" id="masterAlterStockItemSelector" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box; background: #fff; outline: none;">
                ${itemSelectorOpts}
              </select>
            </div>

            <!-- Name -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" for="masterAlterStockItemName" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Item Name *</label>
              <input class="coa-modal-inp" id="masterAlterStockItemName" value="${escapeHtml(currentItem.name)}" placeholder="e.g. Premium Cotton Fabric" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none;">
            </div>

            <!-- SKU & UOM -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
              <div>
                <label class="coa-modal-label" for="masterAlterStockItemSku" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">SKU / Item Code</label>
                <input class="coa-modal-inp" id="masterAlterStockItemSku" value="${escapeHtml(currentItem.sku || '')}" placeholder="e.g. RAW-COT-01" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; text-transform: uppercase;">
              </div>
              <div>
                <label class="coa-modal-label" for="masterAlterStockItemUomSel" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Unit of Measure (UoM) *</label>
                <select class="coa-modal-sel" id="masterAlterStockItemUomSel" style="display: none;">
                  ${uomOpts}
                </select>
                <div class="kya-searchable-select-wrap" id="masterAlterStockItemUomSelSearchableWrap" style="position: relative; width: 100%;">
                  <div class="kya-searchable-select-trigger" id="masterAlterStockItemUomSelTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                    <span id="masterAlterStockItemUomSelTriggerText">${escapeHtml(alterUomText)}</span>
                    <span style="font-size: 10px; color: var(--slate-400);">▼</span>
                  </div>
                  <div class="kya-searchable-select-dropdown" id="masterAlterStockItemUomSelDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg, 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                    <input type="text" id="masterAlterStockItemUomSelSearch" placeholder="Search Unit of Measure (UoM)..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                    <div id="masterAlterStockItemUomSelOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Also Known As -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Also Known As</label>
              <div id="masterAlterStockItemAliasesContainer" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;"></div>
              <button type="button" id="masterAlterStockItemAddAliasBtn" style="padding: 7px 14px; font-size: 12.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; border: 1.5px dashed var(--slate-300); border-radius: 8px; background: #f8fafc; cursor: pointer; color: var(--slate-600); transition: all 0.15s ease;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add A.K.A
              </button>
            </div>

            <!-- Group & Category -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
              <div>
                <label class="coa-modal-label" for="masterAlterStockItemGroupSel" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Stock Group *</label>
                <select class="coa-modal-sel" id="masterAlterStockItemGroupSel" style="display: none;">
                  ${groupOpts}
                </select>
                <div class="kya-searchable-select-wrap" id="masterAlterStockItemGroupSelSearchableWrap" style="position: relative; width: 100%;">
                  <div class="kya-searchable-select-trigger" id="masterAlterStockItemGroupSelTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                    <span id="masterAlterStockItemGroupSelTriggerText">${escapeHtml(alterGroupText)}</span>
                    <span style="font-size: 10px; color: var(--slate-400);">▼</span>
                  </div>
                  <div class="kya-searchable-select-dropdown" id="masterAlterStockItemGroupSelDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg, 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                    <input type="text" id="masterAlterStockItemGroupSelSearch" placeholder="Search Stock Group..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                    <div id="masterAlterStockItemGroupSelOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                  </div>
                </div>
              </div>
              <div>
                <label class="coa-modal-label" for="masterAlterStockItemCategorySel" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Stock Category</label>
                <select class="coa-modal-sel" id="masterAlterStockItemCategorySel" style="display: none;">
                  ${catOpts}
                </select>
                <div class="kya-searchable-select-wrap" id="masterAlterStockItemCategorySelSearchableWrap" style="position: relative; width: 100%;">
                  <div class="kya-searchable-select-trigger" id="masterAlterStockItemCategorySelTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                    <span id="masterAlterStockItemCategorySelTriggerText">${escapeHtml(alterCatText)}</span>
                    <span style="font-size: 10px; color: var(--slate-400);">▼</span>
                  </div>
                  <div class="kya-searchable-select-dropdown" id="masterAlterStockItemCategorySelDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg, 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                    <input type="text" id="masterAlterStockItemCategorySelSearch" placeholder="Search Stock Category..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                    <div id="masterAlterStockItemCategorySelOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Warehouse / Default Location -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" for="masterAlterStockItemWarehouseSel" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Default Warehouse / Godown</label>
              <select class="coa-modal-sel" id="masterAlterStockItemWarehouseSel" style="display: none;">
                ${whOpts}
              </select>
              <div class="kya-searchable-select-wrap" id="masterAlterStockItemWarehouseSelSearchableWrap" style="position: relative; width: 100%;">
                <div class="kya-searchable-select-trigger" id="masterAlterStockItemWarehouseSelTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                  <span id="masterAlterStockItemWarehouseSelTriggerText">${escapeHtml(alterWhText)}</span>
                  <span style="font-size: 10px; color: var(--slate-400);">▼</span>
                </div>
                <div class="kya-searchable-select-dropdown" id="masterAlterStockItemWarehouseSelDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg, 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                  <input type="text" id="masterAlterStockItemWarehouseSelSearch" placeholder="Search Warehouse / Godown..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                  <div id="masterAlterStockItemWarehouseSelOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                </div>
              </div>
            </div>

            <!-- Opening Stock & Rates -->
            <div style="background: #f8fafc; border: 1.5px solid var(--slate-200); border-radius: 10px; padding: 18px; margin-bottom: 20px;">
              <div style="font-size: 13px; font-weight: 700; color: var(--slate-800); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 6v6l4 2"></path>
                </svg>
                Opening Stock & Valuation
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 11.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 4px; display: block;">Opening Quantity</label>
                  <input type="number" min="0" step="1" id="masterAlterStockItemQty" value="${currentItem.qty !== undefined ? currentItem.qty : 0}" placeholder="0" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                </div>
                <div>
                  <label style="font-size: 11.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 4px; display: block;">Rate per Unit (₹)</label>
                  <input type="number" min="0" step="0.01" id="masterAlterStockItemRate" value="${currentItem.rate !== undefined ? currentItem.rate : 0}" placeholder="0.00" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                </div>
                <div>
                  <label style="font-size: 11.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 4px; display: block;">Total Opening Value</label>
                  <input type="text" readonly id="masterAlterStockItemVal" value="₹ ${totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}" placeholder="₹ 0.00" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: var(--slate-100); color: var(--slate-700); font-weight: 600;">
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px;">
                <div>
                  <label style="font-size: 11.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 4px; display: block;">Reorder Level (Units)</label>
                  <input type="number" min="0" id="masterAlterStockItemReorder" value="${currentItem.reorder !== undefined ? currentItem.reorder : ''}" placeholder="e.g. 20" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                </div>
                <div>
                  <label style="font-size: 11.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 4px; display: block;">GST / Tax Rate (%)</label>
                  <select id="masterAlterStockItemGstSel" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                    <option value="0" ${currentItem.gst === 0 ? 'selected' : ''}>0% (Nil / Exempt)</option>
                    <option value="5" ${currentItem.gst === 5 ? 'selected' : ''}>5% GST</option>
                    <option value="12" ${currentItem.gst === 12 ? 'selected' : ''}>12% GST</option>
                    <option value="18" ${currentItem.gst === 18 ? 'selected' : ''}>18% GST</option>
                    <option value="28" ${currentItem.gst === 28 ? 'selected' : ''}>28% GST</option>
                  </select>
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; gap: 12px; align-items: center;">
                <button class="btn btn-primary" id="masterAlterStockItemSaveBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Save Changes</button>
                <button class="btn btn-secondary" id="masterAlterStockItemCancelBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Cancel</button>
              </div>
              <button class="btn btn-secondary" id="masterAlterStockItemDelBtn" style="height: 38px; padding: 8px 14px; font-size: 12.5px; font-weight: 600; color: #dc2626; border-color: #fecaca; background: #fef2f2; display: inline-flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
                Delete Stock Item
              </button>
            </div>
          </div>
        `;

        renderGenericAliasRows('masterAlterStockItemAliasesContainer', 'masterAlterStockItemAddAliasBtn', _masterAlterStockItemAliases, 'Alternate Code / Tag');

        const itemSel = contentArea.querySelector('#masterAlterStockItemSelector');
        if (itemSel) {
          itemSel.addEventListener('change', () => {
            _masterAlterSelectedStockItemId = itemSel.value;
            updateMasterDeskContent();
          });
        }

        const addAliasBtn = contentArea.querySelector('#masterAlterStockItemAddAliasBtn');
        if (addAliasBtn) {
          addAliasBtn.addEventListener('click', () => {
            _masterAlterStockItemAliases.push('');
            renderGenericAliasRows('masterAlterStockItemAliasesContainer', 'masterAlterStockItemAddAliasBtn', _masterAlterStockItemAliases, 'Alternate Code / Tag');
            const inputs = contentArea.querySelectorAll('.master-alias-input');
            if (inputs.length) inputs[inputs.length - 1].focus();
          });
        }

        initSearchableSelectHelper(contentArea, 'masterAlterStockItemUomSel', 'Select Unit of Measure');
        initSearchableSelectHelper(contentArea, 'masterAlterStockItemGroupSel', 'Select Stock Group');
        initSearchableSelectHelper(contentArea, 'masterAlterStockItemCategorySel', 'Select Stock Category');
        initSearchableSelectHelper(contentArea, 'masterAlterStockItemWarehouseSel', 'Select Warehouse / Godown');

        const qtyInp = contentArea.querySelector('#masterAlterStockItemQty');
        const rateInp = contentArea.querySelector('#masterAlterStockItemRate');
        const valInp = contentArea.querySelector('#masterAlterStockItemVal');
        const calcVal = () => {
          const q = parseFloat(qtyInp?.value) || 0;
          const r = parseFloat(rateInp?.value) || 0;
          if (valInp) valInp.value = '₹ ' + (q * r).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };
        if (qtyInp) qtyInp.addEventListener('input', calcVal);
        if (rateInp) rateInp.addEventListener('input', calcVal);

        const saveBtn = contentArea.querySelector('#masterAlterStockItemSaveBtn');
        const cancelBtn = contentArea.querySelector('#masterAlterStockItemCancelBtn');
        const delBtn = contentArea.querySelector('#masterAlterStockItemDelBtn');
        const nameInp = contentArea.querySelector('#masterAlterStockItemName');

        if (saveBtn) {
          saveBtn.addEventListener('click', () => {
            const name = nameInp ? nameInp.value.trim() : '';
            if (!name) {
              if (typeof showToast === 'function') showToast('Please enter a stock item name.', 'warning');
              else alert('Please enter a stock item name.');
              if (nameInp) nameInp.focus();
              return;
            }

            const sku = contentArea.querySelector('#masterAlterStockItemSku')?.value?.trim() || '';
            const uom = contentArea.querySelector('#masterAlterStockItemUomSel')?.value || 'Pcs';
            const grp = contentArea.querySelector('#masterAlterStockItemGroupSel')?.value || 'Raw Materials';
            const cat = contentArea.querySelector('#masterAlterStockItemCategorySel')?.value || '';
            const wh = contentArea.querySelector('#masterAlterStockItemWarehouseSel')?.value || '';
            const qty = parseFloat(qtyInp?.value) || 0;
            const rate = parseFloat(rateInp?.value) || 0;
            const reorder = parseFloat(contentArea.querySelector('#masterAlterStockItemReorder')?.value) || 0;
            const gst = parseFloat(contentArea.querySelector('#masterAlterStockItemGstSel')?.value) || 18;

            currentItem.name = name;
            currentItem.sku = sku;
            currentItem.group = grp;
            currentItem.category = cat;
            currentItem.uom = uom;
            currentItem.warehouse = wh;
            currentItem.qty = qty;
            currentItem.rate = rate;
            currentItem.reorder = reorder;
            currentItem.gst = gst;
            currentItem.aliases = _masterAlterStockItemAliases.filter(a => a.trim() !== '');

            persistMasterStockItems();
            showToast(`Stock Item "${name}" updated successfully.`, 'success');
            updateMasterDeskContent();
          });
        }

        if (delBtn) {
          delBtn.addEventListener('click', () => {
            if (confirm(`Are you sure you want to delete stock item "${currentItem.name}"?`)) {
              const idx = _masterStockItems.findIndex(i => i.id === currentItem.id);
              if (idx >= 0) {
                _masterStockItems.splice(idx, 1);
                persistMasterStockItems();
                showToast(`Stock Item "${currentItem.name}" deleted.`, 'info');
                _masterAlterSelectedStockItemId = null;
                updateMasterDeskContent();
              }
            }
          });
        }

        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => {
            updateMasterDeskContent();
          });
        }
      } else if (currentMasterDeskTab === 'stock_category') {
        if (_masterStockCategories.length === 0) {
          contentArea.innerHTML = `
            <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 32px 24px; background: var(--white); text-align: center; margin: 0 0 20px 0;">
              <div style="font-size: 14px; font-weight: 600; color: var(--slate-600); margin-bottom: 8px;">No stock categories found to alter.</div>
              <div style="font-size: 12.5px; color: var(--slate-400); margin-bottom: 16px;">Create a new stock category first using the Create tab.</div>
              <button class="btn btn-primary" id="btnAlterGoToCreateStockCategory" style="font-size: 13px; font-weight: 600; padding: 8px 16px;">Go to Create Stock Category</button>
            </div>
          `;
          const btnGo = contentArea.querySelector('#btnAlterGoToCreateStockCategory');
          if (btnGo) btnGo.addEventListener('click', () => setMasterDeskSubtype('Create'));
          return;
        }

        let currentCat = _masterStockCategories.find(c => c.id === _masterAlterSelectedStockCategoryId);
        if (!currentCat) {
          currentCat = _masterStockCategories[0];
          _masterAlterSelectedStockCategoryId = currentCat.id;
        }

        _masterAlterStockCategoryAliases = currentCat.aliases ? [...currentCat.aliases] : [];

        let catSelectorOpts = '';
        _masterStockCategories.forEach(c => {
          const isSel = (c.id === currentCat.id);
          catSelectorOpts += `<option value="${c.id}" ${isSel ? 'selected' : ''}>${escapeHtml(c.name)}</option>`;
        });

        let catUnderOpts = `<option value="Primary" data-badge="Primary" ${currentCat.parent === 'Primary' ? 'selected' : ''}>Primary</option>`;
        _masterStockCategories.forEach(c => {
          if (c.id !== currentCat.id) {
            const isSel = (c.name === currentCat.parent);
            catUnderOpts += `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`;
          }
        });

        contentArea.innerHTML = `
          <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--white); margin: 0 0 20px 0;">
            <h3 style="font-size: 15px; font-weight: 700; color: var(--slate-800); margin: 0 0 18px 0; display: flex; align-items: center; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
              Alter Stock Category
            </h3>

            <!-- Select to Alter -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" for="masterAlterStockCategorySelector" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Select Category to Alter *</label>
              <select class="coa-modal-sel" id="masterAlterStockCategorySelector" style="display: none;">
                ${catSelectorOpts}
              </select>
              <div class="kya-searchable-select-wrap" id="masterAlterStockCategorySelectorSearchableWrap" style="position: relative; width: 100%;">
                <div class="kya-searchable-select-trigger" id="masterAlterStockCategorySelectorTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                  <span id="masterAlterStockCategorySelectorTriggerText">${escapeHtml(currentCat.name)}</span>
                  <span style="font-size: 10px; color: var(--slate-400);">▼</span>
                </div>
                <div class="kya-searchable-select-dropdown" id="masterAlterStockCategorySelectorDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                  <input type="text" id="masterAlterStockCategorySelectorSearch" placeholder="Search category to alter..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                  <div id="masterAlterStockCategorySelectorOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                </div>
              </div>
            </div>

            <!-- Name -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" for="masterAlterStockCategoryName" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Category Name *</label>
              <input class="coa-modal-inp" id="masterAlterStockCategoryName" value="${escapeHtml(currentCat.name)}" placeholder="e.g. Fabrics & Textiles" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none;">
            </div>

            <!-- Also Known As -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Also Known As</label>
              <div id="masterAlterStockCategoryAliasesContainer" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;"></div>
              <button type="button" id="masterAlterStockCategoryAddAliasBtn" style="padding: 7px 14px; font-size: 12.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; border: 1.5px dashed var(--slate-300); border-radius: 8px; background: #f8fafc; cursor: pointer; color: var(--slate-600); transition: all 0.15s ease;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add A.K.A
              </button>
            </div>

            <!-- Under (Searchable Option) -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" for="masterAlterStockCategoryUnderSel" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Under *</label>
              <select class="coa-modal-sel" id="masterAlterStockCategoryUnderSel" style="display: none;">
                ${catUnderOpts}
              </select>
              <div class="kya-searchable-select-wrap" id="masterAlterStockCategoryUnderSelSearchableWrap" style="position: relative; width: 100%;">
                <div class="kya-searchable-select-trigger" id="masterAlterStockCategoryUnderSelTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                  <span id="masterAlterStockCategoryUnderSelTriggerText">${escapeHtml(currentCat.parent || 'Primary')}</span>
                  <span style="font-size: 10px; color: var(--slate-400);">▼</span>
                </div>
                <div class="kya-searchable-select-dropdown" id="masterAlterStockCategoryUnderSelDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                  <input type="text" id="masterAlterStockCategoryUnderSelSearch" placeholder="Search parent category..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                  <div id="masterAlterStockCategoryUnderSelOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                </div>
              </div>
            </div>

            <!-- Description -->
            <div class="coa-modal-fg" style="margin-bottom: 24px;">
              <label class="coa-modal-label" for="masterAlterStockCategoryDesc" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Description / Classification</label>
              <input class="coa-modal-inp" id="masterAlterStockCategoryDesc" value="${escapeHtml(currentCat.desc || '')}" placeholder="e.g. Classification for all woven materials" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none;">
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; gap: 12px; align-items: center;">
                <button class="btn btn-primary" id="masterAlterStockCategorySaveBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Save Changes</button>
                <button class="btn btn-secondary" id="masterAlterStockCategoryCancelBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Cancel</button>
              </div>
              <button class="btn btn-secondary" id="masterAlterStockCategoryDelBtn" style="height: 38px; padding: 8px 14px; font-size: 12.5px; font-weight: 600; color: #dc2626; border-color: #fecaca; background: #fef2f2; display: inline-flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
                Delete Stock Category
              </button>
            </div>
          </div>
        `;

        renderGenericAliasRows('masterAlterStockCategoryAliasesContainer', 'masterAlterStockCategoryAddAliasBtn', _masterAlterStockCategoryAliases, 'Category Code / Tag');

        const catSel = contentArea.querySelector('#masterAlterStockCategorySelector');
        initSearchableSelectHelper(contentArea, 'masterAlterStockCategorySelector', 'Select Category to Alter');
        if (catSel) {
          catSel.addEventListener('change', () => {
            _masterAlterSelectedStockCategoryId = catSel.value;
            updateMasterDeskContent();
          });
        }

        const addAliasBtn = contentArea.querySelector('#masterAlterStockCategoryAddAliasBtn');
        if (addAliasBtn) {
          addAliasBtn.addEventListener('click', () => {
            _masterAlterStockCategoryAliases.push('');
            renderGenericAliasRows('masterAlterStockCategoryAliasesContainer', 'masterAlterStockCategoryAddAliasBtn', _masterAlterStockCategoryAliases, 'Category Code / Tag');
            const inputs = contentArea.querySelectorAll('.master-alias-input');
            if (inputs.length) inputs[inputs.length - 1].focus();
          });
        }

        initSearchableSelectHelper(contentArea, 'masterAlterStockCategoryUnderSel', 'Select parent category');

        const saveBtn = contentArea.querySelector('#masterAlterStockCategorySaveBtn');
        const cancelBtn = contentArea.querySelector('#masterAlterStockCategoryCancelBtn');
        const delBtn = contentArea.querySelector('#masterAlterStockCategoryDelBtn');
        const nameInp = contentArea.querySelector('#masterAlterStockCategoryName');

        if (saveBtn) {
          saveBtn.addEventListener('click', () => {
            const name = nameInp ? nameInp.value.trim() : '';
            if (!name) {
              if (typeof showToast === 'function') showToast('Please enter a category name.', 'warning');
              else alert('Please enter a category name.');
              if (nameInp) nameInp.focus();
              return;
            }

            const underSel = contentArea.querySelector('#masterAlterStockCategoryUnderSel');
            const descInp = contentArea.querySelector('#masterAlterStockCategoryDesc');

            currentCat.name = name;
            currentCat.parent = underSel ? underSel.value : 'Primary';
            currentCat.desc = descInp ? descInp.value.trim() : '';
            currentCat.aliases = _masterAlterStockCategoryAliases.filter(a => a.trim() !== '');

            persistMasterStockCategories();
            showToast(`Stock Category "${name}" updated successfully.`, 'success');
            updateMasterDeskContent();
          });
        }

        if (delBtn) {
          delBtn.addEventListener('click', () => {
            if (confirm(`Are you sure you want to delete stock category "${currentCat.name}"?`)) {
              const idx = _masterStockCategories.findIndex(c => c.id === currentCat.id);
              if (idx >= 0) {
                _masterStockCategories.splice(idx, 1);
                persistMasterStockCategories();
                showToast(`Stock Category "${currentCat.name}" deleted.`, 'info');
                _masterAlterSelectedStockCategoryId = null;
                updateMasterDeskContent();
              }
            }
          });
        }

        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => {
            updateMasterDeskContent();
          });
        }
      } else if (currentMasterDeskTab === 'unit') {
        if (_masterUnits.length === 0) {
          contentArea.innerHTML = `
            <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 32px 24px; background: var(--white); text-align: center; margin: 0 0 20px 0;">
              <div style="font-size: 14px; font-weight: 600; color: var(--slate-600); margin-bottom: 8px;">No units found to alter.</div>
              <div style="font-size: 12.5px; color: var(--slate-400); margin-bottom: 16px;">Create a new unit of measure first using the Create tab.</div>
              <button class="btn btn-primary" id="btnAlterGoToCreateUnit" style="font-size: 13px; font-weight: 600; padding: 8px 16px;">Go to Create Unit</button>
            </div>
          `;
          const btnGo = contentArea.querySelector('#btnAlterGoToCreateUnit');
          if (btnGo) btnGo.addEventListener('click', () => setMasterDeskSubtype('Create'));
          return;
        }

        let currentUnit = _masterUnits.find(u => u.id === _masterAlterSelectedUnitId);
        if (!currentUnit) {
          currentUnit = _masterUnits[0];
          _masterAlterSelectedUnitId = currentUnit.id;
        }

        _masterAlterUnitAliases = currentUnit.aliases ? [...currentUnit.aliases] : [];

        let unitSelectorOpts = '';
        _masterUnits.forEach(u => {
          const isSel = (u.id === currentUnit.id);
          unitSelectorOpts += `<option value="${u.id}" ${isSel ? 'selected' : ''}>${escapeHtml(u.symbol)} (${escapeHtml(u.formalName || u.symbol)})</option>`;
        });

        const GST_UQC_OPTIONS = [
          { code: 'PCS-PIECES', name: 'Pieces' },
          { code: 'KGS-KILOGRAMS', name: 'Kilograms' },
          { code: 'BOX-BOXES', name: 'Boxes' },
          { code: 'MTR-METRES', name: 'Metres' },
          { code: 'NOS-NUMBERS', name: 'Numbers' },
          { code: 'ROL-ROLLS', name: 'Rolls' },
          { code: 'LTR-LITRES', name: 'Litres' },
          { code: 'SET-SETS', name: 'Sets' },
          { code: 'SQF-SQUARE FEET', name: 'Square Feet' },
          { code: 'SQM-SQUARE METRES', name: 'Square Metres' },
          { code: 'BAG-BAGS', name: 'Bags' },
          { code: 'BTL-BOTTLES', name: 'Bottles' },
          { code: 'CAN-CANS', name: 'Cans' },
          { code: 'CTN-CARTONS', name: 'Cartons' },
          { code: 'DOZ-DOZENS', name: 'Dozens' },
          { code: 'GMS-GRAMMES', name: 'Grammes' },
          { code: 'KLR-KILOLITRES', name: 'Kilolitres' },
          { code: 'PAC-PACKETS', name: 'Packets' },
          { code: 'PRS-PAIRS', name: 'Pairs' },
          { code: 'QTL-QUINTAL', name: 'Quintal' },
          { code: 'THD-THOUSANDS', name: 'Thousands' },
          { code: 'TUB-TUBES', name: 'Tubes' },
          { code: 'UNT-UNITS', name: 'Units' },
          { code: 'YDS-YARDS', name: 'Yards' },
          { code: 'OTH-OTHERS', name: 'Others' }
        ];

        let alterUqcOptionsHtml = '';
        GST_UQC_OPTIONS.forEach(u => {
          const isSel = (u.code === currentUnit.uqc);
          alterUqcOptionsHtml += `<option value="${u.code}" ${isSel ? 'selected' : ''}>${u.code} (${u.name})</option>`;
        });

        let currentUqcObj = GST_UQC_OPTIONS.find(u => u.code === currentUnit.uqc);

        contentArea.innerHTML = `
          <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--white); margin: 0 0 20px 0;">
            <h3 style="font-size: 15px; font-weight: 700; color: var(--slate-800); margin: 0 0 18px 0; display: flex; align-items: center; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <line x1="3.27" y1="6.96" x2="12" y2="12.01"/>
                <line x1="12" y1="12.01" x2="20.73" y2="6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12.01"/>
              </svg>
              Alter Unit of Measure (UoM)
            </h3>

            <!-- Select to Alter -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" for="masterAlterUnitSelector" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Select Unit to Alter *</label>
              <select class="coa-modal-sel" id="masterAlterUnitSelector" style="display: none;">
                ${unitSelectorOpts}
              </select>
              <div class="kya-searchable-select-wrap" id="masterAlterUnitSelectorSearchableWrap" style="position: relative; width: 100%;">
                <div class="kya-searchable-select-trigger" id="masterAlterUnitSelectorTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                  <span id="masterAlterUnitSelectorTriggerText">${escapeHtml(currentUnit.symbol)} (${escapeHtml(currentUnit.formalName || currentUnit.symbol)})</span>
                  <span style="font-size: 10px; color: var(--slate-400);">▼</span>
                </div>
                <div class="kya-searchable-select-dropdown" id="masterAlterUnitSelectorDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                  <input type="text" id="masterAlterUnitSelectorSearch" placeholder="Search unit to alter..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                  <div id="masterAlterUnitSelectorOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                </div>
              </div>
            </div>

            <!-- Type selector -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" for="masterAlterUnitTypeSel" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Type *</label>
              <select class="coa-modal-sel" id="masterAlterUnitTypeSel" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box; background: #fff; outline: none;">
                <option value="Simple" ${currentUnit.type === 'Simple' ? 'selected' : ''}>Simple (Single Unit)</option>
                <option value="Compound" ${currentUnit.type === 'Compound' ? 'selected' : ''}>Compound Unit</option>
              </select>
            </div>

            <!-- Symbol & Formal Name -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
              <div>
                <label class="coa-modal-label" for="masterAlterUnitSymbol" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Symbol *</label>
                <input class="coa-modal-inp" id="masterAlterUnitSymbol" value="${escapeHtml(currentUnit.symbol)}" placeholder="e.g. Pcs" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none;">
              </div>
              <div>
                <label class="coa-modal-label" for="masterAlterUnitFormalName" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Formal Name</label>
                <input class="coa-modal-inp" id="masterAlterUnitFormalName" value="${escapeHtml(currentUnit.formalName || '')}" placeholder="e.g. Pieces" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none;">
              </div>
            </div>

            <!-- Also Known As -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Also Known As</label>
              <div id="masterAlterUnitAliasesContainer" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;"></div>
              <button type="button" id="masterAlterUnitAddAliasBtn" style="padding: 7px 14px; font-size: 12.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; border: 1.5px dashed var(--slate-300); border-radius: 8px; background: #f8fafc; cursor: pointer; color: var(--slate-600); transition: all 0.15s ease;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add A.K.A
              </button>
            </div>

            <!-- Unit Quantity Code & Decimals -->
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-bottom: 24px;">
              <div>
                <label class="coa-modal-label" for="masterAlterUnitUqcSel" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Unit Quantity Code (UQC for GST)</label>
                <select class="coa-modal-sel" id="masterAlterUnitUqcSel" style="display: none;">
                  ${alterUqcOptionsHtml}
                </select>
                <div class="kya-searchable-select-wrap" id="masterAlterUnitUqcSelSearchableWrap" style="position: relative; width: 100%;">
                  <div class="kya-searchable-select-trigger" id="masterAlterUnitUqcSelTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                    <span id="masterAlterUnitUqcSelTriggerText">${escapeHtml(currentUqcObj ? `${currentUqcObj.code} (${currentUqcObj.name})` : (currentUnit.uqc || 'OTH-OTHERS'))}</span>
                    <span style="font-size: 10px; color: var(--slate-400);">▼</span>
                  </div>
                  <div class="kya-searchable-select-dropdown" id="masterAlterUnitUqcSelDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                    <input type="text" id="masterAlterUnitUqcSelSearch" placeholder="Search UQC code or unit name..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                    <div id="masterAlterUnitUqcSelOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                  </div>
                </div>
              </div>
              <div>
                <label class="coa-modal-label" for="masterAlterUnitDecimalsSel" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Decimal Places</label>
                <select class="coa-modal-sel" id="masterAlterUnitDecimalsSel" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box; background: #fff; outline: none;">
                  <option value="0" ${currentUnit.decimalPlaces === 0 ? 'selected' : ''}>0 (e.g. 10 Pcs)</option>
                  <option value="1" ${currentUnit.decimalPlaces === 1 ? 'selected' : ''}>1 (e.g. 10.5)</option>
                  <option value="2" ${currentUnit.decimalPlaces === 2 ? 'selected' : ''}>2 (e.g. 10.25 Kgs)</option>
                  <option value="3" ${currentUnit.decimalPlaces === 3 ? 'selected' : ''}>3 (e.g. 10.125 Mtr)</option>
                  <option value="4" ${currentUnit.decimalPlaces === 4 ? 'selected' : ''}>4 (e.g. 10.1250)</option>
                </select>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; gap: 12px; align-items: center;">
                <button class="btn btn-primary" id="masterAlterUnitSaveBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Save Changes</button>
                <button class="btn btn-secondary" id="masterAlterUnitCancelBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Cancel</button>
              </div>
              <button class="btn btn-secondary" id="masterAlterUnitDelBtn" style="height: 38px; padding: 8px 14px; font-size: 12.5px; font-weight: 600; color: #dc2626; border-color: #fecaca; background: #fef2f2; display: inline-flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
                Delete Unit
              </button>
            </div>
          </div>
        `;

        renderGenericAliasRows('masterAlterUnitAliasesContainer', 'masterAlterUnitAddAliasBtn', _masterAlterUnitAliases, 'Unit Tag / Alias');

        const unitSel = contentArea.querySelector('#masterAlterUnitSelector');
        initSearchableSelectHelper(contentArea, 'masterAlterUnitSelector', 'Select Unit to Alter');
        if (unitSel) {
          unitSel.addEventListener('change', () => {
            _masterAlterSelectedUnitId = unitSel.value;
            updateMasterDeskContent();
          });
        }

        const addAliasBtn = contentArea.querySelector('#masterAlterUnitAddAliasBtn');
        if (addAliasBtn) {
          addAliasBtn.addEventListener('click', () => {
            _masterAlterUnitAliases.push('');
            renderGenericAliasRows('masterAlterUnitAliasesContainer', 'masterAlterUnitAddAliasBtn', _masterAlterUnitAliases, 'Unit Tag / Alias');
            const inputs = contentArea.querySelectorAll('.master-alias-input');
            if (inputs.length) inputs[inputs.length - 1].focus();
          });
        }

        initSearchableSelectHelper(contentArea, 'masterAlterUnitUqcSel', 'Select UQC Code...');

        const saveBtn = contentArea.querySelector('#masterAlterUnitSaveBtn');
        const cancelBtn = contentArea.querySelector('#masterAlterUnitCancelBtn');
        const delBtn = contentArea.querySelector('#masterAlterUnitDelBtn');
        const symbolInp = contentArea.querySelector('#masterAlterUnitSymbol');

        if (saveBtn) {
          saveBtn.addEventListener('click', () => {
            const symbol = symbolInp ? symbolInp.value.trim() : '';
            if (!symbol) {
              if (typeof showToast === 'function') showToast('Please enter a unit symbol (e.g. Pcs, Kgs).', 'warning');
              else alert('Please enter a unit symbol.');
              if (symbolInp) symbolInp.focus();
              return;
            }

            const oldSymbol = currentUnit.symbol;
            const typeSel = contentArea.querySelector('#masterAlterUnitTypeSel');
            const formalNameInp = contentArea.querySelector('#masterAlterUnitFormalName');
            const uqcSel = contentArea.querySelector('#masterAlterUnitUqcSel');
            const decimalsSel = contentArea.querySelector('#masterAlterUnitDecimalsSel');

            currentUnit.type = typeSel ? typeSel.value : 'Simple';
            currentUnit.symbol = symbol;
            currentUnit.formalName = formalNameInp ? formalNameInp.value.trim() : '';
            currentUnit.uqc = uqcSel ? uqcSel.value : 'OTH-OTHERS';
            currentUnit.decimalPlaces = parseInt(decimalsSel ? decimalsSel.value : '0', 10) || 0;
            currentUnit.aliases = _masterAlterUnitAliases.filter(a => a.trim() !== '');

            // Update any stock items using old symbol
            if (oldSymbol !== symbol) {
              _masterStockItems.forEach(item => {
                if (item.uom === oldSymbol) item.uom = symbol;
              });
              persistMasterStockItems();
            }

            persistMasterUnits();
            showToast(`Unit "${symbol}" updated successfully.`, 'success');
            updateMasterDeskContent();
          });
        }

        if (delBtn) {
          delBtn.addEventListener('click', () => {
            if (confirm(`Are you sure you want to delete unit "${currentUnit.symbol}"?`)) {
              const idx = _masterUnits.findIndex(u => u.id === currentUnit.id);
              if (idx >= 0) {
                _masterUnits.splice(idx, 1);
                persistMasterUnits();
                showToast(`Unit "${currentUnit.symbol}" deleted.`, 'info');
                _masterAlterSelectedUnitId = null;
                updateMasterDeskContent();
              }
            }
          });
        }

        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => {
            updateMasterDeskContent();
          });
        }
      } else if (currentMasterDeskTab === 'warehouse') {
        if (_masterWarehouses.length === 0) {
          contentArea.innerHTML = `
            <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 32px 24px; background: var(--white); text-align: center; margin: 0 0 20px 0;">
              <div style="font-size: 14px; font-weight: 600; color: var(--slate-600); margin-bottom: 8px;">No warehouses found to alter.</div>
              <div style="font-size: 12.5px; color: var(--slate-400); margin-bottom: 16px;">Create a new warehouse first using the Create tab.</div>
              <button class="btn btn-primary" id="btnAlterGoToCreateWarehouse" style="font-size: 13px; font-weight: 600; padding: 8px 16px;">Go to Create Warehouse</button>
            </div>
          `;
          const btnGo = contentArea.querySelector('#btnAlterGoToCreateWarehouse');
          if (btnGo) btnGo.addEventListener('click', () => setMasterDeskSubtype('Create'));
          return;
        }

        let currentWh = _masterWarehouses.find(w => w.id === _masterAlterSelectedWarehouseId);
        if (!currentWh) {
          currentWh = _masterWarehouses[0];
          _masterAlterSelectedWarehouseId = currentWh.id;
        }

        _masterAlterWarehouseAliases = currentWh.aliases ? [...currentWh.aliases] : [];

        let whSelectorOpts = '';
        _masterWarehouses.forEach(w => {
          const isSel = (w.id === currentWh.id);
          whSelectorOpts += `<option value="${w.id}" ${isSel ? 'selected' : ''}>${escapeHtml(w.name)} (${w.code || 'No Code'})</option>`;
        });

        let whUnderOpts = `<option value="Primary" ${currentWh.parent === 'Primary' ? 'selected' : ''}>Primary</option>`;
        _masterWarehouses.forEach(w => {
          if (w.id !== currentWh.id) {
            const isSel = (w.name === currentWh.parent);
            whUnderOpts += `<option value="${escapeHtml(w.name)}" ${isSel ? 'selected' : ''}>${escapeHtml(w.name)}</option>`;
          }
        });

        contentArea.innerHTML = `
          <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--white); margin: 0 0 20px 0;">
            <h3 style="font-size: 15px; font-weight: 700; color: var(--slate-800); margin: 0 0 18px 0; display: flex; align-items: center; gap: 8px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 21h18"/>
                <path d="M5 21V7l7-4 7 4v14"/>
                <path d="M9 21v-8a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v8"/>
              </svg>
              Alter Warehouse / Godown
            </h3>

            <!-- Select to Alter -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" for="masterAlterWarehouseSelector" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Select Warehouse to Alter *</label>
              <select class="coa-modal-sel" id="masterAlterWarehouseSelector" style="display: none;">
                ${whSelectorOpts}
              </select>
              <div class="kya-searchable-select-wrap" id="masterAlterWarehouseSelectorSearchableWrap" style="position: relative; width: 100%;">
                <div class="kya-searchable-select-trigger" id="masterAlterWarehouseSelectorTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                  <span id="masterAlterWarehouseSelectorTriggerText">${escapeHtml(currentWh.name)} (${escapeHtml(currentWh.code || 'No Code')})</span>
                  <span style="font-size: 10px; color: var(--slate-400);">▼</span>
                </div>
                <div class="kya-searchable-select-dropdown" id="masterAlterWarehouseSelectorDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                  <input type="text" id="masterAlterWarehouseSelectorSearch" placeholder="Search warehouse to alter..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                  <div id="masterAlterWarehouseSelectorOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                </div>
              </div>
            </div>

            <!-- Name & Code -->
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-bottom: 16px;">
              <div>
                <label class="coa-modal-label" for="masterAlterWarehouseName" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Warehouse Name *</label>
                <input class="coa-modal-inp" id="masterAlterWarehouseName" value="${escapeHtml(currentWh.name)}" placeholder="e.g. Main Warehouse (WH-A)" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none;">
              </div>
              <div>
                <label class="coa-modal-label" for="masterAlterWarehouseCode" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Code</label>
                <input class="coa-modal-inp" id="masterAlterWarehouseCode" value="${escapeHtml(currentWh.code || '')}" placeholder="e.g. WH-A" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; text-transform: uppercase;">
              </div>
            </div>

            <!-- Also Known As -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Also Known As</label>
              <div id="masterAlterWarehouseAliasesContainer" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;"></div>
              <button type="button" id="masterAlterWarehouseAddAliasBtn" style="padding: 7px 14px; font-size: 12.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; border: 1.5px dashed var(--slate-300); border-radius: 8px; background: #f8fafc; cursor: pointer; color: var(--slate-600); transition: all 0.15s ease;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add A.K.A
              </button>
            </div>

            <!-- Under Location (Searchable Option) -->
            <div class="coa-modal-fg" style="margin-bottom: 16px;">
              <label class="coa-modal-label" for="masterAlterWarehouseUnderSel" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Under Location *</label>
              <select class="coa-modal-sel" id="masterAlterWarehouseUnderSel" style="display: none;">
                ${whUnderOpts}
              </select>
              <div class="kya-searchable-select-wrap" id="masterAlterWarehouseUnderSelSearchableWrap" style="position: relative; width: 100%;">
                <div class="kya-searchable-select-trigger" id="masterAlterWarehouseUnderSelTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                  <span id="masterAlterWarehouseUnderSelTriggerText">${escapeHtml(currentWh.parent || 'Primary')}</span>
                  <span style="font-size: 10px; color: var(--slate-400);">▼</span>
                </div>
                <div class="kya-searchable-select-dropdown" id="masterAlterWarehouseUnderSelDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                  <input type="text" id="masterAlterWarehouseUnderSelSearch" placeholder="Search parent location..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                  <div id="masterAlterWarehouseUnderSelOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                </div>
              </div>
            </div>

            <!-- Facility Details -->
            <div style="background: #f8fafc; border: 1.5px solid var(--slate-200); border-radius: 10px; padding: 18px; margin-bottom: 20px;">
              <div style="font-size: 13px; font-weight: 700; color: var(--slate-800); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                Address & Facility Details
              </div>
              <div style="display: flex; flex-direction: column; gap: 10px;">
                <input type="text" id="masterAlterWarehouseAddress" value="${escapeHtml(currentWh.address || '')}" placeholder="Street Address / Building" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <input type="text" id="masterAlterWarehouseCity" value="${escapeHtml(currentWh.city || '')}" placeholder="City / Town" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                  <input type="text" id="masterAlterWarehousePincode" value="${escapeHtml(currentWh.pincode || '')}" placeholder="PIN / Postal Code" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <input type="text" id="masterAlterWarehouseState" value="${escapeHtml(currentWh.state || '')}" placeholder="State" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                  <input type="text" id="masterAlterWarehouseCountry" value="${escapeHtml(currentWh.country || 'India')}" placeholder="Country" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <input type="text" id="masterAlterWarehouseSupervisor" value="${escapeHtml(currentWh.supervisor || '')}" placeholder="Supervisor Name" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                  <input type="text" id="masterAlterWarehouseType" value="${escapeHtml(currentWh.type || '')}" placeholder="Storage Type" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; gap: 12px; align-items: center;">
                <button class="btn btn-primary" id="masterAlterWarehouseSaveBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Save Changes</button>
                <button class="btn btn-secondary" id="masterAlterWarehouseCancelBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Cancel</button>
              </div>
              <button class="btn btn-secondary" id="masterAlterWarehouseDelBtn" style="height: 38px; padding: 8px 14px; font-size: 12.5px; font-weight: 600; color: #dc2626; border-color: #fecaca; background: #fef2f2; display: inline-flex; align-items: center; gap: 6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
                Delete Warehouse
              </button>
            </div>
          </div>
        `;

        renderGenericAliasRows('masterAlterWarehouseAliasesContainer', 'masterAlterWarehouseAddAliasBtn', _masterAlterWarehouseAliases, 'Location Code / Alias');

        const whSel = contentArea.querySelector('#masterAlterWarehouseSelector');
        initSearchableSelectHelper(contentArea, 'masterAlterWarehouseSelector', 'Select Warehouse to Alter');
        if (whSel) {
          whSel.addEventListener('change', () => {
            _masterAlterSelectedWarehouseId = whSel.value;
            updateMasterDeskContent();
          });
        }

        const addAliasBtn = contentArea.querySelector('#masterAlterWarehouseAddAliasBtn');
        if (addAliasBtn) {
          addAliasBtn.addEventListener('click', () => {
            _masterAlterWarehouseAliases.push('');
            renderGenericAliasRows('masterAlterWarehouseAliasesContainer', 'masterAlterWarehouseAddAliasBtn', _masterAlterWarehouseAliases, 'Location Code / Alias');
            const inputs = contentArea.querySelectorAll('.master-alias-input');
            if (inputs.length) inputs[inputs.length - 1].focus();
          });
        }

        initSearchableSelectHelper(contentArea, 'masterAlterWarehouseUnderSel', 'Select parent location');

        const saveBtn = contentArea.querySelector('#masterAlterWarehouseSaveBtn');
        const cancelBtn = contentArea.querySelector('#masterAlterWarehouseCancelBtn');
        const delBtn = contentArea.querySelector('#masterAlterWarehouseDelBtn');
        const nameInp = contentArea.querySelector('#masterAlterWarehouseName');

        if (saveBtn) {
          saveBtn.addEventListener('click', () => {
            const name = nameInp ? nameInp.value.trim() : '';
            if (!name) {
              if (typeof showToast === 'function') showToast('Please enter a warehouse name.', 'warning');
              else alert('Please enter a warehouse name.');
              if (nameInp) nameInp.focus();
              return;
            }

            const code = contentArea.querySelector('#masterAlterWarehouseCode')?.value?.trim() || '';
            const underSel = contentArea.querySelector('#masterAlterWarehouseUnderSel');
            const address = contentArea.querySelector('#masterAlterWarehouseAddress')?.value?.trim() || '';
            const city = contentArea.querySelector('#masterAlterWarehouseCity')?.value?.trim() || '';
            const pincode = contentArea.querySelector('#masterAlterWarehousePincode')?.value?.trim() || '';
            const state = contentArea.querySelector('#masterAlterWarehouseState')?.value?.trim() || '';
            const country = contentArea.querySelector('#masterAlterWarehouseCountry')?.value?.trim() || 'India';
            const supervisor = contentArea.querySelector('#masterAlterWarehouseSupervisor')?.value?.trim() || '';
            const type = contentArea.querySelector('#masterAlterWarehouseType')?.value?.trim() || '';

            currentWh.name = name;
            currentWh.code = code;
            currentWh.parent = underSel ? underSel.value : 'Primary';
            currentWh.address = address;
            currentWh.city = city;
            currentWh.pincode = pincode;
            currentWh.state = state;
            currentWh.country = country;
            currentWh.supervisor = supervisor;
            currentWh.type = type;
            currentWh.aliases = _masterAlterWarehouseAliases.filter(a => a.trim() !== '');

            persistMasterWarehouses();
            showToast(`Warehouse "${name}" updated successfully.`, 'success');
            updateMasterDeskContent();
          });
        }

        if (delBtn) {
          delBtn.addEventListener('click', () => {
            if (confirm(`Are you sure you want to delete warehouse "${currentWh.name}"?`)) {
              const idx = _masterWarehouses.findIndex(w => w.id === currentWh.id);
              if (idx >= 0) {
                _masterWarehouses.splice(idx, 1);
                persistMasterWarehouses();
                showToast(`Warehouse "${currentWh.name}" deleted.`, 'info');
                _masterAlterSelectedWarehouseId = null;
                updateMasterDeskContent();
              }
            }
          });
        }

        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => {
            updateMasterDeskContent();
          });
        }
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
          <!-- 3-dot more options dropdown -->
          <div class="rpt-more-wrap">
            <button class="rpt-more-btn" id="masterDeskMoreBtn" title="More Options" type="button" aria-label="More Options">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="1.5"></circle>
                <circle cx="12" cy="5" r="1.5"></circle>
                <circle cx="12" cy="19" r="1.5"></circle>
              </svg>
            </button>
            <div class="rpt-more-dropdown" id="masterDeskMoreDropdown">
              <!-- Export Submenu -->
              <div class="rpt-submenu-wrap" id="masterDeskExportSubmenuWrap">
                <button class="rpt-menu-item rpt-submenu-btn" id="masterDeskExportMenuBtn" type="button">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    <span>Export</span>
                  </div>
                  <svg class="rpt-submenu-caret" width="10" height="10" viewBox="0 0 14 14" fill="none">
                    <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                <div class="rpt-submenu-dropdown" id="masterDeskExportSubmenu">
                  <button class="rpt-menu-item" id="masterDeskExportPdf" type="button">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    PDF
                  </button>
                  <button class="rpt-menu-item" id="masterDeskExportExcel" type="button">
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
            </div>
          </div>
        </div>

        <div class="oh-layout">
          <!-- Sub-tabs (Left side options cards) -->
          <div class="oh-sub-tabs" role="tablist" aria-label="Master Desk sections">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--slate-400); padding: 4px 12px 6px 12px; margin-bottom: 2px;">Accounting Masters</div>

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

            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--slate-400); padding: 14px 12px 6px 12px; margin-top: 6px; border-top: 1px solid var(--slate-100);">Inventory Masters</div>

            <button class="oh-sub-tab" id="masterTabStockGroup" role="tab" aria-selected="false">
              <div class="oh-tab-icon-wrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <span class="oh-tab-text">Stock Group</span>
            </button>

            <button class="oh-sub-tab" id="masterTabStockItem" role="tab" aria-selected="false">
              <div class="oh-tab-icon-wrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <span class="oh-tab-text">Stock Item</span>
            </button>

            <button class="oh-sub-tab" id="masterTabStockCategory" role="tab" aria-selected="false">
              <div class="oh-tab-icon-wrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                </svg>
              </div>
              <span class="oh-tab-text">Stock Category</span>
            </button>

            <button class="oh-sub-tab" id="masterTabUnit" role="tab" aria-selected="false">
              <div class="oh-tab-icon-wrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <line x1="3.27" y1="6.96" x2="12" y2="12.01"/>
                  <line x1="12" y1="12.01" x2="20.73" y2="6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12.01"/>
                </svg>
              </div>
              <span class="oh-tab-text">Unit</span>
            </button>

            <button class="oh-sub-tab" id="masterTabWarehouse" role="tab" aria-selected="false">
              <div class="oh-tab-icon-wrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 21h18"/>
                  <path d="M5 21V7l7-4 7 4v14"/>
                  <path d="M9 21v-8a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v8"/>
                </svg>
              </div>
              <span class="oh-tab-text">Warehouse</span>
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
    const btnStockGroup = container.querySelector('#masterTabStockGroup');
    const btnStockItem = container.querySelector('#masterTabStockItem');
    const btnStockCategory = container.querySelector('#masterTabStockCategory');
    const btnUnit = container.querySelector('#masterTabUnit');
    const btnWarehouse = container.querySelector('#masterTabWarehouse');

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
    if (btnStockGroup) {
      btnStockGroup.addEventListener('click', () => setMasterDeskTab('stock_group'));
    }
    if (btnStockItem) {
      btnStockItem.addEventListener('click', () => setMasterDeskTab('stock_item'));
    }
    if (btnStockCategory) {
      btnStockCategory.addEventListener('click', () => setMasterDeskTab('stock_category'));
    }
    if (btnUnit) {
      btnUnit.addEventListener('click', () => setMasterDeskTab('unit'));
    }
    if (btnWarehouse) {
      btnWarehouse.addEventListener('click', () => setMasterDeskTab('warehouse'));
    }

    // Wire Master Desk 3-dot dropdown
    const moreBtn = container.querySelector('#masterDeskMoreBtn');
    const moreDropdown = container.querySelector('#masterDeskMoreDropdown');
    const submenuBtn = container.querySelector('#masterDeskExportMenuBtn');
    const submenu = container.querySelector('#masterDeskExportSubmenu');
    const pdfBtn = container.querySelector('#masterDeskExportPdf');
    const excelBtn = container.querySelector('#masterDeskExportExcel');

    if (moreBtn && moreDropdown) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = moreDropdown.classList.contains('active');
        closeAllMasterDeskMenus();
        if (!isOpen) moreDropdown.classList.add('active');
      });
    }

    if (submenuBtn && submenu) {
      let closeTimer = null;
      submenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        submenu.classList.toggle('active');
      });
      const submenuWrap = container.querySelector('#masterDeskExportSubmenuWrap');
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

    function closeAllMasterDeskMenus() {
      if (moreDropdown) moreDropdown.classList.remove('active');
      if (submenu) submenu.classList.remove('active');
    }

    if (pdfBtn) {
      pdfBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        closeAllMasterDeskMenus();
        if (currentMasterDeskTab === 'customers') {
          if (typeof window.exportCustomersToPDF === 'function') {
            await window.exportCustomersToPDF(window.getCustomersExportData());
          }
        } else if (currentMasterDeskTab === 'suppliers') {
          if (typeof window.exportSuppliersToPDF === 'function') {
            await window.exportSuppliersToPDF(window.getSuppliersExportData());
          }
        } else if (currentMasterDeskTab === 'group') {
          if (typeof window.exportChartOfAccountsToPDF === 'function') {
            await window.exportChartOfAccountsToPDF(window.getChartOfAccountsExportData());
          }
        } else {
          if (typeof window.exportLedgersToPDF === 'function') {
            await window.exportLedgersToPDF(window.getLedgersExportData());
          }
        }
      });
    }

    if (excelBtn) {
      excelBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        closeAllMasterDeskMenus();
        if (currentMasterDeskTab === 'customers') {
          if (typeof window.exportCustomersToExcel === 'function') {
            await window.exportCustomersToExcel(window.getCustomersExportData());
          }
        } else if (currentMasterDeskTab === 'suppliers') {
          if (typeof window.exportSuppliersToExcel === 'function') {
            await window.exportSuppliersToExcel(window.getSuppliersExportData());
          }
        } else if (currentMasterDeskTab === 'group') {
          if (typeof window.exportChartOfAccountsToExcel === 'function') {
            await window.exportChartOfAccountsToExcel(window.getChartOfAccountsExportData());
          }
        } else {
          if (typeof window.exportLedgersToExcel === 'function') {
            await window.exportLedgersToExcel(window.getLedgersExportData());
          }
        }
      });
    }

    document.addEventListener('click', (e) => {
      if (moreDropdown && !moreDropdown.contains(e.target) && (!moreBtn || !moreBtn.contains(e.target))) {
        closeAllMasterDeskMenus();
      }
    });

    updateMasterDeskContent();
  }

  function openMasterDeskCreateLedger(options = {}) {
    _masterDeskReturnContext = options;

    if (typeof openTab === 'function') {
      openTab('master_desk');
    } else if (typeof window.openTab === 'function') {
      window.openTab('master_desk');
    } else if (typeof navigateTo === 'function') {
      navigateTo('master_desk');
    } else {
      window.location.hash = '#master_desk';
    }

    const wrap = document.getElementById('panel-master-desk');
    if (wrap && (!_masterDeskInitialized || !wrap.children.length)) {
      initMasterDesk(wrap);
      _masterDeskInitialized = true;
    }

    setMasterDeskSubtype('Create');
    setMasterDeskTab('ledger');

    setTimeout(() => {
      const nameInp = document.getElementById('masterLedgerName');
      if (nameInp) {
        if (options.initialName) {
          nameInp.value = options.initialName;
          nameInp.dispatchEvent(new Event('input', { bubbles: true }));
        }
        nameInp.focus();
        if (options.initialName) {
          nameInp.select();
        }
      }
      if (options.groupVal) {
        const groupSel = document.getElementById('masterLedgerGroupCombinedSel');
        const triggerText = document.getElementById('masterLedgerGroupCombinedSelTriggerText');
        if (groupSel) {
          groupSel.value = options.groupVal;
          const opt = groupSel.options[groupSel.selectedIndex];
          if (triggerText && opt) {
            triggerText.textContent = opt.textContent.trim().replace(/^📁\s*/, '');
          }
          groupSel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }, 60);
  }

  function openMasterDeskCreateParty(options = {}) {
    _masterDeskReturnContext = options;

    if (typeof openTab === 'function') {
      openTab('master_desk');
    } else if (typeof window.openTab === 'function') {
      window.openTab('master_desk');
    } else if (typeof navigateTo === 'function') {
      navigateTo('master_desk');
    } else {
      window.location.hash = '#master_desk';
    }

    const wrap = document.getElementById('panel-master-desk');
    if (wrap && (!_masterDeskInitialized || !wrap.children.length)) {
      initMasterDesk(wrap);
      _masterDeskInitialized = true;
    }

    setMasterDeskSubtype('Create');
    setMasterDeskTab(options.type === 'customer' ? 'customers' : 'suppliers');

    setTimeout(() => {
      const nameInpId = options.type === 'customer' ? 'masterCustomerName' : 'masterSupplierName';
      const nameInp = document.getElementById(nameInpId);
      if (nameInp) {
        if (options.initialName) {
          nameInp.value = options.initialName;
          nameInp.dispatchEvent(new Event('input', { bubbles: true }));
        }
        nameInp.focus();
        if (options.initialName) {
          nameInp.select();
        }
      }
    }, 60);
  }

  function cancelMasterDeskReturn() {
    if (_masterDeskReturnContext) {
      const ctx = _masterDeskReturnContext;
      _masterDeskReturnContext = null;
      _masterLedgerAliases = [];
      _masterCustomerAliases = [];
      _masterSupplierAliases = [];

      const targetTab = ctx.returnTab || 'journal';

      if (typeof closeTab === 'function') {
        closeTab('master_desk', null, targetTab);
      } else if (typeof window.closeTab === 'function') {
        window.closeTab('master_desk', null, targetTab);
      }

      if (typeof openTab === 'function') {
        openTab(targetTab);
      } else if (typeof window.openTab === 'function') {
        window.openTab(targetTab);
      } else if (typeof navigateTo === 'function') {
        navigateTo(targetTab);
      }

      if (targetTab === 'sales_voucher') {
        if (typeof window.onPartyCreationCancelledForSales === 'function') {
          window.onPartyCreationCancelledForSales(ctx.initialName);
        }
      } else if (targetTab === 'purchase_voucher') {
        if (typeof window.onPartyCreationCancelledForPurchase === 'function') {
          window.onPartyCreationCancelledForPurchase(ctx.initialName);
        }
      } else if (targetTab === 'journal') {
        if (typeof window.onLedgerCreationCancelledForJournal === 'function') {
          window.onLedgerCreationCancelledForJournal(ctx.rowId, ctx.initialName);
        }
      }
      return true;
    }
    return false;
  }

  function handleMasterDeskClosed() {
    cancelMasterDeskReturn();
  }

  function checkAndRestorePendingJournalState() {
    cancelMasterDeskReturn();
  }

  // Expose global functions & state
  window.renderMasterDeskPanel = renderMasterDeskPanel;
  window.initMasterDesk = initMasterDesk;
  window.openMasterDeskCreateLedger = openMasterDeskCreateLedger;
  window.openMasterDeskCreateParty = openMasterDeskCreateParty;
  window.handleMasterDeskClosed = handleMasterDeskClosed;
  window.checkAndRestorePendingJournalState = checkAndRestorePendingJournalState;
  window._masterStockGroups = _masterStockGroups;
  window._masterStockCategories = _masterStockCategories;
  window._masterUnits = _masterUnits;
  window._masterWarehouses = _masterWarehouses;
  window._masterStockItems = _masterStockItems;
})();

