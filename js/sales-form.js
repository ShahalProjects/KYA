  // ── Global Sales State Variables ──
  window.salesRows = window.salesRows || [];
  window.currentSalesType = window.currentSalesType || 'Product';
  window.currentSalesVoucherSubtype = window.currentSalesVoucherSubtype || 'Invoice';
  window.currentSalesInvoiceMode = window.currentSalesInvoiceMode || 'Auto';
  window._editingSalesInvoice = window._editingSalesInvoice || null;
  window._salesUploadedDoc = window._salesUploadedDoc || null;

  // ══════════════════════════════════════════════════════════════════
  //  SALES REVENUE-ACCOUNT SEARCH DROPDOWN (recovered — was missing from split)
  // ══════════════════════════════════════════════════════════════════
    const _salesRevPortal = (() => {
    let el = document.getElementById('sales-rev-portal-dropdown');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sales-rev-portal-dropdown';
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

    if (!document.getElementById('sales-rev-portal-styles')) {
      const style = document.createElement('style');
      style.id = 'sales-rev-portal-styles';
      style.textContent = `
        #sales-rev-portal-dropdown.open {
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
    let _activeFilter = 'all';

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
      el.style.width     = Math.max(r.width, 300) + 'px';
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
      set.add('Finished Goods');
      set.add('Stock Item A');
      set.add('Raw Materials');
      set.add('Product Goods');
      if (window.KYA_STORE && window.KYA_STORE.salesVouchers) {
        window.KYA_STORE.salesVouchers.forEach(v => {
          if (v.rows) {
            v.rows.forEach(r => {
              if (r.item && (!r.itemType || r.itemType === 'Product')) set.add(r.item);
            });
          }
        });
      }
      return Array.from(set).map(name => ({ name, type: 'Product' }));
    }

    function getServicesList() {
      return getIncomeLedgers().map(l => ({ name: l.name, type: 'Service', id: l.id, aliases: l.aliases, code: l.code }));
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
        { id: 'service', label: 'Service' }
      ];
      tabs.forEach(t => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = t.label;
        btn.style.cssText = `
          flex: 1; padding: 5px 8px; font-size: 11px; font-weight: 700;
          border-radius: 6px; border: 1px solid ${t.id === _activeFilter ? '#3b82f6' : '#cbd5e1'};
          background: ${t.id === _activeFilter ? '#eff6ff' : '#ffffff'};
          color: ${t.id === _activeFilter ? '#1d4ed8' : '#475569'};
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

      let products = _activeFilter === 'service' ? [] : getProductsList();
      let services = _activeFilter === 'product' ? [] : getServicesList();

      if (q) {
        products = products.filter(p => p.name.toLowerCase().includes(q));
        services = services.filter(s => s.name.toLowerCase().includes(q) || (s.aliases && s.aliases.some(a => a.toLowerCase().includes(q))));
      }

      const queryHighlight = (text, pat) => {
        if (!pat) return text;
        const idx = text.toLowerCase().indexOf(pat.toLowerCase());
        if (idx < 0) return text;
        return text.slice(0, idx)
          + `<span class="je-drop-hl">${text.slice(idx, idx + pat.length)}</span>`
          + text.slice(idx + pat.length);
      };

      if (!products.length && !services.length) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'je-drop-empty';
        emptyDiv.innerHTML = `
          <svg class="je-drop-empty-icon" width="28" height="28" viewBox="0 0 32 32" fill="none">
            <circle cx="14" cy="14" r="9" stroke="currentColor" stroke-width="1.8"/>
            <path d="M21 21l6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          <span class="je-drop-empty-txt">No product or service found</span>
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
              e.preventDefault();
              e.stopPropagation();
              const sel = p;
              close();
              if (_activeCb) _activeCb(sel);
            };
            item.addEventListener('mousedown', handleItemSelect);
            item.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
            el.appendChild(item);
          });
        }

        if (services.length > 0) {
          const hdr = document.createElement('div');
          hdr.className = 'je-drop-header';
          hdr.textContent = 'Services';
          el.appendChild(hdr);
          services.forEach(s => {
            const item = document.createElement('div');
            item.className = 'je-drop-item';
            const akaStr = s.aliases && s.aliases.length > 0 ? ` [A.K.A: ${s.aliases.join(', ')}]` : '';
            item.innerHTML = `
              <span class="je-drop-dot" style="background:#10b981"></span>
              <span class="je-drop-name" style="flex:1">${queryHighlight(s.name, q)}${akaStr ? `<span style="font-size:11px;color:#94a3b8;margin-left:4px">${queryHighlight(akaStr, q)}</span>` : ''}</span>
              <span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:#ecfdf5;color:#059669;text-transform:uppercase;">Service</span>
            `;
            const handleItemSelect = (e) => {
              e.preventDefault();
              e.stopPropagation();
              const sel = s;
              close();
              if (_activeCb) _activeCb(sel);
            };
            item.addEventListener('mousedown', handleItemSelect);
            item.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
            el.appendChild(item);
          });
        }
      }
    }

    function close() {
      el.classList.remove('open');
      _open         = false;
      _highlightIdx = -1;
      _activeInp    = null;
    }

    function isOpen()         { return _open; }
    function moveHighlight(d) {
      const items = _items();
      if (!items.length) return;
      _setHL(Math.max(0, Math.min(_highlightIdx + d, items.length - 1)));
    }
    function selectHighlighted() {
      const items = _items();
      const idx   = _highlightIdx >= 0 ? _highlightIdx : 0;
      if (items[idx]) items[idx].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    }

    function _reposition() { if (_open && _activeInp) _position(_activeInp); }
    window.addEventListener('scroll', _reposition, true);
    window.addEventListener('resize', _reposition);

    document.addEventListener('mousedown', e => {
      if (_open && !el.contains(e.target) && e.target !== _activeInp) close();
    });

    return { open, close, isOpen, moveHighlight, selectHighlighted };
  })();

  const _salesItemPortal = _salesRevPortal;

  // ══════════════════════════════════════════════════════════════════
  //  SALES FORM — Row rendering, totals calculation, invoice/order autofill, form init
  //  (Split from sales.js for maintainability)
  // ══════════════════════════════════════════════════════════════════

  window._salesUploadedDoc = null;

  function formatSalesDocBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function updateSalesDocUI(doc) {
    const emptyState = document.getElementById('salesDocEmptyState');
    const selectedState = document.getElementById('salesDocSelectedState');
    const badge = document.getElementById('salesDocStatusBadge');
    const nameEl = document.getElementById('salesDocFileName');
    const sizeEl = document.getElementById('salesDocFileSize');
    const iconEl = document.getElementById('salesDocFileIcon');
    const previewBtn = document.getElementById('salesDocPreviewBtn');
    const fileInp = document.getElementById('salesDocFileInput');

    if (!doc || !doc.fileData) {
      window._salesUploadedDoc = null;
      if (emptyState) emptyState.style.display = 'flex';
      if (selectedState) selectedState.style.display = 'none';
      if (badge) badge.style.display = 'none';
      if (fileInp) fileInp.value = '';
      return;
    }

    window._salesUploadedDoc = doc;
    if (emptyState) emptyState.style.display = 'none';
    if (selectedState) selectedState.style.display = 'flex';
    if (badge) badge.style.display = 'inline-block';
    
    if (nameEl) nameEl.textContent = doc.fileName || 'Attachment';
    if (sizeEl) sizeEl.textContent = doc.fileSize || formatSalesDocBytes(doc.fileBytes || 0);
    
    const ext = (doc.fileName || '').split('.').pop().toUpperCase();
    if (iconEl) {
      iconEl.textContent = ext.substring(0, 4) || 'DOC';
      if (['PDF'].includes(ext)) {
        iconEl.style.background = '#fee2e2'; iconEl.style.color = '#991b1b';
      } else if (['JPG','JPEG','PNG','WEBP'].includes(ext)) {
        iconEl.style.background = '#e0e7ff'; iconEl.style.color = '#3730a3';
      } else if (['XLS','XLSX','CSV'].includes(ext)) {
        iconEl.style.background = '#dcfce7'; iconEl.style.color = '#166534';
      } else {
        iconEl.style.background = '#dbeafe'; iconEl.style.color = '#1e40af';
      }
    }
    
    if (previewBtn) {
      previewBtn.href = doc.fileData;
      previewBtn.download = doc.fileName || 'document';
    }
  }

  function handleSalesDocUpload(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('File size exceeds 10MB limit.', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const doc = {
        fileName: file.name,
        fileSize: formatSalesDocBytes(file.size),
        fileBytes: file.size,
        fileData: e.target.result
      };
      updateSalesDocUI(doc);
      showToast(`Document "${file.name}" attached.`, 'success');
    };
    reader.readAsDataURL(file);
  }

  function setupSalesDocEventListeners() {
    const fileInp = document.getElementById('salesDocFileInput');
    const dropzone = document.getElementById('salesDocDropzone');
    const removeBtn = document.getElementById('salesDocRemoveBtn');

    if (dropzone && fileInp && !dropzone.dataset.bound) {
      dropzone.dataset.bound = 'true';
      dropzone.addEventListener('click', (e) => {
        if (e.target.closest('#salesDocRemoveBtn') || e.target.closest('#salesDocPreviewBtn')) return;
        fileInp.click();
      });

      fileInp.addEventListener('change', () => {
        if (fileInp.files && fileInp.files[0]) {
          handleSalesDocUpload(fileInp.files[0]);
        }
      });

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--blue-500)';
        dropzone.style.background = 'var(--blue-50)';
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'var(--slate-300)';
        dropzone.style.background = 'var(--slate-50)';
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--slate-300)';
        dropzone.style.background = 'var(--slate-50)';
        if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
          handleSalesDocUpload(e.dataTransfer.files[0]);
        }
      });
    }

    if (removeBtn && !removeBtn.dataset.bound) {
      removeBtn.dataset.bound = 'true';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateSalesDocUI(null);
        showToast('Attached document removed.', 'info');
      });
    }
  }

  function getNextAutoInvoiceNumber() {
    const year = new Date().getFullYear();
    if (currentSalesVoucherSubtype === 'Return') {
      const ctr = window.KYA_STORE.salesReturnCtr || 1;
      return `REV-${year}-${String(ctr).padStart(3, '0')}`;
    } else if (currentSalesVoucherSubtype === 'Order') {
      const ctr = window.KYA_STORE.salesOrderCtr || 1;
      return `SO-${year}-${String(ctr).padStart(3, '0')}`;
    } else {
      const ctr = window.KYA_STORE.salesInvoiceCtr || 1;
      return `INV-${year}-${String(ctr).padStart(3, '0')}`;
    }
  }

  function setInvoiceNoMode(mode) {
    currentSalesInvoiceMode = 'Auto';
    const invNoEl = document.getElementById('salesInvoiceNo');
    const chipEl = document.getElementById('salesVoucherChipDisplay');
    
    if (!invNoEl || !chipEl) return;

    if (mode === 'Auto') {
      invNoEl.value = getNextAutoInvoiceNumber();
      chipEl.textContent = invNoEl.value;
    }
    
    if (invNoEl) {
      let ph = 'INV-2026-001';
      if (currentSalesVoucherSubtype === 'Return') ph = 'REV-2026-001';
      else if (currentSalesVoucherSubtype === 'Order') ph = 'SO-2026-001';
      invNoEl.placeholder = ph;
    }
    
    invNoEl.removeAttribute('readonly');
    invNoEl.style.background = '#fff';
    invNoEl.style.color = 'var(--slate-900)';
  }

  let _salesCustSearchControl = null;
  function getSalesCustSearchControl() {
    if (!_salesCustSearchControl && typeof initPartySearchableSelect === 'function') {
      _salesCustSearchControl = initPartySearchableSelect('salesCustomer', '— Select Customer —', 'Customer');
    }
    return _salesCustSearchControl;
  }

  function populateSalesCustomers(selectedId = null) {
    const custSelect = document.getElementById('salesCustomer');
    if (!custSelect) return;
    
    custSelect.innerHTML = '<option value="">&mdash; Select Customer &mdash;</option>';
    
    const customers = typeof getKyaCustomers === 'function' ? getKyaCustomers() : [];
    const addedNames = new Set();
    
    customers.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      const akaStr = c.aliases && c.aliases.length > 0 ? ` [A.K.A: ${c.aliases.join(', ')}]` : '';
      opt.textContent = c.name + akaStr;
      if (selectedId && String(c.id) === String(selectedId)) {
        opt.selected = true;
      }
      custSelect.appendChild(opt);
      addedNames.add((c.name || '').trim().toLowerCase());
    });

    // Also include ledgers created under Trade Receivables group in Master Desk → Ledgers
    if (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) {
      coaLedgers.forEach(l => {
        if (l.type === 'ledger' && l.sgId === 'sg-tr' && l.name && l.name.trim().toLowerCase() !== 'trade receivables') {
          if (!addedNames.has(l.name.trim().toLowerCase())) {
            const opt = document.createElement('option');
            opt.value = l.id;
            const akaStr = l.aliases && l.aliases.length > 0 ? ` [A.K.A: ${l.aliases.join(', ')}]` : '';
            opt.textContent = l.name + akaStr;
            if (selectedId && String(l.id) === String(selectedId)) {
              opt.selected = true;
            }
            custSelect.appendChild(opt);
            addedNames.add(l.name.trim().toLowerCase());
          }
        }
      });
    }

    const control = getSalesCustSearchControl();
    if (control) control.refresh();
  }

  window.onPartyCreatedForSales = function(newParty, partySource) {
    if (!newParty) return;
    populateSalesCustomers(newParty.id);
    setTimeout(() => {
      const custSelect = document.getElementById('salesCustomer');
      if (custSelect) {
        custSelect.value = newParty.id;
        custSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const ctrl = getSalesCustSearchControl();
      if (ctrl) ctrl.refresh();
      showToast(`${partySource === 'ledger' ? 'Ledger' : 'Customer'} "${newParty.name}" selected.`, 'success');
    }, 60);
  };

  window.onPartyCreationCancelledForSales = function(initialName) {
    setTimeout(() => {
      const dropdown = document.getElementById('salesCustomerSelectDropdown');
      const searchInput = document.getElementById('salesCustomerSelectSearch');
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

  function populateSalesExecutives(selectedId = null) {
    const execSelect = document.getElementById('salesExecutive');
    if (!execSelect) return;
    
    execSelect.innerHTML = '<option value="">&mdash; Select Sales Executive &mdash;</option>';
    
    ohEmployees.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = `${e.name} (${e.code})`;
      if (selectedId && e.id == selectedId) {
        opt.selected = true;
      }
      execSelect.appendChild(opt);
    });
  }

  function handleSupplyTypeChange() {
    const supplyType = document.getElementById('salesSupplyType').value;
    const isZeroTax = supplyType === 'Export (Zero-Rated / LUT)' || supplyType === 'SEZ Without Tax';
    
    salesRows.forEach(row => {
      if (isZeroTax) {
        row.tax = 0;
        const base = (row.qty || 1) * (row.rate || 0);
        const discAmt = row.discountType === 'pct' ? (base * (row.discount / 100)) : row.discount;
        row.amount = Math.max(0, base - discAmt);
      }
    });
    
    renderSalesRows();
    recalculateSalesTotals();
  }

  function populateSalesPaymentAccounts(selectedId = null) {
    const paySelect = document.getElementById('salesPaymentAccount');
    if (!paySelect) return;
    
    paySelect.innerHTML = '<option value="">&mdash; Select &mdash;</option>';
    
    let accounts = (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers))
      ? coaLedgers.filter(l => l.type === 'ledger' && l.sgId === 'sg-cce')
      : [];

    if (accounts.length === 0 && typeof getOrCreateSystemLedger === 'function') {
      getOrCreateSystemLedger('Cash Account', 'sg-cce');
      getOrCreateSystemLedger('Bank Account', 'sg-cce');
      accounts = coaLedgers.filter(l => l.type === 'ledger' && l.sgId === 'sg-cce');
    }

    accounts.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.name;
      if (selectedId && String(a.id) === String(selectedId)) {
        opt.selected = true;
      }
      paySelect.appendChild(opt);
    });
  }

  function getSalesPaymentStatus() {
    const fullBtn = document.getElementById('salesPaymentStatusFull');
    const partBtn = document.getElementById('salesPaymentStatusPartial');
    
    if (currentSalesVoucherSubtype === 'Return') {
      if (fullBtn && fullBtn.classList.contains('active')) return 'Full Refund';
      if (partBtn && partBtn.classList.contains('active')) return 'Partial Refund';
      return 'No Refund';
    }
    
    const orderNo = document.getElementById('salesOrderNo')?.value?.trim();
    let orderAdvanceAmount = 0;
    let total = calculateSubtotal();
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
    
    let grandTotal = total;
    if (tdsTcsMode === 'TDS') grandTotal = total - tdsTcsAmount;
    else if (tdsTcsMode === 'TCS') grandTotal = total + tdsTcsAmount;
    grandTotal += adjustments;

    let isOrderLinked = false;
    if (currentSalesVoucherSubtype === 'Invoice' && orderNo) {
      const linkedOrder = (window.KYA_STORE.salesVouchers || []).find(v => v.isOrder && v.invoiceNo.toLowerCase() === orderNo.toLowerCase());
      if (linkedOrder) {
        isOrderLinked = true;
        if (linkedOrder.paymentStatus === 'Full Payment') {
          orderAdvanceAmount = linkedOrder.total;
        } else if (linkedOrder.paymentStatus === 'Partial Payment') {
          orderAdvanceAmount = linkedOrder.paymentAmount || 0;
        }
      }
    }
    const excessAmount = isOrderLinked ? Math.max(0, orderAdvanceAmount - grandTotal) : 0;

    if (excessAmount > 0) {
      if (fullBtn && fullBtn.classList.contains('active')) return 'Full Refund';
      if (partBtn && partBtn.classList.contains('active')) return 'Partial Refund';
      return 'Not Refunded';
    } else {
      if (fullBtn && fullBtn.classList.contains('active')) return 'Full Payment';
      if (partBtn && partBtn.classList.contains('active')) return 'Partial Payment';
      return 'Not Paid';
    }
  }

  function getOrCreateSystemLedger(name, sgId) {
    let ldg = coaLedgers.find(l => l.type === 'ledger' && l.name.toLowerCase() === name.toLowerCase());
    if (!ldg) {
      const newId = Date.now() + _coaLedgerCtr++;
      ldg = {
        id: newId,
        sgId: sgId,
        glId: null,
        name: name,
        code: '',
        openingBalance: 0,
        type: 'ledger'
      };
      coaLedgers.push(ldg);
      
      const sg = COA_SYS_SGS.find(s => s.id === sgId);
      if (sg) {
        _coaExpanded.add(sgId);
        if (sg.parent) _coaExpanded.add(sg.parent);
        _coaExpanded.add(sg.main);
      }
      
      renderChartPanel();
      refreshAllReports();
      triggerAutoBackup();
    }
    return ldg.id;
  }

  function getIncomeLedgers() {
    let list = coaLedgers.filter(l => l.type === 'ledger' && (l.sgId === 'sg-rfo' || l.sgId === 'sg-oi'));
    if (list.length === 0) {
      getOrCreateSystemLedger('Sales Account', 'sg-rfo');
      list = coaLedgers.filter(l => l.type === 'ledger' && (l.sgId === 'sg-rfo' || l.sgId === 'sg-oi'));
    }
    return list;
  }

  function renderSalesHeaders() {
    const headerRow = document.getElementById('salesTableHeader');
    if (!headerRow) return;
    
    headerRow.innerHTML = `
      <th class="col-item" style="text-align: left; padding-left: 8px;">Description</th>
      <th class="col-hsn" style="width: 90px; text-align: left;">HSN/SAC</th>
      <th class="col-qty" style="width: 65px; text-align: right;">Qty</th>
      <th class="col-unit" style="width: 65px; text-align: center;">Unit</th>
      <th class="col-rate" style="width: 100px; text-align: right;">Rate / Price</th>
      <th class="col-disc" style="width: 105px; text-align: right;">Discount</th>
      <th class="col-tax" style="width: 75px; text-align: right; padding-right: 6px;">Tax</th>
      <th class="col-amt" style="width: 110px; text-align: right; padding-right: 8px;">Amount</th>
      <th class="col-del" style="width: 36px; text-align: center;"></th>
    `;
  }

  function renderSalesRows() {
    renderSalesHeaders();
    const body = document.getElementById('salesItemBody');
    if (!body) return;
    
    body.innerHTML = '';
    const isLocked = isSalesReturnInvoiceSelected();
    
    const supplyTypeEl = document.getElementById('salesSupplyType');
    const isZeroTax = supplyTypeEl && (supplyTypeEl.value === 'Export (Zero-Rated / LUT)' || supplyTypeEl.value === 'SEZ Without Tax');
    
    salesRows.forEach((row, index) => {
      if (isZeroTax) {
        row.tax = 0;
        const base = (row.qty || 1) * (row.rate || 0);
        const discAmt = row.discountType === 'pct' ? (base * (row.discount / 100)) : row.discount;
        row.amount = Math.max(0, base - discAmt);
      }

      const trHtml = `
        <tr class="sales-row" data-row-index="${index}">
          <td class="sales-cell-item" style="padding: 4px 8px;">
            <div style="position: relative; display: flex; align-items: center; width: 100%;">
              <input type="text" class="sales-row-item je-input" value="${ohEsc(row.item || '')}" placeholder="Select or type Description (Product / Service)" style="border: none; background: transparent; box-shadow: none; padding: 0 18px 0 0; width: 100%; font-weight: 600; font-size: 13px; color: var(--slate-800); outline: none; ${isLocked ? 'cursor: not-allowed; color: var(--slate-500);' : ''}" ${isLocked ? 'readonly' : ''} autocomplete="off" />
              <span class="sales-row-drop-arrow" style="position: absolute; right: 2px; pointer-events: none; color: var(--slate-400); font-size: 10px;">▼</span>
            </div>
          </td>
          <td class="sales-cell-hsn" style="width: 90px; padding: 4px 6px;">
            <input type="text" class="sales-row-hsn je-input" value="${ohEsc(row.hsn || '')}" placeholder="HSN/SAC" style="border: none; background: transparent; box-shadow: none; padding: 0; font-size: 12.5px; font-family: monospace, inherit; font-weight: 600; color: var(--slate-700); outline: none; width: 100%;" ${isLocked ? 'readonly' : ''} />
          </td>
          <td class="sales-cell-qty" style="width: 65px; padding: 4px 6px;">
            <input type="number" class="sales-row-qty je-input" value="${row.qty !== undefined ? row.qty : 1}" min="0" style="border: none; background: transparent; box-shadow: none; text-align: right; padding: 0; font-weight: 600; font-size: 13px; color: var(--slate-800); outline: none; width: 100%;" />
          </td>
          <td class="sales-cell-unit" style="width: 65px; padding: 4px 6px; text-align: center;">
            <input type="text" class="sales-row-unit je-input" value="${ohEsc(row.unit || '')}" placeholder="Unit" style="border: none; background: transparent; box-shadow: none; text-align: center; padding: 0; font-weight: 600; text-transform: uppercase; font-size: 12px; color: var(--slate-700); outline: none; width: 100%;" ${isLocked ? 'readonly' : ''} />
          </td>
          <td class="sales-cell-rate" style="width: 100px; padding: 4px 6px;">
            <input type="text" inputmode="decimal" class="sales-row-rate je-input" value="${row.rate === 0 || row.rate === undefined ? '' : (typeof row.rate === 'number' ? row.rate.toFixed(2) : row.rate)}" placeholder="0.00" style="border: none; background: transparent; box-shadow: none; text-align: right; padding: 0; font-weight: 600; font-size: 13px; color: var(--slate-800); outline: none; width: 100%;" />
          </td>
          <td class="sales-cell-disc" style="width: 105px; padding: 4px 6px;">
            <div style="display: flex; gap: 2px; align-items: center; justify-content: flex-end;">
              <input type="text" inputmode="decimal" class="sales-row-discount je-input" value="${row.discount === 0 || row.discount === undefined ? '' : (typeof row.discount === 'number' ? row.discount.toFixed(2) : row.discount)}" placeholder="0.00" style="border: none; background: transparent; box-shadow: none; text-align: right; width: 55px; padding: 0; font-weight: 600; font-size: 13px; color: var(--slate-800); outline: none;" />
              <select class="sales-row-discount-type je-input" style="border: none; background: transparent; box-shadow: none; width: 22px; padding: 0; font-weight: 700; cursor: pointer; text-align: center; text-align-last: center; -webkit-appearance: none; -moz-appearance: none; appearance: none; font-size: 12px; color: var(--blue-600); outline: none; ${isLocked ? 'cursor: not-allowed; color: var(--slate-500);' : ''}" ${isLocked ? 'disabled' : ''}>
                <option value="val" ${row.discountType === 'val' || !row.discountType ? 'selected' : ''}>₹</option>
                <option value="pct" ${row.discountType === 'pct' ? 'selected' : ''}>%</option>
              </select>
            </div>
          </td>
          <td class="sales-cell-tax" style="width: 75px; padding: 4px 6px;">
            <select class="sales-row-tax je-input" style="border: none; background: transparent; box-shadow: none; text-align: right; text-align-last: right; padding-right: 2px; font-weight: 600; font-size: 12.5px; color: var(--slate-800); width: 100%; outline: none; cursor: pointer;" ${isZeroTax ? 'disabled' : ''}>
              <option value="0" ${row.tax === 0 ? 'selected' : ''}>0%</option>
              <option value="5" ${row.tax === 5 ? 'selected' : ''}>5%</option>
              <option value="12" ${row.tax === 12 ? 'selected' : ''}>12%</option>
              <option value="18" ${row.tax === 18 || row.tax === undefined ? 'selected' : ''}>18%</option>
              <option value="28" ${row.tax === 28 ? 'selected' : ''}>28%</option>
            </select>
          </td>
          <td class="sales-cell-amt" style="width: 110px; padding: 4px 6px;">
            <input type="text" inputmode="decimal" class="sales-row-amount-input je-input" value="${row.amount === 0 || row.amount === undefined ? '' : row.amount.toFixed(2)}" placeholder="0.00" style="border: none; background: transparent; box-shadow: none; text-align: right; padding: 0; font-weight: 700; width: 100%; font-size: 13.5px; color: var(--slate-900); outline: none;" />
          </td>
          <td class="sales-del-cell" style="width: 36px; padding: 2px; text-align: center; border: none !important; background: transparent !important; box-shadow: none !important;">
            <button type="button" class="sales-del-row" style="background: none; border: none !important; outline: none !important; box-shadow: none !important; color: var(--red-600); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; margin: 0 auto; transition: background 0.15s;" onmouseover="this.style.backgroundColor='var(--red-50)'" onmouseout="this.style.backgroundColor='transparent'">
              <svg viewBox="0 0 15 15" fill="none" style="width: 13px; height: 13px;">
                <path d="M5.5 2h4M1.5 4h12M2.5 4l1 9.5a1 1 0 001 .5h6a1 1 0 001-.5l1-9.5M5.5 6.5v5M9.5 6.5v5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
              </svg>
            </button>
          </td>
        </tr>
      `;
      
      const tempDiv = document.createElement('tbody');
      tempDiv.innerHTML = trHtml;
      const tr = tempDiv.firstElementChild;
      body.appendChild(tr);

      const itemInp = tr.querySelector('.sales-row-item');
      if (itemInp) {
        const attachPortal = () => {
          _salesItemPortal.open(itemInp, itemInp.value, (selectedItem) => {
            itemInp.value = selectedItem.name;
            salesRows[index].item = selectedItem.name;
            salesRows[index].itemType = selectedItem.type;
            if (selectedItem.type === 'Service' && selectedItem.id) {
              salesRows[index].revenueLedgerId = selectedItem.id;
            }
            recalculateSalesTotals();
          });
        };

        itemInp.addEventListener('focus', attachPortal);
        itemInp.addEventListener('click', attachPortal);
        itemInp.addEventListener('input', () => {
          salesRows[index].item = itemInp.value;
          attachPortal();
        });
      }
    });
  }

  function addSalesRow() {
    salesRows.push({ item: '', hsn: '', qty: 1, unit: '', rate: 0, discount: 0, discountType: 'val', tax: 18, amount: 0 });
    renderSalesRows();
    recalculateSalesTotals();
  }

  function switchSalesType(type) {
    currentSalesType = type;
    salesRows = [];
    addSalesRow();
  }

  function updateRowFromDOM(index, tr, triggeredBy) {
    const row = salesRows[index];
    if (!row) return;

    const amtInput  = tr.querySelector('.sales-row-amount-input');
    const amountEdited = (triggeredBy === 'amount');

    const itemEl = tr.querySelector('.sales-row-item');
    if (itemEl) row.item = itemEl.value;

    const hsnEl = tr.querySelector('.sales-row-hsn');
    if (hsnEl) row.hsn = hsnEl.value;

    const unitEl = tr.querySelector('.sales-row-unit');
    if (unitEl) row.unit = unitEl.value;

    let qty      = parseFloat(tr.querySelector('.sales-row-qty')?.value) || 0;
    let rate     = Math.round(parseSalesAmt(tr.querySelector('.sales-row-rate')?.value || '0') * 100) / 100;
    let discount = parseSalesAmt(tr.querySelector('.sales-row-discount')?.value || '0');
    row.discountType = tr.querySelector('.sales-row-discount-type')?.value || 'val';
    row.tax = parseFloat(tr.querySelector('.sales-row-tax')?.value) || 0;

    if (amountEdited) {
      const enteredAmount = Math.round(parseSalesAmt(amtInput.value) * 100) / 100;
      if (amtInput && document.activeElement !== amtInput) {
        amtInput.value = enteredAmount === 0 ? '' : enteredAmount.toFixed(2);
      }
      
      const taxFactor     = 1 + row.tax / 100;
      const afterDiscount = enteredAmount / taxFactor;
      let base;
      if (row.discountType === 'pct') {
        const pctFactor = 1 - (discount / 100);
        base = pctFactor > 0 ? afterDiscount / pctFactor : 0;
      } else {
        base = afterDiscount + discount;
      }
      rate = Math.round((qty > 0 ? base / qty : 0) * 100) / 100;

      if (currentSalesVoucherSubtype === 'Return' && row.origRate !== undefined) {
        if (rate > row.origRate) {
          rate = row.origRate;
          showToast(`Rate cannot exceed original invoice rate of ₹${fmtNum(row.origRate)}.`, 'warning');
        }
      }

      row.qty      = qty;
      row.rate     = rate;
      row.discount = discount;
      row.amount   = enteredAmount;

      const rateInput = tr.querySelector('.sales-row-rate');
      if (rateInput && document.activeElement !== rateInput) {
        rateInput.value = rate === 0 ? '' : rate.toFixed(2);
      }
    } else {
      if (currentSalesVoucherSubtype === 'Return' && row.origQty !== undefined) {
        if (qty > row.origQty) {
          qty = row.origQty;
          if (tr.querySelector('.sales-row-qty')) tr.querySelector('.sales-row-qty').value = qty;
          showToast(`Quantity cannot exceed remaining quantity of ${row.origQty}.`, 'warning');
        }
        if (rate > row.origRate) {
          rate = row.origRate;
          const rateInput = tr.querySelector('.sales-row-rate');
          if (rateInput && document.activeElement !== rateInput) {
            rateInput.value = rate === 0 ? '' : rate.toFixed(2);
          }
          showToast(`Rate cannot exceed original invoice rate of ₹${fmtNum(row.origRate)}.`, 'warning');
        }
        if (discount > row.origDiscount) {
          discount = row.origDiscount;
          if (tr.querySelector('.sales-row-discount')) tr.querySelector('.sales-row-discount').value = discount === 0 ? '' : discount;
        }
      }

      row.qty      = qty;
      row.rate     = rate;
      row.discount = discount;

      const base          = row.qty * row.rate;
      const discAmt       = row.discountType === 'pct' ? (base * (row.discount / 100)) : row.discount;
      const afterDiscount = Math.max(0, base - discAmt);
      const taxAmt        = afterDiscount * (row.tax / 100);
      row.amount          = Math.round((afterDiscount + taxAmt) * 100) / 100;

      if (amtInput && document.activeElement !== amtInput) {
        amtInput.value = row.amount === 0 ? '' : row.amount.toFixed(2);
      }
    }

    recalculateSalesTotals();
  }

  function autoCalculateSalesRoundOff() {
    const btnAuto = document.getElementById('btnSalesAutoRoundOff');
    const adjEl = document.getElementById('salesAdjustments');
    
    // Toggle OFF if already active and has value
    if (btnAuto && btnAuto.classList.contains('active') && adjEl && adjEl.value.trim() !== '') {
      adjEl.value = '';
      btnAuto.classList.remove('active');
      recalculateSalesTotals();
      return;
    }

    const subTotal = calculateSubtotal();
    
    let tdsTcsMode = 'None';
    const tdsBtn = document.getElementById('salesTdsTcsTds');
    const tcsBtn = document.getElementById('salesTdsTcsTcs');
    if (tdsBtn && tdsBtn.classList.contains('active')) tdsTcsMode = 'TDS';
    if (tcsBtn && tcsBtn.classList.contains('active')) tdsTcsMode = 'TCS';
    
    const amountInput = document.getElementById('salesTdsTcsAmount');
    const tdsTcsAmount = amountInput ? (parseSalesAmt(amountInput.value) || 0) : 0;
    
    let rawTotal = subTotal;
    if (tdsTcsMode === 'TDS') {
      rawTotal = subTotal - tdsTcsAmount;
    } else if (tdsTcsMode === 'TCS') {
      rawTotal = subTotal + tdsTcsAmount;
    }
    
    const roundedTotal = Math.round(rawTotal);
    const roundOffAmt = Math.round((roundedTotal - rawTotal) * 100) / 100;
    
    if (adjEl) {
      adjEl.value = roundOffAmt === 0 ? '' : roundOffAmt.toFixed(2);
      if (btnAuto) btnAuto.classList.add('active');
      recalculateSalesTotals();
    }
  }

  function syncSalesRowsFromDOM() {
    const body = document.getElementById('salesItemBody');
    if (!body) return;
    const trs = body.querySelectorAll('tr.sales-row');
    if (trs.length === 0) return;
    
    trs.forEach((tr, index) => {
      if (!salesRows[index]) {
        salesRows[index] = { item: '', hsn: '', qty: 1, unit: '', rate: 0, discount: 0, discountType: 'val', tax: 18, amount: 0 };
      }
      const row = salesRows[index];
      const itemEl = tr.querySelector('.sales-row-item');
      if (itemEl && itemEl.value !== undefined) row.item = itemEl.value;

      const hsnEl = tr.querySelector('.sales-row-hsn');
      if (hsnEl && hsnEl.value !== undefined) row.hsn = hsnEl.value;

      const unitEl = tr.querySelector('.sales-row-unit');
      if (unitEl && unitEl.value !== undefined) row.unit = unitEl.value;

      const qtyEl = tr.querySelector('.sales-row-qty');
      if (qtyEl && qtyEl.value !== '') row.qty = parseFloat(qtyEl.value) || 0;

      const rateEl = tr.querySelector('.sales-row-rate');
      if (rateEl && rateEl.value !== '') row.rate = parseSalesAmt(rateEl.value) || 0;

      const baseEl = tr.querySelector('.sales-row-base');
      if (baseEl && baseEl.value !== '') row.baseAmount = parseSalesAmt(baseEl.value) || 0;

      const discEl = tr.querySelector('.sales-row-discount');
      if (discEl && discEl.value !== '') row.discount = parseSalesAmt(discEl.value) || 0;

      const discTypeEl = tr.querySelector('.sales-row-discount-type');
      if (discTypeEl && discTypeEl.value !== undefined) row.discountType = discTypeEl.value || 'val';

      const taxEl = tr.querySelector('.sales-row-tax');
      if (taxEl && taxEl.value !== undefined) row.tax = parseFloat(taxEl.value) || 0;

      const amtEl = tr.querySelector('.sales-row-amount-input');
      if (amtEl && amtEl.value !== '') {
        row.amount = parseSalesAmt(amtEl.value) || 0;
      } else {
        if (currentSalesType === 'Product') {
          const base = (row.qty || 1) * (row.rate || 0);
          const discAmt = row.discountType === 'pct' ? (base * ((row.discount || 0) / 100)) : (row.discount || 0);
          const afterDisc = Math.max(0, base - discAmt);
          row.amount = Math.round((afterDisc * (1 + (row.tax || 0) / 100)) * 100) / 100;
        } else {
          const base = (row.baseAmount || 0);
          const discAmt = row.discountType === 'pct' ? (base * ((row.discount || 0) / 100)) : (row.discount || 0);
          const afterDisc = Math.max(0, base - discAmt);
          row.amount = Math.round((afterDisc * (1 + (row.tax || 0) / 100)) * 100) / 100;
        }
      }

      const revSelect = tr.querySelector('.sales-row-rev');
      if (revSelect && revSelect.value) row.revenueLedgerId = revSelect.value;
    });
  }

  function calculateSubtotal() {
    if (typeof salesRows === 'undefined' || !Array.isArray(salesRows)) return 0;
    let sub = 0;
    salesRows.forEach(r => {
      sub += (parseFloat(r.amount) || 0);
    });
    return Math.round(sub * 100) / 100;
  }

  function recalculateSalesTotals() {
    const subTotal = calculateSubtotal();
    const subTotalEl = document.getElementById('salesSubTotal');
    if (subTotalEl) subTotalEl.textContent = '₹ ' + fmtNum(subTotal);
    
    let tdsTcsMode = 'None';
    const tdsBtn = document.getElementById('salesTdsTcsTds');
    const tcsBtn = document.getElementById('salesTdsTcsTcs');
    if (tdsBtn && tdsBtn.classList.contains('active')) tdsTcsMode = 'TDS';
    if (tcsBtn && tcsBtn.classList.contains('active')) tdsTcsMode = 'TCS';
    
    const rateSelect = document.getElementById('salesTdsTcsRateSelect');
    const customWrap = document.getElementById('salesTdsTcsRateCustomWrap');
    let rate = 0;
    
    if (tdsTcsMode === 'None') {
      rate = 0;
    } else if (rateSelect) {
      if (rateSelect.value === 'custom') {
        if (customWrap) customWrap.style.display = 'flex';
        const customInput = document.getElementById('salesTdsTcsRateCustom');
        rate = customInput ? (parseFloat(customInput.value) || 0) : 0;
      } else {
        if (customWrap) customWrap.style.display = 'none';
        rate = parseFloat(rateSelect.value) || 0;
      }
    }
    
    const rateLabel = document.getElementById('salesTdsTcsRateLabel');
    if (rateLabel) {
      rateLabel.textContent = (rate % 1 === 0 ? rate.toFixed(0) : (rate * 10 % 1 === 0 ? rate.toFixed(1) : rate.toFixed(2))) + '%';
    }
    
    const amountInput = document.getElementById('salesTdsTcsAmount');
    
    if (amountInput && document.activeElement !== amountInput) {
      if (tdsTcsMode !== 'None') {
        const calculatedAmt = subTotal * (rate / 100);
        amountInput.value = calculatedAmt.toFixed(2);
      } else {
        amountInput.value = '';
      }
    }
    
    const tdsTcsAmount = amountInput ? (parseFloat(amountInput.value) || 0) : 0;
    const adjustmentsInput = document.getElementById('salesAdjustments');
    const adjustments = adjustmentsInput ? (parseFloat(adjustmentsInput.value) || 0) : 0;

    const btnAuto = document.getElementById('btnSalesAutoRoundOff');
    if (btnAuto) {
      if (adjustmentsInput && adjustmentsInput.value.trim() !== '' && adjustments !== 0) {
        btnAuto.classList.add('active');
      } else if (!adjustmentsInput || adjustmentsInput.value.trim() === '') {
        btnAuto.classList.remove('active');
      }
    }
    
    let total = subTotal;
    if (tdsTcsMode === 'TDS') {
      total = subTotal - tdsTcsAmount;
    } else if (tdsTcsMode === 'TCS') {
      total = subTotal + tdsTcsAmount;
    }
    total += adjustments;
    
    const totalEl = document.getElementById('salesTotal');
    if (totalEl) totalEl.textContent = '₹ ' + fmtNum(total);

    // Adjust Payment Amount in real-time if it exceeds the new Grand Total or Balance Payment
    const payAmtEl = document.getElementById('salesPaymentAmount');
    if (payAmtEl) {
      const maxVal = getSalesPaymentMax(total);
      const orderNo = document.getElementById('salesOrderNo')?.value?.trim();
      const isOrderLinked = (currentSalesVoucherSubtype === 'Invoice' && orderNo);
      
      let orderAdvanceAmount = 0;
      if (isOrderLinked) {
        const linkedOrder = (window.KYA_STORE.salesVouchers || []).find(v => v.isOrder && v.invoiceNo.toLowerCase() === orderNo.toLowerCase());
        if (linkedOrder) {
          if (linkedOrder.paymentStatus === 'Full Payment') {
            orderAdvanceAmount = linkedOrder.total;
          } else if (linkedOrder.paymentStatus === 'Partial Payment') {
            orderAdvanceAmount = linkedOrder.paymentAmount || 0;
          }
        }
      }
      const excessAmount = Math.max(0, orderAdvanceAmount - total);

      if (isOrderLinked) {
        payAmtEl.max = excessAmount > 0 ? excessAmount : maxVal;
      } else if (currentSalesVoucherSubtype === 'Return' && payAmtEl.max) {
        // Keep return logic max as set in updateSalesReturnLockState
      } else {
        payAmtEl.removeAttribute('max');
      }
      
      if (payAmtEl.value && total > 0) {
        const currentVal = parseFloat(payAmtEl.value) || 0;
        const allowedMax = (isOrderLinked && excessAmount > 0) ? excessAmount : maxVal;
        if (currentVal > allowedMax) {
          payAmtEl.value = allowedMax.toFixed(2);
          const limitMsg = (isOrderLinked && excessAmount > 0)
            ? `Refund Amount adjusted to ₹${fmtNum(allowedMax)} to not exceed the excess refund amount.`
            : (isOrderLinked 
               ? `Payment Amount adjusted to ₹${fmtNum(allowedMax)} to not exceed the balance payment.`
               : `Payment Amount adjusted to ₹${fmtNum(allowedMax)} to not exceed the Grand Total.`);
          showToast(limitMsg, 'warning');
        }
      }
    }
    
    // Show/hide Refund Info Message banner
    const refundInfoEl = document.getElementById('salesRefundInfoMessage');
    const payStatusWrapEl = document.querySelector('.sales-paystatus-wrap');
    if (refundInfoEl && payStatusWrapEl) {
      let orderAdvanceAmount = 0;
      const orderNo = document.getElementById('salesOrderNo')?.value?.trim();
      const isOrderLinked = (currentSalesVoucherSubtype === 'Invoice' && orderNo);
      
      if (isOrderLinked) {
        const linkedOrder = (window.KYA_STORE.salesVouchers || []).find(v => v.isOrder && v.invoiceNo.toLowerCase() === orderNo.toLowerCase());
        if (linkedOrder) {
          if (linkedOrder.paymentStatus === 'Full Payment') {
            orderAdvanceAmount = linkedOrder.total;
          } else if (linkedOrder.paymentStatus === 'Partial Payment') {
            orderAdvanceAmount = linkedOrder.paymentAmount || 0;
          }
        }
      }
      
      const excessAmount = Math.max(0, orderAdvanceAmount - total);
      if (isOrderLinked && excessAmount > 0) {
        payStatusWrapEl.style.display = 'flex';
        refundInfoEl.style.display = 'block';
        
        const payStatus = getSalesPaymentStatus();
        if (payStatus === 'Full Refund') {
          refundInfoEl.textContent = `Refund due: ₹${fmtNum(excessAmount)} (Fully Refunded now). This will be paid from the selected Payment Account.`;
        } else if (payStatus === 'Partial Refund') {
          const refundAmt = parseFloat(document.getElementById('salesPaymentAmount')?.value) || 0;
          const remaining = Math.max(0, excessAmount - refundAmt);
          refundInfoEl.textContent = `Refund due: ₹${fmtNum(excessAmount)} (₹${fmtNum(refundAmt)} refunded now, ₹${fmtNum(remaining)} Refund Payable).`;
        } else {
          refundInfoEl.textContent = `Refund due: ₹${fmtNum(excessAmount)} (Refund later). This will be recorded under Refund Payable and will set status to Not Refunded.`;
        }
      } else {
        payStatusWrapEl.style.display = 'flex';
        refundInfoEl.style.display = 'none';
        refundInfoEl.textContent = '';
      }
    }
    
    updateSalesPaymentUI();
  }

  function updateVoucherSubtypeUI() {
    const newSalesBtn = document.getElementById('btnNewSales');
    const returnBtn = document.getElementById('btnSalesReturn');
    const orderBtn = document.getElementById('btnSalesOrder');
    const cardTitle = document.querySelector('#panel-sales-voucher .je-card-title-text');
    const cardSubtitle = document.querySelector('#panel-sales-voucher .je-card-subtitle-text');
    const invoiceNoLabel = document.getElementById('lblSalesInvoiceNo');
    const invoiceNoInput = document.getElementById('salesInvoiceNo');
    const selectWrap = document.getElementById('salesInvoiceSelectWrap');
    const invoiceNoContainer = document.getElementById('salesInvoiceNoContainer');
    const orderNoContainer = document.getElementById('salesOrderNoContainer');
    const postSalesBtn = document.getElementById('btnPostSales');

    if (invoiceNoLabel) invoiceNoLabel.textContent = 'Invoice No.';

    const activeBtn = (btn) => {
      if (btn) {
        btn.className = 'btn btn-primary';
        btn.style.background = 'var(--blue-700)';
        btn.style.color = '#fff';
        btn.style.borderColor = 'var(--blue-700)';
      }
    };
    const deactiveBtn = (btn) => {
      if (btn) {
        btn.className = 'btn-sales-action';
        btn.style.background = 'var(--white)';
        btn.style.color = 'var(--slate-600)';
        btn.style.borderColor = 'var(--slate-200)';
      }
    };

    deactiveBtn(newSalesBtn);
    deactiveBtn(returnBtn);
    deactiveBtn(orderBtn);

    if (currentSalesVoucherSubtype === 'Return') {
      activeBtn(returnBtn);
      if (cardTitle) cardTitle.textContent = 'Sales Reversal';
      if (cardSubtitle) cardSubtitle.textContent = 'Record sales reversals and customer credits';
      if (invoiceNoContainer) invoiceNoContainer.style.display = 'block';
      if (invoiceNoLabel) invoiceNoLabel.textContent = 'Original Doc';
      if (invoiceNoInput) invoiceNoInput.style.display = 'none';
      if (selectWrap) {
        selectWrap.style.display = 'block';
        refreshSalesInvoiceDropdownOptions();
      }
      if (orderNoContainer) orderNoContainer.style.display = 'block';
      if (postSalesBtn) {
        postSalesBtn.innerHTML = `<svg viewBox="0 0 15 15" fill="none" style="width:14px; height:14px; margin-right:6px; display:inline-block; vertical-align:middle;"><path d="M2.5 8l4 4 6-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> Post Reversal`;
      }
    } else if (currentSalesVoucherSubtype === 'Order') {
      activeBtn(orderBtn);
      if (cardTitle) cardTitle.textContent = 'Sales Pre Invoice';
      if (cardSubtitle) cardSubtitle.textContent = 'Record pre-invoices without impact on books';
      if (invoiceNoContainer) invoiceNoContainer.style.display = 'block';
      if (invoiceNoLabel) invoiceNoLabel.textContent = 'Pre Invoice No.';
      if (invoiceNoInput) {
        invoiceNoInput.style.display = 'block';
        invoiceNoInput.placeholder = 'SO-2026-001';
      }
      if (selectWrap) selectWrap.style.display = 'none';
      if (orderNoContainer) orderNoContainer.style.display = 'none';
      if (postSalesBtn) {
        postSalesBtn.innerHTML = `<svg viewBox="0 0 15 15" fill="none" style="width:14px; height:14px; margin-right:6px; display:inline-block; vertical-align:middle;"><path d="M2.5 8l4 4 6-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> Place Order`;
      }
    } else {
      activeBtn(newSalesBtn);
      if (cardTitle) cardTitle.textContent = 'Sales Invoice';
      if (cardSubtitle) cardSubtitle.textContent = 'Record sales transactions and customer receivables';
      if (invoiceNoContainer) invoiceNoContainer.style.display = 'block';
      if (invoiceNoInput) {
        invoiceNoInput.style.display = 'block';
        invoiceNoInput.placeholder = 'INV-2026-001';
      }
      if (selectWrap) selectWrap.style.display = 'none';
      if (orderNoContainer) orderNoContainer.style.display = 'block';
      if (postSalesBtn) {
        postSalesBtn.innerHTML = `<svg viewBox="0 0 15 15" fill="none" style="width:14px; height:14px; margin-right:6px; display:inline-block; vertical-align:middle;"><path d="M2.5 8l4 4 6-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> Post Invoice`;
      }
    }
  }

  function refreshSalesInvoiceDropdownOptions(filter = '') {
    const optionsList = document.getElementById('salesInvoiceSelectOptionsList');
    const triggerText = document.getElementById('salesInvoiceSelectTriggerText');
    if (!optionsList || !triggerText) return;

    optionsList.innerHTML = '';
    
    // Get all posted invoices/orders that are NOT returns and NOT completely returned
    const invoices = (window.KYA_STORE.salesVouchers || []).filter(v => {
      if (v.isReturn) return false;
      if (v.isOrder) {
        // Only show orders that have NOT been converted to a sale (Invoice)
        const isConverted = (window.KYA_STORE.salesVouchers || []).some(inv => !inv.isOrder && !inv.isReturn && inv.orderNo && inv.orderNo.toLowerCase() === v.invoiceNo.toLowerCase());
        if (isConverted) return false;
      }
      const remainingRows = getInvoiceRemainingRows(v);
      if (v.type === 'Product') {
        return remainingRows.some(row => row.qty > 0);
      } else {
        return remainingRows.some(row => row.baseAmount > 0);
      }
    });
    
    const query = filter.toLowerCase().trim();
    let matchCount = 0;
    
    invoices.forEach(inv => {
      const custName = inv.customerId ? ((coaLedgers.find(l => l.id == inv.customerId) || { name: 'Customer' }).name) : 'No Customer';
      const docType = inv.isOrder ? 'Pre-Inv' : 'Inv';
      const text = `${docType}: ${inv.invoiceNo} - ${custName} (${inv.date}) - ₹${fmtNum(inv.total)}`;
      if (query && !text.toLowerCase().includes(query)) {
        return;
      }
      matchCount++;
      
      const item = document.createElement('div');
      item.style.padding = '8px 12px';
      item.style.fontSize = '13px';
      item.style.borderRadius = '6px';
      item.style.cursor = 'pointer';
      item.style.fontWeight = '500';
      item.style.color = 'var(--slate-700)';
      item.style.whiteSpace = 'nowrap';
      item.style.overflow = 'hidden';
      item.style.textOverflow = 'ellipsis';
      
      item.textContent = text;
      
      item.addEventListener('mouseover', () => {
        item.style.background = 'var(--slate-50)';
      });
      item.addEventListener('mouseout', () => {
        item.style.background = 'transparent';
      });
      
      item.addEventListener('click', () => {
        triggerText.textContent = inv.invoiceNo;
        
        autoFillFormFromInvoice(inv);
        
        const dropdown = document.getElementById('salesInvoiceSelectDropdown');
        if (dropdown) dropdown.style.display = 'none';
      });
      
      optionsList.appendChild(item);
    });
    
    if (matchCount === 0) {
      const noResult = document.createElement('div');
      noResult.style.padding = '8px 12px';
      noResult.style.fontSize = '12px';
      noResult.style.color = 'var(--slate-400)';
      noResult.style.textAlign = 'center';
      noResult.textContent = 'No matching documents';
      optionsList.appendChild(noResult);
    }
  }

  function autoFillFormFromInvoice(inv) {
    const custEl = document.getElementById('salesCustomer');
    if (custEl) {
      custEl.value = inv.customerId;
      populateSalesCustomers(inv.customerId);
    }
    
    const execEl = document.getElementById('salesExecutive');
    if (execEl) {
      execEl.value = inv.salesExecutiveId || '';
      populateSalesExecutives(inv.salesExecutiveId);
    }
    
    const supplyTypeEl = document.getElementById('salesSupplyType');
    if (supplyTypeEl) {
      supplyTypeEl.value = inv.salesSupplyType || 'Intra-State (CGST + SGST)';
    }
    
    const notesEl = document.getElementById('salesNotes');
    if (notesEl) {
      const docLabel = inv.isOrder ? 'pre-invoice' : 'invoice';
      notesEl.value = `Return against ${docLabel} ${inv.invoiceNo}. ${inv.notes || ''}`;
    }
    
    const adjEl = document.getElementById('salesAdjustments');
    if (adjEl) {
      adjEl.value = inv.adjustments || '';
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
    
    currentSalesType = inv.type;
    const prodBtn = document.getElementById('salesTypeProduct');
    const servBtn = document.getElementById('salesTypeService');
    const typeBg = document.getElementById('salesTypeBg');
    if (inv.type === 'Product') {
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
    
    const remainingRows = getInvoiceRemainingRows(inv);
    salesRows = remainingRows.filter(row => {
      if (inv.type === 'Product') {
        return row.qty > 0;
      } else {
        return row.baseAmount > 0;
      }
    });
    salesRows.forEach(row => {
      row.origQty = row.qty;
      row.origRate = row.rate;
      row.origDiscount = row.discount;
      row.origDiscountType = row.discountType;
      row.origBaseAmount = row.baseAmount;
    });
    renderSalesRows();
    updateSalesReturnLockState();
    recalculateSalesTotals();
  }

  function refreshSalesOrderDropdownOptions(filter = '') {
    const optionsList = document.getElementById('salesOrderSelectOptionsList');
    const triggerText = document.getElementById('salesOrderSelectTriggerText');
    const orderEl = document.getElementById('salesOrderNo');
    if (!optionsList || !triggerText || !orderEl) return;

    optionsList.innerHTML = '';
    
    // Default "None" option
    const noneItem = document.createElement('div');
    noneItem.style.padding = '8px 12px';
    noneItem.style.fontSize = '13px';
    noneItem.style.borderRadius = '6px';
    noneItem.style.cursor = 'pointer';
    noneItem.style.fontWeight = '600';
    noneItem.style.color = 'var(--slate-500)';
    noneItem.textContent = 'None';
    
    noneItem.addEventListener('mouseover', () => {
      noneItem.style.background = 'var(--slate-50)';
    });
    noneItem.addEventListener('mouseout', () => {
      noneItem.style.background = 'transparent';
    });
    noneItem.addEventListener('click', () => {
      triggerText.textContent = 'None';
      orderEl.value = '';
      
      const dropdown = document.getElementById('salesOrderSelectDropdown');
      if (dropdown) dropdown.style.display = 'none';
      recalculateSalesTotals();
    });
    optionsList.appendChild(noneItem);

    // Get all posted sales orders (excluding those already converted to a posted sales invoice)
    const postedInvoices = (window.KYA_STORE.salesVouchers || []).filter(v => !v.isOrder && !v.isReturn);
    const convertedOrderNos = new Set(postedInvoices.map(inv => inv.orderNo).filter(no => !!no));
    const orders = (window.KYA_STORE.salesVouchers || []).filter(v => v.isOrder && !convertedOrderNos.has(v.invoiceNo));
    
    const query = filter.toLowerCase().trim();
    let matchCount = 0;
    
    orders.forEach(order => {
      const custName = order.customerId ? ((coaLedgers.find(l => l.id == order.customerId) || { name: 'Customer' }).name) : 'No Customer';
      const text = `${order.invoiceNo} - ${custName} (${order.date}) - ₹${fmtNum(order.total)}`;
      if (query && !text.toLowerCase().includes(query)) {
        return;
      }
      matchCount++;
      
      const item = document.createElement('div');
      item.style.padding = '8px 12px';
      item.style.fontSize = '13px';
      item.style.borderRadius = '6px';
      item.style.cursor = 'pointer';
      item.style.fontWeight = '500';
      item.style.color = 'var(--slate-700)';
      item.style.whiteSpace = 'nowrap';
      item.style.overflow = 'hidden';
      item.style.textOverflow = 'ellipsis';
      
      item.textContent = text;
      
      item.addEventListener('mouseover', () => {
        item.style.background = 'var(--slate-50)';
      });
      item.addEventListener('mouseout', () => {
        item.style.background = 'transparent';
      });
      
      item.addEventListener('click', () => {
        triggerText.textContent = order.invoiceNo;
        orderEl.value = order.invoiceNo;
        
        autoFillFormFromOrder(order);
        
        const dropdown = document.getElementById('salesOrderSelectDropdown');
        if (dropdown) dropdown.style.display = 'none';
      });
      
      optionsList.appendChild(item);
    });
    
    if (query && matchCount === 0) {
      const noResult = document.createElement('div');
      noResult.style.padding = '8px 12px';
      noResult.style.fontSize = '12px';
      noResult.style.color = 'var(--slate-400)';
      noResult.style.textAlign = 'center';
      noResult.textContent = 'No matching orders';
      optionsList.appendChild(noResult);
    }
  }

  function autoFillFormFromOrder(order) {
    const custEl = document.getElementById('salesCustomer');
    if (custEl) {
      custEl.value = order.customerId || '';
      populateSalesCustomers(order.customerId);
    }
    
    const execEl = document.getElementById('salesExecutive');
    if (execEl) {
      execEl.value = order.salesExecutiveId || '';
      populateSalesExecutives(order.salesExecutiveId);
    }
    
    const supplyTypeEl = document.getElementById('salesSupplyType');
    if (supplyTypeEl) {
      supplyTypeEl.value = order.salesSupplyType || 'Intra-State (CGST + SGST)';
    }
    
    const notesEl = document.getElementById('salesNotes');
    if (notesEl) {
      notesEl.value = order.notes || '';
    }
    
    const adjEl = document.getElementById('salesAdjustments');
    if (adjEl) {
      adjEl.value = order.adjustments || '';
    }
    
    const noneBtn = document.getElementById('salesTdsTcsNone');
    const tdsBtn = document.getElementById('salesTdsTcsTds');
    const tcsBtn = document.getElementById('salesTdsTcsTcs');
    if (order.tdsTcsMode === 'TDS' && tdsBtn) tdsBtn.click();
    else if (order.tdsTcsMode === 'TCS' && tcsBtn) tcsBtn.click();
    else if (noneBtn) noneBtn.click();
    
    const rateSelect = document.getElementById('salesTdsTcsRateSelect');
    const customInput = document.getElementById('salesTdsTcsRateCustom');
    const customWrap = document.getElementById('salesTdsTcsRateCustomWrap');
    const rateVal = order.tdsTcsRate || 0;
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
    
    currentSalesType = order.type;
    const prodBtn = document.getElementById('salesTypeProduct');
    const servBtn = document.getElementById('salesTypeService');
    const typeBg = document.getElementById('salesTypeBg');
    if (order.type === 'Product') {
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
    
    // Copy rows
    salesRows = JSON.parse(JSON.stringify(order.rows));
    
    renderSalesRows();
    recalculateSalesTotals();
  }

  function initSalesForm() {
    updateVoucherSubtypeUI();
    const today = new Date().toISOString().split('T')[0];
    const dateEl = document.getElementById('salesDate');
    const dueEl = document.getElementById('salesDueDate');
    if (dateEl) dateEl.value = today;
    if (dueEl) dueEl.value = today;
    
    const orderEl = document.getElementById('salesOrderNo');
    const notesEl = document.getElementById('salesNotes');
    const adjEl = document.getElementById('salesAdjustments');
    if (orderEl) orderEl.value = '';
    const orderTriggerText = document.getElementById('salesOrderSelectTriggerText');
    if (orderTriggerText) orderTriggerText.textContent = 'None';
    if (notesEl) notesEl.value = '';
    if (adjEl) adjEl.value = '';
    
    const noneBtn = document.getElementById('salesTdsTcsNone');
    if (noneBtn) noneBtn.click();
    const rateSelect = document.getElementById('salesTdsTcsRateSelect');
    const customInput = document.getElementById('salesTdsTcsRateCustom');
    const customWrap = document.getElementById('salesTdsTcsRateCustomWrap');
    const label = document.getElementById('salesTdsTcsRateLabel');
    const amt = document.getElementById('salesTdsTcsAmount');
    if (rateSelect) rateSelect.value = '1';
    if (customInput) customInput.value = '';
    if (customWrap) customWrap.style.display = 'none';
    if (label) label.textContent = '0%';
    if (amt) amt.value = '';
    
    populateSalesCustomers();
    populateSalesExecutives();
    const execEl = document.getElementById('salesExecutive');
    if (execEl) execEl.value = '';
    const supplyTypeEl = document.getElementById('salesSupplyType');
    if (supplyTypeEl) supplyTypeEl.value = 'Intra-State (CGST + SGST)';
    const notPaidBtn = document.getElementById('salesPaymentStatusNotPaid');
    if (notPaidBtn) notPaidBtn.click();
    const payAccEl = document.getElementById('salesPaymentAccount');
    if (payAccEl) payAccEl.value = '';
    const payAmtEl = document.getElementById('salesPaymentAmount');
    if (payAmtEl) payAmtEl.value = '';
    setInvoiceNoMode('Auto');
    
    currentSalesType = 'Product';
    const prodBtn = document.getElementById('salesTypeProduct');
    const servBtn = document.getElementById('salesTypeService');
    const typeBg = document.getElementById('salesTypeBg');
    if (prodBtn) prodBtn.classList.add('active');
    if (servBtn) servBtn.classList.remove('active');
    if (typeBg) {
      typeBg.classList.add('prod-active');
      typeBg.classList.remove('serv-active');
    }
    
    const triggerText = document.getElementById('salesInvoiceSelectTriggerText');
    if (triggerText) triggerText.textContent = 'Select Invoice/Order';

    salesRows = [];
    addSalesRow();
    updateSalesReturnLockState();
    updateSalesDocUI(null);
    setupSalesDocEventListeners();
    wireSalesMoreDropdown();
  }

  function wireSalesMoreDropdown() {
    const moreBtn = document.getElementById('salesMoreBtn');
    const moreDropdown = document.getElementById('salesMoreDropdown');
    const submenuBtn = document.getElementById('salesExportMenuBtn');
    const submenu = document.getElementById('salesExportSubmenu');
    const pdfBtn = document.getElementById('salesExportPdf');
    const excelBtn = document.getElementById('salesExportExcel');

    if (!moreBtn || moreBtn._isWired) return;
    moreBtn._isWired = true;

    function closeAllSalesMenus() {
      if (moreDropdown) {
        moreDropdown.classList.remove('active');
        moreDropdown.classList.remove('open');
      }
      if (submenu) {
        submenu.classList.remove('active');
        submenu.classList.remove('open');
      }
    }

    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = moreDropdown.classList.contains('active') || moreDropdown.classList.contains('open');
      closeAllSalesMenus();
      if (!isOpen) {
        moreDropdown.classList.add('active');
        moreDropdown.classList.add('open');
      }
    });

    if (submenuBtn && submenu) {
      let closeTimer = null;
      submenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        submenu.classList.toggle('active');
        submenu.classList.toggle('open');
      });
      const submenuWrap = document.getElementById('salesExportSubmenuWrap');
      if (submenuWrap) {
        submenuWrap.addEventListener('mouseenter', () => {
          if (closeTimer) clearTimeout(closeTimer);
          submenu.classList.add('active');
          submenu.classList.add('open');
        });
        submenuWrap.addEventListener('mouseleave', () => {
          closeTimer = setTimeout(() => {
            submenu.classList.remove('active');
            submenu.classList.remove('open');
          }, 300);
        });
        submenu.addEventListener('mouseenter', () => {
          if (closeTimer) clearTimeout(closeTimer);
          submenu.classList.add('active');
          submenu.classList.add('open');
        });
      }
    }

    function extractCurrentSalesInvoiceData() {
      if (typeof syncSalesRowsFromDOM === 'function') {
        syncSalesRowsFromDOM();
      }
      const date = document.getElementById('salesDate')?.value || new Date().toISOString().slice(0, 10);
      const invoiceNo = document.getElementById('salesInvoiceNo')?.value?.trim() || (typeof getNextAutoInvoiceNumber === 'function' ? getNextAutoInvoiceNumber() : 'INV-2026-001');
      const customerId = document.getElementById('salesCustomer')?.value || '';
      const salesExecutiveId = document.getElementById('salesExecutive')?.value || '';
      const salesSupplyType = document.getElementById('salesSupplyType')?.value || 'Intra-State (CGST + SGST)';
      const dueDate = document.getElementById('salesDueDate')?.value || '';
      const orderNo = document.getElementById('salesOrderNo')?.value || '';
      const notes = document.getElementById('salesNotes')?.value || '';
      const adjustments = parseFloat(document.getElementById('salesAdjustments')?.value) || 0;
      const subTotal = typeof calculateSubtotal === 'function' ? calculateSubtotal() : 0;
      const tdsTcsMode = typeof getSalesTdsTcsMode === 'function' ? getSalesTdsTcsMode() : 'None';
      const tdsTcsRate = typeof getSalesTdsTcsRate === 'function' ? getSalesTdsTcsRate() : 0;
      const tdsTcsAmount = typeof getSalesTdsTcsAmount === 'function' ? getSalesTdsTcsAmount(subTotal) : 0;
      let total = subTotal + adjustments;
      if (tdsTcsMode === 'TCS') total += tdsTcsAmount;
      else if (tdsTcsMode === 'TDS') total -= tdsTcsAmount;
      const paymentStatus = typeof getSalesPaymentStatus === 'function' ? getSalesPaymentStatus() : 'Not Paid';
      const paymentAccountId = document.getElementById('salesPaymentAccount')?.value || '';
      const paymentAmount = parseFloat(document.getElementById('salesPaymentAmount')?.value) || 0;

      return {
        id: (window._editingSalesInvoice ? window._editingSalesInvoice.id : Date.now()),
        type: typeof currentSalesType !== 'undefined' ? currentSalesType : 'Product',
        mode: typeof currentSalesInvoiceMode !== 'undefined' ? currentSalesInvoiceMode : 'Auto',
        invoiceNo: invoiceNo || 'INV-2026-001',
        isReturn: typeof currentSalesVoucherSubtype !== 'undefined' && currentSalesVoucherSubtype === 'Return',
        isOrder: typeof currentSalesVoucherSubtype !== 'undefined' && currentSalesVoucherSubtype === 'Order',
        returnAgainstInvoice: (typeof currentSalesVoucherSubtype !== 'undefined' && currentSalesVoucherSubtype === 'Return') ? (document.getElementById('salesInvoiceSelectTriggerText')?.textContent.trim() || '') : '',
        customerId,
        salesExecutiveId,
        salesSupplyType,
        date,
        dueDate,
        orderNo,
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
        rows: JSON.parse(JSON.stringify(typeof salesRows !== 'undefined' ? salesRows : [])),
        partyOverride: window._salesPartyOverride ? JSON.parse(JSON.stringify(window._salesPartyOverride)) : null,
        uploadedDoc: window._salesUploadedDoc || null
      };
    }

    if (pdfBtn) {
      pdfBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        closeAllSalesMenus();
        const invData = extractCurrentSalesInvoiceData();
        if (typeof window.exportInvoiceToPDF === 'function') {
          await window.exportInvoiceToPDF(invData);
        } else if (typeof showToast === 'function') {
          showToast('PDF export module not loaded.', 'warning');
        }
      });
    }

    if (excelBtn) {
      excelBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        closeAllSalesMenus();
        const invData = extractCurrentSalesInvoiceData();
        if (typeof window.exportInvoiceToExcel === 'function') {
          await window.exportInvoiceToExcel(invData);
        } else if (typeof showToast === 'function') {
          showToast('Excel export module not loaded.', 'warning');
        }
      });
    }

    const configBtn = document.getElementById('salesMoreConfigBtn');
    if (configBtn) {
      configBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllSalesMenus();
        if (typeof openTab === 'function') {
          openTab('settings');
          if (typeof switchSettingsTab === 'function') {
            switchSettingsTab('sales');
          }
        }
      });
    }

    document.addEventListener('click', (e) => {
      if (moreDropdown && !moreDropdown.contains(e.target) && moreBtn && !moreBtn.contains(e.target)) {
        closeAllSalesMenus();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllSalesMenus();
      }
    });
  }

  // ── Global Window Exports ──
  window.initSalesForm = initSalesForm;
  window.wireSalesMoreDropdown = wireSalesMoreDropdown;
  window.populateSalesCustomers = populateSalesCustomers;
  window.populateSalesExecutives = populateSalesExecutives;
  window.populateSalesPaymentAccounts = populateSalesPaymentAccounts;
  window.renderSalesRows = renderSalesRows;
  window.addSalesRow = addSalesRow;
  window.switchSalesType = switchSalesType;
  window.syncSalesRowsFromDOM = syncSalesRowsFromDOM;
  window.calculateSubtotal = calculateSubtotal;
  window.recalculateSalesTotals = recalculateSalesTotals;
  window.getSalesPaymentStatus = getSalesPaymentStatus;
  window.setInvoiceNoMode = setInvoiceNoMode;
