import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import SkeletonLoader, {SkeletonBlock} from '../../../components/SkeletonLoader';
import {fontStyle} from '../../../globals/fonts';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {AssetCoinLogo} from '../../../utils/CoinData/Graphics';

const LOGO_SIZE = 40;

// One end of a transfer: the asset logo, who or what it is, and the amount.
// Pass `label` for a plain label ("You pay") or `name` and `suffix` for a
// recipient: the name sits above "receives" so a long address keeps room. Pass
// the whole address; the text shortens it once, in the middle. A long amount
// shrinks before the label does. `loading` holds the amount's place with a
// skeleton while the wallet still works it out.
export const TransferNode = ({
  amount,
  coinId,
  fiat,
  label,
  loading = false,
  name,
  suffix,
  ticker,
}) => {
  const theme = useOnboardingTheme();
  const {colors} = theme;

  return (
    <View style={styles.node}>
      <AssetCoinLogo coinId={coinId} size={LOGO_SIZE} />
      <View style={styles.labelWrap}>
        {name ? (
          <>
            <Text
              ellipsizeMode="middle"
              numberOfLines={1}
              style={[theme.typography.labelMd, {color: colors.textPrimary}]}>
              {name}
            </Text>
            <Text
              numberOfLines={1}
              style={[theme.typography.caption, {color: colors.textSecondary}]}>
              {suffix}
            </Text>
          </>
        ) : (
          <Text
            numberOfLines={1}
            style={[theme.typography.bodySm, {color: colors.textSecondary}]}>
            {label}
          </Text>
        )}
      </View>
      <View style={styles.value}>
        {loading ? (
          <SkeletonLoader style={styles.valueSkeleton}>
            <SkeletonBlock height={22} radius={6} width={112} />
          </SkeletonLoader>
        ) : (
          <>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              numberOfLines={1}
              style={[styles.amount, {color: colors.textPrimary}]}>
              {amount}
              <Text style={[styles.ticker, {color: colors.textSecondary}]}> {ticker}</Text>
            </Text>
            {fiat ? (
              <Text style={[theme.typography.caption, {color: colors.textSecondary}]}>
                ≈ {fiat}
              </Text>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
};

// The line between two nodes. It carries what happens on the way: the price
// and the route. Pass each fact as its own line, so a route name never breaks
// in the middle.
export const TransferConnector = ({children, loading = false}) => {
  const theme = useOnboardingTheme();
  return (
    <View style={[styles.connector, {borderLeftColor: theme.colors.border}]}>
      {loading ? (
        <SkeletonLoader style={styles.connectorSkeleton}>
          <SkeletonBlock height={13} radius={4} width={168} />
        </SkeletonLoader>
      ) : (
        [].concat(children).map(line => (
          <Text
            key={line}
            style={[theme.typography.caption, {color: theme.colors.textSecondary}]}>
            {line}
          </Text>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  node: {minHeight: 56, flexDirection: 'row', alignItems: 'center'},
  labelWrap: {flex: 1, minWidth: 0, marginLeft: 14, marginRight: 8, justifyContent: 'center'},
  value: {alignItems: 'flex-end', flexShrink: 1, maxWidth: '64%'},
  valueSkeleton: {alignSelf: 'flex-end'},
  connectorSkeleton: {alignSelf: 'flex-start'},
  amount: {fontSize: 20, lineHeight: 26, ...fontStyle('bold')},
  ticker: {fontSize: 14, ...fontStyle('semiBold')},
  connector: {
    minHeight: 40,
    marginLeft: LOGO_SIZE / 2 - 1,
    paddingLeft: LOGO_SIZE / 2 + 13,
    borderLeftWidth: 2,
    justifyContent: 'center',
  },
});
