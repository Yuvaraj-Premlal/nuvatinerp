export function openPrintWindow(html: string, title: string) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { alert('Please allow popups for this site'); return; }
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: white; }
        .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 15mm; background: white; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0071C5; padding-bottom: 10px; margin-bottom: 15px; }
        .company-name { font-size: 20px; font-weight: bold; color: #0071C5; }
        .company-details { font-size: 10px; color: #555; margin-top: 3px; line-height: 1.5; }
        .doc-title { font-size: 18px; font-weight: bold; color: #0071C5; text-align: right; }
        .doc-meta { font-size: 10px; color: #555; text-align: right; margin-top: 3px; line-height: 1.6; }
        .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; }
        .party-box { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; padding: 10px; }
        .party-label { font-size: 9px; font-weight: bold; color: #0071C5; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
        .party-name { font-size: 13px; font-weight: bold; color: #1a1a1a; margin-bottom: 3px; }
        .party-detail { font-size: 10px; color: #555; line-height: 1.5; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th { background: #0071C5; color: white; padding: 7px 8px; font-size: 10px; text-align: left; font-weight: 600; }
        th.right { text-align: right; }
        td { padding: 6px 8px; font-size: 11px; border-bottom: 1px solid #e9ecef; vertical-align: top; }
        td.right { text-align: right; }
        tr:nth-child(even) { background: #f8f9fa; }
        .totals { display: flex; justify-content: flex-end; margin-bottom: 15px; }
        .totals-box { width: 280px; }
        .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; border-bottom: 1px solid #e9ecef; }
        .totals-row.total { font-weight: bold; font-size: 13px; color: #0071C5; border-top: 2px solid #0071C5; border-bottom: none; padding-top: 8px; }
        .amount-words { background: #f0f7ff; border: 1px solid #bee3f8; border-radius: 4px; padding: 8px 12px; font-size: 11px; margin-bottom: 15px; }
        .amount-words-label { font-size: 9px; font-weight: bold; color: #0071C5; text-transform: uppercase; margin-bottom: 3px; }
        .footer { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; border-top: 1px solid #dee2e6; padding-top: 12px; margin-top: auto; }
        .footer-section { font-size: 10px; }
        .footer-label { font-weight: bold; color: #555; margin-bottom: 5px; font-size: 9px; text-transform: uppercase; }
        .signature-box { border: 1px solid #dee2e6; border-radius: 4px; padding: 8px; min-height: 60px; }
        .signature-line { border-top: 1px solid #1a1a1a; margin-top: 40px; padding-top: 4px; font-size: 10px; text-align: center; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: bold; }
        .badge-blue { background: #dbeafe; color: #1d4ed8; }
        .badge-green { background: #dcfce7; color: #166534; }
        .badge-red { background: #fee2e2; color: #991b1b; }
        .badge-amber { background: #fef3c7; color: #92400e; }
        .step-box { border: 1px solid #dee2e6; border-radius: 4px; padding: 10px; margin-bottom: 8px; }
        .step-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .step-number { width: 24px; height: 24px; background: #0071C5; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; flex-shrink: 0; }
        .step-number.done { background: #16a34a; }
        .step-title { font-weight: bold; font-size: 11px; color: #0071C5; }
        .step-content { font-size: 11px; color: #374151; line-height: 1.5; margin-left: 32px; }
        .step-meta { font-size: 10px; color: #6b7280; margin-left: 32px; margin-top: 3px; }
        .evidence { background: #f0f7ff; border-left: 3px solid #0071C5; padding: 4px 8px; margin-left: 32px; margin-top: 4px; font-size: 10px; font-style: italic; }
        .watermark-draft { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-45deg); font-size: 80px; color: rgba(200,56,14,0.08); font-weight: bold; pointer-events: none; z-index: 0; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page { padding: 10mm; width: 100%; }
          .no-print { display: none; }
          @page { size: A4; margin: 0; }
        }
        .print-btn { position: fixed; top: 15px; right: 15px; background: #0071C5; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; z-index: 1000; }
        .print-btn:hover { background: #005a9e; }
      </style>
    </head>
    <body>
      <button class="print-btn no-print" onclick="window.print()">🖨 Print / Save PDF</button>
      ${html}
    </body>
    </html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

export function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';
  if (num < 0) return 'Minus ' + numberToWords(-num);

  const convert = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = convert(rupees) + ' Rupees';
  if (paise > 0) result += ' and ' + convert(paise) + ' Paise';
  return result + ' Only';
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatCurrency(amount: number): string {
  return `₹${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
