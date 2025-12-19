import Subscription from '../models/Subscription.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import User from '../models/User.js';
import Invoice from '../models/Invoice.js';

// @desc    Get all subscriptions
// @route   GET /api/admin/subscriptions
// @access  Private/Admin
export const getAllSubscriptions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, paymentMethod } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (status) {
      query.status = status;
    }
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    const subscriptions = await Subscription.find(query)
      .populate('userId', 'email phone')
      .populate('planId')
      .populate('approvedBy', 'email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Subscription.countDocuments(query);

    res.status(200).json({
      success: true,
      subscriptions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get pending subscriptions
// @route   GET /api/admin/subscriptions/pending
// @access  Private/Admin
export const getPendingSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ status: 'pending' })
      .populate('userId', 'email phone')
      .populate('planId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      subscriptions,
      count: subscriptions.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get subscription by ID
// @route   GET /api/admin/subscriptions/:id
// @access  Private/Admin
export const getSubscriptionById = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id)
      .populate('userId', 'email phone')
      .populate('planId')
      .populate('approvedBy', 'email');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    res.status(200).json({
      success: true,
      subscription,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Approve subscription
// @route   PUT /api/admin/subscriptions/:id/approve
// @access  Private/Admin
export const approveSubscription = async (req, res) => {
  try {
    const { cashReceivedDate, cashReceivedBy } = req.body;

    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    if (subscription.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Subscription is already ${subscription.status}`,
      });
    }

    // Check if this is an upgrade (user has an existing active subscription)
    const existingActiveSubscription = await Subscription.findOne({
      userId: subscription.userId,
      status: 'approved',
      endDate: { $gte: new Date() },
      _id: { $ne: subscription._id },
    }).sort({ endDate: -1 });

    // Update subscription
    subscription.status = 'approved';
    subscription.approvedBy = req.user._id;
    subscription.approvedAt = new Date();
    
    if (existingActiveSubscription) {
      // This is an upgrade - extend from existing subscription end date
      subscription.startDate = existingActiveSubscription.endDate;
      const endDate = new Date(existingActiveSubscription.endDate);
      endDate.setDate(endDate.getDate() + subscription.planDuration);
      subscription.endDate = endDate;
    } else {
      // New subscription - start from today
      subscription.startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + subscription.planDuration);
      subscription.endDate = endDate;
    }

    // Update cash payment details if applicable
    if (subscription.paymentMethod === 'cash' || subscription.paymentMethod === 'mixed') {
      if (cashReceivedDate) {
        subscription.cashReceivedDate = new Date(cashReceivedDate);
      }
      if (cashReceivedBy) {
        subscription.cashReceivedBy = cashReceivedBy;
      }
    }

    await subscription.save();

    // Generate invoice
    let invoice = null;
    try {
      invoice = await Invoice.create({
        subscriptionId: subscription._id,
        userId: subscription.userId,
        planName: subscription.planName,
        planDuration: subscription.planDuration,
        amount: subscription.amount,
        paymentMethod: subscription.paymentMethod,
        upiAmount: subscription.upiAmount,
        cashAmount: subscription.cashAmount,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        status: 'paid',
      });

      // Link invoice to subscription
      subscription.invoiceId = invoice._id;
      await subscription.save();
    } catch (error) {
      console.error('Error creating invoice:', error);
      // If invoice creation fails, return error with helpful message
      return res.status(500).json({
        success: false,
        message: 'Subscription approved but failed to generate invoice. Please try again or contact support.',
        error: error.message,
      });
    }

    // Update user subscription status
    await User.findByIdAndUpdate(subscription.userId, {
      subscriptionId: subscription._id,
      subscriptionStatus: 'active',
      subscriptionExpiryDate: subscription.endDate,
    });

    res.status(200).json({
      success: true,
      subscription,
      invoice,
      message: 'Subscription approved successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Reject subscription
// @route   PUT /api/admin/subscriptions/:id/reject
// @access  Private/Admin
export const rejectSubscription = async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    if (subscription.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Subscription is already ${subscription.status}`,
      });
    }

    subscription.status = 'rejected';
    subscription.rejectionReason = rejectionReason || 'Payment verification failed';

    await subscription.save();

    // Update user subscription status
    await User.findByIdAndUpdate(subscription.userId, {
      subscriptionStatus: 'none',
    });

    res.status(200).json({
      success: true,
      subscription,
      message: 'Subscription rejected',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Cancel subscription
// @route   PUT /api/admin/subscriptions/:id/cancel
// @access  Private/Admin
export const cancelSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    if (subscription.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel subscription with status: ${subscription.status}`,
      });
    }

    subscription.status = 'cancelled';

    await subscription.save();

    // Update user subscription status
    await User.findByIdAndUpdate(subscription.userId, {
      subscriptionStatus: 'none',
      subscriptionExpiryDate: null,
    });

    res.status(200).json({
      success: true,
      subscription,
      message: 'Subscription cancelled successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Reactivate subscription
// @route   PUT /api/admin/subscriptions/:id/reactivate
// @access  Private/Admin
export const reactivateSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    const currentStatus = subscription.status;
    
    if (currentStatus !== 'cancelled' && currentStatus !== 'expired') {
      return res.status(400).json({
        success: false,
        message: `Cannot reactivate subscription with status: ${currentStatus}`,
      });
    }

    // Reactivate the subscription
    subscription.status = 'approved';
    
    // If expired or cancelled, extend from current date
    if (currentStatus === 'expired' || currentStatus === 'cancelled' || !subscription.endDate || subscription.endDate < new Date()) {
      subscription.startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + subscription.planDuration);
      subscription.endDate = endDate;
    }

    await subscription.save();

    // Generate new invoice for reactivated subscription
    try {
      const invoice = await Invoice.create({
        subscriptionId: subscription._id,
        userId: subscription.userId,
        planName: subscription.planName,
        planDuration: subscription.planDuration,
        amount: subscription.amount,
        paymentMethod: subscription.paymentMethod,
        upiAmount: subscription.upiAmount,
        cashAmount: subscription.cashAmount,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        status: 'paid',
      });

      // Link invoice to subscription
      subscription.invoiceId = invoice._id;
      await subscription.save();
    } catch (error) {
      // If invoice creation fails, log but don't fail the reactivation
      console.error('Error creating invoice for reactivated subscription:', error);
      // Continue without invoice - subscription is still reactivated
    }

    // Update user subscription status
    await User.findByIdAndUpdate(subscription.userId, {
      subscriptionId: subscription._id,
      subscriptionStatus: 'active',
      subscriptionExpiryDate: subscription.endDate,
    });

    res.status(200).json({
      success: true,
      subscription,
      invoice: invoice || null,
      message: invoice 
        ? 'Subscription reactivated successfully and invoice generated' 
        : 'Subscription reactivated successfully (invoice generation skipped)',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get subscription statistics
// @route   GET /api/admin/subscriptions/stats
// @access  Private/Admin
export const getSubscriptionStats = async (req, res) => {
  try {
    const totalSubscriptions = await Subscription.countDocuments();
    const activeSubscriptions = await Subscription.countDocuments({
      status: 'approved',
      endDate: { $gte: new Date() },
    });
    const pendingSubscriptions = await Subscription.countDocuments({ status: 'pending' });
    const expiredSubscriptions = await Subscription.countDocuments({
      status: 'approved',
      endDate: { $lt: new Date() },
    });

    // Calculate revenue
    const approvedSubscriptions = await Subscription.find({ status: 'approved' });
    const totalRevenue = approvedSubscriptions.reduce((sum, sub) => sum + sub.amount, 0);

    // Monthly revenue (current month)
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    const monthlySubscriptions = await Subscription.find({
      status: 'approved',
      approvedAt: { $gte: currentMonth },
    });
    const monthlyRevenue = monthlySubscriptions.reduce((sum, sub) => sum + sub.amount, 0);

    // Plan distribution
    const planDistribution = await Subscription.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$planName', count: { $sum: 1 } } },
    ]);

    // Expiring subscriptions (next 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const expiringSubscriptions = await Subscription.countDocuments({
      status: 'approved',
      endDate: { $gte: new Date(), $lte: sevenDaysFromNow },
    });

    res.status(200).json({
      success: true,
      stats: {
        totalSubscriptions,
        activeSubscriptions,
        pendingSubscriptions,
        expiredSubscriptions,
        totalRevenue,
        monthlyRevenue,
        planDistribution,
        expiringSubscriptions,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all subscription plans
// @route   GET /api/admin/subscription-plans
// @access  Private/Admin
export const getAllPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find().sort({ displayOrder: 1 });

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

// @desc    Create subscription plan
// @route   POST /api/admin/subscription-plans
// @access  Private/Admin
export const createPlan = async (req, res) => {
  try {
    const { name, duration, price, currency, isActive, displayOrder } = req.body;

    const plan = await SubscriptionPlan.create({
      name,
      duration,
      price,
      currency: currency || 'INR',
      isActive: isActive !== undefined ? isActive : true,
      displayOrder: displayOrder || 0,
    });

    res.status(201).json({
      success: true,
      plan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update subscription plan
// @route   PUT /api/admin/subscription-plans/:id
// @access  Private/Admin
export const updatePlan = async (req, res) => {
  try {
    const { name, duration, price, currency, isActive, displayOrder } = req.body;

    const plan = await SubscriptionPlan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    if (name) plan.name = name;
    if (duration) plan.duration = duration;
    if (price !== undefined) plan.price = price;
    if (currency) plan.currency = currency;
    if (isActive !== undefined) plan.isActive = isActive;
    if (displayOrder !== undefined) plan.displayOrder = displayOrder;

    await plan.save();

    res.status(200).json({
      success: true,
      plan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete subscription plan
// @route   DELETE /api/admin/subscription-plans/:id
// @access  Private/Admin
export const deletePlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }

    // Check if any active subscriptions use this plan
    const activeSubscriptions = await Subscription.countDocuments({
      planId: plan._id,
      status: 'approved',
      endDate: { $gte: new Date() },
    });

    if (activeSubscriptions > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete plan with active subscriptions. Deactivate it instead.',
      });
    }

    await plan.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Plan deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

