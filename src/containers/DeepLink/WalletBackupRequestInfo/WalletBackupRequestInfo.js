import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Checkbox,
  Menu,
  Text,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useDispatch, useSelector} from 'react-redux';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  closeLoadingModal,
  openLoadingModal,
} from '../../../actions/actionDispatchers';
import {
  createAlert,
  resolveAlert,
} from '../../../actions/actions/alert/dispatchers/alert';
import {openAuthenticateUserModal} from '../../../actions/actions/sendModal/dispatchers/sendModal';
import Colors from '../../../globals/colors';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import scorePassword from '../../../utils/auth/scorePassword';
import {requestPassword, requestSeeds} from '../../../utils/auth/authBox';
import {
  MIN_PASS_LENGTH,
  MIN_PASS_SCORE,
  PASS_SCORE_LIMIT,
} from '../../../utils/constants/constants';
import {ELECTRUM} from '../../../utils/constants/intervalConstants';
import {SEND_MODAL_USER_ALLOWLIST} from '../../../utils/constants/sendModal';
import {getKey} from '../../../utils/keyGenerator/keyGenerator';
import {withKeepAwake} from '../../../utils/keepAwake/keepAwake';
import {getSupportedBiometryType} from '../../../utils/keychain/keychain';
import {createProfileFromSeed} from '../../../utils/profile/createProfileFromSeed';
import {
  WALLET_BACKUP_ENCRYPTION_ITERATION_OPTIONS,
  WALLET_BACKUP_ENCRYPTION_ITERS_MEDIUM,
  buildWalletBackupOrdinal,
  isValid24WordBip39Mnemonic,
} from '../../../utils/walletBackup/walletBackup';
import {
  getWalletBackupCompletionKey,
  markWalletBackupRequestComplete,
} from '../../../utils/walletBackup/walletBackupCompletionStorage';
import {
  beginWalletBackupNfcSession,
  endWalletBackupNfcSession,
  writeWalletBackupToNfc,
} from '../../../utils/walletBackup/walletBackupNfc';
import {useOnboardingTheme} from '../../../theme/onboarding';
import AppButton from '../../../components/AppButton';
import AppTextInput from '../../../components/AppTextInput';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import {fontStyle} from '../../../globals/fonts';

const passwordAutofillProps = {
  autoComplete: 'off',
  importantForAutofill: 'no',
  textContentType: 'none',
};
const waitForSpinnerFrame = () =>
  new Promise(resolve => setTimeout(resolve, 0));

const formatKdfIterations = iterations => `${iterations / 1000}k`;
const formatBackupKdfOptionLabel = option =>
  `${option.label} (${formatKdfIterations(option.iterations)})`;

const isTestProfile = account => {
  return Object.keys(account?.testnetOverrides || {}).length > 0;
};

const passwordStrengthDetails = password => {
  if (!password) {
    return {
      score: 0,
      text: 'strength',
      color: Colors.tertiaryColor,
    };
  }

  const score = scorePassword(password, MIN_PASS_LENGTH, PASS_SCORE_LIMIT);

  if (score < MIN_PASS_SCORE) {
    return {score, text: 'weak', color: Colors.warningButtonColor};
  } else if (score < PASS_SCORE_LIMIT - ((PASS_SCORE_LIMIT - MIN_PASS_SCORE) / 2)) {
    return {score, text: 'mediocre', color: Colors.infoButtonColor};
  } else {
    return {score, text: 'strong', color: Colors.verusGreenColor};
  }
};

const validatePasswordPair = (password, confirmPassword) => {
  if (!password) {
    return 'Please enter a password.';
  } else if (password !== confirmPassword) {
    return 'Password and confirm password do not match.';
  }

  return null;
};

const WalletBackupRequestInfo = props => {
  const {
    backupCompletionKey,
    cancel = () => {},
    detailIndex,
    next = async () => {},
    profileBackup = false,
    request,
    response,
    showSpendableKeyBackupChoice = false,
  } = props;

  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const dispatch = useDispatch();
  const signedIn = useSelector(state => state.authentication.signedIn);
  const accounts = useObjectSelector(state => state.authentication.accounts);
  const activeAccount = useObjectSelector(state => state.authentication.activeAccount);
  const activeCoinList = useObjectSelector(state => state.coins.activeCoinList);
  const activeAccountHash = activeAccount?.accountHash;

  const activeAccountIsTestnet = activeAccount ? isTestProfile(activeAccount) : false;
  const requestIsTestnet = profileBackup
    ? activeAccountIsTestnet
    : request != null && request.isTestnet();
  const activeAccountMatchesRequest =
    profileBackup
      ? signedIn && activeAccount != null
      : signedIn &&
        activeAccount &&
        activeAccountIsTestnet === requestIsTestnet;
  let backupDescription;

  if (requestIsTestnet) {
    backupDescription = profileBackup
      ? 'This will create a testnet wallet backup for the current profile on an NFC card.'
      : 'This request will create a testnet wallet backup on an NFC card.';
  } else {
    backupDescription = profileBackup
      ? 'This will create a wallet backup for the current profile on an NFC card.'
      : 'This request will create a wallet backup on an NFC card.';
  }

  const matchingAccounts = useMemo(() => {
    return accounts.filter(account => isTestProfile(account) === requestIsTestnet);
  }, [accounts, requestIsTestnet]);

  const [profileName, setProfileName] = useState(
    accounts.length === 0 ? 'My Verus Wallet' : '',
  );
  const [profilePassword, setProfilePassword] = useState('');
  const [profilePasswordConfirm, setProfilePasswordConfirm] = useState('');
  const [showCreateProfile, setShowCreateProfile] = useState(matchingAccounts.length === 0);
  const [useBiometrics, setUseBiometrics] = useState(false);
  const [supportedBiometryType, setSupportedBiometryType] = useState(null);

  const [encryptBackup, setEncryptBackup] = useState(true);
  const [useProfilePasswordForBackup, setUseProfilePasswordForBackup] =
    useState(true);
  const [backupPassword, setBackupPassword] = useState('');
  const [backupPasswordConfirm, setBackupPasswordConfirm] = useState('');
  const [backupKdfIters, setBackupKdfIters] = useState(
    WALLET_BACKUP_ENCRYPTION_ITERS_MEDIUM,
  );
  const [backupKdfMenuVisible, setBackupKdfMenuVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nfcStatus, setNfcStatus] = useState(null);
  const [backupChoiceMade, setBackupChoiceMade] = useState(
    !showSpendableKeyBackupChoice,
  );
  const walletBackupCacheRef = useRef(null);

  const profilePasswordDetails = passwordStrengthDetails(profilePassword);
  const backupPasswordDetails = passwordStrengthDetails(backupPassword);
  const selectedBackupKdfOption =
    WALLET_BACKUP_ENCRYPTION_ITERATION_OPTIONS.find(
      option => option.iterations === backupKdfIters,
    ) || WALLET_BACKUP_ENCRYPTION_ITERATION_OPTIONS[1];

  useEffect(() => {
    let mounted = true;

    getSupportedBiometryType()
      .then(biometryType => {
        if (mounted) setSupportedBiometryType(biometryType);
      })
      .catch(e => {
        console.warn(e);
        if (mounted) {
          setSupportedBiometryType({
            display_name: 'None',
            biometry: false,
          });
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    walletBackupCacheRef.current = null;
  }, [
    activeAccountHash,
    backupKdfIters,
    backupPassword,
    encryptBackup,
    profilePassword,
    useProfilePasswordForBackup,
  ]);

  useEffect(() => {
    setBackupChoiceMade(!showSpendableKeyBackupChoice);
  }, [showSpendableKeyBackupChoice]);

  const openLogin = () => {
    if (matchingAccounts.length === 0) {
      createAlert(
        'No profile found',
        `No ${requestIsTestnet ? 'testnet' : 'mainnet'} profile is available for this request.`,
      );
      return;
    }

    openAuthenticateUserModal({
      [SEND_MODAL_USER_ALLOWLIST]: matchingAccounts,
    });
  };

  const validateProfileForm = () => {
    if (!profileName || profileName.length < 1) {
      return 'Please enter a profile name.';
    } else if (profileName.length > 50) {
      return 'Please enter a profile name shorter than 50 characters.';
    } else if (accounts.find(account => account.id === profileName)) {
      return 'A profile with this name already exists.';
    }

    return validatePasswordPair(profilePassword, profilePasswordConfirm);
  };

  const createProfile = async () => {
    const error = validateProfileForm();

    if (error) {
      createAlert('Error', error);
      return;
    }

    Keyboard.dismiss();
    openLoadingModal('Setting up your new profile...');

    try {
      const seed = await getKey(256);

      await createProfileFromSeed({
        profileName,
        password: profilePassword,
        seed,
        accounts,
        activeCoinList,
        dispatch,
        testProfile: requestIsTestnet,
        includeDlightSeed: true,
        useBiometrics,
      });

      createAlert(
        'Profile created',
        `Your '${profileName}' profile has been created and is ready for wallet backup.`,
      );
    } catch (e) {
      console.error(e);
      createAlert('Error', e.message);
    } finally {
      closeLoadingModal();
    }
  };

  const toggleUseBiometrics = () => {
    if (useBiometrics) {
      setUseBiometrics(false);
    } else {
      setUseBiometrics(true);
    }
  };

  const confirmUnencryptedBackup = async () => {
    if (encryptBackup) return true;

    return createAlert(
      'Unencrypted Backup',
      'This will write your Secret Recovery Phrase to the NFC card without a backup password. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolveAlert(false),
        },
        {
          text: 'Continue',
          onPress: () => resolveAlert(true),
        },
      ],
      {cancelable: false},
    );
  };

  const getProfilePasswordForBackup = async () => {
    if (profilePassword) return profilePassword;
    return requestPassword();
  };

  const getWalletBackupForWrite = async () => {
    const backupEncryptionPassword = encryptBackup
      ? useProfilePasswordForBackup
        ? await getProfilePasswordForBackup()
        : backupPassword
      : null;
    const effectiveKdfIters = encryptBackup ? backupKdfIters : 0;
    const cachedWalletBackup = walletBackupCacheRef.current;

    if (
      cachedWalletBackup != null &&
      cachedWalletBackup.accountHash === activeAccountHash &&
      cachedWalletBackup.encryptBackup === encryptBackup &&
      cachedWalletBackup.password === backupEncryptionPassword &&
      cachedWalletBackup.kdfIters === effectiveKdfIters
    ) {
      setNfcStatus('Using prepared wallet backup. Wait for the NFC tap prompt.');
      await waitForSpinnerFrame();

      return cachedWalletBackup.walletBackup;
    }

    setNfcStatus(
      encryptBackup
        ? 'Encrypting your wallet backup. This can take a few minutes. Keep this screen open and wait for the NFC tap prompt.'
        : 'Preparing secure backup. Keep the card nearby, but wait for the tap prompt.',
    );
    await waitForSpinnerFrame();

    return withKeepAwake(async () => {
      const seeds = await requestSeeds();
      const mnemonic = seeds[ELECTRUM];

      if (!isValid24WordBip39Mnemonic(mnemonic)) {
        throw new Error(
          'The active profile does not contain a valid 24-word BIP39 Secret Recovery Phrase.',
        );
      }

      const walletBackup = await buildWalletBackupOrdinal({
        mnemonic,
        password: backupEncryptionPassword,
        kdfIters: effectiveKdfIters,
      });

      walletBackupCacheRef.current = {
        accountHash: activeAccountHash,
        encryptBackup,
        password: backupEncryptionPassword,
        kdfIters: effectiveKdfIters,
        walletBackup,
      };

      return walletBackup;
    });
  };

  const writeBackup = async () => {
    Keyboard.dismiss();

    if (!activeAccountMatchesRequest) {
      createAlert('Error', 'Please login to a matching profile before continuing.');
      return;
    }

    if (encryptBackup && !useProfilePasswordForBackup) {
      const passwordError = validatePasswordPair(
        backupPassword,
        backupPasswordConfirm,
      );

      if (passwordError) {
        createAlert('Error', passwordError);
        return;
      }
    }

    if (!(await confirmUnencryptedBackup())) return;

    setLoading(true);
    setNfcStatus('Preparing secure backup. Do not tap the card yet.');
    let nfcSessionPreRegistered = false;
    let nfcWriterStarted = false;

    try {
      nfcSessionPreRegistered = await beginWalletBackupNfcSession({
        onStatus: setNfcStatus,
      });

      const walletBackup = await getWalletBackupForWrite();

      nfcWriterStarted = true;
      await writeWalletBackupToNfc(walletBackup, {
        onStatus: setNfcStatus,
        sessionPreRegistered: nfcSessionPreRegistered,
      });

      const completionKey =
        backupCompletionKey ||
        getWalletBackupCompletionKey(
          request,
          detailIndex,
          activeAccount.accountHash,
        );

      await markWalletBackupRequestComplete(completionKey);
      await next(response, [detailIndex]);
    } catch (e) {
      console.error(e);
      createAlert(
        'Backup Failed',
        `${e.message || 'Unable to write wallet backup to NFC card.'}\n\nYour Secret Recovery Phrase was not backed up by this request. You can back it up later from the app settings.`,
      );
    } finally {
      if (nfcSessionPreRegistered && !nfcWriterStarted) {
        await endWalletBackupNfcSession();
      }

      setNfcStatus(null);
      setLoading(false);
    }
  };

  const skipBackupAndClaimSpendableKey = async () => {
    await next(response, [detailIndex]);
  };

  if (!backupChoiceMade) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.choiceContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <MaterialCommunityIcons
              color={theme.colors.primary}
              name="credit-card-wireless-outline"
              size={58}
              style={styles.heroIcon}
            />
            <Text style={styles.title}>
              Choose NFC Card Action
            </Text>
            <Text style={styles.body}>
              This NFC card can back up a Secret Recovery Phrase and redeem a spendable key. You can claim the spendable key to an existing matching profile, or back up a profile to the card first and then claim to that backed-up profile.
            </Text>
            <AppButton
              height={56}
              icon="wallet-outline"
              onPress={skipBackupAndClaimSpendableKey}
              style={styles.stackedButton}
              variant="primary">
              Claim to Existing Profile
            </AppButton>
            <AppButton
              height={52}
              icon="backup-restore"
              onPress={() => setBackupChoiceMade(true)}
              style={styles.stackedButton}
              variant="secondary">
              Back Up Then Claim
            </AppButton>
            <AppButton onPress={cancel} variant="text">
              Cancel
            </AppButton>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loadingContent}>
          <MaterialCommunityIcons
            color={theme.colors.primary}
            name="credit-card-wireless"
            size={64}
            style={styles.loadingIcon}
          />
          <ActivityIndicator
            animating
            color={theme.colors.primary}
            size="large"
            style={styles.loadingSpinner}
          />
          {nfcStatus && (
            <Text style={styles.loadingStatus}>
              {nfcStatus}
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.screen}>
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.scrollContent}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.form}>
              <View style={styles.header}>
                <MaterialCommunityIcons
                  color={theme.colors.primary}
                  name="credit-card-wireless"
                  size={48}
                />
                <Text style={styles.title}>
                  {!activeAccountMatchesRequest && showCreateProfile
                    ? 'Create & Backup Wallet'
                    : 'Backup Wallet'}
                </Text>
                <Text style={styles.body}>
                  {backupDescription}
                </Text>
              </View>

              {!activeAccountMatchesRequest ? (
                <View>
                  {matchingAccounts.length > 0 ? (
                    <AppButton
                      onPress={openLogin}
                      style={styles.stackedButton}
                      variant="primary">
                      Login to Profile
                    </AppButton>
                  ) : null}
                  {matchingAccounts.length > 0 ? (
                    <AppButton
                      onPress={() => setShowCreateProfile(!showCreateProfile)}
                      style={styles.stackedButton}
                      variant="text">
                      {showCreateProfile ? 'Hide New Profile' : 'Create New Profile'}
                    </AppButton>
                  ) : null}
                  {showCreateProfile ? (
                    <View style={styles.inputStack}>
                      <AppTextInput
                        label="Profile name"
                        onChangeText={setProfileName}
                        returnKeyType="done"
                        value={profileName}
                      />
                      <AppTextInput
                        {...passwordAutofillProps}
                        helperText={`Password strength: ${profilePasswordDetails.text}`}
                        label="Profile password"
                        onChangeText={setProfilePassword}
                        returnKeyType="done"
                        secureTextEntry
                        supportingTextStyle={{color: profilePasswordDetails.color}}
                        value={profilePassword}
                      />
                      <AppTextInput
                        {...passwordAutofillProps}
                        label="Confirm profile password"
                        onChangeText={setProfilePasswordConfirm}
                        returnKeyType="done"
                        secureTextEntry
                        value={profilePasswordConfirm}
                      />
                      {supportedBiometryType && supportedBiometryType.biometry ? (
                        <Checkbox.Item
                          color={theme.colors.primary}
                          label={`Enable ${supportedBiometryType.display_name} login`}
                          labelStyle={styles.checkboxLabel}
                          mode="android"
                          onPress={toggleUseBiometrics}
                          position="leading"
                          status={useBiometrics ? 'checked' : 'unchecked'}
                          style={styles.checkbox}
                        />
                      ) : null}
                      <AppButton
                        disabled={
                          !profileName ||
                          !profilePassword ||
                          !profilePasswordConfirm
                        }
                        onPress={createProfile}
                        variant="primary">
                        Create Profile
                      </AppButton>
                    </View>
                  ) : null}
                </View>
              ) : (
                <View>
                  <View style={styles.profileCard}>
                    <Text style={styles.profileName}>{activeAccount.id}</Text>
                    <Text style={styles.profileNetwork}>
                      {requestIsTestnet ? 'Testnet profile' : 'Mainnet profile'}
                    </Text>
                  </View>
                  <Checkbox.Item
                    color={theme.colors.primary}
                    label="Encrypt backup with password"
                    labelStyle={styles.checkboxLabel}
                    mode="android"
                    onPress={() => setEncryptBackup(!encryptBackup)}
                    position="leading"
                    status={encryptBackup ? 'checked' : 'unchecked'}
                    style={styles.checkbox}
                  />
                  {encryptBackup ? (
                    <View>
                      <Checkbox.Item
                        color={theme.colors.primary}
                        label="Use profile password for backup"
                        labelStyle={styles.checkboxLabel}
                        mode="android"
                        onPress={() =>
                          setUseProfilePasswordForBackup(
                            !useProfilePasswordForBackup,
                          )
                        }
                        position="leading"
                        status={
                          useProfilePasswordForBackup ? 'checked' : 'unchecked'
                        }
                        style={styles.checkbox}
                      />
                      {!useProfilePasswordForBackup ? (
                        <View style={styles.inputStack}>
                          <AppTextInput
                            {...passwordAutofillProps}
                            helperText={`Password strength: ${backupPasswordDetails.text}`}
                            label="Backup password"
                            onChangeText={setBackupPassword}
                            returnKeyType="done"
                            secureTextEntry
                            supportingTextStyle={{color: backupPasswordDetails.color}}
                            value={backupPassword}
                          />
                          <AppTextInput
                            {...passwordAutofillProps}
                            label="Confirm backup password"
                            onChangeText={setBackupPasswordConfirm}
                            returnKeyType="done"
                            secureTextEntry
                            value={backupPasswordConfirm}
                          />
                        </View>
                      ) : null}
                      <Menu
                        anchor={
                          <View style={styles.kdfAnchor}>
                            <Text style={styles.fieldLabel}>
                              Brute-force resistance (iterations)
                            </Text>
                            <AppButton
                              icon="shield-key-outline"
                              onPress={() => setBackupKdfMenuVisible(true)}
                              variant="secondary">
                              {formatBackupKdfOptionLabel(selectedBackupKdfOption)}
                            </AppButton>
                          </View>
                        }
                        onDismiss={() => setBackupKdfMenuVisible(false)}
                        visible={backupKdfMenuVisible}>
                        {WALLET_BACKUP_ENCRYPTION_ITERATION_OPTIONS.map(option => (
                          <Menu.Item
                            key={option.key}
                            onPress={() => {
                              setBackupKdfIters(option.iterations);
                              setBackupKdfMenuVisible(false);
                            }}
                            title={formatBackupKdfOptionLabel(option)}
                          />
                        ))}
                      </Menu>
                      <Text style={styles.helperText}>
                        Higher resistance takes longer to encrypt and decrypt.
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
            </View>
          </ScrollView>
          <SafeBottomActionStack gap={10}>
            {activeAccountMatchesRequest ? (
              <AppButton
                disabled={
                  encryptBackup &&
                  !useProfilePasswordForBackup &&
                  (!backupPassword || !backupPasswordConfirm)
                }
                height={56}
                onPress={writeBackup}
                variant="primary">
                Write NFC Backup
              </AppButton>
            ) : null}
            <AppButton onPress={cancel} variant="text">
              Cancel
            </AppButton>
          </SafeBottomActionStack>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const createStyles = theme =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 22,
      paddingTop: 24,
      paddingBottom: 32,
    },
    choiceContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 22,
      paddingVertical: 48,
    },
    form: {
      width: '100%',
      maxWidth: 430,
      alignSelf: 'center',
    },
    header: {
      alignItems: 'center',
      marginBottom: 24,
    },
    heroIcon: {
      alignSelf: 'center',
      marginBottom: 18,
    },
    title: {
      marginTop: 12,
      color: theme.colors.textPrimary,
      fontSize: 24,
      lineHeight: 31,
      textAlign: 'center',
      ...fontStyle('semiBold'),
    },
    body: {
      marginTop: 10,
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
      ...fontStyle('regular'),
    },
    stackedButton: {
      marginTop: 12,
    },
    inputStack: {
      gap: 12,
      marginTop: 12,
    },
    profileCard: {
      marginBottom: 8,
      padding: 14,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 12,
    },
    profileName: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      lineHeight: 20,
      ...fontStyle('semiBold'),
    },
    profileNetwork: {
      marginTop: 3,
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      ...fontStyle('regular'),
    },
    checkbox: {
      paddingLeft: 0,
    },
    checkboxLabel: {
      color: theme.colors.textPrimary,
      fontSize: 14,
    },
    kdfAnchor: {
      marginTop: 14,
    },
    fieldLabel: {
      marginBottom: 6,
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      ...fontStyle('semiBold'),
    },
    helperText: {
      marginTop: 8,
      marginBottom: 12,
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
      ...fontStyle('regular'),
    },
    loadingContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    loadingIcon: {
      marginBottom: 24,
    },
    loadingSpinner: {
      marginVertical: 8,
    },
    loadingStatus: {
      marginTop: 24,
      color: theme.colors.textPrimary,
      fontSize: 22,
      lineHeight: 30,
      textAlign: 'center',
      ...fontStyle('semiBold'),
    },
  });

export default WalletBackupRequestInfo;
