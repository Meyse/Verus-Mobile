import React from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';

const MONOSPACE_FONT = Platform.select({ios: 'Menlo', default: 'monospace'});

// A card's name, from getSubWalletCardTitle: the short address in monospace
// (or the VerusID name, or "Private"), then " · <network>". The name gives way
// with a middle ellipsis, so a VerusID keeps its final "@"; the network never
// shortens. The caller owns accessibility.
const CardTitle = ({title, style, containerStyle}) => {
  if (!title) return null;

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.row, containerStyle]}>
      <Text
        ellipsizeMode="middle"
        numberOfLines={1}
        style={[style, styles.name, title.isAddress && styles.address]}>
        {title.name}
      </Text>
      {title.network ? (
        <Text numberOfLines={1} style={[style, styles.network]}>
          {` · ${title.network}`}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'baseline', minWidth: 0},
  name: {flexShrink: 1},
  address: {fontFamily: MONOSPACE_FONT},
  network: {flexShrink: 0},
});

export default CardTitle;
