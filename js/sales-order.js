/**
 * js/sales-order.js
 * Sales Order module for Pre Invoice (KYA)
 */
(function() {
  'use strict';

  let orderRows = [];
  let _orderDocData = null;
  let _orderDocName = '';
  let _orderDocSize = 0;
  let _orderDocType = '';
  let _editingOrder = null;

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

  // ── Open / Close Sales Order Form ──
  function openSalesOrderForm(orderData) {
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
    if (challanFormCard) challanFormCard.style.display = 'none';
    if (orderFormCard) orderFormCard.style.display = 'block';

    window._currentSalesSubtype = 'Sales Order';
    initSalesOrderForm(orderData);
  }

  function closeSalesOrderForm() {
    const preInvCard = document.getElementById('salesPreInvoiceCard');
    const orderFormCard = document.getElementById('salesOrderFormCard');

    if (orderFormCard) orderFormCard.style.display = 'none';
    if (preInvCard) preInvCard.style.display = 'block';

    _editingOrder = null;
    if (typeof renderSalesPreInvoicePanel === 'function') {
      renderSalesPreInvoicePanel();
    }
  }

  // ── Initialize Sales Order Form ──
  function initSalesOrderForm(orderData) {
    const today = new Date().toISOString().split('T')[0];
    const deliveryDateObj = new Date();
    deliveryDateObj.setDate(deliveryDateObj.getDate() + 30);
    const deliveryDate = deliveryDateObj.toISOString().split('T')[0];

    const dateEl = document.getElementById('orderDate');
    const deliveryEl = document.getElementById('orderDeliveryDate');
    const noEl = document.getElementById('orderNo');
    const chipEl = document.getElementById('orderChipDisplay');
    const notesEl = document.getElementById('orderNotes');
    const supplyTypeEl = document.getElementById('orderSupplyType');
    const dueEl = document.getElementById('orderDueDate');

    if (orderData) {
      _editingOrder = orderData;
      if (dateEl) dateEl.value = orderData.date || today;
      if (deliveryEl) deliveryEl.value = orderData.deliveryDate || orderData.expiryDate || deliveryDate;
      if (dueEl) dueEl.value = orderData.dueDate || orderData.deliveryDate || deliveryDate;
      if (noEl) noEl.value = orderData.orderNo || '';
      if (chipEl) chipEl.textContent = orderData.orderNo || 'SO-2026-001';
      if (notesEl) notesEl.value = orderData.notes || '';
      if (supplyTypeEl && orderData.supplyType) supplyTypeEl.value = orderData.supplyType;

      orderRows = Array.isArray(orderData.rows) ? JSON.parse(JSON.stringify(orderData.rows)) : [];
      if (orderRows.length === 0) {
        orderRows = [{ item: '', hsn: '', qty: 1, unit: '', rate: 0, discount: 0, discountType: 'val', tax: 18, amount: 0 }];
      }

      // Populate customer
      populateOrderCustomers();
      if (orderData.customerId) {
        selectOrderCustomer(orderData.customerId);
      }

      // Populate executive
      populateOrderExecutives(orderData.salesExecutiveId);

      // Adjustments
      const adjEl = document.getElementById('orderAdjustments');
      if (adjEl) adjEl.value = orderData.adjustments || '';

      // TDS / TCS
      const noneBtn = document.getElementById('orderTdsTcsNone');
      const tdsBtn = document.getElementById('orderTdsTcsTds');
      const tcsBtn = document.getElementById('orderTdsTcsTcs');
      if (orderData.tdsTcsMode === 'TDS' && tdsBtn) tdsBtn.click();
      else if (orderData.tdsTcsMode === 'TCS' && tcsBtn) tcsBtn.click();
      else if (noneBtn) noneBtn.click();

      const rateSelect = document.getElementById('orderTdsTcsRateSelect');
      const customInput = document.getElementById('orderTdsTcsRateCustom');
      const customWrap = document.getElementById('orderTdsTcsRateCustomWrap');
      const rateVal = orderData.tdsTcsRate || 0;
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

      const amtInput = document.getElementById('orderTdsTcsAmount');
      if (amtInput && orderData.tdsTcsAmount !== undefined) {
        amtInput.value = orderData.tdsTcsAmount;
      }

      // Payment Status
      const notPaidBtn = document.getElementById('orderPaymentStatusNotPaid');
      const fullBtn = document.getElementById('orderPaymentStatusFull');
      const partBtn = document.getElementById('orderPaymentStatusPartial');
      if (orderData.paymentStatus === 'Full Payment') {
        if (fullBtn) fullBtn.click();
      } else if (orderData.paymentStatus === 'Partial Payment') {
        if (partBtn) partBtn.click();
      } else {
        if (notPaidBtn) notPaidBtn.click();
      }

      populateOrderPaymentAccounts(orderData.paymentAccountId);
      const payAmtEl = document.getElementById('orderPaymentAmount');
      if (payAmtEl && orderData.paymentAmount !== undefined) {
        payAmtEl.value = orderData.paymentAmount || '';
      }

      // Doc attachment
      updateOrderDocUI(orderData.document || null);
    } else {
      _editingOrder = null;
      if (dateEl) dateEl.value = today;
      if (deliveryEl) deliveryEl.value = deliveryDate;
      if (dueEl) dueEl.value = deliveryDate;

      // Generate next order number
      const nextNum = getNextOrderNumber();
      if (noEl) noEl.value = nextNum;
      if (chipEl) chipEl.textContent = nextNum;
      if (notesEl) notesEl.value = '';
      if (supplyTypeEl) supplyTypeEl.value = 'Intra-State (CGST + SGST)';

      orderRows = [{ item: '', hsn: '', qty: 1, unit: '', rate: 0, discount: 0, discountType: 'val', tax: 18, amount: 0 }];

      populateOrderCustomers();
      populateOrderExecutives();

      const adjEl = document.getElementById('orderAdjustments');
      if (adjEl) adjEl.value = '';

      const noneBtn = document.getElementById('orderTdsTcsNone');
      if (noneBtn) noneBtn.click();

      const notPaidBtn = document.getElementById('orderPaymentStatusNotPaid');
      if (notPaidBtn) notPaidBtn.click();
      populateOrderPaymentAccounts();

      const payAmtEl = document.getElementById('orderPaymentAmount');
      if (payAmtEl) payAmtEl.value = '';

      updateOrderDocUI(null);
    }

    updateOrderDueDateHelper();
    renderOrderRows();
    recalculateOrderTotals();
  }

  function getNextOrderNumber() {
    window.KYA_STORE = window.KYA_STORE || {};
    const list = (window.KYA_STORE.salesOrders || []).concat(window.KYA_STORE.salesOrdersDrafts || []);
    const count = list.length + 1;
    const year = new Date().getFullYear();
    const pad = count < 10 ? '00' + count : (count < 100 ? '0' + count : count);
    return `SO-${year}-${pad}`;
  }

  // ── Due / Delivery Date Helper ──
  function updateOrderDueDateHelper() {
    const dateEl = document.getElementById('orderDate');
    const dueEl = document.getElementById('orderDueDate') || document.getElementById('orderDeliveryDate');
    const daysEl = document.getElementById('orderDueDateDays');
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
  function populateOrderPaymentAccounts(selectedId = null) {
    const paySelect = document.getElementById('orderPaymentAccount');
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

  function getOrderPaymentStatus() {
    const fullBtn = document.getElementById('orderPaymentStatusFull');
    const partBtn = document.getElementById('orderPaymentStatusPartial');

    if (fullBtn && fullBtn.classList.contains('active')) return 'Full Payment';
    if (partBtn && partBtn.classList.contains('active')) return 'Partial Payment';
    return 'Not Paid';
  }

  // ── Customer Search & Selection ──
  function populateOrderCustomers(filter) {
    const custs = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
    const optionsList = document.getElementById('orderCustomerSelectOptionsList');
    const selectEl = document.getElementById('orderCustomer');
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
        selectOrderCustomer(c.id);
        const dropdown = document.getElementById('orderCustomerSelectDropdown');
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

  function selectOrderCustomer(customerId) {
    const custs = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
    const cust = custs.find(c => String(c.id) === String(customerId));
    const triggerText = document.getElementById('orderCustomerSelectTriggerText');
    const selectEl = document.getElementById('orderCustomer');

    if (selectEl) selectEl.value = customerId || '';
    if (triggerText) {
      triggerText.textContent = cust ? cust.name : '— Select Customer —';
      triggerText.style.color = cust ? 'var(--slate-800)' : 'var(--slate-500)';
      triggerText.style.fontWeight = cust ? '600' : '500';
    }

    if (cust && cust.state) {
      const isInterstate = isOrderInterstate(cust.state);
      const supplyTypeEl = document.getElementById('orderSupplyType');
      if (supplyTypeEl) {
        supplyTypeEl.value = isInterstate ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)';
      }
    }
  }

  function isOrderInterstate(partyState) {
    if (!partyState) return false;
    const companyProfile = (typeof getKyaCompanyProfile === 'function') ? getKyaCompanyProfile() : {};
    const companyState = companyProfile.state || 'Kerala';
    return partyState.trim().toLowerCase() !== companyState.trim().toLowerCase();
  }

  function populateOrderExecutives(selectedId) {
    const execEl = document.getElementById('orderSalesExecutive');
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
  function renderOrderRows() {
    const body = document.getElementById('orderItemBody');
    if (!body) return;

    body.innerHTML = '';

    orderRows.forEach((row, index) => {
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
            <button type="button" class="sales-del-row order-del-row" style="background: none; border: none !important; outline: none !important; box-shadow: none !important; color: var(--red-600); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; margin: 0 auto; transition: background 0.15s;" onmouseover="this.style.backgroundColor='var(--red-50)'" onmouseout="this.style.backgroundColor='transparent'">
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
            orderRows[index].item = selectedItem.name;
            orderRows[index].itemType = selectedItem.type;
            if (selectedItem.type === 'Service' && selectedItem.id) {
              orderRows[index].revenueLedgerId = selectedItem.id;
            }
            recalculateOrderTotals();
          });
        };

        itemInp.addEventListener('focus', attachPortal);
        itemInp.addEventListener('click', attachPortal);
        itemInp.addEventListener('input', () => {
          orderRows[index].item = itemInp.value;
          attachPortal();
        });
      }
    });
  }

  function addOrderRow() {
    orderRows.push({ item: '', hsn: '', qty: 1, unit: '', rate: 0, discount: 0, discountType: 'val', tax: 18, amount: 0 });
    renderOrderRows();
    recalculateOrderTotals();
  }

  function updateOrderRowFromDOM(index, tr, triggeredBy) {
    const row = orderRows[index];
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

    recalculateOrderTotals();
  }

  // ── Calculation & Totals ──
  function calculateOrderSubtotal() {
    if (!Array.isArray(orderRows)) return 0;
    let sub = 0;
    orderRows.forEach(r => {
      sub += (parseFloat(r.amount) || 0);
    });
    return Math.round(sub * 100) / 100;
  }

  function recalculateOrderTotals() {
    const subTotal = calculateOrderSubtotal();
    const subTotalEl = document.getElementById('orderSubTotal');
    if (subTotalEl) subTotalEl.textContent = '₹ ' + safeFmtNum(subTotal);

    let tdsTcsMode = 'None';
    const tdsBtn = document.getElementById('orderTdsTcsTds');
    const tcsBtn = document.getElementById('orderTdsTcsTcs');
    if (tdsBtn && tdsBtn.classList.contains('active')) tdsTcsMode = 'TDS';
    if (tcsBtn && tcsBtn.classList.contains('active')) tdsTcsMode = 'TCS';

    const rateSelect = document.getElementById('orderTdsTcsRateSelect');
    const customWrap = document.getElementById('orderTdsTcsRateCustomWrap');
    let rate = 0;

    if (tdsTcsMode === 'None') {
      rate = 0;
    } else if (rateSelect) {
      if (rateSelect.value === 'custom') {
        if (customWrap) customWrap.style.display = 'flex';
        const customInput = document.getElementById('orderTdsTcsRateCustom');
        rate = customInput ? (parseFloat(customInput.value) || 0) : 0;
      } else {
        if (customWrap) customWrap.style.display = 'none';
        rate = parseFloat(rateSelect.value) || 0;
      }
    }

    const amountInput = document.getElementById('orderTdsTcsAmount');
    if (amountInput && document.activeElement !== amountInput) {
      if (tdsTcsMode !== 'None') {
        const calculatedAmt = subTotal * (rate / 100);
        amountInput.value = calculatedAmt.toFixed(2);
      } else {
        amountInput.value = '';
      }
    }

    const tdsTcsAmount = amountInput ? (parseFloat(amountInput.value) || 0) : 0;
    const adjustmentsInput = document.getElementById('orderAdjustments');
    const adjustments = adjustmentsInput ? (parseFloat(adjustmentsInput.value) || 0) : 0;

    const btnAuto = document.getElementById('btnOrderAutoRoundOff');
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

    const totalEl = document.getElementById('orderTotal');
    if (totalEl) totalEl.textContent = '₹ ' + safeFmtNum(total);

    // Adjust Payment Amount if in Full payment or exceeds Grand Total
    const fullBtn = document.getElementById('orderPaymentStatusFull');
    const payAmtEl = document.getElementById('orderPaymentAmount');
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

  function autoCalculateOrderRoundOff() {
    const btnAuto = document.getElementById('btnOrderAutoRoundOff');
    const adjEl = document.getElementById('orderAdjustments');

    if (btnAuto && btnAuto.classList.contains('active') && adjEl && adjEl.value.trim() !== '') {
      adjEl.value = '';
      btnAuto.classList.remove('active');
      recalculateOrderTotals();
      return;
    }

    const subTotal = calculateOrderSubtotal();
    let tdsTcsMode = 'None';
    const tdsBtn = document.getElementById('orderTdsTcsTds');
    const tcsBtn = document.getElementById('orderTdsTcsTcs');
    if (tdsBtn && tdsBtn.classList.contains('active')) tdsTcsMode = 'TDS';
    if (tcsBtn && tcsBtn.classList.contains('active')) tdsTcsMode = 'TCS';

    const amountInput = document.getElementById('orderTdsTcsAmount');
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

    recalculateOrderTotals();
  }

  // ── Document Upload Handling ──
  function updateOrderDocUI(docData) {
    const emptyState = document.getElementById('orderDocEmptyState');
    const selectedState = document.getElementById('orderDocSelectedState');
    const statusBadge = document.getElementById('orderDocStatusBadge');
    const fileNameEl = document.getElementById('orderDocFileName');
    const fileSizeEl = document.getElementById('orderDocFileSize');
    const fileIconEl = document.getElementById('orderDocFileIcon');
    const previewBtn = document.getElementById('orderDocPreviewBtn');
    const fileInput = document.getElementById('orderDocFileInput');

    if (!docData) {
      _orderDocData = null;
      _orderDocName = '';
      _orderDocSize = 0;
      _orderDocType = '';
      if (emptyState) emptyState.style.display = 'flex';
      if (selectedState) selectedState.style.display = 'none';
      if (statusBadge) statusBadge.style.display = 'none';
      if (fileInput) fileInput.value = '';
      return;
    }

    _orderDocData = docData.data;
    _orderDocName = docData.name || 'Document';
    _orderDocSize = docData.size || 0;
    _orderDocType = docData.type || '';

    if (emptyState) emptyState.style.display = 'none';
    if (selectedState) selectedState.style.display = 'flex';
    if (statusBadge) statusBadge.style.display = 'inline-block';

    if (fileNameEl) fileNameEl.textContent = _orderDocName;
    if (fileSizeEl) fileSizeEl.textContent = formatOrderFileSize(_orderDocSize);

    const ext = (_orderDocName.split('.').pop() || 'DOC').toUpperCase().slice(0, 4);
    if (fileIconEl) fileIconEl.textContent = ext;

    if (previewBtn) {
      previewBtn.href = _orderDocData;
      previewBtn.download = _orderDocName;
    }
  }

  function formatOrderFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function handleOrderFileUpload(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('File size exceeds maximum limit of 10MB.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      updateOrderDocUI({
        name: file.name,
        size: file.size,
        type: file.type,
        data: e.target.result
      });
      showToast('Document attached successfully.', 'success');
    };
    reader.readAsDataURL(file);
  }

  // ── Save / Post Sales Order ──
  function getOrderFormData() {
    const date = document.getElementById('orderDate')?.value || new Date().toISOString().split('T')[0];
    const deliveryDate = document.getElementById('orderDeliveryDate')?.value || '';
    const dueDate = document.getElementById('orderDueDate')?.value || deliveryDate;
    const orderNo = document.getElementById('orderNo')?.value?.trim() || getNextOrderNumber();
    const customerId = document.getElementById('orderCustomer')?.value || '';
    const custs = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
    const cust = custs.find(c => String(c.id) === String(customerId));
    const customerName = cust ? cust.name : '';

    const supplyType = document.getElementById('orderSupplyType')?.value || 'Intra-State (CGST + SGST)';
    const salesExecutiveId = document.getElementById('orderSalesExecutive')?.value || '';
    let salesExecutiveName = '';
    if (typeof ohEmployees !== 'undefined' && Array.isArray(ohEmployees)) {
      const emp = ohEmployees.find(e => String(e.id) === String(salesExecutiveId));
      if (emp) salesExecutiveName = emp.name;
    }
    if (!salesExecutiveName && typeof coaLedgers !== 'undefined') {
      const exec = coaLedgers.find(l => String(l.id) === String(salesExecutiveId));
      if (exec) salesExecutiveName = exec.name;
    }

    const notes = document.getElementById('orderNotes')?.value || '';
    const subTotal = calculateOrderSubtotal();

    let tdsTcsMode = 'None';
    const tdsBtn = document.getElementById('orderTdsTcsTds');
    const tcsBtn = document.getElementById('orderTdsTcsTcs');
    if (tdsBtn && tdsBtn.classList.contains('active')) tdsTcsMode = 'TDS';
    if (tcsBtn && tcsBtn.classList.contains('active')) tdsTcsMode = 'TCS';

    const rateSelect = document.getElementById('orderTdsTcsRateSelect');
    let tdsTcsRate = 0;
    if (tdsTcsMode !== 'None' && rateSelect) {
      if (rateSelect.value === 'custom') {
        const customInput = document.getElementById('orderTdsTcsRateCustom');
        tdsTcsRate = customInput ? (parseFloat(customInput.value) || 0) : 0;
      } else {
        tdsTcsRate = parseFloat(rateSelect.value) || 0;
      }
    }

    const amtInput = document.getElementById('orderTdsTcsAmount');
    const tdsTcsAmount = amtInput ? (parseFloat(amtInput.value) || 0) : 0;
    const adjustmentsInput = document.getElementById('orderAdjustments');
    const adjustments = adjustmentsInput ? (parseFloat(adjustmentsInput.value) || 0) : 0;

    let total = subTotal;
    if (tdsTcsMode === 'TDS') total = subTotal - tdsTcsAmount;
    else if (tdsTcsMode === 'TCS') total = subTotal + tdsTcsAmount;
    total += adjustments;

    const paymentStatus = getOrderPaymentStatus();
    const paymentAccountId = document.getElementById('orderPaymentAccount')?.value || '';
    let paymentAccountName = '';
    if (paymentAccountId && typeof coaLedgers !== 'undefined') {
      const acc = coaLedgers.find(l => String(l.id) === String(paymentAccountId));
      if (acc) paymentAccountName = acc.name;
    }
    const paymentAmount = paymentStatus === 'Full Payment' ? total : (parseFloat(document.getElementById('orderPaymentAmount')?.value) || 0);

    return {
      id: _editingOrder ? _editingOrder.id : Date.now(),
      orderNo,
      date,
      deliveryDate,
      expiryDate: deliveryDate,
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
      rows: JSON.parse(JSON.stringify(orderRows)),
      subTotal,
      tdsTcsMode,
      tdsTcsRate,
      tdsTcsAmount,
      adjustments,
      total,
      notes,
      document: _orderDocData ? {
        name: _orderDocName,
        size: _orderDocSize,
        type: _orderDocType,
        data: _orderDocData
      } : null,
      createdAt: _editingOrder ? _editingOrder.createdAt : Date.now(),
      status: 'Active'
    };
  }

  function saveSalesOrder(isDraft) {
    const data = getOrderFormData();

    if (!data.customerId) {
      showToast('Please select a Customer for the sales order.', 'warning');
      return;
    }

    const validRows = data.rows.filter(r => (r.item && r.item.trim()) || (r.amount && r.amount > 0));
    if (validRows.length === 0) {
      showToast('Please add at least one line item to the sales order.', 'warning');
      return;
    }

    if (data.paymentStatus !== 'Not Paid' && !data.paymentAccountId) {
      showToast('Please select a Payment Account.', 'warning');
      return;
    }

    window.KYA_STORE.salesOrders = window.KYA_STORE.salesOrders || [];
    window.KYA_STORE.salesOrdersDrafts = window.KYA_STORE.salesOrdersDrafts || [];

    if (isDraft) {
      data.status = 'Draft';
      const existingIdx = window.KYA_STORE.salesOrdersDrafts.findIndex(q => q.id === data.id);
      if (existingIdx >= 0) {
        window.KYA_STORE.salesOrdersDrafts[existingIdx] = data;
      } else {
        window.KYA_STORE.salesOrdersDrafts.unshift(data);
      }
      showToast(`Sales order draft ${data.orderNo} saved successfully.`, 'success');
    } else {
      data.status = 'Active';
      const existingIdx = window.KYA_STORE.salesOrders.findIndex(q => q.id === data.id);
      if (existingIdx >= 0) {
        window.KYA_STORE.salesOrders[existingIdx] = data;
      } else {
        window.KYA_STORE.salesOrders.unshift(data);
      }

      // Remove from drafts if existed
      window.KYA_STORE.salesOrdersDrafts = window.KYA_STORE.salesOrdersDrafts.filter(d => d.id !== data.id);

      showToast(`Sales Order ${data.orderNo} saved successfully!`, 'success');
    }

    if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
    closeSalesOrderForm();
  }

  // ── Setup Event Listeners ──
  function setupOrderEventListeners() {
    // Back button
    const backBtn = document.getElementById('btnOrderBack');
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeSalesOrderForm();
      });
    }

    // Nav sub-module buttons (Quotation, Proforma Invoice, Delivery Challan)
    const quoteNavBtn = document.getElementById('btnOrderNavQuotation');
    if (quoteNavBtn) {
      quoteNavBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeSalesOrderForm();
        if (typeof openQuotationForm === 'function') {
          openQuotationForm();
        }
      });
    }

    const proformaNavBtn = document.getElementById('btnOrderNavProforma');
    if (proformaNavBtn) {
      proformaNavBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeSalesOrderForm();
        if (typeof openProformaForm === 'function') {
          openProformaForm();
        }
      });
    }

    const deliveryChallanNavBtn = document.getElementById('btnOrderNavDeliveryChallan');
    if (deliveryChallanNavBtn) {
      deliveryChallanNavBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeSalesOrderForm();
        if (typeof openDeliveryChallanForm === 'function') {
          openDeliveryChallanForm();
        } else if (typeof switchSalesPreInvTab === 'function') {
          switchSalesPreInvTab('deliverychallan');
        }
      });
    }

    // Chip sync
    const orderNoEl = document.getElementById('orderNo');
    const chipEl = document.getElementById('orderChipDisplay');
    if (orderNoEl && chipEl) {
      orderNoEl.addEventListener('input', () => {
        chipEl.textContent = orderNoEl.value.trim() || 'SO-2026-001';
      });
    }

    // Due / Delivery Date helpers
    const dateEl = document.getElementById('orderDate');
    const dueEl = document.getElementById('orderDueDate');
    const deliveryEl = document.getElementById('orderDeliveryDate');

    if (dateEl) {
      dateEl.addEventListener('change', updateOrderDueDateHelper);
      dateEl.addEventListener('input', updateOrderDueDateHelper);
    }
    if (dueEl) {
      dueEl.addEventListener('change', updateOrderDueDateHelper);
      dueEl.addEventListener('input', updateOrderDueDateHelper);
    }
    if (deliveryEl) {
      deliveryEl.addEventListener('change', () => {
        if (dueEl && !dueEl.value) dueEl.value = deliveryEl.value;
        updateOrderDueDateHelper();
      });
      deliveryEl.addEventListener('input', () => {
        if (dueEl && !dueEl.value) dueEl.value = deliveryEl.value;
        updateOrderDueDateHelper();
      });
    }

    // Payment Status Buttons
    const payNotPaidBtn = document.getElementById('orderPaymentStatusNotPaid');
    const payFullBtn = document.getElementById('orderPaymentStatusFull');
    const payPartialBtn = document.getElementById('orderPaymentStatusPartial');
    const payBg = document.getElementById('orderPaymentStatusBg');
    const payAccField = document.getElementById('orderPaymentAccountField');
    const payAmtField = document.getElementById('orderPaymentAmountField');
    const payDueDateField = document.getElementById('orderDueDateField');

    if (payNotPaidBtn && payFullBtn && payPartialBtn && payBg && payAccField && payAmtField) {
      payNotPaidBtn.addEventListener('click', () => {
        payNotPaidBtn.classList.add('active');
        payFullBtn.classList.remove('active');
        payPartialBtn.classList.remove('active');
        payBg.className = 'sales-paystatus-bg notpaid-active';
        payAccField.style.display = 'none';
        payAmtField.style.display = 'none';
        if (payDueDateField) payDueDateField.style.display = 'flex';
        const wrapper = document.getElementById('orderDueDateWrapper');
        if (wrapper) {
          wrapper.style.flexDirection = 'row';
          wrapper.style.alignItems = 'center';
        }
        updateOrderDueDateHelper();
        recalculateOrderTotals();
      });

      payFullBtn.addEventListener('click', () => {
        payFullBtn.classList.add('active');
        payNotPaidBtn.classList.remove('active');
        payPartialBtn.classList.remove('active');
        payBg.className = 'sales-paystatus-bg fullpaid-active';
        payAccField.style.display = 'flex';
        payAmtField.style.display = 'none';
        if (payDueDateField) payDueDateField.style.display = 'none';
        populateOrderPaymentAccounts();
        recalculateOrderTotals();
      });

      payPartialBtn.addEventListener('click', () => {
        payPartialBtn.classList.add('active');
        payNotPaidBtn.classList.remove('active');
        payFullBtn.classList.remove('active');
        payBg.className = 'sales-paystatus-bg partpaid-active';
        payAccField.style.display = 'flex';
        payAmtField.style.display = 'flex';
        if (payDueDateField) payDueDateField.style.display = 'flex';
        const wrapper = document.getElementById('orderDueDateWrapper');
        if (wrapper) {
          wrapper.style.flexDirection = 'column';
          wrapper.style.alignItems = 'flex-start';
          wrapper.style.gap = '4px';
        }
        updateOrderDueDateHelper();
        populateOrderPaymentAccounts();
        recalculateOrderTotals();
      });
    }

    const payAccEl = document.getElementById('orderPaymentAccount');
    if (payAccEl) {
      payAccEl.addEventListener('focus', () => {
        populateOrderPaymentAccounts(payAccEl.value);
      });
    }

    const payAmtEl = document.getElementById('orderPaymentAmount');
    if (payAmtEl) {
      payAmtEl.addEventListener('input', () => {
        recalculateOrderTotals();
      });
    }

    // Customer Searchable Select
    const custTrigger = document.getElementById('orderCustomerSelectTrigger');
    const custDropdown = document.getElementById('orderCustomerSelectDropdown');
    const custSearch = document.getElementById('orderCustomerSelectSearch');

    if (custTrigger && custDropdown && custSearch) {
      custTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = custDropdown.style.display === 'flex';
        if (isOpen) {
          custDropdown.style.display = 'none';
        } else {
          custDropdown.style.display = 'flex';
          custSearch.value = '';
          populateOrderCustomers();
          setTimeout(() => custSearch.focus(), 50);
        }
      });

      custSearch.addEventListener('input', () => {
        populateOrderCustomers(custSearch.value);
      });

      custSearch.addEventListener('click', (e) => e.stopPropagation());

      document.addEventListener('click', (e) => {
        if (!custTrigger.contains(e.target) && !custDropdown.contains(e.target)) {
          custDropdown.style.display = 'none';
        }
      });
    }

    // Add Row
    const addRowBtn = document.getElementById('orderAddRow');
    if (addRowBtn) {
      addRowBtn.addEventListener('click', () => {
        addOrderRow();
      });
    }

    // Line items input / change / delete delegation
    const orderBody = document.getElementById('orderItemBody');
    if (orderBody) {
      orderBody.addEventListener('input', (e) => {
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
        updateOrderRowFromDOM(index, tr, triggeredBy);
      });

      orderBody.addEventListener('change', (e) => {
        const tr = e.target.closest('tr');
        if (!tr) return;
        const index = parseInt(tr.dataset.rowIndex);
        updateOrderRowFromDOM(index, tr, 'rate');
      });

      orderBody.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.order-del-row');
        if (delBtn) {
          const tr = delBtn.closest('tr');
          if (tr) {
            const index = parseInt(tr.dataset.rowIndex);
            if (!isNaN(index)) {
              if (orderRows.length > 1) {
                orderRows.splice(index, 1);
              } else {
                orderRows = [{ item: '', hsn: '', qty: 1, unit: '', rate: 0, discount: 0, discountType: 'val', tax: 18, amount: 0 }];
              }
              renderOrderRows();
              recalculateOrderTotals();
            }
          }
        }
      });
    }

    // TDS / TCS Switcher
    const noneBtn = document.getElementById('orderTdsTcsNone');
    const tdsBtn = document.getElementById('orderTdsTcsTds');
    const tcsBtn = document.getElementById('orderTdsTcsTcs');
    const bg = document.getElementById('orderTdsTcsBg');
    const amountRow = document.getElementById('orderTdsTcsAmountRow');
    const amountLabel = document.getElementById('orderTdsTcsAmountLabel');
    const rateSelect = document.getElementById('orderTdsTcsRateSelect');
    const customInput = document.getElementById('orderTdsTcsRateCustom');
    const customWrap = document.getElementById('orderTdsTcsRateCustomWrap');
    const amountInput = document.getElementById('orderTdsTcsAmount');
    const adjustmentsInput = document.getElementById('orderAdjustments');
    const btnAutoRoundOff = document.getElementById('btnOrderAutoRoundOff');

    if (noneBtn) {
      noneBtn.addEventListener('click', () => {
        noneBtn.classList.add('active');
        if (tdsBtn) tdsBtn.classList.remove('active');
        if (tcsBtn) tcsBtn.classList.remove('active');
        if (bg) bg.className = 'sales-tdstcs-bg none-active';
        if (amountRow) amountRow.style.display = 'none';
        if (amountInput) amountInput.value = '';
        recalculateOrderTotals();
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
        recalculateOrderTotals();
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
        recalculateOrderTotals();
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
        recalculateOrderTotals();
      });
    }

    if (customInput) {
      customInput.addEventListener('input', () => {
        recalculateOrderTotals();
      });
    }

    if (amountInput) {
      amountInput.addEventListener('input', () => {
        recalculateOrderTotals();
      });
    }

    if (adjustmentsInput) {
      adjustmentsInput.addEventListener('input', () => {
        recalculateOrderTotals();
      });
    }

    if (btnAutoRoundOff) {
      btnAutoRoundOff.addEventListener('click', (e) => {
        e.preventDefault();
        autoCalculateOrderRoundOff();
      });
    }

    // Document Attachment
    const dropzone = document.getElementById('orderDocDropzone');
    const fileInput = document.getElementById('orderDocFileInput');
    const removeBtn = document.getElementById('orderDocRemoveBtn');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', (e) => {
        if (e.target.closest('#orderDocRemoveBtn') || e.target.closest('#orderDocPreviewBtn')) return;
        fileInput.click();
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleOrderFileUpload(e.target.files[0]);
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
          handleOrderFileUpload(e.dataTransfer.files[0]);
        }
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateOrderDocUI(null);
        showToast('Document attachment removed.', 'info');
      });
    }

    // Action buttons
    const clearBtn = document.getElementById('btnClearOrder');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        initSalesOrderForm(_editingOrder);
      });
    }

    const saveDraftBtn = document.getElementById('btnSaveOrderDraft');
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener('click', () => {
        saveSalesOrder(true);
      });
    }

    const saveBtn = document.getElementById('btnSaveOrder');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        saveSalesOrder(false);
      });
    }
  }

  // ── Global Exports ──
  window.openSalesOrderForm = openSalesOrderForm;
  window.closeSalesOrderForm = closeSalesOrderForm;
  window.initSalesOrderForm = initSalesOrderForm;
  window.renderOrderRows = renderOrderRows;
  window.addOrderRow = addOrderRow;
  window.recalculateOrderTotals = recalculateOrderTotals;
  window.saveSalesOrder = saveSalesOrder;

  // Init on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupOrderEventListeners);
  } else {
    setupOrderEventListeners();
  }
})();
