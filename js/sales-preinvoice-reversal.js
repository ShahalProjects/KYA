/**
 * js/sales-preinvoice-reversal.js
 * Sales Reversal against a Pre Invoice (KYA). The reversal's "Original Doc" lists the posted
 * invoices and every active Quotation / Proforma Invoice / Sales Order / Delivery Challan.
 * Reversing a pre-invoice cancels it and settles its advance: the refund goes back through
 * Cash / Bank, and any part not refunded moves to Refund Payable (a customer) or stays in
 * the party's own ledger (a ledger party). No sales, GST or receivable lines are posted —
 * a pre-invoice never made a sale. Deleting the reversal makes the pre-invoice active again.
 */
(function() {
  'use strict';

  const $ = id => document.getElementById(id);
  const sources = () => window._preInvoiceSources || [];
  const round2 = n => Math.round((parseFloat(n) || 0) * 100) / 100;

  function esc(str) {
    if (typeof ohEsc === 'function') return ohEsc(str);
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function fmt(n) {
    if (typeof fmtNum === 'function') return fmtNum(n);
    return (parseFloat(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // A saved (not draft) pre-invoice by type and id
  function findDoc(type, id) {
    const S = window.KYA_STORE || {};
    const src = sources().find(s => s.type === type);
    if (!src) return null;
    const doc = (S[src.store] || []).find(d => String(d.id) === String(id));
    return doc ? { src, doc } : null;
  }

  // The advance still on the books for a pre-invoice (its receipt entry must exist), less
  // any part already used to pay other documents (Invoice Balance)
  function getDocAdvance(doc, storeKey) {
    if (!doc || !doc.advanceJournalEntryId) return 0;
    const entries = (typeof postedEntries !== 'undefined' && Array.isArray(postedEntries)) ? postedEntries : [];
    const entry = entries.find(e => String(e.id) === String(doc.advanceJournalEntryId));
    if (!entry) return 0;
    const onBooks = Math.max(0, parseFloat(doc.advancePaidAmount) || 0);
    const used = (storeKey && typeof getPreInvoiceAdvanceUsed === 'function') ? getPreInvoiceAdvanceUsed(storeKey, doc.id) : 0;
    return Math.max(0, Math.round((onBooks - used) * 100) / 100);
  }

  // Whether the advance was credited to the party's own ledger (a ledger party) rather
  // than to Advance from Customers
  function isAdvanceInPartyLedger(doc, partyName) {
    if (!doc || !doc.advanceJournalEntryId || typeof postedEntries === 'undefined') return false;
    const entry = postedEntries.find(e => String(e.id) === String(doc.advanceJournalEntryId));
    const name = (partyName || '').trim().toLowerCase();
    return !!entry && !!name && (entry.allRows || []).some(r =>
      (parseFloat(r.credit) || 0) > 0 && (r.particular || '').trim().toLowerCase() === name);
  }

  // ── Keep pre-invoices in step with their reversals ──
  // A reversed pre-invoice is Cancelled with `reversedBy`; once that reversal is deleted
  // (from any screen) or re-pointed to another document, it is Active again.
  function healPreInvoiceReversals() {
    const S = window.KYA_STORE || {};
    const vouchers = S.salesVouchers || [];
    sources().forEach(src => {
      (S[src.store] || []).forEach(doc => {
        if (!doc || !doc.reversedBy) return;
        const v = vouchers.find(x => String(x.id) === String(doc.reversedBy.voucherId));
        if (v && v.reversedPreInvoice && String(v.reversedPreInvoice.id) === String(doc.id)) return;
        delete doc.reversedBy;
        doc.status = 'Active';
        doc.updatedAt = Date.now();
      });
    });
  }

  // Reopen / edit / delete are closed to a reversed pre-invoice: the reversal owns it
  function blockIfPreInvoiceReversed(doc, kind) {
    healPreInvoiceReversals();
    if (!doc || !doc.reversedBy) return false;
    if (typeof showToast === 'function') {
      showToast(`${kind || 'This document'} was reversed by Sales Reversal ${doc.reversedBy.no || ''}. Delete that reversal to reopen it.`, 'warning');
    }
    return true;
  }

  // ── The selection on the Sales Reversal form ──
  function getSalesReversalPreInvoice() {
    if (typeof currentSalesVoucherSubtype === 'undefined' || currentSalesVoucherSubtype !== 'Return') return null;
    const sel = window._salesReversalPreInvoice;
    if (!sel) return null;
    const found = findDoc(sel.type, sel.id);
    if (!found) return null;
    return { src: found.src, doc: found.doc, docNo: found.doc[found.src.noField] || '', advance: getDocAdvance(found.doc, found.src.store) };
  }

  // Saved pre-invoices that are still Active, newest first
  function getReversiblePreInvoices() {
    healPreInvoiceReversals();
    const S = window.KYA_STORE || {};
    const out = [];
    sources().forEach(src => {
      (S[src.store] || []).forEach(doc => {
        if (!doc.status || doc.status === 'Active') out.push({ src, doc });
      });
    });
    return out.sort((a, b) => {
      const d = (b.doc.date || '').localeCompare(a.doc.date || '');
      return d !== 0 ? d : (Number(b.doc.id) || 0) - (Number(a.doc.id) || 0);
    });
  }

  function sectionHeader(text) {
    const h = document.createElement('div');
    h.style.cssText = 'padding: 6px 10px 2px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--slate-400);';
    h.textContent = text;
    return h;
  }

  // Adds the "Pre Invoices" section to the Original Doc list; returns how many matched
  function appendReversalPreInvoiceOptions(listEl, filter) {
    if (!listEl) return 0;
    const q = (filter || '').toLowerCase().trim();
    const items = getReversiblePreInvoices().filter(({ src, doc }) => {
      if (!q) return true;
      return [doc[src.noField], doc.customerName, src.type, doc.date, String(doc.total || '')]
        .concat(Array.isArray(doc.rows) ? doc.rows.map(r => r.item) : [])
        .some(v => (v || '').toLowerCase().includes(q));
    });
    if (!items.length) return 0;

    listEl.appendChild(sectionHeader('Pre Invoices'));
    items.forEach(({ src, doc }) => {
      const item = document.createElement('div');
      item.setAttribute('role', 'option');
      item.style.cssText = 'padding: 8px 12px; font-size: 13px; border-radius: 6px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 10px;';
      item.innerHTML = `
        <span style="font-family: monospace; font-weight: 800; color: var(--slate-800); white-space: nowrap;">${esc(doc[src.noField] || '—')}</span>
        <span style="flex-shrink: 0; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; color: ${src.color}; background: ${src.bg}; text-transform: uppercase;">${src.type}</span>`;
      item.addEventListener('mouseenter', () => {
        item.style.background = 'var(--slate-50)';
        if (typeof window.showPreInvoiceDetailsCard === 'function') window.showPreInvoiceDetailsCard(item, src, doc, false);
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = 'transparent';
        if (typeof window.hidePreInvoiceDetailsCard === 'function') window.hidePreInvoiceDetailsCard();
      });
      item.addEventListener('click', () => {
        if (typeof window.hidePreInvoiceDetailsCard === 'function') window.hidePreInvoiceDetailsCard();
        const dd = $('salesInvoiceSelectDropdown');
        if (dd) dd.style.display = 'none';
        confirmPick(src, doc);
      });
      listEl.appendChild(item);
    });
    return items.length;
  }

  // ── Confirmation before an Original Doc is loaded (invoice or pre-invoice) ──
  // One popup for both: what is loaded, for whom, and what posting the reversal does.
  function confirmLoadOriginalDoc(o) {
    if (typeof showKyaConfirm !== 'function') { o.onConfirm(); return; }
    const notes = (o.notes || []).slice();
    // Picking a different document replaces the one already on the form
    const current = ($('salesInvoiceSelectTriggerText')?.textContent || '').trim();
    if (current && current !== '— Select —' && current !== o.docNo) {
      notes.push(`It replaces <strong>${esc(current)}</strong> as the Original Doc — the lines and refund on the form are reset.`);
    }
    showKyaConfirm({
      title: o.title,
      message: `Load ${o.kindLabel} <strong>${esc(o.docNo)}</strong> for <strong>${esc(o.party || 'Customer')}</strong> (₹${fmt(o.total)}) into this reversal?${notes.length ? '<br>' + notes.join('<br>') : ''}`,
      confirmLabel: 'Load',
      okBg: '#dc2626',
      iconBg: '#fee2e2',
      iconColor: '#dc2626',
      iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 3 3 9 9 9"/></svg>',
      onConfirm: o.onConfirm
    });
  }

  function confirmPick(src, doc) {
    const adv = getDocAdvance(doc, src.store);
    const party = doc.customerName || 'Customer';
    const notes = [`Posting the reversal cancels this ${src.type.toLowerCase()}; no sale or GST is reversed.`];
    if (adv > 0) {
      notes.push(`Its advance of ₹${fmt(adv)} can be refunded; any part not refunded ${isAdvanceInPartyLedger(doc, party) ? "stays in the party's ledger" : 'goes to Refund Payable'}.`);
    }
    confirmLoadOriginalDoc({
      title: 'Reverse Pre Invoice?',
      kindLabel: src.type,
      docNo: doc[src.noField] || '',
      party,
      total: doc.total,
      notes,
      onConfirm: () => selectPreInvoiceForReversal(src, doc)
    });
  }

  // An invoice from the Original Doc list: confirm, then load it (onLoad does the loading)
  function confirmInvoiceForReversal(inv, party, onLoad) {
    const S = window.KYA_STORE || {};
    const notes = [];

    // Earlier reversals of this invoice: only what is left comes in
    const qtyOf = rows => (rows || []).reduce((sum, r) => sum + (parseFloat(r.qty) || 0), 0);
    const remainingRows = typeof getInvoiceRemainingRows === 'function' ? getInvoiceRemainingRows(inv) : inv.rows;
    if (qtyOf(remainingRows) < qtyOf(inv.rows) - 0.0001) {
      notes.push('Part of it was already reversed — only what is left is loaded.');
    }

    // What was received on it, less what earlier reversals refunded
    const paid = inv.paymentStatus === 'Full Payment'
      ? ((parseFloat(inv.paymentAmount) || 0) > 0 ? parseFloat(inv.paymentAmount) : (parseFloat(inv.total) || 0))
      : (inv.paymentStatus === 'Partial Payment' ? (parseFloat(inv.paymentAmount) || 0) : 0);
    const refunded = (S.salesVouchers || []).filter(v =>
      v.isReturn && !v.reversedPreInvoice &&
      String(v.returnAgainstInvoice || '').toLowerCase() === String(inv.invoiceNo || '').toLowerCase() &&
      (v.paymentStatus === 'Full Refund' || v.paymentStatus === 'Partial Refund'))
      .reduce((sum, v) => sum + (parseFloat(v.paymentAmount) || 0), 0);
    const refundable = Math.max(0, Math.round((paid - refunded) * 100) / 100);
    notes.push(refundable > 0
      ? `₹${fmt(refundable)} received on it can be refunded; any part not refunded stays as a credit to the customer.`
      : 'Nothing is left to refund on it — the reversal reduces what the customer owes.');

    confirmLoadOriginalDoc({
      title: 'Reverse Invoice?',
      kindLabel: 'Invoice',
      docNo: inv.invoiceNo || '',
      party,
      total: inv.total,
      notes,
      onConfirm: onLoad
    });
  }

  // The party id to select: the stored one, or a party with the same name
  function resolvePartyId(doc) {
    if (typeof populateSalesCustomers === 'function') populateSalesCustomers(doc.customerId);
    const sel = $('salesCustomer');
    if (sel && !sel.value && doc.customerName) {
      const wanted = String(doc.customerName).trim().toLowerCase();
      const match = Array.from(sel.options).find(o =>
        o.value && o.textContent.split(' [A.K.A:')[0].trim().toLowerCase() === wanted);
      if (match) {
        populateSalesCustomers(match.value);
        return match.value;
      }
    }
    return sel ? sel.value : doc.customerId;
  }

  // Fill the reversal from the pre-invoice: the whole document, read-only
  function selectPreInvoiceForReversal(src, doc) {
    window._salesReversalPreInvoice = { type: src.type, id: doc.id };
    const trigger = $('salesInvoiceSelectTriggerText');
    if (trigger) trigger.textContent = doc[src.noField] || '—';

    // The customer details as the document had them (its Customer Details edit, if any)
    window._salesPartyOverride = doc.partyOverride ? JSON.parse(JSON.stringify(doc.partyOverride)) : null;
    if (typeof hidePartyHoverCard === 'function') hidePartyHoverCard();
    resolvePartyId(doc);
    if (typeof populateSalesExecutives === 'function') populateSalesExecutives(doc.salesExecutiveId || '');
    const execEl = $('salesExecutive');
    if (execEl) execEl.value = doc.salesExecutiveId || '';
    const supplyEl = $('salesSupplyType');
    if (supplyEl) {
      supplyEl.value = (doc.supplyType && /State|SEZ|Export/i.test(doc.supplyType)) ? doc.supplyType : 'Intra-State (CGST + SGST)';
    }
    const notesEl = $('salesNotes');
    if (notesEl) notesEl.value = `Reversal of ${src.type} ${doc[src.noField] || ''}.`;
    const adjEl = $('salesAdjustments');
    if (adjEl) adjEl.value = doc.adjustments || '';

    // Reversal No. follows the chosen document
    if (typeof refreshSalesReversalNo === 'function') refreshSalesReversalNo();

    const mode = doc.tdsTcsMode || 'None';
    if (typeof unlockSalesTdsTcsButtons === 'function') unlockSalesTdsTcsButtons();
    const modeBtn = $(mode === 'TDS' ? 'salesTdsTcsTds' : (mode === 'TCS' ? 'salesTdsTcsTcs' : 'salesTdsTcsNone'));
    if (modeBtn) modeBtn.click();
    const rateSelect = $('salesTdsTcsRateSelect');
    const customInput = $('salesTdsTcsRateCustom');
    const customWrap = $('salesTdsTcsRateCustomWrap');
    const rateVal = doc.tdsTcsRate || 0;
    if (rateSelect && mode !== 'None') {
      if (rateSelect.querySelector(`option[value="${rateVal}"]`)) {
        rateSelect.value = String(rateVal);
        if (customWrap) customWrap.style.display = 'none';
      } else {
        rateSelect.value = 'custom';
        if (customInput) customInput.value = rateVal;
        if (customWrap) customWrap.style.display = 'flex';
        const amtEl = $('salesTdsTcsAmount');
        if (amtEl && parseFloat(doc.tdsTcsAmount) > 0) {
          amtEl.value = parseFloat(doc.tdsTcsAmount).toFixed(2);
          amtEl.dataset.manual = '1';
        }
      }
    }

    // Pre-invoices are product documents
    currentSalesType = 'Product';
    $('salesTypeProduct')?.classList.add('active');
    $('salesTypeService')?.classList.remove('active');
    const typeBg = $('salesTypeBg');
    if (typeBg) { typeBg.classList.add('prod-active'); typeBg.classList.remove('serv-active'); }

    salesRows = Array.isArray(doc.rows) ? JSON.parse(JSON.stringify(doc.rows)) : [];
    if (!salesRows.length && typeof addSalesRow === 'function') addSalesRow();

    // Refund starts at "No Refund"
    $('salesPaymentStatusNotPaid')?.click();
    if (typeof resetSalesMultiPayments === 'function') resetSalesMultiPayments();
    if (typeof populateSalesPaymentAccounts === 'function') populateSalesPaymentAccounts('');
    if (typeof getSalesAdjust === 'function' && getSalesAdjust()) getSalesAdjust().reset();
    const payAmt = $('salesPaymentAmount');
    if (payAmt) payAmt.value = '';

    renderSalesRows();
    updateSalesReturnLockState();
    recalculateSalesTotals();
    if (typeof updateSalesMultiPaymentUI === 'function') updateSalesMultiPaymentUI();
  }

  // Rows of a pre-invoice reversal can't be changed — the whole document is reversed
  function lockSalesRowsForPreInvoiceReversal() {
    if (!getSalesReversalPreInvoice()) return;
    const body = $('salesItemBody');
    if (!body) return;
    body.querySelectorAll('input').forEach(inp => {
      inp.readOnly = true;
      inp.style.cursor = 'not-allowed';
      inp.style.color = 'var(--slate-500)';
    });
    body.querySelectorAll('select').forEach(s => { s.disabled = true; });
    body.querySelectorAll('.sales-del-row, .kya-alter-pencil').forEach(b => { b.style.display = 'none'; });
  }

  // Called from updateSalesReturnLockState: TDS / TCS follow the document, and the refund
  // can't exceed the advance (no advance → No Refund only). Returns true when it applied.
  function applyPreInvoiceReversalLocks() {
    const sel = getSalesReversalPreInvoice();
    if (!sel) return false;
    const lock = (el, on) => {
      if (!el) return;
      el.disabled = on;
      el.style.cursor = on ? 'not-allowed' : '';
      el.style.opacity = on ? '0.5' : '';
    };
    ['salesTdsTcsNone', 'salesTdsTcsTds', 'salesTdsTcsTcs'].forEach(id => {
      const b = $(id);
      if (b && !b.classList.contains('active')) lock(b, true);
    });
    ['salesTdsTcsRateSelect', 'salesTdsTcsRateCustom'].forEach(id => {
      const el = $(id);
      if (el) { el.disabled = true; el.style.backgroundColor = 'var(--slate-50)'; el.style.cursor = 'not-allowed'; }
    });

    const payAmtEl = $('salesPaymentAmount');
    if (sel.advance <= 0) {
      const notPaid = $('salesPaymentStatusNotPaid');
      if (notPaid && !notPaid.classList.contains('active')) notPaid.click();
      lock($('salesPaymentStatusFull'), true);
      lock($('salesPaymentStatusPartial'), true);
      if (payAmtEl) payAmtEl.max = 0;
    } else if (payAmtEl) {
      payAmtEl.max = sel.advance;
    }
    return true;
  }

  // Hover popup on the Refund Status box: the advance and where an unrefunded part goes.
  // Returns true when a pre-invoice reversal is on the form.
  function updatePreInvoiceReversalInfo(box) {
    const sel = getSalesReversalPreInvoice();
    if (!sel || !box) return false;
    const partyName = (typeof getSalesPartyName === 'function') ? getSalesPartyName($('salesCustomer')?.value) : sel.doc.customerName;
    const row = (label, value, strong) => `<div style="display: flex; justify-content: space-between; gap: 10px; margin-top: 2px;"><span>${label}</span>${strong ? `<strong>${value}</strong>` : `<span>${value}</span>`}</div>`;
    box.dataset.active = '1';
    if (sel.advance > 0) {
      const inLedger = isAdvanceInPartyLedger(sel.doc, partyName || sel.doc.customerName);
      box.innerHTML = `
        ${row(`Advance received${sel.doc.advanceVoucherNo ? ` <span style="font-family: monospace; font-weight: 700;">[${esc(sel.doc.advanceVoucherNo)}]</span>` : ''}`, `₹ ${fmt(sel.advance)}`, true)}
        <div style="margin-top: 4px; font-weight: 500;">Refund it below; any part not refunded ${inLedger ? "stays in the party's ledger" : 'goes to Refund Payable'}.</div>`;
    } else {
      box.innerHTML = `<div style="font-weight: 500;">No advance was received against ${esc(sel.docNo)} — nothing to refund.</div>`;
    }
    return true;
  }

  // ── Post ──
  function postPreInvoiceReversal() {
    const sel = getSalesReversalPreInvoice();
    if (!sel) { showToast('The selected pre invoice no longer exists.', 'warning'); return; }
    const editing = window._editingSalesInvoice;
    const isEditPosted = !!(editing && !editing.isDraft);
    healPreInvoiceReversals();
    const ownReversal = isEditPosted && sel.doc.reversedBy && String(sel.doc.reversedBy.voucherId) === String(editing.id);
    if (sel.doc.status && sel.doc.status !== 'Active' && !ownReversal) {
      showToast(`${sel.src.type} ${sel.docNo} is ${sel.doc.status} and can't be reversed.`, 'warning');
      return;
    }

    const customerId = $('salesCustomer')?.value;
    if (!customerId) { showToast('Please select a Customer.', 'warning'); return; }
    const invoiceNo = ($('salesInvoiceNo')?.value || '').trim();
    if (!invoiceNo) { showToast('Reversal number is required.', 'warning'); return; }
    if (typeof isSalesInvoiceNoUsed === 'function' && isSalesInvoiceNoUsed(invoiceNo, 'return')) {
      showToast(`Reversal No. "${invoiceNo}" is already used (even deleted numbers can't be reused). Please use another number.`, 'danger');
      if (typeof validateSalesInvoiceNoField === 'function') validateSalesInvoiceNoField();
      return;
    }
    const date = $('salesDate')?.value;
    if (!date) { showToast('Please select a Date.', 'warning'); return; }
    if (sel.doc.date && date < sel.doc.date) {
      showToast(`Reversal date cannot be before the ${sel.src.type} date (${sel.doc.date}).`, 'warning');
      return;
    }

    // Refund of the advance
    const advance = sel.advance;
    const paymentStatus = getSalesPaymentStatus();
    const paymentAccountId = $('salesPaymentAccount')?.value || '';
    const paymentSplits = (typeof getSalesMultiPaymentSplits === 'function') ? getSalesMultiPaymentSplits() : [];
    let paymentAmount = 0;
    if (paymentStatus !== 'No Refund') {
      if (advance <= 0) { showToast('No advance was received, so there is nothing to refund.', 'warning'); return; }
      if (!paymentAccountId) { showToast('Please select a Refund Account.', 'warning'); return; }
      if (paymentStatus === 'Full Refund') {
        paymentAmount = advance;
      } else {
        paymentAmount = parseFloat($('salesPaymentAmount')?.value) || 0;
        if (paymentAmount <= 0) { showToast('Refund Amount must be greater than zero for Partial Refunds.', 'warning'); return; }
        if (paymentAmount > advance + 0.001) { showToast(`Refund Amount cannot exceed the advance of ₹${fmt(advance)}.`, 'warning'); return; }
      }
      // Invoice Balance (the account, or its Multi Refund row): that part of the advance goes
      // to the customer's unpaid invoices
      if (typeof usesCreditAdjust === 'function' && usesCreditAdjust(paymentAccountId, paymentSplits)) {
        const adjust = typeof getSalesAdjust === 'function' ? getSalesAdjust() : null;
        const err = adjust && typeof validateAllocations === 'function'
          ? validateAllocations('apply', adjust.get(), getCreditAdjustPortion(paymentAccountId, paymentSplits, paymentAmount), customerId, typeof getSalesAdjustCtx === 'function' ? getSalesAdjustCtx() : {})
          : 'Adjustment is not available.';
        if (err) { showToast(err, 'warning'); return; }
      }
      if (paymentAccountId === 'multi-payment') {
        if (!paymentSplits.length) { showToast('Please select at least one account with an amount for Multi Refund.', 'warning'); return; }
        if (paymentSplits.some((sp, i) => paymentSplits.findIndex(o => String(o.accountId) === String(sp.accountId)) !== i)) {
          showToast('Each Multi Refund account can be selected only once.', 'warning');
          return;
        }
        const splitTotal = paymentSplits.reduce((sum, sp) => sum + sp.amount, 0);
        if (Math.abs(splitTotal - paymentAmount) > 0.01) {
          showToast(`Multi Refund split of ₹${fmt(splitTotal)} must equal the refund amount of ₹${fmt(paymentAmount)}.`, 'warning');
          return;
        }
      }
    }

    const tdsTcsMode = typeof getSalesTdsTcsMode === 'function' ? getSalesTdsTcsMode() : 'None';
    const subTotal = calculateSubtotal();
    const tdsTcsAmount = typeof getSalesTdsTcsAmount === 'function' ? getSalesTdsTcsAmount(subTotal) : 0;
    const adjustments = parseFloat($('salesAdjustments')?.value) || 0;
    let total = subTotal;
    if (tdsTcsMode === 'TDS') total -= tdsTcsAmount;
    else if (tdsTcsMode === 'TCS') total += tdsTcsAmount;
    total = round2(total + adjustments);

    const partyName = (typeof getSalesPartyName === 'function') ? getSalesPartyName(customerId) : (sel.doc.customerName || '');
    const existing = isEditPosted ? (window.KYA_STORE.salesVouchers || []).find(v => String(v.id) === String(editing.id)) : null;

    const voucher = {
      id: isEditPosted ? editing.id : Date.now(),
      type: 'Product',
      invoiceNo,
      mode: typeof currentSalesInvoiceMode !== 'undefined' ? currentSalesInvoiceMode : 'Auto',
      isReturn: true,
      returnAgainstInvoice: sel.docNo,
      reversedPreInvoice: {
        type: sel.src.type,
        id: sel.doc.id,
        no: sel.docNo,
        advance,
        advanceJournalEntryId: sel.doc.advanceJournalEntryId || null,
        advanceVoucherNo: sel.doc.advanceVoucherNo || null,
        inPartyLedger: isAdvanceInPartyLedger(sel.doc, partyName)
      },
      customerId,
      customerName: partyName,
      salesExecutiveId: $('salesExecutive')?.value || '',
      salesSupplyType: $('salesSupplyType')?.value || 'Intra-State (CGST + SGST)',
      date,
      dueDate: $('salesDueDate')?.value || date,
      notes: $('salesNotes')?.value || '',
      tdsTcsMode,
      tdsTcsRate: typeof getSalesTdsTcsRate === 'function' ? getSalesTdsTcsRate() : 0,
      tdsTcsAmount,
      adjustments,
      subTotal,
      total,
      paymentStatus,
      paymentAccountId: paymentAmount > 0 ? paymentAccountId : '',
      paymentAmount: round2(paymentAmount),
      paymentSplits: paymentAmount > 0 && paymentAccountId === 'multi-payment' ? paymentSplits : [],
      // Invoice Balance: the unpaid invoices the advance was applied to
      creditApplications: (paymentAmount > 0 && typeof usesCreditAdjust === 'function' && usesCreditAdjust(paymentAccountId, paymentSplits)
          && typeof getSalesAdjust === 'function' && getSalesAdjust())
        ? getSalesAdjust().get() : [],
      rows: JSON.parse(JSON.stringify(salesRows)),
      partyOverride: window._salesPartyOverride ? JSON.parse(JSON.stringify(window._salesPartyOverride)) : null,
      uploadedDoc: window._salesUploadedDoc || null,
      journalEntryId: existing ? (existing.journalEntryId || '') : '',
      postedAt: existing ? (existing.postedAt || Date.now()) : Date.now()
    };

    voucher.journalEntryId = postSalesVoucherToJournal(voucher) || '';

    const S = window.KYA_STORE;
    S.salesVouchers = S.salesVouchers || [];
    if (editing && editing.isDraft) {
      S.salesVouchersDrafts = (S.salesVouchersDrafts || []).filter(d => d.id !== editing.id);
    }
    const idx = isEditPosted ? S.salesVouchers.findIndex(v => String(v.id) === String(editing.id)) : -1;
    if (idx > -1) S.salesVouchers[idx] = voucher;
    else S.salesVouchers.push(voucher);
    if (typeof registerUsedSalesInvoiceNo === 'function') registerUsedSalesInvoiceNo('return', invoiceNo);

    // The pre-invoice is now cancelled by this reversal (a previous target, if the
    // reversal was re-pointed, goes back to Active)
    sel.doc.status = 'Cancelled';
    sel.doc.reversedBy = { voucherId: voucher.id, no: invoiceNo, date };
    sel.doc.updatedAt = Date.now();
    healPreInvoiceReversals();

    showToast(`Sales Reversal "${invoiceNo}" posted. ${sel.src.type} ${sel.docNo} cancelled.`, 'success');
    if (typeof showInvoicePostedModal === 'function') showInvoicePostedModal(invoiceNo, 'Return');

    window._salesReversalPreInvoice = null;
    window._editingSalesInvoice = null;
    currentSalesVoucherSubtype = 'Return'; // followed by a fresh reversal
    initSalesForm();
    if (typeof openTab === 'function') openTab('sales_voucher');
    if (typeof window.renderSalesPreInvoicePanel === 'function') window.renderSalesPreInvoicePanel();
    if (typeof refreshAllReports === 'function') refreshAllReports();
    if (typeof renderVoucherDeskPanel === 'function') renderVoucherDeskPanel();
    if (typeof renderSalesPostedPanel === 'function') renderSalesPostedPanel();
    if (typeof renderLedgerStatementView === 'function') renderLedgerStatementView();
    if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
  }

  window.healPreInvoiceReversals = healPreInvoiceReversals;
  window.blockIfPreInvoiceReversed = blockIfPreInvoiceReversed;
  window.getSalesReversalPreInvoice = getSalesReversalPreInvoice;
  window.appendReversalPreInvoiceOptions = appendReversalPreInvoiceOptions;
  window.confirmInvoiceForReversal = confirmInvoiceForReversal;
  window.lockSalesRowsForPreInvoiceReversal = lockSalesRowsForPreInvoiceReversal;
  window.applyPreInvoiceReversalLocks = applyPreInvoiceReversalLocks;
  window.updatePreInvoiceReversalInfo = updatePreInvoiceReversalInfo;
  window.postPreInvoiceReversal = postPreInvoiceReversal;
  window._salesReversalPreInvoice = window._salesReversalPreInvoice || null;
})();
