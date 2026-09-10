import React, {useMemo, useRef, useState, useEffect} from 'react';
import {GenericResponse} from 'verus-typescript-primitives';
import {OnboardingThemeProvider} from '../../../theme/onboarding';
import {buildDataPacketResponse} from '../../../utils/deeplink/dataPacket/signDataPacket';
import {ensureGenericResponseSigner} from '../../../utils/deeplink/genericResponse/ensureGenericResponseSigner';
import {createRequestSessionGuard} from '../../../utils/deeplink/requestSessionGuard';
import {assertAuthenticationRequestsNotExpired} from '../../../utils/deeplink/validator/authenticationRequestValidator';
import useDataRequestIdentity from '../components/RequestReview/useDataRequestIdentity';
import useDataReviewConsent from '../components/RequestReview/useDataReviewConsent';
import DataRequestReview, {
  DataReviewItem,
  DataReviewNotice,
  DataReviewValue,
} from '../components/RequestReview/DataRequestReview';

const readableValue = item => {
  const json =
    item.descriptorVersion != null ? item.objectDataJson : item.signedJson;
  if (json != null) {
    try {
      return JSON.parse(json);
    } catch (_) {}
  }
  return item.descriptorVersion != null ? item.objectDataText : item.signedText;
};

const packetDetails = item => [
  {
    label: 'SHA-256 of signed bytes',
    value: item.sha256,
    technical: true,
    copy: true,
  },
  {
    label: 'Signed bytes (hex)',
    value: item.signedBytesHex,
    technical: true,
    copy: true,
  },
  {
    label: 'Signed size',
    value: item.size != null ? `${item.size} bytes` : null,
  },
  {label: 'Descriptor version', value: item.descriptorVersion},
  {label: 'Descriptor flags', value: item.descriptorFlags},
  {label: 'Descriptor label', value: item.descriptorLabel},
  {label: 'MIME type', value: item.descriptorMimeType},
  {
    label: 'Object bytes (hex)',
    value: item.objectDataBytesHex,
    technical: true,
    copy: true,
  },
  {label: 'Full descriptor', value: item.descriptorJson},
];

const DataPacketRequestInfoContent = props => {
  const {
    statements = [],
    signableObjectSummaries = [],
    request,
    response,
    detailIndex,
    next,
  } = props;
  const identity = useDataRequestIdentity(props);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const inFlight = useRef(false);
  const payloadKey = JSON.stringify([statements, signableObjectSummaries]);
  const context = useMemo(
    () => ({}),
    [identity.context, identity.selectedIdentity?.iAddress, payloadKey],
  );
  const currentContext = useRef(context);
  currentContext.current = context;
  useEffect(
    () => () => {
      currentContext.current = null;
    },
    [],
  );
  const consent = useDataReviewConsent(context);
  const reviewComplete =
    signableObjectSummaries.length > 0 &&
    signableObjectSummaries.every(
      (_, index) => consent.checked[`data-${index}`],
    ) &&
    statements.every((_, index) => consent.checked[`statement-${index}`]);

  const handleContinue = async () => {
    if (
      inFlight.current ||
      !identity.walletReady ||
      !identity.selectedIdentity ||
      !reviewComplete ||
      identity.signerConflict
    )
      return;
    inFlight.current = true;
    setProcessing(true);
    setError(null);
    try {
      const updatedResponse = new GenericResponse();
      if (response?.details?.length)
        updatedResponse.fromBuffer(response.toBuffer(), 0);
      else if (response)
        Object.assign(updatedResponse, response, {details: []});
      ensureGenericResponseSigner({
        response: updatedResponse,
        systemID: identity.coinObj.system_id,
        identityID: identity.selectedIdentity.iAddress,
      });
      const sessionGuard = createRequestSessionGuard(() => {
        if (currentContext.current !== context)
          throw new Error('Review changed');
        assertAuthenticationRequestsNotExpired(request);
      }, identity.sessionScope);
      sessionGuard.assertCurrent();
      const responseDetail = await buildDataPacketResponse({
        coinObj: identity.coinObj,
        identityAddress: identity.selectedIdentity.iAddress,
        dataPacketDetail: request.getDetails(detailIndex).data,
        assertReviewCurrent: sessionGuard.assertCurrent,
        sessionScope: sessionGuard.sessionScope,
      });
      sessionGuard.assertCurrent();
      updatedResponse.details = [
        ...(updatedResponse.details || []),
        responseDetail,
      ];
      updatedResponse.setFlags();
      await next(updatedResponse, [detailIndex], {autoDeliverOnComplete: true});
    } catch (_) {
      inFlight.current = false;
      setProcessing(false);
      setError(
        'Unable to sign this data. Check your VerusID and connection, then try again.',
      );
    }
  };

  return (
    <DataRequestReview
      title="Sign data"
      description="Review each item before signing it with your VerusID."
      props={props}
      identity={identity}
      onContinue={handleContinue}
      primaryLabel="Sign data"
      disabled={!reviewComplete}
      processing={processing}
      error={error}>
      {statements.map((statement, index) => (
        <DataReviewItem
          key={`statement-${index}`}
          title={`Statement ${index + 1}`}
          consentLabel={`Sign statement ${index + 1}`}
          checked={!!consent.checked[`statement-${index}`]}
          onToggle={() => consent.toggle(`statement-${index}`)}
          disabled={processing}>
          <DataReviewValue value={statement} />
        </DataReviewItem>
      ))}
      {signableObjectSummaries.map((item, index) => {
        const value = readableValue(item);
        const title =
          item.descriptorLabel ||
          (item.type === 'Message'
            ? `Message ${index + 1}`
            : `Data item ${index + 1}`);
        return (
          <DataReviewItem
            key={`data-${index}`}
            title={title}
            details={packetDetails(item)}
            consentLabel={`Sign data item ${index + 1}`}
            checked={!!consent.checked[`data-${index}`]}
            onToggle={() => consent.toggle(`data-${index}`)}
            disabled={processing}>
            {value != null && value !== '' ? (
              <DataReviewValue value={value} />
            ) : (
              <DataReviewNotice title="Unreadable data">
                {`${
                  item.size || 0
                } bytes. Inspect the exact bytes in details. Only sign if you understand their purpose.`}
              </DataReviewNotice>
            )}
            {item.descriptorVersion != null && value != null && (
              <DataReviewNotice title="Includes descriptor metadata">
                Your signature covers this content and its descriptor. Both are
                available in details.
              </DataReviewNotice>
            )}
          </DataReviewItem>
        );
      })}
    </DataRequestReview>
  );
};

export default function DataPacketRequestInfo(props) {
  return (
    <OnboardingThemeProvider>
      <DataPacketRequestInfoContent
        key={`${props.detailIndex}:${props.detailsBufferString}`}
        {...props}
      />
    </OnboardingThemeProvider>
  );
}
