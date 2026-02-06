# System Architecture - POS & Refund System

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     KHAS PURE FOOD SYSTEM                       │
└─────────────────────────────────────────────────────────────────┘

                         ┌──────────────┐
                         │  Frontend    │
                         │   (React)    │
                         └──────┬───────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
   ┌─────────┐          ┌─────────────┐        ┌──────────────┐
   │   POS   │          │  Refund     │        │  Admin       │
   │ Billing │          │  Management │        │  Dashboard   │
   └────┬────┘          └─────┬───────┘        └──────┬───────┘
        │                     │                       │
        └─────────────────────┼───────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   ┌──────────┐          ┌──────────┐        ┌──────────────┐
   │ API      │          │ API      │        │ API          │
   │ Routes   │          │ Routes   │        │ Routes       │
   │ (POS)    │          │ (Refund) │        │ (FBR)        │
   └────┬─────┘          └─────┬────┘        └──────┬───────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   ┌──────────┐          ┌──────────┐        ┌──────────────┐
   │ MongoDB  │          │ Business │        │ FBR          │
   │ Database │          │ Logic    │        │ Integration  │
   └──────────┘          └──────────┘        └──────────────┘
```

---

## Data Flow Diagrams

### 1. POS Sale Flow

```
┌──────────┐
│  Customer │
│ (Walk-In) │
└─────┬────┘
      │
      ▼
┌─────────────────┐
│  POS Interface  │
│  • Search       │
│  • Add to Cart  │
│  • Enter QTY    │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│  Cart Calculation   │
│  • Subtotal         │
│  • GST (17%)        │
│  • Total            │
└────────┬────────────┘
         │
         ▼
┌──────────────────┐
│ Payment Selection│
│ • Cash           │
│ • Card           │
│ • Manual         │
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│ Create POS Sale      │
│ POST /api/admin/pos/ │
│ sale                 │
└────────┬─────────────┘
         │
    ┌────┴─────┐
    │           │
    ▼           ▼
┌─────────┐  ┌──────────────┐
│ MongoDB │  │ FBR System   │
│ Save    │  │ Submit       │
│ Sale    │  │ Invoice      │
└────┬────┘  └──────┬───────┘
     │              │
     │         ┌────▼────┐
     │         │          │
     │    ┌────▼─┐  ┌───▼──┐
     │    │ Get  │  │ Get  │
     │    │Invoice│  │QR    │
     │    │Number │  │Code  │
     │    └──────┘  └──────┘
     │
     ▼
┌──────────────┐
│ Update Stock │
│ (FIFO)       │
│ • Reduce qty │
│ • Mark batch │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│Calculate Profit
│ • Selling - Cost
│ • FIFO method
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Display     │
│  Receipt     │
│  • Sale #    │
│  • Items     │
│  • FBR Info  │
│  • Print     │
└──────────────┘
```

### 2. Refund Request Flow

```
┌─────────────┐
│   Customer  │
│ (Online)    │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ Order Details    │
│ Page             │
└────────┬─────────┘
         │
    ┌────▼──────────────────────┐
    │  Check Eligibility        │
    │  • NOT POS (isFOS=false)   │
    │  • NOT cancelled           │
    │  • NO pending refund       │
    └────────┬───────────────────┘
             │
      ┌──────┴──────┐
      │  Eligible?  │
      │             │
   YES│             │NO
      ▼             ▼
   ┌─────┐      ┌────────┐
   │Show │      │  Hide  │
   │Refund      │Refund  │
   │Button      │Button  │
   └──┬──┘      └────────┘
      │
      ▼
┌─────────────────┐
│ Refund Modal    │
│ • Enter Reason  │
│ • Submit        │
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│ POST /api/orders/ref │
│ und                  │
│ • orderId            │
│ • reason             │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Create RefundRequest │
│ MongoDB Save         │
│ Status: pending      │
└────────┬─────────────┘
         │
         ▼
┌──────────────────┐
│ Admin Reviews    │
│ GET /admin/      │
│ refunds          │
└─────────┬────────┘
          │
     ┌────┴────┐
     │          │
     ▼          ▼
 ┌────────┐  ┌──────┐
 │APPROVE │  │REJECT│
 └────┬───┘  └──┬───┘
      │         │
      ▼         ▼
  ┌────────┐ ┌────────┐
  │Restore │ │ Mark   │
  │Inventory│ │Rejected│
  │         │ │        │
  │Update   │ │Store   │
  │Profit   │ │Notes   │
  │         │ │        │
  │Cancel   │ │        │
  │Order    │ │        │
  └────────┘ └────────┘
```

### 3. FBR Integration Flow

```
┌─────────────────┐
│ Admin Settings  │
│ Page (FBR Setup)│
└────────┬────────┘
         │
    ┌────┴────────────────┐
    │                     │
    ▼                     ▼
┌────────────┐      ┌──────────────┐
│ Input      │      │ Test         │
│ Credentials│      │ Connection   │
│ • NTN      │      │              │
│ • STRN     │      │ POST /test   │
│ • Device   │      │ endpoint     │
│ • API Key  │      │              │
└─────┬──────┘      └────────┬─────┘
      │                      │
      ▼                      ▼
┌──────────────────┐  ┌────────────┐
│ Save to MongoDB  │  │ Validate   │
│ FBRConfig        │  │ Credentials│
└────────┬─────────┘  └────────┬───┘
         │                     │
         ▼                     ▼
      ┌──────────────────────┐
      │  Enable Integration  │
      │  isEnabled = true    │
      └──────────┬───────────┘
                 │
         ┌───────┴───────┐
         │               │
         ▼               ▼
   ┌──────────┐    ┌───────────┐
   │ POS Sale │    │ Sync      │
   │ Creation │    │ Command   │
   │          │    │ (Manual)  │
   │ Auto-    │    │           │
   │submits   │    │ Reconcile │
   │to FBR    │    │ Sales     │
   └────┬─────┘    └──────┬────┘
        │                 │
        ▼                 ▼
   ┌────────────────────────────┐
   │  POST to FBR API           │
   │  (submitToFBR)             │
   │                            │
   │  • Send invoice details    │
   │  • Get invoice number      │
   │  • Get QR code             │
   │  • Get transaction ID      │
   └─────┬──────────────────────┘
         │
    ┌────┴──────┐
    │            │
    ▼            ▼
┌───────┐   ┌────────┐
│ Success   │ Failed │
│ Status    │ Status │
│ = success │ = fail │
└───┬───┘   └───┬────┘
    │           │
    ▼           ▼
┌─────────────────────────┐
│ Update POSSale Record   │
│ • fbrInvoiceNumber      │
│ • fbrQrCode             │
│ • fbrTransactionId      │
│ • fbrStatus             │
└─────────────────────────┘
```

---

## Database Schema Diagram

```
┌─────────────────────────────┐
│        POSSale              │
├─────────────────────────────┤
│ _id: ObjectId               │
│ saleNumber: String (unique) │
│ cashier: Ref(User)          │
│ items: [                    │
│   {product, qty, price,     │
│    gst, subtotal}           ���
│ ]                           │
│ subtotal: Number            │
│ gstAmount: Number           │
│ totalAmount: Number         │
│ paymentMethod: Enum         │
│ paymentStatus: Enum         │
│ fbrInvoiceNumber: String    │
│ fbrQrCode: String           │
│ fbrTransactionId: String    │
│ fbrStatus: Enum             │
│ fbrResponse: Mixed          │
│ profit: Number              │
│ costOfGoods: Number         │
│ isFinal: Boolean (true)     │
│ createdAt: Date             │
└─────────────────────────────┘
         │
         │ foreign key
         │
         ▼
┌──────────────────┐
│      User        │
├──────────────────┤
│ _id: ObjectId    │
│ name: String     │
│ email: String    │
│ role: Enum       │
│ ...              │
└──────────────────┘

┌──────────────────────────────┐
│     RefundRequest            │
├──────────────────────────────┤
│ _id: ObjectId                │
│ order: Ref(Order)            │◄─────┐
│ requestedAmount: Number      │      │
│ reason: String               │      │
│ status: Enum (pending/...)   │      │
│ approvedBy: Ref(User)        │      │
│ approvedAt: Date             │      │
│ refundedAmount: Number       │      │
│ refundMethod: String         │      │
│ notes: String                │      │
│ createdAt: Date              │      │
└──────────────────────────────┘      │
                                      │
                        ┌─────────────┘
                        │ foreign key
                        │
                        ▼
                ┌────────────────┐
                │     Order      │
                ├────────────────┤
                │ _id: ObjectId  │
                │ orderNumber    │
                │ items: [...]   │
                │ total: Number  │
                │ isPOS: Boolean │
                │ orderStatus    │
                │ ...            │
                └────────────────┘

┌──────────────────────────────┐
│     FBRConfig                │
├──────────────────────────────┤
│ _id: ObjectId                │
│ businessName: String         │
│ ntn: String                  │
│ strn: String                 │
│ posDeviceId: String          │
│ posDeviceSerialNumber: String│
│ fbrApiUrl: String            │
│ fbrApiKey: String (encrypted)│
│ isEnabled: Boolean           │
│ lastSyncTime: Date           │
└──────────────────────────────┘

┌──────────────────────────────┐
│   InventoryBatch             │
├──────────────────────────────┤
│ _id: ObjectId                │
│ product: Ref(Product)        │
│ quantity: Number             │
│ buyingRate: Number (FIFO)    │
│ purchaseReference: Ref(...)  │
│ expiry: Date                 │
│ status: Enum (active/...)    │
│ createdAt: Date              │
└──────────────────────────────┘
```

---

## API Route Structure

```
API Routes
│
├── /api/admin/pos/
│   └── sale/
│       ├── POST   (Create POS sale)
│       └── GET    (Get sales summary)
│
├── /api/admin/refunds/
│   ├── GET    (List refund requests)
│   ├── POST   (Admin create refund)
│   └── [id]/
│       ├── approve/
│       │   └── POST   (Approve refund)
│       └── reject/
│           └── POST   (Reject refund)
│
├── /api/orders/
│   └── refund/
│       └── POST   (Customer submit refund)
│
└── /api/admin/fbr-config/
    ├── GET       (Get FBR config)
    ├── POST      (Update FBR config)
    ├── test/
    │   └── POST  (Test FBR connection)
    └── sync/
        └── POST  (Sync with FBR)
```

---

## Component Hierarchy

```
AdminLayout
│
├── Sidebar
│   ├── Dashboard Link
│   ├── Orders Link
│   ├── Products Link
│   ├── ...
│   ├── POS Billing Link      ◄── NEW
│   ├── POS Reports Link      ◄── NEW
│   ├── Refund Requests Link  ◄── NEW
│   ├── FBR Settings Link     ◄── NEW
│   └── Logout Button
│
├── POSPage (NEW)
│   ├── Product Search
│   ├── ProductGrid
│   └── CartSummary
│       ├── CartItems
│       ├── PaymentMethod
│       └── CompleteButton
│
├── RefundsPage (NEW)
│   ├── FilterBar
│   ├── RefundsList
│   └── RefundDetailModal
│       ├── OrderInfo
│       ├── RefundForm
│       └── ApproveRejectButtons
│
├── FBRSettingsPage (NEW)
│   ├── StatusCard
│   ├── ConfigurationForm
│   ├── TestButton
│   └── SyncButton
│
├── POSReportsPage (NEW)
│   ├── SummaryCards
│   ├── Filters
│   ├── SalesTable
│   └── ExportButton
│
└── OrderDetailPage (ENHANCED)
    ├── OrderInfo
    ├── Items
    ├── Address
    ├── Summary
    ├── DownloadInvoice
    └── RefundRequestButton  ◄── NEW
        └── RefundModal      ◄── NEW
```

---

## Service Layer Architecture

```
Services
│
├── FBR Service (lib/fbr.ts)
│   ├── submitToFBR()
│   ├── verifyFBRConfiguration()
│   ├── getFBRConfig()
│   ├── syncWithFBR()
│   └── generateQRCode()
│
├── Inventory Service (lib/inventory.ts)
│   ├── processFIFO()
│   ├── calculateCost()
│   ├── updateStock()
│   └── createBatch()
│
├── Invoice Service (lib/invoice.ts)
│   ├── generateInvoice()
│   ├── formatForFBR()
│   └── calculateTax()
│
└── Auth Service (lib/auth.ts)
    ├── hashPassword()
    ├── verifyAuth()
    └── generateToken()
```

---

## User Role Access Control

```
Role Matrix
┌─────────────────────────────────────────────────────────┐
│ Feature          │ Admin │ Staff │ Customer │ Guest    │
├─────────────────────────────────────────────────────────┤
│ POS Billing      │  ✅   │  ⚠️   │    ❌    │   ❌    │
│ Refund Review    │  ✅   │  ⚠️   │    ❌    │   ❌    │
│ Submit Refund    │  ❌   │  ❌   │    ✅    │   ❌    │
│ FBR Settings     │  ✅   │  ❌   │    ❌    │   ❌    │
│ Reports          │  ✅   │  ⚠️   │    ❌    │   ❌    │
│ View Orders      │  ✅   │  ✅   │    ✅    │   ❌    │
│ Manage Inventory │  ✅   │  ⚠️   │    ❌    │   ❌    │
└─────────────────────────────────────────────────────────┘

✅ = Full Access
⚠️  = Limited Access
❌ = No Access
```

---

## Technology Stack

```
Frontend
│
├── Next.js 15        (Framework)
├── React 19          (UI Library)
├── TypeScript         (Type Safety)
├── Tailwind CSS       (Styling)
├── Lucide Icons       (Icons)
└── UI Components      (shadcn/ui)

Backend
│
├── Next.js API Routes (Server)
├── Node.js            (Runtime)
├── TypeScript         (Type Safety)
├── Mongoose           (ODM)
└── JWT                (Auth)

Database
│
├── MongoDB            (Main DB)
├── Collections:       (Data Stores)
│   ├── possales
│   ├── refundrequests
│   ├── fbrconfigs
│   ├── orders
│   ├── products
│   └── ...
└── Indexes            (Performance)

External Services
│
├── FBR API            (Invoice submission)
└── Email/SMS          (Notifications - optional)
```

---

## Security Layers

```
Request Flow Security
│
├── 1. HTTP Only Cookies
│   └── JWT Token stored securely
│
├── 2. Authentication Middleware
│   └── Verify token on every request
│
├── 3. Role-Based Authorization
│   └── Check user role for resource
│
├── 4. Input Validation
│   └── Validate all form inputs
│
├── 5. Mongoose Schemas
│   └── Database-level validation
│
├── 6. Error Handling
│   └── Don't expose system details
│
└── 7. API Rate Limiting
    └── Prevent abuse (optional)
```

---

## Deployment Architecture

```
Production Setup
│
├── Frontend (Vercel/Edge)
│   ├── Next.js App
│   ├── Static Assets
│   └── API Routes
│
├── Database (MongoDB Atlas)
│   ├── Collections
│   ├── Indexes
│   └── Backups
│
├── External Services
│   ├── FBR API
│   ├── Email Service
│   └── SMS Service
│
└── Environment Variables
    ├── MONGODB_URI
    ├── JWT_SECRET
    ├── FBR API Key
    └── ...
```

---

## Performance Optimization

```
Optimization Strategies
│
├── Database
│   ├── Indexed queries
│   ├── Lean queries (when possible)
│   └── Connection pooling
│
├── API
│   ├── Async/await patterns
│   ├── Batch processing
│   └── Caching (optional)
│
├── Frontend
│   ├── Code splitting
│   ├── Image optimization
│   └── Lazy loading
│
└── General
    ├── GZIP compression
    ├── CDN for assets
    └── Request debouncing
```

---

**Architecture Version**: 1.0
**Last Updated**: January 27, 2025
**Status**: Complete & Production Ready
