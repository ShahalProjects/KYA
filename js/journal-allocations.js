/**
 * js/journal-allocations.js
 * Journal Entry → what a receipt / payment is against (KYA). A Journal line whose Particulars
 * is a customer or Trade Receivables ledger on a To (Cr) line — money received — or a supplier
 * or Trade Payables ledger on a By (Dr) line — money paid — opens a popup once its amount is
 * entered, to split that amount across:
 *
 *   Customer   unpaid Sales Invoices · open Pre Invoices (Proforma / Sales Order / Delivery
 *              Challan) · Advance
 *   Supplier   unpaid Purchases · open Pre Purchase (Purchase Proforma / Purchase Order / GRN)
 *              · Advance
 *
 * The journal posts exactly as entered (the party's own ledger); the line only records what the
 * money is against, as row.allocations [{ key, kind, kindLabel, store, docId, docNo, amount }]
 * plus row.allocFor (the party name it was made for).
 *
 * Like Invoice Balance (sales-credit-adjust.js), everything is worked out from the posted
 * entries every time — editing or deleting the entry undoes it, and drafts count for nothing:
 *   - an invoice / purchase owes that much less (getInvoiceOutstanding / getPurchaseOutstanding)
 *   - a pre document's share is an advance against it, carried to the invoice / purchase made
 *     from it; if the pre document is cancelled the money is the party's free advance again
 *   - Advance stays as the party's on-account balance
 */
(function () {
  'use strict';

  const r2 = n => Math.round((parseFloat(n) || 0) * 100) / 100;
  const store = () => window.KYA_STORE || {};
  const lower = s => String(s || '').trim().toLowerCase();
  const ledgers = () => (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) ? coaLedgers : [];
  const entries = () => (typeof postedEntries !== 'undefined' && Array.isArray(postedEntries)) ? postedEntries : [];

  function esc(str) {
    if (typeof ohEsc === 'function') return ohEsc(str);
    return String(str == null ? '' : str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }
  function fmt(n) {
    if (typeof fmtNum === 'function') return fmtNum(n);
    return (parseFloat(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Pre-invoices an amount can be against, and the field / pending flag that tie the Sales
  // Invoice made from one back to it (as in sales-preinvoice-picker.js)
  const SALES_PRE = [
    { type: 'Proforma Invoice', store: 'proformaInvoices', noField: 'proformaNo', link: 'convertedFromProformaId', pending: '_pendingConvertProformaId' },
    { type: 'Sales Order', store: 'salesOrders', noField: 'orderNo', link: 'convertedFromSalesOrderId', pending: '_pendingConvertSalesOrderId' },
    { type: 'Delivery Challan', store: 'deliveryChallans', noField: 'challanNo', link: 'convertedFromDeliveryChallanId', pending: '_pendingConvertDeliveryChallanId' }
  ];

  // Pre Purchase documents that take an advance (Purchase Proforma, Purchase Order, GRN);
  // a purchase made from one keeps its key in preDocKind
  function purchasePreDocs() {
    return (window.PURCHASE_PRE_DOCS || []).filter(d => d && d.advance);
  }

  // ══════════════════════════════════════════════════════════════════
  //  Which lines take the popup
  // ══════════════════════════════════════════════════════════════════
  // The party a Particulars name stands for, when its money can be against documents:
  // a customer / Trade Receivables ledger, or a supplier / Trade Payables ledger (the two
  // control ledgers themselves are not parties)
  function getJournalAllocParty(name) {
    const n = lower(name);
    if (!n) return null;
    const cust = (typeof getKyaCustomers === 'function' ? getKyaCustomers() : []).find(c => lower(c.name) === n);
    if (cust) return { side: 'receivable', id: cust.id, name: cust.name };
    const supp = (typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : []).find(s => lower(s.name) === n);
    if (supp) return { side: 'payable', id: supp.id, name: supp.name };
    const ldg = ledgers().find(l => l.type === 'ledger' && lower(l.name) === n
      && ((l.sgId === 'sg-tr' && n !== 'trade receivables') || (l.sgId === 'sg-tp' && n !== 'trade payables')));
    if (ldg) return { side: ldg.sgId === 'sg-tr' ? 'receivable' : 'payable', id: ldg.id, name: ldg.name };
    return null;
  }

  // The party of a line on its settlement side: money received from a customer (To / Cr),
  // money paid to a supplier (By / Dr). Other lines take no popup.
  function getJournalRowAllocParty(row) {
    if (!row) return null;
    const p = getJournalAllocParty(row.particular);
    if (!p) return null;
    return (p.side === 'receivable' ? row.type === 'To' : row.type === 'By') ? p : null;
  }

  function getJournalRowAmount(row) {
    return r2(row && (row.type === 'To' ? row.credit : row.debit));
  }

  // The line's allocations, while they still belong to its party and side
  function getJournalRowAllocations(row) {
    if (!row || !Array.isArray(row.allocations) || !row.allocations.length) return [];
    const p = getJournalRowAllocParty(row);
    if (!p || lower(row.allocFor) !== lower(p.name)) return [];
    return row.allocations.filter(a => a && r2(a.amount) > 0);
  }

  // ══════════════════════════════════════════════════════════════════
  //  What posted entries put against each document
  // ══════════════════════════════════════════════════════════════════
  // ctx.excludeJournalEntryId: the entry being edited, whose own allocations don't count
  function eachPostedAllocation(fn, ctx) {
    const skip = ctx && ctx.excludeJournalEntryId != null ? String(ctx.excludeJournalEntryId) : null;
    entries().forEach(e => {
      if (!e || (skip !== null && String(e.id) === skip)) return;
      (e.allRows || []).forEach(row => {
        if (!row || !Array.isArray(row.allocations)) return;
        row.allocations.forEach(a => { if (a && a.store && r2(a.amount) > 0) fn(a, row, e); });
      });
    });
  }

  function getJournalAllocatedTo(storeKey, docId, ctx) {
    if (docId === null || docId === undefined || docId === '') return 0;
    let sum = 0;
    eachPostedAllocation(a => {
      if (a.store === storeKey && String(a.docId) === String(docId)) sum += r2(a.amount);
    }, ctx);
    return r2(sum);
  }

  // Received by journal against a Sales Invoice: directly, or against the pre-invoice it was
  // made from. `inv` may be a posted invoice or { id, convertedFrom…Id } for a form.
  function getInvoiceJournalReceived(inv, ctx) {
    if (!inv || inv.isReturn) return 0;
    let sum = getJournalAllocatedTo('salesVouchers', inv.id, ctx);
    SALES_PRE.forEach(src => { if (inv[src.link]) sum += getJournalAllocatedTo(src.store, inv[src.link], ctx); });
    return r2(sum);
  }

  // Paid by journal against a Purchase: directly, or against the Pre Purchase document it was
  // made from. `v` may be a posted purchase or { id, preDocKind, preDocId } for a form.
  function getPurchaseJournalPaid(v, ctx) {
    if (!v || v.isReturn) return 0;
    let sum = getJournalAllocatedTo('purchaseVouchers', v.id, ctx);
    const pre = v.preDocKind ? purchasePreDocs().find(d => d.key === v.preDocKind) : null;
    if (pre) sum += getJournalAllocatedTo(pre.storeKey, v.preDocId, ctx);
    return r2(sum);
  }

  // What a posted purchase still owes: its total, less what was paid on it (advance + payment)
  // and by journal
  function getPurchaseOutstanding(v, ctx) {
    if (!v || v.isReturn) return 0;
    const paid = typeof getPurchasePaidAmount === 'function' ? getPurchasePaidAmount(v)
      : (v.paymentStatus === 'Full Payment' ? r2(v.total) : (v.paymentStatus === 'Partial Payment' ? r2(v.paymentAmount) : 0));
    return Math.max(0, r2(r2(v.total) - paid - getPurchaseJournalPaid(v, ctx)));
  }

  const isParty = (doc, idField, nameField, party) =>
    !!doc && (String(doc[idField]) === String(party.id) || lower(doc[nameField]) === lower(party.name));
  const isOpen = d => !d.status || d.status === 'Active';

  // The part of a customer's journal receipts tied up in documents: what invoices took (never
  // more than they owed) and what open pre-invoices hold. The rest is on account.
  function getCustomerJournalCommitted(customerId, partyName, ctx) {
    const party = { id: customerId, name: partyName };
    let sum = 0;
    (store().salesVouchers || []).forEach(v => {
      if (!v || v.isReturn || !isParty(v, 'customerId', 'customerName', party)) return;
      const received = getInvoiceJournalReceived(v, ctx);
      if (received <= 0) return;
      const due = typeof getInvoiceOutstanding === 'function'
        ? getInvoiceOutstanding(v, Object.assign({}, ctx, { withoutJournal: true })) : received;
      sum += Math.min(received, due);
    });
    SALES_PRE.forEach(src => (store()[src.store] || []).forEach(d => {
      if (d && isOpen(d) && isParty(d, 'customerId', 'customerName', party)) sum += getJournalAllocatedTo(src.store, d.id, ctx);
    }));
    return r2(sum);
  }

  // ══════════════════════════════════════════════════════════════════
  //  What a line can be against
  // ══════════════════════════════════════════════════════════════════
  // Unpaid invoices / purchases (oldest first), then open pre documents (oldest first), then
  // Advance (any amount)
  function getJournalAllocSources(party, ctx) {
    ctx = Object.assign({}, ctx, { partyName: party.name });
    const docs = [];
    const pres = [];
    const byDate = (a, b) => String(a.date || '').localeCompare(String(b.date || ''));
    const S = store();

    if (party.side === 'receivable') {
      (S.salesVouchers || []).forEach(v => {
        if (!v || v.isReturn || !isParty(v, 'customerId', 'customerName', party)) return;
        const due = typeof getInvoiceOutstanding === 'function' ? getInvoiceOutstanding(v, ctx) : 0;
        if (due > 0.009) docs.push({ key: `salesVouchers:${v.id}`, kind: 'invoice', kindLabel: 'Invoice', store: 'salesVouchers', docId: v.id, docNo: v.invoiceNo, date: v.date, total: r2(v.total), available: due });
      });
      SALES_PRE.forEach(src => (S[src.store] || []).forEach(d => {
        if (!d || !isOpen(d) || !isParty(d, 'customerId', 'customerName', party)) return;
        const advance = r2(r2(d.advancePaidAmount) + getJournalAllocatedTo(src.store, d.id, ctx));
        const available = Math.max(0, r2(r2(d.total) - advance));
        if (available > 0.009) pres.push({ key: `${src.store}:${d.id}`, kind: 'preinvoice', kindLabel: src.type, store: src.store, docId: d.id, docNo: d[src.noField], date: d.date, total: r2(d.total), advance, available });
      }));
    } else {
      (S.purchaseVouchers || []).forEach(v => {
        if (!v || v.isReturn || !isParty(v, 'vendorId', 'vendorName', party)) return;
        const due = getPurchaseOutstanding(v, ctx);
        if (due > 0.009) docs.push({ key: `purchaseVouchers:${v.id}`, kind: 'bill', kindLabel: 'Purchase', store: 'purchaseVouchers', docId: v.id, docNo: v.invoiceNo, date: v.date, total: r2(v.total), available: due });
      });
      purchasePreDocs().forEach(src => (S[src.storeKey] || []).forEach(d => {
        if (!d || !isOpen(d) || !isParty(d, 'vendorId', 'vendorName', party)) return;
        const advance = r2(r2(d.advancePaidAmount) + getJournalAllocatedTo(src.storeKey, d.id, ctx));
        const available = Math.max(0, r2(r2(d.total) - advance));
        if (available > 0.009) pres.push({ key: `${src.storeKey}:${d.id}`, kind: 'prepurchase', kindLabel: src.kind, store: src.storeKey, docId: d.id, docNo: d.docNo, date: d.date, total: r2(d.total), advance, available });
      }));
    }

    return docs.sort(byDate).concat(pres.sort(byDate)).concat([{
      key: 'advance', kind: 'advance', kindLabel: 'Advance', store: '', docId: null, docNo: 'Advance', date: '', available: Infinity
    }]);
  }

  // Checks every line's allocations before posting. Returns '' or a message.
  function validateJournalAllocations(rows, ctx) {
    const used = new Map();
    for (let i = 0; i < (rows || []).length; i++) {
      const row = rows[i];
      const list = getJournalRowAllocations(row);
      if (!list.length) continue;
      const amount = getJournalRowAmount(row);
      const sum = r2(list.reduce((s, a) => s + r2(a.amount), 0));
      if (Math.abs(sum - amount) > 0.01) {
        return `Line ${i + 1} (${row.particular}): ₹${fmt(sum)} is adjusted, but the line is ₹${fmt(amount)}. Click its adjustment to fix it.`;
      }
      const party = getJournalRowAllocParty(row);
      const pool = getJournalAllocSources(party, ctx);
      for (const a of list) {
        if (a.kind === 'advance') continue;
        const src = pool.find(p => p.key === a.key);
        const taken = r2((used.get(a.key) || 0) + r2(a.amount));
        used.set(a.key, taken);
        if (!src) return `Line ${i + 1}: ${a.docNo} has nothing left to adjust any more — please choose again.`;
        if (taken > src.available + 0.01) return `Line ${i + 1}: ${a.docNo} — only ₹${fmt(src.available)} is left to adjust.`;
      }
    }
    return '';
  }

  // For the Sales Invoice / Purchase views: the payment status once Journal Entry receipts /
  // payments against the voucher count (e.g. Full Payment for an invoice the journal settled)
  function getJournalSettledStatus(total, paidOnVoucher, journal) {
    const paid = r2(r2(paidOnVoucher) + r2(journal));
    if (paid >= r2(total) - 0.005) return 'Full Payment';
    return paid > 0 ? 'Partial Payment' : 'Not Paid';
  }

  // Short line for the chip under a Journal line: "INV-2026-004 ₹5,000.00 · Advance ₹1,000.00"
  function describeJournalAllocations(list) {
    return (list || []).filter(a => a && r2(a.amount) > 0).map(a => `${a.docNo} ₹${fmt(a.amount)}`).join(' · ');
  }

  // ══════════════════════════════════════════════════════════════════
  //  Popup (the look of the Invoice Balance popup, sales-credit-adjust.js)
  // ══════════════════════════════════════════════════════════════════
  // opts: { party, required, rows, current [{ key, amount }], onSave(list), onCancel }
  function openJournalAllocationModal(opts) {
    const party = opts.party;
    const receivable = party.side === 'receivable';
    const rows = opts.rows || [];
    const required = r2(opts.required);
    const current = new Map((opts.current || []).map(a => [a.key, r2(a.amount)]));
    const docCount = rows.filter(r => r.kind !== 'advance').length;
    const title = receivable ? 'Received Against' : 'Paid Against';
    const subtitle = receivable
      ? `Split this receipt from ${esc(party.name)} across their unpaid invoices, pre invoices or advance — those invoices show that much less due.`
      : `Split this payment to ${esc(party.name)} across their unpaid purchases, pre purchase documents or advance — those purchases show that much less due.`;

    const sub = r => {
      if (r.kind === 'advance') return `Not against a document — stays in the ${receivable ? "customer's" : "supplier's"} ledger as an advance`;
      const parts = [r.date ? r.date.split('-').reverse().join('-') : '', `Total ₹${fmt(r.total)}`];
      if ((r.kind === 'preinvoice' || r.kind === 'prepurchase') && r.advance > 0) parts.push(`Advance ₹${fmt(r.advance)}`);
      return parts.filter(Boolean).join(' · ');
    };
    const rightLabel = r => r.kind === 'advance' ? 'Any amount'
      : `${(r.kind === 'preinvoice' || r.kind === 'prepurchase') ? 'Balance' : 'Due'}<br><strong style="font-size: 13px; color: var(--slate-800);">₹ ${fmt(r.available)}</strong>`;

    const rowHtml = rows.map((r, i) => `
      <div data-row="${i}" style="display: grid; grid-template-columns: 1fr auto 120px; align-items: center; gap: 10px; padding: 9px 10px; border: 1.5px solid var(--slate-100); border-radius: 10px;">
        <div style="min-width: 0;">
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span style="font-family: monospace; font-weight: 800; font-size: 13px; color: var(--slate-800);">${esc(r.docNo)}</span>
            ${r.kind === 'advance' ? '' : `<span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; color: #0f766e; background: #f0fdfa;">${esc(r.kindLabel)}</span>`}
          </div>
          <div style="font-size: 11.5px; color: var(--slate-500); margin-top: 2px;">${esc(sub(r))}</div>
        </div>
        <div style="text-align: right; font-size: 11.5px; color: var(--slate-500); white-space: nowrap;">${rightLabel(r)}</div>
        <input type="text" inputmode="decimal" data-amt="${i}" class="je-input" placeholder="0.00" value="${current.has(r.key) ? current.get(r.key).toFixed(2) : ''}" style="height: 34px; padding: 0 10px; font-size: 13px; font-weight: 600; text-align: right; border-radius: 8px;" />
      </div>`).join('');

    const emptyNote = docCount ? '' : `<div style="padding: 12px; text-align: center; font-size: 12.5px; color: var(--slate-500); border: 1.5px dashed var(--slate-200); border-radius: 10px;">${receivable ? 'This customer has no unpaid invoices or open pre invoices.' : 'This supplier has no unpaid purchases or open pre purchase documents.'}</div>`;

    document.getElementById('kyaJournalAllocOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'kyaJournalAllocOverlay';
    overlay.style.cssText = 'position: fixed; inset: 0; z-index: 10100; background: rgba(15,23,42,0.55); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; font-family: Inter, system-ui, sans-serif; padding: 16px;';
    overlay.innerHTML = `
      <div role="dialog" aria-modal="true" aria-label="${title}" style="background: #fff; border-radius: 18px; padding: 22px 22px 18px; box-shadow: 0 24px 64px rgba(0,0,0,.22); width: 600px; max-width: 100%; max-height: 86vh; display: flex; flex-direction: column; position: relative; box-sizing: border-box;">
        <button type="button" data-act="close" aria-label="Close" style="position: absolute; top: 12px; right: 14px; background: none; border: none; font-size: 20px; cursor: pointer; color: #94a3b8; line-height: 1; padding: 4px 8px; border-radius: 6px;">&times;</button>
        <h2 style="margin: 0 0 4px; font-size: 17px; font-weight: 700; color: #0f172a;">${title}</h2>
        <p style="margin: 0 0 14px; font-size: 12.5px; color: #64748b; line-height: 1.45;">${subtitle}</p>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; margin-bottom: 12px;">
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #94a3b8;">${receivable ? 'Amount received' : 'Amount paid'}</span>
          <span style="font-size: 15px; font-weight: 800; color: #0f172a;">₹ ${fmt(required)}</span>
        </div>
        <div style="display: flex; justify-content: flex-end; margin-bottom: 8px;">
          <button type="button" data-act="fill" style="background: none; border: none; color: var(--blue-600); font-size: 12px; font-weight: 700; cursor: pointer; padding: 2px 4px;">Fill oldest first</button>
        </div>
        <div style="overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 6px; padding-right: 2px;">${emptyNote}${rowHtml}</div>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--slate-100);">
          <div data-role="summary" style="font-size: 12.5px; color: var(--slate-600);"></div>
          <div style="display: flex; gap: 10px;">
            <button type="button" data-act="close" class="btn btn-secondary" style="height: 36px; padding: 6px 16px; font-size: 13px; font-weight: 600;">Cancel</button>
            <button type="button" data-act="save" class="btn btn-primary" style="height: 36px; padding: 6px 16px; font-size: 13px; font-weight: 600;">Apply</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const inputs = Array.from(overlay.querySelectorAll('[data-amt]'));
    const summary = overlay.querySelector('[data-role="summary"]');
    const saveBtn = overlay.querySelector('[data-act="save"]');
    const amountOf = inp => {
      const v = typeof parseAmt === 'function' ? parseAmt(inp.value) : parseFloat(String(inp.value).replace(/,/g, ''));
      return r2(v);
    };
    let done = false;

    const read = () => inputs.map((inp, i) => ({ row: rows[i], amount: amountOf(inp) }));
    const refresh = () => {
      const vals = read();
      const sum = r2(vals.reduce((s, v) => s + v.amount, 0));
      const over = vals.find(v => v.amount > v.row.available + 0.01);
      const left = r2(required - sum);
      let msg = `Selected <strong style="color: ${Math.abs(left) < 0.01 ? '#059669' : 'var(--slate-800)'};">₹ ${fmt(sum)}</strong> of ₹ ${fmt(required)}`;
      if (over) msg = `<span style="color: #dc2626;">${esc(over.row.docNo)}: only ₹ ${fmt(over.row.available)} is left</span>`;
      else if (left < -0.01) msg = `<span style="color: #dc2626;">₹ ${fmt(sum)} is more than ₹ ${fmt(required)}</span>`;
      else if (left > 0.01 && sum > 0) msg += ` <span style="color: #b45309;">— ₹ ${fmt(left)} left to put on a row or in Advance</span>`;
      summary.innerHTML = msg;
      const ok = !over && Math.abs(left) < 0.01;
      saveBtn.disabled = !ok;
      saveBtn.style.opacity = ok ? '' : '0.5';
      saveBtn.style.cursor = ok ? '' : 'not-allowed';
    };
    const close = (list) => {
      if (done) return;
      done = true;
      overlay.remove();
      document.removeEventListener('keydown', onKey, true);
      if (list) { if (typeof opts.onSave === 'function') opts.onSave(list); }
      else if (typeof opts.onCancel === 'function') opts.onCancel();
    };
    const save = () => {
      if (saveBtn.disabled) return;
      close(read().filter(v => v.amount > 0).map(v => ({
        key: v.row.key, kind: v.row.kind, kindLabel: v.row.kindLabel, store: v.row.store,
        docId: v.row.docId, docNo: v.row.docNo, amount: v.amount
      })));
    };
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(null); }
      else if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); e.stopPropagation(); save(); }
    };
    document.addEventListener('keydown', onKey, true);
    overlay.querySelectorAll('[data-act="close"]').forEach(b => b.addEventListener('click', () => close(null)));
    overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(null); });
    // Documents oldest first (invoices / purchases, then pre documents), the rest to Advance
    overlay.querySelector('[data-act="fill"]').addEventListener('click', () => {
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
      inp.addEventListener('blur', () => { const v = amountOf(inp); inp.value = v > 0 ? v.toFixed(2) : ''; refresh(); });
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

  window.getJournalAllocParty = getJournalAllocParty;
  window.getJournalRowAllocParty = getJournalRowAllocParty;
  window.getJournalRowAmount = getJournalRowAmount;
  window.getJournalRowAllocations = getJournalRowAllocations;
  window.getJournalAllocatedTo = getJournalAllocatedTo;
  window.getInvoiceJournalReceived = getInvoiceJournalReceived;
  window.getPurchaseJournalPaid = getPurchaseJournalPaid;
  window.getPurchaseOutstanding = getPurchaseOutstanding;
  window.getCustomerJournalCommitted = getCustomerJournalCommitted;
  window.getJournalAllocSources = getJournalAllocSources;
  window.validateJournalAllocations = validateJournalAllocations;
  window.describeJournalAllocations = describeJournalAllocations;
  window.getJournalSettledStatus = getJournalSettledStatus;
  window.openJournalAllocationModal = openJournalAllocationModal;
})();
