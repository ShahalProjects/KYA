// ══════════════════════════════════════════════════════════════════
//  SALES INVOICE (TAX INVOICE) — printable GST invoice for a posted
//  sales voucher.
//
//  Data sources
//    • Company block ....... Company Profile & Vault → Basic Identity
//                            + Legal & Registration (logo, name, address,
//                            phone/email/web, GSTIN, PAN, CIN, Udyam, IEC)
//    • Billed To ........... the customer master on the voucher
//    • Shipped To .......... the voucher's temporary (override) party
//                            details when present, else the customer
//    • Bank Details ........ the payment account's bank ledger, else a
//                            bank ledger from the Chart of Accounts, else
//                            the primary bank in Company Profile → Banking
//    • Terms & Conditions .. the voucher's Notes / Terms box
//
//  Intra-State supply splits GST into CGST + SGST; Inter-State / SEZ with
//  tax shows IGST; zero-rated supplies show no tax columns.
// ══════════════════════════════════════════════════════════════════

  const SALES_INVOICE_SHEET_ID = 'salesTaxInvoiceSheet';

  function siEsc(str) {
    if (typeof ohEsc === 'function') return ohEsc(str);
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function siNum(num) {
    if (typeof fmtNum === 'function') return fmtNum(num);
    const n = parseFloat(num) || 0;
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function siDate(iso) {
    if (!iso) return '';
    const parts = String(iso).split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mi = parseInt(parts[1], 10) - 1;
      return `${parts[2]}-${months[mi] || parts[1]}-${parts[0]}`;
    }
    return String(iso);
  }

  // ── Amount in words, Indian numbering (crore / lakh / thousand) ──
  function siAmountInWords(amount) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const twoDigits = (n) => {
      if (n < 20) return ones[n];
      const t = Math.floor(n / 10);
      const o = n % 10;
      return tens[t] + (o ? ' ' + ones[o] : '');
    };
    const threeDigits = (n) => {
      const h = Math.floor(n / 100);
      const rest = n % 100;
      return (h ? ones[h] + ' Hundred' + (rest ? ' ' : '') : '') + (rest ? twoDigits(rest) : '');
    };

    const value = Math.abs(Math.round((parseFloat(amount) || 0) * 100) / 100);
    let rupees = Math.floor(value);
    const paise = Math.round((value - rupees) * 100);

    if (rupees === 0 && paise === 0) return 'Zero Rupees Only';

    const parts = [];
    const crore = Math.floor(rupees / 10000000);
    rupees %= 10000000;
    const lakh = Math.floor(rupees / 100000);
    rupees %= 100000;
    const thousand = Math.floor(rupees / 1000);
    rupees %= 1000;

    if (crore) parts.push(threeDigits(crore) + ' Crore');
    if (lakh) parts.push(threeDigits(lakh) + ' Lakh');
    if (thousand) parts.push(threeDigits(thousand) + ' Thousand');
    if (rupees) parts.push(threeDigits(rupees));

    let words = parts.join(' ').trim();
    words = words ? words + ' Rupees' : 'Zero Rupees';
    if (paise) words += ' and ' + twoDigits(paise) + ' Paise';
    return words + ' Only';
  }

  // ── Masters ──────────────────────────────────────────────────────
  function getInvoiceCompany() {
    let co = {};
    if (typeof getCompanyDetails === 'function') {
      co = getCompanyDetails() || {};
    } else {
      try { co = JSON.parse(localStorage.getItem('kya_company_details')) || {}; } catch (e) { co = {}; }
    }
    return co;
  }

  // The invoice prints the trading name only: the display name when one is set,
  // otherwise the legal name with its entity suffix (Pvt Ltd, LLP, Inc …) dropped.
  const COMPANY_NAME_SUFFIXES = [
    'pvt', 'private', 'ltd', 'limited', 'llp', 'llc', 'plc', 'inc', 'incorporated',
    'corp', 'corporation', 'co', 'company', 'gmbh', 'sa', 'bv', 'nv', 'pte', 'sdn', 'bhd'
  ];

  function getInvoiceCompanyName(co) {
    if (co.displayName && co.displayName.trim()) return co.displayName.trim();

    const raw = (co.name || '').trim();
    if (!raw) return 'Your Company';

    const words = raw.split(/\s+/);
    while (words.length > 1) {
      const last = words[words.length - 1].replace(/[.,&]/g, '').toLowerCase();
      if (last === '' || COMPANY_NAME_SUFFIXES.indexOf(last) > -1) words.pop();
      else break;
    }
    return words.join(' ') || raw;
  }

  function getCompanyLogoHtml(co) {
    const name = getInvoiceCompanyName(co);
    if (co.iconImage) {
      return `<img src="${siEsc(co.iconImage)}" alt="${siEsc(name)}" style="width:82px;height:82px;border-radius:14px;object-fit:contain;flex-shrink:0;" />`;
    }
    const initials = (typeof getCompanyInitials === 'function')
      ? getCompanyInitials(co.name || name)
      : name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const presets = {
      'blue-green': 'linear-gradient(135deg, #2563eb, #059669)',
      'indigo-purple': 'linear-gradient(135deg, #4f46e5, #7c3aed)',
      'rose-red': 'linear-gradient(135deg, #e11d48, #be123c)',
      'amber-orange': 'linear-gradient(135deg, #f59e0b, #d97706)',
      'emerald-teal': 'linear-gradient(135deg, #10b981, #047857)',
      'dark-slate': 'linear-gradient(135deg, #475569, #1e293b)'
    };
    const bg = presets[co.iconColor] || presets['blue-green'];
    return `<div style="width:82px;height:82px;border-radius:14px;background:${bg};color:#fff;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:800;letter-spacing:.5px;flex-shrink:0;">${siEsc(initials)}</div>`;
  }

  // Billed-to is always the customer master; shipped-to prefers the
  // voucher's temporary details when they were entered.
  function getInvoiceParties(inv) {
    const master = (typeof findPartyById === 'function' ? findPartyById(inv.customerId, 'Customer') : null)
      || ((typeof coaLedgers !== 'undefined' ? coaLedgers : []).find(l => String(l.id) === String(inv.customerId)))
      || {};
    const override = (inv.partyOverride && inv.partyOverride.isOverridden) ? inv.partyOverride : null;

    const shape = (src, fallbackName) => ({
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
      pan: src.pan || ''
    });

    const billed = shape(master, inv.customerName);
    const shipped = override ? shape(override, billed.name) : null;
    return { billed, shipped, isTemporary: !!override };
  }

  // Bank account for the payment instructions.
  function getInvoiceBankDetails(inv) {
    const ledgers = (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) ? coaLedgers : [];
    const fromLedger = (l) => {
      if (!l) return null;
      const info = l.bankAccountInfo || {};
      const bank = {
        bankName: info.bankName || l.bankName || '',
        accountHolder: info.accountHolder || '',
        accountNo: info.accountNo || l.accountNo || '',
        ifsc: info.ifscCode || l.ifsc || '',
        branch: info.branch || l.branch || '',
        qrCode: info.qrCode || '',
        ledgerName: l.name || ''
      };
      return (bank.bankName || bank.accountNo) ? bank : null;
    };

    // 1. the account this invoice was paid into
    const payLedger = ledgers.find(l => String(l.id) === String(inv.paymentAccountId));
    const fromPayment = fromLedger(payLedger);
    if (fromPayment) return fromPayment;

    // 2. any bank ledger in the Chart of Accounts
    for (const l of ledgers) {
      if (l.type !== 'ledger') continue;
      const b = fromLedger(l);
      if (b && b.bankName) return b;
    }

    // 3. the primary bank recorded in Company Profile → Banking
    const co = getInvoiceCompany();
    const banks = Array.isArray(co.banks) ? co.banks : [];
    const primary = banks.find(b => b.isPrimary) || banks[0];
    if (primary && (primary.bankName || primary.accNo)) {
      return {
        bankName: primary.bankName || '',
        accountHolder: co.name || '',
        accountNo: primary.accNo || '',
        ifsc: primary.ifsc || '',
        branch: primary.branch || '',
        qrCode: '',
        ledgerName: primary.type || ''
      };
    }
    return null;
  }

  // ── Row + tax maths (mirrors how the voucher was posted) ─────────
  function getInvoiceLineRows(inv) {
    return (inv.rows || []).map(r => {
      const qty = parseFloat(r.qty) || 0;
      const rate = parseFloat(r.rate) || 0;
      const isServiceRow = (inv.type === 'Service' && (parseFloat(r.baseAmount) || 0) > 0 && qty === 0);
      const base = isServiceRow ? (parseFloat(r.baseAmount) || 0) : (qty * rate);
      const discount = parseFloat(r.discount) || 0;
      const discAmt = r.discountType === 'pct' ? (base * (discount / 100)) : discount;
      const taxable = Math.max(0, base - discAmt);
      const taxPct = parseFloat(r.tax) || 0;
      const taxAmt = taxable * (taxPct / 100);

      let name = r.item || '';
      if (!name && r.revenueLedgerId) {
        const ledger = (typeof coaLedgers !== 'undefined' ? coaLedgers : []).find(l => String(l.id) === String(r.revenueLedgerId));
        name = ledger ? ledger.name : 'Revenue';
      }

      return {
        name: name,
        hsn: r.hsn || '',
        qty: isServiceRow ? 1 : qty,
        unit: r.unit || (isServiceRow ? 'Job' : ''),
        rate: isServiceRow ? base : rate,
        discount: discount,
        discountType: r.discountType || 'val',
        discAmt: discAmt,
        taxable: taxable,
        taxPct: taxPct,
        taxAmt: taxAmt,
        total: taxable + taxAmt
      };
    });
  }

  function getInvoiceTaxMode(inv) {
    const supply = inv.salesSupplyType || 'Intra-State (CGST + SGST)';
    if (supply === 'Intra-State (CGST + SGST)' || supply === 'Deemed Export') return 'split';
    if (supply === 'Inter-State (IGST)' || supply === 'SEZ With Tax') return 'igst';
    return 'none';
  }

  // ── The printable sheet ──────────────────────────────────────────
  function renderSalesTaxInvoiceHTML(inv) {
    const co = getInvoiceCompany();
    const parties = getInvoiceParties(inv);
    let bank = getInvoiceBankDetails(inv);
    const rows = getInvoiceLineRows(inv);
    const taxMode = getInvoiceTaxMode(inv);
    const isReturn = !!inv.isReturn;
    const docTitle = isReturn ? 'Credit Note' : 'Tax Invoice';

    const subTotal = rows.reduce((s, r) => s + r.taxable, 0);
    const totalTax = rows.reduce((s, r) => s + r.taxAmt, 0);
    const totalDiscount = rows.reduce((s, r) => s + r.discAmt, 0);
    const adjustments = parseFloat(inv.adjustments) || 0;
    const tdsTcsAmount = parseFloat(inv.tdsTcsAmount) || 0;
    const grandTotal = parseFloat(inv.total) || (subTotal + totalTax + adjustments);
    const paidAmount = parseFloat(inv.paymentAmount) || 0;
    const balanceDue = Math.max(0, grandTotal - paidAmount);

    // One type scale shared by the company, Billed/Shipped To, bank and terms blocks
    // so every detail section reads at exactly the same size.
    const FS = {
      label: '10.5px',   // uppercase section captions
      body: '12.5px',    // detail lines
      name: '15px',      // party / block headline
      note: '11.5px'     // italic helper lines
    };

    let execName = '';
    if (inv.salesExecutiveId && typeof ohEmployees !== 'undefined' && Array.isArray(ohEmployees)) {
      const emp = ohEmployees.find(e => String(e.id) === String(inv.salesExecutiveId));
      if (emp) execName = emp.name;
    }

    const placeOfSupply = [parties.billed.state, parties.billed.country].filter(Boolean).join(', ')
      || co.state || '';

    // ── Company block ──
    const coLines = [];
    if (co.address) coLines.push(siEsc(co.address).replace(/\n/g, '<br>'));
    const coContact = [co.phone ? 'Phone: ' + siEsc(co.phone) : '', co.email ? siEsc(co.email) : ''].filter(Boolean).join(' &nbsp;·&nbsp; ');
    if (coContact) coLines.push(coContact);
    if (co.website) coLines.push(siEsc(co.website));

    const coReg = [];
    if (co.gstin) coReg.push(`GSTIN: <strong>${siEsc(co.gstin)}</strong>`);
    if (co.pan) coReg.push(`PAN: <strong>${siEsc(co.pan)}</strong>`);
    if (co.cin) coReg.push(`CIN: <strong>${siEsc(co.cin)}</strong>`);
    if (co.udyam) coReg.push(`Udyam: <strong>${siEsc(co.udyam)}</strong>`);
    if (co.iec) coReg.push(`IEC: <strong>${siEsc(co.iec)}</strong>`);

    // ── Party block ──
    const partyHtml = (p, label, note) => {
      const cityPin = [p.city, p.pincode].filter(Boolean).join(' - ');
      const stateCountry = [p.state, p.country].filter(Boolean).join(', ');
      return `
        <div style="flex:1; min-width:0; padding:12px 14px;">
          <div style="font-size:${FS.label}; font-weight:800; letter-spacing:.09em; text-transform:uppercase; color:#94a3b8; margin-bottom:6px;">${label}</div>
          <div style="font-size:${FS.name}; font-weight:800; color:#0f172a;">${siEsc(p.name) || '&mdash;'}</div>
          ${p.contactName ? `<div style="font-size:${FS.body}; color:#475569; font-weight:600; margin-top:3px;">${siEsc(p.contactName)}</div>` : ''}
          ${p.address ? `<div style="font-size:${FS.body}; color:#475569; margin-top:3px; line-height:1.5;">${siEsc(p.address).replace(/\n/g, '<br>')}</div>` : ''}
          ${cityPin ? `<div style="font-size:${FS.body}; color:#475569; line-height:1.5;">${siEsc(cityPin)}</div>` : ''}
          ${stateCountry ? `<div style="font-size:${FS.body}; color:#475569; line-height:1.5;">${siEsc(stateCountry)}</div>` : ''}
          ${p.phone ? `<div style="font-size:${FS.body}; color:#475569; margin-top:3px; line-height:1.5;">Phone: ${siEsc(p.phone)}</div>` : ''}
          ${p.email ? `<div style="font-size:${FS.body}; color:#475569; line-height:1.5;">${siEsc(p.email)}</div>` : ''}
          ${p.gstin ? `<div style="font-size:${FS.body}; color:#0f172a; margin-top:4px; line-height:1.5;">GSTIN: <strong style="font-family:monospace;">${siEsc(p.gstin)}</strong></div>` : ''}
          ${p.pan ? `<div style="font-size:${FS.body}; color:#0f172a; line-height:1.5;">PAN: <strong style="font-family:monospace;">${siEsc(p.pan)}</strong></div>` : ''}
          ${note ? `<div style="font-size:${FS.note}; color:#64748b; font-style:italic; margin-top:6px;">${note}</div>` : ''}
        </div>`;
    };

    const shippedParty = parties.shipped || parties.billed;
    const shippedNote = parties.isTemporary
      ? 'Delivery details entered on this voucher.'
      : '';

    // ── Items table ──
    const taxHeaders = taxMode === 'split'
      ? `<th class="si-nowrap" style="padding:6px; text-align:right;">CGST</th>
         <th class="si-nowrap" style="padding:6px; text-align:right;">SGST</th>`
      : (taxMode === 'igst' ? `<th class="si-nowrap" style="padding:6px; text-align:right;">IGST</th>` : '');

    const itemRowsHtml = rows.map((r, i) => {
      const discStr = r.discAmt > 0
        ? (r.discountType === 'pct' ? `${siNum(r.discount)}%` : `₹ ${siNum(r.discAmt)}`)
        : '&mdash;';
      const taxCells = taxMode === 'split'
        ? `<td class="si-nowrap" style="padding:5px 6px; text-align:right;">${r.taxPct ? siNum(r.taxAmt / 2) : '&mdash;'}</td>
           <td class="si-nowrap" style="padding:5px 6px; text-align:right;">${r.taxPct ? siNum(r.taxAmt / 2) : '&mdash;'}</td>`
        : (taxMode === 'igst'
          ? `<td class="si-nowrap" style="padding:5px 6px; text-align:right;">${r.taxPct ? siNum(r.taxAmt) : '&mdash;'}</td>`
          : '');
      return `
        <tr>
          <td class="si-nowrap" style="padding:5px 6px; text-align:center; color:#64748b;">${i + 1}</td>
          <td class="si-desc" style="padding:5px 6px; font-weight:600; color:#0f172a;">${siEsc(r.name)}</td>
          <td class="si-nowrap" style="padding:5px 6px; font-family:monospace; color:#475569;">${siEsc(r.hsn) || '&mdash;'}</td>
          <td class="si-nowrap" style="padding:5px 6px; text-align:right;">${r.qty}</td>
          <td class="si-nowrap" style="padding:5px 6px; text-align:center; text-transform:uppercase; color:#475569;">${siEsc(r.unit) || '&mdash;'}</td>
          <td class="si-nowrap" style="padding:5px 6px; text-align:right;">${siNum(r.rate)}</td>
          <td class="si-nowrap" style="padding:5px 6px; text-align:right; color:#475569;">${discStr}</td>
          ${taxCells}
          <td class="si-nowrap" style="padding:5px 6px; text-align:right; font-weight:700; color:#0f172a;">${siNum(r.total)}</td>
        </tr>`;
    }).join('');

    const colCount = 8 + (taxMode === 'split' ? 2 : (taxMode === 'igst' ? 1 : 0));

    // ── GST summary by rate ──
    const summary = {};
    rows.forEach(r => {
      if (!r.taxPct) return;
      if (!summary[r.taxPct]) summary[r.taxPct] = { taxable: 0, tax: 0 };
      summary[r.taxPct].taxable += r.taxable;
      summary[r.taxPct].tax += r.taxAmt;
    });
    const summaryRates = Object.keys(summary).sort((a, b) => parseFloat(a) - parseFloat(b));

    let gstSummaryHtml = '';
    if (summaryRates.length && taxMode !== 'none') {
      const summaryRows = summaryRates.map(pct => {
        const s = summary[pct];
        const cells = taxMode === 'split'
          ? `<td style="padding:5px 6px; text-align:right;">${(parseFloat(pct) / 2)}%</td>
             <td style="padding:5px 6px; text-align:right;">${siNum(s.tax / 2)}</td>
             <td style="padding:5px 6px; text-align:right;">${(parseFloat(pct) / 2)}%</td>
             <td style="padding:5px 6px; text-align:right;">${siNum(s.tax / 2)}</td>`
          : `<td style="padding:5px 6px; text-align:right;">${pct}%</td>
             <td style="padding:5px 6px; text-align:right;">${siNum(s.tax)}</td>`;
        return `
          <tr style="white-space:nowrap;">
            <td style="padding:5px 6px;">${pct}%</td>
            <td style="padding:5px 6px; text-align:right;">${siNum(s.taxable)}</td>
            ${cells}
            <td style="padding:5px 6px; text-align:right; font-weight:700;">${siNum(s.tax)}</td>
          </tr>`;
      }).join('');

      const headCells = taxMode === 'split'
        ? `<th style="padding:6px; text-align:right;">CGST Rate</th><th style="padding:6px; text-align:right;">CGST Amt</th>
           <th style="padding:6px; text-align:right;">SGST Rate</th><th style="padding:6px; text-align:right;">SGST Amt</th>`
        : `<th style="padding:6px; text-align:right;">IGST Rate</th><th style="padding:6px; text-align:right;">IGST Amt</th>`;

      gstSummaryHtml = `
        <div style="margin-top:14px;">
          <div style="font-size:9.5px; font-weight:800; letter-spacing:.09em; text-transform:uppercase; color:#94a3b8; margin-bottom:6px;">GST Summary</div>
          <table class="si-grid" style="width:100%; font-size:10.5px;">
            <thead>
              <tr style="background:#f8fafc; color:#64748b; font-weight:700; white-space:nowrap;">
                <th style="padding:6px; text-align:left;">GST %</th>
                <th style="padding:6px; text-align:right;">Taxable</th>
                ${headCells}
                <th style="padding:6px; text-align:right;">Total Tax</th>
              </tr>
            </thead>
            <tbody>${summaryRows}</tbody>
          </table>
        </div>`;
    }

    // ── Bank block ──
    // The bank card always prints, so the invoice keeps its column layout even when
    // no bank account has been set up yet.
    bank = bank || { bankName: '', accountHolder: '', accountNo: '', ifsc: '', branch: '', qrCode: '' };
    const bankHtml = `
      <div style="flex:1; min-width:0; border:1px solid #94a3b8; border-radius:8px; padding:10px 12px;">
        <div style="font-size:${FS.label}; font-weight:800; letter-spacing:.09em; text-transform:uppercase; color:#94a3b8; margin-bottom:6px;">Bank Details for Payment</div>
        <div style="display:flex; gap:12px; align-items:center;">
          <div style="flex:1; min-width:0; font-size:${FS.body}; color:#334155; line-height:1.55;">
            ${bank.bankName ? `<div><span style="color:#94a3b8;">Bank:</span> <strong>${siEsc(bank.bankName)}</strong></div>` : ''}
            ${bank.accountHolder ? `<div><span style="color:#94a3b8;">A/c Holder:</span> ${siEsc(bank.accountHolder)}</div>` : ''}
            ${bank.accountNo ? `<div><span style="color:#94a3b8;">A/c No.:</span> <strong style="font-family:monospace;">${siEsc(bank.accountNo)}</strong></div>` : ''}
            ${bank.ifsc ? `<div><span style="color:#94a3b8;">IFSC:</span> <strong style="font-family:monospace;">${siEsc(bank.ifsc)}</strong></div>` : ''}
            ${bank.branch ? `<div><span style="color:#94a3b8;">Branch:</span> ${siEsc(bank.branch)}</div>` : ''}
          </div>
          ${bank.qrCode ? `
          <div style="flex-shrink:0; text-align:center;">
            <img src="${siEsc(bank.qrCode)}" alt="Payment QR" style="width:104px;height:104px;object-fit:contain;border:1px solid #94a3b8;border-radius:8px;padding:4px;background:#fff;box-sizing:border-box;display:block;" />
            <div style="font-size:10px; font-weight:700; color:#64748b; margin-top:3px;">Scan to Pay</div>
          </div>` : ''}
        </div>
      </div>`;

    // Terms always print too — an invoice without notes still shows the column.
    const termsHtml = `
      <div style="flex:1 1 auto; min-width:0; border:1px solid #94a3b8; border-radius:8px; padding:12px 14px; min-height:172px; box-sizing:border-box;">
        <div style="font-size:${FS.label}; font-weight:800; letter-spacing:.09em; text-transform:uppercase; color:#94a3b8; margin-bottom:8px;">Terms &amp; Conditions</div>
        <div style="font-size:${FS.body}; color:#334155; line-height:1.9; white-space:pre-wrap;">${siEsc(inv.notes || '')}</div>
      </div>`;

    const totalsRow = (label, value, opts) => {
      const o = opts || {};
      return `
        <div style="display:flex; justify-content:space-between; gap:16px; font-size:${o.size || '11.5px'}; color:${o.color || '#334155'}; font-weight:${o.weight || 600}; padding:${o.pad || '3px 0'};${o.border ? ' border-top:1px solid #94a3b8; margin-top:4px; padding-top:6px;' : ''}">
          <span>${label}</span><span>${value}</span>
        </div>`;
    };

    return `
      <div id="${SALES_INVOICE_SHEET_ID}" style="background:#fff; color:#0f172a; font-family:Inter, system-ui, sans-serif; padding:26px 28px; box-sizing:border-box;">
        <style>
          /* One uniform grid for the line items and the GST summary: every cell — header
             cells included — draws the same line, so the frame never breaks.
             Columns size themselves to their content; only the description wraps. */
          #${SALES_INVOICE_SHEET_ID} .si-grid { border-collapse: collapse; table-layout: auto; }
          #${SALES_INVOICE_SHEET_ID} .si-grid th,
          #${SALES_INVOICE_SHEET_ID} .si-grid td { border: 1px solid #94a3b8; box-sizing: border-box; }
          /* Codes and figures stay on one line, whatever the column width */
          #${SALES_INVOICE_SHEET_ID} .si-grid .si-nowrap { white-space: nowrap; width: 1%; }
          #${SALES_INVOICE_SHEET_ID} .si-grid .si-desc { overflow-wrap: anywhere; }
        </style>
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; gap:20px; align-items:flex-start; border-bottom:2px solid #1d4ed8; padding-bottom:14px;">
          <div style="display:flex; gap:12px; align-items:flex-start; min-width:0;">
            ${getCompanyLogoHtml(co)}
            <div style="min-width:0;">
              <div style="font-size:19px; font-weight:800; color:#0f172a; letter-spacing:-.2px;">${siEsc(getInvoiceCompanyName(co))}</div>
              <div style="font-size:${FS.body}; color:#475569; margin-top:5px; line-height:1.55;">${coLines.join('<br>')}</div>
            </div>
          </div>
          <div style="text-align:right; flex-shrink:0;">
            <div style="font-size:22px; font-weight:900; text-transform:uppercase; letter-spacing:.04em; color:#1d4ed8;">${docTitle}</div>
            <div style="font-size:${FS.note}; color:#64748b; font-weight:600; margin-top:2px;">${isReturn ? 'Against Invoice ' + siEsc(inv.returnAgainstInvoice || '') : 'Original for Recipient'}</div>
            <div style="margin-top:8px; font-size:${FS.body}; color:#334155; line-height:1.7;">
              <div><span style="color:#94a3b8;">Invoice No.:</span> <strong>${siEsc(inv.invoiceNo)}</strong></div>
              <div><span style="color:#94a3b8;">Date:</span> <strong>${siEsc(siDate(inv.date))}</strong></div>
              ${inv.dueDate ? `<div><span style="color:#94a3b8;">Due Date:</span> <strong>${siEsc(siDate(inv.dueDate))}</strong></div>` : ''}
            </div>
          </div>
        </div>

        ${coReg.length ? `<div style="display:flex; flex-wrap:wrap; gap:8px 16px; font-size:${FS.body}; color:#475569; background:#f8fafc; border:1px solid #94a3b8; border-top:none; padding:8px 12px; border-radius:0 0 8px 8px;">${coReg.join('')}</div>` : ''}

        <!-- Parties -->
        <div style="display:flex; gap:0; border:1px solid #94a3b8; border-radius:8px; margin-top:14px; overflow:hidden;">
          ${partyHtml(parties.billed, 'Billed To (Recipient)', '')}
          <div style="width:1px; background:#94a3b8;"></div>
          ${partyHtml(shippedParty, 'Shipped To (Delivery)', shippedNote)}
        </div>

        <!-- Meta strip -->
        <div style="display:flex; flex-wrap:wrap; gap:22px; font-size:10.5px; color:#475569; margin-top:12px; padding:8px 12px; background:#f8fafc; border:1px solid #94a3b8; border-radius:8px;">
          <div><span style="color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:.06em;">Place of Supply:</span> <strong>${siEsc(placeOfSupply) || '&mdash;'}</strong></div>
          <div><span style="color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:.06em;">Supply Type:</span> <strong>${siEsc(inv.salesSupplyType || 'Intra-State (CGST + SGST)')}</strong></div>
          ${execName ? `<div><span style="color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:.06em;">Sales Executive:</span> <strong>${siEsc(execName)}</strong></div>` : ''}
          <div><span style="color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:.06em;">Payment:</span> <strong>${siEsc(inv.paymentStatus || 'Not Paid')}</strong></div>
        </div>

        <!-- Items -->
        <table class="si-grid" style="width:100%; font-size:10.5px; margin-top:14px;">
          <thead>
            <tr style="background:#1d4ed8; color:#fff; font-size:9px; text-transform:uppercase; letter-spacing:.04em; white-space:nowrap;">
              <th class="si-nowrap" style="padding:6px; text-align:left;">Sl No.</th>
              <th class="si-desc" style="padding:6px; text-align:left;">Item Description</th>
              <th class="si-nowrap" style="padding:6px; text-align:left;">HSN/SAC</th>
              <th class="si-nowrap" style="padding:6px; text-align:right;">Qty</th>
              <th class="si-nowrap" style="padding:6px; text-align:center;">Unit</th>
              <th class="si-nowrap" style="padding:6px; text-align:right;">Rate</th>
              <th class="si-nowrap" style="padding:6px; text-align:right;">Discount</th>
              ${taxHeaders}
              <th class="si-nowrap" style="padding:6px; text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemRowsHtml || `<tr><td colspan="${colCount}" style="padding:14px; text-align:center; color:#94a3b8;">No line items on this invoice.</td></tr>`}
          </tbody>
        </table>

        <!-- GST summary — full width -->
        ${gstSummaryHtml}

        <!-- Bank details + totals, side by side -->
        <div style="display:flex; gap:14px; margin-top:14px; align-items:stretch;">
          ${bankHtml}
          <div style="width:290px; flex-shrink:0; border:1px solid #94a3b8; border-radius:8px; padding:10px 12px; box-sizing:border-box; display:flex; flex-direction:column; justify-content:center;">
            ${totalsRow('Taxable Value', '₹ ' + siNum(subTotal))}
            ${totalDiscount > 0 ? totalsRow('Total Discount', '&minus; ₹ ' + siNum(totalDiscount)) : ''}
            ${taxMode === 'split' ? totalsRow('CGST', '₹ ' + siNum(totalTax / 2)) + totalsRow('SGST', '₹ ' + siNum(totalTax / 2)) : ''}
            ${taxMode === 'igst' ? totalsRow('IGST', '₹ ' + siNum(totalTax)) : ''}
            ${(inv.tdsTcsMode === 'TCS' && tdsTcsAmount) ? totalsRow('TCS @ ' + siNum(inv.tdsTcsRate) + '%', '₹ ' + siNum(tdsTcsAmount)) : ''}
            ${(inv.tdsTcsMode === 'TDS' && tdsTcsAmount) ? totalsRow('TDS @ ' + siNum(inv.tdsTcsRate) + '%', '&minus; ₹ ' + siNum(tdsTcsAmount)) : ''}
            ${adjustments !== 0 ? totalsRow('Round Off', '₹ ' + siNum(adjustments)) : ''}
          </div>
        </div>

        <!-- Two stacked columns: every card follows the one above it by the same 14px,
             and the last card in each column stretches so both columns end level. -->
        <div style="display:flex; gap:14px; margin-top:14px; align-items:stretch;">
          <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:14px;">
            <div style="flex:0 0 auto; padding:7px 12px; background:#f8fafc; border:1px solid #94a3b8; border-radius:8px; box-sizing:border-box;">
              <div style="color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:.06em; font-size:${FS.label};">Amount in Words</div>
              <div style="font-size:${FS.body}; color:#0f172a; font-weight:700; margin-top:2px; line-height:1.4;">${siEsc(siAmountInWords(grandTotal))}</div>
            </div>
            ${termsHtml}
          </div>
          <div style="width:290px; flex-shrink:0; display:flex; flex-direction:column; gap:14px;">
            <div style="flex:0 0 auto; border:1px solid #94a3b8; border-radius:8px; padding:10px 12px; box-sizing:border-box;">
              ${totalsRow('Total Amount Payable', '₹ ' + siNum(grandTotal), { size: '14px', weight: 800, color: '#0f172a', pad: '2px 0 6px' })}
              ${paidAmount > 0 ? totalsRow('Paid (' + siEsc(inv.paymentStatus) + ')', '₹ ' + siNum(paidAmount), { color: '#059669', border: true }) : ''}
              ${totalsRow('Balance Due', '₹ ' + siNum(balanceDue), { weight: 800, color: balanceDue > 0 ? '#dc2626' : '#059669', border: true })}
            </div>
            <div style="flex:1 1 auto; border:1px solid #94a3b8; border-radius:8px; padding:10px 12px; box-sizing:border-box; text-align:center; display:flex; flex-direction:column;">
              <div style="font-size:11px; font-weight:700; color:#0f172a;">For ${siEsc(getInvoiceCompanyName(co))}</div>
              <div style="flex:1 1 auto; min-height:46px;"></div>
              <div style="border-top:1px solid #94a3b8; padding-top:5px; font-size:10.5px; color:#475569; font-weight:600;">Authorised Signatory</div>
            </div>
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

  // ── Preview modal ────────────────────────────────────────────────
  function viewSalesTaxInvoice(id) {
    const list = (window.KYA_STORE && window.KYA_STORE.salesVouchers) || [];
    const inv = list.find(v => String(v.id) === String(id));
    if (!inv) {
      if (typeof showToast === 'function') showToast('Invoice not found.', 'warning');
      return;
    }

    const stale = document.getElementById('salesTaxInvoiceOverlay');
    if (stale) stale.remove();

    const overlay = document.createElement('div');
    overlay.className = 'inv-modal-overlay';
    overlay.id = 'salesTaxInvoiceOverlay';
    overlay.tabIndex = -1;

    overlay.innerHTML = `
      <style>
        @media print {
          body * { visibility: hidden !important; }
          #${SALES_INVOICE_SHEET_ID}, #${SALES_INVOICE_SHEET_ID} * { visibility: visible !important; }
          #${SALES_INVOICE_SHEET_ID} { position: absolute; left: 0; top: 0; width: 100%; padding: 0; margin: 0; }
          @page { size: A4; margin: 12mm; }
        }
      </style>
      <div class="inv-modal-card" style="padding:0; max-width:900px; width:94%;">
        <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 20px; border-bottom:1.5px solid var(--slate-100); background:var(--slate-50); border-radius:20px 20px 0 0;">
          <div style="font-weight:700; color:var(--slate-800);">${inv.isReturn ? 'Credit Note' : 'Tax Invoice'} &nbsp;·&nbsp; <span style="font-family:monospace; color:var(--blue-700);">${siEsc(inv.invoiceNo)}</span></div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button class="btn btn-secondary" id="btnSalesInvoicePrint" type="button" style="padding:7px 14px; height:34px; font-size:13px; display:flex; align-items:center; gap:6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              Print
            </button>
            <button class="btn btn-secondary" id="btnSalesInvoicePdf" type="button" style="padding:7px 14px; height:34px; font-size:13px;">PDF</button>
            <button class="btn btn-danger" id="btnSalesInvoiceClose" type="button" style="padding:7px 14px; height:34px; font-size:13px;">Close</button>
          </div>
        </div>
        <div style="max-height:78vh; overflow-y:auto; background:#f1f5f9; padding:16px;">
          <div style="max-width:820px; margin:0 auto; box-shadow:0 6px 24px rgba(15,23,42,.12); border-radius:6px; overflow:hidden;">
            ${renderSalesTaxInvoiceHTML(inv)}
          </div>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    overlay.focus();

    const closeBtn = overlay.querySelector('#btnSalesInvoiceClose');
    if (closeBtn) closeBtn.addEventListener('click', () => overlay.remove());

    const printBtn = overlay.querySelector('#btnSalesInvoicePrint');
    if (printBtn) printBtn.addEventListener('click', () => window.print());

    const pdfBtn = overlay.querySelector('#btnSalesInvoicePdf');
    if (pdfBtn) {
      pdfBtn.addEventListener('click', async () => {
        if (typeof window.exportInvoiceToPDF === 'function') {
          await window.exportInvoiceToPDF(inv);
        } else {
          window.print();
        }
      });
    }

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.addEventListener('keydown', e => { if (e.key === 'Escape') overlay.remove(); });
  }

  window.renderSalesTaxInvoiceHTML = renderSalesTaxInvoiceHTML;
  window.viewSalesTaxInvoice = viewSalesTaxInvoice;
  window.getInvoiceCompany = getInvoiceCompany;
  window.getInvoiceBankDetails = getInvoiceBankDetails;
  window.siAmountInWords = siAmountInWords;
