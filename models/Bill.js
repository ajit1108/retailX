const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    barcode: {
      type: String,
      trim: true,
      default: '',
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Bill item quantity must be at least 1'],
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Bill item price cannot be negative'],
    },
    lineTotal: {
      type: Number,
      required: true,
      min: [0, 'Line total cannot be negative'],
    },
  },
  { _id: false }
);

const billSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: {
      type: [billItemSchema],
      required: true,
      validate: {
        validator(items) {
          return items.length > 0;
        },
        message: 'Bill must have at least one item',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    taxRate: {
      type: Number,
      required: true,
      default: 0.05,
      min: 0,
    },
    tax: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['completed', 'cancelled'],
      default: 'completed',
    },
  },
  {
    timestamps: true,
  }
);

billSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Bill', billSchema);
