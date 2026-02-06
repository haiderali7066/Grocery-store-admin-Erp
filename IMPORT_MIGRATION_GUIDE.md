# Import Migration Guide

## Files That Need Import Updates

### Update from `@/lib/contexts/AuthContext` to `@/components/auth/AuthProvider`

Replace:
```typescript
import { useAuth } from '@/lib/contexts/AuthContext';
import { AuthProvider } from '@/lib/contexts/AuthContext';
```

With:
```typescript
import { useAuth } from '@/components/auth/AuthProvider';
import { AuthProvider } from '@/components/auth/AuthProvider';
```

Files to update:
- [ ] `/app/account/page.tsx`
- [ ] `/app/cart/page.tsx`
- [ ] `/app/checkout/page.tsx`
- [ ] `/app/login/page.tsx`
- [ ] `/app/products/[id]/page.tsx`
- [ ] `/app/products/page.tsx`
- [ ] `/app/signup/page.tsx`
- [ ] Any other files importing AuthContext

### Update from `@/lib/contexts/CartContext` to `@/components/cart/CartProvider`

Replace:
```typescript
import { useCart } from '@/lib/contexts/CartContext';
import { CartProvider } from '@/lib/contexts/CartContext';
```

With:
```typescript
import { useCart } from '@/components/cart/CartProvider';
import { CartProvider } from '@/components/cart/CartProvider';
```

Files to update:
- [ ] `/components/store/Navbar.tsx`
- [ ] `/components/store/ProductCard.tsx`
- [ ] `/components/store/BundlesSection.tsx`
- [ ] Any other files importing CartContext

## Commands to Find Remaining Imports

```bash
# Find all AuthContext imports
grep -r "from '@/lib/contexts/AuthContext" --include="*.tsx" --include="*.ts" .

# Find all CartContext imports
grep -r "from '@/lib/contexts/CartContext" --include="*.tsx" --include="*.ts" .
```

## Verification

After updating all imports, verify:
1. Auth functionality still works (login/logout)
2. Cart functionality still works (add/remove items)
3. Admin pages still load correctly
4. No console errors about missing imports
