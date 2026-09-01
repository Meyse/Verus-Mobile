import React, {useMemo, useRef} from 'react';
import {View} from 'react-native';
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
      <View style={[styles.body, styles.bodyShort]}>
        {AUTHORITY_IMPORT_ACTIONS.map(action => (
          <SignedOutActionRow
            key={action.method}
            IconComponent={action.IconComponent}
            label={action.label}
            onPress={() => selectMethod(action.method)}
            testID={action.testID}
          />
        ))}
      </View>
    </BottomSheetModal>
  );
};

export default RevokeRecoverAuthoritySheet;
