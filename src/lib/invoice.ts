// Lightweight helper to generate an invoice PDF using jsPDF loaded from CDN at runtime.
// We avoid bundler dependencies by injecting a script tag when needed.

type JsPDFCtor = new (options?: any) => any;

export interface InvoiceCompany {
  name: string;
  address: string;
  gstin: string;
  cin?: string;
  email: string;
  website?: string;
  logoUrl?: string;
}

export interface InvoiceItem {
  description: string;
  hsn: string;
  quantity: number;
  unitPrice: number; // Base T-shirt price
  printPrice: number; // Printing price
  taxRate: number; // e.g., 0.05 for 5%
  taxAmount?: number; // Fixed tax amount (if provided, this will be used instead of calculating from taxRate)
}

export interface InvoiceMeta {
  invoiceId: string;
  orderId: string;
  dateISO: string;
  customerName: string;
  customerEmail: string;
  billingAddress?: string;
  placeOfSupply?: string;
  paymentMethod?: string;
  transactionRef?: string;
  shipping?: number;
  shippingGst?: number; // GST on shipping (if separate from shipping amount)
}

async function loadJsPDF(): Promise<JsPDFCtor> {
  if ((window as any).jspdf?.jsPDF) {
    return (window as any).jspdf.jsPDF as JsPDFCtor;
  }
  await new Promise<void>((resolve, reject) => {
    const existing = document.getElementById('jspdf-cdn') as HTMLScriptElement | null;

    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load jsPDF')), { once: true });
      return;
    }

    const s = document.createElement('script');
    s.id = 'jspdf-cdn';
    s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
    s.async = true;
    s.onload = () => {
      s.dataset.loaded = 'true';
      resolve();
    };
    s.onerror = () => reject(new Error('Failed to load jsPDF'));
    document.body.appendChild(s);
  });

  const jsPdfNamespace = (window as any).jspdf;
  if (!jsPdfNamespace?.jsPDF) {
    throw new Error('jsPDF failed to initialize');
  }

  return jsPdfNamespace.jsPDF as JsPDFCtor;
}

export async function generateInvoicePdfBase64(
  company: InvoiceCompany,
  meta: InvoiceMeta,
  items: InvoiceItem[]
): Promise<string> {
  const jsPDF = await loadJsPDF();
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 40;
  const right = pageWidth - 40;
  let y = 40;

  // --- Header Section ---
  if (company.logoUrl) {
    try {
      const img = await fetch(company.logoUrl).then(r => r.blob());
      const dataUrl = await blobToDataURL(img);
      doc.addImage(dataUrl, 'WEBP', left, y, 50, 50);
    } catch (_) { /* ignore */ }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text('TAX INVOICE', right, y + 20, { align: 'right' });

  y += 65;

  // --- Company Details (Left) vs Invoice Info (Right) ---
  const midY = y;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name, left, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  y += 14;
  const addressLines = doc.splitTextToSize(company.address, 200);
  doc.text(addressLines, left, y);
  y += (addressLines.length * 12) + 2;
  doc.text(`GSTIN: ${company.gstin}`, left, y);
  if (company.cin) {
    y += 12;
    doc.text(`CIN: ${company.cin}`, left, y);
  }
  y += 12;
  doc.text(`Email: ${company.email}`, left, y);

  y = midY;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text(`Invoice Number:`, right - 130, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(meta.invoiceId, right, y, { align: 'right' });
  
  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice Date:`, right - 130, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(meta.dateISO).toLocaleDateString('en-IN'), right, y, { align: 'right' });

  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.text(`Order ID:`, right - 130, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(meta.orderId, right, y, { align: 'right' });

  y += 14;
  if (meta.placeOfSupply) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Place of Supply:`, right - 130, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(meta.placeOfSupply, right, y, { align: 'right' });
  }

  y = Math.max(y, midY + (addressLines.length * 12) + 60) + 30;

  // --- Bill To / Ship To ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);
  doc.text('BILL TO:', left, y);
  
  y += 16;
  doc.setFontSize(10);
  doc.text(meta.customerName, left, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  y += 14;
  doc.text(meta.customerEmail, left, y);
  if (meta.billingAddress) {
    y += 14;
    const billLines = doc.splitTextToSize(meta.billingAddress, 250);
    doc.text(billLines, left, y);
    y += (billLines.length * 12);
  }

  y += 30;

  // --- Items Table ---
  // Headers
  doc.setFillColor(245, 245, 245);
  doc.rect(left, y, right - left, 25, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(40, 40, 40);
  const tableY = y + 17;
  doc.text('Description', left + 5, tableY);
  doc.text('HSN', left + 140, tableY);
  doc.text('Qty', left + 185, tableY, { align: 'right' });
  doc.text('T-shirt', left + 245, tableY, { align: 'right' });
  doc.text('Print', left + 295, tableY, { align: 'right' });
  doc.text('Tax %', left + 345, tableY, { align: 'right' });
  doc.text('Tax Amt', left + 410, tableY, { align: 'right' });
  doc.text('Total', right - 10, tableY, { align: 'right' });

  y += 25;
  let totalSubtotal = 0;
  let totalTax = 0;
  let totalGrand = 0;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  
  // Only show items table if there are items
  if (items.length > 0) {
    items.forEach((item) => {
      // GST is calculated only on print cost, not on t-shirt price
      const perItemSubtotal = item.unitPrice + item.printPrice;
      // Use fixed taxAmount if provided, otherwise calculate from taxRate
      const perItemTax = item.taxAmount !== undefined 
        ? item.taxAmount 
        : Math.floor((item.printPrice * item.taxRate) * 100) / 100; // GST only on print cost
      const lineSubtotal = perItemSubtotal * item.quantity;
      const lineTax = perItemTax * item.quantity;
      const lineTotal = lineSubtotal + lineTax;

      totalSubtotal += lineSubtotal;
      totalTax += lineTax;
      totalGrand += lineTotal;

      y += 25;
      // Row separation line
      doc.setDrawColor(230, 230, 230);
      doc.line(left, y, right, y);
      
      const rowY = y - 8;
      doc.text(item.description, left + 5, rowY);
      doc.text(item.hsn, left + 140, rowY);
      doc.text(String(item.quantity), left + 185, rowY, { align: 'right' });
      doc.text(item.unitPrice.toFixed(2), left + 245, rowY, { align: 'right' });
      doc.text(item.printPrice.toFixed(2), left + 295, rowY, { align: 'right' });
      doc.text(`${(item.taxRate * 100).toFixed(0)}%`, left + 345, rowY, { align: 'right' });
      doc.text(lineTax.toFixed(2), left + 410, rowY, { align: 'right' });
      doc.text(lineTotal.toFixed(2), right - 10, rowY, { align: 'right' });
    });
  } else {
    // If no items, add a note that items were already paid
    y += 20;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Note: Items were already paid when members joined the group.', left, y);
    y += 15;
  }

  y += 20;

  // --- Summary Section ---
  const summaryX = right - 180;
  doc.setFont('helvetica', 'normal');
  
  // Only show subtotal and tax if there are items
  if (items.length > 0) {
    doc.text('Subtotal:', summaryX, y);
    doc.text(totalSubtotal.toFixed(2), right - 10, y, { align: 'right' });
    
    y += 16;
    doc.text('Tax (GST):', summaryX, y);
    doc.text(totalTax.toFixed(2), right - 10, y, { align: 'right' });
  }

  // Show shipping charges
  if (meta.shipping && meta.shipping > 0) {
    y += 16;
    doc.text('Shipping:', summaryX, y);
    // Shipping amount (₹150)
    doc.text(meta.shipping.toFixed(2), right - 10, y, { align: 'right' });
    totalGrand += meta.shipping;
    
    // Show shipping GST separately if provided
    if (meta.shippingGst && meta.shippingGst > 0) {
      y += 16;
      doc.text('GST (5% on Shipping):', summaryX, y);
      doc.text(meta.shippingGst.toFixed(2), right - 10, y, { align: 'right' });
      totalGrand += meta.shippingGst;
    }
  }
  
  // If no items and no shipping, set total to 0
  if (items.length === 0 && (!meta.shipping || meta.shipping === 0)) {
    totalGrand = 0;
  }

  y += 20;
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(1);
  doc.line(summaryX, y - 10, right, y - 10);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('GRAND TOTAL:', summaryX, y + 5);
  doc.text(`INR ${totalGrand.toFixed(2)}`, right - 10, y + 5, { align: 'right' });

  y += 40;

  // --- Amount in Words ---
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Amount in words:', left, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${numberToWords(Math.round(totalGrand))} Rupees Only`, left + 85, y);

  y += 40;

  // --- Footer / Signature ---
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Declaration:', left, y);
  y += 12;
  doc.text('We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.', left, y);

  y += 40;
  doc.line(right - 150, y, right, y);
  doc.text('Authorized Signatory', right, y + 12, { align: 'right' });
  doc.text(`for ${company.name}`, right, y - 10, { align: 'right' });

  const base64 = doc.output('datauristring');
  const commaIdx = base64.indexOf(',');
  return base64.substring(commaIdx + 1);
}

function numberToWords(num: number): string {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  let numStr = num.toString();
  if (numStr.length > 9) return 'overflow';
  const n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return ''; 
  let str = '';
  str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
  return str.trim();
}

export async function downloadInvoice(base64: string, filename: string) {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}


