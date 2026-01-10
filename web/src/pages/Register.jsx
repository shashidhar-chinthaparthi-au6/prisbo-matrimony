import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { register, verifyVendor } from '../services/authService';
import toast from 'react-hot-toast';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    type: 'bride', // 'bride' or 'groom'
    vendorMobile: '', // Vendor mobile number
  });
  const [loading, setLoading] = useState(false);
  const [verifyingVendor, setVerifyingVendor] = useState(false);
  const [vendorVerification, setVendorVerification] = useState({
    status: null, // null, 'verified', 'failed', 'pending'
    vendor: null,
  });
  const { login: setAuth } = useAuth();
  const navigate = useNavigate();

  const handleVerifyVendor = async () => {
    if (!formData.vendorMobile.trim()) {
      toast.error('Please enter vendor mobile number');
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
        toast.success(`Vendor verified: ${response.vendor.companyName || response.vendor.contactPerson}`);
      } else {
        setVendorVerification({ status: 'failed', vendor: null });
        toast.error('Vendor verification failed');
      }
    } catch (error) {
      setVendorVerification({ status: 'failed', vendor: null });
      toast.error(error.response?.data?.message || 'Vendor verification failed');
    } finally {
      setVerifyingVendor(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    // If vendor mobile is entered, it must be verified
    if (formData.vendorMobile.trim() && vendorVerification.status !== 'verified') {
      toast.error('Please verify the vendor mobile number before creating account');
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
      setAuth(response.user, response.token);
      toast.success('Registration successful!');
      navigate('/profile');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-red-50 via-pink-50 to-rose-100 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      {/* Falling Hearts, Stars, and Images */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Falling Hearts - Multiple sets for continuous flow */}
        {[...Array(30)].map((_, i) => {
          const baseDuration = 8;
          const duration = baseDuration + (i % 5);
          // Distribute delays evenly across the duration to avoid clustering
          const delay = -(i * (duration / 15)) % duration;
          return (
            <div
              key={`heart-${i}`}
              className="absolute text-red-300 animate-fall"
              style={{
                left: `${(i * 3.33) % 100}%`,
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
                animationIterationCount: 'infinite',
                animationTimingFunction: 'linear',
                fontSize: `${20 + (i % 3) * 10}px`,
              }}
            >
              ❤️
            </div>
          );
        })}
        {/* Falling Stars - Multiple sets for continuous flow */}
        {[...Array(24)].map((_, i) => {
          const baseDuration = 10;
          const duration = baseDuration + (i % 4);
          // Distribute delays evenly across the duration to avoid clustering
          const delay = -(i * (duration / 12)) % duration;
          return (
            <div
              key={`star-${i}`}
              className="absolute text-yellow-300 animate-fall-slow"
              style={{
                left: `${(i * 4.17) % 100}%`,
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
                animationIterationCount: 'infinite',
                animationTimingFunction: 'linear',
                fontSize: `${15 + (i % 2) * 8}px`,
              }}
            >
              ⭐
            </div>
          );
        })}
        {/* Falling Small Couple Images - Multiple sets for continuous flow */}
        {[...Array(16)].map((_, i) => {
          const baseDuration = 15;
          const duration = baseDuration + (i % 5);
          // Distribute delays evenly across the duration to avoid clustering
          const delay = -(i * (duration / 8)) % duration;
          return (
            <img
              key={`couple-${i}`}
              src={[
                'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80',
                'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80',
                'https://images.unsplash.com/photo-1519741497674-611481863552?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80',
                'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80',
              ][i % 4]}
              alt=""
              className="absolute rounded-full animate-fall-slow object-cover"
              style={{
                left: `${(i * 6.25) % 100}%`,
                width: `${60 + (i % 3) * 20}px`,
                height: `${60 + (i % 3) * 20}px`,
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
                animationIterationCount: 'infinite',
                animationTimingFunction: 'linear',
                filter: 'blur(1px)',
                opacity: 0.2,
              }}
            />
          );
        })}
      </div>

      {/* PRISBO Branding - Top Left - Sticky */}
      <div className="fixed top-8 left-8 z-50">
        <Link to="/" className="group">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl px-6 py-4 border border-red-100 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className="flex flex-col items-start">
              <span className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent tracking-tight">
                Prisbo
              </span>
              <span className="text-lg md:text-xl font-semibold text-gray-700 -mt-1">Matrimony</span>
              <p className="text-xs text-gray-500 mt-1 italic">Connecting Hearts, Building Families</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="relative z-10 h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-y-auto">
        <div className="max-w-6xl w-full mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Image and Quote */}
          <div className="hidden lg:block order-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-pink-400 rounded-3xl transform -rotate-3 opacity-20"></div>
              <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
                  alt="Happy couple"
                  className="w-full h-[600px] object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-8">
                  <p className="text-white text-xl font-medium italic mb-2">
                    "The greatest thing you'll ever learn is just to love and be loved in return."
                  </p>
                  <p className="text-white/80 text-sm">— Eden Ahbez</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Register Form */}
          <div className="w-full max-w-md mx-auto lg:mx-0 order-1">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-red-100">
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold text-gray-900 mb-2">
                  Start Your Journey
                </h2>
                <p className="text-gray-600">
                  Create your account and find your perfect match
                </p>
              </div>
              <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      I am looking for
                    </label>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: 'bride' })}
                        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                          formData.type === 'bride'
                            ? 'bg-red-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Bride
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: 'groom' })}
                        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                          formData.type === 'groom'
                            ? 'bg-red-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Groom
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm transition-all"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone number
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm transition-all"
                      placeholder="Enter your phone number"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm transition-all"
                      placeholder="Password (min 6 characters)"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm transition-all"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="vendorMobile" className="block text-sm font-medium text-gray-700 mb-2">
                      Vendor Mobile Number <span className="text-gray-400 text-xs">(Optional)</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="vendorMobile"
                        name="vendorMobile"
                        type="tel"
                        className="flex-1 appearance-none rounded-lg relative block px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm transition-all"
                        placeholder="Enter vendor mobile number"
                        value={formData.vendorMobile}
                        onChange={(e) => {
                          setFormData({ ...formData, vendorMobile: e.target.value });
                          // Reset verification when mobile changes
                          if (vendorVerification.status !== null) {
                            setVendorVerification({ status: null, vendor: null });
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleVerifyVendor}
                        disabled={!formData.vendorMobile.trim() || verifyingVendor}
                        className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm transition-all whitespace-nowrap"
                      >
                        {verifyingVendor ? 'Verifying...' : 'Verify'}
                      </button>
                    </div>
                    {vendorVerification.status === 'verified' && vendorVerification.vendor && (
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800 font-medium">
                          ✓ Verified: {vendorVerification.vendor.companyName || vendorVerification.vendor.contactPerson}
                        </p>
                      </div>
                    )}
                    {vendorVerification.status === 'failed' && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">
                          ✗ Verification failed. Please check the mobile number and try again.
                        </p>
                      </div>
                    )}
                    {formData.vendorMobile.trim() && vendorVerification.status === null && (
                      <p className="mt-1 text-xs text-gray-500">
                        Enter vendor mobile number and click Verify to register under that vendor
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading || (formData.vendorMobile.trim() && vendorVerification.status !== 'verified')}
                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200 shadow-lg"
                  >
                    {loading ? 'Creating account...' : 'Create Account'}
                  </button>
                  {formData.vendorMobile.trim() && vendorVerification.status !== 'verified' && (
                    <p className="mt-2 text-xs text-red-600 text-center">
                      Please verify vendor mobile number to continue
                    </p>
                  )}
                </div>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link to="/login" className="font-semibold text-red-600 hover:text-red-700">
                    Sign in here
                  </Link>
                </p>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

