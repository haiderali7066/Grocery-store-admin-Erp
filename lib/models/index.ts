import mongoose, { Schema } from "mongoose";

// =========================
// User Schema
// =========================
export const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
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

    // ✅ Password Reset OTP Fields
    resetOTP: {
      type: String,
      select: false,
    },

    resetOTPExpire: {
      type: Date,
      select: false,
    },

    // ✅ Stores plain-text password for admin visibility only.
    // Updated whenever admin creates or resets a staff password.
    // Never used for authentication — bcrypt hash in `password` handles that.
    tempPassword: {
      type: String,
      default: null,
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
// Product Schema
// =========================
export const ProductSchema = new Schema(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    brand: String,
    description: String,
    retailPrice: { type: Number, default: 0 },
    lastBuyingRate: { type: Number, default: 0 },
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
    // ✅ NEW: tag this bundle to appear on the flash sale page
    isFlashSale: { type: Boolean, default: false },
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
    balance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// =========================
// Purchase Schema
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
        buyingRate: { type: Number, required: true },
        taxType: {
          type: String,
          enum: ["percent", "fixed"],
          default: "percent",
        },
        taxValue: { type: Number, default: 0 },
        freightPerUnit: { type: Number, default: 0 },
        unitCostWithTax: { type: Number, required: true },
        sellingPrice: { type: Number, required: true },
        batchNumber: { type: Schema.Types.ObjectId, ref: "InventoryBatch" },
        expiryDate: Date,
      },
    ],
    totalAmount: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
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
// InventoryBatch Schema
// FIX: Added isReturn field (was being set in manual route but not in schema,
//      causing Mongoose to silently drop it)
// =========================
export const InventoryBatchSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true },
    remainingQuantity: { type: Number, required: true },
    buyingRate: { type: Number, required: true },
    baseRate: { type: Number },
    taxValue: { type: Number },
    taxType: { type: String, enum: ["percent", "fixed"] },
    freightPerUnit: { type: Number, default: 0 },
    sellingPrice: { type: Number, required: true },
    profitPerUnit: { type: Number },
    purchaseReference: { type: Schema.Types.ObjectId, ref: "Purchase" },
    expiry: Date,
    isReturn: { type: Boolean, default: false }, // ✅ FIX: was silently dropped before
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
    customer: { type: Schema.Types.ObjectId, ref: "User", default: null },
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
        price: { type: Number, required: true },
        costPrice: { type: Number },
        batchId: { type: Schema.Types.ObjectId, ref: "InventoryBatch" },
        taxRate: { type: Number, default: 0 },
        taxAmount: { type: Number, default: 0 },
        total: { type: Number, required: true },
        // ✅ FIX: These fields were being set by the manual return route via
        //    updateOne $set but never declared here. While $set bypasses
        //    Mongoose schema for writes, having them declared makes reads
        //    (via .lean()) include them reliably and avoids confusion.
        returned: { type: Boolean, default: false },
        returnedAt: { type: Date, default: null },
        returnedQty: { type: Number, default: 0 },
      },
    ],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },
    discountValue: { type: Number, default: 0 },
    tax: { type: Number, required: true },
    gstAmount: { type: Number },
    totalAmount: { type: Number, required: true },
    total: { type: Number },
    amountPaid: { type: Number, required: true },
    change: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "online", "manual"],
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
// Order Schema
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
        // ✅ FIX: Same as POSSale — declare return tracking fields
        returned: { type: Boolean, default: false },
        returnedAt: { type: Date, default: null },
        returnedQty: { type: Number, default: 0 },
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
    codPaymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: function() {
        return this.paymentMethod === "cod" ? "unpaid" : null;
      },
    },
    codPaidAt: Date,
    codPaidBy: { type: Schema.Types.ObjectId, ref: "User" },
    screenshot: String,
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
// Refund Schema
// FIX: Added returnItems array — this was the PRIMARY bug causing the entire
//      return system to break. The manual route saved returnItems on the Refund
//      document, but since the field wasn't declared here, Mongoose stripped it
//      silently on every save. The search route then found Refund records but
//      with empty returnItems, so returnedKeys was always empty, and every item
//      appeared returnable on every search.
// =========================
export const RefundSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    orderNumber: { type: String, index: true }, // indexed for fast lookup in search route
    returnType: {
      type: String,
      enum: ["online", "pos_manual"],
      default: "online",
    },
    requestedAmount: { type: Number, required: true },
    refundedAmount: { type: Number },
    deliveryCost: { type: Number, default: 0 },
    reason: String,
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "pending",
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    notes: String,
    // ✅ PRIMARY FIX: returnItems was missing from the schema entirely.
    //    Every refund saved by manual/route.ts had this data stripped by Mongoose.
    returnItems: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product", default: null },
        name: { type: String, required: true },
        returnQty: { type: Number, required: true },
        unitPrice: { type: Number, required: true },
        lineTotal: { type: Number, required: true },
        restock: { type: Boolean, default: true },
      },
    ],
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
// Store Settings Schema
// =========================
export const StoreSettingsSchema = new Schema(
  {
    storeName: { type: String, default: "Khas Pure Food" },
    storeLogoUrl: String,
    storeDescription: String,
    contactEmail: String,
    contactPhone: String,
    address: String,
    city: String,
    country: { type: String, default: "Pakistan" },
    facebookUrl: String,
    instagramUrl: String,
    twitterUrl: String,
    youtubeUrl: String,
    tiktokUrl: String,
    whatsappNumber: String,
    taxRate: { type: Number, default: 17 },
    taxName: { type: String, default: "GST" },
    taxEnabled: { type: Boolean, default: true },
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
    businessHours: String,
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
      enum: ["Order", "POSSale", "Purchase", "Investment", "Refund", "Expense", "Supplier"],
    },
    description: String,
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
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
// Review Schema
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

ReviewSchema.index({ user: 1, product: 1 }, { unique: true });

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