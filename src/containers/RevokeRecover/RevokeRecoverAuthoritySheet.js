import React, {useMemo, useRef} from 'react';
import {ScrollView, Text} from 'react-native';
import {
  ArrowDownToLine,
  KeyRound,
  QrCode,
  SmartphoneNfc,
} from 'lucide-react-native';
import BottomSheetModal from '../../components/BottomSheetModal';
import SignedOutActionRow from '../../components/SignedOutActionRow';
import {createSignedOutSheetStyles} from '../../styles';
import {useOnboardingTheme} from '../../theme/onboarding';
import {IMPORT_METHODS} from '../Onboard/onboardingSetupFlow';

const AUTHORITY_IMPORT_ACTIONS = [
  {
    label: 'Import Secret Recovery Phrase',
    IconComponent: ArrowDownToLine,
    method: IMPORT_METHODS.SEED,
    testID: 'revokeRecover.authority.importSeed',
  },
  {
    label: 'Scan QR code',
    IconComponent: QrCode,
    method: IMPORT_METHODS.QR,
    testID: 'revokeRecover.authority.importQr',
  },
  {
    label: 'Restore from NFC backup',
    IconComponent: SmartphoneNfc,
    method: IMPORT_METHODS.NFC,
    testID: 'revokeRecover.authority.importNfc',
  },
  {
    label: 'Enter custom seed or private key',
    IconComponent: KeyRound,
    method: IMPORT_METHODS.TEXT,
    testID: 'revokeRecover.authority.importText',
  },
];

const RevokeRecoverAuthoritySheet = ({
  visible,
  isRecovery,
  onClose,
  onSelectMethod,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSignedOutSheetStyles(theme), [theme]);
  const pendingMethodRef = useRef(null);

  const selectMethod = method => {
    pendingMethodRef.current = method;
    onClose();
  };

  const handleClosed = () => {
    const pendingMethod = pendingMethodRef.current;
    pendingMethodRef.current = null;

    if (pendingMethod != null) {
      onSelectMethod(pendingMethod);
    }
  };

  return (
    <BottomSheetModal
      maxHeight="78%"
      onClose={onClose}
      onClosed={handleClosed}
      visible={visible}>
      <ScrollView
        style={{flexShrink: 1}}
        contentContainerStyle={[styles.body, styles.bodyShort]}>
        <Text accessibilityRole="header" style={styles.title}>
          {isRecovery
            ? 'Import recovery authority'
            : 'Import revocation authority'}
        </Text>
        <Text
          style={[
            theme.typography.caption,
            {color: theme.colors.textSecondary, marginBottom: 16},
          ]}>
          Choose how to import the authority’s secret or private key.
        </Text>
        {AUTHORITY_IMPORT_ACTIONS.map(action => (
          <SignedOutActionRow
            key={action.method}
            IconComponent={action.IconComponent}
            label={action.label}
            onPress={() => selectMethod(action.method)}
            testID={action.testID}
          />
        ))}
        <Text
          style={[
            theme.typography.caption,
            {color: theme.colors.textSecondary, marginTop: 16},
          ]}>
          Your key stays on this device and only signs this action.
        </Text>
      </ScrollView>
    </BottomSheetModal>
  );
};

export default RevokeRecoverAuthoritySheet;
