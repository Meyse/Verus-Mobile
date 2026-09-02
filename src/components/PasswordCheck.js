import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, View} from 'react-native';
import {Button, Dialog, Portal, Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {checkPinForUser} from '../utils/asyncStore/asyncStore';
import {getSupportedBiometryType} from '../utils/keychain/keychain';
import {getBiometricPassword} from '../utils/keychain/biometrics';
import {normalizeWalletAvatar} from '../utils/walletAvatar';
import AppButton from './AppButton';
import AppTextInput from './AppTextInput';
import BottomSheetModal from './BottomSheetModal';
import PasswordInput from './PasswordInput';
import WalletAvatar from './WalletAvatar';
import {fontStyle} from '../globals/fonts';
import {useOnboardingTheme} from '../theme/onboarding';

const DEFAULT_DESCRIPTION =
  'Authenticate before continuing with this security-sensitive action.';

const PasswordCheck = props => {
  const {
    account,
    allowBiometry,
    body = DEFAULT_DESCRIPTION,
    cancel,
    createAttemptToken,
    errorMessage,
    networkLabel,
    onInputChange,
    redesigned = false,
    returnSecrets = false,
    submit,
    submitLabel = 'Continue',
    suppressSystemAlerts = false,
    title,
    userName,
    visible,
  } = props;
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [password, setPassword] = useState('');
  const [freeze, setFreeze] = useState(false);
  const [biometryType, setBiometryType] = useState(null);
  const walletAvatar = normalizeWalletAvatar(account?.walletAvatar);

  useEffect(() => {
    let active = true;

    if (!allowBiometry || !account?.biometry) {
      setBiometryType(null);
      return () => {
        active = false;
      };
    }

    getSupportedBiometryType()
      .then(result => {
        if (active) setBiometryType(result);
      })
      .catch(() => {
        if (active) setBiometryType(null);
      });

    return () => {
      active = false;
    };
  }, [account, allowBiometry]);

  useEffect(() => {
    if (!visible) {
      setPassword('');
      setFreeze(false);
    }
  }, [visible]);

  const updatePassword = text => {
    setPassword(text);
    if (typeof onInputChange === 'function') onInputChange(text);
  };

  const validatePassword = async candidate => {
    setFreeze(true);

    try {
      const seeds = await checkPinForUser(
        candidate,
        userName,
        false,
        false,
        !suppressSystemAlerts,
      );

      return returnSecrets
        ? {seeds, valid: true}
        : {password: candidate, valid: true};
    } catch (error) {
      return returnSecrets
        ? {error, valid: false}
        : {error, password: candidate, valid: false};
    } finally {
      setFreeze(false);
    }
  };

  const beginAttempt = () =>
    typeof createAttemptToken === 'function' ? createAttemptToken() : undefined;

  const submitPassword = async (candidate, attemptToken = beginAttempt()) => {
    const result = await validatePassword(candidate);
    await submit(
      attemptToken === undefined ? result : {...result, attemptToken},
    );

    if (result.valid) setPassword('');
  };

  const tryBiometricAuth = async () => {
    if (!biometryType?.biometry || !account?.accountHash) return;

    const attemptToken = beginAttempt();

    try {
      setFreeze(true);
      const biometricPassword = await getBiometricPassword(
        account.accountHash,
        `Authenticate to access ${account.id}`,
      );
      await submitPassword(biometricPassword, attemptToken);
    } catch {
      // Biometric cancellation leaves the sheet open for another attempt.
    } finally {
      setFreeze(false);
      setPassword('');
    }
  };

  if (redesigned) {
    return (
      <BottomSheetModal
        avoidKeyboard
        closeDisabled={freeze}
        contentContainerStyle={styles.sheet}
        maxHeight="86%"
        onClose={cancel}
        visible={visible}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.content}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.body}>{body}</Text>
          {account ? (
            <View style={styles.walletSummary}>
              <View style={styles.walletIcon}>
                {walletAvatar ? (
                  <WalletAvatar
                    emojiSize={19}
                    size={36}
                    walletAvatar={walletAvatar}
                  />
                ) : (
                  <MaterialCommunityIcons
                    color={theme.colors.textSubtle}
                    name="wallet-outline"
                    size={24}
                  />
                )}
              </View>
              <View style={styles.walletCopy}>
                <Text numberOfLines={1} style={styles.walletName}>
                  {account.id}
                </Text>
                {networkLabel ? (
                  <Text style={styles.walletNetwork}>{networkLabel}</Text>
                ) : null}
              </View>
            </View>
          ) : null}
          <AppTextInput
            autoComplete="off"
            autoCorrect={false}
            importantForAutofill="no"
            label="Wallet password"
            onChangeText={updatePassword}
            placeholder="Enter password"
            secureTextEntry
            testID="settings.passwordCheck.password"
            textContentType="none"
            value={password}
          />
          {errorMessage ? (
            <Text
              accessibilityLiveRegion="polite"
              style={styles.error}
              testID="settings.passwordCheck.error">
              {errorMessage}
            </Text>
          ) : null}
          {freeze ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={theme.colors.primary} size="small" />
              <Text style={styles.loadingText}>Authenticating…</Text>
            </View>
          ) : null}
          <View style={styles.actions}>
            <AppButton
              disabled={freeze}
              height={52}
              onPress={cancel}
              style={styles.action}
              variant="secondary">
              Cancel
            </AppButton>
            {allowBiometry && biometryType?.biometry ? (
              <AppButton
                disabled={freeze}
                height={52}
                onPress={tryBiometricAuth}
                style={styles.action}
                variant="secondary">
                {biometryType.display_name}
              </AppButton>
            ) : null}
            <AppButton
              disabled={freeze || password.length === 0}
              height={52}
              onPress={() => submitPassword(password)}
              style={styles.action}
              testID="settings.passwordCheck.submit"
              variant="primary">
              {submitLabel}
            </AppButton>
          </View>
        </ScrollView>
      </BottomSheetModal>
    );
  }

  return (
    <Portal>
      <Dialog dismissable={!freeze} onDismiss={cancel} visible={visible}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <PasswordInput value={password} onChangeText={updatePassword} />
        </Dialog.Content>
        <Dialog.Actions>
          <Button disabled={freeze} onPress={cancel}>
            Cancel
          </Button>
          {allowBiometry && biometryType?.biometry ? (
            <Button disabled={freeze} onPress={tryBiometricAuth}>
              {biometryType.display_name}
            </Button>
          ) : null}
          <Button disabled={freeze} onPress={() => submitPassword(password)}>
            Done
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const createStyles = theme =>
  StyleSheet.create({
    sheet: {
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 20,
    },
    content: {
      width: '100%',
    },
    title: {
      ...theme.typography.titleSheet,
      color: theme.colors.textPrimary,
    },
    body: {
      marginTop: 6,
      marginBottom: 18,
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      ...fontStyle('regular'),
    },
    walletSummary: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 18,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.rounded.md,
    },
    walletIcon: {
      width: 36,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    walletCopy: {
      minWidth: 0,
      flex: 1,
    },
    walletName: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      lineHeight: 21,
      ...fontStyle('semiBold'),
    },
    walletNetwork: {
      marginTop: 1,
      color: theme.colors.textSubtle,
      fontSize: 12,
      lineHeight: 17,
      ...fontStyle('regular'),
    },
    error: {
      marginTop: 9,
      color: theme.colors.danger,
      fontSize: 13,
      lineHeight: 18,
      ...fontStyle('regular'),
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 10,
    },
    loadingText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      ...fontStyle('regular'),
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 22,
    },
    action: {
      minWidth: 96,
      flexGrow: 1,
    },
  });

export default PasswordCheck;
