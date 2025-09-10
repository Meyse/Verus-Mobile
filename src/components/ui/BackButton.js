/**
 * New file: AppBackButton (UI Kit)
 * - Simple back chevron pressable using vector-icons
 */
import React from 'react';
import { Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const AppBackButton = ({ onPress, className, accessibilityLabel = 'Go back' }) => {
  return (
    <Pressable
      onPress={onPress}
      className={("h-9 w-9 rounded-full items-center justify-center bg-white/40 " + (className || ""))}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: '#00000011', borderless: true }}
    >
      <Icon name="chevron-left" size={28} color="#111827" />
    </Pressable>
  );
};

export default AppBackButton;


