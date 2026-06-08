import React, {useMemo, useRef} from 'react';
import {TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-paper';
import {FileClock, KeyRound, ShieldCheck} from 'lucide-react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BottomSheetModal from '../../../components/BottomSheetModal';
import {createSignedOutSheetStyles} from '../../../styles';
import {useOnboardingTheme} from '../../../theme/onboarding';

const OTHER_ACTIONS = [
  {
    label: 'Recover profile seed',
    IconComponent: KeyRound,
    actionKey: 'onRecoverProfileSeed',
  },
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
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSignedOutSheetStyles(theme), [theme]);
  const pendingActionRef = useRef(null);
  const actionHandlers = {
    onRecoverProfileSeed,
    onRevokeRecoverVerusId,
    onProvisioningRequests,
  };

  const handleAction = action => {
    pendingActionRef.current = typeof action === 'function' ? action : null;
    onClose();
  };

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
      <View style={[styles.body, styles.bodyShort]}>
        {OTHER_ACTIONS.map(({label, IconComponent, actionKey}) => (
          <OtherActionRow
            key={label}
            label={label}
            IconComponent={IconComponent}
            styles={styles}
            theme={theme}
            onPress={() => handleAction(actionHandlers[actionKey])}
          />
        ))}
      </View>
    </BottomSheetModal>
  );
};

const OtherActionRow = ({label, IconComponent, styles, theme, onPress}) => (
  <TouchableOpacity
    accessibilityRole="button"
    activeOpacity={0.74}
    onPress={onPress}
    style={styles.actionRow}>
    <View style={[styles.actionIconContainer, styles.actionIcon]}>
      <IconComponent size={24} color={theme.colors.textPrimary} />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
    <MaterialCommunityIcons
      name="chevron-right"
      size={22}
      color={theme.colors.textSubtle}
    />
  </TouchableOpacity>
);

export default OtherOptionsSheet;
