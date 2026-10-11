import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Keyboard,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {Button, Text, TextInput} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {createAlert} from '../../../../../actions/actions/alert/dispatchers/alert';
import NfcTapView from '../../../../../components/NfcTap/NfcTapView';
import {useOnboardingTheme} from '../../../../../theme/onboarding';
import {
  isValid24WordBip39Mnemonic,
  walletBackupOrdinalToMnemonic,
  walletBackupRequiresPassword,
} from '../../../../../utils/walletBackup/walletBackup';
import {
  beginWalletBackupNfcSession,
  cancelWalletBackupNfcRequest,
  endWalletBackupNfcSession,
  readWalletBackupFromNfc,
} from '../../../../../utils/walletBackup/walletBackupNfc';
import {
  getNfcTapFailure,
  getNfcTapText,
  NFC_TAP_PHASE,
  NFC_TAP_TASK,
} from '../../../../../utils/walletBackup/nfcTapText';
import {
  activateKeepAwake,
  deactivateKeepAwake,
} from '../../../../../utils/keepAwake/keepAwake';

const fieldWidth = 300;
// How long the check stays on screen before the next step.
const DONE_HOLD_MS = 900;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

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
  // The NFC tap step while the card is read, or the failed read.
  const [nfcTap, setNfcTap] = useState(null);
  const [walletBackupOrdinal, setWalletBackupOrdinal] = useState(null);
  const [backupPassword, setBackupPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const autoStartHandled = useRef(false);
  const importInProgressRef = useRef(false);

  const waitForSpinnerFrame = () => {
    return new Promise(resolve => setTimeout(resolve, 0));
  };

  const finishImport = async mnemonic => {
    setImportedSeed(mnemonic);
    await onComplete(mnemonic, {
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

    let keepAwakeActive = false;

    try {
      activateKeepAwake();
      keepAwakeActive = true;

      await waitForSpinnerFrame();

      const mnemonic = walletBackupOrdinalToMnemonic({
        walletBackupOrdinal: backupOrdinal,
        password,
      });

      await finishImport(mnemonic);
    } catch (e) {
      createAlert('Error', e.message || 'Unable to import NFC wallet backup.');
    } finally {
      if (keepAwakeActive) {
        deactivateKeepAwake();
      }

      if (showDecrypting) {
        setDecrypting(false);
      }
    }
  };

  const scanCard = async () => {
    if (importInProgressRef.current) return;
    importInProgressRef.current = true;

    let nfcSessionPreRegistered = false;
    let nfcReaderStarted = false;
    let failedStep = null;
    let doneAt = null;

    try {
      Keyboard.dismiss();
      setNfcTap(getNfcTapText(NFC_TAP_TASK.RESTORE, NFC_TAP_PHASE.WAITING));
      nfcSessionPreRegistered = await beginWalletBackupNfcSession();

      nfcReaderStarted = true;
      const scannedBackupOrdinal = await readWalletBackupFromNfc({
        onPhase: phase => {
          if (phase === NFC_TAP_PHASE.DONE) doneAt = Date.now();
          setNfcTap(getNfcTapText(NFC_TAP_TASK.RESTORE, phase));
        },
        sessionPreRegistered: nfcSessionPreRegistered,
      });

      const shownFor = doneAt == null ? 0 : Date.now() - doneAt;
      if (shownFor < DONE_HOLD_MS) await delay(DONE_HOLD_MS - shownFor);

      if (walletBackupRequiresPassword(scannedBackupOrdinal)) {
        setWalletBackupOrdinal(scannedBackupOrdinal);
        setBackupPassword('');
        return;
      }

      await importWalletBackup(scannedBackupOrdinal, null);
    } catch (e) {
      // A cancelled session goes back to the start without a message.
      failedStep = getNfcTapFailure(NFC_TAP_TASK.RESTORE, e);
      // Known card results are normal steps. Log only unexpected errors.
      if (failedStep != null && e?.code == null) console.error(e);
    } finally {
      try {
        if (nfcSessionPreRegistered && !nfcReaderStarted) {
          await endWalletBackupNfcSession();
        }
      } finally {
        setNfcTap(failedStep);
        importInProgressRef.current = false;
      }
    }
  };

  useEffect(() => {
    if (!autoStart || autoStartHandled.current) return;

    autoStartHandled.current = true;
    scanCard();
  }, [autoStart]);

  const importEncryptedBackup = async () => {
    if (importInProgressRef.current) return;
    importInProgressRef.current = true;

    try {
      Keyboard.dismiss();
      await importWalletBackup(walletBackupOrdinal, backupPassword, true);
    } finally {
      importInProgressRef.current = false;
    }
  };

  if (nfcTap != null) {
    const ended =
      nfcTap.phase === NFC_TAP_PHASE.FAILED ||
      nfcTap.phase === NFC_TAP_PHASE.NOTICE;
    // iOS has its own Cancel in the scan sheet.
    const canCancel =
      nfcTap.phase === NFC_TAP_PHASE.WAITING && Platform.OS === 'android';

    return (
      <NfcTapView
        {...nfcTap}
        actions={
          ended
            ? [
                {label: 'Try again', onPress: scanCard, variant: 'primary'},
                {cancel: true, label: 'Cancel', onPress: () => setNfcTap(null)},
              ]
            : canCancel
            ? [
                {
                  cancel: true,
                  label: 'Cancel',
                  onPress: cancelWalletBackupNfcRequest,
                },
              ]
            : []
        }
        testID="importNfc.nfcTap"
      />
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
    centerContentCompact: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
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
