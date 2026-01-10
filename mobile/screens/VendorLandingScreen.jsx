import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from 'react-query';
import { useNavigation } from '@react-navigation/native';
import { getMyStats } from '../services/vendorService';
import { useAuth } from '../context/AuthContext';

const VendorLandingScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { data: statsData, isLoading } = useQuery('vendorStats', getMyStats);

  const stats = statsData?.stats || {};

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Welcome, {user?.companyName || user?.email?.split('@')[0] || 'Vendor'}!
        </Text>
        <Text style={styles.subtitle}>Manage your profiles and connect with customers</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9333ea" />
        </View>
      ) : (
        <>
          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalProfiles || 0}</Text>
              <Text style={styles.statLabel}>Total Profiles</Text>
            </View>
            <View style={[styles.statCard, styles.statCardGreen]}>
              <Text style={[styles.statValue, styles.statValueGreen]}>{stats.approvedProfiles || 0}</Text>
              <Text style={styles.statLabel}>Approved</Text>
            </View>
            <View style={[styles.statCard, styles.statCardYellow]}>
              <Text style={[styles.statValue, styles.statValueYellow]}>{stats.pendingProfiles || 0}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={[styles.statCard, styles.statCardPurple]}>
              <Text style={[styles.statValue, styles.statValuePurple]}>{stats.activeProfiles || 0}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Vendor', { screen: 'Profiles' })}
            >
              <Text style={styles.actionTitle}>Create Profile</Text>
              <Text style={styles.actionSubtitle}>Add a new profile for a person</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Vendor', { screen: 'Profiles' })}
            >
              <Text style={styles.actionTitle}>View Pending</Text>
              <Text style={styles.actionSubtitle}>Review pending profiles</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Vendor', { screen: 'Support' })}
            >
              <Text style={styles.actionTitle}>Support Chat</Text>
              <Text style={styles.actionSubtitle}>Chat with superadmin and your users</Text>
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
    backgroundColor: '#9333ea',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#e9d5ff',
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
  statCardGreen: {
    backgroundColor: '#f0fdf4',
  },
  statCardYellow: {
    backgroundColor: '#fefce8',
  },
  statCardPurple: {
    backgroundColor: '#faf5ff',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statValueGreen: {
    color: '#16a34a',
  },
  statValueYellow: {
    color: '#ca8a04',
  },
  statValuePurple: {
    color: '#9333ea',
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

export default VendorLandingScreen;

