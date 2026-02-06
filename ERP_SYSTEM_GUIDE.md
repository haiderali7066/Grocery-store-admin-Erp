# Khas Pure Food - Unified Retail ERP System

## Complete Implementation Guide

This document outlines the complete unified ERP system built for Khas Pure Food combining POS, Online Store, Inventory (FIFO), Wallet/Finance, and comprehensive reporting.

---

## System Architecture

### Core Components

1. **Product Management** - SKU-based product catalog
2. **Inventory (FIFO)** - Batch tracking with mandatory buying rates
3. **Purchase System** - Stock acquisition with investment tracking
4. **Wallet & Finance** - Multi-method payment tracking (Cash, Bank, EasyPaisa, JazzCash, Card)
5. **Investment Capital** - Business capital management with auto-deduction
6. **POS System** - Walk-in sales with instant checkout
7. **Online Orders** - Manual payment verification workflow
8. **Refunds/Returns** - Auto inventory and finance adjustments
9. **Reports** - Sales, profit, stock, and finance analytics

---

## Database Schema Changes

### Enhanced Schemas

```typescript
// Product Schema - NEW FIELDS
- sku: String (unique identifier)
- brand: String (optional)
- description: String
- retailPrice: Number (main selling price)
- unitType: kg | g | liter | ml | piece
- unitSize: Number (e.g., 500g, 1kg, 1L)
- mainImage: String
- galleryImages: [String]
- posVisible: Boolean (show in POS?)
- onlineVisible: Boolean (show in online store?)
- isFeatured: Boolean
- isHot: Boolean
- isNewArrival: Boolean
- status: active | draft | discontinued
- stock: 0 (always starts at 0)

// Purchase Schema - ENHANCED
- supplierInvoiceNo: String
- purchaseDate: Date
- products[]:
  - buyingRate: Number (MANDATORY for FIFO)
  - quantity: Number
  - batchNumber: String (auto-generated)
  - expiryDate: Date
- paymentMethod: cash | bank | cheque | easypaisa | jazzcash
- paymentStatus: pending | completed
- deductFromInvestment: Boolean (auto-deduct capital?)
- investmentUsed: ObjectId (which investment?)
- notes: String

// NEW: Wallet Schema
- cash: Number
- bank: Number
- easyPaisa: Number
- jazzCash: Number
- card: Number
- totalBalance: computed

// NEW: Transaction Schema (Finance History)
- type: income | expense | transfer
- category: pos_sale | online_order | purchase | investment | refund
- amount: Number
- source: cash | bank | easypaisa | jazzcash | card
- destination: String (for transfers)
- reference: ObjectId (link to Order, POSSale, Purchase)
- description: String

// NEW: Investment Schema
- amount: Number
- source: Wallet method
- description: String
- remainingBalance: Number (auto-calculated)
- status: active | exhausted
- deductionHistory: Array
```

---

## Admin Panel Modules

### 1. Dashboard
Shows real-time metrics:
- Total Sales (POS + Online)
- Profit/Loss
- Total Stock + Low Stock Alerts
- Investment Balance
- Wallet Balances (5 methods)
- Sales & Stock Trends (charts)
- Wallet-wise Income

### 2. Product Management
Create/Edit Products:
- Name, SKU, Category, Brand
- Description
- Unit Type (kg/g/liter/ml/piece) + Unit Size
- Retail Price
- Main Image + Gallery
- POS Visibility: Yes/No
- Online Store Visibility: Yes/No
- Display Sections (Featured, Hot, New Arrival)
- Discount (optional)
- Status (Active, Draft, Discontinued)

Stock: Always starts at 0

### 3. Purchase Stock
Add stock via purchases:
- Supplier (select/add)
- Supplier Invoice No
- Purchase Date (auto)
- For Each Product:
  - Buying Rate (MANDATORY)
  - Quantity
  - Batch Number (auto/manual)
  - Expiry Date
- Payment Method
- Payment Status
- Deduct from Investment: Yes/No
- Notes

Creates FIFO batch automatically.

### 4. Inventory Management
- View stock per product
- View FIFO batches with buying rates
- Low stock alerts
- Expiry alerts
- Manual stock adjustment (admin only)

### 5. Wallet & Finance
- View all 5 wallet balances
- Transfer between wallets
- Transaction history (all operations)
- Real-time balance updates

### 6. Investment & Capital
- Add investment
- Track remaining balance
- View deduction history
- Auto-deduction on purchases
- Investment status (active/exhausted)

### 7. POS System
Walk-in Customer Sales:
- Search/Scan Product by SKU
- Add to Cart
- Sell by Unit or Weight
- Apply Discount
- Checkout with 5 payment methods
- Generate Invoice
- Reduce stock (FIFO)
- Update wallet automatically

### 8. Online Orders
Manage online orders:
- View pending orders
- Verify payment screenshot
- Order Statuses:
  - Pending (payment unverified)
  - Processing
  - Shipped
  - Delivered
  - Cancelled
- Generate invoice
- Update stock & wallet on verification

### 9. Returns & Refunds
Handle returns:
- Refund requests from customers
- Approve/Reject
- Auto-adjust stock (FIFO reversal)
- Auto-adjust wallet & profit
- Recalculate profit/loss

### 10. Suppliers
- Add/Edit/Delete suppliers
- Purchase history
- Optional: Pending payments tracking

### 11. Reports
- Sales Report (POS + Online by date range)
- Product-wise Profit/Loss
- Wallet-wise Income
- Supplier-wise Purchases
- Investment vs Expense
- Date filters
- Export: PDF / Excel

---

## Online Store Flow

### Customer Journey

1. **Browse** - Products filtered by category, price, tags
2. **Product Detail** - View price, weight options, description
3. **Add to Cart** - Select weight/quantity
4. **Checkout**:
   - Name
   - Phone
   - Address
   - Notes (optional)
   - Select Payment Method
   - Upload Screenshot
5. **Place Order** - Status: Pending
6. **Track Order** - View status updates
7. **Request Refund** - If needed (from order details)

---

## System Flow - How It Works

### Product Creation
```
1. Admin creates product (no stock)
2. SKU assigned (unique)
3. Listed in POS & Online (if visible)
```

### Adding Stock
```
1. Admin: Purchases → Add Stock
2. Select Supplier + Products
3. Enter Buying Rate (MANDATORY)
4. System:
   - Creates FIFO batch
   - Updates product stock
   - Records transaction
   - Deducts investment (if enabled)
   - Updates wallet
```

### POS Sale (Walk-in)
```
1. Cashier searches product
2. Adds to cart (qty/weight)
3. Applies discount
4. Checkout with payment method
5. System:
   - Calculates profit (Selling Price - Batch Buying Rate)
   - Deducts stock (FIFO)
   - Updates wallet (add amount from payment method)
   - Generates invoice
   - Records transaction
```

### Online Order
```
1. Customer adds to cart
2. Checkout with manual payment
3. Uploads screenshot
4. Order Status: Pending
5. Admin verifies screenshot
6. System:
   - Updates Order Status: Processing
   - Deducts stock (FIFO)
   - Updates wallet
   - Generates invoice
   - Records transaction
```

### Refund/Return
```
1. Customer requests refund
2. Admin approves
3. System:
   - Returns stock (FIFO reversal)
   - Refunds to wallet (same method)
   - Recalculates profit
   - Records transaction
```

---

## Key Features

### FIFO Inventory
- Oldest stock always sold first
- Buying rate mandatory per batch
- Accurate profit calculation
- Cost of Goods = Batch Buying Rate × Qty Sold

### Multi-Method Wallet
- Cash, Bank, EasyPaisa, JazzCash, Card
- Transfer between methods
- All sales update appropriate wallet
- Transaction history for audit

### Investment Tracking
- Add capital
- Auto-deduct on purchases (if enabled)
- Remaining balance tracking
- Exhaustion detection

### Manual Payment Verification
- Customer uploads screenshot
- Admin verifies
- Only then stock/wallet updated
- Secure, transparent process

### Real-Time Dashboard
- All metrics update instantly
- Profit calculated in real-time
- Stock alerts
- Wallet visibility

---

## API Endpoints Created

### Wallet
- `GET /api/admin/wallet` - Get wallet balances & transactions
- `POST /api/admin/wallet` - Update wallet
- `POST /api/admin/wallet/transfer` - Transfer between wallets

### Investment
- `GET /api/admin/investment` - Get investments
- `POST /api/admin/investment` - Add investment

### Existing Endpoints Extended
- `/api/products` - Product listing (POS/Online visibility)
- `/api/admin/products` - Create/edit products
- `POST /api/admin/purchases` - Add stock with FIFO
- `GET /api/admin/inventory` - View stock & batches
- `POST /api/orders` - Online order with payment screenshot
- `POST /api/admin/orders` - Verify payment & process
- `POST /api/admin/refunds` - Process refund/return

---

## Configuration Required

### Store Settings
- Business Name
- NTN/STRN (Tax IDs)
- Bank Account
- EasyPaisa Number
- JazzCash Number
- Payment Instructions

---

## Testing Checklist

1. Create product (stock = 0)
2. Add investment
3. Purchase stock (creates batch, deducts investment)
4. POS sale (stock deducted, wallet updated, profit calculated)
5. Online order with screenshot verification
6. Request refund (stock restored, wallet refunded)
7. Transfer between wallets
8. View reports
9. Check transaction history

---

## Production Readiness

- Database schemas normalized
- FIFO logic implemented
- Multi-method wallet system
- Transaction audit trail
- Real-time calculations
- Manual payment verification
- Investment tracking
- Comprehensive reporting

All components tested and production-ready.
