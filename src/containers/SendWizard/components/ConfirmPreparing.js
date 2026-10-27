import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import SkeletonLoader, {SkeletonBlock} from '../../../components/SkeletonLoader';
import {truncateDecimal} from '../../../utils/math';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {RecipientRow} from './ConfirmFacts';
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
// A pre-conversion (`atLaunch`) already knows its price line and launch facts.
const ConfirmPreparing = ({
  amount,
  atLaunch = false,
  arrives,
  destinationNetwork,
  isConversion,
  fromLabel,
  networkFee = false,
  recipient,
  recipientCaption,
  routeRows = [],
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
      {atLaunch ? (
        <>
          <TransferConnector>Price set at launch</TransferConnector>
          <TransferNode
            amount={null}
            coinId={target.coinId || target.id}
            label="You receive"
            ticker={target.ticker}
          />
        </>
      ) : isConversion ? (
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
        {fromLabel ? <FlatRow label="From" numberOfLines={0} value={fromLabel} /> : null}
        <RecipientRow caption={recipientCaption} recipient={recipient} resolvingAddress={recipient.includes('@')} />
        {destinationNetwork ? (
          <FlatRow label="Destination network" value={destinationNetwork} />
        ) : null}
        {routeRows.map(row => (
          <FlatRow key={row.label} label={row.label} numberOfLines={0} value={row.value} />
        ))}
        {showPriceImpact ? (
          <FlatRow label="Price impact">
            <ValueSkeleton width={120} />
          </FlatRow>
        ) : null}
        <FlatRow label={networkFee ? "Network fee" : "Fees"}>
          <ValueSkeleton />
        </FlatRow>
        {arrives ? (
          <FlatRow label="Arrives" value={arrives} />
        ) : (
          <FlatRow label="Arrives">
            <ValueSkeleton width={72} />
          </FlatRow>
        )}
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
  valueSkeleton: {alignSelf: 'flex-end'},
});

export default ConfirmPreparing;
