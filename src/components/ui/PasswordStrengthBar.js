/**
 * Update: AppPasswordStrengthBar
 * - Segmented bar with active segments and label/color
 */
import React from 'react';
import { View, Text } from 'react-native';

const AppPasswordStrengthBar = ({ active = 0, max = 4, label, color }) => {
  const clamped = Math.max(0, Math.min(active, max));
  return (
    <View>
      <View className="flex-row items-center mt-2">
        {[...Array(max)].map((_, idx) => {
          const filled = idx < clamped;
          const segColor = filled ? (color || '#3B82F6') : '#E5E7EB';
          return <View key={idx} style={{ height: 8, borderRadius: 4, backgroundColor: segColor, flex: 1, marginRight: idx !== max - 1 ? 6 : 0 }} />
        })}
      </View>
      {label ? <Text className="text-xs mt-2" style={{ color: color || '#6B7280' }}>{label}</Text> : null}
    </View>
  );
};

export default AppPasswordStrengthBar;


