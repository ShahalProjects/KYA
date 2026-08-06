// ══════════════════════════════════════════════════════════════════
  //  SALES POSTING — Load/save drafts, post invoice, post to journal
  //  (Split from sales.js for maintainability)
  function loadSalesInvoice(inv, isDraft) {
    openTab('sales_voucher');
    
    currentSalesVoucherSubtype = inv.isReturn ? 'Return' : (inv.isOrder ? 'Order' : 'Invoice');
    updateVoucherSubtypeUI();
    
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
    
    setInvoiceNoMode(inv.mode || 'Manual');
    const invNoEl = document.getElementById('salesInvoiceNo');
    const chipEl = document.getElementById('salesVoucherChipDisplay');
    const triggerText = document.getElementById('salesInvoiceSelectTriggerText');
    if (invNoEl) invNoEl.value = inv.invoiceNo;
    if (chipEl) chipEl.textContent = inv.invoiceNo;
    if (triggerText && inv.isReturn) {
      let retAgainst = inv.returnAgainstInvoice;
      if (!retAgainst && inv.notes) {
        const match = inv.notes.match(/Return against (?:invoice|order)\s+([^\s\.]+)/i);
        if (match) retAgainst = match[1];
      }
      triggerText.textContent = retAgainst || 'Select Invoice/Order';
    }
    
    const orderEl = document.getElementById('salesOrderNo');
    const dateEl = document.getElementById('salesDate');
    const dueEl = document.getElementById('salesDueDate');
    if (orderEl) orderEl.value = inv.orderNo || '';
    const orderTriggerText = document.getElementById('salesOrderSelectTriggerText');
    if (orderTriggerText) orderTriggerText.textContent = inv.orderNo || 'None';
    if (dateEl) dateEl.value = inv.date;
    if (dueEl) dueEl.value = inv.dueDate || inv.date;
    
    populateSalesCustomers(inv.customerId);
    populateSalesExecutives(inv.salesExecutiveId);
    const supplyTypeEl = document.getElementById('salesSupplyType');
    if (supplyTypeEl) supplyTypeEl.value = inv.salesSupplyType || 'Intra-State (CGST + SGST)';
    
    const notesEl = document.getElementById('salesNotes');
    if (notesEl) notesEl.value = inv.notes || '';
    
    const tdsTcsMode = inv.tdsTcsMode || 'None';
    const rateSelect = document.getElementById('salesTdsTcsRateSelect');
    const customInput = document.getElementById('salesTdsTcsRateCustom');
    const customWrap = document.getElementById('salesTdsTcsRateCustomWrap');
    const label = document.getElementById('salesTdsTcsRateLabel');
    const amt = document.getElementById('salesTdsTcsAmount');
    
    const rateVal = inv.tdsTcsRate || 0;
    if (rateSelect) {
      const stdOptions = ['0', '0.1', '1', '2', '5', '10'];
      if (stdOptions.includes(String(rateVal))) {
        rateSelect.value = String(rateVal);
        if (customWrap) customWrap.style.display = 'none';
      } else {
        rateSelect.value = 'custom';
        if (customInput) customInput.value = rateVal;
        if (customWrap) customWrap.style.display = 'flex';
      }
    }
    if (label) {
      label.textContent = (rateVal % 1 === 0 ? rateVal.toFixed(0) : (rateVal * 10 % 1 === 0 ? rateVal.toFixed(1) : rateVal.toFixed(2))) + '%';
    }
    if (amt) amt.value = inv.tdsTcsAmount !== undefined ? (inv.tdsTcsAmount === 0 ? '' : inv.tdsTcsAmount) : '';
    
    if (tdsTcsMode === 'TDS') {
      const tdsBtn = document.getElementById('salesTdsTcsTds');
      if (tdsBtn) tdsBtn.click();
    } else if (tdsTcsMode === 'TCS') {
      const tcsBtn = document.getElementById('salesTdsTcsTcs');
      if (tcsBtn) tcsBtn.click();
    } else {
      const noneBtn = document.getElementById('salesTdsTcsNone');
      if (noneBtn) noneBtn.click();
    }
    
    const adjEl = document.getElementById('salesAdjustments');
    if (adjEl) adjEl.value = inv.adjustments !== undefined ? (inv.adjustments === 0 ? '' : inv.adjustments) : '';
    
    const payStatus = inv.paymentStatus || 'Not Paid';
    if (payStatus === 'Full Payment' || payStatus === 'Full Refund') {
      const fullBtn = document.getElementById('salesPaymentStatusFull');
      if (fullBtn) fullBtn.click();
    } else if (payStatus === 'Partial Payment' || payStatus === 'Partial Refund') {
      const partBtn = document.getElementById('salesPaymentStatusPartial');
      if (partBtn) partBtn.click();
    } else {
      const notPaidBtn = document.getElementById('salesPaymentStatusNotPaid');
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
    
    salesRows = JSON.parse(JSON.stringify(inv.rows));
    if (inv.isReturn) {
      const orig = getOriginalInvoiceForReturn();
      if (orig) {
        const remainingRows = getInvoiceRemainingRows(orig, isDraft ? null : inv.id);
        salesRows.forEach((row, i) => {
          let match = null;
          if (inv.type === 'Product') {
            match = remainingRows.find(r => r.item === row.item);
          } else {
            match = remainingRows.find(r => r.revenueLedgerId == row.revenueLedgerId);
          }
          if (match) {
            row.origQty = match.qty;
            row.origRate = match.rate;
            row.origDiscount = match.discount;
            row.origDiscountType = match.discountType;
            row.origBaseAmount = match.baseAmount;
          } else {
            row.origQty = row.origQty !== undefined ? row.origQty : row.qty;
            row.origRate = row.origRate !== undefined ? row.origRate : row.rate;
            row.origDiscount = row.origDiscount !== undefined ? row.origDiscount : row.discount;
            row.origDiscountType = row.origDiscountType !== undefined ? row.origDiscountType : row.discountType;
            row.origBaseAmount = row.origBaseAmount !== undefined ? row.origBaseAmount : row.baseAmount;
          }
        });
      }
    }
    renderSalesRows();
    updateSalesReturnLockState();
    recalculateSalesTotals();
    updateSalesDocUI(inv.uploadedDoc || null);
    
    window._editingSalesInvoice = { id: inv.id, isDraft: isDraft };
  }

  function saveSalesDraft() {
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
        refundedAmount = parseFloat(document.getElementById('salesPaymentAmount').value) || 0;
      } else {
        paymentStatus = 'Not Refunded';
        refundedAmount = 0;
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
    
    if (salesRows.length === 0) {
      showToast('Please add at least one line item.', 'warning');
      return;
    }
    
    if (currentSalesType === 'Product') {
      const invalid = salesRows.some(r => !r.item.trim() || r.qty <= 0 || r.rate < 0);
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
      uploadedDoc: window._salesUploadedDoc || null,
      journalEntryId: '', 
      postedAt: isEditPosted ? (window.KYA_STORE.salesVouchers.find(v => v.id === window._editingSalesInvoice.id)?.postedAt || Date.now()) : Date.now()
    };
    
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
    triggerAutoBackup();
  }

  function postSalesVoucherToJournal(invoice) {
        }

      } else {
        // ── Sales Invoice Reversal ────────────────────────────────────────────
        // SALES REVERSAL JOURNAL ENTRIES (Debit Sales Reversals & tax, Credit Customer/Cash)
        if (paidAmount > 0) {
          const payAccount = coaLedgers.find(l => l.id == invoice.paymentAccountId);
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
          const refundLedgerName = coaLedgers.find(l => l.id == refundLedgerId).name;
          journalRows.push({
            id: journalRows.length + 1,
            type: 'To',
            particular: refundLedgerName,
            debit: '',
            credit: pendingRefund.toFixed(2)
          });
        }

        const debtReduction = Math.max(0, invoice.total - origPaidAmt);
        if (debtReduction > 0) {
          journalRows.push({
            id: journalRows.length + 1,
            type: 'To',
            particular: customerName,
            debit: '',
            credit: debtReduction.toFixed(2)
          });
        }

        if (invoice.tdsTcsMode === 'TDS' && invoice.tdsTcsAmount > 0) {
          const tdsLedgerId = getOrCreateSystemLedger('TDS Receivable', 'sg-stla');
          const tdsName = coaLedgers.find(l => l.id == tdsLedgerId).name;
          journalRows.push({
            id: journalRows.length + 1,
            type: 'To',
            particular: tdsName,
            debit: '',
            credit: invoice.tdsTcsAmount.toFixed(2)
          });
        }

        if (invoice.adjustments < 0) {
          const adjustmentsLedgerId = getOrCreateSystemLedger('Adjustments Account', 'sg-oe');
          const adjName = coaLedgers.find(l => l.id == adjustmentsLedgerId).name;
          journalRows.push({
            id: journalRows.length + 1,
            type: 'To',
            particular: adjName,
            debit: '',
            credit: Math.abs(invoice.adjustments).toFixed(2)
          });
        }

        if (invoice.type === 'Product') {
          let totalRevenue = 0;
          invoice.rows.forEach(r => {
            const base = r.qty * r.rate;
            const discAmt = r.discountType === 'pct' ? (base * (r.discount / 100)) : r.discount;
            totalRevenue += Math.max(0, base - discAmt);
          });
          if (totalRevenue > 0) {
            const salesReturnLedgerId = getOrCreateSystemLedger('Sales Reversals', 'sg-rfo');
            const salesReturnName = coaLedgers.find(l => l.id == salesReturnLedgerId).name;
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
          invoice.rows.forEach(r => {
            const base = r.baseAmount;
            const discAmt = r.discountType === 'pct' ? (base * (r.discount / 100)) : r.discount;
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
        invoice.rows.forEach(r => {
          const base = invoice.type === 'Product' ? (r.qty * r.rate) : r.baseAmount;
          const discAmt = r.discountType === 'pct' ? (base * (r.discount / 100)) : r.discount;
          const afterDiscount = Math.max(0, base - discAmt);
          totalGst += afterDiscount * (r.tax / 100);
        });
        if (totalGst > 0) {
          const supplyType = invoice.salesSupplyType || 'Intra-State (CGST + SGST)';
          if (supplyType === 'Intra-State (CGST + SGST)' || supplyType === 'Deemed Export') {
            const cgstAmt = totalGst / 2;
            const sgstAmt = totalGst / 2;
            const cgstLedgerId = getOrCreateSystemLedger('Output CGST', 'sg-ocl');
            const cgstName = coaLedgers.find(l => l.id == cgstLedgerId).name;
            journalRows.push({ id: journalRows.length + 1, type: 'By', particular: cgstName, debit: cgstAmt.toFixed(2), credit: '' });
            const sgstLedgerId = getOrCreateSystemLedger('Output SGST', 'sg-ocl');
            const sgstName = coaLedgers.find(l => l.id == sgstLedgerId).name;
            journalRows.push({ id: journalRows.length + 1, type: 'By', particular: sgstName, debit: sgstAmt.toFixed(2), credit: '' });
          } else if (supplyType === 'Inter-State (IGST)' || supplyType === 'SEZ With Tax') {
            const igstLedgerId = getOrCreateSystemLedger('Output IGST', 'sg-ocl');
            const igstName = coaLedgers.find(l => l.id == igstLedgerId).name;
            journalRows.push({ id: journalRows.length + 1, type: 'By', particular: igstName, debit: totalGst.toFixed(2), credit: '' });
          } else {
            const gstLedgerId = getOrCreateSystemLedger('GST Payable', 'sg-ocl');
            const gstName = coaLedgers.find(l => l.id == gstLedgerId).name;
            journalRows.push({ id: journalRows.length + 1, type: 'By', particular: gstName, debit: totalGst.toFixed(2), credit: '' });
          }
        }

        if (invoice.tdsTcsMode === 'TCS' && invoice.tdsTcsAmount > 0) {
          const tcsLedgerId = getOrCreateSystemLedger('TCS Payable', 'sg-ocl');
          const tcsName = coaLedgers.find(l => l.id == tcsLedgerId).name;
          journalRows.push({ id: journalRows.length + 1, type: 'By', particular: tcsName, debit: invoice.tdsTcsAmount.toFixed(2), credit: '' });
        }

        if (invoice.adjustments > 0) {
          const adjustmentsLedgerId = getOrCreateSystemLedger('Adjustments Account', 'sg-oe');
          const adjName = coaLedgers.find(l => l.id == adjustmentsLedgerId).name;
          journalRows.push({ id: journalRows.length + 1, type: 'By', particular: adjName, debit: invoice.adjustments.toFixed(2), credit: '' });
        }
      }
    } else {
      // ORIGINAL SALES INVOICE Posting (existing code)
      if (unpaidAmount > 0) {
        journalRows.push({
          id: journalRows.length + 1,
          type: 'By',
          particular: customerName,
          debit: unpaidAmount.toFixed(2),
          credit: ''
        });
      }
      
      if (paidAmount > 0) {
        const payAccount = coaLedgers.find(l => l.id == invoice.paymentAccountId);
        const payAccountName = payAccount ? payAccount.name : 'Cash Account';
        
        journalRows.push({
          id: journalRows.length + 1,
          type: 'By',
          particular: payAccountName,
          debit: paidAmount.toFixed(2),
          credit: ''
        });
      }
      
      if (invoice.tdsTcsMode === 'TDS' && invoice.tdsTcsAmount > 0) {
        const tdsLedgerId = getOrCreateSystemLedger('TDS Receivable', 'sg-stla');
        const tdsName = coaLedgers.find(l => l.id == tdsLedgerId).name;
        journalRows.push({
          id: journalRows.length + 1,
          type: 'By',
          particular: tdsName,
          debit: invoice.tdsTcsAmount.toFixed(2),
          credit: ''
        });
      }
      
      if (invoice.adjustments < 0) {
        const adjustmentsLedgerId = getOrCreateSystemLedger('Adjustments Account', 'sg-oe');
        const adjName = coaLedgers.find(l => l.id == adjustmentsLedgerId).name;
        journalRows.push({
          id: journalRows.length + 1,
          type: 'By',
          particular: adjName,
          debit: Math.abs(invoice.adjustments).toFixed(2),
          credit: ''
        });
      }
      
      if (invoice.type === 'Product') {
        let totalRevenue = 0;
        invoice.rows.forEach(r => {
          const base = r.qty * r.rate;
          const discAmt = r.discountType === 'pct' ? (base * (r.discount / 100)) : r.discount;
          totalRevenue += Math.max(0, base - discAmt);
        });
        if (totalRevenue > 0) {
          const salesLedgerId = getOrCreateSystemLedger('Sales Account', 'sg-rfo');
          const salesName = coaLedgers.find(l => l.id == salesLedgerId).name;
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
        invoice.rows.forEach(r => {
          const base = r.baseAmount;
          const discAmt = r.discountType === 'pct' ? (base * (r.discount / 100)) : r.discount;
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
      
      let totalGst = 0;
      invoice.rows.forEach(r => {
        const base = invoice.type === 'Product' ? (r.qty * r.rate) : r.baseAmount;
        const discAmt = r.discountType === 'pct' ? (base * (r.discount / 100)) : r.discount;
        const afterDiscount = Math.max(0, base - discAmt);
        totalGst += afterDiscount * (r.tax / 100);
      });
      if (totalGst > 0) {
        const supplyType = invoice.salesSupplyType || 'Intra-State (CGST + SGST)';
        if (supplyType === 'Intra-State (CGST + SGST)' || supplyType === 'Deemed Export') {
          const cgstAmt = totalGst / 2;
          const sgstAmt = totalGst / 2;
          
          const cgstLedgerId = getOrCreateSystemLedger('Output CGST', 'sg-ocl');
          const cgstName = coaLedgers.find(l => l.id == cgstLedgerId).name;
          journalRows.push({
            id: journalRows.length + 1,
            type: 'To',
            particular: cgstName,
            debit: '',
            credit: cgstAmt.toFixed(2)
          });
          
          const sgstLedgerId = getOrCreateSystemLedger('Output SGST', 'sg-ocl');
          const sgstName = coaLedgers.find(l => l.id == sgstLedgerId).name;
          journalRows.push({
            id: journalRows.length + 1,
            type: 'To',
            particular: sgstName,
            debit: '',
            credit: sgstAmt.toFixed(2)
          });
        } else if (supplyType === 'Inter-State (IGST)' || supplyType === 'SEZ With Tax') {
          const igstLedgerId = getOrCreateSystemLedger('Output IGST', 'sg-ocl');
          const igstName = coaLedgers.find(l => l.id == igstLedgerId).name;
          journalRows.push({
            id: journalRows.length + 1,
            type: 'To',
            particular: igstName,
            debit: '',
            credit: totalGst.toFixed(2)
          });
        } else {
          const gstLedgerId = getOrCreateSystemLedger('GST Payable', 'sg-ocl');
          const gstName = coaLedgers.find(l => l.id == gstLedgerId).name;
          journalRows.push({
            id: journalRows.length + 1,
            type: 'To',
            particular: gstName,
            debit: '',
            credit: totalGst.toFixed(2)
          });
        }
      }
      
      if (invoice.tdsTcsMode === 'TCS' && invoice.tdsTcsAmount > 0) {
        const tcsLedgerId = getOrCreateSystemLedger('TCS Payable', 'sg-ocl');
        const tcsName = coaLedgers.find(l => l.id == tcsLedgerId).name;
        journalRows.push({
          id: journalRows.length + 1,
          type: 'To',
          particular: tcsName,
          debit: '',
          credit: invoice.tdsTcsAmount.toFixed(2)
        });
      }
      
      if (invoice.adjustments > 0) {
        const adjustmentsLedgerId = getOrCreateSystemLedger('Adjustments Account', 'sg-oe');
        const adjName = coaLedgers.find(l => l.id == adjustmentsLedgerId).name;
        journalRows.push({
          id: journalRows.length + 1,
          type: 'To',
          particular: adjName,
          debit: '',
          credit: invoice.adjustments.toFixed(2)
        });
      }

      // Check if this invoice is linked to a sales order that had advance payment
      let orderAdvanceAmount = 0;
      if (invoice.orderNo) {
        const linkedOrder = (window.KYA_STORE.salesVouchers || []).find(v => v.isOrder && v.invoiceNo.toLowerCase() === invoice.orderNo.toLowerCase());
        if (linkedOrder) {
          if (linkedOrder.paymentStatus === 'Full Payment') {
            orderAdvanceAmount = linkedOrder.total;
          } else if (linkedOrder.paymentStatus === 'Partial Payment') {
            orderAdvanceAmount = linkedOrder.paymentAmount || 0;
          }
        }
      }
      if (orderAdvanceAmount > 0) {
        const advanceLedgerId = getOrCreateSystemLedger('Advance from Customers', 'sg-ocl');
        const advanceLedgerName = coaLedgers.find(l => l.id == advanceLedgerId).name;
        
        // Debit: Advance from Customers (By)
        journalRows.push({
          id: journalRows.length + 1,
          type: 'By',
          particular: advanceLedgerName,
          debit: orderAdvanceAmount.toFixed(2),
          credit: ''
        });
        
        const settledAmount = Math.min(invoice.total, orderAdvanceAmount);
        const excessAmount = Math.max(0, orderAdvanceAmount - invoice.total);
        
        if (settledAmount > 0) {
          // Credit: Customer Account (To)
          journalRows.push({
            id: journalRows.length + 1,
            type: 'To',
            particular: customerName,
            debit: '',
            credit: settledAmount.toFixed(2)
          });
        }
        
        if (excessAmount > 0) {
          // Credit: Refund Payable (To)
          const refundLedgerId = getOrCreateSystemLedger('Refund Payable', 'sg-ocl');
          const refundLedgerName = coaLedgers.find(l => l.id == refundLedgerId).name;
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
    if (invoice.salesExecutiveId) {
      const execEmp = ohEmployees.find(e => e.id == invoice.salesExecutiveId);
      if (execEmp) {
        execText = ` Sales Executive: ${execEmp.name}.`;
      }
    }

    const entryId = invoice.journalEntryId || Date.now();
    const entry = {
      id:             entryId,
      date:           invoice.date,
      voucherNo:      isRet 
        ? (invoice.invoiceNo.startsWith('SR-') || invoice.invoiceNo.startsWith('REV-') ? invoice.invoiceNo : `SR-${invoice.invoiceNo}`) 
        : (isOrd 
           ? (invoice.invoiceNo.startsWith('SO-') ? invoice.invoiceNo : `SO-${invoice.invoiceNo}`) 
           : (invoice.invoiceNo.startsWith('SV-') || invoice.invoiceNo.startsWith('INV-') ? invoice.invoiceNo : `SV-${invoice.invoiceNo}`)),
      preparedBy:     'Sales Module',
      departmentId:   '',
      isBudget:       false,
      firstParticular: customerName,
      amount:         isOrd ? fmtNum(paidAmount) : (isReturnAgainstOrder ? fmtNum(origPaidAmt) : fmtNum(invoice.total)),
      allRows:        journalRows,
      narration:      isOrd
        ? `Advance received against Sales Order No. ${invoice.invoiceNo} from customer ${customerName}.${execText} ${invoice.notes || ''}`
        : (isRet
          ? `Sales Reversal No. ${invoice.invoiceNo} posted for customer ${customerName}.${execText} ${invoice.notes || ''}`
          : `Sales Invoice No. ${invoice.invoiceNo} posted for customer ${customerName}.${execText} ${invoice.notes || ''}`),
    };
    
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
    refreshAllReports();
    return entryId;
  }

