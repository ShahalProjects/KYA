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
        gst: typeof item.gst === 'number' ? item.gst : 18
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
  // SUB-TAB 1: DETAILS VIEW
  // ==========================================
  function renderDetailsSubtab(stockItems) {
    const totalVal = stockItems.reduce((sum, i) => sum + (i.qty * i.cost), 0);
    const totalSellingVal = stockItems.reduce((sum, i) => sum + (i.qty * i.price), 0);
    const lowStockCount = stockItems.filter(i => i.qty > 0 && i.qty <= i.reorder).length;
    const outStockCount = stockItems.filter(i => i.qty <= 0).length;
    const inStockCount = stockItems.filter(i => i.qty > i.reorder).length;

    const inStockPct = stockItems.length ? Math.round((inStockCount / stockItems.length) * 100) : 0;
    const lowStockPct = stockItems.length ? Math.round((lowStockCount / stockItems.length) * 100) : 0;
    const outStockPct = stockItems.length ? Math.max(0, 100 - inStockPct - lowStockPct) : 0;

    // Group valuation by Category
    const catMap = {};
    stockItems.forEach(i => {
      const c = i.category || 'General';
      if (!catMap[c]) catMap[c] = { name: c, count: 0, val: 0 };
      catMap[c].count++;
      catMap[c].val += (i.qty * i.cost);
    });
    const catList = Object.values(catMap).sort((a, b) => b.val - a.val);

    // Group valuation by Warehouse
    const whMap = {};
    stockItems.forEach(i => {
      const w = i.location || i.warehouse || 'Default Godown';
      if (!whMap[w]) whMap[w] = { name: w, count: 0, totalQty: 0, val: 0 };
      whMap[w].count++;
      whMap[w].totalQty += i.qty;
      whMap[w].val += (i.qty * i.cost);
    });
    const whList = Object.values(whMap).sort((a, b) => b.val - a.val);

    return `
      <!-- Top KPI Summary Cards -->
      <div class="stock-kpi-grid">
        <div class="stock-kpi-card">
          <div class="stock-kpi-icon-wrap" style="background: #eff6ff; color: #2563eb;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <div class="stock-kpi-content">
            <div class="stock-kpi-label">Total SKUs</div>
            <div class="stock-kpi-val">${stockItems.length}</div>
            <div class="stock-kpi-sub">Active catalog items</div>
          </div>
        </div>

        <div class="stock-kpi-card">
          <div class="stock-kpi-icon-wrap" style="background: #ecfdf5; color: #059669;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div class="stock-kpi-content">
            <div class="stock-kpi-label">Total Stock Value</div>
            <div class="stock-kpi-val">₹ ${formatInr(totalVal)}</div>
            <div class="stock-kpi-sub">Selling: ₹ ${formatInr(totalSellingVal)}</div>
          </div>
        </div>

        <div class="stock-kpi-card">
          <div class="stock-kpi-icon-wrap" style="background: #fffbeb; color: #d97706;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div class="stock-kpi-content">
            <div class="stock-kpi-label">Low Stock Alerts</div>
            <div class="stock-kpi-val" style="color: #d97706;">${lowStockCount} Items</div>
            <div class="stock-kpi-sub">At or below reorder level</div>
          </div>
        </div>

        <div class="stock-kpi-card">
          <div class="stock-kpi-icon-wrap" style="background: #fef2f2; color: #dc2626;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <div class="stock-kpi-content">
            <div class="stock-kpi-label">Out of Stock</div>
            <div class="stock-kpi-val" style="color: #dc2626;">${outStockCount} Items</div>
            <div class="stock-kpi-sub">Zero available quantity</div>
          </div>
        </div>
      </div>

      <!-- Details Section Grid -->
      <div class="stock-details-grid">
        
        <!-- Category-wise Valuation Card -->
        <div class="stock-section-card">
          <div class="stock-section-title">
            <span>Category Distribution & Valuation</span>
            <span style="font-size: 12px; font-weight: 500; color: var(--slate-500);">${catList.length} Categories</span>
          </div>

          <!-- Health proportion bar -->
          <div style="display: flex; justify-content: space-between; font-size: 11.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 2px;">
            <span>Stock Status Health</span>
            <span>${inStockPct}% Optimal</span>
          </div>
          <div class="stock-progress-bar">
            <div class="stock-progress-segment" style="width: ${inStockPct}%; background: #10b981;" title="In Stock: ${inStockCount}"></div>
            <div class="stock-progress-segment" style="width: ${lowStockPct}%; background: #f59e0b;" title="Low Stock: ${lowStockCount}"></div>
            <div class="stock-progress-segment" style="width: ${outStockPct}%; background: #ef4444;" title="Out of Stock: ${outStockCount}"></div>
          </div>
          <div style="display: flex; gap: 14px; font-size: 11px; color: var(--slate-500); margin-bottom: 16px;">
            <span style="display: inline-flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span> In Stock (${inStockCount})</span>
            <span style="display: inline-flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #f59e0b;"></span> Low (${lowStockCount})</span>
            <span style="display: inline-flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: #ef4444;"></span> Out (${outStockCount})</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${catList.length === 0 ? `
              <div style="text-align: center; color: var(--slate-400); font-size: 12.5px; padding: 18px 0;">No stock items recorded yet.</div>
            ` : catList.map(c => {
              const pct = Math.round((c.val / (totalVal || 1)) * 100);
              return `
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 4px;">
                    <span style="font-weight: 600; color: var(--slate-800);">${ohEscapeHtml(c.name)} <span style="font-weight: 400; color: var(--slate-400);">(${c.count} items)</span></span>
                    <span style="font-weight: 700; color: var(--slate-900);">₹ ${formatInr(c.val)} <span style="font-size: 11px; color: var(--slate-400); font-weight: normal;">(${pct}%)</span></span>
                  </div>
                  <div style="height: 5px; background: #f1f5f9; border-radius: 3px; overflow: hidden;">
                    <div style="height: 100%; width: ${pct}%; background: #3b82f6; border-radius: 3px;"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Warehouse Storage Card -->
        <div class="stock-section-card">
          <div class="stock-section-title">
            <span>Warehouses & Godowns</span>
            <span style="font-size: 12px; font-weight: 500; color: var(--slate-500);">${whList.length} Active Godowns</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${whList.length === 0 ? `
              <div style="text-align: center; color: var(--slate-400); font-size: 12.5px; padding: 18px 0;">No warehouses or stock recorded yet.</div>
            ` : whList.map(w => {
              return `
                <div style="border: 1px solid var(--slate-150, #e2e8f0); border-radius: 9px; padding: 12px 14px; background: #fafafa;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="font-weight: 700; font-size: 13px; color: var(--slate-800);">${ohEscapeHtml(w.name)}</span>
                    <span class="stock-category-badge" style="background: #eff6ff; color: #1d4ed8;">${w.count} SKUs</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--slate-500); margin-top: 6px;">
                    <span>Stored Units: <strong>${w.totalQty.toLocaleString('en-IN')}</strong></span>
                    <span>Valuation: <strong style="color: var(--slate-800);">₹ ${formatInr(w.val)}</strong></span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

      </div>

      <!-- Recent Movement Snapshot -->
      <div class="stock-section-card">
        <div class="stock-section-title">
          <span>Recent Stock Movement Activity</span>
          <button type="button" class="btn-stock-action" id="btnDetailsViewAllMovements" style="height: 30px; padding: 0 10px; font-size: 11.5px;">
            View All Log &rarr;
          </button>
        </div>

        <div style="overflow-x: auto;">
          <table class="stock-table" style="font-size: 12.5px;">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Ref #</th>
                <th>Type</th>
                <th>Item & SKU</th>
                <th>Movement Path</th>
                <th style="text-align: right;">Qty</th>
                <th style="text-align: right;">Valuation</th>
              </tr>
            </thead>
            <tbody>
              ${_stockMovements.length === 0 ? `
                <tr>
                  <td colspan="7" class="stock-empty-state" style="text-align: center; padding: 24px; color: var(--slate-400);">
                    No recent movement records found.
                  </td>
                </tr>
              ` : _stockMovements.slice(0, 4).map(m => {
                const isPositive = m.qty > 0;
                let typeBg = '#ecfdf5', typeClr = '#047857';
                if (m.type === 'outward') { typeBg = '#eff6ff'; typeClr = '#1d4ed8'; }
                else if (m.type === 'transfer') { typeBg = '#f5f3ff'; typeClr = '#6d28d9'; }
                else if (m.type === 'adjustment') { typeBg = '#fffbeb'; typeClr = '#b45309'; }

                return `
                  <tr>
                    <td style="color: var(--slate-500); font-size: 11.5px;">${m.date}</td>
                    <td style="font-family: monospace; font-weight: 600;">${m.refNo}</td>
                    <td>
                      <span style="font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 6px; background: ${typeBg}; color: ${typeClr};">
                        ${m.typeLabel}
                      </span>
                    </td>
                    <td>
                      <div style="font-weight: 600; color: var(--slate-800);">${ohEscapeHtml(m.itemName)}</div>
                      <div style="font-size: 10.5px; color: var(--slate-400);">${m.sku}</div>
                    </td>
                    <td style="font-size: 11.5px; color: var(--slate-600);">${ohEscapeHtml(m.fromLoc)} &rarr; ${ohEscapeHtml(m.toLoc)}</td>
                    <td style="text-align: right; font-weight: 700; color: ${isPositive ? '#047857' : '#dc2626'};">
                      ${isPositive ? '+' : ''}${m.qty}
                    </td>
                    <td style="text-align: right; font-weight: 600; color: var(--slate-800);">₹ ${formatInr(m.totalVal)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
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
    const totalVal = stockItems.reduce((sum, i) => sum + (i.qty * i.cost), 0);
    const sortedByVal = [...stockItems].sort((a, b) => (b.qty * b.cost) - (a.qty * a.cost));

    // ABC Pareto Analysis
    let cumulative = 0;
    const abcItems = sortedByVal.map(item => {
      const val = item.qty * item.cost;
      cumulative += val;
      const cumPct = (cumulative / (totalVal || 1)) * 100;
      let category = 'A';
      if (cumPct > 90) category = 'C';
      else if (cumPct > 70) category = 'B';
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
          <div style="padding: 24px 28px;">
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

      // Update item quantity in array
      if (item) {
        if (type === 'inward') item.qty += qty;
        else if (type === 'outward') item.qty = Math.max(0, item.qty - qty);
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
