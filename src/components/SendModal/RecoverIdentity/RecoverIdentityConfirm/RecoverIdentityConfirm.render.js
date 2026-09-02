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

const getFriendlyAddress = (address, friendlyNames) => {
  if (!address) return null;

  const friendly = friendlyNames?.[address];

  if (typeof friendly === 'string') {
    return convertFqnToDisplayFormat(friendly);
  }

  if (friendly?.fullyqualifiedname) {
    return convertFqnToDisplayFormat(friendly.fullyqualifiedname);
  }

  return address;
};

export const RecoverIdentityConfirmRender = ({
  acknowledged,
  friendlyNames,
  goBack,
  loading,
  networkName,
  onAcknowledgedChange,
  primaryAddr,
  privateAddr,
  recoveryAddr,
  recoveryId,
  revocationAddr,
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
        headerTitle="Recover VerusID"
        keyboardAvoiding={false}
        onBack={goBack}
        progress={0.88}>
        <RevokeRecoverLoadingState
          body="Keep Verus Mobile open while the signed transaction is submitted to the network."
          title="Submitting recovery"
        />
      </RevokeRecoverFlowScaffold>
    );
  }

  return (
    <RevokeRecoverFlowScaffold
      actions={
        <>
          <RevokeRecoverAcknowledgement
            label="I checked the new primary address and every authority change."
            onValueChange={onAcknowledgedChange}
            value={acknowledged}
          />
          <AppButton
            buttonColor={theme.colors.danger}
            disabled={!acknowledged}
            onPress={submitData}
            testID="revokeRecover.submit">
            Submit recovery
          </AppButton>
        </>
      }
      headerTitle="Recover VerusID"
      onBack={goBack}
      progress={0.85}>
      <RevokeRecoverStepCopy
        body="Confirm the restored identity and every address change before signing."
        title="Review recovery"
      />

      <RevokeRecoverNotice tone="danger">
        Recovery restores control of this VerusID on {networkName}. A wrong
        primary address or authority can hand control to someone else.
      </RevokeRecoverNotice>

      <RevokeRecoverReviewGroup title="On-chain change">
        <RevokeRecoverReviewRow
          label="VerusID"
          multiline
          value={getIdentityName(targetId)}
        />
        <RevokeRecoverReviewRow label="Blockchain" value={networkName} />
        <RevokeRecoverReviewRow label="Current status" value="Revoked" />
        <RevokeRecoverReviewRow label="New status" value="Active" />
        <RevokeRecoverReviewRow
          label="Signing recovery authority"
          multiline
          value={getIdentityName(recoveryId)}
        />
        <RevokeRecoverReviewRow
          label="New primary address"
          technical={!!primaryAddr}
          value={primaryAddr || 'Unchanged'}
        />
        <RevokeRecoverReviewRow
          label="New recovery authority"
          multiline
          technical={!!recoveryAddr && recoveryAddr.startsWith('i')}
          value={getFriendlyAddress(recoveryAddr, friendlyNames) || 'Unchanged'}
        />
        <RevokeRecoverReviewRow
          label="New revocation authority"
          multiline
          technical={!!revocationAddr && revocationAddr.startsWith('i')}
          value={
            getFriendlyAddress(revocationAddr, friendlyNames) || 'Unchanged'
          }
        />
        <RevokeRecoverReviewRow
          label="New private address"
          technical={!!privateAddr}
          value={privateAddr || 'Unchanged'}
        />
      </RevokeRecoverReviewGroup>

      {submitError ? (
        <RevokeRecoverNotice tone="danger">{submitError}</RevokeRecoverNotice>
      ) : null}
    </RevokeRecoverFlowScaffold>
  );
};
