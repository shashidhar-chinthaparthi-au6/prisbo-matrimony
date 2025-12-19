import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';

const ProfileIncompleteModal = ({ isOpen, onCompleteProfile }) => {
  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Complete Your Profile</Text>
          </View>
          <Text style={styles.message}>
            Your profile is incomplete. Please complete all mandatory fields (Name, Date of Birth, City, State, Religion, Caste) to continue using the platform.
          </Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.completeButton}
              onPress={onCompleteProfile}
            >
              <Text style={styles.completeButtonText}>Complete Profile Now</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
  completeButton: {
    width: '100%',
    backgroundColor: '#ef4444',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default ProfileIncompleteModal;

