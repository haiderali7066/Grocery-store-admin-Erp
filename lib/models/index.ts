// FILE PATH: lib/models.ts

import mongoose, { Schema } from "mongoose";

// =========================
// User Schema
// =========================
export const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
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
    isActive: { type: Boolean, default: true },
    resetOTP: { type: String, select: false },
    resetOTPExpire: { type: Date, select: false },
    tempPassword: { type: String, default: null },
  },
  { timestamps: true },
);

// =========================
// Category Schema
// =========================
export const CategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
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
    discountType: { type: String, enum: ["percentage", "fixed"], default: "percentage" },
    unitType: { type: String, required: true },
    unitSize: { type: Number, default: 0 },
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
    status: { type: String, enum: ["active", "draft", "discontinued"], default: "active" },
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
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true },
        unit: String,
      },
    ],
    bundlePrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountType: { type: String, enum: ["percentage", "fixed"], default: "percentage" },
    gst: { type: Number, default: 17 },
    isActive: { type: Boolean, default: true },
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
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true },
        buyingRate: { type: Number, required: true },
        taxType: { type: String, enum: ["percent", "fixed"], default: "percent" },
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
    status: { type: String, enum: ["pending", "completed", "cancelled"], default: "completed" },
  },
  { timestamps: true },
);

// =========================
// InventoryBatch Schema
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
    isReturn: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "partial", "finished"], default: "active" },
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
        product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        costPrice: { type: Number },
        batchId: { type: Schema.Types.ObjectId, ref: "InventoryBatch" },
        taxRate: { type: Number, default: 0 },
        taxAmount: { type: Number, default: 0 },
        total: { type: Number, required: true },
        returned: { type: Boolean, default: false },
        returnedAt: { type: Date, default: null },
        returnedQty: { type: Number, default: 0 },
      },
    ],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountType: { type: String, enum: ["percentage", "fixed"], default: "percentage" },
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
// ✅ FIXED: items now include name, image, bundleId, bundleName
// ✅ FIXED: shippingAddress now includes fullName, email, phone
// =========================
export const OrderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },

    items: [
      {
        // For regular products: populated from Product
        product: { type: Schema.Types.ObjectId, ref: "Product" },
        // For bundle line items: reference to Bundle
        bundle: { type: Schema.Types.ObjectId, ref: "Bundle" },

        // ✅ Product/item name stored directly (required for bundles since
        //    product ref may differ from display name)
        name: { type: String, default: "" },

        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        subtotal: { type: Number, default: 0 },

        // ✅ Image URL stored directly for order history display
        image: { type: String, default: null },

        weight: { type: String, default: null },
        discount: { type: Number, default: 0 },
        gst: { type: Number, default: 0 },

        // ✅ Bundle grouping fields — set for every line item that came from a bundle
        bundleId: { type: String, default: null },
        bundleName: { type: String, default: null },

        // Return tracking
        returned: { type: Boolean, default: false },
        returnedAt: { type: Date, default: null },
        returnedQty: { type: Number, default: 0 },
      },
    ],

    // ✅ FIXED: Added fullName, email, phone (checkout sends these)
    shippingAddress: {
      fullName: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      province: { type: String, default: "" },
      zipCode: { type: String, default: "" },
      country: { type: String, default: "Pakistan" },
    },

    subtotal: { type: Number, required: true },
    gstAmount: { type: Number, required: true },
    taxRate: { type: Number, default: 0 },
    taxName: { type: String, default: "" },
    taxEnabled: { type: Boolean, default: false },
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

    // ── COD fields ───────────────────────────────────────────────────────
    codPaymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: function () {
        return (this as any).paymentMethod === "cod" ? "unpaid" : null;
      },
    },
    codPaidAt: Date,
    codPaidBy: { type: Schema.Types.ObjectId, ref: "User" },
    codDeliveryCharge: { type: Number, default: 0 },
    codDeliveryScreenshot: { type: String, default: null },
    codDeliveryPaid: { type: Boolean, default: false },
    // ────────────────────────────────────────────────────────────────────

    screenshot: String,
    invoiceNumber: String,
    orderStatus: {
      type: String,
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
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
    status: { type: String, enum: ["pending", "verified", "failed"], default: "pending" },
    screenshot: String,
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: Date,
    notes: String,
  },
  { timestamps: true },
);

// =========================
// Refund Schema
// =========================
export const RefundSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    orderNumber: { type: String, index: true },
    returnType: { type: String, enum: ["online", "pos_manual"], default: "online" },
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
        codDeliveryCharge: { type: Number, default: 0 },
        codEasypaisaAccount: { type: String, default: "" },
        codEasypaisaName: { type: String, default: "" },
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
    type: { type: String, enum: ["income", "expense", "transfer"], required: true },
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
        return (this as any).amount;
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
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
    isApproved: { type: Boolean, default: false, index: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
  },
  { timestamps: true },
);

ReviewSchema.index({ user: 1, product: 1 }, { unique: true });

// =========================
// StoreInfo Schema
// =========================
const storeInfoSchema = new mongoose.Schema({
  name: { type: String, default: "Khas pure foods" },
  address: { type: String, default: "123 Store Street, Lahore, Pakistan" },
  phone: { type: String, default: "0300-1234567" },
  email: { type: String, default: "info@khasspurefoods.com" },
  updatedAt: { type: Date, default: Date.now },
});

// =========================
// Mongoose Models Export
// =========================
export const User = mongoose.models.User || mongoose.model("User", UserSchema);
export const Category = mongoose.models.Category || mongoose.model("Category", CategorySchema);
export const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema);
export const Bundle = mongoose.models.Bundle || mongoose.model("Bundle", BundleSchema);
export const Supplier = mongoose.models.Supplier || mongoose.model("Supplier", SupplierSchema);
export const Purchase = mongoose.models.Purchase || mongoose.model("Purchase", PurchaseSchema);
export const InventoryBatch = mongoose.models.InventoryBatch || mongoose.model("InventoryBatch", InventoryBatchSchema);
export const POSSale = mongoose.models.POSSale || mongoose.model("POSSale", POSSaleSchema);
export const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);
export const Payment = mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
export const Refund = mongoose.models.Refund || mongoose.model("Refund", RefundSchema);
export const HeroBanner = mongoose.models.HeroBanner || mongoose.model("HeroBanner", HeroBannerSchema);
export const StoreSettings = mongoose.models.StoreSettings || mongoose.model("StoreSettings", StoreSettingsSchema);
export const FBRConfig = mongoose.models.FBRConfig || mongoose.model("FBRConfig", FBRConfigSchema);
export const Expense = mongoose.models.Expense || mongoose.model("Expense", ExpenseSchema);
export const Wallet = mongoose.models.Wallet || mongoose.model("Wallet", WalletSchema);
export const Transaction = mongoose.models.Transaction || mongoose.model("Transaction", TransactionSchema);
export const Investment = mongoose.models.Investment || mongoose.model("Investment", InvestmentSchema);
export const RefundRequest = Refund;
export const SaleConfig = mongoose.models.SaleConfig || mongoose.model("SaleConfig", SaleConfigSchema);
export const Review = mongoose.models.Review || mongoose.model("Review", ReviewSchema);
export const StoreInfo = mongoose.models.StoreInfo || mongoose.model("StoreInfo", storeInfoSchema);