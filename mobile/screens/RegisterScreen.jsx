import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { register, verifyVendor } from '../services/authService';

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    type: 'bride',
    vendorMobile: '', // Vendor mobile number
  });
  const [loading, setLoading] = useState(false);
  const [verifyingVendor, setVerifyingVendor] = useState(false);
  const [vendorVerification, setVendorVerification] = useState({
    status: null, // null, 'verified', 'failed', 'pending'
    vendor: null,
  });
  const { login: setAuth } = useAuth();

  const handleVerifyVendor = async () => {
    if (!formData.vendorMobile.trim()) {
      Alert.alert('Error', 'Please enter vendor mobile number');
      return;
    }

    setVerifyingVendor(true);
    setVendorVerification({ status: 'pending', vendor: null });

    try {
      const response = await verifyVendor(formData.vendorMobile.trim());
      if (response.verified && response.vendor) {
        setVendorVerification({
          status: 'verified',
          vendor: response.vendor,
        });
        Alert.alert('Success', `Vendor verified: ${response.vendor.companyName || response.vendor.contactPerson}`);
      } else {
        setVendorVerification({ status: 'failed', vendor: null });
        Alert.alert('Verification Failed', 'Vendor verification failed');
      }
    } catch (error) {
      setVendorVerification({ status: 'failed', vendor: null });
      Alert.alert('Verification Failed', error.response?.data?.message || 'Vendor verification failed');
    } finally {
      setVerifyingVendor(false);
    }
  };

  const handleSubmit = async () => {
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    // If vendor mobile is entered, it must be verified
    if (formData.vendorMobile.trim() && vendorVerification.status !== 'verified') {
      Alert.alert('Verification Required', 'Please verify the vendor mobile number before creating account');
      return;
    }

    setLoading(true);
    try {
      const response = await register({
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        type: formData.type,
        vendorId: vendorVerification.vendor?.id || undefined, // Use verified vendor ID
      });
      await setAuth(response.user, response.token);
      navigation.replace('Main');
    } catch (error) {
      Alert.alert('Registration Failed', error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Image Section */}
      <View style={styles.imageSection}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80' }}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.imageOverlay}>
          <Text style={styles.imageQuote}>
            "The greatest thing you'll ever learn is just to love and be loved in return."
          </Text>
          <Text style={styles.imageQuoteAuthor}>— Eden Ahbez</Text>
        </View>
      </View>

      {/* Form Section */}
      <View style={styles.formContainer}>
        <View style={styles.headerSection}>
          <Text style={styles.title}>Start Your Journey</Text>
          <Text style={styles.subtitle}>Create your account and find your perfect match</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>I am looking for</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, formData.type === 'bride' && styles.toggleButtonActive]}
              onPress={() => setFormData({ ...formData, type: 'bride' })}
            >
              <Text style={[styles.toggleText, formData.type === 'bride' && styles.toggleTextActive]}>
                Bride
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, formData.type === 'groom' && styles.toggleButtonActive]}
              onPress={() => setFormData({ ...formData, type: 'groom' })}
            >
              <Text style={[styles.toggleText, formData.type === 'groom' && styles.toggleTextActive]}>
                Groom
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email address</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your phone number"
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Password (min 6 characters)"
            value={formData.password}
            onChangeText={(text) => setFormData({ ...formData, password: text })}
            secureTextEntry
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
            secureTextEntry
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Vendor Mobile Number <Text style={styles.optionalLabel}>(Optional)</Text>
          </Text>
          <View style={styles.vendorInputRow}>
            <TextInput
              style={[styles.input, styles.vendorInput]}
              placeholder="Enter vendor mobile number"
              value={formData.vendorMobile}
              onChangeText={(text) => {
                setFormData({ ...formData, vendorMobile: text });
                // Reset verification when mobile changes
                if (vendorVerification.status !== null) {
                  setVendorVerification({ status: null, vendor: null });
                }
              }}
              keyboardType="phone-pad"
            />
            <TouchableOpacity
              style={[styles.verifyButton, (!formData.vendorMobile.trim() || verifyingVendor) && styles.verifyButtonDisabled]}
              onPress={handleVerifyVendor}
              disabled={!formData.vendorMobile.trim() || verifyingVendor}
            >
              {verifyingVendor ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.verifyButtonText}>Verify</Text>
              )}
            </TouchableOpacity>
          </View>
          {vendorVerification.status === 'verified' && vendorVerification.vendor && (
            <View style={styles.verificationSuccess}>
              <Text style={styles.verificationSuccessText}>
                ✓ Verified: {vendorVerification.vendor.companyName || vendorVerification.vendor.contactPerson}
              </Text>
            </View>
          )}
          {vendorVerification.status === 'failed' && (
            <View style={styles.verificationFailed}>
              <Text style={styles.verificationFailedText}>
                ✗ Verification failed. Please check the mobile number and try again.
              </Text>
            </View>
          )}
          {formData.vendorMobile.trim() && vendorVerification.status === null && (
            <Text style={styles.helperText}>
              Enter vendor mobile number and tap Verify to register under that vendor
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.button, (loading || (formData.vendorMobile.trim() && vendorVerification.status !== 'verified')) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading || (formData.vendorMobile.trim() && vendorVerification.status !== 'verified')}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>
        {formData.vendorMobile.trim() && vendorVerification.status !== 'verified' && (
          <Text style={styles.verificationRequiredText}>
            Please verify vendor mobile number to continue
          </Text>
        )}

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginLink}>
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.loginLinkText}>Sign in here</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef2f2',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  imageSection: {
    height: 300,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
  },
  imageQuote: {
    color: '#fff',
    fontSize: 18,
    fontStyle: 'italic',
    marginBottom: 5,
    lineHeight: 24,
  },
  imageQuoteAuthor: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  headerSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#dc2626',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  toggleText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  optionalLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: 'normal',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  vendorInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  vendorInput: {
    flex: 1,
  },
  verifyButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  verificationSuccess: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#d1fae5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  verificationSuccessText: {
    fontSize: 13,
    color: '#065f46',
    fontWeight: '600',
  },
  verificationFailed: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  verificationFailedText: {
    fontSize: 13,
    color: '#991b1b',
  },
  verificationRequiredText: {
    marginTop: 8,
    fontSize: 12,
    color: '#dc2626',
    textAlign: 'center',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#dc2626',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLink: {
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loginLinkText: {
    color: '#dc2626',
    fontWeight: 'bold',
  },
});

export default RegisterScreen;

