/**
 * KYA Modular - Track Recorder Module
 * Overview, Budget and Reminders. Budget and Reminders open full screen (left menu hidden)
 * with a Back button to return to Overview, like Reports and Master Desk.
 * Budget and Reminders reuse the KeepOne renderers (onehub-budget.js, onehub-reminders-view.js)
 * and the same saved data.
 */

(function() {
  'use strict';

  let _trActiveSection = 'overview';   // overview | budget | reminders

  // Sections that open full screen (left menu hidden) with a Back button to return to Overview
  const TR_FULL_SCREEN = ['budget', 'reminders'];

  const TR_ICONS = {
    overview: `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
        <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
        <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
        <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
      </svg>`,
    budget: `
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="4" width="16" height="13" rx="2" stroke="currentColor" stroke-width="1.8"/>
        <path d="M7 10h6M7 13h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M10 4V2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>`,
    reminders: `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  };

  const TR_PLUS_ICON = '<svg viewBox="0 0 15 15" fill="none" style="width: 14px; height: 14px;"><path d="M7.5 2v11M2 7.5h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  // Back bar search box and department filter: the same look as Stock Book's search bar and filter
  function injectTrackRecorderStyles() {
    if (document.getElementById('track-recorder-styles')) return;
    const style = document.createElement('style');
    style.id = 'track-recorder-styles';
    style.textContent = `
      #trBackBar .stock-search-box {
        position: relative;
        flex: 1;
        min-width: 240px;
      }
      #trBackBar .stock-search-box svg {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--slate-400, #94a3b8);
        pointer-events: none;
      }
      #trBackBar .stock-search-input {
        width: 100%;
        padding: 8px 12px 8px 36px;
        font-size: 13px;
        border-radius: 7px;
        border: 1.5px solid var(--slate-200, #e2e8f0);
        outline: none;
        box-sizing: border-box;
        transition: border-color 0.15s ease;
        background: #ffffff;
      }
      #trBackBar .stock-search-input:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
      }
      #trBackBar .stock-select-filter {
        padding: 7.5px 12px;
        font-size: 12.5px;
        font-weight: 500;
        color: var(--slate-700, #334155);
        border: 1.5px solid var(--slate-200, #e2e8f0);
        border-radius: 7px;
        background: #ffffff;
        outline: none;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }

  // True while the Track Recorder panel is on screen with the given section open
  function isTrackRecorderShowing(section) {
    const panel = document.getElementById('panel-track-recorder');
    return !!panel && panel.style.display !== 'none' && _trActiveSection === section;
  }

  function renderTrSubTab(id, label) {
    const isActive = _trActiveSection === id;
    return `
      <button class="oh-sub-tab ${isActive ? 'active' : ''}" data-tr-section="${id}" role="tab" aria-selected="${isActive}">
        <div class="oh-tab-icon-wrap">${TR_ICONS[id]}</div>
        <span class="oh-tab-text">${label}</span>
      </button>
    `;
  }

  function renderTrHeaderActions() {
    if (_trActiveSection === 'budget') {
      // Glass look of KYA's blue title-card controls (cl-glass-control, as on Balance Sheet / Cashline)
      return `<button type="button" class="cl-glass-control" id="trAddBudgetBtn" aria-label="Add Budget" style="display: inline-flex; align-items: center; gap: 6px;">${TR_PLUS_ICON} Add Budget</button>`;
    }
    if (_trActiveSection === 'reminders') {
      return `<button type="button" class="cl-glass-control" id="trAddReminderBtn" aria-label="Add Reminder" style="display: inline-flex; align-items: center; gap: 6px;">${TR_PLUS_ICON} Add Reminder</button>`;
    }
    return '';
  }

  // Budget list: search box and department filter sit in the back bar, next to the Back button
  function renderTrBudgetFilters() {
    if (_trActiveSection !== 'budget') return '';
    const search = typeof _ohBudgetSearch === 'string' ? _ohBudgetSearch : '';
    const deptFilter = typeof _ohBudgetDeptFilter !== 'undefined' ? String(_ohBudgetDeptFilter) : '';
    const depts = typeof ohDepartments !== 'undefined' ? ohDepartments : [];
    return `
      <div class="stock-search-box">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" class="stock-search-input" id="trBudgetSearch" placeholder="Search by department or ledger..." value="${ohEsc(search)}" aria-label="Search by department or ledger">
      </div>
      <select class="stock-select-filter" id="trBudgetDeptFilter" aria-label="Department filter">
        <option value="">-- All Departments --</option>
        ${depts.map(d => `<option value="${d.id}" ${String(d.id) === deptFilter ? 'selected' : ''}>${ohEsc(d.name)}</option>`).join('')}
      </select>
    `;
  }

  function renderTrContent() {
    if (_trActiveSection === 'budget') return '<div id="trBudgetView"></div>';
    if (_trActiveSection === 'reminders') return '<div id="trRemindersView"></div>';
    return '';   // Overview: nothing for now
  }

  function renderTrackRecorderPanel() {
    const container = document.getElementById('panel-track-recorder');
    if (!container) return;
    injectTrackRecorderStyles();

    const isFullScreen = TR_FULL_SCREEN.includes(_trActiveSection);

    container.innerHTML = `
      <div class="table-card" style="padding: 24px 28px;">
        <!-- Colored header strip -->
        <div class="je-card-header" style="background: linear-gradient(90deg, var(--blue-700), var(--blue-500)); border-top-left-radius: 12px; border-top-right-radius: 12px; margin: -24px -28px 20px -28px; padding: 18px 28px; display: flex; align-items: center; justify-content: space-between;">
          <div class="je-card-header-left" style="display: flex; align-items: center; gap: 12px;">
            <div class="je-card-icon-wrap" style="background: rgba(255, 255, 255, 0.15); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
              <svg viewBox="0 0 20 20" fill="none" style="width: 20px; height: 20px; color: var(--white);">
                <rect x="4" y="3.5" width="12" height="14" rx="2" stroke="currentColor" stroke-width="1.6"/>
                <path d="M7.5 3.5V2.5h5v1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M7 10.5l2 2 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div>
              <div class="je-card-title-text" style="color: var(--white); font-weight: 700; font-size: 16px; margin: 0;">Track Recorder</div>
              <div class="je-card-subtitle-text" style="color: rgba(255, 255, 255, 0.8); font-size: 12px; margin: 2px 0 0 0;">Budgets &amp; Reminders</div>
            </div>
          </div>
          <div class="panel-actions" style="display: flex; gap: 8px; align-items: center;">${renderTrHeaderActions()}</div>
        </div>

        <div class="oh-layout ${isFullScreen ? 'full-width' : ''}" id="trLayoutContainer">
          <!-- Sub-tabs (Left side options cards) -->
          <div class="oh-sub-tabs" id="trSidebar" role="tablist" aria-label="Track Recorder sections" style="display: ${isFullScreen ? 'none' : 'flex'};">
            ${renderTrSubTab('overview', 'Overview')}
            ${renderTrSubTab('budget', 'Budget')}
            ${renderTrSubTab('reminders', 'Reminders')}
          </div>

          <!-- Right Content View Area -->
          <div class="oh-content-area">
            <div id="trBackBar" style="display: ${isFullScreen ? 'flex' : 'none'}; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; background: var(--slate-50); border: 1.5px solid var(--slate-200); border-radius: 12px; padding: 12px 16px;">
              <div style="display: flex; gap: 10px; align-items: center;">
                <button type="button" class="kya-back-btn" id="trBackBtn" title="Back" aria-label="Back">
                  <svg viewBox="0 0 20 20" fill="none" width="18" height="18" aria-hidden="true"><path d="M12.5 15l-5-5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
              </div>
              ${renderTrBudgetFilters()}
            </div>
            <div id="trContentArea">${renderTrContent()}</div>
          </div>
        </div>
      </div>
    `;

    container.querySelectorAll('.oh-sub-tab[data-tr-section]').forEach(btn => {
      btn.addEventListener('click', () => {
        _trActiveSection = btn.dataset.trSection;
        renderTrackRecorderPanel();
      });
    });

    container.querySelector('#trBackBtn')?.addEventListener('click', () => {
      _trActiveSection = 'overview';
      renderTrackRecorderPanel();
    });

    container.querySelector('#trAddBudgetBtn')?.addEventListener('click', () => {
      if (typeof openOhBudgetModal === 'function') openOhBudgetModal();
    });
    container.querySelector('#trAddReminderBtn')?.addEventListener('click', () => {
      if (typeof ohToggleNewReminderForm === 'function') ohToggleNewReminderForm();
    });

    // Back bar search / department filter re-draw only the list, so the search box keeps its focus
    container.querySelector('#trBudgetSearch')?.addEventListener('input', e => {
      _ohBudgetSearch = e.target.value;
      renderOhBudgetView();
    });
    container.querySelector('#trBudgetDeptFilter')?.addEventListener('change', e => {
      _ohBudgetDeptFilter = e.target.value;
      renderOhBudgetView();
    });

    if (_trActiveSection === 'budget' && typeof renderOhBudgetView === 'function') renderOhBudgetView();
    if (_trActiveSection === 'reminders' && typeof renderOhRemindersView === 'function') renderOhRemindersView();
  }

  // Opens Track Recorder on a section (the top bar's 🔔 opens Reminders)
  function openTrackRecorderSection(section) {
    _trActiveSection = section;
    if (typeof navigateTo === 'function') navigateTo('track_recorder');
    renderTrackRecorderPanel();
  }

  // Global exports
  window.openTrackRecorderSection = openTrackRecorderSection;
  window.renderTrackRecorderPanel = renderTrackRecorderPanel;
  window.isTrackRecorderShowing = isTrackRecorderShowing;

})();
