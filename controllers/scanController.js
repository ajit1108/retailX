const Product = require('../models/Product');

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

const sanitizeBarcode = (value) =>
  cleanString(String(value || ''))
    .replace(/\s+/g, '')
    .replace(/\D/g, '');
const isValidBarcode = (value) => /^\d{8,13}$/.test(value);

const scanProduct = async (req, res) => {
  try {
    const originalQuery = String(
      req.body.query || req.body.barcode || req.body.text || req.body.name || ''
    );
    const cleanedQuery = cleanString(originalQuery).replace(/[^\w\s./:-]/g, ' ');
    const normalizedName = normalizeText(cleanedQuery);
    const numericQuery = sanitizeBarcode(originalQuery);

    console.log('Scan original query:', originalQuery);
    console.log('Scan cleaned query:', cleanedQuery);
    console.log('Scan numeric query:', numericQuery);

    if (!numericQuery && !normalizedName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid search query',
      });
    }

    let product = null;

    if (numericQuery && isValidBarcode(numericQuery)) {
      product = await Product.findOne({
        user: req.user._id,
        barcode: numericQuery,
      });
      console.log('Scan barcode match found:', Boolean(product));
    }

    if (!product && normalizedName) {
      product = await Product.findOne({
        user: req.user._id,
        normalizedName,
      });
      console.log('Scan exact name match found:', Boolean(product));
    }

    if (!product && normalizedName) {
      const escapedQuery = normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      product = await Product.findOne({
        user: req.user._id,
        normalizedName: { $regex: escapedQuery, $options: 'i' },
      });
      console.log('Scan partial name match found:', Boolean(product));
    }

    if (!product) {
      return res.json({
        success: true,
        found: false,
        message: 'Product not found. You can add it manually.',
      });
    }

    return res.json({
      success: true,
      found: true,
      product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Scan lookup failed',
      error: error.message,
    });
  }
};

module.exports = {
  scanProduct,
};
