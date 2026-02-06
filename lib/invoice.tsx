/**
 * FBR-Compliant Invoice Generation for Pakistan
 */

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  gst?: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: Date;
  seller: {
    name: string;
    ntn: string;
    strn: string;
    address: string;
  };
  buyer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  items: InvoiceItem[];
  bankDetails?: {
    accountNumber: string;
    accountHolder: string;
    bankName: string;
  };
}

export function generateInvoiceHTML(data: InvoiceData): string {
  const subtotal = data.items.reduce(
    (sum, item) =>
      sum +
      (item.quantity * item.unitPrice - (item.discount || 0)),
    0
  );

  const gstAmount = data.items.reduce((sum, item) => {
    const itemTotal = item.quantity * item.unitPrice - (item.discount || 0);
    const gstRate = item.gst || 17;
    return sum + (itemTotal * gstRate) / 100;
  }, 0);

  const total = subtotal + gstAmount;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${data.invoiceNumber}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: white;
        }
        .container {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          border: 1px solid #ddd;
          padding: 30px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
          border-bottom: 2px solid #16a34a;
          padding-bottom: 20px;
        }
        .seller-info h2 {
          margin: 0 0 10px 0;
          color: #16a34a;
          font-size: 24px;
        }
        .seller-info p {
          margin: 5px 0;
          font-size: 14px;
          color: #666;
        }
        .invoice-details {
          text-align: right;
          font-size: 14px;
        }
        .invoice-details h3 {
          margin: 0;
          color: #333;
        }
        .invoice-details p {
          margin: 5px 0;
          color: #666;
        }
        .addresses {
          display: flex;
          gap: 40px;
          margin-bottom: 30px;
          font-size: 14px;
        }
        .address-block h4 {
          margin: 0 0 10px 0;
          color: #333;
          font-weight: bold;
        }
        .address-block p {
          margin: 5px 0;
          color: #666;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th {
          background: #16a34a;
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: bold;
          border: 1px solid #ddd;
        }
        td {
          padding: 12px;
          border: 1px solid #ddd;
          font-size: 14px;
        }
        tr:nth-child(even) {
          background: #f9f9f9;
        }
        .numeric {
          text-align: right;
        }
        .summary {
          width: 100%;
          margin-top: 20px;
        }
        .summary-row {
          display: flex;
          justify-content: flex-end;
          padding: 10px 0;
          font-size: 14px;
          border-bottom: 1px solid #ddd;
        }
        .summary-row.total {
          border-bottom: 2px solid #16a34a;
          border-top: 2px solid #16a34a;
          font-weight: bold;
          font-size: 16px;
          color: #16a34a;
          padding: 15px 0;
        }
        .summary-label {
          width: 200px;
          text-align: right;
          padding-right: 20px;
        }
        .summary-value {
          width: 150px;
          text-align: right;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
        .frb-notice {
          background: #f0f0f0;
          padding: 10px;
          margin-top: 20px;
          border-left: 4px solid #16a34a;
          font-size: 12px;
          color: #333;
        }
        .bank-details {
          margin-top: 20px;
          padding: 15px;
          background: #f9f9f9;
          border: 1px solid #ddd;
          font-size: 13px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="seller-info">
            <h2>${data.seller.name}</h2>
            <p><strong>NTN:</strong> ${data.seller.ntn}</p>
            <p><strong>STRN:</strong> ${data.seller.strn}</p>
            <p>${data.seller.address}</p>
          </div>
          <div class="invoice-details">
            <h3>INVOICE</h3>
            <p><strong>Invoice #:</strong> ${data.invoiceNumber}</p>
            <p><strong>Date:</strong> ${data.date.toLocaleDateString('en-PK')}</p>
          </div>
        </div>

        <div class="addresses">
          <div class="address-block">
            <h4>Bill To:</h4>
            <p><strong>${data.buyer.name}</strong></p>
            <p>${data.buyer.address}</p>
            <p>Email: ${data.buyer.email}</p>
            <p>Phone: ${data.buyer.phone}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th class="numeric">Qty</th>
              <th class="numeric">Unit Price</th>
              <th class="numeric">Discount</th>
              <th class="numeric">GST %</th>
              <th class="numeric">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${data.items
              .map((item) => {
                const itemTotal = item.quantity * item.unitPrice - (item.discount || 0);
                const gst = item.gst || 17;
                return `
              <tr>
                <td>${item.description}</td>
                <td class="numeric">${item.quantity}</td>
                <td class="numeric">Rs. ${item.unitPrice.toFixed(2)}</td>
                <td class="numeric">${item.discount ? 'Rs. ' + item.discount.toFixed(2) : '-'}</td>
                <td class="numeric">${gst}%</td>
                <td class="numeric">Rs. ${itemTotal.toFixed(2)}</td>
              </tr>
            `;
              })
              .join('')}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row">
            <div class="summary-label">Subtotal:</div>
            <div class="summary-value">Rs. ${subtotal.toFixed(2)}</div>
          </div>
          <div class="summary-row">
            <div class="summary-label">GST (17%):</div>
            <div class="summary-value">Rs. ${gstAmount.toFixed(2)}</div>
          </div>
          <div class="summary-row total">
            <div class="summary-label">TOTAL AMOUNT:</div>
            <div class="summary-value">Rs. ${total.toFixed(2)}</div>
          </div>
        </div>

        ${
          data.bankDetails
            ? `
          <div class="bank-details">
            <h4>Bank Details for Payment:</h4>
            <p><strong>Account Holder:</strong> ${data.bankDetails.accountHolder}</p>
            <p><strong>Bank:</strong> ${data.bankDetails.bankName}</p>
            <p><strong>Account Number:</strong> ${data.bankDetails.accountNumber}</p>
          </div>
        `
            : ''
        }

        <div class="frb-notice">
          <strong>FBR Compliance Notice:</strong> This invoice is issued in compliance with
          Pakistan's Federal Board of Revenue (FBR) requirements for taxation purposes. GST
          is calculated at the standard rate of 17% unless items are marked as tax-exempt.
        </div>

        <div class="footer">
          <p>Thank you for your business! Invoice generated on ${new Date().toLocaleString('en-PK')}</p>
          <p>For queries, contact: ${data.seller.address}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
}

export function generateInvoiceNumberSequence(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000);
  return `INV-${year}-${month}-${String(random).padStart(5, '0')}`;
}
