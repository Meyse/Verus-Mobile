import {registrationNotifications} from '../../../utils/identityRegistration/notifications';
import React, {useMemo} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import AppButton from '../../../components/AppButton';
import {
  NOTIFICATION_ICON_ERROR,
  NOTIFICATION_ICON_VERUSID,
  NOTIFICATION_TYPE_BASIC,
  NOTIFICATION_TYPE_LOADING,
  NOTIFICATION_TYPE_VERUS_ID_PROVISIONING,
} from '../../../utils/constants/notifications';
import {
  dispatchAddNotification,
  dispatchRemoveNotification,
} from '../../../actions/actions/notifications/dispatchers/notifications';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {fontStyle} from '../../../globals/fonts';
import {BasicNotification, LoadingNotification, VerusIdProvisioningNotification} from '../../../utils/notification';
import VerusIdReadyCard from './VerusIdReadyCard';

// Preserve the existing failed-provisioning wording for old saved notices.
const getNotificationCopy = notification => {
  const segments = Array.isArray(notification.title)
    ? notification.title
    : [notification.title];
  const highlight = segments[0]?.trim() ?? '';

  if (notification.iconType === NOTIFICATION_ICON_ERROR && notification.type === NOTIFICATION_TYPE_VERUS_ID_PROVISIONING) {
    return {highlight, remainder: 'could not be created', label: 'Try again'};
  }

  return {
    highlight,
    remainder: segments.slice(1).join(' ').replace(/\s+/g, ' ').trim(),
    label: formatCtaLabel(notification.body),
  };
};

const formatCtaLabel = body => {
  if (typeof body !== 'string' || body.trim().length === 0) return 'Continue';
  const trimmed = body.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

const NotificationWidget = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const theme = useOnboardingTheme();
  const isFocused = useIsFocused();
  const notifications = useObjectSelector(state => state.notifications);
  const activeAccount = useSelector(state => state.authentication.activeAccount);
  const accountHash = activeAccount?.accountHash ?? null;
  const jobs = useObjectSelector(state => state.channelStore_verusid.registrationJobs || {});
  const registrationNotices = registrationNotifications(jobs, accountHash);

  const actionableNotifications = useMemo(() => {
    if (!notifications?.directory || !accountHash) return [];
    return Object.entries(notifications.directory)
      .filter(
        ([, value]) =>
          value.acchash === accountHash &&
          [NOTIFICATION_TYPE_VERUS_ID_PROVISIONING, NOTIFICATION_TYPE_BASIC, NOTIFICATION_TYPE_LOADING].includes(value.type),
      )
      .map(([uid, value]) => {
        const notification = value.type === NOTIFICATION_TYPE_BASIC
          ? BasicNotification.fromJson(value)
          : value.type === NOTIFICATION_TYPE_LOADING
          ? LoadingNotification.fromJson(value)
          : VerusIdProvisioningNotification.fromJson(
              value,
              ({navigation: targetNavigation}, _identityAddress, chain) =>
                targetNavigation.navigate('IdentityTab', {screen: 'LinkIdentities', params: {chain}}),
            );
        notification.uid = uid;
        notification.iconType = value.icon ?? NOTIFICATION_ICON_VERUSID;
        notification.celebrated = value.celebrated === true;
        return notification;
      });
  }, [accountHash, notifications]);

  // The celebration plays once: the stored notification remembers it.
  const markCelebrated = uid => {
    const entry = notifications?.directory?.[uid];

    if (entry && entry.celebrated !== true) {
      dispatchAddNotification({...entry, uid, celebrated: true});
    }
  };

  if (actionableNotifications.length === 0 && registrationNotices.length === 0) return null;

  return (
    <View style={styles.container}>
      {registrationNotices.map(notice => (
        <View key={notice.uid} style={[styles.card, styles.cardSpacing, {backgroundColor: theme.colors.surfaceMuted}]}>
          <Text style={[styles.title, {color: theme.colors.textPrimary}]}>
            <Text style={styles.highlight}>{notice.identityName}</Text>{' '}{notice.statusText}
          </Text>
          <AppButton compact height={36} variant="secondary" themeMode={theme.mode}
            buttonColor={theme.colors.surface} labelStyle={styles.actionLabel} style={styles.action}
            onPress={() => notice.onAction({navigation, dispatch})}>
            {notice.body}
          </AppButton>
        </View>
      ))}
      {actionableNotifications.map((notification, index) => {
        const {highlight, label, remainder} = getNotificationCopy(notification);

        if (notification.iconType !== NOTIFICATION_ICON_ERROR && notification.isActionable()) {
          return (
            <View
              key={notification.uid}
              style={
                index < actionableNotifications.length - 1 && styles.cardSpacing
              }>
              <VerusIdReadyCard
                active={isFocused}
                celebrate={!notification.celebrated}
                highlight={highlight}
                label={label}
                onAction={() => notification.onAction({navigation, dispatch})}
                onCelebrated={() => markCelebrated(notification.uid)}
                onDismiss={() => dispatchRemoveNotification(notification.uid)}
                remainder={remainder}
                theme={theme}
              />
            </View>
          );
        }

        return (
          <View
            key={notification.uid}
            style={[
              styles.card,
              {backgroundColor: theme.colors.surfaceMuted},
              index < actionableNotifications.length - 1 && styles.cardSpacing,
            ]}>
            <View style={styles.topRow}>
              <Text style={[styles.title, {color: theme.colors.textPrimary}]}>
                <Text style={styles.highlight}>{highlight}</Text>
                {remainder.length > 0 ? ` ${remainder}` : ''}
              </Text>
              <TouchableOpacity
                accessibilityLabel="Dismiss notification"
                accessibilityRole="button"
                onPress={() => dispatchRemoveNotification(notification.uid)}
                style={styles.dismissButton}>
                <MaterialCommunityIcons
                  color={theme.colors.textSubtle}
                  name="close"
                  size={20}
                />
              </TouchableOpacity>
            </View>
            {!notification.isActionable() && !!notification.body && (
              <Text style={[theme.typography.bodySm, {color: theme.colors.textSecondary}]}>
                {notification.body}
              </Text>
            )}
            {/* The page color, not the light-blue tint: the tint disappears
                on the gray card (owner-approved card A, 2026-10-22). */}
            {notification.isActionable() && <AppButton
              buttonColor={theme.colors.surface}
              compact
              height={36}
              labelStyle={styles.actionLabel}
              onPress={() => notification.onAction({navigation, dispatch})}
              style={styles.action}
              themeMode={theme.mode}
              variant="secondary">
              {label}
            </AppButton>}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {paddingTop: 4, paddingBottom: 6},
  card: {
    width: '100%',
    borderRadius: 18,
    paddingTop: 14,
    paddingRight: 4,
    paddingBottom: 16,
    paddingLeft: 16,
  },
  cardSpacing: {marginBottom: 10},
  topRow: {flexDirection: 'row', alignItems: 'flex-start'},
  title: {
    flex: 1,
    paddingTop: 1,
    fontSize: 16,
    lineHeight: 22,
    ...fontStyle('regular'),
  },
  highlight: {...fontStyle('semiBold')},
  // A 44-point target around the 20-point icon, centered on the first line.
  dismissButton: {
    width: 44,
    height: 44,
    marginTop: -11,
    marginBottom: -11,
    marginLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  action: {alignSelf: 'flex-start', marginTop: 12, borderRadius: 12},
  actionLabel: {
    fontSize: 14,
    lineHeight: 19,
    marginVertical: 0,
    marginHorizontal: 14,
  },
});

// The connection notice on Home uses the same gray card.
export {styles as noticeCardStyles};

export default NotificationWidget;
