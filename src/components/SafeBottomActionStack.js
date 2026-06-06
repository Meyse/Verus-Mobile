import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const SafeBottomActionStack = ({
  children,
  bottomSpacing = 30,
  gap = 4,
  horizontalSpacing = 32,
  safeAreaSpacing = 12,
  style,
}) => {
  const insets = useSafeAreaInsets();
  const paddingBottom = Math.max(insets.bottom + safeAreaSpacing, bottomSpacing);

  return (
    <View
      style={[
        styles.container,
        {
          paddingLeft: horizontalSpacing + insets.left,
          paddingRight: horizontalSpacing + insets.right,
          paddingBottom,
          gap,
        },
        style,
      ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});

export default SafeBottomActionStack;
