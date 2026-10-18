import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {fontStyle} from '../../../globals/fonts';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {AssetCoinLogo} from '../../../utils/CoinData/Graphics';

const LOGO_SIZE = 40;

// One end of a transfer: the asset logo, who or what it is, and the amount.
// `children` is the label, so a part of it can be emphasised.
export const TransferNode = ({amount, children, coinId, fiat, ticker}) => {
  const theme = useOnboardingTheme();
  const {colors} = theme;

  return (
    <View style={styles.node}>
      <AssetCoinLogo coinId={coinId} size={LOGO_SIZE} />
      <Text
        ellipsizeMode="middle"
        numberOfLines={1}
        style={[theme.typography.bodySm, styles.label, {color: colors.textSecondary}]}>
        {children}
      </Text>
      <View style={styles.value}>
        <Text style={[styles.amount, {color: colors.textPrimary}]}>
          {amount} {ticker}
        </Text>
        {fiat ? (
          <Text style={[theme.typography.caption, {color: colors.textSecondary}]}>
            ≈ {fiat}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

// A name inside a node label, for example the recipient.
export const TransferNodeName = ({children}) => {
  const theme = useOnboardingTheme();
  return (
    <Text style={[theme.typography.labelMd, {color: theme.colors.textPrimary}]}>
      {children}
    </Text>
  );
};

// The line between two nodes. It carries what happens on the way: the price
// and the route.
export const TransferConnector = ({children}) => {
  const theme = useOnboardingTheme();
  return (
    <View style={[styles.connector, {borderLeftColor: theme.colors.border}]}>
      <Text style={[theme.typography.caption, {color: theme.colors.textSecondary}]}>
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  node: {minHeight: 56, flexDirection: 'row', alignItems: 'center'},
  label: {flex: 1, minWidth: 0, marginLeft: 14, marginRight: 8},
  value: {alignItems: 'flex-end', flexShrink: 0},
  amount: {fontSize: 20, lineHeight: 26, ...fontStyle('bold')},
  connector: {
    minHeight: 40,
    marginLeft: LOGO_SIZE / 2 - 1,
    paddingLeft: LOGO_SIZE / 2 + 13,
    borderLeftWidth: 2,
    justifyContent: 'center',
  },
});
