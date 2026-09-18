// ══════════════════════════════════════════════════════════════════
//  SALES INVOICE EXPORT — PDF and Excel for the posted tax invoice.
//
//    • PDF ..... a high-resolution snapshot of the exact invoice sheet the
//                preview shows, laid out on A4 (logo, QR and seal included).
//    • Excel ... a formatted .xlsx built from the same figures and labels
//                (window.getSalesInvoiceExportData in sales-invoice-print.js).
// ══════════════════════════════════════════════════════════════════
(function (global) {
  'use strict';

  const JSPDF_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  const HTML2CANVAS_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  const EXCELJS_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
  const SHEET_WIDTH_PX = 820;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = Array.prototype.find.call(document.scripts, s => s.src === src);
      if (existing && existing.dataset.loaded === '1') return resolve();
      const script = existing || document.createElement('script');
      script.addEventListener('load', () => { script.dataset.loaded = '1'; resolve(); });
      script.addEventListener('error', () => reject(new Error('Could not load ' + src)));
      if (!existing) { script.src = src; document.head.appendChild(script); }
    });
  }

  async function ensureJsPDF() {
    if (!(global.jspdf && global.jspdf.jsPDF)) await loadScript(JSPDF_SRC);
    if (!(global.jspdf && global.jspdf.jsPDF)) throw new Error('PDF library is not available.');
    return global.jspdf.jsPDF;
  }

  async function ensureHtml2Canvas() {
    if (!global.html2canvas) await loadScript(HTML2CANVAS_SRC);
    if (!global.html2canvas) throw new Error('Snapshot library is not available.');
    return global.html2canvas;
  }

  async function ensureExcelJS() {
    if (!global.ExcelJS) await loadScript(EXCELJS_SRC);
    if (!global.ExcelJS) throw new Error('Excel library is not available.');
    return global.ExcelJS;
  }

  function getExportData(inv) {
    if (typeof global.getSalesInvoiceExportData !== 'function') {
      throw new Error('Invoice module is not loaded.');
    }
    return global.getSalesInvoiceExportData(inv);
  }

  function withTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error((label || 'Step') + ' timed out')), ms))
    ]);
  }

  function waitForImages(root) {
    const imgs = Array.prototype.slice.call(root.querySelectorAll('img'));
    return Promise.all(imgs.map(img => (img.complete && img.naturalWidth)
      ? Promise.resolve()
      : new Promise(res => { img.addEventListener('load', res, { once: true }); img.addEventListener('error', res, { once: true }); })));
  }

  // html2canvas cannot paint CSS gradients reliably (the initials logo uses one), so each
  // gradient in the off-screen copy is redrawn onto a canvas and swapped in as an image.
  function rasterizeGradients(root) {
    const els = [root].concat(Array.prototype.slice.call(root.querySelectorAll('*')));
    els.forEach(el => {
      const bg = (el.ownerDocument.defaultView || window).getComputedStyle(el).backgroundImage || '';
      if (bg.indexOf('gradient') === -1) return;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const m = /linear-gradient\(\s*(?:(-?[\d.]+)deg\s*,)?(.*)\)\s*$/i.exec(bg);
      const colors = m ? (m[2].match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}/gi) || []) : [];
      el.style.backgroundImage = 'none';
      if (!w || !h || colors.length < 2) {
        if (colors[0]) el.style.backgroundColor = colors[0];
        return;
      }
      const scale = 3;
      const W = Math.round(w * scale);
      const H = Math.round(h * scale);
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d');
      const angle = (m[1] !== undefined ? parseFloat(m[1]) : 180) * Math.PI / 180;
      const half = (Math.abs(W * Math.sin(angle)) + Math.abs(H * Math.cos(angle))) / 2;
      const dx = Math.sin(angle) * half;
      const dy = -Math.cos(angle) * half;
      const g = ctx.createLinearGradient(W / 2 - dx, H / 2 - dy, W / 2 + dx, H / 2 + dy);
      colors.forEach((col, i) => g.addColorStop(i / (colors.length - 1), col));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      el.style.backgroundColor = colors[0];
      el.style.backgroundImage = 'url(' + c.toDataURL('image/png') + ')';
      el.style.backgroundSize = '100% 100%';
      el.style.backgroundRepeat = 'no-repeat';
    });
  }

  // html2canvas skips SVG images (the company seal), so they are redrawn as PNG first.
  function rasterizeSvgImages(root) {
    const imgs = Array.prototype.slice.call(root.querySelectorAll('img'))
      .filter(img => /^data:image\/svg\+xml/i.test(img.getAttribute('src') || ''));
    return Promise.all(imgs.map(img => new Promise(resolve => {
      setTimeout(resolve, 3000);
      const src = img.getAttribute('src');
      const probe = new Image();
      probe.onload = () => {
        try {
          const w = probe.naturalWidth || 200;
          const h = probe.naturalHeight || 200;
          const scale = 4;
          const c = document.createElement('canvas');
          c.width = w * scale;
          c.height = h * scale;
          c.getContext('2d').drawImage(probe, 0, 0, c.width, c.height);
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = c.toDataURL('image/png');
        } catch (e) { resolve(); }
      };
      probe.onerror = () => resolve();
      probe.src = src;
    })));
  }

  // ── PDF ──────────────────────────────────────────────────────────
  async function exportSalesInvoiceToPDF(inv) {
    const data = getExportData(inv);
    const [jsPDF, html2canvas] = await Promise.all([ensureJsPDF(), ensureHtml2Canvas()]);

    // Render a fresh copy of the sheet off-screen at the preview's width, inside the
    // app document so it picks up exactly the same styles the preview uses.
    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:fixed; left:-12000px; top:0; width:' + SHEET_WIDTH_PX + 'px; background:#ffffff; pointer-events:none;';
    host.innerHTML = global.renderSalesTaxInvoiceHTML(inv);
    document.body.appendChild(host);

    try {
      await waitForImages(host);
      if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }

      const sheet = host.firstElementChild;
      rasterizeGradients(sheet);
      await rasterizeSvgImages(sheet);
      const canvas = await html2canvas(sheet, {
        scale: 3,
        imageTimeout: 4000,
        removeContainer: true,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        windowWidth: SHEET_WIDTH_PX
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const usableW = pageW - margin * 2;
      const usableH = pageH - margin * 2;
      const mmPerPx = usableW / canvas.width;
      const fullH = canvas.height * mmPerPx;

      if (fullH <= usableH) {
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, usableW, fullH, undefined, 'FAST');
      } else {
        // Taller than one page: slice the snapshot page by page.
        const slicePx = Math.floor(usableH / mmPerPx);
        let offset = 0;
        let first = true;
        while (offset < canvas.height) {
          const h = Math.min(slicePx, canvas.height - offset);
          const part = document.createElement('canvas');
          part.width = canvas.width;
          part.height = h;
          const ctx = part.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, part.width, part.height);
          ctx.drawImage(canvas, 0, offset, canvas.width, h, 0, 0, canvas.width, h);
          if (!first) pdf.addPage();
          pdf.addImage(part.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, usableW, h * mmPerPx, undefined, 'FAST');
          offset += h;
          first = false;
        }
      }

      pdf.setProperties({
        title: data.docTitle + ' ' + (inv.invoiceNo || ''),
        subject: data.docTitle,
        author: data.companyName,
        creator: 'KYA Accounting'
      });
      pdf.save(data.fileBase + '.pdf');
      return true;
    } finally {
      host.remove();
    }
  }

  // A tiny hidden frame holding ONLY the invoice sheet. Printing and snapshotting
  // this frame is far faster than working on the whole app page.
  async function createInvoiceFrame(inv, title) {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = 'position:fixed; left:-12000px; top:0; width:' + SHEET_WIDTH_PX + 'px; height:1200px; border:0; background:#ffffff;';
    document.body.appendChild(frame);
    const fontLinks = Array.prototype.filter.call(document.querySelectorAll('link[rel="stylesheet"]'), l => /fonts.googleapis/.test(l.href))
      .map(l => '<link rel="stylesheet" href="' + l.href + '">').join('');
    const doc = frame.contentDocument;
    doc.open();
    doc.write('<!doctype html><html><head><meta charset="utf-8"><title>' + String(title || 'Invoice').replace(/[<&]/g, '') + '</title>' +
      '<style>html,body{margin:0;padding:0;background:#ffffff;}' +
      '*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}' +
      '@page{size:A4;margin:8mm;}' +
      'thead{display:table-header-group;}' +
      'tr,img{break-inside:avoid;page-break-inside:avoid;}' +
      '</style>' + fontLinks + '</head><body>' +
      global.renderSalesTaxInvoiceHTML(inv) + '</body></html>');
    doc.close();
    await waitForImages(doc.body);
    if (doc.fonts && doc.fonts.ready) { try { await withTimeout(doc.fonts.ready, 1500, 'Fonts'); } catch (e) {} }
    return { frame, doc, sheet: doc.body.firstElementChild };
  }

  // Off-screen snapshot of the invoice sheet (used for the Excel picture sheet).
  async function captureInvoiceCanvas(inv) {
    const html2canvas = await ensureHtml2Canvas();
    const f = await createInvoiceFrame(inv);
    try {
      rasterizeGradients(f.sheet);
      await rasterizeSvgImages(f.sheet);
      return await html2canvas(f.sheet, {
        scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false,
        imageTimeout: 3000, removeContainer: true, windowWidth: SHEET_WIDTH_PX
      });
    } finally {
      f.frame.remove();
    }
  }

  // ── PDF (vector) ─────────────────────────────────────────────────
  // The browser's own print engine writes a true vector PDF: text and lines stay
  // razor-sharp at any zoom and the page matches the on-screen invoice exactly.
  // The document title becomes the suggested file name in "Save as PDF".
  async function exportSalesInvoiceViaPrint(inv) {
    const d = getExportData(inv);
    const f = await createInvoiceFrame(inv, d.fileBase);
    const cleanup = () => { if (f.frame.parentNode) f.frame.remove(); };
    const win = f.frame.contentWindow;
    // Lay out at the A4 printable width (210mm - 2 x 8mm) and, when the invoice is only
    // slightly taller than one page, shrink it to fit so no near-empty page is printed.
    const PRINT_W = 733, PRINT_H = 1058;
    f.frame.style.width = PRINT_W + 'px';
    const sheetH = f.sheet.scrollHeight;
    if (sheetH > PRINT_H && sheetH < PRINT_H * 1.3) f.sheet.style.zoom = (PRINT_H / sheetH).toFixed(4);
    try {
      win.addEventListener('afterprint', () => setTimeout(cleanup, 300));
      win.focus();
      win.print();
    } finally {
      setTimeout(cleanup, 60000);
    }
    return true;
  }

  // ── Excel ────────────────────────────────────────────────────────
  const XL = {
    blue: 'FF2563EB', blueDark: 'FF1D4ED8', ink: 'FF0F172A', slate: 'FF334155',
    muted: 'FF475569', faint: 'FF64748B', line: 'FF94A3B8', shade: 'FFF8FAFC', white: 'FFFFFFFF'
  };
  const XL_NUM = '#,##0.00';
  const XL_FONT = 'Calibri';
  const XL_PX_PER_CHAR = 7.2;

  function colLetter(n) {
    let s = '';
    while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
    return s;
  }

  // Excel only embeds PNG/JPEG, so anything else (SVG seal, WEBP logo …) is drawn to PNG.
  function imageToExcelMedia(src, size) {
    return new Promise(resolve => {
      if (!src) return resolve(null);
      const m = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(src);
      if (m) return resolve({ base64: m[2], extension: m[1].toLowerCase() === 'png' ? 'png' : 'jpeg' });
      const img = new Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth || size || 200;
          const h = img.naturalHeight || size || 200;
          const scale = Math.max(1, Math.min(4, (size || 200) * 3 / Math.max(w, h)));
          const c = document.createElement('canvas');
          c.width = Math.round(w * scale);
          c.height = Math.round(h * scale);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve({ base64: c.toDataURL('image/png').split(',')[1], extension: 'png' });
        } catch (e) { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // Initials badge in the company's icon colours, for companies without an uploaded logo.
  function initialsBadgeMedia(co, name) {
    const presets = {
      'blue-green': ['#2563eb', '#059669'], 'indigo-purple': ['#4f46e5', '#7c3aed'],
      'rose-red': ['#e11d48', '#be123c'], 'amber-orange': ['#f59e0b', '#d97706'],
      'emerald-teal': ['#10b981', '#047857'], 'dark-slate': ['#475569', '#1e293b']
    };
    const pair = presets[co.iconColor] || presets['blue-green'];
    const initials = (typeof global.getCompanyInitials === 'function')
      ? global.getCompanyInitials(co.name || name)
      : String(name || '').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
    const px = 246;
    const c = document.createElement('canvas');
    c.width = px; c.height = px;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, px, px);
    g.addColorStop(0, pair[0]); g.addColorStop(1, pair[1]);
    const r = 42;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(px, 0, px, px, r);
    ctx.arcTo(px, px, 0, px, r);
    ctx.arcTo(0, px, 0, 0, r);
    ctx.arcTo(0, 0, px, 0, r);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 84px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, px / 2, px / 2 + 4);
    return { base64: c.toDataURL('image/png').split(',')[1], extension: 'png' };
  }

  async function exportSalesInvoiceToExcel(inv) {
    const d = getExportData(inv);
    const ExcelJS = await ensureExcelJS();

    const wb = new ExcelJS.Workbook();
    wb.creator = 'KYA Accounting';
    wb.created = new Date();
    wb.title = d.docTitle + ' ' + (inv.invoiceNo || '');
    wb.company = d.companyName;
    wb.calcProperties.fullCalcOnLoad = true;
    const sheetName = String(inv.invoiceNo || 'Invoice').replace(/[\\/?*[\]:]/g, '-').slice(0, 31) || 'Invoice';
    // Sheet 1 — the invoice exactly as printed (the same snapshot the PDF uses).
    try {
      const snap = await withTimeout(captureInvoiceCanvas(inv), 25000, 'Invoice snapshot');
      const ps = wb.addWorksheet(sheetName, {
        properties: { tabColor: { argb: 'FF1E3A8A' } },
        views: [{ showGridLines: false }],
        pageSetup: {
          paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
          horizontalCentered: true,
          margins: { left: 0, right: 0, top: 0, bottom: 0, header: 0, footer: 0 }
        }
      });
      // Lay the snapshot onto A4 pages exactly like the PDF (8mm margins, white page).
      const PAGE_W = 794, PAGE_H = 1123, PAGE_M = 30, PX = 3, GAP = 24;
      const contentW = PAGE_W - PAGE_M * 2;
      const k = contentW / snap.width;
      const sliceH = Math.floor((PAGE_H - PAGE_M * 2) / k);
      let offset = 0;
      let top = 0;
      while (offset < snap.height) {
        const h = Math.min(sliceH, snap.height - offset);
        const pg = document.createElement('canvas');
        pg.width = PAGE_W * PX;
        pg.height = PAGE_H * PX;
        const ctx = pg.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pg.width, pg.height);
        ctx.drawImage(snap, 0, offset, snap.width, h, PAGE_M * PX, PAGE_M * PX, contentW * PX, h * k * PX);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, pg.width - 2, pg.height - 2);
        const pageId = wb.addImage({ base64: pg.toDataURL('image/jpeg', 0.95).split(',')[1], extension: 'jpeg' });
        ps.addImage(pageId, { tl: { col: 0.25, row: top / 20 + 0.5 }, ext: { width: PAGE_W, height: PAGE_H }, editAs: 'absolute' });
        top += PAGE_H + GAP;
        offset += h;
      }
      ps.pageSetup.printArea = 'A1:' + colLetter(Math.ceil((PAGE_W + 20) / 64)) + Math.ceil(top / 20 + 1);
    } catch (e) {
      console.warn('Invoice snapshot sheet skipped:', e);
    }

    // Sheet 2 — the same invoice as editable cells.
    const ws = wb.addWorksheet('Details', {
      views: [{ showGridLines: false, zoomScale: 100 }],
      properties: { tabColor: { argb: 'FF2563EB' }, defaultRowHeight: 18 },
      pageSetup: {
        paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
        horizontalCentered: true,
        margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.55, header: 0.25, footer: 0.25 }
      }
    });
    ws.headerFooter.oddFooter = '&L&8&K64748B' + d.companyName + ' · ' + d.docTitle + ' ' + (inv.invoiceNo || '') + '&R&8&K64748BPage &P of &N';

    // ── Design tokens ──
    const C = {
      navy: 'FF1E3A8A', blue: 'FF2563EB', blueSoft: 'FFDBEAFE', ink: 'FF0F172A', slate: 'FF334155',
      muted: 'FF64748B', label: 'FFF1F5F9', band: 'FFF8FAFC', line: 'FFCBD5E1', white: 'FFFFFFFF'
    };
    const LAST = 15;                                   // columns A..O
    const NUMF = '#,##0.00;[Red]-#,##0.00;"–"';
    const QTYF = '#,##0.###;[Red]-#,##0.###;"–"';
    const PCTF = 'General"%"';
    const DATEF = 'dd-mmm-yyyy';
    const widths = [7, 38, 16, 9, 8, 12, 15, 12, 15, 10, 12, 12, 12, 13, 15];
    widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

    const fnt = (o) => Object.assign({ name: XL_FONT, size: 10, color: { argb: C.ink } }, o || {});
    const solid = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
    const side = (argb, style) => ({ style: style || 'thin', color: { argb: argb || C.line } });
    const box = (argb) => ({ top: side(argb), bottom: side(argb), left: side(argb), right: side(argb) });
    const toDate = (iso) => {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
      return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
    };
    const fmla = (formula, result) => ({ formula, result: Math.round((parseFloat(result) || 0) * 100) / 100 });
    const isNumeric = (v) => typeof v === 'number' || v instanceof Date || (v && typeof v === 'object' && v.formula);
    let r = 0;

    // ── Title banner ──
    r = 1;
    ws.mergeCells(1, 1, 1, LAST);
    const t1 = ws.getCell(1, 1);
    t1.value = d.docTitle.toUpperCase() + '  ·  ' + (inv.invoiceNo || '');
    t1.font = fnt({ size: 16, bold: true, color: { argb: C.white } });
    t1.fill = solid(C.navy);
    t1.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws.getRow(1).height = 32;
    r = 2;
    ws.mergeCells(2, 1, 2, LAST);
    const t2 = ws.getCell(2, 1);
    t2.value = d.companyName + '   |   Invoice Date: ' + (d.invoiceDate || '') + '   |   Total Amount: ' +
      (parseFloat(d.grandTotal) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    t2.font = fnt({ size: 10, italic: true, color: { argb: C.navy } });
    t2.fill = solid(C.blueSoft);
    t2.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws.getRow(2).height = 20;

    const section = (title, c1, c2) => {
      r += 2;
      c1 = c1 || 2;
      c2 = c2 || 8;
      ws.mergeCells(r, c1, r, c2);
      const c = ws.getCell(r, c1);
      c.value = title;
      c.font = fnt({ size: 10.5, bold: true, color: { argb: C.white } });
      c.fill = solid(C.blue);
      c.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      ws.getRow(r).height = 22;
    };
    const field = (label, value, numFmt) => {
      r++;
      ws.getRow(r).height = 18;
      const lc = ws.getCell(r, 2);
      lc.value = label;
      lc.font = fnt({ bold: true, color: { argb: C.slate } });
      lc.fill = solid(C.label);
      lc.border = box();
      lc.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      const v = (value === undefined || value === null) ? '' : value;
      const numeric = isNumeric(v);
      if (!numeric) ws.mergeCells(r, 3, r, 8);
      const vc = ws.getCell(r, 3);
      vc.value = v;
      vc.font = fnt();
      vc.border = box();
      vc.alignment = { vertical: 'middle', horizontal: numeric ? 'right' : 'left', indent: numeric ? 0 : 1, wrapText: !numeric };
      if (numFmt) vc.numFmt = numFmt;
      if (!numeric && String(v).length > 70) ws.getRow(r).height = 18 * Math.ceil(String(v).length / 70);
      return vc;
    };
    const tableHeader = (labels) => {
      r++;
      labels.forEach((h, i) => {
        if (h === null) return;
        const c = ws.getCell(r, i + 1);
        c.value = h;
        c.font = fnt({ bold: true, color: { argb: C.white } });
        c.fill = solid(C.navy);
        c.border = box(C.navy);
        c.alignment = { vertical: 'middle', horizontal: (i < 3 || h === 'Unit') ? 'left' : 'right', wrapText: true, indent: i < 3 ? 1 : 0 };
      });
      ws.getRow(r).height = 32;
      return r;
    };
    const styleBodyCell = (c, i, zebra, fmt, align) => {
      c.font = fnt();
      c.fill = solid(zebra ? C.band : C.white);
      c.border = box();
      if (fmt) c.numFmt = fmt;
      c.alignment = Object.assign({ vertical: 'middle', horizontal: 'right' }, align || {});
    };

    // ── Invoice ──
    section('INVOICE');
    field('Document Type', d.docTitle);
    field('Invoice No.', inv.invoiceNo || '');
    field('Invoice Date', toDate(inv.date) || inv.date || '', DATEF);
    field('Due Date', toDate(inv.dueDate) || inv.dueDate || '', DATEF);
    if (d.isReturn) field('Against Invoice', inv.returnAgainstInvoice || '');
    field('Supply Type', inv.salesSupplyType || '');
    field('Tax Type', d.taxMode === 'split' ? 'CGST + SGST' : (d.taxMode === 'igst' ? 'IGST' : 'No Tax'));
    field('Place of Supply', d.placeOfSupply || '');
    field('Payment Status', inv.paymentStatus || '');

    const partyBlock = (title, p) => {
      section(title);
      field('Name', p.name || '');
      field('Address', p.address ? String(p.address).replace(/\s*\n\s*/g, ', ') : '');
      field('City', p.city || '');
      field('Pincode', p.pincode ? String(p.pincode) : '');
      field('State', p.state || '');
      field('Country', p.country || '');
      field('Phone', p.phone ? String(p.phone) : '');
      field('Email', p.email || '');
      field('GSTIN', p.gstin || '');
      field('PAN', p.pan || '');
    };
    partyBlock('BILLED TO (RECIPIENT)', d.parties.billed);
    partyBlock('SHIPPED TO (DELIVERY)', d.parties.shipped || d.parties.billed);

    // ── Line items ──
    section('LINE ITEMS', 1, LAST);
    const itemHeaders = ['Sl No', 'Item Description', 'HSN/SAC', 'Qty', 'Unit', 'Rate', 'Gross Amount (Qty × Rate)',
      'Discount', 'Taxable Value', 'Tax Rate', 'CGST', 'SGST', 'IGST', 'Total Tax', 'Amount'];
    const itemHeaderRow = tableHeader(itemHeaders);
    const firstItem = itemHeaderRow + 1;
    d.rows.forEach((row, idx) => {
      r++;
      const n = r;
      const zebra = idx % 2 === 1;
      const cgstF = d.taxMode === 'split' ? `I${n}*J${n}/200` : '0';
      const igstF = d.taxMode === 'igst' ? `I${n}*J${n}/100` : '0';
      const half = d.taxMode === 'split' ? row.taxAmt / 2 : 0;
      const tax = d.taxMode === 'none' ? 0 : row.taxAmt;
      const vals = [
        idx + 1, row.name || '', row.hsn ? String(row.hsn) : '', row.qty, row.unit || '', row.rate,
        fmla(`D${n}*F${n}`, row.gross), row.discAmt || 0, fmla(`G${n}-H${n}`, row.taxable), row.taxPct || 0,
        fmla(cgstF, half), fmla(cgstF, half), fmla(igstF, d.taxMode === 'igst' ? row.taxAmt : 0),
        fmla(`K${n}+L${n}+M${n}`, tax), fmla(`I${n}+N${n}`, row.taxable + tax)
      ];
      vals.forEach((v, i) => {
        const c = ws.getCell(n, i + 1);
        c.value = v;
        let fmt = NUMF;
        let align = null;
        if (i === 0) { fmt = null; align = { horizontal: 'center' }; }
        else if (i === 1) { fmt = null; align = { horizontal: 'left', wrapText: true, indent: 1 }; }
        else if (i === 2) { fmt = '@'; align = { horizontal: 'left', indent: 1 }; }
        else if (i === 3) fmt = QTYF;
        else if (i === 4) { fmt = null; align = { horizontal: 'center' }; }
        else if (i === 9) fmt = PCTF;
        styleBodyCell(c, i, zebra, fmt, align);
      });
      const descLen = String(row.name || '').length;
      ws.getRow(n).height = descLen > 40 ? 18 * Math.ceil(descLen / 40) : 20;
    });
    const lastItem = Math.max(firstItem, r);
    if (!d.rows.length) {
      r++;
      ws.mergeCells(r, 1, r, LAST);
      const c = ws.getCell(r, 1);
      c.value = 'No line items';
      c.font = fnt({ italic: true, color: { argb: C.muted } });
      c.alignment = { horizontal: 'center' };
    }
    r++;
    const totalRow = r;
    ws.getRow(totalRow).height = 22;
    const colSum = (col, result, fmt) => {
      const c = ws.getCell(totalRow, col.charCodeAt(0) - 64);
      c.value = fmla(`SUM(${col}${firstItem}:${col}${lastItem})`, result);
      c.numFmt = fmt || NUMF;
    };
    const sumOf = (key) => d.rows.reduce((s, x) => s + (parseFloat(x[key]) || 0), 0);
    const totalTax = d.taxMode === 'none' ? 0 : d.totalTax;
    colSum('D', sumOf('qty'), QTYF);
    colSum('G', sumOf('gross'));
    colSum('H', sumOf('discAmt'));
    colSum('I', d.subTotal);
    colSum('K', d.taxMode === 'split' ? d.totalTax / 2 : 0);
    colSum('L', d.taxMode === 'split' ? d.totalTax / 2 : 0);
    colSum('M', d.taxMode === 'igst' ? d.totalTax : 0);
    colSum('N', totalTax);
    colSum('O', d.subTotal + totalTax);
    ws.getCell(totalRow, 2).value = 'TOTAL';
    for (let c = 1; c <= LAST; c++) {
      const cell = ws.getCell(totalRow, c);
      cell.font = fnt({ bold: true, color: { argb: C.navy } });
      cell.fill = solid(C.blueSoft);
      cell.border = { top: side(C.blue, 'medium'), bottom: side(C.blue, 'medium'), left: side(), right: side() };
      cell.alignment = { vertical: 'middle', horizontal: c === 2 ? 'left' : 'right', indent: c === 2 ? 1 : 0 };
    }
    ws.autoFilter = { from: { row: itemHeaderRow, column: 1 }, to: { row: lastItem, column: LAST } };

    // ── Tax summary by rate ──
    const rates = Array.from(new Set(d.rows.map(x => x.taxPct || 0))).sort((a, b) => a - b);
    section('TAX SUMMARY BY RATE', 2, 7);
    tableHeader([null, 'Tax Rate', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total Tax']);
    const rng = (col) => `$${col}$${firstItem}:$${col}$${lastItem}`;
    rates.forEach((rate, idx) => {
      r++;
      const n = r;
      const rowsAt = d.rows.filter(x => (x.taxPct || 0) === rate);
      const taxable = rowsAt.reduce((s, x) => s + x.taxable, 0);
      const tax = d.taxMode === 'none' ? 0 : rowsAt.reduce((s, x) => s + x.taxAmt, 0);
      const cells = [
        null, rate,
        fmla(`SUMIF(${rng('J')},B${n},${rng('I')})`, taxable),
        fmla(`SUMIF(${rng('J')},B${n},${rng('K')})`, d.taxMode === 'split' ? tax / 2 : 0),
        fmla(`SUMIF(${rng('J')},B${n},${rng('L')})`, d.taxMode === 'split' ? tax / 2 : 0),
        fmla(`SUMIF(${rng('J')},B${n},${rng('M')})`, d.taxMode === 'igst' ? tax : 0),
        fmla(`D${n}+E${n}+F${n}`, tax)
      ];
      cells.forEach((v, i) => {
        if (i === 0) return;
        const c = ws.getCell(n, i + 1);
        c.value = v;
        styleBodyCell(c, i, idx % 2 === 1, i === 1 ? PCTF : NUMF, i === 1 ? { horizontal: 'left', indent: 1 } : null);
      });
      ws.getRow(n).height = 20;
    });

    // ── Totals ──
    section('TOTALS', 2, 3);
    field('Taxable Value', fmla(`I${totalRow}`, d.subTotal), NUMF);
    const tvRow = r;
    field('CGST', fmla(`K${totalRow}`, d.taxMode === 'split' ? d.totalTax / 2 : 0), NUMF);
    field('SGST', fmla(`L${totalRow}`, d.taxMode === 'split' ? d.totalTax / 2 : 0), NUMF);
    field('IGST', fmla(`M${totalRow}`, d.taxMode === 'igst' ? d.totalTax : 0), NUMF);
    field('Total Tax', fmla(`N${totalRow}`, totalTax), NUMF);
    const taxRow = r;
    const tcs = inv.tdsTcsMode === 'TCS' ? d.tdsTcsAmount : 0;
    const tds = inv.tdsTcsMode === 'TDS' ? d.tdsTcsAmount : 0;
    field('TCS Rate', inv.tdsTcsMode === 'TCS' ? (parseFloat(inv.tdsTcsRate) || 0) : 0, PCTF);
    field('TCS Amount (+)', tcs, NUMF);
    const tcsRow = r;
    field('TDS Rate', inv.tdsTcsMode === 'TDS' ? (parseFloat(inv.tdsTcsRate) || 0) : 0, PCTF);
    field('TDS Amount (−)', tds, NUMF);
    const tdsRow = r;
    field('Round Off', d.adjustments || 0, NUMF);
    const roRow = r;
    field('Total Amount', fmla(`C${tvRow}+C${taxRow}+C${tcsRow}-C${tdsRow}+C${roRow}`, d.grandTotal), NUMF);
    const grandRow = r;
    [2, 3].forEach(col => {
      const c = ws.getCell(grandRow, col);
      c.font = fnt({ size: 11, bold: true, color: { argb: C.white } });
      c.fill = solid(C.blue);
      c.border = box(C.navy);
    });
    ws.getRow(grandRow).height = 22;
    field('Amount Paid', d.paidAmount || 0, NUMF);
    const paidRow = r;
    field('Balance Due', fmla(`MAX(0,C${grandRow}-C${paidRow})`, d.balanceDue), NUMF);
    const balRow = r;
    [2, 3].forEach(col => {
      const c = ws.getCell(balRow, col);
      c.font = fnt({ bold: true, color: { argb: d.balanceDue > 0.005 ? 'FFB91C1C' : 'FF15803D' } });
    });
    section('AMOUNT IN WORDS');
    r++;
    ws.mergeCells(r, 2, r, 8);
    const words = ws.getCell(r, 2);
    words.value = d.amountInWords;
    words.font = fnt({ size: 10.5, bold: true, italic: true, color: { argb: C.navy } });
    words.fill = solid(C.label);
    words.border = box();
    words.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
    ws.getRow(r).height = String(d.amountInWords || '').length > 90 ? 36 : 22;

    // ── Company & bank ──
    section('COMPANY');
    field('Legal Name', d.co.name || d.companyName || '');
    field('Trading Name', d.companyName || '');
    field('GSTIN', d.co.gstin || '');
    field('PAN', d.co.pan || '');
    field('Address', d.co.address ? String(d.co.address).replace(/\s*\n\s*/g, ', ') : '');
    field('State', d.co.state || '');
    field('Phone', d.co.phone ? String(d.co.phone) : '');
    field('Email', d.co.email || '');
    field('Website', d.co.website || '');

    section('BANK DETAILS');
    field('Bank', d.bank.bankName || '');
    field('Account Holder', d.bank.accountHolder || '');
    const acc = field('Account No.', d.bank.accountNo ? String(d.bank.accountNo) : '');
    acc.numFmt = '@';
    field('IFSC', d.bank.ifsc || '');
    field('Branch', d.bank.branch || '');

    // ── Terms ──
    const terms = String(inv.notes || '').split('\n').map(t => t.trim()).filter(Boolean);
    if (terms.length) {
      section('TERMS & CONDITIONS');
      terms.forEach((t, i) => field('Term ' + (i + 1), t));
    }

    ws.pageSetup.printArea = 'A1:O' + r;

    // Named cells for formulas and automation (e.g. =Total_Amount, =Balance_Due)
    const nameCell = (name, row) => {
      try { wb.definedNames.add(`'Details'!$C$${row}`, name); } catch (e) { /* names are optional */ }
    };
    nameCell('Taxable_Value', tvRow);
    nameCell('Total_Tax', taxRow);
    nameCell('Total_Amount', grandRow);
    nameCell('Amount_Paid', paidRow);
    nameCell('Balance_Due', balRow);

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = d.fileBase + '.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 1500);
    return true;
  }

  global.exportSalesInvoiceToPDF = exportSalesInvoiceViaPrint;
  global.printSalesInvoice = exportSalesInvoiceViaPrint;
  global.exportSalesInvoiceToPDFImage = exportSalesInvoiceToPDF;
  global.exportSalesInvoiceToExcel = exportSalesInvoiceToExcel;
})(window);
