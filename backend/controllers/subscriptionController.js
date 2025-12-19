import Subscription from '../models/Subscription.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import User from '../models/User.js';
import Invoice from '../models/Invoice.js';
import { uploadToS3 } from '../config/s3.js';

// @desc    Get all available subscription plans
// @route   GET /api/subscriptions/plans
// @access  Private
export const getPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ displayOrder: 1 });

    res.status(200).json({
      success: true,
      plans,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get current subscription
// @route   GET /api/subscriptions/current
// @access  Private
export const getCurrentSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      userId: req.user._id,
    })
      .populate('planId')
      .sort({ createdAt: -1 });

    if (!subscription) {
      return res.status(200).json({
        success: true,
        subscription: null,
        hasActiveSubscription: false,
      });
    }

    const isActive = subscription.status === 'approved' && subscription.endDate >= new Date();

    res.status(200).json({
      success: true,
      subscription,
      hasActiveSubscription: isActive,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get subscription history
// @route   GET /api/subscriptions/history
// @access  Private
export const getSubscriptionHistory = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({
      userId: req.user._id,
    })
      .populate('planId')
      .populate('approvedBy', 'email')
      .populate('invoiceId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      subscriptions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get invoice by subscription ID
// @route   GET /api/subscriptions/:id/invoice
// @access  Private
export const getInvoice = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate('invoiceId');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    if (!subscription.invoiceId) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found for this subscription',
      });
    }

    res.status(200).json({
      success: true,
      invoice: subscription.invoiceId,
      subscription,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create subscription request
// @route   POST /api/subscriptions/subscribe
// @access  Private
export const subscribe = async (req, res) => {
  try {
    const { planId, paymentMethod, upiTransactionId, upiAmount, cashAmount } = req.body;

    // Validate plan exists
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found',
      });
    }

    // Validate payment method
    if (!['upi', 'cash', 'mixed'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method',
      });
    }

    // Validate amounts
    let totalAmount = 0;
    if (paymentMethod === 'upi') {
      if (!upiAmount || upiAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'UPI amount is required',
        });
      }
      totalAmount = upiAmount;
    } else if (paymentMethod === 'cash') {
      if (!cashAmount || cashAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Cash amount is required',
        });
      }
      totalAmount = cashAmount;
    } else if (paymentMethod === 'mixed') {
      if (!upiAmount || !cashAmount || upiAmount <= 0 || cashAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Both UPI and cash amounts are required for mixed payment',
        });
      }
      totalAmount = upiAmount + cashAmount;
    }

    // Validate total amount matches plan price
    if (Math.abs(totalAmount - plan.price) > 1) {
      return res.status(400).json({
        success: false,
        message: `Total amount (${totalAmount}) does not match plan price (${plan.price})`,
      });
    }

    // Check if user already has a pending subscription
    const existingPending = await Subscription.findOne({
      userId: req.user._id,
      status: 'pending',
    });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending subscription request. Please wait for approval.',
      });
    }

    // Create subscription
    const subscription = await Subscription.create({
      userId: req.user._id,
      planId: plan._id,
      planName: plan.name,
      planDuration: plan.duration,
      amount: totalAmount,
      paymentMethod,
      upiTransactionId: paymentMethod === 'upi' || paymentMethod === 'mixed' ? upiTransactionId : undefined,
      upiAmount: paymentMethod === 'upi' || paymentMethod === 'mixed' ? upiAmount : 0,
      cashAmount: paymentMethod === 'cash' || paymentMethod === 'mixed' ? cashAmount : 0,
      status: 'pending',
    });

    // Update user subscription status
    await User.findByIdAndUpdate(req.user._id, {
      subscriptionStatus: 'pending',
    });

    res.status(201).json({
      success: true,
      subscription,
      message: 'Subscription request created. Waiting for admin approval.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Upgrade subscription
// @route   POST /api/subscriptions/upgrade
// @access  Private
export const upgradeSubscription = async (req, res) => {
  try {
    const { planId, paymentMethod, upiTransactionId, upiAmount, cashAmount } = req.body;

    // Validate plan exists
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found',
      });
    }

    // Get current active subscription
    const currentSubscription = await Subscription.findOne({
      userId: req.user._id,
      status: 'approved',
      endDate: { $gte: new Date() },
    }).sort({ endDate: -1 });

    if (!currentSubscription) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found to upgrade',
      });
    }

    // Validate payment method
    if (!['upi', 'cash', 'mixed'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method',
      });
    }

    // Validate amounts
    let totalAmount = 0;
    if (paymentMethod === 'upi') {
      if (!upiAmount || upiAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'UPI amount is required',
        });
      }
      totalAmount = upiAmount;
    } else if (paymentMethod === 'cash') {
      if (!cashAmount || cashAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Cash amount is required',
        });
      }
      totalAmount = cashAmount;
    } else if (paymentMethod === 'mixed') {
      if (!upiAmount || !cashAmount || upiAmount <= 0 || cashAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Both UPI and cash amounts are required for mixed payment',
        });
      }
      totalAmount = upiAmount + cashAmount;
    }

    // Validate total amount matches plan price
    if (Math.abs(totalAmount - plan.price) > 1) {
      return res.status(400).json({
        success: false,
        message: `Total amount (${totalAmount}) does not match plan price (${plan.price})`,
      });
    }

    // Check if user already has a pending upgrade
    const existingPending = await Subscription.findOne({
      userId: req.user._id,
      status: 'pending',
    });

    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending subscription request. Please wait for approval.',
      });
    }

    // Create upgrade subscription request
    const upgradeSubscription = await Subscription.create({
      userId: req.user._id,
      planId: plan._id,
      planName: plan.name,
      planDuration: plan.duration,
      amount: totalAmount,
      paymentMethod,
      upiTransactionId: paymentMethod === 'upi' || paymentMethod === 'mixed' ? upiTransactionId : undefined,
      upiAmount: paymentMethod === 'upi' || paymentMethod === 'mixed' ? upiAmount : 0,
      cashAmount: paymentMethod === 'cash' || paymentMethod === 'mixed' ? cashAmount : 0,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      subscription: upgradeSubscription,
      currentSubscription,
      message: 'Upgrade request created. Waiting for admin approval.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Upload UPI payment proof
// @route   POST /api/subscriptions/upload-proof
// @access  Private
export const uploadPaymentProof = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a payment screenshot',
      });
    }

    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'Subscription ID is required',
      });
    }

    // Check if subscription exists and belongs to user
    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      userId: req.user._id,
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    // Upload to S3
    const fileUrl = await uploadToS3(req.file, 'subscriptions');

    // Update subscription with screenshot URL
    subscription.upiScreenshot = fileUrl;
    await subscription.save();

    res.status(200).json({
      success: true,
      subscription,
      message: 'Payment proof uploaded successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

