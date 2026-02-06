# Khas Pure Food - Unified Retail ERP System
## Complete System Overview

---

## What This System Does

A single, unified platform that handles:

1. **POS (Point of Sale)** - Walk-in customer sales
2. **Online E-Commerce** - Customer ordering with payment verification
3. **Inventory Management** - FIFO stock tracking with batches
4. **Financial Management** - 5 payment method wallets (Cash, Bank, EasyPaisa, JazzCash, Card)
5. **Capital Management** - Investment tracking with auto-deduction
6. **Business Analytics** - Comprehensive reports and dashboards

All in one unified system where data flows seamlessly between all modules.

---

## Key Innovation: FIFO with Buying Rates

Instead of having generic stock, the system tracks:
- **Batch Number** - Which shipment of stock
- **Buying Rate** - Cost per unit when purchased
- **Quantity** - How many units in this batch
- **Expiry Date** - When it expires

When you sell, the system:
1. Uses the oldest batch first (FIFO)
2. Calculates profit as: `Selling Price - Buying Rate`
3. Automatically deducts from that specific batch
4. Creates complete audit trail

This ensures **accurate profit calculation** at all times.

---

## Real-World Flow

### Day 1: Start of Business

**Owner does:**
```
1. Add Rs. 100,000 investment (capital)
   System: Adds to wallet balance
   
2. Buy products from supplier
   - 1000kg Rice @ Rs. 100/kg = Rs. 100,000
   - 500L Oil @ Rs. 200/L = Rs. 100,000
   System: 
   - Creates FIFO batches
   - Deducts investment: Rs. 100,000 - Rs. 200,000 = Problem!
   Solution: Use multiple investments or own savings
```

### Day 2: First POS Sale

**Customer buys 1kg Rice for Rs. 150**
```
System calculates:
- Profit per unit: Rs. 150 (sale) - Rs. 100 (buying rate) = Rs. 50
- Total profit on sale: Rs. 50
- Wallet: Cash += Rs. 150
- Stock: Reduces rice batch by 1kg
- Transaction recorded: POS_SALE (income)

Dashboard shows:
- Total Sales: Rs. 150
- Total Profit: Rs. 50
- Cash Balance: Rs. 150
- Stock: 999kg Rice
```

### Day 3: Online Order

**Customer orders online, uploads screenshot**
```
Status: Pending (payment not verified yet)
System: Doesn't deduct stock or update wallet yet

Admin verifies screenshot, approves payment
```
Status: Processing
System:
- Deducts stock (FIFO batch)
- Adds to wallet (payment method selected)
- Calculates profit
- Creates transaction
- Generates invoice
```

### Day 4: Customer Wants Refund

**Customer requests refund**
```
Admin approves refund
System:
- Returns stock to FIFO batch
- Refunds wallet amount (same method)
- Recalculates profit (minus the sale)
- Marks order as refunded
- Creates transaction: REFUND (expense)
```

---

## Admin Panel Structure

### Finance Section
- **Dashboard** - Real-time metrics & charts
- **Wallet** - View 5 payment balances, transfer between methods
- **Investment** - Add capital, track remaining balance

### Operations Section
- **Products** - Manage catalog (SKU, brand, price, visibility)
- **Categories** - Organize products
- **Suppliers** - Track vendors

### Inventory Section
- **Purchase Stock** - Add inventory with buying rates
- **Inventory** - View stock, batches, expiry dates, low stock alerts

### Sales Section
- **POS** - Walk-in customer checkout
- **Orders** - Verify online payments, manage order status
- **Refunds** - Handle returns, approve/reject

### Admin Section
- **Staff** - Manage users and roles
- **Customers** - View customer profiles and history
- **Settings** - Configure store details

### Reporting Section
- **Reports** - Sales, profit, stock, finance analytics
- **POS Reports** - Daily sales tracking

---

## Database at a Glance

### Collections

| Collection | Purpose | Key Fields |
|-----------|---------|-----------|
| Products | Product catalog | SKU, price, visibility, status |
| Purchases | Stock purchases | Supplier, buying rate, batch number |
| InventoryBatches | FIFO tracking | Product, buying rate, quantity, expiry |
| Orders | Online orders | Items, status, payment screenshot |
| POSSale | Walk-in sales | Items, payment method, profit |
| Wallet | Payment balances | Cash, bank, easypaisa, jazzcash, card |
| Transaction | Finance history | Type, category, amount, source |
| Investment | Capital management | Amount, remaining balance, deduction history |

### Key Relationships

```
Product
  ↓
Purchase (adds stock)
  ↓
InventoryBatch (FIFO tracking)
  ↓
Order / POSSale (reduces stock)
  ↓
Wallet (updates balance)
  ↓
Transaction (audit trail)
```

---

## Features Matrix

| Feature | POS | Online | Admin | Mobile |
|---------|-----|--------|-------|--------|
| Browse products | - | Yes | - | Yes |
| Search | Yes | Yes | Yes | Yes |
| Add to cart | - | Yes | - | Yes |
| Checkout | Yes | Yes | - | Yes |
| Upload screenshot | - | Yes | - | Yes |
| Verify payment | - | - | Yes | - |
| POS checkout | Yes | - | Yes | - |
| Manage inventory | - | - | Yes | - |
| View reports | - | - | Yes | - |
| Track order | - | Yes | Yes | Yes |
| Request refund | - | Yes | Yes | Yes |

---

## Payments Flow

### POS (Walk-in)
```
1. Customer selects payment method (Cash/Card/etc)
2. Pays immediately
3. System updates wallet
4. Stock deducted instantly
5. Receipt printed
6. Sale is final
```

### Online
```
1. Customer selects payment method
2. Uploads screenshot as proof
3. Order Status: Pending
4. Admin verifies screenshot
5. Admin approves/rejects
6. If approved:
   - Stock deducted
   - Wallet updated
   - Order Status: Processing
7. If rejected:
   - Customer notified
   - No stock/wallet changes
```

---

## Reports Available

1. **Sales Report**
   - Total sales (POS + Online)
   - By product
   - By payment method
   - By date range

2. **Profit Report**
   - Product-wise profit/loss
   - Wallet-wise income
   - Daily/weekly/monthly trends

3. **Stock Report**
   - Current stock levels
   - FIFO batches
   - Expiry dates
   - Low stock alerts

4. **Finance Report**
   - Investment vs expense
   - Wallet-wise breakdown
   - Transaction history
   - Capital remaining

---

## Security & Audit

- **Manual Payment Verification** - Admin reviews screenshots
- **Transaction Audit Trail** - Every financial operation logged
- **Batch Tracking** - Complete history of each product batch
- **Role-Based Access** - Different user permissions
- **Profit Calculation** - Based on actual buying rates, not estimates

---

## Why This Design?

1. **Unified** - One database for all operations
2. **Real-time** - All metrics update instantly
3. **Accurate** - FIFO ensures correct profit calculation
4. **Scalable** - Can handle POS, online, and inventory simultaneously
5. **Auditable** - Complete transaction trail
6. **Flexible** - 5 payment methods supported
7. **Transparent** - Manual payment verification builds trust

---

## Ready for Production

All core functionality implemented:
- Product management with visibility controls
- FIFO inventory with batch tracking
- Multi-method wallet system
- Investment capital tracking
- POS checkout system
- Online order management
- Refund workflow
- Complete transaction logging
- Real-time dashboard
- Comprehensive reporting

**Status:** PRODUCTION READY
