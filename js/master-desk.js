// ══════════════════════════════════════════════════════════════════
//  MASTER DESK — Central Master Control & Enterprise Workspace
// ══════════════════════════════════════════════════════════════════

(function() {
  let _masterDeskInitialized = false;
  let currentMasterDeskSubtype = 'Create';
  let currentMasterDeskTab = 'overview';
  let _masterGroupAliases = [];
  // Create Group multi-row: each row keeps its own Alternate Names. _masterGroupAliases
  // always holds the active row's list; other rows' lists are parked here by row index.
  let _masterGroupRowAliases = {};
  let _masterGroupActiveRowIdx = 0;
  let _masterGroupExtraRowKeys = [];
  let _masterGroupExtraRowSeq = 0;
  let _masterLedgerAliases = [];
  // Create Ledger multi-row: _masterLedgerAliases (and the side box / popup fields) hold
  // the active row's values; other rows' values are parked here by row index.
  let _masterLedgerRowState = {};
  let _masterLedgerActiveRowIdx = 0;
  let _masterLedgerExtraRowKeys = [];
  let _masterLedgerExtraRowSeq = 0;
  let _masterCustomerAliases = [];
  // Create Customer multi-row: same scheme as Create Ledger (active row's values live in
  // _masterCustomerAliases and the side box / popup fields; other rows are parked here).
  let _masterCustomerRowState = {};
  let _masterCustomerActiveRowIdx = 0;
  let _masterCustomerExtraRowKeys = [];
  let _masterCustomerExtraRowSeq = 0;
  let _masterSupplierAliases = [];
  // Create Supplier multi-row: same scheme as Create Customer / Ledger.
  let _masterSupplierRowState = {};
  let _masterSupplierActiveRowIdx = 0;
  let _masterSupplierExtraRowKeys = [];
  let _masterSupplierExtraRowSeq = 0;
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

  // RBI-regulated banks operating in India (Public Sector, Domestic Private Sector,
  // Small Finance, Payments, Regional Rural & Foreign Banks) — powers the searchable
  // Bank Name field. Ref: https://www.rbi.org.in/commonman/english/scripts/BanksInIndia.aspx
  const INDIAN_BANKS_LIST = [
    // Public Sector Banks
    'State Bank of India', 'Bank of Baroda', 'Bank of India', 'Bank of Maharashtra',
    'Canara Bank', 'Central Bank of India', 'Indian Bank', 'Indian Overseas Bank',
    'Punjab & Sind Bank', 'Punjab National Bank', 'UCO Bank', 'Union Bank of India',
    // Domestic Private Sector Banks
    'Axis Bank Limited', 'Bandhan Bank Limited', 'CSB Bank Limited', 'City Union Bank Limited',
    'DCB Bank Limited', 'Dhanlaxmi Bank Limited', 'Federal Bank Limited', 'HDFC Bank Limited',
    'ICICI Bank Limited', 'IndusInd Bank Limited', 'IDFC FIRST Bank Limited',
    'Jammu & Kashmir Bank Limited', 'Karnataka Bank Limited', 'Karur Vysya Bank Limited',
    'Kotak Mahindra Bank Limited', 'Nainital Bank Limited', 'RBL Bank Limited',
    'South Indian Bank Limited', 'Tamilnad Mercantile Bank Limited', 'YES Bank Limited',
    'IDBI Bank Limited',
    // Small Finance Banks
    'Au Small Finance Bank Limited', 'Capital Small Finance Bank Limited',
    'Equitas Small Finance Bank Limited', 'ESAF Small Finance Bank Limited',
    'Suryoday Small Finance Bank Limited', 'Ujjivan Small Finance Bank Limited',
    'Utkarsh Small Finance Bank Limited', 'slice Small Finance Bank Limited',
    'Jana Small Finance Bank Limited', 'Shivalik Small Finance Bank Limited',
    'Unity Small Finance Bank Limited',
    // Payments Banks
    'India Post Payments Bank Limited', 'Fino Payments Bank Limited',
    'Paytm Payments Bank Limited', 'Airtel Payments Bank Limited', 'NSDL Payments Bank Limited',
    // Regional Rural Banks
    'Andhra Pradesh Grameena Bank', 'Assam Gramin Bank', 'Arunachal Pradesh Rural Bank',
    'Bihar Gramin Bank', 'Chhattisgarh Gramin Bank', 'Gujarat Gramin Bank',
    'Haryana Gramin Bank', 'Himachal Pradesh Gramin Bank', 'Jharkhand Gramin Bank',
    'Jammu and Kashmir Grameen Bank', 'Karnataka Grameena Bank', 'Kerala Grameena Bank',
    'Maharashtra Gramin Bank', 'Madhya Pradesh Gramin Bank', 'Manipur Rural Bank',
    'Meghalaya Rural Bank', 'Mizoram Rural Bank', 'Nagaland Rural Bank',
    'Odisha Grameen Bank', 'Punjab Gramin Bank', 'Puducherry Grama Bank',
    'Rajasthan Gramin Bank', 'Tamil Nadu Grama Bank', 'Telangana Grameena Bank',
    'Tripura Gramin Bank', 'Uttar Pradesh Gramin Bank', 'Uttarakhand Gramin Bank',
    'West Bengal Gramin Bank',
    // Foreign Banks in India
    'AB Bank PLC', 'American Express Banking Corporation',
    'Australia and New Zealand Banking Group Ltd.', 'Barclays Bank Plc.',
    'Bank of America National Association', 'Bank of Bahrain and Kuwait B.S.C.',
    'Bank of Ceylon', 'Bank of China Limited', 'Bank of Nova Scotia', 'BNP Paribas',
    'Citibank N.A.', 'Cooperatieve Rabobank U.A.',
    'Credit Agricole Corporate and Investment Bank', 'CTBC Bank Co., Ltd.',
    'DBS Bank India Limited', 'Deutsche Bank A.G.', 'Doha Bank Q.P.S.C',
    'Emirates NBD Bank P.J.S.C', 'First Abu Dhabi Bank PJSC', 'FirstRand Bank Limited',
    'Hong Kong and Shanghai Banking Corporation Limited', 'Industrial and Commercial Bank of China',
    'Industrial Bank of Korea', 'J.P. Morgan Chase Bank N.A.', 'JSC VTB Bank', 'KEB Hana Bank',
    'Kookmin Bank', 'Mashreqbank P.S.C', 'Mizuho Bank Ltd.', 'MUFG Bank, Ltd.',
    'NatWest Markets Plc', 'NongHyup Bank', 'PT Bank Maybank Indonesia TBK',
    'Qatar National Bank (Q.P.S.C.)', 'Sberbank', 'SBM Bank (India) Limited', 'Shinhan Bank',
    'Societe Generale', 'Sonali Bank PLC', 'Standard Chartered Bank',
    'Sumitomo Mitsui Banking Corporation', 'United Overseas Bank Limited', 'UBS AG', 'Woori Bank'
  ].sort((a, b) => a.localeCompare(b));

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

  // ── GSTIN / PAN validation (format + checksum) — matches Company Profile & Vault ──
  const GSTIN_CODE_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function gstinCheckDigit(gstin14) {
    let factor = 2, sum = 0;
    for (let i = 13; i >= 0; i--) {
      const codePoint = GSTIN_CODE_CHARS.indexOf(gstin14[i]);
      let d = factor * codePoint;
      d = Math.floor(d / 36) + (d % 36);
      sum += d;
      factor = factor === 2 ? 1 : 2;
    }
    return GSTIN_CODE_CHARS[(36 - (sum % 36)) % 36];
  }
  function isValidGstin(raw) {
    const match = /^([0-9]{2})([A-Z]{5}[0-9]{4}[A-Z])([1-9A-Z])(Z)([0-9A-Z])$/.test(raw);
    return match && raw[14] === gstinCheckDigit(raw.slice(0, 14));
  }
  function isValidPan(raw) {
    return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(raw);
  }

  // Wires live GSTIN/PAN validity status + "Update PAN from GSTIN" affordance onto an
  // existing GSTIN/PAN input pair. Safe to call after every render (creates its DOM
  // helpers once per fresh input, since contentArea is fully re-rendered each time).
  function wireGstinPanValidation(container, gstinId, panId) {
    const gstinInput = container.querySelector('#' + gstinId);
    const panInput = container.querySelector('#' + panId);
    if (!gstinInput || !panInput) return;

    // Wrap GSTIN input + its status line in one box so it stays a single grid cell
    // (keeps GSTIN & PAN side-by-side in the same row, status text below each).
    // width:100%/min-width:0 are required here — once the input is no longer a direct
    // grid item it loses the grid's automatic stretch/shrink sizing and will overflow
    // the row without them.
    const gstinCell = document.createElement('div');
    gstinCell.style.cssText = 'width: 100%; min-width: 0;';
    gstinInput.parentNode.insertBefore(gstinCell, gstinInput);
    gstinCell.appendChild(gstinInput);
    gstinInput.style.width = '100%';

    const gstinStatus = document.createElement('div');
    gstinStatus.id = gstinId + 'Status';
    gstinStatus.style.cssText = 'font-size: 11px; font-weight: 600; margin-top: 5px; min-height: 14px;';
    gstinCell.appendChild(gstinStatus);

    // Wrap PAN input (input + inline Update button) + its status line, same as GSTIN cell
    const panCell = document.createElement('div');
    panCell.style.cssText = 'width: 100%; min-width: 0;';
    panInput.parentNode.insertBefore(panCell, panInput);

    const panFieldBox = document.createElement('div');
    panFieldBox.style.cssText = 'position: relative; width: 100%; min-width: 0;';
    panCell.appendChild(panFieldBox);
    panFieldBox.appendChild(panInput);
    panInput.style.width = '100%';
    panInput.style.paddingRight = '70px';

    // Matches Company Profile & Vault's "Update" affordance (same class + placement)
    const panUpdateBtn = document.createElement('button');
    panUpdateBtn.type = 'button';
    panUpdateBtn.id = panId + 'UpdateBtn';
    panUpdateBtn.className = 'sales-roundoff-btn-inline';
    panUpdateBtn.textContent = 'Update';
    panUpdateBtn.style.cssText = 'display: none; position: absolute; right: 5px; top: 50%; transform: translateY(-50%); height: 26px; width: auto; min-width: 0; padding: 0 10px;';
    panFieldBox.appendChild(panUpdateBtn);

    const panStatus = document.createElement('div');
    panStatus.id = panId + 'Status';
    panStatus.style.cssText = 'font-size: 11px; font-weight: 600; margin-top: 5px; min-height: 14px;';
    panCell.appendChild(panStatus);

    const renderPanStatus = () => {
      const raw = panInput.value.toUpperCase().trim();
      if (!raw) {
        panStatus.textContent = '';
      } else if (isValidPan(raw)) {
        panStatus.textContent = 'Valid PAN';
        panStatus.style.color = '#059669';
      } else {
        panStatus.textContent = 'Invalid PAN';
        panStatus.style.color = '#dc2626';
      }
    };

    const renderGstinStatus = () => {
      const raw = gstinInput.value.toUpperCase().trim();
      panUpdateBtn.style.display = 'none';

      if (!raw) {
        gstinStatus.textContent = '';
        return;
      }
      if (!isValidGstin(raw)) {
        gstinStatus.textContent = 'Invalid GSTIN';
        gstinStatus.style.color = '#dc2626';
        return;
      }

      gstinStatus.textContent = 'Valid GSTIN';
      gstinStatus.style.color = '#059669';

      const panFromGstin = raw.slice(2, 12);
      const currentPan = panInput.value.trim().toUpperCase();
      if (!currentPan) {
        panInput.value = panFromGstin;
        renderPanStatus();
      } else if (currentPan !== panFromGstin) {
        panUpdateBtn.style.display = 'block';
      }
    };

    gstinInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase();
      renderGstinStatus();
    });
    panInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase();
      renderPanStatus();
    });
    panUpdateBtn.addEventListener('click', () => {
      const raw = gstinInput.value.toUpperCase().trim();
      if (isValidGstin(raw)) {
        panInput.value = raw.slice(2, 12);
        panUpdateBtn.style.display = 'none';
        renderPanStatus();
      }
    });

    renderGstinStatus();
    renderPanStatus();
  }

  // ── Generic Code -> Description combobox (HSN / SAC and similar code masters) ──
  // Code is searchable; Description is a read-only display auto-filled from the
  // selected code, showing a hover popup when its text is truncated.
  function wireCodeDescComboField(container, codePrefix, descPrefix, codeList, noun) {
    const list = Array.isArray(codeList) ? codeList : [];

    const codeHidden = container.querySelector('#' + codePrefix);
    const codeTrigger = container.querySelector('#' + codePrefix + 'Trigger');
    const codeTriggerText = container.querySelector('#' + codePrefix + 'TriggerText');
    const codeDropdown = container.querySelector('#' + codePrefix + 'Dropdown');
    const codeSearch = container.querySelector('#' + codePrefix + 'Search');
    const codeOptionsList = container.querySelector('#' + codePrefix + 'OptionsList');

    const descHidden = container.querySelector('#' + descPrefix);
    const descTrigger = container.querySelector('#' + descPrefix + 'Trigger');
    const descTriggerText = container.querySelector('#' + descPrefix + 'TriggerText');

    if (!codeHidden || !descHidden || !codeTrigger) return;

    const MAX_RESULTS = 60;

    const setPair = (code, desc) => {
      codeHidden.value = code || '';
      codeTriggerText.textContent = code || ('Search ' + noun + ' code...');
      codeTriggerText.style.color = code ? 'var(--slate-700)' : 'var(--slate-400)';

      descHidden.value = desc || '';
      if (descTriggerText) {
        descTriggerText.textContent = desc || ('Auto-filled from ' + noun + ' Code');
        descTriggerText.style.color = desc ? 'var(--slate-700)' : 'var(--slate-400)';
      }
    };

    // Hover popup for the truncated description box
    if (descTrigger && descTriggerText) {
      let descTooltip = null;
      descTrigger.addEventListener('mouseenter', () => {
        const isTruncated = descTriggerText.scrollWidth > descTriggerText.clientWidth;
        const text = descHidden.value;
        if (!isTruncated || !text) return;

        descTooltip = document.createElement('div');
        descTooltip.textContent = text;
        descTooltip.style.cssText = 'position: fixed; z-index: 3000; max-width: 320px; max-height: 240px; overflow-y: auto; padding: 8px 12px; font-size: 12.5px; font-weight: 500; line-height: 1.4; color: var(--slate-700); background: #fff; border: 1.5px solid var(--slate-200); border-radius: 8px; box-shadow: var(--shadow-lg, 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1));';
        document.body.appendChild(descTooltip);

        const rect = descTrigger.getBoundingClientRect();
        const tipRect = descTooltip.getBoundingClientRect();
        let top = rect.bottom + 6;
        let left = rect.left;
        if (left + tipRect.width > window.innerWidth - 8) {
          left = Math.max(8, window.innerWidth - tipRect.width - 8);
        }
        if (top + tipRect.height > window.innerHeight - 8) {
          top = rect.top - tipRect.height - 6;
        }
        top = Math.max(8, top);
        descTooltip.style.top = top + 'px';
        descTooltip.style.left = left + 'px';
      });
      descTrigger.addEventListener('mouseleave', () => {
        if (descTooltip) {
          descTooltip.remove();
          descTooltip = null;
        }
      });
    }

    const filterList = (query) => {
      const q = query.toLowerCase().trim();
      if (!q) return [];
      return list.filter(pair => pair[0].toLowerCase().includes(q) || pair[1].toLowerCase().includes(q));
    };

    const renderRows = (optionsList, matches, query, onUseTyped) => {
      optionsList.innerHTML = '';

      matches.slice(0, MAX_RESULTS).forEach(([code, desc]) => {
        const item = document.createElement('div');
        item.style.padding = '8px 12px';
        item.style.fontSize = '13px';
        item.style.borderRadius = '6px';
        item.style.cursor = 'pointer';
        item.style.lineHeight = '1.4';
        item.innerHTML = '<span style="font-weight:700; color: var(--blue-700);">' + escapeHtml(code) +
          '</span><span style="color: var(--slate-400);"> &mdash; </span>' +
          '<span style="color: var(--slate-700);">' + escapeHtml(desc) + '</span>';

        item.addEventListener('mouseover', () => { item.style.background = 'var(--slate-50)'; });
        item.addEventListener('mouseout', () => { item.style.background = 'transparent'; });
        item.addEventListener('click', () => {
          setPair(code, desc);
          codeDropdown.style.display = 'none';
        });

        optionsList.appendChild(item);
      });

      if (matches.length === 0) {
        if (query) {
          const useRow = document.createElement('div');
          useRow.style.padding = '8px 12px';
          useRow.style.fontSize = '12.5px';
          useRow.style.fontWeight = '600';
          useRow.style.color = 'var(--blue-700)';
          useRow.style.cursor = 'pointer';
          useRow.textContent = 'Use "' + query + '" as typed';
          useRow.addEventListener('mouseover', () => { useRow.style.background = 'var(--slate-50)'; });
          useRow.addEventListener('mouseout', () => { useRow.style.background = 'transparent'; });
          useRow.addEventListener('click', () => {
            onUseTyped(query);
            codeDropdown.style.display = 'none';
          });
          optionsList.appendChild(useRow);
        } else {
          const emptyState = document.createElement('div');
          emptyState.style.padding = '10px 12px';
          emptyState.style.fontSize = '12px';
          emptyState.style.color = 'var(--slate-400)';
          emptyState.textContent = 'No matching ' + noun + ' code found';
          optionsList.appendChild(emptyState);
        }
      } else if (matches.length > MAX_RESULTS) {
        const moreState = document.createElement('div');
        moreState.style.padding = '8px 12px 2px 12px';
        moreState.style.fontSize = '11px';
        moreState.style.color = 'var(--slate-400)';
        moreState.style.textAlign = 'center';
        moreState.textContent = '+' + (matches.length - MAX_RESULTS) + ' more — refine your search';
        optionsList.appendChild(moreState);
      }
    };

    const showInitialPrompt = (optionsList) => {
      optionsList.innerHTML = '';
      const prompt = document.createElement('div');
      prompt.style.padding = '10px 12px';
      prompt.style.fontSize = '12px';
      prompt.style.color = 'var(--slate-400)';
      prompt.textContent = 'Type to search ' + list.length.toLocaleString('en-IN') + ' ' + noun + ' codes...';
      optionsList.appendChild(prompt);
    };

    const openDropdown = (dropdown, searchInput, optionsList) => {
      document.querySelectorAll('.kya-searchable-select-dropdown').forEach(dd => {
        if (dd !== dropdown) dd.style.display = 'none';
      });
      dropdown.style.display = 'flex';
      searchInput.value = '';
      showInitialPrompt(optionsList);
      setTimeout(() => searchInput.focus(), 50);
    };

    codeTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = codeDropdown.style.display === 'flex';
      if (!isOpen) {
        openDropdown(codeDropdown, codeSearch, codeOptionsList);
      } else {
        codeDropdown.style.display = 'none';
      }
    });
    codeSearch.addEventListener('input', (e) => {
      const q = e.target.value;
      renderRows(codeOptionsList, filterList(q), q.trim(), (typed) => setPair(typed, descHidden.value));
    });

    document.addEventListener('click', (e) => {
      if (!codeDropdown.contains(e.target) && !codeTrigger.contains(e.target)) {
        codeDropdown.style.display = 'none';
      }
    });
  }

  // HSN Code <-> Description (Master Desk > Stock Item)
  // Backed by window.HSN_CODE_LIST ([code, description] pairs) from js/hsn-codes.js.
  function wireHsnCodeDescFields(container, codePrefix, descPrefix) {
    const hsnList = (typeof window !== 'undefined' && Array.isArray(window.HSN_CODE_LIST)) ? window.HSN_CODE_LIST : [];
    wireCodeDescComboField(container, codePrefix, descPrefix, hsnList, 'HSN');
  }

  // SAC Code <-> Description (Master Desk > Ledger — Revenue from Operations group)
  // Backed by window.SAC_CODE_LIST ([code, description] pairs) from js/sac-codes.js.
  function wireSacCodeDescFields(container, codePrefix, descPrefix) {
    const sacList = (typeof window !== 'undefined' && Array.isArray(window.SAC_CODE_LIST)) ? window.SAC_CODE_LIST : [];
    wireCodeDescComboField(container, codePrefix, descPrefix, sacList, 'SAC');
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

    const btnOverview = document.getElementById('masterTabOverview');
    const btnGroup = document.getElementById('masterTabGroup');
    const btnLedger = document.getElementById('masterTabLedger');
    const btnCustomers = document.getElementById('masterTabCustomers');
    const btnSuppliers = document.getElementById('masterTabSuppliers');
    const btnStockGroup = document.getElementById('masterTabStockGroup');
    const btnStockItem = document.getElementById('masterTabStockItem');
    const btnStockCategory = document.getElementById('masterTabStockCategory');
    const btnUnit = document.getElementById('masterTabUnit');
    const btnWarehouse = document.getElementById('masterTabWarehouse');

    if (btnOverview) {
      btnOverview.classList.toggle('active', tab === 'overview');
      btnOverview.setAttribute('aria-selected', tab === 'overview');
    }
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
    return isTradeReceivableGroup(groupVal) || isTradePayableGroup(groupVal);
  }

  function isTradeReceivableGroup(groupVal) {
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

    if (targetSgId === 'sg-tr') return true;

    if (targetName && (
      targetName.includes('receivable') ||
      targetName.includes('debtor') ||
      targetName.includes('customer')
    )) {
      return true;
    }

    if (typeof COA_SYS_SGS !== 'undefined') {
      const sg = COA_SYS_SGS.find(s => s.id === targetSgId);
      if (sg) {
        if (sg.id === 'sg-tr' || sg.parent === 'sg-tr') return true;
        const sName = (sg.name || '').toLowerCase();
        if (
          sName.includes('receivable') ||
          sName.includes('debtor') ||
          sName.includes('customer')
        ) {
          return true;
        }
      }
    }

    return false;
  }

  function isTradePayableGroup(groupVal) {
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

    if (targetSgId === 'sg-tp') return true;

    if (targetName && (
      targetName.includes('payable') ||
      targetName.includes('creditor') ||
      targetName.includes('supplier') ||
      targetName.includes('vendor')
    )) {
      return true;
    }

    if (typeof COA_SYS_SGS !== 'undefined') {
      const sg = COA_SYS_SGS.find(s => s.id === targetSgId);
      if (sg) {
        if (sg.id === 'sg-tp' || sg.parent === 'sg-tp') return true;
        const sName = (sg.name || '').toLowerCase();
        if (
          sName.includes('payable') ||
          sName.includes('creditor') ||
          sName.includes('supplier') ||
          sName.includes('vendor')
        ) {
          return true;
        }
      }
    }

    return false;
  }

  function isBankAccountGroup(groupVal) {
    if (!groupVal) return false;
    const [pType, pId] = groupVal.split(':');

    let targetName = '';

    if (pType === 'gl') {
      const gl = typeof coaLedgers !== 'undefined' ? coaLedgers.find(l => String(l.id) === String(pId)) : null;
      if (gl) targetName = (gl.name || '').toLowerCase();
    } else if (pType === 'sg') {
      if (typeof COA_SYS_SGS !== 'undefined') {
        const sg = COA_SYS_SGS.find(s => s.id === pId);
        if (sg) targetName = (sg.name || '').toLowerCase();
      }
    }

    return targetName.includes('bank');
  }

  function isRevenueFromOperationsGroup(groupVal) {
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

    if (targetSgId === 'sg-rfo') return true;
    if (targetName.includes('revenue from operations')) return true;

    if (typeof COA_SYS_SGS !== 'undefined') {
      const sg = COA_SYS_SGS.find(s => s.id === targetSgId);
      if (sg) {
        if (sg.id === 'sg-rfo' || sg.parent === 'sg-rfo') return true;
        const sName = (sg.name || '').toLowerCase();
        if (sName.includes('revenue from operations')) return true;
      }
    }

    return false;
  }

  // Name input of the Create Group row whose Alternate Names are currently shown.
  function getMasterGroupActiveNameInput() {
    return document.getElementById('masterGroupName' + (_masterGroupActiveRowIdx ? _masterGroupActiveRowIdx : ''));
  }

  // Lower-cased Names and Alternate Names of every Create Group row except the active one.
  function getMasterGroupOtherRowValues() {
    const values = new Set();
    const activeInp = getMasterGroupActiveNameInput();
    document.querySelectorAll('.master-group-row input[id^="masterGroupName"]').forEach(inp => {
      if (inp === activeInp) return;
      const v = inp.value.trim().toLowerCase();
      if (v) values.add(v);
    });
    Object.keys(_masterGroupRowAliases).forEach(key => {
      if (Number(key) === _masterGroupActiveRowIdx) return;
      (_masterGroupRowAliases[key] || []).forEach(a => {
        const v = a.trim().toLowerCase();
        if (v) values.add(v);
      });
    });
    return values;
  }

  function validateMasterGroupAliasesLive() {
    const container = document.getElementById('masterGroupAliasesContainer');
    const nameInp = getMasterGroupActiveNameInput();
    if (!container) return true;
    const otherRowValues = getMasterGroupOtherRowValues();

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

      // Check 2: Duplicate of another alternate name in current form
      const duplicateInForm = aliasValues.some((otherVal, otherIdx) => otherIdx !== idx && otherVal !== '' && otherVal === valLower);
      if (duplicateInForm) {
        const errorText = `"${val}" is already entered as another alternate name in this form.`;
        errDiv.textContent = errorText;
        errDiv.style.display = 'block';
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.12)';
        hasAnyError = true;
        return;
      }

      // Check 2b: Duplicate of another group row's Name / Alternate Name in this form
      if (otherRowValues.has(valLower)) {
        const errorText = `"${val}" is already used by another group in this form.`;
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

  function getMasterGroupAliasRowIndex(block) {
    const container = document.getElementById('masterGroupAliasesContainer');
    if (!container) return -1;
    return Array.from(container.children).indexOf(block);
  }

  function updateMasterGroupAliasPlaceholders() {
    const container = document.getElementById('masterGroupAliasesContainer');
    if (!container) return;
    const rows = container.querySelectorAll('.master-alias-row-wrap');
    rows.forEach((row, i) => {
      const inp = row.querySelector('.master-alias-input');
      if (inp) {
        inp.placeholder = `Enter Alternate Name`;
      }
    });
  }

  // Appends a fresh empty alias box below the current last one, once it's been typed
  // into — no limit on how many can chain this way.
  function maybeAddNextMasterGroupAliasBox(currentIdx, val) {
    if (!val) return;
    const isLast = currentIdx === _masterGroupAliases.length - 1;
    if (!isLast) return;

    _masterGroupAliases.push('');
    const container = document.getElementById('masterGroupAliasesContainer');
    if (container) {
      container.appendChild(createMasterGroupAliasBox(_masterGroupAliases.length - 1));
      updateMasterGroupAliasPlaceholders();
    }
  }

  // If alternate name was cleared/removed, also remove the box under it if it is empty.
  function maybeRemoveNextMasterGroupAliasBox(currentIdx) {
    const container = document.getElementById('masterGroupAliasesContainer');
    if (!container) return;

    while (currentIdx + 1 < _masterGroupAliases.length && _masterGroupAliases[currentIdx + 1].trim() === '') {
      _masterGroupAliases.splice(currentIdx + 1, 1);
      const nextChild = container.children[currentIdx + 1];
      if (nextChild) {
        nextChild.remove();
      }
    }
    updateMasterGroupAliasPlaceholders();
    validateMasterGroupAliasesLive();
  }

  // Builds one Alternate Name box (input + remove button + error line) for the given
  // index in _masterGroupAliases, without touching any other already-rendered box.
  function createMasterGroupAliasBox(idx) {
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
    input.placeholder = `Enter Alternate Name`;
    input.value = _masterGroupAliases[idx] || '';
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
      const currentIdx = getMasterGroupAliasRowIndex(block);
      if (currentIdx === -1) return;

      const val = e.target.value;
      _masterGroupAliases[currentIdx] = val;
      const trimmed = val.trim();

      validateMasterGroupAliasesLive();

      if (trimmed !== '') {
        maybeAddNextMasterGroupAliasBox(currentIdx, trimmed);
      } else {
        maybeRemoveNextMasterGroupAliasBox(currentIdx);
      }
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn-master-alias-del';
    delBtn.title = 'Remove Alternate Name';
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
        <path d="M3 6h18"/>
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        <line x1="10" y1="11" x2="10" y2="17"/>
        <line x1="14" y1="11" x2="14" y2="17"/>
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
      const currentIdx = getMasterGroupAliasRowIndex(block);
      if (currentIdx === -1) return;

      // Remove this box
      _masterGroupAliases.splice(currentIdx, 1);

      // Also drop the box(es) right under it as long as they're still empty
      while (currentIdx < _masterGroupAliases.length && _masterGroupAliases[currentIdx].trim() === '') {
        _masterGroupAliases.splice(currentIdx, 1);
      }

      const nameInp = getMasterGroupActiveNameInput();
      const hasName = nameInp && nameInp.value.trim() !== '';

      if (_masterGroupAliases.length === 0) {
        if (hasName) {
          _masterGroupAliases = [''];
        }
      } else {
        if (_masterGroupAliases[_masterGroupAliases.length - 1].trim() !== '') {
          _masterGroupAliases.push('');
        }
      }
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
    return block;
  }

  function renderMasterGroupAliases() {
    const container = document.getElementById('masterGroupAliasesContainer');
    const akaPanel = document.getElementById('masterGroupAkaPanel');
    if (!container) return;

    container.innerHTML = '';
    _masterGroupAliases.forEach((alias, idx) => {
      container.appendChild(createMasterGroupAliasBox(idx));
    });

    if (akaPanel) {
      akaPanel.style.display = _masterGroupAliases.length > 0 ? 'block' : 'none';
    }

    validateMasterGroupAliasesLive();
  }

  function validateMasterLedgerAliasesLive() {
    const container = document.getElementById('masterLedgerAliasesContainer');
    const nameInp = document.getElementById('masterLedgerName' + (_masterLedgerActiveRowIdx ? _masterLedgerActiveRowIdx : ''));
    if (!container) return true;

    const currentName = nameInp ? nameInp.value.trim().toLowerCase() : '';
    // Lower-cased Names and Alternate Names of every other Create Ledger row
    const otherRowValues = new Set();
    document.querySelectorAll('.master-ledger-row input[id^="masterLedgerName"]').forEach(inp => {
      if (inp === nameInp) return;
      const v = inp.value.trim().toLowerCase();
      if (v) otherRowValues.add(v);
    });
    Object.keys(_masterLedgerRowState).forEach(key => {
      if (Number(key) === (_masterLedgerActiveRowIdx || 0)) return;
      ((_masterLedgerRowState[key] && _masterLedgerRowState[key].aliases) || []).forEach(a => {
        const v = a.trim().toLowerCase();
        if (v) otherRowValues.add(v);
      });
    });
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

      // Check 2b: Duplicate of another ledger row's Name / Alternate Name in this form
      if (otherRowValues.has(valLower)) {
        const errorText = `"${val}" is already used by another ledger in this form.`;
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

  // ── Ledger Alternate Names (same behaviour as Create Group): the panel beside the
  // form appears once Name is filled in, one box per alias, auto-adding another box
  // below as you type (no limit) ──
  function getMasterLedgerAliasRowIndex(block) {
    const container = document.getElementById('masterLedgerAliasesContainer');
    if (!container) return -1;
    return Array.from(container.children).indexOf(block);
  }

  function updateMasterLedgerAliasPlaceholders() {
    const container = document.getElementById('masterLedgerAliasesContainer');
    if (!container) return;
    container.querySelectorAll('.master-alias-row-wrap').forEach((row, i) => {
      const inp = row.querySelector('.master-alias-input');
      if (inp) inp.placeholder = `Enter Alternate Name`;
    });
  }

  function createMasterLedgerAliasBox(idx) {
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
    input.placeholder = `Enter Alternate Name`;
    input.value = _masterLedgerAliases[idx] || '';
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
      const currentIdx = getMasterLedgerAliasRowIndex(block);
      if (currentIdx === -1) return;
      _masterLedgerAliases[currentIdx] = e.target.value;
      validateMasterLedgerAliasesLive();

      const container = document.getElementById('masterLedgerAliasesContainer');
      if (e.target.value.trim() !== '') {
        // Typed into the last box: append a fresh empty one below
        if (currentIdx === _masterLedgerAliases.length - 1 && container) {
          _masterLedgerAliases.push('');
          container.appendChild(createMasterLedgerAliasBox(_masterLedgerAliases.length - 1));
          updateMasterLedgerAliasPlaceholders();
        }
      } else if (container) {
        // Cleared: drop the empty box(es) right under it
        while (currentIdx + 1 < _masterLedgerAliases.length && _masterLedgerAliases[currentIdx + 1].trim() === '') {
          _masterLedgerAliases.splice(currentIdx + 1, 1);
          const nextChild = container.children[currentIdx + 1];
          if (nextChild) nextChild.remove();
        }
        updateMasterLedgerAliasPlaceholders();
        validateMasterLedgerAliasesLive();
      }
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn-master-alias-del';
    delBtn.title = 'Remove Alternate Name';
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
        <path d="M3 6h18"/>
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        <line x1="10" y1="11" x2="10" y2="17"/>
        <line x1="14" y1="11" x2="14" y2="17"/>
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
      const currentIdx = getMasterLedgerAliasRowIndex(block);
      if (currentIdx === -1) return;

      _masterLedgerAliases.splice(currentIdx, 1);
      // Also drop the box(es) right under it as long as they're still empty
      while (currentIdx < _masterLedgerAliases.length && _masterLedgerAliases[currentIdx].trim() === '') {
        _masterLedgerAliases.splice(currentIdx, 1);
      }

      const nameInp = document.getElementById('masterLedgerName' + (_masterLedgerActiveRowIdx ? _masterLedgerActiveRowIdx : ''));
      const hasName = nameInp && nameInp.value.trim() !== '';
      if (_masterLedgerAliases.length === 0) {
        if (hasName) _masterLedgerAliases = [''];
      } else if (_masterLedgerAliases[_masterLedgerAliases.length - 1].trim() !== '') {
        _masterLedgerAliases.push('');
      }
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
    return block;
  }

  function renderMasterLedgerAliases() {
    const container = document.getElementById('masterLedgerAliasesContainer');
    const akaPanel = document.getElementById('masterLedgerAkaPanel');
    if (!container) return;

    container.innerHTML = '';
    _masterLedgerAliases.forEach((alias, idx) => {
      container.appendChild(createMasterLedgerAliasBox(idx));
    });

    if (akaPanel) {
      akaPanel.style.display = _masterLedgerAliases.length > 0 ? 'block' : 'none';
    }

    validateMasterLedgerAliasesLive();
  }

  function validateMasterCustomerAliasesLive() {
    const container = document.getElementById('masterCustomerAliasesContainer');
    const nameInp = document.getElementById('masterCustomerName' + (_masterCustomerActiveRowIdx ? _masterCustomerActiveRowIdx : ''));
    if (!container) return true;

    const currentName = nameInp ? nameInp.value.trim().toLowerCase() : '';
    // Lower-cased Names and Alternate Names of every other Create Customer row
    const otherRowValues = new Set();
    document.querySelectorAll('.master-customer-row input[id^="masterCustomerName"]').forEach(inp => {
      if (inp === nameInp) return;
      const v = inp.value.trim().toLowerCase();
      if (v) otherRowValues.add(v);
    });
    Object.keys(_masterCustomerRowState).forEach(key => {
      if (Number(key) === (_masterCustomerActiveRowIdx || 0)) return;
      ((_masterCustomerRowState[key] && _masterCustomerRowState[key].aliases) || []).forEach(a => {
        const v = a.trim().toLowerCase();
        if (v) otherRowValues.add(v);
      });
    });
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

      // Check 2b: Duplicate of another customer row's Name / Alternate Name in this form
      if (otherRowValues.has(valLower)) {
        const errorText = `"${val}" is already used by another customer in this form.`;
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

  // ── Customer Alternate Names (same behaviour as Create Group / Ledger): the panel beside the
  // form appears once Name is filled in, one box per alias, auto-adding another box
  // below as you type (no limit) ──
  function getMasterCustomerAliasRowIndex(block) {
    const container = document.getElementById('masterCustomerAliasesContainer');
    if (!container) return -1;
    return Array.from(container.children).indexOf(block);
  }

  function updateMasterCustomerAliasPlaceholders() {
    const container = document.getElementById('masterCustomerAliasesContainer');
    if (!container) return;
    container.querySelectorAll('.master-alias-row-wrap').forEach((row, i) => {
      const inp = row.querySelector('.master-alias-input');
      if (inp) inp.placeholder = `Enter Alternate Name`;
    });
  }

  function createMasterCustomerAliasBox(idx) {
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
    input.placeholder = `Enter Alternate Name`;
    input.value = _masterCustomerAliases[idx] || '';
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
      const currentIdx = getMasterCustomerAliasRowIndex(block);
      if (currentIdx === -1) return;
      _masterCustomerAliases[currentIdx] = e.target.value;
      validateMasterCustomerAliasesLive();

      const container = document.getElementById('masterCustomerAliasesContainer');
      if (e.target.value.trim() !== '') {
        // Typed into the last box: append a fresh empty one below
        if (currentIdx === _masterCustomerAliases.length - 1 && container) {
          _masterCustomerAliases.push('');
          container.appendChild(createMasterCustomerAliasBox(_masterCustomerAliases.length - 1));
          updateMasterCustomerAliasPlaceholders();
        }
      } else if (container) {
        // Cleared: drop the empty box(es) right under it
        while (currentIdx + 1 < _masterCustomerAliases.length && _masterCustomerAliases[currentIdx + 1].trim() === '') {
          _masterCustomerAliases.splice(currentIdx + 1, 1);
          const nextChild = container.children[currentIdx + 1];
          if (nextChild) nextChild.remove();
        }
        updateMasterCustomerAliasPlaceholders();
        validateMasterCustomerAliasesLive();
      }
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn-master-alias-del';
    delBtn.title = 'Remove Alternate Name';
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
        <path d="M3 6h18"/>
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        <line x1="10" y1="11" x2="10" y2="17"/>
        <line x1="14" y1="11" x2="14" y2="17"/>
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
      const currentIdx = getMasterCustomerAliasRowIndex(block);
      if (currentIdx === -1) return;

      _masterCustomerAliases.splice(currentIdx, 1);
      // Also drop the box(es) right under it as long as they're still empty
      while (currentIdx < _masterCustomerAliases.length && _masterCustomerAliases[currentIdx].trim() === '') {
        _masterCustomerAliases.splice(currentIdx, 1);
      }

      const nameInp = document.getElementById('masterCustomerName' + (_masterCustomerActiveRowIdx ? _masterCustomerActiveRowIdx : ''));
      const hasName = nameInp && nameInp.value.trim() !== '';
      if (_masterCustomerAliases.length === 0) {
        if (hasName) _masterCustomerAliases = [''];
      } else if (_masterCustomerAliases[_masterCustomerAliases.length - 1].trim() !== '') {
        _masterCustomerAliases.push('');
      }
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
    return block;
  }

  function renderMasterCustomerAliases() {
    const container = document.getElementById('masterCustomerAliasesContainer');
    const akaPanel = document.getElementById('masterCustomerAkaPanel');
    if (!container) return;

    container.innerHTML = '';
    _masterCustomerAliases.forEach((alias, idx) => {
      container.appendChild(createMasterCustomerAliasBox(idx));
    });

    if (akaPanel) {
      akaPanel.style.display = _masterCustomerAliases.length > 0 ? 'block' : 'none';
    }

    validateMasterCustomerAliasesLive();
  }

  function validateMasterSupplierAliasesLive() {
    const container = document.getElementById('masterSupplierAliasesContainer');
    const nameInp = document.getElementById('masterSupplierName' + (_masterSupplierActiveRowIdx ? _masterSupplierActiveRowIdx : ''));
    if (!container) return true;

    const currentName = nameInp ? nameInp.value.trim().toLowerCase() : '';
    // Lower-cased Names and Alternate Names of every other Create Supplier row
    const otherRowValues = new Set();
    document.querySelectorAll('.master-supplier-row input[id^="masterSupplierName"]').forEach(inp => {
      if (inp === nameInp) return;
      const v = inp.value.trim().toLowerCase();
      if (v) otherRowValues.add(v);
    });
    Object.keys(_masterSupplierRowState).forEach(key => {
      if (Number(key) === (_masterSupplierActiveRowIdx || 0)) return;
      ((_masterSupplierRowState[key] && _masterSupplierRowState[key].aliases) || []).forEach(a => {
        const v = a.trim().toLowerCase();
        if (v) otherRowValues.add(v);
      });
    });
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

      // Check 2b: Duplicate of another supplier row's Name / Alternate Name in this form
      if (otherRowValues.has(valLower)) {
        const errorText = `"${val}" is already used by another supplier in this form.`;
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

  // ── Supplier Alternate Names (same behaviour as Create Group / Ledger): the panel beside the
  // form appears once Name is filled in, one box per alias, auto-adding another box
  // below as you type (no limit) ──
  function getMasterSupplierAliasRowIndex(block) {
    const container = document.getElementById('masterSupplierAliasesContainer');
    if (!container) return -1;
    return Array.from(container.children).indexOf(block);
  }

  function updateMasterSupplierAliasPlaceholders() {
    const container = document.getElementById('masterSupplierAliasesContainer');
    if (!container) return;
    container.querySelectorAll('.master-alias-row-wrap').forEach((row, i) => {
      const inp = row.querySelector('.master-alias-input');
      if (inp) inp.placeholder = `Enter Alternate Name`;
    });
  }

  function createMasterSupplierAliasBox(idx) {
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
    input.placeholder = `Enter Alternate Name`;
    input.value = _masterSupplierAliases[idx] || '';
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
      const currentIdx = getMasterSupplierAliasRowIndex(block);
      if (currentIdx === -1) return;
      _masterSupplierAliases[currentIdx] = e.target.value;
      validateMasterSupplierAliasesLive();

      const container = document.getElementById('masterSupplierAliasesContainer');
      if (e.target.value.trim() !== '') {
        // Typed into the last box: append a fresh empty one below
        if (currentIdx === _masterSupplierAliases.length - 1 && container) {
          _masterSupplierAliases.push('');
          container.appendChild(createMasterSupplierAliasBox(_masterSupplierAliases.length - 1));
          updateMasterSupplierAliasPlaceholders();
        }
      } else if (container) {
        // Cleared: drop the empty box(es) right under it
        while (currentIdx + 1 < _masterSupplierAliases.length && _masterSupplierAliases[currentIdx + 1].trim() === '') {
          _masterSupplierAliases.splice(currentIdx + 1, 1);
          const nextChild = container.children[currentIdx + 1];
          if (nextChild) nextChild.remove();
        }
        updateMasterSupplierAliasPlaceholders();
        validateMasterSupplierAliasesLive();
      }
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn-master-alias-del';
    delBtn.title = 'Remove Alternate Name';
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
        <path d="M3 6h18"/>
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        <line x1="10" y1="11" x2="10" y2="17"/>
        <line x1="14" y1="11" x2="14" y2="17"/>
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
      const currentIdx = getMasterSupplierAliasRowIndex(block);
      if (currentIdx === -1) return;

      _masterSupplierAliases.splice(currentIdx, 1);
      // Also drop the box(es) right under it as long as they're still empty
      while (currentIdx < _masterSupplierAliases.length && _masterSupplierAliases[currentIdx].trim() === '') {
        _masterSupplierAliases.splice(currentIdx, 1);
      }

      const nameInp = document.getElementById('masterSupplierName' + (_masterSupplierActiveRowIdx ? _masterSupplierActiveRowIdx : ''));
      const hasName = nameInp && nameInp.value.trim() !== '';
      if (_masterSupplierAliases.length === 0) {
        if (hasName) _masterSupplierAliases = [''];
      } else if (_masterSupplierAliases[_masterSupplierAliases.length - 1].trim() !== '') {
        _masterSupplierAliases.push('');
      }
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
    return block;
  }

  function renderMasterSupplierAliases() {
    const container = document.getElementById('masterSupplierAliasesContainer');
    const akaPanel = document.getElementById('masterSupplierAkaPanel');
    if (!container) return;

    container.innerHTML = '';
    _masterSupplierAliases.forEach((alias, idx) => {
      container.appendChild(createMasterSupplierAliasBox(idx));
    });

    if (akaPanel) {
      akaPanel.style.display = _masterSupplierAliases.length > 0 ? 'block' : 'none';
    }

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
          <path d="M3 6h18"/>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
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

  // Builds the "Under" searchable-select block (Parent Groups only) for a Create Group
  // row. `suffix` is '' for the first/primary row, or the row index (1, 2, ...) for
  // additional rows added automatically as the user fills them in (Multi Create style).
  function buildGroupUnderSelectHtml(suffix, groupOptionsHtml, defaultLabel) {
    const selId = 'masterGroupUnderCombinedSel' + suffix;
    const labelText = defaultLabel || 'Select parent group';
    return `
      <select class="coa-modal-sel" id="${selId}" style="display: none;">
        ${groupOptionsHtml}
      </select>
      <div class="kya-searchable-select-wrap" id="${selId}SearchableWrap" style="position: relative; width: 100%;">
        <div class="kya-searchable-select-trigger" id="${selId}Trigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
          <span id="${selId}TriggerText">${escapeHtml(labelText)}</span>
          <span style="font-size: 10px; color: var(--slate-400);">▼</span>
        </div>
        <div class="kya-searchable-select-dropdown" id="${selId}Dropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
          <input type="text" id="${selId}Search" placeholder="Search parent group..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
          <div id="${selId}OptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
        </div>
      </div>
    `;
  }

  // Builds the "Group" searchable-select block for a Create Ledger row. `suffix` is ''
  // for the first row, or the row index (1, 2, ...) for rows added with "Add Another Ledger".
  function buildLedgerGroupSelectHtml(suffix, ledgerGroupOptionsHtml, defaultLabel) {
    const selId = 'masterLedgerGroupCombinedSel' + suffix;
    return `
      <select class="coa-modal-sel" id="${selId}" style="display: none;">
        ${ledgerGroupOptionsHtml}
      </select>
      <div class="kya-searchable-select-wrap" id="${selId}SearchableWrap" style="position: relative; width: 100%;">
        <div class="kya-searchable-select-trigger" id="${selId}Trigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
          <span id="${selId}TriggerText">${escapeHtml(defaultLabel || 'Select Group')}</span>
          <span style="font-size: 10px; color: var(--slate-400);">▼</span>
        </div>
        <div class="kya-searchable-select-dropdown" id="${selId}Dropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
          <input type="text" id="${selId}Search" placeholder="Search group or group ledger..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
          <div id="${selId}OptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
        </div>
      </div>
    `;
  }

  // Builds one additional "Name + Group" row (index >= 1) for the Create Ledger form,
  // with a dustbin remove button after Group (same look as Create Group's rows).
  function buildLedgerExtraRowHtml(idx, ledgerGroupOptionsHtml, defaultLabel) {
    return `
      <div class="master-ledger-row" data-row-index="${idx}" style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 38px; gap: 14px; margin-bottom: 16px;">
        <div>
          <label class="coa-modal-label" for="masterLedgerName${idx}" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Name *</label>
          <input class="coa-modal-inp" id="masterLedgerName${idx}" placeholder="Enter Name" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box;">
          <div id="masterLedgerName${idx}Error" style="display: none; font-size: 12px; font-weight: 600; color: #dc2626; margin-top: 5px;"></div>
        </div>
        <div>
          <label class="coa-modal-label" for="masterLedgerGroupCombinedSel${idx}" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Group *</label>
          ${buildLedgerGroupSelectHtml(String(idx), ledgerGroupOptionsHtml, defaultLabel)}
        </div>
        <div>
          <label style="font-size: 13px; margin-bottom: 6px; display: block; visibility: hidden; user-select: none;">&nbsp;</label>
          <button type="button" class="master-ledger-row-remove" data-row-index="${idx}" title="Remove this ledger" style="width: 38px; height: 38px; min-width: 38px; display: inline-flex; align-items: center; justify-content: center; padding: 0; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #ffffff; color: var(--slate-400); cursor: pointer; transition: all 0.15s ease;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  // Builds one additional "Name + Under" row (index >= 1) for the Create Group form's
  // Multi Create style row list, with a dustbin remove button after Under.
  function buildGroupExtraRowHtml(idx, groupOptionsHtml, defaultLabel) {
    return `
      <div class="master-group-row" data-row-index="${idx}" style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 38px; gap: 14px; margin-bottom: 16px;">
        <div>
          <label class="coa-modal-label" for="masterGroupName${idx}" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Name *</label>
          <input class="coa-modal-inp" id="masterGroupName${idx}" placeholder="Enter Name" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box;">
          <div id="masterGroupName${idx}Error" style="display: none; font-size: 12px; font-weight: 600; color: #dc2626; margin-top: 5px;"></div>
        </div>
        <div>
          <label class="coa-modal-label" for="masterGroupUnderCombinedSel${idx}" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Under *</label>
          ${buildGroupUnderSelectHtml(String(idx), groupOptionsHtml, defaultLabel)}
        </div>
        <div>
          <label style="font-size: 13px; margin-bottom: 6px; display: block; visibility: hidden; user-select: none;">&nbsp;</label>
          <button type="button" class="master-group-row-remove" data-row-index="${idx}" title="Remove this group" style="width: 38px; height: 38px; min-width: 38px; display: inline-flex; align-items: center; justify-content: center; padding: 0; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #ffffff; color: var(--slate-400); cursor: pointer; transition: all 0.15s ease;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  // ── Auto Title Case for the Create Group / Ledger / Customer / Supplier text boxes ──
  // Each word gets a capital first letter as you type, except small words (prepositions,
  // articles, conjunctions) after the first word, which stay lowercase. Letters typed as
  // capitals are kept (HDFC, LLP), and an all-caps small word (e.g. "AND") is left alone.
  const MASTER_TITLE_CASE_SMALL_WORDS = new Set([
    'a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'so', 'yet',
    'as', 'at', 'by', 'in', 'of', 'off', 'on', 'per', 'to', 'up', 'via',
    'with', 'from', 'into', 'onto', 'over', 'upon', 'than', 'vs'
  ]);

  function toMasterTitleCase(text) {
    let wordIdx = 0;
    return String(text).replace(/\S+/g, (word) => {
      const idx = wordIdx++;
      const core = word.replace(/[^A-Za-z]/g, '').toLowerCase();
      if (idx > 0 && MASTER_TITLE_CASE_SMALL_WORDS.has(core) && word !== word.toUpperCase()) {
        return word.toLowerCase();
      }
      // Capitalise only when the word starts with a letter (after any opening
      // bracket / quote), so "12th" or "#5" are left as typed
      return word.replace(/^([("'\[]*)([a-z])/, (m, lead, ch) => lead + ch.toUpperCase());
    });
  }

  // Boxes that get Title Case: Names (every row), Alternate Names and the popup's
  // name / address / bank text fields. GSTIN, PAN, IFSC, numbers etc. are left alone.
  const MASTER_TITLE_CASE_NAME_ID = /^master(Group|Ledger|Customer|Supplier)Name\d*$/;
  const MASTER_TITLE_CASE_FIELD_ID = /^master(Ledger|Customer|Supplier)(ContactName|Address|City|State|Country|BankName|Branch|BankAcctHolder|BankAcctBranch)$/;
  const MASTER_TITLE_CASE_ALIAS_BOXES = ['masterGroupAliasesContainer', 'masterLedgerAliasesContainer', 'masterCustomerAliasesContainer', 'masterSupplierAliasesContainer'];

  function isMasterTitleCaseField(el) {
    if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) return false;
    if (el.tagName === 'INPUT' && el.type && el.type !== 'text') return false;
    if (el.id && (MASTER_TITLE_CASE_NAME_ID.test(el.id) || MASTER_TITLE_CASE_FIELD_ID.test(el.id))) return true;
    if (el.classList.contains('master-alias-input')) {
      const box = el.closest('[id]');
      return !!box && MASTER_TITLE_CASE_ALIAS_BOXES.includes(box.id);
    }
    return false;
  }

  // One capture-phase listener on the content area: it runs before the fields' own
  // input handlers, so validation and saved values already see the Title Cased text.
  function wireMasterTitleCase(contentArea) {
    if (!contentArea || contentArea._kyaTitleCaseWired) return;
    contentArea._kyaTitleCaseWired = true;
    contentArea.addEventListener('input', (e) => {
      const el = e.target;
      if (!isMasterTitleCaseField(el)) return;
      const next = toMasterTitleCase(el.value);
      if (next === el.value) return;
      // Only letter case changes, so the caret position stays valid
      const start = el.selectionStart;
      const end = el.selectionEnd;
      el.value = next;
      try { el.setSelectionRange(start, end); } catch (err) { /* not focused */ }
    }, true);
  }

  // Counts backing the Master Desk "Overview" tab — how many of each master type exist.
  function computeMasterDeskCounts() {
    const groupCount = (typeof COA_SYS_SGS !== 'undefined' ? COA_SYS_SGS.length : 0) +
      (typeof coaLedgers !== 'undefined' ? coaLedgers.filter(l => l.type === 'group-ledger').length : 0);
    const ledgerCount = typeof coaLedgers !== 'undefined' ? coaLedgers.filter(l => l.type === 'ledger').length : 0;
    const customerCount = typeof getKyaCustomers === 'function' ? getKyaCustomers().length : 0;
    const supplierCount = typeof getKyaSuppliers === 'function' ? getKyaSuppliers().length : 0;
    const stockGroupCount = Array.isArray(_masterStockGroups) ? _masterStockGroups.length : 0;
    const stockItemCount = Array.isArray(_masterStockItems) ? _masterStockItems.length : 0;
    const stockCategoryCount = Array.isArray(_masterStockCategories) ? _masterStockCategories.length : 0;
    const unitCount = Array.isArray(_masterUnits) ? _masterUnits.length : 0;
    const warehouseCount = Array.isArray(_masterWarehouses) ? _masterWarehouses.length : 0;
    return {
      groupCount, ledgerCount, customerCount, supplierCount,
      stockGroupCount, stockItemCount, stockCategoryCount, unitCount, warehouseCount
    };
  }

  function renderMasterDeskOverviewHtml() {
    const counts = computeMasterDeskCounts();

    const tile = (count, label, iconSvg) => `
      <div style="border: 1.5px solid var(--slate-200); border-radius: 10px; padding: 16px 14px; text-align: center; background: #f8fafc;">
        <div style="width: 32px; height: 32px; margin: 0 auto 8px auto; border-radius: 8px; background: var(--blue-50, #eff6ff); display: flex; align-items: center; justify-content: center; color: var(--blue-600);">
          ${iconSvg}
        </div>
        <div style="font-size: 22px; font-weight: 700; color: var(--slate-800); line-height: 1.2;">${count}</div>
        <div style="font-size: 11px; font-weight: 600; color: var(--slate-500); text-transform: uppercase; letter-spacing: 0.04em; margin-top: 4px;">${label}</div>
      </div>
    `;

    const icoGroup = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.6"/><line x1="2" y1="7" x2="14" y2="7" stroke="currentColor" stroke-width="1.6"/></svg>';
    const icoLedger = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 5h12M4 10h8M4 15h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    const icoPeople = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
    const icoTruck = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>';
    const icoFolder = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';
    const icoBox = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';
    const icoGrid = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/></svg>';
    const icoUnit = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
    const icoWarehouse = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21v-6h6v6"/></svg>';

    return `
      <div class="coa-modal-card" style="max-width: 640px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--white); margin: 0 0 20px 0;">
        <h3 style="font-size: 15px; font-weight: 700; color: var(--slate-800); margin: 0 0 4px 0; display: flex; align-items: center; gap: 8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          Overview
        </h3>
        <p style="font-size: 12.5px; color: var(--slate-500); margin: 0 0 18px 0;">Snapshot of everything currently set up in your masters.</p>

        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--slate-400); margin-bottom: 10px;">Accounting Masters</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 22px;">
          ${tile(counts.groupCount, 'Groups', icoGroup)}
          ${tile(counts.ledgerCount, 'Ledgers', icoLedger)}
          ${tile(counts.customerCount, 'Customers', icoPeople)}
          ${tile(counts.supplierCount, 'Suppliers', icoTruck)}
        </div>

        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--slate-400); margin-bottom: 10px;">Inventory Masters</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          ${tile(counts.stockGroupCount, 'Stock Groups', icoFolder)}
          ${tile(counts.stockItemCount, 'Stock Items', icoBox)}
          ${tile(counts.stockCategoryCount, 'Stock Categories', icoGrid)}
          ${tile(counts.unitCount, 'Units', icoUnit)}
          ${tile(counts.warehouseCount, 'Warehouses', icoWarehouse)}
        </div>
      </div>
    `;
  }

  function updateMasterDeskContent() {
    const contentArea = document.getElementById('masterDeskContentArea');
    if (!contentArea) return;
    wireMasterTitleCase(contentArea);

    // Group, Ledger, Customer and Supplier modules open full screen (sidebar hidden) with a Back button to return to Overview.
    const isFullScreenTab = ['group', 'ledger', 'customers', 'suppliers'].includes(currentMasterDeskTab);
    const layoutContainer = document.getElementById('masterDeskLayoutContainer');
    const sidebar = document.getElementById('masterDeskSidebar');
    const backBar = document.getElementById('masterDeskBackBar');
    if (layoutContainer && sidebar) {
      layoutContainer.classList.toggle('full-width', isFullScreenTab);
      sidebar.style.display = isFullScreenTab ? 'none' : 'flex';
    }
    if (backBar) {
      backBar.style.display = isFullScreenTab ? 'flex' : 'none';
      // Quick-jump buttons: hide the one for the screen we're already on
      backBar.querySelectorAll('.master-back-bar-nav').forEach(btn => {
        btn.style.display = btn.getAttribute('data-tab') === currentMasterDeskTab ? 'none' : 'inline-flex';
      });
    }
    // Group count lives in the back bar; the Group form re-renders it as needed
    const backBarGroupCount = document.getElementById('masterDeskBackBarGroupCount');
    if (backBarGroupCount) backBarGroupCount.innerHTML = '';

    if (currentMasterDeskTab === 'overview') {
      contentArea.innerHTML = renderMasterDeskOverviewHtml();
      return;
    }

    if (currentMasterDeskSubtype === 'Create' && currentMasterDeskTab === 'group') {
      _masterGroupAliases = [];
      _masterGroupRowAliases = {};
      _masterGroupActiveRowIdx = 0;

      let groupOptionsHtml = '';
      const firstGroupLabel = 'Select Group';
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
        <div style="display: grid; grid-template-columns: minmax(0, 620px) 1fr; gap: 20px; align-items: start;">
          <div class="coa-modal-card" style="max-width: 620px; box-shadow: none; border: 1.5px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--slate-50); margin: 0;">
            <!-- Name & Under (row format) -->
            <div class="master-group-row" data-row-index="0" style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 38px; gap: 14px; margin-bottom: 16px;">
              <div>
                <label class="coa-modal-label" for="masterGroupName" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Name *</label>
                <input class="coa-modal-inp" id="masterGroupName" placeholder="Enter Name" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box;">
                <div id="masterGroupNameError" style="display: none; font-size: 12px; font-weight: 600; color: #dc2626; margin-top: 5px;"></div>
              </div>
              <div>
                <label class="coa-modal-label" for="masterGroupUnderCombinedSel" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Under *</label>
                ${buildGroupUnderSelectHtml('', groupOptionsHtml, firstGroupLabel)}
              </div>
              <div>
                <label style="font-size: 13px; margin-bottom: 6px; display: block; visibility: hidden; user-select: none;">&nbsp;</label>
                <button type="button" class="master-group-row-clean" id="masterGroupRowCleanBtn" title="Clean this group" style="width: 38px; height: 38px; min-width: 38px; display: inline-flex; align-items: center; justify-content: center; padding: 0; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #ffffff; color: var(--slate-400); cursor: pointer; transition: all 0.15s ease;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"/>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Additional groups (added row-by-row via the Add button, like Multi Create) -->
            <div id="masterGroupExtraRowsContainer"></div>

            <!-- Add another group — shown once the last row's Name is filled in -->
            <div id="masterGroupAddRowWrap" style="display: none; margin: -4px 0 16px 0;">
              <button type="button" id="masterGroupAddRowBtn" title="Add another group" style="display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 6px 14px; font-size: 12.5px; font-weight: 600; color: var(--blue-600); background: #ffffff; border: 1.5px dashed var(--blue-600); border-radius: 8px; cursor: pointer; transition: all 0.15s ease;">＋ Add Another Group</button>
            </div>

            <div style="display: flex; gap: 12px; align-items: center; margin-top: 8px;">
              <button class="btn btn-primary" id="masterGroupSaveBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Create Group</button>
              <button class="btn btn-secondary" id="masterGroupCancelBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Cancel</button>
            </div>
          </div>

          <!-- Alternate Name — appears once Name is filled in, one box per alias, auto-adding another below as you type (no limit) -->
          <div class="coa-modal-card" id="masterGroupAkaPanel" style="display: none; box-shadow: none; border: 1.5px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--slate-50); margin: 0;">
            <div style="margin: 0 0 12px 0; display: flex;">
              <span id="masterGroupAkaFor" style="font-size: 12.5px; font-weight: 600; color: var(--blue-600); background: var(--blue-50, #eff6ff); padding: 2px 8px; border-radius: 6px; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"></span>
            </div>
            <div id="masterGroupAliasesContainer" style="display: flex; flex-direction: column; gap: 10px;"></div>
          </div>
        </div>
      `;

      renderMasterGroupAliases();

      // ── Multi Create style row list: Name + Under, auto-adding a fresh row below
      // once the current last row's Name is filled in ──
      _masterGroupExtraRowKeys = [];
      _masterGroupExtraRowSeq = 0;
      const extraRowsContainer = contentArea.querySelector('#masterGroupExtraRowsContainer');

      const wireGroupRowRemoveBtn = (idx) => {
        const btn = extraRowsContainer.querySelector('.master-group-row-remove[data-row-index="' + idx + '"]');
        if (!btn) return;
        btn.addEventListener('mouseenter', () => {
          btn.style.background = '#fef2f2';
          btn.style.color = '#dc2626';
          btn.style.borderColor = '#fecaca';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.background = '#ffffff';
          btn.style.color = 'var(--slate-400)';
          btn.style.borderColor = 'var(--slate-200)';
        });
        btn.addEventListener('click', () => {
          const rowEl = extraRowsContainer.querySelector('.master-group-row[data-row-index="' + idx + '"]');
          if (rowEl) rowEl.remove();
          const pos = _masterGroupExtraRowKeys.indexOf(idx);
          const prevIdx = pos > 0 ? _masterGroupExtraRowKeys[pos - 1] : 0;
          _masterGroupExtraRowKeys = _masterGroupExtraRowKeys.filter(k => k !== idx);
          delete _masterGroupRowAliases[idx];
          if (_masterGroupActiveRowIdx === idx) {
            // Removed row's aliases go with it — switch the panel to the row above
            _masterGroupActiveRowIdx = null;
            setActiveGroupRow(prevIdx);
            const prevInp = getGroupRowNameInput(prevIdx);
            if (prevInp) prevInp.focus();
          } else {
            validateMasterGroupAliasesLive();
          }
          refreshGroupAddRowBtn();
        });
      };

      const getGroupRowNameInput = (idx) => contentArea.querySelector('#masterGroupName' + (idx ? idx : ''));

      // Shows / hides the Alternate Name panel for the active row based on its Name,
      // and labels the panel with the group it belongs to.
      const syncGroupAkaPanel = () => {
        const activeInp = getGroupRowNameInput(_masterGroupActiveRowIdx);
        const nameVal = activeInp ? activeInp.value.trim() : '';
        const akaPanel = contentArea.querySelector('#masterGroupAkaPanel');
        const akaFor = contentArea.querySelector('#masterGroupAkaFor');
        if (akaFor) {
          akaFor.textContent = nameVal;
          akaFor.title = nameVal;
          akaFor.style.display = nameVal ? 'inline-block' : 'none';
        }

        if (!nameVal) {
          if (akaPanel) akaPanel.style.display = 'none';
          if (_masterGroupAliases.every(a => a.trim() === '')) {
            _masterGroupAliases = [];
            renderMasterGroupAliases();
          }
          return;
        }

        validateMasterGroupAliasesLive();
        if (_masterGroupAliases.length === 0) {
          _masterGroupAliases.push('');
          renderMasterGroupAliases();
        } else if (akaPanel) {
          akaPanel.style.display = 'block';
        }
      };

      // Switches the Alternate Name panel to the given row, parking the current row's list.
      const setActiveGroupRow = (idx) => {
        if (idx === _masterGroupActiveRowIdx) return;
        if (_masterGroupActiveRowIdx !== null) {
          _masterGroupRowAliases[_masterGroupActiveRowIdx] = _masterGroupAliases;
        }
        _masterGroupActiveRowIdx = idx;
        _masterGroupAliases = _masterGroupRowAliases[idx] || [];
        renderMasterGroupAliases();
        syncGroupAkaPanel();
        renderGroupCount();
      };

      // Shows the "Add Another Group" button only when the last row's Name has a value.
      const addRowWrap = contentArea.querySelector('#masterGroupAddRowWrap');
      const addRowBtn = contentArea.querySelector('#masterGroupAddRowBtn');
      // Group count (1, 2, 3...) in the right corner of the Back bar — how many groups
      // this form will create; goes up by one each time another group row is added.
      const renderGroupCount = () => {
        const countWrap = document.getElementById('masterDeskBackBarGroupCount');
        if (!countWrap) return;
        const count = 1 + _masterGroupExtraRowKeys.length;
        countWrap.innerHTML = `<span title="Groups in this form" style="height: 34px; min-width: 34px; padding: 0 12px; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; border-radius: 6px; background: var(--white); border: 1px solid var(--slate-200); color: var(--slate-600); font-family: var(--font-main); font-size: 12.5px; font-weight: 600;">${count}</span>`;
      };

      const refreshGroupAddRowBtn = () => {
        renderGroupCount();
        if (!addRowWrap) return;
        const lastIdx = _masterGroupExtraRowKeys.length ? _masterGroupExtraRowKeys[_masterGroupExtraRowKeys.length - 1] : 0;
        const lastInp = contentArea.querySelector('#masterGroupName' + (lastIdx === 0 ? '' : lastIdx));
        addRowWrap.style.display = lastInp && lastInp.value.trim() ? 'block' : 'none';
      };

      const addNextGroupRow = () => {
        _masterGroupExtraRowSeq++;
        const idx = _masterGroupExtraRowSeq;
        // New row's "Under" defaults to the row above it
        const prevIdx = _masterGroupExtraRowKeys.length ? _masterGroupExtraRowKeys[_masterGroupExtraRowKeys.length - 1] : 0;
        const prevUnderSel = contentArea.querySelector('#masterGroupUnderCombinedSel' + (prevIdx ? prevIdx : ''));
        extraRowsContainer.insertAdjacentHTML('beforeend', buildGroupExtraRowHtml(idx, groupOptionsHtml, firstGroupLabel));
        const newUnderSel = contentArea.querySelector('#masterGroupUnderCombinedSel' + idx);
        if (prevUnderSel && newUnderSel && prevUnderSel.value) {
          newUnderSel.value = prevUnderSel.value;
        } else if (newUnderSel) {
          newUnderSel.selectedIndex = -1; // nothing chosen above -> show "Select Group"
        }
        initSearchableSelectHelper(contentArea, 'masterGroupUnderCombinedSel' + idx, 'Select Group');
        const newNameInp = contentArea.querySelector('#masterGroupName' + idx);
        if (newNameInp) {
          newNameInp.addEventListener('focus', () => setActiveGroupRow(idx));
          newNameInp.addEventListener('input', () => {
            setActiveGroupRow(idx);
            syncGroupAkaPanel();
            refreshGroupAddRowBtn();
          });
        }
        wireGroupRowRemoveBtn(idx);
        _masterGroupExtraRowKeys.push(idx);
        refreshGroupAddRowBtn();
        if (newNameInp) newNameInp.focus();
      };

      if (addRowBtn) {
        addRowBtn.addEventListener('mouseenter', () => { addRowBtn.style.background = 'var(--blue-50, #eff6ff)'; });
        addRowBtn.addEventListener('mouseleave', () => { addRowBtn.style.background = '#ffffff'; });
        addRowBtn.addEventListener('click', addNextGroupRow);
      }

      // Under starts unselected so the dropdown shows "Select Group"
      const groupUnderSelInit = contentArea.querySelector('#masterGroupUnderCombinedSel');
      if (groupUnderSelInit) groupUnderSelInit.selectedIndex = -1;
      const searchableUnderControl = initSearchableSelectHelper(contentArea, 'masterGroupUnderCombinedSel', 'Select Group');
      renderGroupCount();

      const cleanBtn = contentArea.querySelector('#masterGroupRowCleanBtn');
      if (cleanBtn) {
        cleanBtn.addEventListener('mouseenter', () => {
          cleanBtn.style.background = '#fef2f2';
          cleanBtn.style.color = '#dc2626';
          cleanBtn.style.borderColor = '#fecaca';
        });
        cleanBtn.addEventListener('mouseleave', () => {
          cleanBtn.style.background = '#ffffff';
          cleanBtn.style.color = 'var(--slate-400)';
          cleanBtn.style.borderColor = 'var(--slate-200)';
        });
        cleanBtn.addEventListener('click', () => {
          // With more groups below, the first row's dustbin removes this group and moves
          // the next row (Name, Under, Alternate Names) up into its place.
          if (_masterGroupExtraRowKeys.length > 0) {
            const nextIdx = _masterGroupExtraRowKeys[0];
            const nextNameInp = getGroupRowNameInput(nextIdx);
            const nextUnderSel = contentArea.querySelector('#masterGroupUnderCombinedSel' + nextIdx);

            if (_masterGroupActiveRowIdx !== null) {
              _masterGroupRowAliases[_masterGroupActiveRowIdx] = _masterGroupAliases;
            }
            _masterGroupRowAliases[0] = _masterGroupRowAliases[nextIdx] || [];
            delete _masterGroupRowAliases[nextIdx];

            if (nameInp) nameInp.value = nextNameInp ? nextNameInp.value : '';
            const underSel = contentArea.querySelector('#masterGroupUnderCombinedSel');
            if (underSel && nextUnderSel) {
              underSel.value = nextUnderSel.value;
              if (searchableUnderControl && typeof searchableUnderControl.refresh === 'function') {
                searchableUnderControl.refresh();
              }
            }

            const nextRowEl = extraRowsContainer.querySelector('.master-group-row[data-row-index="' + nextIdx + '"]');
            if (nextRowEl) nextRowEl.remove();
            _masterGroupExtraRowKeys = _masterGroupExtraRowKeys.slice(1);

            _masterGroupActiveRowIdx = null;
            setActiveGroupRow(0);
            validateNameInputLive();
            refreshGroupAddRowBtn();
            if (nameInp) nameInp.focus();
            return;
          }

          if (nameInp) {
            nameInp.value = '';
            nameInp.style.borderColor = 'var(--slate-200)';
            nameInp.style.boxShadow = 'none';
          }
          if (nameErr) {
            nameErr.style.display = 'none';
            nameErr.textContent = '';
          }
          const underSel = contentArea.querySelector('#masterGroupUnderCombinedSel');
          if (underSel && underSel.options.length > 0) {
            underSel.selectedIndex = -1;
            if (searchableUnderControl && typeof searchableUnderControl.refresh === 'function') {
              searchableUnderControl.refresh();
            }
          }
          setActiveGroupRow(0);
          _masterGroupAliases = [];
          renderMasterGroupAliases();
          syncGroupAkaPanel();
          refreshGroupAddRowBtn();

          if (nameInp) nameInp.focus();
        });
      }

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
        nameInp.addEventListener('focus', () => setActiveGroupRow(0));
        nameInp.addEventListener('input', () => {
          setActiveGroupRow(0);
          validateNameInputLive();

          // Hides / reveals the Alternate Name panel (and first box) for this row
          syncGroupAkaPanel();
          refreshGroupAddRowBtn();
        });
      }

      // Creates one group/group-ledger entry from a resolved Under value.
      const createSingleGroupEntry = (name, underVal, aliases) => {
        const isPrimary = underVal.startsWith('primary:');

        if (isPrimary) {
          const mainNature = underVal.replace('primary:', ''); // 'assets', 'equity-liabilities', 'expense', 'income'
          const newSgId = 'sg-grp-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
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
            id: Date.now() + Math.floor(Math.random() * 100000),
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
      };

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
            const msg = 'Please fix duplicate or invalid Alternate Name entries.';
            if (typeof showToast === 'function') showToast(msg, 'error');
            else alert(msg);
            return;
          }

          const underSel = contentArea.querySelector('#masterGroupUnderCombinedSel');
          const underVal = underSel && underSel.value ? underSel.value : '';
          if (!underVal) {
            const msg = `Please select a group for "${name}".`;
            if (typeof showToast === 'function') showToast(msg, 'warning');
            else alert(msg);
            return;
          }
          // Park the active row's list so every row's Alternate Names are in _masterGroupRowAliases
          _masterGroupRowAliases[_masterGroupActiveRowIdx] = _masterGroupAliases;
          const getRowAliases = (idx) => (_masterGroupRowAliases[idx] || []).map(a => a.trim()).filter(a => a !== '');
          const aliases = getRowAliases(0);

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

          // Collect the additional Multi Create style rows (Name + Under + their own Alternate Names).
          // A trailing row left empty is just unfilled — it's skipped, not an error.
          const extraEntries = [];
          for (const idx of _masterGroupExtraRowKeys) {
            const rowNameInp = contentArea.querySelector('#masterGroupName' + idx);
            const rowName = rowNameInp ? rowNameInp.value.trim() : '';
            if (!rowName) continue;

            const rowNameLower = rowName.toLowerCase();
            if (formNamesSet.has(rowNameLower)) {
              const msg = `Duplicate entry "${rowName}" found in the form. Each group name must be unique.`;
              if (typeof showToast === 'function') showToast(msg, 'error');
              else alert(msg);
              rowNameInp.focus();
              return;
            }
            formNamesSet.add(rowNameLower);

            const dupRow = findDuplicateCoaNameOrAlias(rowName);
            if (dupRow) {
              const typeLabel = dupRow.parentName ? `Alias of "${dupRow.parentName}"` : dupRow.type;
              const msg = `"${rowName}" already exists (${typeLabel}).`;
              if (typeof showToast === 'function') showToast(msg, 'error');
              else alert(msg);
              rowNameInp.focus();
              return;
            }

            const rowUnderSel = contentArea.querySelector('#masterGroupUnderCombinedSel' + idx);
            const rowUnderVal = rowUnderSel && rowUnderSel.value ? rowUnderSel.value : '';
            if (!rowUnderVal) {
              const msg = `Please select a group for "${rowName}".`;
              if (typeof showToast === 'function') showToast(msg, 'warning');
              else alert(msg);
              return;
            }

            const rowAliases = getRowAliases(idx);
            for (const al of rowAliases) {
              const alLower = al.toLowerCase();
              if (formNamesSet.has(alLower)) {
                const msg = `Duplicate entry "${al}" found in the form (Alternate Name of "${rowName}"). Names and Alternate Names must be unique.`;
                if (typeof showToast === 'function') showToast(msg, 'error');
                else alert(msg);
                rowNameInp.focus();
                return;
              }
              formNamesSet.add(alLower);

              const dupAl = findDuplicateCoaNameOrAlias(al);
              if (dupAl) {
                const typeLabel = dupAl.parentName ? `Alias of "${dupAl.parentName}"` : dupAl.type;
                const msg = `"${al}" (Alternate Name of "${rowName}") already exists (${typeLabel}).`;
                if (typeof showToast === 'function') showToast(msg, 'error');
                else alert(msg);
                rowNameInp.focus();
                return;
              }
            }
            extraEntries.push({ name: rowName, underVal: rowUnderVal, aliases: rowAliases });
          }

          createSingleGroupEntry(name, underVal, aliases);
          extraEntries.forEach(entry => createSingleGroupEntry(entry.name, entry.underVal, entry.aliases));

          if (typeof renderChartPanel === 'function') {
            renderChartPanel();
          }

          if (typeof refreshAllReports === 'function') {
            refreshAllReports();
          }

          if (typeof triggerAutoBackup === 'function') {
            triggerAutoBackup();
          }

          const totalCreated = 1 + extraEntries.length;
          if (totalCreated > 1) {
            showToast(`${totalCreated} groups created successfully.`, 'success');
          } else {
            showToast(`Group "${name}" created successfully.`, 'success');
          }

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

      let _masterLedgerSaveAsMode = 'ledger';

      contentArea.innerHTML = `
        <div style="display: grid; grid-template-columns: minmax(0, 620px) 1fr; gap: 20px; align-items: start;">
          <div class="coa-modal-card" style="max-width: 620px; box-shadow: none; border: 1.5px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--slate-50); margin: 0;">
            <!-- Name & Group (row format, like Create Group) -->
            <div class="master-ledger-row" data-row-index="0" style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 38px; gap: 14px; margin-bottom: 16px;">
              <div>
                <label class="coa-modal-label" for="masterLedgerName" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Name *</label>
                <input class="coa-modal-inp" id="masterLedgerName" placeholder="Enter Name" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box;">
                <div id="masterLedgerNameError" style="display: none; font-size: 12px; font-weight: 600; color: #dc2626; margin-top: 5px;"></div>
              </div>
              <div>
                <label class="coa-modal-label" for="masterLedgerGroupCombinedSel" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Group *</label>
                ${buildLedgerGroupSelectHtml('', ledgerGroupOptionsHtml, firstGroupLabel)}
              </div>
              <div>
                <label style="font-size: 13px; margin-bottom: 6px; display: block; visibility: hidden; user-select: none;">&nbsp;</label>
                <button type="button" class="master-ledger-row-clean" id="masterLedgerRowCleanBtn" title="Clean this ledger" style="width: 38px; height: 38px; min-width: 38px; display: inline-flex; align-items: center; justify-content: center; padding: 0; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #ffffff; color: var(--slate-400); cursor: pointer; transition: all 0.15s ease;">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"/>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Additional ledgers (added row-by-row via the Add button, like Create Group) -->
            <div id="masterLedgerExtraRowsContainer"></div>

            <!-- Add another ledger — shown once the last row's Name is filled in -->
            <div id="masterLedgerAddRowWrap" style="display: none; margin: -4px 0 16px 0;">
              <button type="button" id="masterLedgerAddRowBtn" title="Add another ledger" style="display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 6px 14px; font-size: 12.5px; font-weight: 600; color: var(--blue-600); background: #ffffff; border: 1.5px dashed var(--blue-600); border-radius: 8px; cursor: pointer; transition: all 0.15s ease;">＋ Add Another Ledger</button>
            </div>

            <div style="display: flex; gap: 12px; align-items: center;">
              <button class="btn btn-primary" id="masterLedgerSaveBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Create Ledger</button>
              <button class="btn btn-secondary" id="masterLedgerCancelBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Cancel</button>
            </div>
          </div>

          <!-- Second box: Opening Balance first, then Alternate Names once Name is filled in -->
          <div class="coa-modal-card" id="masterLedgerSidePanel" style="box-shadow: none; border: 1.5px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--slate-50); margin: 0;">
            <label class="coa-modal-label" for="masterLedgerBalance" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Opening Balance</label>
            <input class="coa-modal-inp" id="masterLedgerBalance" type="number" min="0" step="0.01" placeholder="0.00" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box;">

            <!-- Additional Details (only for groups that need them) -->
            <div id="masterLedgerAddlBtnWrap" style="display: none; margin-top: 16px;">
              <button type="button" class="btn btn-secondary" id="masterLedgerAddlBtn" style="width: 100%; height: 38px; justify-content: center; padding: 8px 16px; font-size: 13px; font-weight: 600; border-radius: 8px;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                Additional Details
              </button>
            </div>

            <!-- Alternate Name — one box per alias, auto-adding another below as you type (no limit) -->
            <div id="masterLedgerAkaPanel" style="display: none; margin-top: 16px;">
              <label class="coa-modal-label" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Alternate Name</label>
              <div id="masterLedgerAliasesContainer" style="display: flex; flex-direction: column; gap: 10px;"></div>
            </div>
          </div>
        </div>

        <!-- Additional Details popup — opens when a group that needs extra details is selected -->
        <style>
          /* Popup fields fill their grid column instead of overflowing it on narrow screens */
          #masterLedgerAddlModal .master-ledger-addl-body input:not([type=hidden]):not([type=file]),
          #masterLedgerAddlModal .master-ledger-addl-body textarea,
          #masterLedgerAddlModal .master-ledger-addl-body select { width: 100%; min-width: 0; box-sizing: border-box; }
        </style>
        <div class="oh-modal-overlay" id="masterLedgerAddlModal" style="display: none;">
          <div style="background: var(--white); border-radius: 14px; width: 94%; max-width: 640px; max-height: 88vh; display: flex; flex-direction: column; box-shadow: 0 40px 100px rgba(0,0,0,.24);">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 24px; border-bottom: 1px solid var(--slate-200);">
              <div style="min-width: 0;">
                <div style="font-size: 15px; font-weight: 700; color: var(--slate-800);">Additional Details</div>
                <div id="masterLedgerAddlModalSub" style="font-size: 12.5px; color: var(--slate-500); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"></div>
              </div>
              <button type="button" class="oh-modal-close" id="masterLedgerAddlCloseBtn" title="Close">✕</button>
            </div>

            <div class="master-ledger-addl-body" style="padding: 20px 24px; overflow-y: auto; overflow-x: hidden;">

          <!-- Additional Information (Dynamic for Trade Receivable / Payable) -->
          <div id="masterLedgerAdditionalInfoWrap" style="display: none; margin: 0; transition: all 0.2s ease;">
            
            <div style="font-size: 13.5px; font-weight: 700; color: var(--slate-800); margin-bottom: 14px; display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 10px;">

              <!-- Right Side Slide: Save As [ Ledger | Customer / Supplier ] -->
              <div class="master-saveas-wrap" id="masterLedgerSaveAsWrap" style="display: flex; align-items: center; gap: 8px;">
                <span class="master-saveas-label">Save As</span>
                <div class="master-saveas-slider-wrap">
                  <div class="master-saveas-slider-bg ledger-active" id="masterLedgerSaveAsBg"></div>
                  <button type="button" class="master-saveas-btn active" id="masterLedgerSaveAsLedgerBtn">Ledger</button>
                  <button type="button" class="master-saveas-btn" id="masterLedgerSaveAsPartyBtn">Customer</button>
                </div>
              </div>
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
                  <input type="text" id="masterLedgerContactName" placeholder="Enter Contact Person" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                </div>
                <div>
                  <textarea id="masterLedgerAddress" placeholder="Enter Address" rows="2" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; resize: vertical; font-family: inherit; outline: none; background: #fff;"></textarea>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <input type="text" id="masterLedgerCity" placeholder="Enter City" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                  <input type="text" id="masterLedgerPincode" placeholder="Enter PIN Code" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <input type="text" id="masterLedgerState" placeholder="Enter State" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                  <input type="text" id="masterLedgerCountry" placeholder="Enter Country" value="India" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
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
                  <input type="text" id="masterLedgerBankName" placeholder="Enter Bank Name" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                  <input type="text" id="masterLedgerAccountNo" placeholder="Enter Account Number" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <input type="text" id="masterLedgerIfsc" placeholder="Enter IFSC Code" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff; text-transform: uppercase;">
                  <input type="text" id="masterLedgerBranch" placeholder="Enter Branch" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
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
                <input type="text" id="masterLedgerGstin" placeholder="Enter GSTIN" maxlength="15" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff; text-transform: uppercase;">
                <input type="text" id="masterLedgerPan" placeholder="Enter PAN" maxlength="10" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff; text-transform: uppercase;">
              </div>
            </div>

          </div>

          <!-- Additional Information (Dynamic for Bank Account group) -->
          <div id="masterLedgerBankAcctWrap" style="display: none; margin: 0; transition: all 0.2s ease;">

            <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div class="kya-searchable-select-wrap" id="masterLedgerBankAcctBankNameWrap" style="position: relative; width: 100%;">
                  <input type="hidden" id="masterLedgerBankAcctBankName" value="">
                  <div class="kya-searchable-select-trigger" id="masterLedgerBankAcctBankNameTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border: 1.5px solid var(--slate-200); border-radius: 7px; background: #fff; cursor: pointer; font-size: 13px; font-weight: 500; color: var(--slate-400);">
                    <span id="masterLedgerBankAcctBankNameTriggerText">Select Bank</span>
                    <span style="font-size: 10px; color: var(--slate-400);">▼</span>
                  </div>
                  <div class="kya-searchable-select-dropdown" id="masterLedgerBankAcctBankNameDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                    <input type="text" id="masterLedgerBankAcctBankNameSearch" placeholder="Search bank name..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                    <div id="masterLedgerBankAcctBankNameOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                  </div>
                </div>
                <input type="text" id="masterLedgerBankAcctHolder" placeholder="Enter Account Holder Name" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <input type="text" id="masterLedgerBankAcctNo" placeholder="Enter Account Number" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                <input type="text" id="masterLedgerBankAcctIfsc" placeholder="Enter IFSC Code" style="padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff; text-transform: uppercase;">
              </div>
              <div>
                <input type="text" id="masterLedgerBankAcctBranch" placeholder="Enter Branch" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
              </div>
            </div>

            <div style="border-top: 1px dashed var(--slate-200); margin-bottom: 14px;"></div>

            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label style="font-size: 10.5px; font-weight: 700; color: var(--slate-500); text-transform: uppercase; letter-spacing: 0.07em; display: flex; align-items: center; gap: 5px; margin: 0;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                  &nbsp;Upload QR Code (Image Only)
                </label>
                <span id="masterLedgerBankAcctQrStatusBadge" style="display: none; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; background: #ecfdf5; color: #059669; text-transform: uppercase;">Attached</span>
              </div>

              <input type="file" id="masterLedgerBankAcctQrInput" accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml" style="display: none;">

              <div id="masterLedgerBankAcctQrDropzone" style="border: 1.5px dashed var(--slate-300); border-radius: 10px; padding: 12px 14px; text-align: center; background: #fff; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='#2563eb'; this.style.background='#eff6ff';" onmouseout="this.style.borderColor='var(--slate-300)'; this.style.background='#fff';">

                <!-- Empty State -->
                <div id="masterLedgerBankAcctQrEmptyState" style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                  <div style="width: 28px; height: 28px; border-radius: 50%; background: #f8fafc; border: 1px solid var(--slate-200); display: flex; align-items: center; justify-content: center; color: #2563eb; flex-shrink: 0;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <div style="display: flex; flex-direction: column; align-items: flex-start; text-align: left;">
                    <span style="font-size: 12.5px; font-weight: 600; color: var(--slate-700);">Click or Drag to Upload QR Code</span>
                    <span style="font-size: 10.5px; color: var(--slate-400);">PNG, JPG, WEBP, SVG (Max 5MB)</span>
                  </div>
                </div>

                <!-- Selected State -->
                <div id="masterLedgerBankAcctQrSelectedState" style="display: none; align-items: center; justify-content: space-between; gap: 10px;">
                  <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
                    <img id="masterLedgerBankAcctQrPreviewImg" src="" alt="QR Code" style="width: 34px; height: 34px; object-fit: contain; border-radius: 6px; border: 1px solid var(--slate-200); background: #fff; flex-shrink: 0;">
                    <div style="display: flex; flex-direction: column; align-items: flex-start; overflow: hidden; text-align: left;">
                      <span id="masterLedgerBankAcctQrFileName" style="font-size: 12.5px; font-weight: 700; color: var(--slate-800); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;"></span>
                      <span id="masterLedgerBankAcctQrFileSize" style="font-size: 10.5px; color: var(--slate-500); font-weight: 500;"></span>
                    </div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                    <a id="masterLedgerBankAcctQrPreviewBtn" href="#" target="_blank" style="padding: 4px 9px; font-size: 11.5px; font-weight: 600; color: #2563eb; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; text-decoration: none;" title="View full image">View</a>
                    <button id="masterLedgerBankAcctQrRemoveBtn" type="button" style="background: none; border: none; color: #dc2626; cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center;" title="Remove QR code">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <!-- Additional Information (Dynamic for Revenue from Operations group) -->
          <div id="masterLedgerSacWrap" style="display: none; margin: 0; transition: all 0.2s ease;">

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
              <div style="min-width: 0;">
                <label style="font-size: 11.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 4px; display: block;">SAC Code</label>
                <div class="kya-searchable-select-wrap" id="masterLedgerSacCodeWrap" style="position: relative; width: 100%;">
                  <input type="hidden" id="masterLedgerSacCode" value="">
                  <div class="kya-searchable-select-trigger" id="masterLedgerSacCodeTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border: 1.5px solid var(--slate-200); border-radius: 7px; background: #fff; cursor: pointer; font-size: 13px; font-weight: 500; color: var(--slate-400);">
                    <span id="masterLedgerSacCodeTriggerText">Select SAC Code</span>
                    <span style="font-size: 10px; color: var(--slate-400);">▼</span>
                  </div>
                  <div class="kya-searchable-select-dropdown" id="masterLedgerSacCodeDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                    <input type="text" id="masterLedgerSacCodeSearch" placeholder="Search by SAC code..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                    <div id="masterLedgerSacCodeOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                  </div>
                </div>
              </div>
              <div style="min-width: 0;">
                <label style="font-size: 11.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 4px; display: block;">SAC Description</label>
                <div style="position: relative; width: 100%; min-width: 0;">
                  <input type="hidden" id="masterLedgerSacDesc" value="">
                  <div id="masterLedgerSacDescTrigger" style="display: flex; align-items: center; padding: 8px 12px; border: 1.5px solid var(--slate-200); border-radius: 7px; background: #fff; cursor: default; font-size: 13px; font-weight: 500; color: var(--slate-400); overflow: hidden;">
                    <span id="masterLedgerSacDescTriggerText" style="display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; flex: 1 1 auto;">Auto-filled from SAC Code</span>
                  </div>
                </div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <label style="font-size: 11.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 4px; display: block;">Rate</label>
                <input type="number" min="0" step="0.01" id="masterLedgerSacRate" placeholder="0.00" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
              </div>
              <div>
                <label style="font-size: 11.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 4px; display: block;">GST / Tax Rate (%)</label>
                <select id="masterLedgerSacGstSel" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                  <option value="0">0% (Nil / Exempt)</option>
                  <option value="5">5% GST</option>
                  <option value="12">12% GST</option>
                  <option value="18" selected>18% GST</option>
                  <option value="28">28% GST</option>
                </select>
              </div>
            </div>
          </div>

            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 14px 24px; border-top: 1px solid var(--slate-200);">
              <button type="button" class="btn btn-primary" id="masterLedgerAddlDoneBtn" style="height: 38px; padding: 8px 18px; font-size: 13px; font-weight: 600;">Done</button>
            </div>
          </div>
        </div>
      `;

      renderMasterLedgerAliases();

      // Group starts unselected so the dropdown shows "Select Group"
      const ledgerGroupSelInit = contentArea.querySelector('#masterLedgerGroupCombinedSel');
      if (ledgerGroupSelInit) ledgerGroupSelInit.selectedIndex = -1;
      const searchableGroupControl = initSearchableSelectHelper(contentArea, 'masterLedgerGroupCombinedSel', 'Select Group');

      // Additional Information Dynamic Visibility and Save As Slider Toggle
      const groupSel = contentArea.querySelector('#masterLedgerGroupCombinedSel');

      // Multi-row state (see the row list further below); row 0 is the first row
      _masterLedgerRowState = {};
      _masterLedgerActiveRowIdx = 0;
      _masterLedgerExtraRowKeys = [];
      _masterLedgerExtraRowSeq = 0;
      const ledgerRowNameInput = (idx) => contentArea.querySelector('#masterLedgerName' + (idx ? idx : ''));
      const activeNameInp = () => ledgerRowNameInput(_masterLedgerActiveRowIdx || 0);
      const activeGroupSel = () => contentArea.querySelector('#masterLedgerGroupCombinedSel' + (_masterLedgerActiveRowIdx ? _masterLedgerActiveRowIdx : ''));
      const addInfoWrap = contentArea.querySelector('#masterLedgerAdditionalInfoWrap');
      const bankAcctWrap = contentArea.querySelector('#masterLedgerBankAcctWrap');
      const sacWrap = contentArea.querySelector('#masterLedgerSacWrap');
      const saveAsLedgerBtn = contentArea.querySelector('#masterLedgerSaveAsLedgerBtn');
      const saveAsPartyBtn = contentArea.querySelector('#masterLedgerSaveAsPartyBtn');
      const saveAsBg = contentArea.querySelector('#masterLedgerSaveAsBg');
      const saveBtn = contentArea.querySelector('#masterLedgerSaveBtn');

      const applySaveAsModeUi = () => {
        if (!saveAsBg || !saveAsLedgerBtn || !saveAsPartyBtn || !saveBtn) return;
        const isPay = isTradePayableGroup(activeGroupSel() ? activeGroupSel().value : '');
        const partyLabel = isPay ? 'Supplier' : 'Customer';
        saveAsPartyBtn.textContent = partyLabel;

        if (_masterLedgerSaveAsMode === 'party' || _masterLedgerSaveAsMode === 'customer' || _masterLedgerSaveAsMode === 'supplier') {
          _masterLedgerSaveAsMode = isPay ? 'supplier' : 'customer';
          saveAsBg.className = 'master-saveas-slider-bg party-active';
          saveAsLedgerBtn.className = 'master-saveas-btn';
          saveAsPartyBtn.className = 'master-saveas-btn active';
          saveBtn.textContent = `Create ${partyLabel}`;
        } else {
          _masterLedgerSaveAsMode = 'ledger';
          saveAsBg.className = 'master-saveas-slider-bg ledger-active';
          saveAsLedgerBtn.className = 'master-saveas-btn active';
          saveAsPartyBtn.className = 'master-saveas-btn';
          saveBtn.textContent = 'Create Ledger';
        }
      };

      if (saveAsLedgerBtn) {
        saveAsLedgerBtn.addEventListener('click', (e) => {
          e.preventDefault();
          _masterLedgerSaveAsMode = 'ledger';
          applySaveAsModeUi();
        });
      }

      if (saveAsPartyBtn) {
        saveAsPartyBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const isPay = isTradePayableGroup(activeGroupSel() ? activeGroupSel().value : '');
          _masterLedgerSaveAsMode = isPay ? 'supplier' : 'customer';
          applySaveAsModeUi();
        });
      }

      const updateAdditionalInfoVisibility = () => {
        if (!activeGroupSel() || !addInfoWrap) return;
        const isRec = isTradeReceivableGroup(activeGroupSel().value);
        const isPay = isTradePayableGroup(activeGroupSel().value);
        const isParty = isRec || isPay;

        addInfoWrap.style.display = isParty ? 'block' : 'none';
        if (isParty) {
          applySaveAsModeUi();
        } else {
          _masterLedgerSaveAsMode = 'ledger';
          if (saveBtn) saveBtn.textContent = 'Create Ledger';
        }

        if (bankAcctWrap) {
          bankAcctWrap.style.display = isBankAccountGroup(activeGroupSel().value) ? 'block' : 'none';
        }

        if (sacWrap) {
          sacWrap.style.display = isRevenueFromOperationsGroup(activeGroupSel().value) ? 'block' : 'none';
        }

        if (addlBtnWrap) {
          addlBtnWrap.style.display = ledgerGroupHasAddlDetails() ? 'block' : 'none';
        }
      };

      // ── Additional Details popup (Trade Receivables / Payables, Bank Accounts,
      // Revenue from Operations) — opens when such a group is selected ──
      const addlModal = contentArea.querySelector('#masterLedgerAddlModal');
      const addlModalSub = contentArea.querySelector('#masterLedgerAddlModalSub');
      const addlBtnWrap = contentArea.querySelector('#masterLedgerAddlBtnWrap');
      const addlBtn = contentArea.querySelector('#masterLedgerAddlBtn');

      const ledgerGroupHasAddlDetails = () => {
        const val = activeGroupSel() ? activeGroupSel().value : '';
        return isTradePartyGroup(val) || isBankAccountGroup(val) || isRevenueFromOperationsGroup(val);
      };

      const openLedgerAddlModal = () => {
        if (!addlModal || !ledgerGroupHasAddlDetails()) return;
        if (addlModalSub) {
          const opt = activeGroupSel().options[activeGroupSel().selectedIndex];
          const nameVal = activeNameInp() ? activeNameInp().value.trim() : '';
          const groupLabel = opt ? opt.textContent.trim().replace(/^📁\s*/, '') : '';
          addlModalSub.textContent = nameVal ? `${nameVal} · ${groupLabel}` : groupLabel;
        }
        addlModal.style.display = 'flex';
      };

      const closeLedgerAddlModal = () => {
        if (addlModal) addlModal.style.display = 'none';
      };

      if (addlBtn) addlBtn.addEventListener('click', openLedgerAddlModal);
      ['#masterLedgerAddlCloseBtn', '#masterLedgerAddlDoneBtn'].forEach(sel => {
        const btn = contentArea.querySelector(sel);
        if (btn) btn.addEventListener('click', closeLedgerAddlModal);
      });
      if (addlModal) {
        // Click on the dimmed backdrop (outside the card) closes the popup
        addlModal.addEventListener('mousedown', (e) => {
          if (e.target === addlModal) closeLedgerAddlModal();
        });
        addlModal.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            closeLedgerAddlModal();
          }
        });
      }

      // (Each row's Group change — incl. the first row — is wired in wireLedgerRowInputs)
      updateAdditionalInfoVisibility();

      // GSTIN / PAN live validity check + Update-PAN-from-GSTIN (matches Company Profile & Vault)
      wireGstinPanValidation(contentArea, 'masterLedgerGstin', 'masterLedgerPan');
      const ifscInp = contentArea.querySelector('#masterLedgerIfsc');
      if (ifscInp) {
        ifscInp.addEventListener('input', (e) => {
          e.target.value = e.target.value.toUpperCase();
        });
      }

      // Revenue from Operations group: searchable SAC Code -> Description
      wireSacCodeDescFields(contentArea, 'masterLedgerSacCode', 'masterLedgerSacDesc');

      // Bank Account group: IFSC auto-uppercase + QR code upload
      const bankAcctIfscInp = contentArea.querySelector('#masterLedgerBankAcctIfsc');
      if (bankAcctIfscInp) {
        bankAcctIfscInp.addEventListener('input', (e) => {
          e.target.value = e.target.value.toUpperCase();
        });
      }

      // Bank Account group: searchable Bank Name field (matches Group field's
      // trigger + caret + in-dropdown search box pattern)
      const bankNameHidden = contentArea.querySelector('#masterLedgerBankAcctBankName');
      const bankNameTrigger = contentArea.querySelector('#masterLedgerBankAcctBankNameTrigger');
      const bankNameTriggerText = contentArea.querySelector('#masterLedgerBankAcctBankNameTriggerText');
      const bankNameDropdown = contentArea.querySelector('#masterLedgerBankAcctBankNameDropdown');
      const bankNameSearch = contentArea.querySelector('#masterLedgerBankAcctBankNameSearch');
      const bankNameOptionsList = contentArea.querySelector('#masterLedgerBankAcctBankNameOptionsList');

      if (bankNameHidden && bankNameTrigger && bankNameTriggerText && bankNameDropdown && bankNameSearch && bankNameOptionsList) {
        const setBankName = (val) => {
          bankNameHidden.value = val;
          bankNameTriggerText.textContent = val || 'Select Bank';
          bankNameTriggerText.style.color = val ? 'var(--slate-700)' : 'var(--slate-400)';
        };

        const renderBankOptions = (filter = '') => {
          bankNameOptionsList.innerHTML = '';
          const query = filter.toLowerCase().trim();
          const matches = query ? INDIAN_BANKS_LIST.filter(b => b.toLowerCase().includes(query)) : INDIAN_BANKS_LIST;

          const renderRow = (label, value, isSelected) => {
            const item = document.createElement('div');
            item.textContent = label;
            item.style.padding = '8.5px 12px';
            item.style.fontSize = '13.5px';
            item.style.borderRadius = '6px';
            item.style.cursor = 'pointer';
            item.style.fontWeight = isSelected ? '700' : '500';
            item.style.background = isSelected ? 'var(--blue-50)' : 'transparent';
            item.style.color = isSelected ? 'var(--blue-700)' : 'var(--slate-700)';

            item.addEventListener('mouseover', () => {
              if (!isSelected) item.style.background = 'var(--slate-50)';
            });
            item.addEventListener('mouseout', () => {
              if (!isSelected) item.style.background = 'transparent';
            });
            item.addEventListener('click', () => {
              setBankName(value);
              bankNameDropdown.style.display = 'none';
            });

            bankNameOptionsList.appendChild(item);
          };

          matches.forEach(bankName => renderRow(bankName, bankName, bankNameHidden.value === bankName));

          if (matches.length === 0 && query) {
            const emptyState = document.createElement('div');
            emptyState.style.padding = '10px 12px';
            emptyState.style.fontSize = '12px';
            emptyState.style.color = 'var(--slate-400)';
            emptyState.textContent = 'No matching bank found';
            bankNameOptionsList.appendChild(emptyState);
            renderRow(`Use "${filter.trim()}"`, filter.trim(), false);
          }
        };

        bankNameTrigger.addEventListener('click', (e) => {
          e.stopPropagation();
          const isOpen = bankNameDropdown.style.display === 'flex';
          if (!isOpen) {
            document.querySelectorAll('.kya-searchable-select-dropdown').forEach(dd => {
              if (dd !== bankNameDropdown) dd.style.display = 'none';
            });
            bankNameDropdown.style.display = 'flex';
            bankNameSearch.value = '';
            renderBankOptions('');
            setTimeout(() => bankNameSearch.focus(), 50);
          } else {
            bankNameDropdown.style.display = 'none';
          }
        });

        bankNameSearch.addEventListener('input', (e) => renderBankOptions(e.target.value));

        document.addEventListener('click', (e) => {
          if (!bankNameDropdown.contains(e.target) && !bankNameTrigger.contains(e.target)) {
            bankNameDropdown.style.display = 'none';
          }
        });
      }

      let _masterLedgerBankAcctQrData = null;
      const bankAcctQrInput = contentArea.querySelector('#masterLedgerBankAcctQrInput');
      const bankAcctQrDropzone = contentArea.querySelector('#masterLedgerBankAcctQrDropzone');
      const bankAcctQrEmptyState = contentArea.querySelector('#masterLedgerBankAcctQrEmptyState');
      const bankAcctQrSelectedState = contentArea.querySelector('#masterLedgerBankAcctQrSelectedState');
      const bankAcctQrStatusBadge = contentArea.querySelector('#masterLedgerBankAcctQrStatusBadge');
      const bankAcctQrPreviewImg = contentArea.querySelector('#masterLedgerBankAcctQrPreviewImg');
      const bankAcctQrFileNameEl = contentArea.querySelector('#masterLedgerBankAcctQrFileName');
      const bankAcctQrFileSizeEl = contentArea.querySelector('#masterLedgerBankAcctQrFileSize');
      const bankAcctQrPreviewBtn = contentArea.querySelector('#masterLedgerBankAcctQrPreviewBtn');
      const bankAcctQrRemoveBtn = contentArea.querySelector('#masterLedgerBankAcctQrRemoveBtn');

      const formatQrBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
      };

      const updateQrUI = (doc) => {
        _masterLedgerBankAcctQrData = doc;

        if (!doc || !doc.fileData) {
          if (bankAcctQrEmptyState) bankAcctQrEmptyState.style.display = 'flex';
          if (bankAcctQrSelectedState) bankAcctQrSelectedState.style.display = 'none';
          if (bankAcctQrStatusBadge) bankAcctQrStatusBadge.style.display = 'none';
          if (bankAcctQrInput) bankAcctQrInput.value = '';
          if (bankAcctQrPreviewImg) bankAcctQrPreviewImg.src = '';
          return;
        }

        if (bankAcctQrEmptyState) bankAcctQrEmptyState.style.display = 'none';
        if (bankAcctQrSelectedState) bankAcctQrSelectedState.style.display = 'flex';
        if (bankAcctQrStatusBadge) bankAcctQrStatusBadge.style.display = 'inline-block';
        if (bankAcctQrPreviewImg) bankAcctQrPreviewImg.src = doc.fileData;
        if (bankAcctQrFileNameEl) bankAcctQrFileNameEl.textContent = doc.fileName || 'QR Code';
        if (bankAcctQrFileSizeEl) bankAcctQrFileSizeEl.textContent = doc.fileSize || formatQrBytes(doc.fileBytes || 0);
        if (bankAcctQrPreviewBtn) bankAcctQrPreviewBtn.href = doc.fileData;
      };

      const handleQrUpload = (file) => {
        if (!file) return;
        if (!file.type || !file.type.startsWith('image/')) {
          if (typeof showToast === 'function') showToast('Only image files are supported for the QR code.', 'error');
          else alert('Only image files are supported for the QR code.');
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          if (typeof showToast === 'function') showToast('Image size exceeds 5MB limit.', 'error');
          else alert('Image size exceeds 5MB limit.');
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          updateQrUI({
            fileName: file.name,
            fileSize: formatQrBytes(file.size),
            fileBytes: file.size,
            fileData: ev.target.result
          });
        };
        reader.readAsDataURL(file);
      };

      if (bankAcctQrDropzone && bankAcctQrInput) {
        bankAcctQrDropzone.addEventListener('click', (e) => {
          if (e.target.closest('#masterLedgerBankAcctQrPreviewBtn') || e.target.closest('#masterLedgerBankAcctQrRemoveBtn')) return;
          bankAcctQrInput.click();
        });
        bankAcctQrInput.addEventListener('change', (e) => {
          const file = e.target.files && e.target.files[0];
          if (file) handleQrUpload(file);
        });
        bankAcctQrDropzone.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); bankAcctQrDropzone.style.borderColor = '#2563eb'; bankAcctQrDropzone.style.background = '#eff6ff'; });
        bankAcctQrDropzone.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); bankAcctQrDropzone.style.borderColor = 'var(--slate-300)'; bankAcctQrDropzone.style.background = '#fff'; });
        bankAcctQrDropzone.addEventListener('drop', (e) => {
          e.preventDefault(); e.stopPropagation();
          bankAcctQrDropzone.style.borderColor = 'var(--slate-300)'; bankAcctQrDropzone.style.background = '#fff';
          const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
          if (file) handleQrUpload(file);
        });
      }

      if (bankAcctQrRemoveBtn) {
        bankAcctQrRemoveBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          updateQrUI(null);
        });
      }

      const cancelBtn = contentArea.querySelector('#masterLedgerCancelBtn');
      const nameInp = contentArea.querySelector('#masterLedgerName');
      const nameErr = contentArea.querySelector('#masterLedgerNameError');

      // Live "already exists" check for a row's Name (row 0 is the first row)
      const validateLedgerRowNameLive = (idx) => {
        const inp = ledgerRowNameInput(idx);
        const err = contentArea.querySelector('#masterLedgerName' + (idx ? idx : '') + 'Error');
        const val = inp ? inp.value.trim() : '';
        const setErr = (text) => {
          if (err) { err.textContent = text || ''; err.style.display = text ? 'block' : 'none'; }
          if (inp) inp.style.borderColor = text ? '#ef4444' : 'var(--slate-200)';
        };
        if (!val) {
          setErr('');
          return null;
        }
        const dup = findDuplicateCoaNameOrAlias(val);
        if (dup) {
          const typeLabel = dup.parentName ? `Alias of "${dup.parentName}"` : dup.type;
          const errorText = `"${val}" already exists (${typeLabel}).`;
          setErr(errorText);
          return errorText;
        }
        setErr('');
        return null;
      };

      if (nameInp) {
        nameInp.addEventListener('keydown', (e) => {
          if (e.key === 'Backspace' && (!nameInp.value || nameInp.value.trim() === '')) {
            if (_masterDeskReturnContext) {
              e.preventDefault();
              e.stopPropagation();
              cancelMasterDeskReturn();
            }
          } else if (e.key === 'Escape') {
            if (_masterDeskReturnContext) {
              e.preventDefault();
              e.stopPropagation();
              cancelMasterDeskReturn();
            }
          }
        });
      }

      // ── Multi Create style row list (like Create Group): Name + Group per row, with an
      // "Add Another Ledger" button under the rows. The side box (Opening Balance,
      // Additional Details popup, Alternate Names) always shows the active row; each
      // row's values are parked in _masterLedgerRowState while another row is active. ──
      const extraLedgerRowsContainer = contentArea.querySelector('#masterLedgerExtraRowsContainer');
      const ledgerAddRowWrap = contentArea.querySelector('#masterLedgerAddRowWrap');
      const ledgerAddRowBtn = contentArea.querySelector('#masterLedgerAddRowBtn');
      const ledgerBalanceInp = contentArea.querySelector('#masterLedgerBalance');

      // Popup field ids and the value a fresh row starts with
      const LEDGER_ADDL_FIELD_DEFAULTS = {
        masterLedgerContactName: '', masterLedgerAddress: '', masterLedgerCity: '', masterLedgerPincode: '',
        masterLedgerState: '', masterLedgerCountry: 'India',
        masterLedgerBankName: '', masterLedgerAccountNo: '', masterLedgerIfsc: '', masterLedgerBranch: '',
        masterLedgerGstin: '', masterLedgerPan: '',
        masterLedgerBankAcctBankName: '', masterLedgerBankAcctHolder: '', masterLedgerBankAcctNo: '',
        masterLedgerBankAcctIfsc: '', masterLedgerBankAcctBranch: '',
        masterLedgerSacCode: '', masterLedgerSacDesc: '', masterLedgerSacRate: '', masterLedgerSacGstSel: '18'
      };

      const newLedgerRowState = () => ({
        aliases: [],
        balance: '',
        fields: Object.assign({}, LEDGER_ADDL_FIELD_DEFAULTS),
        qr: null,
        saveAsMode: 'ledger'
      });

      // Copies the shared side box / popup values into the active row's state
      const captureActiveLedgerRow = () => {
        if (_masterLedgerActiveRowIdx === null) return;
        const st = _masterLedgerRowState[_masterLedgerActiveRowIdx] || newLedgerRowState();
        st.aliases = _masterLedgerAliases;
        st.balance = ledgerBalanceInp ? ledgerBalanceInp.value : '';
        Object.keys(LEDGER_ADDL_FIELD_DEFAULTS).forEach(id => {
          const el = contentArea.querySelector('#' + id);
          if (el) st.fields[id] = el.value;
        });
        st.qr = _masterLedgerBankAcctQrData;
        st.saveAsMode = _masterLedgerSaveAsMode;
        _masterLedgerRowState[_masterLedgerActiveRowIdx] = st;
      };

      const setLedgerTriggerText = (id, value, placeholder) => {
        const txt = contentArea.querySelector('#' + id + 'TriggerText');
        if (!txt) return;
        txt.textContent = value || placeholder;
        txt.style.color = value ? 'var(--slate-700)' : 'var(--slate-400)';
      };

      // Puts a row's stored values into the shared side box / popup
      const loadLedgerRowState = (idx) => {
        const st = _masterLedgerRowState[idx] || newLedgerRowState();
        _masterLedgerRowState[idx] = st;
        if (ledgerBalanceInp) ledgerBalanceInp.value = st.balance;
        Object.keys(LEDGER_ADDL_FIELD_DEFAULTS).forEach(id => {
          const el = contentArea.querySelector('#' + id);
          if (el) el.value = st.fields[id] !== undefined ? st.fields[id] : LEDGER_ADDL_FIELD_DEFAULTS[id];
        });
        setLedgerTriggerText('masterLedgerBankAcctBankName', st.fields.masterLedgerBankAcctBankName, 'Select Bank');
        setLedgerTriggerText('masterLedgerSacCode', st.fields.masterLedgerSacCode, 'Select SAC Code');
        setLedgerTriggerText('masterLedgerSacDesc', st.fields.masterLedgerSacDesc, 'Auto-filled from SAC Code');
        // Refresh the GSTIN / PAN validity hints for the loaded values
        ['#masterLedgerGstin', '#masterLedgerPan'].forEach(sel => {
          const el = contentArea.querySelector(sel);
          if (el) el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        updateQrUI(st.qr);
        _masterLedgerSaveAsMode = st.saveAsMode;
        _masterLedgerAliases = st.aliases;
      };

      // Shows / hides the Alternate Name boxes for the active row based on its Name
      const syncLedgerAkaPanel = () => {
        const inp = activeNameInp();
        const nameVal = inp ? inp.value.trim() : '';
        const akaPanel = contentArea.querySelector('#masterLedgerAkaPanel');
        if (!nameVal) {
          if (akaPanel) akaPanel.style.display = 'none';
          if (_masterLedgerAliases.every(a => a.trim() === '')) {
            _masterLedgerAliases = [];
            renderMasterLedgerAliases();
          }
          return;
        }
        validateMasterLedgerAliasesLive();
        if (_masterLedgerAliases.length === 0) {
          _masterLedgerAliases.push('');
          renderMasterLedgerAliases();
        } else if (akaPanel) {
          akaPanel.style.display = 'block';
        }
      };

      const setActiveLedgerRow = (idx) => {
        if (idx === _masterLedgerActiveRowIdx) return;
        captureActiveLedgerRow();
        _masterLedgerActiveRowIdx = idx;
        loadLedgerRowState(idx);
        renderMasterLedgerAliases();
        updateAdditionalInfoVisibility();
        syncLedgerAkaPanel();
      };

      // Ledger count (1, 2, 3...) in the right corner of the Back bar
      const renderLedgerCount = () => {
        const countWrap = document.getElementById('masterDeskBackBarGroupCount');
        if (!countWrap) return;
        const count = 1 + _masterLedgerExtraRowKeys.length;
        countWrap.innerHTML = `<span title="Ledgers in this form" style="height: 34px; min-width: 34px; padding: 0 12px; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; border-radius: 6px; background: var(--white); border: 1px solid var(--slate-200); color: var(--slate-600); font-family: var(--font-main); font-size: 12.5px; font-weight: 600;">${count}</span>`;
      };

      // Shows the "Add Another Ledger" button only when the last row's Name has a value.
      const refreshLedgerAddRowBtn = () => {
        renderLedgerCount();
        if (!ledgerAddRowWrap) return;
        const lastIdx = _masterLedgerExtraRowKeys.length ? _masterLedgerExtraRowKeys[_masterLedgerExtraRowKeys.length - 1] : 0;
        const lastInp = ledgerRowNameInput(lastIdx);
        ledgerAddRowWrap.style.display = lastInp && lastInp.value.trim() ? 'block' : 'none';
      };

      const wireLedgerRowRemoveBtn = (idx) => {
        const btn = extraLedgerRowsContainer.querySelector('.master-ledger-row-remove[data-row-index="' + idx + '"]');
        if (!btn) return;
        btn.addEventListener('mouseenter', () => {
          btn.style.background = '#fef2f2';
          btn.style.color = '#dc2626';
          btn.style.borderColor = '#fecaca';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.background = '#ffffff';
          btn.style.color = 'var(--slate-400)';
          btn.style.borderColor = 'var(--slate-200)';
        });
        btn.addEventListener('click', () => {
          const rowEl = extraLedgerRowsContainer.querySelector('.master-ledger-row[data-row-index="' + idx + '"]');
          if (rowEl) rowEl.remove();
          const pos = _masterLedgerExtraRowKeys.indexOf(idx);
          const prevIdx = pos > 0 ? _masterLedgerExtraRowKeys[pos - 1] : 0;
          _masterLedgerExtraRowKeys = _masterLedgerExtraRowKeys.filter(k => k !== idx);
          delete _masterLedgerRowState[idx];
          if (_masterLedgerActiveRowIdx === idx) {
            // Removed row's values go with it — switch the side box to the row above
            _masterLedgerActiveRowIdx = null;
            setActiveLedgerRow(prevIdx);
            const prevInp = ledgerRowNameInput(prevIdx);
            if (prevInp) prevInp.focus();
          } else {
            validateMasterLedgerAliasesLive();
          }
          refreshLedgerAddRowBtn();
        });
      };

      const wireLedgerRowInputs = (idx) => {
        const rowNameInp = ledgerRowNameInput(idx);
        const rowGroupSel = contentArea.querySelector('#masterLedgerGroupCombinedSel' + (idx ? idx : ''));
        if (rowNameInp) {
          rowNameInp.addEventListener('focus', () => setActiveLedgerRow(idx));
          rowNameInp.addEventListener('input', () => {
            setActiveLedgerRow(idx);
            validateLedgerRowNameLive(idx);
            syncLedgerAkaPanel();
            refreshLedgerAddRowBtn();
          });
        }
        if (rowGroupSel) {
          rowGroupSel.addEventListener('change', () => {
            setActiveLedgerRow(idx);
            updateAdditionalInfoVisibility();
            openLedgerAddlModal();
          });
        }
      };

      const addNextLedgerRow = () => {
        _masterLedgerExtraRowSeq++;
        const idx = _masterLedgerExtraRowSeq;
        // New row's Group defaults to the row above it
        const prevIdx = _masterLedgerExtraRowKeys.length ? _masterLedgerExtraRowKeys[_masterLedgerExtraRowKeys.length - 1] : 0;
        const prevGroupSel = contentArea.querySelector('#masterLedgerGroupCombinedSel' + (prevIdx ? prevIdx : ''));
        extraLedgerRowsContainer.insertAdjacentHTML('beforeend', buildLedgerExtraRowHtml(idx, ledgerGroupOptionsHtml, firstGroupLabel));
        const newGroupSel = contentArea.querySelector('#masterLedgerGroupCombinedSel' + idx);
        if (prevGroupSel && newGroupSel && prevGroupSel.value) {
          newGroupSel.value = prevGroupSel.value;
        } else if (newGroupSel) {
          newGroupSel.selectedIndex = -1; // nothing chosen above -> show "Select Group"
        }
        initSearchableSelectHelper(contentArea, 'masterLedgerGroupCombinedSel' + idx, 'Select Group');
        _masterLedgerRowState[idx] = newLedgerRowState();
        wireLedgerRowInputs(idx);
        wireLedgerRowRemoveBtn(idx);
        _masterLedgerExtraRowKeys.push(idx);
        refreshLedgerAddRowBtn();
        const newNameInp = ledgerRowNameInput(idx);
        if (newNameInp) {
          newNameInp.focus();
          setActiveLedgerRow(idx);
        }
      };

      if (ledgerAddRowBtn) {
        ledgerAddRowBtn.addEventListener('mouseenter', () => { ledgerAddRowBtn.style.background = 'var(--blue-50, #eff6ff)'; });
        ledgerAddRowBtn.addEventListener('mouseleave', () => { ledgerAddRowBtn.style.background = '#ffffff'; });
        ledgerAddRowBtn.addEventListener('click', addNextLedgerRow);
      }

      // First row's dustbin: with more rows below, removes this ledger and moves the next
      // row (Name, Group and its side-box values) up; on its own, just clears it.
      const ledgerCleanBtn = contentArea.querySelector('#masterLedgerRowCleanBtn');
      if (ledgerCleanBtn) {
        ledgerCleanBtn.addEventListener('mouseenter', () => {
          ledgerCleanBtn.style.background = '#fef2f2';
          ledgerCleanBtn.style.color = '#dc2626';
          ledgerCleanBtn.style.borderColor = '#fecaca';
        });
        ledgerCleanBtn.addEventListener('mouseleave', () => {
          ledgerCleanBtn.style.background = '#ffffff';
          ledgerCleanBtn.style.color = 'var(--slate-400)';
          ledgerCleanBtn.style.borderColor = 'var(--slate-200)';
        });
        ledgerCleanBtn.addEventListener('click', () => {
          captureActiveLedgerRow();
          if (_masterLedgerExtraRowKeys.length > 0) {
            const nextIdx = _masterLedgerExtraRowKeys[0];
            const nextNameInp = ledgerRowNameInput(nextIdx);
            const nextGroupSel = contentArea.querySelector('#masterLedgerGroupCombinedSel' + nextIdx);
            if (nameInp) nameInp.value = nextNameInp ? nextNameInp.value : '';
            if (groupSel && nextGroupSel) groupSel.value = nextGroupSel.value;
            _masterLedgerRowState[0] = _masterLedgerRowState[nextIdx] || newLedgerRowState();
            delete _masterLedgerRowState[nextIdx];
            const nextRowEl = extraLedgerRowsContainer.querySelector('.master-ledger-row[data-row-index="' + nextIdx + '"]');
            if (nextRowEl) nextRowEl.remove();
            _masterLedgerExtraRowKeys = _masterLedgerExtraRowKeys.slice(1);
          } else {
            if (nameInp) nameInp.value = '';
            if (groupSel && groupSel.options.length > 0) groupSel.selectedIndex = -1;
            _masterLedgerRowState[0] = newLedgerRowState();
          }
          if (searchableGroupControl && typeof searchableGroupControl.refresh === 'function') {
            searchableGroupControl.refresh();
          }
          _masterLedgerActiveRowIdx = null;
          setActiveLedgerRow(0);
          validateLedgerRowNameLive(0);
          refreshLedgerAddRowBtn();
          if (nameInp) nameInp.focus();
        });
      }

      _masterLedgerRowState[0] = newLedgerRowState();
      wireLedgerRowInputs(0);
      refreshLedgerAddRowBtn();

      // Sends the user back to the voucher that opened Create Ledger (if any) with the
      // created entry. Returns true when it navigated away.
      const returnLedgerToVoucher = (entity, kind) => {
        if (!_masterDeskReturnContext) return false;
        const ctx = _masterDeskReturnContext;
        _masterDeskReturnContext = null;
        _masterLedgerAliases = [];
        const goTo = (tab) => {
          if (typeof closeTab === 'function') closeTab('master_desk', null, tab);
          else if (typeof window.closeTab === 'function') window.closeTab('master_desk', null, tab);
          if (typeof openTab === 'function') openTab(tab);
          else if (typeof window.openTab === 'function') window.openTab(tab);
        };
        if (ctx.returnTab === 'sales_voucher') {
          goTo('sales_voucher');
          if (typeof window.onPartyCreatedForSales === 'function') window.onPartyCreatedForSales(entity, kind);
          return true;
        }
        if (ctx.returnTab === 'purchase_voucher') {
          goTo('purchase_voucher');
          if (typeof window.onPartyCreatedForPurchase === 'function') window.onPartyCreatedForPurchase(entity, kind);
          return true;
        }
        if (ctx.returnTab === 'journal') {
          goTo('journal');
          if (typeof window.onLedgerCreatedForJournal === 'function') window.onLedgerCreatedForJournal(entity, ctx.rowId);
          return true;
        }
        if (ctx.returnTab === 'cashline') {
          goTo('cashline');
          if (typeof window.onLedgerCreatedForCashline === 'function') window.onLedgerCreatedForCashline(entity, ctx);
          return true;
        }
        return false;
      };

      // Creates one row as a Customer, Supplier or CoA Ledger. Returns { entity, kind }.
      const createLedgerRowEntry = (row, seq) => {
        const f = row.fields;
        const val = (id) => (f[id] || '').trim();
        const partyCommon = {
          name: row.name,
          aliases: row.aliases,
          openingBalance: row.openingBalance,
          contactName: val('masterLedgerContactName'),
          address: val('masterLedgerAddress'),
          city: val('masterLedgerCity'),
          pincode: val('masterLedgerPincode'),
          state: val('masterLedgerState'),
          country: val('masterLedgerCountry') || 'India',
          bankName: val('masterLedgerBankName'),
          accountNo: val('masterLedgerAccountNo'),
          ifsc: val('masterLedgerIfsc'),
          branch: val('masterLedgerBranch'),
          gstin: val('masterLedgerGstin'),
          pan: val('masterLedgerPan')
        };

        if (row.mode === 'customer') {
          const customers = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
          const newCustomer = Object.assign({ id: 'cust-' + Date.now() + (seq ? '-' + seq : '') }, partyCommon, { createdAt: Date.now() });
          customers.push(newCustomer);

          // Ensure central Trade Receivables ledger exists in CoA and update combined balance
          if (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) {
            let trLedger = coaLedgers.find(l => l.type === 'ledger' && l.sgId === 'sg-tr' && l.name === 'Trade Receivables');
            if (!trLedger) {
              trLedger = { id: 104, name: 'Trade Receivables', sgId: 'sg-tr', type: 'ledger', openingBalance: 0 };
              coaLedgers.push(trLedger);
            }
            trLedger.openingBalance = customers.reduce((sum, c) => sum + (parseFloat(c.openingBalance) || 0), 0);
          }
          if (typeof _coaExpanded !== 'undefined') {
            _coaExpanded.add('assets');
            _coaExpanded.add('sg-tr');
          }
          return { entity: newCustomer, kind: 'customer' };
        }

        if (row.mode === 'supplier') {
          const suppliers = typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : [];
          const newSupplier = Object.assign({ id: 'supp-' + Date.now() + (seq ? '-' + seq : '') }, partyCommon, { createdAt: Date.now() });
          suppliers.push(newSupplier);

          // Ensure central Trade Payables ledger exists in CoA and update combined balance
          if (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) {
            let tpLedger = coaLedgers.find(l => l.type === 'ledger' && l.sgId === 'sg-tp' && l.name === 'Trade Payables');
            if (!tpLedger) {
              tpLedger = { id: 201, name: 'Trade Payables', sgId: 'sg-tp', type: 'ledger', openingBalance: 0 };
              coaLedgers.push(tpLedger);
            }
            tpLedger.openingBalance = suppliers.reduce((sum, s) => sum + (parseFloat(s.openingBalance) || 0), 0);
          }
          if (typeof _coaExpanded !== 'undefined') {
            _coaExpanded.add('equity-liabilities');
            _coaExpanded.add('sg-tp');
          }
          return { entity: newSupplier, kind: 'supplier' };
        }

        // Save As "Ledger" in CoA
        const [pType, pId] = row.groupVal.split(':');
        let sgId = '';
        let glId = null;
        if (pType === 'sg') {
          sgId = pId;
        } else if (pType === 'gl') {
          const parentGl = typeof coaLedgers !== 'undefined' ? coaLedgers.find(l => l.id === Number(pId)) : null;
          if (parentGl) {
            sgId = parentGl.sgId;
            glId = parentGl.id;
          } else {
            sgId = pId;
          }
        }

        const bankAcctInfo = isBankAccountGroup(row.groupVal) ? {
          bankName: val('masterLedgerBankAcctBankName'),
          accountHolder: val('masterLedgerBankAcctHolder'),
          accountNo: val('masterLedgerBankAcctNo'),
          ifscCode: val('masterLedgerBankAcctIfsc'),
          branch: val('masterLedgerBankAcctBranch'),
          qrCode: row.qr ? row.qr.fileData : '',
          qrCodeFileName: row.qr ? row.qr.fileName : ''
        } : null;

        const sacInfo = isRevenueFromOperationsGroup(row.groupVal) ? {
          sacCode: val('masterLedgerSacCode'),
          sacDesc: val('masterLedgerSacDesc'),
          rate: parseFloat(f.masterLedgerSacRate) || 0,
          gstRate: parseFloat(f.masterLedgerSacGstSel) || 0
        } : null;

        const newLedger = Object.assign({
          id: Date.now() + (typeof _coaLedgerCtr !== 'undefined' ? _coaLedgerCtr++ : seq),
          sgId: sgId,
          glId: glId,
          code: '',
          type: 'ledger'
        }, partyCommon, {
          bankAccountInfo: bankAcctInfo,
          sacInfo: sacInfo
        });

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
        return { entity: newLedger, kind: 'ledger' };
      };

      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const notify = (msg, type) => {
            if (typeof showToast === 'function') showToast(msg, type);
            else alert(msg);
          };

          // Check the active row's Alternate Names (the ones currently on screen)
          if (!validateMasterLedgerAliasesLive()) {
            notify('Please fix duplicate or invalid Alternate Name entries.', 'error');
            return;
          }
          captureActiveLedgerRow();

          const rowIdxs = [0, ..._masterLedgerExtraRowKeys];
          const formNamesSet = new Set();
          const rows = [];

          for (const idx of rowIdxs) {
            const rowNameInp = ledgerRowNameInput(idx);
            const rowName = rowNameInp ? rowNameInp.value.trim() : '';
            const st = _masterLedgerRowState[idx] || newLedgerRowState();
            const rowGroupSel = contentArea.querySelector('#masterLedgerGroupCombinedSel' + (idx ? idx : ''));
            const rowGroupVal = rowGroupSel && rowGroupSel.value ? rowGroupSel.value : '';
            const isPartyGroup = isTradePartyGroup(rowGroupVal);
            const mode = isPartyGroup && st.saveAsMode !== 'ledger'
              ? (isTradePayableGroup(rowGroupVal) ? 'supplier' : 'customer')
              : 'ledger';

            if (!rowName) {
              // A trailing row left empty is just unfilled — it's skipped, not an error
              if (idx !== 0) continue;
              notify(`Please enter a ${mode} name.`, 'warning');
              if (rowNameInp) rowNameInp.focus();
              return;
            }

            const nameErrText = validateLedgerRowNameLive(idx);
            if (nameErrText) {
              notify(nameErrText, 'error');
              if (rowNameInp) rowNameInp.focus();
              return;
            }

            const nameLower = rowName.toLowerCase();
            if (formNamesSet.has(nameLower)) {
              notify(`Duplicate entry "${rowName}" found in the form. Each ledger name must be unique.`, 'error');
              if (rowNameInp) rowNameInp.focus();
              return;
            }
            formNamesSet.add(nameLower);

            if (!rowGroupVal) {
              notify(`Please select a group for "${rowName}".`, 'warning');
              return;
            }

            const aliases = (st.aliases || []).map(a => a.trim()).filter(a => a !== '');
            for (const al of aliases) {
              const alLower = al.toLowerCase();
              if (formNamesSet.has(alLower)) {
                notify(`Duplicate entry "${al}" found in the form (Alternate Name of "${rowName}"). Names and Alternate Names must be unique.`, 'error');
                return;
              }
              formNamesSet.add(alLower);
              const dupAl = findDuplicateCoaNameOrAlias(al);
              if (dupAl) {
                const typeLabel = dupAl.parentName ? `Alias of "${dupAl.parentName}"` : dupAl.type;
                notify(`"${al}" (Alternate Name of "${rowName}") already exists (${typeLabel}).`, 'error');
                return;
              }
            }

            const balVal = (st.balance || '').toString().trim();
            rows.push({
              name: rowName,
              groupVal: rowGroupVal,
              aliases: aliases,
              openingBalance: balVal ? parseFloat(balVal) || 0 : 0,
              fields: st.fields,
              qr: st.qr,
              mode: mode
            });
          }

          const created = rows.map((row, i) => createLedgerRowEntry(row, i));

          if (typeof renderChartPanel === 'function') renderChartPanel();
          if (typeof refreshAllReports === 'function') refreshAllReports();
          if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
          if (typeof populateSalesCustomers === 'function') populateSalesCustomers();
          if (typeof populatePurchaseVendors === 'function') populatePurchaseVendors();

          if (created.length > 1) {
            notify(`${created.length} ledgers created successfully.`, 'success');
          } else {
            const only = created[0];
            if (only.kind === 'customer') notify(`Customer "${only.entity.name}" created successfully (linked to Trade Receivables).`, 'success');
            else if (only.kind === 'supplier') notify(`Supplier "${only.entity.name}" created successfully (linked to Trade Payables).`, 'success');
            else notify(`Ledger "${only.entity.name}" created successfully.`, 'success');
          }

          _masterLedgerAliases = [];
          if (returnLedgerToVoucher(created[0].entity, created[0].kind)) return;
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
      _masterCustomerRowState = {};
      _masterCustomerActiveRowIdx = 0;
      _masterCustomerExtraRowKeys = [];
      _masterCustomerExtraRowSeq = 0;

      const custDustbinSvg = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18"/>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>`;

      // One "Name" row of the Create Customer form. idx 0 is the first row (ids without a
      // suffix, with a "clean" dustbin); rows added with "Add Another Customer" get a
      // numeric suffix and a "remove" dustbin — same look as Create Group / Ledger rows.
      const buildCustomerRowHtml = (idx) => {
        const sfx = idx ? String(idx) : '';
        const btnClass = idx ? 'master-customer-row-remove' : 'master-customer-row-clean';
        const btnId = idx ? '' : 'id="masterCustomerRowCleanBtn"';
        const btnTitle = idx ? 'Remove this customer' : 'Clean this customer';
        return `
          <div class="master-customer-row" data-row-index="${idx}" style="display: grid; grid-template-columns: minmax(0, 1fr) 38px; gap: 14px; margin-bottom: 16px;">
            <div>
              <label class="coa-modal-label" for="masterCustomerName${sfx}" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Name *</label>
              <input class="coa-modal-inp" id="masterCustomerName${sfx}" placeholder="Enter Name" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box;">
              <div id="masterCustomerName${sfx}Error" style="display: none; font-size: 12px; font-weight: 600; color: #dc2626; margin-top: 5px;"></div>
            </div>
            <div>
              <label style="font-size: 13px; margin-bottom: 6px; display: block; visibility: hidden; user-select: none;">&nbsp;</label>
              <button type="button" class="${btnClass}" ${btnId} data-row-index="${idx}" title="${btnTitle}" style="width: 38px; height: 38px; min-width: 38px; display: inline-flex; align-items: center; justify-content: center; padding: 0; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #ffffff; color: var(--slate-400); cursor: pointer; transition: all 0.15s ease;">
                ${custDustbinSvg}
              </button>
            </div>
          </div>
        `;
      };

      const custInpStyle = 'padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;';

      contentArea.innerHTML = `
        <div style="display: grid; grid-template-columns: minmax(0, 620px) 1fr; gap: 20px; align-items: start;">
          <div class="coa-modal-card" style="max-width: 620px; box-shadow: none; border: 1.5px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--slate-50); margin: 0;">
            ${buildCustomerRowHtml(0)}

            <!-- Additional customers (added row-by-row via the Add button, like Create Group) -->
            <div id="masterCustomerExtraRowsContainer"></div>

            <!-- Add another customer — shown once the last row's Name is filled in -->
            <div id="masterCustomerAddRowWrap" style="display: none; margin: -4px 0 16px 0;">
              <button type="button" id="masterCustomerAddRowBtn" title="Add another customer" style="display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 6px 14px; font-size: 12.5px; font-weight: 600; color: var(--blue-600); background: #ffffff; border: 1.5px dashed var(--blue-600); border-radius: 8px; cursor: pointer; transition: all 0.15s ease;">＋ Add Another Customer</button>
            </div>

            <div style="display: flex; gap: 12px; align-items: center;">
              <button class="btn btn-primary" id="masterCustomerSaveBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Create Customer</button>
              <button class="btn btn-secondary" id="masterCustomerCancelBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Cancel</button>
            </div>
          </div>

          <!-- Second box: Opening Balance, Additional Details, then Alternate Names once Name is filled in -->
          <div class="coa-modal-card" id="masterCustomerSidePanel" style="box-shadow: none; border: 1.5px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--slate-50); margin: 0;">
            <label class="coa-modal-label" for="masterCustomerBalance" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Opening Balance</label>
            <input class="coa-modal-inp" id="masterCustomerBalance" type="number" min="0" step="0.01" placeholder="0.00" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box;">

            <div style="margin-top: 16px;">
              <button type="button" class="btn btn-secondary" id="masterCustomerAddlBtn" style="width: 100%; height: 38px; justify-content: center; padding: 8px 16px; font-size: 13px; font-weight: 600; border-radius: 8px;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                Additional Details
              </button>
            </div>

            <!-- Alternate Name — one box per alias, auto-adding another below as you type (no limit) -->
            <div id="masterCustomerAkaPanel" style="display: none; margin-top: 16px;">
              <label class="coa-modal-label" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Alternate Name</label>
              <div id="masterCustomerAliasesContainer" style="display: flex; flex-direction: column; gap: 10px;"></div>
            </div>
          </div>
        </div>

        <!-- Additional Details popup (Name & Address, Bank Information, GSTIN & PAN) -->
        <style>
          /* Popup fields fill their grid column instead of overflowing it on narrow screens */
          #masterCustomerAddlModal .master-customer-addl-body input:not([type=hidden]):not([type=file]),
          #masterCustomerAddlModal .master-customer-addl-body textarea { width: 100%; min-width: 0; box-sizing: border-box; }
        </style>
        <div class="oh-modal-overlay" id="masterCustomerAddlModal" style="display: none;">
          <div style="background: var(--white); border-radius: 14px; width: 94%; max-width: 640px; max-height: 88vh; display: flex; flex-direction: column; box-shadow: 0 40px 100px rgba(0,0,0,.24);">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 24px; border-bottom: 1px solid var(--slate-200);">
              <div style="min-width: 0;">
                <div style="font-size: 15px; font-weight: 700; color: var(--slate-800);">Additional Details</div>
                <div id="masterCustomerAddlModalSub" style="font-size: 12.5px; color: var(--slate-500); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"></div>
              </div>
              <button type="button" class="oh-modal-close" id="masterCustomerAddlCloseBtn" title="Close">✕</button>
            </div>

            <div class="master-customer-addl-body" style="padding: 20px 24px; overflow-y: auto; overflow-x: hidden;">
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
                  <input type="text" id="masterCustomerContactName" placeholder="Enter Contact Person" style="${custInpStyle}">
                  <textarea id="masterCustomerAddress" placeholder="Enter Address" rows="2" style="${custInpStyle} resize: vertical; font-family: inherit;"></textarea>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <input type="text" id="masterCustomerCity" placeholder="Enter City" style="${custInpStyle}">
                    <input type="text" id="masterCustomerPincode" placeholder="Enter PIN Code" style="${custInpStyle}">
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <input type="text" id="masterCustomerState" placeholder="Enter State" style="${custInpStyle}">
                    <input type="text" id="masterCustomerCountry" placeholder="Enter Country" value="India" style="${custInpStyle}">
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
                    <input type="text" id="masterCustomerBankName" placeholder="Enter Bank Name" style="${custInpStyle}">
                    <input type="text" id="masterCustomerAccountNo" placeholder="Enter Account Number" style="${custInpStyle}">
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <input type="text" id="masterCustomerIfsc" placeholder="Enter IFSC Code" style="${custInpStyle} text-transform: uppercase;">
                    <input type="text" id="masterCustomerBranch" placeholder="Enter Branch" style="${custInpStyle}">
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
                  <input type="text" id="masterCustomerGstin" placeholder="Enter GSTIN" maxlength="15" style="${custInpStyle} text-transform: uppercase;">
                  <input type="text" id="masterCustomerPan" placeholder="Enter PAN" maxlength="10" style="${custInpStyle} text-transform: uppercase;">
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 14px 24px; border-top: 1px solid var(--slate-200);">
              <button type="button" class="btn btn-primary" id="masterCustomerAddlDoneBtn" style="height: 38px; padding: 8px 18px; font-size: 13px; font-weight: 600;">Done</button>
            </div>
          </div>
        </div>
      `;

      renderMasterCustomerAliases();

      // GSTIN / PAN live validity check + Update-PAN-from-GSTIN (matches Company Profile & Vault)
      wireGstinPanValidation(contentArea, 'masterCustomerGstin', 'masterCustomerPan');
      const ifscInp = contentArea.querySelector('#masterCustomerIfsc');
      if (ifscInp) {
        ifscInp.addEventListener('input', (e) => {
          e.target.value = e.target.value.toUpperCase();
        });
      }

      const saveBtn = contentArea.querySelector('#masterCustomerSaveBtn');
      const cancelBtn = contentArea.querySelector('#masterCustomerCancelBtn');
      const nameInp = contentArea.querySelector('#masterCustomerName');
      const custBalanceInp = contentArea.querySelector('#masterCustomerBalance');
      const extraCustRowsContainer = contentArea.querySelector('#masterCustomerExtraRowsContainer');
      const custAddRowWrap = contentArea.querySelector('#masterCustomerAddRowWrap');
      const custAddRowBtn = contentArea.querySelector('#masterCustomerAddRowBtn');

      const custRowNameInput = (idx) => contentArea.querySelector('#masterCustomerName' + (idx ? idx : ''));
      const activeCustNameInp = () => custRowNameInput(_masterCustomerActiveRowIdx || 0);

      // ── Additional Details popup ──
      const custAddlModal = contentArea.querySelector('#masterCustomerAddlModal');
      const custAddlModalSub = contentArea.querySelector('#masterCustomerAddlModalSub');
      const openCustomerAddlModal = () => {
        if (!custAddlModal) return;
        if (custAddlModalSub) {
          const inp = activeCustNameInp();
          const nameVal = inp ? inp.value.trim() : '';
          custAddlModalSub.textContent = nameVal ? `${nameVal} · Trade Receivables` : 'Trade Receivables';
        }
        custAddlModal.style.display = 'flex';
      };
      const closeCustomerAddlModal = () => {
        if (custAddlModal) custAddlModal.style.display = 'none';
      };
      const custAddlBtn = contentArea.querySelector('#masterCustomerAddlBtn');
      if (custAddlBtn) custAddlBtn.addEventListener('click', openCustomerAddlModal);
      ['#masterCustomerAddlCloseBtn', '#masterCustomerAddlDoneBtn'].forEach(sel => {
        const btn = contentArea.querySelector(sel);
        if (btn) btn.addEventListener('click', closeCustomerAddlModal);
      });
      if (custAddlModal) {
        // Click on the dimmed backdrop (outside the card) closes the popup
        custAddlModal.addEventListener('mousedown', (e) => {
          if (e.target === custAddlModal) closeCustomerAddlModal();
        });
        custAddlModal.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            closeCustomerAddlModal();
          }
        });
      }

      // ── Per-row state (like Create Ledger): the side box and popup always show the
      // active row; other rows' values are parked in _masterCustomerRowState ──
      const CUSTOMER_ADDL_FIELD_DEFAULTS = {
        masterCustomerContactName: '', masterCustomerAddress: '', masterCustomerCity: '', masterCustomerPincode: '',
        masterCustomerState: '', masterCustomerCountry: 'India',
        masterCustomerBankName: '', masterCustomerAccountNo: '', masterCustomerIfsc: '', masterCustomerBranch: '',
        masterCustomerGstin: '', masterCustomerPan: ''
      };
      const newCustomerRowState = () => ({
        aliases: [],
        balance: '',
        fields: Object.assign({}, CUSTOMER_ADDL_FIELD_DEFAULTS)
      });

      const captureActiveCustomerRow = () => {
        if (_masterCustomerActiveRowIdx === null) return;
        const st = _masterCustomerRowState[_masterCustomerActiveRowIdx] || newCustomerRowState();
        st.aliases = _masterCustomerAliases;
        st.balance = custBalanceInp ? custBalanceInp.value : '';
        Object.keys(CUSTOMER_ADDL_FIELD_DEFAULTS).forEach(id => {
          const el = contentArea.querySelector('#' + id);
          if (el) st.fields[id] = el.value;
        });
        _masterCustomerRowState[_masterCustomerActiveRowIdx] = st;
      };

      const loadCustomerRowState = (idx) => {
        const st = _masterCustomerRowState[idx] || newCustomerRowState();
        _masterCustomerRowState[idx] = st;
        if (custBalanceInp) custBalanceInp.value = st.balance;
        Object.keys(CUSTOMER_ADDL_FIELD_DEFAULTS).forEach(id => {
          const el = contentArea.querySelector('#' + id);
          if (el) el.value = st.fields[id] !== undefined ? st.fields[id] : CUSTOMER_ADDL_FIELD_DEFAULTS[id];
        });
        // Refresh the GSTIN / PAN validity hints for the loaded values
        ['#masterCustomerGstin', '#masterCustomerPan'].forEach(sel => {
          const el = contentArea.querySelector(sel);
          if (el) el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        _masterCustomerAliases = st.aliases;
      };

      // Shows / hides the Alternate Name boxes for the active row based on its Name
      const syncCustomerAkaPanel = () => {
        const inp = activeCustNameInp();
        const nameVal = inp ? inp.value.trim() : '';
        const akaPanel = contentArea.querySelector('#masterCustomerAkaPanel');
        if (!nameVal) {
          if (akaPanel) akaPanel.style.display = 'none';
          if (_masterCustomerAliases.every(a => a.trim() === '')) {
            _masterCustomerAliases = [];
            renderMasterCustomerAliases();
          }
          return;
        }
        validateMasterCustomerAliasesLive();
        if (_masterCustomerAliases.length === 0) {
          _masterCustomerAliases.push('');
          renderMasterCustomerAliases();
        } else if (akaPanel) {
          akaPanel.style.display = 'block';
        }
      };

      const setActiveCustomerRow = (idx) => {
        if (idx === _masterCustomerActiveRowIdx) return;
        captureActiveCustomerRow();
        _masterCustomerActiveRowIdx = idx;
        loadCustomerRowState(idx);
        renderMasterCustomerAliases();
        syncCustomerAkaPanel();
      };

      // Live "already exists" check for a row's Name (row 0 is the first row)
      const validateCustomerRowNameLive = (idx) => {
        const inp = custRowNameInput(idx);
        const err = contentArea.querySelector('#masterCustomerName' + (idx ? idx : '') + 'Error');
        const val = inp ? inp.value.trim() : '';
        const setErr = (text) => {
          if (err) { err.textContent = text || ''; err.style.display = text ? 'block' : 'none'; }
          if (inp) inp.style.borderColor = text ? '#ef4444' : 'var(--slate-200)';
        };
        if (!val) {
          setErr('');
          return null;
        }
        const dup = findDuplicateCoaNameOrAlias(val);
        if (dup) {
          const typeLabel = dup.parentName ? `Alias of "${dup.parentName}"` : dup.type;
          const errorText = `"${val}" already exists (${typeLabel}).`;
          setErr(errorText);
          return errorText;
        }
        setErr('');
        return null;
      };

      // Customer count (1, 2, 3...) in the right corner of the Back bar
      const renderCustomerCount = () => {
        const countWrap = document.getElementById('masterDeskBackBarGroupCount');
        if (!countWrap) return;
        const count = 1 + _masterCustomerExtraRowKeys.length;
        countWrap.innerHTML = `<span title="Customers in this form" style="height: 34px; min-width: 34px; padding: 0 12px; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; border-radius: 6px; background: var(--white); border: 1px solid var(--slate-200); color: var(--slate-600); font-family: var(--font-main); font-size: 12.5px; font-weight: 600;">${count}</span>`;
      };

      // Shows the "Add Another Customer" button only when the last row's Name has a value.
      const refreshCustomerAddRowBtn = () => {
        renderCustomerCount();
        if (!custAddRowWrap) return;
        const lastIdx = _masterCustomerExtraRowKeys.length ? _masterCustomerExtraRowKeys[_masterCustomerExtraRowKeys.length - 1] : 0;
        const lastInp = custRowNameInput(lastIdx);
        custAddRowWrap.style.display = lastInp && lastInp.value.trim() ? 'block' : 'none';
      };

      const wireCustomerDustbinHover = (btn) => {
        btn.addEventListener('mouseenter', () => {
          btn.style.background = '#fef2f2';
          btn.style.color = '#dc2626';
          btn.style.borderColor = '#fecaca';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.background = '#ffffff';
          btn.style.color = 'var(--slate-400)';
          btn.style.borderColor = 'var(--slate-200)';
        });
      };

      const wireCustomerRowRemoveBtn = (idx) => {
        const btn = extraCustRowsContainer.querySelector('.master-customer-row-remove[data-row-index="' + idx + '"]');
        if (!btn) return;
        wireCustomerDustbinHover(btn);
        btn.addEventListener('click', () => {
          const rowEl = extraCustRowsContainer.querySelector('.master-customer-row[data-row-index="' + idx + '"]');
          if (rowEl) rowEl.remove();
          const pos = _masterCustomerExtraRowKeys.indexOf(idx);
          const prevIdx = pos > 0 ? _masterCustomerExtraRowKeys[pos - 1] : 0;
          _masterCustomerExtraRowKeys = _masterCustomerExtraRowKeys.filter(k => k !== idx);
          delete _masterCustomerRowState[idx];
          if (_masterCustomerActiveRowIdx === idx) {
            // Removed row's values go with it — switch the side box to the row above
            _masterCustomerActiveRowIdx = null;
            setActiveCustomerRow(prevIdx);
            const prevInp = custRowNameInput(prevIdx);
            if (prevInp) prevInp.focus();
          } else {
            validateMasterCustomerAliasesLive();
          }
          refreshCustomerAddRowBtn();
        });
      };

      const wireCustomerRowInputs = (idx) => {
        const rowNameInp = custRowNameInput(idx);
        if (!rowNameInp) return;
        rowNameInp.addEventListener('focus', () => setActiveCustomerRow(idx));
        rowNameInp.addEventListener('input', () => {
          setActiveCustomerRow(idx);
          validateCustomerRowNameLive(idx);
          syncCustomerAkaPanel();
          refreshCustomerAddRowBtn();
        });
      };

      const addNextCustomerRow = () => {
        _masterCustomerExtraRowSeq++;
        const idx = _masterCustomerExtraRowSeq;
        extraCustRowsContainer.insertAdjacentHTML('beforeend', buildCustomerRowHtml(idx));
        _masterCustomerRowState[idx] = newCustomerRowState();
        wireCustomerRowInputs(idx);
        wireCustomerRowRemoveBtn(idx);
        _masterCustomerExtraRowKeys.push(idx);
        refreshCustomerAddRowBtn();
        const newNameInp = custRowNameInput(idx);
        if (newNameInp) {
          newNameInp.focus();
          setActiveCustomerRow(idx);
        }
      };

      if (custAddRowBtn) {
        custAddRowBtn.addEventListener('mouseenter', () => { custAddRowBtn.style.background = 'var(--blue-50, #eff6ff)'; });
        custAddRowBtn.addEventListener('mouseleave', () => { custAddRowBtn.style.background = '#ffffff'; });
        custAddRowBtn.addEventListener('click', addNextCustomerRow);
      }

      // First row's dustbin: with more rows below, removes this customer and moves the next
      // row (Name and its side-box values) up; on its own, just clears it.
      const custCleanBtn = contentArea.querySelector('#masterCustomerRowCleanBtn');
      if (custCleanBtn) {
        wireCustomerDustbinHover(custCleanBtn);
        custCleanBtn.addEventListener('click', () => {
          captureActiveCustomerRow();
          if (_masterCustomerExtraRowKeys.length > 0) {
            const nextIdx = _masterCustomerExtraRowKeys[0];
            const nextNameInp = custRowNameInput(nextIdx);
            if (nameInp) nameInp.value = nextNameInp ? nextNameInp.value : '';
            _masterCustomerRowState[0] = _masterCustomerRowState[nextIdx] || newCustomerRowState();
            delete _masterCustomerRowState[nextIdx];
            const nextRowEl = extraCustRowsContainer.querySelector('.master-customer-row[data-row-index="' + nextIdx + '"]');
            if (nextRowEl) nextRowEl.remove();
            _masterCustomerExtraRowKeys = _masterCustomerExtraRowKeys.slice(1);
          } else {
            if (nameInp) nameInp.value = '';
            _masterCustomerRowState[0] = newCustomerRowState();
          }
          _masterCustomerActiveRowIdx = null;
          setActiveCustomerRow(0);
          validateCustomerRowNameLive(0);
          refreshCustomerAddRowBtn();
          if (nameInp) nameInp.focus();
        });
      }

      if (nameInp) {
        nameInp.addEventListener('keydown', (e) => {
          if (e.key === 'Backspace' && (!nameInp.value || nameInp.value.trim() === '')) {
            if (_masterDeskReturnContext) {
              e.preventDefault();
              e.stopPropagation();
              cancelMasterDeskReturn();
            }
          } else if (e.key === 'Escape') {
            if (_masterDeskReturnContext) {
              e.preventDefault();
              e.stopPropagation();
              cancelMasterDeskReturn();
            }
          }
        });
      }

      _masterCustomerRowState[0] = newCustomerRowState();
      wireCustomerRowInputs(0);
      refreshCustomerAddRowBtn();

      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const notify = (msg, type) => {
            if (typeof showToast === 'function') showToast(msg, type);
            else alert(msg);
          };

          // Check the active row's Alternate Names (the ones currently on screen)
          if (!validateMasterCustomerAliasesLive()) {
            notify('Please fix duplicate or invalid Alternate Name entries.', 'error');
            return;
          }
          captureActiveCustomerRow();

          const rowIdxs = [0, ..._masterCustomerExtraRowKeys];
          const formNamesSet = new Set();
          const rows = [];

          for (const idx of rowIdxs) {
            const rowNameInp = custRowNameInput(idx);
            const rowName = rowNameInp ? rowNameInp.value.trim() : '';
            const st = _masterCustomerRowState[idx] || newCustomerRowState();

            if (!rowName) {
              // A trailing row left empty is just unfilled — it's skipped, not an error
              if (idx !== 0) continue;
              notify('Please enter a customer name.', 'warning');
              if (rowNameInp) rowNameInp.focus();
              return;
            }

            const nameErrText = validateCustomerRowNameLive(idx);
            if (nameErrText) {
              notify(nameErrText, 'error');
              if (rowNameInp) rowNameInp.focus();
              return;
            }

            const nameLower = rowName.toLowerCase();
            if (formNamesSet.has(nameLower)) {
              notify(`Duplicate entry "${rowName}" found in the form. Each customer name must be unique.`, 'error');
              if (rowNameInp) rowNameInp.focus();
              return;
            }
            formNamesSet.add(nameLower);

            const aliases = (st.aliases || []).map(a => a.trim()).filter(a => a !== '');
            for (const al of aliases) {
              const alLower = al.toLowerCase();
              if (formNamesSet.has(alLower)) {
                notify(`Duplicate entry "${al}" found in the form (Alternate Name of "${rowName}"). Names and Alternate Names must be unique.`, 'error');
                return;
              }
              formNamesSet.add(alLower);
              const dupAl = findDuplicateCoaNameOrAlias(al);
              if (dupAl) {
                const typeLabel = dupAl.parentName ? `Alias of "${dupAl.parentName}"` : dupAl.type;
                notify(`"${al}" (Alternate Name of "${rowName}") already exists (${typeLabel}).`, 'error');
                return;
              }
            }

            const balVal = (st.balance || '').toString().trim();
            rows.push({ name: rowName, aliases: aliases, openingBalance: balVal ? parseFloat(balVal) || 0 : 0, fields: st.fields });
          }

          // Save into Customer Directory (does NOT create separate CoA ledgers)
          const customers = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
          const created = rows.map((row, i) => {
            const val = (id) => (row.fields[id] || '').trim();
            const newCustomer = {
              id: 'cust-' + Date.now() + (i ? '-' + i : ''),
              name: row.name,
              aliases: row.aliases,
              openingBalance: row.openingBalance,
              contactName: val('masterCustomerContactName'),
              address: val('masterCustomerAddress'),
              city: val('masterCustomerCity'),
              pincode: val('masterCustomerPincode'),
              state: val('masterCustomerState'),
              country: val('masterCustomerCountry'),
              bankName: val('masterCustomerBankName'),
              accountNo: val('masterCustomerAccountNo'),
              ifsc: val('masterCustomerIfsc'),
              branch: val('masterCustomerBranch'),
              gstin: val('masterCustomerGstin'),
              pan: val('masterCustomerPan'),
              createdAt: Date.now()
            };
            customers.push(newCustomer);
            return newCustomer;
          });

          // Ensure central Trade Receivables ledger exists in CoA and update combined balance
          if (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) {
            let trLedger = coaLedgers.find(l => l.type === 'ledger' && l.sgId === 'sg-tr' && l.name === 'Trade Receivables');
            if (!trLedger) {
              trLedger = { id: 104, name: 'Trade Receivables', sgId: 'sg-tr', type: 'ledger', openingBalance: 0 };
              coaLedgers.push(trLedger);
            }
            trLedger.openingBalance = customers.reduce((sum, c) => sum + (parseFloat(c.openingBalance) || 0), 0);
          }

          if (typeof _coaExpanded !== 'undefined') {
            _coaExpanded.add('assets');
            _coaExpanded.add('sg-tr');
          }

          if (typeof renderChartPanel === 'function') renderChartPanel();
          if (typeof refreshAllReports === 'function') refreshAllReports();
          if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
          if (typeof populateSalesCustomers === 'function') populateSalesCustomers();

          if (created.length > 1) {
            notify(`${created.length} customers created successfully (linked to Trade Receivables).`, 'success');
          } else {
            notify(`Customer "${created[0].name}" created successfully (linked to Trade Receivables).`, 'success');
          }

          _masterCustomerAliases = [];
          const firstCustomer = created[0];

          if (_masterDeskReturnContext && _masterDeskReturnContext.returnTab === 'sales_voucher') {
            _masterDeskReturnContext = null;
            if (typeof closeTab === 'function') closeTab('master_desk', null, 'sales_voucher');
            else if (typeof window.closeTab === 'function') window.closeTab('master_desk', null, 'sales_voucher');
            if (typeof openTab === 'function') openTab('sales_voucher');
            else if (typeof window.openTab === 'function') window.openTab('sales_voucher');
            if (typeof window.onPartyCreatedForSales === 'function') {
              window.onPartyCreatedForSales(firstCustomer, 'customer');
            }
            return;
          }

          if (_masterDeskReturnContext && _masterDeskReturnContext.returnTab === 'cashline') {
            const ctx = _masterDeskReturnContext;
            _masterDeskReturnContext = null;
            if (typeof closeTab === 'function') closeTab('master_desk', null, 'cashline');
            else if (typeof window.closeTab === 'function') window.closeTab('master_desk', null, 'cashline');
            if (typeof openTab === 'function') openTab('cashline');
            else if (typeof window.openTab === 'function') window.openTab('cashline');
            if (typeof window.onPartyCreatedForCashline === 'function') {
              window.onPartyCreatedForCashline(firstCustomer, 'customer', ctx);
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
      _masterSupplierRowState = {};
      _masterSupplierActiveRowIdx = 0;
      _masterSupplierExtraRowKeys = [];
      _masterSupplierExtraRowSeq = 0;

      const suppDustbinSvg = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18"/>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>`;

      // One "Name" row of the Create Supplier form. idx 0 is the first row (ids without a
      // suffix, with a "clean" dustbin); rows added with "Add Another Supplier" get a
      // numeric suffix and a "remove" dustbin — same look as Create Group / Ledger rows.
      const buildSupplierRowHtml = (idx) => {
        const sfx = idx ? String(idx) : '';
        const btnClass = idx ? 'master-supplier-row-remove' : 'master-supplier-row-clean';
        const btnId = idx ? '' : 'id="masterSupplierRowCleanBtn"';
        const btnTitle = idx ? 'Remove this supplier' : 'Clean this supplier';
        return `
          <div class="master-supplier-row" data-row-index="${idx}" style="display: grid; grid-template-columns: minmax(0, 1fr) 38px; gap: 14px; margin-bottom: 16px;">
            <div>
              <label class="coa-modal-label" for="masterSupplierName${sfx}" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Name *</label>
              <input class="coa-modal-inp" id="masterSupplierName${sfx}" placeholder="Enter Name" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box;">
              <div id="masterSupplierName${sfx}Error" style="display: none; font-size: 12px; font-weight: 600; color: #dc2626; margin-top: 5px;"></div>
            </div>
            <div>
              <label style="font-size: 13px; margin-bottom: 6px; display: block; visibility: hidden; user-select: none;">&nbsp;</label>
              <button type="button" class="${btnClass}" ${btnId} data-row-index="${idx}" title="${btnTitle}" style="width: 38px; height: 38px; min-width: 38px; display: inline-flex; align-items: center; justify-content: center; padding: 0; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #ffffff; color: var(--slate-400); cursor: pointer; transition: all 0.15s ease;">
                ${suppDustbinSvg}
              </button>
            </div>
          </div>
        `;
      };

      const suppInpStyle = 'padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;';

      contentArea.innerHTML = `
        <div style="display: grid; grid-template-columns: minmax(0, 620px) 1fr; gap: 20px; align-items: start;">
          <div class="coa-modal-card" style="max-width: 620px; box-shadow: none; border: 1.5px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--slate-50); margin: 0;">
            ${buildSupplierRowHtml(0)}

            <!-- Additional suppliers (added row-by-row via the Add button, like Create Group) -->
            <div id="masterSupplierExtraRowsContainer"></div>

            <!-- Add another supplier — shown once the last row's Name is filled in -->
            <div id="masterSupplierAddRowWrap" style="display: none; margin: -4px 0 16px 0;">
              <button type="button" id="masterSupplierAddRowBtn" title="Add another supplier" style="display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 6px 14px; font-size: 12.5px; font-weight: 600; color: var(--blue-600); background: #ffffff; border: 1.5px dashed var(--blue-600); border-radius: 8px; cursor: pointer; transition: all 0.15s ease;">＋ Add Another Supplier</button>
            </div>

            <div style="display: flex; gap: 12px; align-items: center;">
              <button class="btn btn-primary" id="masterSupplierSaveBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Create Supplier</button>
              <button class="btn btn-secondary" id="masterSupplierCancelBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Cancel</button>
            </div>
          </div>

          <!-- Second box: Opening Balance, Additional Details, then Alternate Names once Name is filled in -->
          <div class="coa-modal-card" id="masterSupplierSidePanel" style="box-shadow: none; border: 1.5px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--slate-50); margin: 0;">
            <label class="coa-modal-label" for="masterSupplierBalance" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Opening Balance</label>
            <input class="coa-modal-inp" id="masterSupplierBalance" type="number" min="0" step="0.01" placeholder="0.00" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box;">

            <div style="margin-top: 16px;">
              <button type="button" class="btn btn-secondary" id="masterSupplierAddlBtn" style="width: 100%; height: 38px; justify-content: center; padding: 8px 16px; font-size: 13px; font-weight: 600; border-radius: 8px;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                Additional Details
              </button>
            </div>

            <!-- Alternate Name — one box per alias, auto-adding another below as you type (no limit) -->
            <div id="masterSupplierAkaPanel" style="display: none; margin-top: 16px;">
              <label class="coa-modal-label" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Alternate Name</label>
              <div id="masterSupplierAliasesContainer" style="display: flex; flex-direction: column; gap: 10px;"></div>
            </div>
          </div>
        </div>

        <!-- Additional Details popup (Name & Address, Bank Information, GSTIN & PAN) -->
        <style>
          /* Popup fields fill their grid column instead of overflowing it on narrow screens */
          #masterSupplierAddlModal .master-supplier-addl-body input:not([type=hidden]):not([type=file]),
          #masterSupplierAddlModal .master-supplier-addl-body textarea { width: 100%; min-width: 0; box-sizing: border-box; }
        </style>
        <div class="oh-modal-overlay" id="masterSupplierAddlModal" style="display: none;">
          <div style="background: var(--white); border-radius: 14px; width: 94%; max-width: 640px; max-height: 88vh; display: flex; flex-direction: column; box-shadow: 0 40px 100px rgba(0,0,0,.24);">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px 24px; border-bottom: 1px solid var(--slate-200);">
              <div style="min-width: 0;">
                <div style="font-size: 15px; font-weight: 700; color: var(--slate-800);">Additional Details</div>
                <div id="masterSupplierAddlModalSub" style="font-size: 12.5px; color: var(--slate-500); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"></div>
              </div>
              <button type="button" class="oh-modal-close" id="masterSupplierAddlCloseBtn" title="Close">✕</button>
            </div>

            <div class="master-supplier-addl-body" style="padding: 20px 24px; overflow-y: auto; overflow-x: hidden;">
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
                  <input type="text" id="masterSupplierContactName" placeholder="Enter Contact Person" style="${suppInpStyle}">
                  <textarea id="masterSupplierAddress" placeholder="Enter Address" rows="2" style="${suppInpStyle} resize: vertical; font-family: inherit;"></textarea>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <input type="text" id="masterSupplierCity" placeholder="Enter City" style="${suppInpStyle}">
                    <input type="text" id="masterSupplierPincode" placeholder="Enter PIN Code" style="${suppInpStyle}">
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <input type="text" id="masterSupplierState" placeholder="Enter State" style="${suppInpStyle}">
                    <input type="text" id="masterSupplierCountry" placeholder="Enter Country" value="India" style="${suppInpStyle}">
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
                    <input type="text" id="masterSupplierBankName" placeholder="Enter Bank Name" style="${suppInpStyle}">
                    <input type="text" id="masterSupplierAccountNo" placeholder="Enter Account Number" style="${suppInpStyle}">
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <input type="text" id="masterSupplierIfsc" placeholder="Enter IFSC Code" style="${suppInpStyle} text-transform: uppercase;">
                    <input type="text" id="masterSupplierBranch" placeholder="Enter Branch" style="${suppInpStyle}">
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
                  <input type="text" id="masterSupplierGstin" placeholder="Enter GSTIN" maxlength="15" style="${suppInpStyle} text-transform: uppercase;">
                  <input type="text" id="masterSupplierPan" placeholder="Enter PAN" maxlength="10" style="${suppInpStyle} text-transform: uppercase;">
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; padding: 14px 24px; border-top: 1px solid var(--slate-200);">
              <button type="button" class="btn btn-primary" id="masterSupplierAddlDoneBtn" style="height: 38px; padding: 8px 18px; font-size: 13px; font-weight: 600;">Done</button>
            </div>
          </div>
        </div>
      `;

      renderMasterSupplierAliases();

      // GSTIN / PAN live validity check + Update-PAN-from-GSTIN (matches Company Profile & Vault)
      wireGstinPanValidation(contentArea, 'masterSupplierGstin', 'masterSupplierPan');
      const ifscInp = contentArea.querySelector('#masterSupplierIfsc');
      if (ifscInp) {
        ifscInp.addEventListener('input', (e) => {
          e.target.value = e.target.value.toUpperCase();
        });
      }

      const saveBtn = contentArea.querySelector('#masterSupplierSaveBtn');
      const cancelBtn = contentArea.querySelector('#masterSupplierCancelBtn');
      const nameInp = contentArea.querySelector('#masterSupplierName');
      const suppBalanceInp = contentArea.querySelector('#masterSupplierBalance');
      const extraCustRowsContainer = contentArea.querySelector('#masterSupplierExtraRowsContainer');
      const suppAddRowWrap = contentArea.querySelector('#masterSupplierAddRowWrap');
      const suppAddRowBtn = contentArea.querySelector('#masterSupplierAddRowBtn');

      const suppRowNameInput = (idx) => contentArea.querySelector('#masterSupplierName' + (idx ? idx : ''));
      const activeCustNameInp = () => suppRowNameInput(_masterSupplierActiveRowIdx || 0);

      // ── Additional Details popup ──
      const suppAddlModal = contentArea.querySelector('#masterSupplierAddlModal');
      const suppAddlModalSub = contentArea.querySelector('#masterSupplierAddlModalSub');
      const openSupplierAddlModal = () => {
        if (!suppAddlModal) return;
        if (suppAddlModalSub) {
          const inp = activeCustNameInp();
          const nameVal = inp ? inp.value.trim() : '';
          suppAddlModalSub.textContent = nameVal ? `${nameVal} · Trade Payables` : 'Trade Payables';
        }
        suppAddlModal.style.display = 'flex';
      };
      const closeSupplierAddlModal = () => {
        if (suppAddlModal) suppAddlModal.style.display = 'none';
      };
      const suppAddlBtn = contentArea.querySelector('#masterSupplierAddlBtn');
      if (suppAddlBtn) suppAddlBtn.addEventListener('click', openSupplierAddlModal);
      ['#masterSupplierAddlCloseBtn', '#masterSupplierAddlDoneBtn'].forEach(sel => {
        const btn = contentArea.querySelector(sel);
        if (btn) btn.addEventListener('click', closeSupplierAddlModal);
      });
      if (suppAddlModal) {
        // Click on the dimmed backdrop (outside the card) closes the popup
        suppAddlModal.addEventListener('mousedown', (e) => {
          if (e.target === suppAddlModal) closeSupplierAddlModal();
        });
        suppAddlModal.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            closeSupplierAddlModal();
          }
        });
      }

      // ── Per-row state (like Create Ledger): the side box and popup always show the
      // active row; other rows' values are parked in _masterSupplierRowState ──
      const SUPPLIER_ADDL_FIELD_DEFAULTS = {
        masterSupplierContactName: '', masterSupplierAddress: '', masterSupplierCity: '', masterSupplierPincode: '',
        masterSupplierState: '', masterSupplierCountry: 'India',
        masterSupplierBankName: '', masterSupplierAccountNo: '', masterSupplierIfsc: '', masterSupplierBranch: '',
        masterSupplierGstin: '', masterSupplierPan: ''
      };
      const newSupplierRowState = () => ({
        aliases: [],
        balance: '',
        fields: Object.assign({}, SUPPLIER_ADDL_FIELD_DEFAULTS)
      });

      const captureActiveSupplierRow = () => {
        if (_masterSupplierActiveRowIdx === null) return;
        const st = _masterSupplierRowState[_masterSupplierActiveRowIdx] || newSupplierRowState();
        st.aliases = _masterSupplierAliases;
        st.balance = suppBalanceInp ? suppBalanceInp.value : '';
        Object.keys(SUPPLIER_ADDL_FIELD_DEFAULTS).forEach(id => {
          const el = contentArea.querySelector('#' + id);
          if (el) st.fields[id] = el.value;
        });
        _masterSupplierRowState[_masterSupplierActiveRowIdx] = st;
      };

      const loadSupplierRowState = (idx) => {
        const st = _masterSupplierRowState[idx] || newSupplierRowState();
        _masterSupplierRowState[idx] = st;
        if (suppBalanceInp) suppBalanceInp.value = st.balance;
        Object.keys(SUPPLIER_ADDL_FIELD_DEFAULTS).forEach(id => {
          const el = contentArea.querySelector('#' + id);
          if (el) el.value = st.fields[id] !== undefined ? st.fields[id] : SUPPLIER_ADDL_FIELD_DEFAULTS[id];
        });
        // Refresh the GSTIN / PAN validity hints for the loaded values
        ['#masterSupplierGstin', '#masterSupplierPan'].forEach(sel => {
          const el = contentArea.querySelector(sel);
          if (el) el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        _masterSupplierAliases = st.aliases;
      };

      // Shows / hides the Alternate Name boxes for the active row based on its Name
      const syncSupplierAkaPanel = () => {
        const inp = activeCustNameInp();
        const nameVal = inp ? inp.value.trim() : '';
        const akaPanel = contentArea.querySelector('#masterSupplierAkaPanel');
        if (!nameVal) {
          if (akaPanel) akaPanel.style.display = 'none';
          if (_masterSupplierAliases.every(a => a.trim() === '')) {
            _masterSupplierAliases = [];
            renderMasterSupplierAliases();
          }
          return;
        }
        validateMasterSupplierAliasesLive();
        if (_masterSupplierAliases.length === 0) {
          _masterSupplierAliases.push('');
          renderMasterSupplierAliases();
        } else if (akaPanel) {
          akaPanel.style.display = 'block';
        }
      };

      const setActiveSupplierRow = (idx) => {
        if (idx === _masterSupplierActiveRowIdx) return;
        captureActiveSupplierRow();
        _masterSupplierActiveRowIdx = idx;
        loadSupplierRowState(idx);
        renderMasterSupplierAliases();
        syncSupplierAkaPanel();
      };

      // Live "already exists" check for a row's Name (row 0 is the first row)
      const validateSupplierRowNameLive = (idx) => {
        const inp = suppRowNameInput(idx);
        const err = contentArea.querySelector('#masterSupplierName' + (idx ? idx : '') + 'Error');
        const val = inp ? inp.value.trim() : '';
        const setErr = (text) => {
          if (err) { err.textContent = text || ''; err.style.display = text ? 'block' : 'none'; }
          if (inp) inp.style.borderColor = text ? '#ef4444' : 'var(--slate-200)';
        };
        if (!val) {
          setErr('');
          return null;
        }
        const dup = findDuplicateCoaNameOrAlias(val);
        if (dup) {
          const typeLabel = dup.parentName ? `Alias of "${dup.parentName}"` : dup.type;
          const errorText = `"${val}" already exists (${typeLabel}).`;
          setErr(errorText);
          return errorText;
        }
        setErr('');
        return null;
      };

      // Supplier count (1, 2, 3...) in the right corner of the Back bar
      const renderSupplierCount = () => {
        const countWrap = document.getElementById('masterDeskBackBarGroupCount');
        if (!countWrap) return;
        const count = 1 + _masterSupplierExtraRowKeys.length;
        countWrap.innerHTML = `<span title="Suppliers in this form" style="height: 34px; min-width: 34px; padding: 0 12px; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; border-radius: 6px; background: var(--white); border: 1px solid var(--slate-200); color: var(--slate-600); font-family: var(--font-main); font-size: 12.5px; font-weight: 600;">${count}</span>`;
      };

      // Shows the "Add Another Supplier" button only when the last row's Name has a value.
      const refreshSupplierAddRowBtn = () => {
        renderSupplierCount();
        if (!suppAddRowWrap) return;
        const lastIdx = _masterSupplierExtraRowKeys.length ? _masterSupplierExtraRowKeys[_masterSupplierExtraRowKeys.length - 1] : 0;
        const lastInp = suppRowNameInput(lastIdx);
        suppAddRowWrap.style.display = lastInp && lastInp.value.trim() ? 'block' : 'none';
      };

      const wireSupplierDustbinHover = (btn) => {
        btn.addEventListener('mouseenter', () => {
          btn.style.background = '#fef2f2';
          btn.style.color = '#dc2626';
          btn.style.borderColor = '#fecaca';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.background = '#ffffff';
          btn.style.color = 'var(--slate-400)';
          btn.style.borderColor = 'var(--slate-200)';
        });
      };

      const wireSupplierRowRemoveBtn = (idx) => {
        const btn = extraCustRowsContainer.querySelector('.master-supplier-row-remove[data-row-index="' + idx + '"]');
        if (!btn) return;
        wireSupplierDustbinHover(btn);
        btn.addEventListener('click', () => {
          const rowEl = extraCustRowsContainer.querySelector('.master-supplier-row[data-row-index="' + idx + '"]');
          if (rowEl) rowEl.remove();
          const pos = _masterSupplierExtraRowKeys.indexOf(idx);
          const prevIdx = pos > 0 ? _masterSupplierExtraRowKeys[pos - 1] : 0;
          _masterSupplierExtraRowKeys = _masterSupplierExtraRowKeys.filter(k => k !== idx);
          delete _masterSupplierRowState[idx];
          if (_masterSupplierActiveRowIdx === idx) {
            // Removed row's values go with it — switch the side box to the row above
            _masterSupplierActiveRowIdx = null;
            setActiveSupplierRow(prevIdx);
            const prevInp = suppRowNameInput(prevIdx);
            if (prevInp) prevInp.focus();
          } else {
            validateMasterSupplierAliasesLive();
          }
          refreshSupplierAddRowBtn();
        });
      };

      const wireSupplierRowInputs = (idx) => {
        const rowNameInp = suppRowNameInput(idx);
        if (!rowNameInp) return;
        rowNameInp.addEventListener('focus', () => setActiveSupplierRow(idx));
        rowNameInp.addEventListener('input', () => {
          setActiveSupplierRow(idx);
          validateSupplierRowNameLive(idx);
          syncSupplierAkaPanel();
          refreshSupplierAddRowBtn();
        });
      };

      const addNextSupplierRow = () => {
        _masterSupplierExtraRowSeq++;
        const idx = _masterSupplierExtraRowSeq;
        extraCustRowsContainer.insertAdjacentHTML('beforeend', buildSupplierRowHtml(idx));
        _masterSupplierRowState[idx] = newSupplierRowState();
        wireSupplierRowInputs(idx);
        wireSupplierRowRemoveBtn(idx);
        _masterSupplierExtraRowKeys.push(idx);
        refreshSupplierAddRowBtn();
        const newNameInp = suppRowNameInput(idx);
        if (newNameInp) {
          newNameInp.focus();
          setActiveSupplierRow(idx);
        }
      };

      if (suppAddRowBtn) {
        suppAddRowBtn.addEventListener('mouseenter', () => { suppAddRowBtn.style.background = 'var(--blue-50, #eff6ff)'; });
        suppAddRowBtn.addEventListener('mouseleave', () => { suppAddRowBtn.style.background = '#ffffff'; });
        suppAddRowBtn.addEventListener('click', addNextSupplierRow);
      }

      // First row's dustbin: with more rows below, removes this supplier and moves the next
      // row (Name and its side-box values) up; on its own, just clears it.
      const suppCleanBtn = contentArea.querySelector('#masterSupplierRowCleanBtn');
      if (suppCleanBtn) {
        wireSupplierDustbinHover(suppCleanBtn);
        suppCleanBtn.addEventListener('click', () => {
          captureActiveSupplierRow();
          if (_masterSupplierExtraRowKeys.length > 0) {
            const nextIdx = _masterSupplierExtraRowKeys[0];
            const nextNameInp = suppRowNameInput(nextIdx);
            if (nameInp) nameInp.value = nextNameInp ? nextNameInp.value : '';
            _masterSupplierRowState[0] = _masterSupplierRowState[nextIdx] || newSupplierRowState();
            delete _masterSupplierRowState[nextIdx];
            const nextRowEl = extraCustRowsContainer.querySelector('.master-supplier-row[data-row-index="' + nextIdx + '"]');
            if (nextRowEl) nextRowEl.remove();
            _masterSupplierExtraRowKeys = _masterSupplierExtraRowKeys.slice(1);
          } else {
            if (nameInp) nameInp.value = '';
            _masterSupplierRowState[0] = newSupplierRowState();
          }
          _masterSupplierActiveRowIdx = null;
          setActiveSupplierRow(0);
          validateSupplierRowNameLive(0);
          refreshSupplierAddRowBtn();
          if (nameInp) nameInp.focus();
        });
      }

      if (nameInp) {
        nameInp.addEventListener('keydown', (e) => {
          if (e.key === 'Backspace' && (!nameInp.value || nameInp.value.trim() === '')) {
            if (_masterDeskReturnContext) {
              e.preventDefault();
              e.stopPropagation();
              cancelMasterDeskReturn();
            }
          } else if (e.key === 'Escape') {
            if (_masterDeskReturnContext) {
              e.preventDefault();
              e.stopPropagation();
              cancelMasterDeskReturn();
            }
          }
        });
      }

      _masterSupplierRowState[0] = newSupplierRowState();
      wireSupplierRowInputs(0);
      refreshSupplierAddRowBtn();

      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const notify = (msg, type) => {
            if (typeof showToast === 'function') showToast(msg, type);
            else alert(msg);
          };

          // Check the active row's Alternate Names (the ones currently on screen)
          if (!validateMasterSupplierAliasesLive()) {
            notify('Please fix duplicate or invalid Alternate Name entries.', 'error');
            return;
          }
          captureActiveSupplierRow();

          const rowIdxs = [0, ..._masterSupplierExtraRowKeys];
          const formNamesSet = new Set();
          const rows = [];

          for (const idx of rowIdxs) {
            const rowNameInp = suppRowNameInput(idx);
            const rowName = rowNameInp ? rowNameInp.value.trim() : '';
            const st = _masterSupplierRowState[idx] || newSupplierRowState();

            if (!rowName) {
              // A trailing row left empty is just unfilled — it's skipped, not an error
              if (idx !== 0) continue;
              notify('Please enter a supplier name.', 'warning');
              if (rowNameInp) rowNameInp.focus();
              return;
            }

            const nameErrText = validateSupplierRowNameLive(idx);
            if (nameErrText) {
              notify(nameErrText, 'error');
              if (rowNameInp) rowNameInp.focus();
              return;
            }

            const nameLower = rowName.toLowerCase();
            if (formNamesSet.has(nameLower)) {
              notify(`Duplicate entry "${rowName}" found in the form. Each supplier name must be unique.`, 'error');
              if (rowNameInp) rowNameInp.focus();
              return;
            }
            formNamesSet.add(nameLower);

            const aliases = (st.aliases || []).map(a => a.trim()).filter(a => a !== '');
            for (const al of aliases) {
              const alLower = al.toLowerCase();
              if (formNamesSet.has(alLower)) {
                notify(`Duplicate entry "${al}" found in the form (Alternate Name of "${rowName}"). Names and Alternate Names must be unique.`, 'error');
                return;
              }
              formNamesSet.add(alLower);
              const dupAl = findDuplicateCoaNameOrAlias(al);
              if (dupAl) {
                const typeLabel = dupAl.parentName ? `Alias of "${dupAl.parentName}"` : dupAl.type;
                notify(`"${al}" (Alternate Name of "${rowName}") already exists (${typeLabel}).`, 'error');
                return;
              }
            }

            const balVal = (st.balance || '').toString().trim();
            rows.push({ name: rowName, aliases: aliases, openingBalance: balVal ? parseFloat(balVal) || 0 : 0, fields: st.fields });
          }

          // Save into Supplier Directory (does NOT create separate CoA ledgers)
          const suppliers = typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : [];
          const created = rows.map((row, i) => {
            const val = (id) => (row.fields[id] || '').trim();
            const newSupplier = {
              id: 'supp-' + Date.now() + (i ? '-' + i : ''),
              name: row.name,
              aliases: row.aliases,
              openingBalance: row.openingBalance,
              contactName: val('masterSupplierContactName'),
              address: val('masterSupplierAddress'),
              city: val('masterSupplierCity'),
              pincode: val('masterSupplierPincode'),
              state: val('masterSupplierState'),
              country: val('masterSupplierCountry'),
              bankName: val('masterSupplierBankName'),
              accountNo: val('masterSupplierAccountNo'),
              ifsc: val('masterSupplierIfsc'),
              branch: val('masterSupplierBranch'),
              gstin: val('masterSupplierGstin'),
              pan: val('masterSupplierPan'),
              createdAt: Date.now()
            };
            suppliers.push(newSupplier);
            return newSupplier;
          });

          // Ensure central Trade Payables ledger exists in CoA and update combined balance
          if (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) {
            let tpLedger = coaLedgers.find(l => l.type === 'ledger' && l.sgId === 'sg-tp' && l.name === 'Trade Payables');
            if (!tpLedger) {
              tpLedger = { id: 125, name: 'Trade Payables', sgId: 'sg-tp', type: 'ledger', openingBalance: 0 };
              coaLedgers.push(tpLedger);
            }
            tpLedger.openingBalance = suppliers.reduce((sum, c) => sum + (parseFloat(c.openingBalance) || 0), 0);
          }

          if (typeof _coaExpanded !== 'undefined') {
            _coaExpanded.add('equity-liabilities');
            _coaExpanded.add('sg-tp');
          }

          if (typeof renderChartPanel === 'function') renderChartPanel();
          if (typeof refreshAllReports === 'function') refreshAllReports();
          if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
          if (typeof populatePurchaseVendors === 'function') populatePurchaseVendors();

          if (created.length > 1) {
            notify(`${created.length} suppliers created successfully (linked to Trade Payables).`, 'success');
          } else {
            notify(`Supplier "${created[0].name}" created successfully (linked to Trade Payables).`, 'success');
          }

          _masterSupplierAliases = [];
          const firstSupplier = created[0];

          if (_masterDeskReturnContext && _masterDeskReturnContext.returnTab === 'purchase_voucher') {
            _masterDeskReturnContext = null;
            if (typeof closeTab === 'function') closeTab('master_desk', null, 'purchase_voucher');
            else if (typeof window.closeTab === 'function') window.closeTab('master_desk', null, 'purchase_voucher');
            if (typeof openTab === 'function') openTab('purchase_voucher');
            else if (typeof window.openTab === 'function') window.openTab('purchase_voucher');
            if (typeof window.onPartyCreatedForPurchase === 'function') {
              window.onPartyCreatedForPurchase(firstSupplier, 'supplier');
            }
            return;
          }

          if (_masterDeskReturnContext && _masterDeskReturnContext.returnTab === 'cashline') {
            const ctx = _masterDeskReturnContext;
            _masterDeskReturnContext = null;
            if (typeof closeTab === 'function') closeTab('master_desk', null, 'cashline');
            else if (typeof window.closeTab === 'function') window.closeTab('master_desk', null, 'cashline');
            if (typeof openTab === 'function') openTab('cashline');
            else if (typeof window.openTab === 'function') window.openTab('cashline');
            if (typeof window.onPartyCreatedForCashline === 'function') {
              window.onPartyCreatedForCashline(firstSupplier, 'supplier', ctx);
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

          <!-- HSN Code & Description (searchable, cross-fill) -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
            <div style="min-width: 0;">
              <label class="coa-modal-label" for="masterStockItemHsnCode" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">HSN Code</label>
              <div class="kya-searchable-select-wrap" id="masterStockItemHsnCodeWrap" style="position: relative; width: 100%;">
                <input type="hidden" id="masterStockItemHsnCode" value="">
                <div class="kya-searchable-select-trigger" id="masterStockItemHsnCodeTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-400);">
                  <span id="masterStockItemHsnCodeTriggerText" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Search HSN code...</span>
                  <span style="font-size: 10px; color: var(--slate-400); flex-shrink: 0; margin-left: 6px;">▼</span>
                </div>
                <div class="kya-searchable-select-dropdown" id="masterStockItemHsnCodeDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg, 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                  <input type="text" id="masterStockItemHsnCodeSearch" placeholder="Search by HSN code..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                  <div id="masterStockItemHsnCodeOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                </div>
              </div>
            </div>
            <div style="min-width: 0;">
              <label class="coa-modal-label" for="masterStockItemHsnDesc" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">HSN Description</label>
              <div style="position: relative; width: 100%; min-width: 0;">
                <input type="hidden" id="masterStockItemHsnDesc" value="">
                <div id="masterStockItemHsnDescTrigger" style="display: flex; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #f8fafc; cursor: default; font-size: 13.5px; font-weight: 500; color: var(--slate-400); overflow: hidden;">
                  <span id="masterStockItemHsnDescTriggerText" style="display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; flex: 1 1 auto;">Auto-filled from HSN Code</span>
                </div>
              </div>
            </div>
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
      wireHsnCodeDescFields(contentArea, 'masterStockItemHsnCode', 'masterStockItemHsnDesc');

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
          const hsnCode = contentArea.querySelector('#masterStockItemHsnCode')?.value?.trim() || '';
          const hsnDesc = contentArea.querySelector('#masterStockItemHsnDesc')?.value?.trim() || '';

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
            hsnCode: hsnCode,
            hsnDesc: hsnDesc,
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

            <!-- Additional Information (Dynamic for Revenue from Operations group) -->
            <div id="masterAlterLedgerSacWrap" style="display: none; background: #f8fafc; border: 1.5px solid var(--slate-200); border-radius: 10px; padding: 18px; margin-bottom: 24px; transition: all 0.2s ease;">
              <div style="font-size: 13.5px; font-weight: 700; color: var(--slate-800); margin-bottom: 14px; display: flex; align-items: center; gap: 7px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                <span>Additional Information</span>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
                <div style="min-width: 0;">
                  <label style="font-size: 11.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 4px; display: block;">SAC Code</label>
                  <div class="kya-searchable-select-wrap" id="masterAlterLedgerSacCodeWrap" style="position: relative; width: 100%;">
                    <input type="hidden" id="masterAlterLedgerSacCode" value="${escapeHtml(currentLedger.sacInfo?.sacCode || '')}">
                    <div class="kya-searchable-select-trigger" id="masterAlterLedgerSacCodeTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border: 1.5px solid var(--slate-200); border-radius: 7px; background: #fff; cursor: pointer; font-size: 13px; font-weight: 500; color: ${currentLedger.sacInfo?.sacCode ? 'var(--slate-700)' : 'var(--slate-400)'};">
                      <span id="masterAlterLedgerSacCodeTriggerText">${escapeHtml(currentLedger.sacInfo?.sacCode || 'Search or select SAC code...')}</span>
                      <span style="font-size: 10px; color: var(--slate-400);">▼</span>
                    </div>
                    <div class="kya-searchable-select-dropdown" id="masterAlterLedgerSacCodeDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                      <input type="text" id="masterAlterLedgerSacCodeSearch" placeholder="Search by SAC code..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                      <div id="masterAlterLedgerSacCodeOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                    </div>
                  </div>
                </div>
                <div style="min-width: 0;">
                  <label style="font-size: 11.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 4px; display: block;">SAC Description</label>
                  <div style="position: relative; width: 100%; min-width: 0;">
                    <input type="hidden" id="masterAlterLedgerSacDesc" value="${escapeHtml(currentLedger.sacInfo?.sacDesc || '')}">
                    <div id="masterAlterLedgerSacDescTrigger" style="display: flex; align-items: center; padding: 8px 12px; border: 1.5px solid var(--slate-200); border-radius: 7px; background: #fff; cursor: default; font-size: 13px; font-weight: 500; color: ${currentLedger.sacInfo?.sacDesc ? 'var(--slate-700)' : 'var(--slate-400)'}; overflow: hidden;">
                      <span id="masterAlterLedgerSacDescTriggerText" style="display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; flex: 1 1 auto;">${escapeHtml(currentLedger.sacInfo?.sacDesc || 'Auto-filled from SAC Code')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label style="font-size: 11.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 4px; display: block;">Rate</label>
                  <input type="number" min="0" step="0.01" id="masterAlterLedgerSacRate" value="${currentLedger.sacInfo?.rate || ''}" placeholder="0.00" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                </div>
                <div>
                  <label style="font-size: 11.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 4px; display: block;">GST / Tax Rate (%)</label>
                  <select id="masterAlterLedgerSacGstSel" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 7px; border: 1.5px solid var(--slate-200); box-sizing: border-box; outline: none; background: #fff;">
                    <option value="0" ${(currentLedger.sacInfo?.gstRate === 0) ? 'selected' : ''}>0% (Nil / Exempt)</option>
                    <option value="5" ${(currentLedger.sacInfo?.gstRate === 5) ? 'selected' : ''}>5% GST</option>
                    <option value="12" ${(currentLedger.sacInfo?.gstRate === 12) ? 'selected' : ''}>12% GST</option>
                    <option value="18" ${(!currentLedger.sacInfo || currentLedger.sacInfo.gstRate === 18) ? 'selected' : ''}>18% GST</option>
                    <option value="28" ${(currentLedger.sacInfo?.gstRate === 28) ? 'selected' : ''}>28% GST</option>
                  </select>
                </div>
              </div>
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
        const sacWrap = contentArea.querySelector('#masterAlterLedgerSacWrap');
        const updateAdditionalInfoVisibility = () => {
          if (!groupSel || !addInfoWrap) return;
          const isParty = isTradePartyGroup(groupSel.value);
          addInfoWrap.style.display = isParty ? 'block' : 'none';

          if (sacWrap) {
            sacWrap.style.display = isRevenueFromOperationsGroup(groupSel.value) ? 'block' : 'none';
          }
        };

        if (groupSel) {
          groupSel.addEventListener('change', updateAdditionalInfoVisibility);
          updateAdditionalInfoVisibility();
        }

        wireGstinPanValidation(contentArea, 'masterAlterLedgerGstin', 'masterAlterLedgerPan');
        const ifscInp = contentArea.querySelector('#masterAlterLedgerIfsc');
        if (ifscInp) {
          ifscInp.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
          });
        }

        // Revenue from Operations group: searchable SAC Code -> Description
        wireSacCodeDescFields(contentArea, 'masterAlterLedgerSacCode', 'masterAlterLedgerSacDesc');

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

            const isRevenueOpsGroup = isRevenueFromOperationsGroup(groupVal);
            const sacInfo = isRevenueOpsGroup ? {
              sacCode: contentArea.querySelector('#masterAlterLedgerSacCode')?.value?.trim() || '',
              sacDesc: contentArea.querySelector('#masterAlterLedgerSacDesc')?.value?.trim() || '',
              rate: parseFloat(contentArea.querySelector('#masterAlterLedgerSacRate')?.value) || 0,
              gstRate: parseFloat(contentArea.querySelector('#masterAlterLedgerSacGstSel')?.value) || 0
            } : null;

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
            currentLedger.sacInfo = sacInfo;

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

        wireGstinPanValidation(contentArea, 'masterAlterCustomerGstin', 'masterAlterCustomerPan');
        const ifscInp = contentArea.querySelector('#masterAlterCustomerIfsc');
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

        wireGstinPanValidation(contentArea, 'masterAlterSupplierGstin', 'masterAlterSupplierPan');
        const ifscInp = contentArea.querySelector('#masterAlterSupplierIfsc');
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

            <!-- HSN Code & Description (searchable, cross-fill) -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
              <div style="min-width: 0;">
                <label class="coa-modal-label" for="masterAlterStockItemHsnCode" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">HSN Code</label>
                <div class="kya-searchable-select-wrap" id="masterAlterStockItemHsnCodeWrap" style="position: relative; width: 100%;">
                  <input type="hidden" id="masterAlterStockItemHsnCode" value="${escapeHtml(currentItem.hsnCode || '')}">
                  <div class="kya-searchable-select-trigger" id="masterAlterStockItemHsnCodeTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: ${currentItem.hsnCode ? 'var(--slate-700)' : 'var(--slate-400)'};">
                    <span id="masterAlterStockItemHsnCodeTriggerText" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(currentItem.hsnCode || 'Search HSN code...')}</span>
                    <span style="font-size: 10px; color: var(--slate-400); flex-shrink: 0; margin-left: 6px;">▼</span>
                  </div>
                  <div class="kya-searchable-select-dropdown" id="masterAlterStockItemHsnCodeDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg, 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                    <input type="text" id="masterAlterStockItemHsnCodeSearch" placeholder="Search by HSN code..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                    <div id="masterAlterStockItemHsnCodeOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                  </div>
                </div>
              </div>
              <div style="min-width: 0;">
                <label class="coa-modal-label" for="masterAlterStockItemHsnDesc" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">HSN Description</label>
                <div style="position: relative; width: 100%; min-width: 0;">
                  <input type="hidden" id="masterAlterStockItemHsnDesc" value="${escapeHtml(currentItem.hsnDesc || '')}">
                  <div id="masterAlterStockItemHsnDescTrigger" style="display: flex; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #f8fafc; cursor: default; font-size: 13.5px; font-weight: 500; color: ${currentItem.hsnDesc ? 'var(--slate-700)' : 'var(--slate-400)'}; overflow: hidden;">
                    <span id="masterAlterStockItemHsnDescTriggerText" style="display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; flex: 1 1 auto;">${escapeHtml(currentItem.hsnDesc || 'Auto-filled from HSN Code')}</span>
                  </div>
                </div>
              </div>
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
        wireHsnCodeDescFields(contentArea, 'masterAlterStockItemHsnCode', 'masterAlterStockItemHsnDesc');

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
            const hsnCode = contentArea.querySelector('#masterAlterStockItemHsnCode')?.value?.trim() || '';
            const hsnDesc = contentArea.querySelector('#masterAlterStockItemHsnDesc')?.value?.trim() || '';

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
            currentItem.hsnCode = hsnCode;
            currentItem.hsnDesc = hsnDesc;
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
          <div style="display: flex; align-items: center; gap: 10px;">
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
        </div>

        <div class="oh-layout" id="masterDeskLayoutContainer">
          <!-- Sub-tabs (Left side options cards) -->
          <div class="oh-sub-tabs" id="masterDeskSidebar" role="tablist" aria-label="Master Desk sections">
            <button class="oh-sub-tab active" id="masterTabOverview" role="tab" aria-selected="true">
              <div class="oh-tab-icon-wrap">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
                  <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
                  <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
                  <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
                </svg>
              </div>
              <span class="oh-tab-text">Overview</span>
            </button>

            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--slate-400); padding: 14px 12px 6px 12px; margin-top: 6px; border-top: 1px solid var(--slate-100);">Accounting Masters</div>

            <button class="oh-sub-tab" id="masterTabGroup" role="tab" aria-selected="false">
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
              <span class="oh-tab-text">Customer</span>
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
              <span class="oh-tab-text">Supplier</span>
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
          <div class="oh-content-area">
            <div id="masterDeskBackBar" style="display: none; justify-content: space-between; align-items: center; margin-bottom: 20px; background: var(--slate-50); border: 1.5px solid var(--slate-200); border-radius: 12px; padding: 12px 16px;">
              <div style="display: flex; gap: 10px; align-items: center;">
                <button class="btn btn-secondary" id="masterDeskBackBtn" type="button" style="height:34px; font-size:12.5px; padding: 0 14px; font-weight:600; cursor:pointer; border-radius:6px; display:inline-flex; align-items:center; gap:6px;">
                  ← Back
                </button>
                <button class="btn btn-secondary master-back-bar-nav" type="button" data-tab="group" style="height:34px; font-size:12.5px; padding: 0 14px; font-weight:600; cursor:pointer; border-radius:6px; display:inline-flex; align-items:center; gap:6px;">Group</button>
                <button class="btn btn-secondary master-back-bar-nav" type="button" data-tab="ledger" style="height:34px; font-size:12.5px; padding: 0 14px; font-weight:600; cursor:pointer; border-radius:6px; display:inline-flex; align-items:center; gap:6px;">Ledger</button>
                <button class="btn btn-secondary master-back-bar-nav" type="button" data-tab="customers" style="height:34px; font-size:12.5px; padding: 0 14px; font-weight:600; cursor:pointer; border-radius:6px; display:inline-flex; align-items:center; gap:6px;">Customer</button>
                <button class="btn btn-secondary master-back-bar-nav" type="button" data-tab="suppliers" style="height:34px; font-size:12.5px; padding: 0 14px; font-weight:600; cursor:pointer; border-radius:6px; display:inline-flex; align-items:center; gap:6px;">Supplier</button>
              </div>
              <div id="masterDeskBackBarGroupCount" style="display: flex; align-items: center;"></div>
            </div>
            <div id="masterDeskContentArea"></div>
          </div>
        </div>
      </div>
    `;

    const btnCreate = container.querySelector('#btnMasterCreate');
    const btnAlter = container.querySelector('#btnMasterAlter');
    const btnOverview = container.querySelector('#masterTabOverview');
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
    if (btnOverview) {
      btnOverview.addEventListener('click', () => setMasterDeskTab('overview'));
    }
    if (btnGroup) {
      btnGroup.addEventListener('click', () => setMasterDeskTab('group'));
    }
    const backBtn = container.querySelector('#masterDeskBackBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => setMasterDeskTab('overview'));
    }
    // Quick jumps to other Accounting Masters from the Back bar
    container.querySelectorAll('#masterDeskBackBar .master-back-bar-nav').forEach(btn => {
      btn.addEventListener('click', () => setMasterDeskTab(btn.getAttribute('data-tab')));
    });
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
      if (options.saveAs === 'customer' || options.saveAs === 'supplier') {
        const partyBtn = document.getElementById('masterLedgerSaveAsPartyBtn');
        if (partyBtn) partyBtn.click();
      } else if (options.saveAs === 'ledger') {
        const ledgerBtn = document.getElementById('masterLedgerSaveAsLedgerBtn');
        if (ledgerBtn) ledgerBtn.click();
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
      } else if (targetTab === 'cashline') {
        if (typeof window.onCreationCancelledForCashline === 'function') {
          window.onCreationCancelledForCashline(ctx);
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

