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

const scanProduct = async (req, res) => {
  try {
    const barcode = cleanString(req.body.barcode);
    const text = cleanString(req.body.text || req.body.name);
    const normalizedName = normalizeText(text);

    if (!barcode && !normalizedName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide barcode or text to scan',
      });
    }

    const searchQuery = barcode
      ? { user: req.user._id, barcode }
      : { user: req.user._id, normalizedName };

    const product = await Product.findOne(searchQuery);

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
