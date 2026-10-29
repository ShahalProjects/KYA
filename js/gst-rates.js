/**
 * js/gst-rates.js
 * GST rates as per law, with the dates they apply, for the Tax of voucher rows (Sales and
 * Purchase forms) and the GST Rate of Master Desk's Stock Items and Service ledgers.
 *  - Goods: Notification 9/2025–Central Tax (Rate), from 22-09-2025 in place of 1/2017:
 *    Schedule I 5%, II 18%, III 40%, IV 3%, V 0.25%, VI 1.5%, VII 28%. Schedule VII was
 *    omitted from 01-02-2026 by Notification 19/2025 (tobacco and pan masala moved to 40%).
 *    12% ended with GST 2.0 on 22-09-2025.
 *  - 0.1%: goods supplied to merchant exporters (Notification 40/2017–Central Tax (Rate)).
 * A voucher row is offered the rates in force on the voucher's date (sales-select-boxes.js);
 * a rate a row or item already has is always kept.
 */
(function() {
  'use strict';

  // `from` / `until`: the first and last day a rate applies (ISO dates); none = no limit.
  // `what` also feeds the Tax list's search ("gold" finds 3%); `law` / `example` record each
  // rate's legal basis.
  const KYA_GST_RATES = [
    {
      rate: 0, name: 'Nil / Exempt',
      what: `No GST is charged. Covers nil-rated and exempt supplies, such as fresh fruit and vegetables, unpacked food grains and fresh milk, and services like healthcare and education. Since 22-09-2025 individual life and health insurance are exempt too.`,
      law: `Section 11, CGST Act 2017 (exemptions). Goods: Notification 10/2025–Central Tax (Rate), in place of 2/2017 from 22-09-2025. Services: Notification 12/2017–Central Tax (Rate), as amended.`,
      example: `A Kochi grocer sells fresh vegetables worth ₹2,000. The invoice shows 0% GST.`
    },
    {
      rate: 0.1, name: 'Merchant exporters',
      what: `Concessional rate on goods sold to a registered merchant exporter, who must export them within 90 days of the invoice: 0.05% CGST + 0.05% SGST, or 0.1% IGST.`,
      law: `Notification 40/2017–Central Tax (Rate) and 41/2017–Integrated Tax (Rate), 23-10-2017. The exporter must be registered with an Export Promotion Council or a Commodity Board.`,
      example: `A Tiruppur mill sells T-shirts worth ₹10,00,000 to a merchant exporter who ships them to Dubai within 90 days. GST: ₹1,000.`
    },
    {
      rate: 0.25, name: 'Rough precious stones',
      what: `Rough (unworked) diamonds and other precious or semi-precious stones.`,
      law: `Schedule V, Notification 9/2025–Central Tax (Rate), from 22-09-2025; earlier Notification 1/2017–Central Tax (Rate).`,
      example: `A Surat trader sells rough diamonds worth ₹5,00,000 to a cutting unit. GST: ₹1,250.`
    },
    {
      rate: 1.5, name: 'Cut & polished diamonds',
      what: `Cut and polished diamonds. The rate rose from 0.25% on 18-07-2022 (47th GST Council) to end the build-up of input tax credit in the trade.`,
      law: `Schedule VI, Notification 9/2025–Central Tax (Rate), from 22-09-2025; earlier Notification 1/2017–Central Tax (Rate) as amended from 18-07-2022.`,
      example: `A Mumbai diamond house sells cut and polished diamonds worth ₹10,00,000 to a jeweller. GST: ₹15,000.`
    },
    {
      rate: 3, name: 'Gold, silver & jewellery',
      what: `Gold, silver and platinum, and jewellery made of them, including diamond-studded jewellery. GST 2.0 left this rate unchanged.`,
      law: `Schedule IV, Notification 9/2025–Central Tax (Rate), from 22-09-2025; earlier Notification 1/2017–Central Tax (Rate).`,
      example: `A Thrissur jeweller sells a gold necklace for ₹2,00,000. GST: ₹6,000 (1.5% CGST + 1.5% SGST).`
    },
    {
      rate: 5, name: 'Merit rate',
      what: `The lower rate for everyday goods and services. With GST 2.0 most items at 12%, and many at 18%, moved here: e.g. butter, ghee, cheese and namkeen, soap, shampoo and toothpaste, most medicines, and hotel rooms up to ₹7,500 a night (without input tax credit).`,
      law: `Schedule I, Notification 9/2025–Central Tax (Rate), for goods; services under Notification 11/2017–Central Tax (Rate) as amended from 22-09-2025.`,
      example: `A Kochi supermarket sells ghee worth ₹1,000. GST: ₹50 (2.5% CGST + 2.5% SGST).`
    },
    {
      rate: 12, name: 'Old rate (until 21-09-2025)', until: '2025-09-21',
      what: `A standard rate for many processed foods and goods until GST 2.0. It ended on 22-09-2025, when almost all of these items moved to 5% (a few to 18%).`,
      law: `Schedule II, Notification 1/2017–Central Tax (Rate), up to 21-09-2025; replaced by Notification 9/2025–Central Tax (Rate).`,
      example: `An invoice dated 10-09-2025 for butter worth ₹1,000 charged 12% GST (₹120).`
    },
    {
      rate: 18, name: 'Standard rate',
      what: `The standard rate for most goods and services, e.g. electronics, industrial goods, and services such as software, consultancy and repairs. With GST 2.0, ACs, TVs above 32 inches and cement moved here from 28%.`,
      law: `Schedule II, Notification 9/2025–Central Tax (Rate), for goods; most services under Notification 11/2017–Central Tax (Rate).`,
      example: `A Kochi IT firm bills a local client ₹1,00,000 for software work. GST: ₹18,000 (9% CGST + 9% SGST).`
    },
    {
      rate: 28, name: 'Old demerit rate (until 31-01-2026)', until: '2026-01-31',
      what: `The top rate before GST 2.0 (cars, ACs, cement and others). From 22-09-2025 it was kept only for tobacco products and pan masala, with compensation cess, until 31-01-2026.`,
      law: `Schedule IV, Notification 1/2017–Central Tax (Rate), up to 21-09-2025; then Schedule VII, Notification 9/2025, omitted from 01-02-2026 by Notification 19/2025–Central Tax (Rate).`,
      example: `A cigarette distributor's invoice dated 15-01-2026 charged 28% GST plus compensation cess.`
    },
    {
      rate: 40, name: 'Demerit rate', from: '2025-09-22',
      what: `The rate for luxury and sin goods and services, e.g. pan masala, cigarettes and other tobacco products (from 01-02-2026), sugary aerated and caffeinated drinks, mid-size and large cars, motorcycles above 350 cc, yachts and private aircraft, and betting, casinos and lottery.`,
      law: `Schedule III, Notification 9/2025–Central Tax (Rate), from 22-09-2025; tobacco and pan masala added from 01-02-2026 by Notification 19/2025–Central Tax (Rate), when compensation cess ended.`,
      example: `A dealer sells a large SUV for ₹20,00,000. GST: ₹8,00,000 (20% CGST + 20% SGST).`
    }
  ];

  function todayIso() {
    if (typeof kyaLocalIso === 'function') return kyaLocalIso(new Date());
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function isInForce(entry, isoDate) {
    const d = isoDate || todayIso();
    return (!entry.from || d >= entry.from) && (!entry.until || d <= entry.until);
  }

  // The rates in force on a date (today when none is given)
  function gstRatesOn(isoDate) {
    return KYA_GST_RATES.filter(e => isInForce(e, isoDate)).map(e => e.rate);
  }

  // What a rate is as per law (null for a rate that isn't in the table)
  function gstRateInfo(rate) {
    const r = Number(rate);
    return KYA_GST_RATES.find(e => e.rate === r) || null;
  }

  function isGstRateInForce(rate, isoDate) {
    const e = gstRateInfo(rate);
    return !!e && isInForce(e, isoDate);
  }

  // The <option>s of a Tax / GST Rate box, with `selected` picked (18% when none).
  // opts.today: only today's rates (Master Desk) — otherwise every rate, as a voucher row may
  // hold any of them and its list offers the ones in force on the voucher date.
  // opts.label(rate): the option text (default "18%"). A rate not in the list is added.
  function gstRateOptionsHtml(selected, opts) {
    const o = opts || {};
    const none = selected === undefined || selected === null || selected === '' || isNaN(Number(selected));
    const sel = none ? 18 : Number(selected);
    let rates = o.today ? gstRatesOn(todayIso()) : KYA_GST_RATES.map(e => e.rate);
    if (rates.indexOf(sel) < 0) rates = rates.concat([sel]).sort((a, b) => a - b);
    const label = typeof o.label === 'function' ? o.label : (r => `${r}%`);
    return rates.map(r => `<option value="${r}"${r === sel ? ' selected' : ''}>${label(r)}</option>`).join('');
  }

  window.KYA_GST_RATES = KYA_GST_RATES;
  window.kyaGstRatesOn = gstRatesOn;
  window.kyaGstRateInfo = gstRateInfo;
  window.kyaIsGstRateInForce = isGstRateInForce;
  window.kyaGstRateOptionsHtml = gstRateOptionsHtml;
})();
