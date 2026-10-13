/**
 * js/purchase-pre-picker.js
 * "Pre Purchase No." box on the New Purchase form (KYA), the mirror of the Sales Invoice's
 * "Pre Invoice No." box: lists every Purchase Quotation, Purchase Proforma, Purchase Order
 * and Goods Receipt Note that is still active (drafts included), and picking one fills the
 * purchase exactly like that document's Convert to Purchase — items, vendor, advance — and
 * marks it Completed once the purchase is posted (purchase-pre.js / purchase-form.js).
 */
(function() {
  'use strict';

  const $ = id => document.getElementById(id);

  function safeEsc(str) {
    if (typeof ohEsc === 'function') return ohEsc(str);
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function safeFmtNum(num) {
    if (typeof fmtNum === 'function') return fmtNum(num);
    const n = parseFloat(num) || 0;
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // The four documents (purchase-pre.js): store keys, number field, label and chip colours
  function sources() {
    return (window.PURCHASE_PRE_DOCS || []).map(d => ({
      key: d.key, type: d.kind, store: d.storeKey, drafts: d.draftsKey, noField: d.noField,
      color: d.chip.color, bg: d.chip.bg
    }));
  }

  // Every still-open document: saved ones that are Active, plus drafts
  function getActivePurchasePreDocs() {
    // A reversal deleted elsewhere makes its document active again (purchase-reversal.js)
    if (typeof window.healPurchasePreReversals === 'function') window.healPurchasePreReversals();
    const S = window.KYA_STORE || {};
    const out = [];
    sources().forEach(src => {
      const seen = new Set();
      (S[src.store] || []).forEach(d => {
        seen.add(String(d.id));
        if (!d.status || d.status === 'Active') out.push({ src, doc: d, isDraft: false });
      });
      (S[src.drafts] || []).forEach(d => {
        if (!seen.has(String(d.id))) out.push({ src, doc: d, isDraft: true });
      });
    });
    return out;
  }

  // The document this purchase is tied to: a conversion in progress, or the one a posted
  // purchase being edited was made from
  function getLinkedPurchasePre() {
    const link = typeof window.getPurchasePreLink === 'function' ? window.getPurchasePreLink() : null;
    if (!link) return null;
    const src = sources().find(s => s.key === link.kind);
    if (!src) return null;
    const S = window.KYA_STORE || {};
    const draftIds = new Set((S[src.drafts] || []).map(d => String(d.id)));
    const savedDoc = (S[src.store] || []).find(d => String(d.id) === String(link.id));
    const doc = savedDoc || (S[src.drafts] || []).find(d => String(d.id) === String(link.id)) || null;
    return {
      src, doc,
      isDraft: !savedDoc && !!doc && draftIds.has(String(doc.id)),
      docNo: doc ? doc[src.noField] : String(link.id),
      locked: !!link.locked
    };
  }

  function renderOptions(filter) {
    const list = $('purchasePreSelectOptionsList');
    if (!list) return;
    list.innerHTML = '';

    const q = (filter || '').toLowerCase().trim();
    const selectedVendor = $('purchaseVendor') ? $('purchaseVendor').value : '';
    const items = getActivePurchasePreDocs().filter(({ doc, src }) => {
      if (!q) return true;
      return [doc[src.noField], doc.vendorName, src.type, doc.date, String(doc.total || '')]
        .concat(Array.isArray(doc.rows) ? doc.rows.map(r => r.item) : [])
        .some(v => (v || '').toLowerCase().includes(q));
    });

    // The chosen vendor's documents first, then newest first
    items.sort((a, b) => {
      const ma = selectedVendor && String(a.doc.vendorId) === String(selectedVendor) ? 0 : 1;
      const mb = selectedVendor && String(b.doc.vendorId) === String(selectedVendor) ? 0 : 1;
      if (ma !== mb) return ma - mb;
      const d = (b.doc.date || '').localeCompare(a.doc.date || '');
      return d !== 0 ? d : (Number(b.doc.id) || 0) - (Number(a.doc.id) || 0);
    });

    if (items.length === 0) {
      list.innerHTML = `<div style="padding: 12px; text-align: center; font-size: 12.5px; color: var(--slate-400);">${q ? 'No active pre purchase matches your search' : 'No active pre purchases'}</div>`;
      return;
    }

    // Just the number and type; the rest shows in a card while hovering
    items.forEach(({ src, doc, isDraft }) => {
      const item = document.createElement('div');
      item.setAttribute('role', 'option');
      item.style.cssText = 'padding: 7px 10px; font-size: 13px; border-radius: 6px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 10px;';
      item.innerHTML = `
        <span style="font-family: monospace; font-weight: 800; color: var(--slate-800); white-space: nowrap;">${safeEsc(doc[src.noField] || '—')}</span>
        <span style="flex-shrink: 0; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; color: ${src.color}; background: ${src.bg}; text-transform: uppercase;">${src.type}</span>`;
      item.addEventListener('mouseenter', () => {
        item.style.background = 'var(--slate-50)';
        showDetailsCard(item, src, doc, isDraft);
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = 'transparent';
        hideDetailsCard();
      });
      item.addEventListener('click', () => {
        closeDropdown();
        pick(src, doc, isDraft);
      });
      list.appendChild(item);
    });
  }

  // ── Hover card with a document's details ──
  function getDetailsCard() {
    let card = $('purchasePreDetailsCard');
    if (!card) {
      card = document.createElement('div');
      card.id = 'purchasePreDetailsCard';
      card.setAttribute('role', 'tooltip');
      card.style.cssText = 'display: none; position: fixed; z-index: 10050; width: 270px; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: 0 12px 28px -8px rgba(15,23,42,0.28); padding: 12px 14px; font-size: 12.5px; color: var(--slate-700); pointer-events: none;';
      document.body.appendChild(card);
    }
    return card;
  }

  function showDetailsCard(anchor, src, doc, isDraft) {
    if (!doc) return;
    const card = getDetailsCard();
    const rows = Array.isArray(doc.rows) ? doc.rows.filter(r => (r.item || '').trim()) : [];
    const itemsText = rows.length
      ? rows.slice(0, 3).map(r => safeEsc(r.item)).join(', ') + (rows.length > 3 ? ` +${rows.length - 3} more` : '')
      : '—';
    const adv = isDraft ? 0 : (parseFloat(doc.advancePaidAmount) || 0); // a draft has no advance in the books
    const total = parseFloat(doc.total) || 0;
    const line = (label, value) => `<div style="display: flex; justify-content: space-between; gap: 10px; margin-top: 4px;"><span style="color: var(--slate-500);">${label}</span><span style="font-weight: 600; text-align: right;">${value}</span></div>`;
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px;">
        <span style="font-family: monospace; font-weight: 800; font-size: 13.5px; color: var(--slate-900);">${safeEsc(doc[src.noField] || '—')}</span>
        <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; color: ${src.color}; background: ${src.bg}; text-transform: uppercase;">${src.type}</span>
      </div>
      ${line('Vendor', safeEsc(doc.vendorName || '—'))}
      ${line('Date', safeEsc(doc.date || '—'))}
      ${line('Status', isDraft ? 'Draft' : safeEsc(doc.status || 'Active'))}
      ${line('Items', itemsText)}
      ${line('Total', `₹ ${safeFmtNum(total)}`)}
      ${adv > 0 ? line('Advance', `₹ ${safeFmtNum(adv)}${doc.advanceVoucherNo ? ` <span style="font-family: monospace; color: var(--blue-700);">[${safeEsc(doc.advanceVoucherNo)}]</span>` : ''}`) + line('Balance', `₹ ${safeFmtNum(Math.max(0, total - adv))}`) : ''}`;

    // Beside the anchor: right of it when there is room, otherwise left
    card.style.display = 'block';
    const r = anchor.getBoundingClientRect();
    const w = card.offsetWidth, h = card.offsetHeight;
    let left = r.right + 8;
    if (left + w > window.innerWidth - 8) left = Math.max(8, r.left - w - 8);
    const top = Math.max(8, Math.min(r.top, window.innerHeight - h - 8));
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  }

  function hideDetailsCard() {
    const card = $('purchasePreDetailsCard');
    if (card) card.style.display = 'none';
  }

  // Lines already typed on the purchase would be replaced, so ask first
  function purchaseHasContent() {
    return Array.from(document.querySelectorAll('#purchaseItemBody .sales-row-item'))
      .some(inp => (inp.value || '').trim());
  }

  function pick(src, doc, isDraft) {
    if (typeof window.convertPurchasePreToPurchase !== 'function') {
      if (typeof showToast === 'function') showToast(`${src.type} could not be loaded.`, 'error');
      return;
    }
    // A document with no Purchaser / Executive leaves the one already chosen on the purchase
    const keepExec = $('purchaseExecutive') ? $('purchaseExecutive').value : '';
    const run = () => window.convertPurchasePreToPurchase(src.key, doc.id, { keepExecutive: keepExec });
    if (typeof showKyaConfirm !== 'function') { run(); return; }

    // Always confirm, showing what will come in
    const adv = isDraft ? 0 : (parseFloat(doc.advancePaidAmount) || 0); // a draft has no advance in the books
    const notes = [];
    if (adv > 0) notes.push(`Advance of ₹${safeFmtNum(adv)} will be adjusted.`);
    if (purchaseHasContent()) notes.push('The lines already entered will be replaced.');
    notes.push('It is marked Completed only when this purchase is posted.');
    showKyaConfirm({
      title: 'Load Pre Purchase?',
      message: `Load ${src.type} <strong>${safeEsc(doc[src.noField])}</strong> from <strong>${safeEsc(doc.vendorName || 'Vendor')}</strong> (₹${safeFmtNum(doc.total)}) into this purchase?<br>${notes.join('<br>')}`,
      confirmLabel: 'Load',
      okBg: '#2563eb',
      iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 14h8M13 11l3 3-3 3"/></svg>',
      onConfirm: run
    });
  }

  function openDropdown() {
    const dd = $('purchasePreSelectDropdown');
    if (!dd) return;
    const linked = getLinkedPurchasePre();
    if (linked && linked.locked) return; // a posted purchase keeps the document it was made from
    hideDetailsCard();
    dd.style.display = 'flex';
    const search = $('purchasePreSelectSearch');
    if (search) search.value = '';
    renderOptions('');
    if (search) search.focus();
  }

  function closeDropdown() {
    const dd = $('purchasePreSelectDropdown');
    if (dd) dd.style.display = 'none';
    hideDetailsCard();
  }

  // The box, with the linked document's number when there is one
  function refreshPurchasePrePicker() {
    const text = $('purchasePreSelectTriggerText');
    const trigger = $('purchasePreSelectTrigger');
    if (!text || !trigger) return;
    closeDropdown();

    const linked = getLinkedPurchasePre();
    if (linked) {
      // Number and type only; hovering shows the details card
      text.innerHTML = `<span style="font-family: monospace; font-weight: 800; color: var(--slate-800);">${safeEsc(linked.docNo)}</span> <span style="font-size: 11px; color: ${linked.src.color};">${safeEsc(linked.src.type)}</span>`;
      trigger.title = '';
      trigger.style.cursor = linked.locked ? 'default' : 'pointer';
    } else {
      text.textContent = '— Select —';
      trigger.title = 'Bill an active Purchase Quotation, Purchase Proforma, Purchase Order or Goods Receipt Note';
      trigger.style.cursor = 'pointer';
    }
    // × to take the document off again — not on a posted purchase, which keeps it
    const clearBtn = $('purchasePreClearBtn');
    if (clearBtn) clearBtn.style.display = (linked && !linked.locked) ? '' : 'none';
    applyPurchasePreLock();
  }

  // ── Remove the loaded document: everything it filled in goes (vendor, Purchaser,
  // items, tax, payment / advance, notes, attachment) and the purchase is blank again,
  // keeping only its own date and number — and the draft it is, when editing one ──
  function removeLinkedPurchasePre() {
    const linked = getLinkedPurchasePre();
    if (!linked || linked.locked) return;
    closeDropdown();
    const run = () => {
      const dateEl = $('purchaseDate');
      const noEl = $('purchaseInvoiceNo');
      const keepDate = dateEl ? dateEl.value : '';
      const keepNo = noEl ? noEl.value : '';
      if (typeof window.initPurchaseForm === 'function') window.initPurchaseForm({ keepEditing: true }); // also drops the link
      if (dateEl && keepDate) {
        dateEl.value = keepDate;
        if ($('purchaseDueDate')) $('purchaseDueDate').value = keepDate;
      }
      if (noEl && keepNo) {
        noEl.value = keepNo;
        if ($('purchaseVoucherChipDisplay')) $('purchaseVoucherChipDisplay').textContent = keepNo;
        if (typeof validateDocNoField === 'function') validateDocNoField('purchase');
      }
      refreshPurchasePrePicker();
      if (typeof showToast === 'function') showToast(`${linked.src.type} ${linked.docNo || ''} removed from this purchase.`, 'info');
    };
    if (typeof showKyaConfirm !== 'function') { run(); return; }
    showKyaConfirm({
      title: 'Remove Pre Purchase?',
      message: `Remove ${linked.src.type} <strong>${safeEsc(linked.docNo || '')}</strong> from this purchase?<br>Everything it filled in — vendor, Purchaser, items, tax, payment and advance, notes — will be cleared.`,
      confirmLabel: 'Remove',
      okBg: 'var(--red-600)',
      onConfirm: run
    });
  }

  // ── A loaded document fixes the purchase's vendor, and its Purchaser / Executive when it
  // names one. Undoes only what it locked (data-pre-locked). ──
  function applyPurchasePreLock() {
    const linked = getLinkedPurchasePre();
    const from = linked ? `${linked.src.type} ${linked.docNo || ''}`.trim() : '';
    const trigger = $('purchaseVendorSelectTrigger');
    const select = $('purchaseVendor');
    const exec = $('purchaseExecutive');
    if (trigger) {
      if (linked) {
        trigger.dataset.preLocked = '1';
        trigger.style.backgroundColor = 'var(--slate-50)';
        trigger.style.cursor = 'default';
        trigger.style.opacity = '0.7';
        trigger.title = `Vendor of ${from}`;
        const dd = $('purchaseVendorSelectDropdown');
        if (dd) dd.style.display = 'none';
      } else if (trigger.dataset.preLocked) {
        delete trigger.dataset.preLocked;
        trigger.style.backgroundColor = '#fff';
        trigger.style.cursor = 'pointer';
        trigger.style.opacity = '1';
        trigger.title = '';
      }
    }
    if (select) {
      if (linked) { select.disabled = true; select.dataset.preLocked = '1'; }
      else if (select.dataset.preLocked) { select.disabled = false; delete select.dataset.preLocked; }
    }
    if (exec) {
      const lockExec = !!(linked && linked.doc && linked.doc.executiveId);
      if (lockExec) {
        exec.disabled = true;
        exec.style.backgroundColor = 'var(--slate-50)';
        exec.style.cursor = 'not-allowed';
        exec.title = `Purchaser / Executive of ${from}`;
        exec.dataset.preLocked = '1';
      } else if (exec.dataset.preLocked) {
        exec.disabled = false;
        exec.style.backgroundColor = '';
        exec.style.cursor = '';
        exec.title = '';
        delete exec.dataset.preLocked;
      }
    }
  }

  function wire() {
    const trigger = $('purchasePreSelectTrigger');
    const dd = $('purchasePreSelectDropdown');
    const search = $('purchasePreSelectSearch');
    if (!trigger || !dd || trigger._wired) return;
    trigger._wired = true;

    trigger.addEventListener('click', e => {
      e.stopPropagation();
      if (dd.style.display === 'flex') closeDropdown();
      else openDropdown();
    });
    trigger.addEventListener('keydown', e => {
      if (e.target !== trigger) return; // keys on the × are its own
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDropdown(); }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeLinkedPurchasePre(); }
    });
    const clearBtn = $('purchasePreClearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', e => {
        e.stopPropagation(); // not the box's own click, which opens the list
        hideDetailsCard();
        removeLinkedPurchasePre();
      });
      // Over the × the details card would cover what it removes
      clearBtn.addEventListener('mouseenter', hideDetailsCard);
    }
    // Hovering the box shows the linked document's details (not while the list is open)
    trigger.addEventListener('mouseenter', () => {
      if (dd.style.display === 'flex') return;
      const linked = getLinkedPurchasePre();
      if (linked && linked.doc) showDetailsCard(trigger, linked.src, linked.doc, linked.isDraft);
    });
    trigger.addEventListener('mouseleave', hideDetailsCard);
    if (search) {
      search.addEventListener('input', () => renderOptions(search.value));
      search.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeDropdown();
        if (e.key === 'Enter') {
          const first = $('purchasePreSelectOptionsList')?.querySelector('[role="option"]');
          if (first) { e.preventDefault(); first.click(); }
        }
      });
    }
    dd.addEventListener('click', e => e.stopPropagation());
    document.addEventListener('click', closeDropdown);

    // While a document is loaded the vendor stays its vendor: the Vendor box doesn't open
    // (the ✎ pencil and the details card still work)
    const vendorWrap = $('purchaseVendorSelectWrap');
    const vendorTrigger = $('purchaseVendorSelectTrigger');
    if (vendorWrap && vendorTrigger && !vendorWrap._preLockWired) {
      vendorWrap._preLockWired = true;
      vendorWrap.addEventListener('click', e => {
        if (vendorTrigger.dataset.preLocked && vendorTrigger.contains(e.target)) {
          e.stopPropagation();
          e.preventDefault();
        }
      }, true);
    }
    refreshPurchasePrePicker();
  }

  window.refreshPurchasePrePicker = refreshPurchasePrePicker;
  window.getActivePurchasePreDocs = getActivePurchasePreDocs;
  // Shared with the Purchase Reversal "Original Doc" list (purchase-reversal.js)
  window.showPurchasePreDetailsCard = showDetailsCard;
  window.hidePurchasePreDetailsCard = hideDetailsCard;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
