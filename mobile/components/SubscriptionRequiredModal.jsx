import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';

const SubscriptionRequiredModal = ({ isOpen, onSubscribe }) => {
  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Subscription Required</Text>
          </View>
          <Text style={styles.message}>
            You need an active subscription to access this feature. Please subscribe to continue viewing profiles, sending interests, and adding favorites.
          </Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.subscribeButton}
              onPress={onSubscribe}
            >
              <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
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
  closeButton: {
    fontSize: 28,
    color: '#666',
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
  subscribeButton: {
    width: '100%',
    backgroundColor: '#ef4444',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  subscribeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default SubscriptionRequiredModal;

