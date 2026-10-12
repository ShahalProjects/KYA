// ══════════════════════════════════════════════════════════════════
//  PURCHASE POSTING — the journal entries of a posted Purchase Voucher, the mirror of a
//  Sales Invoice's linked entries (sales-posting.js):
//    • Purchase entry (the Purchase / Bill No.) ... Dr Purchase (stock item / product lines)
//        or the line's own Expense ledger, Dr Input CGST + SGST / Input IGST, Dr TCS
//        Receivable (TCS the supplier collected), round off to Adjustments Account;
//        Cr Vendor with the full bill value
//    • TDS entry (JV-…) ..... Dr Vendor; Cr TDS Payable — the TDS deducted from the bill
//    • Payment entry (JV-…) . Dr Vendor; Cr Cash / Bank (or each Multi Payment account)
//  A cash purchase (a Cash and Cash Equivalents ledger as the vendor) is paid in the
//  purchase entry itself, so it has no payment entry — as a cash sale has no receipt.
//  The entries are derived from the stored vouchers: a restore drops them and
//  rebuildPurchaseJournalEntries() puts them back after every load (vault-settings.js).
// ══════════════════════════════════════════════════════════════════
(function() {
  'use strict';

  const r2 = n => Math.round((parseFloat(n) || 0) * 100) / 100;
  const fmt = n => (typeof fmtNum === 'function') ? fmtNum(n) : r2(n).toFixed(2);

  // One line's figures. The Amount on the line is what was billed (it may have been typed
  // in directly), so the taxable value is taken back out of it — taxable + GST always add
  // up to the line amount, and the entry always balances.
  function getPurchaseLineFigures(row) {
    const qty = parseFloat(row && row.qty) || 0;
    const rate = parseFloat(row && row.rate) || 0;
    const gross = qty * rate;
    const disc = parseFloat(row && row.discount) || 0;
    const discAmt = (row && row.discountType === 'pct') ? gross * (disc / 100) : disc;
    const taxPct = parseFloat(row && row.tax) || 0;
    const amount = parseFloat(row && row.amount) || 0;
    let taxable = Math.max(0, gross - discAmt);
    let total = taxable * (1 + taxPct / 100);
    if (amount > 0) {
      total = amount;
      taxable = amount / (1 + taxPct / 100);
    }
    taxable = r2(taxable);
    total = r2(total);
    return { qty, rate, gross: r2(gross), discAmt: r2(discAmt), taxable, taxPct, taxAmt: r2(total - taxable), total };
  }

  // GST split by supply type — the same rules the Sales Invoice and the GST reports use
  function getPurchaseTaxMode(supplyType) {
    const t = supplyType || 'Intra-State (CGST + SGST)';
    if (t === 'Intra-State (CGST + SGST)' || t === 'Deemed Export') return 'split';
    if (t === 'Inter-State (IGST)' || t === 'SEZ With Tax') return 'igst';
    return 'none';
  }

  function ledgerNameOf(name, sgId) {
    const id = (typeof getOrCreateSystemLedger === 'function') ? getOrCreateSystemLedger(name, sgId) : null;
    const l = (typeof coaLedgers !== 'undefined' ? coaLedgers : []).find(x => x.id == id);
    return (l && l.name) || name;
  }

  // The vendor: a supplier from the master, a Trade Payables ledger, or a Cash and Cash
  // Equivalents ledger (a cash purchase)
  function getPurchaseParty(v) {
    const id = v && v.vendorId;
    if (!id) return null;
    const supp = (typeof getKyaSuppliers === 'function') ? getKyaSuppliers().find(s => String(s.id) === String(id)) : null;
    if (supp) return supp;
    return (typeof coaLedgers !== 'undefined' ? coaLedgers : []).find(l => String(l.id) === String(id)) || null;
  }

  function getPurchaseVendorName(v) {
    const party = getPurchaseParty(v);
    return (party && party.name) || (v && v.vendorName) || 'Supplier';
  }

  function isPurchaseCashVendor(v) {
    const party = getPurchaseParty(v);
    return !!party && party.type === 'ledger' && party.sgId === 'sg-cce';
  }

  // The debit lines: each line's own Expense ledger, or Purchase for stock items / products
  function getPurchaseDebitLines(v) {
    const ledgers = (typeof coaLedgers !== 'undefined' ? coaLedgers : []);
    const lines = [];
    (v.rows || []).forEach(r => {
      const amt = getPurchaseLineFigures(r).taxable;
      if (amt <= 0) return;
      const own = r.expenseLedgerId
        ? ledgers.find(l => l.type !== 'group-ledger' && String(l.id) === String(r.expenseLedgerId))
        : null;
      const name = (own && own.name) || ledgerNameOf('Purchase', 'sg-pst');
      const line = lines.find(x => x.name.trim().toLowerCase() === name.trim().toLowerCase());
      if (line) line.amount = r2(line.amount + amt);
      else lines.push({ name, amount: amt });
    });
    return lines;
  }

  // The account(s) the payment went out of: one account, or each Multi Payment row
  function getPurchasePaymentRows(v, amount) {
    const ledgers = (typeof coaLedgers !== 'undefined' ? coaLedgers : []);
    const nameOf = id => ((ledgers.find(l => String(l.id) === String(id)) || {}).name) || 'Cash Account';
    const splits = (Array.isArray(v.paymentSplits) ? v.paymentSplits : [])
      .filter(sp => sp && sp.accountId && (parseFloat(sp.amount) || 0) > 0);
    const splitTotal = splits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0);
    if (String(v.paymentAccountId) !== 'multi-payment' || splitTotal <= 0) {
      return [{ name: nameOf(v.paymentAccountId), amount: r2(amount) }];
    }
    const rows = [];
    let allocated = 0;
    splits.forEach((sp, i) => {
      const amt = (i === splits.length - 1)
        ? r2(amount - allocated)
        : r2(((parseFloat(sp.amount) || 0) / splitTotal) * amount);
      allocated = r2(allocated + amt);
      if (amt > 0) rows.push({ name: nameOf(sp.accountId), amount: amt });
    });
    return rows.length ? rows : [{ name: nameOf(splits[0].accountId), amount: r2(amount) }];
  }

  function getPurchasePaidAmount(v) {
    if (v.paymentStatus === 'Full Payment') {
      const stored = parseFloat(v.paymentAmount) || 0;
      return r2(stored > 0 ? stored : v.total);
    }
    if (v.paymentStatus === 'Partial Payment') return r2(v.paymentAmount);
    return 0;
  }

  // The purchase entry's voucher number: the Purchase / Bill No. itself
  function getPurchaseEntryNo(v) {
    const no = String(v.invoiceNo || '').trim();
    return (no.startsWith('PUR-') || no.startsWith('PV-')) ? no : `PV-${no}`;
  }

  function nextJvNo(date) {
    if (typeof getNextJournalVoucherNo === 'function') return getNextJournalVoucherNo(date);
    return `JV-${String(date || '').slice(0, 4) || new Date().getFullYear()}-001`;
  }

  function postPurchaseVoucherToJournal(v, options) {
    if (!v || typeof postedEntries === 'undefined') return null;
    const silent = !!(options && options.silent);

    const vendorName = getPurchaseVendorName(v);
    const cashPurchase = isPurchaseCashVendor(v);
    const tdsAmt = (v.tdsTcsMode === 'TDS' && parseFloat(v.tdsTcsAmount) > 0) ? r2(v.tdsTcsAmount) : 0;
    const tcsAmt = (v.tdsTcsMode === 'TCS' && parseFloat(v.tdsTcsAmount) > 0) ? r2(v.tdsTcsAmount) : 0;
    const adjAmt = r2(v.adjustments);
    // The full bill value: what is owed to the supplier before the TDS deducted from it
    const grossPayable = r2((parseFloat(v.total) || 0) + tdsAmt);
    const paidAmount = getPurchasePaidAmount(v);

    let execText = '';
    if (v.executiveId && typeof ohEmployees !== 'undefined') {
      const emp = ohEmployees.find(e => e.id == v.executiveId);
      if (emp) execText = ` Purchaser: ${emp.name}.`;
    }

    // ── Purchase entry ────────────────────────────────────────────
    const rows = [];
    const add = (type, particular, amount) => {
      const amt = r2(amount);
      if (amt <= 0) return;
      rows.push({ id: rows.length + 1, type, particular, debit: type === 'By' ? amt.toFixed(2) : '', credit: type === 'To' ? amt.toFixed(2) : '' });
    };
    getPurchaseDebitLines(v).forEach(line => add('By', line.name, line.amount));

    const gst = r2((v.rows || []).reduce((s, r) => s + getPurchaseLineFigures(r).taxAmt, 0));
    if (gst > 0) {
      const mode = getPurchaseTaxMode(v.supplyType);
      if (mode === 'split') {
        const cgst = r2(gst / 2);
        add('By', ledgerNameOf('Input CGST', 'sg-oca'), cgst);
        add('By', ledgerNameOf('Input SGST', 'sg-oca'), r2(gst - cgst));
      } else {
        // IGST — inter-state, SEZ with tax, and any tax charged on an import
        add('By', ledgerNameOf('Input IGST', 'sg-oca'), gst);
      }
    }
    if (tcsAmt > 0) add('By', ledgerNameOf('TCS Receivable', 'sg-oca'), tcsAmt);
    if (adjAmt > 0) add('By', ledgerNameOf('Adjustments Account', 'sg-oe'), adjAmt);
    add('To', vendorName, grossPayable);
    if (adjAmt < 0) add('To', ledgerNameOf('Adjustments Account', 'sg-oe'), -adjAmt);

    const purchaseJEId = v.journalEntryId || Date.now();
    const purchaseEntry = {
      id: purchaseJEId,
      date: v.date,
      voucherNo: getPurchaseEntryNo(v),
      preparedBy: 'Purchase Module',
      departmentId: '',
      isBudget: false,
      firstParticular: vendorName,
      amount: fmt(grossPayable),
      allRows: rows,
      narration: `${cashPurchase ? `Cash purchase — Purchase No. ${v.invoiceNo} paid in full from ${vendorName}.` : `Purchase No. ${v.invoiceNo} posted for supplier ${vendorName}.`}${execText} ${v.notes || ''}`.trim(),
      jeType: 'purchase',
      vendorId: v.vendorId,
      vendorName,
      partyName: vendorName
    };
    const idx = postedEntries.findIndex(e => String(e.id) === String(purchaseJEId));
    if (idx > -1) postedEntries[idx] = purchaseEntry;
    else postedEntries.unshift(purchaseEntry);

    // Keeps a linked entry's id and JV number across edits; drops it when no longer needed
    const placeLinkedEntry = (oldId, oldNo, fallbackId, build) => {
      const prev = oldId ? postedEntries.find(e => String(e.id) === String(oldId)) : null;
      if (oldId) postedEntries = postedEntries.filter(e => String(e.id) !== String(oldId));
      if (!build) return { id: '', voucherNo: '' };
      const id = oldId || fallbackId;
      const no = (prev && String(prev.voucherNo || '').startsWith('JV-')) ? prev.voucherNo
        : (oldNo && String(oldNo).startsWith('JV-') ? oldNo : nextJvNo(v.date));
      postedEntries.unshift(Object.assign({
        id, date: v.date, voucherNo: no, preparedBy: 'Purchase Module', departmentId: '', isBudget: false,
        vendorId: v.vendorId, vendorName, partyName: vendorName
      }, build()));
      return { id, voucherNo: no };
    };

    // ── TDS entry: the TDS deducted from the supplier's bill ─────────
    const tdsRes = placeLinkedEntry(v.tdsJournalEntryId, v.tdsVoucherNo, Number(purchaseJEId) + 1, tdsAmt > 0 ? () => {
      const tdsName = ledgerNameOf('TDS Payable', 'sg-ocl');
      return {
        firstParticular: vendorName,
        amount: fmt(tdsAmt),
        allRows: [
          { id: 1, type: 'By', particular: vendorName, debit: tdsAmt.toFixed(2), credit: '' },
          { id: 2, type: 'To', particular: tdsName, debit: '', credit: tdsAmt.toFixed(2) }
        ],
        narration: `TDS deducted from supplier ${vendorName} against Purchase No. ${v.invoiceNo}${v.tdsTcsRate ? ` @ ${v.tdsTcsRate}%` : ''}.`,
        jeType: 'purchase_tds'
      };
    } : null);

    // ── Payment entry: paid to the supplier (none for a cash purchase) ──
    const payRes = placeLinkedEntry(v.paymentJournalEntryId, v.paymentVoucherNo, Number(purchaseJEId) + 2, (paidAmount > 0 && !cashPurchase) ? () => {
      const payRows = getPurchasePaymentRows(v, paidAmount);
      return {
        firstParticular: vendorName,
        amount: fmt(paidAmount),
        allRows: [{ id: 1, type: 'By', particular: vendorName, debit: paidAmount.toFixed(2), credit: '' }]
          .concat(payRows.map((p, i) => ({ id: i + 2, type: 'To', particular: p.name, debit: '', credit: p.amount.toFixed(2) }))),
        narration: `Payment made to supplier ${vendorName} against Purchase No. ${v.invoiceNo}. Status: ${v.paymentStatus}.`,
        jeType: 'purchase_payment'
      };
    } : null);

    window.postedEntries = postedEntries;
    if (!silent && typeof refreshAllReports === 'function') refreshAllReports();
    return {
      purchaseJEId,
      tdsJEId: tdsRes.id, tdsVoucherNo: tdsRes.voucherNo,
      paymentJEId: payRes.id, paymentVoucherNo: payRes.voucherNo
    };
  }

  // Takes a purchase out of the books (the voucher is being deleted)
  function removePurchaseJournalEntries(v) {
    if (!v || typeof postedEntries === 'undefined') return;
    const ids = new Set([v.journalEntryId, v.tdsJournalEntryId, v.paymentJournalEntryId].filter(Boolean).map(String));
    postedEntries = postedEntries.filter(e => !ids.has(String(e.id)));
    window.postedEntries = postedEntries;
  }

  // Purchase entries are derived from the posted vouchers, and a restore drops them (see
  // performRestore), so they are rebuilt here from the vouchers after every load.
  function rebuildPurchaseJournalEntries() {
    if (typeof postedEntries === 'undefined' || !window.KYA_STORE) return;
    const vouchers = (window.KYA_STORE.purchaseVouchers || []).filter(v => v && !v.isDraft);
    const idBase = Date.now();
    // Oldest first, so the newest entry ends up on top like a fresh post
    vouchers.slice().sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))).forEach((v, i) => {
      if (!v.journalEntryId) v.journalEntryId = idBase + i * 3;
      const res = postPurchaseVoucherToJournal(v, { silent: true });
      if (res) {
        v.tdsJournalEntryId = res.tdsJEId || '';
        v.tdsVoucherNo = res.tdsJEId ? res.tdsVoucherNo : '';
        v.paymentJournalEntryId = res.paymentJEId || '';
        v.paymentVoucherNo = res.paymentJEId ? res.paymentVoucherNo : '';
      }
    });
    window.postedEntries = postedEntries;
  }

  // The voucher a purchase journal entry belongs to (any of its three entries)
  function findPurchaseVoucherByEntry(entryId) {
    const id = String(entryId);
    return ((window.KYA_STORE || {}).purchaseVouchers || []).find(v => v && (
      String(v.journalEntryId) === id || String(v.tdsJournalEntryId) === id ||
      String(v.paymentJournalEntryId) === id || String(v.id) === id)) || null;
  }

  window.getPurchaseLineFigures = getPurchaseLineFigures;
  window.getPurchaseTaxMode = getPurchaseTaxMode;
  window.getPurchaseVendorName = getPurchaseVendorName;
  window.getPurchaseParty = getPurchaseParty;
  window.isPurchaseCashVendor = isPurchaseCashVendor;
  window.getPurchasePaidAmount = getPurchasePaidAmount;
  window.postPurchaseVoucherToJournal = postPurchaseVoucherToJournal;
  window.removePurchaseJournalEntries = removePurchaseJournalEntries;
  window.rebuildPurchaseJournalEntries = rebuildPurchaseJournalEntries;
  window.findPurchaseVoucherByEntry = findPurchaseVoucherByEntry;
})();
