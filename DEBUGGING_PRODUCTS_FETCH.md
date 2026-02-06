# Products Fetch - Debugging & Fixes

## Problem Identified
Products were not fetching from the API because of field name mismatches between the database schema and API queries.

## Root Causes

### 1. Field Name Mismatch in Product Schema
- **Schema defines**: `status: 'active'` (enum: 'active', 'draft', 'discontinued')
- **Schema defines**: `onlineVisible: true` (for online store visibility)
- **API was querying**: `isActive: true` (field doesn't exist in Product schema)

### 2. Files Affected
- `/app/api/products/route.ts` - Main products fetch API
- `/app/api/admin/products/route.ts` - Admin product creation
- `/components/store/FeaturedProducts.tsx` - Component fetching featured products

## Fixes Applied

### Fix 1: Products API Route (`/app/api/products/route.ts`)
```typescript
// BEFORE (Wrong)
const filter: any = { isActive: true };

// AFTER (Correct)
const filter: any = { status: 'active', onlineVisible: true };
```

### Fix 2: Admin Products API (`/app/api/admin/products/route.ts`)
```typescript
// BEFORE (Wrong)
const product = new Product({
  name,
  basePrice,        // ❌ Schema uses 'retailPrice'
  weight: { ... },  // ❌ Schema uses 'unitType' and 'unitSize'
  isActive: true,   // ❌ Schema uses 'status'
});

// AFTER (Correct)
const product = new Product({
  name,
  retailPrice: basePrice,  // ✓ Matches schema
  unitType: weightUnit,    // ✓ Matches schema
  unitSize: weight,        // ✓ Matches schema
  status: 'active',        // ✓ Matches schema
  onlineVisible: true,     // ✓ Matches schema
});
```

### Fix 3: Enhanced Error Logging (`/components/store/FeaturedProducts.tsx`)
Added detailed logging to help identify fetch issues:
```typescript
console.log('[v0] Featured products fetched:', data.products?.length || 0);
console.error('[v0] Failed to fetch featured products - Status:', response.status);
console.error('[v0] Error details:', errorData);
```

## Running Seed Data

If no products exist in the database, run the seed script:

```bash
# Run seed script with Node.js
node scripts/seed-products.js
```

This will create:
- 3 categories: Vegetables, Fruits, Dairy
- 6 featured products across these categories
- All products marked as featured and active
- Sample images from Unsplash

## Testing the Fix

1. **Check Console Logs**
   - Open browser DevTools (F12)
   - Look for: `[v0] Featured products fetched: X`
   - Should show a number > 0

2. **API Direct Test**
   - Visit: `http://localhost:3000/api/products?isFeatured=true&limit=12`
   - Should return JSON with `products` array

3. **Admin Product Creation**
   - Login as admin
   - Go to Admin → Products
   - Create a new product with:
     - Name: Test Product
     - Price: 500
     - Category: Vegetables
     - Unit: kg
     - Size: 1
   - Check that product appears with correct fields

## Field Mapping Reference

| Component | Schema Field | Data Type | Default |
|-----------|--------------|-----------|---------|
| Price | retailPrice | Number | required |
| Unit Type | unitType | String ('kg', 'g', 'liter', 'ml', 'piece') | required |
| Unit Size | unitSize | Number | required |
| Status | status | String ('active', 'draft', 'discontinued') | 'active' |
| Visible Online | onlineVisible | Boolean | true |
| Visible in POS | posVisible | Boolean | true |
| Featured | isFeatured | Boolean | false |
| Hot Deal | isHot | Boolean | false |
| New Arrival | isNewArrival | Boolean | false |

## Additional Notes

- All products must have `status: 'active'` to appear in store
- All products must have `onlineVisible: true` to appear online
- The carousel automatically rotates every 5 seconds
- Enhanced logging helps troubleshoot future issues
- Database field names are case-sensitive

## Status: ✓ FIXED

All products should now fetch correctly and display in:
- Featured Products carousel (auto-rotating)
- Products listing page
- Product search results
