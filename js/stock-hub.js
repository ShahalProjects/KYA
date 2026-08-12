/**
 * KYA Modular - Stock Hub Module
 * Independent Inventory & Stock Management Overview
 */

(function() {
  'use strict';

  // Sample Representative Stock Data (Non-functional mock records)
  const SAMPLE_STOCK_ITEMS = [
    { id: 'STK-001', name: 'Premium Cotton Fabric (Rolls)', sku: 'RAW-COT-01', category: 'Raw Materials', uom: 'Rolls', qty: 45, reorder: 15, cost: 2400.00, price: 3200.00, location: 'Main Warehouse (WH-A)' },
    { id: 'STK-002', name: 'Industrial Zipper #5 (Black 50cm)', sku: 'RAW-ZIP-05', category: 'Raw Materials', uom: 'Pcs', qty: 1200, reorder: 300, cost: 14.50, price: 22.00, location: 'Main Warehouse (WH-A)' },
    { id: 'STK-003', name: 'Classic Slim-Fit Denim Jeans (Size 32)', sku: 'FG-DNM-32', category: 'Finished Goods', uom: 'Pcs', qty: 85, reorder: 25, cost: 650.00, price: 1499.00, location: 'Store Showroom (WH-B)' },
    { id: 'STK-004', name: 'Classic Slim-Fit Denim Jeans (Size 34)', sku: 'FG-DNM-34', category: 'Finished Goods', uom: 'Pcs', qty: 12, reorder: 25, cost: 650.00, price: 1499.00, location: 'Store Showroom (WH-B)' },
    { id: 'STK-005', name: 'Designer Graphic Printed T-Shirt (M)', sku: 'FG-TSH-02', category: 'Finished Goods', uom: 'Pcs', qty: 0, reorder: 20, cost: 220.00, price: 599.00, location: 'Store Showroom (WH-B)' },
    { id: 'STK-006', name: 'High-Density Corrugated Boxes (12x12)', sku: 'PKG-BOX-12', category: 'Packaging', uom: 'Pcs', qty: 540, reorder: 150, cost: 18.00, price: 25.00, location: 'Packaging Unit (WH-C)' },
    { id: 'STK-007', name: 'Polyester Sewing Thread 5000m (White)', sku: 'RAW-THR-01', category: 'Raw Materials', uom: 'Spools', qty: 180, reorder: 40, cost: 85.00, price: 120.00, location: 'Main Warehouse (WH-A)' },
    { id: 'STK-008', name: 'Leather Formal Belt (Brown 36)', sku: 'TRD-BLT-36', category: 'Trading Goods', uom: 'Pcs', qty: 8, reorder: 15, cost: 350.00, price: 799.00, location: 'Store Showroom (WH-B)' },
    { id: 'STK-009', name: 'Recyclable Poly Mailer Bags (Medium)', sku: 'PKG-BAG-02', category: 'Packaging', uom: 'Pcs', qty: 950, reorder: 200, cost: 6.20, price: 10.00, location: 'Packaging Unit (WH-C)' }
  ];

  let _activeTab = 'items';
  let _searchQuery = '';
  let _selectedCategory = 'all';
  let _selectedStatus = 'all';

  function injectStockHubStyles() {
    if (document.getElementById('stock-hub-styles')) return;
    const style = document.createElement('style');
    style.id = 'stock-hub-styles';
    style.textContent = `
      .stock-hub-wrapper {
        width: 100%;
        font-family: var(--font-main, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      }
      .stock-header-actions {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .stock-btn-primary {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        background: #2563eb;
        color: #ffffff;
        border: none;
        padding: 9px 16px;
        font-size: 13px;
        font-weight: 600;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s ease;
        box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
      }
      .stock-btn-primary:hover {
        background: #1d4ed8;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.32);
      }
      .stock-btn-secondary {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        background: #ffffff;
        color: var(--slate-700, #334155);
        border: 1.5px solid var(--slate-200, #e2e8f0);
        padding: 8.5px 14px;
        font-size: 13px;
        font-weight: 600;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .stock-btn-secondary:hover {
        background: var(--slate-50, #f8fafc);
        border-color: var(--slate-300, #cbd5e1);
        color: var(--slate-900, #0f172a);
      }

      /* KPI Cards Grid */
      .stock-kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }
      .stock-kpi-card {
        background: #ffffff;
        border: 1px solid var(--slate-200, #e2e8f0);
        border-radius: 12px;
        padding: 16px 18px;
        display: flex;
        align-items: center;
        gap: 14px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
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

      /* Tab Nav */
      .stock-tabs-nav {
        display: flex;
        align-items: center;
        gap: 6px;
        border-bottom: 1.5px solid var(--slate-200, #e2e8f0);
        margin-bottom: 20px;
      }
      .stock-tab-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        font-size: 13.5px;
        font-weight: 600;
        color: var(--slate-500, #64748b);
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        margin-bottom: -1.5px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .stock-tab-btn:hover {
        color: var(--slate-800, #1e293b);
      }
      .stock-tab-btn.active {
        color: #2563eb;
        border-bottom-color: #2563eb;
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
        min-width: 260px;
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
        padding: 13px 16px;
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
        padding: 2px 8px;
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

  function renderStockHubPanel() {
    injectStockHubStyles();
    const panel = document.getElementById('panel-stock-hub');
    if (!panel) return;

    // Filter items based on local search & filter state
    const filteredItems = SAMPLE_STOCK_ITEMS.filter(item => {
      const matchSearch = !_searchQuery ||
        item.name.toLowerCase().includes(_searchQuery) ||
        item.sku.toLowerCase().includes(_searchQuery) ||
        item.category.toLowerCase().includes(_searchQuery) ||
        item.location.toLowerCase().includes(_searchQuery);

      const matchCat = (_selectedCategory === 'all') || (item.category === _selectedCategory);

      let matchStatus = true;
      if (_selectedStatus === 'in') matchStatus = item.qty > item.reorder;
      else if (_selectedStatus === 'low') matchStatus = item.qty > 0 && item.qty <= item.reorder;
      else if (_selectedStatus === 'out') matchStatus = item.qty <= 0;

      return matchSearch && matchCat && matchStatus;
    });

    const totalVal = SAMPLE_STOCK_ITEMS.reduce((sum, i) => sum + (i.qty * i.cost), 0);
    const lowStockCount = SAMPLE_STOCK_ITEMS.filter(i => i.qty > 0 && i.qty <= i.reorder).length;
    const outStockCount = SAMPLE_STOCK_ITEMS.filter(i => i.qty <= 0).length;

    let contentHtml = '';

    if (_activeTab === 'items') {
      contentHtml = `
        <!-- Filter toolbar -->
        <div class="stock-filter-toolbar">
          <div class="stock-search-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" class="stock-search-input" id="stockSearchInp" placeholder="Search item name, SKU, category, or warehouse..." value="${ohEscapeHtml(_searchQuery)}">
          </div>
          <div class="stock-filter-group">
            <select class="stock-select-filter" id="stockCategoryFilter">
              <option value="all" ${_selectedCategory === 'all' ? 'selected' : ''}>All Categories</option>
              <option value="Raw Materials" ${_selectedCategory === 'Raw Materials' ? 'selected' : ''}>Raw Materials</option>
              <option value="Finished Goods" ${_selectedCategory === 'Finished Goods' ? 'selected' : ''}>Finished Goods</option>
              <option value="Trading Goods" ${_selectedCategory === 'Trading Goods' ? 'selected' : ''}>Trading Goods</option>
              <option value="Packaging" ${_selectedCategory === 'Packaging' ? 'selected' : ''}>Packaging</option>
            </select>
            <select class="stock-select-filter" id="stockStatusFilter">
              <option value="all" ${_selectedStatus === 'all' ? 'selected' : ''}>All Stock Status</option>
              <option value="in" ${_selectedStatus === 'in' ? 'selected' : ''}>In Stock</option>
              <option value="low" ${_selectedStatus === 'low' ? 'selected' : ''}>Low Stock</option>
              <option value="out" ${_selectedStatus === 'out' ? 'selected' : ''}>Out of Stock</option>
            </select>
            <button type="button" class="stock-btn-secondary" id="stockResetFiltersBtn" style="padding: 7px 11px;">
              Reset
            </button>
          </div>
        </div>

        <!-- Stock Table -->
        <div class="stock-table-card">
          <div style="overflow-x: auto;">
            <table class="stock-table">
              <thead>
                <tr>
                  <th>Item Details</th>
                  <th>Category</th>
                  <th>UOM</th>
                  <th>Warehouse</th>
                  <th style="text-align: right;">Qty</th>
                  <th>Status</th>
                  <th style="text-align: right;">Cost (₹)</th>
                  <th style="text-align: right;">Selling (₹)</th>
                  <th style="text-align: right;">Valuation (₹)</th>
                  <th style="text-align: center;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${filteredItems.length === 0 ? `
                  <tr>
                    <td colspan="10" class="stock-empty-state">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 8px;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      <div>No stock items match your search or filter criteria.</div>
                    </td>
                  </tr>
                ` : filteredItems.map(item => {
                  const status = getStockStatus(item);
                  const itemVal = (item.qty * item.cost).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  return `
                    <tr>
                      <td>
                        <div class="stock-item-name">
                          <span>${ohEscapeHtml(item.name)}</span>
                          <span class="stock-item-sku">${ohEscapeHtml(item.sku)}</span>
                        </div>
                      </td>
                      <td><span class="stock-category-badge">${ohEscapeHtml(item.category)}</span></td>
                      <td><strong>${ohEscapeHtml(item.uom)}</strong></td>
                      <td style="font-size: 12px; color: var(--slate-600);">${ohEscapeHtml(item.location)}</td>
                      <td style="text-align: right; font-weight: 700; font-size: 13.5px;">${item.qty.toLocaleString('en-IN')}</td>
                      <td><span class="stock-status-pill ${status.cls}">${status.label}</span></td>
                      <td style="text-align: right;">₹ ${item.cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style="text-align: right; font-weight: 600; color: #047857;">₹ ${item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style="text-align: right; font-weight: 700; color: var(--slate-900);">₹ ${itemVal}</td>
                      <td>
                        <div class="stock-actions-cell" style="justify-content: center;">
                          <button type="button" class="stock-icon-btn" title="View Details">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                          <button type="button" class="stock-icon-btn" title="Edit Item">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M12 20h9"></path>
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          <div class="stock-table-footer">
            <span>Showing <strong>${filteredItems.length}</strong> of <strong>${SAMPLE_STOCK_ITEMS.length}</strong> items</span>
            <span style="font-size: 11.5px; color: var(--slate-400);">Stock Hub v1.0 • Inventory Tracking</span>
          </div>
        </div>
      `;
    } else if (_activeTab === 'movement') {
      contentHtml = `
        <div class="stock-table-card" style="padding: 36px 24px; text-align: center;">
          <div style="max-width: 440px; margin: 0 auto;">
            <div style="width: 52px; height: 52px; border-radius: 12px; background: #eff6ff; color: #2563eb; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 14px;">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
            </div>
            <h3 style="font-size: 16px; font-weight: 700; color: var(--slate-800); margin: 0 0 6px 0;">Stock Movement Log</h3>
            <p style="font-size: 13px; color: var(--slate-500); line-height: 1.5; margin: 0 0 18px 0;">
              Track inward and outward stock movements, goods receipts, deliveries, and inter-warehouse transfers.
            </p>
            <button type="button" class="stock-btn-primary" style="display: inline-flex; justify-content: center;">
              Record Stock Movement
            </button>
          </div>
        </div>
      `;
    } else if (_activeTab === 'warehouses') {
      contentHtml = `
        <div class="stock-kpi-grid">
          <div class="stock-kpi-card" style="flex-direction: column; align-items: flex-start;">
            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
              <span class="stock-category-badge">WH-A</span>
              <span class="stock-status-pill stock-status-in">Active</span>
            </div>
            <div style="font-size: 15px; font-weight: 700; color: var(--slate-800); margin: 10px 0 4px 0;">Main Central Warehouse</div>
            <div style="font-size: 12px; color: var(--slate-500); margin-bottom: 12px;">Plot 42, Industrial Area, Sector 5</div>
            <div style="font-size: 12px; color: var(--slate-600); border-top: 1px solid var(--slate-150); width: 100%; padding-top: 8px;">
              Stored Items: <strong>4 Categories</strong>
            </div>
          </div>
          <div class="stock-kpi-card" style="flex-direction: column; align-items: flex-start;">
            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
              <span class="stock-category-badge">WH-B</span>
              <span class="stock-status-pill stock-status-in">Active</span>
            </div>
            <div style="font-size: 15px; font-weight: 700; color: var(--slate-800); margin: 10px 0 4px 0;">Store Showroom Retail</div>
            <div style="font-size: 12px; color: var(--slate-500); margin-bottom: 12px;">Shop 12, Commercial Plaza, MG Road</div>
            <div style="font-size: 12px; color: var(--slate-600); border-top: 1px solid var(--slate-150); width: 100%; padding-top: 8px;">
              Stored Items: <strong>Finished Goods</strong>
            </div>
          </div>
          <div class="stock-kpi-card" style="flex-direction: column; align-items: flex-start;">
            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
              <span class="stock-category-badge">WH-C</span>
              <span class="stock-status-pill stock-status-in">Active</span>
            </div>
            <div style="font-size: 15px; font-weight: 700; color: var(--slate-800); margin: 10px 0 4px 0;">Packaging & Dispatch Unit</div>
            <div style="font-size: 12px; color: var(--slate-500); margin-bottom: 12px;">Building B, Logistics Park</div>
            <div style="font-size: 12px; color: var(--slate-600); border-top: 1px solid var(--slate-150); width: 100%; padding-top: 8px;">
              Stored Items: <strong>Packaging Supplies</strong>
            </div>
          </div>
        </div>
      `;
    } else if (_activeTab === 'valuation') {
      contentHtml = `
        <div class="stock-table-card" style="padding: 36px 24px; text-align: center;">
          <div style="max-width: 460px; margin: 0 auto;">
            <div style="width: 52px; height: 52px; border-radius: 12px; background: #ecfdf5; color: #059669; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 14px;">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path>
                <line x1="12" y1="18" x2="12" y2="6"></line>
              </svg>
            </div>
            <h3 style="font-size: 16px; font-weight: 700; color: var(--slate-800); margin: 0 0 6px 0;">Inventory Valuation Summary</h3>
            <p style="font-size: 13px; color: var(--slate-500); line-height: 1.5; margin: 0 0 18px 0;">
              Total calculated inventory valuation at weighted average cost is <strong>₹ ${totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> across all locations.
            </p>
            <button type="button" class="stock-btn-secondary" style="display: inline-flex; justify-content: center;">
              Download Valuation Report
            </button>
          </div>
        </div>
      `;
    }

    panel.innerHTML = `
      <div class="stock-hub-wrapper">
        
        <!-- Page Action Bar (Tabs moved here as blue action buttons) -->
        <div class="panel-header" style="border-bottom: 1.5px solid var(--slate-100); padding-bottom: 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: flex-start; gap: 12px; width: 100%;">
          <style>
            .btn-stock-action {
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
              height: 38px;
            }
            .btn-stock-action:hover {
              background: var(--slate-50) !important;
              color: var(--slate-800) !important;
              border-color: var(--slate-300) !important;
            }
            .btn-stock-action.active {
              background: #2563eb !important;
              color: #ffffff !important;
              border-color: #2563eb !important;
              box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25) !important;
            }
          </style>
          <div class="panel-actions" style="display: flex; gap: 8px; align-items: center;">
            <button class="btn-stock-action ${_activeTab === 'items' ? 'active' : ''}" data-tab="items" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              Stock List
            </button>
            <button class="btn-stock-action ${_activeTab === 'movement' ? 'active' : ''}" data-tab="movement" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
              Movement
            </button>
            <button class="btn-stock-action ${_activeTab === 'warehouses' ? 'active' : ''}" data-tab="warehouses" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              Warehouse
            </button>
            <button class="btn-stock-action ${_activeTab === 'valuation' ? 'active' : ''}" data-tab="valuation" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              Analytics
            </button>
          </div>
        </div>

        <!-- FORM CARD (Matching Sales Voucher UI size & style) -->
        <div class="je-form-card">
          <!-- Blue Title Card Header -->
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
                <div class="je-card-subtitle-text">Track stock levels, inventory valuation, warehouses, and product catalog</div>
              </div>
            </div>
            <div class="je-voucher-chip" style="background: rgba(255,255,255,.2);">INVENTORY</div>
          </div>

          <!-- Form Card Body -->
          <div style="padding: 24px 28px;">
            <!-- KPI Cards -->
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
                  <div class="stock-kpi-val">${SAMPLE_STOCK_ITEMS.length}</div>
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
                  <div class="stock-kpi-val">₹ ${totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  <div class="stock-kpi-sub">Cost valuation</div>
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

            <!-- Dynamic Content Body -->
            <div id="stockHubContent">
              ${contentHtml}
            </div>
          </div>
        </div>

      </div>
    `;

    // Attach Event Listeners
    panel.querySelectorAll('.btn-stock-action').forEach(btn => {
      btn.addEventListener('click', () => {
        _activeTab = btn.dataset.tab;
        renderStockHubPanel();
      });
    });

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

    const catFilter = panel.querySelector('#stockCategoryFilter');
    if (catFilter) {
      catFilter.addEventListener('change', (e) => {
        _selectedCategory = e.target.value;
        renderStockHubPanel();
      });
    }

    const statusFilter = panel.querySelector('#stockStatusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        _selectedStatus = e.target.value;
        renderStockHubPanel();
      });
    }

    const resetBtn = panel.querySelector('#stockResetFiltersBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        _searchQuery = '';
        _selectedCategory = 'all';
        _selectedStatus = 'all';
        renderStockHubPanel();
      });
    }
  }

  function ohEscapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Global exports
  window.renderStockHubPanel = renderStockHubPanel;

})();
