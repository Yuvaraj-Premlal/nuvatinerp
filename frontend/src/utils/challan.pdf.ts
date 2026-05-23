import { openPrintWindow, formatDate, formatCurrency } from './pdf.utils';

export function printChallan(dispatch: any, company: any, salesOrder: any) {
  const lines = dispatch.dispatch_lines || [];

  const lineRows = lines.map((line: any, i: number) => `
    <tr>
      <td>${i + 1}</td>
      <td>${line.item?.item_name || line.item_name || ''}</td>
      <td>${line.item?.item_code || ''}</td>
      <td class="right">${line.quantity_dispatched}</td>
      <td>${line.item?.unit_of_measure || 'NOS'}</td>
      <td>${line.remarks || ''}</td>
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
          <div class="doc-title">DELIVERY CHALLAN</div>
          <div class="doc-meta">
            Challan No: <strong>${dispatch.challan_number || dispatch.dispatch_number}</strong><br>
            Date: ${formatDate(dispatch.dispatch_date)}<br>
            ${dispatch.vehicle_number ? `Vehicle: ${dispatch.vehicle_number}<br>` : ''}
            ${dispatch.transporter ? `Transporter: ${dispatch.transporter}` : ''}
          </div>
        </div>
      </div>

      <div class="parties">
        <div class="party-box">
          <div class="party-label">Deliver To</div>
          <div class="party-name">${salesOrder?.customer_name || ''}</div>
          <div class="party-detail">
            ${salesOrder?.delivery_address || ''}<br>
            ${salesOrder?.customer_gstin ? `GSTIN: ${salesOrder.customer_gstin}` : ''}
          </div>
        </div>
        <div class="party-box">
          <div class="party-label">Reference</div>
          <div class="party-detail">
            ${salesOrder?.so_number ? `SO Number: ${salesOrder.so_number}<br>` : ''}
            ${dispatch.eway_bill_number ? `E-Way Bill: ${dispatch.eway_bill_number}<br>` : ''}
            ${salesOrder?.po_number ? `Customer PO: ${salesOrder.po_number}<br>` : ''}
            Dispatch: ${dispatch.dispatch_number}
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:30px">#</th>
            <th>Part Description</th>
            <th>Part Number</th>
            <th class="right">Quantity</th>
            <th>Unit</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>${lineRows}</tbody>
        <tfoot>
          <tr style="background:#f0f7ff">
            <td colspan="3"><strong>Total</strong></td>
            <td class="right"><strong>${lines.reduce((s: number, l: any) => s + (l.quantity_dispatched || 0), 0)}</strong></td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>

      <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:4px;padding:8px 12px;margin-bottom:15px;font-size:10px">
        <strong>Note:</strong> This delivery challan is for the movement of goods only and does not constitute a tax invoice.
        A separate tax invoice will be raised.
      </div>

      <div class="footer">
        <div class="footer-section">
          <div class="footer-label">Driver / Transporter</div>
          <div class="signature-box">
            <div style="font-size:10px;color:#6b7280;margin-bottom:5px">
              Name: _______________________<br>
              License No: __________________<br>
              Vehicle No: ${dispatch.vehicle_number || '__________________'}
            </div>
            <div class="signature-line">Driver Signature</div>
          </div>
        </div>
        <div class="footer-section">
          <div class="footer-label">Received By (Customer)</div>
          <div class="signature-box">
            <div style="font-size:10px;color:#6b7280;margin-bottom:5px">
              Name: _______________________<br>
              Date & Time: _________________<br>
              Seal: ________________________
            </div>
            <div class="signature-line">Authorized Signature & Stamp</div>
          </div>
        </div>
      </div>

      <div style="text-align:center;margin-top:10px;font-size:9px;color:#9ca3af">
        For ${company?.legal_name || 'Alusmith Die Castings Pvt Ltd'} | ${company?.address || ''} | GSTIN: ${company?.gstin || ''}
      </div>
    </div>
  `;

  openPrintWindow(html, `Challan ${dispatch.challan_number || dispatch.dispatch_number}`);
}
