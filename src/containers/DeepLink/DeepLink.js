import { CommonActions, useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AcknowledgeSheet from '../../components/AcknowledgeSheet';
import AnimatedActivityIndicatorBox from '../../components/AnimatedActivityIndicatorBox';
import GenericRequestLoading, {
  createRequestLoadingSteps,
  GENERIC_REQUEST_LOADING_STEPS,
} from './GenericRequestLoading';
import { useOnboardingTheme } from '../../theme/onboarding';
import { primitives } from "verusid-ts-client"
import { createAlert } from '../../actions/actions/alert/dispatchers/alert';
import VrpcProvider from '../../utils/vrpc/vrpcInterface';
import {
  getBlock,
  verifyLoginConsentRequest,
  verifyVerusPayInvoice,
  extractLoginConsentSig,
  extractVerusPayInvoiceSig,
  getInfo
} from '../../utils/api/channels/vrpc/callCreators';
import { GENERIC_REQUEST, IDENTITY_UPDATE_REQUEST_INFO, LOGIN_CONSENT_INFO, VERUSPAY_INVOICE_INFO } from '../../utils/constants/deeplink';
import LoginRequestInfo from './LoginRequestInfo/LoginRequestInfo';
import { getCurrency, getFriendlyNameMap, getIdentity } from '../../utils/api/channels/verusid/callCreators';
import { convertFqnToDisplayFormat } from '../../utils/fullyqualifiedname';
import { resetDeeplinkData } from '../../actions/actionCreators';

const authorizedPermissions = [primitives.IDENTITY_VIEW.vdxfid,/*TODO: primitives.IDENTITY_AGREEMENT.vdxfid, primitives.ATTESTATION_READ_REQUEST.vdxfid */]
import { CoinDirectory } from '../../utils/CoinData/CoinDirectory';
import BigNumber from 'bignumber.js';
import { satsToCoins } from '../../utils/math';
import InvoiceInfo from './InvoiceInfo/InvoiceInfo';
import { useObjectSelector } from '../../hooks/useObjectSelector';
import { verifyIdentityUpdateRequest } from '../../utils/api/channels/vrpc/requests/verifyIdentityUpdateRequest';
import { extractIdentityUpdateRequestSig } from '../../utils/api/channels/vrpc/requests/extractIdentityUpdateRequestSig';
import { DATA_TYPE_DEFINEDKEY, DefinedKey, nameAndParentAddrToIAddr } from 'verus-typescript-primitives';
import IdentityUpdateRequestInfo from './IdentityUpdateRequestInfo/IdentityUpdateRequestInfo';
import { getIdentityContent } from '../../utils/api/channels/verusid/requests/getIdentityContent';
import { capitalizeString } from '../../utils/stringUtils';
import { createUpdateIdentityTx, getUpdatableIdentity } from '../../utils/api/channels/verusid/requests/updateIdentity';
import { validateGenericRequest } from '../../utils/deeplink/validator/envelopeValidator';
import GenericRequestHome from './GenericRequestHome/GenericRequestHome';
import store from '../../store';
import {
  requestWalletUnlock,
  WALLET_UNLOCK_CANCELLED,
} from '../../actions/actions/walletUnlock/dispatchers/walletUnlock';
import {
  DELEGATED_SIGNER_GATE_OUTCOMES,
  isDelegatedSignerRequest,
  requestDelegatedSignerWallet,
  validateWithDelegatedSignerGate,
} from '../../utils/deeplink/delegatedSignerGate';
import {
  assertExperimentalDeeplinkAllowed,
  assertExperimentalGenericRequestAllowed,
} from '../../utils/deeplink/experimentalDeeplinks';
import {
  validateVerusPayBurnChangePrice,
  VERUSPAY_BURN_OWN_ADDRESS_DISPLAY,
} from '../../utils/deeplink/verusPayBurnChangePrice';
import {assertRequestNetworkMatchesAccount} from '../../utils/deeplink/requestAccounts';
import {isTestnetAccount} from '../../utils/assets/assetIdentity';
import {
  createGenericRequestRejectionError,
  GENERIC_REQUEST_REJECTION_CODES,
  getGenericRequestRejection,
} from '../../utils/deeplink/genericRequestRejection';

import {isBottomSheetActive} from '../../hooks/useBottomSheetActivity';
import {getRequestBackState, RequestNavigationContext} from './useRequestNavigation';

const DeepLink = (props) => {
  const deeplinkId = useSelector((state) => state.deeplink.id)
  const deeplinkData = useObjectSelector((state) => state.deeplink.data)
  const deeplinkPassthrough = useObjectSelector(
    state => state.deeplink.passthrough,
  )

  const signedIn = useSelector((state) => state.authentication.signedIn)
  const accounts = useObjectSelector(state => state.authentication.accounts)
  const activeAccount = useObjectSelector(
    state => state.authentication.activeAccount,
  )
  const [displayKey, setDisplayKey] = useState(null)
  const [loading, setLoading] = useState(false)
  const [displayProps, setDisplayProps] = useState({})
  // The opening screen's current step and its error, for every request type.
  const [requestLoadingStep, setRequestLoadingStep] = useState(
    GENERIC_REQUEST_LOADING_STEPS.READ
  )
  const [requestError, setRequestError] = useState(null)
  // An invoice the wallet cannot pay, such as an expired one, ends on a sheet.
  const [invoiceProblem, setInvoiceProblem] = useState(null)
  const dispatch = useDispatch()
  const processGenerationRef = useRef(0)
  const theme = useOnboardingTheme()

  // Title and steps of the opening screen. v1 login requests show no steps.
  const opening = useMemo(() => {
    switch (deeplinkId) {
      case primitives.VERUSPAY_INVOICE_VDXF_KEY.vdxfid: {
        let signed = true

        try {
          signed = primitives.VerusPayInvoice.fromJson(deeplinkData).isSigned()
        } catch (e) {}

        return {
          title: 'Opening invoice',
          steps: createRequestLoadingSteps(
            {
              [GENERIC_REQUEST_LOADING_STEPS.READ]: 'Read invoice',
              [GENERIC_REQUEST_LOADING_STEPS.REVIEW]: 'Prepare payment',
            },
            signed ? [] : [GENERIC_REQUEST_LOADING_STEPS.SIGNER],
          ),
        }
      }
      case primitives.LOGIN_CONSENT_REQUEST_VDXF_KEY.vdxfid:
        return {title: 'Opening request', steps: []}
      default:
        return {title: 'Opening request', steps: undefined}
    }
  }, [deeplinkId, deeplinkData])

  const exitedRef = useRef(false)
  const backHandlers = useRef(new Map()).current
  // All exits, including completion and forced unmount, pass through this guard.
  const finishRequest = useCallback(action => {
    if (exitedRef.current) return
    exitedRef.current = true
    processGenerationRef.current += 1
    dispatch(resetDeeplinkData())
    action?.()
  }, [dispatch])

  const cancel = () => finishRequest(() => {

    if (deeplinkPassthrough?.replayedPendingDeeplink === true) {
      const parentNavigation = props.navigation.getParent?.()

      if (parentNavigation?.canGoBack?.()) {
        parentNavigation.goBack()
        return
      }
    }

    let resetAction

    if (signedIn) {
      resetAction = CommonActions.reset({
        index: 0,
        routes: [{name: 'SignedInStack'}],
      });
    } else if (accounts.length === 0) {
      resetAction = CommonActions.reset({
        index: 0,
        routes: [{name: 'SignedOutNoKeyStack'}],
      });
    } else {
      resetAction = CommonActions.reset({
        index: 0,
        routes: [{name: 'SignedOutStack'}],
      });
    }
    props.navigation.dispatch(resetAction);
  })

  const backRef = useRef(null)
  backRef.current = () => {
    const {onBack, blocked} = getRequestBackState(backHandlers)
    if (!blocked && !loading) (onBack || cancel)()
  }

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      // Native sheets own Back, including their closing animation.
      if (!isBottomSheetActive()) backRef.current()
      return true
    })
    return () => subscription.remove()
  }, []))

  useEffect(() => props.navigation.addListener('beforeRemove', event => {
    if (exitedRef.current) return
    const {blocked} = getRequestBackState(backHandlers)
    if (blocked || loading) {
      event.preventDefault()
    } else if (event.data.action.type === 'RESET') {
      finishRequest()
    } else {
      event.preventDefault()
      backRef.current()
    }
  }), [backHandlers, finishRequest, loading, props.navigation])

  useEffect(() => () => finishRequest(), [finishRequest])

  const processGenericRequest = async processGeneration => {
    setRequestLoadingStep(GENERIC_REQUEST_LOADING_STEPS.READ);

    const request = new primitives.GenericRequest();
    request.fromBuffer(Buffer.from(deeplinkData, 'hex'));
    setRequestLoadingStep(GENERIC_REQUEST_LOADING_STEPS.NETWORK);

    if (signedIn) {
      assertRequestNetworkMatchesAccount(activeAccount, request.isTestnet());
    }

    const requiresDelegatedUserCheck = isDelegatedSignerRequest(request);
    
    assertExperimentalGenericRequestAllowed(request, store.getState());

    setRequestLoadingStep(GENERIC_REQUEST_LOADING_STEPS.SIGNER);

    const unlockForDelegatedSigner = () =>
      requestDelegatedSignerWallet({
        accounts,
        requestIsTestnet: request.isTestnet(),
        requestUnlock: requestWalletUnlock,
        unlockCancelledCode: WALLET_UNLOCK_CANCELLED,
        unlockOptions: {
          reason: 'delegated-signer-verification',
          title: signedIn
            ? 'Switch wallet to verify signer'
            : 'Unlock wallet to verify signer',
          requestLabel: 'Generic request',
          networkLabel: request.isTestnet() ? 'Testnet' : 'Mainnet',
        },
      });

    const validationResult = await validateWithDelegatedSignerGate({
      requiresDelegatedSignerCheck: requiresDelegatedUserCheck,
      signedIn,
      validateRequest: () => validateGenericRequest(request),
      unlockForDelegatedSigner,
    });

    if (processGenerationRef.current !== processGeneration) return;

    if (
      validationResult.outcome ===
      DELEGATED_SIGNER_GATE_OUTCOMES.NO_MATCHING_PROFILES
    ) {
      throw createGenericRequestRejectionError(
        GENERIC_REQUEST_REJECTION_CODES.DELEGATED_SIGNER_NO_WALLET,
        `No ${request.isTestnet() ? 'testnet' : 'mainnet'} wallets found, cannot verify delegated request signer.`,
        {requestIsTestnet: request.isTestnet()},
      );
    }

    if (
      validationResult.outcome === DELEGATED_SIGNER_GATE_OUTCOMES.CANCELLED
    ) {
      cancel();
      return;
    }

    setRequestLoadingStep(GENERIC_REQUEST_LOADING_STEPS.REVIEW);

    setDisplayProps({
      deeplinkData
    })
    setDisplayKey(GENERIC_REQUEST)
  }

  const processVerusPayInvoice = async () => {
    const invoice = primitives.VerusPayInvoice.fromJson(deeplinkData)

    // A testnet invoice in a mainnet wallet, or the other way round.
    if (signedIn && isTestnetAccount(activeAccount) !== invoice.details.isTestnet()) {
      const invoiceNetwork = invoice.details.isTestnet() ? 'testnet' : 'mainnet'
      setInvoiceProblem({
        title: invoice.details.isTestnet() ? 'Testnet invoice' : 'Mainnet invoice',
        message: `This invoice is for ${invoiceNetwork}. Your open wallet is on ${
          invoiceNetwork === 'testnet' ? 'mainnet' : 'testnet'
        }. Open a ${invoiceNetwork} wallet and scan it again.`,
      })
      return
    }

    if (!invoice.details.acceptsNonVerusSystems() && invoice.details.excludesVerusBlockchain()) {
      throw new Error("This invoice accepts no systems to pay on, and is therefore unpayable.")
    }

    setRequestLoadingStep(GENERIC_REQUEST_LOADING_STEPS.NETWORK)
    const coinObj = CoinDirectory.getBasicCoinObj(invoice.details.isTestnet() ? 'VRSCTEST' : 'VRSC')
    VrpcProvider.initEndpoint(coinObj.system_id, coinObj.vrpc_endpoints[0])

    const chainInfo = await getInfo(coinObj.system_id)
    if (chainInfo.error) throw new Error(chainInfo.error.message)

    const requestedCurrency = await getCurrency(
      coinObj.system_id,
      invoice.details.requestedcurrencyid,
    );
    if (requestedCurrency.error) {
      throw new Error(requestedCurrency.error.message);
    }

    validateVerusPayBurnChangePrice(
      invoice.details,
      requestedCurrency.result,
      coinObj.system_id,
    );

    const getDestinationDisplay = async () => {
      let destinationDisplay;

      if (invoice.details.acceptsAnyDestination()) {
        destinationDisplay = invoice.details.isBurnChangePrice()
          ? VERUSPAY_BURN_OWN_ADDRESS_DISPLAY
          : 'any destination';
      }
      else if (invoice.details.destination.isIAddr()) {
        const destinationId = await getIdentity(coinObj.system_id, invoice.details.destination.getAddressString())
        if (destinationId.error) throw new Error(destinationId.error.message)

        destinationDisplay = convertFqnToDisplayFormat(destinationId.result.fullyqualifiedname)
      } else destinationDisplay = invoice.details.destination.getAddressString()

      return destinationDisplay
    }

    const getAcceptedSystemsDefinitions = async () => {
      const acceptedSystems = {
        definitions: {},
        remainingSystems: []
      };

      let i = 0;

      if (!invoice.details.excludesVerusBlockchain()) {
        const rootSystemRes = await getCurrency(coinObj.system_id, coinObj.currency_id)
        if (rootSystemRes.error) throw new Error(rootSystemRes.error.message)
        acceptedSystems.definitions[rootSystemRes.result.currencyid] = rootSystemRes.result;
      }
      
      if (invoice.details.acceptsNonVerusSystems()) {
        for (; i < 10 && i < invoice.details.acceptedsystems.length; i++) {
          const systemId = invoice.details.acceptedsystems[i];

          const systemDefinitionRes = await getCurrency(coinObj.system_id, systemId)
          if (systemDefinitionRes.error) throw new Error(systemDefinitionRes.error.message)

          acceptedSystems.definitions[systemId] = systemDefinitionRes.result;
        }

        for (; i < invoice.details.acceptedsystems.length; i++) {
          acceptedSystems.remainingSystems.push(invoice.details.acceptedsystems[i])
        }
      }

      return acceptedSystems;
    }

    const validateExpiry = async requester => {
      if (invoice.details.expires() && invoice.details.expiryheight.toNumber() - chainInfo.result.longestchain < 0) {
        setInvoiceProblem({
          title: 'Invoice expired',
          message: `Ask ${requester || 'the requester'} for a new one.`,
        })
        return false
      }
      return true
    }

    if (invoice.isSigned()) {
      setRequestLoadingStep(GENERIC_REQUEST_LOADING_STEPS.SIGNER)
      if (await verifyVerusPayInvoice(coinObj, invoice)) {
        const sig = await extractVerusPayInvoiceSig(coinObj, invoice)

        const sigblock = await getBlock(coinObj.system_id, sig.height)
       
        if (sigblock.error) throw new Error(sigblock.error.message)

        const sigtime = sigblock.result.time

        const signedBy = await getIdentity(coinObj.system_id, invoice.signing_id)
        if (signedBy.error) throw new Error(signedBy.error.message)

        setRequestLoadingStep(GENERIC_REQUEST_LOADING_STEPS.REVIEW)
        if (!(await validateExpiry(convertFqnToDisplayFormat(signedBy.result.fullyqualifiedname)))) return
        setDisplayProps({
          detailsBufferString: invoice.details.toBuffer().toString('hex'),
          invoiceVersion: invoice.version.toString(),
          isSigned: true,
          sigtime,
          signerFqn: convertFqnToDisplayFormat(signedBy.result.fullyqualifiedname),
          signerSystemID: invoice.system_id,
          currencyDefinition: requestedCurrency.result,
          amountDisplay: invoice.details.acceptsAnyAmount() ? null : satsToCoins(BigNumber(invoice.details.amount)).toString(),
          destinationDisplay: await getDestinationDisplay(),
          acceptedSystemsDefinitions: await getAcceptedSystemsDefinitions(),
          coinObj,
          chainInfo: chainInfo.result
        })
        setDisplayKey(VERUSPAY_INVOICE_INFO)
      } else {
        // The sheet's Close cancels the request, as for the expired invoice.
        setInvoiceProblem({
          title: 'Invoice not verified',
          message: 'The wallet could not verify who signed this invoice. Ask for a new invoice.',
        })
      }
    } else {
      setRequestLoadingStep(GENERIC_REQUEST_LOADING_STEPS.REVIEW)
      if (!(await validateExpiry())) return
      setDisplayProps({
        detailsBufferString: invoice.details.toBuffer().toString('hex'),
        invoiceVersion: invoice.version.toString(),
        isSigned: false,
        currencyDefinition: requestedCurrency.result,
        amountDisplay: invoice.details.acceptsAnyAmount() ? null : satsToCoins(BigNumber(invoice.details.amount)).toString(),
        destinationDisplay: await getDestinationDisplay(),
        acceptedSystemsDefinitions: await getAcceptedSystemsDefinitions(),
        coinObj,
        chainInfo: chainInfo.result
      })
      setDisplayKey(VERUSPAY_INVOICE_INFO)
    }
  }

  const processIdentityUpdateRequest = async () => {
    const req = primitives.IdentityUpdateRequest.fromJson(deeplinkData);

    if (!req.isValidVersion() || !req.details.identity) {
      throw new Error("Invalid identity update request.");
    }

    setRequestLoadingStep(GENERIC_REQUEST_LOADING_STEPS.NETWORK);
    const requestSystem = req.details.systemid ? req.details.systemid.toAddress() : (req.details.isTestnet() ? 'VRSCTEST' : 'VRSC');

    const coinObj = CoinDirectory.getBasicCoinObj(requestSystem);
    VrpcProvider.initEndpoint(coinObj.system_id, coinObj.vrpc_endpoints[0]);

    const chainInfo = await getInfo(coinObj.system_id);
    if (chainInfo.error) throw new Error(chainInfo.error.message);

    const identityAddress = nameAndParentAddrToIAddr(
      req.details.identity.name, 
      req.details.identity.containsParent() ? req.details.identity.parent.toAddress() : coinObj.system_id
    );

    const subjectIdentityRes = await getIdentity(coinObj.system_id, identityAddress);
    if (subjectIdentityRes.error) throw new Error(subjectIdentityRes.error.message);

    const subjectIdentity = subjectIdentityRes.result;
    const updatableIdentity = await getUpdatableIdentity(coinObj.system_id, subjectIdentity);

    const subjectIdClass = updatableIdentity.identity;
    const subjectIdTxHex = updatableIdentity.tx;

    if (deeplinkData.details.identity.flags) {
      if (subjectIdClass.hasActiveCurrency() !== req.details.identity.hasActiveCurrency()) {
        throw new Error("Cannot change active currency status.");
      }
  
      if (subjectIdClass.hasTokenizedIdControl() !== req.details.identity.hasTokenizedIdControl()) {
        throw new Error("Cannot change tokenized id control status.");
      }
    }

    let friendlyNames;

    try {
      const initAddresses = [];

      if (req.details.identity.containsRevocation()) {
        initAddresses.push(req.details.identity.revocationAuthority.toAddress());
      }

      if (req.details.identity.containsRecovery()) {
        initAddresses.push(req.details.identity.recoveryAuthority.toAddress());
      }

      friendlyNames = await getFriendlyNameMap(coinObj.system_id, subjectIdentity, initAddresses);
    } catch (e) {
      friendlyNames = {
        ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV']: 'VRSC',
        ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq']: 'VRSCTEST',
        [subjectIdentity.identity.identityaddress]: subjectIdentity.fullyqualifiedname
      };
    }

    // An expired request ends on the opening screen as "Request expired".
    const validateExpiry = async () => {
      if (req.details.expires() && req.details.expiryheight.toNumber() - chainInfo.result.longestchain < 0) {
        throw createGenericRequestRejectionError(
          GENERIC_REQUEST_REJECTION_CODES.EXPIRED,
          'Identity update request expired.',
        );
      }
    }

    let cmmDataKeys = {};

    const updateIdentityTx = await createUpdateIdentityTx(
      req.systemid.toAddress(), 
      req.details,
      subjectIdClass.getIdentityAddress(),
      subjectIdTxHex,
      subjectIdentity.blockheight,
      false,
      undefined,
      req.isTestnet()
    );

    if (req.isSigned()) {
      setRequestLoadingStep(GENERIC_REQUEST_LOADING_STEPS.SIGNER);
      if (await verifyIdentityUpdateRequest(coinObj, req)) {
        const sig = await extractIdentityUpdateRequestSig(coinObj, req);
        const sigblock = await getBlock(coinObj.system_id, sig.height);
       
        if (sigblock.error) throw new Error(sigblock.error.message);

        const sigtime = sigblock.result.time;

        const signingIAddr = req.signingid.toAddress();

        const signedBy = await getIdentity(coinObj.system_id, signingIAddr);
        if (signedBy.error) throw new Error(signedBy.error.message);

        try {
          const contentRes = await getIdentityContent(
            coinObj.system_id,
            signingIAddr
          );

          if (contentRes.error) throw new Error(contentRes.error.message);
          else {
            const signerIdentity = contentRes.result.identity;

            if (signerIdentity.contentmultimap && signerIdentity.contentmultimap[DATA_TYPE_DEFINEDKEY.vdxfid]) {
              const definedKeyContent = signerIdentity.contentmultimap[DATA_TYPE_DEFINEDKEY.vdxfid];

              let definedKeyBufs = [];

              if (Array.isArray(definedKeyContent)) definedKeyBufs = definedKeyContent
              else definedKeyBufs = [definedKeyContent]

              for (const definedKeyHex of definedKeyBufs) {
                try {
                  const definedKey = new DefinedKey();
                  definedKey.fromBuffer(Buffer.from(definedKeyHex, 'hex'));

                  const iAddr = definedKey.getIAddr();
                  const ns = definedKey.getNameSpaceID();

                  if (ns !== signerIdentity.identityaddress) {
                    throw new Error(`Found defined key ${definedKey.vdxfuri} with namespace ${ns} not matching signer ID.`);
                  } else {
                    const splitUri = definedKey.vdxfuri.split("::");
                    const label = splitUri.length > 1 ? splitUri[1] : splitUri[0]

                    cmmDataKeys[iAddr] = {
                      vdxfuri: definedKey.vdxfuri,
                      nsid: ns,
                      label: capitalizeString(label.split('.').join(' ')),
                    }
                  }
                } catch(e) {
                  console.warn(e);
                }
              }
            }
          }
        } catch (e) {
          console.warn(e);
        }

        setRequestLoadingStep(GENERIC_REQUEST_LOADING_STEPS.REVIEW);
        await validateExpiry();
        setDisplayProps({
          detailsBufferString: req.details.toBuffer().toString('hex'),
          sigtime,
          signerFqn: convertFqnToDisplayFormat(signedBy.result.fullyqualifiedname),
          signerSystemID: coinObj.system_id,
          signerSystemName: coinObj.id,
          signerIdentityID: signingIAddr,
          subjectIdentity,
          identityUpdates: updateIdentityTx.identity.toJson(),
          updateIdTxHex: updateIdentityTx.hex,
          coinObj,
          chainInfo: chainInfo.result,
          friendlyNames,
          cmmDataKeys,
          subjectIdTxHex,
        })
        setDisplayKey(IDENTITY_UPDATE_REQUEST_INFO);
      } else {
        throw createGenericRequestRejectionError(
          GENERIC_REQUEST_REJECTION_CODES.SIGNATURE_INVALID,
          'Failed to verify identity update request signature',
        );
      }
    } else {
      throw new Error("Unsigned identity update requests not currently supported.")
      // await validateExpiry();
      // setDisplayProps({
      //   deeplinkData,
      //   subjectIdentity,
      //   identityUpdates: updateIdentityTx.identity.toJson(),
      //   updateIdTxHex: updateIdentityTx.hex,
      //   coinObj,
      //   chainInfo: chainInfo.result,
      //   friendlyNames,
      //   cmmDataKeys,
      //   subjectIdTxHex
      // })
      // setDisplayKey(IDENTITY_UPDATE_REQUEST_INFO);
    }
  }

  const processLoginConsentRequest = async () => {
    const request = new primitives.LoginConsentRequest(deeplinkData)

    if (request.challenge.context != null) {
      if (Object.keys(request.challenge.context.kv).length !== 0) {
        throw new Error("Login requests with context are currently unsupported.")
      }
    }

    const coinObj = CoinDirectory.findCoinObj(request.system_id, null, true)
    VrpcProvider.initEndpoint(coinObj.system_id, coinObj.vrpc_endpoints[0])

    if (await verifyLoginConsentRequest(coinObj, request)) {
      for (const requestedPermission of request.challenge
        .requested_access) {
        if (
          !authorizedPermissions.includes(requestedPermission.vdxfkey)
        ) {
          throw new Error(
            'Unrecognized requested permission ' +
              requestedPermission.vdxfkey,
          );
        }
      }

      if (request.challenge.requested_access.length == 0) {
        throw new Error(
          'No permissions being requested in loginconsent request.',
        );
      }

      const sig = await extractLoginConsentSig(coinObj, request)

      const sigblock = await getBlock(coinObj.system_id, sig.height)
     
      if (sigblock.error) throw new Error(sigblock.error.message)

      const sigtime = sigblock.result.time

      const signedBy = await getIdentity(coinObj.system_id, request.signing_id)

      if (signedBy.error) throw new Error(signedBy.error.message)

      setDisplayProps({
        deeplinkData,
        sigtime,
        signerFqn: convertFqnToDisplayFormat(signedBy.result.fullyqualifiedname)
      })
      setDisplayKey(LOGIN_CONSENT_INFO)
    } else {
      createAlert(
        'Failed to verify',
        'Failed to verify request signature',
      );
      cancel();
    }
  }

  const processDeeplink = async processGeneration => {
    try {
      assertExperimentalDeeplinkAllowed(deeplinkId, store.getState());

      switch (deeplinkId) {
        case primitives.VERUSPAY_INVOICE_VDXF_KEY.vdxfid:
          await processVerusPayInvoice();
          break;
        case primitives.GENERIC_REQUEST_DEEPLINK_VDXF_KEY.vdxfid:
          await processGenericRequest(processGeneration);
          break;
        case primitives.LOGIN_CONSENT_REQUEST_VDXF_KEY.vdxfid:
          await processLoginConsentRequest();
          break;
        case primitives.IDENTITY_UPDATE_REQUEST_VDXF_KEY.vdxfid:
          await processIdentityUpdateRequest();
          break;
        default:
          throw createGenericRequestRejectionError(
            GENERIC_REQUEST_REJECTION_CODES.DETAIL_UNSUPPORTED,
            'Unsupported request',
          );
      }
    } catch (e) {
      if (processGenerationRef.current !== processGeneration) return;

      console.warn(e)

      // An invoice that cannot be read ends on a sheet; the raw error stays in the log.
      if (deeplinkId === primitives.VERUSPAY_INVOICE_VDXF_KEY.vdxfid) {
        setInvoiceProblem({
          title: 'Can’t open this invoice',
          message: 'The wallet couldn’t read it. Try again, or ask for a new invoice.',
        })
        return
      }

      // v1 login requests keep their old alert (owner decision, 2026-10-21).
      if (deeplinkId === primitives.LOGIN_CONSENT_REQUEST_VDXF_KEY.vdxfid) {
        createAlert('Error', e.message);
        cancel();
        return
      }

      // Other requests end on the opening screen with a short reason.
      setRequestError(getGenericRequestRejection(e));
    }
  };

  const retryRequest = () => {
    const processGeneration = processGenerationRef.current + 1
    processGenerationRef.current = processGeneration
    setRequestError(null)
    setRequestLoadingStep(GENERIC_REQUEST_LOADING_STEPS.READ)
    processDeeplink(processGeneration)
  }

  useEffect(() => {
    const processGeneration = processGenerationRef.current + 1
    processGenerationRef.current = processGeneration
    processDeeplink(processGeneration)

    return () => {
      processGenerationRef.current += 1
    }
  }, [])

  const screens = {
    [LOGIN_CONSENT_INFO]: () => (
      <LoginRequestInfo
        {...displayProps}
        cancel={cancel}
        setLoading={setLoading}
        navigation={props.navigation}
      />
    ),
    [VERUSPAY_INVOICE_INFO]: () => (
      <InvoiceInfo
        {...displayProps}
        cancel={cancel}
        setLoading={setLoading}
        navigation={props.navigation}
      />
    ),
    [IDENTITY_UPDATE_REQUEST_INFO]: () => (
      <IdentityUpdateRequestInfo
        {...displayProps}
        cancel={cancel}
        setLoading={setLoading}
        navigation={props.navigation}
      />
    ),
    [GENERIC_REQUEST]: () => (
      <GenericRequestHome
        {...displayProps}
        cancel={cancel}
        finishRequest={finishRequest}
        setLoading={setLoading}
        navigation={props.navigation}
      />
    )
  };

  const showRequestOpening = displayKey == null && !loading;

  return (
    <RequestNavigationContext.Provider value={backHandlers}>
      <View style={[styles.root, {backgroundColor: theme.colors.background}]}>
        {showRequestOpening ? (
          <GenericRequestLoading
            activeStep={requestLoadingStep}
            error={requestError}
            onCancel={cancel}
            onRetry={retryRequest}
            steps={opening.steps}
            title={opening.title}
          />
        ) : displayKey == null || loading ? (
          <AnimatedActivityIndicatorBox />
        ) : (
          screens[displayKey]()
        )}
        <AcknowledgeSheet
          confirmLabel="Close"
          message={invoiceProblem?.message}
          onClose={cancel}
          title={invoiceProblem?.title}
          visible={invoiceProblem != null}
        />
      </View>
    </RequestNavigationContext.Provider>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default DeepLink;
