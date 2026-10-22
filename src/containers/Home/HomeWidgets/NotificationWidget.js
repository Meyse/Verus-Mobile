import React, {useMemo} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import AppButton from '../../../components/AppButton';
import {
  NOTIFICATION_ICON_ERROR,
  NOTIFICATION_ICON_VERUSID,
  NOTIFICATION_TYPE_VERUS_ID_PROVISIONING,
} from '../../../utils/constants/notifications';
import {
  dispatchAddNotification,
  dispatchRemoveNotification,
} from '../../../actions/actions/notifications/dispatchers/notifications';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {fontStyle} from '../../../globals/fonts';
import {VerusIdProvisioningNotification} from '../../../utils/notification';
import {processVerusId} from '../../Services/ServiceComponents/VerusIdService/VerusIdLogin';
import VerusIdReadyCard from './VerusIdReadyCard';

// A failed VerusID request reads "<name>@ could not be created" with "Try
// again", also for notifications stored with the older wording.
const getNotificationCopy = notification => {
  const segments = Array.isArray(notification.title)
    ? notification.title
    : [notification.title];
  const highlight = segments[0]?.trim() ?? '';

  if (notification.iconType === NOTIFICATION_ICON_ERROR) {
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

  const actionableNotifications = useMemo(() => {
    if (!notifications?.directory || !accountHash) return [];
    return Object.entries(notifications.directory)
      .filter(
        ([, value]) =>
          value.acchash === accountHash &&
          value.type === NOTIFICATION_TYPE_VERUS_ID_PROVISIONING,
      )
      .map(([uid, value]) => {
        const notification = VerusIdProvisioningNotification.fromJson(
          value,
          processVerusId,
        );
        notification.uid = uid;
        notification.iconType = value.icon ?? NOTIFICATION_ICON_VERUSID;
        notification.celebrated = value.celebrated === true;
        return notification;
      })
      .filter(notification =>
        typeof notification.isActionable === 'function'
          ? notification.isActionable()
          : false,
      );
  }, [accountHash, notifications]);

  // The celebration plays once: the stored notification remembers it.
  const markCelebrated = uid => {
    const entry = notifications?.directory?.[uid];

    if (entry && entry.celebrated !== true) {
      dispatchAddNotification({...entry, uid, celebrated: true});
    }
  };

  if (actionableNotifications.length === 0) return null;

  return (
    <View style={styles.container}>
      {actionableNotifications.map((notification, index) => {
        const {highlight, label, remainder} = getNotificationCopy(notification);

        if (notification.iconType !== NOTIFICATION_ICON_ERROR) {
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
            {/* The page color, not the light-blue tint: the tint disappears
                on the gray card (owner-approved card A, 2026-10-22). */}
            <AppButton
              buttonColor={theme.colors.surface}
              compact
              height={36}
              labelStyle={styles.actionLabel}
              onPress={() => notification.onAction({navigation, dispatch})}
              style={styles.action}
              themeMode={theme.mode}
              variant="secondary">
              {label}
            </AppButton>
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

export default NotificationWidget;
