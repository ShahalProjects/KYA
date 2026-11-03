/**
 * js/company-identity.js
 * The company's Basic Identity (Company Profile & Vault → Basic Identity: name, address, contact,
 * logo, signature and seal) and what it means for the documents, as per law:
 *  - A tax invoice, bill of supply and delivery challan carry the supplier's name and address
 *    (Rule 46(a), 49(a) and 55(1), CGST Rules 2017), and an issued document is not altered
 *    (Rule 56(8)): a saved invoice, order, challan or purchase voucher keeps the details it was
 *    made with. Only new documents, and drafts (not issued yet), take a change.
 *  - A company prints its name, registered office address, CIN, phone, email and website on its
 *    bills and letters (Section 12(3)(c), Companies Act 2013), an OPC "One Person Company" in
 *    brackets under its name (second proviso), and for two years after a change of name its
 *    former name with the new one (first proviso).
 *  - An LLP's invoices carry its name, registered office address and LLPIN, and a statement that
 *    it is registered with limited liability (Section 21, LLP Act 2008). The LLPIN is kept in the
 *    CIN box of Legal & Registration (co.cin), which an LLP has no other use for.
 * How saved documents keep their details: a change of Basic Identity that saved documents were
 * made before is a version in the company details (co.identityVersions: the values the change
 * replaced, and the ids of the documents made before it, each document in one version only). A
 * document prints the current details with the replaced values put back, newest change first,
 * down to its own version. A change with no new documents before it adds the values it replaced
 * to the last version instead (older values win). A company's change of name is kept in
 * co.formerNames ({ name, until: the date of the change }).
 * A change of Basic Identity is confirmed and applied in Company Profile (company-profile.js),
 * with identityChangeNotes saying what it means.
 */
(function() {
  'use strict';

  // The Basic Identity fields a document prints, or that decide what it prints, and the numbers
  // it prints under the address: PAN (pan-registration.js), CIN / LLPIN and Udyam
  // (company-registrations.js)
  const IDENTITY_KEYS = ['name', 'displayName', 'businessType', 'incDate', 'address', 'city', 'district', 'state',
    'pincode', 'phone', 'email', 'website', 'iconImage', 'signatureImage', 'sealImage', 'sealName', 'sealRemoved', 'pan',
    'cin', 'udyam', 'msmeType'];

  // Business Types that are companies under the Companies Act 2013
  const COMPANY_TYPES = ['Pvt Ltd', 'Public Ltd', 'OPC'];

  // The saved documents that print the company. Drafts are left out: they are not issued yet.
  const DOC_STORES = ['salesVouchers', 'quotations', 'proformaInvoices', 'salesOrders', 'deliveryChallans', 'purchaseVouchers'];

  const companyDetails = () => (typeof getCompanyDetails === 'function' ? getCompanyDetails() : null) || {};
  const isCompany = co => COMPANY_TYPES.indexOf((co || {}).businessType) > -1;
  const isLlp = co => (co || {}).businessType === 'LLP';
  const str = v => String(v === undefined || v === null ? '' : v).trim();

  // A field's value as the documents read it: the seal reads the company name until it is given
  // a name of its own
  function identityValue(co, key) {
    if (key === 'sealRemoved') return !!co.sealRemoved;
    if (key === 'sealName') return str(co.sealName) || str(co.name) || str(co.displayName);
    return str(co[key]);
  }

  function changedKeys(prev, next) {
    return IDENTITY_KEYS.filter(k => identityValue(prev, k) !== identityValue(next, k));
  }

  // A name for telling a change of name from a change of spelling: "Pvt. Ltd." and "Private
  // Limited" are the same name
  const NAME_WORDS = { private: 'pvt', limited: 'ltd', company: 'co', corporation: 'corp' };
  const nameKey = s => str(s).toLowerCase().replace(/&/g, ' and ').split(/[^a-z0-9]+/).filter(Boolean)
    .map(w => NAME_WORDS[w] || w).join(' ');

  const todayIso = () => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  const addYears = (iso, n) => (parseInt(iso.slice(0, 4), 10) + n) + iso.slice(4);
  const isDraft = doc => !!(doc.isDraft || doc.status === 'Draft');

  function savedDocs() {
    const S = window.KYA_STORE || {};
    const docs = [];
    DOC_STORES.forEach(key => (Array.isArray(S[key]) ? S[key] : []).forEach(doc => {
      if (doc && doc.id !== undefined && doc.id !== null && !isDraft(doc)) docs.push(doc);
    }));
    return docs;
  }

  // The company details a document prints: those it was made with (co: the current details)
  function companyForDoc(doc, co) {
    const c = co || companyDetails();
    const versions = Array.isArray(c.identityVersions) ? c.identityVersions : [];
    if (!doc || doc.id === undefined || doc.id === null || !versions.length) return c;
    const id = String(doc.id);
    const k = versions.findIndex(v => Array.isArray(v.docs) && v.docs.some(d => String(d) === id));
    if (k < 0) return c;
    const out = Object.assign({}, c);
    for (let i = versions.length - 1; i >= k; i--) Object.assign(out, versions[i].replaced || {});
    return out;
  }

  // Before a change of Basic Identity is saved, the documents saved before it keep the details
  // they were made with (prev, next: the company details before and after; next takes the
  // version). Returns how many documents were marked.
  function keepSavedDocsIdentity(prev, next) {
    if (!str(prev.name)) return 0;   // the first save: nothing was issued under these details
    const keys = changedKeys(prev, next);
    if (!keys.length) return 0;
    const versions = (Array.isArray(next.identityVersions) ? next.identityVersions : []).slice();
    const listed = new Set();
    versions.forEach(v => (v.docs || []).forEach(id => listed.add(String(id))));
    const docs = [];
    savedDocs().forEach(doc => {
      const id = String(doc.id);
      if (!listed.has(id)) { listed.add(id); docs.push(id); }
    });
    const replaced = {};
    keys.forEach(k => { replaced[k] = k === 'sealRemoved' ? !!prev[k] : (prev[k] === undefined || prev[k] === null ? '' : prev[k]); });
    if (docs.length) versions.push({ at: new Date().toISOString(), replaced, docs });
    else if (versions.length) {
      const last = versions[versions.length - 1];
      versions[versions.length - 1] = Object.assign({}, last, { replaced: Object.assign({}, replaced, last.replaced) });
    }
    next.identityVersions = versions;
    return docs.length;
  }

  // A company that changes its name prints the former name for two years (Section 12(3), first
  // proviso): a change of a company's name, not of its spelling, and not a firm becoming a company
  function formerNameOf(prev, next) {
    const before = str(prev.name);
    if (!before || !isCompany(prev) || !isCompany(next)) return '';
    return nameKey(before) !== nameKey(next.name) ? before : '';
  }

  function keepFormerName(prev, next) {
    const former = formerNameOf(prev, next);
    if (!former) return false;
    next.formerNames = (Array.isArray(next.formerNames) ? next.formerNames : []).concat({ name: former, until: todayIso() });
    return true;
  }

  // What prints under the name: for a company (Section 12(3), Companies Act 2013) "(One Person
  // Company)" for an OPC and its former names of the two years before the document's date; for an
  // LLP, that it is registered with limited liability (Section 21(b), LLP Act 2008)
  function companyNameNotes(co, doc) {
    const c = co || companyDetails();
    if (isLlp(c)) return ['(Registered with limited liability)'];
    if (!isCompany(c)) return [];
    const notes = [];
    if (c.businessType === 'OPC') notes.push('(One Person Company)');
    const date = doc && /^\d{4}-\d{2}-\d{2}/.test(str(doc.date)) ? str(doc.date).slice(0, 10) : todayIso();
    const seen = new Set([nameKey(c.name)]);
    const former = (Array.isArray(c.formerNames) ? c.formerNames : [])
      .filter(f => f && str(f.name) && /^\d{4}-\d{2}-\d{2}$/.test(str(f.until)) && f.until <= date && date < addYears(f.until, 2))
      .sort((a, b) => (a.until < b.until ? 1 : a.until > b.until ? -1 : 0))
      .map(f => str(f.name))
      .filter(n => { const k = nameKey(n); if (seen.has(k)) return false; seen.add(k); return true; });
    if (former.length) notes.push(`(Formerly known as ${former.join('; ')})`);
    return notes;
  }

  // The number printed with the address, from the CIN box of Legal & Registration: a company's
  // CIN (Section 12(3)(c)), an LLP's LLPIN (Section 21(a), LLP Act 2008)
  function companyRegNumber(co) {
    const c = co || companyDetails();
    const no = str(c.cin).toUpperCase();
    if (!no) return null;
    if (isCompany(c)) return { label: 'CIN', no };
    return isLlp(c) ? { label: 'LLPIN', no } : null;
  }

  // Business Types under one PAN: a change between them is not a change of constitution
  const PAN_GROUP = { 'Pvt Ltd': 'company', 'Public Ltd': 'company', 'OPC': 'company' };
  const panGroup = t => PAN_GROUP[t] || t;

  // What saving Basic Identity changes (prev / next: the company details before and after; opts:
  // businessTypeLabel): the fields that change (from → to; no "from" on the first save), what KYA
  // does from then on, and what the law asks for that change. No changes: nothing to confirm.
  function identityChangeNotes(prev, next, opts) {
    const typeLabel = (opts && opts.businessTypeLabel) || (v => v);
    const first = !str(prev.name);
    const keys = changedKeys(prev, next);
    const changed = k => keys.indexOf(k) > -1;
    const changes = [], kya = [], law = [];
    const show = v => str(v).replace(/\s*\n\s*/g, ', ') || '—';
    const fmtDate = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str(iso)); return m ? `${m[3]}-${m[2]}-${m[1]}` : show(iso); };
    const row = (label, from, to) => changes.push({ label, from: first ? null : from, to });

    [['name', 'Company / Firm Name'], ['displayName', 'Sidebar Display Name']].forEach(([k, label]) => {
      if (changed(k)) row(label, show(prev[k]), show(next[k]));
    });
    if (changed('businessType')) row('Business Type', prev.businessType ? typeLabel(prev.businessType) : '—', next.businessType ? typeLabel(next.businessType) : '—');
    if (changed('incDate')) row('Date of Incorporation', fmtDate(prev.incDate), fmtDate(next.incDate));
    [['address', 'Business Address'], ['city', 'City'], ['district', 'District'], ['state', 'State'], ['pincode', 'PIN Code'],
      ['phone', 'Phone'], ['email', 'Email'], ['website', 'Website']].forEach(([k, label]) => {
      if (changed(k)) row(label, show(prev[k]), show(next[k]));
    });
    const image = (label, had, has) => row(label, had ? 'Yes' : 'None', has ? (had ? 'Replaced' : 'Added') : 'Removed');
    if (changed('iconImage')) image('Company Logo', str(prev.iconImage), str(next.iconImage));
    if (changed('signatureImage')) image('Signature', str(prev.signatureImage), str(next.signatureImage));
    // (on the first save, only a seal name other than the company name)
    if (changed('sealName') && !(first && identityValue(next, 'sealName') === str(next.name))) row('Seal Name', show(identityValue(prev, 'sealName')), show(identityValue(next, 'sealName')));
    // A seal shows unless removed: the one generated, else one drawn from the company name
    const hasSeal = co => !co.sealRemoved && !!(str(co.sealImage) || identityValue(co, 'sealName'));
    if (changed('sealImage') || changed('sealRemoved')) image('Company Seal', hasSeal(prev), hasSeal(next));
    if (!changes.length) return { changes, kya, law, first, keeps: false };

    const reg = typeof kyaCompanyGstReg === 'function' ? kyaCompanyGstReg(next) : { registered: !!str(next.gstin) };
    const gstState = typeof kyaCompanyGstState === 'function' ? kyaCompanyGstState(next) : str(next.state);
    const keeps = !first && savedDocs().length > 0;
    const former = formerNameOf(prev, next);
    const addressChanged = ['address', 'city', 'district', 'state', 'pincode'].some(changed);
    const regNo = str(next.cin).toUpperCase();
    const type = next.businessType || '';
    // An LLP becoming a company, or a company an LLP: the number in the CIN box changes with it
    const switched = !first && !!regNo && ((isLlp(prev) && isCompany(next)) || (isCompany(prev) && isLlp(next)));

    // In KYA, from now on
    if (first) {
      kya.push('Invoices, orders, challans and purchase vouchers print these details: the name at the top and on the "For" line, the address and contact under it.');
      if (savedDocs().length) kya.push('Documents already saved take them too.');
    } else {
      if (changed('name')) kya.push(`New documents print "${str(next.name)}" at the top and on the "For" line.`);
      if (former) kya.push(`For two years, new documents also print "(Formerly known as ${former})" under the name.`);
      if (changed('displayName')) kya.push(`The sidebar and the trading name in PDF and Excel exports read "${typeof getInvoiceCompanyName === 'function' ? getInvoiceCompanyName(next) : (str(next.displayName) || str(next.name))}".`);
      if (addressChanged) kya.push('New documents print the new address.');
      const contact = ['phone', 'email', 'website'].filter(changed);
      if (contact.length) kya.push(`New documents print the new ${contact.length > 1 ? contact.slice(0, -1).join(', ') + ' and ' + contact[contact.length - 1] : contact[0]}.`);
      if (changed('iconImage')) kya.push(str(next.iconImage) ? 'New documents carry the new logo.' : 'New documents print no logo.');
      if (changed('signatureImage')) kya.push(str(next.signatureImage) ? 'New documents carry the new signature over "Authorised Signatory".' : 'New documents leave the signature blank, for signing by hand.');
      if (changed('sealImage') || changed('sealRemoved')) kya.push(hasSeal(next) ? 'New documents carry the new seal.' : 'New documents print no seal.');
      else if ((changed('sealName') || changed('city')) && hasSeal(next)) kya.push(`The seal on new documents reads "${identityValue(next, 'sealName')}"${str(next.city) ? ', ' + str(next.city) : ''}.`);
    }
    if (changed('state')) {
      if (!reg.registered) kya.push(`New sales and orders compare the customer's State with ${str(next.state) || 'the company State'} for CGST + SGST or IGST and the Place of Supply.`);
      else if (gstState) kya.push(`Tax and the Place of Supply still follow the State of the GSTIN, ${gstState}.`);
    }
    if (isCompany(next) && (first || !isCompany(prev))) {
      kya.push(switched ? `Enter the company's CIN in Legal & Registration in place of the LLPIN (${regNo}); it prints under the address.`
        : regNo ? `The CIN (${regNo}) prints under the address.` : 'Enter the CIN in Legal & Registration: it then prints under the address.');
    }
    if (type === 'OPC' && (first || prev.businessType !== 'OPC')) kya.push('"(One Person Company)" prints under the name, at the top and on the "For" line.');
    if (isLlp(next) && (first || !isLlp(prev))) {
      kya.push('"(Registered with limited liability)" prints under the name.');
      kya.push(switched ? `Enter the LLPIN in Legal & Registration in place of the CIN (${regNo}); it prints under the address.`
        : regNo ? `The LLPIN (${regNo}) prints under the address.` : 'Enter the LLPIN in Legal & Registration (the CIN box): it then prints under the address.');
    }
    if (!first && isCompany(prev) && !isCompany(next)) {
      if (!isLlp(next)) kya.push(prev.businessType === 'OPC' ? 'The CIN and "(One Person Company)" are no longer printed.' : 'The CIN is no longer printed.');
      else if (prev.businessType === 'OPC') kya.push('"(One Person Company)" is no longer printed.');
    } else if (!first && prev.businessType === 'OPC' && type !== 'OPC' && isCompany(next)) kya.push('"(One Person Company)" is no longer printed.');
    if (!first && isLlp(prev) && !isLlp(next)) kya.push(isCompany(next) ? '"(Registered with limited liability)" is no longer printed.' : 'The LLPIN and "(Registered with limited liability)" are no longer printed.');
    if (keeps) kya.push('Invoices, orders, challans and purchase vouchers already saved keep the details they were made with; drafts take the new ones.');

    // As per law
    if (first) {
      if (reg.registered) law.push('A tax invoice, bill of supply and delivery challan carry the supplier\'s name, address and GSTIN (Rule 46(a), 49(a) and 55(1), CGST Rules 2017).');
    } else {
      if (changed('name') && reg.registered) law.push('The legal name is a core field of the GST registration: apply in FORM GST REG-14 within 15 days of the change, and the officer approves it in REG-15 (Section 28, CGST Act; Rule 19(1)(a), CGST Rules 2017).');
      if (addressChanged && reg.registered) {
        if (changed('state') && gstState && str(next.state) && str(next.state).toLowerCase() !== gstState.toLowerCase()) {
          law.push(`A GST registration covers one State: a place of business in ${str(next.state)} needs its own registration there within 30 days of becoming liable, and can't be moved by amendment (Section 22(1) and 25(1), CGST Act).`);
        } else {
          law.push('The address of the principal place of business is a core field: amend it in REG-14 within 15 days, with proof of the new premises (Section 28; Rule 19(1)(a)).');
        }
      }
      if ((changed('phone') || changed('email')) && reg.registered) law.push('Phone and email are non-core fields: update them in REG-14, which takes effect on filing, without approval (Rule 19(1)(c)). The authorised signatory\'s own mobile and email change only after OTP verification on the portal.');
      if (changed('businessType') && prev.businessType && type && panGroup(prev.businessType) !== panGroup(type)) {
        if (reg.registered) law.push('A change of constitution that changes the PAN (e.g. Proprietorship to Partnership, LLP or Company) needs a fresh GST registration in REG-01 (Rule 19(1)(d)); the old one is cancelled (Section 29(1)(b), CGST Act), and unused input tax credit moves over in ITC-02 (Section 18(3), Rule 41).');
      } else if (changed('businessType') && isCompany(prev) && isCompany(next)) {
        law.push('A company converts between private, public and One Person Company by special resolution altering its memorandum and articles, keeping its PAN and GSTIN (Sections 14 and 18, Companies Act 2013).');
      }
      if (isCompany(next) && isCompany(prev)) {
        if (changed('name')) law.push(`A company changes its name by special resolution with the Central Government's approval; it takes effect on the fresh certificate of incorporation (Section 13(1)–(3), Companies Act 2013).${former ? ' For two years it prints the former name with the new one (Section 12(3), first proviso).' : ''}`);
        if (addressChanged) law.push(`When this is the registered office: notice to the Registrar in INC-22 within 30 days (Section 12(4)); outside the city, town or village by special resolution (Section 12(5))${changed('state') ? '; to another State with the Central Government\'s approval (Section 13(4))' : ''}.`);
      }
      if (type === 'LLP' && prev.businessType === 'LLP') {
        if (changed('name')) law.push('An LLP files the change of name with the Registrar in LLP Form 5.');
        if (addressChanged) law.push('When this is the registered office: file the change with the Registrar in LLP Form 15 within 30 days (Section 13(3), LLP Act 2008).');
      }
      if (type === 'Partnership' && prev.businessType === 'Partnership' && (changed('name') || addressChanged)) {
        const what = [changed('name') ? 'firm name' : '', addressChanged ? 'principal place of business' : ''].filter(Boolean).join(' and ');
        law.push(`A registered firm sends the change of its ${what} to the Registrar of Firms (Section 60, Indian Partnership Act 1932).`);
      }
      if (changed('signatureImage') && !str(next.signatureImage) && reg.registered) law.push('A tax invoice carries the signature or digital signature of the supplier or the authorised representative (Rule 46(q), CGST Rules 2017): sign the printed documents by hand.');
    }
    if (isCompany(next) && (first || !isCompany(prev))) law.push(`A company prints its name, registered office address, CIN, phone, email and website on its bills and letters (Section 12(3)(c), Companies Act 2013)${type === 'OPC' ? ', and "One Person Company" in brackets under its name (second proviso)' : ''}.`);
    else if (type === 'OPC' && prev.businessType !== 'OPC') law.push('"One Person Company" goes in brackets under the name wherever it is printed (Section 12(3), second proviso, Companies Act 2013).');
    if (type === 'LLP' && (first || prev.businessType !== 'LLP')) law.push('An LLP\'s invoices carry its name, registered office address and LLPIN, and say it is registered with limited liability (Section 21, LLP Act 2008).');
    return { changes, kya, law, first, keeps };
  }

  window.KYA_COMPANY_TYPES = COMPANY_TYPES;
  window.kyaCompanyForDoc = companyForDoc;
  window.kyaKeepSavedDocsIdentity = keepSavedDocsIdentity;
  window.kyaKeepFormerName = keepFormerName;
  window.kyaCompanyNameNotes = companyNameNotes;
  window.kyaCompanyRegNumber = companyRegNumber;
  window.kyaSavedDocsCount = () => savedDocs().length;
  window.kyaIdentityChangeNotes = identityChangeNotes;
})();
