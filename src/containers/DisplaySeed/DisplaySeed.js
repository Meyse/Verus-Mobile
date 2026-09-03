import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  AppState,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import {CommonActions} from '@react-navigation/native';
import {Text} from 'react-native-paper';
import {validateMnemonic} from 'bip39';
import AppButton from '../../components/AppButton';
import CopyAction from '../../components/CopyAction';
import OnboardingBackButton from '../../components/OnboardingBackButton';
import PasswordCheck from '../../components/PasswordCheck';
import RecoverySecretsPrivacyGuard from '../../components/RecoverySecretsPrivacyGuard';
import {fontStyle} from '../../globals/fonts';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../theme/onboarding';
import {
  accountMatchesNetwork,
  getAccountNetworkKey,
  getWalletNetworkLabel,
} from '../../utils/account/accountNetwork';
import {coinsList} from '../../utils/CoinData/CoinsList';
import {
  DLIGHT_PRIVATE,
  ELECTRUM,
  ETH,
  WYRE_SERVICE,
} from '../../utils/constants/intervalConstants';
import {
  deriveKeyPair,
  dlightSeedToBytes,
  isDlightSpendingKey,
} from '../../utils/keys';
import {
  SettingsActionFooter,
  SettingsNotice,
  SettingsProfileSummary,
  SettingsScreen,
  SettingsSection,
  SettingsTitle,
} from '../Settings/components/SettingsScaffold';

const REVEAL_TIMEOUT_MS = 60 * 1000;
const SECRET_NAMES = {
  [DLIGHT_PRIVATE]: 'Secondary (Z-address)',
  [ELECTRUM]: 'Primary',
  [WYRE_SERVICE]: 'Wyre account',
};

const normalizeSecrets = secrets =>
  Object.fromEntries(
    Object.entries(secrets || {}).filter(
      ([key, value]) =>
        SECRET_NAMES[key] != null &&
        typeof value === 'string' &&
        value.length > 0,
    ),
  );

const getAuthenticationError = error =>
  error?.message === 'Incorrect password'
    ? 'Password not recognized. Try again.'
    : 'Unable to access this wallet. Try again.';

const DisplaySeed = ({navigation, route}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const accounts = useObjectSelector(state => state.authentication.accounts);
  const activeAccount = useObjectSelector(
    state => state.authentication.activeAccount,
  );
  const params = route?.params || {};
  const data = params.data || {};
  const showSignedOutHeader = params.showSignedOutHeader === true;
  const accountHash = params.accountHash;
  const requiresAuthentication = typeof accountHash === 'string';
  const protectedAccount = useMemo(
    () =>
      requiresAuthentication
        ? (accounts || []).find(account => account.accountHash === accountHash)
        : null,
    [accountHash, accounts, requiresAuthentication],
  );
  const account = protectedAccount || activeAccount;
  const expectedNetworkKey = params.networkKey;
  const accountIsAllowed =
    !requiresAuthentication ||
    (protectedAccount != null &&
      accountMatchesNetwork(protectedAccount, expectedNetworkKey));
  const networkKey =
    expectedNetworkKey || (account ? getAccountNetworkKey(account) : null);
  const networkLabel = networkKey
    ? getWalletNetworkLabel(networkKey)
    : 'Wallet';
  const [secrets, setSecrets] = useState(() =>
    requiresAuthentication ? {} : normalizeSecrets(data.seeds),
  );
  const [revealedSecrets, setRevealedSecrets] = useState({});
  const [derivedKeys, setDerivedKeys] = useState({});
  const [revealedDerivedKeys, setRevealedDerivedKeys] = useState({});
  const [fetchingDerivedKey, setFetchingDerivedKey] = useState(null);
  const [derivedKeyError, setDerivedKeyError] = useState(null);
  const [authenticationError, setAuthenticationError] = useState(null);
  const [authenticationVisible, setAuthenticationVisible] = useState(
    requiresAuthentication && accountIsAllowed,
  );
  const [captureBlocked, setCaptureBlocked] = useState(false);
  const sensitiveDataLoadedRef = useRef(Object.keys(secrets).length > 0);
  const reauthenticateOnActiveRef = useRef(false);
  const captureBlockedRef = useRef(false);
  const sensitiveSessionRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
      sensitiveSessionRef.current += 1;
    },
    [],
  );

  useEffect(() => {
    sensitiveDataLoadedRef.current = Object.keys(secrets).length > 0;
  }, [secrets]);

  useEffect(() => {
    captureBlockedRef.current = captureBlocked;
  }, [captureBlocked]);

  const hideSensitiveValues = useCallback(() => {
    sensitiveSessionRef.current += 1;
    setRevealedSecrets({});
    setDerivedKeys({});
    setRevealedDerivedKeys({});
    setFetchingDerivedKey(null);
    setDerivedKeyError(null);

    if (requiresAuthentication) {
      setSecrets({});
      sensitiveDataLoadedRef.current = false;
    }
  }, [requiresAuthentication]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active') {
        if (requiresAuthentication) {
          reauthenticateOnActiveRef.current = true;
          hideSensitiveValues();
          setAuthenticationVisible(false);
        } else if (sensitiveDataLoadedRef.current) {
          hideSensitiveValues();
        }
      } else if (
        reauthenticateOnActiveRef.current &&
        !captureBlockedRef.current &&
        accountIsAllowed
      ) {
        reauthenticateOnActiveRef.current = false;
        setAuthenticationVisible(true);
      }
    });

    return () => subscription.remove();
  }, [accountIsAllowed, hideSensitiveValues, requiresAuthentication]);

  useEffect(() => {
    const unsubscribeBlur = navigation.addListener('blur', () => {
      hideSensitiveValues();
      setAuthenticationVisible(false);
    });

    return unsubscribeBlur;
  }, [hideSensitiveValues, navigation]);

  useEffect(() => {
    if (!requiresAuthentication || Object.keys(secrets).length === 0) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      hideSensitiveValues();
      if (requiresAuthentication && !captureBlockedRef.current) {
        setAuthenticationError(
          'For your security, authenticate again to continue.',
        );
        setAuthenticationVisible(true);
      }
    }, REVEAL_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [hideSensitiveValues, requiresAuthentication, secrets]);

  const handleCaptureChange = useCallback(
    captured => {
      captureBlockedRef.current = captured;
      setCaptureBlocked(captured);

      if (captured) {
        reauthenticateOnActiveRef.current = requiresAuthentication;
        hideSensitiveValues();
        setAuthenticationVisible(false);
      } else if (requiresAuthentication && accountIsAllowed) {
        reauthenticateOnActiveRef.current = false;
        setAuthenticationVisible(true);
      }
    },
    [accountIsAllowed, hideSensitiveValues, requiresAuthentication],
  );

  const handleAuthentication = async result => {
    if (!mountedRef.current) return;

    if (result.attemptToken !== sensitiveSessionRef.current) return;

    if (!result.valid) {
      setAuthenticationError(getAuthenticationError(result.error));
      return;
    }

    if (captureBlockedRef.current || AppState.currentState !== 'active') {
      setAuthenticationVisible(false);
      return;
    }

    sensitiveSessionRef.current += 1;
    setSecrets(normalizeSecrets(result.seeds));
    setAuthenticationError(null);
    setAuthenticationVisible(false);
  };

  const back = () => navigation.goBack();

  const signedOutStatusBar = showSignedOutHeader ? (
    <StatusBar
      backgroundColor={theme.colors.background}
      barStyle={theme.isDark ? 'light-content' : 'dark-content'}
    />
  ) : null;
  const signedOutSafeAreaEdges = showSignedOutHeader
    ? ['top', 'left', 'right']
    : undefined;
  const signedOutBackButton = showSignedOutHeader ? (
    <OnboardingBackButton
      onPress={back}
      style={styles.signedOutBackButton}
    />
  ) : null;

  const resetToScreen = () => {
    const destination = data.fromDeleteAccount ? 'DeleteProfile' : 'Home';
    const resetAction = CommonActions.reset({
      index: 0,
      routes: [{name: destination}],
    });

    if (navigation.closeDrawer) navigation.closeDrawer();
    navigation.dispatch(resetAction);
  };

  const toggleSecret = key => {
    setRevealedSecrets(current => ({...current, [key]: !current[key]}));
  };

  const derivedKeyOptions = useMemo(() => {
    const options = [];

    if (secrets[ELECTRUM]) {
      options.push(
        {coin: coinsList.VRSC, id: 'vrsc', label: 'VRSC private key'},
        {coin: coinsList.BTC, id: 'btc', label: 'BTC private key'},
        {coin: coinsList.ETH, id: 'eth', label: 'Ethereum private key'},
      );
    }

    if (
      secrets[DLIGHT_PRIVATE] &&
      !isDlightSpendingKey(secrets[DLIGHT_PRIVATE])
    ) {
      options.push({id: 'z-address', label: 'Z-address spending key'});
    }

    return options;
  }, [secrets]);

  const derivePrivateKey = async option => {
    if (option.id === 'z-address') {
      return dlightSeedToBytes(secrets[DLIGHT_PRIVATE]);
    }

    const channel = option.id === 'eth' ? ETH : ELECTRUM;
    return (
      await deriveKeyPair(
        secrets[ELECTRUM],
        option.coin,
        channel,
        data.keyDerivationVersion,
      )
    ).privKey;
  };

  const toggleDerivedKey = async option => {
    if (derivedKeys[option.id]) {
      setRevealedDerivedKeys(current => ({
        ...current,
        [option.id]: !current[option.id],
      }));
      return;
    }

    const session = sensitiveSessionRef.current;

    try {
      setDerivedKeyError(null);
      setFetchingDerivedKey(option.id);
      const value = await derivePrivateKey(option);

      if (
        !mountedRef.current ||
        session !== sensitiveSessionRef.current ||
        !sensitiveDataLoadedRef.current
      ) {
        return;
      }

      setDerivedKeys(current => ({...current, [option.id]: value}));
      setRevealedDerivedKeys(current => ({...current, [option.id]: true}));
    } catch {
      if (mountedRef.current && session === sensitiveSessionRef.current) {
        setDerivedKeyError({
          id: option.id,
          message: `Could not derive the ${option.label.toLowerCase()}. Try again.`,
        });
      }
    } finally {
      if (mountedRef.current) setFetchingDerivedKey(null);
    }
  };

  let footer = null;
  if (data.completeOnBack) {
    footer = <SettingsActionFooter primaryLabel="Done" primaryOnPress={back} />;
  } else if (data.fromDeleteAccount) {
    footer = (
      <SettingsActionFooter
        primaryLabel="Continue"
        primaryOnPress={resetToScreen}
        secondaryLabel="Back"
        secondaryOnPress={back}
      />
    );
  }

  if (!accountIsAllowed) {
    return (
      <>
        {signedOutStatusBar}
        <SettingsScreen
          safeAreaEdges={signedOutSafeAreaEdges}
          footer={
            <SettingsActionFooter primaryLabel="Done" primaryOnPress={back} />
          }>
          {signedOutBackButton}
          <SettingsTitle>Recovery secrets</SettingsTitle>
          <SettingsNotice
            danger
            body="This wallet is not available on the selected network. Return and choose another wallet."
            icon="shield-alert-outline"
            title="Wallet unavailable"
          />
        </SettingsScreen>
      </>
    );
  }

  const secretEntries = Object.entries(secrets);

  return (
    <>
      <RecoverySecretsPrivacyGuard onCaptureChange={handleCaptureChange} />
      {signedOutStatusBar}
      <SettingsScreen
        footer={footer}
        safeAreaEdges={signedOutSafeAreaEdges}
        testID="settings.displaySeed">
        {signedOutBackButton}
        <SettingsTitle subtitle={networkLabel}>Recovery secrets</SettingsTitle>
        {captureBlocked ? (
          <SettingsNotice
            danger
            body="Stop screen recording, sharing, or mirroring before viewing recovery information."
            icon="monitor-off"
            title="Screen sharing detected"
          />
        ) : (
          <>
            {account ? (
              <SettingsProfileSummary
                name={account.id}
                subtitle={`${networkLabel} wallet`}
                walletAvatar={account.walletAvatar}
              />
            ) : null}
            <SettingsNotice
              danger
              body="Anyone who sees these values can control the associated funds. Keep this screen private and store backups offline."
              icon="eye-off-outline"
              title="Private recovery information"
            />
            {secretEntries.length > 0 ? (
              <SettingsSection title="Recovery secrets">
                {secretEntries.map(([key, value]) => (
                  <SecretCard
                    key={key}
                    name={SECRET_NAMES[key]}
                    onToggle={() => toggleSecret(key)}
                    revealed={revealedSecrets[key] === true}
                    styles={styles}
                    theme={theme}
                    value={value}
                  />
                ))}
              </SettingsSection>
            ) : requiresAuthentication ? (
              <SettingsNotice
                body="Authenticate to load this wallet's recovery information."
                icon="lock-outline"
                title="Secrets are locked"
              />
            ) : (
              <SettingsNotice
                body="This wallet does not contain stored recovery secrets."
                icon="information-outline"
                title="No recovery secrets"
              />
            )}
            {data.showDerivedKeys && derivedKeyOptions.length > 0 ? (
              <SettingsSection title="Advanced private keys">
                <Text style={styles.advancedDescription}>
                  Derived private keys are usually not needed for wallet
                  recovery.
                </Text>
                {derivedKeyOptions.map(option => (
                  <DerivedKeyRow
                    key={option.id}
                    error={
                      derivedKeyError?.id === option.id &&
                      fetchingDerivedKey == null
                        ? derivedKeyError.message
                        : null
                    }
                    fetching={fetchingDerivedKey === option.id}
                    name={option.label}
                    onToggle={() => toggleDerivedKey(option)}
                    revealed={revealedDerivedKeys[option.id] === true}
                    styles={styles}
                    theme={theme}
                    value={derivedKeys[option.id]}
                  />
                ))}
              </SettingsSection>
            ) : null}
          </>
        )}
      </SettingsScreen>
      {requiresAuthentication && account ? (
        <PasswordCheck
          account={account}
          allowBiometry
          body="Confirm access to this wallet. Recovery secrets stay concealed until you reveal them."
          cancel={back}
          createAttemptToken={() => sensitiveSessionRef.current}
          errorMessage={authenticationError}
          networkLabel={`${networkLabel} wallet`}
          onInputChange={() => setAuthenticationError(null)}
          preferBiometry
          redesigned
          returnSecrets
          submit={handleAuthentication}
          submitLabel="Unlock"
          suppressSystemAlerts
          title="View recovery secrets"
          userName={account.id}
          visible={authenticationVisible}
        />
      ) : null}
    </>
  );
};

const SecretCard = ({name, onToggle, revealed, styles, theme, value}) => {
  const words = revealed && validateMnemonic(value) ? value.split(/\s+/) : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{name}</Text>
        <View style={styles.cardHeaderActions}>
          <Text style={styles.sensitiveLabel}>
            {revealed ? 'Visible' : 'Concealed'}
          </Text>
          {revealed ? (
            <CopyAction
              accessibilityLabel={`Copy ${name} recovery secret`}
              color={theme.colors.primary}
              copiedAccessibilityLabel={`${name} recovery secret copied`}
              iconSize={18}
              value={value}
            />
          ) : null}
        </View>
      </View>
      {revealed ? (
        words ? (
          <View style={styles.wordGrid}>
            {words.map((word, index) => (
              <View key={`${index}-${word}`} style={styles.wordCell}>
                <Text style={styles.wordNumber}>{index + 1}</Text>
                <Text style={styles.word}>{word}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.secret}>{value}</Text>
        )
      ) : (
        <View
          accessibilityLabel={`${name} concealed`}
          style={styles.concealedValue}>
          <View style={[styles.concealedLine, styles.concealedLineLong]} />
          <View style={[styles.concealedLine, styles.concealedLineShort]} />
        </View>
      )}
      <AppButton
        height={44}
        onPress={onToggle}
        textColor={revealed ? theme.colors.textSecondary : undefined}
        variant="secondary">
        {revealed ? 'Hide' : 'Reveal'}
      </AppButton>
    </View>
  );
};

const DerivedKeyRow = ({
  error,
  fetching,
  name,
  onToggle,
  revealed,
  styles,
  theme,
  value,
}) => (
  <View style={styles.derivedRow}>
    <View style={styles.derivedHeader}>
      <Text style={styles.derivedTitle}>{name}</Text>
      {revealed && value ? (
        <CopyAction
          accessibilityLabel={`Copy ${name}`}
          color={theme.colors.primary}
          copiedAccessibilityLabel={`${name} copied`}
          iconSize={18}
          value={value}
        />
      ) : null}
      <AppButton
        disabled={fetching}
        height={40}
        onPress={onToggle}
        style={styles.derivedAction}
        variant="secondary">
        {fetching ? (
          <ActivityIndicator size="small" />
        ) : revealed ? (
          'Hide'
        ) : (
          'Reveal'
        )}
      </AppButton>
    </View>
    {revealed && value ? (
      <Text style={styles.derivedValue}>{value}</Text>
    ) : null}
    {error ? (
      <Text accessibilityLiveRegion="polite" style={styles.error}>
        {error}
      </Text>
    ) : null}
  </View>
);

const createStyles = theme =>
  StyleSheet.create({
    signedOutBackButton: {
      marginLeft: -12,
      marginBottom: 4,
    },
    card: {
      marginBottom: 12,
      padding: 16,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.rounded.md,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    cardHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    cardTitle: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      lineHeight: 20,
      ...fontStyle('semiBold'),
    },
    sensitiveLabel: {
      color: theme.colors.warning,
      fontSize: 11,
      lineHeight: 15,
      ...fontStyle('semiBold'),
    },
    concealedValue: {
      minHeight: 58,
      justifyContent: 'center',
      marginBottom: 12,
    },
    concealedLine: {
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.borderStrong,
    },
    concealedLineLong: {
      width: '92%',
    },
    concealedLineShort: {
      width: '68%',
      marginTop: 10,
    },
    secret: {
      marginBottom: 14,
      color: theme.colors.textPrimary,
      fontSize: 14,
      lineHeight: 22,
      ...fontStyle('regular'),
    },
    wordGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 14,
    },
    wordCell: {
      width: '31%',
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 9,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.rounded.sm,
    },
    wordNumber: {
      width: 20,
      color: theme.colors.textSubtle,
      fontSize: 11,
      ...fontStyle('regular'),
    },
    word: {
      minWidth: 0,
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: 13,
      ...fontStyle('semiBold'),
    },
    advancedDescription: {
      marginBottom: 8,
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      ...fontStyle('regular'),
    },
    derivedRow: {
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    derivedHeader: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    derivedTitle: {
      minWidth: 0,
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: 14,
      lineHeight: 19,
      ...fontStyle('semiBold'),
    },
    derivedAction: {
      minWidth: 92,
    },
    derivedValue: {
      marginTop: 8,
      color: theme.colors.textPrimary,
      fontSize: 13,
      lineHeight: 20,
      ...fontStyle('regular'),
    },
    error: {
      marginTop: 8,
      color: theme.colors.danger,
      fontSize: 12,
      lineHeight: 18,
      ...fontStyle('regular'),
    },
  });

export default DisplaySeed;
