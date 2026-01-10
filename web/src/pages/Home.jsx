import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SuperAdminLanding from './SuperAdminLanding';
import VendorLanding from './VendorLanding';
import UserLanding from './UserLanding';

const Home = () => {
  const { user } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Success stories with beautiful images
  const successStories = [
    {
      image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      quote: "We found each other through Prisbo and it was love at first sight!",
      names: "Priya & Rahul",
      location: "Mumbai, India"
    },
    {
      image: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      quote: "The best decision we made was trusting Prisbo Matrimony.",
      names: "Anjali & Vikram",
      location: "Delhi, India"
    },
    {
      image: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      quote: "Our perfect match was just a click away. Thank you Prisbo!",
      names: "Sneha & Arjun",
      location: "Bangalore, India"
    },
    {
      image: 'https://images.unsplash.com/photo-1519741497674-611481863552?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      quote: "From profile to proposal, Prisbo made our journey beautiful.",
      names: "Meera & Karan",
      location: "Pune, India"
    }
  ];

  // Auto-slide carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % successStories.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [successStories.length]);

  // If not logged in, show public landing
  if (!user) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-red-50 via-pink-50 to-rose-100 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-rose-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        {/* Falling Hearts, Stars, and Images */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {/* Falling Hearts - Multiple sets for continuous flow */}
          {[...Array(40)].map((_, i) => {
            const baseDuration = 8;
            const duration = baseDuration + (i % 5);
            // Distribute delays evenly across the duration to avoid clustering
            const delay = -(i * (duration / 20)) % duration;
            return (
              <div
                key={`heart-${i}`}
                className="absolute text-red-300 animate-fall"
                style={{
                  left: `${(i * 2.5) % 100}%`,
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
          {[...Array(30)].map((_, i) => {
            const baseDuration = 10;
            const duration = baseDuration + (i % 4);
            // Distribute delays evenly across the duration to avoid clustering
            const delay = -(i * (duration / 15)) % duration;
            return (
              <div
                key={`star-${i}`}
                className="absolute text-yellow-300 animate-fall-slow"
                style={{
                  left: `${(i * 3.33) % 100}%`,
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
          {[...Array(20)].map((_, i) => {
            const baseDuration = 15;
            const duration = baseDuration + (i % 5);
            // Distribute delays evenly across the duration to avoid clustering
            const delay = -(i * (duration / 10)) % duration;
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
                  left: `${(i * 5) % 100}%`,
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

        <div className="relative z-10 px-4 sm:px-6 lg:px-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full">
            {/* Main Hero Section */}
            <div className="grid lg:grid-cols-2 gap-12 items-center py-20 min-h-screen">
              {/* Left side - Content */}
              <div className="text-center lg:text-left">
                <div className="mb-8">
                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                    Find Your
                    <span className="block text-red-600">Perfect Match</span>
                  </h1>
                  <p className="text-xl md:text-2xl text-gray-700 mb-8 leading-relaxed">
                    Your trusted matrimony platform connecting hearts and souls
                  </p>
                </div>

                {/* Inspirational Quote */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-lg border border-red-100">
                  <p className="text-lg md:text-xl text-gray-800 italic mb-2">
                    "A successful marriage requires falling in love many times, always with the same person."
                  </p>
                  <p className="text-sm text-gray-600">— Mignon McLaughlin</p>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white text-lg font-semibold rounded-xl hover:from-red-700 hover:to-red-800 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Get Started Free
                    <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center px-8 py-4 bg-white text-red-600 text-lg font-semibold rounded-xl hover:bg-gray-50 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl border-2 border-red-600"
                  >
                    Sign In
                  </Link>
                </div>

                {/* Features */}
                <div className="mt-12 grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">1000+</div>
                    <div className="text-sm text-gray-600 mt-1">Happy Couples</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">5000+</div>
                    <div className="text-sm text-gray-600 mt-1">Active Profiles</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">99%</div>
                    <div className="text-sm text-gray-600 mt-1">Success Rate</div>
                  </div>
                </div>
              </div>

              {/* Right side - Image */}
              <div className="hidden lg:block">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-pink-400 rounded-3xl transform rotate-6 opacity-20"></div>
                  <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1519741497674-611481863552?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
                      alt="Happy couple"
                      className="w-full h-[600px] object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-8">
                      <p className="text-white text-lg font-medium">
                        "The best thing to hold onto in life is each other."
                      </p>
                      <p className="text-white/80 text-sm mt-2">— Audrey Hepburn</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Success Stories Carousel Section - Scrollable */}
            <div className="mt-24 w-full">
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                  Success <span className="text-red-600">Stories</span>
                </h2>
                <p className="text-lg text-gray-600">
                  Join thousands of happy couples who found their perfect match
                </p>
              </div>

              {/* Carousel Container */}
              <div className="relative max-w-5xl mx-auto">
                <div className="relative h-[500px] rounded-3xl overflow-hidden shadow-2xl">
                  {successStories.map((story, index) => (
                    <div
                      key={index}
                      className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                        index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                      }`}
                    >
                      <div className="relative h-full">
                        <img
                          src={story.image}
                          alt={story.names}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 text-white">
                          <p className="text-2xl md:text-3xl font-medium italic mb-4">
                            "{story.quote}"
                          </p>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xl md:text-2xl font-bold">{story.names}</p>
                              <p className="text-gray-300">{story.location}</p>
                            </div>
                            <div className="text-4xl">💕</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Carousel Indicators */}
                  <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 flex space-x-2">
                    {successStories.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`h-3 rounded-full transition-all duration-300 ${
                          index === currentSlide
                            ? 'bg-white w-10'
                            : 'bg-white/50 hover:bg-white/75 w-3'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>

                  {/* Navigation Arrows */}
                  <button
                    onClick={() => setCurrentSlide((prev) => (prev - 1 + successStories.length) % successStories.length)}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
                    aria-label="Previous slide"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentSlide((prev) => (prev + 1) % successStories.length)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
                    aria-label="Next slide"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Features Grid */}
              <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-red-100 text-center transform transition-all duration-300 hover:scale-105">
                  <div className="text-4xl mb-4">✓</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Verified Profiles</h3>
                  <p className="text-gray-600">All profiles are verified for authenticity</p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-red-100 text-center transform transition-all duration-300 hover:scale-105">
                  <div className="text-4xl mb-4">🔒</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Secure & Private</h3>
                  <p className="text-gray-600">Your data is safe with us</p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-red-100 text-center transform transition-all duration-300 hover:scale-105">
                  <div className="text-4xl mb-4">💝</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Trusted Platform</h3>
                  <p className="text-gray-600">Join thousands of happy couples</p>
                </div>
              </div>

              {/* How It Works Section */}
              <div className="mt-24 w-full">
                <div className="text-center mb-12">
                  <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                    How It <span className="text-red-600">Works</span>
                  </h2>
                  <p className="text-lg text-gray-600">
                    Find your perfect match in three simple steps
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-red-100 text-center transform transition-all duration-300 hover:scale-105">
                    <div className="w-16 h-16 bg-gradient-to-r from-red-600 to-pink-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                      1
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Create Profile</h3>
                    <p className="text-gray-600">
                      Sign up for free and create your detailed profile with photos and preferences
                    </p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-red-100 text-center transform transition-all duration-300 hover:scale-105">
                    <div className="w-16 h-16 bg-gradient-to-r from-red-600 to-pink-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                      2
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Browse & Search</h3>
                    <p className="text-gray-600">
                      Use advanced filters to find profiles that match your preferences and interests
                    </p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-red-100 text-center transform transition-all duration-300 hover:scale-105">
                    <div className="w-16 h-16 bg-gradient-to-r from-red-600 to-pink-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                      3
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Connect & Chat</h3>
                    <p className="text-gray-600">
                      Send interests, chat with matches, and build meaningful connections
                    </p>
                  </div>
                </div>
              </div>

              {/* Why Choose Us Section */}
              <div className="mt-24 w-full">
                <div className="text-center mb-12">
                  <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                    Why Choose <span className="text-red-600">Prisbo</span>
                  </h2>
                  <p className="text-lg text-gray-600">
                    Experience the difference with our premium features
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-12">
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-red-100 flex items-start space-x-4 transform transition-all duration-300 hover:scale-105">
                    <div className="text-3xl flex-shrink-0">🔍</div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Advanced Search Filters</h3>
                      <p className="text-gray-600">Find matches based on education, location, profession, and more</p>
                    </div>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-red-100 flex items-start space-x-4 transform transition-all duration-300 hover:scale-105">
                    <div className="text-3xl flex-shrink-0">💬</div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Secure Messaging</h3>
                      <p className="text-gray-600">Chat safely with verified members in a protected environment</p>
                    </div>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-red-100 flex items-start space-x-4 transform transition-all duration-300 hover:scale-105">
                    <div className="text-3xl flex-shrink-0">⭐</div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Favorites & Interests</h3>
                      <p className="text-gray-600">Save profiles you like and express interest in potential matches</p>
                    </div>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-red-100 flex items-start space-x-4 transform transition-all duration-300 hover:scale-105">
                    <div className="text-3xl flex-shrink-0">📱</div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Mobile Friendly</h3>
                      <p className="text-gray-600">Access your account anytime, anywhere on any device</p>
                    </div>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-red-100 flex items-start space-x-4 transform transition-all duration-300 hover:scale-105">
                    <div className="text-3xl flex-shrink-0">🔔</div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Real-time Notifications</h3>
                      <p className="text-gray-600">Stay updated with instant notifications for interests and messages</p>
                    </div>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-red-100 flex items-start space-x-4 transform transition-all duration-300 hover:scale-105">
                    <div className="text-3xl flex-shrink-0">👥</div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">24/7 Support</h3>
                      <p className="text-gray-600">Get help whenever you need it from our dedicated support team</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics Section */}
              <div className="mt-24 w-full mb-12">
                <div className="bg-gradient-to-r from-red-600 to-pink-600 rounded-3xl p-12 shadow-2xl">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    <div>
                      <div className="text-4xl md:text-5xl font-bold text-white mb-2">1000+</div>
                      <div className="text-red-100 text-lg">Happy Couples</div>
                    </div>
                    <div>
                      <div className="text-4xl md:text-5xl font-bold text-white mb-2">5000+</div>
                      <div className="text-red-100 text-lg">Active Profiles</div>
                    </div>
                    <div>
                      <div className="text-4xl md:text-5xl font-bold text-white mb-2">99%</div>
                      <div className="text-red-100 text-lg">Success Rate</div>
                    </div>
                    <div>
                      <div className="text-4xl md:text-5xl font-bold text-white mb-2">50+</div>
                      <div className="text-red-100 text-lg">Cities</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Final CTA Section */}
              <div className="mt-24 w-full mb-12">
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-red-100 text-center">
                  <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                    Ready to Find Your <span className="text-red-600">Perfect Match?</span>
                  </h2>
                  <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                    Join thousands of singles who have found their life partners through Prisbo Matrimony
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                      to="/register"
                      className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white text-lg font-semibold rounded-xl hover:from-red-700 hover:to-red-800 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      Create Free Account
                      <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                    <Link
                      to="/login"
                      className="inline-flex items-center justify-center px-8 py-4 bg-white text-red-600 text-lg font-semibold rounded-xl hover:bg-gray-50 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl border-2 border-red-600"
                    >
                      Sign In
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating hearts animation */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute text-red-300 opacity-20 animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                fontSize: `${20 + Math.random() * 20}px`,
              }}
            >
              ❤️
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Redirect to role-specific landing pages
  if (user.role === 'super_admin') {
    return <SuperAdminLanding />;
  } else if (user.role === 'vendor') {
    return <VendorLanding />;
  } else {
    return <UserLanding />;
  }
};

export default Home;

