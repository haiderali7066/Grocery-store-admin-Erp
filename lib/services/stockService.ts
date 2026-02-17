// lib/services/stockService.ts
import { Product, InventoryBatch } from "@/lib/models";

interface StockItem {
  productId: string;
  quantity: number;
}

interface StockCheckResult {
  available: boolean;
  unavailableItems?: {
    productId: string;
    requested: number;
    available: number;
  }[];
}

// ── Check stock availability ─────────────────────────────────────────────────
export async function checkStockAvailability(
  items: StockItem[],
): Promise<StockCheckResult> {
  const unavailableItems = [];

  for (const item of items) {
    const product = (await Product.findById(item.productId).lean()) as any;
    if (!product) {
      unavailableItems.push({
        productId: item.productId,
        requested: item.quantity,
        available: 0,
      });
      continue;
    }

    if (product.stock < item.quantity) {
      unavailableItems.push({
        productId: item.productId,
        requested: item.quantity,
        available: product.stock,
      });
    }
  }

  return {
    available: unavailableItems.length === 0,
    unavailableItems:
      unavailableItems.length > 0 ? unavailableItems : undefined,
  };
}

// ── Deduct stock (FIFO) ───────────────────────────────────────────────────────
export async function deductStock(items: StockItem[]): Promise<void> {
  for (const item of items) {
    let remainingToDeduct = item.quantity;

    // Get active batches in FIFO order (oldest first)
    const batches = await InventoryBatch.find({
      product: item.productId,
      status: { $in: ["active", "partial"] },
      remainingQuantity: { $gt: 0 },
    }).sort({ createdAt: 1 });

    for (const batch of batches) {
      if (remainingToDeduct <= 0) break;

      if (batch.remainingQuantity >= remainingToDeduct) {
        batch.remainingQuantity -= remainingToDeduct;
        batch.status = batch.remainingQuantity === 0 ? "finished" : "partial";
        await batch.save();
        remainingToDeduct = 0;
      } else {
        remainingToDeduct -= batch.remainingQuantity;
        batch.remainingQuantity = 0;
        batch.status = "finished";
        await batch.save();
      }
    }

    // Update product stock
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { stock: -item.quantity },
    });
  }
}

// ── Restock (reverse of deduct) ───────────────────────────────────────────────
// Called when order is cancelled, rejected, deleted, or returned
export async function restockItems(items: StockItem[]): Promise<void> {
  for (const item of items) {
    let remainingToRestock = item.quantity;

    // Find most recently deducted batches (LIFO for restock = reverse FIFO)
    const batches = await InventoryBatch.find({
      product: item.productId,
      status: { $in: ["finished", "partial"] },
    }).sort({ createdAt: -1 }); // Most recent first

    for (const batch of batches) {
      if (remainingToRestock <= 0) break;

      const canRestore = Math.min(
        remainingToRestock,
        batch.quantity - batch.remainingQuantity, // How much was deducted from this batch
      );

      if (canRestore > 0) {
        batch.remainingQuantity += canRestore;
        batch.status =
          batch.remainingQuantity === batch.quantity ? "active" : "partial";
        await batch.save();
        remainingToRestock -= canRestore;
      }
    }

    // Update product stock regardless
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { stock: item.quantity },
    });
  }
}
