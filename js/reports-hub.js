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
  let _gstView = 'dashboard';           // dashboard | gstr1 | gstr1-b2b | gstr1-b2b-docs | gstr1-b2b-invoice | gstr3b
  let _b2bInvoiceId = null;             // invoice opened from the document wise details

  // B2B document wise details (invoices of one recipient)
  let _b2bDocsGstin = '';
  let _b2bDocsSearch = '';
  let _b2bDocsPageSize = 10;
  let _b2bDocsPage = 0;
  const _b2bDocsHiddenCols = new Set();

  // 12 - HSN-wise summary
  let _hsnTab = 'b2b';                  // b2b | b2c
  let _hsnSearch = '';
  let _hsnPageSize = 10;
  let _hsnPage = 0;
  let _hsnSortDir = 'asc';              // HSN column sort

  // Where the Back button goes from each GST view
  const GST_VIEW_PARENT = { gstr1: 'dashboard', gstr3b: 'dashboard', 'gstr1-b2b': 'gstr1', 'gstr1-b2b-docs': 'gstr1-b2b', 'gstr1-b2b-invoice': 'gstr1-b2b-docs', 'gstr1-b2cs': 'gstr1', 'gstr1-hsn': 'gstr1', 'gstr1-docs': 'gstr1' };

  // GSTR-1 tiles that open a detail view when clicked
  const GSTR1_SECTION_VIEWS = {
    '4A, 4B, 6B, 6C - B2B, SEZ, DE Invoices': 'gstr1-b2b',
    '7 - B2C (Others)': 'gstr1-b2cs',
    '12 - HSN-wise summary of outward supplies': 'gstr1-hsn',
    '13 - Documents Issued': 'gstr1-docs',
  };

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

      .gst-activity-table th.num, .gst-activity-table td.num { text-align: right; }
      .gst-activity-table td.num, .gst-activity-table td.nowrap { white-space: nowrap; }

      /* B2B document wise details */
      .b2b-docs-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 14px;
      }
      .b2b-docs-chips { display: flex; flex-wrap: wrap; gap: 8px; }
      .b2b-docs-chip {
        display: inline-flex;
        align-items: center;
        height: 30px;
        padding: 0 14px;
        border-radius: 15px;
        background: var(--slate-100);
        color: var(--slate-700);
        font-size: 12.5px;
        font-weight: 600;
      }
      .b2b-docs-controls { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
      .b2b-docs-controls .btn { height: 34px; padding: 0 12px; font-size: 12.5px; font-weight: 600; border-radius: 6px; cursor: pointer; }
      .b2b-docs-cols-wrap { position: relative; }
      .b2b-docs-cols-menu {
        position: absolute;
        right: 0;
        top: calc(100% + 6px);
        z-index: 20;
        min-width: 220px;
        padding: 8px;
        background: var(--white);
        border: 1px solid var(--slate-200);
        border-radius: 10px;
        box-shadow: 0 10px 28px rgba(15,23,42,.14);
      }
      .b2b-docs-cols-menu label {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        border-radius: 6px;
        font-size: 12.5px;
        color: var(--slate-700);
        cursor: pointer;
      }
      .b2b-docs-cols-menu label:hover { background: var(--slate-50); }
      .b2b-docs-search {
        height: 34px;
        width: 200px;
        padding: 0 12px;
        font-size: 12.5px;
        font-family: inherit;
        color: var(--slate-700);
        background: var(--white);
        border: 1px solid var(--slate-200);
        border-radius: 6px;
        box-sizing: border-box;
      }
      .b2b-docs-search:focus { outline: none; border-color: var(--blue-400); box-shadow: 0 0 0 3px rgba(96,165,250,.15); }
      .b2b-docs-pager {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 12px;
        font-size: 12.5px;
        color: var(--slate-500);
      }
      .b2b-docs-pager .btn { height: 32px; padding: 0 12px; font-size: 12.5px; font-weight: 600; border-radius: 6px; cursor: pointer; }
      .b2b-docs-pager .btn:disabled { opacity: .45; cursor: default; }

      .b2b-doc-row { cursor: pointer; }
      .b2b-doc-row:hover td { background: var(--blue-50); }
      .b2b-doc-row:focus-visible { outline: 2px solid var(--blue-500); outline-offset: -2px; }

      /* B2B invoice detail (read-only) */
      .gst-inv-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px 24px;
        padding: 12px 14px;
        border-radius: 10px;
      }
      .gst-inv-grid.band { background: var(--slate-50); }
      .gst-inv-field { min-width: 0; }
      .gst-inv-label {
        font-size: 12px;
        font-weight: 600;
        color: var(--slate-600);
        margin-bottom: 6px;
      }
      .gst-inv-box {
        min-height: 36px;
        display: flex;
        align-items: center;
        padding: 0 12px;
        font-size: 13px;
        color: var(--slate-700);
        background: var(--slate-100);
        border: 1px solid var(--slate-200);
        border-radius: 7px;
        box-sizing: border-box;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .gst-inv-box.num { justify-content: flex-end; }
      .gst-inv-section-title {
        margin: 22px 0 12px;
        font-size: 15px;
        font-weight: 700;
        color: var(--slate-800);
      }
      .gst-activity-table.gst-inv-items td { padding: 8px 10px; }
      .gst-activity-table.gst-inv-items th { color: var(--slate-600); }

      /* Sub-tabs (e.g. HSN summary B2B / B2C Supplies) */
      .gst-subtabs { display: flex; gap: 4px; border-bottom: 1px solid var(--slate-200); }
      .gst-subtab {
        height: 36px;
        padding: 0 14px;
        font-size: 13px;
        font-weight: 600;
        font-family: inherit;
        color: var(--slate-500);
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        margin-bottom: -1px;
        cursor: pointer;
      }
      .gst-subtab:hover { color: var(--slate-800); }
      .gst-subtab.active { color: var(--blue-700); border-bottom-color: var(--blue-600); }
      .gst-sort-btn {
        padding: 0;
        font: inherit;
        color: inherit;
        text-transform: inherit;
        letter-spacing: inherit;
        background: none;
        border: none;
        cursor: pointer;
        white-space: nowrap;
      }
      .gst-hsn-desc { max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      /* 12 columns: compact headers and cells so it fits a laptop screen */
      .gst-activity-table.gst-hsn-table th { text-transform: none; letter-spacing: 0; font-size: 12px; padding: 10px 8px; }
      .gst-activity-table.gst-hsn-table td { padding: 10px 8px; }

      /* 13 - Documents Issued */
      .gst-docs-list { display: flex; flex-direction: column; gap: 16px; }
      .gst-docs-card { padding: 16px 18px; }
      .gst-docs-title { font-size: 14px; font-weight: 700; color: var(--slate-800); margin-bottom: 10px; }
      .gst-activity-table.gst-docs-table th { text-transform: none; letter-spacing: 0; font-size: 12px; }
      .gst-activity-table.gst-docs-table td { padding: 8px 10px; }

      /* Disclaimer under every GST screen */
      .gst-disclaimer {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin-top: 18px;
        padding: 12px 14px;
        font-size: 12px;
        line-height: 1.6;
        color: #92400e;
        background: #fffbeb;
        border: 1px solid #fde68a;
        border-radius: 10px;
      }
      .gst-disclaimer svg { width: 16px; height: 16px; flex-shrink: 0; margin-top: 2px; color: #d97706; }
      .gst-disclaimer strong { font-weight: 700; }

      /* Full grid lines (GSTR-1 section tables) */
      .gst-activity-table.gst-grid-table th,
      .gst-activity-table.gst-grid-table td,
      .gst-activity-table.gst-grid-table tr:last-child td {
        border: 1px solid var(--slate-200);
      }

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
      .gstr1-sec-tile.is-link { cursor: pointer; transition: box-shadow .18s ease, transform .18s ease; }
      .gstr1-sec-tile.is-link:hover { box-shadow: 0 6px 18px rgba(15,23,42,.10); transform: translateY(-2px); }
      .gstr1-sec-tile.is-link:focus-visible { outline: 2px solid var(--blue-500); outline-offset: 2px; }

      .gst-gstin {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 12px;
        font-weight: 700;
        color: #047857;
        background: #ecfdf5;
        padding: 2px 6px;
        border-radius: 4px;
      }

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
        .gst-activity-table.gst-grid-table th,
        .gst-activity-table.gst-grid-table td { padding: 10px 6px; font-size: 12.5px; }
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

      /* Shadow on every GST box (KYA shadow tokens); clickable ones lift further on hover */
      .gst-return-card,
      .gst-summary-tile,
      .gst-activity-card,
      .gstr1-sec-tile,
      .gstr3b-sec-tile {
        box-shadow: var(--shadow-md, 0 4px 12px rgba(0,0,0,.08));
      }
      .gst-return-card:hover,
      .gstr1-sec-tile.is-link:hover {
        box-shadow: var(--shadow-lg, 0 8px 30px rgba(0,0,0,.12));
      }
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
    // A reversal of a pre-invoice cancels a document that never made a sale — it is not a
    // credit note, so it stays out of the sales and GST reports
    return (window.KYA_STORE && Array.isArray(window.KYA_STORE.salesVouchers))
      ? window.KYA_STORE.salesVouchers.filter(v => !(v && v.reversedPreInvoice)) : [];
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
  function escHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function findCustomer(inv) {
    return (typeof findPartyById === 'function' ? findPartyById(inv.customerId, 'Customer') : null)
      || ((typeof coaLedgers !== 'undefined' ? coaLedgers : []).find(l => String(l.id) === String(inv.customerId)))
      || null;
  }

  // Taxpayer type = the customer's GST Registration Type from Master Desk → Additional Details
  function taxpayerTypeOf(party) {
    const value = (party && party.gstRegType) || '';
    const opt = (window.GST_REGISTRATION_TYPES || []).find(o => o.value === value);
    return value && opt ? opt.label : 'Not Specified';
  }

  // 4A, 4B, 6B, 6C: invoices (not returns / exports) to customers with a GSTIN
  function getGstr1B2bInvoices(period) {
    const list = [];
    getSalesVouchers().forEach(inv => {
      if (inv.isReturn || !inPeriod(inv.date, period)) return;
      if (inv.salesSupplyType === 'Export (Zero-Rated / LUT)') return;
      const party = findCustomer(inv);
      const gstin = String((party && party.gstin) || '').trim().toUpperCase();
      if (gstin) list.push({ inv, party, gstin });
    });
    return list;
  }

  // Recipient wise count
  function computeGstr1B2bRecipients(period) {
    const byGstin = new Map();
    getGstr1B2bInvoices(period).forEach(({ inv, party, gstin }) => {
      if (!byGstin.has(gstin)) {
        byGstin.set(gstin, { gstin, name: (party && party.name) || inv.customerName || '', taxpayerType: taxpayerTypeOf(party), records: 0 });
      }
      byGstin.get(gstin).records += 1;
    });
    return Array.from(byGstin.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  // Document wise details: one row per B2B invoice of the selected recipient
  const B2B_DOC_COLUMNS = [
    { key: 'no', label: 'Invoice no.' },
    { key: 'date', label: 'Invoice date' },
    { key: 'value', label: 'Total invoice value (₹)', num: true },
    { key: 'taxable', label: 'Total taxable value (₹)', num: true },
    { key: 'igst', label: 'Integrated tax (₹)', num: true },
    { key: 'cgst', label: 'Central tax (₹)', num: true },
    { key: 'sgst', label: 'State/UT tax (₹)', num: true },
    { key: 'cess', label: 'Cess (₹)', num: true },
  ];

  function computeB2bDocuments(period, gstin) {
    return getGstr1B2bInvoices(period)
      .filter(x => x.gstin === gstin)
      .map(({ inv }) => {
        let taxable = 0, gst = 0;
        (inv.rows || []).forEach(r => {
          const t = rowTaxableAndGst(r, inv.type === 'Product');
          taxable += t.taxable;
          gst += t.gst;
        });
        const split = gstSplit(gst, inv.salesSupplyType);
        return {
          id: inv.id,
          no: inv.invoiceNo || '',
          dateObj: parseVoucherDate(inv.date),
          taxable,
          igst: split.igst,
          cgst: split.cgst,
          sgst: split.sgst,
          cess: 0,
          value: taxable + split.igst + split.cgst + split.sgst,
        };
      })
      .sort((a, b) => ((b.dateObj || 0) - (a.dateObj || 0)) || String(b.no).localeCompare(String(a.no)));
  }

  function fmtAmt(n) {
    return (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtDateSlash(d) {
    if (!d) return '';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  function b2bDocCell(doc, key) {
    if (key === 'no') return escHtml(doc.no);
    if (key === 'date') return fmtDateSlash(doc.dateObj);
    return fmtAmt(doc[key]);
  }

  // Table + pager only, so typing in Search doesn't rebuild (and blur) the search box
  function renderB2bDocsTable() {
    const { period } = getGstSelection();
    const q = _b2bDocsSearch.trim().toLowerCase();
    const docs = computeB2bDocuments(period, _b2bDocsGstin)
      .filter(d => !q || B2B_DOC_COLUMNS.some(c => String(b2bDocCell(d, c.key)).toLowerCase().includes(q)));
    const pages = Math.max(1, Math.ceil(docs.length / _b2bDocsPageSize));
    if (_b2bDocsPage >= pages) _b2bDocsPage = pages - 1;
    const start = _b2bDocsPage * _b2bDocsPageSize;
    const pageDocs = docs.slice(start, start + _b2bDocsPageSize);
    const cols = B2B_DOC_COLUMNS.filter(c => !_b2bDocsHiddenCols.has(c.key));
    return `
      <div class="gst-activity-scroll">
        <table class="gst-activity-table gst-grid-table">
          <thead>
            <tr>${cols.map(c => `<th class="${c.num ? 'num' : ''}">${c.label}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${pageDocs.length ? pageDocs.map(d => `
              <tr class="b2b-doc-row" data-inv-id="${escHtml(d.id)}" tabindex="0" title="Open invoice ${escHtml(d.no)}">${cols.map(c => `<td class="${c.num ? 'num' : 'nowrap'} ${c.key === 'no' ? 'gst-ret' : ''}">${b2bDocCell(d, c.key)}</td>`).join('')}</tr>
            `).join('') : `
              <tr><td colspan="${cols.length || 1}" style="text-align: center; padding: 28px 14px; color: var(--slate-400);">${q ? 'No invoices match your search.' : 'No invoices for this recipient in this period.'}</td></tr>
            `}
          </tbody>
        </table>
      </div>
      <div class="b2b-docs-pager">
        <span>${docs.length ? `Showing ${start + 1}–${start + pageDocs.length} of ${docs.length}` : ''}</span>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary b2b-docs-page-btn" type="button" data-page="${_b2bDocsPage - 1}" ${_b2bDocsPage <= 0 ? 'disabled' : ''}>‹ Prev</button>
          <button class="btn btn-secondary b2b-docs-page-btn" type="button" data-page="${_b2bDocsPage + 1}" ${_b2bDocsPage >= pages - 1 ? 'disabled' : ''}>Next ›</button>
        </div>
      </div>
    `;
  }

  function renderGstr1B2bDocsView() {
    const { period } = getGstSelection();
    const recipient = computeGstr1B2bRecipients(period).find(r => r.gstin === _b2bDocsGstin);
    const name = recipient ? recipient.name : '';
    return `
      <div class="gst-dash">
        <div class="gst-activity-card" style="padding: 18px;">
          <div class="b2b-docs-toolbar">
            <div class="b2b-docs-chips">
              <span class="b2b-docs-chip">${escHtml(_b2bDocsGstin)}</span>
              ${name ? `<span class="b2b-docs-chip">${escHtml(name)}</span>` : ''}
            </div>
            <div class="b2b-docs-controls">
              <div class="b2b-docs-cols-wrap">
                <button class="btn btn-secondary b2b-docs-cols-btn" type="button" aria-haspopup="true" aria-expanded="false">Display/Hide Columns ▾</button>
                <div class="b2b-docs-cols-menu" hidden>
                  ${B2B_DOC_COLUMNS.map(c => `
                    <label><input type="checkbox" data-col="${c.key}" ${_b2bDocsHiddenCols.has(c.key) ? '' : 'checked'}> ${c.label}</label>
                  `).join('')}
                </div>
              </div>
              <span class="rpt-filter-select-wrap">
                <select class="rpt-filter-select" id="b2bDocsPageSize" aria-label="Records per page">
                  ${[10, 25, 50, 100].map(n => `<option value="${n}" ${n === _b2bDocsPageSize ? 'selected' : ''}>${n} per page</option>`).join('')}
                </select>
                ${CARET_ICON}
              </span>
              <input type="search" class="b2b-docs-search" id="b2bDocsSearch" placeholder="Search..." value="${escHtml(_b2bDocsSearch)}" aria-label="Search invoices">
            </div>
          </div>
          <div id="b2bDocsTableWrap">${renderB2bDocsTable()}</div>
        </div>
      </div>
    `;
  }

  function wireB2bDocsView(container) {
    const wrap = container.querySelector('#b2bDocsTableWrap');
    if (!wrap) return;
    const refreshTable = () => { wrap.innerHTML = renderB2bDocsTable(); wirePager(); };
    const wirePager = () => {
      wrap.querySelectorAll('.b2b-doc-row[data-inv-id]').forEach(tr => {
        const open = () => {
          _b2bInvoiceId = tr.dataset.invId;
          _gstView = 'gstr1-b2b-invoice';
          renderReportsHubPanel();
          container.scrollIntoView({ block: 'start' });
        };
        tr.addEventListener('click', open);
        tr.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
        });
      });
      wrap.querySelectorAll('.b2b-docs-page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          _b2bDocsPage = parseInt(btn.dataset.page, 10) || 0;
          refreshTable();
        });
      });
    };
    wirePager();

    const search = container.querySelector('#b2bDocsSearch');
    if (search) {
      search.addEventListener('input', () => {
        _b2bDocsSearch = search.value;
        _b2bDocsPage = 0;
        refreshTable();
      });
    }

    const pageSize = container.querySelector('#b2bDocsPageSize');
    if (pageSize) {
      pageSize.addEventListener('change', () => {
        _b2bDocsPageSize = parseInt(pageSize.value, 10) || 10;
        _b2bDocsPage = 0;
        refreshTable();
      });
    }

    const colsBtn = container.querySelector('.b2b-docs-cols-btn');
    const colsMenu = container.querySelector('.b2b-docs-cols-menu');
    if (colsBtn && colsMenu) {
      colsBtn.addEventListener('click', e => {
        e.stopPropagation();
        colsMenu.hidden = !colsMenu.hidden;
        colsBtn.setAttribute('aria-expanded', String(!colsMenu.hidden));
      });
      colsMenu.addEventListener('click', e => e.stopPropagation());
      colsMenu.querySelectorAll('input[data-col]').forEach(cb => {
        cb.addEventListener('change', () => {
          if (cb.checked) _b2bDocsHiddenCols.delete(cb.dataset.col);
          else _b2bDocsHiddenCols.add(cb.dataset.col);
          refreshTable();
        });
      });
    }
  }

  // ── B2B invoice detail (read-only, GST portal layout) ─────────────────

  const GST_RATE_SLABS = [0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28, 40];

  function titleCase(s) {
    return String(s || '').replace(/\b[a-z]/g, ch => ch.toUpperCase());
  }

  // Place of supply as "32-Kerala" — same source as the printed invoice: customer's state, else the company's
  function placeOfSupplyOf(party) {
    const co = typeof getInvoiceCompany === 'function' ? (getInvoiceCompany() || {}) : {};
    const fromParty = !!(party && (party.state || party.country));
    const state = fromParty ? (party.state || '') : (co.state || '');
    const country = fromParty ? (party.country || '') : '';
    const gstin = fromParty ? (party && party.gstin) : co.gstin;
    let code = typeof getGstStateCode === 'function' ? getGstStateCode(state, country, gstin) : '';
    if (!code && party && /^\d{2}/.test(String(party.gstin || ''))) code = String(party.gstin).slice(0, 2);
    let name = state;
    if (!name && code) {
      const entry = Object.entries(window.GST_STATE_CODES || {}).find(([, c]) => c === code);
      name = entry ? titleCase(entry[0]) : '';
    }
    return [code, name].filter(Boolean).join('-');
  }

  function renderReadonlyField(label, value, opts = {}) {
    return `
      <div class="gst-inv-field">
        <div class="gst-inv-label">${label}</div>
        <div class="gst-inv-box ${opts.num ? 'num' : ''}" title="${escHtml(value)}">${escHtml(value)}</div>
      </div>
    `;
  }

  function renderGstr1B2bInvoiceView() {
    const found = getSalesVouchers().find(v => String(v.id) === String(_b2bInvoiceId));
    if (!found) {
      return `<div class="oh-empty"><div class="oh-empty-title">Invoice not found</div></div>`;
    }
    const inv = found;
    const party = findCustomer(inv) || {};
    const isIntra = isIntraStateSupply(inv.salesSupplyType);

    // Rate-wise taxable value and tax
    const byRate = new Map();
    (inv.rows || []).forEach(r => {
      const rate = parseFloat(r.tax) || 0;
      const t = rowTaxableAndGst(r, inv.type === 'Product');
      const split = gstSplit(t.gst, inv.salesSupplyType);
      const acc = byRate.get(rate) || { taxable: 0, igst: 0, cgst: 0, sgst: 0 };
      acc.taxable += t.taxable;
      acc.igst += split.igst;
      acc.cgst += split.cgst;
      acc.sgst += split.sgst;
      byRate.set(rate, acc);
    });
    const rates = Array.from(new Set(GST_RATE_SLABS.concat(Array.from(byRate.keys())))).sort((a, b) => a - b);
    let total = 0;
    byRate.forEach(v => { total += v.taxable + v.igst + v.cgst + v.sgst; });

    const taxCols = isIntra
      ? [['cgst', 'Central tax (₹)'], ['sgst', 'State/UT tax (₹)'], ['cess', 'Cess (₹)']]
      : [['igst', 'Integrated tax (₹)'], ['cess', 'Cess (₹)']];
    const box = v => `<div class="gst-inv-box num">${v === null ? '' : fmtAmt(v)}</div>`;

    return `
      <div class="gst-dash">
        <div class="gst-activity-card" style="padding: 18px;">
          <div class="gst-inv-grid">
            ${renderReadonlyField('Recipient GSTIN/UIN', String(party.gstin || '').toUpperCase())}
            ${renderReadonlyField('Recipient Name', inv.customerName || party.name || '')}
            ${renderReadonlyField('Name as in Master', party.name || '')}
          </div>
          <div class="gst-inv-grid band">
            ${renderReadonlyField('Invoice no.', inv.invoiceNo || '')}
            ${renderReadonlyField('Invoice date', fmtDateSlash(parseVoucherDate(inv.date)))}
            ${renderReadonlyField('Total invoice value (₹)', fmtAmt(total), { num: true })}
          </div>
          <div class="gst-inv-grid">
            ${renderReadonlyField('POS', placeOfSupplyOf(party))}
            ${renderReadonlyField('Supply Type', isIntra ? 'Intra-State' : 'Inter-State')}
          </div>
          <div class="gst-inv-grid band">
            ${renderReadonlyField('Source', '')}
            ${renderReadonlyField('IRN', '')}
            ${renderReadonlyField('IRN date', '')}
          </div>

          <div class="gst-inv-section-title">Item details</div>
          <div class="gst-activity-scroll">
            <table class="gst-activity-table gst-grid-table gst-inv-items">
              <thead>
                <tr>
                  <th rowspan="2" style="text-align: center;">Rate (%)</th>
                  <th rowspan="2" style="text-align: center;">Taxable value (₹)</th>
                  <th colspan="${taxCols.length}" style="text-align: center;">Amount of Tax</th>
                </tr>
                <tr>${taxCols.map(([, label]) => `<th style="text-align: center;">${label}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${rates.map(rate => {
                  const v = byRate.get(rate);
                  return `
                    <tr>
                      <td style="text-align: center; white-space: nowrap;">${rate}%</td>
                      <td>${box(v ? v.taxable : null)}</td>
                      ${taxCols.map(([key]) => `<td>${box(v && key !== 'cess' ? v[key] : null)}</td>`).join('')}
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

  // ── 7 - B2C (Others): place of supply × rate summary ────────────────

  // Inter-state invoices to unregistered persons above this value are B2C (Large), section 5
  const B2CL_INVOICE_LIMIT = 100000;

  function computeGstr1B2csRows(period) {
    const groups = new Map();
    getSalesVouchers().forEach(inv => {
      if (!inPeriod(inv.date, period)) return;
      const t = inv.salesSupplyType || DEFAULT_SUPPLY_TYPE;
      if (t !== DEFAULT_SUPPLY_TYPE && t !== 'Inter-State (IGST)') return; // exports, SEZ, deemed exports
      const party = findCustomer(inv);
      if (String((party && party.gstin) || '').trim()) return;            // registered → B2B

      const lines = (inv.rows || []).map(r => ({ rate: parseFloat(r.tax) || 0, ...rowTaxableAndGst(r, inv.type === 'Product') }));
      const invoiceValue = lines.reduce((s, l) => s + l.taxable + l.gst, 0);
      if (t === 'Inter-State (IGST)' && invoiceValue > B2CL_INVOICE_LIMIT) return; // B2C (Large)

      const pos = placeOfSupplyOf(party).replace(/^\d{2}-/, '') || 'Not Specified';
      const sign = inv.isReturn ? -1 : 1;
      lines.forEach(l => {
        if (!(l.rate > 0)) return; // 0% lines are nil rated (section 8)
        const key = pos + '|' + l.rate;
        const g = groups.get(key) || { pos, rate: l.rate, taxable: 0, igst: 0, cgst: 0, sgst: 0 };
        const split = gstSplit(l.gst, t);
        g.taxable += sign * l.taxable;
        g.igst += sign * split.igst;
        g.cgst += sign * split.cgst;
        g.sgst += sign * split.sgst;
        groups.set(key, g);
      });
    });
    return Array.from(groups.values())
      .filter(g => Math.abs(g.taxable) >= 0.005)
      .sort((a, b) => a.pos.localeCompare(b.pos) || b.rate - a.rate);
  }

  function renderGstr1B2csView() {
    const { period } = getGstSelection();
    const rows = computeGstr1B2csRows(period);
    return `
      <div class="gst-dash">
        <div class="gst-activity-card" style="padding: 18px;">
          <div class="gst-activity-scroll">
            <table class="gst-activity-table gst-grid-table">
              <thead>
                <tr>
                  <th>Place of Supply (Name of State)</th>
                  <th class="num" style="text-align: center;">Rate (%)</th>
                  <th class="num">Total Taxable Value</th>
                  <th class="num">Integrated tax (₹)</th>
                  <th class="num">Central tax (₹)</th>
                  <th class="num">State/UT tax (₹)</th>
                  <th class="num">Cess (₹)</th>
                  <th class="num">Applicable percentage(%)</th>
                </tr>
              </thead>
              <tbody>
                ${rows.length ? rows.map(r => `
                  <tr>
                    <td class="nowrap">${escHtml(r.pos)}</td>
                    <td class="num" style="text-align: center;">${r.rate}</td>
                    <td class="num">${fmtAmt(r.taxable)}</td>
                    <td class="num">${fmtAmt(r.igst)}</td>
                    <td class="num">${fmtAmt(r.cgst)}</td>
                    <td class="num">${fmtAmt(r.sgst)}</td>
                    <td class="num">-</td>
                    <td class="num">-</td>
                  </tr>
                `).join('') : `
                  <tr><td colspan="8" style="text-align: center; padding: 28px 14px; color: var(--slate-400);">No B2C (Others) supplies in this period.</td></tr>
                `}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ── 12 - HSN-wise summary of outward supplies ───────────────────────

  // KYA units (free text) → GST Unit Quantity Codes
  const UQC_BY_UNIT = {
    nos: 'NOS', no: 'NOS', number: 'NOS', numbers: 'NOS',
    pcs: 'PCS', pc: 'PCS', piece: 'PCS', pieces: 'PCS',
    kg: 'KGS', kgs: 'KGS', kilogram: 'KGS', kilograms: 'KGS',
    g: 'GMS', gm: 'GMS', gms: 'GMS', gram: 'GMS', grams: 'GMS',
    l: 'LTR', ltr: 'LTR', ltrs: 'LTR', litre: 'LTR', litres: 'LTR', liter: 'LTR', liters: 'LTR',
    ml: 'MLT', mtr: 'MTR', mtrs: 'MTR', m: 'MTR', meter: 'MTR', meters: 'MTR', metre: 'MTR', metres: 'MTR',
    cm: 'CMS', cms: 'CMS', km: 'KME', mm: 'MTR',
    box: 'BOX', boxes: 'BOX', bag: 'BAG', bags: 'BAG', bottle: 'BTL', bottles: 'BTL', btl: 'BTL',
    dozen: 'DOZ', doz: 'DOZ', dozens: 'DOZ', pack: 'PAC', packs: 'PAC', pkt: 'PAC', packet: 'PAC', packets: 'PAC',
    set: 'SET', sets: 'SET', pair: 'PRS', pairs: 'PRS', roll: 'ROL', rolls: 'ROL', bundle: 'BDL', bundles: 'BDL',
    carton: 'CTN', cartons: 'CTN', can: 'CAN', cans: 'CAN', tube: 'TUB', tubes: 'TUB',
    ton: 'TON', tons: 'TON', tonne: 'TON', tonnes: 'TON', quintal: 'QTL', qtl: 'QTL',
    unit: 'UNT', units: 'UNT', sqft: 'SQF', 'sq ft': 'SQF', sqm: 'SQM', 'sq m': 'SQM',
  };

  function uqcOf(row) {
    if (row.revenueLedgerId) return 'NA'; // service line
    const u = String(row.unit || '').trim().toLowerCase().replace(/\./g, '');
    if (!u) return 'OTH';
    return UQC_BY_UNIT[u] || (/^[A-Z]{3}$/.test(String(row.unit).trim()) ? String(row.unit).trim() : 'OTH');
  }

  // tab: 'b2b' (recipients with a GSTIN) or 'b2c' (everyone else, incl. exports)
  function computeGstr1HsnRows(period, tab) {
    const groups = new Map();
    getSalesVouchers().forEach(inv => {
      if (!inPeriod(inv.date, period)) return;
      const party = findCustomer(inv);
      const registered = !!String((party && party.gstin) || '').trim();
      if ((tab === 'b2b') !== registered) return;
      const sign = inv.isReturn ? -1 : 1;
      const isProduct = inv.type === 'Product';
      (inv.rows || []).forEach(r => {
        const hsn = String(r.hsn || '').trim();
        const uqc = isProduct ? uqcOf(r) : 'NA';
        const rate = parseFloat(r.tax) || 0;
        const { taxable, gst } = rowTaxableAndGst(r, isProduct);
        const split = gstSplit(gst, inv.salesSupplyType);
        const key = [hsn, uqc, rate].join('|');
        const g = groups.get(key) || { hsn, uqc, rate, hsnDesc: '', qty: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0 };
        if (!g.hsnDesc && r.hsnDesc) g.hsnDesc = r.hsnDesc;
        if (uqc !== 'NA') g.qty += sign * (parseFloat(r.qty) || 0);
        g.taxable += sign * taxable;
        g.igst += sign * split.igst;
        g.cgst += sign * split.cgst;
        g.sgst += sign * split.sgst;
        groups.set(key, g);
      });
    });
    const dir = _hsnSortDir === 'desc' ? -1 : 1;
    return Array.from(groups.values())
      .filter(g => Math.abs(g.taxable) >= 0.005 || Math.abs(g.qty) > 0)
      .sort((a, b) => dir * a.hsn.localeCompare(b.hsn, undefined, { numeric: true }) || b.rate - a.rate);
  }

  function fmtQty(n) {
    return (Math.round((Number(n) || 0) * 1000) / 1000).toLocaleString('en-IN', { maximumFractionDigits: 3 });
  }

  // Table + pager only, so typing in Search keeps focus
  function renderHsnTable() {
    const { period } = getGstSelection();
    const q = _hsnSearch.trim().toLowerCase();
    const all = computeGstr1HsnRows(period, _hsnTab);
    const rows = all.filter(g => !q || [g.hsn, g.hsnDesc, g.uqc, String(g.rate), fmtAmt(g.taxable)].some(v => String(v).toLowerCase().includes(q)));
    const pages = Math.max(1, Math.ceil(rows.length / _hsnPageSize));
    if (_hsnPage >= pages) _hsnPage = pages - 1;
    const start = _hsnPage * _hsnPageSize;
    const pageRows = rows.slice(start, start + _hsnPageSize);
    const dash = v => (Math.abs(v) < 0.005 ? '-' : fmtAmt(v));
    return `
      <div class="gst-activity-scroll">
        <table class="gst-activity-table gst-grid-table gst-hsn-table">
          <thead>
            <tr>
              <th rowspan="2" class="num" style="text-align: center;">Sr No.</th>
              <th rowspan="2"><button type="button" class="gst-sort-btn" id="hsnSortBtn" aria-label="Sort by HSN">HSN ${_hsnSortDir === 'asc' ? '▲' : '▼'}</button></th>
              <th rowspan="2">Description</th>
              <th rowspan="2">Description as per HSN Code</th>
              <th rowspan="2" style="text-align: center;">UQC</th>
              <th rowspan="2" class="num">Total Quantity</th>
              <th rowspan="2" class="num">Total taxable value (₹)</th>
              <th rowspan="2" class="num" style="text-align: center;">Rate (%)</th>
              <th colspan="4" style="text-align: center;">Amount of tax</th>
            </tr>
            <tr>
              <th class="num">Integrated tax (₹)</th>
              <th class="num">Central tax (₹)</th>
              <th class="num">State/UT tax (₹)</th>
              <th class="num">Cess (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${pageRows.length ? pageRows.map((g, i) => `
              <tr>
                <td class="num" style="text-align: center;">${start + i + 1}</td>
                <td class="nowrap gst-ret">${escHtml(g.hsn) || '—'}</td>
                <td></td>
                <td><div class="gst-hsn-desc" title="${escHtml(g.hsnDesc)}">${escHtml(g.hsnDesc)}</div></td>
                <td class="nowrap" style="text-align: center;">${escHtml(g.uqc)}</td>
                <td class="num">${fmtQty(g.qty)}</td>
                <td class="num">${fmtAmt(g.taxable)}</td>
                <td class="num" style="text-align: center;">${g.rate}</td>
                <td class="num">${dash(g.igst)}</td>
                <td class="num">${dash(g.cgst)}</td>
                <td class="num">${dash(g.sgst)}</td>
                <td class="num">-</td>
              </tr>
            `).join('') : `
              <tr><td colspan="12" style="text-align: center; padding: 28px 14px; color: var(--slate-400);">${q ? 'No records match your search.' : 'No supplies in this period.'}</td></tr>
            `}
          </tbody>
        </table>
      </div>
      <div class="b2b-docs-pager">
        <span>${rows.length ? `Showing ${start + 1}–${start + pageRows.length} of ${rows.length}` : ''}</span>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary hsn-page-btn" type="button" data-page="${_hsnPage - 1}" ${_hsnPage <= 0 ? 'disabled' : ''}>‹ Prev</button>
          <button class="btn btn-secondary hsn-page-btn" type="button" data-page="${_hsnPage + 1}" ${_hsnPage >= pages - 1 ? 'disabled' : ''}>Next ›</button>
        </div>
      </div>
    `;
  }

  function renderGstr1HsnView() {
    const tab = (id, label) => `<button type="button" class="gst-subtab ${_hsnTab === id ? 'active' : ''}" data-hsn-tab="${id}" role="tab" aria-selected="${_hsnTab === id}">${label}</button>`;
    return `
      <div class="gst-dash">
        <div class="gst-activity-card" style="padding: 18px;">
          <div class="b2b-docs-toolbar">
            <div class="gst-subtabs" role="tablist" aria-label="HSN summary">
              ${tab('b2b', 'B2B Supplies')}
              ${tab('b2c', 'B2C Supplies')}
            </div>
            <div class="b2b-docs-controls">
              <span class="rpt-filter-select-wrap">
                <select class="rpt-filter-select" id="hsnPageSize" aria-label="Records per page">
                  ${[10, 25, 50, 100].map(n => `<option value="${n}" ${n === _hsnPageSize ? 'selected' : ''}>${n} per page</option>`).join('')}
                </select>
                ${CARET_ICON}
              </span>
              <input type="search" class="b2b-docs-search" id="hsnSearch" placeholder="Search..." value="${escHtml(_hsnSearch)}" aria-label="Search HSN summary">
            </div>
          </div>
          <div id="hsnTableWrap">${renderHsnTable()}</div>
        </div>
      </div>
    `;
  }

  function wireHsnView(container) {
    const wrap = container.querySelector('#hsnTableWrap');
    if (!wrap) return;
    const refresh = () => { wrap.innerHTML = renderHsnTable(); wireTable(); };
    const wireTable = () => {
      wrap.querySelectorAll('.hsn-page-btn').forEach(btn => {
        btn.addEventListener('click', () => { _hsnPage = parseInt(btn.dataset.page, 10) || 0; refresh(); });
      });
      const sortBtn = wrap.querySelector('#hsnSortBtn');
      if (sortBtn) sortBtn.addEventListener('click', () => { _hsnSortDir = _hsnSortDir === 'asc' ? 'desc' : 'asc'; refresh(); });
    };
    wireTable();

    container.querySelectorAll('.gst-subtab[data-hsn-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        _hsnTab = btn.dataset.hsnTab;
        _hsnPage = 0;
        container.querySelectorAll('.gst-subtab[data-hsn-tab]').forEach(b => {
          const on = b === btn;
          b.classList.toggle('active', on);
          b.setAttribute('aria-selected', String(on));
        });
        refresh();
      });
    });

    const search = container.querySelector('#hsnSearch');
    if (search) {
      search.addEventListener('input', () => { _hsnSearch = search.value; _hsnPage = 0; refresh(); });
    }

    const pageSize = container.querySelector('#hsnPageSize');
    if (pageSize) {
      pageSize.addEventListener('change', () => { _hsnPageSize = parseInt(pageSize.value, 10) || 10; _hsnPage = 0; refresh(); });
    }
  }

  // ── 13 - Documents Issued ──────────────────────────────────────────

  // GSTR-1 Table 13 document categories, in portal order
  const GSTR1_DOC_CATEGORIES = [
    'Invoices for outward supply',
    'Invoices for inward supply from unregistered person',
    'Revised Invoice',
    'Debit Note',
    'Credit Note',
    'Receipt voucher',
    'Payment Voucher',
    'Refund voucher',
    'Delivery Challan for job work',
    'Delivery Challan for supply on approval',
    'Delivery Challan in case of liquid gas',
    'Delivery Challan in cases other than by way of supply (excluding at S no. 9 to 11)',
  ];

  // Group document numbers into series (text prefix + running number), e.g. SCR-26-27-000001 … 000065
  function documentSeries(numbers) {
    const series = new Map();
    numbers.forEach(raw => {
      const no = String(raw || '').trim();
      if (!no) return;
      const m = /^(.*?)(\d+)$/.exec(no);
      const key = m ? `${m[1]}|${m[2].length}` : `${no}|x`;
      const s = series.get(key) || { prefix: m ? m[1] : no, numbers: new Map() };
      s.numbers.set(no, m ? parseInt(m[2], 10) : 0);
      series.set(key, s);
    });
    return Array.from(series.values()).map(s => {
      const sorted = Array.from(s.numbers.entries()).sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
      const total = sorted.length;
      return { from: sorted[0][0], to: sorted[total - 1][0], total, cancelled: 0, net: total };
    }).sort((a, b) => a.from.localeCompare(b.from));
  }

  function computeGstr1DocumentsIssued(period) {
    const sales = getSalesVouchers().filter(v => inPeriod(v.date, period));
    const rowsByCategory = {
      'Invoices for outward supply': documentSeries(sales.filter(v => !v.isReturn).map(v => v.invoiceNo)),
      'Credit Note': documentSeries(sales.filter(v => v.isReturn).map(v => v.invoiceNo)),
    };
    return GSTR1_DOC_CATEGORIES.map((name, i) => ({ no: i + 1, name, rows: rowsByCategory[name] || [] }));
  }

  function renderGstr1DocumentsView() {
    const { period } = getGstSelection();
    const categories = computeGstr1DocumentsIssued(period);
    const box = v => `<div class="gst-inv-box">${escHtml(v)}</div>`;
    return `
      <div class="gst-dash">
        <div class="gst-docs-list">
          ${categories.map(cat => `
            <div class="gst-activity-card gst-docs-card">
              <div class="gst-docs-title">${cat.no}. ${escHtml(cat.name)}</div>
              <div class="gst-activity-scroll">
                <table class="gst-activity-table gst-grid-table gst-docs-table">
                  <thead>
                    <tr>
                      <th rowspan="2" style="text-align: center; width: 56px;">No.</th>
                      <th colspan="2" style="text-align: center;">Sr. No.</th>
                      <th rowspan="2" style="text-align: center;">Total number</th>
                      <th rowspan="2" style="text-align: center;">Cancelled</th>
                      <th rowspan="2" style="text-align: center;">Net issued</th>
                    </tr>
                    <tr>
                      <th style="text-align: center;">From</th>
                      <th style="text-align: center;">To</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${cat.rows.length ? cat.rows.map((r, i) => `
                      <tr>
                        <td style="text-align: center;">${i + 1}</td>
                        <td>${box(r.from)}</td>
                        <td>${box(r.to)}</td>
                        <td>${box(fmtCount(r.total))}</td>
                        <td>${box(fmtCount(r.cancelled))}</td>
                        <td>${box(fmtCount(r.net))}</td>
                      </tr>
                    `).join('') : `
                      <tr><td colspan="6" style="text-align: center; padding: 16px 14px; color: var(--slate-400);">No documents in this period.</td></tr>
                    `}
                  </tbody>
                </table>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Close the Display/Hide Columns menu on any outside click
  document.addEventListener('click', () => {
    document.querySelectorAll('#panel-reports .b2b-docs-cols-menu').forEach(m => { m.hidden = true; });
    document.querySelectorAll('#panel-reports .b2b-docs-cols-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
  });

  function renderGstr1SectionsView() {
    const CHECK_ICON = `<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.6"/><path d="M6.8 10.2l2.2 2.2 4.2-4.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const { period } = getGstSelection();
    const b2bCount = computeGstr1B2bRecipients(period).reduce((sum, r) => sum + r.records, 0);
    const b2csCount = computeGstr1B2csRows(period).length;
    const hsnCount = computeGstr1HsnRows(period, 'b2b').length + computeGstr1HsnRows(period, 'b2c').length;
    const docsCount = computeGstr1DocumentsIssued(period).reduce((n, c) => n + c.rows.length, 0);
    return `
      <div class="gst-dash">
        <div class="gstr1-sec-grid">
          ${GSTR1_SECTIONS.map(title => {
            const view = GSTR1_SECTION_VIEWS[title];
            const count = view === 'gstr1-b2b' ? b2bCount : view === 'gstr1-b2cs' ? b2csCount : view === 'gstr1-hsn' ? hsnCount : view === 'gstr1-docs' ? docsCount : 0;
            return `
              <div class="gstr1-sec-tile ${view ? 'is-link' : ''}" ${view ? `data-section-view="${view}" role="button" tabindex="0"` : ''}>
                <div class="gstr1-sec-head">${title}</div>
                <div class="gstr1-sec-body">${CHECK_ICON}<span>${fmtCount(count)}</span></div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // Inside "4A, 4B, 6B, 6C - B2B, SEZ, DE Invoices": one row per recipient
  function renderGstr1B2bView() {
    const { period } = getGstSelection();
    const rows = computeGstr1B2bRecipients(period);
    return `
      <div class="gst-dash">
        <div class="gst-activity-card" style="padding: 18px;">
          <div class="gst-activity-scroll">
            <table class="gst-activity-table gst-grid-table">
              <thead>
                <tr>
                  <th>Recipient Details</th>
                  <th>Trade/Legal Name</th>
                  <th>Taxpayer Type</th>
                  <th>Processed Records</th>
                </tr>
              </thead>
              <tbody>
                ${rows.length ? rows.map(r => `
                  <tr class="b2b-doc-row gst-recipient-row" data-gstin="${escHtml(r.gstin)}" tabindex="0" title="Open invoices of ${escHtml(r.name)}">
                    <td><span class="gst-gstin">${escHtml(r.gstin)}</span></td>
                    <td class="gst-ret">${escHtml(r.name)}</td>
                    <td>${escHtml(r.taxpayerType)}</td>
                    <td>${fmtCount(r.records)}</td>
                  </tr>
                `).join('') : `
                  <tr><td colspan="4" style="text-align: center; padding: 28px 14px; color: var(--slate-400);">No B2B invoices in this period.</td></tr>
                `}
              </tbody>
            </table>
          </div>
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

  // Shown under every GST screen
  function renderGstDisclaimer() {
    return `
      <div class="gst-disclaimer" role="note">
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.6"/><path d="M10 9v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="6.3" r="1.1" fill="currentColor"/></svg>
        <div>
          <strong>Disclaimer:</strong> KYA is not affiliated with, endorsed by or connected to the GST Network (GSTN) or any
          government authority. These reports are prepared only from the data entered in KYA and are for reference. They are
          not auto-filled or fetched from the GST portal and are not an official GST return. Any mistake or omission in the
          entered data will be reflected here. Please verify all figures with the GST portal and your tax professional before
          filing. KYA is not responsible for errors arising from incorrect or incomplete data, or for any return filed based
          on these reports.
        </div>
      </div>
    `;
  }

  function renderGstContent() {
    if (_gstView === 'gstr1') return renderGstr1SectionsView();
    if (_gstView === 'gstr1-b2b') return renderGstr1B2bView();
    if (_gstView === 'gstr1-b2cs') return renderGstr1B2csView();
    if (_gstView === 'gstr1-hsn') return renderGstr1HsnView();
    if (_gstView === 'gstr1-docs') return renderGstr1DocumentsView();
    if (_gstView === 'gstr1-b2b-docs') return renderGstr1B2bDocsView();
    if (_gstView === 'gstr1-b2b-invoice') return renderGstr1B2bInvoiceView();
    if (_gstView === 'gstr3b') return renderGstr3bSectionsView();
    return renderGstView();
  }

  function renderReportsContent() {
    if (_activeReportsTab === 'gst') return renderGstContent() + renderGstDisclaimer();
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
          _gstView = GST_VIEW_PARENT[_gstView] || 'dashboard';
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

    container.querySelectorAll('.gstr1-sec-tile[data-section-view]').forEach(tile => {
      const open = () => {
        _gstView = tile.dataset.sectionView;
        renderReportsHubPanel();
        container.scrollIntoView({ block: 'start' });
      };
      tile.addEventListener('click', open);
      tile.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });

    container.querySelectorAll('.gst-recipient-row[data-gstin]').forEach(row => {
      const open = () => {
        _b2bDocsGstin = row.dataset.gstin;
        _b2bDocsSearch = '';
        _b2bDocsPage = 0;
        _gstView = 'gstr1-b2b-docs';
        renderReportsHubPanel();
        container.scrollIntoView({ block: 'start' });
      };
      row.addEventListener('click', open);
      row.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });

    wireB2bDocsView(container);
    wireHsnView(container);

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
