/**
 * New file: AppCheckbox (UI Kit)
 * - Tailwind styled checkbox with visible border and label
 */
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const AppCheckbox = ({ 
  checked = false, 
  onPress, 
  label, 
  className, 
  disabled = false 
}) => {
  return (
    <Pressable 
      onPress={disabled ? undefined : onPress}
      className={`flex-row items-center ${className || ''}`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
    >
      <View className={
        "h-5 w-5 rounded border-2 items-center justify-center " +
        (checked ? "bg-blue-600 border-blue-600 " : "bg-white/60 border-zinc-400 ") +
        (disabled ? "opacity-50" : "")
      }>
        {checked ? (
          <Icon name="check" size={14} color="white" />
        ) : null}
      </View>
      {label ? (
        <Text className={
          "text-sm flex-1 ml-3 " + 
          (disabled ? "text-zinc-400" : "text-zinc-700")
        }>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
};

export default AppCheckbox;
