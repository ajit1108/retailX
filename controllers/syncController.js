const Product = require('../models/Product');
const { createLowStockNotification } = require('../services/notificationService');

const normalizeText = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase().replace(/\s+/g, ' ');
};

const cleanString = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const toNumber = (value, fallback = 0) => {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return fallback;
  }

  return numberValue;
};

const updateMissingFields = (product, data) => {
  if (!product.name && data.name) {
    product.name = data.name;
  }

  if (!product.barcode && data.barcode) {
    product.barcode = data.barcode;
  }

  if ((!product.price || product.price === 0) && data.price > 0) {
    product.price = data.price;
  }

  if (
    (!product.category || product.category === 'Uncategorized') &&
    data.category
  ) {
    product.category = data.category;
  }

  if (!product.expiryDate && data.expiryDate) {
    product.expiryDate = data.expiryDate;
  }
};

const syncProducts = async (req, res) => {
  const items = Array.isArray(req.body.products) ? req.body.products : req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an array of products to sync',
    });
  }

  const results = {
    created: [],
    updated: [],
    failed: [],
  };

  for (const item of items) {
    try {
      const name = cleanString(item.name);
      const barcode = cleanString(item.barcode);
      const category = cleanString(item.category) || 'Uncategorized';
      const quantity = Math.max(toNumber(item.quantity), 0);
      const price = Math.max(toNumber(item.price), 0);
      const expiryDate = item.expiryDate ? new Date(item.expiryDate) : null;
      const normalizedName = normalizeText(name);

      if (!name && !barcode) {
        results.failed.push({
          item,
          message: 'Product needs a name or barcode',
        });
        continue;
      }

      const searchQuery = barcode
        ? { user: req.user._id, barcode }
        : { user: req.user._id, normalizedName };

      let product = await Product.findOne(searchQuery);

      if (product) {
        updateMissingFields(product, {
          name,
          barcode,
          category,
          price,
          expiryDate,
        });

        // Offline uploads represent new local stock changes, so quantity grows.
        product.quantity += quantity;
        product.isSynced = true;
        product.lastSyncedAt = new Date();

        await product.save();
        await createLowStockNotification(req.user, product);
        results.updated.push(product);
      } else {
        product = await Product.create({
          user: req.user._id,
          name: name || barcode,
          barcode: barcode || undefined,
          quantity,
          price,
          category,
          expiryDate,
          isSynced: true,
          lastSyncedAt: new Date(),
        });

        await createLowStockNotification(req.user, product);
        results.created.push(product);
      }
    } catch (error) {
      results.failed.push({
        item,
        message: error.message,
      });
    }
  }

  return res.json({
    success: true,
    message: 'Sync completed',
    summary: {
      created: results.created.length,
      updated: results.updated.length,
      failed: results.failed.length,
    },
    results,
  });
};

module.exports = {
  syncProducts,
};
