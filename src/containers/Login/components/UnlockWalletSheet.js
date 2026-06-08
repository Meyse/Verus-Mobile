import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Keyboard, StyleSheet, TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {initializeAccountData} from '../../../actions/actionDispatchers';
import AppButton from '../../../components/AppButton';
import AppTextInput from '../../../components/AppTextInput';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import BottomSheetModal from '../../../components/BottomSheetModal';
import WalletAvatar from '../../../components/WalletAvatar';
import Colors from '../../../globals/colors';
import {fontStyle} from '../../../globals/fonts';
import {signedOutSheetStyles} from '../../../styles';
import {getBiometricPassword} from '../../../utils/keychain/biometrics';
import {getSupportedBiometryType} from '../../../utils/keychain/keychain';
import {normalizeWalletAvatar} from '../../../utils/walletAvatar';

const BIOMETRY_UNAVAILABLE_MESSAGE =
  'Biometric unlock is unavailable. Enter your password to continue.';
const DEFAULT_STAR_COLOR = '#F7B500';
const PASSWORD_AUTO_FOCUS_DELAY_MS = 260;

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

const UnlockWalletSheet = ({
  visible,
  account,
  isDefaultAccount,
  onClose,
  onUnlocked,
}) => {
  const [password, setPassword] = useState('');
  const [makeDefaultAccount, setMakeDefaultAccount] =
    useState(isDefaultAccount);
  const [loading, setLoading] = useState(false);
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
      setMakeDefaultAccount(isDefaultAccount);
      setBiometryAttempted(false);
      setSupportedBiometryType(null);
      setShowPassword(false);
    }
  }, [account ? account.accountHash : null, isDefaultAccount, visible]);

  const tryUnlockAccount = useCallback(
    async (key, nextMakeDefault = makeDefaultAccount) => {
      if (!account || !key || loading) {
        return;
      }

      setLoading(true);
      setErrorMessage(null);
      Keyboard.dismiss();

      try {
        await initializeAccountData(account, key, nextMakeDefault);
        setLoading(false);

        if (typeof onUnlocked === 'function') {
          onUnlocked();
        }

        onClose();
      } catch (e) {
        console.warn(e);
        setLoading(false);
        setErrorMessage(formatErrorMessage(e));
      }
    },
    [account, loading, makeDefaultAccount, onClose, onUnlocked],
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
          await tryUnlockAccount(biometricPassword, makeDefaultAccount);
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
  const canChangeDefaultPreference =
    visible && account != null && !displayIsDefaultAccount && !loading;
  const defaultAccessibilityLabel = getDefaultAccessibilityLabel(
    displayIsDefaultAccount,
    defaultStarActive,
  );
  const disabled = password.length === 0 || loading || !account;
  const showBiometryAction = !!(displayAccount && displayAccount.biometry);

  return (
    <BottomSheetModal
      visible={visible}
      onClose={loading ? () => {} : onClose}
      avoidKeyboard
      maxHeight="64%">
      <View style={signedOutSheetStyles.body}>
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
                  color={Colors.primaryColor}
                />
              )}
            </View>
            <Text numberOfLines={1} style={styles.walletName}>
              {displayAccount ? displayAccount.id : ''}
            </Text>
          </View>
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
                defaultStarActive ? DEFAULT_STAR_COLOR : Colors.verusDarkGray
              }
            />
          </TouchableOpacity>
        </View>
        {loading ? (
          <View style={styles.loadingContainer}>
            <AnimatedActivityIndicatorBox />
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
                  color={Colors.primaryColor}
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

const styles = StyleSheet.create({
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
    backgroundColor: '#EEF3FF',
  },
  walletName: {
    flex: 1,
    color: Colors.quinaryColor,
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
    color: Colors.warningButtonColor,
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
    color: Colors.primaryColor,
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
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default UnlockWalletSheet;
