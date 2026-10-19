import React from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {fontStyle} from '../../../globals/fonts';
import {useOnboardingTheme} from '../../../theme/onboarding';
import ImpactRow from './ImpactRow';
import {FlatRow} from './WizardUI';

// The flat fact list under the pay and receive nodes on Confirm. The caller
// decides which optional facts apply; this only draws them in order.
const ConfirmFacts = ({
  arrives,
  destinationNetwork,
  fees,
  hasRoute,
  impact,
  onOpenDetails,
  onOpenFees,
  recipient,
  showRecipient,
}) => {
  const theme = useOnboardingTheme();

  return (
    <View style={[styles.rows, {borderTopColor: theme.colors.border}]}>
      {showRecipient ? (
        <FlatRow
          label="To"
          numberOfLines={0}
          value={recipient}
          valueStyle={recipient.endsWith('@') ? null : styles.address}
        />
      ) : null}
      {destinationNetwork ? (
        <FlatRow label="Destination network" value={destinationNetwork} />
      ) : null}
      {impact ? (
        <ImpactRow
          impact={impact.impact}
          level={impact.level}
          lossText={impact.lossText}
        />
      ) : null}
      <FlatRow label="Fees" numberOfLines={0} onPress={onOpenFees} value={fees} />
      <FlatRow label="Arrives" value={arrives} />
      <FlatRow
        label="More details"
        onPress={onOpenDetails}
        quiet
        value={hasRoute ? 'Route, from, balance' : 'From, balance'}
      />
    </View>
  );
};

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
