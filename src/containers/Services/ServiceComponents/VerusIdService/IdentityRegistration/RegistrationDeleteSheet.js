import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import AcknowledgeSheet from '../../../../../components/AcknowledgeSheet';
import {formatRegistrationAmount} from '../../../../../utils/identityRegistration/costs';
import {useOnboardingTheme} from '../../../../../theme/onboarding';
import {currencyLabel} from './RegistrationComponents';

// One confirmation for every saved registration (PR 266 review R7, A + 2).
// The state comes from the full saved review, never from a list summary:
// - unpaid: nothing was paid (a draft, or a first payment that expired).
// - paid: the first payment is spent; nothing more can leave the wallet.
// - pending: the first payment is signed or sent but not confirmed yet.
// - signed: the second payment is signed and can still confirm.
// - linkable: the VerusID exists; only the saved record goes.
const pendingCommitmentStates = ['commitment_signed', 'commitment_broadcast', 'commitment_broadcast_unknown'];

export const registrationDeleteState = review => {
  switch (review?.deletionKind) {
    case 'draft': return 'unpaid';
    case 'commitment':
      if (['commitment_prepared', 'commitment_expired'].includes(review.status)) return 'unpaid';
      return pendingCommitmentStates.includes(review.status) ? 'pending' : 'paid';
    case 'registration': return review.registrationCanStillConfirm ? 'signed' : 'paid';
    case 'completed': return 'linkable';
    default: return null;
  }
};

const amountsText = (amounts, currencyNames) => Object.entries(amounts || {})
  .map(([id, amount]) => `${formatRegistrationAmount(amount)} ${currencyLabel(id, currencyNames)}`);
// Keeps the "?" on the line of a long name (Android QA, 2026-11-20).
const WORD_JOINER = '\u2060';
const blockText = height => String(height).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const Row = ({label, values, danger, last, theme}) => (
  <View style={[styles.row, {borderTopColor: theme.colors.border}, last && {borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border}]}>
    <Text style={[theme.typography.bodySm, styles.rowLabel, {color: theme.colors.textSecondary}]}>{label}</Text>
    <View style={styles.rowValues}>
      {values.map(value => <Text key={value} style={[theme.typography.labelMd, styles.rowValue,
        {color: danger ? theme.colors.dangerText : theme.colors.textPrimary}]}>{value}</Text>)}
    </View>
  </View>
);

export const RegistrationDeleteSheet = ({review, visible, onClose, onDelete}) => {
  const theme = useOnboardingTheme();
  const state = registrationDeleteState(review);
  const names = review?.currencyNames;
  const paidFee = review?.commitmentFee || review?.initialQuote?.commitmentFee;
  const paid = paidFee && review?.systemId ? [`${formatRegistrationAmount(paidFee)} ${currencyLabel(review.systemId, names)}`] : [];
  const atRisk = state === 'signed' ? amountsText(review.quote?.totalRequired, names) : [];
  let message = 'No payment was made. This removes the saved registration from this wallet.';
  let children = null;
  if (state === 'paid') {
    message = 'This payment does not come back. You cannot finish this registration after you delete it. Your recovery phrase cannot restore it.';
    children = paid.length ? <View style={styles.rows}><Row label="Already paid" values={paid} last theme={theme} /></View> : null;
  } else if (state === 'pending') {
    // Not confirmed yet: it can still be paid, so the fee is not "already paid".
    message = 'If it confirms, this payment does not come back. You cannot finish this registration after you delete it. Your recovery phrase cannot restore it.';
    children = paid.length ? <View style={styles.rows}><Row label="Can still be paid" values={paid} last theme={theme} /></View> : null;
  } else if (state === 'linkable') {
    message = 'This removes the saved registration. The VerusID stays on the blockchain. You can still add it with Link VerusID.';
  } else if (state === 'signed') {
    message = `If it confirms, the VerusID is created${atRisk.length ? ` and ${atRisk.join(' and ')} is spent` : ''}. Add it with Link VerusID.`;
    children = <>
      <View accessibilityRole="alert" style={[styles.notice, {backgroundColor: theme.colors.dangerBackground}]}>
        <Text style={[theme.typography.labelMd, {color: theme.colors.textPrimary}]}>Delete does not stop the second payment</Text>
        <Text style={[theme.typography.bodySm, {color: theme.colors.textSecondary}]}>
          {review.registrationExpiryHeight
            ? `The network can still confirm it until block ${blockText(review.registrationExpiryHeight)}.`
            : 'The network can still confirm it.'}
        </Text>
      </View>
      <View style={styles.rows}>
        {!!paid.length && <Row label="Already paid" values={paid} last={!atRisk.length} theme={theme} />}
        {!!atRisk.length && <Row label="Can still be paid" values={atRisk} danger last theme={theme} />}
      </View>
    </>;
  }
  return <AcknowledgeSheet visible={visible} title={`Delete ${review?.displayName || 'registration'}${WORD_JOINER}?`} message={message}
    destructive={state !== 'linkable'} confirmLabel={state === 'signed' ? 'Delete anyway' : 'Delete'} dismissLabel="Keep registration"
    onClose={onClose} onAcknowledged={onDelete}>{children}</AcknowledgeSheet>;
};

const styles = StyleSheet.create({
  notice: {marginTop: 16, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, gap: 2},
  rows: {marginTop: 16},
  row: {minHeight: 44, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: StyleSheet.hairlineWidth},
  rowLabel: {flexShrink: 0},
  rowValues: {flex: 1, minWidth: 0, alignItems: 'flex-end'},
  rowValue: {textAlign: 'right', fontVariant: ['tabular-nums']},
});

export default RegistrationDeleteSheet;
