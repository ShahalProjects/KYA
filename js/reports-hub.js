/**
 * KYA Modular - Reports Module
 * Overview, Statutory Reports (GST / TDS / TCS) and General Reports
 */

(function() {
  'use strict';

  let _activeReportsTab = 'overview';   // overview | gst | tds | tcs
  let _gstCycle = 'monthly';            // monthly | quarterly
  let _gstFyStart = null;               // start year of the selected financial year (Apr–Mar)
  let _gstPeriodIdx = null;             // index into the year's months / quarters
  let _gstView = 'dashboard';           // dashboard | gstr1 (GSTR-1 section tiles)

  // GSTR-1 sections, in GST portal order
  const GSTR1_SECTIONS = [
    '4A, 4B, 6B, 6C - B2B, SEZ, DE Invoices',
    '5 - B2C (Large) Invoices',
    '6A - Exports Invoices',
    '7 - B2C (Others)',
    '8A, 8B, 8C, 8D - Nil Rated Supplies',
    '9B - Credit / Debit Notes (Registered)',
    '9B - Credit / Debit Notes (Unregistered)',
    '11A(1), 11A(2) - Tax Liability (Advances Received)',
    '11B(1), 11B(2) - Adjustment of Advances',
    '12 - HSN-wise summary of outward supplies',
    '13 - Documents Issued',
    '14 - Supplies made through ECO',
    '15 - Supplies U/s 9(5)',
  ];

  // Sections that open full screen (sidebar hidden) with a Back button to return to Overview
  const FULL_SCREEN_TABS = ['gst'];

  const SECTION_LABEL_STYLE = 'font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--slate-400); padding: 14px 12px 6px 12px; margin-top: 6px; border-top: 1px solid var(--slate-100);';

  const DOC_ICON = `
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path d="M5 2.5h7l3.5 3.5v11.5H5V2.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M8 10h5M8 13h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`;

  const TAB_TITLES = {
    overview: 'Overview',
    gst: 'GST',
    tds: 'TDS',
    tcs: 'TCS',
  };

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function injectReportsHubStyles() {
    if (document.getElementById('reports-hub-styles')) return;
    const style = document.createElement('style');
    style.id = 'reports-hub-styles';
    style.textContent = `
      /* Back bar filters: Cycle / Year / Period */
      .rpt-filters {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .rpt-filter-select-wrap {
        position: relative;
        display: inline-flex;
        align-items: center;
      }
      .rpt-filter-select-wrap svg {
        position: absolute;
        right: 10px;
        width: 12px;
        height: 12px;
        color: var(--slate-500);
        pointer-events: none;
      }
      .rpt-filter-select {
        appearance: none;
        -webkit-appearance: none;
        height: 34px;
        padding: 0 30px 0 12px;
        font-size: 12.5px;
        font-weight: 600;
        font-family: inherit;
        color: var(--slate-700);
        background: var(--white);
        border: 1px solid var(--slate-200);
        border-radius: 6px;
        cursor: pointer;
      }
      .rpt-filter-select:hover { background: var(--slate-50); border-color: var(--slate-300); }
      .rpt-filter-select:focus { outline: none; border-color: var(--blue-400); box-shadow: 0 0 0 3px rgba(96,165,250,.15); }

      /* Return cards */
      .gst-return-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
        margin-bottom: 16px;
      }
      .gst-return-card {
        background: var(--white);
        border: 1px solid var(--slate-200);
        border-radius: 14px;
        overflow: hidden;
        /* Title / figures / button rows share heights across the three cards */
        display: grid;
        grid-row: span 3;
        grid-template-rows: subgrid;
        row-gap: 0;
        box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        transition: box-shadow .18s ease, transform .18s ease;
      }
      .gst-return-card:hover { box-shadow: 0 6px 18px rgba(15,23,42,.08); transform: translateY(-2px); }
      .gst-return-card-head {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 18px;
        border-bottom: 1px solid var(--slate-100);
      }
      .gst-return-card.tone-blue    .gst-return-card-head { background: var(--blue-50); }
      .gst-return-card.tone-violet  .gst-return-card-head { background: #f5f3ff; }
      .gst-return-card.tone-emerald .gst-return-card-head { background: var(--emerald-50); }
      .gst-icon-circle {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .gst-icon-circle svg { width: 20px; height: 20px; }
      .tone-blue    .gst-icon-circle, .gst-icon-circle.tone-blue    { background: var(--blue-100);    color: var(--blue-600); }
      .tone-violet  .gst-icon-circle, .gst-icon-circle.tone-violet  { background: #ede9fe;            color: #7c3aed; }
      .tone-emerald .gst-icon-circle, .gst-icon-circle.tone-emerald { background: var(--emerald-100); color: var(--emerald-600); }
      .gst-icon-circle.tone-amber { background: #fef3c7; color: #d97706; }
      .gst-return-name {
        font-size: 16px;
        font-weight: 800;
        color: var(--slate-800);
        letter-spacing: -.2px;
      }
      .gst-return-desc {
        font-size: 12px;
        color: var(--slate-500);
        margin-top: 2px;
      }
      .gst-return-card-head .badge { margin-left: auto; flex-shrink: 0; }
      .badge-slate { background: var(--slate-100); color: var(--slate-500); }
      .gst-metric-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        padding: 4px 18px;
      }
      .gst-metric {
        padding: 14px 0;
        min-width: 0;
      }
      .gst-metric:nth-child(odd)  { padding-right: 14px; border-right: 1px solid var(--slate-100); }
      .gst-metric:nth-child(even) { padding-left: 18px; }
      .gst-metric:nth-child(-n+2) { border-bottom: 1px solid var(--slate-100); }
      .gst-metric-label {
        font-size: 12px;
        color: var(--slate-500);
        margin-bottom: 6px;
      }
      .gst-metric-value {
        font-size: 20px;
        font-weight: 800;
        color: var(--slate-800);
        letter-spacing: -.4px;
        overflow-wrap: anywhere;
      }
      .gst-metric-value.sm {
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0;
      }
      .gst-return-card-foot {
        display: flex;
        align-items: flex-end;
        justify-content: flex-end;
        padding: 6px 18px 16px;
      }
      .gst-outline-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 34px;
        padding: 0 14px;
        font-size: 12.5px;
        font-weight: 600;
        font-family: inherit;
        color: var(--blue-700);
        background: var(--white);
        border: 1.5px solid var(--blue-200);
        border-radius: 8px;
        cursor: pointer;
        transition: all .15s ease;
      }
      .gst-outline-btn:hover { background: var(--blue-50); border-color: var(--blue-400); }
      .gst-outline-btn svg { width: 13px; height: 13px; }

      /* Summary tiles */
      .gst-summary-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
        margin-bottom: 16px;
      }
      .gst-summary-tile {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 18px;
        background: var(--slate-50);
        border: 1px solid var(--slate-200);
        border-radius: 14px;
        min-width: 0;
      }
      .gst-summary-label {
        font-size: 12px;
        color: var(--slate-500);
        margin-bottom: 4px;
      }
      .gst-summary-value {
        font-size: 19px;
        font-weight: 800;
        color: var(--slate-800);
        letter-spacing: -.4px;
        overflow-wrap: anywhere;
      }

      /* Recent activity */
      .gst-activity-card {
        background: var(--white);
        border: 1px solid var(--slate-200);
        border-radius: 14px;
        padding: 18px 18px 8px;
      }
      .gst-activity-title {
        font-size: 15px;
        font-weight: 800;
        color: var(--slate-800);
        margin-bottom: 12px;
      }
      .gst-activity-scroll { overflow-x: auto; }
      .gst-activity-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
        min-width: 560px;
      }
      .gst-activity-table th {
        text-align: left;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .05em;
        color: var(--slate-500);
        background: var(--slate-50);
        padding: 10px 14px;
        border-bottom: 1px solid var(--slate-200);
      }
      .gst-activity-table td {
        padding: 12px 14px;
        color: var(--slate-600);
        border-bottom: 1px solid var(--slate-100);
      }
      .gst-activity-table tr:last-child td { border-bottom: none; }
      .gst-activity-table td.gst-ret { font-weight: 700; color: var(--slate-800); }

      /* GSTR-1 section tiles */
      .gstr1-sec-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
      }
      .gstr1-sec-tile {
        /* Title / count rows share heights across each row of tiles */
        display: grid;
        grid-row: span 2;
        grid-template-rows: subgrid;
        row-gap: 0;
        border: 1px solid var(--slate-200);
        border-radius: 12px;
        overflow: hidden;
        background: var(--white);
        box-shadow: 0 1px 2px rgba(0,0,0,0.04);
      }
      .gstr1-sec-head {
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 12px 14px;
        font-size: 13px;
        font-weight: 700;
        line-height: 1.35;
        color: var(--white);
        background: linear-gradient(90deg, var(--blue-700), var(--blue-500));
      }
      .gstr1-sec-body {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 22px 14px;
        background: var(--slate-50);
        font-size: 15px;
        font-weight: 800;
        color: var(--emerald-700);
      }
      .gstr1-sec-body svg { width: 18px; height: 18px; color: var(--emerald-600); }

      /* GSTR-3B section tables */
      .gstr3b-sec-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        grid-auto-rows: 1fr; /* every row as tall as the tallest, so all boxes match */
        gap: 16px;
      }
      .gstr3b-sec-tile {
        display: flex;
        flex-direction: column;
        border: 1px solid var(--slate-200);
        border-radius: 12px;
        overflow: hidden;
        background: var(--white);
        box-shadow: 0 1px 2px rgba(0,0,0,0.04);
      }
      .gstr3b-sec-head {
        display: flex;
        align-items: center;
        padding: 14px 16px;
        /* Room for two lines, so every title bar is the same height */
        min-height: calc(2 * 1.35em + 28px);
        box-sizing: border-box;
        font-size: 13.5px;
        font-weight: 700;
        line-height: 1.35;
        color: var(--white);
        background: linear-gradient(90deg, var(--blue-700), var(--blue-500));
      }
      .gstr3b-sec-body {
        flex: 1;
        display: grid;
        grid-template-columns: 1fr 1fr;
        align-content: start;
        gap: 14px 16px;
        padding: 16px;
      }
      .gstr3b-field { min-width: 0; }
      .gstr3b-field-label {
        font-size: 12px;
        color: var(--slate-500);
        margin-bottom: 4px;
      }
      .gstr3b-field-value {
        font-size: 14px;
        font-weight: 700;
        color: var(--slate-800);
        overflow-wrap: anywhere;
      }

      /* Columns follow the dashboard's own width (the app sidebar narrows it) */
      .gst-dash { container-type: inline-size; }
      @container (max-width: 959px) {
        .gst-return-card-head { display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 10px; row-gap: 6px; align-items: start; padding: 14px 12px; }
        .gst-return-card-head .gst-icon-circle { width: 36px; height: 36px; grid-row: span 2; }
        .gst-return-card-head .gst-icon-circle svg { width: 17px; height: 17px; }
        .gst-return-card-head .badge { grid-column: 2; justify-self: start; margin-left: 0; }
        .gst-metric-grid { padding: 4px 12px; }
        .gst-metric:nth-child(odd)  { padding-right: 10px; }
        .gst-metric:nth-child(even) { padding-left: 10px; }
        .gstr1-sec-grid { gap: 12px; }
        .gstr1-sec-head { padding: 10px; font-size: 12px; }
        .gstr3b-sec-grid { gap: 12px; }
        .gstr3b-sec-head { padding: 12px; font-size: 12.5px; min-height: calc(2 * 1.35em + 24px); }
        .gstr3b-sec-body { gap: 12px 10px; padding: 12px; }
        .gstr3b-field-value { font-size: 13px; }
        .gst-summary-tile { gap: 10px; padding: 14px 12px; }
        .gst-summary-tile .gst-icon-circle { width: 36px; height: 36px; }
        .gst-summary-tile .gst-icon-circle svg { width: 17px; height: 17px; }
      }
      /* Phone width only: stack the figures */
      @container (max-width: 420px) {
        .gst-metric-grid { grid-template-columns: 1fr; }
        .gst-metric:nth-child(n) { padding: 12px 0; border-right: none; border-bottom: 1px solid var(--slate-100); }
        .gst-metric:last-child { border-bottom: none; }
      }
      .gst-metric-value:not(.sm), .gst-summary-value { font-size: clamp(12px, 1.55cqi, 20px); }
    `;
    document.head.appendChild(style);
  }

  // ── GST data (from posted Sales and Purchase vouchers) ────────────────

  // Voucher dates are 'YYYY-MM-DD'; read them as local dates so month edges don't shift with time zone
  function parseVoucherDate(dateStr) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr || ''));
    const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(dateStr);
    return isNaN(d) ? null : d;
  }

  function fyStartOfDate(d) {
    return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  }

  function fyShortLabel(start) {
    return `FY ${start}-${String(start + 1).slice(-2)}`;
  }

  // Periods of a financial year (Apr–Mar): 12 months or 4 quarters.
  // Each period: { label, from (inclusive), to (exclusive) }
  function getPeriods(cycle, fyStart) {
    if (cycle === 'quarterly') {
      return [0, 1, 2, 3].map(q => {
        const from = new Date(fyStart, 3 + q * 3, 1);
        const last = new Date(fyStart, 5 + q * 3, 1);
        return {
          label: `Q${q + 1} (${MONTHS[from.getMonth()]}–${MONTHS[last.getMonth()]} ${last.getFullYear()})`,
          from,
          to: new Date(fyStart, 6 + q * 3, 1),
        };
      });
    }
    return Array.from({ length: 12 }, (_, i) => {
      const from = new Date(fyStart, 3 + i, 1);
      return {
        label: `${MONTHS[from.getMonth()]} ${from.getFullYear()}`,
        from,
        to: new Date(fyStart, 4 + i, 1),
      };
    });
  }

  // Index of the period containing today (when the year is the current one), else the first period
  function defaultPeriodIndex(cycle, fyStart) {
    const today = new Date();
    const idx = getPeriods(cycle, fyStart).findIndex(p => today >= p.from && today < p.to);
    return idx >= 0 ? idx : 0;
  }

  function inPeriod(dateStr, period) {
    const d = parseVoucherDate(dateStr);
    return !!d && d >= period.from && d < period.to;
  }

  function rowTaxableAndGst(r, isProduct) {
    const base = isProduct
      ? ((parseFloat(r.qty) || 0) * (parseFloat(r.rate) || 0))
      : (parseFloat(r.baseAmount) || 0);
    const discAmt = r.discountType === 'pct' ? (base * ((parseFloat(r.discount) || 0) / 100)) : (parseFloat(r.discount) || 0);
    const taxable = Math.max(0, base - discAmt);
    return { taxable, gst: taxable * ((parseFloat(r.tax) || 0) / 100) };
  }

  function purchaseRowTaxableAndGst(r) {
    const base = (parseFloat(r.qty) || 1) * (parseFloat(r.rate) || 0);
    const discAmt = r.discountType === 'pct' ? (base * ((parseFloat(r.discount) || 0) / 100)) : (parseFloat(r.discount) || 0);
    const taxable = Math.max(0, base - discAmt);
    return { taxable, gst: taxable * ((parseFloat(r.tax) || 0) / 100) };
  }

  function getSalesVouchers() {
    return (window.KYA_STORE && Array.isArray(window.KYA_STORE.salesVouchers)) ? window.KYA_STORE.salesVouchers : [];
  }

  function getPurchaseVouchers() {
    return (window.KYA_STORE && Array.isArray(window.KYA_STORE.purchaseVouchers)) ? window.KYA_STORE.purchaseVouchers : [];
  }

  function getAvailableFyStarts() {
    const starts = new Set([fyStartOfDate(new Date())]);
    getSalesVouchers().concat(getPurchaseVouchers()).forEach(v => {
      const d = parseVoucherDate(v.date);
      if (d) starts.add(fyStartOfDate(d));
    });
    return Array.from(starts).sort((a, b) => b - a);
  }

  function latestDate(vouchers) {
    let latest = null;
    vouchers.forEach(v => {
      const d = parseVoucherDate(v.date);
      if (d && (!latest || d > latest)) latest = d;
    });
    return latest;
  }

  // Split GST into IGST / CGST / SGST by supply type — same rules the sales voucher posting uses
  const DEFAULT_SUPPLY_TYPE = 'Intra-State (CGST + SGST)';

  function isIntraStateSupply(supplyType) {
    const t = supplyType || DEFAULT_SUPPLY_TYPE;
    return t === DEFAULT_SUPPLY_TYPE || t === 'Deemed Export';
  }

  function gstSplit(gst, supplyType) {
    const t = supplyType || DEFAULT_SUPPLY_TYPE;
    if (isIntraStateSupply(t)) return { igst: 0, cgst: gst / 2, sgst: gst / 2 };
    if (t === 'Inter-State (IGST)' || t === 'SEZ With Tax') return { igst: gst, cgst: 0, sgst: 0 };
    return { igst: 0, cgst: 0, sgst: 0 }; // Export (Zero-Rated / LUT), SEZ Without Tax
  }

  function customerHasGstin(inv) {
    const party = (typeof findPartyById === 'function' ? findPartyById(inv.customerId, 'Customer') : null)
      || ((typeof coaLedgers !== 'undefined' ? coaLedgers : []).find(l => String(l.id) === String(inv.customerId)))
      || {};
    return !!String(party.gstin || '').trim();
  }

  // GSTR-3B figures for the period (sales net of returns; purchases as ITC)
  function computeGstr3b(sales, purchases) {
    const out = { outwardTaxable: 0, igst: 0, cgst: 0, sgst: 0, unregInterTaxable: 0, unregInterIgst: 0 };
    sales.forEach(inv => {
      const sign = inv.isReturn ? -1 : 1;
      const isProduct = inv.type === 'Product';
      // 3.2: inter-state supplies to unregistered persons (exports / SEZ are not part of it)
      const unregistered = inv.salesSupplyType === 'Inter-State (IGST)' && !customerHasGstin(inv);
      (inv.rows || []).forEach(r => {
        const { taxable, gst } = rowTaxableAndGst(r, isProduct);
        const split = gstSplit(gst, inv.salesSupplyType);
        out.outwardTaxable += sign * taxable;
        out.igst += sign * split.igst;
        out.cgst += sign * split.cgst;
        out.sgst += sign * split.sgst;
        if (unregistered) {
          out.unregInterTaxable += sign * taxable;
          out.unregInterIgst += sign * split.igst;
        }
      });
    });

    const itc = { igst: 0, cgst: 0, sgst: 0 };
    const exemptInward = { inter: 0, intra: 0 };
    purchases.forEach(pv => {
      (pv.rows || []).forEach(r => {
        const { taxable, gst } = purchaseRowTaxableAndGst(r);
        const split = gstSplit(gst, pv.supplyType);
        itc.igst += split.igst;
        itc.cgst += split.cgst;
        itc.sgst += split.sgst;
        if (!(parseFloat(r.tax) > 0)) {
          if (isIntraStateSupply(pv.supplyType)) exemptInward.intra += taxable;
          else exemptInward.inter += taxable;
        }
      });
    });

    return {
      outward: out,
      outputTax: out.igst + out.cgst + out.sgst,
      itc,
      itcTotal: itc.igst + itc.cgst + itc.sgst,
      exemptInward,
    };
  }

  function computeGstSummary(period) {
    const sales = getSalesVouchers().filter(v => inPeriod(v.date, period));
    const purchases = getPurchaseVouchers().filter(v => inPeriod(v.date, period));
    const g3b = computeGstr3b(sales, purchases);
    const outwardTaxable = g3b.outward.outwardTaxable;
    const outputTax = g3b.outputTax;
    const itc = g3b.itcTotal;

    return {
      salesCount: sales.length,
      purchaseCount: purchases.length,
      outwardTaxable,
      outputTax,
      itc,
      netLiability: outputTax - itc,
      lastSales: latestDate(sales),
      lastPurchase: latestDate(purchases),
      lastAny: latestDate(sales.concat(purchases)),
      g3b,
    };
  }

  function fmtInr(n) {
    const val = Math.round(Number(n) || 0);
    const sign = val < 0 ? '-' : '';
    return `${sign}₹ ${Math.abs(val).toLocaleString('en-IN')}`;
  }

  // Exact amounts with paise, as on the GST return tables
  function fmtInrExact(n) {
    const val = Math.round((Number(n) || 0) * 100) / 100;
    const sign = val < 0 ? '-' : '';
    return `${sign}₹${Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function fmtCount(n) {
    return (Number(n) || 0).toLocaleString('en-IN');
  }

  function fmtDate(d) {
    if (!d) return '—';
    return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  function statusBadge(hasData) {
    return hasData
      ? `<span class="badge badge-green"><span class="badge-dot"></span>Ready</span>`
      : `<span class="badge badge-slate"><span class="badge-dot"></span>No Data</span>`;
  }

  // ── GST view ──────────────────────────────────────────────────────────

  const ARROW_ICON = `<svg viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const GST_ICONS = {
    gstr1: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="14 3 14 9 20 9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>`,
    gstr2b: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5"/><polyline points="14 3 14 9 20 9"/><circle cx="16.5" cy="16.5" r="3"/><line x1="18.7" y1="18.7" x2="21" y2="21"/></svg>`,
    gstr3b: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="14 3 14 9 20 9"/><polyline points="9 15 11 17 15 13"/></svg>`,
    sales: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    rupee: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h12M6 9h12M14 20L7 13h3a4 4 0 0 0 0-9"/></svg>`,
    scale: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="3" x2="12" y2="21"/><line x1="7" y1="21" x2="17" y2="21"/><path d="M5 7h14"/><path d="M5 7l-3 7a3 3 0 0 0 6 0z"/><path d="M19 7l-3 7a3 3 0 0 0 6 0z"/></svg>`,
  };

  function renderReturnCard(opts) {
    return `
      <div class="gst-return-card tone-${opts.tone}">
        <div class="gst-return-card-head">
          <div class="gst-icon-circle">${opts.icon}</div>
          <div style="min-width: 0;">
            <div class="gst-return-name">${opts.name}</div>
            <div class="gst-return-desc">${opts.desc}</div>
          </div>
          ${statusBadge(opts.hasData)}
        </div>
        <div class="gst-metric-grid">
          ${opts.metrics.map(m => `
            <div class="gst-metric">
              <div class="gst-metric-label">${m.label}</div>
              <div class="gst-metric-value ${m.small ? 'sm' : ''}" title="${m.value}">${m.value}</div>
            </div>
          `).join('')}
        </div>
        <div class="gst-return-card-foot">
          <button class="gst-outline-btn gst-view-btn" type="button" data-return="${opts.name}" data-details="${opts.detailsView || ''}">View Details ${ARROW_ICON}</button>
        </div>
      </div>
    `;
  }

  function renderSummaryTile(tone, icon, label, value) {
    return `
      <div class="gst-summary-tile">
        <div class="gst-icon-circle tone-${tone}">${icon}</div>
        <div style="min-width: 0;">
          <div class="gst-summary-label">${label}</div>
          <div class="gst-summary-value" title="${value}">${value}</div>
        </div>
      </div>
    `;
  }

  // Resolve the Cycle / Year / Period selection, filling in defaults
  function getGstSelection() {
    const fyStarts = getAvailableFyStarts();
    if (_gstFyStart === null || !fyStarts.includes(_gstFyStart)) {
      _gstFyStart = fyStarts[0];
      _gstPeriodIdx = null;
    }
    const periods = getPeriods(_gstCycle, _gstFyStart);
    if (_gstPeriodIdx === null || _gstPeriodIdx >= periods.length) {
      _gstPeriodIdx = defaultPeriodIndex(_gstCycle, _gstFyStart);
    }
    return { fyStarts, periods, period: periods[_gstPeriodIdx] };
  }

  const CARET_ICON = `<svg viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5 9 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  function renderFilterSelect(id, label, options) {
    return `
      <span class="rpt-filter-select-wrap">
        <select class="rpt-filter-select" id="${id}" aria-label="${label}">
          ${options.map(o => `<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>
        ${CARET_ICON}
      </span>
    `;
  }

  function renderGstFilters() {
    const { fyStarts, periods } = getGstSelection();
    return `
      <div class="rpt-filters">
        ${renderFilterSelect('gstYearSelect', 'Year', fyStarts.map(y => ({ value: y, label: fyShortLabel(y), selected: y === _gstFyStart })))}
        ${renderFilterSelect('gstPeriodSelect', 'Period', periods.map((p, i) => ({ value: i, label: p.label, selected: i === _gstPeriodIdx })))}
      </div>
    `;
  }

  // Monthly / Quarterly slider in the Reports title card (same look as Master Desk's Create / Alter)
  function renderGstCycleSlider() {
    const pill = (value, label) => {
      const isActive = _gstCycle === value;
      return `
        <button type="button" class="rpt-cycle-pill-btn ${isActive ? 'active' : ''}" data-cycle="${value}" role="tab" aria-selected="${isActive}" style="height: 28px; padding: 0 12px; font-size: 12.5px; border-radius: 6px; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease; font-family: inherit; font-weight: ${isActive ? '700' : '600'}; background: ${isActive ? '#ffffff' : 'transparent'}; color: ${isActive ? '#1e3a8a' : 'rgba(255,255,255,0.85)'}; box-shadow: ${isActive ? '0 1px 3px rgba(0,0,0,0.2)' : 'none'};">
          ${label}
        </button>
      `;
    };
    return `
      <div class="rpt-cycle-pill-wrap" role="tablist" aria-label="Return cycle" style="display: inline-flex; align-items: center; background: rgba(0, 0, 0, 0.22); padding: 3px; border-radius: 8px; border: 1.5px solid rgba(255, 255, 255, 0.35); gap: 3px;">
        ${pill('monthly', 'Monthly')}
        ${pill('quarterly', 'Quarterly')}
      </div>
    `;
  }

  function renderGstView() {
    const { period: selected } = getGstSelection();
    const s = computeGstSummary(selected);
    const period = selected.label;

    const activityRows = [
      { name: 'GSTR-1', hasData: s.salesCount > 0, last: s.lastSales },
      { name: 'GSTR-2B', hasData: s.purchaseCount > 0, last: s.lastPurchase },
      { name: 'GSTR-3B', hasData: (s.salesCount + s.purchaseCount) > 0, last: s.lastAny },
    ];

    return `
      <div class="gst-dash">
      <div class="gst-return-grid">
        ${renderReturnCard({
          tone: 'blue', icon: GST_ICONS.gstr1, name: 'GSTR-1', desc: 'Outward Supplies Return', detailsView: 'gstr1',
          hasData: s.salesCount > 0,
          metrics: [
            { label: 'Taxable Value', value: fmtInr(s.outwardTaxable) },
            { label: 'Total Tax', value: fmtInr(s.outputTax) },
            { label: 'No. of Records', value: fmtCount(s.salesCount), small: true },
            { label: 'Period', value: period, small: true },
          ],
        })}
        ${renderReturnCard({
          tone: 'violet', icon: GST_ICONS.gstr2b, name: 'GSTR-2B', desc: 'Auto Drafted ITC Statement',
          hasData: s.purchaseCount > 0,
          metrics: [
            { label: 'Total ITC Available', value: fmtInr(s.itc) },
            { label: 'No. of Records', value: fmtCount(s.purchaseCount) },
            { label: 'Period', value: period, small: true },
            { label: 'Last Entry', value: fmtDate(s.lastPurchase), small: true },
          ],
        })}
        ${renderReturnCard({
          tone: 'emerald', icon: GST_ICONS.gstr3b, name: 'GSTR-3B', desc: 'Summary Return', detailsView: 'gstr3b',
          hasData: (s.salesCount + s.purchaseCount) > 0,
          metrics: [
            { label: 'Total Liability', value: fmtInr(s.outputTax) },
            { label: 'Net ITC', value: fmtInr(s.itc) },
            { label: 'No. of Records', value: fmtCount(s.salesCount + s.purchaseCount), small: true },
            { label: 'Period', value: period, small: true },
          ],
        })}
      </div>

      <div class="gst-summary-grid">
        ${renderSummaryTile('blue', GST_ICONS.sales, 'Total Sales (Taxable)', fmtInr(s.outwardTaxable))}
        ${renderSummaryTile('emerald', GST_ICONS.rupee, 'Total Output Tax', fmtInr(s.outputTax))}
        ${renderSummaryTile('violet', GST_ICONS.gstr2b, 'Total ITC (2B)', fmtInr(s.itc))}
        ${renderSummaryTile('amber', GST_ICONS.scale, 'Net GST Liability (3B)', fmtInr(s.netLiability))}
      </div>

      <div class="gst-activity-card">
        <div class="gst-activity-title">Recent Activity</div>
        <div class="gst-activity-scroll">
          <table class="gst-activity-table">
            <thead>
              <tr>
                <th>Return</th>
                <th>Period</th>
                <th>Status</th>
                <th>Last Entry On</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${activityRows.map(r => `
                <tr>
                  <td class="gst-ret">${r.name}</td>
                  <td>${period}</td>
                  <td>${statusBadge(r.hasData)}</td>
                  <td>${fmtDate(r.last)}</td>
                  <td><button class="gst-outline-btn gst-view-btn" type="button" data-return="${r.name}">View</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    `;
  }

  // ── Panel ─────────────────────────────────────────────────────────────

  function renderSubTab(id, label, icon) {
    const isActive = _activeReportsTab === id;
    return `
      <button class="oh-sub-tab ${isActive ? 'active' : ''}" data-reports-tab="${id}" role="tab" aria-selected="${isActive}">
        <div class="oh-tab-icon-wrap">${icon}</div>
        <span class="oh-tab-text">${label}</span>
      </button>
    `;
  }

  // GSTR-1 section tiles (opened from the GSTR-1 card's View Details)
  function renderGstr1SectionsView() {
    const CHECK_ICON = `<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.6"/><path d="M6.8 10.2l2.2 2.2 4.2-4.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    return `
      <div class="gst-dash">
        <div class="gstr1-sec-grid">
          ${GSTR1_SECTIONS.map(title => `
            <div class="gstr1-sec-tile">
              <div class="gstr1-sec-head">${title}</div>
              <div class="gstr1-sec-body">${CHECK_ICON}<span>0</span></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // GSTR-3B section tables (opened from the GSTR-3B card's View Details)
  function renderGstr3bSectionsView() {
    const { period } = getGstSelection();
    const { g3b } = computeGstSummary(period);
    const fourTax = (igst, cgst, sgst) => [
      ['Integrated Tax', igst], ['Central Tax', cgst], ['State/UT Tax', sgst], ['CESS (₹)', 0],
    ];
    const sections = [
      { title: '3.1 Tax on outward and reverse charge inward supplies', fields: fourTax(g3b.outward.igst, g3b.outward.cgst, g3b.outward.sgst) },
      { title: '3.1.1 Supplies notified under section 9(5) of the CGST Act, 2017', fields: fourTax(0, 0, 0) },
      { title: '3.2 Inter-state supplies', fields: [['Taxable Value', g3b.outward.unregInterTaxable], ['Integrated Tax', g3b.outward.unregInterIgst]] },
      { title: '4. Eligible ITC', fields: fourTax(g3b.itc.igst, g3b.itc.cgst, g3b.itc.sgst) },
      { title: '5. Exempt, nil and Non GST inward supplies', fields: [['Inter-state supplies', g3b.exemptInward.inter], ['Intra-state supplies', g3b.exemptInward.intra]] },
      { title: '5.1 Interest and Late fee for previous tax period', fields: fourTax(0, 0, 0) },
      // GST payments aren't recorded in KYA yet, so the full liability is shown as unpaid
      { title: '6.1 Payment of tax', fields: [['Balance Liability', g3b.outputTax], ['Paid through Cash', 0], ['Paid through Credit', 0]] },
    ];
    return `
      <div class="gst-dash">
        <div class="gstr3b-sec-grid">
          ${sections.map(sec => `
            <div class="gstr3b-sec-tile">
              <div class="gstr3b-sec-head">${sec.title}</div>
              <div class="gstr3b-sec-body">
                ${sec.fields.map(([label, value]) => `
                  <div class="gstr3b-field">
                    <div class="gstr3b-field-label">${label}</div>
                    <div class="gstr3b-field-value">${fmtInrExact(value)}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderReportsContent() {
    if (_activeReportsTab === 'gst') {
      if (_gstView === 'gstr1') return renderGstr1SectionsView();
      if (_gstView === 'gstr3b') return renderGstr3bSectionsView();
      return renderGstView();
    }
    return `
      <div class="oh-empty">
        <div class="oh-empty-title">${TAB_TITLES[_activeReportsTab] || ''}</div>
      </div>
    `;
  }

  function renderReportsHubPanel() {
    injectReportsHubStyles();
    const container = document.getElementById('panel-reports');
    if (!container) return;

    const isFullScreen = FULL_SCREEN_TABS.includes(_activeReportsTab);

    container.innerHTML = `
      <div class="table-card" style="padding: 24px 28px;">
        <!-- Colored header strip -->
        <div class="je-card-header" style="background: linear-gradient(90deg, var(--blue-700), var(--blue-500)); border-top-left-radius: 12px; border-top-right-radius: 12px; margin: -24px -28px 20px -28px; padding: 18px 28px; display: flex; align-items: center; justify-content: space-between;">
          <div class="je-card-header-left" style="display: flex; align-items: center; gap: 12px;">
            <div class="je-card-icon-wrap" style="background: rgba(255, 255, 255, 0.15); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
              <svg viewBox="0 0 20 20" fill="none" style="width: 20px; height: 20px; color: var(--white);">
                <path d="M5 2.5h7l3.5 3.5v11.5H5V2.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
                <path d="M12 2.5V6h3.5" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
                <path d="M8 10h5M8 13h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
              </svg>
            </div>
            <div>
              <div class="je-card-title-text" style="color: var(--white); font-weight: 700; font-size: 16px; margin: 0;">Reports</div>
              <div class="je-card-subtitle-text" style="color: rgba(255, 255, 255, 0.8); font-size: 12px; margin: 2px 0 0 0;">Statutory and general reports</div>
            </div>
          </div>
          ${_activeReportsTab === 'gst' ? renderGstCycleSlider() : ''}
        </div>

        <div class="oh-layout ${isFullScreen ? 'full-width' : ''}" id="reportsLayoutContainer">
          <!-- Sub-tabs (Left side options cards) -->
          <div class="oh-sub-tabs" id="reportsSidebar" role="tablist" aria-label="Reports sections" style="display: ${isFullScreen ? 'none' : 'flex'};">
            ${renderSubTab('overview', 'Overview', `
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
                <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
                <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
                <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
              </svg>`)}

            <div style="${SECTION_LABEL_STYLE}">Statutory Reports</div>

            ${renderSubTab('gst', 'GST', DOC_ICON)}
            ${renderSubTab('tds', 'TDS', DOC_ICON)}
            ${renderSubTab('tcs', 'TCS', DOC_ICON)}

            <div style="${SECTION_LABEL_STYLE}">General Reports</div>
          </div>

          <!-- Right Content View Area -->
          <div class="oh-content-area">
            <div id="reportsBackBar" style="display: ${isFullScreen ? 'flex' : 'none'}; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; background: var(--slate-50); border: 1.5px solid var(--slate-200); border-radius: 12px; padding: 12px 16px;">
              <div style="display: flex; gap: 10px; align-items: center;">
                <button class="btn btn-secondary" id="reportsBackBtn" type="button" style="height:34px; font-size:12.5px; padding: 0 14px; font-weight:600; cursor:pointer; border-radius:6px; display:inline-flex; align-items:center; gap:6px;">
                  ← Back
                </button>
              </div>
              ${_activeReportsTab === 'gst' ? renderGstFilters() : ''}
            </div>
            <div id="reportsContentArea">${renderReportsContent()}</div>
          </div>
        </div>
      </div>
    `;

    container.querySelectorAll('.oh-sub-tab[data-reports-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        _activeReportsTab = btn.dataset.reportsTab;
        _gstView = 'dashboard';
        renderReportsHubPanel();
      });
    });

    const backBtn = container.querySelector('#reportsBackBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        // GSTR-1 sections → GST dashboard → Reports overview
        if (_activeReportsTab === 'gst' && _gstView !== 'dashboard') {
          _gstView = 'dashboard';
        } else {
          _activeReportsTab = 'overview';
        }
        renderReportsHubPanel();
      });
    }

    container.querySelectorAll('.rpt-cycle-pill-btn[data-cycle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const next = btn.dataset.cycle;
        if (next === _gstCycle) return;
        // Keep the same part of the year: month → its quarter, quarter → its first month
        if (_gstPeriodIdx !== null) {
          _gstPeriodIdx = next === 'quarterly' ? Math.floor(_gstPeriodIdx / 3) : _gstPeriodIdx * 3;
        }
        _gstCycle = next;
        renderReportsHubPanel();
      });
    });

    const yearSelect = container.querySelector('#gstYearSelect');
    if (yearSelect) {
      yearSelect.addEventListener('change', () => {
        _gstFyStart = parseInt(yearSelect.value, 10);
        renderReportsHubPanel();
      });
    }

    const periodSelect = container.querySelector('#gstPeriodSelect');
    if (periodSelect) {
      periodSelect.addEventListener('change', () => {
        _gstPeriodIdx = parseInt(periodSelect.value, 10);
        renderReportsHubPanel();
      });
    }

    container.querySelectorAll('.gst-view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.details) {
          _gstView = btn.dataset.details;
          renderReportsHubPanel();
          container.scrollIntoView({ block: 'start' });
          return;
        }
        if (typeof showToast === 'function') showToast(`${btn.dataset.return} details are coming soon.`, 'info');
      });
    });
  }

  // Global exports
  window.renderReportsHubPanel = renderReportsHubPanel;

})();
