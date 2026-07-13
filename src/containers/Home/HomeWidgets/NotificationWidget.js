import React, {useMemo} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {
  NOTIFICATION_ICON_ERROR,
  NOTIFICATION_ICON_VERUSID,
  NOTIFICATION_TYPE_LOADING,
  NOTIFICATION_TYPE_VERUS_ID_PROVISIONING,
} from '../../../utils/constants/notifications';
import {dispatchRemoveNotification} from '../../../actions/actions/notifications/dispatchers/notifications';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {fontStyle} from '../../../globals/fonts';
import {VerusIdProvisioningNotification} from '../../../utils/notification';
import {processVerusId} from '../../Services/ServiceComponents/VerusIdService/VerusIdLogin';

const getStateColors = (theme, notification) => {
  if (notification.iconType === NOTIFICATION_ICON_ERROR) {
    return {
      background: theme.isDark ? 'rgba(255, 107, 117, 0.18)' : '#FEE2E2',
      text: theme.colors.danger,
    };
  }
  if (notification.type === NOTIFICATION_TYPE_LOADING) {
    return {
      background: theme.isDark ? 'rgba(255, 178, 92, 0.18)' : '#FFF4E5',
      text: theme.colors.warning,
    };
  }
  return {
    background: theme.isDark ? 'rgba(49, 101, 212, 0.2)' : '#EBF6FF',
    text: theme.colors.primary,
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
        return notification;
      })
      .filter(notification =>
        typeof notification.isActionable === 'function'
          ? notification.isActionable()
          : false,
      );
  }, [accountHash, notifications]);

  if (actionableNotifications.length === 0) return null;

  return (
    <View style={styles.container}>
      {actionableNotifications.map((notification, index) => {
        const segments = Array.isArray(notification.title)
          ? notification.title
          : [notification.title];
        const highlight = segments[0]?.trim() ?? '';
        const remainder = segments.slice(1).join(' ').replace(/\s+/g, ' ').trim();
        const stateColors = getStateColors(theme, notification);
        return (
          <View
            key={notification.uid}
            style={[
              styles.card,
              {backgroundColor: theme.colors.surfaceMuted},
              index < actionableNotifications.length - 1 && styles.cardSpacing,
            ]}>
            <View style={styles.contentRow}>
              <View style={styles.textContent}>
                <Text numberOfLines={2} style={[styles.title, {color: theme.colors.textPrimary}]}>
                  <Text style={styles.highlight}>{highlight}</Text>
                  {remainder.length > 0 ? ` ${remainder}` : ''}
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.8}
                  onPress={() => notification.onAction({navigation, dispatch})}
                  style={[styles.ctaButton, {backgroundColor: stateColors.background}]}>
                  <Text style={[styles.ctaText, {color: stateColors.text}]}>{formatCtaLabel(notification.body)}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                accessibilityLabel="Dismiss notification"
                accessibilityRole="button"
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                onPress={() => dispatchRemoveNotification(notification.uid)}
                style={[styles.dismissButton, {backgroundColor: theme.colors.surface}]}>
                <Text style={[styles.dismissText, {color: theme.colors.textSubtle}]}>×</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {paddingTop: 4, paddingBottom: 6},
  card: {width: '100%', borderRadius: 12, overflow: 'hidden'},
  cardSpacing: {marginBottom: 10},
  contentRow: {flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, paddingLeft: 14, paddingRight: 10},
  textContent: {flex: 1, marginRight: 8},
  title: {fontSize: 15, lineHeight: 21, marginBottom: 8, ...fontStyle('semiBold')},
  highlight: {...fontStyle('semiBold')},
  ctaButton: {alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16},
  ctaText: {fontSize: 13, lineHeight: 18, ...fontStyle('bold')},
  dismissButton: {width: 26, height: 26, borderRadius: 13, marginTop: -2, alignItems: 'center', justifyContent: 'center'},
  dismissText: {fontSize: 18, lineHeight: 18},
});

export default NotificationWidget;
