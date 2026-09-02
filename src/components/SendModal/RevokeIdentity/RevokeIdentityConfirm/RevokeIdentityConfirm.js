import React, {useState, useCallback} from 'react';
import {useSelector} from 'react-redux';
import {
  SEND_MODAL_ENCRYPTED_IDENTITY_SEED,
  SEND_MODAL_FORM_STEP_FORM,
  SEND_MODAL_FORM_STEP_RESULT,
  SEND_MODAL_SYSTEM_ID,
} from '../../../../utils/constants/sendModal';
import {RevokeIdentityConfirmRender} from './RevokeIdentityConfirm.render';
import {pushUpdateIdentityTx} from '../../../../utils/api/channels/verusid/requests/updateIdentity';
import {decryptkey} from '../../../../utils/seedCrypt';
import {deriveKeyPair} from '../../../../utils/keys';
import {ELECTRUM} from '../../../../utils/constants/intervalConstants';
import {useObjectSelector} from '../../../../hooks/useObjectSelector';
import {CoinDirectory} from '../../../../utils/CoinData/CoinDirectory';

const RevokeIdentityConfirm = props => {
  const targetId = props.route.params.targetId;
  const revocationId = props.route.params.revocationId;
  const revocationResult = props.route.params.revocationResult;
  const friendlyNames = props.route.params.friendlyNames;
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const instanceKey = useSelector(state => state.authentication.instanceKey);

  const sendModal = useObjectSelector(state => state.sendModal);
  const encryptedIdentitySeed =
    sendModal.data[SEND_MODAL_ENCRYPTED_IDENTITY_SEED];
  const systemId = sendModal.data[SEND_MODAL_SYSTEM_ID];
  let networkName = systemId;

  try {
    networkName = CoinDirectory.findSystemCoinObj(systemId).display_name;
  } catch (_) {}

  const goBack = useCallback(() => {
    props.navigation.navigate(SEND_MODAL_FORM_STEP_FORM);
  }, [props]);

  const getSpendingKey = useCallback(async () => {
    const seed = decryptkey(instanceKey, encryptedIdentitySeed);

    if (!seed) throw new Error('Unable to decrypt recovery secret');

    const system = CoinDirectory.findSystemCoinObj(systemId);
    const keyObj = await deriveKeyPair(seed, system, ELECTRUM);

    return keyObj.privKey;
  }, [encryptedIdentitySeed, instanceKey, systemId]);

  const submitData = useCallback(async () => {
    if (!acknowledged || props.loading) return;

    setSubmitError(null);
    await props.setLoading(true);
    await props.setPreventExit(true);
    const {data} = sendModal;

    try {
      const spendingKey = await getSpendingKey();

      const keys = [];
      for (let i = 0; i < revocationResult.utxos.length; i++) {
        keys.push([spendingKey]);
      }

      const result = await pushUpdateIdentityTx(
        data[SEND_MODAL_SYSTEM_ID],
        revocationResult.hex,
        revocationResult.utxos,
        keys,
      );

      if (result.error) {
        throw new Error(result.error.message);
      }

      props.navigation.navigate(SEND_MODAL_FORM_STEP_RESULT, {
        targetId,
        revocationId,
        txid: result.result,
      });
    } catch (e) {
      setSubmitError(
        'The revocation transaction could not be submitted. Review the identity and connection, then try again.',
      );
    }

    props.setPreventExit(false);
    props.setLoading(false);
  }, [targetId, sendModal, acknowledged, props]);

  return RevokeIdentityConfirmRender({
    acknowledged,
    loading: props.loading,
    networkName,
    onAcknowledgedChange: setAcknowledged,
    targetId,
    revocationId,
    friendlyNames,
    goBack,
    submitData,
    revocableByUser: !!props.route.params.revocableByUser,
    ownedAddress: props.route.params.ownedAddress || '',
    submitError,
  });
};

export default RevokeIdentityConfirm;
