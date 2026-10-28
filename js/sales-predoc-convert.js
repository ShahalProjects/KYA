/**
 * js/sales-predoc-convert.js
 * Converting one pre-sales document into another (KYA), forward only:
 *   Quotation        → Proforma Invoice, Sales Order, Delivery Challan
 *   Proforma Invoice → Sales Order, Delivery Challan
 *   Sales Order      → Proforma Invoice, Delivery Challan
 * (each can still Convert to Sale; a Delivery Challan ends only in the Sales Invoice).
 *
 * Like Convert to Sale, the new document's form opens filled from the old one with its own next
 * number, today's date and its own (empty) Terms & Conditions — terms don't come across; the old
 * one is marked Completed once the new one is saved (not on
 * Save Draft). A Delivery Challan starts with no Purpose: it moves goods without a tax invoice
 * only for the purposes CGST Rule 55 allows, so it is chosen on the form.
 *
 * An advance already received (a saved document's receipt entry) is one receipt: it moves to the
 * new document as it is — the same entry, its date and voucher no. kept — and the Sales Invoice
 * adjusts it at the end. It can't move while part of it paid other documents, while Journal
 * Entry money is against the document, or when it came from the customer's credit (Invoice
 * Balance); such a document is converted to Sale instead. A draft has nothing in the books: what
 * it shows as paid comes across as entered.
 *
 * Stored on the new document:
 *   convertedFrom       { kind, store, id, no, label } — the document it was made from
 *   advanceCarriedFrom  { label, no, date, journalEntryId, voucherNo, amount } — the receipt it
 *                       carries (the document the money was first received against)
 */
(function() {
  'use strict';

  const KINDS = {
    quotation: { label: 'Quotation', noun: 'quotation', store: 'quotations', drafts: 'quotationsDrafts', noField: 'quoteNo',
      numberKind: 'quotation', markCompleted: 'markQuotationCompletedOnInvoicePost' },
    proforma: { label: 'Proforma Invoice', noun: 'proforma invoice', short: 'Proforma', store: 'proformaInvoices', drafts: 'proformaInvoicesDrafts',
      noField: 'proformaNo', numberKind: 'proforma', open: 'openProformaForm', markCompleted: 'markProformaCompletedOnInvoicePost' },
    salesOrder: { label: 'Sales Order', noun: 'sales order', short: 'Sales Order', store: 'salesOrders', drafts: 'salesOrdersDrafts',
      noField: 'orderNo', numberKind: 'salesOrder', open: 'openSalesOrderForm', markCompleted: 'markSalesOrderCompletedOnInvoicePost' },
    deliveryChallan: { label: 'Delivery Challan', noun: 'delivery challan', short: 'Delivery Challan', store: 'deliveryChallans', drafts: 'deliveryChallansDrafts',
      noField: 'challanNo', numberKind: 'deliveryChallan', open: 'openDeliveryChallanForm', markCompleted: 'markDeliveryChallanCompletedOnInvoicePost' }
  };

  // Forward only: an offer, a payment request and an order lead on; goods already out on a
  // challan end in the Sales Invoice
  const CONVERT_TARGETS = {
    quotation: ['proforma', 'salesOrder', 'deliveryChallan'],
    proforma: ['salesOrder', 'deliveryChallan'],
    salesOrder: ['proforma', 'deliveryChallan'],
    deliveryChallan: []
  };

  const S = () => window.KYA_STORE || {};
  const r2 = n => Math.round((parseFloat(n) || 0) * 100) / 100;
  const clone = v => (v === undefined || v === null) ? null : JSON.parse(JSON.stringify(v));
  const esc = s => (typeof ohEsc === 'function') ? ohEsc(s) : String(s === null || s === undefined ? '' : s);
  const money = n => (typeof fmtNum === 'function') ? fmtNum(n) : r2(n).toFixed(2);
  const toast = (msg, type) => { if (typeof showToast === 'function') showToast(msg, type); };
  const isOpenDoc = d => !!d && (!d.status || d.status === 'Active' || d.status === 'Draft' || d.isDraft);

  function getSalesPreDocConvertTargets(kind) {
    return (CONVERT_TARGETS[kind] || []).map(to => ({ kind: to, label: KINDS[to].short }));
  }

  function findSaved(kind, id) {
    return (S()[KINDS[kind].store] || []).find(d => d && String(d.id) === String(id)) || null;
  }

  function findAny(kind, id) {
    const k = KINDS[kind];
    return findSaved(kind, id) || (S()[k.drafts] || []).find(d => d && String(d.id) === String(id)) || null;
  }

  // The receipt entry a saved document's advance is recorded in
  function advanceEntryOf(doc) {
    if (!doc || !doc.advanceJournalEntryId || typeof postedEntries === 'undefined') return null;
    return postedEntries.find(e => String(e.id) === String(doc.advanceJournalEntryId)) || null;
  }

  // Why a saved document's advance can't move ('' when it can, or when there is none)
  function advanceBlockReason(kind, doc) {
    const k = KINDS[kind];
    const no = doc[k.noField] || '';
    const used = typeof getPreInvoiceAdvanceUsed === 'function' ? getPreInvoiceAdvanceUsed(k.store, doc.id) : 0;
    if (used > 0.009) return `₹${money(used)} of ${k.label} ${no}'s advance already paid other documents. Convert it to Sale instead.`;
    const journal = typeof getJournalAllocatedTo === 'function' ? getJournalAllocatedTo(k.store, doc.id) : 0;
    if (journal > 0.009) return `Journal Entry money is received against ${k.label} ${no}. Convert it to Sale instead.`;
    if (typeof usesCreditAdjust === 'function' && usesCreditAdjust(doc.paymentAccountId, doc.paymentSplits)) {
      return `${k.label} ${no}'s advance came from the customer's credit (Invoice Balance). Convert it to Sale instead.`;
    }
    return '';
  }

  // The advance a conversion takes along: { carried } for a saved receipt, { entered } for what a
  // draft shows as paid, { blocked } when it can't move
  function getAdvanceToMove(kind, doc) {
    if (kind === 'quotation') return {};
    const saved = findSaved(kind, doc.id);
    if (!saved) {
      // A draft: nothing in the books. Its payment comes across as entered (not a customer credit)
      const fromCredit = typeof usesCreditAdjust === 'function' && usesCreditAdjust(doc.paymentAccountId, doc.paymentSplits);
      if (fromCredit || !doc.paymentStatus || doc.paymentStatus === 'Not Paid') return {};
      return { entered: true };
    }
    const entry = advanceEntryOf(saved);
    const amount = r2(saved.advancePaidAmount);
    if (!entry || amount <= 0) return {};
    const reason = advanceBlockReason(kind, saved);
    if (reason) return { blocked: reason };
    const k = KINDS[kind];
    // The document the money was first received against stays named, however far it moves
    const first = saved.advanceCarriedFrom || { label: k.label, no: saved[k.noField] || '', date: entry.date };
    return {
      carried: {
        label: first.label, no: first.no, date: first.date || entry.date,
        journalEntryId: entry.id, voucherNo: saved.advanceVoucherNo || entry.voucherNo || '', amount
      }
    };
  }

  // The new document's form, filled from the old one: a new document of its own (number, date)
  function buildPrefill(fromKind, doc, toKind, move) {
    const from = KINDS[fromKind];
    const to = KINDS[toKind];
    const fromNo = doc[from.noField] || '';
    const pay = (move.carried || move.entered) ? {
      paymentStatus: doc.paymentStatus || 'Not Paid',
      paymentAccountId: doc.paymentAccountId || '',
      paymentAccountName: doc.paymentAccountName || '',
      paymentAmount: move.carried ? move.carried.amount : (doc.paymentAmount || ''),
      paymentSplits: clone(doc.paymentSplits) || []
    } : { paymentStatus: 'Not Paid', paymentAccountId: '', paymentAccountName: '', paymentAmount: '', paymentSplits: [] };

    return Object.assign({
      id: Date.now(),
      isConversion: true,
      [to.noField]: typeof getNextDocNo === 'function' ? getNextDocNo(to.numberKind) : '',
      date: kyaLocalIso(),
      customerId: doc.customerId,
      customerName: doc.customerName,
      // Customer details changed on the document carry over
      partyOverride: clone(doc.partyOverride),
      // A challan's box is its purpose, chosen on its form
      supplyType: toKind === 'deliveryChallan' ? '' : (doc.supplyType || 'Intra-State (CGST + SGST)'),
      salesExecutiveId: doc.salesExecutiveId || '',
      salesExecutiveName: doc.salesExecutiveName || '',
      rows: clone(doc.rows) || [],
      subTotal: doc.subTotal,
      total: doc.total,
      adjustments: doc.adjustments || 0,
      tdsTcsMode: doc.tdsTcsMode || 'None',
      tdsTcsRate: doc.tdsTcsRate || 0,
      tdsTcsAmount: doc.tdsTcsAmount || 0,
      // Each document has its own Terms & Conditions — the old one's don't come across; where it
      // came from, and its own Narration, go into the Narration
      notes: '',
      narration: `Converted from ${from.label} ${fromNo}. ${doc.narration || ''}`.trim(),
      document: clone(doc.document),
      creditAdjustments: [],
      createdAt: Date.now(),
      status: 'Active',
      convertedFrom: { kind: fromKind, store: from.store, id: doc.id, no: fromNo, label: from.label },
      advanceCarriedFrom: move.carried || null
    }, pay);
  }

  // ── Convert to Proforma / Sales Order / Delivery Challan (the preview's buttons) ──
  // closePreview: shuts the preview once the conversion is confirmed
  function convertSalesPreDoc(fromKind, doc, toKind, closePreview) {
    const from = KINDS[fromKind];
    const to = KINDS[toKind];
    if (!from || !to || (CONVERT_TARGETS[fromKind] || []).indexOf(toKind) < 0 || !doc) return;
    const current = findAny(fromKind, doc.id) || doc;
    const fromNo = current[from.noField] || '';
    if (!isOpenDoc(current)) {
      toast(`${from.label} ${fromNo} is ${String(current.status || '').toLowerCase()} and can't be converted.`, 'warning');
      return;
    }
    if (typeof blockIfPreInvoiceReversed === 'function' && blockIfPreInvoiceReversed(current, `${from.label} ${fromNo}`)) return;
    const move = getAdvanceToMove(fromKind, current);
    if (move.blocked) { toast(move.blocked, 'warning'); return; }

    const article = /^[aeiou]/i.test(to.label) ? 'an' : 'a';
    const advanceLine = move.carried
      ? `<br>Its advance of ₹${esc(money(move.carried.amount))}${move.carried.voucherNo ? ` (${esc(move.carried.voucherNo)})` : ''} moves to the ${to.noun}.`
      : '';
    const run = () => {
      if (typeof closePreview === 'function') closePreview();
      const open = window[to.open];
      if (typeof open !== 'function') return;
      // Sales Voucher → Pre Invoice, then the new document's form
      if (typeof openTab === 'function') openTab('sales_voucher');
      currentSalesVoucherSubtype = 'PreInvoice';
      window._editingSalesInvoice = null;
      if (typeof updateVoucherSubtypeUI === 'function') updateVoucherSubtypeUI();
      open(buildPrefill(fromKind, current, toKind, move), 'preinvoice');
      if (toKind === 'deliveryChallan') {
        const purpose = document.getElementById('challanSupplyType');
        if (purpose) purpose.value = '';
      }
      toast(`${from.label} ${fromNo} loaded into a new ${to.label}${toKind === 'deliveryChallan' ? ' — choose its Purpose' : ''}. Save it to complete the conversion.`, 'info');
    };

    if (typeof showKyaConfirm !== 'function') { run(); return; }
    showKyaConfirm({
      title: `Convert to ${to.short}?`,
      message: `Convert ${from.noun} <strong>${esc(fromNo)}</strong> to ${article} ${to.label}?<br>It will be marked Completed once the ${to.noun} is saved.${advanceLine}`,
      confirmLabel: `Convert to ${to.short}`,
      okBg: '#2563eb',
      iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 14h8M13 11l3 3-3 3"/></svg>',
      onConfirm: run
    });
  }

  // ── On saving the new document (not as a draft), before its advance is posted ──
  // The receipt it carries becomes its own advance entry. If the old document no longer holds it
  // (converted elsewhere, invoiced, cancelled, or its advance since used), the new document is
  // saved without it. Returns false to stop the save.
  function takeOverConvertedAdvance(data) {
    const carried = data && data.advanceCarriedFrom;
    if (!carried || !carried.journalEntryId) return true;
    if (data.advanceJournalEntryId && String(data.advanceJournalEntryId) === String(carried.journalEntryId)) return true;

    const src = data.convertedFrom || {};
    const old = src.kind && KINDS[src.kind] ? findSaved(src.kind, src.id) : null;
    const entryThere = typeof postedEntries !== 'undefined' && postedEntries.some(e => String(e.id) === String(carried.journalEntryId));
    const stillHeld = old && isOpenDoc(old) && entryThere
      && String(old.advanceJournalEntryId) === String(carried.journalEntryId) && !advanceBlockReason(src.kind, old);
    if (!stillHeld) {
      data.advanceCarriedFrom = null;
      data.paymentStatus = 'Not Paid';
      data.paymentAccountId = '';
      data.paymentAccountName = '';
      data.paymentAmount = 0;
      data.paymentSplits = [];
      toast(`The advance received against ${carried.label} ${carried.no} is no longer free to move — saved without it.`, 'warning');
      return true;
    }

    const total = r2(data.total);
    const paid = data.paymentStatus === 'Full Payment' ? total
      : (data.paymentStatus === 'Partial Payment' ? r2(data.paymentAmount) : 0);
    if (paid < r2(carried.amount) - 0.005) {
      toast(`The advance of ₹${money(carried.amount)} received against ${carried.label} ${carried.no} moves with this document — its advance can't be less than that.`, 'warning');
      return false;
    }
    data.advanceJournalEntryId = carried.journalEntryId;
    data.advanceVoucherNo = carried.voucherNo || null;
    return true;
  }

  // ── Once the new document is saved (not as a draft): the old one is Completed ──
  function completeConvertedSource(data) {
    const src = data && data.convertedFrom;
    if (!src || !KINDS[src.kind]) return;
    const old = findAny(src.kind, src.id);
    if (!old || !isOpenDoc(old)) return;
    const mark = window[KINDS[src.kind].markCompleted];
    if (typeof mark === 'function') mark(src.id);
  }

  // ══════════════════════════════════════════════════════════════════
  //  "Pre Invoice No." box on the Proforma / Sales Order / Delivery Challan forms — the Sales
  //  Invoice's box (sales-preinvoice-picker.js): it lists the open documents this one may be
  //  made from, and loading one fills the form as its Convert button does (the form keeps its
  //  own number and date). While one is loaded it fixes the Customer, and the Sales Executive
  //  when it names one. A stored document shows what it was made from and keeps it.
  // ══════════════════════════════════════════════════════════════════
  const PICKER_FORMS = {
    proforma: { prefix: 'proforma', init: 'initProformaForm', dateId: 'proformaDate', noId: 'proformaNo',
      chipId: 'proformaChipDisplay', execId: 'proformaSalesExecutive', card: 'salesProformaFormCard' },
    salesOrder: { prefix: 'order', init: 'initSalesOrderForm', dateId: 'orderDate', noId: 'orderNo',
      chipId: 'orderChipDisplay', execId: 'orderSalesExecutive', card: 'salesOrderFormCard' },
    deliveryChallan: { prefix: 'challan', init: 'initDeliveryChallanForm', dateId: 'challanDate', noId: 'challanNo',
      chipId: 'challanChipDisplay', execId: 'challanSalesExecutive', card: 'salesDeliveryChallanFormCard' }
  };
  // The document open on each form, as its init got it (null for a new one)
  const _pickerDoc = {};

  const $id = id => document.getElementById(id);
  const pickEl = (toKind, part) => $id(PICKER_FORMS[toKind].prefix + part);
  const hideCard = () => { if (typeof window.hidePreInvoiceDetailsCard === 'function') window.hidePreInvoiceDetailsCard(); };
  const kindOfStore = store => Object.keys(KINDS).find(k => KINDS[k].store === store);
  // A new document (or one being converted) can load a pre invoice; a stored one keeps its own
  const isNewOnForm = doc => !doc || !!doc.isConversion;

  // The kinds a form's box lists: the ones that may become this document
  function sourceKindsFor(toKind) {
    return Object.keys(CONVERT_TARGETS).filter(k => CONVERT_TARGETS[k].indexOf(toKind) > -1);
  }

  // The Sales Invoice box's type label and colours for a kind
  function srcOfKind(kind) {
    const k = KINDS[kind];
    const shared = (Array.isArray(window._preInvoiceSources) ? window._preInvoiceSources : []).find(s => s.store === k.store);
    return shared || { type: k.label, store: k.store, drafts: k.drafts, noField: k.noField, color: 'var(--blue-700)', bg: 'var(--blue-50)' };
  }

  // The document the open form was made from: { kind, src, doc, isDraft, docNo, locked }
  function getPickerLinked(toKind) {
    const open = _pickerDoc[toKind];
    const from = open && open.convertedFrom;
    if (!from || !KINDS[from.kind]) return null;
    const k = KINDS[from.kind];
    const saved = findSaved(from.kind, from.id);
    const doc = saved || (S()[k.drafts] || []).find(d => d && String(d.id) === String(from.id)) || null;
    return {
      kind: from.kind, src: srcOfKind(from.kind), doc, isDraft: !!doc && !saved,
      docNo: (doc && doc[k.noField]) || from.no || '', locked: !isNewOnForm(open)
    };
  }

  function closePicker(toKind) {
    const dd = pickEl(toKind, 'PreInvoiceSelectDropdown');
    if (dd) dd.style.display = 'none';
    hideCard();
  }

  function renderPickerOptions(toKind, filter) {
    const list = pickEl(toKind, 'PreInvoiceSelectOptionsList');
    if (!list) return;
    list.innerHTML = '';
    const stores = sourceKindsFor(toKind).map(k => KINDS[k].store);
    const q = (filter || '').toLowerCase().trim();
    const custEl = pickEl(toKind, 'Customer');
    const selectedCustomer = custEl ? custEl.value : '';
    const all = typeof window.getActivePreInvoices === 'function' ? window.getActivePreInvoices() : [];
    const items = all.filter(({ src, doc }) => stores.indexOf(src.store) > -1 && (!q ||
      [doc[src.noField], doc.customerName, src.type, doc.date, String(doc.total || '')]
        .concat(Array.isArray(doc.rows) ? doc.rows.map(r => r.item) : [])
        .some(v => (v || '').toLowerCase().includes(q))));

    // The chosen customer's documents first, then newest first
    items.sort((a, b) => {
      const ma = selectedCustomer && String(a.doc.customerId) === String(selectedCustomer) ? 0 : 1;
      const mb = selectedCustomer && String(b.doc.customerId) === String(selectedCustomer) ? 0 : 1;
      if (ma !== mb) return ma - mb;
      const d = (b.doc.date || '').localeCompare(a.doc.date || '');
      return d !== 0 ? d : (Number(b.doc.id) || 0) - (Number(a.doc.id) || 0);
    });

    if (items.length === 0) {
      list.innerHTML = `<div style="padding: 12px; text-align: center; font-size: 12.5px; color: var(--slate-400);">${q ? 'No active pre invoice matches your search' : 'No active pre invoices'}</div>`;
      return;
    }

    // Just the number and type; the rest shows in a card while hovering
    items.forEach(({ src, doc, isDraft }) => {
      const item = document.createElement('div');
      item.setAttribute('role', 'option');
      item.style.cssText = 'padding: 7px 10px; font-size: 13px; border-radius: 6px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 10px;';
      item.innerHTML = `
        <span style="font-family: monospace; font-weight: 800; color: var(--slate-800); white-space: nowrap;">${esc(doc[src.noField] || '—')}</span>
        <span style="flex-shrink: 0; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; color: ${src.color}; background: ${src.bg}; text-transform: uppercase;">${src.type}</span>`;
      item.addEventListener('mouseenter', () => {
        item.style.background = 'var(--slate-50)';
        if (typeof window.showPreInvoiceDetailsCard === 'function') window.showPreInvoiceDetailsCard(item, src, doc, isDraft);
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = 'transparent';
        hideCard();
      });
      item.addEventListener('click', () => {
        closePicker(toKind);
        pickPreDoc(toKind, kindOfStore(src.store), doc);
      });
      list.appendChild(item);
    });
  }

  function openPicker(toKind) {
    const dd = pickEl(toKind, 'PreInvoiceSelectDropdown');
    if (!dd || !isNewOnForm(_pickerDoc[toKind])) return;
    hideCard();
    dd.style.display = 'flex';
    const search = pickEl(toKind, 'PreInvoiceSelectSearch');
    if (search) search.value = '';
    renderPickerOptions(toKind, '');
    if (search) search.focus();
  }

  // Lines already typed on the form would be replaced, so the confirmation says so
  function formHasContent(toKind) {
    return Array.from(document.querySelectorAll(`#${PICKER_FORMS[toKind].card} .sales-row-item`))
      .some(inp => (inp.value || '').trim());
  }

  // Load a document into the form — the same checks and filling as its Convert button
  function pickPreDoc(toKind, fromKind, doc) {
    const to = KINDS[toKind];
    const from = KINDS[fromKind];
    const form = PICKER_FORMS[toKind];
    if (!to || !from || !doc) return;
    const current = findAny(fromKind, doc.id) || doc;
    const fromNo = current[from.noField] || '';
    if (!isOpenDoc(current)) {
      toast(`${from.label} ${fromNo} is ${String(current.status || '').toLowerCase()} and can't be loaded.`, 'warning');
      return;
    }
    if (typeof blockIfPreInvoiceReversed === 'function' && blockIfPreInvoiceReversed(current, `${from.label} ${fromNo}`)) return;
    const move = getAdvanceToMove(fromKind, current);
    if (move.blocked) { toast(move.blocked, 'warning'); return; }

    const execEl = $id(form.execId);
    const keepExec = execEl ? execEl.value : '';
    const run = () => {
      const dateEl = $id(form.dateId);
      const noEl = $id(form.noId);
      const prefill = buildPrefill(fromKind, current, toKind, move);
      if (dateEl && dateEl.value) prefill.date = dateEl.value;
      if (noEl && noEl.value.trim()) prefill[to.noField] = noEl.value.trim();
      // A document with no Sales Executive leaves the one already chosen
      if (!prefill.salesExecutiveId && keepExec) prefill.salesExecutiveId = keepExec;
      const init = window[form.init];
      if (typeof init !== 'function') return;
      init(prefill);
      if (toKind === 'deliveryChallan') {
        const purpose = $id('challanSupplyType');
        if (purpose) purpose.value = '';
      }
      toast(`${from.label} ${fromNo} loaded${toKind === 'deliveryChallan' ? ' — choose its Purpose' : ''}. It is marked Completed when this ${to.noun} is saved.`, 'info');
    };
    if (typeof showKyaConfirm !== 'function') { run(); return; }

    // Always confirm, showing what will come in
    const notes = [];
    if (move.carried) notes.push(`Its advance of ₹${esc(money(move.carried.amount))}${move.carried.voucherNo ? ` (${esc(move.carried.voucherNo)})` : ''} moves to this ${to.noun}.`);
    if (formHasContent(toKind)) notes.push('The lines already entered will be replaced.');
    notes.push(`It is marked Completed only when this ${to.noun} is saved.`);
    showKyaConfirm({
      title: 'Load Pre Invoice?',
      message: `Load ${from.label} <strong>${esc(fromNo)}</strong> for <strong>${esc(current.customerName || 'Customer')}</strong> (₹${esc(money(current.total))}) into this ${to.noun}?<br>${notes.join('<br>')}`,
      confirmLabel: 'Load',
      okBg: '#2563eb',
      iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 14h8M13 11l3 3-3 3"/></svg>',
      onConfirm: run
    });
  }

  // ── × : take the loaded document off — everything it filled in goes and the form is a blank
  // new document again, keeping its own date and number ──
  function removePickerLink(toKind) {
    const linked = getPickerLinked(toKind);
    if (!linked || linked.locked) return;
    closePicker(toKind);
    const to = KINDS[toKind];
    const form = PICKER_FORMS[toKind];
    const run = () => {
      const dateEl = $id(form.dateId);
      const noEl = $id(form.noId);
      const keepDate = dateEl ? dateEl.value : '';
      const keepNo = noEl ? noEl.value : '';
      const init = window[form.init];
      if (typeof init === 'function') init(null); // also drops the link
      if (dateEl && keepDate) dateEl.value = keepDate;
      if (noEl && keepNo) {
        noEl.value = keepNo;
        if ($id(form.chipId)) $id(form.chipId).textContent = keepNo;
        if (typeof validateDocNoField === 'function') validateDocNoField(to.numberKind);
      }
      toast(`${linked.src.type} ${linked.docNo || ''} removed from this ${to.noun}.`, 'info');
    };
    if (typeof showKyaConfirm !== 'function') { run(); return; }
    showKyaConfirm({
      title: 'Remove Pre Invoice?',
      message: `Remove ${linked.src.type} <strong>${esc(linked.docNo || '')}</strong> from this ${to.noun}?<br>Everything it filled in — customer, Sales Executive, items, tax, advance, notes — will be cleared.`,
      confirmLabel: 'Remove',
      okBg: 'var(--red-600)',
      onConfirm: run
    });
  }

  // ── A loaded document fixes the Customer, and the Sales Executive when it names one (as on the
  // Sales Invoice); undoes only what it locked (data-pre-inv-locked) ──
  function setPickerSelectLock(el, locked, title) {
    if (!el) return;
    if (locked) {
      el.disabled = true;
      el.style.backgroundColor = 'var(--slate-50)';
      el.style.cursor = 'not-allowed';
      el.title = title;
      el.dataset.preInvLocked = '1';
    } else if (el.dataset.preInvLocked) {
      el.disabled = false;
      el.style.backgroundColor = '';
      el.style.cursor = '';
      el.title = '';
      delete el.dataset.preInvLocked;
    }
  }

  function applyPickerLock(toKind, linked) {
    const custEl = pickEl(toKind, 'Customer');
    const custTrigger = pickEl(toKind, 'CustomerSelectTrigger');
    const execEl = $id(PICKER_FORMS[toKind].execId);
    const from = linked ? `${linked.src.type} ${linked.docNo || ''}`.trim() : '';
    setPickerSelectLock(custEl, !!linked, `Customer of ${from}`);
    setPickerSelectLock(execEl, !!(linked && linked.doc && linked.doc.salesExecutiveId), `Sales Executive of ${from}`);
    if (!custTrigger) return;
    if (linked) {
      // Same look as the Sales Invoice's locked box; hovering still shows the Customer Details card
      if (typeof guardSalesCustomerTrigger === 'function') guardSalesCustomerTrigger(custTrigger);
      custTrigger.dataset.locked = '1';
      custTrigger.dataset.preInvLocked = '1';
      custTrigger.style.backgroundColor = 'var(--slate-50)';
      custTrigger.style.cursor = 'default';
      custTrigger.style.opacity = '0.7';
    } else if (custTrigger.dataset.preInvLocked) {
      custTrigger.dataset.locked = '';
      delete custTrigger.dataset.preInvLocked;
      custTrigger.style.backgroundColor = '#fff';
      custTrigger.style.cursor = 'pointer';
      custTrigger.style.opacity = '1';
    }
  }

  // Called at the end of each form's init with the document it opened (null for a new one)
  function refreshSalesPreDocPicker(toKind, docOnForm) {
    if (!PICKER_FORMS[toKind]) return;
    _pickerDoc[toKind] = docOnForm || null;
    const text = pickEl(toKind, 'PreInvoiceSelectTriggerText');
    const trigger = pickEl(toKind, 'PreInvoiceSelectTrigger');
    if (!text || !trigger) return;
    closePicker(toKind);

    const linked = getPickerLinked(toKind);
    const isNew = isNewOnForm(_pickerDoc[toKind]);
    if (linked) {
      // Number and type only; hovering shows the details card
      text.innerHTML = `<span style="font-family: monospace; font-weight: 800; color: var(--slate-800);">${esc(linked.docNo)}</span> <span style="font-size: 11px; color: ${linked.src.color};">${esc(linked.src.type)}</span>`;
      trigger.title = '';
    } else {
      const labels = sourceKindsFor(toKind).map(k => KINDS[k].label);
      text.textContent = '— Select —';
      trigger.title = isNew
        ? `Load an active ${labels.length > 1 ? labels.slice(0, -1).join(', ') + ' or ' + labels[labels.length - 1] : labels[0]}`
        : '';
    }
    trigger.style.cursor = isNew ? 'pointer' : 'default';
    // × to take the document off again — not on a stored document, which keeps it
    const clearBtn = pickEl(toKind, 'PreInvoiceClearBtn');
    if (clearBtn) clearBtn.style.display = (linked && !linked.locked) ? '' : 'none';
    applyPickerLock(toKind, linked);
  }

  function wirePicker(toKind) {
    const trigger = pickEl(toKind, 'PreInvoiceSelectTrigger');
    const dd = pickEl(toKind, 'PreInvoiceSelectDropdown');
    const search = pickEl(toKind, 'PreInvoiceSelectSearch');
    if (!trigger || !dd || trigger._wired) return;
    trigger._wired = true;

    trigger.addEventListener('click', e => {
      e.stopPropagation();
      if (dd.style.display === 'flex') closePicker(toKind);
      else openPicker(toKind);
    });
    trigger.addEventListener('keydown', e => {
      if (e.target !== trigger) return; // keys on the × are its own
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(toKind); }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removePickerLink(toKind); }
    });
    const clearBtn = pickEl(toKind, 'PreInvoiceClearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', e => {
        e.stopPropagation(); // not the box's own click, which opens the list
        hideCard();
        removePickerLink(toKind);
      });
      // Over the × the details card would cover what it removes
      clearBtn.addEventListener('mouseenter', hideCard);
    }
    // Hovering the box shows the loaded document's details (not while the list is open)
    trigger.addEventListener('mouseenter', () => {
      if (dd.style.display === 'flex') return;
      const linked = getPickerLinked(toKind);
      if (linked && linked.doc && typeof window.showPreInvoiceDetailsCard === 'function') {
        window.showPreInvoiceDetailsCard(trigger, linked.src, linked.doc, linked.isDraft);
      }
    });
    trigger.addEventListener('mouseleave', hideCard);
    if (search) {
      search.addEventListener('input', () => renderPickerOptions(toKind, search.value));
      search.addEventListener('keydown', e => {
        if (e.key === 'Escape') closePicker(toKind);
        if (e.key === 'Enter') {
          const first = pickEl(toKind, 'PreInvoiceSelectOptionsList')?.querySelector('[role="option"]');
          if (first) { e.preventDefault(); first.click(); }
        }
      });
    }
    dd.addEventListener('click', e => e.stopPropagation());
    document.addEventListener('click', () => closePicker(toKind));
  }

  function wirePickers() {
    Object.keys(PICKER_FORMS).forEach(wirePicker);
  }

  window.getSalesPreDocConvertTargets = getSalesPreDocConvertTargets;
  window.convertSalesPreDoc = convertSalesPreDoc;
  window.takeOverConvertedAdvance = takeOverConvertedAdvance;
  window.completeConvertedSource = completeConvertedSource;
  window.refreshSalesPreDocPicker = refreshSalesPreDocPicker;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wirePickers);
  } else {
    wirePickers();
  }
})();
