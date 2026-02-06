# POS & Refund System Documentation

## Overview
Complete Point-of-Sale (POS) billing system with FBR integration and comprehensive refund management for both online and walk-in customers.

---

## 1. POS BILLING SYSTEM (Walk-In Customers)

### Features
- **Real-time Product Search**: Search by product name or barcode
- **Smart Cart Management**: Add/remove items, adjust quantities, view live totals
- **Automatic Tax Calculation**: GST (17%) calculated per item, tax-exempt item support
- **Multiple Payment Methods**: Cash, Card, Manual entry
- **FBR Integration**: Automatic invoice submission to FBR with QR codes
- **FIFO Cost Tracking**: Automatic profit calculation using First-In-First-Out inventory
- **Receipt Management**: Print receipts directly from POS
- **Stock Management**: Real-time inventory updates on sale completion

### How to Use

#### Step 1: Access POS
Navigate to **Admin Dashboard → POS Billing**

#### Step 2: Add Products to Cart
1. Search product by name or barcode
2. Click product card to add (quantity 1)
3. Adjust quantity using input field
4. Multiple items can be added

#### Step 3: Review Cart & Totals
- View all items in cart sidebar
- See real-time calculations:
  - Subtotal
  - GST amount (17% or tax-exempt)
  - **Total Amount**

#### Step 4: Select Payment Method
- **Cash**: Default payment method
- **Card**: Debit/credit card payment
- **Manual**: Manual entry (for other payment methods)

#### Step 5: Complete Sale
1. Click "Complete Sale" button
2. System validates cart
3. FBR invoice is generated automatically
4. Sale record is saved with:
   - FBR Invoice Number
   - QR Code
   - Transaction ID
   - Profit calculation (selling price - FIFO cost)

#### Step 6: Print Receipt
- Receipt automatically displays on completion
- Contains FBR invoice details
- Can be reprinted anytime

### API Endpoints

**POST /api/admin/pos/sale**
Creates a new POS sale with FBR submission
```json
{
  "items": [
    {
      "id": "product_id",
      "name": "Product Name",
      "quantity": 2,
      "price": 100,
      "gst": 17,
      "subtotal": 200,
      "taxExempt": false
    }
  ],
  "paymentMethod": "cash",
  "subtotal": 5000,
  "gstAmount": 850,
  "totalAmount": 5850
}
```

**GET /api/admin/pos/sale**
Retrieves today's POS sales summary
```json
{
  "sales": [...],
  "summary": {
    "totalSales": 45,
    "totalAmount": 125000,
    "totalProfit": 35000,
    "totalTax": 21250,
    "avgSaleValue": 2777.78
  }
}
```

### Database Model (POSSale)
```
- saleNumber: Unique sale identifier
- cashier: User who processed sale
- items: Array of line items
- subtotal: Total before tax
- gstAmount: Total GST collected
- totalAmount: Final amount
- paymentMethod: cash|card|manual
- paymentStatus: completed|failed
- fbrInvoiceNumber: FBR assigned number
- fbrQrCode: QR code for FBR invoice
- fbrTransactionId: FBR transaction reference
- fbrStatus: pending|submitted|success|failed
- profit: Calculated profit (FIFO based)
- costOfGoods: FIFO calculated cost
- isFinal: Always true (no refunds for POS)
```

---

## 2. FBR INTEGRATION

### Configuration

#### Setup Steps
1. Go to **Admin → FBR Settings**
2. Enter FBR credentials:
   - **Business Name**: Store name
   - **NTN**: National Tax Number
   - **STRN**: Sales Tax Registration Number
   - **POS Device ID**: FBR assigned device ID
   - **POS Device Serial**: Device serial number
   - **FBR API URL**: FBR endpoint (optional)
   - **FBR API Key**: Authentication key

3. Test connection using "Test Connection" button
4. Enable FBR Integration checkbox
5. Click "Save Configuration"

### Features
- ✅ Automatic invoice submission
- ✅ QR code generation
- ✅ Transaction tracking
- ✅ Real-time FBR status updates
- ✅ Reconciliation & sync capability

### API Endpoints

**GET /api/admin/fbr-config**
Retrieves current FBR configuration

**POST /api/admin/fbr-config**
Updates FBR configuration

**POST /api/admin/fbr-config/test**
Tests FBR connection with provided credentials

**POST /api/admin/fbr-config/sync**
Syncs all pending sales with FBR

---

## 3. ONLINE ORDER REFUND SYSTEM

### Customer-Side (Online Orders Only)

#### Requesting a Refund
1. **View Order**: Go to My Orders → Order Details
2. **Request Refund Button**: Visible only for:
   - Online orders (not POS sales)
   - Orders not yet cancelled
3. **Enter Reason**: Provide detailed reason in modal
4. **Submit**: Request sent to admin for review

#### Refund Status
- **Pending**: Awaiting admin review (24 hours max)
- **Approved**: Refund has been approved
- **Rejected**: Refund was rejected (with notes)
- **Refunded**: Refund completed

### Admin-Side (Refund Management)

#### Access Refund Requests
Navigate to **Admin → Refund Requests**

#### Review & Action
1. **Filter by Status**: pending, approved, rejected, refunded
2. **View Details**: Click "View" to see order & request info
3. **Decision**:
   - **Approve**: Enter refund amount (can be partial)
   - **Reject**: Enter reason/notes
4. **Add Notes**: Optional decision notes

#### Approval Process
- Approved refunds:
  - Inventory is restored (items returned to stock)
  - Order status changed to "Cancelled"
  - Profit/Loss record adjusted
  - Customer notified

- Rejected refunds:
  - Order remains active
  - Reason logged for reference
  - Customer can resubmit if desired

### API Endpoints

**POST /api/orders/refund** (Customer)
Submit a refund request for an order
```json
{
  "orderId": "order_id",
  "reason": "Product defective"
}
```

**GET /api/admin/refunds** (Admin)
Get all refund requests with filters

**POST /api/admin/refunds** (Admin)
Create refund request (admin-initiated)

**POST /api/admin/refunds/[id]/approve** (Admin)
Approve a refund request
```json
{
  "approvalAmount": 5000,
  "notes": "Approved partial refund"
}
```

**POST /api/admin/refunds/[id]/reject** (Admin)
Reject a refund request
```json
{
  "notes": "Product not faulty"
}
```

### Database Model (RefundRequest)
```
- order: Reference to Order
- requestedAmount: Amount requested
- reason: Customer provided reason
- status: pending|approved|rejected|refunded
- approvedBy: Admin who approved
- approvedAt: Approval timestamp
- refundedAmount: Actual amount refunded
- refundMethod: How refund was processed
- notes: Admin notes
```

---

## 4. POS REPORTS & ANALYTICS

### Access Reports
Navigate to **Admin → POS Reports**

### Dashboard Metrics
- **Total Sales**: Number of walk-in transactions
- **Total Revenue**: Combined sale amounts
- **Total Profit**: Revenue minus FIFO cost
- **Total Tax**: GST collected
- **Avg Sale Value**: Revenue ÷ Sales count

### Report Features
- **Date Filters**: Today, Week, Month, Custom range
- **Detailed Table**: All transactions with metrics
- **Export**: Download as CSV for spreadsheet analysis

### Metrics Tracked Per Sale
- Sale Number
- Amount (with GST)
- GST collected
- Cost of goods (FIFO)
- Profit
- Payment method
- FBR invoice status
- Processing date/time

### API Endpoints

**GET /api/admin/pos/sale**
Returns sales list and summary

---

## 5. INVENTORY & FIFO SYSTEM

### How FIFO Works
1. **Stock Entry**: When purchase recorded, inventory batches created
2. **Sale Processing**: 
   - System identifies oldest batches first
   - Deducts quantity from oldest batch
   - Calculates cost using buying rate from batch
3. **Profit Calculation**: 
   - Selling price - FIFO cost = Profit
   - More accurate than average cost method
4. **Batch Status**:
   - Active: Full quantity available
   - Partial: Some quantity sold
   - Finished: No quantity remaining

### Integration with POS
- Stock automatically decreases on sale completion
- Cost of goods calculated using FIFO method
- Profit record created for accounting
- Expired items tracked and managed

---

## 6. KEY DIFFERENCES: POS vs ONLINE

| Feature | POS (Walk-In) | Online |
|---------|---------------|--------|
| **Cancellation** | ❌ Not allowed | ✅ Allowed (via refund) |
| **Refund** | ❌ No refunds | ✅ Refund requests |
| **Payment** | Immediate (Cash/Card) | Screenshot verification |
| **Invoice** | FBR integrated | Manual invoice |
| **Final** | Yes (isFinal = true) | No (can be modified) |

---

## 7. COMPLETE ADMIN WORKFLOW

### Daily Operations
1. **Morning**: Check Dashboard for stats
2. **POS Shift**: Manage walk-in sales
3. **Afternoon**: Review orders, process payment verifications
4. **End of Day**: 
   - Check POS sales report
   - Review FBR submission status
   - Process any pending refunds

### Weekly Tasks
1. Export POS reports
2. Reconcile with FBR
3. Review profit margins
4. Check inventory levels

### Monthly Tasks
1. Generate tax reports
2. Reconcile inventory
3. Analyze sales trends
4. Review supplier performance

---

## 8. SECURITY & COMPLIANCE

### FBR Compliance
- ✅ All sales submitted to FBR
- ✅ QR codes generated per invoice
- ✅ Transaction tracking enabled
- ✅ Tax calculation verified (17% GST)
- ✅ NTN/STRN included in records

### Data Security
- 🔒 Admin-only access to POS
- 🔒 Role-based access control
- 🔒 JWT authentication
- 🔒 API key encryption
- 🔒 Audit trail for refunds

---

## 9. TROUBLESHOOTING

### POS Issues
- **Sale not submitting**: Check FBR configuration
- **FBR connection error**: Verify API key and endpoint
- **Stock not updating**: Ensure product exists in system

### Refund Issues
- **Cannot refund POS sale**: This is by design (final sales)
- **Cannot request refund**: Order may be cancelled or already refunded
- **Partial refund**: Admin can approve less than requested amount

---

## 10. QUICK REFERENCE: MENU STRUCTURE

```
Admin Dashboard
├── Dashboard (Overview)
├── Orders (Online orders)
├── Products
├── Bundles
├── Categories
├── Inventory
├── Suppliers
├── Refund Requests 👈 NEW
├── POS Billing 👈 NEW
├── POS Reports 👈 NEW
├── Reports (General)
├── FBR Settings 👈 NEW
└── Settings
```

---

## Version: 1.0
**Last Updated**: 2025-01-27
**Author**: v0 AI Assistant
