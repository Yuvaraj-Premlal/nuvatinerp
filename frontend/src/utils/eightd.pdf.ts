import { openPrintWindow, formatDate } from './pdf.utils';

export function print8D(complaint: any, company: any) {
  const actions = complaint.actions || [];

  const stepRows = actions.map((action: any) => `
    <div class="step-box">
      <div class="step-header">
        <div class="step-number ${action.status === 'completed' ? 'done' : ''}">${action.step_number}</div>
        <div>
          <div class="step-title">${action.action_type} — ${getStepTitle(action.action_type)}</div>
          <div style="font-size:9px;color:#6b7280">
            ${action.responsible_person ? `Owner: ${action.responsible_person}` : ''}
            ${action.target_date ? ` | Target: ${formatDate(action.target_date)}` : ''}
            ${action.completion_date ? ` | Completed: ${formatDate(action.completion_date)}` : ''}
            | Status: <strong style="color:${action.status === 'completed' ? '#16a34a' : '#d97706'}">${action.status}</strong>
          </div>
        </div>
      </div>
      <div class="step-content">${action.description || '—'}</div>
      ${action.evidence_notes ? `<div class="evidence">Evidence: ${action.evidence_notes}</div>` : ''}
    </div>
  `).join('');

  const severityColor = complaint.severity === 'critical' ? '#dc2626' : complaint.severity === 'major' ? '#d97706' : '#2563eb';
  const statusColor = complaint.status === 'closed' ? '#16a34a' : '#d97706';

  const html = `
    <div class="page">
      <div class="header">
        <div>
          <div class="company-name">${company?.legal_name || 'Alusmith Die Castings Pvt Ltd'}</div>
          <div class="company-details">
            ${company?.address || ''}, ${company?.city || ''}, ${company?.state || ''}<br>
            GSTIN: ${company?.gstin || 'N/A'} | ${company?.phone || ''} | ${company?.email || ''}
          </div>
        </div>
        <div>
          <div class="doc-title">8D CORRECTIVE ACTION REPORT</div>
          <div class="doc-meta">
            Report No: <strong>${complaint.complaint_number}</strong><br>
            Date: ${formatDate(complaint.raised_date)}<br>
            Severity: <span style="color:${severityColor};font-weight:bold">${complaint.severity?.toUpperCase()}</span><br>
            Status: <span style="color:${statusColor};font-weight:bold">${complaint.status?.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div class="parties">
        <div class="party-box">
          <div class="party-label">Problem Summary</div>
          <div class="party-name" style="font-size:13px">${complaint.title}</div>
          <div class="party-detail" style="margin-top:5px">${complaint.description || ''}</div>
        </div>
        <div class="party-box">
          <div class="party-label">Reference Details</div>
          <div class="party-detail">
            ${complaint.customer_id ? `Customer: <strong>Referenced</strong><br>` : ''}
            ${complaint.part_number ? `Part Number: <strong>${complaint.part_number}</strong><br>` : ''}
            ${complaint.quantity_affected ? `Qty Affected: <strong>${complaint.quantity_affected} pcs</strong><br>` : ''}
            Raised By: ${complaint.raised_by || 'Quality Team'}<br>
            Due Date: ${complaint.due_date ? formatDate(complaint.due_date) : 'N/A'}
            ${complaint.is_repeat ? '<br><span style="color:#dc2626;font-weight:bold">⚠ REPEAT COMPLAINT</span>' : ''}
          </div>
        </div>
      </div>

      <div style="margin-bottom:12px">
        <div style="font-size:9px;font-weight:bold;color:#0071C5;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">
          8D Action Plan — ${actions.filter((a: any) => a.status === 'completed').length}/${actions.length} Steps Completed
        </div>
        ${stepRows}
      </div>

      <div class="footer">
        <div class="footer-section">
          <div class="footer-label">Prepared By</div>
          <div class="signature-box">
            <div class="signature-line">${complaint.raised_by || 'Quality Engineer'}</div>
          </div>
        </div>
        <div class="footer-section">
          <div class="footer-label">Approved By</div>
          <div class="signature-box">
            <div class="signature-line">${complaint.closed_by || 'Quality Manager'}</div>
          </div>
        </div>
      </div>

      <div style="text-align:center;margin-top:10px;font-size:9px;color:#9ca3af">
        ${company?.legal_name || 'Alusmith Die Castings Pvt Ltd'} | 8D Report | ${complaint.complaint_number} | Generated: ${new Date().toLocaleDateString('en-IN')}
      </div>
    </div>
  `;

  openPrintWindow(html, `8D Report ${complaint.complaint_number}`);
}

function getStepTitle(type: string): string {
  const titles: any = {
    D1: 'Team Formation',
    D2: 'Problem Description',
    D3: 'Containment Action',
    D4: 'Root Cause Analysis',
    D5: 'Corrective Action Plan',
    D6: 'Implement Corrective Action',
    D7: 'Preventive Action',
    D8: 'Close and Congratulate',
    containment: 'Containment',
    rca: 'Root Cause Analysis',
    capa: 'Corrective & Preventive Action',
    verify: 'Verify Effectiveness'
  };
  return titles[type] || type;
}
