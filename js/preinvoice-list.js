/**
 * js/preinvoice-list.js
 * List page + preview for Sales Order and Delivery Challan (KYA) — the same list, preview
 * and actions as the Quotation list: search, All / Active / Completed / Cancelled pills,
 * a click-to-preview table, and Convert to Sale / Mark Completed / Mark Cancelled /
 * Reopen / Edit / Delete / PDF & Excel export in the preview. Each module calls
 * createPreInvoiceDocList(cfg) with its own store keys, labels and form opener.
 */
(function() {
  'use strict';

  function safeEsc(str) {
    if (typeof ohEsc === 'function') return ohEsc(str);
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function safeFmtNum(num) {
    if (typeof fmtNum === 'function') return fmtNum(num);
    const n = parseFloat(num) || 0;
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function statusBadge(doc, size) {
    const s = size === 'lg' ? 'font-size:12px; padding:4px 10px;' : 'font-size:11px; padding:3px 8px;';
    if (doc.status === 'Completed') return `<span class="badge" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; ${s} font-weight:700;">Completed</span>`;
    if (doc.status === 'Cancelled') return `<span class="badge" style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; ${s} font-weight:700;">Cancelled</span>`;
    if (doc.status === 'Draft' || doc.isDraft) return `<span class="badge" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; ${s} font-weight:700;">Draft</span>`;
    return `<span class="badge" style="background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; ${s} font-weight:700;">Active</span>`;
  }

  function payStatusBadge(doc) {
    if (doc.paymentStatus === 'Full Payment') return '<span class="badge" style="background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; font-size:11px; padding:2px 8px; font-weight:700;">Full Payment</span>';
    if (doc.paymentStatus === 'Partial Payment') return '<span class="badge" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-size:11px; padding:2px 8px; font-weight:700;">Partial Payment</span>';
    return '<span class="badge" style="background:#fef2f2; color:#dc2626; border:1px solid #fecaca; font-size:11px; padding:2px 8px; font-weight:700;">Not Paid</span>';
  }

  const isOpenStatus = d => d.status === 'Active' || !d.status || d.status === 'Draft';

  /**
   * cfg: {
   *   kind: 'Sales Order', plural: 'Sales Orders', noun: 'sales order',
   *   storeKey, draftsKey,               // KYA_STORE arrays for saved / draft documents
   *   noField, noFallback,               // document number field ('orderNo') and placeholder
   *   ids: { prefix, listCard, contentArea },
   *   secondDate: { label, get(doc) },   // second date column, e.g. Delivery Date
   *   previewDateLabel, forLabel, partyColumn, preparedLabel,
   *   emptyText, defaultNotes, footerText, iconSvg,
   *   moduleName,                        // preparedBy on the advance journal entry
   *   convertField,                      // invoice field linking back, e.g. 'convertedFromSalesOrderId'
   *   linkField,                         // advance entry field naming the document, e.g. 'salesOrderId'
   *   openForm(doc, openedFrom),         // the module's form opener
   *   exportLabels: { pdf, excel },
   *   api: { openList, closeList, view, markCompleted }  // window names this list answers to
   * }
   */
  function createPreInvoiceDocList(cfg) {
    let _filter = 'all';
    let _search = '';

    function store() {
      window.KYA_STORE = window.KYA_STORE || {};
      window.KYA_STORE[cfg.storeKey] = window.KYA_STORE[cfg.storeKey] || [];
      window.KYA_STORE[cfg.draftsKey] = window.KYA_STORE[cfg.draftsKey] || [];
      return window.KYA_STORE;
    }

    // Saved documents plus drafts, newest first
    function getAll() {
      if (typeof window.healPreInvoiceReversals === 'function') window.healPreInvoiceReversals();
      const S = store();
      const map = new Map();
      S[cfg.storeKey].forEach(d => map.set(String(d.id), { ...d, isDraft: false }));
      S[cfg.draftsKey].forEach(d => {
        if (!map.has(String(d.id))) map.set(String(d.id), { ...d, isDraft: true, status: 'Draft' });
      });
      return Array.from(map.values()).sort((a, b) => {
        const dComp = (b.date || '').localeCompare(a.date || '');
        if (dComp !== 0) return dComp;
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      });
    }

    // The stored record (not a copy) and whether it is a draft
    function findStored(id) {
      const S = store();
      let doc = S[cfg.storeKey].find(d => String(d.id) === String(id));
      if (doc) return { doc, isDraft: false };
      doc = S[cfg.draftsKey].find(d => String(d.id) === String(id));
      return doc ? { doc, isDraft: true } : { doc: null, isDraft: false };
    }

    function promoteDraft(id, doc) {
      const S = store();
      S[cfg.draftsKey] = S[cfg.draftsKey].filter(d => String(d.id) !== String(id));
      if (!S[cfg.storeKey].some(d => String(d.id) === String(id))) S[cfg.storeKey].unshift(doc);
    }

    // Re-post the advance from what the document holds (its form already validated it)
    function repostAdvance(doc) {
      if (typeof postPreInvoiceAdvanceEntry !== 'function') return;
      const total = parseFloat(doc.total) || 0;
      const advance = doc.paymentStatus === 'Not Paid' ? 0 : (parseFloat(doc.paymentAmount) || 0);
      const amount = total > 0 ? Math.min(advance, total) : advance;
      if (amount > 0) {
        postPreInvoiceAdvanceEntry(doc, amount, getPreInvoiceAdvanceReceiptRows(doc, amount), {
          preparedBy: cfg.moduleName,
          docLabel: cfg.kind,
          docNo: doc[cfg.noField],
          extra: { [cfg.linkField]: doc.id }
        });
      }
    }

    function afterChange() {
      if (typeof refreshAllReports === 'function') refreshAllReports();
      if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
    }

    // ── Status / delete / edit ──
    function setStatus(id, newStatus) {
      const { doc, isDraft } = findStored(id);
      if (!doc) { showToast(`${cfg.kind} not found.`, 'error'); return; }
      if (typeof blockIfPreInvoiceReversed === 'function' && blockIfPreInvoiceReversed(doc, `${cfg.kind} ${doc[cfg.noField] || ''}`)) return;
      // Cancelling gives the advance back — not while part of it paid other documents
      if (newStatus === 'Cancelled' && typeof blockIfCreditUsed === 'function'
          && blockIfCreditUsed([`adv:${cfg.storeKey}:${doc.id}`], `${cfg.kind} ${doc[cfg.noField] || ''}`, 'cancelled')) return;
      if (doc.status === 'Completed' && newStatus === 'Active') {
        showToast(`Completed ${cfg.plural.toLowerCase()} cannot be reopened.`, 'warning');
        return;
      }

      doc.status = newStatus;
      doc.updatedAt = Date.now();

      // A cancelled document is out of the books; reopened or completed it is back in
      if (newStatus === 'Cancelled') {
        if (doc.advanceJournalEntryId && typeof removePreInvoiceAdvanceEntry === 'function') removePreInvoiceAdvanceEntry(doc);
      } else {
        repostAdvance(doc);
      }
      if (isDraft && newStatus !== 'Cancelled') promoteDraft(id, doc);

      showToast(`${cfg.kind} ${doc[cfg.noField] || ''} marked as ${newStatus}.`, 'success');
      afterChange();
      open(_filter);
    }

    function remove(id) {
      const { doc } = findStored(id);
      const docNo = doc ? (doc[cfg.noField] || cfg.noun) : cfg.noun;
      if (typeof blockIfPreInvoiceReversed === 'function' && blockIfPreInvoiceReversed(doc, `${cfg.kind} ${docNo}`)) return;
      if (doc && typeof blockIfCreditUsed === 'function'
          && blockIfCreditUsed([`adv:${cfg.storeKey}:${doc.id}`], `${cfg.kind} ${docNo}`, 'deleted')) return;
      if (doc && doc.status === 'Completed') {
        showToast(`Completed ${cfg.plural.toLowerCase()} cannot be deleted.`, 'warning');
        return;
      }
      showKyaConfirm({
        title: `Delete ${cfg.kind}?`,
        message: `Permanently delete ${cfg.noun} <strong>${safeEsc(docNo)}</strong>?<br>This action cannot be undone.`,
        confirmLabel: '✕ Delete',
        okBg: '#dc2626',
        iconBg: '#fee2e2',
        iconColor: '#dc2626',
        iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        onConfirm: () => {
          if (doc && doc.advanceJournalEntryId && typeof removePreInvoiceAdvanceEntry === 'function') removePreInvoiceAdvanceEntry(doc);
          const S = store();
          S[cfg.storeKey] = S[cfg.storeKey].filter(d => String(d.id) !== String(id));
          S[cfg.draftsKey] = S[cfg.draftsKey].filter(d => String(d.id) !== String(id));
          showToast(`${cfg.kind} ${docNo} deleted successfully.`, 'success');
          afterChange();
          open(_filter);
        }
      });
    }

    function edit(id) {
      const doc = getAll().find(d => String(d.id) === String(id));
      if (!doc) { showToast(`${cfg.kind} not found.`, 'error'); return; }
      if (typeof blockIfPreInvoiceReversed === 'function' && blockIfPreInvoiceReversed(findStored(id).doc, `${cfg.kind} ${doc[cfg.noField] || ''}`)) return;
      if (doc.status === 'Completed') {
        showToast(`Completed ${cfg.plural.toLowerCase()} cannot be edited.`, 'warning');
        return;
      }
      cfg.openForm(doc, 'list');
    }

    // Called once the converted Sales Invoice is posted
    function markCompleted(id) {
      const { doc, isDraft } = findStored(id);
      if (!doc) return;
      doc.status = 'Completed';
      doc.updatedAt = Date.now();
      if (isDraft) promoteDraft(id, doc);
      if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
    }

    // ── Convert to Sale: load into a new Sales Invoice; it completes on posting ──
    function convertToInvoice(id) {
      const doc = getAll().find(d => String(d.id) === String(id));
      if (!doc) { showToast(`${cfg.kind} not found.`, 'error'); return; }
      if (typeof loadSalesInvoice !== 'function') return;

      const today = kyaLocalIso();
      const inv = {
        id: Date.now(),
        customerId: doc.customerId,
        customerName: doc.customerName,
        date: today,
        dueDate: doc.dueDate || doc.expiryDate || today,
        invoiceNo: '',
        salesSupplyType: (doc.supplyType && /State|SEZ|Export/i.test(doc.supplyType)) ? doc.supplyType : 'Intra-State (CGST + SGST)',
        salesExecutiveId: doc.salesExecutiveId || '',
        type: 'Product',
        paymentStatus: doc.paymentStatus || 'Not Paid',
        paymentAccountId: doc.paymentAccountId || '',
        paymentSplits: Array.isArray(doc.paymentSplits) ? JSON.parse(JSON.stringify(doc.paymentSplits)) : [],
        paymentAmount: doc.paymentAmount || '',
        advancePaidAmount: doc.advancePaidAmount || 0,
        advanceJournalEntryId: doc.advanceJournalEntryId || null,
        advanceVoucherNo: doc.advanceVoucherNo || null,
        notes: doc.notes ? `${doc.notes}\n[Converted from ${cfg.kind} ${doc[cfg.noField]}]` : `Converted from ${cfg.kind} ${doc[cfg.noField]}`,
        adjustments: doc.adjustments || 0,
        tdsTcsMode: doc.tdsTcsMode || 'None',
        tdsTcsRate: doc.tdsTcsRate || 0,
        tdsTcsAmount: doc.tdsTcsAmount || 0,
        subTotal: doc.subTotal,
        total: doc.total,
        rows: Array.isArray(doc.rows) ? JSON.parse(JSON.stringify(doc.rows)) : [],
        // Customer details changed on the document carry over to the invoice
        partyOverride: doc.partyOverride ? JSON.parse(JSON.stringify(doc.partyOverride)) : null,
        uploadedDoc: doc.document ? {
          fileName: doc.document.name,
          fileSize: doc.document.size ? `${(doc.document.size / 1024).toFixed(1)} KB` : '',
          fileData: doc.document.data
        } : null,
        mode: 'Auto',
        [cfg.convertField]: doc.id
      };
      // Only the advance still free comes across (Invoice Balance may have used some)
      if (typeof getConvertedAdvanceFields === 'function') Object.assign(inv, getConvertedAdvanceFields(cfg.storeKey, doc));

      if (typeof showSalesPreInvoiceCard === 'function') showSalesPreInvoiceCard('salesVoucherFormCard');
      currentSalesVoucherSubtype = 'Invoice';
      if (typeof updateVoucherSubtypeUI === 'function') updateVoucherSubtypeUI();
      loadSalesInvoice(inv, false);
      window._editingSalesInvoice = null;
      if (typeof setInvoiceNoMode === 'function') setInvoiceNoMode('Auto');
      const invNoEl = document.getElementById('salesInvoiceNo');
      const chipEl = document.getElementById('salesVoucherChipDisplay');
      if (invNoEl && (!invNoEl.value || !invNoEl.value.trim())) {
        const genNo = typeof getNextAutoInvoiceNumber === 'function' ? getNextAutoInvoiceNumber() : '';
        invNoEl.value = genNo;
        if (chipEl) chipEl.textContent = genNo || 'INV-XXXX';
      }
      showToast(`${cfg.kind} ${doc[cfg.noField]} loaded into Sales Invoice. Click Post Invoice to complete the conversion.`, 'info');
    }

    // ── List page ──
    function open(filterStatus) {
      if (typeof showSalesPreInvoiceCard === 'function') showSalesPreInvoiceCard(cfg.ids.listCard);
      _filter = filterStatus || 'all';
      const area = document.getElementById(cfg.ids.contentArea);
      if (area) {
        area.innerHTML = render();
        attachEvents();
      }
    }

    function close() {
      if (typeof showSalesPreInvoiceCard === 'function') showSalesPreInvoiceCard('salesPreInvoiceCard');
      if (typeof window.switchSalesPreInvTab === 'function') window.switchSalesPreInvTab('preinvoice');
    }

    function render() {
      const all = getAll();
      const P = cfg.ids.prefix;
      const term = (_search || '').trim().toLowerCase();
      const bySearch = items => !term ? items : items.filter(d =>
        (d[cfg.noField] || '').toLowerCase().includes(term) ||
        (d.customerName || '').toLowerCase().includes(term) ||
        (d.date || '').toLowerCase().includes(term) ||
        String(d.total || '').toLowerCase().includes(term) ||
        (Array.isArray(d.rows) && d.rows.some(r => (r.item || '').toLowerCase().includes(term))));

      const allCount = all.length;
      const activeCount = all.filter(isOpenStatus).length;
      const completedCount = all.filter(d => d.status === 'Completed').length;
      const cancelledCount = all.filter(d => d.status === 'Cancelled').length;

      let list = all;
      if (_filter === 'active') list = all.filter(isOpenStatus);
      else if (_filter === 'completed') list = all.filter(d => d.status === 'Completed');
      else if (_filter === 'cancelled') list = all.filter(d => d.status === 'Cancelled');
      else {
        // 'all': Active & Draft first, then Completed, then Cancelled (each by date desc)
        const order = { 'Active': 1, 'Draft': 1, '': 1, 'Completed': 2, 'Cancelled': 3 };
        list = [...all].sort((a, b) => {
          const oa = order[a.status] || 1, ob = order[b.status] || 1;
          if (oa !== ob) return oa - ob;
          if ((a.date || '') !== (b.date || '')) return (b.date || '').localeCompare(a.date || '');
          return (b.id || 0) - (a.id || 0);
        });
      }
      const items = bySearch(list);

      let tableHtml;
      if (allCount === 0) {
        tableHtml = `
          <div style="text-align: center; padding: 60px 20px; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 16px; box-shadow: var(--shadow-sm);">
            <div style="width: 56px; height: 56px; border-radius: 14px; background: #eff6ff; color: var(--blue-600); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">${cfg.iconSvg(28)}</div>
            <div style="font-weight: 800; font-size: 16px; color: var(--slate-800); margin-bottom: 6px;">No ${cfg.plural} Yet</div>
            <p style="font-size: 13px; color: var(--slate-500); max-width: 420px; margin: 0 auto 20px;">${cfg.emptyText}</p>
            <button class="btn btn-primary" id="btn${P}ListCreateFirst" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; padding: 8px 18px; border-radius: 8px; cursor: pointer;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Create First ${cfg.kind}
            </button>
          </div>`;
      } else {
        const rowsHtml = items.length === 0 ? `
          <tr>
            <td colspan="7" style="text-align: center; padding: 48px 20px; color: var(--slate-400);">
              <div style="font-weight: 700; font-size: 14px; color: var(--slate-600); margin-bottom: 4px;">No ${cfg.plural.toLowerCase()} found</div>
              <div style="font-size: 12.5px;">No ${cfg.plural.toLowerCase()} match the current filter or search query.</div>
            </td>
          </tr>` : items.map(d => {
          const itemsSummary = Array.isArray(d.rows) && d.rows.length > 0
            ? `${d.rows.length} ${d.rows.length === 1 ? 'item' : 'items'} (${safeEsc(d.rows[0].item || 'Item')}${d.rows.length > 1 ? ', …' : ''})`
            : '—';
          return `
            <tr data-doc-id="${safeEsc(d.id)}" style="border-bottom: 1px solid var(--slate-100); transition: background 0.15s; cursor: pointer;" onmouseover="this.style.background='var(--slate-50)'" onmouseout="this.style.background='transparent'" title="Click to view ${cfg.noun}">
              <td style="padding: 12px 16px;">
                <span style="font-family: monospace; font-weight: 800; color: var(--blue-700);">${safeEsc(d[cfg.noField] || cfg.noFallback)}</span>
                ${d.document && d.document.data ? `<span title="Attachment: ${safeEsc(d.document.name)}" style="margin-left: 6px; color: #3b82f6;">📎</span>` : ''}
              </td>
              <td style="padding: 12px 14px; white-space: nowrap; color: var(--slate-700);">${d.date || '—'}</td>
              <td style="padding: 12px 14px; white-space: nowrap; color: var(--slate-500); font-size: 12px;">${cfg.secondDate.get(d) || '—'}</td>
              <td style="padding: 12px 16px; font-weight: 600; color: var(--slate-800); max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${safeEsc(d.customerName || 'Customer')}
                ${d.salesExecutiveName ? `<div style="font-size: 11px; color: var(--slate-400); font-weight: 500;">By ${safeEsc(d.salesExecutiveName)}</div>` : ''}
              </td>
              <td style="padding: 12px 14px; font-size: 12px; color: var(--slate-600); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${itemsSummary}</td>
              <td style="padding: 12px 16px; text-align: right; font-weight: 800; color: var(--slate-900); white-space: nowrap;">
                ₹ ${safeFmtNum(d.total)}
                ${d.advancePaidAmount ? `<div style="font-size: 11px; color: #047857; font-weight: 600;">Adv: ₹${safeFmtNum(d.advancePaidAmount)}</div>` : ''}
              </td>
              <td style="padding: 12px 14px; text-align: center; white-space: nowrap;">${statusBadge(d)}</td>
            </tr>`;
        }).join('');

        const headerLabel = { active: 'Active', completed: 'Completed', cancelled: 'Cancelled' }[_filter] || 'All';
        tableHtml = `
          <div class="table-card" style="border: 1.5px solid var(--slate-200); border-radius: 12px; overflow: hidden; background: #fff; box-shadow: var(--shadow-sm); width: 100%;">
            <div style="background: var(--slate-50); border-bottom: 1.5px solid var(--slate-200); padding: 12px 20px; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-weight: 700; font-size: 14px; color: var(--slate-800);">${headerLabel} ${cfg.plural}</span>
                <span class="badge badge-blue" style="background: #eff6ff; color: #1d4ed8; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px;">${items.length}</span>
              </div>
            </div>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
                <thead>
                  <tr style="border-bottom: 1.5px solid var(--slate-200); color: var(--slate-500); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; background: #fafafa;">
                    <th style="padding: 10px 16px;">${cfg.kind.split(' ').pop()} No.</th>
                    <th style="padding: 10px 14px;">Date</th>
                    <th style="padding: 10px 14px;">${cfg.secondDate.label}</th>
                    <th style="padding: 10px 16px;">${cfg.partyColumn}</th>
                    <th style="padding: 10px 14px;">Items</th>
                    <th style="padding: 10px 16px; text-align: right;">Amount</th>
                    <th style="padding: 10px 14px; text-align: center;">Status</th>
                  </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
              </table>
            </div>
          </div>`;
      }

      const pill = (key, label, dot, on) => {
        const active = _filter === key;
        const count = { all: allCount, active: activeCount, completed: completedCount, cancelled: cancelledCount }[key];
        return `
            <button type="button" class="quote-filter-pill ${active ? 'active' : ''}" data-filter="${key}" style="height: 42px; border: 1.5px solid ${active ? on.border : 'var(--slate-200)'}; background: ${active ? on.bg : '#fff'}; color: ${active ? on.color : 'var(--slate-600)'}; padding: 0 16px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: all 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
              ${dot ? `<span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${dot};"></span>` : ''}
              <span>${label}</span>
              <span style="background: ${active ? on.countBg : 'var(--slate-100)'}; color: ${active ? on.countColor : 'var(--slate-600)'}; font-size: 11px; padding: 2px 8px; border-radius: 10px;">${count}</span>
            </button>`;
      };

      return `
        <div class="quotation-list-container" style="width: 100%;">
          <div class="ptb" style="margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;">
            <div class="pt-search-wrap" style="flex: 1; min-width: 280px; position: relative;">
              <svg class="pt-search-icon" width="16" height="16" viewBox="0 0 15 15" fill="none" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--slate-400); pointer-events: none;">
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.5"/>
                <path d="M10 10l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <input type="text" id="${P}ListSearchInput" class="pt-search-inp" placeholder="Search ${cfg.noun} #, customer, item, date, amount…" value="${safeEsc(_search)}" style="width: 100%; height: 42px; padding: 10px 38px 10px 42px; font-size: 13.5px; border: 1.5px solid var(--slate-200); border-radius: 10px; background: #fff; box-sizing: border-box; outline: none; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.03);" onfocus="this.style.borderColor='var(--blue-500)'; this.style.boxShadow='0 0 0 3px rgba(37,99,235,0.1)';" onblur="this.style.borderColor='var(--slate-200)'; this.style.boxShadow='none';" />
              ${_search ? `<button type="button" id="btn${P}ListClearSearch" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); border: none; background: none; color: var(--slate-400); cursor: pointer; font-size: 15px; padding: 4px; display: flex; align-items: center; justify-content: center;" title="Clear search">✕</button>` : ''}
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
              ${pill('all', 'All', '', { border: 'var(--blue-600)', bg: 'var(--blue-50)', color: 'var(--blue-700)', countBg: 'var(--blue-200)', countColor: 'var(--blue-800)' })}
              ${pill('active', 'Active', '#10b981', { border: '#10b981', bg: '#ecfdf5', color: '#047857', countBg: '#a7f3d0', countColor: '#065f46' })}
              ${pill('completed', 'Completed', '#3b82f6', { border: 'var(--blue-600)', bg: '#eff6ff', color: '#1d4ed8', countBg: '#bfdbfe', countColor: '#1e40af' })}
              ${pill('cancelled', 'Cancelled', '#94a3b8', { border: 'var(--slate-400)', bg: '#f1f5f9', color: '#334155', countBg: '#cbd5e1', countColor: '#1e293b' })}
            </div>
          </div>
          <div>${tableHtml}</div>
        </div>`;
    }

    function rerender(focusSearch) {
      const area = document.getElementById(cfg.ids.contentArea);
      if (!area) return;
      area.innerHTML = render();
      attachEvents();
      if (focusSearch) {
        const inp = document.getElementById(`${cfg.ids.prefix}ListSearchInput`);
        if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
      }
    }

    function attachEvents() {
      const area = document.getElementById(cfg.ids.contentArea);
      if (!area) return;
      const P = cfg.ids.prefix;

      const searchInput = document.getElementById(`${P}ListSearchInput`);
      if (searchInput) {
        searchInput.addEventListener('input', e => { _search = e.target.value; rerender(true); });
      }
      const clearBtn = document.getElementById(`btn${P}ListClearSearch`);
      if (clearBtn) clearBtn.addEventListener('click', () => { _search = ''; rerender(true); });

      area.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => open(btn.dataset.filter));
      });
      area.querySelectorAll('tr[data-doc-id]').forEach(tr => {
        tr.addEventListener('click', () => view(tr.dataset.docId));
      });
      const createBtn = document.getElementById(`btn${P}ListCreateFirst`);
      if (createBtn) createBtn.addEventListener('click', () => cfg.openForm(null, 'list'));
    }

    // ── Preview ──
    function view(id) {
      const doc = getAll().find(d => String(d.id) === String(id));
      if (!doc) { showToast(`${cfg.kind} not found.`, 'error'); return; }

      const activeCo = (typeof getActiveCompany === 'function' ? getActiveCompany() : null) || {};
      const masterCustomer = (typeof findPartyById === 'function' ? findPartyById(doc.customerId, 'Customer') : null) ||
                       { name: doc.customerName || 'Customer' };
      // With the customer details changed for this document only (Customer Details card)
      const customer = typeof mergePartyOverride === 'function' ? mergePartyOverride(masterCustomer, doc.partyOverride) : masterCustomer;
      const partyName = customer.name || doc.customerName || 'Customer';
      const cityPin = [customer.city, customer.pincode].filter(Boolean).join(' - ');
      const stateCountry = [customer.state, customer.country || 'India'].filter(Boolean).join(', ');
      const partyPhone = customer.phone || customer.mobile || '';
      const docNo = doc[cfg.noField] || cfg.noFallback;

      const rowsHtml = (Array.isArray(doc.rows) ? doc.rows : []).map((r, i) => {
        const qty = parseFloat(r.qty) || 1;
        const rate = parseFloat(r.rate) || 0;
        const base = qty * rate;
        const disc = parseFloat(r.discount) || 0;
        const discAmt = r.discountType === 'pct' ? (base * (disc / 100)) : disc;
        const taxRate = parseFloat(r.tax) || 0;
        const totalAmt = (base - discAmt) * (1 + taxRate / 100);
        const discStr = disc > 0 ? (r.discountType === 'pct' ? `${disc}% (₹${safeFmtNum(discAmt)})` : `₹${safeFmtNum(disc)}`) : '—';
        return `
          <tr style="border-bottom: 1px solid var(--slate-100);">
            <td style="padding: 10px; font-weight: 500; color: #94a3b8; font-size: 12px;">${i + 1}</td>
            <td style="padding: 10px; font-weight: 600; color: var(--slate-800);">${safeEsc(r.item || 'Item')}</td>
            <td style="padding: 10px; font-family: monospace; font-size: 12px; color: var(--slate-600);">${safeEsc(r.hsn || '—')}</td>
            <td style="padding: 10px; text-align: right;">${qty} ${r.unit ? safeEsc(r.unit) : ''}</td>
            <td style="padding: 10px; text-align: right;">₹ ${safeFmtNum(rate)}</td>
            <td style="padding: 10px; text-align: right; color: var(--slate-600);">${discStr}</td>
            <td style="padding: 10px; text-align: right; color: var(--slate-600);">${taxRate}%</td>
            <td style="padding: 10px; text-align: right; font-weight: 700; color: var(--blue-700);">₹ ${safeFmtNum(totalAmt)}</td>
          </tr>`;
      }).join('');

      const actBtnStyle = 'padding: 8px 16px;';
      let statusActionsHtml = '';
      if (isOpenStatus(doc) || doc.isDraft) {
        statusActionsHtml = `
          <button type="button" data-act="convert" class="btn btn-secondary" style="${actBtnStyle}">Convert to Sale</button>
          <button type="button" data-act="complete" class="btn btn-secondary" style="${actBtnStyle}">Mark Completed</button>
          <button type="button" data-act="cancel" class="btn btn-secondary" style="${actBtnStyle}">Mark Cancelled</button>`;
      } else if (doc.status === 'Cancelled') {
        // Only cancelled documents can be reopened; completed ones are final
        statusActionsHtml = `<button type="button" data-act="reopen" class="btn btn-secondary" style="${actBtnStyle}">Reopen</button>`;
      }

      const hdrIconBtn = (act, title, svg) => `
            <button type="button" data-act="${act}" title="${title}" aria-label="${title}" style="background: rgba(255,255,255,0.15); border: none; border-radius: 8px; width: 34px; height: 34px; padding: 0; cursor: pointer; color: #fff; display: flex; align-items: center; justify-content: center; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">${svg}</button>`;
      const meta = (label, value) => `
                <div>
                  <div style="color: var(--slate-400); font-weight: 600; font-size: 11px; text-transform: uppercase;">${label}</div>
                  <div style="font-weight: 700; color: var(--slate-800); margin-top: 2px;">${value}</div>
                </div>`;

      const overlay = document.createElement('div');
      overlay.className = 'inv-modal-overlay';
      overlay.setAttribute('tabindex', '-1');
      overlay.innerHTML = `
        <div class="inv-modal-card">
          <div class="inv-modal-hdr" style="background: linear-gradient(90deg, #1d4ed8, #2563eb); flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="color: #fff; display: inline-flex;">${cfg.iconSvg(22)}</span>
              <div>
                <span style="font-weight: 700; font-size: 16px;">${cfg.kind} Preview</span>
                <span style="margin-left: 8px; font-family: monospace; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 6px; font-size: 13px;">${safeEsc(docNo)}</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; margin-left: auto;">
              <div class="rpt-more-wrap" style="position: relative;">
                <button class="btn btn-secondary" data-act="export" type="button" style="background: rgba(255,255,255,0.18); color: #fff; border: 1.5px solid rgba(255,255,255,0.35); font-weight: 700; padding: 7px 14px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; font-size: 13px; height: 36px; transition: all 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.28)'" onmouseout="this.style.background='rgba(255,255,255,0.18)'">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span>Export</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <div data-role="export-menu" style="display: none; position: absolute; right: 0; top: calc(100% + 6px); background: #fff; border: 1.5px solid var(--slate-200); border-radius: 10px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1); z-index: 10006; min-width: 145px; overflow: hidden; padding: 4px 0;">
                  <button type="button" data-act="pdf" class="rpt-menu-item" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 16px; border: none; background: none; font-size: 13px; font-weight: 600; color: var(--slate-700); cursor: pointer; text-align: left;" onmouseover="this.style.background='var(--slate-50)'" onmouseout="this.style.background='none'">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                    <span>PDF</span>
                  </button>
                  <button type="button" data-act="excel" class="rpt-menu-item" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 16px; border: none; background: none; font-size: 13px; font-weight: 600; color: var(--slate-700); cursor: pointer; text-align: left; border-top: 1px solid var(--slate-100);" onmouseover="this.style.background='var(--slate-50)'" onmouseout="this.style.background='none'">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="17"></line><line x1="16" y1="13" x2="8" y2="17"></line></svg>
                    <span>Excel</span>
                  </button>
                </div>
              </div>
              ${doc.status === 'Completed' ? '' : `
              ${hdrIconBtn('edit', `Edit ${cfg.kind}`, '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>')}
              ${hdrIconBtn('delete', `Delete ${cfg.kind}`, '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>')}`}
              <button type="button" data-act="close" title="Close Preview" style="background: rgba(255,255,255,0.18); border: none; color: #fff; font-size: 18px; cursor: pointer; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; line-height: 1;" onmouseover="this.style.background='rgba(255,255,255,0.28)'" onmouseout="this.style.background='rgba(255,255,255,0.18)'">✕</button>
            </div>
          </div>

          ${statusActionsHtml ? `
          <div class="quote-preview-action-bar no-print" style="background: #f8fafc; border-bottom: 1.5px solid var(--slate-200); padding: 12px 28px; display: flex; align-items: center; justify-content: flex-start; gap: 8px; flex-wrap: wrap;">
            ${statusActionsHtml}
          </div>` : ''}

          <div class="inv-modal-body">
            <div class="inv-paper">
              <div style="display: flex; justify-content: space-between; border-bottom: 2px solid var(--slate-100); padding-bottom: 24px; margin-bottom: 24px;">
                <div>
                  <div style="font-size: 22px; font-weight: 800; color: var(--blue-800);">${safeEsc(activeCo.name || 'KYA Accounting')}</div>
                  ${activeCo.address ? `<div style="font-size: 12.5px; color: var(--slate-500); margin-top: 4px;">${safeEsc(activeCo.address)}</div>` : ''}
                  ${activeCo.gstin ? `<div style="font-size: 12px; color: var(--slate-600); margin-top: 2px;">GSTIN: <strong>${safeEsc(activeCo.gstin)}</strong></div>` : ''}
                  ${activeCo.phone ? `<div style="font-size: 12px; color: var(--slate-600);">Phone: ${safeEsc(activeCo.phone)}</div>` : ''}
                </div>
                <div style="text-align: right;">
                  <h1 style="font-size: 28px; font-weight: 900; color: var(--slate-800); margin: 0; text-transform: uppercase;">${cfg.kind}</h1>
                  <div style="font-size: 15px; font-weight: 800; color: var(--blue-700); margin-top: 4px; font-family: monospace;">${safeEsc(docNo)}</div>
                  <div style="margin-top: 6px;">${statusBadge(doc, 'lg')}</div>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 30px; border-bottom: 2px solid var(--slate-100); padding-bottom: 24px; margin-bottom: 24px;">
                <div>
                  <h3 style="font-size: 11px; text-transform: uppercase; color: var(--slate-400); letter-spacing: 0.08em; margin-bottom: 8px; font-weight: 700;">${cfg.forLabel}</h3>
                  <div style="font-size: 16px; font-weight: 800; color: var(--slate-900);">${safeEsc(partyName)}</div>
                  ${customer.contactName ? `<div style="font-size: 12.5px; color: var(--slate-600); margin-top: 2px;">Attn: ${safeEsc(customer.contactName)}</div>` : ''}
                  ${customer.address ? `<div style="font-size: 12px; color: var(--slate-600); margin-top: 4px;">${safeEsc(customer.address)}</div>` : ''}
                  ${(cityPin || stateCountry) ? `<div style="font-size: 12px; color: var(--slate-600); margin-top: 2px;">${safeEsc([cityPin, stateCountry].filter(Boolean).join(', '))}</div>` : ''}
                  ${customer.gstin ? `<div style="font-size: 12px; color: var(--slate-700); margin-top: 4px;">GSTIN: <strong style="font-family: monospace; color: #047857;">${safeEsc(customer.gstin)}</strong></div>` : ''}
                  ${partyPhone ? `<div style="font-size: 12px; color: var(--slate-600); margin-top: 2px;">Phone: ${safeEsc(partyPhone)}</div>` : ''}
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 13px;">
                  ${meta(cfg.previewDateLabel, doc.date || '—')}
                  ${meta(`${cfg.secondDate.label}:`, cfg.secondDate.get(doc) || '—')}
                  ${meta(cfg.supplyLabel, safeEsc(doc.supplyType || '—'))}
                  <div>
                    <div style="color: var(--slate-400); font-weight: 600; font-size: 11px; text-transform: uppercase;">Advance Payment:</div>
                    <div style="margin-top: 4px;">${payStatusBadge(doc)}</div>
                    ${(doc.paymentStatus !== 'Not Paid' && (doc.advancePaidAmount || doc.paymentAmount)) ? `
                      <div style="font-size: 11.5px; color: var(--slate-600); margin-top: 4px;">
                        <strong>Advance:</strong> ₹${safeFmtNum(doc.advancePaidAmount || doc.paymentAmount)}
                        ${doc.advanceVoucherNo ? `<span style="font-family: monospace; color: var(--blue-700); font-weight: 700; margin-left: 4px;">[${safeEsc(doc.advanceVoucherNo)}]</span>` : ''}
                      </div>` : ''}
                  </div>
                  ${doc.salesExecutiveName ? `
                <div style="grid-column: 1 / -1;">
                  <div style="color: var(--slate-400); font-weight: 600; font-size: 11px; text-transform: uppercase;">${cfg.preparedLabel}</div>
                  <div style="font-weight: 700; color: var(--slate-800); margin-top: 2px;">${safeEsc(doc.salesExecutiveName)}</div>
                </div>` : ''}
                </div>
              </div>

              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
                <thead>
                  <tr style="border-bottom: 2px solid var(--slate-200); background: var(--slate-50);">
                    <th style="padding: 10px; text-align: left; font-weight: 700; color: var(--slate-500); width: 36px;">#</th>
                    <th style="padding: 10px; text-align: left; font-weight: 700; color: var(--slate-500);">Description</th>
                    <th style="padding: 10px; text-align: left; font-weight: 700; color: var(--slate-500); width: 80px;">HSN/SAC</th>
                    <th style="padding: 10px; text-align: right; font-weight: 700; color: var(--slate-500); width: 70px;">Qty</th>
                    <th style="padding: 10px; text-align: right; font-weight: 700; color: var(--slate-500); width: 100px;">Rate</th>
                    <th style="padding: 10px; text-align: right; font-weight: 700; color: var(--slate-500); width: 80px;">Discount</th>
                    <th style="padding: 10px; text-align: right; font-weight: 700; color: var(--slate-500); width: 70px;">Tax</th>
                    <th style="padding: 10px; text-align: right; font-weight: 700; color: var(--slate-500); width: 130px;">Amount</th>
                  </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
              </table>

              <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 30px; margin-top: 20px;">
                <div>
                  <h4 style="font-size: 11px; text-transform: uppercase; color: var(--slate-400); letter-spacing: 0.05em; margin-bottom: 6px; font-weight: 700;">Terms & Notes:</h4>
                  <div style="font-size: 12.5px; color: var(--slate-600); line-height: 1.5; white-space: pre-wrap;">${safeEsc(doc.notes) || cfg.defaultNotes}</div>
                  ${doc.paymentStatus !== 'Not Paid' && doc.paymentAccountName ? `
                    <div style="margin-top: 10px; font-size: 12.5px; color: var(--slate-700); background: #f8fafc; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                      <strong>Advance Account:</strong> ${safeEsc(doc.paymentAccountName)}
                      ${doc.paymentAmount ? ` &bull; <strong>Advance Amount:</strong> ₹ ${safeFmtNum(doc.paymentAmount)}` : ''}
                    </div>` : ''}
                  ${doc.document && doc.document.data ? `
                    <div style="margin-top: 12px; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                      <span style="font-size: 12px; font-weight: 600; color: var(--slate-700);">📎 ${safeEsc(doc.document.name)}</span>
                      <a href="${doc.document.data}" download="${safeEsc(doc.document.name)}" style="font-size: 11px; font-weight: 700; color: #2563eb; text-decoration: none;">Download</a>
                    </div>` : ''}
                </div>
                <div>
                  <div style="background: var(--slate-50); border: 1px solid var(--slate-100); border-radius: 12px; padding: 16px 20px;">
                    <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--slate-600); margin-bottom: 6px;">
                      <span>Subtotal</span><span style="font-weight: 600;">₹ ${safeFmtNum(doc.subTotal)}</span>
                    </div>
                    ${doc.tdsTcsMode && doc.tdsTcsMode !== 'None' ? `
                      <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--slate-600); margin-bottom: 6px;">
                        <span>${doc.tdsTcsMode} (${doc.tdsTcsRate || 0}%)</span><span style="font-weight: 600;">${doc.tdsTcsMode === 'TDS' ? '-' : '+'} ₹ ${safeFmtNum(doc.tdsTcsAmount)}</span>
                      </div>` : ''}
                    ${doc.adjustments ? `
                      <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--slate-600); margin-bottom: 6px;">
                        <span>Adjustments / Round-off</span><span style="font-weight: 600;">₹ ${safeFmtNum(doc.adjustments)}</span>
                      </div>` : ''}
                    <div style="display: flex; justify-content: space-between; font-size: 17px; font-weight: 800; color: var(--blue-800); border-top: 1.5px solid var(--slate-200); padding-top: 10px; margin-top: 6px;">
                      <span>Grand Total</span><span>₹ ${safeFmtNum(doc.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style="margin-top: 50px; border-top: 1px solid var(--slate-100); padding-top: 16px; text-align: center; font-size: 11.5px; color: var(--slate-400);">${cfg.footerText}</div>
            </div>
          </div>
        </div>`;

      document.body.appendChild(overlay);
      overlay.focus();

      const exportMenu = overlay.querySelector('[data-role="export-menu"]');
      const noHtml = `<strong>${safeEsc(docNo)}</strong>`;
      const exportDoc = { ...doc, proformaNo: docNo };
      const confirmThen = (opts, fn) => showKyaConfirm(Object.assign({}, opts, { onConfirm: () => { overlay.remove(); fn(); } }));

      const actions = {
        close: () => overlay.remove(),
        export: () => { exportMenu.style.display = exportMenu.style.display === 'block' ? 'none' : 'block'; },
        pdf: async () => {
          exportMenu.style.display = 'none';
          if (typeof window.exportProformaToPDF === 'function') await window.exportProformaToPDF(exportDoc, cfg.exportLabels.pdf);
          else window.print();
        },
        excel: async () => {
          exportMenu.style.display = 'none';
          if (typeof window.exportProformaToExcel === 'function') await window.exportProformaToExcel(exportDoc, cfg.exportLabels.excel);
          else if (typeof window.exportProformaToCsvFallback === 'function') window.exportProformaToCsvFallback(exportDoc, cfg.exportLabels.excel);
        },
        edit: () => { overlay.remove(); edit(doc.id); },
        delete: () => { overlay.remove(); remove(doc.id); },
        reopen: () => { overlay.remove(); setStatus(doc.id, 'Active'); },
        convert: () => confirmThen({
          title: 'Convert to Sale?',
          message: `Convert ${cfg.noun} ${noHtml} to a Sales Invoice?<br>It will be marked Completed once the invoice is posted.`,
          confirmLabel: 'Convert to Sale',
          okBg: '#2563eb',
          iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 14h8M13 11l3 3-3 3"/></svg>'
        }, () => convertToInvoice(doc.id)),
        complete: () => confirmThen({
          title: 'Mark as Completed?',
          message: `Mark ${cfg.noun} ${noHtml} as Completed?<br>Completed ${cfg.plural.toLowerCase()} cannot be reopened.`,
          confirmLabel: 'Mark Completed',
          okBg: '#2563eb',
          iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
        }, () => setStatus(doc.id, 'Completed')),
        cancel: () => confirmThen({
          title: 'Mark as Cancelled?',
          message: `Mark ${cfg.noun} ${noHtml} as Cancelled?<br>Its advance entry is removed; you can reopen it later if needed.`,
          confirmLabel: 'Mark Cancelled',
          okBg: '#dc2626',
          iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
        }, () => setStatus(doc.id, 'Cancelled'))
      };

      overlay.addEventListener('click', e => {
        const btn = e.target.closest('[data-act]');
        if (btn && overlay.contains(btn)) {
          e.stopPropagation();
          actions[btn.dataset.act]();
          return;
        }
        if (exportMenu) exportMenu.style.display = 'none';
        if (e.target === overlay) overlay.remove();
      });
      overlay.addEventListener('keydown', e => {
        if (e.key === 'Escape') overlay.remove();
      });
    }

    window[cfg.api.openList] = open;
    window[cfg.api.closeList] = close;
    window[cfg.api.view] = view;
    window[cfg.api.markCompleted] = markCompleted;
    if (cfg.api.convert) window[cfg.api.convert] = convertToInvoice;

    return { open, close, getAll, view, edit, remove, setStatus, markCompleted, convertToInvoice, currentFilter: () => _filter };
  }

  window.createPreInvoiceDocList = createPreInvoiceDocList;
})();
