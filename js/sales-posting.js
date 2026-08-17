  function loadSalesInvoice(inv, isDraft = false) {
    window._salesPartyOverride = inv.partyOverride ? JSON.parse(JSON.stringify(inv.partyOverride)) : null;
    currentSalesVoucherSubtype = inv.isReturn ? 'Return' : (inv.isOrder ? 'Order' : 'Invoice');
    updateVoucherSubtypeUI();
    const dateEl = document.getElementById('salesDate');
    const dueEl = document.getElementById('salesDueDate');
    if (dateEl) dateEl.value = inv.date;
    if (dueEl) dueEl.value = inv.dueDate || inv.date;
    
    setInvoiceNoMode(inv.mode || 'Manual');
    const invNoEl = document.getElementById('salesInvoiceNo');
    if (invNoEl) invNoEl.value = inv.invoiceNo;
    const chipEl = document.getElementById('salesVoucherChipDisplay');
    if (chipEl) chipEl.textContent = inv.invoiceNo || 'INV-XXXX';
    
    const returnTriggerText = document.getElementById('salesInvoiceSelectTriggerText');
    if (returnTriggerText) {
      if (inv.isReturn && inv.returnAgainstInvoice) {
        returnTriggerText.textContent = inv.returnAgainstInvoice;
      } else {
        returnTriggerText.textContent = 'Select Invoice/Order';
      }
    }
    
    const orderTriggerText = document.getElementById('salesOrderSelectTriggerText');
    if (orderTriggerText) {
      if (!inv.isReturn && !inv.isOrder && inv.orderNo) {
        orderTriggerText.textContent = inv.orderNo;
      } else {
        orderTriggerText.textContent = 'None';
      }
    }

    const orderEl = document.getElementById('salesOrderNo');
    if (orderEl) orderEl.value = inv.orderNo || '';
    
    const notesEl = document.getElementById('salesNotes');
    if (notesEl) notesEl.value = inv.notes || '';
    
    const adjEl = document.getElementById('salesAdjustments');
    if (adjEl) adjEl.value = (inv.adjustments !== undefined && inv.adjustments !== 0) ? inv.adjustments : '';
    
    const noneBtn = document.getElementById('salesTdsTcsNone');
    const tdsBtn = document.getElementById('salesTdsTcsTds');
    const tcsBtn = document.getElementById('salesTdsTcsTcs');
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
        if (customWrap) customWrap.style.display = 'flex';
      }
    }
    
    populateSalesCustomers(inv.customerId);
    populateSalesExecutives(inv.salesExecutiveId);
    
    const supplyTypeEl = document.getElementById('salesSupplyType');
    if (supplyTypeEl) supplyTypeEl.value = inv.salesSupplyType || 'Intra-State (CGST + SGST)';
    
    currentSalesType = inv.type || 'Product';
    const prodBtn = document.getElementById('salesTypeProduct');
    const servBtn = document.getElementById('salesTypeService');
    const typeBg = document.getElementById('salesTypeBg');
    if (currentSalesType === 'Product') {
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
    
    const notPaidBtn = document.getElementById('salesPaymentStatusNotPaid');
    const fullPaidBtn = document.getElementById('salesPaymentStatusFull');
    const partPaidBtn = document.getElementById('salesPaymentStatusPartial');
    
    const payStatus = inv.paymentStatus || (inv.isReturn ? 'No Refund' : 'Not Paid');
    if (payStatus === 'Full Payment' || payStatus === 'Full Refund') {
      if (fullPaidBtn) fullPaidBtn.click();
    } else if (payStatus === 'Partial Payment' || payStatus === 'Partial Refund') {
      if (partPaidBtn) partPaidBtn.click();
    } else {
      if (notPaidBtn) notPaidBtn.click();
    }
    populateSalesPaymentAccounts(inv.paymentAccountId);
    const payAmtEl = document.getElementById('salesPaymentAmount');
    if (payAmtEl) {
      if (payStatus === 'Partial Refund') {
        payAmtEl.value = (inv.refundedAmount !== undefined ? inv.refundedAmount : inv.paymentAmount) || '';
      } else {
        payAmtEl.value = inv.paymentAmount !== undefined ? inv.paymentAmount : '';
      }
    }
    
    salesRows = JSON.parse(JSON.stringify(inv.rows || []));
    if (salesRows.length === 0) {
      addSalesRow();
    }
    
    if (inv.isReturn && inv.returnAgainstInvoice) {
      const origInv = (window.KYA_STORE.salesVouchers || []).find(v => v.invoiceNo.toLowerCase() === inv.returnAgainstInvoice.toLowerCase());
      if (origInv && origInv.rows) {
        salesRows.forEach((row, i) => {
          if (origInv.rows[i]) {
            row.origRate = origInv.rows[i].rate;
            row.origQty = origInv.rows[i].qty;
            row.origDiscount = origInv.rows[i].discount;
            row.origDiscountType = origInv.rows[i].discountType;
            row.origBaseAmount = origInv.rows[i].baseAmount;
          }
        });
      }
    }
    
    renderSalesRows();
    updateSalesReturnLockState();
    updateDueDateHelper();
    recalculateSalesTotals();
    updateSalesDocUI(inv.uploadedDoc || null);

    window._editingSalesInvoice = { id: inv.id, isDraft: isDraft };
  }

  function saveSalesDraft() {
    if (typeof syncSalesRowsFromDOM === 'function') {
      syncSalesRowsFromDOM();
    }
    if (currentSalesVoucherSubtype === 'Return') {
      const origInv = getOriginalInvoiceForReturn();
      if (!origInv) {
        showToast('Please select the original Document (Invoice/Order) for this sales reversal draft.', 'warning');
        return;
      }
    }
    const customerId = document.getElementById('salesCustomer').value;
    const salesExecutiveId = document.getElementById('salesExecutive').value;
    const salesSupplyType = document.getElementById('salesSupplyType').value;
    const invoiceNo = document.getElementById('salesInvoiceNo').value.trim();
    const date = document.getElementById('salesDate').value;
    const dueDate = document.getElementById('salesDueDate').value;
    const orderNo = document.getElementById('salesOrderNo').value.trim();
    const notes = document.getElementById('salesNotes').value;
    const adjustments = parseFloat(document.getElementById('salesAdjustments').value) || 0;
    
    let tdsTcsMode = 'None';
    const tdsBtn = document.getElementById('salesTdsTcsTds');
    const tcsBtn = document.getElementById('salesTdsTcsTcs');
    if (tdsBtn && tdsBtn.classList.contains('active')) tdsTcsMode = 'TDS';
    if (tcsBtn && tcsBtn.classList.contains('active')) tdsTcsMode = 'TCS';
    
    const rateSelect = document.getElementById('salesTdsTcsRateSelect');
    let tdsTcsRate = 0;
    if (rateSelect) {
      if (rateSelect.value === 'custom') {
        const customInput = document.getElementById('salesTdsTcsRateCustom');
        tdsTcsRate = customInput ? (parseFloat(customInput.value) || 0) : 0;
      } else {
        tdsTcsRate = parseFloat(rateSelect.value) || 0;
      }
    }
    const amtEl = document.getElementById('salesTdsTcsAmount');
    const tdsTcsAmount = amtEl ? (parseFloat(amtEl.value) || 0) : 0;
    
    const subTotal = calculateSubtotal();
    let total = subTotal;
    if (tdsTcsMode === 'TDS') total = subTotal - tdsTcsAmount;
    else if (tdsTcsMode === 'TCS') total = subTotal + tdsTcsAmount;
    total += adjustments;
    
    let paymentStatus = getSalesPaymentStatus();
    const paymentAccountId = document.getElementById('salesPaymentAccount').value;
    let paymentAmount = 0;
    
    let orderAdvanceAmount = 0;
    if (orderNo && currentSalesVoucherSubtype === 'Invoice') {
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
    let refundedAmount = 0;
    if (excessAmount > 0) {
      if (paymentStatus === 'Full Refund') {
        refundedAmount = excessAmount;
      } else if (paymentStatus === 'Partial Refund') {
        const refundAmt = parseFloat(document.getElementById('salesPaymentAmount').value) || 0;
        refundedAmount = Math.min(excessAmount, refundAmt);
      }
    } else {
      if (paymentStatus === 'Full Payment' || paymentStatus === 'Full Refund') {
        paymentAmount = getSalesPaymentMax(total);
      } else if (paymentStatus === 'Partial Payment' || paymentStatus === 'Partial Refund') {
        paymentAmount = parseFloat(document.getElementById('salesPaymentAmount').value) || 0;
      }
    }

    if (currentSalesVoucherSubtype === 'Return') {
      const origInv = getOriginalInvoiceForReturn();
      if (origInv) {
        if (date < origInv.date) {
          showToast(`Reversal date cannot be before the sale date (${origInv.date}).`, 'warning');
          return;
        }
      }
    }

    const draftData = {
      id: (window._editingSalesInvoice && window._editingSalesInvoice.isDraft) ? window._editingSalesInvoice.id : Date.now(),
      type: currentSalesType,
      mode: currentSalesInvoiceMode,
      invoiceNo: invoiceNo || 'Draft',
      isReturn: currentSalesVoucherSubtype === 'Return',
      isOrder: currentSalesVoucherSubtype === 'Order',
      returnAgainstInvoice: currentSalesVoucherSubtype === 'Return' ? (document.getElementById('salesInvoiceSelectTriggerText')?.textContent.trim() || '') : '',
      customerId,
      salesExecutiveId,
      salesSupplyType,
      date,
      dueDate,
      orderNo,
      notes,
      tdsTcsMode,
      tdsTcsRate,
      tdsTcsAmount,
      adjustments,
      subTotal,
      total,
      paymentStatus,
      paymentAccountId,
      paymentAmount,
      excessAmount: excessAmount > 0 ? excessAmount : undefined,
      refundedAmount: excessAmount > 0 ? refundedAmount : undefined,
      rows: JSON.parse(JSON.stringify(salesRows)),
      partyOverride: window._salesPartyOverride ? JSON.parse(JSON.stringify(window._salesPartyOverride)) : null,
      uploadedDoc: window._salesUploadedDoc || null,
      updatedAt: Date.now()
    };
    window.KYA_STORE.salesVouchersDrafts = window.KYA_STORE.salesVouchersDrafts || [];
    
    const existingIndex = window.KYA_STORE.salesVouchersDrafts.findIndex(d => d.id === draftData.id);
    if (existingIndex > -1) {
      window.KYA_STORE.salesVouchersDrafts[existingIndex] = draftData;
    } else {
      window.KYA_STORE.salesVouchersDrafts.push(draftData);
    }
    
    let draftToastMsg = 'Sales Invoice Draft saved successfully.';
    if (currentSalesVoucherSubtype === 'Return') {
      draftToastMsg = 'Sales Reversal Draft saved successfully.';
    } else if (currentSalesVoucherSubtype === 'Order') {
      draftToastMsg = 'Sales Pre Invoice Draft saved successfully.';
    }
    showToast(draftToastMsg, 'success');
    window._editingSalesInvoice = null;
    currentSalesVoucherSubtype = 'Invoice';
    initSalesForm();
    openTab('sales_drafted');
    triggerAutoBackup();
  }

  function postSalesInvoice() {
    if (typeof syncSalesRowsFromDOM === 'function') {
      syncSalesRowsFromDOM();
    }
    if (currentSalesVoucherSubtype === 'Return') {
      const origInv = getOriginalInvoiceForReturn();
      if (!origInv) {
        showToast('Please select the original Document (Invoice/Order) for this sales reversal.', 'warning');
        return;
      }
    }
    const customerId = document.getElementById('salesCustomer').value;
    const salesExecutiveId = document.getElementById('salesExecutive').value;
    const salesSupplyType = document.getElementById('salesSupplyType').value;
    if (!customerId) {
      showToast('Please select a Customer.', 'warning');
      return;
    }
    
    const invoiceNo = document.getElementById('salesInvoiceNo').value.trim();
    if (!invoiceNo) {
      let typeLabel = 'Invoice';
      if (currentSalesVoucherSubtype === 'Return') typeLabel = 'Reversal';
      else if (currentSalesVoucherSubtype === 'Order') typeLabel = 'Pre Invoice';
      showToast(`${typeLabel} number is required.`, 'warning');
      return;
    }
    
    window.KYA_STORE.salesVouchers = window.KYA_STORE.salesVouchers || [];
    const dup = window.KYA_STORE.salesVouchers.some(v => {
      if (v.invoiceNo.toLowerCase() !== invoiceNo.toLowerCase()) return false;
      const isVReturn = !!v.isReturn;
      const isVOrder = !!v.isOrder;
      const isVInvoice = !v.isReturn && !v.isOrder;
      const isCurrentReturn = currentSalesVoucherSubtype === 'Return';
      const isCurrentOrder = currentSalesVoucherSubtype === 'Order';
      const isCurrentInvoice = currentSalesVoucherSubtype === 'Invoice';
      if (isCurrentReturn !== isVReturn) return false;
      if (isCurrentOrder !== isVOrder) return false;
      if (isCurrentInvoice !== isVInvoice) return false;
      if (window._editingSalesInvoice && !window._editingSalesInvoice.isDraft && v.id === window._editingSalesInvoice.id) {
        return false;
      }
      return true;
    });
    if (dup) {
      let typeLabel = 'Invoice';
      if (currentSalesVoucherSubtype === 'Return') typeLabel = 'Reversal';
      else if (currentSalesVoucherSubtype === 'Order') typeLabel = 'Pre Invoice';
      showToast(`${typeLabel} No. "${invoiceNo}" has already been posted. Please use a unique number.`, 'danger');
      return;
    }
    
    // Filter out completely blank rows if at least one non-empty row exists
    if (Array.isArray(salesRows) && salesRows.length > 1) {
      const nonEmpty = salesRows.filter(r => (r.item && r.item.trim()) || (r.rate && r.rate > 0) || (r.amount && r.amount > 0) || (r.baseAmount && r.baseAmount > 0));
      if (nonEmpty.length > 0) {
        salesRows = nonEmpty;
      }
    }

    if (salesRows.length === 0) {
      showToast('Please add at least one line item.', 'warning');
      return;
    }
    
    if (currentSalesType === 'Product') {
      const invalid = salesRows.some(r => !r.item || !r.item.trim() || r.qty <= 0 || r.rate < 0);
      if (invalid) {
        showToast('Please ensure all items have descriptions, quantity > 0, and rate >= 0.', 'warning');
        return;
      }
    } else {
      const invalid = salesRows.some(r => !r.revenueLedgerId || r.baseAmount < 0);
      if (invalid) {
        showToast('Please ensure all items have a selected Revenue Account and base amount >= 0.', 'warning');
        return;
      }
    }
    
    if (currentSalesVoucherSubtype === 'Return') {
      for (let i = 0; i < salesRows.length; i++) {
        const r = salesRows[i];
        if (currentSalesType === 'Product') {
          if (r.origQty !== undefined && r.qty > r.origQty) {
            showToast(`Row ${i + 1}: Quantity exceeds remaining quantity of ${r.origQty}.`, 'warning');
            return;
          }
          if (r.origRate !== undefined && r.rate > r.origRate) {
            showToast(`Row ${i + 1}: Rate exceeds original invoice rate of ₹${fmtNum(r.origRate)}.`, 'warning');
            return;
          }
          if (r.origDiscount !== undefined && r.discount > r.origDiscount) {
            showToast(`Row ${i + 1}: Discount exceeds remaining discount.`, 'warning');
            return;
          }
        } else {
          if (r.origBaseAmount !== undefined && r.baseAmount > r.origBaseAmount) {
            showToast(`Row ${i + 1}: Base Amount exceeds remaining base amount of ₹${fmtNum(r.origBaseAmount)}.`, 'warning');
            return;
          }
          if (r.origDiscount !== undefined && r.discount > r.origDiscount) {
            showToast(`Row ${i + 1}: Discount exceeds remaining discount.`, 'warning');
            return;
          }
        }
      }
    }
    
    const date = document.getElementById('salesDate').value;
    if (currentSalesVoucherSubtype === 'Return') {
      const origInv = getOriginalInvoiceForReturn();
      if (origInv) {
        if (date < origInv.date) {
          showToast(`Reversal date cannot be before the sale date (${origInv.date}).`, 'warning');
          return;
        }
      }
    }
    const dueDate = document.getElementById('salesDueDate').value;
    const orderNo = document.getElementById('salesOrderNo').value.trim();
    const notes = document.getElementById('salesNotes').value;
    const adjustments = parseFloat(document.getElementById('salesAdjustments').value) || 0;
    
    let tdsTcsMode = 'None';
    const tdsBtn = document.getElementById('salesTdsTcsTds');
    const tcsBtn = document.getElementById('salesTdsTcsTcs');
    if (tdsBtn && tdsBtn.classList.contains('active')) tdsTcsMode = 'TDS';
    if (tcsBtn && tcsBtn.classList.contains('active')) tdsTcsMode = 'TCS';
    
    const rateSelect = document.getElementById('salesTdsTcsRateSelect');
    let tdsTcsRate = 0;
    if (rateSelect) {
      if (rateSelect.value === 'custom') {
        const customInput = document.getElementById('salesTdsTcsRateCustom');
        tdsTcsRate = customInput ? (parseFloat(customInput.value) || 0) : 0;
      } else {
        tdsTcsRate = parseFloat(rateSelect.value) || 0;
      }
    }
    const amtEl = document.getElementById('salesTdsTcsAmount');
    const tdsTcsAmount = amtEl ? (parseFloat(amtEl.value) || 0) : 0;
    
    const subTotal = calculateSubtotal();
    let total = subTotal;
    if (tdsTcsMode === 'TDS') total = subTotal - tdsTcsAmount;
    else if (tdsTcsMode === 'TCS') total = subTotal + tdsTcsAmount;
    total += adjustments;
    
    let paymentStatus = getSalesPaymentStatus();
    const paymentAccountId = document.getElementById('salesPaymentAccount').value;
    let paymentAmount = 0;
    
    let orderAdvanceAmount = 0;
    if (orderNo && currentSalesVoucherSubtype === 'Invoice') {
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
    let refundedAmount = 0;
    let refundJournalEntryIds = [];
    if (excessAmount > 0) {
      if (window._editingSalesInvoice && !window._editingSalesInvoice.isDraft) {
        const oldInv = (window.KYA_STORE.salesVouchers || []).find(v => v.id === window._editingSalesInvoice.id);
        if (oldInv) {
          refundedAmount = oldInv.refundedAmount || 0;
          refundJournalEntryIds = oldInv.refundJournalEntryIds || [];
        }
      }
      
      if (paymentStatus === 'Full Refund') {
        if (!paymentAccountId) {
          showToast('Please select a Payment Account for the refund.', 'warning');
          return;
        }
        refundedAmount = excessAmount;
      } else if (paymentStatus === 'Partial Refund') {
        if (!paymentAccountId) {
          showToast('Please select a Payment Account for the refund.', 'warning');
          return;
        }
        const refundAmt = parseFloat(document.getElementById('salesPaymentAmount').value) || 0;
        if (refundAmt <= 0) {
          showToast('Refund Amount must be greater than zero for Partial Refunds.', 'warning');
          return;
        }
        if (refundAmt > excessAmount) {
          showToast(`Refund Amount cannot exceed the excess amount of ₹${fmtNum(excessAmount)}.`, 'warning');
          return;
        }
        if (refundAmt === excessAmount) {
          paymentStatus = 'Full Refund';
          refundedAmount = excessAmount;
        } else {
          refundedAmount = refundAmt;
        }
      } else {
        paymentStatus = 'Not Refunded';
        refundedAmount = 0;
      }
    } else {
      if (paymentStatus !== 'Not Paid' && paymentStatus !== 'No Refund') {
        if (!paymentAccountId) {
          showToast('Please select a Payment Account.', 'warning');
          return;
        }
        if (paymentStatus === 'Full Payment' || paymentStatus === 'Full Refund') {
          paymentAmount = getSalesPaymentMax(total);
        } else if (paymentStatus === 'Partial Payment' || paymentStatus === 'Partial Refund') {
          paymentAmount = parseFloat(document.getElementById('salesPaymentAmount').value) || 0;
          if (paymentAmount <= 0) {
            const typeLabel = currentSalesVoucherSubtype === 'Return' ? 'Refund' : 'Payment';
            showToast(`${typeLabel} Amount must be greater than zero for Partial ${typeLabel}s.`, 'warning');
            return;
          }
          const maxVal = getSalesPaymentMax(total);
          if (paymentAmount > maxVal) {
            const limitMsg = (currentSalesVoucherSubtype === 'Return')
              ? `Refund Amount cannot exceed the allowed refund amount of ₹${fmtNum(maxVal)}.`
              : ((currentSalesVoucherSubtype === 'Invoice' && orderNo)
                ? `Payment Amount cannot exceed the balance payment of ₹${fmtNum(maxVal)}.`
                : `Payment Amount cannot exceed the Grand Total of ₹${fmtNum(maxVal)}.`);
            showToast(limitMsg, 'warning');
            return;
          }
          if (currentSalesVoucherSubtype === 'Return') {
            const origInv = getOriginalInvoiceForReturn();
            if (origInv) {
              let origPaidAmt = 0;
              if (origInv.paymentStatus === 'Full Payment') {
                origPaidAmt = origInv.total;
              } else if (origInv.paymentStatus === 'Partial Payment') {
                origPaidAmt = origInv.paymentAmount || 0;
              }
              if (paymentAmount > origPaidAmt) {
                showToast(`Refund Amount cannot exceed the original invoice paid amount of ₹${fmtNum(origPaidAmt)}.`, 'warning');
                return;
              }
            }
          }
        }
      }
    }

    const isEditPosted = window._editingSalesInvoice && !window._editingSalesInvoice.isDraft;
    const existingPostedInv = isEditPosted ? (window.KYA_STORE.salesVouchers || []).find(v => v.id === window._editingSalesInvoice.id) : null;
    const existingJournalEntryId = existingPostedInv ? (existingPostedInv.journalEntryId || '') : '';
    
    const invoiceData = {
      id: isEditPosted ? window._editingSalesInvoice.id : Date.now(),
      type: currentSalesType,
      invoiceNo,
      isReturn: currentSalesVoucherSubtype === 'Return',
      isOrder: currentSalesVoucherSubtype === 'Order',
      returnAgainstInvoice: currentSalesVoucherSubtype === 'Return' ? (document.getElementById('salesInvoiceSelectTriggerText')?.textContent.trim() || '') : '',
      customerId,
      salesExecutiveId,
      salesSupplyType,
      date,
      dueDate,
      orderNo,
      notes,
      tdsTcsMode,
      tdsTcsRate,
      tdsTcsAmount,
      adjustments,
      subTotal,
      total,
      paymentStatus,
      paymentAccountId,
      paymentAmount,
      excessAmount: excessAmount > 0 ? excessAmount : undefined,
      refundedAmount: excessAmount > 0 ? refundedAmount : undefined,
      refundJournalEntryIds: excessAmount > 0 ? refundJournalEntryIds : undefined,
      rows: JSON.parse(JSON.stringify(salesRows)),
      partyOverride: window._salesPartyOverride ? JSON.parse(JSON.stringify(window._salesPartyOverride)) : null,
      uploadedDoc: window._salesUploadedDoc || null,
      journalEntryId: existingJournalEntryId || '', 
      postedAt: isEditPosted ? (existingPostedInv?.postedAt || Date.now()) : Date.now()
    };

    // Post to accounting journal entries (flow to Trial Balance, Ledgers, Voucher Desk)
    const jEntryId = postSalesVoucherToJournal(invoiceData);
    if (jEntryId) {
      invoiceData.journalEntryId = jEntryId;
    }
    
    if (window._editingSalesInvoice && window._editingSalesInvoice.isDraft) {
      window.KYA_STORE.salesVouchersDrafts = window.KYA_STORE.salesVouchersDrafts.filter(d => d.id !== window._editingSalesInvoice.id);
    }
    
    if (isEditPosted) {
      const idx = window.KYA_STORE.salesVouchers.findIndex(v => v.id === window._editingSalesInvoice.id);
      if (idx > -1) {
        window.KYA_STORE.salesVouchers[idx] = invoiceData;
      } else {
        window.KYA_STORE.salesVouchers.push(invoiceData);
      }
    } else {
      window.KYA_STORE.salesVouchers.push(invoiceData);
    }
    
    if (currentSalesInvoiceMode === 'Auto' && !isEditPosted) {
      if (currentSalesVoucherSubtype === 'Return') {
        window.KYA_STORE.salesReturnCtr = (window.KYA_STORE.salesReturnCtr || 1) + 1;
      } else if (currentSalesVoucherSubtype === 'Order') {
        window.KYA_STORE.salesOrderCtr = (window.KYA_STORE.salesOrderCtr || 1) + 1;
      } else {
        window.KYA_STORE.salesInvoiceCtr = (window.KYA_STORE.salesInvoiceCtr || 1) + 1;
      }
    }
    
    let successMsg = `Invoice "${invoiceNo}" posted successfully.`;
    if (currentSalesVoucherSubtype === 'Return') {
      successMsg = `Sales Reversal "${invoiceNo}" posted successfully.`;
    } else if (currentSalesVoucherSubtype === 'Order') {
      successMsg = `Sales Pre Invoice "${invoiceNo}" saved successfully.`;
    }
    showToast(successMsg, 'success');
    window._editingSalesInvoice = null;
    currentSalesVoucherSubtype = 'Invoice';
    initSalesForm();
    openTab('sales_voucher');
    
    if (typeof refreshAllReports === 'function') refreshAllReports();
    if (typeof renderVoucherDeskPanel === 'function') renderVoucherDeskPanel();
    if (typeof renderSalesPostedPanel === 'function') renderSalesPostedPanel();
    if (typeof renderLedgerStatementView === 'function') renderLedgerStatementView();
    triggerAutoBackup();
  }

  function postSalesVoucherToJournal(invoice) {
    if (!invoice) return '';
    const isRet = !!invoice.isReturn;
    const isOrd = !!invoice.isOrder;
    
    // Ensure core system ledgers exist in CoA
    if (typeof getOrCreateSystemLedger === 'function') {
      getOrCreateSystemLedger('Trade Receivables', 'sg-tr');
      getOrCreateSystemLedger('Sales Account', 'sg-rfo');
      getOrCreateSystemLedger('Sales Reversals', 'sg-rfo');
      getOrCreateSystemLedger('Output CGST', 'sg-ocl');
      getOrCreateSystemLedger('Output SGST', 'sg-ocl');
      getOrCreateSystemLedger('Output IGST', 'sg-ocl');
      getOrCreateSystemLedger('GST Payable', 'sg-ocl');
      getOrCreateSystemLedger('TDS Receivable', 'sg-stla');
      getOrCreateSystemLedger('TCS Payable', 'sg-ocl');
      getOrCreateSystemLedger('Adjustments Account', 'sg-oe');
      getOrCreateSystemLedger('Advance from Customers', 'sg-ocl');
      getOrCreateSystemLedger('Refund Payable', 'sg-ocl');
    }

    const paidAmount = (invoice.paymentStatus === 'Full Payment' || invoice.paymentStatus === 'Full Refund')
      ? getSalesPaymentMax(invoice.total)
      : ((invoice.paymentStatus === 'Partial Payment' || invoice.paymentStatus === 'Partial Refund')
        ? (parseFloat(invoice.paymentAmount) || 0)
        : 0);

    if (isOrd && paidAmount <= 0) {
      if (invoice.journalEntryId && typeof postedEntries !== 'undefined') {
        postedEntries = postedEntries.filter(e => e.id !== invoice.journalEntryId);
        if (typeof refreshAllReports === 'function') refreshAllReports();
      }
      return '';
    }

    const journalRows = [];
    const custs = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
    const cust = custs.find(c => String(c.id) === String(invoice.customerId));
    const customerName = cust ? cust.name : (invoice.customerName || 'Customer');

    if (isOrd) {
      // ── SALES ORDER ADVANCE PAYMENT ───────────────────────────────
      const payAccount = (typeof coaLedgers !== 'undefined' ? coaLedgers : []).find(l => l.id == invoice.paymentAccountId);
      const payAccountName = payAccount ? payAccount.name : 'Cash Account';

      journalRows.push({
        id: 1,
        type: 'By',
        particular: payAccountName,
        debit: paidAmount.toFixed(2),
        credit: ''
      });

      const advanceLedgerId = getOrCreateSystemLedger('Advance from Customers', 'sg-ocl');
      const advanceLedgerName = (coaLedgers.find(l => l.id == advanceLedgerId) || { name: 'Advance from Customers' }).name;
      journalRows.push({
        id: 2,
        type: 'To',
        particular: advanceLedgerName,
        debit: '',
        credit: paidAmount.toFixed(2)
      });

    } else if (isRet) {
      // ── SALES REVERSAL / RETURN ───────────────────────────────────
      if (invoice.type === 'Product') {
        let totalRevenue = 0;
        (invoice.rows || []).forEach(r => {
          const base = (parseFloat(r.qty) || 0) * (parseFloat(r.rate) || 0);
          const discAmt = r.discountType === 'pct' ? (base * ((parseFloat(r.discount) || 0) / 100)) : (parseFloat(r.discount) || 0);
          totalRevenue += Math.max(0, base - discAmt);
        });
        if (totalRevenue > 0) {
          const salesReturnLedgerId = getOrCreateSystemLedger('Sales Reversals', 'sg-rfo');
          const salesReturnName = (coaLedgers.find(l => l.id == salesReturnLedgerId) || { name: 'Sales Reversals' }).name;
          journalRows.push({
            id: journalRows.length + 1,
            type: 'By',
            particular: salesReturnName,
            debit: totalRevenue.toFixed(2),
            credit: ''
          });
        }
      } else {
        const revenueByLedger = {};
        (invoice.rows || []).forEach(r => {
          const base = parseFloat(r.baseAmount) || 0;
          const discAmt = r.discountType === 'pct' ? (base * ((parseFloat(r.discount) || 0) / 100)) : (parseFloat(r.discount) || 0);
          const amt = Math.max(0, base - discAmt);
          revenueByLedger[r.revenueLedgerId] = (revenueByLedger[r.revenueLedgerId] || 0) + amt;
        });
        for (const ledgId in revenueByLedger) {
          const revAmt = revenueByLedger[ledgId];
          if (revAmt > 0) {
            const ledgerName = (coaLedgers.find(l => l.id == ledgId) || { name: 'Revenue' }).name;
            journalRows.push({
              id: journalRows.length + 1,
              type: 'By',
              particular: ledgerName,
              debit: revAmt.toFixed(2),
              credit: ''
            });
          }
        }
      }

      let totalGst = 0;
      (invoice.rows || []).forEach(r => {
        const base = invoice.type === 'Product' ? ((parseFloat(r.qty) || 0) * (parseFloat(r.rate) || 0)) : (parseFloat(r.baseAmount) || 0);
        const discAmt = r.discountType === 'pct' ? (base * ((parseFloat(r.discount) || 0) / 100)) : (parseFloat(r.discount) || 0);
        const afterDiscount = Math.max(0, base - discAmt);
        totalGst += afterDiscount * ((parseFloat(r.tax) || 0) / 100);
      });
      if (totalGst > 0) {
        const supplyType = invoice.salesSupplyType || 'Intra-State (CGST + SGST)';
        if (supplyType === 'Intra-State (CGST + SGST)' || supplyType === 'Deemed Export') {
          const cgstAmt = totalGst / 2;
          const sgstAmt = totalGst / 2;
          const cgstLedgerId = getOrCreateSystemLedger('Output CGST', 'sg-ocl');
          const cgstName = (coaLedgers.find(l => l.id == cgstLedgerId) || { name: 'Output CGST' }).name;
          journalRows.push({ id: journalRows.length + 1, type: 'By', particular: cgstName, debit: cgstAmt.toFixed(2), credit: '' });
          const sgstLedgerId = getOrCreateSystemLedger('Output SGST', 'sg-ocl');
          const sgstName = (coaLedgers.find(l => l.id == sgstLedgerId) || { name: 'Output SGST' }).name;
          journalRows.push({ id: journalRows.length + 1, type: 'By', particular: sgstName, debit: sgstAmt.toFixed(2), credit: '' });
        } else if (supplyType === 'Inter-State (IGST)' || supplyType === 'SEZ With Tax') {
          const igstLedgerId = getOrCreateSystemLedger('Output IGST', 'sg-ocl');
          const igstName = (coaLedgers.find(l => l.id == igstLedgerId) || { name: 'Output IGST' }).name;
          journalRows.push({ id: journalRows.length + 1, type: 'By', particular: igstName, debit: totalGst.toFixed(2), credit: '' });
        } else {
          const gstLedgerId = getOrCreateSystemLedger('GST Payable', 'sg-ocl');
          const gstName = (coaLedgers.find(l => l.id == gstLedgerId) || { name: 'GST Payable' }).name;
          journalRows.push({ id: journalRows.length + 1, type: 'By', particular: gstName, debit: totalGst.toFixed(2), credit: '' });
        }
      }

      if (invoice.tdsTcsMode === 'TCS' && (parseFloat(invoice.tdsTcsAmount) || 0) > 0) {
        const tcsLedgerId = getOrCreateSystemLedger('TCS Payable', 'sg-ocl');
        const tcsName = (coaLedgers.find(l => l.id == tcsLedgerId) || { name: 'TCS Payable' }).name;
        journalRows.push({ id: journalRows.length + 1, type: 'By', particular: tcsName, debit: (parseFloat(invoice.tdsTcsAmount) || 0).toFixed(2), credit: '' });
      }

      if ((parseFloat(invoice.adjustments) || 0) > 0) {
        const adjustmentsLedgerId = getOrCreateSystemLedger('Adjustments Account', 'sg-oe');
        const adjName = (coaLedgers.find(l => l.id == adjustmentsLedgerId) || { name: 'Adjustments Account' }).name;
        journalRows.push({ id: journalRows.length + 1, type: 'By', particular: adjName, debit: (parseFloat(invoice.adjustments) || 0).toFixed(2), credit: '' });
      }

      const origInv = getOriginalInvoiceForReturn();
      let origPaidAmt = 0;
      if (origInv) {
        if (origInv.paymentStatus === 'Full Payment') origPaidAmt = parseFloat(origInv.total) || 0;
        else if (origInv.paymentStatus === 'Partial Payment') origPaidAmt = parseFloat(origInv.paymentAmount) || 0;
      }

      if (paidAmount > 0) {
        const payAccount = (typeof coaLedgers !== 'undefined' ? coaLedgers : []).find(l => l.id == invoice.paymentAccountId);
        const payAccountName = payAccount ? payAccount.name : 'Cash Account';
        journalRows.push({
          id: journalRows.length + 1,
          type: 'To',
          particular: payAccountName,
          debit: '',
          credit: paidAmount.toFixed(2)
        });
      }

      const pendingRefund = Math.max(0, origPaidAmt - paidAmount);
      if (pendingRefund > 0) {
        const refundLedgerId = getOrCreateSystemLedger('Refund Payable', 'sg-ocl');
        const refundLedgerName = (coaLedgers.find(l => l.id == refundLedgerId) || { name: 'Refund Payable' }).name;
        journalRows.push({
          id: journalRows.length + 1,
          type: 'To',
          particular: refundLedgerName,
          debit: '',
          credit: pendingRefund.toFixed(2)
        });
      }

      const debtReduction = Math.max(0, (parseFloat(invoice.total) || 0) - origPaidAmt);
      if (debtReduction > 0) {
        const trLedgerId = getOrCreateSystemLedger('Trade Receivables', 'sg-tr');
        const trName = (coaLedgers.find(l => l.id == trLedgerId) || { name: 'Trade Receivables' }).name;
        journalRows.push({
          id: journalRows.length + 1,
          type: 'To',
          particular: trName,
          debit: '',
          credit: debtReduction.toFixed(2)
        });
      }

      if (invoice.tdsTcsMode === 'TDS' && (parseFloat(invoice.tdsTcsAmount) || 0) > 0) {
        const tdsLedgerId = getOrCreateSystemLedger('TDS Receivable', 'sg-stla');
        const tdsName = (coaLedgers.find(l => l.id == tdsLedgerId) || { name: 'TDS Receivable' }).name;
        journalRows.push({
          id: journalRows.length + 1,
          type: 'To',
          particular: tdsName,
          debit: '',
          credit: (parseFloat(invoice.tdsTcsAmount) || 0).toFixed(2)
        });
      }

      if ((parseFloat(invoice.adjustments) || 0) < 0) {
        const adjustmentsLedgerId = getOrCreateSystemLedger('Adjustments Account', 'sg-oe');
        const adjName = (coaLedgers.find(l => l.id == adjustmentsLedgerId) || { name: 'Adjustments Account' }).name;
        journalRows.push({
          id: journalRows.length + 1,
          type: 'To',
          particular: adjName,
          debit: '',
          credit: Math.abs(parseFloat(invoice.adjustments) || 0).toFixed(2)
        });
      }

    } else {
      // ── SALES INVOICE POSTING ─────────────────────────────────────
      const invTotal = parseFloat(invoice.total) || 0;
      const unpaidAmount = Math.max(0, invTotal - paidAmount);

      if (unpaidAmount > 0) {
        const trLedgerId = getOrCreateSystemLedger('Trade Receivables', 'sg-tr');
        const trName = (coaLedgers.find(l => l.id == trLedgerId) || { name: 'Trade Receivables' }).name;
        journalRows.push({
          id: journalRows.length + 1,
          type: 'By',
          particular: trName,
          debit: unpaidAmount.toFixed(2),
          credit: ''
        });
      }

      if (paidAmount > 0) {
        const payAccount = (typeof coaLedgers !== 'undefined' ? coaLedgers : []).find(l => l.id == invoice.paymentAccountId);
        const payAccountName = payAccount ? payAccount.name : 'Cash Account';
        journalRows.push({
          id: journalRows.length + 1,
          type: 'By',
          particular: payAccountName,
          debit: paidAmount.toFixed(2),
          credit: ''
        });
      }

      if (invoice.tdsTcsMode === 'TDS' && (parseFloat(invoice.tdsTcsAmount) || 0) > 0) {
        const tdsLedgerId = getOrCreateSystemLedger('TDS Receivable', 'sg-stla');
        const tdsName = (coaLedgers.find(l => l.id == tdsLedgerId) || { name: 'TDS Receivable' }).name;
        journalRows.push({
          id: journalRows.length + 1,
          type: 'By',
          particular: tdsName,
          debit: (parseFloat(invoice.tdsTcsAmount) || 0).toFixed(2),
          credit: ''
        });
      }

      if ((parseFloat(invoice.adjustments) || 0) < 0) {
        const adjustmentsLedgerId = getOrCreateSystemLedger('Adjustments Account', 'sg-oe');
        const adjName = (coaLedgers.find(l => l.id == adjustmentsLedgerId) || { name: 'Adjustments Account' }).name;
        journalRows.push({
          id: journalRows.length + 1,
          type: 'By',
          particular: adjName,
          debit: Math.abs(parseFloat(invoice.adjustments) || 0).toFixed(2),
          credit: ''
        });
      }

      // Revenue Credit
      if (invoice.type === 'Product') {
        let totalRevenue = 0;
        (invoice.rows || []).forEach(r => {
          const base = (parseFloat(r.qty) || 0) * (parseFloat(r.rate) || 0);
          const discAmt = r.discountType === 'pct' ? (base * ((parseFloat(r.discount) || 0) / 100)) : (parseFloat(r.discount) || 0);
          totalRevenue += Math.max(0, base - discAmt);
        });
        if (totalRevenue > 0) {
          const salesLedgerId = getOrCreateSystemLedger('Sales Account', 'sg-rfo');
          const salesName = (coaLedgers.find(l => l.id == salesLedgerId) || { name: 'Sales Account' }).name;
          journalRows.push({
            id: journalRows.length + 1,
            type: 'To',
            particular: salesName,
            debit: '',
            credit: totalRevenue.toFixed(2)
          });
        }
      } else {
        const revenueByLedger = {};
        (invoice.rows || []).forEach(r => {
          const base = parseFloat(r.baseAmount) || 0;
          const discAmt = r.discountType === 'pct' ? (base * ((parseFloat(r.discount) || 0) / 100)) : (parseFloat(r.discount) || 0);
          const amt = Math.max(0, base - discAmt);
          revenueByLedger[r.revenueLedgerId] = (revenueByLedger[r.revenueLedgerId] || 0) + amt;
        });
        for (const ledgId in revenueByLedger) {
          const revAmt = revenueByLedger[ledgId];
          if (revAmt > 0) {
            const ledgerName = (coaLedgers.find(l => l.id == ledgId) || { name: 'Revenue' }).name;
            journalRows.push({
              id: journalRows.length + 1,
              type: 'To',
              particular: ledgerName,
              debit: '',
              credit: revAmt.toFixed(2)
            });
          }
        }
      }

      // GST Credit
      let totalGst = 0;
      (invoice.rows || []).forEach(r => {
        const base = invoice.type === 'Product' ? ((parseFloat(r.qty) || 0) * (parseFloat(r.rate) || 0)) : (parseFloat(r.baseAmount) || 0);
        const discAmt = r.discountType === 'pct' ? (base * ((parseFloat(r.discount) || 0) / 100)) : (parseFloat(r.discount) || 0);
        const afterDiscount = Math.max(0, base - discAmt);
        totalGst += afterDiscount * ((parseFloat(r.tax) || 0) / 100);
      });
      if (totalGst > 0) {
        const supplyType = invoice.salesSupplyType || 'Intra-State (CGST + SGST)';
        if (supplyType === 'Intra-State (CGST + SGST)' || supplyType === 'Deemed Export') {
          const cgstAmt = totalGst / 2;
          const sgstAmt = totalGst / 2;
          const cgstLedgerId = getOrCreateSystemLedger('Output CGST', 'sg-ocl');
          const cgstName = (coaLedgers.find(l => l.id == cgstLedgerId) || { name: 'Output CGST' }).name;
          journalRows.push({ id: journalRows.length + 1, type: 'To', particular: cgstName, debit: '', credit: cgstAmt.toFixed(2) });
          const sgstLedgerId = getOrCreateSystemLedger('Output SGST', 'sg-ocl');
          const sgstName = (coaLedgers.find(l => l.id == sgstLedgerId) || { name: 'Output SGST' }).name;
          journalRows.push({ id: journalRows.length + 1, type: 'To', particular: sgstName, debit: '', credit: sgstAmt.toFixed(2) });
        } else if (supplyType === 'Inter-State (IGST)' || supplyType === 'SEZ With Tax') {
          const igstLedgerId = getOrCreateSystemLedger('Output IGST', 'sg-ocl');
          const igstName = (coaLedgers.find(l => l.id == igstLedgerId) || { name: 'Output IGST' }).name;
          journalRows.push({ id: journalRows.length + 1, type: 'To', particular: igstName, debit: '', credit: totalGst.toFixed(2) });
        } else {
          const gstLedgerId = getOrCreateSystemLedger('GST Payable', 'sg-ocl');
          const gstName = (coaLedgers.find(l => l.id == gstLedgerId) || { name: 'GST Payable' }).name;
          journalRows.push({ id: journalRows.length + 1, type: 'To', particular: gstName, debit: '', credit: totalGst.toFixed(2) });
        }
      }

      if (invoice.tdsTcsMode === 'TCS' && (parseFloat(invoice.tdsTcsAmount) || 0) > 0) {
        const tcsLedgerId = getOrCreateSystemLedger('TCS Payable', 'sg-ocl');
        const tcsName = (coaLedgers.find(l => l.id == tcsLedgerId) || { name: 'TCS Payable' }).name;
        journalRows.push({ id: journalRows.length + 1, type: 'To', particular: tcsName, debit: '', credit: (parseFloat(invoice.tdsTcsAmount) || 0).toFixed(2) });
      }

      if ((parseFloat(invoice.adjustments) || 0) > 0) {
        const adjustmentsLedgerId = getOrCreateSystemLedger('Adjustments Account', 'sg-oe');
        const adjName = (coaLedgers.find(l => l.id == adjustmentsLedgerId) || { name: 'Adjustments Account' }).name;
        journalRows.push({ id: journalRows.length + 1, type: 'To', particular: adjName, debit: '', credit: (parseFloat(invoice.adjustments) || 0).toFixed(2) });
      }

      // Check linked Sales Order advance
      let orderAdvanceAmount = 0;
      if (invoice.orderNo) {
        const linkedOrder = (window.KYA_STORE.salesVouchers || []).find(v => v.isOrder && v.invoiceNo.toLowerCase() === invoice.orderNo.toLowerCase());
        if (linkedOrder) {
          if (linkedOrder.paymentStatus === 'Full Payment') orderAdvanceAmount = parseFloat(linkedOrder.total) || 0;
          else if (linkedOrder.paymentStatus === 'Partial Payment') orderAdvanceAmount = parseFloat(linkedOrder.paymentAmount) || 0;
        }
      }
      if (orderAdvanceAmount > 0) {
        const advanceLedgerId = getOrCreateSystemLedger('Advance from Customers', 'sg-ocl');
        const advanceLedgerName = (coaLedgers.find(l => l.id == advanceLedgerId) || { name: 'Advance from Customers' }).name;
        
        journalRows.push({
          id: journalRows.length + 1,
          type: 'By',
          particular: advanceLedgerName,
          debit: orderAdvanceAmount.toFixed(2),
          credit: ''
        });
        
        const settledAmount = Math.min(invTotal, orderAdvanceAmount);
        const excessAmount = Math.max(0, orderAdvanceAmount - invTotal);
        
        if (settledAmount > 0) {
          const trLedgerId = getOrCreateSystemLedger('Trade Receivables', 'sg-tr');
          const trName = (coaLedgers.find(l => l.id == trLedgerId) || { name: 'Trade Receivables' }).name;
          journalRows.push({
            id: journalRows.length + 1,
            type: 'To',
            particular: trName,
            debit: '',
            credit: settledAmount.toFixed(2)
          });
        }
        
        if (excessAmount > 0) {
          const refundLedgerId = getOrCreateSystemLedger('Refund Payable', 'sg-ocl');
          const refundLedgerName = (coaLedgers.find(l => l.id == refundLedgerId) || { name: 'Refund Payable' }).name;
          journalRows.push({
            id: journalRows.length + 1,
            type: 'To',
            particular: refundLedgerName,
            debit: '',
            credit: excessAmount.toFixed(2)
          });
        }
      }
    }
    
    let execText = '';
    if (invoice.salesExecutiveId && typeof ohEmployees !== 'undefined') {
      const execEmp = ohEmployees.find(e => e.id == invoice.salesExecutiveId);
      if (execEmp) {
        execText = ` Sales Executive: ${execEmp.name}.`;
      }
    }

    const entryId = invoice.journalEntryId || Date.now();
    const prefix = isRet ? 'SR-' : (isOrd ? 'SO-' : 'SV-');
    const voucherNo = (invoice.invoiceNo.startsWith(prefix) || invoice.invoiceNo.startsWith('INV-')) ? invoice.invoiceNo : `${prefix}${invoice.invoiceNo}`;

    const entry = {
      id:             entryId,
      date:           invoice.date,
      voucherNo:      voucherNo,
      preparedBy:     'Sales Module',
      departmentId:   '',
      isBudget:       false,
      firstParticular: (paidAmount > 0) ? (coaLedgers.find(l => l.id == invoice.paymentAccountId)?.name || 'Cash Account') : 'Trade Receivables',
      amount:         isOrd ? fmtNum(paidAmount) : fmtNum(invoice.total),
      allRows:        journalRows,
      narration:      isOrd
        ? `Advance received against Sales Order No. ${invoice.invoiceNo} from customer ${customerName}.${execText} ${invoice.notes || ''}`.trim()
        : (isRet
          ? `Sales Reversal No. ${invoice.invoiceNo} posted for customer ${customerName}.${execText} ${invoice.notes || ''}`.trim()
          : `Sales Invoice No. ${invoice.invoiceNo} posted for customer ${customerName}.${execText} ${invoice.notes || ''}`.trim()),
    };
    
    if (typeof postedEntries !== 'undefined') {
      if (invoice.journalEntryId) {
        const idx = postedEntries.findIndex(e => e.id === invoice.journalEntryId);
        if (idx > -1) {
          postedEntries[idx] = entry;
        } else {
          postedEntries.unshift(entry);
        }
      } else {
        postedEntries.unshift(entry);
      }
    }
    refreshAllReports();
    return entryId;
  }

  // ── Global Window Exports ──
  window.postSalesInvoice = postSalesInvoice;
  window.saveSalesDraft = saveSalesDraft;
  window.loadSalesInvoice = loadSalesInvoice;
  window.postSalesVoucherToJournal = postSalesVoucherToJournal;
