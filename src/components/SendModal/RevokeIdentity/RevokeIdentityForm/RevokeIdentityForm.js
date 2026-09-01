import {useCallback, useEffect, useState} from 'react';
import {useSelector} from 'react-redux';
import {fromBase58Check} from '@bitgo/utxo-lib/dist/src/address';
import {
  getFriendlyNameMap,
  getIdentity,
} from '../../../../utils/api/channels/verusid/callCreators';
import {ELECTRUM} from '../../../../utils/constants/intervalConstants';
import {
  SEND_MODAL_ENCRYPTED_IDENTITY_SEED,
  SEND_MODAL_FORM_STEP_CONFIRM,
  SEND_MODAL_IDENTITY_TO_REVOKE_FIELD,
  SEND_MODAL_SYSTEM_ID,
} from '../../../../utils/constants/sendModal';
import {deriveKeyPair} from '../../../../utils/keys';
import {RevokeIdentityFormRender} from './RevokeIdentityForm.render';
import {createRevokeIdentityTx} from '../../../../utils/api/channels/verusid/requests/updateIdentity';
import {coinsList} from '../../../../utils/CoinData/CoinsList';
import {decryptkey} from '../../../../utils/seedCrypt';
import {CoinDirectory} from '../../../../utils/CoinData/CoinDirectory';
import {useObjectSelector} from '../../../../hooks/useObjectSelector';

const SAFE_REVOCATION_ERRORS = new Set([
  'This VerusID could not be found on the selected blockchain.',
  'Cannot revoke VerusID that is already revoked.',
  'Cannot revoke VerusID that has itself set as both revocation and recovery.',
  'The revocation authority could not be verified on this blockchain.',
  'Revocation identity is not active, and therefore unable to sign transactions.',
  'Revocation identity has minimum signatures > 1. Please revoke through CLI or Verus Desktop.',
  'The imported secret or key does not control this VerusID’s revocation authority.',
]);

const getSafeRevocationError = error => {
  if (error?.message === 'Unable to decrypt recovery secret') {
    return 'The imported authority key could not be read. Go back and import it again.';
  }

  if (SAFE_REVOCATION_ERRORS.has(error?.message)) return error.message;

  return 'The VerusID could not be prepared for revocation. Check the identity, blockchain, and connection, then try again.';
};

const RevokeIdentityForm = props => {
  const sendModal = useObjectSelector(state => state.sendModal);

  const instanceKey = useSelector(state => state.authentication.instanceKey);
  const [networkName, setNetworkName] = useState(
    sendModal.data[SEND_MODAL_SYSTEM_ID],
  );
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    try {
      const systemObj = CoinDirectory.findSystemCoinObj(
        sendModal.data[SEND_MODAL_SYSTEM_ID],
      );
      setNetworkName(systemObj.display_name);
    } catch (e) {}
  }, []);

  const formHasError = useCallback(() => {
    const {data} = sendModal;

    const identity =
      data[SEND_MODAL_IDENTITY_TO_REVOKE_FIELD] != null
        ? data[SEND_MODAL_IDENTITY_TO_REVOKE_FIELD].trim()
        : '';

    if (!identity || identity.length < 1) {
      return 'Enter the VerusID you want to revoke.';
    }

    try {
      fromBase58Check(identity);
    } catch (e) {
      if (!identity.endsWith('@')) {
        return 'Enter a VerusID name ending in @ or a valid i-address.';
      }
    }

    return null;
  }, [sendModal]);

  const getPotentialPrimaryAddresses = useCallback(async coinObj => {
    const encryptedSeed = sendModal.data[SEND_MODAL_ENCRYPTED_IDENTITY_SEED];
    const seed = decryptkey(instanceKey, encryptedSeed);

    if (!seed) throw new Error('Unable to decrypt recovery secret');

    const keyObj = await deriveKeyPair(seed, coinObj, ELECTRUM);
    const {addresses} = keyObj;

    return addresses;
  }, []);

  const submitData = useCallback(async () => {
    const validationError = formHasError();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);
    props.setLoading(true);

    const {data} = sendModal;

    const identity = data[SEND_MODAL_IDENTITY_TO_REVOKE_FIELD];

    let ownedAddress = '';
    let revocableByUser = false;

    try {
      const tarRes = await getIdentity(data[SEND_MODAL_SYSTEM_ID], identity);
      if (tarRes.error) {
        throw new Error(
          'This VerusID could not be found on the selected blockchain.',
        );
      }

      if (tarRes.result.status === 'revoked') {
        throw new Error('Cannot revoke VerusID that is already revoked.');
      }

      const revocation = tarRes.result.identity.revocationauthority;
      const recovery = tarRes.result.identity.recoveryauthority;
      const idaddr = tarRes.result.identity.identityaddress;

      if (revocation === idaddr && revocation === recovery) {
        throw new Error(
          'Cannot revoke VerusID that has itself set as both revocation and recovery.',
        );
      }

      const revRes = await getIdentity(data[SEND_MODAL_SYSTEM_ID], revocation);
      if (revRes.error) {
        throw new Error(
          'The revocation authority could not be verified on this blockchain.',
        );
      }

      if (revRes.result.status !== 'active') {
        throw new Error(
          'Revocation identity is not active, and therefore unable to sign transactions.',
        );
      }

      if (revRes.result.identity.minimumsignatures > 1) {
        throw new Error(
          'Revocation identity has minimum signatures > 1. Please revoke through CLI or Verus Desktop.',
        );
      }

      let isInWallet = false;
      const addrs = await getPotentialPrimaryAddresses(coinsList.VRSC);

      for (const address of revRes.result.identity.primaryaddresses) {
        if (addrs.includes(address)) {
          isInWallet = true;
          ownedAddress = address;
          revocableByUser = true;
          break;
        }
      }

      if (!isInWallet) {
        throw new Error(
          'The imported secret or key does not control this VerusID’s revocation authority.',
        );
      }

      const friendlyNames = await getFriendlyNameMap(
        data[SEND_MODAL_SYSTEM_ID],
        tarRes.result,
      );

      const targetIdAddr = tarRes.result.identity.identityaddress;
      const revocationResult = await createRevokeIdentityTx(
        data[SEND_MODAL_SYSTEM_ID],
        targetIdAddr,
        revRes.result.identity.identityaddress,
      );

      props.navigation.navigate(SEND_MODAL_FORM_STEP_CONFIRM, {
        targetId: tarRes.result,
        revocationId: revRes.result,
        friendlyNames,
        ownedAddress,
        revocableByUser,
        revocationResult,
      });
    } catch (e) {
      setFormError(getSafeRevocationError(e));
    }

    props.setLoading(false);
  }, [formHasError, getPotentialPrimaryAddresses, sendModal, props]);

  return RevokeIdentityFormRender({
    formError,
    submitData,
    updateSendFormData: props.updateSendFormData,
    formDataValue: sendModal.data[SEND_MODAL_IDENTITY_TO_REVOKE_FIELD],
    loading: props.loading,
    networkName,
    onBack: props.cancel,
  });
};

export default RevokeIdentityForm;
