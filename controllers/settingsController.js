const User = require('../models/User');

const getSettings = async (req, res) => {
  return res.json({
    success: true,
    preferences: req.user.preferences,
  });
};

const updateSettings = async (req, res) => {
  try {
    const allowedPreferences = [
      'lowStockAlerts',
      'weeklyInsights',
      'autoSaveReceipts',
    ];
    const preferences = {};

    allowedPreferences.forEach((key) => {
      if (req.body[key] !== undefined) {
        preferences[`preferences.${key}`] = Boolean(req.body[key]);
      }
    });

    const user = await User.findByIdAndUpdate(req.user._id, preferences, {
      new: true,
      runValidators: true,
    });

    return res.json({
      success: true,
      message: 'Settings updated successfully',
      preferences: user.preferences,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message,
    });
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
