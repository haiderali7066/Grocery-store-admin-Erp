import { Product, InventoryBatch } from '@/lib/models/index';

interface StockDeductionItem {
  productId: string;
  quantity: number;
}

/**
 * Deduct stock from inventory using FIFO method
 * Used by both online orders and POS orders
 */
export async function deductStock(items: StockDeductionItem[]): Promise<{ success: boolean; error?: string }> {
  try {
    for (const item of items) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        return { success: false, error: `Product ${item.productId} not found` };
      }

      if (product.stock < item.quantity) {
        return { 
          success: false, 
          error: `Insufficient stock for ${product.name}. Available: ${product.stock}, Required: ${item.quantity}` 
        };
      }

      // Deduct from InventoryBatch using FIFO
      const batches = await InventoryBatch.find({
        product: item.productId,
        remainingQuantity: { $gt: 0 },
      }).sort({ createdAt: 1 });

      let remainingToDeduct = item.quantity;

      for (const batch of batches) {
        if (remainingToDeduct <= 0) break;

        const deductAmount = Math.min(remainingToDeduct, batch.remainingQuantity);
        batch.remainingQuantity -= deductAmount;
        await batch.save();
        remainingToDeduct -= deductAmount;
      }

      // Update product stock
      product.stock -= item.quantity;
      await product.save();
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Add stock to inventory from purchases
 */
export async function addStock(
  productId: string,
  quantity: number,
  buyingPrice: number,
  supplier: string,
  batchNumber?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const product = await Product.findById(productId);
    
    if (!product) {
      return { success: false, error: 'Product not found' };
    }

    // Create inventory batch
    const batch = new InventoryBatch({
      product: productId,
      quantity,
      remainingQuantity: quantity,
      buyingPrice,
      supplier,
      batchNumber: batchNumber || `BATCH-${Date.now()}`,
    });

    await batch.save();

    // Update product stock
    product.stock += quantity;
    await product.save();

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Check if stock is available
 */
export async function checkStockAvailability(
  items: StockDeductionItem[]
): Promise<{ available: boolean; shortfall?: { productId: string; required: number; available: number }[] }> {
  try {
    const shortfalls = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      
      if (!product || product.stock < item.quantity) {
        shortfalls.push({
          productId: item.productId,
          required: item.quantity,
          available: product?.stock || 0,
        });
      }
    }

    return {
      available: shortfalls.length === 0,
      shortfall: shortfalls.length > 0 ? shortfalls : undefined,
    };
  } catch (error: any) {
    return { available: false, shortfall: [] };
  }
}

/**
 * Get low stock alerts
 */
export async function getLowStockAlerts(): Promise<any[]> {
  try {
    const products = await Product.find({
      $expr: { $lte: ['$stock', '$lowStockThreshold'] },
    }).select('name sku stock lowStockThreshold');

    return products;
  } catch (error) {
    return [];
  }
}
