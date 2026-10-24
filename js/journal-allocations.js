/**
 * js/journal-allocations.js
 * Journal Entry → what a party's money is against (KYA). Once its amount is entered, a Journal
 * line opens a popup to split that amount, by what the line is (MODES):
 *
 *   receipt      customer / Trade Receivables ledger on To (Cr) — money received:
 *                Opening Balance · unpaid Sales Invoices · open Pre Invoices (Proforma / Sales
 *                Order / Delivery Challan) · Advance
 *   payment      supplier / Trade Payables ledger on By (Dr) — money paid:
 *                Opening Balance · unpaid Purchases · open Pre Purchase (Purchase Proforma /
 *                Purchase Order / GRN) · Advance
 *   refund       customer on By (Dr) — a refund paid out: credit notes (Sales Reversals),
 *                advances held in the party's own ledger, pre invoice advances (incl. by
 *                journal) and the on-account balance · On account
 *   refundIn     supplier on To (Cr) — a refund received: Purchase Reversals and advances held in
 *                the party's own ledger (incl. a cancelled Pre Purchase's journal advance),
 *                advances paid by journal (unused, or on an open Pre Purchase) · On account
 *   refundPool   Refund Payable on By (Dr): customers' advances held there · Other
 *   advancePool  Advances to Suppliers on To (Cr): suppliers' advances held there · Other
 *
 * Every party line takes the popup, whatever the other ledger. The four refund modes read as
 * a refund with a Cash / Bank line opposite the party line, and as an adjustment (ADJUST)
 * with any other ledger — the same sources either way.
 *
 * The journal posts exactly as entered; the line only records what the money is against, as
 * row.allocations [{ key, kind, kindLabel, store, docId, docNo, amount, partyId?, partyName? }]
 * plus row.allocFor / row.allocMode (the party name and mode it was made for).
 *
 * Like Invoice Balance (sales-credit-adjust.js), everything is worked out from the posted
 * entries every time — editing or deleting the entry undoes it, and drafts count for nothing:
 *   - an invoice / purchase owes that much less (getInvoiceOutstanding / getPurchaseOutstanding)
 *   - a pre document's share is an advance against it, carried to the invoice / purchase made
 *     from it; if the pre document is cancelled the money is the party's free advance again
 *   - a refunded credit has that much less left (getCreditUsage for customers' credits,
 *     getVendorRefundItems for what suppliers owe back)
 *   - Advance / On account stays as the party's on-account balance — except a Master Desk
 *     customer's / supplier's chosen Advance, posted to Advance from Customers / Advances to
 *     Suppliers (routeJournalAdvances below)
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
  // control ledgers themselves are not parties). `pooled`: a Master Desk customer / supplier,
  // whose Advance is held in Advance from Customers / Advances to Suppliers (as the Sales and
  // Purchase modules hold theirs); a ledger-only party keeps it in its own ledger.
  function getJournalAllocParty(name) {
    const n = lower(name);
    if (!n) return null;
    const cust = (typeof getKyaCustomers === 'function' ? getKyaCustomers() : []).find(c => lower(c.name) === n);
    if (cust) return { side: 'receivable', id: cust.id, name: cust.name, pooled: true };
    const supp = (typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : []).find(s => lower(s.name) === n);
    if (supp) return { side: 'payable', id: supp.id, name: supp.name, pooled: true };
    const ldg = ledgers().find(l => l.type === 'ledger' && lower(l.name) === n
      && ((l.sgId === 'sg-tr' && n !== 'trade receivables') || (l.sgId === 'sg-tp' && n !== 'trade payables')));
    if (ldg) return { side: ldg.sgId === 'sg-tr' ? 'receivable' : 'payable', id: ldg.id, name: ldg.name };
    return null;
  }

  // Wording of the popup and the chip, by mode. `other` is the last row of the popup: money
  // not against anything listed.
  const MODES = {
    receipt: {
      title: 'Received Against', amountLabel: 'Amount received', other: 'Advance', noun: 'receipt',
      otherNote: "Not against a document — stays in the customer's ledger as an advance",
      pooledNote: 'Not against a document — held in Advance from Customers as their advance',
      chip: 'Not chosen — on account',
      empty: 'This customer has no unpaid invoices or open pre invoices.',
      subtitle: p => `Split this receipt from ${esc(p.name)} across their opening balance, unpaid invoices, pre invoices or advance — those show that much less due.`
    },
    payment: {
      title: 'Paid Against', amountLabel: 'Amount paid', other: 'Advance', noun: 'payment',
      otherNote: "Not against a document — stays in the supplier's ledger as an advance",
      pooledNote: 'Not against a document — held in Advances to Suppliers as their advance',
      chip: 'Not chosen — on account',
      empty: 'This supplier has no unpaid purchases or open pre purchase documents.',
      subtitle: p => `Split this payment to ${esc(p.name)} across their opening balance, unpaid purchases, pre purchase documents or advance — those show that much less due.`
    },
    refund: {
      title: 'Refunded Against', amountLabel: 'Amount refunded', other: 'On account', noun: 'refund',
      otherNote: "Not against a credit — a plain debit to the customer's ledger",
      chip: 'On account — not against a credit',
      empty: 'This customer has no credit notes or held advances waiting to be refunded.',
      subtitle: p => `Split this refund to ${esc(p.name)} across their credit notes and the advances held in their ledger, or on account — those credits show that much less to refund.`
    },
    refundIn: {
      title: 'Refund Received Against', amountLabel: 'Refund received', other: 'On account', noun: 'refund',
      otherNote: "Not against a reversal — a plain credit to the supplier's ledger",
      chip: 'On account — not against a reversal',
      empty: 'This supplier owes no refunds on reversals or advances held in their ledger.',
      subtitle: p => `Split this refund from ${esc(p.name)} across their purchase reversals and the advances held in their ledger, or on account — those show that much less still owed to you.`
    },
    refundPool: {
      title: 'Refunded Against', amountLabel: 'Amount refunded', other: 'Other', noun: 'refund',
      otherNote: 'Not against a customer refund — stays a plain Refund Payable debit',
      chip: 'Not against a customer refund',
      empty: 'No customer refunds are waiting in Refund Payable.',
      subtitle: () => "Choose whose refund this is — the customers' advances held in Refund Payable show that much less to refund."
    },
    advancePool: {
      title: 'Refund Received Against', amountLabel: 'Refund received', other: 'Other', noun: 'refund',
      otherNote: 'Not against a supplier refund — stays a plain Advances to Suppliers credit',
      chip: 'Not against a supplier refund',
      empty: 'No supplier advances in Advances to Suppliers are waiting to be refunded.',
      subtitle: () => "Choose whose advance came back — the suppliers' advances held in Advances to Suppliers show that much less still owed to you."
    }
  };

  const REFUND_MODES = ['refund', 'refundIn', 'refundPool', 'advancePool'];

  // The refund modes' wording when the other side is not Cash / Bank: an adjustment against
  // another ledger (e.g. Customer Dr / Discount Cr, Customer A Dr / Customer B Cr)
  const ADJUST = {
    refund: {
      title: 'Adjusted Against', amountLabel: 'Amount adjusted', noun: 'adjustment', leftWord: 'Available',
      empty: 'This customer has no credit notes or advances to adjust.',
      subtitle: p => `Split this debit to ${esc(p.name)} across their credit notes and advances, or on account — those show that much less held for them.`
    },
    refundIn: {
      title: 'Adjusted Against', amountLabel: 'Amount adjusted', noun: 'adjustment', leftWord: 'Available',
      otherNote: "Not against a reversal or advance — a plain credit to the supplier's ledger",
      empty: 'This supplier has no reversals or advances to adjust.',
      subtitle: p => `Split this credit to ${esc(p.name)} across their purchase reversals and advances, or on account — those show that much less still owed to you.`
    },
    refundPool: {
      title: 'Adjusted Against', amountLabel: 'Amount adjusted', noun: 'adjustment', leftWord: 'Available',
      subtitle: () => "Choose whose refund this adjusts — the customers' advances held in Refund Payable show that much less to refund."
    },
    advancePool: {
      title: 'Adjusted Against', amountLabel: 'Amount adjusted', noun: 'adjustment', leftWord: 'Available',
      subtitle: () => "Choose whose advance this adjusts — the suppliers' advances held in Advances to Suppliers show that much less still owed to you."
    }
  };

  // Whether the entry has a Cash / Bank line (Cash and Cash Equivalents) on the side opposite
  // `row` — what makes a customer debit / supplier credit read as a refund rather than an
  // adjustment
  function hasCashContra(row, rows) {
    const other = row.type === 'By' ? 'To' : 'By';
    return (rows || []).some(r => r && r !== row && r.type === other && ledgers().some(l =>
      l.type === 'ledger' && l.sgId === 'sg-cce' && lower(l.name) === lower(r.particular)));
  }

  // What a line is (MODES above), or null when it takes no popup. `rows`: all lines of the
  // entry — without a Cash / Bank line opposite it, a refund mode reads as an adjustment.
  function getJournalRowAllocParty(row, rows) {
    if (!row || (row.type !== 'To' && row.type !== 'By')) return null;
    const p = getJournalAllocParty(row.particular);
    let found = null;
    if (p) {
      found = Object.assign({}, p, { mode: p.side === 'receivable'
        ? (row.type === 'To' ? 'receipt' : 'refund')
        : (row.type === 'By' ? 'payment' : 'refundIn') });
    } else {
      // The ledgers that hold several parties' advances
      const n = lower(row.particular);
      const ldg = ledgers().find(l => l.type === 'ledger' && lower(l.name) === n);
      if (ldg && n === 'refund payable' && row.type === 'By') found = { side: 'receivable', mode: 'refundPool', id: ldg.id, name: ldg.name };
      if (ldg && n === 'advances to suppliers' && row.type === 'To') found = { side: 'payable', mode: 'advancePool', id: ldg.id, name: ldg.name };
    }
    if (!found) return null;
    const adjust = REFUND_MODES.includes(found.mode) && !hasCashContra(row, rows);
    let text = adjust ? Object.assign({}, MODES[found.mode], ADJUST[found.mode]) : MODES[found.mode];
    if (found.pooled && text.pooledNote) text = Object.assign({}, text, { otherNote: text.pooledNote });
    return Object.assign(found, { text });
  }

  function getJournalRowAmount(row) {
    return r2(row && (row.type === 'To' ? row.credit : row.debit));
  }

  // The line's allocations, while they still belong to its party and mode (lines saved before
  // refunds were tracked carry no mode: they were receipts / payments). `rows`: the entry's lines.
  function getJournalRowAllocations(row, rows) {
    if (!row || !Array.isArray(row.allocations) || !row.allocations.length) return [];
    const p = getJournalRowAllocParty(row, rows);
    if (!p || lower(row.allocFor) !== lower(p.name)) return [];
    const mode = row.allocMode || (p.side === 'receivable' ? 'receipt' : 'payment');
    if (mode !== p.mode) return [];
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
    // A pre document's journal money taken back by a customer debit / supplier credit (jpre:)
    const back = `jpre:${storeKey}:${docId}`;
    let sum = 0;
    eachPostedAllocation(a => {
      if (a.store === storeKey && String(a.docId) === String(docId)) sum += r2(a.amount);
      else if ((a.store === 'customerCredit' || a.store === 'vendorRefund') && a.docId === back) sum -= r2(a.amount);
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

  // A party's opening balance still owed — a customer's / Trade Receivables ledger's debit
  // opening, a supplier's / Trade Payables ledger's credit opening (positive openingBalance in
  // all four) — less what Journal Entry put against it
  function getOpeningBalanceDue(party, ctx) {
    const list = party.side === 'receivable'
      ? (typeof getKyaCustomers === 'function' ? getKyaCustomers() : [])
      : (typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : []);
    const rec = list.find(p => String(p.id) === String(party.id)) || ledgers().find(l => String(l.id) === String(party.id));
    const opening = rec ? Math.max(0, r2(rec.openingBalance)) : 0;
    const docId = `${party.side}:${party.id}`;
    const available = opening > 0 ? Math.max(0, r2(opening - getJournalAllocatedTo('openingBalance', docId, ctx))) : 0;
    return { opening, available, docId };
  }

  // Debits to a customer's own ledger by journal that refunded one of their credits (credit
  // notes, advances held in the ledger). They use up that credit, not the on-account balance.
  function getCustomerJournalRefundCredits(customerId, partyName, ctx) {
    const name = lower(partyName);
    let sum = 0;
    eachPostedAllocation((a, row) => {
      // Not a pre invoice's journal advance taken back (jpre:): that debit nets in the ledger,
      // as the pre invoice's journal receipt is no longer held on it
      if (a.store === 'customerCredit' && String(a.docId).indexOf('jpre:') !== 0 && lower(row.particular) === name && r2(row.debit) > 0) sum += r2(a.amount);
    }, ctx);
    return r2(sum);
  }

  // What suppliers owe back (as PayTracker lists it): Purchase Reversals not refunded (a reversed
  // Pre Purchase document's advance, or the reversal's value) and advance above a purchase's
  // value not refunded — less what Journal Entry received against each. `inLedger`: the money
  // sits in the supplier's own ledger; otherwise in Advances to Suppliers.
  function getVendorRefundItems(ctx) {
    const paidOf = v => typeof getPurchasePaidAmount === 'function' ? getPurchasePaidAmount(v) : 0;
    const out = [];
    (store().purchaseVouchers || []).forEach(v => {
      if (!v) return;
      let item = null;
      if (v.isReturn) {
        const pre = v.reversedPreDoc;
        item = {
          key: `prev:${v.id}`, kindLabel: pre ? 'Advance Reversal' : 'Purchase Reversal',
          value: pre ? r2(pre.advance) : r2(v.total), refunded: paidOf(v),
          inLedger: !pre || !!pre.inPartyLedger,
          note: pre ? `${pre.label || 'Pre Purchase'} ${pre.no || ''} cancelled` : (v.returnAgainstInvoice ? `against ${v.returnAgainstInvoice}` : '')
        };
      } else if (v.advanceRefund && r2(v.advanceRefund.excess) > 0) {
        const party = typeof findPartyById === 'function' ? findPartyById(v.vendorId, 'Supplier') : null;
        item = {
          key: `padv:${v.id}`, kindLabel: 'Excess Advance',
          value: r2(v.advanceRefund.excess), refunded: r2(v.advanceRefund.amount),
          inLedger: typeof isPurchaseLedgerVendor === 'function' && !!isPurchaseLedgerVendor(party),
          note: 'advance above the purchase value'
        };
      }
      if (!item) return;
      item.journal = getJournalAllocatedTo('vendorRefund', item.key, ctx);
      item.available = Math.max(0, r2(item.value - item.refunded - item.journal));
      Object.assign(item, { vendorId: v.vendorId, vendorName: v.vendorName, docNo: v.invoiceNo, date: v.date });
      out.push(item);
    });
    // A Pre Purchase document cancelled after Journal Entry paid an advance against it: that
    // money sits in the supplier's own ledger, and they owe it back
    purchasePreDocs().forEach(src => (store()[src.storeKey] || []).forEach(d => {
      if (!d || d.status !== 'Cancelled') return;
      const paid = getJournalAllocatedTo(src.storeKey, d.id, ctx);
      if (paid <= 0) return;
      const key = `ppre:${src.storeKey}:${d.id}`;
      const journal = getJournalAllocatedTo('vendorRefund', key, ctx);
      out.push({
        key, kindLabel: 'Journal Advance', value: paid, refunded: 0, inLedger: true,
        note: `${src.kind} ${d.docNo || ''} cancelled`, journal,
        available: Math.max(0, r2(paid - journal)),
        vendorId: d.vendorId, vendorName: d.vendorName, docNo: d.docNo, date: d.date
      });
    }));
    return out;
  }

  // ══════════════════════════════════════════════════════════════════
  //  What a line can be against
  // ══════════════════════════════════════════════════════════════════
  // By mode: the documents / credits (oldest first; for receipts and payments the invoices or
  // purchases before the pre documents), then the `other` row (any amount)
  function getJournalAllocSources(party, ctx) {
    ctx = Object.assign({}, ctx, { partyName: party.name });
    const docs = [];
    const pres = [];
    const byDate = (a, b) => String(a.date || '').localeCompare(String(b.date || ''));
    const S = store();
    const mode = party.mode || (party.side === 'receivable' ? 'receipt' : 'payment');
    const other = [{
      key: 'advance', kind: 'advance', kindLabel: MODES[mode].other, store: '', docId: null,
      docNo: MODES[mode].other, date: '', available: Infinity
    }];

    // Customers' credits a refund can be against — in their own ledger, or in Refund Payable
    const creditRow = (c, p, withParty) => ({
      key: `customerCredit:${c.key}`, kind: 'credit', kindLabel: c.kindLabel, store: 'customerCredit', docId: c.key,
      docNo: c.docNo, date: c.date, note: c.note, available: c.available,
      partyId: withParty ? p.id : undefined, partyName: withParty ? p.name : undefined
    });
    const vendorRow = (x, withParty) => ({
      key: `vendorRefund:${x.key}`, kind: 'vendorRefund', kindLabel: x.kindLabel, store: 'vendorRefund', docId: x.key,
      docNo: x.docNo, date: x.date, note: x.note, available: x.available,
      partyId: withParty ? x.vendorId : undefined, partyName: withParty ? x.vendorName : undefined
    });
    // Journal money held on an open pre document, which a customer debit / supplier credit can
    // take back (jpre: — getJournalAllocatedTo counts it off the document)
    const heldOnPre = (srcStore, d, kindLabel, docNo, backStore, note) => {
      const held = getJournalAllocatedTo(srcStore, d.id, ctx);
      if (held <= 0.009) return null;
      const docId = `jpre:${srcStore}:${d.id}`;
      return { key: `${backStore}:${docId}`, kind: backStore === 'customerCredit' ? 'credit' : 'vendorRefund', kindLabel, store: backStore, docId, docNo, date: d.date, note, available: held };
    };
    if (mode === 'refund' || mode === 'refundPool') {
      const parties = mode === 'refund' ? [party]
        : (typeof getKyaCustomerParties === 'function' ? getKyaCustomerParties() : []);
      const last = [];
      parties.forEach(p => {
        const credits = typeof getCustomerCreditSources === 'function'
          ? getCustomerCreditSources(p.id, Object.assign({}, ctx, { partyName: p.name })) : [];
        credits.forEach(c => {
          const inOwnLedger = lower(c.ledgerName) === lower(p.name);
          // Credit notes, held / pre invoice advances in the party's own ledger; its on-account
          // balance (journal advances among it) after them
          if (mode === 'refund' && inOwnLedger && ['reversal', 'parked', 'advance'].includes(c.kind)) docs.push(creditRow(c, p, false));
          // Its advances received by Journal Entry, held in Advance from Customers — that part
          // of the line posts to Advance from Customers (routeJournalAdvances)
          if (mode === 'refund' && c.kind === 'jadvance') docs.push(creditRow(c, p, false));
          if (mode === 'refund' && inOwnLedger && c.kind === 'onaccount') last.push(Object.assign(creditRow(c, p, false), { docNo: 'On-account balance', kindLabel: 'Advance' }));
          if (mode === 'refundPool' && c.kind === 'parked' && lower(c.ledgerName) === 'refund payable') docs.push(creditRow(c, p, true));
        });
      });
      if (mode === 'refund') {
        SALES_PRE.forEach(src => (S[src.store] || []).forEach(d => {
          if (!d || !isOpen(d) || !isParty(d, 'customerId', 'customerName', party)) return;
          const row = heldOnPre(src.store, d, `${src.type} advance`, d[src.noField], 'customerCredit', 'Received by Journal Entry');
          if (row) docs.push(row);
        }));
      }
      return docs.sort(byDate).concat(last, other);
    }
    if (mode === 'refundIn' || mode === 'advancePool') {
      getVendorRefundItems(ctx).forEach(x => {
        if (x.available <= 0.009) return;
        if (mode === 'refundIn' && x.inLedger && isParty(x, 'vendorId', 'vendorName', party)) docs.push(vendorRow(x, false));
        if (mode === 'advancePool' && !x.inLedger) docs.push(vendorRow(x, true));
      });
      if (mode === 'advancePool') {
        // Suppliers' advances paid by Journal Entry and held here
        (typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : []).forEach(sp => {
          getSupplierJournalAdvances(sp.name, ctx).filter(x => x.pooled).forEach(x => docs.push({
            key: `vendorRefund:${x.key}`, kind: 'vendorRefund', kindLabel: 'Advance', store: 'vendorRefund', docId: x.key,
            docNo: x.docNo, date: x.date, note: x.note, available: x.available, partyId: sp.id, partyName: sp.name
          }));
        });
      }
      if (mode === 'refundIn') {
        // Advances paid to the supplier by journal: unused, or held on an open Pre Purchase
        getSupplierJournalAdvances(party.name, ctx).forEach(x => docs.push({
          key: `vendorRefund:${x.key}`, kind: 'vendorRefund', kindLabel: 'Advance', store: 'vendorRefund', docId: x.key,
          docNo: x.docNo, date: x.date, note: x.note, available: x.available
        }));
        purchasePreDocs().forEach(src => (S[src.storeKey] || []).forEach(d => {
          if (!d || !isOpen(d) || !isParty(d, 'vendorId', 'vendorName', party)) return;
          const row = heldOnPre(src.storeKey, d, `${src.kind} advance`, d.docNo, 'vendorRefund', 'Paid by Journal Entry');
          if (row) docs.push(row);
        }));
      }
      return docs.sort(byDate).concat(other);
    }

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

    // The opening balance still owed comes first: it is older than any document
    const ob = getOpeningBalanceDue(party, ctx);
    const opening = ob.available > 0.009 ? [{
      key: `openingBalance:${ob.docId}`, kind: 'opening', kindLabel: 'Opening Balance', store: 'openingBalance',
      docId: ob.docId, docNo: 'Opening Balance', date: '', total: ob.opening, available: ob.available
    }] : [];
    return opening.concat(docs.sort(byDate)).concat(pres.sort(byDate)).concat(other);
  }

  // Drops a line's split once its party, side or mode no longer matches (e.g. its account was
  // changed), so a stale split is never posted
  function dropStaleJournalAllocations(rows) {
    (rows || []).forEach(row => {
      if (!row || !row.allocations) return;
      if (!getJournalRowAllocations(row, rows).length) {
        delete row.allocations;
        delete row.allocFor;
        delete row.allocMode;
      }
    });
  }

  // Checks every line's allocations before posting. Returns '' or a message.
  function validateJournalAllocations(rows, ctx) {
    const used = new Map();
    for (let i = 0; i < (rows || []).length; i++) {
      const row = rows[i];
      const list = getJournalRowAllocations(row, rows);
      if (!list.length) continue;
      const amount = getJournalRowAmount(row);
      const sum = r2(list.reduce((s, a) => s + r2(a.amount), 0));
      if (Math.abs(sum - amount) > 0.01) {
        return `Line ${i + 1} (${row.particular}): ₹${fmt(sum)} is adjusted, but the line is ₹${fmt(amount)}. Click its adjustment to fix it.`;
      }
      const party = getJournalRowAllocParty(row, rows);
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

  // ══════════════════════════════════════════════════════════════════
  //  Entries other screens post ready-made (Cashline)
  // ══════════════════════════════════════════════════════════════════
  // The line of an entry that takes the popup, with what it is
  function getEntryAllocLine(rows) {
    for (const r of rows || []) {
      const party = getJournalRowAllocParty(r, rows);
      if (party) return { row: r, party };
    }
    return null;
  }

  // Asks what the entry's customer / supplier line is against, then calls done() — Cancel
  // posts it as Advance / On account, as on the Journal screen
  function askJournalAllocationsThen(rows, done) {
    const found = getEntryAllocLine(rows);
    const amount = found ? getJournalRowAmount(found.row) : 0;
    if (!found || !(amount > 0)) { done(); return; }
    openJournalAllocationModal({
      party: found.party,
      required: amount,
      rows: getJournalAllocSources(found.party, {}),
      current: getJournalRowAllocations(found.row, rows),
      onSave: list => {
        Object.assign(found.row, { allocations: list, allocFor: found.party.name, allocMode: found.party.mode });
        done();
      },
      onCancel: () => done()
    });
  }

  // A split kept apart until posting (a Cashline statement line's): { allocFor, allocMode,
  // allocations }, or null once its line's party / mode changed
  function savedSplitFits(rows, saved) {
    const found = getEntryAllocLine(rows);
    if (!found || !saved || !Array.isArray(saved.allocations)) return null;
    if (lower(saved.allocFor) !== lower(found.party.name) || saved.allocMode !== found.party.mode) return null;
    return { found, list: saved.allocations.filter(a => a && r2(a.amount) > 0) };
  }

  // The ⇄ chip for such a line (the look of the Journal line's chip); '' when no line of the
  // entry takes the popup. attrs: extra attributes for the button (class, data-…)
  function entryAllocChipHtml(rows, saved, attrs) {
    const found = getEntryAllocLine(rows);
    if (!found) return '';
    const fit = savedSplitFits(rows, saved);
    const list = fit ? fit.list : [];
    const amount = getJournalRowAmount(found.row);
    const sum = r2(list.reduce((s, a) => s + r2(a.amount), 0));
    const inner = list.length
      ? `<span style="min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">⇄ ${esc(describeJournalAllocations(list))}${Math.abs(sum - amount) < 0.01 ? '' : ` <span style="color: #dc2626;">· ₹ ${fmt(sum)} of ₹ ${fmt(amount)}</span>`}</span><span style="color: var(--blue-600); flex-shrink: 0;">Edit</span>`
      : `<span>⇄ ${esc(found.party.text.chip)}</span><span style="color: var(--blue-600); flex-shrink: 0;">Choose</span>`;
    return `<button type="button" ${attrs || ''} title="What this ${found.party.text.noun} is against — click to change" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; padding: 5px 9px; margin-top: 4px; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 6px; font-size: 11.5px; font-weight: 600; color: #0f766e; cursor: pointer; font-family: inherit; box-sizing: border-box; text-align: left;">${inner}</button>`;
  }

  // Opens the popup for such a line; onSave(saved) gets the split to keep
  function openEntryAllocation(rows, saved, onSave) {
    const found = getEntryAllocLine(rows);
    const amount = found ? getJournalRowAmount(found.row) : 0;
    if (!found || !(amount > 0)) return;
    const fit = savedSplitFits(rows, saved);
    openJournalAllocationModal({
      party: found.party,
      required: amount,
      rows: getJournalAllocSources(found.party, {}),
      current: fit ? fit.list : [],
      onSave: list => onSave({ allocFor: found.party.name, allocMode: found.party.mode, allocations: list })
    });
  }

  // At posting: puts a kept split on its line when it still fits the line, and checks it as
  // the Journal screen would. Returns '' or why the entry can't post with it.
  function applySavedJournalAllocations(rows, saved) {
    const fit = savedSplitFits(rows, saved);
    if (!fit || !fit.list.length) return '';
    Object.assign(fit.found.row, { allocations: fit.list.map(a => Object.assign({}, a)), allocFor: saved.allocFor, allocMode: saved.allocMode });
    // One party line, so no "Line 2 (…):" in front
    return validateJournalAllocations(rows, {}).replace(/^Line \d+(?: \([^)]*\))?: /, '');
  }

  // ══════════════════════════════════════════════════════════════════
  //  A supplier's journal advance used on a Purchase
  // ══════════════════════════════════════════════════════════════════
  // Advance paid to a supplier by Journal Entry and not against anything yet: each posted By
  // line to them (not the Purchase module's own payment entries) — its Advance part, or the
  // whole line when it was never split (on account) — and their advance in Advances to
  // Suppliers (`pooled`, keyed by entry and party: jadvs:entry:party)
  function getSupplierJournalAdvances(partyName, ctx) {
    const name = lower(partyName);
    const skip = ctx && ctx.excludeJournalEntryId != null ? String(ctx.excludeJournalEntryId) : null;
    const out = [];
    if (!name) return out;
    entries().forEach(e => {
      if (!e || (skip !== null && String(e.id) === skip)) return;
      if (e.preparedBy === 'Purchase Module' || e.jeType === 'advance_payment') return;
      (e.allRows || []).forEach(row => {
        if (!row || row.type !== 'By') return;
        const pooled = !!(row.advanceOf && row.advanceOf.side === 'payable');
        if (lower(pooled ? row.advanceOf.name : row.particular) !== name) return;
        const amount = getJournalRowAmount(row);
        if (amount <= 0) return;
        const split = Array.isArray(row.allocations) && row.allocations.some(a => a && r2(a.amount) > 0);
        const key = pooled ? `jadvs:${e.id}:${row.advanceOf.id}` : `jadv:${e.id}:${row.id}`;
        const gross = split ? r2(row.allocations.filter(a => a && a.kind === 'advance').reduce((s, a) => s + r2(a.amount), 0)) : amount;
        const same = out.find(x => x.key === key);
        if (same) { same.gross = r2(same.gross + gross); return; }
        out.push({
          key, kind: 'jadvance', kindLabel: 'Advance', entryId: e.id, rowId: row.id, pooled, gross,
          docNo: e.voucherNo || 'Journal Entry', date: e.date,
          note: pooled ? `Advance paid by Journal Entry · in ${row.particular}` : (split ? 'Advance paid by Journal Entry' : 'Paid on account by Journal Entry')
        });
      });
    });
    // …less what supplier credits since took back from it (Refund Received / Adjusted Against)
    return out.map(x => Object.assign(x, { available: r2(x.gross - getJournalAllocatedTo('vendorRefund', x.key, ctx)) }))
      .filter(x => x.available > 0.009)
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
  }

  // Moves up to `amount` of a posted journal line's Advance onto a document. Its ledger
  // postings stay as they are; only what the line is against changes (a line in Advances to
  // Suppliers is set off when the document posts — getPooledJournalAdvanceUsedOn). Returns
  // what moved. target: { store, docId, docNo, kind, kindLabel }
  function moveJournalAdvance(entryId, rowId, target, amount) {
    const e = entries().find(x => x && String(x.id) === String(entryId));
    const row = e && (e.allRows || []).find(r => r && String(r.id) === String(rowId));
    if (!row) return 0;
    if (!Array.isArray(row.allocations) || !row.allocations.some(a => a && r2(a.amount) > 0)) {
      row.allocations = [{ key: 'advance', kind: 'advance', kindLabel: 'Advance', store: '', docId: null, docNo: 'Advance', amount: getJournalRowAmount(row) }];
      row.allocFor = row.particular;
      row.allocMode = 'payment';
    }
    const adv = row.allocations.find(a => a && a.kind === 'advance');
    // Only the part no supplier credit took back since
    const of = row.advanceOf;
    const free = adv ? r2(r2(adv.amount) - getJournalAllocatedTo('vendorRefund', of ? `jadvs:${entryId}:${of.id}` : `jadv:${entryId}:${rowId}`)) : 0;
    const take = r2(Math.min(r2(amount), free));
    if (take <= 0) return 0;
    adv.amount = r2(r2(adv.amount) - take);
    if (adv.amount <= 0.009) row.allocations = row.allocations.filter(a => a !== adv);
    const key = `${target.store}:${target.docId}`;
    const same = row.allocations.find(a => a && a.key === key);
    if (same) same.amount = r2(r2(same.amount) + take);
    else row.allocations.push(Object.assign({ key, kind: target.kind, kindLabel: target.kindLabel, store: target.store, docId: target.docId, docNo: target.docNo, amount: take },
      of ? { partyId: of.id, partyName: of.name } : {}));
    return take;
  }

  // ══════════════════════════════════════════════════════════════════
  //  Advance → Advance from Customers / Advances to Suppliers
  // ══════════════════════════════════════════════════════════════════
  // A Master Desk customer's / supplier's Advance is posted to the advance account, as the
  // Sales / Purchase modules post theirs: on its own line next to the party's, with
  // row.advanceOf = { id, name, side, fromRowId } naming whose it is. A line nothing was chosen
  // for stays in the party's ledger (on account), and a ledger-only party keeps its advance.
  // Using it later moves it back, dated then: Invoice Balance on a Sales Invoice
  // (sales-credit-adjust.js, Dr Advance from Customers), "Use advance" on a Purchase
  // (purchase-posting.js, Cr Advances to Suppliers), or a customer debit / supplier credit
  // against it here (that part of the line posts to the advance account). The Journal form
  // shows a posted entry as it was typed (foldJournalAdvances).
  const POOL_LEDGERS = { receivable: ['Advance from Customers', 'sg-ocl'], payable: ['Advances to Suppliers', 'sg-stla'] };
  function getPoolLedgerName(side) {
    const [name, sgId] = POOL_LEDGERS[side];
    const id = typeof getOrCreateSystemLedger === 'function' ? getOrCreateSystemLedger(name, sgId) : null;
    const l = ledgers().find(x => x.id == id) || ledgers().find(x => x.type === 'ledger' && lower(x.name) === lower(name));
    return l ? l.name : name;
  }

  // The parts of a party line that post to the advance account
  function isPoolPart(a, party) {
    if (!a || !(r2(a.amount) > 0)) return false;
    if (party.mode === 'receipt' || party.mode === 'payment') return !!party.pooled && a.kind === 'advance';
    if (party.mode === 'refund') return String(a.docId || '').indexOf('jadvc:') === 0;
    if (party.mode === 'refundIn') return String(a.docId || '').indexOf('jadvs:') === 0;
    return false;
  }

  // The lines an entry posts with: each party line's pool parts on their own line in the
  // advance account, right after it (the party line keeps the rest, or goes when nothing is left)
  function routeJournalAdvances(rows) {
    const out = [];
    let nextId = (rows || []).reduce((m, r) => Math.max(m, Number(r && r.id) || 0), 0) + 1;
    (rows || []).forEach(row => {
      const party = row && !row.advanceOf ? getJournalRowAllocParty(row, rows) : null;
      const list = party ? getJournalRowAllocations(row, rows) : [];
      const moved = list.filter(a => isPoolPart(a, party));
      const part = r2(moved.reduce((s, a) => s + r2(a.amount), 0));
      if (!(part > 0)) { out.push(row); return; }
      const side = row.type === 'To' ? 'credit' : 'debit';
      const rest = r2(getJournalRowAmount(row) - part);
      if (rest > 0.009) out.push(Object.assign({}, row, { [side]: rest.toFixed(2), allocations: list.filter(a => moved.indexOf(a) < 0) }));
      out.push({
        id: nextId++, type: row.type, particular: getPoolLedgerName(party.side),
        debit: side === 'debit' ? part.toFixed(2) : '', credit: side === 'credit' ? part.toFixed(2) : '',
        advanceOf: { id: party.id, name: party.name, side: party.side, fromRowId: row.id },
        allocFor: party.name, allocMode: party.mode,
        allocations: moved.map(a => Object.assign({}, a, { partyId: party.id, partyName: party.name }))
      });
    });
    return out;
  }

  // A posted entry's lines as they were typed: each advance-account line back into its party line
  function foldJournalAdvances(rows) {
    const out = [];
    (rows || []).forEach(row => {
      if (!row || !row.advanceOf) { out.push(Object.assign({}, row)); return; }
      const of = row.advanceOf;
      const side = row.type === 'To' ? 'credit' : 'debit';
      const list = (row.allocations || []).map(a => { const c = Object.assign({}, a); delete c.partyId; delete c.partyName; return c; });
      const host = out.find(r => r && String(r.id) === String(of.fromRowId) && r.type === row.type && lower(r.particular) === lower(of.name));
      if (host) {
        const merged = (host.allocations || []).map(a => Object.assign({}, a));
        list.forEach(a => {
          const same = merged.find(m => m.key === a.key);
          if (same) same.amount = r2(r2(same.amount) + r2(a.amount)); else merged.push(a);
        });
        Object.assign(host, { [side]: r2(getJournalRowAmount(host) + getJournalRowAmount(row)).toFixed(2), allocations: merged, allocFor: of.name, allocMode: row.allocMode });
      } else {
        const r = Object.assign({}, row, { id: of.fromRowId != null ? of.fromRowId : row.id, particular: of.name, allocations: list, allocFor: of.name });
        delete r.advanceOf;
        out.push(r);
      }
    });
    return out;
  }

  // A customer's advances received by Journal Entry and held in Advance from Customers — for
  // getCustomerCreditSources, which takes off what was used since. Keyed by entry and party
  // (jadvc:entry:party), so editing the entry's other lines never changes it.
  function getCustomerPooledJournalAdvances(customerId, partyName, ctx) {
    const name = lower(partyName);
    const skip = ctx && ctx.excludeJournalEntryId != null ? String(ctx.excludeJournalEntryId) : null;
    const out = [];
    entries().forEach(e => {
      if (!e || (skip !== null && String(e.id) === skip)) return;
      (e.allRows || []).forEach(row => {
        const of = row && row.advanceOf;
        if (!of || of.side !== 'receivable' || row.type !== 'To') return;
        if (!((customerId != null && customerId !== '' && String(of.id) === String(customerId)) || (name && lower(of.name) === name))) return;
        const amount = r2((row.allocations || []).filter(a => a && a.kind === 'advance').reduce((s, a) => s + r2(a.amount), 0));
        if (amount <= 0.009) return;
        const key = `jadvc:${e.id}:${of.id}`;
        const same = out.find(x => x.key === key);
        if (same) same.amount = r2(same.amount + amount);
        else out.push({ key, entryId: e.id, rowId: row.id, docNo: e.voucherNo || 'Journal Entry', date: e.date, ledgerName: row.particular, amount });
      });
    });
    return out;
  }

  // Journal advances held in Advances to Suppliers that were used on a document ("Use advance"
  // on a Purchase): the document's own entries set them off. { amount, nos }
  function getPooledJournalAdvanceUsedOn(storeKey, docId) {
    let amount = 0;
    const nos = new Set();
    eachPostedAllocation((a, row, e) => {
      if (!row.advanceOf || a.store !== storeKey || String(a.docId) !== String(docId)) return;
      amount += r2(a.amount);
      if (e.voucherNo) nos.add(e.voucherNo);
    });
    return { amount: r2(amount), nos: Array.from(nos) };
  }

  // ══════════════════════════════════════════════════════════════════
  //  A document journal money is against can't be deleted
  // ══════════════════════════════════════════════════════════════════
  // What a document can be referred to by: 'sales' / 'purchase' (a voucher, incl. the credit
  // or refund its reversal / excess advance gives) or a pre document's store key
  function journalRefsOf(kind, id) {
    if (kind === 'sales') return [['salesVouchers', id], ['customerCredit', `rev:${id}`], ['customerCredit', `park:${id}`]];
    if (kind === 'purchase') return [['purchaseVouchers', id], ['vendorRefund', `prev:${id}`], ['vendorRefund', `padv:${id}`]];
    // A pre document: also its journal money taken back (jpre:), or refunded once cancelled (ppre:)
    if (SALES_PRE.some(s => s.store === kind)) return [[kind, id], ['customerCredit', `jpre:${kind}:${id}`]];
    if (purchasePreDocs().some(s => s.storeKey === kind)) return [[kind, id], ['vendorRefund', `ppre:${kind}:${id}`], ['vendorRefund', `jpre:${kind}:${id}`]];
    return [[kind, id], ['vendorRefund', `ppre:${kind}:${id}`]];
  }

  // '' or why it can't go: "₹5,000.00 from Journal Entry JV-2026-004 is against it"
  function getJournalDeleteProblem(refs) {
    let amount = 0;
    const nos = new Set();
    eachPostedAllocation((a, row, e) => {
      if (!refs.some(([s, id]) => a.store === s && String(a.docId) === String(id))) return;
      amount += r2(a.amount);
      if (e.voucherNo) nos.add(e.voucherNo);
    });
    return amount > 0.009 ? `₹${fmt(amount)} from Journal Entry ${Array.from(nos).join(', ')} is against it` : '';
  }

  // Refuses with a message; returns true when it refused
  function blockIfJournalAgainst(refs, label, action) {
    const problem = getJournalDeleteProblem(refs);
    if (!problem) return false;
    if (typeof showToast === 'function') showToast(`${label} can't be ${action || 'deleted'} — ${problem}. Change those entries first.`, 'warning');
    return true;
  }

  // For the Sales Invoice / Purchase views: the payment status once Journal Entry receipts /
  // payments against the voucher count (e.g. Full Payment for an invoice the journal settled)
  function getJournalSettledStatus(total, paidOnVoucher, journal) {
    const paid = r2(r2(paidOnVoucher) + r2(journal));
    if (paid >= r2(total) - 0.005) return 'Full Payment';
    return paid > 0 ? 'Partial Payment' : 'Not Paid';
  }

  // Short line for the chip under a Journal line: "INV-2026-004 ₹5,000.00 · Advance ₹1,000.00"
  // (a Refund Payable / Advances to Suppliers line names the party: "INV-004 (Ravi) ₹500.00")
  function describeJournalAllocations(list) {
    return (list || []).filter(a => a && r2(a.amount) > 0)
      .map(a => `${a.docNo}${a.partyName ? ` (${a.partyName})` : ''} ₹${fmt(a.amount)}`).join(' · ');
  }

  // ══════════════════════════════════════════════════════════════════
  //  Popup (the look of the Invoice Balance popup, sales-credit-adjust.js)
  // ══════════════════════════════════════════════════════════════════
  // opts: { party, required, rows, current [{ key, amount }], onSave(list), onCancel } and, for
  // other uses than a Journal line: title, subtitle, amountLabel, empty, upTo (choose up to
  // `required` rather than exactly it)
  function openJournalAllocationModal(opts) {
    const party = opts.party;
    const text = party.text || MODES[party.mode] || MODES[party.side === 'receivable' ? 'receipt' : 'payment'];
    const rows = opts.rows || [];
    const required = r2(opts.required);
    const current = new Map((opts.current || []).map(a => [a.key, r2(a.amount)]));
    const docCount = rows.filter(r => r.kind !== 'advance').length;
    const title = opts.title || text.title;
    const subtitle = opts.subtitle || text.subtitle(party);

    const sub = r => {
      if (r.kind === 'advance') return text.otherNote;
      if (r.kind === 'opening') return `Brought forward from before · Total ₹${fmt(r.total)}`;
      const date = r.date ? r.date.split('-').reverse().join('-') : '';
      // A refund's credit: its date, the customer / supplier (on a shared ledger), what it is;
      // a journal advance: its date and what it is
      if (r.kind === 'credit' || r.kind === 'vendorRefund' || r.kind === 'jadvance') return [date, r.partyName, r.note].filter(Boolean).join(' · ');
      const parts = [date, `Total ₹${fmt(r.total)}`];
      if ((r.kind === 'preinvoice' || r.kind === 'prepurchase') && r.advance > 0) parts.push(`Advance ₹${fmt(r.advance)}`);
      return parts.filter(Boolean).join(' · ');
    };
    const rightWord = r => (r.kind === 'preinvoice' || r.kind === 'prepurchase') ? 'Balance'
      : ((r.kind === 'credit' || r.kind === 'vendorRefund') ? (text.leftWord || 'Refundable') : (r.kind === 'jadvance' ? 'Available' : 'Due'));
    const rightLabel = r => r.kind === 'advance' ? 'Any amount'
      : `${rightWord(r)}<br><strong style="font-size: 13px; color: var(--slate-800);">₹ ${fmt(r.available)}</strong>`;

    const rowHtml = rows.map((r, i) => `
      <div data-row="${i}" style="display: grid; grid-template-columns: 1fr auto 120px; align-items: center; gap: 10px; padding: 9px 10px; border: 1.5px solid var(--slate-100); border-radius: 10px;">
        <div style="min-width: 0;">
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span style="font-family: monospace; font-weight: 800; font-size: 13px; color: var(--slate-800);">${esc(r.docNo)}</span>
            ${r.kind === 'advance' || r.kind === 'opening' ? '' : `<span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; color: #0f766e; background: #f0fdfa;">${esc(r.kindLabel)}</span>`}
          </div>
          <div style="font-size: 11.5px; color: var(--slate-500); margin-top: 2px;">${esc(sub(r))}</div>
        </div>
        <div style="text-align: right; font-size: 11.5px; color: var(--slate-500); white-space: nowrap;">${rightLabel(r)}</div>
        <input type="text" inputmode="decimal" data-amt="${i}" class="je-input" placeholder="0.00" value="${current.has(r.key) ? current.get(r.key).toFixed(2) : ''}" style="height: 34px; padding: 0 10px; font-size: 13px; font-weight: 600; text-align: right; border-radius: 8px;" />
      </div>`).join('');

    const emptyNote = docCount ? '' : `<div style="padding: 12px; text-align: center; font-size: 12.5px; color: var(--slate-500); border: 1.5px dashed var(--slate-200); border-radius: 10px;">${opts.empty || text.empty}</div>`;

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
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #94a3b8;">${opts.amountLabel || text.amountLabel}</span>
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
      else if (left > 0.01 && sum > 0 && !opts.upTo) msg += ` <span style="color: #b45309;">— ₹ ${fmt(left)} left to put on a row or in ${esc(text.other)}</span>`;
      summary.innerHTML = msg;
      const ok = !over && (opts.upTo ? left > -0.01 : Math.abs(left) < 0.01);
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
      close(read().filter(v => v.amount > 0).map(v => Object.assign({
        key: v.row.key, kind: v.row.kind, kindLabel: v.row.kindLabel, store: v.row.store,
        docId: v.row.docId, docNo: v.row.docNo, amount: v.amount
      }, v.row.partyName ? { partyId: v.row.partyId, partyName: v.row.partyName } : {})));
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
  window.getCustomerJournalRefundCredits = getCustomerJournalRefundCredits;
  window.getVendorRefundItems = getVendorRefundItems;
  window.getJournalAllocSources = getJournalAllocSources;
  window.validateJournalAllocations = validateJournalAllocations;
  window.dropStaleJournalAllocations = dropStaleJournalAllocations;
  window.journalRefsOf = journalRefsOf;
  window.getSupplierJournalAdvances = getSupplierJournalAdvances;
  window.askJournalAllocationsThen = askJournalAllocationsThen;
  window.entryAllocChipHtml = entryAllocChipHtml;
  window.openEntryAllocation = openEntryAllocation;
  window.applySavedJournalAllocations = applySavedJournalAllocations;
  window.moveJournalAdvance = moveJournalAdvance;
  window.routeJournalAdvances = routeJournalAdvances;
  window.foldJournalAdvances = foldJournalAdvances;
  window.getCustomerPooledJournalAdvances = getCustomerPooledJournalAdvances;
  window.getPooledJournalAdvanceUsedOn = getPooledJournalAdvanceUsedOn;
  window.getJournalDeleteProblem = getJournalDeleteProblem;
  window.blockIfJournalAgainst = blockIfJournalAgainst;
  window.describeJournalAllocations = describeJournalAllocations;
  window.getJournalSettledStatus = getJournalSettledStatus;
  window.openJournalAllocationModal = openJournalAllocationModal;
})();
