// ══════════════════════════════════════════════════════════════════
//  PRE-SALES DOCUMENTS — Quotation, Proforma Invoice, Sales Order and Delivery Challan:
//  printable sheet and preview laid out like the Sales Tax Invoice (sales-invoice-print.js)
//  and exported through the same Print / PDF / Excel engine (sales-invoice-export.js).
//
//    • Company block ....... Company Profile (logo, name, address, GSTIN)
//    • Billed To ........... the customer master on the document
//    • Shipped To .......... the document's temporary (override) party details when
//                            present, else the customer
//    • Bank Details ........ the primary bank account; a Proforma / Sales Order / Delivery
//                            Challan adds its Due Date, the advance received and Balance
//                            Due. An advance covering the whole document shows its Payment
//                            Details instead.
//    • Totals .............. as on the Tax Invoice: the full value with no TDS line; TCS stays
//    • Terms & Conditions .. the document's Terms & Conditions box (Narration never prints)
// ══════════════════════════════════════════════════════════════════
(function() {
  'use strict';

  const PREDOC_SHEET_ID = 'salesPreDocSheet';

  // Per document: its title, number field and labels, the date shown beside the document
  // date, and the store its journal advances are allocated to
  const PREDOC_KINDS = {
    quotation: {
      title: 'Quotation', noField: 'quoteNo', noLabel: 'Quotation No.', dateLabel: 'Quotation Date',
      secondDate: { label: 'Expiry Date', field: 'expiryDate' }, storeKey: 'quotations', hasAdvance: false
    },
    proforma: {
      title: 'Proforma Invoice', noField: 'proformaNo', noLabel: 'Proforma No.', dateLabel: 'Proforma Date',
      secondDate: { label: 'Valid Until', field: 'expiryDate' }, storeKey: 'proformaInvoices', hasAdvance: true
    },
    salesOrder: {
      title: 'Sales Order', noField: 'orderNo', noLabel: 'Order No.', dateLabel: 'Order Date',
      secondDate: { label: 'Delivery Date', field: 'deliveryDate' }, storeKey: 'salesOrders', hasAdvance: true
    },
    deliveryChallan: {
      title: 'Delivery Challan', noField: 'challanNo', noLabel: 'Challan No.', dateLabel: 'Challan Date',
      secondDate: { label: 'Dispatch Date', field: 'dispatchDate' }, storeKey: 'deliveryChallans', hasAdvance: true
    }
  };

  // The Supply Type box of the Quotation, Proforma and Sales Order. A Delivery Challan's box
  // holds its purpose (Job Work, Supply on Approval …) instead.
  const GST_SUPPLY_TYPES = ['Intra-State (CGST + SGST)', 'Inter-State (IGST)', 'Export (Zero-Rated / LUT)',
    'SEZ With Tax', 'SEZ Without Tax', 'Deemed Export'];

  // Status beside the number, in the shape of the Tax Invoice's Draft chip
  const STATUS_CHIP_STYLE = {
    Draft: 'background:#fef3c7; color:#b45309; border:1px solid #fde68a;',
    Active: 'background:#ecfdf5; color:#047857; border:1px solid #a7f3d0;',
    Completed: 'background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;',
    Cancelled: 'background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1;'
  };

  const r2 = n => Math.round((parseFloat(n) || 0) * 100) / 100;
  const isDraftDoc = doc => !!(doc && (doc.isDraft || doc.status === 'Draft'));

  // The document as the sheet and the exports read it: its number as invoiceNo, and its kind
  function toSheetDoc(kindKey, doc) {
    const kind = PREDOC_KINDS[kindKey];
    return Object.assign({}, doc, { invoiceNo: doc[kind.noField] || '', preDocKind: kindKey });
  }

  // The account(s) the advance was received in
  function getPreDocPaidIn(sd) {
    const ledgers = (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) ? coaLedgers : [];
    const nameOf = id => String(id) === 'credit-adjust'
      ? 'Invoice Balance (customer credit)'
      : ((ledgers.find(l => String(l.id) === String(id)) || {}).name || '');
    if (String(sd.paymentAccountId) === 'multi-payment') {
      return (sd.paymentSplits || [])
        .filter(sp => sp && sp.accountId && (parseFloat(sp.amount) || 0) > 0)
        .map(sp => `${nameOf(sp.accountId)} ${siNum(sp.amount)}`.trim())
        .join(', ');
    }
    return sd.paymentAccountId ? (nameOf(sd.paymentAccountId) || sd.paymentAccountName || '') : '';
  }

  // ── Figures and labels the sheet prints (and the exports read) ──
  function computePreDocSheet(sd) {
    const kind = PREDOC_KINDS[sd.preDocKind];
    const co = getInvoiceCompany();
    const parties = getInvoiceParties(sd);
    const rows = getInvoiceLineRows(sd);
    const isDraft = isDraftDoc(sd);

    // A Delivery Challan's box is its purpose: the tax then follows the consignee's state,
    // compared with the company's as the Quotation / Sales Order forms do (Kerala when unset)
    const isGstSupply = GST_SUPPLY_TYPES.indexOf(sd.supplyType) > -1;
    const stateKey = s => String(s || '').trim().toLowerCase();
    const partyState = stateKey(parties.billed.state);
    const taxMode = isGstSupply
      ? getInvoiceTaxMode({ salesSupplyType: sd.supplyType })
      : ((partyState && partyState !== (stateKey(co.state) || 'kerala')) ? 'igst' : 'split');
    const purpose = (!isGstSupply && sd.supplyType) ? String(sd.supplyType) : '';

    const subTotal = rows.reduce((s, r) => s + r.taxable, 0);
    const grossTotal = rows.reduce((s, r) => s + r.gross, 0);
    const totalTax = rows.reduce((s, r) => s + r.taxAmt, 0);
    const totalDiscount = rows.reduce((s, r) => s + r.discAmt, 0);
    const adjustments = parseFloat(sd.adjustments) || 0;
    const tdsTcsAmount = parseFloat(sd.tdsTcsAmount) || 0;
    // As on the Tax Invoice: TDS is the customer's deduction, so the sheet shows the full value
    const tdsAmount = sd.tdsTcsMode === 'TDS' ? tdsTcsAmount : 0;
    const netTotal = parseFloat(sd.total) || (subTotal + totalTax + adjustments - tdsAmount);
    const grandTotal = netTotal + tdsAmount;

    // Advance against the document: a saved one shows what is in the books, a draft what is
    // entered on it
    let advance = 0;
    if (kind.hasAdvance && sd.paymentStatus && sd.paymentStatus !== 'Not Paid') {
      const amount = isDraft
        ? (sd.paymentStatus === 'Full Payment' ? netTotal : (parseFloat(sd.paymentAmount) || 0))
        : (parseFloat(sd.advancePaidAmount) || 0);
      advance = r2(Math.max(0, Math.min(amount, netTotal)));
    }
    // Received by Journal Entry against the saved document (journal-allocations.js)
    const journal = (kind.hasAdvance && !isDraft && typeof getJournalAllocatedTo === 'function')
      ? r2(Math.max(0, Math.min(getJournalAllocatedTo(kind.storeKey, sd.id), netTotal - advance)))
      : 0;
    const balanceDue = Math.max(0, r2(netTotal - advance - journal));
    const isFullyPaid = (advance + journal) > 0 && balanceDue <= 0.005;

    const payLines = [];
    if (kind.hasAdvance) {
      if (sd.dueDate && !isFullyPaid) payLines.push({ label: 'Due Date', value: siDate(sd.dueDate) });
      if (advance > 0) payLines.push({ label: 'Advance Received (' + sd.paymentStatus + ')', value: siNum(advance) });
      if (journal > 0) payLines.push({ label: 'Received by Journal Entry', value: siNum(journal) });
      if (!isFullyPaid) payLines.push({ label: 'Balance Due', value: siNum(balanceDue) });
    }

    // The whole document paid in advance: how it was paid, in place of the bank details
    let paymentDetails = null;
    if (isFullyPaid) {
      const paidIn = getPreDocPaidIn(sd);
      const lines = [{ label: 'Advance', value: 'Full Payment' }];
      if (advance > 0 && paidIn) lines.push({ label: 'Paid In', value: paidIn });
      if (advance > 0) lines.push({ label: 'Advance Received', value: siNum(advance) });
      if (journal > 0) lines.push({ label: 'Received by Journal Entry', value: siNum(journal) });
      paymentDetails = { lines };
    }

    const posFromParty = !!(parties.billed.state || parties.billed.country);
    const posState = posFromParty ? (parties.billed.state || '') : (co.state || '');
    const posCountry = posFromParty ? (parties.billed.country || '') : '';
    const posCode = posState ? getGstStateCode(posState, posCountry, posFromParty ? parties.billed.gstin : co.gstin) : '';
    const placeOfSupply = [posCode ? posCode + ' - ' + posState : posState, posCountry].filter(Boolean).join(', ');

    // GST is listed per rate in the totals box — CGST 9% / SGST 9%, IGST 18% …
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

    return {
      kind, co, parties, rows, isDraft, taxMode, purpose,
      bank: getInvoiceBankDetails(sd) || { bankName: '', accountHolder: '', accountNo: '', ifsc: '', branch: '', qrCode: '' },
      subTotal, grossTotal, totalTax, totalDiscount, adjustments, tdsTcsAmount, netTotal, grandTotal,
      advance, journal, balanceDue, isFullyPaid, payLines, paymentDetails, placeOfSupply, gstLines,
      secondDate: sd[kind.secondDate.field] || ''
    };
  }

  // ── The printable sheet (the Sales Tax Invoice's layout) ──
  function renderSalesPreDocHTML(sd) {
    const d = computePreDocSheet(sd);
    const co = d.co;
    const docTitle = d.kind.title;
    const companyName = getInvoiceCompanyName(co);

    // One type scale shared by the company, Billed/Shipped To, bank and terms blocks
    const FS = { label: '10.5px', body: '12.5px', name: '15px', note: '11.5px' };

    // ── Company block ──
    const coLines = [];
    if (co.address) coLines.push(siEsc(co.address).replace(/\n/g, '<br>'));
    const coDistrict = co.district && String(co.district).toLowerCase() !== String(co.city || '').toLowerCase() ? co.district : '';
    const coCityPin = [[co.city, coDistrict].filter(Boolean).join(', '), co.pincode].filter(Boolean).join(' - ');
    if (coCityPin) coLines.push(siEsc(coCityPin));
    if (co.state) coLines.push(siEsc(co.state));
    if (co.gstin) coLines.push(`GSTIN: ${siEsc(co.gstin)}`);
    const coContact = [co.phone ? 'Phone: ' + siEsc(co.phone) : '', co.email ? siEsc(co.email) : ''].filter(Boolean).join(' &nbsp;·&nbsp; ');
    if (coContact) coLines.push(coContact);
    if (co.website) coLines.push(siEsc(co.website));

    // ── Party block ──
    const partyHtml = (p, label, note) => {
      const cityPin = [p.city, p.pincode].filter(Boolean).join(' - ');
      const stateCountry = [p.state, p.country].filter(Boolean).join(', ');
      return `
        <div style="flex:1; min-width:0; padding:12px 14px; border:1px solid #94a3b8; border-radius:8px; box-sizing:border-box; background:#f8fafc; -webkit-print-color-adjust:exact; print-color-adjust:exact;">
          <div style="font-size:${FS.label}; font-weight:800; letter-spacing:.09em; text-transform:uppercase; color:#2563eb; margin-bottom:6px;">${label}</div>
          <div style="font-size:13px; font-weight:800; color:#0f172a;">${siEsc(p.name) || '&mdash;'}</div>
          ${p.address ? `<div style="font-size:${FS.body}; color:#475569; margin-top:3px; line-height:1.5;">${siEsc(p.address).replace(/\n/g, '<br>')}</div>` : ''}
          ${cityPin ? `<div style="font-size:${FS.body}; color:#475569; line-height:1.5;">${siEsc(cityPin)}</div>` : ''}
          ${stateCountry ? `<div style="font-size:${FS.body}; color:#475569; line-height:1.5;">${siEsc(stateCountry)}</div>` : ''}
          ${p.phone ? `<div style="font-size:${FS.body}; color:#475569; margin-top:3px; line-height:1.5;">Phone: ${siEsc(p.phone)}</div>` : ''}
          ${p.email ? `<div style="font-size:${FS.body}; color:#475569; line-height:1.5;">${siEsc(p.email)}</div>` : ''}
          ${p.gstin ? `<div style="font-size:${FS.body}; color:#475569; margin-top:3px; line-height:1.5;">GSTIN: ${siEsc(p.gstin)}</div>` : ''}
          ${p.pan ? `<div style="font-size:${FS.body}; color:#475569; line-height:1.5;">PAN: ${siEsc(p.pan)}</div>` : ''}
          ${note ? `<div style="font-size:${FS.note}; color:#64748b; font-style:italic; margin-top:6px;">${note}</div>` : ''}
        </div>`;
    };

    const shippedParty = d.parties.shipped || d.parties.billed;
    const shippedNote = d.parties.isTemporary ? 'Delivery details entered on this document.' : '';

    // ── Items table ──
    const hasTaxCol = d.taxMode === 'split' || d.taxMode === 'igst';
    const thStyle = (align) => `padding:9px 8px; font-size:10.5px; font-weight:700; text-align:${align}; background-color:var(--blue-600,#2563eb); color:#ffffff; border:1px solid #1d4ed8;`;
    const siDash = '<span style="color:#94a3b8; font-size:10px; font-weight:400;">-</span>';
    const shown = (n, text) => Math.abs(parseFloat(n) || 0) > 0.0001 ? text : siDash;
    const codeOf = (v) => {
      const s = String(v || '').trim();
      return (s && s !== '-' && s !== '0') ? siEsc(s) : siDash;
    };

    const itemRowsHtml = d.rows.map((r, i) => `
        <tr>
          <td class="si-nowrap" style="padding:5px 6px; text-align:center; color:#64748b;">${i + 1}</td>
          <td class="si-desc" style="padding:5px 6px; color:#0f172a;">${siEsc(r.name)}</td>
          <td class="si-nowrap" style="padding:5px 6px; color:#475569;">${codeOf(r.hsn)}</td>
          <td class="si-nowrap" style="padding:5px 6px; text-align:center;">${shown(r.qty, r.qty)}</td>
          <td class="si-nowrap" style="padding:5px 6px; text-align:center; text-transform:uppercase; color:#475569;">${codeOf(r.unit)}</td>
          <td class="si-nowrap" style="padding:5px 6px; text-align:right;">${shown(r.rate, siNum(r.rate))}</td>
          <td class="si-nowrap" style="padding:5px 6px; text-align:right;">${shown(r.discAmt, siNum(r.discAmt))}</td>
          <td class="si-nowrap" style="padding:5px 6px; text-align:right;">${shown(r.taxable, siNum(r.taxable))}</td>
          ${hasTaxCol ? `<td class="si-nowrap" style="padding:5px 6px; text-align:right;">${shown(r.taxPct, (parseFloat(r.taxPct) || 0) + '%')}</td>` : ''}
          <td class="si-nowrap" style="padding:5px 6px; text-align:right; color:#0f172a;">${shown(r.total, siNum(r.total))}</td>
        </tr>`).join('');

    const colCount = 9 + (hasTaxCol ? 1 : 0);

    // ── Bank / payment block ──
    const cardStyle = 'flex:0 0 auto; min-width:0; border:1px solid #94a3b8; border-radius:8px; padding:10px 12px; background:#f8fafc; -webkit-print-color-adjust:exact; print-color-adjust:exact;';
    const cardLabel = (text) => `<div style="font-size:${FS.label}; font-weight:800; letter-spacing:.09em; text-transform:uppercase; color:#2563eb; margin-bottom:6px;">${text}</div>`;
    const bank = d.bank;
    const payLinesHtml = d.payLines.map((l, i) => `<div${i === 0 ? ' style="margin-top:4px; padding-top:4px; border-top:1px dashed #94a3b8;"' : ''}><span style="color:#334155;">${siEsc(l.label)}:</span> ${siEsc(l.value)}</div>`).join('');
    const bankHtml = d.paymentDetails ? `
      <div style="${cardStyle}">
        ${cardLabel('Payment Details')}
        <div style="font-size:${FS.body}; color:#0f172a; line-height:1.55;">
          ${d.paymentDetails.lines.map(l => `<div><span style="color:#334155;">${siEsc(l.label)}:</span> ${siEsc(l.value)}</div>`).join('')}
        </div>
      </div>` : `
      <div style="${cardStyle}">
        ${cardLabel('Bank Details for Payment')}
        <div style="display:flex; gap:12px; align-items:flex-start;">
          <div style="flex:1; min-width:0; font-size:${FS.body}; color:#0f172a; line-height:1.55;">
            ${bank.bankName ? `<div><span style="color:#334155;">Bank:</span> ${siEsc(bank.bankName)}</div>` : ''}
            ${bank.accountHolder ? `<div><span style="color:#334155;">A/c Holder:</span> ${siEsc(bank.accountHolder)}</div>` : ''}
            ${bank.accountNo ? `<div><span style="color:#334155;">A/c No.:</span> ${siEsc(bank.accountNo)}</div>` : ''}
            ${bank.ifsc ? `<div><span style="color:#334155;">IFSC:</span> ${siEsc(bank.ifsc)}</div>` : ''}
            ${bank.branch ? `<div><span style="color:#334155;">Branch:</span> ${siEsc(bank.branch)}</div>` : ''}
            ${payLinesHtml}
          </div>
          ${bank.qrCode ? `
          <div style="flex-shrink:0; text-align:center;">
            <img src="${siEsc(bank.qrCode)}" alt="Payment QR" style="width:88px;height:88px;object-fit:contain;border:1px solid #bfdbfe;border-radius:8px;padding:4px;background:#fff;box-sizing:border-box;display:block;-webkit-print-color-adjust:exact;print-color-adjust:exact;" />
            <div style="font-size:9px; font-weight:800; letter-spacing:.09em; text-transform:uppercase; color:#2563eb; margin-top:5px; line-height:1.1;">Scan to Pay</div>
          </div>` : ''}
        </div>
      </div>`;

    // Terms always print too — a document without notes still shows the column
    const termsHtml = `
      <div style="flex:1 1 auto; min-width:0; padding:6px 8px; box-sizing:border-box;">
        <div style="font-size:9.5px; font-weight:800; letter-spacing:.09em; text-transform:uppercase; color:#94a3b8; margin-bottom:5px;">Terms &amp; Conditions</div>
        <div style="font-size:11px; color:#334155; line-height:1.6; white-space:pre-wrap;">${siEsc(sd.notes || '')}</div>
      </div>`;

    const totalsRow = (label, value, opts) => {
      const o = opts || {};
      return `
        <div style="display:flex; justify-content:space-between; gap:16px; font-size:${o.size || '11.5px'}; color:${o.color || '#334155'}; font-weight:${o.weight || 600}; padding:${o.pad || '3px 0'};">
          <span>${label}</span><span>${value}</span>
        </div>`;
    };
    const gstTotalsRows = d.gstLines.map(g => totalsRow(g.label, siNum(g.amount))).join('');

    const headLine = (label, value) => value
      ? `<div><span style="color:#64748b; font-weight:600;">${label}:</span> <strong>${siEsc(value)}</strong></div>` : '';

    return `
      <div id="${PREDOC_SHEET_ID}" style="position:relative; background:#fff; color:#0f172a; font-family:Inter, system-ui, sans-serif; padding:26px 28px; box-sizing:border-box;">
        ${d.isDraft ? `<div aria-hidden="true" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; z-index:5; overflow:hidden;">
          <span style="transform:rotate(-28deg); font-size:120px; font-weight:900; letter-spacing:.14em; color:rgba(217,119,6,.14); border:7px solid rgba(217,119,6,.14); border-radius:18px; padding:2px 30px; -webkit-print-color-adjust:exact; print-color-adjust:exact;">DRAFT</span>
        </div>` : ''}
        <style>
          #${PREDOC_SHEET_ID} .si-grid { border-collapse: collapse; table-layout: auto; }
          #${PREDOC_SHEET_ID} .si-grid th,
          #${PREDOC_SHEET_ID} .si-grid td { border: 1px solid #94a3b8; box-sizing: border-box; }
          #${PREDOC_SHEET_ID} .si-grid .si-nowrap { white-space: nowrap; width: 1%; }
          #${PREDOC_SHEET_ID} .si-grid .si-desc { overflow-wrap: anywhere; }
          #${PREDOC_SHEET_ID} .si-grid tbody td { font-size: 11.5px; background: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #${PREDOC_SHEET_ID} .si-grid thead tr,
          #${PREDOC_SHEET_ID} .si-grid thead th {
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
            ${getCompanyLogoHtml(co)}
            <div style="min-width:0;">
              <div style="font-size:19px; font-weight:800; color:#0f172a; letter-spacing:-.2px;">${siEsc(companyName)}</div>
              <div style="font-size:${FS.body}; color:#475569; margin-top:5px; line-height:1.55;">${coLines.join('<br>')}</div>
            </div>
          </div>
          <div style="text-align:right; flex-shrink:0;">
            <div style="font-size:22px; font-weight:900; text-transform:uppercase; letter-spacing:.04em; color:#1d4ed8;">${docTitle}</div>
            ${d.isDraft ? `<div style="font-size:${FS.note}; color:#64748b; font-weight:600; margin-top:2px;">Draft</div>` : ''}
            <div style="margin-top:8px; font-size:${FS.body}; color:#0f172a; line-height:1.7;">
              <div><span style="color:#64748b; font-weight:600;">${d.kind.noLabel}:</span> <strong>${siEsc(sd.invoiceNo)}</strong></div>
              <div><span style="color:#64748b; font-weight:600;">Date:</span> <strong>${siEsc(siDate(sd.date))}</strong></div>
              ${headLine(d.kind.secondDate.label, siDate(d.secondDate))}
              ${headLine('Place of Supply', d.placeOfSupply)}
              ${headLine('Purpose', d.purpose)}
            </div>
          </div>
        </div>

        <!-- Parties -->
        <div style="display:flex; gap:10px; margin-top:10px; align-items:stretch;">
          ${partyHtml(d.parties.billed, 'Billed To (Recipient)', '')}
          ${partyHtml(shippedParty, 'Shipped To (Delivery)', shippedNote)}
        </div>

        <!-- Items -->
        <table class="si-grid" style="width:100%; font-size:10.5px; margin-top:10px;">
          <thead>
            <tr style="color:#fff; font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; white-space:nowrap; background-color:#2563eb;">
              <th class="si-nowrap" style="${thStyle('left')}">Sl No.</th>
              <th class="si-desc" style="${thStyle('left')}">Item Description</th>
              <th class="si-nowrap" style="${thStyle('left')}">HSN/SAC</th>
              <th class="si-nowrap" style="${thStyle('center')}">Qty</th>
              <th class="si-nowrap" style="${thStyle('center')}">Unit</th>
              <th class="si-nowrap" style="${thStyle('right')}">Rate</th>
              <th class="si-nowrap" style="${thStyle('right')}">Discount</th>
              <th class="si-nowrap" style="${thStyle('right')}">Value</th>
              ${hasTaxCol ? `<th class="si-nowrap" style="${thStyle('right')}">Tax</th>` : ''}
              <th class="si-nowrap" style="${thStyle('right')}">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemRowsHtml || `<tr><td colspan="${colCount}" style="padding:14px; text-align:center; color:#94a3b8;">No line items on this ${docTitle.toLowerCase()}.</td></tr>`}
          </tbody>
        </table>

        <!-- One two-column grid, as on the Tax Invoice -->
        <div style="display:flex; gap:10px; margin-top:10px; align-items:stretch;">
          <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:10px;">
            ${bankHtml}
            <div style="flex:0 0 auto; padding:7px 12px; background:#f8fafc; border-left:3.5px solid var(--blue-600, #2563eb); border-radius:0 6px 6px 0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact;">
              <div style="color:#2563eb; font-weight:700; text-transform:uppercase; letter-spacing:.06em; font-size:${FS.label};">Amount in Words</div>
              <div style="font-size:${FS.body}; color:#0f172a; font-weight:700; margin-top:2px; line-height:1.4;">${siEsc(siAmountInWords(d.grandTotal))}</div>
            </div>
            ${termsHtml}
          </div>
          <div style="width:290px; flex-shrink:0; display:flex; flex-direction:column; gap:10px;">
            <div style="flex:0 0 auto; padding:4px 12px; box-sizing:border-box;">
              ${totalsRow('Taxable Value', siNum(d.subTotal))}
              ${gstTotalsRows ? `<div style="margin-top:4px; padding-top:4px; border-top:1px dashed #94a3b8;"></div>${gstTotalsRows}` : ''}
              ${(sd.tdsTcsMode === 'TCS' && d.tdsTcsAmount) ? totalsRow('TCS @ ' + siNum(sd.tdsTcsRate) + '%', siNum(d.tdsTcsAmount)) : ''}
              ${d.adjustments !== 0 ? `<div style="margin-top:4px; padding-top:4px; border-top:1px dashed #94a3b8;"></div>${totalsRow('Round Off', siNum(d.adjustments))}` : ''}
            </div>
            <div style="flex:0 0 auto; background:var(--blue-600, #2563eb); border:1px solid #1d4ed8; border-radius:6px; padding:6px 12px; box-sizing:border-box; color:#ffffff; -webkit-print-color-adjust:exact; print-color-adjust:exact;">
              ${totalsRow('Total Amount', siNum(d.grandTotal), { size: '12px', weight: 700, color: '#ffffff', pad: '1px 0' })}
            </div>
            ${getInvoiceSignatoryBlockHtml(co, companyName)}
          </div>
        </div>

        <!-- Thank you -->
        <div style="text-align:center; margin-top:18px; padding-top:12px; border-top:1px solid #94a3b8;">
          <div style="font-size:13px; font-weight:800; color:#1d4ed8; letter-spacing:.02em;">Thank you for your business!</div>
          <div style="font-size:10px; color:#94a3b8; margin-top:4px;">
            Certified that the particulars given above are true and correct. This is a computer generated ${docTitle.toLowerCase()}.
          </div>
        </div>
      </div>`;
  }

  // ── Export data: the same figures and labels the sheet prints (sales-invoice-export.js) ──
  function getSalesPreDocExportData(sd) {
    const d = computePreDocSheet(sd);
    const co = d.co;
    const docTitle = (d.isDraft ? 'Draft ' : '') + d.kind.title;
    return {
      inv: sd, co, parties: d.parties, bank: d.bank, paymentDetails: d.paymentDetails, rows: d.rows,
      taxMode: d.taxMode, isReturn: false, docTitle,
      companyName: getInvoiceCompanyName(co),
      companySeal: getInvoiceCompanySeal(co),
      signatureImage: co.signatureImage || '',
      subtitle: d.isDraft ? 'Draft' : '',
      subTotal: d.subTotal, grossTotal: d.grossTotal, totalTax: d.totalTax, totalDiscount: d.totalDiscount,
      adjustments: d.adjustments, tdsTcsAmount: d.tdsTcsAmount, grandTotal: d.grandTotal,
      paidAmount: d.advance, balanceDue: d.balanceDue, isFullyPaid: d.isFullyPaid,
      journalReceived: d.journal, journalLabel: 'Received by Journal Entry',
      placeOfSupply: d.placeOfSupply, gstLines: d.gstLines,
      payLines: d.payLines,
      amountInWords: siAmountInWords(d.grandTotal),
      invoiceDate: siDate(sd.date),
      fileBase: (docTitle.replace(/\s+/g, '_') + '_' + (sd.invoiceNo || d.kind.title)).replace(/[^a-zA-Z0-9_-]/g, '_'),
      // Wording of the Excel Details sheet
      excel: {
        docSection: d.kind.title.toUpperCase(),
        noLabel: d.kind.noLabel,
        dateLabel: d.kind.dateLabel,
        supplyType: sd.supplyType || '',
        partyBlocks: [
          ['BILLED TO (RECIPIENT)', d.parties.billed],
          ['SHIPPED TO (DELIVERY)', d.parties.shipped || d.parties.billed]
        ]
      }
    };
  }

  const PREDOC_KIT = { render: renderSalesPreDocHTML, data: getSalesPreDocExportData };

  function exportSalesPreDocToPDF(sd) {
    if (typeof window.exportKyaDocViaPrint !== 'function') return Promise.reject(new Error('PDF export is not available.'));
    return window.exportKyaDocViaPrint(sd, PREDOC_KIT);
  }

  function exportSalesPreDocToExcel(sd) {
    if (typeof window.exportKyaDocToExcel !== 'function') return Promise.reject(new Error('Excel export is not available.'));
    return window.exportKyaDocToExcel(sd, PREDOC_KIT);
  }

  // ── Preview modal ────────────────────────────────────────────────
  // The Tax Invoice's popup: the document with its status beside the number, and Edit /
  // Delete / Print / Export / Close. Convert to Sale (and to the later pre-sales documents it
  // may become) / Mark Completed / Mark Cancelled / Reopen keep their row under the bar. A
  // completed document can't be edited or deleted.
  // handlers: { edit, delete, convert, complete, cancel, reopen } — each gets close().
  function viewSalesPreDoc(kindKey, doc, handlers) {
    const kind = PREDOC_KINDS[kindKey];
    if (!kind || !doc) return;
    const sd = toSheetDoc(kindKey, doc);
    const h = handlers || {};
    const isDraft = isDraftDoc(doc);
    const isCompleted = doc.status === 'Completed';
    const isOpen = isDraft || doc.status === 'Active' || !doc.status;
    const status = isDraft ? 'Draft' : (doc.status || 'Active');

    const stale = document.getElementById('salesPreDocOverlay');
    if (stale) stale.remove();

    const actBtnStyle = 'padding: 8px 16px;';
    let statusActionsHtml = '';
    if (isOpen) {
      // Convert to the later pre-sales documents this one may become (sales-predoc-convert.js)
      const convertToHtml = (typeof window.getSalesPreDocConvertTargets === 'function' ? window.getSalesPreDocConvertTargets(kindKey) : [])
        .map(t => `
          <button type="button" data-act="convertTo" data-to="${t.kind}" class="btn btn-secondary" style="${actBtnStyle}">Convert to ${t.label}</button>`).join('');
      statusActionsHtml = `
          <button type="button" data-act="convert" class="btn btn-secondary" style="${actBtnStyle}">Convert to Sale</button>${convertToHtml}
          <button type="button" data-act="complete" class="btn btn-secondary" style="${actBtnStyle}">Mark Completed</button>
          <button type="button" data-act="cancel" class="btn btn-secondary" style="${actBtnStyle}">Mark Cancelled</button>`;
    } else if (doc.status === 'Cancelled') {
      // Only cancelled documents can be reopened; completed ones are final
      statusActionsHtml = `<button type="button" data-act="reopen" class="btn btn-secondary" style="${actBtnStyle}">Reopen</button>`;
    }

    const overlay = document.createElement('div');
    overlay.className = 'inv-modal-overlay';
    overlay.id = 'salesPreDocOverlay';
    overlay.tabIndex = -1;

    overlay.innerHTML = `
      <style>
        @media print {
          body * { visibility: hidden !important; }
          body > *:not(#salesPreDocOverlay) { display: none !important; }
          #salesPreDocOverlay .inv-modal-card > div:first-child,
          #salesPreDocOverlay .quote-preview-action-bar { display: none !important; }
          #salesPreDocOverlay .inv-modal-card, #salesPreDocOverlay .inv-modal-card > div { position: static !important; padding: 0 !important; margin: 0 !important; background: none !important; max-width: none !important; width: auto !important; }
          #${PREDOC_SHEET_ID}, #${PREDOC_SHEET_ID} * { visibility: visible !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          #salesPreDocOverlay { position: absolute !important; top: 0 !important; left: 0 !important; right: auto !important; bottom: auto !important; background: none !important; backdrop-filter: none !important; }
          #salesPreDocOverlay, #salesPreDocOverlay * { overflow: visible !important; max-height: none !important; box-shadow: none !important; }
          #${PREDOC_SHEET_ID} { position: absolute; left: 0; top: 0; width: 100%; padding: 0; margin: 0; }
          @page { size: A4; margin: 12mm; }
        }
      </style>
      <div class="inv-modal-card" style="padding:0; max-width:900px; width:94%;">
        <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 20px; border-bottom:1.5px solid var(--slate-100); background:var(--slate-50); border-radius:20px 20px 0 0;">
          <div style="font-weight:700; color:var(--slate-800); display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span>${kind.title} &nbsp;·&nbsp; <span style="font-family:monospace; color:var(--blue-700);">${siEsc(sd.invoiceNo || '—')}</span></span>
            <span style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; padding:3px 9px; border-radius:6px; ${STATUS_CHIP_STYLE[status] || STATUS_CHIP_STYLE.Active}">${siEsc(status)}</span>
          </div>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:flex-end;">
            ${isCompleted ? '' : `
            <button class="btn btn-secondary" data-act="edit" type="button" style="padding:7px 14px; height:34px; font-size:13px; display:flex; align-items:center; gap:6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg>
              Edit
            </button>
            <button class="btn btn-secondary" data-act="delete" type="button" style="padding:7px 14px; height:34px; font-size:13px; display:flex; align-items:center; gap:6px; color:var(--red-600);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              Delete
            </button>`}
            <button class="btn btn-secondary" data-act="print" type="button" style="padding:7px 14px; height:34px; font-size:13px; display:flex; align-items:center; gap:6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              Print
            </button>
            <div class="si-export-wrap" style="position:relative; display:inline-block;">
              <button class="btn btn-secondary" data-act="export" type="button" aria-haspopup="menu" aria-expanded="false" style="padding:7px 12px 7px 14px; height:34px; font-size:13px; display:flex; align-items:center; gap:6px;">
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
              <div class="rpt-more-dropdown" data-role="export-menu" role="menu" style="min-width:160px; text-align:left;">
                <button class="rpt-menu-item" data-act="pdf" type="button" role="menuitem">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <path d="M9 15h6M9 18h4"></path>
                  </svg>
                  <span>PDF</span>
                </button>
                <button class="rpt-menu-item" data-act="excel" type="button" role="menuitem">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                    <path d="M3 9h18M3 15h18M9 3v18"></path>
                  </svg>
                  <span>Excel</span>
                </button>
              </div>
            </div>
            <button class="btn btn-danger" data-act="close" type="button" style="padding:7px 14px; height:34px; font-size:13px;">Close</button>
          </div>
        </div>
        ${statusActionsHtml ? `
        <div class="quote-preview-action-bar no-print" style="background: #f8fafc; border-bottom: 1.5px solid var(--slate-200); padding: 12px 28px; display: flex; align-items: center; justify-content: flex-start; gap: 8px; flex-wrap: wrap;">
          ${statusActionsHtml}
        </div>` : ''}
        <div style="max-height:78vh; overflow-y:auto; background:#f1f5f9; padding:16px;">
          <div style="max-width:820px; margin:0 auto; box-shadow:0 6px 24px rgba(15,23,42,.12); border-radius:6px; overflow:hidden;">
            ${renderSalesPreDocHTML(sd)}
          </div>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    overlay.focus();

    const close = () => overlay.remove();
    const exportBtn = overlay.querySelector('[data-act="export"]');
    const exportMenu = overlay.querySelector('[data-role="export-menu"]');
    const exportLabel = overlay.querySelector('.si-export-label');
    const isExportMenuOpen = () => !!(exportMenu && exportMenu.classList.contains('open'));
    const setExportMenu = (open) => {
      exportMenu.classList.toggle('open', open);
      exportBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    let exporting = false;
    const runExport = async (type) => {
      setExportMenu(false);
      if (exporting) return;
      const typeName = type === 'pdf' ? 'PDF' : 'Excel';
      exporting = true;
      exportBtn.disabled = true;
      if (exportLabel) exportLabel.textContent = 'Exporting…';
      try {
        await (type === 'pdf' ? exportSalesPreDocToPDF(sd) : exportSalesPreDocToExcel(sd));
      } catch (err) {
        console.error(kind.title + ' ' + typeName + ' export failed:', err);
        alert('Could not export ' + typeName + ': ' + (err && err.message ? err.message : err));
      } finally {
        exporting = false;
        exportBtn.disabled = false;
        if (exportLabel) exportLabel.textContent = 'Export';
      }
    };

    overlay.addEventListener('click', e => {
      const btn = e.target.closest('[data-act]');
      if (btn && overlay.contains(btn)) {
        e.stopPropagation();
        const act = btn.dataset.act;
        if (act === 'export') { setExportMenu(!isExportMenuOpen()); return; }
        if (act === 'pdf' || act === 'excel') { runExport(act); return; }
        setExportMenu(false);
        if (act === 'close') { close(); return; }
        if (act === 'print') {
          exportSalesPreDocToPDF(sd).catch(err => { console.error(kind.title + ' print failed:', err); window.print(); });
          return;
        }
        if (act === 'convertTo') {
          if (typeof window.convertSalesPreDoc === 'function') window.convertSalesPreDoc(kindKey, doc, btn.dataset.to, close);
          return;
        }
        if (typeof h[act] === 'function') h[act](close);
        return;
      }
      if (isExportMenuOpen() && !e.target.closest('.si-export-wrap')) setExportMenu(false);
      if (e.target === overlay) close();
    });
    overlay.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (isExportMenuOpen()) { setExportMenu(false); return; }
      close();
    });
  }

  window.renderSalesPreDocHTML = renderSalesPreDocHTML;
  window.getSalesPreDocExportData = getSalesPreDocExportData;
  window.exportSalesPreDocToPDF = exportSalesPreDocToPDF;
  window.exportSalesPreDocToExcel = exportSalesPreDocToExcel;
  window.viewSalesPreDoc = viewSalesPreDoc;
})();
