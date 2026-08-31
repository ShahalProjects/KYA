  function syncGlobalDates(fromVal, toVal) {
    _globalDateFrom = fromVal;
    _globalDateTo   = toVal;

    ['pnlDateFrom', 'trialDateFrom', 'bsDateFrom'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = fromVal;
    });
    ['pnlDateTo', 'trialDateTo', 'bsDateTo'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = toVal;
    });
  }

  // Each entry: { id, sgId, glId, name, code, openingBalance, type:'ledger'|'group-ledger' }
  // coaLedgers is a shared global (window.coaLedgers), pre-initialized in app-shell.js.

  function initDefaultLedgers() {
    if (coaLedgers && coaLedgers.length > 0) return;

    const defaults = [
      // ── Assets ───────────────────────────────────────────────────
      // Property, Plant and Equipment (PPE) (sg-ppe)
      { name: 'Land', sgId: 'sg-ppe' },
      { name: 'Building', sgId: 'sg-ppe' },
      { name: 'Plant & Machinery', sgId: 'sg-ppe' },
      { name: 'Furniture & Fixtures', sgId: 'sg-ppe' },
      { name: 'Office Equipment', sgId: 'sg-ppe' },
      { name: 'Computers & Laptops', sgId: 'sg-ppe' },
      { name: 'Vehicles', sgId: 'sg-ppe' },

      // Capital Work-in-Progress (sg-cwip)
      { name: 'Capital Work-in-Progress', sgId: 'sg-cwip' },

      // Intangible Assets (sg-ia)
      { name: 'Software', sgId: 'sg-ia' },
      { name: 'Licenses', sgId: 'sg-ia' },
      { name: 'Trademarks', sgId: 'sg-ia' },
      { name: 'Patents', sgId: 'sg-ia' },
      { name: 'Goodwill', sgId: 'sg-ia' },

      // Intangible Assets Under Development (sg-iaud)
      { name: 'Intangible Assets Under Development', sgId: 'sg-iaud' },

      // Non-Current Investments (sg-nci)
      { name: 'Long-Term Investments', sgId: 'sg-nci' },

      // Long-Term Loans and Advances (sg-ltla)
      { name: 'Security Deposits', sgId: 'sg-ltla' },
      { name: 'Long-Term Advances', sgId: 'sg-ltla' },
      { name: 'Loans to Employees', sgId: 'sg-ltla' },

      // Other Non-Current Assets (sg-onca)
      { name: 'Deferred Tax Asset', sgId: 'sg-onca' },
      { name: 'Other Non-Current Assets', sgId: 'sg-onca' },

      // Current Investments (sg-ci)
      { name: 'Short-Term Investments', sgId: 'sg-ci' },

      // Inventories (sg-inv) - clean / empty by default

      // Trade Receivables (sg-tr)
      { name: 'Trade Receivables', sgId: 'sg-tr' },

      // Cash and Cash Equivalents (sg-cce)
      { name: 'Cash in Hand', sgId: 'sg-cce', type: 'group-ledger' },
      { name: 'Bank Account', sgId: 'sg-cce', type: 'group-ledger' },
      { name: 'Cash', sgId: 'sg-cce', parentGlName: 'Cash in Hand' },
      { name: 'Petty Cash', sgId: 'sg-cce', parentGlName: 'Cash in Hand' },

      // Short-Term Loans and Advances (sg-stla)
      { name: 'Advances to Suppliers', sgId: 'sg-stla' },
      { name: 'Employee Advances', sgId: 'sg-stla' },
      { name: 'Short-Term Loans', sgId: 'sg-stla' },

      // Other Current Assets (sg-oca)
      { name: 'Input CGST', sgId: 'sg-oca' },
      { name: 'Input SGST', sgId: 'sg-oca' },
      { name: 'Input IGST', sgId: 'sg-oca' },
      { name: 'TDS Receivable', sgId: 'sg-oca' },
      { name: 'Prepaid Expenses', sgId: 'sg-oca' },
      { name: 'Accrued Income', sgId: 'sg-oca' },
      { name: 'Other Current Assets', sgId: 'sg-oca' },

      // ── Equity and Liabilities ────────────────────────────────────
      // Shareholders' Funds (sg-sc, sg-rs)
      { name: 'Share Capital', sgId: 'sg-sc' },
      { name: 'Reserves & Surplus', sgId: 'sg-rs' },
      { name: 'Retained Earnings', sgId: 'sg-rs' },

      // Non-Current Liabilities (sg-ltb, sg-dtl, sg-ltp)
      { name: 'Long-Term Bank Loan', sgId: 'sg-ltb' },
      { name: 'Vehicle Loan', sgId: 'sg-ltb' },
      { name: 'Mortgage Loan', sgId: 'sg-ltb' },
      { name: 'Deferred Tax Liability', sgId: 'sg-dtl' },
      { name: 'Long-Term Provisions', sgId: 'sg-ltp' },

      // Current Liabilities (sg-tp, sg-stb, sg-ocl)
      { name: 'Trade Payables', sgId: 'sg-tp' },
      { name: 'Outstanding Expenses', sgId: 'sg-ocl' },
      { name: 'Salary Payable', sgId: 'sg-ocl' },
      { name: 'Output CGST', sgId: 'sg-ocl' },
      { name: 'Output SGST', sgId: 'sg-ocl' },
      { name: 'Output IGST', sgId: 'sg-ocl' },
      { name: 'TDS Payable', sgId: 'sg-ocl' },
      { name: 'TCS Payable', sgId: 'sg-ocl' },
      { name: 'Short-Term Borrowings', sgId: 'sg-stb' },
      { name: 'Bank Overdraft', sgId: 'sg-stb' },
      { name: 'Current Portion of Long-Term Debt', sgId: 'sg-ocl' },
      { name: 'Advance from Customers', sgId: 'sg-ocl' },
      { name: 'Refund Payable', sgId: 'sg-ocl' },
      { name: 'Other Current Liabilities', sgId: 'sg-ocl' },

      // ── Income ───────────────────────────────────────────────────
      // Revenue from Operations (sg-rfo)
      { name: 'Sales', sgId: 'sg-rfo' },
      { name: 'Service Income', sgId: 'sg-rfo' },
      { name: 'Sales Reversals', sgId: 'sg-rfo' },
      { name: 'Discounts Allowed (Sales)', sgId: 'sg-rfo' },
      { name: 'Export Sales', sgId: 'sg-rfo' },
      { name: 'Domestic Sales', sgId: 'sg-rfo' },

      // Other Income (sg-oi)
      { name: 'Interest Income', sgId: 'sg-oi' },
      { name: 'Commission Received', sgId: 'sg-oi' },
      { name: 'Rental Income', sgId: 'sg-oi' },
      { name: 'Dividend Income', sgId: 'sg-oi' },
      { name: 'Profit on Sale of Assets', sgId: 'sg-oi' },
      { name: 'Foreign Exchange Gain', sgId: 'sg-oi' },
      { name: 'Miscellaneous Income', sgId: 'sg-oi' },
      { name: 'Discount Received', sgId: 'sg-oi' },

      // ── Expense ──────────────────────────────────────────────────
      // Cost of Materials Consumed (sg-cmc)
      { name: 'Raw Material Purchase', sgId: 'sg-cmc' },
      { name: 'Freight Inward', sgId: 'sg-cmc' },
      { name: 'Direct Expenses', sgId: 'sg-cmc' },

      // Purchases of Stock-in-Trade (sg-pst)
      { name: 'Purchase', sgId: 'sg-pst' },
      { name: 'Import Purchase', sgId: 'sg-pst' },
      { name: 'Freight Inward', sgId: 'sg-pst' },
      { name: 'Purchase Returns', sgId: 'sg-pst' },

      // Changes in Inventories of Finished Goods, Work-in-Progress and Stock-in-Trade (sg-cinv)
      { name: 'Closing Stock Adjustment', sgId: 'sg-cinv' },
      { name: 'Opening Stock Adjustment', sgId: 'sg-cinv' },
      { name: 'Inventory Adjustment', sgId: 'sg-cinv' },

      // Employee Benefits Expense (sg-ebe)
      { name: 'Salaries and Wages', sgId: 'sg-ebe' },
      { name: 'Bonus', sgId: 'sg-ebe' },
      { name: 'Staff Welfare Expenses', sgId: 'sg-ebe' },
      { name: 'PF Contribution', sgId: 'sg-ebe' },
      { name: 'ESI Contribution', sgId: 'sg-ebe' },
      { name: 'Gratuity', sgId: 'sg-ebe' },
      { name: 'Leave Encashment', sgId: 'sg-ebe' },

      // Finance Costs (sg-fc)
      { name: 'Interest on Loan', sgId: 'sg-fc' },
      { name: 'Bank Charges', sgId: 'sg-fc' },
      { name: 'Processing Charges', sgId: 'sg-fc' },
      { name: 'Finance Charges', sgId: 'sg-fc' },

      // Depreciation and Amortization Expense (sg-da)
      { name: 'Depreciation', sgId: 'sg-da' },
      { name: 'Amortization', sgId: 'sg-da' },

      // Other Expenses (sg-oe)
      { name: 'Rent', sgId: 'sg-oe' },
      { name: 'Electricity', sgId: 'sg-oe' },
      { name: 'Water Charges', sgId: 'sg-oe' },
      { name: 'Telephone & Internet', sgId: 'sg-oe' },
      { name: 'Office Expenses', sgId: 'sg-oe' },
      { name: 'Printing & Stationery', sgId: 'sg-oe' },
      { name: 'Repairs & Maintenance', sgId: 'sg-oe' },
      { name: 'Insurance', sgId: 'sg-oe' },
      { name: 'Advertisement & Marketing', sgId: 'sg-oe' },
      { name: 'Travelling & Conveyance', sgId: 'sg-oe' },
      { name: 'Vehicle Expenses', sgId: 'sg-oe' },
      { name: 'Fuel Expenses', sgId: 'sg-oe' },
      { name: 'Professional Fees', sgId: 'sg-oe' },
      { name: 'Audit Fees', sgId: 'sg-oe' },
      { name: 'Legal Charges', sgId: 'sg-oe' },
      { name: 'Courier & Postage', sgId: 'sg-oe' },
      { name: 'Software Subscription', sgId: 'sg-oe' },
      { name: 'Security Charges', sgId: 'sg-oe' },
      { name: 'Housekeeping Expenses', sgId: 'sg-oe' },
      { name: 'Miscellaneous Expenses', sgId: 'sg-oe' },

      // Tax Expense (sg-tax)
      { name: 'Current Tax', sgId: 'sg-tax' },
      { name: 'Deferred Tax', sgId: 'sg-tax' }
    ];

    let baseTime = Date.now();
    coaLedgers = defaults.map((d, index) => ({
      id: baseTime + index + _coaLedgerCtr++,
      sgId: d.sgId,
      glId: null,
      name: d.name,
      code: '',
      openingBalance: 0,
      type: d.type || 'ledger'
    }));

    // Resolve parent group-ledger relationships
    defaults.forEach((d, index) => {
      if (d.parentGlName) {
        const parentGl = coaLedgers.find(l => l.name === d.parentGlName && l.type === 'group-ledger');
        if (parentGl) {
          coaLedgers[index].glId = parentGl.id;
        }
      }
    });
  }

  let _coaLedgerCtr  = 1;
  initDefaultLedgers();
  let _coaActiveTab  = 'overview'; // 'overview' | 'ledger'
  let _coaExpanded   = new Set(['assets','equity-liabilities','income','expense']);
  let _coaSearch     = '';
  let _coaStyleDone  = false;
  let _coaFilterOpen = false;
  let _coaFilterMg   = '';       // '', 'assets', 'equity-liabilities', 'income', 'expense'
  let _coaFilterType = '';       // '', 'ledger', 'group-ledger'
  let _coaFilterBal  = false;    // true/false

  // Add-Ledger modal state
  let _coaMOpen     = false;    // modal open?
  let _coaMEditMode = false;    // editing mode?
  let _coaMEditId   = null;     // id of ledger being edited
  let _coaMType     = 'ledger'; // 'ledger' | 'group-ledger'
  let _coaMName     = '';
  let _coaMSgId     = '';
  let _coaMGlId     = '';
  let _coaMBal      = '';
  let _coaMPreSgId  = null;     // pre-selected sgId when opened from tree button
  let _coaMAliases  = [];

  // ── CSS ──────────────────────────────────────────────────────────
  function injectChartStyles() {
    if (_coaStyleDone) return;
    _coaStyleDone = true;
    const s = document.createElement('style');
    s.textContent = `
      .coa-tree { display:flex; flex-direction:column; gap:14px; }

      /* ══════════════════════════════════════════════
         MODERN SEARCH HERO
      ══════════════════════════════════════════════ */
      .coa-search-hero {
        background: linear-gradient(135deg, #f8faff 0%, #eff6ff 50%, #f0fdff 100%);
        border: 1.5px solid #dbeafe;
        border-radius: 20px;
        padding: 20px 22px 18px;
        margin-bottom: 22px;
        position: relative;
        overflow: hidden;
      }
      .coa-search-hero::before {
        content: '';
        position: absolute;
        top: -30px; right: -30px;
        width: 160px; height: 160px;
        background: radial-gradient(circle, rgba(37,99,235,.07) 0%, transparent 70%);
        pointer-events: none;
      }

      /* Top row: search bar + Add button */
      .coa-search-top {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 14px;
      }

      /* Search input wrapper */
      .coa-si-wrap {
        flex: 1;
        position: relative;
        display: flex;
        align-items: center;
      }
      .coa-si-icon {
        position: absolute;
        left: 14px;
        color: #60a5fa;
        pointer-events: none;
        display: flex;
        align-items: center;
        transition: color .2s;
      }
      .coa-si-inp {
        width: 100%;
        height: 46px;
        padding: 0 44px 0 44px;
        border: 2px solid #e2e8f0;
        border-radius: 14px;
        font-size: 14.5px;
        font-family: Inter, sans-serif;
        color: #1e293b;
        background: #ffffff;
        outline: none;
        transition: border-color .2s, box-shadow .2s;
        box-shadow: 0 1px 4px rgba(0,0,0,.04);
      }
      .coa-si-inp::placeholder { color: #94a3b8; }
      .coa-si-inp:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 4px rgba(59,130,246,.12), 0 2px 8px rgba(0,0,0,.06);
      }
      .coa-si-inp:focus ~ .coa-si-icon { color: #2563eb; }
      .coa-si-clear {
        position: absolute;
        right: 11px;
        width: 26px; height: 26px;
        border-radius: 50%;
        border: none;
        background: #e2e8f0;
        color: #64748b;
        cursor: pointer;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        transition: background .15s, color .15s;
      }
      .coa-si-clear.visible { display: flex; }
      .coa-si-clear:hover { background: #cbd5e1; color: #1e293b; }

      /* Result count badge */
      .coa-result-badge {
        display: none;
        align-items: center;
        gap: 5px;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 20px;
        padding: 3px 10px 3px 8px;
        font-size: 12px;
        font-weight: 600;
        color: #2563eb;
        white-space: nowrap;
        animation: coaBadgePop .18s cubic-bezier(.34,1.5,.64,1);
      }
      .coa-result-badge.visible { display: flex; }
      @keyframes coaBadgePop {
        from { transform: scale(.7); opacity: 0; }
        to   { transform: scale(1);  opacity: 1; }
      }
      .coa-result-dot {
        width: 6px; height: 6px;
        border-radius: 50%;
        background: #3b82f6;
        animation: coaDotPulse 1.4s ease-in-out infinite;
      }
      @keyframes coaDotPulse {
        0%,100% { opacity: .4; transform: scale(1); }
        50%      { opacity: 1;  transform: scale(1.35); }
      }

      /* Add Ledger button */
      .coa-tb-add {
        height: 46px; padding: 0 20px; border-radius: 14px; border: none;
        background: linear-gradient(135deg,#2563eb,#3b82f6); color: #fff;
        font-size: 14px; font-weight: 700; cursor: pointer; font-family: Inter,sans-serif;
        display: flex; align-items: center; gap: 7px; transition: filter .14s, transform .14s;
        white-space: nowrap; box-shadow: 0 3px 14px rgba(37,99,235,.32);
        flex-shrink: 0;
      }
      .coa-tb-add:hover { filter: brightness(1.08); transform: translateY(-1px); }
      .coa-tb-add:active { transform: translateY(0); }

      /* Bottom row: filter chips + utility buttons */
      .coa-search-bottom {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      /* Chip group label */
      .coa-chip-label {
        font-size: 11px;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: .08em;
        margin-right: 2px;
      }

      /* Filter chips */
      .coa-chip-group {
        display: flex;
        gap: 6px;
        align-items: center;
        flex-wrap: wrap;
      }
      .coa-chip {
        height: 32px;
        padding: 0 13px;
        border: 1.5px solid #e2e8f0;
        border-radius: 20px;
        background: #fff;
        font-size: 12.5px;
        font-weight: 600;
        color: #475569;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 5px;
        transition: all .14s;
        font-family: Inter, sans-serif;
        white-space: nowrap;
      }
      .coa-chip:hover { border-color: #93c5fd; color: #1e40af; background: #f0f7ff; }
      .coa-chip.active {
        border-color: #3b82f6;
        background: #eff6ff;
        color: #1d4ed8;
        box-shadow: 0 0 0 3px rgba(59,130,246,.1);
      }
      .coa-chip-dot {
        width: 7px; height: 7px;
        border-radius: 50%;
        background: currentColor;
        opacity: .7;
      }

      /* Divider between chip groups */
      .coa-chip-sep {
        width: 1px;
        height: 20px;
        background: #e2e8f0;
        flex-shrink: 0;
        margin: 0 2px;
      }

      /* Utility buttons (Expand/Collapse) */
      .coa-util-btn {
        height: 32px; padding: 0 12px; border: 1.5px solid #e2e8f0; background: #fff; color: #64748b;
        border-radius: 20px; font-size: 12.5px; font-weight: 600; cursor: pointer; display: flex;
        align-items: center; gap: 5px; font-family: Inter,sans-serif; transition: all .13s;
        white-space: nowrap;
      }
      .coa-util-btn:hover { background: #f8fafc; border-color: #cbd5e1; color: #334155; }

      /* Clear all filters link */
      .coa-chip-clear-all {
        height: 32px; padding: 0 12px;
        border: none; background: transparent;
        font-size: 12px; font-weight: 600; color: #ef4444;
        cursor: pointer; font-family: Inter,sans-serif;
        display: none; align-items: center; gap: 4px;
        border-radius: 20px; transition: background .13s;
      }
      .coa-chip-clear-all.visible { display: flex; }
      .coa-chip-clear-all:hover { background: #fef2f2; }

      /* ── Type toggle slider ── */
      .coa-slider-wrap {
        position:relative; display:flex; background:#f1f5f9; border-radius:12px; padding:3px; height:42px; box-sizing:border-box; margin-bottom:24px;
      }
      .coa-slider-bg {
        position:absolute; top:3px; bottom:3px; width:calc(50% - 3px); background:#fff; border-radius:9px;
        box-shadow:0 2px 8px rgba(15,23,42,0.08); transition:transform .2s cubic-bezier(.34,1.56,.64,1); z-index:1;
      }
      .coa-slider-bg.ledger-active { transform:translateX(0); }
      .coa-slider-bg.group-active { transform:translateX(100%); }
      .coa-slider-btn {
        flex:1; display:flex; align-items:center; justify-content:center; border:none; background:transparent;
        font-size:13.5px; font-weight:700; color:#64748b; cursor:pointer; font-family:Inter,sans-serif; z-index:2;
        transition:color .15s;
      }
      .coa-slider-btn.active { color:#0f172a; }

      .coa-modal-group-box {
        border:1.5px solid #e2e8f0; border-radius:16px; padding:16px; background:#f8fafc;
        display:flex; flex-direction:column; gap:14px; margin-bottom:16px; box-sizing:border-box;
      }

      /* ── Add/Edit Modal ── */
      .coa-modal-overlay {
        position:fixed; inset:0; z-index:10003;
        background:rgba(15,23,42,.55); backdrop-filter:blur(6px);
        display:flex; align-items:center; justify-content:center;
        font-family:Inter,sans-serif;
      }
      .coa-modal-card {
        background:#fff; border-radius:24px; padding:34px 36px 28px;
        max-width:480px; width:93%; box-shadow:0 40px 100px rgba(0,0,0,.22);
        animation:jePopIn .18s cubic-bezier(.34,1.3,.64,1);
      }
      .coa-modal-hdr {
        display:flex; align-items:center; justify-content:space-between; margin-bottom:22px;
      }
      .coa-modal-title { font-size:20px; font-weight:800; color:#0f172a; letter-spacing:-.4px; }
      .coa-modal-close {
        width:32px; height:32px; border-radius:8px; border:1.5px solid #e2e8f0;
        background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center;
        font-size:16px; color:#64748b; transition:all .13s;
      }
      .coa-modal-close:hover { background:#f1f5f9; }
      .coa-modal-fg { margin-bottom:16px; }
      .coa-modal-label {
        display:block; font-size:11.5px; font-weight:700; color:#64748b;
        text-transform:uppercase; letter-spacing:.07em; margin-bottom:6px;
      }
      .coa-modal-inp, .coa-modal-sel {
        width:100%; height:42px; padding:0 12px; border:1.5px solid #e2e8f0; border-radius:11px;
        font-size:14px; font-family:Inter,sans-serif; outline:none; background:#fff;
        color:#1e293b; transition:border-color .15s,box-shadow .15s; box-sizing:border-box;
      }
      .coa-modal-inp:focus, .coa-modal-sel:focus {
        border-color:#60a5fa; box-shadow:0 0 0 3px rgba(96,165,250,.15);
      }
      .coa-modal-inp.error { border-color:#f87171; }
      .coa-modal-hint { font-size:11.5px; color:#94a3b8; margin-top:5px; }
      .coa-modal-btns { display:flex; gap:10px; margin-top:24px; }
      .coa-modal-cancel {
        flex:1; height:44px; border:1.5px solid #e2e8f0; border-radius:13px;
        background:#fff; font-size:14px; font-weight:600; color:#475569; cursor:pointer;
        font-family:Inter,sans-serif; transition:all .13s;
      }
      .coa-modal-cancel:hover { background:#f8fafc; }
      .coa-modal-save {
        flex:2; height:44px; border:none; border-radius:13px;
        background:linear-gradient(135deg,#2563eb,#3b82f6);
        color:#fff; font-size:14px; font-weight:700; cursor:pointer;
        font-family:Inter,sans-serif; transition:filter .14s;
        box-shadow:0 4px 14px rgba(37,99,235,.3);
      }
      .coa-modal-save:hover { filter:brightness(1.08); }

      /* ── Main Group card ── */
      .coa-mg { border-radius:16px; overflow:hidden; box-shadow:0 2px 16px rgba(0,0,0,.07); background:#fff; }
      .coa-mg-hdr {
        display:flex; align-items:center; gap:14px;
        padding:16px 22px; cursor:pointer; user-select:none; transition:opacity .14s;
      }
      .coa-mg-hdr:hover { opacity:.88; }
      .coa-mg-badge {
        width:40px; height:40px; border-radius:12px; flex-shrink:0;
        display:flex; align-items:center; justify-content:center;
        font-size:15px; font-weight:800; color:#fff;
      }
      .coa-mg-name  { font-size:16px; font-weight:700; flex:1; }
      .coa-mg-meta  { font-size:12px; font-weight:600; opacity:.55; white-space:nowrap; }
      .coa-chevron  { transition:transform .22s; flex-shrink:0; }
      .coa-chevron.open { transform:rotate(180deg); }
      .coa-mg-body  { border-top:1.5px solid rgba(0,0,0,.06); }

      /* ── L1 Sub-Group ── */
      .coa-sg1 { border-bottom:1px solid #f1f5f9; }
      .coa-sg1:last-child { border-bottom:none; }
      .coa-sg1-hdr {
        display:flex; align-items:center; gap:10px;
        padding:11px 22px 11px 30px; cursor:pointer; user-select:none;
        background:#fafbfc; transition:background .12s;
      }
      .coa-sg1-hdr:hover { background:#f1f5f9; }
      .coa-sg1-name { font-size:13.5px; font-weight:600; color:#334155; flex:1; }
      .coa-caret { transition:transform .18s; color:#94a3b8; flex-shrink:0; }
      .coa-caret.open { transform:rotate(90deg); }
      .coa-sys-tag {
        font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em;
        padding:2px 7px; border-radius:20px; background:#f1f5f9; color:#64748b; flex-shrink:0;
      }

      /* ── L2 Sub-Group ── */
      .coa-sg2 { border-bottom:1px solid #f8fafc; }
      .coa-sg2:last-child { border-bottom:none; }
      .coa-sg2-hdr {
        display:flex; align-items:center; gap:9px;
        padding:9px 22px 9px 52px; cursor:pointer; user-select:none; transition:background .12s;
      }
      .coa-sg2-hdr:hover { background:#f8fafc; }
      .coa-sg2-name { font-size:13px; font-weight:500; color:#475569; flex:1; }

      /* ── Group Ledger node (collapsible folder under a sub-group) ── */
      .coa-gl {
        border-bottom:1px solid #fef9c3;
      }
      .coa-gl:last-of-type { border-bottom:none; }
      .coa-gl-hdr {
        display:flex; align-items:center; gap:9px;
        padding:8px 22px 8px 72px; cursor:pointer; user-select:none;
        background:#fffbeb; transition:background .12s;
      }
      .coa-gl-hdr.l1-indent { padding-left:52px; }
      .coa-gl-hdr:hover { background:#fef3c7; }
      .coa-gl-icon { font-size:14px; flex-shrink:0; }
      .coa-gl-name { font-size:13px; font-weight:600; color:#92400e; flex:1; }
      .coa-gl-tag {
        font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em;
        padding:2px 7px; border-radius:20px; background:#fde68a; color:#78350f; flex-shrink:0;
      }
      .coa-gl-acts { display:flex; gap:5px; opacity:0; transition:opacity .14s; }
      .coa-gl-hdr:hover .coa-gl-acts { opacity:1; }
      .coa-gl-body { }

      /* ── Ledger rows ── */
      .coa-ldg {
        display:flex; align-items:center; gap:8px;
        padding:7px 22px 7px 72px; border-bottom:1px solid #f8fafc;
        transition:background .1s;
      }
      .coa-ldg.l1-indent  { padding-left:52px; }
      .coa-ldg.gl-indent  { padding-left:90px; }
      .coa-ldg.gl1-indent { padding-left:70px; }
      .coa-ldg:hover { background:#fafbff; }
      .coa-ldg-dot  { width:6px; height:6px; border-radius:50%; background:#cbd5e1; flex-shrink:0; }
      .coa-ldg-name { font-size:13px; color:#475569; flex:1; }
      .coa-ldg-code { font-size:11px; color:#94a3b8; font-weight:700; font-family:monospace; }
      .coa-ldg-bal  { font-size:11.5px; color:#059669; font-weight:600; }
      .coa-ldg-acts { display:flex; gap:5px; opacity:0; transition:opacity .14s; }
      .coa-ldg:hover .coa-ldg-acts { opacity:1; }
      .coa-la {
        height:26px; padding:0 9px; border-radius:7px; font-size:11.5px; font-weight:600;
        cursor:pointer; font-family:Inter,sans-serif; transition:all .12s; border:1.5px solid #e2e8f0; background:#fff;
      }
      .coa-la-edit { color:#2563eb; } .coa-la-edit:hover { background:#dbeafe; border-color:#93c5fd; }
      .coa-la-del  { color:#dc2626; } .coa-la-del:hover  { background:#fee2e2; border-color:#fca5a5; }

      /* ── Inline edit form ── */
      .coa-edit-wrap { display:flex; align-items:center; gap:7px; flex:1; flex-wrap:wrap; }
      .coa-edit-inp {
        height:30px; padding:0 9px; border:1.5px solid #60a5fa; border-radius:7px;
        font-size:13px; font-family:Inter,sans-serif; outline:none; background:#fff;
        color:#1e293b; flex:1; min-width:140px;
      }
      .coa-edit-code {
        height:30px; padding:0 8px; border:1.5px solid #e2e8f0; border-radius:7px;
        font-size:12px; font-family:monospace; outline:none; background:#fff; color:#475569; width:80px;
      }
      .coa-edit-code:focus { border-color:#60a5fa; }
      .coa-esave { height:30px; padding:0 11px; border-radius:7px; border:none; background:#2563eb; color:#fff; font-size:12px; font-weight:700; cursor:pointer; font-family:Inter,sans-serif; }
      .coa-esave:hover { background:#1d4ed8; }
      .coa-ecanc { height:30px; padding:0 9px; border-radius:7px; border:1.5px solid #e2e8f0; background:#fff; color:#64748b; font-size:12px; cursor:pointer; font-family:Inter,sans-serif; }

      /* ── Quick add button (per sub-group) ── */
      .coa-add-row { padding:6px 22px 8px 72px; }
      .coa-add-row.l1-indent { padding-left:52px; }
      .coa-add-row.gl-indent { padding-left:90px; }
      .coa-add-btn {
        height:27px; padding:0 11px; border-radius:8px;
        border:1.5px dashed #cbd5e1; background:transparent;
        font-size:12px; font-weight:600; color:#64748b;
        cursor:pointer; transition:all .14s; font-family:Inter,sans-serif;
        display:inline-flex; align-items:center; gap:4px;
      }
      .coa-add-btn:hover { border-color:#2563eb; color:#2563eb; background:#eff6ff; }

      /* ── Search highlight ── */
      .coa-hl { background:#fef08a; border-radius:3px; padding:0 2px; }
    `;
    document.head.appendChild(s);
  }

  // ── Helpers ──────────────────────────────────────────────────────
  function _coaHl(text, q) {
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return text;
    return text.slice(0, idx)
      + `<span class="coa-hl">${text.slice(idx, idx + q.length)}</span>`
      + text.slice(idx + q.length);
  }

  function _coaLdgMatchesFilters(l, q) {
    // 1. Search Query match
    if (q) {
      const nameMatch = l.name.toLowerCase().includes(q);
      const codeMatch = (l.code || '').toLowerCase().includes(q);
      const aliasMatch = l.aliases && l.aliases.some(alias => alias.toLowerCase().includes(q));
      if (!nameMatch && !codeMatch && !aliasMatch) return false;
    }
    // 2. Type Filter match
    if (_coaFilterType) {
      if (l.type !== _coaFilterType) return false;
    }
    // 3. Opening Balance Filter match
    if (_coaFilterBal) {
      if (l.type !== 'ledger' || !parseFloat(l.openingBalance || 0)) return false;
    }
    return true;
  }

  function _coaGlMatchesFilters(gl, q) {
    if (_coaFilterType === 'ledger') return false;
    if (_coaFilterBal) return false;
    if (q) {
      const nameMatch = gl.name.toLowerCase().includes(q);
      const codeMatch = (gl.code || '').toLowerCase().includes(q);
      const aliasMatch = gl.aliases && gl.aliases.some(alias => alias.toLowerCase().includes(q));
      if (nameMatch || codeMatch || aliasMatch) return true;
    } else {
      return true;
    }
    return false;
  }

  function _coaMatchesSg(sgId, q) {
    const sg = COA_SYS_SGS.find(s => s.id === sgId);
    if (!sg) return false;
    if (_coaFilterMg && sg.main !== _coaFilterMg) return false;

    if (!q && !_coaFilterType && !_coaFilterBal) return true;

    if (q) {
      if (sg.name.toLowerCase().includes(q)) return true;
      if (Array.isArray(sg.aliases) && sg.aliases.some(a => a.toLowerCase().includes(q))) return true;
    }

    const children = COA_SYS_SGS.filter(s => s.parent === sgId);
    if (children.some(ch => _coaMatchesSg(ch.id, q))) return true;

    const sgLedgers = coaLedgers.filter(l => l.sgId === sgId);
    return sgLedgers.some(l => {
      if (l.type === 'ledger') {
        return _coaLdgMatchesFilters(l, q);
      } else {
        if (_coaGlMatchesFilters(l, q)) return true;
        const glChildren = coaLedgers.filter(ch => ch.glId === l.id);
        return glChildren.some(ch => _coaLdgMatchesFilters(ch, q));
      }
    });
  }

  function _coaMatchesMg(mgId, q) {
    if (_coaFilterMg && mgId !== _coaFilterMg) return false;
    if (!q && !_coaFilterType && !_coaFilterBal) return true;

    if (q) {
      const mg = COA_MAIN_GROUPS.find(m => m.id === mgId);
      if (mg && mg.name.toLowerCase().includes(q)) return true;
    }

    return COA_SYS_SGS.some(sg => sg.main === mgId && _coaMatchesSg(sg.id, q));
  }

  // ── Render one ledger row ────────────────────────────────────────
  function _coaLdgRow(l, indentClass, q) {
    const ic = indentClass || '';
    return `
      <div class="coa-ldg ${ic}">
        <div class="coa-ldg-dot" style="margin-top: 6px; align-self: flex-start;"></div>
        <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="coa-ldg-name" style="flex: none; cursor: pointer; text-decoration: underline dotted;" onclick="viewLedgerFromTree(${l.id})" title="Click to view ledger statement">${_coaHl(l.name, q)}</span>
            ${l.code ? `<span class="coa-ldg-code">${l.code}</span>` : ''}
          </div>
          ${l.aliases && l.aliases.length > 0 ? `<div style="font-size: 11px; color: var(--slate-400); font-weight: 500; margin-top: 2px;">A.K.A: ${l.aliases.map(a => _coaHl(a, q)).join(', ')}</div>` : ''}
        </div>
        ${l.openingBalance ? `<span class="coa-ldg-bal">₹ ${parseFloat(l.openingBalance||0).toLocaleString('en-IN')}</span>` : ''}
      </div>`;
  }

  // ── Render group ledger (supports nested group ledgers) ─────────
  function _coaRenderGl(gl, sgId, q, baseIndent, glIndent) {
    const bi = baseIndent || '';
    const gi = glIndent  || '';
    const children = coaLedgers.filter(ch => ch.glId === gl.id);
    const matchingChildren = children.filter(ch => {
      if (ch.type === 'ledger') return _coaLdgMatchesFilters(ch, q);
      return _coaGlMatchesFilters(ch, q) || coaLedgers.filter(c => c.glId === ch.id).some(c => _coaLdgMatchesFilters(c, q));
    });
    const glMatches = _coaGlMatchesFilters(gl, q);

    if (_coaFilterType === 'ledger' || _coaFilterBal) {
      let ldgHtml = '';
      for (const ch of matchingChildren) {
        if (ch.type === 'ledger') ldgHtml += _coaLdgRow(ch, bi, q);
        else ldgHtml += _coaRenderGl(ch, sgId, q, bi, gi);
      }
      return ldgHtml;
    }

    if (!glMatches && !matchingChildren.length) return '';

    const isOpen = _coaExpanded.has('gl-'+gl.id) || !!q || _coaFilterMg || _coaFilterType || _coaFilterBal;
    let childHtml = '';
    for (const ch of matchingChildren) {
      if (ch.type === 'ledger') {
        childHtml += _coaLdgRow(ch, gi, q);
      } else {
        childHtml += _coaRenderGl(ch, sgId, q, gi, gi + ' gl-nested-indent');
      }
    }

    return `
      <div class="coa-gl" data-gl-node="${gl.id}">
        <div class="coa-gl-hdr ${bi}" data-coa-toggle="gl-${gl.id}">
          <svg class="coa-caret${isOpen?' open':''}" width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M5 3l4 4-4 4" stroke="#d97706" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="coa-gl-icon">📁</span>
          <div style="display: flex; flex-direction: column; flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="coa-gl-name" style="flex: none;">${_coaHl(gl.name, q)}</span>
              ${gl.code ? `<span class="coa-ldg-code">${gl.code}</span>` : ''}
            </div>
            ${gl.aliases && gl.aliases.length > 0 ? `<div style="font-size: 11px; color: #b45309; font-weight: 500; margin-top: 2px;">A.K.A: ${gl.aliases.map(a => _coaHl(a, q)).join(', ')}</div>` : ''}
          </div>
          <div class="coa-gl-acts">
            <button class="coa-la coa-la-edit" data-coa-edit="${gl.id}" style="font-size:11px">Edit</button>
            <button class="coa-la coa-la-del"  data-coa-del="${gl.id}"  style="font-size:11px">Delete</button>
          </div>
        </div>
        <div id="coaBody-gl-${gl.id}" style="${isOpen?'':'display:none'}">
          ${childHtml || `<div style="padding:6px 22px 6px ${gi==='gl1-indent'?'72':'90'}px;font-size:12px;color:#94a3b8;font-style:italic">No ledgers yet.</div>`}
        </div>
      </div>`;
  }

  // ── Render ledgers + group-ledgers for a sub-group ───────────────
  function _coaRenderContent(sgId, q, baseIndent, glIndent) {
    const bi = baseIndent || '';
    const gi = glIndent  || '';
    let html = '';

    // 1. Top-level Group Ledgers in this sub-group
    const topGroupLdgs = coaLedgers.filter(l => l.sgId === sgId && l.type === 'group-ledger' && !l.glId);
    for (const gl of topGroupLdgs) {
      html += _coaRenderGl(gl, sgId, q, bi, gi);
    }

    // 2. Regular ledgers directly under this sub-group (no group ledger parent)
    const directLdgs = coaLedgers.filter(l => l.sgId === sgId && l.type !== 'group-ledger' && !l.glId);
    const matchingDirect = directLdgs.filter(l => _coaLdgMatchesFilters(l, q));
    for (const l of matchingDirect) {
      html += _coaLdgRow(l, bi, q);
    }

    return html;
  }

  // ── L2 sub-group ─────────────────────────────────────────────────
  function _coaRenderSg2(sg, q) {
    const hasMatch = _coaMatchesSg(sg.id, q);
    if ((q || _coaFilterMg || _coaFilterType || _coaFilterBal) && !hasMatch) return '';
    const isOpen = _coaExpanded.has(sg.id) || !!q || _coaFilterMg || _coaFilterType || _coaFilterBal;
    return `
      <div class="coa-sg2" data-sg2="${sg.id}">
        <div class="coa-sg2-hdr" data-coa-toggle="${sg.id}">
          <svg class="coa-caret${isOpen?' open':''}" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="coa-sg2-name">${_coaHl(sg.name, q)}</span>
        </div>
        <div id="coaBody-${sg.id}" style="${isOpen?'':'display:none'}">
          ${_coaRenderContent(sg.id, q, '', 'gl-indent')}
        </div>
      </div>`;
  }

  // ── L1 sub-group ─────────────────────────────────────────────────
  function _coaRenderSg1(sg, q) {
    const hasMatch = _coaMatchesSg(sg.id, q);
    if ((q || _coaFilterMg || _coaFilterType || _coaFilterBal) && !hasMatch) return '';
    const isOpen = _coaExpanded.has(sg.id) || !!q || _coaFilterMg || _coaFilterType || _coaFilterBal;
    const children = COA_SYS_SGS.filter(s => s.parent === sg.id);
    let bodyHtml = '';
    if (children.length) {
      for (const ch of children) bodyHtml += _coaRenderSg2(ch, q);
    }
    bodyHtml += _coaRenderContent(sg.id, q, 'l1-indent', 'gl1-indent');
    const isCustom = sg.id && sg.id.startsWith('sg-grp-');
    return `
      <div class="coa-sg1" data-sg1="${sg.id}">
        <div class="coa-sg1-hdr" data-coa-toggle="${sg.id}">
          <svg class="coa-caret${isOpen?' open':''}" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="coa-sg1-name">${_coaHl(sg.name, q)}</span>
          ${isCustom ? `
            <div class="coa-gl-acts" style="margin-left: auto;">
              <button class="coa-la coa-la-del" data-coa-del-sg="${sg.id}" style="font-size:11px">Delete</button>
            </div>
          ` : ''}
        </div>
        <div id="coaBody-${sg.id}" style="${isOpen?'':'display:none'}">${bodyHtml}</div>
      </div>`;
  }

  // ── Main Group card ───────────────────────────────────────────────
  function _coaRenderMg(mg, q) {
    const hasMatch = _coaMatchesMg(mg.id, q);
    if ((q || _coaFilterMg || _coaFilterType || _coaFilterBal) && !hasMatch) return '';
    const isOpen = _coaExpanded.has(mg.id) || !!q || _coaFilterMg || _coaFilterType || _coaFilterBal;
    const l1sgs = COA_SYS_SGS.filter(s => s.main === mg.id && s.parent === null);
    const totalLdg = coaLedgers.filter(l => {
      const sg = COA_SYS_SGS.find(s => s.id === l.sgId);
      return sg && sg.main === mg.id && l.type !== 'group-ledger';
    }).length;
    const totalGl = coaLedgers.filter(l => {
      const sg = COA_SYS_SGS.find(s => s.id === l.sgId);
      return sg && sg.main === mg.id && l.type === 'group-ledger';
    }).length;
    let bodyHtml = '';
    for (const sg of l1sgs) bodyHtml += _coaRenderSg1(sg, q);
    let initials = mg.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    if (mg.id === 'equity-liabilities') initials = 'L';
    const meta = [totalLdg + ' ledger' + (totalLdg!==1?'s':''), totalGl ? totalGl+' group'+(totalGl!==1?'s':'') : ''].filter(Boolean).join(' · ');
    return `
      <div class="coa-mg" data-mg="${mg.id}">
        <div class="coa-mg-hdr" data-coa-toggle="${mg.id}" style="background:${mg.light}">
          <div class="coa-mg-badge" style="background:${mg.color}">${initials}</div>
          <span class="coa-mg-name" style="color:${mg.color}">${mg.name}</span>
          <span class="coa-mg-meta">${meta}</span>
          <svg class="coa-chevron${isOpen?' open':''}" width="18" height="18" viewBox="0 0 18 18" fill="none" style="color:${mg.color}">
            <path d="M4 6l5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div id="coaBody-${mg.id}" class="coa-mg-body" style="${isOpen?'':'display:none'}">${bodyHtml}</div>
      </div>`;
  }

  // ── Add / Edit Modal ──────────────────────────────────────────────
  function _coaSubGroupOptions(selectedId) {
    return COA_SYS_SGS.map(sg => {
      const indent = sg.parent ? '\u00a0\u00a0\u00a0\u00a0' : '';
      return `<option value="${sg.id}" ${sg.id === selectedId ? 'selected' : ''}>${indent}${sg.name}</option>`;
    }).join('');
  }

  function _coaGroupLedgerOptions(sgId, selectedGlId) {
    let opts = '<option value="">— None —</option>';
    const addGlOpts = (parentId, depth) => {
      const gls = coaLedgers.filter(l => l.sgId === sgId && l.type === 'group-ledger' && (parentId ? l.glId === parentId : !l.glId));
      gls.forEach(gl => {
        const indent = '\u00a0\u00a0'.repeat(depth);
        opts += `<option value="${gl.id}" ${gl.id == selectedGlId ? 'selected':''}>${indent}${gl.name}</option>`;
        addGlOpts(gl.id, depth + 1);
      });
    };
    addGlOpts(null, 0);
    return opts;
  }

  function showCoaDeleteConfirm(ldg, onConfirm) {
    document.getElementById('coaDelOverlay')?.remove();
    const isGl = ldg.type === 'group-ledger';
    const children = isGl ? coaLedgers.filter(l => l.glId === ldg.id) : [];
    const submsg = children.length
      ? `This action cannot be undone.<br><strong style="color:#dc2626">${children.length} ledger(s) nested inside will also be deleted.</strong>`
      : `This action cannot be undone.`;

    const overlay = document.createElement('div');
    overlay.className = 'coa-del-overlay';
    overlay.id = 'coaDelOverlay';
    overlay.innerHTML = `
      <div class="coa-del-card">
        <button class="coa-del-close" id="coaDelClose" title="Close">×</button>
        <div class="coa-del-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div class="coa-del-title">Delete ${isGl ? 'Group Ledger' : 'Ledger'}</div>
        <div class="coa-del-ledger-name">${ldg.name}</div>
        <div class="coa-del-msg">Are you sure you want to delete this ${isGl ? 'Group Ledger' : 'Ledger'}?</div>
        <div class="coa-del-submsg">${submsg}</div>
        <div class="coa-del-btns">
          <button class="coa-del-btn-cancel" id="coaDelCancel">Cancel</button>
          <button class="coa-del-btn-ok" id="coaDelOk">Delete</button>
        </div>
      </div>`;
    
    document.body.appendChild(overlay);

    const handleKeydown = e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'Enter') {
        const activeEl = document.activeElement;
        if (activeEl === overlay.querySelector('#coaDelCancel') || activeEl === overlay.querySelector('#coaDelClose')) {
          return;
        }
        e.preventDefault();
        close();
        onConfirm();
      }
    };
    window.addEventListener('keydown', handleKeydown);

    const close = () => {
      window.removeEventListener('keydown', handleKeydown);
      overlay.remove();
    };

    overlay.querySelector('#coaDelClose').addEventListener('click', close);
    overlay.querySelector('#coaDelCancel').addEventListener('click', close);
    overlay.querySelector('#coaDelOk').addEventListener('click', () => { close(); onConfirm(); });
    
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    setTimeout(() => overlay.querySelector('#coaDelOk')?.focus(), 40);
  }

  function showCoaModal(presgId, preGlId, editId) {
    _coaMOpen = true;
    if (editId) {
      const ldg = coaLedgers.find(l => l.id === editId);
      if (ldg) {
        _coaMEditMode = true;
        _coaMEditId   = editId;
        _coaMType     = ldg.type;
        _coaMName     = ldg.name;
        _coaMSgId     = ldg.sgId;
        _coaMGlId     = ldg.glId || '';
        _coaMBal      = ldg.openingBalance || '';
        _coaMAliases  = ldg.aliases ? [...ldg.aliases] : [];
      }
    } else {
      _coaMEditMode = false;
      _coaMEditId   = null;
      _coaMType     = 'ledger';
      _coaMName     = '';
      _coaMSgId     = presgId || (COA_SYS_SGS[0] ? COA_SYS_SGS[0].id : '');
      _coaMGlId     = preGlId || '';
      _coaMBal      = '';
      _coaMAliases  = [];
    }
    _renderCoaModal();
  }

  function initGenericSearchableSelect(container, prefix, placeholderText = 'Search...') {
    const realSelect = container.querySelector('#' + prefix);
    const trigger = container.querySelector('#' + prefix + 'Trigger');
    const dropdown = container.querySelector('#' + prefix + 'Dropdown');
    const searchInput = container.querySelector('#' + prefix + 'Search');
    const optionsList = container.querySelector('#' + prefix + 'OptionsList');
    const triggerText = container.querySelector('#' + prefix + 'TriggerText');
    if (!realSelect || !trigger || !dropdown || !searchInput || !optionsList || !triggerText) return null;
    
    const updateTriggerText = () => {
      const selectedOpt = realSelect.options[realSelect.selectedIndex];
      if (selectedOpt) {
        triggerText.textContent = selectedOpt.textContent.trim();
      } else {
        triggerText.textContent = placeholderText;
      }
    };
    
    const populateList = (filter = '') => {
      optionsList.innerHTML = '';
      const query = filter.toLowerCase().trim();
      
      Array.from(realSelect.options).forEach((opt) => {
        const text = opt.textContent;
        const value = opt.value;
        
        if (query && !text.toLowerCase().includes(query)) {
          return;
        }
        
        const item = document.createElement('div');
        item.style.padding = '8px 12px';
        item.style.fontSize = '13.5px';
        item.style.borderRadius = '6px';
        item.style.cursor = 'pointer';
        item.style.fontWeight = opt.selected ? '700' : '500';
        item.style.background = opt.selected ? 'var(--blue-50)' : 'transparent';
        item.style.color = opt.selected ? 'var(--blue-700)' : 'var(--slate-700)';
        item.style.whiteSpace = 'pre-wrap';
        
        item.textContent = text;
        
        item.addEventListener('mouseover', () => {
          if (!opt.selected) item.style.background = 'var(--slate-50)';
        });
        item.addEventListener('mouseout', () => {
          if (!opt.selected) item.style.background = 'transparent';
        });
        
        item.addEventListener('click', () => {
          realSelect.value = value;
          realSelect.dispatchEvent(new Event('change'));
          updateTriggerText();
          dropdown.style.display = 'none';
        });
        
        optionsList.appendChild(item);
      });
      
      if (optionsList.children.length === 0) {
        const noResult = document.createElement('div');
        noResult.style.padding = '8px 12px';
        noResult.style.fontSize = '12.5px';
        noResult.style.color = 'var(--slate-400)';
        noResult.style.textAlign = 'center';
        noResult.textContent = 'No matching options';
        optionsList.appendChild(noResult);
      }
    };
    
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.style.display === 'flex';
      if (isOpen) {
        dropdown.style.display = 'none';
      } else {
        dropdown.style.display = 'flex';
        searchInput.value = '';
        populateList();
        setTimeout(() => searchInput.focus(), 50);
      }
    });
    
    searchInput.addEventListener('input', () => {
      populateList(searchInput.value);
    });
    
    dropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    const handleOutsideClick = (e) => {
      if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    };
    document.addEventListener('click', handleOutsideClick);
    
    const observer = new MutationObserver((mutations, obs) => {
      if (!container.contains(realSelect)) {
        document.removeEventListener('click', handleOutsideClick);
        obs.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    updateTriggerText();
    populateList();
    
    return {
      refresh: () => {
        updateTriggerText();
        populateList();
      }
    };
  }

  // ══════════════════════════════════════════════════════════════════
  //  PARTY HOVER & TEMPORARY IN-PLACE VOUCHER DETAILS CARD
  // ══════════════════════════════════════════════════════════════════

  let _kyaPartyHoverCardEl = null;
  let _kyaHoverHideTimeout = null;
  let _kyaPartyCardIsEditable = false;
  let _kyaPartyGlobalListenersAttached = false;

  window._salesPartyOverride = window._salesPartyOverride || null;
  window._purchasePartyOverride = window._purchasePartyOverride || null;

  function ensurePartyGlobalListeners() {
    if (_kyaPartyGlobalListenersAttached) return;
    _kyaPartyGlobalListenersAttached = true;

    // Stable dismiss only when explicitly clicking outside
    document.addEventListener('mousedown', (e) => {
      if (_kyaPartyHoverCardEl && _kyaPartyHoverCardEl.style.display !== 'none') {
        if (_kyaPartyHoverCardEl.contains(e.target) || e.target.closest('.kya-searchable-select-trigger') || e.target.closest('.kya-searchable-select-dropdown')) {
          return;
        }
        hidePartyHoverCard();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && _kyaPartyHoverCardEl && _kyaPartyHoverCardEl.style.display !== 'none') {
        hidePartyHoverCard();
      }
    });

    // Scroll listener: do not close if editable card or scrolling inside card
    window.addEventListener('scroll', (e) => {
      if (_kyaPartyHoverCardEl && _kyaPartyHoverCardEl.style.display !== 'none') {
        if (e.target && (_kyaPartyHoverCardEl === e.target || _kyaPartyHoverCardEl.contains(e.target))) {
          return;
        }
        if (_kyaPartyCardIsEditable) {
          return;
        }
        hidePartyHoverCard();
      }
    }, true);
  }

  function getOrCreatePartyHoverCard() {
    ensurePartyGlobalListeners();
    if (!_kyaPartyHoverCardEl) {
      _kyaPartyHoverCardEl = document.getElementById('kyaPartyHoverCard');
      if (!_kyaPartyHoverCardEl) {
        _kyaPartyHoverCardEl = document.createElement('div');
        _kyaPartyHoverCardEl.id = 'kyaPartyHoverCard';
        _kyaPartyHoverCardEl.style.cssText = `
          display: none;
          position: fixed;
          width: 385px;
          max-width: calc(100vw - 24px);
          max-height: calc(100vh - 24px);
          background: #ffffff;
          border: 1.5px solid var(--slate-200);
          border-radius: 14px;
          box-shadow: 0 24px 50px -10px rgba(0, 0, 0, 0.25), 0 10px 24px rgba(0, 0, 0, 0.1);
          padding: 16px 18px;
          z-index: 100050;
          pointer-events: auto;
          box-sizing: border-box;
          font-family: inherit;
          overflow-y: auto;
          scrollbar-width: thin;
          color: var(--slate-800);
        `;
        document.body.appendChild(_kyaPartyHoverCardEl);

        // Hover grace period listeners
        _kyaPartyHoverCardEl.addEventListener('mouseenter', () => {
          cancelHidePartyHoverCard();
        });
        _kyaPartyHoverCardEl.addEventListener('mouseleave', () => {
          scheduleHidePartyHoverCard(_kyaPartyCardIsEditable ? 2000 : 350);
        });
        _kyaPartyHoverCardEl.addEventListener('click', (e) => {
          cancelHidePartyHoverCard();
          e.stopPropagation();
        });
        _kyaPartyHoverCardEl.addEventListener('focusin', () => {
          cancelHidePartyHoverCard();
        });
      }
    }
    return _kyaPartyHoverCardEl;
  }

  function cancelHidePartyHoverCard() {
    if (_kyaHoverHideTimeout) {
      clearTimeout(_kyaHoverHideTimeout);
      _kyaHoverHideTimeout = null;
    }
  }

  function scheduleHidePartyHoverCard(delay = 2000) {
    cancelHidePartyHoverCard();
    _kyaHoverHideTimeout = setTimeout(() => {
      hidePartyHoverCard();
    }, delay);
  }

  function hidePartyHoverCard() {
    cancelHidePartyHoverCard();
    _kyaPartyCardIsEditable = false;
    if (_kyaPartyHoverCardEl) {
      _kyaPartyHoverCardEl.style.display = 'none';
    }
  }
  window.hidePartyHoverCard = hidePartyHoverCard;

  function findPartyById(partyId, partyType) {
    if (!partyId) return null;
    const pStr = String(partyId);
    if (partyType && partyType.toLowerCase().includes('customer')) {
      const cust = typeof getKyaCustomers === 'function' ? getKyaCustomers().find(c => String(c.id) === pStr) : null;
      if (cust) return cust;
    } else if (partyType && (partyType.toLowerCase().includes('supplier') || partyType.toLowerCase().includes('vendor'))) {
      const supp = typeof getKyaSuppliers === 'function' ? getKyaSuppliers().find(s => String(s.id) === pStr) : null;
      if (supp) return supp;
    }
    if (typeof getKyaCustomers === 'function') {
      const cust = getKyaCustomers().find(c => String(c.id) === pStr);
      if (cust) return cust;
    }
    if (typeof getKyaSuppliers === 'function') {
      const supp = getKyaSuppliers().find(s => String(s.id) === pStr);
      if (supp) return supp;
    }
    if (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) {
      return coaLedgers.find(l => String(l.id) === pStr);
    }
    return null;
  }
  window.findPartyById = findPartyById;

  function getPartyActiveDetails(partyId, partyType, context) {
    const master = findPartyById(partyId, partyType) || { id: partyId, name: '' };
    const pStr = String(partyId);

    if (context === 'sales') {
      if (window._salesPartyOverride && String(window._salesPartyOverride.partyId) === pStr) {
        return {
          master,
          active: { ...master, ...window._salesPartyOverride },
          isOverridden: Boolean(window._salesPartyOverride.isOverridden)
        };
      } else {
        const fresh = {
          partyId: pStr,
          name: master.name || '',
          contactName: master.contactName || '',
          address: master.address || '',
          city: master.city || '',
          pincode: master.pincode || '',
          state: master.state || '',
          country: master.country || 'India',
          phone: master.phone || master.mobile || '',
          email: master.email || '',
          gstin: master.gstin || '',
          pan: master.pan || '',
          bankName: master.bankName || '',
          accountNo: master.accountNo || '',
          ifsc: master.ifsc || '',
          branch: master.branch || '',
          isOverridden: false
        };
        window._salesPartyOverride = fresh;
        return { master, active: fresh, isOverridden: false };
      }
    } else if (context === 'purchase') {
      if (window._purchasePartyOverride && String(window._purchasePartyOverride.partyId) === pStr) {
        return {
          master,
          active: { ...master, ...window._purchasePartyOverride },
          isOverridden: Boolean(window._purchasePartyOverride.isOverridden)
        };
      } else {
        const fresh = {
          partyId: pStr,
          name: master.name || '',
          contactName: master.contactName || '',
          address: master.address || '',
          city: master.city || '',
          pincode: master.pincode || '',
          state: master.state || '',
          country: master.country || 'India',
          phone: master.phone || master.mobile || '',
          email: master.email || '',
          gstin: master.gstin || '',
          pan: master.pan || '',
          bankName: master.bankName || '',
          accountNo: master.accountNo || '',
          ifsc: master.ifsc || '',
          branch: master.branch || '',
          isOverridden: false
        };
        window._purchasePartyOverride = fresh;
        return { master, active: fresh, isOverridden: false };
      }
    }

    return { master, active: master, isOverridden: false };
  }
  window.getPartyActiveDetails = getPartyActiveDetails;

  function resetPartyActiveOverride(context, partyId, partyType) {
    const master = findPartyById(partyId, partyType) || { id: partyId, name: '' };
    const pStr = String(partyId);
    const fresh = {
      partyId: pStr,
      name: master.name || '',
      contactName: master.contactName || '',
      address: master.address || '',
      city: master.city || '',
      pincode: master.pincode || '',
      state: master.state || '',
      country: master.country || 'India',
      phone: master.phone || master.mobile || '',
      email: master.email || '',
      gstin: master.gstin || '',
      pan: master.pan || '',
      bankName: master.bankName || '',
      accountNo: master.accountNo || '',
      ifsc: master.ifsc || '',
      branch: master.branch || '',
      isOverridden: false
    };
    if (context === 'sales') {
      window._salesPartyOverride = fresh;
    } else if (context === 'purchase') {
      window._purchasePartyOverride = fresh;
    }
    return fresh;
  }
  window.resetPartyActiveOverride = resetPartyActiveOverride;

  function positionAndShowPartyHoverCard(targetElement, party, partyType, isEditable = false, context = '') {
    if (!targetElement || !party) return;
    cancelHidePartyHoverCard();
    _kyaPartyCardIsEditable = Boolean(isEditable);

    const card = getOrCreatePartyHoverCard();
    
    if (isEditable && (context === 'sales' || context === 'purchase')) {
      const details = getPartyActiveDetails(party.id, partyType, context);
      card.innerHTML = getPartyEditableCardHtml(details.active, details.master, partyType, details.isOverridden, context);
      attachPartyEditableCardEvents(card, party.id, partyType, context, targetElement);
    } else {
      card.innerHTML = getPartyHoverPreviewHtml(party, partyType);
    }

    card.style.display = 'block';
    card.style.visibility = 'hidden';

    // Measure card dimensions accurately
    const cardRect = card.getBoundingClientRect();
    const cardWidth = cardRect.width || (isEditable ? 385 : 325);
    const cardHeight = cardRect.height || (isEditable ? 520 : 260);

    const targetRect = targetElement.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 12;

    // Horizontal placement with screen collision detection
    const spaceRight = vw - targetRect.right;
    const spaceLeft = targetRect.left;

    let left;
    if (spaceRight >= cardWidth + margin) {
      left = targetRect.right + 10;
    } else if (spaceLeft >= cardWidth + margin) {
      left = targetRect.left - cardWidth - 10;
    } else {
      left = Math.max(margin, Math.min(targetRect.left, vw - cardWidth - margin));
    }

    // Vertical placement clamped strictly within viewport
    let top = targetRect.top - 6;
    if (top + cardHeight > vh - margin) {
      top = Math.max(margin, vh - cardHeight - margin);
    }
    if (top < margin) {
      top = margin;
    }

    // Max height containment
    const availableHeight = vh - (margin * 2);
    card.style.maxHeight = `${availableHeight}px`;
    card.style.left = `${Math.round(left)}px`;
    card.style.top = `${Math.round(top)}px`;
    card.style.visibility = 'visible';
  }

  function getPartyEditableCardHtml(activeData, masterData, typeLabel = 'Customer', isOverridden = false, context = 'sales') {
    const isCustomer = typeLabel.toLowerCase().includes('customer');
    const badgeColor = isCustomer ? '#1d4ed8' : '#15803d';
    const badgeBg = isCustomer ? '#eff6ff' : '#f0fdf4';
    const badgeBorder = isCustomer ? '#dbeafe' : '#bbf7d0';

    const bal = Number(masterData.openingBalance || 0);
    const balFormatted = typeof fmtNum === 'function' ? fmtNum(Math.abs(bal)) : Math.abs(bal).toLocaleString('en-IN', { minimumFractionDigits: 2 });

    const safeVal = (v) => (v !== undefined && v !== null ? String(v).replace(/"/g, '&quot;') : '');

    return `
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; border-bottom: 1px solid var(--slate-100); padding-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 2.5px 8px; border-radius: 6px; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder};">
            ${isCustomer ? 'Customer Details' : 'Vendor / Supplier Details'}
          </span>
          <span id="kyaHovStatusBadge" style="font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 999px; ${isOverridden ? 'background: #fef3c7; color: #b45309; border: 1px solid #fde68a;' : 'background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0;'}">
            ${isOverridden ? '● Voucher Override' : '● Master Default'}
          </span>
        </div>
        <button type="button" id="kyaHovCloseBtn" title="Close" style="background: transparent; border: none; cursor: pointer; color: var(--slate-400); font-size: 18px; line-height: 1; padding: 2px 6px; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: color 0.15s;" onmouseover="this.style.color='var(--slate-800)'" onmouseout="this.style.color='var(--slate-400)'">&times;</button>
      </div>

      <!-- Temporary Notice Strip with Hover Tooltip -->
      <div style="margin-bottom: 12px; position: relative;">
        <div class="kya-temp-voucher-edit-wrap" 
             tabindex="0"
             title="Changes made here apply only to this voucher and will not alter the master database record." 
             style="display: inline-flex; align-items: center; gap: 6px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 4.5px 10px; font-size: 11px; color: #1e40af; cursor: help; user-select: none; position: relative; transition: all 0.15s ease;"
             onmouseenter="const t=this.querySelector('.kya-temp-voucher-tooltip'); if(t) t.style.display='block';"
             onmouseleave="const t=this.querySelector('.kya-temp-voucher-tooltip'); if(t) t.style.display='none';">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="color: #2563eb; flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <span style="font-weight: 600; text-decoration: underline dotted #3b82f6; text-underline-offset: 2.5px;">Temporary In-Voucher Edit:</span>
          <span style="font-size: 10px; color: #3b82f6; opacity: 0.85;">(hover for info)</span>

          <!-- Tooltip on cursor hover -->
          <div class="kya-temp-voucher-tooltip" style="display: none; position: absolute; top: calc(100% + 6px); left: 0; min-width: 270px; max-width: 320px; background: #1e293b; color: #f8fafc; font-size: 11px; font-weight: 400; line-height: 1.45; padding: 8px 11px; border-radius: 7px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.15); border: 1px solid #334155; z-index: 100010; pointer-events: none; white-space: normal;">
            Changes made here apply <em>only to this voucher</em> and will not alter the master database record.
            <div style="position: absolute; top: -5px; left: 24px; width: 8px; height: 8px; background: #1e293b; border-left: 1px solid #334155; border-top: 1px solid #334155; transform: rotate(45deg);"></div>
          </div>
        </div>
      </div>

      <!-- Editable Fields -->
      <div style="display: flex; flex-direction: column; gap: 9px; font-size: 12px;">
        <!-- Name -->
        <div>
          <label style="font-size: 11px; font-weight: 700; color: var(--slate-700); margin-bottom: 3px; display: block;">
            Billing / Display Name
          </label>
          <input type="text" id="kyaHovName" value="${safeVal(activeData.name)}" class="je-input" placeholder="Party Name" style="width: 100%; height: 30px; font-size: 12.5px; padding: 4px 8px; border-radius: 6px; box-sizing: border-box;" />
        </div>

        <!-- Contact Person -->
        <div>
          <label style="font-size: 11px; font-weight: 700; color: var(--slate-700); margin-bottom: 3px; display: block;">
            Attention / Contact Person
          </label>
          <input type="text" id="kyaHovContactName" value="${safeVal(activeData.contactName)}" class="je-input" placeholder="Contact Person (Optional)" style="width: 100%; height: 30px; font-size: 12px; padding: 4px 8px; border-radius: 6px; box-sizing: border-box;" />
        </div>

        <!-- Address -->
        <div>
          <label style="font-size: 11px; font-weight: 700; color: var(--slate-700); margin-bottom: 3px; display: block;">
            Street Address / Building
          </label>
          <textarea id="kyaHovAddress" class="je-input" rows="2" placeholder="Street Address / Building / Area" style="width: 100%; font-size: 12px; padding: 5px 8px; border-radius: 6px; box-sizing: border-box; resize: vertical; font-family: inherit;">${activeData.address || ''}</textarea>
        </div>

        <!-- City & Pincode -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div>
            <label style="font-size: 10.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 2px; display: block;">City / Town</label>
            <input type="text" id="kyaHovCity" value="${safeVal(activeData.city)}" class="je-input" placeholder="City" style="width: 100%; height: 28px; font-size: 12px; padding: 3px 7px; border-radius: 6px; box-sizing: border-box;" />
          </div>
          <div>
            <label style="font-size: 10.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 2px; display: block;">PIN Code</label>
            <input type="text" id="kyaHovPincode" value="${safeVal(activeData.pincode)}" class="je-input" placeholder="PIN Code" style="width: 100%; height: 28px; font-size: 12px; padding: 3px 7px; border-radius: 6px; box-sizing: border-box;" />
          </div>
        </div>

        <!-- State & Country -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div>
            <label style="font-size: 10.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 2px; display: block;">State</label>
            <input type="text" id="kyaHovState" value="${safeVal(activeData.state)}" class="je-input" placeholder="State" style="width: 100%; height: 28px; font-size: 12px; padding: 3px 7px; border-radius: 6px; box-sizing: border-box;" />
          </div>
          <div>
            <label style="font-size: 10.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 2px; display: block;">Country</label>
            <input type="text" id="kyaHovCountry" value="${safeVal(activeData.country || 'India')}" class="je-input" placeholder="Country" style="width: 100%; height: 28px; font-size: 12px; padding: 3px 7px; border-radius: 6px; box-sizing: border-box;" />
          </div>
        </div>

        <!-- Phone & Email -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div>
            <label style="font-size: 10.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 2px; display: block;">Phone / Mobile</label>
            <input type="text" id="kyaHovPhone" value="${safeVal(activeData.phone)}" class="je-input" placeholder="Phone" style="width: 100%; height: 28px; font-size: 12px; padding: 3px 7px; border-radius: 6px; box-sizing: border-box;" />
          </div>
          <div>
            <label style="font-size: 10.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 2px; display: block;">Email Address</label>
            <input type="text" id="kyaHovEmail" value="${safeVal(activeData.email)}" class="je-input" placeholder="Email" style="width: 100%; height: 28px; font-size: 12px; padding: 3px 7px; border-radius: 6px; box-sizing: border-box;" />
          </div>
        </div>

        <!-- GSTIN & PAN -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div>
            <label style="font-size: 10.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 2px; display: block;">GSTIN</label>
            <input type="text" id="kyaHovGstin" value="${safeVal(activeData.gstin)}" maxlength="15" class="je-input" placeholder="GSTIN" style="width: 100%; height: 28px; font-size: 11.5px; padding: 3px 7px; border-radius: 6px; box-sizing: border-box; text-transform: uppercase; font-family: monospace;" />
          </div>
          <div>
            <label style="font-size: 10.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 2px; display: block;">PAN</label>
            <input type="text" id="kyaHovPan" value="${safeVal(activeData.pan)}" maxlength="10" class="je-input" placeholder="PAN" style="width: 100%; height: 28px; font-size: 11.5px; padding: 3px 7px; border-radius: 6px; box-sizing: border-box; text-transform: uppercase; font-family: monospace;" />
          </div>
        </div>

        <!-- Bank Details Option -->
        <div style="margin-top: 4px; padding-top: 8px; border-top: 1px dashed var(--slate-200);">
          <div style="font-size: 11px; font-weight: 700; color: var(--slate-700); text-transform: uppercase; display: flex; align-items: center; gap: 5px; margin-bottom: 6px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--slate-500);"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
            Bank Details
          </div>

          <!-- Bank Name & Account No -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
            <div>
              <label style="font-size: 10.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 2px; display: block;">Bank Name</label>
              <input type="text" id="kyaHovBankName" value="${safeVal(activeData.bankName)}" class="je-input" placeholder="e.g. HDFC Bank" style="width: 100%; height: 28px; font-size: 12px; padding: 3px 7px; border-radius: 6px; box-sizing: border-box;" />
            </div>
            <div>
              <label style="font-size: 10.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 2px; display: block;">Account Number</label>
              <input type="text" id="kyaHovAccountNo" value="${safeVal(activeData.accountNo)}" class="je-input" placeholder="A/C Number" style="width: 100%; height: 28px; font-size: 12px; padding: 3px 7px; border-radius: 6px; box-sizing: border-box; font-family: monospace;" />
            </div>
          </div>

          <!-- IFSC & Branch -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div>
              <label style="font-size: 10.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 2px; display: block;">IFSC Code</label>
              <input type="text" id="kyaHovIfsc" value="${safeVal(activeData.ifsc)}" maxlength="11" class="je-input" placeholder="IFSC Code" style="width: 100%; height: 28px; font-size: 11.5px; padding: 3px 7px; border-radius: 6px; box-sizing: border-box; text-transform: uppercase; font-family: monospace;" />
            </div>
            <div>
              <label style="font-size: 10.5px; font-weight: 600; color: var(--slate-600); margin-bottom: 2px; display: block;">Branch</label>
              <input type="text" id="kyaHovBranch" value="${safeVal(activeData.branch)}" class="je-input" placeholder="Branch Name" style="width: 100%; height: 28px; font-size: 12px; padding: 3px 7px; border-radius: 6px; box-sizing: border-box;" />
            </div>
          </div>
        </div>
      </div>

      <!-- Master Reference Strip -->
      <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid var(--slate-200); border-radius: 6px; padding: 5px 8px; margin-top: 10px; font-size: 11px;">
        <span style="color: var(--slate-500);">Master Balance: <strong style="color: var(--slate-800);">₹ ${balFormatted}</strong></span>
        <span id="kyaHovSavedHint" style="color: #15803d; font-weight: 600; font-size: 10.5px; display: flex; align-items: center; gap: 3px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Active for voucher
        </span>
      </div>

      <!-- Footer Buttons -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; pt-1; border-top: 1px solid var(--slate-100);">
        <button type="button" id="kyaHovResetBtn" class="btn btn-secondary btn-sm" style="font-size: 11px; padding: 4px 10px; height: 28px; display: flex; align-items: center; gap: 4px; color: var(--slate-600);">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
          Reset to Master
        </button>
        <button type="button" id="kyaHovDoneBtn" class="btn btn-primary btn-sm" style="font-size: 11px; padding: 4px 14px; height: 28px; font-weight: 600;">
          Done
        </button>
      </div>
    `;
  }

  function attachPartyEditableCardEvents(card, partyId, partyType, context, targetElement) {
    const fields = ['Name', 'ContactName', 'Address', 'City', 'Pincode', 'State', 'Country', 'Phone', 'Email', 'Gstin', 'Pan', 'BankName', 'AccountNo', 'Ifsc', 'Branch'];
    const pStr = String(partyId);

    const updateOverride = () => {
      let override = (context === 'sales') ? window._salesPartyOverride : window._purchasePartyOverride;
      if (!override || String(override.partyId) !== pStr) {
        override = { partyId: pStr, isOverridden: true };
      }

      fields.forEach(f => {
        const inp = card.querySelector('#kyaHov' + f);
        if (inp) {
          const key = f.charAt(0).toLowerCase() + f.slice(1);
          override[key] = inp.value.trim();
        }
      });
      override.isOverridden = true;

      if (context === 'sales') {
        window._salesPartyOverride = override;
        const triggerText = document.getElementById('salesCustomerSelectTriggerText');
        if (triggerText && override.name) {
          triggerText.textContent = override.name;
        }
      } else if (context === 'purchase') {
        window._purchasePartyOverride = override;
        const triggerText = document.getElementById('purchaseVendorSelectTriggerText');
        if (triggerText && override.name) {
          triggerText.textContent = override.name;
        }
      }

      const statusBadge = card.querySelector('#kyaHovStatusBadge');
      if (statusBadge) {
        statusBadge.textContent = '● Voucher Override';
        statusBadge.style.background = '#fef3c7';
        statusBadge.style.color = '#b45309';
        statusBadge.style.border = '1px solid #fde68a';
      }

      const savedHint = card.querySelector('#kyaHovSavedHint');
      if (savedHint) {
        savedHint.style.opacity = '1';
      }
    };

    fields.forEach(f => {
      const inp = card.querySelector('#kyaHov' + f);
      if (inp) {
        inp.addEventListener('input', () => {
          if (f === 'Gstin' || f === 'Pan' || f === 'Ifsc') {
            inp.value = inp.value.toUpperCase();
          }
          if (f === 'Gstin') {
            const panInp = card.querySelector('#kyaHovPan');
            if (panInp && !panInp.value && inp.value.length >= 12) {
              panInp.value = inp.value.substring(2, 12);
            }
          }
          updateOverride();
        });
        inp.addEventListener('change', updateOverride);
      }
    });

    const resetBtn = card.querySelector('#kyaHovResetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const fresh = resetPartyActiveOverride(context, partyId, partyType);
        
        fields.forEach(f => {
          const inp = card.querySelector('#kyaHov' + f);
          if (inp) {
            const key = f.charAt(0).toLowerCase() + f.slice(1);
            inp.value = fresh[key] || '';
          }
        });

        const statusBadge = card.querySelector('#kyaHovStatusBadge');
        if (statusBadge) {
          statusBadge.textContent = '● Master Default';
          statusBadge.style.background = '#f1f5f9';
          statusBadge.style.color = '#64748b';
          statusBadge.style.border = '1px solid #e2e8f0';
        }

        if (context === 'sales') {
          const triggerText = document.getElementById('salesCustomerSelectTriggerText');
          if (triggerText && fresh.name) triggerText.textContent = fresh.name;
        } else if (context === 'purchase') {
          const triggerText = document.getElementById('purchaseVendorSelectTriggerText');
          if (triggerText && fresh.name) triggerText.textContent = fresh.name;
        }

        if (typeof showToast === 'function') {
          showToast('Reset to original master details.', 'info');
        }
      });
    }

    const closeBtn = card.querySelector('#kyaHovCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        hidePartyHoverCard();
      });
    }

    const doneBtn = card.querySelector('#kyaHovDoneBtn');
    if (doneBtn) {
      doneBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        hidePartyHoverCard();
      });
    }
  }

  function getPartyHoverPreviewHtml(party, typeLabel = 'Customer') {
    if (!party) return '';

    const name = party.name || 'Unnamed Party';
    const aliases = Array.isArray(party.aliases) && party.aliases.length > 0 ? party.aliases.join(', ') : '';
    const contactName = party.contactName ? party.contactName.trim() : '';

    // Address parts
    const addrParts = [];
    if (party.address) addrParts.push(party.address.trim());
    const cityPin = [party.city, party.pincode].filter(Boolean).map(s => s.trim()).join(' - ');
    if (cityPin) addrParts.push(cityPin);
    const stateCountry = [party.state, party.country || 'India'].filter(Boolean).map(s => s.trim()).join(', ');
    if (stateCountry) addrParts.push(stateCountry);
    const fullAddress = addrParts.length > 0 ? addrParts.join('<br/>') : '<span style="color: var(--slate-400); font-style: italic;">No address provided</span>';

    // Bank parts
    const hasBank = Boolean(party.bankName || party.accountNo || party.ifsc || party.branch);
    let bankHtml = '';
    if (hasBank) {
      bankHtml = `
        <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--slate-200); font-size: 11.5px; line-height: 1.45;">
          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--slate-500); margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
            Bank Details
          </div>
          ${party.bankName ? `<div><span style="color: var(--slate-500);">Bank:</span> <strong style="color: var(--slate-800);">${party.bankName}</strong></div>` : ''}
          ${party.accountNo ? `<div><span style="color: var(--slate-500);">A/C No:</span> <strong style="color: var(--slate-800); font-family: monospace;">${party.accountNo}</strong></div>` : ''}
          ${party.ifsc ? `<div><span style="color: var(--slate-500);">IFSC:</span> <strong style="color: var(--blue-700); font-family: monospace;">${party.ifsc}</strong></div>` : ''}
          ${party.branch ? `<div><span style="color: var(--slate-500);">Branch:</span> <span style="color: var(--slate-700);">${party.branch}</span></div>` : ''}
        </div>
      `;
    }

    // Tax parts (GSTIN & PAN)
    const hasTax = Boolean(party.gstin || party.pan);
    let taxHtml = '';
    if (hasTax) {
      taxHtml = `
        <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--slate-200); font-size: 11.5px; line-height: 1.45;">
          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--slate-500); margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Tax Identification
          </div>
          ${party.gstin ? `<div><span style="color: var(--slate-500);">GSTIN:</span> <strong style="color: #047857; background: #ecfdf5; padding: 1px 5px; border-radius: 4px; font-family: monospace; font-size: 11px;">${party.gstin}</strong></div>` : ''}
          ${party.pan ? `<div><span style="color: var(--slate-500);">PAN:</span> <strong style="color: var(--slate-800); font-family: monospace;">${party.pan}</strong></div>` : ''}
        </div>
      `;
    }

    // Opening / Current Balance
    const bal = Number(party.openingBalance || 0);
    const balFormatted = typeof fmtNum === 'function' ? fmtNum(Math.abs(bal)) : Math.abs(bal).toLocaleString('en-IN', { minimumFractionDigits: 2 });

    return `
      <!-- Title & Badge -->
      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 8px;">
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 13.5px; font-weight: 700; color: var(--slate-900); line-height: 1.3; word-break: break-word;">${name}</div>
          ${contactName ? `<div style="font-size: 11.5px; color: var(--slate-500); font-weight: 500; margin-top: 2px;">Attn: ${contactName}</div>` : ''}
          ${aliases ? `<div style="font-size: 11px; color: var(--blue-600); font-weight: 500; margin-top: 2px;">A.K.A: ${aliases}</div>` : ''}
        </div>
        <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 7px; border-radius: 6px; background: ${typeLabel.toLowerCase().includes('customer') ? '#eff6ff' : '#f0fdf4'}; color: ${typeLabel.toLowerCase().includes('customer') ? '#1d4ed8' : '#15803d'}; border: 1px solid ${typeLabel.toLowerCase().includes('customer') ? '#dbeafe' : '#bbf7d0'}; white-space: nowrap;">${typeLabel}</span>
      </div>

      <!-- Balance Strip -->
      <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid var(--slate-200); border-radius: 6px; padding: 5px 8px; margin-bottom: 8px; font-size: 11.5px;">
        <span style="color: var(--slate-500); font-weight: 500;">Opening Balance</span>
        <span style="font-weight: 700; color: var(--slate-800);">₹ ${balFormatted}</span>
      </div>

      <!-- Address -->
      <div style="font-size: 11.5px; line-height: 1.45;">
        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--slate-500); margin-bottom: 3px; display: flex; align-items: center; gap: 4px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          Address & Location
        </div>
        <div style="color: var(--slate-700);">${fullAddress}</div>
      </div>

      <!-- Tax -->
      ${taxHtml}

      <!-- Bank -->
      ${bankHtml}
    `;
  }

  function initPartySearchableSelect(selectId, placeholderText = 'Select Party', partyType = 'Customer') {
    const realSelect = document.getElementById(selectId);
    const wrap = document.getElementById(selectId + 'SelectWrap');
    const trigger = document.getElementById(selectId + 'SelectTrigger');
    const triggerText = document.getElementById(selectId + 'SelectTriggerText');
    const dropdown = document.getElementById(selectId + 'SelectDropdown');
    const searchInput = document.getElementById(selectId + 'SelectSearch');
    const optionsList = document.getElementById(selectId + 'SelectOptionsList');

    if (!realSelect || !wrap || !trigger || !triggerText || !dropdown || !searchInput || !optionsList) {
      return null;
    }

    const context = (selectId === 'salesCustomer' || partyType.toLowerCase().includes('customer')) ? 'sales' : (selectId === 'purchaseVendor' || partyType.toLowerCase().includes('vendor') || partyType.toLowerCase().includes('supplier') ? 'purchase' : 'generic');

    const updateTriggerText = () => {
      const selectedOpt = realSelect.options[realSelect.selectedIndex];
      if (selectedOpt && selectedOpt.value) {
        const partyId = selectedOpt.value;
        const details = getPartyActiveDetails(partyId, partyType, context);
        const displayName = (details && details.active && details.active.name) ? details.active.name : selectedOpt.textContent.trim();
        triggerText.textContent = displayName;
        triggerText.style.color = 'var(--slate-800)';
      } else {
        triggerText.textContent = placeholderText;
        triggerText.style.color = 'var(--slate-400)';
      }
    };

    let triggerHoverTimer = null;
    const cancelTriggerHoverTimer = () => {
      if (triggerHoverTimer) {
        clearTimeout(triggerHoverTimer);
        triggerHoverTimer = null;
      }
    };

    // Hover on trigger box when party is selected: show editable details stably after 1 second hover
    trigger.addEventListener('mouseenter', () => {
      cancelTriggerHoverTimer();
      cancelHidePartyHoverCard();
      if (dropdown.style.display === 'flex') return;
      const partyId = realSelect.value;
      if (!partyId) return;
      const party = findPartyById(partyId, partyType);
      if (party) {
        if (_kyaPartyHoverCardEl && _kyaPartyHoverCardEl.style.display === 'block' && _kyaPartyCardIsEditable) {
          return;
        }
        triggerHoverTimer = setTimeout(() => {
          if (dropdown.style.display === 'flex') return;
          const currentPartyId = realSelect.value;
          if (!currentPartyId) return;
          const currentParty = findPartyById(currentPartyId, partyType);
          if (currentParty) {
            cancelHidePartyHoverCard();
            positionAndShowPartyHoverCard(trigger, currentParty, partyType, true, context);
          }
        }, 1000);
      }
    });

    trigger.addEventListener('mouseleave', () => {
      cancelTriggerHoverTimer();
      if (_kyaPartyHoverCardEl && _kyaPartyHoverCardEl.style.display === 'block') {
        scheduleHidePartyHoverCard(_kyaPartyCardIsEditable ? 2000 : 350);
      }
    });

    const populateList = (filter = '') => {
      optionsList.innerHTML = '';
      const query = filter.toLowerCase().trim();

      Array.from(realSelect.options).forEach((opt) => {
        if (!opt.value) return;

        const partyId = opt.value;
        const party = findPartyById(partyId, partyType);

        const text = opt.textContent.trim();
        const aliasStr = party && Array.isArray(party.aliases) ? party.aliases.join(' ') : '';
        const gstinStr = party && party.gstin ? party.gstin : '';
        const panStr = party && party.pan ? party.pan : '';
        const searchCorpus = `${text} ${aliasStr} ${gstinStr} ${panStr}`.toLowerCase();

        if (query && !searchCorpus.includes(query)) {
          return;
        }

        const isSelected = (realSelect.value === opt.value);
        const item = document.createElement('div');
        item.style.cssText = `
          padding: 8px 12px;
          font-size: 13px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: ${isSelected ? '700' : '500'};
          background: ${isSelected ? 'var(--blue-50)' : 'transparent'};
          color: ${isSelected ? 'var(--blue-700)' : 'var(--slate-700)'};
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: background 0.15s ease;
        `;

        item.innerHTML = `
          <div style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            <span>${party ? party.name : text}</span>
            ${party && party.aliases && party.aliases.length > 0 ? `<span style="font-size: 11px; color: var(--blue-600); margin-left: 6px;">[A.K.A: ${party.aliases.join(', ')}]</span>` : ''}
          </div>
          ${party && party.gstin ? `<span style="font-size: 10px; color: #047857; background: #ecfdf5; padding: 1px 5px; border-radius: 4px; font-family: monospace; margin-left: 6px;">GSTIN</span>` : ''}
        `;

        item.addEventListener('mouseenter', () => {
          if (!isSelected) item.style.background = 'var(--slate-50)';
          if (!party) return;
          cancelHidePartyHoverCard();
          positionAndShowPartyHoverCard(item, party, partyType, false, '');
        });

        item.addEventListener('mouseleave', () => {
          if (!isSelected) item.style.background = 'transparent';
          scheduleHidePartyHoverCard(250);
        });

        item.addEventListener('click', () => {
          realSelect.value = opt.value;
          realSelect.dispatchEvent(new Event('change'));
          updateTriggerText();
          dropdown.style.display = 'none';
          hidePartyHoverCard();
        });

        optionsList.appendChild(item);
      });

      if (optionsList.children.length === 0) {
        const isSales = (selectId === 'salesCustomer' || partyType.toLowerCase().includes('customer'));
        const isPurch = (selectId === 'purchaseVendor' || partyType.toLowerCase().includes('vendor') || partyType.toLowerCase().includes('supplier'));

        const emptyWrap = document.createElement('div');
        emptyWrap.className = 'kya-party-empty-wrap';
        emptyWrap.style.cssText = 'padding: 14px 10px; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center;';

        const labelTxt = isSales ? 'No Customer Found' : (isPurch ? 'No Vendor Found' : `No ${partyType}s found`);
        emptyWrap.innerHTML = `
          <div style="font-size: 13px; font-weight: 600; color: var(--slate-500); margin-bottom: 2px;">
            ${labelTxt}
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px; width: 100%;">
            <button type="button" class="je-drop-create-item party-create-ledger-btn" style="width: 100%; justify-content: center;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Create Ledger</span>
            </button>
          </div>
        `;

        const btnCreateLedger = emptyWrap.querySelector('.party-create-ledger-btn');

        if (btnCreateLedger) {
          btnCreateLedger.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropdown.style.display = 'none';
            hidePartyHoverCard();
            const q = searchInput.value.trim();
            if (typeof window.openMasterDeskCreateLedger === 'function') {
              window.openMasterDeskCreateLedger({
                initialName: q,
                groupVal: isSales ? 'sg:sg-tr' : 'sg:sg-tp',
                returnTab: isSales ? 'sales_voucher' : 'purchase_voucher',
                selectId: selectId
              });
            }
          });
        }

        optionsList.appendChild(emptyWrap);
      }
    };

    trigger.addEventListener('click', (e) => {
      cancelTriggerHoverTimer();
      e.stopPropagation();
      const isOpen = dropdown.style.display === 'flex';
      hidePartyHoverCard();
      if (isOpen) {
        dropdown.style.display = 'none';
      } else {
        dropdown.style.display = 'flex';
        searchInput.value = '';
        populateList();
        setTimeout(() => searchInput.focus(), 50);
      }
    });

    searchInput.addEventListener('input', () => {
      populateList(searchInput.value);
    });

    dropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    dropdown.addEventListener('scroll', () => {
      cancelTriggerHoverTimer();
      hidePartyHoverCard();
    });

    document.addEventListener('click', (e) => {
      if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });

    realSelect.addEventListener('change', () => {
      cancelTriggerHoverTimer();
      updateTriggerText();
    });

    updateTriggerText();
    populateList();

    return {
      refresh: () => {
        updateTriggerText();
        populateList();
      },
      close: () => {
        cancelTriggerHoverTimer();
        dropdown.style.display = 'none';
        hidePartyHoverCard();
      }
    };
  }

  window.positionAndShowPartyHoverCard = positionAndShowPartyHoverCard;
  window.getPartyHoverPreviewHtml = getPartyHoverPreviewHtml;
  window.initPartySearchableSelect = initPartySearchableSelect;

  function initCoaSearchableSelect(overlay) {
    initGenericSearchableSelect(overlay, 'coaMSubGroup', 'Select Sub Group');
  }

  function _renderCoaModal() {
    document.getElementById('coaModalOverlay')?.remove();
    if (!_coaMOpen) return;

    const isLedger = _coaMType === 'ledger';

    // ── build sub-group options (Sub Group name only, no Main Group prefix) ──
    const sgOpts = COA_SYS_SGS.map(sg => {
      const indent = sg.parent ? '\u00a0\u00a0\u00a0\u00a0' : '';
      return `<option value="${sg.id}" ${sg.id === _coaMSgId ? 'selected' : ''}>${indent}${sg.name}</option>`;
    }).join('');

    // ── group-ledger options for the selected sub-group ──
    const glsInSg = coaLedgers.filter(l => l.sgId === _coaMSgId && l.type === 'group-ledger');
    const glOpts  = ['<option value="">— None —</option>',
      ...glsInSg.map(gl => `<option value="${gl.id}" ${gl.id == _coaMGlId ? 'selected' : ''}>${gl.name}</option>`)
    ].join('');

    const titleText = _coaMEditMode
      ? (isLedger ? '✎ Edit Ledger' : '✎ Edit Group Ledger')
      : (isLedger ? '＋ Add Ledger' : '＋ Add Group Ledger');

    const overlay = document.createElement('div');
    overlay.className = 'coa-modal-overlay';
    overlay.id        = 'coaModalOverlay';
    overlay.innerHTML = `
      <div class="coa-modal-card" id="coaModalCard">
        <div class="coa-modal-hdr">
          <div class="coa-modal-title">${titleText}</div>
          <button class="coa-modal-close" id="coaModalClose">✕</button>
        </div>

        <!-- Slider toggle (disabled in edit mode) -->
        <div class="coa-slider-wrap" ${_coaMEditMode ? 'style="opacity: 0.6; pointer-events: none;"' : ''}>
          <div class="coa-slider-bg ${isLedger ? 'ledger-active' : 'group-active'}"></div>
          <button class="coa-slider-btn${isLedger ? ' active' : ''}" id="coaTogLedger" type="button">Ledger</button>
          <button class="coa-slider-btn${!isLedger ? ' active' : ''}" id="coaTogGroup"  type="button">Group Ledger</button>
        </div>

        ${isLedger ? `
          <!-- LEDGER mode -->
          <div class="coa-modal-fg">
            <label class="coa-modal-label">Ledger Name *</label>
            <input class="coa-modal-inp" id="coaMLedgerName"
              placeholder="e.g. Cash in Hand"
              value="${_coaMName.replace(/"/g,'&quot;')}">
          </div>

          <div class="coa-modal-fg" style="margin-top: 12px; margin-bottom: 12px;">
            <label class="coa-modal-label">Also Known As (A.K.A) / Aliases</label>
            <div id="coaMAliasesContainer" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;"></div>
            <button type="button" class="btn btn-secondary btn-sm" id="coaMAddAliasBtn" style="padding: 6px 12px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; color: var(--slate-600);">
              ＋ Add A.K.A
            </button>
          </div>

          <div class="coa-modal-group-box">
            <div class="coa-modal-fg" style="position: relative;">
              <label class="coa-modal-label">Sub Group *</label>
              <select class="coa-modal-sel" id="coaMSubGroup" style="display: none;">${sgOpts}</select>
              <div class="kya-searchable-select-wrap" id="coaMSubGroupSearchableWrap" style="position: relative; width: 100%;">
                <div class="kya-searchable-select-trigger" id="coaMSubGroupTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10.5px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                  <span id="coaMSubGroupTriggerText">Select Sub Group</span>
                  <span style="font-size: 10px; color: var(--slate-400);">▼</span>
                </div>
                <div class="kya-searchable-select-dropdown" id="coaMSubGroupDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 240px; overflow-y: auto; flex-direction: column; gap: 4px; width: 100%; box-sizing: border-box;">
                  <input type="text" id="coaMSubGroupSearch" placeholder="Search sub group..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                  <div id="coaMSubGroupOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                </div>
              </div>
            </div>
            <div class="coa-modal-fg">
              <label class="coa-modal-label">
                Group Ledger (Sub Group)
                <span style="font-weight:400;text-transform:none;font-size:11px;margin-left:4px">(Optional)</span>
              </label>
              <select class="coa-modal-sel" id="coaMGroupLedger">${glOpts}</select>
            </div>
          </div>

          <div class="coa-modal-fg">
            <label class="coa-modal-label">
              Opening Balance
              <span style="font-weight:400;text-transform:none;font-size:11px;margin-left:4px">(Optional)</span>
            </label>
            <input class="coa-modal-inp" id="coaMBalance"
              type="number" min="0" step="0.01"
              placeholder="₹ 0.00" value="${_coaMBal}">
          </div>
        ` : `
          <!-- GROUP LEDGER mode -->
          <div class="coa-modal-fg">
            <label class="coa-modal-label">Group Ledger Name *</label>
            <input class="coa-modal-inp" id="coaMLedgerName"
              placeholder="e.g. Fixed Assets Group"
              value="${_coaMName.replace(/"/g,'&quot;')}">
          </div>

          <div class="coa-modal-fg" style="margin-top: 12px; margin-bottom: 12px;">
            <label class="coa-modal-label">Also Known As (A.K.A) / Aliases</label>
            <div id="coaMAliasesContainer" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;"></div>
            <button type="button" class="btn btn-secondary btn-sm" id="coaMAddAliasBtn" style="padding: 6px 12px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; color: var(--slate-600);">
              ＋ Add A.K.A
            </button>
          </div>

          <div class="coa-modal-fg" style="position: relative;">
            <label class="coa-modal-label">Sub Group *</label>
            <select class="coa-modal-sel" id="coaMSubGroup" style="display: none;">${sgOpts}</select>
            <div class="kya-searchable-select-wrap" id="coaMSubGroupSearchableWrap" style="position: relative; width: 100%;">
              <div class="kya-searchable-select-trigger" id="coaMSubGroupTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10.5px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                <span id="coaMSubGroupTriggerText">Select Sub Group</span>
                <span style="font-size: 10px; color: var(--slate-400);">▼</span>
              </div>
              <div class="kya-searchable-select-dropdown" id="coaMSubGroupDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 240px; overflow-y: auto; flex-direction: column; gap: 4px; width: 100%; box-sizing: border-box;">
                <input type="text" id="coaMSubGroupSearch" placeholder="Search sub group..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                <div id="coaMSubGroupOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
              </div>
            </div>
          </div>
        `}

        <div class="coa-modal-btns">
          <button class="coa-modal-cancel" id="coaModalCancel">Cancel</button>
          <button class="coa-modal-save"   id="coaModalSave">
            ${_coaMEditMode ? 'Save Changes' : (isLedger ? '＋ Add Ledger' : '＋ Add Group Ledger')}
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    setTimeout(() => overlay.querySelector('#coaMLedgerName')?.focus(), 40);
    initCoaSearchableSelect(overlay);

    const addAliasBtn = overlay.querySelector('#coaMAddAliasBtn');
    const updateAddBtnVisibility = () => {
      if (!addAliasBtn) return;
      const hasEmpty = _coaMAliases.some(a => a.trim() === '');
      addAliasBtn.style.display = hasEmpty ? 'none' : '';
    };

    const renderAliasRows = () => {
      const container = overlay.querySelector('#coaMAliasesContainer');
      if (!container) return;
      
      container.innerHTML = '';
      _coaMAliases.forEach((alias, idx) => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '8px';
        row.style.alignItems = 'center';
        
        const input = document.createElement('input');
        input.className = 'coa-modal-inp';
        input.style.flex = '1';
        input.style.height = '38px';
        input.placeholder = 'e.g. Alternate name / Code';
        input.value = alias;
        input.addEventListener('input', (e) => {
          _coaMAliases[idx] = e.target.value;
          updateAddBtnVisibility();
        });
        
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.style.background = 'none';
        delBtn.style.border = 'none';
        delBtn.style.color = 'var(--red-600)';
        delBtn.style.cursor = 'pointer';
        delBtn.style.padding = '8px';
        delBtn.style.display = 'flex';
        delBtn.style.alignItems = 'center';
        delBtn.style.justifyContent = 'center';
        delBtn.innerHTML = `
          <svg viewBox="0 0 15 15" fill="none" style="width: 14px; height: 14px;">
            <path d="M5.5 2h4M1.5 4h12M2.5 4l1 9.5a1 1 0 001 .5h6a1 1 0 001-.5l1-9.5M5.5 6.5v5M9.5 6.5v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
        `;
        delBtn.addEventListener('click', () => {
          _coaMAliases.splice(idx, 1);
          renderAliasRows();
        });
        
        row.appendChild(input);
        row.appendChild(delBtn);
        container.appendChild(row);
      });
      updateAddBtnVisibility();
    };

    if (addAliasBtn) {
      addAliasBtn.addEventListener('click', () => {
        _coaMAliases.push('');
        renderAliasRows();
      });
    }
    renderAliasRows();

    // ── close helpers ──
    const close = () => { _coaMOpen = false; overlay.remove(); };
    overlay.querySelector('#coaModalClose').addEventListener('click', close);
    overlay.querySelector('#coaModalCancel').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

    // ── slider toggle ──
    overlay.querySelector('#coaTogLedger').addEventListener('click', () => {
      _coaMType = 'ledger';
      _coaMName = overlay.querySelector('#coaMLedgerName').value;
      _coaMSgId = overlay.querySelector('#coaMSubGroup').value;
      _coaMBal  = overlay.querySelector('#coaMBalance')?.value || '';
      _renderCoaModal();
    });
    overlay.querySelector('#coaTogGroup').addEventListener('click', () => {
      _coaMType = 'group-ledger';
      _coaMName = overlay.querySelector('#coaMLedgerName').value;
      _coaMSgId = overlay.querySelector('#coaMSubGroup').value;
      _coaMBal  = overlay.querySelector('#coaMBalance')?.value || '';
      _renderCoaModal();
    });

    // ── sub-group change → refresh Group Ledger dropdown ──
    overlay.querySelector('#coaMSubGroup').addEventListener('change', e => {
      _coaMSgId = e.target.value;
      _coaMGlId = '';
      const glSel = overlay.querySelector('#coaMGroupLedger');
      if (glSel) {
        const updatedGls = coaLedgers.filter(l => l.sgId === _coaMSgId && l.type === 'group-ledger');
        glSel.innerHTML = ['<option value="">— None —</option>',
          ...updatedGls.map(gl => `<option value="${gl.id}">${gl.name}</option>`)
        ].join('');
      }
    });

    // ── save ──
    overlay.querySelector('#coaModalSave').addEventListener('click', () => {
      const nameEl = overlay.querySelector('#coaMLedgerName');
      const name   = nameEl.value.trim();
      if (!name) { nameEl.classList.add('error'); nameEl.focus(); return; }
      nameEl.classList.remove('error');

      const sgId = overlay.querySelector('#coaMSubGroup').value;
      const glId = isLedger ? (overlay.querySelector('#coaMGroupLedger')?.value || '') : '';
      const bal  = overlay.querySelector('#coaMBalance')?.value.trim() || '';

      const aliases = _coaMAliases.map(a => a.trim()).filter(a => a !== '');

      if (_coaMEditMode && _coaMEditId) {
        const ldg = coaLedgers.find(l => l.id === _coaMEditId);
        if (ldg) {
          ldg.name = name;
          ldg.sgId = sgId;
          ldg.glId = glId ? Number(glId) : null;
          ldg.openingBalance = bal;
          ldg.type = _coaMType;
          ldg.aliases = aliases;
        }
        showToast(`${_coaMType === 'group-ledger' ? 'Group Ledger' : 'Ledger'} "${name}" updated successfully.`, 'success');
      } else {
        coaLedgers.push({
          id: Date.now() + _coaLedgerCtr++,
          sgId,
          glId: glId ? Number(glId) : null,
          name,
          code: '',
          openingBalance: bal,
          type: _coaMType,
          aliases: aliases
        });

        const sg = COA_SYS_SGS.find(s => s.id === sgId);
        if (sg) {
          _coaExpanded.add(sgId);
          if (sg.parent) _coaExpanded.add(sg.parent);
          _coaExpanded.add(sg.main);
          if (glId) _coaExpanded.add('gl-' + glId);
        }

        showToast(`${isLedger ? 'Ledger' : 'Group Ledger'} "${name}" added successfully.`, 'success');
      }

      close();
      if (typeof window.syncStockGroupsToCoa === 'function') window.syncStockGroupsToCoa();
      renderChartPanel();
      refreshAllReports();
      triggerAutoBackup();
    });

    // ── enter key in name → save ──
    overlay.querySelector('#coaMLedgerName').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); overlay.querySelector('#coaModalSave').click(); }
    });
  }

  function switchCoaTab(tab) {
    _coaActiveTab = tab;
    const btnOverview = document.getElementById('btnCoaOverview');
    const btnLedger = document.getElementById('btnCoaLedger');
    const viewOverview = document.getElementById('coaOverviewContainer');
    const viewLedger = document.getElementById('coaLedgerContainer');

    if (btnOverview && btnLedger && viewOverview && viewLedger) {
      if (tab === 'overview') {
        btnOverview.className = 'btn btn-primary active';
        btnLedger.className = 'btn btn-secondary';
        viewOverview.style.display = '';
        viewLedger.style.display = 'none';
        renderChartPanel();
      } else {
        btnOverview.className = 'btn btn-secondary';
        btnLedger.className = 'btn btn-primary active';
        viewOverview.style.display = 'none';
        viewLedger.style.display = '';
        renderLedgerPanel();
      }
    }
  }

  // ── Main render ───────────────────────────────────────────────────
  function renderChartPanel() {
    if (typeof window.syncStockGroupsToCoa === 'function') {
      window.syncStockGroupsToCoa();
    }
    injectChartStyles();
    const wrap = document.getElementById('chartWrap');
    if (!wrap) return;
    const q = _coaSearch.toLowerCase().trim();

    // Preserve search focus/caret
    const activeEl    = document.activeElement;
    const isSFocused  = activeEl && activeEl.id === 'coaSearch';
    let cS = 0, cE = 0;
    if (isSFocused) { cS = activeEl.selectionStart; cE = activeEl.selectionEnd; }

    let treeHtml = '';
    for (const mg of COA_MAIN_GROUPS) treeHtml += _coaRenderMg(mg, q);

    // Count matching ledgers for the result badge
    const _coaMatchCount = (() => {
      if (!q && !_coaFilterMg && !_coaFilterType && !_coaFilterBal) return null;
      return coaLedgers.filter(l => {
        if (_coaFilterType && l.type !== _coaFilterType) return false;
        if (_coaFilterBal && (l.type !== 'ledger' || !parseFloat(l.openingBalance || 0))) return false;
        if (_coaFilterMg) {
          const sg = COA_SYS_SGS.find(s => s.id === l.sgId);
          if (!sg || sg.main !== _coaFilterMg) return false;
        }
        if (q) {
          const nm = l.name.toLowerCase().includes(q);
          const cd = (l.code || '').toLowerCase().includes(q);
          if (!nm && !cd) return false;
        }
        return true;
      }).length;
    })();
    const hasActiveFilters = _coaFilterMg || _coaFilterType || _coaFilterBal;

    wrap.innerHTML = `
      <!-- ══ MODERN SEARCH HERO ══ -->
      <div class="coa-search-hero">

        <!-- Row 1: Search bar + Add button -->
        <div class="coa-search-top">
          <div class="coa-si-wrap">
            <span class="coa-si-icon">
              <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                <circle cx="7.5" cy="7.5" r="5" stroke="currentColor" stroke-width="1.8"/>
                <path d="M11.5 11.5l3.5 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </span>
            <input
              class="coa-si-inp"
              id="coaSearch"
              type="text"
              placeholder="Search accounts, groups, codes…"
              value="${_coaSearch.replace(/"/g,'&quot;')}"
              autocomplete="off"
              spellcheck="false"
            >
            <button class="coa-si-clear ${_coaSearch ? 'visible' : ''}" id="coaSearchClear" title="Clear search" tabindex="-1">✕</button>
          </div>

          <!-- Live result badge (shown when filtering) -->
          <div class="coa-result-badge ${_coaMatchCount !== null ? 'visible' : ''}" id="coaResultBadge">
            <span class="coa-result-dot"></span>
            ${_coaMatchCount !== null ? `${_coaMatchCount} result${_coaMatchCount !== 1 ? 's' : ''}` : ''}
          </div>
        </div>

        <!-- Row 2: Filter chips + Expand/Collapse + Clear All -->
        <div class="coa-search-bottom">
          <span class="coa-chip-label">Group</span>
          <div class="coa-chip-group" id="coaChipGroupMg">
            <button class="coa-chip ${_coaFilterMg===''?'active':''}" data-mg-chip="">All</button>
            <button class="coa-chip ${_coaFilterMg==='assets'?'active':''}" data-mg-chip="assets"><span class="coa-chip-dot" style="background:#3b82f6"></span>Assets</button>
            <button class="coa-chip ${_coaFilterMg==='equity-liabilities'?'active':''}" data-mg-chip="equity-liabilities"><span class="coa-chip-dot" style="background:#8b5cf6"></span>Equity & Liability</button>
            <button class="coa-chip ${_coaFilterMg==='income'?'active':''}" data-mg-chip="income"><span class="coa-chip-dot" style="background:#10b981"></span>Income</button>
            <button class="coa-chip ${_coaFilterMg==='expense'?'active':''}" data-mg-chip="expense"><span class="coa-chip-dot" style="background:#f59e0b"></span>Expense</button>
          </div>

          <div class="coa-chip-sep"></div>

          <span class="coa-chip-label">Type</span>
          <div class="coa-chip-group" id="coaChipGroupType">
            <button class="coa-chip ${_coaFilterType===''?'active':''}" data-type-chip="">All</button>
            <button class="coa-chip ${_coaFilterType==='ledger'?'active':''}" data-type-chip="ledger">Ledger</button>
            <button class="coa-chip ${_coaFilterType==='group-ledger'?'active':''}" data-type-chip="group-ledger">Group Ledger</button>
          </div>

          <div class="coa-chip-sep"></div>

          <button class="coa-chip ${_coaFilterBal?'active':''}" id="coaChipBal">
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
              <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Has Balance
          </button>

          <div class="coa-chip-sep"></div>

          <button class="coa-util-btn" id="coaExpandAll">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Expand All
          </button>
          <button class="coa-util-btn" id="coaCollapseAll">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/></svg>
            Collapse All
          </button>

          <button class="coa-chip-clear-all ${hasActiveFilters || _coaSearch ? 'visible' : ''}" id="coaClearAll">✕ Clear All</button>
        </div>
      </div>

      <div class="coa-tree">${treeHtml || `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:14px;">
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            <circle cx="26" cy="26" r="25" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="1.5"/>
            <circle cx="22" cy="22" r="9" stroke="#94a3b8" stroke-width="2"/>
            <path d="M29 29l8 8" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <p style="font-size:15px;font-weight:700;color:#475569;margin:0">No accounts found</p>
          <p style="font-size:13px;color:#94a3b8;margin:0;text-align:center">Try a different search term or clear your filters</p>
        </div>
      `}</div>`;

    // ── Wire events ────────────────────────────────────────────────

    // Search input – live filter
    const coaInp = wrap.querySelector('#coaSearch');
    coaInp.addEventListener('input', e => { _coaSearch = e.target.value; renderChartPanel(); });

    // Clear search button
    const coaClearBtn = wrap.querySelector('#coaSearchClear');
    coaClearBtn.addEventListener('click', () => { _coaSearch = ''; renderChartPanel(); });

    // Group filter chips
    wrap.querySelectorAll('[data-mg-chip]').forEach(btn => {
      btn.addEventListener('click', () => {
        _coaFilterMg = btn.dataset.mgChip;
        renderChartPanel();
      });
    });

    // Type filter chips
    wrap.querySelectorAll('[data-type-chip]').forEach(btn => {
      btn.addEventListener('click', () => {
        _coaFilterType = btn.dataset.typeChip;
        renderChartPanel();
      });
    });

    // Has-Balance chip toggle
    const chipBal = wrap.querySelector('#coaChipBal');
    chipBal.addEventListener('click', () => { _coaFilterBal = !_coaFilterBal; renderChartPanel(); });

    // Clear All
    const clearAll = wrap.querySelector('#coaClearAll');
    clearAll.addEventListener('click', () => {
      _coaSearch = '';
      _coaFilterMg = '';
      _coaFilterType = '';
      _coaFilterBal = false;
      renderChartPanel();
    });

    // Expand All
    const expandAll = wrap.querySelector('#coaExpandAll');
    if (expandAll) {
      expandAll.addEventListener('click', () => {
        _coaExpanded = new Set([
          ...COA_MAIN_GROUPS.map(mg => mg.id),
          ...COA_SYS_SGS.map(sg => sg.id),
          ...coaLedgers.filter(l => l.type === 'group-ledger').map(gl => 'gl-' + gl.id)
        ]);
        renderChartPanel();
      });
    }

    // Collapse All
    const collapseAll = wrap.querySelector('#coaCollapseAll');
    if (collapseAll) {
      collapseAll.addEventListener('click', () => {
        _coaExpanded = new Set();
        renderChartPanel();
      });
    }

    // Toggle expand/collapse
    wrap.querySelectorAll('[data-coa-toggle]').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const id = el.dataset.coaToggle;
        if (_coaExpanded.has(id)) _coaExpanded.delete(id);
        else _coaExpanded.add(id);
        renderChartPanel();
      });
    });

    // Quick "+ Add Ledger" buttons in tree → open modal with pre-selected sub-group
    wrap.querySelectorAll('[data-coa-modal-sg]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        showCoaModal(btn.dataset.coaModalSg, btn.dataset.coaModalGl || '');
      });
    });

    // Open Edit modal
    wrap.querySelectorAll('[data-coa-edit]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = Number(btn.dataset.coaEdit);
        showCoaModal('', '', id);
      });
    });

    // Delete ledger / group-ledger
    wrap.querySelectorAll('[data-coa-del]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id  = Number(btn.dataset.coaDel);
        const ldg = coaLedgers.find(l => l.id === id);
        if (!ldg) return;
        const isGl = ldg.type === 'group-ledger';
        showCoaDeleteConfirm(ldg, () => {
          // Delete group ledger AND its children
          if (isGl) {
            coaLedgers = coaLedgers.filter(l => l.glId !== id);
            if (ldg.sgId && ldg.sgId.startsWith('sg-grp-')) {
              const sgIdx = COA_SYS_SGS.findIndex(s => s.id === ldg.sgId);
              if (sgIdx !== -1) COA_SYS_SGS.splice(sgIdx, 1);
            }
          }
          coaLedgers = coaLedgers.filter(l => l.id !== id);
          if (typeof window.syncStockGroupsToCoa === 'function') window.syncStockGroupsToCoa();
          showToast(`${isGl ? 'Group Ledger' : 'Ledger'} "${ldg.name}" deleted.`, 'info');
          renderChartPanel();
          refreshAllReports();
          triggerAutoBackup();
        });
      });
    });

    // Delete custom sub-group
    wrap.querySelectorAll('[data-coa-del-sg]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const sgId = btn.dataset.coaDelSg;
        const sg = COA_SYS_SGS.find(s => s.id === sgId);
        if (!sg) return;
        const confirmDel = confirm(`Are you sure you want to delete group "${sg.name}" and any ledgers inside it?`);
        if (confirmDel) {
          COA_SYS_SGS = COA_SYS_SGS.filter(s => s.id !== sgId && s.parent !== sgId);
          if (typeof saveCoaSubGroups === 'function') saveCoaSubGroups();
          coaLedgers = coaLedgers.filter(l => l.sgId !== sgId);
          showToast(`Group "${sg.name}" deleted.`, 'info');
          renderChartPanel();
          refreshAllReports();
          triggerAutoBackup();
        }
      });
    });

    // Restore search focus/caret
    if (isSFocused) {
      const el = wrap.querySelector('#coaSearch');
      if (el) { el.focus(); try{ el.setSelectionRange(cS, cE); }catch(_){} }
    }

    // Wire COA 3-dot menu and export options
    wireCoaMoreDropdown();
  }

  // ── Helper: Get active company name ───────────────────────────────
  function getActiveCoaCompanyName() {
    const el = document.getElementById('sidebarCompanyName');
    if (el && el.textContent && el.textContent.trim()) return el.textContent.trim();
    try {
      const saved = localStorage.getItem('kya_company_details');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.companyName) return parsed.companyName;
      }
    } catch (e) {}
    return 'KYA Accounting';
  }

  // ── Export Data Builder: Chart of Accounts ────────────────────────
  function getChartOfAccountsExportData() {
    const compName = getActiveCoaCompanyName();
    const mainGroupsData = [];

    (COA_MAIN_GROUPS || []).forEach(mg => {
      const mgItems = [];
      const l1Sgs = (COA_SYS_SGS || []).filter(s => s.main === mg.id && !s.parent);
      
      l1Sgs.forEach(l1 => {
        mgItems.push({
          name: l1.name,
          code: '',
          type: 'Sub Group',
          parentName: mg.name,
          level: 1,
          isGroup: true,
          openingBalance: ''
        });

        const l2Sgs = (COA_SYS_SGS || []).filter(s => s.parent === l1.id);
        if (l2Sgs.length > 0) {
          l2Sgs.forEach(l2 => {
            mgItems.push({
              name: l2.name,
              code: '',
              type: 'Sub Group (L2)',
              parentName: l1.name,
              level: 2,
              isGroup: true,
              openingBalance: ''
            });

            const ledgers = (coaLedgers || []).filter(l => l.sgId === l2.id);
            ledgers.forEach(l => {
              if (l.type === 'group-ledger') {
                mgItems.push({
                  name: l.name,
                  code: l.code || '',
                  type: 'Group Ledger',
                  parentName: l2.name,
                  level: 3,
                  isGroup: true,
                  openingBalance: l.openingBalance || ''
                });
                const ch = (coaLedgers || []).filter(c => c.glId === l.id);
                ch.forEach(c => {
                  mgItems.push({
                    name: c.name,
                    code: c.code || '',
                    type: 'Ledger',
                    parentName: l.name,
                    level: 4,
                    isGroup: false,
                    openingBalance: c.openingBalance || ''
                  });
                });
              } else if (!l.glId) {
                mgItems.push({
                  name: l.name,
                  code: l.code || '',
                  type: 'Ledger',
                  parentName: l2.name,
                  level: 3,
                  isGroup: false,
                  openingBalance: l.openingBalance || ''
                });
              }
            });
          });
        } else {
          const ledgers = (coaLedgers || []).filter(l => l.sgId === l1.id);
          ledgers.forEach(l => {
            if (l.type === 'group-ledger') {
              mgItems.push({
                name: l.name,
                code: l.code || '',
                type: 'Group Ledger',
                parentName: l1.name,
                level: 2,
                isGroup: true,
                openingBalance: l.openingBalance || ''
              });
              const ch = (coaLedgers || []).filter(c => c.glId === l.id);
              ch.forEach(c => {
                mgItems.push({
                  name: c.name,
                  code: c.code || '',
                  type: 'Ledger',
                  parentName: l.name,
                  level: 3,
                  isGroup: false,
                  openingBalance: c.openingBalance || ''
                });
              });
            } else if (!l.glId) {
              mgItems.push({
                name: l.name,
                code: l.code || '',
                type: 'Ledger',
                parentName: l1.name,
                level: 2,
                isGroup: false,
                openingBalance: l.openingBalance || ''
              });
            }
          });
        }
      });

      mainGroupsData.push({
        name: mg.name,
        items: mgItems
      });
    });

    return {
      companyName: compName,
      mainGroups: mainGroupsData
    };
  }

  // ── Export Data Builder: Ledgers List ──────────────────────────────
  function getLedgersExportData() {
    const compName = getActiveCoaCompanyName();
    const onlyLedgers = (coaLedgers || []).filter(l => l.type !== 'group-ledger');
    const sorted = [...onlyLedgers].sort((a, b) => a.name.localeCompare(b.name));

    const items = sorted.map((l, idx) => {
      const sg = (COA_SYS_SGS || []).find(s => s.id === l.sgId);
      let mgName = '—';
      let sgName = sg ? sg.name : (l.sgId || '—');
      if (sg && sg.main) {
        const mg = (COA_MAIN_GROUPS || []).find(m => m.id === sg.main);
        if (mg) mgName = mg.name;
      }
      return {
        slNo: idx + 1,
        name: l.name,
        code: l.code || '',
        sgName: sgName,
        mgName: mgName,
        openingBalance: Number(l.openingBalance) || 0
      };
    });

    return {
      companyName: compName,
      items: items
    };
  }

  // ── Export Data Builder: Customers List ────────────────────────────
  function getCustomersExportData() {
    const compName = getActiveCoaCompanyName();
    const customers = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
    const sorted = [...customers].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    const items = sorted.map((c, idx) => {
      return {
        slNo: idx + 1,
        name: c.name || '',
        code: c.code || '',
        aliases: c.aliases || [],
        phone: c.phone || c.mobile || '',
        email: c.email || '',
        gstin: c.gstin || '',
        state: c.state || '',
        openingBalance: Number(c.openingBalance) || 0
      };
    });

    return {
      companyName: compName,
      items: items
    };
  }

  // ── Export Data Builder: Suppliers List ────────────────────────────
  function getSuppliersExportData() {
    const compName = getActiveCoaCompanyName();
    const suppliers = typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : [];
    const sorted = [...suppliers].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    const items = sorted.map((s, idx) => {
      return {
        slNo: idx + 1,
        name: s.name || '',
        code: s.code || '',
        aliases: s.aliases || [],
        phone: s.phone || s.mobile || '',
        email: s.email || '',
        gstin: s.gstin || '',
        state: s.state || '',
        openingBalance: Number(s.openingBalance) || 0
      };
    });

    return {
      companyName: compName,
      items: items
    };
  }

  // Expose helpers globally
  window.getChartOfAccountsExportData = getChartOfAccountsExportData;
  window.getLedgersExportData = getLedgersExportData;
  window.getCustomersExportData = getCustomersExportData;
  window.getSuppliersExportData = getSuppliersExportData;

  // ── Wire COA Dropdown ──────────────────────────────────────────────
  let _coaMoreWired = false;
  function wireCoaMoreDropdown() {
    if (_coaMoreWired) return;
    _coaMoreWired = true;

    const moreBtn = document.getElementById('coaMoreBtn');
    const moreDropdown = document.getElementById('coaMoreDropdown');
    const submenuBtn = document.getElementById('coaExportMenuBtn');
    const submenu = document.getElementById('coaExportSubmenu');
    const pdfBtn = document.getElementById('coaExportPdf');
    const excelBtn = document.getElementById('coaExportExcel');
    const expandAllBtn = document.getElementById('coaMoreExpandAll');
    const collapseAllBtn = document.getElementById('coaMoreCollapseAll');

    if (moreBtn && moreDropdown) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = moreDropdown.classList.contains('active');
        closeAllCoaMenus();
        if (!isOpen) {
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
      const submenuWrap = document.getElementById('coaExportSubmenuWrap');
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

    function closeAllCoaMenus() {
      if (moreDropdown) moreDropdown.classList.remove('active');
      if (submenu) submenu.classList.remove('active');
    }

    if (pdfBtn) {
      pdfBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        closeAllCoaMenus();
        if (typeof window.exportChartOfAccountsToPDF === 'function') {
          await window.exportChartOfAccountsToPDF(getChartOfAccountsExportData());
        }
      });
    }

    if (excelBtn) {
      excelBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        closeAllCoaMenus();
        if (typeof window.exportChartOfAccountsToExcel === 'function') {
          await window.exportChartOfAccountsToExcel(getChartOfAccountsExportData());
        }
      });
    }

    if (expandAllBtn) {
      expandAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCoaMenus();
        const btn = document.getElementById('coaExpandAll');
        if (btn) btn.click();
      });
    }

    if (collapseAllBtn) {
      collapseAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllCoaMenus();
        const btn = document.getElementById('coaCollapseAll');
        if (btn) btn.click();
      });
    }

    document.addEventListener('click', (e) => {
      if (moreDropdown && !moreDropdown.contains(e.target) && (!moreBtn || !moreBtn.contains(e.target))) {
        closeAllCoaMenus();
      }
    });
  }


  // ══════════════════════════════════════════════════════════════════
  //  BALANCE SHEET
  // ══════════════════════════════════════════════════════════════════
  let _bsStyleDone = false;
  let _bsExpanded = new Set();
  let _bsLayoutMode = 'Vertical';

