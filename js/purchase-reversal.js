/**
 * js/purchase-reversal.js
 * Purchase Voucher → Reversal (KYA), the mirror of Sales → Reversal: the "Original Doc"
 * box lists the posted purchases that still have something left to reverse and every
 * active Pre Purchase document (purchase-pre.js). Picking one fills the reversal on the
 * purchase form (purchase-form.js) after a confirmation:
 *  - a purchase: its lines not reversed yet (only the quantity / a ₹ discount can change),
 *    vendor, supply type, Purchaser and TDS / TCS fixed; the refund the supplier makes is
 *    capped at what was paid on it, less earlier refunds
 *  - a Pre Purchase document: reversed whole — no purchase or GST to undo, only its advance
 *    to settle; posting cancels the document, deleting the reversal makes it active again
 */
(function() {
  'use strict';

  const $ = id => document.getElementById(id);
  const r2 = n => Math.round((parseFloat(n) || 0) * 100) / 100;
  const norm = s => String(s || '').trim().toLowerCase();

  function esc(str) {
    if (typeof ohEsc === 'function') return ohEsc(str);
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function fmt(n) {
    if (typeof fmtNum === 'function') return fmtNum(n);
    return (parseFloat(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const store = () => window.KYA_STORE || {};
  const preDocs = () => window.PURCHASE_PRE_DOCS || [];
  const PURCHASE_SRC = { type: 'Purchase', color: '#0f766e', bg: '#f0fdfa' };

  // ── Purchases ──
  function findPostedPurchase(id) {
    return (store().purchaseVouchers || []).find(v => v && !v.isReturn && String(v.id) === String(id)) || null;
  }

  // The posted reversals of a purchase (a draft hasn't taken anything back yet)
  function reversalsOf(orig, excludeReturnId) {
    return (store().purchaseVouchers || []).filter(v => v && v.isReturn && !v.reversedPreDoc
      && (String(v.returnAgainstId || '') === String(orig.id)
        || (!v.returnAgainstId && norm(v.returnAgainstInvoice) === norm(orig.invoiceNo)))
      && (excludeReturnId === null || excludeReturnId === undefined || String(v.id) !== String(excludeReturnId)));
  }

  // The purchase's lines with what earlier reversals took back left out (each reversal line
  // points at its purchase line by origIndex; older ones by item name)
  function getPurchaseRemainingRows(orig, excludeReturnId) {
    if (!orig || !Array.isArray(orig.rows)) return [];
    const remaining = JSON.parse(JSON.stringify(orig.rows)).map((r, i) => Object.assign(r, { origIndex: i }));
    const reduced = new Set();
    reversalsOf(orig, excludeReturnId).forEach(ret => {
      (ret.rows || []).forEach(rr => {
        const match = (rr.origIndex !== undefined && remaining[rr.origIndex]) ? remaining[rr.origIndex]
          : remaining.find(r => norm(r.item) === norm(rr.item));
        if (!match) return;
        match.qty = Math.max(0, r2((parseFloat(match.qty) || 0) - (parseFloat(rr.qty) || 0)));
        if (match.discountType !== 'pct') match.discount = Math.max(0, r2((parseFloat(match.discount) || 0) - (parseFloat(rr.discount) || 0)));
        reduced.add(match);
      });
    });
    // A line partly reversed already: its amount is for what is left, not the whole line
    reduced.forEach(r => {
      const base = (parseFloat(r.qty) || 0) * (parseFloat(r.rate) || 0);
      const discAmt = r.discountType === 'pct' ? base * ((parseFloat(r.discount) || 0) / 100) : (parseFloat(r.discount) || 0);
      r.amount = r2(Math.max(0, base - discAmt) * (1 + (parseFloat(r.tax) || 0) / 100));
    });
    return remaining;
  }

  // What was paid on the purchase, less what earlier reversals got refunded
  function getPurchaseRefundable(orig, excludeReturnId) {
    if (!orig) return 0;
    const paid = typeof getPurchasePaidAmount === 'function' ? getPurchasePaidAmount(orig) : 0;
    const refunded = reversalsOf(orig, excludeReturnId)
      .filter(v => v.paymentStatus === 'Full Refund' || v.paymentStatus === 'Partial Refund')
      .reduce((s, v) => s + (parseFloat(v.paymentAmount) || 0), 0);
    return Math.max(0, r2(paid - refunded));
  }

  function getReversiblePurchases() {
    return (store().purchaseVouchers || [])
      .filter(v => v && !v.isReturn && !v.isDraft && getPurchaseRemainingRows(v).some(r => (parseFloat(r.qty) || 0) > 0))
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (Number(b.id) || 0) - (Number(a.id) || 0));
  }

  // ── Pre Purchase documents ──
  function findPreDoc(kind, id) {
    const d = preDocs().find(x => x.key === kind);
    if (!d) return null;
    const doc = (store()[d.storeKey] || []).find(x => String(x.id) === String(id));
    return doc ? { d, doc } : null;
  }

  // A reversed document is Cancelled with `reversedBy`; once that reversal is deleted (from
  // any screen) or points at another document, the document is Active again
  function healPurchasePreReversals() {
    const vouchers = store().purchaseVouchers || [];
    preDocs().forEach(d => {
      (store()[d.storeKey] || []).forEach(doc => {
        if (!doc || !doc.reversedBy) return;
        const v = vouchers.find(x => String(x.id) === String(doc.reversedBy.voucherId));
        if (v && v.reversedPreDoc && v.reversedPreDoc.kind === d.key && String(v.reversedPreDoc.id) === String(doc.id)) return;
        delete doc.reversedBy;
        doc.status = 'Active';
        doc.updatedAt = Date.now();
      });
    });
  }

  // Reopen / edit / delete are closed to a reversed document: the reversal owns it
  function blockIfPurchasePreReversed(doc, label) {
    healPurchasePreReversals();
    if (!doc || !doc.reversedBy) return false;
    if (typeof showToast === 'function') {
      showToast(`${label || 'This document'} was reversed by Purchase Reversal ${doc.reversedBy.no || ''}. Delete that reversal to reopen it.`, 'warning');
    }
    return true;
  }

  // The advance still on the books for a document (its payment entry must exist)
  function getPreDocAdvance(doc) {
    if (!doc || !doc.advanceJournalEntryId || typeof postedEntries === 'undefined') return 0;
    const entry = postedEntries.find(e => String(e.id) === String(doc.advanceJournalEntryId));
    return entry ? Math.max(0, r2(doc.advancePaidAmount)) : 0;
  }

  // Whether the advance went into the vendor's own ledger (a ledger-only vendor) rather than
  // Advances to Suppliers
  function isAdvanceInVendorLedger(doc, vendorName) {
    if (!doc || !doc.advanceJournalEntryId || typeof postedEntries === 'undefined') return false;
    const entry = postedEntries.find(e => String(e.id) === String(doc.advanceJournalEntryId));
    const name = norm(vendorName || doc.vendorName);
    return !!entry && !!name && (entry.allRows || []).some(r => (parseFloat(r.debit) || 0) > 0 && norm(r.particular) === name);
  }

  function getReversiblePreDocs() {
    healPurchasePreReversals();
    const out = [];
    preDocs().forEach(d => {
      (store()[d.storeKey] || []).forEach(doc => {
        if (!doc.status || doc.status === 'Active') out.push({ d, doc });
      });
    });
    return out.sort((a, b) => (b.doc.date || '').localeCompare(a.doc.date || '') || (Number(b.doc.id) || 0) - (Number(a.doc.id) || 0));
  }

  // ── The reversal a source fills in (handed to loadPurchaseVoucher) ──
  function buildFromPurchase(orig) {
    const rows = getPurchaseRemainingRows(orig)
      .filter(r => (parseFloat(r.qty) || 0) > 0)
      .map(r => Object.assign(r, { origQty: r.qty, origDiscount: r.discount }));
    return {
      id: Date.now(),
      isReturn: true,
      returnSource: { type: 'purchase', id: orig.id, no: orig.invoiceNo, date: orig.date },
      invoiceNo: '',
      date: (typeof window.kyaLocalIso === 'function') ? window.kyaLocalIso(new Date()) : '',
      vendorId: orig.vendorId,
      vendorName: orig.vendorName,
      partyOverride: orig.partyOverride ? JSON.parse(JSON.stringify(orig.partyOverride)) : null,
      supplyType: orig.supplyType,
      executiveId: orig.executiveId || '',
      rows,
      tdsTcsMode: orig.tdsTcsMode || 'None',
      tdsTcsRate: orig.tdsTcsRate || 0,
      adjustments: orig.adjustments || 0,
      notes: `Reversal of Purchase ${orig.invoiceNo}.`,
      paymentStatus: 'No Refund',
      // The refund goes back to the account the purchase was paid from
      presetRefund: { accountId: orig.paymentAccountId || '', splits: orig.paymentSplits || [] }
    };
  }

  function buildFromPreDoc(d, doc) {
    const party = typeof window.findPrePurchaseVendor === 'function' ? window.findPrePurchaseVendor(doc.vendorId) : null;
    const vendorName = (party && party.name) || doc.vendorName || '';
    const supplyTypes = ['Intra-State (CGST + SGST)', 'Inter-State (IGST)', 'Import (Customs / Zero-Rated)', 'SEZ With Tax', 'SEZ Without Tax', 'Deemed Export'];
    return {
      id: Date.now(),
      isReturn: true,
      returnSource: {
        type: 'pre', kind: d.key, id: doc.id, no: doc.docNo, date: doc.date, label: d.kind,
        advance: getPreDocAdvance(doc),
        advanceJournalEntryId: doc.advanceJournalEntryId || null,
        advanceVoucherNo: doc.advanceVoucherNo || null,
        inPartyLedger: isAdvanceInVendorLedger(doc, vendorName)
      },
      invoiceNo: '',
      date: (typeof window.kyaLocalIso === 'function') ? window.kyaLocalIso(new Date()) : '',
      vendorId: doc.vendorId,
      vendorName: doc.vendorName,
      partyOverride: doc.partyOverride ? JSON.parse(JSON.stringify(doc.partyOverride)) : null,
      supplyType: supplyTypes.includes(doc.supplyType) ? doc.supplyType : 'Intra-State (CGST + SGST)',
      executiveId: doc.executiveId || '',
      rows: Array.isArray(doc.rows) ? JSON.parse(JSON.stringify(doc.rows)) : [],
      tdsTcsMode: doc.tdsTcsMode || 'None',
      tdsTcsRate: doc.tdsTcsRate || 0,
      tdsTcsAmount: doc.tdsTcsAmount || 0,
      adjustments: doc.adjustments || 0,
      notes: `Reversal of ${d.kind} ${doc.docNo || ''}.`,
      paymentStatus: 'No Refund',
      // The advance goes back the way it was paid
      presetRefund: { accountId: doc.paymentAccountId || '', splits: doc.paymentSplits || [] }
    };
  }

  // ── Original Doc box ──
  function currentSourceNo() {
    const t = ($('purchaseInvoiceSelectTriggerText') || {}).textContent || '';
    return t.trim() === '— Select —' ? '' : t.trim();
  }

  function sectionHeader(text) {
    const h = document.createElement('div');
    h.style.cssText = 'padding: 6px 10px 2px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--slate-400);';
    h.textContent = text;
    return h;
  }

  function optionItem(no, src, onHover, onPick) {
    const item = document.createElement('div');
    item.setAttribute('role', 'option');
    item.style.cssText = 'padding: 8px 12px; font-size: 13px; border-radius: 6px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 10px;';
    item.innerHTML = `
      <span style="font-family: monospace; font-weight: 800; color: var(--slate-800); white-space: nowrap;">${esc(no || '—')}</span>
      <span style="flex-shrink: 0; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; color: ${src.color}; background: ${src.bg}; text-transform: uppercase;">${esc(src.type)}</span>`;
    item.addEventListener('mouseenter', () => { item.style.background = 'var(--slate-50)'; onHover(item); });
    item.addEventListener('mouseleave', () => {
      item.style.background = 'transparent';
      if (typeof window.hidePurchasePreDetailsCard === 'function') window.hidePurchasePreDetailsCard();
    });
    item.addEventListener('click', () => {
      if (typeof window.hidePurchasePreDetailsCard === 'function') window.hidePurchasePreDetailsCard();
      const dd = $('purchaseInvoiceSelectDropdown');
      if (dd) dd.style.display = 'none';
      onPick();
    });
    return item;
  }

  function renderOptions(filter) {
    const list = $('purchaseInvoiceSelectOptionsList');
    if (!list) return;
    list.innerHTML = '';
    const q = norm(filter);
    const matches = (no, party, date, total, rows, type) => !q || [no, party, date, String(total || ''), type]
      .concat((rows || []).map(r => r.item)).some(v => norm(v).includes(q));
    let count = 0;

    const purchases = getReversiblePurchases().filter(v => matches(v.invoiceNo, typeof getPurchaseVendorName === 'function' ? getPurchaseVendorName(v) : v.vendorName, v.date, v.total, v.rows, 'Purchase'));
    if (purchases.length) list.appendChild(sectionHeader('Purchases'));
    purchases.forEach(v => {
      count++;
      const cardDoc = Object.assign({}, v, { docNo: v.invoiceNo, vendorName: typeof getPurchaseVendorName === 'function' ? getPurchaseVendorName(v) : v.vendorName, status: 'Posted', advancePaidAmount: 0 });
      list.appendChild(optionItem(v.invoiceNo, PURCHASE_SRC,
        item => { if (typeof window.showPurchasePreDetailsCard === 'function') window.showPurchasePreDetailsCard(item, { type: 'Purchase', noField: 'docNo', color: PURCHASE_SRC.color, bg: PURCHASE_SRC.bg }, cardDoc, false); },
        () => confirmPurchase(v)));
    });

    const docs = getReversiblePreDocs().filter(({ d, doc }) => matches(doc.docNo, doc.vendorName, doc.date, doc.total, doc.rows, d.kind));
    if (docs.length) list.appendChild(sectionHeader('Pre Purchases'));
    docs.forEach(({ d, doc }) => {
      count++;
      const src = { type: d.kind, noField: 'docNo', color: d.chip.color, bg: d.chip.bg };
      list.appendChild(optionItem(doc.docNo, src,
        item => { if (typeof window.showPurchasePreDetailsCard === 'function') window.showPurchasePreDetailsCard(item, src, doc, false); },
        () => confirmPreDoc(d, doc)));
    });

    if (count === 0) {
      const none = document.createElement('div');
      none.style.cssText = 'padding: 8px 12px; font-size: 12px; color: var(--slate-400); text-align: center;';
      none.textContent = 'No matching purchases or pre purchases';
      list.appendChild(none);
    }
  }

  // One confirmation for both kinds: what is loaded, from whom, and what posting does
  function confirmLoad(o) {
    if (typeof showKyaConfirm !== 'function') { o.onConfirm(); return; }
    const notes = (o.notes || []).slice();
    const current = currentSourceNo();
    if (current && current !== o.docNo) {
      notes.push(`It replaces <strong>${esc(current)}</strong> as the Original Doc — the lines and refund on the form are reset.`);
    }
    showKyaConfirm({
      title: o.title,
      message: `Load ${o.kindLabel} <strong>${esc(o.docNo)}</strong> from <strong>${esc(o.party || 'Vendor')}</strong> (₹${fmt(o.total)}) into this reversal?${notes.length ? '<br>' + notes.join('<br>') : ''}`,
      confirmLabel: 'Load',
      okBg: '#dc2626',
      iconBg: '#fee2e2',
      iconColor: '#dc2626',
      iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 3 3 9 9 9"/></svg>',
      onConfirm: o.onConfirm
    });
  }

  function confirmPurchase(v) {
    const notes = [];
    const qtyOf = rows => (rows || []).reduce((s, r) => s + (parseFloat(r.qty) || 0), 0);
    if (qtyOf(getPurchaseRemainingRows(v)) < qtyOf(v.rows) - 0.0001) notes.push('Part of it was already reversed — only what is left is loaded.');
    const refundable = getPurchaseRefundable(v);
    notes.push(refundable > 0
      ? `₹${fmt(refundable)} paid on it can be refunded by the supplier; any part not refunded stays as an amount the supplier owes you.`
      : 'Nothing paid on it is left to refund — the reversal reduces what you owe the supplier.');
    confirmLoad({
      title: 'Reverse Purchase?',
      kindLabel: 'Purchase',
      docNo: v.invoiceNo || '',
      party: typeof getPurchaseVendorName === 'function' ? getPurchaseVendorName(v) : v.vendorName,
      total: v.total,
      notes,
      onConfirm: () => { if (typeof window.loadPurchaseVoucher === 'function') window.loadPurchaseVoucher(buildFromPurchase(v), false); }
    });
  }

  function confirmPreDoc(d, doc) {
    const adv = getPreDocAdvance(doc);
    const notes = [`Posting the reversal cancels this ${d.kind.toLowerCase()}; no purchase or GST is reversed.`];
    if (adv > 0) {
      notes.push(`Its advance of ₹${fmt(adv)} can be refunded by the supplier; any part not refunded stays ${isAdvanceInVendorLedger(doc) ? "in the supplier's ledger" : 'in Advances to Suppliers'}.`);
    }
    confirmLoad({
      title: 'Reverse Pre Purchase?',
      kindLabel: d.kind,
      docNo: doc.docNo || '',
      party: doc.vendorName,
      total: doc.total,
      notes,
      onConfirm: () => { if (typeof window.loadPurchaseVoucher === 'function') window.loadPurchaseVoucher(buildFromPreDoc(d, doc), false); }
    });
  }

  function openDropdown() {
    const dd = $('purchaseInvoiceSelectDropdown');
    const trigger = $('purchaseInvoiceSelectTrigger');
    if (!dd || (trigger && trigger.dataset.locked === '1')) return;
    dd.style.display = 'flex';
    const search = $('purchaseInvoiceSelectSearch');
    if (search) search.value = '';
    renderOptions('');
    if (search) search.focus();
  }

  function closeDropdown() {
    const dd = $('purchaseInvoiceSelectDropdown');
    if (dd) dd.style.display = 'none';
    if (typeof window.hidePurchasePreDetailsCard === 'function') window.hidePurchasePreDetailsCard();
  }

  function wire() {
    const trigger = $('purchaseInvoiceSelectTrigger');
    const dd = $('purchaseInvoiceSelectDropdown');
    const search = $('purchaseInvoiceSelectSearch');
    if (!trigger || !dd || trigger._wired) return;
    trigger._wired = true;
    trigger.addEventListener('click', e => {
      e.stopPropagation();
      if (dd.style.display === 'flex') closeDropdown();
      else openDropdown();
    });
    trigger.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); openDropdown(); }
    });
    if (search) {
      search.addEventListener('input', () => renderOptions(search.value));
      search.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeDropdown();
        if (e.key === 'Enter') {
          const first = $('purchaseInvoiceSelectOptionsList')?.querySelector('[role="option"]');
          if (first) { e.preventDefault(); first.click(); }
        }
      });
    }
    dd.addEventListener('click', e => e.stopPropagation());
    document.addEventListener('click', closeDropdown);
  }

  window.getPurchaseRemainingRows = getPurchaseRemainingRows;
  window.getPurchaseRefundable = getPurchaseRefundable;
  window.findPostedPurchaseForReversal = findPostedPurchase;
  window.findPurchasePreDocForReversal = findPreDoc;
  window.getPurchasePreDocAdvance = getPreDocAdvance;
  window.isPurchaseAdvanceInVendorLedger = isAdvanceInVendorLedger;
  window.healPurchasePreReversals = healPurchasePreReversals;
  window.blockIfPurchasePreReversed = blockIfPurchasePreReversed;
  window.closePurchaseOriginalDocList = closeDropdown;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
