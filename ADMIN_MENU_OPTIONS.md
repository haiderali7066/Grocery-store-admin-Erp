# Admin Panel - Complete Menu Options Guide

## Admin Dashboard Navigation

The admin panel contains **16 main modules** organized into 5 categories for easy access.

---

## 1. FINANCIAL MANAGEMENT (2 Options)

### 1.1 Wallet & Finance
**Path**: `/admin/wallet`
**Purpose**: Track and manage all payment methods

**Wallet Types Tracked**:
- Cash
- Bank
- EasyPaisa
- JazzCash
- Card

**Features**:
- View current balance in each wallet
- Transfer funds between wallets
- View complete transaction history
- Real-time balance updates
- Transaction filtering by date/type
- Export transaction reports

**Auto-Tracked From**:
- POS sales (add to cash/selected payment)
- Online orders (payment verified)
- Purchases (deduct from wallet)
- Refunds (refund to original wallet)
- Returns (add back to wallet)

---

### 1.2 Investment
**Path**: `/admin/investment`
**Purpose**: Manage investor capital and track usage

**Features**:
- Add new investment (specify amount, source, investor name)
- View investment details with date
- Track remaining balance after deductions
- View deduction history (which purchases used capital)
- Set investment as active/exhausted
- Filter by investor or date range

**Auto-Deduction From**:
- Purchases automatically deduct from investment first
- Tracks which batches were funded by investment
- Shows remaining capital availability

---

## 2. OPERATIONS (4 Options)

### 2.1 Staff
**Path**: `/admin/staff`
**Purpose**: Manage users and their roles

**Staff Actions**:
- Add new staff member (email, name, role)
- Edit staff details
- Change staff role
- Deactivate/Activate staff
- View staff activity log

**Roles Available**:
- **Admin**: Full system access
- **Manager**: Limited to products, inventory, orders, POS
- **Accountant**: Reports and financial views only
- **Staff**: POS and basic inventory only

**Features**:
- Search by name/email
- Filter by role
- View last login time
- Track staff actions
- Reset password

---

### 2.2 Products
**Path**: `/admin/products`
**Purpose**: Create and manage product catalog

**Required Fields**:
- Product Name
- SKU (unique identifier)
- Retail Price
- Category (select from existing or create new)
- Unit Type (kg, g, liter, ml, piece)
- Product Image (upload to Cloudinary)

**Optional Fields**:
- Discount (% or fixed amount)
- Hot section (toggle)
- Featured section (toggle)
- Sale status

**Admin Actions**:
- Show/Hide product
- Apply sale/remove sale
- Manage visibility in sections
- Edit any field
- Delete product
- Bulk upload products

**Display Sections**:
- Hot Products (trending items)
- Featured Products (highlighted items)
- Sale Items (discounted products)
- New Arrivals (recent products)

---

### 2.3 Categories
**Path**: `/admin/categories`
**Purpose**: Organize products into categories

**Required Fields**:
- Category Name
- Status (Active/Inactive)

**Features**:
- Create category
- Edit category name
- Toggle active/inactive
- View products in category
- Delete empty category
- Nested categories support

---

### 2.4 Suppliers
**Path**: `/admin/suppliers`
**Purpose**: Manage supplier information

**Required Fields**:
- Supplier Name
- Phone/Contact Information

**Features**:
- Add new supplier
- Edit supplier details
- View purchase history
- Track account balance (payable/receivable)
- Filter by active/inactive
- Contact supplier directly

---

## 3. INVENTORY & ORDERS (3 Options)

### 3.1 Inventory
**Path**: `/admin/inventory`
**Purpose**: Manage stock through purchases (FIFO system)

**Purchase Creation Process**:
1. Select Product
2. Select Supplier
3. Enter Buying Price (Mandatory for FIFO calculation)
4. Enter Quantity
5. System auto-generates Batch Number
6. Set Purchase Date

**System Actions on Purchase**:
- Creates FIFO batch for stock tracking
- Updates product stock quantity
- Auto-deducts from investment (if enabled)
- Creates transaction record
- Auto-deducts from wallet

**Inventory Features**:
- View all purchases/batches
- Track batch expiry dates
- Monitor stock levels
- View cost of goods (buying price)
- FIFO stock deduction on sales
- Low stock alerts

**Batch Information**:
- Batch number (auto-generated)
- Product name
- Quantity added
- Buying rate (cost per unit)
- Supplier name
- Purchase date
- Expiry date (if applicable)

---

### 3.2 Orders
**Path**: `/admin/orders`
**Purpose**: Process and track online customer orders

**Order Status Flow**:
1. **Pending** - Customer uploaded payment screenshot
2. **Confirmed** - Admin verified payment, order confirmed
3. **Shipped** - Order sent to customer
4. **Delivered** - Customer received order

**Admin Actions**:
- View all pending orders
- Review payment screenshot
- Approve order (move to Confirmed)
- Reject order (with reason)
- Add tracking number
- Add courier name
- Print order details
- View customer information

**Order Details View**:
- Customer name & contact
- Delivery address
- Items ordered (product, quantity, price)
- Total with GST breakdown
- Payment method used
- Payment screenshot
- Order status
- Tracking information

**Return Management**:
- View return requests from customers
- Approve/Reject returns
- Process refund
- Auto-restore stock on approval
- Track return reason

---

### 3.3 Returns & Refunds
**Path**: `/admin/refunds`
**Purpose**: Handle returns and refund requests

**Return Types**:
- **Online Return**: Customer initiates, admin approves
- **In-Store Return**: Direct return at store

**Admin Capabilities**:
- View all return/refund requests
- Filter by status (Pending/Approved/Rejected/Completed)
- Approve return (auto-restore stock)
- Reject return (with reason)
- Process refund to wallet
- Add notes/reason for decision
- View timeline of return

**Auto-Actions on Approval**:
- Stock added back to inventory
- Wallet credited with refund amount
- Transaction recorded
- Loss entry (₨300 auto loss for online return)

**Return Information**:
- Customer name
- Original order details
- Return reason
- Items to return
- Refund amount
- Current status

---

## 4. SALES (1 Option)

### 4.1 POS Billing
**Path**: `/admin/pos`
**Purpose**: Offline in-store sales system (walk-in customers)

**POS Process**:
1. Select Product
2. Choose Unit/Weight (if available)
3. Enter Quantity
4. Item added to cart
5. Continue adding items or checkout

**Checkout Process**:
1. View cart summary
2. Auto-calculate GST (17%)
3. Select payment method (from wallet)
4. Complete sale
5. Print receipt

**Payment Methods**:
- Cash
- Bank
- EasyPaisa
- JazzCash
- Card

**Receipt Includes**:
- Store name
- Store details
- Items list (product, qty, price)
- Subtotal
- GST amount
- Total amount
- Payment method
- Sale date & time
- Receipt number

**Auto-System Actions**:
- Stock deducted immediately from FIFO
- Cost calculated using FIFO batch rates
- Profit calculated automatically
- Wallet updated with payment
- Transaction recorded
- Receipt saved

---

## 5. REPORTS & ANALYSIS (2 Options)

### 5.1 Reports
**Path**: `/admin/reports`
**Purpose**: Comprehensive business analytics

**Report Types**:

#### Sales Report
- Total sales (online + POS combined)
- Daily/Weekly/Monthly breakdown
- Product-wise sales
- Category-wise sales
- Revenue trends

#### Purchase Report
- Total purchases
- Supplier-wise breakdown
- Product-wise cost analysis
- Date range filtering

#### Investment Report
- Total investment added
- Current remaining balance
- Deduction history
- Investor details

#### Profit & Loss
- Gross profit calculation
- Profit by product
- Profit by category
- Profit by sale type (POS vs Online)
- Cost of goods calculation (FIFO)

#### Stock & Batch Report
- Current stock levels
- Batch inventory details
- Expiry date tracking
- Stock value calculation
- Low stock items alert

#### Return & Refund Report
- Total returns processed
- Total refunds issued
- Return reasons breakdown
- Refund amount by product
- Return rate analysis

#### Customer Analytics
- Top customers by order count
- Top customers by spending
- Customer lifetime value
- New vs returning customers
- Customer order frequency

**Export Options**:
- CSV format
- PDF format
- Date range selection
- Print directly

---

### 5.2 POS Reports
**Path**: `/admin/pos-reports`
**Purpose**: Offline sales analytics

**Features**:
- Daily POS sales summary
- Total cash collected
- Total profit
- Items sold count
- Product-wise POS sales
- Hourly sales breakdown

**Filters**:
- Date range
- Cashier (if multiple)
- Product category
- Payment method

**Metrics**:
- Total transactions
- Average transaction value
- Peak hours
- Best-selling items
- Sales trend

---

## 6. SYSTEM (2 Options)

### 6.1 FBR Settings
**Path**: `/admin/fbr-settings`
**Purpose**: Configure tax compliance integration

**Configuration Fields**:
- NTN (National Tax Number)
- STRN (Sales Tax Registration Number)
- Business Name
- POS Device ID
- POS Device Serial Number
- FBR API URL
- FBR API Key

**Features**:
- Test FBR connection
- Enable/Disable FBR
- View FBR status
- Manual sync trigger
- Invoice template setup
- QR code settings

**Auto-Actions**:
- Every POS sale auto-submits to FBR
- Receipt auto-generates with QR code
- Tax liability tracked
- Compliance reports

---

### 6.2 Settings
**Path**: `/admin/settings`
**Purpose**: System configuration and preferences

**Store Information**:
- Store name
- Store contact number
- Store email
- Store address

**Payment Instructions**:
- Bank account details
- EasyPaisa account
- JazzCash account
- Card payment details

**GST Settings**:
- Standard GST rate (default 17%)
- Tax-exempt products setting
- Invoice settings

**Notification Settings**:
- Email notifications (on/off)
- Order confirmation emails
- Payment verification reminders
- Low stock alerts

**System Preferences**:
- Language settings
- Currency format
- Date format
- Tax calculation method

---

## Summary Table

| Option # | Module | Path | Purpose |
|----------|--------|------|---------|
| 1 | Dashboard | `/admin` | Overview & metrics |
| 2 | Wallet & Finance | `/admin/wallet` | Payment tracking |
| 3 | Investment | `/admin/investment` | Capital management |
| 4 | Staff | `/admin/staff` | User management |
| 5 | Products | `/admin/products` | Product catalog |
| 6 | Categories | `/admin/categories` | Product organization |
| 7 | Suppliers | `/admin/suppliers` | Vendor management |
| 8 | Inventory | `/admin/inventory` | Stock purchases (FIFO) |
| 9 | Orders | `/admin/orders` | Online order processing |
| 10 | Returns & Refunds | `/admin/refunds` | Return management |
| 11 | POS Billing | `/admin/pos` | Offline sales |
| 12 | Reports | `/admin/reports` | Business analytics |
| 13 | POS Reports | `/admin/pos-reports` | Sales analytics |
| 14 | FBR Settings | `/admin/fbr-settings` | Tax configuration |
| 15 | Settings | `/admin/settings` | System configuration |

---

## Access Control by Role

### Admin (Full Access)
✅ All 15 modules
✅ Can create, edit, delete
✅ Can manage wallets & investments
✅ Can manage staff & roles
✅ Can view all reports
✅ Can change FBR & system settings

### Manager (Limited Access)
✅ Products (create/edit only)
✅ Inventory & Purchases
✅ Order Processing
✅ POS Billing
✅ POS Reports
❌ Cannot delete products
❌ Cannot manage wallets
❌ Cannot see full profit/loss details
❌ Cannot manage staff
❌ Cannot change FBR or investment settings
❌ Cannot access financial reports

---

## Quick Navigation

**Financial Management**: Wallet → Investment
**Daily Operations**: Staff → Products → Categories → Suppliers → Inventory
**Sales Processing**: Orders → Returns & Refunds → POS Billing
**Analysis**: Reports → POS Reports
**Configuration**: FBR Settings → Settings
