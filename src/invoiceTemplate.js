const COMPANY = {
  name: 'Five Star Carpet Cleaning Services LTD',
  address: '8 Kirkwall Spur, SL1 3XY, Slough',
  phone: '+44 7871 062227',
  whatsapp: '+44 7871 062227',
  email: 'fivestarservicesltduk@gmail.com',
  website: 'https://fivestarcarpetcleaning.co.uk',
};

const BANK = {
  accountName: 'FIVE STAR CARPET CLEANING SERVICES LTD',
  sortCode: '20-03-84',
  accountNumber: '03651835',
  bank: 'Barclays',
  type: 'Business Account',
};

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? '');
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
}

function escapeHtml(unsafe) {
  return String(unsafe ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function buildInvoiceMeta() {
  const now = new Date();
  const invoiceNo = `FS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(
    2,
    '0'
  )}`;
  return { createdAt: now, invoiceNo };
}

export function buildInvoiceText({ meta, form }) {
  const statusText = form.paymentStatus === 'PAID' ? 'Paid' : 'Unpaid';
  const lines = [
    COMPANY.name,
    COMPANY.address,
    `Phone: ${COMPANY.phone}`,
    `WhatsApp: ${COMPANY.whatsapp}`,
    `Email: ${COMPANY.email}`,
    `Website: ${COMPANY.website}`,
    '',
    `Invoice No: ${meta.invoiceNo}`,
    `Date: ${meta.createdAt.toLocaleDateString('en-GB')}`,
    `Payment Status: ${statusText}`,
    '',
    'Customer Details',
    `Customer Name: ${form.customerName}`,
    `Address: ${form.customerAddress}`,
    `Post Code: ${form.postCode}`,
    `Job Description: ${form.jobDescription}`,
    `Phone Number: ${form.customerPhone}`,
    form.notes ? `Other Note: ${form.notes}` : null,
    '',
    `Total: ${money(form.totalAmount)}`,
    '',
    'Bank Details',
    `Account Name: ${BANK.accountName}`,
    `Sort code : ${BANK.sortCode}`,
    `Account number: ${BANK.accountNumber}`,
    `Bank : ${BANK.bank}`,
    BANK.type ? BANK.type : null,
    '',
    'Special Offer:',
    'Congratulations! You are eligible for a 20% discount on your next booking at this address. To redeem, simply present this invoice when making your payment for the next job. We look forward to working with you again!',
  ].filter(Boolean);

  return lines.join('\n');
}

export function buildInvoiceHtml({ meta, form }) {
  const total = money(form.totalAmount);
  const date = meta.createdAt.toLocaleDateString('en-GB');
  const statusText = form.paymentStatus === 'PAID' ? 'PAID' : 'UNPAID';
  const stampClass = statusText === 'PAID' ? 'stampPaid' : 'stampUnpaid';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 24px; color: #111827; }
      .card { position: relative; overflow: hidden; border: 1px solid #E5E7EB; border-radius: 14px; padding: 18px; }
      .row { display: flex; justify-content: space-between; gap: 16px; }
      .title { font-size: 18px; font-weight: 800; letter-spacing: .2px; }
      .muted { color: #6B7280; font-size: 12px; line-height: 1.35; }
      .divider { height: 1px; background: #E5E7EB; margin: 14px 0; }
      .sectionTitle { font-weight: 700; font-size: 13px; margin: 0 0 8px; color: #111827; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; }
      .field { padding: 10px 12px; border: 1px solid #EEF2F7; background: #FAFBFF; border-radius: 12px; }
      .label { font-size: 11px; color: #6B7280; margin-bottom: 4px; }
      .value { font-size: 13px; font-weight: 600; color: #111827; word-break: break-word; }
      .totalBox { background: #0F172A; color: white; border-radius: 14px; padding: 14px; }
      .totalLabel { font-size: 12px; opacity: .9; margin-bottom: 6px; }
      .totalValue { font-size: 22px; font-weight: 900; }
      .status { display: inline-block; padding: 6px 10px; border-radius: 999px; font-size: 11px; font-weight: 900; }
      .paid { background: #ECFDF5; color: #065F46; border: 1px solid #10B981; }
      .unpaid { background: #FEF2F2; color: #991B1B; border: 1px solid #EF4444; }
      .bank { border: 1px dashed #CBD5E1; border-radius: 14px; padding: 12px; background: #F8FAFC; }
      .promo { border: 1px solid #FCD34D; border-radius: 14px; padding: 14px; background: #FFFBEB; margin-top: 14px; }
      .promoTitle { font-weight: 800; font-size: 13px; color: #92400E; margin-bottom: 8px; }
      .promoText { font-size: 12px; color: #78350F; line-height: 1.6; }
      .stamp {
        position: absolute;
        top: 18px;
        left: -48px;
        transform: rotate(-18deg);
        font-weight: 900;
        font-size: 44px;
        letter-spacing: 3px;
        padding: 10px 18px;
        border-radius: 16px;
        opacity: 0.18;
        user-select: none;
        pointer-events: none;
      }
      .stampPaid { color: #065F46; border: 5px solid #10B981; background: rgba(236, 253, 245, 0.65); }
      .stampUnpaid { color: #991B1B; border: 5px solid #EF4444; background: rgba(254, 242, 242, 0.65); }
      .foot { margin-top: 14px; font-size: 11px; color: #6B7280; text-align: center; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="stamp ${stampClass}">${escapeHtml(statusText)}</div>
      <div class="row">
        <div>
          <div class="title">${escapeHtml(COMPANY.name)}</div>
          <div class="muted">
            ${escapeHtml(COMPANY.address)}<br/>
            Phone: ${escapeHtml(COMPANY.phone)}<br/>
            WhatsApp: ${escapeHtml(COMPANY.whatsapp)}<br/>
            Email: ${escapeHtml(COMPANY.email)}<br/>
            Website: ${escapeHtml(COMPANY.website)}
          </div>
        </div>
        <div style="text-align:right;">
          <div class="muted">Invoice No</div>
          <div style="font-weight:800;">${escapeHtml(meta.invoiceNo)}</div>
          <div class="muted" style="margin-top:8px;">Date</div>
          <div style="font-weight:700;">${escapeHtml(date)}</div>
          <div class="muted" style="margin-top:8px;">Payment Status</div>
          <div class="status ${statusText === 'PAID' ? 'paid' : 'unpaid'}">${escapeHtml(statusText)}</div>
        </div>
      </div>

      <div class="divider"></div>

      <div class="sectionTitle">Customer Details</div>
      <div class="grid">
        <div class="field">
          <div class="label">Customer Name</div>
          <div class="value">${escapeHtml(form.customerName)}</div>
        </div>
        <div class="field">
          <div class="label">Address</div>
          <div class="value">${escapeHtml(form.customerAddress)}</div>
        </div>
        <div class="field">
          <div class="label">Post Code</div>
          <div class="value">${escapeHtml(form.postCode)}</div>
        </div>
        <div class="field">
          <div class="label">Job Description</div>
          <div class="value">${escapeHtml(form.jobDescription)}</div>
        </div>
        <div class="field">
          <div class="label">Phone Number</div>
          <div class="value">${escapeHtml(form.customerPhone)}</div>
        </div>
        <div class="field">
          <div class="label">Other Note</div>
          <div class="value">${escapeHtml(form.notes || '—')}</div>
        </div>
      </div>

      <div class="divider"></div>

      <div class="totalBox">
        <div class="totalLabel">Total Bill Amount</div>
        <div class="totalValue">${escapeHtml(total)}</div>
      </div>

      <div class="divider"></div>

      <div class="sectionTitle">Bank Details</div>
      <div class="bank">
        <div class="muted">
          Account Name: <b>${escapeHtml(BANK.accountName)}</b><br/>
          Sort code : <b>${escapeHtml(BANK.sortCode)}</b><br/>
          Account number: <b>${escapeHtml(BANK.accountNumber)}</b><br/>
          Bank : <b>${escapeHtml(BANK.bank)}</b><br/>
          <b>${escapeHtml(BANK.type)}</b>
        </div>
      </div>

      <div class="promo">
        <div class="promoTitle">Special Offer</div>
        <div class="promoText">
          Congratulations! You are eligible for a 20% discount on your next booking at this address. To redeem, simply present this invoice when making your payment for the next job. We look forward to working with you again!
        </div>
      </div>

      <div class="foot"></div>
    </div>
  </body>
</html>`;
}

