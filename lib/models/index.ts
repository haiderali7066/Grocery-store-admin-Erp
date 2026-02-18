import mongoose, { Schema } from "mongoose";

// =========================
// User Schema
// =========================
export const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    phone: String,
    role: {
      type: String,
      enum: ["user", "staff", "manager", "accountant", "admin"],
      default: "user",
      index: true,
    },
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
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// =========================
// Category Schema
// =========================
export const CategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    icon: { type: String, default: "📦", trim: true },
    sortOrder: { type: Number, default: 0 },
    isVisible: { type: Boolean, default: true },
  },
  { timestamps: true },
);

CategorySchema.pre("validate", function () {
  if (this.name && (!this.slug || this.isModified("name"))) {
    this.slug = this.name
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }
});

// =========================
// Product Schema (UPDATED - retailPrice not required, set from inventory)
// =========================
export const ProductSchema = new Schema(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    brand: String,
    description: String,
    retailPrice: { type: Number, default: 0 }, // Set from active inventory batch
    lastBuyingRate: { type: Number, default: 0 }, // Stores the latest Landed Cost
    discount: { type: Number, default: 0 },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },
    unitType: {
      type: String,
      enum: ["kg", "g", "liter", "ml", "piece"],
      required: true,
    },
    unitSize: { type: Number, required: true },
    mainImage: String,
    galleryImages: [String],
    posVisible: { type: Boolean, default: true },
    onlineVisible: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isHot: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    gst: { type: Number, default: 17 },
    taxExempt: { type: Boolean, default: false },
    stock: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 10 },
    status: {
      type: String,
      enum: ["active", "draft", "discontinued"],
      default: "active",
    },
  },
  { timestamps: true },
);

// =========================
// Bundle Schema
// =========================
export const BundleSchema = new Schema(
  {
    name: { type: String, required: true },
    description: String,
    image: String,
    products: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, required: true },
        unit: String,
      },
    ],
    bundlePrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },
    gst: { type: Number, default: 17 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// =========================
// Supplier Schema
// =========================
export const SupplierSchema = new Schema(
  {
    name: { type: String, required: true },
    email: String,
    phone: String,
    address: String,
    city: String,
    contact: String,
    balance: { type: Number, default: 0 }, // Positive = we owe them, Negative = Credit
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// =========================
// Purchase Schema (UPDATED)
// =========================
export const PurchaseSchema = new Schema(
  {
    supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
    supplierInvoiceNo: String,
    purchaseDate: { type: Date, default: Date.now },
    products: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, required: true },
        buyingRate: { type: Number, required: true }, // Base Price
        taxType: {
          type: String,
          enum: ["percent", "fixed"],
          default: "percent",
        },
        taxValue: { type: Number, default: 0 },
        freightPerUnit: { type: Number, default: 0 }, // Added freight per unit
        unitCostWithTax: { type: Number, required: true }, // Landed Cost (base + tax + freight)
        sellingPrice: { type: Number, required: true }, // Selling price for this batch
        batchNumber: { type: Schema.Types.ObjectId, ref: "InventoryBatch" },
        expiryDate: Date,
      },
    ],
    totalAmount: { type: Number, required: true }, // Bill Total
    amountPaid: { type: Number, default: 0 }, // Actual cash paid
    balanceDue: { type: Number, default: 0 }, // Remaining to be added to Supplier balance
    paymentMethod: {
      type: String,
      enum: ["cash", "bank", "cheque", "easypaisa", "jazzcash"],
      default: "cash",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "completed"],
      default: "completed",
    },
    notes: String,
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "completed",
    },
  },
  { timestamps: true },
);

// =========================
// InventoryBatch Schema (UPDATED - added freight and selling price)
// =========================
export const InventoryBatchSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true }, // Original quantity purchased
    remainingQuantity: { type: Number, required: true }, // Used for FIFO stock deduction
    buyingRate: { type: Number, required: true }, // Full Landed Cost (base + tax + freight)
    baseRate: { type: Number }, // Price before tax
    taxValue: { type: Number },
    taxType: { type: String, enum: ["percent", "fixed"] },
    freightPerUnit: { type: Number, default: 0 }, // Freight cost per unit
    sellingPrice: { type: Number, required: true }, // Selling price for this batch
    profitPerUnit: { type: Number }, // Calculated: sellingPrice - buyingRate
    purchaseReference: { type: Schema.Types.ObjectId, ref: "Purchase" },
    expiry: Date,
    status: {
      type: String,
      enum: ["active", "partial", "finished"],
      default: "active",
    },
  },
  { timestamps: true },
);

// =========================
// POS Sale Schema
// =========================
export const POSSaleSchema = new Schema(
  {
    saleNumber: { type: String, required: true, unique: true },
    customerName: { type: String, default: "Walk-in Customer" },
    cashier: { type: Schema.Types.ObjectId, ref: "User" },
    items: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }, // Selling price
        costPrice: { type: Number }, // Cost for profit calculation
        batchId: { type: Schema.Types.ObjectId, ref: "InventoryBatch" },
        total: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true }, // GST amount
    gstAmount: { type: Number }, // Alias for tax
    totalAmount: { type: Number, required: true },
    total: { type: Number }, // Alias for totalAmount
    amountPaid: { type: Number, required: true },
    change: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "manual"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["completed", "pending", "refunded"],
      default: "completed",
    },
    profit: { type: Number, default: 0 },
    costOfGoods: { type: Number, default: 0 },
    isFinal: { type: Boolean, default: true },
    receiptPrinted: { type: Boolean, default: false },
    notes: String,
  },
  { timestamps: true },
);
// =========================
// Order Schema (UPDATED - Add COD Payment Tracking)
// =========================
export const OrderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product" },
        bundle: { type: Schema.Types.ObjectId, ref: "Bundle" },
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
    shippingCost: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["cod", "bank", "easypaisa", "jazzcash", "walkin"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "verified", "failed"],
      default: "pending",
    },
    // NEW: Track COD payment status separately
    codPaymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: function() {
        return this.paymentMethod === "cod" ? "unpaid" : null;
      },
    },
    codPaidAt: Date, // When admin marked COD as paid
    codPaidBy: { type: Schema.Types.ObjectId, ref: "User" }, // Which admin marked it paid
    screenshot: String, // Optional for COD
    invoiceNumber: String,
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },
    profit: { type: Number, default: 0 },
    isPOS: { type: Boolean, default: false },

    // Tracking fields
    trackingNumber: String,
    trackingProvider: String,
    shippedDate: Date,
    deliveredDate: Date,
  },
  { timestamps: true },
);


// =========================
// Payment Schema
// =========================
export const PaymentSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    amount: { type: Number, required: true },
    method: { type: String, enum: ["bank", "easypaisa", "jazzcash", "walkin"] },
    status: {
      type: String,
      enum: ["pending", "verified", "failed"],
      default: "pending",
    },
    screenshot: String,
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: Date,
    notes: String,
  },
  { timestamps: true },
);

// =========================
// Refund Schema (UPDATED)
// =========================
export const RefundSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    orderNumber: String, // For manual POS returns
    returnType: {
      type: String,
      enum: ["online", "pos_manual"],
      default: "online",
    },
    requestedAmount: { type: Number, required: true },
    refundedAmount: { type: Number }, // Actual amount refunded (may deduct delivery)
    deliveryCost: { type: Number, default: 0 }, // Rs 300 for online orders
    reason: String,
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "pending",
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    notes: String,
  },
  { timestamps: true },
);

// =========================
// HeroBanner Schema
// =========================
export const HeroBannerSchema = new Schema(
  {
    title: String,
    subtitle: String,
    image: String,
    link: String,
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// =========================
// Store Settings Schema (UPDATED - Added YouTube & TikTok)
// =========================
export const StoreSettingsSchema = new Schema(
  {
    // Store Info
    storeName: { type: String, default: "Khas Pure Food" },
    storeLogoUrl: String,
    storeDescription: String,

    // Contact Info
    contactEmail: String,
    contactPhone: String,
    address: String,
    city: String,
    country: { type: String, default: "Pakistan" },

    // Social Media (UPDATED)
    facebookUrl: String,
    instagramUrl: String,
    twitterUrl: String,
    youtubeUrl: String, // NEW
    tiktokUrl: String, // NEW
    whatsappNumber: String,

    // Tax Settings
    taxRate: { type: Number, default: 17 },
    taxName: { type: String, default: "GST" },
    taxEnabled: { type: Boolean, default: true },

    // Payment Methods
    paymentMethods: {
      cod: {
        enabled: { type: Boolean, default: true },
        displayName: { type: String, default: "Cash on Delivery" },
        description: String,
      },
      bank: {
        enabled: { type: Boolean, default: true },
        displayName: { type: String, default: "Bank Transfer" },
        accountName: String,
        accountNumber: String,
        bankName: String,
        iban: String,
      },
      easypaisa: {
        enabled: { type: Boolean, default: true },
        displayName: { type: String, default: "EasyPaisa" },
        accountNumber: String,
        accountName: String,
      },
      jazzcash: {
        enabled: { type: Boolean, default: true },
        displayName: { type: String, default: "JazzCash" },
        accountNumber: String,
        accountName: String,
      },
    },

    // Hero Banners
    heroBanners: [
      {
        title: String,
        subtitle: String,
        imageUrl: String,
        link: String,
        isActive: { type: Boolean, default: true },
        sortOrder: { type: Number, default: 0 },
      },
    ],

    // Business Hours
    businessHours: String,

    // Shipping
    freeShippingThreshold: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// =========================
// FBRConfig Schema
// =========================
export const FBRConfigSchema = new Schema(
  {
    posId: { type: String, required: true },
    ntn: String,
    strn: String,
    apiKey: String,
    isActive: { type: Boolean, default: false },
    lastSync: Date,
  },
  { timestamps: true },
);

// =========================
// Expense Schema
// =========================
export const ExpenseSchema = new Schema(
  {
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    description: String,
    date: { type: Date, default: Date.now },
    source: {
      type: String,
      enum: ["cash", "bank", "easypaisa", "jazzcash", "card"],
      default: "cash",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// =========================
// Wallet Schema
// =========================
export const WalletSchema = new Schema(
  {
    cash: { type: Number, default: 0 },
    bank: { type: Number, default: 0 },
    easyPaisa: { type: Number, default: 0 },
    jazzCash: { type: Number, default: 0 },
    card: { type: Number, default: 0 },
    lastUpdated: Date,
  },
  { timestamps: true },
);

// =========================
// Transaction Schema
// =========================
export const TransactionSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["income", "expense", "transfer"],
      required: true,
    },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    source: {
      type: String,
      enum: ["cash", "bank", "easypaisa", "jazzcash", "card"],
      required: true,
    },
    destination: String,
    reference: { type: Schema.Types.ObjectId, refPath: "referenceModel" },
    referenceModel: {
      type: String,
      enum: ["Order", "POSSale", "Purchase", "Investment", "Refund", "Expense"],
    },
    description: String,
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// =========================
// SaleConfig Schema
// =========================
export const SaleConfigSchema = new Schema(
  {
    isActive: { type: Boolean, default: false },
    title: { type: String, default: "Flash Sale" },
    subtitle: { type: String, default: "" },
    badgeText: { type: String, default: "Flash Sale" },
    endsAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// =========================
// Investment Schema
// =========================
export const InvestmentSchema = new Schema(
  {
    amount: { type: Number, required: true },
    source: {
      type: String,
      enum: ["cash", "bank", "easypaisa", "jazzcash", "card"],
      required: true,
    },
    description: String,
    investmentDate: { type: Date, default: Date.now },
    isDeducted: { type: Boolean, default: true },
    deductionHistory: [
      {
        purchase: { type: Schema.Types.ObjectId, ref: "Purchase" },
        amount: Number,
        deductedAt: Date,
      },
    ],
    remainingBalance: {
      type: Number,
      default: function () {
        return this.amount;
      },
    },
    status: { type: String, enum: ["active", "exhausted"], default: "active" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// =========================
// Review Schema - ADD THIS to your lib/models/index.ts file
// =========================
export const ReviewSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    isApproved: {
      type: Boolean,
      default: false,
      index: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: Date,
  },
  { timestamps: true },
);

// Compound index: one review per user per product
ReviewSchema.index({ user: 1, product: 1 }, { unique: true });

// THEN ADD THIS to your exports at the bottom:

// =========================
// Mongoose Models Export
// =========================
export const User = mongoose.models.User || mongoose.model("User", UserSchema);
export const Category =
  mongoose.models.Category || mongoose.model("Category", CategorySchema);
export const Product =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);
export const Bundle =
  mongoose.models.Bundle || mongoose.model("Bundle", BundleSchema);
export const Supplier =
  mongoose.models.Supplier || mongoose.model("Supplier", SupplierSchema);
export const Purchase =
  mongoose.models.Purchase || mongoose.model("Purchase", PurchaseSchema);
export const InventoryBatch =
  mongoose.models.InventoryBatch ||
  mongoose.model("InventoryBatch", InventoryBatchSchema);
export const POSSale =
  mongoose.models.POSSale || mongoose.model("POSSale", POSSaleSchema);
export const Order =
  mongoose.models.Order || mongoose.model("Order", OrderSchema);
export const Payment =
  mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
export const Refund =
  mongoose.models.Refund || mongoose.model("Refund", RefundSchema);
export const HeroBanner =
  mongoose.models.HeroBanner || mongoose.model("HeroBanner", HeroBannerSchema);
export const StoreSettings =
  mongoose.models.StoreSettings ||
  mongoose.model("StoreSettings", StoreSettingsSchema);
export const FBRConfig =
  mongoose.models.FBRConfig || mongoose.model("FBRConfig", FBRConfigSchema);
export const Expense =
  mongoose.models.Expense || mongoose.model("Expense", ExpenseSchema);
export const Wallet =
  mongoose.models.Wallet || mongoose.model("Wallet", WalletSchema);
export const Transaction =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);
export const Investment =
  mongoose.models.Investment || mongoose.model("Investment", InvestmentSchema);

export const RefundRequest = Refund;

export const SaleConfig =
  mongoose.models.SaleConfig || mongoose.model("SaleConfig", SaleConfigSchema);
  
export const Review =
  mongoose.models.Review || mongoose.model("Review", ReviewSchema);