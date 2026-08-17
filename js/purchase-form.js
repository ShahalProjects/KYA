// ══════════════════════════════════════════════════════════════════
//  PURCHASE VOUCHER MODULE (Form, line items, product/expense portal, calculations)
// ══════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  // Ensure KYA_STORE pre-init
  if (!window.KYA_STORE) window.KYA_STORE = {};
  if (!window.KYA_STORE.purchaseVouchers) window.KYA_STORE.purchaseVouchers = [];
  if (!window.KYA_STORE.purchaseVouchersDrafts) window.KYA_STORE.purchaseVouchersDrafts = [];
  if (!window.KYA_STORE.purchaseInvoiceCtr) window.KYA_STORE.purchaseInvoiceCtr = 1;

  let purchaseRows = [];
  let _editingPurchaseVoucher = null;
  let purchaseUploadedDoc = null;

  function ohEsc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ══════════════════════════════════════════════════════════════════
  //  PURCHASE ITEM PORTAL (All / Product / Expense Dropdown)
  // ══════════════════════════════════════════════════════════════════
  const _purchaseItemPortal = (() => {
    let el = document.getElementById('purchase-item-portal-dropdown');
    if (!el) {
      el = document.createElement('div');
      el.id = 'purchase-item-portal-dropdown';
      el.style.cssText = `
        position: fixed;
        z-index: 99999;
        background: #ffffff;
        border: 1.5px solid #e2e8f0;
        border-radius: 14px;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,.06), 0 12px 32px -4px rgba(0,0,0,.14), 0 0 0 1px rgba(0,0,0,.02);
        max-height: 320px;
        overflow-y: auto;
        overflow-x: hidden;
        display: none;
        min-width: 280px;
        font-family: Inter, sans-serif;
        scrollbar-width: thin;
        scrollbar-color: #cbd5e1 transparent;
      `;
      document.body.appendChild(el);
    }

    if (!document.getElementById('purchase-item-portal-styles')) {
      const style = document.createElement('style');
      style.id = 'purchase-item-portal-styles';
      style.textContent = `
        #purchase-item-portal-dropdown.open {
          display: block !important;
          animation: jeDropIn .14s cubic-bezier(.2,0,.2,1);
        }
      `;
      document.head.appendChild(style);
    }

    let _activeInp    = null;
    let _activeCb     = null;
    let _highlightIdx = -1;
    let _open         = false;
    let _activeFilter = 'all'; // 'all', 'product', 'expense'

    function _items() { return el.querySelectorAll('.je-drop-item'); }

    function _setHL(idx) {
      const items = _items();
      items.forEach(it => it.classList.remove('highlighted'));
      _highlightIdx = idx;
      if (idx >= 0 && idx < items.length) {
        items[idx].classList.add('highlighted');
        items[idx].scrollIntoView({ block: 'nearest' });
      }
    }

    function _position(inp) {
      const r          = inp.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom - 8;
      const spaceAbove = r.top - 8;
      const maxH       = Math.min(320, Math.max(spaceBelow, spaceAbove) - 8);
      el.style.maxHeight = maxH + 'px';
      el.style.width     = Math.max(r.width, 320) + 'px';
      el.style.left      = r.left + 'px';
      if (spaceBelow >= 160 || spaceBelow >= spaceAbove) {
        el.style.top    = (r.bottom + 6) + 'px';
        el.style.bottom = 'auto';
      } else {
        el.style.top    = 'auto';
        el.style.bottom = (window.innerHeight - r.top + 6) + 'px';
      }
    }

    function getProductsList() {
      const set = new Set();
      set.add('Raw Materials');
      set.add('Stock Item A');
      set.add('Finished Goods');
      set.add('Product Goods');
      set.add('Packaging Materials');
      set.add('Office Supplies');
      
      if (window.KYA_STORE && window.KYA_STORE.purchaseVouchers) {
        window.KYA_STORE.purchaseVouchers.forEach(v => {
          if (v.rows) {
            v.rows.forEach(r => {
              if (r.item && (!r.itemType || r.itemType === 'Product')) set.add(r.item);
            });
          }
        });
      }
      return Array.from(set).map(name => ({ name, type: 'Product' }));
    }

    function getExpensesList() {
      const ledgers = typeof coaLedgers !== 'undefined' ? coaLedgers : [];
      const sgs = typeof COA_SYS_SGS !== 'undefined' && Array.isArray(COA_SYS_SGS) ? COA_SYS_SGS : [];
      
      const expenseSgIds = new Set(sgs.filter(s => s.main === 'expense').map(s => s.id));
      
      return ledgers
        .filter(l => {
          if (l.type === 'group-ledger') return false;
          if (expenseSgIds.has(l.sgId)) return true;
          if (l.sgId && (l.sgId.startsWith('sg-e') || l.sgId === 'sg-cmc' || l.sgId === 'sg-pst' || l.sgId === 'sg-cinv' || l.sgId === 'sg-oe' || l.sgId === 'sg-tax')) return true;
          if (typeof getLedgerMainGroup === 'function' && getLedgerMainGroup(l) === 'expense') return true;
          return false;
        })
        .map(l => ({
          name: l.name,
          type: 'Expense',
          id: l.id,
          aliases: l.aliases || [],
          code: l.code || ''
        }));
    }

    function open(inp, query, onSelect) {
      _activeInp    = inp;
      _activeCb     = onSelect;
      _highlightIdx = -1;
      _position(inp);
      _renderPortalList(query);
      el.classList.add('open');
      _open = true;
    }

    function _renderPortalList(query) {
      const q = (query || '').toLowerCase().trim();
      el.innerHTML = '';

      const filterBar = document.createElement('div');
      filterBar.className = 'je-drop-filter-bar';
      filterBar.style.cssText = `
        display: flex; gap: 4px; padding: 6px 8px; background: #f8fafc;
        border-bottom: 1px solid #e2e8f0; border-radius: 12px 12px 0 0;
        position: sticky; top: 0; z-index: 10;
      `;
      const tabs = [
        { id: 'all', label: 'All' },
        { id: 'product', label: 'Product' },
        { id: 'expense', label: 'Expense' }
      ];
      tabs.forEach(t => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = t.label;
        const isActive = t.id === _activeFilter;
        let activeBorder = '#3b82f6';
        let activeBg = '#eff6ff';
        let activeColor = '#1d4ed8';
        if (t.id === 'expense' && isActive) {
          activeBorder = '#ef4444';
          activeBg = '#fef2f2';
          activeColor = '#dc2626';
        }
        btn.style.cssText = `
          flex: 1; padding: 5px 8px; font-size: 11px; font-weight: 700;
          border-radius: 6px; border: 1px solid ${isActive ? activeBorder : '#cbd5e1'};
          background: ${isActive ? activeBg : '#ffffff'};
          color: ${isActive ? activeColor : '#475569'};
          cursor: pointer; font-family: inherit; transition: all 0.12s; text-align: center;
        `;
        const handleTabSwitch = (e) => {
          e.preventDefault();
          e.stopPropagation();
          _activeFilter = t.id;
          _renderPortalList(_activeInp ? _activeInp.value : '');
          if (_activeInp) _activeInp.focus();
        };
        btn.addEventListener('mousedown', handleTabSwitch);
        btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
        filterBar.appendChild(btn);
      });
      el.appendChild(filterBar);

      let products = _activeFilter === 'expense' ? [] : getProductsList();
      let expenses = _activeFilter === 'product' ? [] : getExpensesList();

      if (q) {
        products = products.filter(p => p.name.toLowerCase().includes(q));
        expenses = expenses.filter(s => s.name.toLowerCase().includes(q) || (s.aliases && s.aliases.some(a => a.toLowerCase().includes(q))));
      }

      const queryHighlight = (text, pat) => {
        if (!pat) return text;
        const idx = text.toLowerCase().indexOf(pat.toLowerCase());
        if (idx < 0) return text;
        return text.slice(0, idx)
          + `<span class="je-drop-hl">${text.slice(idx, idx + pat.length)}</span>`
          + text.slice(idx + pat.length);
      };

      if (!products.length && !expenses.length) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'je-drop-empty';
        emptyDiv.innerHTML = `
          <svg class="je-drop-empty-icon" width="28" height="28" viewBox="0 0 32 32" fill="none">
            <circle cx="14" cy="14" r="9" stroke="currentColor" stroke-width="1.8"/>
            <path d="M21 21l6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          <span class="je-drop-empty-txt">No product or expense found</span>
          <span class="je-drop-empty-sub">Type custom description directly or filter by category</span>
        `;
        el.appendChild(emptyDiv);
      } else {
        if (products.length > 0) {
          const hdr = document.createElement('div');
          hdr.className = 'je-drop-header';
          hdr.textContent = 'Products';
          el.appendChild(hdr);
          products.forEach(p => {
            const item = document.createElement('div');
            item.className = 'je-drop-item';
            item.innerHTML = `
              <span class="je-drop-dot" style="background:#3b82f6"></span>
              <span class="je-drop-name" style="flex:1">${queryHighlight(p.name, q)}</span>
              <span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:#eff6ff;color:#2563eb;text-transform:uppercase;">Product</span>
            `;
            const handleItemSelect = (e) => {
              if (e) {
                e.preventDefault();
                e.stopPropagation();
              }
              const sel = p;
              const cb = _activeCb;
              const inp = _activeInp;
              close();
              if (inp) inp.value = sel.name;
              if (cb) cb(sel);
            };
            item.addEventListener('mousedown', handleItemSelect);
            item.addEventListener('click', handleItemSelect);
            el.appendChild(item);
          });
        }

        if (expenses.length > 0) {
          const hdr = document.createElement('div');
          hdr.className = 'je-drop-header';
          hdr.textContent = 'Expense Accounts';
          el.appendChild(hdr);
          expenses.forEach(s => {
            const item = document.createElement('div');
            item.className = 'je-drop-item';
            const akaStr = s.aliases && s.aliases.length > 0 ? ` [A.K.A: ${s.aliases.join(', ')}]` : '';
            item.innerHTML = `
              <span class="je-drop-dot" style="background:#ef4444"></span>
              <span class="je-drop-name" style="flex:1">${queryHighlight(s.name, q)}${akaStr ? `<span style="font-size:11px;color:#94a3b8;margin-left:4px">${queryHighlight(akaStr, q)}</span>` : ''}</span>
              <span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:#fef2f2;color:#dc2626;text-transform:uppercase;">Expense</span>
            `;
            const handleItemSelect = (e) => {
              if (e) {
                e.preventDefault();
                e.stopPropagation();
              }
              const sel = s;
              const cb = _activeCb;
              const inp = _activeInp;
              close();
              if (inp) inp.value = sel.name;
              if (cb) cb(sel);
            };
            item.addEventListener('mousedown', handleItemSelect);
            item.addEventListener('click', handleItemSelect);
            el.appendChild(item);
          });
        }
      }
    }

    function close() {
      if (!_open) return;
      el.classList.remove('open');
      el.style.display = 'none';
      _open         = false;
      _activeInp    = null;
      _activeCb     = null;
      _highlightIdx = -1;
    }

    function isOpen() { return _open; }

    function onKey(e) {
      if (!_open) return false;
      const items = _items();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = _highlightIdx + 1 >= items.length ? 0 : _highlightIdx + 1;
        _setHL(next);
        return true;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = _highlightIdx - 1 < 0 ? items.length - 1 : _highlightIdx - 1;
        _setHL(prev);
        return true;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        const targetIdx = _highlightIdx >= 0 ? _highlightIdx : 0;
        if (items[targetIdx]) {
          e.preventDefault();
          items[targetIdx].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          return true;
        }
      }
      if (e.key === 'Escape') {
        close();
        return true;
      }
      return false;
    }

    document.addEventListener('mousedown', e => {
      if (_open && !el.contains(e.target) && e.target !== _activeInp) {
        close();
      }
    });

    window.addEventListener('resize', () => { if (_open && _activeInp) _position(_activeInp); });
    window.addEventListener('scroll', () => { if (_open && _activeInp) _position(_activeInp); }, true);

    return { open, close, isOpen, onKey, renderList: _renderPortalList };
  })();

  // ══════════════════════════════════════════════════════════════════
  //  FORM INITIALIZATION & DEFAULTS
  // ══════════════════════════════════════════════════════════════════

  function getNextPurchaseInvoiceNo() {
    const ctr = window.KYA_STORE.purchaseInvoiceCtr || 1;
    return `PUR-2026-${String(ctr).padStart(3, '0')}`;
  }

  function initPurchaseForm() {
    // 1. Date
    const dateEl = document.getElementById('purchaseDate');
    if (dateEl) {
      const today = new Date().toISOString().split('T')[0];
      dateEl.value = today;
    }

    // 2. Invoice No & Chip
    const invNo = getNextPurchaseInvoiceNo();
    const invNoEl = document.getElementById('purchaseInvoiceNo');
    if (invNoEl) invNoEl.value = invNo;
    
    const chipEl = document.getElementById('purchaseVoucherChipDisplay');
    if (chipEl) chipEl.textContent = invNo;

    // 3. Populate dropdowns
    populatePurchaseVendors();
    populatePurchaseExecutives();
    populatePurchasePaymentAccounts();

    // 4. Default Supply Type
    const supplyEl = document.getElementById('purchaseSupplyType');
    if (supplyEl) supplyEl.value = 'Intra-State (CGST + SGST)';

    // 5. Payment status default
    setPurchasePaymentStatus('NotPaid');

    // 6. Reset notes and TDS/TCS
    const notesEl = document.getElementById('purchaseNotes');
    if (notesEl) notesEl.value = '';

    setPurchaseTdsTcs('None');

    const adjEl = document.getElementById('purchaseAdjustments');
    if (adjEl) adjEl.value = '';

    // 7. Reset Document upload
    resetPurchaseDocAttachment();

    // 8. Initialize rows
    purchaseRows = [
      { item: '', hsn: '', qty: 1, unit: '', rate: 0, discount: 0, discountType: 'val', tax: 18, amount: 0, itemType: 'Product' }
    ];
    if (!_editingPurchaseVoucher) {
      window._purchasePartyOverride = null;
    }
    renderPurchaseRows();
    recalculatePurchaseTotals();
  }

  function loadPurchaseVoucher(v, isDraft = false) {
    if (!v) return;
    _editingPurchaseVoucher = v;
    window._purchasePartyOverride = v.partyOverride ? JSON.parse(JSON.stringify(v.partyOverride)) : null;

    const dateEl = document.getElementById('purchaseDate');
    if (dateEl) dateEl.value = v.date || '';

    const invNoEl = document.getElementById('purchaseInvoiceNo');
    if (invNoEl) invNoEl.value = v.invoiceNo || '';

    const chipEl = document.getElementById('purchaseVoucherChipDisplay');
    if (chipEl) chipEl.textContent = v.invoiceNo || 'PUR-XXXX';

    populatePurchaseVendors(v.vendorId);
    populatePurchaseExecutives(v.executiveId);
    populatePurchasePaymentAccounts(v.paymentAccountId);

    const supplyEl = document.getElementById('purchaseSupplyType');
    if (supplyEl) supplyEl.value = v.supplyType || 'Intra-State (CGST + SGST)';

    const notesEl = document.getElementById('purchaseNotes');
    if (notesEl) notesEl.value = v.notes || '';

    const dueEl = document.getElementById('purchaseDueDate');
    if (dueEl) dueEl.value = v.dueDate || '';

    const adjEl = document.getElementById('purchaseAdjustments');
    if (adjEl) adjEl.value = (v.adjustments !== undefined && v.adjustments !== 0) ? v.adjustments : '';

    if (v.paymentStatus === 'Full Payment') setPurchasePaymentStatus('Full');
    else if (v.paymentStatus === 'Partial Payment') {
      setPurchasePaymentStatus('Partial');
      const amtEl = document.getElementById('purchasePaymentAmount');
      if (amtEl) amtEl.value = v.paymentAmount || '';
    } else {
      setPurchasePaymentStatus('NotPaid');
    }

    if (v.tdsTcsMode === 'TDS') setPurchaseTdsTcs('TDS');
    else if (v.tdsTcsMode === 'TCS') setPurchaseTdsTcs('TCS');
    else setPurchaseTdsTcs('None');

    if (v.rows && Array.isArray(v.rows)) {
      purchaseRows = JSON.parse(JSON.stringify(v.rows));
      renderPurchaseRows();
      recalculatePurchaseTotals();
    }
  }
  window.loadPurchaseVoucher = loadPurchaseVoucher;

  let _purchVendorSearchControl = null;
  function getPurchVendorSearchControl() {
    if (!_purchVendorSearchControl && typeof initPartySearchableSelect === 'function') {
      _purchVendorSearchControl = initPartySearchableSelect('purchaseVendor', '— Select Vendor —', 'Vendor / Supplier');
    }
    return _purchVendorSearchControl;
  }

  function populatePurchaseVendors(selectedId = null) {
    const vendorSelect = document.getElementById('purchaseVendor');
    if (!vendorSelect) return;

    vendorSelect.innerHTML = '<option value="">&mdash; Select Vendor &mdash;</option>';

    const suppliers = typeof getKyaSuppliers === 'function' ? getKyaSuppliers() : [];
    const addedNames = new Set();

    suppliers.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
      const akaStr = v.aliases && v.aliases.length > 0 ? ` [A.K.A: ${v.aliases.join(', ')}]` : '';
      opt.textContent = v.name + akaStr;
      if (selectedId && String(v.id) === String(selectedId)) {
        opt.selected = true;
      }
      vendorSelect.appendChild(opt);
      addedNames.add((v.name || '').trim().toLowerCase());
    });

    // Also include ledgers created under Trade Payables group in Master Desk → Ledgers
    if (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) {
      coaLedgers.forEach(l => {
        if (l.type === 'ledger' && l.sgId === 'sg-tp' && l.name && l.name.trim().toLowerCase() !== 'trade payables') {
          if (!addedNames.has(l.name.trim().toLowerCase())) {
            const opt = document.createElement('option');
            opt.value = l.id;
            const akaStr = l.aliases && l.aliases.length > 0 ? ` [A.K.A: ${l.aliases.join(', ')}]` : '';
            opt.textContent = l.name + akaStr;
            if (selectedId && String(l.id) === String(selectedId)) {
              opt.selected = true;
            }
            vendorSelect.appendChild(opt);
            addedNames.add(l.name.trim().toLowerCase());
          }
        }
      });
    }

    const control = getPurchVendorSearchControl();
    if (control) control.refresh();
  }

  window.onPartyCreatedForPurchase = function(newParty, partySource) {
    if (!newParty) return;
    populatePurchaseVendors(newParty.id);
    setTimeout(() => {
      const vendorSelect = document.getElementById('purchaseVendor');
      if (vendorSelect) {
        vendorSelect.value = newParty.id;
        vendorSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const ctrl = getPurchVendorSearchControl();
      if (ctrl) ctrl.refresh();
      showToast(`${partySource === 'ledger' ? 'Ledger' : 'Supplier'} "${newParty.name}" selected.`, 'success');
    }, 60);
  };

  window.onPartyCreationCancelledForPurchase = function(initialName) {
    setTimeout(() => {
      const dropdown = document.getElementById('purchaseVendorSelectDropdown');
      const searchInput = document.getElementById('purchaseVendorSelectSearch');
      if (dropdown && searchInput) {
        dropdown.style.display = 'flex';
        if (initialName !== undefined && initialName !== null) {
          searchInput.value = initialName;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        searchInput.focus();
      }
    }, 60);
  };

  function populatePurchaseExecutives(selectedId = null) {
    const execSelect = document.getElementById('purchaseExecutive');
    if (!execSelect) return;

    execSelect.innerHTML = '<option value="">&mdash; Select Executive &mdash;</option>';

    const emps = typeof ohEmployees !== 'undefined' ? ohEmployees : [];
    emps.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = `${e.name} (${e.code || 'EMP'})`;
      if (selectedId && e.id == selectedId) {
        opt.selected = true;
      }
      execSelect.appendChild(opt);
    });
  }

  function populatePurchasePaymentAccounts(selectedId = null) {
    const paySelect = document.getElementById('purchasePaymentAccount');
    if (!paySelect) return;

    paySelect.innerHTML = '<option value="">&mdash; Select &mdash;</option>';

    const ledgers = typeof coaLedgers !== 'undefined' ? coaLedgers : [];
    const accounts = ledgers.filter(l => l.type === 'ledger' && l.sgId === 'sg-cce');
    accounts.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.name;
      if (selectedId && a.id == selectedId) {
        opt.selected = true;
      }
      paySelect.appendChild(opt);
    });
  }

  // ══════════════════════════════════════════════════════════════════
  //  PAYMENT STATUS & DUE DATE
  // ══════════════════════════════════════════════════════════════════

  function setPurchasePaymentStatus(status) {
    const notPaidBtn = document.getElementById('purchasePaymentStatusNotPaid');
    const fullBtn    = document.getElementById('purchasePaymentStatusFull');
    const partBtn    = document.getElementById('purchasePaymentStatusPartial');
    const bg         = document.getElementById('purchasePaymentStatusBg');

    const dueDateField = document.getElementById('purchaseDueDateField');
    const payAcctField = document.getElementById('purchasePaymentAccountField');
    const payAmtField  = document.getElementById('purchasePaymentAmountField');

    if (!notPaidBtn || !fullBtn || !partBtn) return;

    [notPaidBtn, fullBtn, partBtn].forEach(b => b.classList.remove('active'));

    if (status === 'NotPaid') {
      notPaidBtn.classList.add('active');
      if (bg) bg.className = 'sales-paystatus-bg notpaid-active';
      if (dueDateField) dueDateField.style.display = 'flex';
      if (payAcctField) payAcctField.style.display = 'none';
      if (payAmtField)  payAmtField.style.display  = 'none';

      const wrapper = document.getElementById('purchaseDueDateWrapper');
      if (wrapper) {
        wrapper.style.flexDirection = 'row';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '8px';
      }

      const dueInp = document.getElementById('purchaseDueDate');
      if (dueInp && !dueInp.value) {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        dueInp.value = d.toISOString().split('T')[0];
      }
      updatePurchaseDueDateDays();
    } else if (status === 'Full') {
      fullBtn.classList.add('active');
      if (bg) bg.className = 'sales-paystatus-bg fullpaid-active';
      if (dueDateField) dueDateField.style.display = 'none';
      if (payAcctField) payAcctField.style.display = 'flex';
      if (payAmtField)  payAmtField.style.display  = 'none';
      populatePurchasePaymentAccounts();
    } else if (status === 'Partial') {
      partBtn.classList.add('active');
      if (bg) bg.className = 'sales-paystatus-bg partpaid-active';
      if (dueDateField) dueDateField.style.display = 'flex';
      if (payAcctField) payAcctField.style.display = 'flex';
      if (payAmtField)  payAmtField.style.display  = 'flex';

      const wrapper = document.getElementById('purchaseDueDateWrapper');
      if (wrapper) {
        wrapper.style.flexDirection = 'column';
        wrapper.style.alignItems = 'flex-start';
        wrapper.style.gap = '4px';
      }

      const dueInp = document.getElementById('purchaseDueDate');
      if (dueInp && !dueInp.value) {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        dueInp.value = d.toISOString().split('T')[0];
      }
      updatePurchaseDueDateDays();
      populatePurchasePaymentAccounts();
    }
  }

  function updatePurchaseDueDateDays() {
    const dateEl = document.getElementById('purchaseDate');
    const dueInp = document.getElementById('purchaseDueDate');
    const daysEl = document.getElementById('purchaseDueDateDays');
    if (!dueInp || !daysEl) return;

    const dateVal = dateEl ? dateEl.value : null;
    const dueVal  = dueInp.value;
    if (!dueVal) {
      daysEl.textContent = '';
      return;
    }

    const d1 = dateVal ? new Date(dateVal) : new Date();
    const d2 = new Date(dueVal);
    d1.setHours(0,0,0,0);
    d2.setHours(0,0,0,0);

    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      daysEl.textContent = `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
      daysEl.style.color = 'var(--blue-600)';
    } else if (diffDays === 0) {
      daysEl.textContent = 'Due today';
      daysEl.style.color = 'var(--amber-600)';
    } else {
      daysEl.textContent = `${Math.abs(diffDays)} days overdue`;
      daysEl.style.color = 'var(--red-600)';
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  TDS / TCS CONTROLS
  // ══════════════════════════════════════════════════════════════════

  function setPurchaseTdsTcs(mode) {
    const noneBtn = document.getElementById('purchaseTdsTcsNone');
    const tdsBtn  = document.getElementById('purchaseTdsTcsTds');
    const tcsBtn  = document.getElementById('purchaseTdsTcsTcs');
    const bg      = document.getElementById('purchaseTdsTcsBg');
    const amtRow  = document.getElementById('purchaseTdsTcsAmountRow');
    const lbl     = document.getElementById('purchaseTdsTcsAmountLabel');

    if (!noneBtn || !tdsBtn || !tcsBtn) return;

    [noneBtn, tdsBtn, tcsBtn].forEach(b => b.classList.remove('active'));

    if (mode === 'None') {
      noneBtn.classList.add('active');
      if (bg) bg.className = 'sales-tdstcs-bg none-active';
      if (amtRow) amtRow.style.display = 'none';
      const amtInp = document.getElementById('purchaseTdsTcsAmount');
      if (amtInp) amtInp.value = '';
    } else {
      if (mode === 'TDS') {
        tdsBtn.classList.add('active');
        if (bg) bg.className = 'sales-tdstcs-bg tds-active';
        if (lbl) lbl.textContent = 'TDS';
      } else {
        tcsBtn.classList.add('active');
        if (bg) bg.className = 'sales-tdstcs-bg tcs-active';
        if (lbl) lbl.textContent = 'TCS';
      }
      if (amtRow) amtRow.style.display = 'block';
    }
    recalculatePurchaseTotals();
  }

  // ══════════════════════════════════════════════════════════════════
  //  LINE ITEMS RENDERING & ROW UPDATES
  // ══════════════════════════════════════════════════════════════════

  function renderPurchaseHeaders() {
    const hdr = document.getElementById('purchaseTableHeader');
    if (!hdr) return;
    hdr.innerHTML = `
      <th class="col-item" style="text-align: left; padding-left: 6px;">Description (Product / Expense)</th>
      <th class="col-hsn" style="width: 90px; text-align: left;">HSN/SAC</th>
      <th class="col-qty" style="width: 60px; text-align: right;">Qty</th>
      <th class="col-unit" style="width: 60px; text-align: center;">Unit</th>
      <th class="col-rate" style="width: 95px; text-align: right;">Rate / Price</th>
      <th class="col-disc" style="width: 100px; text-align: right;">Discount</th>
      <th class="col-tax" style="width: 70px; text-align: right; padding-right: 4px;">Tax</th>
      <th class="col-amt" style="width: 105px; text-align: right;">Amount</th>
      <th class="col-del" style="width: 36px; text-align: center;"></th>
    `;
  }

  // Math expression evaluation helper for calculator behavior (e.g. 500+250, 1000*2, 200/4, 500-10%)
  function evaluatePurchaseMathExpression(str) {
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

  function parsePurchaseAmt(str) {
    const cleanStr = (str || '').toString().replace(/,/g, '').trim();
    if (!cleanStr) return 0;
    if (/[\+\-\*\/\%]/.test(cleanStr)) {
      const evalVal = evaluatePurchaseMathExpression(cleanStr);
      if (!isNaN(evalVal)) {
        return evalVal;
      }
    }
    const v = parseFloat(cleanStr);
    return isNaN(v) ? 0 : v;
  }

  function parseAmt(v) {
    return parsePurchaseAmt(v);
  }

  function renderPurchaseRows() {
    renderPurchaseHeaders();
    const body = document.getElementById('purchaseItemBody');
    if (!body) return;

    body.innerHTML = '';

    const supplyTypeEl = document.getElementById('purchaseSupplyType');
    const isZeroTax = supplyTypeEl && (supplyTypeEl.value.includes('Zero-Rated') || supplyTypeEl.value.includes('Without Tax'));

    purchaseRows.forEach((row, index) => {
      if (isZeroTax) row.tax = 0;

      const tr = document.createElement('tr');
      tr.className = 'sales-row';
      tr.dataset.rowIndex = index;

      tr.innerHTML = `
        <td style="padding: 4px 6px;">
          <div style="position: relative; display: flex; align-items: center; width: 100%;">
            <input type="text" class="purchase-row-item je-input" value="${ohEsc(row.item || '')}" placeholder="Select or type Description (Product / Expense)" style="border: none; background: transparent; box-shadow: none; padding: 0 16px 0 0; width: 100%; font-weight: 500; font-size: 13.5px;" autocomplete="off" />
            <span class="sales-row-drop-arrow" style="position: absolute; right: 2px; pointer-events: none; color: #94a3b8; font-size: 10px;">▼</span>
          </div>
        </td>
        <td style="width: 90px; padding: 4px;">
          <input type="text" class="purchase-row-hsn je-input" value="${ohEsc(row.hsn || '')}" placeholder="HSN/SAC" style="border: none; background: transparent; box-shadow: none; padding: 0; font-size: 12.5px; font-family: monospace, inherit;" />
        </td>
        <td style="width: 60px; padding: 4px;">
          <input type="number" class="purchase-row-qty je-input" value="${row.qty !== undefined ? row.qty : 1}" min="0" style="border: none; background: transparent; box-shadow: none; text-align: right; padding: 0; font-weight: 600; font-size: 13px;" />
        </td>
        <td style="width: 60px; padding: 4px; text-align: center;">
          <input type="text" class="purchase-row-unit je-input" value="${ohEsc(row.unit || '')}" placeholder="Unit" style="border: none; background: transparent; box-shadow: none; text-align: center; padding: 0; font-weight: 600; text-transform: uppercase; font-size: 12px;" />
        </td>
        <td style="width: 95px; padding: 4px;">
          <input type="text" inputmode="decimal" class="purchase-row-rate je-input" value="${row.rate === 0 || row.rate === undefined ? '' : (typeof row.rate === 'number' ? row.rate.toFixed(2) : row.rate)}" placeholder="0.00" style="border: none; background: transparent; box-shadow: none; text-align: right; padding: 0; font-weight: 600; font-size: 13px;" />
        </td>
        <td style="width: 100px; padding: 4px;">
          <div style="display: flex; gap: 2px; align-items: center; justify-content: flex-end;">
            <input type="text" inputmode="decimal" class="purchase-row-discount je-input" value="${row.discount === 0 || row.discount === undefined ? '' : (typeof row.discount === 'number' ? row.discount.toFixed(2) : row.discount)}" placeholder="0.00" style="border: none; background: transparent; box-shadow: none; text-align: right; width: 55px; padding: 0; font-weight: 600; font-size: 13px;" />
            <select class="purchase-row-discount-type je-input" style="border: none; background: transparent; box-shadow: none; width: 22px; padding: 0; font-weight: 700; cursor: pointer; text-align: center; text-align-last: center; -webkit-appearance: none; -moz-appearance: none; appearance: none; font-size: 12px;">
              <option value="val" ${row.discountType === 'val' || !row.discountType ? 'selected' : ''}>₹</option>
              <option value="pct" ${row.discountType === 'pct' ? 'selected' : ''}>%</option>
            </select>
          </div>
        </td>
        <td style="width: 70px; padding: 4px;">
          <select class="purchase-row-tax je-input" style="border: none; background: transparent; box-shadow: none; text-align: right; text-align-last: right; padding-right: 2px; font-weight: 600; font-size: 12.5px;" ${isZeroTax ? 'disabled' : ''}>
            <option value="0" ${row.tax === 0 ? 'selected' : ''}>0%</option>
            <option value="5" ${row.tax === 5 ? 'selected' : ''}>5%</option>
            <option value="12" ${row.tax === 12 ? 'selected' : ''}>12%</option>
            <option value="18" ${row.tax === 18 || row.tax === undefined ? 'selected' : ''}>18%</option>
            <option value="28" ${row.tax === 28 ? 'selected' : ''}>28%</option>
          </select>
        </td>
        <td style="width: 105px; padding: 4px;">
          <input type="text" inputmode="decimal" class="purchase-row-amount-input je-input" value="${row.amount === 0 || row.amount === undefined ? '' : Number(row.amount).toFixed(2)}" placeholder="0.00" style="border: none; background: transparent; box-shadow: none; text-align: right; padding: 0; font-weight: 700; width: 100%; font-size: 13.5px;" />
        </td>
        <td style="width: 36px; padding: 4px; text-align: center;">
          <button type="button" class="purchase-del-row" style="background: none; border: none; color: var(--red-600); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; margin: 0 auto;" onmouseover="this.style.backgroundColor='var(--red-50)'" onmouseout="this.style.backgroundColor='transparent'">
            <svg viewBox="0 0 15 15" fill="none" style="width: 13px; height: 13px;">
              <path d="M5.5 2h4M1.5 4h12M2.5 4l1 9.5a1 1 0 001 .5h6a1 1 0 001-.5l1-9.5M5.5 6.5v5M9.5 6.5v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
          </button>
        </td>
      `;

      body.appendChild(tr);

      // Attach Portal Autocomplete
      const itemInp = tr.querySelector('.purchase-row-item');
      if (itemInp) {
        const attachPortal = () => {
          _purchaseItemPortal.open(itemInp, itemInp.value, (selectedItem) => {
            itemInp.value = selectedItem.name;
            purchaseRows[index].item = selectedItem.name;
            purchaseRows[index].itemType = selectedItem.type;
            if (selectedItem.type === 'Expense' && selectedItem.id) {
              purchaseRows[index].expenseLedgerId = selectedItem.id;
            }
            recalculatePurchaseTotals();
          });
        };

        itemInp.addEventListener('focus', attachPortal);
        itemInp.addEventListener('click', attachPortal);
        itemInp.addEventListener('input', () => {
          purchaseRows[index].item = itemInp.value;
          attachPortal();
        });
        itemInp.addEventListener('keydown', e => {
          _purchaseItemPortal.onKey(e);
        });
      }

      // Input listeners for live calculation
      const qtyInp = tr.querySelector('.purchase-row-qty');
      const rateInp = tr.querySelector('.purchase-row-rate');
      const discInp = tr.querySelector('.purchase-row-discount');
      const discTypeSel = tr.querySelector('.purchase-row-discount-type');
      const taxSel = tr.querySelector('.purchase-row-tax');
      const amtInp = tr.querySelector('.purchase-row-amount-input');
      const hsnInp = tr.querySelector('.purchase-row-hsn');
      const unitInp = tr.querySelector('.purchase-row-unit');
      const delBtn = tr.querySelector('.purchase-del-row');

      const updateRow = (triggeredBy) => updatePurchaseRowFromDOM(index, tr, triggeredBy);

      if (hsnInp) hsnInp.addEventListener('input', () => { purchaseRows[index].hsn = hsnInp.value; });
      if (unitInp) unitInp.addEventListener('input', () => { purchaseRows[index].unit = unitInp.value; });
      if (qtyInp) qtyInp.addEventListener('input', () => updateRow('qty'));
      if (rateInp) rateInp.addEventListener('input', () => updateRow('rate'));
      if (discInp) discInp.addEventListener('input', () => updateRow('discount'));
      if (discTypeSel) discTypeSel.addEventListener('change', () => updateRow('discType'));
      if (taxSel) taxSel.addEventListener('change', () => updateRow('tax'));
      if (amtInp) amtInp.addEventListener('input', () => updateRow('amount'));

      if (delBtn) {
        delBtn.addEventListener('click', () => {
          if (purchaseRows.length > 1) {
            purchaseRows.splice(index, 1);
            renderPurchaseRows();
            recalculatePurchaseTotals();
          } else {
            purchaseRows[0] = { item: '', hsn: '', qty: 1, unit: '', rate: 0, discount: 0, discountType: 'val', tax: 18, amount: 0, itemType: 'Product' };
            renderPurchaseRows();
            recalculatePurchaseTotals();
          }
        });
      }
    });
  }

  function updatePurchaseRowFromDOM(index, tr, triggeredBy) {
    const row = purchaseRows[index];
    if (!row) return;

    const amtInput = tr.querySelector('.purchase-row-amount-input');
    const isAmountTrigger = (triggeredBy === 'amount');

    const qty = parseFloat(tr.querySelector('.purchase-row-qty')?.value) || 0;
    let rate = Math.round(parsePurchaseAmt(tr.querySelector('.purchase-row-rate')?.value || '0') * 100) / 100;
    let discount = parsePurchaseAmt(tr.querySelector('.purchase-row-discount')?.value || '0');
    const discountType = tr.querySelector('.purchase-row-discount-type')?.value || 'val';
    const tax = parseFloat(tr.querySelector('.purchase-row-tax')?.value) || 0;

    row.qty = qty;
    row.discount = discount;
    row.discountType = discountType;
    row.tax = tax;

    if (isAmountTrigger) {
      const enteredAmount = Math.round(parsePurchaseAmt(amtInput?.value || '0') * 100) / 100;
      row.amount = enteredAmount;
      const taxMultiplier = 1 + (tax / 100);
      const taxable = taxMultiplier > 0 ? (enteredAmount / taxMultiplier) : enteredAmount;
      let base = taxable;
      if (discountType === 'pct' && discount < 100) {
        base = taxable / (1 - (discount / 100));
      } else if (discountType === 'val') {
        base = taxable + discount;
      }
      row.rate = qty > 0 ? (base / qty) : base;
      const rateInp = tr.querySelector('.purchase-row-rate');
      if (rateInp && document.activeElement !== rateInp) {
        rateInp.value = row.rate === 0 ? '' : row.rate.toFixed(2);
      }
    } else {
      row.rate = rate;
      const base = (qty || 1) * rate;
      const discAmt = discountType === 'pct' ? (base * (discount / 100)) : discount;
      const taxable = Math.max(0, base - discAmt);
      const taxAmt = taxable * (tax / 100);
      row.amount = taxable + taxAmt;
      if (amtInput && document.activeElement !== amtInput) {
        amtInput.value = row.amount === 0 ? '' : row.amount.toFixed(2);
      }
    }

    recalculatePurchaseTotals();
  }

  function addPurchaseRow() {
    purchaseRows.push({ item: '', hsn: '', qty: 1, unit: '', rate: 0, discount: 0, discountType: 'val', tax: 18, amount: 0, itemType: 'Product' });
    renderPurchaseRows();
    recalculatePurchaseTotals();
  }

  // ══════════════════════════════════════════════════════════════════
  //  TOTALS & RECALCULATIONS
  // ══════════════════════════════════════════════════════════════════

  function recalculatePurchaseTotals() {
    let subTotal = 0;
    let taxableTotal = 0;
    let totalGst = 0;

    purchaseRows.forEach(r => {
      const qty = r.qty || 1;
      const rate = r.rate || 0;
      const base = qty * rate;
      const disc = r.discountType === 'pct' ? (base * ((r.discount || 0) / 100)) : (r.discount || 0);
      const taxable = Math.max(0, base - disc);
      const gst = taxable * ((r.tax || 0) / 100);
      taxableTotal += taxable;
      totalGst += gst;
      subTotal += (r.amount || (taxable + gst));
    });

    const subTotalEl = document.getElementById('purchaseSubTotal');
    if (subTotalEl) subTotalEl.textContent = `₹ ${subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // TDS / TCS
    let tdsTcsAmt = 0;
    const tdsActive = document.getElementById('purchaseTdsTcsTds')?.classList.contains('active');
    const tcsActive = document.getElementById('purchaseTdsTcsTcs')?.classList.contains('active');

    if (tdsActive || tcsActive) {
      const rateSel = document.getElementById('purchaseTdsTcsRateSelect');
      let ratePct = 0;
      if (rateSel && rateSel.value === 'custom') {
        ratePct = parseFloat(document.getElementById('purchaseTdsTcsRateCustom')?.value) || 0;
      } else if (rateSel) {
        ratePct = parseFloat(rateSel.value) || 0;
      }

      const amtInp = document.getElementById('purchaseTdsTcsAmount');
      if (document.activeElement !== amtInp) {
        tdsTcsAmt = Math.round((taxableTotal * (ratePct / 100)) * 100) / 100;
        if (amtInp) amtInp.value = tdsTcsAmt === 0 ? '' : tdsTcsAmt.toFixed(2);
      } else {
        tdsTcsAmt = parseFloat(amtInp.value) || 0;
      }
    }

    // Adjustments / Round off
    const adjInp = document.getElementById('purchaseAdjustments');
    const adjustments = parseFloat(adjInp?.value) || 0;

    let grandTotal = subTotal;
    if (tdsActive) grandTotal -= tdsTcsAmt;
    if (tcsActive) grandTotal += tdsTcsAmt;
    grandTotal += adjustments;
    grandTotal = Math.max(0, grandTotal);

    const totalEl = document.getElementById('purchaseTotal');
    if (totalEl) totalEl.textContent = `₹ ${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Update payment amount field placeholder
    const payAmtInp = document.getElementById('purchasePaymentAmount');
    if (payAmtInp && !payAmtInp.value) {
      payAmtInp.placeholder = grandTotal.toFixed(2);
    }
  }

  function autoRoundOffPurchase() {
    let subTotal = 0;
    purchaseRows.forEach(r => { subTotal += (r.amount || 0); });

    const tdsActive = document.getElementById('purchaseTdsTcsTds')?.classList.contains('active');
    const tcsActive = document.getElementById('purchaseTdsTcsTcs')?.classList.contains('active');
    const tdsAmt = parseFloat(document.getElementById('purchaseTdsTcsAmount')?.value) || 0;

    let currentTotal = subTotal;
    if (tdsActive) currentTotal -= tdsAmt;
    if (tcsActive) currentTotal += tdsAmt;

    const rounded = Math.round(currentTotal);
    const diff = Math.round((rounded - currentTotal) * 100) / 100;

    const adjInp = document.getElementById('purchaseAdjustments');
    if (adjInp) {
      adjInp.value = diff === 0 ? '0.00' : (diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2));
    }
    recalculatePurchaseTotals();
  }

  // ══════════════════════════════════════════════════════════════════
  //  DOCUMENT ATTACHMENT
  // ══════════════════════════════════════════════════════════════════

  function resetPurchaseDocAttachment() {
    purchaseUploadedDoc = null;
    const fileInp = document.getElementById('purchaseDocFileInput');
    if (fileInp) fileInp.value = '';
    const emptyState = document.getElementById('purchaseDocEmptyState');
    const selectedState = document.getElementById('purchaseDocSelectedState');
    const badge = document.getElementById('purchaseDocStatusBadge');
    if (emptyState) emptyState.style.display = 'flex';
    if (selectedState) selectedState.style.display = 'none';
    if (badge) badge.style.display = 'none';
  }

  function handlePurchaseDocSelect(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      if (typeof showToast === 'function') showToast('File size must be under 10MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      purchaseUploadedDoc = {
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.type,
        dataUrl: e.target.result
      };
      const emptyState = document.getElementById('purchaseDocEmptyState');
      const selectedState = document.getElementById('purchaseDocSelectedState');
      const badge = document.getElementById('purchaseDocStatusBadge');
      const nameEl = document.getElementById('purchaseDocFileName');
      const sizeEl = document.getElementById('purchaseDocFileSize');
      const iconEl = document.getElementById('purchaseDocFileIcon');
      const prevBtn = document.getElementById('purchaseDocPreviewBtn');

      if (nameEl) nameEl.textContent = file.name;
      if (sizeEl) sizeEl.textContent = purchaseUploadedDoc.size;
      if (iconEl) {
        const ext = file.name.split('.').pop().toUpperCase();
        iconEl.textContent = ext.slice(0, 4) || 'FILE';
      }
      if (prevBtn) prevBtn.href = purchaseUploadedDoc.dataUrl;

      if (emptyState) emptyState.style.display = 'none';
      if (selectedState) selectedState.style.display = 'flex';
      if (badge) badge.style.display = 'inline-block';
    };
    reader.readAsDataURL(file);
  }

  // ══════════════════════════════════════════════════════════════════
  //  SAVE & POST PURCHASE VOUCHER
  // ══════════════════════════════════════════════════════════════════

  function savePurchase(isDraft = false) {
    const vendorSelect = document.getElementById('purchaseVendor');
    const vendorId = vendorSelect ? vendorSelect.value : '';
    if (!vendorId && !isDraft) {
      if (vendorSelect) {
        vendorSelect.focus();
        vendorSelect.style.borderColor = 'var(--red-500)';
      }
      if (typeof showToast === 'function') showToast('Please select a Vendor / Supplier.', 'error');
      return;
    }
    if (vendorSelect) vendorSelect.style.borderColor = '';

    const validRows = purchaseRows.filter(r => (r.item && r.item.trim() !== '') || (r.rate && r.rate > 0));
    if (validRows.length === 0 && !isDraft) {
      if (typeof showToast === 'function') showToast('Please add at least one line item with description and amount.', 'error');
      return;
    }

    const date = document.getElementById('purchaseDate')?.value || new Date().toISOString().split('T')[0];
    const invoiceNo = document.getElementById('purchaseInvoiceNo')?.value?.trim() || getNextPurchaseInvoiceNo();
    const supplyType = document.getElementById('purchaseSupplyType')?.value || 'Intra-State (CGST + SGST)';
    const executiveId = document.getElementById('purchaseExecutive')?.value || '';
    const notes = document.getElementById('purchaseNotes')?.value || '';

    // Payment status
    let paymentStatus = 'Not Paid';
    if (document.getElementById('purchasePaymentStatusFull')?.classList.contains('active')) paymentStatus = 'Full Payment';
    if (document.getElementById('purchasePaymentStatusPartial')?.classList.contains('active')) paymentStatus = 'Partial Payment';

    const dueDate = document.getElementById('purchaseDueDate')?.value || '';
    const paymentAccountId = document.getElementById('purchasePaymentAccount')?.value || '';
    const paymentAmount = parseFloat(document.getElementById('purchasePaymentAmount')?.value) || 0;

    // TDS / TCS
    let tdsTcsMode = 'None';
    if (document.getElementById('purchaseTdsTcsTds')?.classList.contains('active')) tdsTcsMode = 'TDS';
    if (document.getElementById('purchaseTdsTcsTcs')?.classList.contains('active')) tdsTcsMode = 'TCS';
    const tdsTcsAmount = parseFloat(document.getElementById('purchaseTdsTcsAmount')?.value) || 0;
    const adjustments = parseFloat(document.getElementById('purchaseAdjustments')?.value) || 0;

    let subTotal = 0;
    validRows.forEach(r => { subTotal += (r.amount || 0); });

    let total = subTotal;
    if (tdsTcsMode === 'TDS') total -= tdsTcsAmount;
    if (tdsTcsMode === 'TCS') total += tdsTcsAmount;
    total += adjustments;
    total = Math.max(0, total);

    const purchaseVoucher = {
      id: _editingPurchaseVoucher ? _editingPurchaseVoucher.id : Date.now(),
      invoiceNo,
      date,
      vendorId,
      partyOverride: window._purchasePartyOverride ? JSON.parse(JSON.stringify(window._purchasePartyOverride)) : null,
      supplyType,
      executiveId,
      rows: validRows,
      subTotal,
      tdsTcsMode,
      tdsTcsAmount,
      adjustments,
      total,
      paymentStatus,
      dueDate,
      paymentAccountId,
      paymentAmount,
      notes,
      document: purchaseUploadedDoc,
      isDraft,
      createdAt: _editingPurchaseVoucher ? _editingPurchaseVoucher.createdAt : Date.now(),
      postedAt: !isDraft ? Date.now() : null
    };

    if (isDraft) {
      if (!window.KYA_STORE.purchaseVouchersDrafts) window.KYA_STORE.purchaseVouchersDrafts = [];
      const idx = window.KYA_STORE.purchaseVouchersDrafts.findIndex(d => d.id === purchaseVoucher.id);
      if (idx >= 0) window.KYA_STORE.purchaseVouchersDrafts[idx] = purchaseVoucher;
      else window.KYA_STORE.purchaseVouchersDrafts.push(purchaseVoucher);
      if (typeof showToast === 'function') showToast(`Purchase Voucher "${invoiceNo}" saved as draft.`, 'success');
    } else {
      if (!window.KYA_STORE.purchaseVouchers) window.KYA_STORE.purchaseVouchers = [];
      const idx = window.KYA_STORE.purchaseVouchers.findIndex(v => v.id === purchaseVoucher.id);
      if (idx >= 0) window.KYA_STORE.purchaseVouchers[idx] = purchaseVoucher;
      else {
        window.KYA_STORE.purchaseVouchers.push(purchaseVoucher);
        window.KYA_STORE.purchaseInvoiceCtr = (window.KYA_STORE.purchaseInvoiceCtr || 1) + 1;
      }
      if (typeof showToast === 'function') showToast(`Purchase Voucher "${invoiceNo}" saved successfully!`, 'success');
    }

    _editingPurchaseVoucher = null;
    window._purchasePartyOverride = null;
    initPurchaseForm();

    if (typeof triggerAutoBackup === 'function') {
      triggerAutoBackup();
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  EVENT LISTENERS & BINDINGS
  // ══════════════════════════════════════════════════════════════════

  function wirePurchaseEventListeners() {
    const addRowBtn = document.getElementById('purchaseAddRow');
    if (addRowBtn && !addRowBtn._wired) {
      addRowBtn._wired = true;
      addRowBtn.addEventListener('click', (e) => {
        e.preventDefault();
        addPurchaseRow();
      });
    }

    // Line items calculator blur and Enter handling
    const itemBody = document.getElementById('purchaseItemBody');
    if (itemBody && !itemBody._calcWired) {
      itemBody._calcWired = true;
      itemBody.addEventListener('blur', (e) => {
        const isRate = e.target.classList.contains('purchase-row-rate');
        const isAmt  = e.target.classList.contains('purchase-row-amount-input');
        const isDisc = e.target.classList.contains('purchase-row-discount');
        if (!isRate && !isAmt && !isDisc) return;

        const val = parsePurchaseAmt(e.target.value);
        if (!isNaN(val)) {
          const clamped = Math.round(val * 100) / 100;
          e.target.value = clamped === 0 ? '' : clamped.toFixed(2);
          const tr = e.target.closest('tr');
          if (tr) {
            updatePurchaseRowFromDOM(parseInt(tr.dataset.rowIndex), tr, isAmt ? 'amount' : 'rate');
          }
        }
      }, true);

      itemBody.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const isRate = e.target.classList.contains('purchase-row-rate');
          const isAmt  = e.target.classList.contains('purchase-row-amount-input');
          const isDisc = e.target.classList.contains('purchase-row-discount');
          if (isRate || isAmt || isDisc) {
            e.preventDefault();
            e.target.blur();
          }
        }
      });
    }

    const clearBtn = document.getElementById('btnClearPurchase');
    if (clearBtn && !clearBtn._wired) {
      clearBtn._wired = true;
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        _editingPurchaseVoucher = null;
        initPurchaseForm();
        if (typeof showToast === 'function') showToast('Purchase form reset.', 'info');
      });
    }

    const newPurchaseBtn = document.getElementById('btnNewPurchase');
    if (newPurchaseBtn && !newPurchaseBtn._wired) {
      newPurchaseBtn._wired = true;
      newPurchaseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        _editingPurchaseVoucher = null;
        initPurchaseForm();
      });
    }

    const saveDraftBtn = document.getElementById('btnSavePurchaseDraft');
    if (saveDraftBtn && !saveDraftBtn._wired) {
      saveDraftBtn._wired = true;
      saveDraftBtn.addEventListener('click', (e) => {
        e.preventDefault();
        savePurchase(true);
      });
    }

    const postBtn = document.getElementById('btnPostPurchase');
    if (postBtn && !postBtn._wired) {
      postBtn._wired = true;
      postBtn.addEventListener('click', (e) => {
        e.preventDefault();
        savePurchase(false);
      });
    }

    // Payment Status Buttons
    const notPaidBtn = document.getElementById('purchasePaymentStatusNotPaid');
    const fullBtn    = document.getElementById('purchasePaymentStatusFull');
    const partBtn    = document.getElementById('purchasePaymentStatusPartial');

    if (notPaidBtn && !notPaidBtn._wired) {
      notPaidBtn._wired = true;
      notPaidBtn.addEventListener('click', () => setPurchasePaymentStatus('NotPaid'));
    }
    if (fullBtn && !fullBtn._wired) {
      fullBtn._wired = true;
      fullBtn.addEventListener('click', () => setPurchasePaymentStatus('Full'));
    }
    if (partBtn && !partBtn._wired) {
      partBtn._wired = true;
      partBtn.addEventListener('click', () => setPurchasePaymentStatus('Partial'));
    }

    const payAccEl = document.getElementById('purchasePaymentAccount');
    if (payAccEl && !payAccEl._wired) {
      payAccEl._wired = true;
      payAccEl.addEventListener('focus', () => {
        populatePurchasePaymentAccounts(payAccEl.value);
      });
    }

    // Due date & invoice date change
    const dateInp = document.getElementById('purchaseDate');
    if (dateInp && !dateInp._dueWired) {
      dateInp._dueWired = true;
      dateInp.addEventListener('change', updatePurchaseDueDateDays);
    }

    const dueDateInp = document.getElementById('purchaseDueDate');
    if (dueDateInp && !dueDateInp._wired) {
      dueDateInp._wired = true;
      dueDateInp.addEventListener('input', updatePurchaseDueDateDays);
      dueDateInp.addEventListener('change', updatePurchaseDueDateDays);
    }

    // TDS / TCS buttons
    const noneBtn = document.getElementById('purchaseTdsTcsNone');
    const tdsBtn  = document.getElementById('purchaseTdsTcsTds');
    const tcsBtn  = document.getElementById('purchaseTdsTcsTcs');

    if (noneBtn && !noneBtn._wired) {
      noneBtn._wired = true;
      noneBtn.addEventListener('click', () => setPurchaseTdsTcs('None'));
    }
    if (tdsBtn && !tdsBtn._wired) {
      tdsBtn._wired = true;
      tdsBtn.addEventListener('click', () => setPurchaseTdsTcs('TDS'));
    }
    if (tcsBtn && !tcsBtn._wired) {
      tcsBtn._wired = true;
      tcsBtn.addEventListener('click', () => setPurchaseTdsTcs('TCS'));
    }

    // Rate select
    const rateSel = document.getElementById('purchaseTdsTcsRateSelect');
    if (rateSel && !rateSel._wired) {
      rateSel._wired = true;
      rateSel.addEventListener('change', () => {
        const customWrap = document.getElementById('purchaseTdsTcsRateCustomWrap');
        if (customWrap) {
          customWrap.style.display = rateSel.value === 'custom' ? 'flex' : 'none';
        }
        recalculatePurchaseTotals();
      });
    }

    const customRateInp = document.getElementById('purchaseTdsTcsRateCustom');
    if (customRateInp && !customRateInp._wired) {
      customRateInp._wired = true;
      customRateInp.addEventListener('input', recalculatePurchaseTotals);
    }

    const tdsAmtInp = document.getElementById('purchaseTdsTcsAmount');
    if (tdsAmtInp && !tdsAmtInp._wired) {
      tdsAmtInp._wired = true;
      tdsAmtInp.addEventListener('input', recalculatePurchaseTotals);
    }

    // Round off
    const roundBtn = document.getElementById('btnPurchaseAutoRoundOff');
    if (roundBtn && !roundBtn._wired) {
      roundBtn._wired = true;
      roundBtn.addEventListener('click', (e) => {
        e.preventDefault();
        autoRoundOffPurchase();
      });
    }

    const adjInp = document.getElementById('purchaseAdjustments');
    if (adjInp && !adjInp._wired) {
      adjInp._wired = true;
      adjInp.addEventListener('input', recalculatePurchaseTotals);
      adjInp.addEventListener('blur', () => {
        const val = parsePurchaseAmt(adjInp.value);
        if (!isNaN(val)) {
          adjInp.value = val === 0 ? '' : (val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2));
          recalculatePurchaseTotals();
        }
      });
      adjInp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          adjInp.blur();
        }
      });
    }

    // Supply type
    const supplySel = document.getElementById('purchaseSupplyType');
    if (supplySel && !supplySel._wired) {
      supplySel._wired = true;
      supplySel.addEventListener('change', () => {
        renderPurchaseRows();
        recalculatePurchaseTotals();
      });
    }

    // Document dropzone
    const dropzone = document.getElementById('purchaseDocDropzone');
    const fileInp  = document.getElementById('purchaseDocFileInput');
    const removeBtn = document.getElementById('purchaseDocRemoveBtn');

    if (dropzone && fileInp && !dropzone._wired) {
      dropzone._wired = true;
      dropzone.addEventListener('click', () => fileInp.click());
      fileInp.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handlePurchaseDocSelect(e.target.files[0]);
        }
      });
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--emerald-500)';
        dropzone.style.background = 'var(--emerald-50)';
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'var(--slate-300)';
        dropzone.style.background = 'var(--slate-50)';
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--slate-300)';
        dropzone.style.background = 'var(--slate-50)';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handlePurchaseDocSelect(e.dataTransfer.files[0]);
        }
      });
    }

    if (removeBtn && !removeBtn._wired) {
      removeBtn._wired = true;
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        resetPurchaseDocAttachment();
      });
    }
  }

  // Export globals
  window.initPurchaseForm = initPurchaseForm;
  window.populatePurchaseVendors = populatePurchaseVendors;
  window.populatePurchaseExecutives = populatePurchaseExecutives;
  window.populatePurchasePaymentAccounts = populatePurchasePaymentAccounts;
  window.purchaseRows = purchaseRows;

  // Auto-init on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    wirePurchaseEventListeners();
  });

  // Also wire immediately in case DOM is already loaded
  wirePurchaseEventListeners();

})();
