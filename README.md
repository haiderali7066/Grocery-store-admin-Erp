# Khas Pure Food - Complete Grocery Store Software

A full-featured, production-ready e-commerce platform tailored for Pakistani grocery businesses with comprehensive admin management, FIFO inventory system, FBR-compliant invoicing, and real profit calculations.

## Features

### User-Facing Store
- **Home Page**: Hero carousel, featured products, special bundles section
- **Product Catalog**: Advanced filtering by category, price, weight, deals (Hot/Flash/Bundles)
- **Shopping Cart**: Real-time cart management with GST calculation
- **Checkout**: Manual payment options (Bank, EasyPaisa, JazzCash) with screenshot verification
- **User Accounts**: Profile management, address management, order history tracking
- **Order Management**: Order tracking, invoice downloads, refund requests

### Admin Panel
- **Dashboard**: Real-time sales metrics, profit snapshot, low stock alerts, pending orders
- **Product Management**: CRUD operations, weight-based pricing, flash sale/hot/featured flags
- **Bundle Management**: Fixed bundles with automatic inventory deduction and profit calculation
- **Category Management**: Unlimited categories with parent/child hierarchy
- **Inventory System**: 
  - FIFO (First-In-First-Out) stock tracking
  - Mandatory buying rate per purchase (core for profit calculation)
  - Batch-wise inventory with expiry date tracking
  - Low stock and expiry alerts
- **Supplier Management**: Supplier profiles, ledger tracking, payment management
- **Orders Management**: Online + POS orders, payment verification, status updates, refunds
- **Reports & Analytics**:
  - Real profit & loss (FIFO-based)
  - Product-wise profit analysis
  - Inventory valuation
  - Sales, purchase, and tax reports
  - FBR-compliant tax reporting
- **Settings**: Store branding, payment method details, NTN/STRN storage

### Business Logic
- **FIFO Inventory**: First stock bought is first stock sold - ensures accurate profit calculation
- **Profit Calculation**: Selling Price - FIFO Buying Cost (automatic and accurate)
- **Bundles**: Fixed bundles sold as single cart items with automatic inventory deduction
- **Manual Payments**: Screenshot-based payment verification with admin approval
- **GST Calculation**: 17% GST with tax-exempt product support
- **FBR Compliance**: Invoice generation compatible with Pakistan's Federal Board of Revenue

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcrypt password hashing
- **UI Components**: shadcn/ui with Tailwind CSS
- **Charts**: Recharts for analytics visualization

## Project Structure

```
├── app/
│   ├── admin/              # Admin panel pages
│   ├── api/                # API routes
│   ├── orders/             # User orders pages
│   ├── cart/               # Shopping cart page
│   ├── checkout/           # Checkout page
│   ├── login/              # Login page
│   ├── signup/             # Signup page
│   ├── account/            # User account page
│   └── page.tsx            # Home page
├── components/
│   ├── admin/              # Admin components
│   └── store/              # Store components
├── lib/
│   ├── auth.ts             # Authentication utilities
│   ├── db.ts               # MongoDB connection
│   ├── inventory.ts        # FIFO inventory system
│   ├── invoice.ts          # Invoice generation
│   ├── contexts/           # Auth & Cart contexts
│   └── models/             # MongoDB schemas
└── public/                 # Static assets
```

## Database Models

- **Users**: Customer accounts with addresses and order history
- **Products**: With weight options, pricing, stock, GST, and flags
- **Bundles**: Fixed product bundles with pricing and status
- **Categories**: Hierarchical product categories
- **Orders**: Online and POS orders with payment and fulfillment tracking
- **InventoryBatches**: FIFO-tracked stock batches with buying rates
- **Purchases**: Supplier purchases with mandatory buying rates
- **Suppliers**: Supplier information with ledger balances
- **Payments**: Payment records with verification status
- **Refunds**: Refund tracking with approval workflow
- **HeroBanners**: Admin-controlled carousel images
- **TaxReports**: GST and tax compliance records

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Required environment variables set

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd khas-pure-food
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set environment variables** in `.env.local`:
   ```
   MONGODB_URI=your_mongodb_connection_string
   NEXT_PUBLIC_APP_NAME=Khas Pure Food
   JWT_SECRET=your-secret-key-min-32-chars
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   ```
   http://localhost:3000
   ```

## Key Features Implementation

### FIFO Inventory System
The FIFO system ensures that when products are sold, the oldest inventory batch is deducted first. This provides:
- Accurate profit calculations
- Proper handling of expiry dates
- Batch-level tracking with buying rates

**Usage Example:**
```typescript
// Deduct inventory using FIFO
const { totalCost, deductions } = await deductInventoryFIFO(
  productId,
  quantityToDeduct
);

// Calculate profit
const profit = (sellingPrice * quantity) - totalCost;
```

### Profit Calculation
Profit is calculated automatically:
- Revenue = Selling Price × Quantity
- Cost = FIFO Buying Rate × Quantity (from oldest batch)
- Profit = Revenue - Cost - Taxes

### Bundle Management
- **Fixed Bundles Only**: Predefined product combinations
- **Automatic Deduction**: Inventory deducted per product when bundle is sold
- **Profit Calculation**: Total bundle profit calculated from individual product costs

### FBR-Compliant Invoicing
Invoices include:
- NTN and STRN numbers
- GST calculations per item
- Tax-exempt item tracking
- Payment method details
- Compliance notices for Pakistani tax requirements

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Products
- `GET /api/products` - Get products with filters
- `POST /api/admin/products` - Create product (admin)

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get order details
- `PATCH /api/orders/:id` - Update order (admin)

### Admin
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/orders` - All orders (admin)
- `GET /api/admin/inventory` - Inventory status (admin)
- `POST /api/admin/purchases` - Record purchase (admin)
- `GET /api/admin/reports` - Generate reports (admin)

## User Roles

- **User**: Can browse products, create orders, manage account
- **Admin**: Full access to all management features
- **Staff**: Limited admin access (customizable)

## Payment Methods

1. **Bank Transfer**: Manual with payment screenshot
2. **EasyPaisa**: Mobile payment with verification
3. **JazzCash**: Mobile payment with verification
4. **Walk-in (POS)**: For in-store sales

## Compliance & Security

- **Password Hashing**: bcrypt with salting
- **JWT Authentication**: Secure token-based auth
- **FBR Compliance**: GST calculation and invoice generation
- **Input Validation**: All user inputs validated
- **SQL Injection Protection**: MongoDB parameterized queries
- **CORS Protected**: API routes secured with authentication

## Future Enhancements

- Email notification system
- SMS alerts for low stock
- Advanced search and recommendations
- Customer reviews and ratings
- Loyalty program
- Multi-store support
- Real-time inventory sync
- Advanced analytics dashboard
- Automated backup system

## Support

For issues, questions, or feature requests, please contact:
- Email: info@khaspurefood.com
- Phone: +92 300 1234567

## License

This project is proprietary and confidential. Unauthorized copying, modification, or distribution is prohibited.

---

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Developer**: v0 AI Assistant  
**Store Name**: Khas Pure Food
