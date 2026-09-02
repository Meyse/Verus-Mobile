import {useCallback, useEffect, useRef, useState} from 'react';
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
  SEND_MODAL_IDENTITY_TO_RECOVER_FIELD,
  SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD,
  SEND_MODAL_NEW_RECOVERY_IDENTITY_FIELD,
  SEND_MODAL_NEW_REVOCATION_IDENTITY_FIELD,
  SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD,
  SEND_MODAL_RECOVERY_CHANGE_PRIVATE_ADDRESS,
  SEND_MODAL_RECOVERY_CHANGE_REVOCATION_RECOVERY,
  SEND_MODAL_SYSTEM_ID,
} from '../../../../utils/constants/sendModal';
import {deriveKeyPair} from '../../../../utils/keys';
import {RecoverIdentityFormRender} from './RecoverIdentityForm.render';
import {createRecoverIdentityTx} from '../../../../utils/api/channels/verusid/requests/updateIdentity';
import {decryptkey} from '../../../../utils/seedCrypt';
import {CoinDirectory} from '../../../../utils/CoinData/CoinDirectory';
import {useObjectSelector} from '../../../../hooks/useObjectSelector';
import useAuthorityIdentityDiscovery from '../../../../containers/RevokeRecover/useAuthorityIdentityDiscovery';

const SAFE_RECOVERY_ERRORS = new Set([
  'This VerusID could not be found on the selected blockchain.',
  'Cannot recover VerusID that is not revoked.',
  'The recovery authority could not be verified on this blockchain.',
  'Recovery identity is not active, and therefore unable to sign transactions.',
  'Recovery identity has minimum signatures > 1. Please recover through CLI or Verus Desktop.',
  'The imported secret or key does not control this VerusID’s recovery authority.',
]);

const getSafeRecoveryError = (error, networkName) => {
  if (error?.message === 'Unable to decrypt recovery secret') {
    return 'The imported authority key could not be read. Go back and import it again.';
  }

  if (SAFE_RECOVERY_ERRORS.has(error?.message)) return error.message;

  if (
    error?.message === "Couldn't fund raw transaction" ||
    error?.message === 'Insufficient funds in UTXOs provided'
  ) {
    return `The authority address needs enough ${networkName} to pay the network fee before this VerusID can be recovered.`;
  }

  return 'The VerusID could not be prepared for recovery. Check the identity, addresses, blockchain, and connection, then try again.';
};

const RecoverIdentityForm = props => {
  const sendModal = useObjectSelector(state => state.sendModal);
  const instanceKey = useSelector(state => state.authentication.instanceKey);
  const encryptedIdentitySeed =
    sendModal.data[SEND_MODAL_ENCRYPTED_IDENTITY_SEED];
  const systemId = sendModal.data[SEND_MODAL_SYSTEM_ID];
  const [networkName, setNetworkName] = useState(systemId);
  const [formError, setFormError] = useState(null);
  const initialIdentity =
    sendModal.data[SEND_MODAL_IDENTITY_TO_RECOVER_FIELD]?.trim() || '';
  const [shouldAutoOpenIdentitySheet] = useState(
    () => !initialIdentity,
  );
  const [identitySheetVisible, setIdentitySheetVisible] = useState(false);
  const identitySheetVisibleRef = useRef(false);
  const [manualEntry, setManualEntry] = useState(Boolean(initialIdentity));
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const identityDiscovery = useAuthorityIdentityDiscovery({
    active: !manualEntry,
    encryptedSeed: encryptedIdentitySeed,
    instanceKey,
    isRecovery: true,
    systemId,
  });

  identitySheetVisibleRef.current = identitySheetVisible;

  useEffect(() => {
    const handleRequestClose = () => {
      if (!identitySheetVisibleRef.current) return false;

      setIdentitySheetVisible(false);
      return true;
    };

    props.setIdentitySafetyRequestCloseHandler(handleRequestClose);

    return () => props.setIdentitySafetyRequestCloseHandler(null);
  }, [props.setIdentitySafetyRequestCloseHandler]);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerField, setScannerField] = useState(
    SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD,
  );

  useEffect(() => {
    try {
      const systemObj = CoinDirectory.findSystemCoinObj(systemId);
      setNetworkName(systemObj.display_name);
    } catch (e) {}
  }, [systemId]);

  const formHasError = useCallback(() => {
    const {data} = sendModal;

    const identity =
      data[SEND_MODAL_IDENTITY_TO_RECOVER_FIELD] != null
        ? data[SEND_MODAL_IDENTITY_TO_RECOVER_FIELD].trim()
        : '';

    if (!identity || identity.length < 1) {
      return 'Enter the revoked VerusID you want to recover.';
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

  const getPotentialPrimaryAddresses = useCallback(async () => {
    const seed = decryptkey(instanceKey, encryptedIdentitySeed);

    if (!seed) throw new Error('Unable to decrypt recovery secret');

    const system = CoinDirectory.findSystemCoinObj(systemId);
    const keyObj = await deriveKeyPair(seed, system, ELECTRUM);
    const {addresses} = keyObj;

    return addresses;
  }, [encryptedIdentitySeed, instanceKey, systemId]);

  const chooseCandidate = useCallback(candidate => {
    setFormError(null);
    setSelectedCandidate(candidate);
    setManualEntry(false);
    props.updateSendFormData(
      SEND_MODAL_IDENTITY_TO_RECOVER_FIELD,
      candidate.identityAddress,
    );
    setIdentitySheetVisible(false);
  }, [props.updateSendFormData]);

  const chooseManualEntry = useCallback(() => {
    setFormError(null);
    setSelectedCandidate(null);
    setManualEntry(true);
    setIdentitySheetVisible(false);
  }, []);

  const openIdentitySheet = useCallback(() => {
    setManualEntry(false);
    setIdentitySheetVisible(true);
  }, []);

  useEffect(() => {
    if (!shouldAutoOpenIdentitySheet || manualEntry || selectedCandidate) return;

    const {candidates, status} = identityDiscovery;

    if (status === 'ready' && candidates.length === 1) {
      chooseCandidate(candidates[0]);
      return;
    }

    if (
      (status === 'ready' && candidates.length > 1) ||
      status === 'error' ||
      status === 'unsupported'
    ) {
      setIdentitySheetVisible(true);
    }
  }, [
    chooseCandidate,
    identityDiscovery.candidates,
    identityDiscovery.status,
    manualEntry,
    selectedCandidate,
    shouldAutoOpenIdentitySheet,
  ]);

  const updateIdentity = text => {
    setFormError(null);
    setSelectedCandidate(null);
    props.updateSendFormData(SEND_MODAL_IDENTITY_TO_RECOVER_FIELD, text);
  };

  const handleScan = codes => {
    const result = codes[0] ? codes[0].value : null;
    setScannerOpen(false);

    if (result != null && typeof result === 'string' && result.length <= 5000) {
      props.updateSendFormData(scannerField, result);
    } else {
      setFormError('The QR code does not contain a usable address.');
    }
  };

  const toggleScanner = field => {
    if (scannerOpen) {
      setScannerOpen(false);
    } else {
      setScannerField(field);
      setScannerOpen(true);
    }
  };

  const toggleEditRevocationRecovery = () => {
    props.updateSendFormData(
      SEND_MODAL_RECOVERY_CHANGE_REVOCATION_RECOVERY,
      !sendModal.data[SEND_MODAL_RECOVERY_CHANGE_REVOCATION_RECOVERY],
    );
  };

  const toggleEditZAddr = () => {
    props.updateSendFormData(
      SEND_MODAL_RECOVERY_CHANGE_PRIVATE_ADDRESS,
      !sendModal.data[SEND_MODAL_RECOVERY_CHANGE_PRIVATE_ADDRESS],
    );
  };

  const submitData = useCallback(async () => {
    const validationError = formHasError();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);
    props.setLoading(true);

    const {data} = sendModal;

    const identity = data[SEND_MODAL_IDENTITY_TO_RECOVER_FIELD];

    let ownedAddress = '';
    let recoverableByUser = false;

    try {
      const tarRes = await getIdentity(data[SEND_MODAL_SYSTEM_ID], identity);
      if (tarRes.error) {
        throw new Error(
          'This VerusID could not be found on the selected blockchain.',
        );
      }

      if (tarRes.result.status !== 'revoked') {
        throw new Error('Cannot recover VerusID that is not revoked.');
      }

      const recovery = tarRes.result.identity.recoveryauthority;

      const recRes = await getIdentity(data[SEND_MODAL_SYSTEM_ID], recovery);
      if (recRes.error) {
        throw new Error(
          'The recovery authority could not be verified on this blockchain.',
        );
      }

      if (recRes.result.status !== 'active') {
        throw new Error(
          'Recovery identity is not active, and therefore unable to sign transactions.',
        );
      }

      if (recRes.result.identity.minimumsignatures > 1) {
        throw new Error(
          'Recovery identity has minimum signatures > 1. Please recover through CLI or Verus Desktop.',
        );
      }

      let isInWallet = false;
      const addrs = await getPotentialPrimaryAddresses();

      for (const address of recRes.result.identity.primaryaddresses) {
        if (addrs.includes(address)) {
          isInWallet = true;
          ownedAddress = address;
          recoverableByUser = true;
          break;
        }
      }

      if (!isInWallet) {
        throw new Error(
          'The imported secret or key does not control this VerusID’s recovery authority.',
        );
      }

      const friendlyNames = await getFriendlyNameMap(
        data[SEND_MODAL_SYSTEM_ID],
        tarRes.result,
      );

      const targetIdAddr = tarRes.result.identity.identityaddress;

      const primaryAddr =
        data[SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD] != null &&
        data[SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD].length > 0
          ? data[SEND_MODAL_PRIMARY_RECOVERY_ADDRESS_FIELD]
          : null;

      const revocationAddr =
        data[SEND_MODAL_RECOVERY_CHANGE_REVOCATION_RECOVERY] &&
        data[SEND_MODAL_NEW_REVOCATION_IDENTITY_FIELD] != null &&
        data[SEND_MODAL_NEW_REVOCATION_IDENTITY_FIELD].length > 0
          ? data[SEND_MODAL_NEW_REVOCATION_IDENTITY_FIELD]
          : null;

      const recoveryAddr =
        data[SEND_MODAL_RECOVERY_CHANGE_REVOCATION_RECOVERY] &&
        data[SEND_MODAL_NEW_RECOVERY_IDENTITY_FIELD] != null &&
        data[SEND_MODAL_NEW_RECOVERY_IDENTITY_FIELD].length > 0
          ? data[SEND_MODAL_NEW_RECOVERY_IDENTITY_FIELD]
          : null;

      const privateAddr =
        data[SEND_MODAL_RECOVERY_CHANGE_PRIVATE_ADDRESS] &&
        data[SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD] != null &&
        data[SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD].length > 0
          ? data[SEND_MODAL_NEW_PRIVATE_IDENTITY_ADDRESS_FIELD]
          : null;

      const recoveryResult = await createRecoverIdentityTx(
        data[SEND_MODAL_SYSTEM_ID],
        targetIdAddr,
        recoveryAddr,
        revocationAddr,
        primaryAddr ? [primaryAddr] : null,
        privateAddr,
        ownedAddress,
      );

      props.navigation.navigate(SEND_MODAL_FORM_STEP_CONFIRM, {
        targetId: tarRes.result,
        recoveryId: recRes.result,
        friendlyNames,
        ownedAddress,
        recoverableByUser,
        recoveryResult,
        newRevocationAuthority: revocationAddr,
        newRecoveryAuthority: recoveryAddr,
        primaryAddr,
        privateAddr,
      });
    } catch (e) {
      setFormError(getSafeRecoveryError(e, networkName));
    }

    props.setLoading(false);
  }, [formHasError, getPotentialPrimaryAddresses, sendModal, props]);

  return RecoverIdentityFormRender({
    chooseCandidate,
    chooseManualEntry,
    formError,
    identityDiscovery,
    identitySheetVisible,
    loading: props.loading,
    manualEntry,
    onBack: props.cancel,
    onCloseIdentitySheet: () => setIdentitySheetVisible(false),
    onOpenIdentitySheet: openIdentitySheet,
    selectedCandidate,
    submitData,
    updateSendFormData: props.updateSendFormData,
    updateIdentity,
    sendModalData: sendModal.data,
    networkName,
    scannerOpen,
    toggleScanner,
    handleScan,
    toggleEditRevocationRecovery,
    toggleEditZAddr,
  });
};

export default RecoverIdentityForm;
