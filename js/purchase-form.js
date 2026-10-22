// ══════════════════════════════════════════════════════════════════
//  PURCHASE VOUCHER — New Purchase. Works like the Sales Invoice (sales-form.js /
//  sales-posting.js): the same row pickers (Stock Items at cost + Expense ledgers, HSN/SAC
//  codes, Unit master, ✎ Alter in Master Desk), the number format and "already used" check
//  (doc-numbering.js), Not Paid / Full / Partial with Multi Payment, cash purchase, TDS /
//  TCS and Round off. Posting: purchase-posting.js; preview & export: purchase-print.js.
// ══════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  // Ensure KYA_STORE pre-init
  if (!window.KYA_STORE) window.KYA_STORE = {};
  if (!window.KYA_STORE.purchaseVouchers) window.KYA_STORE.purchaseVouchers = [];
  if (!window.KYA_STORE.purchaseVouchersDrafts) window.KYA_STORE.purchaseVouchersDrafts = [];
  if (!window.KYA_STORE.purchaseInvoiceCtr) window.KYA_STORE.purchaseInvoiceCtr = 1;

  let purchaseRows = [];
  // The stored voucher open on the form: { id, isDraft } — null for a new purchase
  let _editingPurchaseVoucher = null;
  let purchaseUploadedDoc = null;
  let purchaseMultiPayments = [];
  let _purchasePaymentAccountPrev = '';
  // The Pre Purchase document this purchase is made from (purchase-pre.js):
  // { kind, id, advance: { amount, journalEntryId, voucherNo } } — set by Convert to Purchase
  // or the Pre Purchase No. box, or read back from the voucher being edited
  let _purchasePreLink = null;

  const MULTI_PAYMENT_VALUE = 'multi-payment';
  const $ = id => document.getElementById(id);
  const r2 = n => Math.round((parseFloat(n) || 0) * 100) / 100;
  const fmt = n => (typeof fmtNum === 'function') ? fmtNum(n) : r2(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const toast = (msg, type) => { if (typeof showToast === 'function') showToast(msg, type); };

  function ohEsc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function newPurchaseRow() {
    return { item: '', hsn: '', qty: 1, unit: '', rate: 0, discount: 0, discountType: 'val', tax: 18, amount: 0 };
  }

  // Local date — toISOString() is UTC and gives yesterday before 05:30 IST
  function localToday() {
    if (typeof window.kyaLocalIso === 'function') return window.kyaLocalIso(new Date());
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function isPurchaseZeroTaxSupply() {
    const v = ($('purchaseSupplyType') || {}).value || '';
    return v.includes('Zero-Rated') || v.includes('Without Tax');
  }

  // Amounts typed into the row / round-off boxes may be sums (500+250, 1000*2, 500-10%)
  function evaluatePurchaseMathExpression(str) {
    let clean = (str || '').toString().replace(/,/g, '').trim();
    if (!clean) return 0;
    clean = clean.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
    if (!/^[0-9.+\-*/()\s]+$/.test(clean)) return NaN;
    try {
      const result = Function(`"use strict"; return (${clean})`)();
      return typeof result === 'number' && isFinite(result) ? result : NaN;
    } catch (e) {
      return NaN;
    }
  }

  function parsePurchaseAmt(str) {
    const cleanStr = (str || '').toString().replace(/,/g, '').trim();
    if (!cleanStr) return 0;
    if (/[\+\-\*\/\%]/.test(cleanStr)) {
      const evalVal = evaluatePurchaseMathExpression(cleanStr);
      if (!isNaN(evalVal)) return evalVal;
    }
    const v = parseFloat(cleanStr);
    return isNaN(v) ? 0 : v;
  }

  // ══════════════════════════════════════════════════════════════════
  //  NUMBERING — prefix / start / digits (pencil), "already used" check (doc-numbering.js)
  // ══════════════════════════════════════════════════════════════════
  function getPurchaseOwnId() {
    return _editingPurchaseVoucher ? _editingPurchaseVoucher.id : null;
  }

  function getNextPurchaseInvoiceNo() {
    // A reversal is numbered from its Original Doc (none chosen yet: no number)
    if (isPurchaseReturnMode()) return getPurchaseReversalDocNo() ? getPurchaseReversalNoFor(getPurchaseReversalDocNo()) : '';
    if (typeof getNextDocNo === 'function') return getNextDocNo('purchase');
    return `PUR-${new Date().getFullYear()}-${String(window.KYA_STORE.purchaseInvoiceCtr || 1).padStart(3, '0')}`;
  }

  // The doc-numbering kind of the number box: purchases and reversals are counted apart
  function getPurchaseNumberKind() {
    return isPurchaseReturnMode() ? 'purchaseReturn' : 'purchase';
  }

  function validatePurchaseNoField() {
    return (typeof validateDocNoField === 'function') ? validateDocNoField(getPurchaseNumberKind()) : true;
  }

  // ══════════════════════════════════════════════════════════════════
  //  REVERSAL (Purchase Voucher → Reversal) — the mirror of the Sales Reversal: an
  //  Original Doc (a posted purchase or a Pre Purchase document, purchase-reversal.js),
  //  its lines and TDS / TCS, and a refund from the supplier
  // ══════════════════════════════════════════════════════════════════
  let _purchaseMode = 'Purchase'; // 'Purchase' | 'Return'
  // The Original Doc: { type: 'purchase', id, no, date } or
  // { type: 'pre', kind, id, no, date, label, advance, advanceJournalEntryId, advanceVoucherNo, inPartyLedger }
  let _purchaseReturnSource = null;

  function isPurchaseReturnMode() {
    return _purchaseMode === 'Return';
  }

  function getPurchaseReversalDocNo() {
    return (_purchaseReturnSource && _purchaseReturnSource.no) || '';
  }

  // The posted purchase being reversed (null for a Pre Purchase document or none chosen)
  function getPurchaseReturnOriginal() {
    const src = _purchaseReturnSource;
    if (!src || src.type !== 'purchase' || typeof window.findPostedPurchaseForReversal !== 'function') return null;
    return window.findPostedPurchaseForReversal(src.id);
  }

  // Reversal No.: <prefix><Original Doc no.>; the prefix is set from the pencil (default
  // "REV-"), and a further reversal of the same document gets -2, -3 …
  function getPurchaseReversalPrefix() {
    const s = typeof getSalesNumberingSettings === 'function' ? getSalesNumberingSettings('purchaseReversal') : null;
    return (s && s.prefix) || 'REV-';
  }

  function getPurchaseReversalNoFor(docNo, prefix) {
    const base = `${prefix === undefined ? getPurchaseReversalPrefix() : prefix}${docNo}`;
    let candidate = base;
    let n = 1;
    while (typeof isDocNoUsed === 'function' && isDocNoUsed('purchaseReturn', candidate, getPurchaseOwnId())) {
      n++;
      candidate = `${base}-${n}`;
    }
    return candidate;
  }

  // Fills the read-only Reversal No. box: empty until an Original Doc is chosen. A number that
  // already belongs to the chosen document is kept unless `force` is set.
  function refreshPurchaseReversalNo(force) {
    if (!isPurchaseReturnMode()) return;
    const noEl = $('purchaseInvoiceNo');
    const chip = $('purchaseVoucherChipDisplay');
    if (!noEl) return;
    const docNo = getPurchaseReversalDocNo();
    if (!docNo) {
      noEl.value = '';
      noEl.placeholder = 'Select Original Doc first';
    } else {
      noEl.placeholder = '';
      const base = `${getPurchaseReversalPrefix()}${docNo}`.toLowerCase();
      const cur = noEl.value.trim().toLowerCase();
      const belongs = !!cur && (cur === base || cur.startsWith(`${base}-`));
      if (force || !belongs) noEl.value = getPurchaseReversalNoFor(docNo);
    }
    if (chip) chip.textContent = noEl.value || 'REV-XXXX';
    validatePurchaseNoField();
  }

  // Pencil in the Reversal No. box: the Number Format popup with the prefix only (the
  // number itself is the Original Doc's)
  function openPurchaseReversalNumberingModal() {
    if (typeof openKyaNumberingModal !== 'function') return;
    const docNo = getPurchaseReversalDocNo();
    openKyaNumberingModal({
      kind: 'purchaseReversal',
      noun: 'Reversal',
      prefixOnly: true,
      requirePrefix: true,
      subtitle: 'A reversal is numbered with this prefix followed by its Original Doc number. A further reversal of the same document gets -2, -3 …',
      previewLabel: docNo ? `Reversal number for ${docNo}` : 'Example reversal number',
      preview: f => ({
        text: f.prefix ? getPurchaseReversalNoFor(docNo || 'PUR-2026-001', f.prefix) : '',
        note: docNo ? '' : 'Shown for an example purchase — the chosen Original Doc number is used.'
      }),
      onSaved: () => {
        // A posted reversal being edited keeps its number; anything else takes the prefix
        if (_editingPurchaseVoucher && !_editingPurchaseVoucher.isDraft) validatePurchaseNoField();
        else refreshPurchaseReversalNo(true);
      }
    });
  }

  // The refund the supplier can make on this reversal: a Pre Purchase document's advance,
  // or what was paid on the purchase less earlier refunds (never above this reversal)
  function getPurchaseRefundMax(total) {
    const src = _purchaseReturnSource;
    if (!src) return 0;
    if (src.type === 'pre') return Math.max(0, r2(src.advance));
    const orig = getPurchaseReturnOriginal();
    if (!orig || typeof window.getPurchaseRefundable !== 'function') return 0;
    const refundable = window.getPurchaseRefundable(orig, getPurchaseOwnId());
    return Math.max(0, Math.min(r2(total), refundable));
  }

  // Title, the Original Doc box, the number box, the button and the header for the mode
  function updatePurchaseModeUI() {
    const isReturn = isPurchaseReturnMode();
    const card = $('purchaseVoucherFormCard');
    const title = card && card.querySelector('.je-card-title-text');
    const subtitle = card && card.querySelector('.je-card-subtitle-text');
    if (title) title.textContent = isReturn ? 'Purchase Reversal' : 'Purchase Voucher';
    if (subtitle) subtitle.textContent = isReturn ? 'Record purchase reversals and supplier debits' : 'Record purchase transactions and vendor payables';
    const origField = $('purchaseOriginalDocField');
    if (origField) origField.style.display = isReturn ? '' : 'none';
    const preField = $('purchasePreField');
    if (preField) preField.style.display = isReturn ? 'none' : '';
    const lbl = $('lblPurchaseInvoiceNo');
    if (lbl) lbl.textContent = isReturn ? 'Reversal No.' : 'Purchase / Bill No.';
    const noEl = $('purchaseInvoiceNo');
    if (noEl) {
      noEl.readOnly = isReturn;
      noEl.style.background = isReturn ? 'var(--slate-50)' : '';
      noEl.style.cursor = isReturn ? 'default' : '';
      noEl.title = isReturn ? 'Prefix + Original Doc number' : '';
    }
    const fmtBtn = $('purchaseInvoiceNoFormatBtn');
    if (fmtBtn) {
      fmtBtn.title = isReturn ? 'Set reversal number prefix' : 'Set purchase number prefix';
      fmtBtn.setAttribute('aria-label', fmtBtn.title);
    }
    const postBtn = $('btnPostPurchase');
    if (postBtn) {
      const textNode = Array.from(postBtn.childNodes).reverse().find(n => n.nodeType === 3 && n.textContent.trim());
      if (textNode) textNode.textContent = isReturn ? ' Save Reversal ' : ' Save Purchase ';
      postBtn.setAttribute('aria-label', isReturn ? 'Save reversal' : 'Save purchase');
    }
    // A reversal only works on the Original Doc's lines — no new rows
    const addRowBtn = $('purchaseAddRow');
    if (addRowBtn) addRowBtn.style.display = isReturn ? 'none' : '';
    const trigText = $('purchaseInvoiceSelectTriggerText');
    if (trigText) {
      const no = getPurchaseReversalDocNo();
      trigText.textContent = no || '— Select —';
      trigText.style.color = no ? 'var(--slate-800)' : '';
      trigText.style.fontWeight = no ? '600' : '';
    }
    // The header follows the form only while the form is the card on show (not Pre Purchase)
    if (typeof window.setPurchaseHeaderMode === 'function' && card && card.style.display !== 'none') {
      window.setPurchaseHeaderMode(isReturn ? 'return' : 'new');
    }
  }

  // While the Vendor box is locked (a reversal), a click on it does nothing; the details card
  // still opens on hover
  function setPurchaseReturnFieldLocks() {
    const isReturn = isPurchaseReturnMode();
    const trigger = $('purchaseVendorSelectTrigger');
    const wrap = $('purchaseVendorSelectWrap');
    if (wrap && trigger && !wrap._returnLockWired) {
      wrap._returnLockWired = true;
      wrap.addEventListener('click', e => {
        if (trigger.dataset.returnLocked && trigger.contains(e.target)) {
          e.stopPropagation();
          e.preventDefault();
        }
      }, true);
    }
    if (trigger) {
      if (isReturn) {
        trigger.dataset.returnLocked = '1';
        trigger.style.backgroundColor = 'var(--slate-50)';
        trigger.style.cursor = 'default';
        trigger.style.opacity = '0.7';
      } else if (trigger.dataset.returnLocked) {
        delete trigger.dataset.returnLocked;
        trigger.style.backgroundColor = '#fff';
        trigger.style.cursor = 'pointer';
        trigger.style.opacity = '1';
      }
    }
    ['purchaseSupplyType', 'purchaseExecutive'].forEach(id => {
      const el = $(id);
      if (!el) return;
      if (isReturn) {
        el.disabled = true;
        el.style.backgroundColor = 'var(--slate-50)';
        el.style.cursor = 'not-allowed';
        el.dataset.returnLocked = '1';
      } else if (el.dataset.returnLocked) {
        el.disabled = false;
        el.style.backgroundColor = '';
        el.style.cursor = '';
        delete el.dataset.returnLocked;
      }
    });
    // TDS / TCS follow the Original Doc
    const lockBtn = (el, on) => {
      if (!el) return;
      el.disabled = on;
      el.style.cursor = on ? 'not-allowed' : '';
      el.style.opacity = on ? '0.5' : '';
    };
    ['purchaseTdsTcsNone', 'purchaseTdsTcsTds', 'purchaseTdsTcsTcs'].forEach(id => {
      const b = $(id);
      lockBtn(b, isReturn && !!b && !b.classList.contains('active'));
    });
    ['purchaseTdsTcsRateSelect', 'purchaseTdsTcsRateCustom'].forEach(id => {
      const el = $(id);
      if (!el) return;
      el.disabled = isReturn;
      el.style.backgroundColor = isReturn ? 'var(--slate-50)' : '';
      el.style.cursor = isReturn ? 'not-allowed' : '';
    });
  }

  // Rows of a reversal: nothing changes before an Original Doc is chosen; a Pre Purchase
  // document is reversed whole; a purchase's lines keep their item, rate, amount and tax —
  // only the quantity (and a ₹ discount) being reversed changes. 'none' | 'all' | 'qty'
  function getPurchaseReturnRowLock() {
    if (!isPurchaseReturnMode()) return 'none';
    if (!_purchaseReturnSource || _purchaseReturnSource.type === 'pre') return 'all';
    return 'qty';
  }

  function lockPurchaseReturnRow(tr, mode) {
    const lockEl = el => {
      if (!el) return;
      if (el.tagName === 'SELECT') el.disabled = true;
      else el.readOnly = true;
      el.style.cursor = 'not-allowed';
      el.style.color = 'var(--slate-500)';
    };
    if (mode === 'all') {
      tr.querySelectorAll('input, select').forEach(lockEl);
      tr.querySelectorAll('.sales-del-row').forEach(b => { b.style.display = 'none'; });
    } else {
      ['.sales-row-item', '.sales-row-hsn', '.sales-row-unit', '.sales-row-rate', '.sales-row-amount-input', '.sales-row-tax', '.sales-row-discount-type']
        .forEach(sel => lockEl(tr.querySelector(sel)));
    }
    tr.querySelectorAll('.sales-row-drop-arrow').forEach(a => { a.style.display = 'none'; });
  }

  // The refund box on a reversal: what the Original Doc allows to be refunded; Full and
  // Partial are off when there is nothing to refund
  function updatePurchaseReversalInfo(total) {
    const box = $('purchaseAdvanceInfo');
    setPurchasePaymentLabels(true);
    const max = getPurchaseRefundMax(total);
    const src = _purchaseReturnSource;
    const row = (label, value, strong) => `<div style="display: flex; justify-content: space-between; gap: 10px; margin-top: 2px;"><span>${label}</span>${strong ? `<strong>${value}</strong>` : `<span>${value}</span>`}</div>`;
    if (box) {
      if (!src) {
        box.dataset.active = '0';
        box.style.display = 'none';
        box.innerHTML = '';
      } else if (src.type === 'pre') {
        box.dataset.active = '1';
        box.innerHTML = src.advance > 0
          ? `${row(`Advance paid${src.advanceVoucherNo ? ` <span style="font-family: monospace; font-weight: 700;">[${ohEsc(src.advanceVoucherNo)}]</span>` : ''}`, `₹ ${fmt(src.advance)}`, true)}
             <div style="margin-top: 4px; font-weight: 500;">Record the supplier's refund below; any part not refunded stays ${src.inPartyLedger ? "in the supplier's ledger" : 'in Advances to Suppliers'}.</div>`
          : `<div style="font-weight: 500;">No advance was paid against ${ohEsc(src.no)} — nothing to refund.</div>`;
      } else {
        const orig = getPurchaseReturnOriginal();
        const paid = orig ? getPurchasePaidAmount(orig) : 0;
        const refundable = (orig && typeof window.getPurchaseRefundable === 'function') ? window.getPurchaseRefundable(orig, getPurchaseOwnId()) : 0;
        const already = Math.max(0, r2(paid - refundable));
        box.dataset.active = '1';
        box.innerHTML = paid > 0
          ? `${row(`Paid on ${ohEsc(src.no)}`, `₹ ${fmt(paid)}`)}
             ${already > 0 ? row('Already refunded', `₹ ${fmt(already)}`) : ''}
             ${row('Refundable on this reversal', `₹ ${fmt(max)}`, true)}
             <div style="margin-top: 4px; font-weight: 500;">Any part not refunded stays as an amount the supplier owes you.</div>`
          : `<div style="font-weight: 500;">Nothing was paid on ${ohEsc(src.no)} — the reversal reduces what you owe the supplier.</div>`;
      }
    }
    // Nothing to refund: only "Not Refunded" applies
    const nothing = max <= 0.005;
    const notPaidBtn = $('purchasePaymentStatusNotPaid');
    if (nothing && notPaidBtn && !notPaidBtn.classList.contains('active')) setPurchasePaymentStatus('NotPaid');
    ['purchasePaymentStatusFull', 'purchasePaymentStatusPartial'].forEach(id => {
      const btn = $(id);
      if (!btn || btn.dataset.cashLocked) return;
      if (nothing) btn.dataset.advLocked = '1';
      else delete btn.dataset.advLocked;
      btn.disabled = nothing;
      btn.style.cursor = nothing ? 'not-allowed' : '';
      btn.style.opacity = nothing ? '0.5' : '';
    });
  }

  // A fresh reversal gives the money back the way it went: Full Refund through the account
  // (or Multi Payment split) the purchase / advance was paid from
  function presetPurchaseRefund(preset) {
    if (!preset || !preset.accountId) return;
    if (getPurchaseCashVendorLedger()) return; // a cash purchase is refunded in full by its own lock
    const max = getPurchaseRefundMax(getPurchaseGrandTotal());
    if (!(max > 0)) return;
    const acc = String(preset.accountId);
    let splits = null;
    if (acc === MULTI_PAYMENT_VALUE) {
      splits = (preset.splits || []).filter(sp => sp && sp.accountId && (parseFloat(sp.amount) || 0) > 0);
      const splitTotal = splits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0);
      if (!splits.length || Math.abs(splitTotal - max) > 0.01) return; // a different amount: chosen again
    } else if (!getCashEquivalentLedgers().some(l => String(l.id) === acc)) {
      return;
    }
    setPurchasePaymentStatus('Full');
    populatePurchasePaymentAccounts(acc);
    const sel = $('purchasePaymentAccount');
    if (sel) sel.value = acc;
    _purchasePaymentAccountPrev = acc === MULTI_PAYMENT_VALUE ? '' : acc;
    if (splits) setPurchaseMultiPayments(splits);
    updatePurchaseMultiPaymentUI();
  }

  // Save Draft is for a new voucher or a draft: a posted one is changed with Save Purchase
  function refreshPurchaseDraftButton() {
    if (typeof syncDocDraftButton === 'function') {
      syncDocDraftButton('purchase', (_editingPurchaseVoucher && !_editingPurchaseVoucher.isDraft) ? _editingPurchaseVoucher.id : null);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  VENDOR — Cash and Cash Equivalents (cash purchase), Suppliers, Trade Payables ledgers
  // ══════════════════════════════════════════════════════════════════
  let _purchVendorSearchControl = null;
  function getPurchVendorSearchControl() {
    if (!_purchVendorSearchControl && typeof initPartySearchableSelect === 'function') {
      _purchVendorSearchControl = initPartySearchableSelect('purchaseVendor', '— Select Vendor —', 'Vendor / Supplier');
    }
    return _purchVendorSearchControl;
  }

  function getCashEquivalentLedgers() {
    if (typeof getSalesCashEquivalentLedgers === 'function') return getSalesCashEquivalentLedgers();
    return (typeof coaLedgers !== 'undefined' ? coaLedgers : []).filter(l => l.type === 'ledger' && l.sgId === 'sg-cce');
  }

  function populatePurchaseVendors(selectedId = null) {
    const vendorSelect = $('purchaseVendor');
    if (!vendorSelect) return;

    vendorSelect.innerHTML = '<option value="">&mdash; Select Vendor &mdash;</option>';

    // Each <optgroup> is a section of the list, as on the Sales Invoice's customer box:
    // Cash and Cash Equivalents first (a cash purchase, paid in full from that account),
    // then Suppliers, then Trade Payables ledgers
    const addParty = (group, p) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      const akaStr = p.aliases && p.aliases.length > 0 ? ` [A.K.A: ${p.aliases.join(', ')}]` : '';
      opt.textContent = p.name + akaStr;
      if (selectedId && String(p.id) === String(selectedId)) opt.selected = true;
      group.appendChild(opt);
    };
    const newGroup = label => {
      const group = document.createElement('optgroup');
      group.label = label;
      return group;
    };

    const cashGroup = newGroup('Cash and Cash Equivalents');
    getCashEquivalentLedgers().forEach(l => addParty(cashGroup, l));

    const suppGroup = newGroup('Suppliers');
    const suppliers = typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : [];
    const addedNames = new Set();
    suppliers.forEach(s => {
      addParty(suppGroup, s);
      addedNames.add((s.name || '').trim().toLowerCase());
    });

    // Ledgers created under Trade Payables in Master Desk → Ledgers
    const ledgerGroup = newGroup('Ledgers');
    if (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) {
      coaLedgers.forEach(l => {
        if (l.type === 'ledger' && l.sgId === 'sg-tp' && l.name && l.name.trim().toLowerCase() !== 'trade payables') {
          if (!addedNames.has(l.name.trim().toLowerCase())) {
            addParty(ledgerGroup, l);
            addedNames.add(l.name.trim().toLowerCase());
          }
        }
      });
    }
    [cashGroup, suppGroup, ledgerGroup].forEach(group => { if (group.children.length) vendorSelect.appendChild(group); });

    const control = getPurchVendorSearchControl();
    if (control) control.refresh();
    refreshPurchaseVendorAlterPencil();
  }

  // "Create new" at the bottom of the vendor list: a ledger under Trade Payables (coa.js).
  // `target` ({ dropdownId, onCreated, onCancelled }) is a Pre Purchase form's vendor box
  // (purchase-pre.js); none means New Purchase's own Vendor box.
  function appendPurchasePartyCreateFooter(listEl, query, target) {
    if (!listEl) return;
    const raw = (query || '').trim();
    const wrap = document.createElement('div');
    wrap.className = 'kya-party-create-footer';
    wrap.style.cssText = 'position: sticky; bottom: -8px; z-index: 5; background: #fff; border-top: 1px solid var(--slate-200); margin: 4px -8px -8px; padding: 8px 10px 10px; border-radius: 0 0 12px 12px;';
    const label = document.createElement('div');
    label.style.cssText = 'font-size: 11px; font-weight: 600; color: var(--slate-500); margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
    label.textContent = raw ? `Create "${raw}" as` : 'Create new';
    wrap.appendChild(label);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'je-drop-create-item';
    btn.style.cssText = 'width: 100%; justify-content: center; padding: 7px 10px; font-size: 12px;';
    btn.title = 'Create a ledger under Trade Payables';
    btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>Ledger</span>';
    btn.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation();
      window._purchasePartyCreateTarget = target || null;
      const dd = $((target && target.dropdownId) || 'purchaseVendorSelectDropdown');
      if (dd) dd.style.display = 'none';
      if (typeof hidePartyHoverCard === 'function') hidePartyHoverCard();
      if (typeof window.openMasterDeskCreateLedger === 'function') {
        window.openMasterDeskCreateLedger({ initialName: raw, groupVal: 'sg:sg-tp', returnTab: 'purchase_voucher', selectId: (target && target.selectId) || 'purchaseVendor' });
      }
    });
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
    wrap.appendChild(btn);
    listEl.appendChild(wrap);
  }

  window.onPartyCreatedForPurchase = function(newParty, partySource) {
    // Asked for by a Pre Purchase form: the new party goes to that form's vendor box
    const target = window._purchasePartyCreateTarget;
    window._purchasePartyCreateTarget = null;
    if (target && typeof target.onCreated === 'function') {
      if (newParty) setTimeout(() => target.onCreated(newParty, partySource), 60);
      return;
    }
    if (!newParty) return;
    populatePurchaseVendors(newParty.id);
    setTimeout(() => {
      const vendorSelect = $('purchaseVendor');
      if (vendorSelect) {
        vendorSelect.value = newParty.id;
        vendorSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const ctrl = getPurchVendorSearchControl();
      if (ctrl) ctrl.refresh();
      toast(`${partySource === 'ledger' ? 'Ledger' : 'Supplier'} "${newParty.name}" selected.`, 'success');
    }, 60);
  };

  window.onPartyCreationCancelledForPurchase = function(initialName) {
    const target = window._purchasePartyCreateTarget;
    window._purchasePartyCreateTarget = null;
    if (target && typeof target.onCancelled === 'function') {
      setTimeout(() => target.onCancelled(initialName), 60);
      return;
    }
    setTimeout(() => {
      const dropdown = $('purchaseVendorSelectDropdown');
      const searchInput = $('purchaseVendorSelectSearch');
      if (dropdown && searchInput) {
        dropdown.style.display = 'flex';
        if (initialName !== undefined && initialName !== null) {
          searchInput.value = initialName;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        searchInput.focus();
      }
    }, 60);
  };

  // Vendor box pencil: shown once a vendor (supplier or ledger) is picked
  function getPurchaseVendorMaster() {
    const val = ($('purchaseVendor') || {}).value;
    if (!val) return null;
    const supp = (typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : []).find(s => String(s.id) === String(val));
    if (supp) return { tab: 'suppliers', id: supp.id };
    if (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) {
      const l = coaLedgers.find(x => String(x.id) === String(val));
      if (l) return { tab: 'ledger', id: l.id };
    }
    return null;
  }

  function refreshPurchaseVendorAlterPencil() {
    const btn = $('btnPurchaseVendorAlter');
    const text = $('purchaseVendorSelectTriggerText');
    const show = !!getPurchaseVendorMaster();
    if (btn) btn.hidden = !show;
    // Keep a long name clear of the pencil
    if (text) {
      text.style.paddingRight = show ? '26px' : '';
      text.style.overflow = 'hidden';
      text.style.textOverflow = 'ellipsis';
      text.style.whiteSpace = 'nowrap';
    }
  }

  function onPurchaseVendorAltered(tab, record) {
    // Same vendor, refreshed name / details. The voucher's copy of the party is dropped so
    // it rebuilds from the altered master — unless it was edited for this voucher on purpose
    const ov = window._purchasePartyOverride;
    if (ov && String(ov.partyId) === String(record.id) && !ov.isOverridden) window._purchasePartyOverride = null;
    populatePurchaseVendors(record.id);
    const sel = $('purchaseVendor');
    if (sel) {
      sel.value = record.id;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    refreshPurchaseVendorAlterPencil();
  }

  // ── Cash purchase: a Cash and Cash Equivalents ledger picked as the vendor ──
  // The money goes out there and then, so the payment is always Full Payment from that same
  // account; Not Paid / Partial and Multi Payment don't apply (as on a cash sale).
  function getPurchaseCashVendorLedger() {
    const id = ($('purchaseVendor') || {}).value;
    if (!id || typeof coaLedgers === 'undefined' || !Array.isArray(coaLedgers)) return null;
    return coaLedgers.find(l => l && l.type === 'ledger' && l.sgId === 'sg-cce' && String(l.id) === String(id)) || null;
  }

  function setPurchaseCashLocked(el, locked) {
    if (!el) return;
    el.disabled = locked;
    el.style.cursor = locked ? 'not-allowed' : '';
    if (el.tagName === 'SELECT') el.style.backgroundColor = locked ? 'var(--slate-50)' : '';
    else el.style.opacity = locked ? '0.5' : '';
    if (locked) el.dataset.cashLocked = '1';
    else delete el.dataset.cashLocked;
  }

  const PURCHASE_CASH_LOCK_IDS = ['purchasePaymentStatusNotPaid', 'purchasePaymentStatusPartial', 'purchasePaymentAccount'];

  function applyPurchaseCashVendorLock() {
    const cash = getPurchaseCashVendorLedger();
    const fullBtn = $('purchasePaymentStatusFull');
    const paySel = $('purchasePaymentAccount');
    if (!cash) {
      // Another party now: undo only what this lock did
      PURCHASE_CASH_LOCK_IDS.forEach(id => {
        const el = $(id);
        if (el && el.dataset.cashLocked) setPurchaseCashLocked(el, false);
      });
      if (paySel) paySel.title = '';
      return false;
    }
    if (fullBtn && !fullBtn.classList.contains('active')) {
      fullBtn.disabled = false;
      setPurchasePaymentStatus('Full');
    }
    if (fullBtn) { fullBtn.disabled = false; fullBtn.style.cursor = ''; fullBtn.style.opacity = ''; }
    setPurchaseCashLocked($('purchasePaymentStatusNotPaid'), true);
    setPurchaseCashLocked($('purchasePaymentStatusPartial'), true);
    if (paySel) {
      if (String(paySel.value) !== String(cash.id)) {
        resetPurchaseMultiPayments();
        populatePurchasePaymentAccounts(cash.id);
        paySel.value = String(cash.id);
        updatePurchaseMultiPaymentUI();
      }
      setPurchaseCashLocked(paySel, true);
      paySel.title = `Cash purchase — paid in full from ${cash.name}`;
    }
    return true;
  }

  function populatePurchaseExecutives(selectedId = null) {
    const execSelect = $('purchaseExecutive');
    if (!execSelect) return;

    execSelect.innerHTML = '<option value="">&mdash; Select Executive &mdash;</option>';

    const emps = typeof ohEmployees !== 'undefined' ? ohEmployees : [];
    emps.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = `${e.name} (${e.code || 'EMP'})`;
      if (selectedId && e.id == selectedId) opt.selected = true;
      execSelect.appendChild(opt);
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  PAYMENT STATUS, ACCOUNTS & MULTI PAYMENT
  // ══════════════════════════════════════════════════════════════════
  function populatePurchasePaymentAccounts(selectedId = null) {
    const paySelect = $('purchasePaymentAccount');
    if (!paySelect) return;

    paySelect.innerHTML = '<option value="">&mdash; Select &mdash;</option>';
    getCashEquivalentLedgers().forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.name;
      if (selectedId && String(a.id) === String(selectedId)) opt.selected = true;
      paySelect.appendChild(opt);
    });

    const multiOpt = document.createElement('option');
    multiOpt.value = MULTI_PAYMENT_VALUE;
    multiOpt.textContent = isPurchaseReturnMode() ? 'Multi Refund' : 'Multi Payment';
    if (String(selectedId) === MULTI_PAYMENT_VALUE) multiOpt.selected = true;
    paySelect.appendChild(multiOpt);
  }

  // ── Advance carried in from a Pre Purchase document (Proforma / Purchase Order / GRN) ──
  // The advance already paid to the vendor: from the conversion in progress, or stored on
  // the voucher being edited
  function getPurchaseLinkedAdvance() {
    if (isPurchaseReturnMode()) return { amount: 0, voucherNo: '' };
    const a = _purchasePreLink && _purchasePreLink.advance;
    return { amount: a ? r2(a.amount) : 0, voucherNo: (a && a.voucherNo) || '' };
  }

  // Paid by Journal Entry against this purchase (journal-allocations.js): on the posted
  // purchase being edited, or on the Pre Purchase document it is made from. The form's payment
  // is for what is left after it.
  function getPurchaseFormJournalPaid() {
    if (isPurchaseReturnMode() || typeof window.getPurchaseJournalPaid !== 'function') return 0;
    const ed = _editingPurchaseVoucher;
    return window.getPurchaseJournalPaid({
      id: (ed && !ed.isDraft) ? ed.id : null,
      preDocKind: _purchasePreLink ? _purchasePreLink.kind : null,
      preDocId: _purchasePreLink ? _purchasePreLink.id : null
    });
  }

  // The part of the advance this purchase uses — never more than its Grand Total
  function getPurchaseAdvanceApplied(total) {
    return Math.max(0, Math.min(getPurchaseLinkedAdvance().amount, r2(total)));
  }

  // Advance paid above the bill value. While there is one, the Payment Status buttons work
  // as Not Refunded / Full Refund / Partial Refund for that excess (the supplier pays it back)
  function getPurchaseAdvanceExcess(total) {
    const excess = r2(getPurchaseLinkedAdvance().amount - r2(total));
    return excess > 0.01 ? excess : 0;
  }

  // The most the form's payment can be: the balance after the advance, or the excess to refund
  function getPurchasePaymentMax(total) {
    // A reversal: the refund its Original Doc allows
    if (isPurchaseReturnMode()) return getPurchaseRefundMax(total);
    const excess = getPurchaseAdvanceExcess(total);
    if (excess > 0) return excess;
    return Math.max(0, r2(total - getPurchaseAdvanceApplied(total) - getPurchaseFormJournalPaid()));
  }

  // Wording for the "amount adjusted" / "cannot exceed" messages
  function getPurchasePaymentLimitMessage(maxVal, total, adjusted) {
    if (isPurchaseReturnMode()) {
      return adjusted
        ? `Refund Amount adjusted to ₹${fmt(maxVal)} to not exceed the allowed refund amount.`
        : `Refund Amount cannot exceed the allowed refund amount of ₹${fmt(maxVal)}.`;
    }
    if (getPurchaseAdvanceExcess(total) > 0) {
      return adjusted
        ? `Refund Amount adjusted to ₹${fmt(maxVal)} to not exceed the excess advance.`
        : `Refund Amount cannot exceed the excess advance of ₹${fmt(maxVal)}.`;
    }
    if (getPurchaseLinkedAdvance().amount > 0) {
      return adjusted
        ? `Payment Amount adjusted to ₹${fmt(maxVal)} to not exceed the balance after the advance.`
        : `Payment Amount cannot exceed the balance of ₹${fmt(maxVal)} after the advance.`;
    }
    if (getPurchaseFormJournalPaid() > 0) {
      return adjusted
        ? `Payment Amount adjusted to ₹${fmt(maxVal)} to not exceed the balance after the Journal Entry payments.`
        : `Payment Amount cannot exceed the balance of ₹${fmt(maxVal)} after the Journal Entry payments.`;
    }
    return adjusted
      ? `Payment Amount adjusted to ₹${fmt(maxVal)} to not exceed the Grand Total.`
      : `Payment Amount cannot exceed the Grand Total of ₹${fmt(maxVal)}.`;
  }

  // Payment Status ⇄ Refund Status wording
  function setPurchasePaymentLabels(refundMode) {
    const set = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };
    set($('purchasePaymentStatusLabel'), refundMode ? 'Refund Status' : 'Payment Status');
    set($('purchasePaymentStatusNotPaid'), refundMode ? 'Not Refunded' : 'Not Paid');
    set($('purchasePaymentStatusFull'), refundMode ? 'Full Refund' : 'Full Payment');
    set($('purchasePaymentStatusPartial'), refundMode ? 'Partial Refund' : 'Partial Payment');
    set(document.querySelector('#purchasePaymentAmountField label'), refundMode ? 'Refund Amount *' : 'Payment Amount *');
    set(document.querySelector('#purchasePaymentAccountField label'), refundMode ? 'Refund Account *' : 'Payment Account *');
  }

  // The advance / balance popup appears only while the pointer (or focus) is in the
  // Payment Status box, and only when the purchase carries an advance
  function wirePurchaseAdvanceHover() {
    const payBox = $('purchasePaymentBox');
    const box = $('purchaseAdvanceInfo');
    if (!payBox || !box || payBox._advHoverWired) return;
    payBox._advHoverWired = true;
    const show = () => { if (box.dataset.active === '1') box.style.display = 'block'; };
    const hide = () => { box.style.display = 'none'; };
    payBox.addEventListener('mouseenter', show);
    payBox.addEventListener('mouseleave', hide);
    payBox.addEventListener('focusin', show);
    payBox.addEventListener('focusout', e => { if (!payBox.contains(e.relatedTarget)) hide(); });
  }

  // Advance / balance popup content for the Payment Status box; Full & Partial are off once
  // the advance pays the whole bill exactly
  function updatePurchaseAdvanceInfo(total) {
    const box = $('purchaseAdvanceInfo');
    wirePurchaseAdvanceHover();
    const t = (typeof total === 'number') ? total : getPurchaseGrandTotal();
    // A reversal shows what its Original Doc allows to be refunded instead
    if (isPurchaseReturnMode()) { updatePurchaseReversalInfo(t); return; }
    const adv = getPurchaseLinkedAdvance();
    const fullBtn = $('purchasePaymentStatusFull');
    const partBtn = $('purchasePaymentStatusPartial');
    const setLocked = (btn, locked) => {
      if (!btn || btn.dataset.cashLocked) return;
      btn.disabled = locked;
      btn.style.cursor = locked ? 'not-allowed' : '';
      btn.style.opacity = locked ? '0.5' : '';
    };
    setPurchasePaymentLabels(getPurchaseAdvanceExcess(t) > 0);
    // Paid by Journal Entry against this purchase / its Pre Purchase document
    const journal = getPurchaseFormJournalPaid();

    if (adv.amount <= 0 && journal <= 0) {
      if (box) {
        box.dataset.active = '0';
        box.style.display = 'none';
        box.innerHTML = '';
      }
      if (fullBtn && fullBtn.dataset.advLocked) { setLocked(fullBtn, false); delete fullBtn.dataset.advLocked; }
      if (partBtn && partBtn.dataset.advLocked) { setLocked(partBtn, false); delete partBtn.dataset.advLocked; }
      return;
    }

    const applied = getPurchaseAdvanceApplied(t);
    const balance = Math.max(0, r2(t - applied - journal));
    const excess = getPurchaseAdvanceExcess(t);
    const party = getPurchaseParty({ vendorId: ($('purchaseVendor') || {}).value || '' });
    const inLedger = typeof window.isPurchaseLedgerVendor === 'function' && window.isPurchaseLedgerVendor(party);
    const row = (label, value, strong) => `<div style="display: flex; justify-content: space-between; gap: 10px; margin-top: 2px;"><span>${label}</span>${strong ? `<strong>${value}</strong>` : `<span>${value}</span>`}</div>`;
    if (box) {
      box.dataset.active = '1';
      box.innerHTML = `
        ${adv.amount > 0 ? row(`Advance paid${adv.voucherNo ? ` <span style="font-family: monospace; font-weight: 700;">[${ohEsc(adv.voucherNo)}]</span>` : ''}`, `₹ ${fmt(adv.amount)}`, true) : ''}
        ${journal > 0 && excess <= 0 ? row('Paid by Journal Entry', `₹ ${fmt(journal)}`, true) : ''}
        ${excess > 0 ? `
          ${row('Purchase total', `₹ ${fmt(t)}`)}
          ${row('Excess advance', `₹ ${fmt(excess)}`, true)}
          <div style="margin-top: 4px; font-weight: 500;">Record the supplier's refund below; any part not refunded stays as an advance ${inLedger ? "in the supplier's ledger" : 'in Advances to Suppliers'}.</div>`
        : `
          ${row('Balance due', `₹ ${fmt(balance)}`, true)}
          ${balance <= 0.01
            ? `<div style="margin-top: 4px; font-weight: 500;">Fully paid by the ${adv.amount > 0 ? (journal > 0 ? 'advance and Journal Entry' : 'advance') : 'Journal Entry'} — no further payment needed.</div>`
            : '<div style="margin-top: 4px; font-weight: 500;">Payment below is for the balance only.</div>'}`}`;
    }

    // Exactly paid by the advance: nothing to pay or refund, only "Not Paid" applies
    const settled = balance <= 0.01 && excess <= 0;
    if (settled) {
      const notPaidBtn = $('purchasePaymentStatusNotPaid');
      if (notPaidBtn && !notPaidBtn.classList.contains('active')) setPurchasePaymentStatus('NotPaid');
    }
    [fullBtn, partBtn].forEach(btn => {
      if (!btn) return;
      if (settled) btn.dataset.advLocked = '1';
      else delete btn.dataset.advLocked;
      setLocked(btn, settled);
    });
  }

  // After a voucher is loaded: turn its stored payment (advance + payment) back into the
  // balance-only view the form shows (or the refund of an advance above the bill)
  function applyPurchaseAdvanceToPaymentUI(v) {
    const total = r2(v.total);
    const payAmtEl = $('purchasePaymentAmount');
    resetPurchaseMultiPayments();
    if (getPurchaseAdvanceExcess(total) > 0) {
      const refund = v.advanceRefund;
      if (refund && refund.amount > 0) {
        setPurchasePaymentStatus(refund.status === 'Full Refund' ? 'Full' : 'Partial');
        populatePurchasePaymentAccounts(refund.accountId);
        _purchasePaymentAccountPrev = refund.accountId && refund.accountId !== MULTI_PAYMENT_VALUE ? String(refund.accountId) : '';
        if (refund.accountId === MULTI_PAYMENT_VALUE) setPurchaseMultiPayments(refund.splits || []);
        if (payAmtEl) payAmtEl.value = refund.status === 'Partial Refund' ? Number(refund.amount).toFixed(2) : '';
      } else {
        setPurchasePaymentStatus('NotPaid');
        populatePurchasePaymentAccounts('');
        if (payAmtEl) payAmtEl.value = '';
      }
      updatePurchaseMultiPaymentUI();
      updatePurchaseAdvanceInfo(total);
      return;
    }
    const stored = getPurchasePaidAmount(v);
    const applied = getPurchaseAdvanceApplied(total);
    const further = Math.max(0, r2(stored - applied));
    const balance = Math.max(0, r2(total - applied - getPurchaseFormJournalPaid()));
    if (further <= 0) {
      setPurchasePaymentStatus('NotPaid');
      // The document's account / split described the advance, not a new payment
      populatePurchasePaymentAccounts(v.paymentAccountId === MULTI_PAYMENT_VALUE ? '' : v.paymentAccountId);
      if (payAmtEl) payAmtEl.value = '';
    } else {
      setPurchasePaymentStatus(further >= balance - 0.01 ? 'Full' : 'Partial');
      populatePurchasePaymentAccounts(v.paymentAccountId);
      _purchasePaymentAccountPrev = v.paymentAccountId && v.paymentAccountId !== MULTI_PAYMENT_VALUE ? String(v.paymentAccountId) : '';
      setPurchaseMultiPayments(v.paymentSplits || []);
      if (payAmtEl) payAmtEl.value = further >= balance - 0.01 ? '' : further.toFixed(2);
    }
    updatePurchaseMultiPaymentUI();
    updatePurchaseAdvanceInfo(total);
  }

  function getPurchasePaidAmount(v) {
    if (typeof window.getPurchasePaidAmount === 'function') return window.getPurchasePaidAmount(v);
    if (v.paymentStatus === 'Full Payment') return r2((parseFloat(v.paymentAmount) || 0) > 0 ? v.paymentAmount : v.total);
    if (v.paymentStatus === 'Partial Payment') return r2(v.paymentAmount);
    return 0;
  }

  function getPurchasePaymentStatus() {
    if ($('purchasePaymentStatusFull')?.classList.contains('active')) return 'Full Payment';
    if ($('purchasePaymentStatusPartial')?.classList.contains('active')) return 'Partial Payment';
    return 'Not Paid';
  }

  function setPurchasePaymentStatus(status) {
    const notPaidBtn = $('purchasePaymentStatusNotPaid');
    const fullBtn    = $('purchasePaymentStatusFull');
    const partBtn    = $('purchasePaymentStatusPartial');
    const bg         = $('purchasePaymentStatusBg');
    const dueDateField = $('purchaseDueDateField');
    const payAcctField = $('purchasePaymentAccountField');
    const payAmtField  = $('purchasePaymentAmountField');
    const wrapper = $('purchaseDueDateWrapper');
    if (!notPaidBtn || !fullBtn || !partBtn) return;

    [notPaidBtn, fullBtn, partBtn].forEach(b => b.classList.remove('active'));

    if (status === 'Full') {
      fullBtn.classList.add('active');
      if (bg) bg.className = 'sales-paystatus-bg fullpaid-active';
      if (payAcctField) payAcctField.style.display = 'flex';
      if (payAmtField) payAmtField.style.display = 'none';
      if (dueDateField) dueDateField.style.display = 'none';
      populatePurchasePaymentAccounts($('purchasePaymentAccount')?.value || ''); // keep the account already chosen
    } else if (status === 'Partial') {
      partBtn.classList.add('active');
      if (bg) bg.className = 'sales-paystatus-bg partpaid-active';
      if (payAcctField) payAcctField.style.display = 'flex';
      if (payAmtField) payAmtField.style.display = 'flex';
      if (dueDateField) dueDateField.style.display = 'flex';
      if (wrapper) {
        wrapper.style.flexDirection = 'column';
        wrapper.style.alignItems = 'flex-start';
        wrapper.style.gap = '4px';
      }
      updatePurchaseDueDateDays();
      populatePurchasePaymentAccounts($('purchasePaymentAccount')?.value || ''); // keep the account already chosen
    } else {
      notPaidBtn.classList.add('active');
      if (bg) bg.className = 'sales-paystatus-bg notpaid-active';
      if (payAcctField) payAcctField.style.display = 'none';
      if (payAmtField) payAmtField.style.display = 'none';
      if (dueDateField) dueDateField.style.display = 'flex';
      if (wrapper) {
        wrapper.style.flexDirection = 'row';
        wrapper.style.alignItems = 'center';
      }
      updatePurchaseDueDateDays();
    }
    recalculatePurchaseTotals();
  }

  function updatePurchaseDueDateDays() {
    const dateVal = ($('purchaseDate') || {}).value;
    const dueVal = ($('purchaseDueDate') || {}).value;
    const daysEl = $('purchaseDueDateDays');
    if (!daysEl) return;
    if (!dateVal || !dueVal) {
      daysEl.textContent = '';
      return;
    }
    const d1 = new Date(dateVal);
    const d2 = new Date(dueVal);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      daysEl.textContent = `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
      daysEl.style.color = 'var(--blue-600)';
    } else if (diffDays === 0) {
      daysEl.textContent = 'Due today';
      daysEl.style.color = 'var(--slate-500)';
    } else {
      daysEl.textContent = `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''}`;
      daysEl.style.color = 'var(--red-600)';
    }
  }

  function isPurchaseMultiPaymentSelected() {
    return ($('purchasePaymentAccount') || {}).value === MULTI_PAYMENT_VALUE;
  }

  // Amount that has to be distributed across the Multi Payment accounts
  function getPurchaseMultiPaymentTarget() {
    const status = getPurchasePaymentStatus();
    // Full: the Grand Total — or, with an advance, the balance after it (the excess to refund)
    if (status === 'Full Payment') return getPurchasePaymentMax(getPurchaseGrandTotal());
    if (status === 'Partial Payment') return parseFloat(($('purchasePaymentAmount') || {}).value) || 0;
    return 0;
  }

  function openPurchaseMultiPaymentModal() {
    if (typeof window.openMultiPaymentModal !== 'function') return;
    window.openMultiPaymentModal({
      typeLabel: (isPurchaseReturnMode() || getPurchaseAdvanceExcess(getPurchaseGrandTotal()) > 0) ? 'Refund' : 'Payment',
      getTarget: getPurchaseMultiPaymentTarget,
      getAccounts: getCashEquivalentLedgers,
      splits: purchaseMultiPayments,
      onSave: rows => {
        purchaseMultiPayments = rows;
        updatePurchaseMultiPaymentUI();
      },
      onCancel: () => {
        // Nothing saved yet? Fall back to the account picked before Multi Payment.
        if (purchaseMultiPayments.length === 0) {
          const paySelect = $('purchasePaymentAccount');
          if (paySelect) paySelect.value = _purchasePaymentAccountPrev || '';
        }
        updatePurchaseMultiPaymentUI();
      }
    });
  }

  // Compact recap under the Payment Account dropdown; click it to reopen the modal
  function updatePurchaseMultiPaymentUI() {
    const summaryBtn = $('purchaseMultiPaymentSummary');
    if (!summaryBtn) return;
    const accField = $('purchasePaymentAccountField');
    const accFieldVisible = accField && accField.style.display !== 'none';
    if (!accFieldVisible || !isPurchaseMultiPaymentSelected()) {
      summaryBtn.style.display = 'none';
      return;
    }
    const splits = purchaseMultiPayments.filter(sp => sp.accountId && (parseFloat(sp.amount) || 0) > 0);
    const allocated = splits.reduce((sum, sp) => sum + (parseFloat(sp.amount) || 0), 0);
    const balanced = Math.abs(getPurchaseMultiPaymentTarget() - allocated) < 0.01;
    summaryBtn.style.display = 'flex';
    summaryBtn.innerHTML = splits.length
      ? `<span>${splits.length} account${splits.length > 1 ? 's' : ''} &middot; <span style="color:${balanced ? '#059669' : '#dc2626'}">₹ ${fmt(allocated)}</span></span><span style="color:var(--blue-600);">Edit</span>`
      : `<span style="color:#dc2626;">No accounts selected</span><span style="color:var(--blue-600);">Set up</span>`;
  }

  function getPurchaseMultiPaymentSplits() {
    if (!isPurchaseMultiPaymentSelected()) return [];
    return purchaseMultiPayments
      .filter(sp => sp.accountId && (parseFloat(sp.amount) || 0) > 0)
      .map(sp => ({ accountId: sp.accountId, amount: parseFloat(sp.amount) || 0 }));
  }

  function setPurchaseMultiPayments(splits) {
    purchaseMultiPayments = (Array.isArray(splits) ? splits : []).map(sp => ({
      accountId: sp.accountId ? String(sp.accountId) : '',
      amount: (sp.amount || sp.amount === 0) ? String(sp.amount) : ''
    }));
  }

  function resetPurchaseMultiPayments() {
    purchaseMultiPayments = [];
    _purchasePaymentAccountPrev = '';
    if (typeof window.closeMultiPaymentModal === 'function' && typeof window.isMultiPaymentModalOpen === 'function' && window.isMultiPaymentModalOpen()) {
      window.closeMultiPaymentModal();
    }
    const summaryBtn = $('purchaseMultiPaymentSummary');
    if (summaryBtn) summaryBtn.style.display = 'none';
  }

  // ══════════════════════════════════════════════════════════════════
  //  LINE ITEMS — the Sales Invoice's rows (.sales-row-* classes and shared pickers)
  // ══════════════════════════════════════════════════════════════════
  function renderPurchaseHeaders() {
    const hdr = $('purchaseTableHeader');
    if (!hdr) return;
    hdr.innerHTML = `
      <th class="col-item" style="text-align: left; padding-left: 8px;">Description (Product / Expense)</th>
      <th class="col-hsn" style="width: 90px; text-align: left;">HSN/SAC</th>
      <th class="col-qty" style="width: 65px; text-align: right;">Qty</th>
      <th class="col-unit" style="width: 65px; text-align: center;">Unit</th>
      <th class="col-rate" style="width: 100px; text-align: right;">Rate / Price</th>
      <th class="col-disc" style="width: 105px; text-align: right;">Discount</th>
      <th class="col-tax" style="width: 75px; text-align: right; padding-right: 6px;">Tax</th>
      <th class="col-amt" style="width: 110px; text-align: right; padding-right: 8px;">Amount</th>
      <th class="col-del" style="width: 36px; text-align: center;"></th>
    `;
  }

  function renderPurchaseRows() {
    renderPurchaseHeaders();
    const body = $('purchaseItemBody');
    if (!body) return;
    body.innerHTML = '';

    const isZeroTax = isPurchaseZeroTaxSupply();
    const rowLock = getPurchaseReturnRowLock();

    purchaseRows.forEach((row, index) => {
      if (isZeroTax) {
        row.tax = 0;
        const base = (row.qty || 1) * (row.rate || 0);
        const discAmt = row.discountType === 'pct' ? (base * ((row.discount || 0) / 100)) : (row.discount || 0);
        row.amount = Math.max(0, base - discAmt);
      }

      const trHtml = `
        <tr class="sales-row" data-row-index="${index}">
          <td class="sales-cell-item" style="padding: 4px 8px;">
            <div style="position: relative; display: flex; align-items: center; width: 100%;">
              <input type="text" class="sales-row-item je-input" value="${ohEsc(row.item || '')}" placeholder="Select or type Description (Product / Expense)" style="border: none; background: transparent; box-shadow: none; padding: 0 18px 0 0; width: 100%; font-weight: 600; font-size: 13px; color: var(--slate-800); outline: none;" autocomplete="off" />
              <span class="sales-row-drop-arrow" style="position: absolute; right: 2px; pointer-events: none; color: var(--slate-400); font-size: 10px;">▼</span>
            </div>
          </td>
          <td class="sales-cell-hsn" style="width: 90px; padding: 4px 6px;">
            <div style="position: relative; display: flex; align-items: center; width: 100%;">
              <input type="text" class="sales-row-hsn je-input" value="${ohEsc(row.hsn || '')}" placeholder="HSN/SAC" title="${ohEsc(row.hsnDesc || 'Search the HSN / SAC code master')}" style="border: none; background: transparent; box-shadow: none; padding: 0 14px 0 0; font-size: 12.5px; font-family: monospace, inherit; font-weight: 600; color: var(--slate-700); outline: none; width: 100%;" autocomplete="off" />
              <span class="sales-row-drop-arrow" style="position: absolute; right: 0; pointer-events: none; color: var(--slate-400); font-size: 9px;">▼</span>
            </div>
          </td>
          <td class="sales-cell-qty" style="width: 65px; padding: 4px 6px;">
            <input type="number" class="sales-row-qty je-input" value="${row.qty !== undefined ? row.qty : 1}" min="0" style="border: none; background: transparent; box-shadow: none; text-align: right; padding: 0; font-weight: 600; font-size: 13px; color: var(--slate-800); outline: none; width: 100%;" />
          </td>
          <td class="sales-cell-unit" style="width: 65px; padding: 4px 6px; text-align: center;">
            <input type="text" class="sales-row-unit je-input" value="${ohEsc(row.unit || '')}" placeholder="Unit" style="border: none; background: transparent; box-shadow: none; text-align: center; padding: 0; font-weight: 600; text-transform: uppercase; font-size: 12px; color: var(--slate-700); outline: none; width: 100%;" />
          </td>
          <td class="sales-cell-rate" style="width: 100px; padding: 4px 6px;">
            <input type="text" inputmode="decimal" class="sales-row-rate je-input" value="${row.rate === 0 || row.rate === undefined ? '' : (typeof row.rate === 'number' ? row.rate.toFixed(2) : row.rate)}" placeholder="0.00" style="border: none; background: transparent; box-shadow: none; text-align: right; padding: 0; font-weight: 600; font-size: 13px; color: var(--slate-800); outline: none; width: 100%;" />
          </td>
          <td class="sales-cell-disc" style="width: 105px; padding: 4px 6px;">
            <div style="display: flex; gap: 2px; align-items: center; justify-content: flex-end;">
              <input type="text" inputmode="decimal" class="sales-row-discount je-input" value="${row.discount === 0 || row.discount === undefined ? '' : (typeof row.discount === 'number' ? row.discount.toFixed(2) : row.discount)}" placeholder="0.00" style="border: none; background: transparent; box-shadow: none; text-align: right; width: 55px; padding: 0; font-weight: 600; font-size: 13px; color: var(--slate-800); outline: none;" />
              <select class="sales-row-discount-type je-input" style="border: none; background: transparent; box-shadow: none; width: 22px; padding: 0; font-weight: 700; cursor: pointer; text-align: center; text-align-last: center; -webkit-appearance: none; -moz-appearance: none; appearance: none; font-size: 12px; color: var(--blue-600); outline: none;">
                <option value="val" ${row.discountType === 'val' || !row.discountType ? 'selected' : ''}>₹</option>
                <option value="pct" ${row.discountType === 'pct' ? 'selected' : ''}>%</option>
              </select>
            </div>
          </td>
          <td class="sales-cell-tax" style="width: 75px; padding: 4px 6px;">
            <select class="sales-row-tax je-input" style="border: none; background: transparent; box-shadow: none; text-align: right; text-align-last: right; padding-right: 2px; font-weight: 600; font-size: 12.5px; color: var(--slate-800); width: 100%; outline: none; cursor: pointer;" ${isZeroTax ? 'disabled' : ''}>
              <option value="0" ${row.tax === 0 ? 'selected' : ''}>0%</option>
              <option value="5" ${row.tax === 5 ? 'selected' : ''}>5%</option>
              <option value="12" ${row.tax === 12 ? 'selected' : ''}>12%</option>
              <option value="18" ${row.tax === 18 || row.tax === undefined ? 'selected' : ''}>18%</option>
              <option value="28" ${row.tax === 28 ? 'selected' : ''}>28%</option>
            </select>
          </td>
          <td class="sales-cell-amt" style="width: 110px; padding: 4px 6px;">
            <input type="text" inputmode="decimal" class="sales-row-amount-input je-input" value="${row.amount === 0 || row.amount === undefined ? '' : Number(row.amount).toFixed(2)}" placeholder="0.00" style="border: none; background: transparent; box-shadow: none; text-align: right; padding: 0; font-weight: 700; width: 100%; font-size: 13.5px; color: var(--slate-900); outline: none;" />
          </td>
          <td class="sales-del-cell" style="width: 36px; padding: 2px; text-align: center; border: none !important; background: transparent !important; box-shadow: none !important;">
            <button type="button" class="sales-del-row purchase-del-row" style="background: none; border: none !important; outline: none !important; box-shadow: none !important; color: var(--red-600); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; margin: 0 auto; transition: background 0.15s;" onmouseover="this.style.backgroundColor='var(--red-50)'" onmouseout="this.style.backgroundColor='transparent'">
              <svg viewBox="0 0 15 15" fill="none" style="width: 13px; height: 13px;">
                <path d="M5.5 2h4M1.5 4h12M2.5 4l1 9.5a1 1 0 001 .5h6a1 1 0 001-.5l1-9.5M5.5 6.5v5M9.5 6.5v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
            </button>
          </td>
        </tr>
      `;

      const tempBody = document.createElement('tbody');
      tempBody.innerHTML = trHtml;
      const tr = tempBody.firstElementChild;
      body.appendChild(tr);

      // A reversal: its lines are the Original Doc's — locked before any picker is attached
      if (rowLock !== 'none') {
        lockPurchaseReturnRow(tr, rowLock);
        return;
      }

      // Description: Stock Items (at cost) and Expense ledgers, with Create / ✎ Alter
      const itemInp = tr.querySelector('.sales-row-item');
      if (itemInp && typeof _salesItemPortal !== 'undefined') {
        const attachPortal = () => {
          _salesItemPortal.open(itemInp, itemInp.value, (selectedItem) => {
            itemInp.value = selectedItem.name;
            applyPurchaseMasterItemToRow(index, tr, selectedItem);
          }, { purchase: true });
        };
        itemInp.addEventListener('focus', attachPortal);
        itemInp.addEventListener('click', attachPortal);
        itemInp.addEventListener('input', () => {
          purchaseRows[index].item = itemInp.value;
          if (!itemInp.value.trim() && typeof window.clearVoucherRowItemLink === 'function') {
            window.clearVoucherRowItemLink(purchaseRows[index], tr);
            recalculatePurchaseTotals();
          }
          attachPortal();
        });
        if (typeof handlePortalKeydown === 'function') {
          itemInp.addEventListener('keydown', e => handlePortalKeydown(e, _salesItemPortal));
        }
      }

      const hsnInp = tr.querySelector('.sales-row-hsn');
      if (hsnInp && typeof window.attachVoucherRowCodePicker === 'function') {
        window.attachVoucherRowCodePicker(hsnInp, () => purchaseRows[index]);
      }
      if (typeof window.attachVoucherRowUnitPicker === 'function') {
        window.attachVoucherRowUnitPicker(tr.querySelector('.sales-row-unit'));
      }
      if (typeof window.attachVoucherRowAlterButtons === 'function') {
        window.attachVoucherRowAlterButtons(tr, () => purchaseRows[index]);
      }
    });
  }

  function applyPurchaseMasterItemToRow(index, tr, selectedItem) {
    const row = purchaseRows[index];
    if (!row) return;
    if (typeof window.applyMasterItemToVoucherRow === 'function') {
      window.applyMasterItemToVoucherRow(row, tr, selectedItem, { zeroTax: isPurchaseZeroTaxSupply() });
    } else {
      row.item = selectedItem.name;
      row.itemType = selectedItem.type;
    }
    if (tr) updatePurchaseRowFromDOM(index, tr, 'item');
    recalculatePurchaseTotals();
  }

  function updatePurchaseRowFromDOM(index, tr, triggeredBy) {
    const row = purchaseRows[index];
    if (!row) return;

    const amtInput = tr.querySelector('.sales-row-amount-input');
    const amountEdited = (triggeredBy === 'amount');

    const itemEl = tr.querySelector('.sales-row-item');
    if (itemEl) row.item = itemEl.value;
    const hsnEl = tr.querySelector('.sales-row-hsn');
    if (hsnEl) row.hsn = hsnEl.value;
    const unitEl = tr.querySelector('.sales-row-unit');
    if (unitEl) row.unit = unitEl.value;

    let qty = parseFloat(tr.querySelector('.sales-row-qty')?.value) || 0;
    let rate = Math.round(parsePurchaseAmt(tr.querySelector('.sales-row-rate')?.value || '0') * 100) / 100;
    let discount = parsePurchaseAmt(tr.querySelector('.sales-row-discount')?.value || '0');
    row.discountType = tr.querySelector('.sales-row-discount-type')?.value || 'val';
    row.tax = parseFloat(tr.querySelector('.sales-row-tax')?.value) || 0;

    // A reversal line covers at most what is left of its purchase line
    if (isPurchaseReturnMode() && row.origQty !== undefined) {
      if (qty > row.origQty) {
        qty = row.origQty;
        const qtyInput = tr.querySelector('.sales-row-qty');
        if (qtyInput) qtyInput.value = qty;
        toast(`Quantity cannot exceed remaining quantity of ${row.origQty}.`, 'warning');
      }
      const origDiscount = parseFloat(row.origDiscount) || 0;
      if (discount > origDiscount) {
        discount = origDiscount;
        const discInput = tr.querySelector('.sales-row-discount');
        if (discInput) discInput.value = discount === 0 ? '' : discount;
      }
    }

    if (amountEdited) {
      const enteredAmount = Math.round(parsePurchaseAmt(amtInput.value) * 100) / 100;
      if (amtInput && document.activeElement !== amtInput) {
        amtInput.value = enteredAmount === 0 ? '' : enteredAmount.toFixed(2);
      }
      const taxFactor = 1 + row.tax / 100;
      const afterDiscount = enteredAmount / taxFactor;
      let base;
      if (row.discountType === 'pct') {
        const pctFactor = 1 - (discount / 100);
        base = pctFactor > 0 ? afterDiscount / pctFactor : 0;
      } else {
        base = afterDiscount + discount;
      }
      rate = Math.round((qty > 0 ? base / qty : 0) * 100) / 100;
      row.qty = qty;
      row.rate = rate;
      row.discount = discount;
      row.amount = enteredAmount;
      const rateInput = tr.querySelector('.sales-row-rate');
      if (rateInput && document.activeElement !== rateInput) {
        rateInput.value = rate === 0 ? '' : rate.toFixed(2);
      }
    } else {
      row.qty = qty;
      row.rate = rate;
      row.discount = discount;
      const base = row.qty * row.rate;
      const discAmt = row.discountType === 'pct' ? (base * (row.discount / 100)) : row.discount;
      const afterDiscount = Math.max(0, base - discAmt);
      const taxAmt = afterDiscount * (row.tax / 100);
      row.amount = Math.round((afterDiscount + taxAmt) * 100) / 100;
      if (amtInput && document.activeElement !== amtInput) {
        amtInput.value = row.amount === 0 ? '' : row.amount.toFixed(2);
      }
    }

    recalculatePurchaseTotals();
  }

  function addPurchaseRow() {
    purchaseRows.push(newPurchaseRow());
    renderPurchaseRows();
    recalculatePurchaseTotals();
  }

  // Reads every row back from the table before a save
  function syncPurchaseRowsFromDOM() {
    const body = $('purchaseItemBody');
    if (!body) return;
    body.querySelectorAll('tr.sales-row').forEach((tr, index) => {
      if (!purchaseRows[index]) purchaseRows[index] = newPurchaseRow();
      const row = purchaseRows[index];
      const val = sel => tr.querySelector(sel);
      if (val('.sales-row-item')) row.item = val('.sales-row-item').value;
      if (val('.sales-row-hsn')) row.hsn = val('.sales-row-hsn').value;
      if (val('.sales-row-unit')) row.unit = val('.sales-row-unit').value;
      if (val('.sales-row-qty') && val('.sales-row-qty').value !== '') row.qty = parseFloat(val('.sales-row-qty').value) || 0;
      if (val('.sales-row-rate') && val('.sales-row-rate').value !== '') row.rate = parsePurchaseAmt(val('.sales-row-rate').value) || 0;
      if (val('.sales-row-discount') && val('.sales-row-discount').value !== '') row.discount = parsePurchaseAmt(val('.sales-row-discount').value) || 0;
      if (val('.sales-row-discount-type')) row.discountType = val('.sales-row-discount-type').value || 'val';
      if (val('.sales-row-tax')) row.tax = parseFloat(val('.sales-row-tax').value) || 0;
      const amtEl = val('.sales-row-amount-input');
      if (amtEl && amtEl.value !== '') {
        row.amount = parsePurchaseAmt(amtEl.value) || 0;
      } else {
        const base = (row.qty || 1) * (row.rate || 0);
        const discAmt = row.discountType === 'pct' ? (base * ((row.discount || 0) / 100)) : (row.discount || 0);
        row.amount = Math.round((Math.max(0, base - discAmt) * (1 + (row.tax || 0) / 100)) * 100) / 100;
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  TOTALS — TDS / TCS as per law: TDS on the value before GST (CBDT Circular 23/2017),
  //  TCS on the full bill value including GST (Circular 17/2020)
  // ══════════════════════════════════════════════════════════════════
  function calculatePurchaseSubtotal() {
    return r2(purchaseRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0));
  }

  function getPurchaseTaxableTotal() {
    if (typeof getPurchaseLineFigures !== 'function') return calculatePurchaseSubtotal();
    return r2(purchaseRows.reduce((sum, r) => sum + getPurchaseLineFigures(r).taxable, 0));
  }

  function getPurchaseTdsTcsMode() {
    if ($('purchaseTdsTcsTds')?.classList.contains('active')) return 'TDS';
    if ($('purchaseTdsTcsTcs')?.classList.contains('active')) return 'TCS';
    return 'None';
  }

  function getPurchaseTdsTcsRate() {
    if (getPurchaseTdsTcsMode() === 'None') return 0;
    const rateSelect = $('purchaseTdsTcsRateSelect');
    if (!rateSelect) return 0;
    if (rateSelect.value === 'custom') return parseFloat(($('purchaseTdsTcsRateCustom') || {}).value) || 0;
    return parseFloat(rateSelect.value) || 0;
  }

  function getPurchaseTdsTcsBase(mode) {
    return mode === 'TDS' ? getPurchaseTaxableTotal() : calculatePurchaseSubtotal();
  }

  function getPurchaseGrandTotal() {
    const subTotal = calculatePurchaseSubtotal();
    const mode = getPurchaseTdsTcsMode();
    const tdsTcsAmount = parseFloat(($('purchaseTdsTcsAmount') || {}).value) || 0;
    const adjustments = parseFloat(($('purchaseAdjustments') || {}).value) || 0;
    let total = subTotal;
    if (mode === 'TDS') total = subTotal - tdsTcsAmount;
    else if (mode === 'TCS') total = subTotal + tdsTcsAmount;
    return r2(total + adjustments);
  }

  function recalculatePurchaseTotals() {
    const subTotal = calculatePurchaseSubtotal();
    const subTotalEl = $('purchaseSubTotal');
    if (subTotalEl) subTotalEl.textContent = '₹ ' + fmt(subTotal);

    const mode = getPurchaseTdsTcsMode();
    const rateSelect = $('purchaseTdsTcsRateSelect');
    const customWrap = $('purchaseTdsTcsRateCustomWrap');
    const customInput = $('purchaseTdsTcsRateCustom');
    let rate = 0;
    if (mode !== 'None' && rateSelect) {
      if (rateSelect.value === 'custom') {
        if (customWrap) customWrap.style.display = 'flex';
        rate = customInput ? (parseFloat(customInput.value) || 0) : 0;
      } else {
        if (customWrap) customWrap.style.display = 'none';
        rate = parseFloat(rateSelect.value) || 0;
      }
    }

    const amountInput = $('purchaseTdsTcsAmount');
    const base = getPurchaseTdsTcsBase(mode);
    // Amount is editable only for a Custom rate; preset rates derive it from the base
    const isCustomRate = !!rateSelect && rateSelect.value === 'custom';
    if (amountInput) {
      amountInput.readOnly = !isCustomRate;
      amountInput.title = isCustomRate ? '' : 'Select "Custom" rate to edit the amount';
    }
    // Custom rate with a typed amount: the amount drives the percentage instead
    const isManualAmount = isCustomRate && !!amountInput && amountInput.dataset.manual === '1';
    if (isManualAmount && mode !== 'None') {
      const manualAmt = parseFloat(amountInput.value) || 0;
      if (customInput && base > 0) {
        rate = Math.round((manualAmt / base) * 100 * 100) / 100;
        customInput.value = rate ? String(rate) : '';
      }
    } else if (amountInput && !(isCustomRate && document.activeElement === amountInput)) {
      amountInput.value = mode !== 'None' ? r2(base * (rate / 100)).toFixed(2) : '';
    }

    const adjustmentsInput = $('purchaseAdjustments');
    const adjustments = adjustmentsInput ? (parseFloat(adjustmentsInput.value) || 0) : 0;
    const btnAuto = $('btnPurchaseAutoRoundOff');
    if (btnAuto) {
      if (adjustmentsInput && adjustmentsInput.value.trim() !== '' && adjustments !== 0) btnAuto.classList.add('active');
      else if (!adjustmentsInput || adjustmentsInput.value.trim() === '') btnAuto.classList.remove('active');
    }

    const total = getPurchaseGrandTotal();
    const totalEl = $('purchaseTotal');
    if (totalEl) totalEl.textContent = '₹ ' + fmt(total);

    // The payment can never be more than the Grand Total (with an advance: the balance after
    // it, or the excess to refund)
    const payAmtEl = $('purchasePaymentAmount');
    const payMax = getPurchasePaymentMax(total);
    if (payAmtEl && payAmtEl.value && total > 0) {
      const currentVal = parseFloat(payAmtEl.value) || 0;
      if (currentVal > payMax) {
        payAmtEl.value = payMax.toFixed(2);
        toast(getPurchasePaymentLimitMessage(payMax, total, true), 'warning');
      }
    }

    // A cash purchase stays Full Payment from its own account
    applyPurchaseCashVendorLock();
    updatePurchaseMultiPaymentUI();
    // An advance carried in from a Pre Purchase document: the balance / refund popup
    updatePurchaseAdvanceInfo(total);
  }

  // Round off: rounds the total to the nearest rupee; clicking again takes it off
  function autoCalculatePurchaseRoundOff() {
    const btnAuto = $('btnPurchaseAutoRoundOff');
    const adjEl = $('purchaseAdjustments');
    if (btnAuto && btnAuto.classList.contains('active') && adjEl && adjEl.value.trim() !== '') {
      adjEl.value = '';
      btnAuto.classList.remove('active');
      recalculatePurchaseTotals();
      return;
    }
    const subTotal = calculatePurchaseSubtotal();
    const mode = getPurchaseTdsTcsMode();
    const tdsTcsAmount = parsePurchaseAmt(($('purchaseTdsTcsAmount') || {}).value) || 0;
    let rawTotal = subTotal;
    if (mode === 'TDS') rawTotal = subTotal - tdsTcsAmount;
    else if (mode === 'TCS') rawTotal = subTotal + tdsTcsAmount;
    const roundOffAmt = Math.round((Math.round(rawTotal) - rawTotal) * 100) / 100;
    if (adjEl) {
      adjEl.value = roundOffAmt === 0 ? '' : roundOffAmt.toFixed(2);
      if (btnAuto) btnAuto.classList.add('active');
      recalculatePurchaseTotals();
    }
  }

  // TDS / TCS toggle: None / TDS / TCS
  function setPurchaseTdsTcs(mode) {
    const noneBtn = $('purchaseTdsTcsNone');
    const tdsBtn  = $('purchaseTdsTcsTds');
    const tcsBtn  = $('purchaseTdsTcsTcs');
    const bg      = $('purchaseTdsTcsBg');
    const amtRow  = $('purchaseTdsTcsAmountRow');
    const lbl     = $('purchaseTdsTcsAmountLabel');
    const amtInp  = $('purchaseTdsTcsAmount');
    if (!noneBtn || !tdsBtn || !tcsBtn) return;

    [noneBtn, tdsBtn, tcsBtn].forEach(b => b.classList.remove('active'));
    if (mode === 'TDS') {
      tdsBtn.classList.add('active');
      if (bg) bg.className = 'sales-tdstcs-bg tds-active';
      if (amtRow) amtRow.style.display = 'block';
      if (lbl) lbl.textContent = 'TDS';
    } else if (mode === 'TCS') {
      tcsBtn.classList.add('active');
      if (bg) bg.className = 'sales-tdstcs-bg tcs-active';
      if (amtRow) amtRow.style.display = 'block';
      if (lbl) lbl.textContent = 'TCS';
    } else {
      noneBtn.classList.add('active');
      if (bg) bg.className = 'sales-tdstcs-bg none-active';
      if (amtRow) amtRow.style.display = 'none';
      if (amtInp) {
        amtInp.value = '';
        delete amtInp.dataset.manual;
      }
    }
    recalculatePurchaseTotals();
  }

  // ══════════════════════════════════════════════════════════════════
  //  DOCUMENT ATTACHMENT
  // ══════════════════════════════════════════════════════════════════
  function formatPurchaseDocBytes(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Older vouchers kept the file as { name, size, dataUrl }
  function normalizePurchaseDoc(doc) {
    if (!doc) return null;
    if (doc.fileData) return doc;
    if (doc.dataUrl) return { fileName: doc.name || 'Attachment', fileSize: doc.size || '', fileBytes: 0, fileData: doc.dataUrl };
    return null;
  }

  function updatePurchaseDocUI(doc) {
    const emptyState = $('purchaseDocEmptyState');
    const selectedState = $('purchaseDocSelectedState');
    const badge = $('purchaseDocStatusBadge');
    const nameEl = $('purchaseDocFileName');
    const sizeEl = $('purchaseDocFileSize');
    const iconEl = $('purchaseDocFileIcon');
    const previewBtn = $('purchaseDocPreviewBtn');
    const fileInp = $('purchaseDocFileInput');

    doc = normalizePurchaseDoc(doc);
    if (!doc) {
      purchaseUploadedDoc = null;
      if (emptyState) emptyState.style.display = 'flex';
      if (selectedState) selectedState.style.display = 'none';
      if (badge) badge.style.display = 'none';
      if (fileInp) fileInp.value = '';
      return;
    }

    purchaseUploadedDoc = doc;
    if (emptyState) emptyState.style.display = 'none';
    if (selectedState) selectedState.style.display = 'flex';
    if (badge) badge.style.display = 'inline-block';
    if (nameEl) nameEl.textContent = doc.fileName || 'Attachment';
    if (sizeEl) sizeEl.textContent = doc.fileSize || formatPurchaseDocBytes(doc.fileBytes || 0);

    const ext = (doc.fileName || '').split('.').pop().toUpperCase();
    if (iconEl) {
      iconEl.textContent = ext.substring(0, 4) || 'DOC';
      if (['PDF'].includes(ext)) {
        iconEl.style.background = '#fee2e2'; iconEl.style.color = '#991b1b';
      } else if (['JPG', 'JPEG', 'PNG', 'WEBP'].includes(ext)) {
        iconEl.style.background = '#e0e7ff'; iconEl.style.color = '#3730a3';
      } else if (['XLS', 'XLSX', 'CSV'].includes(ext)) {
        iconEl.style.background = '#dcfce7'; iconEl.style.color = '#166534';
      } else {
        iconEl.style.background = '#dbeafe'; iconEl.style.color = '#1e40af';
      }
    }
    if (previewBtn) {
      previewBtn.href = doc.fileData;
      previewBtn.download = doc.fileName || 'document';
    }
  }

  function handlePurchaseDocUpload(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast('File size exceeds 10MB limit.', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      updatePurchaseDocUI({
        fileName: file.name,
        fileSize: formatPurchaseDocBytes(file.size),
        fileBytes: file.size,
        fileData: e.target.result
      });
      toast(`Document "${file.name}" attached.`, 'success');
    };
    reader.readAsDataURL(file);
  }

  // ══════════════════════════════════════════════════════════════════
  //  FORM INIT / LOAD
  // ══════════════════════════════════════════════════════════════════
  // opts.keepEditing: stay on the draft being edited (the Pre Purchase No. box's × clears
  // what a document filled in, but the draft is still the same draft)
  function initPurchaseForm(opts) {
    const keep = (opts && opts.keepEditing && _editingPurchaseVoucher && _editingPurchaseVoucher.isDraft) ? _editingPurchaseVoucher : null;
    _editingPurchaseVoucher = null;
    _purchasePreLink = null;
    // A reversal starts with no Original Doc (the mode — purchase or reversal — is kept)
    _purchaseReturnSource = null;
    if (typeof window.closePurchaseOriginalDocList === 'function') window.closePurchaseOriginalDocList();
    updatePurchaseModeUI();
    window._purchasePartyOverride = null;
    if (typeof hidePartyHoverCard === 'function') hidePartyHoverCard();
    // Clear the last voucher's payment amount first: the resets below recalculate the
    // totals, and a leftover amount would be "adjusted" with a warning
    const staleAmtEl = $('purchasePaymentAmount');
    if (staleAmtEl) staleAmtEl.value = '';

    const today = localToday();
    if ($('purchaseDate')) $('purchaseDate').value = today;
    if ($('purchaseDueDate')) $('purchaseDueDate').value = today;

    const invNo = getNextPurchaseInvoiceNo();
    if ($('purchaseInvoiceNo')) $('purchaseInvoiceNo').value = invNo;
    if ($('purchaseVoucherChipDisplay')) $('purchaseVoucherChipDisplay').textContent = invNo;
    if (typeof refreshDocNoPlaceholder === 'function') refreshDocNoPlaceholder('purchase');
    // A reversal has no number until its Original Doc is chosen
    if (isPurchaseReturnMode()) refreshPurchaseReversalNo(true);

    if ($('purchaseNotes')) $('purchaseNotes').value = '';
    if ($('purchaseAdjustments')) $('purchaseAdjustments').value = '';

    const rateSelect = $('purchaseTdsTcsRateSelect');
    if (rateSelect) rateSelect.value = '1';
    if ($('purchaseTdsTcsRateCustom')) $('purchaseTdsTcsRateCustom').value = '';
    if ($('purchaseTdsTcsRateCustomWrap')) $('purchaseTdsTcsRateCustomWrap').style.display = 'none';

    populatePurchaseVendors();
    populatePurchaseExecutives();
    if ($('purchaseExecutive')) $('purchaseExecutive').value = '';
    if ($('purchaseSupplyType')) $('purchaseSupplyType').value = 'Intra-State (CGST + SGST)';

    // A cash purchase may have locked these; the lock is applied again when it applies
    PURCHASE_CASH_LOCK_IDS.forEach(id => setPurchaseCashLocked($(id), false));
    populatePurchasePaymentAccounts();
    if ($('purchasePaymentAccount')) $('purchasePaymentAccount').value = '';
    if ($('purchasePaymentAmount')) $('purchasePaymentAmount').value = '';
    resetPurchaseMultiPayments();

    if (typeof _salesCodePortal !== 'undefined') _salesCodePortal.close();
    if (typeof _salesItemPortal !== 'undefined') _salesItemPortal.close();
    purchaseRows = [newPurchaseRow()];
    renderPurchaseRows();

    setPurchaseTdsTcs('None');
    setPurchasePaymentStatus('NotPaid');
    updatePurchaseDocUI(null);
    // Vendor, supply type, Purchaser and TDS / TCS are fixed on a reversal (from its Original Doc)
    setPurchaseReturnFieldLocks();
    if (keep) _editingPurchaseVoucher = keep;
    validatePurchaseNoField();
    refreshPurchaseDraftButton();
    refreshPurchaseVendorAlterPencil();
    recalculatePurchaseTotals();
    // Pre Purchase No. box: empty again, and the vendor unlocked (purchase-pre-picker.js)
    if (typeof window.refreshPurchasePrePicker === 'function') window.refreshPurchasePrePicker();
  }

  function findStoredPurchase(id) {
    const S = window.KYA_STORE || {};
    const posted = (S.purchaseVouchers || []).find(v => String(v.id) === String(id));
    if (posted) return { v: posted, isDraft: false };
    const draft = (S.purchaseVouchersDrafts || []).find(v => String(v.id) === String(id));
    if (draft) return { v: draft, isDraft: true };
    return null;
  }

  // Opens a stored purchase (posted or draft) on the form. Takes the voucher or its id.
  function loadPurchaseVoucher(vOrId, isDraft = false) {
    // The screen it is opened from (see returnFromPurchaseEdit)
    const fromTab = (typeof activeTabId !== 'undefined') ? activeTabId : null;
    let v = vOrId;
    if (v === null || v === undefined) return;
    if (typeof v !== 'object') {
      const found = findStoredPurchase(v);
      if (!found) {
        toast('Purchase voucher not found.', 'warning');
        return;
      }
      v = found.v;
      isDraft = found.isDraft;
    }
    v = JSON.parse(JSON.stringify(v));

    const store = window.KYA_STORE || {};
    const editIsPosted = !isDraft && (store.purchaseVouchers || []).some(x => String(x.id) === String(v.id));
    const editIsDraft = isDraft && (store.purchaseVouchersDrafts || []).some(x => String(x.id) === String(v.id));
    // A reversal opens the form as Purchase Reversal
    _purchaseMode = v.isReturn ? 'Return' : 'Purchase';
    initPurchaseForm();
    // The form may be behind a Pre Purchase card (purchase-pre.js)
    if (typeof window.showPurchaseFormCard === 'function') window.showPurchaseFormCard();
    _editingPurchaseVoucher = (editIsPosted || editIsDraft) ? { id: v.id, isDraft: !!isDraft } : null;
    // Opened for editing from another screen (Voucher Desk, a statement, Cashline…): Save,
    // Save Draft or Clear goes back there
    if (_editingPurchaseVoucher && fromTab && fromTab !== 'purchase_voucher') _editingPurchaseVoucher.returnTo = fromTab;
    // A reversal's Original Doc: a fresh one carries it as returnSource; a stored one keeps
    // the purchase it reverses (returnAgainstId) or the Pre Purchase document (reversedPreDoc)
    if (v.isReturn) {
      if (v.returnSource) {
        _purchaseReturnSource = JSON.parse(JSON.stringify(v.returnSource));
      } else if (v.reversedPreDoc) {
        _purchaseReturnSource = Object.assign({ type: 'pre' }, JSON.parse(JSON.stringify(v.reversedPreDoc)));
      } else if (v.returnAgainstId || v.returnAgainstInvoice) {
        const orig = (store.purchaseVouchers || []).find(x => !x.isReturn && (String(x.id) === String(v.returnAgainstId)
          || (!v.returnAgainstId && String(x.invoiceNo || '').toLowerCase() === String(v.returnAgainstInvoice || '').toLowerCase())));
        _purchaseReturnSource = { type: 'purchase', id: orig ? orig.id : v.returnAgainstId, no: v.returnAgainstInvoice || (orig && orig.invoiceNo) || '', date: orig ? orig.date : '' };
      }
      updatePurchaseModeUI();
    }
    window._purchasePartyOverride = v.partyOverride ? JSON.parse(JSON.stringify(v.partyOverride)) : null;
    // Made from a Pre Purchase document: the link, and the advance paid against it
    _purchasePreLink = (v.preDocKind && v.preDocId !== undefined && v.preDocId !== null && v.preDocId !== '') ? {
      kind: v.preDocKind,
      id: v.preDocId,
      advance: {
        amount: r2(v.advancePaidAmount),
        journalEntryId: v.advanceJournalEntryId || null,
        voucherNo: v.advanceVoucherNo || null
      }
    } : null;

    if ($('purchaseDate')) $('purchaseDate').value = v.date || localToday();
    if ($('purchaseDueDate')) $('purchaseDueDate').value = v.dueDate || v.date || localToday();

    // A draft whose number was taken meanwhile (posted on another voucher) gets the next free one
    const storedNo = (v.invoiceNo && v.invoiceNo.trim() && v.invoiceNo.trim() !== 'Draft') ? v.invoiceNo.trim() : '';
    const noTaken = editIsDraft && !!storedNo && typeof isDocNoUsed === 'function' && isDocNoUsed(getPurchaseNumberKind(), storedNo, v.id);
    const invNoEl = $('purchaseInvoiceNo');
    if (invNoEl) invNoEl.value = (storedNo && !noTaken) ? storedNo : getNextPurchaseInvoiceNo();
    // A reversal's number follows its Original Doc (a posted one keeps its own)
    if (v.isReturn && !editIsPosted) refreshPurchaseReversalNo(!storedNo || noTaken);
    if ($('purchaseVoucherChipDisplay')) $('purchaseVoucherChipDisplay').textContent = (invNoEl && invNoEl.value) || (v.isReturn ? 'REV-XXXX' : 'PUR-XXXX');

    if ($('purchaseNotes')) $('purchaseNotes').value = v.notes || '';
    const adjEl = $('purchaseAdjustments');
    if (adjEl) adjEl.value = (v.adjustments !== undefined && v.adjustments !== '' && parseFloat(v.adjustments) !== 0) ? v.adjustments : '';

    // Vendor — the stored id can be missing from the list (party re-created): match by name
    populatePurchaseVendors(v.vendorId);
    const vendorSel = $('purchaseVendor');
    if (vendorSel && !vendorSel.value && v.vendorName) {
      const wanted = String(v.vendorName).trim().toLowerCase();
      const match = Array.from(vendorSel.options).find(o => o.value && o.textContent.split(' [A.K.A:')[0].trim().toLowerCase() === wanted);
      if (match) populatePurchaseVendors(match.value);
    }
    populatePurchaseExecutives(v.executiveId);
    if ($('purchaseSupplyType')) $('purchaseSupplyType').value = v.supplyType || 'Intra-State (CGST + SGST)';

    purchaseRows = (Array.isArray(v.rows) && v.rows.length) ? v.rows : [newPurchaseRow()];
    // A reversal of a purchase: each line may cover what is still left of its purchase line
    // (the reversal being edited is left out of "already reversed")
    const origPurchase = v.isReturn ? getPurchaseReturnOriginal() : null;
    if (origPurchase && typeof window.getPurchaseRemainingRows === 'function') {
      const remaining = window.getPurchaseRemainingRows(origPurchase, editIsPosted ? v.id : null);
      purchaseRows.forEach(row => {
        const m = (row.origIndex !== undefined && remaining[row.origIndex]) ? remaining[row.origIndex]
          : remaining.find(r => String(r.item || '').trim().toLowerCase() === String(row.item || '').trim().toLowerCase());
        if (m) {
          row.origIndex = m.origIndex;
          row.origQty = parseFloat(m.qty) || 0;
          row.origDiscount = m.discount;
        }
      });
    }
    renderPurchaseRows();

    // TDS / TCS and its rate (a custom rate keeps its exact saved amount)
    setPurchaseTdsTcs(v.tdsTcsMode === 'TDS' || v.tdsTcsMode === 'TCS' ? v.tdsTcsMode : 'None');
    if (v.tdsTcsMode === 'TDS' || v.tdsTcsMode === 'TCS') {
      const rateSelect = $('purchaseTdsTcsRateSelect');
      const rateVal = parseFloat(v.tdsTcsRate) || 0;
      if (rateSelect && rateVal && rateSelect.querySelector(`option[value="${rateVal}"]`)) {
        rateSelect.value = String(rateVal);
      } else if (rateSelect) {
        rateSelect.value = 'custom';
        if ($('purchaseTdsTcsRateCustom')) $('purchaseTdsTcsRateCustom').value = rateVal || '';
        const amtEl = $('purchaseTdsTcsAmount');
        if (amtEl && parseFloat(v.tdsTcsAmount) > 0) {
          amtEl.value = parseFloat(v.tdsTcsAmount).toFixed(2);
          amtEl.dataset.manual = '1';
        }
      }
    }

    // Payment — with an advance, the form shows only the balance after it (or its refund);
    // a reversal shows the refund the supplier made
    if (v.isReturn) {
      setPurchaseReturnFieldLocks();
      if (v.paymentStatus === 'Full Refund') setPurchasePaymentStatus('Full');
      else if (v.paymentStatus === 'Partial Refund') setPurchasePaymentStatus('Partial');
      else setPurchasePaymentStatus('NotPaid');
      populatePurchasePaymentAccounts(v.paymentAccountId);
      _purchasePaymentAccountPrev = v.paymentAccountId && v.paymentAccountId !== MULTI_PAYMENT_VALUE ? String(v.paymentAccountId) : '';
      setPurchaseMultiPayments(v.paymentSplits || []);
      if ($('purchasePaymentAmount')) $('purchasePaymentAmount').value = (v.paymentStatus === 'Partial Refund' && v.paymentAmount) ? v.paymentAmount : '';
    } else if (getPurchaseLinkedAdvance().amount > 0) {
      applyPurchaseAdvanceToPaymentUI(v);
    } else {
      if (v.paymentStatus === 'Full Payment') setPurchasePaymentStatus('Full');
      else if (v.paymentStatus === 'Partial Payment') setPurchasePaymentStatus('Partial');
      else setPurchasePaymentStatus('NotPaid');
      populatePurchasePaymentAccounts(v.paymentAccountId);
      _purchasePaymentAccountPrev = v.paymentAccountId && v.paymentAccountId !== MULTI_PAYMENT_VALUE ? String(v.paymentAccountId) : '';
      setPurchaseMultiPayments(v.paymentSplits || []);
      if ($('purchasePaymentAmount')) $('purchasePaymentAmount').value = (v.paymentStatus === 'Partial Payment' && v.paymentAmount) ? v.paymentAmount : '';
    }

    updatePurchaseDocUI(v.uploadedDoc || v.document || null);
    validatePurchaseNoField();
    refreshPurchaseDraftButton();
    refreshPurchaseVendorAlterPencil();
    updatePurchaseDueDateDays();
    recalculatePurchaseTotals();
    if (v.isReturn) {
      setPurchaseReturnFieldLocks();
      // A fresh reversal: the money comes back the way it was paid
      if (v.presetRefund) presetPurchaseRefund(v.presetRefund);
      recalculatePurchaseTotals();
    }
    if (typeof window.refreshPurchasePrePicker === 'function') window.refreshPurchasePrePicker();

    if (typeof openTab === 'function') openTab('purchase_voucher');
    if (noTaken && invNoEl && invNoEl.value !== storedNo) {
      toast(`${storedNo} was used by another voucher meanwhile — this draft now has ${invNoEl.value}.`, 'info');
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  SAVE DRAFT / SAVE (POST)
  // ══════════════════════════════════════════════════════════════════
  // Everything on the form, as a voucher (no checks)
  function readPurchaseForm() {
    syncPurchaseRowsFromDOM();
    const vendorId = ($('purchaseVendor') || {}).value || '';
    const party = (typeof getPurchaseParty === 'function') ? getPurchaseParty({ vendorId }) : null;
    const mode = getPurchaseTdsTcsMode();
    const subTotal = calculatePurchaseSubtotal();
    const total = getPurchaseGrandTotal();
    // What the Payment Status box says. With an advance from a Pre Purchase document it is
    // the payment of the balance only — or the refund of an advance above the bill
    const formStatus = getPurchasePaymentStatus();
    const formAccountId = ($('purchasePaymentAccount') || {}).value || '';
    const payMax = getPurchasePaymentMax(total);
    let formAmount = 0;
    if (formStatus === 'Full Payment') formAmount = payMax;
    else if (formStatus === 'Partial Payment') formAmount = parseFloat(($('purchasePaymentAmount') || {}).value) || 0;
    const formSplits = formStatus === 'Not Paid' ? [] : getPurchaseMultiPaymentSplits();

    // What the voucher stores: everything paid to the vendor (advance + this payment)
    let paymentStatus = formStatus;
    let paymentAmount = formAmount;
    let paymentAccountId = formStatus === 'Not Paid' ? '' : formAccountId;
    let paymentSplits = formSplits;
    let advanceRefund = null;
    const advance = getPurchaseLinkedAdvance();
    const excess = getPurchaseAdvanceExcess(total);
    if (advance.amount > 0 && excess > 0) {
      // The advance pays the whole bill; the form's buttons were about refunding the excess
      const refundAmt = r2(Math.min(formAmount, excess));
      advanceRefund = {
        excess,
        status: refundAmt <= 0 ? 'Not Refunded' : (refundAmt >= excess - 0.01 ? 'Full Refund' : 'Partial Refund'),
        amount: refundAmt,
        accountId: refundAmt > 0 ? formAccountId : '',
        splits: refundAmt > 0 ? formSplits : []
      };
      paymentStatus = 'Full Payment';
      paymentAmount = total;
      paymentAccountId = '';
      paymentSplits = [];
    } else if (advance.amount > 0 || getPurchaseFormJournalPaid() > 0) {
      // Journal Entry payments against the purchase stay on the journal, but count towards
      // "Full Payment"
      const journalPaid = getPurchaseFormJournalPaid();
      const received = r2(getPurchaseAdvanceApplied(total) + formAmount);
      paymentStatus = received <= 0 ? 'Not Paid' : (received + journalPaid >= total - 0.01 ? 'Full Payment' : 'Partial Payment');
      paymentAmount = received;
      if (received <= 0) {
        paymentAccountId = '';
        paymentSplits = [];
      }
    }
    // A reversal: the status is the supplier's refund
    const isReturn = isPurchaseReturnMode();
    const src = _purchaseReturnSource;
    if (isReturn) {
      paymentStatus = formStatus === 'Full Payment' ? 'Full Refund' : (formStatus === 'Partial Payment' ? 'Partial Refund' : 'No Refund');
    }
    const returnFields = !isReturn ? {} : {
      isReturn: true,
      returnAgainstInvoice: (src && src.no) || '',
      returnAgainstId: (src && src.type === 'purchase') ? src.id : null,
      // Reversing a Pre Purchase document: no purchase to undo, only its advance to settle
      reversedPreDoc: (src && src.type === 'pre') ? {
        kind: src.kind, id: src.id, no: src.no, date: src.date || '', label: src.label || '',
        advance: r2(src.advance),
        advanceJournalEntryId: src.advanceJournalEntryId || null,
        advanceVoucherNo: src.advanceVoucherNo || null,
        inPartyLedger: !!src.inPartyLedger
      } : null
    };
    return Object.assign({
      id: _editingPurchaseVoucher ? _editingPurchaseVoucher.id : Date.now(),
      invoiceNo: (($('purchaseInvoiceNo') || {}).value || '').trim(),
      date: ($('purchaseDate') || {}).value || localToday(),
      dueDate: ($('purchaseDueDate') || {}).value || '',
      vendorId,
      vendorName: (party && party.name) || '',
      partyOverride: window._purchasePartyOverride ? JSON.parse(JSON.stringify(window._purchasePartyOverride)) : null,
      supplyType: ($('purchaseSupplyType') || {}).value || 'Intra-State (CGST + SGST)',
      executiveId: ($('purchaseExecutive') || {}).value || '',
      rows: JSON.parse(JSON.stringify(purchaseRows)),
      subTotal,
      tdsTcsMode: mode,
      tdsTcsRate: getPurchaseTdsTcsRate(),
      tdsTcsAmount: mode !== 'None' ? (parseFloat(($('purchaseTdsTcsAmount') || {}).value) || 0) : 0,
      adjustments: parseFloat(($('purchaseAdjustments') || {}).value) || 0,
      total,
      paymentStatus,
      paymentAccountId,
      paymentAmount: r2(paymentAmount),
      paymentSplits,
      notes: ($('purchaseNotes') || {}).value || '',
      uploadedDoc: purchaseUploadedDoc || null,
      // The Pre Purchase document it is made from, and the advance paid against it
      preDocKind: _purchasePreLink ? _purchasePreLink.kind : null,
      preDocId: _purchasePreLink ? _purchasePreLink.id : null,
      advancePaidAmount: advance.amount,
      advanceJournalEntryId: (_purchasePreLink && _purchasePreLink.advance && _purchasePreLink.advance.journalEntryId) || null,
      advanceVoucherNo: (_purchasePreLink && _purchasePreLink.advance && _purchasePreLink.advance.voucherNo) || null,
      advanceRefund,
      // The Payment Status box as entered — checked on Save, not stored
      formPayment: {
        status: formStatus,
        amount: r2(formAmount),
        accountId: formAccountId,
        splits: formSplits,
        max: payMax,
        refundMode: excess > 0 || isReturn
      }
    }, returnFields);
  }

  function savePurchaseDraft() {
    // A posted voucher is changed with Save Purchase, not turned back into a draft
    if (_editingPurchaseVoucher && !_editingPurchaseVoucher.isDraft) {
      toast(isPurchaseReturnMode()
        ? 'This reversal is already posted — use Save Reversal to keep the changes.'
        : 'This purchase is already posted — use Save Purchase to keep the changes.', 'warning');
      return;
    }
    const data = readPurchaseForm();
    delete data.formPayment;
    // A reversal's draft comes back to its Original Doc
    if (isPurchaseReturnMode() && !_purchaseReturnSource) {
      toast('Please select the Original Doc before saving the draft.', 'warning');
      return;
    }
    // A draft needs something to come back to — the vendor and at least one line
    if (!data.vendorId) {
      toast('Please select a Vendor / Supplier before saving the draft.', 'warning');
      return;
    }
    const hasLine = data.rows.some(r => r && (((r.item || '').trim() !== '') || (parseFloat(r.rate) || 0) > 0 || (parseFloat(r.amount) || 0) > 0));
    if (!hasLine) {
      toast('Please add at least one line item before saving the draft.', 'warning');
      return;
    }
    // A draft of nothing (₹0) is not worth keeping
    if (!(data.total > 0)) {
      toast('Amount must be greater than zero. Please enter rates / amounts for the line items.', 'warning');
      return;
    }

    const draft = Object.assign(data, {
      invoiceNo: data.invoiceNo || 'Draft',
      isDraft: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    const drafts = window.KYA_STORE.purchaseVouchersDrafts = window.KYA_STORE.purchaseVouchersDrafts || [];
    const idx = drafts.findIndex(d => String(d.id) === String(draft.id));
    if (idx > -1) {
      draft.createdAt = drafts[idx].createdAt || draft.createdAt;
      drafts[idx] = draft;
    } else {
      drafts.push(draft);
    }

    toast(data.isReturn ? 'Purchase Reversal Draft saved successfully.' : 'Purchase Voucher Draft saved successfully.', 'success');
    const returnTo = _editingPurchaseVoucher && _editingPurchaseVoucher.returnTo;
    initPurchaseForm();
    // Edited from another screen: back there, with no preview popup
    if (returnFromPurchaseEdit(returnTo)) return;
    // Stay on the Purchase form, ready for the next one (drafts are listed in Voucher Desk)
    if (typeof openTab === 'function') openTab('purchase_voucher');
    if (typeof renderVoucherDeskPanel === 'function') renderVoucherDeskPanel();
    if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
    // The saved draft opens in the same small preview popup as after Save
    if (typeof window.viewPurchaseVoucher === 'function') window.viewPurchaseVoucher(draft.id, { compact: true });
  }

  function postPurchaseVoucher() {
    const data = readPurchaseForm();
    const isReturn = !!data.isReturn;
    const src = _purchaseReturnSource;

    if (isReturn && !src) {
      toast('Please select the Original Doc.', 'warning');
      return false;
    }
    if (!data.vendorId) {
      toast('Please select a Vendor / Supplier.', 'warning');
      return false;
    }
    if (!data.invoiceNo) {
      toast(isReturn ? 'Reversal number is required.' : 'Purchase number is required.', 'warning');
      return false;
    }
    // Numbers used by any purchase / reversal — including deleted ones — can't be issued again
    if (typeof checkDocNoBeforeSave === 'function' && !checkDocNoBeforeSave(getPurchaseNumberKind(), data.invoiceNo, getPurchaseOwnId())) {
      return false;
    }

    // A Pre Purchase document can be reversed only while it is active (or by its own reversal)
    let preDoc = null;
    if (isReturn && src.type === 'pre') {
      if (typeof window.healPurchasePreReversals === 'function') window.healPurchasePreReversals();
      const found = typeof window.findPurchasePreDocForReversal === 'function' ? window.findPurchasePreDocForReversal(src.kind, src.id) : null;
      if (!found) {
        toast('The selected pre purchase no longer exists.', 'warning');
        return false;
      }
      preDoc = found.doc;
      const own = _editingPurchaseVoucher && !_editingPurchaseVoucher.isDraft && preDoc.reversedBy
        && String(preDoc.reversedBy.voucherId) === String(_editingPurchaseVoucher.id);
      if (preDoc.status && preDoc.status !== 'Active' && !own) {
        toast(`${src.label || 'Pre Purchase'} ${src.no} is ${preDoc.status} and can't be reversed.`, 'warning');
        return false;
      }
    }

    // Leave out completely blank rows when at least one row has something
    let rows = data.rows;
    if (rows.length > 1) {
      const nonEmpty = rows.filter(r => (r.item && r.item.trim()) || (r.rate && r.rate > 0) || (r.amount && r.amount > 0));
      if (nonEmpty.length > 0) rows = nonEmpty;
    }
    if (rows.length === 0) {
      toast('Please add at least one line item.', 'warning');
      return false;
    }
    // A Pre Purchase document is reversed whole, as it was saved
    for (let i = 0; i < rows.length && !(isReturn && src.type === 'pre'); i++) {
      const r = rows[i];
      if (!r.item || !r.item.trim()) {
        toast(`Row #${i + 1}: Please select an item or expense.`, 'warning');
        return false;
      }
      if (!r.qty || parseFloat(r.qty) <= 0) {
        toast(`Row #${i + 1}: Quantity must be greater than zero.`, 'warning');
        return false;
      }
      if (!r.rate || parseFloat(r.rate) <= 0) {
        toast(`Row #${i + 1}: Rate must be greater than zero.`, 'warning');
        return false;
      }
      if (isReturn && r.origQty !== undefined && parseFloat(r.qty) > parseFloat(r.origQty) + 0.0001) {
        toast(`Row #${i + 1}: Return Qty (${r.qty}) cannot exceed remaining returnable Qty (${r.origQty}).`, 'warning');
        return false;
      }
    }
    if (!data.date) {
      toast('Please select a Date.', 'warning');
      return false;
    }
    if (isReturn && src.date && data.date < src.date) {
      toast(`Reversal date cannot be before the ${src.type === 'pre' ? (src.label || 'document') : 'purchase'} date (${src.date}).`, 'warning');
      return false;
    }

    // The Payment Status box as entered: the payment (of the balance, when an advance came
    // in from a Pre Purchase document) or the refund of an advance above the bill
    const fp = data.formPayment;
    delete data.formPayment;
    if (fp.status !== 'Not Paid') {
      const what = fp.refundMode ? 'Refund' : 'Payment';
      if (!fp.accountId) {
        toast(`Please select a ${what} Account.`, 'warning');
        return false;
      }
      if (fp.status === 'Partial Payment') {
        if (fp.amount <= 0) {
          toast(`${what} Amount must be greater than zero for Partial ${what}s.`, 'warning');
          return false;
        }
        if (fp.amount > fp.max + 0.001) {
          toast(getPurchasePaymentLimitMessage(fp.max, data.total, false), 'warning');
          return false;
        }
      }
      if (fp.amount <= 0) {
        toast(`${what} Amount must be greater than zero.`, 'warning');
        return false;
      }
      if (fp.accountId === MULTI_PAYMENT_VALUE) {
        const splits = fp.splits;
        if (splits.length === 0) {
          toast(`Please select at least one account with an amount for Multi ${what}.`, 'warning');
          return false;
        }
        const hasDuplicate = splits.some((sp, i) => splits.findIndex(o => String(o.accountId) === String(sp.accountId)) !== i);
        if (hasDuplicate) {
          toast(`Each Multi ${what} account can be selected only once.`, 'warning');
          return false;
        }
        const splitTotal = splits.reduce((sum, sp) => sum + sp.amount, 0);
        if (Math.abs(splitTotal - fp.amount) > 0.01) {
          toast(`Multi ${what} split of ₹${fmt(splitTotal)} must equal the ${what.toLowerCase()} amount of ₹${fmt(fp.amount)}.`, 'warning');
          return false;
        }
      }
    }

    const isEditPosted = !!(_editingPurchaseVoucher && !_editingPurchaseVoucher.isDraft);
    const existing = isEditPosted ? (window.KYA_STORE.purchaseVouchers || []).find(v => String(v.id) === String(_editingPurchaseVoucher.id)) : null;

    const voucher = Object.assign(data, {
      rows,
      isDraft: false,
      createdAt: (existing && existing.createdAt) || Date.now(),
      postedAt: (existing && existing.postedAt) || Date.now(),
      updatedAt: Date.now(),
      journalEntryId: existing ? (existing.journalEntryId || '') : '',
      tdsJournalEntryId: existing ? (existing.tdsJournalEntryId || '') : '',
      tdsVoucherNo: existing ? (existing.tdsVoucherNo || '') : '',
      paymentJournalEntryId: existing ? (existing.paymentJournalEntryId || '') : '',
      paymentVoucherNo: existing ? (existing.paymentVoucherNo || '') : '',
      advanceRefundJournalEntryId: existing ? (existing.advanceRefundJournalEntryId || '') : '',
      advanceRefundVoucherNo: existing ? (existing.advanceRefundVoucherNo || '') : ''
    });

    // Post to the books (flows to Trial Balance, Ledgers, P&L, Balance Sheet, Voucher Desk)
    const je = (typeof postPurchaseVoucherToJournal === 'function') ? postPurchaseVoucherToJournal(voucher) : null;
    if (je) {
      voucher.journalEntryId = je.purchaseJEId;
      voucher.tdsJournalEntryId = je.tdsJEId || '';
      voucher.tdsVoucherNo = je.tdsJEId ? je.tdsVoucherNo : '';
      voucher.paymentJournalEntryId = je.paymentJEId || '';
      voucher.paymentVoucherNo = je.paymentJEId ? je.paymentVoucherNo : '';
      voucher.advanceRefundJournalEntryId = je.advanceRefundJEId || '';
      voucher.advanceRefundVoucherNo = je.advanceRefundJEId ? je.advanceRefundVoucherNo : '';
    }

    if (_editingPurchaseVoucher && _editingPurchaseVoucher.isDraft) {
      window.KYA_STORE.purchaseVouchersDrafts = (window.KYA_STORE.purchaseVouchersDrafts || []).filter(d => String(d.id) !== String(_editingPurchaseVoucher.id));
    }
    const list = window.KYA_STORE.purchaseVouchers = window.KYA_STORE.purchaseVouchers || [];
    const idx = list.findIndex(v => String(v.id) === String(voucher.id));
    if (idx > -1) list[idx] = voucher;
    else list.push(voucher);

    // Once posted, a number is used for good — deleting the voucher won't free it
    if (typeof registerDocNo === 'function') registerDocNo(getPurchaseNumberKind(), voucher.invoiceNo);
    // Made from a Pre Purchase document: that document is now Completed
    if (!isReturn && voucher.preDocKind && typeof window.markPurchasePreDocCompleted === 'function') {
      window.markPurchasePreDocCompleted(voucher.preDocKind, voucher.preDocId);
    }
    // Reversing a Pre Purchase document cancels it (a document this reversal pointed at before
    // goes back to Active)
    if (preDoc) {
      preDoc.status = 'Cancelled';
      preDoc.reversedBy = { voucherId: voucher.id, no: voucher.invoiceNo, date: voucher.date };
      preDoc.updatedAt = Date.now();
      if (typeof window.healPurchasePreReversals === 'function') window.healPurchasePreReversals();
    }

    toast(isReturn
      ? `Purchase Reversal "${voucher.invoiceNo}" posted successfully.${preDoc ? ` ${src.label || 'Pre Purchase'} ${src.no} cancelled.` : ''}`
      : `Purchase Voucher "${voucher.invoiceNo}" saved successfully.`, 'success');
    const returnTo = _editingPurchaseVoucher && _editingPurchaseVoucher.returnTo;
    // A reversal is followed by a fresh reversal
    initPurchaseForm();
    // Edited from another screen: back there, with no preview popup
    if (returnFromPurchaseEdit(returnTo)) return true;
    if (typeof openTab === 'function') openTab('purchase_voucher');

    if (typeof refreshAllReports === 'function') refreshAllReports();
    if (typeof renderVoucherDeskPanel === 'function') renderVoucherDeskPanel();
    if (typeof renderLedgerStatementView === 'function') renderLedgerStatementView();
    if (typeof triggerAutoBackup === 'function') triggerAutoBackup();

    // The posted purchase opens in its preview, ready to print or export
    if (typeof window.viewPurchaseVoucher === 'function') window.viewPurchaseVoucher(voucher.id, { compact: true });
    return true;
  }

  function editPurchaseDraft(id) {
    const draft = (window.KYA_STORE.purchaseVouchersDrafts || []).find(d => String(d.id) === String(id));
    if (!draft) return;
    loadPurchaseVoucher(draft, true);
  }

  // Post a draft straight from its preview: it is loaded into the form and posted from
  // there, with every check the form makes. Once posted, the view it was opened from comes
  // back; if a check fails, the draft stays open on the form, ready to fix.
  function postPurchaseDraft(id) {
    const draft = (window.KYA_STORE.purchaseVouchersDrafts || []).find(d => String(d.id) === String(id));
    if (!draft) return;
    const returnTo = (typeof activeTabId !== 'undefined') ? activeTabId : null;
    loadPurchaseVoucher(draft, true);
    // Not an edit: this flow goes back on its own (below), with the posted preview
    if (_editingPurchaseVoucher) delete _editingPurchaseVoucher.returnTo;
    const posted = postPurchaseVoucher();
    if (posted && returnTo && returnTo !== 'purchase_voucher' && typeof openTab === 'function') {
      openTab(returnTo);
      if (returnTo === 'voucher_desk' && typeof renderVoucherDeskPanel === 'function') renderVoucherDeskPanel();
    }
  }

  // Back to the screen a voucher was opened for editing from (see loadPurchaseVoucher),
  // refreshed. The Purchase form closes, as the Journal Entry does.
  function returnFromPurchaseEdit(returnTo) {
    if (!returnTo) return false;
    if (typeof closeTab === 'function') closeTab('purchase_voucher', null, returnTo);
    else if (typeof openTab === 'function') openTab(returnTo);
    if (typeof window.refreshAllAppViews === 'function') window.refreshAllAppViews();
    else if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
    return true;
  }

  // Delete from its preview: a draft just goes; a posted purchase goes with all its entries
  // (purchase, TDS, payment), as the Ledgers delete does
  function deletePurchaseVoucher(id) {
    const S = window.KYA_STORE || {};
    const draft = (S.purchaseVouchersDrafts || []).find(d => String(d.id) === String(id));
    const v = draft || (S.purchaseVouchers || []).find(x => String(x.id) === String(id));
    if (!v) return;
    const label = v.isReturn ? 'Purchase Reversal' : 'Purchase';
    showKyaConfirm({
      title: draft ? 'Delete Draft?' : `Delete Posted ${label}?`,
      message: draft
        ? 'Are you sure you want to delete this draft? This action cannot be undone.'
        : `Are you sure you want to delete this ${label.toLowerCase()}? This will also delete its journal entries (purchase, TDS and payment) and cannot be undone.`,
      confirmLabel: 'Delete',
      okBg: 'var(--red-600)',
      onConfirm: () => {
        if (draft) {
          S.purchaseVouchersDrafts = (S.purchaseVouchersDrafts || []).filter(d => String(d.id) !== String(id));
          toast('Draft deleted successfully.', 'success');
        } else {
          S.purchaseVouchers = (S.purchaseVouchers || []).filter(x => String(x.id) !== String(id));
          if (typeof window.removePurchaseJournalEntries === 'function') window.removePurchaseJournalEntries(v);
          toast(`${label} "${v.invoiceNo}" deleted.`, 'success');
        }
        if (typeof window.refreshAllAppViews === 'function') {
          window.refreshAllAppViews();
        } else {
          if (typeof renderVoucherDeskPanel === 'function') renderVoucherDeskPanel();
          if (typeof refreshAllReports === 'function') refreshAllReports();
          if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
        }
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  ⋮ MORE MENU — Export (PDF / Excel) of the purchase on the form, Configuration
  // ══════════════════════════════════════════════════════════════════
  function wirePurchaseMoreDropdown() {
    const moreBtn = $('purchaseMoreBtn');
    const moreDropdown = $('purchaseMoreDropdown');
    const submenuBtn = $('purchaseExportMenuBtn');
    const submenu = $('purchaseExportSubmenu');
    if (!moreBtn || !moreDropdown || moreBtn._isWired) return;
    moreBtn._isWired = true;

    const closeAll = () => {
      moreDropdown.classList.remove('active', 'open');
      if (submenu) submenu.classList.remove('active', 'open');
    };

    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = moreDropdown.classList.contains('active') || moreDropdown.classList.contains('open');
      closeAll();
      if (!isOpen) moreDropdown.classList.add('active', 'open');
    });

    if (submenuBtn && submenu) {
      let closeTimer = null;
      submenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        submenu.classList.toggle('active');
        submenu.classList.toggle('open');
      });
      const submenuWrap = $('purchaseExportSubmenuWrap');
      if (submenuWrap) {
        submenuWrap.addEventListener('mouseenter', () => {
          if (closeTimer) clearTimeout(closeTimer);
          submenu.classList.add('active', 'open');
        });
        submenuWrap.addEventListener('mouseleave', () => {
          closeTimer = setTimeout(() => submenu.classList.remove('active', 'open'), 300);
        });
        submenu.addEventListener('mouseenter', () => {
          if (closeTimer) clearTimeout(closeTimer);
          submenu.classList.add('active', 'open');
        });
      }
    }

    const runExport = async (kind) => {
      closeAll();
      const fn = kind === 'pdf' ? window.exportPurchaseVoucherToPDF : window.exportPurchaseVoucherToExcel;
      if (typeof fn !== 'function') {
        toast((kind === 'pdf' ? 'PDF' : 'Excel') + ' export module not loaded.', 'warning');
        return;
      }
      const data = readPurchaseForm();
      delete data.formPayment;
      data.invoiceNo = data.invoiceNo || getNextPurchaseInvoiceNo();
      try {
        await fn(data);
      } catch (err) {
        console.error('Purchase export failed:', err);
        toast('Could not export: ' + (err && err.message ? err.message : err), 'error');
      }
    };
    $('purchaseExportPdf')?.addEventListener('click', (e) => { e.stopPropagation(); runExport('pdf'); });
    $('purchaseExportExcel')?.addEventListener('click', (e) => { e.stopPropagation(); runExport('excel'); });

    $('purchaseMoreConfigBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAll();
      if (typeof openTab === 'function') {
        openTab('settings');
        if (typeof switchSettingsTab === 'function') switchSettingsTab('purchase');
      }
    });

    document.addEventListener('click', (e) => {
      if (!moreDropdown.contains(e.target) && !moreBtn.contains(e.target)) closeAll();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAll();
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  EVENT LISTENERS & BINDINGS
  // ══════════════════════════════════════════════════════════════════
  function wirePurchaseEventListeners() {
    const addRowBtn = $('purchaseAddRow');
    if (addRowBtn && !addRowBtn._wired) {
      addRowBtn._wired = true;
      addRowBtn.addEventListener('click', (e) => {
        e.preventDefault();
        addPurchaseRow();
      });
    }

    // Line items: live calculation, as on the Sales Invoice
    const itemBody = $('purchaseItemBody');
    if (itemBody && !itemBody._calcWired) {
      itemBody._calcWired = true;
      itemBody.addEventListener('input', (e) => {
        const tr = e.target.closest('tr');
        if (!tr) return;
        const isRate = e.target.classList.contains('sales-row-rate');
        const isAmt = e.target.classList.contains('sales-row-amount-input');
        const isDisc = e.target.classList.contains('sales-row-discount');
        // At most two decimals (unless a sum is being typed)
        if ((isRate || isAmt || isDisc) && !/[\+\-\*\/\%]/.test(e.target.value) && e.target.value.includes('.')) {
          const parts = e.target.value.split('.');
          if (parts[1] && parts[1].length > 2) e.target.value = parts[0] + '.' + parts[1].slice(0, 2);
        }
        updatePurchaseRowFromDOM(parseInt(tr.dataset.rowIndex, 10), tr, isAmt ? 'amount' : 'rate');
      });
      itemBody.addEventListener('change', (e) => {
        const tr = e.target.closest('tr');
        if (!tr) return;
        updatePurchaseRowFromDOM(parseInt(tr.dataset.rowIndex, 10), tr, 'rate');
      });
      itemBody.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.sales-del-row');
        if (!delBtn) return;
        const tr = delBtn.closest('tr');
        const index = tr ? parseInt(tr.dataset.rowIndex, 10) : NaN;
        if (isNaN(index)) return;
        if (purchaseRows.length > 1) purchaseRows.splice(index, 1);
        else purchaseRows = [newPurchaseRow()];
        renderPurchaseRows();
        recalculatePurchaseTotals();
      });
    }

    const clearBtn = $('btnClearPurchase');
    if (clearBtn && !clearBtn._wired) {
      clearBtn._wired = true;
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Editing one opened from another screen: drop the changes and go back there
        const returnTo = _editingPurchaseVoucher && _editingPurchaseVoucher.returnTo;
        initPurchaseForm();
        returnFromPurchaseEdit(returnTo);
      });
    }

    const newPurchaseBtn = $('btnNewPurchase');
    if (newPurchaseBtn && !newPurchaseBtn._wired) {
      newPurchaseBtn._wired = true;
      newPurchaseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        _purchaseMode = 'Purchase';
        initPurchaseForm();
      });
    }

    // Reversal: the purchase form as Purchase Reversal, starting with no Original Doc
    const returnBtn = $('btnPurchaseReturn');
    if (returnBtn && !returnBtn._wired) {
      returnBtn._wired = true;
      returnBtn.addEventListener('click', (e) => {
        e.preventDefault();
        _purchaseMode = 'Return';
        initPurchaseForm();
        if (typeof window.showPurchaseFormCard === 'function') window.showPurchaseFormCard();
      });
    }

    // The number pencil on a reversal sets the reversal prefix (the rest is the Original Doc's);
    // runs ahead of the purchase number format popup (doc-numbering.js)
    const fmtBtn = $('purchaseInvoiceNoFormatBtn');
    if (fmtBtn && !fmtBtn._returnWired) {
      fmtBtn._returnWired = true;
      fmtBtn.addEventListener('click', (e) => {
        if (!isPurchaseReturnMode()) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        openPurchaseReversalNumberingModal();
      }, true);
    }

    const saveDraftBtn = $('btnSavePurchaseDraft');
    if (saveDraftBtn && !saveDraftBtn._wired) {
      saveDraftBtn._wired = true;
      saveDraftBtn.addEventListener('click', (e) => {
        e.preventDefault();
        savePurchaseDraft();
      });
    }

    const postBtn = $('btnPostPurchase');
    if (postBtn && !postBtn._wired) {
      postBtn._wired = true;
      postBtn.addEventListener('click', (e) => {
        e.preventDefault();
        postPurchaseVoucher();
      });
    }

    // Number: the pencil (format popup) and the "already used" check while typing
    if (typeof wireDocNumberField === 'function') wireDocNumberField('purchase', getPurchaseOwnId);
    const invNoEl = $('purchaseInvoiceNo');
    if (invNoEl && !invNoEl._chipWired) {
      invNoEl._chipWired = true;
      invNoEl.addEventListener('input', () => {
        const chip = $('purchaseVoucherChipDisplay');
        if (chip) chip.textContent = invNoEl.value.trim() || 'PUR-XXXX';
      });
    }

    // Vendor
    const vendorSel = $('purchaseVendor');
    if (vendorSel && !vendorSel._wired) {
      vendorSel._wired = true;
      vendorSel.addEventListener('change', () => {
        refreshPurchaseVendorAlterPencil();
        // A Cash and Cash Equivalents ledger as the vendor: a cash purchase, paid in full there
        applyPurchaseCashVendorLock();
      });
    }
    const vendorAlterBtn = $('btnPurchaseVendorAlter');
    if (vendorAlterBtn && !vendorAlterBtn._wired) {
      vendorAlterBtn._wired = true;
      vendorAlterBtn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
      vendorAlterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const m = getPurchaseVendorMaster();
        if (m && typeof window.openVoucherMasterAlter === 'function') {
          window.openVoucherMasterAlter(m.tab, m.id, { type: 'vendor', returnTab: 'purchase_voucher', onAltered: onPurchaseVendorAltered });
        }
      });
    }

    const execEl = $('purchaseExecutive');
    if (execEl && !execEl._wired) {
      execEl._wired = true;
      execEl.addEventListener('focus', () => populatePurchaseExecutives(execEl.value));
    }

    // Payment Status
    [['purchasePaymentStatusNotPaid', 'NotPaid'], ['purchasePaymentStatusFull', 'Full'], ['purchasePaymentStatusPartial', 'Partial']].forEach(([id, status]) => {
      const btn = $(id);
      if (btn && !btn._wired) {
        btn._wired = true;
        btn.addEventListener('click', () => setPurchasePaymentStatus(status));
      }
    });

    const payAccEl = $('purchasePaymentAccount');
    if (payAccEl && !payAccEl._wired) {
      payAccEl._wired = true;
      payAccEl.addEventListener('focus', () => {
        _purchasePaymentAccountPrev = payAccEl.value === MULTI_PAYMENT_VALUE ? _purchasePaymentAccountPrev : payAccEl.value;
        populatePurchasePaymentAccounts(payAccEl.value);
      });
      payAccEl.addEventListener('change', () => {
        if (payAccEl.value === MULTI_PAYMENT_VALUE) {
          openPurchaseMultiPaymentModal();
        } else {
          resetPurchaseMultiPayments();
          _purchasePaymentAccountPrev = payAccEl.value;
        }
        updatePurchaseMultiPaymentUI();
      });
    }

    const multiSummaryBtn = $('purchaseMultiPaymentSummary');
    if (multiSummaryBtn && !multiSummaryBtn._wired) {
      multiSummaryBtn._wired = true;
      multiSummaryBtn.addEventListener('click', openPurchaseMultiPaymentModal);
    }

    const payAmtEl = $('purchasePaymentAmount');
    if (payAmtEl && !payAmtEl._wired) {
      payAmtEl._wired = true;
      payAmtEl.addEventListener('input', () => {
        const total = getPurchaseGrandTotal();
        // With an advance: the balance after it, or the excess to refund
        const max = getPurchasePaymentMax(total);
        if (total > 0 && parseFloat(payAmtEl.value) > max) {
          payAmtEl.value = max.toFixed(2);
          toast(getPurchasePaymentLimitMessage(max, total, true), 'warning');
        }
        if (typeof window.isMultiPaymentModalOpen === 'function' && window.isMultiPaymentModalOpen() && typeof window.updateMultiPaymentModalTotals === 'function') {
          window.updateMultiPaymentModalTotals();
        }
        updatePurchaseMultiPaymentUI();
      });
    }

    // Date / Due Date: the KYA calendar and "Due Date follows the Date" are wired from the
    // markup (kya-datepicker.js); the attach call is a no-op when that already happened
    if (typeof window.attachMarkedKyaDatePickers === 'function') window.attachMarkedKyaDatePickers();
    const dateInp = $('purchaseDate');
    if (dateInp && !dateInp._dueWired) {
      dateInp._dueWired = true;
      dateInp.addEventListener('change', updatePurchaseDueDateDays);
    }
    const dueDateInp = $('purchaseDueDate');
    if (dueDateInp && !dueDateInp._wired) {
      dueDateInp._wired = true;
      dueDateInp.addEventListener('change', updatePurchaseDueDateDays);
    }

    // TDS / TCS
    [['purchaseTdsTcsNone', 'None'], ['purchaseTdsTcsTds', 'TDS'], ['purchaseTdsTcsTcs', 'TCS']].forEach(([id, mode]) => {
      const btn = $(id);
      if (btn && !btn._wired) {
        btn._wired = true;
        btn.addEventListener('click', () => setPurchaseTdsTcs(mode));
      }
    });

    const rateSel = $('purchaseTdsTcsRateSelect');
    const tdsAmtInp = $('purchaseTdsTcsAmount');
    if (rateSel && !rateSel._wired) {
      rateSel._wired = true;
      rateSel.addEventListener('change', () => {
        if (tdsAmtInp) delete tdsAmtInp.dataset.manual;
        const customWrap = $('purchaseTdsTcsRateCustomWrap');
        if (rateSel.value === 'custom') {
          if (customWrap) customWrap.style.display = 'flex';
          $('purchaseTdsTcsRateCustom')?.focus();
        } else if (customWrap) {
          customWrap.style.display = 'none';
        }
        recalculatePurchaseTotals();
      });
    }

    const customRateInp = $('purchaseTdsTcsRateCustom');
    if (customRateInp && !customRateInp._wired) {
      customRateInp._wired = true;
      customRateInp.addEventListener('input', () => {
        // Typing a percentage makes the rate the source again
        if (tdsAmtInp) delete tdsAmtInp.dataset.manual;
        recalculatePurchaseTotals();
      });
    }

    if (tdsAmtInp && !tdsAmtInp._wired) {
      tdsAmtInp._wired = true;
      tdsAmtInp.addEventListener('input', () => {
        if (rateSel && rateSel.value === 'custom') {
          if (tdsAmtInp.value.trim() !== '') tdsAmtInp.dataset.manual = '1';
          else delete tdsAmtInp.dataset.manual;
        }
        recalculatePurchaseTotals();
      });
    }

    // Round off
    const roundBtn = $('btnPurchaseAutoRoundOff');
    if (roundBtn && !roundBtn._wired) {
      roundBtn._wired = true;
      roundBtn.addEventListener('click', (e) => {
        e.preventDefault();
        autoCalculatePurchaseRoundOff();
      });
    }
    const adjInp = $('purchaseAdjustments');
    if (adjInp && !adjInp._wired) {
      adjInp._wired = true;
      adjInp.addEventListener('input', recalculatePurchaseTotals);
    }

    // Supply type: a zero-rated supply carries no GST on its lines
    const supplySel = $('purchaseSupplyType');
    if (supplySel && !supplySel._wired) {
      supplySel._wired = true;
      supplySel.addEventListener('change', () => {
        renderPurchaseRows();
        recalculatePurchaseTotals();
      });
    }

    // Document attachment
    const dropzone = $('purchaseDocDropzone');
    const fileInp = $('purchaseDocFileInput');
    if (dropzone && fileInp && !dropzone._wired) {
      dropzone._wired = true;
      dropzone.addEventListener('click', (e) => {
        if (e.target.closest('#purchaseDocRemoveBtn') || e.target.closest('#purchaseDocPreviewBtn')) return;
        fileInp.click();
      });
      fileInp.addEventListener('change', () => {
        if (fileInp.files && fileInp.files[0]) handlePurchaseDocUpload(fileInp.files[0]);
      });
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--blue-500)';
        dropzone.style.background = 'var(--blue-50)';
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'var(--slate-300)';
        dropzone.style.background = 'var(--slate-50)';
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--slate-300)';
        dropzone.style.background = 'var(--slate-50)';
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) handlePurchaseDocUpload(e.dataTransfer.files[0]);
      });
    }
    const removeBtn = $('purchaseDocRemoveBtn');
    if (removeBtn && !removeBtn._wired) {
      removeBtn._wired = true;
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        updatePurchaseDocUI(null);
        toast('Attached document removed.', 'info');
      });
    }

    wirePurchaseMoreDropdown();
  }

  // Export globals
  window.initPurchaseForm = initPurchaseForm;
  window.loadPurchaseVoucher = loadPurchaseVoucher;
  window.populatePurchaseVendors = populatePurchaseVendors;
  window.populatePurchaseExecutives = populatePurchaseExecutives;
  window.populatePurchasePaymentAccounts = populatePurchasePaymentAccounts;
  window.savePurchaseDraft = savePurchaseDraft;
  window.postPurchaseVoucher = postPurchaseVoucher;
  window.editPurchaseDraft = editPurchaseDraft;
  window.postPurchaseDraft = postPurchaseDraft;
  window.deletePurchaseVoucher = deletePurchaseVoucher;
  window.appendPurchasePartyCreateFooter = appendPurchasePartyCreateFooter;
  // Whether the form is a Purchase Reversal (purchase-pre.js, purchase-pre-picker.js)
  window.isPurchaseReturnMode = isPurchaseReturnMode;
  // The Pre Purchase document the purchase on the form is made from (purchase-pre-picker.js).
  // `locked`: a posted purchase keeps the document it was made from
  window.getPurchasePreLink = function() {
    if (!_purchasePreLink) return null;
    return {
      kind: _purchasePreLink.kind,
      id: _purchasePreLink.id,
      advance: Object.assign({}, _purchasePreLink.advance || {}),
      locked: !!(_editingPurchaseVoucher && !_editingPurchaseVoucher.isDraft)
    };
  };
  // The rows on the form (read live: app-shell only starts a fresh form when there are none)
  Object.defineProperty(window, 'purchaseRows', { configurable: true, get: () => purchaseRows });

  // Auto-init on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    wirePurchaseEventListeners();
  });

  // Also wire immediately in case DOM is already loaded
  wirePurchaseEventListeners();

})();
