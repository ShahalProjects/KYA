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
  let _quoteFilterStatus = 'all';
  let _quoteSearchQuery = '';

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

  // ── Open / Close Quotation Form & List ──
  let _quoteOpenedFrom = 'preinvoice';

  function openQuotationForm(quoteData, openedFrom = 'preinvoice') {
    if (openedFrom) _quoteOpenedFrom = openedFrom;

    const preInvCard = document.getElementById('salesPreInvoiceCard');
    const quoteListCard = document.getElementById('salesQuotationListCard');
    const salesFormCard = document.getElementById('salesVoucherFormCard');
    const quoteFormCard = document.getElementById('salesQuotationFormCard');
    const proformaFormCard = document.getElementById('salesProformaFormCard');
    const orderFormCard = document.getElementById('salesOrderFormCard');
    const challanFormCard = document.getElementById('salesDeliveryChallanFormCard');

    if (preInvCard) preInvCard.style.display = 'none';
    if (quoteListCard) quoteListCard.style.display = 'none';
    if (salesFormCard) salesFormCard.style.display = 'none';
    if (proformaFormCard) proformaFormCard.style.display = 'none';
    if (orderFormCard) orderFormCard.style.display = 'none';
    if (challanFormCard) challanFormCard.style.display = 'none';
    if (quoteFormCard) quoteFormCard.style.display = 'block';

    window._currentSalesSubtype = 'Quotation';
    initQuotationForm(quoteData);
  }

  function closeQuotationForm() {
    const quoteFormCard = document.getElementById('salesQuotationFormCard');
    if (quoteFormCard) quoteFormCard.style.display = 'none';

    _editingQuote = null;
    if (_quoteOpenedFrom === 'quotelist') {
      openQuotationList(_quoteFilterStatus || 'all');
    } else {
      closeQuotationList();
    }
  }

  function openQuotationList(filterStatus = 'all') {
    const preInvCard = document.getElementById('salesPreInvoiceCard');
    const salesFormCard = document.getElementById('salesVoucherFormCard');
    const quoteListCard = document.getElementById('salesQuotationListCard');
    const quoteFormCard = document.getElementById('salesQuotationFormCard');
    const proformaFormCard = document.getElementById('salesProformaFormCard');
    const orderFormCard = document.getElementById('salesOrderFormCard');
    const challanFormCard = document.getElementById('salesDeliveryChallanFormCard');

    if (preInvCard) preInvCard.style.display = 'none';
    if (salesFormCard) salesFormCard.style.display = 'none';
    if (quoteFormCard) quoteFormCard.style.display = 'none';
    if (proformaFormCard) proformaFormCard.style.display = 'none';
    if (orderFormCard) orderFormCard.style.display = 'none';
    if (challanFormCard) challanFormCard.style.display = 'none';
    if (quoteListCard) quoteListCard.style.display = 'block';

    _quoteFilterStatus = filterStatus || 'all';

    const contentArea = document.getElementById('quotationListFullContentArea');
    if (contentArea) {
      contentArea.innerHTML = renderQuotationList(_quoteFilterStatus);
      attachQuotationListEvents();
    }
  }

  function closeQuotationList() {
    const preInvCard = document.getElementById('salesPreInvoiceCard');
    const quoteListCard = document.getElementById('salesQuotationListCard');
    const quoteFormCard = document.getElementById('salesQuotationFormCard');

    if (quoteListCard) quoteListCard.style.display = 'none';
    if (quoteFormCard) quoteFormCard.style.display = 'none';
    if (preInvCard) preInvCard.style.display = 'block';

    if (typeof window.switchSalesPreInvTab === 'function') {
      window.switchSalesPreInvTab('preinvoice');
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

  // ══════════════════════════════════════════════════════════════════
  //  QUOTATION LIST VIEW (Active, Completed, Cancelled)
  // ══════════════════════════════════════════════════════════════════

  function getAllQuotations() {
    window.KYA_STORE = window.KYA_STORE || {};
    const posted = window.KYA_STORE.quotations || [];
    const drafts = window.KYA_STORE.quotationsDrafts || [];

    const map = new Map();
    posted.forEach(q => map.set(String(q.id), { ...q, isDraft: false }));
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

  function setQuotationStatus(id, newStatus) {
    window.KYA_STORE = window.KYA_STORE || {};
    window.KYA_STORE.quotations = window.KYA_STORE.quotations || [];
    window.KYA_STORE.quotationsDrafts = window.KYA_STORE.quotationsDrafts || [];

    let quote = window.KYA_STORE.quotations.find(q => String(q.id) === String(id));
    let isDraft = false;
    if (!quote) {
      quote = window.KYA_STORE.quotationsDrafts.find(d => String(d.id) === String(id));
      isDraft = true;
    }

    if (!quote) {
      showToast('Quotation not found.', 'error');
      return;
    }

    quote.status = newStatus;
    quote.updatedAt = Date.now();

    if (isDraft && (newStatus === 'Active' || newStatus === 'Completed')) {
      window.KYA_STORE.quotationsDrafts = window.KYA_STORE.quotationsDrafts.filter(d => String(d.id) !== String(id));
      if (!window.KYA_STORE.quotations.some(q => String(q.id) === String(id))) {
        window.KYA_STORE.quotations.unshift(quote);
      }
    }

    showToast(`Quotation ${quote.quoteNo || ''} marked as ${newStatus}.`, 'success');
    if (typeof triggerAutoBackup === 'function') triggerAutoBackup();

    if (typeof window.openQuotationList === 'function') {
      window.openQuotationList(_quoteFilterStatus || 'all');
    } else if (typeof window.switchSalesPreInvTab === 'function') {
      window.switchSalesPreInvTab('quotation', _quoteFilterStatus || 'all');
    }
  }

  function deleteQuotationItem(id) {
    window.KYA_STORE = window.KYA_STORE || {};
    window.KYA_STORE.quotations = window.KYA_STORE.quotations || [];
    window.KYA_STORE.quotationsDrafts = window.KYA_STORE.quotationsDrafts || [];

    const quote = window.KYA_STORE.quotations.find(q => String(q.id) === String(id)) ||
                  window.KYA_STORE.quotationsDrafts.find(d => String(d.id) === String(id));

    const qNo = quote ? (quote.quoteNo || 'quotation') : 'quotation';

    showKyaConfirm({
      title: 'Delete Quotation?',
      message: `Permanently delete quotation <strong>${safeEsc(qNo)}</strong>?<br>This action cannot be undone.`,
      confirmLabel: '✕ Delete',
      okBg: '#dc2626',
      iconBg: '#fee2e2',
      iconColor: '#dc2626',
      iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      onConfirm: () => {
        window.KYA_STORE.quotations = window.KYA_STORE.quotations.filter(q => String(q.id) !== String(id));
        window.KYA_STORE.quotationsDrafts = window.KYA_STORE.quotationsDrafts.filter(d => String(d.id) !== String(id));
        showToast(`Quotation ${qNo} deleted successfully.`, 'success');
        if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
        if (typeof window.openQuotationList === 'function') {
          window.openQuotationList(_quoteFilterStatus || 'all');
        } else if (typeof window.switchSalesPreInvTab === 'function') {
          window.switchSalesPreInvTab('quotation', _quoteFilterStatus || 'all');
        }
      }
    });
  }

  function editQuotationItem(id) {
    const all = getAllQuotations();
    const quote = all.find(q => String(q.id) === String(id));
    if (!quote) {
      showToast('Quotation not found.', 'error');
      return;
    }
    openQuotationForm(quote, 'quotelist');
  }

  function convertQuotationToInvoice(id) {
    const all = getAllQuotations();
    const quote = all.find(q => String(q.id) === String(id));
    if (!quote) {
      showToast('Quotation not found.', 'error');
      return;
    }

    const inv = {
      id: Date.now(),
      customerId: quote.customerId,
      customerName: quote.customerName,
      date: new Date().toISOString().split('T')[0],
      dueDate: quote.expiryDate || new Date().toISOString().split('T')[0],
      invoiceNo: '',
      salesSupplyType: quote.supplyType || 'Intra-State (CGST + SGST)',
      salesExecutiveId: quote.salesExecutiveId || '',
      type: 'Product',
      paymentStatus: 'Not Paid',
      paymentAccountId: '',
      paymentAmount: '',
      notes: quote.notes ? `${quote.notes}\n[Converted from Quotation ${quote.quoteNo}]` : `Converted from Quotation ${quote.quoteNo}`,
      adjustments: quote.adjustments || 0,
      tdsTcsMode: quote.tdsTcsMode || 'None',
      tdsTcsRate: quote.tdsTcsRate || 0,
      tdsTcsAmount: quote.tdsTcsAmount || 0,
      subTotal: quote.subTotal,
      total: quote.total,
      rows: Array.isArray(quote.rows) ? JSON.parse(JSON.stringify(quote.rows)) : [],
      uploadedDoc: quote.document ? {
        fileName: quote.document.name,
        fileSize: quote.document.size ? `${(quote.document.size / 1024).toFixed(1)} KB` : '',
        fileData: quote.document.data
      } : null
    };

    quote.status = 'Completed';
    window.KYA_STORE.quotations = window.KYA_STORE.quotations || [];
    const idx = window.KYA_STORE.quotations.findIndex(q => String(q.id) === String(id));
    if (idx >= 0) {
      window.KYA_STORE.quotations[idx].status = 'Completed';
    } else {
      window.KYA_STORE.quotations.unshift(quote);
      window.KYA_STORE.quotationsDrafts = (window.KYA_STORE.quotationsDrafts || []).filter(d => String(d.id) !== String(id));
    }

    if (typeof triggerAutoBackup === 'function') triggerAutoBackup();

    if (typeof loadSalesInvoice === 'function') {
      const quoteListCard = document.getElementById('salesQuotationListCard');
      if (quoteListCard) quoteListCard.style.display = 'none';
      currentSalesVoucherSubtype = 'Invoice';
      if (typeof updateVoucherSubtypeUI === 'function') updateVoucherSubtypeUI();
      loadSalesInvoice(inv, false);
      showToast(`Quotation ${quote.quoteNo} converted to Sales Invoice!`, 'success');
    } else {
      showToast(`Quotation ${quote.quoteNo} marked as Completed.`, 'success');
      if (typeof window.openQuotationList === 'function') {
        window.openQuotationList(_quoteFilterStatus || 'all');
      }
    }
  }

  function viewPrintQuotation(id) {
    const all = getAllQuotations();
    const quote = all.find(q => String(q.id) === String(id));
    if (!quote) {
      showToast('Quotation not found.', 'error');
      return;
    }

    const activeCo = (typeof getActiveCompany === 'function' ? getActiveCompany() : null) || {};
    const coName = activeCo.name || 'KYA Accounting';
    const coAddress = activeCo.address || '';
    const coGstin = activeCo.gstin || '';
    const coPhone = activeCo.phone || '';

    const customer = (typeof findPartyById === 'function' ? findPartyById(quote.customerId, 'Customer') : null) ||
                     (typeof coaLedgers !== 'undefined' ? coaLedgers.find(l => l.id == quote.customerId) : null) ||
                     { name: quote.customerName || 'Customer' };
    const partyName = customer.name || quote.customerName || 'Customer';
    const partyContact = customer.contactName || '';
    const partyAddr = customer.address || '';
    const cityPin = [customer.city, customer.pincode].filter(Boolean).join(' - ');
    const stateCountry = [customer.state, customer.country || 'India'].filter(Boolean).join(', ');
    const partyGstin = customer.gstin || '';
    const partyPhone = customer.phone || customer.mobile || '';

    const rows = Array.isArray(quote.rows) ? quote.rows : [];
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
    if (quote.status === 'Completed') {
      statusBadge = '<span class="badge" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-size:12px; padding:4px 10px; font-weight:700;">Completed</span>';
    } else if (quote.status === 'Cancelled') {
      statusBadge = '<span class="badge" style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; font-size:12px; padding:4px 10px; font-weight:700;">Cancelled</span>';
    } else if (quote.status === 'Draft' || quote.isDraft) {
      statusBadge = '<span class="badge" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; font-size:12px; padding:4px 10px; font-weight:700;">Draft</span>';
    } else {
      statusBadge = '<span class="badge" style="background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; font-size:12px; padding:4px 10px; font-weight:700;">Active</span>';
    }

    const isAct = quote.status === 'Active' || !quote.status;
    const isDrf = quote.status === 'Draft' || quote.isDraft;

    let statusActionsHtml = '';
    if (isAct || isDrf) {
      statusActionsHtml = `
        <button type="button" id="btnPreviewToInvoice" class="btn btn-sm" style="background: #10b981; color: #fff; border: 1.5px solid #059669; padding: 7px 15px; font-size: 12.5px; font-weight: 700; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.06); transition: all 0.15s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span>Convert to Invoice</span>
        </button>
        <button type="button" id="btnPreviewComplete" class="btn btn-sm" style="background: #eff6ff; color: #1d4ed8; border: 1.5px solid #bfdbfe; padding: 7px 14px; font-size: 12.5px; font-weight: 700; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: all 0.15s;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'">
          <span>✓ Mark Completed</span>
        </button>
        <button type="button" id="btnPreviewCancel" class="btn btn-sm" style="background: #fff1f2; color: #be123c; border: 1.5px solid #fecdd3; padding: 7px 14px; font-size: 12.5px; font-weight: 700; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: all 0.15s;" onmouseover="this.style.background='#ffe4e6'" onmouseout="this.style.background='#fff1f2'">
          <span>✕ Mark Cancelled</span>
        </button>
      `;
    } else {
      statusActionsHtml = `
        <button type="button" id="btnPreviewReopen" class="btn btn-sm" style="background: #ecfdf5; color: #047857; border: 1.5px solid #a7f3d0; padding: 7px 15px; font-size: 12.5px; font-weight: 700; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s;" onmouseover="this.style.background='#d1fae5'" onmouseout="this.style.background='#ecfdf5'">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          <span>↺ Reopen as Active</span>
        </button>
      `;
    }

    const overlay = document.createElement('div');
    overlay.className = 'inv-modal-overlay';
    overlay.id = 'quotationPrintOverlay';
    overlay.setAttribute('tabindex', '-1');

    overlay.innerHTML = `
      <div class="inv-modal-card">
        <div class="inv-modal-hdr" style="background: linear-gradient(90deg, #1d4ed8, #2563eb);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2">
              <path d="M4 4h12v12H4z"/>
              <path d="M7 8h6M7 12h4"/>
            </svg>
            <div>
              <span style="font-weight: 700; font-size: 16px;">Quotation Preview</span>
              <span style="margin-left: 8px; font-family: monospace; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 6px; font-size: 13px;">${safeEsc(quote.quoteNo || 'QT-XXXX')}</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <!-- Export Dropdown (PDF & Excel) -->
            <div class="rpt-more-wrap" style="position: relative;">
              <button class="btn btn-secondary" id="btnExportQuoteAction" type="button" style="background: rgba(255,255,255,0.18); color: #fff; border: 1.5px solid rgba(255,255,255,0.35); font-weight: 700; padding: 7px 14px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; font-size: 13px; height: 36px; transition: all 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.28)'" onmouseout="this.style.background='rgba(255,255,255,0.18)'">
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
              <div id="quoteExportDropdown" style="display: none; position: absolute; right: 0; top: calc(100% + 6px); background: #fff; border: 1.5px solid var(--slate-200); border-radius: 10px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1); z-index: 10006; min-width: 145px; overflow: hidden; padding: 4px 0;">
                <button type="button" id="btnQuoteExportPdf" class="rpt-menu-item" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 16px; border: none; background: none; font-size: 13px; font-weight: 600; color: var(--slate-700); cursor: pointer; text-align: left; transition: background 0.15s;" onmouseover="this.style.background='var(--slate-50)'" onmouseout="this.style.background='none'">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                  <span>PDF</span>
                </button>
                <button type="button" id="btnQuoteExportExcel" class="rpt-menu-item" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 16px; border: none; background: none; font-size: 13px; font-weight: 600; color: var(--slate-700); cursor: pointer; text-align: left; border-top: 1px solid var(--slate-100); transition: background 0.15s;" onmouseover="this.style.background='var(--slate-50)'" onmouseout="this.style.background='none'">
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
            <button id="btnCloseQuoteModal" style="background: rgba(255,255,255,0.18); border: none; color: #fff; font-size: 18px; cursor: pointer; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; line-height: 1; transition: all 0.15s;" type="button" title="Close Preview" onmouseover="this.style.background='rgba(255,255,255,0.28)'" onmouseout="this.style.background='rgba(255,255,255,0.18)'">✕</button>
          </div>
        </div>

        <!-- Action Bar: Inside the quote preview with all actions -->
        <div class="quote-preview-action-bar no-print" style="background: #f8fafc; border-bottom: 1.5px solid var(--slate-200); padding: 12px 28px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <button type="button" id="btnPreviewEditQuote" class="btn btn-sm" style="background: #fff; color: var(--blue-700); border: 1.5px solid var(--slate-300); padding: 7px 14px; font-size: 12.5px; font-weight: 700; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s;" onmouseover="this.style.background='var(--slate-50)'" onmouseout="this.style.background='#fff'">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <span>Edit Quotation</span>
            </button>
            ${statusActionsHtml}
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button type="button" id="btnPreviewDeleteQuote" class="btn btn-sm" style="background: #fee2e2; color: #dc2626; border: 1.5px solid #fca5a5; padding: 7px 13px; font-size: 12.5px; font-weight: 700; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: all 0.15s;" onmouseover="this.style.background='#fecdd3'" onmouseout="this.style.background='#fee2e2'">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
              <span>Delete</span>
            </button>
          </div>
        </div>

        <div class="inv-modal-body">
          <div class="inv-paper">
            <div style="display: flex; justify-content: space-between; border-bottom: 2px solid var(--slate-100); padding-bottom: 24px; margin-bottom: 24px;">
              <div>
                <div style="font-size: 22px; font-weight: 800; color: var(--blue-800);">${safeEsc(coName)}</div>
                ${coAddress ? `<div style="font-size: 12.5px; color: var(--slate-500); margin-top: 4px;">${safeEsc(coAddress)}</div>` : ''}
                ${coGstin ? `<div style="font-size: 12px; color: var(--slate-600); margin-top: 2px;">GSTIN: <strong>${safeEsc(coGstin)}</strong></div>` : ''}
                ${coPhone ? `<div style="font-size: 12px; color: var(--slate-600);">Phone: ${safeEsc(coPhone)}</div>` : ''}
              </div>
              <div style="text-align: right;">
                <h1 style="font-size: 28px; font-weight: 900; color: var(--slate-800); margin: 0; text-transform: uppercase;">Quotation</h1>
                <div style="font-size: 15px; font-weight: 800; color: var(--blue-700); margin-top: 4px; font-family: monospace;">${safeEsc(quote.quoteNo)}</div>
                <div style="margin-top: 6px;">${statusBadge}</div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 30px; border-bottom: 2px solid var(--slate-100); padding-bottom: 24px; margin-bottom: 24px;">
              <div>
                <h3 style="font-size: 11px; text-transform: uppercase; color: var(--slate-400); letter-spacing: 0.08em; margin-bottom: 8px; font-weight: 700;">Quotation For:</h3>
                <div style="font-size: 16px; font-weight: 800; color: var(--slate-900);">${safeEsc(partyName)}</div>
                ${partyContact ? `<div style="font-size: 12.5px; color: var(--slate-600); margin-top: 2px;">Attn: ${safeEsc(partyContact)}</div>` : ''}
                ${partyAddr ? `<div style="font-size: 12px; color: var(--slate-600); margin-top: 4px;">${safeEsc(partyAddr)}</div>` : ''}
                ${(cityPin || stateCountry) ? `<div style="font-size: 12px; color: var(--slate-600); margin-top: 2px;">${safeEsc([cityPin, stateCountry].filter(Boolean).join(', '))}</div>` : ''}
                ${partyGstin ? `<div style="font-size: 12px; color: var(--slate-700); margin-top: 4px;">GSTIN: <strong style="font-family: monospace; color: #047857;">${safeEsc(partyGstin)}</strong></div>` : ''}
                ${partyPhone ? `<div style="font-size: 12px; color: var(--slate-600); margin-top: 2px;">Phone: ${safeEsc(partyPhone)}</div>` : ''}
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 13px;">
                <div>
                  <div style="color: var(--slate-400); font-weight: 600; font-size: 11px; text-transform: uppercase;">Quotation Date:</div>
                  <div style="font-weight: 700; color: var(--slate-800); margin-top: 2px;">${quote.date || '—'}</div>
                </div>
                <div>
                  <div style="color: var(--slate-400); font-weight: 600; font-size: 11px; text-transform: uppercase;">Valid Until:</div>
                  <div style="font-weight: 700; color: var(--slate-800); margin-top: 2px;">${quote.expiryDate || '—'}</div>
                </div>
                <div>
                  <div style="color: var(--slate-400); font-weight: 600; font-size: 11px; text-transform: uppercase;">Supply Type:</div>
                  <div style="font-weight: 700; color: var(--slate-800); margin-top: 2px;">${safeEsc(quote.supplyType || 'Intra-State')}</div>
                </div>
                ${quote.salesExecutiveName ? `
                <div>
                  <div style="color: var(--slate-400); font-weight: 600; font-size: 11px; text-transform: uppercase;">Prepared By:</div>
                  <div style="font-weight: 700; color: var(--slate-800); margin-top: 2px;">${safeEsc(quote.salesExecutiveName)}</div>
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
                <h4 style="font-size: 11px; text-transform: uppercase; color: var(--slate-400); letter-spacing: 0.05em; margin-bottom: 6px; font-weight: 700;">Terms & Notes:</h4>
                <div style="font-size: 12.5px; color: var(--slate-600); line-height: 1.5; white-space: pre-wrap;">${safeEsc(quote.notes) || 'Thank you for your interest! Prices are valid until the specified expiry date.'}</div>
                ${quote.document && quote.document.data ? `
                  <div style="margin-top: 12px; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                    <span style="font-size: 12px; font-weight: 600; color: var(--slate-700);">📎 ${safeEsc(quote.document.name)}</span>
                    <a href="${quote.document.data}" download="${safeEsc(quote.document.name)}" style="font-size: 11px; font-weight: 700; color: #2563eb; text-decoration: none;">Download</a>
                  </div>
                ` : ''}
              </div>
              <div>
                <div style="background: var(--slate-50); border: 1px solid var(--slate-100); border-radius: 12px; padding: 16px 20px;">
                  <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--slate-600); margin-bottom: 6px;">
                    <span>Subtotal</span>
                    <span style="font-weight: 600;">₹ ${safeFmtNum(quote.subTotal)}</span>
                  </div>
                  ${quote.adjustments ? `
                    <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--slate-600); margin-bottom: 6px;">
                      <span>Adjustments / Round-off</span>
                      <span style="font-weight: 600;">₹ ${safeFmtNum(quote.adjustments)}</span>
                    </div>
                  ` : ''}
                  <div style="display: flex; justify-content: space-between; font-size: 17px; font-weight: 800; color: var(--blue-800); border-top: 1.5px solid var(--slate-200); padding-top: 10px; margin-top: 6px;">
                    <span>Grand Total</span>
                    <span>₹ ${safeFmtNum(quote.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style="margin-top: 50px; border-top: 1px solid var(--slate-100); padding-top: 16px; text-align: center; font-size: 11.5px; color: var(--slate-400);">
              This is an official price estimate / quotation. Generated by KYA Accounting Suite.
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.focus();

    overlay.querySelector('#btnCloseQuoteModal')?.addEventListener('click', () => overlay.remove());

    // Wire Export Dropdown (PDF & Excel)
    const expBtn = overlay.querySelector('#btnExportQuoteAction');
    const expDropdown = overlay.querySelector('#quoteExportDropdown');
    const expPdfBtn = overlay.querySelector('#btnQuoteExportPdf');
    const expExcelBtn = overlay.querySelector('#btnQuoteExportExcel');

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
        if (typeof window.exportQuotationToPDF === 'function') {
          await window.exportQuotationToPDF(quote);
        } else {
          window.print();
        }
      });
    }

    if (expExcelBtn) {
      expExcelBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (expDropdown) expDropdown.style.display = 'none';
        if (typeof window.exportQuotationToExcel === 'function') {
          await window.exportQuotationToExcel(quote);
        } else if (typeof window.exportQuotationToCsvFallback === 'function') {
          window.exportQuotationToCsvFallback(quote);
        }
      });
    }

    overlay.querySelector('#btnPreviewEditQuote')?.addEventListener('click', () => {
      overlay.remove();
      editQuotationItem(quote.id);
    });
    overlay.querySelector('#btnPreviewToInvoice')?.addEventListener('click', () => {
      overlay.remove();
      convertQuotationToInvoice(quote.id);
    });
    overlay.querySelector('#btnPreviewComplete')?.addEventListener('click', () => {
      overlay.remove();
      setQuotationStatus(quote.id, 'Completed');
    });
    overlay.querySelector('#btnPreviewCancel')?.addEventListener('click', () => {
      overlay.remove();
      setQuotationStatus(quote.id, 'Cancelled');
    });
    overlay.querySelector('#btnPreviewReopen')?.addEventListener('click', () => {
      overlay.remove();
      setQuotationStatus(quote.id, 'Active');
    });
    overlay.querySelector('#btnPreviewDeleteQuote')?.addEventListener('click', () => {
      overlay.remove();
      deleteQuotationItem(quote.id);
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

  function renderQuotationList(filterStatus = 'all') {
    if (filterStatus) _quoteFilterStatus = filterStatus;
    const all = getAllQuotations();

    const qTerm = (_quoteSearchQuery || '').trim().toLowerCase();
    const filterBySearch = (items) => {
      if (!qTerm) return items;
      return items.filter(q => {
        const noMatch = (q.quoteNo || '').toLowerCase().includes(qTerm);
        const custMatch = (q.customerName || '').toLowerCase().includes(qTerm);
        const dateMatch = (q.date || '').toLowerCase().includes(qTerm);
        const amtMatch = String(q.total || '').toLowerCase().includes(qTerm);
        const itemMatch = Array.isArray(q.rows) && q.rows.some(r => (r.item || '').toLowerCase().includes(qTerm));
        return noMatch || custMatch || dateMatch || amtMatch || itemMatch;
      });
    };

    const allCount = all.length;
    const activeCount = all.filter(q => q.status === 'Active' || !q.status || q.status === 'Draft').length;
    const completedCount = all.filter(q => q.status === 'Completed').length;
    const cancelledCount = all.filter(q => q.status === 'Cancelled').length;

    let displayList = all;
    if (_quoteFilterStatus === 'active') {
      displayList = all.filter(q => q.status === 'Active' || !q.status || q.status === 'Draft');
    } else if (_quoteFilterStatus === 'completed') {
      displayList = all.filter(q => q.status === 'Completed');
    } else if (_quoteFilterStatus === 'cancelled') {
      displayList = all.filter(q => q.status === 'Cancelled');
    } else {
      // 'all': sort Active & Draft first, then Completed, then Cancelled (each by date desc)
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
            <div style="width: 56px; height: 56px; border-radius: 14px; background: #eff6ff; color: var(--blue-600); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
              <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
                <path d="M4 4h12v12H4z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                <path d="M7 8h6M7 12h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              </svg>
            </div>
            <div style="font-weight: 800; font-size: 16px; color: var(--slate-800); margin-bottom: 6px;">No Quotations Yet</div>
            <p style="font-size: 13px; color: var(--slate-500); max-width: 420px; margin: 0 auto 20px;">
              Create price proposals, client estimates, and quotations to track active quotes, completed deals, and cancellations.
            </p>
            <button class="btn btn-primary" onclick="openQuotationForm()" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; padding: 8px 18px; border-radius: 8px; cursor: pointer;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Create First Quotation
            </button>
          </div>
        `;
      }

      let rowsHtml = '';
      if (filteredItems.length === 0) {
        rowsHtml = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 48px 20px; color: var(--slate-400);">
              <div style="font-weight: 700; font-size: 14px; color: var(--slate-600); margin-bottom: 4px;">No quotations found</div>
              <div style="font-size: 12.5px;">No quotations match the current filter or search query.</div>
            </td>
          </tr>
        `;
      } else {
        rowsHtml = filteredItems.map(q => {
          let statusBadge = '';
          const isAct = q.status === 'Active' || !q.status;
          const isDrf = q.status === 'Draft' || q.isDraft;
          const isComp = q.status === 'Completed';
          const isCanc = q.status === 'Cancelled';

          if (isComp) {
            statusBadge = '<span class="badge" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-size:11px; padding:3px 8px; font-weight:700;">Completed</span>';
          } else if (isCanc) {
            statusBadge = '<span class="badge" style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; font-size:11px; padding:3px 8px; font-weight:700;">Cancelled</span>';
          } else if (isDrf) {
            statusBadge = '<span class="badge" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; font-size:11px; padding:3px 8px; font-weight:700;">Draft</span>';
          } else {
            statusBadge = '<span class="badge" style="background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; font-size:11px; padding:3px 8px; font-weight:700;">Active</span>';
          }

          const itemsSummary = Array.isArray(q.rows) && q.rows.length > 0
            ? `${q.rows.length} ${q.rows.length === 1 ? 'item' : 'items'} (${safeEsc(q.rows[0].item || 'Item')}${q.rows.length > 1 ? ', …' : ''})`
            : '—';

          return `
            <tr style="border-bottom: 1px solid var(--slate-100); transition: background 0.15s; cursor: pointer;" onmouseover="this.style.background='var(--slate-50)'" onmouseout="this.style.background='transparent'" onclick="viewPrintQuotation(${q.id})" title="Click to view quotation">
              <td style="padding: 12px 16px;">
                <span style="font-family: monospace; font-weight: 800; color: var(--blue-700);">${safeEsc(q.quoteNo || 'QT-XXXX')}</span>
                ${q.document && q.document.data ? `<span title="Attachment: ${safeEsc(q.document.name)}" style="margin-left: 6px; color: #3b82f6;">📎</span>` : ''}
              </td>
              <td style="padding: 12px 14px; white-space: nowrap; color: var(--slate-700);">${q.date || '—'}</td>
              <td style="padding: 12px 14px; white-space: nowrap; color: var(--slate-500); font-size: 12px;">${q.expiryDate || '—'}</td>
              <td style="padding: 12px 16px; font-weight: 600; color: var(--slate-800); max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${safeEsc(q.customerName || 'Customer')}
                ${q.salesExecutiveName ? `<div style="font-size: 11px; color: var(--slate-400); font-weight: 500;">By ${safeEsc(q.salesExecutiveName)}</div>` : ''}
              </td>
              <td style="padding: 12px 14px; font-size: 12px; color: var(--slate-600); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${itemsSummary}
              </td>
              <td style="padding: 12px 16px; text-align: right; font-weight: 800; color: var(--slate-900); white-space: nowrap;">
                ₹ ${safeFmtNum(q.total)}
              </td>
              <td style="padding: 12px 14px; text-align: center; white-space: nowrap;">
                ${statusBadge}
              </td>
            </tr>
          `;
        }).join('');
      }

      let headerLabel = 'All Quotations';
      if (_quoteFilterStatus === 'active') headerLabel = 'Active Quotations';
      else if (_quoteFilterStatus === 'completed') headerLabel = 'Completed Quotations';
      else if (_quoteFilterStatus === 'cancelled') headerLabel = 'Cancelled Quotations';

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
                  <th style="padding: 10px 16px;">Quote No.</th>
                  <th style="padding: 10px 14px;">Date</th>
                  <th style="padding: 10px 14px;">Valid Till</th>
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
        <!-- Toolbar: Big Voucher-Desk Style Search Bar + Status Filter Pills -->
        <div class="ptb" style="margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;">
          <!-- Big Search Bar (takes flexible wide space like Voucher Desk) -->
          <div class="pt-search-wrap" style="flex: 1; min-width: 280px; position: relative;">
            <svg class="pt-search-icon" width="16" height="16" viewBox="0 0 15 15" fill="none" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--slate-400); pointer-events: none;">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.5"/>
              <path d="M10 10l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <input type="text" id="quoteListSearchInput" class="pt-search-inp" placeholder="Search quotation #, customer, item, date, amount…" value="${safeEsc(_quoteSearchQuery)}" style="width: 100%; height: 42px; padding: 10px 38px 10px 42px; font-size: 13.5px; border: 1.5px solid var(--slate-200); border-radius: 10px; background: #fff; box-sizing: border-box; outline: none; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.03);" onfocus="this.style.borderColor='var(--blue-500)'; this.style.boxShadow='0 0 0 3px rgba(37,99,235,0.1)';" onblur="this.style.borderColor='var(--slate-200)'; this.style.boxShadow='none';" />
            ${_quoteSearchQuery ? `
              <button type="button" id="btnQuoteClearSearch" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); border: none; background: none; color: var(--slate-400); cursor: pointer; font-size: 15px; padding: 4px; display: flex; align-items: center; justify-content: center;" title="Clear search">✕</button>
            ` : ''}
          </div>

          <!-- Filter Tabs / Pills -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
            <button type="button" class="quote-filter-pill ${_quoteFilterStatus === 'all' ? 'active' : ''}" onclick="window.openQuotationList('all')" style="height: 42px; border: 1.5px solid ${_quoteFilterStatus === 'all' ? 'var(--blue-600)' : 'var(--slate-200)'}; background: ${_quoteFilterStatus === 'all' ? 'var(--blue-50)' : '#fff'}; color: ${_quoteFilterStatus === 'all' ? 'var(--blue-700)' : 'var(--slate-600)'}; padding: 0 16px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
              <span>All</span>
              <span style="background: ${_quoteFilterStatus === 'all' ? 'var(--blue-200)' : 'var(--slate-100)'}; color: ${_quoteFilterStatus === 'all' ? 'var(--blue-800)' : 'var(--slate-600)'}; font-size: 11px; padding: 2px 8px; border-radius: 10px;">${allCount}</span>
            </button>

            <button type="button" class="quote-filter-pill ${_quoteFilterStatus === 'active' ? 'active' : ''}" onclick="window.openQuotationList('active')" style="height: 42px; border: 1.5px solid ${_quoteFilterStatus === 'active' ? '#10b981' : 'var(--slate-200)'}; background: ${_quoteFilterStatus === 'active' ? '#ecfdf5' : '#fff'}; color: ${_quoteFilterStatus === 'active' ? '#047857' : 'var(--slate-600)'}; padding: 0 16px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span>
              <span>Active</span>
              <span style="background: ${_quoteFilterStatus === 'active' ? '#a7f3d0' : 'var(--slate-100)'}; color: ${_quoteFilterStatus === 'active' ? '#065f46' : 'var(--slate-600)'}; font-size: 11px; padding: 2px 8px; border-radius: 10px;">${activeCount}</span>
            </button>

            <button type="button" class="quote-filter-pill ${_quoteFilterStatus === 'completed' ? 'active' : ''}" onclick="window.openQuotationList('completed')" style="height: 42px; border: 1.5px solid ${_quoteFilterStatus === 'completed' ? 'var(--blue-600)' : 'var(--slate-200)'}; background: ${_quoteFilterStatus === 'completed' ? '#eff6ff' : '#fff'}; color: ${_quoteFilterStatus === 'completed' ? '#1d4ed8' : 'var(--slate-600)'}; padding: 0 16px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #3b82f6;"></span>
              <span>Completed</span>
              <span style="background: ${_quoteFilterStatus === 'completed' ? '#bfdbfe' : 'var(--slate-100)'}; color: ${_quoteFilterStatus === 'completed' ? '#1e40af' : 'var(--slate-600)'}; font-size: 11px; padding: 2px 8px; border-radius: 10px;">${completedCount}</span>
            </button>

            <button type="button" class="quote-filter-pill ${_quoteFilterStatus === 'cancelled' ? 'active' : ''}" onclick="window.openQuotationList('cancelled')" style="height: 42px; border: 1.5px solid ${_quoteFilterStatus === 'cancelled' ? 'var(--slate-400)' : 'var(--slate-200)'}; background: ${_quoteFilterStatus === 'cancelled' ? '#f1f5f9' : '#fff'}; color: ${_quoteFilterStatus === 'cancelled' ? '#334155' : 'var(--slate-600)'}; padding: 0 16px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #94a3b8;"></span>
              <span>Cancelled</span>
              <span style="background: ${_quoteFilterStatus === 'cancelled' ? '#cbd5e1' : 'var(--slate-100)'}; color: ${_quoteFilterStatus === 'cancelled' ? '#1e293b' : 'var(--slate-600)'}; font-size: 11px; padding: 2px 8px; border-radius: 10px;">${cancelledCount}</span>
            </button>
          </div>
        </div>

        <!-- Rendered Single Unified Quotations Table -->
        <div id="quoteListSectionsContainer">
          ${tableContent}
        </div>
      </div>
    `;
  }

  function attachQuotationListEvents() {
    const searchInput = document.getElementById('quoteListSearchInput');
    if (searchInput && !searchInput._wired) {
      searchInput._wired = true;
      searchInput.addEventListener('input', (e) => {
        _quoteSearchQuery = e.target.value;
        const container = document.getElementById('quotationListFullContentArea') || document.getElementById('preInvContentArea');
        if (container) {
          container.innerHTML = renderQuotationList(_quoteFilterStatus);
          attachQuotationListEvents();
          const updatedSearch = document.getElementById('quoteListSearchInput');
          if (updatedSearch) {
            updatedSearch.focus();
            updatedSearch.setSelectionRange(updatedSearch.value.length, updatedSearch.value.length);
          }
        }
      });
    }

    const clearBtn = document.getElementById('btnQuoteClearSearch');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        _quoteSearchQuery = '';
        const container = document.getElementById('quotationListFullContentArea') || document.getElementById('preInvContentArea');
        if (container) {
          container.innerHTML = renderQuotationList(_quoteFilterStatus);
          attachQuotationListEvents();
          const updatedSearch = document.getElementById('quoteListSearchInput');
          if (updatedSearch) updatedSearch.focus();
        }
      });
    }
  }

  // ── Global Exports ──
  window.openQuotationForm = openQuotationForm;
  window.closeQuotationForm = closeQuotationForm;
  window.openQuotationList = openQuotationList;
  window.closeQuotationList = closeQuotationList;
  window.initQuotationForm = initQuotationForm;
  window.renderQuoteRows = renderQuoteRows;
  window.addQuoteRow = addQuoteRow;
  window.recalculateQuoteTotals = recalculateQuoteTotals;
  window.saveQuotation = saveQuotation;

  window.getAllQuotations = getAllQuotations;
  window.renderQuotationList = renderQuotationList;
  window.attachQuotationListEvents = attachQuotationListEvents;
  window.setQuotationStatus = setQuotationStatus;
  window.deleteQuotationItem = deleteQuotationItem;
  window.convertQuotationToInvoice = convertQuotationToInvoice;
  window.editQuotationItem = editQuotationItem;
  window.viewPrintQuotation = viewPrintQuotation;

  // Init on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupQuotationEventListeners);
  } else {
    setupQuotationEventListeners();
  }
})();
