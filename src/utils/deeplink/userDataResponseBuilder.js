/*
 * Builds GenericResponse data details for generic user-data requests from
 * matched stored attestations and ensures the response can be signed by a
 * single compatible identity.
 */
import { BN } from 'bn.js';
import {
  CompactAddressObject,
  DataDescriptor,
  DataResponseDetails,
  DataResponseOrdinalVDXFObject,
  GenericResponse,
  VerifiableSignatureData,
} from 'verus-typescript-primitives';
import { getIdentity } from '../api/channels/verusid/callCreators';
import { createAttestationResponseBuffer } from '../attestations/createAttestationResponse';

const resolveRecipientIdentity = async (record, resolveIdentity) => {
  let recipientIAddress = record?.raw?.recipientId;
  const systemID = record?.attestationDetails?.signatureData?.system_ID;

  if (!recipientIAddress || !systemID) {
    throw new Error(
      'Attestation is missing recipient identity or system information. Cannot sign the response.',
    );
  }

  if (!recipientIAddress.startsWith('i')) {
    const idResult = await resolveIdentity(systemID, recipientIAddress);

    if (idResult.error || !idResult.result?.identity?.identityaddress) {
      throw new Error(
        `Could not resolve recipient identity "${recipientIAddress}" to an i-address.`,
      );
    }

    recipientIAddress = idResult.result.identity.identityaddress;
  }

  return { recipientIAddress, systemID };
};

const ensureResponseSignatureTemplate = async (records, response, resolveIdentity) => {
  let templateIdentity = null;

  for (const record of records) {
    const resolvedIdentity = await resolveRecipientIdentity(record, resolveIdentity);

    if (templateIdentity == null) {
      templateIdentity = resolvedIdentity;
      continue;
    }

    if (
      templateIdentity.systemID !== resolvedIdentity.systemID ||
      templateIdentity.recipientIAddress !== resolvedIdentity.recipientIAddress
    ) {
      throw new Error(
        'Matched records require different response identities. Narrow the request before continuing.',
      );
    }
  }

  if (templateIdentity == null) {
    throw new Error('No matched records were available to build a response.');
  }

  if (response.signature != null) {
    const existingSystemID = response.signature.systemID?.toIAddress?.();
    const existingIdentityID = response.signature.identityID?.toIAddress?.();

    if (
      existingSystemID !== templateIdentity.systemID ||
      existingIdentityID !== templateIdentity.recipientIAddress
    ) {
      throw new Error(
        'This request requires responding as a different identity than the current response template.',
      );
    }

    return response;
  }

  response.signature = new VerifiableSignatureData({
    systemID: CompactAddressObject.fromIAddress(templateIdentity.systemID),
    identityID: CompactAddressObject.fromIAddress(templateIdentity.recipientIAddress),
  });
  response.setSigned();

  return response;
};

export const buildUserDataResponse = async ({
  matchingRecords,
  response,
  requestedKeys,
  requestID,
  resolveIdentity = getIdentity,
}) => {
  if (!Array.isArray(matchingRecords) || matchingRecords.length === 0) {
    throw new Error('No matched records were available to build a response.');
  }

  const responseOrdinals = matchingRecords.map((record) => {
    if (!record?.raw?.data) {
      throw new Error('Selected record is missing raw data.');
    }

    const responseBuffer = createAttestationResponseBuffer(
      record.raw.data,
      Array.isArray(requestedKeys) && requestedKeys.length > 0 ? requestedKeys : null,
    );

    const dataDescriptor = new DataDescriptor({
      version: new BN(1),
      objectdata: responseBuffer,
    });

    const responseDetails = new DataResponseDetails({
      data: dataDescriptor,
      requestID,
    });

    return new DataResponseOrdinalVDXFObject({
      data: responseDetails,
    });
  });

  const baseResponse = response || new GenericResponse();
  baseResponse.details = [...(baseResponse.details || []), ...responseOrdinals];

  if (baseResponse.details.length > 1 && typeof baseResponse.setHasMultiDetails === 'function') {
    baseResponse.setHasMultiDetails();
  }

  return ensureResponseSignatureTemplate(matchingRecords, baseResponse, resolveIdentity);
};

