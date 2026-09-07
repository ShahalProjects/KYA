/**
 * js/proforma.js
 * Proforma Invoice module for Pre Invoice (KYA)
 */
(function() {
  'use strict';

  let proformaRows = [];
  let _proformaDocData = null;
  let _proformaDocName = '';
  let _proformaDocSize = 0;
  let _proformaDocType = '';
  let _editingProforma = null;
  let _proformaOpenedFrom = 'preinvoice';
  let _proformaFilterStatus = 'all';
  let _proformaSearchQuery = '';

  const PROFORMA_MULTI_PAYMENT_VALUE = 'multi-payment';
  let _proformaMultiPayments = [];
  let _proformaPaymentAccountPrev = '';

  function safeEsc(str) {
    if (typeof ohEsc === 'function') return ohEsc(str);
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function safeFmtNum(num) {
    if (typeof fmtNum === 'function') return fmtNum(num);
    const n = parseFloat(num) || 0;
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function safeParseAmt(val) {
    if (typeof parseSalesAmt === 'function') return parseSalesAmt(val);
    if (!val) return 0;
    const clean = String(val).replace(/[^0-9.-]/g, '');
    return parseFloat(clean) || 0;
  }

  // ── Open / Close Proforma Form & List ──
  function openProformaForm(proformaData, openedFrom = 'preinvoice') {
    if (openedFrom) _proformaOpenedFrom = openedFrom;

    const preInvCard = document.getElementById('salesPreInvoiceCard');
    const salesFormCard = document.getElementById('salesVoucherFormCard');
    const quoteListCard = document.getElementById('salesQuotationListCard');
    const quoteFormCard = document.getElementById('salesQuotationFormCard');
    const proformaListCard = document.getElementById('salesProformaListCard');
    const proformaFormCard = document.getElementById('salesProformaFormCard');
    const orderFormCard = document.getElementById('salesOrderFormCard');
    const challanFormCard = document.getElementById('salesDeliveryChallanFormCard');

    if (preInvCard) preInvCard.style.display = 'none';
    if (salesFormCard) salesFormCard.style.display = 'none';
    if (quoteListCard) quoteListCard.style.display = 'none';
    if (quoteFormCard) quoteFormCard.style.display = 'none';
    if (proformaListCard) proformaListCard.style.display = 'none';
    if (orderFormCard) orderFormCard.style.display = 'none';
    if (challanFormCard) challanFormCard.style.display = 'none';
    if (proformaFormCard) proformaFormCard.style.display = 'block';

    window._currentSalesSubtype = 'Proforma';
    initProformaForm(proformaData);
  }

  function closeProformaForm() {
    const proformaFormCard = document.getElementById('salesProformaFormCard');
    if (proformaFormCard) proformaFormCard.style.display = 'none';

    _editingProforma = null;
    if (_proformaOpenedFrom === 'proformalist') {
      openProformaList(_proformaFilterStatus || 'all');
    } else {
      closeProformaList();
    }
  }

  function openProformaList(filterStatus = 'all') {
    const preInvCard = document.getElementById('salesPreInvoiceCard');
    const salesFormCard = document.getElementById('salesVoucherFormCard');
    const quoteListCard = document.getElementById('salesQuotationListCard');
    const quoteFormCard = document.getElementById('salesQuotationFormCard');
    const proformaListCard = document.getElementById('salesProformaListCard');
    const proformaFormCard = document.getElementById('salesProformaFormCard');
    const orderFormCard = document.getElementById('salesOrderFormCard');
    const challanFormCard = document.getElementById('salesDeliveryChallanFormCard');

    if (preInvCard) preInvCard.style.display = 'none';
    if (salesFormCard) salesFormCard.style.display = 'none';
    if (quoteListCard) quoteListCard.style.display = 'none';
    if (quoteFormCard) quoteFormCard.style.display = 'none';
    if (proformaFormCard) proformaFormCard.style.display = 'none';
    if (orderFormCard) orderFormCard.style.display = 'none';
    if (challanFormCard) challanFormCard.style.display = 'none';
    if (proformaListCard) proformaListCard.style.display = 'block';

    _proformaFilterStatus = filterStatus || 'all';

    const contentArea = document.getElementById('proformaListFullContentArea');
    if (contentArea) {
      contentArea.innerHTML = renderProformaList(_proformaFilterStatus);
      attachProformaListEvents();
    }
  }

  function closeProformaList() {
    const preInvCard = document.getElementById('salesPreInvoiceCard');
    const proformaListCard = document.getElementById('salesProformaListCard');
    const proformaFormCard = document.getElementById('salesProformaFormCard');

    if (proformaListCard) proformaListCard.style.display = 'none';
    if (proformaFormCard) proformaFormCard.style.display = 'none';
    if (preInvCard) preInvCard.style.display = 'block';

    if (typeof window.switchSalesPreInvTab === 'function') {
      window.switchSalesPreInvTab('preinvoice');
    }
  }

  // ── Initialize Proforma Form ──
  function initProformaForm(proformaData) {
    const today = new Date().toISOString().split('T')[0];
    const expiryDateObj = new Date();
    expiryDateObj.setDate(expiryDateObj.getDate() + 30);
    const expiryDate = expiryDateObj.toISOString().split('T')[0];

    const dateEl = document.getElementById('proformaDate');
    const expiryEl = document.getElementById('proformaExpiryDate');
    const noEl = document.getElementById('proformaNo');
    const chipEl = document.getElementById('proformaChipDisplay');
    const notesEl = document.getElementById('proformaNotes');
    const supplyTypeEl = document.getElementById('proformaSupplyType');
    const dueEl = document.getElementById('proformaDueDate');

    if (proformaData) {
      _editingProforma = proformaData;
      if (dateEl) dateEl.value = proformaData.date || today;
      if (expiryEl) expiryEl.value = proformaData.expiryDate || expiryDate;
      if (dueEl) dueEl.value = proformaData.dueDate || expiryDate;
      if (noEl) noEl.value = proformaData.proformaNo || '';
      if (chipEl) chipEl.textContent = proformaData.proformaNo || 'PI-2026-001';
      if (notesEl) notesEl.value = proformaData.notes || '';
      if (supplyTypeEl && proformaData.supplyType) supplyTypeEl.value = proformaData.supplyType;

      proformaRows = Array.isArray(proformaData.rows) ? JSON.parse(JSON.stringify(proformaData.rows)) : [];
      if (proformaRows.length === 0) {
        proformaRows = [{ item: '', hsn: '', qty: 1, unit: '', rate: 0, discount: 0, discountType: 'val', tax: 18, amount: 0 }];
      }

      // Populate customer
      populateProformaCustomers();
      if (proformaData.customerId) {
        selectProformaCustomer(proformaData.customerId);
      }

      // Populate executive
      populateProformaExecutives(proformaData.salesExecutiveId);

      // Adjustments
      const adjEl = document.getElementById('proformaAdjustments');
      if (adjEl) adjEl.value = proformaData.adjustments || '';

      // TDS / TCS
      const noneBtn = document.getElementById('proformaTdsTcsNone');
      const tdsBtn = document.getElementById('proformaTdsTcsTds');
      const tcsBtn = document.getElementById('proformaTdsTcsTcs');
      if (proformaData.tdsTcsMode === 'TDS' && tdsBtn) tdsBtn.click();
      else if (proformaData.tdsTcsMode === 'TCS' && tcsBtn) tcsBtn.click();
      else if (noneBtn) noneBtn.click();

      const rateSelect = document.getElementById('proformaTdsTcsRateSelect');
      const customInput = document.getElementById('proformaTdsTcsRateCustom');
      const customWrap = document.getElementById('proformaTdsTcsRateCustomWrap');
      const rateVal = proformaData.tdsTcsRate || 0;
      if (rateSelect) {
        if (rateSelect.querySelector(`option[value="${rateVal}"]`)) {
          rateSelect.value = String(rateVal);
          if (customWrap) customWrap.style.display = 'none';
        } else if (rateVal > 0) {
          rateSelect.value = 'custom';
          if (customInput) customInput.value = rateVal;
          if (customWrap) customWrap.style.display = 'flex';
        }
      }

      const amtInput = document.getElementById('proformaTdsTcsAmount');
      if (amtInput && proformaData.tdsTcsAmount !== undefined) {
        amtInput.value = proformaData.tdsTcsAmount;
      }

      // Advance Payment
      populateProformaPaymentAccounts(proformaData.paymentAccountId);
      setProformaMultiPayments(proformaData.paymentSplits || []);
      _proformaPaymentAccountPrev = proformaData.paymentAccountId || '';
      const payAmtEl = document.getElementById('proformaPaymentAmount');
      if (payAmtEl) {
        payAmtEl.value = (proformaData.paymentStatus === 'Full Payment')
          ? (proformaData.paymentAmount || proformaData.total || '')
          : (proformaData.paymentAmount || '');
      }
      updateProformaMultiPaymentUI();

      // Doc attachment
      updateProformaDocUI(proformaData.document || null);
    } else {
      _editingProforma = null;
      if (dateEl) dateEl.value = today;
      if (expiryEl) expiryEl.value = expiryDate;
      if (dueEl) dueEl.value = expiryDate;

      // Generate next proforma number
      const nextNum = getNextProformaNumber();
      if (noEl) noEl.value = nextNum;
      if (chipEl) chipEl.textContent = nextNum;
      if (notesEl) notesEl.value = '';
      if (supplyTypeEl) supplyTypeEl.value = 'Intra-State (CGST + SGST)';

      proformaRows = [{ item: '', hsn: '', qty: 1, unit: '', rate: 0, discount: 0, discountType: 'val', tax: 18, amount: 0 }];

      populateProformaCustomers();
      populateProformaExecutives();

      const adjEl = document.getElementById('proformaAdjustments');
      if (adjEl) adjEl.value = '';

      const noneBtn = document.getElementById('proformaTdsTcsNone');
      if (noneBtn) noneBtn.click();

      populateProformaPaymentAccounts();
      resetProformaMultiPayments();

      const payAccEl = document.getElementById('proformaPaymentAccount');
      if (payAccEl) payAccEl.value = '';
      const payAmtEl = document.getElementById('proformaPaymentAmount');
      if (payAmtEl) payAmtEl.value = '';

      updateProformaDocUI(null);
    }

    updateProformaDueDateHelper();
    renderProformaRows();
    recalculateProformaTotals();
  }

  function getNextProformaNumber() {
    window.KYA_STORE = window.KYA_STORE || {};
    const list = (window.KYA_STORE.proformaInvoices || []).concat(window.KYA_STORE.proformaInvoicesDrafts || []);
    const count = list.length + 1;
    const year = new Date().getFullYear();
    const pad = count < 10 ? '00' + count : (count < 100 ? '0' + count : count);
    return `PI-${year}-${pad}`;
  }

  // ── Due Date Helper ──
  function updateProformaDueDateHelper() {
    const dateEl = document.getElementById('proformaDate');
    const dueEl = document.getElementById('proformaDueDate');
    const daysEl = document.getElementById('proformaDueDateDays');
    if (!dateEl || !dueEl || !daysEl) return;

    const dateVal = dateEl.value;
    const dueVal = dueEl.value;

    if (!dateVal || !dueVal) {
      daysEl.textContent = '';
      return;
    }

    const d1 = new Date(dateVal);
    const d2 = new Date(dueVal);
    d1.setHours(0,0,0,0);
    d2.setHours(0,0,0,0);

    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      daysEl.textContent = 'Due Today';
      daysEl.style.color = 'var(--blue-600)';
    } else if (diffDays > 0) {
      daysEl.textContent = `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
      daysEl.style.color = 'var(--slate-500)';
    } else {
      const overdue = Math.abs(diffDays);
      daysEl.textContent = `Overdue by ${overdue} day${overdue === 1 ? '' : 's'}`;
      daysEl.style.color = 'var(--red-600)';
    }
  }

  // ── Payment Accounts & Status ──
  function populateProformaPaymentAccounts(selectedId = null) {
    const paySelect = document.getElementById('proformaPaymentAccount');
    if (!paySelect) return;

    paySelect.innerHTML = '<option value="">&mdash; Select &mdash;</option>';

    let accounts = (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers))
      ? coaLedgers.filter(l => l.type === 'ledger' && l.sgId === 'sg-cce')
      : [];

    if (accounts.length === 0 && typeof getOrCreateSystemLedger === 'function') {
      getOrCreateSystemLedger('Cash Account', 'sg-cce');
      getOrCreateSystemLedger('Bank Account', 'sg-cce');
      accounts = coaLedgers.filter(l => l.type === 'ledger' && l.sgId === 'sg-cce');
    }

    accounts.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.name;
      if (selectedId && String(a.id) === String(selectedId)) {
        opt.selected = true;
      }
      paySelect.appendChild(opt);
    });

    const multiOpt = document.createElement('option');
    multiOpt.value = PROFORMA_MULTI_PAYMENT_VALUE;
    multiOpt.textContent = 'Multi Payment';
    if (String(selectedId) === PROFORMA_MULTI_PAYMENT_VALUE) multiOpt.selected = true;
    paySelect.appendChild(multiOpt);
  }

  // Debit rows for the advance receipt: one per account, scaled to `amount` when the
  // advance is split across several of them (rounding lands on the last row).
  function getProformaAdvanceReceiptRows(data, amount) {
    const ledgers = (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) ? coaLedgers : [];
    const nameOf = (id) => {
      const ledger = ledgers.find(l => String(l.id) === String(id));
      return ledger ? ledger.name : 'Cash Account';
    };

    const splits = (Array.isArray(data.paymentSplits) ? data.paymentSplits : [])
      .filter(sp => sp && sp.accountId && (parseFloat(sp.amount) || 0) > 0);
    const splitTotal = splits.reduce((sum, sp) => sum + (parseFloat(sp.amount) || 0), 0);

    if (String(data.paymentAccountId) !== PROFORMA_MULTI_PAYMENT_VALUE || splitTotal <= 0) {
      const single = ledgers.find(l => String(l.id) === String(data.paymentAccountId));
      return [{ name: single ? single.name : (data.paymentAccountName || 'Cash Account'), amount: amount }];
    }

    const rows = [];
    let allocated = 0;
    splits.forEach((sp, i) => {
      const amt = (i === splits.length - 1)
        ? Math.round((amount - allocated) * 100) / 100
        : Math.round(((parseFloat(sp.amount) || 0) / splitTotal) * amount * 100) / 100;
      allocated += amt;
      rows.push({ name: nameOf(sp.accountId), amount: amt });
    });

    const usable = rows.filter(r => r.amount > 0);
    return usable.length ? usable : [{ name: nameOf(splits[0].accountId), amount: amount }];
  }

  function getProformaCashEquivalentLedgers() {
    let accounts = (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers))
      ? coaLedgers.filter(l => l.type === 'ledger' && l.sgId === 'sg-cce')
      : [];

    if (accounts.length === 0 && typeof getOrCreateSystemLedger === 'function') {
      getOrCreateSystemLedger('Cash Account', 'sg-cce');
      getOrCreateSystemLedger('Bank Account', 'sg-cce');
      accounts = coaLedgers.filter(l => l.type === 'ledger' && l.sgId === 'sg-cce');
    }
    return accounts;
  }

  // ── Multi Payment: split the advance across several cash & cash equivalent accounts ──
  function isProformaMultiPaymentSelected() {
    const paySelect = document.getElementById('proformaPaymentAccount');
    return !!paySelect && paySelect.value === PROFORMA_MULTI_PAYMENT_VALUE;
  }

  // The advance entered is what gets split.
  function getProformaMultiPaymentTarget() {
    const total = getProformaGrandTotal();
    const advance = getProformaAdvanceAmount();
    return (total > 0) ? Math.min(advance, total) : advance;
  }

  function openProformaMultiPaymentModal() {
    if (typeof window.openMultiPaymentModal !== 'function') return;
    window.openMultiPaymentModal({
      typeLabel: 'Advance',
      getTarget: getProformaMultiPaymentTarget,
      getAccounts: getProformaCashEquivalentLedgers,
      splits: _proformaMultiPayments,
      onSave: rows => {
        _proformaMultiPayments = rows;
        updateProformaMultiPaymentUI();
      },
      onCancel: () => {
        // Nothing saved yet? Fall back to the account picked before Multi Payment.
        if (_proformaMultiPayments.length === 0) {
          const paySelect = document.getElementById('proformaPaymentAccount');
          if (paySelect) paySelect.value = _proformaPaymentAccountPrev || '';
        }
        updateProformaMultiPaymentUI();
      }
    });
  }

  // Compact recap under the Payment Account dropdown; click it to reopen the modal.
  function updateProformaMultiPaymentUI() {
    const summaryBtn = document.getElementById('proformaMultiPaymentSummary');
    if (!summaryBtn) return;

    if (!isProformaMultiPaymentSelected()) {
      summaryBtn.style.display = 'none';
      return;
    }

    const splits = _proformaMultiPayments.filter(s => s.accountId && (parseFloat(s.amount) || 0) > 0);
    const allocated = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
    const balanced = Math.abs(getProformaMultiPaymentTarget() - allocated) < 0.01;

    summaryBtn.style.display = 'flex';
    summaryBtn.innerHTML = splits.length
      ? `<span>${splits.length} account${splits.length > 1 ? 's' : ''} &middot; <span style="color:${balanced ? '#059669' : '#dc2626'}">₹ ${safeFmtNum(allocated)}</span></span><span style="color:var(--blue-600);">Edit</span>`
      : `<span style="color:#dc2626;">No accounts selected</span><span style="color:var(--blue-600);">Set up</span>`;
  }

  function getProformaMultiPaymentSplits() {
    if (!isProformaMultiPaymentSelected()) return [];
    return _proformaMultiPayments
      .filter(s => s.accountId && (parseFloat(s.amount) || 0) > 0)
      .map(s => ({ accountId: s.accountId, amount: parseFloat(s.amount) || 0 }));
  }

  function setProformaMultiPayments(splits) {
    _proformaMultiPayments = (Array.isArray(splits) ? splits : []).map(s => ({
      accountId: s.accountId ? String(s.accountId) : '',
      amount: (s.amount || s.amount === 0) ? String(s.amount) : ''
    }));
  }

  function resetProformaMultiPayments() {
    _proformaMultiPayments = [];
    _proformaPaymentAccountPrev = '';
    if (typeof window.closeMultiPaymentModal === 'function') window.closeMultiPaymentModal();
    const summaryBtn = document.getElementById('proformaMultiPaymentSummary');
    if (summaryBtn) summaryBtn.style.display = 'none';
  }

  // Grand total of the proforma as shown in the summary card.
  function getProformaGrandTotal() {
    const subTotal = calculateProformaSubtotal();

    let tdsTcsMode = 'None';
    const tdsBtn = document.getElementById('proformaTdsTcsTds');
    const tcsBtn = document.getElementById('proformaTdsTcsTcs');
    if (tdsBtn && tdsBtn.classList.contains('active')) tdsTcsMode = 'TDS';
    if (tcsBtn && tcsBtn.classList.contains('active')) tdsTcsMode = 'TCS';

    const amountInput = document.getElementById('proformaTdsTcsAmount');
    const tdsTcsAmount = amountInput ? (parseFloat(amountInput.value) || 0) : 0;
    const adjustmentsInput = document.getElementById('proformaAdjustments');
    const adjustments = adjustmentsInput ? (parseFloat(adjustmentsInput.value) || 0) : 0;

    let total = subTotal;
    if (tdsTcsMode === 'TDS') total = subTotal - tdsTcsAmount;
    else if (tdsTcsMode === 'TCS') total = subTotal + tdsTcsAmount;
    return total + adjustments;
  }

  function getProformaAdvanceAmount() {
    return parseFloat(document.getElementById('proformaPaymentAmount')?.value) || 0;
  }

  // A proforma only records an advance, so the status follows the advance entered:
  // nothing = Not Paid, the whole total = Full Payment, anything between = Partial.
  function getProformaPaymentStatus() {
    const advance = getProformaAdvanceAmount();
    if (advance <= 0) return 'Not Paid';

    const total = getProformaGrandTotal();
    return (total > 0 && advance >= total - 0.01) ? 'Full Payment' : 'Partial Payment';
  }

  // ── Customer Search & Selection ──
  function populateProformaCustomers(filter) {
    const custs = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
    const optionsList = document.getElementById('proformaCustomerSelectOptionsList');
    const selectEl = document.getElementById('proformaCustomer');
    if (!optionsList) return;

    optionsList.innerHTML = '';
    if (selectEl) {
      selectEl.innerHTML = '<option value="">&mdash; Select Customer &mdash;</option>';
    }

    const query = (filter || '').toLowerCase().trim();
    let matchCount = 0;

    custs.forEach(c => {
      if (selectEl) {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name + (c.alias ? ` (${c.alias})` : '');
        selectEl.appendChild(opt);
      }

      const matchName = (c.name || '').toLowerCase().includes(query);
      const matchAlias = (c.alias || '').toLowerCase().includes(query);
      const matchGstin = (c.gstin || '').toLowerCase().includes(query);

      if (query && !matchName && !matchAlias && !matchGstin) return;
      matchCount++;

      const item = document.createElement('div');
      item.style.padding = '8px 12px';
      item.style.fontSize = '13px';
      item.style.borderRadius = '6px';
      item.style.cursor = 'pointer';
      item.style.fontWeight = '500';
      item.style.display = 'flex';
      item.style.justifyContent = 'space-between';
      item.style.alignItems = 'center';

      item.onmouseover = () => item.style.background = 'var(--slate-50)';
      item.onmouseout = () => item.style.background = 'transparent';

      item.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <span style="font-weight: 600; color: var(--slate-800);">${safeEsc(c.name)}</span>
          <span style="font-size: 11px; color: var(--slate-400);">${safeEsc(c.alias ? `Alias: ${c.alias} • ` : '')}${safeEsc(c.gstin || 'Unregistered')}</span>
        </div>
        <span style="font-size: 11px; font-weight: 600; color: var(--blue-600); background: #eff6ff; padding: 2px 6px; border-radius: 4px;">Select</span>
      `;

      item.addEventListener('click', () => {
        selectProformaCustomer(c.id);
        const dropdown = document.getElementById('proformaCustomerSelectDropdown');
        if (dropdown) dropdown.style.display = 'none';
      });

      optionsList.appendChild(item);
    });

    if (matchCount === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.padding = '12px';
      emptyMsg.style.textAlign = 'center';
      emptyMsg.style.fontSize = '12.5px';
      emptyMsg.style.color = 'var(--slate-400)';
      emptyMsg.textContent = 'No customers found';
      optionsList.appendChild(emptyMsg);
    }
  }

  function selectProformaCustomer(customerId) {
    const custs = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
    const cust = custs.find(c => String(c.id) === String(customerId));
    const triggerText = document.getElementById('proformaCustomerSelectTriggerText');
    const selectEl = document.getElementById('proformaCustomer');

    if (selectEl) selectEl.value = customerId || '';
    if (triggerText) {
      triggerText.textContent = cust ? cust.name : '— Select Customer —';
      triggerText.style.color = cust ? 'var(--slate-800)' : 'var(--slate-500)';
      triggerText.style.fontWeight = cust ? '600' : '500';
    }

    if (cust && cust.state) {
      const isInterstate = isProformaInterstate(cust.state);
      const supplyTypeEl = document.getElementById('proformaSupplyType');
      if (supplyTypeEl) {
        supplyTypeEl.value = isInterstate ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)';
      }
    }
  }

  function isProformaInterstate(partyState) {
    if (!partyState) return false;
    const companyProfile = (typeof getKyaCompanyProfile === 'function') ? getKyaCompanyProfile() : {};
    const companyState = companyProfile.state || 'Kerala';
    return partyState.trim().toLowerCase() !== companyState.trim().toLowerCase();
  }

  function populateProformaExecutives(selectedId) {
    const execEl = document.getElementById('proformaSalesExecutive');
    if (!execEl) return;
    execEl.innerHTML = '<option value="">&mdash; Select Sales Executive &mdash;</option>';

    if (typeof ohEmployees !== 'undefined' && Array.isArray(ohEmployees) && ohEmployees.length > 0) {
      ohEmployees.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = `${e.name} (${e.code || ''})`;
        if (selectedId && String(e.id) === String(selectedId)) opt.selected = true;
        execEl.appendChild(opt);
      });
    } else {
      const execs = (typeof coaLedgers !== 'undefined' ? coaLedgers : []).filter(l => l.sgId === 'sg-emp' || l.group === 'Employees');
      execs.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = e.name;
        if (selectedId && String(e.id) === String(selectedId)) opt.selected = true;
        execEl.appendChild(opt);
      });
    }
  }

  // ── Render Line Item Rows ──
  function renderProformaRows() {
    const body = document.getElementById('proformaItemBody');
    if (!body) return;

    body.innerHTML = '';

    proformaRows.forEach((row, index) => {
      const trHtml = `
        <tr class="sales-row" data-row-index="${index}">
          <td class="sales-cell-item" style="padding: 4px 8px;">
            <div style="position: relative; display: flex; align-items: center; width: 100%;">
              <input type="text" class="sales-row-item je-input" value="${safeEsc(row.item || '')}" placeholder="Select or type Description (Product / Service)" style="border: none; background: transparent; box-shadow: none; padding: 0 18px 0 0; width: 100%; font-weight: 600; font-size: 13px; color: var(--slate-800); outline: none;" autocomplete="off" />
              <span class="sales-row-drop-arrow" style="position: absolute; right: 2px; pointer-events: none; color: var(--slate-400); font-size: 10px;">▼</span>
            </div>
          </td>
          <td class="sales-cell-hsn" style="width: 90px; padding: 4px 6px;">
            <input type="text" class="sales-row-hsn je-input" value="${safeEsc(row.hsn || '')}" placeholder="HSN/SAC" style="border: none; background: transparent; box-shadow: none; padding: 0; font-size: 12.5px; font-family: monospace, inherit; font-weight: 600; color: var(--slate-700); outline: none; width: 100%;" />
          </td>
          <td class="sales-cell-qty" style="width: 65px; padding: 4px 6px;">
            <input type="number" class="sales-row-qty je-input" value="${row.qty !== undefined ? row.qty : 1}" min="0" style="border: none; background: transparent; box-shadow: none; text-align: right; padding: 0; font-weight: 600; font-size: 13px; color: var(--slate-800); outline: none; width: 100%;" />
          </td>
          <td class="sales-cell-unit" style="width: 65px; padding: 4px 6px; text-align: center;">
            <input type="text" class="sales-row-unit je-input" value="${safeEsc(row.unit || '')}" placeholder="Unit" style="border: none; background: transparent; box-shadow: none; text-align: center; padding: 0; font-weight: 600; text-transform: uppercase; font-size: 12px; color: var(--slate-700); outline: none; width: 100%;" />
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
            <select class="sales-row-tax je-input" style="border: none; background: transparent; box-shadow: none; text-align: right; text-align-last: right; padding-right: 2px; font-weight: 600; font-size: 12.5px; color: var(--slate-800); width: 100%; outline: none; cursor: pointer;">
              <option value="0" ${row.tax === 0 ? 'selected' : ''}>0%</option>
              <option value="5" ${row.tax === 5 ? 'selected' : ''}>5%</option>
              <option value="12" ${row.tax === 12 ? 'selected' : ''}>12%</option>
              <option value="18" ${row.tax === 18 || row.tax === undefined ? 'selected' : ''}>18%</option>
              <option value="28" ${row.tax === 28 ? 'selected' : ''}>28%</option>
            </select>
          </td>
          <td class="sales-cell-amt" style="width: 110px; padding: 4px 6px;">
            <input type="text" inputmode="decimal" class="sales-row-amount-input je-input" value="${row.amount === 0 || row.amount === undefined ? '' : row.amount.toFixed(2)}" placeholder="0.00" style="border: none; background: transparent; box-shadow: none; text-align: right; padding: 0; font-weight: 700; width: 100%; font-size: 13.5px; color: var(--slate-900); outline: none;" />
          </td>
          <td class="sales-del-cell" style="width: 36px; padding: 2px; text-align: center; border: none !important; background: transparent !important; box-shadow: none !important;">
            <button type="button" class="sales-del-row proforma-del-row" style="background: none; border: none !important; outline: none !important; box-shadow: none !important; color: var(--red-600); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; margin: 0 auto; transition: background 0.15s;" onmouseover="this.style.backgroundColor='var(--red-50)'" onmouseout="this.style.backgroundColor='transparent'">
              <svg viewBox="0 0 15 15" fill="none" style="width: 13px; height: 13px;">
                <path d="M5.5 2h4M1.5 4h12M2.5 4l1 9.5a1 1 0 001 .5h6a1 1 0 001-.5l1-9.5M5.5 6.5v5M9.5 6.5v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
            </button>
          </td>
        </tr>
      `;

      const tempDiv = document.createElement('tbody');
      tempDiv.innerHTML = trHtml;
      const tr = tempDiv.firstElementChild;
      body.appendChild(tr);

      // Connect item portal
      const itemInp = tr.querySelector('.sales-row-item');
      if (itemInp && typeof _salesItemPortal !== 'undefined') {
        const attachPortal = () => {
          _salesItemPortal.open(itemInp, itemInp.value, (selectedItem) => {
            itemInp.value = selectedItem.name;
            proformaRows[index].item = selectedItem.name;
            proformaRows[index].itemType = selectedItem.type;
            if (selectedItem.type === 'Service' && selectedItem.id) {
              proformaRows[index].revenueLedgerId = selectedItem.id;
            }
            recalculateProformaTotals();
          });
        };

        itemInp.addEventListener('focus', attachPortal);
        itemInp.addEventListener('click', attachPortal);
        itemInp.addEventListener('input', () => {
          proformaRows[index].item = itemInp.value;
          attachPortal();
        });
      }
    });
  }

  function addProformaRow() {
    proformaRows.push({ item: '', hsn: '', qty: 1, unit: '', rate: 0, discount: 0, discountType: 'val', tax: 18, amount: 0 });
    renderProformaRows();
    recalculateProformaTotals();
  }

  function updateProformaRowFromDOM(index, tr, triggeredBy) {
    const row = proformaRows[index];
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
    let rate = Math.round(safeParseAmt(tr.querySelector('.sales-row-rate')?.value || '0') * 100) / 100;
    let discount = safeParseAmt(tr.querySelector('.sales-row-discount')?.value || '0');
    row.discountType = tr.querySelector('.sales-row-discount-type')?.value || 'val';
    row.tax = parseFloat(tr.querySelector('.sales-row-tax')?.value) || 0;

    if (amountEdited) {
      const enteredAmount = Math.round(safeParseAmt(amtInput.value) * 100) / 100;
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

    recalculateProformaTotals();
  }

  // ── Calculation & Totals ──
  function calculateProformaSubtotal() {
    if (!Array.isArray(proformaRows)) return 0;
    let sub = 0;
    proformaRows.forEach(r => {
      sub += (parseFloat(r.amount) || 0);
    });
    return Math.round(sub * 100) / 100;
  }

  function recalculateProformaTotals() {
    const subTotal = calculateProformaSubtotal();
    const subTotalEl = document.getElementById('proformaSubTotal');
    if (subTotalEl) subTotalEl.textContent = '₹ ' + safeFmtNum(subTotal);

    let tdsTcsMode = 'None';
    const tdsBtn = document.getElementById('proformaTdsTcsTds');
    const tcsBtn = document.getElementById('proformaTdsTcsTcs');
    if (tdsBtn && tdsBtn.classList.contains('active')) tdsTcsMode = 'TDS';
    if (tcsBtn && tcsBtn.classList.contains('active')) tdsTcsMode = 'TCS';

    const rateSelect = document.getElementById('proformaTdsTcsRateSelect');
    const customWrap = document.getElementById('proformaTdsTcsRateCustomWrap');
    let rate = 0;

    if (tdsTcsMode === 'None') {
      rate = 0;
    } else if (rateSelect) {
      if (rateSelect.value === 'custom') {
        if (customWrap) customWrap.style.display = 'flex';
        const customInput = document.getElementById('proformaTdsTcsRateCustom');
        rate = customInput ? (parseFloat(customInput.value) || 0) : 0;
      } else {
        if (customWrap) customWrap.style.display = 'none';
        rate = parseFloat(rateSelect.value) || 0;
      }
    }

    const amountInput = document.getElementById('proformaTdsTcsAmount');
    if (amountInput && document.activeElement !== amountInput) {
      if (tdsTcsMode !== 'None') {
        const calculatedAmt = subTotal * (rate / 100);
        amountInput.value = calculatedAmt.toFixed(2);
      } else {
        amountInput.value = '';
      }
    }

    const tdsTcsAmount = amountInput ? (parseFloat(amountInput.value) || 0) : 0;
    const adjustmentsInput = document.getElementById('proformaAdjustments');
    const adjustments = adjustmentsInput ? (parseFloat(adjustmentsInput.value) || 0) : 0;

    const btnAuto = document.getElementById('btnProformaAutoRoundOff');
    if (btnAuto) {
      if (adjustmentsInput && adjustmentsInput.value.trim() !== '' && adjustments !== 0) {
        btnAuto.classList.add('active');
      } else if (!adjustmentsInput || adjustmentsInput.value.trim() === '') {
        btnAuto.classList.remove('active');
      }
    }

    let total = subTotal;
    if (tdsTcsMode === 'TDS') {
      total = subTotal - tdsTcsAmount;
    } else if (tdsTcsMode === 'TCS') {
      total = subTotal + tdsTcsAmount;
    }
    total += adjustments;

    const totalEl = document.getElementById('proformaTotal');
    if (totalEl) totalEl.textContent = '₹ ' + safeFmtNum(total);

    // The advance can never exceed the Grand Total
    const payAmtEl = document.getElementById('proformaPaymentAmount');
    if (payAmtEl) {
      payAmtEl.max = total > 0 ? total : '';
      if (payAmtEl.value && total > 0) {
        const curVal = parseFloat(payAmtEl.value) || 0;
        if (curVal > total) {
          payAmtEl.value = total.toFixed(2);
        }
      }
    }
  }

  function autoCalculateProformaRoundOff() {
    const btnAuto = document.getElementById('btnProformaAutoRoundOff');
    const adjEl = document.getElementById('proformaAdjustments');

    if (btnAuto && btnAuto.classList.contains('active') && adjEl && adjEl.value.trim() !== '') {
      adjEl.value = '';
      btnAuto.classList.remove('active');
      recalculateProformaTotals();
      return;
    }

    const subTotal = calculateProformaSubtotal();
    let tdsTcsMode = 'None';
    const tdsBtn = document.getElementById('proformaTdsTcsTds');
    const tcsBtn = document.getElementById('proformaTdsTcsTcs');
    if (tdsBtn && tdsBtn.classList.contains('active')) tdsTcsMode = 'TDS';
    if (tcsBtn && tcsBtn.classList.contains('active')) tdsTcsMode = 'TCS';

    const amountInput = document.getElementById('proformaTdsTcsAmount');
    const tdsTcsAmount = amountInput ? (safeParseAmt(amountInput.value) || 0) : 0;

    let rawTotal = subTotal;
    if (tdsTcsMode === 'TDS') rawTotal = subTotal - tdsTcsAmount;
    else if (tdsTcsMode === 'TCS') rawTotal = subTotal + tdsTcsAmount;

    const roundedTotal = Math.round(rawTotal);
    const roundOffAmt = Math.round((roundedTotal - rawTotal) * 100) / 100;

    if (adjEl) {
      adjEl.value = roundOffAmt !== 0 ? (roundOffAmt > 0 ? `+${roundOffAmt.toFixed(2)}` : roundOffAmt.toFixed(2)) : '0.00';
    }
    if (btnAuto) btnAuto.classList.add('active');

    recalculateProformaTotals();
  }

  // ── Document Upload Handling ──
  function updateProformaDocUI(docData) {
    const emptyState = document.getElementById('proformaDocEmptyState');
    const selectedState = document.getElementById('proformaDocSelectedState');
    const statusBadge = document.getElementById('proformaDocStatusBadge');
    const fileNameEl = document.getElementById('proformaDocFileName');
    const fileSizeEl = document.getElementById('proformaDocFileSize');
    const fileIconEl = document.getElementById('proformaDocFileIcon');
    const previewBtn = document.getElementById('proformaDocPreviewBtn');
    const fileInput = document.getElementById('proformaDocFileInput');

    if (!docData) {
      _proformaDocData = null;
      _proformaDocName = '';
      _proformaDocSize = 0;
      _proformaDocType = '';
      if (emptyState) emptyState.style.display = 'flex';
      if (selectedState) selectedState.style.display = 'none';
      if (statusBadge) statusBadge.style.display = 'none';
      if (fileInput) fileInput.value = '';
      return;
    }

    _proformaDocData = docData.data;
    _proformaDocName = docData.name || 'Document';
    _proformaDocSize = docData.size || 0;
    _proformaDocType = docData.type || '';

    if (emptyState) emptyState.style.display = 'none';
    if (selectedState) selectedState.style.display = 'flex';
    if (statusBadge) statusBadge.style.display = 'inline-block';

    if (fileNameEl) fileNameEl.textContent = _proformaDocName;
    if (fileSizeEl) fileSizeEl.textContent = formatProformaFileSize(_proformaDocSize);

    const ext = (_proformaDocName.split('.').pop() || 'DOC').toUpperCase().slice(0, 4);
    if (fileIconEl) fileIconEl.textContent = ext;

    if (previewBtn) {
      previewBtn.href = _proformaDocData;
      previewBtn.download = _proformaDocName;
    }
  }

  function formatProformaFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function handleProformaFileUpload(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('File size exceeds maximum limit of 10MB.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      updateProformaDocUI({
        name: file.name,
        size: file.size,
        type: file.type,
        data: e.target.result
      });
      showToast('Document attached successfully.', 'success');
    };
    reader.readAsDataURL(file);
  }

  // ── Save / Post Proforma Invoice ──
  function getProformaFormData() {
    const date = document.getElementById('proformaDate')?.value || new Date().toISOString().split('T')[0];
    const expiryDate = document.getElementById('proformaExpiryDate')?.value || '';
    const dueDate = document.getElementById('proformaDueDate')?.value || expiryDate;
    const proformaNo = document.getElementById('proformaNo')?.value?.trim() || getNextProformaNumber();
    const customerId = document.getElementById('proformaCustomer')?.value || '';
    const custs = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
    const cust = custs.find(c => String(c.id) === String(customerId));
    const customerName = cust ? cust.name : '';

    const supplyType = document.getElementById('proformaSupplyType')?.value || 'Intra-State (CGST + SGST)';
    const salesExecutiveId = document.getElementById('proformaSalesExecutive')?.value || '';
    let salesExecutiveName = '';
    if (typeof ohEmployees !== 'undefined' && Array.isArray(ohEmployees)) {
      const emp = ohEmployees.find(e => String(e.id) === String(salesExecutiveId));
      if (emp) salesExecutiveName = emp.name;
    }
    if (!salesExecutiveName && typeof coaLedgers !== 'undefined') {
      const exec = coaLedgers.find(l => String(l.id) === String(salesExecutiveId));
      if (exec) salesExecutiveName = exec.name;
    }

    const notes = document.getElementById('proformaNotes')?.value || '';
    const subTotal = calculateProformaSubtotal();

    let tdsTcsMode = 'None';
    const tdsBtn = document.getElementById('proformaTdsTcsTds');
    const tcsBtn = document.getElementById('proformaTdsTcsTcs');
    if (tdsBtn && tdsBtn.classList.contains('active')) tdsTcsMode = 'TDS';
    if (tcsBtn && tcsBtn.classList.contains('active')) tdsTcsMode = 'TCS';

    const rateSelect = document.getElementById('proformaTdsTcsRateSelect');
    let tdsTcsRate = 0;
    if (tdsTcsMode !== 'None' && rateSelect) {
      if (rateSelect.value === 'custom') {
        const customInput = document.getElementById('proformaTdsTcsRateCustom');
        tdsTcsRate = customInput ? (parseFloat(customInput.value) || 0) : 0;
      } else {
        tdsTcsRate = parseFloat(rateSelect.value) || 0;
      }
    }

    const amtInput = document.getElementById('proformaTdsTcsAmount');
    const tdsTcsAmount = amtInput ? (parseFloat(amtInput.value) || 0) : 0;
    const adjustmentsInput = document.getElementById('proformaAdjustments');
    const adjustments = adjustmentsInput ? (parseFloat(adjustmentsInput.value) || 0) : 0;

    let total = subTotal;
    if (tdsTcsMode === 'TDS') total = subTotal - tdsTcsAmount;
    else if (tdsTcsMode === 'TCS') total = subTotal + tdsTcsAmount;
    total += adjustments;

    const paymentStatus = getProformaPaymentStatus();
    const paymentAccountId = document.getElementById('proformaPaymentAccount')?.value || '';
    let paymentAccountName = '';
    if (paymentAccountId === PROFORMA_MULTI_PAYMENT_VALUE) {
      paymentAccountName = 'Multi Payment';
    } else if (paymentAccountId && typeof coaLedgers !== 'undefined') {
      const acc = coaLedgers.find(l => String(l.id) === String(paymentAccountId));
      if (acc) paymentAccountName = acc.name;
    }
    const advanceEntered = getProformaAdvanceAmount();
    const paymentAmount = (total > 0) ? Math.min(advanceEntered, total) : advanceEntered;

    return {
      id: _editingProforma ? _editingProforma.id : Date.now(),
      proformaNo,
      date,
      expiryDate,
      dueDate,
      customerId,
      customerName,
      supplyType,
      salesExecutiveId,
      salesExecutiveName,
      paymentStatus,
      paymentAccountId,
      paymentAccountName,
      paymentAmount,
      paymentSplits: getProformaMultiPaymentSplits(),
      advanceJournalEntryId: _editingProforma ? _editingProforma.advanceJournalEntryId : null,
      advanceVoucherNo: _editingProforma ? _editingProforma.advanceVoucherNo : null,
      advancePaidAmount: _editingProforma ? _editingProforma.advancePaidAmount : 0,
      rows: JSON.parse(JSON.stringify(proformaRows)),
      subTotal,
      tdsTcsMode,
      tdsTcsRate,
      tdsTcsAmount,
      adjustments,
      total,
      notes,
      document: _proformaDocData ? {
        name: _proformaDocName,
        size: _proformaDocSize,
        type: _proformaDocType,
        data: _proformaDocData
      } : (_editingProforma ? _editingProforma.document : null),
      createdAt: _editingProforma ? _editingProforma.createdAt : Date.now(),
      status: 'Active'
    };
  }

  function saveProformaInvoice(isDraft) {
    const data = getProformaFormData();

    if (!data.customerId) {
      showToast('Please select a Customer for the proforma invoice.', 'warning');
      return;
    }

    const validRows = data.rows.filter(r => (r.item && r.item.trim()) || (r.amount && r.amount > 0));
    if (validRows.length === 0) {
      showToast('Please add at least one line item to the proforma invoice.', 'warning');
      return;
    }

    if (data.paymentStatus !== 'Not Paid' && !data.paymentAccountId) {
      showToast('Please select a Payment Account for the advance payment.', 'warning');
      return;
    }

    if (data.paymentAccountId === PROFORMA_MULTI_PAYMENT_VALUE && data.paymentStatus !== 'Not Paid') {
      const splits = data.paymentSplits || [];
      if (splits.length === 0) {
        showToast('Please set up the Multi Payment split for this advance.', 'warning');
        return;
      }
      const hasDuplicate = splits.some((sp, i) =>
        splits.findIndex(other => String(other.accountId) === String(sp.accountId)) !== i);
      if (hasDuplicate) {
        showToast('Each Multi Payment account can be selected only once.', 'warning');
        return;
      }
      const splitTotal = splits.reduce((sum, sp) => sum + sp.amount, 0);
      if (Math.abs(splitTotal - data.paymentAmount) > 0.01) {
        showToast(`Multi Payment split of ₹${safeFmtNum(splitTotal)} must equal the advance of ₹${safeFmtNum(data.paymentAmount)}.`, 'warning');
        return;
      }
    }

    window.KYA_STORE.proformaInvoices = window.KYA_STORE.proformaInvoices || [];
    window.KYA_STORE.proformaInvoicesDrafts = window.KYA_STORE.proformaInvoicesDrafts || [];

    if (isDraft) {
      data.status = 'Draft';
      // If was previously active and had advance JE, remove it while in draft state
      if (data.advanceJournalEntryId && typeof postedEntries !== 'undefined') {
        postedEntries = postedEntries.filter(e => String(e.id) !== String(data.advanceJournalEntryId));
        if (typeof window !== 'undefined') window.postedEntries = postedEntries;
        data.advanceJournalEntryId = null;
        data.advanceVoucherNo = null;
        data.advancePaidAmount = 0;
      }
      const existingIdx = window.KYA_STORE.proformaInvoicesDrafts.findIndex(q => q.id === data.id);
      if (existingIdx >= 0) {
        window.KYA_STORE.proformaInvoicesDrafts[existingIdx] = data;
      } else {
        window.KYA_STORE.proformaInvoicesDrafts.unshift(data);
      }
      showToast(`Proforma invoice draft ${data.proformaNo} saved successfully.`, 'success');
    } else {
      data.status = 'Active';

      // ── Create or Update Advance from Customer Journal Entry ──
      const paidAmount = data.paymentStatus === 'Full Payment'
        ? (parseFloat(data.total) || 0)
        : (data.paymentStatus === 'Partial Payment' ? (parseFloat(data.paymentAmount) || 0) : 0);

      if (paidAmount > 0) {
        const advLedgerId = (typeof getOrCreateSystemLedger === 'function')
          ? getOrCreateSystemLedger('Advance from Customers', 'sg-ocl')
          : (typeof window.getOrCreateSystemLedger === 'function' ? window.getOrCreateSystemLedger('Advance from Customers', 'sg-ocl') : null);
        const advLedger = (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers))
          ? (coaLedgers.find(l => l.id == advLedgerId) || coaLedgers.find(l => (l.name || '').toLowerCase() === 'advance from customers'))
          : null;
        const advLedgerName = advLedger ? advLedger.name : 'Advance from Customers';

        const receiptRows = getProformaAdvanceReceiptRows(data, paidAmount);
        const payAccountName = receiptRows[0].name;
        const custName = data.customerName || 'Customer';

        let advanceVoucherNo = data.advanceVoucherNo;
        if (!advanceVoucherNo || !advanceVoucherNo.startsWith('JV-')) {
          if (typeof getNextJournalVoucherNo === 'function') {
            advanceVoucherNo = getNextJournalVoucherNo(data.date);
          } else if (typeof window.getNextJournalVoucherNo === 'function') {
            advanceVoucherNo = window.getNextJournalVoucherNo(data.date);
          } else {
            const yr = data.date ? new Date(data.date).getFullYear() : new Date().getFullYear();
            advanceVoucherNo = `JV-${yr}-001`;
          }
        }
        const advanceJEId = data.advanceJournalEntryId || Date.now();
        data.advanceJournalEntryId = advanceJEId;
        data.advanceVoucherNo = advanceVoucherNo;
        data.advancePaidAmount = paidAmount;

        const advanceJERows = receiptRows.map((r, i) => ({
          id: i + 1, type: 'By', particular: r.name, debit: r.amount.toFixed(2), credit: ''
        }));
        advanceJERows.push({
          id: advanceJERows.length + 1, type: 'To', particular: advLedgerName, debit: '', credit: paidAmount.toFixed(2)
        });

        const advanceEntry = {
          id: advanceJEId,
          date: data.date,
          voucherNo: advanceVoucherNo,
          preparedBy: 'Proforma Module',
          departmentId: '',
          isBudget: false,
          firstParticular: payAccountName,
          amount: (typeof fmtNum === 'function' ? fmtNum(paidAmount) : safeFmtNum(paidAmount)),
          allRows: advanceJERows,
          narration: `Advance received from customer ${custName} against Proforma Invoice No. ${data.proformaNo} (${data.paymentStatus}).`.trim(),
          jeType: 'advance_receipt',
          proformaId: data.id,
          proformaNo: data.proformaNo
        };

        if (typeof postedEntries !== 'undefined') {
          const exIdx = postedEntries.findIndex(e => String(e.id) === String(advanceJEId));
          if (exIdx > -1) {
            postedEntries[exIdx] = advanceEntry;
          } else {
            postedEntries.unshift(advanceEntry);
          }
          if (typeof window !== 'undefined') window.postedEntries = postedEntries;
        }
      } else if (data.advanceJournalEntryId) {
        if (typeof postedEntries !== 'undefined') {
          postedEntries = postedEntries.filter(e => String(e.id) !== String(data.advanceJournalEntryId));
          if (typeof window !== 'undefined') window.postedEntries = postedEntries;
        }
        data.advanceJournalEntryId = null;
        data.advanceVoucherNo = null;
        data.advancePaidAmount = 0;
      }

      const existingIdx = window.KYA_STORE.proformaInvoices.findIndex(q => q.id === data.id);
      if (existingIdx >= 0) {
        window.KYA_STORE.proformaInvoices[existingIdx] = data;
      } else {
        window.KYA_STORE.proformaInvoices.unshift(data);
      }

      // Remove from drafts if existed
      window.KYA_STORE.proformaInvoicesDrafts = window.KYA_STORE.proformaInvoicesDrafts.filter(d => d.id !== data.id);

      showToast(`Proforma Invoice ${data.proformaNo} saved successfully!`, 'success');
    }

    if (typeof refreshAllReports === 'function') refreshAllReports();
    if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
    const proformaFormCard = document.getElementById('salesProformaFormCard');
    if (proformaFormCard) proformaFormCard.style.display = 'none';
    _editingProforma = null;
    openProformaList('all');
  }

  // ── Setup Event Listeners ──
  function setupProformaEventListeners() {
    // Back button
    const backBtn = document.getElementById('btnProformaBack');
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeProformaForm();
      });
    }

    // Proforma List button
    const viewListBtn = document.getElementById('btnProformaViewList');
    if (viewListBtn && !viewListBtn._wired) {
      viewListBtn._wired = true;
      viewListBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeProformaForm();
        openProformaList('all');
      });
    }

    // Nav sub-module buttons (Quotation, Sales Order, Delivery Challan)
    const quoteNavBtn = document.getElementById('btnProformaNavQuotation');
    if (quoteNavBtn) {
      quoteNavBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeProformaForm();
        if (typeof openQuotationForm === 'function') {
          openQuotationForm();
        } else if (typeof window.openQuotationList === 'function') {
          window.openQuotationList('all');
        }
      });
    }

    const salesOrderNavBtn = document.getElementById('btnProformaNavSalesOrder');
    if (salesOrderNavBtn) {
      salesOrderNavBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeProformaForm();
        if (typeof openSalesOrderForm === 'function') {
          openSalesOrderForm();
        } else if (typeof switchSalesPreInvTab === 'function') {
          switchSalesPreInvTab('salesorder');
        }
      });
    }

    const deliveryChallanNavBtn = document.getElementById('btnProformaNavDeliveryChallan');
    if (deliveryChallanNavBtn) {
      deliveryChallanNavBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeProformaForm();
        if (typeof openDeliveryChallanForm === 'function') {
          openDeliveryChallanForm();
        } else if (typeof switchSalesPreInvTab === 'function') {
          switchSalesPreInvTab('deliverychallan');
        }
      });
    }

    // Chip sync
    const proformaNoEl = document.getElementById('proformaNo');
    const chipEl = document.getElementById('proformaChipDisplay');
    if (proformaNoEl && chipEl) {
      proformaNoEl.addEventListener('input', () => {
        chipEl.textContent = proformaNoEl.value.trim() || 'PI-2026-001';
      });
    }

    // Due Date helpers
    const dateEl = document.getElementById('proformaDate');
    const dueEl = document.getElementById('proformaDueDate');
    if (dateEl) {
      dateEl.addEventListener('change', updateProformaDueDateHelper);
      dateEl.addEventListener('input', updateProformaDueDateHelper);
    }
    if (dueEl) {
      dueEl.addEventListener('change', updateProformaDueDateHelper);
      dueEl.addEventListener('input', updateProformaDueDateHelper);
    }

    // Advance Payment — account + amount, always available on a proforma
    const payAccEl = document.getElementById('proformaPaymentAccount');
    if (payAccEl) {
      payAccEl.addEventListener('focus', () => {
        _proformaPaymentAccountPrev = payAccEl.value;
        populateProformaPaymentAccounts(payAccEl.value);
      });
      payAccEl.addEventListener('change', () => {
        if (payAccEl.value === PROFORMA_MULTI_PAYMENT_VALUE) {
          openProformaMultiPaymentModal();
        } else {
          resetProformaMultiPayments();
          _proformaPaymentAccountPrev = payAccEl.value;
        }
        updateProformaMultiPaymentUI();
      });
    }

    const multiPaySummaryBtn = document.getElementById('proformaMultiPaymentSummary');
    if (multiPaySummaryBtn) {
      multiPaySummaryBtn.addEventListener('click', () => openProformaMultiPaymentModal());
    }

    const payAmtEl = document.getElementById('proformaPaymentAmount');
    if (payAmtEl) {
      payAmtEl.addEventListener('input', () => {
        const total = getProformaGrandTotal();
        if (total > 0 && (parseFloat(payAmtEl.value) || 0) > total) {
          payAmtEl.value = total.toFixed(2);
          showToast(`Advance Amount adjusted to ₹${safeFmtNum(total)} to not exceed the Grand Total.`, 'warning');
        }
        recalculateProformaTotals();
        // The advance is what the split has to add up to, so keep both views current.
        if (typeof window.isMultiPaymentModalOpen === 'function' && window.isMultiPaymentModalOpen()) {
          window.updateMultiPaymentModalTotals();
        }
        updateProformaMultiPaymentUI();
      });
    }

    // Customer Searchable Select
    const custTrigger = document.getElementById('proformaCustomerSelectTrigger');
    const custDropdown = document.getElementById('proformaCustomerSelectDropdown');
    const custSearch = document.getElementById('proformaCustomerSelectSearch');

    if (custTrigger && custDropdown && custSearch) {
      custTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = custDropdown.style.display === 'flex';
        if (isOpen) {
          custDropdown.style.display = 'none';
        } else {
          custDropdown.style.display = 'flex';
          custSearch.value = '';
          populateProformaCustomers();
          setTimeout(() => custSearch.focus(), 50);
        }
      });

      custSearch.addEventListener('input', () => {
        populateProformaCustomers(custSearch.value);
      });

      custSearch.addEventListener('click', (e) => e.stopPropagation());

      document.addEventListener('click', (e) => {
        if (!custTrigger.contains(e.target) && !custDropdown.contains(e.target)) {
          custDropdown.style.display = 'none';
        }
      });
    }

    // Add Row
    const addRowBtn = document.getElementById('proformaAddRow');
    if (addRowBtn) {
      addRowBtn.addEventListener('click', () => {
        addProformaRow();
      });
    }

    // Line items input / change / delete delegation
    const proformaBody = document.getElementById('proformaItemBody');
    if (proformaBody) {
      proformaBody.addEventListener('input', (e) => {
        const tr = e.target.closest('tr');
        if (!tr) return;
        const isRate = e.target.classList.contains('sales-row-rate');
        const isAmt = e.target.classList.contains('sales-row-amount-input');
        const isDisc = e.target.classList.contains('sales-row-discount');

        if ((isRate || isAmt || isDisc) && !/[\+\-\*\/\%]/.test(e.target.value)) {
          if (e.target.value && e.target.value.includes('.')) {
            const parts = e.target.value.split('.');
            if (parts[1] && parts[1].length > 2) {
              e.target.value = parts[0] + '.' + parts[1].slice(0, 2);
            }
          }
        }
        const index = parseInt(tr.dataset.rowIndex);
        const triggeredBy = isAmt ? 'amount' : 'rate';
        updateProformaRowFromDOM(index, tr, triggeredBy);
      });

      proformaBody.addEventListener('change', (e) => {
        const tr = e.target.closest('tr');
        if (!tr) return;
        const index = parseInt(tr.dataset.rowIndex);
        updateProformaRowFromDOM(index, tr, 'rate');
      });

      proformaBody.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.proforma-del-row');
        if (delBtn) {
          const tr = delBtn.closest('tr');
          if (tr) {
            const index = parseInt(tr.dataset.rowIndex);
            if (!isNaN(index)) {
              if (proformaRows.length > 1) {
                proformaRows.splice(index, 1);
              } else {
                proformaRows = [{ item: '', hsn: '', qty: 1, unit: '', rate: 0, discount: 0, discountType: 'val', tax: 18, amount: 0 }];
              }
              renderProformaRows();
              recalculateProformaTotals();
            }
          }
        }
      });
    }

    // TDS / TCS Switcher
    const noneBtn = document.getElementById('proformaTdsTcsNone');
    const tdsBtn = document.getElementById('proformaTdsTcsTds');
    const tcsBtn = document.getElementById('proformaTdsTcsTcs');
    const bg = document.getElementById('proformaTdsTcsBg');
    const amountRow = document.getElementById('proformaTdsTcsAmountRow');
    const amountLabel = document.getElementById('proformaTdsTcsAmountLabel');
    const rateSelect = document.getElementById('proformaTdsTcsRateSelect');
    const customInput = document.getElementById('proformaTdsTcsRateCustom');
    const customWrap = document.getElementById('proformaTdsTcsRateCustomWrap');
    const amountInput = document.getElementById('proformaTdsTcsAmount');
    const adjustmentsInput = document.getElementById('proformaAdjustments');
    const btnAutoRoundOff = document.getElementById('btnProformaAutoRoundOff');

    if (noneBtn) {
      noneBtn.addEventListener('click', () => {
        noneBtn.classList.add('active');
        if (tdsBtn) tdsBtn.classList.remove('active');
        if (tcsBtn) tcsBtn.classList.remove('active');
        if (bg) bg.className = 'sales-tdstcs-bg none-active';
        if (amountRow) amountRow.style.display = 'none';
        if (amountInput) amountInput.value = '';
        recalculateProformaTotals();
      });
    }

    if (tdsBtn) {
      tdsBtn.addEventListener('click', () => {
        tdsBtn.classList.add('active');
        if (noneBtn) noneBtn.classList.remove('active');
        if (tcsBtn) tcsBtn.classList.remove('active');
        if (bg) bg.className = 'sales-tdstcs-bg tds-active';
        if (amountRow) amountRow.style.display = 'block';
        if (amountLabel) amountLabel.textContent = 'TDS';
        recalculateProformaTotals();
      });
    }

    if (tcsBtn) {
      tcsBtn.addEventListener('click', () => {
        tcsBtn.classList.add('active');
        if (noneBtn) noneBtn.classList.remove('active');
        if (tdsBtn) tdsBtn.classList.remove('active');
        if (bg) bg.className = 'sales-tdstcs-bg tcs-active';
        if (amountRow) amountRow.style.display = 'block';
        if (amountLabel) amountLabel.textContent = 'TCS';
        recalculateProformaTotals();
      });
    }

    if (rateSelect) {
      rateSelect.addEventListener('change', () => {
        if (rateSelect.value === 'custom') {
          if (customWrap) customWrap.style.display = 'flex';
          if (customInput) customInput.focus();
        } else {
          if (customWrap) customWrap.style.display = 'none';
        }
        recalculateProformaTotals();
      });
    }

    if (customInput) {
      customInput.addEventListener('input', () => {
        recalculateProformaTotals();
      });
    }

    if (amountInput) {
      amountInput.addEventListener('input', () => {
        recalculateProformaTotals();
      });
    }

    if (adjustmentsInput) {
      adjustmentsInput.addEventListener('input', () => {
        recalculateProformaTotals();
      });
    }

    if (btnAutoRoundOff) {
      btnAutoRoundOff.addEventListener('click', (e) => {
        e.preventDefault();
        autoCalculateProformaRoundOff();
      });
    }

    // Document Attachment
    const dropzone = document.getElementById('proformaDocDropzone');
    const fileInput = document.getElementById('proformaDocFileInput');
    const removeBtn = document.getElementById('proformaDocRemoveBtn');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', (e) => {
        if (e.target.closest('#proformaDocRemoveBtn') || e.target.closest('#proformaDocPreviewBtn')) return;
        fileInput.click();
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleProformaFileUpload(e.target.files[0]);
        }
      });

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--blue-500)';
        dropzone.style.background = '#eff6ff';
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'var(--slate-300)';
        dropzone.style.background = 'var(--slate-50)';
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--slate-300)';
        dropzone.style.background = 'var(--slate-50)';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleProformaFileUpload(e.dataTransfer.files[0]);
        }
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateProformaDocUI(null);
        showToast('Document attachment removed.', 'info');
      });
    }

    // Action buttons
    const clearBtn = document.getElementById('btnClearProforma');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        initProformaForm(_editingProforma);
      });
    }

    const saveDraftBtn = document.getElementById('btnSaveProformaDraft');
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener('click', () => {
        saveProformaInvoice(true);
      });
    }

    const saveBtn = document.getElementById('btnSaveProforma');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        saveProformaInvoice(false);
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  PROFORMA INVOICE LIST VIEW (Active, Completed, Cancelled)
  // ══════════════════════════════════════════════════════════════════

  function getAllProformaInvoices() {
    window.KYA_STORE = window.KYA_STORE || {};
    const posted = window.KYA_STORE.proformaInvoices || [];
    const drafts = window.KYA_STORE.proformaInvoicesDrafts || [];

    const map = new Map();
    posted.forEach(p => map.set(String(p.id), { ...p, isDraft: false }));
    drafts.forEach(d => {
      if (!map.has(String(d.id))) {
        map.set(String(d.id), { ...d, isDraft: true, status: 'Draft' });
      }
    });

    const all = Array.from(map.values());
    all.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      const dComp = dateB.localeCompare(dateA);
      if (dComp !== 0) return dComp;
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
    return all;
  }

  function setProformaStatus(id, newStatus) {
    window.KYA_STORE = window.KYA_STORE || {};
    window.KYA_STORE.proformaInvoices = window.KYA_STORE.proformaInvoices || [];
    window.KYA_STORE.proformaInvoicesDrafts = window.KYA_STORE.proformaInvoicesDrafts || [];

    let prof = window.KYA_STORE.proformaInvoices.find(p => String(p.id) === String(id));
    let isDraft = false;
    if (!prof) {
      prof = window.KYA_STORE.proformaInvoicesDrafts.find(d => String(d.id) === String(id));
      isDraft = true;
    }

    if (!prof) {
      showToast('Proforma invoice not found.', 'error');
      return;
    }

    prof.status = newStatus;
    prof.updatedAt = Date.now();

    if (newStatus === 'Cancelled') {
      if (prof.advanceJournalEntryId && typeof postedEntries !== 'undefined') {
        postedEntries = postedEntries.filter(e => String(e.id) !== String(prof.advanceJournalEntryId));
        if (typeof window !== 'undefined') window.postedEntries = postedEntries;
        if (typeof refreshAllReports === 'function') refreshAllReports();
      }
    } else if (newStatus === 'Active' && prof.paymentStatus !== 'Not Paid') {
      const paidAmt = prof.paymentStatus === 'Full Payment'
        ? (parseFloat(prof.total) || 0)
        : (parseFloat(prof.paymentAmount) || 0);

      if (paidAmt > 0 && typeof postedEntries !== 'undefined') {
        const jeId = prof.advanceJournalEntryId || Date.now();
        prof.advanceJournalEntryId = jeId;
        const advLedgerId = (typeof getOrCreateSystemLedger === 'function')
          ? getOrCreateSystemLedger('Advance from Customers', 'sg-ocl')
          : (typeof window.getOrCreateSystemLedger === 'function' ? window.getOrCreateSystemLedger('Advance from Customers', 'sg-ocl') : null);
        const advLedger = (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers))
          ? (coaLedgers.find(l => l.id == advLedgerId) || coaLedgers.find(l => (l.name || '').toLowerCase() === 'advance from customers'))
          : null;
        const advLedgerName = advLedger ? advLedger.name : 'Advance from Customers';

        const receiptRows = getProformaAdvanceReceiptRows(prof, paidAmt);
        const payAccountName = receiptRows[0].name;
        const custName = prof.customerName || 'Customer';

        const statusJERows = receiptRows.map((r, i) => ({
          id: i + 1, type: 'By', particular: r.name, debit: r.amount.toFixed(2), credit: ''
        }));
        statusJERows.push({
          id: statusJERows.length + 1, type: 'To', particular: advLedgerName, debit: '', credit: paidAmt.toFixed(2)
        });

        const advanceEntry = {
          id: jeId,
          date: prof.date,
          voucherNo: prof.advanceVoucherNo || (typeof getNextJournalVoucherNo === 'function' ? getNextJournalVoucherNo(prof.date) : 'JV-2026-001'),
          preparedBy: 'Proforma Module',
          departmentId: '',
          isBudget: false,
          firstParticular: payAccountName,
          amount: (typeof fmtNum === 'function' ? fmtNum(paidAmt) : safeFmtNum(paidAmt)),
          allRows: statusJERows,
          narration: `Advance received from customer ${custName} against Proforma Invoice No. ${prof.proformaNo} (${prof.paymentStatus}).`.trim(),
          jeType: 'advance_receipt',
          proformaId: prof.id,
          proformaNo: prof.proformaNo
        };

        const exIdx = postedEntries.findIndex(e => String(e.id) === String(jeId));
        if (exIdx > -1) {
          postedEntries[exIdx] = advanceEntry;
        } else {
          postedEntries.unshift(advanceEntry);
        }
        if (typeof window !== 'undefined') window.postedEntries = postedEntries;
        if (typeof refreshAllReports === 'function') refreshAllReports();
      }
    }

    if (isDraft && (newStatus === 'Active' || newStatus === 'Completed')) {
      window.KYA_STORE.proformaInvoicesDrafts = window.KYA_STORE.proformaInvoicesDrafts.filter(d => String(d.id) !== String(id));
      if (!window.KYA_STORE.proformaInvoices.some(p => String(p.id) === String(id))) {
        window.KYA_STORE.proformaInvoices.unshift(prof);
      }
    }

    showToast(`Proforma ${prof.proformaNo || ''} marked as ${newStatus}.`, 'success');
    if (typeof triggerAutoBackup === 'function') triggerAutoBackup();

    if (typeof window.openProformaList === 'function') {
      window.openProformaList(_proformaFilterStatus || 'all');
    } else if (typeof window.switchSalesPreInvTab === 'function') {
      window.switchSalesPreInvTab('proforma', _proformaFilterStatus || 'all');
    }
  }

  function deleteProformaItem(id) {
    window.KYA_STORE = window.KYA_STORE || {};
    window.KYA_STORE.proformaInvoices = window.KYA_STORE.proformaInvoices || [];
    window.KYA_STORE.proformaInvoicesDrafts = window.KYA_STORE.proformaInvoicesDrafts || [];

    const prof = window.KYA_STORE.proformaInvoices.find(p => String(p.id) === String(id)) ||
                 window.KYA_STORE.proformaInvoicesDrafts.find(d => String(d.id) === String(id));

    const pNo = prof ? (prof.proformaNo || 'proforma invoice') : 'proforma invoice';

    showKyaConfirm({
      title: 'Delete Proforma Invoice?',
      message: `Permanently delete proforma invoice <strong>${safeEsc(pNo)}</strong>?<br>This action cannot be undone.`,
      confirmLabel: '✕ Delete',
      okBg: '#dc2626',
      iconBg: '#fee2e2',
      iconColor: '#dc2626',
      iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      onConfirm: () => {
        if (prof && prof.advanceJournalEntryId && typeof postedEntries !== 'undefined') {
          postedEntries = postedEntries.filter(e => String(e.id) !== String(prof.advanceJournalEntryId));
          if (typeof window !== 'undefined') window.postedEntries = postedEntries;
          if (typeof refreshAllReports === 'function') refreshAllReports();
        }
        window.KYA_STORE.proformaInvoices = window.KYA_STORE.proformaInvoices.filter(p => String(p.id) !== String(id));
        window.KYA_STORE.proformaInvoicesDrafts = window.KYA_STORE.proformaInvoicesDrafts.filter(d => String(d.id) !== String(id));
        showToast(`Proforma ${pNo} deleted successfully.`, 'success');
        if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
        if (typeof window.openProformaList === 'function') {
          window.openProformaList(_proformaFilterStatus || 'all');
        } else if (typeof window.switchSalesPreInvTab === 'function') {
          window.switchSalesPreInvTab('proforma', _proformaFilterStatus || 'all');
        }
      }
    });
  }

  function editProformaItem(id) {
    const all = getAllProformaInvoices();
    const prof = all.find(p => String(p.id) === String(id));
    if (!prof) {
      showToast('Proforma invoice not found.', 'error');
      return;
    }
    openProformaForm(prof, 'proformalist');
  }

  function convertProformaToInvoice(id) {
    const all = getAllProformaInvoices();
    const prof = all.find(p => String(p.id) === String(id));
    if (!prof) {
      showToast('Proforma invoice not found.', 'error');
      return;
    }

    const nextInvNo = typeof getNextAutoInvoiceNumber === 'function' ? getNextAutoInvoiceNumber() :
                      (typeof window.getNextAutoInvoiceNumber === 'function' ? window.getNextAutoInvoiceNumber() : '');

    const inv = {
      id: Date.now(),
      customerId: prof.customerId,
      customerName: prof.customerName,
      date: new Date().toISOString().split('T')[0],
      dueDate: prof.dueDate || prof.expiryDate || new Date().toISOString().split('T')[0],
      invoiceNo: nextInvNo,
      salesSupplyType: prof.supplyType || 'Intra-State (CGST + SGST)',
      salesExecutiveId: prof.salesExecutiveId || '',
      type: 'Product',
      paymentStatus: prof.paymentStatus || 'Not Paid',
      paymentAccountId: prof.paymentAccountId || '',
      paymentSplits: Array.isArray(prof.paymentSplits) ? JSON.parse(JSON.stringify(prof.paymentSplits)) : [],
      paymentAmount: prof.paymentAmount || '',
      advancePaidAmount: prof.advancePaidAmount || (prof.paymentStatus === 'Full Payment' ? prof.total : (parseFloat(prof.paymentAmount) || 0)),
      advanceJournalEntryId: prof.advanceJournalEntryId || null,
      advanceVoucherNo: prof.advanceVoucherNo || null,
      notes: prof.notes ? `${prof.notes}\n[Converted from Proforma ${prof.proformaNo}]` : `Converted from Proforma ${prof.proformaNo}`,
      adjustments: prof.adjustments || 0,
      tdsTcsMode: prof.tdsTcsMode || 'None',
      tdsTcsRate: prof.tdsTcsRate || 0,
      tdsTcsAmount: prof.tdsTcsAmount || 0,
      subTotal: prof.subTotal,
      total: prof.total,
      rows: Array.isArray(prof.rows) ? JSON.parse(JSON.stringify(prof.rows)) : [],
      uploadedDoc: prof.document ? {
        fileName: prof.document.name,
        fileSize: prof.document.size ? `${(prof.document.size / 1024).toFixed(1)} KB` : '',
        fileData: prof.document.data
      } : null,
      mode: 'Auto',
      _isFromProforma: true,
      convertedFromProformaId: prof.id
    };

    window._pendingConvertProformaId = prof.id;

    if (typeof loadSalesInvoice === 'function') {
      const proformaListCard = document.getElementById('salesProformaListCard');
      if (proformaListCard) proformaListCard.style.display = 'none';
      const proformaFormCard = document.getElementById('salesProformaFormCard');
      if (proformaFormCard) proformaFormCard.style.display = 'none';
      const quoteListCard = document.getElementById('salesQuotationListCard');
      if (quoteListCard) quoteListCard.style.display = 'none';
      const quoteFormCard = document.getElementById('salesQuotationFormCard');
      if (quoteFormCard) quoteFormCard.style.display = 'none';
      const preInvCard = document.getElementById('salesPreInvoiceCard');
      if (preInvCard) preInvCard.style.display = 'none';

      currentSalesVoucherSubtype = 'Invoice';
      if (typeof updateVoucherSubtypeUI === 'function') updateVoucherSubtypeUI();
      loadSalesInvoice(inv, false);
      window._editingSalesInvoice = null;
      if (typeof setInvoiceNoMode === 'function') setInvoiceNoMode('Auto');
      const invNoEl = document.getElementById('salesInvoiceNo');
      const chipEl = document.getElementById('salesVoucherChipDisplay');
      if (invNoEl && (!invNoEl.value || !invNoEl.value.trim())) {
        const genNo = typeof getNextAutoInvoiceNumber === 'function' ? getNextAutoInvoiceNumber() :
                      (typeof window.getNextAutoInvoiceNumber === 'function' ? window.getNextAutoInvoiceNumber() : '');
        invNoEl.value = genNo;
        if (chipEl) chipEl.textContent = genNo || 'INV-XXXX';
      }
      showToast(`Proforma ${prof.proformaNo} converted! Post the invoice to mark it as completed.`, 'info');
    }
  }

  function markProformaCompletedOnInvoicePost(id) {
    window.KYA_STORE = window.KYA_STORE || {};
    window.KYA_STORE.proformaInvoices = window.KYA_STORE.proformaInvoices || [];
    window.KYA_STORE.proformaInvoicesDrafts = window.KYA_STORE.proformaInvoicesDrafts || [];

    let prof = window.KYA_STORE.proformaInvoices.find(p => String(p.id) === String(id));
    let isDraft = false;
    if (!prof) {
      prof = window.KYA_STORE.proformaInvoicesDrafts.find(d => String(d.id) === String(id));
      isDraft = true;
    }
    if (!prof) return;

    prof.status = 'Completed';
    prof.updatedAt = Date.now();

    if (isDraft) {
      window.KYA_STORE.proformaInvoicesDrafts = window.KYA_STORE.proformaInvoicesDrafts.filter(d => String(d.id) !== String(id));
      if (!window.KYA_STORE.proformaInvoices.some(p => String(p.id) === String(id))) {
        window.KYA_STORE.proformaInvoices.unshift(prof);
      }
    }
    if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
  }

  function viewPrintProforma(id) {
    const all = getAllProformaInvoices();
    const prof = all.find(p => String(p.id) === String(id));
    if (!prof) {
      showToast('Proforma invoice not found.', 'error');
      return;
    }

    const activeCo = (typeof getActiveCompany === 'function' ? getActiveCompany() : null) || {};
    const coName = activeCo.name || 'KYA Accounting';
    const coAddress = activeCo.address || '';
    const coGstin = activeCo.gstin || '';
    const coPhone = activeCo.phone || '';

    const customer = (typeof findPartyById === 'function' ? findPartyById(prof.customerId, 'Customer') : null) ||
                     (typeof coaLedgers !== 'undefined' ? coaLedgers.find(l => l.id == prof.customerId) : null) ||
                     { name: prof.customerName || 'Customer' };
    const partyName = customer.name || prof.customerName || 'Customer';
    const partyContact = customer.contactName || '';
    const partyAddr = customer.address || '';
    const cityPin = [customer.city, customer.pincode].filter(Boolean).join(' - ');
    const stateCountry = [customer.state, customer.country || 'India'].filter(Boolean).join(', ');
    const partyGstin = customer.gstin || '';
    const partyPhone = customer.phone || customer.mobile || '';

    const rows = Array.isArray(prof.rows) ? prof.rows : [];
    const rowsHtml = rows.map((r, i) => {
      const qty = parseFloat(r.qty) || 1;
      const rate = parseFloat(r.rate) || 0;
      const base = qty * rate;
      const disc = parseFloat(r.discount) || 0;
      const discAmt = r.discountType === 'pct' ? (base * (disc / 100)) : disc;
      const taxRate = parseFloat(r.tax) || 0;
      const taxAmt = (base - discAmt) * (taxRate / 100);
      const totalAmt = (base - discAmt) + taxAmt;
      const discStr = disc > 0 ? (r.discountType === 'pct' ? `${disc}% (₹${safeFmtNum(discAmt)})` : `₹${safeFmtNum(disc)}`) : '—';

      return `
        <tr style="border-bottom: 1px solid var(--slate-100);">
          <td style="padding: 10px; font-weight: 500; color: #94a3b8; font-size: 12px;">${i + 1}</td>
          <td style="padding: 10px; font-weight: 600; color: var(--slate-800);">${safeEsc(r.item || 'Item')}</td>
          <td style="padding: 10px; font-family: monospace; font-size: 12px; color: var(--slate-600);">${safeEsc(r.hsn || '—')}</td>
          <td style="padding: 10px; text-align: right;">${qty} ${r.unit ? safeEsc(r.unit) : ''}</td>
          <td style="padding: 10px; text-align: right;">₹ ${safeFmtNum(rate)}</td>
          <td style="padding: 10px; text-align: right; color: var(--slate-600);">${discStr}</td>
          <td style="padding: 10px; text-align: right; color: var(--slate-600);">${taxRate}%</td>
          <td style="padding: 10px; text-align: right; font-weight: 700; color: var(--blue-700);">₹ ${safeFmtNum(totalAmt)}</td>
        </tr>
      `;
    }).join('');

    let statusBadge = '';
    if (prof.status === 'Completed') {
      statusBadge = '<span class="badge" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-size:12px; padding:4px 10px; font-weight:700;">Completed</span>';
    } else if (prof.status === 'Cancelled') {
      statusBadge = '<span class="badge" style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; font-size:12px; padding:4px 10px; font-weight:700;">Cancelled</span>';
    } else if (prof.status === 'Draft' || prof.isDraft) {
      statusBadge = '<span class="badge" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; font-size:12px; padding:4px 10px; font-weight:700;">Draft</span>';
    } else {
      statusBadge = '<span class="badge" style="background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; font-size:12px; padding:4px 10px; font-weight:700;">Active</span>';
    }

    let payStatusBadge = '';
    if (prof.paymentStatus === 'Full Payment') {
      payStatusBadge = '<span class="badge" style="background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; font-size:11px; padding:2px 8px; font-weight:700;">Full Payment</span>';
    } else if (prof.paymentStatus === 'Partial Payment') {
      payStatusBadge = '<span class="badge" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-size:11px; padding:2px 8px; font-weight:700;">Partial Payment</span>';
    } else {
      payStatusBadge = '<span class="badge" style="background:#fef2f2; color:#dc2626; border:1px solid #fecaca; font-size:11px; padding:2px 8px; font-weight:700;">Not Paid</span>';
    }

    const isAct = prof.status === 'Active' || !prof.status;
    const isDrf = prof.status === 'Draft' || prof.isDraft;

    let statusActionsHtml = '';
    if (isAct || isDrf) {
      statusActionsHtml = `
        <button type="button" id="btnPreviewToInvoice" class="btn btn-sm" title="Convert to Invoice" aria-label="Convert to Invoice" style="background: #10b981; color: #fff; border: 1.5px solid #059669; width: 34px; height: 34px; padding: 0; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; box-shadow: 0 1px 2px rgba(0,0,0,0.06); transition: all 0.15s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </button>
        <button type="button" id="btnPreviewEditProforma" class="btn btn-sm" title="Edit Proforma Invoice" aria-label="Edit Proforma Invoice" style="background: #fff; color: var(--blue-700); border: 1.5px solid var(--slate-300); width: 34px; height: 34px; padding: 0; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; transition: all 0.15s;" onmouseover="this.style.background='var(--slate-100)'; this.style.borderColor='var(--blue-400)'" onmouseout="this.style.background='#fff'; this.style.borderColor='var(--slate-300)'">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button type="button" id="btnPreviewComplete" class="btn btn-sm" title="Mark Completed" aria-label="Mark Completed" style="background: #eff6ff; color: #1d4ed8; border: 1.5px solid #bfdbfe; width: 34px; height: 34px; padding: 0; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; transition: all 0.15s;" onmouseover="this.style.background='#dbeafe'; this.style.borderColor='#93c5fd'" onmouseout="this.style.background='#eff6ff'; this.style.borderColor='#bfdbfe'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <button type="button" id="btnPreviewCancel" class="btn btn-sm" title="Mark Cancelled" aria-label="Mark Cancelled" style="background: #fff1f2; color: #be123c; border: 1.5px solid #fecdd3; width: 34px; height: 34px; padding: 0; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; transition: all 0.15s;" onmouseover="this.style.background='#ffe4e6'; this.style.borderColor='#fda4af'" onmouseout="this.style.background='#fff1f2'; this.style.borderColor='#fecdd3'">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;
    } else {
      statusActionsHtml = `
        <button type="button" id="btnPreviewReopen" class="btn btn-sm" title="Reopen as Active" aria-label="Reopen as Active" style="background: #ecfdf5; color: #047857; border: 1.5px solid #a7f3d0; width: 34px; height: 34px; padding: 0; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; transition: all 0.15s;" onmouseover="this.style.background='#d1fae5'; this.style.borderColor='#6ee7b7'" onmouseout="this.style.background='#ecfdf5'; this.style.borderColor='#a7f3d0'">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        </button>
        <button type="button" id="btnPreviewEditProforma" class="btn btn-sm" title="Edit Proforma Invoice" aria-label="Edit Proforma Invoice" style="background: #fff; color: var(--blue-700); border: 1.5px solid var(--slate-300); width: 34px; height: 34px; padding: 0; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; transition: all 0.15s;" onmouseover="this.style.background='var(--slate-100)'; this.style.borderColor='var(--blue-400)'" onmouseout="this.style.background='#fff'; this.style.borderColor='var(--slate-300)'">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
      `;
    }

    const overlay = document.createElement('div');
    overlay.className = 'inv-modal-overlay';
    overlay.id = 'proformaPrintOverlay';
    overlay.setAttribute('tabindex', '-1');

    overlay.innerHTML = `
      <div class="inv-modal-card">
        <div class="inv-modal-hdr" style="background: linear-gradient(90deg, #1d4ed8, #2563eb);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2">
              <path d="M5 2h10a1 1 0 011 1v14l-3-2-3 2-3-2-3 2V3a1 1 0 011-1z"/>
              <path d="M8 7h4M8 11h4"/>
            </svg>
            <div>
              <span style="font-weight: 700; font-size: 16px;">Proforma Invoice Preview</span>
              <span style="margin-left: 8px; font-family: monospace; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 6px; font-size: 13px;">${safeEsc(prof.proformaNo || 'PI-XXXX')}</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <!-- Export Dropdown (PDF & Excel) -->
            <div class="rpt-more-wrap" style="position: relative;">
              <button class="btn btn-secondary" id="btnExportProformaAction" type="button" style="background: rgba(255,255,255,0.18); color: #fff; border: 1.5px solid rgba(255,255,255,0.35); font-weight: 700; padding: 7px 14px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; font-size: 13px; height: 36px; transition: all 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.28)'" onmouseout="this.style.background='rgba(255,255,255,0.18)'">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Export</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              <div id="proformaExportDropdown" style="display: none; position: absolute; right: 0; top: calc(100% + 6px); background: #fff; border: 1.5px solid var(--slate-200); border-radius: 10px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1); z-index: 10006; min-width: 145px; overflow: hidden; padding: 4px 0;">
                <button type="button" id="btnProformaExportPdf" class="rpt-menu-item" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 16px; border: none; background: none; font-size: 13px; font-weight: 600; color: var(--slate-700); cursor: pointer; text-align: left; transition: background 0.15s;" onmouseover="this.style.background='var(--slate-50)'" onmouseout="this.style.background='none'">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                  <span>PDF</span>
                </button>
                <button type="button" id="btnProformaExportExcel" class="rpt-menu-item" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 16px; border: none; background: none; font-size: 13px; font-weight: 600; color: var(--slate-700); cursor: pointer; text-align: left; border-top: 1px solid var(--slate-100); transition: background 0.15s;" onmouseover="this.style.background='var(--slate-50)'" onmouseout="this.style.background='none'">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="8" y1="13" x2="16" y2="17"></line>
                    <line x1="16" y1="13" x2="8" y2="17"></line>
                  </svg>
                  <span>Excel</span>
                </button>
              </div>
            </div>
            <button id="btnCloseProformaModal" style="background: rgba(255,255,255,0.18); border: none; color: #fff; font-size: 18px; cursor: pointer; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; line-height: 1; transition: all 0.15s;" type="button" title="Close Preview" onmouseover="this.style.background='rgba(255,255,255,0.28)'" onmouseout="this.style.background='rgba(255,255,255,0.18)'">✕</button>
          </div>
        </div>

        <!-- Action Bar: Inside the proforma preview with all actions aligned to the right side -->
        <div class="quote-preview-action-bar no-print" style="background: #f8fafc; border-bottom: 1.5px solid var(--slate-200); padding: 12px 28px; display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap;">
          ${statusActionsHtml}
          <button type="button" id="btnPreviewDeleteProforma" class="btn btn-sm" title="Delete Proforma Invoice" aria-label="Delete Proforma Invoice" style="background: #fee2e2; color: #dc2626; border: 1.5px solid #fca5a5; width: 34px; height: 34px; padding: 0; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; transition: all 0.15s;" onmouseover="this.style.background='#fecdd3'; this.style.borderColor='#f87171'" onmouseout="this.style.background='#fee2e2'; this.style.borderColor='#fca5a5'">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
          </button>
        </div>

        <div class="inv-modal-body">
          <div class="inv-paper">
            <div style="display: flex; justify-content: space-between; border-bottom: 2px solid var(--slate-100); padding-bottom: 24px; margin-bottom: 24px;">
              <div>
                <h1 style="font-size: 24px; font-weight: 800; color: #1e3a8a; margin: 0 0 6px 0; letter-spacing: -0.02em;">${safeEsc(coName)}</h1>
                <div style="font-size: 13px; color: var(--slate-500); line-height: 1.4;">
                  ${safeEsc(coAddress)}<br>
                  ${coGstin ? `GSTIN: <strong style="color: var(--slate-700);">${safeEsc(coGstin)}</strong><br>` : ''}
                  ${coPhone ? `Phone: ${safeEsc(coPhone)}` : ''}
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 22px; font-weight: 800; color: var(--slate-800); text-transform: uppercase; letter-spacing: 0.05em;">Proforma Invoice</div>
                <div style="font-size: 15px; font-family: monospace; font-weight: 700; color: #1d4ed8; margin-top: 4px;"># ${safeEsc(prof.proformaNo || 'PI-XXXX')}</div>
                <div style="margin-top: 10px;">${statusBadge}</div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 24px; margin-bottom: 28px; background: var(--slate-50); padding: 18px 20px; border-radius: 12px; border: 1px solid var(--slate-100);">
              <div>
                <h3 style="font-size: 11px; text-transform: uppercase; color: var(--slate-400); letter-spacing: 0.08em; margin-bottom: 8px; font-weight: 700;">Proforma For:</h3>
                <div style="font-size: 16px; font-weight: 800; color: var(--slate-900);">${safeEsc(partyName)}</div>
                ${partyContact ? `<div style="font-size: 12.5px; color: var(--slate-600); margin-top: 2px;">Attn: ${safeEsc(partyContact)}</div>` : ''}
                ${partyAddr ? `<div style="font-size: 12px; color: var(--slate-600); margin-top: 4px;">${safeEsc(partyAddr)}</div>` : ''}
                ${(cityPin || stateCountry) ? `<div style="font-size: 12px; color: var(--slate-600); margin-top: 2px;">${safeEsc([cityPin, stateCountry].filter(Boolean).join(', '))}</div>` : ''}
                ${partyGstin ? `<div style="font-size: 12px; color: var(--slate-700); margin-top: 4px;">GSTIN: <strong style="font-family: monospace; color: #047857;">${safeEsc(partyGstin)}</strong></div>` : ''}
                ${partyPhone ? `<div style="font-size: 12px; color: var(--slate-600); margin-top: 2px;">Phone: ${safeEsc(partyPhone)}</div>` : ''}
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 13px;">
                <div>
                  <div style="color: var(--slate-400); font-weight: 600; font-size: 11px; text-transform: uppercase;">Proforma Date:</div>
                  <div style="font-weight: 700; color: var(--slate-800); margin-top: 2px;">${prof.date || '—'}</div>
                </div>
                <div>
                  <div style="color: var(--slate-400); font-weight: 600; font-size: 11px; text-transform: uppercase;">Due Date:</div>
                  <div style="font-weight: 700; color: var(--slate-800); margin-top: 2px;">${prof.dueDate || prof.expiryDate || '—'}</div>
                </div>
                <div>
                  <div style="color: var(--slate-400); font-weight: 600; font-size: 11px; text-transform: uppercase;">Supply Type:</div>
                  <div style="font-weight: 700; color: var(--slate-800); margin-top: 2px;">${safeEsc(prof.supplyType || 'Intra-State')}</div>
                </div>
                <div>
                  <div style="color: var(--slate-400); font-weight: 600; font-size: 11px; text-transform: uppercase;">Payment Terms:</div>
                  <div style="margin-top: 4px;">${payStatusBadge}</div>
                  ${(prof.paymentStatus !== 'Not Paid' && (prof.advancePaidAmount || prof.paymentAmount)) ? `
                    <div style="font-size: 11.5px; color: var(--slate-600); margin-top: 4px;">
                      <strong>Advance:</strong> ₹${safeFmtNum(prof.advancePaidAmount || prof.paymentAmount)}
                      ${prof.advanceVoucherNo ? `<span style="font-family: monospace; color: var(--blue-700); font-weight: 700; margin-left: 4px;">[${safeEsc(prof.advanceVoucherNo)}]</span>` : ''}
                    </div>
                  ` : ''}
                </div>
                ${prof.salesExecutiveName ? `
                <div style="grid-column: 1 / -1;">
                  <div style="color: var(--slate-400); font-weight: 600; font-size: 11px; text-transform: uppercase;">Prepared By:</div>
                  <div style="font-weight: 700; color: var(--slate-800); margin-top: 2px;">${safeEsc(prof.salesExecutiveName)}</div>
                </div>
                ` : ''}
              </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
              <thead>
                <tr style="border-bottom: 2px solid var(--slate-200); background: var(--slate-50);">
                  <th style="padding: 10px; text-align: left; font-weight: 700; color: var(--slate-500); width: 36px;">#</th>
                  <th style="padding: 10px; text-align: left; font-weight: 700; color: var(--slate-500);">Description</th>
                  <th style="padding: 10px; text-align: left; font-weight: 700; color: var(--slate-500); width: 80px;">HSN/SAC</th>
                  <th style="padding: 10px; text-align: right; font-weight: 700; color: var(--slate-500); width: 70px;">Qty</th>
                  <th style="padding: 10px; text-align: right; font-weight: 700; color: var(--slate-500); width: 100px;">Rate</th>
                  <th style="padding: 10px; text-align: right; font-weight: 700; color: var(--slate-500); width: 80px;">Discount</th>
                  <th style="padding: 10px; text-align: right; font-weight: 700; color: var(--slate-500); width: 70px;">Tax</th>
                  <th style="padding: 10px; text-align: right; font-weight: 700; color: var(--slate-500); width: 130px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 30px; margin-top: 20px;">
              <div>
                <h4 style="font-size: 11px; text-transform: uppercase; color: var(--slate-400); letter-spacing: 0.05em; margin-bottom: 6px; font-weight: 700;">Payment & Terms:</h4>
                <div style="font-size: 12.5px; color: var(--slate-600); line-height: 1.5; white-space: pre-wrap;">${safeEsc(prof.notes) || 'Payment is requested as per agreed terms before delivery. Thank you for your business!'}</div>
                ${prof.paymentStatus !== 'Not Paid' && prof.paymentAccountName ? `
                  <div style="margin-top: 10px; font-size: 12.5px; color: var(--slate-700); background: #f8fafc; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <strong>Advance Account:</strong> ${safeEsc(prof.paymentAccountName)}
                    ${prof.paymentAmount ? ` &bull; <strong>Advance Amount:</strong> ₹ ${safeFmtNum(prof.paymentAmount)}` : ''}
                  </div>
                ` : ''}
                ${prof.document && prof.document.data ? `
                  <div style="margin-top: 12px; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                    <span style="font-size: 12px; font-weight: 600; color: var(--slate-700);">📎 ${safeEsc(prof.document.name)}</span>
                    <a href="${prof.document.data}" download="${safeEsc(prof.document.name)}" style="font-size: 11px; font-weight: 700; color: #2563eb; text-decoration: none;">Download</a>
                  </div>
                ` : ''}
              </div>
              <div>
                <div style="background: var(--slate-50); border: 1px solid var(--slate-100); border-radius: 12px; padding: 16px 20px;">
                  <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--slate-600); margin-bottom: 6px;">
                    <span>Subtotal</span>
                    <span style="font-weight: 600;">₹ ${safeFmtNum(prof.subTotal)}</span>
                  </div>
                  ${prof.tdsTcsMode && prof.tdsTcsMode !== 'None' ? `
                    <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--slate-600); margin-bottom: 6px;">
                      <span>${prof.tdsTcsMode} (${prof.tdsTcsRate || 0}%)</span>
                      <span style="font-weight: 600;">${prof.tdsTcsMode === 'TDS' ? '-' : '+'} ₹ ${safeFmtNum(prof.tdsTcsAmount)}</span>
                    </div>
                  ` : ''}
                  ${prof.adjustments ? `
                    <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--slate-600); margin-bottom: 6px;">
                      <span>Adjustments / Round-off</span>
                      <span style="font-weight: 600;">₹ ${safeFmtNum(prof.adjustments)}</span>
                    </div>
                  ` : ''}
                  <div style="display: flex; justify-content: space-between; font-size: 17px; font-weight: 800; color: var(--blue-800); border-top: 1.5px solid var(--slate-200); padding-top: 10px; margin-top: 6px;">
                    <span>Grand Total</span>
                    <span>₹ ${safeFmtNum(prof.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style="margin-top: 50px; border-top: 1px solid var(--slate-100); padding-top: 16px; text-align: center; font-size: 11.5px; color: var(--slate-400);">
              This is a provisional commercial proforma invoice. Generated by KYA Accounting Suite.
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.focus();

    overlay.querySelector('#btnCloseProformaModal')?.addEventListener('click', () => overlay.remove());

    // Wire Export Dropdown (PDF & Excel)
    const expBtn = overlay.querySelector('#btnExportProformaAction');
    const expDropdown = overlay.querySelector('#proformaExportDropdown');
    const expPdfBtn = overlay.querySelector('#btnProformaExportPdf');
    const expExcelBtn = overlay.querySelector('#btnProformaExportExcel');

    if (expBtn && expDropdown) {
      expBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = expDropdown.style.display === 'block';
        expDropdown.style.display = isOpen ? 'none' : 'block';
      });
    }

    if (expPdfBtn) {
      expPdfBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (expDropdown) expDropdown.style.display = 'none';
        if (typeof window.exportProformaToPDF === 'function') {
          await window.exportProformaToPDF(prof);
        } else {
          window.print();
        }
      });
    }

    if (expExcelBtn) {
      expExcelBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (expDropdown) expDropdown.style.display = 'none';
        if (typeof window.exportProformaToExcel === 'function') {
          await window.exportProformaToExcel(prof);
        } else if (typeof window.exportProformaToCsvFallback === 'function') {
          window.exportProformaToCsvFallback(prof);
        }
      });
    }

    overlay.querySelector('#btnPreviewEditProforma')?.addEventListener('click', () => {
      overlay.remove();
      editProformaItem(prof.id);
    });
    overlay.querySelector('#btnPreviewToInvoice')?.addEventListener('click', () => {
      overlay.remove();
      convertProformaToInvoice(prof.id);
    });
    overlay.querySelector('#btnPreviewComplete')?.addEventListener('click', () => {
      overlay.remove();
      setProformaStatus(prof.id, 'Completed');
    });
    overlay.querySelector('#btnPreviewCancel')?.addEventListener('click', () => {
      overlay.remove();
      setProformaStatus(prof.id, 'Cancelled');
    });
    overlay.querySelector('#btnPreviewReopen')?.addEventListener('click', () => {
      overlay.remove();
      setProformaStatus(prof.id, 'Active');
    });
    overlay.querySelector('#btnPreviewDeleteProforma')?.addEventListener('click', () => {
      overlay.remove();
      deleteProformaItem(prof.id);
    });
    overlay.addEventListener('click', e => {
      if (expDropdown && !expDropdown.contains(e.target) && expBtn && !expBtn.contains(e.target)) {
        expDropdown.style.display = 'none';
      }
      if (e.target === overlay) overlay.remove();
    });
    overlay.addEventListener('keydown', e => {
      if (e.key === 'Escape') overlay.remove();
    });
  }

  function renderProformaList(filterStatus = 'all') {
    if (filterStatus) _proformaFilterStatus = filterStatus;
    const all = getAllProformaInvoices();

    const qTerm = (_proformaSearchQuery || '').trim().toLowerCase();
    const filterBySearch = (items) => {
      if (!qTerm) return items;
      return items.filter(p => {
        const noMatch = (p.proformaNo || '').toLowerCase().includes(qTerm);
        const custMatch = (p.customerName || '').toLowerCase().includes(qTerm);
        const dateMatch = (p.date || '').toLowerCase().includes(qTerm);
        const amtMatch = String(p.total || '').toLowerCase().includes(qTerm);
        const itemMatch = Array.isArray(p.rows) && p.rows.some(r => (r.item || '').toLowerCase().includes(qTerm));
        return noMatch || custMatch || dateMatch || amtMatch || itemMatch;
      });
    };

    const allCount = all.length;
    const activeCount = all.filter(p => p.status === 'Active' || !p.status || p.status === 'Draft').length;
    const completedCount = all.filter(p => p.status === 'Completed').length;
    const cancelledCount = all.filter(p => p.status === 'Cancelled').length;

    let displayList = all;
    if (_proformaFilterStatus === 'active') {
      displayList = all.filter(p => p.status === 'Active' || !p.status || p.status === 'Draft');
    } else if (_proformaFilterStatus === 'completed') {
      displayList = all.filter(p => p.status === 'Completed');
    } else if (_proformaFilterStatus === 'cancelled') {
      displayList = all.filter(p => p.status === 'Cancelled');
    } else {
      const statusOrder = { 'Active': 1, 'Draft': 1, '': 1, 'Completed': 2, 'Cancelled': 3 };
      displayList = [...all].sort((a, b) => {
        const orderA = statusOrder[a.status] || 1;
        const orderB = statusOrder[b.status] || 1;
        if (orderA !== orderB) return orderA - orderB;
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return (b.id || 0) - (a.id || 0);
      });
    }

    const filteredItems = filterBySearch(displayList);

    function renderSingleTableHtml() {
      if (allCount === 0) {
        return `
          <div style="text-align: center; padding: 60px 20px; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 16px; box-shadow: var(--shadow-sm);">
            <div style="width: 56px; height: 56px; border-radius: 14px; background: #faf5ff; color: #9333ea; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
              <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
                <path d="M5 2h10a1 1 0 011 1v14l-3-2-3 2-3-2-3 2V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M8 7h4M8 11h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </div>
            <div style="font-weight: 800; font-size: 16px; color: var(--slate-800); margin-bottom: 6px;">No Proforma Invoices Yet</div>
            <p style="font-size: 13px; color: var(--slate-500); max-width: 420px; margin: 0 auto 20px;">
              Create provisional commercial invoices, advance billing, and customer quotes to track active orders, payments, and deals.
            </p>
            <button class="btn btn-primary" onclick="openProformaForm(null, 'proformalist')" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; padding: 8px 18px; border-radius: 8px; cursor: pointer;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Create First Proforma Invoice
            </button>
          </div>
        `;
      }

      let rowsHtml = '';
      if (filteredItems.length === 0) {
        rowsHtml = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 48px 20px; color: var(--slate-400);">
              <div style="font-weight: 700; font-size: 14px; color: var(--slate-600); margin-bottom: 4px;">No proforma invoices found</div>
              <div style="font-size: 12.5px;">No proforma invoices match the current filter or search query.</div>
            </td>
          </tr>
        `;
      } else {
        rowsHtml = filteredItems.map(p => {
          let statusBadge = '';
          const isAct = p.status === 'Active' || !p.status;
          const isDrf = p.status === 'Draft' || p.isDraft;
          const isComp = p.status === 'Completed';
          const isCanc = p.status === 'Cancelled';

          if (isComp) {
            statusBadge = '<span class="badge" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-size:11px; padding:3px 8px; font-weight:700;">Completed</span>';
          } else if (isCanc) {
            statusBadge = '<span class="badge" style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; font-size:11px; padding:3px 8px; font-weight:700;">Cancelled</span>';
          } else if (isDrf) {
            statusBadge = '<span class="badge" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; font-size:11px; padding:3px 8px; font-weight:700;">Draft</span>';
          } else {
            statusBadge = '<span class="badge" style="background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; font-size:11px; padding:3px 8px; font-weight:700;">Active</span>';
          }

          const itemsSummary = Array.isArray(p.rows) && p.rows.length > 0
            ? `${p.rows.length} ${p.rows.length === 1 ? 'item' : 'items'} (${safeEsc(p.rows[0].item || 'Item')}${p.rows.length > 1 ? ', …' : ''})`
            : '—';

          return `
            <tr style="border-bottom: 1px solid var(--slate-100); transition: background 0.15s; cursor: pointer;" onmouseover="this.style.background='var(--slate-50)'" onmouseout="this.style.background='transparent'" onclick="viewPrintProforma(${p.id})" title="Click to view proforma invoice">
              <td style="padding: 12px 16px;">
                <span style="font-family: monospace; font-weight: 800; color: var(--blue-700);">${safeEsc(p.proformaNo || 'PI-XXXX')}</span>
                ${p.document && p.document.data ? `<span title="Attachment: ${safeEsc(p.document.name)}" style="margin-left: 6px; color: #3b82f6;">📎</span>` : ''}
              </td>
              <td style="padding: 12px 14px; white-space: nowrap; color: var(--slate-700);">${p.date || '—'}</td>
              <td style="padding: 12px 14px; white-space: nowrap; color: var(--slate-500); font-size: 12px;">${p.dueDate || p.expiryDate || '—'}</td>
              <td style="padding: 12px 16px; font-weight: 600; color: var(--slate-800); max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${safeEsc(p.customerName || 'Customer')}
                ${p.salesExecutiveName ? `<div style="font-size: 11px; color: var(--slate-400); font-weight: 500;">By ${safeEsc(p.salesExecutiveName)}</div>` : ''}
              </td>
              <td style="padding: 12px 14px; font-size: 12px; color: var(--slate-600); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${itemsSummary}
              </td>
              <td style="padding: 12px 16px; text-align: right; font-weight: 800; color: var(--slate-900); white-space: nowrap;">
                ₹ ${safeFmtNum(p.total)}
                ${p.advancePaidAmount ? `<div style="font-size: 11px; color: #047857; font-weight: 600;">Adv: ₹${safeFmtNum(p.advancePaidAmount)}</div>` : ''}
              </td>
              <td style="padding: 12px 14px; text-align: center; white-space: nowrap;">
                ${statusBadge}
              </td>
            </tr>
          `;
        }).join('');
      }

      let headerLabel = 'All Proforma Invoices';
      if (_proformaFilterStatus === 'active') headerLabel = 'Active Proforma Invoices';
      else if (_proformaFilterStatus === 'completed') headerLabel = 'Completed Proforma Invoices';
      else if (_proformaFilterStatus === 'cancelled') headerLabel = 'Cancelled Proforma Invoices';

      return `
        <div class="table-card" style="border: 1.5px solid var(--slate-200); border-radius: 12px; overflow: hidden; background: #fff; box-shadow: var(--shadow-sm); width: 100%;">
          <div style="background: var(--slate-50); border-bottom: 1.5px solid var(--slate-200); padding: 12px 20px; display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-weight: 700; font-size: 14px; color: var(--slate-800);">${headerLabel}</span>
              <span class="badge badge-blue" style="background: #eff6ff; color: #1d4ed8; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px;">${filteredItems.length}</span>
            </div>
          </div>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
              <thead>
                <tr style="border-bottom: 1.5px solid var(--slate-200); color: var(--slate-500); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; background: #fafafa;">
                  <th style="padding: 10px 16px;">Proforma No.</th>
                  <th style="padding: 10px 14px;">Date</th>
                  <th style="padding: 10px 14px;">Due Date</th>
                  <th style="padding: 10px 16px;">Customer</th>
                  <th style="padding: 10px 14px;">Items</th>
                  <th style="padding: 10px 16px; text-align: right;">Amount</th>
                  <th style="padding: 10px 14px; text-align: center;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    const tableContent = renderSingleTableHtml();

    return `
      <div class="quotation-list-container" style="width: 100%;">
        <!-- Toolbar: Search Bar + Status Filter Pills -->
        <div class="ptb" style="margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;">
          <!-- Search Bar -->
          <div class="pt-search-wrap" style="flex: 1; min-width: 280px; position: relative;">
            <svg class="pt-search-icon" width="16" height="16" viewBox="0 0 15 15" fill="none" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--slate-400); pointer-events: none;">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.5"/>
              <path d="M10 10l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <input type="text" id="proformaListSearchInput" class="pt-search-inp" placeholder="Search proforma #, customer, item, date, amount…" value="${safeEsc(_proformaSearchQuery)}" style="width: 100%; height: 42px; padding: 10px 38px 10px 42px; font-size: 13.5px; border: 1.5px solid var(--slate-200); border-radius: 10px; background: #fff; box-sizing: border-box; outline: none; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.03);" onfocus="this.style.borderColor='var(--blue-500)'; this.style.boxShadow='0 0 0 3px rgba(37,99,235,0.1)';" onblur="this.style.borderColor='var(--slate-200)'; this.style.boxShadow='none';" />
            ${_proformaSearchQuery ? `
              <button type="button" id="btnProformaClearSearch" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); border: none; background: none; color: var(--slate-400); cursor: pointer; font-size: 15px; padding: 4px; display: flex; align-items: center; justify-content: center;" title="Clear search">✕</button>
            ` : ''}
          </div>

          <!-- Filter Tabs / Pills -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
            <button type="button" class="quote-filter-pill ${_proformaFilterStatus === 'all' ? 'active' : ''}" onclick="window.openProformaList('all')" style="height: 42px; border: 1.5px solid ${_proformaFilterStatus === 'all' ? 'var(--blue-600)' : 'var(--slate-200)'}; background: ${_proformaFilterStatus === 'all' ? 'var(--blue-50)' : '#fff'}; color: ${_proformaFilterStatus === 'all' ? 'var(--blue-700)' : 'var(--slate-600)'}; padding: 0 16px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
              <span>All</span>
              <span style="background: ${_proformaFilterStatus === 'all' ? 'var(--blue-200)' : 'var(--slate-100)'}; color: ${_proformaFilterStatus === 'all' ? 'var(--blue-800)' : 'var(--slate-600)'}; font-size: 11px; padding: 2px 8px; border-radius: 10px;">${allCount}</span>
            </button>

            <button type="button" class="quote-filter-pill ${_proformaFilterStatus === 'active' ? 'active' : ''}" onclick="window.openProformaList('active')" style="height: 42px; border: 1.5px solid ${_proformaFilterStatus === 'active' ? '#10b981' : 'var(--slate-200)'}; background: ${_proformaFilterStatus === 'active' ? '#ecfdf5' : '#fff'}; color: ${_proformaFilterStatus === 'active' ? '#047857' : 'var(--slate-600)'}; padding: 0 16px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span>
              <span>Active</span>
              <span style="background: ${_proformaFilterStatus === 'active' ? '#a7f3d0' : 'var(--slate-100)'}; color: ${_proformaFilterStatus === 'active' ? '#065f46' : 'var(--slate-600)'}; font-size: 11px; padding: 2px 8px; border-radius: 10px;">${activeCount}</span>
            </button>

            <button type="button" class="quote-filter-pill ${_proformaFilterStatus === 'completed' ? 'active' : ''}" onclick="window.openProformaList('completed')" style="height: 42px; border: 1.5px solid ${_proformaFilterStatus === 'completed' ? 'var(--blue-600)' : 'var(--slate-200)'}; background: ${_proformaFilterStatus === 'completed' ? '#eff6ff' : '#fff'}; color: ${_proformaFilterStatus === 'completed' ? '#1d4ed8' : 'var(--slate-600)'}; padding: 0 16px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #3b82f6;"></span>
              <span>Completed</span>
              <span style="background: ${_proformaFilterStatus === 'completed' ? '#bfdbfe' : 'var(--slate-100)'}; color: ${_proformaFilterStatus === 'completed' ? '#1e40af' : 'var(--slate-600)'}; font-size: 11px; padding: 2px 8px; border-radius: 10px;">${completedCount}</span>
            </button>

            <button type="button" class="quote-filter-pill ${_proformaFilterStatus === 'cancelled' ? 'active' : ''}" onclick="window.openProformaList('cancelled')" style="height: 42px; border: 1.5px solid ${_proformaFilterStatus === 'cancelled' ? 'var(--slate-400)' : 'var(--slate-200)'}; background: ${_proformaFilterStatus === 'cancelled' ? '#f1f5f9' : '#fff'}; color: ${_proformaFilterStatus === 'cancelled' ? '#334155' : 'var(--slate-600)'}; padding: 0 16px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #94a3b8;"></span>
              <span>Cancelled</span>
              <span style="background: ${_proformaFilterStatus === 'cancelled' ? '#cbd5e1' : 'var(--slate-100)'}; color: ${_proformaFilterStatus === 'cancelled' ? '#1e293b' : 'var(--slate-600)'}; font-size: 11px; padding: 2px 8px; border-radius: 10px;">${cancelledCount}</span>
            </button>
          </div>
        </div>

        <!-- Rendered Proforma Table -->
        <div id="proformaListSectionsContainer">
          ${tableContent}
        </div>
      </div>
    `;
  }

  function attachProformaListEvents() {
    const searchInput = document.getElementById('proformaListSearchInput');
    if (searchInput && !searchInput._wired) {
      searchInput._wired = true;
      searchInput.addEventListener('input', (e) => {
        _proformaSearchQuery = e.target.value;
        const container = document.getElementById('proformaListFullContentArea') || document.getElementById('preInvContentArea');
        if (container) {
          container.innerHTML = renderProformaList(_proformaFilterStatus);
          attachProformaListEvents();
          const updatedSearch = document.getElementById('proformaListSearchInput');
          if (updatedSearch) {
            updatedSearch.focus();
            updatedSearch.setSelectionRange(updatedSearch.value.length, updatedSearch.value.length);
          }
        }
      });
    }

    const clearBtn = document.getElementById('btnProformaClearSearch');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        _proformaSearchQuery = '';
        const container = document.getElementById('proformaListFullContentArea') || document.getElementById('preInvContentArea');
        if (container) {
          container.innerHTML = renderProformaList(_proformaFilterStatus);
          attachProformaListEvents();
          const updatedSearch = document.getElementById('proformaListSearchInput');
          if (updatedSearch) updatedSearch.focus();
        }
      });
    }
  }

  // ── Global Exports ──
  window.openProformaForm = openProformaForm;
  window.closeProformaForm = closeProformaForm;
  window.openProformaList = openProformaList;
  window.closeProformaList = closeProformaList;
  window.initProformaForm = initProformaForm;
  window.renderProformaRows = renderProformaRows;
  window.addProformaRow = addProformaRow;
  window.recalculateProformaTotals = recalculateProformaTotals;
  window.saveProformaInvoice = saveProformaInvoice;

  window.getAllProformaInvoices = getAllProformaInvoices;
  window.renderProformaList = renderProformaList;
  window.attachProformaListEvents = attachProformaListEvents;
  window.setProformaStatus = setProformaStatus;
  window.deleteProformaItem = deleteProformaItem;
  window.convertProformaToInvoice = convertProformaToInvoice;
  window.markProformaCompletedOnInvoicePost = markProformaCompletedOnInvoicePost;
  window.editProformaItem = editProformaItem;
  window.viewPrintProforma = viewPrintProforma;

  // Init on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupProformaEventListeners);
  } else {
    setupProformaEventListeners();
  }
})();
