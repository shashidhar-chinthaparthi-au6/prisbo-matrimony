import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../context/AuthContext';
import { getPlans, getCurrentSubscription, getSubscriptionHistory, subscribe, upgradeSubscription, uploadPaymentProof, getInvoice } from '../services/subscriptionService';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Subscription = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [upiTransactionId, setUpiTransactionId] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const { data: plansData, isLoading: plansLoading } = useQuery('subscription-plans', getPlans);
  const { data: currentSubscriptionData, isLoading: subscriptionLoading } = useQuery(
    'current-subscription',
    getCurrentSubscription
  );
  const { data: historyData, isLoading: historyLoading } = useQuery(
    'subscription-history',
    getSubscriptionHistory,
    { enabled: showHistory }
  );

  const subscribeMutation = useMutation(subscribe, {
    onSuccess: (data) => {
      toast.success('Subscription request created! Waiting for admin approval.');
      queryClient.invalidateQueries('current-subscription');
      if (data.subscription && paymentMethod === 'upi' && screenshot) {
        // Upload screenshot if UPI payment
        uploadScreenshot(data.subscription._id);
      } else {
        setSelectedPlan(null);
        setPaymentMethod('');
        setUpiAmount('');
        setCashAmount('');
        setUpiTransactionId('');
        setScreenshot(null);
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create subscription');
    },
  });

  const upgradeMutation = useMutation(upgradeSubscription, {
    onSuccess: (data) => {
      toast.success('Upgrade request created! Waiting for admin approval.');
      queryClient.invalidateQueries('current-subscription');
      if (data.subscription && paymentMethod === 'upi' && screenshot) {
        // Upload screenshot if UPI payment
        uploadScreenshot(data.subscription._id);
      } else {
        setSelectedPlan(null);
        setPaymentMethod('');
        setUpiAmount('');
        setCashAmount('');
        setUpiTransactionId('');
        setScreenshot(null);
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to upgrade subscription');
    },
  });

  const uploadScreenshot = async (subscriptionId) => {
    if (!screenshot) return;
    
    try {
      await uploadPaymentProof(subscriptionId, screenshot);
      toast.success('Payment proof uploaded successfully!');
      setSelectedPlan(null);
      setPaymentMethod('');
      setUpiAmount('');
      setCashAmount('');
      setUpiTransactionId('');
      setScreenshot(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload payment proof');
    }
  };

  const handleSubscribe = () => {
    if (!selectedPlan) {
      toast.error('Please select a plan');
      return;
    }

    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    let totalAmount = 0;
    if (paymentMethod === 'upi') {
      if (!screenshot) {
        toast.error('Please upload payment screenshot');
        return;
      }
      totalAmount = selectedPlan.price;
    } else if (paymentMethod === 'cash') {
      totalAmount = selectedPlan.price;
    } else if (paymentMethod === 'mixed') {
      if (!upiAmount || !cashAmount || parseFloat(upiAmount) <= 0 || parseFloat(cashAmount) <= 0) {
        toast.error('Please enter both UPI and cash amounts');
        return;
      }
      if (!screenshot) {
        toast.error('Please upload UPI payment screenshot');
        return;
      }
      totalAmount = parseFloat(upiAmount) + parseFloat(cashAmount);
      if (Math.abs(totalAmount - selectedPlan.price) > 1) {
        toast.error(`Total amount (₹${totalAmount}) does not match plan price (₹${selectedPlan.price})`);
        return;
      }
    }

    subscribeMutation.mutate({
      planId: selectedPlan._id,
      paymentMethod,
      upiAmount: paymentMethod === 'upi' ? selectedPlan.price : paymentMethod === 'mixed' ? parseFloat(upiAmount) : undefined,
      cashAmount: paymentMethod === 'cash' ? selectedPlan.price : paymentMethod === 'mixed' ? parseFloat(cashAmount) : undefined,
      upiTransactionId: paymentMethod === 'upi' || paymentMethod === 'mixed' ? upiTransactionId : undefined,
    });
  };

  const currentSubscription = currentSubscriptionData?.subscription;
  const hasActiveSubscription = currentSubscriptionData?.hasActiveSubscription;

  if (subscriptionLoading || plansLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Subscription</h1>

        {/* Current Subscription Status */}
        {currentSubscription && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Current Subscription</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Plan:</span>
                <span className="font-medium">{currentSubscription.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    currentSubscription.status === 'approved' && hasActiveSubscription
                      ? 'bg-green-100 text-green-800'
                      : currentSubscription.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : currentSubscription.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {currentSubscription.status === 'approved' && hasActiveSubscription
                    ? 'Active'
                    : currentSubscription.status.charAt(0).toUpperCase() + currentSubscription.status.slice(1)}
                </span>
              </div>
              {currentSubscription.status === 'approved' && currentSubscription.endDate && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expires:</span>
                    <span className="font-medium">
                      {new Date(currentSubscription.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Days Remaining:</span>
                    <span className="font-medium">
                      {Math.ceil(
                        (new Date(currentSubscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)
                      )}{' '}
                      days
                    </span>
                  </div>
                </>
              )}
              {currentSubscription.status === 'pending' && (
                <p className="text-yellow-600 text-sm mt-2">
                  Your subscription request is pending approval. You will be notified once approved.
                </p>
              )}
              {currentSubscription.status === 'rejected' && currentSubscription.rejectionReason && (
                <p className="text-red-600 text-sm mt-2">
                  Rejection reason: {currentSubscription.rejectionReason}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Upgrade Section - Show when user has active subscription */}
        {hasActiveSubscription && currentSubscription && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Upgrade Your Subscription</h2>
            <p className="text-gray-600 mb-4">
              Extend your subscription by upgrading to a longer plan. Your subscription will be extended from the current expiry date.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {plansData?.plans
                ?.filter((plan) => plan.name !== currentSubscription.planName)
                ?.map((plan) => (
                <div
                  key={plan._id}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    selectedPlan?._id === plan._id
                      ? 'border-red-600 bg-red-50'
                      : 'border-gray-200 hover:border-red-300'
                  }`}
                  onClick={() => setSelectedPlan(plan)}
                >
                  <h3 className="font-bold text-lg mb-2">{plan.name}</h3>
                  <p className="text-2xl font-bold text-red-600 mb-1">₹{plan.price}</p>
                  <p className="text-sm text-gray-600">{plan.duration} days</p>
                </div>
              ))}
            </div>

            {selectedPlan && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
                {/* Payment form - same as subscribe form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method
                    </label>
                    <div className="flex gap-4">
                      {['upi', 'cash', 'mixed'].map((method) => (
                        <button
                          key={method}
                          onClick={() => {
                            setPaymentMethod(method);
                            if (method === 'upi') {
                              setUpiAmount(selectedPlan.price.toString());
                              setCashAmount('');
                            } else if (method === 'cash') {
                              setCashAmount(selectedPlan.price.toString());
                              setUpiAmount('');
                            } else {
                              setUpiAmount('');
                              setCashAmount('');
                            }
                          }}
                          className={`px-4 py-2 rounded-md ${
                            paymentMethod === method
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {method.charAt(0).toUpperCase() + method.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {paymentMethod === 'upi' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        UPI Transaction ID
                      </label>
                      <input
                        type="text"
                        value={upiTransactionId}
                        onChange={(e) => setUpiTransactionId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Enter UPI Transaction ID"
                      />
                      <label className="block text-sm font-medium text-gray-700 mb-2 mt-4">
                        Payment Screenshot
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setScreenshot(e.target.files[0])}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  )}

                  {paymentMethod === 'cash' && (
                    <div>
                      <p className="text-sm text-gray-600">
                        Cash payment details will be filled by admin during approval.
                      </p>
                    </div>
                  )}

                  {paymentMethod === 'mixed' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          UPI Amount
                        </label>
                        <input
                          type="number"
                          value={upiAmount}
                          onChange={(e) => setUpiAmount(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Enter UPI amount"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          UPI Transaction ID
                        </label>
                        <input
                          type="text"
                          value={upiTransactionId}
                          onChange={(e) => setUpiTransactionId(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Enter UPI Transaction ID"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Screenshot
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setScreenshot(e.target.files[0])}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cash Amount
                        </label>
                        <input
                          type="number"
                          value={cashAmount}
                          onChange={(e) => setCashAmount(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Enter cash amount"
                        />
                      </div>
                      <div className="bg-blue-50 p-3 rounded-md">
                        <p className="text-sm text-blue-800">
                          Total: ₹{parseFloat(upiAmount || 0) + parseFloat(cashAmount || 0)} / Plan
                          Price: ₹{selectedPlan.price}
                        </p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleUpgrade}
                    disabled={upgradeMutation.isLoading}
                    className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {upgradeMutation.isLoading ? 'Submitting...' : 'Upgrade Subscription'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Subscription Plans */}
        {!hasActiveSubscription && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Choose a Plan</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {plansData?.plans?.map((plan) => (
                <button
                  key={plan._id}
                  onClick={() => {
                    setSelectedPlan(plan);
                    setUpiAmount('');
                    setCashAmount('');
                    setPaymentMethod('');
                    setScreenshot(null);
                  }}
                  className={`p-4 border-2 rounded-lg text-left transition ${
                    selectedPlan?._id === plan._id
                      ? 'border-red-600 bg-red-50'
                      : 'border-gray-200 hover:border-red-300'
                  }`}
                >
                  <div className="font-bold text-lg mb-2">{plan.name}</div>
                  <div className="text-2xl font-bold text-red-600 mb-1">₹{plan.price}</div>
                  <div className="text-sm text-gray-600">{plan.duration} days</div>
                </button>
              ))}
            </div>

            {/* Payment Form */}
            {selectedPlan && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="upi"
                        checked={paymentMethod === 'upi'}
                        onChange={(e) => {
                          setPaymentMethod(e.target.value);
                          setCashAmount('');
                        }}
                        className="mr-2"
                      />
                      UPI
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cash"
                        checked={paymentMethod === 'cash'}
                        onChange={(e) => {
                          setPaymentMethod(e.target.value);
                          setUpiAmount('');
                          setUpiTransactionId('');
                          setScreenshot(null);
                        }}
                        className="mr-2"
                      />
                      Cash
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="mixed"
                        checked={paymentMethod === 'mixed'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="mr-2"
                      />
                      Mixed (UPI + Cash)
                    </label>
                  </div>

                  {paymentMethod === 'upi' && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-3 rounded-md">
                        <p className="text-sm text-blue-800 font-medium">
                          Plan Amount: ₹{selectedPlan.price}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Transaction ID (Optional)
                        </label>
                        <input
                          type="text"
                          value={upiTransactionId}
                          onChange={(e) => setUpiTransactionId(e.target.value)}
                          placeholder="Enter UPI transaction ID"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Payment Screenshot
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setScreenshot(e.target.files[0])}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                        {screenshot && (
                          <p className="text-sm text-gray-600 mt-1">Selected: {screenshot.name}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'cash' && (
                    <div>
                      <div className="bg-blue-50 p-3 rounded-md mb-4">
                        <p className="text-sm text-blue-800 font-medium">
                          Plan Amount: ₹{selectedPlan.price}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600">
                        After submitting, admin will verify and approve your cash payment.
                      </p>
                    </div>
                  )}

                  {paymentMethod === 'mixed' && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-3 rounded-md">
                        <p className="text-sm text-blue-800 font-medium">
                          Plan Amount: ₹{selectedPlan.price}
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          Please split the payment between UPI and Cash
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          UPI Amount (₹)
                        </label>
                        <input
                          type="number"
                          value={upiAmount}
                          onChange={(e) => setUpiAmount(e.target.value)}
                          placeholder="Enter UPI amount"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cash Amount (₹)
                        </label>
                        <input
                          type="number"
                          value={cashAmount}
                          onChange={(e) => setCashAmount(e.target.value)}
                          placeholder="Enter cash amount"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Transaction ID (Optional)
                        </label>
                        <input
                          type="text"
                          value={upiTransactionId}
                          onChange={(e) => setUpiTransactionId(e.target.value)}
                          placeholder="Enter UPI transaction ID"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          UPI Payment Screenshot
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setScreenshot(e.target.files[0])}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                        {screenshot && (
                          <p className="text-sm text-gray-600 mt-1">Selected: {screenshot.name}</p>
                        )}
                      </div>
                      <div className="bg-blue-50 p-3 rounded-md">
                        <p className="text-sm text-blue-800">
                          Total: ₹{parseFloat(upiAmount || 0) + parseFloat(cashAmount || 0)} / Plan
                          Price: ₹{selectedPlan.price}
                        </p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleSubscribe}
                    disabled={subscribeMutation.isLoading}
                    className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {subscribeMutation.isLoading ? 'Submitting...' : 'Subscribe'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info Message */}
        {!hasActiveSubscription && !currentSubscription && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              <strong>Note:</strong> You need an active subscription to send interests, add favorites,
              and view profiles. Subscribe now to unlock all features!
            </p>
          </div>
        )}

        {/* Subscription History */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Subscription History</h2>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-red-600 hover:text-red-700 font-medium"
            >
              {showHistory ? 'Hide' : 'Show'} History
            </button>
          </div>

          {showHistory && (
            <div>
              {historyLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                </div>
              ) : historyData?.subscriptions?.length > 0 ? (
                <div className="space-y-4">
                  {historyData.subscriptions.map((sub) => (
                    <div key={sub._id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold">{sub.planName}</div>
                          <div className="text-sm text-gray-600">
                            {sub.startDate && new Date(sub.startDate).toLocaleDateString()} -{' '}
                            {sub.endDate && new Date(sub.endDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              sub.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : sub.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : sub.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : sub.status === 'cancelled'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        Amount: ₹{sub.amount} | Payment: {sub.paymentMethod}
                      </div>
                      {sub.invoiceId && (
                        <button
                          onClick={async () => {
                            try {
                              const invoiceData = await getInvoice(sub._id);
                              setSelectedInvoice(invoiceData);
                            } catch (error) {
                              toast.error('Failed to load invoice');
                            }
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View Invoice
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-8">No subscription history found</p>
              )}
            </div>
          )}
        </div>

        {/* Invoice Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Invoice</h2>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <div>
                    <p className="font-semibold">Invoice Number</p>
                    <p className="text-gray-600">{selectedInvoice.invoice?.invoiceNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">Date</p>
                    <p className="text-gray-600">
                      {new Date(selectedInvoice.invoice?.invoiceDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <p className="font-semibold mb-2">Plan Details</p>
                  <p className="text-gray-600">Plan: {selectedInvoice.invoice?.planName}</p>
                  <p className="text-gray-600">Duration: {selectedInvoice.invoice?.planDuration} days</p>
                  <p className="text-gray-600">
                    Period: {new Date(selectedInvoice.invoice?.startDate).toLocaleDateString()} -{' '}
                    {new Date(selectedInvoice.invoice?.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="border-t pt-4">
                  <p className="font-semibold mb-2">Payment Details</p>
                  <p className="text-gray-600">Payment Method: {selectedInvoice.invoice?.paymentMethod}</p>
                  {selectedInvoice.invoice?.paymentMethod === 'mixed' && (
                    <>
                      <p className="text-gray-600">UPI Amount: ₹{selectedInvoice.invoice?.upiAmount}</p>
                      <p className="text-gray-600">Cash Amount: ₹{selectedInvoice.invoice?.cashAmount}</p>
                    </>
                  )}
                  <p className="text-lg font-bold mt-2">Total Amount: ₹{selectedInvoice.invoice?.amount}</p>
                </div>
                <div className="border-t pt-4">
                  <p className="font-semibold mb-2">Status</p>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedInvoice.invoice?.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {selectedInvoice.invoice?.status}
                  </span>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => {
                      window.print();
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Print Invoice
                  </button>
                  <button
                    onClick={() => setSelectedInvoice(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Subscription;

