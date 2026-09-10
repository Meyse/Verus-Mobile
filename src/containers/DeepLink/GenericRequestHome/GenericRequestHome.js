/*
  GenericRequestHome 
  - Coordinates generic request detail handlers, chooses the matching deeplink
    screen, and forwards completed responses through the request flow.
*/
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Linking, StyleSheet, TouchableOpacity, View} from 'react-native';
import { Portal, Text } from 'react-native-paper';
import {CommonActions} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import Styles from '../../../styles/index';
import { primitives } from "verusid-ts-client"
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import AnimatedSuccessCheckmark from '../../../components/AnimatedSuccessCheckmark';
import AppButton from '../../../components/AppButton';
import BottomSheetModal from '../../../components/BottomSheetModal';
import GenericRequestLoading, {
  GENERIC_REQUEST_LOADING_STEPS,
} from '../GenericRequestLoading';
import {
  AUTHENTICATION_REQUEST_VDXF_KEY,
  APP_ENCRYPTION_REQUEST_VDXF_KEY,
  DEEPLINK_PROTOCOL_URL_STRING,
  IDENTITY_UPDATE_REQUEST_VDXF_KEY,
  PROVISION_IDENTITY_DETAILS_VDXF_KEY,
  CREATE_WALLET_BACKUP_DETAILS_VDXF_KEY,
  DATA_PACKET_REQUEST_VDXF_KEY,
  SPENDABLE_KEY_DETAILS_VDXF_KEY,
  USER_DATA_REQUEST_VDXF_KEY,
  VALU_MOBILE_GENERIC_REQUEST_HANDLER_ID,
  VERUSPAY_INVOICE_DETAILS_VDXF_KEY,
} from 'verus-typescript-primitives';
import InvoiceInfo from '../InvoiceInfo/InvoiceInfo';
import { handleVerusPayInvoiceDetailsVDXFObject } from '../../../utils/deeplink/handlers/verusPayInvoiceDetailsHandler';
import { handleAuthenticationRequestDetailsVDXFObject } from '../../../utils/deeplink/handlers/authenticationRequestDetailsHandler';
import { handleIdentityUpdateRequestDetailsVDXFObject } from '../../../utils/deeplink/handlers/identityUpdateRequestDetailsHandler';
import { handleProvisionIdentityDetailsVDXFObject } from '../../../utils/deeplink/handlers/provisionIdentityDetailsHandler';
import { handleAppEncryptionRequestVDXFObject } from '../../../utils/deeplink/handlers/appEncryptionRequestHandler';
import { handleCreateWalletBackupDetailsVDXFObject } from '../../../utils/deeplink/handlers/createWalletBackupDetailsHandler';
import { handleSpendableKeyDetailsVDXFObject } from '../../../utils/deeplink/handlers/spendableKeyDetailsHandler';
import { handleUserDataRequestVDXFObject } from '../../../utils/deeplink/handlers/userDataRequestHandler';
import { handleDataPacketRequestVDXFObject } from '../../../utils/deeplink/handlers/dataPacketRequestHandler';
import { createAlert } from '../../../actions/actions/alert/dispatchers/alert';
import {resetDeeplinkData} from '../../../actions/actionCreators';
import AuthenticationRequestInfo from '../AuthenticationRequestInfo/AuthenticationRequestInfo';
import IdentityUpdateRequestInfo from '../IdentityUpdateRequestInfo/IdentityUpdateRequestInfo';
import AppEncryptionRequestInfo from '../AppEncryptionRequestInfo/AppEncryptionRequestInfo';
import WalletBackupRequestInfo from '../WalletBackupRequestInfo/WalletBackupRequestInfo';
import SpendableKeyRequestInfo from '../SpendableKeyRequestInfo/SpendableKeyRequestInfo';
import UserDataRequestInfo from '../UserDataRequestInfo/UserDataRequestInfo';
import DataPacketRequestInfo from '../DataPacketRequestInfo/DataPacketRequestInfo';
import ListSelectionModal from '../../../components/ListSelectionModal/ListSelectionModal';
import VerusIdDetailsModal from '../../../components/VerusIdDetailsModal/VerusIdDetailsModal';
import { isDeeplinkHandlerInstalled } from '../../../utils/deeplink/isDeeplinkHandlerInstalled';
import Colors from '../../../globals/colors';
import {
  getFriendlyNameMap,
  getIdentity,
} from '../../../utils/api/channels/verusid/callCreators';
import {markPendingDeeplinkComplete} from '../../../utils/deeplink/pendingDeeplinkStorage';
import {
  completeGenericResponseDelivery,
  createGenericResponseDelivery,
  GENERIC_REQUEST_DELIVERY_TYPES,
  getGenericRequestDeliveryInfo,
  getGenericResponseDeliveryFailure,
} from '../../../utils/deeplink/genericRequestDelivery';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {
  alignGenericResponseNetwork,
  createGenericRequestDeliverySingleFlight,
  GENERIC_REQUEST_COMPLETION_ACTIONS,
  getGenericRequestCompletionAction,
} from './genericRequestCompletionFlow';
import {
  EXPERIMENTAL_DEEPLINK_DISABLED_MESSAGE,
  isExperimentalGenericRequestDetailKey,
  isExperimentalGenericRequestsEnabled,
} from '../../../utils/deeplink/experimentalDeeplinks';

const AUTO_DELIVERY_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

const POST_SUCCESS_DELAY_MS = 900;
const AUTO_DELIVERY_SHEET_HEIGHT = 280;

const autoDeliverySheetStyles = StyleSheet.create({
  sheet: {
    height: AUTO_DELIVERY_SHEET_HEIGHT,
    paddingTop: 0,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 8,
  },
  visualSlot: {
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingAnimation: {
    width: 96,
    height: 70,
  },
  successAnimation: {
    width: 84,
    height: 84,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 22,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    letterSpacing: 0,
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 8,
  },
});

const getAutoDeliverySheetTitle = ({
  destination,
  isError,
  isPost,
  isRedirect,
  isSuccess,
  isPreparing,
}) => {
  if (isError) return 'Response not sent';
  if (isSuccess) return isPost ? 'Response sent' : isRedirect ? 'Browser opened' : 'Request complete';
  if (isPreparing) return 'Preparing response';
  if (isRedirect) return `Returning to ${destination}`;
  if (isPost) return 'Sending response';

  return 'Completing request';
};

const getAutoDeliverySheetMessage = ({
  destination,
  error,
  isError,
  isPost,
  isRedirect,
  isSuccess,
}) => {
  if (isError) {
    if (error?.isResponsePostError) {
      return `We couldn't send the response to ${destination}.`;
    }

    return getGenericResponseDeliveryFailure(error).message;
  }

  if (isSuccess) return isPost ? null : isRedirect
    ? 'The response was handed to your browser. Delivery is not confirmed here.'
    : 'No response was sent to the requester.';

  if (isPost) {
    return null;
  }

  if (isRedirect) {
    return null;
  }

  return 'Finishing this request.';
};

const AutoDeliverySheetContent = ({
  deliveryInfo,
  error,
  onLeaveWithoutSending,
  onRetry,
  status,
  phase,
  onDone,
}) => {
  const theme = useOnboardingTheme();
  const destination = deliveryInfo?.destinationHost || 'the requester';
  const isPost = deliveryInfo?.type === GENERIC_REQUEST_DELIVERY_TYPES.POST;
  const isRedirect =
    deliveryInfo?.type === GENERIC_REQUEST_DELIVERY_TYPES.REDIRECT;
  const isLoading = status === AUTO_DELIVERY_STATUS.LOADING;
  const isSuccess = status === AUTO_DELIVERY_STATUS.SUCCESS;
  const isError = status === AUTO_DELIVERY_STATUS.ERROR;

  const title = getAutoDeliverySheetTitle({
    destination,
    isError,
    isPost,
    isRedirect,
    isSuccess,
    isPreparing: isLoading && phase === 'preparing',
  });
  const message = getAutoDeliverySheetMessage({
    destination,
    error,
    isError,
    isPost,
    isRedirect,
    isSuccess,
  });
  return (
    <View style={autoDeliverySheetStyles.body}>
      {(isSuccess || isLoading) && (
        <View style={autoDeliverySheetStyles.visualSlot}>
          {isSuccess ? (
            <AnimatedSuccessCheckmark
              style={autoDeliverySheetStyles.successAnimation}
            />
          ) : (
            <LottieView
              autoPlay
              loop
              source={require('../../../animations/loading_7bars.json')}
              style={autoDeliverySheetStyles.loadingAnimation}
            />
          )}
        </View>
      )}
      <Text
        accessibilityRole={isLoading ? 'progressbar' : undefined}
        style={[
          theme.typography.titleSheet,
          {color: theme.colors.textPrimary},
        ]}>
        {title}
      </Text>
      {message && (
        <Text
          style={[
            autoDeliverySheetStyles.message,
            {color: theme.colors.textSecondary},
          ]}>
          {message}
        </Text>
      )}
      {isError && (
        <View style={autoDeliverySheetStyles.actions}>
          {getGenericResponseDeliveryFailure(error).canRetry && <AppButton height={52} onPress={onRetry} variant="primary">
            Try again
          </AppButton>}
          <AppButton
            height={52}
            onPress={onLeaveWithoutSending}
            variant="secondary">
            Leave without sending
          </AppButton>
        </View>
      )}
      {isSuccess && !isPost && (
        <View style={autoDeliverySheetStyles.actions}>
          <AppButton height={52} onPress={onDone} variant="primary">Done</AppButton>
        </View>
      )}
    </View>
  );
};

const AutoDeliverySheet = ({
  deliveryInfo,
  error,
  onLeaveWithoutSending,
  onRetry,
  status,
  phase,
  onDone,
}) => {
  const visible = status !== AUTO_DELIVERY_STATUS.IDLE;

  return (
    <BottomSheetModal
      closeDisabled
      contentContainerStyle={autoDeliverySheetStyles.sheet}
      maxHeight={AUTO_DELIVERY_SHEET_HEIGHT}
      onClose={() => {}}
      visible={visible}>
      <AutoDeliverySheetContent
        deliveryInfo={deliveryInfo}
        phase={phase}
        onDone={onDone}
        error={error}
        onLeaveWithoutSending={onLeaveWithoutSending}
        onRetry={onRetry}
        status={status}
      />
    </BottomSheetModal>
  );
};

const GenericRequestHome = props => {
  const {
    deeplinkData
  } = props;

  /**
   * @type {[GenericRequest, (GenericRequest) => {}]}
   */
  const [request, setRequest] = useState(null);
  const [response, setResponse] = useState(new primitives.GenericResponse());
  const responseRef = useRef(response);

  const [displayProps, setDisplayProps] = useState({});

  const [displayKey, setDisplayKey] = useState(null);

  const [detailIndex, setDetailIndex] = useState(0);

  const [valuInstalled, setValuInstalled] = useState(false);
  const [openInAnotherAppVisible, setOpenInAnotherAppVisible] = useState(false);
  const [verusIdDetailsModalProps, setVerusIdDetailsModalProps] =
    useState(null);
  const [autoDeliveryRequested, setAutoDeliveryRequested] = useState(false);
  const [autoDeliveryState, setAutoDeliveryState] = useState({
    status: AUTO_DELIVERY_STATUS.IDLE,
    deliveryInfo: null,
    error: null,
  });
  const [inlineDeliveryInProgress, setInlineDeliveryInProgress] =
    useState(false);
  const autoDeliverySingleFlightRef = useRef(null);
  const preparedAutoDeliveryRef = useRef(null);

  if (autoDeliverySingleFlightRef.current == null) {
    autoDeliverySingleFlightRef.current =
      createGenericRequestDeliverySingleFlight();
    preparedAutoDeliveryRef.current = createGenericResponseDelivery();
  }

  const autoDeliverySuccessTimeoutRef = useRef(null);
  const processGenerationRef = useRef(0);
  const passthrough = useSelector(state => state.deeplink.passthrough);
  const signedIn = useSelector(state => state.authentication.signedIn);
  const dispatch = useDispatch();
  const experimentalRequestsAllowed = useSelector(isExperimentalGenericRequestsEnabled);

  /**
   * @type {[number, (number) => {}]}
   */
  const [detailsProcessed, setDetailsProcessed] = useState(-1);

  /**
   * @type {[Array<number>, (Array<number>) => {}]}
   */
  const [processedDetailIndices, setProcessedDetailIndices] = useState([]);
  const cancelRequest = useCallback(() => {
    processGenerationRef.current += 1;
    props.cancel();
  }, [props.cancel]);

  /**
   * @type {Map<string, (GenericRequest, GenericResponse, number) => Promise<{
   *  displayProps?: { [key: string]: any };
   *  response: GenericResponse;
   *  handledIndices: Array<number>;
   * }>}
   */
  const detailHandlers = new Map();

  detailHandlers.set(VERUSPAY_INVOICE_DETAILS_VDXF_KEY.vdxfid, handleVerusPayInvoiceDetailsVDXFObject);
  detailHandlers.set(AUTHENTICATION_REQUEST_VDXF_KEY.vdxfid, handleAuthenticationRequestDetailsVDXFObject);
  detailHandlers.set(IDENTITY_UPDATE_REQUEST_VDXF_KEY.vdxfid, handleIdentityUpdateRequestDetailsVDXFObject);
  detailHandlers.set(PROVISION_IDENTITY_DETAILS_VDXF_KEY.vdxfid, handleProvisionIdentityDetailsVDXFObject);
  detailHandlers.set(APP_ENCRYPTION_REQUEST_VDXF_KEY.vdxfid, handleAppEncryptionRequestVDXFObject);
  detailHandlers.set(CREATE_WALLET_BACKUP_DETAILS_VDXF_KEY.vdxfid, handleCreateWalletBackupDetailsVDXFObject);
  detailHandlers.set(SPENDABLE_KEY_DETAILS_VDXF_KEY.vdxfid, handleSpendableKeyDetailsVDXFObject);
  detailHandlers.set(USER_DATA_REQUEST_VDXF_KEY.vdxfid, handleUserDataRequestVDXFObject);
  detailHandlers.set(DATA_PACKET_REQUEST_VDXF_KEY.vdxfid, handleDataPacketRequestVDXFObject);
  /**
   * Processes a detail in the request at a certain index
   * @param {number} index 
   */
  const processDetailAtIndex = async (index) => {
    const detail = request.getDetails(index);
    const currentResponse = responseRef.current;

    if (detail) {
      const iaddr = detail.getIAddressKey();

      if (
        !experimentalRequestsAllowed &&
        isExperimentalGenericRequestDetailKey(iaddr)
      ) {
        throw new Error(EXPERIMENTAL_DEEPLINK_DISABLED_MESSAGE);
      }

      if (detailHandlers.has(iaddr)) {
        if (
          passthrough?.skipWalletBackupRequests &&
          iaddr === CREATE_WALLET_BACKUP_DETAILS_VDXF_KEY.vdxfid
        ) {
          return {
            response: currentResponse,
            handledIndices: [index],
          };
        }

        setDetailIndex(index);
        return await detailHandlers.get(iaddr)(request, currentResponse, index);
      }
    } else throw new Error("Unable to find detail at index " + index);
  }

  const processNextDetail = async () => {
    const processGeneration = processGenerationRef.current + 1;
    processGenerationRef.current = processGeneration;
    const detailsLen = request.details.length;
    const numProcessed = processedDetailIndices.length;

    if (numProcessed < detailsLen) {
      for (let i = 0; i < request.details.length; i++) {
        if (!processedDetailIndices.includes(i)) {
          try {
            const res = await processDetailAtIndex(i);

            if (processGenerationRef.current !== processGeneration) return;

            const newIndices = [...processedDetailIndices];

            for (const processedIndex of res.handledIndices) {
              if (!processedDetailIndices.includes(processedIndex)) {
                newIndices.push(processedIndex);
              }
            }

            responseRef.current = res.response;
            setResponse(res.response);
            setProcessedDetailIndices(newIndices);

            if (res.displayProps) {
              setDisplayProps(res.displayProps)
              setDisplayKey(request.getDetails(i).getIAddressKey());
            } else {
              let newDetailsProcessed = detailsProcessed;

              for (const handledIndex of res.handledIndices) {
                if (!processedDetailIndices.includes(handledIndex)) {
                  newDetailsProcessed++;
                }
              }

              setDetailsProcessed(newDetailsProcessed)
            }

            return;
          } catch (e) {
            if (processGenerationRef.current !== processGeneration) return;

            createAlert("Error", e.message)
            cancelRequest()
            console.warn(e)
          }
        }
      }
    }
  }

  const completeRequest = useCallback(() => {
    processGenerationRef.current += 1;
    const resetAction = CommonActions.reset({
      index: 0,
      routes: [{name: signedIn ? 'SignedInStack' : 'SignedOutStack'}],
    });

    dispatch(resetDeeplinkData());
    props.navigation.dispatch(resetAction);
  }, [dispatch, props.navigation, signedIn]);

  const markSavedPendingRequestComplete = useCallback(async () => {
    const pendingRequestId =
      passthrough?.pendingDeeplinkId ||
      passthrough?.pendingProvisioningDeeplinkId;

    if (pendingRequestId) {
      try {
        await markPendingDeeplinkComplete(pendingRequestId);
      } catch (e) {
        console.warn('Unable to mark pending deeplink complete', e);
      }
    }
  }, [passthrough]);

  const runAutoDelivery = useCallback(async () => {
    if (request == null) return;
    if (autoDeliveryState.status === AUTO_DELIVERY_STATUS.LOADING) return;
    const generation = processGenerationRef.current;

    const requestBufferString = request.toBuffer().toString('hex');
    const currentResponse = responseRef.current;
    const responseBufferString =
      currentResponse.details && currentResponse.details.length > 0
        ? currentResponse.toBuffer().toString('hex')
        : '';
    const deliveryInfo = getGenericRequestDeliveryInfo(request);

    if (!autoDeliverySingleFlightRef.current.tryStart()) return;

    setAutoDeliveryState({
      status: AUTO_DELIVERY_STATUS.LOADING,
      deliveryInfo,
      error: null,
      phase: 'preparing',
    });

    try {
      const result = await preparedAutoDeliveryRef.current({
        requestBufferString,
        responseBufferString,
        onPhase: phase => setAutoDeliveryState(current => ({...current, phase})),
        assertCurrent: () => {
          if (generation !== processGenerationRef.current) throw new Error('Request closed');
        },
      });

      if (generation !== processGenerationRef.current) return;
      await markSavedPendingRequestComplete();

      setAutoDeliveryState({
        status: AUTO_DELIVERY_STATUS.SUCCESS,
        deliveryInfo: result,
        error: null,
      });

      if (result.type === GENERIC_REQUEST_DELIVERY_TYPES.POST) {
        autoDeliverySuccessTimeoutRef.current = setTimeout(() => {
          autoDeliverySuccessTimeoutRef.current = null;
          completeRequest();
        }, POST_SUCCESS_DELAY_MS);
        return;
      }

    } catch (e) {
      if (generation !== processGenerationRef.current) return;
      autoDeliverySingleFlightRef.current.clear();
      setAutoDeliveryState({
        status: AUTO_DELIVERY_STATUS.ERROR,
        deliveryInfo: e?.deliveryInfo || deliveryInfo,
        error: e,
      });
    }
  }, [
    autoDeliveryState.status,
    completeRequest,
    markSavedPendingRequestComplete,
    request,
  ]);

  const commitResponseProgress = (updatedResponse, handledIndices) => {
    let newDetailsProcessed = detailsProcessed;
    const newProcessedDetailIndices = [...processedDetailIndices];

    for (const handledIndex of handledIndices) {
      if (!newProcessedDetailIndices.includes(handledIndex)) {
        newProcessedDetailIndices.push(handledIndex);
        newDetailsProcessed++;
      }
    }

    if (request && newDetailsProcessed < request.details.length) {
      const navigationState = props.navigation.getState
        ? props.navigation.getState()
        : null;

      if (
        navigationState &&
        navigationState.type === 'stack' &&
        navigationState.index > 0 &&
        typeof props.navigation.popToTop === 'function'
      ) {
        props.navigation.popToTop();
      }
    }

    responseRef.current = updatedResponse;
    setResponse(updatedResponse);
    setProcessedDetailIndices(newProcessedDetailIndices);
    setDetailsProcessed(newDetailsProcessed);

    return newDetailsProcessed;
  };

  /**
   * Function passed to GUI elements that allows them to update handled
   * indices and response when done
   * @param {GenericResponse} updatedResponse
   * @param {Array<number>} handledIndices
   * @param {{autoDeliverOnComplete?: boolean}} options
   */
  const next = async (updatedResponse, handledIndices, options = {}) => {
    if (options.autoDeliverOnComplete) {
      setAutoDeliveryRequested(true);
    }

    commitResponseProgress(updatedResponse, handledIndices);
  }

  /**
   * Shared completion adapter for detail screens that should use the
   * centralized POST/redirect delivery sheet instead of the legacy
   * GenericRequestComplete route.
   */
  const completeWithDelivery = async (updatedResponse, handledIndices) => {
    return next(updatedResponse, handledIndices, {
      autoDeliverOnComplete: true,
    });
  };

  const deliverIdentityUpdateResponse = async (updatedResponse, handledIndices) => {
    setInlineDeliveryInProgress(true);

    const newDetailsProcessed = commitResponseProgress(
      updatedResponse,
      handledIndices,
    );

    if (request == null || newDetailsProcessed < request.details.length) {
      setInlineDeliveryInProgress(false);
      return {skippedInlineDelivery: true};
    }

    const requestBufferString = request.toBuffer().toString('hex');
    const responseBufferString =
      updatedResponse.details && updatedResponse.details.length > 0
        ? updatedResponse.toBuffer().toString('hex')
        : '';

    const result = await completeGenericResponseDelivery({
      requestBufferString,
      responseBufferString,
    });

    await markSavedPendingRequestComplete();

    if (result.type === GENERIC_REQUEST_DELIVERY_TYPES.POST) {
      autoDeliverySuccessTimeoutRef.current = setTimeout(() => {
        autoDeliverySuccessTimeoutRef.current = null;
        completeRequest();
      }, POST_SUCCESS_DELAY_MS);
      return result;
    }

    completeRequest();
    return result;
  }

  const getVerusId = useCallback(async (systemId, iAddrOrName) => {
    const identity = await getIdentity(systemId, iAddrOrName);

    if (identity.error) throw new Error(identity.error.message);
    return identity.result;
  }, []);

  const openVerusIdDetailsModal = useCallback((systemId, iAddress) => {
    setVerusIdDetailsModalProps({
      loadVerusId: () => getVerusId(systemId, iAddress),
      visible: true,
      animationType: 'slide',
      cancel: () => setVerusIdDetailsModalProps(null),
      loadFriendlyNames: async () => {
        try {
          const identityObj = await getVerusId(systemId, iAddress);

          return getFriendlyNameMap(systemId, identityObj);
        } catch (e) {
          return {
            ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV']: 'VRSC',
            ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq']: 'VRSCTEST',
          };
        }
      },
      iAddress,
      chain: systemId,
    });
  }, [getVerusId]);

  useEffect(() => {
    isDeeplinkHandlerInstalled(VALU_MOBILE_GENERIC_REQUEST_HANDLER_ID).then(installed => {
      setValuInstalled(installed);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    // Do not update after initial update
    if (request == null) {
      const req = new primitives.GenericRequest();
      req.fromBuffer(Buffer.from(deeplinkData, 'hex'));
      const initializedResponse = alignGenericResponseNetwork(
        req,
        new primitives.GenericResponse(),
      );

      responseRef.current = initializedResponse;
      setResponse(initializedResponse);
      setRequest(req);
      setDetailsProcessed(0);
    }
  }, [deeplinkData]);

  useEffect(() => {
    return () => {
      processGenerationRef.current += 1;

      if (autoDeliverySuccessTimeoutRef.current) {
        clearTimeout(autoDeliverySuccessTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (request != null) {
      const completionAction = getGenericRequestCompletionAction({
        autoDeliveryRequested,
        autoDeliveryStatus: autoDeliveryState.status,
        detailCount: request.details.length,
        detailsProcessed,
        inlineDeliveryInProgress,
      });

      if (completionAction === GENERIC_REQUEST_COMPLETION_ACTIONS.WAIT) {
        return;
      }

      if (
        completionAction ===
        GENERIC_REQUEST_COMPLETION_ACTIONS.PROCESS_NEXT_DETAIL
      ) {
        setDisplayKey(null);
        setDisplayProps({});
        processNextDetail();
        return;
      }

      if (
        completionAction ===
        GENERIC_REQUEST_COMPLETION_ACTIONS.RUN_AUTO_DELIVERY
      ) {
        runAutoDelivery();
        return;
      }

      const responseBufferString = response.details && response.details.length > 0
        ? response.toBuffer().toString('hex')
        : '';
      const requestBufferString = request.toBuffer().toString('hex');

      props.navigation.navigate('GenericRequestComplete', {
        requestBufferString,
        responseBufferString
      });
    }
  }, [
    autoDeliveryRequested,
    autoDeliveryState.status,
    detailsProcessed,
    inlineDeliveryInProgress,
    request,
    runAutoDelivery,
    response,
  ]);

  const insets = useSafeAreaInsets();

  const screens = {
    [AUTHENTICATION_REQUEST_VDXF_KEY.vdxfid]: () => (
      <AuthenticationRequestInfo
        {...displayProps}
        cancel={cancelRequest}
        setLoading={props.setLoading}
        navigation={props.navigation}
        next={next}
        response={response}
        request={request}
        detailIndex={detailIndex}
      />
    ),
    [IDENTITY_UPDATE_REQUEST_VDXF_KEY.vdxfid]: () => (
      <IdentityUpdateRequestInfo
        {...displayProps}
        cancel={cancelRequest}
        setLoading={props.setLoading}
        navigation={props.navigation}
        requestBufferString={request.toBuffer().toString('hex')}
        responseBufferString={
          response.details && response.details.length > 0
            ? response.toBuffer().toString('hex')
            : ''
        }
        detailIndex={detailIndex}
        deliverIdentityUpdateResponse={deliverIdentityUpdateResponse}
        identityUpdateDeliveryInfo={getGenericRequestDeliveryInfo(request)}
        completeIdentityUpdateWithoutDelivery={completeRequest}
        next={next}
      />
    ),
    [VERUSPAY_INVOICE_DETAILS_VDXF_KEY.vdxfid]: () => (
      <InvoiceInfo
        {...displayProps}
        cancel={cancelRequest}
        setLoading={props.setLoading}
        navigation={props.navigation}
        next={next}
        response={response}
        request={request}
        detailIndex={detailIndex}
      />
    ),
    [APP_ENCRYPTION_REQUEST_VDXF_KEY.vdxfid]: () => (
      <AppEncryptionRequestInfo
        {...displayProps}
        cancel={cancelRequest}
        setLoading={props.setLoading}
        navigation={props.navigation}
        next={next}
        response={response}
        request={request}
        detailIndex={detailIndex}
      />
    ),
    [USER_DATA_REQUEST_VDXF_KEY.vdxfid]: () => (
      <UserDataRequestInfo
        {...displayProps}
        cancel={cancelRequest}
        setLoading={props.setLoading}
        navigation={props.navigation}
        next={next}
        response={response}
        request={request}
        detailIndex={detailIndex}
      />
    ),
    [DATA_PACKET_REQUEST_VDXF_KEY.vdxfid]: () => (
      <DataPacketRequestInfo
        {...displayProps}
        cancel={cancelRequest}
        setLoading={props.setLoading}
        navigation={props.navigation}
        next={next}
        response={response}
        request={request}
        detailIndex={detailIndex}
      />
    ),
    [CREATE_WALLET_BACKUP_DETAILS_VDXF_KEY.vdxfid]: () => (
      <WalletBackupRequestInfo
        {...displayProps}
        cancel={cancelRequest}
        setLoading={props.setLoading}
        navigation={props.navigation}
        next={next}
        response={response}
        request={request}
        detailIndex={detailIndex}
      />
    ),
    [SPENDABLE_KEY_DETAILS_VDXF_KEY.vdxfid]: () => (
      <SpendableKeyRequestInfo
        {...displayProps}
        cancel={cancelRequest}
        completeWithDelivery={completeWithDelivery}
        setLoading={props.setLoading}
        navigation={props.navigation}
        next={next}
        pendingDeeplinkId={passthrough?.pendingDeeplinkId || null}
        response={response}
        request={request}
        detailIndex={detailIndex}
        openVerusIdDetailsModal={openVerusIdDetailsModal}
      />
    )
  };

  // Keep handler selection and alternate-app routing explicit; integrated by Codex GPT-5 so new VDXF types do not bypass the redesign flow.
  const openInValu = () => {
    const originalUri = request.toWalletDeeplinkUri();
    const redirectUri = originalUri.replace(
      `${DEEPLINK_PROTOCOL_URL_STRING}://`,
      `${DEEPLINK_PROTOCOL_URL_STRING}${VALU_MOBILE_GENERIC_REQUEST_HANDLER_ID}://`
    );
    Linking.openURL(redirectUri).catch(e => createAlert('Error', e.message));
  };

  return (
    <View style={Styles.flexBackground}>
      {displayKey == null ? (
        <GenericRequestLoading
          activeStep={GENERIC_REQUEST_LOADING_STEPS.REVIEW}
          onCancel={cancelRequest}
        />
      ) : props.loading ? (
        <AnimatedActivityIndicatorBox />
      ) : (
        <View style={{ flex: 1, marginTop: valuInstalled ? 100 : 0 }}>
          {screens[displayKey]()}
        </View>
      )}
      {valuInstalled && displayKey != null && !props.loading && (
        <TouchableOpacity
          onPress={() => setOpenInAnotherAppVisible(true)}
          style={{
            position: 'absolute',
            top: insets.top + 6,
            right: 16,
            zIndex: 10,
            backgroundColor: Colors.primaryColor,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
          }}
        >
          <Text style={{ color: Colors.secondaryColor, fontSize: 12 }}>Open in another app</Text>
        </TouchableOpacity>
      )}
      <AutoDeliverySheet
        deliveryInfo={autoDeliveryState.deliveryInfo}
        phase={autoDeliveryState.phase}
        onDone={completeRequest}
        error={autoDeliveryState.error}
        onLeaveWithoutSending={completeRequest}
        onRetry={runAutoDelivery}
        status={autoDeliveryState.status}
      />
      <Portal>
        {verusIdDetailsModalProps != null && (
          <VerusIdDetailsModal {...verusIdDetailsModalProps} />
        )}
        <ListSelectionModal
          visible={openInAnotherAppVisible}
          cancel={() => setOpenInAnotherAppVisible(false)}
          title="Open in another app"
          data={[{ key: 'valu', title: 'Open in Valu Mobile' }]}
          onSelect={openInValu}
          flexHeight={0.5}
        />
      </Portal>
    </View>
  );
};

export default GenericRequestHome;
