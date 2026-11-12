import React from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {fontStyle} from '../../../globals/fonts';
import {useOnboardingTheme} from '../../../theme/onboarding';
import ImpactRow from './ImpactRow';
import SkeletonLoader, {SkeletonBlock} from '../../../components/SkeletonLoader';
import {FeeValue} from './NetworkFeeSheet';
import {FlatRow} from './WizardUI';
import {CopyableText} from '../../../components/CopyFeedback';

// The flat fact list under the pay and receive nodes on Confirm. The recipient
// shows here once, in full; the nodes carry only the amounts. The caller decides
// which optional facts apply; this only draws them in order.
const ConfirmFacts = ({
  arrives,
  destinationNetwork,
  fees,
  feesCopyValue,
  exportFees,
  total,
  totalCopyValue,
  impact,
  onOpenFees,
  networkFee,
  feeLoading,
  leadingRows = [],
  memo,
  note,
  recipient,
  recipientCaption,
  resolvedRecipient,
  routeRows = [],
  trailingRows = [],
}) => {
  const theme = useOnboardingTheme();

  return (
    <View style={[styles.rows, {borderTopColor: theme.colors.border}]}>
      {leadingRows.map(row => (
        <FlatRow key={row.label} {...row} />
      ))}
      <RecipientRow caption={recipientCaption} recipient={recipient} resolvedAddress={resolvedRecipient} />
      {memo ? <FlatRow copyValue={memo} label="Memo" numberOfLines={0} value={memo} /> : null}
      {note ? <FlatRow copyValue={note} label="Note" numberOfLines={0} value={note} /> : null}
      {destinationNetwork ? (
        <FlatRow copyValue={destinationNetwork} label="Destination network" value={destinationNetwork} />
      ) : null}
      {routeRows.map(row => (
        <FlatRow key={row.label} numberOfLines={0} {...row} />
      ))}
      {impact ? (
        <ImpactRow
          impact={impact.impact}
          level={impact.level}
          lossText={impact.lossText}
          onPress={impact.onPress}
          pay={impact.pay}
        />
      ) : null}
      {exportFees ? (
        <>
          <FlatRow copyValue={exportFees.bridgeCopyValue} label="Bridge fee" numberOfLines={0} value={exportFees.bridge} />
          <FlatRow copyValue={exportFees.networkCopyValue} label="Network fee" numberOfLines={0} value={exportFees.network} />
          <FlatRow copyValue={totalCopyValue} label="Total" numberOfLines={0} value={total} />
        </>
      ) : networkFee ? (
        <FlatRow copyValue={feeLoading ? null : networkFee.copyValue} label="Network fee" onPress={onOpenFees}>
          {feeLoading ? <FeeSkeleton /> : <FeeValue amount={networkFee.amount} caption={networkFee.caption} />}
        </FlatRow>
      ) : <FlatRow copyValue={feesCopyValue} label="Fees" numberOfLines={0} onPress={onOpenFees} value={fees} />}
      <FlatRow copyValue={feeLoading || arrives === '—' ? null : arrives} label="Arrives" value={arrives}>
        {feeLoading ? <FeeSkeleton /> : null}
      </FlatRow>
      {trailingRows.map(row => (
        <FlatRow key={row.label} {...row} />
      ))}
    </View>
  );
};

// "To" with the full address. A pre-conversion adds one line under it: a
// failed launch refunds the same address.
export const RecipientRow = ({caption, recipient, resolvedAddress, resolvingAddress = false}) => {
  const theme = useOnboardingTheme();
  const addressStyle = recipient.includes('@') ? null : styles.address;

  if (!caption && !resolvedAddress && !resolvingAddress) {
    return (
      <FlatRow copyValue={recipient} label="To" numberOfLines={0} value={recipient} valueStyle={addressStyle} />
    );
  }
  return (
    <FlatRow label="To">
      <View style={styles.recipientValue}>
        <CopyableText copyValue={recipient} style={[styles.recipient, {color: theme.colors.textPrimary}, addressStyle]}>
          {recipient}
        </CopyableText>
        {resolvingAddress ? (
          <View style={styles.addressSkeleton}>
            <SkeletonLoader accessibilityLabel="Resolving recipient">
              <SkeletonBlock width={200} height={14} radius={4} />
            </SkeletonLoader>
          </View>
        ) : resolvedAddress ? (
          <CopyableText copyValue={resolvedAddress} style={[styles.recipientCaption, styles.address, {color: theme.colors.textSecondary}]}>
            {resolvedAddress}
          </CopyableText>
        ) : null}
        {caption ? (
          <Text style={[theme.typography.caption, styles.recipientCaption, {color: theme.colors.textSecondary}]}>
            {caption}
          </Text>
        ) : null}
      </View>
    </FlatRow>
  );
};

const FeeSkeleton = () => (
  <SkeletonLoader accessibilityLabel="Preparing network fee">
    <SkeletonBlock width={112} height={15} radius={4} />
  </SkeletonLoader>
);

// A notice from preflight, for example a centrally controlled currency.
export const ConfirmNotice = ({children}) => {
  const theme = useOnboardingTheme();

  return (
    <View style={[styles.notice, {backgroundColor: theme.colors.surfaceMuted}]}>
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={19}
        color={theme.colors.warning}
      />
      <Text style={[styles.noticeText, {color: theme.colors.textPrimary}]}>
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  rows: {marginTop: 24, marginBottom: 16, borderTopWidth: StyleSheet.hairlineWidth},
  address: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    lineHeight: 18,
  },
  recipientValue: {flex: 1, alignItems: 'flex-end'},
  recipient: {textAlign: 'right', fontSize: 14, lineHeight: 19, ...fontStyle('semiBold')},
  recipientCaption: {marginTop: 2, textAlign: 'right'},
  addressSkeleton: {height: 18, marginTop: 2, justifyContent: 'center'},
  notice: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noticeText: {flex: 1, marginLeft: 8, fontSize: 13, lineHeight: 19, ...fontStyle('regular')},
});

export default ConfirmFacts;
