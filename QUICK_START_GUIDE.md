# Quick Start Guide - POS & Refund System

## 🚀 Getting Started in 5 Minutes

### Step 1: Login to Admin Panel
1. Go to `/admin`
2. Enter your admin credentials
3. You'll see the new menu items on the left sidebar

---

## 📱 SELLING ITEMS (POS Billing)

### For Walk-In Customers

**Location**: Admin → POS Billing

```
1. Search Product
   ├─ Type product name or barcode
   └─ Click product to add to cart

2. Build Cart
   ├─ Adjust quantity as needed
   ├─ Watch live totals update
   └─ Remove items if needed

3. Select Payment
   ├─ Cash (default)
   ├─ Card
   └─ Manual

4. Complete Sale
   ├─ Click "Complete Sale"
   ├─ FBR invoice generated
   └─ Receipt prints automatically
```

**What Happens Automatically:**
- ✅ Stock decreases
- ✅ FBR invoice sent
- ✅ Profit calculated
- ✅ Tax tracked

---

## 💰 REFUND REQUESTS (Online Orders)

### For Customers
1. Go to My Orders
2. Find the order
3. Click "Request Refund"
4. Enter reason
5. Submit

### For Admin - Approving Refunds

**Location**: Admin → Refund Requests

```
1. View Pending Requests
   └─ Filter by status if needed

2. Review Request Details
   ├─ Order information
   ├─ Refund amount requested
   ├─ Customer reason
   └─ Previous approvals (if any)

3. Make Decision
   ├─ APPROVE:
   │  ├─ Enter refund amount (can be less)
   │  ├─ Add notes (optional)
   │  └─ Click "Approve Refund"
   │
   └─ REJECT:
      ├─ Add notes (optional)
      └─ Click "Reject"

4. What Happens on Approval:
   ✅ Inventory restored
   ✅ Order marked as cancelled
   ✅ Customer notified
```

---

## 📊 CHECKING SALES (Reports)

### POS Sales Report

**Location**: Admin → POS Reports

Shows today's:
- Number of transactions
- Total revenue
- Profit earned
- Tax collected
- Average sale value

Can export to Excel/CSV for accounting.

---

## ⚙️ SETUP (One-Time Only)

### Configure FBR (Optional but Recommended)

**Location**: Admin → FBR Settings

```
Step 1: Enter Your Details
├─ NTN: Your National Tax Number
├─ STRN: Your Sales Tax Registration
├─ Device ID: From FBR
└─ Device Serial: From FBR

Step 2: Test Connection
└─ Click "Test Connection"

Step 3: Enable & Save
├─ Check "Enable FBR Integration"
└─ Click "Save Configuration"
```

**That's it!** All POS sales now go to FBR automatically.

---

## 📋 DAILY WORKFLOW

### Morning
```
☀️ Start your day:
1. Check Dashboard
2. Review overnight online orders
3. Verify payment screenshots
```

### During Day
```
🛍️ Selling:
1. Process walk-in sales via POS
2. Watch real-time profit tracking
3. Monitor stock levels
```

### Afternoon
```
📲 Orders:
1. Review refund requests
2. Approve/reject decisions
3. Process any urgent issues
```

### End of Day
```
📊 Closing:
1. Check POS Report
2. Export daily sales
3. Review FBR submission status
```

---

## 🎯 QUICK SHORTCUTS

| Task | Location |
|------|----------|
| Sell items | Admin → **POS Billing** |
| Check today's sales | Admin → **POS Reports** |
| Review refunds | Admin → **Refund Requests** |
| FBR settings | Admin → **FBR Settings** |
| Orders | Admin → **Orders** |

---

## ❓ FAQ

**Q: Can I refund a POS sale?**
A: No. POS sales are final and cannot be refunded. This is by design.

**Q: Can I give a partial refund?**
A: Yes! When approving, enter any amount up to the full order total.

**Q: What happens when I approve a refund?**
A: Items return to stock, profit/loss is adjusted, order is cancelled.

**Q: Where's the FBR invoice?**
A: Automatically generated in POS system. Number shown in receipt.

**Q: Can customers refund online purchases?**
A: Yes. They click "Request Refund" on their order page.

**Q: How long to respond to refund?**
A: 24 hours max. Faster is better for customer satisfaction.

**Q: How is profit calculated?**
A: Selling price - FIFO cost (oldest stock first).

---

## 🔑 Important Rules

✅ **DO:**
- Process refunds quickly
- Keep FBR settings updated
- Export daily POS reports
- Review payment screenshots before confirming
- Add notes to refund decisions

❌ **DON'T:**
- Refund POS sales (they're final)
- Forget to enable FBR before selling
- Share FBR API keys publicly
- Approve refunds without reviewing reason
- Ignore stock levels

---

## 📞 Need Help?

See complete documentation:
- `/POS_AND_REFUND_SYSTEM.md` - Full system guide
- `/IMPLEMENTATION_SUMMARY.md` - Technical details

---

## 🎓 Practice Scenario

### Practice POS Sale
```
1. Go to Admin → POS Billing
2. Search "flour" or any product
3. Add to cart, quantity 2
4. Select "Cash" payment
5. Click "Complete Sale"
6. You'll see receipt with FBR details
7. Check stock decreased
```

### Practice Refund
```
1. Go to Admin → Orders
2. Pick an online order
3. Go to Admin → Refund Requests
4. If one exists, approve it
5. Watch inventory restore
```

---

**Version**: 1.0
**Last Updated**: January 27, 2025
**Ready to Use**: ✅ Yes
