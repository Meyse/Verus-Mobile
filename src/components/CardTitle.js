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
  // A lone name has nothing to move to a second line.
  const wraps = wrap && Boolean(title.network);
  // A lone name in a chooser fills the line. Android's line breaker treats a
  // name with "@" as an e-mail address and may break after ".", so a
  // content-sized Text measures only "grizlo." and the middle ellipsis then
  // shows "gr…@" (360-point Android phone, 2026-11-19). A filled Text gets
  // the exact line width.
  const fills = wrap && !title.network;

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.row, wraps && styles.wrap, containerStyle]}>
      <Text
        ellipsizeMode="middle"
        numberOfLines={1}
        style={[
          style,
          title.isAddress ? styles.address : styles.name,
          wraps && styles.wrapPart,
          fills && styles.fill,
        ]}>
        {title.name}
      </Text>
      {title.network ? (
        <Text
          ellipsizeMode="tail"
          numberOfLines={1}
          style={[
            style,
            title.isAddress ? styles.name : styles.network,
            wraps && styles.wrapPart,
          ]}>
          {` · ${title.network}`}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'flex-start', minWidth: 0},
  wrap: {flexWrap: 'wrap'},
  wrapPart: {flexShrink: 0, maxWidth: '100%'},
  name: {flexShrink: 1},
  fill: {flex: 1, minWidth: 0},
  address: {flexShrink: 0, fontFamily: MONOSPACE_FONT},
  network: {flexShrink: 0},
});

export default CardTitle;
