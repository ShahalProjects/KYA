/**
 * js/purchase-pre.js
 * Purchase Voucher → Pre Purchase (KYA): the buying-side mirror of Sales → Pre Invoice.
 *  - Pre Purchase card: Pre Purchase List (Active / Completed / Cancelled counts) and the
 *    Purchase Quotation, Purchase Proforma, Purchase Order and Goods Receipt Note tabs
 *  - each document's form, laid out as the Sales Order form: Vendor box (Suppliers /
 *    Ledgers, Create Ledger, ✎ Alter, Vendor Details card with Temporary In-Voucher Edit),
 *    the New Purchase item picker (stock items at cost, expense ledgers), TDS / TCS as per
 *    law (as on New Purchase), Round off, Advance Payment (not on the Quotation) and the
 *    attachment
 *  - each document's list and preview (preinvoice-list.js), ⋮ Select / Make Active
 *    (preinvoice-bulk.js) and PDF / Excel (the Proforma exporters, with vendor labels)
 *  - an advance paid against a document: Dr Advances to Suppliers (a ledger-only vendor:
 *    its own ledger), Cr Cash / Bank — set off against the vendor when the purchase made
 *    from it is posted (purchase-posting.js)
 *  - Convert to Purchase / the Pre Purchase No. box (purchase-pre-picker.js) load a
 *    document into New Purchase (purchase-form.js); it is marked Completed once that
 *    purchase is posted
 */
(function() {
  'use strict';

  const $ = id => document.getElementById(id);
  const r2 = n => Math.round((parseFloat(n) || 0) * 100) / 100;
  const fmt = n => (typeof fmtNum === 'function') ? fmtNum(n) : r2(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const toast = (msg, type) => { if (typeof showToast === 'function') showToast(msg, type); };
  const norm = s => String(s || '').trim().toLowerCase();

  function esc(str) {
    if (typeof ohEsc === 'function') return ohEsc(str);
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function todayIso() {
    if (typeof window.kyaLocalIso === 'function') return window.kyaLocalIso(new Date());
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function addDaysIso(days) {
    const dt = new Date();
    dt.setDate(dt.getDate() + days);
    return (typeof window.kyaLocalIso === 'function') ? window.kyaLocalIso(dt)
      : `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }

  // Amounts typed into the row / round-off boxes may be sums (500+250, 1000*2, 500-10%)
  function parseAmt(str) {
    const clean = (str || '').toString().replace(/,/g, '').trim();
    if (!clean) return 0;
    if (/[\+\-\*\/\%]/.test(clean)) {
      const expr = clean.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
      if (/^[0-9.+\-*/()\s]+$/.test(expr)) {
        try {
          const v = Function(`"use strict"; return (${expr})`)();
          if (typeof v === 'number' && isFinite(v)) return v;
        } catch (e) { /* not a sum — read it as a number */ }
      }
    }
    const v = parseFloat(clean);
    return isNaN(v) ? 0 : v;
  }

  function newRow() {
    return { item: '', hsn: '', qty: 1, unit: '', rate: 0, discount: 0, discountType: 'val', tax: 18, amount: 0 };
  }

  // ══════════════════════════════════════════════════════════════════
  //  THE FOUR DOCUMENTS
  // ══════════════════════════════════════════════════════════════════
  const PURCHASE_SUPPLY_TYPES = ['Intra-State (CGST + SGST)', 'Inter-State (IGST)', 'Import (Customs / Zero-Rated)', 'SEZ With Tax', 'SEZ Without Tax', 'Deemed Export (CGST + SGST)', 'Deemed Export (IGST)'];
  // A document saved as 'Deemed Export' (before the two choices) opens as the CGST + SGST one
  const normSupply = t => (typeof normalizeKyaSupplyType === 'function' ? normalizeKyaSupplyType(t) : t);
  // A Goods Receipt Note records why the goods came in, as a Delivery Challan records why they go out
  const GRN_PURPOSES = ['Goods Received for Purchase', 'Received on Approval', 'Job Work / Processing Return', 'Stock / Location Transfer', 'Received for Exhibition / Demo', 'Others'];

  const ICONS = {
    quotation: s => `<svg width="${s}" height="${s}" viewBox="0 0 20 20" fill="none"><path d="M4 4h12v12H4z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M7 8h6M7 12h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    proforma: s => `<svg width="${s}" height="${s}" viewBox="0 0 20 20" fill="none"><path d="M5 2h10a1 1 0 011 1v14l-3-2-3 2-3-2-3 2V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 7h4M8 11h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    order: s => `<svg width="${s}" height="${s}" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M7 7h6M7 10h6M7 13h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="14" cy="13" r="1" fill="currentColor"/></svg>`,
    grn: s => `<svg width="${s}" height="${s}" viewBox="0 0 20 20" fill="none"><path d="M1 4h11v9H1z" stroke="currentColor" stroke-width="1.6"/><path d="M12 7h4l3 3v3h-7V7z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="4.5" cy="15.5" r="1.5" stroke="currentColor" stroke-width="1.6"/><circle cx="15.5" cy="15.5" r="1.5" stroke="currentColor" stroke-width="1.6"/></svg>`
  };

  const DOCS = [
    {
      key: 'quotation', P: 'ppQuote', C: 'PpQuote', code: 'PQT', short: 'Quotation',
      kind: 'Purchase Quotation', plural: 'Purchase Quotations', noun: 'purchase quotation',
      numberKind: 'purchaseQuotation', storeKey: 'purchaseQuotations', draftsKey: 'purchaseQuotationsDrafts',
      subtitle: 'Record supplier quotations and price offers',
      listSubtitle: 'Create and manage supplier quotations and price offers',
      overviewDesc: 'Supplier quotations, price offers and estimates',
      dateField: 'expiryDate', secondLabel: 'Expiry Date', secondDays: 30,
      noLabel: 'Quotation No.', vendorLabel: 'Vendor / Supplier *', supplyLabel: 'Supply Type *', execLabel: 'Purchaser / Executive',
      notesLabel: 'Terms & Conditions', notesPlaceholder: 'Quotation validity, price terms, delivery terms, supplier reference...',
      advance: false, attachment: false, saveLabel: 'Save Quotation',
      forLabel: 'Quotation From:', previewDateLabel: 'Quotation Date:', preparedLabel: 'Purchaser:',
      emptyText: "Record the quotations your suppliers send to compare prices, then convert the one you accept into a purchase.",
      defaultNotes: 'Prices as quoted by the supplier, valid until the expiry date.',
      footerText: 'This is a supplier quotation. Generated by KYA Accounting Suite.',
      moduleName: 'Purchase Quotation Module',
      overview: { bg: '#eff6ff', color: 'var(--blue-600)' }, chip: { color: '#1d4ed8', bg: '#eff6ff' },
      pdf: { title: 'PURCHASE QUOTATION', forLabel: 'QUOTATION FROM:', dateLabel: 'Quotation Date:', fallbackSub: 'Supplier Quotation', footer: 'Purchase Quotation', filePrefix: 'Purchase_Quotation', acceptLabel: 'Supplier Acceptance' },
      excel: { title: 'PURCHASE QUOTATION', sheetName: 'Purchase_Quotation', noLabel: 'Quotation #', forLabel: 'Quotation From', filePrefix: 'Purchase_Quotation', footer: 'Purchase Quotation' },
      api: { openList: 'openPurchaseQuotationList', closeList: 'closePurchaseQuotationList', view: 'viewPurchaseQuotation', markCompleted: 'markPurchaseQuotationCompleted', convert: 'convertPurchaseQuotationToPurchase' }
    },
    {
      key: 'proforma', P: 'ppProforma', C: 'PpProforma', code: 'PPI', short: 'Proforma',
      kind: 'Purchase Proforma', plural: 'Purchase Proformas', noun: 'purchase proforma',
      numberKind: 'purchaseProforma', storeKey: 'purchaseProformas', draftsKey: 'purchaseProformasDrafts',
      subtitle: 'Record supplier proforma invoices and advance payments',
      listSubtitle: 'Create and manage supplier proforma invoices and advances paid',
      overviewDesc: 'Supplier proforma invoices and advance payments',
      dateField: 'expiryDate', secondLabel: 'Valid Until', secondDays: 30,
      noLabel: 'Proforma No.', vendorLabel: 'Vendor / Supplier *', supplyLabel: 'Supply Type *', execLabel: 'Purchaser / Executive',
      notesLabel: 'Terms & Conditions', notesPlaceholder: 'Payment milestones, advance terms, delivery terms...',
      advance: true, attachment: true, saveLabel: 'Save Proforma',
      forLabel: 'Proforma From:', previewDateLabel: 'Proforma Date:', preparedLabel: 'Purchaser:',
      emptyText: "Record your suppliers' proforma invoices and the advances paid against them, then convert them into purchases.",
      defaultNotes: 'Provisional invoice from the supplier; the final bill follows on delivery.',
      footerText: 'This is a supplier proforma invoice, not a tax invoice. Generated by KYA Accounting Suite.',
      moduleName: 'Purchase Proforma Module',
      overview: { bg: '#faf5ff', color: '#9333ea' }, chip: { color: '#7e22ce', bg: '#faf5ff' },
      pdf: { title: 'PURCHASE PROFORMA', forLabel: 'PROFORMA FROM:', dateLabel: 'Proforma Date:', fallbackSub: 'Supplier Proforma Invoice', footer: 'Purchase Proforma', filePrefix: 'Purchase_Proforma', acceptLabel: 'Supplier Acceptance' },
      excel: { title: 'PURCHASE PROFORMA', sheetName: 'Purchase_Proforma', noLabel: 'Proforma #', forLabel: 'Proforma From', filePrefix: 'Purchase_Proforma', footer: 'Purchase Proforma' },
      api: { openList: 'openPurchaseProformaList', closeList: 'closePurchaseProformaList', view: 'viewPurchaseProforma', markCompleted: 'markPurchaseProformaCompleted', convert: 'convertPurchaseProformaToPurchase' }
    },
    {
      key: 'order', P: 'ppOrder', C: 'PpOrder', code: 'PO', short: 'Order',
      kind: 'Purchase Order', plural: 'Purchase Orders', noun: 'purchase order',
      numberKind: 'purchaseOrder', storeKey: 'purchaseOrders', draftsKey: 'purchaseOrdersDrafts',
      subtitle: 'Raise purchase orders to suppliers with delivery schedules',
      listSubtitle: 'Create and manage purchase orders placed with suppliers',
      overviewDesc: 'Confirmed orders placed with suppliers',
      dateField: 'deliveryDate', secondLabel: 'Delivery Date', secondDays: 30,
      noLabel: 'Order No.', vendorLabel: 'Vendor / Supplier *', supplyLabel: 'Supply Type *', execLabel: 'Purchaser / Executive',
      notesLabel: 'Terms & Conditions', notesPlaceholder: 'Delivery schedule, shipping instructions, supplier quotation reference...',
      advance: true, attachment: true, saveLabel: 'Save Purchase Order',
      forLabel: 'Order To:', previewDateLabel: 'Order Date:', preparedLabel: 'Purchaser:',
      emptyText: 'Raise purchase orders to track what is still to be received, what has been billed, and cancellations.',
      defaultNotes: 'Please supply the goods / services as per this order and the agreed schedule.',
      footerText: 'This is a purchase order. Generated by KYA Accounting Suite.',
      moduleName: 'Purchase Order Module',
      overview: { bg: '#fff7ed', color: '#ea580c' }, chip: { color: '#c2410c', bg: '#fff7ed' },
      pdf: { title: 'PURCHASE ORDER', forLabel: 'ORDER TO:', dateLabel: 'Order Date:', fallbackSub: 'Purchase Order', footer: 'Purchase Order', filePrefix: 'Purchase_Order', acceptLabel: 'Supplier Acceptance' },
      excel: { title: 'PURCHASE ORDER', sheetName: 'Purchase_Order', noLabel: 'Order #', forLabel: 'Order To', filePrefix: 'Purchase_Order', footer: 'Purchase Order' },
      api: { openList: 'openPurchaseOrderList', closeList: 'closePurchaseOrderList', view: 'viewPurchaseOrder', markCompleted: 'markPurchaseOrderCompleted', convert: 'convertPurchaseOrderToPurchase' }
    },
    {
      key: 'grn', P: 'ppGrn', C: 'PpGrn', code: 'GRN', short: 'GRN', isGrn: true,
      kind: 'Goods Receipt Note', plural: 'Goods Receipt Notes', noun: 'goods receipt note',
      numberKind: 'goodsReceipt', storeKey: 'goodsReceiptNotes', draftsKey: 'goodsReceiptNotesDrafts',
      subtitle: 'Record goods received from suppliers against their delivery challan',
      listSubtitle: 'Create and manage goods received from suppliers',
      overviewDesc: 'Goods received from suppliers and inward challans',
      dateField: 'receivedDate', secondLabel: 'Received Date', secondDays: 0,
      noLabel: 'GRN No.', vendorLabel: 'Vendor / Consignor *', supplyLabel: 'Purpose / Supply Type *', execLabel: 'Received By / Executive',
      notesLabel: 'Transport Notes / Terms', notesPlaceholder: "Vehicle no., transporter, supplier's challan no., condition of goods...",
      advance: true, attachment: true, saveLabel: 'Save GRN',
      forLabel: 'Received From:', previewDateLabel: 'GRN Date:', preparedLabel: 'Received By:', supplyPreviewLabel: 'Purpose:',
      emptyText: "Record the goods your suppliers deliver against their delivery challan, then convert the note into a purchase once the bill comes.",
      defaultNotes: 'Goods received in good condition, subject to inspection.',
      footerText: 'This is a goods receipt note. Generated by KYA Accounting Suite.',
      moduleName: 'Goods Receipt Note Module',
      overview: { bg: '#ecfdf5', color: '#059669' }, chip: { color: '#047857', bg: '#ecfdf5' },
      pdf: { title: 'GOODS RECEIPT NOTE', forLabel: 'RECEIVED FROM:', dateLabel: 'GRN Date:', fallbackSub: 'Goods Receipt Note', footer: 'Goods Receipt Note', filePrefix: 'Goods_Receipt_Note', acceptLabel: 'Received By' },
      excel: { title: 'GOODS RECEIPT NOTE', sheetName: 'Goods_Receipt_Note', noLabel: 'GRN #', forLabel: 'Received From', filePrefix: 'Goods_Receipt_Note', footer: 'Goods Receipt Note' },
      api: { openList: 'openGoodsReceiptNoteList', closeList: 'closeGoodsReceiptNoteList', view: 'viewGoodsReceiptNote', markCompleted: 'markGoodsReceiptNoteCompleted', convert: 'convertGoodsReceiptNoteToPurchase' }
    }
  ];
  DOCS.forEach(d => { d.icon = ICONS[d.key]; });
  const docOf = key => DOCS.find(d => d.key === key) || null;

  function store() {
    window.KYA_STORE = window.KYA_STORE || {};
    DOCS.forEach(d => {
      window.KYA_STORE[d.storeKey] = window.KYA_STORE[d.storeKey] || [];
      window.KYA_STORE[d.draftsKey] = window.KYA_STORE[d.draftsKey] || [];
    });
    return window.KYA_STORE;
  }

  // ══════════════════════════════════════════════════════════════════
  //  VENDORS — Master Desk suppliers, then ledgers under Trade Payables (as New Purchase)
  // ══════════════════════════════════════════════════════════════════
  function isLedgerVendor(p) {
    return !!p && p.type === 'ledger' && p.sgId === 'sg-tp';
  }

  function getPrePurchaseVendors() {
    const out = [];
    const seen = new Set();
    (typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : []).forEach(s => {
      out.push(s);
      seen.add(norm(s.name));
    });
    (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers) ? coaLedgers : []).forEach(l => {
      const key = norm(l.name);
      if (!isLedgerVendor(l) || !key || key === 'trade payables' || seen.has(key)) return;
      seen.add(key);
      out.push(l);
    });
    return out;
  }

  function findVendor(id) {
    if (id === null || id === undefined || id === '') return null;
    return getPrePurchaseVendors().find(p => String(p.id) === String(id)) || null;
  }

  function companyState() {
    const co = (typeof getKyaCompanyProfile === 'function') ? (getKyaCompanyProfile() || {}) : {};
    return co.state || 'Kerala';
  }

  // GST supply type from the vendor's state: another state is an inter-state supply
  function supplyTypeForVendor(party) {
    if (!party || !party.state) return '';
    return norm(party.state) !== norm(companyState()) ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)';
  }

  // ══════════════════════════════════════════════════════════════════
  //  ADVANCE PAID — Dr Advances to Suppliers (or the ledger-only vendor's own ledger),
  //  Cr Cash / Bank (each Multi Payment account)
  // ══════════════════════════════════════════════════════════════════
  function getPurchaseAdvanceLedgerName(vendorId) {
    const party = findVendor(vendorId);
    if (isLedgerVendor(party)) return party.name;
    const ledgers = (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) ? coaLedgers : [];
    const id = (typeof getOrCreateSystemLedger === 'function') ? getOrCreateSystemLedger('Advances to Suppliers', 'sg-stla') : null;
    const l = ledgers.find(x => x.id == id) || ledgers.find(x => norm(x.name) === 'advances to suppliers');
    return l ? l.name : 'Advances to Suppliers';
  }

  // Posts, or re-posts in place, the advance paid against a Pre Purchase document. The
  // entry's id, voucher no and amount are kept on `doc` so later saves update the same entry.
  function postPurchasePreAdvanceEntry(doc, amount, payRows, d) {
    if (typeof postedEntries === 'undefined' || !(amount > 0) || !payRows || !payRows.length) return;
    const party = findVendor(doc.vendorId);
    const vendorName = (party && party.name) || doc.vendorName || 'Supplier';
    let voucherNo = doc.advanceVoucherNo;
    if (!voucherNo || !String(voucherNo).startsWith('JV-')) {
      voucherNo = (typeof getNextJournalVoucherNo === 'function')
        ? getNextJournalVoucherNo(doc.date)
        : `JV-${String(doc.date || '').slice(0, 4) || new Date().getFullYear()}-001`;
    }
    const entryId = doc.advanceJournalEntryId || Date.now();
    const debitName = getPurchaseAdvanceLedgerName(doc.vendorId);

    const rows = [{ id: 1, type: 'By', particular: debitName, debit: r2(amount).toFixed(2), credit: '' }];
    payRows.forEach((p, i) => rows.push({ id: i + 2, type: 'To', particular: p.name, debit: '', credit: r2(p.amount).toFixed(2) }));

    const entry = {
      id: entryId,
      date: doc.date,
      voucherNo,
      preparedBy: d.moduleName,
      departmentId: '',
      isBudget: false,
      firstParticular: debitName,
      amount: fmt(amount),
      allRows: rows,
      narration: `Advance paid to ${vendorName} against ${d.kind} No. ${doc.docNo} (${doc.paymentStatus}). ${doc.narration || ''}`.trim(),
      jeType: 'advance_payment',
      vendorId: doc.vendorId,
      vendorName,
      partyName: vendorName,
      sourceDocNo: doc.docNo,
      sourceDocKind: d.key,
      sourceDocId: doc.id
    };
    const idx = postedEntries.findIndex(e => String(e.id) === String(entryId));
    if (idx > -1) postedEntries[idx] = entry;
    else postedEntries.unshift(entry);
    window.postedEntries = postedEntries;

    doc.advanceJournalEntryId = entryId;
    doc.advanceVoucherNo = voucherNo;
    doc.advancePaidAmount = r2(amount);
  }

  function postAdvanceFor(d, doc, amount) {
    const payRows = (typeof getPreInvoiceAdvanceReceiptRows === 'function') ? getPreInvoiceAdvanceReceiptRows(doc, amount) : [];
    postPurchasePreAdvanceEntry(doc, amount, payRows, d);
  }

  function removeAdvance(doc) {
    if (typeof removePreInvoiceAdvanceEntry === 'function') { removePreInvoiceAdvanceEntry(doc); return; }
    if (doc.advanceJournalEntryId && typeof postedEntries !== 'undefined') {
      postedEntries = postedEntries.filter(e => String(e.id) !== String(doc.advanceJournalEntryId));
      window.postedEntries = postedEntries;
    }
    doc.advanceJournalEntryId = null;
    doc.advanceVoucherNo = null;
    doc.advancePaidAmount = 0;
  }

  // ══════════════════════════════════════════════════════════════════
  //  CARDS — the Purchase Voucher tab swaps between New Purchase and the Pre Purchase cards
  // ══════════════════════════════════════════════════════════════════
  const CARD_IDS = ['purchaseVoucherFormCard', 'purchasePreCard'];
  DOCS.forEach(d => CARD_IDS.push(`${d.P}ListCard`, `${d.P}FormCard`));

  // 'new' (New Purchase), 'pre' (Pre Purchase) or 'return' (Reversal) — the active header button
  function setHeaderMode(mode) {
    const newBtn = $('btnNewPurchase');
    const preBtn = $('btnPurchasePre');
    const returnBtn = $('btnPurchaseReturn');
    const active = btn => {
      if (!btn) return;
      btn.className = 'btn btn-primary';
      btn.style.background = 'var(--blue-700)';
      btn.style.color = '#fff';
      btn.style.borderColor = 'var(--blue-700)';
    };
    const inactive = btn => {
      if (!btn) return;
      btn.className = 'btn-sales-action';
      btn.style.background = 'var(--white)';
      btn.style.color = 'var(--slate-600)';
      btn.style.borderColor = 'var(--slate-200)';
    };
    [[newBtn, 'new'], [preBtn, 'pre'], [returnBtn, 'return']].forEach(([btn, m]) => {
      if (m === mode) active(btn);
      else inactive(btn);
    });
  }

  function showPurchasePreCard(cardId) {
    CARD_IDS.forEach(id => {
      const el = $(id);
      if (el) el.style.display = (id === cardId) ? 'block' : 'none';
    });
    if (typeof hidePartyHoverCard === 'function') hidePartyHoverCard();
    // The form is New Purchase or, in reversal mode, Reversal
    const formMode = (typeof window.isPurchaseReturnMode === 'function' && window.isPurchaseReturnMode()) ? 'return' : 'new';
    setHeaderMode(cardId === 'purchaseVoucherFormCard' ? formMode : 'pre');
  }

  // New Purchase's form (it may be hidden behind a Pre Purchase card)
  function showPurchaseFormCard() {
    showPurchasePreCard('purchaseVoucherFormCard');
  }

  // ══════════════════════════════════════════════════════════════════
  //  MARKUP — built here, as the Sales Pre Invoice cards are written in index.html
  // ══════════════════════════════════════════════════════════════════
  const ICON_BACK = '<svg viewBox="0 0 20 20" fill="none" width="18" height="18" aria-hidden="true"><path d="M12.5 15l-5-5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON_LIST = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>';
  const ICON_CAL = s => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`;
  const ICON_PENCIL = s => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`;
  const NAV_BTN_STYLE = "background: var(--slate-50); color: var(--slate-600); border: 1.5px solid var(--slate-200); font-weight: 600; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 12.5px; transition: all 0.2s;";
  const NAV_BTN_HOVER = `onmouseover="this.style.background='var(--slate-100)'; this.style.color='var(--slate-800)'" onmouseout="this.style.background='var(--slate-50)'; this.style.color='var(--slate-600)'"`;

  function dateFieldHtml(id, label, aria, after, afterLabel) {
    return `
            <div class="je-field">
              <label for="${id}Display">${label}</label>
              <input type="hidden" id="${id}" data-kya-date-display="${id}Display"${after ? ` data-kya-date-after="${after}" data-kya-date-label="${afterLabel}"` : ''} />
              <div class="kya-dp-wrap">
                <input type="text" id="${id}Display" class="je-input" inputmode="numeric" maxlength="10" placeholder="DD-MM-YYYY" aria-label="${aria} (DD-MM-YYYY)" />
                <button type="button" class="kya-dp-icon" tabindex="-1" aria-label="Open calendar" title="Open calendar">${ICON_CAL(16)}</button>
              </div>
            </div>`;
  }

  function hubHtml() {
    const tab = (id, label, icon, active) => `
              <button class="oh-sub-tab${active ? ' active' : ''}" id="${id}" role="tab" aria-selected="${active ? 'true' : 'false'}" aria-controls="ppContentArea">
                <div class="oh-tab-icon-wrap">${icon}</div>
                <span class="oh-tab-text">${label}</span>
              </button>`;
    const listIcon = '<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M7 6h6M7 10h6M7 14h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    return `
        <!-- PRE PURCHASE (KeepOne UI) — purchase-pre.js -->
        <div class="table-card" id="purchasePreCard" style="display: none; padding: 24px 28px;">
          <div class="je-card-header" style="background: linear-gradient(90deg, var(--blue-700), var(--blue-500)); border-top-left-radius: 12px; border-top-right-radius: 12px; margin: -24px -28px 20px -28px; padding: 18px 28px; display: flex; align-items: center; justify-content: space-between;">
            <div class="je-card-header-left" style="display: flex; align-items: center; gap: 12px;">
              <div class="je-card-icon-wrap" style="background: rgba(255, 255, 255, 0.15); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px; color: var(--white);"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <div>
                <div class="je-card-title-text" style="color: var(--white); font-weight: 700; font-size: 16px; margin: 0;">Pre Purchase</div>
                <div class="je-card-subtitle-text" style="color: rgba(255, 255, 255, 0.8); font-size: 12px; margin: 2px 0 0 0;">Purchase Quotations, Proforma, Purchase Orders &amp; Goods Receipt Notes</div>
              </div>
            </div>
          </div>
          <div class="oh-layout">
            <div class="oh-sub-tabs" role="tablist" aria-label="Pre Purchase sections">
              ${tab('ppTabOverview', 'Pre Purchase List', listIcon, true)}
              ${DOCS.map(d => tab(`ppTab${d.C}`, d.kind, d.icon(16), false)).join('')}
            </div>
            <div class="oh-content-area" id="ppContentArea"></div>
          </div>
        </div>`;
  }

  function listCardHtml(d) {
    return `
        <!-- ${d.kind.toUpperCase()} LIST CARD (filled by preinvoice-list.js) -->
        <div class="table-card" id="${d.P}ListCard" style="display: none; padding: 24px 28px;">
          <div class="je-card-header" style="background: linear-gradient(90deg, var(--blue-700), var(--blue-500)); border-top-left-radius: 12px; border-top-right-radius: 12px; margin: -24px -28px 20px -28px; padding: 18px 28px; display: flex; align-items: center; justify-content: space-between;">
            <div class="je-card-header-left" style="display: flex; align-items: center; gap: 12px;">
              <div class="je-card-icon-wrap" style="background: rgba(255, 255, 255, 0.15); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 8px; color: var(--white);">${d.icon(20)}</div>
              <div>
                <div class="je-card-title-text" style="color: var(--white); font-weight: 700; font-size: 16px; margin: 0;">${d.kind}</div>
                <div class="je-card-subtitle-text" style="color: rgba(255, 255, 255, 0.8); font-size: 12px; margin: 2px 0 0 0;">${d.listSubtitle}</div>
              </div>
            </div>
            <!-- ⋮ Select / Make Active (preinvoice-bulk.js) -->
            <div id="${d.P}ListMoreSlot"></div>
          </div>
          <div class="quote-nav-bar" style="margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 280px;">
              <button type="button" class="kya-back-btn" data-pp-list-back="${d.key}" title="Back to Pre Purchase" aria-label="Back to Pre Purchase">${ICON_BACK}</button>
              <div id="${d.P}ListSearchSlot" style="flex: 1; max-width: 560px; min-width: 0;"></div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              ${DOCS.filter(o => o !== d).map(o => `
              <button type="button" class="btn" data-pp-open-list="${o.key}" title="Open ${o.kind}" style="${NAV_BTN_STYLE}" ${NAV_BTN_HOVER}>${o.icon(14)}<span>${o.kind}</span></button>`).join('')}
            </div>
          </div>
          <div id="${d.P}ListFullContentArea"></div>
        </div>`;
  }

  function advanceBoxHtml(d) {
    const P = d.P;
    return `
              <!-- Advance Payment (the same box as the Sales Pre Invoice forms) -->
              <div style="background: var(--white); border: 1.5px solid var(--slate-100); padding: 14px; border-radius: 12px; display: flex; flex-direction: column; gap: 8px; flex-shrink: 0;">
                <div style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
                  <label id="${P}PaymentStatusLabel" style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: var(--slate-400); letter-spacing: 0.05em; margin: 0;">Advance Payment</label>
                </div>
                <div style="display: flex; gap: 10px; align-items: flex-start; width: 100%;">
                  <div id="${P}DueDateField" style="flex: 0 0 158px; display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-weight: 700; font-size: 10px; text-transform: uppercase; color: var(--slate-400); margin: 0;">Due Date</label>
                    <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px; width: 100%;">
                      <input type="hidden" id="${P}DueDate" data-kya-date-display="${P}DueDateDisplay" data-kya-date-after="${P}Date" data-kya-date-label="Due Date" />
                      <div class="kya-dp-wrap" style="width: 100%;">
                        <input type="text" id="${P}DueDateDisplay" class="je-input" inputmode="numeric" maxlength="10" placeholder="DD-MM-YYYY" aria-label="Due date (DD-MM-YYYY)" style="height: 38px; padding: 0 36px 0 10px; font-size: 13px; font-weight: 600;" />
                        <button type="button" class="kya-dp-icon" tabindex="-1" aria-label="Open calendar" title="Open calendar" style="width: 26px; height: 26px; right: 5px;">${ICON_CAL(14)}</button>
                      </div>
                      <span id="${P}DueDateDays" style="font-size: 12px; font-weight: 600; color: var(--slate-500); white-space: nowrap;"></span>
                    </div>
                  </div>
                  <div id="${P}PaymentAmountField" style="display: flex; flex: 1.2; min-width: 0; flex-direction: column; gap: 4px;">
                    <label style="font-weight: 700; font-size: 10px; text-transform: uppercase; color: var(--slate-400); margin: 0;">Advance Amount</label>
                    <input type="number" id="${P}PaymentAmount" class="je-input" placeholder="0.00" min="0" step="0.01" style="height: 38px; padding: 0 10px; font-size: 13px; font-weight: 600; width: 100%;" />
                  </div>
                  <div id="${P}PaymentAccountField" style="display: flex; flex: 1.6; min-width: 0; flex-direction: column; gap: 4px;">
                    <label style="font-weight: 700; font-size: 10px; text-transform: uppercase; color: var(--slate-400); margin: 0;">Payment Account *</label>
                    <select id="${P}PaymentAccount" class="je-input" style="height: 38px; padding: 0 10px; font-size: 13px; font-weight: 600; cursor: pointer; width: 100%;"></select>
                    <button type="button" id="${P}MultiPaymentSummary" title="Edit the multi payment split" style="display: none; align-items: center; justify-content: space-between; gap: 8px; width: 100%; padding: 5px 9px; background: var(--slate-50); border: 1.5px solid var(--slate-200); border-radius: 8px; font-size: 11.5px; font-weight: 700; color: var(--slate-600); cursor: pointer; text-align: left;"></button>
                  </div>
                </div>
              </div>`;
  }

  function attachmentHtml(d) {
    const P = d.P;
    return `
                <!-- Document Upload Section under Total -->
                <div class="sales-doc-upload-wrap" style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--slate-200);">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <label for="${P}DocFileInput" style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--slate-400); letter-spacing: 0.05em; margin: 0; display: flex; align-items: center; gap: 5px; cursor: pointer;">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                      Upload Document / Attachment
                    </label>
                    <span id="${P}DocStatusBadge" style="display: none; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #ecfdf5; color: #059669; text-transform: uppercase;">Attached</span>
                  </div>
                  <input type="file" id="${P}DocFileInput" style="display: none;" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv,.zip" />
                  <div id="${P}DocDropzone" style="border: 1.5px dashed var(--slate-300); border-radius: 10px; padding: 10px 12px; text-align: center; background: var(--slate-50); cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='var(--blue-400)'; this.style.background='var(--blue-50)'" onmouseout="this.style.borderColor='var(--slate-300)'; this.style.background='var(--slate-50)'">
                    <div id="${P}DocEmptyState" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                      <div style="width: 26px; height: 26px; border-radius: 50%; background: #ffffff; border: 1px solid var(--slate-200); display: flex; align-items: center; justify-content: center; color: var(--blue-600); flex-shrink: 0;">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      </div>
                      <div style="display: flex; flex-direction: column; align-items: flex-start; text-align: left;">
                        <span style="font-size: 12px; font-weight: 600; color: var(--slate-700);">Click to Choose File</span>
                        <span style="font-size: 10px; color: var(--slate-400);">PDF, Image, Excel, Word (Max 10MB)</span>
                      </div>
                    </div>
                    <div id="${P}DocSelectedState" style="display: none; align-items: center; justify-content: space-between; gap: 8px;">
                      <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
                        <div id="${P}DocFileIcon" style="width: 26px; height: 26px; border-radius: 6px; background: #dbeafe; color: #1e40af; font-size: 9px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; text-transform: uppercase;">PDF</div>
                        <div style="display: flex; flex-direction: column; align-items: flex-start; overflow: hidden; text-align: left;">
                          <span id="${P}DocFileName" style="font-size: 12px; font-weight: 700; color: var(--slate-800); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">doc.pdf</span>
                          <span id="${P}DocFileSize" style="font-size: 10px; color: var(--slate-500); font-weight: 500;">0 KB</span>
                        </div>
                      </div>
                      <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                        <a id="${P}DocPreviewBtn" target="_blank" style="padding: 3px 7px; font-size: 11px; font-weight: 600; color: var(--blue-600); background: #eff6ff; border-radius: 5px; text-decoration: none;" title="Download / View document">View</a>
                        <button id="${P}DocRemoveBtn" type="button" style="background: none; border: none; color: var(--red-600); cursor: pointer; padding: 3px; border-radius: 4px; display: flex; align-items: center;" title="Remove document">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>`;
  }

  function formCardHtml(d) {
    const P = d.P, C = d.C;
    const options = (d.isGrn ? GRN_PURPOSES : PURCHASE_SUPPLY_TYPES).map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('');
    return `
        <!-- ${d.kind.toUpperCase()} FORM CARD -->
        <div class="je-form-card" id="${P}FormCard" style="display: none;">
          <div class="je-card-header" style="background: linear-gradient(90deg, var(--blue-700), var(--blue-500));">
            <div class="je-card-header-left">
              <div class="je-card-icon" aria-hidden="true">${d.icon(20)}</div>
              <div>
                <div class="je-card-title-text">${d.kind}</div>
                <div class="je-card-subtitle-text">${d.subtitle}</div>
              </div>
            </div>
            <div class="je-card-header-right">
              <div class="je-voucher-chip" id="${P}ChipDisplay">${d.code}-${new Date().getFullYear()}-001</div>
            </div>
          </div>

          <div class="quote-nav-bar" style="padding: 16px 28px 4px 28px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <button type="button" class="kya-back-btn" id="btn${C}Back" title="Back to Pre Purchase" aria-label="Back to Pre Purchase">${ICON_BACK}</button>
              <button type="button" class="btn" id="btn${C}ViewList" title="View ${d.kind} List" style="background: var(--slate-100); color: var(--blue-700); border: 1.5px solid var(--slate-200); font-weight: 600; display: inline-flex; align-items: center; gap: 7px; padding: 6px 14px; border-radius: 8px; cursor: pointer; font-size: 13px; transition: all 0.2s;" onmouseover="this.style.background='var(--blue-50)'; this.style.borderColor='var(--blue-300)'" onmouseout="this.style.background='var(--slate-100)'; this.style.borderColor='var(--slate-200)'">
                ${ICON_LIST}<span>${d.kind} List</span>
              </button>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              ${DOCS.filter(o => o !== d).map(o => `
              <button type="button" class="btn" data-pp-nav="${o.key}" title="Open ${o.kind}" style="${NAV_BTN_STYLE}" ${NAV_BTN_HOVER}>${o.icon(14)}<span>${o.kind}</span></button>`).join('')}
            </div>
          </div>

          <div class="je-fields-bar">
            ${dateFieldHtml(`${P}Date`, 'Date *', `${d.kind} date`)}
            ${dateFieldHtml(`${P}SecondDate`, d.secondLabel, `${d.kind} ${d.secondLabel.toLowerCase()}`, `${P}Date`, d.secondLabel)}
            <div class="je-field">
              <label for="${P}No">${d.noLabel} *</label>
              <div id="${P}NoInputWrap" class="kya-docno-wrap" style="position: relative; width: 100%;">
                <input type="text" id="${P}No" class="je-input" placeholder="${d.code}-${new Date().getFullYear()}-001" aria-label="${d.kind} number" aria-describedby="${P}NoError" style="padding-right: 38px;" />
                <button type="button" id="${P}NoFormatBtn" class="sales-invno-edit-btn" title="Set ${d.noun} number prefix" aria-label="Set ${d.noun} number prefix">${ICON_PENCIL(14).replace('stroke-width="2.2"', 'stroke-width="2"')}</button>
                <div id="${P}NoError" role="alert" class="sales-invno-error" style="display: none;"></div>
              </div>
            </div>
            <div class="je-field" id="${P}VendorWrap">
              <label for="${P}Vendor">${d.vendorLabel}</label>
              <select id="${P}Vendor" class="je-input" aria-label="Vendor Selection" style="display: none;">
                <option value="">&mdash; Select Vendor &mdash;</option>
              </select>
              <div class="kya-searchable-select-wrap" id="${P}VendorSelectWrap" style="position: relative; width: 100%;">
                <div class="kya-searchable-select-trigger" id="${P}VendorSelectTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 0 14px; border: 1.5px solid var(--slate-300); border-radius: 9px; background: var(--white, #fff); cursor: pointer; font-family: var(--font-main); font-size: 14px; font-weight: 500; color: var(--slate-900); height: 42px; box-sizing: border-box; box-shadow: 0 1px 2px rgba(0,0,0,.04); transition: border-color var(--duration), box-shadow var(--duration);">
                  <span id="${P}VendorSelectTriggerText">&mdash; Select Vendor &mdash;</span>
                  <span style="font-size: 10px; color: var(--slate-400); flex-shrink: 0; margin-left: 6px;">▼</span>
                </div>
                <button type="button" id="${P}VendorAlterBtn" class="kya-alter-pencil kya-alter-pencil-field" title="Alter this vendor in Master Desk" aria-label="Alter this vendor in Master Desk" hidden>${ICON_PENCIL(13)}</button>
                <div class="kya-searchable-select-dropdown" id="${P}VendorSelectDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 240px; overflow-y: auto; flex-direction: column; gap: 4px; width: 100%; box-sizing: border-box;">
                  <input type="text" id="${P}VendorSelectSearch" placeholder="Search vendor / supplier, alias, GSTIN..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                  <div id="${P}VendorSelectOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
                </div>
              </div>
            </div>
            <div class="je-field">
              <label for="${P}SupplyType">${d.supplyLabel}</label>
              <select id="${P}SupplyType" class="je-input" aria-label="Supply Type Selection">${options}</select>
            </div>
            <div class="je-field">
              <label for="${P}Executive">${d.execLabel}</label>
              <select id="${P}Executive" class="je-input" aria-label="Executive Selection">
                <option value="">&mdash; Select Executive &mdash;</option>
              </select>
            </div>
          </div>

          <div class="je-table-section">
            <div class="je-table-label">Line Items</div>
            <div class="sales-table-wrap">
              <table class="sales-table" id="${P}ItemTable">
                <thead>
                  <tr id="${P}TableHeader">
                    <th class="col-item" style="text-align: left; padding-left: 8px;">Description (Product / Expense)</th>
                    <th class="col-hsn" style="width: 90px; text-align: left;">HSN/SAC</th>
                    <th class="col-qty" style="width: 65px; text-align: right;">Qty</th>
                    <th class="col-unit" style="width: 65px; text-align: center;">Unit</th>
                    <th class="col-rate" style="width: 100px; text-align: right;">Rate / Price</th>
                    <th class="col-disc" style="width: 105px; text-align: right;">Discount</th>
                    <th class="col-tax" style="width: 75px; text-align: right; padding-right: 6px;">Tax</th>
                    <th class="col-amt" style="width: 110px; text-align: right; padding-right: 8px;">Amount</th>
                    <th class="col-del" style="width: 36px; text-align: center;"></th>
                  </tr>
                </thead>
                <tbody id="${P}ItemBody"></tbody>
              </table>
            </div>
          </div>

          <div class="je-add-row-wrap" style="padding-top: 6px;">
            <button class="je-add-row-btn" id="${P}AddRow" type="button" aria-label="Add item line">
              <svg viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
              Add Row
            </button>
          </div>

          <div class="sales-totals-grid">
            <div class="sales-totals-left" style="display: flex; flex-direction: column; gap: 16px; height: 100%;">
              ${d.advance ? advanceBoxHtml(d) : ''}
              <div class="je-narration-wrap sales-notes-wrap" style="padding: 0; flex: 1; display: flex; flex-direction: column; min-height: 0;">
                <!-- Terms print on the document; Narration goes into the books only. Clicking the
                     label switches between the two boxes (setVoucherNotesTab, sales-helpers.js). -->
                <button type="button" id="${P}NotesToggle" data-notes-for="${P}" data-notes-tab="terms" data-terms-label="${esc(d.notesLabel)}" title="Click to switch between ${esc(d.notesLabel)} and Narration" style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: var(--slate-400); letter-spacing: 0.05em; margin: 0 0 8px; flex-shrink: 0; align-self: flex-start; background: none; border: none; padding: 0; cursor: pointer; font-family: inherit; text-align: left;" onmouseover="this.style.color='var(--blue-600)'" onmouseout="this.style.color='var(--slate-400)'"><span data-notes-label>${esc(d.notesLabel)}</span> ⇄</button>
                <textarea id="${P}Notes" class="je-narration-input" placeholder="${esc(d.notesPlaceholder)}" style="flex: 1; min-height: 90px; height: 100%; box-sizing: border-box; resize: vertical;"></textarea>
                <textarea id="${P}Narration" class="je-narration-input" placeholder="Narration for the books (not printed)" style="display: none; flex: 1; min-height: 90px; height: 100%; box-sizing: border-box; resize: vertical;"></textarea>
              </div>
            </div>

            <div class="sales-totals-right" style="display: flex; flex-direction: column; height: 100%;">
              <div class="sales-summary-card" style="height: 100%; box-sizing: border-box;">
                <div class="sales-summary-row">
                  <span>Sub Total</span>
                  <span id="${P}SubTotal">₹ 0.00</span>
                </div>
                <div class="sales-summary-row" style="align-items: center;">
                  <span style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: var(--slate-400); letter-spacing: 0.05em;">Tax Deduction / Collection</span>
                  <div class="sales-tdstcs-wrap" style="width: auto; min-width: 154px;">
                    <div class="sales-tdstcs-bg none-active" id="${P}TdsTcsBg"></div>
                    <button class="sales-tdstcs-btn active" id="${P}TdsTcsNone" type="button">None</button>
                    <button class="sales-tdstcs-btn" id="${P}TdsTcsTds" type="button">TDS</button>
                    <button class="sales-tdstcs-btn" id="${P}TdsTcsTcs" type="button">TCS</button>
                  </div>
                </div>
                <div id="${P}TdsTcsAmountRow" style="display: none;">
                  <div class="sales-roundoff-input-group sales-tdstcs-amount-group">
                    <select id="${P}TdsTcsRateSelect" class="sales-tdstcs-rate-select" title="Select TDS/TCS rate">
                      <option value="0.1">0.1%</option>
                      <option value="1">1%</option>
                      <option value="2">2%</option>
                      <option value="5">5%</option>
                      <option value="10">10%</option>
                      <option value="custom">Custom</option>
                    </select>
                    <div id="${P}TdsTcsRateCustomWrap" class="sales-tdstcs-custom-wrap" style="display: none;">
                      <input type="number" id="${P}TdsTcsRateCustom" class="sales-tdstcs-custom-input" min="0" max="100" step="0.01" placeholder="0" title="Custom percentage" />
                      <span class="sales-tdstcs-custom-unit">%</span>
                    </div>
                    <div class="sales-tdstcs-divider"></div>
                    <span id="${P}TdsTcsAmountLabel" class="sales-tdstcs-mode-label">TDS</span>
                    <input type="number" id="${P}TdsTcsAmount" class="sales-roundoff-field" placeholder="0.00" />
                  </div>
                </div>
                <div class="sales-roundoff-input-group">
                  <button type="button" id="btn${C}AutoRoundOff" class="sales-roundoff-btn-inline" title="Click to auto round off total to nearest rupee">Round off</button>
                  <input type="text" inputmode="decimal" id="${P}Adjustments" class="sales-roundoff-field" placeholder="0.00" />
                </div>
                <div class="sales-summary-row total-row">
                  <span>Total</span>
                  <span id="${P}Total">₹ 0.00</span>
                </div>
                ${d.attachment ? attachmentHtml(d) : ''}
              </div>
            </div>
          </div>

          <div class="je-actions-bar">
            <div class="je-actions-left">
              <button class="btn btn-danger" id="btnClear${C}" type="button" aria-label="Clear all fields">
                <svg viewBox="0 0 15 15" fill="none"><path d="M3 3l9 9M12 3l-9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                Clear
              </button>
            </div>
            <div class="je-actions-right">
              <button class="btn btn-secondary" id="btnSave${C}Draft" type="button" aria-label="Save ${d.noun} as draft">
                <svg viewBox="0 0 15 15" fill="none"><rect x="2" y="2" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M5 2v4h5V2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M4 8.5h7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
                Save Draft
              </button>
              <button class="btn btn-success" id="btnSave${C}" type="button" aria-label="Save ${d.noun}">
                <svg viewBox="0 0 15 15" fill="none"><path d="M2.5 8l4 4 6-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                ${d.saveLabel}
              </button>
            </div>
          </div>
        </div><!-- /#${P}FormCard -->`;
  }

  // ══════════════════════════════════════════════════════════════════
  //  ONE DOCUMENT FORM
  // ══════════════════════════════════════════════════════════════════
  const forms = {};
  const lists = {};

  function createForm(d) {
    const P = d.P, C = d.C;
    const el = name => $(P + name);
    let rows = [newRow()];
    let editing = null;      // the document open on the form (null for a new one)
    let file = null;         // { name, size, type, data }
    let openedFrom = 'preinvoice';
    let advanceBox = null;

    function advBox() {
      if (!d.advance || typeof createPreInvoiceAdvanceBox !== 'function') return null;
      if (!advanceBox) advanceBox = createPreInvoiceAdvanceBox(P, getGrandTotal, recalc, { noAdjust: true });
      return advanceBox;
    }

    function isZeroTaxSupply() {
      const v = (el('SupplyType') || {}).value || '';
      return v.includes('Zero-Rated') || v.includes('Without Tax');
    }

    // ── Vendor box ──
    function populateVendors(filter) {
      const list = el('VendorSelectOptionsList');
      const sel = el('Vendor');
      if (!list) return;
      const current = sel ? sel.value : '';
      list.innerHTML = '';
      if (sel) sel.innerHTML = '<option value="">&mdash; Select Vendor &mdash;</option>';

      const parties = getPrePurchaseVendors();
      const q = norm(filter);
      // Suppliers first, then parties that exist only as ledgers, each under its own heading
      const hasLedgers = parties.some(isLedgerVendor);
      let lastSection = '';
      let count = 0;
      parties.forEach(p => {
        if (sel) {
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = p.name;
          sel.appendChild(opt);
        }
        const aliases = Array.isArray(p.aliases) ? p.aliases.join(', ') : (p.alias || '');
        if (q && !norm(p.name).includes(q) && !norm(aliases).includes(q) && !norm(p.gstin).includes(q)) return;
        count++;
        const section = isLedgerVendor(p) ? 'Ledgers' : 'Suppliers';
        if (hasLedgers && section !== lastSection && typeof createKyaPartySectionHeader === 'function') {
          list.appendChild(createKyaPartySectionHeader(section));
          lastSection = section;
        }
        const item = document.createElement('div');
        item.style.cssText = 'padding: 8px 12px; font-size: 13px; border-radius: 6px; cursor: pointer; font-weight: 500; display: flex; justify-content: space-between; align-items: center;';
        item.onmouseover = () => { item.style.background = 'var(--slate-50)'; };
        item.onmouseout = () => { item.style.background = 'transparent'; };
        item.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0;">
            <span style="font-weight: 600; color: var(--slate-800);">${esc(p.name)}</span>
            <span style="font-size: 11px; color: var(--slate-400);">${esc(aliases ? `Alias: ${aliases} • ` : '')}${esc(isLedgerVendor(p) ? `Ledger${p.gstin ? ` • ${p.gstin}` : ''}` : (p.gstin || 'Unregistered'))}</span>
          </div>
          <span style="font-size: 11px; font-weight: 600; color: var(--blue-600); background: #eff6ff; padding: 2px 6px; border-radius: 4px;">Select</span>`;
        // Hovering a party shows its details, as in the New Purchase vendor list
        if (typeof bindPartyListItemPreview === 'function') bindPartyListItemPreview(item, p, 'Vendor');
        item.addEventListener('click', () => {
          selectVendor(p.id, true);
          const dd = el('VendorSelectDropdown');
          if (dd) dd.style.display = 'none';
        });
        list.appendChild(item);
      });
      if (sel) sel.value = current;
      if (count === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'padding: 12px; text-align: center; font-size: 12.5px; color: var(--slate-400);';
        empty.textContent = 'No vendors found';
        list.appendChild(empty);
      }
      // Create new Ledger (under Trade Payables) always at the bottom, as on New Purchase
      if (typeof window.appendPurchasePartyCreateFooter === 'function') {
        window.appendPurchasePartyCreateFooter(list, filter, {
          dropdownId: `${P}VendorSelectDropdown`,
          selectId: `${P}Vendor`,
          onCreated: party => {
            populateVendors('');
            if (party && party.id != null) selectVendor(party.id, true);
          },
          onCancelled: name => {
            const dd = el('VendorSelectDropdown');
            const search = el('VendorSelectSearch');
            if (!dd || !search) return;
            dd.style.display = 'flex';
            search.value = name || '';
            populateVendors(search.value);
            search.focus();
          }
        });
      }
    }

    // `picked`: chosen by the user (not loaded with a document) — the supply type follows
    // the vendor's state, as on the Sales Pre Invoice forms
    function selectVendor(id, picked) {
      const party = findVendor(id);
      const sel = el('Vendor');
      const text = el('VendorSelectTriggerText');
      if (sel) sel.value = party ? String(party.id) : '';
      if (text) {
        text.textContent = party ? party.name : '— Select Vendor —';
        text.style.color = party ? 'var(--slate-800)' : 'var(--slate-500)';
        text.style.fontWeight = party ? '600' : '500';
      }
      if (picked && party && !d.isGrn) {
        const supplyEl = el('SupplyType');
        const auto = supplyTypeForVendor(party);
        // Only between the two domestic types: an import / SEZ choice is left alone
        if (supplyEl && auto && /^(Intra|Inter)-State/.test(supplyEl.value) && supplyEl.value !== auto) {
          supplyEl.value = auto;
          renderRows();
          recalc();
        }
      }
      // A name changed for this document only (Vendor Details → Temporary In-Voucher Edit);
      // an edit made for another party doesn't carry over
      const ov = typeof getPartyOverride === 'function' ? getPartyOverride(P) : null;
      if (ov && id && String(ov.partyId) !== String(id)) setPartyOverride(P, null);
      else if (party && ov && ov.isOverridden && ov.name && text) text.textContent = ov.name;
      refreshAlterPencil();
    }

    function vendorMaster() {
      const party = findVendor((el('Vendor') || {}).value);
      if (!party) return null;
      return { tab: isLedgerVendor(party) ? 'ledger' : 'suppliers', id: party.id };
    }

    function refreshAlterPencil() {
      const btn = el('VendorAlterBtn');
      const text = el('VendorSelectTriggerText');
      const show = !!vendorMaster();
      if (btn) btn.hidden = !show;
      if (text) {
        text.style.paddingRight = show ? '26px' : '';
        text.style.overflow = 'hidden';
        text.style.textOverflow = 'ellipsis';
        text.style.whiteSpace = 'nowrap';
      }
    }

    function populateExecutives(selectedId) {
      const sel = el('Executive');
      if (!sel) return;
      sel.innerHTML = '<option value="">&mdash; Select Executive &mdash;</option>';
      // Employees set as Purchaser / Executive (Master Desk → Employee), GRN included
      const emps = typeof getKyaExecutiveEmployees === 'function' ? getKyaExecutiveEmployees('purchase', selectedId)
        : (typeof ohEmployees !== 'undefined' && Array.isArray(ohEmployees) ? ohEmployees : []);
      emps.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = `${e.name} (${e.code || 'EMP'})`;
        if (selectedId && String(e.id) === String(selectedId)) opt.selected = true;
        sel.appendChild(opt);
      });
    }

    // ── Line items: New Purchase's rows (stock items at cost, expense ledgers) ──
    function renderRows() {
      const body = el('ItemBody');
      if (!body) return;
      body.innerHTML = '';
      const zeroTax = isZeroTaxSupply();
      rows.forEach((row, index) => {
        if (zeroTax) {
          row.tax = 0;
          const base = (row.qty || 1) * (row.rate || 0);
          const discAmt = row.discountType === 'pct' ? (base * ((row.discount || 0) / 100)) : (row.discount || 0);
          row.amount = Math.max(0, base - discAmt);
        }
        const tmp = document.createElement('tbody');
        tmp.innerHTML = `
        <tr class="sales-row" data-row-index="${index}">
          <td class="sales-cell-item" style="padding: 4px 8px;">
            <div style="position: relative; display: flex; align-items: center; width: 100%;">
              <input type="text" class="sales-row-item je-input" value="${esc(row.item || '')}" placeholder="Select or type Description (Product / Expense)" style="border: none; background: transparent; box-shadow: none; padding: 0 18px 0 0; width: 100%; font-weight: 600; font-size: 13px; color: var(--slate-800); outline: none;" autocomplete="off" />
              <span class="sales-row-drop-arrow" style="position: absolute; right: 2px; pointer-events: none; color: var(--slate-400); font-size: 10px;">▼</span>
            </div>
          </td>
          <td class="sales-cell-hsn" style="width: 90px; padding: 4px 6px;">
            <div style="position: relative; display: flex; align-items: center; width: 100%;">
              <input type="text" class="sales-row-hsn je-input" value="${esc(row.hsn || '')}" placeholder="HSN/SAC" title="${esc(row.hsnDesc || 'Search the HSN / SAC code master')}" style="border: none; background: transparent; box-shadow: none; padding: 0 14px 0 0; font-size: 12.5px; font-family: monospace, inherit; font-weight: 600; color: var(--slate-700); outline: none; width: 100%;" autocomplete="off" />
              <span class="sales-row-drop-arrow" style="position: absolute; right: 0; pointer-events: none; color: var(--slate-400); font-size: 9px;">▼</span>
            </div>
          </td>
          <td class="sales-cell-qty" style="width: 65px; padding: 4px 6px;">
            <input type="number" class="sales-row-qty je-input" value="${row.qty !== undefined ? row.qty : 1}" min="0" style="border: none; background: transparent; box-shadow: none; text-align: right; padding: 0; font-weight: 600; font-size: 13px; color: var(--slate-800); outline: none; width: 100%;" />
          </td>
          <td class="sales-cell-unit" style="width: 65px; padding: 4px 6px; text-align: center;">
            <input type="text" class="sales-row-unit je-input" value="${esc(row.unit || '')}" placeholder="Unit" style="border: none; background: transparent; box-shadow: none; text-align: center; padding: 0; font-weight: 600; text-transform: uppercase; font-size: 12px; color: var(--slate-700); outline: none; width: 100%;" />
          </td>
          <td class="sales-cell-rate" style="width: 100px; padding: 4px 6px;">
            <input type="text" inputmode="decimal" class="sales-row-rate je-input" value="${row.rate === 0 || row.rate === undefined ? '' : (typeof row.rate === 'number' ? row.rate.toFixed(2) : esc(row.rate))}" placeholder="0.00" style="border: none; background: transparent; box-shadow: none; text-align: right; padding: 0; font-weight: 600; font-size: 13px; color: var(--slate-800); outline: none; width: 100%;" />
          </td>
          <td class="sales-cell-disc" style="width: 105px; padding: 4px 6px;">
            <div style="display: flex; gap: 2px; align-items: center; justify-content: flex-end;">
              <input type="text" inputmode="decimal" class="sales-row-discount je-input" value="${row.discount === 0 || row.discount === undefined ? '' : (typeof row.discount === 'number' ? row.discount.toFixed(2) : esc(row.discount))}" placeholder="0.00" style="border: none; background: transparent; box-shadow: none; text-align: right; width: 55px; padding: 0; font-weight: 600; font-size: 13px; color: var(--slate-800); outline: none;" />
              <select class="sales-row-discount-type je-input" style="border: none; background: transparent; box-shadow: none; width: 22px; padding: 0; font-weight: 700; cursor: pointer; text-align: center; text-align-last: center; -webkit-appearance: none; -moz-appearance: none; appearance: none; font-size: 12px; color: var(--blue-600); outline: none;">
                <option value="val" ${row.discountType === 'val' || !row.discountType ? 'selected' : ''}>₹</option>
                <option value="pct" ${row.discountType === 'pct' ? 'selected' : ''}>%</option>
              </select>
            </div>
          </td>
          <td class="sales-cell-tax" style="width: 75px; padding: 4px 6px;">
            <select class="sales-row-tax je-input" style="border: none; background: transparent; box-shadow: none; text-align: right; text-align-last: right; padding-right: 2px; font-weight: 600; font-size: 12.5px; color: var(--slate-800); width: 100%; outline: none; cursor: pointer;" ${zeroTax ? 'disabled' : ''}>
              ${typeof kyaGstRateOptionsHtml === 'function' ? kyaGstRateOptionsHtml(row.tax) : `<option value="${row.tax === undefined ? 18 : row.tax}" selected>${row.tax === undefined ? 18 : row.tax}%</option>`}
            </select>
          </td>
          <td class="sales-cell-amt" style="width: 110px; padding: 4px 6px;">
            <input type="text" inputmode="decimal" class="sales-row-amount-input je-input" value="${row.amount === 0 || row.amount === undefined ? '' : Number(row.amount).toFixed(2)}" placeholder="0.00" style="border: none; background: transparent; box-shadow: none; text-align: right; padding: 0; font-weight: 700; width: 100%; font-size: 13.5px; color: var(--slate-900); outline: none;" />
          </td>
          <td class="sales-del-cell" style="width: 36px; padding: 2px; text-align: center; border: none !important; background: transparent !important; box-shadow: none !important;">
            <button type="button" class="sales-del-row" style="background: none; border: none !important; outline: none !important; box-shadow: none !important; color: var(--red-600); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; margin: 0 auto; transition: background 0.15s;" onmouseover="this.style.backgroundColor='var(--red-50)'" onmouseout="this.style.backgroundColor='transparent'">
              <svg viewBox="0 0 15 15" fill="none" style="width: 13px; height: 13px;"><path d="M5.5 2h4M1.5 4h12M2.5 4l1 9.5a1 1 0 001 .5h6a1 1 0 001-.5l1-9.5M5.5 6.5v5M9.5 6.5v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
            </button>
          </td>
        </tr>`;
        const tr = tmp.firstElementChild;
        body.appendChild(tr);

        // Description: Stock Items (at cost) and Expense ledgers, with Create / ✎ Alter
        const itemInp = tr.querySelector('.sales-row-item');
        if (itemInp && typeof _salesItemPortal !== 'undefined') {
          const attachPortal = () => {
            _salesItemPortal.open(itemInp, itemInp.value, selectedItem => {
              itemInp.value = selectedItem.name;
              const r = rows[index];
              if (!r) return;
              if (typeof window.applyMasterItemToVoucherRow === 'function') {
                window.applyMasterItemToVoucherRow(r, tr, selectedItem, { zeroTax: isZeroTaxSupply() });
              } else {
                r.item = selectedItem.name;
                r.itemType = selectedItem.type;
              }
              updateRowFromDOM(index, tr, 'item');
            }, { purchase: true });
          };
          itemInp.addEventListener('focus', attachPortal);
          itemInp.addEventListener('click', attachPortal);
          itemInp.addEventListener('input', () => {
            rows[index].item = itemInp.value;
            if (!itemInp.value.trim() && typeof window.clearVoucherRowItemLink === 'function') {
              window.clearVoucherRowItemLink(rows[index], tr);
              recalc();
            }
            attachPortal();
          });
          if (typeof handlePortalKeydown === 'function') {
            itemInp.addEventListener('keydown', e => handlePortalKeydown(e, _salesItemPortal));
          }
        }
        const hsnInp = tr.querySelector('.sales-row-hsn');
        if (hsnInp && typeof window.attachVoucherRowCodePicker === 'function') {
          window.attachVoucherRowCodePicker(hsnInp, () => rows[index]);
        }
        if (typeof window.attachVoucherRowUnitPicker === 'function') {
          window.attachVoucherRowUnitPicker(tr.querySelector('.sales-row-unit'));
        }
        if (typeof window.attachVoucherRowAlterButtons === 'function') {
          window.attachVoucherRowAlterButtons(tr, () => rows[index]);
        }
      });
    }

    function updateRowFromDOM(index, tr, triggeredBy) {
      const row = rows[index];
      if (!row) return;
      const amtInput = tr.querySelector('.sales-row-amount-input');
      const itemEl = tr.querySelector('.sales-row-item');
      if (itemEl) row.item = itemEl.value;
      const hsnEl = tr.querySelector('.sales-row-hsn');
      if (hsnEl) row.hsn = hsnEl.value;
      const unitEl = tr.querySelector('.sales-row-unit');
      if (unitEl) row.unit = unitEl.value;

      const qty = parseFloat(tr.querySelector('.sales-row-qty')?.value) || 0;
      let rate = Math.round(parseAmt(tr.querySelector('.sales-row-rate')?.value || '0') * 100) / 100;
      const discount = parseAmt(tr.querySelector('.sales-row-discount')?.value || '0');
      row.discountType = tr.querySelector('.sales-row-discount-type')?.value || 'val';
      row.tax = parseFloat(tr.querySelector('.sales-row-tax')?.value) || 0;

      if (triggeredBy === 'amount') {
        const entered = Math.round(parseAmt(amtInput ? amtInput.value : '') * 100) / 100;
        if (amtInput && document.activeElement !== amtInput) amtInput.value = entered === 0 ? '' : entered.toFixed(2);
        const afterDiscount = entered / (1 + row.tax / 100);
        let base;
        if (row.discountType === 'pct') {
          const f = 1 - (discount / 100);
          base = f > 0 ? afterDiscount / f : 0;
        } else {
          base = afterDiscount + discount;
        }
        rate = Math.round((qty > 0 ? base / qty : 0) * 100) / 100;
        row.qty = qty;
        row.rate = rate;
        row.discount = discount;
        row.amount = entered;
        const rateInput = tr.querySelector('.sales-row-rate');
        if (rateInput && document.activeElement !== rateInput) rateInput.value = rate === 0 ? '' : rate.toFixed(2);
      } else {
        row.qty = qty;
        row.rate = rate;
        row.discount = discount;
        const base = row.qty * row.rate;
        const discAmt = row.discountType === 'pct' ? (base * (row.discount / 100)) : row.discount;
        const afterDiscount = Math.max(0, base - discAmt);
        row.amount = Math.round((afterDiscount * (1 + row.tax / 100)) * 100) / 100;
        if (amtInput && document.activeElement !== amtInput) amtInput.value = row.amount === 0 ? '' : row.amount.toFixed(2);
      }
      recalc();
    }

    // ── Totals: TDS on the value before GST (CBDT Circular 23/2017), TCS on the full value
    //    including GST (Circular 17/2020) — as on New Purchase ──
    function subTotal() {
      return r2(rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0));
    }
    function taxableTotal() {
      if (typeof getPurchaseLineFigures !== 'function') return subTotal();
      return r2(rows.reduce((s, r) => s + getPurchaseLineFigures(r).taxable, 0));
    }
    function tdsTcsMode() {
      if (el('TdsTcsTds')?.classList.contains('active')) return 'TDS';
      if (el('TdsTcsTcs')?.classList.contains('active')) return 'TCS';
      return 'None';
    }
    function tdsTcsRate() {
      if (tdsTcsMode() === 'None') return 0;
      const sel = el('TdsTcsRateSelect');
      if (!sel) return 0;
      if (sel.value === 'custom') return parseFloat((el('TdsTcsRateCustom') || {}).value) || 0;
      return parseFloat(sel.value) || 0;
    }
    function getGrandTotal() {
      const sub = subTotal();
      const mode = tdsTcsMode();
      const amt = parseFloat((el('TdsTcsAmount') || {}).value) || 0;
      const adj = parseFloat((el('Adjustments') || {}).value) || 0;
      let total = sub;
      if (mode === 'TDS') total = sub - amt;
      else if (mode === 'TCS') total = sub + amt;
      return r2(total + adj);
    }

    function recalc() {
      const sub = subTotal();
      if (el('SubTotal')) el('SubTotal').textContent = '₹ ' + fmt(sub);

      const mode = tdsTcsMode();
      const rateSel = el('TdsTcsRateSelect');
      const customWrap = el('TdsTcsRateCustomWrap');
      const customInp = el('TdsTcsRateCustom');
      let rate = 0;
      if (mode !== 'None' && rateSel) {
        if (rateSel.value === 'custom') {
          if (customWrap) customWrap.style.display = 'flex';
          rate = customInp ? (parseFloat(customInp.value) || 0) : 0;
        } else {
          if (customWrap) customWrap.style.display = 'none';
          rate = parseFloat(rateSel.value) || 0;
        }
      }
      const amtInp = el('TdsTcsAmount');
      const base = mode === 'TDS' ? taxableTotal() : sub;
      // The amount is typed only with a Custom rate; a preset rate works it out from the base
      const isCustom = !!rateSel && rateSel.value === 'custom';
      if (amtInp) {
        amtInp.readOnly = !isCustom;
        amtInp.title = isCustom ? '' : 'Select "Custom" rate to edit the amount';
      }
      if (isCustom && amtInp && amtInp.dataset.manual === '1' && mode !== 'None') {
        const manual = parseFloat(amtInp.value) || 0;
        if (customInp && base > 0) {
          rate = Math.round((manual / base) * 100 * 100) / 100;
          customInp.value = rate ? String(rate) : '';
        }
      } else if (amtInp && !(isCustom && document.activeElement === amtInp)) {
        amtInp.value = mode !== 'None' ? r2(base * (rate / 100)).toFixed(2) : '';
      }

      const adjInp = el('Adjustments');
      const adj = adjInp ? (parseFloat(adjInp.value) || 0) : 0;
      const roundBtn = $(`btn${C}AutoRoundOff`);
      if (roundBtn) {
        if (adjInp && adjInp.value.trim() !== '' && adj !== 0) roundBtn.classList.add('active');
        else if (!adjInp || adjInp.value.trim() === '') roundBtn.classList.remove('active');
      }

      const total = getGrandTotal();
      if (el('Total')) el('Total').textContent = '₹ ' + fmt(total);
      // The advance can never exceed the Grand Total
      if (advBox()) advBox().clampToTotal(total);
    }

    function autoRoundOff() {
      const btn = $(`btn${C}AutoRoundOff`);
      const adjEl = el('Adjustments');
      if (btn && btn.classList.contains('active') && adjEl && adjEl.value.trim() !== '') {
        adjEl.value = '';
        btn.classList.remove('active');
        recalc();
        return;
      }
      const sub = subTotal();
      const mode = tdsTcsMode();
      const amt = parseAmt((el('TdsTcsAmount') || {}).value) || 0;
      let raw = sub;
      if (mode === 'TDS') raw = sub - amt;
      else if (mode === 'TCS') raw = sub + amt;
      const roundOff = Math.round((Math.round(raw) - raw) * 100) / 100;
      if (adjEl) {
        adjEl.value = roundOff === 0 ? '' : roundOff.toFixed(2);
        if (btn) btn.classList.add('active');
        recalc();
      }
    }

    function setTdsTcs(mode) {
      const none = el('TdsTcsNone'), tds = el('TdsTcsTds'), tcs = el('TdsTcsTcs');
      const bg = el('TdsTcsBg'), amtRow = el('TdsTcsAmountRow'), lbl = el('TdsTcsAmountLabel'), amtInp = el('TdsTcsAmount');
      if (!none || !tds || !tcs) return;
      [none, tds, tcs].forEach(b => b.classList.remove('active'));
      if (mode === 'TDS' || mode === 'TCS') {
        (mode === 'TDS' ? tds : tcs).classList.add('active');
        if (bg) bg.className = `sales-tdstcs-bg ${mode === 'TDS' ? 'tds' : 'tcs'}-active`;
        if (amtRow) amtRow.style.display = 'block';
        if (lbl) lbl.textContent = mode;
      } else {
        none.classList.add('active');
        if (bg) bg.className = 'sales-tdstcs-bg none-active';
        if (amtRow) amtRow.style.display = 'none';
        if (amtInp) {
          amtInp.value = '';
          delete amtInp.dataset.manual;
        }
      }
      recalc();
    }

    function updateDueDays() {
      const dateVal = (el('Date') || {}).value;
      const dueVal = (el('DueDate') || {}).value;
      const daysEl = el('DueDateDays');
      if (!daysEl) return;
      if (!dateVal || !dueVal) { daysEl.textContent = ''; return; }
      const d1 = new Date(dateVal), d2 = new Date(dueVal);
      d1.setHours(0, 0, 0, 0);
      d2.setHours(0, 0, 0, 0);
      const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000);
      if (diff === 0) { daysEl.textContent = 'Due Today'; daysEl.style.color = 'var(--blue-600)'; }
      else if (diff > 0) { daysEl.textContent = `Due in ${diff} day${diff === 1 ? '' : 's'}`; daysEl.style.color = 'var(--slate-500)'; }
      else { daysEl.textContent = `Overdue by ${-diff} day${diff === -1 ? '' : 's'}`; daysEl.style.color = 'var(--red-600)'; }
    }

    // ── Attachment ──
    function fileSizeText(bytes) {
      if (!bytes) return '0 KB';
      const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    function updateDocUI(doc) {
      if (!d.attachment) return;
      const empty = el('DocEmptyState'), chosen = el('DocSelectedState'), badge = el('DocStatusBadge');
      const input = el('DocFileInput');
      if (!doc || !doc.data) {
        file = null;
        if (empty) empty.style.display = 'flex';
        if (chosen) chosen.style.display = 'none';
        if (badge) badge.style.display = 'none';
        if (input) input.value = '';
        return;
      }
      file = { name: doc.name || 'Document', size: doc.size || 0, type: doc.type || '', data: doc.data };
      if (empty) empty.style.display = 'none';
      if (chosen) chosen.style.display = 'flex';
      if (badge) badge.style.display = 'inline-block';
      if (el('DocFileName')) el('DocFileName').textContent = file.name;
      if (el('DocFileSize')) el('DocFileSize').textContent = fileSizeText(file.size);
      if (el('DocFileIcon')) el('DocFileIcon').textContent = (file.name.split('.').pop() || 'DOC').toUpperCase().slice(0, 4);
      const preview = el('DocPreviewBtn');
      if (preview) {
        preview.href = file.data;
        preview.download = file.name;
      }
    }
    function handleUpload(f) {
      if (!f) return;
      if (f.size > 10 * 1024 * 1024) {
        toast('File size exceeds maximum limit of 10MB.', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onload = e => {
        updateDocUI({ name: f.name, size: f.size, type: f.type, data: e.target.result });
        toast('Document attached successfully.', 'success');
      };
      reader.readAsDataURL(f);
    }

    // ── Open / close / fill ──
    function open(doc, from) {
      openedFrom = from || 'preinvoice';
      showPurchasePreCard(`${P}FormCard`);
      init(doc || null);
    }

    function close() {
      editing = null;
      if (typeof hidePartyHoverCard === 'function') hidePartyHoverCard();
      // Back to the list when the form was opened from it, otherwise to Pre Purchase
      if (openedFrom === 'list' && lists[d.key]) {
        lists[d.key].open(lists[d.key].currentFilter());
        return;
      }
      showPurchaseHub();
    }

    function init(doc) {
      if (typeof syncDocDraftButton === 'function') syncDocDraftButton(d.numberKind, doc && doc.id);
      // The party edit saved with this document (none for a new one)
      if (typeof setPartyOverride === 'function') setPartyOverride(P, (doc && doc.partyOverride) ? JSON.parse(JSON.stringify(doc.partyOverride)) : null);
      if (typeof hidePartyHoverCard === 'function') hidePartyHoverCard();
      if (typeof _salesCodePortal !== 'undefined') _salesCodePortal.close();
      if (typeof _salesItemPortal !== 'undefined') _salesItemPortal.close();

      const today = todayIso();
      const second = addDaysIso(d.secondDays);
      editing = doc || null;
      if (el('Date')) el('Date').value = (doc && doc.date) || today;
      if (el('SecondDate')) el('SecondDate').value = (doc && doc[d.dateField]) || ((doc && doc.date) && d.secondDays === 0 ? doc.date : second);
      if (el('DueDate')) el('DueDate').value = (doc && (doc.dueDate || doc[d.dateField])) || second;

      const no = doc ? (doc.docNo || '') : (typeof getNextDocNo === 'function' ? getNextDocNo(d.numberKind) : '');
      if (el('No')) el('No').value = no;
      if (el('ChipDisplay')) el('ChipDisplay').textContent = no || `${d.code}-XXXX`;
      if (el('Notes')) el('Notes').value = (doc && doc.notes) || '';
      if (el('Narration')) el('Narration').value = (doc && doc.narration) || '';
      if (typeof setVoucherNotesTab === 'function') setVoucherNotesTab(P, 'terms');

      rows =(doc && Array.isArray(doc.rows) && doc.rows.length) ? JSON.parse(JSON.stringify(doc.rows)) : [newRow()];

      // Vendor — selected first, then the saved supply type (which may differ from the
      // vendor's state, e.g. an import)
      populateVendors('');
      selectVendor('', false);
      if (doc && doc.vendorId) {
        selectVendor(doc.vendorId, false);
        // The stored id can be missing from the list (party re-created): match by name
        if (!(el('Vendor') || {}).value && doc.vendorName) {
          const match = getPrePurchaseVendors().find(p => norm(p.name) === norm(doc.vendorName));
          if (match) selectVendor(match.id, false);
        }
      }
      const supplyEl = el('SupplyType');
      if (supplyEl) {
        const fallback = d.isGrn ? GRN_PURPOSES[0] : 'Intra-State (CGST + SGST)';
        const wanted = normSupply(doc && doc.supplyType) || fallback;
        supplyEl.value = Array.from(supplyEl.options).some(o => o.value === wanted) ? wanted : fallback;
      }
      populateExecutives(doc && doc.executiveId);
      if (el('Executive') && !(doc && doc.executiveId)) el('Executive').value = '';

      if (el('Adjustments')) el('Adjustments').value = (doc && parseFloat(doc.adjustments)) ? doc.adjustments : '';
      // TDS / TCS and its rate (a custom rate keeps its exact saved amount)
      const rateSel = el('TdsTcsRateSelect');
      if (rateSel) rateSel.value = '1';
      if (el('TdsTcsRateCustom')) el('TdsTcsRateCustom').value = '';
      if (el('TdsTcsRateCustomWrap')) el('TdsTcsRateCustomWrap').style.display = 'none';
      const mode = (doc && (doc.tdsTcsMode === 'TDS' || doc.tdsTcsMode === 'TCS')) ? doc.tdsTcsMode : 'None';
      renderRows();
      setTdsTcs(mode);
      if (mode !== 'None' && rateSel) {
        const rateVal = parseFloat(doc.tdsTcsRate) || 0;
        if (rateVal && rateSel.querySelector(`option[value="${rateVal}"]`)) {
          rateSel.value = String(rateVal);
        } else {
          rateSel.value = 'custom';
          if (el('TdsTcsRateCustom')) el('TdsTcsRateCustom').value = rateVal || '';
          const amtEl = el('TdsTcsAmount');
          if (amtEl && parseFloat(doc.tdsTcsAmount) > 0) {
            amtEl.value = parseFloat(doc.tdsTcsAmount).toFixed(2);
            amtEl.dataset.manual = '1';
          }
        }
      }

      if (advBox()) advBox().load(doc || null);
      updateDocUI(doc ? doc.document : null);
      updateDueDays();
      refreshAlterPencil();
      recalc();
      if (typeof validateDocNoField === 'function') validateDocNoField(d.numberKind); // clear an old "already used" line
    }

    function getFormData() {
      const vendorId = (el('Vendor') || {}).value || '';
      const party = findVendor(vendorId);
      const executiveId = (el('Executive') || {}).value || '';
      const emp = (typeof ohEmployees !== 'undefined' && Array.isArray(ohEmployees)) ? ohEmployees.find(e => String(e.id) === String(executiveId)) : null;
      const sub = subTotal();
      const mode = tdsTcsMode();
      const total = getGrandTotal();
      const secondDate = (el('SecondDate') || {}).value || '';
      const data = {
        id: editing ? editing.id : Date.now(),
        docNo: ((el('No') || {}).value || '').trim(),
        date: (el('Date') || {}).value || todayIso(),
        [d.dateField]: secondDate,
        vendorId,
        vendorName: party ? party.name : '',
        // Vendor details changed for this document only (Vendor Details card)
        partyOverride: typeof getPartyOverrideToSave === 'function' ? getPartyOverrideToSave(P, vendorId) : null,
        supplyType: (el('SupplyType') || {}).value || '',
        executiveId,
        executiveName: emp ? emp.name : '',
        rows: JSON.parse(JSON.stringify(rows)),
        subTotal: sub,
        tdsTcsMode: mode,
        tdsTcsRate: tdsTcsRate(),
        tdsTcsAmount: mode !== 'None' ? (parseFloat((el('TdsTcsAmount') || {}).value) || 0) : 0,
        adjustments: parseFloat((el('Adjustments') || {}).value) || 0,
        total,
        notes: (el('Notes') || {}).value || '',
        narration: (el('Narration') || {}).value || '',
        document: file ? { name: file.name, size: file.size, type: file.type, data: file.data } : null,
        advanceJournalEntryId: editing ? (editing.advanceJournalEntryId || null) : null,
        advanceVoucherNo: editing ? (editing.advanceVoucherNo || null) : null,
        advancePaidAmount: editing ? (editing.advancePaidAmount || 0) : 0,
        createdAt: editing ? (editing.createdAt || Date.now()) : Date.now(),
        updatedAt: Date.now(),
        status: 'Active'
      };
      if (d.advance && advBox()) {
        data.dueDate = (el('DueDate') || {}).value || secondDate;
        Object.assign(data, advBox().read(total));
        delete data.creditAdjustments;
      } else {
        data.paymentStatus = 'Not Paid';
      }
      return data;
    }

    function save(isDraft) {
      const data = getFormData();
      if (isDraft && typeof checkDocDraftAllowed === 'function' && !checkDocDraftAllowed(d.numberKind, data.id)) return;
      if (!data.vendorId) {
        toast(`Please select a Vendor / Supplier for the ${d.noun}.`, 'warning');
        return;
      }
      const validRows = data.rows.filter(r => (r.item && r.item.trim()) || (r.amount && r.amount > 0));
      if (validRows.length === 0) {
        toast(`Please add at least one line item to the ${d.noun}.`, 'warning');
        return;
      }
      // Saved or draft, a document of ₹0 is not worth keeping
      if (!(data.total > 0)) {
        toast(`${d.kind} total must be greater than zero. Please enter rates / amounts for the line items.`, 'warning');
        return;
      }
      if (d.advance && advBox()) {
        const err = advBox().validate(data);
        if (err) { toast(err, 'warning'); return; }
      }
      if (!data.docNo) {
        toast(`${d.noLabel} is required.`, 'warning');
        return;
      }
      // A number already used can't be issued again (the document being edited keeps its own)
      if (typeof checkDocNoBeforeSave === 'function' && !checkDocNoBeforeSave(d.numberKind, data.docNo, data.id)) return;

      const S = store();
      if (isDraft) {
        data.status = 'Draft';
        // A draft is not in the books: take back any advance an earlier active save posted
        if (data.advanceJournalEntryId) removeAdvance(data);
        const idx = S[d.draftsKey].findIndex(x => String(x.id) === String(data.id));
        if (idx >= 0) S[d.draftsKey][idx] = data;
        else S[d.draftsKey].unshift(data);
        toast(`${d.kind} draft ${data.docNo} saved successfully.`, 'success');
      } else {
        data.status = 'Active';
        // The advance paid against the document goes to the books
        const total = parseFloat(data.total) || 0;
        const advance = data.paymentStatus === 'Not Paid' ? 0 : (parseFloat(data.paymentAmount) || 0);
        const paid = total > 0 ? Math.min(advance, total) : advance;
        if (d.advance && paid > 0) postAdvanceFor(d, data, paid);
        else if (data.advanceJournalEntryId) removeAdvance(data);

        const idx = S[d.storeKey].findIndex(x => String(x.id) === String(data.id));
        if (idx >= 0) S[d.storeKey][idx] = data;
        else S[d.storeKey].unshift(data);
        S[d.draftsKey] = S[d.draftsKey].filter(x => String(x.id) !== String(data.id));
        // Saved: the number is used for good, even if the document is deleted later
        if (typeof registerDocNo === 'function') registerDocNo(d.numberKind, data.docNo);
        toast(`${d.kind} ${data.docNo} saved successfully!`, 'success');
      }
      if (typeof refreshAllReports === 'function') refreshAllReports();
      if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
      close();
    }

    // ── Wiring (once) ──
    function wire() {
      $(`btn${C}Back`)?.addEventListener('click', e => { e.preventDefault(); close(); });
      $(`btn${C}ViewList`)?.addEventListener('click', e => { e.preventDefault(); if (lists[d.key]) lists[d.key].open('all'); });
      const card = el('FormCard');
      if (card) {
        card.querySelectorAll('[data-pp-nav]').forEach(btn => {
          btn.addEventListener('click', e => {
            e.preventDefault();
            editing = null;
            const other = forms[btn.dataset.ppNav];
            if (other) other.open(null, 'preinvoice');
          });
        });
      }

      // Number: chip, the pencil (format popup) and the "already used" check
      const noEl = el('No');
      if (noEl) noEl.addEventListener('input', () => {
        if (el('ChipDisplay')) el('ChipDisplay').textContent = noEl.value.trim() || noEl.placeholder;
      });
      if (typeof wireDocNumberField === 'function') wireDocNumberField(d.numberKind, () => (editing ? editing.id : null));

      // Dates
      if (typeof window.attachMarkedKyaDatePickers === 'function') window.attachMarkedKyaDatePickers(card);
      el('Date')?.addEventListener('change', updateDueDays);
      el('DueDate')?.addEventListener('change', updateDueDays);
      el('SecondDate')?.addEventListener('change', () => {
        const due = el('DueDate');
        if (due && !due.value) due.value = el('SecondDate').value;
        updateDueDays();
      });

      // Vendor box: list, search, pencil, Vendor Details card
      const trigger = el('VendorSelectTrigger');
      const dropdown = el('VendorSelectDropdown');
      const search = el('VendorSelectSearch');
      if (trigger && dropdown && search) {
        trigger.addEventListener('click', e => {
          e.stopPropagation();
          if (dropdown.style.display === 'flex') {
            dropdown.style.display = 'none';
          } else {
            dropdown.style.display = 'flex';
            search.value = '';
            populateVendors('');
            setTimeout(() => search.focus(), 50);
          }
        });
        search.addEventListener('input', () => populateVendors(search.value));
        search.addEventListener('click', e => e.stopPropagation());
        document.addEventListener('click', e => {
          if (!trigger.contains(e.target) && !dropdown.contains(e.target)) dropdown.style.display = 'none';
        });
      }
      if (typeof attachPartyDetailsCard === 'function') {
        attachPartyDetailsCard({ context: P, triggerId: `${P}VendorSelectTrigger`, triggerTextId: `${P}VendorSelectTriggerText`, selectId: `${P}Vendor`, dropdownId: `${P}VendorSelectDropdown`, partyType: 'Vendor' });
      }
      const alterBtn = el('VendorAlterBtn');
      if (alterBtn) {
        alterBtn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
        alterBtn.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          const m = vendorMaster();
          if (!m || typeof window.openVoucherMasterAlter !== 'function') return;
          window.openVoucherMasterAlter(m.tab, m.id, {
            type: 'vendor',
            returnTab: 'purchase_voucher',
            onAltered: (tab, record) => {
              // Same vendor, refreshed details. The document's copy of the party is dropped
              // so it rebuilds from the altered master — unless it was edited here on purpose
              const ov = typeof getPartyOverride === 'function' ? getPartyOverride(P) : null;
              if (ov && String(ov.partyId) === String(record.id) && !ov.isOverridden) setPartyOverride(P, null);
              populateVendors('');
              selectVendor(record.id, false);
            }
          });
        });
      }
      el('Executive')?.addEventListener('focus', () => populateExecutives((el('Executive') || {}).value));
      el('SupplyType')?.addEventListener('change', () => { renderRows(); recalc(); });

      // Line items
      el('AddRow')?.addEventListener('click', e => {
        e.preventDefault();
        rows.push(newRow());
        renderRows();
        recalc();
      });
      const body = el('ItemBody');
      if (body) {
        body.addEventListener('input', e => {
          const tr = e.target.closest('tr');
          if (!tr) return;
          const isRate = e.target.classList.contains('sales-row-rate');
          const isAmt = e.target.classList.contains('sales-row-amount-input');
          const isDisc = e.target.classList.contains('sales-row-discount');
          // At most two decimals (unless a sum is being typed)
          if ((isRate || isAmt || isDisc) && !/[\+\-\*\/\%]/.test(e.target.value) && e.target.value.includes('.')) {
            const parts = e.target.value.split('.');
            if (parts[1] && parts[1].length > 2) e.target.value = parts[0] + '.' + parts[1].slice(0, 2);
          }
          updateRowFromDOM(parseInt(tr.dataset.rowIndex, 10), tr, isAmt ? 'amount' : 'rate');
        });
        body.addEventListener('change', e => {
          const tr = e.target.closest('tr');
          if (tr) updateRowFromDOM(parseInt(tr.dataset.rowIndex, 10), tr, 'rate');
        });
        body.addEventListener('click', e => {
          const del = e.target.closest('.sales-del-row');
          if (!del) return;
          const tr = del.closest('tr');
          const index = tr ? parseInt(tr.dataset.rowIndex, 10) : NaN;
          if (isNaN(index)) return;
          if (rows.length > 1) rows.splice(index, 1);
          else rows = [newRow()];
          renderRows();
          recalc();
        });
      }

      // TDS / TCS
      [['TdsTcsNone', 'None'], ['TdsTcsTds', 'TDS'], ['TdsTcsTcs', 'TCS']].forEach(([id, mode]) => {
        el(id)?.addEventListener('click', () => setTdsTcs(mode));
      });
      const rateSel = el('TdsTcsRateSelect');
      const amtInp = el('TdsTcsAmount');
      rateSel?.addEventListener('change', () => {
        if (amtInp) delete amtInp.dataset.manual;
        const wrap = el('TdsTcsRateCustomWrap');
        if (rateSel.value === 'custom') {
          if (wrap) wrap.style.display = 'flex';
          el('TdsTcsRateCustom')?.focus();
        } else if (wrap) {
          wrap.style.display = 'none';
        }
        recalc();
      });
      el('TdsTcsRateCustom')?.addEventListener('input', () => {
        // Typing a percentage makes the rate the source again
        if (amtInp) delete amtInp.dataset.manual;
        recalc();
      });
      amtInp?.addEventListener('input', () => {
        if (rateSel && rateSel.value === 'custom') {
          if (amtInp.value.trim() !== '') amtInp.dataset.manual = '1';
          else delete amtInp.dataset.manual;
        }
        recalc();
      });
      $(`btn${C}AutoRoundOff`)?.addEventListener('click', e => { e.preventDefault(); autoRoundOff(); });
      el('Adjustments')?.addEventListener('input', recalc);

      // Advance Payment — account (with Multi Payment) + amount
      if (advBox()) advBox().wire();

      // Attachment
      const dropzone = el('DocDropzone');
      const fileInput = el('DocFileInput');
      if (dropzone && fileInput) {
        dropzone.addEventListener('click', e => {
          if (e.target.closest(`#${P}DocRemoveBtn`) || e.target.closest(`#${P}DocPreviewBtn`)) return;
          fileInput.click();
        });
        fileInput.addEventListener('change', e => { if (e.target.files && e.target.files[0]) handleUpload(e.target.files[0]); });
        dropzone.addEventListener('dragover', e => {
          e.preventDefault();
          dropzone.style.borderColor = 'var(--blue-500)';
          dropzone.style.background = '#eff6ff';
        });
        dropzone.addEventListener('dragleave', () => {
          dropzone.style.borderColor = 'var(--slate-300)';
          dropzone.style.background = 'var(--slate-50)';
        });
        dropzone.addEventListener('drop', e => {
          e.preventDefault();
          dropzone.style.borderColor = 'var(--slate-300)';
          dropzone.style.background = 'var(--slate-50)';
          if (e.dataTransfer.files && e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0]);
        });
      }
      el('DocRemoveBtn')?.addEventListener('click', e => {
        e.stopPropagation();
        updateDocUI(null);
        toast('Document attachment removed.', 'info');
      });

      // Actions
      $(`btnClear${C}`)?.addEventListener('click', () => init(editing));
      $(`btnSave${C}Draft`)?.addEventListener('click', () => save(true));
      $(`btnSave${C}`)?.addEventListener('click', () => save(false));
    }

    return { open, close, init, save, wire, refreshVendors: () => populateVendors('') };
  }

  // ══════════════════════════════════════════════════════════════════
  //  CONVERT TO PURCHASE — the document fills New Purchase; it is marked Completed once
  //  that purchase is posted
  // ══════════════════════════════════════════════════════════════════
  function convertToPurchase(d, doc, opts) {
    if (!doc || typeof window.loadPurchaseVoucher !== 'function') return;
    const S = store();
    const saved = S[d.storeKey].find(x => String(x.id) === String(doc.id)) || null;
    const stored = saved || S[d.draftsKey].find(x => String(x.id) === String(doc.id)) || doc;
    // A draft was never saved, so nothing it shows as paid is in the books: no advance comes
    // across — its payment is simply the purchase's payment, made when the purchase is posted
    const isDraft = !saved;
    const advance = isDraft ? 0 : r2(stored.advancePaidAmount);
    const party = findVendor(stored.vendorId);
    const today = todayIso();
    const supplyType = PURCHASE_SUPPLY_TYPES.includes(normSupply(stored.supplyType))
      ? normSupply(stored.supplyType)
      : (supplyTypeForVendor(party) || 'Intra-State (CGST + SGST)');
    const keepExec = (opts && opts.keepExecutive) || '';
    const v = {
      id: Date.now(),
      invoiceNo: '',
      date: today,
      dueDate: stored.dueDate || stored[d.dateField] || today,
      vendorId: stored.vendorId,
      vendorName: stored.vendorName,
      partyOverride: stored.partyOverride ? JSON.parse(JSON.stringify(stored.partyOverride)) : null,
      supplyType,
      executiveId: stored.executiveId || keepExec,
      rows: Array.isArray(stored.rows) ? JSON.parse(JSON.stringify(stored.rows)) : [],
      subTotal: stored.subTotal,
      tdsTcsMode: stored.tdsTcsMode || 'None',
      tdsTcsRate: stored.tdsTcsRate || 0,
      tdsTcsAmount: stored.tdsTcsAmount || 0,
      adjustments: stored.adjustments || 0,
      total: stored.total,
      // The document's terms carry over to print; where it came from, and its own Narration,
      // go into the Narration
      notes: stored.notes || '',
      narration: `Converted from ${d.kind} ${stored.docNo}. ${stored.narration || ''}`.trim(),
      uploadedDoc: (stored.document && stored.document.data) ? {
        fileName: stored.document.name,
        fileSize: stored.document.size ? `${(stored.document.size / 1024).toFixed(1)} KB` : '',
        fileBytes: stored.document.size || 0,
        fileData: stored.document.data
      } : null,
      paymentStatus: stored.paymentStatus || 'Not Paid',
      paymentAccountId: stored.paymentAccountId || '',
      paymentSplits: Array.isArray(stored.paymentSplits) ? JSON.parse(JSON.stringify(stored.paymentSplits)) : [],
      paymentAmount: stored.paymentStatus === 'Full Payment' ? (stored.paymentAmount || stored.total) : (stored.paymentAmount || 0),
      // The Pre Purchase document this purchase is made from, and the advance it brings
      preDocKind: d.key,
      preDocId: stored.id,
      advancePaidAmount: advance,
      advanceJournalEntryId: isDraft ? null : (stored.advanceJournalEntryId || null),
      advanceVoucherNo: isDraft ? null : (stored.advanceVoucherNo || null)
    };
    showPurchaseFormCard();
    window.loadPurchaseVoucher(v, false);
    toast(`${d.kind} ${stored.docNo} loaded into New Purchase. Click Save Purchase to complete the conversion.`, 'info');
  }

  // ══════════════════════════════════════════════════════════════════
  //  PRE PURCHASE CARD — Pre Purchase List (counts) and the four document tabs
  // ══════════════════════════════════════════════════════════════════
  function overviewHtml() {
    // A reversal deleted elsewhere makes its document active again (purchase-reversal.js)
    if (typeof window.healPurchasePreReversals === 'function') window.healPurchasePreReversals();
    const S = store();
    // Counted as the lists show them: drafts are left out, Active is the saved open documents
    const counts = d => {
      const saved = S[d.storeKey] || [];
      return {
        active: saved.filter(x => x.status === 'Active' || !x.status).length,
        completed: saved.filter(x => x.status === 'Completed').length,
        cancelled: saved.filter(x => x.status === 'Cancelled').length
      };
    };
    const th = 'padding: 14px 20px; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; text-align: center; width: 140px;';
    const rowsHtml = DOCS.map((d, i) => {
      const c = counts(d);
      return `
            <tr data-pp-list="${d.key}" data-pp-filter="all" style="${i < DOCS.length - 1 ? 'border-bottom: 1px solid var(--slate-100); ' : ''}transition: background 0.15s; cursor: pointer;" onmouseover="this.style.background='var(--blue-50)'" onmouseout="this.style.background='transparent'">
              <td style="padding: 16px 24px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="width: 36px; height: 36px; border-radius: 8px; background: ${d.overview.bg}; color: ${d.overview.color}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">${d.icon(18)}</div>
                  <div>
                    <div style="font-weight: 700; font-size: 14px; color: var(--slate-800);">${d.kind}</div>
                    <div style="font-size: 12px; color: var(--slate-500);">${d.overviewDesc}</div>
                  </div>
                </div>
              </td>
              <td style="padding: 16px 20px; text-align: center;">
                <span class="badge badge-green" data-pp-list="${d.key}" data-pp-filter="active" style="font-size: 13px; font-weight: 700; min-width: 32px; justify-content: center; padding: 4px 10px; cursor: pointer;">${c.active}</span>
              </td>
              <td style="padding: 16px 20px; text-align: center;">
                <span class="badge badge-blue" data-pp-list="${d.key}" data-pp-filter="completed" style="font-size: 13px; font-weight: 700; min-width: 32px; justify-content: center; padding: 4px 10px; cursor: pointer;">${c.completed}</span>
              </td>
              <td style="padding: 16px 20px; text-align: center;">
                <span data-pp-list="${d.key}" data-pp-filter="cancelled" style="font-size: 13px; font-weight: 700; color: var(--slate-500); padding: 4px 10px; cursor: pointer; border-radius: 6px; display: inline-block;" onmouseover="this.style.background='var(--slate-100)'" onmouseout="this.style.background='transparent'">${c.cancelled}</span>
              </td>
            </tr>`;
    }).join('');
    return `
      <div class="table-card" style="border: 1.5px solid var(--slate-200); border-radius: 12px; overflow: hidden; background: #fff; box-shadow: var(--shadow-sm); width: 100%; box-sizing: border-box;">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background: var(--slate-50); border-bottom: 1.5px solid var(--slate-200);">
              <th style="padding: 14px 24px; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--slate-600);">Pre Purchase</th>
              <th style="${th} color: var(--emerald-700);">Active</th>
              <th style="${th} color: var(--blue-700);">Completed</th>
              <th style="${th} color: var(--slate-500);">Cancelled</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>`;
  }

  function setActiveTab(key) {
    const ids = { overview: 'ppTabOverview' };
    DOCS.forEach(d => { ids[d.key] = `ppTab${d.C}`; });
    Object.entries(ids).forEach(([k, id]) => {
      const btn = $(id);
      if (!btn) return;
      btn.classList.toggle('active', k === key);
      btn.setAttribute('aria-selected', k === key ? 'true' : 'false');
    });
  }

  // A document tab opens a new document of that kind, as on Sales → Pre Invoice
  function switchPurchasePreTab(key) {
    if (key && key !== 'overview' && forms[key]) {
      forms[key].open(null, 'preinvoice');
      return;
    }
    showPurchasePreCard('purchasePreCard');
    setActiveTab('overview');
    const area = $('ppContentArea');
    if (area) area.innerHTML = overviewHtml();
  }

  function showPurchaseHub() {
    switchPurchasePreTab('overview');
  }

  // ══════════════════════════════════════════════════════════════════
  //  SET UP
  // ══════════════════════════════════════════════════════════════════
  function build() {
    const formCard = $('purchaseVoucherFormCard');
    if (!formCard || $('purchasePreCard')) return;
    formCard.insertAdjacentHTML('afterend', hubHtml() + DOCS.map(listCardHtml).join('') + DOCS.map(formCardHtml).join(''));

    DOCS.forEach(d => {
      forms[d.key] = createForm(d);
      lists[d.key] = createPreInvoiceDocList({
        kind: d.kind,
        plural: d.plural,
        noun: d.noun,
        storeKey: d.storeKey,
        draftsKey: d.draftsKey,
        noField: 'docNo',
        noFallback: `${d.code}-XXXX`,
        ids: { prefix: d.P, listCard: `${d.P}ListCard`, contentArea: `${d.P}ListFullContentArea` },
        secondDate: { label: d.secondLabel, get: doc => doc[d.dateField] || doc.dueDate || '' },
        previewDateLabel: d.previewDateLabel,
        supplyLabel: d.supplyPreviewLabel || 'Supply Type:',
        forLabel: d.forLabel,
        partyColumn: 'Vendor',
        preparedLabel: d.preparedLabel,
        emptyText: d.emptyText,
        defaultNotes: d.defaultNotes,
        footerText: d.footerText,
        iconSvg: d.icon,
        moduleName: d.moduleName,
        convertField: 'preDocId',
        linkField: 'sourceDocId',
        openForm: (doc, from) => forms[d.key].open(doc, from),
        exportLabels: {
          pdf: Object.assign({ partyType: 'Vendor' }, d.pdf),
          excel: Object.assign({ partyType: 'Vendor' }, d.excel)
        },
        api: d.api,
        party: { idField: 'vendorId', nameField: 'vendorName', type: 'Vendor', noun: 'vendor', execField: 'executiveName' },
        showCard: showPurchasePreCard,
        backToHub: showPurchaseHub,
        numberKind: d.numberKind,
        hasAdvance: d.advance,
        advanceHooks: d.advance ? { post: (doc, amount) => postAdvanceFor(d, doc, amount) } : { post: () => {} },
        convert: (doc) => convertToPurchase(d, doc),
        convertLabel: 'Convert to Purchase',
        convertTarget: 'a Purchase Voucher',
        // A document reversed by a Purchase Reversal (purchase-reversal.js)
        heal: () => { if (typeof window.healPurchasePreReversals === 'function') window.healPurchasePreReversals(); },
        blockIfReversed: (doc, label) => typeof window.blockIfPurchasePreReversed === 'function' && window.blockIfPurchasePreReversed(doc, label)
      });
      forms[d.key].wire();
    });

    // Pre Purchase card: tabs, and the counts that open each list
    $('ppTabOverview')?.addEventListener('click', e => { e.preventDefault(); switchPurchasePreTab('overview'); });
    DOCS.forEach(d => {
      $(`ppTab${d.C}`)?.addEventListener('click', e => { e.preventDefault(); switchPurchasePreTab(d.key); });
    });
    $('ppContentArea')?.addEventListener('click', e => {
      const hit = e.target.closest('[data-pp-list]');
      if (!hit) return;
      e.stopPropagation();
      if (lists[hit.dataset.ppList]) lists[hit.dataset.ppList].open(hit.dataset.ppFilter || 'all');
    });
    // List cards: Back, and the buttons to the other lists
    document.querySelectorAll('[data-pp-list-back]').forEach(btn => btn.addEventListener('click', e => { e.preventDefault(); showPurchaseHub(); }));
    document.querySelectorAll('[data-pp-open-list]').forEach(btn => btn.addEventListener('click', e => {
      e.preventDefault();
      if (lists[btn.dataset.ppOpenList]) lists[btn.dataset.ppOpenList].open('all');
    }));

    // Header: Pre Purchase opens the card; New Purchase brings the form back
    $('btnPurchasePre')?.addEventListener('click', e => { e.preventDefault(); showPurchaseHub(); });
    $('btnNewPurchase')?.addEventListener('click', () => showPurchaseFormCard());
  }

  // ── Public ──
  window.PURCHASE_PRE_DOCS = DOCS.map(d => ({
    key: d.key, kind: d.kind, short: d.short, storeKey: d.storeKey, draftsKey: d.draftsKey,
    noField: 'docNo', numberKind: d.numberKind, dateField: d.dateField, chip: d.chip, advance: d.advance
  }));
  window.showPurchasePreCard = showPurchasePreCard;
  window.setPurchaseHeaderMode = setHeaderMode;
  window.showPurchaseFormCard = showPurchaseFormCard;
  window.showPurchasePreHub = showPurchaseHub;
  window.switchPurchasePreTab = switchPurchasePreTab;
  window.getPurchaseAdvanceLedgerName = getPurchaseAdvanceLedgerName;
  window.findPrePurchaseVendor = findVendor;
  window.isPurchaseLedgerVendor = isLedgerVendor;
  // Fill New Purchase from a document (Convert to Purchase / the Pre Purchase No. box)
  window.convertPurchasePreToPurchase = function(key, id, opts) {
    const d = docOf(key);
    if (!d) return;
    const S = store();
    const doc = S[d.storeKey].concat(S[d.draftsKey]).find(x => String(x.id) === String(id));
    if (!doc) { toast(`${d.kind} not found.`, 'error'); return; }
    convertToPurchase(d, doc, opts);
  };
  // Called once the purchase made from a document is posted
  window.markPurchasePreDocCompleted = function(key, id) {
    const d = docOf(key);
    if (d && typeof window[d.api.markCompleted] === 'function') window[d.api.markCompleted](id);
  };
  // Opens a document's preview (e.g. from New Purchase's Pre Purchase No. box)
  window.viewPurchasePreDoc = function(key, id) {
    const d = docOf(key);
    if (d && typeof window[d.api.view] === 'function') window[d.api.view](id);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
