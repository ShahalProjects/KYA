  // ══════════════════════════════════════════════════════════════════
  //  ONEHUB EMPLOYEES — Employee view, modal
  //  (Split from onehub.js for maintainability)
  // ══════════════════════════════════════════════════════════════════

  // ════════════════════════════════════
  //  EMPLOYEES VIEW
  // ════════════════════════════════════
  function renderOhEmpView() {
    const wrap = document.getElementById('ohEmpViewInner');
    if (!wrap) return;

    let filtered = ohEmployees.filter(emp => {
      if (_ohEmpDeptFilter && emp.deptId !== Number(_ohEmpDeptFilter)) return false;
      if (_ohEmpSearch) {
        const q = _ohEmpSearch.toLowerCase();
        const hay = [emp.name, emp.code, emp.designation, emp.phone, emp.email].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const deptOptions = ohDepartments.map(d =>
      `<option value="${d.id}" ${String(d.id) === String(_ohEmpDeptFilter) ? 'selected' : ''}>${ohEsc(d.name)}</option>`
    ).join('');

    let html = `
      <div class="oh-emp-toolbar">
        <div class="oh-search-wrap">
          <svg viewBox="0 0 15 15" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="M10 10l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          <input id="ohEmpSearch" placeholder="Search by name, code, designation, phone&hellip;" value="${_ohEmpSearch.replace(/"/g,'&quot;')}">
        </div>
        <select class="oh-filter-sel" id="ohDeptFilter">
          <option value="">All Departments</option>
          ${deptOptions}
        </select>
      </div>
      <div class="oh-table-card">`;

    if (filtered.length === 0) {
      html += `
        <div class="oh-empty">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="18" r="10" fill="#dbeafe" stroke="#93c5fd" stroke-width="2"/>
            <path d="M8 48c0-10 9-18 20-18s20 8 20 18" stroke="#93c5fd" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <div class="oh-empty-title">${ohEmployees.length ? 'No employees match your filter' : 'No employees yet'}</div>
          <div class="oh-empty-desc">${ohEmployees.length ? 'Try adjusting your search or department filter.' : 'Add your first employee using the button above.'}</div>
        </div>`;
    } else {
      html += `
        <table class="oh-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Code</th>
              <th>Name &amp; Designation</th>
              <th>Department</th>
              <th>Phone</th>
              <th>Joining Date</th>
              <th>Salary</th>
              <th style="text-align:center;width:100px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((emp, i) => {
              const dept   = emp.deptId ? ohGetDeptById(emp.deptId) : null;
              const isHead = dept && dept.headEmpId === emp.id;
              return `
                <tr data-emp-id="${emp.id}">
                  <td style="color:var(--slate-400);font-size:12px;font-weight:600;">${i+1}</td>
                  <td><span class="oh-emp-code">${ohEsc(emp.code)}</span></td>
                  <td>
                    <div class="oh-emp-name">${ohEsc(emp.name)}</div>
                    ${emp.designation ? `<div style="font-size:11.5px;color:var(--slate-400);margin-top:2px;">${ohEsc(emp.designation)}</div>` : ''}
                  </td>
                  <td>${dept ? `<span class="oh-dept-chip">${ohEsc(dept.name)}${isHead ? ' \uD83D\uDC51' : ''}</span>` : `<span class="oh-no-dept-chip">Unassigned</span>`}</td>
                  <td style="white-space:nowrap;">${ohEsc(emp.phone || '\u2014')}</td>
                  <td style="white-space:nowrap;">${ohEsc(emp.joiningDate || '\u2014')}</td>
                  <td style="font-weight:600;">${ohFmtSalary(emp.salary)}</td>
                  <td style="text-align:center;white-space:nowrap;">
                    <button class="oh-action-btn primary oh-emp-edit-btn" data-id="${emp.id}" title="Edit">Edit</button>
                    <button class="oh-action-btn danger oh-emp-del-btn" data-id="${emp.id}" title="Delete" style="margin-left:4px;">
                      <svg viewBox="0 0 12 12" fill="none"><path d="M2 3h8M5 3V2h2v1M4.5 5v4M7.5 5v4M3 3l.7 7h4.6L9 3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>`;
    }

    html += `</div>`;
    wrap.innerHTML = html;

    const srch = document.getElementById('ohEmpSearch');
    if (srch) srch.addEventListener('input', e => { _ohEmpSearch = e.target.value; renderOhEmpView(); });
    const deptF = document.getElementById('ohDeptFilter');
    if (deptF) deptF.addEventListener('change', e => { _ohEmpDeptFilter = e.target.value; renderOhEmpView(); });

    wrap.querySelectorAll('.oh-emp-edit-btn').forEach(btn =>
      btn.addEventListener('click', () => openOhEmpModal(Number(btn.dataset.id))));
    wrap.querySelectorAll('.oh-emp-del-btn').forEach(btn =>
      btn.addEventListener('click', () => deleteOhEmp(Number(btn.dataset.id))));
  }


  // ════════════════════════════════════
  //  EMPLOYEE MODAL  (Add / Edit)
  // ════════════════════════════════════
  let _ohEmpModalEditId = null;
  let _ohEmpCodeMode = 'auto';

  function openOhEmpModal(editId) {
    _ohEmpModalEditId = editId || null;
    const emp = editId ? ohGetEmpById(editId) : null;
    _ohEmpCodeMode = 'auto';

    const deptOptions = ohDepartments.map(d =>
      `<option value="${d.id}" ${emp && emp.deptId === d.id ? 'selected' : ''}>${ohEsc(d.name)}</option>`
    ).join('');

    const autoCode = emp ? emp.code : ohAutoCode();

    const overlay = document.createElement('div');
    overlay.className = 'oh-modal-overlay';
    overlay.id = 'ohEmpModal';
    overlay.innerHTML = `
      <div class="oh-modal-card" role="dialog" aria-modal="true">
        <div class="oh-modal-hdr">
          <div class="oh-modal-title">${emp ? 'Edit Employee' : 'New Employee'}</div>
          <button class="oh-modal-close" id="ohEmpModalClose" aria-label="Close">&times;</button>
        </div>

        <div class="oh-modal-section-title">Basic Information</div>

        <div class="oh-fg">
          <label class="oh-label">Employee Code <span class="req">*</span></label>
          <div class="oh-code-toggle">
            <button class="oh-code-mode-btn active" id="ohCodeAuto" type="button">Auto</button>
            <button class="oh-code-mode-btn" id="ohCodeManual" type="button">Manual</button>
          </div>
          <input class="oh-input" id="ohEmpCode" type="text" value="${ohEsc(autoCode)}" placeholder="Employee code" readonly style="background:var(--slate-50);color:var(--slate-400);">
          <div class="oh-input-hint" id="ohCodeHint">Code is auto-generated. Switch to Manual to customise.</div>
        </div>

        <div class="oh-fg-row">
          <div class="oh-fg">
            <label class="oh-label" for="ohEmpName">Full Name <span class="req">*</span></label>
            <input class="oh-input" id="ohEmpName" type="text" placeholder="e.g. Rahul Sharma" value="${ohEsc(emp?.name || '')}">
          </div>
          <div class="oh-fg">
            <label class="oh-label" for="ohEmpDesig">Designation</label>
            <input class="oh-input" id="ohEmpDesig" type="text" placeholder="e.g. Manager, Engineer&hellip;" value="${ohEsc(emp?.designation || '')}">
          </div>
        </div>

        <div class="oh-fg-row">
          <div class="oh-fg">
            <label class="oh-label" for="ohEmpDept">Department <span class="req">*</span></label>
            <select class="oh-select" id="ohEmpDept">
              <option value="">&mdash; Select Department &mdash;</option>
              ${deptOptions}
            </select>
            ${ohDepartments.length === 0 ? '<div class="oh-input-hint">\u26A0 No departments yet. Create one first.</div>' : ''}
          </div>
          <div class="oh-fg">
            <label class="oh-label" for="ohEmpJoining">Joining Date</label>
            <input class="oh-input" id="ohEmpJoining" type="date" value="${ohEsc(emp?.joiningDate || '')}">
          </div>
        </div>

        <div class="oh-fg">
          <label class="oh-label" for="ohEmpSalary">Salary (\u20B9)</label>
          <input class="oh-input" id="ohEmpSalary" type="number" min="0" step="0.01" placeholder="e.g. 50000" value="${emp?.salary ?? ''}">
        </div>

        <div class="oh-modal-section-title">Contact Details</div>

        <div class="oh-fg-row">
          <div class="oh-fg">
            <label class="oh-label" for="ohEmpPhone">Phone No.</label>
            <input class="oh-input" id="ohEmpPhone" type="tel" placeholder="+91 XXXXX XXXXX" value="${ohEsc(emp?.phone || '')}">
          </div>
          <div class="oh-fg">
            <label class="oh-label" for="ohEmpEmail">Email</label>
            <input class="oh-input" id="ohEmpEmail" type="email" placeholder="employee@company.com" value="${ohEsc(emp?.email || '')}">
          </div>
        </div>

        <div class="oh-fg">
          <label class="oh-label" for="ohEmpPan">PAN Number</label>
          <input class="oh-input" id="ohEmpPan" type="text" placeholder="ABCDE1234F" maxlength="10" style="text-transform:uppercase;" value="${ohEsc(emp?.pan || '')}">
        </div>

        <div class="oh-fg">
          <label class="oh-label" for="ohEmpAddress">Address</label>
          <input class="oh-input" id="ohEmpAddress" type="text" placeholder="Full address&hellip;" value="${ohEsc(emp?.address || '')}">
        </div>

        <div class="oh-modal-btns">
          <button class="oh-btn-cancel" id="ohEmpCancelBtn">Cancel</button>
          <button class="oh-btn-save" id="ohEmpSaveBtn">${emp ? 'Save Changes' : 'Add Employee'}</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    // Code mode toggle
    const codeInp  = document.getElementById('ohEmpCode');
    const codeHint = document.getElementById('ohCodeHint');
    const btnAuto  = document.getElementById('ohCodeAuto');
    const btnMan   = document.getElementById('ohCodeManual');

    btnAuto.addEventListener('click', () => {
      _ohEmpCodeMode = 'auto';
      btnAuto.classList.add('active'); btnMan.classList.remove('active');
      codeInp.value = emp ? emp.code : ohAutoCode();
      codeInp.readOnly = true;
      codeInp.style.background = 'var(--slate-50)'; codeInp.style.color = 'var(--slate-400)';
      codeHint.textContent = 'Code is auto-generated. Switch to Manual to customise.';
    });
    btnMan.addEventListener('click', () => {
      _ohEmpCodeMode = 'manual';
      btnMan.classList.add('active'); btnAuto.classList.remove('active');
      codeInp.readOnly = false;
      codeInp.style.background = ''; codeInp.style.color = '';
      codeHint.textContent = 'Enter a custom employee code.';
      codeInp.focus(); codeInp.select();
    });

    document.getElementById('ohEmpModalClose').addEventListener('click', closeOhEmpModal);
    document.getElementById('ohEmpCancelBtn').addEventListener('click', closeOhEmpModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeOhEmpModal(); });
    document.getElementById('ohEmpSaveBtn').addEventListener('click', saveOhEmp);
    document.getElementById('ohEmpName').focus();
  }

  function closeOhEmpModal() {
    document.getElementById('ohEmpModal')?.remove();
    _ohEmpModalEditId = null;
  }

  function saveOhEmp() {
    const nameInp  = document.getElementById('ohEmpName');
    const codeInp  = document.getElementById('ohEmpCode');
    const deptSel  = document.getElementById('ohEmpDept');
    const name     = nameInp.value.trim();
    const code     = codeInp.value.trim();
    const deptId   = deptSel.value ? Number(deptSel.value) : null;

    let err = false;
    if (!name)  { nameInp.classList.add('error'); err = true; }
    if (!code)  { codeInp.classList.add('error'); err = true; }
    if (!deptId) { deptSel.classList.add('error'); err = true; }
    if (err) {
      showToast('Please fill in all required fields (Name, Code, Department).', 'error');
      setTimeout(() => { nameInp.classList.remove('error'); codeInp.classList.remove('error'); deptSel.classList.remove('error'); }, 1500);
      return;
    }

    const dupCode = ohEmployees.find(e => e.code.trim().toLowerCase() === code.toLowerCase() && e.id !== _ohEmpModalEditId);
    if (dupCode) {
      codeInp.classList.add('error');
      showToast(`Employee code "${code}" is already in use.`, 'error');
      setTimeout(() => codeInp.classList.remove('error'), 1500);
      return;
    }

    const salary      = document.getElementById('ohEmpSalary').value;
    const pan         = document.getElementById('ohEmpPan').value.trim().toUpperCase();
    const phone       = document.getElementById('ohEmpPhone').value.trim();
    const email       = document.getElementById('ohEmpEmail').value.trim();
    const address     = document.getElementById('ohEmpAddress').value.trim();
    const joiningDate = document.getElementById('ohEmpJoining').value;
    const designation = document.getElementById('ohEmpDesig').value.trim();

    if (_ohEmpModalEditId) {
      const emp = ohGetEmpById(_ohEmpModalEditId);
      if (emp) {
        const oldDeptId = emp.deptId;
        // Transfer rule: auto-clear head of old dept if this employee was head
        if (oldDeptId && oldDeptId !== deptId) {
          const oldDept = ohGetDeptById(oldDeptId);
          if (oldDept && oldDept.headEmpId === emp.id) {
            oldDept.headEmpId = null;
            showToast(`${name} was transferred. Head of "${oldDept.name}" has been cleared automatically.`, 'success');
          }
        }
        emp.code = code; emp.name = name; emp.designation = designation;
        emp.deptId = deptId; emp.joiningDate = joiningDate;
        emp.salary = salary !== '' ? Number(salary) : null;
        emp.pan = pan; emp.phone = phone; emp.email = email; emp.address = address;
      }
      showToast('Employee updated successfully.', 'success');
    } else {
      ohEmployees.push({
        id: _ohEmpCtr++, code, name, designation, deptId, joiningDate,
        salary: salary !== '' ? Number(salary) : null,
        pan, phone, email, address
      });
      showToast(`Employee "${name}" added successfully.`, 'success');
    }

    closeOhEmpModal();
    updateOhBadges();
    if (_ohActiveTab === 'dept') renderOhDeptView();
    else if (_ohActiveTab === 'emp') renderOhEmpView();
    triggerAutoBackup();
  }

  function deleteOhEmp(id) {
    const emp = ohGetEmpById(id);
    if (!emp) return;
    showKyaConfirm({
      title: 'Delete Employee?',
      message: `Permanently delete <strong>${ohEsc(emp.name)}</strong> (${ohEsc(emp.code)})?<br>This cannot be undone.`,
      confirmLabel: '✕ Delete',
      iconBg: '#fee2e2', iconColor: '#dc2626',
      iconSvg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.8"/></svg>',
      okBg: '#dc2626',
      onConfirm: () => {
        // Clear dept head if this employee was head of any dept
        ohDepartments.forEach(d => { if (d.headEmpId === id) d.headEmpId = null; });
        ohEmployees = ohEmployees.filter(e => e.id !== id);
        showToast(`Employee "${emp.name}" deleted.`, 'success');
        updateOhBadges();
        if (_ohActiveTab === 'dept') renderOhDeptView();
        else if (_ohActiveTab === 'emp') renderOhEmpView();
        triggerAutoBackup();
      }
    });
  }


