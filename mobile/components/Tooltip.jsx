import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions, TouchableWithoutFeedback } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const Tooltip = ({ children, text, onPress }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const childRef = useRef(null);

  const handleLongPress = () => {
    if (childRef.current) {
      childRef.current.measureInWindow((x, y, width, height) => {
        setPosition({
          x: x + width / 2,
          y: y - 10,
        });
        setShowTooltip(true);
        
        // Auto-hide after 2 seconds
        setTimeout(() => {
          setShowTooltip(false);
        }, 2000);
      });
    }
  };

  const handlePress = () => {
    if (onPress) onPress();
  };

  return (
    <>
      <View ref={childRef} collapsable={false}>
        <TouchableOpacity
          onPress={handlePress}
          onLongPress={handleLongPress}
          activeOpacity={0.7}
        >
          {children}
        </TouchableOpacity>
      </View>
      <Modal
        visible={showTooltip}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTooltip(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowTooltip(false)}>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.tooltip,
                {
                  left: Math.max(10, Math.min(position.x - 50, SCREEN_WIDTH - 110)),
                  top: Math.max(10, position.y - 40),
                },
              ]}
            >
              <Text style={styles.tooltipText}>{text}</Text>
              <View style={styles.tooltipArrow} />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  tooltipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(0, 0, 0, 0.85)',
  },
});

export default Tooltip;

