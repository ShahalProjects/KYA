/**
 * js/sales-preinvoice-picker.js
 * "Pre Invoice No." box on the Sales Invoice form (KYA): lists every Quotation, Proforma
 * Invoice, Sales Order and Delivery Challan that is still active (drafts included), and
 * picking one fills the invoice exactly like that document's Convert to Sale — items,
 * customer, advance — and marks it Completed once the invoice is posted.
 */
(function() {
  'use strict';

  function safeEsc(str) {
    if (typeof ohEsc === 'function') return ohEsc(str);
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function safeFmtNum(num) {
    if (typeof fmtNum === 'function') return fmtNum(num);
    const n = parseFloat(num) || 0;
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Each pre-invoice type: where it is stored, its number field, its converter, and the
  // field / pending flag that tie a Sales Invoice back to it
  const SOURCES = [
    { type: 'Quotation', store: 'quotations', drafts: 'quotationsDrafts', noField: 'quoteNo',
      convert: 'convertQuotationToInvoice', pending: '_pendingConvertQuotationId', link: 'convertedFromQuotationId',
      color: '#1d4ed8', bg: '#eff6ff' },
    { type: 'Proforma Invoice', store: 'proformaInvoices', drafts: 'proformaInvoicesDrafts', noField: 'proformaNo',
      convert: 'convertProformaToInvoice', pending: '_pendingConvertProformaId', link: 'convertedFromProformaId',
      color: '#7e22ce', bg: '#faf5ff' },
    { type: 'Sales Order', store: 'salesOrders', drafts: 'salesOrdersDrafts', noField: 'orderNo',
      convert: 'convertSalesOrderToInvoice', pending: '_pendingConvertSalesOrderId', link: 'convertedFromSalesOrderId',
      color: '#c2410c', bg: '#fff7ed' },
    { type: 'Delivery Challan', store: 'deliveryChallans', drafts: 'deliveryChallansDrafts', noField: 'challanNo',
      convert: 'convertDeliveryChallanToInvoice', pending: '_pendingConvertDeliveryChallanId', link: 'convertedFromDeliveryChallanId',
      color: '#047857', bg: '#ecfdf5' }
  ];

  const $ = id => document.getElementById(id);

  // Every still-open pre-invoice: saved ones that are Active, plus drafts
  function getActivePreInvoices() {
    if (typeof window.healPreInvoiceReversals === 'function') window.healPreInvoiceReversals();
    const S = window.KYA_STORE || {};
    const out = [];
    SOURCES.forEach(src => {
      const seen = new Set();
      (S[src.store] || []).forEach(d => {
        seen.add(String(d.id));
        if (!d.status || d.status === 'Active') out.push({ src, doc: d, isDraft: false });
      });
      (S[src.drafts] || []).forEach(d => {
        if (!seen.has(String(d.id))) out.push({ src, doc: d, isDraft: true });
      });
    });
    return out;
  }

  // The pre-invoice this invoice is tied to: a conversion in progress, or the one a
  // posted invoice being edited was made from
  function getLinkedPreInvoice() {
    const S = window.KYA_STORE || {};
    let posted = null;
    const editing = window._editingSalesInvoice;
    if (editing && editing.id) {
      posted = (S.salesVouchers || []).concat(S.salesVouchersDrafts || []).find(v => String(v.id) === String(editing.id)) || null;
    }
    for (const src of SOURCES) {
      const id = window[src.pending] || (posted && posted[src.link]);
      if (!id) continue;
      const draftIds = new Set((S[src.drafts] || []).map(d => String(d.id)));
      const doc = (S[src.store] || []).concat(S[src.drafts] || []).find(d => String(d.id) === String(id));
      return { src, doc, isDraft: !!doc && draftIds.has(String(doc.id)), docNo: doc ? doc[src.noField] : String(id), locked: !window[src.pending] };
    }
    return null;
  }

  function renderOptions(filter) {
    const list = $('salesPreInvoiceSelectOptionsList');
    if (!list) return;
    list.innerHTML = '';

    const q = (filter || '').toLowerCase().trim();
    const selectedCustomer = $('salesCustomer') ? $('salesCustomer').value : '';
    let items = getActivePreInvoices().filter(({ doc, src }) => {
      if (!q) return true;
      return [doc[src.noField], doc.customerName, src.type, doc.date, String(doc.total || '')]
        .concat(Array.isArray(doc.rows) ? doc.rows.map(r => r.item) : [])
        .some(v => (v || '').toLowerCase().includes(q));
    });

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
        <span style="font-family: monospace; font-weight: 800; color: var(--slate-800); white-space: nowrap;">${safeEsc(doc[src.noField] || '—')}</span>
        <span style="flex-shrink: 0; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; color: ${src.color}; background: ${src.bg}; text-transform: uppercase;">${src.type}</span>`;
      item.addEventListener('mouseenter', () => {
        item.style.background = 'var(--slate-50)';
        showDetailsCard(item, src, doc, isDraft);
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = 'transparent';
        hideDetailsCard();
      });
      item.addEventListener('click', () => {
        closeDropdown();
        pick(src, doc);
      });
      list.appendChild(item);
    });
  }

  // ── Hover card with a pre-invoice's details ──
  function getDetailsCard() {
    let card = $('salesPreInvoiceDetailsCard');
    if (!card) {
      card = document.createElement('div');
      card.id = 'salesPreInvoiceDetailsCard';
      card.setAttribute('role', 'tooltip');
      card.style.cssText = 'display: none; position: fixed; z-index: 10050; width: 270px; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: 0 12px 28px -8px rgba(15,23,42,0.28); padding: 12px 14px; font-size: 12.5px; color: var(--slate-700); pointer-events: none;';
      document.body.appendChild(card);
    }
    return card;
  }

  function showDetailsCard(anchor, src, doc, isDraft) {
    if (!doc) return;
    const card = getDetailsCard();
    const rows = Array.isArray(doc.rows) ? doc.rows.filter(r => (r.item || '').trim()) : [];
    const itemsText = rows.length
      ? rows.slice(0, 3).map(r => safeEsc(r.item)).join(', ') + (rows.length > 3 ? ` +${rows.length - 3} more` : '')
      : '—';
    const adv = parseFloat(doc.advancePaidAmount) || 0;
    const total = parseFloat(doc.total) || 0;
    const line = (label, value) => `<div style="display: flex; justify-content: space-between; gap: 10px; margin-top: 4px;"><span style="color: var(--slate-500);">${label}</span><span style="font-weight: 600; text-align: right;">${value}</span></div>`;
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px;">
        <span style="font-family: monospace; font-weight: 800; font-size: 13.5px; color: var(--slate-900);">${safeEsc(doc[src.noField] || '—')}</span>
        <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; color: ${src.color}; background: ${src.bg}; text-transform: uppercase;">${src.type}</span>
      </div>
      ${line('Customer', safeEsc(doc.customerName || '—'))}
      ${line('Date', safeEsc(doc.date || '—'))}
      ${line('Status', isDraft ? 'Draft' : safeEsc(doc.status || 'Active'))}
      ${line('Items', itemsText)}
      ${line('Total', `₹ ${safeFmtNum(total)}`)}
      ${adv > 0 ? line('Advance', `₹ ${safeFmtNum(adv)}${doc.advanceVoucherNo ? ` <span style="font-family: monospace; color: var(--blue-700);">[${safeEsc(doc.advanceVoucherNo)}]</span>` : ''}`) + line('Balance', `₹ ${safeFmtNum(Math.max(0, total - adv))}`) : ''}`;

    // Beside the anchor: right of it when there is room, otherwise left
    card.style.display = 'block';
    const r = anchor.getBoundingClientRect();
    const w = card.offsetWidth, h = card.offsetHeight;
    let left = r.right + 8;
    if (left + w > window.innerWidth - 8) left = Math.max(8, r.left - w - 8);
    const top = Math.max(8, Math.min(r.top, window.innerHeight - h - 8));
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  }

  function hideDetailsCard() {
    const card = $('salesPreInvoiceDetailsCard');
    if (card) card.style.display = 'none';
  }

  // Lines already typed on the invoice would be replaced, so ask first
  function invoiceHasContent() {
    return Array.from(document.querySelectorAll('#salesItemBody .sales-row-item'))
      .some(inp => (inp.value || '').trim());
  }

  function pick(src, doc) {
    const fn = window[src.convert];
    if (typeof fn !== 'function') {
      if (typeof showToast === 'function') showToast(`${src.type} could not be loaded.`, 'error');
      return;
    }
    const run = () => fn(doc.id);
    if (typeof showKyaConfirm !== 'function') { run(); return; }

    // Always confirm, showing what will come in
    const adv = parseFloat(doc.advancePaidAmount) || 0;
    const notes = [];
    if (adv > 0) notes.push(`Advance of ₹${safeFmtNum(adv)} will be adjusted.`);
    if (invoiceHasContent()) notes.push('The lines already entered will be replaced.');
    notes.push(`It is marked Completed only when this invoice is posted.`);
    showKyaConfirm({
      title: 'Load Pre Invoice?',
      message: `Load ${src.type} <strong>${safeEsc(doc[src.noField])}</strong> for <strong>${safeEsc(doc.customerName || 'Customer')}</strong> (₹${safeFmtNum(doc.total)}) into this invoice?<br>${notes.join('<br>')}`,
      confirmLabel: 'Load',
      okBg: '#2563eb',
      iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 14h8M13 11l3 3-3 3"/></svg>',
      onConfirm: run
    });
  }

  function openDropdown() {
    const dd = $('salesPreInvoiceSelectDropdown');
    if (!dd) return;
    const linked = getLinkedPreInvoice();
    if (linked && linked.locked) return; // a posted invoice keeps the document it was billed from
    hideDetailsCard();
    dd.style.display = 'flex';
    const search = $('salesPreInvoiceSelectSearch');
    if (search) search.value = '';
    renderOptions('');
    if (search) search.focus();
  }

  function closeDropdown() {
    const dd = $('salesPreInvoiceSelectDropdown');
    if (dd) dd.style.display = 'none';
    hideDetailsCard();
  }

  // Show the box on Sales Invoices only, with the linked document's number when there is one
  function refreshSalesPreInvoicePicker() {
    const field = $('salesPreInvoiceField');
    const text = $('salesPreInvoiceSelectTriggerText');
    const trigger = $('salesPreInvoiceSelectTrigger');
    if (!field || !text || !trigger) return;

    const isReturn = typeof currentSalesVoucherSubtype !== 'undefined' && currentSalesVoucherSubtype === 'Return';
    field.style.display = isReturn ? 'none' : '';
    closeDropdown();

    const linked = getLinkedPreInvoice();
    if (linked) {
      // Number and type only; hovering shows the details card
      text.innerHTML = `<span style="font-family: monospace; font-weight: 800; color: var(--slate-800);">${safeEsc(linked.docNo)}</span> <span style="font-size: 11px; color: ${linked.src.color};">${safeEsc(linked.src.type)}</span>`;
      trigger.title = '';
      trigger.style.cursor = linked.locked ? 'default' : 'pointer';
    } else {
      text.textContent = '— Select —';
      trigger.title = 'Bill an active Quotation, Proforma Invoice, Sales Order or Delivery Challan';
      trigger.style.cursor = 'pointer';
    }
  }

  function wire() {
    const trigger = $('salesPreInvoiceSelectTrigger');
    const dd = $('salesPreInvoiceSelectDropdown');
    const search = $('salesPreInvoiceSelectSearch');
    if (!trigger || !dd || trigger._wired) return;
    trigger._wired = true;

    trigger.addEventListener('click', e => {
      e.stopPropagation();
      if (dd.style.display === 'flex') closeDropdown();
      else openDropdown();
    });
    trigger.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDropdown(); }
    });
    // Hovering the box shows the linked pre-invoice's details (not while the list is open)
    trigger.addEventListener('mouseenter', () => {
      if (dd.style.display === 'flex') return;
      const linked = getLinkedPreInvoice();
      if (linked && linked.doc) showDetailsCard(trigger, linked.src, linked.doc, linked.isDraft);
    });
    trigger.addEventListener('mouseleave', hideDetailsCard);
    if (search) {
      search.addEventListener('input', () => renderOptions(search.value));
      search.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeDropdown();
        if (e.key === 'Enter') {
          const first = $('salesPreInvoiceSelectOptionsList')?.querySelector('[role="option"]');
          if (first) { e.preventDefault(); first.click(); }
        }
      });
    }
    dd.addEventListener('click', e => e.stopPropagation());
    document.addEventListener('click', closeDropdown);
    refreshSalesPreInvoicePicker();
  }

  window.refreshSalesPreInvoicePicker = refreshSalesPreInvoicePicker;
  window.getActivePreInvoices = getActivePreInvoices;
  // Shared with the Sales Reversal "Original Doc" list (sales-preinvoice-reversal.js)
  window._preInvoiceSources = SOURCES;
  window.showPreInvoiceDetailsCard = showDetailsCard;
  window.hidePreInvoiceDetailsCard = hideDetailsCard;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
