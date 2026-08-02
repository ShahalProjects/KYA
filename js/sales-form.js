  // ══════════════════════════════════════════════════════════════════
  //  SALES REVENUE-ACCOUNT SEARCH DROPDOWN (recovered — was missing from split)
  // ══════════════════════════════════════════════════════════════════
﻿    const _salesRevPortal = (() => {
    let el = document.getElementById('sales-rev-portal-dropdown');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sales-rev-portal-dropdown';
      el.style.cssText = `
        position: fixed;
        z-index: 99999;
        background: #ffffff;
        border: 1.5px solid #e2e8f0;
        border-radius: 14px;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,.06), 0 12px 32px -4px rgba(0,0,0,.14), 0 0 0 1px rgba(0,0,0,.02);
        max-height: 280px;
        overflow-y: auto;
        overflow-x: hidden;
        display: none;
        min-width: 240px;
        font-family: Inter, sans-serif;
        scrollbar-width: thin;
        scrollbar-color: #cbd5e1 transparent;
      `;
      document.body.appendChild(el);
    }

    if (!document.getElementById('sales-rev-portal-styles')) {
      const style = document.createElement('style');
      style.id = 'sales-rev-portal-styles';
      style.textContent = `
        #sales-rev-portal-dropdown.open {
          display: block !important;
          animation: jeDropIn .14s cubic-bezier(.2,0,.2,1);
        }
      `;
      document.head.appendChild(style);
    }

    let _activeInp    = null;
    let _activeCb     = null;
    let _highlightIdx = -1;
    let _open         = false;

    function _items() { return el.querySelectorAll('.je-drop-item'); }

    function _setHL(idx) {
      const items = _items();
      items.forEach(it => it.classList.remove('highlighted'));
      _highlightIdx = idx;
      if (idx >= 0 && idx < items.length) {
        items[idx].classList.add('highlighted');
        items[idx].scrollIntoView({ block: 'nearest' });
      }
    }

    function _position(inp) {
      const r          = inp.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom - 8;
      const spaceAbove = r.top - 8;
      const maxH       = Math.min(280, Math.max(spaceBelow, spaceAbove) - 8);
      el.style.maxHeight = maxH + 'px';
      el.style.width     = Math.max(r.width, 260) + 'px';
      el.style.left      = r.left + 'px';
      if (spaceBelow >= 140 || spaceBelow >= spaceAbove) {
        el.style.top    = (r.bottom + 6) + 'px';
        el.style.bottom = 'auto';
      } else {
        el.style.top    = 'auto';
        el.style.bottom = (window.innerHeight - r.top + 6) + 'px';
      }
    }

    function open(inp, query, onSelect) {
      _activeInp    = inp;
      _activeCb     = onSelect;
      _highlightIdx = -1;
      const q = (query || '').toLowerCase().trim();

      const matches = getIncomeLedgers()
        .filter(l => {
          const nm = l.name.toLowerCase().includes(q);
          const ak = l.aliases && l.aliases.some(a => a.toLowerCase().includes(q));
          return nm || ak;
        })
        .sort((a, b) => {
          const as = a.name.toLowerCase().startsWith(q) ? 0 : 1;
          const bs = b.name.toLowerCase().startsWith(q) ? 0 : 1;
          return as - bs || a.name.localeCompare(b.name);
        });

      el.innerHTML = '';

      if (!matches.length) {
        el.innerHTML = `
          <div class="je-drop-empty">
            <svg class="je-drop-empty-icon" width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="14" cy="14" r="9" stroke="currentColor" stroke-width="1.8"/>
              <path d="M21 21l6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
            <span class="je-drop-empty-txt">No revenue account found</span>
            <span class="je-drop-empty-sub">Try a different name or add it in Chart of Accounts</span>
          </div>`;
      } else {
        const hdr = document.createElement('div');
        hdr.className   = 'je-drop-header';
        hdr.textContent = 'Income / Revenue Accounts';
        el.appendChild(hdr);

        matches.forEach(acct => {
          const item = document.createElement('div');
          item.className = 'je-drop-item';
          const akaStr = acct.aliases && acct.aliases.length > 0 ? ` [A.K.A: ${acct.aliases.join(', ')}]` : '';
          
          const queryHighlight = (text, pat) => {
            if (!pat) return text;
            const idx = text.toLowerCase().indexOf(pat.toLowerCase());
            if (idx < 0) return text;
            return text.slice(0, idx)
              + `<span class="je-drop-hl">${text.slice(idx, idx + pat.length)}</span>`
              + text.slice(idx + pat.length);
          };

          item.innerHTML = `
            <span class="je-drop-dot" style="background:#10b981"></span>
            <span class="je-drop-name">${queryHighlight(acct.name, q)}${akaStr ? `<span style="font-size:11px;color:#94a3b8;margin-left:4px">${queryHighlight(akaStr, q)}</span>` : ''}</span>
            ${acct.code ? `<span class="je-drop-code">${acct.code}</span>` : ''}
          `;
          item.addEventListener('mousedown', e => {
            e.preventDefault();
            close();
            if (_activeCb) _activeCb(acct);
          });
          el.appendChild(item);
        });
      }

      _position(inp);
      el.classList.add('open');
      _open = true;
    }

    function close() {
      el.classList.remove('open');
      _open         = false;
      _highlightIdx = -1;
      _activeInp    = null;
    }

    function isOpen()         { return _open; }
    function moveHighlight(d) {
      const items = _items();
      if (!items.length) return;
      _setHL(Math.max(0, Math.min(_highlightIdx + d, items.length - 1)));
    }
    function selectHighlighted() {
      const items = _items();
      const idx   = _highlightIdx >= 0 ? _highlightIdx : 0;
      if (items[idx]) items[idx].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    }

    function _reposition() { if (_open && _activeInp) _position(_activeInp); }
    window.addEventListener('scroll', _reposition, true);
    window.addEventListener('resize', _reposition);

    document.addEventListener('mousedown', e => {
      if (_open && !el.contains(e.target) && e.target !== _activeInp) close();
    });

    return { open, close, isOpen, moveHighlight, selectHighlighted };
  })();

  // ══════════════════════════════════════════════════════════════════
  //  SALES FORM — Row rendering, totals calculation, invoice/order autofill, form init
  //  (Split from sales.js for maintainability)
  // ══════════════════════════════════════════════════════════════════

  function getNextAutoInvoiceNumber() {
    const year = new Date().getFullYear();
    if (currentSalesVoucherSubtype === 'Return') {
      const ctr = window.KYA_STORE.salesReturnCtr || 1;
      return `REV-${year}-${String(ctr).padStart(3, '0')}`;
    } else if (currentSalesVoucherSubtype === 'Order') {
      const ctr = window.KYA_STORE.salesOrderCtr || 1;
      return `SO-${year}-${String(ctr).padStart(3, '0')}`;
    } else {
      const ctr = window.KYA_STORE.salesInvoiceCtr || 1;
      return `INV-${year}-${String(ctr).padStart(3, '0')}`;
    }
  }

  function setInvoiceNoMode(mode) {
    currentSalesInvoiceMode = 'Auto';
    const invNoEl = document.getElementById('salesInvoiceNo');
    const chipEl = document.getElementById('salesVoucherChipDisplay');
    
    if (!invNoEl || !chipEl) return;

    if (mode === 'Auto') {
      invNoEl.value = getNextAutoInvoiceNumber();
      chipEl.textContent = invNoEl.value;
    }
    
    if (invNoEl) {
      let ph = 'INV-2026-001';
      if (currentSalesVoucherSubtype === 'Return') ph = 'REV-2026-001';
      else if (currentSalesVoucherSubtype === 'Order') ph = 'SO-2026-001';
      invNoEl.placeholder = ph;
    }
    
    invNoEl.removeAttribute('readonly');
    invNoEl.style.background = '#fff';
    invNoEl.style.color = 'var(--slate-900)';
  }

  function populateSalesCustomers(selectedId = null) {
    const custSelect = document.getElementById('salesCustomer');
    if (!custSelect) return;
    
    custSelect.innerHTML = '<option value="">&mdash; Select Customer &mdash;</option>';
    
    const customers = coaLedgers.filter(l => l.type === 'ledger' && l.sgId === 'sg-tr');
    customers.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      const akaStr = c.aliases && c.aliases.length > 0 ? ` [A.K.A: ${c.aliases.join(', ')}]` : '';
      opt.textContent = c.name + akaStr;
      if (selectedId && c.id == selectedId) {
        opt.selected = true;
      }
      custSelect.appendChild(opt);
    });
  }

  function populateSalesExecutives(selectedId = null) {
    const execSelect = document.getElementById('salesExecutive');
    if (!execSelect) return;
    
    execSelect.innerHTML = '<option value="">&mdash; Select Sales Executive &mdash;</option>';
    
    ohEmployees.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = `${e.name} (${e.code})`;
      if (selectedId && e.id == selectedId) {
        opt.selected = true;
      }
      execSelect.appendChild(opt);
    });
  }

  function handleSupplyTypeChange() {
    const supplyType = document.getElementById('salesSupplyType').value;
    const isZeroTax = supplyType === 'Export (Zero-Rated / LUT)' || supplyType === 'SEZ Without Tax';
    
    salesRows.forEach(row => {
      if (isZeroTax) {
        row.tax = 0;
        const base = currentSalesType === 'Product' ? (row.qty * row.rate) : row.baseAmount;
        const discAmt = row.discountType === 'pct' ? (base * (row.discount / 100)) : row.discount;
        row.amount = Math.max(0, base - discAmt);
      }
    });
    
    renderSalesRows();
    recalculateSalesTotals();
  }

  function populateSalesPaymentAccounts(selectedId = null) {
    const paySelect = document.getElementById('salesPaymentAccount');
    if (!paySelect) return;
    
    paySelect.innerHTML = '<option value="">&mdash; Select &mdash;</option>';
    
    const accounts = coaLedgers.filter(l => l.type === 'ledger' && l.sgId === 'sg-cce');
    accounts.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.name;
      if (selectedId && a.id == selectedId) {
        opt.selected = true;
      }
      paySelect.appendChild(opt);
    });
  }

  function getSalesPaymentStatus() {
    const fullBtn = document.getElementById('salesPaymentStatusFull');
    const partBtn = document.getElementById('salesPaymentStatusPartial');
    
    if (currentSalesVoucherSubtype === 'Return') {
      if (fullBtn && fullBtn.classList.contains('active')) return 'Full Refund';
      if (partBtn && partBtn.classList.contains('active')) return 'Partial Refund';
      return 'No Refund';
    }
    
    const orderNo = document.getElementById('salesOrderNo')?.value?.trim();
    let orderAdvanceAmount = 0;
    let total = calculateSubtotal();
    let tdsTcsMode = 'None';
    const tdsBtn = document.getElementById('salesTdsTcsTds');
    const tcsBtn = document.getElementById('salesTdsTcsTcs');
    if (tdsBtn && tdsBtn.classList.contains('active')) tdsTcsMode = 'TDS';
    if (tcsBtn && tcsBtn.classList.contains('active')) tdsTcsMode = 'TCS';
    const rateSelect = document.getElementById('salesTdsTcsRateSelect');
    let rate = 0;
    if (tdsTcsMode !== 'None' && rateSelect) {
      if (rateSelect.value === 'custom') {
        const customInput = document.getElementById('salesTdsTcsRateCustom');
        rate = customInput ? (parseFloat(customInput.value) || 0) : 0;
      } else {
        rate = parseFloat(rateSelect.value) || 0;
      }
    }
    const amountInput = document.getElementById('salesTdsTcsAmount');
    const tdsTcsAmount = amountInput ? (parseFloat(amountInput.value) || 0) : 0;
    const adjustmentsInput = document.getElementById('salesAdjustments');
    const adjustments = adjustmentsInput ? (parseFloat(adjustmentsInput.value) || 0) : 0;
    
    let grandTotal = total;
    if (tdsTcsMode === 'TDS') grandTotal = total - tdsTcsAmount;
    else if (tdsTcsMode === 'TCS') grandTotal = total + tdsTcsAmount;
    grandTotal += adjustments;

    let isOrderLinked = false;
    if (currentSalesVoucherSubtype === 'Invoice' && orderNo) {
      const linkedOrder = (window.KYA_STORE.salesVouchers || []).find(v => v.isOrder && v.invoiceNo.toLowerCase() === orderNo.toLowerCase());
      if (linkedOrder) {
        isOrderLinked = true;
        if (linkedOrder.paymentStatus === 'Full Payment') {
          orderAdvanceAmount = linkedOrder.total;
        } else if (linkedOrder.paymentStatus === 'Partial Payment') {
          orderAdvanceAmount = linkedOrder.paymentAmount || 0;
        }
      }
    }
    const excessAmount = isOrderLinked ? Math.max(0, orderAdvanceAmount - grandTotal) : 0;

    if (excessAmount > 0) {
      if (fullBtn && fullBtn.classList.contains('active')) return 'Full Refund';
      if (partBtn && partBtn.classList.contains('active')) return 'Partial Refund';
      return 'Not Refunded';
    } else {
      if (fullBtn && fullBtn.classList.contains('active')) return 'Full Payment';
      if (partBtn && partBtn.classList.contains('active')) return 'Partial Payment';
      return 'Not Paid';
    }
  }

  function getOrCreateSystemLedger(name, sgId) {
    let ldg = coaLedgers.find(l => l.type === 'ledger' && l.name.toLowerCase() === name.toLowerCase());
    if (!ldg) {
      const newId = Date.now() + _coaLedgerCtr++;
      ldg = {
        id: newId,
        sgId: sgId,
        glId: null,
        name: name,
        code: '',
        openingBalance: 0,
        type: 'ledger'
      };
      coaLedgers.push(ldg);
      
      const sg = COA_SYS_SGS.find(s => s.id === sgId);
      if (sg) {
        _coaExpanded.add(sgId);
        if (sg.parent) _coaExpanded.add(sg.parent);
        _coaExpanded.add(sg.main);
      }
      
      renderChartPanel();
      refreshAllReports();
      triggerAutoBackup();
    }
    return ldg.id;
  }

  function getIncomeLedgers() {
    let list = coaLedgers.filter(l => l.type === 'ledger' && (l.sgId === 'sg-rfo' || l.sgId === 'sg-oi'));
    if (list.length === 0) {
      getOrCreateSystemLedger('Sales Account', 'sg-rfo');
      list = coaLedgers.filter(l => l.type === 'ledger' && (l.sgId === 'sg-rfo' || l.sgId === 'sg-oi'));
    }
    return list;
  }

  function renderSalesHeaders() {
    const headerRow = document.getElementById('salesTableHeader');
    if (!headerRow) return;
    
    if (currentSalesType === 'Product') {
      headerRow.innerHTML = `
        <th class="col-item">Item Name</th>
        <th class="col-qty" style="width: 80px; text-align: right;">Qty</th>
        <th class="col-rate" style="width: 120px; text-align: right;">Rate</th>
        <th class="col-disc" style="width: 140px; text-align: right;">Discount</th>
        <th class="col-tax" style="width: 100px; text-align: right; padding-right: 28px;">Tax</th>
        <th class="col-amt" style="width: 140px; text-align: right;">Amount</th>
        <th class="col-del" style="width: 50px; text-align: center;"></th>
      `;
    } else {
      headerRow.innerHTML = `
        <th class="col-item">Revenue Account</th>
        <th class="col-rate" style="width: 150px; text-align: right;">Base Amount</th>
        <th class="col-disc" style="width: 140px; text-align: right;">Discount</th>
        <th class="col-tax" style="width: 100px; text-align: right; padding-right: 28px;">Tax</th>
        <th class="col-amt" style="width: 140px; text-align: right;">Amount</th>
        <th class="col-del" style="width: 50px; text-align: center;"></th>
      `;
    }
  }

  function renderSalesRows() {
    renderSalesHeaders();
    const body = document.getElementById('salesItemBody');
    if (!body) return;
    
    body.innerHTML = '';
    const incomeLedgers = getIncomeLedgers();
    const isLocked = isSalesReturnInvoiceSelected();
    
    const supplyTypeEl = document.getElementById('salesSupplyType');
    const isZeroTax = supplyTypeEl && (supplyTypeEl.value === 'Export (Zero-Rated / LUT)' || supplyTypeEl.value === 'SEZ Without Tax');
    
    salesRows.forEach((row, index) => {
      if (isZeroTax) {
        row.tax = 0;
        const base = currentSalesType === 'Product' ? (row.qty * row.rate) : row.baseAmount;
        const discAmt = row.discountType === 'pct' ? (base * (row.discount / 100)) : row.discount;
        row.amount = Math.max(0, base - discAmt);
      }

      let trHtml = '';
      if (currentSalesType === 'Product') {
        trHtml = `
          <tr class="sales-row" data-row-index="${index}">
            <td>
              <input type="text" class="sales-row-item je-input" value="${ohEsc(row.item || '')}" placeholder="Item Description" style="border: none; background: transparent; box-shadow: none; padding: 0; ${isLocked ? 'cursor: not-allowed; color: var(--slate-500);' : ''}" ${isLocked ? 'readonly' : ''} />
            </td>
            <td style="width: 80px;">
              <input type="number" class="sales-row-qty je-input" value="${row.qty}" min="0" style="border: none; background: transparent; box-shadow: none; text-align: right; padding: 0;" />
            </td>
            <td style="width: 120px;">
              <input type="text" inputmode="decimal" class="sales-row-rate je-input" value="${row.rate === 0 ? '' : (typeof row.rate === 'number' ? row.rate.toFixed(2) : row.rate)}" placeholder="0.00" style="border: none; background: transparent; box-shadow: none; text-align: right; padding: 0;" />
            </td>
            <td style="width: 140px;">
              <div style="display: flex; gap: 4px; align-items: center; justify-content: flex-end;">
                <input type="text" inputmode="decimal" class="sales-row-discount je-input" value="${row.discount === 0 ? '' : (typeof row.discount === 'number' ? row.discount.toFixed(2) : row.discount)}" placeholder="0.00" style="border: none; background: transparent; box-shadow: none; text-align: right; width: 70px; padding: 0;" />
                <select class="sales-row-discount-type je-input" style="border: none; background: transparent; box-shadow: none; width: 30px; padding: 0; font-weight: 600; cursor: pointer; text-align: center; text-align-last: center; -webkit-appearance: none; -moz-appearance: none; appearance: none; ${isLocked ? 'cursor: not-allowed; color: var(--slate-500);' : ''}" ${isLocked ? 'disabled' : ''}>
                  <option value="val" ${row.discountType === 'val' || !row.discountType ? 'selected' : ''}>₹</option>
                  <option value="pct" ${row.discountType === 'pct' ? 'selected' : ''}>%</option>
                </select>
              </div>
            </td>
            <td style="width: 100px;">
              <select class="sales-row-tax je-input" style="border: none; background: transparent; box-shadow: none; text-align: right; text-align-last: right; padding-right: 16px;" ${isZeroTax ? 'disabled' : ''}>
                <option value="0" ${row.tax === 0 ? 'selected' : ''}>0%</option>
                <option value="5" ${row.tax === 5 ? 'selected' : ''}>5%</option>
                <option value="12" ${row.tax === 12 ? 'selected' : ''}>12%</option>
                <option value="18" ${row.tax === 18 ? 'selected' : ''}>18%</option>
                <option value="28" ${row.tax === 28 ? 'selected' : ''}>28%</option>
              </select>
            </td>
            <td style="width: 140px;">
              <input type="text" inputmode="decimal" class="sales-row-amount-input je-input" value="${row.amount === 0 ? '' : row.amount.toFixed(2)}" placeholder="0.00" style="border: none; background: transparent; box-shadow: none; text-align: right; padding: 0; font-weight: 600; width: 100%;" />
            </td>
            <td style="width: 50px; text-align: center;">
              <button type="button" class="sales-del-row" style="background: none; border: none; color: var(--red-600); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%;" onmouseover="this.style.backgroundColor='var(--red-50)'" onmouseout="this.style.backgroundColor='transparent'">
                <svg viewBox="0 0 15 15" fill="none" style="width: 14px; height: 14px;">
                  <path d="M5.5 2h4M1.5 4h12M2.5 4l1 9.5a1 1 0 001 .5h6a1 1 0 001-.5l1-9.5M5.5 6.5v5M9.5 6.5v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                </svg>
              </button>
            </td>
          </tr>
        `;
      } else {
        trHtml = `
          <tr class="sales-row" data-row-index="${index}">
            <td>
              <select class="sales-row-rev-acc je-input" style="border: none; background: transparent; box-shadow: none; padding: 0; ${isLocked ? 'cursor: not-allowed; color: var(--slate-500);' : ''}" ${isLocked ? 'disabled' : ''}>
                <option value="">&mdash; Select Revenue Account &mdash;</option>
                ${incomeLedgers.map(l => {
                  const akaStr = l.aliases && l.aliases.length > 0 ? ` [A.K.A: ${l.aliases.join(', ')}]` : '';
                  return `<option value="${l.id}" ${row.revenueLedgerId == l.id ? 'selected' : ''}>${l.name}${akaStr}</option>`;
                }).join('')}
              </select>
            </td>
            <td style="width: 150px;">
              <input type="text" inputmode="decimal" class="sales-row-base je-input" value="${row.baseAmount === 0 ? '' : (typeof row.baseAmount === 'number' ? row.baseAmount.toFixed(2) : row.baseAmount)}" placeholder="0.00" style="border: none; background: transparent; box-shadow: none; text-align: right; padding: 0;" />
            </td>
            <td style="width: 140px;">
              <div style="display: flex; gap: 4px; align-items: center; justify-content: flex-end;">
                <input type="text" inputmode="decimal" class="sales-row-discount je-input" value="${row.discount === 0 ? '' : (typeof row.discount === 'number' ? row.discount.toFixed(2) : row.discount)}" placeholder="0.00" style="border: none; background: transparent; box-shadow: none; text-align: right; width: 70px; padding: 0;" />
                <select class="sales-row-discount-type je-input" style="border: none; background: transparent; box-shadow: none; width: 30px; padding: 0; font-weight: 600; cursor: pointer; text-align: center; text-align-last: center; -webkit-appearance: none; -moz-appearance: none; appearance: none; ${isLocked ? 'cursor: not-allowed; color: var(--slate-500);' : ''}" ${isLocked ? 'disabled' : ''}>
                  <option value="val" ${row.discountType === 'val' || !row.discountType ? 'selected' : ''}>₹</option>
                  <option value="pct" ${row.discountType === 'pct' ? 'selected' : ''}>%</option>
                </select>
              </div>
            </td>
            <td style="width: 100px;">
              <select class="sales-row-tax je-input" style="border: none; background: transparent; box-shadow: none; text-align: right; text-align-last: right; padding-right: 16px;" ${isZeroTax ? 'disabled' : ''}>
                <option value="0" ${row.tax === 0 ? 'selected' : ''}>0%</option>
                <option value="5" ${row.tax === 5 ? 'selected' : ''}>5%</option>
                <option value="12" ${row.tax === 12 ? 'selected' : ''}>12%</option>
                <option value="18" ${row.tax === 18 ? 'selected' : ''}>18%</option>
                <option value="28" ${row.tax === 28 ? 'selected' : ''}>28%</option>
              </select>
            </td>
            <td style="width: 140px;">
              <input type="text" inputmode="decimal" class="sales-row-amount-input je-input" value="${row.amount === 0 ? '' : row.amount.toFixed(2)}" placeholder="0.00" style="border: none; background: transparent; box-shadow: none; text-align: right; padding: 0; font-weight: 600; width: 100%;" />
            </td>
            <td style="width: 50px; text-align: center;">
              <button type="button" class="sales-del-row" style="background: none; border: none; color: var(--red-600); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%;" onmouseover="this.style.backgroundColor='var(--red-50)'" onmouseout="this.style.backgroundColor='transparent'">
                <svg viewBox="0 0 15 15" fill="none" style="width: 14px; height: 14px;">
                  <path d="M5.5 2h4M1.5 4h12M2.5 4l1 9.5a1 1 0 001 .5h6a1 1 0 001-.5l1-9.5M5.5 6.5v5M9.5 6.5v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                </svg>
              </button>
            </td>
          </tr>
        `;
      }
      
      const tempDiv = document.createElement('tbody');
      tempDiv.innerHTML = trHtml;
      const tr = tempDiv.firstElementChild;
      body.appendChild(tr);
    });
  }

  function addSalesRow() {
    if (currentSalesType === 'Product') {
      salesRows.push({ item: '', qty: 1, rate: 0, discount: 0, discountType: 'val', tax: 18, amount: 0 });
    } else {
      salesRows.push({ revenueLedgerId: '', baseAmount: 0, discount: 0, discountType: 'val', tax: 18, amount: 0 });
    }
    renderSalesRows();
    recalculateSalesTotals();
  }

  function switchSalesType(type) {
    currentSalesType = type;
    salesRows = [];
    addSalesRow();
  }

  function updateRowFromDOM(index, tr, triggeredBy) {
    const row = salesRows[index];
    if (!row) return;

    const amtInput  = tr.querySelector('.sales-row-amount-input');
    const amountEdited = (triggeredBy === 'amount');

    if (currentSalesType === 'Product') {
      row.item = tr.querySelector('.sales-row-item').value;

      let qty      = parseFloat(tr.querySelector('.sales-row-qty').value) || 0;
      let rate     = Math.round(parseSalesAmt(tr.querySelector('.sales-row-rate').value) * 100) / 100;
      let discount = parseSalesAmt(tr.querySelector('.sales-row-discount').value);
      row.discountType = tr.querySelector('.sales-row-discount-type').value;
      row.tax = parseFloat(tr.querySelector('.sales-row-tax').value) || 0;

      if (amountEdited) {
        const enteredAmount = Math.round(parseSalesAmt(amtInput.value) * 100) / 100;
        if (amtInput && document.activeElement !== amtInput) {
          amtInput.value = enteredAmount === 0 ? '' : enteredAmount.toFixed(2);
        }
        
        const taxFactor     = 1 + row.tax / 100;
        const afterDiscount = enteredAmount / taxFactor;
        let base;
        if (row.discountType === 'pct') {
          const pctFactor = 1 - (discount / 100);
          base = pctFactor > 0 ? afterDiscount / pctFactor : 0;
        } else {
          base = afterDiscount + discount;
        }
        rate = Math.round((qty > 0 ? base / qty : 0) * 100) / 100;

        if (currentSalesVoucherSubtype === 'Return' && row.origRate !== undefined) {
          if (rate > row.origRate) {
            rate = row.origRate;
            showToast(`Rate cannot exceed original invoice rate of ₹${fmtNum(row.origRate)}.`, 'warning');
          }
        }

        row.qty      = qty;
        row.rate     = rate;
        row.discount = discount;
        row.amount   = enteredAmount;

        const rateInput = tr.querySelector('.sales-row-rate');
        if (rateInput && document.activeElement !== rateInput) {
          rateInput.value = rate === 0 ? '' : rate.toFixed(2);
        }
      } else {
        if (currentSalesVoucherSubtype === 'Return' && row.origQty !== undefined) {
          if (qty > row.origQty) {
            qty = row.origQty;
            tr.querySelector('.sales-row-qty').value = qty;
            showToast(`Quantity cannot exceed remaining quantity of ${row.origQty}.`, 'warning');
          }
          if (rate > row.origRate) {
            rate = row.origRate;
            const rateInput = tr.querySelector('.sales-row-rate');
            if (rateInput && document.activeElement !== rateInput) {
              rateInput.value = rate === 0 ? '' : rate.toFixed(2);
            }
            showToast(`Rate cannot exceed original invoice rate of ₹${fmtNum(row.origRate)}.`, 'warning');
          }
          if (discount > row.origDiscount) {
            discount = row.origDiscount;
            tr.querySelector('.sales-row-discount').value = discount === 0 ? '' : discount;
            showToast(`Discount cannot exceed remaining discount of ${row.origDiscountType === 'pct' ? '' : '₹'}${fmtNum(row.origDiscount)}${row.origDiscountType === 'pct' ? '%' : ''}.`, 'warning');
          }
        }

        row.qty      = qty;
        row.rate     = rate;
        row.discount = discount;

        const base          = row.qty * row.rate;
        const discAmt       = row.discountType === 'pct' ? (base * (row.discount / 100)) : row.discount;
        const afterDiscount = Math.max(0, base - discAmt);
        const taxAmt        = afterDiscount * (row.tax / 100);
        row.amount          = Math.round((afterDiscount + taxAmt) * 100) / 100;

        if (amtInput && document.activeElement !== amtInput) {
          amtInput.value = row.amount === 0 ? '' : row.amount.toFixed(2);
        }
      }
    } else {
      row.revenueLedgerId = tr.querySelector('.sales-row-rev-acc').value;

      let baseAmount = Math.round(parseSalesAmt(tr.querySelector('.sales-row-base').value) * 100) / 100;
      let discount   = parseSalesAmt(tr.querySelector('.sales-row-discount').value);
      row.discountType = tr.querySelector('.sales-row-discount-type').value;
      row.tax = parseFloat(tr.querySelector('.sales-row-tax').value) || 0;

      if (amountEdited) {
        const enteredAmount = Math.round(parseSalesAmt(amtInput.value) * 100) / 100;
        if (amtInput && document.activeElement !== amtInput) {
          amtInput.value = enteredAmount === 0 ? '' : enteredAmount.toFixed(2);
        }
        const taxFactor     = 1 + row.tax / 100;
        const afterDiscount = enteredAmount / taxFactor;
        let base;
        if (row.discountType === 'pct') {
          const pctFactor = 1 - (discount / 100);
          base = pctFactor > 0 ? afterDiscount / pctFactor : 0;
        } else {
          base = afterDiscount + discount;
        }
        baseAmount = Math.round(base * 100) / 100;

        if (currentSalesVoucherSubtype === 'Return' && row.origBaseAmount !== undefined) {
          if (baseAmount > row.origBaseAmount) {
            baseAmount = row.origBaseAmount;
            showToast(`Base Amount cannot exceed remaining base amount of ₹${fmtNum(row.origBaseAmount)}.`, 'warning');
          }
        }

        row.baseAmount = baseAmount;
        row.discount   = discount;
        row.amount     = enteredAmount;  // already 2dp

        const baseInput = tr.querySelector('.sales-row-base');
        if (baseInput && document.activeElement !== baseInput) {
          baseInput.value = baseAmount === 0 ? '' : baseAmount.toFixed(2);
        }
      } else {
        if (currentSalesVoucherSubtype === 'Return' && row.origBaseAmount !== undefined) {
          if (baseAmount > row.origBaseAmount) {
            baseAmount = row.origBaseAmount;
            const baseInput = tr.querySelector('.sales-row-base');
            if (baseInput && document.activeElement !== baseInput) {
              baseInput.value = baseAmount === 0 ? '' : baseAmount.toFixed(2);
            }
            showToast(`Base Amount cannot exceed remaining base amount of ₹${fmtNum(row.origBaseAmount)}.`, 'warning');
          }
          if (discount > row.origDiscount) {
            discount = row.origDiscount;
            tr.querySelector('.sales-row-discount').value = discount === 0 ? '' : discount;
            showToast(`Discount cannot exceed remaining discount of ${row.origDiscountType === 'pct' ? '' : '₹'}${fmtNum(row.origDiscount)}${row.origDiscountType === 'pct' ? '%' : ''}.`, 'warning');
          }
        }

        row.baseAmount = baseAmount;
        row.discount   = discount;

        const discAmt       = row.discountType === 'pct' ? (row.baseAmount * (row.discount / 100)) : row.discount;
        const afterDiscount = Math.max(0, row.baseAmount - discAmt);
        const taxAmt        = afterDiscount * (row.tax / 100);
        row.amount          = Math.round((afterDiscount + taxAmt) * 100) / 100;

        if (amtInput) amtInput.value = row.amount === 0 ? '' : row.amount.toFixed(2);
      }
    }

    recalculateSalesTotals();
  }

  function calculateSubtotal() {
    let sub = 0;
    salesRows.forEach(r => {
      sub += r.amount || 0;
    });
    return sub;
  }

  function autoCalculateSalesRoundOff() {
    const btnAuto = document.getElementById('btnSalesAutoRoundOff');
    const adjEl = document.getElementById('salesAdjustments');
    
    // Toggle OFF if already active and has value
    if (btnAuto && btnAuto.classList.contains('active') && adjEl && adjEl.value.trim() !== '') {
      adjEl.value = '';
      btnAuto.classList.remove('active');
      recalculateSalesTotals();
      return;
    }

    const subTotal = calculateSubtotal();
    
    let tdsTcsMode = 'None';
    const tdsBtn = document.getElementById('salesTdsTcsTds');
    const tcsBtn = document.getElementById('salesTdsTcsTcs');
    if (tdsBtn && tdsBtn.classList.contains('active')) tdsTcsMode = 'TDS';
    if (tcsBtn && tcsBtn.classList.contains('active')) tdsTcsMode = 'TCS';
    
    const amountInput = document.getElementById('salesTdsTcsAmount');
    const tdsTcsAmount = amountInput ? (parseSalesAmt(amountInput.value) || 0) : 0;
    
    let rawTotal = subTotal;
    if (tdsTcsMode === 'TDS') {
      rawTotal = subTotal - tdsTcsAmount;
    } else if (tdsTcsMode === 'TCS') {
      rawTotal = subTotal + tdsTcsAmount;
    }
    
    const roundedTotal = Math.round(rawTotal);
    const roundOffAmt = Math.round((roundedTotal - rawTotal) * 100) / 100;
    
    if (adjEl) {
      adjEl.value = roundOffAmt === 0 ? '' : roundOffAmt.toFixed(2);
      if (btnAuto) btnAuto.classList.add('active');
      recalculateSalesTotals();
    }
  }

  function recalculateSalesTotals() {
    const subTotal = calculateSubtotal();
    const subTotalEl = document.getElementById('salesSubTotal');
    if (subTotalEl) subTotalEl.textContent = '₹ ' + fmtNum(subTotal);
    
    let tdsTcsMode = 'None';
    const tdsBtn = document.getElementById('salesTdsTcsTds');
    const tcsBtn = document.getElementById('salesTdsTcsTcs');
    if (tdsBtn && tdsBtn.classList.contains('active')) tdsTcsMode = 'TDS';
    if (tcsBtn && tcsBtn.classList.contains('active')) tdsTcsMode = 'TCS';
    
    const rateSelect = document.getElementById('salesTdsTcsRateSelect');
    const customWrap = document.getElementById('salesTdsTcsRateCustomWrap');
    let rate = 0;
    
    if (tdsTcsMode === 'None') {
      rate = 0;
    } else if (rateSelect) {
      if (rateSelect.value === 'custom') {
        if (customWrap) customWrap.style.display = 'block';
        const customInput = document.getElementById('salesTdsTcsRateCustom');
        rate = customInput ? (parseFloat(customInput.value) || 0) : 0;
      } else {
        if (customWrap) customWrap.style.display = 'none';
        rate = parseFloat(rateSelect.value) || 0;
      }
    }
    
    const rateLabel = document.getElementById('salesTdsTcsRateLabel');
    if (rateLabel) {
      rateLabel.textContent = (rate % 1 === 0 ? rate.toFixed(0) : (rate * 10 % 1 === 0 ? rate.toFixed(1) : rate.toFixed(2))) + '%';
    }
    
    const amountInput = document.getElementById('salesTdsTcsAmount');
    
    if (amountInput && document.activeElement !== amountInput) {
      if (tdsTcsMode !== 'None') {
        const calculatedAmt = subTotal * (rate / 100);
        amountInput.value = calculatedAmt.toFixed(2);
      } else {
        amountInput.value = '';
      }
    }
    
    const tdsTcsAmount = amountInput ? (parseFloat(amountInput.value) || 0) : 0;
    const adjustmentsInput = document.getElementById('salesAdjustments');
    const adjustments = adjustmentsInput ? (parseFloat(adjustmentsInput.value) || 0) : 0;

    const btnAuto = document.getElementById('btnSalesAutoRoundOff');
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
    
    const totalEl = document.getElementById('salesTotal');
    if (totalEl) totalEl.textContent = '₹ ' + fmtNum(total);

    // Adjust Payment Amount in real-time if it exceeds the new Grand Total or Balance Payment
    const payAmtEl = document.getElementById('salesPaymentAmount');
    if (payAmtEl) {
      const maxVal = getSalesPaymentMax(total);
      const orderNo = document.getElementById('salesOrderNo')?.value?.trim();
      const isOrderLinked = (currentSalesVoucherSubtype === 'Invoice' && orderNo);
      
      let orderAdvanceAmount = 0;
      if (isOrderLinked) {
        const linkedOrder = (window.KYA_STORE.salesVouchers || []).find(v => v.isOrder && v.invoiceNo.toLowerCase() === orderNo.toLowerCase());
        if (linkedOrder) {
          if (linkedOrder.paymentStatus === 'Full Payment') {
            orderAdvanceAmount = linkedOrder.total;
          } else if (linkedOrder.paymentStatus === 'Partial Payment') {
            orderAdvanceAmount = linkedOrder.paymentAmount || 0;
          }
        }
      }
      const excessAmount = Math.max(0, orderAdvanceAmount - total);

      if (isOrderLinked) {
        payAmtEl.max = excessAmount > 0 ? excessAmount : maxVal;
      } else if (currentSalesVoucherSubtype === 'Return' && payAmtEl.max) {
        // Keep return logic max as set in updateSalesReturnLockState
      } else {
        payAmtEl.removeAttribute('max');
      }
      
      if (payAmtEl.value && total > 0) {
        const currentVal = parseFloat(payAmtEl.value) || 0;
        const allowedMax = (isOrderLinked && excessAmount > 0) ? excessAmount : maxVal;
        if (currentVal > allowedMax) {
          payAmtEl.value = allowedMax.toFixed(2);
          const limitMsg = (isOrderLinked && excessAmount > 0)
            ? `Refund Amount adjusted to ₹${fmtNum(allowedMax)} to not exceed the excess refund amount.`
            : (isOrderLinked 
               ? `Payment Amount adjusted to ₹${fmtNum(allowedMax)} to not exceed the balance payment.`
               : `Payment Amount adjusted to ₹${fmtNum(allowedMax)} to not exceed the Grand Total.`);
          showToast(limitMsg, 'warning');
        }
      }
    }
    
    // Show/hide Refund Info Message banner
    const refundInfoEl = document.getElementById('salesRefundInfoMessage');
    const payStatusWrapEl = document.querySelector('.sales-paystatus-wrap');
    if (refundInfoEl && payStatusWrapEl) {
      let orderAdvanceAmount = 0;
      const orderNo = document.getElementById('salesOrderNo')?.value?.trim();
      const isOrderLinked = (currentSalesVoucherSubtype === 'Invoice' && orderNo);
      
      if (isOrderLinked) {
        const linkedOrder = (window.KYA_STORE.salesVouchers || []).find(v => v.isOrder && v.invoiceNo.toLowerCase() === orderNo.toLowerCase());
        if (linkedOrder) {
          if (linkedOrder.paymentStatus === 'Full Payment') {
            orderAdvanceAmount = linkedOrder.total;
          } else if (linkedOrder.paymentStatus === 'Partial Payment') {
            orderAdvanceAmount = linkedOrder.paymentAmount || 0;
          }
        }
      }
      
      const excessAmount = Math.max(0, orderAdvanceAmount - total);
      if (isOrderLinked && excessAmount > 0) {
        payStatusWrapEl.style.display = 'flex';
        refundInfoEl.style.display = 'block';
        
        const payStatus = getSalesPaymentStatus();
        if (payStatus === 'Full Refund') {
          refundInfoEl.textContent = `Refund due: ₹${fmtNum(excessAmount)} (Fully Refunded now). This will be paid from the selected Payment Account.`;
        } else if (payStatus === 'Partial Refund') {
          const refundAmt = parseFloat(document.getElementById('salesPaymentAmount')?.value) || 0;
          const remaining = Math.max(0, excessAmount - refundAmt);
          refundInfoEl.textContent = `Refund due: ₹${fmtNum(excessAmount)} (₹${fmtNum(refundAmt)} refunded now, ₹${fmtNum(remaining)} Refund Payable).`;
        } else {
          refundInfoEl.textContent = `Refund due: ₹${fmtNum(excessAmount)} (Refund later). This will be recorded under Refund Payable and will set status to Not Refunded.`;
        }
      } else {
        payStatusWrapEl.style.display = 'flex';
        refundInfoEl.style.display = 'none';
        refundInfoEl.textContent = '';
      }
    }
    
    updateSalesPaymentUI();
  }

  function updateVoucherSubtypeUI() {
    const newSalesBtn = document.getElementById('btnNewSales');
    const returnBtn = document.getElementById('btnSalesReturn');
    const orderBtn = document.getElementById('btnSalesOrder');
    const cardTitle = document.querySelector('#panel-sales-voucher .je-card-title-text');
    const cardSubtitle = document.querySelector('#panel-sales-voucher .je-card-subtitle-text');
    const invoiceNoLabel = document.getElementById('lblSalesInvoiceNo');
    const invoiceNoInput = document.getElementById('salesInvoiceNo');
    const selectWrap = document.getElementById('salesInvoiceSelectWrap');
    const invoiceNoContainer = document.getElementById('salesInvoiceNoContainer');
    const orderNoContainer = document.getElementById('salesOrderNoContainer');
    const postSalesBtn = document.getElementById('btnPostSales');

    if (invoiceNoLabel) invoiceNoLabel.textContent = 'Invoice No.';

    const activeBtn = (btn) => {
      if (btn) {
        btn.className = 'btn btn-primary';
        btn.style.background = 'var(--blue-700)';
        btn.style.color = '#fff';
        btn.style.borderColor = 'var(--blue-700)';
      }
    };
    const deactiveBtn = (btn) => {
      if (btn) {
        btn.className = 'btn-sales-action';
        btn.style.background = 'var(--white)';
        btn.style.color = 'var(--slate-600)';
        btn.style.borderColor = 'var(--slate-200)';
      }
    };

    deactiveBtn(newSalesBtn);
    deactiveBtn(returnBtn);
    deactiveBtn(orderBtn);

    if (currentSalesVoucherSubtype === 'Return') {
      activeBtn(returnBtn);
      if (cardTitle) cardTitle.textContent = 'Sales Reversal';
      if (cardSubtitle) cardSubtitle.textContent = 'Record sales reversals and customer credits';
      if (invoiceNoContainer) invoiceNoContainer.style.display = 'block';
      if (invoiceNoLabel) invoiceNoLabel.textContent = 'Original Doc';
      if (invoiceNoInput) invoiceNoInput.style.display = 'none';
      if (selectWrap) {
        selectWrap.style.display = 'block';
        refreshSalesInvoiceDropdownOptions();
      }
      if (orderNoContainer) orderNoContainer.style.display = 'block';
      if (postSalesBtn) {
        postSalesBtn.innerHTML = `<svg viewBox="0 0 15 15" fill="none" style="width:14px; height:14px; margin-right:6px; display:inline-block; vertical-align:middle;"><path d="M2.5 8l4 4 6-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> Post Reversal`;
      }
    } else if (currentSalesVoucherSubtype === 'Order') {
      activeBtn(orderBtn);
      if (cardTitle) cardTitle.textContent = 'Sales Pre Invoice';
      if (cardSubtitle) cardSubtitle.textContent = 'Record pre-invoices without impact on books';
      if (invoiceNoContainer) invoiceNoContainer.style.display = 'block';
      if (invoiceNoLabel) invoiceNoLabel.textContent = 'Pre Invoice No.';
      if (invoiceNoInput) {
        invoiceNoInput.style.display = 'block';
        invoiceNoInput.placeholder = 'SO-2026-001';
      }
      if (selectWrap) selectWrap.style.display = 'none';
      if (orderNoContainer) orderNoContainer.style.display = 'none';
      if (postSalesBtn) {
        postSalesBtn.innerHTML = `<svg viewBox="0 0 15 15" fill="none" style="width:14px; height:14px; margin-right:6px; display:inline-block; vertical-align:middle;"><path d="M2.5 8l4 4 6-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> Place Order`;
      }
    } else {
      activeBtn(newSalesBtn);
      if (cardTitle) cardTitle.textContent = 'Sales Invoice';
      if (cardSubtitle) cardSubtitle.textContent = 'Record sales transactions and customer receivables';
      if (invoiceNoContainer) invoiceNoContainer.style.display = 'block';
      if (invoiceNoInput) {
        invoiceNoInput.style.display = 'block';
        invoiceNoInput.placeholder = 'INV-2026-001';
      }
      if (selectWrap) selectWrap.style.display = 'none';
      if (orderNoContainer) orderNoContainer.style.display = 'block';
      if (postSalesBtn) {
        postSalesBtn.innerHTML = `<svg viewBox="0 0 15 15" fill="none" style="width:14px; height:14px; margin-right:6px; display:inline-block; vertical-align:middle;"><path d="M2.5 8l4 4 6-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> Post Invoice`;
      }
    }
  }

  function refreshSalesInvoiceDropdownOptions(filter = '') {
    const optionsList = document.getElementById('salesInvoiceSelectOptionsList');
    const triggerText = document.getElementById('salesInvoiceSelectTriggerText');
    if (!optionsList || !triggerText) return;

    optionsList.innerHTML = '';
    
    // Get all posted invoices/orders that are NOT returns and NOT completely returned
    const invoices = (window.KYA_STORE.salesVouchers || []).filter(v => {
      if (v.isReturn) return false;
      if (v.isOrder) {
        // Only show orders that have NOT been converted to a sale (Invoice)
        const isConverted = (window.KYA_STORE.salesVouchers || []).some(inv => !inv.isOrder && !inv.isReturn && inv.orderNo && inv.orderNo.toLowerCase() === v.invoiceNo.toLowerCase());
        if (isConverted) return false;
      }
      const remainingRows = getInvoiceRemainingRows(v);
      if (v.type === 'Product') {
        return remainingRows.some(row => row.qty > 0);
      } else {
        return remainingRows.some(row => row.baseAmount > 0);
      }
    });
    
    const query = filter.toLowerCase().trim();
    let matchCount = 0;
    
    invoices.forEach(inv => {
      const custName = inv.customerId ? ((coaLedgers.find(l => l.id == inv.customerId) || { name: 'Customer' }).name) : 'No Customer';
      const docType = inv.isOrder ? 'Pre-Inv' : 'Inv';
      const text = `${docType}: ${inv.invoiceNo} - ${custName} (${inv.date}) - ₹${fmtNum(inv.total)}`;
      if (query && !text.toLowerCase().includes(query)) {
        return;
      }
      matchCount++;
      
      const item = document.createElement('div');
      item.style.padding = '8px 12px';
      item.style.fontSize = '13px';
      item.style.borderRadius = '6px';
      item.style.cursor = 'pointer';
      item.style.fontWeight = '500';
      item.style.color = 'var(--slate-700)';
      item.style.whiteSpace = 'nowrap';
      item.style.overflow = 'hidden';
      item.style.textOverflow = 'ellipsis';
      
      item.textContent = text;
      
      item.addEventListener('mouseover', () => {
        item.style.background = 'var(--slate-50)';
      });
      item.addEventListener('mouseout', () => {
        item.style.background = 'transparent';
      });
      
      item.addEventListener('click', () => {
        triggerText.textContent = inv.invoiceNo;
        
        autoFillFormFromInvoice(inv);
        
        const dropdown = document.getElementById('salesInvoiceSelectDropdown');
        if (dropdown) dropdown.style.display = 'none';
      });
      
      optionsList.appendChild(item);
    });
    
    if (matchCount === 0) {
      const noResult = document.createElement('div');
      noResult.style.padding = '8px 12px';
      noResult.style.fontSize = '12px';
      noResult.style.color = 'var(--slate-400)';
      noResult.style.textAlign = 'center';
      noResult.textContent = 'No matching documents';
      optionsList.appendChild(noResult);
    }
  }

  function autoFillFormFromInvoice(inv) {
    const custEl = document.getElementById('salesCustomer');
    if (custEl) {
      custEl.value = inv.customerId;
      populateSalesCustomers(inv.customerId);
    }
    
    const execEl = document.getElementById('salesExecutive');
    if (execEl) {
      execEl.value = inv.salesExecutiveId || '';
      populateSalesExecutives(inv.salesExecutiveId);
    }
    
    const supplyTypeEl = document.getElementById('salesSupplyType');
    if (supplyTypeEl) {
      supplyTypeEl.value = inv.salesSupplyType || 'Intra-State (CGST + SGST)';
    }
    
    const notesEl = document.getElementById('salesNotes');
    if (notesEl) {
      const docLabel = inv.isOrder ? 'pre-invoice' : 'invoice';
      notesEl.value = `Return against ${docLabel} ${inv.invoiceNo}. ${inv.notes || ''}`;
    }
    
    const adjEl = document.getElementById('salesAdjustments');
    if (adjEl) {
      adjEl.value = inv.adjustments || '';
    }
    
    const noneBtn = document.getElementById('salesTdsTcsNone');
    const tdsBtn = document.getElementById('salesTdsTcsTDS');
    const tcsBtn = document.getElementById('salesTdsTcsTCS');
    if (inv.tdsTcsMode === 'TDS' && tdsBtn) tdsBtn.click();
    else if (inv.tdsTcsMode === 'TCS' && tcsBtn) tcsBtn.click();
    else if (noneBtn) noneBtn.click();
    
    const rateSelect = document.getElementById('salesTdsTcsRateSelect');
    const customInput = document.getElementById('salesTdsTcsRateCustom');
    const customWrap = document.getElementById('salesTdsTcsRateCustomWrap');
    const rateVal = inv.tdsTcsRate || 0;
    if (rateSelect) {
      if (rateSelect.querySelector(`option[value="${rateVal}"]`)) {
        rateSelect.value = String(rateVal);
        if (customWrap) customWrap.style.display = 'none';
      } else {
        rateSelect.value = 'custom';
        if (customInput) customInput.value = rateVal;
        if (customWrap) customWrap.style.display = 'block';
      }
    }
    
    currentSalesType = inv.type;
    const prodBtn = document.getElementById('salesTypeProduct');
    const servBtn = document.getElementById('salesTypeService');
    const typeBg = document.getElementById('salesTypeBg');
    if (inv.type === 'Product') {
      if (prodBtn) prodBtn.classList.add('active');
      if (servBtn) servBtn.classList.remove('active');
      if (typeBg) {
        typeBg.classList.add('prod-active');
        typeBg.classList.remove('serv-active');
      }
    } else {
      if (servBtn) servBtn.classList.add('active');
      if (prodBtn) prodBtn.classList.remove('active');
      if (typeBg) {
        typeBg.classList.add('serv-active');
        typeBg.classList.remove('prod-active');
      }
    }
    
    const remainingRows = getInvoiceRemainingRows(inv);
    salesRows = remainingRows.filter(row => {
      if (inv.type === 'Product') {
        return row.qty > 0;
      } else {
        return row.baseAmount > 0;
      }
    });
    salesRows.forEach(row => {
      row.origQty = row.qty;
      row.origRate = row.rate;
      row.origDiscount = row.discount;
      row.origDiscountType = row.discountType;
      row.origBaseAmount = row.baseAmount;
    });
    renderSalesRows();
    updateSalesReturnLockState();
    recalculateSalesTotals();
  }

  function refreshSalesOrderDropdownOptions(filter = '') {
    const optionsList = document.getElementById('salesOrderSelectOptionsList');
    const triggerText = document.getElementById('salesOrderSelectTriggerText');
    const orderEl = document.getElementById('salesOrderNo');
    if (!optionsList || !triggerText || !orderEl) return;

    optionsList.innerHTML = '';
    
    // Default "None" option
    const noneItem = document.createElement('div');
    noneItem.style.padding = '8px 12px';
    noneItem.style.fontSize = '13px';
    noneItem.style.borderRadius = '6px';
    noneItem.style.cursor = 'pointer';
    noneItem.style.fontWeight = '600';
    noneItem.style.color = 'var(--slate-500)';
    noneItem.textContent = 'None';
    
    noneItem.addEventListener('mouseover', () => {
      noneItem.style.background = 'var(--slate-50)';
    });
    noneItem.addEventListener('mouseout', () => {
      noneItem.style.background = 'transparent';
    });
    noneItem.addEventListener('click', () => {
      triggerText.textContent = 'None';
      orderEl.value = '';
      
      const dropdown = document.getElementById('salesOrderSelectDropdown');
      if (dropdown) dropdown.style.display = 'none';
      recalculateSalesTotals();
    });
    optionsList.appendChild(noneItem);

    // Get all posted sales orders (excluding those already converted to a posted sales invoice)
    const postedInvoices = (window.KYA_STORE.salesVouchers || []).filter(v => !v.isOrder && !v.isReturn);
    const convertedOrderNos = new Set(postedInvoices.map(inv => inv.orderNo).filter(no => !!no));
    const orders = (window.KYA_STORE.salesVouchers || []).filter(v => v.isOrder && !convertedOrderNos.has(v.invoiceNo));
    
    const query = filter.toLowerCase().trim();
    let matchCount = 0;
    
    orders.forEach(order => {
      const custName = order.customerId ? ((coaLedgers.find(l => l.id == order.customerId) || { name: 'Customer' }).name) : 'No Customer';
      const text = `${order.invoiceNo} - ${custName} (${order.date}) - ₹${fmtNum(order.total)}`;
      if (query && !text.toLowerCase().includes(query)) {
        return;
      }
      matchCount++;
      
      const item = document.createElement('div');
      item.style.padding = '8px 12px';
      item.style.fontSize = '13px';
      item.style.borderRadius = '6px';
      item.style.cursor = 'pointer';
      item.style.fontWeight = '500';
      item.style.color = 'var(--slate-700)';
      item.style.whiteSpace = 'nowrap';
      item.style.overflow = 'hidden';
      item.style.textOverflow = 'ellipsis';
      
      item.textContent = text;
      
      item.addEventListener('mouseover', () => {
        item.style.background = 'var(--slate-50)';
      });
      item.addEventListener('mouseout', () => {
        item.style.background = 'transparent';
      });
      
      item.addEventListener('click', () => {
        triggerText.textContent = order.invoiceNo;
        orderEl.value = order.invoiceNo;
        
        autoFillFormFromOrder(order);
        
        const dropdown = document.getElementById('salesOrderSelectDropdown');
        if (dropdown) dropdown.style.display = 'none';
      });
      
      optionsList.appendChild(item);
    });
    
    if (query && matchCount === 0) {
      const noResult = document.createElement('div');
      noResult.style.padding = '8px 12px';
      noResult.style.fontSize = '12px';
      noResult.style.color = 'var(--slate-400)';
      noResult.style.textAlign = 'center';
      noResult.textContent = 'No matching orders';
      optionsList.appendChild(noResult);
    }
  }

  function autoFillFormFromOrder(order) {
    const custEl = document.getElementById('salesCustomer');
    if (custEl) {
      custEl.value = order.customerId || '';
      populateSalesCustomers(order.customerId);
    }
    
    const execEl = document.getElementById('salesExecutive');
    if (execEl) {
      execEl.value = order.salesExecutiveId || '';
      populateSalesExecutives(order.salesExecutiveId);
    }
    
    const supplyTypeEl = document.getElementById('salesSupplyType');
    if (supplyTypeEl) {
      supplyTypeEl.value = order.salesSupplyType || 'Intra-State (CGST + SGST)';
    }
    
    const notesEl = document.getElementById('salesNotes');
    if (notesEl) {
      notesEl.value = order.notes || '';
    }
    
    const adjEl = document.getElementById('salesAdjustments');
    if (adjEl) {
      adjEl.value = order.adjustments || '';
    }
    
    const noneBtn = document.getElementById('salesTdsTcsNone');
    const tdsBtn = document.getElementById('salesTdsTcsTDS');
    const tcsBtn = document.getElementById('salesTdsTcsTCS');
    if (order.tdsTcsMode === 'TDS' && tdsBtn) tdsBtn.click();
    else if (order.tdsTcsMode === 'TCS' && tcsBtn) tcsBtn.click();
    else if (noneBtn) noneBtn.click();
    
    const rateSelect = document.getElementById('salesTdsTcsRateSelect');
    const customInput = document.getElementById('salesTdsTcsRateCustom');
    const customWrap = document.getElementById('salesTdsTcsRateCustomWrap');
    const rateVal = order.tdsTcsRate || 0;
    if (rateSelect) {
      if (rateSelect.querySelector(`option[value="${rateVal}"]`)) {
        rateSelect.value = String(rateVal);
        if (customWrap) customWrap.style.display = 'none';
      } else {
        rateSelect.value = 'custom';
        if (customInput) customInput.value = rateVal;
        if (customWrap) customWrap.style.display = 'block';
      }
    }
    
    currentSalesType = order.type;
    const prodBtn = document.getElementById('salesTypeProduct');
    const servBtn = document.getElementById('salesTypeService');
    const typeBg = document.getElementById('salesTypeBg');
    if (order.type === 'Product') {
      if (prodBtn) prodBtn.classList.add('active');
      if (servBtn) servBtn.classList.remove('active');
      if (typeBg) {
        typeBg.classList.add('prod-active');
        typeBg.classList.remove('serv-active');
      }
    } else {
      if (servBtn) servBtn.classList.add('active');
      if (prodBtn) prodBtn.classList.remove('active');
      if (typeBg) {
        typeBg.classList.add('serv-active');
        typeBg.classList.remove('prod-active');
      }
    }
    
    // Copy rows
    salesRows = JSON.parse(JSON.stringify(order.rows));
    
    renderSalesRows();
    recalculateSalesTotals();
  }

  function initSalesForm() {
    updateVoucherSubtypeUI();
    const today = new Date().toISOString().split('T')[0];
    const dateEl = document.getElementById('salesDate');
    const dueEl = document.getElementById('salesDueDate');
    if (dateEl) dateEl.value = today;
    if (dueEl) dueEl.value = today;
    
    const orderEl = document.getElementById('salesOrderNo');
    const notesEl = document.getElementById('salesNotes');
    const adjEl = document.getElementById('salesAdjustments');
    if (orderEl) orderEl.value = '';
    const orderTriggerText = document.getElementById('salesOrderSelectTriggerText');
    if (orderTriggerText) orderTriggerText.textContent = 'None';
    if (notesEl) notesEl.value = '';
    if (adjEl) adjEl.value = '';
    
    const noneBtn = document.getElementById('salesTdsTcsNone');
    if (noneBtn) noneBtn.click();
    const rateSelect = document.getElementById('salesTdsTcsRateSelect');
    const customInput = document.getElementById('salesTdsTcsRateCustom');
    const customWrap = document.getElementById('salesTdsTcsRateCustomWrap');
    const label = document.getElementById('salesTdsTcsRateLabel');
    const amt = document.getElementById('salesTdsTcsAmount');
    if (rateSelect) rateSelect.value = '1';
    if (customInput) customInput.value = '';
    if (customWrap) customWrap.style.display = 'none';
    if (label) label.textContent = '0%';
    if (amt) amt.value = '';
    
    populateSalesCustomers();
    populateSalesExecutives();
    const execEl = document.getElementById('salesExecutive');
    if (execEl) execEl.value = '';
    const supplyTypeEl = document.getElementById('salesSupplyType');
    if (supplyTypeEl) supplyTypeEl.value = 'Intra-State (CGST + SGST)';
    const notPaidBtn = document.getElementById('salesPaymentStatusNotPaid');
    if (notPaidBtn) notPaidBtn.click();
    const payAccEl = document.getElementById('salesPaymentAccount');
    if (payAccEl) payAccEl.value = '';
    const payAmtEl = document.getElementById('salesPaymentAmount');
    if (payAmtEl) payAmtEl.value = '';
    setInvoiceNoMode('Auto');
    
    currentSalesType = 'Product';
    const prodBtn = document.getElementById('salesTypeProduct');
    const servBtn = document.getElementById('salesTypeService');
    const typeBg = document.getElementById('salesTypeBg');
    if (prodBtn) prodBtn.classList.add('active');
    if (servBtn) servBtn.classList.remove('active');
    if (typeBg) {
      typeBg.classList.add('prod-active');
      typeBg.classList.remove('serv-active');
    }
    
    const triggerText = document.getElementById('salesInvoiceSelectTriggerText');
    if (triggerText) triggerText.textContent = 'Select Invoice/Order';

    salesRows = [];
    addSalesRow();
    updateSalesReturnLockState();
  }

