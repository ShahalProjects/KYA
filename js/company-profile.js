  function renderCompanyPanelOrganizer() {
    const wrap = document.getElementById('panel-company');
    if (!wrap) return;

    // Load initial data
    let coData = getCompanyDetails();
    if (!coData.gstins) coData.gstins = [];
    if (!coData.banks) coData.banks = [];
    if (!coData.people) coData.people = { directors: [], keyEmployees: [], auditor: {}, taxConsultant: {} };
    if (!coData.people.directors) coData.people.directors = [];
    if (!coData.people.keyEmployees) coData.people.keyEmployees = [];
    if (!coData.people.auditor) coData.people.auditor = {};
    if (!coData.people.taxConsultant) coData.people.taxConsultant = {};
    if (!coData.documents) coData.documents = [];
    if (!coData.insuranceAssets) coData.insuranceAssets = { policies: [], assets: [] };
    if (!coData.insuranceAssets.policies) coData.insuranceAssets.policies = [];
    if (!coData.insuranceAssets.assets) coData.insuranceAssets.assets = [];

    const initials = getCompanyInitials(coData.name);

    // Header layout
    wrap.innerHTML = `
      <div class="table-card" style="padding: 24px 28px;">
        <!-- Header strip -->
        <div class="je-card-header" style="background:linear-gradient(90deg,#1e40af,#2563eb,#0284c7);border-top-left-radius:12px;border-top-right-radius:12px;margin:-24px -28px 24px -28px;padding:20px 28px;display:flex;align-items:center;">
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="width:42px;height:42px;border-radius:11px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
                <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
                <line x1="12" y1="12" x2="12" y2="17"/><line x1="9" y1="14.5" x2="15" y2="14.5"/>
              </svg>
            </div>
            <div>
              <div style="font-size:17px;font-weight:800;color:#fff;letter-spacing:-.3px;">Company Profile & Vault</div>
              <div style="font-size:12px;color:rgba(255,255,255,.75);margin-top:2px;">Organize legal entities, compliance documents, bank accounts, and corporate vault</div>
            </div>
          </div>
        </div>

        <div class="oh-layout">
          <!-- Left: Sub-Navigation Tabs -->
          <div class="oh-sub-tabs" role="tablist">
            <button class="oh-sub-tab active" data-subtab="identity">
              <div class="oh-tab-icon-wrap" style="width:16px;height:16px;display:flex;align-items:center;justify-content:center;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <span class="oh-tab-text">Basic Identity</span>
            </button>
            <button class="oh-sub-tab" data-subtab="registrations">
              <div class="oh-tab-icon-wrap" style="width:16px;height:16px;display:flex;align-items:center;justify-content:center;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <span class="oh-tab-text">Legal & Registration</span>
            </button>
            <button class="oh-sub-tab" data-subtab="compliance">
              <div class="oh-tab-icon-wrap" style="width:16px;height:16px;display:flex;align-items:center;justify-content:center;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <span class="oh-tab-text">Tax & Compliance</span>
            </button>
            <button class="oh-sub-tab" data-subtab="banking">
              <div class="oh-tab-icon-wrap" style="width:16px;height:16px;display:flex;align-items:center;justify-content:center;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              </div>
              <span class="oh-tab-text">Banking</span>
            </button>
            <button class="oh-sub-tab" data-subtab="people">
              <div class="oh-tab-icon-wrap" style="width:16px;height:16px;display:flex;align-items:center;justify-content:center;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <span class="oh-tab-text">Key People</span>
            </button>
            <button class="oh-sub-tab" data-subtab="vault">
              <div class="oh-tab-icon-wrap" style="width:16px;height:16px;display:flex;align-items:center;justify-content:center;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
              </div>
              <span class="oh-tab-text">Document Vault</span>
            </button>
            <button class="oh-sub-tab" data-subtab="assets">
              <div class="oh-tab-icon-wrap" style="width:16px;height:16px;display:flex;align-items:center;justify-content:center;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              </div>
              <span class="oh-tab-text">Assets & Insurance</span>
            </button>
          </div>

          <!-- Right: Content Panels Area -->
          <div class="oh-content-area" id="coPanelContentArea">

            <!-- TAB 1: BASIC IDENTITY -->
            <div id="coSubpanel-identity" class="co-subpanel-content" style="display:block;">
              <div style="display:grid;grid-template-columns:1fr 280px;gap:28px;">
                <div style="display:flex;flex-direction:column;gap:18px;">
                  <div>
                    <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Company / Firm Name <span style="color:#ef4444;">*</span></label>
                    <input id="coNameInput" value="${ohEsc(coData.name||'')}" placeholder="e.g. Acme Enterprises Pvt Ltd" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;font-weight:600;color:#0f172a;outline:none;box-sizing:border-box;">
                  </div>
                  <div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                      <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;">Sidebar Display Name</label>
                      <span id="coDisplayNameCounter" style="font-size:10.5px;font-weight:700;color:#94a3b8;">${(coData.displayName||'').length}/22</span>
                    </div>
                    <input id="coDisplayNameInput" maxlength="22" value="${ohEsc(coData.displayName||'')}" placeholder="Short name shown in sidebar" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;font-weight:600;color:#0f172a;outline:none;box-sizing:border-box;">
                  </div>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div>
                      <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Business Type</label>
                      <select id="coBusinessType" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;color:#334155;outline:none;background:#fff;">
                        <option value="">Select Business Type</option>
                        <option value="Proprietorship" ${coData.businessType==='Proprietorship'?'selected':''}>Proprietorship</option>
                        <option value="Partnership" ${coData.businessType==='Partnership'?'selected':''}>Partnership</option>
                        <option value="LLP" ${coData.businessType==='LLP'?'selected':''}>LLP (Limited Liability Partnership)</option>
                        <option value="Pvt Ltd" ${coData.businessType==='Pvt Ltd'?'selected':''}>Pvt Ltd (Private Limited)</option>
                        <option value="Public Ltd" ${coData.businessType==='Public Ltd'?'selected':''}>Public Ltd (Public Limited)</option>
                        <option value="OPC" ${coData.businessType==='OPC'?'selected':''}>One Person Company (OPC)</option>
                        <option value="Trust" ${coData.businessType==='Trust'?'selected':''}>Trust / Society</option>
                        <option value="Others" ${coData.businessType==='Others'?'selected':''}>Others</option>
                      </select>
                    </div>
                    <div>
                      <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Date of Incorporation</label>
                      <input type="date" id="coIncDate" value="${ohEsc(coData.incDate||'')}" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;color:#334155;outline:none;">
                    </div>
                  </div>
                  <div>
                    <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Business Address</label>
                    <textarea id="coAddressInput" placeholder="Street, City, State, PIN" rows="3" style="width:100%;border:1.5px solid #e2e8f0;border-radius:9px;padding:10px 12px;font-size:13.5px;color:#334155;outline:none;resize:vertical;font-family:Inter,sans-serif;line-height:1.4;">${ohEsc(coData.address||'')}</textarea>
                  </div>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div>
                      <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Phone</label>
                      <input id="coPhoneInput" value="${ohEsc(coData.phone||'')}" placeholder="+91 98765 43210" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;color:#334155;outline:none;">
                    </div>
                    <div>
                      <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Email</label>
                      <input id="coEmailInput" type="email" value="${ohEsc(coData.email||'')}" placeholder="accounts@company.com" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;color:#334155;outline:none;">
                    </div>
                  </div>
                  <div>
                    <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Website</label>
                    <input id="coWebsiteInput" value="${ohEsc(coData.website||'')}" placeholder="https://www.yourcompany.com" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;color:#334155;outline:none;">
                  </div>
                </div>

                <!-- Custom Logo Upload Column -->
                <div>
                  <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:12px;">Company Logo / Icon</label>
                  <div style="background:#fafbfc;border:1.5px dashed #cbd5e1;border-radius:12px;padding:20px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px;">
                    <div id="coPreviewAvatar" style="width:72px;height:72px;border-radius:16px;background:${coData.iconImage ? `url(${coData.iconImage})` : 'linear-gradient(135deg,#2563eb,#059669)'};background-size:cover;background-position:center;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:#fff;">${coData.iconImage ? '' : initials}</div>
                    
                    <div style="display:flex;gap:8px;justify-content:center;">
                      <button type="button" id="coUploadBtn" style="height:32px;padding:0 12px;border:1.5px solid #cbd5e1;border-radius:6px;background:#fff;color:#334155;font-size:12px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;display:flex;align-items:center;gap:4px;">
                        Upload Logo
                      </button>
                      <button type="button" id="coRemoveImageBtn" style="height:32px;padding:0 10px;border:none;border-radius:6px;background:#fee2e2;color:#b91c1c;font-size:12px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;display:${coData.iconImage ? 'block' : 'none'};">
                        Remove
                      </button>
                    </div>
                    <input type="file" id="coFileInput" accept="image/*" style="display:none;">
                    <input type="hidden" id="coIconImage" value="${ohEsc(coData.iconImage || '')}">
                    <div style="font-size:10.5px;color:#94a3b8;line-height:1.3;">JPG, PNG, SVG supported.<br>Square aspect ratio works best.</div>
                  </div>
                </div>
              </div>

              <div style="margin-top:28px;border-top:1px solid #e2e8f0;padding-top:16px;">
                <button type="button" class="co-save-section-btn" data-section="identity" style="height:40px;padding:0 24px;border:none;border-radius:8px;background:#2563eb;color:#fff;font-size:13.5px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(37,99,235,.2);">Save Basic Identity</button>
              </div>
            </div>

            <!-- TAB 2: LEGAL & REGISTRATIONS -->
            <div id="coSubpanel-registrations" class="co-subpanel-content" style="display:none;">
              <div style="display:flex;flex-direction:column;gap:20px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
                  <div>
                    <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Permanent Account Number (PAN)</label>
                    <input id="coPAN" value="${ohEsc(coData.pan||'')}" placeholder="e.g. ABCDE1234F" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;font-weight:600;color:#0f172a;text-transform:uppercase;outline:none;box-sizing:border-box;">
                  </div>
                  <div>
                    <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Corporate Identification Number (CIN)</label>
                    <input id="coCIN" value="${ohEsc(coData.cin||'')}" placeholder="e.g. U72200MH2020PTC123456" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;font-weight:600;color:#0f172a;text-transform:uppercase;outline:none;box-sizing:border-box;">
                  </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
                  <div>
                    <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Udyam / MSME Registration Number</label>
                    <input id="coUdyam" value="${ohEsc(coData.udyam||'')}" placeholder="e.g. UDYAM-XX-00-0000000" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;outline:none;box-sizing:border-box;">
                  </div>
                  <div>
                    <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Trade License Number</label>
                    <input id="coTradeLicense" value="${ohEsc(coData.tradeLicense||'')}" placeholder="License Number" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;outline:none;box-sizing:border-box;">
                  </div>
                </div>
                <div>
                  <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Import Export Code (IEC)</label>
                  <input id="coIEC" value="${ohEsc(coData.iec||'')}" placeholder="10-digit Code" style="width:50%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;outline:none;box-sizing:border-box;">
                </div>

                <!-- GSTIN Registrations List -->
                <div style="margin-top:16px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;">GSTIN Registrations</label>
                    <button type="button" id="coAddGstinBtn" style="height:28px;padding:0 10px;border:none;border-radius:6px;background:#e0f2fe;color:#0369a1;font-size:11.5px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px;">
                      + Add GSTIN
                    </button>
                  </div>
                  <div style="border:1.5px solid #e2e8f0;border-radius:10px;background:#fff;padding:8px 12px;min-height:60px;">
                    <div id="coGstinsListContainer"></div>
                  </div>
                </div>
              </div>

              <div style="margin-top:28px;border-top:1px solid #e2e8f0;padding-top:16px;">
                <button type="button" class="co-save-section-btn" data-section="registrations" style="height:40px;padding:0 24px;border:none;border-radius:8px;background:#2563eb;color:#fff;font-size:13.5px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(37,99,235,.2);">Save Registrations</button>
              </div>
            </div>

            <!-- TAB 3: TAX & COMPLIANCE -->
            <div id="coSubpanel-compliance" class="co-subpanel-content" style="display:none;">
              <div style="display:flex;flex-direction:column;gap:20px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
                  <div>
                    <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Tax Deduction Account Number (TAN)</label>
                    <input id="coTAN" value="${ohEsc(coData.tan||'')}" placeholder="e.g. MUMB12345C" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;font-weight:600;color:#0f172a;text-transform:uppercase;outline:none;box-sizing:border-box;">
                  </div>
                  <div>
                    <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Professional Tax Reg Number</label>
                    <input id="coProfTax" value="${ohEsc(coData.profTax||'')}" placeholder="PT Registration Number" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;outline:none;box-sizing:border-box;">
                  </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
                  <div>
                    <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">ESI / PF Registration Code</label>
                    <input id="coEsiPf" value="${ohEsc(coData.esiPf||'')}" placeholder="EPF & ESIC Code Number" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;outline:none;box-sizing:border-box;">
                  </div>
                  <div>
                    <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Shop & Establishment License Number</label>
                    <input id="coShopLicense" value="${ohEsc(coData.shopLicense||'')}" placeholder="Shop License ID" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;outline:none;box-sizing:border-box;">
                  </div>
                </div>
              </div>

              <div style="margin-top:28px;border-top:1px solid #e2e8f0;padding-top:16px;">
                <button type="button" class="co-save-section-btn" data-section="compliance" style="height:40px;padding:0 24px;border:none;border-radius:8px;background:#2563eb;color:#fff;font-size:13.5px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(37,99,235,.2);">Save Compliance Info</button>
              </div>
            </div>

            <!-- TAB 4: BANKING -->
            <div id="coSubpanel-banking" class="co-subpanel-content" style="display:none;">
              <div style="display:flex;flex-direction:column;gap:16px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <div style="font-size:12px;color:#64748b;font-weight:500;">Add and manage all company bank accounts. Specify the primary account for payouts.</div>
                  <button type="button" id="coAddBankBtn" style="height:32px;padding:0 14px;border:none;border-radius:6px;background:#e0f2fe;color:#0369a1;font-size:12.5px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px;">
                    + Add Bank Account
                  </button>
                </div>
                <div style="border:1.5px solid #e2e8f0;border-radius:10px;background:#fff;padding:8px 12px;min-height:100px;overflow-x:auto;">
                  <div id="coBanksListContainer"></div>
                </div>
              </div>

              <div style="margin-top:28px;border-top:1px solid #e2e8f0;padding-top:16px;">
                <button type="button" class="co-save-section-btn" data-section="banking" style="height:40px;padding:0 24px;border:none;border-radius:8px;background:#2563eb;color:#fff;font-size:13.5px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(37,99,235,.2);">Save Bank Accounts</button>
              </div>
            </div>

            <!-- TAB 5: KEY PEOPLE -->
            <div id="coSubpanel-people" class="co-subpanel-content" style="display:none;">
              <div style="display:flex;flex-direction:column;gap:20px;">
                <!-- Directors / Partners -->
                <div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;">Directors / Partners / Proprietor</label>
                    <button type="button" id="coAddDirectorBtn" style="height:28px;padding:0 10px;border:none;border-radius:6px;background:#e0f2fe;color:#0369a1;font-size:11.5px;font-weight:700;cursor:pointer;">
                      + Add Person
                    </button>
                  </div>
                  <div style="border:1.5px solid #e2e8f0;border-radius:10px;background:#fff;padding:8px 12px;overflow-x:auto;">
                    <div id="coDirectorsListContainer"></div>
                  </div>
                </div>

                <!-- Advisors & Partners -->
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:8px;">
                  <div style="border:1.5px solid #e2e8f0;border-radius:10px;padding:16px;background:#fafbfc;">
                    <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#475569;margin-bottom:12px;">Auditor Details</label>
                    <div style="display:flex;flex-direction:column;gap:10px;">
                      <input id="coAuditorName" value="${ohEsc(coData.people.auditor.name||'')}" placeholder="Auditor Name" style="width:100%;height:36px;border:1.5px solid #e2e8f0;border-radius:6px;padding:0 10px;font-size:13px;outline:none;">
                      <input id="coAuditorContact" value="${ohEsc(coData.people.auditor.contact||'')}" placeholder="Phone or Email" style="width:100%;height:36px;border:1.5px solid #e2e8f0;border-radius:6px;padding:0 10px;font-size:13px;outline:none;">
                    </div>
                  </div>
                  <div style="border:1.5px solid #e2e8f0;border-radius:10px;padding:16px;background:#fafbfc;">
                    <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#475569;margin-bottom:12px;">CA / Tax Consultant Contact</label>
                    <div style="display:flex;flex-direction:column;gap:10px;">
                      <input id="coConsultantName" value="${ohEsc(coData.people.taxConsultant.name||'')}" placeholder="Consultant Name" style="width:100%;height:36px;border:1.5px solid #e2e8f0;border-radius:6px;padding:0 10px;font-size:13px;outline:none;">
                      <input id="coConsultantContact" value="${ohEsc(coData.people.taxConsultant.contact||'')}" placeholder="Phone or Email" style="width:100%;height:36px;border:1.5px solid #e2e8f0;border-radius:6px;padding:0 10px;font-size:13px;outline:none;">
                    </div>
                  </div>
                </div>

                <!-- Key Employees -->
                <div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;margin-top:8px;">
                    <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;">Key Employees</label>
                    <button type="button" id="coAddEmployeeBtn" style="height:28px;padding:0 10px;border:none;border-radius:6px;background:#e0f2fe;color:#0369a1;font-size:11.5px;font-weight:700;cursor:pointer;">
                      + Add Employee
                    </button>
                  </div>
                  <div style="border:1.5px solid #e2e8f0;border-radius:10px;background:#fff;padding:8px 12px;overflow-x:auto;">
                    <div id="coEmployeesListContainer"></div>
                  </div>
                </div>
              </div>

              <div style="margin-top:28px;border-top:1px solid #e2e8f0;padding-top:16px;">
                <button type="button" class="co-save-section-btn" data-section="people" style="height:40px;padding:0 24px;border:none;border-radius:8px;background:#2563eb;color:#fff;font-size:13.5px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(37,99,235,.2);">Save Key People</button>
              </div>
            </div>

            <!-- TAB 6: DOCUMENT VAULT -->
            <div id="coSubpanel-vault" class="co-subpanel-content" style="display:none;">
              <div style="display:flex;flex-direction:column;gap:20px;">
                <!-- Upload File Box -->
                <div style="border:1.5px solid #e2e8f0;border-radius:16px;padding:24px;background:#ffffff;box-shadow:0 4px 20px rgba(0,0,0,0.03);display:flex;flex-direction:column;gap:18px;">
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div>
                      <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Document Title *</label>
                      <input id="coDocTitle" placeholder="e.g. MOA Document" style="width:100%;height:40px;border:1.5px solid #cbd5e1;border-radius:10px;padding:0 12px;font-size:13.5px;outline:none;background:#fff;box-sizing:border-box;">
                    </div>
                    <div>
                      <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Category</label>
                      <select id="coDocCategory" style="width:100%;height:40px;border:1.5px solid #cbd5e1;border-radius:10px;padding:0 12px;font-size:13.5px;color:#334155;outline:none;background:#fff;box-sizing:border-box;">
                        <option value="Incorporation">Incorporation / Registration</option>
                        <option value="PAN_GST">PAN Card & GST Certificates</option>
                        <option value="Deed_MOA">MOA/AOA / Partnership Deed</option>
                        <option value="Banking">Cancelled Cheque / Bank Docs</option>
                        <option value="Property">Rental / Lease Agreements</option>
                        <option value="Insurance">Insurance Certificates</option>
                        <option value="Finance">Financials & Audited Reports</option>
                        <option value="Resolutions">Board Resolutions</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style="display:block;font-size:11.5px;font-weight:700;color:#475569;margin-bottom:8px;">File Attachment *</label>
                    
                    <!-- Hidden file input -->
                    <input type="file" id="coDocFileInput" style="display:none;">

                    <!-- Modern Dropzone -->
                    <div id="coDocDropzone" class="cl-dropzone" style="padding: 22px 16px;">
                      <div class="cl-dropzone-icon-bg" style="width:46px;height:46px;margin-bottom:10px;">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      </div>
                      <div class="cl-dropzone-title" style="font-size:13.5px;">Click to upload or drag & drop document</div>
                      <div class="cl-dropzone-subtitle" style="font-size:11.5px;margin-bottom:10px;">PDF, DOCX, PNG, JPG, or XLSX files</div>
                      <div class="cl-dropzone-tags">
                        <span class="cl-dropzone-tag">PDF</span>
                        <span class="cl-dropzone-tag">DOCX</span>
                        <span class="cl-dropzone-tag">IMAGES</span>
                      </div>
                    </div>

                    <!-- Selected File Preview Card -->
                    <div id="coDocSelectedCard" class="cl-file-card" style="display:none;">
                      <div id="coDocFileIcon" class="cl-file-icon excel">DOC</div>
                      <div class="cl-file-info">
                        <div id="coDocFileName" class="cl-file-name">document.pdf</div>
                        <div class="cl-file-meta">
                          <span id="coDocFileSize">0 KB</span>
                          <span>•</span>
                          <span class="cl-file-badge success">✓ File Selected</span>
                        </div>
                      </div>
                      <button id="coDocChangeFileBtn" class="cl-file-remove-btn" type="button">Change</button>
                    </div>
                  </div>

                  <div style="display:flex;justify-content:flex-end;">
                    <button type="button" id="coDocUploadBtn" style="height:40px;padding:0 24px;border:none;border-radius:10px;background:linear-gradient(135deg, #0284c7, #0369a1);color:#fff;font-size:13.5px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(2,132,199,0.25);display:flex;align-items:center;gap:6px;">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      Upload to Vault
                    </button>
                  </div>
                </div>

                <!-- Vault Documents list -->
                <div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;">Vault Documents</label>
                    <input id="coDocSearch" placeholder="Search files..." style="width:200px;height:28px;border:1.5px solid #cbd5e1;border-radius:6px;padding:0 10px;font-size:12px;outline:none;">
                  </div>
                  <div style="border:1.5px solid #e2e8f0;border-radius:10px;background:#fff;padding:8px 12px;min-height:100px;">
                    <div id="coDocsListContainer"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 7: ASSETS & INSURANCE -->
            <div id="coSubpanel-assets" class="co-subpanel-content" style="display:none;">
              <div style="display:flex;flex-direction:column;gap:20px;">
                <!-- Insurance Policies -->
                <div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;">Insurance Policies</label>
                    <button type="button" id="coAddPolicyBtn" style="height:28px;padding:0 10px;border:none;border-radius:6px;background:#e0f2fe;color:#0369a1;font-size:11.5px;font-weight:700;cursor:pointer;">
                      + Add Policy
                    </button>
                  </div>
                  <div style="border:1.5px solid #e2e8f0;border-radius:10px;background:#fff;padding:8px 12px;overflow-x:auto;">
                    <div id="coPoliciesListContainer"></div>
                  </div>
                </div>

                <!-- Major Assets -->
                <div>
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;">Major Fixed Assets</label>
                    <button type="button" id="coAddAssetBtn" style="height:28px;padding:0 10px;border:none;border-radius:6px;background:#e0f2fe;color:#0369a1;font-size:11.5px;font-weight:700;cursor:pointer;">
                      + Add Asset
                    </button>
                  </div>
                  <div style="border:1.5px solid #e2e8f0;border-radius:10px;background:#fff;padding:8px 12px;overflow-x:auto;">
                    <div id="coAssetsListContainer"></div>
                  </div>
                </div>
              </div>

              <div style="margin-top:28px;border-top:1px solid #e2e8f0;padding-top:16px;">
                <button type="button" class="co-save-section-btn" data-section="assets" style="height:40px;padding:0 24px;border:none;border-radius:8px;background:#2563eb;color:#fff;font-size:13.5px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(37,99,235,.2);">Save Assets & Policies</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;

    // ── SUB-TABS INTERACTIVE NAVIGATION ──
    const tabs = wrap.querySelectorAll('.oh-sub-tab');
    const panels = wrap.querySelectorAll('.co-subpanel-content');

    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const subtab = btn.dataset.subtab;
        tabs.forEach(t => t.classList.remove('active'));
        btn.classList.add('active');

        panels.forEach(p => p.style.display = 'none');
        const activePanel = wrap.querySelector(`#coSubpanel-${subtab}`);
        if (activePanel) activePanel.style.display = 'block';
      });
    });

    // ── LIVE FORM BINDING & PERSISTENCE ──
    
    // Focus styling
    wrap.querySelectorAll('input,textarea,select').forEach(el => {
      el.addEventListener('focus', () => { el.style.borderColor='#3b82f6'; el.style.boxShadow='0 0 0 3px rgba(59,130,246,.12)'; });
      el.addEventListener('blur',  () => { el.style.borderColor='#e2e8f0'; el.style.boxShadow='none'; });
    });

    // 1. Identity handlers
    const nameInp = wrap.querySelector('#coNameInput');
    const dispInp = wrap.querySelector('#coDisplayNameInput');
    const counter = wrap.querySelector('#coDisplayNameCounter');
    const previewAvatar = wrap.querySelector('#coPreviewAvatar');

    dispInp.addEventListener('input', () => {
      counter.textContent = `${dispInp.value.length}/22`;
      counter.style.color = dispInp.value.length >= 20 ? '#ef4444' : '#94a3b8';
      wrap.querySelector('#coPreviewAvatar').textContent = coData.iconImage ? '' : getCompanyInitials(nameInp.value || dispInp.value);
    });
    nameInp.addEventListener('input', () => {
      wrap.querySelector('#coPreviewAvatar').textContent = coData.iconImage ? '' : getCompanyInitials(nameInp.value || dispInp.value);
    });

    // Logo image file upload wiring
    const fileInp = wrap.querySelector('#coFileInput');
    const uploadBtn = wrap.querySelector('#coUploadBtn');
    const removeBtn = wrap.querySelector('#coRemoveImageBtn');
    const imageInp = wrap.querySelector('#coIconImage');

    uploadBtn.addEventListener('click', () => fileInp.click());

    fileInp.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64 = evt.target.result;
        imageInp.value = base64;
        coData.iconImage = base64;
        previewAvatar.textContent = '';
        previewAvatar.style.backgroundImage = `url(${base64})`;
        removeBtn.style.display = 'block';
      };
      reader.readAsDataURL(file);
    });

    removeBtn.addEventListener('click', () => {
      imageInp.value = '';
      coData.iconImage = '';
      fileInp.value = '';
      previewAvatar.style.backgroundImage = 'none';
      previewAvatar.textContent = getCompanyInitials(nameInp.value || dispInp.value);
      removeBtn.style.display = 'none';
    });


    // ── DYNAMIC LIST RENDERING ──

    // 2. GSTINs List
    const renderGstins = () => {
      const cont = wrap.querySelector('#coGstinsListContainer');
      if (coData.gstins.length === 0) {
        cont.innerHTML = `<div style="font-size:12.5px;color:#94a3b8;text-align:center;padding:12px 0;">No GSTIN registrations added.</div>`;
        return;
      }
      let html = `<table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="border-bottom:1.5px solid #cbd5e1;color:#475569;font-weight:700;text-align:left;">
            <th style="padding:8px 6px;">State / Union Territory</th>
            <th style="padding:8px 6px;">GSTIN</th>
            <th style="padding:8px 6px;text-align:right;width:60px;">Action</th>
          </tr>
        </thead>
        <tbody>`;
      coData.gstins.forEach((g, idx) => {
        html += `<tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:6px;"><input data-list="gstins" data-index="${idx}" data-field="state" value="${ohEsc(g.state||'')}" placeholder="e.g. Maharashtra" style="width:100%;height:32px;border:1px solid #e2e8f0;border-radius:6px;padding:0 8px;outline:none;"></td>
          <td style="padding:6px;"><input data-list="gstins" data-index="${idx}" data-field="gstin" value="${ohEsc(g.gstin||'')}" placeholder="27AAAAA0000A1Z5" style="width:100%;height:32px;border:1px solid #e2e8f0;border-radius:6px;padding:0 8px;text-transform:uppercase;outline:none;"></td>
          <td style="padding:6px;text-align:right;"><button type="button" class="co-del-list-btn" data-list="gstins" data-index="${idx}" style="border:none;background:none;color:#ef4444;font-size:12px;font-weight:700;cursor:pointer;">Delete</button></td>
        </tr>`;
      });
      html += `</tbody></table>`;
      cont.innerHTML = html;
    };

    wrap.querySelector('#coAddGstinBtn').addEventListener('click', () => {
      coData.gstins.push({ state: '', gstin: '' });
      renderGstins();
    });

    // 4. Banking List
    const renderBanks = () => {
      const cont = wrap.querySelector('#coBanksListContainer');
      if (coData.banks.length === 0) {
        cont.innerHTML = `<div style="font-size:12.5px;color:#94a3b8;text-align:center;padding:16px 0;">No bank accounts configured.</div>`;
        return;
      }
      let html = `<table style="width:100%;border-collapse:collapse;font-size:13px;min-width:700px;">
        <thead>
          <tr style="border-bottom:1.5px solid #cbd5e1;color:#475569;font-weight:700;text-align:left;">
            <th style="padding:8px;width:150px;">Bank Name</th>
            <th style="padding:8px;width:160px;">Account Number</th>
            <th style="padding:8px;width:110px;">IFSC Code</th>
            <th style="padding:8px;width:120px;">Branch</th>
            <th style="padding:8px;width:110px;">Type</th>
            <th style="padding:8px;text-align:center;width:70px;">Primary</th>
            <th style="padding:8px;text-align:right;width:60px;">Action</th>
          </tr>
        </thead>
        <tbody>`;
      coData.banks.forEach((b, idx) => {
        html += `<tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:6px;"><input data-list="banks" data-index="${idx}" data-field="bankName" value="${ohEsc(b.bankName||'')}" placeholder="e.g. HDFC Bank" style="width:100%;height:32px;border:1px solid #e2e8f0;border-radius:6px;padding:0 8px;outline:none;"></td>
          <td style="padding:6px;"><input data-list="banks" data-index="${idx}" data-field="accNo" value="${ohEsc(b.accNo||'')}" placeholder="Account No" style="width:100%;height:32px;border:1px solid #e2e8f0;border-radius:6px;padding:0 8px;outline:none;"></td>
          <td style="padding:6px;"><input data-list="banks" data-index="${idx}" data-field="ifsc" value="${ohEsc(b.ifsc||'')}" placeholder="IFSC" style="width:100%;height:32px;border:1px solid #e2e8f0;border-radius:6px;padding:0 8px;text-transform:uppercase;outline:none;"></td>
          <td style="padding:6px;"><input data-list="banks" data-index="${idx}" data-field="branch" value="${ohEsc(b.branch||'')}" placeholder="Branch Name" style="width:100%;height:32px;border:1px solid #e2e8f0;border-radius:6px;padding:0 8px;outline:none;"></td>
          <td style="padding:6px;">
            <select data-list="banks" data-index="${idx}" data-field="type" style="width:100%;height:32px;border:1px solid #e2e8f0;border-radius:6px;padding:0 4px;outline:none;background:#fff;">
              <option value="Current" ${b.type==='Current'?'selected':''}>Current</option>
              <option value="Savings" ${b.type==='Savings'?'selected':''}>Savings</option>
              <option value="Overdraft" ${b.type==='Overdraft'?'selected':''}>OD / CC</option>
            </select>
          </td>
          <td style="padding:6px;text-align:center;"><input type="checkbox" data-list="banks" data-index="${idx}" data-field="isPrimary" ${b.isPrimary?'checked':''} style="transform:scale(1.2);cursor:pointer;"></td>
          <td style="padding:6px;text-align:right;"><button type="button" class="co-del-list-btn" data-list="banks" data-index="${idx}" style="border:none;background:none;color:#ef4444;font-size:12px;font-weight:700;cursor:pointer;">Delete</button></td>
        </tr>`;
      });
      html += `</tbody></table>`;
      cont.innerHTML = html;
    };

    wrap.querySelector('#coAddBankBtn').addEventListener('click', () => {
      coData.banks.push({ bankName: '', accNo: '', ifsc: '', branch: '', type: 'Current', isPrimary: coData.banks.length === 0 });
      renderBanks();
    });

    // 5. Directors List
    const renderDirectors = () => {
      const cont = wrap.querySelector('#coDirectorsListContainer');
      if (coData.people.directors.length === 0) {
        cont.innerHTML = `<div style="font-size:12.5px;color:#94a3b8;text-align:center;padding:12px 0;">No director/partner details added.</div>`;
        return;
      }
      let html = `<table style="width:100%;border-collapse:collapse;font-size:13px;min-width:600px;">
        <thead>
          <tr style="border-bottom:1.5px solid #cbd5e1;color:#475569;font-weight:700;text-align:left;">
            <th style="padding:8px;">Name</th>
            <th style="padding:8px;width:120px;">Role</th>
            <th style="padding:8px;width:120px;">PAN</th>
            <th style="padding:8px;width:130px;">Aadhaar</th>
            <th style="padding:8px;width:110px;">DIN (if applicable)</th>
            <th style="padding:8px;text-align:right;width:60px;">Action</th>
          </tr>
        </thead>
        <tbody>`;
      coData.people.directors.forEach((d, idx) => {
        html += `<tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:6px;"><input data-list="directors" data-index="${idx}" data-field="name" value="${ohEsc(d.name||'')}" placeholder="Name" style="width:100%;height:32px;border:1px solid #e2e8f0;border-radius:6px;padding:0 8px;outline:none;"></td>
          <td style="padding:6px;"><input data-list="directors" data-index="${idx}" data-field="role" value="${ohEsc(d.role||'')}" placeholder="e.g. Director" style="width:100%;height:32px;border:1px solid #e2e8f0;border-radius:6px;padding:0 8px;outline:none;"></td>
          <td style="padding:6px;"><input data-list="directors" data-index="${idx}" data-field="pan" value="${ohEsc(d.pan||'')}" placeholder="PAN" style="width:100%;height:32px;border:1px solid #e2e8f0;border-radius:6px;padding:0 8px;text-transform:uppercase;outline:none;"></td>
          <td style="padding:6px;"><input data-list="directors" data-index="${idx}" data-field="aadhaar" value="${ohEsc(d.aadhaar||'')}" placeholder="Aadhaar" style="width:100%;height:32px;border:1px solid #e2e8f0;border-radius:6px;padding:0 8px;outline:none;"></td>
          <td style="padding:6px;"><input data-list="directors" data-index="${idx}" data-field="din" value="${ohEsc(d.din||'')}" placeholder="DIN" style="width:100%;height:32px;border:1px solid #e2e8f0;border-radius:6px;padding:0 8px;outline:none;"></td>
          <td style="padding:6px;text-align:right;"><button type="button" class="co-del-list-btn" data-list="directors" data-index="${idx}" style="border:none;background:none;color:#ef4444;font-size:12px;font-weight:700;cursor:pointer;">Delete</button></td>
        </tr>`;
      });
      html += `</tbody></table>`;
      cont.innerHTML = html;
    };

    wrap.querySelector('#coAddDirectorBtn').addEventListener('click', () => {
      coData.people.directors.push({ name: '', role: '', pan: '', aadhaar: '', din: '' });
      renderDirectors();
    });

    // 5. Employees List
    const renderEmployees = () => {
      const cont = wrap.querySelector('#coEmployeesListContainer');
      if (coData.people.keyEmployees.length === 0) {
        cont.innerHTML = `<div style="font-size:12.5px;color:#94a3b8;text-align:center;padding:12px 0;">No employee contacts added.</div>`;
        return;
      }
      let html = `<table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="border-bottom:1.5px solid #cbd5e1;color:#475569;font-weight:700;text-align:left;">
            <th style="padding:8px;">Name</th>
            <th style="padding:8px;width:160px;">Role</th>
            <th style="padding:8px;width:150px;">Phone</th>
            <th style="padding:8px;width:180px;">Email</th>
            <th style="padding:8px;text-align:right;width:60px;">Action</th>
          </tr>
        </thead>
        <tbody>`;
      coData.people.keyEmployees.forEach((e, idx) => {
        html += `<tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:6px;"><input data-list="keyEmployees" data-index="${idx}" data-field="name" value="${ohEsc(e.name||'')}" placeholder="Name" style="width:100%;height:32px;border:1px solid #e2e8f0;border-radius:6px;padding:0 8px;outline:none;"></td>
          <td style="padding:6px;"><input data-list="keyEmployees" data-index="${idx}" data-field="role" value="${ohEsc(e.role||'')}" placeholder="Role" style="width:100%;height:32px;border:1px solid #e2e8f0;border-radius:6px;padding:0 8px;outline:none;"></td>
          <td style="padding:6px;"><input data-list="keyEmployees" data-index="${idx}" data-field="phone" value="${ohEsc(e.phone||'')}" placeholder="Phone" style="width:100%;height:32px;border:1px solid #e2e8f0;border-radius:6px;padding:0 8px;outline:none;"></td>
          <td style="padding:6px;"><input data-list="keyEmployees" data-index="${idx}" data-field="email" value="${ohEsc(e.email||'')}" placeholder="Email" style="width:100%;height:32px;border:1px solid #e2e8f0;border-radius:6px;padding:0 8px;outline:none;"></td>
          <td style="padding:6px;text-align:right;"><button type="button" class="co-del-list-btn" data-list="keyEmployees" data-index="${idx}" style="border:none;background:none;color:#ef4444;font-size:12px;font-weight:700;cursor:pointer;">Delete</button></td>
        </tr>`;
      });
      html += `</tbody></table>`;
      cont.innerHTML = html;
    };

    wrap.querySelector('#coAddEmployeeBtn').addEventListener('click', () => {
      coData.people.keyEmployees.push({ name: '', role: '', phone: '', email: '' });
      renderEmployees();
    });

    // 6. Document Vault List
    const renderDocumentsList = () => {
      const cont = wrap.querySelector('#coDocsListContainer');
      const query = wrap.querySelector('#coDocSearch').value.trim().toLowerCase();
      
      const filtered = coData.documents.filter(d => 
        d.title.toLowerCase().includes(query) || d.category.toLowerCase().includes(query) || d.fileName.toLowerCase().includes(query)
      );

      if (filtered.length === 0) {
        cont.innerHTML = `<div style="font-size:12.5px;color:#94a3b8;text-align:center;padding:24px 0;">No documents match your query or have been uploaded.</div>`;
        return;
      }
      
      let html = `<table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="border-bottom:1.5px solid #cbd5e1;color:#475569;font-weight:700;text-align:left;">
            <th style="padding:8px;">Document Title</th>
            <th style="padding:8px;width:180px;">Category</th>
            <th style="padding:8px;width:220px;">Filename</th>
            <th style="padding:8px;text-align:right;width:120px;">Actions</th>
          </tr>
        </thead>
        <tbody>`;
      filtered.forEach((d, idx) => {
        const actualIdx = coData.documents.findIndex(orig => orig.id === d.id);
        html += `<tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:8px;font-weight:600;color:#0f172a;">${ohEsc(d.title)}</td>
          <td style="padding:8px;color:#475569;"><span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">${ohEsc(d.category)}</span></td>
          <td style="padding:8px;color:#64748b;font-family:monospace;font-size:12px;">${ohEsc(d.fileName)}</td>
          <td style="padding:8px;text-align:right;">
            <button type="button" class="co-download-doc-btn" data-index="${actualIdx}" style="border:none;background:none;color:#0284c7;font-size:12.5px;font-weight:700;cursor:pointer;margin-right:12px;">Download</button>
            <button type="button" class="co-del-list-btn" data-list="documents" data-index="${actualIdx}" style="border:none;background:none;color:#ef4444;font-size:12.5px;font-weight:700;cursor:pointer;">Delete</button>
          </td>
        </tr>`;
      });
      html += `</tbody></table>`;
      cont.innerHTML = html;
    };

    wrap.querySelector('#coDocSearch').addEventListener('input', renderDocumentsList);

    // Wire up Document Vault Drag & Drop Dropzone
    const docDropzone = wrap.querySelector('#coDocDropzone');
    const docFileInput = wrap.querySelector('#coDocFileInput');
    const docSelectedCard = wrap.querySelector('#coDocSelectedCard');
    const docFileNameEl = wrap.querySelector('#coDocFileName');
    const docFileSizeEl = wrap.querySelector('#coDocFileSize');
    const docFileIconEl = wrap.querySelector('#coDocFileIcon');
    const docChangeFileBtn = wrap.querySelector('#coDocChangeFileBtn');

    function formatDocBytes(bytes) {
      if (!bytes || bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function updateDocSelectedUI(file) {
      if (!file) {
        if (docDropzone) docDropzone.style.display = 'flex';
        if (docSelectedCard) docSelectedCard.style.display = 'none';
        return;
      }
      const name = file.name;
      const ext = name.split('.').pop().toLowerCase();
      
      if (docFileIconEl) {
        docFileIconEl.textContent = ext.substring(0, 4).toUpperCase();
        if (ext === 'pdf') {
          docFileIconEl.className = 'cl-file-icon excel';
          docFileIconEl.style.background = '#fee2e2';
          docFileIconEl.style.color = '#b91c1c';
          docFileIconEl.style.borderColor = '#fca5a5';
        } else if (['jpg', 'jpeg', 'png', 'svg', 'webp'].includes(ext)) {
          docFileIconEl.className = 'cl-file-icon csv';
          docFileIconEl.style.background = '';
          docFileIconEl.style.color = '';
          docFileIconEl.style.borderColor = '';
        } else {
          docFileIconEl.className = 'cl-file-icon excel';
          docFileIconEl.style.background = '';
          docFileIconEl.style.color = '';
          docFileIconEl.style.borderColor = '';
        }
      }
      
      if (docFileNameEl) docFileNameEl.textContent = name;
      if (docFileSizeEl) docFileSizeEl.textContent = formatDocBytes(file.size);
      
      if (docDropzone) docDropzone.style.display = 'none';
      if (docSelectedCard) docSelectedCard.style.display = 'flex';
    }

    if (docDropzone && docFileInput) {
      docDropzone.addEventListener('click', () => docFileInput.click());
      if (docChangeFileBtn) docChangeFileBtn.addEventListener('click', () => docFileInput.click());

      docFileInput.addEventListener('change', () => {
        if (docFileInput.files && docFileInput.files[0]) {
          updateDocSelectedUI(docFileInput.files[0]);
        }
      });

      ['dragenter', 'dragover'].forEach(eventName => {
        docDropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          docDropzone.classList.add('dragover');
        }, false);
      });

      ['dragleave', 'drop'].forEach(eventName => {
        docDropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          docDropzone.classList.remove('dragover');
        }, false);
      });

      docDropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt?.files;
        if (files && files.length > 0) {
          try {
            docFileInput.files = files;
          } catch (err) {}
          updateDocSelectedUI(files[0]);
        }
      });
    }

    wrap.querySelector('#coDocUploadBtn').addEventListener('click', () => {
      const title = wrap.querySelector('#coDocTitle').value.trim();
      const cat = wrap.querySelector('#coDocCategory').value;
      const fileInput = wrap.querySelector('#coDocFileInput');
      const file = fileInput.files[0];
      
      if (!title || !file) {
        showToast('Please provide a document title and select a file.', 'warning');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (evt) => {
        coData.documents.push({
          id: 'doc_' + Date.now(),
          title,
          category: cat,
          fileName: file.name,
          fileData: evt.target.result
        });
        
        wrap.querySelector('#coDocTitle').value = '';
        fileInput.value = '';
        updateDocSelectedUI(null);
        renderDocumentsList();
        saveCompanyDetails(coData);
        showToast('Document uploaded to vault.', 'success');
      };
      reader.readAsDataURL(file);
    });

    // 7. Insurance Policies List
    const renderPolicies = () => {
      const cont = wrap.querySelector('#coPoliciesListContainer');
      if (coData.insuranceAssets.policies.length === 0) {
        cont.innerHTML = `<div style="font-size:12.5px;color:#94a3b8;text-align:center;padding:12px 0;">No insurance policies added.</div>`;
        return;
      }
      let html = `<table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="border-bottom:1.5px solid #cbd5e1;color:#475569;font-weight:700;text-align:left;">
            <th style="padding:8px;width:150px;">Policy Number</th>
            <th style="padding:8px;width:150px;">Provider</th>
            <th style="padding:8px;width:120px;">Expiry Date</th>
            <th style="padding:8px;">Coverage Type</th>
            <th style="padding:8px;text-align:right;width:60px;">Action</th>
          </tr>
        </thead>
        <tbody>`;
      coData.insuranceAssets.policies.forEach((p, idx) => {
        html += `<tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:6px;"><input data-list="policies" data-index="${idx}" data-field="policyNo" value="${ohEsc(p.policyNo||'')}" placeholder="Policy No" style="width:100%;height:32px;border:1px solid #e2e8f0;border-radius:6px;padding:0 8px;outline:none;"></td>
          <td style="padding:6px;"><input data-list="policies" data-index="${idx}" data-field="provider" value="${ohEsc(p.provider||'')}" placeholder="e.g. LIC" style="width:100%;height:32px;border:1px solid #e2e8f0;border-radius:6px;padding:0 8px;outline:none;"></td>
          <td style="padding:6px;"><input type="date" data-list="policies" data-index="${idx}" data-field="expiry" value="${ohEsc(p.expiry||'')}" style="width:100%;height:32px;border:1px solid #e2e8f0;border-radius:6px;padding:0 4px;outline:none;"></td>
          <td style="padding:6px;">
            <select data-list="policies" data-index="${idx}" data-field="type" style="width:100%;height:32px;border:1px solid #e2e8f0;border-radius:6px;padding:0 4px;outline:none;background:#fff;">
              <option value="Asset" ${p.type==='Asset'?'selected':''}>Key Asset Insurance</option>
              <option value="Fire" ${p.type==='Fire'?'selected':''}>Fire Insurance</option>
              <option value="Theft" ${p.type==='Theft'?'selected':''}>Theft & Burglary</option>
              <option value="Health" ${p.type==='Health'?'selected':''}>Employee Health / Group</option>
              <option value="Others" ${p.type==='Others'?'selected':''}>Others</option>
            </select>
          </td>
          <td style="padding:6px;text-align:right;"><button type="button" class="co-del-list-btn" data-list="policies" data-index="${idx}" style="border:none;background:none;color:#ef4444;font-size:12px;font-weight:700;cursor:pointer;">Delete</button></td>
        </tr>`;
      });
      html += `</tbody></table>`;
      cont.innerHTML = html;
    };

    wrap.querySelector('#coAddPolicyBtn').addEventListener('click', () => {
      coData.insuranceAssets.policies.push({ policyNo: '', provider: '', expiry: '', type: 'Asset' });
      renderPolicies();
    });

    // 7. Assets List
    const renderAssets = () => {
      const cont = wrap.querySelector('#coAssetsListContainer');
      if (coData.insuranceAssets.assets.length === 0) {
        cont.innerHTML = `<div style="font-size:12.5px;color:#94a3b8;text-align:center;padding:12px 0;">No major fixed assets logged.</div>`;
        return;
      }
      let html = `<table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="border-bottom:1.5px solid #cbd5e1;color:#475569;font-weight:700;text-align:left;">
            <th style="padding:8px;">Asset Name</th>
            <th style="padding:8px;width:120px;">Purchase Date</th>
            <th style="padding:8px;width:110px;">Cost (₹)</th>
            <th style="padding:8px;width:180px;">Invoice File</th>
            <th style="padding:8px;text-align:right;width:60px;">Action</th>
          </tr>
        </thead>
        <tbody>`;
      coData.insuranceAssets.assets.forEach((a, idx) => {
        html += `<tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:6px;"><input data-list="assets" data-index="${idx}" data-field="assetName" value="${ohEsc(a.assetName||'')}" placeholder="e.g. MacBook Pro" style="width:100%;height:32px;border:1px solid #e2e8f0;border-radius:6px;padding:0 8px;outline:none;"></td>
          <td style="padding:6px;"><input type="date" data-list="assets" data-index="${idx}" data-field="purchaseDate" value="${ohEsc(a.purchaseDate||'')}" style="width:100%;height:32px;border:1px solid #e2e8f0;border-radius:6px;padding:0 4px;outline:none;"></td>
          <td style="padding:6px;"><input type="number" data-list="assets" data-index="${idx}" data-field="purchaseCost" value="${ohEsc(a.purchaseCost||'0')}" style="width:100%;height:32px;border:1px solid #e2e8f0;border-radius:6px;padding:0 8px;outline:none;"></td>
          <td style="padding:6px;font-size:11px;color:#64748b;">
            ${a.purchaseDocName ? `<span style="font-weight:600;color:#0284c7;">${ohEsc(a.purchaseDocName)}</span>` : `<input type="file" class="co-asset-file-uploader" data-index="${idx}" style="width:100%;">`}
          </td>
          <td style="padding:6px;text-align:right;"><button type="button" class="co-del-list-btn" data-list="assets" data-index="${idx}" style="border:none;background:none;color:#ef4444;font-size:12px;font-weight:700;cursor:pointer;">Delete</button></td>
        </tr>`;
      });
      html += `</tbody></table>`;
      cont.innerHTML = html;
    };

    wrap.querySelector('#coAddAssetBtn').addEventListener('click', () => {
      coData.insuranceAssets.assets.push({ assetName: '', purchaseDate: '', purchaseCost: 0, purchaseDoc: '', purchaseDocName: '' });
      renderAssets();
    });

    // ── DELEGATED LIST EVENT HANDLERS ──

    wrap.addEventListener('input', (e) => {
      const list = e.target.dataset.list;
      const index = parseInt(e.target.dataset.index);
      const field = e.target.dataset.field;
      if (list && !isNaN(index) && field) {
        let arr;
        if (list === 'directors') arr = coData.people.directors;
        else if (list === 'keyEmployees') arr = coData.people.keyEmployees;
        else if (list === 'policies') arr = coData.insuranceAssets.policies;
        else if (list === 'assets') arr = coData.insuranceAssets.assets;
        else arr = coData[list];

        if (arr && arr[index]) {
          if (e.target.type === 'checkbox') {
            arr[index][field] = e.target.checked;
            if (list === 'banks' && field === 'isPrimary' && e.target.checked) {
              coData.banks.forEach((b, i) => {
                if (i !== index) b.isPrimary = false;
              });
              renderBanks();
            }
          } else {
            arr[index][field] = e.target.value;
          }
        }
      }
    });

    wrap.addEventListener('change', (e) => {
      if (e.target.classList.contains('co-asset-file-uploader')) {
        const index = parseInt(e.target.dataset.index);
        const file = e.target.files[0];
        if (file && !isNaN(index)) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            coData.insuranceAssets.assets[index].purchaseDoc = evt.target.result;
            coData.insuranceAssets.assets[index].purchaseDocName = file.name;
            renderAssets();
          };
          reader.readAsDataURL(file);
        }
      }
    });

    wrap.addEventListener('click', (e) => {
      if (e.target.classList.contains('co-del-list-btn')) {
        const list = e.target.dataset.list;
        const index = parseInt(e.target.dataset.index);
        if (list && !isNaN(index)) {
          if (list === 'gstins') {
            coData.gstins.splice(index, 1);
            renderGstins();
          } else if (list === 'banks') {
            coData.banks.splice(index, 1);
            renderBanks();
          } else if (list === 'directors') {
            coData.people.directors.splice(index, 1);
            renderDirectors();
          } else if (list === 'keyEmployees') {
            coData.people.keyEmployees.splice(index, 1);
            renderEmployees();
          } else if (list === 'documents') {
            coData.documents.splice(index, 1);
            renderDocumentsList();
            saveCompanyDetails(coData);
          } else if (list === 'policies') {
            coData.insuranceAssets.policies.splice(index, 1);
            renderPolicies();
          } else if (list === 'assets') {
            coData.insuranceAssets.assets.splice(index, 1);
            renderAssets();
          }
        }
      }
      
      if (e.target.classList.contains('co-download-doc-btn')) {
        const index = parseInt(e.target.dataset.index);
        const doc = coData.documents[index];
        if (doc && doc.fileData) {
          const link = document.createElement('a');
          link.href = doc.fileData;
          link.download = doc.fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    });


    // ── INITIALIZING LISTS & LOADS ──
    renderGstins();
    renderBanks();
    renderDirectors();
    renderEmployees();
    renderDocumentsList();
    renderPolicies();
    renderAssets();


    // ── SECTION SAVE BTN LISTENERS ──

    wrap.querySelectorAll('.co-save-section-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const section = btn.dataset.section;

        if (section === 'identity') {
          const name = wrap.querySelector('#coNameInput').value.trim();
          if (!name) {
            wrap.querySelector('#coNameInput').style.borderColor = '#ef4444';
            wrap.querySelector('#coNameInput').focus();
            showToast('Please enter a company name.', 'warning');
            return;
          }
          coData.name = name;
          coData.displayName = wrap.querySelector('#coDisplayNameInput').value.trim();
          coData.businessType = wrap.querySelector('#coBusinessType').value;
          coData.incDate = wrap.querySelector('#coIncDate').value;
          coData.address = wrap.querySelector('#coAddressInput').value.trim();
          coData.phone = wrap.querySelector('#coPhoneInput').value.trim();
          coData.email = wrap.querySelector('#coEmailInput').value.trim();
          coData.website = wrap.querySelector('#coWebsiteInput').value.trim();
        }

        else if (section === 'registrations') {
          coData.pan = wrap.querySelector('#coPAN').value.trim().toUpperCase();
          coData.cin = wrap.querySelector('#coCIN').value.trim().toUpperCase();
          coData.udyam = wrap.querySelector('#coUdyam').value.trim();
          coData.tradeLicense = wrap.querySelector('#coTradeLicense').value.trim();
          coData.iec = wrap.querySelector('#coIEC').value.trim();
        }

        else if (section === 'compliance') {
          coData.tan = wrap.querySelector('#coTAN').value.trim().toUpperCase();
          coData.profTax = wrap.querySelector('#coProfTax').value.trim();
          coData.esiPf = wrap.querySelector('#coEsiPf').value.trim();
          coData.shopLicense = wrap.querySelector('#coShopLicense').value.trim();
        }

        else if (section === 'people') {
          coData.people.auditor.name = wrap.querySelector('#coAuditorName').value.trim();
          coData.people.auditor.contact = wrap.querySelector('#coAuditorContact').value.trim();
          coData.people.taxConsultant.name = wrap.querySelector('#coConsultantName').value.trim();
          coData.people.taxConsultant.contact = wrap.querySelector('#coConsultantContact').value.trim();
        }

        // Write coData object to localstorage
        saveCompanyDetails(coData);
        updateSidebarCompany();
        showToast('Company details successfully saved.', 'success');
      });
    });
  }

  // ── Bootstrap ── (moved here from the reports section of the original
  // file so that loadKyaDataOnStartup() and friends run only after every
  // module below has finished loading — avoids ReferenceErrors that would
  // occur if this ran before onehub/ledgers/vault-settings/sales were defined)
  loadKyaDataOnStartup();
  initFormDefaults();
  syncGlobalDates(_globalDateFrom, _globalDateTo);

  // Setup and Initial Call
  setupSalesVoucherEventListeners();
  setupVoucherDeskEventListeners();
  initSalesForm();

