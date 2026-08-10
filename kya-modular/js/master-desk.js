// ══════════════════════════════════════════════════════════════════
//  MASTER DESK — Central Master Control & Enterprise Workspace
// ══════════════════════════════════════════════════════════════════

(function() {
  let _masterDeskInitialized = false;
  let currentMasterDeskSubtype = 'Create';
  let currentMasterDeskTab = 'group';
  let _masterGroupAliases = [];

  function renderMasterDeskPanel() {
    const wrap = document.getElementById('panel-master-desk');
    if (!wrap) return;

    if (!_masterDeskInitialized || !wrap.children.length) {
      initMasterDesk(wrap);
      _masterDeskInitialized = true;
    } else {
      updateMasterDeskContent();
    }
  }

  function setMasterDeskSubtype(subtype) {
    currentMasterDeskSubtype = subtype;

    const btnCreate = document.getElementById('btnMasterCreate');
    const btnAlter = document.getElementById('btnMasterAlter');

    const buttonBaseStyle = "display: flex; align-items: center; gap: 6px; height: 38px; font-weight: 600; font-size: 13px; padding: 8px 14px; border-radius: 8px; cursor: pointer;";

    if (subtype === 'Create') {
      if (btnCreate) {
        btnCreate.className = 'btn btn-primary';
        btnCreate.style.cssText = buttonBaseStyle;
      }
      if (btnAlter) {
        btnAlter.className = 'btn-master-action';
        btnAlter.style.cssText = buttonBaseStyle;
      }
    } else {
      if (btnCreate) {
        btnCreate.className = 'btn-master-action';
        btnCreate.style.cssText = buttonBaseStyle;
      }
      if (btnAlter) {
        btnAlter.className = 'btn btn-primary';
        btnAlter.style.cssText = buttonBaseStyle;
      }
    }
    updateMasterDeskContent();
  }

  function setMasterDeskTab(tab) {
    currentMasterDeskTab = tab;

    const btnGroup = document.getElementById('masterTabGroup');
    const btnLedger = document.getElementById('masterTabLedger');

    if (btnGroup) {
      btnGroup.classList.toggle('active', tab === 'group');
      btnGroup.setAttribute('aria-selected', tab === 'group');
    }
    if (btnLedger) {
      btnLedger.classList.toggle('active', tab === 'ledger');
      btnLedger.setAttribute('aria-selected', tab === 'ledger');
    }
    updateMasterDeskContent();
  }

  function findDuplicateCoaNameOrAlias(term) {
    if (!term) return null;
    const q = term.trim().toLowerCase();
    if (!q) return null;

    // 1. Check in coaLedgers (Active Ledgers and Group Ledgers)
    if (typeof coaLedgers !== 'undefined' && Array.isArray(coaLedgers)) {
      for (const ldg of coaLedgers) {
        if (ldg.name && ldg.name.trim().toLowerCase() === q) {
          return { name: ldg.name, type: ldg.type === 'group-ledger' ? 'Group' : 'Ledger' };
        }
        if (Array.isArray(ldg.aliases)) {
          for (const al of ldg.aliases) {
            if (al && al.trim().toLowerCase() === q) {
              return { name: al, type: 'Alias', parentName: ldg.name };
            }
          }
        }
      }
    }

    // 2. Check in COA_SYS_SGS (Subgroups / Groups)
    if (typeof COA_SYS_SGS !== 'undefined' && Array.isArray(COA_SYS_SGS)) {
      for (const sg of COA_SYS_SGS) {
        // If it was a custom subgroup, verify it is still active in coaLedgers
        if (sg.id && sg.id.startsWith('sg-grp-')) {
          const stillActive = typeof coaLedgers !== 'undefined' && coaLedgers.some(l => l.sgId === sg.id || l.name === sg.name);
          if (!stillActive) continue;
        }

        if (sg.name && sg.name.trim().toLowerCase() === q) {
          return { name: sg.name, type: 'Group' };
        }
        if (Array.isArray(sg.aliases)) {
          for (const al of sg.aliases) {
            if (al && al.trim().toLowerCase() === q) {
              return { name: al, type: 'Group Alias', parentName: sg.name };
            }
          }
        }
      }
    }

    return null;
  }

  function validateMasterGroupAliasesLive() {
    const container = document.getElementById('masterGroupAliasesContainer');
    const nameInp = document.getElementById('masterGroupName');
    if (!container) return true;

    const currentName = nameInp ? nameInp.value.trim().toLowerCase() : '';
    const rows = container.querySelectorAll('.master-alias-row-wrap');
    let hasAnyError = false;

    // Collect all lower-cased non-empty values with their counts to detect duplicates
    const aliasValues = [];
    rows.forEach(row => {
      const input = row.querySelector('.master-alias-input');
      const val = input ? input.value.trim() : '';
      aliasValues.push(val.toLowerCase());
    });

    rows.forEach((row, idx) => {
      const input = row.querySelector('.master-alias-input');
      const errDiv = row.querySelector('.master-alias-err');
      if (!input || !errDiv) return;

      const val = input.value.trim();
      const valLower = val.toLowerCase();

      if (!val) {
        errDiv.style.display = 'none';
        errDiv.textContent = '';
        input.style.borderColor = 'var(--slate-200)';
        input.style.boxShadow = 'none';
        return;
      }

      // Check 1: Duplicate of current form Group Name
      if (currentName && valLower === currentName) {
        const errorText = `"${val}" matches the Group Name in this form.`;
        errDiv.textContent = errorText;
        errDiv.style.display = 'block';
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.12)';
        hasAnyError = true;
        return;
      }

      // Check 2: Duplicate of another alias in current form
      const duplicateInForm = aliasValues.some((otherVal, otherIdx) => otherIdx !== idx && otherVal !== '' && otherVal === valLower);
      if (duplicateInForm) {
        const errorText = `"${val}" is already entered as another alias in this form.`;
        errDiv.textContent = errorText;
        errDiv.style.display = 'block';
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.12)';
        hasAnyError = true;
        return;
      }

      // Check 3: Duplicate of existing CoA entity
      const dup = findDuplicateCoaNameOrAlias(val);
      if (dup) {
        const typeLabel = dup.parentName ? `Alias of "${dup.parentName}"` : dup.type;
        const errorText = `"${val}" already exists in system (${typeLabel}).`;
        errDiv.textContent = errorText;
        errDiv.style.display = 'block';
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.12)';
        hasAnyError = true;
        return;
      }

      // No error
      errDiv.style.display = 'none';
      errDiv.textContent = '';
      input.style.borderColor = 'var(--slate-200)';
      input.style.boxShadow = 'none';
    });

    return !hasAnyError;
  }

  function renderMasterGroupAliases() {
    const container = document.getElementById('masterGroupAliasesContainer');
    const addAliasBtn = document.getElementById('masterGroupAddAliasBtn');
    if (!container) return;

    container.innerHTML = '';
    const hasEmpty = _masterGroupAliases.some(a => a.trim() === '');
    if (addAliasBtn) {
      addAliasBtn.style.display = hasEmpty ? 'none' : 'inline-flex';
    }

    _masterGroupAliases.forEach((alias, idx) => {
      const block = document.createElement('div');
      block.className = 'master-alias-row-wrap';
      block.style.display = 'flex';
      block.style.flexDirection = 'column';
      block.style.gap = '2px';

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.style.alignItems = 'center';

      const input = document.createElement('input');
      input.className = 'master-alias-input';
      input.placeholder = `Alias #${idx + 1} (e.g. Alternate name / Code)`;
      input.value = alias;
      input.style.cssText = `
        flex: 1;
        height: 38px;
        padding: 8px 12px;
        font-size: 13.5px;
        font-family: inherit;
        color: var(--slate-800);
        background: #ffffff;
        border: 1.5px solid var(--slate-200);
        border-radius: 8px;
        box-sizing: border-box;
        outline: none;
        transition: border-color 0.15s, box-shadow 0.15s;
      `;

      input.addEventListener('focus', () => {
        if (!input.style.borderColor || input.style.borderColor === 'var(--slate-200)' || input.style.borderColor === 'rgb(226, 232, 240)') {
          input.style.borderColor = '#3b82f6';
          input.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.12)';
        }
      });

      input.addEventListener('blur', () => {
        validateMasterGroupAliasesLive();
      });

      input.addEventListener('input', (e) => {
        _masterGroupAliases[idx] = e.target.value;
        const nowHasEmpty = _masterGroupAliases.some(a => a.trim() === '');
        if (addAliasBtn) addAliasBtn.style.display = nowHasEmpty ? 'none' : 'inline-flex';
        validateMasterGroupAliasesLive();
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-master-alias-del';
      delBtn.title = 'Remove Alias';
      delBtn.style.cssText = `
        width: 38px;
        height: 38px;
        min-width: 38px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: 1.5px solid var(--slate-200);
        border-radius: 8px;
        background: #ffffff;
        color: var(--slate-400);
        cursor: pointer;
        transition: all 0.15s ease;
      `;
      delBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;

      delBtn.addEventListener('mouseenter', () => {
        delBtn.style.background = '#fef2f2';
        delBtn.style.color = '#dc2626';
        delBtn.style.borderColor = '#fecaca';
      });
      delBtn.addEventListener('mouseleave', () => {
        delBtn.style.background = '#ffffff';
        delBtn.style.color = 'var(--slate-400)';
        delBtn.style.borderColor = 'var(--slate-200)';
      });

      delBtn.addEventListener('click', () => {
        _masterGroupAliases.splice(idx, 1);
        renderMasterGroupAliases();
      });

      const errDiv = document.createElement('div');
      errDiv.className = 'master-alias-err';
      errDiv.style.cssText = `
        display: none;
        font-size: 12px;
        font-weight: 600;
        color: #dc2626;
        margin-top: 4px;
        line-height: 1.4;
      `;

      row.appendChild(input);
      row.appendChild(delBtn);
      block.appendChild(row);
      block.appendChild(errDiv);
      container.appendChild(block);
    });

    validateMasterGroupAliasesLive();
  }

  function initSearchableSelectHelper(container, prefix, placeholderText) {
    if (typeof initGenericSearchableSelect === 'function') {
      return initGenericSearchableSelect(container, prefix, placeholderText);
    }
    const realSelect = container.querySelector('#' + prefix);
    const trigger = container.querySelector('#' + prefix + 'Trigger');
    const dropdown = container.querySelector('#' + prefix + 'Dropdown');
    const searchInput = container.querySelector('#' + prefix + 'Search');
    const optionsList = container.querySelector('#' + prefix + 'OptionsList');
    const triggerText = container.querySelector('#' + prefix + 'TriggerText');
    if (!realSelect || !trigger || !dropdown || !searchInput || !optionsList || !triggerText) return null;

    const updateTriggerText = () => {
      const allOpts = Array.from(realSelect.querySelectorAll('option'));
      const selectedOpt = allOpts.find(opt => opt.value === realSelect.value) || realSelect.options[realSelect.selectedIndex];
      if (selectedOpt) {
        triggerText.textContent = selectedOpt.textContent.trim();
      } else {
        triggerText.textContent = placeholderText || 'Select option...';
      }
    };

    const populateList = (filter = '') => {
      optionsList.innerHTML = '';
      const query = filter.toLowerCase().trim();

      const children = Array.from(realSelect.children);
      const hasOptgroups = children.some(ch => ch.tagName === 'OPTGROUP');

      const renderOptionItem = (opt) => {
        const text = opt.textContent;
        const value = opt.value;
        if (query && !text.toLowerCase().includes(query)) return;

        const isSelected = opt.selected || realSelect.value === value;
        const item = document.createElement('div');
        item.style.padding = '8.5px 12px';
        item.style.fontSize = '13.5px';
        item.style.borderRadius = '6px';
        item.style.cursor = 'pointer';
        item.style.fontWeight = isSelected ? '700' : '500';
        item.style.background = isSelected ? 'var(--blue-50)' : 'transparent';
        item.style.color = isSelected ? 'var(--blue-700)' : 'var(--slate-700)';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.justifyContent = 'space-between';
        item.style.whiteSpace = 'pre-wrap';

        const labelSpan = document.createElement('span');
        labelSpan.textContent = text;
        item.appendChild(labelSpan);

        if (opt.dataset && opt.dataset.badge) {
          const badgeSpan = document.createElement('span');
          badgeSpan.style.fontSize = '11px';
          badgeSpan.style.fontWeight = '600';
          badgeSpan.style.padding = '2px 7px';
          badgeSpan.style.borderRadius = '4px';
          if (opt.dataset.badge === 'Primary') {
            badgeSpan.style.background = '#eff6ff';
            badgeSpan.style.color = '#1d4ed8';
            badgeSpan.style.border = '1px solid #dbeafe';
          } else {
            badgeSpan.style.background = '#f8fafc';
            badgeSpan.style.color = '#64748b';
            badgeSpan.style.border = '1px solid #e2e8f0';
          }
          badgeSpan.textContent = opt.dataset.badge;
          item.appendChild(badgeSpan);
        }

        item.addEventListener('mouseover', () => {
          if (realSelect.value !== value) item.style.background = 'var(--slate-50)';
        });
        item.addEventListener('mouseout', () => {
          if (realSelect.value !== value) item.style.background = 'transparent';
        });

        item.addEventListener('click', () => {
          realSelect.value = value;
          Array.from(realSelect.querySelectorAll('option')).forEach(o => {
            o.selected = (o.value === value);
          });
          realSelect.dispatchEvent(new Event('change'));
          updateTriggerText();
          dropdown.style.display = 'none';
        });

        optionsList.appendChild(item);
      };

      if (hasOptgroups) {
        children.forEach(child => {
          if (child.tagName === 'OPTGROUP') {
            const groupLabel = child.label;
            const matchingOpts = Array.from(child.children).filter(opt => !query || opt.textContent.toLowerCase().includes(query));
            if (matchingOpts.length > 0) {
              const grpHdr = document.createElement('div');
              grpHdr.style.padding = '8px 12px 4px 12px';
              grpHdr.style.fontSize = '11px';
              grpHdr.style.fontWeight = '700';
              grpHdr.style.color = 'var(--slate-400)';
              grpHdr.style.textTransform = 'uppercase';
              grpHdr.style.letterSpacing = '0.5px';
              if (optionsList.children.length > 0) {
                grpHdr.style.borderTop = '1px solid var(--slate-100)';
                grpHdr.style.marginTop = '6px';
                grpHdr.style.paddingTop = '8px';
              }
              grpHdr.textContent = groupLabel;
              optionsList.appendChild(grpHdr);

              matchingOpts.forEach(renderOptionItem);
            }
          } else if (child.tagName === 'OPTION') {
            renderOptionItem(child);
          }
        });
      } else {
        Array.from(realSelect.options).forEach(renderOptionItem);
      }

      if (optionsList.children.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.style.padding = '12px';
        emptyState.style.fontSize = '13px';
        emptyState.style.color = 'var(--slate-400)';
        emptyState.style.textAlign = 'center';
        emptyState.textContent = 'No matching options found';
        optionsList.appendChild(emptyState);
      }
    };

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.style.display === 'flex';
      dropdown.style.display = isOpen ? 'none' : 'flex';
      if (!isOpen) {
        searchInput.value = '';
        populateList('');
        setTimeout(() => searchInput.focus(), 50);
      }
    });

    searchInput.addEventListener('input', (e) => populateList(e.target.value));

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });

    updateTriggerText();
    return { refresh: () => { updateTriggerText(); populateList(''); } };
  }

  function updateMasterDeskContent() {
    const contentArea = document.getElementById('masterDeskContentArea');
    if (!contentArea) return;

    if (currentMasterDeskSubtype === 'Create' && currentMasterDeskTab === 'group') {
      _masterGroupAliases = [];

      let groupOptionsHtml = '';
      if (typeof COA_SYS_SGS !== 'undefined') {
        COA_SYS_SGS.forEach(sg => {
          const sgIndent = sg.parent ? '\u00a0\u00a0\u00a0\u00a0' : '';
          groupOptionsHtml += `<option value="group:sg:${sg.id}" data-badge="Group">${sgIndent}${sg.name}</option>`;

          if (typeof coaLedgers !== 'undefined') {
            const addGlOptions = (parentId, depth) => {
              const gls = coaLedgers.filter(l => l.sgId === sg.id && l.type === 'group-ledger' && (parentId ? l.glId === parentId : !l.glId));
              gls.forEach(gl => {
                const glIndent = sgIndent + '\u00a0\u00a0\u00a0\u00a0' + '\u00a0\u00a0'.repeat(depth);
                groupOptionsHtml += `<option value="group:gl:${gl.id}" data-badge="Group">${glIndent}📁 ${gl.name}</option>`;
                addGlOptions(gl.id, depth + 1);
              });
            };
            addGlOptions(null, 0);
          }
        });
      }

      contentArea.innerHTML = `
        <div class="coa-modal-card" style="max-width: 600px; box-shadow: none; border: 1px solid var(--slate-200); border-radius: 12px; padding: 24px; background: var(--white); margin: 0 0 20px 0;">
          <h3 style="font-size: 15px; font-weight: 700; color: var(--slate-800); margin: 0 0 18px 0; display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            Create Group
          </h3>

          <!-- Name field -->
          <div class="coa-modal-fg" style="margin-bottom: 16px;">
            <label class="coa-modal-label" for="masterGroupName" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Name *</label>
            <input class="coa-modal-inp" id="masterGroupName" placeholder="e.g. Current Assets / Bank Accounts" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 8px; border: 1.5px solid var(--slate-200); box-sizing: border-box;">
            <div id="masterGroupNameError" style="display: none; font-size: 12px; font-weight: 600; color: #dc2626; margin-top: 5px;"></div>
          </div>

          <!-- Also Known As field -->
          <div class="coa-modal-fg" style="margin-bottom: 16px;">
            <label class="coa-modal-label" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Also Known As</label>
            <div id="masterGroupAliasesContainer" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;"></div>
            <button type="button" id="masterGroupAddAliasBtn" style="padding: 7px 14px; font-size: 12.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; border: 1.5px dashed var(--slate-300); border-radius: 8px; background: #f8fafc; cursor: pointer; color: var(--slate-600); transition: all 0.15s ease;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add A.K.A
            </button>
          </div>

          <!-- Under field (Single box with separated Primary Categories & Parent Groups) -->
          <div class="coa-modal-fg" style="margin-bottom: 24px;">
            <label class="coa-modal-label" for="masterGroupUnderCombinedSel" style="font-size: 13px; font-weight: 600; color: var(--slate-700); margin-bottom: 6px; display: block;">Under *</label>
            <select class="coa-modal-sel" id="masterGroupUnderCombinedSel" style="display: none;">
              <optgroup label="Primary Categories">
                <option value="primary:assets" data-badge="Primary" selected>Asset</option>
                <option value="primary:equity-liabilities" data-badge="Primary">Liability</option>
                <option value="primary:expense" data-badge="Primary">Expense</option>
                <option value="primary:income" data-badge="Primary">Income</option>
              </optgroup>
              <optgroup label="Parent Groups">
                ${groupOptionsHtml}
              </optgroup>
            </select>
            <div class="kya-searchable-select-wrap" id="masterGroupUnderCombinedSelSearchableWrap" style="position: relative; width: 100%;">
              <div class="kya-searchable-select-trigger" id="masterGroupUnderCombinedSelTrigger" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1.5px solid var(--slate-200); border-radius: 8px; background: #fff; cursor: pointer; font-size: 13.5px; font-weight: 500; color: var(--slate-700);">
                <span id="masterGroupUnderCombinedSelTriggerText">Asset</span>
                <span style="font-size: 10px; color: var(--slate-400);">▼</span>
              </div>
              <div class="kya-searchable-select-dropdown" id="masterGroupUnderCombinedSelDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid var(--slate-200); border-radius: 12px; box-shadow: var(--shadow-lg); z-index: 1000; padding: 8px; max-height: 280px; overflow-y: auto; flex-direction: column; gap: 2px; width: 100%; box-sizing: border-box;">
                <input type="text" id="masterGroupUnderCombinedSelSearch" placeholder="Search primary category or parent group..." class="je-input" style="padding: 8px 12px; font-size: 13px; border-radius: 6px; border: 1.5px solid var(--slate-200); margin-bottom: 6px; width: 100%; box-sizing: border-box;" />
                <div id="masterGroupUnderCombinedSelOptionsList" style="display: flex; flex-direction: column; gap: 2px;"></div>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 12px; align-items: center;">
            <button class="btn btn-primary" id="masterGroupSaveBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">＋ Create Group</button>
            <button class="btn btn-secondary" id="masterGroupCancelBtn" style="height: 38px; padding: 8px 16px; font-size: 13px; font-weight: 600;">Cancel</button>
          </div>
        </div>
      `;

      renderMasterGroupAliases();

      const addAliasBtn = contentArea.querySelector('#masterGroupAddAliasBtn');
      if (addAliasBtn) {
        addAliasBtn.addEventListener('click', () => {
          _masterGroupAliases.push('');
          renderMasterGroupAliases();
          const inputs = contentArea.querySelectorAll('.master-alias-input');
          if (inputs.length) {
            inputs[inputs.length - 1].focus();
          }
        });
      }

      const searchableUnderControl = initSearchableSelectHelper(contentArea, 'masterGroupUnderCombinedSel', 'Select category or parent group');

      const saveBtn = contentArea.querySelector('#masterGroupSaveBtn');
      const cancelBtn = contentArea.querySelector('#masterGroupCancelBtn');
      const nameInp = contentArea.querySelector('#masterGroupName');
      const nameErr = contentArea.querySelector('#masterGroupNameError');

      const validateNameInputLive = () => {
        const val = nameInp ? nameInp.value.trim() : '';
        if (!val) {
          if (nameErr) { nameErr.style.display = 'none'; nameErr.textContent = ''; }
          if (nameInp) nameInp.style.borderColor = 'var(--slate-200)';
          return null;
        }

        const dup = findDuplicateCoaNameOrAlias(val);
        if (dup) {
          const typeLabel = dup.parentName ? `Alias of "${dup.parentName}"` : dup.type;
          const errorText = `"${val}" already exists (${typeLabel}).`;
          if (nameErr) {
            nameErr.textContent = errorText;
            nameErr.style.display = 'block';
          }
          if (nameInp) nameInp.style.borderColor = '#ef4444';
          return errorText;
        } else {
          if (nameErr) { nameErr.style.display = 'none'; nameErr.textContent = ''; }
          if (nameInp) nameInp.style.borderColor = 'var(--slate-200)';
          return null;
        }
      };

      if (nameInp) {
        nameInp.addEventListener('input', () => {
          validateNameInputLive();
          // revalidate aliases against new name without destroying DOM
          validateMasterGroupAliasesLive();
        });
      }

      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const name = nameInp ? nameInp.value.trim() : '';
          if (!name) {
            if (typeof showToast === 'function') showToast('Please enter a group name.', 'warning');
            else alert('Please enter a group name.');
            if (nameInp) nameInp.focus();
            return;
          }

          // Check if Group Name already exists in system
          const liveNameErr = validateNameInputLive();
          if (liveNameErr) {
            if (typeof showToast === 'function') showToast(liveNameErr, 'error');
            else alert(liveNameErr);
            if (nameInp) nameInp.focus();
            return;
          }

          // Check if any Alias has errors
          const aliasesValid = validateMasterGroupAliasesLive();
          if (!aliasesValid) {
            const msg = 'Please fix duplicate or invalid Also Known As entries.';
            if (typeof showToast === 'function') showToast(msg, 'error');
            else alert(msg);
            return;
          }

          const underSel = contentArea.querySelector('#masterGroupUnderCombinedSel');
          const underVal = underSel && underSel.value ? underSel.value : 'primary:assets';
          const isPrimary = underVal.startsWith('primary:');
          const aliases = _masterGroupAliases.map(a => a.trim()).filter(a => a !== '');

          // Check if any Alias duplicates the Name, another Alias in form, or already exists in system
          const formNamesSet = new Set([name.toLowerCase()]);
          for (let i = 0; i < aliases.length; i++) {
            const al = aliases[i];
            const alLower = al.toLowerCase();

            if (formNamesSet.has(alLower)) {
              const msg = `Duplicate entry "${al}" found in the form. Name and A.K.A must be unique.`;
              if (typeof showToast === 'function') showToast(msg, 'error');
              else alert(msg);
              return;
            }
            formNamesSet.add(alLower);

            const dupAl = findDuplicateCoaNameOrAlias(al);
            if (dupAl) {
              const typeLabel = dupAl.parentName ? `Alias of "${dupAl.parentName}"` : dupAl.type;
              const msg = `"${al}" already exists (${typeLabel}).`;
              if (typeof showToast === 'function') showToast(msg, 'error');
              else alert(msg);
              return;
            }
          }

          if (isPrimary) {
            const mainNature = underVal.replace('primary:', ''); // 'assets', 'equity-liabilities', 'expense', 'income'
            const newSgId = 'sg-grp-' + Date.now();
            const newSg = {
              id: newSgId,
              main: mainNature,
              parent: null,
              name: name,
              aliases: aliases
            };
            if (typeof COA_SYS_SGS !== 'undefined') {
              COA_SYS_SGS.push(newSg);
              if (typeof saveCoaSubGroups === 'function') saveCoaSubGroups();
            }

            if (typeof _coaExpanded !== 'undefined') {
              _coaExpanded.add(mainNature);
              _coaExpanded.add(newSgId);
            }
          } else {
            const selectedVal = underVal.replace('group:', '');
            let parentSgId = selectedVal;
            let parentGlId = null;

            if (selectedVal.startsWith('gl:')) {
              const targetGlId = Number(selectedVal.replace('gl:', ''));
              const targetGl = typeof coaLedgers !== 'undefined' ? coaLedgers.find(l => l.id === targetGlId) : null;
              if (targetGl) {
                parentSgId = targetGl.sgId;
                parentGlId = targetGl.id;
              }
            } else if (selectedVal.startsWith('sg:')) {
              parentSgId = selectedVal.replace('sg:', '');
            }

            const parentSg = typeof COA_SYS_SGS !== 'undefined' ? COA_SYS_SGS.find(s => s.id === parentSgId) : null;
            const newGroup = {
              id: Date.now(),
              name: name,
              sgId: parentSgId,
              glId: parentGlId,
              type: 'group-ledger',
              balance: 0,
              aliases: aliases
            };
            if (typeof coaLedgers !== 'undefined') {
              coaLedgers.push(newGroup);
            }

            if (typeof _coaExpanded !== 'undefined') {
              if (parentSg) {
                _coaExpanded.add(parentSg.main);
                _coaExpanded.add(parentSg.id);
                if (parentSg.parent) _coaExpanded.add(parentSg.parent);
              }
              if (parentGlId) _coaExpanded.add('gl-' + parentGlId);
              _coaExpanded.add('gl-' + newGroup.id);
            }
          }

          if (typeof renderChartPanel === 'function') {
            renderChartPanel();
          }

          if (typeof refreshAllReports === 'function') {
            refreshAllReports();
          }

          if (typeof triggerAutoBackup === 'function') {
            triggerAutoBackup();
          }

          showToast(`Group "${name}" created successfully.`, 'success');

          _masterGroupAliases = [];
          updateMasterDeskContent();
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          _masterGroupAliases = [];
          updateMasterDeskContent();
        });
      }
    } else {
      const tabName = currentMasterDeskTab === 'group' ? 'Group' : 'Ledger';
      contentArea.innerHTML = `
        <div style="text-align: center; padding: 64px 20px; color: var(--slate-400);">
          <div style="width: 56px; height: 56px; border-radius: 16px; background: var(--slate-100); border: 1.5px solid var(--slate-200); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: var(--slate-600);">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
          </div>
          <div id="masterDeskModeTitle" style="font-size: 16px; font-weight: 700; color: var(--slate-700); margin-bottom: 6px;">Master Desk Workspace — ${tabName} (${currentMasterDeskSubtype})</div>
          <div id="masterDeskModeDesc" style="font-size: 13px; color: var(--slate-400); max-width: 380px; margin: 0 auto; line-height: 1.5;">Central master workspace is ready for ${currentMasterDeskSubtype.toLowerCase()}ing ${tabName.toLowerCase()} entries.</div>
        </div>
      `;
    }
  }

  function initMasterDesk(container) {
    if (!container) container = document.getElementById('panel-master-desk');
    if (!container) return;

    container.innerHTML = `
      <!-- Page header -->
      <div class="panel-header" style="border-bottom: 1.5px solid var(--slate-100); padding-bottom: 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: flex-start; gap: 12px; width: 100%;">
        <style>
          .btn-master-action {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            font-size: 13px;
            font-weight: 600;
            color: var(--slate-600);
            background: var(--white);
            border: 1.5px solid var(--slate-200);
            border-radius: 8px;
            cursor: pointer;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            transition: all 0.2s ease;
          }
          .btn-master-action:hover {
            background: var(--slate-50) !important;
            color: var(--slate-800) !important;
            border-color: var(--slate-300) !important;
          }
        </style>
        <div class="panel-actions" style="display: flex; gap: 8px; align-items: center;">
          <button class="btn btn-primary" id="btnMasterCreate" type="button" aria-label="Create Master" style="display: flex; align-items: center; gap: 6px; height: 38px; font-weight: 600; font-size: 13px; padding: 8px 14px; border-radius: 8px; cursor: pointer;">
            <svg viewBox="0 0 16 16" fill="none" style="width: 14px; height: 14px;">
              <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
            Create
          </button>
          <button class="btn-master-action" id="btnMasterAlter" type="button" aria-label="Alter Master" style="display: flex; align-items: center; gap: 6px; height: 38px; font-weight: 600; font-size: 13px; padding: 8px 14px; border-radius: 8px; cursor: pointer;">
            <svg viewBox="0 0 16 16" fill="none" style="width: 14px; height: 14px;">
              <path d="M11 2H4a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 4 15h8a1.5 1.5 0 0 0 1.5-1.5V5L11 2z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M11 2v3h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M8.5 7.5l-3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
            Alter
          </button>
        </div>
      </div>

      <div class="table-card" style="padding: 24px 28px;">
        <!-- Colored header strip -->
        <div class="je-card-header" style="background: linear-gradient(90deg, var(--blue-700), var(--blue-500)); border-top-left-radius: 12px; border-top-right-radius: 12px; margin: -24px -28px 20px -28px; padding: 18px 28px; display: flex; align-items: center; justify-content: space-between;">
          <div class="je-card-header-left" style="display: flex; align-items: center; gap: 12px;">
            <div class="je-card-icon-wrap" style="background: rgba(255, 255, 255, 0.15); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px; color: var(--white);">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
            </div>
            <div>
              <div class="je-card-title-text" style="color: var(--white); font-weight: 700; font-size: 16px; margin: 0;">Master Desk</div>
              <div class="je-card-subtitle-text" style="color: rgba(255, 255, 255, 0.8); font-size: 12px; margin: 2px 0 0 0;">Central master control and enterprise workspace</div>
            </div>
          </div>
        </div>

        <div class="oh-layout">
          <!-- Sub-tabs (Left side options cards) -->
          <div class="oh-sub-tabs" role="tablist" aria-label="Master Desk sections">
            <button class="oh-sub-tab active" id="masterTabGroup" role="tab" aria-selected="true">
              <div class="oh-tab-icon-wrap">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.6"/>
                  <line x1="2" y1="7" x2="14" y2="7" stroke="currentColor" stroke-width="1.6"/>
                </svg>
              </div>
              <span class="oh-tab-text">Group</span>
            </button>

            <button class="oh-sub-tab" id="masterTabLedger" role="tab" aria-selected="false">
              <div class="oh-tab-icon-wrap">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 5h12M4 10h8M4 15h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                </svg>
              </div>
              <span class="oh-tab-text">Ledger</span>
            </button>
          </div>

          <!-- Right Content View Area -->
          <div class="oh-content-area" id="masterDeskContentArea">
          </div>
        </div>
      </div>
    `;

    const btnCreate = container.querySelector('#btnMasterCreate');
    const btnAlter = container.querySelector('#btnMasterAlter');
    const btnGroup = container.querySelector('#masterTabGroup');
    const btnLedger = container.querySelector('#masterTabLedger');

    if (btnCreate) {
      btnCreate.addEventListener('click', () => setMasterDeskSubtype('Create'));
    }
    if (btnAlter) {
      btnAlter.addEventListener('click', () => setMasterDeskSubtype('Alter'));
    }
    if (btnGroup) {
      btnGroup.addEventListener('click', () => setMasterDeskTab('group'));
    }
    if (btnLedger) {
      btnLedger.addEventListener('click', () => setMasterDeskTab('ledger'));
    }

    updateMasterDeskContent();
  }

  // Expose global functions
  window.renderMasterDeskPanel = renderMasterDeskPanel;
  window.initMasterDesk = initMasterDesk;
})();
