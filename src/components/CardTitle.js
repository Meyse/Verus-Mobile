import React from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
import {useOnboardingTheme} from '../theme/onboarding';

const MONOSPACE_FONT = Platform.select({ios: 'Menlo', default: 'monospace'});

// A card's name, from getSubWalletCardTitle: the short address in monospace
// (or the VerusID name, or "Private"). A card on a Verus chain also names the
// chain as the quiet words "on Verus" (owner, 2026-11-25; none for Ethereum,
// Bitcoin or other Electrum cards). The short address never shortens below
// 6…6 (owner, 2026-11-19). A VerusID name gives way with a middle ellipsis
// and keeps its final "@"; the chain words never shorten. The caller owns
// accessibility.
//
// Three layouts:
// - default: one line, "name on Verus", the chain words in `chainColor`.
// - `stacked` (asset cards): the chain words on a second line under the name,
//   drawn in `captionDense` in `chainColor`.
// - `nameOnly` (choosers): only the name shows, filling the line; the caller
//   draws the chain words on its own line.
//
// The two parts of the one-line layout share the caller's line height and
// align to the top, not the baseline: Android lays out a baseline row of two
// fonts (monospace and Inter) wrongly (seen on Android 16, 2026-11-19).
const CardTitle = ({
  title,
  style,
  containerStyle,
  nameOnly = false,
  stacked = false,
  chainColor,
}) => {
  const theme = useOnboardingTheme();
  if (!title) return null;
  // A lone name in a chooser fills the line. Android's line breaker treats a
  // name with "@" as an e-mail address and may break after ".", so a
  // content-sized Text measures only "grizlo." and the middle ellipsis then
  // shows "gr…@" (360-point Android phone, 2026-11-19). A filled Text gets
  // the exact line width.
  const fills = nameOnly;
  const quiet = chainColor || theme.colors.textSecondary;
  const showChain = Boolean(title.chainLabel) && !nameOnly;
  const nameText = (
    <Text
      ellipsizeMode="middle"
      numberOfLines={1}
      style={[
        style,
        title.isAddress ? styles.address : styles.name,
        fills && styles.fill,
      ]}>
      {title.name}
    </Text>
  );

  if (stacked) {
    return (
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[styles.column, containerStyle]}>
        {nameText}
        {showChain ? (
          <Text
            numberOfLines={1}
            style={[theme.typography.captionDense, {color: quiet}]}>
            {title.chainLabel}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.row, containerStyle]}>
      {nameText}
      {showChain ? (
        <Text
          ellipsizeMode="tail"
          numberOfLines={1}
          style={[
            style,
            title.isAddress ? styles.name : styles.chain,
            {color: quiet},
          ]}>
          {` ${title.chainLabel}`}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'flex-start', minWidth: 0},
  column: {minWidth: 0},
  name: {flexShrink: 1},
  fill: {flex: 1, minWidth: 0},
  address: {flexShrink: 0, fontFamily: MONOSPACE_FONT},
  chain: {flexShrink: 0},
});

export default CardTitle;
