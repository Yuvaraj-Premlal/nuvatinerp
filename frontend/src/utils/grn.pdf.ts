import { openPrintWindow, formatDate, formatCurrency, numberToWords } from './pdf.utils';

export function printGRN(grn: any, company: any) {
  const lines = grn.grn_lines || [];
  const subtotal = lines.reduce((s: number, l: any) => s + (l.accepted_qty || l.quantity_received) * (l.unit_price || 0), 0);

  const lineRows = lines.map((line: any, i: number) => `
    <tr>
      <td>${i + 1}</td>
      <td>${line.item?.item_name || ''}<br><span style="font-size:9px;color:#6b7280">${line.item?.item_code || ''}</span></td>
      <td>${line.item?.unit_of_measure || ''}</td>
      <td class="right">${line.quantity_received}</td>
      <td class="right" style="color:#16a34a">${line.accepted_qty || line.quantity_received}</td>
      <td class="right" style="color:${line.rejected_qty > 0 ? '#dc2626' : '#6b7280'}">${line.rejected_qty || 0}</td>
      <td class="right">${formatCurrency(line.unit_price || 0)}</td>
      <td class="right">${formatCurrency((line.accepted_qty || line.quantity_received) * (line.unit_price || 0))}</td>
      ${line.rejection_reason ? `<td style="font-size:9px;color:#dc2626">${line.rejection_reason}</td>` : '<td>—</td>'}
    </tr>
  `).join('');

  const html = `
    <div class="page">
      <div class="header">
        <div>
          <div class="company-name">${company?.legal_name || 'Alusmith Die Castings Pvt Ltd'}</div>
          <div class="company-details">
            ${company?.address || ''}, ${company?.city || ''}, ${company?.state || ''} - ${company?.pincode || ''}<br>
            GSTIN: ${company?.gstin || 'N/A'}
          </div>
        </div>
        <div>
          <div class="doc-title">GOODS RECEIPT NOTE</div>
          <div class="doc-meta">
            GRN Number: <strong>${grn.grn_number}</strong><br>
            Date: ${formatDate(grn.received_date)}<br>
            PO Number: <strong>${grn.po?.po_number || '—'}</strong><br>
            ${grn.is_reversed ? '<span style="color:#dc2626;font-weight:bold">REVERSED</span>' : ''}
          </div>
        </div>
      </div>

      <div class="parties">
        <div class="party-box">
          <div class="party-label">Supplier</div>
          <div class="party-name">${grn.po?.supplier?.supplier_name || ''}</div>
          <div class="party-detail">${grn.po?.supplier?.address || ''}<br>${grn.po?.supplier?.gstin ? `GSTIN: ${grn.po.supplier.gstin}` : ''}</div>
        </div>
        <div class="party-box">
          <div class="party-label">Delivery Details</div>
          <div class="party-detail">
            Vehicle: ${grn.vehicle_number || '—'}<br>
            Received By: ${grn.received_by || '—'}<br>
            DC Number: ${grn.supplier_dc_number || '—'}
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th><th>Item</th><th>Unit</th>
            <th class="right">Received</th>
            <th class="right" style="color:#16a34a">Accepted</th>
            <th class="right" style="color:#dc2626">Rejected</th>
            <th class="right">Unit Price</th>
            <th class="right">Amount</th>
            <th>Rejection Reason</th>
          </tr>
        </thead>
        <tbody>${lineRows}</tbody>
        <tfoot>
          <tr style="background:#f0f7ff">
            <td colspan="7"><strong>Total</strong></td>
            <td class="right"><strong>${formatCurrency(subtotal)}</strong></td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      <div class="amount-words">
        <div class="amount-words-label">Amount in Words</div>
        ${numberToWords(Math.round(subtotal))}
      </div>

      <div class="footer">
        <div class="footer-section">
          <div class="footer-label">Store Keeper</div>
          <div class="signature-box"><div class="signature-line">Signature & Date</div></div>
        </div>
        <div class="footer-section">
          <div class="footer-label">Quality Inspector</div>
          <div class="signature-box"><div class="signature-line">Signature & Date</div></div>
        </div>
        <div class="footer-section" style="text-align:right">
          <div class="footer-label">For ${company?.legal_name || ''}</div>
          <div class="signature-box"><div class="signature-line">Authorized Signatory</div></div>
        </div>
      </div>
    </div>
  `;

  openPrintWindow(html, `GRN ${grn.grn_number}`);
}
