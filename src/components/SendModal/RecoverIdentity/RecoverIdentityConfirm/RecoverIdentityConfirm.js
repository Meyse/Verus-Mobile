import React, {useState, useCallback} from 'react';
import {useSelector} from 'react-redux';
import {
  SEND_MODAL_ENCRYPTED_IDENTITY_SEED,
  SEND_MODAL_FORM_STEP_FORM,
  SEND_MODAL_FORM_STEP_RESULT,
  SEND_MODAL_SYSTEM_ID,
} from '../../../../utils/constants/sendModal';
import {RecoverIdentityConfirmRender} from './RecoverIdentityConfirm.render';
import {pushUpdateIdentityTx} from '../../../../utils/api/channels/verusid/requests/updateIdentity';
import {decryptkey} from '../../../../utils/seedCrypt';
import {deriveKeyPair} from '../../../../utils/keys';
import {ELECTRUM} from '../../../../utils/constants/intervalConstants';
import {useObjectSelector} from '../../../../hooks/useObjectSelector';
import {CoinDirectory} from '../../../../utils/CoinData/CoinDirectory';
import {recoveryValues} from '../../../../containers/RevokeRecover/RecoveryValues';

const RecoverIdentityConfirm = props => {
  const targetId = props.route.params.targetId;
  const recoveryId = props.route.params.recoveryId;
  const recoveryResult = props.route.params.recoveryResult;
  const revocationAddr = props.route.params.newRevocationAuthority;
  const recoveryAddr = props.route.params.newRecoveryAuthority;
  const primaryAddr = props.route.params.primaryAddr;
  const privateAddr = props.route.params.privateAddr;
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
      for (let i = 0; i < recoveryResult.utxos.length; i++) {
        keys.push([spendingKey]);
      }

      const result = await pushUpdateIdentityTx(
        data[SEND_MODAL_SYSTEM_ID],
        recoveryResult.hex,
        recoveryResult.utxos,
        keys,
      );

      if (result.error) {
        throw new Error(result.error.message);
      }

      props.navigation.navigate(SEND_MODAL_FORM_STEP_RESULT, {
        targetId,
        recoveryId,
        txid: result.result,
        values: recoveryValues({
          targetId,
          primaryAddr,
          privateAddr,
          recoveryAddr,
          revocationAddr,
          friendlyNames,
        }),
      });
    } catch (e) {
      setSubmitError(
        'The recovery transaction could not be submitted. Review the addresses and connection, then try again.',
      );
    }

    props.setPreventExit(false);
    props.setLoading(false);
  }, [targetId, sendModal, acknowledged, props]);

  return RecoverIdentityConfirmRender({
    acknowledged,
    loading: props.loading,
    networkName,
    onAcknowledgedChange: setAcknowledged,
    targetId,
    friendlyNames,
    goBack,
    submitData,
    revocationAddr,
    recoveryAddr,
    primaryAddr,
    privateAddr,
    recoveryId,
    submitError,
  });
};

export default RecoverIdentityConfirm;
