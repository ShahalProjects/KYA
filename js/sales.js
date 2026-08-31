    const _salesRevPortal = (() => {
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



function isSalesReturnInvoiceSelected() {
    if (currentSalesVoucherSubtype !== 'Return') return false;
    const triggerText = document.getElementById('salesInvoiceSelectTriggerText');
    return triggerText && triggerText.textContent !== 'Select Invoice/Order';
  }

  function getInvoiceRemainingRows(origInv, excludeReturnId = null) {
    if (!origInv || !origInv.rows) return [];
    const postedReturns = (window.KYA_STORE.salesVouchers || []).filter(v => 
      v.isReturn && 
      v.returnAgainstInvoice && 
      v.returnAgainstInvoice.toLowerCase() === origInv.invoiceNo.toLowerCase() && 
      (excludeReturnId === null || v.id !== excludeReturnId)
    );
    const remainingRows = JSON.parse(JSON.stringify(origInv.rows));
    postedReturns.forEach(ret => {
      if (!ret.rows) return;
      ret.rows.forEach(retRow => {
        if (origInv.type === 'Product') {
          const match = remainingRows.find(r => r.item === retRow.item);
          if (match) {
            match.qty = Math.max(0, match.qty - (retRow.qty || 0));
            if (match.discountType !== 'pct') {
              match.discount = Math.max(0, match.discount - (retRow.discount || 0));
            }
          }
        } else {
          const match = remainingRows.find(r => r.revenueLedgerId == retRow.revenueLedgerId);
          if (match) {
            match.baseAmount = Math.max(0, match.baseAmount - (retRow.baseAmount || 0));
            if (match.discountType !== 'pct') {
              match.discount = Math.max(0, match.discount - (retRow.discount || 0));
            }
          }
        }
      });
    });
    return remainingRows;
  }

  function getOriginalInvoiceForReturn() {
    if (currentSalesVoucherSubtype !== 'Return') return null;
    const triggerText = document.getElementById('salesInvoiceSelectTriggerText');
    if (!triggerText || triggerText.textContent === 'Select Invoice/Order') return null;
    const invNo = triggerText.textContent.trim();
    return (window.KYA_STORE.salesVouchers || []).find(v => v.invoiceNo.toLowerCase() === invNo.toLowerCase() && !v.isReturn);
  }

  function updateSalesReturnLockState() {
    const isLocked = isSalesReturnInvoiceSelected();
    
    const custEl = document.getElementById('salesCustomer');
    if (custEl) {
      custEl.disabled = isLocked;
      custEl.style.backgroundColor = isLocked ? 'var(--slate-50)' : '';
      custEl.style.cursor = isLocked ? 'not-allowed' : '';
    }
    
    const supplyTypeEl = document.getElementById('salesSupplyType');
    if (supplyTypeEl) {
      supplyTypeEl.disabled = isLocked;
      supplyTypeEl.style.backgroundColor = isLocked ? 'var(--slate-50)' : '';
      supplyTypeEl.style.cursor = isLocked ? 'not-allowed' : '';
    }
    
    const orderEl = document.getElementById('salesOrderNo');
    if (orderEl) {
      orderEl.disabled = isLocked;
      orderEl.style.backgroundColor = 'var(--slate-50)';
      orderEl.style.color = isLocked ? 'var(--slate-400)' : 'var(--slate-700)';
    }
    
    const execEl = document.getElementById('salesExecutive');
    if (execEl) {
      execEl.disabled = isLocked;
      execEl.style.backgroundColor = isLocked ? 'var(--slate-50)' : '';
      execEl.style.cursor = isLocked ? 'not-allowed' : '';
    }
    
    const prodBtn = document.getElementById('salesTypeProduct');
    const servBtn = document.getElementById('salesTypeService');
    if (prodBtn && servBtn) {
      prodBtn.disabled = isLocked;
      servBtn.disabled = isLocked;
      prodBtn.style.cursor = isLocked ? 'not-allowed' : '';
      servBtn.style.cursor = isLocked ? 'not-allowed' : '';
      if (isLocked) {
        prodBtn.style.opacity = '0.7';
        servBtn.style.opacity = '0.7';
      } else {
        prodBtn.style.opacity = '';
        servBtn.style.opacity = '';
      }
    }
    
    const addRowBtn = document.getElementById('salesAddRow');
    if (addRowBtn) {
      addRowBtn.disabled = isLocked;
      addRowBtn.style.cursor = isLocked ? 'not-allowed' : '';
      if (isLocked) {
        addRowBtn.style.opacity = '0.5';
        addRowBtn.style.pointerEvents = 'none';
      } else {
        addRowBtn.style.opacity = '';
        addRowBtn.style.pointerEvents = '';
      }
    }

    // Payment Status Buttons
    const payNotPaidBtn = document.getElementById('salesPaymentStatusNotPaid');
    const payFullBtn = document.getElementById('salesPaymentStatusFull');
    const payPartialBtn = document.getElementById('salesPaymentStatusPartial');
    
    if (payNotPaidBtn) { payNotPaidBtn.disabled = false; payNotPaidBtn.style.cursor = ''; payNotPaidBtn.style.opacity = ''; }
    if (payFullBtn) { payFullBtn.disabled = false; payFullBtn.style.cursor = ''; payFullBtn.style.opacity = ''; }
    if (payPartialBtn) { payPartialBtn.disabled = false; payPartialBtn.style.cursor = ''; payPartialBtn.style.opacity = ''; }
    
    // TDS/TCS Buttons
    const tdsTcsNoneBtn = document.getElementById('salesTdsTcsNone');
    const tdsTcsTdsBtn = document.getElementById('salesTdsTcsTds');
    const tdsTcsTcsBtn = document.getElementById('salesTdsTcsTcs');
    
    if (tdsTcsNoneBtn) { tdsTcsNoneBtn.disabled = false; tdsTcsNoneBtn.style.cursor = ''; tdsTcsNoneBtn.style.opacity = ''; }
    if (tdsTcsTdsBtn) { tdsTcsTdsBtn.disabled = false; tdsTcsTdsBtn.style.cursor = ''; tdsTcsTdsBtn.style.opacity = ''; }
    if (tdsTcsTcsBtn) { tdsTcsTcsBtn.disabled = false; tdsTcsTcsBtn.style.cursor = ''; tdsTcsTcsBtn.style.opacity = ''; }

    const payAmtEl = document.getElementById('salesPaymentAmount');
    if (payAmtEl) {
      payAmtEl.removeAttribute('max');
    }

    const rateSelect = document.getElementById('salesTdsTcsRateSelect');
    const customRateInput = document.getElementById('salesTdsTcsRateCustom');
    
    if (rateSelect) {
      rateSelect.disabled = false;
      rateSelect.style.backgroundColor = '';
      rateSelect.style.cursor = '';
    }
    if (customRateInput) {
      customRateInput.disabled = false;
      customRateInput.style.backgroundColor = '';
      customRateInput.style.cursor = '';
    }

    const origInv = getOriginalInvoiceForReturn();
    if (origInv) {
      let origPaidAmt = 0;
      if (origInv.paymentStatus === 'Full Payment') {
        origPaidAmt = origInv.total;
      } else if (origInv.paymentStatus === 'Partial Payment') {
        origPaidAmt = origInv.paymentAmount || 0;
      }
      
      const otherReturns = (window.KYA_STORE.salesVouchers || []).filter(v => 
        v.isReturn && 
        v.returnAgainstInvoice && 
        v.returnAgainstInvoice.toLowerCase() === origInv.invoiceNo.toLowerCase() &&
        (!window._editingSalesInvoice || v.id !== window._editingSalesInvoice.id)
      );
      let alreadyRefunded = 0;
      otherReturns.forEach(ret => {
        if (ret.paymentStatus === 'Full Refund' || ret.paymentStatus === 'Partial Refund') {
          alreadyRefunded += (ret.paymentAmount || 0);
        }
      });
      
      const remainingRefundable = Math.max(0, origPaidAmt - alreadyRefunded);

      if (origInv.paymentStatus === 'Not Paid' || remainingRefundable <= 0) {
        if (payNotPaidBtn && !payNotPaidBtn.classList.contains('active')) {
          payNotPaidBtn.click();
        }
        if (payFullBtn) {
          payFullBtn.disabled = true;
          payFullBtn.style.cursor = 'not-allowed';
          payFullBtn.style.opacity = '0.5';
        }
        if (payPartialBtn) {
          payPartialBtn.disabled = true;
          payPartialBtn.style.cursor = 'not-allowed';
          payPartialBtn.style.opacity = '0.5';
        }
        if (payAmtEl) {
          payAmtEl.max = 0;
        }
      } else {
        if (payAmtEl) {
          payAmtEl.max = remainingRefundable;
        }
      }

      if (!origInv.tdsTcsMode || origInv.tdsTcsMode === 'None') {
        if (tdsTcsNoneBtn && !tdsTcsNoneBtn.classList.contains('active')) {
          tdsTcsNoneBtn.click();
        }
        if (tdsTcsTdsBtn) {
          tdsTcsTdsBtn.disabled = true;
          tdsTcsTdsBtn.style.cursor = 'not-allowed';
          tdsTcsTdsBtn.style.opacity = '0.5';
        }
        if (tdsTcsTcsBtn) {
          tdsTcsTcsBtn.disabled = true;
          tdsTcsTcsBtn.style.cursor = 'not-allowed';
          tdsTcsTcsBtn.style.opacity = '0.5';
        }
      } else if (origInv.tdsTcsMode === 'TDS') {
        if (tdsTcsTdsBtn && !tdsTcsTdsBtn.classList.contains('active')) {
          tdsTcsTdsBtn.click();
        }
        if (tdsTcsNoneBtn) {
          tdsTcsNoneBtn.disabled = true;
          tdsTcsNoneBtn.style.cursor = 'not-allowed';
          tdsTcsNoneBtn.style.opacity = '0.5';
        }
        if (tdsTcsTcsBtn) {
          tdsTcsTcsBtn.disabled = true;
          tdsTcsTcsBtn.style.cursor = 'not-allowed';
          tdsTcsTcsBtn.style.opacity = '0.5';
        }
        if (rateSelect) {
          rateSelect.disabled = true;
          rateSelect.style.backgroundColor = 'var(--slate-50)';
          rateSelect.style.cursor = 'not-allowed';
        }
        if (customRateInput) {
          customRateInput.disabled = true;
          customRateInput.style.backgroundColor = 'var(--slate-50)';
          customRateInput.style.cursor = 'not-allowed';
        }
      } else if (origInv.tdsTcsMode === 'TCS') {
        if (tdsTcsTcsBtn && !tdsTcsTcsBtn.classList.contains('active')) {
          tdsTcsTcsBtn.click();
        }
        if (tdsTcsNoneBtn) {
          tdsTcsNoneBtn.disabled = true;
          tdsTcsNoneBtn.style.cursor = 'not-allowed';
          tdsTcsNoneBtn.style.opacity = '0.5';
        }
        if (tdsTcsTdsBtn) {
          tdsTcsTdsBtn.disabled = true;
          tdsTcsTdsBtn.style.cursor = 'not-allowed';
          tdsTcsTdsBtn.style.opacity = '0.5';
        }
        if (rateSelect) {
          rateSelect.disabled = true;
          rateSelect.style.backgroundColor = 'var(--slate-50)';
          rateSelect.style.cursor = 'not-allowed';
        }
        if (customRateInput) {
          customRateInput.disabled = true;
          customRateInput.style.backgroundColor = 'var(--slate-50)';
          customRateInput.style.cursor = 'not-allowed';
        }
      }
    }
  }

  function getSalesPaymentMax(total) {
    let maxVal = total;
    if (currentSalesVoucherSubtype === 'Invoice') {
      const orderNo = document.getElementById('salesOrderNo')?.value?.trim();
      if (orderNo) {
        const linkedOrder = (window.KYA_STORE.salesVouchers || []).find(v => v.isOrder && v.invoiceNo.toLowerCase() === orderNo.toLowerCase());
        if (linkedOrder) {
          let orderAdvanceAmount = 0;
          if (linkedOrder.paymentStatus === 'Full Payment') {
            orderAdvanceAmount = linkedOrder.total;
          } else if (linkedOrder.paymentStatus === 'Partial Payment') {
            orderAdvanceAmount = linkedOrder.paymentAmount || 0;
          }
          maxVal = Math.max(0, total - orderAdvanceAmount);
        }
      }
    } else if (currentSalesVoucherSubtype === 'Return') {
      const payAmtEl = document.getElementById('salesPaymentAmount');
      if (payAmtEl && payAmtEl.max) {
        const maxPaid = parseFloat(payAmtEl.max);
        if (!isNaN(maxPaid)) {
          maxVal = Math.min(total, maxPaid);
        }
      }
    }
    return maxVal;
  }

  function updateSalesPaymentUI() {
    const payNotPaidBtn = document.getElementById('salesPaymentStatusNotPaid');
    const payFullBtn = document.getElementById('salesPaymentStatusFull');
    const payPartialBtn = document.getElementById('salesPaymentStatusPartial');
    if (!payFullBtn || !payNotPaidBtn || !payPartialBtn) return;

    const payLabel = document.getElementById('salesPaymentStatusLabel');
    if (payLabel) {
      if (currentSalesVoucherSubtype === 'Return') {
        payLabel.textContent = 'Refund Status';
      } else {
        payLabel.textContent = 'Payment Status';
      }
    }
    
    function autoCalculateSalesRoundOff() {
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
    
    const adjEl = document.getElementById('salesAdjustments');
    if (adjEl) {
      adjEl.value = roundOffAmt === 0 ? '' : roundOffAmt.toFixed(2);
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
        rate = parseFloat(rateSelect.value) || 0;
      }
    }
    const amountInput = document.getElementById('salesTdsTcsAmount');
    const tdsTcsAmount = amountInput ? (parseFloat(amountInput.value) || 0) : 0;
    const adjustmentsInput = document.getElementById('salesAdjustments');
    const adjustments = adjustmentsInput ? (parseFloat(adjustmentsInput.value) || 0) : 0;
    
    let total = subTotal;
    if (tdsTcsMode === 'TDS') total = subTotal - tdsTcsAmount;
    else if (tdsTcsMode === 'TCS') total = subTotal + tdsTcsAmount;
    total += adjustments;

    const maxVal = getSalesPaymentMax(total);
    
    const orderNo = document.getElementById('salesOrderNo')?.value?.trim();
    let orderAdvanceAmount = 0;
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

    const excessAmount = isOrderLinked ? Math.max(0, orderAdvanceAmount - total) : 0;

    if (currentSalesVoucherSubtype === 'Return') {
      payNotPaidBtn.textContent = 'No Refund';
      payFullBtn.textContent = `Full Refund (₹${fmtNum(maxVal)})`;
      payPartialBtn.textContent = 'Partial Refund';
      
      const payAmtEl = document.getElementById('salesPaymentAmount');
      if (payAmtEl) {
        payAmtEl.max = maxVal;
      }
    } else if (excessAmount > 0) {
      payNotPaidBtn.textContent = 'Not Refunded';
      payFullBtn.textContent = `Full Refund (₹${fmtNum(excessAmount)})`;
      payPartialBtn.textContent = 'Partial Refund';
      
      const payAmtEl = document.getElementById('salesPaymentAmount');
      if (payAmtEl) {
        payAmtEl.max = excessAmount;
      }
    } else {
      payNotPaidBtn.textContent = 'Not Paid';
      payPartialBtn.textContent = 'Partial Payment';
      if (isOrderLinked && orderAdvanceAmount > 0) {
        payFullBtn.textContent = `Full Payment (₹${fmtNum(maxVal)})`;
      } else {
        payFullBtn.textContent = 'Full Payment';
      }
    }
  }

  // Initialize store for future features
  if (!window.KYA_STORE) {
    window.KYA_STORE = {};
  }
  window.KYA_STORE.salesVouchers = window.KYA_STORE.salesVouchers || [];
  window.KYA_STORE.salesVouchersDrafts = window.KYA_STORE.salesVouchersDrafts || [];
  window.KYA_STORE.salesInvoiceCtr = window.KYA_STORE.salesInvoiceCtr || 1;
  window.KYA_STORE.salesReturnCtr = window.KYA_STORE.salesReturnCtr || 1;
  window.KYA_STORE.salesOrderCtr = window.KYA_STORE.salesOrderCtr || 1;

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
            <td class="sales-del-cell" style="width: 50px; text-align: center; border: none !important; background: transparent !important; box-shadow: none !important;">
              <button type="button" class="sales-del-row" style="background: none; border: none !important; outline: none !important; box-shadow: none !important; color: var(--red-600); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%;" onmouseover="this.style.backgroundColor='var(--red-50)'" onmouseout="this.style.backgroundColor='transparent'">
                <svg viewBox="0 0 15 15" fill="none" style="width: 14px; height: 14px;">
                  <path d="M5.5 2h4M1.5 4h12M2.5 4l1 9.5a1 1 0 001 .5h6a1 1 0 001-.5l1-9.5M5.5 6.5v5M9.5 6.5v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                </svg>
              </button>
            </td>
          </tr>
        `;
      } else {
        const selectedLedger = incomeLedgers.find(l => l.id == row.revenueLedgerId);
        const ledgerName = selectedLedger ? selectedLedger.name : '';
        trHtml = `
          <tr class="sales-row" data-row-index="${index}">
            <td>
              <div class="sales-rev-acc-wrap" style="position: relative; display: flex; align-items: center; width: 100%;">
                <input type="text" class="sales-row-rev-acc-input je-input" 
                  placeholder="Search revenue account..." 
                  value="${ohEsc(ledgerName)}" 
                  style="border: none; background: transparent; box-shadow: none; padding: 0; width: 100%; ${isLocked ? 'cursor: not-allowed; color: var(--slate-500);' : ''}" 
                  data-ledger-id="${row.revenueLedgerId || ''}"
                  autocomplete="off" spellcheck="false"
                  ${isLocked ? 'disabled' : ''} />
                <span class="sales-rev-acc-arrow" style="position: absolute; right: 4px; pointer-events: none; color: #94a3b8; display: flex; align-items: center;">
                  <svg viewBox="0 0 14 14" fill="none" style="width: 12px; height: 12px;"><path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </span>
              </div>
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
            <td class="sales-del-cell" style="width: 50px; text-align: center; border: none !important; background: transparent !important; box-shadow: none !important;">
              <button type="button" class="sales-del-row" style="background: none; border: none !important; outline: none !important; box-shadow: none !important; color: var(--red-600); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%;" onmouseover="this.style.backgroundColor='var(--red-50)'" onmouseout="this.style.backgroundColor='transparent'">
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

    // Wire up searchable select inputs
    body.querySelectorAll('.sales-row-rev-acc-input').forEach(inp => {
      const tr = inp.closest('tr');
      const idx = parseInt(tr.dataset.rowIndex);
      const row = salesRows[idx];

      const triggerSearch = () => {
        _salesRevPortal.open(inp, inp.value, (acct) => {
          inp.value = acct.name;
          inp.dataset.ledgerId = acct.id;
          row.revenueLedgerId = acct.id;
          // Trigger change event to update totals and rows
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        });
      };

      inp.addEventListener('focus', () => {
        triggerSearch();
      });

      inp.addEventListener('input', () => {
        triggerSearch();
      });

      inp.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (!_salesRevPortal.isOpen()) {
            triggerSearch();
          } else {
            _salesRevPortal.moveHighlight(1);
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (_salesRevPortal.isOpen()) {
            _salesRevPortal.moveHighlight(-1);
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (_salesRevPortal.isOpen()) {
            _salesRevPortal.selectHighlighted();
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          _salesRevPortal.close();
        }
      });
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
    // Determine direction: if the Amount field itself triggered the change, back-calculate Rate/Base
    const amountEdited = (triggeredBy === 'amount');

    if (currentSalesType === 'Product') {
      row.item = tr.querySelector('.sales-row-item').value;

      let qty      = parseFloat(tr.querySelector('.sales-row-qty').value) || 0;
      let rate     = Math.round(parseSalesAmt(tr.querySelector('.sales-row-rate').value) * 100) / 100;
      let discount = parseSalesAmt(tr.querySelector('.sales-row-discount').value);
      row.discountType = tr.querySelector('.sales-row-discount-type').value;
      row.tax = parseFloat(tr.querySelector('.sales-row-tax').value) || 0;

      if (amountEdited) {
        // Reverse-calculate Rate from Amount
        const enteredAmount = Math.round(parseSalesAmt(amtInput.value) * 100) / 100;
        if (amtInput && document.activeElement !== amtInput) {
          amtInput.value = enteredAmount === 0 ? '' : enteredAmount.toFixed(2);
        }
        const taxFactor     = 1 + row.tax / 100;
        const afterDiscount = enteredAmount / taxFactor;  // taxable amount
        let base;
        if (row.discountType === 'pct') {
          // afterDiscount = base * (1 - discount/100)
          const pctFactor = 1 - (discount / 100);
          base = pctFactor > 0 ? afterDiscount / pctFactor : 0;
        } else {
          // afterDiscount = base - discount
          base = afterDiscount + discount;
        }
        rate = Math.round((qty > 0 ? base / qty : 0) * 100) / 100;

        // Return-mode cap: rate cannot exceed origRate
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

        // Push back-calculated rate into the Rate input
        const rateInput = tr.querySelector('.sales-row-rate');
        if (rateInput && document.activeElement !== rateInput) {
          rateInput.value = rate === 0 ? '' : rate.toFixed(2);
        }
      } else {
        // Forward-calculate Amount from Rate
        if (currentSalesVoucherSubtype === 'Return' && row.origQty !== undefined) {
          if (qty > row.origQty) {
            qty = row.origQty;
            tr.querySelector('.sales-row-qty').value = qty;
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

        const base        = row.qty * row.rate;
        const discAmt     = row.discountType === 'pct' ? (base * (row.discount / 100)) : row.discount;
        const afterDiscount = Math.max(0, base - discAmt);
        const taxAmt      = afterDiscount * (row.tax / 100);
        row.amount        = Math.round((afterDiscount + taxAmt) * 100) / 100;

        // Update Amount input
        if (amtInput && document.activeElement !== amtInput) {
          amtInput.value = row.amount === 0 ? '' : row.amount.toFixed(2);
        }
      }
    } else {
      // Service type
      row.revenueLedgerId = tr.querySelector('.sales-row-rev-acc-input')?.dataset.ledgerId || '';

      let baseAmount = Math.round(parseSalesAmt(tr.querySelector('.sales-row-base').value) * 100) / 100;
      let discount   = parseSalesAmt(tr.querySelector('.sales-row-discount').value);
      row.discountType = tr.querySelector('.sales-row-discount-type').value;
      row.tax = parseFloat(tr.querySelector('.sales-row-tax').value) || 0;

      if (amountEdited) {
        // Reverse-calculate Base Amount from Amount
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
        row.amount     = enteredAmount;

        // Push back-calculated base into Base input
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

        const discAmt     = row.discountType === 'pct' ? (row.baseAmount * (row.discount / 100)) : row.discount;
        const afterDiscount = Math.max(0, row.baseAmount - discAmt);
        const taxAmt      = afterDiscount * (row.tax / 100);
        row.amount        = Math.round((afterDiscount + taxAmt) * 100) / 100;

        if (amtInput && document.activeElement !== amtInput) {
          amtInput.value = row.amount === 0 ? '' : row.amount.toFixed(2);
        }
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

  function recalculateSalesTotals() {
    const subTotal = calculateSubtotal();
    const subTotalEl = document.getElementById('salesSubTotal');


  function calculateSubtotal() {
    let sub = 0;
    salesRows.forEach(r => {
      sub += r.amount || 0;
    });
    return sub;
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
        if (customWrap) customWrap.style.display = 'flex';
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
    
    const tdsTcsAmount = amountInput ? (parseSalesAmt(amountInput.value) || 0) : 0;
    const adjustmentsInput = document.getElementById('salesAdjustments');
    const adjustments = adjustmentsInput ? (parseSalesAmt(adjustmentsInput.value) || 0) : 0;

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
      
    if (addRowBtn) {
      addRowBtn.addEventListener('click', (e) => {
        e.preventDefault();
        addSalesRow();
      });
    }
    
    const clearBtn = document.getElementById('btnClearSales');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window._editingSalesInvoice = null;
        initSalesForm();
      });
    }
    
    const newSalesBtn = document.getElementById('btnNewSales');
    if (newSalesBtn) {
      newSalesBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentSalesVoucherSubtype = 'Invoice';
        window._editingSalesInvoice = null;
        initSalesForm();
      });
    }
    
    const saveDraftBtn = document.getElementById('btnSaveSalesDraft');
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener('click', (e) => {
        e.preventDefault();
        saveSalesDraft();
      });
    }
    
    const postInvoiceBtn = document.getElementById('btnPostSales');
    if (postInvoiceBtn) {
      postInvoiceBtn.addEventListener('click', (e) => {
        e.preventDefault();
        postSalesInvoice();
      });
    }
    
    const rateSelect = document.getElementById('salesTdsTcsRateSelect');
    if (rateSelect) {
      rateSelect.addEventListener('change', () => {
        const customWrap = document.getElementById('salesTdsTcsRateCustomWrap');
        if (rateSelect.value === 'custom') {
          if (customWrap) customWrap.style.display = 'block';
        } else {
          if (customWrap) customWrap.style.display = 'none';
        }
        recalculateSalesTotals();
      });
    }
    const customInput = document.getElementById('salesTdsTcsRateCustom');
    if (customInput) {
      customInput.addEventListener('input', recalculateSalesTotals);
    }
    const tdsTcsAmt = document.getElementById('salesTdsTcsAmount');
    if (tdsTcsAmt) tdsTcsAmt.addEventListener('input', recalculateSalesTotals);
    
    const adjustments = document.getElementById('salesAdjustments');
    if (adjustments) adjustments.addEventListener('input', recalculateSalesTotals);
    
    const body = document.getElementById('salesItemBody');
    if (body) {
      body.addEventListener('input', (e) => {
        const tr = e.target.closest('tr');
        if (!tr) return;
        const isRate = e.target.classList.contains('sales-row-rate');
        const isAmt = e.target.classList.contains('sales-row-amount-input');
        const isBase = e.target.classList.contains('sales-row-base');
        const isDisc = e.target.classList.contains('sales-row-discount');

        if ((isRate || isAmt || isBase || isDisc) && !/[\+\-\*\/\%]/.test(e.target.value)) {
          if (e.target.value && e.target.value.includes('.')) {
            const parts = e.target.value.split('.');
            if (parts[1] && parts[1].length > 2) {
              e.target.value = parts[0] + '.' + parts[1].slice(0, 2);
            }
          }
        }
        const index = parseInt(tr.dataset.rowIndex);
        const triggeredBy = isAmt ? 'amount' : 'rate';
        updateRowFromDOM(index, tr, triggeredBy);
      });
      
      body.addEventListener('change', (e) => {
        const tr = e.target.closest('tr');
        if (!tr) return;
        const index = parseInt(tr.dataset.rowIndex);
        const triggeredBy = e.target.classList.contains('sales-row-amount-input') ? 'amount' : 'rate';
        updateRowFromDOM(index, tr, triggeredBy);
      });
      
      body.addEventListener('click', (e) => {
        const btn = e.target.closest('.sales-del-row');
        if (btn) {
          const tr = btn.closest('tr');
          const index = parseInt(tr.dataset.rowIndex);
          salesRows.splice(index, 1);
          if (salesRows.length === 0) {
            addSalesRow();
          } else {
            renderSalesRows();
            recalculateSalesTotals();
          }
        }
      });
      
      // Evaluate math expression and format on blur
      body.addEventListener('blur', (e) => {
        const isRate = e.target.classList.contains('sales-row-rate');
        const isAmt = e.target.classList.contains('sales-row-amount-input');
        const isBase = e.target.classList.contains('sales-row-base');
        const isDisc = e.target.classList.contains('sales-row-discount');
        if (!isRate && !isAmt && !isBase && !isDisc) return;

        const val = parseSalesAmt(e.target.value);
        if (!isNaN(val)) {
          const clamped = Math.round(val * 100) / 100;
          e.target.value = clamped === 0 ? '' : clamped.toFixed(2);
          const tr = e.target.closest('tr');
          if (tr) updateRowFromDOM(parseInt(tr.dataset.rowIndex), tr, isAmt ? 'amount' : 'rate');
        }
      }, true);
    }
    const dueEl = document.getElementById('salesDueDate');
    if (dateEl && dueEl) {
      dateEl.addEventListener('change', () => {
        dueEl.value = dateEl.value;
        updateDueDateHelper();
      });
      dueEl.addEventListener('change', () => {
        updateDueDateHelper();
      });
    }
    
    const custEl = document.getElementById('salesCustomer');
    if (custEl) {
      custEl.addEventListener('focus', () => {
        populateSalesCustomers(custEl.value);
      });
      custEl.addEventListener('change', () => {
        const customerId = custEl.value;
        const orderEl = document.getElementById('salesOrderNo');
        if (orderEl) {
          if (customerId) {
            const postedInvoices = window.KYA_STORE.salesVouchers || [];
            const count = postedInvoices.filter(v => v.customerId == customerId).length;
            orderEl.value = count + 1;
          } else {
            orderEl.value = '';
          }
        }
      });
    }
    
    const execEl = document.getElementById('salesExecutive');
    if (execEl) {
      execEl.addEventListener('focus', () => {
        populateSalesExecutives(execEl.value);
      });
    }
    
    const supplyTypeEl = document.getElementById('salesSupplyType');
    if (supplyTypeEl) {
      supplyTypeEl.addEventListener('change', () => {
        handleSupplyTypeChange();
      });
    }
    
    const newCustBtn = document.getElementById('btnSalesNewCustomer');
    if (newCustBtn) {
      newCustBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showCoaModal('sg-tr');
      });
    }

    const payNotPaidBtn = document.getElementById('salesPaymentStatusNotPaid');
    const payFullBtn = document.getElementById('salesPaymentStatusFull');
    const payPartialBtn = document.getElementById('salesPaymentStatusPartial');
    const payBg = document.getElementById('salesPaymentStatusBg');
    const payAccField = document.getElementById('salesPaymentAccountField');
    const payAmtField = document.getElementById('salesPaymentAmountField');
    const payDueDateField = document.getElementById('salesDueDateField');
    
    if (payNotPaidBtn && payFullBtn && payPartialBtn && payBg && payAccField && payAmtField) {
      payNotPaidBtn.addEventListener('click', () => {
        payNotPaidBtn.classList.add('active');
        payFullBtn.classList.remove('active');
        payPartialBtn.classList.remove('active');
        payBg.className = 'sales-paystatus-bg notpaid-active';
        payAccField.style.display = 'none';
        payAmtField.style.display = 'none';
        if (payDueDateField) payDueDateField.style.display = 'flex';
        const wrapper = document.getElementById('salesDueDateWrapper');
        if (wrapper) {
          wrapper.style.flexDirection = 'row';
          wrapper.style.alignItems = 'center';
        }
        updateDueDateHelper();
        recalculateSalesTotals();
      });
      
      payFullBtn.addEventListener('click', () => {
        payFullBtn.classList.add('active');
        payNotPaidBtn.classList.remove('active');
        payPartialBtn.classList.remove('active');
        payBg.className = 'sales-paystatus-bg fullpaid-active';
        payAccField.style.display = 'flex';
        payAmtField.style.display = 'none';
        if (payDueDateField) payDueDateField.style.display = 'none';
        populateSalesPaymentAccounts();
        recalculateSalesTotals();
      });
      
      payPartialBtn.addEventListener('click', () => {
        payPartialBtn.classList.add('active');
        payNotPaidBtn.classList.remove('active');
        payFullBtn.classList.remove('active');
        payBg.className = 'sales-paystatus-bg partpaid-active';
        payAccField.style.display = 'flex';
        payAmtField.style.display = 'flex';
        if (payDueDateField) payDueDateField.style.display = 'flex';
        const wrapper = document.getElementById('salesDueDateWrapper');
        if (wrapper) {
          wrapper.style.flexDirection = 'column';
          wrapper.style.alignItems = 'flex-start';
          wrapper.style.gap = '4px';
        }
        updateDueDateHelper();
        populateSalesPaymentAccounts();
        recalculateSalesTotals();
      });
    }
    
    const payAccEl = document.getElementById('salesPaymentAccount');
    if (payAccEl) {
      payAccEl.addEventListener('focus', () => {
        populateSalesPaymentAccounts(payAccEl.value);
      });
    }
    
    const payAmtEl = document.getElementById('salesPaymentAmount');
    if (payAmtEl) {
      payAmtEl.addEventListener('input', () => {
        const subTotal = calculateSubtotal();
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
        
        let total = subTotal;
        if (tdsTcsMode === 'TDS') total = subTotal - tdsTcsAmount;
        else if (tdsTcsMode === 'TCS') total = subTotal + tdsTcsAmount;
        total += adjustments;
        
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
        const allowedMax = (isOrderLinked && excessAmount > 0) ? excessAmount : maxVal;
        
        if (total > 0 && parseFloat(payAmtEl.value) > allowedMax) {
          payAmtEl.value = allowedMax.toFixed(2);
          const limitMsg = (isOrderLinked && excessAmount > 0)
            ? `Refund Amount cannot exceed the excess refund amount of ₹${fmtNum(allowedMax)}.`
            : (isOrderLinked 
               ? `Payment Amount cannot exceed the balance payment of ₹${fmtNum(allowedMax)}.`
               : `Payment Amount cannot exceed the Grand Total of ₹${fmtNum(allowedMax)}.`);
          showToast(limitMsg, 'warning');
        }
      });
    }

    const returnBtn = document.getElementById('btnSalesReturn');
    const orderBtn = document.getElementById('btnSalesOrder');
    
    if (returnBtn) {
      returnBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentSalesVoucherSubtype = 'Return';
        window._editingSalesInvoice = null;
        initSalesForm();
      });
    }
    if (orderBtn) {
      orderBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentSalesVoucherSubtype = 'Order';
        window._editingSalesInvoice = null;
        initSalesForm();
      });
    }
  }

  function setupVoucherDeskEventListeners() {
    document.getElementById('vdNewJEBtn')?.addEventListener('click', () => {
      openTab('journal');
    });
    document.getElementById('vdNewInvBtn')?.addEventListener('click', () => {
      currentSalesVoucherSubtype = 'Invoice';
      window._editingSalesInvoice = null;
      initSalesForm();
      openTab('sales_voucher');
    });

    // Status tab switcher
    document.querySelectorAll('.vd-status-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _vdStatusFilter = btn.dataset.status;
        renderVoucherDeskPanel();
      });
    });
  }

