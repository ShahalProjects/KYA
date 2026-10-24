// ══════════════════════════════════════════════════════════════════
//  PURCHASE POSTING — the journal entries of a posted Purchase Voucher, the mirror of a
//  Sales Invoice's linked entries (sales-posting.js):
//    • Purchase entry (the Purchase / Bill No.) ... Dr Purchase (stock item / product lines;
//        Raw Material Purchase for raw materials) or the line's own Expense ledger, Dr Input
//        CGST + SGST / Input IGST, Dr TCS Receivable (TCS the supplier collected), round off
//        to Adjustments Account;
//        Cr Vendor with the full bill value
//    • TDS entry (JV-…) ..... Dr Vendor; Cr TDS Payable — the TDS deducted from the bill
//    • Payment entry (JV-…) . Dr Vendor; Cr Cash / Bank (or each Multi Payment account).
//        A purchase made from a Pre Purchase document (purchase-pre.js) sets off the advance
//        paid against it: Cr Advances to Suppliers for that part (a ledger-only vendor's
//        advance is already in its own ledger, so only the balance is posted)
//    • Advance refund (JV-…)  Dr Cash / Bank; Cr Advances to Suppliers (or the vendor's
//        ledger) — the supplier paying back an advance above the bill value; any part not
//        refunded stays as an advance
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

  // The debit lines: each line's own Expense ledger, or Purchase for stock items / products —
  // Raw Material Purchase (Cost of materials consumed) for an item in a raw-material Stock Group.
  // On a reversal they are the credit lines: the Expense ledger, or Purchase Returns / Raw
  // Material Purchase Returns.
  function getPurchaseDebitLines(v) {
    const ledgers = (typeof coaLedgers !== 'undefined' ? coaLedgers : []);
    const lines = [];
    (v.rows || []).forEach(r => {
      const amt = getPurchaseLineFigures(r).taxable;
      if (amt <= 0) return;
      const own = r.expenseLedgerId
        ? ledgers.find(l => l.type !== 'group-ledger' && String(l.id) === String(r.expenseLedgerId))
        : null;
      const rawMaterial = !own && typeof isKyaRawMaterialRow === 'function' && isKyaRawMaterialRow(r);
      const name = (own && own.name) || (rawMaterial
        ? (v.isReturn ? ledgerNameOf('Raw Material Purchase Returns', 'sg-cmc') : ledgerNameOf('Raw Material Purchase', 'sg-cmc'))
        : (v.isReturn ? ledgerNameOf('Purchase Returns', 'sg-pst') : ledgerNameOf('Purchase', 'sg-pst')));
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

  // Paid on a purchase — or, on a reversal, refunded by the supplier
  function getPurchasePaidAmount(v) {
    if (v.paymentStatus === 'Full Payment' || v.paymentStatus === 'Full Refund') {
      const stored = parseFloat(v.paymentAmount) || 0;
      return r2(stored > 0 ? stored : v.total);
    }
    if (v.paymentStatus === 'Partial Payment' || v.paymentStatus === 'Partial Refund') return r2(v.paymentAmount);
    return 0;
  }

  // The purchase entry's voucher number: the Purchase / Bill No. itself; a reversal's is
  // PR-<Reversal No.> (as a Sales Reversal's is SR-…)
  function getPurchaseEntryNo(v) {
    const no = String(v.invoiceNo || '').trim();
    if (v.isReturn) return no.startsWith('PR-') ? no : `PR-${no}`;
    return (no.startsWith('PUR-') || no.startsWith('PV-')) ? no : `PV-${no}`;
  }

  function nextJvNo(date) {
    if (typeof getNextJournalVoucherNo === 'function') return getNextJournalVoucherNo(date);
    return `JV-${String(date || '').slice(0, 4) || new Date().getFullYear()}-001`;
  }

  function postPurchaseVoucherToJournal(v, options) {
    if (!v || typeof postedEntries === 'undefined') return null;
    const silent = !!(options && options.silent);
    // A Purchase Reversal mirrors the purchase's entries (purchase-reversal.js)
    if (v.isReturn) return postPurchaseReversalToJournal(v, silent);

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
      narration: `${cashPurchase ? `Cash purchase — Purchase No. ${v.invoiceNo} paid in full from ${vendorName}.` : `Purchase No. ${v.invoiceNo} posted for supplier ${vendorName}.`}${execText} ${v.narration || ''}`.trim(),
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

    // ── The advance paid against the Pre Purchase document this purchase is made from ──
    // Where it sits: Advances to Suppliers, or (a ledger-only vendor) the vendor's own ledger
    const advance = r2(v.advancePaidAmount);
    const advEntry = (advance > 0 && v.advanceJournalEntryId)
      ? postedEntries.find(e => String(e.id) === String(v.advanceJournalEntryId)) : null;
    const advDebitRow = advEntry ? (advEntry.allRows || []).find(r => (parseFloat(r.debit) || 0) > 0) : null;
    const advInLedger = !!advDebitRow && String(advDebitRow.particular || '').trim().toLowerCase() === vendorName.trim().toLowerCase();
    const advLedgerName = advInLedger ? vendorName
      : ((advDebitRow && advDebitRow.particular) || ledgerNameOf('Advances to Suppliers', 'sg-stla'));
    const advApplied = advance > 0 ? Math.min(advance, paidAmount) : 0;
    const cashPortion = r2(paidAmount - advApplied);
    // Advance paid by Journal Entry and held in Advances to Suppliers, used on this purchase
    // ("Use advance" — journal-allocations.js): set off here, Dr Vendor; Cr Advances to Suppliers
    const jAdv = (!v.isReturn && typeof getPooledJournalAdvanceUsedOn === 'function')
      ? getPooledJournalAdvanceUsedOn('purchaseVouchers', v.id) : { amount: 0, nos: [] };
    const jAdvLedgerName = jAdv.amount > 0 ? ledgerNameOf('Advances to Suppliers', 'sg-stla') : '';
    if (!v.isReturn) v.journalAdvanceSetOff = jAdv.amount;
    // The vendor is debited with everything paid — except an advance already in its ledger
    const vendorDebit = r2((advInLedger ? cashPortion : paidAmount) + jAdv.amount);
    const docLabel = v.preDocKind ? ({ quotation: 'Purchase Quotation', proforma: 'Purchase Proforma', order: 'Purchase Order', grn: 'Goods Receipt Note' }[v.preDocKind] || 'the Pre Purchase document') : '';

    // ── Payment entry: paid to the supplier (none for a cash purchase) ──
    const payRes = placeLinkedEntry(v.paymentJournalEntryId, v.paymentVoucherNo, Number(purchaseJEId) + 2, (vendorDebit > 0 && !cashPurchase) ? () => {
      const rows = [{ id: 1, type: 'By', particular: vendorName, debit: vendorDebit.toFixed(2), credit: '' }];
      if (advApplied > 0 && !advInLedger) {
        rows.push({ id: rows.length + 1, type: 'To', particular: advLedgerName, debit: '', credit: advApplied.toFixed(2) });
      }
      if (cashPortion > 0) {
        getPurchasePaymentRows(v, cashPortion).forEach(p => {
          rows.push({ id: rows.length + 1, type: 'To', particular: p.name, debit: '', credit: p.amount.toFixed(2) });
        });
      }
      if (jAdv.amount > 0) {
        rows.push({ id: rows.length + 1, type: 'To', particular: jAdvLedgerName, debit: '', credit: jAdv.amount.toFixed(2) });
      }
      let narration = `Payment made to supplier ${vendorName} against Purchase No. ${v.invoiceNo}. Status: ${v.paymentStatus}.`;
      if (advInLedger) {
        narration = `Balance payment ₹${fmt(cashPortion)} made to ${vendorName} against Purchase No. ${v.invoiceNo} (advance ₹${fmt(advApplied)} against ${docLabel} already in the ledger).`;
      } else if (advApplied > 0 && cashPortion > 0) {
        narration = `Advance ₹${fmt(advApplied)} adjusted from ${docLabel} and balance payment ₹${fmt(cashPortion)} made to supplier ${vendorName} against Purchase No. ${v.invoiceNo}.`;
      } else if (advApplied > 0) {
        narration = `Advance ₹${fmt(advApplied)} adjusted from ${docLabel} against Purchase No. ${v.invoiceNo} of supplier ${vendorName}.`;
      } else if (paidAmount <= 0 && jAdv.amount > 0) {
        narration = `Advance ₹${fmt(jAdv.amount)} paid by Journal Entry ${jAdv.nos.join(', ')} adjusted against Purchase No. ${v.invoiceNo} of supplier ${vendorName}.`;
      }
      if (paidAmount > 0 && jAdv.amount > 0) {
        narration += ` Advance ₹${fmt(jAdv.amount)} paid by Journal Entry ${jAdv.nos.join(', ')} adjusted.`;
      }
      return {
        firstParticular: vendorName,
        amount: fmt(vendorDebit),
        allRows: rows,
        narration,
        jeType: 'purchase_payment'
      };
    } : null);

    // ── Advance refund: the supplier pays back an advance above the bill value ──
    const refund = v.advanceRefund;
    const refundAmt = (refund && advance > 0) ? Math.min(r2(refund.amount), r2(refund.excess)) : 0;
    const refundRes = placeLinkedEntry(v.advanceRefundJournalEntryId, v.advanceRefundVoucherNo, Number(purchaseJEId) + 3, refundAmt > 0 ? () => {
      const inRows = getPurchasePaymentRows({ paymentAccountId: refund.accountId, paymentSplits: refund.splits || [] }, refundAmt);
      const rows = inRows.map((p, i) => ({ id: i + 1, type: 'By', particular: p.name, debit: p.amount.toFixed(2), credit: '' }));
      rows.push({ id: rows.length + 1, type: 'To', particular: advLedgerName, debit: '', credit: refundAmt.toFixed(2) });
      const rest = r2(refund.excess - refundAmt);
      return {
        firstParticular: rows[0].particular,
        amount: fmt(refundAmt),
        allRows: rows,
        narration: `Advance of ₹${fmt(refund.excess)} paid to ${vendorName} above Purchase No. ${v.invoiceNo}: ₹${fmt(refundAmt)} refunded by the supplier${rest > 0 ? `, ₹${fmt(rest)} stays as an advance${advInLedger ? " in the supplier's ledger" : ` in ${advLedgerName}`}` : ''}.`,
        jeType: 'purchase_advance_refund'
      };
    } : null);

    window.postedEntries = postedEntries;
    if (!silent && typeof refreshAllReports === 'function') refreshAllReports();
    return {
      purchaseJEId,
      tdsJEId: tdsRes.id, tdsVoucherNo: tdsRes.voucherNo,
      paymentJEId: payRes.id, paymentVoucherNo: payRes.voucherNo,
      advanceRefundJEId: refundRes.id, advanceRefundVoucherNo: refundRes.voucherNo
    };
  }

  // ── Purchase Reversal ──
  // The mirror of the purchase's entries:
  //  • Reversal entry (PR-…) Dr Vendor with the full value; Cr Purchase Returns (stock items /
  //      products; Raw Material Purchase Returns for raw materials) or the line's Expense
  //      ledger, Cr Input CGST + SGST / IGST, Cr TCS Receivable; the round off reversed in
  //      Adjustments Account
  //  • TDS reversal (JV-…) . Dr TDS Payable; Cr Vendor
  //  • Refund (JV-…) ....... Dr Cash / Bank (each Multi Refund account); Cr Vendor
  // A cash purchase is reversed in the reversal entry itself (the vendor is the cash account).
  // A reversal of a Pre Purchase document has no purchase to undo: only the refund of its
  // advance — Dr Cash / Bank; Cr Advances to Suppliers (or the vendor's own ledger).
  function postPurchaseReversalToJournal(v, silent) {
    const vendorName = getPurchaseVendorName(v);
    const cashPurchase = isPurchaseCashVendor(v);
    const refundAmt = getPurchasePaidAmount(v);
    const entryId = v.journalEntryId || Date.now();
    const placeEntry = (id, build) => {
      const prevIdx = postedEntries.findIndex(e => String(e.id) === String(id));
      if (!build) {
        if (prevIdx > -1) postedEntries.splice(prevIdx, 1);
        return '';
      }
      const entry = Object.assign({
        id, date: v.date, voucherNo: getPurchaseEntryNo(v), preparedBy: 'Purchase Module', departmentId: '', isBudget: false,
        vendorId: v.vendorId, vendorName, partyName: vendorName
      }, build());
      if (prevIdx > -1) postedEntries[prevIdx] = entry;
      else postedEntries.unshift(entry);
      return id;
    };
    const linked = (oldId, oldNo, fallbackId, build) => {
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

    // ── Reversal of a Pre Purchase document: the advance refunded ──
    if (v.reversedPreDoc) {
      const ref = v.reversedPreDoc;
      const refund = Math.min(r2(ref.advance), refundAmt);
      const advEntry = ref.advanceJournalEntryId ? postedEntries.find(e => String(e.id) === String(ref.advanceJournalEntryId)) : null;
      const advRow = advEntry ? (advEntry.allRows || []).find(r => (parseFloat(r.debit) || 0) > 0) : null;
      const advLedger = ref.inPartyLedger ? vendorName : ((advRow && advRow.particular) || ledgerNameOf('Advances to Suppliers', 'sg-stla'));
      const rest = r2(r2(ref.advance) - refund);
      const id = placeEntry(entryId, refund > 0 ? () => {
        const payRows = getPurchasePaymentRows(v, refund);
        const rows = payRows.map((p, i) => ({ id: i + 1, type: 'By', particular: p.name, debit: p.amount.toFixed(2), credit: '' }));
        rows.push({ id: rows.length + 1, type: 'To', particular: advLedger, debit: '', credit: refund.toFixed(2) });
        return {
          firstParticular: rows[0].particular,
          amount: fmt(refund),
          allRows: rows,
          narration: `Purchase Reversal No. ${v.invoiceNo} of ${ref.label || 'Pre Purchase'} ${ref.no || ''} for ${vendorName}: advance of ₹${fmt(ref.advance)}${ref.advanceVoucherNo ? ` (payment ${ref.advanceVoucherNo})` : ''} reversed — ₹${fmt(refund)} refunded by the supplier${rest > 0 ? `, ₹${fmt(rest)} stays as an advance${ref.inPartyLedger ? " in the supplier's ledger" : ` in ${advLedger}`}` : ''}.`,
          jeType: 'purchase_preinvoice_reversal'
        };
      } : null);
      window.postedEntries = postedEntries;
      if (!silent && typeof refreshAllReports === 'function') refreshAllReports();
      return { purchaseJEId: id, tdsJEId: '', tdsVoucherNo: '', paymentJEId: '', paymentVoucherNo: '', advanceRefundJEId: '', advanceRefundVoucherNo: '' };
    }

    const tdsAmt = (v.tdsTcsMode === 'TDS' && parseFloat(v.tdsTcsAmount) > 0) ? r2(v.tdsTcsAmount) : 0;
    const tcsAmt = (v.tdsTcsMode === 'TCS' && parseFloat(v.tdsTcsAmount) > 0) ? r2(v.tdsTcsAmount) : 0;
    const adjAmt = r2(v.adjustments);
    const grossReversed = r2((parseFloat(v.total) || 0) + tdsAmt);

    // ── Reversal entry ──
    placeEntry(entryId, () => {
      const rows = [];
      const add = (type, particular, amount) => {
        const amt = r2(amount);
        if (amt <= 0) return;
        rows.push({ id: rows.length + 1, type, particular, debit: type === 'By' ? amt.toFixed(2) : '', credit: type === 'To' ? amt.toFixed(2) : '' });
      };
      add('By', vendorName, grossReversed);
      if (adjAmt < 0) add('By', ledgerNameOf('Adjustments Account', 'sg-oe'), -adjAmt);
      getPurchaseDebitLines(v).forEach(line => add('To', line.name, line.amount));
      const gst = r2((v.rows || []).reduce((s, r) => s + getPurchaseLineFigures(r).taxAmt, 0));
      if (gst > 0) {
        if (getPurchaseTaxMode(v.supplyType) === 'split') {
          const cgst = r2(gst / 2);
          add('To', ledgerNameOf('Input CGST', 'sg-oca'), cgst);
          add('To', ledgerNameOf('Input SGST', 'sg-oca'), r2(gst - cgst));
        } else {
          add('To', ledgerNameOf('Input IGST', 'sg-oca'), gst);
        }
      }
      if (tcsAmt > 0) add('To', ledgerNameOf('TCS Receivable', 'sg-oca'), tcsAmt);
      if (adjAmt > 0) add('To', ledgerNameOf('Adjustments Account', 'sg-oe'), adjAmt);
      return {
        firstParticular: vendorName,
        amount: fmt(grossReversed),
        allRows: rows,
        narration: `Purchase Reversal No. ${v.invoiceNo} posted for supplier ${vendorName}${v.returnAgainstInvoice ? ` (Purchase No. ${v.returnAgainstInvoice})` : ''}.${tcsAmt > 0 ? ` TCS ₹${fmt(tcsAmt)} reversed.` : ''} ${v.narration || ''}`.trim(),
        jeType: 'purchase_reversal'
      };
    });

    // ── TDS reversal: the mirror of the purchase's TDS entry ──
    const tdsRes = linked(v.tdsJournalEntryId, v.tdsVoucherNo, Number(entryId) + 1, tdsAmt > 0 ? () => {
      const tdsName = ledgerNameOf('TDS Payable', 'sg-ocl');
      return {
        firstParticular: tdsName,
        amount: fmt(tdsAmt),
        allRows: [
          { id: 1, type: 'By', particular: tdsName, debit: tdsAmt.toFixed(2), credit: '' },
          { id: 2, type: 'To', particular: vendorName, debit: '', credit: tdsAmt.toFixed(2) }
        ],
        narration: `TDS of ₹${fmt(tdsAmt)} reversed for supplier ${vendorName} on Purchase Reversal No. ${v.invoiceNo}${v.returnAgainstInvoice ? ` (Purchase No. ${v.returnAgainstInvoice})` : ''}${v.tdsTcsRate ? ` @ ${v.tdsTcsRate}%` : ''}.`,
        jeType: 'purchase_tds_reversal'
      };
    } : null);

    // ── Refund: the mirror of the purchase's payment (none for a cash purchase) ──
    const refundRes = linked(v.paymentJournalEntryId, v.paymentVoucherNo, Number(entryId) + 2, (refundAmt > 0 && !cashPurchase) ? () => {
      const payRows = getPurchasePaymentRows(v, refundAmt);
      return {
        firstParticular: payRows[0] ? payRows[0].name : vendorName,
        amount: fmt(refundAmt),
        allRows: payRows.map((p, i) => ({ id: i + 1, type: 'By', particular: p.name, debit: p.amount.toFixed(2), credit: '' }))
          .concat([{ id: payRows.length + 1, type: 'To', particular: vendorName, debit: '', credit: refundAmt.toFixed(2) }]),
        narration: `Refund of ₹${fmt(refundAmt)} received from supplier ${vendorName} against Purchase Reversal No. ${v.invoiceNo}${v.returnAgainstInvoice ? ` (Purchase No. ${v.returnAgainstInvoice})` : ''}.`,
        jeType: 'purchase_refund'
      };
    } : null);

    window.postedEntries = postedEntries;
    if (!silent && typeof refreshAllReports === 'function') refreshAllReports();
    return {
      purchaseJEId: entryId,
      tdsJEId: tdsRes.id, tdsVoucherNo: tdsRes.voucherNo,
      paymentJEId: refundRes.id, paymentVoucherNo: refundRes.voucherNo,
      advanceRefundJEId: '', advanceRefundVoucherNo: ''
    };
  }

  // Takes a purchase out of the books (the voucher is being deleted)
  function removePurchaseJournalEntries(v) {
    if (!v || typeof postedEntries === 'undefined') return;
    const ids = new Set([v.journalEntryId, v.tdsJournalEntryId, v.paymentJournalEntryId, v.advanceRefundJournalEntryId].filter(Boolean).map(String));
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
      repostPurchaseInPlace(v);
    });
    window.postedEntries = postedEntries;
  }

  function repostPurchaseInPlace(v) {
    const res = postPurchaseVoucherToJournal(v, { silent: true });
    if (res) {
      // A reversal of a Pre Purchase document with nothing refunded has no entry at all
      v.journalEntryId = res.purchaseJEId || '';
      v.tdsJournalEntryId = res.tdsJEId || '';
      v.tdsVoucherNo = res.tdsJEId ? res.tdsVoucherNo : '';
      v.paymentJournalEntryId = res.paymentJEId || '';
      v.paymentVoucherNo = res.paymentJEId ? res.paymentVoucherNo : '';
      v.advanceRefundJournalEntryId = res.advanceRefundJEId || '';
      v.advanceRefundVoucherNo = res.advanceRefundJEId ? res.advanceRefundVoucherNo : '';
    }
  }

  // A purchase whose payment entry sets off a journal advance held in Advances to Suppliers
  // (v.journalAdvanceSetOff) is posted again once that journal changes — edited, deleted —
  // so the set-off always matches it (run with every refreshAllReports)
  function syncPurchaseJournalAdvanceSetOffs() {
    if (typeof postedEntries === 'undefined' || !window.KYA_STORE) return;
    const used = new Map();
    postedEntries.forEach(e => (e && e.allRows || []).forEach(row => {
      if (!row || !row.advanceOf) return;
      (row.allocations || []).forEach(a => {
        if (a && a.store === 'purchaseVouchers' && r2(a.amount) > 0) used.set(String(a.docId), r2((used.get(String(a.docId)) || 0) + r2(a.amount)));
      });
    }));
    (window.KYA_STORE.purchaseVouchers || []).forEach(v => {
      if (!v || v.isDraft || v.isReturn) return;
      if (Math.abs(r2(used.get(String(v.id)) || 0) - r2(v.journalAdvanceSetOff || 0)) > 0.009) repostPurchaseInPlace(v);
    });
  }

  // The voucher a purchase journal entry belongs to (any of its entries)
  function findPurchaseVoucherByEntry(entryId) {
    const id = String(entryId);
    return ((window.KYA_STORE || {}).purchaseVouchers || []).find(v => v && (
      String(v.journalEntryId) === id || String(v.tdsJournalEntryId) === id ||
      String(v.paymentJournalEntryId) === id || String(v.advanceRefundJournalEntryId) === id ||
      String(v.id) === id)) || null;
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
  window.syncPurchaseJournalAdvanceSetOffs = syncPurchaseJournalAdvanceSetOffs;
  window.findPurchaseVoucherByEntry = findPurchaseVoucherByEntry;
})();
