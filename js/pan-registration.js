/**
 * js/pan-registration.js
 * The company's PAN (Company Profile & Vault → PAN) as per the Income-tax Act 1961:
 *  - A PAN is ten characters, five letters, four digits and a letter (Section 139A; Rule 114,
 *    Income-tax Rules 1962). Its 4th letter is the holder's status: C company, F firm or LLP,
 *    P individual, H HUF, A association of persons, T trust, B body of individuals, L local
 *    authority, J artificial juridical person, G government. For any holder but an individual,
 *    its 5th letter is the first letter of the holder's name (an individual's, of the surname).
 *  - The GSTIN is issued on the PAN and carries it as its 3rd to 12th characters (Section 25(6),
 *    CGST Act 2017).
 *  - An individual's PAN not linked with Aadhaar is inoperative (Section 139AA(2), Rule 114AAA):
 *    tax is deducted or collected at the higher rates (Section 206AA / 206CC) and no refund is
 *    paid until it is linked.
 *  - A person paid a sum from which tax is deducted gives the PAN to the deductor (Section
 *    139A(5A)), who otherwise deducts at 20% (Section 206AA): the documents print the PAN under
 *    the address, and a saved document keeps the PAN it was made with (company-identity.js).
 * A change of PAN is confirmed and applied in Company Profile (company-profile.js), with
 * panChangeNotes saying what it means.
 */
(function() {
  'use strict';

  const PAN_FORM = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

  // The holder's status: the PAN's 4th letter
  const PAN_HOLDERS = {
    C: 'Company', F: 'Firm / LLP', P: 'Individual', H: 'Hindu Undivided Family (HUF)',
    A: 'Association of Persons (AOP)', T: 'Trust', B: 'Body of Individuals (BOI)',
    L: 'Local Authority', J: 'Artificial Juridical Person', G: 'Government'
  };

  // The status each Business Type (Basic Identity) holds its PAN in: a proprietorship is its
  // proprietor's own PAN, an LLP is a firm for income tax (Section 2(23)), a society an AOP
  const TYPE_HOLDERS = {
    'Proprietorship': ['P'], 'Partnership': ['F'], 'LLP': ['F'],
    'Pvt Ltd': ['C'], 'Public Ltd': ['C'], 'OPC': ['C'], 'Trust': ['T', 'A']
  };

  const str = v => String(v === undefined || v === null ? '' : v).trim();
  const panOf = v => str(v).toUpperCase();
  const isIndividual = pan => pan.charAt(3) === 'P';

  // The PAN in the company's GSTIN (none for a GSTIN that isn't PAN-based)
  function gstinPan(ctx) {
    if (!ctx.registered || typeof kyaCheckGstin !== 'function') return '';
    const chk = kyaCheckGstin(str(ctx.gstin).toUpperCase(), ctx.gstRegType);
    return chk.ok ? (chk.pan || '') : '';
  }

  // The first letter of a name, a leading "The" or "M/s" left out
  function nameLetters(name) {
    const words = str(name).toUpperCase().split(/\s+/).filter(Boolean);
    const letter = w => (w.match(/[A-Z]/) || [''])[0];
    const out = words.length ? [letter(words[0])] : [];
    if (words.length > 1 && /^(THE|M\/S\.?|MESSRS\.?)$/.test(words[0])) out.unshift(letter(words[1]));
    return out.filter(Boolean);
  }

  // A PAN in the PAN's form with a holder status for its 4th letter
  const isPan = pan => PAN_FORM.test(pan) && !!PAN_HOLDERS[pan.charAt(3)];

  // A PAN against its form and the profile (ctx: businessType, name, registered, gstin,
  // gstRegType): ok only when nothing is wrong — its form, a holder status for its 4th letter,
  // the status the Business Type holds its PAN in, a non-individual's 5th letter (the first of
  // the name) and the PAN in the GSTIN. code / holder: its 4th letter's status, when it is one.
  function checkPan(raw, ctx) {
    const pan = panOf(raw);
    const c = ctx || {};
    const code = PAN_FORM.test(pan) ? pan.charAt(3) : '';
    const holder = PAN_HOLDERS[code] || '';
    if (!holder) return { ok: false, code, holder };
    const fit = TYPE_HOLDERS[c.businessType];
    const letters = nameLetters(c.name);
    const inGstin = gstinPan(c);
    const ok = (!fit || fit.indexOf(code) > -1)
      && (isIndividual(pan) || !letters.length || letters.indexOf(pan.charAt(4)) > -1)
      && (!inGstin || inGstin === pan);
    return { ok, code, holder };
  }

  // The PAN the documents print: the company's, when it is one
  function companyPan(co) {
    const pan = panOf((co || {}).pan);
    return isPan(pan) ? pan : '';
  }

  // What saving the PAN changes (prev / next: the company details before and after): the fields
  // that change (from → to), what KYA does from then on, and what the law asks for it. No
  // changes: nothing to confirm.
  function panChangeNotes(prev, next) {
    const a = panOf(prev.pan), b = panOf(next.pan);
    const holderOf = pan => (isPan(pan) && PAN_HOLDERS[pan.charAt(3)]) || '';
    const linkOf = (co, pan) => (isPan(pan) && isIndividual(pan)) ? (co.panAadhaarLinked !== false ? 'Linked' : 'Not Linked') : '';
    const la = linkOf(prev, a), lb = linkOf(next, b);
    const changes = [], kya = [], law = [];
    if (a !== b) changes.push({ label: 'PAN', from: a || '—', to: b || '—' });
    if (holderOf(a) !== holderOf(b) && b) changes.push({ label: 'PAN Holder', from: holderOf(a) || '—', to: holderOf(b) || '—' });
    if (lb && la !== lb) changes.push({ label: 'PAN–Aadhaar Link', from: la || '—', to: lb });
    const savedDocs = typeof kyaSavedDocsCount === 'function' ? kyaSavedDocsCount() : 0;
    const keeps = a !== b && !!str(prev.name) && savedDocs > 0;
    if (!changes.length) return { changes, kya, law, first: !a, keeps };

    // In KYA, from now on
    if (a !== b) kya.push(b ? `New invoices, orders, challans and purchase vouchers print "PAN: ${b}" under the address.` : 'New documents print no PAN.');
    if (keeps) kya.push(a ? `Documents already saved keep the PAN they were made with (${a}).` : 'Documents already saved stay as they were made, without a PAN.');

    // As per law
    if (b && a !== b) law.push('Quote the PAN in returns, challans and letters to the Income-tax Department, and give it to anyone who deducts tax from what they pay you (Section 139A(5) and 139A(5A), Income-tax Act 1961); without it, tax is deducted at 20% or the normal rate, whichever is higher (Section 206AA).');
    if (a && b && a !== b) law.push('A person holds one PAN only (Section 139A(7)); holding or quoting a wrong PAN invites a penalty of ₹10,000 (Section 272B). A new PAN comes with a change of constitution, and the GST registration then starts afresh in FORM GST REG-01 (Rule 19(1)(d), CGST Rules 2017).');
    const reg = typeof kyaCompanyGstReg === 'function' ? kyaCompanyGstReg(next) : { registered: false };
    const inGstin = b ? gstinPan({ registered: reg.registered, gstin: reg.gstin, gstRegType: reg.type }) : '';
    if (inGstin && inGstin !== b) law.push(`The GSTIN is issued on the PAN and carries it (Section 25(6), CGST Act 2017): your GSTIN carries ${inGstin}, not ${b}.`);
    if (lb === 'Not Linked' && (la !== 'Not Linked' || a !== b)) law.push("An individual's PAN not linked with Aadhaar is inoperative (Section 139AA(2), Rule 114AAA): tax is deducted or collected at the higher rates (Section 206AA / 206CC) and no refund is paid until it is linked, with the fee under Section 234H.");
    return { changes, kya, law, first: !a, keeps };
  }

  window.KYA_PAN_HOLDERS = PAN_HOLDERS;
  window.kyaNameLetters = nameLetters;   // the TAN's 4th letter follows the same rule (company-registrations.js)
  window.kyaCheckPan = checkPan;
  window.kyaCompanyPan = companyPan;
  window.kyaPanChangeNotes = panChangeNotes;
})();
