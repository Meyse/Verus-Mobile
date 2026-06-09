import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Keyboard, StyleSheet, TouchableOpacity, View} from 'react-native';
import {ActivityIndicator, Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  initializeAccountData,
  refreshAccountData,
} from '../../../actions/actionDispatchers';
import AppButton from '../../../components/AppButton';
import AppTextInput from '../../../components/AppTextInput';
import BottomSheetModal from '../../../components/BottomSheetModal';
import WalletAvatar from '../../../components/WalletAvatar';
import {fontStyle} from '../../../globals/fonts';
import {createSignedOutSheetStyles} from '../../../styles';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {LOADING_ACCOUNT} from '../../../utils/constants/constants';
import {getBiometricPassword} from '../../../utils/keychain/biometrics';
import {getSupportedBiometryType} from '../../../utils/keychain/keychain';
import {normalizeWalletAvatar} from '../../../utils/walletAvatar';

const BIOMETRY_UNAVAILABLE_MESSAGE =
  'Biometric unlock is unavailable. Enter your password to continue.';
const PASSWORD_UNLOCK_LOADING_TITLE = 'Opening wallet';
const BIOMETRIC_UNLOCK_LOADING_TITLE = 'Unlocking with biometrics';
const ACCOUNT_DATA_LOADING_TITLE = 'Loading wallet data';
const DEFAULT_LOADING_SUBTITLE =
  'Keep this screen open while Verus Mobile prepares your wallet.';
const PASSWORD_AUTO_FOCUS_DELAY_MS = 260;
const UNLOCK_METHOD = {
  PASSWORD: 'password',
  BIOMETRICS: 'biometrics',
};

const formatErrorMessage = error => {
  const message =
    error && error.message ? error.message : 'Unable to unlock wallet';

  return /[.!?]$/.test(message) ? message : `${message}.`;
};

const getBiometryLabel = supportedBiometryType => {
  const displayName = supportedBiometryType
    ? supportedBiometryType.display_name
    : null;

  return displayName && displayName !== 'None'
    ? `Use ${displayName}`
    : 'Use biometrics';
};

const getDefaultAccessibilityLabel = (isDefaultAccount, defaultStarActive) => {
  if (isDefaultAccount) {
    return 'Default wallet';
  }

  if (defaultStarActive) {
    return 'Will make default after unlock';
  }

  return 'Make default after unlock';
};

const getLoadingTitle = (initStep, unlockMethod, loadingTitle) => {
  if (initStep === LOADING_ACCOUNT) {
    return ACCOUNT_DATA_LOADING_TITLE;
  }

  if (unlockMethod === UNLOCK_METHOD.BIOMETRICS) {
    return BIOMETRIC_UNLOCK_LOADING_TITLE;
  }

  return loadingTitle || PASSWORD_UNLOCK_LOADING_TITLE;
};

const UnlockWalletSheet = ({
  visible,
  account,
  isDefaultAccount,
  title,
  requestLabel,
  loadingTitle,
  loadingSubtitle = DEFAULT_LOADING_SUBTITLE,
  makeDefaultAllowed = true,
  useRefreshAccountData = false,
  closeOnUnlocked = true,
  onClose,
  onUnlocked,
}) => {
  const theme = useOnboardingTheme();
  const signedOutSheetStyles = useMemo(
    () => createSignedOutSheetStyles(theme),
    [theme],
  );
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [password, setPassword] = useState('');
  const [makeDefaultAccount, setMakeDefaultAccount] =
    useState(isDefaultAccount);
  const [loading, setLoading] = useState(false);
  const [initStep, setInitStep] = useState(null);
  const [unlockMethod, setUnlockMethod] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [biometryAttempted, setBiometryAttempted] = useState(false);
  const [supportedBiometryType, setSupportedBiometryType] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [displayAccount, setDisplayAccount] = useState(account);
  const [displayIsDefaultAccount, setDisplayIsDefaultAccount] =
    useState(isDefaultAccount);
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
    setDisplayIsDefaultAccount(isDefaultAccount);
  }, [account, isDefaultAccount]);

  useEffect(() => {
    if (visible) {
      setPassword('');
      setErrorMessage(null);
      setInitStep(null);
      setUnlockMethod(null);
      setMakeDefaultAccount(isDefaultAccount);
      setBiometryAttempted(false);
      setSupportedBiometryType(null);
      setShowPassword(false);
    }
  }, [account ? account.accountHash : null, isDefaultAccount, visible]);

  const tryUnlockAccount = useCallback(
    async (
      key,
      nextMakeDefault = makeDefaultAccount,
      nextUnlockMethod = UNLOCK_METHOD.PASSWORD,
    ) => {
      if (!account || !key || loading) {
        return;
      }

      setLoading(true);
      setErrorMessage(null);
      setInitStep(null);
      setUnlockMethod(nextUnlockMethod);
      Keyboard.dismiss();

      try {
        if (useRefreshAccountData) {
          await refreshAccountData(
            account.accountHash,
            key,
            nextMakeDefault,
            setInitStep,
          );
        } else {
          await initializeAccountData(
            account,
            key,
            nextMakeDefault,
            setInitStep,
          );
        }

        setLoading(false);

        if (typeof onUnlocked === 'function') {
          onUnlocked(account);
        }

        if (closeOnUnlocked) {
          onClose();
        }
      } catch (e) {
        console.warn(e);
        setLoading(false);
        setInitStep(null);
        setUnlockMethod(null);
        setErrorMessage(formatErrorMessage(e));
      }
    },
    [
      account,
      closeOnUnlocked,
      loading,
      makeDefaultAccount,
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
          await tryUnlockAccount(
            biometricPassword,
            makeDefaultAccount,
            UNLOCK_METHOD.BIOMETRICS,
          );
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
      makeDefaultAccount,
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
  const defaultStarActive = makeDefaultAccount || displayIsDefaultAccount;
  const showDefaultStar = displayIsDefaultAccount || makeDefaultAllowed;
  const canChangeDefaultPreference =
    makeDefaultAllowed &&
    visible &&
    account != null &&
    !displayIsDefaultAccount &&
    !loading;
  const defaultAccessibilityLabel = getDefaultAccessibilityLabel(
    displayIsDefaultAccount,
    defaultStarActive,
  );
  const disabled = password.length === 0 || loading || !account;
  const showBiometryAction = !!(displayAccount && displayAccount.biometry);
  const resolvedLoadingTitle = getLoadingTitle(
    initStep,
    unlockMethod,
    loadingTitle,
  );

  return (
    <BottomSheetModal
      visible={visible}
      onClose={loading ? () => {} : onClose}
      avoidKeyboard
      maxHeight="64%">
      <View style={signedOutSheetStyles.body}>
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
          {showDefaultStar && (
            <TouchableOpacity
              accessibilityLabel={defaultAccessibilityLabel}
              accessibilityRole="checkbox"
              accessibilityState={{
                checked: defaultStarActive,
                disabled: !canChangeDefaultPreference,
              }}
              activeOpacity={canChangeDefaultPreference ? 0.74 : 1}
              disabled={!canChangeDefaultPreference}
              onPress={() => setMakeDefaultAccount(value => !value)}
              style={styles.defaultStarButton}>
              <MaterialCommunityIcons
                name={defaultStarActive ? 'star' : 'star-outline'}
                size={28}
                color={
                  defaultStarActive
                    ? theme.colors.star
                    : theme.colors.textSubtle
                }
              />
            </TouchableOpacity>
          )}
        </View>
        {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingPanel}>
              <View style={styles.loadingSpinnerContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
              <View style={styles.loadingTextContainer}>
                <Text style={styles.loadingTitle}>{resolvedLoadingTitle}</Text>
                {loadingSubtitle ? (
                  <Text style={styles.loadingSubtitle}>
                    {loadingSubtitle}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        ) : (
          <>
            <AppTextInput
              ref={passwordInputRef}
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
            <AppButton
              onPress={() => tryUnlockAccount(password)}
              disabled={disabled}
              height={56}
              style={[
                styles.unlockButton,
                !showBiometryAction && styles.unlockButtonWithInputSpacing,
              ]}>
              {'Unlock'}
            </AppButton>
          </>
        )}
      </View>
    </BottomSheetModal>
  );
};

const createStyles = theme =>
  StyleSheet.create({
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
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  walletIdentity: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 14,
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
  defaultStarButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
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
  unlockButton: {
    width: '100%',
  },
  unlockButtonWithInputSpacing: {
    marginTop: 16,
  },
  loadingContainer: {
    minHeight: 136,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingPanel: {
    width: '100%',
    minHeight: 82,
    borderRadius: 14,
    borderWidth: theme.isDark ? StyleSheet.hairlineWidth : 0,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceRaised,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  loadingSpinnerContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: theme.colors.surfaceMuted,
  },
  loadingTextContainer: {
    minWidth: 0,
    flex: 1,
  },
  loadingTitle: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    ...fontStyle('semiBold'),
  },
  loadingSubtitle: {
    marginTop: 3,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('regular'),
  },
});

export default UnlockWalletSheet;
