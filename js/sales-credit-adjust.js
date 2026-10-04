/**
 * js/sales-credit-adjust.js
 * Settling a payment / refund without Cash or Bank (KYA) — an extra choice in every
 * Payment Account / Refund Account list (Sales Invoice, Reversal, Proforma Invoice,
 * Sales Order, Delivery Challan), and in each row of their Multi Payment / Multi Refund:
 *
 *  Invoice Balance   a payment / advance is paid from credit the customer already has; a
 *                    refund is applied to the customer's unpaid invoices instead of being
 *                    paid out. In a Multi split it covers that row's amount only.
 *
 * Credit a customer can use (getCustomerCreditSources):
 *   reversal   — a Sales Reversal (credit note) whose credit wasn't refunded
 *   parked     — advance above an invoice value / a cancelled pre-invoice's advance left in
 *                Refund Payable (or in a ledger party's own ledger)
 *   advance    — the advance on another active Proforma / Sales Order / Delivery Challan
 *   onaccount  — any credit sitting in the customer's ledger from receipts / journals
 * Using a credit posts Dr <ledger the credit sits in>, Cr <customer / advance ledger>; when
 * both are the customer's own ledger the entry only records the allocation.
 *
 * Stored on the documents:
 *   payment / advance from credit → paymentAccountId 'credit-adjust' (or 'multi-payment' with
 *                                   a 'credit-adjust' split row), creditAdjustments
 *                                   [{ key, kind, kindLabel, docNo, ledgerName, amount }]
 *   refund applied to invoices    → the same accounts (advanceRefund.accountId / .splits for an
 *                                   invoice's excess advance), creditApplications /
 *                                   advanceRefund.applications [{ invoiceId, invoiceNo, amount }]
 * How much of each credit is left, and how much each invoice still owes, is worked out from
 * those records every time — nothing else has to be kept in step.
 */
(function () {
  'use strict';

  const CREDIT_ADJUST = 'credit-adjust';
  const MULTI = 'multi-payment';

  const $ = id => document.getElementById(id);
  const store = () => window.KYA_STORE || {};
  const r2 = n => Math.round((parseFloat(n) || 0) * 100) / 100;
  const lower = s => String(s || '').trim().toLowerCase();
  const ledgers = () => (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) ? coaLedgers : [];

  function esc(str) {
    if (typeof ohEsc === 'function') return ohEsc(str);
    return String(str == null ? '' : str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }
  function fmt(n) {
    if (typeof fmtNum === 'function') return fmtNum(n);
    return (parseFloat(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Pre-invoice documents that can hold an advance
  const ADVANCE_DOCS = [
    { type: 'Proforma Invoice', store: 'proformaInvoices', noField: 'proformaNo' },
    { type: 'Sales Order', store: 'salesOrders', noField: 'orderNo' },
    { type: 'Delivery Challan', store: 'deliveryChallans', noField: 'challanNo' }
  ];

  function partyOf(customerId) {
    return (typeof findPartyById === 'function' && customerId) ? findPartyById(customerId, 'Customer') : null;
  }
  function partyNameOf(customerId, fallback) {
    const p = partyOf(customerId);
    return (p && p.name) || fallback || '';
  }
  function isSameParty(doc, customerId, partyName) {
    if (!doc) return false;
    if (customerId && String(doc.customerId) === String(customerId)) return true;
    return !!partyName && lower(doc.customerName) === lower(partyName);
  }

  // A non-Cash / Bank ledger as the account — only on documents saved while the former
  // "Adjust with Ledger" choice existed; kept so their entries still post the same way
  function isAdjustLedgerAccount(accountId) {
    if (!accountId || accountId === MULTI || accountId === CREDIT_ADJUST) return false;
    const l = ledgers().find(x => String(x.id) === String(accountId));
    return !!l && l.sgId !== 'sg-cce';
  }

  // Whether a payment / refund goes through Invoice Balance — as its account, or as one row
  // of its Multi Payment / Multi Refund
  function usesCreditAdjust(accountId, splits) {
    if (String(accountId) === CREDIT_ADJUST) return true;
    return String(accountId) === MULTI && (splits || []).some(s =>
      s && String(s.accountId) === CREDIT_ADJUST && (parseFloat(s.amount) || 0) > 0);
  }

  // The part of `amount` that goes through Invoice Balance
  function getCreditAdjustPortion(accountId, splits, amount) {
    if (String(accountId) === CREDIT_ADJUST) return r2(amount);
    if (String(accountId) !== MULTI) return 0;
    const row = (splits || []).find(s => s && String(s.accountId) === CREDIT_ADJUST);
    return row ? Math.min(r2(row.amount), r2(amount)) : 0;
  }

  // ══════════════════════════════════════════════════════════════════
  //  How much of a credit is already used
  // ══════════════════════════════════════════════════════════════════
  // ctx: { excludeVoucherId, excludeDoc: { store, id } } — the document being edited, whose
  // own use doesn't count against it
  function getCreditUsage(key, ctx) {
    ctx = ctx || {};
    let used = 0;
    (store().salesVouchers || []).forEach(v => {
      if (!v || v.isReturn || !usesCreditAdjust(v.paymentAccountId, v.paymentSplits)) return;
      if (ctx.excludeVoucherId != null && String(v.id) === String(ctx.excludeVoucherId)) return;
      (v.creditAdjustments || []).forEach(a => { if (a && a.key === key) used += parseFloat(a.amount) || 0; });
    });
    ADVANCE_DOCS.forEach(src => {
      (store()[src.store] || []).forEach(d => {
        if (!d || !usesCreditAdjust(d.paymentAccountId, d.paymentSplits) || d.paymentStatus === 'Not Paid') return;
        // A cancelled document gave its advance back — unless a reversal settled it
        if (d.status === 'Cancelled' && !d.reversedBy) return;
        if (ctx.excludeDoc && ctx.excludeDoc.store === src.store && String(ctx.excludeDoc.id) === String(d.id)) return;
        (d.creditAdjustments || []).forEach(a => { if (a && a.key === key) used += parseFloat(a.amount) || 0; });
      });
    });
    return r2(used);
  }

  // The documents that used a credit, for messages: "INV-2026-004, PI-2026-002"
  function getCreditUsers(key) {
    const names = [];
    (store().salesVouchers || []).forEach(v => {
      if (v && !v.isReturn && usesCreditAdjust(v.paymentAccountId, v.paymentSplits) && (v.creditAdjustments || []).some(a => a && a.key === key)) names.push(v.invoiceNo);
    });
    ADVANCE_DOCS.forEach(src => (store()[src.store] || []).forEach(d => {
      if (d && usesCreditAdjust(d.paymentAccountId, d.paymentSplits) && !(d.status === 'Cancelled' && !d.reversedBy)
          && (d.creditAdjustments || []).some(a => a && a.key === key)) names.push(d[src.noField]);
    }));
    return names.filter(Boolean);
  }

  // Refuses to remove a document whose credit already paid other documents; returns true
  // when it refused. keys: the credits the document gives (rev:/park:/adv:…)
  function blockIfCreditUsed(keys, label, action) {
    for (const key of keys) {
      const used = getCreditUsage(key);
      if (used > 0.009) {
        if (typeof showToast === 'function') {
          showToast(`${label} can't be ${action || 'removed'} — ₹${fmt(used)} of its ${key.indexOf('adv:') === 0 ? 'advance' : 'credit'} paid ${getCreditUsers(key).join(', ') || 'other documents'}. Change those first.`, 'warning');
        }
        return true;
      }
    }
    return false;
  }

  // A pre-invoice's advance used to pay other documents
  function getPreInvoiceAdvanceUsed(storeKey, docId, ctx) {
    return getCreditUsage(`adv:${storeKey}:${docId}`, ctx);
  }

  // The advance on a pre-invoice that is still free: on the books, less what was used
  function getPreInvoiceAdvanceRemaining(storeKey, doc) {
    if (!doc) return 0;
    const onBooks = parseFloat(doc.advancePaidAmount) || 0;
    if (onBooks <= 0) return 0;
    return Math.max(0, r2(onBooks - getPreInvoiceAdvanceUsed(storeKey, doc.id)));
  }

  // The advance a pre-invoice brings into its Sales Invoice: only the part still free (some
  // may have paid other documents), and never its "Adjust with Invoice Balance" account —
  // on the invoice that advance is simply the advance
  function getConvertedAdvanceFields(storeKey, doc) {
    const full = r2(doc.advancePaidAmount || (doc.paymentStatus === 'Full Payment' ? doc.total : doc.paymentAmount));
    const used = getPreInvoiceAdvanceUsed(storeKey, doc.id);
    const advance = Math.max(0, r2(full - used));
    const total = r2(doc.total);
    const fromCredit = usesCreditAdjust(doc.paymentAccountId, doc.paymentSplits);
    const out = {
      paymentAccountId: fromCredit ? '' : (doc.paymentAccountId || ''),
      paymentSplits: fromCredit ? [] : (Array.isArray(doc.paymentSplits) ? JSON.parse(JSON.stringify(doc.paymentSplits)) : []),
      advancePaidAmount: advance
    };
    if (used > 0) {
      out.paymentAmount = advance;
      out.paymentStatus = advance <= 0 ? 'Not Paid' : (advance >= total - 0.01 ? 'Full Payment' : 'Partial Payment');
    }
    return out;
  }

  // The ledger an advance entry credited: the party's own ledger or Advance from Customers
  function advanceLedgerOf(doc) {
    const entries = (typeof postedEntries !== 'undefined' && Array.isArray(postedEntries)) ? postedEntries : [];
    const e = doc && doc.advanceJournalEntryId ? entries.find(x => String(x.id) === String(doc.advanceJournalEntryId)) : null;
    if (!e) return null;
    const cr = (e.allRows || []).find(r => (parseFloat(r.credit) || 0) > 0);
    return cr ? cr.particular : null;
  }

  // Credit in the customer's ledger from receipts / journals that aren't tied to a document
  function getOnAccountCredit(customerId, partyName) {
    const name = lower(partyName);
    if (!name) return 0;
    const entries = (typeof postedEntries !== 'undefined' && Array.isArray(postedEntries)) ? postedEntries : [];
    let cr = 0, dr = 0;
    entries.forEach(e => {
      if (!e || e.preparedBy === 'Sales Module' || e.jeType === 'advance_receipt') return;
      (e.allRows || []).forEach(r => {
        if (lower(r.particular) !== name) return;
        cr += parseFloat(r.credit) || 0;
        dr += parseFloat(r.debit) || 0;
      });
    });
    const p = partyOf(customerId);
    const ob = p ? (parseFloat(p.openingBalance) || 0) : 0;
    if (ob < 0) cr += -ob; // a credit opening balance is money held for the customer
    return Math.max(0, r2(cr - dr));
  }

  // ══════════════════════════════════════════════════════════════════
  //  Credit a customer can use
  // ══════════════════════════════════════════════════════════════════
  // ctx also takes excludeKeys: credits that can't pay this document (e.g. the advance of
  // the pre-invoice it is billed from)
  function getCustomerCreditSources(customerId, ctx) {
    ctx = ctx || {};
    const party = partyOf(customerId);
    const partyName = (party && party.name) || ctx.partyName || '';
    if (!customerId && !partyName) return [];
    const ledgerParty = typeof isKyaLedgerParty === 'function' && isKyaLedgerParty(party);
    const exclude = new Set(ctx.excludeKeys || []);
    const out = [];
    const add = src => {
      if (exclude.has(src.key)) return;
      const available = r2(src.credit - getCreditUsage(src.key, ctx));
      if (available > 0.009) out.push(Object.assign(src, { available }));
    };
    const vouchers = store().salesVouchers || [];

    vouchers.forEach(v => {
      if (!v || !isSameParty(v, customerId, partyName)) return;
      if (ctx.excludeVoucherId != null && String(v.id) === String(ctx.excludeVoucherId)) return;
      const refunded = (v.paymentStatus === 'Full Refund' || v.paymentStatus === 'Partial Refund') ? (parseFloat(v.paymentAmount) || 0) : 0;

      if (v.isReturn && !v.reversedPreInvoice) {
        // Credit note: its value, less what was paid back (applying it to invoices uses it too)
        add({
          key: `rev:${v.id}`, kind: 'reversal', kindLabel: 'Reversal', docNo: v.invoiceNo, date: v.date,
          note: v.returnAgainstInvoice ? `against ${v.returnAgainstInvoice}` : '',
          ledgerName: partyName, credit: r2((parseFloat(v.total) || 0) - refunded)
        });
      } else if (v.isReturn && v.reversedPreInvoice) {
        // A cancelled pre-invoice: the part of its advance not refunded / applied
        const ref = v.reversedPreInvoice;
        add({
          key: `park:${v.id}`, kind: 'parked', kindLabel: ref.inPartyLedger ? 'Advance in ledger' : 'Refund Payable',
          docNo: v.invoiceNo, date: v.date, note: `${ref.type || 'Pre Invoice'} ${ref.no || ''} cancelled`,
          ledgerName: ref.inPartyLedger ? partyName : 'Refund Payable',
          credit: r2((parseFloat(ref.advance) || 0) - refunded)
        });
      } else if (!v.isReturn && v.advanceRefund && (parseFloat(v.advanceRefund.excess) || 0) > 0) {
        // Advance above this invoice's value, not refunded / applied
        const refund = v.advanceRefund;
        add({
          key: `park:${v.id}`, kind: 'parked', kindLabel: ledgerParty ? 'Advance in ledger' : 'Refund Payable',
          docNo: v.invoiceNo, date: v.date, note: 'advance above the invoice value',
          ledgerName: ledgerParty ? partyName : 'Refund Payable',
          credit: r2((parseFloat(refund.excess) || 0) - (parseFloat(refund.amount) || 0))
        });
      }
    });

    ADVANCE_DOCS.forEach(src => {
      (store()[src.store] || []).forEach(d => {
        if (!d || !isSameParty(d, customerId, partyName)) return;
        if (d.status && d.status !== 'Active') return;
        if (ctx.excludeDoc && ctx.excludeDoc.store === src.store && String(ctx.excludeDoc.id) === String(d.id)) return;
        const ledgerName = advanceLedgerOf(d);
        if (!ledgerName) return; // no advance on the books
        add({
          key: `adv:${src.store}:${d.id}`, kind: 'advance', kindLabel: `${src.type} advance`,
          docNo: d[src.noField], date: d.date, note: '', ledgerName,
          credit: r2(parseFloat(d.advancePaidAmount) || 0)
        });
      });
    });

    add({
      key: `onacct:${customerId || partyName}`, kind: 'onaccount', kindLabel: 'On-account balance',
      docNo: 'Ledger', date: '', note: "credit in the customer's ledger", ledgerName: partyName,
      credit: getOnAccountCredit(customerId, partyName)
    });

    // Oldest first; the on-account balance last
    return out.sort((a, b) => {
      if (a.kind === 'onaccount') return 1;
      if (b.kind === 'onaccount') return -1;
      return String(a.date || '').localeCompare(String(b.date || ''));
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  What an invoice still owes
  // ══════════════════════════════════════════════════════════════════
  // Refunds applied to this invoice (from reversals, cancelled pre-invoices, excess advances)
  function getInvoiceApplied(invoiceId, ctx) {
    ctx = ctx || {};
    let applied = 0;
    (store().salesVouchers || []).forEach(v => {
      if (!v) return;
      if (ctx.excludeVoucherId != null && String(v.id) === String(ctx.excludeVoucherId)) return;
      const lists = [];
      if (v.isReturn && usesCreditAdjust(v.paymentAccountId, v.paymentSplits)) lists.push(v.creditApplications);
      if (!v.isReturn && v.advanceRefund && usesCreditAdjust(v.advanceRefund.accountId, v.advanceRefund.splits)) lists.push(v.advanceRefund.applications);
      lists.forEach(list => (list || []).forEach(a => {
        if (a && String(a.invoiceId) === String(invoiceId)) applied += parseFloat(a.amount) || 0;
      }));
    });
    return r2(applied);
  }

  function getInvoiceOutstanding(inv, ctx) {
    if (!inv || inv.isReturn) return 0;
    const total = r2(inv.total);
    const paid = inv.paymentStatus === 'Full Payment' ? total
      : (inv.paymentStatus === 'Partial Payment' ? r2(inv.paymentAmount) : 0);
    return Math.max(0, r2(total - paid - getInvoiceApplied(inv.id, ctx)));
  }

  // ctx.excludeInvoiceId: an invoice that can't take the refund (the one giving it)
  function getCustomerUnpaidInvoices(customerId, ctx) {
    ctx = ctx || {};
    const partyName = partyNameOf(customerId, ctx.partyName);
    return (store().salesVouchers || [])
      .filter(v => v && !v.isReturn && isSameParty(v, customerId, partyName))
      .filter(v => ctx.excludeInvoiceId == null || String(v.id) !== String(ctx.excludeInvoiceId))
      .map(v => ({
        key: `inv:${v.id}`, invoiceId: v.id, invoiceNo: v.invoiceNo, date: v.date,
        total: r2(v.total), available: getInvoiceOutstanding(v, ctx)
      }))
      .filter(x => x.available > 0.009)
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
  }

  // ══════════════════════════════════════════════════════════════════
  //  Entries
  // ══════════════════════════════════════════════════════════════════
  // Debit rows for a payment / advance paid from credits: one per ledger the credit sits in,
  // scaled to `amount` (rounding on the last row)
  function getCreditAdjustDebitRows(adjustments, amount) {
    const list = (adjustments || []).filter(a => a && (parseFloat(a.amount) || 0) > 0);
    const total = list.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
    if (!list.length || total <= 0) return [];
    const byLedger = new Map();
    let allocated = 0;
    list.forEach((a, i) => {
      const amt = (i === list.length - 1)
        ? r2(amount - allocated)
        : r2((parseFloat(a.amount) || 0) / total * amount);
      allocated += amt;
      const name = a.ledgerName || 'Customer';
      byLedger.set(name, r2((byLedger.get(name) || 0) + amt));
    });
    return Array.from(byLedger.entries()).map(([name, amt]) => ({ name, amount: amt })).filter(r => r.amount > 0);
  }

  // Short line for statements / narrations: "REV-INV-001 ₹590.00, Refund Payable ₹200.00"
  function describeAdjustments(list) {
    return (list || []).filter(a => a && (parseFloat(a.amount) || 0) > 0)
      .map(a => `${a.docNo && a.docNo !== 'Ledger' ? a.docNo : (a.kindLabel || a.invoiceNo || '')} ₹${fmt(a.amount)}`)
      .join(', ');
  }
  function describeApplications(list) {
    return (list || []).filter(a => a && (parseFloat(a.amount) || 0) > 0)
      .map(a => `${a.invoiceNo} ₹${fmt(a.amount)}`).join(', ');
  }

  // Checks saved allocations against what is still available. Returns '' or a message.
  function validateAllocations(mode, allocations, required, customerId, ctx) {
    const list = (allocations || []).filter(a => a && (parseFloat(a.amount) || 0) > 0);
    if (!list.length) return mode === 'apply'
      ? 'Please choose the invoices to apply the refund to.'
      : 'Please choose the balances to adjust the payment with.';
    const sum = r2(list.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0));
    if (Math.abs(sum - r2(required)) > 0.01) {
      return `The adjusted amount of ₹${fmt(sum)} must equal ₹${fmt(required)}.`;
    }
    const pool = mode === 'apply' ? getCustomerUnpaidInvoices(customerId, ctx) : getCustomerCreditSources(customerId, ctx);
    for (const a of list) {
      const key = mode === 'apply' ? `inv:${a.invoiceId}` : a.key;
      const src = pool.find(p => p.key === key);
      const label = mode === 'apply' ? a.invoiceNo : (a.docNo && a.docNo !== 'Ledger' ? a.docNo : a.kindLabel);
      if (!src) return `${label} has nothing ${mode === 'apply' ? 'left to pay' : 'left to use'} any more — please choose again.`;
      if ((parseFloat(a.amount) || 0) > src.available + 0.01) {
        return `${label}: only ₹${fmt(src.available)} is available.`;
      }
    }
    return '';
  }

  // ══════════════════════════════════════════════════════════════════
  //  Popups
  // ══════════════════════════════════════════════════════════════════
  function overlayShell(id, title, subtitle, bodyHtml, footerHtml, width) {
    document.getElementById(id)?.remove();
    const overlay = document.createElement('div');
    overlay.id = id;
    overlay.style.cssText = 'position: fixed; inset: 0; z-index: 10100; background: rgba(15,23,42,0.55); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; font-family: Inter, system-ui, sans-serif; padding: 16px;';
    overlay.innerHTML = `
      <div role="dialog" aria-modal="true" style="background: #fff; border-radius: 18px; padding: 22px 22px 18px; box-shadow: 0 24px 64px rgba(0,0,0,.22); width: ${width || 560}px; max-width: 100%; max-height: 86vh; display: flex; flex-direction: column; position: relative; box-sizing: border-box;">
        <button type="button" data-act="close" aria-label="Close" style="position: absolute; top: 12px; right: 14px; background: none; border: none; font-size: 20px; cursor: pointer; color: #94a3b8; line-height: 1; padding: 4px 8px; border-radius: 6px;">&times;</button>
        <h2 style="margin: 0 0 4px; font-size: 17px; font-weight: 700; color: #0f172a;">${title}</h2>
        <p style="margin: 0 0 14px; font-size: 12.5px; color: #64748b; line-height: 1.45;">${subtitle}</p>
        ${bodyHtml}
        ${footerHtml}
      </div>`;
    document.body.appendChild(overlay);
    return overlay;
  }

  // mode 'pay': choose the customer's credits to pay `required`
  // mode 'apply': choose the customer's unpaid invoices to take a refund of `required`
  // opts: { mode, required, rows (sources / invoices), current [{key, amount}], purpose,
  //         onSave(allocations, total), onCancel }
  function openCreditAllocationModal(opts) {
    const apply = opts.mode === 'apply';
    const rows = opts.rows || [];
    const required = r2(opts.required);
    const current = new Map((opts.current || []).map(a => [a.key, r2(a.amount)]));
    const title = apply ? 'Invoice Balance — Apply to Unpaid Invoices' : 'Invoice Balance';
    const subtitle = apply
      ? `Instead of paying it out, apply this ${esc(opts.purpose || 'refund')} to the customer's unpaid invoices — their balance due goes down by the amounts chosen.`
      : `Pay this ${esc(opts.purpose || 'amount')} from credit the customer already has — unrefunded reversals, Refund Payable, other advances or their on-account balance.`;

    const rowHtml = rows.length ? rows.map((r, i) => `
      <div data-row="${i}" style="display: grid; grid-template-columns: 1fr auto 120px; align-items: center; gap: 10px; padding: 9px 10px; border: 1.5px solid var(--slate-100); border-radius: 10px;">
        <div style="min-width: 0;">
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span style="font-family: monospace; font-weight: 800; font-size: 13px; color: var(--slate-800);">${esc(apply ? r.invoiceNo : (r.docNo === 'Ledger' ? 'Customer ledger' : r.docNo))}</span>
            <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; color: #0f766e; background: #f0fdfa;">${esc(apply ? 'Invoice' : r.kindLabel)}</span>
          </div>
          <div style="font-size: 11.5px; color: var(--slate-500); margin-top: 2px;">${esc([r.date ? r.date.split('-').reverse().join('-') : '', apply ? `Total ₹${fmt(r.total)}` : r.note].filter(Boolean).join(' · '))}</div>
        </div>
        <div style="text-align: right; font-size: 11.5px; color: var(--slate-500); white-space: nowrap;">${apply ? 'Due' : 'Available'}<br><strong style="font-size: 13px; color: var(--slate-800);">₹ ${fmt(r.available)}</strong></div>
        <input type="text" inputmode="decimal" data-amt="${i}" class="je-input" placeholder="0.00" value="${current.has(r.key) ? current.get(r.key).toFixed(2) : ''}" style="height: 34px; padding: 0 10px; font-size: 13px; font-weight: 600; text-align: right; border-radius: 8px;" />
      </div>`).join('')
      : `<div style="padding: 18px; text-align: center; font-size: 13px; color: var(--slate-500); border: 1.5px dashed var(--slate-200); border-radius: 10px;">${apply ? 'This customer has no unpaid invoices.' : 'This customer has no credit available to use.'}</div>`;

    const overlay = overlayShell('kyaCreditAdjustOverlay', title, subtitle, `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; margin-bottom: 12px;">
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #94a3b8;">${apply ? 'Refund to apply' : 'Amount to adjust'}</span>
        <span style="font-size: 15px; font-weight: 800; color: #0f172a;">₹ ${fmt(required)}</span>
      </div>
      <div style="display: flex; justify-content: flex-end; margin-bottom: 8px;">
        ${rows.length ? `<button type="button" data-act="fill" style="background: none; border: none; color: var(--blue-600); font-size: 12px; font-weight: 700; cursor: pointer; padding: 2px 4px;">Fill oldest first</button>` : ''}
      </div>
      <div style="overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 6px; padding-right: 2px;">${rowHtml}</div>`, `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--slate-100);">
        <div data-role="summary" style="font-size: 12.5px; color: var(--slate-600);"></div>
        <div style="display: flex; gap: 10px;">
          <button type="button" data-act="close" class="btn btn-secondary" style="height: 36px; padding: 6px 16px; font-size: 13px; font-weight: 600;">Cancel</button>
          <button type="button" data-act="save" class="btn btn-primary" style="height: 36px; padding: 6px 16px; font-size: 13px; font-weight: 600;">Apply</button>
        </div>
      </div>`, 600);

    const inputs = Array.from(overlay.querySelectorAll('[data-amt]'));
    const summary = overlay.querySelector('[data-role="summary"]');
    const saveBtn = overlay.querySelector('[data-act="save"]');
    let done = false;

    const read = () => inputs.map((inp, i) => ({ row: rows[i], amount: r2(inp.value) }));
    const refresh = () => {
      const vals = read();
      const sum = r2(vals.reduce((s, v) => s + v.amount, 0));
      const over = vals.find(v => v.amount > v.row.available + 0.01);
      let msg = `Selected <strong style="color: ${Math.abs(sum - required) < 0.01 ? '#059669' : 'var(--slate-800)'};">₹ ${fmt(sum)}</strong> of ₹ ${fmt(required)}`;
      let ok = sum > 0 && sum <= required + 0.01 && !over;
      if (over) msg = `<span style="color: #dc2626;">${esc(apply ? over.row.invoiceNo : over.row.docNo)}: only ₹ ${fmt(over.row.available)} available</span>`;
      else if (sum > required + 0.01) msg = `<span style="color: #dc2626;">₹ ${fmt(sum)} is more than ₹ ${fmt(required)}</span>`;
      else if (sum > 0 && sum < required - 0.01) msg += ` <span style="color: #b45309;">— the ${apply ? 'refund' : 'payment'} becomes ₹ ${fmt(sum)}</span>`;
      summary.innerHTML = msg;
      saveBtn.disabled = !ok;
      saveBtn.style.opacity = ok ? '' : '0.5';
      saveBtn.style.cursor = ok ? '' : 'not-allowed';
    };
    const close = (saved) => {
      if (done) return;
      done = true;
      overlay.remove();
      document.removeEventListener('keydown', onKey, true);
      if (saved) { if (typeof opts.onSave === 'function') opts.onSave(saved.list, saved.total); }
      else if (typeof opts.onCancel === 'function') opts.onCancel();
    };
    const save = () => {
      if (saveBtn.disabled) return;
      const list = read().filter(v => v.amount > 0).map(v => apply
        ? { invoiceId: v.row.invoiceId, invoiceNo: v.row.invoiceNo, amount: v.amount }
        : { key: v.row.key, kind: v.row.kind, kindLabel: v.row.kindLabel, docNo: v.row.docNo, ledgerName: v.row.ledgerName, amount: v.amount });
      close({ list, total: r2(list.reduce((s, a) => s + a.amount, 0)) });
    };
    // Esc / Enter belong to this popup only (it can sit over the Multi Payment popup)
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(null); }
      else if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); e.stopPropagation(); save(); }
    };
    document.addEventListener('keydown', onKey, true);
    overlay.querySelectorAll('[data-act="close"]').forEach(b => b.addEventListener('click', () => close(null)));
    overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(null); });
    overlay.querySelector('[data-act="fill"]')?.addEventListener('click', () => {
      let left = required;
      inputs.forEach((inp, i) => {
        const take = r2(Math.min(left, rows[i].available));
        inp.value = take > 0 ? take.toFixed(2) : '';
        left = r2(left - take);
      });
      refresh();
    });
    inputs.forEach((inp, i) => {
      inp.addEventListener('input', refresh);
      inp.addEventListener('focus', () => inp.select());
      // Double-click takes as much as this row allows
      inp.addEventListener('dblclick', () => {
        const others = read().reduce((s, v, j) => s + (j === i ? 0 : v.amount), 0);
        const take = r2(Math.max(0, Math.min(rows[i].available, required - others)));
        inp.value = take > 0 ? take.toFixed(2) : '';
        refresh();
      });
    });
    saveBtn.addEventListener('click', save);
    refresh();
    (inputs[0] || saveBtn).focus();
  }

  // ══════════════════════════════════════════════════════════════════
  //  Account lists
  // ══════════════════════════════════════════════════════════════════
  // Adds "Invoice Balance" to an account list, after the cash / bank accounts and before
  // Multi Payment / Multi Refund
  function appendAdjustOptions(select, selectedId) {
    if (!select) return;
    const creditOpt = document.createElement('option');
    creditOpt.value = CREDIT_ADJUST;
    creditOpt.textContent = 'Invoice Balance';
    if (String(selectedId) === CREDIT_ADJUST) creditOpt.selected = true;
    const multiOpt = Array.from(select.options).find(o => o.value === MULTI);
    select.insertBefore(creditOpt, multiOpt || null);
  }

  // A controller for one account list. cfg:
  //   selectId, summaryAfterId (element the summary chip goes after; default the select)
  //   getMode() → 'pay' | 'apply'
  //   getCustomerId(), getRequired() → amount to settle, getCtx() → usage / exclusion context
  //   purpose() → 'payment' | 'advance' | 'refund' (wording)
  //   onAmount(total) → the form takes a smaller amount when fewer credits were chosen
  //   repopulate(selectedId) → rebuild the list with this account selected
  function createAdjustController(cfg) {
    let allocations = [];
    let prevValue = '';
    let busy = false;
    const select = () => $(cfg.selectId);

    function summaryEl() {
      let el = $(`${cfg.selectId}AdjustSummary`);
      if (!el) {
        const anchor = (cfg.summaryAfterId && $(cfg.summaryAfterId)) || select();
        if (!anchor || !anchor.parentElement) return null;
        el = document.createElement('button');
        el.type = 'button';
        el.id = `${cfg.selectId}AdjustSummary`;
        el.title = 'Edit the adjustment';
        el.style.cssText = 'display: none; align-items: center; justify-content: space-between; gap: 8px; width: 100%; padding: 5px 9px; margin-top: 4px; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 6px; font-size: 11.5px; font-weight: 600; color: #0f766e; cursor: pointer; font-family: inherit; box-sizing: border-box; text-align: left;';
        anchor.insertAdjacentElement('afterend', el);
        el.addEventListener('click', () => openAllocation());
      }
      return el;
    }

    function refreshSummary() {
      const el = summaryEl();
      if (!el) return;
      const sel = select();
      if (!sel || sel.value !== CREDIT_ADJUST) { el.style.display = 'none'; return; }
      const used = allocations.filter(a => (parseFloat(a.amount) || 0) > 0);
      const total = r2(used.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0));
      const balanced = Math.abs(total - r2(cfg.getRequired())) < 0.01;
      const noun = cfg.getMode() === 'apply' ? 'invoice' : 'balance';
      el.style.display = 'flex';
      el.innerHTML = used.length
        ? `<span>⇄ ${used.length} ${noun}${used.length > 1 ? 's' : ''} &middot; <span style="color: ${balanced ? '#059669' : '#dc2626'};">₹ ${fmt(total)}</span></span><span style="color: var(--blue-600);">Edit</span>`
        : `<span style="color: #dc2626;">Nothing chosen yet</span><span style="color: var(--blue-600);">Choose</span>`;
    }

    function revert() {
      const sel = select();
      if (sel) {
        if (typeof cfg.repopulate === 'function') cfg.repopulate(prevValue);
        sel.value = prevValue || '';
      }
      refreshSummary();
    }

    function openAllocation() {
      const customerId = cfg.getCustomerId();
      if (!customerId) {
        if (typeof showToast === 'function') showToast('Please select a Customer first.', 'warning');
        revert();
        return;
      }
      const required = r2(cfg.getRequired());
      if (!(required > 0)) {
        if (typeof showToast === 'function') showToast(`Enter the ${cfg.purpose ? cfg.purpose() : 'amount'} first.`, 'warning');
        revert();
        return;
      }
      const mode = cfg.getMode();
      const ctx = cfg.getCtx ? cfg.getCtx() : {};
      const rows = mode === 'apply' ? getCustomerUnpaidInvoices(customerId, ctx) : getCustomerCreditSources(customerId, ctx);
      busy = true;
      openCreditAllocationModal({
        mode, required, rows,
        purpose: cfg.purpose ? cfg.purpose() : '',
        current: allocations.map(a => ({ key: mode === 'apply' ? `inv:${a.invoiceId}` : a.key, amount: a.amount })),
        onSave: (list, total) => {
          busy = false;
          allocations = list;
          prevValue = CREDIT_ADJUST;
          if (total < required - 0.01 && typeof cfg.onAmount === 'function') cfg.onAmount(total);
          refreshSummary();
        },
        onCancel: () => {
          busy = false;
          if (!allocations.length) revert(); else refreshSummary();
        }
      });
    }

    // For the Invoice Balance row of a Multi Payment / Multi Refund: choose credits / invoices
    // for that row's amount. Works on the caller's copy — nothing is kept until set().
    // opts: { required, current, onSave(list, total), onCancel }
    function pick(opts) {
      const customerId = cfg.getCustomerId();
      if (!customerId) {
        if (typeof showToast === 'function') showToast('Please select a Customer first.', 'warning');
        if (typeof opts.onCancel === 'function') opts.onCancel();
        return;
      }
      const mode = cfg.getMode();
      const ctx = cfg.getCtx ? cfg.getCtx() : {};
      openCreditAllocationModal({
        mode,
        required: r2(opts.required),
        rows: mode === 'apply' ? getCustomerUnpaidInvoices(customerId, ctx) : getCustomerCreditSources(customerId, ctx),
        purpose: cfg.purpose ? cfg.purpose() : '',
        current: (opts.current || []).map(a => ({ key: mode === 'apply' ? `inv:${a.invoiceId}` : a.key, amount: a.amount })),
        onSave: opts.onSave,
        onCancel: opts.onCancel
      });
    }

    // Wire to the list's own change handling: returns true when it took the change
    function handleChange() {
      const sel = select();
      if (!sel) return false;
      if (sel.value === CREDIT_ADJUST) { openAllocation(); return true; }
      allocations = [];
      prevValue = sel.value;
      refreshSummary();
      return false;
    }

    return {
      handleChange,
      rememberPrev: () => { const sel = select(); if (sel && !busy) prevValue = sel.value; },
      load: list => { allocations = Array.isArray(list) ? JSON.parse(JSON.stringify(list)) : []; prevValue = select()?.value || ''; refreshSummary(); },
      reset: () => { allocations = []; refreshSummary(); },
      get: () => allocations.filter(a => (parseFloat(a.amount) || 0) > 0).map(a => Object.assign({}, a)),
      set: list => { allocations = Array.isArray(list) ? JSON.parse(JSON.stringify(list)) : []; refreshSummary(); },
      getMode: () => cfg.getMode(),
      isCreditAdjust: () => select()?.value === CREDIT_ADJUST,
      refreshSummary,
      open: openAllocation,
      pick
    };
  }

  window.KYA_CREDIT_ADJUST = CREDIT_ADJUST;
  window.isAdjustLedgerAccount = isAdjustLedgerAccount;
  window.usesCreditAdjust = usesCreditAdjust;
  window.getCreditAdjustPortion = getCreditAdjustPortion;
  window.getCreditUsage = getCreditUsage;
  window.getPreInvoiceAdvanceUsed = getPreInvoiceAdvanceUsed;
  window.getPreInvoiceAdvanceRemaining = getPreInvoiceAdvanceRemaining;
  window.getConvertedAdvanceFields = getConvertedAdvanceFields;
  window.blockIfCreditUsed = blockIfCreditUsed;
  window.getCreditUsers = getCreditUsers;
  window.getCustomerCreditSources = getCustomerCreditSources;
  window.getCustomerUnpaidInvoices = getCustomerUnpaidInvoices;
  window.getInvoiceApplied = getInvoiceApplied;
  window.getInvoiceOutstanding = getInvoiceOutstanding;
  window.getCreditAdjustDebitRows = getCreditAdjustDebitRows;
  window.describeAdjustments = describeAdjustments;
  window.describeApplications = describeApplications;
  window.validateAllocations = validateAllocations;
  window.appendAdjustOptions = appendAdjustOptions;
  window.createAdjustController = createAdjustController;
  window.openCreditAllocationModal = openCreditAllocationModal;
})();
