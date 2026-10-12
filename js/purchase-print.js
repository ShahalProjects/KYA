// ══════════════════════════════════════════════════════════════════
//  PURCHASE VOUCHER — printable sheet and preview for a posted (or draft) purchase,
//  laid out like the Sales Tax Invoice (sales-invoice-print.js) and exported through the
//  same Print / PDF / Excel engine (sales-invoice-export.js).
//
//    • Company block ....... Company Profile (logo, name, address, GSTIN) — the buyer
//    • Supplier (Bill From)  the vendor master on the voucher
//    • Dispatched From ..... the voucher's temporary (override) vendor details when
//                            present, else the vendor
//    • Supplier Bank ....... the vendor's bank details, with Due Date, TDS deducted,
//                            Paid and Balance Due. A purchase paid in full (or a cash
//                            purchase) shows its Payment Details instead.
//    • Notes / Terms ....... the voucher's Notes / Terms box
// ══════════════════════════════════════════════════════════════════
(function() {
  'use strict';

  const PURCHASE_SHEET_ID = 'purchaseVoucherSheet';

  const esc = s => (typeof siEsc === 'function') ? siEsc(s)
    : String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const num = n => (typeof siNum === 'function') ? siNum(n) : (parseFloat(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dateOf = iso => (typeof siDate === 'function') ? siDate(iso) : String(iso || '');
  const r2 = n => Math.round((parseFloat(n) || 0) * 100) / 100;

  function findPurchaseVoucher(id) {
    const S = window.KYA_STORE || {};
    return (S.purchaseVouchers || []).find(v => String(v.id) === String(id))
      || (S.purchaseVouchersDrafts || []).find(v => String(v.id) === String(id)) || null;
  }

  // A saved draft, not posted: shown, printed and exported with a DRAFT mark
  function isPurchaseVoucherDraft(v) {
    if (!v) return false;
    const S = window.KYA_STORE || {};
    if ((S.purchaseVouchers || []).some(x => String(x.id) === String(v.id))) return false;
    return (S.purchaseVouchersDrafts || []).some(x => String(x.id) === String(v.id)) || !!v.isDraft;
  }

  function shapeParty(src, fallbackName) {
    src = src || {};
    return {
      name: src.name || fallbackName || '',
      contactName: src.contactName || '',
      address: src.address || '',
      city: src.city || '',
      pincode: src.pincode || '',
      state: src.state || '',
      country: src.country || '',
      phone: src.phone || src.mobile || '',
      email: src.email || '',
      gstin: src.gstin || '',
      pan: src.pan || '',
      bankName: src.bankName || '',
      accountNo: src.accountNo || '',
      ifsc: src.ifsc || '',
      branch: src.branch || ''
    };
  }

  // Bill From is always the vendor master; Dispatched From prefers the voucher's
  // temporary details when they were entered (as the invoice's Shipped To does)
  function getPurchaseParties(v) {
    const master = (typeof getPurchaseParty === 'function' ? getPurchaseParty(v) : null) || {};
    const override = (v.partyOverride && v.partyOverride.isOverridden) ? v.partyOverride : null;
    const billed = shapeParty(master, v.vendorName);
    const shipped = override ? shapeParty(override, billed.name) : null;
    return { billed, shipped, isTemporary: !!override };
  }

  function getPurchaseLineRows(v) {
    return (v.rows || []).map(r => {
      const f = (typeof getPurchaseLineFigures === 'function') ? getPurchaseLineFigures(r) : {
        qty: parseFloat(r.qty) || 0, rate: parseFloat(r.rate) || 0, gross: 0, discAmt: 0,
        taxable: 0, taxPct: parseFloat(r.tax) || 0, taxAmt: 0, total: parseFloat(r.amount) || 0
      };
      let name = r.item || '';
      if (!name && r.expenseLedgerId) {
        const l = (typeof coaLedgers !== 'undefined' ? coaLedgers : []).find(x => String(x.id) === String(r.expenseLedgerId));
        name = l ? l.name : 'Expense';
      }
      return {
        name, hsn: r.hsn || '', qty: f.qty, unit: r.unit || '', rate: f.rate,
        discount: parseFloat(r.discount) || 0, discountType: r.discountType || 'val',
        gross: f.gross, discAmt: f.discAmt, taxable: f.taxable, taxPct: f.taxPct, taxAmt: f.taxAmt, total: f.total
      };
    });
  }

  // A purchase paid in full when it was made — Full Payment, or a cash purchase (a Cash and
  // Cash Equivalents ledger as the vendor) — shows how it was paid. Returns null otherwise.
  function getPurchasePaymentDetails(v, paidAmount) {
    const ledgers = (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) ? coaLedgers : [];
    const ledgerOf = id => ledgers.find(l => String(l.id) === String(id));
    const cashLedger = ledgerOf(v.vendorId);
    const isCash = !!cashLedger && cashLedger.type === 'ledger' && cashLedger.sgId === 'sg-cce';
    if (!isCash && v.paymentStatus !== 'Full Payment') return null;
    const nameOf = id => (ledgerOf(id) || {}).name || 'Cash Account';
    let paidFrom = '';
    if (isCash) paidFrom = cashLedger.name;
    else if (String(v.paymentAccountId) === 'multi-payment') {
      paidFrom = (v.paymentSplits || [])
        .filter(sp => sp && sp.accountId && (parseFloat(sp.amount) || 0) > 0)
        .map(sp => `${nameOf(sp.accountId)} ${num(sp.amount)}`).join(', ');
    } else if (v.paymentAccountId) paidFrom = nameOf(v.paymentAccountId);

    const lines = [{ label: 'Payment', value: isCash ? 'Cash Purchase — Full Payment' : 'Full Payment' }];
    if (paidFrom) lines.push({ label: 'Paid From', value: paidFrom });
    lines.push({ label: 'Amount Paid', value: num(paidAmount) });
    return { lines };
  }

  // Every figure the sheet and the exports show
  function computePurchaseSheet(v) {
    const co = (typeof getInvoiceCompany === 'function') ? getInvoiceCompany() : {};
    const parties = getPurchaseParties(v);
    const rows = getPurchaseLineRows(v);
    const taxMode = (typeof getPurchaseTaxMode === 'function') ? getPurchaseTaxMode(v.supplyType) : 'split';
    const isDraft = isPurchaseVoucherDraft(v);

    const subTotal = r2(rows.reduce((s, r) => s + r.taxable, 0));
    const grossTotal = r2(rows.reduce((s, r) => s + r.gross, 0));
    const totalTax = r2(rows.reduce((s, r) => s + r.taxAmt, 0));
    const totalDiscount = r2(rows.reduce((s, r) => s + r.discAmt, 0));
    const adjustments = r2(v.adjustments);
    const tdsTcsAmount = r2(v.tdsTcsAmount);
    const tdsAmount = v.tdsTcsMode === 'TDS' ? tdsTcsAmount : 0;
    // The bill's full value; the TDS deducted from it only lowers what is paid
    const netTotal = (v.total !== undefined && v.total !== '') ? r2(v.total) : r2(subTotal + totalTax + adjustments - tdsAmount);
    const grandTotal = r2(netTotal + tdsAmount);
    const paidAmount = (typeof getPurchasePaidAmount === 'function') ? getPurchasePaidAmount(v) : r2(v.paymentAmount);
    const balanceDue = Math.max(0, r2(netTotal - paidAmount));
    const isFullyPaid = balanceDue <= 0.005;

    // Place of Supply of an inward supply: the buyer's (this company's) state
    const posState = co.state || parties.billed.state || '';
    const posCountry = co.state ? (co.country || '') : (parties.billed.country || '');
    const posCode = posState && typeof getGstStateCode === 'function'
      ? getGstStateCode(posState, posCountry, co.state ? co.gstin : parties.billed.gstin) : '';
    const placeOfSupply = [posCode ? posCode + ' - ' + posState : posState, posCountry].filter(Boolean).join(', ');

    const gstByRate = {};
    rows.forEach(r => { if (r.taxPct) gstByRate[r.taxPct] = (gstByRate[r.taxPct] || 0) + r.taxAmt; });
    const gstLines = [];
    Object.keys(gstByRate).sort((a, b) => parseFloat(a) - parseFloat(b)).forEach(pct => {
      const amt = gstByRate[pct];
      const half = Math.round((parseFloat(pct) / 2) * 100) / 100;
      if (taxMode === 'split') {
        gstLines.push({ label: 'CGST ' + half + '%', amount: amt / 2 });
        gstLines.push({ label: 'SGST ' + half + '%', amount: amt / 2 });
      } else if (taxMode === 'igst') {
        gstLines.push({ label: 'IGST ' + pct + '%', amount: amt });
      } else {
        gstLines.push({ label: 'GST ' + pct + '%', amount: amt });
      }
    });

    const payLines = [];
    if (v.dueDate && !isFullyPaid) payLines.push({ label: 'Due Date', value: dateOf(v.dueDate) });
    if (tdsAmount > 0) payLines.push({ label: 'TDS Deducted' + (v.tdsTcsRate ? ' @ ' + v.tdsTcsRate + '%' : ''), value: num(tdsAmount) });
    if (paidAmount > 0) payLines.push({ label: 'Paid (' + (v.paymentStatus || '') + ')', value: num(paidAmount) });
    if (!isFullyPaid) payLines.push({ label: 'Balance Due', value: num(balanceDue) });

    const vendorBank = parties.shipped && (parties.shipped.bankName || parties.shipped.accountNo) ? parties.shipped : parties.billed;
    const bank = {
      bankName: vendorBank.bankName, accountHolder: vendorBank.name, accountNo: vendorBank.accountNo,
      ifsc: vendorBank.ifsc, branch: vendorBank.branch, qrCode: ''
    };

    return {
      co, parties, rows, taxMode, isDraft, bank,
      subTotal, grossTotal, totalTax, totalDiscount, adjustments, tdsTcsAmount, tdsAmount,
      netTotal, grandTotal, paidAmount, balanceDue, isFullyPaid, placeOfSupply, gstLines, payLines,
      paymentDetails: getPurchasePaymentDetails(v, paidAmount || netTotal)
    };
  }

  function renderPurchaseVoucherHTML(v) {
    const d = computePurchaseSheet(v);
    const co = d.co;
    const companyName = (typeof getInvoiceCompanyName === 'function') ? getInvoiceCompanyName(co) : (co.name || 'Your Company');
    const FS = { label: '10.5px', body: '12.5px', name: '15px', note: '11.5px' };

    const coLines = [];
    if (co.address) coLines.push(esc(co.address).replace(/\n/g, '<br>'));
    if (co.gstin) coLines.push(`GSTIN: ${esc(co.gstin)}`);
    const coContact = [co.phone ? 'Phone: ' + esc(co.phone) : '', co.email ? esc(co.email) : ''].filter(Boolean).join(' &nbsp;·&nbsp; ');
    if (coContact) coLines.push(coContact);
    if (co.website) coLines.push(esc(co.website));

    const partyHtml = (p, label, note) => {
      const cityPin = [p.city, p.pincode].filter(Boolean).join(' - ');
      const stateCountry = [p.state, p.country].filter(Boolean).join(', ');
      return `
        <div style="flex:1; min-width:0; padding:12px 14px; border:1px solid #94a3b8; border-radius:8px; box-sizing:border-box; background:#f8fafc; -webkit-print-color-adjust:exact; print-color-adjust:exact;">
          <div style="font-size:${FS.label}; font-weight:800; letter-spacing:.09em; text-transform:uppercase; color:#2563eb; margin-bottom:6px;">${label}</div>
          <div style="font-size:13px; font-weight:800; color:#0f172a;">${esc(p.name) || '&mdash;'}</div>
          ${p.address ? `<div style="font-size:${FS.body}; color:#475569; margin-top:3px; line-height:1.5;">${esc(p.address).replace(/\n/g, '<br>')}</div>` : ''}
          ${cityPin ? `<div style="font-size:${FS.body}; color:#475569; line-height:1.5;">${esc(cityPin)}</div>` : ''}
          ${stateCountry ? `<div style="font-size:${FS.body}; color:#475569; line-height:1.5;">${esc(stateCountry)}</div>` : ''}
          ${p.phone ? `<div style="font-size:${FS.body}; color:#475569; margin-top:3px; line-height:1.5;">Phone: ${esc(p.phone)}</div>` : ''}
          ${p.email ? `<div style="font-size:${FS.body}; color:#475569; line-height:1.5;">${esc(p.email)}</div>` : ''}
          ${p.gstin ? `<div style="font-size:${FS.body}; color:#475569; margin-top:3px; line-height:1.5;">GSTIN: ${esc(p.gstin)}</div>` : ''}
          ${p.pan ? `<div style="font-size:${FS.body}; color:#475569; line-height:1.5;">PAN: ${esc(p.pan)}</div>` : ''}
          ${note ? `<div style="font-size:${FS.note}; color:#64748b; font-style:italic; margin-top:6px;">${note}</div>` : ''}
        </div>`;
    };
    const shippedParty = d.parties.shipped || d.parties.billed;
    const shippedNote = d.parties.isTemporary ? 'Supplier details entered on this voucher.' : '';

    const th = (label, align, cls) => `<th class="${cls || 'si-nowrap'}" style="padding:9px 8px; font-size:10.5px; font-weight:700; text-align:${align}; background-color:var(--blue-600,#2563eb); color:#ffffff; border:1px solid #1d4ed8;">${label}</th>`;
    const dash = '<span style="color:#94a3b8; font-size:10px; font-weight:400;">-</span>';
    const showTax = d.taxMode === 'split' || d.taxMode === 'igst';

    const itemRowsHtml = d.rows.map((r, i) => {
      const val = (n, f) => Math.abs(parseFloat(n) || 0) > 0.0001 ? f(n) : dash;
      const text = s => { const t = String(s || '').trim(); return (t && t !== '-' && t !== '0') ? esc(t) : dash; };
      return `
        <tr>
          <td class="si-nowrap" style="padding:5px 6px; text-align:center; color:#64748b;">${i + 1}</td>
          <td class="si-desc" style="padding:5px 6px; color:#0f172a;">${esc(r.name)}</td>
          <td class="si-nowrap" style="padding:5px 6px; color:#475569;">${text(r.hsn)}</td>
          <td class="si-nowrap" style="padding:5px 6px; text-align:center;">${val(r.qty, n => n)}</td>
          <td class="si-nowrap" style="padding:5px 6px; text-align:center; text-transform:uppercase; color:#475569;">${text(r.unit)}</td>
          <td class="si-nowrap" style="padding:5px 6px; text-align:right;">${val(r.rate, num)}</td>
          <td class="si-nowrap" style="padding:5px 6px; text-align:right;">${val(r.discAmt, num)}</td>
          <td class="si-nowrap" style="padding:5px 6px; text-align:right;">${val(r.taxable, num)}</td>
          ${showTax ? `<td class="si-nowrap" style="padding:5px 6px; text-align:right;">${val(r.taxPct, n => n + '%')}</td>` : ''}
          <td class="si-nowrap" style="padding:5px 6px; text-align:right; color:#0f172a;">${val(r.total, num)}</td>
        </tr>`;
    }).join('');
    const colCount = 9 + (showTax ? 1 : 0);

    const cardStyle = 'flex:0 0 auto; min-width:0; border:1px solid #94a3b8; border-radius:8px; padding:10px 12px; background:#f8fafc; -webkit-print-color-adjust:exact; print-color-adjust:exact;';
    const cardTitle = t => `<div style="font-size:${FS.label}; font-weight:800; letter-spacing:.09em; text-transform:uppercase; color:#2563eb; margin-bottom:6px;">${t}</div>`;
    const payLinesHtml = d.payLines.map((l, i) => `<div${i === 0 ? ' style="margin-top:4px; padding-top:4px; border-top:1px dashed #94a3b8;"' : ''}><span style="color:#334155;">${esc(l.label)}:</span> ${esc(l.value)}</div>`).join('');
    const b = d.bank;
    const bankHtml = d.paymentDetails ? `
      <div style="${cardStyle}">
        ${cardTitle('Payment Details')}
        <div style="font-size:${FS.body}; color:#0f172a; line-height:1.55;">
          ${d.paymentDetails.lines.map(l => `<div><span style="color:#334155;">${esc(l.label)}:</span> ${esc(l.value)}</div>`).join('')}
          ${d.tdsAmount > 0 ? `<div><span style="color:#334155;">TDS Deducted${v.tdsTcsRate ? ' @ ' + esc(v.tdsTcsRate) + '%' : ''}:</span> ${num(d.tdsAmount)}</div>` : ''}
        </div>
      </div>` : `
      <div style="${cardStyle}">
        ${cardTitle('Supplier Bank Details')}
        <div style="font-size:${FS.body}; color:#0f172a; line-height:1.55;">
          ${b.bankName ? `<div><span style="color:#334155;">Bank:</span> ${esc(b.bankName)}</div>` : ''}
          ${(b.bankName || b.accountNo) && b.accountHolder ? `<div><span style="color:#334155;">A/c Holder:</span> ${esc(b.accountHolder)}</div>` : ''}
          ${b.accountNo ? `<div><span style="color:#334155;">A/c No.:</span> ${esc(b.accountNo)}</div>` : ''}
          ${b.ifsc ? `<div><span style="color:#334155;">IFSC:</span> ${esc(b.ifsc)}</div>` : ''}
          ${b.branch ? `<div><span style="color:#334155;">Branch:</span> ${esc(b.branch)}</div>` : ''}
          ${payLinesHtml}
        </div>
      </div>`;

    const termsHtml = `
      <div style="flex:1 1 auto; min-width:0; padding:6px 8px; box-sizing:border-box;">
        <div style="font-size:9.5px; font-weight:800; letter-spacing:.09em; text-transform:uppercase; color:#94a3b8; margin-bottom:5px;">Notes / Terms</div>
        <div style="font-size:11px; color:#334155; line-height:1.6; white-space:pre-wrap;">${esc(v.notes || '')}</div>
      </div>`;

    const totalsRow = (label, value, opts) => {
      const o = opts || {};
      return `
        <div style="display:flex; justify-content:space-between; gap:16px; font-size:${o.size || '11.5px'}; color:${o.color || '#334155'}; font-weight:${o.weight || 600}; padding:${o.pad || '3px 0'};">
          <span>${label}</span><span>${value}</span>
        </div>`;
    };
    const gstTotalsRows = d.gstLines.map(l => totalsRow(esc(l.label), num(l.amount))).join('');
    const signatory = (typeof getInvoiceSignatoryHtml === 'function') ? getInvoiceSignatoryHtml(co) : '<div style="flex:1 1 auto; min-height:60px;"></div>';
    const logo = (typeof getCompanyLogoHtml === 'function') ? getCompanyLogoHtml(co) : '';
    const words = (typeof siAmountInWords === 'function') ? siAmountInWords(d.grandTotal) : '';

    return `
      <div id="${PURCHASE_SHEET_ID}" style="position:relative; background:#fff; color:#0f172a; font-family:Inter, system-ui, sans-serif; padding:26px 28px; box-sizing:border-box;">
        ${d.isDraft ? `<div aria-hidden="true" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; z-index:5; overflow:hidden;">
          <span style="transform:rotate(-28deg); font-size:120px; font-weight:900; letter-spacing:.14em; color:rgba(217,119,6,.14); border:7px solid rgba(217,119,6,.14); border-radius:18px; padding:2px 30px; -webkit-print-color-adjust:exact; print-color-adjust:exact;">DRAFT</span>
        </div>` : ''}
        <style>
          #${PURCHASE_SHEET_ID} .si-grid { border-collapse: collapse; table-layout: auto; }
          #${PURCHASE_SHEET_ID} .si-grid th,
          #${PURCHASE_SHEET_ID} .si-grid td { border: 1px solid #94a3b8; box-sizing: border-box; }
          #${PURCHASE_SHEET_ID} .si-grid .si-nowrap { white-space: nowrap; width: 1%; }
          #${PURCHASE_SHEET_ID} .si-grid .si-desc { overflow-wrap: anywhere; }
          #${PURCHASE_SHEET_ID} .si-grid tbody td { font-size: 11.5px; background: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #${PURCHASE_SHEET_ID} .si-grid thead tr,
          #${PURCHASE_SHEET_ID} .si-grid thead th {
            background: var(--blue-600, #2563eb) !important;
            background-color: #2563eb !important;
            background-image: none !important;
            color: #ffffff !important;
            border: 1px solid #1d4ed8 !important;
            font-size: 10.5px !important;
            font-weight: 700 !important;
            padding: 9px 8px !important;
            line-height: 1.35 !important;
            text-transform: uppercase;
            letter-spacing: .04em;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        </style>
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; gap:20px; align-items:flex-start; border-bottom:2px solid #1d4ed8; padding-bottom:14px;">
          <div style="display:flex; gap:12px; align-items:flex-start; min-width:0;">
            ${logo}
            <div style="min-width:0;">
              <div style="font-size:19px; font-weight:800; color:#0f172a; letter-spacing:-.2px;">${esc(companyName)}</div>
              <div style="font-size:${FS.body}; color:#475569; margin-top:5px; line-height:1.55;">${coLines.join('<br>')}</div>
            </div>
          </div>
          <div style="text-align:right; flex-shrink:0;">
            <div style="font-size:22px; font-weight:900; text-transform:uppercase; letter-spacing:.04em; color:#1d4ed8;">Purchase Voucher</div>
            ${d.isDraft ? `<div style="font-size:${FS.note}; color:#64748b; font-weight:600; margin-top:2px;">Draft — not posted</div>` : ''}
            <div style="margin-top:8px; font-size:${FS.body}; color:#0f172a; line-height:1.7;">
              <div><span style="color:#64748b; font-weight:600;">Purchase / Bill No.:</span> <strong>${esc(v.invoiceNo || '')}</strong></div>
              <div><span style="color:#64748b; font-weight:600;">Date:</span> <strong>${esc(dateOf(v.date))}</strong></div>
              ${d.placeOfSupply ? `<div><span style="color:#64748b; font-weight:600;">Place of Supply:</span> <strong>${esc(d.placeOfSupply)}</strong></div>` : ''}
            </div>
          </div>
        </div>

        <!-- Parties -->
        <div style="display:flex; gap:10px; margin-top:10px; align-items:stretch;">
          ${partyHtml(d.parties.billed, 'Supplier (Bill From)', '')}
          ${partyHtml(shippedParty, 'Dispatched From', shippedNote)}
        </div>

        <!-- Items -->
        <table class="si-grid" style="width:100%; font-size:10.5px; margin-top:10px;">
          <thead>
            <tr style="color:#fff; font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; white-space:nowrap; background-color:#2563eb;">
              ${th('Sl No.', 'left')}
              ${th('Item Description', 'left', 'si-desc')}
              ${th('HSN/SAC', 'left')}
              ${th('Qty', 'center')}
              ${th('Unit', 'center')}
              ${th('Rate', 'right')}
              ${th('Discount', 'right')}
              ${th('Value', 'right')}
              ${showTax ? th('Tax', 'right') : ''}
              ${th('Amount', 'right')}
            </tr>
          </thead>
          <tbody>
            ${itemRowsHtml || `<tr><td colspan="${colCount}" style="padding:14px; text-align:center; color:#94a3b8;">No line items on this purchase.</td></tr>`}
          </tbody>
        </table>

        <div style="display:flex; gap:10px; margin-top:10px; align-items:stretch;">
          <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:10px;">
            ${bankHtml}
            <div style="flex:0 0 auto; padding:7px 12px; background:#f8fafc; border-left:3.5px solid var(--blue-600, #2563eb); border-radius:0 6px 6px 0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact;">
              <div style="color:#2563eb; font-weight:700; text-transform:uppercase; letter-spacing:.06em; font-size:${FS.label};">Amount in Words</div>
              <div style="font-size:${FS.body}; color:#0f172a; font-weight:700; margin-top:2px; line-height:1.4;">${esc(words)}</div>
            </div>
            ${termsHtml}
          </div>
          <div style="width:290px; flex-shrink:0; display:flex; flex-direction:column; gap:10px;">
            <div style="flex:0 0 auto; padding:4px 12px; box-sizing:border-box;">
              ${totalsRow('Taxable Value', num(d.subTotal))}
              ${gstTotalsRows ? `<div style="margin-top:4px; padding-top:4px; border-top:1px dashed #94a3b8;"></div>${gstTotalsRows}` : ''}
              ${(v.tdsTcsMode === 'TCS' && d.tdsTcsAmount) ? totalsRow('TCS @ ' + num(v.tdsTcsRate) + '%', num(d.tdsTcsAmount)) : ''}
              ${d.adjustments !== 0 ? `<div style="margin-top:4px; padding-top:4px; border-top:1px dashed #94a3b8;"></div>${totalsRow('Round Off', num(d.adjustments))}` : ''}
            </div>
            <div style="flex:0 0 auto; background:var(--blue-600, #2563eb); border:1px solid #1d4ed8; border-radius:6px; padding:6px 12px; box-sizing:border-box; color:#ffffff; -webkit-print-color-adjust:exact; print-color-adjust:exact;">
              ${totalsRow('Total Amount', num(d.grandTotal), { size: '12px', weight: 700, color: '#ffffff', pad: '1px 0' })}
            </div>
            <div style="flex:1 1 auto; padding:8px 12px 0; box-sizing:border-box; text-align:center; display:flex; flex-direction:column; justify-content:space-between;">
              <div style="font-size:11px; font-weight:700; color:#0f172a;">For ${esc(companyName)}</div>
              ${signatory}
              <div style="border-top:1px solid #94a3b8; padding-top:5px; font-size:10.5px; color:#475569; font-weight:600;">Authorised Signatory</div>
            </div>
          </div>
        </div>

        <div style="text-align:center; margin-top:18px; padding-top:12px; border-top:1px solid #94a3b8;">
          <div style="font-size:10px; color:#94a3b8;">
            Certified that the particulars given above are true and correct. This is a computer generated purchase voucher.
          </div>
        </div>
      </div>`;
  }

  // ── Export data: the same figures and labels the sheet prints (sales-invoice-export.js) ──
  function getPurchaseVoucherExportData(v) {
    const d = computePurchaseSheet(v);
    const co = d.co;
    const docTitle = (d.isDraft ? 'Draft ' : '') + 'Purchase Voucher';
    const companyName = (typeof getInvoiceCompanyName === 'function') ? getInvoiceCompanyName(co) : (co.name || '');
    return {
      inv: v, co, parties: d.parties, bank: d.bank, paymentDetails: d.paymentDetails, rows: d.rows,
      taxMode: d.taxMode, isReturn: false, docTitle,
      companyName,
      companySeal: (typeof getInvoiceCompanySeal === 'function') ? getInvoiceCompanySeal(co) : '',
      signatureImage: co.signatureImage || '',
      subtitle: d.isDraft ? 'Draft — not posted' : '',
      subTotal: d.subTotal, grossTotal: d.grossTotal, totalTax: d.totalTax, totalDiscount: d.totalDiscount,
      adjustments: d.adjustments, tdsTcsAmount: d.tdsTcsAmount, grandTotal: d.grandTotal,
      paidAmount: d.paidAmount, balanceDue: d.balanceDue, isFullyPaid: d.isFullyPaid,
      placeOfSupply: d.placeOfSupply, gstLines: d.gstLines,
      payLines: d.payLines,
      amountInWords: (typeof siAmountInWords === 'function') ? siAmountInWords(d.grandTotal) : '',
      invoiceDate: dateOf(v.date),
      fileBase: (docTitle.replace(/\s+/g, '_') + '_' + (v.invoiceNo || 'Purchase')).replace(/[^a-zA-Z0-9_-]/g, '_'),
      // Wording of the Excel Details sheet
      excel: {
        docSection: 'PURCHASE VOUCHER',
        noLabel: 'Purchase / Bill No.',
        dateLabel: 'Purchase Date',
        supplyType: v.supplyType || '',
        partyBlocks: [
          ['SUPPLIER (BILL FROM)', d.parties.billed],
          ['DISPATCHED FROM', d.parties.shipped || d.parties.billed]
        ],
        tdsLabel: 'TDS Deducted (-)',
        bankTitle: 'SUPPLIER BANK DETAILS'
      }
    };
  }

  const PURCHASE_KIT = { render: renderPurchaseVoucherHTML, data: getPurchaseVoucherExportData };

  function exportPurchaseVoucherToPDF(v) {
    if (typeof window.exportKyaDocViaPrint !== 'function') return Promise.reject(new Error('PDF export is not available.'));
    return window.exportKyaDocViaPrint(v, PURCHASE_KIT);
  }

  function exportPurchaseVoucherToExcel(v) {
    if (typeof window.exportKyaDocToExcel !== 'function') return Promise.reject(new Error('Excel export is not available.'));
    return window.exportKyaDocToExcel(v, PURCHASE_KIT);
  }

  // ── Preview modal ────────────────────────────────────────────────
  // A posted purchase, or a draft — the same sheet, marked DRAFT, with Edit and Post.
  // opts.compact (after Save): a smaller popup with the sheet zoomed out to fit.
  function viewPurchaseVoucher(id, opts) {
    const compact = !!(opts && opts.compact);
    const v = findPurchaseVoucher(id);
    if (!v) {
      if (typeof showToast === 'function') showToast('Purchase voucher not found.', 'warning');
      return;
    }
    const isDraft = isPurchaseVoucherDraft(v);

    const stale = document.getElementById('purchaseVoucherOverlay');
    if (stale) stale.remove();

    const overlay = document.createElement('div');
    overlay.className = 'inv-modal-overlay';
    overlay.id = 'purchaseVoucherOverlay';
    overlay.tabIndex = -1;

    overlay.innerHTML = `
      <style>
        @media print {
          body * { visibility: hidden !important; }
          body > *:not(#purchaseVoucherOverlay) { display: none !important; }
          #purchaseVoucherOverlay .inv-modal-card > div:first-child { display: none !important; }
          #purchaseVoucherOverlay .inv-modal-card, #purchaseVoucherOverlay .inv-modal-card > div { position: static !important; padding: 0 !important; margin: 0 !important; background: none !important; max-width: none !important; width: auto !important; }
          #${PURCHASE_SHEET_ID}, #${PURCHASE_SHEET_ID} * { visibility: visible !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          #purchaseVoucherOverlay { position: absolute !important; top: 0 !important; left: 0 !important; right: auto !important; bottom: auto !important; background: none !important; backdrop-filter: none !important; }
          #purchaseVoucherOverlay, #purchaseVoucherOverlay * { overflow: visible !important; max-height: none !important; box-shadow: none !important; }
          #${PURCHASE_SHEET_ID} { position: absolute; left: 0; top: 0; width: 100%; padding: 0; margin: 0; }
          #purchaseVoucherOverlay .si-preview-scale { transform: none !important; width: auto !important; }
          #purchaseVoucherOverlay .si-preview-frame { width: auto !important; height: auto !important; }
          @page { size: A4; margin: 12mm; }
        }
      </style>
      <div class="inv-modal-card" style="padding:0; max-width:${compact ? '640px' : '900px'}; width:94%;${compact ? ' overflow:hidden;' : ''}">
        <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 20px; border-bottom:1.5px solid var(--slate-100); background:var(--slate-50); border-radius:20px 20px 0 0;">
          <div style="font-weight:700; color:var(--slate-800); display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span>Purchase Voucher &nbsp;·&nbsp; <span style="font-family:monospace; color:var(--blue-700);">${esc(v.invoiceNo || 'Draft')}</span></span>
            ${isDraft && !compact ? '<span style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; padding:3px 9px; border-radius:6px; background:#fef3c7; color:#b45309; border:1px solid #fde68a;">Draft</span>' : ''}
          </div>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:flex-end;">
            ${isDraft && !compact ? `
            <button class="btn btn-secondary" id="btnPurchaseVoucherEditDraft" type="button" style="padding:7px 14px; height:34px; font-size:13px; display:flex; align-items:center; gap:6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg>
              Edit
            </button>
            <button class="btn btn-success" id="btnPurchaseVoucherPostDraft" type="button" style="padding:7px 16px; height:34px; font-size:13px; display:flex; align-items:center; gap:6px;">
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M2.5 8l4 4 6-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Post
            </button>` : ''}
            <button class="btn btn-secondary" id="btnPurchaseVoucherPrint" type="button" style="padding:7px 14px; height:34px; font-size:13px; display:flex; align-items:center; gap:6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              Print
            </button>
            <div class="si-export-wrap" style="position:relative; display:inline-block;">
              <button class="btn btn-secondary" id="btnPurchaseVoucherExport" type="button" aria-haspopup="menu" aria-expanded="false" style="padding:7px 12px 7px 14px; height:34px; font-size:13px; display:flex; align-items:center; gap:6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span class="si-export-label">Export</span>
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none" style="margin-left:2px;">
                  <path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
              </button>
              <div class="rpt-more-dropdown" id="purchaseVoucherExportMenu" role="menu" style="min-width:160px; text-align:left;">
                <button class="rpt-menu-item" id="btnPurchaseVoucherExportPdf" type="button" role="menuitem">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <path d="M9 15h6M9 18h4"></path>
                  </svg>
                  <span>PDF</span>
                </button>
                <button class="rpt-menu-item" id="btnPurchaseVoucherExportExcel" type="button" role="menuitem">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                    <path d="M3 9h18M3 15h18M9 3v18"></path>
                  </svg>
                  <span>Excel</span>
                </button>
              </div>
            </div>
            <button class="btn btn-danger" id="btnPurchaseVoucherClose" type="button" style="padding:7px 14px; height:34px; font-size:13px;">Close</button>
          </div>
        </div>
        ${compact ? `
        <div class="si-preview-body" style="background:#f1f5f9; padding:16px; display:flex; justify-content:center; overflow:hidden; border-radius:0 0 20px 20px;">
          <div class="si-preview-frame" style="position:relative; overflow:hidden; background:#fff; box-shadow:0 6px 24px rgba(15,23,42,.12); border-radius:6px; flex-shrink:0;">
            <div class="si-preview-scale" style="width:820px; transform-origin:top left;">
              ${renderPurchaseVoucherHTML(v)}
            </div>
          </div>
        </div>` : `
        <div style="max-height:78vh; overflow-y:auto; background:#f1f5f9; padding:16px;">
          <div style="max-width:820px; margin:0 auto; box-shadow:0 6px 24px rgba(15,23,42,.12); border-radius:6px; overflow:hidden;">
            ${renderPurchaseVoucherHTML(v)}
          </div>
        </div>`}
      </div>`;

    document.body.appendChild(overlay);
    overlay.focus();

    // Compact: zoom the sheet out so the whole page fits in the smaller popup
    if (compact) {
      const body = overlay.querySelector('.si-preview-body');
      const frame = overlay.querySelector('.si-preview-frame');
      const scaleEl = overlay.querySelector('.si-preview-scale');
      const header = overlay.querySelector('.inv-modal-card > div');
      const fit = () => {
        if (!document.body.contains(overlay)) { window.removeEventListener('resize', fit); return; }
        const sheetW = 820;
        const sheetH = scaleEl.scrollHeight;
        const availW = body.clientWidth - 32;
        const availH = window.innerHeight * 0.9 - (header ? header.offsetHeight : 0) - 32;
        const s = Math.max(0.2, Math.min(1, availW / sheetW, availH / sheetH));
        scaleEl.style.transform = `scale(${s})`;
        frame.style.width = Math.floor(sheetW * s) + 'px';
        frame.style.height = Math.floor(sheetH * s) + 'px';
      };
      fit();
      window.addEventListener('resize', fit);
      overlay.querySelectorAll('img').forEach(img => { if (!img.complete) img.addEventListener('load', fit); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit).catch(() => {});
    }

    overlay.querySelector('#btnPurchaseVoucherClose').addEventListener('click', () => overlay.remove());

    // Draft: open it on the form to change it, or post it as it is (purchase-form.js)
    const editDraftBtn = overlay.querySelector('#btnPurchaseVoucherEditDraft');
    if (editDraftBtn) editDraftBtn.addEventListener('click', () => {
      overlay.remove();
      if (typeof window.editPurchaseDraft === 'function') window.editPurchaseDraft(v.id);
    });
    const postDraftBtn = overlay.querySelector('#btnPurchaseVoucherPostDraft');
    if (postDraftBtn) postDraftBtn.addEventListener('click', () => {
      overlay.remove();
      if (typeof window.postPurchaseDraft === 'function') window.postPurchaseDraft(v.id);
    });

    overlay.querySelector('#btnPurchaseVoucherPrint').addEventListener('click', () => {
      exportPurchaseVoucherToPDF(v).catch(err => { console.error('Purchase voucher print failed:', err); window.print(); });
    });

    const exportBtn = overlay.querySelector('#btnPurchaseVoucherExport');
    const exportMenu = overlay.querySelector('#purchaseVoucherExportMenu');
    const exportLabel = overlay.querySelector('.si-export-label');
    const isExportMenuOpen = () => !!(exportMenu && exportMenu.classList.contains('open'));
    const setExportMenu = (open) => {
      exportMenu.classList.toggle('open', open);
      exportBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    let exporting = false;
    const runExport = async (kind) => {
      setExportMenu(false);
      if (exporting) return;
      const kindName = kind === 'pdf' ? 'PDF' : 'Excel';
      exporting = true;
      exportBtn.disabled = true;
      if (exportLabel) exportLabel.textContent = 'Exporting…';
      try {
        await (kind === 'pdf' ? exportPurchaseVoucherToPDF(v) : exportPurchaseVoucherToExcel(v));
      } catch (err) {
        console.error('Purchase voucher ' + kindName + ' export failed:', err);
        alert('Could not export ' + kindName + ': ' + (err && err.message ? err.message : err));
      } finally {
        exporting = false;
        exportBtn.disabled = false;
        if (exportLabel) exportLabel.textContent = 'Export';
      }
    };
    exportBtn.addEventListener('click', e => {
      e.stopPropagation();
      setExportMenu(!isExportMenuOpen());
    });
    overlay.querySelector('#btnPurchaseVoucherExportPdf').addEventListener('click', e => { e.stopPropagation(); runExport('pdf'); });
    overlay.querySelector('#btnPurchaseVoucherExportExcel').addEventListener('click', e => { e.stopPropagation(); runExport('excel'); });
    overlay.addEventListener('click', e => {
      if (isExportMenuOpen() && !e.target.closest('.si-export-wrap')) setExportMenu(false);
    });

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (isExportMenuOpen()) { setExportMenu(false); return; }
      overlay.remove();
    });
  }

  window.renderPurchaseVoucherHTML = renderPurchaseVoucherHTML;
  window.getPurchaseVoucherExportData = getPurchaseVoucherExportData;
  window.exportPurchaseVoucherToPDF = exportPurchaseVoucherToPDF;
  window.exportPurchaseVoucherToExcel = exportPurchaseVoucherToExcel;
  window.viewPurchaseVoucher = viewPurchaseVoucher;
})();
