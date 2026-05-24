import { openPrintWindow, formatDate, formatCurrency, numberToWords } from './pdf.utils';

export function printPO(po: any, company: any) {
  const lines = po.po_lines || [];

  const lineRows = lines.map((line: any, i: number) => `
    <tr>
      <td>${i + 1}</td>
      <td>${line.item?.item_name || line.item_name || ''}<br>
        <span style="font-size:9px;color:#6b7280">${line.item?.item_code || ''}</span>
      </td>
      <td>${line.item?.unit_of_measure || 'KG'}</td>
      <td class="right">${line.quantity_ordered}</td>
      <td class="right">${formatCurrency(line.unit_price)}</td>
      <td class="right">${formatCurrency(line.quantity_ordered * line.unit_price)}</td>
    </tr>
  `).join('');

  const total = lines.reduce((s: number, l: any) => s + l.quantity_ordered * l.unit_price, 0);

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
          <div class="doc-title">PURCHASE ORDER</div>
          <div class="doc-meta">
            PO Number: <strong>${po.po_number}</strong><br>
            Date: ${formatDate(po.po_date)}<br>
            ${po.expected_delivery_date ? `Expected Delivery: ${formatDate(po.expected_delivery_date)}<br>` : ''}
            Status: <strong style="color:${po.status === 'approved' ? '#16a34a' : '#d97706'}">${po.status?.toUpperCase()}</strong>
          </div>
        </div>
      </div>

      <div class="parties">
        <div class="party-box">
          <div class="party-label">Vendor / Supplier</div>
          <div class="party-name">${po.supplier?.supplier_name || ''}</div>
          <div class="party-detail">
            ${po.supplier?.address || ''}<br>
            ${po.supplier?.gstin ? `GSTIN: ${po.supplier.gstin}` : ''}
          </div>
        </div>
        <div class="party-box">
          <div class="party-label">Deliver To</div>
          <div class="party-detail">
            ${company?.legal_name || ''}<br>
            ${company?.address || ''}<br>
            ${company?.city || ''}, ${company?.state || ''} - ${company?.pincode || ''}<br>
            GSTIN: ${company?.gstin || ''}
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:30px">#</th>
            <th>Item Description</th>
            <th>Unit</th>
            <th class="right">Quantity</th>
            <th class="right">Unit Price</th>
            <th class="right">Amount</th>
          </tr>
        </thead>
        <tbody>${lineRows}</tbody>
        <tfoot>
          <tr style="background:#f0f7ff">
            <td colspan="5"><strong>Total</strong></td>
            <td class="right"><strong>${formatCurrency(total)}</strong></td>
          </tr>
        </tfoot>
      </table>

      <div class="amount-words">
        <div class="amount-words-label">Amount in Words</div>
        ${numberToWords(Math.round(total))}
      </div>

      <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:4px;padding:8px 12px;margin-bottom:15px;font-size:10px">
        <strong>Terms:</strong> Payment as per agreed terms. GST extra as applicable. Subject to ${company?.city || 'Puducherry'} jurisdiction.
      </div>

      <div class="footer">
        <div class="footer-section">
          <div class="footer-label">Supplier Acceptance</div>
          <div class="signature-box">
            <div class="signature-line">Authorized Signatory (Supplier)</div>
          </div>
        </div>
        <div class="footer-section" style="text-align:right">
          <div class="footer-label">For ${company?.legal_name || ''}</div>
          <div class="signature-box">
            <div class="signature-line">Authorized Signatory</div>
          </div>
        </div>
      </div>
    </div>
  `;

  openPrintWindow(html, `PO ${po.po_number}`);
}
