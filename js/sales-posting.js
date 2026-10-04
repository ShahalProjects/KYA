  function loadSalesInvoice(inv, isDraft = false) {
    // Editing a stored voucher (posted or draft) vs. filling a fresh conversion — set first,
    // so numbering, refund limits and the like see the right voucher while it loads
    const store = window.KYA_STORE || {};
    const editIsPosted = !isDraft && (store.salesVouchers || []).some(v => String(v.id) === String(inv.id));
    const editIsDraft = isDraft && (store.salesVouchersDrafts || []).some(d => String(d.id) === String(inv.id));
    const editCtx = (editIsPosted || editIsDraft) ? { id: inv.id, isDraft: !!isDraft } : null;
    window._editingSalesInvoice = editCtx;
    window._salesPartyOverride = inv.partyOverride ? JSON.parse(JSON.stringify(inv.partyOverride)) : null;
    // A reversal made against a pre-invoice keeps that document as its Original Doc
    window._salesReversalPreInvoice = (inv.isReturn && inv.reversedPreInvoice)
      ? { type: inv.reversedPreInvoice.type, id: inv.reversedPreInvoice.id } : null;
    currentSalesVoucherSubtype = inv.isReturn ? 'Return' : 'Invoice';
    updateVoucherSubtypeUI();
    const dateEl = document.getElementById('salesDate');
    const dueEl = document.getElementById('salesDueDate');
    if (dateEl) dateEl.value = inv.date;
    if (dueEl) dueEl.value = inv.dueDate || inv.date;
    
    // Original Doc first, so a reversal's number can be built from it
    const returnTriggerText = document.getElementById('salesInvoiceSelectTriggerText');
    if (returnTriggerText) {
      if (inv.isReturn && inv.returnAgainstInvoice) {
        returnTriggerText.textContent = inv.returnAgainstInvoice;
      } else {
        returnTriggerText.textContent = '— Select —';
      }
      const hasOrigDoc = !!(inv.isReturn && inv.returnAgainstInvoice);
      returnTriggerText.style.color = hasOrigDoc ? 'var(--slate-800)' : '';
      returnTriggerText.style.fontWeight = hasOrigDoc ? '600' : '';
    }

    setInvoiceNoMode(inv.mode || 'Manual');
    const invNoEl = document.getElementById('salesInvoiceNo');
    // A draft saved without a number is stored as "Draft" — that is not a number
    const storedNo = (inv.invoiceNo && inv.invoiceNo.trim() && inv.invoiceNo.trim() !== 'Draft') ? inv.invoiceNo : '';
    if (invNoEl) {
      if (storedNo) {
        invNoEl.value = storedNo;
      } else if (inv.isReturn) {
        // setInvoiceNoMode already built it from the Original Doc
      } else if (inv.mode === 'Auto' || inv._isFromQuotation || inv.convertedFromQuotationId || inv._isFromProforma || inv.convertedFromProformaId) {
        invNoEl.value = typeof getNextAutoInvoiceNumber === 'function' ? getNextAutoInvoiceNumber() :
                        (typeof window.getNextAutoInvoiceNumber === 'function' ? window.getNextAutoInvoiceNumber() : '');
      } else {
        invNoEl.value = '';
      }
    }
    const chipEl = document.getElementById('salesVoucherChipDisplay');
    if (chipEl) chipEl.textContent = (invNoEl && invNoEl.value) || storedNo || (inv.isReturn ? 'REV-XXXX' : 'INV-XXXX');
    
    const notesEl = document.getElementById('salesNotes');
    if (notesEl) notesEl.value = inv.notes || '';
    
    const adjEl = document.getElementById('salesAdjustments');
    if (adjEl) adjEl.value = inv.adjustments || '';
    
    const btnAuto = document.getElementById('btnSalesAutoRoundOff');
    if (btnAuto) {
      if (inv.adjustments !== undefined && inv.adjustments !== '' && inv.adjustments != 0) {
        btnAuto.classList.add('active');
      } else {
        btnAuto.classList.remove('active');
      }
    }
    
    const noneBtn = document.getElementById('salesTdsTcsNone');
    const tdsBtn = document.getElementById('salesTdsTcsTds');
    const tcsBtn = document.getElementById('salesTdsTcsTcs');
    if (typeof unlockSalesTdsTcsButtons === 'function') unlockSalesTdsTcsButtons();
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
        // Keep the exact saved amount for custom rates (the stored % is rounded)
        const amtEl = document.getElementById('salesTdsTcsAmount');
        if (amtEl && parseFloat(inv.tdsTcsAmount) > 0) {
          amtEl.value = parseFloat(inv.tdsTcsAmount).toFixed(2);
          amtEl.dataset.manual = '1';
        }
      }
    }

    populateSalesCustomers(inv.customerId);
    // The stored id can be missing from the list (a party re-created, or a ledger later
    // added to the customer master under the same name): fall back to the party's name
    const custSelect = document.getElementById('salesCustomer');
    if (custSelect && !custSelect.value && inv.customerName) {
      const wanted = String(inv.customerName).trim().toLowerCase();
      const match = Array.from(custSelect.options).find(o =>
        o.value && o.textContent.split(' [A.K.A:')[0].trim().toLowerCase() === wanted);
      if (match) {
        populateSalesCustomers(match.value);
        inv.customerId = match.value;
      }
    }
    populateSalesExecutives(inv.salesExecutiveId);
    const supplyTypeEl = document.getElementById('salesSupplyType');
    if (supplyTypeEl) supplyTypeEl.value = inv.salesSupplyType || 'Intra-State (CGST + SGST)';
    
    const notPaidBtn = document.getElementById('salesPaymentStatusNotPaid');
    const fullBtn = document.getElementById('salesPaymentStatusFull');
    const partBtn = document.getElementById('salesPaymentStatusPartial');
    // A disabled button ignores .click(); the lock state is applied again below
    [notPaidBtn, fullBtn, partBtn].forEach(b => { if (b) b.disabled = false; });
    if (inv.paymentStatus === 'Full Payment' || inv.paymentStatus === 'Full Refund') {
      if (fullBtn) fullBtn.click();
    } else if (inv.paymentStatus === 'Partial Payment' || inv.paymentStatus === 'Partial Refund') {
      if (partBtn) partBtn.click();
    } else {
      if (notPaidBtn) notPaidBtn.click();
    }
    
    populateSalesPaymentAccounts(inv.paymentAccountId);
    if (typeof setSalesMultiPayments === 'function') setSalesMultiPayments(inv.paymentSplits || []);
    if (typeof updateSalesMultiPaymentUI === 'function') updateSalesMultiPaymentUI();
    const payAmtEl = document.getElementById('salesPaymentAmount');
    if (payAmtEl) {
      if (inv.paymentStatus === 'Full Payment' || inv.paymentStatus === 'Full Refund') {
        payAmtEl.value = (inv.paymentAmount || inv.total || '').toString();
      } else if (inv.paymentAmount) {
        payAmtEl.value = inv.paymentAmount;
      } else {
        payAmtEl.value = '';
      }
    }
    
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
    
    salesRows = JSON.parse(JSON.stringify(inv.rows || []));
    if (inv.isReturn) {
      const origInv = getOriginalInvoiceForReturn();
      if (origInv) {
        const remainingRows = getInvoiceRemainingRows(origInv, isDraft ? null : inv.id);
        salesRows.forEach(row => {
          const match = origInv.type === 'Product'
            ? remainingRows.find(r => r.item === row.item)
            : remainingRows.find(r => r.serviceName === row.serviceName);
          if (match) {
            // `remaining` already leaves out the reversal being edited (and a draft was
            // never taken out), so it is exactly what this reversal may cover
            row.origQty = match.qty;
            row.origRate = match.rate;
            row.origDiscount = match.discount;
            row.origDiscountType = match.discountType;
            row.origBaseAmount = match.baseAmount;
          }
        });
      }
    }
    renderSalesRows();
    updateSalesReturnLockState();
    recalculateSalesTotals();
    
    // A conversion left unposted must not carry its link or advance into this invoice
    window._pendingConvertQuotationId = null;
    window._pendingConvertProformaId = null;
    window._pendingConvertProformaAdvance = null;
    window._pendingConvertSalesOrderId = null;
    window._pendingConvertDeliveryChallanId = null;
    // A posted invoice keeps its links on the record itself (read back when re-posted);
    // a fresh conversion or a draft carries them as the pending conversion
    if (!editIsPosted) {
      if (inv && (inv._isFromQuotation || inv.convertedFromQuotationId)) {
        window._pendingConvertQuotationId = inv.convertedFromQuotationId;
      } else if (inv && (inv._isFromProforma || inv.convertedFromProformaId)) {
        window._pendingConvertProformaId = inv.convertedFromProformaId;
        window._pendingConvertProformaAdvance = {
          amount: inv.advancePaidAmount || 0,
          journalEntryId: inv.advanceJournalEntryId || null,
          voucherNo: inv.advanceVoucherNo || null
        };
      } else if (inv && (inv.convertedFromSalesOrderId || inv.convertedFromDeliveryChallanId)) {
        // A Sales Order / Delivery Challan brings its advance across the same way a proforma does
        window._pendingConvertSalesOrderId = inv.convertedFromSalesOrderId || null;
        window._pendingConvertDeliveryChallanId = inv.convertedFromDeliveryChallanId || null;
        window._pendingConvertProformaAdvance = {
          amount: inv.advancePaidAmount || 0,
          journalEntryId: inv.advanceJournalEntryId || null,
          voucherNo: inv.advanceVoucherNo || null
        };
      }
    }
    window._editingSalesInvoice = editCtx;
    if (typeof window.refreshSalesPreInvoicePicker === 'function') window.refreshSalesPreInvoicePicker();
    // With an advance, show the balance-only payment view and the advance / balance strip
    if (typeof window.applySalesAdvanceToPaymentUI === 'function') window.applySalesAdvanceToPaymentUI(inv);
    // Invoice Balance: the credits used, or the invoices a refund went to
    if (typeof getSalesAdjust === 'function' && getSalesAdjust()) {
      getSalesAdjust().load(inv.isReturn ? inv.creditApplications
        : ((inv.advanceRefund && typeof usesCreditAdjust === 'function' && usesCreditAdjust(inv.advanceRefund.accountId, inv.advanceRefund.splits))
          ? inv.advanceRefund.applications : inv.creditAdjustments));
    }
    // Now that the edit context is known, flag a number that's already used
    if (typeof validateSalesInvoiceNoField === 'function') validateSalesInvoiceNoField();
    updateSalesDocUI(inv.uploadedDoc || null);
    
    openTab('sales_voucher');
  }

  function saveSalesDraft() {
    if (typeof syncSalesRowsFromDOM === 'function') {
      syncSalesRowsFromDOM();
    }
    const draftRevPre = (currentSalesVoucherSubtype === 'Return' && typeof getSalesReversalPreInvoice === 'function') ? getSalesReversalPreInvoice() : null;
    if (currentSalesVoucherSubtype === 'Return' && !draftRevPre) {
      const origInv = getOriginalInvoiceForReturn();
      if (!origInv) {
        showToast('Please select the Original Doc (Invoice or Pre Invoice) for this sales reversal draft.', 'warning');
        return;
      }
    }
    const customerId = document.getElementById('salesCustomer').value;
    const salesExecutiveId = document.getElementById('salesExecutive').value;
    const salesSupplyType = document.getElementById('salesSupplyType').value;
    const invoiceNo = document.getElementById('salesInvoiceNo').value.trim();
    const date = document.getElementById('salesDate').value;
    const dueDate = document.getElementById('salesDueDate').value;
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
    // Invoice Balance as the account, or as a row of the Multi Payment / Multi Refund
    const draftUsesCredit = typeof usesCreditAdjust === 'function' && usesCreditAdjust(paymentAccountId,
      (typeof getSalesMultiPaymentSplits === 'function') ? getSalesMultiPaymentSplits() : []);

    if (paymentStatus === 'Full Payment' || paymentStatus === 'Full Refund') {
      paymentAmount = getSalesPaymentMax(total);
    } else if (paymentStatus === 'Partial Payment' || paymentStatus === 'Partial Refund') {
      paymentAmount = parseFloat(document.getElementById('salesPaymentAmount').value) || 0;
    }
    // Advance above the invoice value: keep the refund choice for the excess apart
    let draftAdvanceRefund = null;
    if (currentSalesVoucherSubtype !== 'Return' && typeof getSalesAdvanceExcess === 'function' && getSalesAdvanceExcess(total) > 0) {
      draftAdvanceRefund = toSalesAdvanceRefund(paymentStatus, paymentAmount, total, paymentAccountId,
        (typeof getSalesMultiPaymentSplits === 'function') ? getSalesMultiPaymentSplits() : []);
      paymentStatus = 'Not Paid';
      paymentAmount = 0;
    }
    // The form shows the balance only; store advance + this payment
    if (currentSalesVoucherSubtype !== 'Return' && typeof toStoredSalesPayment === 'function') {
      ({ paymentStatus, paymentAmount } = toStoredSalesPayment(paymentStatus, paymentAmount, total));
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
      returnAgainstInvoice: currentSalesVoucherSubtype === 'Return' ? (document.getElementById('salesInvoiceSelectTriggerText')?.textContent.trim() || '') : '',
      reversedPreInvoice: draftRevPre ? { type: draftRevPre.src.type, id: draftRevPre.doc.id, no: draftRevPre.docNo } : null,
      customerId,
      customerName: getSalesPartyName(customerId),
      salesExecutiveId,
      salesSupplyType,
      date,
      dueDate,
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
      paymentSplits: (typeof getSalesMultiPaymentSplits === 'function') ? getSalesMultiPaymentSplits() : [],
      rows: JSON.parse(JSON.stringify(salesRows)),
      partyOverride: window._salesPartyOverride ? JSON.parse(JSON.stringify(window._salesPartyOverride)) : null,
      uploadedDoc: window._salesUploadedDoc || null,
      convertedFromQuotationId: window._pendingConvertQuotationId || null,
      convertedFromProformaId: window._pendingConvertProformaId || null,
      convertedFromSalesOrderId: window._pendingConvertSalesOrderId || null,
      convertedFromDeliveryChallanId: window._pendingConvertDeliveryChallanId || null,
      advancePaidAmount: (window._pendingConvertProformaAdvance && window._pendingConvertProformaAdvance.amount) || 0,
      advanceJournalEntryId: (window._pendingConvertProformaAdvance && window._pendingConvertProformaAdvance.journalEntryId) || null,
      advanceVoucherNo: (window._pendingConvertProformaAdvance && window._pendingConvertProformaAdvance.voucherNo) || null,
      advanceRefund: draftAdvanceRefund
        ? Object.assign(draftAdvanceRefund, draftUsesCredit && typeof getSalesAdjust === 'function' && getSalesAdjust()
          ? { applications: getSalesAdjust().get() } : {})
        : null,
      // Invoice Balance (kept for when the draft is posted)
      creditAdjustments: (draftUsesCredit && currentSalesVoucherSubtype !== 'Return' && !draftAdvanceRefund && typeof getSalesAdjust === 'function' && getSalesAdjust()) ? getSalesAdjust().get() : [],
      creditApplications: (draftUsesCredit && currentSalesVoucherSubtype === 'Return' && typeof getSalesAdjust === 'function' && getSalesAdjust()) ? getSalesAdjust().get() : [],
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
    // Reversal of a Quotation / Proforma / Sales Order / Delivery Challan
    if (currentSalesVoucherSubtype === 'Return' && window._salesReversalPreInvoice && typeof postPreInvoiceReversal === 'function') {
      postPreInvoiceReversal();
      return;
    }
    if (currentSalesVoucherSubtype === 'Return') {
      const origInv = getOriginalInvoiceForReturn();
      if (!origInv) {
        showToast('Please select the Original Doc (Invoice or Pre Invoice) for this sales reversal.', 'warning');
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
      let typeLabel = currentSalesVoucherSubtype === 'Return' ? 'Reversal' : 'Invoice';
      showToast(`${typeLabel} number is required.`, 'warning');
      return;
    }
    
    window.KYA_STORE.salesVouchers = window.KYA_STORE.salesVouchers || [];
    // Numbers used by any invoice — including deleted ones — can't be issued again
    const numberKind = currentSalesVoucherSubtype === 'Return' ? 'return' : 'invoice';
    if (typeof isSalesInvoiceNoUsed === 'function' && isSalesInvoiceNoUsed(invoiceNo, numberKind)) {
      let typeLabel = currentSalesVoucherSubtype === 'Return' ? 'Reversal' : 'Invoice';
      showToast(`${typeLabel} No. "${invoiceNo}" is already used (even deleted numbers can't be reused). Please use another number.`, 'danger');
      if (typeof validateSalesInvoiceNoField === 'function') validateSalesInvoiceNoField();
      document.getElementById('salesInvoiceNo')?.focus();
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
      for (let i = 0; i < salesRows.length; i++) {
        const r = salesRows[i];
        if (!r.item || !r.item.trim()) {
          showToast(`Row #${i+1}: Please select a product item.`, 'warning');
          return;
        }
        if (!r.qty || parseFloat(r.qty) <= 0) {
          showToast(`Row #${i+1}: Quantity must be greater than zero.`, 'warning');
          return;
        }
        if (!r.rate || parseFloat(r.rate) <= 0) {
          showToast(`Row #${i+1}: Rate must be greater than zero.`, 'warning');
          return;
        }
        if (currentSalesVoucherSubtype === 'Return' && r.origQty !== undefined) {
          if (parseFloat(r.qty) > r.origQty) {
            showToast(`Row #${i+1}: Return Qty (${r.qty}) cannot exceed remaining returnable Qty (${r.origQty}).`, 'warning');
            return;
          }
        }
      }
    } else {
      for (let i = 0; i < salesRows.length; i++) {
        const r = salesRows[i];
        if (!r.serviceName || !r.serviceName.trim()) {
          showToast(`Row #${i+1}: Please enter a service name.`, 'warning');
          return;
        }
        if (!r.baseAmount || parseFloat(r.baseAmount) <= 0) {
          showToast(`Row #${i+1}: Base amount must be greater than zero.`, 'warning');
          return;
        }
        if (!r.revenueLedgerId) {
          showToast(`Row #${i+1}: Please select a revenue account.`, 'warning');
          return;
        }
        if (currentSalesVoucherSubtype === 'Return' && r.origBaseAmount !== undefined) {
          if (parseFloat(r.baseAmount) > r.origBaseAmount) {
            showToast(`Row #${i+1}: Return Amount (₹${r.baseAmount}) cannot exceed remaining returnable Amount (₹${r.origBaseAmount}).`, 'warning');
            return;
          }
        }
      }
    }
    
    const date = document.getElementById('salesDate').value;
    if (!date) {
      showToast('Please select a Date.', 'warning');
      return;
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
    const dueDate = document.getElementById('salesDueDate').value;
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
    let paymentAccountId = document.getElementById('salesPaymentAccount').value;
    let paymentSplits = (typeof getSalesMultiPaymentSplits === 'function') ? getSalesMultiPaymentSplits() : [];
    let paymentAmount = 0;
    // Advance above the invoice value: the status / amount / account describe its refund
    const advRefundMode = currentSalesVoucherSubtype !== 'Return' && typeof getSalesAdvanceExcess === 'function' && getSalesAdvanceExcess(total) > 0;
    const moneyLabel = (currentSalesVoucherSubtype === 'Return' || advRefundMode) ? 'Refund' : 'Payment';

    if (paymentStatus !== 'Not Paid' && paymentStatus !== 'No Refund') {
      if (!paymentAccountId) {
        showToast(`Please select a ${moneyLabel} Account.`, 'warning');
        return;
      }
      if (paymentStatus === 'Full Payment' || paymentStatus === 'Full Refund') {
        paymentAmount = getSalesPaymentMax(total);
      } else if (paymentStatus === 'Partial Payment' || paymentStatus === 'Partial Refund') {
        paymentAmount = parseFloat(document.getElementById('salesPaymentAmount').value) || 0;
        if (paymentAmount <= 0) {
          const typeLabel = moneyLabel;
          showToast(`${typeLabel} Amount must be greater than zero for Partial ${typeLabel}s.`, 'warning');
          return;
        }
        const maxVal = getSalesPaymentMax(total);
        if (paymentAmount > maxVal) {
          const limitMsg = (currentSalesVoucherSubtype === 'Return')
            ? `Refund Amount cannot exceed the allowed refund amount of ₹${fmtNum(maxVal)}.`
            : getSalesPaymentLimitMessage(maxVal, total, false);
          showToast(limitMsg, 'warning');
          return;
        }
        // Money paid back can't exceed what was received on the invoice (applying the credit
        // to unpaid invoices isn't a payout, so it can use the whole reversal)
        if (currentSalesVoucherSubtype === 'Return' && paymentAccountId !== 'credit-adjust') {
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

      if (paymentAmount <= 0) {
        showToast(currentSalesVoucherSubtype === 'Return'
          ? 'Nothing was received on the Original Doc to pay back — choose Invoice Balance as the Refund Account to apply this credit to unpaid invoices, or No Refund.'
          : `${moneyLabel} Amount must be greater than zero.`, 'warning');
        return;
      }

      // Invoice Balance: the credits / invoices chosen must cover its amount — the whole
      // payment, or its row of the Multi Payment / Multi Refund
      if (typeof usesCreditAdjust === 'function' && usesCreditAdjust(paymentAccountId, paymentSplits)) {
        const adjust = typeof getSalesAdjust === 'function' ? getSalesAdjust() : null;
        const mode = (currentSalesVoucherSubtype === 'Return' || advRefundMode) ? 'apply' : 'pay';
        const adjustErr = adjust
          ? validateAllocations(mode, adjust.get(), getCreditAdjustPortion(paymentAccountId, paymentSplits, paymentAmount), customerId, getSalesAdjustCtx())
          : 'Adjustment is not available.';
        if (adjustErr) {
          showToast(adjustErr, 'warning');
          return;
        }
      }

      if (paymentAccountId === 'multi-payment') {
        const typeLabel = moneyLabel;
        if (paymentSplits.length === 0) {
          showToast(`Please select at least one account with an amount for Multi ${typeLabel}.`, 'warning');
          return;
        }
        const hasDuplicate = paymentSplits.some((sp, i) =>
          paymentSplits.findIndex(other => String(other.accountId) === String(sp.accountId)) !== i);
        if (hasDuplicate) {
          showToast(`Each Multi ${typeLabel} account can be selected only once.`, 'warning');
          return;
        }
        const splitTotal = paymentSplits.reduce((sum, sp) => sum + sp.amount, 0);
        if (Math.abs(splitTotal - paymentAmount) > 0.01) {
          showToast(`Multi ${typeLabel} split of ₹${fmtNum(splitTotal)} must equal the ${typeLabel.toLowerCase()} amount of ₹${fmtNum(paymentAmount)}.`, 'warning');
          return;
        }
      }
    }
    // Refund of the excess advance is kept apart from the invoice's own payment: the
    // invoice is fully paid by the advance, and the excess is refunded and/or parked
    // Invoice Balance: the credits used (payment) or invoices paid (refund)
    const isCreditAdjusted = typeof usesCreditAdjust === 'function' && usesCreditAdjust(paymentAccountId, paymentSplits)
      && paymentStatus !== 'Not Paid' && paymentStatus !== 'No Refund';
    const creditAllocations = (isCreditAdjusted && typeof getSalesAdjust === 'function' && getSalesAdjust())
      ? getSalesAdjust().get() : [];
    let advanceRefund = null;
    if (advRefundMode) {
      advanceRefund = toSalesAdvanceRefund(paymentStatus, paymentAmount, total, paymentAccountId, paymentSplits);
      if (advanceRefund && isCreditAdjusted) advanceRefund.applications = creditAllocations;
      paymentStatus = 'Not Paid';
      paymentAmount = 0;
      paymentAccountId = '';
      paymentSplits = [];
    }
    // The form shows the balance only; store advance + this payment, which the payment
    // journal entry splits back into "advance used" and "received now"
    if (currentSalesVoucherSubtype !== 'Return' && typeof toStoredSalesPayment === 'function') {
      ({ paymentStatus, paymentAmount } = toStoredSalesPayment(paymentStatus, paymentAmount, total));
    }

    const isEditPosted = window._editingSalesInvoice && !window._editingSalesInvoice.isDraft;
    const existingPostedInv = isEditPosted ? (window.KYA_STORE.salesVouchers || []).find(v => v.id === window._editingSalesInvoice.id) : null;
    const existingJournalEntryId = existingPostedInv ? (existingPostedInv.journalEntryId || '') : '';
    
    const invoiceData = {
      id: isEditPosted ? window._editingSalesInvoice.id : Date.now(),
      type: currentSalesType,
      invoiceNo,
      isReturn: currentSalesVoucherSubtype === 'Return',
      returnAgainstInvoice: currentSalesVoucherSubtype === 'Return' ? (document.getElementById('salesInvoiceSelectTriggerText')?.textContent.trim() || '') : '',
      customerId,
      customerName: getSalesPartyName(customerId),
      salesExecutiveId,
      salesSupplyType,
      date,
      dueDate,
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
      paymentSplits,
      // Invoice Balance (sales-credit-adjust.js)
      creditAdjustments: (currentSalesVoucherSubtype !== 'Return' && !advRefundMode && isCreditAdjusted) ? creditAllocations : [],
      creditApplications: (currentSalesVoucherSubtype === 'Return' && isCreditAdjusted) ? creditAllocations : [],
      convertedFromQuotationId: window._pendingConvertQuotationId || (existingPostedInv && existingPostedInv.convertedFromQuotationId) || null,
      convertedFromProformaId: window._pendingConvertProformaId || (existingPostedInv && existingPostedInv.convertedFromProformaId) || null,
      convertedFromSalesOrderId: window._pendingConvertSalesOrderId || (existingPostedInv && existingPostedInv.convertedFromSalesOrderId) || null,
      convertedFromDeliveryChallanId: window._pendingConvertDeliveryChallanId || (existingPostedInv && existingPostedInv.convertedFromDeliveryChallanId) || null,
      advancePaidAmount: (window._pendingConvertProformaAdvance && window._pendingConvertProformaAdvance.amount) ||
                         (existingPostedInv && existingPostedInv.advancePaidAmount) || 0,
      advanceJournalEntryId: (window._pendingConvertProformaAdvance && window._pendingConvertProformaAdvance.journalEntryId) ||
                             (existingPostedInv && existingPostedInv.advanceJournalEntryId) || null,
      advanceVoucherNo: (window._pendingConvertProformaAdvance && window._pendingConvertProformaAdvance.voucherNo) ||
                        (existingPostedInv && existingPostedInv.advanceVoucherNo) || null,
      rows: JSON.parse(JSON.stringify(salesRows)),
      partyOverride: window._salesPartyOverride ? JSON.parse(JSON.stringify(window._salesPartyOverride)) : null,
      uploadedDoc: window._salesUploadedDoc || null,
      journalEntryId: existingJournalEntryId || '',
      tdsJournalEntryId: existingPostedInv ? (existingPostedInv.tdsJournalEntryId || '') : '',
      tdsVoucherNo: existingPostedInv ? (existingPostedInv.tdsVoucherNo || '') : '',
      paymentJournalEntryId: existingPostedInv ? (existingPostedInv.paymentJournalEntryId || '') : '',
      paymentVoucherNo: existingPostedInv ? (existingPostedInv.paymentVoucherNo || '') : '',
      advanceRefund,
      advanceRefundJournalEntryId: existingPostedInv ? (existingPostedInv.advanceRefundJournalEntryId || '') : '',
      advanceRefundVoucherNo: existingPostedInv ? (existingPostedInv.advanceRefundVoucherNo || '') : '',
      postedAt: isEditPosted ? (existingPostedInv?.postedAt || Date.now()) : Date.now()
    };

    // Post to accounting journal entries (flow to Trial Balance, Ledgers, Voucher Desk).
    const jeResult = postSalesVoucherToJournal(invoiceData);
    if (jeResult) {
      if (typeof jeResult === 'object') {
        if (jeResult.invoiceJEId) invoiceData.journalEntryId        = jeResult.invoiceJEId;
        if (jeResult.tdsJEId) {
          invoiceData.tdsJournalEntryId = jeResult.tdsJEId;
          if (jeResult.tdsVoucherNo) invoiceData.tdsVoucherNo = jeResult.tdsVoucherNo;
        }
        if (jeResult.paymentJEId) {
          invoiceData.paymentJournalEntryId = jeResult.paymentJEId;
          if (jeResult.paymentVoucherNo) invoiceData.paymentVoucherNo = jeResult.paymentVoucherNo;
        }
        invoiceData.advanceRefundJournalEntryId = jeResult.advanceRefundJEId || '';
        invoiceData.advanceRefundVoucherNo = jeResult.advanceRefundVoucherNo || '';
      } else {
        invoiceData.journalEntryId = jeResult;
      }
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
    
    // Once posted, a number is used for good — deleting the invoice won't free it
    if (typeof registerUsedSalesInvoiceNo === 'function') {
      registerUsedSalesInvoiceNo(currentSalesVoucherSubtype === 'Return' ? 'return' : 'invoice', invoiceNo);
    }
    
    let successMsg = `Invoice "${invoiceNo}" posted successfully.`;
    const _subtypeSnapshot = currentSalesVoucherSubtype;
    if (_subtypeSnapshot === 'Return') {
      successMsg = `Sales Reversal "${invoiceNo}" posted successfully.`;
    } else {
      const srcQuoteId = window._pendingConvertQuotationId || invoiceData.convertedFromQuotationId;
      const srcQuote = srcQuoteId && (window.KYA_STORE.quotations || []).concat(window.KYA_STORE.quotationsDrafts || [])
        .find(q => String(q.id) === String(srcQuoteId));
      if (srcQuote) {
        successMsg = `Invoice "${invoiceNo}" posted. Quotation ${srcQuote.quoteNo} conversion completed.`;
      }
    }
    showToast(successMsg, 'success');
    showInvoicePostedModal(invoiceNo, _subtypeSnapshot);

    // If this invoice was converted from a Quotation, mark that quotation as Completed now
    const convertedQuoteId = window._pendingConvertQuotationId || (invoiceData && invoiceData.convertedFromQuotationId);
    if (convertedQuoteId) {
      window._pendingConvertQuotationId = null;
      if (typeof markQuotationCompletedOnInvoicePost === 'function') {
        markQuotationCompletedOnInvoicePost(convertedQuoteId);
      } else if (typeof window.markQuotationCompletedOnInvoicePost === 'function') {
        window.markQuotationCompletedOnInvoicePost(convertedQuoteId);
      } else {
        window.KYA_STORE = window.KYA_STORE || {};
        window.KYA_STORE.quotations = window.KYA_STORE.quotations || [];
        const q = (window.KYA_STORE.quotations || []).find(item => String(item.id) === String(convertedQuoteId)) ||
                  (window.KYA_STORE.quotationsDrafts || []).find(item => String(item.id) === String(convertedQuoteId));
        if (q) {
          q.status = 'Completed';
          q.updatedAt = Date.now();
        }
      }
      if (typeof window.renderSalesPreInvoicePanel === 'function') {
        window.renderSalesPreInvoicePanel();
      }
    }

    // If this invoice was converted from a Proforma, mark that proforma as Completed now
    const convertedProformaId = window._pendingConvertProformaId || (invoiceData && invoiceData.convertedFromProformaId);
    if (convertedProformaId) {
      window._pendingConvertProformaId = null;
      window._pendingConvertProformaAdvance = null;
      if (typeof markProformaCompletedOnInvoicePost === 'function') {
        markProformaCompletedOnInvoicePost(convertedProformaId);
      } else if (typeof window.markProformaCompletedOnInvoicePost === 'function') {
        window.markProformaCompletedOnInvoicePost(convertedProformaId);
      } else {
        window.KYA_STORE = window.KYA_STORE || {};
        window.KYA_STORE.proformaInvoices = window.KYA_STORE.proformaInvoices || [];
        const p = (window.KYA_STORE.proformaInvoices || []).find(item => String(item.id) === String(convertedProformaId)) ||
                  (window.KYA_STORE.proformaInvoicesDrafts || []).find(item => String(item.id) === String(convertedProformaId));
        if (p) {
          p.status = 'Completed';
          p.updatedAt = Date.now();
        }
      }
      if (typeof window.renderSalesPreInvoicePanel === 'function') {
        window.renderSalesPreInvoicePanel();
      }
    }

    // Converted from a Sales Order / Delivery Challan: mark it Completed now
    [
      ['convertedFromSalesOrderId', '_pendingConvertSalesOrderId', 'markSalesOrderCompletedOnInvoicePost'],
      ['convertedFromDeliveryChallanId', '_pendingConvertDeliveryChallanId', 'markDeliveryChallanCompletedOnInvoicePost']
    ].forEach(([field, pendingKey, markFn]) => {
      const srcId = window[pendingKey] || (invoiceData && invoiceData[field]);
      if (!srcId) return;
      window[pendingKey] = null;
      window._pendingConvertProformaAdvance = null;
      if (typeof window[markFn] === 'function') window[markFn](srcId);
      if (typeof window.renderSalesPreInvoicePanel === 'function') window.renderSalesPreInvoicePanel();
    });

    window._editingSalesInvoice = null;
    currentSalesVoucherSubtype = _subtypeSnapshot === 'Return' ? 'Return' : 'Invoice'; // a reversal is followed by a fresh reversal
    initSalesForm();
    openTab('sales_voucher');

    if (typeof refreshAllReports === 'function') refreshAllReports();
    if (typeof renderVoucherDeskPanel === 'function') renderVoucherDeskPanel();
    if (typeof renderSalesPostedPanel === 'function') renderSalesPostedPanel();
    if (typeof renderLedgerStatementView === 'function') renderLedgerStatementView();
    triggerAutoBackup();
  }

  // ── Invoice Posted Success Modal ──────────────────────────────────────
  function showInvoicePostedModal(invoiceNo, subtype) {
    const stale = document.getElementById('salePostedOverlay');
    if (stale) stale.remove();

    const isReturn = subtype === 'Return';
    const typeLabel = isReturn ? 'Sales Reversal' : 'Invoice';
    const noLabel   = isReturn ? 'Reversal No.'   : 'Invoice No.';
    const iconColor = isReturn ? '#ef4444' : '#10b981';
    const iconSvg   = isReturn
      ? `<svg viewBox="0 0 20 20" fill="none" style="width:32px;height:32px"><path d="M10 3v7l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 10A6.5 6.5 0 1010 16.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M3.5 6v4h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
      : `<svg viewBox="0 0 20 20" fill="none" style="width:32px;height:32px"><circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.7"/><path d="M6.5 10.5l2.5 2.5 4.5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    const overlay = document.createElement('div');
    overlay.id = 'salePostedOverlay';
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '10100',
      background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif'
    });

    overlay.innerHTML = `
      <style>
        @keyframes spModalIn {
          from { opacity:0; transform:scale(.9) translateY(16px); }
          to   { opacity:1; transform:none; }
        }
        #salePostedCard { animation: spModalIn .22s cubic-bezier(.34,1.3,.64,1); }
        #spCopyBtn:hover { background: #d1fae5 !important; }
        #spDoneBtn:hover { filter: brightness(1.08); }
        #spCopyBtn:active, #spDoneBtn:active { transform: scale(0.97); }
      </style>
      <div id="salePostedCard" style="
        background:#fff; border-radius:20px; padding:40px 36px 32px;
        box-shadow:0 24px 64px rgba(0,0,0,.22);
        min-width:340px; max-width:420px; width:90%;
        display:flex; flex-direction:column; align-items:center; gap:0;
        text-align:center; position:relative;
      ">
        <!-- Close X -->
        <button id="spCloseX" aria-label="Close" style="
          position:absolute; top:14px; right:16px; background:none; border:none;
          font-size:20px; cursor:pointer; color:#94a3b8; line-height:1; padding:4px 8px;
          border-radius:6px;
        ">&times;</button>

        <!-- Icon circle -->
        <div style="
          width:64px; height:64px; border-radius:50%;
          background:${iconColor}1a; color:${iconColor};
          display:flex; align-items:center; justify-content:center;
          margin-bottom:18px;
        ">${iconSvg}</div>

        <!-- Heading -->
        <h2 style="margin:0 0 6px; font-size:20px; font-weight:700; color:#0f172a;">
          ${typeLabel} Posted!
        </h2>
        <p style="margin:0 0 22px; font-size:13.5px; color:#64748b;">
          Your ${typeLabel.toLowerCase()} has been posted successfully.
        </p>

        <!-- Invoice No badge -->
        <div style="
          background:#f0fdf4; border:1.5px solid #bbf7d0; border-radius:12px;
          padding:16px 24px; width:100%; box-sizing:border-box; margin-bottom:22px;
        ">
          <div style="font-size:11px; font-weight:600; color:#6b7280; letter-spacing:.06em; text-transform:uppercase; margin-bottom:6px;">
            ${noLabel}
          </div>
          <div id="spInvoiceNoText" style="font-size:26px; font-weight:800; color:#065f46; letter-spacing:.02em; word-break:break-all;">
            ${invoiceNo}
          </div>
        </div>

        <!-- Action buttons -->
        <div style="display:flex; gap:10px; width:100%;">
          <button id="spCopyBtn" style="
            flex:1; padding:10px 0; border-radius:10px;
            border:1.5px solid #10b981; background:#fff; color:#065f46;
            font-size:13px; font-weight:600; cursor:pointer;
            display:flex; align-items:center; justify-content:center; gap:6px;
            transition: background .15s;
          ">
            <svg viewBox="0 0 16 16" fill="none" style="width:14px;height:14px">
              <rect x="5" y="5" width="8" height="8" rx="2" stroke="currentColor" stroke-width="1.5"/>
              <path d="M3 11V3h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Copy No.
          </button>
          <button id="spDoneBtn" style="
            flex:1; padding:10px 0; border-radius:10px;
            border:none; background:#10b981; color:#fff;
            font-size:13px; font-weight:600; cursor:pointer;
            transition: filter .15s;
          ">Done</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const copyBtn = document.getElementById('spCopyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(invoiceNo).then(() => {
            copyBtn.innerHTML = `
              <svg viewBox="0 0 16 16" fill="none" style="width:14px;height:14px">
                <path d="M3 8.5l3.5 3.5 6.5-7" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Copied!
            `;
            setTimeout(() => {
              copyBtn.innerHTML = `
                <svg viewBox="0 0 16 16" fill="none" style="width:14px;height:14px">
                  <rect x="5" y="5" width="8" height="8" rx="2" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M3 11V3h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                Copy No.
              `;
            }, 2000);
          }).catch(() => {
            showToast('Failed to copy to clipboard', 'warning');
          });
        }
      });
    }

    function close() {
      const el = document.getElementById('salePostedOverlay');
      if (el) el.remove();
    }

    const doneBtn = document.getElementById('spDoneBtn');
    const closeX  = document.getElementById('spCloseX');
    if (doneBtn)  doneBtn.addEventListener('click', close);
    if (closeX)   closeX.addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
    });
  }

  // Splits a paid amount into the ledger rows it should hit. A single payment account
  // gives one row; a Multi Payment invoice gives one row per selected account, scaled
  // to `amount` (so an advance-adjusted part payment still balances) with the rounding
  // difference absorbed by the last row.
  // Invoice Balance (the account, or a Multi row) gives one row per ledger the customer's
  // credit sits in (their own ledger for a reversal / on-account credit, Refund Payable,
  // Advance from Customers). A refund passes creditRowsFor(amount) instead: the part applied
  // to unpaid invoices is credited to the customer, or — [] — left out.
  function getSalesPaymentSplitRows(invoice, amount, creditRowsFor) {
    const ledgers = (typeof coaLedgers !== 'undefined' ? coaLedgers : []);
    const nameOf = (id) => {
      const ledger = ledgers.find(l => l.id == id);
      return ledger ? ledger.name : 'Cash Account';
    };
    const creditRows = (amt) => (typeof creditRowsFor === 'function')
      ? creditRowsFor(amt)
      : ((typeof getCreditAdjustDebitRows === 'function') ? getCreditAdjustDebitRows(invoice.creditAdjustments, amt) : []);

    if (String(invoice.paymentAccountId) === 'credit-adjust') {
      const rows = creditRows(amount);
      if (rows.length || typeof creditRowsFor === 'function') return rows;
    }

    const splits = (Array.isArray(invoice.paymentSplits) ? invoice.paymentSplits : [])
      .filter(sp => sp && sp.accountId && (parseFloat(sp.amount) || 0) > 0);
    const splitTotal = splits.reduce((sum, sp) => sum + (parseFloat(sp.amount) || 0), 0);

    if (String(invoice.paymentAccountId) !== 'multi-payment' || splitTotal <= 0) {
      return [{ name: nameOf(invoice.paymentAccountId), amount: amount }];
    }

    const rows = [];
    let allocated = 0;
    splits.forEach((sp, i) => {
      const amt = (i === splits.length - 1)
        ? Math.round((amount - allocated) * 100) / 100
        : Math.round(((parseFloat(sp.amount) || 0) / splitTotal) * amount * 100) / 100;
      allocated += amt;
      if (String(sp.accountId) === 'credit-adjust') {
        creditRows(amt).forEach(r => rows.push(r));
        return;
      }
      rows.push({ name: nameOf(sp.accountId), amount: amt });
    });

    const usable = rows.filter(r => r.amount > 0);
    if (usable.length || typeof creditRowsFor === 'function') return usable;
    return [{ name: nameOf(splits[0].accountId), amount: amount }];
  }

  // Groups an invoice's taxable value by the revenue ledger each line belongs to, in line
  // order. A service line carries its own Revenue from Operations ledger (the ledger picked
  // in Master Desk → Ledgers), so it lands there; a product line has no ledger of its own
  // and goes to Sales Account (Sales Reversals on a return).
  function getSalesRevenueLines(invoice) {
    const ledgers = (typeof coaLedgers !== 'undefined' ? coaLedgers : []);
    const fallbackName = invoice.isReturn ? 'Sales Reversals' : 'Sales Account';
    const lines = [];
    (invoice.rows || []).forEach(r => {
      const base = invoice.type === 'Service'
        ? (parseFloat(r.baseAmount) || 0)
        : (parseFloat(r.qty) || 0) * (parseFloat(r.rate) || 0);
      const discAmt = r.discountType === 'pct' ? (base * ((parseFloat(r.discount) || 0) / 100)) : (parseFloat(r.discount) || 0);
      const amt = Math.max(0, base - discAmt);
      if (amt <= 0) return;

      const own = r.revenueLedgerId
        ? ledgers.find(l => l.type === 'ledger' && String(l.id) === String(r.revenueLedgerId))
        : null;
      let name = own && own.name;
      if (!name) {
        const fallbackId = getOrCreateSystemLedger(fallbackName, 'sg-rfo');
        name = (ledgers.find(l => l.id == fallbackId) || { name: fallbackName }).name;
      }
      const line = lines.find(x => x.name.trim().toLowerCase() === name.trim().toLowerCase());
      if (line) line.amount += amt;
      else lines.push({ name, amount: amt });
    });
    return lines;
  }

  // The excess when a Pre Invoice advance is more than the invoice. A customer's advance
  // sits in Advance from Customers: the refunded part goes back out of Cash / Bank and the
  // rest moves to Refund Payable. A ledger-only party's advance sits in its own ledger: the
  // refunded part is paid out of it and the rest simply stays there as a credit.
  function postSalesAdvanceRefundEntry(invoice, customerName) {
    const refund = invoice.advanceRefund;
    if (invoice.advanceRefundJournalEntryId && typeof postedEntries !== 'undefined') {
      postedEntries = postedEntries.filter(e => String(e.id) !== String(invoice.advanceRefundJournalEntryId));
      window.postedEntries = postedEntries;
    }
    if (!refund || !(refund.excess > 0) || typeof postedEntries === 'undefined') return { id: '', voucherNo: '' };

    // Where the advance was credited: the party's own ledger, or Advance from Customers
    const prof = invoice.convertedFromProformaId
      ? (window.KYA_STORE.proformaInvoices || []).find(p => String(p.id) === String(invoice.convertedFromProformaId))
      : null;
    const advJEId = (prof && prof.advanceJournalEntryId) || invoice.advanceJournalEntryId;
    const advEntry = advJEId ? postedEntries.find(e => String(e.id) === String(advJEId)) : null;
    const inPartyLedger = !!advEntry && (advEntry.allRows || []).some(r =>
      (parseFloat(r.credit) || 0) > 0 && (r.particular || '').trim().toLowerCase() === (customerName || '').trim().toLowerCase());

    const refundAmt = Math.min(parseFloat(refund.amount) || 0, refund.excess);
    const parked = Math.round((refund.excess - refundAmt) * 100) / 100;
    const rows = [];
    let rId = 1;
    // The part applied to the customer's unpaid invoices (Invoice Balance — the account, or
    // its Multi Refund row) goes to the customer's account instead of being paid out
    const appliedAmt = typeof getCreditAdjustPortion === 'function'
      ? getCreditAdjustPortion(refund.accountId, refund.splits, refundAmt) : 0;
    const paidOutAmt = Math.round((refundAmt - appliedAmt) * 100) / 100;
    const refundAccount = { paymentAccountId: refund.accountId, paymentSplits: refund.splits || [] };
    // A ledger party's excess is already in its ledger: applying it moves nothing
    const refundRows = refundAmt > 0
      ? getSalesPaymentSplitRows(refundAccount, refundAmt, inPartyLedger ? () => [] : (amt) => [{ name: customerName, amount: amt }])
      : [];

    if (inPartyLedger) {
      // the excess just stays in the ledger — only money paid out is posted
      if (paidOutAmt <= 0) return { id: '', voucherNo: '' };
      rows.push({ id: rId++, type: 'By', particular: customerName, debit: paidOutAmt.toFixed(2), credit: '' });
    } else {
      const advLedgerId = getOrCreateSystemLedger('Advance from Customers', 'sg-ocl');
      const advName = (coaLedgers.find(l => l.id == advLedgerId) || { name: 'Advance from Customers' }).name;
      rows.push({ id: rId++, type: 'By', particular: advName, debit: refund.excess.toFixed(2), credit: '' });
    }
    refundRows.forEach(p => rows.push({ id: rId++, type: 'To', particular: p.name, debit: '', credit: p.amount.toFixed(2) }));
    if (!inPartyLedger && parked > 0) {
      const rpId = getOrCreateSystemLedger('Refund Payable', 'sg-ocl');
      const rpName = (coaLedgers.find(l => l.id == rpId) || { name: 'Refund Payable' }).name;
      rows.push({ id: rId++, type: 'To', particular: rpName, debit: '', credit: parked.toFixed(2) });
    }

    const entryId = invoice.advanceRefundJournalEntryId || (Date.now() + 3);
    const voucherNo = (invoice.advanceRefundVoucherNo && String(invoice.advanceRefundVoucherNo).startsWith('JV-'))
      ? invoice.advanceRefundVoucherNo
      : (typeof getNextJournalVoucherNo === 'function' ? getNextJournalVoucherNo(invoice.date) : `JV-${new Date().getFullYear()}-001`);
    const parts = [];
    if (paidOutAmt > 0) parts.push(`₹${fmtNum(paidOutAmt)} ${typeof isAdjustLedgerAccount === 'function' && isAdjustLedgerAccount(refund.accountId) ? `adjusted with ${refundRows[0] ? refundRows[0].name : 'a ledger'}` : 'refunded'}`);
    if (appliedAmt > 0) parts.push(`₹${fmtNum(appliedAmt)} applied to ${typeof describeApplications === 'function' ? describeApplications(refund.applications) : 'unpaid invoices'}`);
    if (!inPartyLedger && parked > 0) parts.push(`₹${fmtNum(parked)} moved to Refund Payable`);

    postedEntries.unshift({
      id: entryId,
      date: invoice.date,
      voucherNo,
      preparedBy: 'Sales Module',
      departmentId: '',
      isBudget: false,
      firstParticular: rows[0].particular,
      amount: fmtNum(inPartyLedger ? paidOutAmt : refund.excess),
      allRows: rows,
      narration: `Advance of ₹${fmtNum(refund.excess)} received from ${customerName} above Invoice No. ${invoice.invoiceNo}: ${parts.join(', ')}.`,
      jeType: 'advance_refund',
      ledgerAdjust: typeof isAdjustLedgerAccount === 'function' && isAdjustLedgerAccount(refund.accountId),
      partyName: customerName
    });
    window.postedEntries = postedEntries;
    return { id: entryId, voucherNo };
  }

  // ── Sales Reversal of a Pre Invoice ──
  // Nothing was sold, so there is no sales / GST / receivable line — the entry only
  // settles the advance. Customer: Dr Advance from Customers; Cr Cash/Bank (refund) and
  // Cr Refund Payable (the rest). Ledger party (advance in its own ledger): Dr Party,
  // Cr Cash/Bank for the refund; the rest stays in the ledger. Returns the entry id, or ''
  // when there is nothing to post.
  function postPreInvoiceReversalJournal(invoice, customerName, voucherNo, silent) {
    const ref = invoice.reversedPreInvoice || {};
    const dropOld = () => {
      if (invoice.journalEntryId && typeof postedEntries !== 'undefined') {
        postedEntries = postedEntries.filter(e => String(e.id) !== String(invoice.journalEntryId));
        window.postedEntries = postedEntries;
      }
    };
    if (typeof postedEntries === 'undefined') return '';

    const advance = Math.max(0, parseFloat(ref.advance) || 0);
    const refund = (invoice.paymentStatus === 'Full Refund' || invoice.paymentStatus === 'Partial Refund')
      ? Math.min(advance, parseFloat(invoice.paymentAmount) || 0) : 0;
    const parked = Math.round((advance - refund) * 100) / 100;
    const rows = [];
    let rId = 1;
    // The part applied to the customer's unpaid invoices (Invoice Balance — the account, or
    // its Multi Refund row) goes to the customer's account instead of being paid out
    const appliedAmt = typeof getCreditAdjustPortion === 'function'
      ? getCreditAdjustPortion(invoice.paymentAccountId, invoice.paymentSplits, refund) : 0;
    const paidOutAmt = Math.round((refund - appliedAmt) * 100) / 100;

    if (ref.inPartyLedger) {
      // Already in the party's own ledger: applying it to invoices moves nothing
      if (paidOutAmt > 0) rows.push({ id: rId++, type: 'By', particular: customerName, debit: paidOutAmt.toFixed(2), credit: '' });
    } else if (advance > 0) {
      const advLedgerId = getOrCreateSystemLedger('Advance from Customers', 'sg-ocl');
      const advName = (coaLedgers.find(l => l.id == advLedgerId) || { name: 'Advance from Customers' }).name;
      rows.push({ id: rId++, type: 'By', particular: advName, debit: advance.toFixed(2), credit: '' });
    }
    if (!rows.length) {
      dropOld();
      if (!silent) refreshAllReports();
      return '';
    }
    if (refund > 0) {
      // Applied to invoices: credited to the customer's account (or nothing, when it is
      // already in the party's ledger); the rest is paid out
      getSalesPaymentSplitRows(invoice, refund, ref.inPartyLedger ? () => [] : (amt) => [{ name: customerName, amount: amt }]).forEach(p => {
        rows.push({ id: rId++, type: 'To', particular: p.name, debit: '', credit: p.amount.toFixed(2) });
      });
    }
    if (!ref.inPartyLedger && parked > 0) {
      const rpId = getOrCreateSystemLedger('Refund Payable', 'sg-ocl');
      const rpName = (coaLedgers.find(l => l.id == rpId) || { name: 'Refund Payable' }).name;
      rows.push({ id: rId++, type: 'To', particular: rpName, debit: '', credit: parked.toFixed(2) });
    }

    const parts = [];
    if (paidOutAmt > 0) parts.push(`₹${fmtNum(paidOutAmt)} ${typeof isAdjustLedgerAccount === 'function' && isAdjustLedgerAccount(invoice.paymentAccountId) ? 'adjusted with a ledger' : 'refunded'}`);
    if (appliedAmt > 0) parts.push(`₹${fmtNum(appliedAmt)} applied to ${typeof describeApplications === 'function' ? describeApplications(invoice.creditApplications) : 'unpaid invoices'}`);
    if (!ref.inPartyLedger && parked > 0) parts.push(`₹${fmtNum(parked)} moved to Refund Payable`);
    const entryId = invoice.journalEntryId || Date.now();
    const entry = {
      id: entryId,
      date: invoice.date,
      voucherNo,
      preparedBy: 'Sales Module',
      departmentId: '',
      isBudget: false,
      firstParticular: rows[0].particular,
      amount: fmtNum(ref.inPartyLedger ? paidOutAmt : advance),
      allRows: rows,
      narration: `Sales Reversal No. ${invoice.invoiceNo} of ${ref.type || 'Pre Invoice'} ${ref.no || ''} for ${customerName}: advance of ₹${fmtNum(advance)} — ${parts.join(', ')}.`,
      jeType: 'preinvoice_reversal',
      ledgerAdjust: typeof isAdjustLedgerAccount === 'function' && isAdjustLedgerAccount(invoice.paymentAccountId),
      partyName: customerName
    };
    const idx = postedEntries.findIndex(e => String(e.id) === String(entryId));
    if (idx > -1) postedEntries[idx] = entry;
    else postedEntries.unshift(entry);
    window.postedEntries = postedEntries;
    if (!silent) refreshAllReports();
    return entryId;
  }

  // Sales journal entries are derived from the posted sales vouchers, and a restore drops
  // them (see performRestore), so they are rebuilt here from the vouchers after every load.
  function rebuildSalesJournalEntries() {
    if (typeof postedEntries === 'undefined' || !window.KYA_STORE) return;
    const vouchers = (window.KYA_STORE.salesVouchers || []).filter(v => v && !v.isDraft && !v.isOrder);
    const idBase = Date.now();
    // Oldest first, so the newest entry ends up on top like a fresh post
    vouchers.slice().sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))).forEach((v, i) => {
      if (!v.journalEntryId) v.journalEntryId = idBase + i * 3;
      const res = postSalesVoucherToJournal(v, { silent: true });
      if (res && typeof res === 'object') {
        if (res.tdsJEId) { v.tdsJournalEntryId = res.tdsJEId; v.tdsVoucherNo = res.tdsVoucherNo; }
        if (res.paymentJEId) { v.paymentJournalEntryId = res.paymentJEId; v.paymentVoucherNo = res.paymentVoucherNo; }
        if (res.advanceRefundJEId) { v.advanceRefundJournalEntryId = res.advanceRefundJEId; v.advanceRefundVoucherNo = res.advanceRefundVoucherNo; }
      }
    });
    window.postedEntries = postedEntries;
  }

  function postSalesVoucherToJournal(invoice, options) {
    if (!invoice) return '';
    const silent = !!(options && options.silent);
    const isRet = !!invoice.isReturn;
    
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

    // A posted voucher already stores its paid amount; the form's limit is only a fallback
    const storedPaid = parseFloat(invoice.paymentAmount) || 0;
    const paidAmount = (invoice.paymentStatus === 'Full Payment' || invoice.paymentStatus === 'Full Refund')
      ? (storedPaid > 0 ? storedPaid : getSalesPaymentMax(invoice.total))
      : ((invoice.paymentStatus === 'Partial Payment' || invoice.paymentStatus === 'Partial Refund')
        ? (parseFloat(invoice.paymentAmount) || 0)
        : 0);

    const journalRows = [];
    // The party can be a customer from the master or a ledger created under Trade
    // Receivables — findPartyById covers both, so the entry always names the real party
    // and lands in that party's ledger.
    const party = (typeof findPartyById === 'function') ? findPartyById(invoice.customerId, 'Customer') : null;
    const customerName = (party && party.name)
      || invoice.customerName
      || ((typeof coaLedgers !== 'undefined' ? coaLedgers : []).find(l => String(l.id) === String(invoice.customerId)) || {}).name
      || 'Customer';
    // Cash sale (a Cash and Cash Equivalents ledger as the party): the sale itself debits that
    // account, so there is no separate receipt — or refund — between it and itself
    const cashSale = !!party && party.type === 'ledger' && party.sgId === 'sg-cce';

    let execText = '';
    if (invoice.salesExecutiveId && typeof ohEmployees !== 'undefined') {
      const execEmp = ohEmployees.find(e => e.id == invoice.salesExecutiveId);
      if (execEmp) execText = ` Sales Executive: ${execEmp.name}.`;
    }
    const prefix = isRet ? 'SR-' : 'SV-';
    const voucherNo = (invoice.invoiceNo.startsWith(prefix) || invoice.invoiceNo.startsWith('INV-')) ? invoice.invoiceNo : `${prefix}${invoice.invoiceNo}`;

    // Reversal of a pre-invoice: no sale to undo, only its advance to settle
    if (isRet && invoice.reversedPreInvoice) {
      return postPreInvoiceReversalJournal(invoice, customerName, voucherNo, silent);
    }

    if (isRet) {
      // ── SALES REVERSAL / RETURN ───────────────────────────────────────
      getSalesRevenueLines(invoice).forEach(line => {
        journalRows.push({ id: journalRows.length + 1, type: 'By', particular: line.name, debit: line.amount.toFixed(2), credit: '' });
      });

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

      const adj = parseFloat(invoice.adjustments) || 0;
      if (adj > 0) {
        const adjLedgerId = getOrCreateSystemLedger('Adjustments Account', 'sg-oe');
        const adjName = (coaLedgers.find(l => l.id == adjLedgerId) || { name: 'Adjustments Account' }).name;
        journalRows.push({ id: journalRows.length + 1, type: 'By', particular: adjName, debit: adj.toFixed(2), credit: '' });
      } else if (adj < 0) {
        const adjLedgerId = getOrCreateSystemLedger('Adjustments Account', 'sg-oe');
        const adjName = (coaLedgers.find(l => l.id == adjLedgerId) || { name: 'Adjustments Account' }).name;
        journalRows.push({ id: journalRows.length + 1, type: 'To', particular: adjName, debit: '', credit: Math.abs(adj).toFixed(2) });
      }

      // The part applied to the customer's unpaid invoices (Invoice Balance — the account, or
      // its Multi Refund row) isn't paid out: it stays with the customer, allocated to them
      const appliedAmt = typeof getCreditAdjustPortion === 'function'
        ? getCreditAdjustPortion(invoice.paymentAccountId, invoice.paymentSplits, paidAmount) : 0;
      const cashRefund = cashSale ? 0 : Math.max(0, Math.round((paidAmount - appliedAmt) * 100) / 100);
      const netReceivableCredit = (parseFloat(invoice.total) || 0) - cashRefund;
      if (netReceivableCredit > 0) {
        journalRows.push({ id: journalRows.length + 1, type: 'To', particular: customerName, debit: '', credit: netReceivableCredit.toFixed(2) });
      }

      if (cashRefund > 0) {
        getSalesPaymentSplitRows(invoice, paidAmount, () => []).forEach(p => {
          journalRows.push({ id: journalRows.length + 1, type: 'To', particular: p.name, debit: '', credit: p.amount.toFixed(2) });
        });
      }

    } else {
      // ── REGULAR SALES INVOICE (3 Linked Journal Entries) ─────────────
      const invTotal = parseFloat(invoice.total) || 0;
      const tdsAmt   = (invoice.tdsTcsMode === 'TDS' && parseFloat(invoice.tdsTcsAmount) > 0) ? parseFloat(invoice.tdsTcsAmount) : 0;
      const tcsAmt   = (invoice.tdsTcsMode === 'TCS' && parseFloat(invoice.tdsTcsAmount) > 0) ? parseFloat(invoice.tdsTcsAmount) : 0;
      const adjAmt   = parseFloat(invoice.adjustments) || 0;

      const invoiceJERows = [];
      const trLedgerId = getOrCreateSystemLedger('Trade Receivables', 'sg-tr');
      const trName = (coaLedgers.find(l => l.id == trLedgerId) || { name: 'Trade Receivables' }).name;

      const grossReceivable = invTotal + tdsAmt;
      invoiceJERows.push({ id: 1, type: 'By', particular: customerName || trName, debit: grossReceivable.toFixed(2), credit: '' });

      if (adjAmt < 0) {
        const adjLedgerId = getOrCreateSystemLedger('Adjustments Account', 'sg-oe');
        const adjName = (coaLedgers.find(l => l.id == adjLedgerId) || { name: 'Adjustments Account' }).name;
        invoiceJERows.push({ id: invoiceJERows.length + 1, type: 'By', particular: adjName, debit: Math.abs(adjAmt).toFixed(2), credit: '' });
      }

      getSalesRevenueLines(invoice).forEach(line => {
        invoiceJERows.push({ id: invoiceJERows.length + 1, type: 'To', particular: line.name, debit: '', credit: line.amount.toFixed(2) });
      });

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
          invoiceJERows.push({ id: invoiceJERows.length + 1, type: 'To', particular: cgstName, debit: '', credit: cgstAmt.toFixed(2) });
          const sgstLedgerId = getOrCreateSystemLedger('Output SGST', 'sg-ocl');
          const sgstName = (coaLedgers.find(l => l.id == sgstLedgerId) || { name: 'Output SGST' }).name;
          invoiceJERows.push({ id: invoiceJERows.length + 1, type: 'To', particular: sgstName, debit: '', credit: sgstAmt.toFixed(2) });
        } else if (supplyType === 'Inter-State (IGST)' || supplyType === 'SEZ With Tax') {
          const igstLedgerId = getOrCreateSystemLedger('Output IGST', 'sg-ocl');
          const igstName = (coaLedgers.find(l => l.id == igstLedgerId) || { name: 'Output IGST' }).name;
          invoiceJERows.push({ id: invoiceJERows.length + 1, type: 'To', particular: igstName, debit: '', credit: totalGst.toFixed(2) });
        } else {
          const gstLedgerId = getOrCreateSystemLedger('GST Payable', 'sg-ocl');
          const gstName = (coaLedgers.find(l => l.id == gstLedgerId) || { name: 'GST Payable' }).name;
          invoiceJERows.push({ id: invoiceJERows.length + 1, type: 'To', particular: gstName, debit: '', credit: totalGst.toFixed(2) });
        }
      }

      if (tcsAmt > 0) {
        const tcsLedgerId = getOrCreateSystemLedger('TCS Payable', 'sg-ocl');
        const tcsName = (coaLedgers.find(l => l.id == tcsLedgerId) || { name: 'TCS Payable' }).name;
        invoiceJERows.push({ id: invoiceJERows.length + 1, type: 'To', particular: tcsName, debit: '', credit: tcsAmt.toFixed(2) });
      }

      if (adjAmt > 0) {
        const adjLedgerId = getOrCreateSystemLedger('Adjustments Account', 'sg-oe');
        const adjName = (coaLedgers.find(l => l.id == adjLedgerId) || { name: 'Adjustments Account' }).name;
        invoiceJERows.push({ id: invoiceJERows.length + 1, type: 'To', particular: adjName, debit: '', credit: adjAmt.toFixed(2) });
      }

      // ── Create / Update JE-1 (Invoice Recognition) ───────────────────
      const invoiceJEId = invoice.journalEntryId || Date.now();
      const invoiceEntry = {
        id:              invoiceJEId,
        date:            invoice.date,
        voucherNo:       voucherNo,
        preparedBy:      'Sales Module',
        departmentId:    '',
        isBudget:        false,
        firstParticular: customerName || trName,
        amount:          fmtNum(invTotal),
        allRows:         invoiceJERows,
        narration:       `${cashSale ? `Cash sale — Sales Invoice No. ${invoice.invoiceNo} received in full in ${customerName}.` : `Sales Invoice No. ${invoice.invoiceNo} posted for customer ${customerName}.`}${execText} ${invoice.notes || ''}`.trim(),
        jeType:          'invoice',
      };
      if (typeof postedEntries !== 'undefined') {
        if (invoice.journalEntryId) {
          const idx = postedEntries.findIndex(e => e.id === invoice.journalEntryId);
          if (idx > -1) { postedEntries[idx] = invoiceEntry; }
          else { postedEntries.unshift(invoiceEntry); }
        } else {
          postedEntries.unshift(invoiceEntry);
        }
      }

      // ── Create / Update JE-2 (TDS) ──────────────────────────────────
      let tdsJEId = '';
      let tdsVoucherNo = '';
      if (tdsAmt > 0) {
        if (invoice.tdsJournalEntryId && typeof postedEntries !== 'undefined') {
          postedEntries = postedEntries.filter(e => e.id !== invoice.tdsJournalEntryId);
        }
        tdsJEId = invoice.tdsJournalEntryId || (Date.now() + 1);
        const existingTdsEntry = (typeof postedEntries !== 'undefined' && invoice.tdsJournalEntryId)
          ? postedEntries.find(e => String(e.id) === String(invoice.tdsJournalEntryId))
          : null;
        if (existingTdsEntry && existingTdsEntry.voucherNo && existingTdsEntry.voucherNo.startsWith('JV-')) {
          tdsVoucherNo = existingTdsEntry.voucherNo;
        } else if (invoice.tdsVoucherNo && invoice.tdsVoucherNo.startsWith('JV-')) {
          tdsVoucherNo = invoice.tdsVoucherNo;
        } else if (typeof getNextJournalVoucherNo === 'function') {
          tdsVoucherNo = getNextJournalVoucherNo(invoice.date);
        } else {
          const yr = invoice.date ? new Date(invoice.date).getFullYear() : new Date().getFullYear();
          tdsVoucherNo = `JV-${yr}-001`;
        }

        const tdsLedgerId = getOrCreateSystemLedger('TDS Receivable', 'sg-stla');
        const tdsLedgerName = (coaLedgers.find(l => l.id == tdsLedgerId) || { name: 'TDS Receivable' }).name;
        const tdsJERows = [
          { id: 1, type: 'By', particular: tdsLedgerName, debit: tdsAmt.toFixed(2), credit: '' },
          { id: 2, type: 'To', particular: customerName,  debit: '',                credit: tdsAmt.toFixed(2) },
        ];
        const tdsEntry = {
          id:              tdsJEId,
          date:            invoice.date,
          voucherNo:       tdsVoucherNo,
          preparedBy:      'Sales Module',
          departmentId:    '',
          isBudget:        false,
          firstParticular: tdsLedgerName,
          amount:          fmtNum(tdsAmt),
          allRows:         tdsJERows,
          narration:       `TDS deducted by customer ${customerName} against Invoice No. ${invoice.invoiceNo} @ ${invoice.tdsTcsRate}%.`.trim(),
          jeType:          'tds',
        };
        if (typeof postedEntries !== 'undefined') {
          postedEntries.unshift(tdsEntry);
        }
      } else if (invoice.tdsJournalEntryId && typeof postedEntries !== 'undefined') {
        postedEntries = postedEntries.filter(e => e.id !== invoice.tdsJournalEntryId);
      }

      // ── Create / Update JE-3 (Payment Receipt) ──────────────────────
      let paymentJEId = '';
      let paymentVoucherNo = '';
      // A cash sale has no separate receipt: the sale already debited the cash account
      if (paidAmount > 0 && !cashSale) {
        if (invoice.paymentJournalEntryId && typeof postedEntries !== 'undefined') {
          postedEntries = postedEntries.filter(e => e.id !== invoice.paymentJournalEntryId);
        }
        paymentJEId = invoice.paymentJournalEntryId || (Date.now() + 2);
        const existingPaymentEntry = (typeof postedEntries !== 'undefined' && invoice.paymentJournalEntryId)
          ? postedEntries.find(e => String(e.id) === String(invoice.paymentJournalEntryId))
          : null;
        if (existingPaymentEntry && existingPaymentEntry.voucherNo && existingPaymentEntry.voucherNo.startsWith('JV-')) {
          paymentVoucherNo = existingPaymentEntry.voucherNo;
        } else if (invoice.paymentVoucherNo && invoice.paymentVoucherNo.startsWith('JV-')) {
          paymentVoucherNo = invoice.paymentVoucherNo;
        } else if (typeof getNextJournalVoucherNo === 'function') {
          paymentVoucherNo = getNextJournalVoucherNo(invoice.date);
        } else {
          const yr = invoice.date ? new Date(invoice.date).getFullYear() : new Date().getFullYear();
          paymentVoucherNo = `JV-${yr}-001`;
        }

        const payAccountName = (getSalesPaymentSplitRows(invoice, paidAmount)[0] || { name: 'Cash Account' }).name;

        // Check if this invoice was converted from a Proforma with advance payment
        const convertedProformaId = invoice.convertedFromProformaId || window._pendingConvertProformaId;
        let prof = null;
        if (convertedProformaId && typeof window.KYA_STORE !== 'undefined' && Array.isArray(window.KYA_STORE.proformaInvoices)) {
          prof = window.KYA_STORE.proformaInvoices.find(p => String(p.id) === String(convertedProformaId));
        }
        // The advance the invoice took over (the part of the proforma's advance still free
        // when it was converted); older invoices fall back to the proforma's figure
        const profAdvanceAmt = (invoice.advancePaidAmount !== undefined && invoice.advancePaidAmount !== null)
          ? (parseFloat(invoice.advancePaidAmount) || 0)
          : (prof ? (parseFloat(prof.advancePaidAmount) || 0) : 0);
        const advPortion = (profAdvanceAmt > 0) ? Math.min(profAdvanceAmt, paidAmount) : 0;
        const cashPortion = Math.max(0, paidAmount - advPortion);

        // A party that exists only as a ledger took the proforma advance straight into its
        // own ledger, so only the balance is a fresh receipt — nothing to move out of
        // Advance from Customers.
        const advJEId = (prof && prof.advanceJournalEntryId) || invoice.advanceJournalEntryId;
        const advEntry = (advPortion > 0 && advJEId && typeof postedEntries !== 'undefined')
          ? postedEntries.find(e => String(e.id) === String(advJEId))
          : null;
        const advInPartyLedger = !!advEntry && (advEntry.allRows || []).some(r =>
          (parseFloat(r.credit) || 0) > 0 && (r.particular || '').trim().toLowerCase() === customerName.trim().toLowerCase());
        const partyCredit = advInPartyLedger ? cashPortion : paidAmount;

        const payJERows = [];
        let rId = 1;
        let primaryParticular = payAccountName;

        if (advPortion > 0 && !advInPartyLedger) {
          const advLedgerId = (typeof getOrCreateSystemLedger === 'function')
            ? getOrCreateSystemLedger('Advance from Customers', 'sg-ocl')
            : (typeof window.getOrCreateSystemLedger === 'function' ? window.getOrCreateSystemLedger('Advance from Customers', 'sg-ocl') : null);
          const advLedger = (typeof coaLedgers !== 'undefined' ? coaLedgers : []).find(l => l.id === advLedgerId || l.name === 'Advance from Customers');
          const advLedgerName = advLedger ? advLedger.name : 'Advance from Customers';

          payJERows.push({
            id: rId++,
            type: 'By',
            particular: advLedgerName,
            debit: advPortion.toFixed(2),
            credit: ''
          });
          primaryParticular = advLedgerName;
        }

        if (cashPortion > 0) {
          getSalesPaymentSplitRows(invoice, cashPortion).forEach(p => {
            payJERows.push({
              id: rId++,
              type: 'By',
              particular: p.name,
              debit: p.amount.toFixed(2),
              credit: ''
            });
          });
          if (advPortion === 0 || advInPartyLedger) primaryParticular = payAccountName;
        }

        payJERows.push({
          id: rId++,
          type: 'To',
          particular: customerName,
          debit: '',
          credit: partyCredit.toFixed(2)
        });

        let payNarration = `Payment received from customer ${customerName} against Invoice No. ${invoice.invoiceNo}. Status: ${invoice.paymentStatus}.`.trim();
        if (advInPartyLedger) {
          payNarration = `Balance payment ₹${fmtNum(cashPortion)} received from ${customerName} against Invoice No. ${invoice.invoiceNo} (advance ₹${fmtNum(advPortion)} from Proforma ${prof?.proformaNo || ''} already in the ledger).`.trim();
        } else if (advPortion > 0 && cashPortion > 0) {
          payNarration = `Advance payment ₹${fmtNum(advPortion)} adjusted from Proforma ${prof?.proformaNo || ''} and balance payment ₹${fmtNum(cashPortion)} received from customer ${customerName} against Invoice No. ${invoice.invoiceNo}.`.trim();
        } else if (advPortion > 0) {
          payNarration = `Advance payment ₹${fmtNum(advPortion)} adjusted from Proforma ${prof?.proformaNo || ''} against Invoice No. ${invoice.invoiceNo}.`.trim();
        }
        // Settled without Cash / Bank
        const payAdjustLedger = typeof isAdjustLedgerAccount === 'function' && isAdjustLedgerAccount(invoice.paymentAccountId);
        const creditPortion = typeof getCreditAdjustPortion === 'function'
          ? Math.min(cashPortion, getCreditAdjustPortion(invoice.paymentAccountId, invoice.paymentSplits, cashPortion)) : 0;
        if (creditPortion > 0) {
          // Invoice Balance — all of it, or one row of a Multi Payment beside cash / bank
          const receivedNow = Math.round((cashPortion - creditPortion) * 100) / 100;
          payNarration = `Invoice No. ${invoice.invoiceNo} of ${customerName}: ${receivedNow > 0 ? `₹${fmtNum(receivedNow)} received and ` : ''}₹${fmtNum(creditPortion)} adjusted against the customer's balance (${typeof describeAdjustments === 'function' ? describeAdjustments(invoice.creditAdjustments) : ''})${advPortion > 0 ? `; advance ₹${fmtNum(advPortion)} from ${prof?.proformaNo || 'the pre-invoice'}` : ''}.`;
        } else if (payAdjustLedger && cashPortion > 0) {
          payNarration = `Invoice No. ${invoice.invoiceNo} of ${customerName}: ₹${fmtNum(cashPortion)} adjusted with ${payAccountName}${advPortion > 0 ? `; advance ₹${fmtNum(advPortion)} from ${prof?.proformaNo || 'the pre-invoice'}` : ''}.`;
        }

        const paymentEntry = {
          id:              paymentJEId,
          date:            invoice.date,
          voucherNo:       paymentVoucherNo,
          preparedBy:      'Sales Module',
          departmentId:    '',
          isBudget:        false,
          firstParticular: primaryParticular,
          amount:          fmtNum(partyCredit),
          allRows:         payJERows,
          narration:       payNarration,
          jeType:          'payment',
          // Set off against another party's ledger: that party's statement shows it
          ledgerAdjust:    payAdjustLedger,
          partyName:       customerName,
        };
        if (partyCredit <= 0) {
          // The advance covered the whole payment: no receipt to post
          paymentJEId = '';
          paymentVoucherNo = '';
        } else if (typeof postedEntries !== 'undefined') {
          postedEntries.unshift(paymentEntry);
          if (typeof window !== 'undefined') window.postedEntries = postedEntries;
        }
      } else if (invoice.paymentJournalEntryId && typeof postedEntries !== 'undefined') {
        postedEntries = postedEntries.filter(e => e.id !== invoice.paymentJournalEntryId);
        if (typeof window !== 'undefined') window.postedEntries = postedEntries;
      }

      // ── Create / Update JE-4 (Advance above the invoice value) ──────
      const refundResult = postSalesAdvanceRefundEntry(invoice, customerName);

      if (!silent) refreshAllReports();
      return {
        invoiceJEId, tdsJEId, tdsVoucherNo, paymentJEId, paymentVoucherNo,
        advanceRefundJEId: refundResult.id, advanceRefundVoucherNo: refundResult.voucherNo
      };
    }

    // ── Return: single combined journal entry ─────────────────────────
    const entryId = invoice.journalEntryId || Date.now();
    const entry = {
      id:              entryId,
      date:            invoice.date,
      voucherNo:       voucherNo,
      preparedBy:      'Sales Module',
      departmentId:    '',
      isBudget:        false,
      firstParticular: customerName || (((paidAmount > 0) && getSalesPaymentSplitRows(invoice, paidAmount, () => [])[0]) || { name: 'Trade Receivables' }).name,
      amount:          fmtNum(invoice.total),
      allRows:         journalRows,
      narration:       `Sales Reversal No. ${invoice.invoiceNo} posted for customer ${customerName}.${execText}${typeof usesCreditAdjust === 'function' && usesCreditAdjust(invoice.paymentAccountId, invoice.paymentSplits) && typeof describeApplications === 'function' ? ` Credit applied to ${describeApplications(invoice.creditApplications)}.` : ''} ${invoice.notes || ''}`.trim(),
      // A refund set off against another party's ledger: that party's statement shows it
      ledgerAdjust:    typeof isAdjustLedgerAccount === 'function' && isAdjustLedgerAccount(invoice.paymentAccountId),
      partyName:       customerName,
    };

    if (typeof postedEntries !== 'undefined') {
      if (invoice.journalEntryId) {
        const idx = postedEntries.findIndex(e => e.id === invoice.journalEntryId);
        if (idx > -1) { postedEntries[idx] = entry; }
        else { postedEntries.unshift(entry); }
      } else {
        postedEntries.unshift(entry);
      }
    }
    if (!silent) refreshAllReports();
    return entryId;
  }

  // ── Global Window Exports ──
  window.postSalesInvoice = postSalesInvoice;
  window.saveSalesDraft = saveSalesDraft;
  window.loadSalesInvoice = loadSalesInvoice;
  window.postSalesVoucherToJournal = postSalesVoucherToJournal;
  window.rebuildSalesJournalEntries = rebuildSalesJournalEntries;
