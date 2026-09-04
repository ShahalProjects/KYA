// ══════════════════════════════════════════════════════════════════
  //  SALES PRINT & EVENTS — Print invoice, due-date helper, event wiring
  //  (Split from sales.js for maintainability)
  // ══════════════════════════════════════════════════════════════════

  function viewPrintInvoice(id) {
    const list = window.KYA_STORE.salesVouchers || [];
    const inv = list.find(v => v.id === id);
    if (!inv) return;
    
    const customer = (typeof findPartyById === 'function' ? findPartyById(inv.customerId, 'Customer') : null) || (typeof coaLedgers !== 'undefined' ? coaLedgers.find(l => l.id == inv.customerId) : null) || { name: 'Unknown Customer' };
    const partyName = (inv.partyOverride && inv.partyOverride.name) || customer.name || 'Unknown Customer';
    const partyContact = (inv.partyOverride && inv.partyOverride.contactName) || customer.contactName || '';
    const partyAddr = (inv.partyOverride && inv.partyOverride.address) || customer.address || '';
    const cityPin = [(inv.partyOverride && inv.partyOverride.city) || customer.city, (inv.partyOverride && inv.partyOverride.pincode) || customer.pincode].filter(Boolean).join(' - ');
    const stateCountry = [(inv.partyOverride && inv.partyOverride.state) || customer.state, (inv.partyOverride && inv.partyOverride.country) || customer.country || 'India'].filter(Boolean).join(', ');
    const partyGstin = (inv.partyOverride && inv.partyOverride.gstin) || customer.gstin || '';
    const partyPan = (inv.partyOverride && inv.partyOverride.pan) || customer.pan || '';
    const partyPhone = (inv.partyOverride && inv.partyOverride.phone) || customer.phone || customer.mobile || '';
    
    let execName = '';
    if (inv.salesExecutiveId) {
      const execEmp = ohEmployees.find(e => e.id == inv.salesExecutiveId);
      if (execEmp) {
        execName = execEmp.name;
      }
    }
    
    const overlay = document.createElement('div');
    overlay.className = 'inv-modal-overlay';
    overlay.id = 'salesInvoicePrintOverlay';
    
    let rowsHtml = '';
    if (inv.type === 'Product') {
      rowsHtml = inv.rows.map((r, i) => {
        const base = r.qty * r.rate;
        const discAmt = r.discountType === 'pct' ? (base * (r.discount / 100)) : r.discount;
        const itemTotal = base - discAmt;
        const taxAmt = itemTotal * (r.tax / 100);
        const finalAmt = itemTotal + taxAmt;
        const discStr = r.discountType === 'pct' ? `${r.discount}% (₹${fmtNum(discAmt)})` : `₹${fmtNum(r.discount)}`;
        return `
          <tr style="border-bottom: 1px solid var(--slate-100);">
            <td style="padding: 10px; font-weight: 500;">${i+1}</td>
            <td style="padding: 10px; font-weight: 600;">${ohEsc(r.item)}</td>
            <td style="padding: 10px; text-align: right;">${r.qty}</td>
            <td style="padding: 10px; text-align: right;">₹ ${fmtNum(r.rate)}</td>
            <td style="padding: 10px; text-align: right;">${discStr}</td>
            <td style="padding: 10px; text-align: right;">${r.tax}%</td>
            <td style="padding: 10px; text-align: right; font-weight: 700;">₹ ${fmtNum(finalAmt)}</td>
          </tr>
        `;
      }).join('');
    } else {
      rowsHtml = inv.rows.map((r, i) => {
        const revenueName = (coaLedgers.find(l => l.id == r.revenueLedgerId) || { name: 'Revenue Account' }).name;
        const base = r.baseAmount;
        const discAmt = r.discountType === 'pct' ? (base * (r.discount / 100)) : r.discount;
        const itemTotal = base - discAmt;
        const taxAmt = itemTotal * (r.tax / 100);
        const finalAmt = itemTotal + taxAmt;
        const discStr = r.discountType === 'pct' ? `${r.discount}% (₹${fmtNum(discAmt)})` : `₹${fmtNum(r.discount)}`;
        return `
          <tr style="border-bottom: 1px solid var(--slate-100);">
            <td style="padding: 10px; font-weight: 500;">${i+1}</td>
            <td style="padding: 10px; font-weight: 600;">${ohEsc(revenueName)}</td>
            <td style="padding: 10px; text-align: right;">1</td>
            <td style="padding: 10px; text-align: right;">₹ ${fmtNum(r.baseAmount)}</td>
            <td style="padding: 10px; text-align: right;">${discStr}</td>
            <td style="padding: 10px; text-align: right;">${r.tax}%</td>
            <td style="padding: 10px; text-align: right; font-weight: 700;">₹ ${fmtNum(finalAmt)}</td>
          </tr>
        `;
      }).join('');
    }
    
    let taxDetailsHtml = '';
    const taxSummary = {};
    inv.rows.forEach(r => {
      const base = inv.type === 'Product' ? (r.qty * r.rate) : r.baseAmount;
      const discAmt = r.discountType === 'pct' ? (base * (r.discount / 100)) : r.discount;
      const val = Math.max(0, base - discAmt);
      const taxAmt = val * (r.tax / 100);
      if (r.tax > 0) {
        if (!taxSummary[r.tax]) {
          taxSummary[r.tax] = { taxable: 0, taxAmt: 0 };
        }
        taxSummary[r.tax].taxable += val;
        taxSummary[r.tax].taxAmt += taxAmt;
      }
    });
    
    const supplyType = inv.salesSupplyType || 'Intra-State (CGST + SGST)';
    for (const pct in taxSummary) {
      const taxable = taxSummary[pct].taxable;
      const taxAmt = taxSummary[pct].taxAmt;
      if (supplyType === 'Intra-State (CGST + SGST)' || supplyType === 'Deemed Export') {
        const halfPct = parseFloat(pct) / 2;
        const halfAmt = taxAmt / 2;
        taxDetailsHtml += `
          <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--slate-500); margin-top: 4px;">
            <span>CGST @ ${halfPct}% (on ₹ ${fmtNum(taxable)})</span>
            <span>₹ ${fmtNum(halfAmt)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--slate-500); margin-top: 4px;">
            <span>SGST @ ${halfPct}% (on ₹ ${fmtNum(taxable)})</span>
            <span>₹ ${fmtNum(halfAmt)}</span>
          </div>
        `;
      } else if (supplyType === 'Inter-State (IGST)' || supplyType === 'SEZ With Tax') {
        taxDetailsHtml += `
          <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--slate-500); margin-top: 4px;">
            <span>IGST @ ${pct}% (on ₹ ${fmtNum(taxable)})</span>
            <span>₹ ${fmtNum(taxAmt)}</span>
          </div>
        `;
      } else {
        taxDetailsHtml += `
          <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--slate-500); margin-top: 4px;">
            <span>GST @ ${pct}% (on ₹ ${fmtNum(taxable)})</span>
            <span>₹ ${fmtNum(taxAmt)}</span>
          </div>
        `;
      }
    }
    
    overlay.innerHTML = `
      <div class="inv-modal-card" style="padding: 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-bottom: 1.5px solid var(--slate-100); background: var(--slate-50); border-radius: 20px 20px 0 0;">
          <div style="font-weight: 700; color: var(--slate-800);">${inv.isReturn ? 'Sales Reversal Preview' : 'Invoice Preview'}</div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <!-- Export Dropdown -->
            <div class="rpt-more-wrap" style="position: relative;">
              <button class="btn btn-secondary" id="btnExportInvoiceAction" type="button" style="padding: 7px 12px; display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 13px; height: 34px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Export</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              <div id="invExportDropdown" class="rpt-more-dropdown" style="top: calc(100% + 6px); right: 0; min-width: 130px;">
                <button class="rpt-menu-item" id="invExportPdfBtn" type="button">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                  PDF
                </button>
                <button class="rpt-menu-item" id="invExportExcelBtn" type="button">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="8" y1="13" x2="16" y2="17"></line>
                    <line x1="16" y1="13" x2="8" y2="17"></line>
                  </svg>
                  Excel
                </button>
              </div>
            </div>

            <!-- Edit Button -->
            <button onclick="loadSalesInvoice((window.KYA_STORE.salesVouchers || []).find(v => v.id === ${inv.id}), false); document.getElementById('salesInvoicePrintOverlay')?.remove();" title="Edit Invoice" style="background: var(--blue-50); border: 1.5px solid var(--blue-100); border-radius: 6px; padding: 7px; cursor: pointer; color: var(--blue-600); display: flex; align-items: center; justify-content: center; height: 34px; width: 34px; transition: all 0.2s;" onmouseover="this.style.background='var(--blue-100)'" onmouseout="this.style.background='var(--blue-50)'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <!-- Delete Button -->
            <button onclick="deleteSalesInvoice(${inv.id}); document.getElementById('salesInvoicePrintOverlay')?.remove();" title="Delete Invoice" style="background: var(--red-50); border: 1.5px solid var(--red-100); border-radius: 6px; padding: 7px; cursor: pointer; color: var(--red-600); display: flex; align-items: center; justify-content: center; height: 34px; width: 34px; transition: all 0.2s;" onmouseover="this.style.background='var(--red-100)'" onmouseout="this.style.background='var(--red-50)'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
            <button class="btn btn-danger" id="btnCloseInvoiceAction" style="padding: 7px 14px; height: 34px; font-size: 13px;">Close</button>
          </div>
        </div>
        
        <div id="invoicePrintArea" style="padding: 40px; background: #fff; color: #1e293b;">
          <style>
            @media print {
              body * { visibility: hidden; }
              #invoicePrintArea, #invoicePrintArea * { visibility: visible; }
              #invoicePrintArea { position: absolute; left: 0; top: 0; width: 100%; padding: 0; margin: 0; }
            }
          </style>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
            <div>
              <div style="font-size: 26px; font-weight: 900; color: var(--blue-800); letter-spacing: -1px; display: flex; align-items: center; gap: 8px;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color: var(--accent);">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
                </svg>
                Keep Your Account (KYA)
              </div>
              <div style="font-size: 13px; color: var(--slate-500); margin-top: 6px; font-weight: 500;">
                Your Trusted Cloud Accounting Suite
              </div>
            </div>
            <div style="text-align: right;">
              <h1 style="font-size: 32px; font-weight: 900; text-transform: uppercase; color: var(--slate-800); margin: 0; letter-spacing: -0.5px;">${inv.isReturn ? 'Credit Note / Sales Reversal' : 'Tax Invoice'}</h1>
              <div style="font-size: 14px; font-weight: 700; color: var(--blue-700); margin-top: 4px;"># ${ohEsc(inv.invoiceNo)}</div>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; border-bottom: 2px solid var(--slate-100); padding-bottom: 30px; margin-bottom: 30px;">
            <div>
              <h3 style="font-size: 11px; text-transform: uppercase; color: var(--slate-400); letter-spacing: 0.1em; margin-bottom: 8px; font-weight: 700;">Billed To:</h3>
              <div style="font-size: 16px; font-weight: 800; color: var(--slate-900);">${ohEsc(partyName)}</div>
              ${partyContact ? `<div style="font-size: 12px; color: var(--slate-600); margin-top: 2px; font-weight: 600;">Attn: ${ohEsc(partyContact)}</div>` : ''}
              ${partyAddr ? `<div style="font-size: 12px; color: var(--slate-600); margin-top: 4px; line-height: 1.35;">${ohEsc(partyAddr)}</div>` : ''}
              ${(cityPin || stateCountry) ? `<div style="font-size: 12px; color: var(--slate-600); margin-top: 2px;">${[cityPin, stateCountry].filter(Boolean).map(s => ohEsc(s)).join(', ')}</div>` : ''}
              ${partyGstin ? `<div style="font-size: 12px; color: var(--slate-700); margin-top: 4px;"><span style="color: var(--slate-400); font-size: 11px; font-weight: 600;">GSTIN:</span> <strong style="font-family: monospace; color: #047857;">${ohEsc(partyGstin)}</strong></div>` : ''}
              ${partyPan ? `<div style="font-size: 12px; color: var(--slate-700); margin-top: 2px;"><span style="color: var(--slate-400); font-size: 11px; font-weight: 600;">PAN:</span> <strong style="font-family: monospace;">${ohEsc(partyPan)}</strong></div>` : ''}
              ${partyPhone ? `<div style="font-size: 12px; color: var(--slate-600); margin-top: 2px;">Phone: ${ohEsc(partyPhone)}</div>` : ''}
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 13.5px;">
              <div>
                <div style="color: var(--slate-400); font-weight: 600; font-size: 11px; text-transform: uppercase;">${inv.isReturn ? 'Reversal Date:' : 'Invoice Date:'}</div>
                <div style="font-weight: 700; color: var(--slate-800); margin-top: 2px;">${inv.date}</div>
              </div>
              <div>
                <div style="color: var(--slate-400); font-weight: 600; font-size: 11px; text-transform: uppercase;">Due Date:</div>
                <div style="font-weight: 700; color: var(--slate-800); margin-top: 2px;">${inv.dueDate || inv.date}</div>
              </div>
              <div>
                <div style="color: var(--slate-400); font-weight: 600; font-size: 11px; text-transform: uppercase;">Payment Terms:</div>
                <div style="font-weight: 700; color: var(--slate-800); margin-top: 2px;">Due on Receipt</div>
              </div>
              <div>
                <div style="color: var(--slate-400); font-weight: 600; font-size: 11px; text-transform: uppercase;">Supply Type:</div>
                <div style="font-weight: 700; color: var(--slate-800); margin-top: 2px;">${ohEsc(inv.salesSupplyType || 'Intra-State (CGST + SGST)')}</div>
              </div>
              ${execName ? `
              <div>
                <div style="color: var(--slate-400); font-weight: 600; font-size: 11px; text-transform: uppercase;">Sales Executive:</div>
                <div style="font-weight: 700; color: var(--slate-800); margin-top: 2px;">${ohEsc(execName)}</div>
              </div>
              ` : ''}
            </div>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13.5px;">
            <thead>
              <tr style="border-bottom: 2px solid var(--slate-200); background: var(--slate-50);">
                <th style="padding: 10px; text-align: left; font-weight: 700; color: var(--slate-500); width: 40px;">#</th>
                <th style="padding: 10px; text-align: left; font-weight: 700; color: var(--slate-500);">Description</th>
                <th style="padding: 10px; text-align: right; font-weight: 700; color: var(--slate-500); width: 60px;">Qty</th>
                <th style="padding: 10px; text-align: right; font-weight: 700; color: var(--slate-500); width: 110px;">Rate</th>
                <th style="padding: 10px; text-align: right; font-weight: 700; color: var(--slate-500); width: 90px;">Discount</th>
                <th style="padding: 10px; text-align: right; font-weight: 700; color: var(--slate-500); width: 80px;">Tax</th>
                <th style="padding: 10px; text-align: right; font-weight: 700; color: var(--slate-500); width: 140px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          
          <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 40px; margin-top: 30px;">
            <div>
              <h4 style="font-size: 11px; text-transform: uppercase; color: var(--slate-400); letter-spacing: 0.05em; margin-bottom: 8px; font-weight: 700;">Terms & Notes:</h4>
              <div style="font-size: 12.5px; color: var(--slate-600); line-height: 1.5; white-space: pre-wrap; font-weight: 500;">${ohEsc(inv.notes) || (inv.isReturn ? 'Sales Reversal / Credit Note processed.' : 'Thank you for your business! Please settle this invoice by the due date.')}</div>
              ${inv.uploadedDoc && inv.uploadedDoc.fileData ? `
                <div style="margin-top: 14px; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                  <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" style="flex-shrink: 0;"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    <span style="font-size: 12px; font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${ohEsc(inv.uploadedDoc.fileName)} ${inv.uploadedDoc.fileSize ? `<span style="font-size: 11px; color: #64748b;">(${ohEsc(inv.uploadedDoc.fileSize)})</span>` : ''}</span>
                  </div>
                  <a href="${inv.uploadedDoc.fileData}" download="${ohEsc(inv.uploadedDoc.fileName)}" style="font-size: 11px; font-weight: 700; color: #2563eb; background: #eff6ff; border: 1px solid #bfdbfe; padding: 4px 9px; border-radius: 6px; text-decoration: none; flex-shrink: 0; display: inline-flex; align-items: center; gap: 4px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download Attachment
                  </a>
                </div>
              ` : ''}
            </div>
            
            <div>
              <div style="background: var(--slate-50); border-radius: 16px; padding: 18px 22px;">
                <div style="display: flex; justify-content: space-between; font-size: 13.5px; color: var(--slate-600); margin-bottom: 8px; font-weight: 500;">
                  <span>Sub Total</span>
                  <span>₹ ${fmtNum(inv.subTotal)}</span>
                </div>
                
                ${taxDetailsHtml}
                
                ${inv.tdsTcsMode !== 'None' ? `
                  <div style="display: flex; justify-content: space-between; font-size: 13.5px; color: var(--slate-600); margin-top: 8px; border-top: 1px dashed var(--slate-200); padding-top: 8px; font-weight: 500;">
                    <span>${inv.tdsTcsMode} (${(inv.tdsTcsRate % 1 === 0 ? inv.tdsTcsRate.toFixed(0) : (inv.tdsTcsRate * 10 % 1 === 0 ? inv.tdsTcsRate.toFixed(1) : inv.tdsTcsRate.toFixed(2)))}%)</span>
                    <span>${inv.tdsTcsMode === 'TDS' ? '-' : '+'} ₹ ${fmtNum(inv.tdsTcsAmount)}</span>
                  </div>
                ` : ''}
                
                ${inv.adjustments !== 0 ? `
                  <div style="display: flex; justify-content: space-between; font-size: 13.5px; color: var(--slate-600); margin-top: 8px; border-top: 1px dashed var(--slate-200); padding-top: 8px; font-weight: 500;">
                    <span>Round off</span>
                    <span>₹ ${fmtNum(inv.adjustments)}</span>
                  </div>
                ` : ''}
                
                <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 900; color: var(--slate-900); margin-top: 12px; border-top: 2px solid var(--slate-200); padding-top: 12px;">
                  <span>Grand Total</span>
                  <span>₹ ${fmtNum(inv.total)}</span>
                </div>
                
                ${inv.paymentStatus && inv.paymentStatus !== 'Not Paid' && inv.paymentStatus !== 'No Refund' ? `
                  <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--slate-600); margin-top: 6px; font-weight: 500;">
                    <span>Paid Amount (${inv.paymentStatus})</span>
                    <span style="color: #10b981; font-weight: 700;">₹ ${fmtNum(inv.paymentAmount)}</span>
                  </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; font-size: 13.5px; color: var(--slate-900); margin-top: 8px; border-top: 1px dashed var(--slate-200); padding-top: 8px; font-weight: 700;">
                  <span>Balance Due</span>
                  <span style="color: ${inv.total - (inv.paymentAmount || 0) > 0 ? '#ef4444' : 'var(--slate-600)'};">₹ ${fmtNum(Math.max(0, inv.total - (inv.paymentAmount || 0)))}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div style="margin-top: 60px; border-top: 1px solid var(--slate-100); padding-top: 20px; text-align: center; font-size: 11.5px; color: var(--slate-400); font-weight: 500;">
            This is a system generated document. No signature required.
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    overlay.focus();
    
    // Wire Export Dropdown
    const expBtn = overlay.querySelector('#btnExportInvoiceAction');
    const expDropdown = overlay.querySelector('#invExportDropdown');
    const expPdfBtn = overlay.querySelector('#invExportPdfBtn');
    const expExcelBtn = overlay.querySelector('#invExportExcelBtn');

    if (expBtn && expDropdown) {
      expBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        expDropdown.classList.toggle('active');
      });
    }

    if (expPdfBtn) {
      expPdfBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (expDropdown) expDropdown.classList.remove('active');
        if (typeof window.exportInvoiceToPDF === 'function') {
          await window.exportInvoiceToPDF(inv);
        }
      });
    }

    if (expExcelBtn) {
      expExcelBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (expDropdown) expDropdown.classList.remove('active');
        if (typeof window.exportInvoiceToExcel === 'function') {
          await window.exportInvoiceToExcel(inv);
        }
      });
    }

    overlay.querySelector('#btnCloseInvoiceAction').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { 
      if (expDropdown && !expDropdown.contains(e.target) && expBtn && !expBtn.contains(e.target)) {
        expDropdown.classList.remove('active');
      }
      if (e.target === overlay) overlay.remove(); 
    });
    overlay.addEventListener('keydown', e => { if (e.key === 'Escape') overlay.remove(); });
  }

  window.viewPrintInvoice = viewPrintInvoice;
  window.deleteSalesInvoice = deleteSalesInvoice;
  window.editSalesDraft = editSalesDraft;
  window.deleteSalesDraft = deleteSalesDraft;
  window.loadSalesInvoice = loadSalesInvoice;

  function updateDueDateHelper() {
    const dateEl = document.getElementById('salesDate');
    const dueEl = document.getElementById('salesDueDate');
    const daysEl = document.getElementById('salesDueDateDays');
    if (!dateEl || !dueEl || !daysEl) return;
    
    const dateVal = dateEl.value;
    const dueVal = dueEl.value;
    
    if (!dateVal || !dueVal) {
      daysEl.textContent = '';
      return;
    }
    
    const d1 = new Date(dateVal);
    const d2 = new Date(dueVal);
    
    d1.setHours(0,0,0,0);
    d2.setHours(0,0,0,0);
    
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      daysEl.textContent = `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
      daysEl.style.color = 'var(--blue-600)';
    } else if (diffDays === 0) {
      daysEl.textContent = 'Due today';
      daysEl.style.color = 'var(--slate-500)';
    } else {
      daysEl.textContent = `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''}`;
      daysEl.style.color = 'var(--red-600)';
    }
  }

  function setupSalesVoucherEventListeners() {
    // Searchable dropdown for sales reversals
    const selectTrigger = document.getElementById('salesInvoiceSelectTrigger');
    const selectDropdown = document.getElementById('salesInvoiceSelectDropdown');
    const selectSearch = document.getElementById('salesInvoiceSelectSearch');
    
    if (selectTrigger && selectDropdown && selectSearch) {
      selectTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = selectDropdown.style.display === 'flex';
        if (isOpen) {
          selectDropdown.style.display = 'none';
        } else {
          selectDropdown.style.display = 'flex';
          selectSearch.value = '';
          refreshSalesInvoiceDropdownOptions();
          setTimeout(() => selectSearch.focus(), 50);
        }
      });
      
      selectSearch.addEventListener('input', () => {
        refreshSalesInvoiceDropdownOptions(selectSearch.value);
      });
      
      selectSearch.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      
      document.addEventListener('click', (e) => {
        if (!selectTrigger.contains(e.target) && !selectDropdown.contains(e.target)) {
          selectDropdown.style.display = 'none';
        }
      });
    }

    const invNoEl = document.getElementById('salesInvoiceNo');
    const chipEl = document.getElementById('salesVoucherChipDisplay');
    if (invNoEl && chipEl) {
      invNoEl.addEventListener('input', () => {
        const fallback = currentSalesVoucherSubtype === 'Return' ? 'REV-XXXX' : 'INV-XXXX';
        chipEl.textContent = invNoEl.value.trim() || fallback;
      });
    }
    
    const prodTypeBtn = document.getElementById('salesTypeProduct');
    if (prodTypeBtn) {
      prodTypeBtn.addEventListener('click', () => {
        switchSalesType('Product');
      });
    }
    
    const servTypeBtn = document.getElementById('salesTypeService');
    if (servTypeBtn) {
      servTypeBtn.addEventListener('click', () => {
        switchSalesType('Service');
      });
    }
    
    const autoNoBtn = document.getElementById('salesInvoiceNoAuto');
    if (autoNoBtn) {
      autoNoBtn.addEventListener('click', () => {
        setInvoiceNoMode('Auto');
      });
    }
    
    const manualNoBtn = document.getElementById('salesInvoiceNoManual');
    if (manualNoBtn) {
      manualNoBtn.addEventListener('click', () => {
        setInvoiceNoMode('Manual');
      });
    }
    
    const addRowBtn = document.getElementById('salesAddRow');
    if (addRowBtn) {
      addRowBtn.addEventListener('click', () => {
        addSalesRow();
      });
    }

    const salesItemBodyEl = document.getElementById('salesItemBody');
    if (salesItemBodyEl) {
      salesItemBodyEl.addEventListener('input', (e) => {
        const tr = e.target.closest('tr');
        if (!tr) return;
        const isRate = e.target.classList.contains('sales-row-rate');
        const isAmt = e.target.classList.contains('sales-row-amount-input');
        const isBase = e.target.classList.contains('sales-row-base');
        const isDisc = e.target.classList.contains('sales-row-discount');

        if ((isRate || isAmt || isBase || isDisc) && !/[\+\-\*\/\%]/.test(e.target.value)) {
          if (e.target.value && e.target.value.includes('.')) {
            const parts = e.target.value.split('.');
            if (parts[1] && parts[1].length > 2) {
              e.target.value = parts[0] + '.' + parts[1].slice(0, 2);
            }
          }
        }
        const index = parseInt(tr.dataset.rowIndex);
        const triggeredBy = isAmt ? 'amount' : 'rate';
        if (typeof updateRowFromDOM === 'function') {
          updateRowFromDOM(index, tr, triggeredBy);
        }
      });

      salesItemBodyEl.addEventListener('change', (e) => {
        const tr = e.target.closest('tr');
        if (!tr) return;
        const index = parseInt(tr.dataset.rowIndex);
        if (typeof updateRowFromDOM === 'function') {
          updateRowFromDOM(index, tr, 'rate');
        }
      });

      salesItemBodyEl.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.sales-del-row');
        if (delBtn) {
          const tr = delBtn.closest('tr');
          if (tr) {
            const index = parseInt(tr.dataset.rowIndex);
            if (!isNaN(index)) {
              if (salesRows.length > 1) {
                salesRows.splice(index, 1);
              } else {
                salesRows = [{ item: '', hsn: '', qty: 1, unit: '', rate: 0, discount: 0, discountType: 'val', tax: 18, amount: 0 }];
              }
              renderSalesRows();
              recalculateSalesTotals();
            }
          }
        }
      });
    }
    
    const postSalesBtn = document.getElementById('btnPostSales');
    if (postSalesBtn) {
      postSalesBtn.addEventListener('click', () => {
        postSalesInvoice();
      });
    }

    const saveDraftBtn = document.getElementById('btnSaveSalesDraft');
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener('click', () => {
        saveSalesDraft();
      });
    }

    const discardBtn = document.getElementById('btnDiscardSales');
    if (discardBtn) {
      discardBtn.addEventListener('click', () => {
        showKyaConfirm({
          title: 'Discard Voucher?',
          message: 'Are you sure you want to discard this sales voucher? Any unsaved changes will be lost.',
          confirmLabel: 'Discard',
          okBg: 'var(--red-600)',
          onConfirm: () => {
            window._editingSalesInvoice = null;
            currentSalesVoucherSubtype = 'Invoice';
            initSalesForm();
            showToast('Sales voucher discarded.', 'info');
          }
        });
      });
    }
    
    const dateEl = document.getElementById('salesDate');
    const dueEl = document.getElementById('salesDueDate');
    if (dateEl && dueEl) {
      dateEl.addEventListener('change', () => {
        dueEl.value = dateEl.value;
        updateDueDateHelper();
      });
      dueEl.addEventListener('change', () => {
        updateDueDateHelper();
      });
    }
    
    const custEl = document.getElementById('salesCustomer');
    if (custEl) {
      custEl.addEventListener('focus', () => {
        populateSalesCustomers(custEl.value);
      });
    }
    
    const execEl = document.getElementById('salesExecutive');
    if (execEl) {
      execEl.addEventListener('focus', () => {
        populateSalesExecutives(execEl.value);
      });
    }
    
    const supplyTypeEl = document.getElementById('salesSupplyType');
    if (supplyTypeEl) {
      supplyTypeEl.addEventListener('change', () => {
        handleSupplyTypeChange();
      });
    }
    
    const newCustBtn = document.getElementById('btnSalesNewCustomer');
    if (newCustBtn) {
      newCustBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showCoaModal('sg-tr');
      });
    }

    const payNotPaidBtn = document.getElementById('salesPaymentStatusNotPaid');
    const payFullBtn = document.getElementById('salesPaymentStatusFull');
    const payPartialBtn = document.getElementById('salesPaymentStatusPartial');
    const payBg = document.getElementById('salesPaymentStatusBg');
    const payAccField = document.getElementById('salesPaymentAccountField');
    const payAmtField = document.getElementById('salesPaymentAmountField');
    const payDueDateField = document.getElementById('salesDueDateField');
    
    if (payNotPaidBtn && payFullBtn && payPartialBtn && payBg && payAccField && payAmtField) {
      payNotPaidBtn.addEventListener('click', () => {
        payNotPaidBtn.classList.add('active');
        payFullBtn.classList.remove('active');
        payPartialBtn.classList.remove('active');
        payBg.className = 'sales-paystatus-bg notpaid-active';
        payAccField.style.display = 'none';
        payAmtField.style.display = 'none';
        if (payDueDateField) payDueDateField.style.display = 'flex';
        const wrapper = document.getElementById('salesDueDateWrapper');
        if (wrapper) {
          wrapper.style.flexDirection = 'row';
          wrapper.style.alignItems = 'center';
        }
        updateDueDateHelper();
        recalculateSalesTotals();
      });
      
      payFullBtn.addEventListener('click', () => {
        payFullBtn.classList.add('active');
        payNotPaidBtn.classList.remove('active');
        payPartialBtn.classList.remove('active');
        payBg.className = 'sales-paystatus-bg fullpaid-active';
        payAccField.style.display = 'flex';
        payAmtField.style.display = 'none';
        if (payDueDateField) payDueDateField.style.display = 'none';
        populateSalesPaymentAccounts();
        recalculateSalesTotals();
      });
      
      payPartialBtn.addEventListener('click', () => {
        payPartialBtn.classList.add('active');
        payNotPaidBtn.classList.remove('active');
        payFullBtn.classList.remove('active');
        payBg.className = 'sales-paystatus-bg partpaid-active';
        payAccField.style.display = 'flex';
        payAmtField.style.display = 'flex';
        if (payDueDateField) payDueDateField.style.display = 'flex';
        const wrapper = document.getElementById('salesDueDateWrapper');
        if (wrapper) {
          wrapper.style.flexDirection = 'column';
          wrapper.style.alignItems = 'flex-start';
          wrapper.style.gap = '4px';
        }
        updateDueDateHelper();
        populateSalesPaymentAccounts();
        recalculateSalesTotals();
      });
    }
    
    const payAccEl = document.getElementById('salesPaymentAccount');
    if (payAccEl) {
      payAccEl.addEventListener('focus', () => {
        populateSalesPaymentAccounts(payAccEl.value);
      });
    }
    
    const payAmtEl = document.getElementById('salesPaymentAmount');
    if (payAmtEl) {
      payAmtEl.addEventListener('input', () => {
        const subTotal = calculateSubtotal();
        let tdsTcsMode = 'None';
        const tdsBtn = document.getElementById('salesTdsTcsTds');
        const tcsBtn = document.getElementById('salesTdsTcsTcs');
        if (tdsBtn && tdsBtn.classList.contains('active')) tdsTcsMode = 'TDS';
        if (tcsBtn && tcsBtn.classList.contains('active')) tdsTcsMode = 'TCS';
        
        const rateSelect = document.getElementById('salesTdsTcsRateSelect');
        let rate = 0;
        if (tdsTcsMode !== 'None' && rateSelect) {
          if (rateSelect.value === 'custom') {
            const customInput = document.getElementById('salesTdsTcsRateCustom');
            rate = customInput ? (parseFloat(customInput.value) || 0) : 0;
          } else {
            rate = parseFloat(rateSelect.value) || 0;
          }
        }
        
        const amountInput = document.getElementById('salesTdsTcsAmount');
        const tdsTcsAmount = amountInput ? (parseFloat(amountInput.value) || 0) : 0;
        const adjustmentsInput = document.getElementById('salesAdjustments');
        const adjustments = adjustmentsInput ? (parseFloat(adjustmentsInput.value) || 0) : 0;
        
        let total = subTotal;
        if (tdsTcsMode === 'TDS') total = subTotal - tdsTcsAmount;
        else if (tdsTcsMode === 'TCS') total = subTotal + tdsTcsAmount;
        total += adjustments;
        
        const maxVal = getSalesPaymentMax(total);
        
        if (total > 0 && parseFloat(payAmtEl.value) > maxVal) {
          payAmtEl.value = maxVal.toFixed(2);
          showToast(`Payment Amount adjusted to ₹${fmtNum(maxVal)} to not exceed the Grand Total.`, 'warning');
        }
      });
    }

    // TDS / TCS Toggle Buttons & Row
    const tdsTcsNoneBtn = document.getElementById('salesTdsTcsNone');
    const tdsTcsTdsBtn = document.getElementById('salesTdsTcsTds');
    const tdsTcsTcsBtn = document.getElementById('salesTdsTcsTcs');
    const tdsTcsBg = document.getElementById('salesTdsTcsBg');
    const tdsTcsAmountRow = document.getElementById('salesTdsTcsAmountRow');
    const tdsTcsAmountLabel = document.getElementById('salesTdsTcsAmountLabel');
    const tdsTcsRateSelect = document.getElementById('salesTdsTcsRateSelect');
    const tdsTcsRateCustom = document.getElementById('salesTdsTcsRateCustom');
    const tdsTcsRateCustomWrap = document.getElementById('salesTdsTcsRateCustomWrap');
    const tdsTcsAmountInput = document.getElementById('salesTdsTcsAmount');
    const salesAdjustmentsInput = document.getElementById('salesAdjustments');
    const btnAutoRoundOff = document.getElementById('btnSalesAutoRoundOff');

    if (tdsTcsNoneBtn) {
      tdsTcsNoneBtn.addEventListener('click', () => {
        tdsTcsNoneBtn.classList.add('active');
        if (tdsTcsTdsBtn) tdsTcsTdsBtn.classList.remove('active');
        if (tdsTcsTcsBtn) tdsTcsTcsBtn.classList.remove('active');
        if (tdsTcsBg) tdsTcsBg.className = 'sales-tdstcs-bg none-active';
        if (tdsTcsAmountRow) tdsTcsAmountRow.style.display = 'none';
        if (tdsTcsAmountInput) tdsTcsAmountInput.value = '';
        recalculateSalesTotals();
      });
    }

    if (tdsTcsTdsBtn) {
      tdsTcsTdsBtn.addEventListener('click', () => {
        tdsTcsTdsBtn.classList.add('active');
        if (tdsTcsNoneBtn) tdsTcsNoneBtn.classList.remove('active');
        if (tdsTcsTcsBtn) tdsTcsTcsBtn.classList.remove('active');
        if (tdsTcsBg) tdsTcsBg.className = 'sales-tdstcs-bg tds-active';
        if (tdsTcsAmountRow) tdsTcsAmountRow.style.display = 'block';
        if (tdsTcsAmountLabel) tdsTcsAmountLabel.textContent = 'TDS';
        recalculateSalesTotals();
      });
    }

    if (tdsTcsTcsBtn) {
      tdsTcsTcsBtn.addEventListener('click', () => {
        tdsTcsTcsBtn.classList.add('active');
        if (tdsTcsNoneBtn) tdsTcsNoneBtn.classList.remove('active');
        if (tdsTcsTdsBtn) tdsTcsTdsBtn.classList.remove('active');
        if (tdsTcsBg) tdsTcsBg.className = 'sales-tdstcs-bg tcs-active';
        if (tdsTcsAmountRow) tdsTcsAmountRow.style.display = 'block';
        if (tdsTcsAmountLabel) tdsTcsAmountLabel.textContent = 'TCS';
        recalculateSalesTotals();
      });
    }

    if (tdsTcsRateSelect) {
      tdsTcsRateSelect.addEventListener('change', () => {
        if (tdsTcsRateSelect.value === 'custom') {
          if (tdsTcsRateCustomWrap) tdsTcsRateCustomWrap.style.display = 'flex';
          if (tdsTcsRateCustom) tdsTcsRateCustom.focus();
        } else {
          if (tdsTcsRateCustomWrap) tdsTcsRateCustomWrap.style.display = 'none';
        }
        recalculateSalesTotals();
      });
    }

    if (tdsTcsRateCustom) {
      tdsTcsRateCustom.addEventListener('input', () => {
        recalculateSalesTotals();
      });
    }

    if (tdsTcsAmountInput) {
      tdsTcsAmountInput.addEventListener('input', () => {
        recalculateSalesTotals();
      });
    }

    if (salesAdjustmentsInput) {
      salesAdjustmentsInput.addEventListener('input', () => {
        recalculateSalesTotals();
      });
    }

    if (btnAutoRoundOff) {
      btnAutoRoundOff.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof autoCalculateSalesRoundOff === 'function') {
          autoCalculateSalesRoundOff();
        }
      });
    }

    const returnBtn = document.getElementById('btnSalesReturn');
    const newSalesBtn = document.getElementById('btnNewSales');
    const preInvoiceBtn = document.getElementById('btnSalesPreInvoice');
    
    if (returnBtn) {
      returnBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentSalesVoucherSubtype = 'Return';
        window._editingSalesInvoice = null;
        initSalesForm();
      });
    }

    if (newSalesBtn) {
      newSalesBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentSalesVoucherSubtype = 'Invoice';
        window._editingSalesInvoice = null;
        initSalesForm();
      });
    }

    if (preInvoiceBtn) {
      preInvoiceBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentSalesVoucherSubtype = 'PreInvoice';
        window._editingSalesInvoice = null;
        updateVoucherSubtypeUI();
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════
  //  PRE INVOICE — KeepOne-Style Upcoming Modules
  // ══════════════════════════════════════════════════════════════════
  const SALES_PRE_INV_UPCOMING = {
    preinvoice: {
      label: 'Pre Invoice',
      icon: `<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>`,
      desc: 'Centralized pre-billing pipeline to prepare, verify, and convert preliminary sales documents prior to final invoice posting.',
      features: ['Draft Billing', 'Pre-Tax Validations', 'Document Conversion', 'Multi-Stage Approvals'],
    },
    quotation: {
      label: 'Quotation',
      icon: `<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        <line x1="8" y1="9" x2="16" y2="9"></line>
        <line x1="8" y1="13" x2="14" y2="13"></line>
      </svg>`,
      desc: 'Create official price estimates and formal sales quotes for clients with itemized rates, discounts, and terms.',
      features: ['Price Quotations', 'Client Estimations', 'Convert to Sales Order', 'Discount Tiers'],
    },
    proforma: {
      label: 'Proforma Invoice',
      icon: `<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"></path>
        <line x1="8" y1="8" x2="16" y2="8"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
        <line x1="8" y1="16" x2="12" y2="16"></line>
      </svg>`,
      desc: 'Issue provisional bills of sale in advance of goods shipment or service delivery to request advance payments.',
      features: ['Advance Invoicing', 'Customs Clearance Proforma', 'Payment Milestones', '1-Click Invoice Generation'],
    },
    salesorder: {
      label: 'Sales Order',
      icon: `<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
        <line x1="8" y1="21" x2="16" y2="21"></line>
        <line x1="12" y1="17" x2="12" y2="21"></line>
        <path d="M7 8h10M7 12h6"></path>
      </svg>`,
      desc: 'Record confirmed customer purchase orders, track order fulfillment, inventory commitments, and delivery schedules.',
      features: ['Order Confirmation', 'Inventory Reservation', 'Fulfillment Tracking', 'Backorder Management'],
    },
    deliverychallan: {
      label: 'Delivery Challan',
      icon: `<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="3" width="15" height="13"></rect>
        <polygon points="16 8 20 8 23 11 23 16 16 16 8"></polygon>
        <circle cx="5.5" cy="18.5" r="2.5"></circle>
        <circle cx="18.5" cy="18.5" r="2.5"></circle>
      </svg>`,
      desc: 'Generate dispatch documents for transportation of goods for job work, supply on approval, or multi-location transfers.',
      features: ['Goods Dispatch', 'Vehicle & E-Way Link', 'Approval Supply', 'Goods Return Tracking'],
    },
  };

  let _salesPreInvActiveTab = 'preinvoice';

  function renderSalesPreInvoicePanel() {
    switchSalesPreInvTab(_salesPreInvActiveTab || 'preinvoice');

    const tabMap = {
      preInvTabOverview: 'preinvoice',
      preInvTabQuotation: 'quotation',
      preInvTabProforma: 'proforma',
      preInvTabSalesOrder: 'salesorder',
      preInvTabDeliveryChallan: 'deliverychallan',
    };

    Object.entries(tabMap).forEach(([btnId, tabKey]) => {
      const btn = document.getElementById(btnId);
      if (btn && !btn._preInvWired) {
        btn._preInvWired = true;
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          switchSalesPreInvTab(tabKey);
        });
      }
    });
  }

  function switchSalesPreInvTab(tabKey, filterStatus = 'all') {
    if (tabKey === 'quotation' && typeof openQuotationForm === 'function') {
      openQuotationForm(null, 'preinvoice');
      return;
    }
    if (tabKey === 'proforma' && typeof openProformaForm === 'function') {
      openProformaForm();
      return;
    }
    if (tabKey === 'salesorder' && typeof openSalesOrderForm === 'function') {
      openSalesOrderForm();
      return;
    }
    if (tabKey === 'deliverychallan' && typeof openDeliveryChallanForm === 'function') {
      openDeliveryChallanForm();
      return;
    }

    _salesPreInvActiveTab = tabKey;

    const preInvCard = document.getElementById('salesPreInvoiceCard');
    const quoteFormCard = document.getElementById('salesQuotationFormCard');
    if (quoteFormCard) quoteFormCard.style.display = 'none';
    if (preInvCard) preInvCard.style.display = 'block';

    const tabButtons = {
      preinvoice: document.getElementById('preInvTabOverview'),
      quotation: document.getElementById('preInvTabQuotation'),
      proforma: document.getElementById('preInvTabProforma'),
      salesorder: document.getElementById('preInvTabSalesOrder'),
      deliverychallan: document.getElementById('preInvTabDeliveryChallan'),
    };

    Object.entries(tabButtons).forEach(([k, btn]) => {
      if (!btn) return;
      const isActive = k === tabKey;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    const contentArea = document.getElementById('preInvContentArea');
    if (!contentArea) return;

    if (tabKey === 'preinvoice') {
      contentArea.innerHTML = renderPreInvoiceOverviewTable();
      return;
    }

    if (tabKey === 'quotation') {
      if (typeof window.openQuotationList === 'function') {
        window.openQuotationList(filterStatus);
      } else if (typeof openQuotationForm === 'function') {
        openQuotationForm();
      }
      return;
    }

    const cfg = SALES_PRE_INV_UPCOMING[tabKey] || SALES_PRE_INV_UPCOMING['preinvoice'];
    if (!cfg) return;

    const featureTags = cfg.features
      .map(f => `<span class="oh-upcoming-feat-tag">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="#10b981" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        ${f}
      </span>`)
      .join('');

    contentArea.innerHTML = `
      <div class="oh-upcoming-wrap">
        <div class="oh-upcoming-icon-ring" style="color:#b45309;">
          ${cfg.icon}
        </div>
        <div class="oh-upcoming-title">${cfg.label}</div>
        <div class="oh-upcoming-subtitle">${cfg.desc}</div>
        <div class="oh-upcoming-pill">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 5v3.5l2.5 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          Upcoming Feature
        </div>
        <div class="oh-upcoming-features">${featureTags}</div>
      </div>
    `;
  }

  function renderPreInvoiceOverviewTable() {
    window.KYA_STORE = window.KYA_STORE || {};
    const quotes = (window.KYA_STORE.quotations || []).concat(window.KYA_STORE.quotationsDrafts || []);
    const quoteActive = quotes.filter(q => q.status === 'Active' || !q.status || q.status === 'Draft').length;
    const quoteCompleted = quotes.filter(q => q.status === 'Completed').length;
    const quoteCancelled = quotes.filter(q => q.status === 'Cancelled').length;

    const proformas = window.KYA_STORE.proformaInvoices || [];
    const proformaActive = proformas.filter(p => p.status === 'Active' || !p.status || p.status === 'Draft').length;
    const proformaCompleted = proformas.filter(p => p.status === 'Completed').length;
    const proformaCancelled = proformas.filter(p => p.status === 'Cancelled').length;

    const orders = window.KYA_STORE.salesOrders || [];
    const orderActive = orders.filter(o => o.status === 'Active' || !o.status || o.status === 'Draft').length;
    const orderCompleted = orders.filter(o => o.status === 'Completed').length;
    const orderCancelled = orders.filter(o => o.status === 'Cancelled').length;

    const challans = window.KYA_STORE.deliveryChallans || [];
    const challanActive = challans.filter(c => c.status === 'Active' || !c.status || c.status === 'Draft').length;
    const challanCompleted = challans.filter(c => c.status === 'Completed').length;
    const challanCancelled = challans.filter(c => c.status === 'Cancelled').length;

    return `
      <div class="table-card" style="border: 1.5px solid var(--slate-200); border-radius: 12px; overflow: hidden; background: #fff; box-shadow: var(--shadow-sm); width: 100%; box-sizing: border-box;">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background: var(--slate-50); border-bottom: 1.5px solid var(--slate-200);">
              <th style="padding: 14px 24px; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--slate-600);">Pre Invoice</th>
              <th style="padding: 14px 20px; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--emerald-700); text-align: center; width: 140px;">Active</th>
              <th style="padding: 14px 20px; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--blue-700); text-align: center; width: 140px;">Completed</th>
              <th style="padding: 14px 20px; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--slate-500); text-align: center; width: 140px;">Cancelled</th>
            </tr>
          </thead>
          <tbody>
            <!-- 1. Quotation -->
            <tr style="border-bottom: 1px solid var(--slate-100); transition: background 0.15s; cursor: pointer;" onmouseover="this.style.background='var(--blue-50)'" onmouseout="this.style.background='transparent'" onclick="openQuotationList('all')">
              <td style="padding: 16px 24px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="width: 36px; height: 36px; border-radius: 8px; background: #eff6ff; color: var(--blue-600); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <path d="M4 4h12v12H4z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                      <path d="M7 8h6M7 12h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <div style="font-weight: 700; font-size: 14px; color: var(--slate-800);">Quotation</div>
                    <div style="font-size: 12px; color: var(--slate-500);">Price proposals, estimates and customer quotes</div>
                  </div>
                </div>
              </td>
              <td style="padding: 16px 20px; text-align: center;">
                <span class="badge badge-green" style="font-size: 13px; font-weight: 700; min-width: 32px; justify-content: center; padding: 4px 10px; cursor: pointer;" onclick="event.stopPropagation(); openQuotationList('active')">${quoteActive}</span>
              </td>
              <td style="padding: 16px 20px; text-align: center;">
                <span class="badge badge-blue" style="font-size: 13px; font-weight: 700; min-width: 32px; justify-content: center; padding: 4px 10px; cursor: pointer;" onclick="event.stopPropagation(); openQuotationList('completed')">${quoteCompleted}</span>
              </td>
              <td style="padding: 16px 20px; text-align: center;">
                <span style="font-size: 13px; font-weight: 700; color: var(--slate-500); padding: 4px 10px; cursor: pointer; border-radius: 6px; display: inline-block;" onmouseover="this.style.background='var(--slate-100)'" onmouseout="this.style.background='transparent'" onclick="event.stopPropagation(); openQuotationList('cancelled')">${quoteCancelled}</span>
              </td>
            </tr>

            <!-- 2. Proforma Invoice -->
            <tr style="border-bottom: 1px solid var(--slate-100); transition: background 0.15s; cursor: pointer;" onmouseover="this.style.background='var(--blue-50)'" onmouseout="this.style.background='transparent'" onclick="openProformaForm()">
              <td style="padding: 16px 24px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="width: 36px; height: 36px; border-radius: 8px; background: #faf5ff; color: #9333ea; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <path d="M5 2h10a1 1 0 011 1v14l-3-2-3 2-3-2-3 2V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M8 7h4M8 11h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <div style="font-weight: 700; font-size: 14px; color: var(--slate-800);">Proforma Invoice</div>
                    <div style="font-size: 12px; color: var(--slate-500);">Preliminary commercial invoices and advance billing</div>
                  </div>
                </div>
              </td>
              <td style="padding: 16px 20px; text-align: center;">
                <span class="badge badge-green" style="font-size: 13px; font-weight: 700; min-width: 32px; justify-content: center; padding: 4px 10px;">${proformaActive}</span>
              </td>
              <td style="padding: 16px 20px; text-align: center;">
                <span class="badge badge-blue" style="font-size: 13px; font-weight: 700; min-width: 32px; justify-content: center; padding: 4px 10px;">${proformaCompleted}</span>
              </td>
              <td style="padding: 16px 20px; text-align: center;">
                <span style="font-size: 13px; font-weight: 700; color: var(--slate-400);">${proformaCancelled}</span>
              </td>
            </tr>

            <!-- 3. Sales Order -->
            <tr style="border-bottom: 1px solid var(--slate-100); transition: background 0.15s; cursor: pointer;" onmouseover="this.style.background='var(--blue-50)'" onmouseout="this.style.background='transparent'" onclick="openSalesOrderForm()">
              <td style="padding: 16px 24px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="width: 36px; height: 36px; border-radius: 8px; background: #fff7ed; color: #ea580c; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.8"/>
                      <path d="M7 7h6M7 10h6M7 13h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                      <circle cx="14" cy="13" r="1" fill="currentColor"/>
                    </svg>
                  </div>
                  <div>
                    <div style="font-weight: 700; font-size: 14px; color: var(--slate-800);">Sales Order</div>
                    <div style="font-size: 12px; color: var(--slate-500);">Confirmed customer purchase orders for fulfillment</div>
                  </div>
                </div>
              </td>
              <td style="padding: 16px 20px; text-align: center;">
                <span class="badge badge-green" style="font-size: 13px; font-weight: 700; min-width: 32px; justify-content: center; padding: 4px 10px;">${orderActive}</span>
              </td>
              <td style="padding: 16px 20px; text-align: center;">
                <span class="badge badge-blue" style="font-size: 13px; font-weight: 700; min-width: 32px; justify-content: center; padding: 4px 10px;">${orderCompleted}</span>
              </td>
              <td style="padding: 16px 20px; text-align: center;">
                <span style="font-size: 13px; font-weight: 700; color: var(--slate-400);">${orderCancelled}</span>
              </td>
            </tr>

            <!-- 4. Delivery Challan -->
            <tr style="transition: background 0.15s; cursor: pointer;" onmouseover="this.style.background='var(--blue-50)'" onmouseout="this.style.background='transparent'" onclick="openDeliveryChallanForm()">
              <td style="padding: 16px 24px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="width: 36px; height: 36px; border-radius: 8px; background: #ecfdf5; color: #059669; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <path d="M1 4h11v9H1z" stroke="currentColor" stroke-width="1.6"/>
                      <path d="M12 7h4l3 3v3h-7V7z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
                      <circle cx="4.5" cy="15.5" r="1.5" stroke="currentColor" stroke-width="1.6"/>
                      <circle cx="15.5" cy="15.5" r="1.5" stroke="currentColor" stroke-width="1.6"/>
                    </svg>
                  </div>
                  <div>
                    <div style="font-weight: 700; font-size: 14px; color: var(--slate-800);">Delivery Challan</div>
                    <div style="font-size: 12px; color: var(--slate-500);">Dispatch challans and goods transit documentation</div>
                  </div>
                </div>
              </td>
              <td style="padding: 16px 20px; text-align: center;">
                <span class="badge badge-green" style="font-size: 13px; font-weight: 700; min-width: 32px; justify-content: center; padding: 4px 10px;">${challanActive}</span>
              </td>
              <td style="padding: 16px 20px; text-align: center;">
                <span class="badge badge-blue" style="font-size: 13px; font-weight: 700; min-width: 32px; justify-content: center; padding: 4px 10px;">${challanCompleted}</span>
              </td>
              <td style="padding: 16px 20px; text-align: center;">
                <span style="font-size: 13px; font-weight: 700; color: var(--slate-400);">${challanCancelled}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  function setupVoucherDeskEventListeners() {
    document.getElementById('vdNewJEBtn')?.addEventListener('click', () => {
      openTab('journal');
    });
    document.getElementById('vdNewInvBtn')?.addEventListener('click', () => {
      currentSalesVoucherSubtype = 'Invoice';
      window._editingSalesInvoice = null;
      initSalesForm();
      openTab('sales_voucher');
    });

    // Status tab switcher
    document.querySelectorAll('.vd-status-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _vdStatusFilter = btn.dataset.status;
        renderVoucherDeskPanel();
      });
    });
  }

  // ── Global Window Exports ──
  window.setupSalesVoucherEventListeners = setupSalesVoucherEventListeners;
  window.setupVoucherDeskEventListeners = setupVoucherDeskEventListeners;
  window.renderSalesPreInvoicePanel = renderSalesPreInvoicePanel;
  window.switchSalesPreInvTab = switchSalesPreInvTab;
  if (typeof viewPrintInvoice === 'function') window.viewPrintInvoice = viewPrintInvoice;
  if (typeof editSalesDraft === 'function') window.editSalesDraft = editSalesDraft;
  if (typeof printSalesVoucher === 'function') window.printSalesVoucher = printSalesVoucher;
