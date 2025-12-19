import Invoice from '../models/Invoice.js';

/**
 * Generate a unique invoice number
 * Format: INV-YYYYMM-XXXXX (e.g., INV-202501-00001)
 */
export const generateInvoiceNumber = async () => {
  try {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const prefix = `INV-${year}${month}-`;

    // Find the latest invoice with the same prefix
    const latestInvoice = await Invoice.findOne({
      invoiceNumber: { $regex: `^${prefix}` }
    }).sort({ createdAt: -1 });

    let nextNumber = 1;
    if (latestInvoice && latestInvoice.invoiceNumber) {
      // Extract the number from the latest invoice
      const match = latestInvoice.invoiceNumber.match(new RegExp(`^${prefix}(\\d+)$`));
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Generate invoice number with padding
    let invoiceNumber = `${prefix}${String(nextNumber).padStart(5, '0')}`;

    // Double-check uniqueness (in case of race condition)
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
      const existing = await Invoice.findOne({ invoiceNumber });
      if (!existing) {
        return invoiceNumber;
      }
      // If exists, increment and try again
      nextNumber++;
      invoiceNumber = `${prefix}${String(nextNumber).padStart(5, '0')}`;
      attempts++;
    }

    // Fallback: use timestamp-based approach if we can't find a unique number
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `${prefix}${String(timestamp).slice(-5)}${String(random).padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating invoice number:', error);
    // Fallback: use timestamp-based approach
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    return `INV-${year}${month}-${String(timestamp).slice(-5)}${String(random).padStart(4, '0')}`;
  }
};

