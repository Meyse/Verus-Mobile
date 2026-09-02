import React from 'react';
import AppButton from '../../../AppButton';
import RevokeRecoverFlowScaffold, {
  RevokeRecoverStepCopy,
} from '../../../../containers/RevokeRecover/RevokeRecoverFlowScaffold';
import RevokeRecoverIdentityPickerSheet, {
  RevokeRecoverIdentityField,
} from '../../../../containers/RevokeRecover/RevokeRecoverIdentityPickerSheet';
import {
  RevokeRecoverLoadingState,
  RevokeRecoverNotice,
} from '../../../../containers/RevokeRecover/RevokeRecoverFlowParts';

export const RevokeIdentityFormRender = ({
  chooseCandidate,
  chooseManualEntry,
  formError,
  formDataValue,
  identityDiscovery,
  identitySheetVisible,
  loading,
  manualEntry,
  networkName,
  onBack,
  onCloseIdentitySheet,
  onOpenIdentitySheet,
  selectedCandidate,
  submitData,
  updateIdentity,
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
        <AppButton
          disabled={!formDataValue?.trim()}
          onPress={submitData}
          testID="revokeRecover.identity.review">
          Review revocation
        </AppButton>
      }
      headerTitle="Revoke VerusID"
      onBack={onBack}
      overlay={
        <RevokeRecoverIdentityPickerSheet
          candidates={identityDiscovery.candidates}
          isRecovery={false}
          onClose={onCloseIdentitySheet}
          onManualEntry={chooseManualEntry}
          onRetry={identityDiscovery.retry}
          onSelect={chooseCandidate}
          selectedIdentityAddress={selectedCandidate?.identityAddress}
          status={identityDiscovery.status}
          visible={identitySheetVisible}
        />
      }
      overlayVisible={identitySheetVisible}
      progress={0.68}>
      <RevokeRecoverStepCopy
        body={`Enter the active identity on ${networkName}. Its revocation authority must match the key you imported.`}
        title="Choose the VerusID"
      />

      <RevokeRecoverIdentityField
        candidateCount={identityDiscovery.candidates.length}
        discoveryStatus={identityDiscovery.status}
        errorText={formError}
        isRecovery={false}
        manualEntry={manualEntry}
        onChangeText={updateIdentity}
        onChoose={onOpenIdentitySheet}
        onRetry={identityDiscovery.retry}
        onSubmitEditing={submitData}
        selectedCandidate={selectedCandidate}
        value={formDataValue || ''}
      />

      <RevokeRecoverNotice tone="danger">
        Revocation disables the identity until its recovery authority restores
        it. Review the exact identity and status change before submitting.
      </RevokeRecoverNotice>
    </RevokeRecoverFlowScaffold>
  );
};
