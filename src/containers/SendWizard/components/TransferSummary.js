import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import SkeletonLoader, {SkeletonBlock} from '../../../components/SkeletonLoader';
import {fontStyle} from '../../../globals/fonts';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {AssetCoinLogo} from '../../../utils/CoinData/Graphics';

const LOGO_SIZE = 40;

// One end of a transfer: the asset logo, a short label ("You pay", "You
// receive") and the amount. The recipient is not named here; Confirm lists it
// once, in full. A long amount shrinks; a long label ("RSRG…LLck receives")
// wraps to a second line instead of running into the amount. `loading` holds
// the amount's place with a skeleton while the wallet still works it out.
export const TransferNode = ({
  amount,
  coinId,
  fiat,
  label,
  loading = false,
  ticker,
}) => {
  const theme = useOnboardingTheme();
  const {colors} = theme;

  return (
    <View style={styles.node}>
      <AssetCoinLogo coinId={coinId} size={LOGO_SIZE} />
      <View style={styles.labelWrap}>
        <Text
          numberOfLines={2}
          style={[theme.typography.bodySm, {color: colors.textSecondary}]}>
          {label}
        </Text>
      </View>
      <View style={styles.value}>
        {loading ? (
          <SkeletonLoader style={styles.valueSkeleton}>
            <SkeletonBlock height={22} radius={6} width={112} />
          </SkeletonLoader>
        ) : (
          <>
            <View style={styles.amountRow}>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.6}
                numberOfLines={1}
                style={[
                  styles.amount,
                  String(amount).length > 11 && styles.amountLong,
                  {color: colors.textPrimary},
                ]}>
                {amount}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.ticker, {color: colors.textSecondary}]}>
                {' '}
                {ticker}
              </Text>
            </View>
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
  labelWrap: {flexGrow: 1, flexShrink: 1, minWidth: 0, marginLeft: 14, marginRight: 8, justifyContent: 'center'},
  value: {alignItems: 'flex-end', flexShrink: 0, marginLeft: 8, maxWidth: '64%'},
  valueSkeleton: {alignSelf: 'flex-end'},
  amountRow: {flexDirection: 'row', alignItems: 'baseline', flexShrink: 1},
  connectorSkeleton: {alignSelf: 'flex-start'},
  amount: {fontSize: 20, lineHeight: 26, ...fontStyle('bold')},
  amountLong: {fontSize: 17, lineHeight: 24},
  ticker: {flexShrink: 0, fontSize: 14, ...fontStyle('semiBold')},
  connector: {
    minHeight: 40,
    marginLeft: LOGO_SIZE / 2 - 1,
    paddingLeft: LOGO_SIZE / 2 + 13,
    borderLeftWidth: 2,
    justifyContent: 'center',
  },
});
