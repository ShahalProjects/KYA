  function renderCompanyPanelOrganizer() {
    const wrap = document.getElementById('panel-company');
    if (!wrap) return;

    // Load initial data
    let coData = getCompanyDetails();
    if (!coData.people) coData.people = { directors: [], keyEmployees: [], auditor: {}, taxConsultant: {} };
    if (!coData.people.directors) coData.people.directors = [];
    if (!coData.people.keyEmployees) coData.people.keyEmployees = [];
    if (!coData.people.auditor) coData.people.auditor = {};
    if (!coData.people.taxConsultant) coData.people.taxConsultant = {};
    if (!coData.documents) coData.documents = [];

    // The seal is drawn by buildInvoiceSealSvg (sales-invoice-print.js), so the
    // profile preview matches the printed invoice. Seals made before the round-only
    // format (including old rectangle ones) are redrawn here.
    if (coData.sealImage && typeof coData.sealImage === 'string' && coData.sealImage.startsWith('data:image/svg+xml')) {
      try {
        const svg = buildInvoiceSealSvg(coData.sealName || coData.name || coData.displayName || '', getInvoiceSealPlace(coData));
        const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
        coData.sealImage = dataUrl;
        delete coData.sealShape;
        saveCompanyDetails(coData);
      } catch (e) {}
    }

    const initials = getCompanyInitials(coData.name);

    // District / State search boxes: KYA searchable select, like the Journal Department box
    const coAddrSelectBox = (key, value) => `
                      <div class="kya-searchable-select-wrap" id="co${key}SelectWrap" style="position:relative;width:100%;">
                        <div class="kya-searchable-select-trigger" id="co${key}SelectTrigger" style="display:flex;justify-content:space-between;align-items:center;padding:0 12px;border:1.5px solid #e2e8f0;border-radius:9px;background:#fff;cursor:pointer;font-size:13.5px;color:#334155;height:40px;box-sizing:border-box;">
                          <span id="co${key}SelectTriggerText" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${ohEsc(value || `— Select ${key} —`)}</span>
                          <svg viewBox="0 0 16 16" fill="none" style="width:10px;height:10px;stroke:var(--slate-500);stroke-width:2;margin-left:6px;flex-shrink:0;"><path d="M2 5l6 6 6-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </div>
                        <div class="kya-searchable-select-dropdown" id="co${key}SelectDropdown" style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border:1.5px solid var(--slate-200);border-radius:12px;box-shadow:var(--shadow-lg);z-index:1000;padding:8px;max-height:240px;overflow-y:auto;flex-direction:column;gap:4px;width:100%;box-sizing:border-box;">
                          <input type="text" id="co${key}SelectSearch" placeholder="Search ${key.toLowerCase()}..." class="je-input" style="padding:8px 12px;font-size:13px;border-radius:6px;border:1.5px solid var(--slate-200);margin-bottom:6px;width:100%;box-sizing:border-box;">
                          <div id="co${key}SelectOptionsList" style="display:flex;flex-direction:column;gap:2px;"></div>
                        </div>
                      </div>`;

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
              <div style="font-size:12px;color:rgba(255,255,255,.75);margin-top:2px;">Organize legal entities, compliance documents, and corporate vault</div>
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
                    <textarea id="coAddressInput" placeholder="Street Address / Building / Area" rows="3" style="width:100%;border:1.5px solid #e2e8f0;border-radius:9px;padding:10px 12px;font-size:13.5px;color:#334155;outline:none;resize:vertical;font-family:Inter,sans-serif;line-height:1.4;">${ohEsc(coData.address||'')}</textarea>
                  </div>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div>
                      <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">City</label>
                      <input id="coCityInput" value="${ohEsc(coData.city||'')}" placeholder="e.g. Kochi" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;color:#334155;outline:none;">
                    </div>
                    <div>
                      <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">District</label>
                      <input type="hidden" id="coDistrictInput" value="${ohEsc(coData.district||'')}">
                      ${coAddrSelectBox('District', coData.district)}
                    </div>
                  </div>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div>
                      <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">State</label>
                      <input type="hidden" id="coStateInput" value="${ohEsc(coData.state||'')}">
                      ${coAddrSelectBox('State', coData.state)}
                    </div>
                    <div>
                      <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">PIN Code</label>
                      <input id="coPincodeInput" value="${ohEsc(coData.pincode||'')}" placeholder="e.g. 682001" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;color:#334155;outline:none;">
                    </div>
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

                <!-- Right column: Logo + Authorised Signatory -->
                <div style="display:flex;flex-direction:column;gap:20px;">
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

                  <!-- Authorised Signatory: Signature Upload + Seal Creator -->
                  <div>
                    <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:12px;">Authorised Signatory</label>
                    <div style="background:#fafbfc;border:1.5px dashed #cbd5e1;border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:14px;">

                      <!-- Signature -->
                      <div style="display:flex;flex-direction:column;align-items:center;gap:10px;">
                        <div id="coSignaturePreview" style="width:100%;height:64px;border:1px solid #e2e8f0;border-radius:8px;background:${coData.signatureImage ? `url(${coData.signatureImage}) center/contain no-repeat #fff` : '#fff'};display:flex;align-items:center;justify-content:center;font-size:10.5px;color:#94a3b8;box-sizing:border-box;">${coData.signatureImage ? '' : 'No signature uploaded'}</div>
                        <div style="display:flex;gap:8px;justify-content:center;">
                          <button type="button" id="coUploadSignBtn" style="height:30px;padding:0 10px;border:1.5px solid #cbd5e1;border-radius:6px;background:#fff;color:#334155;font-size:11.5px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;">
                            Upload Signature
                          </button>
                          <button type="button" id="coRemoveSignBtn" style="height:30px;padding:0 10px;border:none;border-radius:6px;background:#fee2e2;color:#b91c1c;font-size:11.5px;font-weight:600;cursor:pointer;font-family:Inter,sans-serif;display:${coData.signatureImage ? 'block' : 'none'};">
                            Remove
                          </button>
                        </div>
                        <input type="file" id="coSignFileInput" accept="image/*" style="display:none;">
                        <input type="hidden" id="coSignatureImage" value="${ohEsc(coData.signatureImage || '')}">
                      </div>

                      <div style="border-top:1px dashed #cbd5e1;"></div>

                      <!-- Create Seal -->
                      <div style="display:flex;flex-direction:column;gap:8px;">
                        <label style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;">Company Seal / Stamp</label>
                        <input id="coSealName" value="${ohEsc(coData.sealName || coData.name || coData.displayName || '')}" placeholder="Seal name (e.g. company name)" style="width:100%;height:32px;border:1.5px solid #e2e8f0;border-radius:7px;padding:0 10px;font-size:12px;outline:none;box-sizing:border-box;">
                        <div style="display:flex;gap:8px;">
                          <button type="button" id="coGenerateSealBtn" style="flex:1;height:32px;border:none;border-radius:6px;background:#e0f2fe;color:#0369a1;font-size:11.5px;font-weight:700;cursor:pointer;">
                            Generate Seal
                          </button>
                          <button type="button" id="coRemoveSealBtn" style="height:32px;padding:0 10px;border:none;border-radius:6px;background:#fee2e2;color:#b91c1c;font-size:11.5px;font-weight:600;cursor:pointer;display:${coData.sealImage ? 'block' : 'none'};">
                            Remove
                          </button>
                        </div>
                      </div>

                      <!-- Seal Preview (rendered below the signature) -->
                      <div id="coSealPreview" style="width:100%;max-width:180px;height:120px;margin:4px auto 0;background:${coData.sealImage ? `url(${coData.sealImage}) center/contain no-repeat` : 'transparent'};"></div>
                      <input type="hidden" id="coSealImage" value="${ohEsc(coData.sealImage || '')}">
                    </div>
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
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;">
                  <div>
                    <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">GST Registration Number (GSTIN)</label>
                    <input id="coGSTIN" value="${ohEsc(coData.gstin||'')}" placeholder="e.g. 27AAAAA0000A1Z5" maxlength="15" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;font-weight:600;color:#0f172a;text-transform:uppercase;outline:none;box-sizing:border-box;">
                    <div id="coGstinStatus" style="font-size:11px;font-weight:600;margin-top:6px;min-height:14px;"></div>
                  </div>
                  <div>
                    <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Permanent Account Number (PAN)</label>
                    <div style="position:relative;">
                      <input id="coPAN" value="${ohEsc(coData.pan||'')}" placeholder="e.g. ABCDE1234F" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 70px 0 12px;font-size:13.5px;font-weight:600;color:#0f172a;text-transform:uppercase;outline:none;box-sizing:border-box;">
                      <button type="button" id="coPanFromGstinBtn" class="sales-roundoff-btn-inline" style="display:none;position:absolute;right:5px;top:50%;transform:translateY(-50%);height:30px;width:auto;min-width:0;padding:0 10px;">Update</button>
                    </div>
                    <div id="coPanStatus" style="font-size:11px;font-weight:600;margin-top:6px;min-height:14px;"></div>
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

            <!-- TAB 4: KEY PEOPLE -->
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

            <!-- TAB 5: DOCUMENT VAULT -->
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

    // Authorised Signatory: signature image upload wiring
    const signFileInp = wrap.querySelector('#coSignFileInput');
    const uploadSignBtn = wrap.querySelector('#coUploadSignBtn');
    const removeSignBtn = wrap.querySelector('#coRemoveSignBtn');
    const signatureImageInp = wrap.querySelector('#coSignatureImage');
    const signaturePreview = wrap.querySelector('#coSignaturePreview');

    uploadSignBtn.addEventListener('click', () => signFileInp.click());

    signFileInp.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64 = evt.target.result;
        signatureImageInp.value = base64;
        coData.signatureImage = base64;
        signaturePreview.textContent = '';
        signaturePreview.style.background = `url(${base64}) center/contain no-repeat #fff`;
        removeSignBtn.style.display = 'block';
      };
      reader.readAsDataURL(file);
    });

    removeSignBtn.addEventListener('click', () => {
      signatureImageInp.value = '';
      coData.signatureImage = '';
      signFileInp.value = '';
      signaturePreview.style.background = '#fff';
      signaturePreview.textContent = 'No signature uploaded';
      removeSignBtn.style.display = 'none';
    });

    const sealNameInp = wrap.querySelector('#coSealName');
    const sealImageInp = wrap.querySelector('#coSealImage');
    const sealPreview = wrap.querySelector('#coSealPreview');

    const removeSealBtn = wrap.querySelector('#coRemoveSealBtn');
    wrap.querySelector('#coGenerateSealBtn').addEventListener('click', () => {
      const name = sealNameInp.value.trim() || (nameInp ? nameInp.value.trim() : '') || 'COMPANY NAME';
      // The seal's place is the City box
      const place = getInvoiceSealPlace({ ...coData, city: wrap.querySelector('#coCityInput').value });
      const svg = buildInvoiceSealSvg(name, place);
      const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
      coData.sealName = name;
      delete coData.sealPlaceCustom;
      delete coData.sealShape;
      coData.sealImage = dataUrl;
      coData.sealRemoved = false;
      sealImageInp.value = dataUrl;
      sealPreview.style.background = `url(${dataUrl}) center/contain no-repeat`;
      if (removeSealBtn) removeSealBtn.style.display = 'block';
      saveCompanyDetails(coData);
      if (typeof showToast === 'function') showToast('Company seal generated and saved.', 'success');
    });

    if (removeSealBtn) {
      removeSealBtn.addEventListener('click', () => {
        coData.sealImage = '';
        coData.sealRemoved = true;
        sealImageInp.value = '';
        sealPreview.style.background = 'transparent';
        removeSealBtn.style.display = 'none';
        saveCompanyDetails(coData);
        if (typeof showToast === 'function') showToast('Company seal removed.', 'info');
      });
    }


    // ── DISTRICT / STATE SEARCH BOXES ──
    // Picking a district fills in its state; a picked state limits the district list.
    const stateDistricts = window.INDIA_STATE_DISTRICTS || {};
    const districtAliases = window.INDIA_DISTRICT_ALIASES || {};
    const stateNames = Object.keys(stateDistricts);
    const districtInp = wrap.querySelector('#coDistrictInput');
    const stateInp = wrap.querySelector('#coStateInput');

    const isListedDistrict = (name) => stateNames.some(s => stateDistricts[s].includes(name));

    const refreshAddrTriggers = () => {
      wrap.querySelector('#coDistrictSelectTriggerText').textContent = districtInp.value || '— Select District —';
      wrap.querySelector('#coStateSelectTriggerText').textContent = stateInp.value || '— Select State —';
    };

    const setCoDistrict = (district, state) => {
      districtInp.value = district;
      if (state) stateInp.value = state;
      refreshAddrTriggers();
    };

    const setCoState = (state) => {
      if (state === stateInp.value) return;
      stateInp.value = state;
      // A district of another state no longer fits; a typed-in district is kept
      const d = districtInp.value;
      if (d && isListedDistrict(d) && !(stateDistricts[state] || []).includes(d)) districtInp.value = '';
      refreshAddrTriggers();
    };

    const closeAddrList = (key) => {
      const dd = wrap.querySelector(`#co${key}SelectDropdown`);
      if (dd) dd.style.display = 'none';
    };

    // List row, styled like the Journal Department list; sub is a grey second line
    const addrListItem = (text, sub, isSelected, onPick) => {
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 8px 12px; font-size: 13px; border-radius: 6px; cursor: pointer;
        font-weight: ${isSelected ? '700' : '500'};
        background: ${isSelected ? 'var(--blue-50)' : 'transparent'};
        color: ${isSelected ? 'var(--blue-700)' : 'var(--slate-700)'};
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        transition: background 0.15s ease;
      `;
      item.textContent = text;
      if (sub) {
        const subEl = document.createElement('div');
        subEl.style.cssText = 'font-size: 11px; font-weight: 500; color: var(--slate-400);';
        subEl.textContent = sub;
        item.appendChild(subEl);
      }
      item.addEventListener('mouseenter', () => { if (!isSelected) item.style.background = 'var(--slate-50)'; });
      item.addEventListener('mouseleave', () => { if (!isSelected) item.style.background = 'transparent'; });
      item.addEventListener('click', onPick);
      return item;
    };

    const addrEmptyRow = (text) => {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding: 12px 10px; text-align: center; font-size: 13px; font-weight: 600; color: var(--slate-500);';
      empty.textContent = text;
      return empty;
    };

    const renderDistrictList = (filter) => {
      const list = wrap.querySelector('#coDistrictSelectOptionsList');
      const q = (filter || '').toLowerCase().trim();
      const state = stateDistricts[stateInp.value] ? stateInp.value : '';
      const pool = [];
      (state ? [state] : stateNames).forEach(s => stateDistricts[s].forEach(d => pool.push({ d, s })));
      if (!state) pool.sort((a, b) => a.d.localeCompare(b.d));
      list.innerHTML = '';

      pool.forEach(({ d, s }) => {
        if (q && !d.toLowerCase().includes(q) && !(districtAliases[s + '|' + d] || '').toLowerCase().includes(q)) return;
        const isSelected = districtInp.value === d && stateInp.value === s;
        list.appendChild(addrListItem(d, state ? '' : s, isSelected, () => {
          setCoDistrict(d, s);
          closeAddrList('District');
        }));
      });

      if (!list.children.length) list.appendChild(addrEmptyRow('No District Found'));

      // A district not in the list can be typed in: sticky footer like the Department box's "Create" footer
      const raw = (filter || '').trim();
      if (raw && !pool.some(p => p.d.toLowerCase() === raw.toLowerCase())) {
        const footer = document.createElement('div');
        footer.className = 'kya-party-create-footer';
        footer.style.cssText = 'position: sticky; bottom: -8px; z-index: 5; background: #fff; border-top: 1px solid var(--slate-200); margin: 4px -8px -8px; padding: 8px 10px 10px; border-radius: 0 0 12px 12px;';
        const label = document.createElement('div');
        label.style.cssText = 'font-size: 11px; font-weight: 600; color: var(--slate-500); margin-bottom: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
        label.textContent = `Use "${raw}" as`;
        footer.appendChild(label);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'je-drop-create-item';
        btn.style.cssText = 'width: 100%; justify-content: center; padding: 7px 10px; font-size: 12px;';
        btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>District</span>';
        btn.addEventListener('mousedown', e => {
          e.preventDefault();
          e.stopPropagation();
          setCoDistrict(raw, '');
          closeAddrList('District');
        });
        btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
        footer.appendChild(btn);
        list.appendChild(footer);
      }
    };

    const renderStateList = (filter) => {
      const list = wrap.querySelector('#coStateSelectOptionsList');
      const q = (filter || '').toLowerCase().trim();
      list.innerHTML = '';
      stateNames.forEach(s => {
        if (q && !s.toLowerCase().includes(q)) return;
        list.appendChild(addrListItem(s, '', stateInp.value === s, () => {
          setCoState(s);
          closeAddrList('State');
        }));
      });
      if (!list.children.length) list.appendChild(addrEmptyRow('No State Found'));
    };

    ['District', 'State'].forEach(key => {
      const trigger = wrap.querySelector(`#co${key}SelectTrigger`);
      const dd = wrap.querySelector(`#co${key}SelectDropdown`);
      const search = wrap.querySelector(`#co${key}SelectSearch`);
      const render = key === 'District' ? renderDistrictList : renderStateList;
      trigger.addEventListener('click', e => {
        e.stopPropagation();
        if (dd.style.display === 'flex') { closeAddrList(key); return; }
        closeAddrList(key === 'District' ? 'State' : 'District');
        dd.style.display = 'flex';
        search.value = '';
        render('');
        setTimeout(() => search.focus(), 50);
      });
      search.addEventListener('input', () => render(search.value));
      dd.addEventListener('click', e => e.stopPropagation());
    });

    // One outside-click handler, replaced each time the panel is drawn
    if (window._coAddrOutsideClick) document.removeEventListener('click', window._coAddrOutsideClick);
    window._coAddrOutsideClick = () => { closeAddrList('District'); closeAddrList('State'); };
    document.addEventListener('click', window._coAddrOutsideClick);


    // ── DYNAMIC LIST RENDERING ──

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

    // ── DELEGATED LIST EVENT HANDLERS ──

    wrap.addEventListener('input', (e) => {
      const list = e.target.dataset.list;
      const index = parseInt(e.target.dataset.index);
      const field = e.target.dataset.field;
      if (list && !isNaN(index) && field) {
        let arr;
        if (list === 'directors') arr = coData.people.directors;
        else if (list === 'keyEmployees') arr = coData.people.keyEmployees;
        else arr = coData[list];

        if (arr && arr[index]) {
          if (e.target.type === 'checkbox') {
            arr[index][field] = e.target.checked;
          } else {
            arr[index][field] = e.target.value;
          }
        }
      }
    });

    wrap.addEventListener('click', (e) => {
      if (e.target.classList.contains('co-del-list-btn')) {
        const list = e.target.dataset.list;
        const index = parseInt(e.target.dataset.index);
        if (list && !isNaN(index)) {
          if (list === 'directors') {
            coData.people.directors.splice(index, 1);
            renderDirectors();
          } else if (list === 'keyEmployees') {
            coData.people.keyEmployees.splice(index, 1);
            renderEmployees();
          } else if (list === 'documents') {
            coData.documents.splice(index, 1);
            renderDocumentsList();
            saveCompanyDetails(coData);
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


    // ── GSTIN VALIDATION (format + checksum) ──
    const GSTIN_CODE_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const gstinCheckDigit = (gstin14) => {
      let factor = 2, sum = 0;
      for (let i = 13; i >= 0; i--) {
        const codePoint = GSTIN_CODE_CHARS.indexOf(gstin14[i]);
        let d = factor * codePoint;
        d = Math.floor(d / 36) + (d % 36);
        sum += d;
        factor = factor === 2 ? 1 : 2;
      }
      return GSTIN_CODE_CHARS[(36 - (sum % 36)) % 36];
    };
    const isValidGstin = (raw) => {
      const match = /^([0-9]{2})([A-Z]{5}[0-9]{4}[A-Z])([1-9A-Z])(Z)([0-9A-Z])$/.test(raw);
      return match && raw[14] === gstinCheckDigit(raw.slice(0, 14));
    };
    const isValidPan = (raw) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(raw);

    const gstinInput = wrap.querySelector('#coGSTIN');
    const gstinStatus = wrap.querySelector('#coGstinStatus');
    const panInput = wrap.querySelector('#coPAN');
    const panStatus = wrap.querySelector('#coPanStatus');
    const panHintBtn = wrap.querySelector('#coPanFromGstinBtn');

    const renderPanStatus = () => {
      const raw = panInput.value.toUpperCase().trim();
      if (!raw) {
        panStatus.textContent = '';
      } else if (isValidPan(raw)) {
        panStatus.textContent = 'Valid PAN';
        panStatus.style.color = '#059669';
      } else {
        panStatus.textContent = 'Invalid PAN';
        panStatus.style.color = '#dc2626';
      }
    };
    panInput.addEventListener('input', renderPanStatus);
    renderPanStatus();

    const renderGstinStatus = () => {
      const raw = gstinInput.value.toUpperCase().trim();
      panHintBtn.style.display = 'none';

      if (!raw) {
        gstinStatus.textContent = '';
        return;
      }

      if (!isValidGstin(raw)) {
        gstinStatus.textContent = 'Invalid GSTIN';
        gstinStatus.style.color = '#dc2626';
        return;
      }

      gstinStatus.textContent = 'Valid GSTIN';
      gstinStatus.style.color = '#059669';

      const panFromGstin = raw.slice(2, 12);
      const currentPan = panInput.value.trim().toUpperCase();
      if (!currentPan) {
        panInput.value = panFromGstin;
        renderPanStatus();
      } else if (currentPan !== panFromGstin) {
        panHintBtn.style.display = 'block';
      }
    };

    panHintBtn.addEventListener('click', () => {
      const raw = gstinInput.value.toUpperCase().trim();
      if (isValidGstin(raw)) {
        panInput.value = raw.slice(2, 12);
        panHintBtn.style.display = 'none';
        renderPanStatus();
      }
    });

    gstinInput.addEventListener('input', renderGstinStatus);
    renderGstinStatus();

    // ── INITIALIZING LISTS & LOADS ──
    renderDirectors();
    renderEmployees();
    renderDocumentsList();


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
          coData.city = wrap.querySelector('#coCityInput').value.trim();
          coData.district = wrap.querySelector('#coDistrictInput').value.trim();
          coData.state = wrap.querySelector('#coStateInput').value;
          coData.pincode = wrap.querySelector('#coPincodeInput').value.trim();
          coData.phone = wrap.querySelector('#coPhoneInput').value.trim();
          coData.email = wrap.querySelector('#coEmailInput').value.trim();
          coData.website = wrap.querySelector('#coWebsiteInput').value.trim();
          const sealVal = wrap.querySelector('#coSealImage')?.value;
          if (sealVal !== undefined) coData.sealImage = sealVal;
          const sealNameVal = wrap.querySelector('#coSealName')?.value;
          if (sealNameVal !== undefined) coData.sealName = sealNameVal;
          delete coData.sealPlaceCustom;
          const signVal = wrap.querySelector('#coSignatureImage')?.value;
          if (signVal !== undefined) coData.signatureImage = signVal;
          const iconVal = wrap.querySelector('#coIconImage')?.value;
          if (iconVal !== undefined) coData.iconImage = iconVal;
        }

        else if (section === 'registrations') {
          coData.gstin = wrap.querySelector('#coGSTIN').value.trim().toUpperCase();
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

