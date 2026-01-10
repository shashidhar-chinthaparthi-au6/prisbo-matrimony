import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from 'react-query';
import { useNavigation } from '@react-navigation/native';
import { getStats } from '../services/adminService';
import { useAuth } from '../context/AuthContext';

const SuperAdminLandingScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { data: statsData, isLoading } = useQuery('adminStats', getStats);

  const stats = statsData?.stats || {};

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome back!</Text>
        <Text style={styles.subtitle}>Manage your matrimony platform</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      ) : (
        <>
          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalUsers || 0}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalVendors || 0}</Text>
              <Text style={styles.statLabel}>Vendors</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalProfiles || 0}</Text>
              <Text style={styles.statLabel}>Profiles</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.activeProfiles || 0}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Admin', { screen: 'Users' })}
            >
              <Text style={styles.actionTitle}>Manage Users</Text>
              <Text style={styles.actionSubtitle}>View and manage all users</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Admin', { screen: 'Vendors' })}
            >
              <Text style={styles.actionTitle}>Manage Vendors</Text>
              <Text style={styles.actionSubtitle}>View and create vendors</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Admin', { screen: 'Profiles' })}
            >
              <Text style={styles.actionTitle}>Manage Profiles</Text>
              <Text style={styles.actionSubtitle}>View and manage all profiles</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Admin', { screen: 'Verification' })}
            >
              <Text style={styles.actionTitle}>Profile Verification</Text>
              <Text style={styles.actionSubtitle}>Review and approve profiles</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Admin', { screen: 'Subscriptions' })}
            >
              <Text style={styles.actionTitle}>Subscriptions</Text>
              <Text style={styles.actionSubtitle}>Manage subscriptions</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#ef4444',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#fecaca',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  actionsContainer: {
    padding: 16,
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
});

export default SuperAdminLandingScreen;

