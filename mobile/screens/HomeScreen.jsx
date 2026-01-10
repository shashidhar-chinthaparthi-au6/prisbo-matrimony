import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
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
      <View style={styles.container}>
        <Text style={styles.title}>Welcome to Prisbo</Text>
        <Text style={styles.subtitle}>Your trusted matrimony platform</Text>
      </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  button: {
    backgroundColor: '#ef4444',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonSecondary: {
    backgroundColor: '#f0f0f0',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonTextSecondary: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;

