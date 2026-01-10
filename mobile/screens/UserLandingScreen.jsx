import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from 'react-query';
import { useNavigation } from '@react-navigation/native';
import { getMyProfile } from '../services/profileService';
import { getCurrentSubscription } from '../services/subscriptionService';
import { useAuth } from '../context/AuthContext';
import { isProfileComplete } from '../utils/profileUtils';

const UserLandingScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { data: profileData } = useQuery('myProfile', getMyProfile);
  const { data: subscriptionData } = useQuery('current-subscription', getCurrentSubscription);

  const profile = profileData?.profile;
  const hasActiveSubscription = subscriptionData?.hasActiveSubscription;
  const profileComplete = profile ? isProfileComplete(profile) : false;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Welcome, {profile?.personalInfo?.firstName || user?.email?.split('@')[0] || 'User'}!
        </Text>
        <Text style={styles.subtitle}>Find your perfect match</Text>
      </View>

      {/* Status Cards */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusCard, profileComplete ? styles.statusCardComplete : styles.statusCardIncomplete]}>
          <Text style={styles.statusLabel}>Profile Status</Text>
          <Text style={[styles.statusValue, profileComplete ? styles.statusValueComplete : styles.statusValueIncomplete]}>
            {profileComplete ? 'Complete' : 'Incomplete'}
          </Text>
          {!profileComplete && (
            <TouchableOpacity
              style={styles.statusButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.statusButtonText}>Complete Now</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.statusCard, hasActiveSubscription ? styles.statusCardActive : styles.statusCardInactive]}>
          <Text style={styles.statusLabel}>Subscription</Text>
          <Text style={[styles.statusValue, hasActiveSubscription ? styles.statusValueActive : styles.statusValueInactive]}>
            {hasActiveSubscription ? 'Active' : 'Inactive'}
          </Text>
          {!hasActiveSubscription && (
            <TouchableOpacity
              style={styles.statusButton}
              onPress={() => navigation.navigate('Subscription')}
            >
              <Text style={styles.statusButtonText}>Subscribe</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Search')}
        >
          <Text style={styles.actionTitle}>Search Profiles</Text>
          <Text style={styles.actionSubtitle}>Find your perfect match</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.actionTitle}>My Profile</Text>
          <Text style={styles.actionSubtitle}>View and edit your profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Interests')}
        >
          <Text style={styles.actionTitle}>Interests</Text>
          <Text style={styles.actionSubtitle}>View received interests</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Chats')}
        >
          <Text style={styles.actionTitle}>Messages</Text>
          <Text style={styles.actionSubtitle}>Chat with matches</Text>
        </TouchableOpacity>
      </View>

      {/* Get Started Section */}
      <View style={styles.getStartedContainer}>
        <Text style={styles.getStartedTitle}>Get Started</Text>
        {!profileComplete && (
          <View style={styles.getStartedCard}>
            <Text style={styles.getStartedText}>Complete your profile to get better matches</Text>
            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.getStartedButtonText}>Complete Profile</Text>
            </TouchableOpacity>
          </View>
        )}
        {!hasActiveSubscription && (
          <View style={styles.getStartedCard}>
            <Text style={styles.getStartedText}>Subscribe to unlock all features</Text>
            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={() => navigation.navigate('Subscription')}
            >
              <Text style={styles.getStartedButtonText}>Subscribe Now</Text>
            </TouchableOpacity>
          </View>
        )}
        {profileComplete && hasActiveSubscription && (
          <View style={[styles.getStartedCard, styles.getStartedCardSuccess]}>
            <Text style={styles.getStartedText}>You're all set! Start searching for your perfect match</Text>
            <TouchableOpacity
              style={[styles.getStartedButton, styles.getStartedButtonSuccess]}
              onPress={() => navigation.navigate('Search')}
            >
              <Text style={styles.getStartedButtonText}>Start Searching</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
    backgroundColor: '#3b82f6',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#bfdbfe',
  },
  statusContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statusCard: {
    flex: 1,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusCardComplete: {
    backgroundColor: '#f0fdf4',
  },
  statusCardIncomplete: {
    backgroundColor: '#fefce8',
  },
  statusCardActive: {
    backgroundColor: '#eff6ff',
  },
  statusCardInactive: {
    backgroundColor: '#f3f4f6',
  },
  statusLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusValueComplete: {
    color: '#16a34a',
  },
  statusValueIncomplete: {
    color: '#ca8a04',
  },
  statusValueActive: {
    color: '#3b82f6',
  },
  statusValueInactive: {
    color: '#6b7280',
  },
  statusButton: {
    backgroundColor: '#3b82f6',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
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
  getStartedContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  getStartedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  getStartedCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  getStartedCardSuccess: {
    backgroundColor: '#f0fdf4',
  },
  getStartedText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
  },
  getStartedButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
  },
  getStartedButtonSuccess: {
    backgroundColor: '#16a34a',
  },
  getStartedButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default UserLandingScreen;

