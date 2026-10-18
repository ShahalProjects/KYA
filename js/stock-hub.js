/**
 * KYA Modular - Stock Hub Module
 * Comprehensive Inventory, Stock Management, Movement Log & Analytics
 */

(function() {
  'use strict';

  // Default Stock Items fallback
  const DEFAULT_STOCK_ITEMS = [];

  const SAMPLE_STOCK_SKUS = ['RAW-COT-01', 'RAW-ZIP-05', 'FG-DNM-32', 'FG-DNM-34', 'FG-TSH-02', 'PKG-BOX-12', 'RAW-THR-01', 'TRD-BLT-36', 'PKG-BAG-02'];
  const SAMPLE_MOVEMENT_IDS = ['MOV-1001', 'MOV-1002', 'MOV-1003', 'MOV-1004', 'MOV-1005', 'MOV-1006'];

  const KYA_STOCK_GROUPS_KEY = 'kya_master_stock_groups';
  const KYA_STOCK_CATEGORIES_KEY = 'kya_master_stock_categories';
  const KYA_UNITS_KEY = 'kya_master_units';
  const KYA_WAREHOUSES_KEY = 'kya_master_warehouses';
  const KYA_STOCK_ITEMS_KEY = 'kya_master_stock_items';
  const KYA_STOCK_MOVEMENTS_KEY = 'kya_stock_movements';

  function loadStockHubStorage(key, fallback) {
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

  function saveStockHubStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save ' + key + ' to localStorage', e);
    }
  }

  // Stock Movement History Log
  let _stockMovements = loadStockHubStorage(KYA_STOCK_MOVEMENTS_KEY, []).filter(m => !SAMPLE_MOVEMENT_IDS.includes(m.id));

  // Navigation State
  // Top Action Buttons: 'overview', 'item', 'group', 'category', 'unit', 'warehouse'
  let _activeTopTab = 'overview';
  // Sub-tabs: 'details', 'movement', 'analysis'
  let _activeLeftSubtab = 'details';

  // Filters state
  let _searchQuery = '';
  let _selectedCategory = 'all';
  let _selectedStatus = 'all';
  let _selectedWarehouse = 'all';

  // Optional columns of the Stock List (Group, Category, Warehouse, Tax Rate hidden by default)
  let _stockItemOptionalCols = {
    group: false,
    category: false,
    warehouse: false,
    gst: false
  };
  let _isStockColDropdownOpen = false;
  // Stock List sort: column key and 'asc' | 'desc'; no column = master order
  let _stockListSort = { col: '', dir: '' };

  // Get active items synchronized with Master Desk if available
  function getStockItems() {
    let items = (window._masterStockItems && Array.isArray(window._masterStockItems))
      ? window._masterStockItems
      : loadStockHubStorage(KYA_STOCK_ITEMS_KEY, DEFAULT_STOCK_ITEMS);

    items = items.filter(item => !SAMPLE_STOCK_SKUS.includes(item.sku));

    return items.map(item => {
      const itemCost = (typeof item.rate === 'number' && !isNaN(item.rate)) ? item.rate : ((typeof item.cost === 'number' && !isNaN(item.cost)) ? item.cost : 0);
      const itemQty = (typeof item.qty === 'number' && !isNaN(item.qty)) ? item.qty : 0;
      const itemPrice = (typeof item.price === 'number' && !isNaN(item.price)) ? item.price : (itemCost * 1.35);
      const itemWh = item.warehouse || item.location || '';
      return {
        id: item.id || 'STK-' + (item.sku || Math.random().toString(36).substr(2, 4)),
        name: item.name || 'Unnamed Item',
        sku: item.sku || '',
        group: item.group || 'General',
        category: item.category || '',
        uom: item.uom || 'Pcs',
        qty: itemQty,
        reorder: typeof item.reorder === 'number' ? item.reorder : 10,
        cost: itemCost,
        rate: itemCost,
        price: itemPrice,
        location: itemWh,
        warehouse: itemWh,
        gst: typeof item.gst === 'number' ? item.gst : 18,
        aliases: Array.isArray(item.aliases) ? item.aliases : []
      };
    });
  }

  function getStockGroups() {
    if (typeof window.syncStockGroupsToCoa === 'function') {
      try { window.syncStockGroupsToCoa(); } catch (e) {}
    }
    if (window._masterStockGroups && Array.isArray(window._masterStockGroups)) {
      return window._masterStockGroups;
    }
    return loadStockHubStorage(KYA_STOCK_GROUPS_KEY, []);
  }

  function getStockCategories() {
    if (window._masterStockCategories && Array.isArray(window._masterStockCategories)) {
      return window._masterStockCategories;
    }
    return loadStockHubStorage(KYA_STOCK_CATEGORIES_KEY, []);
  }

  function getStockUnits() {
    if (window._masterUnits && Array.isArray(window._masterUnits)) {
      return window._masterUnits;
    }
    return loadStockHubStorage(KYA_UNITS_KEY, []);
  }

  function getStockWarehouses() {
    if (window._masterWarehouses && Array.isArray(window._masterWarehouses)) {
      return window._masterWarehouses;
    }
    return loadStockHubStorage(KYA_WAREHOUSES_KEY, []);
  }

  function injectStockHubStyles() {
    if (document.getElementById('stock-hub-styles')) return;
    const style = document.createElement('style');
    style.id = 'stock-hub-styles';
    style.textContent = `
      .stock-hub-wrapper {
        width: 100%;
        font-family: var(--font-main, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      }

      /* Top Action Navigation Bar */
      .stock-top-actions {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
      }
      .btn-stock-action {
        display: flex;
        align-items: center;
        gap: 6.5px;
        padding: 8px 14px;
        font-size: 13px;
        font-weight: 600;
        color: var(--slate-600, #475569);
        background: #ffffff;
        border: 1.5px solid var(--slate-200, #e2e8f0);
        border-radius: 8px;
        cursor: pointer;
        box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        transition: all 0.18s ease;
        height: 38px;
        font-family: inherit;
      }
      .btn-stock-action:hover {
        background: var(--slate-50, #f8fafc) !important;
        color: var(--slate-900, #0f172a) !important;
        border-color: var(--slate-300, #cbd5e1) !important;
        transform: translateY(-1px);
      }
      .btn-stock-action.active {
        background: #2563eb !important;
        color: #ffffff !important;
        border-color: #2563eb !important;
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.28) !important;
      }

      /* Back Button */
      .btn-stock-back {
        display: inline-flex;
        align-items: center;
        gap: 6.5px;
        height: 36px;
        padding: 0 14px;
        font-size: 13px;
        font-weight: 600;
        color: var(--slate-700, #334155);
        background: #ffffff;
        border: 1.5px solid var(--slate-200, #e2e8f0);
        border-radius: 8px;
        cursor: pointer;
        box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        transition: all 0.15s ease;
        font-family: inherit;
      }
      .btn-stock-back:hover {
        background: var(--slate-50, #f8fafc);
        color: #1d4ed8;
        border-color: #93c5fd;
        transform: translateX(-2px);
        box-shadow: 0 2px 6px rgba(37, 99, 235, 0.1);
      }

      /* KPI Cards Grid */
      .stock-kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 16px;
        margin-bottom: 22px;
      }
      .stock-kpi-card {
        background: #ffffff;
        border: 1px solid var(--slate-200, #e2e8f0);
        border-radius: 12px;
        padding: 16px 18px;
        display: flex;
        align-items: center;
        gap: 14px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .stock-kpi-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
      }
      .stock-kpi-icon-wrap {
        width: 44px;
        height: 44px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .stock-kpi-content {
        flex: 1;
        min-width: 0;
      }
      .stock-kpi-label {
        font-size: 11.5px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--slate-500, #64748b);
        margin-bottom: 2px;
      }
      .stock-kpi-val {
        font-size: 19px;
        font-weight: 800;
        color: var(--slate-900, #0f172a);
        line-height: 1.2;
      }
      .stock-kpi-sub {
        font-size: 11px;
        color: var(--slate-400, #94a3b8);
        margin-top: 2px;
      }

      /* Filter Toolbar */
      .stock-filter-toolbar {
        background: #ffffff;
        border: 1px solid var(--slate-200, #e2e8f0);
        border-radius: 10px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 16px;
        flex-wrap: wrap;
      }
      .stock-search-box {
        position: relative;
        flex: 1;
        min-width: 240px;
      }
      .stock-search-box svg {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--slate-400, #94a3b8);
        pointer-events: none;
      }
      .stock-search-input {
        width: 100%;
        padding: 8px 12px 8px 36px;
        font-size: 13px;
        border-radius: 7px;
        border: 1.5px solid var(--slate-200, #e2e8f0);
        outline: none;
        box-sizing: border-box;
        transition: border-color 0.15s ease;
        background: #ffffff;
      }
      .stock-search-input:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
      }
      .stock-filter-group {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .stock-select-filter {
        padding: 7.5px 12px;
        font-size: 12.5px;
        font-weight: 500;
        color: var(--slate-700, #334155);
        border: 1.5px solid var(--slate-200, #e2e8f0);
        border-radius: 7px;
        background: #ffffff;
        outline: none;
        cursor: pointer;
      }

      /* Stock Table */
      .stock-table-card {
        background: #ffffff;
        border: 1px solid var(--slate-200, #e2e8f0);
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      }
      .stock-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
        font-size: 13px;
      }
      .stock-table th {
        background: #f8fafc;
        padding: 12px 16px;
        font-size: 11.5px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--slate-500, #64748b);
        border-bottom: 1.5px solid var(--slate-200, #e2e8f0);
        white-space: nowrap;
      }
      .stock-table td {
        padding: 12px 16px;
        border-bottom: 1px solid var(--slate-150, #f1f5f9);
        color: var(--slate-700, #334155);
        vertical-align: middle;
      }
      .stock-table tr:last-child td {
        border-bottom: none;
      }
      .stock-table tr:hover td {
        background: #f8fafc;
      }
      .stock-item-name {
        font-weight: 600;
        color: var(--slate-900, #0f172a);
        display: flex;
        flex-direction: column;
      }
      .stock-item-sku {
        font-size: 11px;
        color: var(--slate-400, #94a3b8);
        font-family: monospace;
        margin-top: 2px;
      }
      .stock-category-badge {
        font-size: 11px;
        font-weight: 600;
        padding: 2.5px 8px;
        border-radius: 6px;
        background: #f1f5f9;
        color: #475569;
        display: inline-block;
      }
      .stock-status-pill {
        font-size: 11px;
        font-weight: 700;
        padding: 3px 9px;
        border-radius: 12px;
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      .stock-status-in {
        background: #ecfdf5;
        color: #047857;
        border: 1px solid #a7f3d0;
      }
      .stock-status-low {
        background: #fffbeb;
        color: #b45309;
        border: 1px solid #fde68a;
      }
      .stock-status-out {
        background: #fef2f2;
        color: #b91c1c;
        border: 1px solid #fecaca;
      }
      .stock-actions-cell {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .stock-icon-btn {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        border: 1px solid var(--slate-200, #e2e8f0);
        background: #ffffff;
        color: var(--slate-500, #64748b);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .stock-icon-btn:hover {
        background: #f1f5f9;
        color: var(--slate-800, #1e293b);
      }
      .stock-table-footer {
        padding: 12px 18px;
        background: #f8fafc;
        border-top: 1px solid var(--slate-200, #e2e8f0);
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 12.5px;
        color: var(--slate-500, #64748b);
      }
      .stock-empty-state {
        padding: 48px 24px;
        text-align: center;
        color: var(--slate-400, #94a3b8);
      }

      /* Details Cards Grid */
      .stock-details-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 24px;
      }
      @media (max-width: 1024px) {
        .stock-details-grid {
          grid-template-columns: 1fr;
        }
      }
      .stock-section-card {
        background: #ffffff;
        border: 1.5px solid var(--slate-200, #e2e8f0);
        border-radius: 12px;
        padding: 20px 22px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.02);
      }
      .stock-section-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--slate-800, #1e293b);
        margin-bottom: 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .stock-progress-bar {
        height: 7px;
        border-radius: 4px;
        background: #e2e8f0;
        overflow: hidden;
        display: flex;
        margin: 8px 0 12px 0;
      }
      .stock-progress-segment {
        height: 100%;
        transition: width 0.3s ease;
      }

      /* Modal Styling */
      .stock-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.55);
        backdrop-filter: blur(4px);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      .stock-modal-box {
        background: #ffffff;
        border-radius: 14px;
        max-width: 540px;
        width: 100%;
        box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        overflow: hidden;
        animation: stockModalIn 0.2s ease-out;
      }
      @keyframes stockModalIn {
        from { opacity: 0; transform: scale(0.96) translateY(8px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      .stock-modal-header {
        background: linear-gradient(90deg, #1d4ed8, #2563eb);
        color: #ffffff;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .stock-modal-body {
        padding: 20px 24px;
        max-height: 75vh;
        overflow-y: auto;
      }
      .stock-form-fg {
        margin-bottom: 14px;
      }
      .stock-form-label {
        font-size: 12.5px;
        font-weight: 600;
        color: var(--slate-700, #334155);
        margin-bottom: 5px;
        display: block;
      }
      .stock-form-input, .stock-form-select, .stock-form-textarea {
        width: 100%;
        padding: 9px 12px;
        font-size: 13px;
        border: 1.5px solid var(--slate-200, #e2e8f0);
        border-radius: 7px;
        background: #ffffff;
        outline: none;
        box-sizing: border-box;
      }
      .stock-form-input:focus, .stock-form-select:focus, .stock-form-textarea:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
      }
      .stock-modal-footer {
        padding: 14px 20px;
        background: #f8fafc;
        border-top: 1px solid var(--slate-200, #e2e8f0);
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }

      /* ── Details (Overview → Details): KPI cards styled like the KYA Dashboard ── */
      .shd { container-type: inline-size; }
      .shd-kpi-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
      .shd-kpi-strip .db-kpi-card, .shd-pnl-strip .db-kpi-card { padding-bottom: 18px; cursor: default; }
      .shd-kpi-strip .db-kpi-top, .shd-pnl-strip .db-kpi-top { margin-bottom: 14px; }
      .shd-kpi-strip .db-kpi-value, .shd-pnl-strip .db-kpi-value { overflow-wrap: anywhere; }
      .shd-pnl-strip { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-top: 16px; }
      .shd-method { display: inline-flex; gap: 2px; padding: 2px; border-radius: 7px; background: var(--slate-100); border: 1px solid var(--slate-200); }
      .shd-method button { font-family: var(--font-main); font-size: 11px; font-weight: 700; padding: 3px 8px; border: 0; border-radius: 5px; background: transparent; color: var(--slate-500); cursor: pointer; white-space: nowrap; }
      .shd-method button:hover { color: var(--blue-700); }
      .shd-method button.active { background: #ffffff; color: var(--blue-700); box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12); }

      /* Stock List: Columns icon and ⋮ menu in the title card, sortable headers */
      .stock-head-actions { position: relative; z-index: 5; display: flex; align-items: center; gap: 8px; margin-left: auto; }
      .stock-col-wrap { position: relative; }
      .stock-table th[data-stock-sort], .stock-table th[data-mov-sort] { cursor: pointer; user-select: none; white-space: nowrap; }
      .stock-table th[data-stock-sort]:hover, .stock-table th[data-mov-sort]:hover { color: var(--slate-900); }
      .stock-sort-ico { font-size: 10px; color: #94a3b8; opacity: 0.6; margin-left: 5px; }
      .stock-sort-ico.on { color: #2563eb; opacity: 1; font-weight: 800; }

      /* Stock Movement: search row, Qty group header, grand total */
      .stock-mov-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
      .stock-mov-table th.grp { text-align: center; border-bottom: 1px solid var(--slate-200); }
      .stock-mov-table th.num, .stock-mov-table td.num { text-align: right; }
      .stock-mov-table tfoot td { font-weight: 800; color: var(--slate-900); background: var(--slate-50); border-top: 2px solid var(--slate-200); }

      /* Details: voucher calendar card, same shell as the KPI cards */
      .shd-cal { position: relative; margin-top: 16px; background: var(--white); border: 1.5px solid var(--slate-200); border-radius: 14px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
      .shd-cal-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
      .shd-slider { position: relative; display: inline-flex; gap: 2px; padding: 3px; max-width: 100%; overflow-x: auto; scrollbar-width: none; border-radius: 10px; background: var(--slate-100); border: 1px solid var(--slate-200); }
      .shd-slider::-webkit-scrollbar { display: none; }
      .shd-slider-thumb { position: absolute; top: 3px; bottom: 3px; left: 0; width: 0; border-radius: 7px; background: #ffffff; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.12); transition: left .25s var(--ease), width .25s var(--ease); }
      .shd-slider.no-anim .shd-slider-thumb { transition: none; }
      .shd-slider button { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border: 0; border-radius: 7px; background: transparent; font-family: var(--font-main); font-size: 12px; font-weight: 600; color: var(--slate-500); cursor: pointer; white-space: nowrap; }
      .shd-slider button:hover { color: var(--slate-800); }
      .shd-slider button.active { color: var(--slate-900); font-weight: 700; }
      .shd-slider-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
      .shd-cal-nav { display: inline-flex; align-items: center; gap: 6px; }
      .shd-cal-nav button { width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--slate-200); background: #ffffff; color: var(--slate-600); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
      .shd-cal-nav button:hover { border-color: var(--blue-300); color: var(--blue-700); }
      .shd-cal-title { min-width: 120px; text-align: center; font-size: 13.5px; font-weight: 700; color: var(--slate-900); }
      .shd-cal-week, .shd-cal-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
      .shd-cal-week { margin-bottom: 6px; }
      .shd-cal-week span { font-size: 11px; font-weight: 700; color: var(--slate-400); text-transform: uppercase; letter-spacing: .04em; padding-left: 8px; }
      .shd-cal-cell { height: 44px; border-radius: 8px; background: var(--slate-50); color: var(--slate-500); font-size: 12px; font-weight: 600; padding: 6px 8px; box-sizing: border-box; }
      .shd-cal-cell.blank { background: transparent; }
      .shd-cal-cell.has { cursor: default; font-weight: 700; }
      .shd-cal-cell.has:hover, .shd-cal-cell.has:focus-visible { outline: 2px solid var(--slate-900); outline-offset: 1px; }
      .shd-cal-cell.today span { font-weight: 800; text-decoration: underline; text-underline-offset: 3px; }
      .shd-cal-legend { display: flex; align-items: center; justify-content: flex-end; gap: 4px; margin-top: 12px; font-size: 11px; color: var(--slate-500); }
      .shd-cal-legend span { margin: 0 4px; }
      .shd-cal-legend i { width: 12px; height: 12px; border-radius: 3px; }
      .shd-cal-tip { position: absolute; z-index: 20; top: 0; left: 0; width: 260px; max-width: calc(100% - 16px); box-sizing: border-box; background: #ffffff; border: 1px solid var(--slate-200); border-radius: 10px; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16); padding: 10px 12px; font-size: 12px; color: var(--slate-700); opacity: 0; visibility: hidden; pointer-events: none; transition: opacity .12s; }
      .shd-cal-tip.show { opacity: 1; visibility: visible; }
      .shd-tip-head { display: flex; align-items: center; gap: 6px; font-weight: 700; color: var(--slate-900); padding-bottom: 8px; margin-bottom: 2px; border-bottom: 1px solid var(--slate-100); }
      .shd-tip-kv { display: flex; justify-content: space-between; align-items: baseline; gap: 14px; padding: 4px 0; color: var(--slate-600); }
      .shd-tip-kv strong { color: var(--slate-900); white-space: nowrap; }
      .shd-tip-sep { height: 1px; margin: 4px 0; background: var(--slate-100); }
      @container (max-width: 520px) {
        .shd-cal { padding: 14px; }
        .shd-cal-nav { width: 100%; justify-content: space-between; }
        .shd-cal-title { min-width: 0; }
        .shd-cal-week, .shd-cal-grid { gap: 4px; }
        .shd-cal-week span { padding-left: 0; text-align: center; font-size: 0; letter-spacing: 0; }
        .shd-cal-week span::after { content: attr(data-short); font-size: 10px; }
        .shd-cal-cell { height: 36px; padding: 4px; text-align: center; }
      }
      @container (max-width: 900px) { .shd-kpi-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      @container (max-width: 600px) { .shd-pnl-strip { grid-template-columns: 1fr; } }
      @container (max-width: 380px) { .shd-kpi-strip { grid-template-columns: 1fr; } }
      @media (max-width: 600px) {
        #panel-stock-hub .je-form-card > .sho-shell-body { padding: 14px !important; }
        #panel-stock-hub #stockHubContentArea { padding: 12px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function getStockStatus(item) {
    if (item.qty <= 0) {
      return { label: 'Out of Stock', cls: 'stock-status-out' };
    }
    if (item.qty <= item.reorder) {
      return { label: 'Low Stock', cls: 'stock-status-low' };
    }
    return { label: 'In Stock', cls: 'stock-status-in' };
  }

  function formatInr(val) {
    return (Number(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ==========================================
  // RENDER: Top Action Bar (Blue Navigation Buttons)
  // ==========================================
  function renderTopActionBar() {
    return `
      <div class="panel-header" style="border-bottom: 1.5px solid var(--slate-100); padding-bottom: 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: flex-start; gap: 12px; width: 100%;">
        <div class="stock-top-actions">
          <button class="btn-stock-action ${_activeTopTab === 'overview' ? 'active' : ''}" data-top-tab="overview" type="button" aria-label="Stock Overview">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            Overview
          </button>

          <button class="btn-stock-action ${_activeTopTab === 'item' ? 'active' : ''}" data-top-tab="item" type="button" aria-label="Stock Items">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            Item
          </button>

          <button class="btn-stock-action ${_activeTopTab === 'group' ? 'active' : ''}" data-top-tab="group" type="button" aria-label="Stock Groups">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            Group
          </button>

          <button class="btn-stock-action ${_activeTopTab === 'category' ? 'active' : ''}" data-top-tab="category" type="button" aria-label="Stock Categories">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
            Category
          </button>

          <button class="btn-stock-action ${_activeTopTab === 'unit' ? 'active' : ''}" data-top-tab="unit" type="button" aria-label="Units of Measurement">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;">
              <path d="M4 7V4h16v3M9 20h6M12 4v16"/>
            </svg>
            Unit
          </button>

          <button class="btn-stock-action ${_activeTopTab === 'warehouse' ? 'active' : ''}" data-top-tab="warehouse" type="button" aria-label="Warehouses">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;">
              <path d="M3 21h18"></path>
              <path d="M5 21V7l7-4 7 4v14"></path>
              <path d="M9 21v-8a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v8"></path>
            </svg>
            Warehouse
          </button>
        </div>
      </div>
    `;
  }

  // ==========================================
  // RENDER: Left Sidebar Sub-tabs in KeepOne style
  // ==========================================
  function renderKeepOneLeftSidebar(stockItems) {
    const lowStockCount = stockItems.filter(i => i.qty > 0 && i.qty <= i.reorder).length;
    const outStockCount = stockItems.filter(i => i.qty <= 0).length;
    const alertTotal = lowStockCount + outStockCount;

    return `
      <div class="oh-sub-tabs" role="tablist" aria-label="KeepOne Stock Navigation">

        <!-- 1. Details (First!) -->
        <button class="oh-sub-tab ${_activeLeftSubtab === 'details' ? 'active' : ''}" data-subtab="details" role="tab" aria-selected="${_activeLeftSubtab === 'details'}">
          <div class="oh-tab-icon-wrap">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.8"/>
              <line x1="2" y1="8" x2="18" y2="8" stroke="currentColor" stroke-width="1.6"/>
              <line x1="8" y1="8" x2="8" y2="17" stroke="currentColor" stroke-width="1.6"/>
            </svg>
          </div>
          <span class="oh-tab-text">Details</span>
        </button>

        <!-- 2. Movement (Second!) -->
        <button class="oh-sub-tab ${_activeLeftSubtab === 'movement' ? 'active' : ''}" data-subtab="movement" role="tab" aria-selected="${_activeLeftSubtab === 'movement'}">
          <div class="oh-tab-icon-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="17 1 21 5 17 9"></polyline>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
              <polyline points="7 23 3 19 7 15"></polyline>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
            </svg>
          </div>
          <span class="oh-tab-text">Movement</span>
          <span class="oh-sub-tab-badge">${_stockMovements.length}</span>
        </button>

        <!-- 3. Analysis (Third!) -->
        <button class="oh-sub-tab ${_activeLeftSubtab === 'analysis' ? 'active' : ''}" data-subtab="analysis" role="tab" aria-selected="${_activeLeftSubtab === 'analysis'}">
          <div class="oh-tab-icon-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
          </div>
          <span class="oh-tab-text">Analysis</span>
          ${alertTotal > 0 ? `<span class="oh-sub-tab-badge" style="background: #fef2f2; color: #dc2626;">${alertTotal}</span>` : ''}
        </button>
      </div>
    `;
  }

  // ==========================================
  // SUB-TAB 1: DETAILS VIEW (Dashboard-style KPI cards)
  // ==========================================
  // Cost formula for the Stock Valuation card: 'avg' (weighted average) or 'fifo'
  const KYA_STOCK_VAL_METHOD_KEY = 'kya_stock_valuation_method';
  let _stockValMethod = 'avg';
  try { if (localStorage.getItem(KYA_STOCK_VAL_METHOD_KEY) === 'fifo') _stockValMethod = 'fifo'; } catch (e) {}

  // Links a voucher row to its stock item: by stock item id, else (goods rows only) by name or alternate name
  function makeStockRowMatcher(stockItems) {
    const byId = new Map();
    const byName = new Map();
    stockItems.forEach(it => {
      byId.set(String(it.id), it);
      [it.name].concat(it.aliases || []).forEach(n => {
        const k = String(n || '').toLowerCase().trim();
        if (k && !byName.has(k)) byName.set(k, it);
      });
    });
    return row => {
      if (!row) return null;
      if (row.stockItemId && byId.has(String(row.stockItemId))) return byId.get(String(row.stockItemId));
      if (row.itemType && row.itemType !== 'Product') return null;
      return byName.get(String(row.item || '').toLowerCase().trim()) || null;
    };
  }

  // Voucher dates are YYYY-MM-DD (DD-MM-YYYY also read) → { y, m: 1-12, d }, or null
  function voucherDateParts(s) {
    const t = String(s || '').trim();
    let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return { y: +m[1], m: +m[2], d: +m[3] };
    m = t.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/);
    return m ? { y: +m[3], m: +m[2], d: +m[1] } : null;
  }

  // A voucher row's value without GST: row amounts include the tax, so take it back out
  function rowTaxableValue(row) {
    return (parseFloat(row.amount) || 0) / (1 + (parseFloat(row.tax) || 0) / 100);
  }

  // Voucher date as a sortable number (YYYYMMDD); 0 when it can't be read
  function voucherDateKey(s) {
    const p = voucherDateParts(s);
    return p ? p.y * 10000 + p.m * 100 + p.d : 0;
  }

  // Posted vouchers that can move stock. Drafts and sales orders moved nothing, and nor did
  // reversals of Pre Invoices / Pre Purchase documents.
  function stockMovingVouchers() {
    const store = window.KYA_STORE || {};
    return {
      purchases: (Array.isArray(store.purchaseVouchers) ? store.purchaseVouchers : []).filter(v => v && !v.isDraft && !v.reversedPreDoc),
      sales: (Array.isArray(store.salesVouchers) ? store.salesVouchers : []).filter(v => v && !v.isDraft && !v.isOrder && !v.reversedPreInvoice)
    };
  }

  // Per stock item, what the stock figures need from Master Desk and the posted vouchers:
  // opening qty and rate, purchases net of returns (also as FIFO layers, oldest first), the
  // weighted average cost, every sale and sales return (date, qty, value without GST) and the
  // latest sale rate (for NRV).
  function buildStockLedger(stockItems) {
    const vouchers = stockMovingVouchers();
    const matchRow = makeStockRowMatcher(stockItems);
    // Vouchers in date order, then in the order they were posted
    const seq = v => Number(v.postedAt) || Number(v.id) || 0;
    const byDate = (a, b) => (voucherDateKey(a.date) - voucherDateKey(b.date)) || (seq(a) - seq(b));

    const ledger = new Map(stockItems.map(it => [it.id, { inQty: 0, inVal: 0, outQty: 0, layers: [], sales: [], nrv: null }]));

    // Purchases add stock (and FIFO layers)
    const purchases = vouchers.purchases.sort(byDate);
    purchases.filter(v => !v.isReturn).forEach(v => {
      (v.rows || []).forEach(row => {
        const it = matchRow(row);
        const qty = parseFloat(row.qty) || 0;
        if (!it || qty <= 0) return;
        const s = ledger.get(it.id);
        const val = rowTaxableValue(row);
        s.inQty += qty;
        s.inVal += val;
        s.layers.push({ vid: String(v.id), qty, rate: val / qty });
      });
    });
    // Purchase returns send goods back: out of the invoice they came from first, then the newest layers
    purchases.filter(v => v.isReturn).forEach(v => {
      (v.rows || []).forEach(row => {
        const it = matchRow(row);
        const qty = parseFloat(row.qty) || 0;
        if (!it || qty <= 0) return;
        const s = ledger.get(it.id);
        s.inQty -= qty;
        s.inVal -= rowTaxableValue(row);
        let left = qty;
        const src = s.layers.find(l => v.returnAgainstId != null && l.vid === String(v.returnAgainstId));
        if (src) { const take = Math.min(left, src.qty); src.qty -= take; left -= take; }
        for (let i = s.layers.length - 1; i >= 0 && left > 0; i--) {
          const take = Math.min(left, s.layers[i].qty);
          s.layers[i].qty -= take;
          left -= take;
        }
      });
    });

    // Sales take stock out, sales returns bring it back; the latest sale sets NRV
    vouchers.sales.sort(byDate)
      .forEach(v => {
        (v.rows || []).forEach(row => {
          const it = matchRow(row);
          const qty = parseFloat(row.qty) || 0;
          if (!it || qty <= 0) return;
          const s = ledger.get(it.id);
          const value = rowTaxableValue(row);
          s.sales.push({ dk: voucherDateKey(v.date), qty, value, isReturn: !!v.isReturn });
          if (v.isReturn) { s.outQty -= qty; return; }
          s.outQty += qty;
          s.nrv = value / qty;
        });
      });

    stockItems.forEach(it => {
      const s = ledger.get(it.id);
      // Opening qty and rate from Master Desk (Stock Hub movements already adjust the qty)
      s.openQty = Math.max(0, it.qty);
      s.openRate = Math.max(0, it.cost);
      const allQty = s.openQty + s.inQty;
      s.avgRate = allQty > 0 ? Math.max(0, (s.openQty * s.openRate + s.inVal) / allQty) : s.openRate;
    });
    return ledger;
  }

  // Closing stock as per AS 2 / Ind AS 2 / ICDS II: each item at the lower of cost and net
  // realisable value. Cost is the purchase value after trade discount and without recoverable
  // GST, assigned by weighted average or FIFO. NRV is the item's latest sale rate without GST
  // (costs to sell are not recorded); an item not sold yet is carried at cost.
  // Returns a Map of stock item id → { qty, value }: closing qty and closing value.
  function computeStockItemValues(stockItems, method) {
    const ledger = buildStockLedger(stockItems);
    const values = new Map();
    stockItems.forEach(it => {
      const s = ledger.get(it.id);
      // Rounded so float leftovers (e.g. 0.1 + 0.2 - 0.3) don't count as stock on hand
      const closingQty = Math.max(0, Math.round((s.openQty + s.inQty - s.outQty) * 10000) / 10000);
      if (closingQty <= 0) {
        values.set(it.id, { qty: 0, value: 0 });
        return;
      }

      let cost;
      if (method === 'fifo') {
        // Closing stock is made up of the newest layers
        const layers = [{ qty: s.openQty, rate: s.openRate }].concat(s.layers);
        let left = closingQty;
        cost = 0;
        for (let i = layers.length - 1; i >= 0 && left > 0; i--) {
          const take = Math.min(left, Math.max(0, layers[i].qty));
          cost += take * layers[i].rate;
          left -= take;
        }
        // More on hand than ever came in (e.g. sales returns): value the rest at average cost
        if (left > 0) cost += left * s.avgRate;
      } else {
        cost = closingQty * s.avgRate;
      }

      const nrv = s.nrv !== null ? closingQty * Math.max(0, s.nrv) : Infinity;
      values.set(it.id, { qty: closingQty, value: Math.min(cost, nrv) });
    });
    return values;
  }

  // Returns { value, available }: the closing stock value and how many items have stock on hand.
  function computeStockValuation(stockItems, method) {
    const values = computeStockItemValues(stockItems, method);
    return stockItems.reduce((total, it) => {
      const v = values.get(it.id);
      if (v.qty > 0) {
        total.available++;
        total.value += v.value;
      }
      return total;
    }, { value: 0, available: 0 });
  }

  // Revenue, expense (cost of goods sold) and profit/loss on stock items for one month (m: 0-11).
  // Revenue is sales less sales returns, without GST. Cost of goods sold uses the same cost
  // formula as the closing stock, so opening + purchases = cost of goods sold + closing stock:
  // weighted average charges every unit at the average cost, FIFO charges the oldest units first.
  function computeStockPnl(stockItems, method, y, m) {
    const ledger = buildStockLedger(stockItems);
    const from = y * 10000 + (m + 1) * 100 + 1;
    const to = y * 10000 + (m + 1) * 100 + 31;
    let revenue = 0;
    let expense = 0;
    stockItems.forEach(it => {
      const s = ledger.get(it.id);
      const layers = [{ qty: s.openQty, rate: s.openRate }].concat(s.layers);
      // Cost of the first q units to go out
      const costOf = q => {
        if (q <= 0 || method !== 'fifo') return q * s.avgRate;
        let left = q;
        let c = 0;
        for (let i = 0; i < layers.length && left > 0; i++) {
          const take = Math.min(left, Math.max(0, layers[i].qty));
          c += take * layers[i].rate;
          left -= take;
        }
        // Sold more than ever came in: the rest at average cost
        return c + left * s.avgRate;
      };
      // Units gone out (sales less returns) before the month and by its end
      let before = 0;
      let byEnd = 0;
      s.sales.forEach(e => {
        const q = e.isReturn ? -e.qty : e.qty;
        if (e.dk < from) before += q;
        if (e.dk <= to) byEnd += q;
        if (e.dk >= from && e.dk <= to) revenue += e.isReturn ? -e.value : e.value;
      });
      expense += costOf(byEnd) - costOf(before);
    });
    return { revenue, expense, profit: revenue - expense };
  }

  // A Details card in the KYA Dashboard KPI style
  function shdKpiCard(icon, value, label, extra) {
    return `
      <div class="db-kpi-card">
        <div class="db-kpi-top">
          <div class="db-kpi-icon-wrap">${icon}</div>
          ${extra || ''}
        </div>
        <div class="db-kpi-value">${value}</div>
        <div class="db-kpi-label">${label}</div>
      </div>
    `;
  }

  // Revenue / Expense / Profit-Loss cards for the month the calendar shows
  function renderShdPnlCards(stockItems) {
    const cur = shdCalMonthNow();
    const p = computeStockPnl(stockItems, _stockValMethod, cur.y, cur.m);
    const money = v => {
      const r = Math.round(v * 100) / 100;
      return (r < 0 ? '−₹' : '₹') + formatInr(Math.abs(r));
    };
    return [
      shdKpiCard('<svg viewBox="0 0 20 20" fill="none"><path d="M10 2v16M6 6h6a2 2 0 1 1 0 4H8a2 2 0 1 0 0 4h7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>', money(p.revenue), 'Revenue'),
      shdKpiCard('<svg viewBox="0 0 20 20" fill="none"><path d="M3 6h14M3 10h10M3 14h7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="15" cy="14" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M15 13v1l.7.7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>', money(p.expense), 'Expense'),
      shdKpiCard('<svg viewBox="0 0 20 20" fill="none"><path d="M3 14l4-5 3 3 4-6 3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="17" cy="5" r="2" fill="currentColor" opacity="0.4"/></svg>', money(p.profit), 'Profit / Loss')
    ].join('');
  }

  function renderDetailsSubtab(stockItems) {
    const stock = computeStockValuation(stockItems, _stockValMethod);
    const methodSwitch = `
      <div class="shd-method" role="group" aria-label="Valuation method">
        <button type="button" data-shd-method="avg" class="${_stockValMethod === 'avg' ? 'active' : ''}" aria-pressed="${_stockValMethod === 'avg'}" title="Weighted average cost">Wt. Avg</button>
        <button type="button" data-shd-method="fifo" class="${_stockValMethod === 'fifo' ? 'active' : ''}" aria-pressed="${_stockValMethod === 'fifo'}" title="First in, first out">FIFO</button>
      </div>
    `;
    const card = shdKpiCard;
    return `
      <div class="shd">
        <div class="shd-kpi-strip">
          ${card('<svg viewBox="0 0 20 20" fill="none"><path d="M10 2l7 4v8l-7 4-7-4V6l7-4z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M3 6l7 4 7-4M10 10v8" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>', stock.available.toLocaleString('en-IN'), 'Available Items')}
          ${card('<svg viewBox="0 0 20 20" fill="none"><path d="M5 4h10M5 8h10M9 4c3 0 4.5 1.5 4.5 4S12 12 9 12H6l7 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>', '₹' + formatInr(stock.value), 'Stock Valuation', methodSwitch)}
          ${card('<svg viewBox="0 0 20 20" fill="none"><path d="M2.5 6a1.5 1.5 0 0 1 1.5-1.5h3.5l2 2H16a1.5 1.5 0 0 1 1.5 1.5v6.5A1.5 1.5 0 0 1 16 16H4a1.5 1.5 0 0 1-1.5-1.5V6z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>', getStockGroups().length.toLocaleString('en-IN'), 'Total Groups')}
          ${card('<svg viewBox="0 0 20 20" fill="none"><path d="M17 11l-6 6a1.5 1.5 0 0 1-2.1 0L2.5 10.6V2.5h8.1L17 8.9a1.5 1.5 0 0 1 0 2.1z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="6.5" cy="6.5" r="1.2" fill="currentColor"/></svg>', getStockCategories().length.toLocaleString('en-IN'), 'Total Categories')}
        </div>
        ${renderShdCalendar(stockItems)}
        <div class="shd-pnl-strip">${renderShdPnlCards(stockItems)}</div>
      </div>
    `;
  }

  // Details calendar: vouchers that moved stock items, day by day, one voucher type at a time.
  // Each type has its own one-hue ramp; a darker day had a bigger total (value without GST).
  const SHD_CAL_TYPES = [
    { key: 'sales', label: 'Sales', countLabel: 'No. of sales', avgLabel: 'Avg sales / day', ramp: ['#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8'] },
    { key: 'salesReturn', label: 'Sales Return', countLabel: 'No. of sales returns', avgLabel: 'Avg sales returns / day', ramp: ['#ffedd5', '#fdba74', '#f97316', '#c2410c'] },
    { key: 'purchase', label: 'Purchase', countLabel: 'No. of purchases', avgLabel: 'Avg purchases / day', ramp: ['#d1fae5', '#6ee7b7', '#10b981', '#047857'] },
    { key: 'purchaseReturn', label: 'Purchase Return', countLabel: 'No. of purchase returns', avgLabel: 'Avg purchase returns / day', ramp: ['#ede9fe', '#c4b5fd', '#8b5cf6', '#6d28d9'] }
  ];
  let _shdCalType = 'sales';
  let _shdCalMonth = null;   // { y, m: 0-11 }; null = the current month
  let _shdCalShown = null;   // what the grid shows now, for the hover popup

  function shdCalTypeInfo() {
    return SHD_CAL_TYPES.find(t => t.key === _shdCalType) || SHD_CAL_TYPES[0];
  }

  function shdCalMonthNow() {
    if (_shdCalMonth) return _shdCalMonth;
    const t = new Date();
    return { y: t.getFullYear(), m: t.getMonth() };
  }

  function shdCalMonthTitle() {
    const cur = shdCalMonthNow();
    return new Date(cur.y, cur.m, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  // Posted vouchers of one type in one month that have stock item lines, by day of month:
  // { [day]: { total, count, items } } where total is the stock lines' value without GST,
  // count the number of vouchers and items the set of distinct stock item ids.
  function getShdCalendarDays(stockItems, typeKey, y, m) {
    const matchRow = makeStockRowMatcher(stockItems);
    const isSales = typeKey === 'sales' || typeKey === 'salesReturn';
    const wantReturn = typeKey === 'salesReturn' || typeKey === 'purchaseReturn';
    const vouchers = stockMovingVouchers();
    const list = isSales ? vouchers.sales : vouchers.purchases;
    const days = {};
    list.forEach(v => {
      if (!!v.isReturn !== wantReturn) return;
      const p = voucherDateParts(v.date);
      if (!p || p.y !== y || p.m !== m + 1) return;
      const ids = [];
      let value = 0;
      (v.rows || []).forEach(row => {
        const it = matchRow(row);
        const qty = parseFloat(row.qty) || 0;
        if (!it || qty <= 0) return;
        ids.push(it.id);
        value += rowTaxableValue(row);
      });
      if (!ids.length) return;
      const day = days[p.d] || (days[p.d] = { total: 0, count: 0, items: new Set() });
      day.total += value;
      day.count++;
      ids.forEach(id => day.items.add(id));
    });
    return days;
  }

  function renderShdCalendarBody(stockItems) {
    const today = new Date();
    const cur = shdCalMonthNow();
    const type = shdCalTypeInfo();
    const days = getShdCalendarDays(stockItems, type.key, cur.y, cur.m);
    // Average over the days of the month that had this type of voucher
    const active = Object.values(days);
    const avg = active.length ? active.reduce((sum, d) => sum + d.total, 0) / active.length : 0;
    _shdCalShown = { y: cur.y, m: cur.m, type, days, avg };

    const max = Math.max(0, ...active.map(d => d.total));
    const daysInMonth = new Date(cur.y, cur.m + 1, 0).getDate();
    const lead = (new Date(cur.y, cur.m, 1).getDay() + 6) % 7; // weeks start on Monday
    const isThisMonth = cur.y === today.getFullYear() && cur.m === today.getMonth();
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<div class="shd-cal-cell blank" aria-hidden="true"></div>');
    for (let d = 1; d <= daysInMonth; d++) {
      const info = days[d];
      const isToday = isThisMonth && d === today.getDate();
      if (!info) {
        cells.push(`<div class="shd-cal-cell${isToday ? ' today' : ''}"><span>${d}</span></div>`);
        continue;
      }
      // Four shades: the day's share of the month's biggest day
      const step = max > 0 ? Math.min(3, Math.max(0, Math.ceil((info.total / max) * 4) - 1)) : 0;
      const n = info.count;
      cells.push(`
        <div class="shd-cal-cell has${isToday ? ' today' : ''}" data-day="${d}" tabindex="0"
             style="background: ${type.ramp[step]}; color: ${step === 3 ? '#ffffff' : 'var(--slate-900)'};"
             aria-label="${d} ${shdCalMonthTitle()}: ${n} ${n === 1 ? 'voucher' : 'vouchers'}, ₹${formatInr(info.total)}"><span>${d}</span></div>
      `);
    }
    return `
      <div class="shd-cal-week">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(w => `<span data-short="${w.slice(0, 2)}">${w}</span>`).join('')}</div>
      <div class="shd-cal-grid">${cells.join('')}</div>
      <div class="shd-cal-legend" aria-hidden="true">
        <span>Less</span>${type.ramp.map(c => `<i style="background: ${c};"></i>`).join('')}<span>More</span>
      </div>
    `;
  }

  function renderShdCalendar(stockItems) {
    const chevron = d => `<svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true"><path d="${d}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    return `
      <section class="shd-cal" aria-label="Voucher calendar">
        <div class="shd-cal-head">
          <div class="shd-slider no-anim" role="tablist" aria-label="Voucher type">
            <span class="shd-slider-thumb" aria-hidden="true"></span>
            ${SHD_CAL_TYPES.map(t => `
              <button type="button" role="tab" data-shd-cal-type="${t.key}" class="${t.key === _shdCalType ? 'active' : ''}" aria-selected="${t.key === _shdCalType}">
                <span class="shd-slider-dot" style="background: ${t.ramp[2]};"></span>${t.label}
              </button>
            `).join('')}
          </div>
          <div class="shd-cal-nav">
            <button type="button" data-shd-cal-nav="-1" aria-label="Previous month">${chevron('M12.5 15l-5-5 5-5')}</button>
            <span class="shd-cal-title" aria-live="polite">${shdCalMonthTitle()}</span>
            <button type="button" data-shd-cal-nav="1" aria-label="Next month">${chevron('M7.5 15l5-5-5-5')}</button>
          </div>
        </div>
        <div class="shd-cal-body">${renderShdCalendarBody(stockItems)}</div>
        <div class="shd-cal-tip" role="tooltip"></div>
      </section>
    `;
  }

  function shdCalTipHtml(d) {
    const s = _shdCalShown;
    const info = s && s.days[d];
    if (!info) return '';
    const dateTxt = new Date(s.y, s.m, d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    // This day against the average day: ▲ above / ▼ below, by how much
    let vsAvg = '—';
    if (s.avg > 0) {
      const pct = ((info.total - s.avg) / s.avg) * 100;
      const abs = Math.abs(pct);
      vsAvg = abs < 0.5
        ? 'Same as avg'
        : `${pct > 0 ? '▲' : '▼'} ${abs < 10 ? abs.toFixed(1).replace(/\.0$/, '') : Math.round(abs)}% ${pct > 0 ? 'above' : 'below'}`;
    }
    const kv = (label, value) => `<div class="shd-tip-kv"><span>${label}</span><strong>${value}</strong></div>`;
    return `
      <div class="shd-tip-head"><span class="shd-slider-dot" style="background: ${s.type.ramp[2]};"></span>${ohEscapeHtml(s.type.label)} · ${dateTxt}</div>
      ${kv(s.type.countLabel, info.count.toLocaleString('en-IN'))}
      ${kv('No. of stock items', info.items.size.toLocaleString('en-IN'))}
      ${kv('Valuation', '₹' + formatInr(info.total))}
      <div class="shd-tip-sep"></div>
      ${kv(s.type.avgLabel, '₹' + formatInr(s.avg))}
      ${kv('This day vs avg', vsAvg)}
    `;
  }

  // Slider, month arrows and the day popup. Only the calendar body is redrawn, so the slider thumb can glide.
  function attachShdCalendarEvents(panel) {
    const root = panel.querySelector('.shd-cal');
    if (!root) return;
    const slider = root.querySelector('.shd-slider');
    const thumb = root.querySelector('.shd-slider-thumb');
    const body = root.querySelector('.shd-cal-body');
    const title = root.querySelector('.shd-cal-title');
    const tip = root.querySelector('.shd-cal-tip');

    const placeThumb = () => {
      const active = slider.querySelector('button.active');
      if (!active || !active.offsetWidth) return;
      thumb.style.left = active.offsetLeft + 'px';
      thumb.style.width = active.offsetWidth + 'px';
      // On a narrow screen the slider scrolls: keep the chosen tab in view
      if (slider.scrollWidth > slider.clientWidth) {
        slider.scrollLeft = active.offsetLeft - (slider.clientWidth - active.offsetWidth) / 2;
      }
    };
    placeThumb();
    // Also places it once the panel becomes visible (it can be drawn while hidden)
    if (typeof ResizeObserver === 'function') new ResizeObserver(placeThumb).observe(slider);
    requestAnimationFrame(() => slider.classList.remove('no-anim'));

    const hideTip = () => tip.classList.remove('show');
    const showTip = cell => {
      tip.innerHTML = shdCalTipHtml(cell.dataset.day);
      const rr = root.getBoundingClientRect();
      const cr = cell.getBoundingClientRect();
      const w = tip.offsetWidth, h = tip.offsetHeight;
      const left = Math.min(Math.max(cr.left - rr.left + cr.width / 2 - w / 2, 8), rr.width - w - 8);
      let top = cr.top - rr.top - h - 8;
      if (top < 8) top = cr.bottom - rr.top + 8;
      tip.style.left = left + 'px';
      tip.style.top = top + 'px';
      tip.classList.add('show');
    };
    const bindCells = () => {
      body.querySelectorAll('.shd-cal-cell.has').forEach(cell => {
        cell.addEventListener('mouseenter', () => showTip(cell));
        cell.addEventListener('focus', () => showTip(cell));
        cell.addEventListener('mouseleave', hideTip);
        cell.addEventListener('blur', hideTip);
      });
    };
    const redraw = () => {
      hideTip();
      body.innerHTML = renderShdCalendarBody(getStockItems());
      title.textContent = shdCalMonthTitle();
      bindCells();
    };
    bindCells();

    slider.querySelectorAll('[data-shd-cal-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        _shdCalType = btn.dataset.shdCalType;
        slider.querySelectorAll('[data-shd-cal-type]').forEach(b => {
          const on = b === btn;
          b.classList.toggle('active', on);
          b.setAttribute('aria-selected', String(on));
        });
        placeThumb();
        redraw();
      });
    });
    root.querySelectorAll('[data-shd-cal-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cur = shdCalMonthNow();
        const d = new Date(cur.y, cur.m + Number(btn.dataset.shdCalNav), 1);
        _shdCalMonth = { y: d.getFullYear(), m: d.getMonth() };
        redraw();
        // The Revenue / Expense / Profit-Loss cards follow the calendar's month
        const pnl = panel.querySelector('.shd-pnl-strip');
        if (pnl) pnl.innerHTML = renderShdPnlCards(getStockItems());
      });
    });
  }

  // ==========================================
  // SUB-TAB 2: STOCK LIST VIEW (Full Screen with Back Button)
  // ==========================================
  // Stock List columns. Main columns always show; optional ones are picked in the Columns menu.
  // Quantity, Rate and Valuation are closing figures as per AS 2 (see computeStockItemValues):
  // Rate is the valuation per unit, i.e. cost or NRV, whichever is lower.
  const STOCK_LIST_COLS = [
    { key: 'code', label: 'Code', main: true, text: r => r.item.sku },
    { key: 'item', label: 'Item', main: true, text: r => r.item.name },
    { key: 'group', label: 'Group', text: r => r.item.group || 'Inventories' },
    { key: 'category', label: 'Category', text: r => r.item.category || '' },
    { key: 'warehouse', label: 'Warehouse', text: r => r.item.location || r.item.warehouse || '' },
    { key: 'unit', label: 'Unit', main: true, text: r => r.item.uom },
    { key: 'qty', label: 'Quantity', main: true, num: true, val: r => r.qty },
    { key: 'rate', label: 'Rate (₹)', main: true, num: true, val: r => r.rate },
    { key: 'value', label: 'Valuation (₹)', main: true, num: true, val: r => r.value },
    { key: 'gst', label: 'Tax Rate', num: true, val: r => r.item.gst }
  ];

  function stockListMatchesSearch(item) {
    return !_searchQuery ||
      item.name.toLowerCase().includes(_searchQuery) ||
      item.sku.toLowerCase().includes(_searchQuery) ||
      (item.category && item.category.toLowerCase().includes(_searchQuery)) ||
      (item.location && item.location.toLowerCase().includes(_searchQuery)) ||
      (item.group && item.group.toLowerCase().includes(_searchQuery));
  }

  // What the Stock List shows (and exports): the visible columns and the searched, sorted rows
  function getStockListView(stockItems) {
    const values = computeStockItemValues(stockItems, _stockValMethod);
    const cols = STOCK_LIST_COLS.filter(c => c.main || _stockItemOptionalCols[c.key]);
    let rows = stockItems.filter(stockListMatchesSearch).map(item => {
      const v = values.get(item.id) || { qty: 0, value: 0 };
      return { item, qty: v.qty, value: v.value, rate: v.qty > 0 ? v.value / v.qty : null };
    });
    const sortCol = cols.find(c => c.key === _stockListSort.col);
    if (sortCol && _stockListSort.dir) {
      const dir = _stockListSort.dir === 'desc' ? -1 : 1;
      rows = rows.slice().sort((a, b) => {
        if (sortCol.num) {
          const x = sortCol.val(a);
          const y = sortCol.val(b);
          // Items with no stock have no rate: they stay at the bottom either way
          if (x === null || y === null) return x === null ? (y === null ? 0 : 1) : -1;
          return (x - y) * dir;
        }
        return String(sortCol.text(a)).localeCompare(String(sortCol.text(b)), 'en', { numeric: true, sensitivity: 'base' }) * dir;
      });
    }
    return { cols, rows, total: rows.reduce((sum, r) => sum + r.value, 0) };
  }

  function stockListCellHtml(col, r) {
    const it = r.item;
    switch (col.key) {
      case 'code': return `<td style="font-family: monospace; font-weight: 700; color: var(--slate-900);">${ohEscapeHtml(it.sku)}</td>`;
      case 'item': return `<td style="font-weight: 600;">${ohEscapeHtml(it.name)}</td>`;
      case 'group': return `<td><span class="stock-category-badge">${ohEscapeHtml(it.group || 'Inventories')}</span></td>`;
      case 'category': return `<td>${ohEscapeHtml(it.category || '-')}</td>`;
      case 'warehouse': return `<td style="font-size: 12px; color: var(--slate-600);">${ohEscapeHtml(it.location || it.warehouse || '-')}</td>`;
      case 'qty': return `<td style="text-align: right; font-weight: 700; font-size: 13.5px;">${r.qty.toLocaleString('en-IN', { maximumFractionDigits: 4 })}</td>`;
      case 'unit': return `<td>${ohEscapeHtml(it.uom)}</td>`;
      case 'rate': return `<td style="text-align: right; font-weight: 600;">${r.rate === null ? '—' : '₹ ' + formatInr(r.rate)}</td>`;
      case 'value': return `<td style="text-align: right; font-weight: 700; color: var(--slate-900);">₹ ${formatInr(r.value)}</td>`;
      case 'gst': return `<td style="text-align: center;"><span style="font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #eff6ff; color: #1d4ed8;">${it.gst}%</span></td>`;
      default: return '<td></td>';
    }
  }

  // Columns icon and ⋮ (Export) menu for the blue title card while the Item tab is open
  function renderStockListHeaderActions() {
    const optional = STOCK_LIST_COLS.filter(c => !c.main);
    return `
      <div class="stock-head-actions">
        <div class="stock-col-wrap">
          <button type="button" class="rpt-more-btn" id="stockColToggleBtn" title="Columns" aria-label="Columns" aria-haspopup="true" aria-expanded="${_isStockColDropdownOpen}">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
              <path d="M1.5 2.5h13v11h-13zM5.5 2.5v11M10.5 2.5v11" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <div id="stockColDropdown" class="rpt-col-dropdown ${_isStockColDropdownOpen ? 'open' : ''}" style="display: ${_isStockColDropdownOpen ? 'flex' : 'none'}; top: calc(100% + 8px); right: 0; left: auto;">
            ${optional.map(c => `
              <label>
                <input type="checkbox" id="col-stock-${c.key}-check" ${_stockItemOptionalCols[c.key] ? 'checked' : ''} style="accent-color: var(--blue-600); width: 15px; height: 15px; cursor: pointer;"> ${c.label}
              </label>
            `).join('')}
          </div>
        </div>
        ${renderStockMoreMenu()}
      </div>
    `;
  }

  // ⋮ menu (Export → PDF / Excel) shared by the Item tab and Stock Movement title cards
  function renderStockMoreMenu() {
    return `
      <div class="rpt-more-wrap">
        <button class="rpt-more-btn" id="stockMoreBtn" title="More Options" type="button" aria-label="More Options" aria-haspopup="menu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="1.5"></circle>
            <circle cx="12" cy="5" r="1.5"></circle>
            <circle cx="12" cy="19" r="1.5"></circle>
          </svg>
        </button>
        <div class="rpt-more-dropdown" id="stockMoreDropdown">
          <div class="rpt-submenu-wrap" id="stockExportSubmenuWrap">
            <button class="rpt-menu-item rpt-submenu-btn" id="stockExportMenuBtn" type="button">
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
            <div class="rpt-submenu-dropdown" id="stockExportSubmenu">
              <button class="rpt-menu-item" id="stockExportPdf" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                PDF
              </button>
              <button class="rpt-menu-item" id="stockExportExcel" type="button">
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
    `;
  }

  function stockCompanyName() {
    const el = document.getElementById('sidebarCompanyName');
    if (el && el.textContent && el.textContent.trim()) return el.textContent.trim();
    try {
      const saved = JSON.parse(localStorage.getItem('kya_company_details') || 'null');
      if (saved && saved.companyName) return saved.companyName;
    } catch (e) {}
    return 'KYA Accounting';
  }

  // The Stock List as shown (columns, search, sort) for the PDF / Excel export
  function getStockListExportData() {
    const view = getStockListView(getStockItems());
    return {
      companyName: stockCompanyName(),
      method: _stockValMethod === 'fifo' ? 'FIFO' : 'Weighted Average',
      columns: view.cols.map(c => ({
        label: c.label.replace('(₹)', '(INR)'),
        kind: c.key === 'rate' || c.key === 'value' ? 'money' : c.key === 'qty' ? 'qty' : c.key === 'gst' ? 'pct' : 'text'
      })),
      rows: view.rows.map(r => view.cols.map(c => (c.num ? c.val(r) : c.text(r)))),
      totalValue: view.total,
      itemCount: view.rows.length
    };
  }

  function renderStockListSubtab(stockItems) {
    const view = getStockListView(stockItems);
    const sortIcon = key => {
      if (_stockListSort.col !== key || !_stockListSort.dir) return '<span class="stock-sort-ico">⇅</span>';
      return `<span class="stock-sort-ico on">${_stockListSort.dir === 'asc' ? '▲' : '▼'}</span>`;
    };
    const ariaSort = key => (_stockListSort.col === key && _stockListSort.dir) ? (_stockListSort.dir === 'asc' ? 'ascending' : 'descending') : 'none';

    return `
      <!-- Search Toolbar -->
      <div class="stock-filter-toolbar">
        <div class="stock-search-box">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" class="stock-search-input" id="stockSearchInp" placeholder="Search item name, SKU, category, godown..." value="${ohEscapeHtml(_searchQuery)}">
        </div>
      </div>

      <!-- Full-Width Stock Table Card -->
      <div class="stock-table-card">
        <div style="overflow-x: auto;">
          <table class="stock-table">
            <thead>
              <tr>
                ${view.cols.map(c => `
                  <th data-stock-sort="${c.key}" tabindex="0" aria-sort="${ariaSort(c.key)}" title="Sort by ${c.label}"
                      style="${c.key === 'gst' ? 'text-align: center;' : c.num ? 'text-align: right;' : ''}">${c.label}${sortIcon(c.key)}</th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${view.rows.length === 0 ? `
                <tr>
                  <td colspan="${view.cols.length}" class="stock-empty-state">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 8px; color: var(--slate-300);">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <div>${stockItems.length === 0 ? 'No stock items found. Create items from Master Desk or the action bar above.' : 'No stock items match your search criteria.'}</div>
                  </td>
                </tr>
              ` : view.rows.map(r => `<tr>${view.cols.map(c => stockListCellHtml(c, r)).join('')}</tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="stock-table-footer">
          <span>Showing <strong>${view.rows.length}</strong> of <strong>${stockItems.length}</strong> items</span>
          <span style="font-size: 13px; font-weight: 700; color: var(--slate-800);">Total Valuation: ₹ ${formatInr(view.total)}</span>
        </div>
      </div>
    `;
  }

  // ==========================================
  // SUB-TAB 3: STOCK MOVEMENT VIEW (Full Screen with Back Button)
  // ==========================================
  // Period of the Stock Movement report (YYYY-MM-DD); blank = this financial year (1 April) to today
  let _movFrom = '';
  let _movTo = '';
  // Search text (code or item name) and column sort of the report
  let _movSearch = '';
  let _movSort = { col: '', dir: '' };

  function stockMovementPeriod() {
    const today = new Date();
    const pad = n => String(n).padStart(2, '0');
    const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const fyStartYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
    return { from: _movFrom || `${fyStartYear}-04-01`, to: _movTo || todayIso };
  }

  // Quantity movement of each stock item in a period:
  // B/F = stock before the From date; IN = purchases + sales returns; OUT = sales + purchase
  // returns; Adj = receipts (+) and dispatches (−) entered by hand in Stock Hub;
  // Balance = B/F + IN − OUT + Adj.
  function computeStockMovement(stockItems, fromIso, toIso) {
    const from = voucherDateKey(fromIso);
    const to = voucherDateKey(toIso);
    const matchRow = makeStockRowMatcher(stockItems);
    const rows = new Map(stockItems.map(it => [it.id, { item: it, bf: Math.max(0, it.qty), inQ: 0, outQ: 0, adj: 0 }]));

    // Puts a dated change in B/F (before the period) or in its column (inside it)
    const add = (it, dk, col, q) => {
      const r = rows.get(it.id);
      if (dk < from) r.bf += col === 'outQ' ? -q : q;
      else if (dk <= to) r[col] += q;
    };

    const vouchers = stockMovingVouchers();
    vouchers.purchases.forEach(v => {
      const dk = voucherDateKey(v.date);
      (v.rows || []).forEach(row => {
        const it = matchRow(row);
        const qty = parseFloat(row.qty) || 0;
        if (it && qty > 0) add(it, dk, v.isReturn ? 'outQ' : 'inQ', qty);
      });
    });
    vouchers.sales.forEach(v => {
      const dk = voucherDateKey(v.date);
      (v.rows || []).forEach(row => {
        const it = matchRow(row);
        const qty = parseFloat(row.qty) || 0;
        if (it && qty > 0) add(it, dk, v.isReturn ? 'inQ' : 'outQ', qty);
      });
    });

    // Hand-entered receipts / dispatches already changed the master qty, so they are taken back
    // out of the opening and put in on their own dates
    const bySku = new Map(stockItems.map(it => [String(it.sku).toLowerCase(), it]));
    const byName = new Map(stockItems.map(it => [String(it.name).toLowerCase().trim(), it]));
    _stockMovements.forEach(m => {
      if (m.type !== 'inward' && m.type !== 'outward') return;
      const it = bySku.get(String(m.sku || '').toLowerCase()) || byName.get(String(m.itemName || '').toLowerCase().trim());
      if (!it) return;
      const q = (m.type === 'inward' ? 1 : -1) * Math.abs(Number(m.qty) || 0);
      rows.get(it.id).bf -= q;
      add(it, voucherDateKey(m.date), 'adj', q);
    });

    return stockItems.map(it => {
      const r = rows.get(it.id);
      r.bal = r.bf + r.inQ - r.outQ + r.adj;
      return r;
    });
  }

  function fmtMovQty(q) {
    const r = Math.round(q * 10000) / 10000;
    return (r === 0 ? 0 : r).toLocaleString('en-IN', { maximumFractionDigits: 4 });
  }

  // From / To dates and the ⋮ (Export) menu for the blue title card while Movement is open
  function renderStockMovementHeaderActions() {
    const p = stockMovementPeriod();
    return `
      <div class="stock-head-actions">
        <input type="date" id="movFrom" class="cl-glass-control" value="${p.from}" style="width: 125px;" title="From date" aria-label="From date" />
        <input type="date" id="movTo" class="cl-glass-control" value="${p.to}" style="width: 125px;" title="To date" aria-label="To date" />
        ${renderStockMoreMenu()}
      </div>
    `;
  }

  function stockMovementTotals(rows) {
    return rows.reduce((t, r) => {
      t.bf += r.bf; t.inQ += r.inQ; t.outQ += r.outQ; t.adj += r.adj; t.bal += r.bal;
      return t;
    }, { bf: 0, inQ: 0, outQ: 0, adj: 0, bal: 0 });
  }

  // Report columns for sorting: Code and Item sort A–Z, the Qty columns by number
  const MOV_COLS = [
    { key: 'code', label: 'Code', text: r => r.item.sku },
    { key: 'item', label: 'Item', text: r => r.item.name },
    { key: 'bf', label: 'B/F' },
    { key: 'inQ', label: 'IN' },
    { key: 'outQ', label: 'OUT' },
    { key: 'adj', label: 'Adj' },
    { key: 'bal', label: 'Balance' }
  ];

  // What the report shows (and exports): the period, the searched and sorted rows, their totals
  function getStockMovementView(stockItems) {
    const p = stockMovementPeriod();
    const q = _movSearch.toLowerCase().trim();
    let rows = computeStockMovement(stockItems, p.from, p.to)
      .filter(r => !q || r.item.name.toLowerCase().includes(q) || String(r.item.sku).toLowerCase().includes(q));
    const col = MOV_COLS.find(c => c.key === _movSort.col);
    if (col && _movSort.dir) {
      const dir = _movSort.dir === 'desc' ? -1 : 1;
      rows = rows.slice().sort((a, b) => col.text
        ? String(col.text(a)).localeCompare(String(col.text(b)), 'en', { numeric: true, sensitivity: 'base' }) * dir
        : (a[col.key] - b[col.key]) * dir);
    }
    return { period: p, rows, totals: stockMovementTotals(rows) };
  }

  // The Stock Movement report for the PDF / Excel export, as shown (search and sort)
  function getStockMovementExportData() {
    const view = getStockMovementView(getStockItems());
    const t = view.totals;
    const dmy = iso => iso.split('-').reverse().join('-');
    return {
      companyName: stockCompanyName(),
      from: dmy(view.period.from),
      to: dmy(view.period.to),
      rows: view.rows.map(r => [r.item.sku, r.item.name, r.bf, r.inQ, r.outQ, r.adj, r.bal]),
      totals: [t.bf, t.inQ, t.outQ, t.adj, t.bal]
    };
  }

  function renderMovementSubtab(stockItems) {
    const view = getStockMovementView(stockItems);
    const rows = view.rows;
    const t = view.totals;
    const qtyCells = r => [r.bf, r.inQ, r.outQ, r.adj, r.bal].map((q, i) =>
      `<td class="num"${i === 4 ? ' style="font-weight: 700; color: var(--slate-900);"' : ''}>${fmtMovQty(q)}</td>`).join('');
    // Sortable header cell: ⇅ / ▲ / ▼ as on the Item tab
    const th = (key, extra) => {
      const c = MOV_COLS.find(x => x.key === key);
      const on = _movSort.col === key && _movSort.dir;
      const icon = on ? `<span class="stock-sort-ico on">${_movSort.dir === 'asc' ? '▲' : '▼'}</span>` : '<span class="stock-sort-ico">⇅</span>';
      const aria = on ? (_movSort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
      return `<th data-mov-sort="${key}" tabindex="0" aria-sort="${aria}" title="Sort by ${c.label}" ${extra || ''}>${c.label}${icon}</th>`;
    };

    return `
      <div class="stock-mov-toolbar">
        <button type="button" class="kya-back-btn btn-back-to-details" title="Back to Details" aria-label="Back to Details">
          <svg viewBox="0 0 20 20" fill="none" width="18" height="18" aria-hidden="true"><path d="M12.5 15l-5-5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="stock-search-box">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" class="stock-search-input" id="movSearchInp" placeholder="Search code or item name..." value="${ohEscapeHtml(_movSearch)}" aria-label="Search code or item name">
        </div>
      </div>

      <div class="stock-table-card">
        <div style="overflow-x: auto;">
          <table class="stock-table stock-mov-table">
            <thead>
              <tr>
                ${th('code', 'rowspan="2"')}
                ${th('item', 'rowspan="2"')}
                <th colspan="5" class="grp">Qty</th>
              </tr>
              <tr>
                ${['bf', 'inQ', 'outQ', 'adj', 'bal'].map(k => th(k, 'class="num"')).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.length === 0 ? `
                <tr><td colspan="7" class="stock-empty-state">${stockItems.length === 0 ? 'No stock items found. Create items from Master Desk.' : 'No stock items match your search.'}</td></tr>
              ` : rows.map(r => `
                <tr>
                  <td style="font-family: monospace; font-weight: 700; color: var(--slate-900);">${ohEscapeHtml(r.item.sku)}</td>
                  <td style="font-weight: 600;">${ohEscapeHtml(r.item.name)}</td>
                  ${qtyCells(r)}
                </tr>
              `).join('')}
            </tbody>
            ${rows.length ? `
              <tfoot>
                <tr>
                  <td colspan="2">Grand Total</td>
                  ${qtyCells(t)}
                </tr>
              </tfoot>
            ` : ''}
          </table>
        </div>
      </div>
    `;
  }

  // ==========================================
  // SUB-TAB 4: ANALYSIS & VALUATION VIEW (Full Screen with Back Button)
  // ==========================================
  function renderAnalysisSubtab(stockItems) {
    const totalVal = stockItems.reduce((sum, i) => sum + (Math.max(0, i.qty) * i.cost), 0);
    const sortedByVal = [...stockItems].sort((a, b) => (Math.max(0, b.qty) * b.cost) - (Math.max(0, a.qty) * a.cost));

    // ABC Pareto Analysis: class is set by the cumulative share before the item (same rule as the overview)
    let cumulative = 0;
    const abcItems = sortedByVal.map(item => {
      const val = Math.max(0, item.qty) * item.cost;
      const before = totalVal > 0 ? (cumulative / totalVal) * 100 : 100;
      cumulative += val;
      const cumPct = (cumulative / (totalVal || 1)) * 100;
      const category = val <= 0 ? 'C' : before < 70 ? 'A' : before < 90 ? 'B' : 'C';
      return { ...item, val, cumPct, abcClass: category };
    });

    const lowOrOutItems = stockItems.filter(i => i.qty <= i.reorder);

    return `
      <!-- Back Button & Analytics Header Strip -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1.5px solid var(--slate-100); padding-bottom: 14px; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <button type="button" class="kya-back-btn btn-back-to-details" title="Back to Details" aria-label="Back to Details">
            <svg viewBox="0 0 20 20" fill="none" width="18" height="18" aria-hidden="true"><path d="M12.5 15l-5-5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <div style="font-weight: 800; font-size: 16px; color: var(--slate-900);">Stock Valuation & Analytics</div>
        </div>

        <div style="font-size: 12px; font-weight: 600; color: var(--slate-500);">
          ABC Pareto Model & Replenishment Dashboard
        </div>
      </div>

      <!-- Valuation Summary Metric Strip -->
      <div class="stock-kpi-grid">
        <div class="stock-kpi-card">
          <div class="stock-kpi-icon-wrap" style="background: #eff6ff; color: #2563eb;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div class="stock-kpi-content">
            <div class="stock-kpi-label">Weighted Valuation</div>
            <div class="stock-kpi-val">₹ ${formatInr(totalVal)}</div>
            <div class="stock-kpi-sub">Calculated via Cost basis</div>
          </div>
        </div>

        <div class="stock-kpi-card">
          <div class="stock-kpi-icon-wrap" style="background: #ecfdf5; color: #059669;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 18 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
          </div>
          <div class="stock-kpi-content">
            <div class="stock-kpi-label">Estimated Realization</div>
            <div class="stock-kpi-val">₹ ${formatInr(stockItems.reduce((s, i) => s + (i.qty * i.price), 0))}</div>
            <div class="stock-kpi-sub">Total sales turnover potential</div>
          </div>
        </div>

        <div class="stock-kpi-card">
          <div class="stock-kpi-icon-wrap" style="background: #fdf2f8; color: #db2777;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </div>
          <div class="stock-kpi-content">
            <div class="stock-kpi-label">Class A High-Value</div>
            <div class="stock-kpi-val">${abcItems.filter(i => i.abcClass === 'A').length} SKUs</div>
            <div class="stock-kpi-sub">70% of total capital</div>
          </div>
        </div>

        <div class="stock-kpi-card">
          <div class="stock-kpi-icon-wrap" style="background: #fef2f2; color: #dc2626;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            </svg>
          </div>
          <div class="stock-kpi-content">
            <div class="stock-kpi-label">Reorder Urgent</div>
            <div class="stock-kpi-val" style="color: #dc2626;">${lowOrOutItems.length} SKUs</div>
            <div class="stock-kpi-sub">Immediate PO required</div>
          </div>
        </div>
      </div>

      <!-- ABC Classification & Replenishment Full-Width Grid -->
      <div class="stock-details-grid">
        
        <div class="stock-section-card">
          <div class="stock-section-title">
            <span>ABC Pareto Classification</span>
            <span style="font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px; background: #eff6ff; color: #1d4ed8;">Capital Focus</span>
          </div>
          <p style="font-size: 12px; color: var(--slate-500); margin-bottom: 12px;">
            Categorizes stock based on value contribution: <strong>A</strong> (High Value), <strong>B</strong> (Medium), <strong>C</strong> (Low Value).
          </p>
          <div style="overflow-x: auto;">
            <table class="stock-table" style="font-size: 12px;">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Item Name</th>
                  <th style="text-align: right;">Qty</th>
                  <th style="text-align: right;">Valuation</th>
                  <th style="text-align: right;">Share</th>
                </tr>
              </thead>
              <tbody>
                ${abcItems.length === 0 ? `
                  <tr>
                    <td colspan="5" class="stock-empty-state" style="text-align: center; padding: 24px; color: var(--slate-400);">
                      No stock items available for analysis.
                    </td>
                  </tr>
                ` : abcItems.slice(0, 8).map(i => {
                  let badgeStyle = 'background: #eff6ff; color: #1d4ed8;';
                  if (i.abcClass === 'B') badgeStyle = 'background: #ecfdf5; color: #047857;';
                  if (i.abcClass === 'C') badgeStyle = 'background: #f8fafc; color: #64748b;';
                  const pct = ((i.val / (totalVal || 1)) * 100).toFixed(1);

                  return `
                    <tr>
                      <td><span style="font-weight: 800; font-size: 11px; padding: 2px 7px; border-radius: 4px; ${badgeStyle}">Class ${i.abcClass}</span></td>
                      <td style="font-weight: 600;">${ohEscapeHtml(i.name)}</td>
                      <td style="text-align: right;">${i.qty}</td>
                      <td style="text-align: right; font-weight: 700;">₹ ${formatInr(i.val)}</td>
                      <td style="text-align: right; color: var(--slate-500);">${pct}%</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Replenishment Recommendations -->
        <div class="stock-section-card">
          <div class="stock-section-title">
            <span>Reorder & Replenishment Alert</span>
            <span style="font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px; background: #fef2f2; color: #dc2626;">Action Required</span>
          </div>
          <p style="font-size: 12px; color: var(--slate-500); margin-bottom: 12px;">
            Suggested purchase quantities calculated to reach safe buffer above minimum reorder points.
          </p>
          <div style="overflow-x: auto;">
            <table class="stock-table" style="font-size: 12px;">
              <thead>
                <tr>
                  <th>Item</th>
                  <th style="text-align: right;">On Hand</th>
                  <th style="text-align: right;">Min Level</th>
                  <th style="text-align: right;">Suggested PO</th>
                  <th style="text-align: right;">Est. Cost</th>
                </tr>
              </thead>
              <tbody>
                ${stockItems.length === 0 ? `
                  <tr><td colspan="5" style="text-align: center; color: var(--slate-400); padding: 20px;">No stock items recorded yet.</td></tr>
                ` : lowOrOutItems.length === 0 ? `
                  <tr><td colspan="5" style="text-align: center; color: #047857; padding: 20px;">All items are at optimal stock levels!</td></tr>
                ` : lowOrOutItems.map(i => {
                  const suggestedPo = Math.max(i.reorder * 2 - i.qty, i.reorder);
                  const estCost = suggestedPo * i.cost;
                  return `
                    <tr>
                      <td style="font-weight: 600; color: #b91c1c;">${ohEscapeHtml(i.name)}</td>
                      <td style="text-align: right; font-weight: 700; color: ${i.qty === 0 ? '#dc2626' : '#d97706'};">${i.qty}</td>
                      <td style="text-align: right;">${i.reorder}</td>
                      <td style="text-align: right; font-weight: 700; color: #2563eb;">+${suggestedPo} ${i.uom}</td>
                      <td style="text-align: right; font-weight: 600;">₹ ${formatInr(estCost)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  }

  // ==========================================
  // TOP MASTER VIEWS: Item, Group, Category, Unit, Warehouse
  // ==========================================
  function renderMasterItemView(stockItems) {
    return renderStockListSubtab(stockItems);
  }

  function renderMasterGroupView() {
    const groups = getStockGroups();
    const items = getStockItems();

    function getLinkedItemsForGroup(targetGroup, allGroups, allItems) {
      const groupNames = new Set([
        targetGroup.name.toLowerCase().trim(),
        (targetGroup.id || '').toLowerCase().trim(),
        ...(targetGroup.aliases || []).map(a => a.toLowerCase().trim())
      ]);

      let added = true;
      while (added) {
        added = false;
        allGroups.forEach(otherG => {
          if (!groupNames.has(otherG.name.toLowerCase().trim())) {
            const p = (otherG.parent || '').toLowerCase().trim();
            if (p && groupNames.has(p)) {
              groupNames.add(otherG.name.toLowerCase().trim());
              groupNames.add((otherG.id || '').toLowerCase().trim());
              added = true;
            }
          }
        });
      }

      return allItems.filter(i => {
        if (!i.group) return false;
        const itemGrp = i.group.toLowerCase().trim();
        const itemGrpId = (i.groupId || '').toLowerCase().trim();
        return groupNames.has(itemGrp) || groupNames.has(itemGrpId);
      });
    }

    let totalAllGroupsVal = 0;
    const groupRowsData = groups.map(g => {
      const linked = getLinkedItemsForGroup(g, groups, items);
      const groupVal = linked.reduce((sum, i) => sum + (Number(i.qty || 0) * Number(i.cost || i.rate || 0)), 0);
      totalAllGroupsVal += groupVal;
      return { g, linked, groupVal, parentText: g.parent || 'Inventories' };
    });

    return `
      <div class="stock-table-card">
        <div style="overflow-x: auto;">
          <table class="stock-table">
            <thead>
              <tr>
                <th>Group Name</th>
                <th>Parent Group</th>
                <th>Add Quantities</th>
                <th style="text-align: right;">Linked Items</th>
                <th style="text-align: right;">Total Group Value</th>
              </tr>
            </thead>
            <tbody>
              ${groups.length === 0 ? `
                <tr>
                  <td colspan="5" class="stock-empty-state">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 8px; color: var(--slate-300);">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <div>No stock groups found. Create groups from Master Desk.</div>
                  </td>
                </tr>
              ` : groupRowsData.map(({ g, linked, groupVal, parentText }) => {
                return `
                  <tr>
                    <td>
                      <div style="font-weight: 700; font-size: 13.5px; color: var(--slate-900);">${ohEscapeHtml(g.name)}</div>
                    </td>
                    <td><span class="stock-category-badge" style="background: #eff6ff; color: #1d4ed8; font-weight: 600;">${ohEscapeHtml(parentText)}</span></td>
                    <td><span class="stock-status-pill stock-status-in">${g.addQty || 'Yes'}</span></td>
                    <td style="text-align: right; font-weight: 700;">${linked.length} ${linked.length === 1 ? 'SKU' : 'SKUs'}</td>
                    <td style="text-align: right; font-weight: 700; color: #1e3a8a;">₹ ${formatInr(groupVal)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${groups.length > 0 ? `
          <div class="stock-table-footer">
            <span>Showing <strong>${groups.length}</strong> Stock Groups</span>
            <span style="font-size: 13px; font-weight: 700; color: var(--slate-800);">Total Valuation: ₹ ${formatInr(totalAllGroupsVal)}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderMasterCategoryView() {
    const categories = getStockCategories();
    const items = getStockItems();

    return `
      <div class="stock-table-card">
        <table class="stock-table">
          <thead>
            <tr>
              <th>Category Name</th>
              <th>Parent</th>
              <th>Description</th>
              <th style="text-align: right;">Item Count</th>
            </tr>
          </thead>
          <tbody>
            ${categories.length === 0 ? `
              <tr>
                <td colspan="4" style="text-align: center; color: var(--slate-400); padding: 24px;">No stock categories found. Manage categories in Master Desk.</td>
              </tr>
            ` : categories.map(c => {
              const count = items.filter(i => i.category === c.name).length;
              return `
                <tr>
                  <td style="font-weight: 700; color: var(--slate-900);">${ohEscapeHtml(c.name)}</td>
                  <td style="color: var(--slate-500);">${ohEscapeHtml(c.parent || 'Primary')}</td>
                  <td style="color: var(--slate-600); font-size: 12.5px;">${ohEscapeHtml(c.desc || '-')}</td>
                  <td style="text-align: right; font-weight: 700;">${count} Items</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderMasterUnitView() {
    const units = getStockUnits();

    return `
      <div class="stock-table-card">
        <table class="stock-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Formal Name</th>
              <th>Type</th>
              <th>UQC Code (GST)</th>
              <th style="text-align: center;">Decimal Places</th>
            </tr>
          </thead>
          <tbody>
            ${units.length === 0 ? `
              <tr>
                <td colspan="5" style="text-align: center; color: var(--slate-400); padding: 24px;">No units of measurement found. Manage units in Master Desk.</td>
              </tr>
            ` : units.map(u => `
              <tr>
                <td style="font-weight: 800; font-size: 13.5px; color: #1d4ed8;">${ohEscapeHtml(u.symbol)}</td>
                <td style="font-weight: 600; color: var(--slate-800);">${ohEscapeHtml(u.formalName || '-')}</td>
                <td><span class="stock-category-badge">${ohEscapeHtml(u.type || 'Simple')}</span></td>
                <td style="font-family: monospace; font-weight: 600;">${ohEscapeHtml(u.uqc || '-')}</td>
                <td style="text-align: center; font-weight: 700;">${u.decimalPlaces !== undefined ? u.decimalPlaces : 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function getLinkedItemsForWarehouse(targetWh, allWarehouses, allItems) {
    if (!targetWh || !allItems || !Array.isArray(allItems)) return [];

    const whIdentifiers = new Set();
    const addWhKeys = (wh) => {
      if (!wh) return;
      if (wh.id) whIdentifiers.add(String(wh.id).toLowerCase().trim());
      if (wh.name) whIdentifiers.add(String(wh.name).toLowerCase().trim());
      if (wh.code) whIdentifiers.add(String(wh.code).toLowerCase().trim());
      if (Array.isArray(wh.aliases)) {
        wh.aliases.forEach(a => {
          if (a && String(a).trim()) whIdentifiers.add(String(a).toLowerCase().trim());
        });
      }
    };

    addWhKeys(targetWh);

    if (Array.isArray(allWarehouses)) {
      let added = true;
      while (added) {
        added = false;
        allWarehouses.forEach(otherWh => {
          const parentName = (otherWh.parent || '').toLowerCase().trim();
          if (parentName && parentName !== 'primary' && whIdentifiers.has(parentName)) {
            const beforeSize = whIdentifiers.size;
            addWhKeys(otherWh);
            if (whIdentifiers.size > beforeSize) {
              added = true;
            }
          }
        });
      }
    }

    return allItems.filter(item => {
      if (!item) return false;
      const itemWh = (item.warehouse || item.location || '').toLowerCase().trim();
      const itemWhId = (item.warehouseId || item.locationId || '').toLowerCase().trim();

      if (!itemWh && !itemWhId) return false;

      if (itemWh && whIdentifiers.has(itemWh)) return true;
      if (itemWhId && whIdentifiers.has(itemWhId)) return true;

      for (const idf of whIdentifiers) {
        if (idf.length >= 2) {
          if (itemWh === idf) return true;
          if (itemWh.includes(`(${idf})`) || itemWh.includes(`[${idf}]`) || itemWh.endsWith(` ${idf}`)) return true;
        }
      }

      return false;
    });
  }

  function renderMasterWarehouseView() {
    const warehouses = getStockWarehouses();
    const items = getStockItems();

    let totalAllWarehousesVal = 0;
    const warehouseRowsData = warehouses.map(w => {
      const linked = getLinkedItemsForWarehouse(w, warehouses, items);
      const totalVal = linked.reduce((sum, i) => {
        const q = Number(i.qty) || 0;
        const c = Number(i.cost !== undefined ? i.cost : (i.rate !== undefined ? i.rate : 0)) || 0;
        return sum + (q * c);
      }, 0);
      totalAllWarehousesVal += totalVal;
      return { w, linked, totalVal };
    });

    return `
      <div class="stock-table-card">
        <div style="overflow-x: auto;">
          <table class="stock-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Location</th>
                <th style="text-align: right;">Stored SKUs</th>
                <th style="text-align: right;">Valuation</th>
              </tr>
            </thead>
            <tbody>
              ${warehouses.length === 0 ? `
                <tr>
                  <td colspan="5" class="stock-empty-state">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 8px; color: var(--slate-300);">
                      <path d="M3 21h18"></path>
                      <path d="M5 21V7l7-4 7 4v14"></path>
                      <path d="M9 21v-8a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v8"></path>
                    </svg>
                    <div>No warehouses found. Manage warehouses in Master Desk.</div>
                  </td>
                </tr>
              ` : warehouseRowsData.map(({ w, linked, totalVal }) => {
                return `
                  <tr class="stock-warehouse-row" data-wh-id="${ohEscapeHtml(w.id || w.code || w.name)}" style="cursor: pointer;" title="Click to view address and details">
                    <td>
                      <span class="stock-category-badge" style="background: #eff6ff; color: #1d4ed8; font-weight: 700;">${ohEscapeHtml(w.code || '-')}</span>
                    </td>
                    <td>
                      <div style="font-weight: 700; font-size: 13.5px; color: var(--slate-900);">${ohEscapeHtml(w.name)}</div>
                    </td>
                    <td>
                      <span style="color: var(--slate-600); font-weight: 500;">${ohEscapeHtml(w.parent || 'Primary')}</span>
                    </td>
                    <td style="text-align: right; font-weight: 700; color: var(--slate-800);">${linked.length} ${linked.length === 1 ? 'SKU' : 'SKUs'}</td>
                    <td style="text-align: right; font-weight: 700; color: #1e3a8a;">₹ ${formatInr(totalVal)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${warehouses.length > 0 ? `
          <div class="stock-table-footer">
            <span>Showing <strong>${warehouses.length}</strong> Warehouses</span>
            <span style="font-size: 13px; font-weight: 700; color: var(--slate-800);">Total Valuation: ₹ ${formatInr(totalAllWarehousesVal)}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  // ==========================================
  // MAIN PANEL RENDERER
  // ==========================================
  function renderStockHubPanel() {
    injectStockHubStyles();
    const panel = document.getElementById('panel-stock-hub');
    if (!panel) return;

    const stockItems = getStockItems();
    const isMovementView = _activeTopTab === 'overview' && _activeLeftSubtab === 'movement';

    // Determine Main Content HTML based on _activeTopTab and _activeLeftSubtab
    let bodyContentHtml = '';

    if (_activeTopTab === 'overview') {
      if (_activeLeftSubtab === 'details') {
        // Normal split view: KeepOne Left Sidebar + Details Content
        bodyContentHtml = `
          <div class="oh-layout">
            <!-- Left: KeepOne-Style Sub-Navigation Tabs -->
            ${renderKeepOneLeftSidebar(stockItems)}

            <!-- Right: Content Panels Area -->
            <div class="oh-content-area" id="stockHubContentArea" style="min-height: 480px; padding: 24px;">
              ${renderDetailsSubtab(stockItems)}
            </div>
          </div>
        `;
      } else {
        // Full screen view with Back button for Movement and Analysis
        let subtabHtml = '';
        if (_activeLeftSubtab === 'movement') {
          subtabHtml = renderMovementSubtab(stockItems);
        } else if (_activeLeftSubtab === 'analysis') {
          subtabHtml = renderAnalysisSubtab(stockItems);
        }

        bodyContentHtml = `
          <div class="oh-layout full-width" style="grid-template-columns: 1fr;">
            <div class="oh-content-area" id="stockHubContentArea" style="min-height: 480px; padding: 24px; width: 100%; box-sizing: border-box;">
              ${subtabHtml}
            </div>
          </div>
        `;
      }
    } else if (_activeTopTab === 'item') {
      bodyContentHtml = renderMasterItemView(stockItems);
    } else if (_activeTopTab === 'group') {
      bodyContentHtml = renderMasterGroupView();
    } else if (_activeTopTab === 'category') {
      bodyContentHtml = renderMasterCategoryView();
    } else if (_activeTopTab === 'unit') {
      bodyContentHtml = renderMasterUnitView();
    } else if (_activeTopTab === 'warehouse') {
      bodyContentHtml = renderMasterWarehouseView();
    }

    panel.innerHTML = `
      <div class="stock-hub-wrapper">
        
        <!-- Top Action Navigation Bar -->
        ${renderTopActionBar()}

        <!-- Form Card (Matching Accounting & OneHub Voucher Container) -->
        <div class="je-form-card">
          
          <!-- Blue Gradient Title Card Header -->
          <div class="je-card-header" style="background: linear-gradient(90deg, var(--blue-700), var(--blue-500)); flex-wrap: wrap; gap: 12px;">
            <div class="je-card-header-left">
              <div class="je-card-icon" aria-hidden="true" style="background: rgba(255,255,255,.18);">
                <svg viewBox="0 0 20 20" fill="none">
                  <path d="M10 2.5L3.5 6.25V13.75L10 17.5L16.5 13.75V6.25L10 2.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
                  <path d="M10 2.5V17.5" stroke="currentColor" stroke-width="1.4"/>
                  <path d="M3.5 6.25L10 10L16.5 6.25" stroke="currentColor" stroke-width="1.4"/>
                </svg>
              </div>
              <div>
                <div class="je-card-title-text">${isMovementView ? 'Stock Movement' : 'Stock Hub'}</div>
                <div class="je-card-subtitle-text">Real-time inventory levels, stock valuation, godown logistics and analytics</div>
              </div>
            </div>
            ${_activeTopTab === 'item' ? renderStockListHeaderActions() : isMovementView ? renderStockMovementHeaderActions() : ''}
          </div>

          <!-- Card Body -->
          <div class="sho-shell-body" style="padding: 24px 28px;">
            ${bodyContentHtml}
          </div>

        </div>

      </div>
    `;

    // Attach Event Listeners
    attachStockHubEvents(panel);
  }

  // ==========================================
  // EVENT LISTENERS & MODALS
  // ==========================================
  function attachStockHubEvents(panel) {
    // 1. Top Action Bar clicks
    panel.querySelectorAll('.btn-stock-action[data-top-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        _activeTopTab = btn.dataset.topTab;
        renderStockHubPanel();
      });
    });

    // 2. Left Sidebar Sub-tab clicks (KeepOne oh-sub-tab)
    panel.querySelectorAll('.oh-sub-tab[data-subtab]').forEach(btn => {
      btn.addEventListener('click', () => {
        _activeLeftSubtab = btn.dataset.subtab;
        renderStockHubPanel();
      });
    });

    // 3. Back to Details Button clicks
    panel.querySelectorAll('.btn-back-to-details').forEach(btn => {
      btn.addEventListener('click', () => {
        _activeLeftSubtab = 'details';
        renderStockHubPanel();
      });
    });

    // Details jump to movements
    const viewAllMovBtn = panel.querySelector('#btnDetailsViewAllMovements');
    if (viewAllMovBtn) {
      viewAllMovBtn.addEventListener('click', () => {
        _activeLeftSubtab = 'movement';
        renderStockHubPanel();
      });
    }

    // 4. Search & Columns inputs
    const searchInp = panel.querySelector('#stockSearchInp');
    if (searchInp) {
      searchInp.addEventListener('input', (e) => {
        _searchQuery = e.target.value.toLowerCase().trim();
        renderStockHubPanel();
        const reInp = document.getElementById('stockSearchInp');
        if (reInp) {
          reInp.focus();
          reInp.setSelectionRange(reInp.value.length, reInp.value.length);
        }
      });
    }

    const colToggleBtn = panel.querySelector('#stockColToggleBtn');
    const colDropdown = panel.querySelector('#stockColDropdown');
    if (colToggleBtn && colDropdown) {
      colToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeStockMoreMenu();
        _isStockColDropdownOpen = !_isStockColDropdownOpen;
        colToggleBtn.setAttribute('aria-expanded', String(_isStockColDropdownOpen));
        colDropdown.style.display = _isStockColDropdownOpen ? 'flex' : 'none';
        colDropdown.classList.toggle('open', _isStockColDropdownOpen);
      });
    }

    Object.keys(_stockItemOptionalCols).forEach(col => {
      const chk = panel.querySelector(`#col-stock-${col}-check`);
      if (chk) {
        chk.addEventListener('change', (e) => {
          _stockItemOptionalCols[col] = e.target.checked;
          renderStockHubPanel();
        });
      }
    });

    // Stock List sort: a header click goes ascending → descending → off
    panel.querySelectorAll('th[data-stock-sort]').forEach(th => {
      const cycle = () => {
        const key = th.dataset.stockSort;
        if (_stockListSort.col !== key) _stockListSort = { col: key, dir: 'asc' };
        else if (_stockListSort.dir === 'asc') _stockListSort = { col: key, dir: 'desc' };
        else _stockListSort = { col: '', dir: '' };
        renderStockHubPanel();
      };
      th.addEventListener('click', cycle);
      th.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycle(); }
      });
    });

    // Stock List ⋮ menu: Export → PDF / Excel of the list as shown
    const moreBtn = panel.querySelector('#stockMoreBtn');
    const moreDropdown = panel.querySelector('#stockMoreDropdown');
    const exportWrap = panel.querySelector('#stockExportSubmenuWrap');
    const exportBtn = panel.querySelector('#stockExportMenuBtn');
    const exportSubmenu = panel.querySelector('#stockExportSubmenu');
    if (moreBtn && moreDropdown) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = moreDropdown.classList.contains('active');
        closeStockMoreMenu();
        if (colDropdown && _isStockColDropdownOpen) {
          _isStockColDropdownOpen = false;
          colDropdown.style.display = 'none';
          colDropdown.classList.remove('open');
        }
        if (!isOpen) moreDropdown.classList.add('active');
      });
    }
    if (exportWrap && exportBtn && exportSubmenu) {
      let closeTimer = null;
      exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        exportSubmenu.classList.toggle('active');
      });
      exportWrap.addEventListener('mouseenter', () => {
        if (closeTimer) clearTimeout(closeTimer);
        exportSubmenu.classList.add('active');
      });
      exportWrap.addEventListener('mouseleave', () => {
        closeTimer = setTimeout(() => exportSubmenu.classList.remove('active'), 300);
      });
    }
    // The ⋮ export follows the open view: Stock Movement report or the Item list
    const isMovementView = _activeTopTab === 'overview' && _activeLeftSubtab === 'movement';
    [['#stockExportPdf', 'PDF'], ['#stockExportExcel', 'Excel']].forEach(([sel, kind]) => {
      const btn = panel.querySelector(sel);
      if (!btn) return;
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        closeStockMoreMenu();
        const fn = isMovementView ? 'exportStockMovementTo' + kind : 'exportStockListTo' + kind;
        if (typeof window[fn] === 'function') {
          await window[fn](isMovementView ? getStockMovementExportData() : getStockListExportData());
        }
      });
    });

    // Stock Movement: search by code or item name, keeping the cursor in the box as it redraws
    const movSearch = panel.querySelector('#movSearchInp');
    if (movSearch) {
      movSearch.addEventListener('input', (e) => {
        _movSearch = e.target.value;
        renderStockHubPanel();
        const re = document.getElementById('movSearchInp');
        if (re) {
          re.focus();
          re.setSelectionRange(re.value.length, re.value.length);
        }
      });
    }

    // Stock Movement sort: a header click goes ascending → descending → off
    panel.querySelectorAll('th[data-mov-sort]').forEach(th => {
      const cycle = () => {
        const key = th.dataset.movSort;
        if (_movSort.col !== key) _movSort = { col: key, dir: 'asc' };
        else if (_movSort.dir === 'asc') _movSort = { col: key, dir: 'desc' };
        else _movSort = { col: '', dir: '' };
        renderStockHubPanel();
      };
      th.addEventListener('click', cycle);
      th.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycle(); }
      });
    });

    // Stock Movement: From / To dates (as on the Balance Sheet); the other date moves along if they cross
    ['#movFrom', '#movTo'].forEach((sel, i) => {
      const inp = panel.querySelector(sel);
      if (!inp) return;
      inp.addEventListener('change', () => {
        if (!inp.value) return;
        const p = stockMovementPeriod();
        if (i === 0) {
          _movFrom = inp.value;
          _movTo = inp.value > p.to ? inp.value : p.to;
        } else {
          _movTo = inp.value;
          _movFrom = inp.value < p.from ? inp.value : p.from;
        }
        renderStockHubPanel();
      });
    });

    panel.querySelectorAll('.btn-view-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = btn.dataset.id;
        openItemDetailsModal(itemId);
      });
    });

    panel.querySelectorAll('.stock-warehouse-row').forEach(row => {
      row.addEventListener('click', () => {
        const whId = row.dataset.whId;
        if (whId) openWarehouseDetailsModal(whId);
      });
    });

    const createItemBtn = panel.querySelector('#btnOpenCreateItemModal');
    if (createItemBtn) {
      createItemBtn.addEventListener('click', () => openCreateStockItemModal());
    }

    const createGroupBtn = panel.querySelector('#btnOpenCreateGroupModal');
    if (createGroupBtn) {
      createGroupBtn.addEventListener('click', () => openCreateStockGroupModal());
    }

    const createCatBtn = panel.querySelector('#btnOpenCreateCategoryModal');
    if (createCatBtn) {
      createCatBtn.addEventListener('click', () => openCreateStockCategoryModal());
    }

    const createUnitBtn = panel.querySelector('#btnOpenCreateUnitModal');
    if (createUnitBtn) {
      createUnitBtn.addEventListener('click', () => openCreateStockUnitModal());
    }

    const createWhBtn = panel.querySelector('#btnOpenCreateWarehouseModal');
    if (createWhBtn) {
      createWhBtn.addEventListener('click', () => openCreateStockWarehouseModal());
    }

    // Details: Wt. Avg / FIFO switch on the Stock Valuation card
    panel.querySelectorAll('[data-shd-method]').forEach(btn => {
      btn.addEventListener('click', () => {
        _stockValMethod = btn.dataset.shdMethod === 'fifo' ? 'fifo' : 'avg';
        try { localStorage.setItem(KYA_STOCK_VAL_METHOD_KEY, _stockValMethod); } catch (e) {}
        renderStockHubPanel();
      });
    });

    // Details: Sales / Returns / Purchase calendar
    attachShdCalendarEvents(panel);
  }

  // ==========================================
  // MODALS
  // ==========================================
  function openItemDetailsModal(itemId) {
    const stockItems = getStockItems();
    const item = stockItems.find(i => i.id === itemId);
    if (!item) return;

    const status = getStockStatus(item);
    const valuation = item.qty * item.cost;
    const potentialRealization = item.qty * item.price;

    const overlay = document.createElement('div');
    overlay.className = 'stock-modal-overlay';
    overlay.innerHTML = `
      <div class="stock-modal-box" style="max-width: 500px;">
        <div class="stock-modal-header">
          <div>
            <div style="font-weight: 700; font-size: 15px;">${ohEscapeHtml(item.name)}</div>
            <div style="font-size: 11px; opacity: 0.85; font-family: monospace;">${item.sku}</div>
          </div>
          <button type="button" id="closeDetailsModal" style="background: none; border: none; color: #fff; font-size: 18px; cursor: pointer;">&times;</button>
        </div>
        <div class="stock-modal-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
            <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div style="font-size: 11px; color: var(--slate-500); font-weight: 600; text-transform: uppercase;">Current Stock</div>
              <div style="font-size: 20px; font-weight: 800; color: var(--slate-900);">${item.qty} ${item.uom}</div>
              <span class="stock-status-pill ${status.cls}" style="margin-top: 4px;">${status.label}</span>
            </div>
            <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div style="font-size: 11px; color: var(--slate-500); font-weight: 600; text-transform: uppercase;">Stock Valuation</div>
              <div style="font-size: 20px; font-weight: 800; color: var(--slate-900);">₹ ${formatInr(valuation)}</div>
              <div style="font-size: 11px; color: var(--slate-400); margin-top: 4px;">@ ₹ ${formatInr(item.cost)}/unit</div>
            </div>
          </div>

          <table style="width: 100%; font-size: 12.5px; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: var(--slate-500);">Category:</td><td style="font-weight: 600; text-align: right;">${ohEscapeHtml(item.category)}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: var(--slate-500);">Group:</td><td style="font-weight: 600; text-align: right;">${ohEscapeHtml(item.group || 'General')}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: var(--slate-500);">Primary Godown:</td><td style="font-weight: 600; text-align: right;">${ohEscapeHtml(item.location || item.warehouse)}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: var(--slate-500);">Reorder Threshold:</td><td style="font-weight: 600; text-align: right;">${item.reorder} ${item.uom}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: var(--slate-500);">Selling Price:</td><td style="font-weight: 600; color: #047857; text-align: right;">₹ ${formatInr(item.price)}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; color: var(--slate-500);">Est. Realization:</td><td style="font-weight: 700; text-align: right;">₹ ${formatInr(potentialRealization)}</td></tr>
            <tr><td style="padding: 8px 0; color: var(--slate-500);">GST Tax Rate:</td><td style="font-weight: 600; text-align: right;">${item.gst || 18}%</td></tr>
          </table>
        </div>
        <div class="stock-modal-footer">
          <button type="button" class="btn btn-primary" id="btnDetailsClose">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#closeDetailsModal').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#btnDetailsClose').addEventListener('click', () => overlay.remove());
  }

  function openWarehouseDetailsModal(warehouseId) {
    const warehouses = getStockWarehouses();
    const wh = warehouses.find(w => w.id === warehouseId || w.code === warehouseId || w.name === warehouseId);
    if (!wh) return;

    const items = getStockItems();
    const linked = getLinkedItemsForWarehouse(wh, warehouses, items);
    const totalUnits = linked.reduce((sum, i) => sum + (Number(i.qty) || 0), 0);
    const totalVal = linked.reduce((sum, i) => {
      const q = Number(i.qty) || 0;
      const c = Number(i.cost !== undefined ? i.cost : (i.rate !== undefined ? i.rate : 0)) || 0;
      return sum + (q * c);
    }, 0);

    const overlay = document.createElement('div');
    overlay.className = 'stock-modal-overlay';
    overlay.innerHTML = `
      <div class="stock-modal-box" style="max-width: 520px;">
        <div class="stock-modal-header">
          <div>
            <div style="font-weight: 700; font-size: 15px; display: flex; align-items: center; gap: 8px;">
              ${ohEscapeHtml(wh.name)}
              ${wh.code ? `<span class="stock-category-badge" style="background: rgba(255,255,255,0.2); color: #fff; font-size: 11px; font-weight: 700;">${ohEscapeHtml(wh.code)}</span>` : ''}
            </div>
            <div style="font-size: 11.5px; opacity: 0.85; margin-top: 2px;">Warehouse & Storage Facility Details</div>
          </div>
          <button type="button" id="closeWhDetailsModal" style="background: none; border: none; color: #fff; font-size: 18px; cursor: pointer;">&times;</button>
        </div>
        <div class="stock-modal-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
            <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div style="font-size: 11px; color: var(--slate-500); font-weight: 600; text-transform: uppercase;">Stored Inventory</div>
              <div style="font-size: 20px; font-weight: 800; color: var(--slate-900);">${linked.length} <span style="font-size: 13px; font-weight: 600; color: var(--slate-500);">SKUs (${totalUnits} units)</span></div>
              <span class="stock-status-pill stock-status-in" style="margin-top: 4px;">Active Facility</span>
            </div>
            <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <div style="font-size: 11px; color: var(--slate-500); font-weight: 600; text-transform: uppercase;">Total Valuation</div>
              <div style="font-size: 20px; font-weight: 800; color: #1e3a8a;">₹ ${formatInr(totalVal)}</div>
              <div style="font-size: 11px; color: var(--slate-400); margin-top: 4px;">Under: ${ohEscapeHtml(wh.parent || 'Primary')}</div>
            </div>
          </div>

          <div style="font-size: 12.5px; font-weight: 700; color: var(--slate-800); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            Address & Location Details
          </div>

          <table style="width: 100%; font-size: 12.5px; border-collapse: collapse; margin-bottom: 16px;">
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 7px 0; color: var(--slate-500); width: 35%;">Under Location:</td><td style="font-weight: 600; text-align: right;">${ohEscapeHtml(wh.parent || 'Primary')}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 7px 0; color: var(--slate-500);">Street Address:</td><td style="font-weight: 600; text-align: right;">${ohEscapeHtml(wh.address || '-')}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 7px 0; color: var(--slate-500);">City / Town:</td><td style="font-weight: 600; text-align: right;">${ohEscapeHtml(wh.city || '-')}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 7px 0; color: var(--slate-500);">State / PIN:</td><td style="font-weight: 600; text-align: right;">${ohEscapeHtml([wh.state, wh.pincode].filter(Boolean).join(' - ') || '-')}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 7px 0; color: var(--slate-500);">Country:</td><td style="font-weight: 600; text-align: right;">${ohEscapeHtml(wh.country || 'India')}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 7px 0; color: var(--slate-500);">Supervisor / Manager:</td><td style="font-weight: 600; text-align: right;">${ohEscapeHtml(wh.supervisor || 'Not assigned')}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 7px 0; color: var(--slate-500);">Storage Type:</td><td style="font-weight: 600; text-align: right;">${ohEscapeHtml(wh.type || 'General Storage')}</td></tr>
            <tr><td style="padding: 7px 0; color: var(--slate-500);">Also Known As:</td><td style="font-weight: 600; text-align: right;">${ohEscapeHtml(wh.aliases && wh.aliases.length ? wh.aliases.join(', ') : '-')}</td></tr>
          </table>

          ${linked.length > 0 ? `
            <div style="font-size: 12.5px; font-weight: 700; color: var(--slate-800); margin-bottom: 8px;">Stored SKUs (${linked.length})</div>
            <div style="max-height: 140px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; background: #fff;">
              ${linked.map(item => `
                <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px;">
                  <span style="font-weight: 600; color: var(--slate-800);">${ohEscapeHtml(item.name)}${item.sku ? ` <span style="font-size: 11px; color: var(--slate-400);">(${item.sku})</span>` : ''}</span>
                  <span style="font-weight: 700; color: var(--slate-700);">${item.qty} ${item.uom || ''}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
        <div class="stock-modal-footer">
          <button type="button" class="btn btn-primary" id="btnWhDetailsClose">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#closeWhDetailsModal').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#btnWhDetailsClose').addEventListener('click', () => overlay.remove());
  }

  function openCreateStockItemModal() {
    const groups = getStockGroups();
    const categories = getStockCategories();
    const units = getStockUnits();
    const warehouses = getStockWarehouses();

    const overlay = document.createElement('div');
    overlay.className = 'stock-modal-overlay';
    overlay.innerHTML = `
      <div class="stock-modal-box">
        <div class="stock-modal-header">
          <div style="font-weight: 700; font-size: 15px;">Create New Stock Item</div>
          <button type="button" id="closeCreateModal" style="background: none; border: none; color: #fff; font-size: 18px; cursor: pointer;">&times;</button>
        </div>
        <div class="stock-modal-body">
          <div class="stock-form-fg">
            <label class="stock-form-label">Item Name *</label>
            <input type="text" class="stock-form-input" id="newItemName" placeholder="e.g. Pure Silk Fabric (Navy)">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="stock-form-fg">
              <label class="stock-form-label">SKU / Item Code</label>
              <input type="text" class="stock-form-input" id="newItemSku" placeholder="e.g. RAW-SLK-01" style="text-transform: uppercase;">
            </div>
            <div class="stock-form-fg">
              <label class="stock-form-label">Stock Group *</label>
              <select class="stock-form-select" id="newItemGroup">
                ${groups.map(g => `<option value="${ohEscapeHtml(g.name)}">${ohEscapeHtml(g.name)}</option>`).join('')}
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="stock-form-fg">
              <label class="stock-form-label">Stock Category</label>
              <select class="stock-form-select" id="newItemCategory">
                ${categories.map(c => `<option value="${ohEscapeHtml(c.name)}">${ohEscapeHtml(c.name)}</option>`).join('')}
              </select>
            </div>
            <div class="stock-form-fg">
              <label class="stock-form-label">Unit of Measure (UOM) *</label>
              <select class="stock-form-select" id="newItemUom">
                ${units.map(u => `<option value="${ohEscapeHtml(u.symbol)}">${ohEscapeHtml(u.formalName)} (${ohEscapeHtml(u.symbol)})</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="stock-form-fg">
            <label class="stock-form-label">Default Warehouse / Location *</label>
            <select class="stock-form-select" id="newItemWh">
              ${warehouses.map(w => `<option value="${ohEscapeHtml(w.name)}">${ohEscapeHtml(w.name)}</option>`).join('')}
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
            <div class="stock-form-fg">
              <label class="stock-form-label">Opening Qty</label>
              <input type="number" min="0" class="stock-form-input" id="newItemQty" value="0">
            </div>
            <div class="stock-form-fg">
              <label class="stock-form-label">Cost Rate (₹)</label>
              <input type="number" min="0" step="0.01" class="stock-form-input" id="newItemCost" value="100.00">
            </div>
            <div class="stock-form-fg">
              <label class="stock-form-label">Selling (₹)</label>
              <input type="number" min="0" step="0.01" class="stock-form-input" id="newItemPrice" value="150.00">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="stock-form-fg">
              <label class="stock-form-label">Reorder Level (Units)</label>
              <input type="number" min="0" class="stock-form-input" id="newItemReorder" value="15">
            </div>
            <div class="stock-form-fg">
              <label class="stock-form-label">GST Tax Rate %</label>
              <select class="stock-form-select" id="newItemGst">
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18" selected>18%</option>
                <option value="28">28%</option>
              </select>
            </div>
          </div>
        </div>
        <div class="stock-modal-footer">
          <button type="button" class="btn-stock-action" id="cancelCreateModal">Cancel</button>
          <button type="button" class="btn btn-primary" id="saveNewStockItemBtn" style="padding: 0 18px;">+ Save Item</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector('#closeCreateModal').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#cancelCreateModal').addEventListener('click', () => overlay.remove());

    overlay.querySelector('#saveNewStockItemBtn').addEventListener('click', () => {
      const name = overlay.querySelector('#newItemName').value.trim();
      const sku = overlay.querySelector('#newItemSku').value.trim().toUpperCase();
      // SKU is optional: left blank, it stays blank
      if (!name) {
        alert('Please provide the Item Name.');
        return;
      }

      const group = overlay.querySelector('#newItemGroup').value;
      const category = overlay.querySelector('#newItemCategory').value;
      const uom = overlay.querySelector('#newItemUom').value;
      const wh = overlay.querySelector('#newItemWh').value;
      const qty = parseFloat(overlay.querySelector('#newItemQty').value) || 0;
      const cost = parseFloat(overlay.querySelector('#newItemCost').value) || 0;
      const price = parseFloat(overlay.querySelector('#newItemPrice').value) || (cost * 1.35);
      const reorder = parseInt(overlay.querySelector('#newItemReorder').value, 10) || 10;
      const gst = parseInt(overlay.querySelector('#newItemGst').value, 10) || 18;

      const newItem = {
        id: 'STK-' + Date.now(),
        name,
        sku,
        group,
        category,
        uom,
        warehouse: wh,
        location: wh,
        qty,
        cost,
        rate: cost,
        price,
        reorder,
        gst
      };

      // Add to default array & synchronized master list
      DEFAULT_STOCK_ITEMS.push(newItem);
      if (!window._masterStockItems) window._masterStockItems = [];
      if (!window._masterStockItems.some(i => i.id === newItem.id)) {
        window._masterStockItems.push(newItem);
      }
      if (typeof window.saveMasterStockItems === 'function') {
        window.saveMasterStockItems();
      } else {
        saveStockHubStorage(KYA_STOCK_ITEMS_KEY, window._masterStockItems);
      }

      overlay.remove();
      renderStockHubPanel();
    });
  }

  function openCreateStockGroupModal() {
    const groups = getStockGroups();
    const overlay = document.createElement('div');
    overlay.className = 'stock-modal-overlay';
    overlay.innerHTML = `
      <div class="stock-modal-box">
        <div class="stock-modal-header">
          <div style="font-weight: 700; font-size: 15px;">Create Stock Group</div>
          <button type="button" id="closeGroupModal" style="background: none; border: none; color: #fff; font-size: 18px; cursor: pointer;">&times;</button>
        </div>
        <div class="stock-modal-body">
          <div class="stock-form-fg">
            <label class="stock-form-label">Group Name *</label>
            <input type="text" class="stock-form-input" id="newGroupName" placeholder="e.g. Electrical Components">
          </div>
          <div class="stock-form-fg">
            <label class="stock-form-label">Parent Group</label>
            <select class="stock-form-select" id="newGroupParent">
              <option value="Inventories">Inventories (Primary)</option>
              ${groups.map(g => `<option value="${ohEscapeHtml(g.name)}">${ohEscapeHtml(g.name)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="stock-modal-footer">
          <button type="button" class="btn-stock-action" id="cancelGroupModal">Cancel</button>
          <button type="button" class="btn btn-primary" id="saveGroupBtn">Save Group</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#closeGroupModal').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#cancelGroupModal').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#saveGroupBtn').addEventListener('click', () => {
      const name = overlay.querySelector('#newGroupName').value.trim();
      if (!name) return;
      const parent = overlay.querySelector('#newGroupParent').value;
      const newG = { id: 'sg-' + Date.now(), name, parent, addQty: 'Yes' };
      if (!window._masterStockGroups) window._masterStockGroups = [];
      window._masterStockGroups.push(newG);
      if (typeof window.syncStockGroupsToCoa === 'function') window.syncStockGroupsToCoa();
      if (typeof window.saveMasterStockGroups === 'function') {
        window.saveMasterStockGroups();
      } else {
        saveStockHubStorage(KYA_STOCK_GROUPS_KEY, window._masterStockGroups);
      }
      overlay.remove();
      renderStockHubPanel();
    });
  }

  function openCreateStockCategoryModal() {
    const overlay = document.createElement('div');
    overlay.className = 'stock-modal-overlay';
    overlay.innerHTML = `
      <div class="stock-modal-box">
        <div class="stock-modal-header">
          <div style="font-weight: 700; font-size: 15px;">Create Stock Category</div>
          <button type="button" id="closeCatModal" style="background: none; border: none; color: #fff; font-size: 18px; cursor: pointer;">&times;</button>
        </div>
        <div class="stock-modal-body">
          <div class="stock-form-fg">
            <label class="stock-form-label">Category Name *</label>
            <input type="text" class="stock-form-input" id="newCatName" placeholder="e.g. Knitted Fabrics">
          </div>
          <div class="stock-form-fg">
            <label class="stock-form-label">Description</label>
            <textarea class="stock-form-textarea" id="newCatDesc" rows="2" placeholder="Brief category description"></textarea>
          </div>
        </div>
        <div class="stock-modal-footer">
          <button type="button" class="btn-stock-action" id="cancelCatModal">Cancel</button>
          <button type="button" class="btn btn-primary" id="saveCatBtn">Save Category</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#closeCatModal').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#cancelCatModal').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#saveCatBtn').addEventListener('click', () => {
      const name = overlay.querySelector('#newCatName').value.trim();
      if (!name) return;
      const desc = overlay.querySelector('#newCatDesc').value.trim();
      const newC = { id: 'cat-' + Date.now(), name, parent: 'Primary', desc };
      if (!window._masterStockCategories) window._masterStockCategories = [];
      window._masterStockCategories.push(newC);
      if (typeof window.saveMasterStockCategories === 'function') {
        window.saveMasterStockCategories();
      } else {
        saveStockHubStorage(KYA_STOCK_CATEGORIES_KEY, window._masterStockCategories);
      }
      overlay.remove();
      renderStockHubPanel();
    });
  }

  function openCreateStockUnitModal() {
    const overlay = document.createElement('div');
    overlay.className = 'stock-modal-overlay';
    overlay.innerHTML = `
      <div class="stock-modal-box">
        <div class="stock-modal-header">
          <div style="font-weight: 700; font-size: 15px;">Create Unit of Measure</div>
          <button type="button" id="closeUnitModal" style="background: none; border: none; color: #fff; font-size: 18px; cursor: pointer;">&times;</button>
        </div>
        <div class="stock-modal-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="stock-form-fg">
              <label class="stock-form-label">Symbol *</label>
              <input type="text" class="stock-form-input" id="newUnitSymbol" placeholder="e.g. Doz">
            </div>
            <div class="stock-form-fg">
              <label class="stock-form-label">Formal Name *</label>
              <input type="text" class="stock-form-input" id="newUnitFormal" placeholder="e.g. Dozens">
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="stock-form-fg">
              <label class="stock-form-label">UQC Code (GST)</label>
              <input type="text" class="stock-form-input" id="newUnitUqc" placeholder="e.g. DOZ-DOZENS">
            </div>
            <div class="stock-form-fg">
              <label class="stock-form-label">Decimal Places</label>
              <input type="number" min="0" max="4" class="stock-form-input" id="newUnitDec" value="0">
            </div>
          </div>
        </div>
        <div class="stock-modal-footer">
          <button type="button" class="btn-stock-action" id="cancelUnitModal">Cancel</button>
          <button type="button" class="btn btn-primary" id="saveUnitBtn">Save Unit</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#closeUnitModal').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#cancelUnitModal').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#saveUnitBtn').addEventListener('click', () => {
      const symbol = overlay.querySelector('#newUnitSymbol').value.trim();
      const formal = overlay.querySelector('#newUnitFormal').value.trim();
      if (!symbol || !formal) return;
      const uqc = overlay.querySelector('#newUnitUqc').value.trim();
      const dec = parseInt(overlay.querySelector('#newUnitDec').value, 10) || 0;
      const newU = { id: 'uom-' + Date.now(), type: 'Simple', symbol, formalName: formal, uqc, decimalPlaces: dec };
      if (!window._masterUnits) window._masterUnits = [];
      window._masterUnits.push(newU);
      if (typeof window.saveMasterUnits === 'function') {
        window.saveMasterUnits();
      } else {
        saveStockHubStorage(KYA_UNITS_KEY, window._masterUnits);
      }
      overlay.remove();
      renderStockHubPanel();
    });
  }

  function openCreateStockWarehouseModal() {
    const overlay = document.createElement('div');
    overlay.className = 'stock-modal-overlay';
    overlay.innerHTML = `
      <div class="stock-modal-box">
        <div class="stock-modal-header">
          <div style="font-weight: 700; font-size: 15px;">Create Warehouse / Godown</div>
          <button type="button" id="closeWhModal" style="background: none; border: none; color: #fff; font-size: 18px; cursor: pointer;">&times;</button>
        </div>
        <div class="stock-modal-body">
          <div class="stock-form-fg">
            <label class="stock-form-label">Warehouse Name *</label>
            <input type="text" class="stock-form-input" id="newWhName" placeholder="e.g. Export Logistics Hub (WH-D)">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="stock-form-fg">
              <label class="stock-form-label">Warehouse Code</label>
              <input type="text" class="stock-form-input" id="newWhCode" placeholder="e.g. WH-D">
            </div>
            <div class="stock-form-fg">
              <label class="stock-form-label">Supervisor / Manager</label>
              <input type="text" class="stock-form-input" id="newWhSupervisor" placeholder="e.g. Rajesh Sharma">
            </div>
          </div>
          <div class="stock-form-fg">
            <label class="stock-form-label">Address</label>
            <input type="text" class="stock-form-input" id="newWhAddress" placeholder="e.g. Gate 4, Freight Terminal">
          </div>
          <div class="stock-form-fg">
            <label class="stock-form-label">City</label>
            <input type="text" class="stock-form-input" id="newWhCity" placeholder="e.g. Mumbai">
          </div>
        </div>
        <div class="stock-modal-footer">
          <button type="button" class="btn-stock-action" id="cancelWhModal">Cancel</button>
          <button type="button" class="btn btn-primary" id="saveWhBtn">Save Warehouse</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#closeWhModal').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#cancelWhModal').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#saveWhBtn').addEventListener('click', () => {
      const name = overlay.querySelector('#newWhName').value.trim();
      if (!name) return;
      const code = overlay.querySelector('#newWhCode').value.trim() || name;
      const supervisor = overlay.querySelector('#newWhSupervisor').value.trim();
      const address = overlay.querySelector('#newWhAddress').value.trim();
      const city = overlay.querySelector('#newWhCity').value.trim();
      const newW = { id: 'wh-' + Date.now(), name, code, supervisor, address, city, type: 'General Storage' };
      if (!window._masterWarehouses) window._masterWarehouses = [];
      window._masterWarehouses.push(newW);
      if (typeof window.saveMasterWarehouses === 'function') {
        window.saveMasterWarehouses();
      } else {
        saveStockHubStorage(KYA_WAREHOUSES_KEY, window._masterWarehouses);
      }
      overlay.remove();
      renderStockHubPanel();
    });
  }

  function ohEscapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function closeStockMoreMenu() {
    const dd = document.getElementById('stockMoreDropdown');
    const sub = document.getElementById('stockExportSubmenu');
    if (dd) dd.classList.remove('active');
    if (sub) sub.classList.remove('active');
  }

  // Global document click listener for the Columns dropdown and the ⋮ menu
  document.addEventListener('click', (e) => {
    const dd = document.getElementById('stockColDropdown');
    const btn = document.getElementById('stockColToggleBtn');
    if (dd && btn && _isStockColDropdownOpen) {
      if (!dd.contains(e.target) && !btn.contains(e.target)) {
        _isStockColDropdownOpen = false;
        dd.style.display = 'none';
        dd.classList.remove('open');
      }
    }
    const more = document.getElementById('stockMoreDropdown');
    if (more && more.classList.contains('active') && !more.contains(e.target)) closeStockMoreMenu();
  });

  // Global exports
  window.renderStockHubPanel = renderStockHubPanel;

})();
