/**
 * KYA Modular - PayTracker (part of Track Recorder, after Reminders)
 * What is still to be received or paid. Track Recorder shows the lists full screen
 * (Receivable | Payable buttons in its back bar) and the totals on its Overview; this file
 * works out the figures and draws the lists.
 *
 *  Receivable   from customers: posted sales invoices not fully paid (getInvoiceOutstanding — the
 *               payment on the invoice, any reversal / credit applied to it, and Journal Entry
 *               receipts against it)
 *               from vendors: Purchase Reversals / excess advances not yet refunded
 *  Payable      to vendors: posted purchases not fully paid (total less everything paid on the
 *               voucher, advance + payment, and Journal Entry payments against it)
 *               to customers: Sales Reversals / cancelled pre-invoices / excess advances whose
 *               credit is neither refunded nor applied (getCustomerCreditSources)
 * Amount is always the balance still due. Rows are sorted by due date.
 */

(function() {
  'use strict';

  const r2 = n => Math.round((parseFloat(n) || 0) * 100) / 100;
  const store = () => window.KYA_STORE || {};

  const PT_TITLES = { receivable: 'Receivable', payable: 'Payable' };

  // Paid on a purchase / refunded on a purchase reversal (as purchase-posting.js reads it)
  function purchasePaid(v) {
    if (v.paymentStatus === 'Full Payment' || v.paymentStatus === 'Full Refund') {
      const stored = parseFloat(v.paymentAmount) || 0;
      return r2(stored > 0 ? stored : v.total);
    }
    if (v.paymentStatus === 'Partial Payment' || v.paymentStatus === 'Partial Refund') return r2(v.paymentAmount);
    return 0;
  }

  const byDue = (a, b) => String(a.dueDate).localeCompare(String(b.dueDate)) || String(a.date).localeCompare(String(b.date));

  // Type column: KYA's own document codes (as in the numbering: PI, SO, DC, PPI, PO, GRN)
  const PRE_CODES = {
    'Quotation': 'QT', 'Proforma Invoice': 'PI', 'Sales Order': 'SO', 'Delivery Challan': 'DC',
    'Purchase Quotation': 'PQT', 'Purchase Proforma': 'PPI', 'Purchase Order': 'PO', 'Goods Receipt Note': 'GRN'
  };
  const preReversalType = name => `${PRE_CODES[name] || name || 'Pre Invoice'} Reversal`;

  // Customers: sales invoices not fully paid
  function getSalesDue() {
    if (typeof getInvoiceOutstanding !== 'function') return [];
    return (store().salesVouchers || [])
      .filter(v => v && !v.isReturn)
      .map(v => ({
        dueDate: v.dueDate || v.date || '', date: v.date || '', no: v.invoiceNo || '',
        party: v.customerName || '', type: 'Sales', amount: getInvoiceOutstanding(v)
      }))
      .filter(x => x.amount > 0.009);
  }

  // Vendors: purchases not fully paid (less what Journal Entry paid against them —
  // getPurchaseOutstanding, journal-allocations.js)
  function getPurchaseDue() {
    return (store().purchaseVouchers || [])
      .filter(v => v && !v.isReturn)
      .map(v => ({
        dueDate: v.dueDate || v.date || '', date: v.date || '', no: v.invoiceNo || '',
        party: v.vendorName || '', type: 'Purchase',
        amount: typeof getPurchaseOutstanding === 'function' ? getPurchaseOutstanding(v) : Math.max(0, r2(r2(v.total) - purchasePaid(v)))
      }))
      .filter(x => x.amount > 0.009);
  }

  // Refunds owed to customers: the reversal / parked-advance credits KYA works out per customer
  function getCustomerRefunds() {
    if (typeof getCustomerCreditSources !== 'function') return [];
    const vouchers = store().salesVouchers || [];
    const byKey = new Map();
    vouchers.forEach(v => {
      if (!v) return;
      if (v.isReturn) byKey.set(`rev:${v.id}`, v).set(`park:${v.id}`, v);
      else if (v.advanceRefund) byKey.set(`park:${v.id}`, v);
    });
    const parties = new Map();
    vouchers.forEach(v => {
      if (!v || !(v.isReturn || v.advanceRefund)) return;
      const key = String(v.customerId || '') + '|' + String(v.customerName || '').toLowerCase();
      if (!parties.has(key)) parties.set(key, v);
    });
    const out = [];
    parties.forEach(v => {
      getCustomerCreditSources(v.customerId, { partyName: v.customerName })
        .filter(src => src.kind === 'reversal' || src.kind === 'parked')
        .forEach(src => {
          const doc = byKey.get(src.key) || {};
          // A credit note, a cancelled pre-invoice's advance, or advance above an invoice's value
          const type = src.kind === 'reversal' ? 'Sales Reversal'
            : (doc.isReturn && doc.reversedPreInvoice ? preReversalType(doc.reversedPreInvoice.type) : 'Sales Advance');
          out.push({
            dueDate: doc.dueDate || doc.date || src.date || '', date: doc.date || src.date || '',
            no: src.docNo || doc.invoiceNo || '', party: doc.customerName || v.customerName || '',
            type, amount: r2(src.available)
          });
        });
    });
    return out;
  }

  // Refunds vendors owe: Purchase Reversals (and reversed pre-purchase advances) not fully
  // refunded, and advance above a purchase's value not refunded
  function getVendorRefunds() {
    const out = [];
    (store().purchaseVouchers || []).forEach(v => {
      if (!v) return;
      let amount = 0;
      let type = '';
      if (v.isReturn) {
        const value = v.reversedPreDoc ? r2(v.reversedPreDoc.advance) : r2(v.total);
        amount = r2(value - purchasePaid(v));
        type = v.reversedPreDoc ? preReversalType(v.reversedPreDoc.label) : 'Purchase Reversal';
      } else if (v.advanceRefund) {
        amount = r2((parseFloat(v.advanceRefund.excess) || 0) - (parseFloat(v.advanceRefund.amount) || 0));
        type = 'Purchase Advance';
      }
      if (amount <= 0.009) return;
      out.push({
        dueDate: v.dueDate || v.date || '', date: v.date || '', no: v.invoiceNo || '',
        party: v.vendorName || '', type, amount
      });
    });
    return out;
  }

  // Receivable: customers' invoices + vendors' refunds. Payable: vendors' bills + customers' refunds.
  function getPayTrackerData() {
    return {
      receivable: getSalesDue().concat(getVendorRefunds()).sort(byDue),
      payable: getPurchaseDue().concat(getCustomerRefunds()).sort(byDue)
    };
  }

  function todayStr() {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  }

  // Status by due date: the colour and weight of the document lists' status badges
  // (preinvoice-list.js), as plain text without the pill:
  // Overdue · Due Today · Due Soon (within 7 days) · Upcoming
  function statusText(dueDate) {
    const today = todayStr();
    const weekEnd = new Date(new Date(today + 'T00:00:00').getTime() + 7 * 86400000);
    const week = new Date(weekEnd.getTime() - weekEnd.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const text = (label, color) => `<span style="color: ${color}; font-weight: 700;">${label}</span>`;
    if (dueDate && dueDate < today) return text('Overdue', '#dc2626');
    if (dueDate === today) return text('Due Today', '#b45309');
    if (dueDate && dueDate <= week) return text('Due Soon', '#1d4ed8');
    return text('Upcoming', '#047857');
  }

  // One list: receivable | payable. search: invoice no. or customer / vendor.
  function renderPayTrackerListHtml(view, search) {
    const data = getPayTrackerData();
    let rows = view === 'payable' ? data.payable : data.receivable;
    const q = String(search || '').trim().toLowerCase();
    const allCount = rows.length;
    if (q) rows = rows.filter(x => String(x.no).toLowerCase().includes(q) || String(x.party).toLowerCase().includes(q));
    const emptyText = view === 'payable' ? 'Nothing is waiting to be paid.' : 'Nothing is waiting to be received.';
    const noMatch = q && allCount > 0;

    // The table, rows and cells copy KYA's document lists (Quotation / Sales Order / Delivery
    // Challan / Pre Purchase, preinvoice-list.js): No. in blue monospace, dates plain, party
    // semi-bold, amount bold
    const body = rows.length ? rows.map(x => `
      <tr style="border-bottom: 1px solid var(--slate-100); transition: background 0.15s;" onmouseover="this.style.background='var(--slate-50)'" onmouseout="this.style.background='transparent'">
        <td style="padding: 12px 14px; white-space: nowrap; color: var(--slate-700);">${ohEsc(x.dueDate)}</td>
        <td style="padding: 12px 14px; white-space: nowrap; color: var(--slate-700);">${ohEsc(x.type)}</td>
        <td style="padding: 12px 16px; white-space: nowrap;">
          <span style="font-family: monospace; font-weight: 800; color: var(--blue-700);">${ohEsc(x.no)}</span>
        </td>
        <td style="padding: 12px 16px; font-weight: 600; color: var(--slate-800); max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${ohEsc(x.party)}</td>
        <td style="padding: 12px 16px; text-align: right; font-weight: 800; color: var(--slate-900); white-space: nowrap;">${ohFmtAmt(x.amount)}</td>
        <td style="padding: 12px 14px; text-align: center; white-space: nowrap;">${statusText(x.dueDate)}</td>
      </tr>`).join('') : `
      <tr>
        <td colspan="6" style="text-align: center; padding: 48px 20px; color: var(--slate-400);">
          <div style="font-weight: 700; font-size: 14px; color: var(--slate-600); margin-bottom: 4px;">${noMatch ? 'No matching items found' : 'Nothing due'}</div>
          <div style="font-size: 12.5px;">${noMatch ? 'No items match the search query.' : emptyText}</div>
        </td>
      </tr>`;

    return `
      <div class="table-card" style="border: 1.5px solid var(--slate-200); border-radius: 12px; overflow: hidden; background: #fff; box-shadow: var(--shadow-sm); width: 100%;">
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;" aria-label="${PT_TITLES[view] || 'Receivable'}">
            <thead>
              <tr style="border-bottom: 1.5px solid var(--slate-200); color: var(--slate-500); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; background: #fafafa;">
                <th style="padding: 10px 14px;">Due Date</th>
                <th style="padding: 10px 14px;">Type</th>
                <th style="padding: 10px 16px;">Invoice No.</th>
                <th style="padding: 10px 16px;">Customer / Vendor</th>
                <th style="padding: 10px 16px; text-align: right;">Amount</th>
                <th style="padding: 10px 14px; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>${body}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Global exports
  window.getPayTrackerData = getPayTrackerData;
  window.renderPayTrackerListHtml = renderPayTrackerListHtml;

})();
