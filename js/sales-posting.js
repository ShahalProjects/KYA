  function loadSalesInvoice(inv, isDraft = false) {
    window._salesPartyOverride = inv.partyOverride ? JSON.parse(JSON.stringify(inv.partyOverride)) : null;
    currentSalesVoucherSubtype = inv.isReturn ? 'Return' : 'Invoice';
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
        returnTriggerText.textContent = 'Select Invoice';
      }
    }
    
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
    
    const notPaidBtn = document.getElementById('salesPaymentStatusNotPaid');
    const fullBtn = document.getElementById('salesPaymentStatusFull');
    const partBtn = document.getElementById('salesPaymentStatusPartial');
    if (inv.paymentStatus === 'Full Payment' || inv.paymentStatus === 'Full Refund') {
      if (fullBtn) fullBtn.click();
    } else if (inv.paymentStatus === 'Partial Payment' || inv.paymentStatus === 'Partial Refund') {
      if (partBtn) partBtn.click();
    } else {
      if (notPaidBtn) notPaidBtn.click();
    }
    
    populateSalesPaymentAccounts(inv.paymentAccountId);
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
            row.origQty = match.qty + (parseFloat(row.qty) || 0);
            row.origRate = match.rate;
            row.origDiscount = match.discount;
            row.origDiscountType = match.discountType;
            row.origBaseAmount = match.baseAmount + (parseFloat(row.baseAmount) || 0);
          }
        });
      }
    }
    renderSalesRows();
    updateSalesReturnLockState();
    recalculateSalesTotals();
    
    window._editingSalesInvoice = { id: inv.id, isDraft: isDraft };
    updateSalesDocUI(inv.uploadedDoc || null);
    
    openTab('sales_voucher');
  }

  function saveSalesDraft() {
    if (typeof syncSalesRowsFromDOM === 'function') {
      syncSalesRowsFromDOM();
    }
    if (currentSalesVoucherSubtype === 'Return') {
      const origInv = getOriginalInvoiceForReturn();
      if (!origInv) {
        showToast('Please select the original Document (Invoice) for this sales reversal draft.', 'warning');
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
    
    if (paymentStatus === 'Full Payment' || paymentStatus === 'Full Refund') {
      paymentAmount = getSalesPaymentMax(total);
    } else if (paymentStatus === 'Partial Payment' || paymentStatus === 'Partial Refund') {
      paymentAmount = parseFloat(document.getElementById('salesPaymentAmount').value) || 0;
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
      customerId,
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
        showToast('Please select the original Document (Invoice) for this sales reversal.', 'warning');
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
    const dup = window.KYA_STORE.salesVouchers.some(v => {
      if (v.invoiceNo.toLowerCase() !== invoiceNo.toLowerCase()) return false;
      const isVReturn = !!v.isReturn;
      const isVInvoice = !v.isReturn;
      const isCurrentReturn = currentSalesVoucherSubtype === 'Return';
      const isCurrentInvoice = currentSalesVoucherSubtype === 'Invoice';
      if (isCurrentReturn !== isVReturn) return false;
      if (isCurrentInvoice !== isVInvoice) return false;
      if (window._editingSalesInvoice && !window._editingSalesInvoice.isDraft && v.id === window._editingSalesInvoice.id) {
        return false;
      }
      return true;
    });
    if (dup) {
      let typeLabel = currentSalesVoucherSubtype === 'Return' ? 'Reversal' : 'Invoice';
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
    const paymentAccountId = document.getElementById('salesPaymentAccount').value;
    let paymentAmount = 0;
    
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
            : `Payment Amount cannot exceed the Grand Total of ₹${fmtNum(maxVal)}.`;
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
      rows: JSON.parse(JSON.stringify(salesRows)),
      partyOverride: window._salesPartyOverride ? JSON.parse(JSON.stringify(window._salesPartyOverride)) : null,
      uploadedDoc: window._salesUploadedDoc || null,
      journalEntryId: existingJournalEntryId || '',
      tdsJournalEntryId: existingPostedInv ? (existingPostedInv.tdsJournalEntryId || '') : '',
      tdsVoucherNo: existingPostedInv ? (existingPostedInv.tdsVoucherNo || '') : '',
      paymentJournalEntryId: existingPostedInv ? (existingPostedInv.paymentJournalEntryId || '') : '',
      paymentVoucherNo: existingPostedInv ? (existingPostedInv.paymentVoucherNo || '') : '',
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
    
    if (currentSalesInvoiceMode === 'Auto' && !isEditPosted) {
      if (currentSalesVoucherSubtype === 'Return') {
        window.KYA_STORE.salesReturnCtr = (window.KYA_STORE.salesReturnCtr || 1) + 1;
      } else {
        window.KYA_STORE.salesInvoiceCtr = (window.KYA_STORE.salesInvoiceCtr || 1) + 1;
      }
    }
    
    let successMsg = `Invoice "${invoiceNo}" posted successfully.`;
    const _subtypeSnapshot = currentSalesVoucherSubtype;
    if (_subtypeSnapshot === 'Return') {
      successMsg = `Sales Reversal "${invoiceNo}" posted successfully.`;
    }
    showToast(successMsg, 'success');
    showInvoicePostedModal(invoiceNo, _subtypeSnapshot);
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

  function postSalesVoucherToJournal(invoice) {
    if (!invoice) return '';
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

    const paidAmount = (invoice.paymentStatus === 'Full Payment' || invoice.paymentStatus === 'Full Refund')
      ? getSalesPaymentMax(invoice.total)
      : ((invoice.paymentStatus === 'Partial Payment' || invoice.paymentStatus === 'Partial Refund')
        ? (parseFloat(invoice.paymentAmount) || 0)
        : 0);

    const journalRows = [];
    const custs = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
    const cust = custs.find(c => String(c.id) === String(invoice.customerId));
    const customerName = cust ? cust.name : (invoice.customerName || 'Customer');

    let execText = '';
    if (invoice.salesExecutiveId && typeof ohEmployees !== 'undefined') {
      const execEmp = ohEmployees.find(e => e.id == invoice.salesExecutiveId);
      if (execEmp) execText = ` Sales Executive: ${execEmp.name}.`;
    }
    const prefix = isRet ? 'SR-' : 'SV-';
    const voucherNo = (invoice.invoiceNo.startsWith(prefix) || invoice.invoiceNo.startsWith('INV-')) ? invoice.invoiceNo : `${prefix}${invoice.invoiceNo}`;

    if (isRet) {
      // ── SALES REVERSAL / RETURN ───────────────────────────────────────
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
          journalRows.push({ id: journalRows.length + 1, type: 'By', particular: salesReturnName, debit: totalRevenue.toFixed(2), credit: '' });
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
            journalRows.push({ id: journalRows.length + 1, type: 'By', particular: ledgerName, debit: revAmt.toFixed(2), credit: '' });
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

      const netReceivableCredit = (parseFloat(invoice.total) || 0) - paidAmount;
      if (netReceivableCredit > 0) {
        journalRows.push({ id: journalRows.length + 1, type: 'To', particular: customerName, debit: '', credit: netReceivableCredit.toFixed(2) });
      }

      if (paidAmount > 0) {
        const payAccount = (typeof coaLedgers !== 'undefined' ? coaLedgers : []).find(l => l.id == invoice.paymentAccountId);
        const payAccountName = payAccount ? payAccount.name : 'Cash Account';
        journalRows.push({ id: journalRows.length + 1, type: 'To', particular: payAccountName, debit: '', credit: paidAmount.toFixed(2) });
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

      if (invoice.type === 'Product') {
        let totalRevenue = 0;
        (invoice.rows || []).forEach(r => {
          const base = (parseFloat(r.qty) || 0) * (parseFloat(r.rate) || 0);
          const discAmt = r.discountType === 'pct' ? (base * ((parseFloat(r.discount) || 0) / 100)) : (parseFloat(r.discount) || 0);
          totalRevenue += Math.max(0, base - discAmt);
        });
        if (totalRevenue > 0) {
          const salesLedgerId = getOrCreateSystemLedger('Sales Account', 'sg-rfo');
          const salesLedgerName = (coaLedgers.find(l => l.id == salesLedgerId) || { name: 'Sales Account' }).name;
          invoiceJERows.push({ id: invoiceJERows.length + 1, type: 'To', particular: salesLedgerName, debit: '', credit: totalRevenue.toFixed(2) });
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
            invoiceJERows.push({ id: invoiceJERows.length + 1, type: 'To', particular: ledgerName, debit: '', credit: revAmt.toFixed(2) });
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
        narration:       `Sales Invoice No. ${invoice.invoiceNo} posted for customer ${customerName}.${execText} ${invoice.notes || ''}`.trim(),
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
      if (paidAmount > 0) {
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

        const payAcct = (typeof coaLedgers !== 'undefined' ? coaLedgers : []).find(l => l.id == invoice.paymentAccountId);
        const payAccountName = payAcct ? payAcct.name : 'Cash Account';
        const payJERows = [
          { id: 1, type: 'By', particular: payAccountName, debit: paidAmount.toFixed(2), credit: '' },
          { id: 2, type: 'To', particular: customerName,   debit: '',                   credit: paidAmount.toFixed(2) },
        ];
        const paymentEntry = {
          id:              paymentJEId,
          date:            invoice.date,
          voucherNo:       paymentVoucherNo,
          preparedBy:      'Sales Module',
          departmentId:    '',
          isBudget:        false,
          firstParticular: payAccountName,
          amount:          fmtNum(paidAmount),
          allRows:         payJERows,
          narration:       `Payment received from customer ${customerName} against Invoice No. ${invoice.invoiceNo}. Status: ${invoice.paymentStatus}.`.trim(),
          jeType:          'payment',
        };
        if (typeof postedEntries !== 'undefined') {
          postedEntries.unshift(paymentEntry);
        }
      } else if (invoice.paymentJournalEntryId && typeof postedEntries !== 'undefined') {
        postedEntries = postedEntries.filter(e => e.id !== invoice.paymentJournalEntryId);
      }

      refreshAllReports();
      return { invoiceJEId, tdsJEId, tdsVoucherNo, paymentJEId, paymentVoucherNo };
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
      firstParticular: customerName || ((paidAmount > 0) ? (coaLedgers.find(l => l.id == invoice.paymentAccountId)?.name || 'Cash Account') : 'Trade Receivables'),
      amount:          fmtNum(invoice.total),
      allRows:         journalRows,
      narration:       `Sales Reversal No. ${invoice.invoiceNo} posted for customer ${customerName}.${execText} ${invoice.notes || ''}`.trim(),
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
    refreshAllReports();
    return entryId;
  }

  // ── Global Window Exports ──
  window.postSalesInvoice = postSalesInvoice;
  window.saveSalesDraft = saveSalesDraft;
  window.loadSalesInvoice = loadSalesInvoice;
  window.postSalesVoucherToJournal = postSalesVoucherToJournal;
