const Product = require('../models/Product');
const Bill = require('../models/Bill');
const Notification = require('../models/Notification');

const LOW_STOCK_THRESHOLD = 5;

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

const getDashboard = async (req, res) => {
  try {
    const [
      totalProducts,
      lowStockItems,
      fifoProducts,
      todayBills,
      unreadNotificationCount,
    ] = await Promise.all([
      Product.countDocuments({ user: req.user._id }),
      Product.find({
        user: req.user._id,
        quantity: { $lt: LOW_STOCK_THRESHOLD },
      }).sort({ quantity: 1, createdAt: 1 }),
      Product.find({ user: req.user._id }).sort({
        category: 1,
        createdAt: 1,
      }),
      Bill.find({
        user: req.user._id,
        status: 'completed',
        createdAt: {
          $gte: startOfToday(),
          $lte: endOfToday(),
        },
      }),
      Notification.countDocuments({
        user: req.user._id,
        isRead: false,
      }),
    ]);

    const todaySales = todayBills.reduce((sum, bill) => sum + bill.total, 0);
    const todayItemsSold = todayBills.reduce((sum, bill) => {
      const billItemsSold = bill.items.reduce(
        (itemSum, item) => itemSum + item.quantity,
        0
      );
      return sum + billItemsSold;
    }, 0);

    const performerMap = {};
    todayBills.forEach((bill) => {
      bill.items.forEach((item) => {
        const key = item.product?.toString() || item.barcode || item.name;

        if (!performerMap[key]) {
          performerMap[key] = {
            name: item.name,
            totalSold: 0,
            revenue: 0,
          };
        }

        performerMap[key].totalSold += item.quantity;
        performerMap[key].revenue += item.lineTotal;
      });
    });

    const topPerformingItems = Object.values(performerMap)
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5);

    const productsByCategory = fifoProducts.reduce((groups, product) => {
      const category = product.category || 'Uncategorized';

      if (!groups[category]) {
        groups[category] = [];
      }

      groups[category].push(product);
      return groups;
    }, {});

    return res.json({
      success: true,
      summary: {
        totalProducts,
        todaySales,
        todayItemsSold,
        todayBillCount: todayBills.length,
        lowStockCount: lowStockItems.length,
        lowStockThreshold: LOW_STOCK_THRESHOLD,
        unreadNotificationCount,
      },
      lowStockItems,
      priorityAlerts: lowStockItems.map((product) => ({
        title: product.name,
        message: `Low stock: ${product.quantity} units left`,
        type: 'low_stock',
      })),
      topPerformingItems,
      productsByCategory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load dashboard',
      error: error.message,
    });
  }
};

module.exports = {
  getDashboard,
};
