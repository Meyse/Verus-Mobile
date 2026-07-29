/*
  GenericRequestComplete
  - 2026-02-05: Redesigned UI to match stepper visual language. SafeAreaView layout
  with mainTitle header, centered checkmark, context-aware response notice card,
  single gradient "Complete" button in footer bar. Removed Cancel button (action
  is already done, skipping response delivery is bad UX). Updated notice copy:
  redirect shows "You'll be redirected to {host} to finish", POST shows
  "Your response will be sent to the requester".
  - 2026-03-11: Clarified that the surfaced txid belongs to the identity update transaction .
  - 2026-04-08: Reintroduced a guarded cancel escape hatch after a POST response URI
  fails so users can leave the screen after at least one delivery attempt.
*/
import React, { useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { CommonActions } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedSuccessCheckmark from '../../../components/AnimatedSuccessCheckmark';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import CopyAction from '../../../components/CopyAction';
import GradientButton from '../../../components/GradientButton';
import { resetDeeplinkData } from '../../../actions/actionCreators';
import {
  GenericRequest,
  GenericResponse,
  IDENTITY_UPDATE_RESPONSE_VDXF_KEY,
} from 'verus-typescript-primitives';
import { createAlert, resolveAlert } from '../../../actions/actions/alert/dispatchers/alert';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { genericRequestCompleteStyles as styles } from '../../../styles';
import { markPendingDeeplinkComplete } from '../../../utils/deeplink/pendingDeeplinkStorage';
import {
  completeGenericResponseDelivery,
  GENERIC_REQUEST_DELIVERY_TYPES,
  getGenericRequestDeliveryInfo,
} from '../../../utils/deeplink/genericRequestDelivery';

const GenericRequestComplete = props => {
  const { requestBufferString, responseBufferString } = props.route.params;
  const insets = useSafeAreaInsets();
  const bottomNavigationInset = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? 24 : 0,
  );
  const footerBottomPadding = 16 + bottomNavigationInset;
  const signedIn = useSelector(state => state.authentication.signedIn);
  const passthrough = useSelector(state => state.deeplink.passthrough);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [postFailed, setPostFailed] = useState(false);

  const completeRequest = () => {
    const resetAction = CommonActions.reset({
      index: 0,
      routes: [{name: signedIn ? 'SignedInStack' : 'SignedOutStack'}],
    });

    dispatch(resetDeeplinkData());
    props.navigation.dispatch(resetAction);
  };

  const markSavedPendingRequestComplete = async () => {
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
  };

  const responseNotice = useMemo(() => {
    if (!requestBufferString || !responseBufferString) return null;

    try {
      const request = new GenericRequest();
      request.fromBuffer(Buffer.from(requestBufferString, 'hex'), 0);

      const deliveryInfo = getGenericRequestDeliveryInfo(request);

      if (deliveryInfo.type === GENERIC_REQUEST_DELIVERY_TYPES.POST) {
        const responseLabel = request.hasEncryptResponseToAddress()
          ? 'Your encrypted response'
          : 'Your response';
        return `${responseLabel} will be sent to ${deliveryInfo.destinationHost}`;
      }

      if (deliveryInfo.type === GENERIC_REQUEST_DELIVERY_TYPES.REDIRECT) {
        return `You'll be redirected to ${deliveryInfo.destinationHost} to finish`;
      }
    } catch (e) {
      return null;
    }

    return null;
  }, [requestBufferString, responseBufferString]);

  const identityUpdateTxid = useMemo(() => {
    if (!responseBufferString) return null;

    try {
      const response = new GenericResponse();
      response.fromBuffer(Buffer.from(responseBufferString, 'hex'), 0);

      if (!response.details || response.details.length === 0) return null;

      for (const detail of response.details) {
        if (!detail || !detail.getIAddressKey || detail.getIAddressKey() !== IDENTITY_UPDATE_RESPONSE_VDXF_KEY.vdxfid) {
          continue;
        }

        if (
          detail.data &&
          typeof detail.data.containsTxid === 'function' &&
          typeof detail.data.getTxidString === 'function' &&
          detail.data.containsTxid()
        ) {
          return detail.data.getTxidString();
        }
      }
    } catch (e) {
      return null;
    }

    return null;
  }, [responseBufferString]);

  const onCancel = async () => {
    const shouldCancel = await createAlert(
      'Cancel response?',
      'If you cancel now, the response will not be sent back to the requester.',
      [
        {
          text: 'Keep trying',
          style: 'cancel',
          onPress: () => resolveAlert(false),
        },
        {
          text: 'Cancel response',
          style: 'destructive',
          onPress: () => resolveAlert(true),
        },
      ],
      { cancelable: true }
    );

    if (shouldCancel) {
      completeRequest();
    }
  };

  const truncate = (value, start = 8, end = 6) => {
    if (!value) return '';
    if (value.length <= start + end + 3) return value;
    return `${value.slice(0, start)}...${value.slice(-end)}`;
  };

  // Keep the redesigned success UI while stamping and verifying the response metadata; integrated by Codex GPT-5 to match the upstream protocol path.
  const onComplete = async () => {
    try {
      setLoading(true);

      await completeGenericResponseDelivery({
        requestBufferString,
        responseBufferString,
      });
      await markSavedPendingRequestComplete();
    } catch (e) {
      if (e?.isResponsePostError) {
        setPostFailed(true);
      }

      createAlert('Error', e?.message || 'Failed to complete the request.');
      console.warn(e);
      setLoading(false);
      return;
    }

    completeRequest();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <AnimatedActivityIndicatorBox />
          <Text style={styles.loadingText}>Completing request...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Centered success content */}
      <View style={styles.centerContent}>
        <Text style={styles.mainTitle}>Success</Text>

        <View style={styles.checkmarkContainer}>
          <AnimatedSuccessCheckmark
            style={{ width: 128 }}
          />
        </View>

        {identityUpdateTxid && (
          <View style={styles.txidCard}>
            <View style={styles.txidRow}>
              <Text style={styles.txidLabel}>Identity update txid</Text>
              <View style={styles.txidValueRow}>
                <Text style={styles.txidValue} numberOfLines={1}>
                  {truncate(identityUpdateTxid)}
                </Text>
                <CopyAction
                  accessibilityLabel="Copy transaction ID"
                  copiedAccessibilityLabel="Transaction ID copied"
                  style={styles.txidCopyButton}
                  value={identityUpdateTxid}
                />
              </View>
            </View>
          </View>
        )}

        {responseNotice && (
          <View style={styles.noticeCard}>
            <MaterialCommunityIcons
              name="information-outline"
              size={18}
              color="#666"
              style={{ marginRight: 8, marginTop: 1 }}
            />
            <Text style={styles.noticeText}>{responseNotice}</Text>
          </View>
        )}
      </View>

      {/* Footer actions */}
      <View style={[styles.footer, {paddingBottom: footerBottomPadding}]}>
        {postFailed && (
          <View style={styles.ctaCol}>
            <Button
              mode="outlined"
              onPress={onCancel}
              style={styles.secondaryCta}
              contentStyle={styles.secondaryCtaContent}
              labelStyle={styles.secondaryCtaLabel}
            >
              Cancel
            </Button>
          </View>
        )}
        <View style={styles.ctaCol}>
          <GradientButton
            onPress={onComplete}
            style={styles.completeButton}
          >
            Complete
          </GradientButton>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default GenericRequestComplete;
