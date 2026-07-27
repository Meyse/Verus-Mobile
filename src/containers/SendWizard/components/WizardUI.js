import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import GradientButton from '../../../components/GradientButton';
import AppButton from '../../../components/AppButton';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import {fontStyle} from '../../../globals/fonts';
import {useOnboardingSmallDeviceLayout} from '../../../hooks/useOnboardingSmallDeviceLayout';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {AssetCoinLogo} from '../../../utils/CoinData/Graphics';

export const WIZARD_CONTENT_INSET = 16;

export const WizardScreen = ({children, contentContainerStyle, scroll = true}) => {
  const theme = useOnboardingTheme();

  if (!scroll) {
    return (
      <View style={[styles.screen, {backgroundColor: theme.colors.background}]}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={[styles.screen, {backgroundColor: theme.colors.background}]}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}>
      {children}
    </ScrollView>
  );
};

export const WizardHeading = ({children, style, subtitle}) => {
  const theme = useOnboardingTheme();
  const {smallDevice} = useOnboardingSmallDeviceLayout();
  return (
    <View
      style={[
        {
          paddingHorizontal: WIZARD_CONTENT_INSET,
          paddingTop: smallDevice
            ? theme.spacing.md
            : theme.spacing.lg,
          paddingBottom: smallDevice
            ? theme.spacing.stepTitleMarginSmallDevice
            : theme.spacing.md,
        },
        style,
      ]}>
      <Text
        style={[
          smallDevice
            ? theme.typography.headlineCompact
            : theme.typography.headlineMd,
          {color: theme.colors.textPrimary},
        ]}>
        {children}
      </Text>
      {subtitle ? (
        <Text
          style={[
            styles.subtitle,
            theme.typography.bodyMd,
            {color: theme.colors.textSecondary},
          ]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

export const WizardSearch = ({onChangeText, placeholder, value}) => {
  const theme = useOnboardingTheme();
  return (
    <View style={[styles.search, {backgroundColor: theme.colors.input}]}>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSubtle}
        returnKeyType="search"
        style={[styles.searchInput, {color: theme.colors.textPrimary}]}
        value={value}
      />
      <MaterialCommunityIcons
        name="magnify"
        size={20}
        color={theme.colors.textSubtle}
      />
    </View>
  );
};

export const WizardSectionLabel = ({children}) => {
  const theme = useOnboardingTheme();
  return (
    <Text style={[styles.sectionLabel, {color: theme.colors.textSecondary}]}>
      {children}
    </Text>
  );
};

export const AssetOptionRow = ({
  coinId,
  detail,
  name,
  onPress,
  right,
  ticker,
}) => {
  const theme = useOnboardingTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [styles.assetRow, pressed && styles.pressed]}>
      <View style={styles.assetLogo}>
        <AssetCoinLogo coinId={coinId} size={38} />
      </View>
      <View style={styles.assetRowCopy}>
        <Text
          numberOfLines={1}
          style={[styles.assetRowTitle, {color: theme.colors.textPrimary}]}>
          {name}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.assetRowDetail, {color: theme.colors.textSecondary}]}>
          {detail || ticker}
        </Text>
      </View>
      {right || (
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={theme.colors.textSubtle}
        />
      )}
    </Pressable>
  );
};

export const InfoCard = ({children, style}) => {
  const theme = useOnboardingTheme();
  return (
    <View
      style={[
        styles.infoCard,
        {backgroundColor: theme.colors.surfaceMuted},
        style,
      ]}>
      {children}
    </View>
  );
};

export const DetailRow = ({label, value}) => {
  const theme = useOnboardingTheme();
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, {color: theme.colors.textSecondary}]}>
        {label}
      </Text>
      <Text
        numberOfLines={2}
        style={[styles.detailValue, {color: theme.colors.textPrimary}]}>
        {value}
      </Text>
    </View>
  );
};

export const ErrorMessage = ({children}) => {
  const theme = useOnboardingTheme();
  if (!children) return null;
  return (
    <View style={[styles.errorBox, {backgroundColor: theme.colors.surfaceMuted}]}>
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={19}
        color={theme.colors.danger}
      />
      <Text style={[styles.errorText, {color: theme.colors.danger}]}>
        {children}
      </Text>
    </View>
  );
};

export const WizardFooter = ({
  children = 'Continue',
  disabled,
  bottomSpacing = 24,
  holdToConfirm = false,
  holdingText = 'Hold to confirm...',
  horizontalSpacing = 16,
  loading,
  loadingText = 'Please wait…',
  onPress,
}) => {
  const theme = useOnboardingTheme();
  const buttonLabel = loading ? loadingText : children;
  return (
    <SafeBottomActionStack
      horizontalSpacing={horizontalSpacing}
      bottomSpacing={bottomSpacing}
      style={styles.footer}>
      {holdToConfirm ? (
        <GradientButton
          disabled={disabled || loading}
          holdDuration={2500}
          holdToConfirm
          holdingText={holdingText}
          onPress={onPress}
          topColor={theme.colors.primary}
          bottomColor={theme.colors.primary}>
          {buttonLabel}
        </GradientButton>
      ) : (
        <AppButton disabled={disabled || loading} onPress={onPress}>
          {buttonLabel}
        </AppButton>
      )}
    </SafeBottomActionStack>
  );
};

export const wizardTextStyles = StyleSheet.create({
  title: {
    fontSize: 20,
    lineHeight: 26,
    ...fontStyle('bold'),
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    ...fontStyle('regular'),
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('semiBold'),
  },
});

const styles = StyleSheet.create({
  footer: {paddingTop: 16},
  screen: {flex: 1},
  scrollContent: {flexGrow: 1, paddingBottom: 24},
  subtitle: {marginTop: 8},
  search: {
    height: 52,
    marginHorizontal: WIZARD_CONTENT_INSET,
    marginBottom: 14,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 52,
    padding: 0,
    fontSize: 16,
    lineHeight: 22,
    ...fontStyle('regular'),
  },
  sectionLabel: {
    paddingHorizontal: WIZARD_CONTENT_INSET,
    marginTop: 18,
    marginBottom: 6,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    ...fontStyle('semiBold'),
  },
  assetRow: {
    minHeight: 70,
    paddingHorizontal: WIZARD_CONTENT_INSET,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: {opacity: 0.7},
  assetLogo: {width: 38, height: 38, marginRight: 16},
  assetRowCopy: {flex: 1, minWidth: 0},
  assetRowTitle: {fontSize: 17, lineHeight: 22, ...fontStyle('semiBold')},
  assetRowDetail: {fontSize: 14, lineHeight: 19, marginTop: 3, ...fontStyle('regular')},
  infoCard: {borderRadius: 16, padding: 16},
  detailRow: {
    minHeight: 42,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailLabel: {fontSize: 14, lineHeight: 20, marginRight: 16, ...fontStyle('regular')},
  detailValue: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'right',
    ...fontStyle('semiBold'),
  },
  errorBox: {
    marginHorizontal: WIZARD_CONTENT_INSET,
    marginVertical: 12,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  errorText: {flex: 1, marginLeft: 8, fontSize: 14, lineHeight: 20, ...fontStyle('regular')},
});
