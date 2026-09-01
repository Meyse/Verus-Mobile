import React from 'react';
import AppButton from '../../../AppButton';
import AppTextInput from '../../../AppTextInput';
import RevokeRecoverFlowScaffold, {
  RevokeRecoverStepCopy,
} from '../../../../containers/RevokeRecover/RevokeRecoverFlowScaffold';
import {
  RevokeRecoverLoadingState,
  RevokeRecoverNotice,
} from '../../../../containers/RevokeRecover/RevokeRecoverFlowParts';
import {SEND_MODAL_IDENTITY_TO_REVOKE_FIELD} from '../../../../utils/constants/sendModal';

export const RevokeIdentityFormRender = ({
  formError,
  formDataValue,
  loading,
  networkName,
  onBack,
  submitData,
  updateSendFormData,
}) => {
  if (loading) {
    return (
      <RevokeRecoverFlowScaffold
        backDisabled
        contentContainerStyle={{flexGrow: 1}}
        headerTitle="Revoke VerusID"
        keyboardAvoiding={false}
        onBack={onBack}
        progress={0.68}>
        <RevokeRecoverLoadingState
          body="Verifying the identity, its revocation authority, and the imported signing key."
          title="Checking the VerusID"
        />
      </RevokeRecoverFlowScaffold>
    );
  }

  return (
    <RevokeRecoverFlowScaffold
      actions={
        <AppButton onPress={submitData} testID="revokeRecover.identity.review">
          Review revocation
        </AppButton>
      }
      headerTitle="Revoke VerusID"
      onBack={onBack}
      progress={0.68}>
      <RevokeRecoverStepCopy
        body={`Enter the active identity on ${networkName}. Its revocation authority must match the key you imported.`}
        title="Choose the VerusID"
      />

      <AppTextInput
        autoCapitalize="none"
        autoCorrect={false}
        errorText={formError}
        label="VerusID name or i-address"
        onChangeText={text =>
          updateSendFormData(SEND_MODAL_IDENTITY_TO_REVOKE_FIELD, text)
        }
        onSubmitEditing={submitData}
        placeholder="name@ or i..."
        returnKeyType="done"
        testID="revokeRecover.identity.input"
        value={formDataValue || ''}
      />

      <RevokeRecoverNotice tone="danger">
        Revocation disables the identity until its recovery authority restores
        it. Review the exact identity and status change before submitting.
      </RevokeRecoverNotice>
    </RevokeRecoverFlowScaffold>
  );
};
