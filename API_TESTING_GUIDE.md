# API Testing Guide - POS & Refund System

## Overview
Test all new APIs for the POS and Refund system using this guide.

---

## Prerequisites
- Admin authentication token
- Base URL: `http://localhost:3000` (or your domain)
- Postman or cURL for testing

---

## Authentication

### Get Admin Token
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_password"
  }' \
  -c cookies.txt
```

Use the returned token or cookies for all subsequent requests.

---

## 1. POS BILLING APIS

### Create POS Sale

**Endpoint**: `POST /api/admin/pos/sale`

**Headers**:
```
Content-Type: application/json
Cookie: token=<your_token>
```

**Body**:
```json
{
  "items": [
    {
      "id": "product_id_1",
      "name": "Rice",
      "quantity": 2,
      "price": 500,
      "gst": 17,
      "subtotal": 1000,
      "taxExempt": false
    },
    {
      "id": "product_id_2",
      "name": "Salt (Tax Exempt)",
      "quantity": 1,
      "price": 100,
      "gst": 0,
      "subtotal": 100,
      "taxExempt": true
    }
  ],
  "paymentMethod": "cash",
  "subtotal": 1100,
  "gstAmount": 170,
  "totalAmount": 1270
}
```

**Expected Response**:
```json
{
  "success": true,
  "saleNumber": "SALE1706332800000",
  "fbrInvoiceNumber": "FBR1706332800001",
  "qrCode": "base64_encoded_qr",
  "profit": 450,
  "message": "Sale completed and submitted to FBR"
}
```

**Test Cases**:
- ✅ Valid sale with GST items
- ✅ Sale with tax-exempt items
- ✅ Multiple items in one sale
- ❌ Empty cart (should fail)
- ❌ Invalid product ID (should fail)

---

### Get POS Sales

**Endpoint**: `GET /api/admin/pos/sale`

**Headers**:
```
Cookie: token=<your_token>
```

**Expected Response**:
```json
{
  "sales": [
    {
      "_id": "...",
      "saleNumber": "SALE...",
      "totalAmount": 1270,
      "gstAmount": 170,
      "profit": 450,
      "costOfGoods": 820,
      "paymentMethod": "cash",
      "fbrInvoiceNumber": "FBR...",
      "fbrStatus": "success",
      "createdAt": "2025-01-27T..."
    }
  ],
  "summary": {
    "totalSales": 5,
    "totalAmount": 6350,
    "totalProfit": 2250,
    "totalTax": 850,
    "avgSaleValue": 1270
  }
}
```

**Test Cases**:
- ✅ Get today's sales
- ✅ Verify summary totals
- ✅ Check FBR status

---

## 2. REFUND MANAGEMENT APIS

### Get All Refund Requests

**Endpoint**: `GET /api/admin/refunds`

**Headers**:
```
Cookie: token=<your_token>
```

**Expected Response**:
```json
[
  {
    "_id": "...",
    "order": {
      "_id": "order_id",
      "orderNumber": "ORD001",
      "total": 5000
    },
    "requestedAmount": 5000,
    "reason": "Product defective",
    "status": "pending",
    "createdAt": "2025-01-27T..."
  }
]
```

---

### Create Refund Request (Customer)

**Endpoint**: `POST /api/orders/refund`

**Headers**:
```
Content-Type: application/json
Cookie: token=<customer_token>
```

**Body**:
```json
{
  "orderId": "order_id",
  "reason": "Item not as described"
}
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Refund request submitted. We will review and respond within 24 hours.",
  "refund": {
    "_id": "refund_id",
    "status": "pending",
    "requestedAmount": 5000
  }
}
```

**Test Cases**:
- ✅ Valid refund request
- ✅ Prevents duplicate refund requests
- ❌ Refuses POS sales (should fail)
- ❌ Refuses cancelled orders (should fail)

---

### Approve Refund

**Endpoint**: `POST /api/admin/refunds/[id]/approve`

**Headers**:
```
Content-Type: application/json
Cookie: token=<admin_token>
```

**Body**:
```json
{
  "approvalAmount": 5000,
  "notes": "Approved full refund. Customer verified issue."
}
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Refund approved",
  "refund": {
    "status": "approved",
    "refundedAmount": 5000
  }
}
```

**Test Cases**:
- ✅ Full refund approval
- ✅ Partial refund (smaller amount)
- ❌ Approve already approved refund (should fail)
- ✅ Inventory restored
- ✅ Order status changed to cancelled

---

### Reject Refund

**Endpoint**: `POST /api/admin/refunds/[id]/reject`

**Headers**:
```
Content-Type: application/json
Cookie: token=<admin_token>
```

**Body**:
```json
{
  "notes": "Product returned in good condition. Denying refund."
}
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Refund rejected",
  "refund": {
    "status": "rejected"
  }
}
```

---

## 3. FBR CONFIGURATION APIS

### Get FBR Configuration

**Endpoint**: `GET /api/admin/fbr-config`

**Headers**:
```
Cookie: token=<admin_token>
```

**Expected Response**:
```json
{
  "_id": "...",
  "businessName": "Khas Pure Food",
  "ntn": "1234567890",
  "strn": "1234567890123",
  "posDeviceId": "POS001",
  "posDeviceSerialNumber": "SN123456",
  "fbrApiUrl": "https://api.fbr.gov.pk/",
  "isEnabled": true,
  "lastSyncTime": "2025-01-27T12:00:00Z"
}
```

---

### Update FBR Configuration

**Endpoint**: `POST /api/admin/fbr-config`

**Headers**:
```
Content-Type: application/json
Cookie: token=<admin_token>
```

**Body**:
```json
{
  "businessName": "Khas Pure Food",
  "ntn": "1234567890",
  "strn": "1234567890123",
  "posDeviceId": "POS001",
  "posDeviceSerialNumber": "SN123456",
  "fbrApiUrl": "https://api.fbr.gov.pk/",
  "fbrApiKey": "your_api_key",
  "isEnabled": true
}
```

**Expected Response**:
```json
{
  "businessName": "Khas Pure Food",
  "ntn": "1234567890",
  "isEnabled": true
}
```

---

### Test FBR Connection

**Endpoint**: `POST /api/admin/fbr-config/test`

**Headers**:
```
Content-Type: application/json
Cookie: token=<admin_token>
```

**Body**:
```json
{
  "ntn": "1234567890",
  "strn": "1234567890123",
  "posDeviceId": "POS001",
  "posDeviceSerialNumber": "SN123456"
}
```

**Expected Response (Success)**:
```json
{
  "status": "success",
  "message": "FBR connection verified successfully",
  "details": {
    "ntn": "1234567890",
    "strn": "1234567890123",
    "deviceId": "POS001",
    "timestamp": "2025-01-27T12:00:00Z"
  }
}
```

**Expected Response (Failure)**:
```json
{
  "status": "failed",
  "message": "FBR connection test failed. Please check your credentials."
}
```

---

### Sync with FBR

**Endpoint**: `POST /api/admin/fbr-config/sync`

**Headers**:
```
Cookie: token=<admin_token>
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Synced with FBR"
}
```

---

## 4. INTEGRATION TEST SCENARIOS

### Scenario 1: Complete POS Sale to FBR

```bash
# 1. Create POS sale
POST /api/admin/pos/sale
Body: {items, paymentMethod, totals}
Response: saleNumber, fbrInvoiceNumber, profit

# 2. Verify FBR submission
Check fbrStatus in response = "success"

# 3. Get sales to confirm
GET /api/admin/pos/sale
Verify: sale appears in list, profit calculated correctly
```

### Scenario 2: Customer Refund Request to Admin Approval

```bash
# 1. Customer requests refund
POST /api/orders/refund
Body: {orderId, reason}
Response: refund created, status = pending

# 2. Admin gets refund requests
GET /api/admin/refunds
Response: includes pending refund

# 3. Admin approves
POST /api/admin/refunds/[id]/approve
Body: {approvalAmount, notes}
Response: refund approved

# 4. Verify inventory restored
GET /api/admin/inventory
Verify: stock increased for refunded items
```

### Scenario 3: Partial Refund Approval

```bash
# 1. Customer requests full refund (5000)
POST /api/orders/refund
Body: {orderId, reason}

# 2. Admin approves partial (3500)
POST /api/admin/refunds/[id]/approve
Body: {approvalAmount: 3500, notes: "Partial approval"}

# 3. Verify
- refundedAmount = 3500
- status = approved
- Order cancelled
- Inventory restored for all items
```

---

## 5. ERROR HANDLING TESTS

### Test Unauthorized Access

```bash
# Missing token
GET /api/admin/refunds
Expected: 401 Unauthorized

# Invalid token
GET /api/admin/refunds -H "Cookie: token=invalid"
Expected: 401 Unauthorized

# Non-admin user
GET /api/admin/refunds (as regular user)
Expected: 401 Unauthorized
```

### Test Invalid Data

```bash
# Empty cart
POST /api/admin/pos/sale
Body: {items: []}
Expected: 400 Bad Request, error message

# Missing required fields
POST /api/admin/refunds/[id]/approve
Body: {} (no approvalAmount)
Expected: 400 Bad Request

# Non-existent ID
POST /api/admin/refunds/invalid-id/approve
Expected: 404 Not Found
```

---

## 6. PERFORMANCE TESTS

### Load Test POS Sale

```bash
# Time a POS sale creation
time curl -X POST http://localhost:3000/api/admin/pos/sale \
  -H "Content-Type: application/json" \
  -d '...'

Expected: < 2 seconds response time
```

### Batch Refund Processing

```bash
# Test 10 simultaneous refund requests
Expected: All complete within 5 seconds
```

---

## 7. DATA VALIDATION TESTS

### Test GST Calculation

```bash
# Test 17% GST
subtotal = 1000
gstAmount = 1000 * 0.17 = 170
totalAmount = 1170
✅ Verify calculation in response

# Test tax-exempt item
subtotal = 100
taxExempt = true
gstAmount = 0
totalAmount = 100
✅ Verify no GST added
```

### Test FIFO Profit Calculation

```bash
# Buy at 500, sell at 700
buyingRate = 500
sellingPrice = 700
profit = 700 - 500 = 200
✅ Verify profit in POS sale response
```

---

## 8. CLEANUP & RESET

### Clear Test Data

```bash
# Delete test POS sales
DELETE /api/admin/pos/sale?test=true

# Delete test refunds
DELETE /api/admin/refunds?test=true

# Note: Implement cleanup endpoint if needed
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Ensure token is valid and in cookies |
| 400 Missing fields | Check request body has all required fields |
| FBR test fails | Verify NTN, STRN format correct |
| Refund already processed | Status must be "pending" to approve |
| Stock not decreasing | Ensure FIFO batches exist for product |

---

## Quick Test Commands

```bash
# Test POS Sale
curl -X POST http://localhost:3000/api/admin/pos/sale \
  -H "Content-Type: application/json" \
  -b "token=YOUR_TOKEN" \
  -d '{...}'

# Get Today's Sales
curl http://localhost:3000/api/admin/pos/sale \
  -b "token=YOUR_TOKEN"

# List Refunds
curl http://localhost:3000/api/admin/refunds \
  -b "token=YOUR_TOKEN"

# Test FBR Connection
curl -X POST http://localhost:3000/api/admin/fbr-config/test \
  -H "Content-Type: application/json" \
  -b "token=YOUR_TOKEN" \
  -d '{...}'
```

---

**Version**: 1.0
**Last Updated**: January 27, 2025
**Status**: Ready for Testing
