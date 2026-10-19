import React from 'react';
import {Platform, ScrollView, StyleSheet, View} from 'react-native';
import SkeletonLoader, {SkeletonBlock} from '../../../components/SkeletonLoader';
import {truncateDecimal} from '../../../utils/math';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {TransferConnector, TransferNode} from './TransferSummary';
import {FlatRow, WIZARD_CONTENT_TOP_INSET} from './WizardUI';

const ValueSkeleton = ({width = 96}) => (
  <SkeletonLoader style={styles.valueSkeleton}>
    <SkeletonBlock height={15} radius={4} width={width} />
  </SkeletonLoader>
);

// Confirm while the wallet prepares the transaction. It draws the review as it
// will look: what the user already chose is real, and only what the wallet is
// still working out (the receive amount, the price, fees and timing) is a
// skeleton. The review then fills in without the page changing shape.
const ConfirmPreparing = ({
  amount,
  destinationNetwork,
  isConversion,
  recipient,
  showPriceImpact,
  sourceCoin,
  target,
}) => {
  const theme = useOnboardingTheme();

  return (
    <ScrollView
      accessibilityLabel="Preparing transaction"
      contentContainerStyle={styles.content}
      scrollEnabled={false}>
      <TransferNode
        amount={truncateDecimal(amount, 8)}
        coinId={sourceCoin?.id}
        label={isConversion ? 'You pay' : 'You send'}
        ticker={sourceCoin?.display_ticker || ''}
      />
      {isConversion ? (
        <>
          <TransferConnector loading />
          <TransferNode
            coinId={target.coinId || target.id}
            label="You receive"
            loading
            ticker={target.ticker}
          />
        </>
      ) : null}
      <View style={[styles.rows, {borderTopColor: theme.colors.border}]}>
        <FlatRow
          label="To"
          numberOfLines={0}
          value={recipient}
          valueStyle={recipient.endsWith('@') ? null : styles.address}
        />
        {destinationNetwork ? (
          <FlatRow label="Destination network" value={destinationNetwork} />
        ) : null}
        {showPriceImpact ? (
          <FlatRow label="Price impact">
            <ValueSkeleton width={120} />
          </FlatRow>
        ) : null}
        <FlatRow label="Fees">
          <ValueSkeleton />
        </FlatRow>
        <FlatRow label="Arrives">
          <ValueSkeleton width={72} />
        </FlatRow>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: WIZARD_CONTENT_TOP_INSET,
    paddingBottom: 20,
  },
  rows: {
    marginTop: 24,
    marginBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  address: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    lineHeight: 18,
  },
  valueSkeleton: {alignSelf: 'flex-end'},
});

export default ConfirmPreparing;
