/**
 * js/doc-numbering.js
 * Document numbers for the Quotation, Proforma Invoice, Sales Order and Delivery Challan
 * (KYA), working like the Sales Invoice number:
 *  - a pencil in the number box opens the Number Format popup (prefix, starting number,
 *    digits) — the same popup as the invoice (openKyaNumberingModal in sales-form.js);
 *  - a new document takes the next number from that format, skipping any number in use;
 *  - once a document is saved its number stays used, even after it is deleted, so it is
 *    never issued again;
 *  - a number already in use is flagged under the box and refused on save.
 * Settings and the used-number register share KYA_STORE.salesNumbering /
 * salesUsedInvoiceNos with the invoice, keyed by kind.
 */
(function() {
  'use strict';

  const DOC_KINDS = {
    quotation: {
      noun: 'Quotation', store: 'quotations', drafts: 'quotationsDrafts',
      noField: 'quoteNo', inputId: 'quoteNo', chipId: 'quoteChipDisplay'
    },
    proforma: {
      noun: 'Proforma Invoice', store: 'proformaInvoices', drafts: 'proformaInvoicesDrafts',
      noField: 'proformaNo', inputId: 'proformaNo', chipId: 'proformaChipDisplay'
    },
    salesOrder: {
      noun: 'Sales Order', store: 'salesOrders', drafts: 'salesOrdersDrafts',
      noField: 'orderNo', inputId: 'orderNo', chipId: 'orderChipDisplay'
    },
    deliveryChallan: {
      noun: 'Delivery Challan', store: 'deliveryChallans', drafts: 'deliveryChallansDrafts',
      noField: 'challanNo', inputId: 'challanNo', chipId: 'challanChipDisplay'
    }
  };

  // Per form: returns the id of the document open on it (null for a new one)
  const _ownIdGetters = {};

  const $ = id => document.getElementById(id);
  const norm = no => String(no || '').trim().toLowerCase();

  function settingsOf(kind) {
    if (typeof getSalesNumberingSettings === 'function') return getSalesNumberingSettings(kind);
    return { prefix: '', start: 1, digits: 3 };
  }

  function format(settings, n) {
    return settings.prefix + String(n).padStart(settings.digits, '0');
  }

  // The stored document (saved or draft) with this id
  function findDoc(kind, id) {
    const cfg = DOC_KINDS[kind];
    if (!cfg || id === null || id === undefined || id === '') return null;
    const S = window.KYA_STORE || {};
    return (S[cfg.store] || []).concat(S[cfg.drafts] || []).find(d => d && String(d.id) === String(id)) || null;
  }

  // Every number in use for this kind: the register of numbers ever saved, plus the
  // documents on file (saved and drafts), leaving out the one with `exceptId`
  function getUsedDocNos(kind, exceptId) {
    const cfg = DOC_KINDS[kind];
    const S = window.KYA_STORE || {};
    const used = new Set(((S.salesUsedInvoiceNos || {})[kind] || []).map(norm));
    if (!cfg) return used;
    (S[cfg.store] || []).concat(S[cfg.drafts] || []).forEach(d => {
      if (!d || (exceptId !== undefined && exceptId !== null && String(d.id) === String(exceptId))) return;
      const no = norm(d[cfg.noField]);
      if (no) used.add(no);
    });
    return used;
  }

  // True when the number is taken. The document being edited may keep its own number.
  function isDocNoUsed(kind, docNo, ownId) {
    const no = norm(docNo);
    if (!no) return false;
    const own = findDoc(kind, ownId);
    if (own && norm(own[DOC_KINDS[kind].noField]) === no) return false;
    return getUsedDocNos(kind, ownId).has(no);
  }

  function getNextDocNo(kind) {
    const s = settingsOf(kind);
    const used = getUsedDocNos(kind, null);
    let n = s.start;
    while (used.has(format(s, n).toLowerCase())) n++;
    return format(s, n);
  }

  // Called once a document is saved (not as a draft): its number is used for good
  function registerDocNo(kind, docNo) {
    if (typeof registerUsedSalesInvoiceNo === 'function') registerUsedSalesInvoiceNo(kind, docNo);
  }

  function ownIdOf(kind) {
    const get = _ownIdGetters[kind];
    return typeof get === 'function' ? get() : null;
  }

  // Shows or clears the "already used" line under the number box
  function validateDocNoField(kind) {
    const cfg = DOC_KINDS[kind];
    const inp = cfg && $(cfg.inputId);
    if (!inp) return true;
    const no = inp.value.trim();
    const used = isDocNoUsed(kind, no, ownIdOf(kind));
    inp.style.borderColor = used ? '#ef4444' : '';
    const wrap = inp.parentElement;
    if (wrap) {
      wrap.classList.toggle('has-invno-error', used);
      if (used) wrap.setAttribute('data-error-full', `"${no}" is already used. ${cfg.noun} numbers can't be reused, even after deletion.`);
      else wrap.removeAttribute('data-error-full');
    }
    const err = $(`${cfg.inputId}Error`);
    if (err) {
      err.textContent = used ? `"${no}" is already used` : '';
      err.style.display = used ? 'block' : 'none';
    }
    return !used;
  }

  // On save: refuses a number already in use (with the same message as the invoice)
  function checkDocNoBeforeSave(kind, docNo, ownId) {
    if (!isDocNoUsed(kind, docNo, ownId)) return true;
    if (typeof showToast === 'function') {
      showToast(`${DOC_KINDS[kind].noun} No. "${String(docNo).trim()}" is already used (even deleted numbers can't be reused). Please use another number.`, 'danger');
    }
    validateDocNoField(kind);
    $(DOC_KINDS[kind].inputId)?.focus();
    return false;
  }

  // The number box shows the format's first number as its placeholder
  function refreshDocNoPlaceholder(kind) {
    const cfg = DOC_KINDS[kind];
    const inp = cfg && $(cfg.inputId);
    if (!inp) return;
    const s = settingsOf(kind);
    inp.placeholder = format(s, s.start);
  }

  function openDocNumberingModal(kind) {
    const cfg = DOC_KINDS[kind];
    if (!cfg || typeof openKyaNumberingModal !== 'function') return;
    openKyaNumberingModal({
      kind,
      noun: cfg.noun,
      getUsed: () => getUsedDocNos(kind, null),
      onSaved: () => {
        refreshDocNoPlaceholder(kind);
        // A new document takes the new format; a saved one keeps its number
        if (!findDoc(kind, ownIdOf(kind))) {
          const inp = $(cfg.inputId);
          const chip = $(cfg.chipId);
          if (inp) inp.value = getNextDocNo(kind);
          if (chip && inp) chip.textContent = inp.value;
        }
        validateDocNoField(kind);
      }
    });
  }

  // Wires a form's number box once: the pencil, and the "already used" check while typing.
  // getOwnId → the id of the document open on the form (null for a new one).
  function wireDocNumberField(kind, getOwnId) {
    const cfg = DOC_KINDS[kind];
    if (!cfg) return;
    _ownIdGetters[kind] = getOwnId;
    const inp = $(cfg.inputId);
    const btn = $(`${cfg.inputId}FormatBtn`);
    if (inp && !inp._docNoWired) {
      inp._docNoWired = true;
      inp.addEventListener('input', () => validateDocNoField(kind));
    }
    if (btn && !btn._docNoWired) {
      btn._docNoWired = true;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openDocNumberingModal(kind);
      });
    }
    refreshDocNoPlaceholder(kind);
  }

  // ── Save Draft is for a new document or a draft. One already saved (Active, Cancelled…)
  // is changed with Save: turning it back into a draft would leave the saved copy showing
  // (the draft hidden behind it) and take its advance out of the books. ──
  const DRAFT_BUTTONS = {
    quotation: 'btnSaveQuoteDraft',
    proforma: 'btnSaveProformaDraft',
    salesOrder: 'btnSaveOrderDraft',
    deliveryChallan: 'btnSaveChallanDraft'
  };

  function isSavedDoc(kind, id) {
    const cfg = DOC_KINDS[kind];
    if (!cfg || id === null || id === undefined || id === '') return false;
    return ((window.KYA_STORE || {})[cfg.store] || []).some(d => d && String(d.id) === String(id));
  }

  // Shows Save Draft on the form unless the document open on it is already saved
  function syncDocDraftButton(kind, docId) {
    const btn = $(DRAFT_BUTTONS[kind]);
    if (btn) btn.style.display = isSavedDoc(kind, docId) ? 'none' : '';
  }

  // On Save Draft: refused for a saved document
  function checkDocDraftAllowed(kind, docId) {
    if (!isSavedDoc(kind, docId)) return true;
    if (typeof showToast === 'function') {
      showToast(`This ${DOC_KINDS[kind].noun} is already saved — use Save to keep the changes.`, 'warning');
    }
    return false;
  }

  window.syncDocDraftButton = syncDocDraftButton;
  window.checkDocDraftAllowed = checkDocDraftAllowed;
  window.getNextDocNo = getNextDocNo;
  window.isDocNoUsed = isDocNoUsed;
  window.registerDocNo = registerDocNo;
  window.validateDocNoField = validateDocNoField;
  window.checkDocNoBeforeSave = checkDocNoBeforeSave;
  window.openDocNumberingModal = openDocNumberingModal;
  window.wireDocNumberField = wireDocNumberField;
})();
