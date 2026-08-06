  // ══════════════════════════════════════════════════════════════════
  //  ONEHUB DEPARTMENTS — Department view, modal, detail overlay
  //  (Split from onehub.js for maintainability)
  // ══════════════════════════════════════════════════════════════════

  // ════════════════════════════════════
  //  DEPARTMENTS VIEW
  // ════════════════════════════════════
  function renderOhDeptView() {
    const wrap = document.getElementById('ohDeptViewInner');
    if (!wrap) return;

    const totalDepts = ohDepartments.length;
    const totalEmps  = ohEmployees.length;
    const unassigned = ohEmployees.filter(e => !e.deptId || !ohGetDeptById(e.deptId)).length;

    let html = `
      <div class="oh-stats-row">
        <div class="oh-stat">
          <div class="oh-stat-icon" style="background:#dbeafe;">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style="color:#2563eb;">
              <rect x="2" y="6" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.6"/>
              <path d="M6 6V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="oh-stat-label">Departments</div>
          <div class="oh-stat-value">${totalDepts}</div>
          <div class="oh-stat-sub">${totalDepts === 0 ? 'None created yet' : totalDepts + ' total'}</div>
        </div>
        <div class="oh-stat">
          <div class="oh-stat-icon" style="background:#d1fae5;">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style="color:#059669;">
              <circle cx="10" cy="6" r="3.5" stroke="currentColor" stroke-width="1.6"/>
              <path d="M3 18c0-4 3.1-7 7-7s7 3 7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="oh-stat-label">Employees</div>
          <div class="oh-stat-value">${totalEmps}</div>
          <div class="oh-stat-sub">${totalEmps === 0 ? 'None added yet' : totalEmps + ' total'}</div>
        </div>
        <div class="oh-stat">
          <div class="oh-stat-icon" style="background:#fef3c7;">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style="color:#d97706;">
              <path d="M10 9v4M10 15h.01" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
              <path d="M2 16L10 3l8 13H2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="oh-stat-label">Unassigned</div>
          <div class="oh-stat-value">${unassigned}</div>
          <div class="oh-stat-sub">${unassigned === 0 ? 'All assigned \u2713' : 'Need assignment'}</div>
        </div>
      </div>`;

    if (ohDepartments.length === 0) {
      html += `
        <div class="oh-empty">
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
            <rect x="10" y="20" width="40" height="30" rx="5" fill="#dbeafe" stroke="#93c5fd" stroke-width="2"/>
            <path d="M20 20V14a4 4 0 014-4h12a4 4 0 014 4v6" stroke="#93c5fd" stroke-width="2" stroke-linecap="round"/>
            <path d="M24 35h12M30 30v10" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <div class="oh-empty-title">No departments yet</div>
          <div class="oh-empty-desc">Create your first department to start organising your team hierarchy.</div>
        </div>`;
    } else {
      html += `<div class="oh-dept-grid">`;
      ohDepartments.forEach(dept => {
        const emps     = ohGetDeptEmps(dept.id);
        const head     = dept.headEmpId ? ohGetEmpById(dept.headEmpId) : null;
        const preview  = emps.slice(0, 3);
        const overflow = emps.length - 3;
        html += `
          <div class="oh-dept-card">
            <div class="oh-dept-card-top">
              <div class="oh-dept-name">${ohEsc(dept.name)}</div>
              <div class="oh-dept-head-row">
                ${head
                  ? `<div class="oh-dept-head-avatar">${ohInitials(head.name)}</div>
                     <span>Head: <span class="oh-dept-head-name">${ohEsc(head.name)}</span></span>`
                  : `<span class="oh-dept-no-head">\u2014 No head assigned \u2014</span>`}
              </div>
            </div>
            <div class="oh-dept-card-mid">
              <div class="oh-dept-emp-count">${emps.length} Employee${emps.length !== 1 ? 's' : ''}</div>
              <div class="oh-dept-emp-list">
                ${preview.map(e => `
                  <div class="oh-dept-emp-item">
                    <span class="oh-dept-emp-dot"></span>
                    <span>${ohEsc(e.name)}${e.designation ? ` <span style="color:var(--slate-400);font-size:11px;">(${ohEsc(e.designation)})</span>` : ''}</span>
                  </div>`).join('')}
                ${overflow > 0 ? `<div class="oh-dept-overflow" data-dept-detail="${dept.id}">+${overflow} more&hellip;</div>` : ''}
                ${emps.length === 0 ? `<div style="font-size:12px;color:var(--slate-300);font-style:italic;">No employees assigned</div>` : ''}
              </div>
            </div>
            <div class="oh-dept-card-actions">
              <button class="oh-action-btn primary oh-dept-detail-btn" data-id="${dept.id}">
                <svg viewBox="0 0 12 12" fill="none"><path d="M1 6s1.8-4 5-4 5 4 5 4-1.8 4-5 4-5-4-5-4z" stroke="currentColor" stroke-width="1.3"/><circle cx="6" cy="6" r="1.5" stroke="currentColor" stroke-width="1.3"/></svg>
                View
              </button>
              <button class="oh-action-btn oh-dept-edit-btn" data-id="${dept.id}">
                <svg viewBox="0 0 12 12" fill="none"><path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Edit
              </button>
              <button class="oh-action-btn danger oh-dept-del-btn" data-id="${dept.id}" style="margin-left:auto;">
                <svg viewBox="0 0 12 12" fill="none"><path d="M2 3h8M5 3V2h2v1M4.5 5v4M7.5 5v4M3 3l.7 7h4.6L9 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Delete
              </button>
            </div>
          </div>`;
      });
      html += `</div>`;
    }

    wrap.innerHTML = html;

    wrap.querySelectorAll('.oh-dept-edit-btn').forEach(btn =>
      btn.addEventListener('click', () => openOhDeptModal(Number(btn.dataset.id))));
    wrap.querySelectorAll('.oh-dept-del-btn').forEach(btn =>
      btn.addEventListener('click', () => deleteOhDept(Number(btn.dataset.id))));
    wrap.querySelectorAll('.oh-dept-detail-btn').forEach(btn =>
      btn.addEventListener('click', () => openOhDeptDetail(Number(btn.dataset.id))));
    wrap.querySelectorAll('.oh-dept-overflow').forEach(el =>
      el.addEventListener('click', () => openOhDeptDetail(Number(el.dataset.deptDetail))));
  }


  // ════════════════════════════════════
  //  DEPARTMENT MODAL  (Add / Edit)
  // ════════════════════════════════════
  let _ohDeptModalEditId = null;

  function openOhDeptModal(editId) {
    _ohDeptModalEditId = editId || null;
    const dept = editId ? ohGetDeptById(editId) : null;

    const empOptions = ohEmployees.map(e =>
      `<option value="${e.id}" ${dept && dept.headEmpId === e.id ? 'selected' : ''}>${ohEsc(e.name)}${e.designation ? ' \u2013 ' + ohEsc(e.designation) : ''}</option>`
    ).join('');

    const overlay = document.createElement('div');
    overlay.className = 'oh-modal-overlay';
    overlay.id = 'ohDeptModal';
    overlay.innerHTML = `
      <div class="oh-modal-card" role="dialog" aria-modal="true">
        <div class="oh-modal-hdr">
          <div class="oh-modal-title">${dept ? 'Edit Department' : 'New Department'}</div>
          <button class="oh-modal-close" id="ohDeptModalClose" aria-label="Close">&times;</button>
        </div>
        <div class="oh-fg">
          <label class="oh-label" for="ohDeptName">Department Name <span class="req">*</span></label>
          <input class="oh-input" id="ohDeptName" type="text" placeholder="e.g. Engineering, Finance, HR&hellip;" value="${dept ? ohEsc(dept.name) : ''}" autocomplete="off">
        </div>
        <div class="oh-fg">
          <label class="oh-label" for="ohDeptHead">Department Head</label>
          <select class="oh-select" id="ohDeptHead">
            <option value="">&mdash; No head assigned &mdash;</option>
            ${empOptions}
          </select>
          ${ohEmployees.length === 0 ? '<div class="oh-input-hint">\u26A0 No employees available. Add employees first to assign a head.</div>' : ''}
        </div>
        <div class="oh-modal-btns">
          <button class="oh-btn-cancel" id="ohDeptCancelBtn">Cancel</button>
          <button class="oh-btn-save" id="ohDeptSaveBtn">${dept ? 'Save Changes' : 'Create Department'}</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    document.getElementById('ohDeptModalClose').addEventListener('click', closeOhDeptModal);
    document.getElementById('ohDeptCancelBtn').addEventListener('click', closeOhDeptModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeOhDeptModal(); });
    document.getElementById('ohDeptSaveBtn').addEventListener('click', saveOhDept);
    const nameInp = document.getElementById('ohDeptName');
    nameInp.focus();
    nameInp.addEventListener('keydown', e => { if (e.key === 'Enter') saveOhDept(); });
  }

  function closeOhDeptModal() {
    document.getElementById('ohDeptModal')?.remove();
    _ohDeptModalEditId = null;
  }

  function saveOhDept() {
    const nameInp = document.getElementById('ohDeptName');
    const headSel = document.getElementById('ohDeptHead');
    const name = nameInp.value.trim();

    if (!name) {
      nameInp.classList.add('error');
      nameInp.focus();
      setTimeout(() => nameInp.classList.remove('error'), 1500);
      return;
    }

    const dup = ohDepartments.find(d => d.name.toLowerCase() === name.toLowerCase() && d.id !== _ohDeptModalEditId);
    if (dup) {
      nameInp.classList.add('error');
      showToast(`Department "${name}" already exists.`, 'error');
      setTimeout(() => nameInp.classList.remove('error'), 1500);
      return;
    }

    const headId = headSel.value ? Number(headSel.value) : null;

    if (_ohDeptModalEditId) {
      const dept = ohGetDeptById(_ohDeptModalEditId);
      if (dept) { dept.name = name; dept.headEmpId = headId; }
      showToast('Department updated successfully.', 'success');
    } else {
      ohDepartments.push({ id: _ohDeptCtr++, name, headEmpId: headId });
      showToast(`Department "${name}" created.`, 'success');
    }

    closeOhDeptModal();
    updateOhBadges();
    renderOhDeptView();
    triggerAutoBackup();
  }

  function deleteOhDept(id) {
    const dept = ohGetDeptById(id);
    if (!dept) return;
    const empCount = ohGetDeptEmps(id).length;
    if (empCount > 0) {
      showToast(`Cannot delete "${dept.name}" \u2014 it has ${empCount} employee${empCount > 1 ? 's' : ''}. Transfer or remove them first.`, 'error');
      return;
    }
    showKyaConfirm({
      title: 'Delete Department?',
      message: `Permanently delete <strong>${ohEsc(dept.name)}</strong>?<br>This action cannot be undone.`,
      confirmLabel: '\u2715 Delete',
      iconBg: '#fee2e2', iconColor: '#dc2626',
      iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      okBg: '#dc2626',
      onConfirm: () => {
        ohDepartments = ohDepartments.filter(d => d.id !== id);
        showToast(`Department "${dept.name}" deleted.`, 'success');
        updateOhBadges();
        renderOhDeptView();
        triggerAutoBackup();
      }
    });
  }


  // ════════════════════════════════════
  //  DEPARTMENT DETAIL OVERLAY
  // ════════════════════════════════════
  function openOhDeptDetail(id) {
    const dept = ohGetDeptById(id);
    if (!dept) return;
    const emps = ohGetDeptEmps(id);
    const head = dept.headEmpId ? ohGetEmpById(dept.headEmpId) : null;

    const overlay = document.createElement('div');
    overlay.className = 'oh-detail-overlay';
    overlay.id = 'ohDetailOverlay';
    overlay.innerHTML = `
      <div class="oh-detail-card" role="dialog" aria-modal="true">
        <div class="oh-detail-hdr-wrap">
          <div class="oh-detail-hdr">
            <div class="oh-detail-title">${ohEsc(dept.name)}</div>
            <div class="oh-detail-sub">
              ${head ? 'Head: ' + ohEsc(head.name) : 'No department head assigned'}
              &nbsp;&middot;&nbsp; ${emps.length} employee${emps.length !== 1 ? 's' : ''}
            </div>
          </div>
          <button class="oh-detail-close" id="ohDetailClose" aria-label="Close">&times;</button>
        </div>
        <div class="oh-detail-body">
          ${emps.length === 0 ? `
            <div class="oh-empty" style="padding:40px 16px;">
              <div class="oh-empty-title">No employees in this department</div>
              <div class="oh-empty-desc">Add employees and assign them to this department.</div>
            </div>` : emps.map(e => `
            <div class="oh-detail-emp-row">
              <div class="oh-detail-emp-avatar">${ohInitials(e.name)}</div>
              <div style="flex:1;min-width:0;">
                <div class="oh-detail-emp-name">${ohEsc(e.name)}</div>
                <div class="oh-detail-emp-meta">
                  <span class="oh-emp-code" style="font-size:10.5px;padding:2px 6px;">${ohEsc(e.code)}</span>
                  ${e.designation ? ' &middot; ' + ohEsc(e.designation) : ''}
                  ${e.phone ? ' &middot; ' + ohEsc(e.phone) : ''}
                </div>
              </div>
              ${dept.headEmpId === e.id ? '<span class="oh-detail-emp-is-head">👑 Head</span>' : ''}
            </div>`).join('')}
        </div>
      </div>`;

    document.body.appendChild(overlay);
    document.getElementById('ohDetailClose').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  }

