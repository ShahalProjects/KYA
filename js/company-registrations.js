/**
 * js/company-registrations.js
 * Company Profile & Vault → Legal & Registration and Tax & Compliance, as per law:
 *  - CIN (Companies Act 2013): 21 characters — L or U (listed or unlisted), the 5-digit industry
 *    code, the State, the year of incorporation, the class (PTC private, PLC public, OPC one
 *    person …) and the 6-digit registration number. A company prints it on its bills and letters
 *    (Section 12(3)(c)). An LLP's LLPIN (LLP Act 2008) is AAA-1234 and goes on its invoices
 *    (Section 21).
 *  - Udyam Registration Number (MSMED Act 2006; Notification S.O. 2119(E), 2020):
 *    UDYAM-<State>-<district>-<7 digits>, with the enterprise's class: Micro, Small or Medium
 *    (Section 7). A buyer pays a micro or small enterprise within 45 days (Section 15), or owes
 *    compound interest at three times the bank rate (Section 16) and can't deduct the expense
 *    until it pays (Section 43B(h), Income-tax Act): sales documents print the number and class.
 *  - IEC (Foreign Trade (Development and Regulation) Act 1992, Section 7): 10 characters.
 *  - TAN (Section 203A, Income-tax Act 1961): four letters, five digits and a letter; the 4th
 *    letter is the first letter of the deductor's name. A tax deductor's GSTIN carries it.
 *  - EPF establishment code (EPF & MP Act 1952): two and three letters, then 10 digits. ESIC
 *    employer code (ESI Act 1948): 17 digits.
 * A change of either tab is confirmed and applied in Company Profile (company-profile.js), with
 * registrationsChangeNotes / complianceChangeNotes saying what it means.
 */
(function() {
  'use strict';

  const str = v => String(v === undefined || v === null ? '' : v).trim();
  const up = v => str(v).toUpperCase();

  const FORMS = {
    cin: /^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/,
    llpin: /^[A-Z]{3}-\d{4}$/,
    udyam: /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/,
    iec: /^[A-Z0-9]{10}$/,
    tan: /^[A-Z]{4}\d{5}[A-Z]$/,
    epf: /^[A-Z]{5}\d{10}$/,
    esic: /^\d{17}$/
  };

  // The class a company's CIN carries for its Business Type (its 13th to 15th characters)
  const CIN_CLASSES = { 'Pvt Ltd': 'PTC', 'Public Ltd': 'PLC', 'OPC': 'OPC' };
  const COMPANY_TYPES = Object.keys(CIN_CLASSES);

  const MSME_TYPES = { micro: 'Micro', small: 'Small', medium: 'Medium' };

  // The TAN in a tax deductor's GSTIN (its 3rd to 12th characters)
  function tanInGstin(ctx) {
    const info = typeof kyaGstRegTypeInfo === 'function' ? kyaGstRegTypeInfo(ctx.gstRegType) : null;
    if (!ctx.registered || !info || info.gstin !== 'tan' || typeof kyaCheckGstin !== 'function') return '';
    const gstin = up(ctx.gstin);
    return kyaCheckGstin(gstin, ctx.gstRegType).ok ? gstin.slice(2, 12) : '';
  }

  // A registration number against its form and the profile as entered (kind: cin, llpin,
  // udyam, iec, tan, epf, esic; ctx: businessType, incDate, name, registered, gstin, gstRegType)
  function checkRegistration(kind, raw, ctx) {
    const v = up(raw);
    const c = ctx || {};
    if (!FORMS[kind] || !FORMS[kind].test(v)) return false;
    if (kind === 'cin') {
      // its class fits the Business Type, its year the Date of Incorporation
      const want = CIN_CLASSES[c.businessType], cls = v.slice(12, 15);
      if (want && COMPANY_TYPES.some(t => CIN_CLASSES[t] === cls) && cls !== want) return false;
      const inc = /^(\d{4})-/.exec(str(c.incDate));
      return !inc || inc[1] === v.slice(8, 12);
    }
    if (kind === 'tan') {
      // its 4th letter is the first of the deductor's name (not checked for a proprietor), and a
      // tax deductor's GSTIN carries it
      const letters = c.businessType !== 'Proprietorship' && typeof kyaNameLetters === 'function' ? kyaNameLetters(c.name) : [];
      if (letters.length && letters.indexOf(v.charAt(3)) < 0) return false;
      const inGstin = tanInGstin(c);
      return !inGstin || inGstin === v;
    }
    return true;
  }

  // The Udyam line sales documents print under the address ('' without a Udyam number)
  function companyUdyamLine(co) {
    const c = co || {};
    const no = up(c.udyam);
    if (!FORMS.udyam.test(no)) return '';
    return `Udyam: ${no}${MSME_TYPES[c.msmeType] ? ` (${MSME_TYPES[c.msmeType]})` : ''}`;
  }

  const show = v => str(v) || '—';
  const savedDocsCount = () => (typeof kyaSavedDocsCount === 'function' ? kyaSavedDocsCount() : 0);

  // What saving Legal & Registration changes (prev / next: the company details before and
  // after): the fields that change (from → to), what KYA does from then on, and what the law asks
  // for it. No changes: nothing to confirm.
  function registrationsChangeNotes(prev, next) {
    const changes = [], kya = [], law = [];
    const changed = k => up(prev[k]) !== up(next[k]);
    const isCompany = COMPANY_TYPES.indexOf(next.businessType) > -1;
    const isLlp = next.businessType === 'LLP';
    const regLabel = isLlp ? 'LLPIN' : 'CIN';
    const regChanged = (isCompany || isLlp) && changed('cin');
    const msmeOf = co => (str(co.udyam) && MSME_TYPES[co.msmeType]) || '';
    const msmeChanged = msmeOf(prev) !== msmeOf(next);
    if (regChanged) changes.push({ label: regLabel, from: show(prev.cin), to: show(next.cin) });
    if (changed('udyam')) changes.push({ label: 'Udyam Registration Number', from: show(prev.udyam), to: show(next.udyam) });
    if (msmeChanged && msmeOf(next)) changes.push({ label: 'MSME Type', from: msmeOf(prev) || '—', to: msmeOf(next) });
    if (changed('iec')) changes.push({ label: 'Import Export Code (IEC)', from: show(prev.iec), to: show(next.iec) });
    if (changed('tradeLicense')) changes.push({ label: 'Trade License Number', from: show(prev.tradeLicense), to: show(next.tradeLicense) });
    const keeps = (regChanged || changed('udyam') || msmeChanged) && !!str(prev.name) && savedDocsCount() > 0;
    if (!changes.length) return { changes, kya, law, keeps };

    // In KYA, from now on
    if (regChanged) kya.push(str(next.cin) ? `New documents print "${regLabel}: ${up(next.cin)}" under the address.` : `New documents print no ${regLabel}.`);
    if (changed('udyam') || msmeChanged) kya.push(companyUdyamLine(next) ? `New sales documents print "${companyUdyamLine(next)}" under the address.` : 'New sales documents print no Udyam number.');
    if (keeps) kya.push('Documents already saved keep what they were made with.');

    // As per law
    if (regChanged && str(next.cin)) law.push(isLlp
      ? "An LLP's invoices and letters carry its LLPIN (Section 21, LLP Act 2008)."
      : 'A company prints its CIN on its bills, letters and notices (Section 12(3)(c), Companies Act 2013); a new CIN comes with a change of class, e.g. a private company becoming public (Sections 14 and 18).');
    if ((changed('udyam') || msmeChanged) && str(next.udyam)) law.push(next.msmeType === 'medium'
      ? 'The 45-day payment rule covers micro and small enterprises only (Sections 2(n) and 15, MSMED Act 2006), not a medium one.'
      : "A buyer pays a micro or small enterprise within the agreed time, at most 45 days (Section 15, MSMED Act 2006); late, it owes compound interest at three times the bank rate (Section 16) and can't deduct the expense until it pays (Section 43B(h), Income-tax Act 1961).");
    if (changed('iec') && str(next.iec)) law.push('Imports and exports need an IEC (Section 7, Foreign Trade (Development and Regulation) Act 1992); update it on the DGFT portal every year between April and June, or it is de-activated (Foreign Trade Policy).');
    return { changes, kya, law, keeps };
  }

  // What saving Tax & Compliance changes: the fields that change and what the law asks for them
  function complianceChangeNotes(prev, next) {
    const changes = [], law = [];
    [['tan', 'TAN'], ['profTax', 'Professional Tax Number'], ['epfCode', 'EPF Establishment Code'],
      ['esicCode', 'ESIC Employer Code'], ['shopLicense', 'Shop & Establishment License Number']].forEach(([k, label]) => {
      if (up(prev[k]) !== up(next[k])) changes.push({ label, from: show(prev[k]), to: show(next[k]) });
    });
    if (!changes.length) return { changes, kya: [], law, keeps: false };
    const set = k => up(prev[k]) !== up(next[k]) && !!str(next[k]);
    if (set('tan')) law.push('Quote the TAN in every TDS and TCS return, challan and certificate (Section 203A(2), Income-tax Act 1961); not doing so invites a penalty of ₹10,000 (Section 272BB).');
    if (set('profTax')) law.push("Professional tax is a State levy of at most ₹2,500 a year a person (Article 276(2), Constitution of India), paid as your State's Act requires.");
    if (set('epfCode')) law.push('File the ECR and pay the EPF contributions by the 15th of the next month (Paragraph 38, EPF Scheme 1952).');
    if (set('esicCode')) law.push('Pay the ESI contributions by the 15th of the next month (Regulation 31, ESI (General) Regulations 1950).');
    if (set('shopLicense')) law.push("Display the registration at the establishment and renew it as your State's Shops and Establishments Act requires.");
    return { changes, kya: [], law, keeps: false };
  }

  window.KYA_MSME_TYPES = MSME_TYPES;
  window.kyaCheckRegistration = checkRegistration;
  window.kyaCompanyUdyamLine = companyUdyamLine;
  window.kyaRegistrationsChangeNotes = registrationsChangeNotes;
  window.kyaComplianceChangeNotes = complianceChangeNotes;
})();
