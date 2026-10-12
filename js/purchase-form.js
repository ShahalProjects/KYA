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
    if (typeof getNextDocNo === 'function') return getNextDocNo('purchase');
    return `PUR-${new Date().getFullYear()}-${String(window.KYA_STORE.purchaseInvoiceCtr || 1).padStart(3, '0')}`;
  }

  function validatePurchaseNoField() {
    return (typeof validateDocNoField === 'function') ? validateDocNoField('purchase') : true;
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

  // "Create new" at the bottom of the vendor list: a ledger under Trade Payables (coa.js)
  function appendPurchasePartyCreateFooter(listEl, query) {
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
      const dd = $('purchaseVendorSelectDropdown');
      if (dd) dd.style.display = 'none';
      if (typeof hidePartyHoverCard === 'function') hidePartyHoverCard();
      if (typeof window.openMasterDeskCreateLedger === 'function') {
        window.openMasterDeskCreateLedger({ initialName: raw, groupVal: 'sg:sg-tp', returnTab: 'purchase_voucher', selectId: 'purchaseVendor' });
      }
    });
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
    wrap.appendChild(btn);
    listEl.appendChild(wrap);
  }

  window.onPartyCreatedForPurchase = function(newParty, partySource) {
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
    multiOpt.textContent = 'Multi Payment';
    if (String(selectedId) === MULTI_PAYMENT_VALUE) multiOpt.selected = true;
    paySelect.appendChild(multiOpt);
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
    if (status === 'Full Payment') return getPurchaseGrandTotal();
    if (status === 'Partial Payment') return parseFloat(($('purchasePaymentAmount') || {}).value) || 0;
    return 0;
  }

  function openPurchaseMultiPaymentModal() {
    if (typeof window.openMultiPaymentModal !== 'function') return;
    window.openMultiPaymentModal({
      typeLabel: 'Payment',
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

    const qty = parseFloat(tr.querySelector('.sales-row-qty')?.value) || 0;
    let rate = Math.round(parsePurchaseAmt(tr.querySelector('.sales-row-rate')?.value || '0') * 100) / 100;
    const discount = parsePurchaseAmt(tr.querySelector('.sales-row-discount')?.value || '0');
    row.discountType = tr.querySelector('.sales-row-discount-type')?.value || 'val';
    row.tax = parseFloat(tr.querySelector('.sales-row-tax')?.value) || 0;

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

    // The payment can never be more than the Grand Total
    const payAmtEl = $('purchasePaymentAmount');
    if (payAmtEl && payAmtEl.value && total > 0) {
      const currentVal = parseFloat(payAmtEl.value) || 0;
      if (currentVal > total) {
        payAmtEl.value = total.toFixed(2);
        toast(`Payment Amount adjusted to ₹${fmt(total)} to not exceed the Grand Total.`, 'warning');
      }
    }

    // A cash purchase stays Full Payment from its own account
    applyPurchaseCashVendorLock();
    updatePurchaseMultiPaymentUI();
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
  function initPurchaseForm() {
    _editingPurchaseVoucher = null;
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
    validatePurchaseNoField();
    refreshPurchaseDraftButton();
    refreshPurchaseVendorAlterPencil();
    recalculatePurchaseTotals();
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
    initPurchaseForm();
    _editingPurchaseVoucher = (editIsPosted || editIsDraft) ? { id: v.id, isDraft: !!isDraft } : null;
    window._purchasePartyOverride = v.partyOverride ? JSON.parse(JSON.stringify(v.partyOverride)) : null;

    if ($('purchaseDate')) $('purchaseDate').value = v.date || localToday();
    if ($('purchaseDueDate')) $('purchaseDueDate').value = v.dueDate || v.date || localToday();

    // A draft whose number was taken meanwhile (posted on another voucher) gets the next free one
    const storedNo = (v.invoiceNo && v.invoiceNo.trim() && v.invoiceNo.trim() !== 'Draft') ? v.invoiceNo.trim() : '';
    const noTaken = editIsDraft && !!storedNo && typeof isDocNoUsed === 'function' && isDocNoUsed('purchase', storedNo, v.id);
    const invNoEl = $('purchaseInvoiceNo');
    if (invNoEl) invNoEl.value = (storedNo && !noTaken) ? storedNo : getNextPurchaseInvoiceNo();
    if ($('purchaseVoucherChipDisplay')) $('purchaseVoucherChipDisplay').textContent = (invNoEl && invNoEl.value) || 'PUR-XXXX';

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

    // Payment
    if (v.paymentStatus === 'Full Payment') setPurchasePaymentStatus('Full');
    else if (v.paymentStatus === 'Partial Payment') setPurchasePaymentStatus('Partial');
    else setPurchasePaymentStatus('NotPaid');
    populatePurchasePaymentAccounts(v.paymentAccountId);
    _purchasePaymentAccountPrev = v.paymentAccountId && v.paymentAccountId !== MULTI_PAYMENT_VALUE ? String(v.paymentAccountId) : '';
    setPurchaseMultiPayments(v.paymentSplits || []);
    if ($('purchasePaymentAmount')) $('purchasePaymentAmount').value = (v.paymentStatus === 'Partial Payment' && v.paymentAmount) ? v.paymentAmount : '';

    updatePurchaseDocUI(v.uploadedDoc || v.document || null);
    validatePurchaseNoField();
    refreshPurchaseDraftButton();
    refreshPurchaseVendorAlterPencil();
    updatePurchaseDueDateDays();
    recalculatePurchaseTotals();

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
    const paymentStatus = getPurchasePaymentStatus();
    const paymentAccountId = ($('purchasePaymentAccount') || {}).value || '';
    let paymentAmount = 0;
    if (paymentStatus === 'Full Payment') paymentAmount = total;
    else if (paymentStatus === 'Partial Payment') paymentAmount = parseFloat(($('purchasePaymentAmount') || {}).value) || 0;
    return {
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
      paymentAccountId: paymentStatus === 'Not Paid' ? '' : paymentAccountId,
      paymentAmount: r2(paymentAmount),
      paymentSplits: paymentStatus === 'Not Paid' ? [] : getPurchaseMultiPaymentSplits(),
      notes: ($('purchaseNotes') || {}).value || '',
      uploadedDoc: purchaseUploadedDoc || null
    };
  }

  function savePurchaseDraft() {
    // A posted voucher is changed with Save Purchase, not turned back into a draft
    if (_editingPurchaseVoucher && !_editingPurchaseVoucher.isDraft) {
      toast('This purchase is already posted — use Save Purchase to keep the changes.', 'warning');
      return;
    }
    const data = readPurchaseForm();
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

    toast('Purchase Voucher Draft saved successfully.', 'success');
    initPurchaseForm();
    // Stay on the Purchase form, ready for the next one (drafts are listed in Voucher Desk)
    if (typeof openTab === 'function') openTab('purchase_voucher');
    if (typeof renderVoucherDeskPanel === 'function') renderVoucherDeskPanel();
    if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
    // The saved draft opens in the same small preview popup as after Save
    if (typeof window.viewPurchaseVoucher === 'function') window.viewPurchaseVoucher(draft.id, { compact: true });
  }

  function postPurchaseVoucher() {
    const data = readPurchaseForm();

    if (!data.vendorId) {
      toast('Please select a Vendor / Supplier.', 'warning');
      return false;
    }
    if (!data.invoiceNo) {
      toast('Purchase number is required.', 'warning');
      return false;
    }
    // Numbers used by any purchase — including deleted ones — can't be issued again
    if (typeof checkDocNoBeforeSave === 'function' && !checkDocNoBeforeSave('purchase', data.invoiceNo, getPurchaseOwnId())) {
      return false;
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
    for (let i = 0; i < rows.length; i++) {
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
    }
    if (!data.date) {
      toast('Please select a Date.', 'warning');
      return false;
    }

    if (data.paymentStatus !== 'Not Paid') {
      if (!data.paymentAccountId) {
        toast('Please select a Payment Account.', 'warning');
        return false;
      }
      if (data.paymentStatus === 'Partial Payment') {
        if (data.paymentAmount <= 0) {
          toast('Payment Amount must be greater than zero for Partial Payments.', 'warning');
          return false;
        }
        if (data.paymentAmount > data.total + 0.001) {
          toast(`Payment Amount cannot exceed the Grand Total of ₹${fmt(data.total)}.`, 'warning');
          return false;
        }
      }
      if (data.paymentAmount <= 0) {
        toast('Payment Amount must be greater than zero.', 'warning');
        return false;
      }
      if (data.paymentAccountId === MULTI_PAYMENT_VALUE) {
        const splits = data.paymentSplits;
        if (splits.length === 0) {
          toast('Please select at least one account with an amount for Multi Payment.', 'warning');
          return false;
        }
        const hasDuplicate = splits.some((sp, i) => splits.findIndex(o => String(o.accountId) === String(sp.accountId)) !== i);
        if (hasDuplicate) {
          toast('Each Multi Payment account can be selected only once.', 'warning');
          return false;
        }
        const splitTotal = splits.reduce((sum, sp) => sum + sp.amount, 0);
        if (Math.abs(splitTotal - data.paymentAmount) > 0.01) {
          toast(`Multi Payment split of ₹${fmt(splitTotal)} must equal the payment amount of ₹${fmt(data.paymentAmount)}.`, 'warning');
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
      paymentVoucherNo: existing ? (existing.paymentVoucherNo || '') : ''
    });

    // Post to the books (flows to Trial Balance, Ledgers, P&L, Balance Sheet, Voucher Desk)
    const je = (typeof postPurchaseVoucherToJournal === 'function') ? postPurchaseVoucherToJournal(voucher) : null;
    if (je) {
      voucher.journalEntryId = je.purchaseJEId;
      voucher.tdsJournalEntryId = je.tdsJEId || '';
      voucher.tdsVoucherNo = je.tdsJEId ? je.tdsVoucherNo : '';
      voucher.paymentJournalEntryId = je.paymentJEId || '';
      voucher.paymentVoucherNo = je.paymentJEId ? je.paymentVoucherNo : '';
    }

    if (_editingPurchaseVoucher && _editingPurchaseVoucher.isDraft) {
      window.KYA_STORE.purchaseVouchersDrafts = (window.KYA_STORE.purchaseVouchersDrafts || []).filter(d => String(d.id) !== String(_editingPurchaseVoucher.id));
    }
    const list = window.KYA_STORE.purchaseVouchers = window.KYA_STORE.purchaseVouchers || [];
    const idx = list.findIndex(v => String(v.id) === String(voucher.id));
    if (idx > -1) list[idx] = voucher;
    else list.push(voucher);

    // Once posted, a number is used for good — deleting the voucher won't free it
    if (typeof registerDocNo === 'function') registerDocNo('purchase', voucher.invoiceNo);

    toast(`Purchase Voucher "${voucher.invoiceNo}" saved successfully.`, 'success');
    initPurchaseForm();
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
    const posted = postPurchaseVoucher();
    if (posted && returnTo && returnTo !== 'purchase_voucher' && typeof openTab === 'function') {
      openTab(returnTo);
      if (returnTo === 'voucher_desk' && typeof renderVoucherDeskPanel === 'function') renderVoucherDeskPanel();
    }
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
        initPurchaseForm();
      });
    }

    const newPurchaseBtn = $('btnNewPurchase');
    if (newPurchaseBtn && !newPurchaseBtn._wired) {
      newPurchaseBtn._wired = true;
      newPurchaseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        initPurchaseForm();
      });
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
        if (total > 0 && parseFloat(payAmtEl.value) > total) {
          payAmtEl.value = total.toFixed(2);
          toast(`Payment Amount adjusted to ₹${fmt(total)} to not exceed the Grand Total.`, 'warning');
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
  window.appendPurchasePartyCreateFooter = appendPurchasePartyCreateFooter;
  // The rows on the form (read live: app-shell only starts a fresh form when there are none)
  Object.defineProperty(window, 'purchaseRows', { configurable: true, get: () => purchaseRows });

  // Auto-init on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    wirePurchaseEventListeners();
  });

  // Also wire immediately in case DOM is already loaded
  wirePurchaseEventListeners();

})();
