import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const ProfileVerificationPendingModal = ({ isOpen, verificationStatus, rejectionReason, onUpdateProfile, onGoHome }) => {

  if (!isOpen) return null;

  const getMessage = () => {
    if (verificationStatus === 'pending') {
      return 'Your profile is pending verification. Please wait for admin approval before you can access all features.';
    } else if (verificationStatus === 'rejected') {
      return rejectionReason 
        ? `Your profile has been rejected: ${rejectionReason}. Please update your profile and resubmit for verification.`
        : 'Your profile has been rejected. Please update your profile and resubmit for verification.';
    }
    return 'Your profile verification is required. Please wait for admin approval.';
  };

  const handleButtonPress = () => {
    if (verificationStatus === 'rejected' && onUpdateProfile) {
      onUpdateProfile();
    } else if (verificationStatus === 'pending' && onGoHome) {
      onGoHome();
    }
    // For pending status, navigate to home
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isOpen}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {verificationStatus === 'pending' ? 'Profile Pending Verification' : 'Profile Rejected'}
            </Text>
          </View>
          <Text style={styles.message}>
            {getMessage()}
          </Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.okButton}
              onPress={handleButtonPress}
            >
              <Text style={styles.okButtonText}>
                {verificationStatus === 'rejected' ? 'Update Profile' : 'OK'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  message: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
  },
  okButton: {
    width: '100%',
    backgroundColor: '#3b82f6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  okButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default ProfileVerificationPendingModal;

