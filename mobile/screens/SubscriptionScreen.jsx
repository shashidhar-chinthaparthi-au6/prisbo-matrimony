import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import * as ImagePicker from 'expo-image-picker';
import { getPlans, getCurrentSubscription, getSubscriptionHistory, subscribe, upgradeSubscription, uploadPaymentProof, getInvoice } from '../services/subscriptionService';

const SubscriptionScreen = ({ navigation }) => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [upiTransactionId, setUpiTransactionId] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const queryClient = useQueryClient();

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
    onSuccess: async (data) => {
      Alert.alert('Success', 'Subscription request created! Waiting for admin approval.');
      queryClient.invalidateQueries('current-subscription');
      if (data.subscription && paymentMethod === 'upi' && screenshot) {
        await uploadScreenshot(data.subscription._id);
      } else {
        resetForm();
      }
    },
    onError: (error) => {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create subscription');
    },
  });

  const upgradeMutation = useMutation(upgradeSubscription, {
    onSuccess: async (data) => {
      Alert.alert('Success', 'Upgrade request created! Waiting for admin approval.');
      queryClient.invalidateQueries('current-subscription');
      if (data.subscription && paymentMethod === 'upi' && screenshot) {
        await uploadScreenshot(data.subscription._id);
      } else {
        resetForm();
      }
    },
    onError: (error) => {
      Alert.alert('Error', error.response?.data?.message || 'Failed to upgrade subscription');
    },
  });

  const uploadScreenshot = async (subscriptionId) => {
    if (!screenshot) return;

    try {
      await uploadPaymentProof(subscriptionId, screenshot);
      Alert.alert('Success', 'Payment proof uploaded successfully!');
      resetForm();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to upload payment proof');
    }
  };

  const resetForm = () => {
    setSelectedPlan(null);
    setPaymentMethod('');
    setUpiAmount('');
    setCashAmount('');
    setUpiTransactionId('');
    setScreenshot(null);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setScreenshot(result.assets[0]);
    }
  };

  const handleSubscribe = () => {
    if (!selectedPlan) {
      Alert.alert('Error', 'Please select a plan');
      return;
    }

    if (!paymentMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    let totalAmount = 0;
    if (paymentMethod === 'upi') {
      if (!screenshot) {
        Alert.alert('Error', 'Please upload payment screenshot');
        return;
      }
      totalAmount = selectedPlan.price;
    } else if (paymentMethod === 'cash') {
      totalAmount = selectedPlan.price;
    } else if (paymentMethod === 'mixed') {
      if (!upiAmount || !cashAmount || parseFloat(upiAmount) <= 0 || parseFloat(cashAmount) <= 0) {
        Alert.alert('Error', 'Please enter both UPI and cash amounts');
        return;
      }
      if (!screenshot) {
        Alert.alert('Error', 'Please upload UPI payment screenshot');
        return;
      }
      totalAmount = parseFloat(upiAmount) + parseFloat(cashAmount);
      if (Math.abs(totalAmount - selectedPlan.price) > 1) {
        Alert.alert('Error', `Total amount (₹${totalAmount}) does not match plan price (₹${selectedPlan.price})`);
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

  const handleUpgrade = () => {
    if (!selectedPlan) {
      Alert.alert('Error', 'Please select a plan');
      return;
    }

    if (!paymentMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    let totalAmount = 0;
    if (paymentMethod === 'upi') {
      if (!screenshot) {
        Alert.alert('Error', 'Please upload payment screenshot');
        return;
      }
      totalAmount = selectedPlan.price;
    } else if (paymentMethod === 'cash') {
      totalAmount = selectedPlan.price;
    } else if (paymentMethod === 'mixed') {
      if (!upiAmount || !cashAmount || parseFloat(upiAmount) <= 0 || parseFloat(cashAmount) <= 0) {
        Alert.alert('Error', 'Please enter both UPI and cash amounts');
        return;
      }
      if (!screenshot) {
        Alert.alert('Error', 'Please upload UPI payment screenshot');
        return;
      }
      totalAmount = parseFloat(upiAmount) + parseFloat(cashAmount);
      if (Math.abs(totalAmount - selectedPlan.price) > 1) {
        Alert.alert('Error', `Total amount (₹${totalAmount}) does not match plan price (₹${selectedPlan.price})`);
        return;
      }
    }

    upgradeMutation.mutate({
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
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#ef4444" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Subscription</Text>

      {/* Current Subscription Status */}
      {currentSubscription && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Subscription</Text>
          <View style={styles.statusRow}>
            <Text style={styles.label}>Plan:</Text>
            <Text style={styles.value}>{currentSubscription.planName}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.label}>Status:</Text>
            <View
              style={[
                styles.statusBadge,
                currentSubscription.status === 'approved' && hasActiveSubscription
                  ? styles.statusActive
                  : currentSubscription.status === 'pending'
                  ? styles.statusPending
                  : currentSubscription.status === 'rejected'
                  ? styles.statusRejected
                  : styles.statusExpired,
              ]}
            >
              <Text style={styles.statusText}>
                {currentSubscription.status === 'approved' && hasActiveSubscription
                  ? 'Active'
                  : currentSubscription.status.charAt(0).toUpperCase() + currentSubscription.status.slice(1)}
              </Text>
            </View>
          </View>
          {currentSubscription.status === 'approved' && currentSubscription.endDate && (
            <>
              <View style={styles.statusRow}>
                <Text style={styles.label}>Expires:</Text>
                <Text style={styles.value}>
                  {new Date(currentSubscription.endDate).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.label}>Days Remaining:</Text>
                <Text style={styles.value}>
                  {Math.ceil(
                    (new Date(currentSubscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)
                  )}{' '}
                  days
                </Text>
              </View>
            </>
          )}
          {currentSubscription.status === 'pending' && (
            <Text style={styles.pendingText}>
              Your subscription request is pending approval. You will be notified once approved.
            </Text>
          )}
          {currentSubscription.status === 'rejected' && currentSubscription.rejectionReason && (
            <Text style={styles.rejectedText}>
              Rejection reason: {currentSubscription.rejectionReason}
            </Text>
          )}
        </View>
      )}

      {/* Upgrade Section - Show when user has active subscription */}
      {hasActiveSubscription && currentSubscription && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Upgrade Your Subscription</Text>
          <Text style={styles.label}>
            Extend your subscription by upgrading to a longer plan. Your subscription will be extended from the current expiry date.
          </Text>
          <View style={styles.plansContainer}>
            {plansData?.plans
              ?.filter((plan) => plan.name !== currentSubscription.planName)
              ?.map((plan) => (
              <TouchableOpacity
                key={plan._id}
                style={[
                  styles.planCard,
                  selectedPlan?._id === plan._id && styles.planCardSelected,
                ]}
                onPress={() => {
                  setSelectedPlan(plan);
                  setUpiAmount('');
                  setCashAmount('');
                  setPaymentMethod('');
                  setScreenshot(null);
                }}
              >
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>₹{plan.price}</Text>
                <Text style={styles.planDuration}>{plan.duration} days</Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedPlan && (
            <View style={styles.paymentForm}>
              <Text style={styles.formTitle}>Payment Details</Text>
              {/* Payment form - same as subscribe form */}
              <View style={styles.paymentMethods}>
                {['upi', 'cash', 'mixed'].map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.paymentMethodButton,
                      paymentMethod === method && styles.paymentMethodSelected,
                    ]}
                    onPress={() => {
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
                  >
                    <Text
                      style={[
                        styles.paymentMethodText,
                        paymentMethod === method && styles.paymentMethodTextSelected,
                      ]}
                    >
                      {method.charAt(0).toUpperCase() + method.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {paymentMethod === 'upi' && (
                <View>
                  <Text style={styles.label}>UPI Transaction ID</Text>
                  <TextInput
                    style={styles.input}
                    value={upiTransactionId}
                    onChangeText={setUpiTransactionId}
                    placeholder="Enter UPI Transaction ID"
                  />
                  <Text style={styles.label}>Payment Screenshot</Text>
                  <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                    <Text style={styles.uploadButtonText}>
                      {screenshot ? 'Change Screenshot' : 'Upload Screenshot'}
                    </Text>
                  </TouchableOpacity>
                  {screenshot && (
                    <Image source={{ uri: screenshot.uri }} style={styles.screenshotPreview} />
                  )}
                </View>
              )}

              {paymentMethod === 'cash' && (
                <View>
                  <Text style={styles.label}>
                    Cash payment details will be filled by admin during approval.
                  </Text>
                </View>
              )}

              {paymentMethod === 'mixed' && (
                <View>
                  <Text style={styles.label}>UPI Amount</Text>
                  <TextInput
                    style={styles.input}
                    value={upiAmount}
                    onChangeText={setUpiAmount}
                    placeholder="Enter UPI amount"
                    keyboardType="numeric"
                  />
                  <Text style={styles.label}>UPI Transaction ID</Text>
                  <TextInput
                    style={styles.input}
                    value={upiTransactionId}
                    onChangeText={setUpiTransactionId}
                    placeholder="Enter UPI Transaction ID"
                  />
                  <Text style={styles.label}>Payment Screenshot</Text>
                  <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                    <Text style={styles.uploadButtonText}>
                      {screenshot ? 'Change Screenshot' : 'Upload Screenshot'}
                    </Text>
                  </TouchableOpacity>
                  {screenshot && (
                    <Image source={{ uri: screenshot.uri }} style={styles.screenshotPreview} />
                  )}
                  <Text style={styles.label}>Cash Amount</Text>
                  <TextInput
                    style={styles.input}
                    value={cashAmount}
                    onChangeText={setCashAmount}
                    placeholder="Enter cash amount"
                    keyboardType="numeric"
                  />
                  <View style={styles.totalBox}>
                    <Text style={styles.totalText}>
                      Total: ₹{parseFloat(upiAmount || 0) + parseFloat(cashAmount || 0)} / Plan
                      Price: ₹{selectedPlan.price}
                    </Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.subscribeButton}
                onPress={handleUpgrade}
                disabled={upgradeMutation.isLoading}
              >
                {upgradeMutation.isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.subscribeButtonText}>Upgrade Subscription</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Upgrade Section - Show when user has active subscription */}
      {hasActiveSubscription && currentSubscription && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Upgrade Your Subscription</Text>
          <Text style={styles.label}>
            Extend your subscription by upgrading to a longer plan. Your subscription will be extended from the current expiry date.
          </Text>
          <View style={styles.plansContainer}>
            {plansData?.plans?.map((plan) => (
              <TouchableOpacity
                key={plan._id}
                style={[
                  styles.planCard,
                  selectedPlan?._id === plan._id && styles.planCardSelected,
                ]}
                onPress={() => {
                  setSelectedPlan(plan);
                  setUpiAmount('');
                  setCashAmount('');
                  setPaymentMethod('');
                  setScreenshot(null);
                }}
              >
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>₹{plan.price}</Text>
                <Text style={styles.planDuration}>{plan.duration} days</Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedPlan && (
            <View style={styles.paymentForm}>
              <Text style={styles.formTitle}>Payment Details</Text>
              {/* Payment form - reuse the same form structure */}
              <View style={styles.paymentMethods}>
                <TouchableOpacity
                  style={[
                    styles.paymentMethodButton,
                    paymentMethod === 'upi' && styles.paymentMethodSelected,
                  ]}
                  onPress={() => {
                    setPaymentMethod('upi');
                    setUpiAmount(selectedPlan.price.toString());
                    setCashAmount('');
                  }}
                >
                  <Text
                    style={[
                      styles.paymentMethodText,
                      paymentMethod === 'upi' && styles.paymentMethodTextSelected,
                    ]}
                  >
                    UPI
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.paymentMethodButton,
                    paymentMethod === 'cash' && styles.paymentMethodSelected,
                  ]}
                  onPress={() => {
                    setPaymentMethod('cash');
                    setCashAmount(selectedPlan.price.toString());
                    setUpiAmount('');
                    setUpiTransactionId('');
                    setScreenshot(null);
                  }}
                >
                  <Text
                    style={[
                      styles.paymentMethodText,
                      paymentMethod === 'cash' && styles.paymentMethodTextSelected,
                    ]}
                  >
                    Cash
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.paymentMethodButton,
                    paymentMethod === 'mixed' && styles.paymentMethodSelected,
                  ]}
                  onPress={() => setPaymentMethod('mixed')}
                >
                  <Text
                    style={[
                      styles.paymentMethodText,
                      paymentMethod === 'mixed' && styles.paymentMethodTextSelected,
                    ]}
                  >
                    Mixed
                  </Text>
                </TouchableOpacity>
              </View>

              {paymentMethod === 'upi' && (
                <View style={styles.formSection}>
                  <View style={styles.totalBox}>
                    <Text style={styles.totalText}>Plan Amount: ₹{selectedPlan.price}</Text>
                  </View>
                  <Text style={styles.inputLabel}>Transaction ID (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={upiTransactionId}
                    onChangeText={setUpiTransactionId}
                    placeholder="Enter UPI transaction ID"
                  />
                  <Text style={styles.inputLabel}>Payment Screenshot</Text>
                  <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                    <Text style={styles.uploadButtonText}>
                      {screenshot ? 'Change Screenshot' : 'Upload Screenshot'}
                    </Text>
                  </TouchableOpacity>
                  {screenshot && (
                    <Image source={{ uri: screenshot.uri }} style={styles.screenshotPreview} />
                  )}
                </View>
              )}

              {paymentMethod === 'cash' && (
                <View style={styles.formSection}>
                  <View style={styles.totalBox}>
                    <Text style={styles.totalText}>Plan Amount: ₹{selectedPlan.price}</Text>
                  </View>
                  <Text style={styles.infoText}>
                    After submitting, admin will verify and approve your cash payment.
                  </Text>
                </View>
              )}

              {paymentMethod === 'mixed' && (
                <View style={styles.formSection}>
                  <Text style={styles.inputLabel}>UPI Amount</Text>
                  <TextInput
                    style={styles.input}
                    value={upiAmount}
                    onChangeText={setUpiAmount}
                    placeholder="Enter UPI amount"
                    keyboardType="numeric"
                  />
                  <Text style={styles.inputLabel}>UPI Transaction ID</Text>
                  <TextInput
                    style={styles.input}
                    value={upiTransactionId}
                    onChangeText={setUpiTransactionId}
                    placeholder="Enter UPI transaction ID"
                  />
                  <Text style={styles.inputLabel}>Payment Screenshot</Text>
                  <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                    <Text style={styles.uploadButtonText}>
                      {screenshot ? 'Change Screenshot' : 'Upload Screenshot'}
                    </Text>
                  </TouchableOpacity>
                  {screenshot && (
                    <Image source={{ uri: screenshot.uri }} style={styles.screenshotPreview} />
                  )}
                  <Text style={styles.inputLabel}>Cash Amount</Text>
                  <TextInput
                    style={styles.input}
                    value={cashAmount}
                    onChangeText={setCashAmount}
                    placeholder="Enter cash amount"
                    keyboardType="numeric"
                  />
                  <View style={styles.totalBox}>
                    <Text style={styles.totalText}>
                      Total: ₹{parseFloat(upiAmount || 0) + parseFloat(cashAmount || 0)} / Plan
                      Price: ₹{selectedPlan.price}
                    </Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.subscribeButton}
                onPress={handleUpgrade}
                disabled={upgradeMutation.isLoading}
              >
                {upgradeMutation.isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.subscribeButtonText}>Upgrade Subscription</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Subscription Plans */}
      {!hasActiveSubscription && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Choose a Plan</Text>
          <View style={styles.plansContainer}>
            {plansData?.plans?.map((plan) => (
              <TouchableOpacity
                key={plan._id}
                onPress={() => {
                  setSelectedPlan(plan);
                  setUpiAmount('');
                  setCashAmount('');
                  setPaymentMethod('');
                  setScreenshot(null);
                }}
                style={[
                  styles.planCard,
                  selectedPlan?._id === plan._id && styles.planCardSelected,
                ]}
              >
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>₹{plan.price}</Text>
                <Text style={styles.planDuration}>{plan.duration} days</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Payment Form */}
          {selectedPlan && (
            <View style={styles.paymentForm}>
              <Text style={styles.formTitle}>Payment Method</Text>
              <View style={styles.paymentMethods}>
                <TouchableOpacity
                  style={[
                    styles.paymentMethodButton,
                    paymentMethod === 'upi' && styles.paymentMethodSelected,
                  ]}
                  onPress={() => {
                    setPaymentMethod('upi');
                    setCashAmount('');
                  }}
                >
                  <Text
                    style={[
                      styles.paymentMethodText,
                      paymentMethod === 'upi' && styles.paymentMethodTextSelected,
                    ]}
                  >
                    UPI
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.paymentMethodButton,
                    paymentMethod === 'cash' && styles.paymentMethodSelected,
                  ]}
                  onPress={() => {
                    setPaymentMethod('cash');
                    setUpiAmount('');
                    setUpiTransactionId('');
                    setScreenshot(null);
                  }}
                >
                  <Text
                    style={[
                      styles.paymentMethodText,
                      paymentMethod === 'cash' && styles.paymentMethodTextSelected,
                    ]}
                  >
                    Cash
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.paymentMethodButton,
                    paymentMethod === 'mixed' && styles.paymentMethodSelected,
                  ]}
                  onPress={() => setPaymentMethod('mixed')}
                >
                  <Text
                    style={[
                      styles.paymentMethodText,
                      paymentMethod === 'mixed' && styles.paymentMethodTextSelected,
                    ]}
                  >
                    Mixed
                  </Text>
                </TouchableOpacity>
              </View>

              {paymentMethod === 'upi' && (
                <View style={styles.formSection}>
                  <View style={styles.totalBox}>
                    <Text style={styles.totalText}>Plan Amount: ₹{selectedPlan.price}</Text>
                  </View>
                  <Text style={styles.inputLabel}>Transaction ID (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={upiTransactionId}
                    onChangeText={setUpiTransactionId}
                    placeholder="Enter UPI transaction ID"
                  />
                  <Text style={styles.inputLabel}>Payment Screenshot</Text>
                  <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                    <Text style={styles.uploadButtonText}>
                      {screenshot ? 'Change Screenshot' : 'Upload Screenshot'}
                    </Text>
                  </TouchableOpacity>
                  {screenshot && (
                    <Image source={{ uri: screenshot.uri }} style={styles.screenshotPreview} />
                  )}
                </View>
              )}

              {paymentMethod === 'cash' && (
                <View style={styles.formSection}>
                  <View style={styles.totalBox}>
                    <Text style={styles.totalText}>Plan Amount: ₹{selectedPlan.price}</Text>
                  </View>
                  <Text style={styles.infoText}>
                    After submitting, admin will verify and approve your cash payment.
                  </Text>
                </View>
              )}

              {paymentMethod === 'mixed' && (
                <View style={styles.formSection}>
                  <Text style={styles.inputLabel}>UPI Amount (₹)</Text>
                  <TextInput
                    style={styles.input}
                    value={upiAmount}
                    onChangeText={setUpiAmount}
                    placeholder="Enter UPI amount"
                    keyboardType="numeric"
                  />
                  <Text style={styles.inputLabel}>Cash Amount (₹)</Text>
                  <TextInput
                    style={styles.input}
                    value={cashAmount}
                    onChangeText={setCashAmount}
                    placeholder="Enter cash amount"
                    keyboardType="numeric"
                  />
                  <Text style={styles.inputLabel}>Transaction ID (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={upiTransactionId}
                    onChangeText={setUpiTransactionId}
                    placeholder="Enter UPI transaction ID"
                  />
                  <Text style={styles.inputLabel}>UPI Payment Screenshot</Text>
                  <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                    <Text style={styles.uploadButtonText}>
                      {screenshot ? 'Change Screenshot' : 'Upload Screenshot'}
                    </Text>
                  </TouchableOpacity>
                  {screenshot && (
                    <Image source={{ uri: screenshot.uri }} style={styles.screenshotPreview} />
                  )}
                  <View style={styles.totalBox}>
                    <Text style={styles.totalText}>
                      Total: ₹{parseFloat(upiAmount || 0) + parseFloat(cashAmount || 0)} / Plan Price:
                      ₹{selectedPlan.price}
                    </Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.subscribeButton}
                onPress={handleSubscribe}
                disabled={subscribeMutation.isLoading}
              >
                {subscribeMutation.isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.subscribeButtonText}>Subscribe</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Info Message */}
      {!hasActiveSubscription && !currentSubscription && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            <Text style={styles.infoBold}>Note:</Text> You need an active subscription to send
            interests, add favorites, and view profiles. Subscribe now to unlock all features!
          </Text>
        </View>
      )}

      {/* Subscription History */}
      <View style={styles.card}>
        <View style={styles.historyHeader}>
          <Text style={styles.cardTitle}>Subscription History</Text>
          <TouchableOpacity onPress={() => setShowHistory(!showHistory)}>
            <Text style={styles.historyToggle}>
              {showHistory ? 'Hide' : 'Show'} History
            </Text>
          </TouchableOpacity>
        </View>

        {showHistory && (
          <View>
            {historyLoading ? (
              <ActivityIndicator size="large" color="#ef4444" style={styles.loader} />
            ) : historyData?.subscriptions?.length > 0 ? (
              <View style={styles.historyList}>
                {historyData.subscriptions.map((sub) => (
                  <View key={sub._id} style={styles.historyItem}>
                    <View style={styles.historyItemHeader}>
                      <View>
                        <Text style={styles.historyPlanName}>{sub.planName}</Text>
                        <Text style={styles.historyDate}>
                          {sub.startDate && new Date(sub.startDate).toLocaleDateString()} -{' '}
                          {sub.endDate && new Date(sub.endDate).toLocaleDateString()}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.historyStatusBadge,
                          sub.status === 'approved'
                            ? styles.statusActive
                            : sub.status === 'pending'
                            ? styles.statusPending
                            : sub.status === 'rejected'
                            ? styles.statusRejected
                            : sub.status === 'cancelled'
                            ? { backgroundColor: '#fed7aa' }
                            : styles.statusExpired,
                        ]}
                      >
                        <Text style={styles.historyStatusText}>{sub.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.historyAmount}>
                      ₹{sub.amount} | {sub.paymentMethod}
                    </Text>
                    {sub.invoiceId && (
                      <TouchableOpacity
                        style={styles.invoiceButton}
                        onPress={async () => {
                          try {
                            const invoiceData = await getInvoice(sub._id);
                            setSelectedInvoice(invoiceData);
                          } catch (error) {
                            Alert.alert('Error', 'Failed to load invoice');
                          }
                        }}
                      >
                        <Text style={styles.invoiceButtonText}>View Invoice</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No subscription history found</Text>
            )}
          </View>
        )}
      </View>

      {/* Invoice Modal */}
      {selectedInvoice && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invoice</Text>
              <TouchableOpacity onPress={() => setSelectedInvoice(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.invoiceContent}>
              <View style={styles.invoiceSection}>
                <View style={styles.invoiceRow}>
                  <View>
                    <Text style={styles.invoiceLabel}>Invoice Number</Text>
                    <Text style={styles.invoiceValue}>
                      {selectedInvoice.invoice?.invoiceNumber}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.invoiceLabel}>Date</Text>
                    <Text style={styles.invoiceValue}>
                      {new Date(selectedInvoice.invoice?.invoiceDate).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.invoiceSection}>
                <Text style={styles.invoiceSectionTitle}>Plan Details</Text>
                <Text style={styles.invoiceText}>Plan: {selectedInvoice.invoice?.planName}</Text>
                <Text style={styles.invoiceText}>
                  Duration: {selectedInvoice.invoice?.planDuration} days
                </Text>
                <Text style={styles.invoiceText}>
                  Period: {new Date(selectedInvoice.invoice?.startDate).toLocaleDateString()} -{' '}
                  {new Date(selectedInvoice.invoice?.endDate).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.invoiceSection}>
                <Text style={styles.invoiceSectionTitle}>Payment Details</Text>
                <Text style={styles.invoiceText}>
                  Payment Method: {selectedInvoice.invoice?.paymentMethod}
                </Text>
                {selectedInvoice.invoice?.paymentMethod === 'mixed' && (
                  <>
                    <Text style={styles.invoiceText}>
                      UPI Amount: ₹{selectedInvoice.invoice?.upiAmount}
                    </Text>
                    <Text style={styles.invoiceText}>
                      Cash Amount: ₹{selectedInvoice.invoice?.cashAmount}
                    </Text>
                  </>
                )}
                <Text style={styles.invoiceTotal}>
                  Total Amount: ₹{selectedInvoice.invoice?.amount}
                </Text>
              </View>
              <View style={styles.invoiceSection}>
                <Text style={styles.invoiceSectionTitle}>Status</Text>
                <View
                  style={[
                    styles.invoiceStatusBadge,
                    selectedInvoice.invoice?.status === 'paid'
                      ? styles.statusActive
                      : { backgroundColor: '#e5e7eb' },
                  ]}
                >
                  <Text style={styles.invoiceStatusText}>
                    {selectedInvoice.invoice?.status}
                  </Text>
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setSelectedInvoice(null)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#d1fae5',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusRejected: {
    backgroundColor: '#fee2e2',
  },
  statusExpired: {
    backgroundColor: '#e5e7eb',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  pendingText: {
    color: '#d97706',
    fontSize: 12,
    marginTop: 10,
  },
  rejectedText: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 10,
  },
  plansContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  planCard: {
    width: '48%',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  planCardSelected: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  planName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 5,
  },
  planDuration: {
    fontSize: 12,
    color: '#666',
  },
  paymentForm: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  paymentMethods: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  paymentMethodButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  paymentMethodSelected: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#666',
  },
  paymentMethodTextSelected: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  formSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  uploadButton: {
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  screenshotPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 10,
  },
  totalBox: {
    backgroundColor: '#dbeafe',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  totalText: {
    fontSize: 14,
    color: '#1e40af',
  },
  subscribeButton: {
    backgroundColor: '#ef4444',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fbbf24',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  infoText: {
    color: '#92400e',
    fontSize: 14,
  },
  infoBold: {
    fontWeight: 'bold',
  },
});

export default SubscriptionScreen;

