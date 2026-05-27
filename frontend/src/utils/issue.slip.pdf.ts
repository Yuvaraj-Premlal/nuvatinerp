import { openPrintWindow, formatDate } from './pdf.utils';

export function printIssueSlip(issue: any) {
  const company = issue.company;
  const item = issue.item;
  const jobCard = issue.job_card;
  const lines = issue.lines || [];
  const isMultiBatch = lines.length > 1;

  const batchRows = lines.map((line: any, i: number) => `
    <tr>
      <td>${i + 1}</td>
      <td>${line.batch_number || '—'}</td>
      <td style="text-align:right"><strong>${line.issued_qty}</strong> ${item?.unit_of_measure || ''}</td>
    </tr>
  `).join('');

  const html = `
    <div class="page">
      <div class="header">
        <div>
          <div class="company-name">${company?.legal_name || 'Alusmith Die Castings Pvt Ltd'}</div>
          <div class="company-details">
            ${company?.address || ''}, ${company?.city || ''}, ${company?.state || ''}<br>
            GSTIN: ${company?.gstin || 'N/A'}
          </div>
        </div>
        <div>
          <div class="doc-title">MATERIAL ISSUE SLIP</div>
          <div class="doc-meta">
            Slip No: <strong>${issue.slip_number}</strong><br>
            Date: ${formatDate(issue.issued_at || new Date())}<br>
            Issued By: <strong>${issue.issued_by || '—'}</strong>
          </div>
        </div>
      </div>

      <div class="parties">
        <div class="party-box">
          <div class="party-label">Issued Against</div>
          <div class="party-name">Job Card: ${jobCard?.job_number || '—'}</div>
          <div class="party-detail">
            Part: ${jobCard?.part_name || '—'}<br>
            Planned Date: ${jobCard?.planned_date ? formatDate(jobCard.planned_date) : '—'}<br>
            Shift: ${jobCard?.shift || '—'}
          </div>
        </div>
        <div class="party-box">
          <div class="party-label">Material</div>
          <div class="party-name">${item?.item_name || '—'}</div>
          <div class="party-detail">
            Code: ${item?.item_code || '—'}<br>
            Planned Qty: ${issue.planned_qty || '—'} ${item?.unit_of_measure || ''}<br>
            Total Issued: <strong>${issue.total_issued_qty || issue.issued_qty} ${item?.unit_of_measure || ''}</strong>
          </div>
        </div>
      </div>

      ${isMultiBatch ? `
      <table>
        <thead>
          <tr>
            <th style="width:40px">#</th>
            <th>Batch Number</th>
            <th style="text-align:right">Issued Qty</th>
          </tr>
        </thead>
        <tbody>${batchRows}</tbody>
        <tfoot>
          <tr style="background:#f0f7ff">
            <td colspan="2"><strong>Total</strong></td>
            <td style="text-align:right"><strong>${issue.total_issued_qty || issue.issued_qty} ${item?.unit_of_measure || ''}</strong></td>
          </tr>
        </tfoot>
      </table>
      ` : `
      <table>
        <thead>
          <tr>
            <th style="width:30px">#</th>
            <th>Item Description</th>
            <th>Item Code</th>
            <th>Unit</th>
            <th style="text-align:right">Planned Qty</th>
            <th style="text-align:right">Issued Qty</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>${item?.item_name || '—'}</td>
            <td>${item?.item_code || '—'}</td>
            <td>${item?.unit_of_measure || '—'}</td>
            <td style="text-align:right">${issue.planned_qty || '—'}</td>
            <td style="text-align:right"><strong>${issue.total_issued_qty || issue.issued_qty}</strong></td>
          </tr>
        </tbody>
      </table>
      `}

      <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:4px;padding:8px 12px;margin:15px 0;font-size:10px">
        <strong>Note:</strong> Material issued against Job Card ${jobCard?.job_number || '—'}.
        Any excess material must be returned to stores immediately after production.
      </div>

      <div class="footer">
        <div class="footer-section">
          <div class="footer-label">Issued By (Storekeeper)</div>
          <div class="signature-box"><div class="signature-line">Signature & Date</div></div>
        </div>
        <div class="footer-section">
          <div class="footer-label">Received By (Operator)</div>
          <div class="signature-box"><div class="signature-line">Signature & Date</div></div>
        </div>
        <div class="footer-section">
          <div class="footer-label">Verified By (Supervisor)</div>
          <div class="signature-box"><div class="signature-line">Signature & Date</div></div>
        </div>
      </div>
    </div>
  `;

  openPrintWindow(html, `Issue Slip ${issue.slip_number}`);
}
