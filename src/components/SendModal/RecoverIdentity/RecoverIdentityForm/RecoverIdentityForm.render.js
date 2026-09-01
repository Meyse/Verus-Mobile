import React from 'react';
import {Text, View} from 'react-native';
import {Switch} from 'react-native-paper';
import AppButton from '../../../AppButton';
import AppTextInput from '../../../AppTextInput';
import BarcodeReader from '../../../BarcodeReader/BarcodeReader';
import RevokeRecoverFlowScaffold, {
  RevokeRecoverStepCopy,
} from '../../../../containers/RevokeRecover/RevokeRecoverFlowScaffold';
import {
  RevokeRecoverLoadingState,
  RevokeRecoverNotice,
} from '../../../../containers/RevokeRecover/RevokeRecoverFlowParts';
import {revokeRecoverFlowStyles as styles} from '../../../../styles';
import {useAppTheme} from '../../../../theme/app';
import {
  SEND_MODAL_IDENTITY_TO_RECOVER_FIELD,
  SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD,
  SEND_MODAL_NEW_RECOVERY_IDENTITY_FIELD,
  SEND_MODAL_NEW_REVOCATION_IDENTITY_FIELD,
  SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD,
  SEND_MODAL_RECOVERY_CHANGE_PRIVATE_ADDRESS,
  SEND_MODAL_RECOVERY_CHANGE_REVOCATION_RECOVERY,
} from '../../../../utils/constants/sendModal';

export const RecoverIdentityFormRender = ({
  formError,
  handleScan,
  loading,
  networkName,
  onBack,
  scannerOpen,
  sendModalData,
  submitData,
  toggleEditRevocationRecovery,
  toggleEditZAddr,
  toggleScanner,
  updateSendFormData,
}) => {
  const theme = useAppTheme();

  if (scannerOpen) {
    return (
      <View style={styles.scannerRoot}>
        <BarcodeReader
          button={() => (
            <AppButton
              onPress={toggleScanner}
              style={styles.scannerAction}
              variant="secondary">
              Cancel scan
            </AppButton>
          )}
          onScan={codes => handleScan(codes)}
          prompt="Scan a Verus address"
        />
      </View>
    );
  }

  if (loading) {
    return (
      <RevokeRecoverFlowScaffold
        backDisabled
        contentContainerStyle={{flexGrow: 1}}
        headerTitle="Recover VerusID"
        keyboardAvoiding={false}
        onBack={onBack}
        progress={0.68}>
        <RevokeRecoverLoadingState
          body="Verifying the revoked identity, its recovery authority, the new addresses, and the imported signing key."
          title="Checking the recovery"
        />
      </RevokeRecoverFlowScaffold>
    );
  }

  const changeAuthorities =
    sendModalData[SEND_MODAL_RECOVERY_CHANGE_REVOCATION_RECOVERY] === true;
  const changePrivateAddress =
    sendModalData[SEND_MODAL_RECOVERY_CHANGE_PRIVATE_ADDRESS] === true;

  return (
    <RevokeRecoverFlowScaffold
      actions={
        <AppButton onPress={submitData} testID="revokeRecover.identity.review">
          Review recovery
        </AppButton>
      }
      headerTitle="Recover VerusID"
      onBack={onBack}
      progress={0.68}>
      <RevokeRecoverStepCopy
        body={`Enter the revoked identity on ${networkName}, then choose the addresses it should use after recovery.`}
        title="Set the recovered identity"
      />

      <View style={styles.fieldGroup}>
        <AppTextInput
          errorText={formError}
          label="VerusID name or i-address"
          onChangeText={text =>
            updateSendFormData(SEND_MODAL_IDENTITY_TO_RECOVER_FIELD, text)
          }
          placeholder="name@ or i..."
          returnKeyType="next"
          testID="revokeRecover.identity.input"
          value={sendModalData[SEND_MODAL_IDENTITY_TO_RECOVER_FIELD] || ''}
        />
        <AppTextInput
          helperText="Leave empty only if the existing primary address should remain."
          label="New primary R-address"
          onChangeText={text =>
            updateSendFormData(SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD, text)
          }
          onRightPress={() =>
            toggleScanner(SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD)
          }
          placeholder="R..."
          returnKeyType="done"
          rightAccessibilityLabel="Scan new primary address"
          rightIcon="qrcode-scan"
          testID="revokeRecover.recovery.primaryAddress"
          value={sendModalData[SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD] || ''}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.colors.textPrimary}]}>
          Advanced changes
        </Text>
        <Text style={[styles.sectionBody, {color: theme.colors.textSecondary}]}>
          Keep these off unless the recovered identity needs new authorities or
          a new private address.
        </Text>

        <View style={[styles.switchRow, {borderTopColor: theme.colors.border}]}>
          <View style={styles.switchCopy}>
            <Text
              style={[styles.switchTitle, {color: theme.colors.textPrimary}]}>
              Change recovery and revocation authorities
            </Text>
            <Text
              style={[styles.switchBody, {color: theme.colors.textSecondary}]}>
              Replace the identities allowed to protect this VerusID.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Change recovery and revocation authorities"
            color={theme.colors.primary}
            onValueChange={toggleEditRevocationRecovery}
            value={changeAuthorities}
          />
        </View>

        {changeAuthorities ? (
          <View style={styles.fieldGroup}>
            <AppTextInput
              label="New recovery VerusID"
              onChangeText={text =>
                updateSendFormData(SEND_MODAL_NEW_RECOVERY_IDENTITY_FIELD, text)
              }
              placeholder="name@ or i..."
              value={
                sendModalData[SEND_MODAL_NEW_RECOVERY_IDENTITY_FIELD] || ''
              }
            />
            <AppTextInput
              label="New revocation VerusID"
              onChangeText={text =>
                updateSendFormData(
                  SEND_MODAL_NEW_REVOCATION_IDENTITY_FIELD,
                  text,
                )
              }
              placeholder="name@ or i..."
              value={
                sendModalData[SEND_MODAL_NEW_REVOCATION_IDENTITY_FIELD] || ''
              }
            />
          </View>
        ) : null}

        <View style={[styles.switchRow, {borderTopColor: theme.colors.border}]}>
          <View style={styles.switchCopy}>
            <Text
              style={[styles.switchTitle, {color: theme.colors.textPrimary}]}>
              Change private address
            </Text>
            <Text
              style={[styles.switchBody, {color: theme.colors.textSecondary}]}>
              Replace the identity’s private z-address metadata.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Change private address"
            color={theme.colors.primary}
            onValueChange={toggleEditZAddr}
            value={changePrivateAddress}
          />
        </View>

        {changePrivateAddress ? (
          <AppTextInput
            label="New private z-address"
            onChangeText={text =>
              updateSendFormData(
                SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD,
                text,
              )
            }
            onRightPress={() =>
              toggleScanner(SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD)
            }
            placeholder="zs..."
            rightAccessibilityLabel="Scan new private address"
            rightIcon="qrcode-scan"
            value={
              sendModalData[SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD] || ''
            }
          />
        ) : null}
      </View>

      <RevokeRecoverNotice>
        Recovery changes identity control. Check the new primary address and any
        advanced changes carefully before submitting.
      </RevokeRecoverNotice>
    </RevokeRecoverFlowScaffold>
  );
};
