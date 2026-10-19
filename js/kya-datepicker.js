  // ══════════════════════════════════════════════════════════════════
  //  KYA DATE PICKER — a typeable DD-MM-YYYY box with a calendar that opens on
  //  focus and follows what you type.
  //
  //  The real value lives in a hidden input (YYYY-MM-DD, same as <input type="date">),
  //  so existing code that reads/sets `.value` or listens for `change` keeps working.
  //  Setting the hidden input's `.value` from code also updates the visible box.
  //
  //  Typing:  26092026 · 26-09-2026 · 26/9/26 · 2609 (this year) · 26 (this month)
  //  Keys:    ↑/↓ ±1 day · PgUp/PgDn ±1 month · Enter / Tab set · Esc cancel
  // ══════════════════════════════════════════════════════════════════
  (function () {
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
      'August', 'September', 'October', 'November', 'December'];
    const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const pad2 = (n) => String(n).padStart(2, '0');
    const toIso = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const toDisplay = (d) => `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
    const sameDay = (a, b) => !!a && !!b && a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

    function fromIso(iso) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
      if (!m) return null;
      const d = new Date(+m[1], +m[2] - 1, +m[3]);
      return d.getMonth() === +m[2] - 1 ? d : null;
    }

    function makeDate(y, m, d) {
      if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
      const dt = new Date(y, m - 1, d);
      return dt.getMonth() === m - 1 ? dt : null; // rejects 31-02 etc.
    }

    // 2-digit years are 20YY; a half-typed year (1 or 3 digits) keeps the fallback
    function fullYear(yStr, fallback) {
      if (!yStr) return fallback;
      const y = parseInt(yStr, 10);
      if (yStr.length === 2) return 2000 + y;
      if (yStr.length === 4) return y;
      return fallback;
    }

    // Reads what was typed. Missing month/year come from `base` (the current date).
    function parseTyped(text, base) {
      const raw = (text || '').trim();
      if (!raw) return { empty: true };
      let dStr, mStr, yStr;
      if (/[-/.\s]/.test(raw)) {
        [dStr, mStr, yStr] = raw.split(/[-/.\s]+/);
      } else {
        const digits = raw.replace(/\D/g, '');
        dStr = digits.slice(0, 2);
        mStr = digits.slice(2, 4);
        yStr = digits.slice(4, 8);
      }
      const d = parseInt(dStr, 10);
      const m = mStr ? parseInt(mStr, 10) : base.getMonth() + 1;
      const y = fullYear(yStr, base.getFullYear());
      return { date: makeDate(y, m, d), day: d, month: m, year: y };
    }

    // Digits-only typing gets dashes as you go: 2609 → 26-09, 26092026 → 26-09-2026
    // Typing like "5-9-26" or "26/9/2026" is left exactly as typed.
    function maskDigits(value) {
      if (!/^[\d-]*$/.test(value)) return value;
      if (!value.split('').every((c, i) => c !== '-' || i === 2 || i === 5)) return value;
      const digits = value.replace(/\D/g, '').slice(0, 8);
      const trailingDash = value.endsWith('-');
      let out = digits.slice(0, 2);
      if (digits.length > 2 || (digits.length === 2 && trailingDash)) out += '-' + digits.slice(2, 4);
      if (digits.length > 4 || (digits.length === 4 && trailingDash)) out += '-' + digits.slice(4);
      return out;
    }

    // ── One shared calendar popup ──
    let pop = null;
    let active = null; // the picker currently showing the calendar

    function ensurePopup() {
      if (pop) return pop;
      pop = document.createElement('div');
      pop.className = 'kya-dp-pop';
      pop.setAttribute('role', 'dialog');
      pop.setAttribute('aria-label', 'Choose date');
      pop.hidden = true;
      // Clicking the calendar must not blur the text box
      pop.addEventListener('mousedown', (e) => e.preventDefault());
      document.body.appendChild(pop);
      window.addEventListener('scroll', () => active && positionPopup(active), true);
      window.addEventListener('resize', () => active && positionPopup(active));
      return pop;
    }

    function positionPopup(p) {
      const r = p.display.getBoundingClientRect();
      const w = pop.offsetWidth || 232;
      const h = pop.offsetHeight || 250;
      const below = window.innerHeight - r.bottom;
      pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
      pop.style.top = (below >= h + 12 || below >= r.top ? r.bottom + 6 : r.top - h - 6) + 'px';
    }

    function renderPopup(p) {
      const view = p.view;
      const y = view.getFullYear();
      const m = view.getMonth();
      const first = new Date(y, m, 1);
      const start = new Date(y, m, 1 - first.getDay());
      const today = new Date();
      const selected = fromIso(p.hidden.value);

      let cells = '';
      for (let i = 0; i < 42; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const cls = ['kya-dp-day'];
        if (d.getMonth() !== m) cls.push('is-other');
        if (sameDay(d, today)) cls.push('is-today');
        if (sameDay(d, selected)) cls.push('is-selected');
        if (p.tentative && sameDay(d, p.tentative) && !sameDay(d, selected)) cls.push('is-typed');
        cells += `<button type="button" class="${cls.join(' ')}" data-iso="${toIso(d)}" tabindex="-1" aria-label="${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}">${d.getDate()}</button>`;
      }

      pop.innerHTML = `
        <div class="kya-dp-head">
          <button type="button" class="kya-dp-nav" data-nav="-1" tabindex="-1" aria-label="Previous month">‹</button>
          <div class="kya-dp-title">${MONTHS[m]} ${y}</div>
          <button type="button" class="kya-dp-nav" data-nav="1" tabindex="-1" aria-label="Next month">›</button>
        </div>
        <div class="kya-dp-grid">
          ${WEEKDAYS.map(w => `<div class="kya-dp-wd">${w}</div>`).join('')}
          ${cells}
        </div>
        <div class="kya-dp-foot">
          <span class="kya-dp-hint">${p.invalid ? '<span class="kya-dp-bad">Not a valid date</span>' : 'Type DD-MM-YYYY'}</span>
          <button type="button" class="kya-dp-today" tabindex="-1">Today</button>
        </div>
      `;

      pop.querySelectorAll('.kya-dp-nav').forEach(b => b.addEventListener('click', () => {
        p.view = new Date(y, m + parseInt(b.dataset.nav, 10), 1);
        renderPopup(p);
      }));
      pop.querySelectorAll('.kya-dp-day').forEach(b => b.addEventListener('click', () => {
        p.commit(fromIso(b.dataset.iso));
        p.close();
      }));
      pop.querySelector('.kya-dp-today').addEventListener('click', () => {
        p.commit(new Date());
        p.close();
      });
      positionPopup(p);
    }

    function attachKyaDatePicker(hidden, display) {
      if (!hidden || !display || hidden._kyaDatePicker) return;
      ensurePopup();

      const p = { hidden, display, view: new Date(), tentative: null, invalid: false };
      hidden._kyaDatePicker = p;

      const current = () => fromIso(hidden.value);
      const syncDisplay = () => {
        const d = current();
        display.value = d ? toDisplay(d) : '';
        display.classList.remove('kya-dp-invalid');
      };

      // Code that sets hidden.value (new invoice, load draft…) updates the box too
      const nativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      Object.defineProperty(hidden, 'value', {
        configurable: true,
        get() { return nativeValue.get.call(this); },
        set(v) {
          nativeValue.set.call(this, v);
          syncDisplay();
          if (active === p) { p.view = current() || p.view; renderPopup(p); }
        }
      });

      p.commit = (date) => {
        if (!date) return false;
        const iso = toIso(date);
        const changed = nativeValue.get.call(hidden) !== iso;
        nativeValue.set.call(hidden, iso);
        syncDisplay();
        p.tentative = null;
        p.invalid = false;
        if (changed) {
          hidden.dispatchEvent(new Event('input', { bubbles: true }));
          hidden.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return true;
      };

      p.open = () => {
        if (active && active !== p) active.close();
        active = p;
        p.view = p.tentative || current() || new Date();
        pop.hidden = false;
        display.setAttribute('aria-expanded', 'true');
        renderPopup(p);
      };

      p.close = () => {
        if (active !== p) return;
        active = null;
        pop.hidden = true;
        display.setAttribute('aria-expanded', 'false');
      };

      // Commits the typed text; a bad entry falls back to the last good date
      const commitTyped = () => {
        const res = parseTyped(display.value, current() || new Date());
        if (res.empty) { syncDisplay(); return; }
        if (!p.commit(res.date)) syncDisplay();
      };

      const shiftBy = (days, months) => {
        const base = p.tentative || current() || new Date();
        const d = new Date(base.getFullYear(), base.getMonth() + (months || 0), base.getDate() + (days || 0));
        p.commit(d);
        p.view = d;
        if (active === p) renderPopup(p);
        display.select();
      };

      display.setAttribute('aria-haspopup', 'dialog');
      display.setAttribute('aria-expanded', 'false');
      display.autocomplete = 'off';

      display.addEventListener('focus', () => {
        p.open();
        setTimeout(() => display.select(), 0);
      });
      // Re-opening an already focused box selects it again, ready to type over
      display.addEventListener('click', () => {
        if (active !== p) { p.open(); display.select(); }
      });

      display.addEventListener('input', (e) => {
        if (!(e.inputType || '').startsWith('delete')) {
          const masked = maskDigits(display.value);
          if (masked !== display.value) display.value = masked;
        }
        // The calendar follows the typing
        const res = parseTyped(display.value, current() || new Date());
        p.tentative = res.date || null;
        p.invalid = !res.empty && !res.date && display.value.replace(/\D/g, '').length >= 4;
        display.classList.toggle('kya-dp-invalid', p.invalid);
        if (res.date) p.view = res.date;
        else if (res.month >= 1 && res.month <= 12 && !isNaN(res.year)) p.view = new Date(res.year, res.month - 1, 1);
        if (active !== p) p.open(); else renderPopup(p);
      });

      display.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitTyped();
          p.close();
        } else if (e.key === 'Escape') {
          if (active === p) { e.preventDefault(); e.stopPropagation(); }
          p.tentative = null;
          syncDisplay();
          p.close();
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          commitTyped();
          shiftBy(e.key === 'ArrowDown' ? 1 : -1, 0);
        } else if (e.key === 'PageDown' || e.key === 'PageUp') {
          e.preventDefault();
          commitTyped();
          shiftBy(0, e.key === 'PageDown' ? 1 : -1);
        }
      });

      display.addEventListener('blur', () => {
        commitTyped();
        p.close();
      });

      const iconBtn = display.parentElement && display.parentElement.querySelector('.kya-dp-icon');
      if (iconBtn) {
        iconBtn.addEventListener('mousedown', (e) => e.preventDefault());
        iconBtn.addEventListener('click', () => {
          if (active === p) p.close();
          else { display.focus(); p.open(); }
        });
      }

      syncDisplay();
      return p;
    }

    window.attachKyaDatePicker = attachKyaDatePicker;

    // Local YYYY-MM-DD for "today" — toISOString() is UTC and gives yesterday before 05:30 IST
    window.kyaLocalIso = (d) => toIso(d instanceof Date ? d : new Date());

    // Whole days since the epoch for a YYYY-MM-DD value (NaN when blank / invalid)
    const isoDays = (iso) => {
      const d = fromIso(iso);
      return d ? Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000) : NaN;
    };
    const daysIso = (n) => {
      const d = new Date(n * 86400000);
      return toIso(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    };

    // Later dates tied to a document Date (Due Date, Expiry, Delivery…), as on the Sales
    // Invoice: moving the Date moves each of them by the same number of days (keeping the
    // credit / validity days), and none of them can be set before the Date.
    // followers: [{ el: hidden input, label: 'Due Date' }]
    function linkKyaDateFollowers(dateHidden, followers) {
      if (!dateHidden || !Array.isArray(followers) || !followers.length) return;
      dateHidden._kyaFollowers = (dateHidden._kyaFollowers || []).concat(followers.filter(f => f && f.el));
      if (dateHidden._kyaFollowersLinked) return;
      dateHidden._kyaFollowersLinked = true;

      // The Date is also set from code (new / loaded document), so its previous value is
      // taken as each edit starts
      let prev = dateHidden.value;
      const p = dateHidden._kyaDatePicker;
      if (p && p.display) p.display.addEventListener('focus', () => { prev = dateHidden.value; });

      // Capture phase: followers move before the form's own "Due in N days" helpers run
      dateHidden.addEventListener('change', () => {
        const now = isoDays(dateHidden.value);
        if (!isNaN(now)) {
          dateHidden._kyaFollowers.forEach(({ el }) => {
            if (!el.value) return; // a blank optional date stays blank
            const gap = isoDays(el.value) - isoDays(prev);
            el.value = (gap > 0 && !isNaN(gap)) ? daysIso(now + gap) : dateHidden.value;
            el.dispatchEvent(new Event('change', { bubbles: true }));
          });
        }
        prev = dateHidden.value;
      }, true);
    }

    function guardKyaDateNotBefore(el, dateHidden, label) {
      if (!el || !dateHidden || el._kyaNotBeforeGuard) return;
      el._kyaNotBeforeGuard = true;
      el.addEventListener('change', () => {
        if (dateHidden.value && el.value && el.value < dateHidden.value) {
          el.value = dateHidden.value;
          if (typeof window.showToast === 'function') window.showToast(`${label || 'This date'} cannot be before the Date.`, 'warning');
        }
      }, true);
    }
    window.linkKyaDateFollowers = linkKyaDateFollowers;

    // Markup-driven: a hidden input with data-kya-date-display="<display box id>" gets the
    // picker on its own; data-kya-date-after="<Date input id>" (+ data-kya-date-label) ties
    // it to that Date as above. Used by the Sales Invoice, Quotation, Proforma Invoice,
    // Sales Order and Delivery Challan.
    function attachMarkedKyaDatePickers(root) {
      const scope = root || document;
      scope.querySelectorAll('input[type="hidden"][data-kya-date-display]').forEach(hidden => {
        const display = document.getElementById(hidden.dataset.kyaDateDisplay);
        if (display) attachKyaDatePicker(hidden, display);
      });
      scope.querySelectorAll('input[type="hidden"][data-kya-date-after]').forEach(el => {
        const base = document.getElementById(el.dataset.kyaDateAfter);
        if (!base || !base._kyaDatePicker || el._kyaFollowerOf) return;
        el._kyaFollowerOf = base.id;
        guardKyaDateNotBefore(el, base, el.dataset.kyaDateLabel);
        linkKyaDateFollowers(base, [{ el, label: el.dataset.kyaDateLabel }]);
      });
    }
    window.attachMarkedKyaDatePickers = attachMarkedKyaDatePickers;
    attachMarkedKyaDatePickers();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => attachMarkedKyaDatePickers());
    }

    // Every other date field in KYA works like the Sales Invoice date. The browser's
    // <input type="date"> stays as the value holder (same id, YYYY-MM-DD value, change / input
    // events, so each screen's own code is untouched) but turns hidden; a typeable DD-MM-YYYY
    // box with the field's own class and inline style (glass stays glass, white stays white) and
    // a calendar icon takes its place. Date fields added later (re-rendered panels, modals) are
    // switched as they appear.
    const NATIVE_SYNC_ATTRS = ['class', 'style', 'disabled', 'readonly', 'hidden', 'title'];

    function upgradeNativeDateInput(el) {
      if (!el || el.type !== 'date' || el._kyaDatePicker || !el.parentNode) return;
      const display = document.createElement('input');
      display.type = 'text';
      display.inputMode = 'numeric';
      display.maxLength = 10;
      display.placeholder = 'DD-MM-YYYY';
      display.setAttribute('aria-label', el.getAttribute('aria-label') || el.title || 'Date (DD-MM-YYYY)');
      // Light text (glass boxes in blue title cards) gets a white calendar icon
      const rgb = (getComputedStyle(el).color.match(/\d+/g) || []).map(Number);
      const onDark = rgb.length >= 3 && (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) > 186;
      // The box follows the field: its look, and being disabled, read-only or hidden
      const sync = () => {
        const invalid = display.classList.contains('kya-dp-invalid');
        display.className = (el.className ? el.className + ' ' : '') + 'kya-dp-native-inp' +
          (onDark ? ' kya-dp-on-dark' : '') + (invalid ? ' kya-dp-invalid' : '');
        const style = el.getAttribute('style');
        if (style) display.setAttribute('style', style);
        else display.removeAttribute('style');
        display.disabled = el.disabled;
        display.readOnly = el.readOnly;
        display.hidden = el.hidden;
        if (el.title) display.title = el.title;
      };
      sync();
      el.type = 'hidden';
      el.insertAdjacentElement('afterend', display);
      attachKyaDatePicker(el, display);
      new MutationObserver(sync).observe(el, { attributes: true, attributeFilter: NATIVE_SYNC_ATTRS });
    }

    function upgradeNativeDateInputs(root) {
      const scope = root || document;
      if (scope.matches && scope.matches('input[type="date"]')) upgradeNativeDateInput(scope);
      if (scope.querySelectorAll) scope.querySelectorAll('input[type="date"]').forEach(upgradeNativeDateInput);
    }
    window.upgradeNativeDateInputs = upgradeNativeDateInputs;

    const startNativeDateUpgrade = () => {
      upgradeNativeDateInputs(document);
      new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => {
        if (n.nodeType === 1) upgradeNativeDateInputs(n);
      }))).observe(document.body, { childList: true, subtree: true });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startNativeDateUpgrade);
    else startNativeDateUpgrade();
    // Safety nets: look again once the page has loaded or comes back from the back/forward cache,
    // and switch a browser date box at the moment it is about to be clicked or focused
    window.addEventListener('load', () => upgradeNativeDateInputs(document));
    window.addEventListener('pageshow', () => upgradeNativeDateInputs(document));
    const upgradeOnTouch = (e) => {
      const el = e.target;
      if (!el || el.tagName !== 'INPUT' || el.type !== 'date') return;
      upgradeNativeDateInput(el);
      const display = el._kyaDatePicker && el._kyaDatePicker.display;
      if (display) {
        e.preventDefault();
        display.focus();
      }
    };
    document.addEventListener('pointerdown', upgradeOnTouch, true);
    document.addEventListener('focusin', upgradeOnTouch, true);
  })();
