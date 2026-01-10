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
        daysUntilExpiry: null,
        isInGracePeriod: false,
      });
    }

    const now = new Date();
    const isActive = subscription.status === 'approved' && subscription.endDate >= now;
    
    // Check if in grace period
    const gracePeriodEnd = subscription.gracePeriodEndDate || subscription.endDate;
    const isInGracePeriod = !isActive && subscription.status === 'approved' && gracePeriodEnd >= now;
    
    // Calculate days until expiry
    let daysUntilExpiry = null;
    if (isActive && subscription.endDate) {
      const diffTime = subscription.endDate - now;
      daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    res.status(200).json({
      success: true,
      subscription,
      hasActiveSubscription: isActive || isInGracePeriod,
      daysUntilExpiry,
      isInGracePeriod,
      isExpiringSoon: daysUntilExpiry !== null && daysUntilExpiry <= 7,
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
      proratedAmount,
      previousPlanId: currentSubscription.planId,
      previousPlanAmount: currentSubscription.amount,
      previousPlanEndDate: currentSubscription.endDate,
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

// @desc    Toggle auto-renewal
// @route   PUT /api/subscriptions/auto-renew
// @access  Private
export const toggleAutoRenew = async (req, res) => {
  try {
    const { autoRenew } = req.body;

    const subscription = await Subscription.findOne({
      userId: req.user._id,
      status: 'approved',
      endDate: { $gte: new Date() },
    }).sort({ endDate: -1 });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found',
      });
    }

    subscription.autoRenew = autoRenew === true || autoRenew === 'true';
    await subscription.save();

    res.status(200).json({
      success: true,
      subscription,
      message: `Auto-renewal ${subscription.autoRenew ? 'enabled' : 'disabled'}`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Retry payment for rejected subscription
// @route   POST /api/subscriptions/:id/retry-payment
// @access  Private
export const retryPayment = async (req, res) => {
  try {
    const { paymentMethod, upiTransactionId, upiAmount, cashAmount } = req.body;
    const subscriptionId = req.params.id;

    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      userId: req.user._id,
      status: { $in: ['rejected', 'pending'] },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found or cannot be retried',
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
    const plan = await SubscriptionPlan.findById(subscription.planId);
    if (Math.abs(totalAmount - plan.price) > 1) {
      return res.status(400).json({
        success: false,
        message: `Total amount (${totalAmount}) does not match plan price (${plan.price})`,
      });
    }

    // Update subscription with new payment details
    subscription.paymentMethod = paymentMethod;
    subscription.upiTransactionId = paymentMethod === 'upi' || paymentMethod === 'mixed' ? upiTransactionId : undefined;
    subscription.upiAmount = paymentMethod === 'upi' || paymentMethod === 'mixed' ? upiAmount : 0;
    subscription.cashAmount = paymentMethod === 'cash' || paymentMethod === 'mixed' ? cashAmount : 0;
    subscription.amount = totalAmount;
    subscription.status = 'pending';
    subscription.paymentRetryCount = (subscription.paymentRetryCount || 0) + 1;
    subscription.lastPaymentRetryAt = new Date();
    subscription.rejectionReason = undefined; // Clear previous rejection reason

    await subscription.save();

    // Update user subscription status
    await User.findByIdAndUpdate(req.user._id, {
      subscriptionStatus: 'pending',
    });

    res.status(200).json({
      success: true,
      subscription,
      message: 'Payment retry submitted. Waiting for admin approval.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Downgrade subscription
// @route   POST /api/subscriptions/downgrade
// @access  Private
export const downgradeSubscription = async (req, res) => {
  try {
    const { planId } = req.body;

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
        message: 'No active subscription found to downgrade',
      });
    }

    // Check if new plan is actually a downgrade (lower price)
    if (plan.price >= currentSubscription.amount) {
      return res.status(400).json({
        success: false,
        message: 'Selected plan is not a downgrade. Use upgrade instead.',
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

    // Create downgrade subscription request
    // Note: Downgrade typically takes effect at the end of current subscription
    const downgradeSubscription = await Subscription.create({
      userId: req.user._id,
      planId: plan._id,
      planName: plan.name,
      planDuration: plan.duration,
      amount: plan.price,
      paymentMethod: currentSubscription.paymentMethod, // Use same payment method
      status: 'pending',
      // Note: Payment will be handled when current subscription expires
    });

    res.status(201).json({
      success: true,
      subscription: downgradeSubscription,
      currentSubscription,
      message: 'Downgrade request created. It will take effect when your current subscription expires.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Pause subscription
// @route   POST /api/subscriptions/pause
// @access  Private
export const pauseSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      userId: req.user._id,
      status: 'approved',
      endDate: { $gte: new Date() },
      isPaused: false,
    }).sort({ endDate: -1 });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found to pause',
      });
    }

    subscription.isPaused = true;
    subscription.pausedAt = new Date();
    subscription.pausedBy = req.user._id;
    
    // Calculate remaining days and extend end date
    const now = new Date();
    const daysRemaining = Math.ceil((subscription.endDate - now) / (1000 * 60 * 60 * 24));
    subscription.pausedDays = daysRemaining;
    
    // Extend end date by paused days (subscription will resume automatically)
    subscription.resumeDate = new Date(subscription.endDate.getTime() + (daysRemaining * 24 * 60 * 60 * 1000));
    
    await subscription.save();

    res.status(200).json({
      success: true,
      subscription,
      message: 'Subscription paused successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Resume subscription
// @route   POST /api/subscriptions/resume
// @access  Private
export const resumeSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      userId: req.user._id,
      status: 'approved',
      isPaused: true,
    }).sort({ endDate: -1 });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No paused subscription found',
      });
    }

    subscription.isPaused = false;
    subscription.resumeDate = null;
    
    // Restore end date (or use resume date if set)
    if (subscription.resumeDate) {
      subscription.endDate = subscription.resumeDate;
    }
    
    await subscription.save();

    res.status(200).json({
      success: true,
      subscription,
      message: 'Subscription resumed successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Export payment history
// @route   GET /api/subscriptions/history/export
// @access  Private
export const exportPaymentHistory = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({
      userId: req.user._id,
      status: { $in: ['approved', 'expired', 'cancelled'] },
    })
      .populate('planId')
      .populate('approvedBy', 'email')
      .sort({ createdAt: -1 });

    // Format data for CSV export
    const csvData = subscriptions.map(sub => ({
      'Date': new Date(sub.createdAt).toLocaleDateString(),
      'Plan Name': sub.planName,
      'Duration (Days)': sub.planDuration,
      'Amount': sub.amount,
      'Payment Method': sub.paymentMethod,
      'UPI Amount': sub.upiAmount || 0,
      'Cash Amount': sub.cashAmount || 0,
      'Status': sub.status,
      'Start Date': sub.startDate ? new Date(sub.startDate).toLocaleDateString() : 'N/A',
      'End Date': sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'N/A',
      'Approved By': sub.approvedBy?.email || 'N/A',
      'Approved At': sub.approvedAt ? new Date(sub.approvedAt).toLocaleDateString() : 'N/A',
    }));

    // Convert to CSV
    const headers = Object.keys(csvData[0] || {});
    const csvRows = [
      headers.join(','),
      ...csvData.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=payment-history-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvData.length > 0 ? csvRows : headers.join(','));
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

