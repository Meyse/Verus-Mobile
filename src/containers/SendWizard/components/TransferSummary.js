import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import CopyFeedback from '../../../components/CopyFeedback';
import useCopyFeedback from '../../../hooks/useCopyFeedback';
import SkeletonLoader, {SkeletonBlock} from '../../../components/SkeletonLoader';
import PrivacyBlurredText from '../../../components/PrivacyBlurredText';
import {fontStyle} from '../../../globals/fonts';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {AssetCoinLogo} from '../../../utils/CoinData/Graphics';

const LOGO_SIZE = 40;

// One end of a transfer: the asset logo, a short label ("You pay", "You
// receive") and the amount. The recipient is not named here; Confirm lists it
// once, in full. A long amount shrinks; a long label ("RSRG…LLck receives")
// wraps to a second line instead of running into the amount. `loading` holds
// the amount's place with a skeleton while the wallet still works it out.
// Without an amount (a pre-conversion before its launch), the ticker takes the
// amount's place. History details opt into `hideAmounts`; active payment
// reviews and results keep their existing readable amounts.
export const TransferNode = ({
  amount,
  coinId,
  copyValue,
  fiat,
  hideAmounts = false,
  label,
  loading = false,
  ticker,
}) => {
  const theme = useOnboardingTheme();
  const {colors} = theme;
  const AmountText = hideAmounts ? PrivacyBlurredText : Text;
  const {copied, canCopy, copyProps} = useCopyFeedback(copyValue, {
    disabled: loading || hideAmounts,
    haptic: true,
  });
  const Container = canCopy ? Pressable : View;

  return (
    <Container accessible={canCopy || undefined} {...copyProps} style={styles.node}>
      <AssetCoinLogo coinId={coinId} size={LOGO_SIZE} />
      <View style={styles.labelWrap}>
        <Text
          numberOfLines={2}
          style={[theme.typography.bodySm, {color: colors.textSecondary}]}>
          {label}
        </Text>
      </View>
      <View
        accessible={hideAmounts || undefined}
        accessibilityLabel={hideAmounts ? 'Balance hidden' : undefined}
        style={styles.value}>
        <CopyFeedback copied={copied} contentStyle={styles.valueContent}>
          {loading ? (
            <SkeletonLoader style={styles.valueSkeleton}>
              <SkeletonBlock height={22} radius={6} width={112} />
            </SkeletonLoader>
          ) : amount == null ? (
            <Text
              numberOfLines={1}
              style={[styles.amount, {color: colors.textPrimary}]}>
              {ticker}
            </Text>
          ) : (
            <>
              <View style={styles.amountRow}>
                <AmountText
                  {...(hideAmounts ? {hidden: true, blurRadius: 7, color: colors.textPrimary} : {})}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                  numberOfLines={1}
                  style={[
                    styles.amount,
                    String(amount).length > 11 && styles.amountLong,
                    {color: colors.textPrimary},
                  ]}>
                  {amount}
                </AmountText>
                <Text
                  numberOfLines={1}
                  style={[styles.ticker, {color: colors.textSecondary}]}>
                  {' '}
                  {ticker}
                </Text>
              </View>
              {fiat ? (
                <AmountText
                  {...(hideAmounts ? {hidden: true, blurRadius: 5, color: colors.textSecondary} : {})}
                  style={[theme.typography.caption, {color: colors.textSecondary}]}>
                  {`≈ ${fiat}`}
                </AmountText>
              ) : null}
            </>
          )}
        </CopyFeedback>
      </View>
    </Container>
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
  valueContent: {alignItems: 'flex-end'},
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
