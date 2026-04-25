const Bill = require('../models/Bill');
const Product = require('../models/Product');
const { getStockPredictions } = require('../services/mlPredictionService');

const getLastSevenDays = () => {
  const days = [];

  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    date.setHours(0, 0, 0, 0);
    days.push(date);
  }

  return days;
};

const formatDateKey = (date) => date.toISOString().slice(0, 10);

const buildProductSalesMap = (bills) => {
  const salesMap = {};

  bills.forEach((bill) => {
    bill.items.forEach((item) => {
      const key = item.product?.toString() || item.barcode || item.name;

      if (!salesMap[key]) {
        salesMap[key] = {
          name: item.name,
          totalSold: 0,
          revenue: 0,
        };
      }

      salesMap[key].totalSold += item.quantity;
      salesMap[key].revenue += item.lineTotal;
    });
  });

  return salesMap;
};

const getOccasionSuggestions = (occasion) => {
  const normalizedOccasion = String(occasion || '').trim().toLowerCase();

  const festivalSuggestions = [
    {
      keywords: ['diwali', 'deepavali'],
      suggestions: ['Sweets', 'Dry fruits', 'Chocolates', 'Snacks', 'Decorative diyas'],
    },
    {
      keywords: ['holi'],
      suggestions: ['Colors', 'Thandai', 'Sweets', 'Snacks', 'Cold drinks'],
    },
    {
      keywords: ['eid', 'ramadan'],
      suggestions: ['Dates', 'Vermicelli', 'Dry fruits', 'Sweets', 'Beverages'],
    },
    {
      keywords: ['christmas'],
      suggestions: ['Cakes', 'Chocolates', 'Cookies', 'Gift packs', 'Soft drinks'],
    },
    {
      keywords: ['new year', 'newyear'],
      suggestions: ['Snacks', 'Cold drinks', 'Party supplies', 'Chocolates', 'Juices'],
    },
    {
      keywords: ['ganesh', 'ganesh chaturthi'],
      suggestions: ['Modak', 'Coconut', 'Flowers', 'Sweets', 'Puja items'],
    },
    {
      keywords: ['navratri', 'dussehra'],
      suggestions: ['Fasting snacks', 'Dry fruits', 'Fruits', 'Juices', 'Puja items'],
    },
    {
      keywords: ['raksha', 'raksha bandhan', 'rakhi'],
      suggestions: ['Rakhi', 'Sweets', 'Chocolates', 'Gift packs', 'Dry fruits'],
    },
    {
      keywords: ['wedding', 'marriage'],
      suggestions: ['Dry fruits', 'Beverages', 'Snacks', 'Gift packs', 'Sweets'],
    },
    {
      keywords: ['weekend', 'sale'],
      suggestions: ['Fast-moving snacks', 'Cold drinks', 'Dairy items', 'Bread', 'Fruits'],
    },
  ];

  const matchedFestival = festivalSuggestions.find((item) =>
    item.keywords.some((keyword) => normalizedOccasion.includes(keyword))
  );

  return matchedFestival?.suggestions || [
    'Fast-moving snacks',
    'Dairy items',
    'Bread',
    'Beverages',
    'Daily essentials',
  ];
};

const getAnalytics = async (req, res) => {
  try {
    const sevenDays = getLastSevenDays();
    const startDate = sevenDays[0];

    const [bills, products] = await Promise.all([
      Bill.find({
        user: req.user._id,
        status: 'completed',
        createdAt: { $gte: startDate },
      }),
      Product.find({ user: req.user._id }),
    ]);

    const salesByDate = {};
    sevenDays.forEach((date) => {
      salesByDate[formatDateKey(date)] = 0;
    });

    bills.forEach((bill) => {
      const key = formatDateKey(bill.createdAt);
      salesByDate[key] = (salesByDate[key] || 0) + bill.total;
    });

    const productSalesMap = buildProductSalesMap(bills);
    const soldProducts = Object.values(productSalesMap);
    const topSellingProducts = [...soldProducts]
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5);

    const slowMovingProducts = products
      .map((product) => {
        const sales = productSalesMap[product._id.toString()];
        return {
          id: product._id,
          name: product.name,
          quantity: product.quantity,
          totalSold: sales?.totalSold || 0,
        };
      })
      .sort((a, b) => a.totalSold - b.totalSold)
      .slice(0, 5);

    const predictionPayload = {
      userId: req.user._id,
      products: products.map((product) => ({
        id: product._id,
        name: product.name,
        category: product.category,
        quantity: product.quantity,
        price: product.price,
      })),
      recentSales: soldProducts,
    };
    const stockPrediction = await getStockPredictions(predictionPayload);

    return res.json({
      success: true,
      weeklySales: {
        labels: Object.keys(salesByDate),
        values: Object.values(salesByDate),
      },
      topSellingProducts,
      slowMovingProducts,
      stockPrediction,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load analytics',
      error: error.message,
    });
  }
};

const getOccasionInsight = async (req, res) => {
  try {
    const suggestions = getOccasionSuggestions(req.body.occasion);

    return res.json({
      success: true,
      occasion: req.body.occasion || 'General',
      suggestions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load occasion suggestions',
      error: error.message,
    });
  }
};

module.exports = {
  getAnalytics,
  getOccasionInsight,
};
