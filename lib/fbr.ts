import { FBRConfig } from './models';

export interface POSInvoiceData {
  invoiceNumber?: string;
  dateTime: string;
  ntn: string;
  strn: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxAmount: number;
    total: number;
    taxable: boolean;
  }>;
  subtotal: number;
  totalTax: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'manual';
}

export interface FBRResponse {
  invoiceNumber: string;
  qrCode?: string;
  transactionId: string;
  timestamp: string;
  status: 'success' | 'failed';
  message?: string;
}

// Mock FBR API implementation (replace with real FBR API)
export async function submitToFBR(invoiceData: POSInvoiceData): Promise<FBRResponse> {
  try {
    // Get FBR configuration
    const config = await FBRConfig.findOne().lean();

    if (!config || !config.isEnabled) {
      throw new Error('FBR is not configured or disabled');
    }

    // Format invoice for FBR
    const payload = {
      businessNTN: config.ntn,
      businessSTRN: config.strn,
      deviceId: config.posDeviceId,
      serialNumber: config.posDeviceSerialNumber,
      invoiceDate: new Date(invoiceData.dateTime).toISOString(),
      items: invoiceData.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        salesTax: item.taxAmount,
        total: item.total,
        isTaxable: item.taxable,
      })),
      subTotal: invoiceData.subtotal,
      totalSalesTax: invoiceData.totalTax,
      totalBill: invoiceData.totalAmount,
      paymentMode: invoiceData.paymentMethod,
    };

    // Call FBR API (mock implementation)
    // In production, replace this with actual FBR API endpoint
    const response = await fbrAPICall(config.fbrApiUrl || '', payload, config.fbrApiKey || '');

    // Generate QR Code (simplified)
    const qrCode = generateQRCode({
      invoiceNumber: response.invoiceNumber,
      totalAmount: invoiceData.totalAmount,
      ntn: config.ntn || '',
      dateTime: invoiceData.dateTime,
    });

    return {
      invoiceNumber: response.invoiceNumber,
      qrCode,
      transactionId: response.transactionId,
      timestamp: new Date().toISOString(),
      status: 'success',
    };
  } catch (error) {
    console.error('[FBR] Error submitting invoice:', error);
    return {
      invoiceNumber: '',
      transactionId: 'error-' + Date.now(),
      timestamp: new Date().toISOString(),
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Mock FBR API call (replace with real implementation)
async function fbrAPICall(url: string, payload: any, apiKey: string): Promise<any> {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        invoiceNumber: 'FBR' + Date.now(),
        transactionId: 'TXN' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        status: 'success',
      });
    }, 1000);
  });
}

// Generate QR Code string (simplified)
function generateQRCode(data: any): string {
  // In production, use a QR code library
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

// Verify FBR Configuration
export async function verifyFBRConfiguration(): Promise<boolean> {
  try {
    const config = await FBRConfig.findOne().lean();
    return !!(
      config &&
      config.ntn &&
      config.strn &&
      config.posDeviceId &&
      config.posDeviceSerialNumber &&
      config.isEnabled
    );
  } catch {
    return false;
  }
}

// Get FBR Configuration
export async function getFBRConfig() {
  try {
    return await FBRConfig.findOne().lean();
  } catch (error) {
    console.error('[FBR] Error fetching config:', error);
    return null;
  }
}

// Sync FBR (for reconciliation)
export async function syncWithFBR() {
  try {
    const config = await FBRConfig.findOne();
    if (!config) return;

    // Update last sync time
    config.lastSyncTime = new Date();
    await config.save();

    return { success: true, message: 'Synced with FBR' };
  } catch (error) {
    console.error('[FBR] Sync error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Sync failed' };
  }
}
