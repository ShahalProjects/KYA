  function refreshAllActivePanels() {
    if (activeTabId === 'posted') renderPostedPanel();
    if (activeTabId === 'drafted') renderDraftedPanel();
    if (activeTabId === 'chart') {
      if (_coaActiveTab === 'overview') renderChartPanel();
      else renderLedgerPanel();
    }
    if (activeTabId === 'balance') renderBalanceSheetPanel();
    if (activeTabId === 'pnl') renderPnlPanel();
    if (activeTabId === 'trial') renderTrialBalancePanel();
    if (activeTabId === 'onehub') renderOneHubPanel();
  }

  function performRestore(jsonStr, quiet = false) {
    try {
      const data = JSON.parse(jsonStr);
      
      // Restore Core KYA Data
      if (Array.isArray(data.coaLedgers) && data.coaLedgers.length > 0) coaLedgers = data.coaLedgers;
      else {
        coaLedgers = [];
        initDefaultLedgers();
      }

      if (Array.isArray(data.postedEntries)) {
        postedEntries = data.postedEntries.filter(e => {
          if (!e) return false;
          if (e.preparedBy === 'Sales Module') return false;
          const no = e.voucherNo || '';
          if (no.startsWith('SV-') || no.startsWith('SR-') || no.startsWith('SO-') || no.startsWith('RF-')) return false;
          return true;
        });
      } else {
        postedEntries = [];
      }

      if (Array.isArray(data.draftedEntries)) draftedEntries = data.draftedEntries;
      else draftedEntries = [];

      if (typeof data.jvCounter === 'number') jvCounter = data.jvCounter;
      else jvCounter = 1;

      // Restore KeepOne Data
      if (Array.isArray(data.ohDepartments)) ohDepartments = data.ohDepartments;
      else ohDepartments = [];
      populateJeDepartments();

      if (Array.isArray(data.ohEmployees)) ohEmployees = data.ohEmployees;
      else ohEmployees = [];

      if (Array.isArray(data.ohBudgets)) {
        ohBudgets = data.ohBudgets.map(b => {
          if (b.deptId !== undefined && b.deptIds === undefined) {
            b.deptIds = b.deptId;
          }
          if (b.ledgerId !== undefined && b.ledgerIds === undefined) {
            b.ledgerIds = b.ledgerId;
          }
          b.isPaused = b.isPaused === true;
          return b;
        });
      } else {
        ohBudgets = [];
      }

      if (Array.isArray(data.ohReminders)) ohReminders = data.ohReminders;
      else ohReminders = [];

      if (typeof data._ohDeptCtr === 'number') _ohDeptCtr = data._ohDeptCtr;
      else _ohDeptCtr = 1;

      if (typeof data._ohEmpCtr === 'number') _ohEmpCtr = data._ohEmpCtr;
      else _ohEmpCtr = 1;

      if (typeof data._ohBudgetCtr === 'number') _ohBudgetCtr = data._ohBudgetCtr;
      else _ohBudgetCtr = 1;

      // Restore Settings
      if (data.kyaSettings) {
        const autoToggle = document.getElementById('vaultAutoBackupToggle');
        if (autoToggle) {
          autoToggle.checked = !!data.kyaSettings.autoBackup;
          localStorage.setItem(getVaultKey('kya_auto_backup'), autoToggle.checked ? 'true' : 'false');
        }
      }

      // Restore Future extensions
      if (data.futureStore) {
        window.KYA_STORE = data.futureStore;
      } else {
        window.KYA_STORE = {};
      }
      window.KYA_STORE.salesVouchers = window.KYA_STORE.salesVouchers || [];
      window.KYA_STORE.salesVouchersDrafts = window.KYA_STORE.salesVouchersDrafts || [];
      window.KYA_STORE.salesInvoiceCtr = window.KYA_STORE.salesInvoiceCtr || 1;
      window.KYA_STORE.salesReturnCtr = window.KYA_STORE.salesReturnCtr || 1;
      window.KYA_STORE.salesOrderCtr = window.KYA_STORE.salesOrderCtr || 1;

      if (!quiet) {
        showToast('Data restored successfully.', 'success');
        updateVaultUI();
        refreshAllActivePanels();
      }
      return true;
    } catch (e) {
      console.error(e);
      if (!quiet) {
        showToast('Restore failed: ' + e.message, 'danger');
      }
      return false;
    }
  }

  function showLoadFolderDataConfirm({ folderName, onRestore, onKeep, onCancel }) {
    document.getElementById('kyaConfirmOverlay')?.remove();
    document.getElementById('kyaConfirmStyles')?.remove();

    // Create style tag to enforce exact center positioning and animation
    const styleEl = document.createElement('style');
    styleEl.id = 'kyaConfirmStyles';
    styleEl.innerHTML = `
      #kyaConfirmOverlay {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(15, 23, 42, 0.65) !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
        z-index: 10002;
        display: block !important;
      }
      .kya-confirm-card-centered {
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        background: var(--white);
        border-radius: 24px;
        box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.3);
        border: 1px solid var(--slate-100);
        text-align: center;
        font-family: var(--font-main);
        z-index: 10003;
        box-sizing: border-box;
        animation: kyaCenterPopIn 0.22s cubic-bezier(0.34, 1.3, 0.64, 1) forwards !important;
      }
      @keyframes kyaCenterPopIn {
        from { opacity: 0; transform: translate(-50%, -45%) scale(0.95) !important; }
        to   { opacity: 1; transform: translate(-50%, -50%) scale(1) !important; }
      }
    `;
    document.head.appendChild(styleEl);

    const overlay = document.createElement('div');
    overlay.id = 'kyaConfirmOverlay';
    overlay.innerHTML = `
      <div class="kya-confirm-card-centered" style="max-width: 460px; width: 90%; position: relative; padding: 40px 32px 32px;">
        <button id="kyaConfirmClose" style="position: absolute; top: 20px; right: 20px; border: none; background: none; font-size: 22px; color: var(--slate-400); cursor: pointer; line-height: 1; transition: all 0.15s ease; outline: none; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%;" onmouseover="this.style.color='var(--slate-700)'; this.style.backgroundColor='var(--slate-50)';" onmouseout="this.style.color='var(--slate-400)'; this.style.backgroundColor='transparent';">
          &times;
        </button>
        
        <div class="kya-confirm-icon" style="background: var(--blue-50); color: var(--blue-600); width: 64px; height: 64px; border-radius: 20px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 -2px 0 rgba(37,99,235,.1);">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        
        <div class="kya-confirm-title" style="font-size: 22px; font-weight: 800; color: var(--slate-900); margin-bottom: 12px; letter-spacing: -0.5px;">
          Folder Detected
        </div>
        
        <div style="font-size: 14px; color: var(--slate-500); line-height: 1.5; margin-bottom: 8px;">
          data folder was found in:
        </div>
        
        <div class="kya-folder-path-container" style="background: var(--slate-50); border: 1px solid var(--slate-200); border-radius: 12px; padding: 12px 16px; margin: 12px 0 20px; font-family: monospace; font-size: 13px; color: var(--slate-700); word-break: break-all; text-align: left; display: flex; align-items: center; gap: 10px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02); box-sizing: border-box;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0; color: var(--slate-400);">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          <span style="font-weight: 600;">${ohEsc(folderName)}</span>
        </div>
        
        <div style="font-size: 14px; color: var(--slate-600); font-weight: 500; margin-bottom: 28px;">
          Choose how you would like to continue.
        </div>
        
        <div class="kya-confirm-btns" style="display: flex; gap: 12px; justify-content: stretch; width: 100%;">
          <button class="kya-confirm-cancel" id="btnConfirmKeep" style="flex: 1; height: 46px; border: 1.5px solid var(--slate-200); border-radius: 12px; background: var(--white); font-size: 13.5px; font-weight: 600; color: var(--slate-600); cursor: pointer; transition: all 0.15s ease; display: inline-flex; align-items: center; justify-content: center; gap: 8px; box-sizing: border-box;">
            Keep Current Workspace
          </button>
          <button class="kya-confirm-ok" id="btnConfirmRestore" style="flex: 1; height: 46px; border: none; border-radius: 12px; background: var(--blue-600); font-size: 13.5px; font-weight: 700; color: var(--white); cursor: pointer; transition: all 0.15s ease; box-shadow: 0 4px 12px rgba(37,99,235,.2); display: inline-flex; align-items: center; justify-content: center; gap: 8px; box-sizing: border-box;">
            Continue with Existing Data
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    
    const close = () => {
      overlay.remove();
      document.getElementById('kyaConfirmStyles')?.remove();
    };

    const btnKeep = overlay.querySelector('#btnConfirmKeep');
    btnKeep.addEventListener('mouseenter', () => {
      btnKeep.style.background = 'var(--slate-50)';
      btnKeep.style.borderColor = 'var(--slate-300)';
    });
    btnKeep.addEventListener('mouseleave', () => {
      btnKeep.style.background = 'var(--white)';
      btnKeep.style.borderColor = 'var(--slate-200)';
    });
    btnKeep.addEventListener('click', () => {
      close();
      if (onKeep) onKeep();
    });

    const btnRestore = overlay.querySelector('#btnConfirmRestore');
    btnRestore.addEventListener('mouseenter', () => {
      btnRestore.style.background = 'var(--blue-700)';
    });
    btnRestore.addEventListener('mouseleave', () => {
      btnRestore.style.background = 'var(--blue-600)';
    });
    btnRestore.addEventListener('click', () => {
      close();
      if (onRestore) onRestore();
    });

    overlay.querySelector('#kyaConfirmClose').addEventListener('click', () => {
      close();
      if (onCancel) onCancel();
    });

    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        close();
        if (onCancel) onCancel();
      }
    });

    overlay.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        close();
        if (onCancel) onCancel();
      }
    });

    btnRestore.focus();
  }

  function showPathSwitchConfirm({ newPath, onCopy, onFresh, onCancel }) {
    document.getElementById('kyaConfirmOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'kya-confirm-overlay';
    overlay.id = 'kyaConfirmOverlay';
    overlay.innerHTML = `
      <div class="kya-confirm-card" style="max-width: 450px;">
        <div class="kya-confirm-icon" style="background:#dbeafe; color:#2563eb">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
            <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path>
          </svg>
        </div>
        <div class="kya-confirm-title">Initialize New Data Path</div>
        <div class="kya-confirm-msg">
          The path <strong>"${ohEsc(newPath)}"</strong> does not have an existing database.<br><br>
          Would you like to <strong>copy your current data</strong> to this path, or start with a <strong>fresh blank database</strong>?
        </div>
        <div class="kya-confirm-btns" style="display:flex; flex-direction:column; gap:8px; margin-top:20px;">
          <button class="btn btn-primary" id="btnConfirmCopy" style="width:100%; justify-content:center; padding:10px;">
            Copy Current Data to New Path
          </button>
          <button class="btn btn-secondary" id="btnConfirmFresh" style="width:100%; justify-content:center; padding:10px; background:#f1f5f9; color:#334155; border:1px solid var(--slate-200);">
            Start Fresh (Blank Database)
          </button>
          <button class="kya-confirm-cancel" id="btnConfirmCancel" style="width:100%; border:none; background:none; color:var(--slate-500); padding:8px; cursor:pointer; font-weight:600;">
            Cancel
          </button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    
    overlay.querySelector('#btnConfirmCopy').addEventListener('click', () => {
      close();
      onCopy();
    });
    overlay.querySelector('#btnConfirmFresh').addEventListener('click', () => {
      close();
      onFresh();
    });
    overlay.querySelector('#btnConfirmCancel').addEventListener('click', () => {
      close();
      if (onCancel) onCancel();
    });
    
    overlay.addEventListener('click', e => { if (e.target === overlay) { close(); if (onCancel) onCancel(); } });
    overlay.addEventListener('keydown', e => { if (e.key === 'Escape') { close(); if (onCancel) onCancel(); } });
  }



  async function loadKyaDataOnStartup() {
    try {
      let restored = false;
      const handle = await loadDirectoryHandle();
      if (handle) {
        _activeFolderHandle = handle;
        const hasPerm = await verifyDirectoryPermission(handle, false);
        if (hasPerm) {
          _activeFolderPermission = true;
          const jsonStr = await readDataFromDirectory(handle);
          if (jsonStr) {
            performRestore(jsonStr, true);
            restored = true;
          }
        } else {
          _activeFolderPermission = false;
          // Fallback to local storage copy
          const currentPath = getActiveVaultPath();
          const jsonStr = localStorage.getItem(getVaultKey('kya_backup_data', currentPath));
          if (jsonStr) {
            performRestore(jsonStr, true);
            restored = true;
          }
        }
      } else {
        const currentPath = getActiveVaultPath();
        const jsonStr = localStorage.getItem(getVaultKey('kya_backup_data', currentPath));
        if (jsonStr) {
          performRestore(jsonStr, true);
          restored = true;
        }
      }

      if (!restored) {
        // Fresh load, save the default initial state immediately.
        await saveKyaBackup(true);
      }

      // Migrate existing reminders from company details to KeepOne (ohReminders) if empty
      if (typeof ohReminders === 'undefined' || !Array.isArray(ohReminders) || ohReminders.length === 0) {
        const coData = getCompanyDetails();
        if (coData && Array.isArray(coData.reminders) && coData.reminders.length > 0) {
          ohReminders = [...coData.reminders];
          delete coData.reminders;
          saveCompanyDetails(coData);
          await saveKyaBackup(true); // Save migrated data to the vault
        }
      }

      updateVaultUI();
    } catch (e) {
      console.error('Error during startup load:', e);
    }
  }

  function renderCompanyPanel() {
    renderCompanyPanelOrganizer();
  }
  function renderSettingsPanel() {
    switchSettingsTab(_settingsActiveTab);

    const tabMap = {
      settingsTabVault: 'vault',
      settingsTabShortcuts: 'shortcuts',
    };
    Object.entries(tabMap).forEach(([btnId, tab]) => {
      const btn = document.getElementById(btnId);
      if (btn && !btn._settingsWired) {
        btn._settingsWired = true;
        btn.addEventListener('click', () => switchSettingsTab(tab));
      }
    });
  }

  function switchSettingsTab(tab) {
    _settingsActiveTab = tab;

    const allTabs = [
      ['settingsTabVault', 'vault'],
      ['settingsTabShortcuts', 'shortcuts'],
    ];
    const allViews = [
      ['settings-vault-view', 'vault'],
      ['settings-shortcuts-view', 'shortcuts'],
      ['settings-empty-view', ''],
    ];

    allTabs.forEach(([btnId, t]) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      const isActive = t === tab;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive);
    });
    allViews.forEach(([viewId, t]) => {
      const view = document.getElementById(viewId);
      if (view) view.style.display = t === tab ? '' : 'none';
    });

    if (tab === 'vault') {
      initVaultListeners();
      updateVaultUI();
    }
  }

  async function selectFolderWithHandle(handle) {
    const hasPerm = await verifyDirectoryPermission(handle, true);
    if (!hasPerm) {
      showToast('Permission to write to the folder is required.', 'warning');
      return;
    }
    
    _activeFolderHandle = handle;
    _activeFolderPermission = true;
    await saveDirectoryHandle(handle);

    // Check if backup already exists
    let existingData = null;
    try {
      existingData = await readDataFromDirectory(handle);
    } catch (err) {
      // file doesn't exist, which is fine
    }

    if (existingData) {
      showLoadFolderDataConfirm({
        folderName: handle.name,
        onRestore: () => {
          performRestore(existingData, false);
        },
        onKeep: () => {
          saveKyaBackup(true);
          updateVaultUI();
          showToast(`Switched to folder "${handle.name}" and saved current data.`, 'success');
        },
        onCancel: async () => {
          _activeFolderHandle = null;
          _activeFolderPermission = false;
          await clearDirectoryHandle();
          updateVaultUI();
        }
      });
    } else {
      showPathSwitchConfirm({
        newPath: `Folder: ${handle.name}`,
        onCopy: () => {
          saveKyaBackup(true);
          updateVaultUI();
          showToast(`Synced folder: ${handle.name}`, 'success');
        },
        onFresh: () => {
          clearKyaData();
          saveKyaBackup(true);
          updateVaultUI();
          refreshAllActivePanels();
          showToast(`Initialized fresh database in folder: ${handle.name}`, 'success');
        },
        onCancel: async () => {
          _activeFolderHandle = null;
          _activeFolderPermission = false;
          await clearDirectoryHandle();
          updateVaultUI();
        }
      });
    }
  }

  function initVaultListeners() {
    if (_vaultWired) return;
    _vaultWired = true;

    const autoToggle = document.getElementById('vaultAutoBackupToggle');
    if (autoToggle) {
      autoToggle.addEventListener('change', (e) => {
        localStorage.setItem(getVaultKey('kya_auto_backup'), e.target.checked ? 'true' : 'false');
        if (e.target.checked) {
          saveKyaBackup(true); // run initial backup immediately
        }
      });
    }

    const backupBtn = document.getElementById('btnVaultBackupNow');
    if (backupBtn) {
      backupBtn.addEventListener('click', () => {
        saveKyaBackup(false);
      });
    }

    const selectFolderBtn = document.getElementById('btnVaultSelectFolder');
    if (selectFolderBtn) {
      selectFolderBtn.addEventListener('click', async () => {
        if (!window.showDirectoryPicker) {
          showToast('Folder picker is not supported on this browser/platform. Please use Chrome, Edge, or another compatible browser.', 'warning');
          return;
        }
        try {
          const handle = await window.showDirectoryPicker();
          await selectFolderWithHandle(handle);
        } catch (e) {
          console.error(e);
          if (e.name !== 'AbortError') {
            showToast('Failed to select folder: ' + e.message, 'danger');
          }
        }
      });
    }

    const clearFolderBtn = document.getElementById('btnVaultClearFolder');
    if (clearFolderBtn) {
      clearFolderBtn.addEventListener('click', async () => {
        showKyaConfirm({
          title: 'Disconnect Local Folder?',
          message: 'This will stop syncing data to the physical folder. Your local files will remain intact.',
          confirmLabel: 'Disconnect',
          okBg: '#dc2626',
          onConfirm: async () => {
            _activeFolderHandle = null;
            _activeFolderPermission = false;
            await clearDirectoryHandle();
            updateVaultUI();
            showToast('Disconnected from physical folder.', 'info');
          }
        });
      });
    }

    const reauthFolderBtn = document.getElementById('btnVaultReauthFolder');
    if (reauthFolderBtn) {
      reauthFolderBtn.addEventListener('click', async () => {
        if (_activeFolderHandle) {
          const hasPerm = await verifyDirectoryPermission(_activeFolderHandle, true);
          if (hasPerm) {
            _activeFolderPermission = true;
            updateVaultUI();
            showToast('Folder access granted.', 'success');
            saveKyaBackup(true);
          } else {
            showToast('Access not granted.', 'warning');
          }
        }
      });
    }

    const restoreFolderBtn = document.getElementById('btnVaultRestoreFolder');
    if (restoreFolderBtn) {
      restoreFolderBtn.addEventListener('click', async () => {
        if (!window.showDirectoryPicker) {
          document.getElementById('vaultFallbackFileSelector')?.click();
          return;
        }
        try {
          const handle = await window.showDirectoryPicker();
          const hasPerm = await verifyDirectoryPermission(handle, true);
          if (!hasPerm) {
            showToast('Folder access required to restore.', 'warning');
            return;
          }
          const jsonStr = await readDataFromDirectory(handle);
          showKyaConfirm({
            title: 'Restore Backup from Folder?',
            message: `This will overwrite all current data and switch your active data path to "${handle.name}". Proceed?`,
            confirmLabel: 'Restore & Switch',
            okBg: '#2563eb',
            onConfirm: async () => {
              _activeFolderHandle = handle;
              _activeFolderPermission = true;
              await saveDirectoryHandle(handle);
              performRestore(jsonStr, false);
            }
          });
        } catch (e) {
          console.error(e);
          if (e.name === 'NotFoundError') {
            showToast('No backup file (kya_backup_data.json) found in the selected folder.', 'warning');
          } else if (e.name !== 'AbortError') {
            showToast('Failed to restore from folder: ' + e.message, 'danger');
          }
        }
      });
    }

    const fallbackFileSelector = document.getElementById('vaultFallbackFileSelector');
    if (fallbackFileSelector) {
      fallbackFileSelector.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          showKyaConfirm({
            title: 'Restore Backup?',
            message: 'This will overwrite all current data. Are you sure you want to proceed?',
            confirmLabel: 'Restore',
            okBg: '#2563eb',
            onConfirm: () => {
              performRestore(event.target.result, false);
            }
          });
        };
        reader.onerror = () => {
          showToast('Failed to read backup file.', 'danger');
        };
        reader.readAsText(file);
      });
    }
  }

  function updateVaultUI() {
    const activePath = getActiveVaultPath();
    const clearFolderBtn = document.getElementById('btnVaultClearFolder');
    const reauthFolderBtn = document.getElementById('btnVaultReauthFolder');
    const folderPathEl = document.getElementById('vaultBackupFolderPath');

    if (_activeFolderHandle) {
      if (folderPathEl) {
        folderPathEl.innerHTML = `Folder: <strong style="color:var(--blue-600)">${ohEsc(_activeFolderHandle.name)}</strong> (Physical File: kya_backup_data.json)`;
      }
      if (clearFolderBtn) clearFolderBtn.style.display = 'inline-flex';

      if (_activeFolderPermission) {
        if (reauthFolderBtn) reauthFolderBtn.style.display = 'none';
      } else {
        if (reauthFolderBtn) reauthFolderBtn.style.display = 'inline-flex';
      }
    } else {
      if (folderPathEl) {
        folderPathEl.innerHTML = `Virtual Storage: <strong style="color:var(--blue-600)">${ohEsc(activePath)}</strong> (LocalStorage Key: ${ohEsc(getVaultKey('kya_backup_data'))})`;
      }
      if (clearFolderBtn) clearFolderBtn.style.display = 'none';
      if (reauthFolderBtn) reauthFolderBtn.style.display = 'none';
    }

    const autoVal = localStorage.getItem(getVaultKey('kya_auto_backup', activePath)) === 'true';
    const autoToggle = document.getElementById('vaultAutoBackupToggle');
    if (autoToggle) autoToggle.checked = autoVal;

    const lastDate = localStorage.getItem(getVaultKey('kya_backup_date', activePath)) || '—';
    const lastTime = localStorage.getItem(getVaultKey('kya_backup_time', activePath)) || '—';
    const lastStatus = localStorage.getItem(getVaultKey('kya_backup_status', activePath)) || 'No Backups';
    const lastSize = localStorage.getItem(getVaultKey('kya_backup_size', activePath)) || '—';

    const lastDateEl = document.getElementById('vaultLastDate');
    const lastTimeEl = document.getElementById('vaultLastTime');
    const lastStatusEl = document.getElementById('vaultLastStatus');
    const lastSizeEl = document.getElementById('vaultBackupSize');

    if (lastDateEl) lastDateEl.textContent = lastDate;
    if (lastTimeEl) lastTimeEl.textContent = lastTime;
    if (lastSizeEl) lastSizeEl.textContent = lastSize;

    if (lastStatusEl) {
      if (lastStatus === 'Success') {
        lastStatusEl.innerHTML = '<span class="badge" style="background:#dcfce7; color:#15803d; padding:3px 8px; border-radius:20px; font-weight:700; font-size:11px">✓ Success</span>';
      } else if (lastStatus === 'Failed') {
        lastStatusEl.innerHTML = '<span class="badge" style="background:#fee2e2; color:#b91c1c; padding:3px 8px; border-radius:20px; font-weight:700; font-size:11px">✕ Failed</span>';
      } else if (lastStatus === 'Write Pending Access') {
        lastStatusEl.innerHTML = '<span class="badge" style="background:#fef3c7; color:#d97706; padding:3px 8px; border-radius:20px; font-weight:700; font-size:11px">⚠ Access Pending</span>';
      } else {
        lastStatusEl.innerHTML = `<span class="badge" style="background:#f1f5f9; color:#64748b; padding:3px 8px; border-radius:20px; font-weight:700; font-size:11px">${lastStatus}</span>`;
      }
    }
  }

  async function saveKyaBackup(isAuto = false) {
    try {
      const activePath = getActiveVaultPath();
      const backupData = {
        coaLedgers,
        postedEntries,
        draftedEntries,
        jvCounter,
        ohDepartments,
        ohEmployees,
        ohBudgets,
        ohReminders,
        _ohDeptCtr,
        _ohEmpCtr,
        _ohBudgetCtr,
        kyaSettings: {
          autoBackup: document.getElementById('vaultAutoBackupToggle')?.checked || false
        },
        futureStore: window.KYA_STORE || {}
      };

      const jsonStr = JSON.stringify(backupData);
      localStorage.setItem(getVaultKey('kya_backup_data', activePath), jsonStr);
      
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
      const sizeStr = (jsonStr.length / 1024).toFixed(2) + ' KB';

      localStorage.setItem(getVaultKey('kya_backup_date', activePath), dateStr);
      localStorage.setItem(getVaultKey('kya_backup_time', activePath), timeStr);
      localStorage.setItem(getVaultKey('kya_backup_status', activePath), 'Success');
      localStorage.setItem(getVaultKey('kya_backup_size', activePath), sizeStr);

      if (_activeFolderHandle) {
        if (_activeFolderPermission) {
          await writeDataToDirectory(_activeFolderHandle, backupData);
        } else {
          const hasPerm = await verifyDirectoryPermission(_activeFolderHandle, false);
          if (hasPerm) {
            _activeFolderPermission = true;
            await writeDataToDirectory(_activeFolderHandle, backupData);
          } else {
            console.warn("Folder write skipped: permission not granted.");
            localStorage.setItem(getVaultKey('kya_backup_status', activePath), 'Write Pending Access');
          }
        }
      }

      updateVaultUI();
      if (!isAuto) {
        showToast('Backup completed successfully.', 'success');
      }
    } catch (e) {
      console.error(e);
      localStorage.setItem(getVaultKey('kya_backup_status'), 'Failed');
      updateVaultUI();
      if (!isAuto) {
        showToast('Backup failed: ' + e.message, 'danger');
      }
    }
  }

  function restoreKyaBackup() {
    try {
      const activePath = getActiveVaultPath();
      const jsonStr = localStorage.getItem(getVaultKey('kya_backup_data', activePath));
      if (!jsonStr) {
        showToast('No backup found in Local Storage for the current path.', 'warning');
        return;
      }

      showKyaConfirm({
        title: 'Restore Backup?',
        message: 'This will overwrite all current data. Are you sure you want to proceed?',
        confirmLabel: 'Restore',
        okBg: '#2563eb',
        onConfirm: () => {
          performRestore(jsonStr, false);
        }
      });
    } catch (e) {
      console.error(e);
      showToast('Restore failed: ' + e.message, 'danger');
    }
  }

  function triggerAutoBackup() {
    const activePath = getActiveVaultPath();
    const autoVal = localStorage.getItem(getVaultKey('kya_auto_backup', activePath)) === 'true';
    if (autoVal) {
      saveKyaBackup(true);
    }
  }

  // ── Sales Voucher State & Functions ────────────────────────────────
  let currentSalesType = 'Product';
  let salesRows = [];
  let currentSalesInvoiceMode = 'Auto'; // 'Auto' | 'Manual'
  let currentSalesVoucherSubtype = 'Invoice'; // 'Invoice' | 'Return' | 'Order'

