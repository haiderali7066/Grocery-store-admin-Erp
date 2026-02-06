import { connectDB } from '@/lib/db';
import { Product, Category } from '@/lib/models/index';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookie } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = getTokenFromCookie(req.headers.get('cookie') || '');
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Parse FormData
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const basePrice = formData.get('basePrice') as string;
    const category = formData.get('category') as string;
    const weight = formData.get('weight') as string;
    const weightUnit = formData.get('weightUnit') as string;
    const discount = formData.get('discount') as string;
    const discountType = formData.get('discountType') as string;
    const isFlashSale = formData.get('isFlashSale') === 'true';
    const isHot = formData.get('isHot') === 'true';
    const isFeatured = formData.get('isFeatured') === 'true';
    const image = formData.get('image') as File | null;

    // Validate that the category exists
    const categoryDoc = await Category.findById(category);
    if (!categoryDoc) {
      return NextResponse.json(
        { error: 'Invalid category selected' },
        { status: 400 }
      );
    }

    let imagePath = '';

    // Handle image upload
    if (image) {
      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Create unique filename
      const timestamp = Date.now();
      const originalName = image.name.replace(/\s+/g, '-');
      const filename = `${timestamp}-${originalName}`;
      
      // Create uploads directory if it doesn't exist
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
      try {
        await mkdir(uploadDir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }

      // Save file
      const filepath = path.join(uploadDir, filename);
      await writeFile(filepath, buffer);
      
      // Store relative path for database
      imagePath = `/uploads/products/${filename}`;
    }

    const sku = `${name.substring(0, 3).toUpperCase()}-${Date.now()}`;

    const product = new Product({
      name,
      sku,
      retailPrice: parseFloat(basePrice),
      discount: discount ? parseFloat(discount) : 0,
      discountType: discountType || 'percentage',
      category: categoryDoc._id,
      unitType: weightUnit,
      unitSize: parseFloat(weight),
      mainImage: imagePath,
      stock: 0,
      status: 'active',
      onlineVisible: true,
      posVisible: true,
      isFeatured: isFeatured || false,
      isHot: isHot || false,
      isNewArrival: isFlashSale || false,
    });

    await product.save();

    return NextResponse.json(
      {
        message: 'Product created successfully',
        product,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Product creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
