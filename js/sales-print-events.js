// ══════════════════════════════════════════════════════════════════
  //  SALES PRINT & EVENTS — Print invoice, due-date helper, event wiring
  //  (Split from sales.js for maintainability)
  // ══════════════════════════════════════════════════════════════════

  function viewPrintInvoice(id) {
    const list = window.KYA_STORE.salesVouchers || [];
    const inv = list.find(v => v.id === id);
    if (!inv) return;
    
    let orderAdvanceAmount = 0;
    if (inv.orderNo && !inv.isOrder && !inv.isReturn) {
      const linkedOrder = (window.KYA_STORE.salesVouchers || []).find(v => v.isOrder && v.invoiceNo.toLowerCase() === inv.orderNo.toLowerCase());
      if (linkedOrder) {
        if (linkedOrder.paymentStatus === 'Full Payment') {
          orderAdvanceAmount = linkedOrder.total;
        } else if (linkedOrder.paymentStatus === 'Partial Payment') {
          orderAdvanceAmount = linkedOrder.paymentAmount || 0;
        }
      }
    }
    
    const customer = coaLedgers.find(l => l.id == inv.customerId) || { name: 'Unknown Customer' };
    
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
          <div style="font-weight: 700; color: var(--slate-800);">${inv.isReturn ? 'Sales Reversal Preview' : (inv.isOrder ? 'Sales Pre Invoice Preview' : 'Invoice Preview')}</div>
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
              <h1 style="font-size: 32px; font-weight: 900; text-transform: uppercase; color: var(--slate-800); margin: 0; letter-spacing: -0.5px;">${inv.isReturn ? 'Credit Note / Sales Reversal' : (inv.isOrder ? 'Sales Pre Invoice' : 'Tax Invoice')}</h1>
              <div style="font-size: 14px; font-weight: 700; color: var(--blue-700); margin-top: 4px;"># ${ohEsc(inv.invoiceNo)}</div>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; border-bottom: 2px solid var(--slate-100); padding-bottom: 30px; margin-bottom: 30px;">
            <div>
              <h3 style="font-size: 11px; text-transform: uppercase; color: var(--slate-400); letter-spacing: 0.1em; margin-bottom: 12px; font-weight: 700;">Billed To:</h3>
              <div style="font-size: 16px; font-weight: 800; color: var(--slate-900);">${ohEsc(customer.name)}</div>
              <div style="font-size: 13px; color: var(--slate-500); margin-top: 4px; font-weight: 500;">Trade Receivables Account</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 13.5px;">
              <div>
                <div style="color: var(--slate-400); font-weight: 600; font-size: 11px; text-transform: uppercase;">${inv.isReturn ? 'Reversal Date:' : (inv.isOrder ? 'Order Date:' : 'Invoice Date:')}</div>
                <div style="font-weight: 700; color: var(--slate-800); margin-top: 2px;">${inv.date}</div>
              </div>
              <div>
                <div style="color: var(--slate-400); font-weight: 600; font-size: 11px; text-transform: uppercase;">Due Date:</div>
                <div style="font-weight: 700; color: var(--slate-800); margin-top: 2px;">${inv.dueDate || inv.date}</div>
              </div>
              ${!inv.isOrder ? `
              <div>
                <div style="color: var(--slate-400); font-weight: 600; font-size: 11px; text-transform: uppercase;">Order Number:</div>
                <div style="font-weight: 700; color: var(--slate-800); margin-top: 2px;">${ohEsc(inv.orderNo) || '&mdash;'}</div>
              </div>
              ` : ''}
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
              <div style="font-size: 12.5px; color: var(--slate-600); line-height: 1.5; white-space: pre-wrap; font-weight: 500;">${ohEsc(inv.notes) || (inv.isReturn ? 'Sales Reversal / Credit Note processed.' : (inv.isOrder ? 'Sales Pre Invoice saved.' : 'Thank you for your business! Please settle this invoice by the due date.'))}</div>
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
                
                ${inv.excessAmount > 0 ? `
                  <div style="display: flex; justify-content: space-between; font-size: 13.5px; color: var(--slate-600); margin-top: 8px; border-top: 1px dashed var(--slate-200); padding-top: 8px; font-weight: 500;">
                    <span>Order Advance Applied</span>
                    <span style="color: var(--emerald-700); font-weight: 700;">₹ ${fmtNum(orderAdvanceAmount)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--slate-600); margin-top: 6px; font-weight: 500;">
                    <span>Refund Status</span>
                    <span style="font-weight: 700; color: var(--slate-700);">${inv.paymentStatus}</span>
                  </div>
                  ${inv.refundedAmount > 0 ? `
                    <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--slate-600); margin-top: 6px; font-weight: 500;">
                      <span>Amount Refunded</span>
                      <span style="color: #10b981; font-weight: 700;">₹ ${fmtNum(inv.refundedAmount)}</span>
                    </div>
                  ` : ''}
                  <div style="display: flex; justify-content: space-between; font-size: 13.5px; color: var(--slate-900); margin-top: 6px; font-weight: 700;">
                    <span>Refund Payable</span>
                    <span style="color: ${inv.excessAmount - (inv.refundedAmount || 0) > 0 ? '#ef4444' : 'var(--slate-600)'};">₹ ${fmtNum(inv.excessAmount - (inv.refundedAmount || 0))}</span>
                  </div>
                ` : `
                  ${orderAdvanceAmount > 0 ? `
                    <div style="display: flex; justify-content: space-between; font-size: 13.5px; color: var(--slate-600); margin-top: 8px; border-top: 1px dashed var(--slate-200); padding-top: 8px; font-weight: 500;">
                      <span>Advance Paid</span>
                      <span style="color: var(--emerald-700); font-weight: 700;">₹ ${fmtNum(orderAdvanceAmount)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 13.5px; color: var(--slate-900); margin-top: 6px; font-weight: 700;">
                      <span>Balance Due</span>
                      <span style="color: var(--blue-700);">₹ ${fmtNum(Math.max(0, inv.total - orderAdvanceAmount))}</span>
                    </div>
                  ` : ''}
                  ${inv.paymentStatus && inv.paymentStatus !== 'Not Paid' && inv.paymentStatus !== 'No Refund' ? `
                    <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--slate-600); margin-top: 6px; font-weight: 500;">
                      <span>Paid Amount (${inv.paymentStatus})</span>
                      <span style="color: #10b981; font-weight: 700;">₹ ${fmtNum(inv.paymentAmount)}</span>
                    </div>
                  ` : ''}
                  <div style="display: flex; justify-content: space-between; font-size: 13.5px; color: var(--slate-900); margin-top: 8px; border-top: 1px dashed var(--slate-200); padding-top: 8px; font-weight: 700;">
                    <span>Balance Due</span>
                    <span style="color: ${inv.total - orderAdvanceAmount - (inv.paymentAmount || 0) > 0 ? '#ef4444' : 'var(--slate-600)'};">₹ ${fmtNum(Math.max(0, inv.total - orderAdvanceAmount - (inv.paymentAmount || 0)))}</span>
                  </div>
                `}
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
          // Close other select dropdowns if open
          const orderDropdown = document.getElementById('salesOrderSelectDropdown');
          if (orderDropdown) orderDropdown.style.display = 'none';

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

    // Searchable dropdown for sales orders
    const orderSelectTrigger = document.getElementById('salesOrderSelectTrigger');
    const orderSelectDropdown = document.getElementById('salesOrderSelectDropdown');
    const orderSelectSearch = document.getElementById('salesOrderSelectSearch');
    
    if (orderSelectTrigger && orderSelectDropdown && orderSelectSearch) {
      orderSelectTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = orderSelectDropdown.style.display === 'flex';
        if (isOpen) {
          orderSelectDropdown.style.display = 'none';
        } else {
          // Close other select dropdowns if open
          const invoiceDropdown = document.getElementById('salesInvoiceSelectDropdown');
          if (invoiceDropdown) invoiceDropdown.style.display = 'none';

          orderSelectDropdown.style.display = 'flex';
          orderSelectSearch.value = '';
          refreshSalesOrderDropdownOptions();
          setTimeout(() => orderSelectSearch.focus(), 50);
        }
      });
      
      orderSelectSearch.addEventListener('input', () => {
        refreshSalesOrderDropdownOptions(orderSelectSearch.value);
      });
      
      orderSelectSearch.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      
      document.addEventListener('click', (e) => {
        if (!orderSelectTrigger.contains(e.target) && !orderSelectDropdown.contains(e.target)) {
          orderSelectDropdown.style.display = 'none';
        }
      });
    }

    const invNoEl = document.getElementById('salesInvoiceNo');
    const chipEl = document.getElementById('salesVoucherChipDisplay');
    if (invNoEl && chipEl) {
      invNoEl.addEventListener('input', () => {
        let fallback = 'INV-XXXX';
        if (currentSalesVoucherSubtype === 'Return') fallback = 'REV-XXXX';
        else if (currentSalesVoucherSubtype === 'Order') fallback = 'SO-XXXX';
        chipEl.textContent = invNoEl.value.trim() || fallback;
      });
    }
    
    const prodTypeBtn = document.getElementById('salesTypeProduct');
    if (prodTypeBtn) {
      prodTypeBtn.addEventListener('click', () => {
        const bg = document.getElementById('salesTypeBg');
        if (bg) {
          bg.classList.add('prod-active');
          bg.classList.remove('serv-active');
        }
        prodTypeBtn.classList.add('active');
        const servTypeBtn = document.getElementById('salesTypeService');
        if (servTypeBtn) servTypeBtn.classList.remove('active');
        switchSalesType('Product');
      });
    }
    
    const servTypeBtn = document.getElementById('salesTypeService');
    if (servTypeBtn) {
      servTypeBtn.addEventListener('click', () => {
        const bg = document.getElementById('salesTypeBg');
        if (bg) {
          bg.classList.add('serv-active');
          bg.classList.remove('prod-active');
        }
        servTypeBtn.classList.add('active');
        const prodTypeBtn = document.getElementById('salesTypeProduct');
        if (prodTypeBtn) prodTypeBtn.classList.remove('active');
        switchSalesType('Service');
      });
    }
    
    const noneBtn = document.getElementById('salesTdsTcsNone');
    const tdsBtn = document.getElementById('salesTdsTcsTds');
    const tcsBtn = document.getElementById('salesTdsTcsTcs');
    const tBg = document.getElementById('salesTdsTcsBg');
    const amtRow = document.getElementById('salesTdsTcsAmountRow');
    const amtLabel = document.getElementById('salesTdsTcsAmountLabel');
    
    if (noneBtn && tdsBtn && tcsBtn && tBg && amtRow && amtLabel) {
      noneBtn.addEventListener('click', () => {
        noneBtn.classList.add('active');
        tdsBtn.classList.remove('active');
        tcsBtn.classList.remove('active');
        tBg.className = 'sales-tdstcs-bg none-active';
        amtRow.style.display = 'none';
        recalculateSalesTotals();
      });
      
      tdsBtn.addEventListener('click', () => {
        tdsBtn.classList.add('active');
        noneBtn.classList.remove('active');
        tcsBtn.classList.remove('active');
        tBg.className = 'sales-tdstcs-bg tds-active';
        amtRow.style.display = 'block';
        amtLabel.textContent = 'TDS';
        recalculateSalesTotals();
      });
      
      tcsBtn.addEventListener('click', () => {
        tcsBtn.classList.add('active');
        noneBtn.classList.remove('active');
        tdsBtn.classList.remove('active');
        tBg.className = 'sales-tdstcs-bg tcs-active';
        amtRow.style.display = 'block';
        amtLabel.textContent = 'TCS';
        recalculateSalesTotals();
      });
    }
    
    const addRowBtn = document.getElementById('salesAddRow');
    if (addRowBtn) {
      addRowBtn.addEventListener('click', (e) => {
        e.preventDefault();
        addSalesRow();
      });
    }
    
    const clearBtn = document.getElementById('btnClearSales');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window._editingSalesInvoice = null;
        initSalesForm();
      });
    }
    
    const newSalesBtn = document.getElementById('btnNewSales');
    if (newSalesBtn) {
      newSalesBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentSalesVoucherSubtype = 'Invoice';
        window._editingSalesInvoice = null;
        initSalesForm();
      });
    }
    
    const saveDraftBtn = document.getElementById('btnSaveSalesDraft');
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener('click', (e) => {
        e.preventDefault();
        saveSalesDraft();
      });
    }
    
    const postInvoiceBtn = document.getElementById('btnPostSales');
    if (postInvoiceBtn) {
      postInvoiceBtn.addEventListener('click', (e) => {
        e.preventDefault();
        postSalesInvoice();
      });
    }
    
    const rateSelect = document.getElementById('salesTdsTcsRateSelect');
    if (rateSelect) {
      rateSelect.addEventListener('change', () => {
        const customWrap = document.getElementById('salesTdsTcsRateCustomWrap');
        if (rateSelect.value === 'custom') {
          if (customWrap) customWrap.style.display = 'flex';
        } else {
          if (customWrap) customWrap.style.display = 'none';
        }
        recalculateSalesTotals();
      });
    }
    const customInput = document.getElementById('salesTdsTcsRateCustom');
    if (customInput) {
      customInput.addEventListener('input', recalculateSalesTotals);
    }
    
    const btnAutoRound = document.getElementById('btnSalesAutoRoundOff');
    if (btnAutoRound) {
      btnAutoRound.addEventListener('click', autoCalculateSalesRoundOff);
    }

    const adjustmentsInput = document.getElementById('salesAdjustments');
    if (adjustmentsInput) {
      adjustmentsInput.addEventListener('input', recalculateSalesTotals);
      adjustmentsInput.addEventListener('blur', () => {
        const val = parseSalesAmt(adjustmentsInput.value);
        if (!isNaN(val)) {
          const clamped = Math.round(val * 100) / 100;
          adjustmentsInput.value = clamped === 0 ? '' : clamped.toFixed(2);
          recalculateSalesTotals();
        }
      });
      adjustmentsInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = parseSalesAmt(adjustmentsInput.value);
          if (!isNaN(val)) {
            const clamped = Math.round(val * 100) / 100;
            adjustmentsInput.value = clamped === 0 ? '' : clamped.toFixed(2);
            recalculateSalesTotals();
          }
        }
      });
    }
    
    const body = document.getElementById('salesItemBody');
    if (body) {
      body.addEventListener('input', (e) => {
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
        updateRowFromDOM(index, tr, triggeredBy);
      });
      
      body.addEventListener('change', (e) => {
        const tr = e.target.closest('tr');
        if (!tr) return;
        const index = parseInt(tr.dataset.rowIndex);
        const triggeredBy = e.target.classList.contains('sales-row-amount-input') ? 'amount' : 'rate';
        updateRowFromDOM(index, tr, triggeredBy);
      });
      
      body.addEventListener('click', (e) => {
        const btn = e.target.closest('.sales-del-row');
        if (btn) {
          const tr = btn.closest('tr');
          const index = parseInt(tr.dataset.rowIndex);
          salesRows.splice(index, 1);
          if (salesRows.length === 0) {
            addSalesRow();
          } else {
            renderSalesRows();
            recalculateSalesTotals();
          }
        }
      });

      // Evaluate math expression and format on blur
      body.addEventListener('blur', (e) => {
        const isRate = e.target.classList.contains('sales-row-rate');
        const isAmt = e.target.classList.contains('sales-row-amount-input');
        const isBase = e.target.classList.contains('sales-row-base');
        const isDisc = e.target.classList.contains('sales-row-discount');
        if (!isRate && !isAmt && !isBase && !isDisc) return;

        const val = parseSalesAmt(e.target.value);
        if (!isNaN(val)) {
          const clamped = Math.round(val * 100) / 100;
          e.target.value = clamped === 0 ? '' : clamped.toFixed(2);
          const tr = e.target.closest('tr');
          if (tr) updateRowFromDOM(parseInt(tr.dataset.rowIndex), tr, isAmt ? 'amount' : 'rate');
        }
      }, true); // capture phase so blur bubbles correctly
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
      custEl.addEventListener('change', () => {
        const customerId = custEl.value;
        const orderEl = document.getElementById('salesOrderNo');
        if (orderEl) {
          if (customerId) {
            const postedInvoices = window.KYA_STORE.salesVouchers || [];
            const count = postedInvoices.filter(v => v.customerId == customerId).length;
            orderEl.value = count + 1;
          } else {
            orderEl.value = '';
          }
        }
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
        const orderNo = document.getElementById('salesOrderNo')?.value?.trim();
        const isOrderLinked = (currentSalesVoucherSubtype === 'Invoice' && orderNo);
        
        let orderAdvanceAmount = 0;
        if (isOrderLinked) {
          const linkedOrder = (window.KYA_STORE.salesVouchers || []).find(v => v.isOrder && v.invoiceNo.toLowerCase() === orderNo.toLowerCase());
          if (linkedOrder) {
            if (linkedOrder.paymentStatus === 'Full Payment') {
              orderAdvanceAmount = linkedOrder.total;
            } else if (linkedOrder.paymentStatus === 'Partial Payment') {
              orderAdvanceAmount = linkedOrder.paymentAmount || 0;
            }
          }
        }
        const excessAmount = Math.max(0, orderAdvanceAmount - total);
        const allowedMax = (isOrderLinked && excessAmount > 0) ? excessAmount : maxVal;
        
        if (total > 0 && parseFloat(payAmtEl.value) > allowedMax) {
          payAmtEl.value = allowedMax.toFixed(2);
          const limitMsg = (isOrderLinked && excessAmount > 0)
            ? `Refund Amount cannot exceed the excess refund amount of ₹${fmtNum(allowedMax)}.`
            : (isOrderLinked 
               ? `Payment Amount cannot exceed the balance payment of ₹${fmtNum(allowedMax)}.`
               : `Payment Amount cannot exceed the Grand Total of ₹${fmtNum(allowedMax)}.`);
          showToast(limitMsg, 'warning');
        }
      });
    }

    const returnBtn = document.getElementById('btnSalesReturn');
    const orderBtn = document.getElementById('btnSalesOrder');
    
    if (returnBtn) {
      returnBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentSalesVoucherSubtype = 'Return';
        window._editingSalesInvoice = null;
        initSalesForm();
      });
    }
    if (orderBtn) {
      orderBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentSalesVoucherSubtype = 'Order';
        window._editingSalesInvoice = null;
        initSalesForm();
      });
    }
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
  if (typeof viewPrintInvoice === 'function') window.viewPrintInvoice = viewPrintInvoice;
  if (typeof editSalesDraft === 'function') window.editSalesDraft = editSalesDraft;
  if (typeof printSalesVoucher === 'function') window.printSalesVoucher = printSalesVoucher;
