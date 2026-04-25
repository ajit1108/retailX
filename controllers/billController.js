const Bill = require('../models/Bill');
const Product = require('../models/Product');
const { createLowStockNotification } = require('../services/notificationService');

const toNumber = (value, fallback = 0) => {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return fallback;
  }

  return numberValue;
};

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

const createBill = async (req, res) => {
  try {
    const requestItems = Array.isArray(req.body.items) ? req.body.items : [];
    const taxRate = Math.max(toNumber(req.body.taxRate, 0.05), 0);

    if (requestItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one bill item',
      });
    }

    const billItems = [];

    for (const item of requestItems) {
      const quantity = Math.max(toNumber(item.quantity || item.qty, 1), 1);
      let product = null;

      if (item.productId) {
        product = await Product.findOne({
          _id: item.productId,
          user: req.user._id,
        });
      } else if (item.barcode) {
        product = await Product.findOne({
          barcode: item.barcode,
          user: req.user._id,
        });
      }

      const name = product?.name || item.name;
      const barcode = product?.barcode || item.barcode || '';
      const price = Math.max(toNumber(item.price, product?.price || 0), 0);

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Each bill item needs a product name, productId, or barcode',
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
        await product.save();
        await createLowStockNotification(req.user, product);
      }
    }

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

    return res.status(201).json({
      success: true,
      message: 'Bill created successfully',
      bill,
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
