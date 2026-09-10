import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  initializeAccountData,
  refreshAccountData,
} from '../../../actions/actionDispatchers';
import AppButton from '../../../components/AppButton';
import AppTextInput from '../../../components/AppTextInput';
import BottomSheetModal from '../../../components/BottomSheetModal';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import WalletUnlockLoadingContent from '../../../components/WalletUnlockLoadingContent';
import WalletAvatar from '../../../components/WalletAvatar';
import {fontStyle} from '../../../globals/fonts';
import {createSignedOutSheetStyles} from '../../../styles';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {getBiometricPassword} from '../../../utils/keychain/biometrics';
import {getSupportedBiometryType} from '../../../utils/keychain/keychain';
import {normalizeWalletAvatar} from '../../../utils/walletAvatar';

const BIOMETRY_UNAVAILABLE_MESSAGE =
  'Biometric unlock is unavailable. Enter your password to continue.';
const PASSWORD_AUTO_FOCUS_DELAY_MS = 260;
const KEYBOARD_SHEET_BOTTOM_SPACING = 8;
const KEYBOARD_SHEET_TOP_SPACING = 12;
const PASSWORD_FIELD_HEIGHT = 83;
const UNLOCK_BUTTON_HEIGHT = 56;
const PASSWORD_BUTTON_TOP_MARGIN = 16;
const BIOMETRY_ACTION_TOTAL_HEIGHT = 78;
const PASSWORD_ONLY_CONTENT_HEIGHT =
  PASSWORD_FIELD_HEIGHT + PASSWORD_BUTTON_TOP_MARGIN + UNLOCK_BUTTON_HEIGHT;
const BIOMETRY_CONTENT_HEIGHT =
  PASSWORD_FIELD_HEIGHT + BIOMETRY_ACTION_TOTAL_HEIGHT + UNLOCK_BUTTON_HEIGHT;

const formatErrorMessage = error => {
  const message =
    error && error.message ? error.message : 'Unable to unlock wallet';

  return /[.!?]$/.test(message) ? message : `${message}.`;
};

const isIncorrectPasswordError = error =>
  error && error.message === 'Incorrect password';

const getBiometryLabel = supportedBiometryType => {
  const displayName = supportedBiometryType
    ? supportedBiometryType.display_name
    : null;

  return displayName && displayName !== 'None'
    ? `Use ${displayName}`
    : 'Use biometrics';
};

const UnlockWalletSheet = ({
  visible,
  account,
  title,
  requestLabel,
  useRefreshAccountData = false,
  closeOnUnlocked = true,
  onClose,
  onClosed,
  onUnlocked,
}) => {
  const theme = useOnboardingTheme();
  const insets = useSafeAreaInsets();
  const {height: windowHeight} = useWindowDimensions();
  const signedOutSheetStyles = useMemo(
    () => createSignedOutSheetStyles(theme),
    [theme],
  );
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [biometryAttempted, setBiometryAttempted] = useState(false);
  const [supportedBiometryType, setSupportedBiometryType] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [displayAccount, setDisplayAccount] = useState(account);
  const [keyboardTop, setKeyboardTop] = useState(null);
  const passwordInputRef = useRef(null);

  const focusPasswordInput = useCallback(() => {
    if (passwordInputRef.current != null) {
      passwordInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (account == null) {
      return;
    }

    setDisplayAccount(account);
  }, [account]);

  useEffect(() => {
    if (visible) {
      setPassword('');
      setLoading(false);
      setErrorMessage(null);
      setBiometryAttempted(false);
      setSupportedBiometryType(null);
      setShowPassword(false);
    }
  }, [account ? account.accountHash : null, visible]);

  useEffect(() => {
    setKeyboardTop(null);
    if (!visible) return undefined;

    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      event => setKeyboardTop(event.endCoordinates.screenY),
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardTop(null),
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [visible]);

  const tryUnlockAccount = useCallback(
    async key => {
      if (!account || !key || loading) {
        return;
      }

      setLoading(true);
      setErrorMessage(null);
      Keyboard.dismiss();

      try {
        if (useRefreshAccountData) {
          await refreshAccountData(
            account.accountHash,
            key,
            undefined,
            false,
          );
        } else {
          await initializeAccountData(
            account,
            key,
            undefined,
            false,
          );
        }

        if (typeof onUnlocked === 'function') {
          onUnlocked(account);
        }

        if (closeOnUnlocked) {
          onClose();
        }
      } catch (e) {
        if (!isIncorrectPasswordError(e)) {
          console.warn(e);
        }

        setLoading(false);
        setErrorMessage(formatErrorMessage(e));
      }
    },
    [
      account,
      closeOnUnlocked,
      loading,
      onClose,
      onUnlocked,
      useRefreshAccountData,
    ],
  );

  const tryBiometricUnlock = useCallback(
    async (showFailureMessage = false) => {
      if (!visible || !account || loading || !account.biometry) {
        return;
      }

      try {
        const supported = await getSupportedBiometryType();

        setSupportedBiometryType(supported);

        if (!supported.biometry) {
          if (showFailureMessage) {
            setErrorMessage(BIOMETRY_UNAVAILABLE_MESSAGE);
          }

          focusPasswordInput();
          return;
        }

        const biometricPassword = await getBiometricPassword(
          account.accountHash,
          'Authenticate to unlock wallet',
        );

        if (biometricPassword != null) {
          setPassword(biometricPassword);
          await tryUnlockAccount(biometricPassword);
        } else {
          if (showFailureMessage) {
            setErrorMessage(BIOMETRY_UNAVAILABLE_MESSAGE);
          }

          focusPasswordInput();
        }
      } catch (e) {
        console.warn(e);

        if (showFailureMessage) {
          setErrorMessage(BIOMETRY_UNAVAILABLE_MESSAGE);
        }

        focusPasswordInput();
      }
    },
    [
      account,
      focusPasswordInput,
      loading,
      tryUnlockAccount,
      visible,
    ],
  );

  useEffect(() => {
    if (!visible || !account || account.biometry || loading) {
      return undefined;
    }

    const focusTimeout = setTimeout(
      focusPasswordInput,
      PASSWORD_AUTO_FOCUS_DELAY_MS,
    );

    return () => clearTimeout(focusTimeout);
  }, [
    account ? account.accountHash : null,
    account ? account.biometry : null,
    focusPasswordInput,
    loading,
    visible,
  ]);

  useEffect(() => {
    if (!visible || !account || biometryAttempted || loading) {
      return;
    }

    setBiometryAttempted(true);

    if (!account.biometry) {
      return;
    }

    tryBiometricUnlock(false);
  }, [account, biometryAttempted, loading, tryBiometricUnlock, visible]);

  const walletAvatar = normalizeWalletAvatar(
    displayAccount ? displayAccount.walletAvatar : null,
  );
  const disabled = password.length === 0 || loading || !account;
  const showBiometryAction = !!(displayAccount && displayAccount.biometry);
  const loadingContentHeight = showBiometryAction
    ? BIOMETRY_CONTENT_HEIGHT
    : PASSWORD_ONLY_CONTENT_HEIGHT;
  const keyboardVisible = keyboardTop != null;
  // A percentage would shrink again inside the keyboard-avoiding container.
  // Screen coordinates also avoid subtracting the keyboard twice on Android.
  const keyboardSheetHeight = Math.max(
    1,
    Math.min(
      windowHeight * 0.64,
      Math.min(windowHeight, keyboardTop) -
        insets.top -
        KEYBOARD_SHEET_TOP_SPACING -
        KEYBOARD_SHEET_BOTTOM_SPACING,
    ),
  );

  return (
    <BottomSheetModal
      visible={visible}
      onClose={loading ? () => {} : onClose}
      onClosed={onClosed}
      avoidKeyboard
      maxHeight={keyboardVisible ? keyboardSheetHeight : '64%'}
      contentContainerStyle={
        keyboardVisible && {marginBottom: KEYBOARD_SHEET_BOTTOM_SPACING}
      }>
      <View style={styles.sheetLayout}>
        <View style={styles.scrollFrame}>
          <ScrollView
            bounces={false}
            contentContainerStyle={[
              signedOutSheetStyles.body,
              !loading && styles.formContent,
              !loading && !showBiometryAction && styles.passwordContent,
            ]}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled">
            {(title || requestLabel) && (
              <View style={styles.contextHeader}>
                {title && <Text style={styles.contextTitle}>{title}</Text>}
                {requestLabel && (
                  <Text style={styles.contextLabel}>{requestLabel}</Text>
                )}
              </View>
            )}
            <View style={styles.header}>
              <View style={styles.walletIdentity}>
                <View style={styles.walletIcon}>
                  {walletAvatar ? (
                    <WalletAvatar
                      walletAvatar={walletAvatar}
                      size={42}
                      emojiSize={22}
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name="wallet-outline"
                      size={26}
                      color={theme.colors.primary}
                    />
                  )}
                </View>
                <Text numberOfLines={1} style={styles.walletName}>
                  {displayAccount ? displayAccount.id : ''}
                </Text>
              </View>
            </View>
            {loading ? (
              <WalletUnlockLoadingContent height={loadingContentHeight} />
            ) : (
              <>
                <AppTextInput
                  ref={passwordInputRef}
                  themeMode={theme.mode}
                  returnKeyType="done"
                  label="Password"
                  value={password}
                  onChangeText={text => {
                    setPassword(text);
                    setErrorMessage(null);
                  }}
                  onSubmitEditing={() => {
                    if (!disabled) {
                      tryUnlockAccount(password);
                    }
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  enablesReturnKeyAutomatically
                  placeholder="Enter password"
                  rightAccessibilityLabel={
                    showPassword ? 'Hide password' : 'Show password'
                  }
                  rightIcon={showPassword ? 'eye-off' : 'eye'}
                  secureTextEntry={!showPassword}
                  onRightPress={() => setShowPassword(value => !value)}
                />
                {errorMessage != null && (
                  <Text style={styles.errorText}>{errorMessage}</Text>
                )}
                {showBiometryAction && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={0.74}
                    onPress={() => tryBiometricUnlock(true)}
                    style={styles.biometryAction}>
                    <MaterialCommunityIcons
                      name="fingerprint"
                      size={24}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.biometryActionText}>
                      {getBiometryLabel(supportedBiometryType)}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
        </View>
        {!loading && (
          <SafeBottomActionStack
            bottomSpacing={keyboardVisible ? KEYBOARD_SHEET_BOTTOM_SPACING : 22}
            gap={0}
            horizontalSpacing={20}
            includeBottomInset={false}
            safeAreaSpacing={0}>
            <AppButton
              themeMode={theme.mode}
              onPress={() => tryUnlockAccount(password)}
              disabled={disabled}
              height={UNLOCK_BUTTON_HEIGHT}>
              {'Unlock'}
            </AppButton>
          </SafeBottomActionStack>
        )}
      </View>
    </BottomSheetModal>
  );
};

const createStyles = theme =>
  StyleSheet.create({
  sheetLayout: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollFrame: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  formContent: {
    paddingBottom: 0,
  },
  contextHeader: {
    marginBottom: 20,
  },
  contextTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    lineHeight: 26,
    ...fontStyle('semiBold'),
  },
  contextLabel: {
    marginTop: 4,
    color: theme.colors.textSubtle,
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('regular'),
  },
  header: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  walletIdentity: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: theme.colors.surfaceMuted,
  },
  walletName: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 22,
    ...fontStyle('semiBold'),
  },
  errorText: {
    marginTop: 8,
    color: theme.colors.danger,
    fontSize: 13,
    ...fontStyle('regular'),
  },
  biometryAction: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 14,
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  biometryActionText: {
    marginLeft: 10,
    color: theme.colors.primary,
    fontSize: 15,
    ...fontStyle('semiBold'),
  },
  passwordContent: {
    paddingBottom: PASSWORD_BUTTON_TOP_MARGIN,
  },
});

export default UnlockWalletSheet;
