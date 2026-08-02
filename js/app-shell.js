  // ── OneHub Global State (declared at top to prevent bootstrapping ReferenceErrors) ──
  let ohDepartments = [];
  let ohEmployees   = [];
  let ohBudgets     = [];
  let ohReminders   = [];
  let _ohDeptCtr    = 1;
  let _ohEmpCtr     = 1;
  let _ohBudgetCtr  = 1;

  /* ======================
     LANDING → APP
  ====================== */
  const landing     = document.getElementById('landing');
  const app         = document.getElementById('app');
  const loadingFill = document.getElementById('loadingFill');
  const loadingPct  = document.getElementById('loadingPct');
  const progressBar = document.getElementById('landingProgressBar');

  function enterApp() {
    landing.classList.add('exit');
    setTimeout(() => {
      landing.style.display = 'none';
      app.removeAttribute('aria-hidden');
      app.classList.add('visible');
    }, 680);
  }

  // Animate progress from 0 → 100 over ~2.6s (starts after 1.8s CSS delay)
  let pct = 0;
  const totalMs   = 2600;
  const stepMs    = 40;
  const increment = 100 / (totalMs / stepMs);

  function tickLoader() {
    pct = Math.min(100, pct + increment + (Math.random() * increment * 0.4));
    const rounded = Math.floor(pct);
    loadingFill.style.width = rounded + '%';
    loadingPct.textContent  = rounded + '%';
    progressBar.setAttribute('aria-valuenow', rounded);

    if (pct < 100) {
      setTimeout(tickLoader, stepMs);
    } else {
      loadingFill.style.width = '100%';
      loadingPct.textContent  = '100%';
      // Brief pause at 100% then open the app
      setTimeout(enterApp, 420);
    }
  }

  // Start the loader after the CSS fade-in animation completes (1.8s delay)
  setTimeout(tickLoader, 1850);


  /* ======================
     DATE IN TOPBAR
  ====================== */
  const topbarDate = document.getElementById('topbarDate');
  const now = new Date();
  topbarDate.textContent = now.toLocaleDateString('en-US', { weekday:'short', year:'numeric', month:'short', day:'numeric' });


  /* ======================
     COMPANY DETAILS
  ====================== */
  const KYA_COMPANY_KEY = 'kya_company_details';
  const COMPANY_AVATAR_PRESETS = {
    'blue-green': 'linear-gradient(135deg, #2563eb, #059669)',
    'indigo-purple': 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    'rose-red': 'linear-gradient(135deg, #e11d48, #be123c)',
    'amber-orange': 'linear-gradient(135deg, #f59e0b, #d97706)',
    'emerald-teal': 'linear-gradient(135deg, #10b981, #047857)',
    'dark-slate': 'linear-gradient(135deg, #475569, #1e293b)'
  };

  function getCompanyDetails() {
    try {
      return JSON.parse(localStorage.getItem(KYA_COMPANY_KEY)) || {};
    } catch { return {}; }
  }

  function saveCompanyDetails(data) {
    localStorage.setItem(KYA_COMPANY_KEY, JSON.stringify(data));
  }

  function getCompanyInitials(name) {
    if (!name) return 'KY';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  function updateSidebarCompany() {
    const co = getCompanyDetails();
    const displayName = co.displayName || co.name || 'Your Company';

    const avatarEl = document.getElementById('sidebarCompanyAvatar');
    const nameEl   = document.getElementById('sidebarCompanyName');

    if (avatarEl) {
      if (co.iconImage) {
        avatarEl.textContent = '';
        avatarEl.style.backgroundImage = `url(${co.iconImage})`;
        avatarEl.style.backgroundSize = 'cover';
        avatarEl.style.backgroundPosition = 'center';
      } else {
        const text = co.iconText || getCompanyInitials(co.name || displayName);
        const bgPreset = co.iconColor || 'blue-green';
        const bgStyle = COMPANY_AVATAR_PRESETS[bgPreset] || COMPANY_AVATAR_PRESETS['blue-green'];
        avatarEl.textContent = text;
        avatarEl.style.backgroundImage = 'none';
        avatarEl.style.background = bgStyle;
      }
    }
    if (nameEl)   nameEl.textContent   = displayName;
  }

  function openCompanyModal() {
    document.getElementById('kyaCompanyOverlay')?.remove();
    const co = getCompanyDetails();

    const overlay = document.createElement('div');
    overlay.id = 'kyaCompanyOverlay';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:10010;
      background:rgba(15,23,42,.55);backdrop-filter:blur(6px);
      display:flex;align-items:center;justify-content:center;
      font-family:Inter,sans-serif;animation:jePopIn .18s cubic-bezier(.34,1.3,.64,1);
    `;
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:20px;padding:32px 32px 28px;max-width:440px;width:92%;
                  box-shadow:0 30px 70px rgba(0,0,0,.22);position:relative;box-sizing:border-box;">
        <button id="kyaCompanyClose" style="position:absolute;top:16px;right:16px;border:none;background:none;
          font-size:22px;color:#94a3b8;cursor:pointer;line-height:1;width:32px;height:32px;
          border-radius:50%;display:flex;align-items:center;justify-content:center;transition:all .15s;">×</button>

        <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px;">
          <div style="width:48px;height:48px;border-radius:13px;background:linear-gradient(135deg,#2563eb,#059669);
                      display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#fff;flex-shrink:0;" id="kyaCompanyModalAvatar">
            ${getCompanyInitials(co.name)}
          </div>
          <div>
            <div style="font-size:17px;font-weight:800;color:#0f172a;letter-spacing:-.3px;">Company Details</div>
            <div style="font-size:12.5px;color:#64748b;margin-top:2px;">Your business information</div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:14px;">
          <div>
            <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;display:block;margin-bottom:5px;">Company / Firm Name *</label>
            <input id="kyaCoName" placeholder="e.g. Acme Enterprises Pvt Ltd" value="${ohEsc(co.name || '')}"
              style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 13px;
                     font-size:13.5px;font-weight:600;color:#0f172a;outline:none;box-sizing:border-box;
                     font-family:Inter,sans-serif;transition:border-color .18s;">
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;display:block;margin-bottom:5px;">GSTIN / Tax ID</label>
            <input id="kyaCoGstin" placeholder="e.g. 22AAAAA0000A1Z5" value="${ohEsc(co.gstin || '')}"
              style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 13px;
                     font-size:13.5px;font-weight:500;color:#334155;outline:none;box-sizing:border-box;
                     font-family:Inter,sans-serif;transition:border-color .18s;letter-spacing:.04em;">
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;display:block;margin-bottom:5px;">Business Address</label>
            <textarea id="kyaCoAddress" placeholder="Street, City, State, PIN" rows="2"
              style="width:100%;border:1.5px solid #e2e8f0;border-radius:9px;padding:10px 13px;
                     font-size:13px;font-weight:500;color:#334155;outline:none;resize:vertical;
                     box-sizing:border-box;font-family:Inter,sans-serif;transition:border-color .18s;">${ohEsc(co.address || '')}</textarea>
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;display:block;margin-bottom:5px;">Phone</label>
            <input id="kyaCoPhone" placeholder="e.g. +91 98765 43210" value="${ohEsc(co.phone || '')}"
              style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 13px;
                     font-size:13.5px;font-weight:500;color:#334155;outline:none;box-sizing:border-box;
                     font-family:Inter,sans-serif;transition:border-color .18s;">
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;display:block;margin-bottom:5px;">Email</label>
            <input id="kyaCoEmail" type="email" placeholder="e.g. accounts@company.com" value="${ohEsc(co.email || '')}"
              style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 13px;
                     font-size:13.5px;font-weight:500;color:#334155;outline:none;box-sizing:border-box;
                     font-family:Inter,sans-serif;transition:border-color .18s;">
          </div>
        </div>

        <div style="display:flex;gap:10px;margin-top:22px;">
          <button id="kyaCompanySave" style="flex:1;height:42px;border:none;border-radius:11px;
            background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-size:13.5px;font-weight:700;
            cursor:pointer;font-family:Inter,sans-serif;box-shadow:0 4px 14px rgba(37,99,235,.3);transition:filter .15s;">
            Save Details
          </button>
          <button id="kyaCompanyCancel" style="flex:0 0 90px;height:42px;border:1.5px solid #e2e8f0;border-radius:11px;
            background:#fff;color:#475569;font-size:13px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;transition:background .15s;">
            Cancel
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Focus border effect on inputs
    overlay.querySelectorAll('input, textarea').forEach(inp => {
      inp.addEventListener('focus', () => inp.style.borderColor = '#3b82f6');
      inp.addEventListener('blur',  () => inp.style.borderColor = '#e2e8f0');
    });

    // Update avatar preview while typing name
    const nameInp = overlay.querySelector('#kyaCoName');
    const modalAvatar = overlay.querySelector('#kyaCompanyModalAvatar');
    nameInp.addEventListener('input', () => {
      modalAvatar.textContent = getCompanyInitials(nameInp.value);
    });

    const close = () => overlay.remove();
    overlay.querySelector('#kyaCompanyClose').addEventListener('click', close);
    overlay.querySelector('#kyaCompanyCancel').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    overlay.querySelector('#kyaCompanySave').addEventListener('click', () => {
      const name = nameInp.value.trim();
      if (!name) {
        nameInp.style.borderColor = '#ef4444';
        nameInp.focus();
        showToast('Please enter a company name.', 'warning');
        return;
      }
      saveCompanyDetails({
        name,
        gstin:   overlay.querySelector('#kyaCoGstin').value.trim(),
        address: overlay.querySelector('#kyaCoAddress').value.trim(),
        phone:   overlay.querySelector('#kyaCoPhone').value.trim(),
        email:   overlay.querySelector('#kyaCoEmail').value.trim(),
      });
      updateSidebarCompany();
      showToast(`Company details saved for "${name}".`, 'success');
      close();
    });

    setTimeout(() => nameInp.focus(), 60);
  }

  // Wire company card — navigate to full panel
  document.getElementById('sidebarCompanyCard')?.addEventListener('click', () => openTab('company'));
  document.getElementById('sidebarCompanyCard')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTab('company'); }
  });

  // Initialise sidebar with saved company
  updateSidebarCompany();


  /* ======================
     NAVIGATION
  ====================== */
  const navItems        = document.querySelectorAll('.nav-item');
  const panelWelcome    = document.getElementById('panel-welcome');
  const panelJournal    = document.getElementById('panel-journal');
  const panelChart      = document.getElementById('panel-chart');
  const panelBalance    = document.getElementById('panel-balance');
  const panelPnl        = document.getElementById('panel-pnl');
  const panelTrial      = document.getElementById('panel-trial');
  const panelOneHub     = document.getElementById('panel-onehub');
  const panelSettings   = document.getElementById('panel-settings');
  const qsJournal       = document.getElementById('qs-journal');

  const panels = {
    welcome: panelWelcome,
    journal: panelJournal,
    voucher_desk: document.getElementById('panel-voucher-desk'),
    chart:   panelChart,
    balance: panelBalance,
    pnl:     panelPnl,
    trial:   panelTrial,
    onehub:  panelOneHub,
    settings: panelSettings,
    sales_voucher: document.getElementById('panel-sales-voucher'),
    company: document.getElementById('panel-company'),
    cashline: document.getElementById('panel-cashline'),
  };

  const TAB_DEFS = {
    journal: { 
      id: 'journal', 
      label: 'New Journal Entry', 
      panelId: 'panel-journal', 
      navId: 'nav-journal',
      icon: `<svg viewBox="0 0 20 20" fill="none" width="16" height="16" style="display:block;"><rect x="3" y="2" width="13" height="16" rx="2" stroke="currentColor" stroke-width="1.6"/><rect x="3" y="2" width="4" height="16" rx="1.5" stroke="currentColor" stroke-width="1.4" fill="none"/><line x1="9.5" y1="7" x2="14" y2="7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="9.5" y1="10" x2="14" y2="10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><line x1="9.5" y1="13" x2="12" y2="13" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`
    },
    voucher_desk: { 
      id: 'voucher_desk', 
      label: 'Voucher Desk', 
      panelId: 'panel-voucher-desk', 
      navId: 'nav-voucher-desk',
      icon: `<svg viewBox="0 0 20 20" fill="none" width="16" height="16" style="display:block;"><rect x="3" y="4" width="14" height="12" rx="1.5" stroke="currentColor" stroke-width="1.6"/><line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" stroke-width="1.6"/><path d="M7 10v2a1 1 0 001 1h4a1 1 0 001-1v-2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    },
    chart:   { 
      id: 'chart',   
      label: 'Chart of Accounts', 
      panelId: 'panel-chart',   
      navId: 'nav-chart',
      icon: `<svg viewBox="0 0 20 20" fill="none" width="16" height="16" style="display:block;"><rect x="2" y="7" width="5" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="3" width="5" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="13" width="5" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="M7 9h3M10 9V5h3M10 9v6h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
    },
    balance: { 
      id: 'balance', 
      label: 'Balance Sheet',    
      panelId: 'panel-balance', 
      navId: 'nav-balance',
      icon: `<svg viewBox="0 0 20 20" fill="none" width="16" height="16" style="display:block;"><rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><line x1="2" y1="8" x2="18" y2="8" stroke="currentColor" stroke-width="1.4"/><line x1="10" y1="8" x2="10" y2="17" stroke="currentColor" stroke-width="1.4"/></svg>`
    },
    pnl:     { 
      id: 'pnl',     
      label: 'Profit & Loss',     
      panelId: 'panel-pnl',     
      navId: 'nav-pnl',
      icon: `<svg viewBox="0 0 20 20" fill="none" width="16" height="16" style="display:block;"><path d="M3 14l4-5 3 3 4-6 3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    },
    trial:   { 
      id: 'trial',   
      label: 'Trial Balance',     
      panelId: 'panel-trial',   
      navId: 'nav-trial',
      icon: `<svg viewBox="0 0 20 20" fill="none" width="16" height="16" style="display:block;"><path d="M10 3v14M6 10l4-7 4 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 17h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`
    },
    onehub:  { 
      id: 'onehub',  
      label: 'KeepOne',           
      panelId: 'panel-onehub',  
      navId: 'nav-onehub',
      icon: `<svg viewBox="0 0 20 20" fill="none" width="16" height="16" style="display:block;"><circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.6"/><path d="M10 2a8 8 0 100 16A8 8 0 0010 2z" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2.5 2.5"/><path d="M10 6v8M6 10h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`
    },
    settings: { 
      id: 'settings', 
      label: 'Settings',        
      panelId: 'panel-settings', 
      navId: 'nav-settings',
      icon: `<svg viewBox="0 0 20 20" fill="none" width="16" height="16" style="display:block;"><circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
    },
    sales_voucher: { 
      id: 'sales_voucher', 
      label: 'New Invoice', 
      panelId: 'panel-sales-voucher', 
      navId: 'nav-sales',
      icon: `<svg viewBox="0 0 20 20" fill="none" width="16" height="16" style="display:block;"><path d="M3 3h2l.4 2M5.4 5h11.6l-1.3 7H6.2L4.5 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="16" r="1.5" fill="currentColor"/><circle cx="14" cy="16" r="1.5" fill="currentColor"/></svg>`
    },
    company: {
      id: 'company',
      label: 'Company Details',
      panelId: 'panel-company',
      navId: 'sidebarCompanyCard',
      icon: `<svg viewBox="0 0 20 20" fill="none" width="16" height="16" style="display:block;"><rect x="2" y="7" width="16" height="11" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M6 7V5a4 4 0 018 0v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
    },
    cashline: {
      id: 'cashline',
      label: 'Cashline',
      panelId: 'panel-cashline',
      navId: 'nav-cashline',
      icon: `<svg viewBox="0 0 20 20" fill="none" width="16" height="16" style="display:block;"><rect x="2" y="5" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.6"/><circle cx="10" cy="11" r="2.5" stroke="currentColor" stroke-width="1.6"/><path d="M2 9h16" stroke="currentColor" stroke-width="1.6"/></svg>`
    },
  };

  let openTabs = [];
  let activeTabId = null;

  // ── ROUTING SYSTEM ──────────────────────────────────────────────────
  const ROUTE_SECTIONS = {
    dashboard: { tabId: null, navId: 'nav-dashboard' },
    journal:   { tabId: 'journal' },
    voucher_desk: { tabId: 'voucher_desk' },
    chart:     { tabId: 'chart' },
    balance:   { tabId: 'balance' },
    pnl:       { tabId: 'pnl' },
    trial:     { tabId: 'trial' },
    onehub:    { tabId: 'onehub' },
    settings:  { tabId: 'settings' },
    sales_voucher: { tabId: 'sales_voucher' },
    company:   { tabId: 'company' },
    cashline:  { tabId: 'cashline' },
  };

  const NAV_ID_TO_ROUTE = {
    'nav-dashboard': 'dashboard',
    'nav-voucher-desk': 'voucher_desk',
    'nav-chart': 'chart',
    'nav-trial': 'trial',
    'nav-pnl': 'pnl',
    'nav-balance': 'balance',
    'nav-onehub': 'onehub',
    'nav-settings': 'settings',
    'nav-journal': 'journal',
    'nav-sales': 'sales_voucher',
    'nav-cashline': 'cashline',
  };

  let currentActiveRoute = null;

  function navigateTo(sectionId) {
    let target = sectionId;
    if (target === 'ledger') {
      _coaActiveTab = 'ledger';
      target = 'chart';
    }

    if (!ROUTE_SECTIONS[target]) {
      target = 'dashboard';
    }

    if (currentActiveRoute === target) {
      if (window.location.hash !== '#' + target) {
        window.location.hash = '#' + target;
      }
      return;
    }

    currentActiveRoute = target;

    if (window.location.hash !== '#' + target) {
      window.location.hash = '#' + target;
    }

    const route = ROUTE_SECTIONS[target];
    if (route.tabId !== undefined && route.tabId !== null) {
      openTabUI(route.tabId);
    } else {
      activeTabId = null;
      renderTabs();
      switchToActivePanel();
      
      if (route.navId) {
        navItems.forEach(n => n.classList.remove('active'));
        const navEl = document.getElementById(route.navId);
        if (navEl) navEl.classList.add('active');
      }
    }
  }

  function openTab(tabId) {
    navigateTo(tabId);
  }

  function openTabUI(tabId) {
    if (!TAB_DEFS[tabId]) return;
    if (!openTabs.includes(tabId)) {
      openTabs.push(tabId);
    }
    activeTabId = tabId;
    renderTabs();
    switchToActivePanel();
  }

  function closeTab(tabId, event) {
    if (event) event.stopPropagation();
    const index = openTabs.indexOf(tabId);
    if (index === -1) return;
    
    openTabs.splice(index, 1);
    
    let nextActiveTabId = activeTabId;
    if (activeTabId === tabId) {
      if (openTabs.length > 0) {
        const nextActiveIndex = Math.min(index, openTabs.length - 1);
        nextActiveTabId = openTabs[nextActiveIndex];
      } else {
        nextActiveTabId = null;
      }
    }
    
    if (nextActiveTabId !== activeTabId) {
      if (nextActiveTabId) {
        navigateTo(nextActiveTabId);
      } else {
        navigateTo('dashboard');
      }
    } else {
      renderTabs();
      switchToActivePanel();
    }
  }

  function switchToActivePanel() {
    // Hide all panels
    Object.values(panels).forEach(el => {
      el.style.display = 'none';
      el.classList.remove('active');
    });

    // Deactivate all sidebar items
    navItems.forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.nav-sub-item').forEach(s => s.classList.remove('active'));

    if (activeTabId) {
      const def = TAB_DEFS[activeTabId];
      const panelEl = document.getElementById(def.panelId);
      if (panelEl) {
        panelEl.style.display = '';
        panelEl.classList.add('active');
        panelEl.style.animation = 'none';
        panelEl.offsetHeight;
        panelEl.style.animation = '';
      }

      // Load panel specific data
      if (activeTabId === 'journal') populateJeDepartments();
      if (activeTabId === 'voucher_desk') renderVoucherDeskPanel();
      if (activeTabId === 'chart') switchCoaTab(_coaActiveTab);
      if (activeTabId === 'balance') renderBalanceSheetPanel();
      if (activeTabId === 'pnl') renderPnlPanel();
      if (activeTabId === 'trial') renderTrialBalancePanel();
      if (activeTabId === 'onehub') renderOneHubPanel();
      if (activeTabId === 'settings') renderSettingsPanel();
      if (activeTabId === 'sales_voucher') initSalesForm();
      if (activeTabId === 'company') renderCompanyPanel();
      if (activeTabId === 'cashline') renderCashlinePanel();

      // Highlight sidebar nav item
      const navEl = document.getElementById(def.navId);
      if (navEl) navEl.classList.add('active');
      // Also highlight the company card specifically
      if (activeTabId === 'company') {
        document.getElementById('sidebarCompanyCard')?.classList.add('active');
      }

    } else {
      // Show Dashboard (welcome panel)
      panelWelcome.style.display = '';
      panelWelcome.classList.add('active');
      document.getElementById('nav-dashboard').classList.add('active');
    }
  }

  function renderTabs() {
    const tabsContainer = document.getElementById('topbarTabs');
    if (!tabsContainer) return;
    
    // Update Home button active state
    const homeBtn = document.getElementById('breadcrumbHome');
    if (homeBtn) {
      if (activeTabId === null) {
        homeBtn.classList.add('active');
      } else {
        homeBtn.classList.remove('active');
      }
    }

    if (openTabs.length === 0) {
      tabsContainer.innerHTML = '';
      return;
    }
    
    tabsContainer.innerHTML = openTabs.map(tabId => {
      const def = TAB_DEFS[tabId];
      const isActive = tabId === activeTabId;
      return `
        <div class="topbar-tab ${isActive ? 'active' : ''}" data-tab-id="${tabId}" role="tab" aria-selected="${isActive}" title="${def.label}" draggable="true">
          <span class="tab-label">${def.icon}</span>
          <button class="tab-close" data-tab-close="${tabId}" aria-label="Close tab">×</button>
        </div>
      `;
    }).join('');
    
    // Add event listeners
    tabsContainer.querySelectorAll('.topbar-tab').forEach(tabEl => {
      const tabId = tabEl.dataset.tabId;
      
      // Click handlers
      tabEl.addEventListener('click', (e) => {
        // Prevent action if clicking the close button or dragging
        if (e.target.closest('.tab-close') || tabEl.classList.contains('dragging')) return;
        openTab(tabId);
      });
      
      const closeEl = tabEl.querySelector('.tab-close');
      closeEl.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(tabId, e);
      });

      // Drag & Drop reordering
      tabEl.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', tabId);
        // Delay adding class slightly so the drag ghost image is unaffected
        setTimeout(() => tabEl.classList.add('dragging'), 0);
      });

      tabEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggingEl = tabsContainer.querySelector('.dragging');
        if (!draggingEl || draggingEl === tabEl) return;

        const rect = tabEl.getBoundingClientRect();
        const midpoint = rect.left + rect.width / 2;
        if (e.clientX < midpoint) {
          tabsContainer.insertBefore(draggingEl, tabEl);
        } else {
          tabsContainer.insertBefore(draggingEl, tabEl.nextSibling);
        }
      });

      tabEl.addEventListener('drop', (e) => {
        e.preventDefault();
        
        // Rebuild openTabs based on current DOM order in tabsContainer
        const newOrder = [];
        tabsContainer.querySelectorAll('.topbar-tab').forEach(el => {
          newOrder.push(el.dataset.tabId);
        });
        openTabs = newOrder;
        
        triggerAutoBackup();
      });

      tabEl.addEventListener('dragend', () => {
        tabEl.classList.remove('dragging');
        renderTabs(); // Redraw tabs to ensure consistent visual state
      });
    });
  }

  // Setup click handlers for all sidebar items mapping to routes
  Object.entries(NAV_ID_TO_ROUTE).forEach(([navId, route]) => {
    const el = document.getElementById(navId);
    if (el) {
      const handler = (e) => {
        if (e) e.preventDefault();
        if (route === 'chart') {
          _coaActiveTab = 'overview';
        }
        window.location.hash = '#' + route;
      };
      el.addEventListener('click', handler);
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          handler(e);
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const items = Array.from(navItems);
          const currentIndex = items.indexOf(el);
          if (currentIndex !== -1) {
            let nextIndex;
            if (e.key === 'ArrowDown') {
              nextIndex = (currentIndex + 1) % items.length;
            } else {
              nextIndex = (currentIndex - 1 + items.length) % items.length;
            }
            const nextEl = items[nextIndex];
            if (nextEl) {
              nextEl.focus();
              nextEl.click();
            }
          }
        }
      });
    }
  });

  // Chart of Accounts header buttons
  const btnCoaOverview = document.getElementById('btnCoaOverview');
  if (btnCoaOverview) {
    btnCoaOverview.addEventListener('click', (e) => {
      e.preventDefault();
      switchCoaTab('overview');
    });
  }
  const btnCoaLedger = document.getElementById('btnCoaLedger');
  if (btnCoaLedger) {
    btnCoaLedger.addEventListener('click', (e) => {
      e.preventDefault();
      switchCoaTab('ledger');
    });
  }

  // Quick-start card → journal (New Entry)
  if (qsJournal) {
    qsJournal.addEventListener('click', () => {
      window.location.hash = '#journal';
    });
    qsJournal.addEventListener('keydown', e => {
      if (e.key === 'Enter') qsJournal.click();
    });
  }

  const qsLedgers = document.getElementById('qs-ledgers');
  if (qsLedgers) {
    qsLedgers.addEventListener('click', () => {
      _coaActiveTab = 'ledger';
      window.location.hash = '#chart';
    });
    qsLedgers.addEventListener('keydown', e => {
      if (e.key === 'Enter') qsLedgers.click();
    });
  }

  const qsPnl = document.getElementById('qs-pnl');
  if (qsPnl) {
    qsPnl.addEventListener('click', () => {
      window.location.hash = '#pnl';
    });
    qsPnl.addEventListener('keydown', e => {
      if (e.key === 'Enter') qsPnl.click();
    });
  }

  // Home link (KYA breadcrumb label) click handler
  document.getElementById('breadcrumbHome')?.addEventListener('click', (e) => {
    if (e.detail === 3) {
      openTabs = [];
      activeTabId = null;
      renderTabs();
      switchToActivePanel();
      showToast('All tabs closed.', 'success');
    }
    window.location.hash = '#dashboard';
  });

  // Handle browser back/forward and hash changes
  window.addEventListener('hashchange', () => {
    const sectionId = window.location.hash.substring(1);
    navigateTo(sectionId);
  });

  // Initialise routing based on current URL hash
  const initialSection = window.location.hash.substring(1) || 'dashboard';
  navigateTo(initialSection);

  // Keyboard shortcut: Ctrl + Space to switch to the next open tab (event-capturing phase to avoid conflicts)
  window.addEventListener('keydown', e => {
    if (e.ctrlKey && (e.key === ' ' || e.code === 'Space' || e.keyCode === 32)) {
      if (openTabs.length === 0) return;
      e.preventDefault();
      e.stopPropagation();
      
      let nextTabId;
      if (activeTabId === null) {
        nextTabId = openTabs[0];
      } else {
        const currentIndex = openTabs.indexOf(activeTabId);
        if (currentIndex === -1) {
          nextTabId = openTabs[0];
        } else {
          const nextIndex = (currentIndex + 1) % openTabs.length;
          nextTabId = openTabs[nextIndex];
        }
      }
      openTab(nextTabId);
    }
  }, true);

  // --- Keyboard Shortcuts (Space + Key) ---
  let isSpacePressed = false;
  window.addEventListener('keydown', e => {
    if (e.key === ' ' || e.code === 'Space' || e.keyCode === 32) {
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable ||
        activeEl.tagName === 'SELECT'
      )) {
        return;
      }
      isSpacePressed = true;
    }
  }, true);

  window.addEventListener('keyup', e => {
    if (e.key === ' ' || e.code === 'Space' || e.keyCode === 32) {
      isSpacePressed = false;
    }
  }, true);

  window.addEventListener('blur', () => {
    isSpacePressed = false;
  });

  window.addEventListener('keydown', e => {
    if (isSpacePressed) {
      const activeEl = document.activeElement;
      if (activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable ||
        activeEl.tagName === 'SELECT'
      )) {
        return;
      }

      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        e.stopPropagation();
        openTabs = [];
        activeTabId = null;
        renderTabs();
        switchToActivePanel();
        window.location.hash = '#dashboard';
        showToast('All tabs closed.', 'success');
        return;
      }

      const key = e.key.toLowerCase();
      const shortcutMap = {
        's': 'sales_voucher',
        'j': 'journal',
        'v': 'voucher_desk',
        'c': 'chart',
        't': 'trial',
        'p': 'pnl',
        'b': 'balance',
        'k': 'onehub',
        'd': 'dashboard',
        'e': 'settings',
        'u': 'vault'
      };

      if (shortcutMap[key]) {
        e.preventDefault();
        e.stopPropagation();
        
        const route = shortcutMap[key];
        if (route === 'vault') {
          if (typeof _settingsActiveTab !== 'undefined') {
            _settingsActiveTab = 'vault';
          } else {
            window._settingsActiveTab = 'vault';
          }
          navigateTo('settings');
        } else {
          navigateTo(route);
        }
      }
    }
  }, true);

  // --- Help Button Overlay ---
  function showHelpModal() {
    const existing = document.getElementById('kyaHelpOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'kyaHelpOverlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const card = document.createElement('div');
    card.id = 'kyaHelpCard';
    card.style.cssText = `
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      width: 480px;
      max-width: 90%;
      padding: 28px;
      position: relative;
      animation: kyaHelpPopIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    if (!document.getElementById('kyaHelpAnimStyles')) {
      const styles = document.createElement('style');
      styles.id = 'kyaHelpAnimStyles';
      styles.textContent = `
        @keyframes kyaHelpPopIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(styles);
    }

    card.innerHTML = `
      <button id="kyaHelpCloseBtn" style="
        position: absolute;
        top: 20px;
        right: 20px;
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 24px;
        cursor: pointer;
        line-height: 1;
        padding: 4px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.15s, background-color 0.15s;
      " aria-label="Close help modal">×</button>
      
      <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #1e293b; font-weight: 700; display: flex; align-items: center; gap: 8px;">
        <svg viewBox="0 0 20 20" fill="none" width="20" height="20" style="color: #2563eb;">
          <circle cx="10" cy="10" r="8.5" stroke="currentColor" stroke-width="1.6"/>
          <path d="M9 9.5a1.5 1.5 0 112 1.3c-.4.3-1 .8-1 1.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <circle cx="10" cy="15" r="0.75" fill="currentColor"/>
        </svg>
        Keyboard Shortcuts Help
      </h3>
      <p style="margin: 0 0 20px 0; font-size: 13.5px; color: #64748b; line-height: 1.5;">
        You can navigate instantly to any module by holding the <strong style="color: #0f172a;">Spacebar</strong> and pressing the corresponding key below:
      </p>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
          <span style="font-size: 13px; color: #475569; font-weight: 500;">Dashboard</span>
          <kbd style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 6px; font-family: monospace; font-size: 11px; font-weight: bold; color: #0f172a;">Space + D</kbd>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
          <span style="font-size: 13px; color: #475569; font-weight: 500;">Sales Voucher</span>
          <kbd style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 6px; font-family: monospace; font-size: 11px; font-weight: bold; color: #0f172a;">Space + S</kbd>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
          <span style="font-size: 13px; color: #475569; font-weight: 500;">Journal Entry</span>
          <kbd style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 6px; font-family: monospace; font-size: 11px; font-weight: bold; color: #0f172a;">Space + J</kbd>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
          <span style="font-size: 13px; color: #475569; font-weight: 500;">Voucher Desk</span>
          <kbd style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 6px; font-family: monospace; font-size: 11px; font-weight: bold; color: #0f172a;">Space + V</kbd>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
          <span style="font-size: 13px; color: #475569; font-weight: 500;">Chart of Acc.</span>
          <kbd style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 6px; font-family: monospace; font-size: 11px; font-weight: bold; color: #0f172a;">Space + C</kbd>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
          <span style="font-size: 13px; color: #475569; font-weight: 500;">Trial Balance</span>
          <kbd style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 6px; font-family: monospace; font-size: 11px; font-weight: bold; color: #0f172a;">Space + T</kbd>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
          <span style="font-size: 13px; color: #475569; font-weight: 500;">Profit & Loss</span>
          <kbd style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 6px; font-family: monospace; font-size: 11px; font-weight: bold; color: #0f172a;">Space + P</kbd>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
          <span style="font-size: 13px; color: #475569; font-weight: 500;">Balance Sheet</span>
          <kbd style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 6px; font-family: monospace; font-size: 11px; font-weight: bold; color: #0f172a;">Space + B</kbd>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
          <span style="font-size: 13px; color: #475569; font-weight: 500;">KeepOne</span>
          <kbd style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 6px; font-family: monospace; font-size: 11px; font-weight: bold; color: #0f172a;">Space + K</kbd>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
          <span style="font-size: 13px; color: #475569; font-weight: 500;">Settings</span>
          <kbd style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 6px; font-family: monospace; font-size: 11px; font-weight: bold; color: #0f172a;">Space + E</kbd>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
          <span style="font-size: 13px; color: #475569; font-weight: 500;">Vault Backups</span>
          <kbd style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 6px; font-family: monospace; font-size: 11px; font-weight: bold; color: #0f172a;">Space + U</kbd>
        </div>
      </div>

      <div style="background: #eff6ff; border-radius: 8px; padding: 12px; font-size: 12.5px; color: #1e3a8a; line-height: 1.5; border: 1px dashed #bfdbfe;">
        <strong>Other Keyboard Shortcuts:</strong><br/>
        • <strong>ArrowUp / ArrowDown</strong>: Navigate focused sidebar item<br/>
        • <strong>Space + Esc</strong>: Close all opened tabs instantly<br/>
        • <strong>Ctrl + Space</strong>: Switch to next open tab
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const closeBtn = card.querySelector('#kyaHelpCloseBtn');
    closeBtn.addEventListener('mouseenter', () => { closeBtn.style.color = '#475569'; closeBtn.style.backgroundColor = '#f1f5f9'; });
    closeBtn.addEventListener('mouseleave', () => { closeBtn.style.color = '#94a3b8'; closeBtn.style.backgroundColor = 'transparent'; });
    
    const closeHelp = () => overlay.remove();
    closeBtn.addEventListener('click', closeHelp);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeHelp(); });
    
    const handleKey = e => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        window.removeEventListener('keydown', handleKey);
        closeHelp();
      }
    };
    window.addEventListener('keydown', handleKey);
  }

  // Wire up help button
  const btnHelp = document.querySelector('[aria-label="Help"]');
  if (btnHelp) {
    btnHelp.addEventListener('click', e => {
      e.preventDefault();
      showHelpModal();
    });
  }


  /* ======================
     JOURNAL ENTRY FORM
  ====================== */

  // ── Ledger accounts list is dynamically loaded from Chart of Accounts (coaLedgers) ──


  // ── State ─────────────────────────────────────────────────────────
  let jeRows    = [];   // array of row objects {id, type, particular, debit, credit}
  let jeCounter = 1;   // auto-increment row id
  let jvCounter = 1;   // voucher number counter

  // ── Helpers ───────────────────────────────────────────────────────
