import React, {useRef} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppButton from '../../../components/AppButton';
import BottomSheetModal from '../../../components/BottomSheetModal';
import {fontStyle} from '../../../globals/fonts';

const StartSomethingNewSheet = ({
  visible,
  onClose,
  onCreateWallet,
  onInitializeFromNfc,
  onRecoverProfileSeed,
  onRevokeRecoverVerusId,
  onProvisioningRequests,
}) => {
  const pendingActionRef = useRef(null);

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
      <View style={styles.body}>
        <AppButton
          onPress={() => handleAction(onCreateWallet)}
          variant="primary"
          height={52}
          labelStyle={styles.primaryButtonText}>
          {'Create new wallet'}
        </AppButton>

        <View style={styles.quietList}>
          <QuietActionRow
            label="Initialize from NFC"
            onPress={() => handleAction(onInitializeFromNfc)}
          />
          <QuietActionRow
            label="Recover profile seed"
            onPress={() => handleAction(onRecoverProfileSeed)}
          />
          <QuietActionRow
            label="Revoke or recover VerusID"
            onPress={() => handleAction(onRevokeRecoverVerusId)}
          />
          <QuietActionRow
            label="Provisioning requests"
            onPress={() => handleAction(onProvisioningRequests)}
            isLast
          />
        </View>
      </View>
    </BottomSheetModal>
  );
};

const QuietActionRow = ({label, onPress, isLast}) => (
  <TouchableOpacity
    accessibilityRole="button"
    activeOpacity={0.74}
    onPress={onPress}
    style={[styles.quietRow, isLast && styles.quietRowLast]}>
    <Text style={styles.quietRowText}>{label}</Text>
    <MaterialCommunityIcons name="chevron-right" size={22} color="#CCCCCC" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 22,
  },
  primaryButtonText: {
    fontSize: 16,
  },
  quietList: {
    marginTop: 24,
  },
  quietRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  quietRowLast: {
    borderBottomWidth: 0,
  },
  quietRowText: {
    flex: 1,
    paddingRight: 12,
    color: '#1A1A1A',
    fontSize: 14,
    ...fontStyle('semiBold'),
  },
});

export default StartSomethingNewSheet;
