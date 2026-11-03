  function renderCompanyPanelOrganizer() {
    const wrap = document.getElementById('panel-company');
    if (!wrap) return;

    // Load initial data
    let coData = getCompanyDetails();
    if (!coData.people) coData.people = { directors: [], auditor: {}, taxConsultant: {} };
    if (!coData.people.directors) coData.people.directors = [];
    if (!coData.people.auditor) coData.people.auditor = {};
    if (!coData.people.taxConsultant) coData.people.taxConsultant = {};
    if (!coData.documents) coData.documents = [];

    // EPF and ESIC were one "ESI / PF" box before: its value goes to the box its form fits (an
    // ESIC employer code is 17 digits)
    const legacyEsiPf = String(coData.esiPf || '').trim();
    const epfCodeValue = coData.epfCode || (legacyEsiPf && !/^\d{17}$/.test(legacyEsiPf) ? legacyEsiPf : '');
    const esicCodeValue = coData.esicCode || (/^\d{17}$/.test(legacyEsiPf) ? legacyEsiPf : '');
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

    // GST Registration: a company that hasn't saved it yet is Unregistered, unless it already has a
    // GSTIN (Registered, Regular, Monthly; gst-registration.js)
    const gstRegType = (typeof kyaGstRegTypeInfo === 'function') ? kyaGstRegTypeInfo(coData.gstRegType).type : (coData.gstRegType || 'Regular');
    const gstSliderBtn = 'border: none; padding: 6px 16px; font-size: 12px; font-weight: 700; border-radius: 6px; cursor: pointer; transition: all 0.15s ease; background: transparent; color: var(--slate-500);';

    // Business Type: the value saved, and the name the search box shows
    const CO_BUSINESS_TYPES = [
      { value: 'Proprietorship', label: 'Proprietorship' },
      { value: 'Partnership', label: 'Partnership' },
      { value: 'LLP', label: 'LLP (Limited Liability Partnership)' },
      { value: 'Pvt Ltd', label: 'Pvt Ltd (Private Limited)' },
      { value: 'Public Ltd', label: 'Public Ltd (Public Limited)' },
      { value: 'OPC', label: 'One Person Company (OPC)' },
      { value: 'Trust', label: 'Trust / Society' },
      { value: 'Others', label: 'Others' }
    ];
    const businessTypeLabel = v => (CO_BUSINESS_TYPES.find(t => t.value === v) || {}).label || v || '';

    // District / State / Registration Type search boxes: KYA searchable select, like the Journal
    // Department box
    const coAddrSelectBox = (key, value, label = key) => `
                      <div class="kya-searchable-select-wrap" id="co${key}SelectWrap" style="position:relative;width:100%;">
                        <div class="kya-searchable-select-trigger" id="co${key}SelectTrigger" style="display:flex;justify-content:space-between;align-items:center;padding:0 12px;border:1.5px solid #e2e8f0;border-radius:9px;background:#fff;cursor:pointer;font-size:13.5px;color:#334155;height:40px;box-sizing:border-box;">
                          <span id="co${key}SelectTriggerText" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${ohEsc(value || `— Select ${label} —`)}</span>
                          <svg viewBox="0 0 16 16" fill="none" style="width:10px;height:10px;stroke:var(--slate-500);stroke-width:2;margin-left:6px;flex-shrink:0;"><path d="M2 5l6 6 6-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </div>
                        <div class="kya-searchable-select-dropdown" id="co${key}SelectDropdown" style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border:1.5px solid var(--slate-200);border-radius:12px;box-shadow:var(--shadow-lg);z-index:1000;padding:8px;max-height:240px;overflow-y:auto;flex-direction:column;gap:4px;width:100%;box-sizing:border-box;">
                          <input type="text" id="co${key}SelectSearch" placeholder="Search ${label.toLowerCase()}..." class="je-input" style="padding:8px 12px;font-size:13px;border-radius:6px;border:1.5px solid var(--slate-200);margin-bottom:6px;width:100%;box-sizing:border-box;">
                          <div id="co${key}SelectOptionsList" style="display:flex;flex-direction:column;gap:2px;"></div>
                        </div>
                      </div>`;

    // Header layout
    wrap.innerHTML = `
      <div class="table-card" style="padding: 24px 28px;">
        <!-- Header strip -->
        <div class="je-card-header" style="background:linear-gradient(90deg,#1e40af,#2563eb,#0284c7);border-top-left-radius:12px;border-top-right-radius:12px;margin:-24px -28px 24px -28px;padding:20px 28px;display:flex;align-items:center;justify-content:space-between;">
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
          <!-- Key People's Add Person: the glass look of KYA's blue title-card controls (as Track Recorder's Add Budget) -->
          <div class="panel-actions" style="display:flex;gap:8px;align-items:center;">
            <button type="button" class="cl-glass-control" id="coAddPersonBtn" aria-label="Add Person" style="display:none;align-items:center;gap:6px;"><svg viewBox="0 0 15 15" fill="none" style="width:14px;height:14px;"><path d="M7.5 2v11M2 7.5h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg> Add Person</button>
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
            <button class="oh-sub-tab" data-subtab="gst">
              <div class="oh-tab-icon-wrap" style="width:16px;height:16px;display:flex;align-items:center;justify-content:center;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
              </div>
              <span class="oh-tab-text">GST Registration</span>
            </button>
            <button class="oh-sub-tab" data-subtab="pan">
              <div class="oh-tab-icon-wrap" style="width:16px;height:16px;display:flex;align-items:center;justify-content:center;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><line x1="13" y1="10" x2="18" y2="10"/><line x1="13" y1="14" x2="18" y2="14"/></svg>
              </div>
              <span class="oh-tab-text">PAN Registration</span>
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
                    <input id="coNameInput" value="${ohEsc(coData.name||'')}" placeholder="Enter Company / Firm Name" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;font-weight:600;color:#0f172a;outline:none;box-sizing:border-box;">
                  </div>
                  <div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                      <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;">Sidebar Display Name</label>
                      <span id="coDisplayNameCounter" style="font-size:10.5px;font-weight:700;color:#94a3b8;">${(coData.displayName||'').length}/22</span>
                    </div>
                    <input id="coDisplayNameInput" maxlength="22" value="${ohEsc(coData.displayName||'')}" placeholder="Short name shown in sidebar" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;font-weight:600;color:#0f172a;outline:none;box-sizing:border-box;">
                  </div>
                  <div>
                    <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Business Type</label>
                    <input type="hidden" id="coBusinessType" value="${ohEsc(coData.businessType||'')}">
                    ${coAddrSelectBox('BusinessType', businessTypeLabel(coData.businessType), 'Business Type')}
                  </div>
                  <div>
                    <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Date of Incorporation</label>
                    <input type="date" id="coIncDate" value="${ohEsc(coData.incDate||'')}" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;color:#334155;outline:none;">
                  </div>
                  <div>
                    <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Business Address</label>
                    <textarea id="coAddressInput" placeholder="Street Address / Building / Area" rows="3" style="width:100%;border:1.5px solid #e2e8f0;border-radius:9px;padding:10px 12px;font-size:13.5px;color:#334155;outline:none;resize:vertical;font-family:Inter,sans-serif;line-height:1.4;">${ohEsc(coData.address||'')}</textarea>
                  </div>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div>
                      <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">City</label>
                      <input id="coCityInput" value="${ohEsc(coData.city||'')}" placeholder="Enter City" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;color:#334155;outline:none;">
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
                      <input id="coPincodeInput" value="${ohEsc(coData.pincode||'')}" placeholder="Enter PIN Code" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;color:#334155;outline:none;">
                    </div>
                  </div>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div>
                      <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Phone</label>
                      <input id="coPhoneInput" value="${ohEsc(coData.phone||'')}" placeholder="Enter Phone" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;color:#334155;outline:none;">
                    </div>
                    <div>
                      <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Email</label>
                      <input id="coEmailInput" type="email" value="${ohEsc(coData.email||'')}" placeholder="Enter Email" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;color:#334155;outline:none;">
                    </div>
                  </div>
                  <div>
                    <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Website</label>
                    <input id="coWebsiteInput" value="${ohEsc(coData.website||'')}" placeholder="Enter Website" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;color:#334155;outline:none;">
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
                        <input id="coSealName" value="${ohEsc(coData.sealName || coData.name || coData.displayName || '')}" placeholder="Enter Seal Name" style="width:100%;height:32px;border:1.5px solid #e2e8f0;border-radius:7px;padding:0 10px;font-size:12px;outline:none;box-sizing:border-box;">
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

            <!-- TAB: GST REGISTRATION -->
            <div id="coSubpanel-gst" class="co-subpanel-content" style="display:none;">
              <div style="display:flex;flex-direction:column;gap:20px;">
                <div>
                  <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Registration Status</label>
                  <div class="books-opt-segmented" style="display: inline-flex; background: var(--slate-200); border-radius: 8px; padding: 3px; gap: 3px;">
                    <button type="button" data-gst-status="registered" style="${gstSliderBtn}">Registered</button>
                    <button type="button" data-gst-status="unregistered" style="${gstSliderBtn}">Unregistered</button>
                  </div>
                </div>
                <div id="coGstRegisteredFields" style="display:flex;flex-direction:column;gap:20px;">
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
                    <div>
                      <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">GST Registration Number (GSTIN)</label>
                      <input id="coGSTIN" value="${ohEsc(coData.gstin||'')}" placeholder="Enter GSTIN" maxlength="15" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;font-weight:600;color:#0f172a;text-transform:uppercase;outline:none;box-sizing:border-box;">
                      <div id="coGstinStatus" style="font-size:11px;font-weight:600;margin-top:6px;min-height:14px;"></div>
                    </div>
                    <div style="display:grid;grid-template-columns:120px 1fr;gap:16px;">
                      <div>
                        <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">State Code</label>
                        <div id="coGstStateCode" style="height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;font-weight:600;color:#334155;background:#f8fafc;box-sizing:border-box;display:flex;align-items:center;">—</div>
                      </div>
                      <div>
                        <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">State</label>
                        <div id="coGstState" style="height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;font-weight:600;color:#334155;background:#f8fafc;box-sizing:border-box;display:flex;align-items:center;">—</div>
                      </div>
                    </div>
                  </div>
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
                    <div>
                      <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Registration Type</label>
                      <input type="hidden" id="coRegTypeInput" value="${ohEsc(gstRegType)}">
                      ${coAddrSelectBox('RegType', gstRegType, 'Registration Type')}
                    </div>
                    <div id="coGstr1PeriodWrap">
                      <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">GSTR-1 Filing Period</label>
                      <div class="books-opt-segmented" style="display: inline-flex; background: var(--slate-200); border-radius: 8px; padding: 3px; gap: 3px;">
                        <button type="button" data-gstr1="monthly" style="${gstSliderBtn}">Monthly</button>
                        <button type="button" data-gstr1="quarterly" style="${gstSliderBtn}">Quarterly</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style="margin-top:28px;border-top:1px solid #e2e8f0;padding-top:16px;">
                <button type="button" class="co-save-section-btn" data-section="gst" style="height:40px;padding:0 24px;border:none;border-radius:8px;background:#2563eb;color:#fff;font-size:13.5px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(37,99,235,.2);">Save GST Registration</button>
              </div>
            </div>

            <!-- TAB: PAN (Income-tax Act, pan-registration.js) -->
            <div id="coSubpanel-pan" class="co-subpanel-content" style="display:none;">
              <div style="display:flex;flex-direction:column;gap:20px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
                  <div>
                    <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Permanent Account Number (PAN)</label>
                    <div style="position:relative;">
                      <input id="coPAN" value="${ohEsc(coData.pan||'')}" placeholder="Enter PAN" maxlength="10" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 70px 0 12px;font-size:13.5px;font-weight:600;color:#0f172a;text-transform:uppercase;outline:none;box-sizing:border-box;">
                      <button type="button" id="coPanFromGstinBtn" class="sales-roundoff-btn-inline" style="display:none;position:absolute;right:5px;top:50%;transform:translateY(-50%);height:30px;width:auto;min-width:0;padding:0 10px;">Update</button>
                    </div>
                    <div id="coPanStatus" style="font-size:11px;font-weight:600;margin-top:6px;min-height:14px;line-height:1.5;"></div>
                  </div>
                  <div>
                    <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">PAN Holder</label>
                    <div id="coPanHolder" style="height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;font-weight:600;color:#334155;background:#f8fafc;box-sizing:border-box;display:flex;align-items:center;">—</div>
                  </div>
                </div>
                <div id="coPanAadhaarWrap" style="display:none;">
                  <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">PAN–Aadhaar Link</label>
                  <div class="books-opt-segmented" style="display: inline-flex; background: var(--slate-200); border-radius: 8px; padding: 3px; gap: 3px;">
                    <button type="button" data-pan-aadhaar="linked" style="${gstSliderBtn}">Linked</button>
                    <button type="button" data-pan-aadhaar="unlinked" style="${gstSliderBtn}">Not Linked</button>
                  </div>
                </div>
              </div>

              <div style="margin-top:28px;border-top:1px solid #e2e8f0;padding-top:16px;">
                <button type="button" class="co-save-section-btn" data-section="pan" style="height:40px;padding:0 24px;border:none;border-radius:8px;background:#2563eb;color:#fff;font-size:13.5px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(37,99,235,.2);">Save PAN Registration</button>
              </div>
            </div>

            <!-- TAB 2: LEGAL & REGISTRATIONS (company-registrations.js) -->
            <div id="coSubpanel-registrations" class="co-subpanel-content" style="display:none;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
                <div id="coCinWrap">
                  <label id="coCinLabel" style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Corporate Identification Number (CIN)</label>
                  <input id="coCIN" value="${ohEsc(coData.cin||'')}" placeholder="Enter CIN" maxlength="21" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;font-weight:600;color:#0f172a;text-transform:uppercase;outline:none;box-sizing:border-box;">
                  <div id="coCinStatus" style="font-size:11px;font-weight:600;margin-top:6px;min-height:14px;"></div>
                </div>
                <div>
                  <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Udyam Registration Number</label>
                  <input id="coUdyam" value="${ohEsc(coData.udyam||'')}" placeholder="Enter Udyam Registration Number" maxlength="19" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;font-weight:600;color:#0f172a;text-transform:uppercase;outline:none;box-sizing:border-box;">
                  <div id="coUdyamStatus" style="font-size:11px;font-weight:600;margin-top:6px;min-height:14px;"></div>
                </div>
                <div>
                  <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">MSME Type</label>
                  <div class="books-opt-segmented" style="display: inline-flex; background: var(--slate-200); border-radius: 8px; padding: 3px; gap: 3px;">
                    <button type="button" data-msme="micro" style="${gstSliderBtn}">Micro</button>
                    <button type="button" data-msme="small" style="${gstSliderBtn}">Small</button>
                    <button type="button" data-msme="medium" style="${gstSliderBtn}">Medium</button>
                  </div>
                </div>
                <div>
                  <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Import Export Code (IEC)</label>
                  <input id="coIEC" value="${ohEsc(coData.iec||'')}" placeholder="Enter IEC" maxlength="10" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;font-weight:600;color:#0f172a;text-transform:uppercase;outline:none;box-sizing:border-box;">
                  <div id="coIecStatus" style="font-size:11px;font-weight:600;margin-top:6px;min-height:14px;"></div>
                </div>
                <div>
                  <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Trade License Number</label>
                  <input id="coTradeLicense" value="${ohEsc(coData.tradeLicense||'')}" placeholder="Enter Trade License Number" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;outline:none;box-sizing:border-box;">
                </div>
              </div>

              <div style="margin-top:28px;border-top:1px solid #e2e8f0;padding-top:16px;">
                <button type="button" class="co-save-section-btn" data-section="registrations" style="height:40px;padding:0 24px;border:none;border-radius:8px;background:#2563eb;color:#fff;font-size:13.5px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(37,99,235,.2);">Save Registrations</button>
              </div>
            </div>

            <!-- TAB 3: TAX & COMPLIANCE (company-registrations.js) -->
            <div id="coSubpanel-compliance" class="co-subpanel-content" style="display:none;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
                <div>
                  <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Tax Deduction Account Number (TAN)</label>
                  <input id="coTAN" value="${ohEsc(coData.tan||'')}" placeholder="Enter TAN" maxlength="10" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;font-weight:600;color:#0f172a;text-transform:uppercase;outline:none;box-sizing:border-box;">
                  <div id="coTanStatus" style="font-size:11px;font-weight:600;margin-top:6px;min-height:14px;"></div>
                </div>
                <div>
                  <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Professional Tax Reg Number</label>
                  <input id="coProfTax" value="${ohEsc(coData.profTax||'')}" placeholder="Enter Professional Tax Number" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;outline:none;box-sizing:border-box;">
                </div>
                <div>
                  <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">EPF Establishment Code</label>
                  <input id="coEpf" value="${ohEsc(epfCodeValue)}" placeholder="Enter EPF Establishment Code" maxlength="15" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;font-weight:600;color:#0f172a;text-transform:uppercase;outline:none;box-sizing:border-box;">
                  <div id="coEpfStatus" style="font-size:11px;font-weight:600;margin-top:6px;min-height:14px;"></div>
                </div>
                <div>
                  <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">ESIC Employer Code</label>
                  <input id="coEsic" value="${ohEsc(esicCodeValue)}" placeholder="Enter ESIC Employer Code" maxlength="17" inputmode="numeric" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;font-weight:600;color:#0f172a;outline:none;box-sizing:border-box;">
                  <div id="coEsicStatus" style="font-size:11px;font-weight:600;margin-top:6px;min-height:14px;"></div>
                </div>
                <div>
                  <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">Shop & Establishment License Number</label>
                  <input id="coShopLicense" value="${ohEsc(coData.shopLicense||'')}" placeholder="Enter Shop & Establishment License Number" style="width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;outline:none;box-sizing:border-box;">
                </div>
              </div>

              <div style="margin-top:28px;border-top:1px solid #e2e8f0;padding-top:16px;">
                <button type="button" class="co-save-section-btn" data-section="compliance" style="height:40px;padding:0 24px;border:none;border-radius:8px;background:#2563eb;color:#fff;font-size:13.5px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(37,99,235,.2);">Save Compliance Info</button>
              </div>
            </div>

            <!-- TAB 4: KEY PEOPLE (company-people.js): the list, titled for the Business Type; Add
                 Person (title card) and Edit open the person popup, and each one saves at once -->
            <div id="coSubpanel-people" class="co-subpanel-content" style="display:none;">
              <label id="coPeopleTitle" style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:10px;">Directors / Partners / Proprietor</label>
              <div style="border:1.5px solid #e2e8f0;border-radius:10px;background:#fff;padding:8px 12px;">
                <div id="coDirectorsListContainer"></div>
              </div>
              <div id="coShareTotal" style="font-size:11px;font-weight:600;margin-top:6px;min-height:14px;"></div>

              <!-- Person popup (the look of Master Desk's Additional Details popup): a person's details,
                   with Edit and Delete at the top; Edit (and Add Person) turns it into the form -->
              <div class="oh-modal-overlay" id="coPersonModal" style="display:none;">
                <div style="background:var(--white);border-radius:14px;width:94%;max-width:640px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 40px 100px rgba(0,0,0,.24);">
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 24px;border-bottom:1px solid var(--slate-200);">
                    <div style="min-width:0;">
                      <div id="coPersonModalTitle" style="font-size:15px;font-weight:700;color:var(--slate-800);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Add Person</div>
                      <div id="coPersonModalSub" style="font-size:12.5px;color:var(--slate-500);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                      <button type="button" id="coPersonModalEdit" title="Edit" aria-label="Edit" style="width:34px;height:34px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:1.5px solid var(--slate-200);border-radius:8px;background:#fff;color:var(--slate-500);cursor:pointer;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      </button>
                      <button type="button" id="coPersonModalDelete" title="Delete" aria-label="Delete" style="width:34px;height:34px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:1.5px solid var(--slate-200);border-radius:8px;background:#fff;color:#dc2626;cursor:pointer;">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      </button>
                      <button type="button" class="oh-modal-close" id="coPersonModalClose" title="Close">✕</button>
                    </div>
                  </div>
                  <div id="coPersonModalBody" style="padding:20px 24px;"></div>
                  <div id="coPersonModalFooter" style="display:flex;justify-content:flex-end;gap:10px;padding:14px 24px;border-top:1px solid var(--slate-200);">
                    <button type="button" class="btn btn-secondary" id="coPersonModalCancel" style="height:38px;padding:8px 18px;font-size:13px;font-weight:600;">Cancel</button>
                    <button type="button" class="btn btn-primary" id="coPersonModalSave" style="height:38px;padding:8px 18px;font-size:13px;font-weight:600;">Add</button>
                  </div>
                </div>
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
        // Add Person shows in the title card while Key People is open
        wrap.querySelector('#coAddPersonBtn').style.display = subtab === 'people' ? 'inline-flex' : 'none';
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
      wrap.querySelector('#coPreviewAvatar').textContent = imageInp.value ? '' : getCompanyInitials(nameInp.value || dispInp.value);
    });
    nameInp.addEventListener('input', () => {
      wrap.querySelector('#coPreviewAvatar').textContent = imageInp.value ? '' : getCompanyInitials(nameInp.value || dispInp.value);
    });

    // Logo, signature and seal: picked here, saved with Basic Identity (Save Basic Identity
    // confirms the change first)
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
        previewAvatar.textContent = '';
        previewAvatar.style.backgroundImage = `url(${base64})`;
        removeBtn.style.display = 'block';
      };
      reader.readAsDataURL(file);
    });

    removeBtn.addEventListener('click', () => {
      imageInp.value = '';
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
        signaturePreview.textContent = '';
        signaturePreview.style.background = `url(${base64}) center/contain no-repeat #fff`;
        removeSignBtn.style.display = 'block';
      };
      reader.readAsDataURL(file);
    });

    removeSignBtn.addEventListener('click', () => {
      signatureImageInp.value = '';
      signFileInp.value = '';
      signaturePreview.style.background = '#fff';
      signaturePreview.textContent = 'No signature uploaded';
      removeSignBtn.style.display = 'none';
    });

    const sealNameInp = wrap.querySelector('#coSealName');
    const sealImageInp = wrap.querySelector('#coSealImage');
    const sealPreview = wrap.querySelector('#coSealPreview');

    const removeSealBtn = wrap.querySelector('#coRemoveSealBtn');
    // A removed seal stays off the documents (no seal drawn from the name either)
    let sealRemovedNow = !!coData.sealRemoved;
    wrap.querySelector('#coGenerateSealBtn').addEventListener('click', () => {
      const name = sealNameInp.value.trim() || (nameInp ? nameInp.value.trim() : '') || 'COMPANY NAME';
      // The seal's place is the City box
      const place = getInvoiceSealPlace({ ...coData, city: wrap.querySelector('#coCityInput').value });
      const svg = buildInvoiceSealSvg(name, place);
      const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
      sealNameInp.value = name;
      sealRemovedNow = false;
      sealImageInp.value = dataUrl;
      sealPreview.style.background = `url(${dataUrl}) center/contain no-repeat`;
      if (removeSealBtn) removeSealBtn.style.display = 'block';
      if (typeof showToast === 'function') showToast('Company seal generated. Save Basic Identity to apply it.', 'success');
    });

    if (removeSealBtn) {
      removeSealBtn.addEventListener('click', () => {
        sealRemovedNow = true;
        sealImageInp.value = '';
        sealPreview.style.background = 'transparent';
        removeSealBtn.style.display = 'none';
        if (typeof showToast === 'function') showToast('Company seal removed. Save Basic Identity to apply it.', 'info');
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

    // GST Registration Type: the types in GST law (gst-registration.js). Hovering a type shows what
    // it is as per law in the Supply Type box's card (sales-select-boxes.js), under the GSTR-1
    // Filing Period slider beside the open list
    const regTypeCardHtml = (type) => {
      const t = (window.KYA_GST_REG_TYPES || []).find(x => x.type === type);
      return (t && t.what && typeof kyaLawCardHtml === 'function') ? kyaLawCardHtml(t.type, 'Registration Type', t) : '';
    };
    const placeRegTypeCard = () => {
      const card = document.getElementById('kyaPartyHoverCard');
      if (!card || card.style.display === 'none') return;
      const period = wrap.querySelector('#coGstr1PeriodWrap');
      const cell = wrap.querySelector('#coRegTypeSelectWrap').parentElement.getBoundingClientRect();
      // The slider's column; when the type files no GSTR-1 the slider is hidden: the column's top
      const slider = period.style.display !== 'none' ? period.getBoundingClientRect() : null;
      const margin = 12;
      const vh = window.innerHeight;
      let top = slider ? slider.bottom + 8 : cell.top;
      // Too little room below: the card scrolls, and only moves up when even that won't do
      let room = vh - top - margin;
      if (room < 200) {
        top = Math.max(margin, vh - margin - Math.min(card.scrollHeight, vh - margin * 2));
        room = vh - top - margin;
      }
      card.style.maxHeight = `${Math.round(room)}px`;
      const width = card.getBoundingClientRect().width;
      const left = Math.max(margin, Math.min(slider ? slider.left : cell.right + 20, window.innerWidth - width - margin));
      card.style.left = `${Math.round(left)}px`;
      card.style.top = `${Math.round(top)}px`;
    };
    const showRegTypeCard = (target, type) => {
      const html = regTypeCardHtml(type);
      if (!html || typeof positionAndShowKyaInfoHoverCard !== 'function') return;
      positionAndShowKyaInfoHoverCard(target, html);
      placeRegTypeCard();
    };
    const hideRegTypeCardSoon = (delay) => { if (typeof scheduleHidePartyHoverCard === 'function') scheduleHidePartyHoverCard(delay); };
    const hideRegTypeCard = () => { if (typeof hidePartyHoverCard === 'function') hidePartyHoverCard(); };

    const renderRegTypeList = (filter) => {
      const list = wrap.querySelector('#coRegTypeSelectOptionsList');
      const q = (filter || '').toLowerCase().trim();
      list.innerHTML = '';
      (window.KYA_GST_REG_TYPES || []).forEach(t => {
        if (q && !t.type.toLowerCase().includes(q)) return;
        const item = addrListItem(t.type, '', regTypeInp.value === t.type, () => {
          hideRegTypeCard();
          setCoRegType(t.type);
          closeAddrList('RegType');
        });
        // A long name wraps to a second line instead of being cut off
        item.style.whiteSpace = 'normal';
        item.addEventListener('mouseenter', () => showRegTypeCard(item, t.type));
        item.addEventListener('mouseleave', () => hideRegTypeCardSoon(250));
        list.appendChild(item);
      });
      if (!list.children.length) list.appendChild(addrEmptyRow('No Registration Type Found'));
    };

    // Business Type: every name shown in full
    const businessTypeInp = wrap.querySelector('#coBusinessType');
    // The CIN box (Legal & Registration) is a company's CIN or an LLP's LLPIN: its label follows
    // the Business Type, and the other Business Types have neither
    const refreshCinBox = () => {
      const type = businessTypeInp.value;
      const llp = type === 'LLP';
      wrap.querySelector('#coCinWrap').style.display = (llp || ['Pvt Ltd', 'Public Ltd', 'OPC'].indexOf(type) > -1) ? '' : 'none';
      wrap.querySelector('#coCinLabel').textContent = llp ? 'LLP Identification Number (LLPIN)' : 'Corporate Identification Number (CIN)';
      wrap.querySelector('#coCIN').placeholder = llp ? 'Enter LLPIN' : 'Enter CIN';
    };
    refreshCinBox();
    const renderBusinessTypeList = (filter) => {
      const list = wrap.querySelector('#coBusinessTypeSelectOptionsList');
      const q = (filter || '').toLowerCase().trim();
      list.innerHTML = '';
      CO_BUSINESS_TYPES.forEach(t => {
        if (q && !t.label.toLowerCase().includes(q)) return;
        const item = addrListItem(t.label, '', businessTypeInp.value === t.value, () => {
          businessTypeInp.value = t.value;
          refreshCinBox();
          renderPanStatus();
          renderRegStatuses();
          renderDirectors();
          wrap.querySelector('#coBusinessTypeSelectTriggerText').textContent = t.label;
          closeAddrList('BusinessType');
        });
        item.style.whiteSpace = 'normal';
        list.appendChild(item);
      });
      if (!list.children.length) list.appendChild(addrEmptyRow('No Business Type Found'));
    };

    const searchBoxKeys = ['District', 'State', 'RegType', 'BusinessType'];
    const searchBoxLists = { District: renderDistrictList, State: renderStateList, RegType: renderRegTypeList, BusinessType: renderBusinessTypeList };
    searchBoxKeys.forEach(key => {
      const trigger = wrap.querySelector(`#co${key}SelectTrigger`);
      const dd = wrap.querySelector(`#co${key}SelectDropdown`);
      const search = wrap.querySelector(`#co${key}SelectSearch`);
      const render = searchBoxLists[key];
      trigger.addEventListener('click', e => {
        e.stopPropagation();
        if (dd.style.display === 'flex') { closeAddrList(key); return; }
        searchBoxKeys.forEach(k => { if (k !== key) closeAddrList(k); });
        dd.style.display = 'flex';
        search.value = '';
        render('');
        setTimeout(() => search.focus(), 50);
      });
      search.addEventListener('input', () => render(search.value));
      dd.addEventListener('click', e => e.stopPropagation());
    });

    // One outside-click handler, replaced each time the panel is drawn (with the person popup's
    // Role box)
    if (window._coAddrOutsideClick) document.removeEventListener('click', window._coAddrOutsideClick);
    window._coAddrOutsideClick = () => searchBoxKeys.concat('PersonRole').forEach(closeAddrList);
    document.addEventListener('click', window._coAddrOutsideClick);


    // ── DYNAMIC LIST RENDERING ──

    // 5. Key People (company-people.js): who they are follows the Business Type. The list shows a
    // person's name, role, contact no. and email; clicking a person opens the person popup with
    // all the details, Edit and Delete at its top. Edit (and Add Person, in the title card) turns
    // the popup into the form, in Basic Identity's look; adding, editing or deleting saves at
    // once, with the loading bar.
    const PERSON_FIELD_NAMES = { pan: 'PAN', aadhaar: 'Aadhaar', din: 'DIN', share: 'Share %', phone: 'Contact No.', email: 'Email' };
    const personValid = (field, v) => !String(v || '').trim() || typeof kyaCheckPerson !== 'function' || kyaCheckPerson(field, v);
    const renderShareTotal = () => {
      const el = wrap.querySelector('#coShareTotal');
      const t = typeof kyaPeopleShareTotal === 'function' ? kyaPeopleShareTotal(coData.people.directors) : { entered: false };
      const shows = typeof kyaPeopleShowsShare === 'function' && kyaPeopleShowsShare(businessTypeInp.value) && t.entered;
      el.textContent = shows ? `Total Share: ${t.total}%` : '';
      el.style.color = t.ok ? '#059669' : '#dc2626';
    };
    const renderDirectors = () => {
      const type = businessTypeInp.value;
      const title = typeof kyaPeopleTitle === 'function' ? kyaPeopleTitle(type) : 'Directors / Partners / Proprietor';
      wrap.querySelector('#coPeopleTitle').textContent = title;
      const cont = wrap.querySelector('#coDirectorsListContainer');
      renderShareTotal();
      if (coData.people.directors.length === 0) {
        cont.innerHTML = `<div style="font-size:12.5px;color:#94a3b8;text-align:center;padding:12px 0;">No ${ohEsc(title.toLowerCase())} added.</div>`;
        return;
      }
      const dash = v => (String(v || '').trim() ? ohEsc(String(v).trim()) : '<span style="color:#94a3b8;">—</span>');
      let html = `<table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="border-bottom:1.5px solid #cbd5e1;color:#475569;font-weight:700;text-align:left;">
            <th style="padding:8px;">Name</th>
            <th style="padding:8px;width:150px;">Role</th>
            <th style="padding:8px;width:130px;">Contact No.</th>
            <th style="padding:8px;">Email</th>
          </tr>
        </thead>
        <tbody>`;
      coData.people.directors.forEach((d, idx) => {
        html += `<tr class="co-person-row" data-index="${idx}" title="Show all details" style="border-bottom:1px solid #f1f5f9;cursor:pointer;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
          <td style="padding:10px 8px;font-weight:600;color:#0f172a;overflow-wrap:anywhere;">${dash(d.name)}</td>
          <td style="padding:10px 8px;color:#334155;">${dash(d.role)}</td>
          <td style="padding:10px 8px;color:#334155;">${dash(d.phone)}</td>
          <td style="padding:10px 8px;color:#334155;overflow-wrap:anywhere;">${dash(d.email)}</td>
        </tr>`;
      });
      html += `</tbody></table>`;
      cont.innerHTML = html;
    };

    // Saves the people at once, with the loading bar (done: the toast once saved)
    const savePeople = (directors, done) => {
      const next = Object.assign({}, coData, { people: Object.assign({}, coData.people, { directors }) });
      runChangeProgress('Saving Key People', PEOPLE_ICON, [
        { label: 'Saving the key people', run: () => { Object.assign(coData, next); saveCompanyDetails(coData); renderDirectors(); } },
        { label: 'Updating reports and books', run: () => { if (typeof window.refreshAllAppViews === 'function') window.refreshAllAppViews(); } }
      ], failed => {
        if (failed) showToast('Key people saved, but some views could not be updated. Please reload KYA.', 'warning');
        else showToast(done, 'success');
      });
    };

    // The person popup. view: a person's details, with Edit and Delete at the top; edit: the form
    // for that person; add: the form for a new one. The form follows the Business Type (DIN only for
    // a role that holds one, Share % for partners) in Basic Identity's look, Role a search list like
    // its Business Type box; each field says when it is invalid, and an invalid one isn't saved.
    const personModal = wrap.querySelector('#coPersonModal');
    let personMode = 'view';
    let personIndex = null;
    const personBox = f => personModal.querySelector(`[data-person-field="${f}"]`);
    const renderPersonStatus = f => {
      const box = personBox(f), status = personModal.querySelector(`[data-person-status="${f}"]`);
      if (box && status) status.textContent = personValid(f, box.value) ? '' : 'Invalid ' + PERSON_FIELD_NAMES[f];
    };
    const renderPersonModal = () => {
      const type = businessTypeInp.value;
      const d = personIndex === null ? {} : (coData.people.directors[personIndex] || {});
      const editing = personMode !== 'view';
      const holdsDin = role => typeof kyaPeopleHasDin === 'function' && kyaPeopleHasDin(type, role);
      const showsDin = typeof kyaPeopleShowsDin === 'function' && kyaPeopleShowsDin(type);
      const showsShare = typeof kyaPeopleShowsShare === 'function' && kyaPeopleShowsShare(type);
      const label = text => `<label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-bottom:6px;">${text}</label>`;
      const INPUT = 'width:100%;height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;color:#334155;outline:none;box-sizing:border-box;';
      // (a detail as shown: Basic Identity's grey box, like GST Registration's State)
      const SHOWN = 'height:40px;border:1.5px solid #e2e8f0;border-radius:9px;padding:0 12px;font-size:13.5px;font-weight:600;color:#334155;background:#f8fafc;box-sizing:border-box;display:flex;align-items:center;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;';
      const shown = v => (String(v || '').trim() ? ohEsc(String(v).trim()) : '<span style="color:#94a3b8;font-weight:500;">—</span>');
      // A field: its box in the form, its value (view: when not the field's own) in the details
      const field = (text, f, extra, view) => editing
        ? `<div data-person-cell="${f}" style="min-width:0;">${label(text)}<input data-person-field="${f}" value="${ohEsc(d[f] || '')}" ${extra || ''} style="${INPUT}${f === 'pan' ? 'text-transform:uppercase;font-weight:600;color:#0f172a;' : ''}"><div data-person-status="${f}" style="font-size:11px;font-weight:600;color:#dc2626;margin-top:6px;min-height:14px;"></div></div>`
        : `<div style="min-width:0;">${label(text)}<div style="${SHOWN}">${view === undefined ? shown(d[f]) : view}</div></div>`;
      const role = editing
        ? `<div style="min-width:0;">${label('Role')}<input type="hidden" id="coPersonRoleInput" value="${ohEsc(d.role || '')}">${coAddrSelectBox('PersonRole', d.role || '', 'Role')}</div>`
        : `<div style="min-width:0;">${label('Role')}<div style="${SHOWN}">${shown(d.role)}</div></div>`;
      const aadhaar = typeof kyaMaskAadhaar === 'function' ? kyaMaskAadhaar(d.aadhaar || '') : (d.aadhaar || '');
      const share = String(d.share || '').trim() ? ohEsc(String(d.share).trim()) + '%' : shown('');
      wrap.querySelector('#coPersonModalBody').innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:${editing ? '4px' : '18px'} 16px;">
          ${field(editing ? 'Name *' : 'Name', 'name', 'placeholder="Enter Name"')}
          ${role}
          ${field('PAN', 'pan', 'placeholder="Enter PAN" maxlength="10"', shown(String(d.pan || '').toUpperCase()))}
          ${field('Aadhaar', 'aadhaar', 'placeholder="Enter Aadhaar" inputmode="numeric" maxlength="14"', shown(aadhaar))}
          ${showsDin && (editing || holdsDin(d.role)) ? field('DIN', 'din', 'placeholder="Enter DIN" inputmode="numeric" maxlength="8"') : ''}
          ${showsShare ? field('Share %', 'share', 'placeholder="Enter Share %" inputmode="decimal"', share) : ''}
          ${field('Contact No.', 'phone', 'placeholder="Enter Contact No."')}
          ${field('Email', 'email', 'type="email" placeholder="Enter Email"')}
        </div>`;
      wrap.querySelector('#coPersonModalTitle').textContent = personMode === 'add' ? 'Add Person'
        : (personMode === 'edit' ? 'Edit Person' : (String(d.name || '').trim() || 'Person'));
      wrap.querySelector('#coPersonModalSub').textContent = typeof kyaPeopleTitle === 'function' ? kyaPeopleTitle(type) : '';
      ['#coPersonModalEdit', '#coPersonModalDelete'].forEach(id => { wrap.querySelector(id).style.display = editing ? 'none' : 'inline-flex'; });
      wrap.querySelector('#coPersonModalFooter').style.display = editing ? 'flex' : 'none';
      wrap.querySelector('#coPersonModalSave').textContent = personMode === 'add' ? 'Add' : 'Save';
      if (!editing) return;

      // The form's Role: a search list like Basic Identity's Business Type box; a role saved before
      // the list (or under another Business Type) stays as one of the choices
      const roleInp = wrap.querySelector('#coPersonRoleInput');
      const roles = typeof kyaPeopleRoles === 'function' ? kyaPeopleRoles(type) : [];
      const roleList = d.role && roles.indexOf(d.role) < 0 ? roles.concat(d.role) : roles;
      const roleDropdown = wrap.querySelector('#coPersonRoleSelectDropdown');
      const roleSearch = wrap.querySelector('#coPersonRoleSelectSearch');
      // DIN for a role that holds one
      const refreshDinCell = () => {
        const cell = personModal.querySelector('[data-person-cell="din"]');
        if (cell) cell.style.display = holdsDin(roleInp.value) ? '' : 'none';
      };
      const renderRoleList = (filter) => {
        const list = wrap.querySelector('#coPersonRoleSelectOptionsList');
        const q = (filter || '').toLowerCase().trim();
        list.innerHTML = '';
        roleList.filter(r => !q || r.toLowerCase().includes(q)).forEach(r => list.appendChild(addrListItem(r, '', roleInp.value === r, () => {
          roleInp.value = r;
          wrap.querySelector('#coPersonRoleSelectTriggerText').textContent = r;
          closeAddrList('PersonRole');
          refreshDinCell();
        })));
        if (!list.children.length) list.appendChild(addrEmptyRow('No Role Found'));
      };
      wrap.querySelector('#coPersonRoleSelectTrigger').addEventListener('click', e => {
        e.stopPropagation();
        if (roleDropdown.style.display === 'flex') { closeAddrList('PersonRole'); return; }
        searchBoxKeys.forEach(closeAddrList);
        roleDropdown.style.display = 'flex';
        roleSearch.value = '';
        renderRoleList('');
        setTimeout(() => roleSearch.focus(), 50);
      });
      roleSearch.addEventListener('input', () => renderRoleList(roleSearch.value));
      roleDropdown.addEventListener('click', e => e.stopPropagation());
      refreshDinCell();
      Object.keys(PERSON_FIELD_NAMES).forEach(f => {
        if (!personBox(f)) return;
        personBox(f).addEventListener('input', () => renderPersonStatus(f));
        renderPersonStatus(f);
      });
      // (the form may already be gone again, e.g. Cancel straight away)
      setTimeout(() => { const nameBox = personBox('name'); if (nameBox) nameBox.focus(); }, 50);
    };
    const openPerson = (idx, mode) => {
      personIndex = idx;
      personMode = mode;
      renderPersonModal();
      personModal.style.display = 'flex';
    };
    const closePersonModal = () => {
      closeAddrList('PersonRole');
      personModal.style.display = 'none';
      personIndex = null;
    };

    wrap.querySelector('#coAddPersonBtn').addEventListener('click', () => openPerson(null, 'add'));
    wrap.querySelector('#coPersonModalClose').addEventListener('click', closePersonModal);
    // Cancel: an edit goes back to the details, a new person closes
    wrap.querySelector('#coPersonModalCancel').addEventListener('click', () => {
      if (personMode !== 'edit') { closePersonModal(); return; }
      personMode = 'view';
      renderPersonModal();
    });
    wrap.querySelector('#coPersonModalEdit').addEventListener('click', () => {
      personMode = 'edit';
      renderPersonModal();
    });
    wrap.querySelector('#coPersonModalDelete').addEventListener('click', () => {
      const idx = personIndex;
      const d = coData.people.directors[idx];
      if (!d) return;
      showKyaConfirm({
        title: 'Delete Person?',
        message: `Delete <strong style="color:#0f172a;">${ohEsc(d.name || 'this person')}</strong> from ${ohEsc(typeof kyaPeopleTitle === 'function' ? kyaPeopleTitle(businessTypeInp.value) : 'Key People')}?`,
        confirmLabel: 'Yes, Delete',
        onConfirm: () => {
          closePersonModal();
          savePeople(coData.people.directors.filter((_, i) => i !== idx), 'Person deleted.');
        }
      });
    });
    wrap.querySelector('#coPersonModalSave').addEventListener('click', () => {
      const type = businessTypeInp.value;
      const val = f => (personBox(f) ? personBox(f).value.trim() : '');
      const refuse = (f, message) => {
        personBox(f).style.borderColor = '#ef4444';
        personBox(f).focus();
        showToast(message, 'warning');
      };
      if (!val('name')) { refuse('name', 'Please enter a name.'); return; }
      const role = wrap.querySelector('#coPersonRoleInput').value.trim();
      const holdsDin = typeof kyaPeopleHasDin === 'function' && kyaPeopleHasDin(type, role);
      const bad = Object.keys(PERSON_FIELD_NAMES).find(f => personBox(f) && (f !== 'din' || holdsDin) && !personValid(f, val(f)));
      if (bad) { refuse(bad, 'Invalid ' + PERSON_FIELD_NAMES[bad]); return; }
      const adding = personMode === 'add';
      const was = adding ? {} : (coData.people.directors[personIndex] || {});
      const person = Object.assign({}, was, {
        name: val('name'), role, pan: val('pan').toUpperCase(), aadhaar: val('aadhaar'),
        din: holdsDin ? val('din') : '', share: personBox('share') ? val('share') : (was.share || ''),
        phone: val('phone'), email: val('email')
      });
      const directors = coData.people.directors.slice();
      if (adding) directors.push(person);
      else directors[personIndex] = person;
      // The partners' shares can't go past 100%
      const shares = typeof kyaPeopleShareTotal === 'function' ? kyaPeopleShareTotal(directors) : { total: 0 };
      if (personBox('share') && shares.total > 100) { refuse('share', 'Invalid Share %'); return; }
      closePersonModal();
      savePeople(directors, adding ? 'Person added.' : 'Person updated.');
    });

    // Clicking a person opens their details
    wrap.querySelector('#coDirectorsListContainer').addEventListener('click', (e) => {
      const row = e.target.closest('.co-person-row');
      if (row) openPerson(parseInt(row.dataset.index), 'view');
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
        const arr = coData[list];

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
          if (list === 'documents') {
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


    // ── GST REGISTRATION (gst-registration.js) ──
    // GSTIN check: the form the registration type's GSTIN takes, its State code and check
    // character; the State is read from its first two digits.
    const isValidPan = (raw) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(raw);
    const checkGstin = (raw) => (typeof kyaCheckGstin === 'function')
      ? kyaCheckGstin(raw, regTypeInp.value) : { ok: false, code: '', state: '', pan: '' };

    const gstinInput = wrap.querySelector('#coGSTIN');
    const gstinStatus = wrap.querySelector('#coGstinStatus');
    const gstStateCodeBox = wrap.querySelector('#coGstStateCode');
    const gstStateBox = wrap.querySelector('#coGstState');
    const regTypeInp = wrap.querySelector('#coRegTypeInput');
    const panInput = wrap.querySelector('#coPAN');
    const panStatus = wrap.querySelector('#coPanStatus');
    const panHintBtn = wrap.querySelector('#coPanFromGstinBtn');
    const startsRegistered = (typeof kyaCompanyGstReg === 'function') ? kyaCompanyGstReg(coData).registered : coData.gstRegistered !== false;
    let gstStatus = startsRegistered ? 'registered' : 'unregistered';
    let gstr1Period = coData.gstr1Period === 'quarterly' ? 'quarterly' : 'monthly';

    // The sliders look like Configuration's OFF / ON (vault-settings.js): the chosen side blue,
    // Unregistered white like OFF
    const paintGstSlider = (btn, active, white) => {
      btn.style.background = active ? (white ? 'var(--white)' : 'var(--blue-600)') : 'transparent';
      btn.style.color = active ? (white ? 'var(--slate-800)' : '#ffffff') : 'var(--slate-500)';
      btn.style.boxShadow = active ? (white ? '0 1px 2px rgba(0,0,0,0.06)' : '0 1px 2px rgba(0,0,0,0.12)') : 'none';
    };

    // Unregistered hides the registration's details; GSTR-1 Filing Period shows for the types
    // that file GSTR-1
    const refreshGstForm = () => {
      wrap.querySelectorAll('[data-gst-status]').forEach(b => paintGstSlider(b, b.dataset.gstStatus === gstStatus, b.dataset.gstStatus === 'unregistered'));
      wrap.querySelectorAll('[data-gstr1]').forEach(b => paintGstSlider(b, b.dataset.gstr1 === gstr1Period, false));
      wrap.querySelector('#coGstRegisteredFields').style.display = gstStatus === 'registered' ? 'flex' : 'none';
      const filesGstr1 = (typeof kyaGstRegRules === 'function') ? kyaGstRegRules({ registered: true, type: regTypeInp.value }).gstr1 : true;
      wrap.querySelector('#coGstr1PeriodWrap').style.display = filesGstr1 ? 'block' : 'none';
      // (the PAN and a tax deductor's TAN are checked against the GSTIN while registered)
      renderPanStatus();
      renderRegStatuses();
    };

    const setCoRegType = (type) => {
      regTypeInp.value = type;
      wrap.querySelector('#coRegTypeSelectTriggerText').textContent = type;
      renderGstinStatus();
      refreshGstForm();
    };

    // Resting on the Registration Type box shows the chosen type's card (after a second, like the
    // Supply Type box)
    const regTypeTrigger = wrap.querySelector('#coRegTypeSelectTrigger');
    const isRegTypeListOpen = () => wrap.querySelector('#coRegTypeSelectDropdown').style.display === 'flex';
    let regTypeHoverTimer = null;
    const cancelRegTypeTimer = () => { if (regTypeHoverTimer) { clearTimeout(regTypeHoverTimer); regTypeHoverTimer = null; } };
    regTypeTrigger.addEventListener('mouseenter', () => {
      cancelRegTypeTimer();
      if (isRegTypeListOpen()) return;
      regTypeHoverTimer = setTimeout(() => {
        if (!isRegTypeListOpen()) showRegTypeCard(regTypeTrigger, regTypeInp.value);
      }, 1000);
    });
    regTypeTrigger.addEventListener('mouseleave', () => {
      cancelRegTypeTimer();
      hideRegTypeCardSoon(350);
    });
    regTypeTrigger.addEventListener('mousedown', () => {
      cancelRegTypeTimer();
      hideRegTypeCard();
    });

    // ── PAN (pan-registration.js): its form, the holder its 4th letter names, and what doesn't
    // fit the profile as entered (Business Type, name, GSTIN); an individual's PAN has its
    // Aadhaar link (Section 139AA) ──
    const panHolderBox = wrap.querySelector('#coPanHolder');
    const panAadhaarWrap = wrap.querySelector('#coPanAadhaarWrap');
    let panAadhaar = coData.panAadhaarLinked === false ? 'unlinked' : 'linked';
    const panContext = () => ({
      businessType: businessTypeInp.value,
      name: nameInp.value,
      registered: gstStatus === 'registered',
      gstin: gstinInput.value,
      gstRegType: regTypeInp.value
    });
    const renderPanStatus = () => {
      const raw = panInput.value.toUpperCase().trim();
      const chk = typeof kyaCheckPan === 'function' ? kyaCheckPan(raw, panContext()) : { ok: isValidPan(raw), code: '', holder: '' };
      panHolderBox.textContent = chk.holder ? `${chk.holder} (${chk.code})` : '—';
      panHolderBox.style.color = chk.holder ? '#334155' : '#94a3b8';
      panAadhaarWrap.style.display = chk.ok && chk.code === 'P' ? 'block' : 'none';
      wrap.querySelectorAll('[data-pan-aadhaar]').forEach(b => paintGstSlider(b, b.dataset.panAadhaar === panAadhaar, b.dataset.panAadhaar === 'unlinked'));
      // Anything wrong makes it invalid
      panStatus.textContent = !raw ? '' : (chk.ok ? 'Valid PAN' : 'Invalid PAN');
      panStatus.style.color = chk.ok ? '#059669' : '#dc2626';
    };
    wrap.querySelectorAll('[data-pan-aadhaar]').forEach(b => b.addEventListener('click', () => {
      panAadhaar = b.dataset.panAadhaar;
      renderPanStatus();
    }));
    panInput.addEventListener('input', renderPanStatus);
    nameInp.addEventListener('input', renderPanStatus);
    renderPanStatus();

    // ── Legal & Registration and Tax & Compliance (company-registrations.js): each number
    // checked against its form and the profile as entered; the CIN box is checked only while it
    // shows ──
    const regContext = () => Object.assign(panContext(), { incDate: wrap.querySelector('#coIncDate').value });
    const isLlpType = () => businessTypeInp.value === 'LLP';
    const REG_BOXES = [
      { id: 'coCIN', status: 'coCinStatus', kind: () => (isLlpType() ? 'llpin' : 'cin'), name: () => (isLlpType() ? 'LLPIN' : 'CIN') },
      { id: 'coUdyam', status: 'coUdyamStatus', kind: () => 'udyam', name: () => 'Udyam Number' },
      { id: 'coIEC', status: 'coIecStatus', kind: () => 'iec', name: () => 'IEC' },
      { id: 'coTAN', status: 'coTanStatus', kind: () => 'tan', name: () => 'TAN' },
      { id: 'coEpf', status: 'coEpfStatus', kind: () => 'epf', name: () => 'EPF Code' },
      { id: 'coEsic', status: 'coEsicStatus', kind: () => 'esic', name: () => 'ESIC Code' }
    ];
    const regBox = id => REG_BOXES.find(b => b.id === id);
    const regInput = box => wrap.querySelector('#' + box.id);
    const regShown = box => box.id !== 'coCIN' || wrap.querySelector('#coCinWrap').style.display !== 'none';
    const regValid = box => typeof kyaCheckRegistration !== 'function' || kyaCheckRegistration(box.kind(), regInput(box).value, regContext());
    const renderRegStatus = box => {
      const raw = regInput(box).value.trim();
      const el = wrap.querySelector('#' + box.status);
      const ok = regValid(box);
      el.textContent = raw ? `${ok ? 'Valid' : 'Invalid'} ${box.name()}` : '';
      el.style.color = ok ? '#059669' : '#dc2626';
    };
    const renderRegStatuses = () => REG_BOXES.forEach(renderRegStatus);
    REG_BOXES.forEach(box => regInput(box).addEventListener('input', () => renderRegStatus(box)));
    // (the TAN follows the name and the GSTIN, the CIN the Date of Incorporation)
    nameInp.addEventListener('input', renderRegStatuses);
    ['input', 'change'].forEach(ev => wrap.querySelector('#coIncDate').addEventListener(ev, renderRegStatuses));
    // The first number in the list that is entered but invalid (none: all can be saved), and
    // refusing to save it
    const firstInvalidReg = ids => ids.map(regBox).find(box => regShown(box) && regInput(box).value.trim() && !regValid(box));
    const refuseInvalidReg = box => {
      regInput(box).style.borderColor = '#ef4444';
      regInput(box).focus();
      showToast('Invalid ' + box.name(), 'warning');
    };

    // MSME Type: Micro, Small or Medium (MSMED Act, Section 7), with the Udyam number
    let msmeType = Object.prototype.hasOwnProperty.call(window.KYA_MSME_TYPES || {}, coData.msmeType) ? coData.msmeType : 'micro';
    const paintMsme = () => wrap.querySelectorAll('[data-msme]').forEach(b => paintGstSlider(b, b.dataset.msme === msmeType, false));
    wrap.querySelectorAll('[data-msme]').forEach(b => b.addEventListener('click', () => {
      msmeType = b.dataset.msme;
      paintMsme();
    }));
    paintMsme();
    renderRegStatuses();

    const renderGstinStatus = () => {
      const raw = gstinInput.value.toUpperCase().trim();
      const chk = checkGstin(raw);
      panHintBtn.style.display = 'none';

      // State of registration: the GSTIN's first two digits, as State Code and State
      gstStateCodeBox.textContent = chk.ok ? chk.code : '—';
      gstStateBox.textContent = chk.ok ? chk.state : '—';
      gstStateCodeBox.style.color = gstStateBox.style.color = chk.ok ? '#334155' : '#94a3b8';

      if (!raw) {
        gstinStatus.textContent = '';
        return;
      }

      if (!chk.ok) {
        gstinStatus.textContent = 'Invalid GSTIN';
        gstinStatus.style.color = '#dc2626';
        return;
      }

      gstinStatus.textContent = 'Valid GSTIN';
      gstinStatus.style.color = '#059669';

      // A PAN-based GSTIN carries the PAN (a tax deductor's carries its TAN instead): another PAN
      // in the PAN box can be replaced by it (Update)
      if (!chk.pan) return;
      const currentPan = panInput.value.trim().toUpperCase();
      if (currentPan && currentPan !== chk.pan) panHintBtn.style.display = 'block';
    };

    panHintBtn.addEventListener('click', () => {
      const chk = checkGstin(gstinInput.value.toUpperCase().trim());
      if (chk.pan) {
        panInput.value = chk.pan;
        panHintBtn.style.display = 'none';
        renderPanStatus();
      }
    });

    // A GSTIN entered or changed carries the PAN it was issued on (Section 25(6), CGST Act): asked
    // whether that is the company's PAN, once for each GSTIN. Yes makes it the PAN (saved, with
    // its loading bar); No leaves the PAN as it is.
    let panAskedForGstin = '';
    const askPanFromGstin = () => {
      const raw = gstinInput.value.toUpperCase().trim();
      const chk = checkGstin(raw);
      if (gstStatus !== 'registered' || !chk.ok || !chk.pan || raw === panAskedForGstin) return;
      if (chk.pan === panInput.value.trim().toUpperCase()) return;
      panAskedForGstin = raw;
      showKyaConfirm({
        title: 'Is this your PAN?',
        message: `The GSTIN ${ohEsc(raw)} carries the PAN <strong style="color:#0f172a;">${ohEsc(chk.pan)}</strong>.`,
        confirmLabel: 'Yes',
        cancelLabel: 'No',
        okBg: '#2563eb',
        iconBg: 'var(--blue-50)', iconColor: 'var(--blue-600)', iconSvg: PAN_ICON,
        onConfirm: () => usePanFromGstin(chk.pan)
      });
    };
    // The PAN box takes it, and a PAN that fits the profile is saved at once
    const usePanFromGstin = (pan) => {
      panInput.value = pan;
      panHintBtn.style.display = 'none';
      renderPanStatus();
      const chk = typeof kyaCheckPan === 'function' ? kyaCheckPan(pan, panContext()) : { ok: isValidPan(pan) };
      if (!chk.ok) { showToast('Invalid PAN', 'warning'); return; }
      const next = Object.assign({}, coData, { pan, panAadhaarLinked: pan.charAt(3) === 'P' ? panAadhaar === 'linked' : undefined });
      const saved = getCompanyDetails();
      const notes = typeof kyaPanChangeNotes === 'function' ? kyaPanChangeNotes(saved, next) : null;
      if (notes && notes.changes.length) applyPanChange(saved, next, notes);
    };

    // A change of GST registration or of Basic Identity reaches new invoices, purchases and
    // reports, so it is confirmed first: what changes (from → to), what KYA does from now on and
    // what the law asks for it (kyaGstRegChangeNotes, gst-registration.js; kyaIdentityChangeNotes,
    // company-identity.js), in KYA's confirm popup. how: its title, button, law heading and icon.
    const GST_ICON = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>';
    const IDENTITY_ICON = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    const confirmChange = (notes, how, onYes) => {
      const head = t => `<div style="font-size:10.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:#2563eb;margin:14px 0 4px;">${t}</div>`;
      const list = items => `<ul style="margin:0;padding-left:18px;font-size:12.5px;line-height:1.55;color:#334155;">${items.map(i => `<li style="margin-bottom:4px;">${ohEsc(i)}</li>`).join('')}</ul>`;
      // (a row without "from" is a detail entered on the first save)
      const message = `
        <div style="text-align:left;max-height:44vh;overflow-y:auto;padding-right:4px;">
          <div style="border:1.5px solid #e2e8f0;border-radius:12px;padding:6px 12px;background:#f8fafc;">
            ${notes.changes.map(c => `
              <div style="display:flex;justify-content:space-between;gap:12px;padding:4px 0;font-size:12.5px;">
                <span style="color:#64748b;font-weight:600;white-space:nowrap;">${ohEsc(c.label)}</span>
                <span style="color:#0f172a;font-weight:700;text-align:right;">${c.from === null ? '' : ohEsc(c.from) + ' → '}${ohEsc(c.to)}</span>
              </div>`).join('')}
          </div>
          ${notes.kya.length ? head('In KYA, from now on') + list(notes.kya) : ''}
          ${notes.law.length ? head(how.lawHead) + list(notes.law) : ''}
        </div>`;
      showKyaConfirm({
        title: how.title,
        message,
        confirmLabel: how.confirmLabel,
        okBg: '#2563eb',
        iconBg: 'var(--blue-50)', iconColor: 'var(--blue-600)', iconSvg: how.icon,
        onConfirm: onYes
      });
    };
    const GST_CHANGE = { title: 'Apply GST Changes?', confirmLabel: 'Yes, Apply', lawHead: 'As per law, on the GST portal', icon: GST_ICON };
    const IDENTITY_CHANGE = { title: 'Apply Company Changes?', confirmLabel: 'Yes, Apply', lawHead: 'As per law', icon: IDENTITY_ICON };
    const IDENTITY_ADD = { title: 'Add Company Details?', confirmLabel: 'Yes, Add', lawHead: 'As per law', icon: IDENTITY_ICON };
    const PAN_ICON = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><line x1="13" y1="10" x2="18" y2="10"/><line x1="13" y1="14" x2="18" y2="14"/></svg>';
    const PAN_CHANGE = { title: 'Apply PAN Changes?', confirmLabel: 'Yes, Apply', lawHead: 'As per law', icon: PAN_ICON };
    const PAN_ADD = { title: 'Add PAN?', confirmLabel: 'Yes, Add', lawHead: 'As per law', icon: PAN_ICON };
    const REGISTRATIONS_ICON = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
    const COMPLIANCE_ICON = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
    const PEOPLE_ICON = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
    // (after: what is drawn again once saved)
    const REGISTRATIONS_CHANGE = { title: 'Apply Registration Changes?', confirmLabel: 'Yes, Apply', lawHead: 'As per law', icon: REGISTRATIONS_ICON,
      applying: 'Applying Registration Changes', saving: 'Saving the registrations', done: 'Registrations saved', after: renderRegStatuses };
    const COMPLIANCE_CHANGE = { title: 'Apply Compliance Changes?', confirmLabel: 'Yes, Apply', lawHead: 'As per law', icon: COMPLIANCE_ICON,
      applying: 'Applying Compliance Changes', saving: 'Saving the compliance details', done: 'Compliance details saved', after: renderRegStatuses };

    // Applying it: each step in turn under a 0–100% bar laid out like KYA's loading screen (label
    // and percentage over a thin bar), in the confirm popup's card
    const runChangeProgress = (title, icon, steps, onDone) => {
      document.getElementById('kyaGstApplyOverlay')?.remove();
      const overlay = document.createElement('div');
      overlay.id = 'kyaGstApplyOverlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.65);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:center;justify-content:center;box-sizing:border-box;';
      overlay.innerHTML = `
        <div role="progressbar" aria-label="${title}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" style="background:#fff;border-radius:24px;box-shadow:0 24px 48px -12px rgba(15,23,42,0.35);border:1px solid #f1f5f9;text-align:center;font-family:var(--font-main, Inter, sans-serif);max-width:440px;width:90%;padding:40px 32px 32px;box-sizing:border-box;">
          <div style="background:var(--blue-50);color:var(--blue-600);width:64px;height:64px;border-radius:20px;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 -2px 0 rgba(0,0,0,.05);">${icon}</div>
          <div style="font-size:20px;font-weight:800;color:#0f172a;margin-bottom:12px;letter-spacing:-0.4px;">${title}</div>
          <div data-role="step" style="font-size:14px;color:#64748b;line-height:1.6;margin-bottom:24px;min-height:22px;"></div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <span style="font-size:12px;font-weight:500;color:#64748b;letter-spacing:.1em;text-transform:uppercase;">Loading</span>
            <span data-role="pct" style="font-size:13px;font-weight:700;color:#0f172a;font-variant-numeric:tabular-nums;">0%</span>
          </div>
          <div style="width:100%;height:4px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
            <div data-role="fill" style="height:100%;width:0%;background:linear-gradient(90deg,#1e40af,#2563eb,#0284c7);border-radius:4px;transition:width .12s linear;"></div>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      const box = overlay.firstElementChild;
      const stepEl = overlay.querySelector('[data-role="step"]');
      const pctEl = overlay.querySelector('[data-role="pct"]');
      const fillEl = overlay.querySelector('[data-role="fill"]');
      let shown = 0, reached = 0, failed = false;
      const paint = () => {
        const p = Math.floor(shown);
        pctEl.textContent = p + '%';
        fillEl.style.width = p + '%';
        box.setAttribute('aria-valuenow', p);
      };
      // The bar follows the finished steps in 40 ms ticks, as the loading screen does
      const timer = setInterval(() => {
        if (shown < reached) { shown = Math.min(reached, shown + 2.5); paint(); }
        if (shown >= 100) {
          clearInterval(timer);
          setTimeout(() => { overlay.remove(); if (onDone) onDone(failed); }, 450);
        }
      }, 40);
      let i = 0;
      const nextStep = () => {
        if (i >= steps.length) return;
        const s = steps[i++];
        stepEl.textContent = s.label + '…';
        try { s.run(); } catch (e) { failed = true; console.error('Change step failed:', s.label, e); }
        reached = Math.round(100 * i / steps.length);
        setTimeout(nextStep, 320);
      };
      nextStep();
    };

    // The steps: saved documents keep the GSTIN they were issued with when it changes, the
    // registration is saved, open new invoices / orders take it, and reports and books refresh
    // (with the auto backup)
    const applyGstChange = (next) => {
      const before = typeof kyaCompanyGstReg === 'function' ? kyaCompanyGstReg(coData).gstin : '';
      const after = typeof kyaCompanyGstReg === 'function' ? kyaCompanyGstReg(next).gstin : '';
      const steps = [];
      if (before && before !== after && typeof kyaKeepSavedDocsGstin === 'function') {
        steps.push({ label: 'Keeping saved documents as they were made', run: () => kyaKeepSavedDocsGstin(before) });
      }
      steps.push({ label: 'Saving the GST registration', run: () => { Object.assign(coData, next); saveCompanyDetails(coData); updateSidebarCompany(); } });
      steps.push({ label: 'Updating new invoices and orders', run: () => document.dispatchEvent(new CustomEvent('kya:gst-registration-changed')) });
      steps.push({ label: 'Updating reports and books', run: () => { if (typeof window.refreshAllAppViews === 'function') window.refreshAllAppViews(); } });
      runChangeProgress('Applying GST Changes', GST_ICON, steps, failed => {
        if (failed) showToast('GST registration saved, but some views could not be updated. Please reload KYA.', 'warning');
        else showToast('GST registration saved and applied.', 'success');
      });
    };

    // Basic Identity (saved: the details as saved, next: as entered): documents already saved keep
    // the details they were made with, the details are saved (with a company's former name), open
    // new invoices / orders take them (the State decides CGST + SGST or IGST while not
    // registered), and reports and books refresh (with the auto backup)
    const applyIdentityChange = (saved, next, notes) => {
      const steps = [];
      if (notes.keeps && typeof kyaKeepSavedDocsIdentity === 'function') {
        steps.push({ label: 'Keeping saved documents as they were made', run: () => kyaKeepSavedDocsIdentity(saved, next) });
      }
      steps.push({ label: 'Saving the company details', run: () => {
        if (typeof kyaKeepFormerName === 'function') kyaKeepFormerName(saved, next);
        Object.assign(coData, next);
        delete coData.sealPlaceCustom;
        // A generated seal is drawn with the name and place it now reads, as on the documents
        if (typeof coData.sealImage === 'string' && coData.sealImage.startsWith('data:image/svg+xml')) {
          try {
            const svg = buildInvoiceSealSvg(coData.sealName || coData.name || coData.displayName || '', getInvoiceSealPlace(coData));
            coData.sealImage = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
          } catch (e) {}
          sealImageInp.value = coData.sealImage;
          sealPreview.style.background = `url(${coData.sealImage}) center/contain no-repeat`;
        }
        sealNameInp.value = coData.sealName || '';
        saveCompanyDetails(coData);
        updateSidebarCompany();
      } });
      steps.push({ label: 'Updating new invoices and orders', run: () => document.dispatchEvent(new CustomEvent('kya:gst-registration-changed')) });
      steps.push({ label: 'Updating reports and books', run: () => { if (typeof window.refreshAllAppViews === 'function') window.refreshAllAppViews(); } });
      runChangeProgress(notes.first ? 'Adding Company Details' : 'Applying Company Changes', IDENTITY_ICON, steps, failed => {
        if (failed) showToast('Company details saved, but some views could not be updated. Please reload KYA.', 'warning');
        else showToast('Company details saved and applied.', 'success');
      });
    };

    // PAN (saved: the details as saved, next: as entered): documents already saved keep the PAN
    // they were made with, the PAN is saved, and reports and books refresh (with the auto backup)
    const applyPanChange = (saved, next, notes) => {
      const steps = [];
      if (notes.keeps && typeof kyaKeepSavedDocsIdentity === 'function') {
        steps.push({ label: 'Keeping saved documents as they were made', run: () => kyaKeepSavedDocsIdentity(saved, next) });
      }
      steps.push({ label: 'Saving the PAN', run: () => { Object.assign(coData, next); saveCompanyDetails(coData); renderPanStatus(); } });
      steps.push({ label: 'Updating reports and books', run: () => { if (typeof window.refreshAllAppViews === 'function') window.refreshAllAppViews(); } });
      runChangeProgress(notes.first ? 'Adding PAN' : 'Applying PAN Changes', PAN_ICON, steps, failed => {
        if (failed) showToast('PAN saved, but some views could not be updated. Please reload KYA.', 'warning');
        else showToast('PAN saved and applied.', 'success');
      });
    };

    // Legal & Registration / Tax & Compliance / Key People (saved: as saved, next: as entered;
    // how: the tab's titles): documents already saved keep the numbers they print, the details are
    // saved, and reports and books refresh (with the auto backup)
    const applyRegistrationChange = (saved, next, notes, how) => {
      const steps = [];
      if (notes.keeps && typeof kyaKeepSavedDocsIdentity === 'function') {
        steps.push({ label: 'Keeping saved documents as they were made', run: () => kyaKeepSavedDocsIdentity(saved, next) });
      }
      steps.push({ label: how.saving, run: () => { Object.assign(coData, next); saveCompanyDetails(coData); if (how.after) how.after(); } });
      steps.push({ label: 'Updating reports and books', run: () => { if (typeof window.refreshAllAppViews === 'function') window.refreshAllAppViews(); } });
      runChangeProgress(how.applying, how.icon, steps, failed => {
        if (failed) showToast(how.done + ', but some views could not be updated. Please reload KYA.', 'warning');
        else showToast(how.done + ' and applied.', 'success');
      });
    };

    wrap.querySelectorAll('[data-gst-status]').forEach(b => b.addEventListener('click', () => {
      gstStatus = b.dataset.gstStatus;
      refreshGstForm();
    }));
    wrap.querySelectorAll('[data-gstr1]').forEach(b => b.addEventListener('click', () => {
      gstr1Period = b.dataset.gstr1;
      refreshGstForm();
    }));

    gstinInput.addEventListener('input', renderGstinStatus);
    gstinInput.addEventListener('input', renderPanStatus);
    gstinInput.addEventListener('input', renderRegStatuses);
    gstinInput.addEventListener('input', askPanFromGstin);
    renderGstinStatus();
    refreshGstForm();

    // ── INITIALIZING LISTS & LOADS ──
    renderDirectors();
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
          const next = Object.assign({}, coData, {
            name,
            displayName: wrap.querySelector('#coDisplayNameInput').value.trim(),
            businessType: wrap.querySelector('#coBusinessType').value,
            incDate: wrap.querySelector('#coIncDate').value,
            address: wrap.querySelector('#coAddressInput').value.trim(),
            city: wrap.querySelector('#coCityInput').value.trim(),
            district: wrap.querySelector('#coDistrictInput').value.trim(),
            state: wrap.querySelector('#coStateInput').value,
            pincode: wrap.querySelector('#coPincodeInput').value.trim(),
            phone: wrap.querySelector('#coPhoneInput').value.trim(),
            email: wrap.querySelector('#coEmailInput').value.trim(),
            website: wrap.querySelector('#coWebsiteInput').value.trim(),
            sealRemoved: sealRemovedNow
          });
          const sealVal = wrap.querySelector('#coSealImage')?.value;
          if (sealVal !== undefined) next.sealImage = sealVal;
          const sealNameVal = wrap.querySelector('#coSealName')?.value;
          if (sealNameVal !== undefined) next.sealName = sealNameVal;
          const signVal = wrap.querySelector('#coSignatureImage')?.value;
          if (signVal !== undefined) next.signatureImage = signVal;
          const iconVal = wrap.querySelector('#coIconImage')?.value;
          if (iconVal !== undefined) next.iconImage = iconVal;
          // The details as saved: the documents print them until the change is applied
          const saved = getCompanyDetails();
          // A seal that read the old company name reads the new one
          const oldName = String(saved.name || '').trim();
          if (oldName && name !== oldName && String(next.sealName || '').trim().toLowerCase() === oldName.toLowerCase()) next.sealName = name;
          // Added or changed: confirmed, then applied with its loading bar (company-identity.js)
          const notes = typeof kyaIdentityChangeNotes === 'function' ? kyaIdentityChangeNotes(saved, next, { businessTypeLabel }) : null;
          if (notes && notes.changes.length) {
            confirmChange(notes, notes.first ? IDENTITY_ADD : IDENTITY_CHANGE, () => applyIdentityChange(saved, next, notes));
            return;
          }
          Object.assign(coData, next);
          delete coData.sealPlaceCustom;
        }

        else if (section === 'gst') {
          const registered = gstStatus === 'registered';
          const gstin = gstinInput.value.trim().toUpperCase();
          if (registered && !checkGstin(gstin).ok) {
            gstinInput.style.borderColor = '#ef4444';
            gstinInput.focus();
            showToast('Please enter a valid GSTIN.', 'warning');
            return;
          }
          const next = Object.assign({}, coData, {
            gstRegistered: registered,
            gstin: registered ? gstin : '',
            gstRegType: regTypeInp.value || 'Regular',
            gstr1Period
          });
          // A change that reaches invoices and reports: confirmed, then applied with its loading bar
          const notes = typeof kyaGstRegChangeNotes === 'function' ? kyaGstRegChangeNotes(coData, next) : null;
          if (notes && notes.changes.length) {
            confirmChange(notes, GST_CHANGE, () => applyGstChange(next));
            return;
          }
          Object.assign(coData, next);
        }

        else if (section === 'pan') {
          const pan = panInput.value.trim().toUpperCase();
          // An invalid PAN isn't saved: its form, holder status and fit with the profile
          const panCheck = typeof kyaCheckPan === 'function' ? kyaCheckPan(pan, panContext()) : { ok: isValidPan(pan) };
          if (pan && !panCheck.ok) {
            panInput.style.borderColor = '#ef4444';
            panInput.focus();
            showToast('Invalid PAN', 'warning');
            return;
          }
          // An individual's PAN keeps its Aadhaar link; any other holder's has none
          const next = Object.assign({}, coData, { pan, panAadhaarLinked: pan.charAt(3) === 'P' ? panAadhaar === 'linked' : undefined });
          const saved = getCompanyDetails();
          // A change that reaches the documents: confirmed, then applied with its loading bar
          const notes = typeof kyaPanChangeNotes === 'function' ? kyaPanChangeNotes(saved, next) : null;
          if (notes && notes.changes.length) {
            confirmChange(notes, notes.first ? PAN_ADD : PAN_CHANGE, () => applyPanChange(saved, next, notes));
            return;
          }
          Object.assign(coData, next);
        }

        else if (section === 'registrations') {
          const invalid = firstInvalidReg(['coCIN', 'coUdyam', 'coIEC']);
          if (invalid) { refuseInvalidReg(invalid); return; }
          const next = Object.assign({}, coData, {
            cin: wrap.querySelector('#coCIN').value.trim().toUpperCase(),
            udyam: wrap.querySelector('#coUdyam').value.trim().toUpperCase(),
            msmeType,
            tradeLicense: wrap.querySelector('#coTradeLicense').value.trim(),
            iec: wrap.querySelector('#coIEC').value.trim().toUpperCase()
          });
          const saved = getCompanyDetails();
          // A change: confirmed, then applied with its loading bar (company-registrations.js)
          const notes = typeof kyaRegistrationsChangeNotes === 'function' ? kyaRegistrationsChangeNotes(saved, next) : null;
          if (notes && notes.changes.length) {
            confirmChange(notes, REGISTRATIONS_CHANGE, () => applyRegistrationChange(saved, next, notes, REGISTRATIONS_CHANGE));
            return;
          }
          Object.assign(coData, next);
        }

        else if (section === 'compliance') {
          const invalid = firstInvalidReg(['coTAN', 'coEpf', 'coEsic']);
          if (invalid) { refuseInvalidReg(invalid); return; }
          // (the old ESI / PF box is now the EPF and ESIC boxes)
          const next = Object.assign({}, coData, {
            tan: wrap.querySelector('#coTAN').value.trim().toUpperCase(),
            profTax: wrap.querySelector('#coProfTax').value.trim(),
            epfCode: wrap.querySelector('#coEpf').value.trim().toUpperCase(),
            esicCode: wrap.querySelector('#coEsic').value.trim(),
            shopLicense: wrap.querySelector('#coShopLicense').value.trim(),
            esiPf: undefined
          });
          const saved = getCompanyDetails();
          const notes = typeof kyaComplianceChangeNotes === 'function' ? kyaComplianceChangeNotes(saved, next) : null;
          if (notes && notes.changes.length) {
            confirmChange(notes, COMPLIANCE_CHANGE, () => applyRegistrationChange(saved, next, notes, COMPLIANCE_CHANGE));
            return;
          }
          Object.assign(coData, next);
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

