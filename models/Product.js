const mongoose = require('mongoose');

const normalizeText = (value) => {
  if (!value) {
    return '';
  }

  return value.trim().toLowerCase().replace(/\s+/g, ' ');
};

const productSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    normalizedName: {
      type: String,
      trim: true,
      lowercase: true,
    },
    barcode: {
      type: String,
      trim: true,
      default: undefined,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Quantity cannot be negative'],
    },
    price: {
      type: Number,
      default: 0,
      min: [0, 'Price cannot be negative'],
    },
    category: {
      type: String,
      trim: true,
      default: 'Uncategorized',
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    isSynced: {
      type: Boolean,
      default: true,
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.pre('validate', function setNormalizedFields(next) {
  this.normalizedName = normalizeText(this.name);

  if (this.category) {
    this.category = this.category.trim();
  }

  if (this.barcode === '') {
    this.barcode = undefined;
  }

  next();
});

productSchema.index(
  { user: 1, barcode: 1 },
  {
    unique: true,
    partialFilterExpression: {
      barcode: { $exists: true },
    },
  }
);
productSchema.index({ user: 1, normalizedName: 1 });
productSchema.index({ user: 1, category: 1, createdAt: 1 });
productSchema.index({ user: 1, quantity: 1, createdAt: 1 });

module.exports = mongoose.model('Product', productSchema);
