import React from 'react';
import {Text, View} from 'react-native';
import {ActivityIndicator, Switch} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {revokeRecoverFlowStyles as styles} from '../../styles';
import {useAppTheme} from '../../theme/app';

export const RevokeRecoverNotice = ({children, tone = 'warning'}) => {
  const theme = useAppTheme();
  const danger = tone === 'danger';
  const color = danger ? theme.colors.danger : theme.colors.warning;
  const backgroundColor = danger
    ? theme.colors.dangerBackground
    : theme.colors.warningBackground;

  return (
    <View style={[styles.notice, {backgroundColor}]}>
      <MaterialCommunityIcons
        color={color}
        name={danger ? 'alert-octagon-outline' : 'alert-outline'}
        size={21}
      />
      <Text style={[styles.noticeCopy, {color: theme.colors.textSecondary}]}>
        {children}
      </Text>
    </View>
  );
};

export const RevokeRecoverLoadingState = ({body, title}) => {
  const theme = useAppTheme();

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      style={styles.loading}>
      <View
        style={[
          styles.loadingIcon,
          {backgroundColor: theme.colors.surfaceMuted},
        ]}>
        <ActivityIndicator
          animating
          color={theme.colors.primary}
          size="large"
        />
      </View>
      <Text
        style={[
          theme.typography.headlineMd,
          styles.loadingTitle,
          {color: theme.colors.textPrimary},
        ]}>
        {title}
      </Text>
      <Text
        style={[
          theme.typography.bodyMd,
          styles.loadingBody,
          {color: theme.colors.textSecondary},
        ]}>
        {body}
      </Text>
    </View>
  );
};

export const RevokeRecoverReviewGroup = ({children, title}) => {
  const theme = useAppTheme();

  return (
    <View style={[styles.reviewGroup, {borderColor: theme.colors.border}]}>
      {title ? (
        <Text style={[styles.reviewHeading, {color: theme.colors.textPrimary}]}>
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
};

export const RevokeRecoverReviewRow = ({
  label,
  multiline = false,
  technical = false,
  value,
}) => {
  const theme = useAppTheme();
  let numberOfLines = 1;

  if (technical) numberOfLines = 2;
  if (multiline) numberOfLines = undefined;

  if (value == null || value === '') return null;

  return (
    <View style={[styles.reviewRow, {borderTopColor: theme.colors.border}]}>
      <Text style={[styles.reviewLabel, {color: theme.colors.textSecondary}]}>
        {label}
      </Text>
      <Text
        numberOfLines={numberOfLines}
        selectable={technical}
        style={[
          styles.reviewValue,
          technical && styles.reviewTechnicalValue,
          {color: theme.colors.textPrimary},
        ]}>
        {value}
      </Text>
    </View>
  );
};

export const RevokeRecoverAcknowledgement = ({label, onValueChange, value}) => {
  const theme = useAppTheme();

  return (
    <View style={styles.acknowledgement}>
      <Text
        style={[
          styles.acknowledgementCopy,
          {color: theme.colors.textSecondary},
        ]}>
        {label}
      </Text>
      <Switch
        accessibilityLabel={label}
        color={theme.colors.primary}
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );
};
