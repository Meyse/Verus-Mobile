import React from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';

const MONOSPACE_FONT = Platform.select({ios: 'Menlo', default: 'monospace'});

// A card's name, from getSubWalletCardTitle: the short address in monospace
// (or the VerusID name, or "Private"), then " · <network>". The short address
// never shortens below 6…6 (owner, 2026-11-19); in too little room the network
// takes a tail ellipsis. A VerusID name gives way with a middle ellipsis and
// keeps its final "@"; then the network never shortens. The caller owns
// accessibility.
//
// `wrap` (choosers beside a balance column): when the title does not fit on
// one line, " · <network>" moves to a second line, so the address stays 6…6
// and the network stays whole. The stack keeps one line.
//
// The two parts share the caller's line height and align to the top, not the
// baseline: Android lays out a baseline row of two fonts (monospace and Inter)
// wrongly (seen on Android 16, 2026-11-19).
const CardTitle = ({title, style, containerStyle, wrap = false}) => {
  if (!title) return null;

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.row, wrap && styles.wrap, containerStyle]}>
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
  row: {flexDirection: 'row', alignItems: 'flex-start', minWidth: 0},
  wrap: {flexWrap: 'wrap'},
  name: {flexShrink: 1},
  address: {flexShrink: 0, fontFamily: MONOSPACE_FONT},
  network: {flexShrink: 0},
});

export default CardTitle;
