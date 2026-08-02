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
  let coaLedgers = [];

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

      // Inventories (sg-inv)
      { name: 'Raw Materials', sgId: 'sg-inv' },
      { name: 'Work-in-Progress', sgId: 'sg-inv' },
      { name: 'Finished Goods', sgId: 'sg-inv' },
      { name: 'Stock-in-Trade', sgId: 'sg-inv' },
      { name: 'Stores & Spares', sgId: 'sg-inv' },

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

    if (q && !_coaFilterType && !_coaFilterBal) {
      if (sg.name.toLowerCase().includes(q)) return true;
    }

    const sgLedgers = coaLedgers.filter(l => l.sgId === sgId);
    return sgLedgers.some(l => {
      if (l.type === 'ledger') {
        return _coaLdgMatchesFilters(l, q);
      } else {
        if (_coaGlMatchesFilters(l, q)) return true;
        const children = coaLedgers.filter(ch => ch.glId === l.id);
        return children.some(ch => _coaLdgMatchesFilters(ch, q));
      }
    });
  }

  function _coaMatchesMg(mgId, q) {
    if (_coaFilterMg && mgId !== _coaFilterMg) return false;

    if (q && !_coaFilterType && !_coaFilterBal) {
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

  // ── Render ledgers + group-ledgers for a sub-group ───────────────
  function _coaRenderContent(sgId, q, baseIndent, glIndent) {
    const bi = baseIndent || '';
    const gi = glIndent  || '';
    let html = '';

    // 1. Group Ledgers in this sub-group
    const groupLdgs = coaLedgers.filter(l => l.sgId === sgId && l.type === 'group-ledger');
    for (const gl of groupLdgs) {
      const children = coaLedgers.filter(ch => ch.glId === gl.id);
      const matchingChildren = children.filter(ch => _coaLdgMatchesFilters(ch, q));
      const glMatches = _coaGlMatchesFilters(gl, q);

      // Bypassing folders if only showing ledgers or only showing opening balance filters
      if (_coaFilterType === 'ledger' || _coaFilterBal) {
        for (const ch of matchingChildren) {
          html += _coaLdgRow(ch, bi, q);
        }
        continue;
      }

      if (!glMatches && !matchingChildren.length) continue;

      const isOpen = _coaExpanded.has('gl-'+gl.id) || !!q || _coaFilterMg || _coaFilterType || _coaFilterBal;
      let childHtml = '';
      for (const ch of matchingChildren) {
        childHtml += _coaLdgRow(ch, gi, q);
      }

      html += `
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
                <span class="coa-gl-tag">Group Ledger</span>
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
          <span class="coa-sys-tag">System</span>
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
    } else {
      bodyHtml = _coaRenderContent(sg.id, q, 'l1-indent', 'gl1-indent');
    }
    return `
      <div class="coa-sg1" data-sg1="${sg.id}">
        <div class="coa-sg1-hdr" data-coa-toggle="${sg.id}">
          <svg class="coa-caret${isOpen?' open':''}" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="coa-sg1-name">${_coaHl(sg.name, q)}</span>
          <span class="coa-sys-tag">System</span>
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
    const gls = coaLedgers.filter(l => l.sgId === sgId && l.type === 'group-ledger');
    if (!gls.length) return '<option value="">— None —</option>';
    return '<option value="">— None —</option>' + gls.map(gl =>
      `<option value="${gl.id}" ${gl.id == selectedGlId ? 'selected':''}>${gl.name}</option>`
    ).join('');
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
          if (isGl) coaLedgers = coaLedgers.filter(l => l.glId !== id);
          coaLedgers = coaLedgers.filter(l => l.id !== id);
          showToast(`${isGl ? 'Group Ledger' : 'Ledger'} "${ldg.name}" deleted.`, 'info');
          renderChartPanel();
          refreshAllReports();
          triggerAutoBackup();
        });
      });
    });

    // Restore search focus/caret
    if (isSFocused) {
      const el = wrap.querySelector('#coaSearch');
      if (el) { el.focus(); try{ el.setSelectionRange(cS, cE); }catch(_){} }
    }
  }


  // ══════════════════════════════════════════════════════════════════
  //  BALANCE SHEET
  // ══════════════════════════════════════════════════════════════════
  let _bsStyleDone = false;
  let _bsExpanded = new Set();
  let _bsLayoutMode = 'Vertical';

