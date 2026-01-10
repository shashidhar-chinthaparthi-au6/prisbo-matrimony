import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login } from '../services/authService';
import toast from 'react-hot-toast';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    loginType: 'email', // 'email' or 'phone'
  });
  const [loading, setLoading] = useState(false);
  const { login: setAuth } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = formData.loginType === 'email'
        ? { email: formData.email, password: formData.password }
        : { phone: formData.phone, password: formData.password };

      const response = await login(data);
      setAuth(response.user, response.token);
      toast.success('Login successful!');
      navigate('/');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      // Show blocked account message more prominently
      if (error.response?.data?.accountBlocked || errorMessage.includes('blocked')) {
        toast.error(errorMessage, {
          duration: 5000,
          style: {
            background: '#fee2e2',
            color: '#991b1b',
            border: '1px solid #fca5a5',
          },
        });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-red-50 via-pink-50 to-rose-100 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
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
          <div className="hidden lg:block">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-pink-400 rounded-3xl transform rotate-3 opacity-20"></div>
              <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
                  alt="Wedding rings"
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-8">
                  <p className="text-white text-xl font-medium italic">
                    "Love is not about how many days, months, or years you have been together. It's about how much you love each other every single day."
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Login Form */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-red-100">
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold text-gray-900 mb-2">
                  Welcome Back
                </h2>
                <p className="text-gray-600">
                  Sign in to continue your journey
                </p>
              </div>
              <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <div className="flex space-x-2 mb-4">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, loginType: 'email' })}
                        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                          formData.loginType === 'email'
                            ? 'bg-red-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Email
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, loginType: 'phone' })}
                        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                          formData.loginType === 'phone'
                            ? 'bg-red-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Phone
                      </button>
                    </div>
                    {formData.loginType === 'email' ? (
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
                    ) : (
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
                    )}
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
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mb-6">
                  <div className="text-sm">
                    <Link
                      to="/forgot-password"
                      className="font-medium text-red-600 hover:text-red-700"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-semibold rounded-xl text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transform hover:scale-105 transition-all duration-200 shadow-lg"
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>
                </div>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Link to="/register" className="font-semibold text-red-600 hover:text-red-700">
                    Create one now
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

export default Login;

