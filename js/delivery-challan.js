/**
 * js/delivery-challan.js
 * Delivery Challan module for Pre Invoice (KYA)
 */
(function() {
  'use strict';

  let challanRows = [];
  let _challanDocData = null;
  let _challanDocName = '';
  let _challanDocSize = 0;
  let _challanDocType = '';
  let _editingChallan = null;

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

  // ── Open / Close Delivery Challan Form ──
  function openDeliveryChallanForm(challanData) {
    const preInvCard = document.getElementById('salesPreInvoiceCard');
    const salesFormCard = document.getElementById('salesVoucherFormCard');
    const quoteFormCard = document.getElementById('salesQuotationFormCard');
    const proformaFormCard = document.getElementById('salesProformaFormCard');
    const orderFormCard = document.getElementById('salesOrderFormCard');
    const challanFormCard = document.getElementById('salesDeliveryChallanFormCard');

    if (preInvCard) preInvCard.style.display = 'none';
    if (salesFormCard) salesFormCard.style.display = 'none';
    if (quoteFormCard) quoteFormCard.style.display = 'none';
    if (proformaFormCard) proformaFormCard.style.display = 'none';
    if (orderFormCard) orderFormCard.style.display = 'none';
    if (challanFormCard) challanFormCard.style.display = 'block';

    window._currentSalesSubtype = 'Delivery Challan';
    initDeliveryChallanForm(challanData);
  }

  function closeDeliveryChallanForm() {
    const preInvCard = document.getElementById('salesPreInvoiceCard');
    const challanFormCard = document.getElementById('salesDeliveryChallanFormCard');

    if (challanFormCard) challanFormCard.style.display = 'none';
    if (preInvCard) preInvCard.style.display = 'block';

    _editingChallan = null;
    if (typeof renderSalesPreInvoicePanel === 'function') {
      renderSalesPreInvoicePanel();
    }
  }

  // ── Initialize Delivery Challan Form ──
  function initDeliveryChallanForm(challanData) {
    const today = new Date().toISOString().split('T')[0];
    const dispatchDateObj = new Date();
    dispatchDateObj.setDate(dispatchDateObj.getDate() + 7);
    const dispatchDate = dispatchDateObj.toISOString().split('T')[0];

    const dateEl = document.getElementById('challanDate');
    const dispatchEl = document.getElementById('challanDispatchDate');
    const noEl = document.getElementById('challanNo');
    const chipEl = document.getElementById('challanChipDisplay');
    const notesEl = document.getElementById('challanNotes');
    const supplyTypeEl = document.getElementById('challanSupplyType');
    const dueEl = document.getElementById('challanDueDate');

    if (challanData) {
      _editingChallan = challanData;
      if (dateEl) dateEl.value = challanData.date || today;
      if (dispatchEl) dispatchEl.value = challanData.dispatchDate || challanData.expiryDate || dispatchDate;
      if (dueEl) dueEl.value = challanData.dueDate || challanData.dispatchDate || dispatchDate;
      if (noEl) noEl.value = challanData.challanNo || '';
      if (chipEl) chipEl.textContent = challanData.challanNo || 'DC-2026-001';
      if (notesEl) notesEl.value = challanData.notes || '';
      if (supplyTypeEl && challanData.supplyType) supplyTypeEl.value = challanData.supplyType;

      challanRows = Array.isArray(challanData.rows) ? JSON.parse(JSON.stringify(challanData.rows)) : [];
      if (challanRows.length === 0) {
        challanRows = [{ item: '', hsn: '', qty: 1, unit: '', rate: 0, discount: 0, discountType: 'val', tax: 18, amount: 0 }];
      }

      // Populate customer
      populateChallanCustomers();
      if (challanData.customerId) {
        selectChallanCustomer(challanData.customerId);
      }

      // Populate executive
      populateChallanExecutives(challanData.salesExecutiveId);

      // Adjustments
      const adjEl = document.getElementById('challanAdjustments');
      if (adjEl) adjEl.value = challanData.adjustments || '';

      // TDS / TCS
      const noneBtn = document.getElementById('challanTdsTcsNone');
      const tdsBtn = document.getElementById('challanTdsTcsTds');
      const tcsBtn = document.getElementById('challanTdsTcsTcs');
      if (challanData.tdsTcsMode === 'TDS' && tdsBtn) tdsBtn.click();
      else if (challanData.tdsTcsMode === 'TCS' && tcsBtn) tcsBtn.click();
      else if (noneBtn) noneBtn.click();

      const rateSelect = document.getElementById('challanTdsTcsRateSelect');
      const customInput = document.getElementById('challanTdsTcsRateCustom');
      const customWrap = document.getElementById('challanTdsTcsRateCustomWrap');
      const rateVal = challanData.tdsTcsRate || 0;
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

      const amtInput = document.getElementById('challanTdsTcsAmount');
      if (amtInput && challanData.tdsTcsAmount !== undefined) {
        amtInput.value = challanData.tdsTcsAmount;
      }

      // Payment / Dispatch Status
      const notPaidBtn = document.getElementById('challanPaymentStatusNotPaid');
      const fullBtn = document.getElementById('challanPaymentStatusFull');
      const partBtn = document.getElementById('challanPaymentStatusPartial');
      if (challanData.paymentStatus === 'Full Payment') {
        if (fullBtn) fullBtn.click();
      } else if (challanData.paymentStatus === 'Partial Payment') {
        if (partBtn) partBtn.click();
      } else {
        if (notPaidBtn) notPaidBtn.click();
      }

      populateChallanPaymentAccounts(challanData.paymentAccountId);
      const payAmtEl = document.getElementById('challanPaymentAmount');
      if (payAmtEl && challanData.paymentAmount !== undefined) {
        payAmtEl.value = challanData.paymentAmount || '';
      }

      // Doc attachment
      updateChallanDocUI(challanData.document || null);
    } else {
      _editingChallan = null;
      if (dateEl) dateEl.value = today;
      if (dispatchEl) dispatchEl.value = dispatchDate;
      if (dueEl) dueEl.value = dispatchDate;

      // Generate next challan number
      const nextNum = getNextChallanNumber();
      if (noEl) noEl.value = nextNum;
      if (chipEl) chipEl.textContent = nextNum;
      if (notesEl) notesEl.value = '';
      if (supplyTypeEl) supplyTypeEl.value = 'Transportation of Goods';

      challanRows = [{ item: '', hsn: '', qty: 1, unit: '', rate: 0, discount: 0, discountType: 'val', tax: 18, amount: 0 }];

      populateChallanCustomers();
      populateChallanExecutives();

      const adjEl = document.getElementById('challanAdjustments');
      if (adjEl) adjEl.value = '';

      const noneBtn = document.getElementById('challanTdsTcsNone');
      if (noneBtn) noneBtn.click();

      const notPaidBtn = document.getElementById('challanPaymentStatusNotPaid');
      if (notPaidBtn) notPaidBtn.click();
      populateChallanPaymentAccounts();

      const payAmtEl = document.getElementById('challanPaymentAmount');
      if (payAmtEl) payAmtEl.value = '';

      updateChallanDocUI(null);
    }

    updateChallanDueDateHelper();
    renderChallanRows();
    recalculateChallanTotals();
  }

  function getNextChallanNumber() {
    window.KYA_STORE = window.KYA_STORE || {};
    const list = (window.KYA_STORE.deliveryChallans || []).concat(window.KYA_STORE.deliveryChallansDrafts || []);
    const count = list.length + 1;
    const year = new Date().getFullYear();
    const pad = count < 10 ? '00' + count : (count < 100 ? '0' + count : count);
    return `DC-${year}-${pad}`;
  }

  // ── Due / Dispatch Date Helper ──
  function updateChallanDueDateHelper() {
    const dateEl = document.getElementById('challanDate');
    const dueEl = document.getElementById('challanDueDate') || document.getElementById('challanDispatchDate');
    const daysEl = document.getElementById('challanDueDateDays');
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
  function populateChallanPaymentAccounts(selectedId = null) {
    const paySelect = document.getElementById('challanPaymentAccount');
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
  }

  function getChallanPaymentStatus() {
    const fullBtn = document.getElementById('challanPaymentStatusFull');
    const partBtn = document.getElementById('challanPaymentStatusPartial');

    if (fullBtn && fullBtn.classList.contains('active')) return 'Full Payment';
    if (partBtn && partBtn.classList.contains('active')) return 'Partial Payment';
    return 'Not Paid';
  }

  // ── Customer Search & Selection ──
  function populateChallanCustomers(filter) {
    const custs = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
    const optionsList = document.getElementById('challanCustomerSelectOptionsList');
    const selectEl = document.getElementById('challanCustomer');
    if (!optionsList) return;

    optionsList.innerHTML = '';
    if (selectEl) {
      selectEl.innerHTML = '<option value="">&mdash; Select Customer / Consignee &mdash;</option>';
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
        selectChallanCustomer(c.id);
        const dropdown = document.getElementById('challanCustomerSelectDropdown');
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

  function selectChallanCustomer(customerId) {
    const custs = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
    const cust = custs.find(c => String(c.id) === String(customerId));
    const triggerText = document.getElementById('challanCustomerSelectTriggerText');
    const selectEl = document.getElementById('challanCustomer');

    if (selectEl) selectEl.value = customerId || '';
    if (triggerText) {
      triggerText.textContent = cust ? cust.name : '— Select Customer / Consignee —';
      triggerText.style.color = cust ? 'var(--slate-800)' : 'var(--slate-500)';
      triggerText.style.fontWeight = cust ? '600' : '500';
    }
  }

  function populateChallanExecutives(selectedId) {
    const execEl = document.getElementById('challanSalesExecutive');
    if (!execEl) return;
    execEl.innerHTML = '<option value="">&mdash; Select Dispatched By / Executive &mdash;</option>';

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
  function renderChallanRows() {
    const body = document.getElementById('challanItemBody');
    if (!body) return;

    body.innerHTML = '';

    challanRows.forEach((row, index) => {
      const trHtml = `
        <tr class="sales-row" data-row-index="${index}">
          <td class="sales-cell-item" style="padding: 4px 8px;">
            <div style="position: relative; display: flex; align-items: center; width: 100%;">
              <input type="text" class="sales-row-item je-input" value="${safeEsc(row.item || '')}" placeholder="Select or type Description (Product / Good)" style="border: none; background: transparent; box-shadow: none; padding: 0 18px 0 0; width: 100%; font-weight: 600; font-size: 13px; color: var(--slate-800); outline: none;" autocomplete="off" />
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
            <button type="button" class="sales-del-row challan-del-row" style="background: none; border: none !important; outline: none !important; box-shadow: none !important; color: var(--red-600); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; margin: 0 auto; transition: background 0.15s;" onmouseover="this.style.backgroundColor='var(--red-50)'" onmouseout="this.style.backgroundColor='transparent'">
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
            challanRows[index].item = selectedItem.name;
            challanRows[index].itemType = selectedItem.type;
            if (selectedItem.type === 'Service' && selectedItem.id) {
              challanRows[index].revenueLedgerId = selectedItem.id;
            }
            recalculateChallanTotals();
          });
        };

        itemInp.addEventListener('focus', attachPortal);
        itemInp.addEventListener('click', attachPortal);
        itemInp.addEventListener('input', () => {
          challanRows[index].item = itemInp.value;
          attachPortal();
        });
      }
    });
  }

  function addChallanRow() {
    challanRows.push({ item: '', hsn: '', qty: 1, unit: '', rate: 0, discount: 0, discountType: 'val', tax: 18, amount: 0 });
    renderChallanRows();
    recalculateChallanTotals();
  }

  function updateChallanRowFromDOM(index, tr, triggeredBy) {
    const row = challanRows[index];
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

    recalculateChallanTotals();
  }

  // ── Calculation & Totals ──
  function calculateChallanSubtotal() {
    if (!Array.isArray(challanRows)) return 0;
    let sub = 0;
    challanRows.forEach(r => {
      sub += (parseFloat(r.amount) || 0);
    });
    return Math.round(sub * 100) / 100;
  }

  function recalculateChallanTotals() {
    const subTotal = calculateChallanSubtotal();
    const subTotalEl = document.getElementById('challanSubTotal');
    if (subTotalEl) subTotalEl.textContent = '₹ ' + safeFmtNum(subTotal);

    let tdsTcsMode = 'None';
    const tdsBtn = document.getElementById('challanTdsTcsTds');
    const tcsBtn = document.getElementById('challanTdsTcsTcs');
    if (tdsBtn && tdsBtn.classList.contains('active')) tdsTcsMode = 'TDS';
    if (tcsBtn && tcsBtn.classList.contains('active')) tdsTcsMode = 'TCS';

    const rateSelect = document.getElementById('challanTdsTcsRateSelect');
    const customWrap = document.getElementById('challanTdsTcsRateCustomWrap');
    let rate = 0;

    if (tdsTcsMode === 'None') {
      rate = 0;
    } else if (rateSelect) {
      if (rateSelect.value === 'custom') {
        if (customWrap) customWrap.style.display = 'flex';
        const customInput = document.getElementById('challanTdsTcsRateCustom');
        rate = customInput ? (parseFloat(customInput.value) || 0) : 0;
      } else {
        if (customWrap) customWrap.style.display = 'none';
        rate = parseFloat(rateSelect.value) || 0;
      }
    }

    const amountInput = document.getElementById('challanTdsTcsAmount');
    if (amountInput && document.activeElement !== amountInput) {
      if (tdsTcsMode !== 'None') {
        const calculatedAmt = subTotal * (rate / 100);
        amountInput.value = calculatedAmt.toFixed(2);
      } else {
        amountInput.value = '';
      }
    }

    const tdsTcsAmount = amountInput ? (parseFloat(amountInput.value) || 0) : 0;
    const adjustmentsInput = document.getElementById('challanAdjustments');
    const adjustments = adjustmentsInput ? (parseFloat(adjustmentsInput.value) || 0) : 0;

    const btnAuto = document.getElementById('btnChallanAutoRoundOff');
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

    const totalEl = document.getElementById('challanTotal');
    if (totalEl) totalEl.textContent = '₹ ' + safeFmtNum(total);

    // Adjust Payment Amount if in Full payment or exceeds Grand Total
    const fullBtn = document.getElementById('challanPaymentStatusFull');
    const payAmtEl = document.getElementById('challanPaymentAmount');
    if (payAmtEl) {
      if (fullBtn && fullBtn.classList.contains('active')) {
        payAmtEl.value = total > 0 ? total.toFixed(2) : '';
      } else if (payAmtEl.value && total > 0) {
        const curVal = parseFloat(payAmtEl.value) || 0;
        if (curVal > total) {
          payAmtEl.value = total.toFixed(2);
        }
      }
    }
  }

  function autoCalculateChallanRoundOff() {
    const btnAuto = document.getElementById('btnChallanAutoRoundOff');
    const adjEl = document.getElementById('challanAdjustments');

    if (btnAuto && btnAuto.classList.contains('active') && adjEl && adjEl.value.trim() !== '') {
      adjEl.value = '';
      btnAuto.classList.remove('active');
      recalculateChallanTotals();
      return;
    }

    const subTotal = calculateChallanSubtotal();
    let tdsTcsMode = 'None';
    const tdsBtn = document.getElementById('challanTdsTcsTds');
    const tcsBtn = document.getElementById('challanTdsTcsTcs');
    if (tdsBtn && tdsBtn.classList.contains('active')) tdsTcsMode = 'TDS';
    if (tcsBtn && tcsBtn.classList.contains('active')) tdsTcsMode = 'TCS';

    const amountInput = document.getElementById('challanTdsTcsAmount');
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

    recalculateChallanTotals();
  }

  // ── Document Upload Handling ──
  function updateChallanDocUI(docData) {
    const emptyState = document.getElementById('challanDocEmptyState');
    const selectedState = document.getElementById('challanDocSelectedState');
    const statusBadge = document.getElementById('challanDocStatusBadge');
    const fileNameEl = document.getElementById('challanDocFileName');
    const fileSizeEl = document.getElementById('challanDocFileSize');
    const fileIconEl = document.getElementById('challanDocFileIcon');
    const previewBtn = document.getElementById('challanDocPreviewBtn');
    const fileInput = document.getElementById('challanDocFileInput');

    if (!docData) {
      _challanDocData = null;
      _challanDocName = '';
      _challanDocSize = 0;
      _challanDocType = '';
      if (emptyState) emptyState.style.display = 'flex';
      if (selectedState) selectedState.style.display = 'none';
      if (statusBadge) statusBadge.style.display = 'none';
      if (fileInput) fileInput.value = '';
      return;
    }

    _challanDocData = docData.data;
    _challanDocName = docData.name || 'Document';
    _challanDocSize = docData.size || 0;
    _challanDocType = docData.type || '';

    if (emptyState) emptyState.style.display = 'none';
    if (selectedState) selectedState.style.display = 'flex';
    if (statusBadge) statusBadge.style.display = 'inline-block';

    if (fileNameEl) fileNameEl.textContent = _challanDocName;
    if (fileSizeEl) fileSizeEl.textContent = formatChallanFileSize(_challanDocSize);

    const ext = (_challanDocName.split('.').pop() || 'DOC').toUpperCase().slice(0, 4);
    if (fileIconEl) fileIconEl.textContent = ext;

    if (previewBtn) {
      previewBtn.href = _challanDocData;
      previewBtn.download = _challanDocName;
    }
  }

  function formatChallanFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function handleChallanFileUpload(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('File size exceeds maximum limit of 10MB.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      updateChallanDocUI({
        name: file.name,
        size: file.size,
        type: file.type,
        data: e.target.result
      });
      showToast('Document attached successfully.', 'success');
    };
    reader.readAsDataURL(file);
  }

  // ── Save / Post Delivery Challan ──
  function getChallanFormData() {
    const date = document.getElementById('challanDate')?.value || new Date().toISOString().split('T')[0];
    const dispatchDate = document.getElementById('challanDispatchDate')?.value || '';
    const dueDate = document.getElementById('challanDueDate')?.value || dispatchDate;
    const challanNo = document.getElementById('challanNo')?.value?.trim() || getNextChallanNumber();
    const customerId = document.getElementById('challanCustomer')?.value || '';
    const custs = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
    const cust = custs.find(c => String(c.id) === String(customerId));
    const customerName = cust ? cust.name : '';

    const supplyType = document.getElementById('challanSupplyType')?.value || 'Transportation of Goods';
    const salesExecutiveId = document.getElementById('challanSalesExecutive')?.value || '';
    let salesExecutiveName = '';
    if (typeof ohEmployees !== 'undefined' && Array.isArray(ohEmployees)) {
      const emp = ohEmployees.find(e => String(e.id) === String(salesExecutiveId));
      if (emp) salesExecutiveName = emp.name;
    }
    if (!salesExecutiveName && typeof coaLedgers !== 'undefined') {
      const exec = coaLedgers.find(l => String(l.id) === String(salesExecutiveId));
      if (exec) salesExecutiveName = exec.name;
    }

    const notes = document.getElementById('challanNotes')?.value || '';
    const subTotal = calculateChallanSubtotal();

    let tdsTcsMode = 'None';
    const tdsBtn = document.getElementById('challanTdsTcsTds');
    const tcsBtn = document.getElementById('challanTdsTcsTcs');
    if (tdsBtn && tdsBtn.classList.contains('active')) tdsTcsMode = 'TDS';
    if (tcsBtn && tcsBtn.classList.contains('active')) tdsTcsMode = 'TCS';

    const rateSelect = document.getElementById('challanTdsTcsRateSelect');
    let tdsTcsRate = 0;
    if (tdsTcsMode !== 'None' && rateSelect) {
      if (rateSelect.value === 'custom') {
        const customInput = document.getElementById('challanTdsTcsRateCustom');
        tdsTcsRate = customInput ? (parseFloat(customInput.value) || 0) : 0;
      } else {
        tdsTcsRate = parseFloat(rateSelect.value) || 0;
      }
    }

    const amtInput = document.getElementById('challanTdsTcsAmount');
    const tdsTcsAmount = amtInput ? (parseFloat(amtInput.value) || 0) : 0;
    const adjustmentsInput = document.getElementById('challanAdjustments');
    const adjustments = adjustmentsInput ? (parseFloat(adjustmentsInput.value) || 0) : 0;

    let total = subTotal;
    if (tdsTcsMode === 'TDS') total = subTotal - tdsTcsAmount;
    else if (tdsTcsMode === 'TCS') total = subTotal + tdsTcsAmount;
    total += adjustments;

    const paymentStatus = getChallanPaymentStatus();
    const paymentAccountId = document.getElementById('challanPaymentAccount')?.value || '';
    let paymentAccountName = '';
    if (paymentAccountId && typeof coaLedgers !== 'undefined') {
      const acc = coaLedgers.find(l => String(l.id) === String(paymentAccountId));
      if (acc) paymentAccountName = acc.name;
    }
    const paymentAmount = paymentStatus === 'Full Payment' ? total : (parseFloat(document.getElementById('challanPaymentAmount')?.value) || 0);

    return {
      id: _editingChallan ? _editingChallan.id : Date.now(),
      challanNo,
      date,
      dispatchDate,
      expiryDate: dispatchDate,
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
      rows: JSON.parse(JSON.stringify(challanRows)),
      subTotal,
      tdsTcsMode,
      tdsTcsRate,
      tdsTcsAmount,
      adjustments,
      total,
      notes,
      document: _challanDocData ? {
        name: _challanDocName,
        size: _challanDocSize,
        type: _challanDocType,
        data: _challanDocData
      } : null,
      createdAt: _editingChallan ? _editingChallan.createdAt : Date.now(),
      status: 'Active'
    };
  }

  function saveDeliveryChallan(isDraft) {
    const data = getChallanFormData();

    if (!data.customerId) {
      showToast('Please select a Customer / Consignee for the delivery challan.', 'warning');
      return;
    }

    const validRows = data.rows.filter(r => (r.item && r.item.trim()) || (r.amount && r.amount > 0));
    if (validRows.length === 0) {
      showToast('Please add at least one line item to the delivery challan.', 'warning');
      return;
    }

    if (data.paymentStatus !== 'Not Paid' && !data.paymentAccountId) {
      showToast('Please select a Payment Account.', 'warning');
      return;
    }

    window.KYA_STORE.deliveryChallans = window.KYA_STORE.deliveryChallans || [];
    window.KYA_STORE.deliveryChallansDrafts = window.KYA_STORE.deliveryChallansDrafts || [];

    if (isDraft) {
      data.status = 'Draft';
      const existingIdx = window.KYA_STORE.deliveryChallansDrafts.findIndex(q => q.id === data.id);
      if (existingIdx >= 0) {
        window.KYA_STORE.deliveryChallansDrafts[existingIdx] = data;
      } else {
        window.KYA_STORE.deliveryChallansDrafts.unshift(data);
      }
      showToast(`Delivery challan draft ${data.challanNo} saved successfully.`, 'success');
    } else {
      data.status = 'Active';
      const existingIdx = window.KYA_STORE.deliveryChallans.findIndex(q => q.id === data.id);
      if (existingIdx >= 0) {
        window.KYA_STORE.deliveryChallans[existingIdx] = data;
      } else {
        window.KYA_STORE.deliveryChallans.unshift(data);
      }

      // Remove from drafts if existed
      window.KYA_STORE.deliveryChallansDrafts = window.KYA_STORE.deliveryChallansDrafts.filter(d => d.id !== data.id);

      showToast(`Delivery Challan ${data.challanNo} saved successfully!`, 'success');
    }

    if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
    closeDeliveryChallanForm();
  }

  // ── Setup Event Listeners ──
  function setupChallanEventListeners() {
    // Back button
    const backBtn = document.getElementById('btnChallanBack');
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeDeliveryChallanForm();
      });
    }

    // Nav sub-module buttons (Quotation, Proforma Invoice, Sales Order)
    const quoteNavBtn = document.getElementById('btnChallanNavQuotation');
    if (quoteNavBtn) {
      quoteNavBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeDeliveryChallanForm();
        if (typeof openQuotationForm === 'function') {
          openQuotationForm();
        }
      });
    }

    const proformaNavBtn = document.getElementById('btnChallanNavProforma');
    if (proformaNavBtn) {
      proformaNavBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeDeliveryChallanForm();
        if (typeof openProformaForm === 'function') {
          openProformaForm();
        }
      });
    }

    const salesOrderNavBtn = document.getElementById('btnChallanNavSalesOrder');
    if (salesOrderNavBtn) {
      salesOrderNavBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeDeliveryChallanForm();
        if (typeof openSalesOrderForm === 'function') {
          openSalesOrderForm();
        }
      });
    }

    // Chip sync
    const challanNoEl = document.getElementById('challanNo');
    const chipEl = document.getElementById('challanChipDisplay');
    if (challanNoEl && chipEl) {
      challanNoEl.addEventListener('input', () => {
        chipEl.textContent = challanNoEl.value.trim() || 'DC-2026-001';
      });
    }

    // Due / Dispatch Date helpers
    const dateEl = document.getElementById('challanDate');
    const dueEl = document.getElementById('challanDueDate');
    const dispatchEl = document.getElementById('challanDispatchDate');

    if (dateEl) {
      dateEl.addEventListener('change', updateChallanDueDateHelper);
      dateEl.addEventListener('input', updateChallanDueDateHelper);
    }
    if (dueEl) {
      dueEl.addEventListener('change', updateChallanDueDateHelper);
      dueEl.addEventListener('input', updateChallanDueDateHelper);
    }
    if (dispatchEl) {
      dispatchEl.addEventListener('change', () => {
        if (dueEl && !dueEl.value) dueEl.value = dispatchEl.value;
        updateChallanDueDateHelper();
      });
      dispatchEl.addEventListener('input', () => {
        if (dueEl && !dueEl.value) dueEl.value = dispatchEl.value;
        updateChallanDueDateHelper();
      });
    }

    // Payment Status Buttons
    const payNotPaidBtn = document.getElementById('challanPaymentStatusNotPaid');
    const payFullBtn = document.getElementById('challanPaymentStatusFull');
    const payPartialBtn = document.getElementById('challanPaymentStatusPartial');
    const payBg = document.getElementById('challanPaymentStatusBg');
    const payAccField = document.getElementById('challanPaymentAccountField');
    const payAmtField = document.getElementById('challanPaymentAmountField');
    const payDueDateField = document.getElementById('challanDueDateField');

    if (payNotPaidBtn && payFullBtn && payPartialBtn && payBg && payAccField && payAmtField) {
      payNotPaidBtn.addEventListener('click', () => {
        payNotPaidBtn.classList.add('active');
        payFullBtn.classList.remove('active');
        payPartialBtn.classList.remove('active');
        payBg.className = 'sales-paystatus-bg notpaid-active';
        payAccField.style.display = 'none';
        payAmtField.style.display = 'none';
        if (payDueDateField) payDueDateField.style.display = 'flex';
        const wrapper = document.getElementById('challanDueDateWrapper');
        if (wrapper) {
          wrapper.style.flexDirection = 'row';
          wrapper.style.alignItems = 'center';
        }
        updateChallanDueDateHelper();
        recalculateChallanTotals();
      });

      payFullBtn.addEventListener('click', () => {
        payFullBtn.classList.add('active');
        payNotPaidBtn.classList.remove('active');
        payPartialBtn.classList.remove('active');
        payBg.className = 'sales-paystatus-bg fullpaid-active';
        payAccField.style.display = 'flex';
        payAmtField.style.display = 'none';
        if (payDueDateField) payDueDateField.style.display = 'none';
        populateChallanPaymentAccounts();
        recalculateChallanTotals();
      });

      payPartialBtn.addEventListener('click', () => {
        payPartialBtn.classList.add('active');
        payNotPaidBtn.classList.remove('active');
        payFullBtn.classList.remove('active');
        payBg.className = 'sales-paystatus-bg partpaid-active';
        payAccField.style.display = 'flex';
        payAmtField.style.display = 'flex';
        if (payDueDateField) payDueDateField.style.display = 'flex';
        const wrapper = document.getElementById('challanDueDateWrapper');
        if (wrapper) {
          wrapper.style.flexDirection = 'column';
          wrapper.style.alignItems = 'flex-start';
          wrapper.style.gap = '4px';
        }
        updateChallanDueDateHelper();
        populateChallanPaymentAccounts();
        recalculateChallanTotals();
      });
    }

    const payAccEl = document.getElementById('challanPaymentAccount');
    if (payAccEl) {
      payAccEl.addEventListener('focus', () => {
        populateChallanPaymentAccounts(payAccEl.value);
      });
    }

    const payAmtEl = document.getElementById('challanPaymentAmount');
    if (payAmtEl) {
      payAmtEl.addEventListener('input', () => {
        recalculateChallanTotals();
      });
    }

    // Customer Searchable Select
    const custTrigger = document.getElementById('challanCustomerSelectTrigger');
    const custDropdown = document.getElementById('challanCustomerSelectDropdown');
    const custSearch = document.getElementById('challanCustomerSelectSearch');

    if (custTrigger && custDropdown && custSearch) {
      custTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = custDropdown.style.display === 'flex';
        if (isOpen) {
          custDropdown.style.display = 'none';
        } else {
          custDropdown.style.display = 'flex';
          custSearch.value = '';
          populateChallanCustomers();
          setTimeout(() => custSearch.focus(), 50);
        }
      });

      custSearch.addEventListener('input', () => {
        populateChallanCustomers(custSearch.value);
      });

      custSearch.addEventListener('click', (e) => e.stopPropagation());

      document.addEventListener('click', (e) => {
        if (!custTrigger.contains(e.target) && !custDropdown.contains(e.target)) {
          custDropdown.style.display = 'none';
        }
      });
    }

    // Add Row
    const addRowBtn = document.getElementById('challanAddRow');
    if (addRowBtn) {
      addRowBtn.addEventListener('click', () => {
        addChallanRow();
      });
    }

    // Line items input / change / delete delegation
    const challanBody = document.getElementById('challanItemBody');
    if (challanBody) {
      challanBody.addEventListener('input', (e) => {
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
        updateChallanRowFromDOM(index, tr, triggeredBy);
      });

      challanBody.addEventListener('change', (e) => {
        const tr = e.target.closest('tr');
        if (!tr) return;
        const index = parseInt(tr.dataset.rowIndex);
        updateChallanRowFromDOM(index, tr, 'rate');
      });

      challanBody.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.challan-del-row');
        if (delBtn) {
          const tr = delBtn.closest('tr');
          if (tr) {
            const index = parseInt(tr.dataset.rowIndex);
            if (!isNaN(index)) {
              if (challanRows.length > 1) {
                challanRows.splice(index, 1);
              } else {
                challanRows = [{ item: '', hsn: '', qty: 1, unit: '', rate: 0, discount: 0, discountType: 'val', tax: 18, amount: 0 }];
              }
              renderChallanRows();
              recalculateChallanTotals();
            }
          }
        }
      });
    }

    // TDS / TCS Switcher
    const noneBtn = document.getElementById('challanTdsTcsNone');
    const tdsBtn = document.getElementById('challanTdsTcsTds');
    const tcsBtn = document.getElementById('challanTdsTcsTcs');
    const bg = document.getElementById('challanTdsTcsBg');
    const amountRow = document.getElementById('challanTdsTcsAmountRow');
    const amountLabel = document.getElementById('challanTdsTcsAmountLabel');
    const rateSelect = document.getElementById('challanTdsTcsRateSelect');
    const customInput = document.getElementById('challanTdsTcsRateCustom');
    const customWrap = document.getElementById('challanTdsTcsRateCustomWrap');
    const amountInput = document.getElementById('challanTdsTcsAmount');
    const adjustmentsInput = document.getElementById('challanAdjustments');
    const btnAutoRoundOff = document.getElementById('btnChallanAutoRoundOff');

    if (noneBtn) {
      noneBtn.addEventListener('click', () => {
        noneBtn.classList.add('active');
        if (tdsBtn) tdsBtn.classList.remove('active');
        if (tcsBtn) tcsBtn.classList.remove('active');
        if (bg) bg.className = 'sales-tdstcs-bg none-active';
        if (amountRow) amountRow.style.display = 'none';
        if (amountInput) amountInput.value = '';
        recalculateChallanTotals();
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
        recalculateChallanTotals();
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
        recalculateChallanTotals();
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
        recalculateChallanTotals();
      });
    }

    if (customInput) {
      customInput.addEventListener('input', () => {
        recalculateChallanTotals();
      });
    }

    if (amountInput) {
      amountInput.addEventListener('input', () => {
        recalculateChallanTotals();
      });
    }

    if (adjustmentsInput) {
      adjustmentsInput.addEventListener('input', () => {
        recalculateChallanTotals();
      });
    }

    if (btnAutoRoundOff) {
      btnAutoRoundOff.addEventListener('click', (e) => {
        e.preventDefault();
        autoCalculateChallanRoundOff();
      });
    }

    // Document Attachment
    const dropzone = document.getElementById('challanDocDropzone');
    const fileInput = document.getElementById('challanDocFileInput');
    const removeBtn = document.getElementById('challanDocRemoveBtn');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', (e) => {
        if (e.target.closest('#challanDocRemoveBtn') || e.target.closest('#challanDocPreviewBtn')) return;
        fileInput.click();
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleChallanFileUpload(e.target.files[0]);
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
          handleChallanFileUpload(e.dataTransfer.files[0]);
        }
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateChallanDocUI(null);
        showToast('Document attachment removed.', 'info');
      });
    }

    // Action buttons
    const clearBtn = document.getElementById('btnClearChallan');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        initDeliveryChallanForm(_editingChallan);
      });
    }

    const saveDraftBtn = document.getElementById('btnSaveChallanDraft');
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener('click', () => {
        saveDeliveryChallan(true);
      });
    }

    const saveBtn = document.getElementById('btnSaveChallan');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        saveDeliveryChallan(false);
      });
    }
  }

  // ── Global Exports ──
  window.openDeliveryChallanForm = openDeliveryChallanForm;
  window.closeDeliveryChallanForm = closeDeliveryChallanForm;
  window.initDeliveryChallanForm = initDeliveryChallanForm;
  window.renderChallanRows = renderChallanRows;
  window.addChallanRow = addChallanRow;
  window.recalculateChallanTotals = recalculateChallanTotals;
  window.saveDeliveryChallan = saveDeliveryChallan;

  // Init on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupChallanEventListeners);
  } else {
    setupChallanEventListeners();
  }
})();
