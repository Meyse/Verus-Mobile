import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import {Info} from 'lucide-react-native';
import {useDispatch, useSelector} from 'react-redux';
import {SafeAreaView} from 'react-native-safe-area-context';
import store from '../../../store';
import {
  captureSessionScope,
  sessionScopeIsCurrent,
} from '../../../actions/actions/updates/sessionRequests';
import {
  closeLoadingModal,
  openLoadingModal,
  requestWalletUnlock,
  WALLET_UNLOCK_CANCELLED,
} from '../../../actions/actionDispatchers';
import {
  createAlert,
  resolveAlert,
} from '../../../actions/actions/alert/dispatchers/alert';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import scorePassword from '../../../utils/auth/scorePassword';
import {requestPassword, requestSeeds} from '../../../utils/auth/authBox';
import {
  MIN_PASS_LENGTH,
  MIN_PASS_SCORE,
  PASS_SCORE_LIMIT,
} from '../../../utils/constants/constants';
import {ELECTRUM} from '../../../utils/constants/intervalConstants';
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
  cancelWalletBackupNfcRequest,
  endWalletBackupNfcSession,
  writeWalletBackupToNfc,
} from '../../../utils/walletBackup/walletBackupNfc';
import {
  getNfcTapFailure,
  getNfcTapText,
  NFC_TAP_PHASE,
  NFC_TAP_TASK,
} from '../../../utils/walletBackup/nfcTapText';
import {walletBackupRequestInfoStyles as createStyles} from '../../../styles';
import {useOnboardingTheme} from '../../../theme/onboarding';
import AppButton from '../../../components/AppButton';
import AppTextInput from '../../../components/AppTextInput';
import NfcTapView from '../../../components/NfcTap/NfcTapView';
import BiometricAffordanceIcon, {
  getBiometryPresentation,
} from '../../../components/BiometricAffordanceIcon';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import SelectionSheet, {SelectionRow} from '../../../components/SelectionSheet';
import useSheetDismissal from '../../../components/useSheetDismissal';
import {
  SettingsProfileSummary,
  SettingsRow,
  SettingsSection,
  SettingsSwitchRow,
} from '../../Settings/components/SettingsScaffold';
import {
  DeepLinkReviewScrollView,
  RequestTitle,
} from '../components/RequestReview';

// Same settings as onboarding: on iOS, 'oneTimeCode' stops the strong-password
// suggestion, which can leave a value in the field state that the user never
// saw.
const passwordAutofillProps = Platform.select({
  ios: {
    textContentType: 'oneTimeCode',
    spellCheck: false,
  },
  default: {
    autoComplete: 'off',
    importantForAutofill: 'no',
    textContentType: 'none',
    spellCheck: false,
  },
});
const KEYBOARD_FOOTER_SPACING = 8;
const waitForSpinnerFrame = () =>
  new Promise(resolve => setTimeout(resolve, 0));

const formatKdfIterations = iterations => `${iterations / 1000}k iterations`;

// How the written card is protected. The result screen names the password
// that restores the wallet.
const BACKUP_PROTECTION = {
  WALLET_PASSWORD: 'wallet-password',
  BACKUP_PASSWORD: 'backup-password',
  NONE: 'none',
};

const BACKUP_RESULT_SUBTITLES = {
  [BACKUP_PROTECTION.WALLET_PASSWORD]:
    'Restore it with your wallet password. Keep the card somewhere safe.',
  [BACKUP_PROTECTION.BACKUP_PASSWORD]:
    'Restore it with your backup password. Keep the card somewhere safe.',
  [BACKUP_PROTECTION.NONE]:
    'Anyone who has the card can restore this wallet. Keep it somewhere safe.',
};

const isTestProfile = account => {
  return Object.keys(account?.testnetOverrides || {}).length > 0;
};

const passwordStrengthDetails = (password, theme) => {
  if (!password) return null;

  const score = scorePassword(password, MIN_PASS_LENGTH, PASS_SCORE_LIMIT);

  if (score < MIN_PASS_SCORE) {
    return {text: 'weak', color: theme.colors.warning};
  } else if (score < PASS_SCORE_LIMIT - ((PASS_SCORE_LIMIT - MIN_PASS_SCORE) / 2)) {
    return {text: 'fair', color: theme.colors.textSecondary};
  } else {
    return {text: 'strong', color: theme.colors.success};
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

const BackupKdfSheet = ({onClose, onSelect, selectedIterations, visible}) => {
  const dismissal = useSheetDismissal({visible, onClose});

  return (
    <SelectionSheet
      onClose={dismissal.close}
      onClosed={dismissal.onClosed}
      subtitle="Higher resistance takes longer to encrypt and to restore."
      title="Brute-force resistance"
      visible={visible}>
      {WALLET_BACKUP_ENCRYPTION_ITERATION_OPTIONS.map(option => (
        <SelectionRow
          key={option.key}
          onPress={() => dismissal.dismiss(() => onSelect(option.iterations))}
          selected={option.iterations === selectedIterations}
          subtitle={formatKdfIterations(option.iterations)}
          title={option.label}
        />
      ))}
    </SelectionSheet>
  );
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
  const networkName = requestIsTestnet ? 'testnet' : 'mainnet';

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
  const [backupKdfSheetVisible, setBackupKdfSheetVisible] = useState(false);
  const [creatingProfile, setCreatingProfile] = useState(false);
  // The NFC tap step while the backup is written, or the failed write.
  const [nfcTap, setNfcTap] = useState(null);
  const [backupResult, setBackupResult] = useState(null);
  const [finishing, setFinishing] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [backupChoiceMade, setBackupChoiceMade] = useState(
    !showSpendableKeyBackupChoice,
  );
  const walletBackupCacheRef = useRef(null);
  const creatingProfileRef = useRef(false);
  const writingBackupRef = useRef(false);
  const finishingRef = useRef(false);
  // Settings shows a navigation header above this screen. The keyboard offset
  // must include it, or the footer stays partly under the keyboard.
  const keyboardFrameRef = useRef(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const profilePasswordDetails = passwordStrengthDetails(profilePassword, theme);
  const backupPasswordDetails = passwordStrengthDetails(backupPassword, theme);
  const selectedBackupKdfOption =
    WALLET_BACKUP_ENCRYPTION_ITERATION_OPTIONS.find(
      option => option.iterations === backupKdfIters,
    ) || WALLET_BACKUP_ENCRYPTION_ITERATION_OPTIONS[1];
  // Settings opens this screen under its own header, which already clears the
  // status bar. A request opens it full screen.
  const safeAreaEdges = profileBackup
    ? ['left', 'right']
    : ['top', 'left', 'right'];
  const moreDetailsFollow =
    !profileBackup &&
    request?.details != null &&
    request.details.length > detailIndex + 1;

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

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () =>
      setKeyboardVisible(true),
    );
    const hideSubscription = Keyboard.addListener(hideEvent, () =>
      setKeyboardVisible(false),
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const openLogin = async () => {
    if (matchingAccounts.length === 0) {
      createAlert(
        'No wallet found',
        `No ${networkName} wallet is available for this request.`,
      );
      return;
    }

    try {
      await requestWalletUnlock({
        reason: 'wallet-backup-request',
        title: signedIn
          ? 'Switch wallet to continue'
          : 'Unlock wallet to continue',
        requestLabel: 'Wallet backup',
        accountHashes: matchingAccounts.map(account => account.accountHash),
        networkLabel: requestIsTestnet ? 'Testnet' : 'Mainnet',
      });
    } catch (e) {
      if (e?.code !== WALLET_UNLOCK_CANCELLED) {
        createAlert('Cannot continue', e?.message || 'Unable to unlock wallet.');
      }
    }
  };

  const validateProfileForm = () => {
    if (creatingProfile || !profileName || profileName.length < 1) {
      return 'Please enter a wallet name.';
    } else if (profileName.length > 50) {
      return 'Please enter a wallet name shorter than 50 characters.';
    } else if (accounts.find(account => account.id === profileName)) {
      return 'A wallet with this name already exists.';
    }

    return validatePasswordPair(profilePassword, profilePasswordConfirm);
  };

  const createProfile = async () => {
    if (creatingProfileRef.current) return;
    const error = validateProfileForm();

    if (error) {
      createAlert('Error', error);
      return;
    }

    creatingProfileRef.current = true;
    setCreatingProfile(true);
    let profileCreated = false;

    try {
      Keyboard.dismiss();
      openLoadingModal('Setting up your new wallet...');
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
      // The screen moves on to the backup options for the new wallet, which
      // shows that the wallet exists.
      profileCreated = true;
    } catch (e) {
      console.error(e);
      createAlert('Error', e.message);
    } finally {
      // Keep successful submission latched while the account UI catches up.
      if (!profileCreated) {
        setCreatingProfile(false);
        creatingProfileRef.current = false;
      }
      closeLoadingModal();
    }
  };

  const confirmUnencryptedBackup = async () => {
    if (encryptBackup) return true;

    return createAlert(
      'Back up without a password?',
      'Anyone who has the NFC card can restore this wallet.',
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

  const getWalletBackupForWrite = async assertAccountCurrent => {
    assertAccountCurrent();
    const backupEncryptionPassword = encryptBackup
      ? useProfilePasswordForBackup
        ? await getProfilePasswordForBackup()
        : backupPassword
      : null;
    assertAccountCurrent();
    const effectiveKdfIters = encryptBackup ? backupKdfIters : 0;
    const cachedWalletBackup = walletBackupCacheRef.current;

    if (
      cachedWalletBackup != null &&
      cachedWalletBackup.accountHash === activeAccountHash &&
      cachedWalletBackup.encryptBackup === encryptBackup &&
      cachedWalletBackup.password === backupEncryptionPassword &&
      cachedWalletBackup.kdfIters === effectiveKdfIters
    ) {
      setNfcTap(getNfcTapText(NFC_TAP_TASK.BACKUP, NFC_TAP_PHASE.PREPARING));
      await waitForSpinnerFrame();
      assertAccountCurrent();

      return cachedWalletBackup.walletBackup;
    }

    setNfcTap({
      ...getNfcTapText(NFC_TAP_TASK.BACKUP, NFC_TAP_PHASE.PREPARING),
      ...(encryptBackup && {
        detail:
          'Encrypting can take a few minutes. Keep this screen open, and do not hold the card yet.',
      }),
    });
    await waitForSpinnerFrame();

    return withKeepAwake(async () => {
      assertAccountCurrent();
      const seeds = await requestSeeds();
      assertAccountCurrent();
      const mnemonic = seeds[ELECTRUM];

      if (!isValid24WordBip39Mnemonic(mnemonic)) {
        throw new Error(
          'The active wallet does not contain a valid 24-word BIP39 Secret Recovery Phrase.',
        );
      }

      const walletBackup = await buildWalletBackupOrdinal({
        mnemonic,
        password: backupEncryptionPassword,
        kdfIters: effectiveKdfIters,
      });
      assertAccountCurrent();

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

  // A retry after a failed write keeps the choice the user already confirmed.
  const writeBackup = async options => {
    if (writingBackupRef.current) return;
    const retry = options?.retry === true;
    Keyboard.dismiss();

    if (!activeAccountMatchesRequest) {
      createAlert('Error', 'Please sign in to a matching wallet before continuing.');
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

    const sessionScope = captureSessionScope(store.getState(), activeAccountHash);
    const assertAccountCurrent = () => {
      const state = store.getState();
      if (!sessionScope.accountHash || !state.authentication.signedIn ||
        !sessionScopeIsCurrent(state, sessionScope)) {
        const error = new Error('Account changed before the backup was written. Please start the backup again.');
        error.code = 'SESSION_CHANGED';
        throw error;
      }
    };

    writingBackupRef.current = true;
    let nfcSessionPreRegistered = false;
    let nfcWriterStarted = false;
    let backupCompleted = false;

    let failedStep = null;

    try {
      if (!retry && !(await confirmUnencryptedBackup())) return;

      setNfcTap(getNfcTapText(NFC_TAP_TASK.BACKUP, NFC_TAP_PHASE.PREPARING));
      assertAccountCurrent();
      nfcSessionPreRegistered = await beginWalletBackupNfcSession();
      assertAccountCurrent();

      const walletBackup = await getWalletBackupForWrite(assertAccountCurrent);
      assertAccountCurrent();

      nfcWriterStarted = true;
      await writeWalletBackupToNfc(walletBackup, {
        onPhase: phase =>
          setNfcTap(getNfcTapText(NFC_TAP_TASK.BACKUP, phase)),
        sessionPreRegistered: nfcSessionPreRegistered,
        beforeWrite: assertAccountCurrent,
      });

      const completionKey =
        backupCompletionKey ||
        getWalletBackupCompletionKey(
          request,
          detailIndex,
          activeAccount.accountHash,
        );

      await markWalletBackupRequestComplete(completionKey);
      setBackupResult({
        protection: !encryptBackup
          ? BACKUP_PROTECTION.NONE
          : useProfilePasswordForBackup
          ? BACKUP_PROTECTION.WALLET_PASSWORD
          : BACKUP_PROTECTION.BACKUP_PASSWORD,
      });
      backupCompleted = true;
    } catch (e) {
      // A cancelled session goes back to the options without a message.
      failedStep = getNfcTapFailure(NFC_TAP_TASK.BACKUP, e);
      // Known card results are normal steps. Log only unexpected errors.
      if (failedStep != null && e?.code == null) console.error(e);
    } finally {
      try {
        if (nfcSessionPreRegistered && !nfcWriterStarted) {
          await endWalletBackupNfcSession();
        }
      } finally {
        setNfcTap(failedStep);
        // A written card stays latched: the result screen replaces the form,
        // and the card must not be written a second time.
        if (!backupCompleted) {
          writingBackupRef.current = false;
        }
      }
    }
  };

  const finishBackup = async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setFinishing(true);

    try {
      await next(response, [detailIndex]);
    } catch (e) {
      finishingRef.current = false;
      setFinishing(false);
      createAlert(
        'Cannot finish request',
        e?.message || 'Unable to continue the request.',
      );
    }
  };

  const skipBackupAndClaimSpendableKey = async () => {
    await next(response, [detailIndex]);
  };

  const renderScreen = ({title, subtitle, body, footer, keyboard = false}) => {
    const content = (
      <SafeAreaView edges={safeAreaEdges} style={styles.container}>
        <DeepLinkReviewScrollView
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <RequestTitle>{title}</RequestTitle>
            {subtitle ? (
              <Text style={styles.mainSubtitle}>{subtitle}</Text>
            ) : null}
          </View>
          {body}
        </DeepLinkReviewScrollView>
        <SafeBottomActionStack
          bottomSpacing={keyboardVisible ? KEYBOARD_FOOTER_SPACING : 30}
          gap={10}
          horizontalSpacing={24}
          includeBottomInset={!keyboardVisible}
          style={styles.footer}>
          {footer}
        </SafeBottomActionStack>
      </SafeAreaView>
    );

    if (!keyboard) return content;

    return (
      <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
        <View
          onLayout={() =>
            keyboardFrameRef.current?.measureInWindow((_x, y) =>
              setKeyboardOffset(Math.max(0, y)),
            )
          }
          ref={keyboardFrameRef}
          style={styles.keyboardFrame}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={keyboardOffset}
            style={styles.keyboardFrame}>
            {content}
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    );
  };

  const renderSecondaryButton = (label, onPress) => (
    <AppButton
      buttonColor={theme.colors.surfaceMuted}
      height={56}
      onPress={onPress}
      textColor={theme.isDark ? theme.colors.textPrimary : theme.colors.primary}
      variant="secondary">
      {label}
    </AppButton>
  );
  const cancelButton = renderSecondaryButton('Cancel', cancel);

  if (!backupChoiceMade) {
    return renderScreen({
      title: 'Claim this card',
      subtitle:
        'Claim it to a wallet you already have, or back up a wallet to this card first.',
      footer: (
        <>
          <AppButton
            height={56}
            onPress={skipBackupAndClaimSpendableKey}
            variant="primary">
            Claim to existing wallet
          </AppButton>
          {renderSecondaryButton('Back up first', () =>
            setBackupChoiceMade(true),
          )}
          <AppButton onPress={cancel} variant="text">
            Cancel
          </AppButton>
        </>
      ),
    });
  }

  const renderNfcTap = (step, actions = []) => (
    <SafeAreaView edges={safeAreaEdges} style={styles.container}>
      <NfcTapView {...step} actions={actions} testID="walletBackup.nfcTap" />
    </SafeAreaView>
  );

  if (backupResult) {
    return renderNfcTap(
      {
        phase: NFC_TAP_PHASE.DONE,
        title: 'Backup written',
        detail: BACKUP_RESULT_SUBTITLES[backupResult.protection],
      },
      [
        {
          disabled: finishing,
          label: moreDetailsFollow ? 'Continue' : 'Done',
          onPress: finishBackup,
          variant: 'primary',
        },
      ],
    );
  }

  if (nfcTap != null) {
    const ended =
      nfcTap.phase === NFC_TAP_PHASE.FAILED ||
      nfcTap.phase === NFC_TAP_PHASE.NOTICE;
    // iOS has its own Cancel in the scan sheet.
    const canCancel =
      nfcTap.phase === NFC_TAP_PHASE.WAITING && Platform.OS === 'android';

    return renderNfcTap(
      nfcTap,
      ended
        ? [
            {
              label: 'Try again',
              onPress: () => writeBackup({retry: true}),
              variant: 'primary',
            },
            {cancel: true, label: 'Cancel', onPress: () => setNfcTap(null)},
          ]
        : canCancel
        ? [{cancel: true, label: 'Cancel', onPress: cancelWalletBackupNfcRequest}]
        : [],
    );
  }

  if (!activeAccountMatchesRequest) {
    const biometryAvailable =
      supportedBiometryType != null && supportedBiometryType.biometry;
    const switchAccountChoice = matchingAccounts.length > 0 ? (
      <AppButton
        onPress={() => setShowCreateProfile(!showCreateProfile)}
        variant="text">
        {showCreateProfile ? 'Use an existing wallet' : 'Create a new wallet'}
      </AppButton>
    ) : null;

    if (showCreateProfile) {
      return renderScreen({
        keyboard: true,
        title: 'Create wallet',
        subtitle: `Create a ${networkName} wallet, then write its Secret Recovery Phrase to an NFC card.`,
        body: (
          <>
            <View style={styles.inputStack}>
              <AppTextInput
                label="Wallet name"
                onChangeText={setProfileName}
                returnKeyType="done"
                value={profileName}
              />
              <AppTextInput
                {...passwordAutofillProps}
                helperText={
                  profilePasswordDetails
                    ? `Password strength: ${profilePasswordDetails.text}`
                    : undefined
                }
                label="Wallet password"
                onChangeText={setProfilePassword}
                returnKeyType="done"
                secureTextEntry
                supportingTextStyle={
                  profilePasswordDetails
                    ? {color: profilePasswordDetails.color}
                    : undefined
                }
                value={profilePassword}
              />
              <AppTextInput
                {...passwordAutofillProps}
                label="Confirm wallet password"
                onChangeText={setProfilePasswordConfirm}
                returnKeyType="done"
                secureTextEntry
                value={profilePasswordConfirm}
              />
            </View>
            {biometryAvailable ? (
              <SettingsSwitchRow
                last
                leading={
                  <BiometricAffordanceIcon
                    size={19}
                    supportedBiometryType={supportedBiometryType}
                  />
                }
                onValueChange={setUseBiometrics}
                title={getBiometryPresentation(supportedBiometryType).settingsTitle}
                value={useBiometrics}
              />
            ) : null}
            {switchAccountChoice}
          </>
        ),
        footer: (
          <>
            <AppButton
              disabled={
                creatingProfile ||
                !profileName ||
                !profilePassword ||
                !profilePasswordConfirm
              }
              height={56}
              loading={creatingProfile}
              onPress={createProfile}
              variant="primary">
              Create wallet
            </AppButton>
            {cancelButton}
          </>
        ),
      });
    }

    return renderScreen({
      title: 'Back up wallet',
      subtitle: "Write a wallet's Secret Recovery Phrase to an NFC card.",
      body: switchAccountChoice,
      footer: (
        <>
          <View style={styles.footerInfoRow}>
            <View style={styles.footerInfoIcon}>
              <Info
                color={theme.colors.textSubtle}
                size={16}
                strokeWidth={2.1}
              />
            </View>
            <Text style={styles.footerInfoText}>
              {signedIn
                ? `Switch to a ${networkName} wallet to continue.`
                : `Unlock a ${networkName} wallet to continue.`}
            </Text>
          </View>
          <AppButton height={56} onPress={openLogin} variant="primary">
            {signedIn ? 'Switch wallet' : 'Unlock wallet'}
          </AppButton>
          {cancelButton}
        </>
      ),
    });
  }

  const customPasswordIncomplete =
    encryptBackup &&
    !useProfilePasswordForBackup &&
    (!backupPassword || !backupPasswordConfirm);

  return renderScreen({
    keyboard: true,
    title: 'Back up wallet',
    subtitle: "Write this wallet's Secret Recovery Phrase to an NFC card.",
    body: (
      <>
        <BackupKdfSheet
          onClose={() => setBackupKdfSheetVisible(false)}
          onSelect={setBackupKdfIters}
          selectedIterations={backupKdfIters}
          visible={backupKdfSheetVisible}
        />
        <SettingsProfileSummary
          name={activeAccount.id}
          subtitle={requestIsTestnet ? 'Testnet wallet' : null}
          walletAvatar={activeAccount.walletAvatar}
        />
        <SettingsSection title="Encryption">
          <SettingsSwitchRow
            icon="lock-outline"
            last={!encryptBackup}
            onValueChange={setEncryptBackup}
            title="Encrypt backup"
            value={encryptBackup}
          />
          {encryptBackup ? (
            <>
              <SettingsSwitchRow
                icon="key-outline"
                onValueChange={setUseProfilePasswordForBackup}
                title="Use wallet password"
                value={useProfilePasswordForBackup}
              />
              {!useProfilePasswordForBackup ? (
                <View style={styles.passwordStack}>
                  <AppTextInput
                    {...passwordAutofillProps}
                    helperText={
                      backupPasswordDetails
                        ? `Password strength: ${backupPasswordDetails.text}`
                        : undefined
                    }
                    label="Backup password"
                    onChangeText={setBackupPassword}
                    returnKeyType="done"
                    secureTextEntry
                    supportingTextStyle={
                      backupPasswordDetails
                        ? {color: backupPasswordDetails.color}
                        : undefined
                    }
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
              <SettingsRow
                icon="shield-key-outline"
                last
                onPress={() => {
                  Keyboard.dismiss();
                  setBackupKdfSheetVisible(true);
                }}
                title="Brute-force resistance"
                value={selectedBackupKdfOption.label}
              />
            </>
          ) : null}
        </SettingsSection>
      </>
    ),
    footer: (
      <>
        <AppButton
          disabled={customPasswordIncomplete}
          height={56}
          onPress={writeBackup}
          variant="primary">
          Write to NFC card
        </AppButton>
        {cancelButton}
      </>
    ),
  });
};

export default WalletBackupRequestInfo;
