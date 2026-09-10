import {primitives} from 'verusid-ts-client';
import VrpcProvider from '../../../../vrpc/vrpcInterface';
import {requestPrivKey} from '../../../../auth/authBox';
import {VRPC} from '../../../../constants/intervalConstants';

export const signGenericResponse = async (
  coinObj,
  response,
  requestContext = {},
) => {
  const genericResponse = new primitives.GenericResponse(response);
  requestContext.assertCurrent?.();
  const signer = VrpcProvider.getVerusIdInterface(coinObj.system_id);
  const [height, identityResult] = await Promise.all([
    signer.getCurrentHeight(),
    signer.interface.getIdentity(
      genericResponse.signature.identityID.toIAddress(),
    ),
  ]);
  requestContext.assertCurrent?.();
  if (
    identityResult?.error ||
    !identityResult?.result ||
    !Number.isSafeInteger(height) ||
    height < 0
  ) {
    throw new Error('Unable to load the signing identity and block height.');
  }
  const privateKey = await requestPrivKey(coinObj.id, VRPC, requestContext);
  // Supplying identity and height avoids the client's internal RPC awaits.
  // After this guard its path to the cryptographic signature is synchronous.
  requestContext.assertCurrent?.();

  return signer.signGenericResponse(
    genericResponse,
    privateKey,
    identityResult.result,
    height,
  );
};
