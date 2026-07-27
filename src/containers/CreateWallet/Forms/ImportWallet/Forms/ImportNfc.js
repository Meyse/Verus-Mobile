import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Keyboard,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {ActivityIndicator, Button, Text, TextInput} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {createAlert} from '../../../../../actions/actions/alert/dispatchers/alert';
import {useOnboardingTheme} from '../../../../../theme/onboarding';
import {
  isValid24WordBip39Mnemonic,
  walletBackupOrdinalToMnemonic,
  walletBackupRequiresPassword,
} from '../../../../../utils/walletBackup/walletBackup';
import {
  beginWalletBackupNfcSession,
  endWalletBackupNfcSession,
  readWalletBackupFromNfc,
} from '../../../../../utils/walletBackup/walletBackupNfc';
import {
  activateKeepAwake,
  deactivateKeepAwake,
} from '../../../../../utils/keepAwake/keepAwake';

const fieldWidth = 300;

export default function ImportNfc({
  autoStart = false,
  setImportedSeed,
  onComplete,
}) {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const paperInputTheme = useMemo(
    () => ({
      colors: {
        primary: theme.colors.primary,
        text: theme.colors.textPrimary,
        placeholder: theme.colors.textSubtle,
        background: theme.colors.input,
        surface: theme.colors.input,
        error: theme.colors.danger,
      },
    }),
    [theme],
  );
  const [loading, setLoading] = useState(false);
  const [nfcStatus, setNfcStatus] = useState(null);
  const [walletBackupOrdinal, setWalletBackupOrdinal] = useState(null);
  const [backupPassword, setBackupPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const autoStartHandled = useRef(false);

  const waitForSpinnerFrame = () => {
    return new Promise(resolve => setTimeout(resolve, 0));
  };

  const finishImport = mnemonic => {
    setImportedSeed(mnemonic);
    onComplete(mnemonic, {
      useSeedAsZ: isValid24WordBip39Mnemonic(mnemonic),
    });
  };

  const importWalletBackup = async (
    backupOrdinal,
    password,
    showDecrypting = false,
  ) => {
    if (showDecrypting) {
      setDecrypting(true);
      await waitForSpinnerFrame();
    }

    let didFinishImport = false;
    let keepAwakeActive = false;

    try {
      activateKeepAwake();
      keepAwakeActive = true;

      await waitForSpinnerFrame();

      const mnemonic = walletBackupOrdinalToMnemonic({
        walletBackupOrdinal: backupOrdinal,
        password,
      });

      if (showDecrypting) {
        setDecrypting(false);
      }

      didFinishImport = true;
      finishImport(mnemonic);
    } catch (e) {
      createAlert('Error', e.message || 'Unable to import NFC wallet backup.');
    } finally {
      if (keepAwakeActive) {
        deactivateKeepAwake();
      }

      if (showDecrypting && !didFinishImport) {
        setDecrypting(false);
      }
    }
  };

  const scanCard = async () => {
    Keyboard.dismiss();
    setLoading(true);
    setNfcStatus('Preparing NFC scanner. Do not tap the card yet.');

    let nfcSessionPreRegistered = false;
    let nfcReaderStarted = false;
    let scannedBackupOrdinal = null;

    try {
      nfcSessionPreRegistered = await beginWalletBackupNfcSession({
        onStatus: setNfcStatus,
      });

      nfcReaderStarted = true;
      scannedBackupOrdinal = await readWalletBackupFromNfc({
        onStatus: setNfcStatus,
        sessionPreRegistered: nfcSessionPreRegistered,
      });
    } catch (e) {
      console.error(e);
      createAlert(
        'NFC Import Failed',
        e.message || 'Unable to read wallet backup from NFC card.',
      );
    } finally {
      if (nfcSessionPreRegistered && !nfcReaderStarted) {
        await endWalletBackupNfcSession();
      }

      setNfcStatus(null);
      setLoading(false);
    }

    if (scannedBackupOrdinal == null) return;

    if (walletBackupRequiresPassword(scannedBackupOrdinal)) {
      setWalletBackupOrdinal(scannedBackupOrdinal);
      setBackupPassword('');
      return;
    }

    await importWalletBackup(scannedBackupOrdinal, null);
  };

  useEffect(() => {
    if (!autoStart || autoStartHandled.current) return;

    autoStartHandled.current = true;
    scanCard();
  }, [autoStart]);

  const importEncryptedBackup = async () => {
    Keyboard.dismiss();
    await importWalletBackup(walletBackupOrdinal, backupPassword, true);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <MaterialCommunityIcons
            name="credit-card-wireless"
            size={64}
            color={theme.colors.primary}
            style={{marginBottom: 24}}
          />
          <ActivityIndicator
            animating
            color={theme.colors.primary}
            size="large"
            style={{marginVertical: 8}}
          />
          {nfcStatus && (
            <Text style={styles.loadingText}>
              {nfcStatus}
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <View style={styles.centerContentCompact}>
          <MaterialCommunityIcons
            name="credit-card-wireless"
            size={56}
            color={theme.colors.primary}
            style={{marginBottom: 16}}
          />
          <Text style={styles.title}>
            {'Import using NFC'}
          </Text>

          {walletBackupOrdinal != null ? (
            <View style={styles.field}>
              <Text style={styles.bodyText}>
                {'This NFC wallet backup is encrypted.'}
              </Text>
              <TextInput
                returnKeyType="done"
                label="Backup password"
                value={backupPassword}
                mode="outlined"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                disabled={decrypting}
                onChangeText={setBackupPassword}
                outlineColor={theme.colors.border}
                activeOutlineColor={theme.colors.primary}
                right={
                  <TextInput.Icon
                    color={theme.colors.textSubtle}
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                selectionColor={theme.colors.primary}
                style={styles.paperInput}
                theme={paperInputTheme}
              />
              <Button
                mode="contained"
                color={theme.colors.primary}
                onPress={importEncryptedBackup}
                loading={decrypting}
                disabled={decrypting || backupPassword.length === 0}
                labelStyle={styles.containedButtonLabel}
                style={styles.decryptButton}>
                {'Decrypt and Import'}
              </Button>
              {decrypting && (
                <Text style={styles.decryptingText}>
                  {'Decrypting your wallet backup. This can take a few minutes.'}
                </Text>
              )}
              <Button
                mode="text"
                color={theme.colors.primary}
                disabled={decrypting}
                onPress={() => {
                  setWalletBackupOrdinal(null);
                  setBackupPassword('');
                }}>
                {'Scan Different Card'}
              </Button>
            </View>
          ) : (
            <View style={styles.field}>
              <Text style={styles.bodyTextWithSpacing}>
                {
                  'Scan a Verus NFC wallet backup card to import its Secret Recovery Phrase.'
                }
              </Text>
              <Button
                mode="contained"
                color={theme.colors.primary}
                onPress={scanCard}
                icon="credit-card-wireless"
                labelStyle={styles.containedButtonLabel}
                contentStyle={{height: 48}}>
                {'Scan NFC Backup'}
              </Button>
            </View>
          )}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const createStyles = theme =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    centerContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    centerContentCompact: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    loadingText: {
      color: theme.colors.textSecondary,
      fontSize: 24,
      fontWeight: 'bold',
      lineHeight: 32,
      marginTop: 24,
      textAlign: 'center',
    },
    title: {
      ...theme.typography.headlineMd,
      color: theme.colors.primary,
      marginBottom: 24,
      textAlign: 'center',
    },
    field: {
      width: fieldWidth,
    },
    bodyText: {
      color: theme.colors.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 16,
      textAlign: 'center',
    },
    bodyTextWithSpacing: {
      color: theme.colors.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 24,
      textAlign: 'center',
    },
    paperInput: {
      marginBottom: 12,
      backgroundColor: theme.colors.input,
    },
    decryptButton: {
      marginBottom: 8,
    },
    containedButtonLabel: {
      color: theme.colors.onPrimary,
      fontWeight: 'bold',
    },
    decryptingText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 8,
      textAlign: 'center',
    },
  });
