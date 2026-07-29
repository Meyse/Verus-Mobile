import axios from 'axios';
import base64url from 'base64url';
import {Linking} from 'react-native';
import {URL} from 'react-native-url-polyfill';
import {
  GENERIC_RESPONSE_DEEPLINK_VDXF_KEY,
  GenericRequest,
  GenericResponse,
  ResponseURI,
  VERUS_MOBILE_GENERIC_REQUEST_HANDLER_ID,
} from 'verus-typescript-primitives';
import {CoinDirectory} from '../CoinData/CoinDirectory';
import {getSystemNameFromSystemId} from '../CoinData/CoinData';
import {signGenericResponse} from '../api/channels/vrpc/callCreators';
import {verifyGenericResponse} from '../api/channels/vrpc/requests/verifyGenericResponse';
import {encryptGenericResponseDetails} from './genericResponse/encryptGenericResponseDetails';
import {prepareGenericResponseForSigning} from './genericResponse/prepareGenericResponseForSigning';
import {
  assertNoPlaintextExtendedSpendingKey,
  assertSecurePostResponseUri,
} from './genericResponse/responseDeliverySecurity';

export const GENERIC_REQUEST_DELIVERY_TYPES = {
  NONE: 'none',
  POST: 'post',
  REDIRECT: 'redirect',
};

export const isPostUri = uri => {
  if (uri == null || uri.type == null) return false;
  if (uri.type.eq) return uri.type.eq(ResponseURI.TYPE_POST);
  return Number(uri.type) === ResponseURI.TYPE_POST.toNumber();
};

export const isRedirectUri = uri => {
  if (uri == null || uri.type == null) return false;
  if (uri.type.eq) return uri.type.eq(ResponseURI.TYPE_REDIRECT);
  return Number(uri.type) === ResponseURI.TYPE_REDIRECT.toNumber();
};

export const getResponseUri = responseUris => {
  if (responseUris == null || responseUris.length === 0) return null;

  const postUri = responseUris.find(uri => isPostUri(uri));
  if (postUri) return postUri;

  const redirectUri = responseUris.find(uri => isRedirectUri(uri));
  return redirectUri || null;
};

export const getUriDestinationHost = uriString => {
  if (!uriString) return null;

  try {
    const url = new URL(uriString);
    return `${url.protocol}//${url.host}`;
  } catch (e) {
    return uriString;
  }
};

export const getGenericRequestDeliveryInfo = request => {
  const responseUri = getResponseUri(request?.responseURIs || []);

  if (responseUri == null) {
    return {
      type: GENERIC_REQUEST_DELIVERY_TYPES.NONE,
      responseUri: null,
      uriString: null,
      destinationHost: null,
    };
  }

  const uriString = responseUri.getUriString();
  const destinationHost = getUriDestinationHost(uriString);

  return {
    type: isPostUri(responseUri)
      ? GENERIC_REQUEST_DELIVERY_TYPES.POST
      : GENERIC_REQUEST_DELIVERY_TYPES.REDIRECT,
    responseUri,
    uriString,
    destinationHost,
  };
};

export const parseGenericRequestBuffer = requestBufferString => {
  if (!requestBufferString) return null;

  const request = new GenericRequest();
  request.fromBuffer(Buffer.from(requestBufferString, 'hex'), 0);
  return request;
};

export const parseGenericResponseBuffer = responseBufferString => {
  if (!responseBufferString) return null;

  const response = new GenericResponse();
  response.fromBuffer(Buffer.from(responseBufferString, 'hex'), 0);
  return response;
};

export const signAndVerifyGenericResponse = async (request, response) => {
  await encryptGenericResponseDetails({request, response});
  prepareGenericResponseForSigning({
    request,
    response,
    handledBy: VERUS_MOBILE_GENERIC_REQUEST_HANDLER_ID,
  });

  if (response.signature == null) {
    return null;
  }

  const signerSystemID = response.signature.systemID.toIAddress();
  const signerSystemName = getSystemNameFromSystemId(signerSystemID);
  const coinObj = CoinDirectory.getBasicCoinObj(signerSystemName);
  const signedResponse = await signGenericResponse(coinObj, response);
  const verification = await verifyGenericResponse(coinObj, signedResponse);

  if (!verification) {
    throw new Error(
      'Response failed verification, ensure the identity you selected is still under your control.',
    );
  }

  return signedResponse;
};

export const deliverGenericResponse = async (request, signedResponse) => {
  const deliveryInfo = getGenericRequestDeliveryInfo(request);

  if (
    deliveryInfo.type === GENERIC_REQUEST_DELIVERY_TYPES.NONE ||
    signedResponse == null
  ) {
    return {
      ...deliveryInfo,
      signedResponse,
    };
  }

  assertNoPlaintextExtendedSpendingKey(signedResponse);

  if (deliveryInfo.type === GENERIC_REQUEST_DELIVERY_TYPES.POST) {
    const responseBuffer = signedResponse.toBuffer();
    const secureResponseUri = assertSecurePostResponseUri(
      deliveryInfo.uriString,
    );

    try {
      const postResult = await axios.post(
        secureResponseUri,
        responseBuffer,
        {
          headers: {'Content-Type': 'application/octet-stream'},
        },
      );

      return {
        ...deliveryInfo,
        postResult,
        signedResponse,
      };
    } catch (error) {
      const status = error?.response?.status;
      const statusSuffix = status != null ? ` (HTTP ${status})` : '';
      const postError = new Error(
        `Failed to send the response to the requester${statusSuffix}.`,
      );

      postError.isResponsePostError = true;
      postError.deliveryInfo = deliveryInfo;
      postError.postStatus = status;
      postError.cause = error;
      throw postError;
    }
  }

  const url = new URL(deliveryInfo.uriString);
  url.searchParams.set(
    GENERIC_RESPONSE_DEEPLINK_VDXF_KEY.vdxfid,
    base64url(signedResponse.toBuffer()),
  );

  const redirectUrl = url.toString();

  try {
    await Linking.openURL(redirectUrl);
  } catch (error) {
    const redirectError = new Error(
      error?.message || 'Failed to open the requester redirect.',
    );

    redirectError.isResponseRedirectError = true;
    redirectError.deliveryInfo = deliveryInfo;
    redirectError.cause = error;
    throw redirectError;
  }

  return {
    ...deliveryInfo,
    redirectUrl,
    signedResponse,
  };
};

export const completeGenericResponseDelivery = async ({
  requestBufferString,
  responseBufferString,
}) => {
  const request = parseGenericRequestBuffer(requestBufferString);
  const response = parseGenericResponseBuffer(responseBufferString);

  if (request == null || response == null) {
    return {
      type: GENERIC_REQUEST_DELIVERY_TYPES.NONE,
      responseUri: null,
      uriString: null,
      destinationHost: null,
      signedResponse: null,
    };
  }

  const signedResponse = await signAndVerifyGenericResponse(request, response);
  return deliverGenericResponse(request, signedResponse);
};
