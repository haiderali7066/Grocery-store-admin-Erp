# Khas Pure Food ERP - Quick Start Guide

## Getting Started in 10 Minutes

### Step 1: Login to Admin Panel
```
URL: /admin/login
Username: admin@example.com
Password: [your password]
```

### Step 2: Configure Store Settings
Navigate to `/admin/settings`:
- Store Name: Khas Pure Food
- Business NTN/STRN
- Bank Account Details
- Payment Instructions

### Step 3: Add Products
Navigate to `/admin/products`:
```
Create Product:
- Name: Rice Premium
- SKU: RICE-001
- Category: Grains
- Brand: Local
- Unit Type: kg
- Unit Size: 1
- Retail Price: 150
- POS Visible: Yes
- Online Visible: Yes
- Status: Active
Stock: 0 (will add via purchase)
```

### Step 4: Add Investment (Capital)
Navigate to `/admin/investment`:
```
Click "Add Investment"
- Amount: 100,000
- Source: Cash
- Description: Initial Capital
```

**Result:** Wallet.cash = 100,000

### Step 5: Add Stock
Navigate to `/admin/purchases`:
```
Create Purchase:
- Supplier: Local Farmer
- Invoice No: INV-001
- Date: Today
  Product: Rice Premium
  - Buying Rate: 100 (per kg - IMPORTANT!)
  - Quantity: 1000
  - Batch: Auto
- Payment: Deduct from Investment: Yes
```

**Result:**
- FIFO batch created (100,000 kg @ Rs. 100/kg)
- Investment remaining: 0
- Stock: 1000kg Rice
- Wallet.cash: 100,000

### Step 6: Test POS Sale
Navigate to `/admin/pos`:
```
Search Product: Rice Premium
Add to Cart: 1kg
Checkout:
- Payment: Cash
- Total: 150
```

**Result:**
- Profit: 150 - 100 = Rs. 50
- Stock: 999kg
- Wallet.cash: 100,150
- Transaction recorded

### Step 7: View Dashboard
Navigate to `/admin`:
- Total Sales: 150
- Profit: 50
- Stock: 999kg Rice
- Wallet Balance: 100,150

### Step 8: Test Online Order
Navigate to `/products`:
```
Customer:
- Browse rice
- Add to cart: 1kg
- Checkout: Rs. 150
- Upload screenshot
```

**Result:**
- Order Status: Pending (unverified)
- Stock NOT deducted yet
- Wallet NOT updated yet

### Step 9: Verify Payment
Navigate to `/admin/orders`:
```
View pending order
- Review screenshot
- Click "Approve"
```

**Result:**
- Order Status: Processing
- Stock: 998kg (deducted)
- Wallet.cash: 100,300
- Profit: +50
- Transaction recorded

### Step 10: View Wallet & Investment
Navigate to `/admin/wallet`:
- Cash: 100,300
- Bank: 0
- Total: 100,300
- Transaction History: 3 entries (investment, pos sale, online sale)

Navigate to `/admin/investment`:
- Total Investment: 100,000
- Used: 100,000
- Remaining: 0
- Status: Exhausted

---

## Common Tasks

### Transfer Cash to Bank
1. Go to `/admin/wallet`
2. Transfer Section:
   - From: Cash
   - To: Bank
   - Amount: 50,000
3. Click Transfer
4. View updated balances

### Add More Investment
1. Go to `/admin/investment`
2. Click "Add Investment"
3. Amount: 50,000
4. Source: Bank
5. Click Add

### Request Refund (Customer View)
1. Go to Orders page
2. Click on order
3. Click "Request Refund"
4. Reason: Damaged item

### Approve Refund (Admin)
1. Go to `/admin/refunds`
2. View pending refund
3. Click "Approve"
4. Stock restored
5. Wallet refunded

### Generate Report
1. Go to `/admin/reports`
2. Select date range
3. Click "Generate Report"
4. Download PDF/Excel

---

## Key Concepts to Remember

### FIFO Batches
- When you buy 1000kg at Rs. 100/kg, that's ONE batch
- When you sell 100kg, it comes from that batch
- Profit: (Selling Price - Buying Rate) × Quantity
- Oldest batches always used first

### Wallets
- 5 separate wallets (Cash, Bank, EasyPaisa, JazzCash, Card)
- All sales update appropriate wallet
- Can transfer between wallets
- One total balance shown on dashboard

### Investment
- Add capital once at start
- System auto-deducts when you buy stock
- Track remaining balance
- Can add more anytime

### Manual Payment (Online)
- Customer uploads screenshot
- Order stays Pending until verified
- Stock/wallet only update after approval
- Admin has full control

---

## Important Notes

1. **Stock Always Starts at 0**
   - New products have no stock
   - Add stock via Purchase page
   - Creates FIFO batches automatically

2. **Buying Rate is MANDATORY**
   - Every purchase must have buying rate
   - System uses it for profit calculation
   - No default rates allowed

3. **FIFO is Automatic**
   - Oldest batch used first
   - No manual selection needed
   - Ensures accurate profit

4. **Transactions are Immutable**
   - All operations logged
   - Complete audit trail
   - Cannot be deleted

5. **Refunds are Online Only**
   - POS sales are FINAL
   - Only online orders can be refunded
   - Auto-restoration of stock & wallet

---

## Dashboard Metrics

**Real-Time Display:**
- Total Sales: POS + Online combined
- Total Profit: Sum of all profits
- Total Stock: All products combined
- Investment Remaining: Unspent capital
- Wallet Balances: All 5 methods

**Charts:**
- Sales trends (daily/weekly/monthly)
- Profit trends
- Stock levels
- Wallet-wise income

---

## Troubleshooting

### Problem: "Stock not deducted"
**Solution:** Verify purchase created FIFO batch successfully

### Problem: "Profit is wrong"
**Solution:** Check buying rate was entered correctly

### Problem: "Wallet not updated"
**Solution:** Verify order status is Processing (not Pending)

### Problem: "Can't add more investment"
**Solution:** Previous investment may be exhausted - add new investment

### Problem: "Product not visible in POS"
**Solution:** Check POS Visibility = Yes in product settings

---

## Support

For issues, check:
1. `/ERP_SYSTEM_GUIDE.md` - Full system documentation
2. `/SYSTEM_OVERVIEW.md` - Architecture & flow
3. `/IMPLEMENTATION_CHECKLIST_FINAL.md` - Detailed features

---

## Summary

```
Day 1:
1. Login → Settings → Products → Investment → Stock

Day 1 Results:
- Stock added (FIFO created)
- Investment tracked
- Ready to sell

Day 2 & Beyond:
- POS sales (instant checkout)
- Online orders (manual verification)
- Refunds (auto adjustment)
- Monitor Dashboard
- View Reports
```

**You're ready to go!**

---

**Version:** 1.0
**System:** Khas Pure Food ERP
**Status:** Production Ready
