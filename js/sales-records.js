  // ══════════════════════════════════════════════════════════════════
  //  SALES RECORDS — Posted/drafted panels, delete
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
      
      let badgeHtml = '';
      if (isRet) {
        badgeHtml = `<span class="badge" style="background: var(--red-50); color: var(--red-700); font-weight: 600; padding: 4px 8px; border-radius: 6px; font-size: 11px; margin-right: 4px;">Reversal</span>`;
      } else {
        badgeHtml = `<span class="badge" style="background: var(--blue-50); color: var(--blue-700); font-weight: 600; padding: 4px 8px; border-radius: 6px; font-size: 11px; margin-right: 4px;">Invoice</span>`;
      }
      
      let totalColor = isRet ? '#dc2626' : 'var(--slate-900)';

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
      const statusBadgeHtml = `<span class="badge" style="background: ${bg}; color: ${fg}; font-weight: 600; padding: 4px 8px; border-radius: 6px; font-size: 11px;">${statusText}</span>`;

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
    
    let titleText = isRet ? 'Delete Reversal?' : 'Delete Invoice?';
    let messageText = isRet 
      ? 'Are you sure you want to delete this sales reversal? This action cannot be undone.'
      : 'Are you sure you want to delete this sales invoice? This action cannot be undone.';
    
    showKyaConfirm({
      title: titleText,
      message: messageText,
      confirmLabel: 'Delete',
      okBg: 'var(--red-600)',
      onConfirm: () => {
        list.splice(index, 1);
        window.KYA_STORE.salesVouchers = list;
        
        if (typeof postedEntries !== 'undefined') {
          if (invoice.journalEntryId) {
            postedEntries = postedEntries.filter(e => e.id !== invoice.journalEntryId && e.id !== invoice.id);
          } else {
            postedEntries = postedEntries.filter(e => e.id !== invoice.id);
          }
          if (invoice.refundJournalEntryIds && Array.isArray(invoice.refundJournalEntryIds)) {
            postedEntries = postedEntries.filter(e => !invoice.refundJournalEntryIds.includes(e.id));
          }
        }

        const successMsg = isRet ? `Sales Reversal "${invoice.invoiceNo}" deleted.` : `Invoice "${invoice.invoiceNo}" deleted.`;
        
        showToast(successMsg, 'success');
        if (typeof refreshAllReports === 'function') refreshAllReports();
        if (typeof renderVoucherDeskPanel === 'function') renderVoucherDeskPanel();
        if (typeof renderSalesPostedPanel === 'function') renderSalesPostedPanel();
        if (typeof renderLedgerStatementView === 'function') renderLedgerStatementView();
        triggerAutoBackup();
      }
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
      
      let badgeHtml = '';
      if (isRet) {
        badgeHtml = `<span class="badge" style="background: var(--red-50); color: var(--red-700); font-weight: 600; padding: 4px 8px; border-radius: 6px; font-size: 11px; margin-right: 4px;">Reversal</span>`;
      } else {
        badgeHtml = `<span class="badge" style="background: var(--blue-50); color: var(--blue-700); font-weight: 600; padding: 4px 8px; border-radius: 6px; font-size: 11px; margin-right: 4px;">Invoice</span>`;
      }
      
      let totalColor = isRet ? '#dc2626' : 'var(--slate-700)';

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
