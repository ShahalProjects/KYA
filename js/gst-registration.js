/**
 * js/gst-registration.js
 * The company's GST registration (Company Profile & Vault → GST Registration) and what it
 * means for the documents, as per GST law:
 *  - Unregistered: no GST is charged on sales (Section 32, CGST Act 2017) and no input tax
 *    credit is taken (Section 16); the sales invoice is a plain "Invoice", without a GSTIN.
 *  - Composition (Section 10(1) / 10(2A)): no tax is collected on sales and no input tax credit
 *    is taken (Section 10(4)); the sale is billed on a Bill of Supply with "Composition taxable
 *    person, not eligible to collect tax on supplies" at the top (Rule 5(1)(g), CGST Rules 2017).
 *    It sells within the State only (Section 10(2)(c) / 10(2A)(b)), so the Supply Type offers
 *    only the intra-State choices.
 *  - SEZ unit / developer: every supply to or by it is inter-State (Section 7(5)(b), IGST Act
 *    2017), so the Supply Type offers only the inter-State choices.
 *  - The GSTIN's first two digits are the State of registration, which decides CGST + SGST or
 *    IGST; GSTR-1 is filed monthly or quarterly (QRMP) by the types that file it.
 * A company that hasn't saved the tab yet is Unregistered, unless it already has a GSTIN (typed
 * before, e.g. in the first Company Details popup): that one counts as Registered, Regular,
 * Monthly. A document
 * keeps the registration it was made under (doc.gstReg: status, type and GSTIN); one saved
 * before then was made as Registered, Regular. A change of registration is confirmed and applied
 * in Company Profile (company-profile.js), with gstRegChangeNotes saying what it means.
 */
(function() {
  'use strict';

  // Registration types as per GST law. composition: no tax on sales, no input tax credit;
  // sez: inter-State supplies only; gstr1: files GSTR-1; gstin: the form its GSTIN takes
  // (see GSTIN_FORMS). what / law / example: the type's card in Company Profile's Registration
  // Type list (the Supply Type card, sales-select-boxes.js).
  const KYA_GST_REG_TYPES = [
    {
      type: 'Regular', gstr1: true, gstin: 'pan',
      what: `A normal registered taxpayer: charges GST on a tax invoice, takes input tax credit on purchases, and files GSTR-1 (monthly, or quarterly under QRMP) and GSTR-3B. Registration is needed once aggregate turnover crosses ₹20 lakh (₹10 lakh in some special category States), or ₹40 lakh for a supplier of goods only in most States, and in the cases listed in Section 24, such as inter-State supplies of goods.`,
      law: `Sections 22, 24 and 25, CGST Act 2017; goods-only threshold: Notification 10/2019–Central Tax. Tax invoice: Section 31; input tax credit: Section 16; returns: GSTR-1 (Section 37) and GSTR-3B (Section 39). Quarterly GSTR-1 (QRMP) up to ₹5 crore aggregate turnover: Rule 61A, CGST Rules 2017 and Notification 84/2020–Central Tax.`,
      example: `A Kochi electronics shop with ₹3 crore turnover charges 18% GST on its invoices, takes credit for the GST on its purchases, and files GSTR-1 and GSTR-3B every quarter under QRMP, paying its tax monthly.`
    },
    {
      type: 'Composition', composition: true, gstin: 'pan',
      what: `An optional scheme for small manufacturers, traders and restaurants with aggregate turnover up to ₹1.5 crore (₹75 lakh in some special category States). Tax is paid on turnover at a flat rate — 1% for manufacturers and traders, 5% for restaurants — and is not collected from customers: sales are billed on a Bill of Supply and no input tax credit is taken. Sales must stay within the State. Returns: CMP-08 every quarter and GSTR-4 once a year.`,
      law: `Section 10(1), 10(2) and 10(4), CGST Act 2017; turnover limit: Notification 14/2019–Central Tax; rates: Rule 7 and conditions: Rule 5, CGST Rules 2017, with "Composition taxable person, not eligible to collect tax on supplies" at the top of the bill of supply (Rule 5(1)(g)); bill of supply: Section 31(3)(c); returns: CMP-08 and GSTR-4, Rule 62.`,
      example: `A Thrissur hardware shop with ₹90 lakh turnover bills its customers on a Bill of Supply without GST, and each quarter pays 1% of its turnover (0.5% CGST + 0.5% SGST) through CMP-08.`
    },
    {
      type: 'Composition (Services)', composition: true, gstin: 'pan',
      what: `An optional scheme for suppliers of services (or of both goods and services) who can't use the regular composition scheme, with aggregate turnover up to ₹50 lakh in the previous year. Tax is paid at 6% of turnover (3% CGST + 3% SGST) and is not collected from customers: sales are billed on a Bill of Supply and no input tax credit is taken. Supplies must stay within the State. Returns: CMP-08 every quarter and GSTR-4 once a year.`,
      law: `Section 10(2A) and 10(4), CGST Act 2017 (the 6% scheme began under Notification 2/2019–Central Tax (Rate)); bill of supply: Section 31(3)(c), with "Composition taxable person, not eligible to collect tax on supplies" at the top (Rule 5(1)(g), CGST Rules 2017); returns: CMP-08 and GSTR-4, Rule 62.`,
      example: `A Kochi coaching centre with ₹35 lakh turnover bills students on a Bill of Supply without GST, and each quarter pays 6% of its turnover (3% CGST + 3% SGST) through CMP-08.`
    },
    {
      type: 'Casual Taxable Person', gstr1: true, gstin: 'pan',
      what: `Someone who occasionally makes taxable supplies in a State or Union Territory where they have no fixed place of business, e.g. at a trade fair or exhibition. Registration is compulsory whatever the turnover, lasts up to 90 days (extendable by 90 more) and needs an advance deposit of the estimated tax. Charges GST on tax invoices and files GSTR-1 and GSTR-3B.`,
      law: `Section 2(20) (casual taxable person), Section 24(ii) (compulsory registration) and Section 27 (90-day validity and advance deposit of tax), CGST Act 2017.`,
      example: `A Jaipur handicrafts seller with no place of business in Kerala takes casual registration for a ten-day trade fair in Kochi, deposits the estimated GST in advance and bills buyers with GST.`
    },
    {
      type: 'Non-Resident Taxable Person', gstin: 'other',
      what: `A person with no fixed place of business or residence in India who occasionally makes taxable supplies here. Registration is compulsory, granted on a valid passport (or the foreign entity's tax ID), lasts up to 90 days (extendable) and needs an advance deposit of the estimated tax. Files GSTR-5 instead of GSTR-1 and GSTR-3B.`,
      law: `Section 2(77) (non-resident taxable person), Section 24(v) and Section 27, CGST Act 2017; registration: Rule 13, CGST Rules 2017 (FORM GST REG-09); return: GSTR-5, Section 39(5) and Rule 63.`,
      example: `A Dubai company with no office in India brings machines to sell at an expo in Mumbai, registers as a non-resident taxable person for the expo and files GSTR-5.`
    },
    {
      type: 'Input Service Distributor', gstin: 'pan',
      what: `An office of a business that receives tax invoices for input services used by its branches under other GSTINs, and passes the input tax credit on to them through ISD invoices. It needs a registration of its own, compulsory from 01-04-2025 for distributing the credit of common input services. Files GSTR-6 every month instead of GSTR-1 and GSTR-3B.`,
      law: `Section 2(61), Section 20 and Section 24(viii), CGST Act 2017, as amended from 01-04-2025; distribution of credit: Rule 39, CGST Rules 2017; return: GSTR-6, Section 39(4) and Rule 65.`,
      example: `A Kochi head office pays ₹5,00,000 + GST for an audit covering its branches in Kerala and Tamil Nadu, and passes the GST credit to each branch's GSTIN through ISD invoices.`
    },
    {
      type: 'Tax Deductor (TDS)', gstin: 'tan',
      what: `A government department, local authority, government agency or other notified person that deducts TDS of 2% (1% CGST + 1% SGST, or 2% IGST) from payments to a supplier under a contract worth more than ₹2.5 lakh, on the value without GST. Its GSTIN is built on its TAN and carries a D. Files GSTR-7 every month.`,
      law: `Section 51 and Section 24(vi), CGST Act 2017; in force from 01-10-2018 (Notification 50/2018–Central Tax); return: GSTR-7, Rule 66, CGST Rules 2017; the supplier gets the TDS certificate GSTR-7A.`,
      example: `A PWD office in Kerala pays a contractor ₹10,00,000 + GST for road work. It deducts TDS of ₹20,000 (₹10,000 CGST + ₹10,000 SGST) on the ₹10,00,000 and reports it in GSTR-7.`
    },
    {
      type: 'Tax Collector (TCS) – E-commerce Operator', gstin: 'tcs',
      what: `An e-commerce operator that collects TCS on the net value of taxable supplies sellers make through its platform: 0.5% (0.25% CGST + 0.25% SGST, or 0.5% IGST) from 10-07-2024, 1% before. Registration is compulsory whatever the turnover; its GSTIN carries a C. Files GSTR-8 every month, and sellers take the TCS as cash in their ledger.`,
      law: `Section 52 and Section 24(x), CGST Act 2017; rate: Notification 52/2018–Central Tax, as amended by Notification 15/2024–Central Tax (from 10-07-2024); return: GSTR-8, Rule 67, CGST Rules 2017.`,
      example: `A seller sells goods worth ₹1,00,000 (before GST) through an online marketplace in its own State. The operator collects TCS of ₹500 (₹250 CGST + ₹250 SGST) and reports it in GSTR-8.`
    },
    {
      type: 'SEZ Unit', sez: true, gstr1: true, gstin: 'pan',
      what: `A unit in a Special Economic Zone, registered separately from the business's places outside the zone. Supplies to it are zero-rated, and every supply to or by it is inter-State, so IGST applies even within the same State. Goods it clears into the rest of India are taxed like imports, on a Bill of Entry. Files GSTR-1 and GSTR-3B.`,
      law: `Section 7(5)(b) (inter-State) and Section 16(1)(b) (zero-rated), IGST Act 2017; separate registration: Section 25(1), second proviso, CGST Act 2017; Special Economic Zones Act 2005.`,
      example: `An IT company's unit in the Cochin SEZ, Kakkanad, buys office chairs from a Kochi dealer under LUT without GST, and bills its services to a client in Kochi with 18% IGST, not CGST + SGST.`
    },
    {
      type: 'SEZ Developer', sez: true, gstr1: true, gstin: 'pan',
      what: `The developer that builds and runs a Special Economic Zone, registered separately. As for an SEZ unit, supplies to it are zero-rated and every supply to or by it is inter-State, so IGST applies even within the same State. Files GSTR-1 and GSTR-3B.`,
      law: `Section 7(5)(b) and Section 16(1)(b), IGST Act 2017; separate registration: Section 25(1), second proviso, CGST Act 2017; Special Economic Zones Act 2005.`,
      example: `The developer building an SEZ in Kakkanad buys cement from a Kochi supplier, who bills it under LUT without GST (or with IGST, refunded later).`
    },
    {
      type: 'OIDAR Service Provider', gstin: 'other',
      what: `A supplier outside India of online information and database access or retrieval (OIDAR) services, such as streaming, cloud storage, online advertising, e-books and software downloads, to people in India. It registers under a simplified scheme run by the Centre (GSTIN beginning 99) and pays IGST on supplies to customers who are not registered; registered business buyers pay it under reverse charge. Files GSTR-5A every month.`,
      law: `Section 2(17) (OIDAR services) and Section 14, IGST Act 2017, as amended from 01-10-2023; registration: Rule 14, CGST Rules 2017 (FORM GST REG-10); return: GSTR-5A, Rule 64.`,
      example: `A US streaming company with subscribers across India registers under the OIDAR scheme, charges 18% IGST on subscriptions sold to individuals and files GSTR-5A.`
    },
    {
      type: 'UN Body / Embassy (UIN)', gstin: 'other',
      what: `A specialised agency of the United Nations, a multilateral financial institution, a foreign consulate or embassy, or another notified person. It is given a Unique Identity Number (UIN) instead of a GSTIN, makes no taxable supplies, and claims back as a refund the GST paid on its purchases. Files GSTR-11 for the periods it claims.`,
      law: `Section 25(9), CGST Act 2017 and Rule 17, CGST Rules 2017 (Unique Identity Number); refund of tax paid on purchases: Section 55 and Rule 95; statement of purchases: GSTR-11, Rule 82.`,
      example: `A foreign consulate in Chennai buys office furniture worth ₹2,00,000 + GST from a Chennai dealer, who shows the consulate's UIN on the invoice; the consulate then claims the GST back.`
    }
  ];

  // GST State codes (the GSTIN's first two digits), named as in the State lists
  // (india-districts.js). 25 and 28 are the codes used before Daman and Diu merged (2020) and
  // Andhra Pradesh divided (2014).
  const GST_STATE_NAMES = {
    '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
    '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
    '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
    '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
    '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
    '25': 'Dadra and Nagar Haveli and Daman and Diu', '26': 'Dadra and Nagar Haveli and Daman and Diu',
    '27': 'Maharashtra', '28': 'Andhra Pradesh', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep',
    '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman and Nicobar Islands',
    '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh', '97': 'Other Territory',
    '99': 'Centre Jurisdiction'
  };

  // The form of a GSTIN: State code, then PAN (or TAN for a tax deductor), entity number, the
  // registration's letter (Z; C for an e-commerce operator collecting TCS, D for a tax
  // deductor) and the check character. Non-residents, OIDAR providers and UIN holders have
  // GSTINs of their own make-up: 15 characters after the State code check.
  const GSTIN_FORMS = {
    pan: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
    tcs: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]C[0-9A-Z]$/,
    tan: /^[0-9]{2}[A-Z]{4}[0-9]{5}[A-Z][1-9A-Z]D[0-9A-Z]$/,
    other: /^[0-9]{2}[0-9A-Z]{13}$/
  };

  const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  // The 15th character, worked out from the first 14 (mod 36)
  function gstinCheckChar(first14) {
    let factor = 2, sum = 0;
    for (let i = 13; i >= 0; i--) {
      let d = factor * GSTIN_CHARS.indexOf(first14[i]);
      d = Math.floor(d / 36) + (d % 36);
      sum += d;
      factor = factor === 2 ? 1 : 2;
    }
    return GSTIN_CHARS[(36 - (sum % 36)) % 36];
  }

  function typeInfo(type) {
    return KYA_GST_REG_TYPES.find(t => t.type === type) || KYA_GST_REG_TYPES[0];
  }

  // Whether a GSTIN is genuine, as far as can be told without the GST portal: the form the
  // registration type's GSTIN takes, a State code that exists and the check character.
  // Returns { ok, code, state, pan } — pan: the PAN inside it ('' for a TAN-based GSTIN).
  function checkGstin(gstin, type) {
    const raw = String(gstin || '').trim().toUpperCase();
    const form = typeInfo(type).gstin;
    const code = raw.slice(0, 2);
    const state = GST_STATE_NAMES[code] || '';
    const ok = GSTIN_FORMS[form].test(raw) && !!state && raw[14] === gstinCheckChar(raw.slice(0, 14));
    return { ok, code, state, pan: ok && (form === 'pan' || form === 'tcs') ? raw.slice(2, 12) : '' };
  }

  function companyDetails() {
    return (typeof getCompanyDetails === 'function') ? (getCompanyDetails() || {}) : {};
  }

  // The company's registration as saved in Company Profile & Vault. Not saved there yet: a new
  // company is unregistered until it gets a GSTIN, one with a GSTIN already is registered.
  function getCompanyGstReg(co) {
    const c = co || companyDetails();
    const registered = c.gstRegistered === undefined ? !!String(c.gstin || '').trim() : c.gstRegistered !== false;
    return {
      registered,
      type: registered ? typeInfo(c.gstRegType).type : '',
      gstin: registered ? String(c.gstin || '').trim().toUpperCase() : '',
      period: c.gstr1Period === 'quarterly' ? 'quarterly' : 'monthly'
    };
  }

  // What a registration ({ registered, type }) means for a document
  function gstRegRules(reg) {
    const r = reg || { registered: true, type: 'Regular' };
    const t = r.registered === false ? null : typeInfo(r.type);
    return {
      registered: !!t,
      composition: !!(t && t.composition),
      chargesGst: !!t && !t.composition,   // GST on sales
      claimsItc: !!t && !t.composition,    // input tax credit on purchases
      sez: !!(t && t.sez),
      gstr1: !!(t && t.gstr1)
    };
  }

  // The registration a document was made under: its own (status, type and the GSTIN it was
  // issued with), or Registered, Regular for one saved before the GST Registration tab existed
  function docGstReg(doc) {
    const g = doc && doc.gstReg;
    if (!g || typeof g !== 'object') return { registered: true, type: 'Regular', gstin: '' };
    return g.registered === false
      ? { registered: false, type: '', gstin: '' }
      : { registered: true, type: typeInfo(g.type).type, gstin: String(g.gstin || '').trim().toUpperCase() };
  }

  // For a document being made or edited: a stored one keeps its own, a new one takes the
  // company's as it stands
  function gstRegFor(storedDoc) {
    if (storedDoc) return docGstReg(storedDoc);
    const c = getCompanyGstReg();
    return { registered: c.registered, type: c.type, gstin: c.gstin };
  }

  // The sales document's title: Tax Invoice (Section 31), Bill of Supply for a composition
  // dealer (Section 31(3)(c)), a plain Invoice when not registered
  function salesInvoiceTitle(reg, isReturn) {
    if (isReturn) return 'Credit Note';
    const rules = gstRegRules(reg);
    if (!rules.registered) return 'Invoice';
    return rules.composition ? 'Bill of Supply' : 'Tax Invoice';
  }

  const COMPOSITION_DECLARATION = 'Composition taxable person, not eligible to collect tax on supplies';

  // The company's State for GST: the State of registration (from a genuine GSTIN), else the
  // State in Basic Identity
  function companyGstState(co) {
    const c = co || companyDetails();
    const reg = getCompanyGstReg(c);
    if (reg.registered) {
      const chk = checkGstin(reg.gstin, reg.type);
      if (chk.ok) return chk.state;
    }
    return c.state || '';
  }

  // The GSTIN a document prints: the one it was issued with, else the company's
  function docGstin(doc, co) {
    return docGstReg(doc).gstin || String((co || companyDetails()).gstin || '').trim().toUpperCase();
  }

  // A document's State for GST: its GSTIN's State, else the company's
  function docGstState(doc, co) {
    const reg = docGstReg(doc);
    const chk = reg.gstin ? checkGstin(reg.gstin, reg.type) : null;
    return chk && chk.ok ? chk.state : companyGstState(co);
  }

  // Before the GSTIN in force changes (or goes, on cancellation), every saved document without a
  // GSTIN of its own keeps the one it was issued with: an issued invoice carries the supplier's
  // GSTIN (Rule 46(a), CGST Rules 2017) and is not altered. Returns how many were marked.
  const DOC_STORES = ['salesVouchers', 'salesVouchersDrafts', 'quotations', 'proformaInvoices', 'salesOrders',
    'deliveryChallans', 'purchaseVouchers', 'purchaseVouchersDrafts'];

  function keepSavedDocsGstin(gstin) {
    const S = window.KYA_STORE || {};
    const g = String(gstin || '').trim().toUpperCase();
    let marked = 0;
    if (!g) return 0;
    DOC_STORES.forEach(key => (Array.isArray(S[key]) ? S[key] : []).forEach(doc => {
      if (!doc) return;
      const reg = docGstReg(doc);
      if (!reg.registered || reg.gstin) return;
      doc.gstReg = { registered: true, type: reg.type, gstin: g };
      marked++;
    }));
    return marked;
  }

  // What saving a new GST registration changes (prev / next: the company details before and
  // after): the fields that change (from → to), what KYA does from then on, and what the law asks
  // on the GST portal for that change. No changes: nothing to confirm.
  function gstRegChangeNotes(prev, next) {
    const a = getCompanyGstReg(prev), b = getCompanyGstReg(next);
    const ra = gstRegRules(a), rb = gstRegRules(b);
    const stateA = companyGstState(prev), stateB = companyGstState(next);
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    const changes = [], kya = [], law = [];

    if (a.registered !== b.registered) changes.push({ label: 'Registration Status', from: a.registered ? 'Registered' : 'Unregistered', to: b.registered ? 'Registered' : 'Unregistered' });
    if (b.registered && a.type !== b.type) changes.push({ label: 'Registration Type', from: a.type || '—', to: b.type });
    if (a.gstin !== b.gstin) changes.push({ label: 'GSTIN', from: a.gstin || '—', to: b.gstin || '—' });
    const periodChanged = rb.gstr1 && a.period !== b.period;
    if (periodChanged) changes.push({ label: 'GSTR-1 Filing Period', from: cap(a.period), to: cap(b.period) });
    if (!changes.length) return { changes, kya, law };

    // In KYA, from now on
    if (ra.registered !== rb.registered || ra.composition !== rb.composition) {
      if (!rb.registered) kya.push('New sales are titled "Invoice", without a GSTIN, and charge no GST: Tax is locked at 0% on Sales, Quotation, Proforma, Sales Order and Delivery Challan.');
      else if (rb.composition) kya.push('New sales are billed on a "Bill of Supply" with "Composition taxable person, not eligible to collect tax on supplies" at the top, charge no GST (Tax locked at 0%) and offer only intra-State supply types.');
      else kya.push('New sales are "Tax Invoices" charging GST, with every supply type offered.');
    }
    if (ra.claimsItc !== rb.claimsItc) kya.push(rb.claimsItc
      ? 'New purchases take input tax credit again (Input CGST / SGST / IGST).'
      : 'New purchases take no input tax credit: their GST is added to the purchase cost and to the stock value.');
    if (ra.sez !== rb.sez) kya.push(rb.sez
      ? 'New sales offer only inter-State supply types (IGST, export, SEZ).'
      : 'New sales offer every supply type again.');
    if (rb.registered && stateB && stateA !== stateB) kya.push(`New documents follow the State of the new GSTIN, ${stateB}, for CGST + SGST or IGST and the Place of Supply.`);
    if (periodChanged) kya.push(`Reports → GST opens on ${b.period} periods.`);
    kya.push(`Invoices, purchases and other documents already saved keep the registration${a.gstin && a.gstin !== b.gstin ? ` and GSTIN (${a.gstin})` : ''} they were made under, so reports of earlier periods don't change.`);

    // As per law, on the GST portal
    if (ra.registered && !rb.registered) law.push('Cancelling a registration: file the final return GSTR-10 within three months of the cancellation, paying back the input tax credit on stock, inputs and capital goods held the day before (or the tax on them, if higher) — Section 29(5) and Section 45, CGST Act; Rule 81, CGST Rules 2017.');
    if (!ra.registered && rb.registered) law.push('A new registration: claim input tax credit on stock held the day before through FORM GST ITC-01 within 30 days (Section 18(1)(a)/(b), Rule 40), and revise invoices issued from the effective date of registration within one month of the certificate (Section 31(3)(a), Rule 53).');
    if (ra.registered && rb.registered && ra.claimsItc && rb.composition) law.push('Opting for composition: file CMP-02 before the year starts (Rule 3), and pay back the input tax credit on stock, inputs and capital goods held the day before through FORM GST ITC-03 within 60 days (Section 18(4), Rule 44).');
    if (ra.registered && rb.registered && ra.composition && rb.claimsItc) law.push('Leaving composition: file CMP-04 (Rule 6), and claim input tax credit on stock, inputs and capital goods held the day before through FORM GST ITC-01 within 30 days (Section 18(1)(c), Rule 40).');
    if (periodChanged) law.push('Monthly or quarterly (QRMP) applies to a whole quarter: opt on the GST portal from the 1st day of the second month of the previous quarter to the last day of the first month of the quarter (Rule 61A, CGST Rules 2017).');
    if (ra.registered && rb.registered && a.gstin && b.gstin && a.gstin !== b.gstin) law.push('A GSTIN belongs to one registration in one State (Section 25, CGST Act): documents already issued stay under the old GSTIN.');
    return { changes, kya, law };
  }

  // The company details with the State for GST (the Quotation, Proforma, Sales Order and Pre
  // Purchase forms pick CGST + SGST or IGST by it)
  function getKyaCompanyProfile() {
    const co = companyDetails();
    return Object.assign({}, co, { state: companyGstState(co) });
  }

  // The Supply Type list (sel: the form's <select>) by registration. An SEZ unit / developer
  // supplies inter-State only: the CGST + SGST choices come off the list and IGST takes their
  // place. A composition dealer supplies intra-State only: the IGST, export and SEZ choices come
  // off and CGST + SGST takes their place. 'Deemed Export' alone is the CGST + SGST type saved
  // before the two choices existed.
  const INTRA_STATE_SUPPLIES = ['Intra-State (CGST + SGST)', 'Deemed Export (CGST + SGST)', 'Deemed Export'];
  const INTER_STATE_SUPPLIES = ['Inter-State (IGST)', 'Export (Zero-Rated / LUT)', 'SEZ With Tax', 'SEZ Without Tax', 'Deemed Export (IGST)'];

  function applyGstSupplyTypes(sel, reg) {
    if (!sel) return;
    const rules = gstRegRules(reg);
    Array.from(sel.options).forEach(o => {
      if (INTRA_STATE_SUPPLIES.indexOf(o.value) > -1) o.hidden = rules.sez;
      else if (INTER_STATE_SUPPLIES.indexOf(o.value) > -1) o.hidden = rules.composition;
    });
    if (rules.sez && INTRA_STATE_SUPPLIES.indexOf(sel.value) > -1) sel.value = 'Inter-State (IGST)';
    if (rules.composition && INTER_STATE_SUPPLIES.indexOf(sel.value) > -1) sel.value = 'Intra-State (CGST + SGST)';
  }

  window.KYA_GST_REG_TYPES = KYA_GST_REG_TYPES;
  window.KYA_GST_STATE_NAMES = GST_STATE_NAMES;
  window.KYA_COMPOSITION_DECLARATION = COMPOSITION_DECLARATION;
  window.kyaCheckGstin = checkGstin;
  window.kyaGstRegTypeInfo = typeInfo;
  window.kyaCompanyGstReg = getCompanyGstReg;
  window.kyaGstRegRules = gstRegRules;
  window.kyaDocGstReg = docGstReg;
  window.kyaGstRegFor = gstRegFor;
  window.kyaSalesInvoiceTitle = salesInvoiceTitle;
  window.kyaCompanyGstState = companyGstState;
  window.kyaDocGstin = docGstin;
  window.kyaDocGstState = docGstState;
  window.kyaKeepSavedDocsGstin = keepSavedDocsGstin;
  window.kyaGstRegChangeNotes = gstRegChangeNotes;
  window.getKyaCompanyProfile = getKyaCompanyProfile;
  window.kyaApplyGstSupplyTypes = applyGstSupplyTypes;
})();
