import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ScrollView, Image, TouchableOpacity, Linking } from 'react-native';
import { useAuth } from '../context/AuthContext';
import SuperAdminLandingScreen from './SuperAdminLandingScreen';
import VendorLandingScreen from './VendorLandingScreen';
import UserLandingScreen from './UserLandingScreen';

const HomeScreen = ({ navigation }) => {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Navigation is handled by App.jsx based on user role
    // This component just renders the appropriate landing page
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ef4444" />
      </View>
    );
  }

  if (!user) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.mainTitle}>Find Your</Text>
          <Text style={styles.mainTitleAccent}>Perfect Match</Text>
          <Text style={styles.subtitle}>Your trusted matrimony platform connecting hearts and souls</Text>
        </View>

        {/* Quote Card */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>
            "A successful marriage requires falling in love many times, always with the same person."
          </Text>
          <Text style={styles.quoteAuthor}>— Mignon McLaughlin</Text>
        </View>

        {/* Image Section */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1519741497674-611481863552?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80' }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay}>
            <Text style={styles.imageQuote}>
              "The best thing to hold onto in life is each other."
            </Text>
            <Text style={styles.imageQuoteAuthor}>— Audrey Hepburn</Text>
          </View>
        </View>

        {/* CTA Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.primaryButtonText}>Get Started Free</Text>
            <Text style={styles.buttonArrow}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.secondaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>1000+</Text>
            <Text style={styles.statLabel}>Happy Couples</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>5000+</Text>
            <Text style={styles.statLabel}>Active Profiles</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>99%</Text>
            <Text style={styles.statLabel}>Success Rate</Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Render role-specific landing pages
  if (user.role === 'super_admin') {
    return <SuperAdminLandingScreen />;
  } else if (user.role === 'vendor') {
    return <VendorLandingScreen />;
  } else {
    return <UserLandingScreen />;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef2f2',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
  },
  headerSection: {
    marginBottom: 30,
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 5,
  },
  mainTitleAccent: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 18,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 10,
  },
  quoteCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  quoteText: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#1f2937',
    marginBottom: 10,
    lineHeight: 26,
  },
  quoteAuthor: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'right',
  },
  imageContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  heroImage: {
    width: '100%',
    height: 300,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 20,
    paddingTop: 30,
  },
  imageQuote: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
    fontStyle: 'italic',
    marginBottom: 5,
  },
  imageQuoteAuthor: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  buttonContainer: {
    marginBottom: 30,
  },
  primaryButton: {
    backgroundColor: '#dc2626',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  buttonArrow: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#dc2626',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButtonText: {
    color: '#dc2626',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    marginBottom: 40,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default HomeScreen;

