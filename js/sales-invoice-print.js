// ══════════════════════════════════════════════════════════════════
//  SALES INVOICE (TAX INVOICE) — printable GST invoice for a posted
//  sales voucher.
//
//  Data sources
//    • Company block ....... Company Profile & Vault → Basic Identity
//                            + Legal & Registration (logo, name, address,
//                            phone/email/web, GSTIN)
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

  function buildInvoiceSealSvg(name, shape) {
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const rawName = (name || 'COMPANY NAME').trim();
    const label = esc(rawName.toUpperCase());
    const ink = '#b91c1c';
    const labelLen = label.length;

    let fsTop = 15;
    let letterSpacing = '1.2';
    if (labelLen > 18) { fsTop = 13; letterSpacing = '0.8'; }
    if (labelLen > 24) { fsTop = 11; letterSpacing = '0.5'; }
    if (labelLen > 30) { fsTop = 9.5; letterSpacing = '0.2'; }

    if (shape === 'rectangle') {
      return `<svg viewBox="0 0 260 160" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="6" width="248" height="148" fill="none" stroke="${ink}" stroke-width="3.5"/>
        <rect x="13" y="13" width="234" height="134" fill="none" stroke="${ink}" stroke-width="1.2"/>
        <rect x="20" y="20" width="220" height="120" fill="none" stroke="${ink}" stroke-width="1.5"/>
        <text x="130" y="66" text-anchor="middle" font-family="'Arial Black', Arial, sans-serif" font-size="${fsTop}" font-weight="900" fill="${ink}">${label}</text>
        <line x1="46" y1="82" x2="214" y2="82" stroke="${ink}" stroke-width="1.2"/>
        <text x="130" y="98" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="900" fill="${ink}" letter-spacing="3">★ ★ ★</text>
        <line x1="46" y1="106" x2="214" y2="106" stroke="${ink}" stroke-width="1.2"/>
        <text x="130" y="132" text-anchor="middle" font-family="'Arial Black', Arial, sans-serif" font-size="11.5" font-weight="900" fill="${ink}" letter-spacing="1.8">AUTHORISED SIGNATORY</text>
      </svg>`;
    }

    // ROUND — top/bottom arc text share the same chord (left↔right through the ring
    // radius) so both halves stay concentric and upright.
    const cx = 100, cy = 100;
    const rText = 68;
    const leftX = cx - rText, rightX = cx + rText;
    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <defs>
        <path id="siSealTopWide" d="M ${leftX},${cy} A ${rText},${rText} 0 1 1 ${rightX},${cy}" fill="none"/>
        <path id="siSealBtmWide" d="M ${leftX},${cy} A ${rText},${rText} 0 1 0 ${rightX},${cy}" fill="none"/>
      </defs>
      <circle cx="${cx}" cy="${cy}" r="93" fill="none" stroke="${ink}" stroke-width="3.5"/>
      <circle cx="${cx}" cy="${cy}" r="87" fill="none" stroke="${ink}" stroke-width="1"/>
      <circle cx="${cx}" cy="${cy}" r="48" fill="none" stroke="${ink}" stroke-width="1.8"/>

      <text font-family="'Arial Black', Arial, sans-serif" font-size="${fsTop}" font-weight="900" fill="${ink}" letter-spacing="${letterSpacing}">
        <textPath href="#siSealTopWide" xlink:href="#siSealTopWide" startOffset="50%" text-anchor="middle">${label}</textPath>
      </text>

      <text x="24" y="104" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="900" fill="${ink}">★</text>
      <text x="176" y="104" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="900" fill="${ink}">★</text>

      <text font-family="'Arial Black', Arial, sans-serif" font-size="10.5" font-weight="900" fill="${ink}" letter-spacing="1.8">
        <textPath href="#siSealBtmWide" xlink:href="#siSealBtmWide" startOffset="50%" text-anchor="middle">AUTHORISED SIGNATORY</textPath>
      </text>

      <line x1="62" y1="88" x2="138" y2="88" stroke="${ink}" stroke-width="1.2"/>
      <text x="100" y="104" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="900" fill="${ink}" letter-spacing="3">★ ★ ★</text>
      <line x1="62" y1="112" x2="138" y2="112" stroke="${ink}" stroke-width="1.2"/>
    </svg>`;
  }

  function getInvoiceCompanySeal(co) {
    if (co.sealRemoved) return '';
    const shape = co.sealShape === 'square' ? 'rectangle' : (co.sealShape || 'round');
    const name = (co.sealName || co.name || co.displayName || '').trim();
    if (co.sealImage) {
      if (typeof co.sealImage === 'string' && co.sealImage.startsWith('data:image/svg+xml')) {
        try {
          const svg = buildInvoiceSealSvg(name, shape);
          return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
        } catch (e) {}
      }
      return co.sealImage;
    }
    if (!name) return '';
    const svg = buildInvoiceSealSvg(name, shape);
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  }

  function getInvoiceSignatoryHtml(co) {
    const seal = getInvoiceCompanySeal(co);
    const sign = co.signatureImage || '';

    if (!seal && !sign) {
      return '<div style="flex:1 1 auto; min-height:60px;"></div>';
    }

    return `
      <div style="flex:1 1 auto; min-height:122px; display:flex; align-items:center; justify-content:center; position:relative; padding:4px 0; box-sizing:border-box;">
        ${seal ? `
          <img src="${siEsc(seal)}" alt="Company Seal" style="max-height:120px; max-width:170px; object-fit:contain; opacity:0.9; -webkit-print-color-adjust:exact; print-color-adjust:exact; ${sign ? 'position:absolute; left:50%; top:50%; transform:translate(-50%, -50%); z-index:2; opacity:0.85;' : 'z-index:1;'}" />
        ` : ''}
        ${sign ? `
          <img src="${siEsc(sign)}" alt="Signature" style="max-height:55px; max-width:160px; object-fit:contain; position:relative; z-index:1; -webkit-print-color-adjust:exact; print-color-adjust:exact;" />
        ` : ''}
      </div>`;
  }

  // GST state codes (first two digits of a GSTIN), used to print the code with
  // the Place of Supply, e.g. "32 - Kerala".
  const GST_STATE_CODES = {
    'jammu and kashmir': '01', 'himachal pradesh': '02', 'punjab': '03', 'chandigarh': '04',
    'uttarakhand': '05', 'uttaranchal': '05', 'haryana': '06', 'delhi': '07', 'new delhi': '07',
    'nct of delhi': '07', 'rajasthan': '08', 'uttar pradesh': '09', 'bihar': '10', 'sikkim': '11',
    'arunachal pradesh': '12', 'nagaland': '13', 'manipur': '14', 'mizoram': '15', 'tripura': '16',
    'meghalaya': '17', 'assam': '18', 'west bengal': '19', 'jharkhand': '20', 'odisha': '21',
    'orissa': '21', 'chhattisgarh': '22', 'madhya pradesh': '23', 'gujarat': '24',
    'dadra and nagar haveli and daman and diu': '26', 'dadra and nagar haveli': '26',
    'daman and diu': '26', 'maharashtra': '27', 'karnataka': '29', 'goa': '30',
    'lakshadweep': '31', 'kerala': '32', 'tamil nadu': '33', 'puducherry': '34',
    'pondicherry': '34', 'andaman and nicobar islands': '35', 'andaman and nicobar': '35',
    'telangana': '36', 'andhra pradesh': '37', 'ladakh': '38', 'other territory': '97'
  };

  function getGstStateCode(state, country, gstin) {
    const c = String(country || '').trim().toLowerCase();
    if (c && c !== 'india' && c !== 'in' && c !== 'bharat') return '';
    const key = String(state || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (GST_STATE_CODES[key]) return GST_STATE_CODES[key];
    const fromGstin = String(gstin || '').trim().slice(0, 2);
    return /^\d{2}$/.test(fromGstin) ? fromGstin : '';
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

    const posFromParty = !!(parties.billed.state || parties.billed.country);
    const posState = posFromParty ? (parties.billed.state || '') : (co.state || '');
    const posCountry = posFromParty ? (parties.billed.country || '') : '';
    const posCode = posState ? getGstStateCode(posState, posCountry, posFromParty ? parties.billed.gstin : co.gstin) : '';
    const placeOfSupply = [posCode ? posCode + ' - ' + posState : posState, posCountry].filter(Boolean).join(', ');

    // ── Company block ──
    const coLines = [];
    if (co.address) coLines.push(siEsc(co.address).replace(/\n/g, '<br>'));
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
          ${p.gstin ? `<div style="font-size:${FS.body}; color:#0f172a; margin-top:4px; line-height:1.5;">GSTIN: ${siEsc(p.gstin)}</div>` : ''}
          ${p.pan ? `<div style="font-size:${FS.body}; color:#0f172a; line-height:1.5;">PAN: ${siEsc(p.pan)}</div>` : ''}
          ${note ? `<div style="font-size:${FS.note}; color:#64748b; font-style:italic; margin-top:6px;">${note}</div>` : ''}
        </div>`;
    };

    const shippedParty = parties.shipped || parties.billed;
    const shippedNote = parties.isTemporary
      ? 'Delivery details entered on this voucher.'
      : '';

    // ── Items table ──
    const taxHeaders = taxMode === 'split'
      ? `<th class="si-nowrap" style="padding:9px 8px; font-size:11.5px; font-weight:700; text-align:right; background-color:var(--blue-600,#2563eb); color:#ffffff; border:1px solid #1d4ed8;">CGST</th>
         <th class="si-nowrap" style="padding:9px 8px; font-size:11.5px; font-weight:700; text-align:right; background-color:var(--blue-600,#2563eb); color:#ffffff; border:1px solid #1d4ed8;">SGST</th>`
      : (taxMode === 'igst' ? `<th class="si-nowrap" style="padding:9px 8px; font-size:11.5px; font-weight:700; text-align:right; background-color:var(--blue-600,#2563eb); color:#ffffff; border:1px solid #1d4ed8;">IGST</th>` : '');

    const itemRowsHtml = rows.map((r, i) => {
      // The tax columns carry the rate only; the amounts are in the totals block.
      const halfPct = r.taxPct ? (Math.round((r.taxPct / 2) * 100) / 100) + '%' : '&mdash;';
      const fullPct = r.taxPct ? r.taxPct + '%' : '&mdash;';
      const taxCells = taxMode === 'split'
        ? `<td class="si-nowrap" style="padding:5px 6px; text-align:right;">${halfPct}</td>
           <td class="si-nowrap" style="padding:5px 6px; text-align:right;">${halfPct}</td>`
        : (taxMode === 'igst'
          ? `<td class="si-nowrap" style="padding:5px 6px; text-align:right;">${fullPct}</td>`
          : '');
      return `
        <tr>
          <td class="si-nowrap" style="padding:5px 6px; text-align:center; color:#64748b;">${i + 1}</td>
          <td class="si-desc" style="padding:5px 6px; color:#0f172a;">${siEsc(r.name)}</td>
          <td class="si-nowrap" style="padding:5px 6px; color:#475569;">${siEsc(r.hsn) || '&mdash;'}</td>
          <td class="si-nowrap" style="padding:5px 6px; text-align:right;">${r.qty}</td>
          <td class="si-nowrap" style="padding:5px 6px; text-align:center; text-transform:uppercase; color:#475569;">${siEsc(r.unit) || '&mdash;'}</td>
          <td class="si-nowrap" style="padding:5px 6px; text-align:right;">${siNum(r.rate)}</td>
          ${taxCells}
          <td class="si-nowrap" style="padding:5px 6px; text-align:right; color:#0f172a;">${siNum(r.total)}</td>
        </tr>`;
    }).join('');

    const colCount = 7 + (taxMode === 'split' ? 2 : (taxMode === 'igst' ? 1 : 0));

    // ── Bank block ──
    // The bank card always prints, so the invoice keeps its column layout even when
    // no bank account has been set up yet.
    bank = bank || { bankName: '', accountHolder: '', accountNo: '', ifsc: '', branch: '', qrCode: '' };
    // Due Date and Balance Due only mean something while money is still owed, so a fully
    // paid invoice prints the Paid line alone.
    const isFullyPaid = balanceDue <= 0.005;
    const payLines = [];
    if (inv.dueDate && !isFullyPaid) payLines.push(`<span style="color:#475569;">Due Date:</span> ${siEsc(siDate(inv.dueDate))}`);
    if (paidAmount > 0) payLines.push(`<span style="color:#475569;">Paid (${siEsc(inv.paymentStatus)}):</span> ₹ ${siNum(paidAmount)}`);
    if (!isFullyPaid) payLines.push(`<span style="color:#475569;">Balance Due:</span> ₹ ${siNum(balanceDue)}`);
    const payLinesHtml = payLines.map((line, i) => `<div${i === 0 ? ' style="margin-top:4px; padding-top:4px; border-top:1px dashed #94a3b8;"' : ''}>${line}</div>`).join('');

    const bankHtml = `
      <div style="flex:0 0 auto; min-width:0; border:1px solid #94a3b8; border-radius:8px; padding:10px 12px; background:#f8fafc; -webkit-print-color-adjust:exact; print-color-adjust:exact;">
        <div style="font-size:${FS.label}; font-weight:800; letter-spacing:.09em; text-transform:uppercase; color:#2563eb; margin-bottom:6px;">Bank Details for Payment</div>
        <div style="display:flex; gap:12px; align-items:flex-start;">
          <div style="flex:1; min-width:0; font-size:${FS.body}; color:#0f172a; line-height:1.55;">
            ${bank.bankName ? `<div><span style="color:#475569;">Bank:</span> ${siEsc(bank.bankName)}</div>` : ''}
            ${bank.accountHolder ? `<div><span style="color:#475569;">A/c Holder:</span> ${siEsc(bank.accountHolder)}</div>` : ''}
            ${bank.accountNo ? `<div><span style="color:#475569;">A/c No.:</span> ${siEsc(bank.accountNo)}</div>` : ''}
            ${bank.ifsc ? `<div><span style="color:#475569;">IFSC:</span> ${siEsc(bank.ifsc)}</div>` : ''}
            ${bank.branch ? `<div><span style="color:#475569;">Branch:</span> ${siEsc(bank.branch)}</div>` : ''}
            ${payLinesHtml}
          </div>
          ${bank.qrCode ? `
          <div style="flex-shrink:0; text-align:center;">
            <img src="${siEsc(bank.qrCode)}" alt="Payment QR" style="width:88px;height:88px;object-fit:contain;border:1px solid #bfdbfe;border-radius:8px;padding:4px;background:#fff;box-sizing:border-box;display:block;-webkit-print-color-adjust:exact;print-color-adjust:exact;" />
            <div style="font-size:9px; font-weight:800; letter-spacing:.09em; text-transform:uppercase; color:#2563eb; margin-top:5px; line-height:1.1;">Scan to Pay</div>
          </div>` : ''}
        </div>
      </div>`;

    // Terms always print too — an invoice without notes still shows the column.
    const termsHtml = `
      <div style="flex:1 1 auto; min-width:0; padding:6px 8px; box-sizing:border-box;">
        <div style="font-size:9.5px; font-weight:800; letter-spacing:.09em; text-transform:uppercase; color:#94a3b8; margin-bottom:5px;">Terms &amp; Conditions</div>
        <div style="font-size:11px; color:#334155; line-height:1.6; white-space:pre-wrap;">${siEsc(inv.notes || '')}</div>
      </div>`;

    // GST is listed per rate in the totals box — CGST 9% / SGST 9%, CGST 2.5% / SGST 2.5% …
    const gstByRate = {};
    rows.forEach(r => {
      if (!r.taxPct) return;
      gstByRate[r.taxPct] = (gstByRate[r.taxPct] || 0) + r.taxAmt;
    });
    const gstRates = Object.keys(gstByRate).sort((a, b) => parseFloat(a) - parseFloat(b));

    const totalsRow = (label, value, opts) => {
      const o = opts || {};
      return `
        <div style="display:flex; justify-content:space-between; gap:16px; font-size:${o.size || '11.5px'}; color:${o.color || '#334155'}; font-weight:${o.weight || 600}; padding:${o.pad || '3px 0'};${o.border ? ' border-top:1px solid #94a3b8; margin-top:4px; padding-top:6px;' : ''}">
          <span>${label}</span><span>${value}</span>
        </div>`;
    };

    const gstTotalsRows = gstRates.map(pct => {
      const amt = gstByRate[pct];
      const half = Math.round((parseFloat(pct) / 2) * 100) / 100;
      if (taxMode === 'split') {
        return totalsRow('CGST ' + half + '%', '₹ ' + siNum(amt / 2))
             + totalsRow('SGST ' + half + '%', '₹ ' + siNum(amt / 2));
      }
      if (taxMode === 'igst') return totalsRow('IGST ' + pct + '%', '₹ ' + siNum(amt));
      return totalsRow('GST ' + pct + '%', '₹ ' + siNum(amt));
    }).join('');

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
          #${SALES_INVOICE_SHEET_ID} .si-grid tbody td { background: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          /* Header row carries the KYA UI blue — the same blue-600 -> blue-700 gradient the
             app's primary buttons use. The flat colour stays as the fallback and
             print-color-adjust keeps the fill when the sheet goes to a printer. */
          #${SALES_INVOICE_SHEET_ID} .si-grid thead tr,
          #${SALES_INVOICE_SHEET_ID} .si-grid thead th {
            background: var(--blue-600, #2563eb) !important;
            background-color: #2563eb !important;
            background-image: none !important;
            color: #ffffff !important;
            border: 1px solid #1d4ed8 !important;
            font-size: 11.5px !important;
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
              ${placeOfSupply ? `<div><span style="color:#94a3b8;">Place of Supply:</span> <strong>${siEsc(placeOfSupply)}</strong></div>` : ''}
            </div>
          </div>
        </div>

        <!-- Parties -->
        <div style="display:flex; gap:10px; margin-top:10px; align-items:stretch;">
          ${partyHtml(parties.billed, 'Billed To (Recipient)', '')}
          ${partyHtml(shippedParty, 'Shipped To (Delivery)', shippedNote)}
        </div>

        <!-- Items -->
        <table class="si-grid" style="width:100%; font-size:10.5px; margin-top:10px;">
          <thead>
            <tr style="color:#fff; font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; white-space:nowrap; background-color:#2563eb;">
              <th class="si-nowrap" style="padding:9px 8px; font-size:11.5px; font-weight:700; text-align:left; background-color:var(--blue-600,#2563eb); color:#ffffff; border:1px solid #1d4ed8;">Sl No.</th>
              <th class="si-desc" style="padding:9px 8px; font-size:11.5px; font-weight:700; text-align:left; background-color:var(--blue-600,#2563eb); color:#ffffff; border:1px solid #1d4ed8;">Item Description</th>
              <th class="si-nowrap" style="padding:9px 8px; font-size:11.5px; font-weight:700; text-align:left; background-color:var(--blue-600,#2563eb); color:#ffffff; border:1px solid #1d4ed8;">HSN/SAC</th>
              <th class="si-nowrap" style="padding:9px 8px; font-size:11.5px; font-weight:700; text-align:right; background-color:var(--blue-600,#2563eb); color:#ffffff; border:1px solid #1d4ed8;">Qty</th>
              <th class="si-nowrap" style="padding:9px 8px; font-size:11.5px; font-weight:700; text-align:center; background-color:var(--blue-600,#2563eb); color:#ffffff; border:1px solid #1d4ed8;">Unit</th>
              <th class="si-nowrap" style="padding:9px 8px; font-size:11.5px; font-weight:700; text-align:right; background-color:var(--blue-600,#2563eb); color:#ffffff; border:1px solid #1d4ed8;">Rate</th>
              ${taxHeaders}
              <th class="si-nowrap" style="padding:9px 8px; font-size:11.5px; font-weight:700; text-align:right; background-color:var(--blue-600,#2563eb); color:#ffffff; border:1px solid #1d4ed8;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemRowsHtml || `<tr><td colspan="${colCount}" style="padding:14px; text-align:center; color:#94a3b8;">No line items on this invoice.</td></tr>`}
          </tbody>
        </table>

        <!-- One two-column grid. Every card is only as tall as its own content, the gaps are a
             uniform 10px, and just the last card in each column absorbs the leftover height so
             the two columns finish on the same line. -->
        <div style="display:flex; gap:10px; margin-top:10px; align-items:stretch;">
          <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:10px;">
            ${bankHtml}
            <div style="flex:0 0 auto; padding:7px 12px; background:#f8fafc; border-left:3.5px solid var(--blue-600, #2563eb); border-radius:0 6px 6px 0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact;">
              <div style="color:#2563eb; font-weight:700; text-transform:uppercase; letter-spacing:.06em; font-size:${FS.label};">Amount in Words</div>
              <div style="font-size:${FS.body}; color:#0f172a; font-weight:700; margin-top:2px; line-height:1.4;">${siEsc(siAmountInWords(grandTotal))}</div>
            </div>
            ${termsHtml}
          </div>
          <div style="width:290px; flex-shrink:0; display:flex; flex-direction:column; gap:10px;">
            <div style="flex:0 0 auto; padding:4px 12px; box-sizing:border-box;">
              ${totalsRow('Taxable Value', '₹ ' + siNum(subTotal))}
              ${totalDiscount > 0 ? totalsRow('Total Discount', '&minus; ₹ ' + siNum(totalDiscount)) : ''}
              ${gstTotalsRows ? `<div style="margin-top:4px; padding-top:4px; border-top:1px dashed #94a3b8;"></div>${gstTotalsRows}` : ''}
              ${(inv.tdsTcsMode === 'TCS' && tdsTcsAmount) ? totalsRow('TCS @ ' + siNum(inv.tdsTcsRate) + '%', '₹ ' + siNum(tdsTcsAmount)) : ''}
              ${(inv.tdsTcsMode === 'TDS' && tdsTcsAmount) ? totalsRow('TDS @ ' + siNum(inv.tdsTcsRate) + '%', '&minus; ₹ ' + siNum(tdsTcsAmount)) : ''}
              ${adjustments !== 0 ? `<div style="margin-top:4px; padding-top:4px; border-top:1px dashed #94a3b8;"></div>${totalsRow('Round Off', '₹ ' + siNum(adjustments))}` : ''}
            </div>
            <div style="flex:0 0 auto; background:var(--blue-600, #2563eb); border:1px solid #1d4ed8; border-radius:6px; padding:6px 12px; box-sizing:border-box; color:#ffffff; -webkit-print-color-adjust:exact; print-color-adjust:exact;">
              ${totalsRow('Total Amount Payable', '₹ ' + siNum(grandTotal), { size: '12px', weight: 700, color: '#ffffff', pad: '1px 0' })}
            </div>
            <div style="flex:1 1 auto; padding:8px 12px 0; box-sizing:border-box; text-align:center; display:flex; flex-direction:column; justify-content:space-between;">
              <div style="font-size:11px; font-weight:700; color:#0f172a;">For ${siEsc(getInvoiceCompanyName(co))}</div>
              ${getInvoiceSignatoryHtml(co)}
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
