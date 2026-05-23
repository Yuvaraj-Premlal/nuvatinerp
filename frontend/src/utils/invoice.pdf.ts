import { openPrintWindow, numberToWords, formatDate, formatCurrency } from './pdf.utils';

export function printInvoice(invoice: any, company: any) {
  const lines = invoice.lines || [];
  const isInterState = invoice.igst_amount > 0;

  const lineRows = lines.map((line: any, i: number) => `
    <tr>
      <td>${i + 1}</td>
      <td>${line.item_name}<br><span style="font-size:9px;color:#6b7280">${line.hsn_code || ''}</span></td>
      <td class="right">${line.quantity}</td>
      <td class="right">${formatCurrency(line.unit_price)}</td>
      <td class="right">${formatCurrency(line.amount)}</td>
      ${isInterState
        ? `<td class="right">${line.igst_rate || 0}%<br>${formatCurrency(line.igst_amount)}</td>`
        : `<td class="right">${line.cgst_rate || 0}%<br>${formatCurrency(line.cgst_amount)}</td>
           <td class="right">${line.sgst_rate || 0}%<br>${formatCurrency(line.sgst_amount)}</td>`
      }
      <td class="right"><strong>${formatCurrency(line.total_amount)}</strong></td>
    </tr>
  `).join('');

  const gstHeaders = isInterState
    ? `<th class="right">IGST</th>`
    : `<th class="right">CGST</th><th class="right">SGST</th>`;

  const statusBadge = invoice.status === 'paid'
    ? '<span class="badge badge-green">PAID</span>'
    : invoice.status === 'overdue'
    ? '<span class="badge badge-red">OVERDUE</span>'
    : '<span class="badge badge-blue">UNPAID</span>';

  const html = `
    <div class="page">
      <div class="header">
        <div>
          <div class="company-name">${company?.legal_name || 'Alusmith Die Castings Pvt Ltd'}</div>
          <div class="company-details">
            ${company?.address || ''}, ${company?.city || ''}, ${company?.state || ''} - ${company?.pincode || ''}<br>
            GSTIN: ${company?.gstin || 'N/A'} | ${company?.phone || ''} | ${company?.email || ''}
          </div>
        </div>
        <div>
          <div class="doc-title">TAX INVOICE ${statusBadge}</div>
          <div class="doc-meta">
            Invoice No: <strong>${invoice.invoice_number}</strong><br>
            Date: ${formatDate(invoice.invoice_date)}<br>
            ${invoice.due_date ? `Due Date: ${formatDate(invoice.due_date)}<br>` : ''}
            ${invoice.payment_terms ? `Terms: ${invoice.payment_terms}` : ''}
          </div>
        </div>
      </div>

      <div class="parties">
        <div class="party-box">
          <div class="party-label">Bill To</div>
          <div class="party-name">${invoice.customer_name}</div>
          <div class="party-detail">
            ${invoice.customer_gstin ? `GSTIN: ${invoice.customer_gstin}` : 'GSTIN: N/A'}
          </div>
        </div>
        <div class="party-box">
          <div class="party-label">Supply Details</div>
          <div class="party-detail">
            Place of Supply: ${company?.state || 'Puducherry'}<br>
            State Code: ${company?.state_code || '34'}<br>
            Type: ${isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:30px">#</th>
            <th>Description / HSN</th>
            <th class="right">Qty</th>
            <th class="right">Rate</th>
            <th class="right">Amount</th>
            ${gstHeaders}
            <th class="right">Total</th>
          </tr>
        </thead>
        <tbody>${lineRows}</tbody>
      </table>

      <div class="totals">
        <div class="totals-box">
          <div class="totals-row"><span>Subtotal</span><span>${formatCurrency(invoice.subtotal)}</span></div>
          ${invoice.cgst_amount > 0 ? `<div class="totals-row"><span>CGST</span><span>${formatCurrency(invoice.cgst_amount)}</span></div>` : ''}
          ${invoice.sgst_amount > 0 ? `<div class="totals-row"><span>SGST</span><span>${formatCurrency(invoice.sgst_amount)}</span></div>` : ''}
          ${invoice.igst_amount > 0 ? `<div class="totals-row"><span>IGST</span><span>${formatCurrency(invoice.igst_amount)}</span></div>` : ''}
          ${invoice.amount_paid > 0 ? `<div class="totals-row"><span>Amount Paid</span><span style="color:#16a34a">${formatCurrency(invoice.amount_paid)}</span></div>` : ''}
          <div class="totals-row total">
            <span>${invoice.amount_paid > 0 ? 'Balance Due' : 'Total Amount'}</span>
            <span>${formatCurrency(invoice.total_amount - invoice.amount_paid)}</span>
          </div>
        </div>
      </div>

      <div class="amount-words">
        <div class="amount-words-label">Amount in Words</div>
        ${numberToWords(Math.round(invoice.total_amount))}
      </div>

      <div class="footer">
        <div class="footer-section">
          <div class="footer-label">Bank Details</div>
          <div class="signature-box">
            ${company?.bank_details || 'Bank: HDFC Bank<br>Account: XXXX1234<br>IFSC: HDFC0001234'}
          </div>
          <div style="margin-top:8px;font-size:10px;color:#6b7280">
            This is a computer generated invoice.<br>
            Subject to ${company?.city || 'Puducherry'} jurisdiction.
          </div>
        </div>
        <div class="footer-section" style="text-align:right">
          <div class="footer-label">For ${company?.legal_name || 'Alusmith Die Castings Pvt Ltd'}</div>
          <div class="signature-box">
            <div class="signature-line">Authorized Signatory</div>
          </div>
          ${company?.signature_text ? `<div style="margin-top:6px;font-size:10px;color:#6b7280">${company.signature_text}</div>` : ''}
        </div>
      </div>
    </div>
  `;

  openPrintWindow(html, `Invoice ${invoice.invoice_number}`);
}
