# Khas Pure Food Admin Panel - Quick Reference Card

## Module URLs Quick Access

| Module | URL | Description |
|--------|-----|-------------|
| Dashboard | `/admin` | Sales, metrics, alerts, charts |
| Staff | `/admin/staff` | User management and roles |
| Customers | `/admin/customers` | Customer profiles and analytics |
| Products | `/admin/products` | Product CRUD + flash sales |
| Orders | `/admin/orders` | Online & POS orders |
| Inventory | `/admin/inventory` | Stock and FIFO batches |
| Categories | `/admin/categories` | Product organization |
| Bundles | `/admin/bundles` | Product packages |
| Suppliers | `/admin/suppliers` | Vendor management |
| Refunds | `/admin/refunds` | Refund request workflow |
| POS | `/admin/pos` | Walk-in customer billing |
| POS Reports | `/admin/pos-reports` | In-store sales analytics |
| Reports | `/admin/reports` | Financial and operational reports |
| FBR Settings | `/admin/fbr-settings` | Tax compliance configuration |
| Settings | `/admin/settings` | Store configuration |

---

## Role Permissions at a Glance

### Admin
✓ Full access to everything

### Manager
✓ Orders, Customers, Products, Inventory, POS, Refunds, Reports
✗ Staff Management, FBR Settings, System Settings

### Accountant
✓ All Reports, Suppliers, Purchases, Tax Reports
✗ POS, Orders, Inventory, Settings

### Staff
✓ Dashboard (read), POS, Basic Inventory Search
✗ Everything else

---

## Common Tasks

### Daily Tasks
1. **Check Orders:** `/admin/orders` → Verify payments → Mark complete
2. **Monitor POS:** `/admin/pos-reports` → Review sales
3. **Low Stock:** `/admin/inventory` �� Reorder products
4. **Refunds:** `/admin/refunds` → Process pending requests

### Weekly Tasks
1. **Financial Review:** `/admin/reports` → Download P&L
2. **Supplier Check:** `/admin/suppliers` → Verify balances
3. **Staff Review:** `/admin/staff` → Check activity logs
4. **Inventory:** `/admin/inventory` → Stock aging report

### Monthly Tasks
1. **Tax Report:** `/admin/fbr-settings` → FBR compliance
2. **Customer Analysis:** `/admin/customers` → Spending trends
3. **Product Review:** `/admin/products` → Flash sale performance
4. **Financial Close:** `/admin/reports` → Monthly reconciliation

---

## Keyboard Shortcuts (Future)

| Shortcut | Action |
|----------|--------|
| `Ctrl+P` | Open POS |
| `Ctrl+O` | List Orders |
| `Ctrl+F` | Quick Search |
| `Ctrl+R` | Refresh Data |

---

## Flash Sale Quick Setup

1. Go to `/admin/products`
2. Click "Add Product" or Edit existing
3. Fill details (name, price, category, stock)
4. Set **Discount** (amount and type)
5. Check **"Flash Sale"** checkbox
6. Click Create/Update
7. Product appears in homepage carousel within minutes

---

## POS Billing Quick Guide

1. Go to `/admin/pos`
2. Search product by name or barcode
3. Click to add product
4. Adjust quantity
5. System shows total with GST
6. Select payment method
7. Click "Complete Sale"
8. Receipt prints with FBR QR code
9. Stock automatically deducted

---

## Refund Processing Workflow

1. Customer requests refund on order
2. Go to `/admin/refunds`
3. Find "Pending" refund request
4. Click "Review"
5. Check reason and order details
6. Click "Approve" or "Reject"
7. If approved:
   - Item added back to inventory
   - Profit recalculated
   - Customer notified
8. Status updates to "Refunded"

---

## Report Generation

Go to `/admin/reports` and choose:

**Profit & Loss Report**
- Date range
- By category or product
- Shows gross/net profit
- Download CSV or PDF

**Account Reports**
- Payments received
- Pending payments
- Supplier balances
- Aging schedule

**Purchase Reports**
- All purchases
- By supplier
- By product
- Cost trends

**Inventory Reports**
- Stock levels
- Low stock items
- Expiry alerts
- Stock valuation

---

## FBR Setup (One-time)

1. Go to `/admin/fbr-settings`
2. Enter:
   - Business NTN
   - STRN
   - POS Device ID
   - POS Serial Number
   - FBR API URL
   - FBR API Key
3. Click "Test Connection"
4. If successful, invoices auto-generate
5. If failed, verify credentials and retry

---

## Customer Quick View

Go to `/admin/customers`:
- **Search** by name or email
- **View** total orders and spending
- **Check** last order date
- **See** city/location

---

## Low Stock Alert Response

When you see low stock alert:

1. Click "View Low Stock Items"
2. For each product:
   - Check current quantity
   - Check threshold
3. Create purchase order to supplier
4. Update expected delivery date
5. Product auto-removed from alert once stock restored

---

## Payment Verification Workflow

1. Customer uploads payment screenshot at checkout
2. Goes to `/admin/orders` → "Pending Payment"
3. Admin reviews screenshot
4. Clicks "Approve" or "Reject"
5. If approved:
   - Payment marked complete
   - Order proceeds to fulfillment
   - Customer gets notification

---

## Inventory FIFO Example

**Scenario:** 100 units in stock
- Batch 1: 50 units @ Rs. 50/unit (1 month old)
- Batch 2: 50 units @ Rs. 45/unit (1 week old)

**When 60 units sold:**
- First 50 from Batch 1 (@ Rs. 50)
- Next 10 from Batch 2 (@ Rs. 45)
- Profit = (Sale Price × 60) - (50×50 + 10×45)

---

## Export Data Steps

1. Go to module (Orders, Products, Inventory)
2. Click "Export" button
3. Choose format:
   - CSV (for Excel)
   - PDF (for printing/sharing)
4. Select date range (if applicable)
5. Download automatically

---

## Error Troubleshooting

| Error | Solution |
|-------|----------|
| "Permission Denied" | Check your role/permissions |
| "Product not found" | Verify product SKU or name |
| "FBR Connection Failed" | Check API credentials |
| "Low inventory" | Add stock via Inventory module |
| "Invalid date range" | End date must be after start date |

---

## Key Metrics Explained

### Dashboard Metrics

**Total Sales**
- Sum of all online + POS orders

**Total Profit**
- Sales amount minus FIFO cost of goods

**Pending Orders**
- Orders awaiting payment or processing

**GST Collected**
- 17% tax on taxable items

**Low Stock Items**
- Products below threshold quantity

**POS vs Online Revenue**
- Breakdown of sales channels

---

## Best Practices

1. **Daily:** Check dashboard metrics first thing
2. **Orders:** Process within 24 hours
3. **Refunds:** Respond within 48 hours
4. **Inventory:** Update stock weekly
5. **Reports:** Review monthly for trends
6. **Backups:** Enable automatic daily backups
7. **Passwords:** Change staff passwords monthly
8. **FBR:** Verify submission daily

---

## Contact & Support

For detailed feature information, see:
- **ADMIN_PANEL_FEATURES.md** - Complete feature list
- **ADMIN_IMPLEMENTATION_GUIDE.md** - Technical details
- **ADMIN_PANEL_COMPLETE.md** - Project summary

---

**Last Updated:** January 2026
**System Status:** Production Ready
**All 17 Modules:** Fully Implemented
