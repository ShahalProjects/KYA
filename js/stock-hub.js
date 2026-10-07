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
  // Sub-tabs: 'details', 'items', 'movement', 'analysis'
  let _activeLeftSubtab = 'details';

  // Filters state
  let _searchQuery = '';
  let _selectedCategory = 'all';
  let _selectedStatus = 'all';
  let _selectedWarehouse = 'all';
  let _movementTypeFilter = 'all';

  // Optional dynamic columns state for Stock Item list (Unit, Group, Category, Warehouse hidden by default)
  let _stockItemOptionalCols = {
    unit: false,
    group: false,
    category: false,
    warehouse: false
  };
  let _isStockColDropdownOpen = false;

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
        sku: item.sku || 'SKU-000',
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

      /* ── Stock Overview dashboard (Overview → Details) ── */
      .sho { display: flex; flex-direction: column; gap: 18px; }
      .sho-grid-2 {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
        gap: 18px;
      }
      .sho-card {
        background: #ffffff;
        border: 1px solid var(--slate-200);
        border-radius: 14px;
        padding: 18px 20px;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        min-width: 0;
      }
      .sho-card-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 14px;
      }
      .sho-card-title { font-size: 14px; font-weight: 700; color: var(--slate-800); }
      .sho-card-sub { font-size: 12px; color: var(--slate-500); margin-top: 2px; }
      .sho-subhead {
        font-size: 11.5px;
        font-weight: 700;
        color: var(--slate-500);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin: 16px 0 6px;
        padding-top: 14px;
        border-top: 1px solid var(--slate-100);
      }
      .sho-link {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: none;
        border: none;
        padding: 4px 0;
        font: 600 12px var(--font-main);
        color: var(--blue-600);
        cursor: pointer;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .sho-link:hover { color: var(--blue-800); text-decoration: underline; }
      .sho-link:focus-visible, .sho-btn:focus-visible, .sho-seg button:focus-visible, .sho-tile.clickable:focus-visible, .sho-col:focus-visible {
        outline: 2px solid var(--blue-500);
        outline-offset: 2px;
      }
      .sho-more { margin-top: 10px; }
      .sho-trunc { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .sho-muted-empty {
        font-size: 12.5px;
        color: var(--slate-400);
        text-align: center;
        padding: 22px 8px;
        background: var(--slate-50);
        border-radius: 10px;
      }

      /* Buttons */
      .sho-actions { display: flex; gap: 8px; flex-wrap: wrap; }
      .sho-btn {
        height: 36px;
        padding: 0 14px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font: 600 13px var(--font-main);
        border-radius: 9px;
        border: 1.5px solid var(--slate-200);
        background: #ffffff;
        color: var(--slate-700);
        cursor: pointer;
        white-space: nowrap;
        transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
      }
      .sho-btn:hover { border-color: var(--blue-300); color: var(--blue-700); }
      .sho-btn.primary {
        background: var(--blue-600);
        border-color: var(--blue-600);
        color: #ffffff;
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
      }
      .sho-btn.primary:hover { background: var(--blue-700); border-color: var(--blue-700); color: #ffffff; }
      .sho-btn.sm { height: 30px; padding: 0 10px; font-size: 12px; border-radius: 8px; }

      /* Hero */
      .sho-hero {
        border-radius: 16px;
        padding: 22px 24px 18px;
        background: linear-gradient(135deg, var(--blue-50) 0%, #ffffff 65%);
        border: 1px solid var(--blue-100);
      }
      .sho-hero-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        flex-wrap: wrap;
      }
      .sho-eyebrow {
        font-size: 12px;
        font-weight: 600;
        color: var(--slate-500);
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .sho-dot-sep { width: 3px; height: 3px; border-radius: 50%; background: var(--slate-300); }
      .sho-hero-val {
        font-size: 40px;
        font-weight: 800;
        color: var(--slate-900);
        letter-spacing: -0.02em;
        line-height: 1.15;
        margin-top: 4px;
        overflow-wrap: anywhere;
      }
      .sho-hero-val .sho-cur { font-size: 26px; font-weight: 700; color: var(--slate-500); margin-right: 4px; }
      .sho-hero-val .sho-dec { font-size: 22px; font-weight: 700; color: var(--slate-400); }
      .sho-hero-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 16px;
        margin-top: 8px;
        font-size: 12.5px;
        color: var(--slate-600);
      }
      .sho-hero-meta strong { color: var(--slate-900); font-weight: 700; }
      .sho-health { margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--blue-100); }
      .sho-health-head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 12.5px;
        font-weight: 600;
        color: var(--slate-700);
        margin-bottom: 8px;
      }
      .sho-health-head span:last-child { font-weight: 500; color: var(--slate-500); }
      .sho-health-head strong { color: var(--slate-900); font-weight: 700; }
      .sho-meter {
        display: flex;
        gap: 2px;
        height: 10px;
        border-radius: 5px;
        overflow: hidden;
        background: var(--slate-100);
      }
      .sho-meter > span { display: block; height: 100%; min-width: 4px; }
      .sho-meter.abc { margin-bottom: 12px; }
      .sho-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 6px 18px;
        margin-top: 10px;
        font-size: 12px;
        color: var(--slate-600);
      }
      .sho-legend-item { display: inline-flex; align-items: center; gap: 6px; }
      .sho-legend-item strong { color: var(--slate-900); font-weight: 700; }
      .sho-status-ico {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        flex-shrink: 0;
      }
      .sho-swatch { width: 10px; height: 10px; border-radius: 3px; display: inline-block; flex-shrink: 0; }

      /* Stat tiles */
      .sho-tiles {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(165px, 100%), 1fr));
        gap: 12px;
      }
      .sho-tile {
        background: #ffffff;
        border: 1px solid var(--slate-200);
        border-radius: 12px;
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
        transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
      }
      .sho-tile.clickable { cursor: pointer; }
      .sho-tile.clickable:hover { border-color: var(--blue-300); box-shadow: var(--shadow-md); transform: translateY(-1px); }
      .sho-tile-head { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: var(--slate-500); }
      .sho-tile-ico {
        width: 26px;
        height: 26px;
        border-radius: 7px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .sho-tile-val {
        font-size: 21px;
        font-weight: 800;
        color: var(--slate-900);
        margin-top: 6px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sho-tile-sub { font-size: 11.5px; color: var(--slate-500); line-height: 1.4; }
      .sho-delta { font-weight: 600; }
      .sho-delta.good { color: var(--emerald-700); }
      .sho-delta.bad { color: var(--red-700); }
      .sho-delta.neutral { color: var(--slate-600); }

      /* All-clear note */
      .sho-ok {
        display: flex;
        gap: 12px;
        align-items: center;
        padding: 14px;
        border-radius: 10px;
        background: var(--emerald-50);
        border: 1px solid var(--emerald-100);
        font-size: 12.5px;
        color: var(--slate-600);
      }
      .sho-ok strong { display: block; color: var(--emerald-800); font-weight: 700; }
      .sho-ok-ico {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: var(--emerald-500);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      /* Needs attention */
      .sho-att-list { display: flex; flex-direction: column; }
      .sho-att-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 0;
        border-bottom: 1px solid var(--slate-100);
      }
      .sho-att-row:first-child { padding-top: 0; }
      .sho-att-row:last-child { border-bottom: none; padding-bottom: 0; }
      .sho-att-main { flex: 1; min-width: 0; }
      .sho-att-name { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--slate-800); }
      .sho-pill { font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 20px; flex-shrink: 0; }
      .sho-pill.out { background: var(--red-50); color: var(--red-700); border: 1px solid var(--red-200); }
      .sho-pill.low { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
      .sho-mini-meter { height: 6px; border-radius: 3px; overflow: hidden; margin: 7px 0 5px; }
      .sho-mini-meter > span { display: block; height: 100%; border-radius: 3px; }
      .sho-mini-meter.low { background: #fef3c7; }
      .sho-mini-meter.low > span { background: var(--warning); }
      .sho-mini-meter.out { background: var(--red-100); }
      .sho-att-qty { font-size: 11.5px; color: var(--slate-500); }

      /* Insights */
      .sho-insights { display: flex; flex-direction: column; gap: 8px; }
      .sho-insight {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        font-size: 12.5px;
        line-height: 1.5;
        color: var(--slate-600);
        padding: 10px 12px;
        border-radius: 10px;
        background: var(--slate-50);
        border: 1px solid var(--slate-100);
      }
      .sho-insight strong { color: var(--slate-900); font-weight: 700; }
      .sho-insight-ico {
        width: 26px;
        height: 26px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .sho-insight-ico.warn { background: #fffbeb; color: #b45309; }
      .sho-insight-ico.info { background: var(--blue-50); color: var(--blue-700); }
      .sho-insight-ico.muted { background: var(--slate-100); color: var(--slate-600); }

      /* Purchases vs sales chart */
      .sho-chart { position: relative; }
      .sho-plot {
        position: relative;
        height: 150px;
        margin-left: 46px;
        border-bottom: 1px solid var(--slate-300);
      }
      .sho-grid-line { position: absolute; left: 0; right: 0; height: 1px; background: var(--slate-100); }
      .sho-ytick {
        position: absolute;
        left: -46px;
        width: 40px;
        text-align: right;
        font-size: 10.5px;
        color: var(--slate-400);
        transform: translateY(50%);
        font-variant-numeric: tabular-nums;
      }
      .sho-cols { position: absolute; inset: 0; display: flex; }
      .sho-col {
        flex: 1;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        gap: 2px;
        border-radius: 6px 6px 0 0;
        outline-offset: -2px;
        cursor: default;
      }
      .sho-col:hover, .sho-col:focus-visible { background: rgba(37, 99, 235, 0.06); }
      .sho-bar { display: block; width: min(14px, 32%); border-radius: 4px 4px 0 0; }
      .sho-plot-empty {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 0 16px;
        font-size: 12px;
        color: var(--slate-400);
        pointer-events: none;
      }
      .sho-xlabels { display: flex; margin-left: 46px; }
      .sho-xlabels span {
        flex: 1;
        text-align: center;
        font-size: 10.5px;
        color: var(--slate-400);
        padding-top: 6px;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }
      .sho-tip {
        position: absolute;
        top: 0;
        left: 0;
        transform: translate(-50%, calc(-100% - 6px));
        background: var(--slate-900);
        color: #ffffff;
        border-radius: 8px;
        padding: 8px 10px;
        font-size: 11.5px;
        box-shadow: var(--shadow-lg);
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.12s ease;
        z-index: 5;
      }
      .sho-tip.show { opacity: 1; }
      .sho-tip-head { font-weight: 700; margin-bottom: 4px; color: var(--slate-200); }
      .sho-tip-row { display: flex; justify-content: space-between; gap: 16px; align-items: center; line-height: 1.7; }
      .sho-tip-row > span { display: inline-flex; align-items: center; gap: 6px; }
      .sho-table-wrap { overflow-x: auto; }
      .sho-table { width: 100%; border-collapse: collapse; font-size: 12px; }
      .sho-table th {
        text-align: left;
        font-size: 11px;
        font-weight: 700;
        color: var(--slate-500);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        padding: 6px 8px;
        border-bottom: 1px solid var(--slate-200);
      }
      .sho-table td { padding: 6px 8px; border-bottom: 1px solid var(--slate-100); color: var(--slate-700); white-space: nowrap; }
      .sho-table th:first-child, .sho-table td:first-child { padding-left: 0; }
      .sho-table th:last-child, .sho-table td:last-child { padding-right: 0; }
      .sho-table tfoot td { font-weight: 700; color: var(--slate-900); border-bottom: none; border-top: 1px solid var(--slate-200); }
      .sho-table .num { text-align: right; font-variant-numeric: tabular-nums; }

      /* Top movers */
      .sho-rank-list { display: flex; flex-direction: column; }
      .sho-rank-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 9px 0;
        border-bottom: 1px solid var(--slate-100);
      }
      .sho-rank-row:first-child { padding-top: 0; }
      .sho-rank-row:last-child { border-bottom: none; padding-bottom: 0; }
      .sho-rank-n {
        width: 22px;
        height: 22px;
        border-radius: 6px;
        background: var(--slate-100);
        color: var(--slate-600);
        font-size: 11px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .sho-rank-main { flex: 1; min-width: 0; }
      .sho-rank-name { font-size: 13px; font-weight: 600; color: var(--slate-800); }
      .sho-rank-sub { font-size: 11.5px; color: var(--slate-500); margin-top: 1px; }
      .sho-cover {
        font-size: 11px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 20px;
        background: var(--slate-100);
        color: var(--slate-600);
        white-space: nowrap;
        flex-shrink: 0;
      }
      .sho-cover.warn { background: #fffbeb; color: #b45309; }

      /* Where the value sits */
      .sho-seg { display: inline-flex; background: var(--slate-100); border-radius: 8px; padding: 3px; gap: 2px; flex-shrink: 0; }
      .sho-seg button {
        border: none;
        background: transparent;
        font: 600 12px var(--font-main);
        color: var(--slate-600);
        padding: 5px 10px;
        border-radius: 6px;
        cursor: pointer;
      }
      .sho-seg button:hover { color: var(--slate-900); }
      .sho-seg button.active { background: #ffffff; color: var(--blue-700); box-shadow: var(--shadow-sm); }
      .sho-card > .sho-seg { margin-bottom: 14px; }
      .sho-hbars { display: flex; flex-direction: column; gap: 12px; }
      .sho-hbar-row { font-size: 12.5px; }
      .sho-hbar-line { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 5px; }
      .sho-hbar-name { display: flex; align-items: baseline; gap: 8px; min-width: 0; color: var(--slate-800); font-weight: 600; }
      .sho-hbar-name .muted { color: var(--slate-500); font-weight: 500; }
      .sho-hbar-count { font-size: 11px; font-weight: 500; color: var(--slate-400); white-space: nowrap; flex-shrink: 0; }
      .sho-hbar-track { height: 8px; min-width: 0; }
      .sho-hbar-track > span { display: block; height: 100%; min-width: 2px; background: ${SHO_CLR_IN}; border-radius: 0 4px 4px 0; }
      .sho-hbar-val { font-weight: 700; color: var(--slate-800); white-space: nowrap; font-variant-numeric: tabular-nums; text-align: right; flex-shrink: 0; }
      .sho-hbar-val span { font-weight: 500; color: var(--slate-400); margin-left: 2px; }

      /* Value concentration */
      .sho-abc-rows { display: flex; flex-direction: column; gap: 6px; }
      .sho-abc-row { display: flex; align-items: center; gap: 8px; font-size: 12.5px; }
      .sho-abc-k { font-weight: 700; color: var(--slate-800); width: 56px; }
      .sho-abc-n { color: var(--slate-500); flex: 1; }
      .sho-abc-v { font-weight: 700; color: var(--slate-800); font-variant-numeric: tabular-nums; }
      .sho-abc-v span { font-weight: 500; color: var(--slate-400); margin-left: 2px; }
      .sho-top-list { display: flex; flex-direction: column; }
      .sho-top-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 7px 0;
        font-size: 12.5px;
        border-bottom: 1px solid var(--slate-100);
      }
      .sho-top-row:last-child { border-bottom: none; padding-bottom: 0; }
      .sho-top-row .sho-trunc { flex: 1; font-weight: 600; color: var(--slate-800); }
      .sho-abc-badge {
        width: 18px;
        height: 18px;
        border-radius: 5px;
        color: #ffffff;
        font-size: 10.5px;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .sho-top-qty { color: var(--slate-500); font-size: 11.5px; white-space: nowrap; }
      .sho-top-val { font-weight: 700; color: var(--slate-900); white-space: nowrap; font-variant-numeric: tabular-nums; min-width: 92px; text-align: right; }

      /* Recent activity */
      .sho-act-list { display: flex; flex-direction: column; }
      .sho-act-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 0;
        border-bottom: 1px solid var(--slate-100);
      }
      .sho-act-row:first-child { padding-top: 0; }
      .sho-act-row:last-child { border-bottom: none; padding-bottom: 0; }
      .sho-act-ico {
        width: 34px;
        height: 34px;
        border-radius: 9px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .sho-act-main { flex: 1; min-width: 0; }
      .sho-act-title { font-size: 13px; font-weight: 600; color: var(--slate-800); }
      .sho-act-sub { font-size: 11.5px; color: var(--slate-500); margin-top: 1px; }
      .sho-act-right { text-align: right; flex-shrink: 0; }
      .sho-act-val { font-size: 13px; font-weight: 700; color: var(--slate-900); font-variant-numeric: tabular-nums; }
      .sho-act-date { font-size: 11px; color: var(--slate-400); margin-top: 1px; }

      /* Empty (no stock items yet) */
      .sho-empty {
        text-align: center;
        padding: 40px 24px;
        border: 1.5px dashed var(--slate-200);
        border-radius: 16px;
        background: linear-gradient(180deg, var(--blue-50) 0%, #ffffff 55%);
      }
      .sho-empty-ico {
        width: 56px;
        height: 56px;
        border-radius: 16px;
        background: #ffffff;
        color: var(--blue-600);
        border: 1px solid var(--blue-100);
        box-shadow: 0 6px 18px rgba(37, 99, 235, 0.12);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 14px;
      }
      .sho-empty-title { font-size: 18px; font-weight: 800; color: var(--slate-900); }
      .sho-empty-sub { font-size: 13px; color: var(--slate-500); max-width: 440px; margin: 6px auto 22px; line-height: 1.5; }
      .sho-empty-steps {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(180px, 100%), 1fr));
        gap: 10px;
        margin: 0 auto 22px;
        max-width: 640px;
        text-align: left;
      }
      .sho-step {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        background: #ffffff;
        border: 1px solid var(--slate-200);
        border-radius: 12px;
        padding: 12px;
        font-size: 12px;
        color: var(--slate-500);
      }
      .sho-step strong { display: block; font-size: 13px; color: var(--slate-800); margin-bottom: 2px; }
      .sho-step-n {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: var(--blue-600);
        color: #ffffff;
        font-size: 11px;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      /* The overview sizes itself to its own width (sidebar state changes it), not the window's */
      .sho { container-type: inline-size; }
      @container (max-width: 520px) {
        .sho-hero { padding: 16px; }
        .sho-hero-val { font-size: 30px; }
        .sho-hero-val .sho-cur { font-size: 20px; }
        .sho-hero-val .sho-dec { font-size: 18px; }
        .sho-hero-top > .sho-actions { width: 100%; }
        .sho-hero-top > .sho-actions .sho-btn { flex: 1 1 auto; justify-content: center; padding: 0 10px; }
        .sho-card { padding: 16px; }
        .sho-card-head { flex-wrap: wrap; }
        .sho-top-qty { display: none; }
      }
      @container (max-width: 360px) {
        .sho-hero-val { font-size: 24px; white-space: nowrap; }
        .sho-hero-top > .sho-actions .sho-btn { flex-basis: 100%; }
        .sho-health-head { flex-direction: column; gap: 2px; }
        .sho-top-val { min-width: 0; }
        .sho-act-ico { display: none; }
        .sho-seg { display: flex; }
        .sho-seg button { flex: 1; padding: 5px 4px; }
      }
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

        <!-- 2. Stock List (Second!) -->
        <button class="oh-sub-tab ${_activeLeftSubtab === 'items' ? 'active' : ''}" data-subtab="items" role="tab" aria-selected="${_activeLeftSubtab === 'items'}">
          <div class="oh-tab-icon-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
          </div>
          <span class="oh-tab-text">Stock List</span>
          <span class="oh-sub-tab-badge">${stockItems.length}</span>
        </button>

        <!-- 3. Movement (Third!) -->
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

        <!-- 4. Analysis (Fourth!) -->
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
  // SUB-TAB 1: DETAILS VIEW (Stock Overview dashboard)
  // ==========================================
  // Breakdown dimension for the "Where the value sits" card: 'group' | 'category' | 'warehouse'
  let _shoBreakdown = 'group';
  // The weekly purchases-vs-sales card shows a table instead of the chart when true
  let _shoFlowAsTable = false;

  const SHO_DAY_MS = 86400000;
  const SHO_FLOW_WEEKS = 8;
  const SHO_IDLE_DAYS = 90;
  // Chart series (validated pair) and ABC ordinal ramp (validated light→dark on white)
  const SHO_CLR_IN = '#2563eb';
  const SHO_CLR_OUT = '#eb6834';
  const SHO_CLR_ABC = { A: '#1e3a8a', B: '#2563eb', C: '#60a5fa' };

  const SHO_ICONS = {
    box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    swap: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    down: '<path d="M12 3v13"/><polyline points="6 11 12 17 18 11"/><path d="M4 21h16"/>',
    up: '<path d="M12 21V8"/><polyline points="6 13 12 7 18 13"/><path d="M4 3h16"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    bang: '<line x1="12" y1="6" x2="12" y2="13"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
    bulb: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/>',
    pie: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
    home: '<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-8a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v8"/>',
    cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
    receipt: '<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="14" y2="13"/>',
    undo: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
    arrow: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>'
  };

  function shoIcon(name, size, strokeWidth) {
    const s = size || 16;
    return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth || 2}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SHO_ICONS[name] || ''}</svg>`;
  }

  // Voucher dates are YYYY-MM-DD (movements add " HH:MM"); anything else falls back to Date parsing.
  function shoParseDate(val) {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') {
      const d = new Date(val);
      return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    const s = String(val).trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    const d = new Date(s);
    return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function shoDaysAgo(date, today) {
    return Math.round((today - date) / SHO_DAY_MS);
  }

  function shoCompactInr(val) {
    const n = Number(val) || 0;
    const a = Math.abs(n);
    const sign = n < 0 ? '-' : '';
    const trim = x => (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2)).replace(/\.0+$|(\.\d*[1-9])0+$/, '$1');
    if (a >= 1e7) return sign + '₹' + trim(a / 1e7) + ' Cr';
    if (a >= 1e5) return sign + '₹' + trim(a / 1e5) + ' L';
    if (a >= 1e3) return sign + '₹' + trim(a / 1e3) + 'K';
    return sign + '₹' + Math.round(a).toLocaleString('en-IN');
  }

  // Whole rupees for tiles; crores switch to the compact form so the tile never overflows.
  function shoTileInr(val) {
    const n = Number(val) || 0;
    return Math.abs(n) >= 1e7 ? shoCompactInr(n) : '₹' + Math.round(n).toLocaleString('en-IN');
  }

  function shoFmtQty(q) {
    return (Number(q) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  function shoShortDate(d) {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  function shoRelDate(d, today) {
    const n = shoDaysAgo(d, today);
    if (n < 0) return shoShortDate(d);
    if (n === 0) return 'Today';
    if (n === 1) return 'Yesterday';
    if (n < 7) return n + ' days ago';
    return shoShortDate(d);
  }

  function shoNiceMax(v) {
    if (v <= 0) return 1;
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / pow;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return step * pow;
  }

  function shoVendorName(v) {
    const id = String(v.vendorId || '');
    const store = window.KYA_STORE || {};
    const sup = (store.suppliers || []).find(s => String(s.id) === id);
    if (sup && sup.name) return sup.name;
    const led = (Array.isArray(window.coaLedgers) ? window.coaLedgers : []).find(l => String(l.id) === id);
    if (led && led.name) return led.name;
    return (v.partyOverride && v.partyOverride.name) || '';
  }

  // Everything the overview shows, derived from stock items, posted sales/purchase
  // vouchers (rows linked to a stock item) and the movement log.
  function computeStockOverview(stockItems) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const store = window.KYA_STORE || {};
    const salesVouchers = Array.isArray(store.salesVouchers) ? store.salesVouchers : [];
    const purchaseVouchers = Array.isArray(store.purchaseVouchers) ? store.purchaseVouchers : [];

    const byId = new Map();
    const byName = new Map();
    const bySku = new Map();
    stockItems.forEach(it => {
      byId.set(String(it.id), it);
      bySku.set(String(it.sku).toLowerCase(), it);
      [it.name].concat(it.aliases || []).forEach(n => {
        const k = String(n || '').toLowerCase().trim();
        if (k && !byName.has(k)) byName.set(k, it);
      });
    });
    const matchRow = row => {
      if (!row) return null;
      if (row.stockItemId && byId.has(String(row.stockItemId))) return byId.get(String(row.stockItemId));
      if (row.itemType && row.itemType !== 'Product') return null;
      return byName.get(String(row.item || '').toLowerCase().trim()) || null;
    };

    const perItem = new Map();
    const stat = it => {
      let s = perItem.get(it.id);
      if (!s) { s = { out30: 0, lastActive: null }; perItem.set(it.id, s); }
      return s;
    };
    // Idle = no purchase, sale/return or movement at all, so raw materials that are
    // bought in but never sold are not flagged just for lacking sales.
    let hasActivityData = false;
    const touch = (it, d) => {
      const s = stat(it);
      hasActivityData = true;
      if (!s.lastActive || d > s.lastActive) s.lastActive = d;
      return s;
    };

    const flowStart = new Date(today.getTime() - (SHO_FLOW_WEEKS * 7 - 1) * SHO_DAY_MS);
    const weeks = Array.from({ length: SHO_FLOW_WEEKS }, (_, i) => {
      const start = new Date(flowStart.getFullYear(), flowStart.getMonth(), flowStart.getDate() + i * 7);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
      return { start, end, inVal: 0, outVal: 0 };
    });
    const weekOf = d => {
      const idx = Math.floor(Math.round((d - flowStart) / SHO_DAY_MS) / 7);
      return (idx >= 0 && idx < SHO_FLOW_WEEKS) ? weeks[idx] : null;
    };

    const sales = { cur: 0, prev: 0, items: new Set() };
    const purch = { cur: 0, prev: 0, items: new Set() };
    const activity = [];

    salesVouchers.forEach(v => {
      const d = shoParseDate(v.date) || shoParseDate(v.postedAt);
      if (!d) return;
      const age = shoDaysAgo(d, today);
      const sign = v.isReturn ? -1 : 1;
      let val = 0, qty = 0, lines = 0;
      (v.rows || []).forEach(row => {
        const it = matchRow(row);
        if (!it) return;
        const q = (parseFloat(row.qty) || 0) * sign;
        val += (parseFloat(row.amount) || 0) * sign;
        qty += q;
        lines++;
        const s = touch(it, d);
        if (age >= 0 && age < 30) {
          s.out30 += q;
          if (!v.isReturn) sales.items.add(it.id);
        }
      });
      if (!lines) return;
      if (age >= 0 && age < 30) sales.cur += val;
      else if (age >= 30 && age < 60) sales.prev += val;
      const w = weekOf(d);
      if (w) w.outVal += val;
      activity.push({
        kind: v.isReturn ? 'return' : 'sale', date: d, ts: Number(v.postedAt) || 0,
        title: (v.isReturn ? 'Sales return ' : 'Sales invoice ') + (v.invoiceNo || ''),
        party: v.customerName || '', lines, val: Math.abs(val)
      });
    });

    purchaseVouchers.forEach(v => {
      if (v.isDraft) return;
      const d = shoParseDate(v.date) || shoParseDate(v.postedAt);
      if (!d) return;
      const age = shoDaysAgo(d, today);
      let val = 0, lines = 0;
      (v.rows || []).forEach(row => {
        const it = matchRow(row);
        if (!it) return;
        val += parseFloat(row.amount) || 0;
        lines++;
        if (age >= 0 && age < 30) purch.items.add(it.id);
        touch(it, d);
      });
      if (!lines) return;
      if (age >= 0 && age < 30) purch.cur += val;
      else if (age >= 30 && age < 60) purch.prev += val;
      const w = weekOf(d);
      if (w) w.inVal += val;
      activity.push({
        kind: 'purchase', date: d, ts: Number(v.postedAt) || 0,
        title: 'Purchase ' + (v.invoiceNo || ''), party: shoVendorName(v), lines, val
      });
    });

    _stockMovements.forEach(m => {
      const d = shoParseDate(m.date);
      if (!d) return;
      const it = bySku.get(String(m.sku || '').toLowerCase()) || byName.get(String(m.itemName || '').toLowerCase().trim());
      const age = shoDaysAgo(d, today);
      if (it) {
        const s = touch(it, d);
        if (m.type === 'outward' && age >= 0 && age < 30) s.out30 += Math.abs(Number(m.qty) || 0);
      }
      activity.push({
        kind: 'movement', type: m.type, date: d, ts: parseInt(String(m.id || '').replace(/\D/g, ''), 10) || 0,
        title: (m.typeLabel || 'Stock movement') + (m.refNo ? ' ' + m.refNo : ''),
        party: m.itemName || '', qty: Number(m.qty) || 0, uom: it ? it.uom : '', val: Number(m.totalVal) || 0
      });
    });

    // Stock position
    const valueOf = it => Math.max(0, it.qty) * it.cost;
    const totalVal = stockItems.reduce((s, it) => s + valueOf(it), 0);
    const outItems = stockItems.filter(it => it.qty <= 0);
    const lowItems = stockItems.filter(it => it.qty > 0 && it.reorder > 0 && it.qty <= it.reorder);
    const inCount = stockItems.length - outItems.length - lowItems.length;
    const noReorder = stockItems.filter(it => !(it.reorder > 0));
    const noGodown = stockItems.filter(it => !it.warehouse);

    const coverDays = it => {
      const s = perItem.get(it.id);
      if (!s || !(s.out30 > 0) || it.qty <= 0) return null;
      return it.qty / (s.out30 / 30);
    };

    const attention = outItems.concat(lowItems).map(it => ({ it, cover: coverDays(it) })).sort((a, b) => {
      const ao = a.it.qty <= 0 ? 0 : 1, bo = b.it.qty <= 0 ? 0 : 1;
      if (ao !== bo) return ao - bo;
      if (ao === 0) return valueOf(b.it) - valueOf(a.it) || a.it.name.localeCompare(b.it.name);
      return (a.it.qty / a.it.reorder) - (b.it.qty / b.it.reorder);
    });

    const movers = stockItems
      .map(it => ({ it, out: (perItem.get(it.id) || {}).out30 || 0 }))
      .filter(x => x.out > 0)
      .map(x => ({ ...x, outVal: x.out * x.it.cost, cover: coverDays(x.it) }))
      .sort((a, b) => b.outVal - a.outVal || b.out - a.out);

    const idleItems = hasActivityData ? stockItems.filter(it => {
      if (it.qty <= 0) return false;
      const s = perItem.get(it.id);
      return !s || !s.lastActive || shoDaysAgo(s.lastActive, today) >= SHO_IDLE_DAYS;
    }) : [];
    const idleVal = idleItems.reduce((s, it) => s + valueOf(it), 0);

    // Value breakdowns
    const breakdown = {};
    [['group', it => it.group || 'General'], ['category', it => it.category || 'Uncategorised'], ['warehouse', it => it.warehouse || 'No godown']].forEach(([key, fn]) => {
      const map = {};
      stockItems.forEach(it => {
        const k = fn(it);
        if (!map[k]) map[k] = { name: k, count: 0, val: 0 };
        map[k].count++;
        map[k].val += valueOf(it);
      });
      breakdown[key] = Object.values(map).sort((a, b) => b.val - a.val || b.count - a.count);
    });

    // ABC: an item's class is set by the cumulative share *before* it, so the item that
    // crosses 70% is still A and a single dominant item is never pushed into C.
    const byValue = stockItems.map(it => ({ it, val: valueOf(it) })).sort((a, b) => b.val - a.val);
    const abc = { A: { count: 0, val: 0 }, B: { count: 0, val: 0 }, C: { count: 0, val: 0 } };
    let cum = 0;
    byValue.forEach(x => {
      const before = totalVal > 0 ? (cum / totalVal) * 100 : 100;
      x.cls = x.val <= 0 ? 'C' : before < 70 ? 'A' : before < 90 ? 'B' : 'C';
      cum += x.val;
      abc[x.cls].count++;
      abc[x.cls].val += x.val;
    });

    activity.sort((a, b) => (b.date - a.date) || (b.ts - a.ts));

    return {
      today, totalVal, inCount, lowItems, outItems, noReorder, noGodown,
      sales, purch, weeks, hasActivityData, attention, movers, idleItems, idleVal,
      breakdown, byValue, abc, activity,
      groupsCount: breakdown.group.length,
      godownCount: breakdown.warehouse.filter(w => w.name !== 'No godown').length
    };
  }

  function shoDeltaHtml(cur, prev, upIsGood) {
    if (!(prev > 0)) return '';
    const pct = ((cur - prev) / prev) * 100;
    if (Math.abs(pct) < 0.5) return `<span class="sho-delta neutral">No change vs prior 30d</span>`;
    const up = pct > 0;
    const tone = upIsGood === null ? 'neutral' : (up === upIsGood ? 'good' : 'bad');
    return `<span class="sho-delta ${tone}">${up ? '▲' : '▼'} ${Math.abs(pct).toFixed(Math.abs(pct) < 10 ? 1 : 0)}% vs prior 30d</span>`;
  }

  function shoRenderEmpty() {
    return `
      <div class="sho-empty">
        <div class="sho-empty-ico">${shoIcon('box', 28, 1.8)}</div>
        <div class="sho-empty-title">Set up your stock</div>
        <div class="sho-empty-sub">Create your first stock item and this overview fills in with stock value, health, reorder alerts and movement trends.</div>
        <div class="sho-empty-steps">
          <div class="sho-step"><span class="sho-step-n">1</span><div><strong>Add stock items</strong><span>Name, code, unit, rate and reorder level</span></div></div>
          <div class="sho-step"><span class="sho-step-n">2</span><div><strong>Assign godowns</strong><span>Know where every rupee of stock sits</span></div></div>
          <div class="sho-step"><span class="sho-step-n">3</span><div><strong>Record movements</strong><span>Receipts, dispatches, transfers and adjustments</span></div></div>
        </div>
        <div class="sho-actions" style="justify-content: center;">
          <button type="button" class="sho-btn primary" data-sho-act="new-item">${shoIcon('plus', 14, 2.2)} New stock item</button>
          <button type="button" class="sho-btn" data-sho-act="new-godown">${shoIcon('home', 14)} Add godown</button>
        </div>
      </div>
    `;
  }

  function shoRenderHero(o, stockItems) {
    const total = stockItems.length;
    const outN = o.outItems.length, lowN = o.lowItems.length, inN = o.inCount;
    const pct = n => total ? (n / total) * 100 : 0;
    const healthPct = Math.round(pct(inN));
    const parts = formatInr(o.totalVal).split('.');
    const seg = (n, color, label) => n > 0 ? `<span style="flex: ${n} 1 0; background: ${color};" title="${label}: ${n} of ${total}"></span>` : '';
    const asOf = o.today.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    return `
      <section class="sho-hero" aria-label="Stock value and health">
        <div class="sho-hero-top">
          <div style="min-width: 0;">
            <div class="sho-eyebrow">Stock value at cost <span class="sho-dot-sep"></span> as of ${asOf}</div>
            <div class="sho-hero-val"><span class="sho-cur">₹</span>${parts[0]}<span class="sho-dec">.${parts[1] || '00'}</span></div>
            <div class="sho-hero-meta">
              <span><strong>${total}</strong> ${total === 1 ? 'item' : 'items'}</span>
              <span><strong>${o.groupsCount}</strong> ${o.groupsCount === 1 ? 'group' : 'groups'}</span>
              <span><strong>${o.godownCount}</strong> ${o.godownCount === 1 ? 'godown' : 'godowns'}</span>
              <span><strong>${_stockMovements.length}</strong> ${_stockMovements.length === 1 ? 'movement' : 'movements'} logged</span>
            </div>
          </div>
          <div class="sho-actions">
            <button type="button" class="sho-btn primary" data-sho-act="record">${shoIcon('swap', 14, 2.2)} Record movement</button>
            <button type="button" class="sho-btn" data-sho-act="list">${shoIcon('list', 14)} Stock list</button>
            <button type="button" class="sho-btn" data-sho-act="new-item">${shoIcon('plus', 14, 2.2)} New item</button>
          </div>
        </div>

        <div class="sho-health">
          <div class="sho-health-head">
            <span>Stock health</span>
            <span><strong>${healthPct}%</strong> of items in stock</span>
          </div>
          <div class="sho-meter" role="img" aria-label="${inN} in stock, ${lowN} running low, ${outN} out of stock">
            ${seg(inN, 'var(--emerald-500)', 'In stock')}${seg(lowN, 'var(--warning)', 'Running low')}${seg(outN, 'var(--danger)', 'Out of stock')}
          </div>
          <div class="sho-legend">
            <span class="sho-legend-item"><span class="sho-status-ico" style="background: var(--emerald-500);">${shoIcon('check', 10, 3.2)}</span>In stock <strong>${inN}</strong></span>
            <span class="sho-legend-item"><span class="sho-status-ico" style="background: var(--warning);">${shoIcon('bang', 10, 3.2)}</span>Running low <strong>${lowN}</strong></span>
            <span class="sho-legend-item"><span class="sho-status-ico" style="background: var(--danger);">${shoIcon('x', 10, 3.2)}</span>Out of stock <strong>${outN}</strong></span>
          </div>
        </div>
      </section>
    `;
  }

  function shoRenderTiles(o) {
    const needN = o.outItems.length + o.lowItems.length;
    const tile = (opts) => `
      <div class="sho-tile ${opts.act ? 'clickable' : ''}" ${opts.act ? `data-sho-act="${opts.act}" role="button" tabindex="0"` : ''} title="${opts.title || ''}">
        <div class="sho-tile-head">
          <span class="sho-tile-ico" style="background: ${opts.bg}; color: ${opts.fg};">${shoIcon(opts.icon, 14, 2.2)}</span>
          <span>${opts.label}</span>
        </div>
        <div class="sho-tile-val" ${opts.valColor ? `style="color: ${opts.valColor};"` : ''}>${opts.value}</div>
        <div class="sho-tile-sub">${opts.sub}</div>
        ${opts.delta ? `<div class="sho-tile-sub">${opts.delta}</div>` : ''}
      </div>
    `;
    return `
      <div class="sho-tiles">
        ${tile({
          label: 'Purchases · 30d', icon: 'down', bg: 'var(--blue-50)', fg: 'var(--blue-600)',
          value: shoTileInr(o.purch.cur), title: '₹ ' + formatInr(o.purch.cur),
          sub: o.purch.items.size ? `${o.purch.items.size} ${o.purch.items.size === 1 ? 'item' : 'items'} bought in` : 'No stock items purchased',
          delta: shoDeltaHtml(o.purch.cur, o.purch.prev, null)
        })}
        ${tile({
          label: 'Sales · 30d', icon: 'up', bg: '#fff4ed', fg: '#c2410c',
          value: shoTileInr(o.sales.cur), title: '₹ ' + formatInr(o.sales.cur),
          sub: o.sales.items.size ? `${o.sales.items.size} ${o.sales.items.size === 1 ? 'item' : 'items'} sold` : 'No stock items sold',
          delta: shoDeltaHtml(o.sales.cur, o.sales.prev, true)
        })}
        ${tile({
          label: 'Needs reorder', icon: 'alert', bg: '#fffbeb', fg: '#d97706', act: 'analysis',
          value: `${needN} ${needN === 1 ? 'item' : 'items'}`, valColor: needN ? '#b45309' : '',
          sub: needN ? `${o.outItems.length} out of stock · ${o.lowItems.length} running low` : 'Everything above reorder level'
        })}
        ${tile({
          label: `Idle · ${SHO_IDLE_DAYS}d+`, icon: 'clock', bg: 'var(--slate-100)', fg: 'var(--slate-600)',
          value: o.hasActivityData ? shoTileInr(o.idleVal) : '—', title: o.hasActivityData ? '₹ ' + formatInr(o.idleVal) : '',
          sub: o.hasActivityData
            ? (o.idleItems.length ? `${o.idleItems.length} ${o.idleItems.length === 1 ? 'item' : 'items'} with no purchase, sale or movement` : 'Every stocked item has recent activity')
            : 'Shows once purchases, sales or movements are recorded'
        })}
      </div>
    `;
  }

  function shoRenderAttention(o) {
    const rows = o.attention.slice(0, 5);
    const more = o.attention.length - rows.length;
    return `
      <section class="sho-card" aria-label="Needs attention">
        <div class="sho-card-head">
          <div>
            <div class="sho-card-title">Needs attention</div>
            <div class="sho-card-sub">Out of stock or at reorder level</div>
          </div>
          ${o.attention.length ? `<button type="button" class="sho-link" data-sho-act="analysis">Replenishment plan ${shoIcon('arrow', 12, 2.2)}</button>` : ''}
        </div>
        ${rows.length === 0 ? `
          <div class="sho-ok">
            <span class="sho-ok-ico">${shoIcon('check', 16, 2.6)}</span>
            <div><strong>All items are above their reorder level.</strong><span>Nothing to restock right now.</span></div>
          </div>
        ` : `
          <div class="sho-att-list">
            ${rows.map(({ it, cover }) => {
              const isOut = it.qty <= 0;
              const fill = isOut ? 0 : Math.min(100, (it.qty / it.reorder) * 100);
              const coverTxt = cover !== null ? ` · ≈ ${Math.max(1, Math.round(cover))} ${Math.round(cover) <= 1 ? 'day' : 'days'} left` : '';
              return `
                <div class="sho-att-row">
                  <div class="sho-att-main">
                    <div class="sho-att-name">
                      <span class="sho-pill ${isOut ? 'out' : 'low'}">${isOut ? 'Out' : 'Low'}</span>
                      <span class="sho-trunc" title="${ohEscapeHtml(it.name)}">${ohEscapeHtml(it.name)}</span>
                    </div>
                    <div class="sho-mini-meter ${isOut ? 'out' : 'low'}"><span style="width: ${fill}%;"></span></div>
                    <div class="sho-att-qty">${isOut ? 'None on hand' : `${shoFmtQty(it.qty)} ${ohEscapeHtml(it.uom)} on hand · reorder at ${shoFmtQty(it.reorder)}`}${coverTxt}</div>
                  </div>
                  <button type="button" class="sho-btn sm btn-quick-move" data-id="${ohEscapeHtml(it.id)}" title="Record a receipt for ${ohEscapeHtml(it.name)}">${shoIcon('plus', 12, 2.4)} Restock</button>
                </div>
              `;
            }).join('')}
          </div>
          ${more > 0 ? `<button type="button" class="sho-link sho-more" data-sho-act="analysis">+ ${more} more ${more === 1 ? 'item' : 'items'} need attention</button>` : ''}
        `}
      </section>
    `;
  }

  function shoRenderInsights(o, stockItems) {
    const list = [];
    const total = stockItems.length;

    const soonest = o.movers.filter(m => m.cover !== null && m.cover < 14 && m.it.qty > m.it.reorder).sort((a, b) => a.cover - b.cover)[0];
    if (soonest) {
      const d = Math.max(1, Math.round(soonest.cover));
      list.push({ icon: 'clock', tone: 'warn', html: `<strong>${ohEscapeHtml(soonest.it.name)}</strong> runs out in about <strong>${d} ${d === 1 ? 'day' : 'days'}</strong> at the last 30 days' pace, before it reaches its reorder level.` });
    }
    if (total >= 4 && o.totalVal > 0) {
      const top = o.byValue.slice(0, 3).reduce((s, x) => s + x.val, 0);
      const share = Math.round((top / o.totalVal) * 100);
      if (share >= 50) list.push({ icon: 'pie', tone: 'info', html: `Your top 3 items hold <strong>${share}%</strong> of stock value. Count and insure these first.` });
    }
    if (o.hasActivityData && o.idleItems.length && o.totalVal > 0) {
      const share = Math.round((o.idleVal / o.totalVal) * 100);
      list.push({ icon: 'clock', tone: 'muted', html: `<strong>${shoCompactInr(o.idleVal)}</strong> (${share}% of stock value) across ${o.idleItems.length} ${o.idleItems.length === 1 ? 'item has' : 'items have'} had no purchase, sale or movement in ${SHO_IDLE_DAYS}+ days.` });
    }
    if (o.noReorder.length) {
      list.push({ icon: 'bang', tone: 'warn', html: `<strong>${o.noReorder.length} ${o.noReorder.length === 1 ? 'item has' : 'items have'} no reorder level</strong>, so low-stock alerts can't fire for ${o.noReorder.length === 1 ? 'it' : 'them'}. Set one in Master Desk.` });
    }
    if (o.noGodown.length && o.noGodown.length < total) {
      list.push({ icon: 'home', tone: 'muted', html: `<strong>${o.noGodown.length} ${o.noGodown.length === 1 ? 'item is' : 'items are'}</strong> not assigned to a godown.` });
    } else if (o.noGodown.length && o.noGodown.length === total && total > 0) {
      list.push({ icon: 'home', tone: 'muted', html: `No item is assigned to a godown yet. Assign godowns to see where stock sits.` });
    }

    const shown = list.slice(0, 4);
    return `
      <section class="sho-card" aria-label="Insights">
        <div class="sho-card-head">
          <div>
            <div class="sho-card-title">Insights</div>
            <div class="sho-card-sub">Spotted in your stock and voucher data</div>
          </div>
        </div>
        ${shown.length === 0 ? `
          <div class="sho-ok">
            <span class="sho-ok-ico">${shoIcon('check', 16, 2.6)}</span>
            <div><strong>Nothing unusual.</strong><span>Reorder levels, godowns and movement all look healthy.</span></div>
          </div>
        ` : `
          <div class="sho-insights">
            ${shown.map(i => `
              <div class="sho-insight">
                <span class="sho-insight-ico ${i.tone}">${shoIcon(i.icon, 14, 2.2)}</span>
                <div>${i.html}</div>
              </div>
            `).join('')}
          </div>
        `}
      </section>
    `;
  }

  function shoRenderFlow(o) {
    const weeks = o.weeks;
    const peak = Math.max(0, ...weeks.map(w => Math.max(w.inVal, w.outVal)));
    const max = shoNiceMax(peak);
    const hasData = peak > 0;
    const range = w => `${shoShortDate(w.start)} – ${shoShortDate(w.end)}`;
    const totalIn = weeks.reduce((s, w) => s + w.inVal, 0);
    const totalOut = weeks.reduce((s, w) => s + w.outVal, 0);

    const chart = `
      <div class="sho-chart" id="shoFlowChart">
        <div class="sho-plot">
          ${[1, 0.5, 0].map(f => `
            <div class="sho-grid-line" style="bottom: ${f * 100}%;"></div>
            <div class="sho-ytick" style="bottom: ${f * 100}%;">${hasData ? shoCompactInr(max * f) : (f === 0 ? '₹0' : '')}</div>
          `).join('')}
          <div class="sho-cols">
            ${weeks.map((w, i) => `
              <div class="sho-col" tabindex="0" data-idx="${i}"
                   data-range="${range(w)}" data-in="${formatInr(w.inVal)}" data-out="${formatInr(w.outVal)}"
                   aria-label="Week ${range(w)}: purchases ₹${formatInr(w.inVal)}, sales ₹${formatInr(w.outVal)}">
                <span class="sho-bar" style="height: ${hasData ? (Math.max(0, w.inVal) / max) * 100 : 0}%; background: ${SHO_CLR_IN};"></span>
                <span class="sho-bar" style="height: ${hasData ? (Math.max(0, w.outVal) / max) * 100 : 0}%; background: ${SHO_CLR_OUT};"></span>
              </div>
            `).join('')}
          </div>
          ${hasData ? '' : `<div class="sho-plot-empty">No purchase or sales vouchers with stock items in the last ${SHO_FLOW_WEEKS} weeks.</div>`}
          <div class="sho-tip" id="shoFlowTip" role="tooltip"></div>
        </div>
        <div class="sho-xlabels">
          ${weeks.map((w, i) => `<span>${i % 2 === 1 || i === weeks.length - 1 ? '' : shoShortDate(w.start)}</span>`).join('')}
        </div>
      </div>
    `;

    const table = `
      <div class="sho-table-wrap">
        <table class="sho-table">
          <thead><tr><th>Week</th><th class="num">Purchases</th><th class="num">Sales</th></tr></thead>
          <tbody>
            ${weeks.slice().reverse().map(w => `
              <tr><td>${range(w)}</td><td class="num">${shoTileInr(w.inVal)}</td><td class="num">${shoTileInr(w.outVal)}</td></tr>
            `).join('')}
          </tbody>
          <tfoot><tr><td>Total</td><td class="num">${shoTileInr(totalIn)}</td><td class="num">${shoTileInr(totalOut)}</td></tr></tfoot>
        </table>
      </div>
    `;

    return `
      <section class="sho-card" aria-label="Purchases versus sales">
        <div class="sho-card-head">
          <div>
            <div class="sho-card-title">Purchases vs sales</div>
            <div class="sho-card-sub">Weekly value of stock items · last ${SHO_FLOW_WEEKS} weeks</div>
          </div>
          <button type="button" class="sho-link" data-sho-act="flow-view">${_shoFlowAsTable ? 'Chart' : 'Table'}</button>
        </div>
        <div class="sho-legend" style="margin: -4px 0 12px;">
          <span class="sho-legend-item"><span class="sho-swatch" style="background: ${SHO_CLR_IN};"></span>Purchases <strong>${shoCompactInr(totalIn)}</strong></span>
          <span class="sho-legend-item"><span class="sho-swatch" style="background: ${SHO_CLR_OUT};"></span>Sales <strong>${shoCompactInr(totalOut)}</strong></span>
        </div>
        ${_shoFlowAsTable ? table : chart}
      </section>
    `;
  }

  function shoRenderMovers(o) {
    const rows = o.movers.slice(0, 5);
    return `
      <section class="sho-card" aria-label="Top movers">
        <div class="sho-card-head">
          <div>
            <div class="sho-card-title">Top movers</div>
            <div class="sho-card-sub">Most stock out by value · last 30 days</div>
          </div>
        </div>
        ${rows.length === 0 ? `
          <div class="sho-muted-empty">No sales or dispatches of stock items in the last 30 days.</div>
        ` : `
          <div class="sho-rank-list">
            ${rows.map((m, i) => {
              const c = m.cover !== null ? Math.round(m.cover) : null;
              const tone = c === null ? '' : c < 7 ? 'warn' : '';
              return `
                <div class="sho-rank-row">
                  <span class="sho-rank-n">${i + 1}</span>
                  <div class="sho-rank-main">
                    <div class="sho-trunc sho-rank-name" title="${ohEscapeHtml(m.it.name)}">${ohEscapeHtml(m.it.name)}</div>
                    <div class="sho-rank-sub">${shoFmtQty(m.out)} ${ohEscapeHtml(m.it.uom)} out · ${shoCompactInr(m.outVal)} at cost</div>
                  </div>
                  <span class="sho-cover ${tone}" title="Days the current stock lasts at the last 30 days' pace">${c === null ? 'No stock left' : `≈ ${Math.max(1, c)} ${c <= 1 ? 'day' : 'days'} cover`}</span>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </section>
    `;
  }

  function shoRenderBreakdown(o) {
    const dims = [['group', 'Group'], ['category', 'Category'], ['warehouse', 'Godown']];
    const all = o.breakdown[_shoBreakdown] || [];
    const LIMIT = 6;
    let rows = all.slice(0, LIMIT);
    if (all.length > LIMIT) {
      const rest = all.slice(LIMIT - 1);
      rows = all.slice(0, LIMIT - 1).concat([{
        name: `Other (${rest.length})`, count: rest.reduce((s, r) => s + r.count, 0), val: rest.reduce((s, r) => s + r.val, 0), other: true
      }]);
    }
    const maxVal = Math.max(0, ...rows.map(r => r.val));
    const label = dims.find(d => d[0] === _shoBreakdown)[1].toLowerCase();

    return `
      <section class="sho-card" aria-label="Where the value sits">
        <div class="sho-card-head">
          <div>
            <div class="sho-card-title">Where the value sits</div>
            <div class="sho-card-sub">Stock value at cost by ${label}</div>
          </div>
        </div>
        <div class="sho-seg" role="tablist" aria-label="Break down by">
          ${dims.map(([k, l]) => `<button type="button" role="tab" aria-selected="${_shoBreakdown === k}" class="${_shoBreakdown === k ? 'active' : ''}" data-sho-dim="${k}">${l}</button>`).join('')}
        </div>
        <div class="sho-hbars">
          ${rows.map(r => {
            const pct = o.totalVal > 0 ? (r.val / o.totalVal) * 100 : 0;
            const w = maxVal > 0 ? (r.val / maxVal) * 100 : 0;
            return `
              <div class="sho-hbar-row" title="${ohEscapeHtml(r.name)}: ₹ ${formatInr(r.val)} · ${r.count} ${r.count === 1 ? 'item' : 'items'}">
                <div class="sho-hbar-line">
                  <div class="sho-hbar-name">
                    <span class="sho-trunc ${r.other ? 'muted' : ''}">${ohEscapeHtml(r.name)}</span>
                    <span class="sho-hbar-count">${r.count} ${r.count === 1 ? 'item' : 'items'}</span>
                  </div>
                  <div class="sho-hbar-val">${shoCompactInr(r.val)} <span>${pct < 1 && pct > 0 ? '<1' : Math.round(pct)}%</span></div>
                </div>
                <div class="sho-hbar-track"><span style="width: ${w}%;"></span></div>
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `;
  }

  function shoRenderConcentration(o) {
    const classes = ['A', 'B', 'C'];
    const share = k => o.totalVal > 0 ? (o.abc[k].val / o.totalVal) * 100 : 0;
    const top = o.byValue.filter(x => x.val > 0).slice(0, 5);

    return `
      <section class="sho-card" aria-label="Value concentration">
        <div class="sho-card-head">
          <div>
            <div class="sho-card-title">Value concentration</div>
            <div class="sho-card-sub">ABC classes by share of stock value</div>
          </div>
          <button type="button" class="sho-link" data-sho-act="analysis">ABC analysis ${shoIcon('arrow', 12, 2.2)}</button>
        </div>
        <div class="sho-meter abc" role="img" aria-label="${classes.map(k => `Class ${k}: ${o.abc[k].count} items, ${Math.round(share(k))}% of value`).join('; ')}">
          ${o.totalVal > 0 ? classes.map(k => o.abc[k].val > 0 ? `<span style="flex: ${o.abc[k].val} 1 0; background: ${SHO_CLR_ABC[k]};" title="Class ${k}: ${Math.round(share(k))}% of value"></span>` : '').join('') : ''}
        </div>
        <div class="sho-abc-rows">
          ${classes.map(k => `
            <div class="sho-abc-row">
              <span class="sho-swatch" style="background: ${SHO_CLR_ABC[k]};"></span>
              <span class="sho-abc-k">Class ${k}</span>
              <span class="sho-abc-n">${o.abc[k].count} ${o.abc[k].count === 1 ? 'item' : 'items'}</span>
              <span class="sho-abc-v">${shoCompactInr(o.abc[k].val)} <span>${Math.round(share(k))}%</span></span>
            </div>
          `).join('')}
        </div>
        <div class="sho-subhead">Highest value items</div>
        ${top.length === 0 ? `<div class="sho-muted-empty">No stock on hand yet.</div>` : `
          <div class="sho-top-list">
            ${top.map(x => `
              <div class="sho-top-row">
                <span class="sho-abc-badge" style="background: ${SHO_CLR_ABC[x.cls]};">${x.cls}</span>
                <span class="sho-trunc" title="${ohEscapeHtml(x.it.name)}">${ohEscapeHtml(x.it.name)}</span>
                <span class="sho-top-qty">${shoFmtQty(x.it.qty)} ${ohEscapeHtml(x.it.uom)}</span>
                <span class="sho-top-val">₹ ${formatInr(x.val)}</span>
              </div>
            `).join('')}
          </div>
        `}
      </section>
    `;
  }

  function shoRenderActivity(o) {
    const rows = o.activity.slice(0, 6);
    const look = a => {
      if (a.kind === 'purchase') return { icon: 'cart', bg: 'var(--blue-50)', fg: 'var(--blue-700)' };
      if (a.kind === 'sale') return { icon: 'receipt', bg: '#fff4ed', fg: '#c2410c' };
      if (a.kind === 'return') return { icon: 'undo', bg: 'var(--slate-100)', fg: 'var(--slate-600)' };
      if (a.type === 'outward') return { icon: 'up', bg: '#fff4ed', fg: '#c2410c' };
      if (a.type === 'transfer') return { icon: 'swap', bg: '#f5f3ff', fg: '#6d28d9' };
      if (a.type === 'adjustment') return { icon: 'tag', bg: '#fffbeb', fg: '#b45309' };
      return { icon: 'down', bg: 'var(--blue-50)', fg: 'var(--blue-700)' };
    };
    return `
      <section class="sho-card" aria-label="Recent activity">
        <div class="sho-card-head">
          <div>
            <div class="sho-card-title">Recent activity</div>
            <div class="sho-card-sub">Vouchers and movements that touched stock items</div>
          </div>
          <button type="button" class="sho-link" data-sho-act="movement">Movement log ${shoIcon('arrow', 12, 2.2)}</button>
        </div>
        ${rows.length === 0 ? `<div class="sho-muted-empty">No stock activity yet. Purchases, sales and movements of stock items will show here.</div>` : `
          <div class="sho-act-list">
            ${rows.map(a => {
              const l = look(a);
              const sub = a.kind === 'movement'
                ? `${ohEscapeHtml(a.party)} · ${a.qty > 0 ? '+' : ''}${shoFmtQty(a.qty)} ${ohEscapeHtml(a.uom || '')}`
                : `${a.party ? ohEscapeHtml(a.party) + ' · ' : ''}${a.lines} stock ${a.lines === 1 ? 'line' : 'lines'}`;
              return `
                <div class="sho-act-row">
                  <span class="sho-act-ico" style="background: ${l.bg}; color: ${l.fg};">${shoIcon(l.icon, 15, 2.1)}</span>
                  <div class="sho-act-main">
                    <div class="sho-trunc sho-act-title">${ohEscapeHtml(a.title.trim())}</div>
                    <div class="sho-trunc sho-act-sub">${sub}</div>
                  </div>
                  <div class="sho-act-right">
                    <div class="sho-act-val">₹ ${formatInr(a.val)}</div>
                    <div class="sho-act-date">${shoRelDate(a.date, o.today)}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </section>
    `;
  }

  function renderDetailsSubtab(stockItems) {
    if (stockItems.length === 0) return `<div class="sho">${shoRenderEmpty()}</div>`;
    const o = computeStockOverview(stockItems);
    return `
      <div class="sho">
        ${shoRenderHero(o, stockItems)}
        ${shoRenderTiles(o)}
        <div class="sho-grid-2">
          ${shoRenderAttention(o)}
          ${shoRenderInsights(o, stockItems)}
        </div>
        <div class="sho-grid-2">
          ${shoRenderFlow(o)}
          ${shoRenderMovers(o)}
        </div>
        <div class="sho-grid-2">
          ${shoRenderBreakdown(o)}
          ${shoRenderConcentration(o)}
        </div>
        ${shoRenderActivity(o)}
      </div>
    `;
  }

  // Overview interactions: quick actions, breakdown toggle, chart/table toggle and the chart tooltip.
  function attachStockOverviewEvents(panel) {
    const root = panel.querySelector('.sho');
    if (!root) return;

    const runAct = act => {
      if (act === 'record') openRecordMovementModal();
      else if (act === 'new-item') openCreateStockItemModal();
      else if (act === 'new-godown') openCreateStockWarehouseModal();
      else if (act === 'list') { _activeLeftSubtab = 'items'; renderStockHubPanel(); }
      else if (act === 'analysis') { _activeLeftSubtab = 'analysis'; renderStockHubPanel(); }
      else if (act === 'movement') { _activeLeftSubtab = 'movement'; renderStockHubPanel(); }
      else if (act === 'flow-view') { _shoFlowAsTable = !_shoFlowAsTable; renderStockHubPanel(); }
    };
    root.querySelectorAll('[data-sho-act]').forEach(el => {
      el.addEventListener('click', () => runAct(el.dataset.shoAct));
      if (el.getAttribute('role') === 'button') {
        el.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); runAct(el.dataset.shoAct); }
        });
      }
    });

    root.querySelectorAll('[data-sho-dim]').forEach(btn => {
      btn.addEventListener('click', () => { _shoBreakdown = btn.dataset.shoDim; renderStockHubPanel(); });
    });

    const tip = root.querySelector('#shoFlowTip');
    const plot = tip ? tip.parentElement : null;
    if (tip && plot) {
      const show = col => {
        tip.innerHTML = `
          <div class="sho-tip-head">${col.dataset.range}</div>
          <div class="sho-tip-row"><span><span class="sho-swatch" style="background: ${SHO_CLR_IN};"></span>Purchases</span><strong>₹ ${col.dataset.in}</strong></div>
          <div class="sho-tip-row"><span><span class="sho-swatch" style="background: ${SHO_CLR_OUT};"></span>Sales</span><strong>₹ ${col.dataset.out}</strong></div>
        `;
        const pr = plot.getBoundingClientRect();
        const cr = col.getBoundingClientRect();
        const half = tip.offsetWidth / 2;
        const x = Math.min(Math.max(cr.left - pr.left + cr.width / 2, half), pr.width - half);
        tip.style.left = x + 'px';
        tip.classList.add('show');
      };
      const hide = () => tip.classList.remove('show');
      root.querySelectorAll('.sho-col').forEach(col => {
        col.addEventListener('mouseenter', () => show(col));
        col.addEventListener('focus', () => show(col));
        col.addEventListener('mouseleave', hide);
        col.addEventListener('blur', hide);
      });
    }
  }

  // ==========================================
  // SUB-TAB 2: STOCK LIST VIEW (Full Screen with Back Button)
  // ==========================================
  function renderStockListSubtab(stockItems, showBackButton = true) {
    const filteredItems = stockItems.filter(item => {
      const matchSearch = !_searchQuery ||
        item.name.toLowerCase().includes(_searchQuery) ||
        item.sku.toLowerCase().includes(_searchQuery) ||
        (item.category && item.category.toLowerCase().includes(_searchQuery)) ||
        (item.location && item.location.toLowerCase().includes(_searchQuery)) ||
        (item.group && item.group.toLowerCase().includes(_searchQuery));

      return matchSearch;
    });

    const totalFilteredVal = filteredItems.reduce((sum, i) => sum + (i.qty * i.cost), 0);

    const activeOptionalCount = (_stockItemOptionalCols.unit ? 1 : 0) +
      (_stockItemOptionalCols.group ? 1 : 0) +
      (_stockItemOptionalCols.category ? 1 : 0) +
      (_stockItemOptionalCols.warehouse ? 1 : 0);

    return `
      ${showBackButton ? `
        <div style="margin-bottom: 14px;">
          <button type="button" class="btn-stock-back btn-back-to-details" title="Return to Stock Details">
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
              <path d="M15 10H5M10 15l-5-5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Back to Details</span>
          </button>
        </div>
      ` : ''}

      <!-- Filter Toolbar -->
      <div class="stock-filter-toolbar">
        <div class="stock-search-box">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" class="stock-search-input" id="stockSearchInp" placeholder="Search item name, SKU, category, godown..." value="${ohEscapeHtml(_searchQuery)}">
        </div>
        <div class="stock-filter-group">
          <!-- Columns Option (Trial Balance style) -->
          <div class="rpt-col-wrap" style="position: relative;">
            <button type="button" class="btn-stock-action" id="stockColToggleBtn" style="display: inline-flex; align-items: center; gap: 6px; padding: 0 14px; height: 36px; font-weight: 600;">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M1.5 2.5h13v11h-13zM5.5 2.5v11M10.5 2.5v11" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Columns
            </button>
            <div id="stockColDropdown" class="rpt-col-dropdown ${_isStockColDropdownOpen ? 'open' : ''}" style="display: ${_isStockColDropdownOpen ? 'flex' : 'none'}; position: absolute; top: calc(100% + 6px); right: 0; left: auto; z-index: 200; min-width: 170px; padding: 12px 14px; flex-direction: column; gap: 8px; border: 1.5px solid var(--slate-200); border-radius: 10px; background: #fff; box-shadow: var(--shadow-lg, 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1));">
              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--slate-700); cursor: pointer; user-select: none;">
                <input type="checkbox" id="col-stock-unit-check" ${_stockItemOptionalCols.unit ? 'checked' : ''} style="accent-color: var(--blue-600); width: 15px; height: 15px; cursor: pointer;"> Unit
              </label>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--slate-700); cursor: pointer; user-select: none;">
                <input type="checkbox" id="col-stock-group-check" ${_stockItemOptionalCols.group ? 'checked' : ''} style="accent-color: var(--blue-600); width: 15px; height: 15px; cursor: pointer;"> Group
              </label>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--slate-700); cursor: pointer; user-select: none;">
                <input type="checkbox" id="col-stock-category-check" ${_stockItemOptionalCols.category ? 'checked' : ''} style="accent-color: var(--blue-600); width: 15px; height: 15px; cursor: pointer;"> Category
              </label>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--slate-700); cursor: pointer; user-select: none;">
                <input type="checkbox" id="col-stock-warehouse-check" ${_stockItemOptionalCols.warehouse ? 'checked' : ''} style="accent-color: var(--blue-600); width: 15px; height: 15px; cursor: pointer;"> Warehouse
              </label>
            </div>
          </div>
          <button type="button" class="btn-stock-action" id="stockResetFiltersBtn" style="padding: 0 12px; height: 36px;">
            Reset
          </button>
        </div>
      </div>

      <!-- Full-Width Stock Table Card -->
      <div class="stock-table-card">
        <div style="overflow-x: auto;">
          <table class="stock-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Item</th>
                ${_stockItemOptionalCols.unit ? '<th>Unit</th>' : ''}
                ${_stockItemOptionalCols.group ? '<th>Group</th>' : ''}
                ${_stockItemOptionalCols.category ? '<th>Category</th>' : ''}
                ${_stockItemOptionalCols.warehouse ? '<th>Warehouse</th>' : ''}
                <th style="text-align: right;">Quantity</th>
                <th style="text-align: right;">Rate (₹)</th>
                <th style="text-align: center;">Tax Rate</th>
              </tr>
            </thead>
            <tbody>
              ${filteredItems.length === 0 ? `
                <tr>
                  <td colspan="${5 + activeOptionalCount}" class="stock-empty-state">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 8px; color: var(--slate-300);">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <div>${stockItems.length === 0 ? 'No stock items found. Create items from Master Desk or the action bar above.' : 'No stock items match your search criteria.'}</div>
                  </td>
                </tr>
              ` : filteredItems.map(item => {
                return `
                  <tr>
                    <td style="font-family: monospace; font-weight: 700; color: var(--slate-900);">${ohEscapeHtml(item.sku)}</td>
                    <td style="font-weight: 600;">${ohEscapeHtml(item.name)}</td>
                    ${_stockItemOptionalCols.unit ? `<td><strong>${ohEscapeHtml(item.uom)}</strong></td>` : ''}
                    ${_stockItemOptionalCols.group ? `<td><span class="stock-category-badge">${ohEscapeHtml(item.group || 'Inventories')}</span></td>` : ''}
                    ${_stockItemOptionalCols.category ? `<td>${ohEscapeHtml(item.category || '-')}</td>` : ''}
                    ${_stockItemOptionalCols.warehouse ? `<td style="font-size: 12px; color: var(--slate-600);">${ohEscapeHtml(item.location || item.warehouse || '-')}</td>` : ''}
                    <td style="text-align: right; font-weight: 700; font-size: 13.5px;">${item.qty.toLocaleString('en-IN')}</td>
                    <td style="text-align: right; font-weight: 600;">₹ ${formatInr(item.cost || item.rate || 0)}</td>
                    <td style="text-align: center;"><span style="font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #eff6ff; color: #1d4ed8;">${item.gst || 18}%</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div class="stock-table-footer">
          <span>Showing <strong>${filteredItems.length}</strong> of <strong>${stockItems.length}</strong> items</span>
          <span style="font-size: 13px; font-weight: 700; color: var(--slate-800);">Total Valuation: ₹ ${formatInr(totalFilteredVal)}</span>
        </div>
      </div>
    `;
  }

  // ==========================================
  // SUB-TAB 3: MOVEMENT LOG VIEW (Full Screen with Back Button)
  // ==========================================
  function renderMovementSubtab(stockItems) {
    const filteredMovements = _stockMovements.filter(m => {
      if (_movementTypeFilter !== 'all' && m.type !== _movementTypeFilter) return false;
      return true;
    });

    return `
      <!-- Back Button & Movement Action Strip -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; border-bottom: 1.5px solid var(--slate-100); padding-bottom: 14px; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <button type="button" class="btn-stock-back btn-back-to-details" title="Return to Stock Details">
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
              <path d="M15 10H5M10 15l-5-5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Back to Details</span>
          </button>
          <div style="font-weight: 800; font-size: 16px; color: var(--slate-900);">Stock Movement Journal</div>
        </div>

        <button type="button" class="btn btn-primary" id="btnOpenRecordMovementModal" style="display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 16px; font-size: 13px; font-weight: 600; border-radius: 8px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          + Record Stock Movement
        </button>
      </div>

      <!-- Movement Filter Bar -->
      <div class="stock-filter-toolbar">
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <select class="stock-select-filter" id="movementTypeFilter">
            <option value="all" ${_movementTypeFilter === 'all' ? 'selected' : ''}>All Movement Types</option>
            <option value="inward" ${_movementTypeFilter === 'inward' ? 'selected' : ''}>Goods Receipts (Inward)</option>
            <option value="outward" ${_movementTypeFilter === 'outward' ? 'selected' : ''}>Sales Dispatches (Outward)</option>
            <option value="transfer" ${_movementTypeFilter === 'transfer' ? 'selected' : ''}>Warehouse Transfers</option>
            <option value="adjustment" ${_movementTypeFilter === 'adjustment' ? 'selected' : ''}>Physical Adjustments</option>
          </select>
        </div>
        <div style="font-size: 12.5px; color: var(--slate-500);">
          Tracking <strong>${filteredMovements.length}</strong> transactions
        </div>
      </div>

      <!-- Full-Width Movement Log Table -->
      <div class="stock-table-card">
        <div style="overflow-x: auto;">
          <table class="stock-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Voucher / Ref #</th>
                <th>Movement Type</th>
                <th>Item & SKU</th>
                <th>Source Location</th>
                <th>Destination Location</th>
                <th style="text-align: right;">Qty Moved</th>
                <th style="text-align: right;">Rate (₹)</th>
                <th style="text-align: right;">Total Value (₹)</th>
                <th>User / Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${filteredMovements.length === 0 ? `
                <tr>
                  <td colspan="10" class="stock-empty-state">
                    No movement records found for the selected filter.
                  </td>
                </tr>
              ` : filteredMovements.map(m => {
                const isPositive = m.qty > 0;
                let typeBg = '#ecfdf5', typeClr = '#047857';
                if (m.type === 'outward') { typeBg = '#eff6ff'; typeClr = '#1d4ed8'; }
                else if (m.type === 'transfer') { typeBg = '#f5f3ff'; typeClr = '#6d28d9'; }
                else if (m.type === 'adjustment') { typeBg = '#fffbeb'; typeClr = '#b45309'; }

                return `
                  <tr>
                    <td style="color: var(--slate-500); font-size: 12px;">${m.date}</td>
                    <td style="font-family: monospace; font-weight: 700; color: var(--slate-900);">${m.refNo}</td>
                    <td>
                      <span style="font-size: 11px; font-weight: 700; padding: 2.5px 8px; border-radius: 6px; background: ${typeBg}; color: ${typeClr};">
                        ${m.typeLabel}
                      </span>
                    </td>
                    <td>
                      <div class="stock-item-name">
                        <span>${ohEscapeHtml(m.itemName)}</span>
                        <span class="stock-item-sku">${m.sku}</span>
                      </div>
                    </td>
                    <td style="font-size: 12px; color: var(--slate-600);">${ohEscapeHtml(m.fromLoc)}</td>
                    <td style="font-size: 12px; color: var(--slate-600);">${ohEscapeHtml(m.toLoc)}</td>
                    <td style="text-align: right; font-weight: 800; font-size: 13.5px; color: ${isPositive ? '#047857' : '#dc2626'};">
                      ${isPositive ? '+' : ''}${m.qty}
                    </td>
                    <td style="text-align: right;">₹ ${formatInr(m.unitCost)}</td>
                    <td style="text-align: right; font-weight: 700; color: var(--slate-900);">₹ ${formatInr(m.totalVal)}</td>
                    <td style="font-size: 11.5px; color: var(--slate-500);">
                      <div>${ohEscapeHtml(m.user)}</div>
                      <div style="font-style: italic; color: var(--slate-400);">${ohEscapeHtml(m.remarks)}</div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div class="stock-table-footer">
          <span>Showing <strong>${filteredMovements.length}</strong> transactions</span>
          <span style="font-size: 11.5px; color: var(--slate-400);">Audit-verified Stock Movement Journal</span>
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
          <button type="button" class="btn-stock-back btn-back-to-details" title="Return to Stock Details">
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
              <path d="M15 10H5M10 15l-5-5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Back to Details</span>
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
    return renderStockListSubtab(stockItems, false);
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
        // Full screen view with Back button for Stock List, Movement, and Analysis
        let subtabHtml = '';
        if (_activeLeftSubtab === 'items') {
          subtabHtml = renderStockListSubtab(stockItems);
        } else if (_activeLeftSubtab === 'movement') {
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
                <div class="je-card-title-text">Stock Hub</div>
                <div class="je-card-subtitle-text">Real-time inventory levels, stock valuation, godown logistics and analytics</div>
              </div>
            </div>
            <div class="je-voucher-chip" style="background: rgba(255,255,255,.2); font-weight: 700;">INVENTORY HUB</div>
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
        _isStockColDropdownOpen = !_isStockColDropdownOpen;
        colDropdown.style.display = _isStockColDropdownOpen ? 'flex' : 'none';
        colDropdown.classList.toggle('open', _isStockColDropdownOpen);
      });
    }

    ['unit', 'group', 'category', 'warehouse'].forEach(col => {
      const chk = panel.querySelector(`#col-stock-${col}-check`);
      if (chk) {
        chk.addEventListener('change', (e) => {
          _stockItemOptionalCols[col] = e.target.checked;
          renderStockHubPanel();
        });
      }
    });

    const resetBtn = panel.querySelector('#stockResetFiltersBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        _searchQuery = '';
        _stockItemOptionalCols = { unit: false, group: false, category: false, warehouse: false };
        _isStockColDropdownOpen = false;
        renderStockHubPanel();
      });
    }

    const movFilter = panel.querySelector('#movementTypeFilter');
    if (movFilter) {
      movFilter.addEventListener('change', (e) => {
        _movementTypeFilter = e.target.value;
        renderStockHubPanel();
      });
    }

    // 5. Modal triggers
    const recordMovBtn = panel.querySelector('#btnOpenRecordMovementModal');
    if (recordMovBtn) {
      recordMovBtn.addEventListener('click', () => openRecordMovementModal());
    }

    panel.querySelectorAll('.btn-quick-move').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = btn.dataset.id;
        openRecordMovementModal(itemId);
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

    attachStockOverviewEvents(panel);
  }

  // ==========================================
  // MODALS
  // ==========================================
  function openRecordMovementModal(preselectedItemId) {
    const stockItems = getStockItems();

    const overlay = document.createElement('div');
    overlay.className = 'stock-modal-overlay';
    overlay.innerHTML = `
      <div class="stock-modal-box">
        <div class="stock-modal-header">
          <div style="font-weight: 700; font-size: 15px;">Record Stock Movement</div>
          <button type="button" id="closeStockModal" style="background: none; border: none; color: #fff; font-size: 18px; cursor: pointer;">&times;</button>
        </div>
        <div class="stock-modal-body">
          <div class="stock-form-fg">
            <label class="stock-form-label">Movement Type *</label>
            <select class="stock-form-select" id="movFormType">
              <option value="inward">Goods Receipt (Inward +)</option>
              <option value="outward">Sales Dispatch (Outward -)</option>
              <option value="transfer">Warehouse Transfer</option>
              <option value="adjustment">Stock Adjustment (Audit / Variance)</option>
            </select>
          </div>

          <div class="stock-form-fg">
            <label class="stock-form-label">Select Stock Item *</label>
            <select class="stock-form-select" id="movFormItem">
              ${stockItems.map(i => `<option value="${i.id}" ${i.id === preselectedItemId ? 'selected' : ''}>${ohEscapeHtml(i.name)} (${i.sku}) - Avail: ${i.qty} ${i.uom}</option>`).join('')}
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="stock-form-fg">
              <label class="stock-form-label">Source / From Location</label>
              <input type="text" class="stock-form-input" id="movFormFrom" placeholder="e.g. Main Warehouse (WH-A) or Supplier" value="Supplier / Vendor">
            </div>
            <div class="stock-form-fg">
              <label class="stock-form-label">Destination / To Location</label>
              <input type="text" class="stock-form-input" id="movFormTo" placeholder="e.g. Store Showroom (WH-B)" value="Main Warehouse (WH-A)">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="stock-form-fg">
              <label class="stock-form-label">Quantity Moved *</label>
              <input type="number" class="stock-form-input" id="movFormQty" min="1" value="10" placeholder="Qty">
            </div>
            <div class="stock-form-fg">
              <label class="stock-form-label">Voucher / Ref #</label>
              <input type="text" class="stock-form-input" id="movFormRef" value="MOV-${Math.floor(1000 + Math.random() * 9000)}" placeholder="Ref #">
            </div>
          </div>

          <div class="stock-form-fg">
            <label class="stock-form-label">Remarks / Notes</label>
            <textarea class="stock-form-textarea" id="movFormRemarks" rows="2" placeholder="Movement batch details, truck number, or reason"></textarea>
          </div>
        </div>
        <div class="stock-modal-footer">
          <button type="button" class="btn-stock-action" id="cancelStockModal">Cancel</button>
          <button type="button" class="btn btn-primary" id="saveStockMovementBtn" style="padding: 0 18px;">Post Movement</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#closeStockModal').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#cancelStockModal').addEventListener('click', () => overlay.remove());

    overlay.querySelector('#saveStockMovementBtn').addEventListener('click', () => {
      const type = overlay.querySelector('#movFormType').value;
      const itemId = overlay.querySelector('#movFormItem').value;
      const fromLoc = overlay.querySelector('#movFormFrom').value || 'Location';
      const toLoc = overlay.querySelector('#movFormTo').value || 'Location';
      const qty = parseInt(overlay.querySelector('#movFormQty').value, 10) || 1;
      const refNo = overlay.querySelector('#movFormRef').value || 'MOV-AUTO';
      const remarks = overlay.querySelector('#movFormRemarks').value || 'Stock movement entry';

      const item = stockItems.find(i => i.id === itemId) || stockItems[0];
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10) + ' ' + now.toTimeString().slice(0, 5);

      let effectiveQty = qty;
      let typeLabel = 'Goods Receipt';
      if (type === 'outward') {
        effectiveQty = -qty;
        typeLabel = 'Sales Dispatch';
      } else if (type === 'transfer') {
        typeLabel = 'Warehouse Transfer';
      } else if (type === 'adjustment') {
        typeLabel = 'Stock Adjustment';
      }

      // Update item quantity on the master record (getStockItems() hands out copies)
      if (item && (type === 'inward' || type === 'outward')) {
        item.qty = type === 'inward' ? item.qty + qty : Math.max(0, item.qty - qty);
        const master = Array.isArray(window._masterStockItems)
          ? window._masterStockItems.find(i => String(i.id) === String(item.id))
          : null;
        if (master) {
          master.qty = item.qty;
          if (typeof window.saveMasterStockItems === 'function') window.saveMasterStockItems();
          else saveStockHubStorage(KYA_STOCK_ITEMS_KEY, window._masterStockItems);
        }
      }

      // Prepend to movements log
      _stockMovements.unshift({
        id: 'MOV-' + Date.now(),
        date: dateStr,
        refNo: refNo,
        type: type,
        typeLabel: typeLabel,
        itemName: item ? item.name : 'Stock Item',
        sku: item ? item.sku : 'SKU',
        fromLoc: fromLoc,
        toLoc: toLoc,
        qty: effectiveQty,
        unitCost: item ? item.cost : 100,
        totalVal: qty * (item ? item.cost : 100),
        user: 'Active User',
        remarks: remarks
      });
      saveStockHubStorage(KYA_STOCK_MOVEMENTS_KEY, _stockMovements);

      overlay.remove();
      renderStockHubPanel();
    });
  }

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
                  <span style="font-weight: 600; color: var(--slate-800);">${ohEscapeHtml(item.name)} <span style="font-size: 11px; color: var(--slate-400);">(${item.sku})</span></span>
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
              <label class="stock-form-label">SKU / Item Code *</label>
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
      if (!name || !sku) {
        alert('Please provide both Item Name and SKU.');
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

  // Global document click listener for Columns dropdown
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
  });

  // Global exports
  window.renderStockHubPanel = renderStockHubPanel;

})();
