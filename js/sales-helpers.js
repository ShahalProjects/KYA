  // ══════════════════════════════════════════════════════════════════
  //  SALES HELPERS — Return/payment helpers, ledger & dropdown utilities, store init
  //  (Split from sales.js for maintainability)
  // ══════════════════════════════════════════════════════════════════

  // A sales party can be a customer from the customer master or a ledger created under
  // Trade Receivables — both show up in the customer dropdown, so every lookup has to
  // check both. `fallbackName` is the name stored on the voucher, used when the master
  // record is gone.
  function getSalesPartyName(partyId, fallbackName) {
    if (partyId) {
      const party = (typeof findPartyById === 'function') ? findPartyById(partyId, 'Customer') : null;
      if (party && party.name) return party.name;

      if (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) {
        const ledger = coaLedgers.find(l => String(l.id) === String(partyId));
        if (ledger && ledger.name) return ledger.name;
      }
    }
    return fallbackName || '';
  }
  window.getSalesPartyName = getSalesPartyName;

  // ── "Create new" for customer dropdowns (Sales Invoice and the Pre Invoice forms) ──
  // A customer goes into Master Desk → Customers; a ledger is created under Trade
  // Receivables. Master Desk comes back to the Sales tab and calls onPartyCreatedForSales;
  // `target` (onCreated / onCancelled) routes that to the form that asked — none means the
  // Sales Invoice's own Customer box.
  function startSalesPartyCreate(kind, name, target) {
    window._salesPartyCreateTarget = target || null;
    if (kind === 'customer' && typeof window.openMasterDeskCreateParty === 'function') {
      window.openMasterDeskCreateParty({ type: 'customer', initialName: name, returnTab: 'sales_voucher' });
    } else if (typeof window.openMasterDeskCreateLedger === 'function') {
      window.openMasterDeskCreateLedger({ initialName: name, groupVal: 'sg:sg-tr', returnTab: 'sales_voucher', selectId: 'salesCustomer' });
    }
  }

  // Sticky footer at the bottom of a customer list: "Create new" → Ledger (under Trade Receivables),
  // using whatever is typed in the search box as the name
  function appendSalesPartyCreateFooter(listEl, query, target) {
    if (!listEl) return;
    const raw = (query || '').trim();
    const wrap = document.createElement('div');
    wrap.className = 'kya-party-create-footer';
    wrap.style.cssText = 'position: sticky; bottom: -8px; z-index: 5; background: #fff; border-top: 1px solid var(--slate-200); margin: 4px -8px -8px; padding: 8px 10px 10px; border-radius: 0 0 12px 12px;';
    const label = document.createElement('div');
    label.style.cssText = 'font-size: 11px; font-weight: 600; color: var(--slate-500); margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
    label.textContent = raw ? `Create "${raw}" as` : 'Create new';
    wrap.appendChild(label);
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; gap: 6px;';
    const plus = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
    [['ledger', 'Ledger']].forEach(([kind, text]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'je-drop-create-item';
      btn.style.cssText = 'flex: 1; justify-content: center; padding: 7px 10px; font-size: 12px;';
      btn.innerHTML = `${plus}<span>${text}</span>`;
      btn.title = kind === 'customer' ? 'Create a customer in Master Desk → Customers' : 'Create a ledger under Trade Receivables';
      btn.addEventListener('mousedown', e => {
        e.preventDefault();
        e.stopPropagation();
        startSalesPartyCreate(kind, raw, target);
      });
      btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
      row.appendChild(btn);
    });
    wrap.appendChild(row);
    listEl.appendChild(wrap);
  }

  // For a Pre Invoice form's customer box: select the new party when Master Desk comes
  // back, or reopen the list with the typed name if creation was cancelled
  function preInvoicePartyCreateTarget(prefix, populate, select) {
    return {
      onCreated: party => {
        populate('');
        if (party && party.id != null) select(party.id);
      },
      onCancelled: name => {
        const dd = document.getElementById(`${prefix}CustomerSelectDropdown`);
        const search = document.getElementById(`${prefix}CustomerSelectSearch`);
        if (!dd || !search) return;
        dd.style.display = 'flex';
        search.value = name || '';
        populate(search.value);
        search.focus();
      }
    };
  }

  window.startSalesPartyCreate = startSalesPartyCreate;
  window.appendSalesPartyCreateFooter = appendSalesPartyCreateFooter;
  window.preInvoicePartyCreateTarget = preInvoicePartyCreateTarget;

  // ── Pre Invoice cards ──
  // Every card the Sales tab swaps between for Pre Invoice work; showing one hides the rest.
  const SALES_PRE_INVOICE_CARD_IDS = [
    'salesPreInvoiceCard', 'salesVoucherFormCard',
    'salesQuotationListCard', 'salesQuotationFormCard',
    'salesProformaListCard', 'salesProformaFormCard',
    'salesOrderListCard', 'salesOrderFormCard',
    'salesDeliveryChallanListCard', 'salesDeliveryChallanFormCard'
  ];
  function showSalesPreInvoiceCard(cardId) {
    SALES_PRE_INVOICE_CARD_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = (id === cardId) ? 'block' : 'none';
    });
  }
  // For the older Quotation / Proforma card switching, which predates the Sales Order and
  // Delivery Challan lists
  function hidePreInvoiceDocListCards() {
    ['salesOrderListCard', 'salesDeliveryChallanListCard'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }
  window.showSalesPreInvoiceCard = showSalesPreInvoiceCard;
  window.hidePreInvoiceDocListCards = hidePreInvoiceDocListCards;

  // ── Pre-invoice advances (Proforma Invoice, Sales Order, Delivery Challan) ──
  // Ledger an advance is credited to. A Master Desk customer's advance is held in
  // Advance from Customers; a party that exists only as a Trade Receivables ledger
  // takes it straight into its own ledger.
  function getPreInvoiceAdvanceCreditLedgerName(customerId) {
    const party = (typeof findPartyById === 'function') ? findPartyById(customerId, 'Customer') : null;
    if (typeof isKyaLedgerParty === 'function' && isKyaLedgerParty(party)) return party.name;

    const advLedgerId = (typeof getOrCreateSystemLedger === 'function')
      ? getOrCreateSystemLedger('Advance from Customers', 'sg-ocl')
      : null;
    const ledgers = (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) ? coaLedgers : [];
    const advLedger = ledgers.find(l => l.id == advLedgerId) || ledgers.find(l => (l.name || '').toLowerCase() === 'advance from customers');
    return advLedger ? advLedger.name : 'Advance from Customers';
  }

  // Posts, or re-posts in place, the advance receipt for a pre-invoice document:
  // Cash/Bank Dr (`receiptRows`: [{ name, amount }]) → advance ledger Cr. The entry's id,
  // voucher no and amount are kept on `doc` so later saves update the same entry.
  // `info`: { preparedBy, docLabel, docNo, extra } — `extra` fields are added to the entry.
  function postPreInvoiceAdvanceEntry(doc, amount, receiptRows, info) {
    if (typeof postedEntries === 'undefined' || !(amount > 0) || !receiptRows.length) return;

    const custName = doc.customerName || 'Customer';
    let voucherNo = doc.advanceVoucherNo;
    if (!voucherNo || !String(voucherNo).startsWith('JV-')) {
      voucherNo = (typeof getNextJournalVoucherNo === 'function')
        ? getNextJournalVoucherNo(doc.date)
        : `JV-${(doc.date ? new Date(doc.date) : new Date()).getFullYear()}-001`;
    }
    const entryId = doc.advanceJournalEntryId || Date.now();

    const rows = receiptRows.map((r, i) => ({
      id: i + 1, type: 'By', particular: r.name, debit: r.amount.toFixed(2), credit: ''
    }));
    rows.push({
      id: rows.length + 1, type: 'To', particular: getPreInvoiceAdvanceCreditLedgerName(doc.customerId), debit: '', credit: amount.toFixed(2)
    });

    const entry = Object.assign({
      id: entryId,
      date: doc.date,
      voucherNo,
      preparedBy: info.preparedBy,
      departmentId: '',
      isBudget: false,
      firstParticular: receiptRows[0].name,
      amount: (typeof fmtNum === 'function') ? fmtNum(amount) : amount.toFixed(2),
      allRows: rows,
      narration: `Advance received from ${custName} against ${info.docLabel} No. ${info.docNo} (${doc.paymentStatus}).`,
      jeType: 'advance_receipt',
      customerId: doc.customerId,
      customerName: custName,
      sourceDocNo: info.docNo
    }, info.extra || {});

    const idx = postedEntries.findIndex(e => String(e.id) === String(entryId));
    if (idx > -1) postedEntries[idx] = entry;
    else postedEntries.unshift(entry);
    window.postedEntries = postedEntries;

    doc.advanceJournalEntryId = entryId;
    doc.advanceVoucherNo = voucherNo;
    doc.advancePaidAmount = amount;
  }

  function removePreInvoiceAdvanceEntry(doc) {
    if (doc.advanceJournalEntryId && typeof postedEntries !== 'undefined') {
      postedEntries = postedEntries.filter(e => String(e.id) !== String(doc.advanceJournalEntryId));
      window.postedEntries = postedEntries;
    }
    doc.advanceJournalEntryId = null;
    doc.advanceVoucherNo = null;
    doc.advancePaidAmount = 0;
  }

  // Cash/Bank debit rows for a saved document's advance entry: one per account, scaled to
  // `amount` when split by Multi Payment (rounding lands on the last row)
  function getPreInvoiceAdvanceReceiptRows(data, amount) {
    const ledgers = (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) ? coaLedgers : [];
    const nameOf = id => (ledgers.find(l => String(l.id) === String(id)) || {}).name || 'Cash Account';
    const used = (Array.isArray(data.paymentSplits) ? data.paymentSplits : [])
      .filter(sp => sp && sp.accountId && (parseFloat(sp.amount) || 0) > 0);
    const splitTotal = used.reduce((sum, sp) => sum + (parseFloat(sp.amount) || 0), 0);

    if (String(data.paymentAccountId) !== 'multi-payment' || splitTotal <= 0) {
      return [{ name: nameOf(data.paymentAccountId), amount }];
    }
    const rows = [];
    let allocated = 0;
    used.forEach((sp, i) => {
      const amt = (i === used.length - 1)
        ? Math.round((amount - allocated) * 100) / 100
        : Math.round(((parseFloat(sp.amount) || 0) / splitTotal) * amount * 100) / 100;
      allocated += amt;
      rows.push({ name: nameOf(sp.accountId), amount: amt });
    });
    const usable = rows.filter(r => r.amount > 0);
    return usable.length ? usable : [{ name: nameOf(used[0].accountId), amount }];
  }
  window.getPreInvoiceAdvanceReceiptRows = getPreInvoiceAdvanceReceiptRows;

  // ── Advance Payment box for Sales Order / Delivery Challan ──
  // Same look and behaviour as the Proforma Invoice one: no status buttons; the status
  // follows the Advance Amount (nothing = Not Paid, the Grand Total = Full, between =
  // Partial), the amount can't pass the Grand Total, and the Payment Account list offers
  // Multi Payment to split the advance across cash & cash-equivalent accounts.
  // `prefix` is the element id prefix ('order' → orderPaymentAccount, orderPaymentAmount,
  // orderMultiPaymentSummary); `getGrandTotal` returns the form's current Grand Total;
  // `onAmountChange` lets the form recalculate after the amount is edited.
  function createPreInvoiceAdvanceBox(prefix, getGrandTotal, onAmountChange) {
    const MULTI = 'multi-payment';
    const $ = name => document.getElementById(prefix + name);
    let splits = [];
    let prevAccount = '';

    function cashAccounts() {
      let accounts = (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers))
        ? coaLedgers.filter(l => l.type === 'ledger' && l.sgId === 'sg-cce')
        : [];
      if (accounts.length === 0 && typeof getOrCreateSystemLedger === 'function') {
        getOrCreateSystemLedger('Cash Account', 'sg-cce');
        getOrCreateSystemLedger('Bank Account', 'sg-cce');
        accounts = coaLedgers.filter(l => l.type === 'ledger' && l.sgId === 'sg-cce');
      }
      return accounts;
    }

    function populateAccounts(selectedId) {
      const select = $('PaymentAccount');
      if (!select) return;
      select.innerHTML = '<option value="">&mdash; Select &mdash;</option>';
      cashAccounts().forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = a.name;
        if (selectedId && String(a.id) === String(selectedId)) opt.selected = true;
        select.appendChild(opt);
      });
      const multiOpt = document.createElement('option');
      multiOpt.value = MULTI;
      multiOpt.textContent = 'Multi Payment';
      if (String(selectedId) === MULTI) multiOpt.selected = true;
      select.appendChild(multiOpt);
    }

    function isMulti() {
      const select = $('PaymentAccount');
      return !!select && select.value === MULTI;
    }

    function getAdvance() {
      return parseFloat($('PaymentAmount')?.value) || 0;
    }

    // The advance entered, never above the Grand Total — what Multi Payment has to split
    function getTarget() {
      const total = getGrandTotal();
      const advance = getAdvance();
      return (total > 0) ? Math.min(advance, total) : advance;
    }

    function getStatus() {
      const advance = getAdvance();
      if (advance <= 0) return 'Not Paid';
      const total = getGrandTotal();
      return (total > 0 && advance >= total - 0.01) ? 'Full Payment' : 'Partial Payment';
    }

    function getSplits() {
      if (!isMulti()) return [];
      return splits
        .filter(s => s.accountId && (parseFloat(s.amount) || 0) > 0)
        .map(s => ({ accountId: s.accountId, amount: parseFloat(s.amount) || 0 }));
    }

    // Compact recap under the Payment Account dropdown; click it to reopen the split
    function updateSummary() {
      const btn = $('MultiPaymentSummary');
      if (!btn) return;
      if (!isMulti()) { btn.style.display = 'none'; return; }
      const used = splits.filter(s => s.accountId && (parseFloat(s.amount) || 0) > 0);
      const allocated = used.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
      const balanced = Math.abs(getTarget() - allocated) < 0.01;
      const fmt = n => (typeof fmtNum === 'function') ? fmtNum(n) : n.toFixed(2);
      btn.style.display = 'flex';
      btn.innerHTML = used.length
        ? `<span>${used.length} account${used.length > 1 ? 's' : ''} &middot; <span style="color:${balanced ? '#059669' : '#dc2626'}">₹ ${fmt(allocated)}</span></span><span style="color:var(--blue-600);">Edit</span>`
        : `<span style="color:#dc2626;">No accounts selected</span><span style="color:var(--blue-600);">Set up</span>`;
    }

    function openSplit() {
      if (typeof window.openMultiPaymentModal !== 'function') return;
      window.openMultiPaymentModal({
        typeLabel: 'Advance',
        getTarget,
        getAccounts: cashAccounts,
        splits,
        onSave: rows => { splits = rows; updateSummary(); },
        onCancel: () => {
          // Nothing saved yet? Fall back to the account picked before Multi Payment.
          if (splits.length === 0) {
            const select = $('PaymentAccount');
            if (select) select.value = prevAccount || '';
          }
          updateSummary();
        }
      });
    }

    function clearSplits() {
      splits = [];
      if (typeof window.closeMultiPaymentModal === 'function') window.closeMultiPaymentModal();
    }

    // Fill the box from a saved document, or clear it for a new one
    function load(doc) {
      clearSplits();
      populateAccounts(doc ? doc.paymentAccountId : null);
      splits = (doc && Array.isArray(doc.paymentSplits) ? doc.paymentSplits : []).map(s => ({
        accountId: s.accountId ? String(s.accountId) : '',
        amount: (s.amount || s.amount === 0) ? String(s.amount) : ''
      }));
      prevAccount = (doc && doc.paymentAccountId) || '';
      const select = $('PaymentAccount');
      if (select && !doc) select.value = '';
      const amtEl = $('PaymentAmount');
      if (amtEl) {
        amtEl.value = !doc ? ''
          : (doc.paymentStatus === 'Full Payment' ? (doc.paymentAmount || doc.total || '') : (doc.paymentAmount || ''));
      }
      updateSummary();
    }

    // Called from the form's total recalculation: the advance can never exceed the Grand Total
    function clampToTotal(total) {
      const amtEl = $('PaymentAmount');
      if (!amtEl) return;
      amtEl.max = total > 0 ? total : '';
      if (amtEl.value && total > 0 && (parseFloat(amtEl.value) || 0) > total) amtEl.value = total.toFixed(2);
    }

    // Payment fields for the saved document
    function read(total) {
      const accountId = $('PaymentAccount')?.value || '';
      let accountName = '';
      if (accountId === MULTI) {
        accountName = 'Multi Payment';
      } else if (accountId && typeof coaLedgers !== 'undefined') {
        const acc = coaLedgers.find(l => String(l.id) === String(accountId));
        if (acc) accountName = acc.name;
      }
      const advance = getAdvance();
      return {
        paymentStatus: getStatus(),
        paymentAccountId: accountId,
        paymentAccountName: accountName,
        paymentAmount: (total > 0) ? Math.min(advance, total) : advance,
        paymentSplits: getSplits()
      };
    }

    // Returns a message when the advance can't be saved as entered, '' when it can
    function validate(data) {
      if (data.paymentStatus === 'Not Paid') return '';
      if (!data.paymentAccountId) return 'Please select a Payment Account for the advance payment.';
      if (data.paymentAccountId !== MULTI) return '';
      const used = data.paymentSplits || [];
      if (used.length === 0) return 'Please set up the Multi Payment split for this advance.';
      if (used.some((sp, i) => used.findIndex(o => String(o.accountId) === String(sp.accountId)) !== i)) {
        return 'Each Multi Payment account can be selected only once.';
      }
      const splitTotal = used.reduce((sum, sp) => sum + sp.amount, 0);
      if (Math.abs(splitTotal - data.paymentAmount) > 0.01) {
        const fmt = n => (typeof fmtNum === 'function') ? fmtNum(n) : n.toFixed(2);
        return `Multi Payment split of ₹${fmt(splitTotal)} must equal the advance of ₹${fmt(data.paymentAmount)}.`;
      }
      return '';
    }

    function receiptRows(data, amount) {
      return getPreInvoiceAdvanceReceiptRows(data, amount);
    }

    function wire() {
      const select = $('PaymentAccount');
      if (select) {
        select.addEventListener('focus', () => {
          prevAccount = select.value;
          populateAccounts(select.value);
        });
        select.addEventListener('change', () => {
          if (select.value === MULTI) {
            openSplit();
          } else {
            clearSplits();
            prevAccount = select.value;
          }
          updateSummary();
        });
      }

      const summaryBtn = $('MultiPaymentSummary');
      if (summaryBtn) summaryBtn.addEventListener('click', openSplit);

      const amtEl = $('PaymentAmount');
      if (amtEl) {
        amtEl.addEventListener('input', () => {
          const total = getGrandTotal();
          if (total > 0 && getAdvance() > total) {
            amtEl.value = total.toFixed(2);
            const fmt = n => (typeof fmtNum === 'function') ? fmtNum(n) : n.toFixed(2);
            if (typeof showToast === 'function') showToast(`Advance Amount adjusted to ₹${fmt(total)} to not exceed the Grand Total.`, 'warning');
          }
          if (typeof onAmountChange === 'function') onAmountChange();
          // The advance is what the split has to add up to, so keep both views current
          if (typeof window.isMultiPaymentModalOpen === 'function' && window.isMultiPaymentModalOpen()) {
            window.updateMultiPaymentModalTotals();
          }
          updateSummary();
        });
      }
    }

    return { wire, load, clampToTotal, read, validate, receiptRows, updateSummary };
  }

  window.createPreInvoiceAdvanceBox = createPreInvoiceAdvanceBox;
  window.getPreInvoiceAdvanceCreditLedgerName = getPreInvoiceAdvanceCreditLedgerName;
  window.postPreInvoiceAdvanceEntry = postPreInvoiceAdvanceEntry;
  window.removePreInvoiceAdvanceEntry = removePreInvoiceAdvanceEntry;

  function isSalesReturnInvoiceSelected() {
    if (currentSalesVoucherSubtype !== 'Return') return false;
    const triggerText = document.getElementById('salesInvoiceSelectTriggerText');
    return triggerText && triggerText.textContent !== 'Select Invoice';
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
    if (!triggerText || triggerText.textContent === 'Select Invoice') return null;
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

  // ── Advance carried in from a Pre Invoice (Proforma / Sales Order / Delivery Challan) ──
  // The advance already received: from the conversion in progress, or stored on the
  // invoice being edited. Never applies to a Sales Reversal.
  function getSalesLinkedAdvance() {
    if (currentSalesVoucherSubtype === 'Return') return { amount: 0, voucherNo: '' };
    const pending = window._pendingConvertProformaAdvance;
    if (pending && (parseFloat(pending.amount) || 0) > 0) {
      return { amount: parseFloat(pending.amount) || 0, voucherNo: pending.voucherNo || '' };
    }
    const editing = window._editingSalesInvoice;
    if (editing && editing.id && window.KYA_STORE) {
      const inv = (window.KYA_STORE.salesVouchers || []).concat(window.KYA_STORE.salesVouchersDrafts || [])
        .find(v => String(v.id) === String(editing.id));
      if (inv && (parseFloat(inv.advancePaidAmount) || 0) > 0) {
        return { amount: parseFloat(inv.advancePaidAmount) || 0, voucherNo: inv.advanceVoucherNo || '' };
      }
    }
    return { amount: 0, voucherNo: '' };
  }

  // The part of the advance this invoice uses — never more than its Grand Total
  function getSalesAdvanceApplied(total) {
    const adv = getSalesLinkedAdvance().amount;
    return Math.max(0, Math.min(adv, parseFloat(total) || 0));
  }

  // Advance received above the invoice value. While there is one, the Payment Status
  // buttons work as Not Refunded / Full Refund / Partial Refund for that excess.
  function getSalesAdvanceExcess(total) {
    const adv = getSalesLinkedAdvance().amount;
    const excess = Math.round((adv - (parseFloat(total) || 0)) * 100) / 100;
    return excess > 0.01 ? excess : 0;
  }

  // Whether the invoice's party exists only as a Trade Receivables ledger
  function isSalesPartyLedgerOnly() {
    const id = document.getElementById('salesCustomer')?.value;
    const party = (id && typeof findPartyById === 'function') ? findPartyById(id, 'Customer') : null;
    return typeof isKyaLedgerParty === 'function' && isKyaLedgerParty(party);
  }

  // What happens to the excess advance, from the form's refund status and amount
  function toSalesAdvanceRefund(paymentStatus, paymentAmount, total, accountId, splits) {
    const excess = getSalesAdvanceExcess(total);
    if (excess <= 0) return null;
    const amount = paymentStatus === 'Not Paid' ? 0 : Math.min(parseFloat(paymentAmount) || 0, excess);
    return {
      excess,
      status: amount <= 0 ? 'Not Refunded' : (amount >= excess - 0.01 ? 'Full Refund' : 'Partial Refund'),
      amount: Math.round(amount * 100) / 100,
      accountId: amount > 0 ? accountId : '',
      splits: amount > 0 && Array.isArray(splits) ? splits : []
    };
  }

  // Wording for the "amount adjusted" / "cannot exceed" messages
  function getSalesPaymentLimitMessage(maxVal, total, adjusted) {
    const fmt = n => (typeof fmtNum === 'function') ? fmtNum(n) : n.toFixed(2);
    if (currentSalesVoucherSubtype !== 'Return' && getSalesAdvanceExcess(total) > 0) {
      return adjusted
        ? `Refund Amount adjusted to ₹${fmt(maxVal)} to not exceed the excess advance.`
        : `Refund Amount cannot exceed the excess advance of ₹${fmt(maxVal)}.`;
    }
    if (currentSalesVoucherSubtype !== 'Return' && getSalesLinkedAdvance().amount > 0) {
      return adjusted
        ? `Payment Amount adjusted to ₹${fmt(maxVal)} to not exceed the balance after the advance.`
        : `Payment Amount cannot exceed the balance of ₹${fmt(maxVal)} after the advance.`;
    }
    return adjusted
      ? `Payment Amount adjusted to ₹${fmt(maxVal)} to not exceed the Grand Total.`
      : `Payment Amount cannot exceed the Grand Total of ₹${fmt(maxVal)}.`;
  }

  // With an advance, the Payment Status and Amount on the form describe the balance only;
  // the invoice stores the full amount received (advance + this payment), which is what
  // the payment journal entry and the customer statement read.
  function toStoredSalesPayment(paymentStatus, paymentAmount, total) {
    const applied = getSalesAdvanceApplied(total);
    if (applied <= 0) return { paymentStatus, paymentAmount };
    const received = Math.round((applied + (parseFloat(paymentAmount) || 0)) * 100) / 100;
    return {
      paymentStatus: received >= (parseFloat(total) || 0) - 0.01 ? 'Full Payment' : 'Partial Payment',
      paymentAmount: received
    };
  }

  // The advance / balance popup appears only while the pointer (or focus) is in the
  // Payment Status box, and only when the invoice carries an advance
  function wireSalesAdvanceHover() {
    const payBox = document.getElementById('salesPaymentBox');
    const box = document.getElementById('salesAdvanceInfo');
    if (!payBox || !box || payBox._advHoverWired) return;
    payBox._advHoverWired = true;
    const show = () => { if (box.dataset.active === '1') box.style.display = 'block'; };
    const hide = () => { box.style.display = 'none'; };
    payBox.addEventListener('mouseenter', show);
    payBox.addEventListener('mouseleave', hide);
    payBox.addEventListener('focusin', show);
    payBox.addEventListener('focusout', e => { if (!payBox.contains(e.relatedTarget)) hide(); });
  }

  // Advance / balance popup content for the Payment Status box; Full & Partial are off
  // once the advance covers the whole invoice
  function updateSalesAdvanceInfo(total) {
    const box = document.getElementById('salesAdvanceInfo');
    if (!box) return;
    wireSalesAdvanceHover();
    const t = (typeof total === 'number') ? total
      : (typeof getSalesGrandTotalForPayment === 'function' ? getSalesGrandTotalForPayment() : 0);
    const adv = getSalesLinkedAdvance();
    const fullBtn = document.getElementById('salesPaymentStatusFull');
    const partBtn = document.getElementById('salesPaymentStatusPartial');
    const setLocked = (btn, locked) => {
      if (!btn) return;
      btn.disabled = locked;
      btn.style.cursor = locked ? 'not-allowed' : '';
      btn.style.opacity = locked ? '0.5' : '';
    };

    if (currentSalesVoucherSubtype !== 'Return') setSalesPaymentLabels(getSalesAdvanceExcess(t) > 0);

    if (adv.amount <= 0) {
      box.dataset.active = '0';
      box.style.display = 'none';
      box.innerHTML = '';
      if (currentSalesVoucherSubtype !== 'Return') { setLocked(fullBtn, false); setLocked(partBtn, false); }
      return;
    }

    const applied = Math.min(adv.amount, t);
    const balance = Math.max(0, t - applied);
    const excess = getSalesAdvanceExcess(t);
    const fmt = n => (typeof fmtNum === 'function') ? fmtNum(n) : n.toFixed(2);
    const row = (label, value, strong) => `<div style="display: flex; justify-content: space-between; gap: 10px; margin-top: 2px;"><span>${label}</span>${strong ? `<strong>${value}</strong>` : `<span>${value}</span>`}</div>`;
    box.dataset.active = '1';
    box.innerHTML = `
      ${row(`Advance received${adv.voucherNo ? ` <span style="font-family: monospace; font-weight: 700;">[${adv.voucherNo}]</span>` : ''}`, `₹ ${fmt(adv.amount)}`, true)}
      ${excess > 0 ? `
        ${row('Invoice total', `₹ ${fmt(t)}`)}
        ${row('Excess advance', `₹ ${fmt(excess)}`, true)}
        <div style="margin-top: 4px; font-weight: 500;">Refund it below; any part not refunded ${isSalesPartyLedgerOnly() ? "stays in the party's ledger" : 'goes to Refund Payable'}.</div>`
      : `
        ${row('Balance due', `₹ ${fmt(balance)}`, true)}
        ${balance <= 0.01
          ? '<div style="margin-top: 4px; font-weight: 500;">Fully paid by the advance — no further payment needed.</div>'
          : '<div style="margin-top: 4px; font-weight: 500;">Payment below is for the balance only.</div>'}`}`;

    // Exactly paid by the advance: nothing to pay or refund, only "Not Paid" applies
    const settled = balance <= 0.01 && excess <= 0;
    if (settled) {
      const notPaidBtn = document.getElementById('salesPaymentStatusNotPaid');
      if (notPaidBtn && !notPaidBtn.classList.contains('active')) notPaidBtn.click();
    }
    setLocked(fullBtn, settled);
    setLocked(partBtn, settled);
  }

  // Payment Status ⇄ Refund Status wording on a Sales Invoice
  function setSalesPaymentLabels(refundMode) {
    const set = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };
    set(document.getElementById('salesPaymentStatusLabel'), refundMode ? 'Refund Status' : 'Payment Status');
    set(document.getElementById('salesPaymentStatusNotPaid'), refundMode ? 'Not Refunded' : 'Not Paid');
    set(document.getElementById('salesPaymentStatusFull'), refundMode ? 'Full Refund' : 'Full Payment');
    set(document.getElementById('salesPaymentStatusPartial'), refundMode ? 'Partial Refund' : 'Partial Payment');
    set(document.querySelector('#salesPaymentAmountField label'), refundMode ? 'Refund Amount *' : 'Payment Amount *');
    set(document.querySelector('#salesPaymentAccountField label'), refundMode ? 'Refund Account *' : 'Payment Account *');
  }

  // After an invoice is loaded: turn its stored payment (advance + payment) back into the
  // balance-only view the form shows
  function applySalesAdvanceToPaymentUI(inv) {
    const adv = getSalesLinkedAdvance();
    if (!inv || adv.amount <= 0) { updateSalesAdvanceInfo(); return; }

    const total = parseFloat(inv.total) || 0;
    const notPaid = document.getElementById('salesPaymentStatusNotPaid');
    const payAmt = document.getElementById('salesPaymentAmount');

    // Advance above the invoice value: restore the refund choice made for the excess
    if (getSalesAdvanceExcess(total) > 0) {
      const refund = inv.advanceRefund;
      if (typeof resetSalesMultiPayments === 'function') resetSalesMultiPayments();
      if (refund && refund.amount > 0) {
        document.getElementById(refund.status === 'Full Refund' ? 'salesPaymentStatusFull' : 'salesPaymentStatusPartial')?.click();
        if (typeof populateSalesPaymentAccounts === 'function') populateSalesPaymentAccounts(refund.accountId);
        if (refund.accountId === 'multi-payment' && typeof setSalesMultiPayments === 'function') setSalesMultiPayments(refund.splits || []);
        if (payAmt) payAmt.value = refund.status === 'Partial Refund' ? Number(refund.amount).toFixed(2) : '';
      } else {
        if (notPaid) notPaid.click();
        if (typeof populateSalesPaymentAccounts === 'function') populateSalesPaymentAccounts('');
        if (payAmt) payAmt.value = '';
      }
      if (typeof updateSalesMultiPaymentUI === 'function') updateSalesMultiPaymentUI();
      updateSalesAdvanceInfo(total);
      return;
    }

    const stored = inv.paymentStatus === 'Full Payment'
      ? ((parseFloat(inv.paymentAmount) || 0) > 0 ? parseFloat(inv.paymentAmount) : total)
      : (inv.paymentStatus === 'Partial Payment' ? (parseFloat(inv.paymentAmount) || 0) : 0);
    const applied = Math.min(adv.amount, total);
    const further = Math.max(0, Math.round((stored - applied) * 100) / 100);
    const balance = Math.max(0, total - applied);

    const notPaidBtn = document.getElementById('salesPaymentStatusNotPaid');
    const fullBtn = document.getElementById('salesPaymentStatusFull');
    const partBtn = document.getElementById('salesPaymentStatusPartial');
    const payAmtEl = document.getElementById('salesPaymentAmount');

    if (further <= 0) {
      if (notPaidBtn) notPaidBtn.click();
      // The Pre Invoice's account / split described the advance, not a new payment
      if (typeof resetSalesMultiPayments === 'function') resetSalesMultiPayments();
      if (typeof populateSalesPaymentAccounts === 'function') {
        populateSalesPaymentAccounts(inv.paymentAccountId === 'multi-payment' ? '' : inv.paymentAccountId);
      }
      if (payAmtEl) payAmtEl.value = '';
    } else if (further >= balance - 0.01) {
      if (fullBtn) fullBtn.click();
    } else {
      if (partBtn) partBtn.click();
      if (payAmtEl) payAmtEl.value = further.toFixed(2);
    }
    if (typeof updateSalesMultiPaymentUI === 'function') updateSalesMultiPaymentUI();
    updateSalesAdvanceInfo(total);
  }

  window.getSalesLinkedAdvance = getSalesLinkedAdvance;
  window.toStoredSalesPayment = toStoredSalesPayment;
  window.updateSalesAdvanceInfo = updateSalesAdvanceInfo;
  window.applySalesAdvanceToPaymentUI = applySalesAdvanceToPaymentUI;
  window.getSalesAdvanceExcess = getSalesAdvanceExcess;
  window.toSalesAdvanceRefund = toSalesAdvanceRefund;
  window.getSalesPaymentLimitMessage = getSalesPaymentLimitMessage;

  function getSalesPaymentMax(total) {
    let maxVal = total;
    if (currentSalesVoucherSubtype !== 'Return') {
      // With an advance, only the balance is left to pay — or, when the advance is more
      // than the invoice, only the excess can be refunded
      const excess = getSalesAdvanceExcess(total);
      maxVal = excess > 0 ? excess : Math.max(0, total - getSalesAdvanceApplied(total));
    }
    if (currentSalesVoucherSubtype === 'Return') {
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

    if (currentSalesVoucherSubtype === 'Return') {
      payNotPaidBtn.textContent = 'No Refund';
      payFullBtn.textContent = `Full Refund (₹${fmtNum(maxVal)})`;
      payPartialBtn.textContent = 'Partial Refund';
      
      const payAmtEl = document.getElementById('salesPaymentAmount');
      if (payAmtEl) {
        payAmtEl.max = maxVal;
      }
    } else {
      // Refund wording while the advance is more than the invoice
      setSalesPaymentLabels(getSalesAdvanceExcess(total) > 0);
    }

    if (typeof updateSalesMultiPaymentUI === 'function') updateSalesMultiPaymentUI();
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

  function getSalesTdsTcsMode() {
    const tdsBtn = document.getElementById('salesTdsTcsTds');
    const tcsBtn = document.getElementById('salesTdsTcsTcs');
    if (tdsBtn && tdsBtn.classList.contains('active')) return 'TDS';
    if (tcsBtn && tcsBtn.classList.contains('active')) return 'TCS';
    return 'None';
  }

  function getSalesTdsTcsRate() {
    const mode = getSalesTdsTcsMode();
    if (mode === 'None') return 0;
    const rateSelect = document.getElementById('salesTdsTcsRateSelect');
    if (!rateSelect) return 0;
    if (rateSelect.value === 'custom') {
      const customInput = document.getElementById('salesTdsTcsRateCustom');
      return customInput ? (parseFloat(customInput.value) || 0) : 0;
    }
    return parseFloat(rateSelect.value) || 0;
  }

  function getSalesTdsTcsAmount(subTotal) {
    const mode = getSalesTdsTcsMode();
    if (mode === 'None') return 0;
    const amtInput = document.getElementById('salesTdsTcsAmount');
    if (amtInput && amtInput.value.trim() !== '') {
      return parseFloat(amtInput.value) || 0;
    }
    const rate = getSalesTdsTcsRate();
    const st = (typeof subTotal === 'number') ? subTotal : (typeof calculateSubtotal === 'function' ? calculateSubtotal() : 0);
    return Math.round(st * (rate / 100) * 100) / 100;
  }

  // Initialize store for future features
  if (!window.KYA_STORE) {
    window.KYA_STORE = {};
  }
  window.KYA_STORE.salesVouchers = window.KYA_STORE.salesVouchers || [];
  window.KYA_STORE.salesVouchersDrafts = window.KYA_STORE.salesVouchersDrafts || [];
  window.KYA_STORE.salesInvoiceCtr = window.KYA_STORE.salesInvoiceCtr || 1;
  window.KYA_STORE.salesReturnCtr = window.KYA_STORE.salesReturnCtr || 1;

  window.getSalesTdsTcsMode = getSalesTdsTcsMode;
  window.getSalesTdsTcsRate = getSalesTdsTcsRate;
  window.getSalesTdsTcsAmount = getSalesTdsTcsAmount;
