import React from 'react';
import AppButton from '../../../AppButton';
import RevokeRecoverFlowScaffold, {
  RevokeRecoverStepCopy,
} from '../../../../containers/RevokeRecover/RevokeRecoverFlowScaffold';
import {
  RevokeRecoverAcknowledgement,
  RevokeRecoverLoadingState,
  RevokeRecoverNotice,
  RevokeRecoverReviewGroup,
  RevokeRecoverReviewRow,
} from '../../../../containers/RevokeRecover/RevokeRecoverFlowParts';
import {useAppTheme} from '../../../../theme/app';
import {convertFqnToDisplayFormat} from '../../../../utils/fullyqualifiedname';

const getIdentityName = identityResult =>
  identityResult?.fullyqualifiedname
    ? convertFqnToDisplayFormat(identityResult.fullyqualifiedname)
    : identityResult?.identity?.identityaddress;

export const RevokeIdentityConfirmRender = ({
  acknowledged,
  goBack,
  loading,
  networkName,
  onAcknowledgedChange,
  revocationId,
  submitData,
  submitError,
  targetId,
}) => {
  const theme = useAppTheme();

  if (loading) {
    return (
      <RevokeRecoverFlowScaffold
        backDisabled
        contentContainerStyle={{flexGrow: 1}}
        headerTitle="Revoke VerusID"
        keyboardAvoiding={false}
        onBack={goBack}
        progress={0.88}>
        <RevokeRecoverLoadingState
          body="Keep Verus Mobile open while the signed transaction is submitted to the network."
          title="Submitting revocation"
        />
      </RevokeRecoverFlowScaffold>
    );
  }

  return (
    <RevokeRecoverFlowScaffold
      actions={
        <AppButton
          buttonColor={theme.colors.danger}
          disabled={!acknowledged}
          onPress={submitData}
          testID="revokeRecover.submit">
          Submit revocation
        </AppButton>
      }
      headerTitle="Revoke VerusID"
      onBack={goBack}
      progress={0.85}>
      <RevokeRecoverStepCopy
        body="Confirm the identity, blockchain, and authority before signing."
        title="Review revocation"
      />

      <RevokeRecoverNotice tone="danger">
        This disables the VerusID on {networkName}. It cannot be used again
        until its recovery authority submits a successful recovery.
      </RevokeRecoverNotice>

      <RevokeRecoverReviewGroup title="On-chain change">
        <RevokeRecoverReviewRow
          label="VerusID"
          value={getIdentityName(targetId)}
        />
        <RevokeRecoverReviewRow label="Blockchain" value={networkName} />
        <RevokeRecoverReviewRow label="Current status" value="Active" />
        <RevokeRecoverReviewRow label="New status" value="Revoked" />
        <RevokeRecoverReviewRow
          label="Revocation authority"
          value={getIdentityName(revocationId)}
        />
        <RevokeRecoverReviewRow
          label="Identity address"
          technical
          value={targetId?.identity?.identityaddress}
        />
      </RevokeRecoverReviewGroup>

      {submitError ? (
        <RevokeRecoverNotice tone="danger">{submitError}</RevokeRecoverNotice>
      ) : null}

      <RevokeRecoverAcknowledgement
        label="I understand this VerusID will be disabled until it is recovered."
        onValueChange={onAcknowledgedChange}
        value={acknowledged}
      />
    </RevokeRecoverFlowScaffold>
  );
};
