import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import AppButton from '../../../components/AppButton';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {noticeCardStyles as styles} from './NotificationWidget';

export const CONNECTION_NOTICE_OFFLINE = 'offline';
export const CONNECTION_NOTICE_UNREACHABLE = 'unreachable';

const COPY = {
  [CONNECTION_NOTICE_OFFLINE]: 'No internet connection.',
  [CONNECTION_NOTICE_UNREACHABLE]: 'Could not connect.',
};

// Card A from the Home notifications, without the close icon: the notice
// goes away by itself when balances update again. Offline, the wallet
// refreshes when the connection returns, so there is no button.
const ConnectionNotice = ({kind, loading, onRetry}) => {
  const theme = useOnboardingTheme();

  if (!COPY[kind]) return null;

  return (
    <View style={styles.container}>
      <View
        accessibilityLiveRegion="polite"
        style={[
          styles.card,
          localStyles.card,
          {backgroundColor: theme.colors.surfaceMuted},
        ]}>
        {/* The title flexes in a row, as in card A; in the column it would
            collapse to no height. */}
        <View style={styles.topRow}>
          <Text style={[styles.title, {color: theme.colors.textPrimary}]}>
            <Text style={styles.highlight}>{COPY[kind]}</Text>
            {' Balances may be out of date.'}
          </Text>
        </View>
        {kind === CONNECTION_NOTICE_UNREACHABLE ? (
          <AppButton
            buttonColor={theme.colors.surface}
            compact
            height={36}
            labelStyle={styles.actionLabel}
            loading={loading}
            onPress={onRetry}
            style={styles.action}
            themeMode={theme.mode}
            variant="secondary">
            Try again
          </AppButton>
        ) : null}
      </View>
    </View>
  );
};

// Without the close icon the text keeps the card's 16-point inset on the right.
const localStyles = StyleSheet.create({card: {paddingRight: 16}});

export default ConnectionNotice;
