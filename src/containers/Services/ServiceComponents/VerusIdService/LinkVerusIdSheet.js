import React, {useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Text, View} from 'react-native';
import {Check, CircleAlert} from 'lucide-react-native';
import {useSelector} from 'react-redux';
import BottomSheetModal from '../../../../components/BottomSheetModal';
import AppButton from '../../../../components/AppButton';
import SafeBottomActionStack from '../../../../components/SafeBottomActionStack';
import {createSignedOutSheetStyles} from '../../../../styles';
import {useAppTheme} from '../../../../theme/app';
import {createRegistrationContext, linkRegisteredIdentity} from '../../../../utils/identityRegistration';
import {captureIdentityLinkContext, discoverLinkableIdentities, linkSelectedIdentities} from '../../../../utils/identityLinking/identityLinking';
import {dispatchRemoveNotification} from '../../../../actions/actions/notifications/dispatchers/notifications';
import {isVerusIdTransportError, verusIdErrorMessage} from './verusIdErrors';

// Mount on the surface that opened it. One tap starts one session-scoped link.
// A target is retained through closing so its title does not disappear early.
export default function LinkVerusIdSheet({target, onClose, onDone}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createSignedOutSheetStyles(theme), [theme]);
  const session = useSelector(state => `${state.authentication.activeAccount?.accountHash}:${state.authentication.sessionEpoch || 0}`);
  const [retained, setRetained] = useState(target);
  const [state, setState] = useState('busy');
  const [error, setError] = useState(null);
  const running = useRef(false);
  const version = useRef(0);
  const done = useRef(false);
  const openingSession = useRef(session);
  const start = async item => {
    if (!item || running.current) return;
    running.current = true;
    const token = ++version.current;
    setState('busy'); setError(null);
    try {
      if (item.jobId) await linkRegisteredIdentity(item.jobId, createRegistrationContext());
      else {
        const context = captureIdentityLinkContext(item.chain);
        const identities = await discoverLinkableIdentities(context);
        const identity = identities.find(row => row.identityAddress === item.identityAddress);
        if (!identity) throw new Error('This wallet cannot link this VerusID. Check its control address.');
        const result = await linkSelectedIdentities({context, identities: [identity]});
        if (result.failed.length) throw result.failed[0].error;
        if (result.refreshError) throw result.refreshError;
        if (item.notificationUid) dispatchRemoveNotification(item.notificationUid);
      }
      if (token === version.current) setState('done');
    } catch (failure) {
      if (token === version.current && failure.code !== 'SESSION_CHANGED') {
        setState('failed');
        setError(isVerusIdTransportError(failure) ? 'Could not reach the server. Check your connection.' : verusIdErrorMessage(failure));
      }
    } finally { if (token === version.current) running.current = false; }
  };
  useEffect(() => {
    openingSession.current = session;
    if (target) { setRetained(target); done.current = false; start(target); }
    return () => { ++version.current; running.current = false; };
  }, [target]);
  useEffect(() => {
    if (openingSession.current !== session) {
      ++version.current; running.current = false; done.current = false;
      onClose();
    }
  }, [session]);
  const close = completed => {
    if (running.current) return;
    done.current = completed;
    onClose();
  };
  const name = retained?.name || 'VerusID';
  const color = state === 'done' ? theme.colors.successText : state === 'failed' ? theme.colors.dangerText : theme.colors.primary;
  return <BottomSheetModal visible={!!target} maxHeight="60%" closeDisabled={state === 'busy'}
    onClose={() => close(state === 'done')} onClosed={() => {if (done.current) onDone?.(retained); setRetained(null);}}>
    <View style={[styles.body, styles.bodyShort]}>
      <View style={{width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 14,
        backgroundColor: state === 'done' ? theme.colors.successBackground : state === 'failed' ? theme.colors.dangerBackground : theme.colors.surfaceMuted}}>
        {state === 'busy' ? <ActivityIndicator color={color} size="small" /> : state === 'done' ? <Check size={26} color={color} /> : <CircleAlert size={26} color={color} />}
      </View>
      <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={[theme.typography.titleSheet, {color: theme.colors.textPrimary}]}>
        {state === 'busy' ? `Linking ${name}` : state === 'done' ? `${name} is linked` : `${name} is not linked`}
      </Text>
      {state !== 'busy' && <Text style={[theme.typography.bodySm, {color: theme.colors.textSecondary, marginTop: 8}]}>{state === 'done' ? 'It is in the VerusID tab.' : error}</Text>}
      {state !== 'busy' && <SafeBottomActionStack horizontalSpacing={0} bottomSpacing={12} includeBottomInset={false} gap={10} style={{marginTop: 24}}>
        <AppButton onPress={state === 'done' ? () => close(true) : () => start(retained)}>{state === 'done' ? 'Done' : 'Try again'}</AppButton>
        {state === 'failed' && <AppButton variant="secondary" onPress={() => close(false)}>Not now</AppButton>}
      </SafeBottomActionStack>}
    </View>
  </BottomSheetModal>;
}
