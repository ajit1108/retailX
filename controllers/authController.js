const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { getJwtSecret } = require('../config/env');
const User = require('../models/User');

const createToken = (userId) => {
  return jwt.sign({ id: userId }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

const formatUser = (user) => {
  return {
    id: user._id,
    name: user.name,
    shopName: user.shopName,
    mobile: user.mobile,
    email: user.email,
  };
};

const registerUser = async (req, res) => {
  try {
    const { name, shopName, mobile, email, password } = req.body;

    if (!name || !shopName || !mobile || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, shop name, mobile, email, and password',
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { mobile }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or mobile number',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      shopName,
      mobile,
      email,
      password: hashedPassword,
    });

    return res.status(201).json({
      success: true,
      token: createToken(user._id),
      user: formatUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '+password'
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    return res.json({
      success: true,
      token: createToken(user._id),
      user: formatUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
};
