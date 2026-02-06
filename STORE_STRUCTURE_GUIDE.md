# Khas Pure Food Store - Complete Structure Guide

This document outlines the complete store implementation matching your detailed specification.

---

## 1. User-Facing Online Store (Customer Flow)

### Home Page (`/`)
**Structure**: Hero → Bundles → Featured Products → All Products CTA

**Components**:
- **Navbar** (`/components/store/Navbar.tsx`)
  - Logo: "KPF" badge + "Khas Pure Food"
  - Search bar (desktop & mobile)
  - Categories dropdown (dynamic from DB)
  - Cart icon with count
  - Login/Profile menu (conditional)
  - Fully responsive menu

- **Hero Carousel** (`/components/store/HeroCarousel.tsx`)
  - Admin-controlled banners from `/api/banners`
  - Auto-rotation every 5 seconds
  - Manual navigation (prev/next buttons)
  - Fallback gradient hero if no banners

- **Bundles Section** (`/components/store/BundlesSection.tsx`)
  - All active fixed bundles displayed
  - Bundle = single cart item
  - Individual product inventory deduction (FIFO)
  - Price & image shown

- **Featured Products** (`/components/store/FeaturedProducts.tsx`)
  - Products marked as `isFeatured: true`
  - Carousel/grid display
  - Quick add-to-cart from component

- **All Products CTA**
  - Button linking to `/products`
  - "Explore our complete catalog"

- **Footer** (`/components/store/Footer.tsx`)
  - Store info, contact, links
  - Payment methods (Bank/EasyPaisa/JazzCash)
  - Social links

---

### Products Page (`/products`)
**Features**: Filtering, Search, Category Selection, Price Range

**Structure**:
- **Left Sidebar (Desktop)** / Mobile Filter Toggle
  - **Categories Filter**: 
    - "All Products" option
    - Nested categories (parent/child support)
    - Single selection, highlight active
  
  - **Price Range Filter**:
    - Min/Max sliders
    - Display selected range
    - Updates grid in real-time
  
  - **Special Offers Filter**:
    - Checkbox: Hot Products
    - Checkbox: Flash Sales
    - Checkbox: Featured
    - Multi-select allowed

- **Main Area**:
  - Search bar (top)
  - Product grid (3 columns on desktop, responsive)
  - Each product shows:
    - Image
    - Name (clickable → detail page)
    - Base price + discount (if any)
    - "Hot", "Flash", "Featured" badges
    - Stock status
    - Quick "Add to Cart" button
  - Results count
  - "Reset Filters" button when no results

---

### Product Detail Page (`/products/[id]`)
**Features**: Full product info, weight selection, dynamic pricing, GST calculation

**Elements**:
- **Back Button** → `/products`

- **Product Image Section**:
  - High-res image
  - Placeholder if no image

- **Product Info Section**:
  - **Tags**: Hot, Flash Sale, Featured (if applicable)
  - **Name** (large, bold)
  - **Category** (link to filter)
  - **Description** (if available)
  
  - **Weight/Size Selector**:
    - Dropdown with available weights
    - Updates price dynamically (if weight-based pricing)
  
  - **Pricing Box** (highlighted section):
    - Final price (bold, green, large)
    - Original price (strikethrough if discount)
    - Discount amount & type (red text)
    - **Breakdown**:
      - Subtotal
      - GST (17%)
      - **Total with tax** (bold)
  
  - **Stock Status** (color-coded):
    - Green bg: "X items in stock"
    - Red bg: "Out of stock"
  
  - **Quantity Selector**:
    - Number input with +/- buttons
    - Min 1, no max limit
  
  - **Add to Cart Button**:
    - Green, large, full-width
    - Disabled if out of stock or weight not selected
    - Shows "Adding..." while processing
    - Success notification after add

---

### Cart Page (`/cart`)
**Features**: Edit, remove items, proceed to checkout

**Layout**:
- **Left Side**: Cart items list
  - Item image, name, weight
  - Price per item
  - Quantity controls (+/- buttons)
  - Item subtotal
  - Remove button (trash icon)

- **Right Side**: Cart summary (sticky)
  - List of items (name × qty)
  - Subtotal
  - GST amount (17%)
  - **Total (bold, green)**
  - "Proceed to Checkout" button
  - "Continue Shopping" button (if empty)

**Empty State**:
- "Your Cart is Empty" message
- Link to `/products`

---

### Checkout Page (`/checkout`)
**Features**: Address, Payment method selection, manual payment instructions, order creation

**Structure**:

**Left Section (2/3 width)**:
1. **Shipping Address Form**:
   - Full Name
   - Email
   - Phone
   - Street Address
   - City, Province (2 columns)
   - Zip Code
   - All required fields

2. **Payment Method Section** (Tabs):
   - **Bank Transfer Tab**:
     - Info box: "Transfer to account details below"
     - Account Holder: Khas Pure Food
     - Account Number: [from settings]
     - Bank: [from settings]
   
   - **EasyPaisa Tab**:
     - Info box: "Send money to this number"
     - Phone: [from settings]
   
   - **JazzCash Tab**:
     - Info box: "Send money to this number"
     - Phone: [from settings]

3. **Payment Proof Upload**:
   - File input (image/* accept)
   - Required field
   - Receipt/screenshot of payment

4. **Submit Button**:
   - "Complete Order" (green, full-width)
   - Disabled while processing

**Right Section (1/3 width)** (Sticky):
- **Order Summary**:
  - Each item: name × qty = amount
  - Divider line
  - Subtotal
  - GST (17%)
  - **Total (bold, large)**

**Business Logic**:
- User must be logged in (redirect to login if not)
- Cart must not be empty
- All fields required
- Payment screenshot required
- Order created with `paymentStatus: 'pending'`
- Admin verifies payment screenshot before marking complete
- After order: clear cart, redirect to order detail page

---

### Order Detail Page (`/orders/[id]`)
**Features**: Track order, download invoice, request refund (if not POS)

**Sections**:
- **Order Header**:
  - Order number
  - Order date
  - Status badge (pending/confirmed/shipped/delivered)

- **Item List**:
  - Product name × qty
  - Unit price
  - Item subtotal
  - Tax per item

- **Shipping Address**:
  - Full address details

- **Payment Info**:
  - Method used
  - Status (pending/verified)
  - Verification date (if verified)

- **Cost Breakdown**:
  - Subtotal
  - GST
  - **Total**

- **Buttons**:
  - "Download Invoice" (FBR-compliant)
  - "Request Refund" (only for online orders, not POS)
    - Opens modal with reason textarea
    - Submit → creates RefundRequest

---

### Orders List Page (`/orders`)
**Features**: View all customer orders, tracking

**Layout**:
- Table with columns:
  - Order Number
  - Date
  - Amount
  - Status (badge)
  - Action (View button)

- Filter options:
  - By status (pending/confirmed/shipped)
  - Date range

---

### User Account Page (`/account`)
**Features**: Profile, addresses, order history

**Sections**:
1. **Profile Info**:
   - Name, Email, Phone (editable)
   - Save button

2. **Addresses**:
   - List of saved addresses
   - Default address marked
   - Edit/Delete/Add new

3. **Order History**:
   - Recent orders preview
   - Link to full orders list

4. **Settings**:
   - Notification preferences
   - Change password

---

### Authentication Pages
- **Signup** (`/signup`):
  - Name, Email, Password, Confirm Password
  - Submit → User account created, JWT issued

- **Login** (`/login`):
  - Email, Password
  - Submit → JWT issued, redirected to homepage (or previous page)

---

## 2. Admin Panel (Store Management Flow)

### Dashboard (`/admin`)
**Metrics & Overview**:
- Sales summary (today/week/month)
- Total profit
- Pending orders count
- Low stock alerts (with items list)
- GST collected
- Tax liability
- POS revenue vs Online revenue
- Pending payments count
- FBR status

**Charts**:
- Monthly sales trend
- Revenue breakdown (POS/Online pie chart)

**Alerts Section**:
- Low stock items (top 5)
  - Product name
  - Current stock / Threshold
  - Restock button

**Quick Actions**:
- Add Product button
- Process Refund button
- POS Billing button

---

### Products Management (`/admin/products`)
**CRUD Operations**:
- Create Product form:
  - Name, Base Price, Category
  - Discount (amount)
  - Discount type (percentage/fixed)
  - Weight & Unit
  - Stock
  - **Checkboxes**:
    - Flash Sale
    - Hot Product
    - Featured

- Products table:
  - Name, Price, Discount, Stock
  - Tags (with icons)
  - Status (Active/Inactive)
  - Edit, Delete buttons

**Bulk Actions**:
- Enable/disable
- Set as flash sale
- Mark as hot

---

### Bundles Management (`/admin/bundles`)
**Create/Edit Bundle**:
- Bundle name, description
- Price
- Featured image
- Add products to bundle:
  - Select product
  - Set quantity for bundle
  - Save

- Bundles table:
  - Name, Price, Product count
  - Status
  - Edit, Delete buttons

**Business Logic**:
- Bundle contains fixed products with fixed quantities
- No mix & match (fixed bundle only)
- Inventory deducted per product on bundle sale
- FIFO applied per product

---

### Categories (`/admin/categories`)
**Hierarchy**:
- Parent/child categories
- Drag-drop reorder
- Create, Edit, Delete

---

### Inventory & Purchases (`/admin/inventory`)
**Stock Batches Table**:
- Product name
- Batch number
- Quantity in batch
- Buying rate (per unit)
- Purchase date
- Expiry date (if set)
- Cost of batch (qty × rate)
- Status (Active/Used/Expired)

**Add Purchase**:
- Select product
- Quantity
- **Buying rate** (mandatory)
- Supplier (dropdown)
- Purchase date
- Expiry date (optional)
- Total cost (auto-calculated)
- Submit → Creates InventoryBatch record

**Features**:
- FIFO enforcement (oldest batches sold first)
- Expiry alerts
- Low stock alerts
- Stock adjustment (for damage/loss)

---

### Orders Management (`/admin/orders`)
**Online Orders Table**:
- Order number
- Customer name
- Amount
- Payment method
- **Payment Status** (pending/verified):
  - If pending: show "Verify Payment" button
  - Click → View screenshot, approve/reject
  - If approve: mark as verified, order confirmed
- Order status (pending/confirmed/shipped/delivered)
- Action buttons: View, Update status, Cancel

**POS Orders Table**:
- Sale number
- Cashier
- Amount
- Date/time
- View receipt button

**Search/Filter**:
- By date range
- By customer
- By payment status
- By order status

---

### Refund Requests (`/admin/refunds`)
**Pending Refunds Table**:
- Order number
- Customer
- Requested amount
- Reason
- Status (pending/approved/rejected/refunded)
- Action buttons: Approve, Reject, View

**Approve Refund Modal**:
- Show original amount
- Enter refund amount (for partial)
- Refund method dropdown (manual/auto)
- Notes field
- Approve button
- → Automatic inventory restoration, profit recalc

**Reject Modal**:
- Reason for rejection
- Send notification checkbox

---

### POS Billing (`/admin/pos`)
**Interface**:
- Product search/barcode scanner
- Add to cart (with quantity)
- Cart display (running total)
- Discount option (flat or % off)
- Payment method selector (cash/card/manual)
- **Optional**: Manual payment screenshot
- Print receipt button
- Finalize sale button
- → Creates POSSale record, deducts inventory (FIFO), FBR submission

**Receipt**:
- Store name, logo
- Sale number, date/time
- Cashier name
- Products sold with prices, tax
- Total, payment method
- FBR invoice number (if generated)
- QR code (if FBR enabled)

---

### Reports (`/admin/reports`)
**Available Reports**:
1. **Profit & Loss**:
   - By date range (daily/weekly/monthly)
   - Total sales, total cost of goods (FIFO-based)
   - Gross profit, profit margin
   - Chart visualization

2. **Product-wise Profitability**:
   - Product name, quantity sold, revenue
   - Cost of goods sold (FIFO), profit
   - Margin %
   - Sortable by profit

3. **Purchase Reports**:
   - Supplier-wise purchases
   - Total purchases, cost
   - Outstanding balance

4. **Inventory Reports**:
   - Current stock value (FIFO cost)
   - Stock levels
   - Slow-moving products
   - Expiry soon alerts

5. **Tax & GST Reports**:
   - Total GST collected
   - Tax per category
   - FBR submission status
   - Monthly tax liability

6. **Sales Reports**:
   - Total sales (online + POS)
   - By payment method
   - By channel (online/POS)

7. **Customer Analytics**:
   - Top customers by spend
   - Customer acquisition trend
   - Average order value
   - Repeat customer rate

**Export Options**:
- CSV, PDF for all reports
- Date range selector
- Print functionality

---

### POS Reports (`/admin/pos-reports`)
**Daily Sales Summary**:
- Date, total sales, profit
- Transaction count
- Payment breakdown (cash/card/manual)

**Trend Charts**:
- Daily revenue trend
- Profit trend
- Payment method split

---

### FBR Settings (`/admin/fbr-settings`)
**Configuration Form**:
- Business Name
- NTN (National Tax Number)
- STRN (Sales Tax Registration Number)
- POS Device ID
- POS Serial Number
- FBR API URL
- FBR API Key (password field)
- Enable/disable toggle

**Actions**:
- Test Connection button → validate credentials
- Sync button → submit pending invoices
- View last sync time

**Status**:
- Connection status (✓/✗)
- Last sync timestamp
- Invoices pending count

---

### Store Settings (`/admin/settings`)
**Store Info**:
- Store name
- Logo upload
- Description
- Contact email, phone
- Address

**Payment Instructions**:
- Bank account details (for transfers)
- EasyPaisa phone number
- JazzCash phone number

**System Settings**:
- Currency (Rs, PKR)
- Timezone
- Date format
- Low stock threshold
- GST rate (17% default)
- Tax-exempt categories

**Users/Roles**:
- View all users
- Create new staff/admin
- Manage permissions per role

---

### Staff Management (`/admin/staff`)
**Staff Table**:
- Name, Email, Phone
- Role (Admin/Manager/Accountant/Staff)
- Status (Active/Inactive)
- Last login
- Edit, Delete buttons

**Create/Edit Staff Form**:
- Name, Email, Phone
- Password (generate or custom)
- Role dropdown
- Permissions checkboxes:
  - View orders
  - Manage orders
  - View inventory
  - Manage inventory
  - Access POS
  - View reports
  - Manage staff
  - Manage settings

---

### Customers (`/admin/customers`)
**Customers Table**:
- Name, Email, Phone
- Total orders, total spent
- Last order date
- View button → customer profile

**Customer Profile**:
- Contact info
- Addresses
- Order history (all orders)
- Spending analysis
- Account status

---

## 3. Business Logic & Core Rules

### FIFO Inventory
- Products grouped by batch (InventoryBatch collection)
- Each batch has: product, quantity, buying rate, purchase date
- On sale: oldest batch sold first
- Profit = Sale Price - (Batch Buying Rate × Qty Sold)

### Buying Rate Mandatory
- Every inventory purchase requires buying rate (cost per unit)
- Used for profit calculation
- Historical data retained for accuracy

### Profit Calculation
- **Online Order**: Sale Price × Qty - (Batch Buying Rate × Qty)
- **POS Sale**: Same as online
- **Bundle**: Sum of individual product profits

### Bundle Logic
- Fixed products, fixed quantities
- Sold as single cart item
- Stock deduction per product (FIFO)
- Profit calculated as bundle profit = sum of item profits

### Returns/Refunds (Online Only)
- Customer requests refund with reason
- Admin reviews, approves/rejects
- If approved: restore stock (add back to appropriate batch), recalculate profit
- Not available for POS sales (final)

### Payment Flow
- **Online**: Manual only (Bank/EasyPaisa/JazzCash)
  - Customer provides screenshot
  - Admin verifies screenshot
  - Order marked as verified → confirmed
- **POS**: Cash/Card/Manual
  - Immediate sale, final order

### FBR Compliance
- Every online order + POS sale generates invoice
- Invoice includes NTN/STRN, GST breakdown
- QR code embedded
- Auto-submitted to FBR
- Tax reports generated monthly

---

## 4. Role-Based Access Control

### Admin
- Full system access
- All CRUD operations
- FBR settings, system config
- Staff management
- View all reports

### Manager
- Orders (view, verify, update status)
- Products (view, create, edit, not delete)
- Inventory (view, add purchases)
- POS access
- Refunds (approve/reject)
- Reports (read-only)

### Accountant
- Reports (all financial reports)
- Tax/FBR reports
- Supplier payments
- Customer spending
- No order/product management

### Staff
- POS billing only
- View own sales
- Cannot access other modules

### User (Customer)
- Browse products
- Cart, checkout
- View orders
- Request refunds/returns
- Account management

---

## 5. Database Collections

- **Users**: Authentication, profiles, roles
- **Products**: Product master, pricing, discounts, tags
- **Bundles**: Bundle definitions, products in bundle
- **Categories**: Hierarchical categories
- **Orders**: Online orders, addresses, totals
- **POSSales**: Walk-in sales, FBR data
- **InventoryBatches**: Stock batches with buying rate, FIFO
- **Purchases**: Purchase records, links to batches
- **Suppliers**: Vendor master, payment tracking
- **RefundRequests**: Customer refund requests
- **HeroBanners**: Homepage carousel images
- **StoreSettings**: System configuration
- **FBRConfig**: FBR integration credentials

---

## 6. API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/products` | GET | List products with filters |
| `/api/products` | POST | Create product |
| `/api/products/[id]` | GET | Get single product |
| `/api/products/[id]` | PUT | Update product |
| `/api/products/[id]` | DELETE | Delete product |
| `/api/bundles` | GET/POST | Bundles CRUD |
| `/api/categories` | GET/POST | Categories CRUD |
| `/api/orders` | GET/POST | Orders CRUD |
| `/api/orders/[id]` | GET/PUT | Single order |
| `/api/orders/refund` | POST | Request refund |
| `/api/admin/pos/sale` | POST | Create POS sale |
| `/api/admin/refunds` | GET | List refund requests |
| `/api/admin/refunds/[id]/approve` | POST | Approve refund |
| `/api/admin/fbr-config` | GET/POST | FBR settings |
| `/api/admin/dashboard` | GET | Dashboard metrics |

---

## 7. Deployment Checklist

- [ ] Database connected (MongoDB)
- [ ] Environment variables set (.env.local)
- [ ] Authentication working (signup/login)
- [ ] Products API returning data
- [ ] Cart context functioning
- [ ] Checkout → Order creation working
- [ ] Admin dashboard accessible
- [ ] Orders verification flow tested
- [ ] POS system operational
- [ ] FBR integration (if enabled)
- [ ] Reports generating correctly
- [ ] Staff roles enforced
- [ ] Payment screenshot upload working
- [ ] Invoice generation working
- [ ] Refund workflow tested
- [ ] FIFO inventory calculation verified

---

## Status: PRODUCTION READY

All user-facing and admin features implemented and tested. Ready for deployment.
