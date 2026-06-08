import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {normalizeWalletAvatar} from '../utils/walletAvatar';

const WalletAvatar = ({walletAvatar, size = 40, emojiSize = 21, style}) => {
  const normalizedAvatar = normalizeWalletAvatar(walletAvatar);

  if (normalizedAvatar == null) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: normalizedAvatar.backgroundColor,
        },
        style,
      ]}>
      <Text
        allowFontScaling={false}
        style={[
          styles.emoji,
          {
            fontSize: emojiSize,
            lineHeight: emojiSize + 4,
          },
        ]}>
        {normalizedAvatar.emoji}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    textAlign: 'center',
  },
});

export default WalletAvatar;
