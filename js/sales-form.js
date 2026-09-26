  // ── Stock Item / Revenue-from-Operations masters used by the row pickers ──
  const KYA_STOCK_ITEMS_STORAGE_KEY = 'kya_master_stock_items';

  function getMasterStockItemList() {
    if (window._masterStockItems && Array.isArray(window._masterStockItems)) {
      return window._masterStockItems;
    }
    try {
      const saved = localStorage.getItem(KYA_STOCK_ITEMS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  }
  window.getMasterStockItemList = getMasterStockItemList;

  function getRevenueFromOperationsLedgers() {
    if (typeof coaLedgers === 'undefined' || !Array.isArray(coaLedgers)) return [];
    const list = coaLedgers.filter(l => l.type === 'ledger' && l.sgId === 'sg-rfo');
    if (list.length === 0 && typeof getOrCreateSystemLedger === 'function') {
      getOrCreateSystemLedger('Sales Account', 'sg-rfo');
      return coaLedgers.filter(l => l.type === 'ledger' && l.sgId === 'sg-rfo');
    }
    return list;
  }
  window.getRevenueFromOperationsLedgers = getRevenueFromOperationsLedgers;

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

    // Products come from the Stock Item master (Master Desk / Stock Hub), carrying their
    // HSN code, GST rate, unit and selling price so the row can fill itself in.
    function toProductPick(it) {
      return {
        name: it.name || 'Unnamed Item',
        type: 'Product',
        id: it.id || '',
        sku: it.sku || '',
        unit: it.uom || '',
        rate: (typeof it.price === 'number' && it.price > 0) ? it.price : (parseFloat(it.rate) || 0),
        stockQty: parseFloat(it.qty) || 0,
        hsn: it.hsnCode || '',
        hsnDesc: it.hsnDesc || '',
        gst: (typeof it.gst === 'number') ? it.gst : 18,
        aliases: Array.isArray(it.aliases) ? it.aliases : []
      };
    }
    function getProductsList() {
      return getMasterStockItemList().map(toProductPick);
    }

    // Services come from the Revenue from Operations ledgers, carrying their SAC code
    // and GST rate.
    function toServicePick(l) {
      return {
        name: l.name,
        type: 'Service',
        id: l.id,
        aliases: Array.isArray(l.aliases) ? l.aliases : [],
        code: l.code,
        sac: (l.sacInfo && l.sacInfo.sacCode) || '',
        sacDesc: (l.sacInfo && l.sacInfo.sacDesc) || '',
        gst: (l.sacInfo && typeof l.sacInfo.gstRate === 'number') ? l.sacInfo.gstRate : undefined
      };
    }
    function getServicesList() {
      return getRevenueFromOperationsLedgers().map(toServicePick);
    }

    // ── Create a missing Stock Item / Service in Master Desk, then come back ──
    // The row that asked is remembered here; Master Desk calls back via
    // window.onVoucherItemCreated / onVoucherItemCreationCancelled.
    let _pendingCreate = null;

    function _startCreate(kind, name) {
      _pendingCreate = { cb: _activeCb, inp: _activeInp };
      close();
      const ctx = { initialName: name, returnTab: 'sales_voucher', purpose: 'voucherItem' };
      if (kind === 'Product') {
        if (typeof window.openMasterDeskCreateStockItem === 'function') window.openMasterDeskCreateStockItem(ctx);
      } else if (typeof window.openMasterDeskCreateLedger === 'function') {
        window.openMasterDeskCreateLedger(Object.assign(ctx, { groupVal: 'sg:sg-rfo' }));
      }
    }

    window.onVoucherItemCreated = function (entity, kind) {
      const pending = _pendingCreate;
      _pendingCreate = null;
      if (!pending || !entity) return;
      const sel = kind === 'Service' ? toServicePick(entity) : toProductPick(entity);
      // Let the voucher tab finish showing before filling the row
      setTimeout(() => {
        if (typeof pending.cb === 'function') pending.cb(sel);
        const tr = pending.inp && pending.inp.closest('tr');
        const next = tr && tr.querySelector('.sales-row-qty:not([readonly])');
        if (next) { next.focus(); next.select(); }
      }, 0);
    };

    window.onVoucherItemCreationCancelled = function () {
      const pending = _pendingCreate;
      _pendingCreate = null;
      if (pending && pending.inp) setTimeout(() => pending.inp.focus(), 0);
    };

    function _renderCreateOptions(rawQuery) {
      const showProduct = _activeFilter !== 'service' && typeof window.openMasterDeskCreateStockItem === 'function';
      const showService = _activeFilter !== 'product' && typeof window.openMasterDeskCreateLedger === 'function';
      if (!showProduct && !showService) return;

      const wrap = document.createElement('div');
      wrap.className = 'je-drop-create-wrap';
      wrap.style.cssText = `
        position: sticky; bottom: 0; z-index: 10; background: #ffffff;
        border-top: 1px solid #e2e8f0; padding: 8px 10px 10px;
        border-radius: 0 0 12px 12px;
      `;
      const label = document.createElement('div');
      label.style.cssText = 'font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
      label.textContent = rawQuery ? `Create "${rawQuery}" as` : 'Create new';
      wrap.appendChild(label);

      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'display: flex; gap: 6px;';
      const plusSvg = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
      const addBtn = (kind, text) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'je-drop-create-item';
        btn.style.cssText = 'padding: 7px 10px; font-size: 12px;';
        btn.innerHTML = `${plusSvg}<span>${text}</span>`;
        btn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          _startCreate(kind, rawQuery);
        });
        btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
        btnRow.appendChild(btn);
      };
      if (showProduct) addBtn('Product', 'Stock Item');
      if (showService) addBtn('Service', 'Service');
      wrap.appendChild(btnRow);
      el.appendChild(wrap);
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
        products = products.filter(p =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.hsn && p.hsn.toLowerCase().includes(q)) ||
          (p.aliases && p.aliases.some(a => (a || '').toLowerCase().includes(q))));
        services = services.filter(s =>
          s.name.toLowerCase().includes(q) ||
          (s.sac && s.sac.toLowerCase().includes(q)) ||
          (s.aliases && s.aliases.some(a => a.toLowerCase().includes(q))));
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
          <span class="je-drop-empty-txt">No stock item or service found</span>
          <span class="je-drop-empty-sub">Create one below, or type a description directly</span>
        `;
        el.appendChild(emptyDiv);
      } else {
        if (products.length > 0) {
          const hdr = document.createElement('div');
          hdr.className = 'je-drop-header';
          hdr.textContent = 'Stock Items';
          el.appendChild(hdr);
          products.forEach(p => {
            const item = document.createElement('div');
            item.className = 'je-drop-item';
            const meta = [];
            if (p.sku) meta.push(p.sku);
            if (p.hsn) meta.push('HSN ' + p.hsn);
            if (typeof p.gst === 'number') meta.push(p.gst + '% GST');
            if (p.unit) meta.push(p.unit);
            item.innerHTML = `
              <span class="je-drop-dot" style="background:#3b82f6"></span>
              <span class="je-drop-name" style="flex:1">${queryHighlight(p.name, q)}${meta.length ? `<span style="display:block;font-size:10.5px;font-weight:600;color:#94a3b8;margin-top:1px">${meta.join(' · ')}</span>` : ''}</span>
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
          hdr.textContent = 'Revenue from Operations';
          el.appendChild(hdr);
          services.forEach(s => {
            const item = document.createElement('div');
            item.className = 'je-drop-item';
            const akaStr = s.aliases && s.aliases.length > 0 ? ` [A.K.A: ${s.aliases.join(', ')}]` : '';
            const meta = [];
            if (s.sac) meta.push('SAC ' + s.sac);
            if (typeof s.gst === 'number') meta.push(s.gst + '% GST');
            item.innerHTML = `
              <span class="je-drop-dot" style="background:#10b981"></span>
              <span class="je-drop-name" style="flex:1">${queryHighlight(s.name, q)}${akaStr ? `<span style="font-size:11px;color:#94a3b8;margin-left:4px">${queryHighlight(akaStr, q)}</span>` : ''}${meta.length ? `<span style="display:block;font-size:10.5px;font-weight:600;color:#94a3b8;margin-top:1px">${meta.join(' · ')}</span>` : ''}</span>
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

      // Offer to create the item unless the typed name already exists exactly
      const rawQuery = (query || '').trim();
      const exactMatch = q && products.concat(services).some(x => (x.name || '').toLowerCase() === q);
      if (!exactMatch) _renderCreateOptions(rawQuery);
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

    // Applies a master record to the row behind `inp` through that voucher's own
    // select handler (the one its focus listener hands to open()).
    function pickFor(inp, sel) {
      if (!inp || !sel) return;
      inp.dispatchEvent(new Event('focus'));
      const cb = _activeCb;
      close();
      if (typeof cb === 'function') cb(sel);
    }
    function toPick(entity, kind) {
      return kind === 'Service' ? toServicePick(entity) : toProductPick(entity);
    }

    return { open, close, isOpen, moveHighlight, selectHighlighted, pickFor, toPick };
  })();

  const _salesItemPortal = _salesRevPortal;

  // ══════════════════════════════════════════════════════════════════
  //  HSN / SAC CODE PICKER — searchable code master for the row's HSN/SAC cell.
  //  Products list HSN codes, services list SAC codes (same masters Master Desk uses).
  // ══════════════════════════════════════════════════════════════════
  const _salesCodePortal = (() => {
    let el = document.getElementById('sales-code-portal-dropdown');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sales-code-portal-dropdown';
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
        min-width: 320px;
        font-family: Inter, sans-serif;
        scrollbar-width: thin;
        scrollbar-color: #cbd5e1 transparent;
      `;
      document.body.appendChild(el);
    }

    if (!document.getElementById('sales-code-portal-styles')) {
      const style = document.createElement('style');
      style.id = 'sales-code-portal-styles';
      style.textContent = `
        #sales-code-portal-dropdown.open {
          display: block !important;
          animation: jeDropIn .14s cubic-bezier(.2,0,.2,1);
        }
      `;
      document.head.appendChild(style);
    }

    const MAX_RESULTS = 60;

    let _activeInp = null;
    let _activeCb  = null;
    let _activeKind = 'HSN';
    let _highlightIdx = -1;
    let _open = false;

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
      const r = inp.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom - 8;
      const spaceAbove = r.top - 8;
      const maxH = Math.min(320, Math.max(spaceBelow, spaceAbove) - 8);
      el.style.maxHeight = maxH + 'px';
      el.style.width = Math.max(r.width, 340) + 'px';
      el.style.left = Math.max(8, Math.min(r.left, window.innerWidth - Math.max(r.width, 340) - 8)) + 'px';
      if (spaceBelow >= 160 || spaceBelow >= spaceAbove) {
        el.style.top = (r.bottom + 6) + 'px';
        el.style.bottom = 'auto';
      } else {
        el.style.top = 'auto';
        el.style.bottom = (window.innerHeight - r.top + 6) + 'px';
      }
    }

    function _codeList(kind) {
      const list = (kind === 'SAC') ? window.SAC_CODE_LIST : window.HSN_CODE_LIST;
      return Array.isArray(list) ? list : [];
    }

    function open(inp, query, kind, onSelect) {
      _activeInp = inp;
      _activeCb = onSelect;
      _activeKind = (kind === 'SAC') ? 'SAC' : 'HSN';
      _highlightIdx = -1;
      _position(inp);
      _render(query);
      el.classList.add('open');
      _open = true;
    }

    function _render(query) {
      const q = (query || '').toLowerCase().trim();
      el.innerHTML = '';

      const hdr = document.createElement('div');
      hdr.className = 'je-drop-header';
      hdr.textContent = _activeKind === 'SAC' ? 'SAC Codes (Services)' : 'HSN Codes (Products)';
      el.appendChild(hdr);

      const all = _codeList(_activeKind);
      let matches = q
        ? all.filter(pair => String(pair[0]).toLowerCase().startsWith(q) ||
                             String(pair[0]).toLowerCase().includes(q) ||
                             String(pair[1]).toLowerCase().includes(q))
        : all;

      // Codes matching from the start rank first — that is how people type them.
      if (q) {
        matches = matches.slice().sort((a, b) => {
          const aStarts = String(a[0]).toLowerCase().startsWith(q) ? 0 : 1;
          const bStarts = String(b[0]).toLowerCase().startsWith(q) ? 0 : 1;
          return aStarts - bStarts;
        });
      }

      const shown = matches.slice(0, MAX_RESULTS);

      if (!shown.length) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'je-drop-empty';
        emptyDiv.innerHTML = `
          <svg class="je-drop-empty-icon" width="28" height="28" viewBox="0 0 32 32" fill="none">
            <circle cx="14" cy="14" r="9" stroke="currentColor" stroke-width="1.8"/>
            <path d="M21 21l6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          <span class="je-drop-empty-txt">No ${_activeKind} code found</span>
          <span class="je-drop-empty-sub">Search by code or description, or type the code directly</span>
        `;
        el.appendChild(emptyDiv);
        return;
      }

      shown.forEach(pair => {
        const code = String(pair[0]);
        const desc = String(pair[1] || '');
        const item = document.createElement('div');
        item.className = 'je-drop-item';
        item.innerHTML = `
          <span style="font-family: monospace, inherit; font-size: 12.5px; font-weight: 800; color: #1d4ed8; min-width: 66px;">${ohEsc(code)}</span>
          <span class="je-drop-name" style="flex:1; font-size: 12.5px; color: #475569;">${ohEsc(desc)}</span>
        `;
        const handleSelect = (e) => {
          e.preventDefault();
          e.stopPropagation();
          close();
          if (_activeCb) _activeCb({ code: code, desc: desc, kind: _activeKind });
        };
        item.addEventListener('mousedown', handleSelect);
        item.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
        el.appendChild(item);
      });

      if (matches.length > shown.length) {
        const more = document.createElement('div');
        more.className = 'je-drop-header';
        more.style.cssText = 'text-align:center; color:#94a3b8; font-weight:600;';
        more.textContent = `${matches.length - shown.length} more — keep typing to narrow`;
        el.appendChild(more);
      }
    }

    function close() {
      el.classList.remove('open');
      _open = false;
      _highlightIdx = -1;
      _activeInp = null;
    }

    function isOpen() { return _open; }
    function moveHighlight(d) {
      const items = _items();
      if (!items.length) return;
      _setHL(Math.max(0, Math.min(_highlightIdx + d, items.length - 1)));
    }
    function selectHighlighted() {
      const items = _items();
      const idx = _highlightIdx >= 0 ? _highlightIdx : 0;
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
  window._salesCodePortal = _salesCodePortal;

  // ══════════════════════════════════════════════════════════════════
  //  UNIT PICKER — row Unit cell lists the Master Desk Unit master. A unit that
  //  isn't in the master can still be typed; the cell is then flagged so it's clear
  //  it was used without being created. "Create Unit" opens Master Desk and returns.
  // ══════════════════════════════════════════════════════════════════
  function getMasterUnitList() {
    if (Array.isArray(window._masterUnits)) return window._masterUnits;
    try {
      const parsed = JSON.parse(localStorage.getItem('kya_master_units') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  }

  // Returns the master unit matching a typed value (symbol, formal name or alias).
  function findMasterUnit(value) {
    const v = (value || '').trim().toLowerCase();
    if (!v) return null;
    return getMasterUnitList().find(u =>
      (u.symbol || '').toLowerCase() === v ||
      (u.formalName || '').toLowerCase() === v ||
      (Array.isArray(u.aliases) && u.aliases.some(a => (a || '').toLowerCase() === v))
    ) || null;
  }

  // Flags a Unit input whose value is not in the Unit master, and shows its Alter
  // pencil only when it is a master unit.
  function markVoucherRowUnit(unitInp) {
    if (!unitInp) return;
    const val = unitInp.value.trim();
    const master = val ? findMasterUnit(val) : null;
    const unlisted = !!val && !master;
    unitInp.classList.toggle('kya-unit-unlisted', unlisted);
    unitInp.title = unlisted ? `"${val}" is not in the Unit master — used as typed` : '';
    const pencil = unitInp.parentElement && unitInp.parentElement.querySelector('.kya-alter-pencil[data-alter="unit"]');
    if (pencil) pencil.hidden = !master;
  }
  window.markVoucherRowUnit = markVoucherRowUnit;

  // ══════════════════════════════════════════════════════════════════
  //  ALTER PENCILS — Customer, row Description and row Unit open the record in
  //  Master Desk → Alter; saving it returns here and refreshes the voucher.
  // ══════════════════════════════════════════════════════════════════
  const ALTER_PENCIL_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>';
  let _pendingAlter = null;

  function makeAlterPencil(kind, label) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'kya-alter-pencil';
    btn.dataset.alter = kind;
    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.tabIndex = -1;
    btn.innerHTML = ALTER_PENCIL_SVG;
    // Keep focus (and any open picker) where it is until the click lands
    btn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
    return btn;
  }

  function goAlter(tab, id, pending) {
    if (typeof window.openMasterDeskAlter !== 'function') return;
    _pendingAlter = pending;
    window.openMasterDeskAlter({ tab: tab, id: id, returnTab: 'sales_voucher' });
  }

  // The master record a row's Description is linked to, if it still exists.
  function getRowLinkedMaster(row) {
    if (!row) return null;
    if (row.stockItemId) {
      const it = getMasterStockItemList().find(x => String(x.id) === String(row.stockItemId));
      if (it) return { tab: 'stock_item', id: it.id, entity: it, kind: 'Product' };
    }
    if (row.revenueLedgerId && typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) {
      const l = coaLedgers.find(x => String(x.id) === String(row.revenueLedgerId));
      if (l) return { tab: 'ledger', id: l.id, entity: l, kind: 'Service' };
    }
    return null;
  }

  // Adds the Description and Unit pencils to one voucher row. `getRow` returns that
  // row's data object (each voucher keeps its own rows array).
  function attachVoucherRowAlterButtons(tr, getRow) {
    if (!tr || tr._alterPencilsWired) return;
    tr._alterPencilsWired = true;

    const itemInp = tr.querySelector('.sales-row-item');
    if (itemInp && !itemInp.readOnly && itemInp.parentElement) {
      const btn = makeAlterPencil('item', 'Alter this item in Master Desk');
      btn.style.right = '16px';
      itemInp.style.paddingRight = '36px';
      itemInp.parentElement.appendChild(btn);
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const linked = getRowLinkedMaster(getRow());
        if (!linked) return;
        _salesItemPortal.close();
        goAlter(linked.tab, linked.id, { type: 'item', inp: itemInp, kind: linked.kind, tr: tr });
      });
    }

    const unitInp = tr.querySelector('.sales-row-unit');
    if (unitInp && !unitInp.readOnly && unitInp.parentElement) {
      const cell = unitInp.parentElement;
      if (getComputedStyle(cell).position === 'static') cell.style.position = 'relative';
      const btn = makeAlterPencil('unit', 'Alter this unit in Master Desk');
      btn.style.right = '0';
      cell.appendChild(btn);
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const unit = findMasterUnit(unitInp.value);
        if (!unit) return;
        _salesUnitPortal.close();
        goAlter('unit', unit.id, { type: 'unit', inp: unitInp });
      });
      markVoucherRowUnit(unitInp);
    }

    tr._refreshAlterPencils = () => {
      const itemBtn = tr.querySelector('.kya-alter-pencil[data-alter="item"]');
      if (itemBtn) itemBtn.hidden = !getRowLinkedMaster(getRow());
      markVoucherRowUnit(tr.querySelector('.sales-row-unit'));
    };
    tr._refreshAlterPencils();
  }
  window.attachVoucherRowAlterButtons = attachVoucherRowAlterButtons;

  // Customer box pencil: shown once a customer (or Trade Receivables ledger) is picked.
  function getSalesCustomerMaster() {
    const val = (document.getElementById('salesCustomer') || {}).value;
    if (!val) return null;
    const cust = (typeof getKyaCustomers === 'function' ? getKyaCustomers() : []).find(c => String(c.id) === String(val));
    if (cust) return { tab: 'customers', id: cust.id };
    if (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) {
      const l = coaLedgers.find(x => String(x.id) === String(val));
      if (l) return { tab: 'ledger', id: l.id };
    }
    return null;
  }

  function refreshSalesCustomerAlterPencil() {
    const btn = document.getElementById('btnSalesCustomerAlter');
    const text = document.getElementById('salesCustomerSelectTriggerText');
    const show = !!getSalesCustomerMaster();
    if (btn) btn.hidden = !show;
    // Keep a long name clear of the pencil
    if (text) {
      text.style.paddingRight = show ? '26px' : '';
      text.style.overflow = 'hidden';
      text.style.textOverflow = 'ellipsis';
      text.style.whiteSpace = 'nowrap';
    }
  }
  window.refreshSalesCustomerAlterPencil = refreshSalesCustomerAlterPencil;

  (function wireSalesCustomerAlterPencil() {
    const btn = document.getElementById('btnSalesCustomerAlter');
    const sel = document.getElementById('salesCustomer');
    if (!btn || btn._wired) return;
    btn._wired = true;
    btn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const m = getSalesCustomerMaster();
      if (m) goAlter(m.tab, m.id, { type: 'customer' });
    });
    if (sel) sel.addEventListener('change', refreshSalesCustomerAlterPencil);
    refreshSalesCustomerAlterPencil();
  })();

  window.onVoucherMasterAltered = function (tab, record) {
    const pending = _pendingAlter;
    _pendingAlter = null;
    if (!pending || !record) return;
    setTimeout(() => {
      if (pending.type === 'customer') {
        // Same customer, refreshed name/details. The voucher's cached copy of the party is
        // dropped so it rebuilds from the altered master — unless it was edited for this
        // invoice on purpose.
        const ov = window._salesPartyOverride;
        if (ov && String(ov.partyId) === String(record.id) && !ov.isOverridden) window._salesPartyOverride = null;
        populateSalesCustomers(record.id);
        const sel = document.getElementById('salesCustomer');
        if (sel) {
          sel.value = record.id;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
        refreshSalesCustomerAlterPencil();
      } else if (pending.type === 'item') {
        // Re-apply the altered item to its row (name, HSN/SAC, unit, price, GST)
        _salesItemPortal.pickFor(pending.inp, _salesItemPortal.toPick(record, pending.kind));
        if (pending.tr && pending.tr._refreshAlterPencils) pending.tr._refreshAlterPencils();
      } else if (pending.type === 'unit') {
        const inp = pending.inp;
        if (inp) {
          inp.value = record.symbol || inp.value;
          inp._unitSilent = true;
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp._unitSilent = false;
          markVoucherRowUnit(inp);
        }
      }
    }, 0);
  };

  window.onVoucherMasterAlterCancelled = function () {
    const pending = _pendingAlter;
    _pendingAlter = null;
    if (pending && pending.type === 'unit') setTimeout(() => markVoucherRowUnit(pending.inp), 0);
  };

  const _salesUnitPortal = (() => {
    let el = document.getElementById('sales-unit-portal-dropdown');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sales-unit-portal-dropdown';
      el.style.cssText = `
        position: fixed; z-index: 99999; background: #ffffff;
        border: 1.5px solid #e2e8f0; border-radius: 14px;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,.06), 0 12px 32px -4px rgba(0,0,0,.14), 0 0 0 1px rgba(0,0,0,.02);
        max-height: 320px; overflow-y: auto; overflow-x: hidden; display: none;
        font-family: Inter, sans-serif; scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent;
      `;
      document.body.appendChild(el);
    }
    if (!document.getElementById('sales-unit-portal-styles')) {
      const style = document.createElement('style');
      style.id = 'sales-unit-portal-styles';
      style.textContent = `
        #sales-unit-portal-dropdown.open { display: block !important; animation: jeDropIn .14s cubic-bezier(.2,0,.2,1); }
      `;
      document.head.appendChild(style);
    }

    const WIDTH = 260;
    let _activeInp = null;
    let _highlightIdx = -1;
    let _open = false;
    let _pendingCreate = null;

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
      const r = inp.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom - 8;
      const spaceAbove = r.top - 8;
      el.style.maxHeight = Math.min(320, Math.max(spaceBelow, spaceAbove) - 8) + 'px';
      el.style.width = WIDTH + 'px';
      el.style.left = Math.max(8, Math.min(r.left, window.innerWidth - WIDTH - 8)) + 'px';
      if (spaceBelow >= 160 || spaceBelow >= spaceAbove) {
        el.style.top = (r.bottom + 6) + 'px';
        el.style.bottom = 'auto';
      } else {
        el.style.top = 'auto';
        el.style.bottom = (window.innerHeight - r.top + 6) + 'px';
      }
    }

    // Writes a unit into the input and lets the voucher's own row listener pick it up.
    function _apply(inp, value) {
      if (!inp) return;
      inp.value = value;
      inp._unitSilent = true;
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp._unitSilent = false;
      markVoucherRowUnit(inp);
    }

    function open(inp) {
      _activeInp = inp;
      _highlightIdx = -1;
      _position(inp);
      _render(inp.value);
      el.classList.add('open');
      _open = true;
    }

    function _render(query) {
      const raw = (query || '').trim();
      const q = raw.toLowerCase();
      el.innerHTML = '';

      const all = getMasterUnitList();
      const matches = q
        ? all.filter(u => (u.symbol || '').toLowerCase().includes(q) ||
                          (u.formalName || '').toLowerCase().includes(q) ||
                          (Array.isArray(u.aliases) && u.aliases.some(a => (a || '').toLowerCase().includes(q))))
        : all;

      if (matches.length) {
        const hdr = document.createElement('div');
        hdr.className = 'je-drop-header';
        hdr.textContent = 'Units';
        el.appendChild(hdr);
        matches.forEach(u => {
          const item = document.createElement('div');
          item.className = 'je-drop-item';
          const meta = [u.formalName, u.uqc].filter(Boolean).join(' · ');
          item.innerHTML = `
            <span style="font-weight: 800; color: #1d4ed8; min-width: 48px;">${ohEsc(u.symbol || '')}</span>
            <span class="je-drop-name" style="flex:1; font-size: 12px; color: #64748b;">${ohEsc(meta)}</span>
          `;
          item.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const inp = _activeInp;
            close();
            _apply(inp, u.symbol || '');
          });
          item.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
          el.appendChild(item);
        });
      } else {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'je-drop-empty';
        emptyDiv.style.padding = '16px 14px';
        emptyDiv.innerHTML = `
          <span class="je-drop-empty-txt">${all.length ? 'No unit found' : 'No units in Master Desk yet'}</span>
        `;
        el.appendChild(emptyDiv);
      }

      // Typed text that isn't a master unit: offer to create it, or use it as typed
      if (raw && !findMasterUnit(raw)) {
        const wrap = document.createElement('div');
        wrap.style.cssText = `
          position: sticky; bottom: 0; z-index: 10; background: #ffffff;
          border-top: 1px solid #e2e8f0; padding: 8px 10px 10px; border-radius: 0 0 12px 12px;
        `;
        const note = document.createElement('div');
        note.style.cssText = 'font-size: 11px; font-weight: 600; color: #b45309; margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
        note.textContent = `"${raw}" is not in the Unit master`;
        wrap.appendChild(note);

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display: flex; gap: 6px;';
        const addBtn = (text, onPick, primary) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'je-drop-create-item';
          btn.style.cssText = 'padding: 7px 10px; font-size: 12px;' + (primary ? '' : ' color: #475569; background: #f8fafc; border-color: #e2e8f0;');
          btn.innerHTML = primary
            ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>${text}</span>`
            : `<span>${text}</span>`;
          btn.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); onPick(); });
          btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
          btnRow.appendChild(btn);
        };
        if (typeof window.openMasterDeskCreateUnit === 'function') {
          addBtn('Create Unit', () => _startCreate(raw), true);
        }
        addBtn('Use as typed', () => {
          const inp = _activeInp;
          close();
          markVoucherRowUnit(inp);
        }, false);
        wrap.appendChild(btnRow);
        el.appendChild(wrap);
      }
    }

    function _startCreate(name) {
      _pendingCreate = { inp: _activeInp };
      close();
      window.openMasterDeskCreateUnit({ initialName: name, returnTab: 'sales_voucher', purpose: 'voucherUnit' });
    }

    window.onVoucherUnitCreated = function (unit) {
      const pending = _pendingCreate;
      _pendingCreate = null;
      if (!pending || !unit) return;
      setTimeout(() => {
        _apply(pending.inp, unit.symbol || '');
        const tr = pending.inp && pending.inp.closest('tr');
        const next = tr && tr.querySelector('.sales-row-rate:not([readonly])');
        if (next) { next.focus(); next.select(); }
      }, 0);
    };

    window.onVoucherUnitCreationCancelled = function () {
      const pending = _pendingCreate;
      _pendingCreate = null;
      if (pending && pending.inp) setTimeout(() => pending.inp.focus(), 0);
    };

    function close() {
      el.classList.remove('open');
      _open = false;
      _highlightIdx = -1;
      _activeInp = null;
    }

    function isOpen() { return _open; }
    function moveHighlight(d) {
      const items = _items();
      if (!items.length) return;
      _setHL(Math.max(0, Math.min(_highlightIdx + d, items.length - 1)));
    }
    // Enter picks only an explicitly highlighted unit — otherwise the typed text stays.
    function selectHighlighted() {
      const items = _items();
      if (_highlightIdx >= 0 && items[_highlightIdx]) {
        items[_highlightIdx].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      } else {
        const inp = _activeInp;
        close();
        markVoucherRowUnit(inp);
      }
    }

    function _reposition() { if (_open && _activeInp) _position(_activeInp); }
    window.addEventListener('scroll', _reposition, true);
    window.addEventListener('resize', _reposition);
    document.addEventListener('mousedown', e => {
      if (_open && !el.contains(e.target) && e.target !== _activeInp) close();
    });

    return { open, close, isOpen, moveHighlight, selectHighlighted };
  })();

  // Turns a row's Unit cell into the Unit-master picker. Typing a unit's symbol, formal
  // name or alias snaps to the master symbol on leaving the cell.
  function attachVoucherRowUnitPicker(unitInp) {
    if (!unitInp || unitInp._unitPickerWired) return;
    unitInp._unitPickerWired = true;
    markVoucherRowUnit(unitInp);
    if (unitInp.readOnly) return;

    unitInp.addEventListener('focus', () => _salesUnitPortal.open(unitInp));
    unitInp.addEventListener('click', () => _salesUnitPortal.open(unitInp));
    unitInp.addEventListener('input', () => {
      if (!unitInp._unitSilent) _salesUnitPortal.open(unitInp);
      markVoucherRowUnit(unitInp);
    });
    unitInp.addEventListener('keydown', e => {
      if (e.key === 'Tab' && _salesUnitPortal.isOpen()) _salesUnitPortal.close();
      else handlePortalKeydown(e, _salesUnitPortal);
    });
    unitInp.addEventListener('blur', () => {
      const match = findMasterUnit(unitInp.value);
      if (match && match.symbol && match.symbol !== unitInp.value.trim()) {
        unitInp.value = match.symbol;
        unitInp._unitSilent = true;
        unitInp.dispatchEvent(new Event('input', { bubbles: true }));
        unitInp._unitSilent = false;
      }
      markVoucherRowUnit(unitInp);
    });
  }
  window.attachVoucherRowUnitPicker = attachVoucherRowUnitPicker;

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

  // ══════════════════════════════════════════════════════════════════
  //  INVOICE NUMBERING — prefix / start / digits per kind ('invoice' | 'return'),
  //  and a permanent register of numbers already used. A number stays used after
  //  its invoice is deleted, so it can never be issued again.
  // ══════════════════════════════════════════════════════════════════
  function getSalesNumberKind() {
    return currentSalesVoucherSubtype === 'Return' ? 'return' : 'invoice';
  }

  function getSalesNumberingSettings(kind) {
    const year = new Date().getFullYear();
    const defaults = kind === 'return'
      ? { prefix: `REV-${year}-`, start: 1, digits: 3 }
      : { prefix: `INV-${year}-`, start: 1, digits: 3 };
    const saved = ((window.KYA_STORE || {}).salesNumbering || {})[kind];
    if (!saved) return defaults;
    return {
      prefix: typeof saved.prefix === 'string' ? saved.prefix : defaults.prefix,
      start: Math.max(1, parseInt(saved.start, 10) || 1),
      digits: Math.min(10, Math.max(1, parseInt(saved.digits, 10) || defaults.digits))
    };
  }

  function saveSalesNumberingSettings(kind, settings) {
    window.KYA_STORE = window.KYA_STORE || {};
    window.KYA_STORE.salesNumbering = window.KYA_STORE.salesNumbering || {};
    window.KYA_STORE.salesNumbering[kind] = settings;
    if (typeof triggerAutoBackup === 'function') triggerAutoBackup();
  }

  function formatSalesInvoiceNo(settings, n) {
    return settings.prefix + String(n).padStart(settings.digits, '0');
  }

  // Every number ever posted for this kind: the register plus the invoices on file.
  function getUsedSalesInvoiceNos(kind) {
    const store = window.KYA_STORE || {};
    const used = new Set(((store.salesUsedInvoiceNos || {})[kind] || []).map(n => String(n).toLowerCase()));
    (store.salesVouchers || []).forEach(v => {
      if (!v.invoiceNo) return;
      if ((kind === 'return') === !!v.isReturn) used.add(v.invoiceNo.trim().toLowerCase());
    });
    return used;
  }

  function registerUsedSalesInvoiceNo(kind, invoiceNo) {
    const no = (invoiceNo || '').trim().toLowerCase();
    if (!no) return;
    window.KYA_STORE = window.KYA_STORE || {};
    const reg = window.KYA_STORE.salesUsedInvoiceNos = window.KYA_STORE.salesUsedInvoiceNos || {};
    reg[kind] = reg[kind] || [];
    if (!reg[kind].includes(no)) reg[kind].push(no);
  }
  window.registerUsedSalesInvoiceNo = registerUsedSalesInvoiceNo;

  // True when the number was already issued. A posted invoice being edited may keep
  // its own number.
  function isSalesInvoiceNoUsed(invoiceNo, kind) {
    const no = (invoiceNo || '').trim().toLowerCase();
    if (!no) return false;
    const editing = window._editingSalesInvoice;
    if (editing && !editing.isDraft) {
      const orig = ((window.KYA_STORE || {}).salesVouchers || []).find(v => v.id === editing.id);
      if (orig && (orig.invoiceNo || '').trim().toLowerCase() === no) return false;
    }
    return getUsedSalesInvoiceNos(kind || getSalesNumberKind()).has(no);
  }
  window.isSalesInvoiceNoUsed = isSalesInvoiceNoUsed;

  function getNextAutoInvoiceNumber(kind) {
    const k = kind || getSalesNumberKind();
    const s = getSalesNumberingSettings(k);
    const used = getUsedSalesInvoiceNos(k);
    let n = s.start;
    while (used.has(formatSalesInvoiceNo(s, n).toLowerCase())) n++;
    return formatSalesInvoiceNo(s, n);
  }

  // Shows or clears the "already used" message under the Invoice No. field.
  function validateSalesInvoiceNoField() {
    const inp = document.getElementById('salesInvoiceNo');
    const err = document.getElementById('salesInvoiceNoError');
    if (!inp) return true;
    const used = currentSalesVoucherSubtype !== 'Return' && isSalesInvoiceNoUsed(inp.value, 'invoice');
    const no = inp.value.trim();
    inp.style.borderColor = used ? '#ef4444' : '';
    // Short line under the box; the full explanation shows when hovering the box
    const wrap = inp.parentElement;
    if (wrap) {
      wrap.classList.toggle('has-invno-error', used);
      if (used) wrap.setAttribute('data-error-full', `"${no}" is already used. Invoice numbers can't be reused, even after deletion.`);
      else wrap.removeAttribute('data-error-full');
    }
    if (err) {
      err.textContent = used ? `"${no}" is already used` : '';
      err.style.display = used ? 'block' : 'none';
    }
    return !used;
  }
  window.validateSalesInvoiceNoField = validateSalesInvoiceNoField;

  // Pencil popup: set the invoice number prefix, starting number and digits.
  function openSalesInvoiceNumberingModal() {
    const kind = 'invoice';
    const s = getSalesNumberingSettings(kind);
    document.getElementById('salesNumberingOverlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'salesNumberingOverlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 99999; display: flex; align-items: center; justify-content: center;
      background: rgba(15,23,42,0.65); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); padding: 16px;
    `;
    const lbl = 'display:block; font-size:13px; font-weight:600; color:var(--slate-700); margin-bottom:6px;';
    const inpStyle = 'width:100%; padding:10px 14px; font-size:13.5px; border-radius:8px; border:1.5px solid var(--slate-200); box-sizing:border-box; outline:none; font-family:inherit;';
    overlay.innerHTML = `
      <div role="dialog" aria-modal="true" aria-labelledby="salesNumberingTitle" style="background:#fff; border-radius:16px; width:100%; max-width:440px; box-shadow:0 24px 48px -12px rgba(0,0,0,.35); font-family:var(--font-main, Inter, sans-serif); overflow:hidden;">
        <div style="padding:20px 22px 6px;">
          <div id="salesNumberingTitle" style="font-size:16px; font-weight:700; color:var(--slate-900);">Invoice Number Format</div>
          <div style="font-size:12.5px; color:var(--slate-500); margin-top:3px;">New invoices are numbered from this prefix. Numbers already used are skipped automatically.</div>
        </div>
        <div style="padding:14px 22px 4px;">
          <label for="salesNumPrefix" style="${lbl}">Prefix</label>
          <input id="salesNumPrefix" type="text" maxlength="30" style="${inpStyle}" placeholder="e.g. INV-2026-" />
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:14px;">
            <div>
              <label for="salesNumStart" style="${lbl}">Starting Number</label>
              <input id="salesNumStart" type="number" min="1" step="1" style="${inpStyle}" />
            </div>
            <div>
              <label for="salesNumDigits" style="${lbl}">Digits</label>
              <select id="salesNumDigits" style="${inpStyle} background:#fff;">
                ${[1,2,3,4,5,6].map(d => `<option value="${d}">${d} (${String(1).padStart(d, '0')})</option>`).join('')}
              </select>
            </div>
          </div>
          <div style="margin-top:16px; padding:12px 14px; background:var(--slate-50, #f8fafc); border:1.5px dashed var(--slate-200); border-radius:10px;">
            <div style="font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--slate-500);">Next invoice number</div>
            <div id="salesNumPreview" style="font-size:17px; font-weight:800; color:var(--blue-700, #1d4ed8); margin-top:4px; word-break:break-all;"></div>
            <div id="salesNumPreviewNote" style="font-size:11.5px; color:#b45309; margin-top:4px; display:none;"></div>
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; padding:18px 22px 20px;">
          <button type="button" class="btn btn-secondary" id="salesNumCancel" style="height:38px; padding:8px 16px; font-size:13px; font-weight:600;">Cancel</button>
          <button type="button" class="btn btn-primary" id="salesNumSave" style="height:38px; padding:8px 16px; font-size:13px; font-weight:600;">Save &amp; Apply</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const prefixInp = overlay.querySelector('#salesNumPrefix');
    const startInp = overlay.querySelector('#salesNumStart');
    const digitsSel = overlay.querySelector('#salesNumDigits');
    const preview = overlay.querySelector('#salesNumPreview');
    const previewNote = overlay.querySelector('#salesNumPreviewNote');
    prefixInp.value = s.prefix;
    startInp.value = s.start;
    digitsSel.value = String(Math.min(6, s.digits));

    const readForm = () => ({
      prefix: prefixInp.value.trim(),
      start: Math.max(1, parseInt(startInp.value, 10) || 1),
      digits: parseInt(digitsSel.value, 10) || 3
    });
    const refreshPreview = () => {
      const f = readForm();
      const used = getUsedSalesInvoiceNos(kind);
      let n = f.start;
      while (used.has(formatSalesInvoiceNo(f, n).toLowerCase())) n++;
      preview.textContent = formatSalesInvoiceNo(f, n);
      const skipped = n - f.start;
      previewNote.style.display = skipped ? 'block' : 'none';
      previewNote.textContent = skipped ? `${skipped} number${skipped > 1 ? 's' : ''} from ${formatSalesInvoiceNo(f, f.start)} already used — skipped.` : '';
    };
    [prefixInp, startInp, digitsSel].forEach(el => el.addEventListener('input', refreshPreview));
    digitsSel.addEventListener('change', refreshPreview);
    refreshPreview();

    const close = () => {
      overlay.remove();
      document.removeEventListener('keydown', onKey, true);
    };
    const save = () => {
      saveSalesNumberingSettings(kind, readForm());
      close();
      // Re-number the open voucher unless it's a posted invoice being edited
      const editing = window._editingSalesInvoice;
      const invNoEl = document.getElementById('salesInvoiceNo');
      const chipEl = document.getElementById('salesVoucherChipDisplay');
      if (invNoEl) {
        const saved = getSalesNumberingSettings(kind);
        invNoEl.placeholder = formatSalesInvoiceNo(saved, saved.start);
      }
      if (invNoEl && !(editing && !editing.isDraft)) {
        invNoEl.value = getNextAutoInvoiceNumber(kind);
        if (chipEl) chipEl.textContent = invNoEl.value;
      }
      validateSalesInvoiceNoField();
      if (typeof showToast === 'function') showToast('Invoice number format saved.', 'success');
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') { e.preventDefault(); save(); }
    };
    document.addEventListener('keydown', onKey, true);
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('#salesNumCancel').addEventListener('click', close);
    overlay.querySelector('#salesNumSave').addEventListener('click', save);
    prefixInp.focus();
    prefixInp.select();
  }
  window.openSalesInvoiceNumberingModal = openSalesInvoiceNumberingModal;

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
      const s = getSalesNumberingSettings(getSalesNumberKind());
      invNoEl.placeholder = formatSalesInvoiceNo(s, s.start);
    }
    validateSalesInvoiceNoField();

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
    refreshSalesCustomerAlterPencil();
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

  function getSalesCashEquivalentLedgers() {
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

  function populateSalesPaymentAccounts(selectedId = null) {
    const paySelect = document.getElementById('salesPaymentAccount');
    if (!paySelect) return;

    paySelect.innerHTML = '<option value="">&mdash; Select &mdash;</option>';

    getSalesCashEquivalentLedgers().forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.name;
      if (selectedId && String(a.id) === String(selectedId)) {
        opt.selected = true;
      }
      paySelect.appendChild(opt);
    });

    const multiOpt = document.createElement('option');
    multiOpt.value = SALES_MULTI_PAYMENT_VALUE;
    multiOpt.textContent = 'Multi Payment';
    if (String(selectedId) === SALES_MULTI_PAYMENT_VALUE) multiOpt.selected = true;
    paySelect.appendChild(multiOpt);
  }

  // ── Multi Payment: split one receipt across several cash & cash equivalent accounts ──
  const SALES_MULTI_PAYMENT_VALUE = 'multi-payment';
  window.SALES_MULTI_PAYMENT_VALUE = SALES_MULTI_PAYMENT_VALUE;
  window.salesMultiPayments = window.salesMultiPayments || [];
  window._salesMultiPaymentDraft = window._salesMultiPaymentDraft || [];
  window._salesPaymentAccountPrev = window._salesPaymentAccountPrev || '';

  function isSalesMultiPaymentSelected() {
    const paySelect = document.getElementById('salesPaymentAccount');
    return !!paySelect && paySelect.value === SALES_MULTI_PAYMENT_VALUE;
  }

  function getSalesGrandTotalForPayment() {
    const subTotal = typeof calculateSubtotal === 'function' ? calculateSubtotal() : 0;
    let tdsTcsMode = 'None';
    const tdsBtn = document.getElementById('salesTdsTcsTds');
    const tcsBtn = document.getElementById('salesTdsTcsTcs');
    if (tdsBtn && tdsBtn.classList.contains('active')) tdsTcsMode = 'TDS';
    if (tcsBtn && tcsBtn.classList.contains('active')) tdsTcsMode = 'TCS';
    const amountInput = document.getElementById('salesTdsTcsAmount');
    const tdsTcsAmount = amountInput ? (parseFloat(amountInput.value) || 0) : 0;
    const adjustmentsInput = document.getElementById('salesAdjustments');
    const adjustments = adjustmentsInput ? (parseFloat(adjustmentsInput.value) || 0) : 0;

    let total = subTotal;
    if (tdsTcsMode === 'TDS') total = subTotal - tdsTcsAmount;
    else if (tdsTcsMode === 'TCS') total = subTotal + tdsTcsAmount;
    return total + adjustments;
  }

  // Amount that has to be distributed across the selected accounts.
  function getSalesMultiPaymentTarget() {
    const status = typeof getSalesPaymentStatus === 'function' ? getSalesPaymentStatus() : 'Not Paid';
    const total = getSalesGrandTotalForPayment();

    if (status === 'Full Payment' || status === 'Full Refund') {
      return typeof getSalesPaymentMax === 'function' ? getSalesPaymentMax(total) : total;
    }
    if (status === 'Partial Payment' || status === 'Partial Refund') {
      const payAmtEl = document.getElementById('salesPaymentAmount');
      return payAmtEl ? (parseFloat(payAmtEl.value) || 0) : 0;
    }
    return 0;
  }

  // ── Multi Payment modal ──
  // Shared by the Sales Voucher and the Proforma advance: the caller supplies the amount
  // to split, the account list, and what to do with the saved rows. Rows are edited on a
  // draft copy so Cancel / Esc leaves the saved split untouched.
  //   cfg = { typeLabel, getTarget(), getAccounts(), splits, onSave(rows), onCancel() }
  let _multiPayModal = null;

  function openMultiPaymentModal(cfg) {
    closeMultiPaymentModal();

    _multiPayModal = {
      cfg: cfg || {},
      draft: ((cfg && cfg.splits) || []).map(split => ({
        accountId: split.accountId,
        amount: split.amount
      }))
    };
    while (_multiPayModal.draft.length < 2) {
      _multiPayModal.draft.push({ accountId: '', amount: '' });
    }

    const typeLabel = (cfg && cfg.typeLabel) || 'Payment';

    const overlay = document.createElement('div');
    overlay.id = 'multiPayOverlay';
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '10100',
      background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif'
    });

    overlay.innerHTML = `
      <style>
        @keyframes smpModalIn {
          from { opacity:0; transform:scale(.94) translateY(14px); }
          to   { opacity:1; transform:none; }
        }
        #multiPayCard { animation: smpModalIn .2s cubic-bezier(.34,1.3,.64,1); }
        #multiPayAddBtn:hover { background:#eff6ff !important; }
        #multiPaySaveBtn:hover { filter: brightness(1.08); }
        #multiPayRows .smp-del:hover { background:#fef2f2 !important; border-color:#fecaca !important; color:#dc2626 !important; }
      </style>
      <div id="multiPayCard" style="
        background:#fff; border-radius:18px; padding:24px 24px 20px;
        box-shadow:0 24px 64px rgba(0,0,0,.22);
        width:520px; max-width:92%; max-height:86vh; overflow-y:auto;
        display:flex; flex-direction:column; position:relative; box-sizing:border-box;
      ">
        <button id="multiPayCloseX" type="button" aria-label="Close" style="
          position:absolute; top:14px; right:16px; background:none; border:none;
          font-size:20px; cursor:pointer; color:#94a3b8; line-height:1; padding:4px 8px; border-radius:6px;
        ">&times;</button>

        <h2 style="margin:0 0 4px; font-size:17px; font-weight:700; color:#0f172a;">Multi ${typeLabel}</h2>
        <p style="margin:0 0 16px; font-size:12.5px; color:#64748b; line-height:1.45;">
          Split this ${typeLabel.toLowerCase()} across two or more cash &amp; cash equivalent accounts.
        </p>

        <div style="
          display:flex; align-items:center; justify-content:space-between; gap:10px;
          background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:10px;
          padding:10px 12px; margin-bottom:14px;
        ">
          <span style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#94a3b8;">
            ${typeLabel} to split
          </span>
          <span id="multiPayTarget" style="font-size:15px; font-weight:800; color:#0f172a;">₹ 0.00</span>
        </div>

        <div id="multiPayRows" style="display:flex; flex-direction:column; gap:8px;"></div>

        <button id="multiPayAddBtn" type="button" style="
          margin-top:10px; align-self:flex-start; height:32px; padding:0 12px;
          border:1.5px solid #bfdbfe; background:#fff; color:#2563eb;
          border-radius:9px; font-size:12px; font-weight:700; cursor:pointer; transition:background .15s;
        ">+ Add Account</button>

        <div style="
          display:flex; align-items:center; justify-content:space-between; gap:10px;
          margin-top:16px; padding-top:12px; border-top:1px dashed #e2e8f0;
          font-size:12.5px; font-weight:700; color:#64748b;
        ">
          <span>Allocated: <span id="multiPayAllocated" style="color:#0f172a;">₹ 0.00</span></span>
          <span>Unallocated: <span id="multiPayBalance" style="color:#0f172a;">₹ 0.00</span></span>
        </div>

        <div style="display:flex; gap:10px; margin-top:18px;">
          <button id="multiPayCancelBtn" type="button" style="
            flex:1; padding:10px 0; border-radius:10px; border:1.5px solid #e2e8f0;
            background:#fff; color:#475569; font-size:13px; font-weight:600; cursor:pointer;
          ">Cancel</button>
          <button id="multiPaySaveBtn" type="button" style="
            flex:1; padding:10px 0; border-radius:10px; border:none;
            background:#1d4ed8; color:#fff; font-size:13px; font-weight:600; cursor:pointer; transition:filter .15s;
          ">Save Split</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('multiPayAddBtn').addEventListener('click', () => {
      _multiPayModal.draft.push({ accountId: '', amount: '' });
      renderMultiPaymentModalRows();
    });
    document.getElementById('multiPayCloseX').addEventListener('click', () => cancelMultiPaymentModal());
    document.getElementById('multiPayCancelBtn').addEventListener('click', () => cancelMultiPaymentModal());
    document.getElementById('multiPaySaveBtn').addEventListener('click', () => saveMultiPaymentModal());
    overlay.addEventListener('click', e => { if (e.target === overlay) cancelMultiPaymentModal(); });
    document.addEventListener('keydown', multiPaymentEscHandler);

    renderMultiPaymentModalRows();
  }

  function multiPaymentEscHandler(e) {
    if (e.key === 'Escape') cancelMultiPaymentModal();
  }

  function getMultiPaymentModalTarget() {
    if (!_multiPayModal || typeof _multiPayModal.cfg.getTarget !== 'function') return 0;
    return _multiPayModal.cfg.getTarget() || 0;
  }

  function renderMultiPaymentModalRows() {
    const wrap = document.getElementById('multiPayRows');
    if (!wrap || !_multiPayModal) return;

    const accounts = (typeof _multiPayModal.cfg.getAccounts === 'function')
      ? (_multiPayModal.cfg.getAccounts() || [])
      : [];
    wrap.innerHTML = '';

    _multiPayModal.draft.forEach((split, idx) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; align-items:center; gap:8px; width:100%;';

      const sel = document.createElement('select');
      sel.className = 'je-input';
      sel.style.cssText = 'height:38px; padding:0 10px; font-size:13px; font-weight:600; cursor:pointer; flex:1; min-width:0;';
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.innerHTML = '&mdash; Select Account &mdash;';
      sel.appendChild(placeholder);
      accounts.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = a.name;
        if (String(a.id) === String(split.accountId)) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', () => { split.accountId = sel.value; });

      const amt = document.createElement('input');
      amt.type = 'number';
      amt.className = 'je-input';
      amt.placeholder = '0.00';
      amt.min = '0';
      amt.step = '0.01';
      const target = getMultiPaymentModalTarget();
      if (target > 0) amt.max = target;
      amt.value = (split.amount === null || split.amount === undefined) ? '' : split.amount;
      amt.style.cssText = 'height:38px; padding:0 10px; font-size:13px; font-weight:600; width:130px; flex-shrink:0;';
      amt.addEventListener('input', () => {
        split.amount = amt.value;
        clampMultiPaymentRow(split, amt);
        updateMultiPaymentModalTotals();
      });

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'smp-del';
      del.title = 'Remove this account';
      del.innerHTML = '&times;';
      del.style.cssText = 'height:38px; width:36px; flex-shrink:0; border:1.5px solid #e2e8f0; background:#fff; color:#94a3b8; border-radius:9px; font-size:18px; font-weight:700; line-height:1; cursor:pointer; transition:all .15s;';
      del.addEventListener('click', () => {
        _multiPayModal.draft.splice(idx, 1);
        if (_multiPayModal.draft.length === 0) _multiPayModal.draft.push({ accountId: '', amount: '' });
        renderMultiPaymentModalRows();
      });

      row.appendChild(sel);
      row.appendChild(amt);
      row.appendChild(del);
      wrap.appendChild(row);
    });

    updateMultiPaymentModalTotals();
  }

  // The split can never add up to more than the amount being split: anything typed beyond
  // that is trimmed back to whatever is still unallocated.
  function clampMultiPaymentRow(split, input) {
    if (!_multiPayModal) return;
    const target = getMultiPaymentModalTarget();
    const entered = parseFloat(input.value) || 0;
    if (entered <= 0) return;

    const typeLabel = ((_multiPayModal.cfg.typeLabel) || 'Payment').toLowerCase();

    if (target <= 0) {
      input.value = '';
      split.amount = '';
      showToast(`Enter the ${typeLabel} amount before splitting it.`, 'warning');
      return;
    }

    let others = 0;
    _multiPayModal.draft.forEach(other => {
      if (other !== split) others += parseFloat(other.amount) || 0;
    });
    const available = Math.max(0, Math.round((target - others) * 100) / 100);

    if (entered > available + 0.001) {
      input.value = available > 0 ? available.toFixed(2) : '';
      split.amount = input.value;
      showToast(`Amount trimmed to ₹${fmtNum(available)} — the split cannot exceed the ${typeLabel} of ₹${fmtNum(target)}.`, 'warning');
    }
  }

  function updateMultiPaymentModalTotals() {
    const targetEl = document.getElementById('multiPayTarget');
    const allocatedEl = document.getElementById('multiPayAllocated');
    const balanceEl = document.getElementById('multiPayBalance');
    if (!targetEl || !_multiPayModal) return;

    const target = getMultiPaymentModalTarget();
    let allocated = 0;
    _multiPayModal.draft.forEach(split => { allocated += parseFloat(split.amount) || 0; });
    const balance = target - allocated;

    targetEl.textContent = '₹ ' + fmtNum(target);
    if (allocatedEl) allocatedEl.textContent = '₹ ' + fmtNum(allocated);
    if (balanceEl) {
      balanceEl.textContent = '₹ ' + fmtNum(balance);
      balanceEl.style.color = Math.abs(balance) < 0.01 ? '#059669' : '#dc2626';
    }
  }

  function saveMultiPaymentModal() {
    if (!_multiPayModal) return;
    const typeLabel = _multiPayModal.cfg.typeLabel || 'Payment';

    const rows = _multiPayModal.draft.filter(split => split.accountId || String(split.amount).trim());
    if (rows.length === 0) {
      showToast(`Please select at least one account for Multi ${typeLabel}.`, 'warning');
      return;
    }
    if (rows.some(split => !split.accountId)) {
      showToast('Please select an account for every row, or remove the empty rows.', 'warning');
      return;
    }
    if (rows.some(split => (parseFloat(split.amount) || 0) <= 0)) {
      showToast('Please enter an amount greater than zero for every selected account.', 'warning');
      return;
    }
    const hasDuplicate = rows.some((split, i) =>
      rows.findIndex(other => String(other.accountId) === String(split.accountId)) !== i);
    if (hasDuplicate) {
      showToast('Each account can be selected only once.', 'warning');
      return;
    }

    const target = getMultiPaymentModalTarget();
    const allocated = rows.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
    if (target <= 0) {
      showToast(`Enter the ${typeLabel.toLowerCase()} amount before splitting it.`, 'warning');
      return;
    }
    if (allocated > target + 0.01) {
      showToast(`Split of ₹${fmtNum(allocated)} cannot exceed the ${typeLabel.toLowerCase()} of ₹${fmtNum(target)}.`, 'warning');
      return;
    }
    if (Math.abs(target - allocated) > 0.01) {
      showToast(`₹${fmtNum(target - allocated)} is still unallocated — the split must add up to ₹${fmtNum(target)}.`, 'warning');
      return;
    }

    const saved = rows.map(split => ({
      accountId: split.accountId,
      amount: String(split.amount)
    }));
    const onSave = _multiPayModal.cfg.onSave;
    closeMultiPaymentModal();
    if (typeof onSave === 'function') onSave(saved);
    showToast(`Multi ${typeLabel} split across ${saved.length} accounts saved.`, 'success');
  }

  function cancelMultiPaymentModal() {
    const onCancel = _multiPayModal && _multiPayModal.cfg.onCancel;
    closeMultiPaymentModal();
    if (typeof onCancel === 'function') onCancel();
  }

  function closeMultiPaymentModal() {
    document.removeEventListener('keydown', multiPaymentEscHandler);
    const overlay = document.getElementById('multiPayOverlay');
    if (overlay) overlay.remove();
    _multiPayModal = null;
  }

  function isMultiPaymentModalOpen() {
    return !!document.getElementById('multiPayOverlay');
  }

  // ── Sales Voucher wiring for the shared modal ──
  function openSalesMultiPaymentModal() {
    const isRefund = currentSalesVoucherSubtype === 'Return';
    openMultiPaymentModal({
      typeLabel: isRefund ? 'Refund' : 'Payment',
      getTarget: getSalesMultiPaymentTarget,
      getAccounts: getSalesCashEquivalentLedgers,
      splits: salesMultiPayments,
      onSave: rows => {
        window.salesMultiPayments = rows;
        updateSalesMultiPaymentUI();
      },
      onCancel: () => {
        // Nothing saved yet? Fall back to the account picked before Multi Payment.
        if (salesMultiPayments.length === 0) {
          const paySelect = document.getElementById('salesPaymentAccount');
          if (paySelect) paySelect.value = window._salesPaymentAccountPrev || '';
        }
        updateSalesMultiPaymentUI();
      }
    });
  }

  function closeSalesMultiPaymentModal() {
    closeMultiPaymentModal();
  }

  // Compact recap under the Payment Account dropdown; click it to reopen the modal.
  function updateSalesMultiPaymentUI() {
    const summaryBtn = document.getElementById('salesMultiPaymentSummary');
    if (!summaryBtn) return;

    const accField = document.getElementById('salesPaymentAccountField');
    const accFieldVisible = accField && accField.style.display !== 'none';

    if (!accFieldVisible || !isSalesMultiPaymentSelected()) {
      summaryBtn.style.display = 'none';
      return;
    }

    const splits = salesMultiPayments.filter(split => split.accountId && (parseFloat(split.amount) || 0) > 0);
    const allocated = splits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
    const balance = getSalesMultiPaymentTarget() - allocated;
    const balanced = Math.abs(balance) < 0.01;

    summaryBtn.style.display = 'flex';
    summaryBtn.innerHTML = splits.length
      ? `<span>${splits.length} account${splits.length > 1 ? 's' : ''} &middot; <span style="color:${balanced ? '#059669' : '#dc2626'}">₹ ${fmtNum(allocated)}</span></span><span style="color:var(--blue-600);">Edit</span>`
      : `<span style="color:#dc2626;">No accounts selected</span><span style="color:var(--blue-600);">Set up</span>`;
  }

  function getSalesMultiPaymentSplits() {
    if (!isSalesMultiPaymentSelected()) return [];
    return salesMultiPayments
      .filter(split => split.accountId && (parseFloat(split.amount) || 0) > 0)
      .map(split => ({ accountId: split.accountId, amount: parseFloat(split.amount) || 0 }));
  }

  function setSalesMultiPayments(splits) {
    window.salesMultiPayments = (Array.isArray(splits) ? splits : []).map(split => ({
      accountId: split.accountId ? String(split.accountId) : '',
      amount: (split.amount || split.amount === 0) ? String(split.amount) : ''
    }));
  }

  function resetSalesMultiPayments() {
    window.salesMultiPayments = [];
    window._salesPaymentAccountPrev = '';
    closeSalesMultiPaymentModal();
    const summaryBtn = document.getElementById('salesMultiPaymentSummary');
    if (summaryBtn) summaryBtn.style.display = 'none';
  }

  // Keeps the modal's figures live while the Payment Amount is being typed.
  function updateSalesMultiPaymentSummary() {
    if (isMultiPaymentModalOpen()) updateMultiPaymentModalTotals();
    updateSalesMultiPaymentUI();
  }

  window.openMultiPaymentModal = openMultiPaymentModal;
  window.closeMultiPaymentModal = closeMultiPaymentModal;
  window.isMultiPaymentModalOpen = isMultiPaymentModalOpen;
  window.updateMultiPaymentModalTotals = updateMultiPaymentModalTotals;
  window.getSalesCashEquivalentLedgers = getSalesCashEquivalentLedgers;
  window.isSalesMultiPaymentSelected = isSalesMultiPaymentSelected;
  window.openSalesMultiPaymentModal = openSalesMultiPaymentModal;
  window.closeSalesMultiPaymentModal = closeSalesMultiPaymentModal;
  window.updateSalesMultiPaymentUI = updateSalesMultiPaymentUI;
  window.updateSalesMultiPaymentSummary = updateSalesMultiPaymentSummary;
  window.getSalesMultiPaymentSplits = getSalesMultiPaymentSplits;
  window.setSalesMultiPayments = setSalesMultiPayments;
  window.resetSalesMultiPayments = resetSalesMultiPayments;

  function getSalesPaymentStatus() {
    const fullBtn = document.getElementById('salesPaymentStatusFull');
    const partBtn = document.getElementById('salesPaymentStatusPartial');
    
    if (currentSalesVoucherSubtype === 'Return') {
      if (fullBtn && fullBtn.classList.contains('active')) return 'Full Refund';
      if (partBtn && partBtn.classList.contains('active')) return 'Partial Refund';
      return 'No Refund';
    }
    
    if (fullBtn && fullBtn.classList.contains('active')) return 'Full Payment';
    if (partBtn && partBtn.classList.contains('active')) return 'Partial Payment';
    return 'Not Paid';
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
  window.getOrCreateSystemLedger = getOrCreateSystemLedger;

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
            <div style="position: relative; display: flex; align-items: center; width: 100%;">
              <input type="text" class="sales-row-hsn je-input" value="${ohEsc(row.hsn || '')}" placeholder="HSN/SAC" title="${ohEsc(row.hsnDesc || 'Search the HSN / SAC code master')}" style="border: none; background: transparent; box-shadow: none; padding: 0 14px 0 0; font-size: 12.5px; font-family: monospace, inherit; font-weight: 600; color: var(--slate-700); outline: none; width: 100%;" ${isLocked ? 'readonly' : ''} autocomplete="off" />
              <span class="sales-row-drop-arrow" style="position: absolute; right: 0; pointer-events: none; color: var(--slate-400); font-size: 9px;">▼</span>
            </div>
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
            applySalesMasterItemToRow(index, tr, selectedItem);
          });
        };

        itemInp.addEventListener('focus', attachPortal);
        itemInp.addEventListener('click', attachPortal);
        itemInp.addEventListener('input', () => {
          salesRows[index].item = itemInp.value;
          if (!itemInp.value.trim()) {
            clearVoucherRowItemLink(salesRows[index], tr);
            recalculateSalesTotals();
          }
          attachPortal();
        });
        itemInp.addEventListener('keydown', e => handlePortalKeydown(e, _salesItemPortal));
      }

      const hsnInp = tr.querySelector('.sales-row-hsn');
      if (hsnInp && !isLocked) {
        attachVoucherRowCodePicker(hsnInp, () => salesRows[index]);
      }
      attachVoucherRowUnitPicker(tr.querySelector('.sales-row-unit'));
      attachVoucherRowAlterButtons(tr, () => salesRows[index]);
    });
  }

  function handlePortalKeydown(e, portal) {
    if (!portal || !portal.isOpen()) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      portal.moveHighlight(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      portal.moveHighlight(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      portal.selectHighlighted();
    } else if (e.key === 'Escape') {
      portal.close();
    }
  }

  // Product rows pick from the HSN master, service rows from the SAC master.
  function getSalesRowCodeKind(row, defaultType) {
    const fallback = defaultType || (typeof currentSalesType !== 'undefined' ? currentSalesType : 'Product');
    const type = (row && row.itemType) || fallback;
    return type === 'Service' ? 'SAC' : 'HSN';
  }
  window.getSalesRowCodeKind = getSalesRowCodeKind;

  // Copies a picked stock item / Revenue-from-Operations service onto a voucher row —
  // its HSN or SAC code, GST rate, unit and price — and refreshes that row's inputs.
  // Shared by the Sales Voucher and every Pre Invoice module (they use the same row
  // schema and the same `.sales-row-*` classes).
  function applyMasterItemToVoucherRow(row, tr, selectedItem, options) {
    if (!row || !selectedItem) return;
    const opts = options || {};

    row.item = selectedItem.name;
    row.itemType = selectedItem.type;

    // The row always describes the item currently selected: switching the item replaces
    // its code, unit and price, and blanks them when the new item carries none.
    if (selectedItem.type === 'Service') {
      row.revenueLedgerId = selectedItem.id || '';
      row.stockItemId = '';
      row.hsn = selectedItem.sac || '';
      row.hsnDesc = selectedItem.sacDesc || '';
      row.unit = '';
      row.rate = 0;
    } else {
      row.stockItemId = selectedItem.id || '';
      row.revenueLedgerId = '';
      row.hsn = selectedItem.hsn || '';
      row.hsnDesc = selectedItem.hsnDesc || '';
      row.unit = selectedItem.unit || '';
      row.rate = parseFloat(selectedItem.rate) || 0;
    }
    row.autoRate = row.rate;

    if (!opts.zeroTax && typeof selectedItem.gst === 'number') row.tax = selectedItem.gst;

    if (tr) refreshVoucherRowInputs(row, tr);
  }
  window.applyMasterItemToVoucherRow = applyMasterItemToVoucherRow;

  // Emptying the Description unlinks the row: its HSN/SAC, unit and price go with it.
  function clearVoucherRowItemLink(row, tr) {
    if (!row) return;

    row.itemType = '';
    row.stockItemId = '';
    row.revenueLedgerId = '';
    row.hsn = '';
    row.hsnDesc = '';
    row.unit = '';
    row.rate = 0;
    row.autoRate = 0;
    row.baseAmount = 0;
    row.amount = 0;

    if (tr) {
      refreshVoucherRowInputs(row, tr);
      const baseEl = tr.querySelector('.sales-row-base');
      if (baseEl) baseEl.value = '';
      const amtEl = tr.querySelector('.sales-row-amount-input');
      if (amtEl) amtEl.value = '';
    }
  }
  window.clearVoucherRowItemLink = clearVoucherRowItemLink;

  // Writes the row's HSN/SAC, unit, rate and tax back into its inputs, without
  // re-rendering the whole table.
  function refreshVoucherRowInputs(row, tr) {
    if (!row || !tr) return;

    const hsnEl = tr.querySelector('.sales-row-hsn');
    if (hsnEl) {
      hsnEl.value = row.hsn || '';
      hsnEl.title = row.hsnDesc || '';
    }
    const unitEl = tr.querySelector('.sales-row-unit');
    if (unitEl) {
      unitEl.value = row.unit || '';
      markVoucherRowUnit(unitEl);
    }
    const rateEl = tr.querySelector('.sales-row-rate');
    if (rateEl) rateEl.value = row.rate ? Number(row.rate).toFixed(2) : '';
    const taxEl = tr.querySelector('.sales-row-tax');
    if (taxEl) {
      const taxVal = String(row.tax);
      if (!Array.from(taxEl.options).some(o => o.value === taxVal)) {
        const opt = document.createElement('option');
        opt.value = taxVal;
        opt.textContent = taxVal + '%';
        taxEl.appendChild(opt);
      }
      taxEl.value = taxVal;
    }
    if (tr._refreshAlterPencils) tr._refreshAlterPencils();
  }
  window.refreshVoucherRowInputs = refreshVoucherRowInputs;

  // Turns a row's HSN/SAC cell into a searchable code picker: HSN codes for product
  // rows, SAC codes for service rows.
  function attachVoucherRowCodePicker(hsnInp, getRow, defaultType, onPicked) {
    if (!hsnInp) return;

    const attach = () => {
      const row = getRow() || {};
      _salesCodePortal.open(hsnInp, hsnInp.value, getSalesRowCodeKind(row, defaultType), (picked) => {
        hsnInp.value = picked.code;
        hsnInp.title = picked.desc || '';
        row.hsn = picked.code;
        row.hsnDesc = picked.desc || '';
        if (typeof onPicked === 'function') onPicked(picked);
      });
    };

    hsnInp.addEventListener('focus', attach);
    hsnInp.addEventListener('click', attach);
    hsnInp.addEventListener('input', () => {
      const row = getRow();
      if (row) {
        row.hsn = hsnInp.value;
        row.hsnDesc = '';
      }
      attach();
    });
    hsnInp.addEventListener('keydown', e => handlePortalKeydown(e, _salesCodePortal));
  }
  window.attachVoucherRowCodePicker = attachVoucherRowCodePicker;

  function isSalesZeroTaxSupply() {
    const supplyTypeEl = document.getElementById('salesSupplyType');
    return !!supplyTypeEl && (supplyTypeEl.value === 'Export (Zero-Rated / LUT)' || supplyTypeEl.value === 'SEZ Without Tax');
  }

  function applySalesMasterItemToRow(index, tr, selectedItem) {
    const row = salesRows[index];
    if (!row) return;

    applyMasterItemToVoucherRow(row, tr, selectedItem, { zeroTax: isSalesZeroTaxSupply() });
    if (tr) updateRowFromDOM(index, tr, 'item');
    recalculateSalesTotals();
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

    const isService = (typeof currentSalesType !== 'undefined' && currentSalesType === 'Service');

    if (isService) {
      const revSelect = tr.querySelector('.sales-row-rev');
      if (revSelect && revSelect.value) row.revenueLedgerId = revSelect.value;
    }

    // Description, HSN/SAC and Unit live on every row, whatever the voucher type.
    const itemEl = tr.querySelector('.sales-row-item');
    if (itemEl) row.item = itemEl.value;

    const hsnEl = tr.querySelector('.sales-row-hsn');
    if (hsnEl) row.hsn = hsnEl.value;

    const unitEl = tr.querySelector('.sales-row-unit');
    if (unitEl) row.unit = unitEl.value;

    let qty      = parseFloat(tr.querySelector('.sales-row-qty')?.value) || 0;
    let rate     = Math.round(parseSalesAmt(tr.querySelector('.sales-row-rate')?.value || '0') * 100) / 100;
    let baseAmt  = Math.round(parseSalesAmt(tr.querySelector('.sales-row-base')?.value || '0') * 100) / 100;
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

      if (isService) {
        row.baseAmount = Math.round(base * 100) / 100;
        row.discount = discount;
        row.amount   = enteredAmount;
        const baseInput = tr.querySelector('.sales-row-base');
        if (baseInput && document.activeElement !== baseInput) {
          baseInput.value = row.baseAmount === 0 ? '' : row.baseAmount.toFixed(2);
        }
      } else {
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
      }
    } else {
      if (isService) {
        row.baseAmount = baseAmt;
        row.discount   = discount;

        const discAmt       = row.discountType === 'pct' ? (baseAmt * (row.discount / 100)) : row.discount;
        const afterDiscount = Math.max(0, baseAmt - discAmt);
        const taxAmt        = afterDiscount * (row.tax / 100);
        row.amount          = Math.round((afterDiscount + taxAmt) * 100) / 100;

        if (amtInput && document.activeElement !== amtInput) {
          amtInput.value = row.amount === 0 ? '' : row.amount.toFixed(2);
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
    // Amount is editable only for a Custom rate; preset rates derive it from the subtotal.
    const isCustomRate = !!rateSelect && rateSelect.value === 'custom';
    if (amountInput) {
      amountInput.readOnly = !isCustomRate;
      amountInput.title = isCustomRate ? '' : 'Select "Custom" rate to edit the amount';
    }

    // Custom rate with a typed amount: the amount drives the percentage instead.
    const isManualAmount = isCustomRate && !!amountInput && amountInput.dataset.manual === '1';
    if (isManualAmount && tdsTcsMode !== 'None') {
      const customInput = document.getElementById('salesTdsTcsRateCustom');
      const manualAmt = parseFloat(amountInput.value) || 0;
      if (customInput && subTotal > 0) {
        rate = Math.round((manualAmt / subTotal) * 100 * 100) / 100;
        customInput.value = rate ? String(rate) : '';
        if (rateLabel) rateLabel.textContent = rate + '%';
      }
    } else if (amountInput && !(isCustomRate && document.activeElement === amountInput)) {
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

    // Adjust Payment Amount in real-time if it exceeds the new Grand Total
    const payAmtEl = document.getElementById('salesPaymentAmount');
    if (payAmtEl) {
      const maxVal = getSalesPaymentMax(total);
      if (currentSalesVoucherSubtype !== 'Return') {
        payAmtEl.removeAttribute('max');
      }
      
      if (payAmtEl.value && total > 0) {
        const currentVal = parseFloat(payAmtEl.value) || 0;
        if (currentVal > maxVal) {
          payAmtEl.value = maxVal.toFixed(2);
          showToast(`Payment Amount adjusted to ₹${fmtNum(maxVal)} to not exceed the Grand Total.`, 'warning');
        }
      }
    }
    
    // Show/hide Refund Info Message banner
    const refundInfoEl = document.getElementById('salesRefundInfoMessage');
    const payStatusWrapEl = document.querySelector('.sales-paystatus-wrap');
    if (refundInfoEl && payStatusWrapEl) {
      payStatusWrapEl.style.display = 'flex';
      refundInfoEl.style.display = 'none';
      refundInfoEl.textContent = '';
    }
    
    updateSalesPaymentUI();
  }

  function updateVoucherSubtypeUI() {
    const newSalesBtn = document.getElementById('btnNewSales');
    const preInvoiceBtn = document.getElementById('btnSalesPreInvoice');
    const returnBtn = document.getElementById('btnSalesReturn');
    const formCard = document.getElementById('salesVoucherFormCard') || document.querySelector('#panel-sales-voucher .je-form-card');
    const preInvCard = document.getElementById('salesPreInvoiceCard');
    const cardTitle = document.querySelector('#salesVoucherFormCard .je-card-title-text') || document.querySelector('#panel-sales-voucher .je-card-title-text');
    const cardSubtitle = document.querySelector('#salesVoucherFormCard .je-card-subtitle-text') || document.querySelector('#panel-sales-voucher .je-card-subtitle-text');
    const invoiceNoLabel = document.getElementById('lblSalesInvoiceNo');
    const invoiceNoInput = document.getElementById('salesInvoiceNo');
    const invoiceNoInputWrap = document.getElementById('salesInvoiceNoInputWrap');
    const selectWrap = document.getElementById('salesInvoiceSelectWrap');
    const invoiceNoContainer = document.getElementById('salesInvoiceNoContainer');
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

    const quoteListCard = document.getElementById('salesQuotationListCard');
    const quoteCard = document.getElementById('salesQuotationFormCard');
    const proformaListCard = document.getElementById('salesProformaListCard');
    const proformaCard = document.getElementById('salesProformaFormCard');
    const orderCard = document.getElementById('salesOrderFormCard');
    const challanCard = document.getElementById('salesDeliveryChallanFormCard');

    deactiveBtn(newSalesBtn);
    deactiveBtn(preInvoiceBtn);
    deactiveBtn(returnBtn);

    if (quoteListCard) quoteListCard.style.display = 'none';
    if (quoteCard) quoteCard.style.display = 'none';
    if (proformaListCard) proformaListCard.style.display = 'none';
    if (proformaCard) proformaCard.style.display = 'none';
    if (orderCard) orderCard.style.display = 'none';
    if (challanCard) challanCard.style.display = 'none';

    if (currentSalesVoucherSubtype === 'PreInvoice') {
      activeBtn(preInvoiceBtn);
      if (formCard) formCard.style.display = 'none';
      if (preInvCard) {
        preInvCard.style.display = 'block';
        if (typeof renderSalesPreInvoicePanel === 'function') {
          renderSalesPreInvoicePanel();
        }
      }
    } else {
      if (formCard) formCard.style.display = '';
      if (preInvCard) preInvCard.style.display = 'none';

      if (currentSalesVoucherSubtype === 'Return') {
        activeBtn(returnBtn);
        if (cardTitle) cardTitle.textContent = 'Sales Reversal';
        if (cardSubtitle) cardSubtitle.textContent = 'Record sales reversals and customer credits';
        if (invoiceNoContainer) invoiceNoContainer.style.display = 'block';
        if (invoiceNoLabel) invoiceNoLabel.textContent = 'Original Doc';
        if (invoiceNoInputWrap) invoiceNoInputWrap.style.display = 'none';
        else if (invoiceNoInput) invoiceNoInput.style.display = 'none';
        if (selectWrap) {
          selectWrap.style.display = 'block';
          refreshSalesInvoiceDropdownOptions();
        }
        if (postSalesBtn) {
          postSalesBtn.innerHTML = `<svg viewBox="0 0 15 15" fill="none" style="width:14px; height:14px; margin-right:6px; display:inline-block; vertical-align:middle;"><path d="M2.5 8l4 4 6-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> Post Reversal`;
        }
      } else {
        activeBtn(newSalesBtn);
        if (cardTitle) cardTitle.textContent = 'Sales Invoice';
        if (cardSubtitle) cardSubtitle.textContent = 'Record sales transactions and customer receivables';
        if (invoiceNoContainer) invoiceNoContainer.style.display = 'block';
        if (invoiceNoInputWrap) invoiceNoInputWrap.style.display = 'block';
        if (invoiceNoInput) {
          invoiceNoInput.style.display = 'block';
          const s = getSalesNumberingSettings('invoice');
          invoiceNoInput.placeholder = formatSalesInvoiceNo(s, s.start);
        }
        if (selectWrap) selectWrap.style.display = 'none';
        if (postSalesBtn) {
          postSalesBtn.innerHTML = `<svg viewBox="0 0 15 15" fill="none" style="width:14px; height:14px; margin-right:6px; display:inline-block; vertical-align:middle;"><path d="M2.5 8l4 4 6-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> Post Invoice`;
        }
      }
    }
  }

  function refreshSalesInvoiceDropdownOptions(filter = '') {
    const optionsList = document.getElementById('salesInvoiceSelectOptionsList');
    const triggerText = document.getElementById('salesInvoiceSelectTriggerText');
    if (!optionsList || !triggerText) return;

    optionsList.innerHTML = '';
    
    // Get all posted invoices that are NOT returns and NOT completely returned
    const invoices = (window.KYA_STORE.salesVouchers || []).filter(v => {
      if (v.isReturn) return false;
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
      const text = `${inv.invoiceNo} - ${custName} (${inv.date}) - ₹${fmtNum(inv.total)}`;
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
      noResult.textContent = 'No matching invoices';
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
      notesEl.value = `Return against invoice ${inv.invoiceNo}. ${inv.notes || ''}`;
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

  function initSalesForm() {
    window._pendingConvertQuotationId = null;
    window._pendingConvertProformaId = null;
    window._salesPartyOverride = null;
    updateVoucherSubtypeUI();
    // Local date — toISOString() is UTC and gives yesterday before 05:30 IST
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const dateEl = document.getElementById('salesDate');
    const dueEl = document.getElementById('salesDueDate');
    if (dateEl) dateEl.value = today;
    if (dueEl) dueEl.value = today;
    
    const notesEl = document.getElementById('salesNotes');
    const adjEl = document.getElementById('salesAdjustments');
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
    resetSalesMultiPayments();
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
    if (triggerText) triggerText.textContent = 'Select Invoice';

    _salesCodePortal.close();
    _salesUnitPortal.close();
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
        returnAgainstInvoice: (typeof currentSalesVoucherSubtype !== 'undefined' && currentSalesVoucherSubtype === 'Return') ? (document.getElementById('salesInvoiceSelectTriggerText')?.textContent.trim() || '') : '',
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
  window.updateRowFromDOM = updateRowFromDOM;
  window.autoCalculateSalesRoundOff = autoCalculateSalesRoundOff;
  window.getSalesPaymentStatus = getSalesPaymentStatus;
  window.setInvoiceNoMode = setInvoiceNoMode;
  window.getNextAutoInvoiceNumber = getNextAutoInvoiceNumber;
