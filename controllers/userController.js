const bcrypt = require('bcryptjs');

const User = require('../models/User');

const formatUser = (user) => {
  return {
    id: user._id,
    name: user.name,
    shopName: user.shopName,
    mobile: user.mobile,
    email: user.email,
  };
};

const getProfile = async (req, res) => {
  return res.json({
    success: true,
    user: formatUser(req.user),
  });
};

const updateProfile = async (req, res) => {
  try {
    const allowedFields = ['name', 'shopName', 'mobile', 'email'];
    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: formatUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message,
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current password and new password',
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    const passwordMatches = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message,
    });
  }
};

module.exports = {
  changePassword,
  getProfile,
  updateProfile,
};
