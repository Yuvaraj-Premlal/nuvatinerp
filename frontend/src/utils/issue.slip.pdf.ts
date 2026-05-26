import { openPrintWindow, formatDate, formatCurrency } from './pdf.utils';

export function printIssueSlip(issue: any) {
  const company = issue.company;
  const item = issue.item;
  const jobCard = issue.job_card;

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
            Status: ${jobCard?.status || '—'}<br>
            Planned Date: ${jobCard?.planned_date ? formatDate(jobCard.planned_date) : '—'}<br>
            Shift: ${jobCard?.shift || '—'}
          </div>
        </div>
        <div class="party-box">
          <div class="party-label">Issue Details</div>
          <div class="party-detail">
            Issued By: ${issue.issued_by || '—'}<br>
            Date: ${formatDate(issue.issued_at || new Date())}
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:30px">#</th>
            <th>Item Description</th>
            <th>Item Code</th>
            <th>Unit</th>
            <th class="right">Planned Qty</th>
            <th class="right">Issued Qty</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>${item?.item_name || '—'}</td>
            <td>${item?.item_code || '—'}</td>
            <td>${item?.unit_of_measure || '—'}</td>
            <td class="right">${issue.planned_qty || '—'}</td>
            <td class="right"><strong>${issue.issued_qty}</strong></td>
          </tr>
        </tbody>
      </table>

      <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:4px;padding:8px 12px;margin:15px 0;font-size:10px">
        <strong>Note:</strong> Material issued against Job Card ${jobCard?.job_number || '—'}. 
        Any excess material must be returned to stores immediately after production.
      </div>

      <div class="footer">
        <div class="footer-section">
          <div class="footer-label">Issued By (Storekeeper)</div>
          <div class="signature-box">
            <div class="signature-line">Signature & Date</div>
          </div>
        </div>
        <div class="footer-section">
          <div class="footer-label">Received By (Operator)</div>
          <div class="signature-box">
            <div class="signature-line">Signature & Date</div>
          </div>
        </div>
        <div class="footer-section">
          <div class="footer-label">Verified By (Supervisor)</div>
          <div class="signature-box">
            <div class="signature-line">Signature & Date</div>
          </div>
        </div>
      </div>
    </div>
  `;

  openPrintWindow(html, `Issue Slip ${issue.slip_number}`);
}
