const Bill = require('../models/Bill');
const { getWhatsAppConfig } = require('../config/env');
const Product = require('../models/Product');
const { createLowStockNotification } = require('../services/notificationService');
const { sendWhatsAppMessage } = require('../services/whatsappService');

const toNumber = (value, fallback = 0) => {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return fallback;
  }

  return numberValue;
};

const isValidNonEmptyString = (value) =>
  typeof value === 'string' && value.trim().length > 0;
const sanitizeBarcode = (value) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, '').replace(/\D/g, '') : '';

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfToday = () => {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
};

const normalizeMobile = (value) => String(value || '').replace(/\D/g, '');

const isValidCustomerMobile = (value) => /^[6-9]\d{9}$/.test(normalizeMobile(value));

const formatCurrency = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

const buildBillMessage = (bill) => {
  const lines = [
    'RetailX Bill',
    `Bill ID: ${bill._id}`,
    `Date: ${new Date(bill.createdAt).toLocaleString('en-IN')}`,
    'Items:',
  ];

  bill.items.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${item.name} x ${item.quantity} @ ${formatCurrency(item.price)} = ${formatCurrency(item.lineTotal)}`
    );
  });

  lines.push(`Subtotal: ${formatCurrency(bill.subtotal)}`);
  lines.push(`Tax (${Math.round((bill.taxRate || 0) * 100)}%): ${formatCurrency(bill.tax)}`);
  lines.push(`Total: ${formatCurrency(bill.total)}`);

  return lines.join('\n');
};

const createBill = async (req, res) => {
  try {
    const requestItems = Array.isArray(req.body.items) ? req.body.items : [];
    const taxRate = Math.max(toNumber(req.body.taxRate, 0.05), 0);
    const customerMobile = normalizeMobile(req.body.customerMobile);

    if (requestItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one bill item',
      });
    }

    if (!isValidCustomerMobile(customerMobile)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit customer mobile number',
      });
    }

    const productIds = requestItems
      .map((item) => item.productId)
      .filter(Boolean);
    const barcodes = requestItems
      .map((item) => sanitizeBarcode(item.barcode))
      .filter(Boolean);

    const lookupFilters = [
      productIds.length ? { _id: { $in: productIds } } : null,
      barcodes.length ? { barcode: { $in: barcodes } } : null,
    ].filter(Boolean);

    const matchedProducts = lookupFilters.length
      ? await Product.find({
          user: req.user._id,
          $or: lookupFilters,
        })
      : [];

    const productsById = new Map(
      matchedProducts.map((product) => [product._id.toString(), product])
    );
    const productsByBarcode = new Map(
      matchedProducts
        .filter((product) => product.barcode)
        .map((product) => [product.barcode, product])
    );

    const billItems = [];
    const touchedProducts = new Map();

    for (const item of requestItems) {
      const quantity = Math.max(toNumber(item.quantity || item.qty, 1), 1);
      const normalizedBarcode = sanitizeBarcode(item.barcode);
      const product = item.productId
        ? productsById.get(String(item.productId))
        : normalizedBarcode
        ? productsByBarcode.get(normalizedBarcode)
        : null;

      const name = product?.name || item.name;
      const barcode = product?.barcode || normalizedBarcode || '';
      const price = Math.max(toNumber(item.price, product?.price || 0), 0);
      console.log('Billing item lookup:', { name, barcode, quantity, price, found: Boolean(product) });

      if (!isValidNonEmptyString(name)) {
        return res.status(400).json({
          success: false,
          message: 'Each bill item needs a product name, productId, or barcode',
        });
      }

      if (price <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid price for product: ${String(name).trim()}`,
        });
      }

      const lineTotal = quantity * price;

      billItems.push({
        product: product?._id || null,
        name,
        barcode,
        quantity,
        price,
        lineTotal,
      });

      if (product) {
        product.quantity = Math.max(product.quantity - quantity, 0);
        touchedProducts.set(product._id.toString(), product);
      }
    }

    const updatedProducts = Array.from(touchedProducts.values());

    await Promise.all(updatedProducts.map((product) => product.save()));
    Promise.all(
      updatedProducts.map((product) => createLowStockNotification(req.user, product))
    ).catch((error) => {
      console.error('Low stock notification failed:', error.message);
    });

    const subtotal = billItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    const bill = await Bill.create({
      user: req.user._id,
      items: billItems,
      subtotal,
      taxRate,
      tax,
      total,
      status: 'completed',
    });

    const billMessage = buildBillMessage(bill);
    const whatsappConfig = getWhatsAppConfig();
    const whatsappTargets = [
      { recipient: 'customer', mobile: customerMobile },
      { recipient: 'owner', mobile: whatsappConfig.ownerNumber },
    ];

    const whatsappResults = await Promise.all(
      whatsappTargets.map(async (target) => {
        if (!target.mobile) {
          return {
            recipient: target.recipient,
            mobile: '',
            sent: false,
            provider: whatsappConfig.provider,
            error:
              target.recipient === 'owner'
                ? 'Owner WhatsApp number not configured'
                : 'Customer mobile number is missing or invalid',
          };
        }

        const result = await sendWhatsAppMessage(target.mobile, billMessage);
        return {
          recipient: target.recipient,
          mobile: target.mobile,
          ...result,
        };
      })
    );

    const successfulRecipients = whatsappResults.filter((item) => item.sent);
    const failedRecipients = whatsappResults.filter((item) => !item.sent);

    return res.status(201).json({
      success: true,
      message: 'Bill created successfully',
      bill,
      whatsapp: {
        attempted: true,
        results: whatsappResults,
        allSent: failedRecipients.length === 0,
        anySent: successfulRecipients.length > 0,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create bill',
      error: error.message,
    });
  }
};

const getBills = async (req, res) => {
  try {
    const bills = await Bill.find({ user: req.user._id }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: bills.length,
      bills,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch bills',
      error: error.message,
    });
  }
};

const getBillById = async (req, res) => {
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found',
      });
    }

    return res.json({
      success: true,
      bill,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch bill',
      error: error.message,
    });
  }
};

const getTodaySalesSummary = async (req, res) => {
  try {
    const bills = await Bill.find({
      user: req.user._id,
      status: 'completed',
      createdAt: {
        $gte: startOfToday(),
        $lte: endOfToday(),
      },
    });

    const totalSales = bills.reduce((sum, bill) => sum + bill.total, 0);
    const totalItemsSold = bills.reduce((sum, bill) => {
      const billItemCount = bill.items.reduce(
        (itemSum, item) => itemSum + item.quantity,
        0
      );
      return sum + billItemCount;
    }, 0);

    return res.json({
      success: true,
      summary: {
        totalSales,
        billCount: bills.length,
        totalItemsSold,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch today sales summary',
      error: error.message,
    });
  }
};

module.exports = {
  createBill,
  getBillById,
  getBills,
  getTodaySalesSummary,
};
