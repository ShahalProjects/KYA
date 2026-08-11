  // ══════════════════════════════════════════════════════════════════
  //  SALES HELPERS — Return/payment helpers, ledger & dropdown utilities, store init
  //  (Split from sales.js for maintainability)
  // ══════════════════════════════════════════════════════════════════

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
    const custTrigger = document.getElementById('salesCustomerSelectTrigger');
    if (custEl) {
      custEl.disabled = isLocked;
      custEl.style.backgroundColor = isLocked ? 'var(--slate-50)' : '';
      custEl.style.cursor = isLocked ? 'not-allowed' : '';
    }
    if (custTrigger) {
      custTrigger.style.pointerEvents = isLocked ? 'none' : '';
      custTrigger.style.backgroundColor = isLocked ? 'var(--slate-50)' : '#fff';
      custTrigger.style.cursor = isLocked ? 'not-allowed' : 'pointer';
      custTrigger.style.opacity = isLocked ? '0.7' : '1';
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
    if (tdsTcsTcsBtn) { tdsTcsTdsBtn.disabled = false; tdsTcsTcsBtn.style.cursor = ''; tdsTcsTcsBtn.style.opacity = ''; }

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

  function calculateSubtotal() {
    if (typeof salesRows === 'undefined' || !Array.isArray(salesRows)) return 0;
    let sub = 0;
    salesRows.forEach(r => {
      sub += (parseFloat(r.amount) || 0);
    });
    return Math.round(sub * 100) / 100;
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

  // Math expression evaluation helper for calculator behavior
  function evaluateSalesMathExpression(str) {
    let clean = (str || '').toString().replace(/,/g, '').trim();
    if (!clean) return 0;
    clean = clean.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
    if (!/^[0-9.+\-*/()\s]+$/.test(clean)) {
      return NaN;
    }
    try {
      const result = Function(`"use strict"; return (${clean})`)();
      return typeof result === 'number' && isFinite(result) ? result : NaN;
    } catch (e) {
      return NaN;
    }
  }

  function parseSalesAmt(str) {
    const cleanStr = (str || '').toString().replace(/,/g, '').trim();
    if (!cleanStr) return 0;
    if (/[\+\-\*\/\%]/.test(cleanStr)) {
      const evalVal = evaluateSalesMathExpression(cleanStr);
      if (!isNaN(evalVal)) {
        return evalVal;
      }
    }
    const v = parseFloat(cleanStr);
    return isNaN(v) ? 0 : v;
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
