const express = require('express');

const {
  addProduct,
  deleteProduct,
  getProductByBarcode,
  getProducts,
  searchProducts,
  updateProduct,
} = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, addProduct);
router.get('/', protect, getProducts);
router.get('/search', protect, searchProducts);
router.get('/barcode/:barcode', protect, getProductByBarcode);
router.put('/:id', protect, updateProduct);
router.delete('/:id', protect, deleteProduct);

module.exports = router;
