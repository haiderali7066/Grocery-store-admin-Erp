import { connectDB } from './db';
import { InventoryBatch, Product, Order } from './models/index';

/**
 * FIFO Inventory Deduction System
 * First stock bought = first stock sold
 */

interface FIFODeduction {
  quantity: number;
  buyingRate: number;
  batchId: string;
}

/**
 * Get FIFO batches for a product (ordered by creation date)
 */
export async function getFIFOBatches(productId: string) {
  await connectDB();

  return await InventoryBatch.find({
    product: productId,
    status: { $ne: 'finished' },
  })
    .sort({ createdAt: 1 })
    .lean();
}

/**
 * Deduct inventory using FIFO method
 * Returns the cost of goods sold for profit calculation
 */
export async function deductInventoryFIFO(
  productId: string,
  quantityToDeduct: number
): Promise<{ totalCost: number; deductions: FIFODeduction[] }> {
  await connectDB();

  const batches = await getFIFOBatches(productId);
  let remainingQuantity = quantityToDeduct;
  let totalCost = 0;
  const deductions: FIFODeduction[] = [];

  for (const batch of batches) {
    if (remainingQuantity <= 0) break;

    const quantityFromBatch = Math.min(remainingQuantity, batch.quantity);

    // Update batch
    const updatedQuantity = batch.quantity - quantityFromBatch;
    await InventoryBatch.findByIdAndUpdate(batch._id, {
      quantity: updatedQuantity,
      status: updatedQuantity === 0 ? 'finished' : 'partial',
    });

    // Calculate cost
    const batchCost = quantityFromBatch * batch.buyingRate;
    totalCost += batchCost;

    deductions.push({
      quantity: quantityFromBatch,
      buyingRate: batch.buyingRate,
      batchId: batch._id.toString(),
    });

    remainingQuantity -= quantityFromBatch;
  }

  // Update product stock
  const product = await Product.findById(productId);
  if (product) {
    product.stock -= quantityToDeduct;
    await product.save();
  }

  return { totalCost, deductions };
}

/**
 * Add stock to inventory (new purchase)
 */
export async function addStockFIFO(
  productId: string,
  quantity: number,
  buyingRate: number,
  purchaseId: string,
  expiry?: Date
) {
  await connectDB();

  // Create new batch
  const batch = new InventoryBatch({
    product: productId,
    quantity,
    buyingRate,
    purchaseReference: purchaseId,
    expiry,
    status: 'active',
  });

  await batch.save();

  // Update product stock
  const product = await Product.findById(productId);
  if (product) {
    product.stock += quantity;
    await product.save();
  }

  return batch;
}

/**
 * Calculate order profit using FIFO deductions
 */
export async function calculateOrderProfit(
  orderItems: Array<{ productId: string; quantity: number; sellingPrice: number }>
): Promise<number> {
  await connectDB();

  let totalProfit = 0;

  for (const item of orderItems) {
    const { totalCost } = await deductInventoryFIFO(item.productId, item.quantity);
    const revenue = item.sellingPrice * item.quantity;
    const profit = revenue - totalCost;
    totalProfit += profit;
  }

  return totalProfit;
}

/**
 * Get inventory valuation (total stock value at buying rates)
 */
export async function getInventoryValuation(productId?: string) {
  await connectDB();

  const query = productId ? { product: productId } : {};
  const batches = await InventoryBatch.find(query).populate('product');

  let totalValue = 0;
  const valuationData: Array<{
    productId: string;
    productName: string;
    quantity: number;
    value: number;
  }> = [];

  // Group by product
  const productMap = new Map();

  for (const batch of batches) {
    const key = batch.product._id.toString();
    if (!productMap.has(key)) {
      productMap.set(key, {
        productId: key,
        productName: batch.product.name,
        quantity: 0,
        value: 0,
      });
    }

    const item = productMap.get(key);
    item.quantity += batch.quantity;
    item.value += batch.quantity * batch.buyingRate;
    totalValue += batch.quantity * batch.buyingRate;
  }

  return {
    totalValue,
    items: Array.from(productMap.values()),
  };
}

/**
 * Check for expiring stock
 */
export async function getExpiringStock(daysUntilExpiry: number = 7) {
  await connectDB();

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);

  const expiringBatches = await InventoryBatch.find({
    expiry: { $lte: expiryDate, $gte: new Date() },
    status: { $ne: 'finished' },
  }).populate('product');

  return expiringBatches;
}
