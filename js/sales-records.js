  // ══════════════════════════════════════════════════════════════════
  //  SALES RECORDS — Posted/drafted panels, delete, refund modal
  //  (Split from sales.js for maintainability)
  // ══════════════════════════════════════════════════════════════════

  function renderSalesPostedPanel() {
    const wrap = document.getElementById('salesPostedTableWrap');
    if (!wrap) return;
    
    const list = window.KYA_STORE.salesVouchers || [];
    if (list.length === 0) {
      wrap.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: var(--slate-400);">
          <div style="font-size: 40px; margin-bottom: 12px;">📄</div>
          <div style="font-weight: 600; font-size: 15px; color: var(--slate-500);">No Posted Invoices Yet</div>
          <p style="font-size: 13px; margin: 4px 0 16px;">Post a Sales Voucher to see it here.</p>
          <button class="btn btn-primary" onclick="currentSalesVoucherSubtype = 'Invoice'; window._editingSalesInvoice = null; initSalesForm(); openTab('sales_voucher');">Create Invoice</button>
        </div>
      `;
      return;
    }
    
    const sorted = [...list].sort((a,b) => b.postedAt - a.postedAt);
    
    let rowsHtml = sorted.map(inv => {
      const custName = (coaLedgers.find(l => l.id == inv.customerId) || { name: 'Unknown Customer' }).name;
      let execName = '&mdash;';
      if (inv.salesExecutiveId) {
        const execEmp = ohEmployees.find(e => e.id == inv.salesExecutiveId);
        if (execEmp) execName = execEmp.name;
      }
      const isRet = !!inv.isReturn;
      const isOrd = !!inv.isOrder;
      
      let badgeHtml = '';
      if (isRet) {
        badgeHtml = `<span class="badge" style="background: var(--red-50); color: var(--red-700); font-weight: 600; padding: 4px 8px; border-radius: 6px; font-size: 11px; margin-right: 4px;">Reversal</span>`;
      } else if (isOrd) {
        badgeHtml = `<span class="badge" style="background: var(--emerald-50); color: var(--emerald-700); font-weight: 600; padding: 4px 8px; border-radius: 6px; font-size: 11px; margin-right: 4px;">Pre Invoice</span>`;
      } else {
        badgeHtml = `<span class="badge" style="background: var(--blue-50); color: var(--blue-700); font-weight: 600; padding: 4px 8px; border-radius: 6px; font-size: 11px; margin-right: 4px;">Invoice</span>`;
      }
      
      let totalColor = 'var(--slate-900)';
      if (isRet) totalColor = '#dc2626';
      else if (isOrd) totalColor = 'var(--emerald-700)';

      let statusBadgeHtml = '&mdash;';
      if (!isOrd) {
        let statusText = inv.paymentStatus || 'Not Paid';
        let bg = 'var(--slate-100)';
        let fg = 'var(--slate-700)';
        if (statusText === 'Full Payment' || statusText === 'Full Refund') {
          bg = 'var(--emerald-50)';
          fg = 'var(--emerald-700)';
        } else if (statusText === 'Partial Payment' || statusText === 'Partial Refund') {
          bg = 'var(--amber-50)';
          fg = 'var(--amber-700)';
        } else if (statusText === 'Not Refunded' || statusText === 'No Refund') {
          bg = 'var(--red-50)';
          fg = 'var(--red-700)';
        }
        statusBadgeHtml = `<span class="badge" style="background: ${bg}; color: ${fg}; font-weight: 600; padding: 4px 8px; border-radius: 6px; font-size: 11px;">${statusText}</span>`;
      }

      let refundBtnHtml = '';
      if (!isOrd && !isRet && (inv.paymentStatus === 'Not Refunded' || inv.paymentStatus === 'Partial Refund')) {
        refundBtnHtml = `<button class="btn btn-success btn-sm" onclick="openRefundModal(${inv.id})" style="padding: 6px 12px; font-size: 12px; background: var(--emerald-50); color: var(--emerald-600); border: 1.5px solid var(--emerald-100); font-weight: 600;">Refund</button>`;
      }

      return `
        <tr class="sales-row">
          <td style="padding: 14px 16px; font-weight: 700; color: var(--blue-700);">${ohEsc(inv.invoiceNo)}</td>
          <td style="padding: 14px 16px;">${inv.date}</td>
          <td style="padding: 14px 16px; font-weight: 600;">${ohEsc(custName)}</td>
          <td style="padding: 14px 16px; color: var(--slate-600);">${ohEsc(execName)}</td>
          <td style="padding: 14px 16px; color: var(--slate-500); font-size: 12.5px;">${ohEsc(inv.salesSupplyType || 'Intra-State (CGST + SGST)')}</td>
          <td style="padding: 14px 16px;">
            ${badgeHtml}
            <span class="badge" style="background: var(--slate-100); color: var(--slate-700); font-weight: 600; padding: 4px 8px; border-radius: 6px; font-size: 11px;">${inv.type}</span>
          </td>
          <td style="padding: 14px 16px;">
            ${statusBadgeHtml}
          </td>
          <td style="padding: 14px 16px; text-align: right; font-weight: 700; color: ${totalColor};">₹ ${fmtNum(inv.total)}</td>
          <td style="padding: 14px 16px; text-align: center; display: flex; gap: 8px; justify-content: center;">
            ${refundBtnHtml}
            <button class="btn btn-secondary btn-sm" onclick="loadSalesInvoice((window.KYA_STORE.salesVouchers || []).find(v => v.id === ${inv.id}), false)" style="padding: 6px 12px; font-size: 12px; border: 1.5px solid var(--blue-200); color: var(--blue-600); background: #fff;">Edit</button>
            <button class="btn btn-secondary btn-sm" onclick="viewPrintInvoice(${inv.id})" style="padding: 6px 12px; font-size: 12px;">View / Print</button>
            <button class="btn btn-danger btn-sm" onclick="deleteSalesInvoice(${inv.id})" style="padding: 6px 12px; font-size: 12px; background: var(--red-50); color: var(--red-600); border: 1.5px solid var(--red-100);">Delete</button>
          </td>
        </tr>
      `;
    }).join('');
    
    wrap.innerHTML = `
      <div class="sales-table-wrap" style="background: #fff; border: 1.5px solid var(--slate-200); border-radius: 16px; padding: 8px 16px 16px; box-shadow: var(--shadow-sm);">
        <table class="sales-table" style="border-spacing: 0;">
          <thead>
            <tr style="border-bottom: 2px solid var(--slate-100);">
              <th style="padding: 12px 16px; border-bottom: 2px solid var(--slate-100);">Voucher No.</th>
              <th style="padding: 12px 16px; border-bottom: 2px solid var(--slate-100);">Date</th>
              <th style="padding: 12px 16px; border-bottom: 2px solid var(--slate-100);">Customer</th>
              <th style="padding: 12px 16px; border-bottom: 2px solid var(--slate-100);">Sales Executive</th>
              <th style="padding: 12px 16px; border-bottom: 2px solid var(--slate-100);">Supply Type</th>
              <th style="padding: 12px 16px; border-bottom: 2px solid var(--slate-100);">Type</th>
              <th style="padding: 12px 16px; border-bottom: 2px solid var(--slate-100);">Payment Status</th>
              <th style="padding: 12px 16px; text-align: right; border-bottom: 2px solid var(--slate-100);">Total Amount</th>
              <th style="padding: 12px 16px; text-align: center; border-bottom: 2px solid var(--slate-100);">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  function deleteSalesInvoice(id) {
    const list = window.KYA_STORE.salesVouchers || [];
    const index = list.findIndex(v => v.id === id);
    if (index === -1) return;
    const invoice = list[index];
    const isRet = !!invoice.isReturn;
    const isOrd = !!invoice.isOrder;
    
    let titleText = 'Delete Invoice?';
    let messageText = 'Are you sure you want to delete this sales invoice? This action cannot be undone.';
    if (isRet) {
      titleText = 'Delete Reversal?';
      messageText = 'Are you sure you want to delete this sales reversal? This action cannot be undone.';
    } else if (isOrd) {
      titleText = 'Delete Sales Pre Invoice?';
      messageText = 'Are you sure you want to delete this sales pre-invoice? This action cannot be undone.';
    }
    
    showKyaConfirm({
      title: titleText,
      message: messageText,
      confirmLabel: 'Delete',
      okBg: 'var(--red-600)',
      onConfirm: () => {
        list.splice(index, 1);
        window.KYA_STORE.salesVouchers = list;
        
        let successMsg = `Invoice "${invoice.invoiceNo}" deleted.`;
        if (isRet) successMsg = `Sales Reversal "${invoice.invoiceNo}" deleted.`;
        else if (isOrd) successMsg = `Sales Pre Invoice "${invoice.invoiceNo}" deleted.`;
        
        showToast(successMsg, 'success');
        renderSalesPostedPanel();
        triggerAutoBackup();
      }
    });
  }

  function openRefundModal(invoiceId) {
    const list = window.KYA_STORE.salesVouchers || [];
    const inv = list.find(v => v.id === invoiceId);
    if (!inv) return;
    
    let orderAdvanceAmount = 0;
    if (inv.orderNo) {
      const linkedOrder = list.find(v => v.isOrder && v.invoiceNo.toLowerCase() === inv.orderNo.toLowerCase());
      if (linkedOrder) {
        if (linkedOrder.paymentStatus === 'Full Payment') {
          orderAdvanceAmount = linkedOrder.total;
        } else if (linkedOrder.paymentStatus === 'Partial Payment') {
          orderAdvanceAmount = linkedOrder.paymentAmount || 0;
        }
      }
    }
    const excessAmount = Math.max(0, orderAdvanceAmount - inv.total);
    const refundedAmount = inv.refundedAmount || 0;
    const remainingRefund = Math.max(0, excessAmount - refundedAmount);
    
    if (remainingRefund <= 0) {
      showToast('This invoice is already fully refunded.', 'warning');
      return;
    }
    
    const overlay = document.createElement('div');
    overlay.className = 'coa-modal-overlay';
    overlay.id = 'refundModalOverlay';
    
    const accounts = coaLedgers.filter(l => l.type === 'ledger' && l.sgId === 'sg-cce');
    const accOptions = accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    
    overlay.innerHTML = `
      <div class="coa-modal-card" style="max-width: 420px; padding: 24px;">
        <div class="coa-modal-hdr" style="margin-bottom: 20px;">
          <div class="coa-modal-title" style="font-size: 16px; font-weight: 700; color: var(--slate-900);">Record Refund - ${inv.invoiceNo}</div>
          <button class="coa-modal-close" onclick="document.getElementById('refundModalOverlay').remove()">✕</button>
        </div>
        
        <div style="background: var(--slate-50); border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 13px; color: var(--slate-700); line-height: 1.6;">
          <div style="display: flex; justify-content: space-between;">
            <span>Total Refund Due:</span>
            <span style="font-weight: 700;">₹ ${fmtNum(excessAmount)}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Already Refunded:</span>
            <span style="font-weight: 700; color: var(--slate-600);">₹ ${fmtNum(refundedAmount)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 4px; border-top: 1px dashed var(--slate-200); padding-top: 4px; font-weight: 700; color: #ef4444;">
            <span>Remaining Refund:</span>
            <span>₹ ${fmtNum(remainingRefund)}</span>
          </div>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <label style="font-weight: 700; font-size: 10px; text-transform: uppercase; color: var(--slate-400);">Refund Date *</label>
            <input type="date" id="refundModalDate" class="je-input" style="height: 38px; padding: 0 10px; font-size: 13px; font-weight: 600;" value="${new Date().toISOString().split('T')[0]}" />
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <label style="font-weight: 700; font-size: 10px; text-transform: uppercase; color: var(--slate-400);">Refund From (Payment Account) *</label>
            <select id="refundModalAccount" class="je-input" style="height: 38px; padding: 0 10px; font-size: 13px; font-weight: 600; cursor: pointer;">
              <option value="">&mdash; Select Account &mdash;</option>
              ${accOptions}
            </select>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <label style="font-weight: 700; font-size: 10px; text-transform: uppercase; color: var(--slate-400);">Refund Amount *</label>
            <input type="number" id="refundModalAmount" class="je-input" placeholder="0.00" min="0.01" max="${remainingRefund}" step="0.01" style="height: 38px; padding: 0 10px;" value="${remainingRefund.toFixed(2)}" />
          </div>
        </div>
        
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px;">
          <button class="btn btn-secondary" onclick="document.getElementById('refundModalOverlay').remove()" style="padding: 8px 16px; font-size: 13px; font-weight: 600;">Cancel</button>
          <button class="btn btn-primary" id="btnConfirmRefundSubmit" style="padding: 8px 16px; font-size: 13px; font-weight: 600; background: var(--emerald-600); border-color: var(--emerald-600);">Process Refund</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    document.getElementById('btnConfirmRefundSubmit').addEventListener('click', () => {
      const refDate = document.getElementById('refundModalDate').value;
      const refAccId = document.getElementById('refundModalAccount').value;
      const refAmt = parseFloat(document.getElementById('refundModalAmount').value) || 0;
      
      if (!refAccId) {
        showToast('Please select a payment account for the refund.', 'warning');
        return;
      }
      if (refAmt <= 0) {
        showToast('Refund Amount must be greater than zero.', 'warning');
        return;
      }
      if (refAmt > remainingRefund) {
        showToast(`Refund Amount cannot exceed the remaining refund of ₹${fmtNum(remainingRefund)}.`, 'warning');
        return;
      }
      
      inv.refundedAmount = (inv.refundedAmount || 0) + refAmt;
      
      if (inv.refundedAmount >= excessAmount) {
        inv.paymentStatus = 'Full Refund';
      } else {
        inv.paymentStatus = 'Partial Refund';
      }
      
      const idx = window.KYA_STORE.salesVouchers.findIndex(v => v.id === inv.id);
      if (idx > -1) {
        window.KYA_STORE.salesVouchers[idx] = inv;
      }
      
      overlay.remove();
      showToast(`Refund of ₹${fmtNum(refAmt)} processed successfully.`, 'success');
      
      renderSalesPostedPanel();
      triggerAutoBackup();
    });
  }

  function renderSalesDraftedPanel() {
    const wrap = document.getElementById('salesDraftedTableWrap');
    if (!wrap) return;
    
    const list = window.KYA_STORE.salesVouchersDrafts || [];
    if (list.length === 0) {
      wrap.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: var(--slate-400);">
          <div style="font-size: 40px; margin-bottom: 12px;">📝</div>
          <div style="font-weight: 600; font-size: 15px; color: var(--slate-500);">No Drafts Found</div>
          <p style="font-size: 13px; margin: 4px 0 16px;">Save an invoice as a draft to see it here.</p>
        </div>
      `;
      return;
    }
    
    const sorted = [...list].sort((a,b) => b.updatedAt - a.updatedAt);
    
    let rowsHtml = sorted.map(draft => {
      const custName = draft.customerId ? ((coaLedgers.find(l => l.id == draft.customerId) || { name: 'Unknown Customer' }).name) : '&mdash; No Customer &mdash;';
      let execName = '&mdash;';
      if (draft.salesExecutiveId) {
        const execEmp = ohEmployees.find(e => e.id == draft.salesExecutiveId);
        if (execEmp) execName = execEmp.name;
      }
      const supplyType = draft.salesSupplyType || 'Intra-State (CGST + SGST)';
      const isRet = !!draft.isReturn;
      const isOrd = !!draft.isOrder;
      
      let badgeHtml = '';
      if (isRet) {
        badgeHtml = `<span class="badge" style="background: var(--red-50); color: var(--red-700); font-weight: 600; padding: 4px 8px; border-radius: 6px; font-size: 11px; margin-right: 4px;">Reversal</span>`;
      } else if (isOrd) {
        badgeHtml = `<span class="badge" style="background: var(--emerald-50); color: var(--emerald-700); font-weight: 600; padding: 4px 8px; border-radius: 6px; font-size: 11px; margin-right: 4px;">Pre Invoice</span>`;
      } else {
        badgeHtml = `<span class="badge" style="background: var(--blue-50); color: var(--blue-700); font-weight: 600; padding: 4px 8px; border-radius: 6px; font-size: 11px; margin-right: 4px;">Invoice</span>`;
      }
      
      let totalColor = 'var(--slate-700)';
      if (isRet) totalColor = '#dc2626';
      else if (isOrd) totalColor = 'var(--emerald-700)';

      return `
        <tr class="sales-row">
          <td style="padding: 14px 16px; font-weight: 700; color: var(--slate-700);">${ohEsc(draft.invoiceNo || 'Draft')}</td>
          <td style="padding: 14px 16px;">${draft.date || '&mdash;'}</td>
          <td style="padding: 14px 16px; font-weight: 600;">${ohEsc(custName)}</td>
          <td style="padding: 14px 16px; color: var(--slate-600);">${ohEsc(execName)}</td>
          <td style="padding: 14px 16px; color: var(--slate-500); font-size: 12.5px;">${ohEsc(supplyType)}</td>
          <td style="padding: 14px 16px;">
            ${badgeHtml}
            <span class="badge" style="background: var(--slate-100); color: var(--slate-600); font-weight: 600; padding: 4px 8px; border-radius: 6px; font-size: 11px;">${draft.type}</span>
          </td>
          <td style="padding: 14px 16px; text-align: right; font-weight: 700; color: ${totalColor};">₹ ${fmtNum(draft.total)}</td>
          <td style="padding: 14px 16px; text-align: center; display: flex; gap: 8px; justify-content: center;">
            <button class="btn btn-primary btn-sm" onclick="editSalesDraft(${draft.id})" style="padding: 6px 12px; font-size: 12px;">Edit / Load</button>
            <button class="btn btn-danger btn-sm" onclick="deleteSalesDraft(${draft.id})" style="padding: 6px 12px; font-size: 12px; background: var(--red-50); color: var(--red-600); border: 1.5px solid var(--red-100);">Delete</button>
          </td>
        </tr>
      `;
    }).join('');
    
    wrap.innerHTML = `
      <div class="sales-table-wrap" style="background: #fff; border: 1.5px solid var(--slate-200); border-radius: 16px; padding: 8px 16px 16px; box-shadow: var(--shadow-sm);">
        <table class="sales-table" style="border-spacing: 0;">
          <thead>
            <tr style="border-bottom: 2px solid var(--slate-100);">
              <th style="padding: 12px 16px; border-bottom: 2px solid var(--slate-100);">Voucher No.</th>
              <th style="padding: 12px 16px; border-bottom: 2px solid var(--slate-100);">Date</th>
              <th style="padding: 12px 16px; border-bottom: 2px solid var(--slate-100);">Customer</th>
              <th style="padding: 12px 16px; border-bottom: 2px solid var(--slate-100);">Sales Executive</th>
              <th style="padding: 12px 16px; border-bottom: 2px solid var(--slate-100);">Supply Type</th>
              <th style="padding: 12px 16px; border-bottom: 2px solid var(--slate-100);">Type</th>
              <th style="padding: 12px 16px; text-align: right; border-bottom: 2px solid var(--slate-100);">Total Amount</th>
              <th style="padding: 12px 16px; text-align: center; border-bottom: 2px solid var(--slate-100);">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  function editSalesDraft(id) {
    const list = window.KYA_STORE.salesVouchersDrafts || [];
    const draft = list.find(d => d.id === id);
    if (!draft) return;
    
    loadSalesInvoice(draft, true);
  }

  function deleteSalesDraft(id) {
    showKyaConfirm({
      title: 'Delete Draft?',
      message: 'Are you sure you want to delete this draft? This action cannot be undone.',
      confirmLabel: 'Delete',
      okBg: 'var(--red-600)',
      onConfirm: () => {
        let list = window.KYA_STORE.salesVouchersDrafts || [];
        list = list.filter(d => d.id !== id);
        window.KYA_STORE.salesVouchersDrafts = list;
        showToast('Draft deleted successfully.', 'success');
        renderSalesDraftedPanel();
        triggerAutoBackup();
      }
    });
  }
