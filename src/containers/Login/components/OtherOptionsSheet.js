import React, {useMemo, useRef} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-paper';
import {FileClock, KeyRound, ShieldCheck} from 'lucide-react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BottomSheetModal from '../../../components/BottomSheetModal';
import {fontStyle} from '../../../globals/fonts';
import {createSignedOutSheetStyles} from '../../../styles';
import {useOnboardingTheme} from '../../../theme/onboarding';

const OTHER_ACTIONS = [
  {
    label: 'Revoke or recover VerusID',
    IconComponent: ShieldCheck,
    actionKey: 'onRevokeRecoverVerusId',
  },
  {
    label: 'Provisioning requests',
    IconComponent: FileClock,
    actionKey: 'onProvisioningRequests',
  },
];

const OtherOptionsSheet = ({
  visible,
  onClose,
  onRecoverProfileSeed,
  onRevokeRecoverVerusId,
  onProvisioningRequests,
  networkLabel,
  walletCount,
}) => {
  const theme = useOnboardingTheme();
  const sheetStyles = useMemo(() => createSignedOutSheetStyles(theme), [theme]);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const pendingActionRef = useRef(null);
  const recoveryDisabled = walletCount === 0;
  const actionHandlers = {
    onRecoverProfileSeed,
    onRevokeRecoverVerusId,
    onProvisioningRequests,
  };

  const handleAction = action => {
    pendingActionRef.current = typeof action === 'function' ? action : null;
    onClose();
  };

  const recoveryDescription = recoveryDisabled
    ? `No ${networkLabel.toLowerCase()} wallets with stored secrets`
    : `${walletCount} ${networkLabel.toLowerCase()} ${
        walletCount === 1 ? 'wallet' : 'wallets'
      } available`;

  const handleClosed = () => {
    const pendingAction = pendingActionRef.current;
    pendingActionRef.current = null;

    if (typeof pendingAction === 'function') {
      pendingAction();
    }
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      onClosed={handleClosed}
      maxHeight="78%">
      <View style={[sheetStyles.body, sheetStyles.bodyShort]}>
        <OtherActionRow
          description={recoveryDescription}
          disabled={recoveryDisabled}
          label={`View ${networkLabel} wallet recovery secrets`}
          IconComponent={KeyRound}
          sheetStyles={sheetStyles}
          styles={styles}
          theme={theme}
          onPress={() => handleAction(onRecoverProfileSeed)}
        />
        {OTHER_ACTIONS.map(({label, IconComponent, actionKey}) => (
          <OtherActionRow
            key={label}
            label={label}
            IconComponent={IconComponent}
            sheetStyles={sheetStyles}
            styles={styles}
            theme={theme}
            onPress={() => handleAction(actionHandlers[actionKey])}
          />
        ))}
      </View>
    </BottomSheetModal>
  );
};

const OtherActionRow = ({
  description,
  disabled = false,
  label,
  IconComponent,
  sheetStyles,
  styles,
  theme,
  onPress,
}) => (
  <TouchableOpacity
    accessibilityRole="button"
    accessibilityState={{disabled}}
    activeOpacity={0.74}
    disabled={disabled}
    onPress={onPress}
    style={[sheetStyles.actionRow, disabled && styles.actionRowDisabled]}>
    <View style={[sheetStyles.actionIconContainer, sheetStyles.actionIcon]}>
      <IconComponent size={24} color={theme.colors.textPrimary} />
    </View>
    <View style={styles.actionCopy}>
      <Text style={styles.actionLabel}>{label}</Text>
      {description ? (
        <Text style={styles.actionDescription}>{description}</Text>
      ) : null}
    </View>
    <MaterialCommunityIcons
      name="chevron-right"
      size={22}
      color={theme.colors.textSubtle}
    />
  </TouchableOpacity>
);

const createStyles = theme =>
  StyleSheet.create({
    actionRowDisabled: {
      opacity: 0.48,
    },
    actionCopy: {
      minWidth: 0,
      flex: 1,
      paddingRight: 12,
    },
    actionLabel: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      ...fontStyle('semiBold'),
    },
    actionDescription: {
      marginTop: 2,
      color: theme.colors.textSubtle,
      fontSize: 12,
      lineHeight: 17,
      ...fontStyle('regular'),
    },
  });

export default OtherOptionsSheet;
