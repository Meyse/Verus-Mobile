import React from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';

const MONOSPACE_FONT = Platform.select({ios: 'Menlo', default: 'monospace'});

// A card's name, from getSubWalletCardTitle: the short address in monospace
// (or the VerusID name, or "Private"), then " · <network>". The short address
// never shortens below 6…6 (owner, 2026-11-19); in too little room the network
// takes a tail ellipsis. A VerusID name gives way with a middle ellipsis and
// keeps its final "@"; then the network never shortens. The caller owns
// accessibility.
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
        style={[
          style,
          title.isAddress ? styles.address : styles.name,
        ]}>
        {title.name}
      </Text>
      {title.network ? (
        <Text
          ellipsizeMode="tail"
          numberOfLines={1}
          style={[style, title.isAddress ? styles.name : styles.network]}>
          {` · ${title.network}`}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'baseline', minWidth: 0},
  name: {flexShrink: 1},
  address: {flexShrink: 0, fontFamily: MONOSPACE_FONT},
  network: {flexShrink: 0},
});

export default CardTitle;
