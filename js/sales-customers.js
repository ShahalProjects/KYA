/**
 * js/sales-customers.js
 * Sales Voucher → Customers (KYA): everyone sales documents are raised for — the customer
 * master plus ledgers created under Trade Receivables — in three views:
 *
 *   Overview           (in the Customers card) totals — receivable, overdue, refund balance,
 *                      advances — receivable ageing, and the largest balances either way
 *   Customer Details   (full screen) per customer: invoices, quotations, proformas, sales orders,
 *                      delivery challans and reversals raised, and the last sale date; a click
 *                      opens that customer's page — its invoices, active pre-invoices and
 *                      reversals with their dates
 *   Customer Balances  (full screen) per customer: Receivable, Overdue, Refund Balance, Advance,
 *                      On-account credit and Net Balance, opening to the unpaid invoices and
 *                      credits behind them
 *
 * Nothing is stored here: every figure comes from the same sources as the rest of Sales —
 * getInvoiceOutstanding / getCustomerCreditSources (sales-credit-adjust.js) and the customer
 * statement (getCustomerStatementData in ledgers.js).
 */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const store = () => window.KYA_STORE || {};
  const r2 = n => Math.round((parseFloat(n) || 0) * 100) / 100;
  const lower = s => String(s || '').trim().toLowerCase();
  const esc = str => (typeof ohEsc === 'function')
    ? ohEsc(str)
    : String(str == null ? '' : str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const fmt = n => (typeof fmtNum === 'function')
    ? fmtNum(n)
    : (parseFloat(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = n => `₹ ${fmt(n)}`;
  const dmy = iso => iso ? String(iso).split('-').reverse().join('-') : '';
  const todayIso = () => (typeof kyaLocalIso === 'function') ? kyaLocalIso() : new Date().toISOString().slice(0, 10);
  const daysBetween = (fromIso, toIso) => Math.round((new Date(toIso + 'T00:00:00') - new Date(fromIso + 'T00:00:00')) / 86400000);

  // Receivable ageing by days past the due date — one hue, light → dark as it gets older
  const AGE_BUCKETS = [
    { label: 'Not yet due', color: '#bfdbfe' },
    { label: '1–30 days', color: '#60a5fa' },
    { label: '31–60 days', color: '#2563eb' },
    { label: '61–90 days', color: '#1e40af' },
    { label: 'Over 90 days', color: '#172554' }
  ];
  const ageBucket = daysOver => daysOver <= 0 ? 0 : daysOver <= 30 ? 1 : daysOver <= 60 ? 2 : daysOver <= 90 ? 3 : 4;

  const state = {
    tab: 'overview',
    detailsQuery: '',
    balancesQuery: '',
    balancesFilter: 'all',
    expandedId: null,
    customerId: null
  };

  // ══════════════════════════════════════════════════════════════════
  //  Figures
  // ══════════════════════════════════════════════════════════════════
  function getParties() {
    if (typeof getKyaCustomerParties === 'function') return getKyaCustomerParties();
    return typeof getKyaCustomers === 'function' ? getKyaCustomers().slice() : [];
  }
  const isLedgerParty = p => typeof isKyaLedgerParty === 'function' && isKyaLedgerParty(p);

  // Pre Invoice documents, and how each one is previewed
  const PRE_INVOICE_DOCS = [
    { kind: 'quotation', type: 'Quotation', store: 'quotations', noField: 'quoteNo', view: 'viewPrintQuotation' },
    { kind: 'proforma', type: 'Proforma Invoice', store: 'proformaInvoices', noField: 'proformaNo', view: 'viewPrintProforma' },
    { kind: 'order', type: 'Sales Order', store: 'salesOrders', noField: 'orderNo', view: 'viewSalesOrderPreview' },
    { kind: 'challan', type: 'Delivery Challan', store: 'deliveryChallans', noField: 'challanNo', view: 'viewDeliveryChallanPreview' }
  ];
  const isPartyDoc = (v, p) => String(v.customerId) === String(p.id) || (!!p.name && lower(v.customerName) === lower(p.name));

  // Customer statement closing balance (+ = the customer owes); a Trade Receivables ledger
  // party has no statement, so its own ledger is used — advances sit in it directly
  function getNetBalance(p) {
    if (!isLedgerParty(p) && typeof getCustomerStatementData === 'function') {
      const st = getCustomerStatementData(p.id, '', '');
      if (st) return r2(st.closingBalance);
    }
    const name = lower(p.name);
    let bal = parseFloat(p.openingBalance) || 0;
    const entries = (typeof postedEntries !== 'undefined' && Array.isArray(postedEntries)) ? postedEntries : [];
    entries.forEach(e => (e && e.allRows || []).forEach(r => {
      if (lower(r.particular) === name) bal += (parseFloat(r.debit) || 0) - (parseFloat(r.credit) || 0);
    }));
    return r2(bal);
  }

  function summarize(p, today) {
    const docs = (store().salesVouchers || []).filter(v => v && !v.isDraft && !v.isOrder && isPartyDoc(v, p));
    const invoices = docs.filter(v => !v.isReturn);
    const ageing = AGE_BUCKETS.map(() => 0);
    const unpaid = [];
    const invoiceDocs = [];
    let receivable = 0, overdue = 0, lastSale = '';
    invoices.forEach(v => {
      if (v.date && v.date > lastSale) lastSale = v.date;
      const due = typeof getInvoiceOutstanding === 'function' ? getInvoiceOutstanding(v) : 0;
      invoiceDocs.push({ kind: 'invoice', id: v.id, no: v.invoiceNo, date: v.date, dueDate: v.dueDate || '', total: r2(v.total), due: r2(due) });
      if (due <= 0.009) return;
      const dueDate = v.dueDate || v.date || '';
      const daysOver = (dueDate && dueDate < today) ? daysBetween(dueDate, today) : 0;
      receivable += due;
      if (daysOver > 0) overdue += due;
      ageing[ageBucket(daysOver)] += due;
      unpaid.push({ id: v.id, invoiceNo: v.invoiceNo, date: v.date, dueDate, total: r2(v.total), due, daysOver });
    });
    unpaid.sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));

    const credits = typeof getCustomerCreditSources === 'function'
      ? (getCustomerCreditSources(p.id, { partyName: p.name }) || []) : [];
    const sumKinds = kinds => r2(credits.filter(c => kinds.includes(c.kind)).reduce((s, c) => s + (parseFloat(c.available) || 0), 0));
    // Saved Pre Invoice documents for this customer (drafts are kept in their own lists)
    const countDocs = key => (store()[key] || []).filter(d => d && isPartyDoc(d, p)).length;
    const newestFirst = (a, b) => String(b.date || '').localeCompare(String(a.date || '')) || (Number(b.id) || 0) - (Number(a.id) || 0);
    // The ones still open — not completed (invoiced) or cancelled
    const activePreInvoices = [];
    PRE_INVOICE_DOCS.forEach(src => (store()[src.store] || []).forEach(d => {
      if (!d || !isPartyDoc(d, p) || (d.status && d.status !== 'Active')) return;
      activePreInvoices.push({
        kind: src.kind, type: src.type, id: d.id, no: d[src.noField] || '', date: d.date,
        total: r2(d.total), advance: r2(d.advancePaidAmount)
      });
    }));
    const reversalDocs = docs.filter(v => v.isReturn).map(v => ({
      kind: 'reversal', id: v.id, no: v.invoiceNo, date: v.date, total: r2(v.total),
      against: v.returnAgainstInvoice || (v.reversedPreInvoice && v.reversedPreInvoice.no) || ''
    }));

    return {
      party: p,
      isLedger: isLedgerParty(p),
      invoiceCount: invoices.length,
      reversalCount: docs.length - invoices.length,
      invoiceDocs: invoiceDocs.sort(newestFirst),
      activePreInvoices: activePreInvoices.sort(newestFirst),
      reversalDocs: reversalDocs.sort(newestFirst),
      quotationCount: countDocs('quotations'),
      proformaCount: countDocs('proformaInvoices'),
      orderCount: countDocs('salesOrders'),
      challanCount: countDocs('deliveryChallans'),
      lastSale,
      receivable: r2(receivable),
      overdue: r2(overdue),
      ageing: ageing.map(r2),
      unpaid,
      credits,
      refund: sumKinds(['reversal', 'parked']),
      advance: sumKinds(['advance']),
      onAccount: sumKinds(['onaccount']),
      advanceDocs: credits.filter(c => c.kind === 'advance').length,
      net: getNetBalance(p)
    };
  }

  function summarizeAll() {
    const today = todayIso();
    return getParties()
      .map(p => summarize(p, today))
      .sort((a, b) => String(a.party.name || '').localeCompare(String(b.party.name || '')));
  }

  function totalsOf(rows) {
    const t = { receivable: 0, overdue: 0, refund: 0, advance: 0, onAccount: 0, net: 0, ageing: AGE_BUCKETS.map(() => 0), advanceDocs: 0 };
    rows.forEach(s => {
      ['receivable', 'overdue', 'refund', 'advance', 'onAccount', 'net', 'advanceDocs'].forEach(k => { t[k] += s[k]; });
      s.ageing.forEach((v, i) => { t.ageing[i] += v; });
    });
    Object.keys(t).forEach(k => { if (typeof t[k] === 'number') t[k] = r2(t[k]); });
    t.ageing = t.ageing.map(r2);
    return t;
  }

  // ══════════════════════════════════════════════════════════════════
  //  Pieces
  // ══════════════════════════════════════════════════════════════════
  function injectStyles() {
    if ($('kchStyles')) return;
    const s = document.createElement('style');
    s.id = 'kchStyles';
    s.textContent = `
      .kch-wrap { display: flex; flex-direction: column; gap: 18px; container-type: inline-size; }
      .kch-tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      @container (min-width: 720px) { .kch-tiles { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
      @container (max-width: 360px) { .kch-tiles { grid-template-columns: minmax(0, 1fr); } }
      .kch-tile { border: 1.5px solid var(--slate-200); border-radius: 12px; padding: 14px 16px; background: #fff; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
      .kch-tile-label { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--slate-500); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .kch-tile-value { font-size: 20px; font-weight: 800; color: var(--slate-900); font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .kch-tile-note { font-size: 12px; color: var(--slate-500); display: flex; align-items: center; gap: 5px; }
      .kch-alert { color: #b91c1c; font-weight: 600; }
      .kch-panel { border: 1.5px solid var(--slate-200); border-radius: 12px; background: #fff; padding: 16px; min-width: 0; }
      .kch-panel-title { font-size: 13px; font-weight: 700; color: var(--slate-800); }
      .kch-panel-sub { font-size: 12px; color: var(--slate-500); margin: 2px 0 12px; }
      .kch-bar { display: flex; gap: 2px; height: 14px; width: 100%; margin: 4px 0 14px; }
      .kch-bar > span { display: block; height: 100%; min-width: 3px; cursor: default; }
      .kch-bar > span:first-child { border-top-left-radius: 4px; border-bottom-left-radius: 4px; }
      .kch-bar > span:last-child { border-top-right-radius: 4px; border-bottom-right-radius: 4px; }
      .kch-bar-empty { height: 14px; border-radius: 4px; background: var(--slate-100); margin: 4px 0 14px; }
      .kch-legend { display: grid; grid-template-columns: auto 1fr auto auto; gap: 6px 10px; align-items: center; font-size: 12.5px; }
      .kch-swatch { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
      .kch-num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
      .kch-muted { color: var(--slate-400); }
      .kch-meta { font-size: 11.5px; color: var(--slate-500); margin-top: 1px; }
      .kch-ov-table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; }
      .kch-ov-table th { padding: 8px 10px; font-size: 10.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--slate-500); text-align: left; border-bottom: 1.5px solid var(--slate-200); white-space: nowrap; }
      .kch-ov-table th:first-child { width: 40%; }
      .kch-ov-table td { padding: 10px; border-bottom: 1px solid var(--slate-100); color: var(--slate-600); white-space: nowrap; }
      .kch-ov-table tbody tr { cursor: pointer; }
      .kch-ov-table tbody tr:hover td { background: var(--blue-50); }
      .kch-ov-table tbody tr:last-child td { border-bottom: none; }
      .kch-ov-name { display: block; font-weight: 600; color: var(--slate-800); overflow: hidden; text-overflow: ellipsis; }
      .kch-ov-amt { font-weight: 700; color: var(--slate-900) !important; }
      .kch-link.kch-ov-more { display: inline-block; margin-top: 10px; font-size: 12.5px; }
      .kch-empty { padding: 26px 12px; text-align: center; font-size: 13px; color: var(--slate-500); }
      .kch-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      .kch-search { height: 36px; padding: 0 12px; border: 1.5px solid var(--slate-200); border-radius: 8px; font-size: 13px; min-width: 240px; flex: 1; max-width: 360px; font-family: inherit; }
      .kch-search:focus { outline: none; border-color: var(--blue-500); box-shadow: 0 0 0 3px rgba(59,130,246,.12); }
      .kch-chips { display: flex; gap: 6px; flex-wrap: wrap; }
      .kch-chip { height: 30px; padding: 0 11px; border-radius: 999px; border: 1.5px solid var(--slate-200); background: #fff; font-size: 12px; font-weight: 600; color: var(--slate-600); cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 6px; }
      .kch-chip:hover { border-color: var(--slate-300); }
      .kch-chip.active { background: var(--blue-700); border-color: var(--blue-700); color: #fff; }
      .kch-chip .kch-count { font-size: 11px; opacity: .8; }
      .kch-btn { height: 32px; padding: 0 12px; border-radius: 8px; border: 1.5px solid var(--slate-200); background: #fff; font-size: 12px; font-weight: 600; color: var(--slate-700); cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
      .kch-btn:hover { background: var(--slate-50); border-color: var(--slate-300); }
      .kch-btn-primary { background: var(--blue-700); border-color: var(--blue-700); color: #fff; }
      .kch-btn-primary:hover { background: var(--blue-800); border-color: var(--blue-800); }
      .kch-icon-btn { width: 32px; padding: 0; justify-content: center; }
      .kch-table-wrap { border: 1.5px solid var(--slate-200); border-radius: 12px; overflow-x: auto; background: #fff; }
      .kch-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
      .kch-table th { background: var(--slate-50); padding: 10px 8px; font-size: 10.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--slate-600); text-align: left; white-space: nowrap; border-bottom: 1.5px solid var(--slate-200); }
      .kch-table td { padding: 10px 8px; border-bottom: 1px solid var(--slate-100); color: var(--slate-700); vertical-align: middle; }
      .kch-table tbody tr:last-child td { border-bottom: none; }
      .kch-table th.kch-num, .kch-table td.kch-num { text-align: right; white-space: nowrap; }
      .kch-table th:first-child, .kch-table td:first-child { padding-left: 14px; }
      .kch-table th:last-child, .kch-table td:last-child { padding-right: 14px; }
      .kch-table tfoot td { background: var(--slate-50); font-weight: 700; color: var(--slate-800); border-top: 1.5px solid var(--slate-200); border-bottom: none; }
      .kch-row-click { cursor: pointer; }
      .kch-row-click:hover > td { background: var(--blue-50); }
      .kch-row-open > td { background: var(--blue-50); }
      .kch-chev { transition: transform .15s; color: var(--slate-400); }
      .kch-row-open .kch-chev { transform: rotate(90deg); color: var(--blue-600); }
      .kch-detail { padding: 14px 16px 16px; background: #f8fbff; }
      .kch-detail-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
      .kch-section { display: flex; flex-direction: column; gap: 8px; }
      .kch-section-head { display: flex; align-items: center; gap: 8px; }
      .kch-count-pill { display: inline-flex; align-items: center; justify-content: center; min-width: 22px; height: 20px; padding: 0 7px; border-radius: 999px; background: var(--slate-100); color: var(--slate-600); font-size: 11.5px; font-weight: 700; }
      @media (min-width: 1280px) { .kch-detail-grid { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); } }
      .kch-mini { border: 1.5px solid var(--slate-200); border-radius: 10px; background: #fff; overflow-x: auto; }
      .kch-mini-title { padding: 10px 12px; font-size: 12px; font-weight: 700; color: var(--slate-700); border-bottom: 1px solid var(--slate-100); display: flex; justify-content: space-between; gap: 8px; }
      .kch-mini table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
      .kch-mini th { padding: 7px 12px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--slate-500); text-align: left; white-space: nowrap; }
      .kch-mini td { padding: 7px 12px; border-top: 1px solid var(--slate-100); white-space: normal; }
      .kch-mini td.kch-nowrap { white-space: nowrap; }
      .kch-link { background: none; border: none; padding: 0; color: var(--blue-700); font-weight: 600; cursor: pointer; font-family: inherit; font-size: inherit; }
      .kch-link:hover { text-decoration: underline; }
      .kch-note { font-size: 12px; color: var(--slate-500); }
      .kch-tip { position: fixed; z-index: 10200; pointer-events: none; background: #0f172a; color: #fff; font-size: 12px; padding: 7px 10px; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,.18); display: none; white-space: nowrap; }
      .kch-tip strong { font-variant-numeric: tabular-nums; }
    `;
    document.head.appendChild(s);
  }

  const ICONS = {
    plus: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    invoice: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 2h7l4 4v8H3V2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M6 9h4M6 12h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    alert: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="7" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    chev: '<svg class="kch-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"></polyline></svg>'
  };

  // An amount cell: zero shows as a quiet dash so the real balances stand out
  const amt = n => (Math.abs(n) < 0.005) ? '<span class="kch-muted">—</span>' : money(n);
  const netText = n => (Math.abs(n) < 0.005)
    ? '<span class="kch-muted">Nil</span>'
    : `${money(Math.abs(n))} <span style="font-size: 11px; font-weight: 700; color: var(--slate-500);">${n > 0 ? 'Dr' : 'Cr'}</span>`;

  function tile(label, value, note) {
    return `<div class="kch-tile"><div class="kch-tile-label">${label}</div><div class="kch-tile-value">${value}</div><div class="kch-tile-note">${note}</div></div>`;
  }

  // ══════════════════════════════════════════════════════════════════
  //  Overview
  // ══════════════════════════════════════════════════════════════════
  function renderOverview(all) {
    if (!all.length) {
      return `<div class="kch-wrap">
        <div class="kch-panel kch-empty">No customers yet. Create one to start billing.
          <div style="margin-top: 12px;"><button type="button" class="kch-btn kch-btn-primary" data-act="new-customer">${ICONS.plus} New Customer</button></div>
        </div></div>`;
    }
    const t = totalsOf(all);
    const withBalance = all.filter(s => Math.abs(s.net) >= 0.005).length;
    const overdueCount = all.filter(s => s.overdue > 0).length;

    const tiles = `<div class="kch-tiles">
      ${tile('Customers', String(all.length), `${withBalance} with an open balance`)}
      ${tile('Receivable', money(t.receivable), t.overdue > 0
        ? `<span class="kch-alert">${ICONS.alert} ${money(t.overdue)} overdue</span>`
        : 'Nothing overdue')}
      ${tile('Refund Balance', money(t.refund), 'Owed back to customers')}
      ${tile('Advance Received', money(t.advance), t.advanceDocs ? `On ${t.advanceDocs} active pre-invoice${t.advanceDocs > 1 ? 's' : ''}` : 'No advances held')}
    </div>`;

    // Ageing — a stacked bar with its own legend (the legend doubles as the table view)
    const ageTotal = t.ageing.reduce((s, v) => s + v, 0);
    const bar = ageTotal > 0
      ? `<div class="kch-bar" role="img" aria-label="Receivable ageing">${t.ageing.map((v, i) => v > 0
          ? `<span data-tip="${esc(AGE_BUCKETS[i].label)}|${esc(money(v))}|${Math.round(v / ageTotal * 100)}%" style="flex: ${v} 1 0; background: ${AGE_BUCKETS[i].color};"></span>` : '').join('')}</div>`
      : '<div class="kch-bar-empty"></div>';
    const legend = `<div class="kch-legend">${AGE_BUCKETS.map((b, i) => `
        <span class="kch-swatch" style="background: ${b.color};"></span>
        <span style="color: var(--slate-700);">${b.label}${i > 0 ? ' <span class="kch-muted">overdue</span>' : ''}</span>
        <span class="kch-num" style="color: var(--slate-800); font-weight: 600;">${amt(t.ageing[i])}</span>
        <span class="kch-num kch-muted" style="width: 38px;">${ageTotal > 0 && t.ageing[i] > 0 ? Math.round(t.ageing[i] / ageTotal * 100) + '%' : ''}</span>`).join('')}
      </div>`;
    const ageing = `<section class="kch-panel">
      <div class="kch-panel-title">Receivable Ageing</div>
      <div class="kch-panel-sub">Unpaid invoices by days past their due date${overdueCount ? ` · ${overdueCount} customer${overdueCount > 1 ? 's' : ''} overdue` : ''}</div>
      ${bar}${legend}
    </section>`;

    // Two short tables, one line per customer — click a row for its balance in full
    const viewAll = `<button type="button" class="kch-link kch-ov-more" data-act="open-view" data-view="balances">View all customer balances →</button>`;
    const ovTable = (heads, rows, empty) => rows.length
      ? `<table class="kch-ov-table">
          <thead><tr>${heads.map((h, i) => `<th${i ? ' class="kch-num"' : ''}>${h}</th>`).join('')}</tr></thead>
          <tbody>${rows.join('')}</tbody>
        </table>`
      : `<div class="kch-empty">${empty}</div>`;
    const nameCell = s => `<td><span class="kch-ov-name" title="${esc(s.party.name)}">${esc(s.party.name)}</span></td>`;

    const topOwing = all.filter(s => s.receivable > 0).sort((a, b) => b.receivable - a.receivable).slice(0, 5);
    const owingTable = ovTable(['Customer', 'Unpaid Invoices', 'Overdue', 'Receivable'], topOwing.map(s => `
      <tr data-act="open-balance" data-id="${esc(s.party.id)}" title="Open ${esc(s.party.name)}'s balance">
        ${nameCell(s)}
        <td class="kch-num">${s.unpaid.length}</td>
        <td class="kch-num">${s.overdue > 0 ? `<span class="kch-alert">${money(s.overdue)}</span>` : amt(0)}</td>
        <td class="kch-num kch-ov-amt">${money(s.receivable)}</td>
      </tr>`), 'No unpaid invoices.');

    const inCredit = all.map(s => Object.assign({ heldTotal: r2(s.refund + s.advance + s.onAccount) }, s))
      .filter(s => s.heldTotal > 0).sort((a, b) => b.heldTotal - a.heldTotal).slice(0, 5);
    const showOnAccount = inCredit.some(s => s.onAccount > 0);
    const creditTable = ovTable(
      ['Customer', 'Refund Balance', 'Advance'].concat(showOnAccount ? ['On-account'] : [], ['Total Held']),
      inCredit.map(s => `
      <tr data-act="open-balance" data-id="${esc(s.party.id)}" title="Open ${esc(s.party.name)}'s balance">
        ${nameCell(s)}
        <td class="kch-num">${amt(s.refund)}</td>
        <td class="kch-num">${amt(s.advance)}</td>
        ${showOnAccount ? `<td class="kch-num">${amt(s.onAccount)}</td>` : ''}
        <td class="kch-num kch-ov-amt">${money(s.heldTotal)}</td>
      </tr>`), 'No refunds or advances held for customers.');

    return `<div class="kch-wrap">
      ${tiles}
      ${ageing}
      <section class="kch-panel">
        <div class="kch-panel-title">Largest Receivables</div>
        <div class="kch-panel-sub">The customers who owe you the most</div>
        ${owingTable}
        ${topOwing.length ? viewAll : ''}
      </section>
      <section class="kch-panel">
        <div class="kch-panel-title">Credits Held for Customers</div>
        <div class="kch-panel-sub">Money you hold for customers — refunds not yet paid back and advances received</div>
        ${creditTable}
        ${inCredit.length ? viewAll : ''}
      </section>
    </div>`;
  }

  // ══════════════════════════════════════════════════════════════════
  //  Customer Details
  // ══════════════════════════════════════════════════════════════════
  function detailsMatch(s, q) {
    if (!q) return true;
    const p = s.party;
    return [p.name, (p.aliases || []).join(' '), p.gstin, p.pan, p.contactName, p.city, p.state]
      .some(v => lower(v).includes(q));
  }

  // A document number that opens its preview
  const docLink = d => `<button type="button" class="kch-link" data-act="view-doc" data-kind="${d.kind}" data-id="${esc(d.id)}" title="View ${esc(d.no)}">${esc(d.no || '—')}</button>`;

  // ══════════════════════════════════════════════════════════════════
  //  One customer (opened from Customer Details)
  // ══════════════════════════════════════════════════════════════════
  // Their invoices, open pre-invoices and reversals, each with its date — full screen
  function renderCustomerPage(s) {
    if (!s) return '<div class="kch-empty">This customer is no longer in Master Desk.</div>';
    const head = cols => `<thead><tr>${cols.map(c => `<th${c.num ? ' class="kch-num"' : ''}>${c.label}</th>`).join('')}</tr></thead>`;
    const section = (title, docs, cols, row, empty) => `
      <section class="kch-section">
        <div class="kch-section-head"><span class="kch-panel-title">${title}</span><span class="kch-count-pill">${docs.length}</span></div>
        <div class="kch-table-wrap">
          <table class="kch-table">${head(cols)}
            <tbody>${docs.length ? docs.map(row).join('') : `<tr><td colspan="${cols.length}" class="kch-empty">${empty}</td></tr>`}</tbody>
          </table>
        </div>
      </section>`;

    const billed = r2(s.invoiceDocs.reduce((t, d) => t + d.total, 0));
    const advanceHeld = r2(s.activePreInvoices.reduce((t, d) => t + d.advance, 0));
    const reversed = r2(s.reversalDocs.reduce((t, d) => t + d.total, 0));
    const tiles = `<div class="kch-tiles">
      ${tile('Invoices', String(s.invoiceDocs.length), billed > 0 ? `${money(billed)} billed` : 'None yet')}
      ${tile('Balance Due', money(s.receivable), s.overdue > 0 ? `<span class="kch-alert">${ICONS.alert} ${money(s.overdue)} overdue</span>` : 'Nothing overdue')}
      ${tile('Active Pre Invoices', String(s.activePreInvoices.length), advanceHeld > 0 ? `${money(advanceHeld)} advance received` : 'No advance received')}
      ${tile('Reversals', String(s.reversalDocs.length), reversed > 0 ? `${money(reversed)} reversed` : 'None')}
    </div>`;

    const invoices = section('Invoices', s.invoiceDocs,
      [{ label: 'Invoice No.' }, { label: 'Date' }, { label: 'Due Date' }, { label: 'Amount', num: true }, { label: 'Balance Due', num: true }],
      d => `<tr>
        <td>${docLink(d)}</td>
        <td class="kch-nowrap">${dmy(d.date)}</td>
        <td class="kch-nowrap">${d.dueDate ? dmy(d.dueDate) : '<span class="kch-muted">—</span>'}</td>
        <td class="kch-num">${money(d.total)}</td>
        <td class="kch-num">${d.due > 0.009 ? `<strong style="color: var(--slate-800);">${money(d.due)}</strong>` : '<span class="kch-muted">Paid</span>'}</td>
      </tr>`, 'No invoices yet.');

    const preInvoices = section('Active Pre Invoices', s.activePreInvoices,
      [{ label: 'Document' }, { label: 'Number' }, { label: 'Date' }, { label: 'Amount', num: true }, { label: 'Advance Received', num: true }],
      d => `<tr>
        <td>${esc(d.type)}</td>
        <td>${docLink(d)}</td>
        <td class="kch-nowrap">${dmy(d.date)}</td>
        <td class="kch-num">${money(d.total)}</td>
        <td class="kch-num">${amt(d.advance)}</td>
      </tr>`, 'No active quotations, proformas, sales orders or delivery challans.');

    const reversals = section('Reversals', s.reversalDocs,
      [{ label: 'Reversal No.' }, { label: 'Date' }, { label: 'Against' }, { label: 'Amount', num: true }],
      d => `<tr>
        <td>${docLink(d)}</td>
        <td class="kch-nowrap">${dmy(d.date)}</td>
        <td>${d.against ? esc(d.against) : '<span class="kch-muted">—</span>'}</td>
        <td class="kch-num">${money(d.total)}</td>
      </tr>`, 'No reversals.');

    return `<div class="kch-wrap">${tiles}${invoices}${preInvoices}${reversals}</div>`;
  }

  function renderDetails(all) {
    const q = lower(state.detailsQuery);
    const rows = all.filter(s => detailsMatch(s, q));
    // A count: zero stays quiet so the documents that exist stand out
    const count = n => n > 0 ? String(n) : '<span class="kch-muted">0</span>';
    const body = rows.length ? rows.map(s => {
      const p = s.party;
      return `<tr class="kch-row-click" data-act="open-customer" data-id="${esc(p.id)}" title="Open ${esc(p.name)}">
        <td style="min-width: 200px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            ${ICONS.chev}<span style="font-weight: 700; color: var(--slate-800);">${esc(p.name)}</span>
          </div>
          ${p.aliases && p.aliases.length ? `<div class="kch-meta" style="padding-left: 22px;">A.K.A: ${esc(p.aliases.join(', '))}</div>` : ''}
        </td>
        <td class="kch-num">${count(s.invoiceCount)}</td>
        <td class="kch-num">${count(s.quotationCount)}</td>
        <td class="kch-num">${count(s.proformaCount)}</td>
        <td class="kch-num">${count(s.orderCount)}</td>
        <td class="kch-num">${count(s.challanCount)}</td>
        <td class="kch-num">${count(s.reversalCount)}</td>
        <td class="kch-num">${s.lastSale ? dmy(s.lastSale) : '<span class="kch-muted">—</span>'}</td>
      </tr>`;
    }).join('') : `<tr><td colspan="8" class="kch-empty">${all.length ? 'No customer matches your search.' : 'No customers yet.'}</td></tr>`;

    return `<div class="kch-wrap">
      <div class="kch-toolbar">
        <input type="search" class="kch-search" id="kchDetailsSearch" placeholder="Search customer…" value="${esc(state.detailsQuery)}" aria-label="Search customers" />
        <span class="kch-note">${q ? `${rows.length} of ${all.length}` : `${all.length} customer${all.length === 1 ? '' : 's'}`}</span>
      </div>
      <div class="kch-table-wrap">
        <table class="kch-table">
          <thead><tr><th>Customer</th><th class="kch-num">Invoices</th><th class="kch-num">Quotation</th><th class="kch-num">Proforma</th><th class="kch-num">Sales Order</th><th class="kch-num">Delivery Challan</th><th class="kch-num">Reversal</th><th class="kch-num">Last Sale</th></tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </div>`;
  }

  // ══════════════════════════════════════════════════════════════════
  //  Customer Balances
  // ══════════════════════════════════════════════════════════════════
  const BALANCE_FILTERS = [
    { key: 'all', label: 'All', test: () => true },
    { key: 'receivable', label: 'Receivable', test: s => s.receivable > 0 },
    { key: 'overdue', label: 'Overdue', test: s => s.overdue > 0 },
    { key: 'refund', label: 'Refund Balance', test: s => s.refund > 0 },
    { key: 'advance', label: 'Advance', test: s => s.advance > 0 }
  ];

  function renderBalanceDetail(s) {
    const unpaid = s.unpaid.length ? `<table>
        <thead><tr><th>Invoice</th><th>Date</th><th>Due Date</th><th class="kch-num">Total</th><th class="kch-num">Due</th></tr></thead>
        <tbody>${s.unpaid.map(u => `<tr>
          <td><button type="button" class="kch-link" data-act="view-invoice" data-id="${esc(u.id)}" title="View ${esc(u.invoiceNo)}">${esc(u.invoiceNo)}</button></td>
          <td class="kch-nowrap">${dmy(u.date)}</td>
          <td>${dmy(u.dueDate)}${u.daysOver > 0 ? ` <span class="kch-alert" style="font-size: 11px;">· ${u.daysOver} day${u.daysOver > 1 ? 's' : ''} overdue</span>` : ''}</td>
          <td class="kch-num">${money(u.total)}</td>
          <td class="kch-num" style="font-weight: 700; color: var(--slate-800);">${money(u.due)}</td>
        </tr>`).join('')}</tbody></table>`
      : '<div class="kch-empty" style="padding: 16px;">No unpaid invoices.</div>';

    const creditRows = s.credits.filter(c => (parseFloat(c.available) || 0) > 0);
    const credits = creditRows.length ? `<table>
        <thead><tr><th>Source</th><th>Kind</th><th>Date</th><th class="kch-num">Available</th></tr></thead>
        <tbody>${creditRows.map(c => `<tr>
          <td><span style="font-weight: 600; color: var(--slate-800);">${esc(c.docNo === 'Ledger' ? 'Customer ledger' : c.docNo)}</span>${c.note ? `<div class="kch-meta">${esc(c.note)}</div>` : ''}</td>
          <td>${esc(c.kindLabel)}</td>
          <td class="kch-nowrap">${c.date ? dmy(c.date) : '<span class="kch-muted">—</span>'}</td>
          <td class="kch-num" style="font-weight: 700; color: var(--slate-800);">${money(c.available)}</td>
        </tr>`).join('')}</tbody></table>`
      : '<div class="kch-empty" style="padding: 16px;">No refunds, advances or credits held.</div>';

    return `<div class="kch-detail">
      <div class="kch-detail-grid">
        <div class="kch-mini"><div class="kch-mini-title"><span>Unpaid Invoices</span><span>${money(s.receivable)}</span></div>${unpaid}</div>
        <div class="kch-mini"><div class="kch-mini-title"><span>Refunds, Advances &amp; Credits</span><span>${money(s.refund + s.advance + s.onAccount)}</span></div>${credits}</div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 12px; flex-wrap: wrap;">
        <span class="kch-note">A credit can pay an invoice: choose <strong>Invoice Balance</strong> as the Payment Account. A refund can go to unpaid invoices the same way.</span>
        <button type="button" class="kch-btn kch-btn-primary" data-act="new-invoice" data-id="${esc(s.party.id)}">${ICONS.invoice} New Invoice</button>
      </div>
    </div>`;
  }

  function renderBalances(all) {
    const q = lower(state.balancesQuery);
    const searched = all.filter(s => detailsMatch(s, q));
    const filter = BALANCE_FILTERS.find(f => f.key === state.balancesFilter) || BALANCE_FILTERS[0];
    const rows = searched.filter(filter.test);
    const t = totalsOf(rows);

    const chips = BALANCE_FILTERS.map(f => `<button type="button" class="kch-chip${f.key === filter.key ? ' active' : ''}" data-act="filter" data-filter="${f.key}" aria-pressed="${f.key === filter.key}">
        ${f.label}<span class="kch-count">${searched.filter(f.test).length}</span></button>`).join('');

    const body = rows.length ? rows.map(s => {
      const open = String(state.expandedId) === String(s.party.id);
      return `<tr class="kch-row-click${open ? ' kch-row-open' : ''}" data-act="toggle" data-id="${esc(s.party.id)}" aria-expanded="${open}">
          <td style="min-width: 150px;"><div style="display: flex; align-items: center; gap: 8px;">${ICONS.chev}<span style="font-weight: 700; color: var(--slate-800);">${esc(s.party.name)}</span></div></td>
          <td class="kch-num">${amt(s.receivable)}</td>
          <td class="kch-num">${s.overdue > 0 ? `<span class="kch-alert">${money(s.overdue)}</span>` : amt(0)}</td>
          <td class="kch-num">${amt(s.refund)}</td>
          <td class="kch-num">${amt(s.advance)}</td>
          <td class="kch-num">${amt(s.onAccount)}</td>
          <td class="kch-num" style="font-weight: 700; color: var(--slate-800);">${netText(s.net)}</td>
        </tr>${open ? `<tr><td colspan="7" style="padding: 0;">${renderBalanceDetail(s)}</td></tr>` : ''}`;
    }).join('') : `<tr><td colspan="7" class="kch-empty">${all.length ? 'No customer in this view.' : 'No customers yet.'}</td></tr>`;

    const foot = rows.length > 1 ? `<tfoot><tr>
        <td>Total · ${rows.length} customers</td>
        <td class="kch-num">${amt(t.receivable)}</td>
        <td class="kch-num">${t.overdue > 0 ? `<span class="kch-alert">${money(t.overdue)}</span>` : amt(0)}</td>
        <td class="kch-num">${amt(t.refund)}</td>
        <td class="kch-num">${amt(t.advance)}</td>
        <td class="kch-num">${amt(t.onAccount)}</td>
        <td class="kch-num">${netText(t.net)}</td>
      </tr></tfoot>` : '';

    return `<div class="kch-wrap">
      <div class="kch-toolbar">
        <input type="search" class="kch-search" id="kchBalancesSearch" placeholder="Search customer…" value="${esc(state.balancesQuery)}" aria-label="Search customer balances" />
        <div class="kch-chips" role="group" aria-label="Show">${chips}</div>
      </div>
      <div class="kch-table-wrap">
        <table class="kch-table">
          <thead><tr>
            <th>Customer</th>
            <th class="kch-num" title="Unpaid on invoices">Receivable</th>
            <th class="kch-num" title="Unpaid after the due date">Overdue</th>
            <th class="kch-num" title="Reversal credits and Refund Payable not yet refunded or applied">Refund Balance</th>
            <th class="kch-num" title="Advances on active Proforma / Sales Order / Delivery Challan">Advance</th>
            <th class="kch-num" title="Credit in the customer's ledger from receipts or journals">On-account</th>
            <th class="kch-num" title="Customer statement balance">Net Balance</th>
          </tr></thead>
          <tbody>${body}</tbody>
          ${foot}
        </table>
      </div>
      <div class="kch-note">Net Balance is the customer's statement balance — <strong>Dr</strong>: the customer owes you; <strong>Cr</strong>: you owe the customer. It also counts opening balances and journal entries.</div>
    </div>`;
  }

  // ══════════════════════════════════════════════════════════════════
  //  Actions
  // ══════════════════════════════════════════════════════════════════
  function findParty(id) {
    return getParties().find(p => String(p.id) === String(id)) || null;
  }

  // Preview of an invoice / reversal, or of a pre-invoice from its own module
  function viewDoc(kind, id) {
    if (kind === 'invoice' || kind === 'reversal') {
      if (typeof window.viewSalesTaxInvoice === 'function') window.viewSalesTaxInvoice(id);
      return;
    }
    const src = PRE_INVOICE_DOCS.find(x => x.kind === kind);
    if (src && typeof window[src.view] === 'function') window[src.view](id);
  }

  function startInvoiceFor(id) {
    const p = findParty(id);
    if (!p) return;
    currentSalesVoucherSubtype = 'Invoice';
    window._editingSalesInvoice = null;
    if (typeof initSalesForm === 'function') initSalesForm();
    if (typeof populateSalesCustomers === 'function') populateSalesCustomers(p.id);
    const sel = $('salesCustomer');
    if (sel) {
      sel.value = String(p.id);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    $('salesVoucherFormCard')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function newCustomer() {
    if (typeof startSalesPartyCreate !== 'function') return;
    // Master Desk comes back to Sales; the new party is then shown here
    startSalesPartyCreate('ledger', '', {
      onCreated: () => renderSalesCustomersHub('details'),
      onCancelled: () => renderSalesCustomersHub()
    });
  }

  // ── Tooltip for the ageing bar ──
  function tipEl() {
    let el = $('kchTip');
    if (!el) {
      el = document.createElement('div');
      el.id = 'kchTip';
      el.className = 'kch-tip';
      el.setAttribute('role', 'tooltip');
      document.body.appendChild(el);
    }
    return el;
  }
  function showTip(target, e) {
    const [label, value, share] = String(target.dataset.tip || '').split('|');
    const el = tipEl();
    el.innerHTML = `${esc(label)}${label === 'Not yet due' ? '' : ' overdue'} · <strong>${esc(value)}</strong> · ${esc(share)}`;
    el.style.display = 'block';
    const x = Math.min(e.clientX + 12, window.innerWidth - el.offsetWidth - 8);
    el.style.left = `${Math.max(8, x)}px`;
    el.style.top = `${e.clientY - el.offsetHeight - 12}px`;
  }
  function hideTip() {
    const el = $('kchTip');
    if (el) el.style.display = 'none';
  }

  function wireContent(area) {
    if (area._kchWired) return;
    area._kchWired = true;
    area.addEventListener('click', e => {
      const el = e.target.closest('[data-act]');
      if (!el || !area.contains(el)) return;
      const act = el.dataset.act;
      if (act === 'toggle') {
        state.expandedId = String(state.expandedId) === String(el.dataset.id) ? null : el.dataset.id;
        renderSalesCustomersHub('balances');
      } else if (act === 'open-customer') {
        state.customerId = el.dataset.id;
        renderSalesCustomersHub('customer');
      } else if (act === 'view-doc') {
        e.stopPropagation();
        viewDoc(el.dataset.kind, el.dataset.id);
      } else if (act === 'filter') {
        state.balancesFilter = el.dataset.filter;
        renderSalesCustomersHub('balances');
      } else if (act === 'open-balance') {
        state.balancesQuery = '';
        state.balancesFilter = 'all';
        state.expandedId = el.dataset.id;
        renderSalesCustomersHub('balances');
        document.querySelector('#custHubFullContentArea .kch-row-open')?.scrollIntoView({ block: 'center' });
      } else if (act === 'open-view') {
        renderSalesCustomersHub(el.dataset.view);
      } else if (act === 'new-invoice') {
        e.stopPropagation();
        startInvoiceFor(el.dataset.id);
      } else if (act === 'new-customer') {
        newCustomer();
      } else if (act === 'view-invoice') {
        e.stopPropagation();
        if (typeof window.viewSalesTaxInvoice === 'function') window.viewSalesTaxInvoice(el.dataset.id);
      }
    });
    // Searching keeps the cursor in the box while the table below redraws
    area.addEventListener('input', e => {
      const id = e.target && e.target.id;
      if (id !== 'kchDetailsSearch' && id !== 'kchBalancesSearch') return;
      if (id === 'kchDetailsSearch') state.detailsQuery = e.target.value;
      else { state.balancesQuery = e.target.value; state.expandedId = null; }
      const pos = e.target.selectionStart;
      renderSalesCustomersHub(state.tab);
      const again = $(id);
      if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (_) {} }
    });
    area.addEventListener('mousemove', e => {
      const seg = e.target.closest('[data-tip]');
      if (seg && area.contains(seg)) showTip(seg, e); else hideTip();
    });
    area.addEventListener('mouseleave', hideTip);
  }

  const TAB_BUTTONS = {
    overview: 'custHubTabOverview',
    details: 'custHubTabDetails',
    balances: 'custHubTabBalances'
  };

  // Customer Details and Customer Balances open full screen, like the Pre Invoice lists
  const FULL_VIEWS = {
    details: {
      title: 'Customer Details',
      subtitle: 'How many invoices, pre-invoices and reversals each customer has'
    },
    balances: {
      title: 'Customer Balances',
      subtitle: 'What each customer owes, and the refunds and advances held for them — click a customer for the invoices and credits behind it'
    },
    // One customer — its title is the customer's name (set when drawn)
    customer: {
      title: 'Customer',
      subtitle: 'Invoices, active pre-invoices and reversals'
    }
  };
  const NAV_ICONS = {
    details: '<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3.2" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 17c.9-3.2 3.4-4.8 6.5-4.8s5.6 1.6 6.5 4.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    balances: '<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M2.5 8.5h15" stroke="currentColor" stroke-width="1.6"/><path d="M6 12.5h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  };

  // The other full-screen view, as a quick link beside Back (as the Sales Order list does);
  // on one customer's page, a link to that customer's balance
  function renderFullNav(view) {
    const nav = $('custHubFullNavRight');
    if (!nav) return;
    const other = view === 'details' ? 'balances' : 'details';
    const forCustomer = view === 'customer';
    nav.innerHTML = `<button type="button" class="btn" data-view="${forCustomer ? 'balances' : other}"${forCustomer ? ` data-balance-id="${esc(state.customerId)}"` : ''} title="${forCustomer ? 'Open this customer’s balance' : `Open ${FULL_VIEWS[other].title}`}" style="background: var(--slate-50); color: var(--slate-600); border: 1.5px solid var(--slate-200); font-weight: 600; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 12.5px; transition: all 0.2s;" onmouseover="this.style.background='var(--slate-100)'; this.style.color='var(--slate-800)'" onmouseout="this.style.background='var(--slate-50)'; this.style.color='var(--slate-600)'">
        ${NAV_ICONS[forCustomer ? 'balances' : other]}<span>${forCustomer ? 'Customer Balance' : FULL_VIEWS[other].title}</span>
      </button>`;
    if (!nav._kchWired) {
      nav._kchWired = true;
      nav.addEventListener('click', e => {
        const btn = e.target.closest('[data-view]');
        if (!btn) return;
        if (btn.dataset.balanceId) {
          state.balancesQuery = '';
          state.balancesFilter = 'all';
          state.expandedId = btn.dataset.balanceId;
        }
        renderSalesCustomersHub(btn.dataset.view);
      });
    }
  }

  // Draws the Customers module on the chosen view (default: the one last shown). Overview
  // sits in the Customers card with its side tabs; Customer Details and Customer Balances
  // take the whole width, with Back to Customers.
  function renderSalesCustomersHub(tab) {
    injectStyles();
    const wasFull = !!FULL_VIEWS[state.tab];
    const prevTab = state.tab;
    if (tab) state.tab = tab;
    const full = !!FULL_VIEWS[state.tab];
    const hubCard = $('salesCustomersCard');
    const fullCard = $('salesCustomersListCard');
    if (hubCard) hubCard.style.display = full ? 'none' : 'block';
    if (fullCard) fullCard.style.display = full ? 'block' : 'none';

    Object.entries(TAB_BUTTONS).forEach(([key, btnId]) => {
      const btn = $(btnId);
      if (!btn) return;
      if (!btn._kchWired) {
        btn._kchWired = true;
        btn.addEventListener('click', e => { e.preventDefault(); renderSalesCustomersHub(key); });
      }
      const on = key === 'overview';
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    // Back: a customer's page goes back to Customer Details, the lists to Customers
    const backBtn = $('btnCustHubBack');
    if (backBtn && !backBtn._kchWired) {
      backBtn._kchWired = true;
      backBtn.addEventListener('click', e => {
        e.preventDefault();
        renderSalesCustomersHub(state.tab === 'customer' ? 'details' : 'overview');
      });
    }
    // An icon-only button: its tooltip / label says where it goes
    if (backBtn) {
      const backLabel = state.tab === 'customer' ? 'Back to Customer Details' : 'Back to Customers';
      backBtn.title = backLabel;
      backBtn.setAttribute('aria-label', backLabel);
    }

    hideTip();
    const all = summarizeAll();
    if (full) {
      const view = FULL_VIEWS[state.tab];
      const one = state.tab === 'customer' ? all.find(s => String(s.party.id) === String(state.customerId)) : null;
      if ($('custHubFullTitle')) $('custHubFullTitle').textContent = one ? one.party.name : view.title;
      if ($('custHubFullSubtitle')) {
        $('custHubFullSubtitle').textContent = one && one.lastSale ? `${view.subtitle} · Last sale ${dmy(one.lastSale)}` : view.subtitle;
      }
      renderFullNav(state.tab);
      const area = $('custHubFullContentArea');
      if (!area) return;
      wireContent(area);
      area.innerHTML = state.tab === 'details' ? renderDetails(all)
        : (state.tab === 'customer' ? renderCustomerPage(one) : renderBalances(all));
    } else {
      const area = $('custHubContentArea');
      if (!area) return;
      wireContent(area);
      area.innerHTML = renderOverview(all);
    }
    // Opening, leaving or switching a full-screen view starts at the top of it
    if (full !== wasFull || (full && tab && tab !== prevTab)) {
      (full ? fullCard : hubCard)?.scrollIntoView({ block: 'start' });
    }
  }

  window.renderSalesCustomersHub = renderSalesCustomersHub;
  // The Customers button opens on Overview
  window.setSalesCustomersHubTab = tab => { state.tab = tab || 'overview'; };
  window.getSalesCustomerSummaries = summarizeAll;
})();
