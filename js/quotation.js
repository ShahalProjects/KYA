/**
 * js/quotation.js
 * Quotation / Estimate module for Pre Invoice
 */
(function() {
  'use strict';

  let quoteRows = [];
  let _quoteDocData = null;
  let _quoteDocName = '';
  let _quoteDocSize = 0;
  let _quoteDocType = '';
  let _editingQuote = null;

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

  // ── Open / Close Quotation Form ──
  function openQuotationForm(quoteData) {
    const preInvCard = document.getElementById('salesPreInvoiceCard');
    const salesFormCard = document.getElementById('salesVoucherFormCard');
    const quoteFormCard = document.getElementById('salesQuotationFormCard');
    const proformaFormCard = document.getElementById('salesProformaFormCard');
    const orderFormCard = document.getElementById('salesOrderFormCard');
    const challanFormCard = document.getElementById('salesDeliveryChallanFormCard');

    if (preInvCard) preInvCard.style.display = 'none';
    if (salesFormCard) salesFormCard.style.display = 'none';
    if (proformaFormCard) proformaFormCard.style.display = 'none';
    if (orderFormCard) orderFormCard.style.display = 'none';
    if (challanFormCard) challanFormCard.style.display = 'none';
    if (quoteFormCard) quoteFormCard.style.display = 'block';

    window._currentSalesSubtype = 'Quotation';
    initQuotationForm(quoteData);
  }

  function closeQuotationForm() {
    const preInvCard = document.getElementById('salesPreInvoiceCard');
    const quoteFormCard = document.getElementById('salesQuotationFormCard');

    if (quoteFormCard) quoteFormCard.style.display = 'none';
    if (preInvCard) preInvCard.style.display = 'block';

    _editingQuote = null;
    if (typeof renderSalesPreInvoicePanel === 'function') {
      renderSalesPreInvoicePanel();
    }
  }

  // ── Initialize Quotation Form ──
  function initQuotationForm(quoteData) {
    const today = new Date().toISOString().split('T')[0];
    const expiryDateObj = new Date();
    expiryDateObj.setDate(expiryDateObj.getDate() + 30);
    const expiryDate = expiryDateObj.toISOString().split('T')[0];

    const dateEl = document.getElementById('quoteDate');
    const expiryEl = document.getElementById('quoteExpiryDate');
    const noEl = document.getElementById('quoteNo');
    const chipEl = document.getElementById('quoteChipDisplay');
    const notesEl = document.getElementById('quoteNotes');
    const supplyTypeEl = document.getElementById('quoteSupplyType');

    if (quoteData) {
      _editingQuote = quoteData;
      if (dateEl) dateEl.value = quoteData.date || today;
      if (expiryEl) expiryEl.value = quoteData.expiryDate || expiryDate;
      if (noEl) noEl.value = quoteData.quoteNo || '';
      if (chipEl) chipEl.textContent = quoteData.quoteNo || 'QT-2026-001';
      if (notesEl) notesEl.value = quoteData.notes || '';
      if (supplyTypeEl && quoteData.supplyType) supplyTypeEl.value = quoteData.supplyType;

      quoteRows = Array.isArray(quoteData.rows) ? JSON.parse(JSON.stringify(quoteData.rows)) : [];
      if (quoteRows.length === 0) {
        quoteRows = [{ item: '', hsn: '', qty: 1, unit: '', rate: 0, discount: 0, discountType: 'val', tax: 18, amount: 0 }];
      }

      // Populate customer
      populateQuoteCustomers();
      if (quoteData.customerId) {
        selectQuoteCustomer(quoteData.customerId);
      }

      // Populate executive
      populateQuoteExecutives(quoteData.salesExecutiveId);

      // Adjustments
      const adjEl = document.getElementById('quoteAdjustments');
      if (adjEl) adjEl.value = quoteData.adjustments || '';

      // TDS / TCS
      const noneBtn = document.getElementById('quoteTdsTcsNone');
      const tdsBtn = document.getElementById('quoteTdsTcsTds');
      const tcsBtn = document.getElementById('quoteTdsTcsTcs');
      if (quoteData.tdsTcsMode === 'TDS' && tdsBtn) tdsBtn.click();
      else if (quoteData.tdsTcsMode === 'TCS' && tcsBtn) tcsBtn.click();
      else if (noneBtn) noneBtn.click();

      const rateSelect = document.getElementById('quoteTdsTcsRateSelect');
      const customInput = document.getElementById('quoteTdsTcsRateCustom');
      const customWrap = document.getElementById('quoteTdsTcsRateCustomWrap');
      const rateVal = quoteData.tdsTcsRate || 0;
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

      const amtInput = document.getElementById('quoteTdsTcsAmount');
      if (amtInput && quoteData.tdsTcsAmount !== undefined) {
        amtInput.value = quoteData.tdsTcsAmount;
      }

      // Doc attachment
      updateQuoteDocUI(quoteData.document || null);
    } else {
      _editingQuote = null;
      if (dateEl) dateEl.value = today;
      if (expiryEl) expiryEl.value = expiryDate;

      // Generate next quote number
      const nextNum = getNextQuoteNumber();
      if (noEl) noEl.value = nextNum;
      if (chipEl) chipEl.textContent = nextNum;
      if (notesEl) notesEl.value = '';
      if (supplyTypeEl) supplyTypeEl.value = 'Intra-State (CGST + SGST)';

      quoteRows = [{ item: '', hsn: '', qty: 1, unit: '', rate: 0, discount: 0, discountType: 'val', tax: 18, amount: 0 }];

      populateQuoteCustomers();
      populateQuoteExecutives();

      const adjEl = document.getElementById('quoteAdjustments');
      if (adjEl) adjEl.value = '';

      const noneBtn = document.getElementById('quoteTdsTcsNone');
      if (noneBtn) noneBtn.click();

      updateQuoteDocUI(null);
    }

    renderQuoteRows();
    recalculateQuoteTotals();
  }

  function getNextQuoteNumber() {
    const list = window.KYA_STORE.quotations || [];
    const count = list.length + 1;
    const year = new Date().getFullYear();
    const pad = count < 10 ? '00' + count : (count < 100 ? '0' + count : count);
    return `QT-${year}-${pad}`;
  }

  // ── Customer Search & Selection ──
  function populateQuoteCustomers(filter) {
    const custs = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
    const optionsList = document.getElementById('quoteCustomerSelectOptionsList');
    const selectEl = document.getElementById('quoteCustomer');
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
        selectQuoteCustomer(c.id);
        const dropdown = document.getElementById('quoteCustomerSelectDropdown');
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

  function selectQuoteCustomer(customerId) {
    const custs = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
    const cust = custs.find(c => String(c.id) === String(customerId));
    const triggerText = document.getElementById('quoteCustomerSelectTriggerText');
    const selectEl = document.getElementById('quoteCustomer');

    if (selectEl) selectEl.value = customerId || '';
    if (triggerText) {
      triggerText.textContent = cust ? cust.name : '— Select Customer —';
      triggerText.style.color = cust ? 'var(--slate-800)' : 'var(--slate-500)';
      triggerText.style.fontWeight = cust ? '600' : '500';
    }

    if (cust && cust.state) {
      const isInterstate = isQuoteInterstate(cust.state);
      const supplyTypeEl = document.getElementById('quoteSupplyType');
      if (supplyTypeEl) {
        supplyTypeEl.value = isInterstate ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)';
      }
    }
  }

  function isQuoteInterstate(partyState) {
    if (!partyState) return false;
    const companyProfile = (typeof getKyaCompanyProfile === 'function') ? getKyaCompanyProfile() : {};
    const companyState = companyProfile.state || 'Kerala';
    return partyState.trim().toLowerCase() !== companyState.trim().toLowerCase();
  }

  function populateQuoteExecutives(selectedId) {
    const execEl = document.getElementById('quoteSalesExecutive');
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
  function renderQuoteRows() {
    const body = document.getElementById('quoteItemBody');
    if (!body) return;

    body.innerHTML = '';

    quoteRows.forEach((row, index) => {
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
            <button type="button" class="sales-del-row quote-del-row" style="background: none; border: none !important; outline: none !important; box-shadow: none !important; color: var(--red-600); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; margin: 0 auto; transition: background 0.15s;" onmouseover="this.style.backgroundColor='var(--red-50)'" onmouseout="this.style.backgroundColor='transparent'">
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
            quoteRows[index].item = selectedItem.name;
            quoteRows[index].itemType = selectedItem.type;
            if (selectedItem.type === 'Service' && selectedItem.id) {
              quoteRows[index].revenueLedgerId = selectedItem.id;
            }
            recalculateQuoteTotals();
          });
        };

        itemInp.addEventListener('focus', attachPortal);
        itemInp.addEventListener('click', attachPortal);
        itemInp.addEventListener('input', () => {
          quoteRows[index].item = itemInp.value;
          attachPortal();
        });
      }
    });
  }

  function addQuoteRow() {
    quoteRows.push({ item: '', hsn: '', qty: 1, unit: '', rate: 0, discount: 0, discountType: 'val', tax: 18, amount: 0 });
    renderQuoteRows();
    recalculateQuoteTotals();
  }

  function updateQuoteRowFromDOM(index, tr, triggeredBy) {
    const row = quoteRows[index];
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

    recalculateQuoteTotals();
  }

  // ── Calculation & Totals ──
  function calculateQuoteSubtotal() {
    if (!Array.isArray(quoteRows)) return 0;
    let sub = 0;
    quoteRows.forEach(r => {
      sub += (parseFloat(r.amount) || 0);
    });
    return Math.round(sub * 100) / 100;
  }

  function recalculateQuoteTotals() {
    const subTotal = calculateQuoteSubtotal();
    const subTotalEl = document.getElementById('quoteSubTotal');
    if (subTotalEl) subTotalEl.textContent = '₹ ' + safeFmtNum(subTotal);

    let tdsTcsMode = 'None';
    const tdsBtn = document.getElementById('quoteTdsTcsTds');
    const tcsBtn = document.getElementById('quoteTdsTcsTcs');
    if (tdsBtn && tdsBtn.classList.contains('active')) tdsTcsMode = 'TDS';
    if (tcsBtn && tcsBtn.classList.contains('active')) tdsTcsMode = 'TCS';

    const rateSelect = document.getElementById('quoteTdsTcsRateSelect');
    const customWrap = document.getElementById('quoteTdsTcsRateCustomWrap');
    let rate = 0;

    if (tdsTcsMode === 'None') {
      rate = 0;
    } else if (rateSelect) {
      if (rateSelect.value === 'custom') {
        if (customWrap) customWrap.style.display = 'flex';
        const customInput = document.getElementById('quoteTdsTcsRateCustom');
        rate = customInput ? (parseFloat(customInput.value) || 0) : 0;
      } else {
        if (customWrap) customWrap.style.display = 'none';
        rate = parseFloat(rateSelect.value) || 0;
      }
    }

    const amountInput = document.getElementById('quoteTdsTcsAmount');
    if (amountInput && document.activeElement !== amountInput) {
      if (tdsTcsMode !== 'None') {
        const calculatedAmt = subTotal * (rate / 100);
        amountInput.value = calculatedAmt.toFixed(2);
      } else {
        amountInput.value = '';
      }
    }

    const tdsTcsAmount = amountInput ? (parseFloat(amountInput.value) || 0) : 0;
    const adjustmentsInput = document.getElementById('quoteAdjustments');
    const adjustments = adjustmentsInput ? (parseFloat(adjustmentsInput.value) || 0) : 0;

    const btnAuto = document.getElementById('btnQuoteAutoRoundOff');
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

    const totalEl = document.getElementById('quoteTotal');
    if (totalEl) totalEl.textContent = '₹ ' + safeFmtNum(total);
  }

  function autoCalculateQuoteRoundOff() {
    const btnAuto = document.getElementById('btnQuoteAutoRoundOff');
    const adjEl = document.getElementById('quoteAdjustments');

    if (btnAuto && btnAuto.classList.contains('active') && adjEl && adjEl.value.trim() !== '') {
      adjEl.value = '';
      btnAuto.classList.remove('active');
      recalculateQuoteTotals();
      return;
    }

    const subTotal = calculateQuoteSubtotal();
    let tdsTcsMode = 'None';
    const tdsBtn = document.getElementById('quoteTdsTcsTds');
    const tcsBtn = document.getElementById('quoteTdsTcsTcs');
    if (tdsBtn && tdsBtn.classList.contains('active')) tdsTcsMode = 'TDS';
    if (tcsBtn && tcsBtn.classList.contains('active')) tdsTcsMode = 'TCS';

    const amountInput = document.getElementById('quoteTdsTcsAmount');
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

    recalculateQuoteTotals();
  }

  // ── Document Upload Handling ──
  function updateQuoteDocUI(docData) {
    const emptyState = document.getElementById('quoteDocEmptyState');
    const selectedState = document.getElementById('quoteDocSelectedState');
    const statusBadge = document.getElementById('quoteDocStatusBadge');
    const fileNameEl = document.getElementById('quoteDocFileName');
    const fileSizeEl = document.getElementById('quoteDocFileSize');
    const fileIconEl = document.getElementById('quoteDocFileIcon');
    const previewBtn = document.getElementById('quoteDocPreviewBtn');
    const fileInput = document.getElementById('quoteDocFileInput');

    if (!docData) {
      _quoteDocData = null;
      _quoteDocName = '';
      _quoteDocSize = 0;
      _quoteDocType = '';
      if (emptyState) emptyState.style.display = 'flex';
      if (selectedState) selectedState.style.display = 'none';
      if (statusBadge) statusBadge.style.display = 'none';
      if (fileInput) fileInput.value = '';
      return;
    }

    _quoteDocData = docData.data;
    _quoteDocName = docData.name || 'Document';
    _quoteDocSize = docData.size || 0;
    _quoteDocType = docData.type || '';

    if (emptyState) emptyState.style.display = 'none';
    if (selectedState) selectedState.style.display = 'flex';
    if (statusBadge) statusBadge.style.display = 'inline-block';

    if (fileNameEl) fileNameEl.textContent = _quoteDocName;
    if (fileSizeEl) fileSizeEl.textContent = formatQuoteFileSize(_quoteDocSize);

    const ext = (_quoteDocName.split('.').pop() || 'DOC').toUpperCase().slice(0, 4);
    if (fileIconEl) fileIconEl.textContent = ext;

    if (previewBtn) {
      previewBtn.href = _quoteDocData;
      previewBtn.download = _quoteDocName;
    }
  }

  function formatQuoteFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function handleQuoteFileUpload(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('File size exceeds maximum limit of 10MB.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      updateQuoteDocUI({
        name: file.name,
        size: file.size,
        type: file.type,
        data: e.target.result
      });
      showToast('Document attached successfully.', 'success');
    };
    reader.readAsDataURL(file);
  }

  // ── Save / Post Quotation ──
  function getQuotationFormData() {
    const date = document.getElementById('quoteDate')?.value || new Date().toISOString().split('T')[0];
    const expiryDate = document.getElementById('quoteExpiryDate')?.value || '';
    const quoteNo = document.getElementById('quoteNo')?.value?.trim() || getNextQuoteNumber();
    const customerId = document.getElementById('quoteCustomer')?.value || '';
    const custs = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
    const cust = custs.find(c => String(c.id) === String(customerId));
    const customerName = cust ? cust.name : '';

    const supplyType = document.getElementById('quoteSupplyType')?.value || 'Intra-State (CGST + SGST)';
    const salesExecutiveId = document.getElementById('quoteSalesExecutive')?.value || '';
    let salesExecutiveName = '';
    if (typeof ohEmployees !== 'undefined' && Array.isArray(ohEmployees)) {
      const emp = ohEmployees.find(e => String(e.id) === String(salesExecutiveId));
      if (emp) salesExecutiveName = emp.name;
    }
    if (!salesExecutiveName && typeof coaLedgers !== 'undefined') {
      const exec = coaLedgers.find(l => String(l.id) === String(salesExecutiveId));
      if (exec) salesExecutiveName = exec.name;
    }

    const notes = document.getElementById('quoteNotes')?.value || '';
    const subTotal = calculateQuoteSubtotal();

    let tdsTcsMode = 'None';
    const tdsBtn = document.getElementById('quoteTdsTcsTds');
    const tcsBtn = document.getElementById('quoteTdsTcsTcs');
    if (tdsBtn && tdsBtn.classList.contains('active')) tdsTcsMode = 'TDS';
    if (tcsBtn && tcsBtn.classList.contains('active')) tdsTcsMode = 'TCS';

    const rateSelect = document.getElementById('quoteTdsTcsRateSelect');
    let tdsTcsRate = 0;
    if (tdsTcsMode !== 'None' && rateSelect) {
      if (rateSelect.value === 'custom') {
        const customInput = document.getElementById('quoteTdsTcsRateCustom');
        tdsTcsRate = customInput ? (parseFloat(customInput.value) || 0) : 0;
      } else {
        tdsTcsRate = parseFloat(rateSelect.value) || 0;
      }
    }

    const amtInput = document.getElementById('quoteTdsTcsAmount');
    const tdsTcsAmount = amtInput ? (parseFloat(amtInput.value) || 0) : 0;
    const adjustmentsInput = document.getElementById('quoteAdjustments');
    const adjustments = adjustmentsInput ? (parseFloat(adjustmentsInput.value) || 0) : 0;

    let total = subTotal;
    if (tdsTcsMode === 'TDS') total = subTotal - tdsTcsAmount;
    else if (tdsTcsMode === 'TCS') total = subTotal + tdsTcsAmount;
    total += adjustments;

    return {
      id: _editingQuote ? _editingQuote.id : Date.now(),
      quoteNo,
      date,
      expiryDate,
      customerId,
      customerName,
      supplyType,
      salesExecutiveId,
      salesExecutiveName,
      rows: JSON.parse(JSON.stringify(quoteRows)),
      subTotal,
      tdsTcsMode,
      tdsTcsRate,
      tdsTcsAmount,
      adjustments,
      total,
      notes,
      document: _quoteDocData ? {
        name: _quoteDocName,
        size: _quoteDocSize,
        type: _quoteDocType,
        data: _quoteDocData
      } : null,
      createdAt: _editingQuote ? _editingQuote.createdAt : Date.now(),
      status: 'Active'
    };
  }

  function saveQuotation(isDraft) {
    const data = getQuotationFormData();

    if (!data.customerId) {
      showToast('Please select a Customer for the quotation.', 'warning');
      return;
    }

    const validRows = data.rows.filter(r => (r.item && r.item.trim()) || (r.amount && r.amount > 0));
    if (validRows.length === 0) {
      showToast('Please add at least one line item to the quotation.', 'warning');
      return;
    }

    window.KYA_STORE.quotations = window.KYA_STORE.quotations || [];
    window.KYA_STORE.quotationsDrafts = window.KYA_STORE.quotationsDrafts || [];

    if (isDraft) {
      data.status = 'Draft';
      const existingIdx = window.KYA_STORE.quotationsDrafts.findIndex(q => q.id === data.id);
      if (existingIdx >= 0) {
        window.KYA_STORE.quotationsDrafts[existingIdx] = data;
      } else {
        window.KYA_STORE.quotationsDrafts.unshift(data);
      }
      showToast(`Quotation draft ${data.quoteNo} saved successfully.`, 'success');
    } else {
      data.status = 'Active';
      const existingIdx = window.KYA_STORE.quotations.findIndex(q => q.id === data.id);
      if (existingIdx >= 0) {
        window.KYA_STORE.quotations[existingIdx] = data;
      } else {
        window.KYA_STORE.quotations.unshift(data);
      }

      // Remove from drafts if existed
      window.KYA_STORE.quotationsDrafts = window.KYA_STORE.quotationsDrafts.filter(d => d.id !== data.id);

      showToast(`Quotation ${data.quoteNo} saved successfully!`, 'success');
    }

    if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
    closeQuotationForm();
  }

  // ── Setup Event Listeners ──
  function setupQuotationEventListeners() {
    // Back button
    const backBtn = document.getElementById('btnQuotationBack');
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeQuotationForm();
      });
    }

    // Nav sub-module buttons (Proforma, Sales Order, Delivery Challan)
    const proformaNavBtn = document.getElementById('btnQuoteNavProforma');
    if (proformaNavBtn) {
      proformaNavBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeQuotationForm();
        if (typeof openProformaForm === 'function') {
          openProformaForm();
        } else if (typeof switchSalesPreInvTab === 'function') {
          switchSalesPreInvTab('proforma');
        }
      });
    }

    const salesOrderNavBtn = document.getElementById('btnQuoteNavSalesOrder');
    if (salesOrderNavBtn) {
      salesOrderNavBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeQuotationForm();
        if (typeof openSalesOrderForm === 'function') {
          openSalesOrderForm();
        } else if (typeof switchSalesPreInvTab === 'function') {
          switchSalesPreInvTab('salesorder');
        }
      });
    }

    const deliveryChallanNavBtn = document.getElementById('btnQuoteNavDeliveryChallan');
    if (deliveryChallanNavBtn) {
      deliveryChallanNavBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeQuotationForm();
        if (typeof openDeliveryChallanForm === 'function') {
          openDeliveryChallanForm();
        } else if (typeof switchSalesPreInvTab === 'function') {
          switchSalesPreInvTab('deliverychallan');
        }
      });
    }

    // Chip sync
    const quoteNoEl = document.getElementById('quoteNo');
    const chipEl = document.getElementById('quoteChipDisplay');
    if (quoteNoEl && chipEl) {
      quoteNoEl.addEventListener('input', () => {
        chipEl.textContent = quoteNoEl.value.trim() || 'QT-2026-001';
      });
    }

    // Customer Searchable Select
    const custTrigger = document.getElementById('quoteCustomerSelectTrigger');
    const custDropdown = document.getElementById('quoteCustomerSelectDropdown');
    const custSearch = document.getElementById('quoteCustomerSelectSearch');

    if (custTrigger && custDropdown && custSearch) {
      custTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = custDropdown.style.display === 'flex';
        if (isOpen) {
          custDropdown.style.display = 'none';
        } else {
          custDropdown.style.display = 'flex';
          custSearch.value = '';
          populateQuoteCustomers();
          setTimeout(() => custSearch.focus(), 50);
        }
      });

      custSearch.addEventListener('input', () => {
        populateQuoteCustomers(custSearch.value);
      });

      custSearch.addEventListener('click', (e) => e.stopPropagation());

      document.addEventListener('click', (e) => {
        if (!custTrigger.contains(e.target) && !custDropdown.contains(e.target)) {
          custDropdown.style.display = 'none';
        }
      });
    }

    // Add Row
    const addRowBtn = document.getElementById('quoteAddRow');
    if (addRowBtn) {
      addRowBtn.addEventListener('click', () => {
        addQuoteRow();
      });
    }

    // Line items input / change / delete delegation
    const quoteBody = document.getElementById('quoteItemBody');
    if (quoteBody) {
      quoteBody.addEventListener('input', (e) => {
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
        updateQuoteRowFromDOM(index, tr, triggeredBy);
      });

      quoteBody.addEventListener('change', (e) => {
        const tr = e.target.closest('tr');
        if (!tr) return;
        const index = parseInt(tr.dataset.rowIndex);
        updateQuoteRowFromDOM(index, tr, 'rate');
      });

      quoteBody.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.quote-del-row');
        if (delBtn) {
          const tr = delBtn.closest('tr');
          if (tr) {
            const index = parseInt(tr.dataset.rowIndex);
            if (!isNaN(index)) {
              if (quoteRows.length > 1) {
                quoteRows.splice(index, 1);
              } else {
                quoteRows = [{ item: '', hsn: '', qty: 1, unit: '', rate: 0, discount: 0, discountType: 'val', tax: 18, amount: 0 }];
              }
              renderQuoteRows();
              recalculateQuoteTotals();
            }
          }
        }
      });
    }

    // TDS / TCS Switcher
    const noneBtn = document.getElementById('quoteTdsTcsNone');
    const tdsBtn = document.getElementById('quoteTdsTcsTds');
    const tcsBtn = document.getElementById('quoteTdsTcsTcs');
    const bg = document.getElementById('quoteTdsTcsBg');
    const amountRow = document.getElementById('quoteTdsTcsAmountRow');
    const amountLabel = document.getElementById('quoteTdsTcsAmountLabel');
    const rateSelect = document.getElementById('quoteTdsTcsRateSelect');
    const customInput = document.getElementById('quoteTdsTcsRateCustom');
    const customWrap = document.getElementById('quoteTdsTcsRateCustomWrap');
    const amountInput = document.getElementById('quoteTdsTcsAmount');
    const adjustmentsInput = document.getElementById('quoteAdjustments');
    const btnAutoRoundOff = document.getElementById('btnQuoteAutoRoundOff');

    if (noneBtn) {
      noneBtn.addEventListener('click', () => {
        noneBtn.classList.add('active');
        if (tdsBtn) tdsBtn.classList.remove('active');
        if (tcsBtn) tcsBtn.classList.remove('active');
        if (bg) bg.className = 'sales-tdstcs-bg none-active';
        if (amountRow) amountRow.style.display = 'none';
        if (amountInput) amountInput.value = '';
        recalculateQuoteTotals();
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
        recalculateQuoteTotals();
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
        recalculateQuoteTotals();
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
        recalculateQuoteTotals();
      });
    }

    if (customInput) {
      customInput.addEventListener('input', () => {
        recalculateQuoteTotals();
      });
    }

    if (amountInput) {
      amountInput.addEventListener('input', () => {
        recalculateQuoteTotals();
      });
    }

    if (adjustmentsInput) {
      adjustmentsInput.addEventListener('input', () => {
        recalculateQuoteTotals();
      });
    }

    if (btnAutoRoundOff) {
      btnAutoRoundOff.addEventListener('click', (e) => {
        e.preventDefault();
        autoCalculateQuoteRoundOff();
      });
    }

    // Document Attachment
    const dropzone = document.getElementById('quoteDocDropzone');
    const fileInput = document.getElementById('quoteDocFileInput');
    const removeBtn = document.getElementById('quoteDocRemoveBtn');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', (e) => {
        if (e.target.closest('#quoteDocRemoveBtn') || e.target.closest('#quoteDocPreviewBtn')) return;
        fileInput.click();
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleQuoteFileUpload(e.target.files[0]);
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
          handleQuoteFileUpload(e.dataTransfer.files[0]);
        }
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateQuoteDocUI(null);
        showToast('Document attachment removed.', 'info');
      });
    }

    // Action buttons
    const clearBtn = document.getElementById('btnClearQuote');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        initQuotationForm(_editingQuote);
      });
    }

    const saveDraftBtn = document.getElementById('btnSaveQuoteDraft');
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener('click', () => {
        saveQuotation(true);
      });
    }

    const saveBtn = document.getElementById('btnSaveQuote');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        saveQuotation(false);
      });
    }
  }

  // ── Global Exports ──
  window.openQuotationForm = openQuotationForm;
  window.closeQuotationForm = closeQuotationForm;
  window.initQuotationForm = initQuotationForm;
  window.renderQuoteRows = renderQuoteRows;
  window.addQuoteRow = addQuoteRow;
  window.recalculateQuoteTotals = recalculateQuoteTotals;
  window.saveQuotation = saveQuotation;

  // Init on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupQuotationEventListeners);
  } else {
    setupQuotationEventListeners();
  }
})();
