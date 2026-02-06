const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  image: String,
  parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  sortOrder: { type: Number, default: 0 },
  isVisible: { type: Boolean, default: true },
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  brand: String,
  description: String,
  retailPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  unitType: { type: String, enum: ['kg', 'g', 'liter', 'ml', 'piece'], required: true },
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
  stock: { type: Number, required: true, default: 0 },
  lowStockThreshold: { type: Number, default: 10 },
  status: { type: String, enum: ['active', 'draft', 'discontinued'], default: 'active' },
}, { timestamps: true });

async function seedDatabase() {
  try {
    console.log('[v0] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('[v0] Connected to MongoDB');

    const Category = mongoose.model('Category', categorySchema);
    const Product = mongoose.model('Product', productSchema);

    // Create categories
    console.log('[v0] Creating categories...');
    const vegetables = await Category.findOneAndUpdate(
      { name: 'Vegetables' },
      { name: 'Vegetables', description: 'Fresh vegetables', isVisible: true },
      { upsert: true, new: true }
    );
    
    const fruits = await Category.findOneAndUpdate(
      { name: 'Fruits' },
      { name: 'Fruits', description: 'Fresh fruits', isVisible: true },
      { upsert: true, new: true }
    );

    const dairy = await Category.findOneAndUpdate(
      { name: 'Dairy' },
      { name: 'Dairy', description: 'Dairy products', isVisible: true },
      { upsert: true, new: true }
    );

    // Create featured products
    console.log('[v0] Creating featured products...');
    const featuredProducts = [
      {
        name: 'Fresh Tomatoes',
        sku: 'TOM-' + Date.now(),
        category: vegetables._id,
        brand: 'Local Farm',
        description: 'Fresh, ripe tomatoes',
        retailPrice: 150,
        discount: 10,
        discountType: 'percentage',
        unitType: 'kg',
        unitSize: 1,
        mainImage: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=500&fit=crop',
        posVisible: true,
        onlineVisible: true,
        isFeatured: true,
        isHot: true,
        stock: 50,
        status: 'active',
      },
      {
        name: 'Organic Carrots',
        sku: 'CAR-' + Date.now(),
        category: vegetables._id,
        brand: 'Organic Farm',
        description: 'Organic carrots from local farms',
        retailPrice: 100,
        discount: 5,
        discountType: 'percentage',
        unitType: 'kg',
        unitSize: 1,
        mainImage: 'https://images.unsplash.com/photo-1599599810694-e3517b5d52e9?w=500&h=500&fit=crop',
        posVisible: true,
        onlineVisible: true,
        isFeatured: true,
        stock: 40,
        status: 'active',
      },
      {
        name: 'Fresh Apples',
        sku: 'APP-' + Date.now(),
        category: fruits._id,
        brand: 'Mountain Orchards',
        description: 'Fresh red apples',
        retailPrice: 200,
        discount: 15,
        discountType: 'percentage',
        unitType: 'kg',
        unitSize: 1,
        mainImage: 'https://images.unsplash.com/photo-1560806e614ce0db7347c5ed9cf6f64ec6174154?w=500&h=500&fit=crop',
        posVisible: true,
        onlineVisible: true,
        isFeatured: true,
        isNewArrival: true,
        stock: 60,
        status: 'active',
      },
      {
        name: 'Bananas',
        sku: 'BAN-' + Date.now(),
        category: fruits._id,
        brand: 'Tropical Farms',
        description: 'Fresh yellow bananas',
        retailPrice: 80,
        discount: 0,
        unitType: 'kg',
        unitSize: 1,
        mainImage: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=500&h=500&fit=crop',
        posVisible: true,
        onlineVisible: true,
        isFeatured: true,
        stock: 80,
        status: 'active',
      },
      {
        name: 'Whole Milk',
        sku: 'MIL-' + Date.now(),
        category: dairy._id,
        brand: 'Pure Dairy',
        description: 'Fresh whole milk',
        retailPrice: 120,
        discount: 0,
        unitType: 'liter',
        unitSize: 1,
        mainImage: 'https://images.unsplash.com/photo-1586190203865-8b30adb0a6d1?w=500&h=500&fit=crop',
        posVisible: true,
        onlineVisible: true,
        isFeatured: true,
        stock: 100,
        status: 'active',
      },
      {
        name: 'Greek Yogurt',
        sku: 'YOG-' + Date.now(),
        category: dairy._id,
        brand: 'Probiotic',
        description: 'Creamy Greek yogurt',
        retailPrice: 250,
        discount: 10,
        discountType: 'percentage',
        unitType: 'g',
        unitSize: 500,
        mainImage: 'https://images.unsplash.com/photo-1488477181946-85a4f58eae86?w=500&h=500&fit=crop',
        posVisible: true,
        onlineVisible: true,
        isFeatured: true,
        stock: 70,
        status: 'active',
      },
    ];

    for (const productData of featuredProducts) {
      await Product.findOneAndUpdate(
        { sku: productData.sku },
        productData,
        { upsert: true, new: true }
      );
    }

    console.log('[v0] Seed data created successfully!');
    console.log('[v0] Created 6 featured products in 3 categories');
    
    await mongoose.connection.close();
    console.log('[v0] Database connection closed');
  } catch (error) {
    console.error('[v0] Seed error:', error);
    process.exit(1);
  }
}

seedDatabase();
