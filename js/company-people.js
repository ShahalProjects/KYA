/**
 * js/company-people.js
 * Company Profile & Vault → Key People, as per law:
 *  - Who they are follows the Business Type: a company's directors and key managerial personnel
 *    (Sections 2(51), 149 and 203, Companies Act 2013), an OPC's director and nominee (Section
 *    3(1)(c)), an LLP's designated partners and partners (Section 7, LLP Act 2008), a firm's
 *    partners, a proprietor, a trust's trustees.
 *  - A director's DIN (Section 152(3)) and an LLP designated partner's (Section 7(6), LLP Act) is
 *    8 digits. A person's PAN has P as its 4th letter. An Aadhaar number is 12 digits, not
 *    starting with 0 or 1, ending in UIDAI's Verhoeff check digit; it is shown masked (Section 29,
 *    Aadhaar Act 2016).
 *  - Partners share profits equally unless they agree otherwise (Section 13(b), Indian
 *    Partnership Act 1932): the shares entered total 100%.
 * Company Profile (company-profile.js) adds, edits and deletes people through its person popup.
 */
(function() {
  'use strict';

  const str = v => String(v === undefined || v === null ? '' : v).trim();

  // The roles each Business Type has, and what Key People is called for it
  const ROLES = {
    company: ['Managing Director', 'Whole-time Director', 'Director', 'Independent Director', 'Nominee Director',
      'Additional Director', 'CEO', 'CFO', 'Company Secretary'],
    OPC: ['Director', 'Nominee'],
    LLP: ['Designated Partner', 'Partner'],
    Partnership: ['Managing Partner', 'Partner'],
    Proprietorship: ['Proprietor'],
    Trust: ['Managing Trustee', 'Trustee', 'President', 'Secretary', 'Treasurer'],
    other: ['Proprietor', 'Partner', 'Director', 'Trustee', 'Manager']
  };
  const TITLES = {
    company: 'Directors & KMP', OPC: 'Director & Nominee', LLP: 'Designated Partners & Partners',
    Partnership: 'Partners', Proprietorship: 'Proprietor', Trust: 'Trustees', other: 'Directors / Partners / Proprietor'
  };
  const groupOf = type => (type === 'Pvt Ltd' || type === 'Public Ltd') ? 'company' : (ROLES[type] ? type : 'other');

  // A DIN: a company's directors and an LLP's designated partners hold one
  const showsDin = type => ['company', 'OPC', 'LLP'].indexOf(groupOf(type)) > -1;
  const hasDin = (type, role) => {
    const g = groupOf(type);
    if (g === 'company' || g === 'OPC') return /Director/.test(str(role));
    return g === 'LLP' && str(role) === 'Designated Partner';
  };
  // A profit share: a firm's and an LLP's partners
  const showsShare = type => ['LLP', 'Partnership'].indexOf(groupOf(type)) > -1;

  // UIDAI's check digit (Verhoeff)
  const VD = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],
    [5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
  const VP = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],
    [9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
  const verhoeffOk = digits => digits.split('').reverse().reduce((c, d, i) => VD[c][VP[i % 8][+d]], 0) === 0;
  const aadhaarDigits = raw => str(raw).replace(/\s/g, '');

  // A person's entry against its form (field: pan, aadhaar, din, share, phone, email)
  function checkPerson(field, raw) {
    const v = str(raw);
    if (field === 'pan') return /^[A-Z]{3}P[A-Z][0-9]{4}[A-Z]$/.test(v.toUpperCase());
    if (field === 'aadhaar') { const d = aadhaarDigits(v); return /^[2-9][0-9]{11}$/.test(d) && verhoeffOk(d); }
    if (field === 'din') return /^[0-9]{8}$/.test(v);
    if (field === 'share') { const n = Number(v); return v !== '' && isFinite(n) && n > 0 && n <= 100; }
    if (field === 'phone') return /^(\+91|91|0)?[0-9]{10}$/.test(v.replace(/[\s\-()]/g, ''));
    if (field === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    return true;
  }

  // Aadhaar as shown: only its last four digits
  const maskAadhaar = raw => {
    const d = aadhaarDigits(raw);
    return /^[0-9]{12}$/.test(d) ? 'XXXX XXXX ' + d.slice(8) : str(raw);
  };

  // The profit shares entered (none: not checked) and whether they total 100%
  function shareTotal(people) {
    const shares = (people || []).filter(p => str(p.share) !== '');
    const total = shares.reduce((s, p) => s + (Number(p.share) || 0), 0);
    return { entered: shares.length > 0, total: Math.round(total * 100) / 100, ok: Math.abs(total - 100) < 0.005 };
  }

  window.kyaPeopleRoles = type => ROLES[groupOf(type)];
  window.kyaPeopleTitle = type => TITLES[groupOf(type)];
  window.kyaPeopleShowsDin = showsDin;
  window.kyaPeopleHasDin = hasDin;
  window.kyaPeopleShowsShare = showsShare;
  window.kyaCheckPerson = checkPerson;
  window.kyaMaskAadhaar = maskAadhaar;
  window.kyaPeopleShareTotal = shareTotal;
})();
