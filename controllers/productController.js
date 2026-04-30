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

const toDate = (value) => {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const updateMissingFields = (product, data) => {
  if (!product.name && data.name) {
    product.name = data.name;
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

  if (!product.barcode && data.barcode) {
    product.barcode = data.barcode;
  }
};

const addProduct = async (req, res) => {
  try {
    const name = cleanString(req.body.name);
    const barcode = cleanString(req.body.barcode);
    const category = cleanString(req.body.category) || 'Uncategorized';
    const quantity = Math.max(toNumber(req.body.quantity), 0);
    const price = Math.max(toNumber(req.body.price), 0);
    const expiryDate = toDate(req.body.expiryDate);
    const normalizedName = normalizeText(name);

    if (!name && !barcode) {
      return res.status(400).json({
        success: false,
      message: 'Please provide a product name or barcode',
      });
    }

    const searchQuery = barcode
      ? { user: req.user._id, barcode }
      : { user: req.user._id, normalizedName };

    let product = await Product.findOne(searchQuery);
    let created = false;

    if (product) {
      updateMissingFields(product, {
        name,
        barcode,
        category,
        price,
        expiryDate,
      });

      // Existing stock should grow when another OCR/barcode entry adds quantity.
      product.quantity += quantity;
      product.isSynced = true;
      product.lastSyncedAt = new Date();

      await product.save();
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
      created = true;
    }

    await createLowStockNotification(req.user, product);

    return res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'Product created successfully' : 'Product updated successfully',
      product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to save product',
      error: error.message,
    });
  }
};

const getProducts = async (req, res) => {
  try {
    const products = await Product.find({ user: req.user._id }).sort({
      category: 1,
      createdAt: 1,
    });

    const productsByCategory = products.reduce((groups, product) => {
      const category = product.category || 'Uncategorized';

      if (!groups[category]) {
        groups[category] = [];
      }

      groups[category].push(product);
      return groups;
    }, {});

    return res.json({
      success: true,
      count: products.length,
      productsByCategory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message,
    });
  }
};

const searchProducts = async (req, res) => {
  try {
    const query = cleanString(String(req.query.q || req.query.query || ''));
    const normalizedQuery = normalizeText(query);

    if (!normalizedQuery) {
      return res.json({
        success: true,
        count: 0,
        products: [],
      });
    }

    const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const products = await Product.find({
      user: req.user._id,
      $or: [
        { normalizedName: { $regex: escapedQuery, $options: 'i' } },
        { barcode: { $regex: escapedQuery, $options: 'i' } },
      ],
    })
      .select('name barcode category price quantity')
      .sort({ normalizedName: 1, createdAt: 1 })
      .limit(8)
      .lean();

    return res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to search products',
      error: error.message,
    });
  }
};

const getProductByBarcode = async (req, res) => {
  try {
    const product = await Product.findOne({
      user: req.user._id,
      barcode: req.params.barcode,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    await createLowStockNotification(req.user, product);

    return res.json({
      success: true,
      product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message,
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const updates = {};
    const allowedFields = [
      'name',
      'barcode',
      'quantity',
      'price',
      'category',
      'expiryDate',
      'isSynced',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (updates.barcode === '') {
      updates.barcode = undefined;
    }

    if (updates.name) {
      updates.name = cleanString(updates.name);
      updates.normalizedName = normalizeText(updates.name);
    }

    if (updates.category) {
      updates.category = cleanString(updates.category);
    }

    if (updates.lastSyncedAt === undefined && updates.isSynced === true) {
      updates.lastSyncedAt = new Date();
    }

    const product = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id,
      },
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    return res.json({
      success: true,
      message: 'Product updated successfully',
      product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message,
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    return res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message,
    });
  }
};

module.exports = {
  addProduct,
  deleteProduct,
  getProductByBarcode,
  getProducts,
  searchProducts,
  updateProduct,
};
