/**
 * js/preinvoice-bulk.js
 * Select mode for the Quotation, Proforma Invoice, Sales Order and Delivery Challan lists
 * (KYA), worked like the Voucher Desk's: a ⋮ menu in the list's blue title card
 * (<key>ListMoreSlot) with Select / Exit Select Mode, a checkbox column with Select All,
 * and a bar at the end of the status pills with Make Active (for selected drafts),
 * Delete Selected and Exit Select.
 *
 * Each list calls attachPreInvoiceBulk(cfg) every time it draws its rows:
 *   cfg: {
 *     key,                       // select state is kept per list ('quote', 'order', …)
 *     areaId,                    // the list's content area (pills row + table)
 *     filter,                    // the pill showing ('all', 'drafted', …)
 *     noun, plural,              // 'quotation' / 'quotations'
 *     storeKey, draftsKey,       // KYA_STORE arrays for saved / draft documents
 *     noField, numberKind,       // number field and its doc-numbering kind
 *     advance: null | {          // documents that take an advance from the customer
 *       amount(doc), receiptRows(doc, amount), info(doc),
 *       post(doc, amount)        // optional: posts it instead (Pre Purchase — advance paid)
 *     },
 *     partyIdField, partyNoun,   // optional: the party field ('vendorId' / 'vendor')
 *     reload()                   // draws the list again after a change
 *   }
 * Rows must carry data-doc-id.
 */
(function() {
  'use strict';

  const STATE = {};
  const r2 = n => Math.round((parseFloat(n) || 0) * 100) / 100;

  function esc(str) {
    if (typeof ohEsc === 'function') return ohEsc(str);
    return String(str == null ? '' : str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function stateOf(key) {
    if (!STATE[key]) STATE[key] = { on: false, sel: new Set(), filter: null };
    return STATE[key];
  }

  function lists(cfg) {
    window.KYA_STORE = window.KYA_STORE || {};
    const S = window.KYA_STORE;
    S[cfg.storeKey] = S[cfg.storeKey] || [];
    S[cfg.draftsKey] = S[cfg.draftsKey] || [];
    return S;
  }

  // The stored record and whether it is a draft (only in the drafts store)
  function findStored(cfg, id) {
    const S = lists(cfg);
    const saved = S[cfg.storeKey].find(d => String(d.id) === String(id));
    if (saved) return { doc: saved, isDraft: false };
    const draft = S[cfg.draftsKey].find(d => String(d.id) === String(id));
    return draft ? { doc: draft, isDraft: true } : { doc: null, isDraft: false };
  }

  function docNo(cfg, doc) {
    return (doc && doc[cfg.noField]) || cfg.noun;
  }

  // ── Checks (no toasts — a bulk action reports what it skipped at the end) ──
  function deleteProblem(cfg, doc, isDraft) {
    if (!isDraft && doc.status === 'Completed') return 'completed';
    if (doc.reversedBy) return `reversed by ${doc.reversedBy.no || 'a Sales Reversal'}`;
    if (typeof getPreInvoiceAdvanceUsed === 'function' && getPreInvoiceAdvanceUsed(cfg.storeKey, doc.id) > 0.009) {
      return 'its advance paid other documents';
    }
    // Journal Entry money against it (journal-allocations.js)
    if (!isDraft && typeof getJournalDeleteProblem === 'function') {
      const problem = getJournalDeleteProblem(journalRefsOf(cfg.storeKey, doc.id));
      if (problem) return problem;
    }
    return '';
  }

  function advanceProblem(doc, amount) {
    if (!(amount > 0)) return '';
    const acc = String(doc.paymentAccountId || '');
    if (!acc) return 'no payment account for its advance';
    if (typeof usesCreditAdjust === 'function' && usesCreditAdjust(doc.paymentAccountId, doc.paymentSplits)) {
      return 'its advance uses Invoice Balance — open it and Save';
    }
    if (acc !== 'multi-payment') return '';
    const splits = (doc.paymentSplits || []).filter(sp => sp && sp.accountId && (parseFloat(sp.amount) || 0) > 0);
    if (!splits.length) return 'its Multi Payment split is not set up';
    if (splits.some((sp, i) => splits.findIndex(o => String(o.accountId) === String(sp.accountId)) !== i)) {
      return 'its Multi Payment uses an account twice';
    }
    const splitTotal = splits.reduce((s, sp) => s + (parseFloat(sp.amount) || 0), 0);
    if (Math.abs(splitTotal - (parseFloat(doc.paymentAmount) || 0)) > 0.01) return "its Multi Payment split doesn't match the advance";
    return '';
  }

  // The same checks the form makes before saving
  function activateProblem(cfg, doc) {
    // A Pre Purchase list names its party field (vendorId) — see preinvoice-list.js
    if (!doc[cfg.partyIdField || 'customerId']) return `no ${cfg.partyNoun || 'customer'}`;
    const rows = Array.isArray(doc.rows) ? doc.rows : [];
    if (!rows.some(r => (r.item && String(r.item).trim()) || (parseFloat(r.amount) || 0) > 0)) return 'no line items';
    if (!((parseFloat(doc.total) || 0) > 0)) return 'total is zero';
    const no = String(doc[cfg.noField] || '').trim();
    if (!no) return 'no number';
    if (typeof isDocNoUsed === 'function' && isDocNoUsed(cfg.numberKind, no, doc.id)) return `number ${no} is already used`;
    if (cfg.advance) return advanceProblem(doc, cfg.advance.amount(doc));
    return '';
  }

  // ── Actions ──
  function deleteDocs(cfg, ids) {
    if (typeof window.healPreInvoiceReversals === 'function') window.healPreInvoiceReversals();
    const S = lists(cfg);
    const done = [], skipped = [];
    let booksChanged = false;
    ids.forEach(id => {
      const { doc, isDraft } = findStored(cfg, id);
      if (!doc) return;
      const problem = deleteProblem(cfg, doc, isDraft);
      if (problem) { skipped.push(`${docNo(cfg, doc)} (${problem})`); return; }
      if (doc.advanceJournalEntryId && typeof removePreInvoiceAdvanceEntry === 'function') {
        removePreInvoiceAdvanceEntry(doc);
        booksChanged = true;
      }
      S[cfg.storeKey] = S[cfg.storeKey].filter(d => String(d.id) !== String(id));
      S[cfg.draftsKey] = S[cfg.draftsKey].filter(d => String(d.id) !== String(id));
      done.push(docNo(cfg, doc));
    });
    return { done, skipped, booksChanged };
  }

  function activateDocs(cfg, ids) {
    const S = lists(cfg);
    const done = [], skipped = [];
    let booksChanged = false;
    ids.forEach(id => {
      const { doc, isDraft } = findStored(cfg, id);
      if (!doc || !isDraft) return;
      const problem = activateProblem(cfg, doc);
      if (problem) { skipped.push(`${docNo(cfg, doc)} (${problem})`); return; }

      if (cfg.advance) {
        const amount = r2(cfg.advance.amount(doc));
        if (amount > 0 && typeof cfg.advance.post === 'function') {
          // A Pre Purchase document: the advance paid to the vendor (purchase-pre.js)
          cfg.advance.post(doc, amount);
          booksChanged = true;
        } else if (amount > 0 && typeof postPreInvoiceAdvanceEntry === 'function') {
          postPreInvoiceAdvanceEntry(doc, amount, cfg.advance.receiptRows(doc, amount), cfg.advance.info(doc));
          booksChanged = true;
        }
      }
      doc.status = 'Active';
      doc.updatedAt = Date.now();
      S[cfg.draftsKey] = S[cfg.draftsKey].filter(d => String(d.id) !== String(id));
      if (!S[cfg.storeKey].some(d => String(d.id) === String(id))) S[cfg.storeKey].unshift(doc);
      // Saved: the number is used for good, as when saved from the form
      if (typeof registerDocNo === 'function') registerDocNo(cfg.numberKind, doc[cfg.noField]);
      done.push(docNo(cfg, doc));
    });
    return { done, skipped, booksChanged };
  }

  function report(cfg, res, verb) {
    if (typeof showToast !== 'function') return;
    const n = res.done.length;
    const what = n === 1 ? cfg.noun : cfg.plural;
    if (n > 0) showToast(`${n} ${what} ${verb}.`, 'success');
    if (res.skipped.length) {
      const shown = res.skipped.slice(0, 3).join('; ');
      const more = res.skipped.length > 3 ? `; and ${res.skipped.length - 3} more` : '';
      showToast(`${res.skipped.length} not ${verb}: ${shown}${more}.`, 'warning');
    }
  }

  function afterChange(cfg, res) {
    if (res.booksChanged && typeof refreshAllReports === 'function') refreshAllReports();
    if ((res.done.length || res.booksChanged) && typeof triggerAutoBackup === 'function') triggerAutoBackup();
  }

  function confirmDelete(cfg, st) {
    const ids = [...st.sel];
    if (!ids.length) return;
    const n = ids.length;
    showKyaConfirm({
      title: `Delete Selected ${cfg.plural.replace(/\b\w/g, c => c.toUpperCase())}?`,
      message: `Permanently delete <strong>${n} selected ${n === 1 ? cfg.noun : cfg.plural}</strong>?<br>This action cannot be undone.`,
      confirmLabel: '✕ Delete',
      okBg: '#dc2626',
      iconBg: '#fee2e2',
      iconColor: '#dc2626',
      iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
      onConfirm: () => {
        const res = deleteDocs(cfg, ids);
        st.sel.clear();
        afterChange(cfg, res);
        report(cfg, res, 'deleted');
        cfg.reload();
      }
    });
  }

  function confirmActivate(cfg, st) {
    const ids = [...st.sel].filter(id => findStored(cfg, id).isDraft);
    if (!ids.length) return;
    const n = ids.length;
    showKyaConfirm({
      title: 'Make Active?',
      message: `Save <strong>${n} drafted ${n === 1 ? cfg.noun : cfg.plural}</strong> as Active?${cfg.advance ? '<br>Any advance on them is posted to the books.' : ''}`,
      confirmLabel: 'Make Active',
      okBg: '#16a34a',
      iconBg: '#dcfce7',
      iconColor: '#16a34a',
      iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
      onConfirm: () => {
        const res = activateDocs(cfg, ids);
        ids.forEach(id => { if (!findStored(cfg, id).isDraft) st.sel.delete(id); });
        afterChange(cfg, res);
        report(cfg, res, 'made Active');
        cfg.reload();
      }
    });
  }

  // ── Drawing ──
  const ICON_DOTS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="5" r="1.5"></circle><circle cx="12" cy="19" r="1.5"></circle></svg>';
  const ICON_SELECT = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="m9 12 2 2 4-4"/></svg>';
  const ICON_CHECK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  const ICON_TRASH = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>';

  function attachPreInvoiceBulk(cfg) {
    const area = document.getElementById(cfg.areaId);
    if (!area) return;
    const st = stateOf(cfg.key);
    // Another pill: start the selection again
    if (st.filter !== cfg.filter) { st.sel.clear(); st.filter = cfg.filter; }

    const rows = Array.from(area.querySelectorAll('tr[data-doc-id]'));
    const visibleIds = rows.map(tr => String(tr.dataset.docId));
    // Only rows on screen stay selected (a search can hide some)
    [...st.sel].forEach(id => { if (!visibleIds.includes(id)) st.sel.delete(id); });

    const toolbar = area.querySelector('.ptb');
    if (!toolbar) return;
    // The selection bar sits at the end of the status pills …
    const right = document.createElement('div');
    right.className = 'pib-right';
    right.style.cssText = 'margin-left: auto; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;';
    toolbar.appendChild(right);
    // … and the ⋮ in the list's blue title card (<key>ListMoreSlot)
    const moreHost = document.getElementById(`${cfg.key}ListMoreSlot`) || right;

    const table = area.querySelector('table');
    if (st.on && table) decorateTable(cfg, st, table, rows, visibleIds, paintControls);
    else paintControls();

    // The bar and the ⋮ menu follow the selection
    function paintControls() {
      const selCount = st.sel.size;
      const draftCount = [...st.sel].filter(id => findStored(cfg, id).isDraft).length;
      right.innerHTML = st.on ? `
          <div class="pt-sel-bar" style="margin: 0; padding: 4px 12px; border-radius: 8px; display: flex; align-items: center; gap: 8px; min-height: 34px; box-sizing: border-box;">
            <span class="pt-sel-count" style="font-size: 12.5px; font-weight: 600;">${selCount} selected</span>
            ${draftCount > 0 ? `
              <button type="button" data-pib="activate" style="height: 30px; padding: 0 10px; font-size: 12px; display: flex; align-items: center; gap: 5px; border-radius: 6px; border: none; background: #dcfce7; color: #15803d; font-weight: 700; cursor: pointer;">
                ${ICON_CHECK} Make Active${draftCount > 1 ? ` (${draftCount})` : ''}
              </button>` : ''}
            ${selCount > 0 ? `
              <button type="button" class="pt-del-btn" data-pib="delete" style="height: 30px; padding: 0 10px; font-size: 12px; display: flex; align-items: center; gap: 5px;">
                ${ICON_TRASH} Delete Selected
              </button>` : ''}
            <button type="button" data-pib="exit" style="height: 30px; padding: 0 10px; font-size: 12px; font-weight: 600; border-radius: 6px; border: 1px solid var(--slate-200); background: #fff; color: var(--slate-700); cursor: pointer;">Exit Select</button>
          </div>` : '';

      const moreHtml = `
        <div class="pib-more" style="position: relative;">
          <button type="button" class="rpt-more-btn" data-pib="menu" title="More Options" aria-label="More Options" aria-haspopup="menu" aria-expanded="false">${ICON_DOTS}</button>
          <div class="pib-menu" role="menu" style="display: none; position: absolute; top: calc(100% + 8px); right: 0; z-index: 300; min-width: 190px; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1); padding: 6px;">
            <button type="button" class="rpt-menu-item" role="menuitem" data-pib="toggle" style="width: 100%; text-align: left; display: flex; align-items: center; gap: 10px;">
              ${ICON_SELECT}<span>${st.on ? 'Exit Select Mode' : 'Select'}</span>
            </button>
            ${st.on && draftCount > 0 ? `
              <div class="rpt-menu-sep"></div>
              <button type="button" class="rpt-menu-item" role="menuitem" data-pib="activate" style="width: 100%; text-align: left; display: flex; align-items: center; gap: 10px; color: #16a34a; font-weight: 600;">
                ${ICON_CHECK}<span>Make Active${draftCount > 1 ? ` (${draftCount})` : ''}</span>
              </button>` : ''}
          </div>
        </div>`;
      if (moreHost === right) right.insertAdjacentHTML('beforeend', moreHtml);
      else moreHost.innerHTML = moreHtml;

      const menu = moreHost.querySelector('.pib-menu');
      const menuBtn = moreHost.querySelector('[data-pib="menu"]');
      const setMenu = open => { menu.style.display = open ? 'block' : 'none'; menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); };
      menuBtn.addEventListener('click', e => { e.stopPropagation(); setMenu(menu.style.display === 'none'); });
      const actionBtns = moreHost === right ? right.querySelectorAll('[data-pib]')
        : [...right.querySelectorAll('[data-pib]'), ...moreHost.querySelectorAll('[data-pib]')];
      actionBtns.forEach(btn => {
        const act = btn.dataset.pib;
        if (act === 'menu') return;
        btn.addEventListener('click', e => {
          e.stopPropagation();
          setMenu(false);
          if (act === 'toggle') { st.on = !st.on; st.sel.clear(); cfg.reload(); }
          else if (act === 'exit') { st.on = false; st.sel.clear(); cfg.reload(); }
          else if (act === 'delete') confirmDelete(cfg, st);
          else if (act === 'activate') confirmActivate(cfg, st);
        });
      });
    }
  }

  // Checkbox column with Select All; a click on a row toggles it instead of opening it
  function decorateTable(cfg, st, table, rows, visibleIds, onChange) {
    const headRow = table.tHead && table.tHead.rows[0];
    let selAll = null;
    if (headRow) {
      const th = document.createElement('th');
      th.style.cssText = 'width: 40px; padding: 10px 12px; text-align: center;';
      th.innerHTML = `<input type="checkbox" class="pt-cb" aria-label="Select all ${esc(cfg.plural)}" style="cursor: pointer; width: 16px; height: 16px; accent-color: #2563eb;">`;
      headRow.insertBefore(th, headRow.firstChild);
      selAll = th.querySelector('input');
    }
    Array.from(table.tBodies[0] ? table.tBodies[0].rows : []).forEach(tr => {
      if (tr.dataset.docId) {
        const td = document.createElement('td');
        td.style.cssText = 'width: 40px; padding: 12px; text-align: center;';
        td.innerHTML = `<input type="checkbox" class="pt-cb" aria-label="Select" style="cursor: pointer; width: 16px; height: 16px; accent-color: #2563eb;">`;
        tr.insertBefore(td, tr.firstChild);
      } else if (tr.cells[0] && tr.cells[0].colSpan > 1) {
        tr.cells[0].colSpan += 1; // the "no documents found" row
      }
    });

    const sync = () => {
      rows.forEach(tr => {
        const on = st.sel.has(String(tr.dataset.docId));
        const cb = tr.querySelector('input.pt-cb');
        if (cb) cb.checked = on;
        tr.style.background = on ? '#eff6ff' : '';
      });
      if (selAll) {
        selAll.checked = visibleIds.length > 0 && visibleIds.every(id => st.sel.has(id));
        selAll.indeterminate = !selAll.checked && visibleIds.some(id => st.sel.has(id));
      }
      onChange();
    };

    // Capture phase: runs before the row's own click (which opens the preview)
    table.addEventListener('click', e => {
      const tr = e.target.closest('tr[data-doc-id]');
      if (!tr || !table.contains(tr)) return;
      e.stopPropagation();
      const id = String(tr.dataset.docId);
      if (st.sel.has(id)) st.sel.delete(id); else st.sel.add(id);
      sync();
      setTimeout(sync, 0); // after a checkbox's own toggle
    }, true);
    // Rows keep their hover colour only while not selected
    rows.forEach(tr => {
      tr.addEventListener('mouseout', () => { if (st.sel.has(String(tr.dataset.docId))) tr.style.background = '#eff6ff'; });
    });
    if (selAll) {
      selAll.addEventListener('change', () => {
        if (selAll.checked) visibleIds.forEach(id => st.sel.add(id));
        else visibleIds.forEach(id => st.sel.delete(id));
        sync();
      });
    }
    sync();
  }

  // One listener closes any open ⋮ menu on an outside click or Escape
  document.addEventListener('click', e => {
    document.querySelectorAll('.pib-more').forEach(wrap => {
      if (wrap.contains(e.target)) return;
      const menu = wrap.querySelector('.pib-menu');
      if (menu) menu.style.display = 'none';
      const btn = wrap.querySelector('[data-pib="menu"]');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.pib-menu').forEach(menu => { menu.style.display = 'none'; });
  });

  window.attachPreInvoiceBulk = attachPreInvoiceBulk;
})();
