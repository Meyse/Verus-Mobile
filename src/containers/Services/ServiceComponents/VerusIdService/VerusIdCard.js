/*
  VerusIdCard
  - The light card at the top of the VerusID page (owner-approved "D revised",
    2026-10-22): the name, the network, a status badge only when the VerusID
    is not active, and the i-address with CopyAction.
  - surfaceMuted fill, 24-point radius, no border, no shadow, no mark.
*/
import React, {useMemo} from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import CopyAction from '../../../../components/CopyAction';
import StatusBadge from '../../../../components/StatusBadge';
import {ONBOARDING_SMALL_DEVICE_MAX_HEIGHT} from '../../../../hooks/useOnboardingSmallDeviceLayout';
import {fontStyle} from '../../../../globals/fonts';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {getVerusIdStateBadge} from '../../../../utils/verusid/describeVerusIdState';

const MONOSPACE_FONT = Platform.select({ios: 'Menlo', default: 'monospace'});
const ZERO_WIDTH_SPACE = '​';

// The first name part is the VerusID itself; the rest names its parent and
// network. A zero-width space after each dot lets a long name wrap there.
export const splitVerusIdName = name => {
  const value = String(name || '');
  const dot = value.indexOf('.');

  if (dot < 0) return {leaf: value, rest: ''};

  return {
    leaf: value.slice(0, dot),
    rest: value.slice(dot).replace(/\./g, `.${ZERO_WIDTH_SPACE}`),
  };
};

export const VerusIdName = ({name, style, leafColor, restColor, ...props}) => {
  const {leaf, rest} = splitVerusIdName(name);

  return (
    <Text accessibilityLabel={name} style={[style, {color: restColor}]} {...props}>
      <Text style={{color: leafColor}}>{leaf}</Text>
      {rest}
    </Text>
  );
};

const VerusIdCard = ({iAddress, name, networkName, state}) => {
  const theme = useOnboardingTheme();
  const {height: windowHeight} = useWindowDimensions();
  const compact = windowHeight <= ONBOARDING_SMALL_DEVICE_MAX_HEIGHT;
  const badge = getVerusIdStateBadge(state);
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.card}>
      <VerusIdName
        accessibilityRole="header"
        leafColor={theme.colors.textPrimary}
        name={name}
        restColor={theme.colors.textSecondary}
        style={
          compact ? theme.typography.headlineCompact : theme.typography.headlineMd
        }
      />
      <View style={styles.networkRow}>
        <Text
          numberOfLines={1}
          style={[
            theme.typography.bodySm,
            styles.network,
            {color: theme.colors.textSecondary},
          ]}>
          {networkName}
        </Text>
        {badge ? <StatusBadge label={badge.label} tone={badge.tone} /> : null}
      </View>
      <View style={styles.identifier}>
        <Text style={styles.identifierLabel}>i-address</Text>
        <View style={styles.identifierRow}>
          <Text
            ellipsizeMode="middle"
            numberOfLines={1}
            style={styles.identifierValue}>
            {iAddress}
          </Text>
          <CopyAction
            accessibilityLabel="Copy i-address"
            copiedAccessibilityLabel="i-address copied"
            style={styles.copy}
            value={iAddress}
          />
        </View>
      </View>
    </View>
  );
};

const createStyles = theme =>
  StyleSheet.create({
    card: {
      borderRadius: theme.rounded.xl,
      backgroundColor: theme.colors.surfaceMuted,
      paddingTop: 22,
      paddingHorizontal: 20,
      paddingBottom: 4,
    },
    networkRow: {
      minHeight: 24,
      marginTop: 6,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    network: {flexShrink: 1},
    identifier: {
      marginTop: 16,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    identifierLabel: {
      color: theme.colors.textSubtle,
      fontSize: 12,
      lineHeight: 17,
      ...fontStyle('semiBold'),
    },
    identifierRow: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    identifierValue: {
      flex: 1,
      minWidth: 0,
      marginRight: 8,
      color: theme.colors.textPrimary,
      fontFamily: MONOSPACE_FONT,
      fontSize: 12,
      lineHeight: 17,
    },
    copy: {marginRight: -12},
  });

export default VerusIdCard;
