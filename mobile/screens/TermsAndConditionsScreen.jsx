import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation } from 'react-query';
import { useNavigation } from '@react-navigation/native';
import { getCurrentTerms, acceptTerms } from '../services/termsService';
import { useAuth } from '../context/AuthContext';

const TermsAndConditionsScreen = () => {
  const [accepted, setAccepted] = useState(false);
  const navigation = useNavigation();
  const { user, updateUser, updateUserOptimistically } = useAuth();

  // Redirect if terms are already accepted
  useEffect(() => {
    if (user?.termsAccepted) {
      if (user?.role === 'super_admin') {
        navigation.reset({ index: 0, routes: [{ name: 'Admin' }] });
      } else if (user?.role === 'vendor') {
        navigation.reset({ index: 0, routes: [{ name: 'Vendor' }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      }
    }
  }, [user, navigation]);

  const { data: termsData, isLoading } = useQuery('currentTerms', getCurrentTerms);
  const acceptMutation = useMutation(acceptTerms, {
    onMutate: async () => {
      // Optimistically update user context immediately
      updateUserOptimistically({
        termsAccepted: true,
        termsAcceptedAt: new Date(),
      });
    },
    onSuccess: async () => {
      Alert.alert('Success', 'Terms and conditions accepted');
      
      // Update user context to get latest data from server
      try {
        const updatedUser = await updateUser();
        
        // Determine navigation target based on role
        const userRole = updatedUser?.role || user?.role;
        let targetRoute = 'Main';
        if (userRole === 'super_admin') {
          targetRoute = 'Admin';
        } else if (userRole === 'vendor') {
          targetRoute = 'Vendor';
        }
        
        // Wait a moment for context to propagate
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Navigate using reset to clear navigation stack
        navigation.reset({ 
          index: 0, 
          routes: [{ name: targetRoute }] 
        });
      } catch (error) {
        console.error('Failed to update user context:', error);
        // Fallback navigation
        const userRole = user?.role;
        if (userRole === 'super_admin') {
          navigation.reset({ index: 0, routes: [{ name: 'Admin' }] });
        } else if (userRole === 'vendor') {
          navigation.reset({ index: 0, routes: [{ name: 'Vendor' }] });
        } else {
          navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        }
      }
    },
    onError: (error) => {
      Alert.alert('Error', error.response?.data?.message || 'Failed to accept terms');
      // Revert optimistic update on error
      updateUser().catch(console.error);
    },
  });

  const handleAccept = () => {
    if (!accepted) {
      Alert.alert('Error', 'Please check the acceptance checkbox');
      return;
    }
    const version = termsData?.terms?.version || '1.0';
    acceptMutation.mutate(version);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ef4444" />
      </View>
    );
  }

  const terms = termsData?.terms;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Terms and Conditions</Text>
        <Text style={styles.headerSubtitle}>Please read and accept to continue</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.termsContent}>
          {terms?.content ? (
            <Text style={styles.termsText}>{terms.content.replace(/<[^>]*>/g, '')}</Text>
          ) : (
            <Text style={styles.termsText}>Loading terms...</Text>
          )}
        </View>

        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setAccepted(!accepted)}
          >
            <View style={[styles.checkboxBox, accepted && styles.checkboxBoxChecked]}>
              {accepted && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I have read and agree to the Terms and Conditions
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.acceptButton, (!accepted || acceptMutation.isLoading) && styles.acceptButtonDisabled]}
          onPress={handleAccept}
          disabled={!accepted || acceptMutation.isLoading}
        >
          {acceptMutation.isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.acceptButtonText}>Accept and Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#ef4444',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fecaca',
  },
  content: {
    flex: 1,
  },
  termsContent: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  termsText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
  },
  checkboxContainer: {
    padding: 16,
    paddingTop: 0,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  acceptButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonDisabled: {
    opacity: 0.5,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TermsAndConditionsScreen;

