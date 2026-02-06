import mongoose, { Schema } from 'mongoose';

// User Schema
export const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone: String,
    role: { type: String, enum: ['user', 'admin', 'staff'], default: 'user' },
    addresses: [
      {
        label: String,
        street: String,
        city: String,
        province: String,
        zipCode: String,
        country: String,
        isDefault: Boolean,
      },
    ],
    profileImage: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Category Schema
export const CategorySchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    description: String,
    image: String,
    parentCategory: { type: Schema.Types.ObjectId, ref: 'Category' },
    sortOrder: { type: Number, default: 0 },
    isVisible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Product Schema
export const ProductSchema = new Schema(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    brand: String,
    description: String,
    retailPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
    
    // Unit system
    unitType: { type: String, enum: ['kg', 'g', 'liter', 'ml', 'piece'], required: true },
    unitSize: { type: Number, required: true }, // e.g. 500 for 500g, 1 for 1kg
    
    // Images
    mainImage: String,
    galleryImages: [String],
    
    // Visibility
    posVisible: { type: Boolean, default: true },
    onlineVisible: { type: Boolean, default: true },
    
    // Display sections
    isFeatured: { type: Boolean, default: false },
    isHot: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    
    // Tax
    gst: { type: Number, default: 17 },
    taxExempt: { type: Boolean, default: false },
    
    // Stock (always 0 on creation, updated via purchases)
    stock: { type: Number, required: true, default: 0 },
    lowStockThreshold: { type: Number, default: 10 },
    
    // Status
    status: { type: String, enum: ['active', 'draft', 'discontinued'], default: 'active' },
  },
  { timestamps: true }
);

// Bundle Schema
export const BundleSchema = new Schema(
  {
    name: { type: String, required: true },
    description: String,
    image: String,
    products: [
      {
        product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true },
        unit: String,
      },
    ],
    bundlePrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
    gst: { type: Number, default: 17 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Supplier Schema
export const SupplierSchema = new Schema(
  {
    name: { type: String, required: true },
    email: String,
    phone: String,
    address: String,
    city: String,
    contact: String,
    balance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Purchase Schema (for inventory management)
export const PurchaseSchema = new Schema(
  {
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    supplierInvoiceNo: String,
    purchaseDate: { type: Date, default: Date.now },
    
    products: [
      {
        product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        buyingRate: { type: Number, required: true }, // Mandatory for FIFO
        quantity: { type: Number, required: true },
        batchNumber: { type: String, default: function() { return Date.now().toString(); } },
        expiryDate: Date,
      },
    ],
    
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['cash', 'bank', 'cheque', 'easypaisa', 'jazzcash'], default: 'cash' },
    paymentStatus: { type: String, enum: ['pending', 'completed'], default: 'completed' },
    
    // Finance
    deductFromInvestment: { type: Boolean, default: true },
    investmentUsed: { type: Schema.Types.ObjectId, ref: 'Investment' },
    amountFromInvestment: { type: Number, default: 0 },
    
    notes: String,
    status: { type: String, enum: ['pending', 'completed'], default: 'completed' },
  },
  { timestamps: true }
);

// Inventory Batch Schema (for FIFO tracking)
export const InventoryBatchSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    buyingRate: { type: Number, required: true },
    purchaseReference: { type: Schema.Types.ObjectId, ref: 'Purchase' },
    expiry: Date,
    status: { type: String, enum: ['active', 'partial', 'finished'], default: 'active' },
  },
  { timestamps: true }
);

// Order Schema
export const OrderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: 'Product' },
        bundle: { type: Schema.Types.ObjectId, ref: 'Bundle' },
        quantity: { type: Number, required: true },
        weight: String,
        price: { type: Number, required: true },
        discount: Number,
        gst: Number,
        subtotal: Number,
      },
    ],
    shippingAddress: {
      street: String,
      city: String,
      province: String,
      zipCode: String,
      country: String,
    },
    subtotal: { type: Number, required: true },
    gstAmount: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['bank', 'easypaisa', 'jazzcash', 'walkin'], required: true },
    paymentStatus: { type: String, enum: ['pending', 'verified', 'failed'], default: 'pending' },
    paymentScreenshot: String,
    invoiceNumber: String,
    orderStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    profit: { type: Number, default: 0 }, // Auto-calculated
    isPOS: { type: Boolean, default: false }, // Walk-in sales
    trackingNumber: String,
    trackingProvider: String,
    trackingURL: String,
    shippedDate: Date,
    deliveredDate: Date,
  },
  { timestamps: true }
);

// Payment Schema
export const PaymentSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    amount: { type: Number, required: true },
    method: { type: String, enum: ['bank', 'easypaisa', 'jazzcash', 'walkin'] },
    status: { type: String, enum: ['pending', 'verified', 'failed'], default: 'pending' },
    screenshot: String,
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,
    notes: String,
  },
  { timestamps: true }
);

// Refund Schema
export const RefundSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    amount: { type: Number, required: true },
    reason: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'pending' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
  },
  { timestamps: true }
);

// Hero Banner Schema
export const HeroBannerSchema = new Schema(
  {
    title: String,
    subtitle: String,
    image: String,
    link: String,
    sortOrder: Number,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Store Settings Schema
export const StoreSettingsSchema = new Schema({
  storeName: { type: String, default: 'Khas Pure Food' },
  logo: String,
  aboutUs: String,
  contactEmail: String,
  contactPhone: String,
  ntn: String,
  strn: String,
  bankAccountName: String,
  bankAccountNumber: String,
  easyPaisaNumber: String,
  jazzCashNumber: String,
  paymentInstructions: String,
});

// Tax Report Schema
export const TaxReportSchema = new Schema(
  {
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    totalTax: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    taxableItems: Number,
    taxExemptItems: Number,
    status: { type: String, enum: ['draft', 'submitted', 'approved'], default: 'draft' },
  },
  { timestamps: true }
);

// POS Sale Schema (Walk-in customers - FBR integrated)
export const POSSaleSchema = new Schema(
  {
    saleNumber: { type: String, required: true, unique: true },
    cashier: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true },
        weight: String,
        price: { type: Number, required: true },
        gst: Number,
        subtotal: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, required: true },
    gstAmount: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['cash', 'card', 'manual'], default: 'cash' },
    paymentStatus: { type: String, enum: ['completed', 'failed'], default: 'completed' },
    
    // FBR Integration
    fbrInvoiceNumber: String,
    fbrQrCode: String,
    fbrTransactionId: String,
    fbrStatus: { type: String, enum: ['pending', 'submitted', 'success', 'failed'], default: 'pending' },
    fbrResponse: Schema.Types.Mixed,
    
    // Profit tracking
    profit: { type: Number, default: 0 },
    costOfGoods: { type: Number, default: 0 },
    
    // Status - POS sales are FINAL, no cancellation/refund
    isFinal: { type: Boolean, default: false },
    receiptPrinted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// FBR Configuration Schema
export const FBRConfigSchema = new Schema({
  businessName: String,
  ntn: String,
  strn: String,
  posDeviceId: String,
  posDeviceSerialNumber: String,
  fbrApiUrl: String,
  fbrApiKey: String,
  isEnabled: { type: Boolean, default: true },
  lastSyncTime: Date,
});

// Refund Request Schema (Online Only)
export const RefundRequestSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    requestedAmount: { type: Number, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'refunded'], default: 'pending' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    refundedAmount: { type: Number, default: 0 },
    refundMethod: String,
    notes: String,
  },
  { timestamps: true }
);

// Wallet Schema (Finance tracking)
export const WalletSchema = new Schema(
  {
    cash: { type: Number, default: 0 },
    bank: { type: Number, default: 0 },
    easyPaisa: { type: Number, default: 0 },
    jazzCash: { type: Number, default: 0 },
    card: { type: Number, default: 0 },
    lastUpdated: Date,
  },
  { timestamps: true }
);

// Transaction Schema (Finance history)
export const TransactionSchema = new Schema(
  {
    type: { type: String, enum: ['income', 'expense', 'transfer'], required: true },
    category: { type: String, required: true }, // 'pos_sale', 'online_order', 'purchase', 'investment', 'refund', etc.
    amount: { type: Number, required: true },
    source: { type: String, enum: ['cash', 'bank', 'easypaisa', 'jazzcash', 'card'], required: true },
    destination: String, // For transfers
    reference: { type: Schema.Types.ObjectId, refPath: 'referenceModel' },
    referenceModel: { type: String, enum: ['Order', 'POSSale', 'Purchase', 'Investment', 'RefundRequest'] },
    description: String,
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Investment Schema
export const InvestmentSchema = new Schema(
  {
    amount: { type: Number, required: true },
    source: { type: String, enum: ['cash', 'bank', 'easypaisa', 'jazzcash', 'card'], required: true },
    description: String,
    investmentDate: { type: Date, default: Date.now },
    isDeducted: { type: Boolean, default: true }, // Auto-deduct from wallet on purchase
    deductionHistory: [
      {
        purchase: { type: Schema.Types.ObjectId, ref: 'Purchase' },
        amount: Number,
        deductedAt: Date,
      },
    ],
    remainingBalance: { type: Number, default: function() { return this.amount; } },
    status: { type: String, enum: ['active', 'exhausted'], default: 'active' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Enhanced Product Schema (for POS visibility and online visibility)
export const ProductVisibilitySchema = new Schema(
  {
    posVisible: { type: Boolean, default: true },
    onlineVisible: { type: Boolean, default: true },
    displaySection: {
      featured: { type: Boolean, default: false },
      hot: { type: Boolean, default: false },
      newArrival: { type: Boolean, default: false },
    },
  }
);

// Models
export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);
export const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
export const Bundle = mongoose.models.Bundle || mongoose.model('Bundle', BundleSchema);
export const Supplier = mongoose.models.Supplier || mongoose.model('Supplier', SupplierSchema);
export const Purchase = mongoose.models.Purchase || mongoose.model('Purchase', PurchaseSchema);
export const InventoryBatch = mongoose.models.InventoryBatch || mongoose.model('InventoryBatch', InventoryBatchSchema);
export const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);
export const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
export const Refund = mongoose.models.Refund || mongoose.model('Refund', RefundSchema);
export const HeroBanner = mongoose.models.HeroBanner || mongoose.model('HeroBanner', HeroBannerSchema);
export const StoreSettings = mongoose.models.StoreSettings || mongoose.model('StoreSettings', StoreSettingsSchema);
export const TaxReport = mongoose.models.TaxReport || mongoose.model('TaxReport', TaxReportSchema);
export const POSSale = mongoose.models.POSSale || mongoose.model('POSSale', POSSaleSchema);
export const FBRConfig = mongoose.models.FBRConfig || mongoose.model('FBRConfig', FBRConfigSchema);
export const RefundRequest = mongoose.models.RefundRequest || mongoose.model('RefundRequest', RefundRequestSchema);
export const Wallet = mongoose.models.Wallet || mongoose.model('Wallet', WalletSchema);
export const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
export const Investment = mongoose.models.Investment || mongoose.model('Investment', InvestmentSchema);
