/**
 * js/sales-select-boxes.js
 * The Sales Executive and Supply Type boxes of the sales forms — Sales Voucher (Invoice and
 * Reversal) and the Pre Invoice forms (Quotation, Proforma Invoice, Sales Order, Delivery
 * Challan) — working like the Customer box: a box over the form's <select> that opens a list
 * with a search box.
 *  - Sales Executive: a sticky "Create new" footer (+ Sales Executive) opens Master Desk →
 *    Create Employee with Sales Executive = Yes on every row; Create Employee comes back to the
 *    same form with the (first) new executive picked, Cancel reopens the list.
 *  - Supply Type: hovering a type in the list, or the box itself, shows what it is as per GST
 *    law with an example, in the Customer box's hover card (coa.js).
 * The <select> stays the field every other script reads, fills and locks. The box follows its
 * value — also when set from code, as its `value` / `selectedIndex` setters are wrapped — its
 * options and its lock (Reversal, a loaded Pre Invoice).
 *
 * The small dropdowns of the Sales and Purchase forms — Payment Account, TDS / TCS rate and a
 * row's Tax — keep their own look and open the same searchable list (see THE SMALL DROPDOWNS
 * below): Payment Account can create a Cash and Cash Equivalents ledger, and Tax offers the GST
 * rates in force on the voucher date (gst-rates.js).
 */
(function() {
  'use strict';

  const $ = id => document.getElementById(id);

  function esc(str) {
    if (typeof ohEsc === 'function') return ohEsc(str);
    return String(str == null ? '' : str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  // Sales Executive boxes, with the form's own function that fills the <select>
  const EXEC_BOXES = {
    salesExecutive: 'populateSalesExecutives',
    quoteSalesExecutive: 'populateQuoteExecutives',
    proformaSalesExecutive: 'populateProformaExecutives',
    orderSalesExecutive: 'populateOrderExecutives',
    challanSalesExecutive: 'populateChallanExecutives'   // Delivery Challan: Dispatched By / Executive
  };
  const SUPPLY_BOXES = ['salesSupplyType', 'quoteSupplyType', 'proformaSupplyType', 'orderSupplyType', 'challanSupplyType'];

  // ── What each Supply Type is as per law, with an example (the Delivery Challan's purposes last) ──
  const SUPPLY_TYPE_INFO = {
    'Intra-State (CGST + SGST)': {
      badge: 'Supply Type',
      what: `You and the place of supply are in the same State or Union Territory. GST is split into two equal halves: CGST to the Centre and SGST (UTGST in a Union Territory) to the State.`,
      law: `Section 8, IGST Act 2017 (intra-State supply). CGST is levied under Section 9, CGST Act 2017, and SGST under the State GST Act. Place of supply: Section 10 (goods) and Section 12 (services), IGST Act.`,
      example: `A Kochi shop sells a laptop to a customer in Thrissur, both in Kerala. At 18% GST the invoice shows 9% CGST + 9% SGST.`
    },
    'Inter-State (IGST)': {
      badge: 'Supply Type',
      what: `You and the place of supply are in different States or Union Territories. One tax, IGST, is charged at the full rate.`,
      law: `Section 7, IGST Act 2017 (inter-State supply); IGST is levied under Section 5, IGST Act. Place of supply: Section 10 (goods) and Section 12 (services), IGST Act.`,
      example: `A Kochi (Kerala) seller ships furniture to a buyer in Bengaluru (Karnataka). At 18% GST the invoice shows 18% IGST.`
    },
    'Export (Zero-Rated / LUT)': {
      badge: 'Supply Type',
      what: `Goods sent out of India, or services to a client abroad. Exports are zero-rated: under a Letter of Undertaking (LUT) or bond no GST is charged, and the input tax credit used is claimed back as a refund.`,
      law: `Section 16(1)(a), IGST Act 2017 (zero-rated supply); export of goods and services: Section 2(5) and 2(6), IGST Act; LUT / bond: Rule 96A, CGST Rules 2017. Rule 46 requires the invoice to be endorsed "Supply meant for export … under bond or Letter of Undertaking without payment of integrated tax".`,
      example: `A Kochi software firm bills a client in the USA USD 5,000 for an app, under LUT. The invoice carries no IGST.`
    },
    'SEZ With Tax': {
      badge: 'Supply Type',
      what: `A supply to a unit or developer in a Special Economic Zone, charging IGST. SEZ supplies are zero-rated and always treated as inter-State, so IGST applies even inside your own State; the IGST paid is then claimed back as a refund.`,
      law: `Section 16(1)(b) (zero-rated) and Section 7(5)(b) (inter-State), IGST Act 2017. Refund: Section 54, CGST Act 2017 and Rule 89, CGST Rules 2017.`,
      example: `Office chairs supplied to a company in the Cochin SEZ, Kakkanad (Kerala). The invoice charges 18% IGST, not CGST + SGST.`
    },
    'SEZ Without Tax': {
      badge: 'Supply Type',
      what: `The same SEZ supply made under a Letter of Undertaking (LUT) or bond, without charging IGST. The input tax credit used is claimed back as a refund.`,
      law: `Section 16(1)(b) and Section 16(3), IGST Act 2017; LUT / bond: Rule 96A, CGST Rules 2017.`,
      example: `The same chairs supplied to the Cochin SEZ company under LUT. The invoice shows no GST.`
    },
    'Deemed Export (CGST + SGST)': {
      badge: 'Supply Type',
      what: `Goods made in India that stay in India but are treated like exports because of the buyer: an Export Oriented Unit (EOU), or a buyer holding an Advance Authorisation or EPCG authorisation. With the buyer in your own State, GST is charged as CGST + SGST; the supplier or the buyer claims it back as a refund.`,
      law: `Section 147, CGST Act 2017, read with Notification 48/2017–Central Tax (18-10-2017); intra-State supply: Section 8, IGST Act 2017. Refund: Section 54, CGST Act and Rule 89, CGST Rules 2017. Goods only; services can't be deemed exports.`,
      example: `Fabric supplied by a Kochi mill to an EOU in Kochi that exports the finished shirts. The invoice charges CGST + SGST, refunded later.`
    },
    'Deemed Export (IGST)': {
      badge: 'Supply Type',
      what: `The same deemed export (to an EOU, or a buyer holding an Advance Authorisation or EPCG authorisation) with the buyer in another State: IGST is charged at the full rate, and the supplier or the buyer claims it back as a refund.`,
      law: `Section 147, CGST Act 2017, read with Notification 48/2017–Central Tax (18-10-2017); inter-State supply: Section 7, IGST Act 2017, with IGST levied under Section 5. Refund: Section 54, CGST Act and Rule 89, CGST Rules 2017.`,
      example: `Fabric supplied by a Kochi (Kerala) mill to an EOU in Tiruppur (Tamil Nadu). The invoice charges IGST, refunded later.`
    },
    'Transportation of Goods': {
      badge: 'Challan Purpose',
      what: `Goods moved without a tax invoice when they leave, e.g. liquid gas whose quantity is known only on delivery, or goods moved for a reason other than a sale. If the goods are being supplied, the tax invoice is issued after delivery.`,
      law: `Rule 55(1)(a) and (c), and Rule 55(4), CGST Rules 2017. The challan is declared for the e-way bill: Rule 55(3) and Rule 138.`,
      example: `An LPG tanker goes to a factory; the quantity is measured there and the tax invoice is raised after delivery.`
    },
    'Supply on Approval': {
      badge: 'Challan Purpose',
      what: `Goods sent on "sale or return": the buyer may keep or return them. They travel on a delivery challan; the tax invoice is issued when the buyer accepts them, or 6 months after they were sent, whichever is earlier.`,
      law: `Section 31(7), CGST Act 2017; Rule 55(1)(c) and Rule 55(4), CGST Rules 2017; CBIC Circular 10/10/2017-GST (18-10-2017).`,
      example: `A jeweller sends 10 gold chains to a retailer on approval. The retailer keeps 6 within two months: a tax invoice is raised for those 6 and the other 4 come back.`
    },
    'Job Work / Processing': {
      badge: 'Challan Purpose',
      what: `Inputs or capital goods sent to a job worker for processing (stitching, polishing, plating…) without paying tax. Inputs must come back within 1 year and capital goods within 3 years; otherwise they count as supplied on the day they were sent.`,
      law: `Section 143, CGST Act 2017; Rule 45 and Rule 55(1)(b), CGST Rules 2017. Goods sent and received are reported in Form ITC-04.`,
      example: `A garment maker sends cut fabric to a stitching unit on a delivery challan; the stitched shirts come back three weeks later.`
    },
    'Stock / Location Transfer': {
      badge: 'Challan Purpose',
      what: `Your own stock moved between your places of business under the same GSTIN, e.g. godown to shop. It is not a supply, so no tax is charged. Stock sent to your branch under another GSTIN (another State) is a supply and needs a tax invoice.`,
      law: `Rule 55(1)(c), CGST Rules 2017 (movement other than by way of supply). Supplies between distinct persons: Schedule I, para 2, CGST Act 2017.`,
      example: `Moving 50 cartons from the Aluva godown to the Kochi showroom, both under the same Kerala GSTIN.`
    },
    'Supply for Exhibition / Demo': {
      badge: 'Challan Purpose',
      what: `Goods sent to an exhibition, trade fair or customer demo and brought back. Nothing is sold, so no tax invoice is issued; anything sold there is billed on a tax invoice.`,
      law: `Rule 55(1)(c), CGST Rules 2017 (movement other than by way of supply).`,
      example: `A demo coffee machine goes to a trade fair in Bengaluru and comes back after the show.`
    },
    'Line Sale / Mobile Van': {
      badge: 'Challan Purpose',
      what: `Goods loaded on a van and sold along a route when the buyers aren't known at dispatch. The van carries a delivery challan, and a tax invoice is issued for each sale as it is made.`,
      law: `Rule 55(1)(c) and Rule 55(4), CGST Rules 2017; the tax invoice for each sale under Section 31, CGST Act 2017.`,
      example: `An FMCG distributor loads biscuits on a van each morning and bills each shop on the route as it sells.`
    },
    'Others': {
      badge: 'Challan Purpose',
      what: `Any other movement of goods that is not a supply and has no tax invoice, e.g. goods sent for repair, returnable samples, or borrowed goods being returned.`,
      law: `Rule 55(1)(c) and (d), CGST Rules 2017.`,
      example: `A faulty motor is sent to the manufacturer's service centre for repair and comes back.`
    }
  };

  // A document saved as 'Deemed Export' (before the two choices) was CGST + SGST
  SUPPLY_TYPE_INFO['Deemed Export'] = SUPPLY_TYPE_INFO['Deemed Export (CGST + SGST)'];

  // Section icons, as on the Customer Details card
  const ICON_WHAT = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
  const ICON_LAW = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>';
  const ICON_EXAMPLE = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';

  // The card's content: title and badge, then What it is / As per law / Example, laid out like
  // the Customer Details card
  function lawCardHtml(title, badge, info) {
    const section = (icon, heading, text, first) => `
      <div style="${first ? '' : 'margin-top: 10px; padding-top: 8px; border-top: 1px dashed var(--slate-200); '}font-size: 11.5px; line-height: 1.45; color: var(--slate-700);">
        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--slate-500); margin-bottom: 3px; display: flex; align-items: center; gap: 4px;">${icon} ${heading}</div>
        ${esc(text)}
      </div>`;
    return `
      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 8px;">
        <div style="flex: 1; min-width: 0; font-size: 13.5px; font-weight: 700; color: var(--slate-900); line-height: 1.3; word-break: break-word;">${esc(title)}</div>
        <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 7px; border-radius: 6px; background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; white-space: nowrap;">${esc(badge)}</span>
      </div>
      ${section(ICON_WHAT, 'What it is', info.what, true)}
      ${section(ICON_LAW, 'As per law', info.law, false)}
      ${section(ICON_EXAMPLE, 'Example', info.example, false)}`;
  }

  function supplyTypeCardHtml(type) {
    const info = SUPPLY_TYPE_INFO[type];
    return info ? lawCardHtml(type, info.badge, info) : '';
  }

  function showSupplyTypeCard(target, type) {
    const html = supplyTypeCardHtml(type);
    if (html && typeof positionAndShowKyaInfoHoverCard === 'function') positionAndShowKyaInfoHoverCard(target, html);
  }
  function hideCardSoon(delay) {
    if (typeof scheduleHidePartyHoverCard === 'function') scheduleHidePartyHoverCard(delay);
  }
  function hideCard() {
    if (typeof hidePartyHoverCard === 'function') hidePartyHoverCard();
  }

  // ══════════════════════════════════════════════════════════════════
  //  THE BOX — markup and styles copied from the Customer box (index.html)
  // ══════════════════════════════════════════════════════════════════
  const boxes = {};
  let _pendingExecBox = null;   // the Sales Executive box that opened Master Desk → Create Employee

  function boxHtml(id, searchPlaceholder, kind) {
    // Sales Executive: as wide as the box, like the Customer list; Supply Type: wide enough
    // for its names
    const width = kind === 'supply' ? 'min-width: 100%; width: max-content; max-width: 90vw;' : 'width: 100%;';
    return `
      <div class="kya-searchable-select-wrap" id="${id}SelectWrap" style="position: relative; width: 100%;">
        <div class="kya-searchable-select-trigger" id="${id}SelectTrigger" tabindex="0" role="button" aria-haspopup="listbox" style="display: flex; justify-content: space-between; align-items: center; padding: 0 14px; border: 1.5px solid var(--slate-300); border-radius: 9px; background: var(--white, #fff); cursor: pointer; font-family: var(--font-main); font-size: 14px; font-weight: 500; color: var(--slate-900); height: 42px; box-sizing: border-box; box-shadow: 0 1px 2px rgba(0,0,0,.04); transition: border-color var(--duration), box-shadow var(--duration);">
          <span id="${id}SelectTriggerText" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">&mdash; Select &mdash;</span>
          <span style="font-size: 10px; color: var(--slate-400); flex-shrink: 0; margin-left: 6px;">▼</span>
        </div>
        <div class="kya-searchable-select-dropdown" id="${id}SelectDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: ${kind === 'supply' ? 'auto' : '0'}; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 240px; overflow-y: auto; flex-direction: column; gap: 4px; ${width} box-sizing: border-box;">
          <input type="text" id="${id}SelectSearch" placeholder="${esc(searchPlaceholder)}" class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
          <div id="${id}SelectOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
        </div>
      </div>`;
  }

  // The box shows the <select>'s choice and lock
  function refreshBox(box) {
    const sel = box.sel;
    const opt = sel.options[sel.selectedIndex];
    const placeholder = Array.from(sel.options).find(o => !o.value);
    if (opt && opt.value) {
      box.text.textContent = opt.textContent.trim();
      box.text.style.color = 'var(--slate-800)';
    } else {
      box.text.textContent = placeholder ? placeholder.textContent.trim() : '— Select —';
      box.text.style.color = 'var(--slate-400)';
    }
    // Locked (a Reversal's Original Doc, a loaded Pre Invoice): the Customer box's locked look
    const locked = !!sel.disabled;
    box.trigger.dataset.locked = locked ? '1' : '';
    box.trigger.style.backgroundColor = locked ? 'var(--slate-50)' : '#fff';
    box.trigger.style.cursor = locked ? 'default' : 'pointer';
    box.trigger.style.opacity = locked ? '0.7' : '1';
    if (locked && sel.title) box.trigger.title = sel.title;
    else box.trigger.removeAttribute('title');
    if (locked && isOpen(box)) closeList(box);
    else if (isOpen(box)) renderList(box, box.search.value);
  }

  // Follows the <select>: a value set from code, refilled options, a lock or unlock
  function watchSelect(box) {
    const sel = box.sel;
    const refresh = () => refreshBox(box);
    ['value', 'selectedIndex'].forEach(prop => {
      const desc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, prop);
      if (!desc || !desc.set) return;
      Object.defineProperty(sel, prop, {
        configurable: true,
        get() { return desc.get.call(this); },
        set(v) { desc.set.call(this, v); refresh(); }
      });
    });
    new MutationObserver(refresh).observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'title'] });
    sel.addEventListener('change', refresh);
  }

  function isOpen(box) {
    return box.dropdown.style.display === 'flex';
  }

  function openList(box, query) {
    if (box.sel.disabled) return;
    hideCard();
    // One list open at a time
    document.querySelectorAll('.kya-searchable-select-dropdown').forEach(dd => {
      if (dd !== box.dropdown) dd.style.display = 'none';
    });
    // Sales Executive: the list as it is now (an employee may have been added meanwhile)
    if (box.kind === 'exec') {
      const fill = window[EXEC_BOXES[box.id]];
      if (typeof fill === 'function') fill(box.sel.value);
    }
    box.dropdown.style.display = 'flex';
    box.search.value = query || '';
    renderList(box, box.search.value);
    // Supply Type names show in full, so the list may be wider than the box (like the Pre
    // Invoice list); near the screen's right edge it opens to the left
    if (box.kind === 'supply') {
      box.dropdown.style.left = '0';
      box.dropdown.style.right = 'auto';
      if (box.dropdown.getBoundingClientRect().right > window.innerWidth - 8) {
        box.dropdown.style.left = 'auto';
        box.dropdown.style.right = '0';
      }
    }
    setTimeout(() => box.search.focus(), 50);
  }

  function closeList(box) {
    box.dropdown.style.display = 'none';
  }

  function pick(box, value) {
    box.sel.value = value;
    box.sel.dispatchEvent(new Event('change', { bubbles: true }));
    closeList(box);
    hideCard();
    box.trigger.focus();
  }

  // One row of the list, styled like the Customer list's
  function listItem(text, isSelected) {
    const item = document.createElement('div');
    item.setAttribute('role', 'option');
    item.style.cssText = `
      padding: 8px 12px; font-size: 13px; border-radius: 6px; cursor: pointer;
      font-weight: ${isSelected ? '700' : '500'};
      background: ${isSelected ? 'var(--blue-50)' : 'transparent'};
      color: ${isSelected ? 'var(--blue-700)' : 'var(--slate-700)'};
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      transition: background 0.15s ease;
    `;
    item.textContent = text;
    item.addEventListener('mouseenter', () => { if (!isSelected) item.style.background = 'var(--slate-50)'; });
    item.addEventListener('mouseleave', () => { if (!isSelected) item.style.background = 'transparent'; });
    return item;
  }

  function renderList(box, filter) {
    const sel = box.sel;
    const list = box.list;
    const q = (filter || '').toLowerCase().trim();
    list.innerHTML = '';

    // A picked Sales Executive can be cleared again, as with the old dropdown
    const placeholder = Array.from(sel.options).find(o => !o.value);
    if (box.kind === 'exec' && !q && sel.value && placeholder) {
      const clear = listItem(placeholder.textContent.trim(), false);
      clear.dataset.clear = '1';
      clear.style.color = 'var(--slate-500)';
      clear.addEventListener('click', () => pick(box, ''));
      list.appendChild(clear);
    }

    let shown = 0;
    Array.from(sel.options).forEach(opt => {
      if (!opt.value) return;
      const text = opt.textContent.trim();
      if (q && !text.toLowerCase().includes(q)) return;
      const item = listItem(text, sel.value === opt.value);
      if (box.kind === 'supply') {
        // What the type is as per law, beside the row (like a customer's details)
        item.addEventListener('mouseenter', () => showSupplyTypeCard(item, opt.value));
        item.addEventListener('mouseleave', () => hideCardSoon(250));
      }
      item.addEventListener('click', () => pick(box, opt.value));
      list.appendChild(item);
      shown++;
    });

    if (!shown) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding: 12px 10px; text-align: center; font-size: 13px; font-weight: 600; color: var(--slate-500);';
      empty.textContent = box.kind === 'exec' ? 'No Sales Executive Found' : 'No Supply Type Found';
      list.appendChild(empty);
    }

    if (box.kind === 'exec') appendExecCreateFooter(box, filter);
  }

  // Sticky "Create new" footer, like the customer list's (sales-helpers.js)
  function appendExecCreateFooter(box, query) {
    const raw = (query || '').trim();
    const footer = document.createElement('div');
    footer.className = 'kya-party-create-footer';
    footer.style.cssText = 'position: sticky; bottom: -8px; z-index: 5; background: #fff; border-top: 1px solid var(--slate-200); margin: 4px -8px -8px; padding: 8px 10px 10px; border-radius: 0 0 12px 12px;';
    const label = document.createElement('div');
    label.style.cssText = 'font-size: 11px; font-weight: 600; color: var(--slate-500); margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
    label.textContent = raw ? `Create "${raw}" as` : 'Create new';
    footer.appendChild(label);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'je-drop-create-item';
    btn.style.cssText = 'width: 100%; justify-content: center; padding: 7px 10px; font-size: 12px;';
    btn.title = 'Create a Sales Executive in Master Desk → Employee';
    btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>Sales Executive</span>';
    btn.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation();
      closeList(box);
      if (typeof window.openMasterDeskCreateEmployee !== 'function') return;
      _pendingExecBox = box;
      window.openMasterDeskCreateEmployee({ initialName: raw });
    });
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
    footer.appendChild(btn);
    box.list.appendChild(footer);
  }

  function wireBox(box) {
    const { trigger, dropdown, search } = box;
    trigger.addEventListener('click', e => {
      e.stopPropagation();
      if (trigger.dataset.locked === '1') return;
      if (isOpen(box)) closeList(box);
      else openList(box, '');
    });
    trigger.addEventListener('keydown', e => {
      if (trigger.dataset.locked === '1') return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        openList(box, '');
      }
    });
    search.addEventListener('input', () => renderList(box, search.value));
    search.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeList(box);
        trigger.focus();
      } else if (e.key === 'Enter') {
        const first = box.list.querySelector('[role="option"]:not([data-clear])');
        if (first) { e.preventDefault(); first.click(); }
      }
    });
    dropdown.addEventListener('click', e => e.stopPropagation());
    document.addEventListener('click', e => {
      if (!trigger.contains(e.target) && !dropdown.contains(e.target)) closeList(box);
    });

    // Supply Type: resting on the box shows the chosen type's card (after a second, like
    // the Customer box), also while it is locked
    if (box.kind === 'supply') {
      let hoverTimer = null;
      const cancelTimer = () => { if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; } };
      trigger.addEventListener('mouseenter', () => {
        cancelTimer();
        if (isOpen(box) || !box.sel.value) return;
        hoverTimer = setTimeout(() => {
          if (!isOpen(box) && box.sel.value) showSupplyTypeCard(trigger, box.sel.value);
        }, 1000);
      });
      trigger.addEventListener('mouseleave', () => {
        cancelTimer();
        hideCardSoon(350);
      });
      trigger.addEventListener('mousedown', cancelTimer);
    }
  }

  function setupBox(id, kind) {
    const sel = $(id);
    if (!sel || sel._kyaSearchBox) return;
    sel._kyaSearchBox = true;
    const field = sel.closest('.je-field');
    const labelEl = field ? field.querySelector('label') : null;
    sel.insertAdjacentHTML('afterend', boxHtml(id, kind === 'exec' ? 'Search executive name, code...' : 'Search supply type...', kind));
    sel.style.display = 'none';
    const box = {
      id, kind, sel,
      trigger: $(id + 'SelectTrigger'),
      text: $(id + 'SelectTriggerText'),
      dropdown: $(id + 'SelectDropdown'),
      search: $(id + 'SelectSearch'),
      list: $(id + 'SelectOptionsList')
    };
    if (labelEl) {
      labelEl.htmlFor = box.trigger.id;
      box.trigger.setAttribute('aria-label', labelEl.textContent.replace('*', '').trim());
    }
    boxes[id] = box;
    watchSelect(box);
    wireBox(box);
    refreshBox(box);
  }

  // ── Back from Master Desk → Create Employee ──
  window.onSalesExecutiveCreated = function(created) {
    const box = _pendingExecBox;
    _pendingExecBox = null;
    if (!box) return;
    // The first of the new employees that is a Sales Executive (the form may have made several)
    const emp = (created || []).find(e => e && e.isSalesExecutive !== false);
    setTimeout(() => {
      const fill = window[EXEC_BOXES[box.id]];
      if (typeof fill === 'function') fill(emp ? emp.id : box.sel.value);
      if (!emp) {
        if (typeof showToast === 'function') showToast(`"${(created && created[0] && created[0].name) || 'Employee'}" isn't set as a Sales Executive, so it wasn't picked.`, 'info');
        return;
      }
      box.sel.value = String(emp.id);
      box.sel.dispatchEvent(new Event('change', { bubbles: true }));
      if (typeof showToast === 'function') showToast(`Sales Executive "${emp.name}" selected.`, 'success');
    }, 60);
  };

  // Cancelled in Master Desk: the list opens again with the typed name, like the customer box
  window.onSalesExecutiveCreationCancelled = function(initialName) {
    const box = _pendingExecBox;
    _pendingExecBox = null;
    if (!box) return;
    setTimeout(() => openList(box, initialName || ''), 60);
  };

  Object.keys(EXEC_BOXES).forEach(id => setupBox(id, 'exec'));
  SUPPLY_BOXES.forEach(id => setupBox(id, 'supply'));

  // ══════════════════════════════════════════════════════════════════
  //  THE SMALL DROPDOWNS — Payment Account, TDS / TCS rate and a row's Tax, on the Sales and
  //  Purchase forms. The <select> keeps its look; opening it (a click, or a key) shows the
  //  Customer-style list with a search box, in a panel over the page so the items table's
  //  scrolling can't clip it. Payment Account has the "Create new → + Cash and Cash
  //  Equivalents" footer; a row's Tax lists the GST rates in force on the voucher date
  //  (gst-rates.js).
  // ══════════════════════════════════════════════════════════════════
  const PAYMENT_SELECT_IDS = ['salesPaymentAccount', 'proformaPaymentAccount', 'orderPaymentAccount', 'challanPaymentAccount',
    'purchasePaymentAccount', 'ppQuotePaymentAccount', 'ppProformaPaymentAccount', 'ppOrderPaymentAccount', 'ppGrnPaymentAccount'];
  const SMALL_LIST_WIDTH = { payment: 240, tdstcs: 170, tax: 170 };

  let _smallPanel = null;
  let _smallSel = null;             // the <select> whose list is open
  let _pendingPaymentSelId = null;  // the Payment Account that opened Master Desk → Create Ledger

  function smallKind(sel) {
    if (!sel || sel.tagName !== 'SELECT') return null;
    if (sel.classList.contains('sales-row-tax') && sel.closest('tbody[id$="ItemBody"]')) return 'tax';
    if (sel.classList.contains('sales-tdstcs-rate-select')) return 'tdstcs';
    if (PAYMENT_SELECT_IDS.indexOf(sel.id) > -1) return 'payment';
    return null;
  }

  // The tab a form is on, for Master Desk to come back to
  function voucherTabOf(sel) {
    return /^(purchase|pp)/.test(sel.id) ? 'purchase_voucher' : 'sales_voucher';
  }

  // A row's voucher date: its form's Date box (salesItemBody → salesDate, ppOrderItemBody →
  // ppOrderDate …); today when it is empty
  function voucherDateOf(sel) {
    const body = sel.closest('tbody[id$="ItemBody"]');
    const dateEl = body ? $(body.id.replace(/ItemBody$/, 'Date')) : null;
    return (dateEl && dateEl.value) || '';
  }

  function smallPanel() {
    if (_smallPanel) return _smallPanel;
    const el = document.createElement('div');
    el.id = 'kyaSmallListPanel';
    el.className = 'kya-searchable-select-dropdown';
    el.style.cssText = 'display: none; position: fixed; z-index: 99999; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); padding: 8px; max-height: 260px; overflow-y: auto; flex-direction: column; gap: 4px; box-sizing: border-box;';
    el.innerHTML = `
      <input type="text" id="kyaSmallListSearch" class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
      <div id="kyaSmallListOptions" style="display: flex; flex-direction: column; gap: 2px;"></div>`;
    document.body.appendChild(el);
    const search = el.querySelector('#kyaSmallListSearch');
    search.addEventListener('input', () => renderSmallList(search.value));
    search.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        e.preventDefault();
        const sel = _smallSel;
        closeSmallList();
        if (sel) sel.focus();
      } else if (e.key === 'Enter') {
        const first = el.querySelector('[role="option"]');
        if (first) { e.preventDefault(); first.click(); }
      } else if (e.key === 'Tab') {
        closeSmallList();
      }
    });
    _smallPanel = el;
    return el;
  }

  function isSmallListOpen() {
    return !!_smallPanel && _smallPanel.style.display === 'flex';
  }

  function openSmallList(sel, query) {
    const kind = smallKind(sel);
    if (!kind || sel.disabled) return;
    hideCard();
    const el = smallPanel();
    // One list open at a time
    document.querySelectorAll('.kya-searchable-select-dropdown').forEach(dd => {
      if (dd !== el) dd.style.display = 'none';
    });
    _smallSel = sel;
    const search = el.querySelector('#kyaSmallListSearch');
    search.placeholder = kind === 'payment' ? 'Search account...' : 'Search rate...';
    search.value = query || '';
    el.style.display = 'flex';
    renderSmallList(search.value);
    placeSmallList();
    setTimeout(() => search.focus(), 30);
  }

  function closeSmallList() {
    if (_smallPanel) _smallPanel.style.display = 'none';
    _smallSel = null;
  }

  // Under the box (above it when there is more room there), kept on screen
  function placeSmallList() {
    const sel = _smallSel;
    const el = _smallPanel;
    if (!sel || !isSmallListOpen()) return;
    if (!document.body.contains(sel)) { closeSmallList(); return; }
    const r = sel.getBoundingClientRect();
    const width = Math.max(r.width, SMALL_LIST_WIDTH[smallKind(sel)] || 200);
    el.style.width = width + 'px';
    el.style.left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8)) + 'px';
    const below = window.innerHeight - r.bottom - 8;
    const above = r.top - 8;
    el.style.maxHeight = Math.max(140, Math.min(260, Math.max(below, above) - 4)) + 'px';
    if (below >= Math.min(260, el.scrollHeight) || below >= above) {
      el.style.top = (r.bottom + 4) + 'px';
      el.style.bottom = 'auto';
    } else {
      el.style.top = 'auto';
      el.style.bottom = (window.innerHeight - r.top + 4) + 'px';
    }
  }

  function pickSmall(value) {
    const sel = _smallSel;
    closeSmallList();
    hideCard();
    if (!sel || !document.body.contains(sel)) return;
    const v = String(value);
    if (!Array.from(sel.options).some(o => o.value === v)) {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v + '%';
      sel.appendChild(opt);
    }
    sel.value = v;
    sel.dispatchEvent(new Event('input', { bubbles: true }));
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    sel.focus();
  }

  function renderSmallList(filter) {
    const sel = _smallSel;
    if (!sel || !_smallPanel) return;
    const list = _smallPanel.querySelector('#kyaSmallListOptions');
    const kind = smallKind(sel);
    const q = (filter || '').toLowerCase().trim();
    list.innerHTML = '';
    let shown = 0;
    if (kind === 'tax') {
      shown = renderRateRows(sel, list, q);
    } else {
      Array.from(sel.options).forEach(opt => {
        if (!opt.value || opt.hidden) return;
        const text = opt.textContent.trim();
        if (q && !text.toLowerCase().includes(q)) return;
        const item = listItem(text, sel.value === opt.value);
        item.addEventListener('click', () => pickSmall(opt.value));
        list.appendChild(item);
        shown++;
      });
    }
    if (!shown) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding: 12px 10px; text-align: center; font-size: 13px; font-weight: 600; color: var(--slate-500);';
      empty.textContent = kind === 'payment' ? 'No Account Found' : 'No Rate Found';
      list.appendChild(empty);
    }
    if (kind === 'payment') appendPaymentCreateFooter(list, filter);
  }

  // A row's Tax: the GST rates in force on the voucher date, and the row's own rate when it is
  // another one (from before GST 2.0, or an item's own rate). The search also matches what a
  // rate covers ("gold" finds 3%).
  function renderRateRows(sel, list, q) {
    const date = voucherDateOf(sel);
    const rates = typeof kyaGstRatesOn === 'function'
      ? kyaGstRatesOn(date)
      : Array.from(sel.options).map(o => Number(o.value));
    const cur = sel.value !== '' ? Number(sel.value) : null;
    const all = (cur !== null && rates.indexOf(cur) < 0) ? rates.concat([cur]).sort((a, b) => a - b) : rates;
    // A number ("4", "18%") finds rates starting with it; words search what the rate covers
    const numeric = /^[\d.]+%?$/.test(q);
    let shown = 0;
    all.forEach(rate => {
      const info = typeof kyaGstRateInfo === 'function' ? kyaGstRateInfo(rate) : null;
      const name = info ? info.name : 'Rate on this row';
      const matches = !q || (numeric
        ? String(rate).startsWith(q.replace(/%$/, ''))
        : `${name} ${info ? info.what : ''}`.toLowerCase().includes(q));
      if (!matches) return;
      const inForce = rates.indexOf(rate) > -1;
      const item = listItem('', cur === rate);
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.justifyContent = 'space-between';
      item.style.gap = '6px';
      item.innerHTML = `
        <span style="min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${esc(rate + '%')}</span>
        ${inForce ? '' : '<span style="font-size: 10px; font-weight: 600; color: #b45309; background: #fffbeb; padding: 1px 5px; border-radius: 4px; white-space: nowrap;">Not in force</span>'}`;
      item.addEventListener('click', () => pickSmall(rate));
      list.appendChild(item);
      shown++;
    });
    return shown;
  }

  // Sticky "Create new" footer, like the customer list's (sales-helpers.js): a ledger under
  // Cash and Cash Equivalents, back on this form with it picked
  function appendPaymentCreateFooter(list, query) {
    const raw = (query || '').trim();
    const footer = document.createElement('div');
    footer.className = 'kya-party-create-footer';
    footer.style.cssText = 'position: sticky; bottom: -8px; z-index: 5; background: #fff; border-top: 1px solid var(--slate-200); margin: 4px -8px -8px; padding: 8px 10px 10px; border-radius: 0 0 12px 12px;';
    const label = document.createElement('div');
    label.style.cssText = 'font-size: 11px; font-weight: 600; color: var(--slate-500); margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
    label.textContent = raw ? `Create "${raw}" as` : 'Create new';
    footer.appendChild(label);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'je-drop-create-item';
    btn.style.cssText = 'width: 100%; justify-content: center; padding: 7px 10px; font-size: 12px;';
    btn.title = 'Create a ledger under Cash and Cash Equivalents in Master Desk';
    btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>Cash and Cash Equivalents</span>';
    btn.addEventListener('mousedown', e => {
      e.preventDefault();
      e.stopPropagation();
      const sel = _smallSel;
      closeSmallList();
      if (!sel || typeof window.openMasterDeskCreateLedger !== 'function') return;
      _pendingPaymentSelId = sel.id;
      window.openMasterDeskCreateLedger({ initialName: raw, groupVal: 'sg:sg-cce', returnTab: voucherTabOf(sel), purpose: 'paymentAccount' });
    });
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
    footer.appendChild(btn);
    list.appendChild(footer);
  }

  // A form that builds its own list elsewhere: the new account goes in after its other
  // Cash / Bank accounts (before Invoice Balance / Multi Payment)
  function insertPaymentOption(sel, ledger) {
    const ledgers = (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) ? coaLedgers : [];
    const isAccount = o => !!o.value && ledgers.some(l => String(l.id) === o.value && l.sgId === 'sg-cce');
    const accounts = Array.from(sel.options).filter(isAccount);
    const after = accounts.length ? accounts[accounts.length - 1] : sel.options[0];
    const opt = document.createElement('option');
    opt.value = String(ledger.id);
    opt.textContent = ledger.name;
    sel.insertBefore(opt, after ? after.nextSibling : null);
  }

  // ── Back from Master Desk → Create Ledger ──
  window.onPaymentAccountCreated = function(ledger) {
    const sel = _pendingPaymentSelId ? $(_pendingPaymentSelId) : null;
    _pendingPaymentSelId = null;
    if (!sel || !ledger) return;
    setTimeout(() => {
      const id = String(ledger.id);
      // The Sales Invoice and the Purchase Voucher rebuild their own list
      const fill = { salesPaymentAccount: window.populateSalesPaymentAccounts, purchasePaymentAccount: window.populatePurchasePaymentAccounts }[sel.id];
      if (typeof fill === 'function') fill(id);
      if (!Array.from(sel.options).some(o => o.value === id)) insertPaymentOption(sel, ledger);
      sel.value = id;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      if (typeof showToast === 'function') showToast(`Account "${ledger.name}" selected.`, 'success');
    }, 60);
  };

  // Cancelled in Master Desk: the list opens again with the typed name, like the customer box
  window.onPaymentAccountCreationCancelled = function(initialName) {
    const sel = _pendingPaymentSelId ? $(_pendingPaymentSelId) : null;
    _pendingPaymentSelId = null;
    if (sel) setTimeout(() => openSmallList(sel, initialName || ''), 60);
  };

  // Clicking one of these boxes opens the list instead of the browser's own
  document.addEventListener('mousedown', e => {
    const sel = e.target && e.target.closest ? e.target.closest('select') : null;
    if (sel && smallKind(sel) && !sel.disabled) {
      e.preventDefault();
      if (_smallSel === sel && isSmallListOpen()) closeSmallList();
      else openSmallList(sel, '');
      return;
    }
    // A click anywhere else closes it
    if (isSmallListOpen() && !_smallPanel.contains(e.target)) closeSmallList();
  }, true);

  // From the keyboard: the arrow keys, Enter or Space open the list; typing opens it searching
  document.addEventListener('keydown', e => {
    const sel = e.target;
    if (!sel || sel.tagName !== 'SELECT' || !smallKind(sel) || sel.disabled || e.ctrlKey || e.metaKey) return;
    if (['ArrowDown', 'ArrowUp', 'Enter', ' ', 'F4', 'PageDown', 'PageUp', 'Home', 'End'].indexOf(e.key) > -1) {
      e.preventDefault();
      openSmallList(sel, '');
    } else if (e.key.length === 1 && !e.altKey) {
      e.preventDefault();
      openSmallList(sel, e.key);
    }
  }, true);

  window.addEventListener('scroll', e => {
    if (isSmallListOpen() && !_smallPanel.contains(e.target)) placeSmallList();
  }, true);
  window.addEventListener('resize', placeSmallList);
})();
