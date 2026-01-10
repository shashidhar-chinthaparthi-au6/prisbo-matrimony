import Subscription from '../models/Subscription.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import User from '../models/User.js';
import Invoice from '../models/Invoice.js';
import { generateInvoiceNumber } from '../utils/generateInvoiceNumber.js';

// @desc    Get all subscriptions
// @route   GET /api/admin/subscriptions
// @access  Private/Admin
export const getAllSubscriptions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, paymentMethod, planId, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (status) {
      query.status = status;
    }
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }
    if (planId) {
      query.planId = planId;
    }
    if (search) {
      // Search by user email or phone
      const User = (await import('../models/User.js')).default;
      const users = await User.find({
        $or: [
          { email: new RegExp(search, 'i') },
          { phone: new RegExp(search, 'i') },
        ],
      }).select('_id');
      const userIds = users.map(u => u._id);
      query.userId = { $in: userIds };
    }

    const subscriptions = await Subscription.find(query)
      .populate('userId', 'email phone role companyName')
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
      .populate('userId', 'email phone role companyName')
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
      .populate('userId', 'email phone role companyName')
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
      // Generate invoice number before creating invoice to avoid race condition
      const invoiceNumber = await generateInvoiceNumber();
      
      invoice = await Invoice.create({
        invoiceNumber,
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

    // Set grace period end date (7 days after expiry by default)
    const gracePeriodEndDate = new Date(subscription.endDate);
    gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + (subscription.gracePeriodDays || 7));
    subscription.gracePeriodEndDate = gracePeriodEndDate;

    await subscription.save();

    // Update user subscription status
    await User.findByIdAndUpdate(subscription.userId, {
      subscriptionId: subscription._id,
      subscriptionStatus: 'active',
      subscriptionExpiryDate: subscription.endDate,
    });

    // Send notification to user
    const Notification = (await import('../models/Notification.js')).default;
    await Notification.create({
      userId: subscription.userId,
      type: 'subscription_approved',
      title: 'Subscription Approved',
      message: `Your subscription for ${subscription.planName} has been approved and is now active.`,
      relatedUserId: req.user.id,
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

    // Send notification to user
    const Notification = (await import('../models/Notification.js')).default;
    await Notification.create({
      userId: subscription.userId,
      type: 'subscription_rejected',
      title: 'Subscription Rejected',
      message: `Your subscription request has been rejected. Reason: ${subscription.rejectionReason}`,
      relatedUserId: req.user.id,
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
      // Generate invoice number before creating invoice to avoid race condition
      const invoiceNumber = await generateInvoiceNumber();
      
      const invoice = await Invoice.create({
        invoiceNumber,
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

// @desc    Bulk approve subscriptions
// @route   POST /api/admin/subscriptions/bulk-approve
// @access  Private/Admin
export const bulkApproveSubscriptions = async (req, res) => {
  try {
    const { subscriptionIds, cashReceivedDate, cashReceivedBy } = req.body;

    if (!subscriptionIds || !Array.isArray(subscriptionIds) || subscriptionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of subscription IDs',
      });
    }

    const subscriptions = await Subscription.find({
      _id: { $in: subscriptionIds },
      status: 'pending',
    });

    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No pending subscriptions found with the provided IDs',
      });
    }

    const Notification = (await import('../models/Notification.js')).default;
    const approvedSubscriptions = [];
    
    for (const subscription of subscriptions) {
      subscription.status = 'approved';
      subscription.approvedBy = req.user.id;
      subscription.approvedAt = new Date();
      subscription.startDate = new Date();
      
      const plan = await SubscriptionPlan.findById(subscription.planId);
      const endDate = new Date(subscription.startDate);
      endDate.setDate(endDate.getDate() + plan.duration);
      subscription.endDate = endDate;

      // Set grace period
      const gracePeriodEndDate = new Date(subscription.endDate);
      gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + (subscription.gracePeriodDays || 7));
      subscription.gracePeriodEndDate = gracePeriodEndDate;

      if (subscription.paymentMethod === 'cash' || subscription.paymentMethod === 'mixed') {
        subscription.cashReceivedDate = cashReceivedDate || new Date();
        subscription.cashReceivedBy = cashReceivedBy || 'Admin';
      }

      await subscription.save();

      // Update user subscription status
      if (subscription.userId) {
        await User.findByIdAndUpdate(subscription.userId, {
          subscriptionId: subscription._id,
          subscriptionStatus: 'active',
          subscriptionExpiryDate: subscription.endDate,
        });
      }

      // Create invoice
      const invoice = await Invoice.create({
        subscriptionId: subscription._id,
        userId: subscription.userId,
        invoiceNumber: generateInvoiceNumber(),
        amount: subscription.amount,
        status: 'paid',
      });

      subscription.invoiceId = invoice._id;
      await subscription.save();

      // Create notification
      if (subscription.userId) {
        await Notification.create({
          userId: subscription.userId,
          type: 'subscription_approved',
          title: 'Subscription Approved',
          message: `Your ${plan.name} subscription has been approved`,
          relatedUserId: req.user.id,
        });
      }

      approvedSubscriptions.push(subscription);
    }

    res.status(200).json({
      success: true,
      message: `${approvedSubscriptions.length} subscription(s) approved successfully`,
      count: approvedSubscriptions.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Bulk reject subscriptions
// @route   POST /api/admin/subscriptions/bulk-reject
// @access  Private/Admin
export const bulkRejectSubscriptions = async (req, res) => {
  try {
    const { subscriptionIds, rejectionReason } = req.body;

    if (!subscriptionIds || !Array.isArray(subscriptionIds) || subscriptionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of subscription IDs',
      });
    }

    const subscriptions = await Subscription.find({
      _id: { $in: subscriptionIds },
      status: 'pending',
    });

    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No pending subscriptions found with the provided IDs',
      });
    }

    const updateResult = await Subscription.updateMany(
      { _id: { $in: subscriptions.map(s => s._id) } },
      {
        status: 'rejected',
        rejectionReason: rejectionReason || 'Subscription request rejected',
        rejectedAt: new Date(),
      }
    );

    // Create notifications
    const Notification = (await import('../models/Notification.js')).default;
    const notifications = subscriptions.map(subscription => ({
      userId: subscription.userId,
      type: 'subscription_rejected',
      title: 'Subscription Rejected',
      message: `Your subscription request has been rejected. ${rejectionReason || 'Please contact support for more information.'}`,
      relatedUserId: req.user.id,
    })).filter(n => n.userId); // Only create notifications for subscriptions with userId

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    res.status(200).json({
      success: true,
      message: `${updateResult.modifiedCount} subscription(s) rejected successfully`,
      count: updateResult.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Bulk delete subscriptions
// @route   DELETE /api/admin/subscriptions/bulk-delete
// @access  Private/Admin
export const bulkDeleteSubscriptions = async (req, res) => {
  try {
    const { subscriptionIds } = req.body;

    if (!subscriptionIds || !Array.isArray(subscriptionIds) || subscriptionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of subscription IDs',
      });
    }

    const deleteResult = await Subscription.deleteMany({
      _id: { $in: subscriptionIds },
    });

    res.status(200).json({
      success: true,
      message: `${deleteResult.deletedCount} subscription(s) deleted successfully`,
      count: deleteResult.deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Process refund for subscription
// @route   POST /api/admin/subscriptions/:id/refund
// @access  Private/Admin
export const processRefund = async (req, res) => {
  try {
    const { refundAmount, refundReason } = req.body;
    const subscriptionId = req.params.id;

    if (!refundAmount || refundAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid refund amount is required',
      });
    }

    const subscription = await Subscription.findById(subscriptionId);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    if (subscription.status !== 'approved' && subscription.status !== 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Refund can only be processed for approved or cancelled subscriptions',
      });
    }

    if (refundAmount > subscription.amount) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount cannot exceed subscription amount',
      });
    }

    subscription.refundAmount = refundAmount;
    subscription.refundReason = refundReason || 'Admin processed refund';
    subscription.refundedAt = new Date();
    subscription.refundedBy = req.user.id;
    subscription.refundStatus = 'completed';

    await subscription.save();

    // Send notification to user
    const Notification = (await import('../models/Notification.js')).default;
    await Notification.create({
      userId: subscription.userId,
      type: 'subscription_refund',
      title: 'Refund Processed',
      message: `A refund of ₹${refundAmount} has been processed for your subscription. Reason: ${subscription.refundReason}`,
      relatedUserId: req.user.id,
    });

    res.status(200).json({
      success: true,
      subscription,
      message: 'Refund processed successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

