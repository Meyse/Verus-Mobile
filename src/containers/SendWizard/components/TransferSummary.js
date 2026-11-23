import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import CopyFeedback from '../../../components/CopyFeedback';
import useCopyFeedback from '../../../hooks/useCopyFeedback';
import SkeletonLoader, {SkeletonBlock} from '../../../components/SkeletonLoader';
import PrivacyBlurredText from '../../../components/PrivacyBlurredText';
import {fontStyle} from '../../../globals/fonts';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {AssetCoinLogo} from '../../../utils/CoinData/Graphics';
import {EstimateInfoButton} from './EstimateInfo';

const LOGO_SIZE = 40;
const COMPACT_LOGO_SIZE = 32;

// One end of a transfer: the asset logo, a short label ("You pay", "You
// receive") and the amount. The recipient is not named here; Confirm lists it
// once, in full. A long amount shrinks; a long label ("RSRG…LLck receives")
// wraps to a second line instead of running into the amount. `loading` holds
// the amount's place with a skeleton while the wallet still works it out.
// Without an amount (a pre-conversion before its launch), the ticker takes the
// amount's place. History details opt into `hideAmounts`; active payment
// reviews and results keep their existing readable amounts. `compact` is the
// smaller node that Confirm uses on small windows. When the wallet lowered the
// amount to pay the fees, `enteredAmount` ("0.0134422 ETH") shows struck
// through above the amount and `note` ("Lowered for fees") under the label
// (owner, 2026-11-13, option B of the reduced-amount mockups). `onInfo` puts
// the "About this amount" glyph after the label (R4 option B). The glyph is its
// own target, so the copy long press then covers the logo, the label text and
// the amount, not the whole row. That node keeps "You receive" and the glyph on
// one line (about 100 points reserved); a long ticker is cut first, then the
// amount fits its width.
export const TransferNode = ({
  amount,
  coinId,
  compact = false,
  copyValue,
  enteredAmount,
  fiat,
  hideAmounts = false,
  label,
  loading = false,
  note,
  onInfo,
  ticker,
}) => {
  const theme = useOnboardingTheme();
  const {colors} = theme;
  const AmountText = hideAmounts ? PrivacyBlurredText : Text;
  const {copied, canCopy, copyProps} = useCopyFeedback(copyValue, {
    disabled: loading || hideAmounts,
    haptic: true,
  });
  const withInfo = typeof onInfo === 'function';
  const Container = canCopy && !withInfo ? Pressable : View;
  const ValueContainer = canCopy && withInfo ? Pressable : View;
  // With the glyph the node is no pressable, so the logo and the label copy on
  // a long press by themselves; neither is an accessibility element of its own.
  const copyLongPress = canCopy && withInfo ? copyProps.onLongPress : undefined;
  const logo = (
    <AssetCoinLogo coinId={coinId} size={compact ? COMPACT_LOGO_SIZE : LOGO_SIZE} />
  );

  return (
    <Container
      accessible={canCopy && !withInfo ? true : undefined}
      {...(withInfo ? {} : copyProps)}
      style={[styles.node, compact && styles.nodeCompact]}>
      {copyLongPress ? (
        <Pressable accessible={false} onLongPress={copyLongPress}>{logo}</Pressable>
      ) : logo}
      <View style={[styles.labelWrap, withInfo && styles.labelWrapInfo]}>
        <View style={styles.labelLine}>
          <Text
            numberOfLines={withInfo ? 1 : 2}
            onLongPress={copyLongPress}
            style={[styles.labelText, withInfo && styles.labelTextInfo, theme.typography.bodySm, {color: colors.textSecondary}]}>
            {label}
          </Text>
          {withInfo ? <EstimateInfoButton onPress={onInfo} /> : null}
        </View>
        {note ? (
          <Text style={[theme.typography.caption, styles.note, {color: colors.warningText}]}>
            {note}
          </Text>
        ) : null}
      </View>
      <ValueContainer
        accessible={hideAmounts || (canCopy && withInfo) || undefined}
        accessibilityLabel={hideAmounts ? 'Balance hidden' : undefined}
        {...(withInfo ? copyProps : {})}
        style={[styles.value, withInfo && styles.valueInfo]}>
        <CopyFeedback copied={copied} contentStyle={styles.valueContent}>
          {loading ? (
            <SkeletonLoader style={styles.valueSkeleton}>
              <SkeletonBlock height={22} radius={6} width={112} />
            </SkeletonLoader>
          ) : amount == null ? (
            <Text
              numberOfLines={1}
              style={[styles.amount, compact && styles.amountLong, {color: colors.textPrimary}]}>
              {ticker}
            </Text>
          ) : (
            <>
              {enteredAmount ? (
                <Text
                  accessibilityLabel={`Entered ${enteredAmount}`}
                  numberOfLines={1}
                  style={[theme.typography.caption, styles.entered, {color: colors.textSecondary}]}>
                  {enteredAmount}
                </Text>
              ) : null}
              <View style={styles.amountRow}>
                <AmountText
                  {...(hideAmounts ? {hidden: true, blurRadius: 7, color: colors.textPrimary} : {})}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                  numberOfLines={1}
                  style={[
                    styles.amount,
                    (compact || String(amount).length > 11) && styles.amountLong,
                    withInfo && styles.amountInfo,
                    {color: colors.textPrimary},
                  ]}>
                  {amount}
                </AmountText>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.ticker,
                    compact && styles.tickerCompact,
                    withInfo && styles.tickerInfo,
                    {color: colors.textSecondary},
                  ]}>
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
      </ValueContainer>
    </Container>
  );
};

// The line between two nodes. It carries what happens on the way: the price
// and the route. Pass each fact as its own line, so a route name never breaks
// in the middle.
export const TransferConnector = ({children, compact = false, loading = false}) => {
  const theme = useOnboardingTheme();
  return (
    <View
      style={[
        styles.connector,
        compact && styles.connectorCompact,
        {borderLeftColor: theme.colors.border},
      ]}>
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
  nodeCompact: {minHeight: 44},
  labelWrap: {flexGrow: 1, flexShrink: 1, minWidth: 0, marginLeft: 14, marginRight: 8, justifyContent: 'center'},
  value: {alignItems: 'flex-end', flexShrink: 0, marginLeft: 8, maxWidth: '64%'},
  valueContent: {alignItems: 'flex-end'},
  valueSkeleton: {alignSelf: 'flex-end'},
  amountRow: {flexDirection: 'row', alignItems: 'baseline', flexShrink: 1},
  // With the glyph the label block keeps its natural width ("You receive" 78
  // points + glyph 22) and the value column gives way: its ticker first, the
  // amount (fit-to-width) only when the ticker is gone.
  labelWrapInfo: {minHeight: 44, flexShrink: 0},
  labelTextInfo: {flexShrink: 0},
  valueInfo: {flexShrink: 1, minWidth: 0},
  amountInfo: {flexShrink: 0.01},
  tickerInfo: {flexShrink: 1, minWidth: 0},
  labelLine: {flexDirection: 'row', alignItems: 'center'},
  labelText: {flexShrink: 1},
  note: {...fontStyle('semiBold')},
  entered: {textDecorationLine: 'line-through'},
  connectorSkeleton: {alignSelf: 'flex-start'},
  amount: {fontSize: 20, lineHeight: 26, ...fontStyle('bold')},
  amountLong: {fontSize: 17, lineHeight: 24},
  ticker: {flexShrink: 0, fontSize: 14, ...fontStyle('semiBold')},
  tickerCompact: {fontSize: 13},
  connector: {
    minHeight: 40,
    marginLeft: LOGO_SIZE / 2 - 1,
    paddingLeft: LOGO_SIZE / 2 + 13,
    borderLeftWidth: 2,
    justifyContent: 'center',
  },
  connectorCompact: {
    minHeight: 24,
    marginLeft: COMPACT_LOGO_SIZE / 2 - 1,
    paddingLeft: COMPACT_LOGO_SIZE / 2 + 13,
  },
});
