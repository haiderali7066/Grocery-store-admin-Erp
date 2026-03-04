// FILE PATH: lib/fifo.ts

import { connectDB } from './db';
import { InventoryBatch, Product, Order } from './models/index';

/**
 * FIFO Inventory Deduction System
 * First stock bought = first stock sold
 */

interface FIFODeduction {
  quantity: number;
  buyingRate: number;  // landed cost (used for COGS calculation)
  batchId: string;
}

/**
 * Get FIFO batches for a product (oldest first, with remaining stock)
 */
export async function getFIFOBatches(productId: string) {
  await connectDB();

  return await InventoryBatch.find({
    product: productId,
    remainingQuantity: { $gt: 0 },       // Only batches that still have stock
    status: { $in: ['active', 'partial'] }, // Exclude finished batches
  })
    .sort({ createdAt: 1 })  // Oldest first = FIFO
    .lean();
}

/**
 * Deduct inventory using FIFO method.
 *
 * Key fix: deducts from `remainingQuantity` (not `quantity`).
 * `quantity`          = original units purchased in this batch (never changes)
 * `remainingQuantity` = units still available to sell (decremented here)
 *
 * When a batch is exhausted, product.retailPrice is updated to the next
 * batch's sellingPrice so the POS / store always shows the correct FIFO price.
 *
 * Returns the cost of goods sold for profit calculation.
 */
export async function deductInventoryFIFO(
  productId: string,
  quantityToDeduct: number
): Promise<{ totalCost: number; deductions: FIFODeduction[] }> {
  await connectDB();

  const batches = await getFIFOBatches(productId);
  let remaining = quantityToDeduct;
  let totalCost = 0;
  const deductions: FIFODeduction[] = [];

  for (const batch of batches) {
    if (remaining <= 0) break;

    const available = batch.remainingQuantity;
    const takenFromBatch = Math.min(remaining, available);
    const newRemainingQty = available - takenFromBatch;

    // Deduct from remainingQuantity; mark finished when empty
    await InventoryBatch.findByIdAndUpdate(batch._id, {
      remainingQuantity: newRemainingQty,
      status: newRemainingQty === 0 ? 'finished' : 'partial',
    });

    // buyingRate in InventoryBatch stores the full landed cost (unitCostWithTax)
    totalCost += takenFromBatch * batch.buyingRate;

    deductions.push({
      quantity: takenFromBatch,
      buyingRate: batch.buyingRate,
      batchId: batch._id.toString(),
    });

    remaining -= takenFromBatch;

    // ── FIFO Price Rollover ──────────────────────────────────────────────────
    // When a batch is fully consumed, advance product.retailPrice to the next
    // available batch's sellingPrice. This keeps the POS / store price correct
    // without requiring a new purchase to be recorded.
    if (newRemainingQty === 0) {
      const nextBatch = await InventoryBatch.findOne({
        product: productId,
        remainingQuantity: { $gt: 0 },
        status: { $in: ['active', 'partial'] },
        _id: { $ne: batch._id },
      })
        .sort({ createdAt: 1 })
        .lean();

      if (nextBatch) {
        await Product.findByIdAndUpdate(productId, {
          retailPrice: nextBatch.sellingPrice,
          lastBuyingRate: nextBatch.buyingRate,
        });
      }
    }
    // ────────────────────────────────────────────────────────────────────────
  }

  // Update product stock count
  await Product.findByIdAndUpdate(productId, {
    $inc: { stock: -quantityToDeduct },
  });

  return { totalCost, deductions };
}

/**
 * Add stock to inventory (new purchase).
 * Note: batch creation is handled by the purchases API route.
 * This helper is available for programmatic use.
 */
export async function addStockFIFO(
  productId: string,
  quantity: number,
  unitCostWithTax: number,  // full landed cost
  baseRate: number,
  sellingPrice: number,
  purchaseId: string,
  expiry?: Date
) {
  await connectDB();

  const productDoc = await Product.findById(productId);
  const stockBeforePurchase = productDoc?.stock ?? 0;

  const batch = new InventoryBatch({
    product: productId,
    quantity,
    remainingQuantity: quantity,
    buyingRate: unitCostWithTax,  // landed cost
    baseRate,
    sellingPrice,
    profitPerUnit: sellingPrice - unitCostWithTax,
    purchaseReference: purchaseId,
    expiry,
    status: 'active',
  });

  await batch.save();

  if (productDoc) {
    productDoc.stock += quantity;
    // Only update the retail price if the product was previously sold out
    if (stockBeforePurchase === 0) {
      productDoc.retailPrice = sellingPrice;
    }
    productDoc.lastBuyingRate = unitCostWithTax;
    await productDoc.save();
  }

  return batch;
}

/**
 * Calculate order profit using FIFO deductions.
 * NOTE: This mutates inventory (deducts stock). Call only when recording a sale.
 */
export async function calculateOrderProfit(
  orderItems: Array<{ productId: string; quantity: number; sellingPrice: number }>
): Promise<number> {
  await connectDB();

  let totalProfit = 0;

  for (const item of orderItems) {
    const { totalCost } = await deductInventoryFIFO(item.productId, item.quantity);
    const revenue = item.sellingPrice * item.quantity;
    totalProfit += revenue - totalCost;
  }

  return totalProfit;
}

/**
 * Get inventory valuation (total stock value at landed cost / buying rates)
 */
export async function getInventoryValuation(productId?: string) {
  await connectDB();

  const query = productId ? { product: productId, remainingQuantity: { $gt: 0 } } : { remainingQuantity: { $gt: 0 } };
  const batches = await InventoryBatch.find(query).populate('product').lean();

  let totalValue = 0;
  const productMap = new Map<string, { productId: string; productName: string; quantity: number; value: number }>();

  for (const batch of batches) {
    const p = batch.product as any;
    const key = p._id.toString();
    if (!productMap.has(key)) {
      productMap.set(key, { productId: key, productName: p.name, quantity: 0, value: 0 });
    }
    const entry = productMap.get(key)!;
    entry.quantity += batch.remainingQuantity;
    entry.value    += batch.remainingQuantity * batch.buyingRate; // buyingRate = landed cost
    totalValue     += batch.remainingQuantity * batch.buyingRate;
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

  return await InventoryBatch.find({
    expiry: { $lte: expiryDate, $gte: new Date() },
    remainingQuantity: { $gt: 0 },
    status: { $ne: 'finished' },
  }).populate('product');
}