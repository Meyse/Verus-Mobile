import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ActivityIndicator, Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {ethers} from 'ethers';
import AppButton from '../../../components/AppButton';
import AppTextInput from '../../../components/AppTextInput';
import AppAddressInput from '../../../components/AppAddressInput';
import BarcodeReader from '../../../components/BarcodeReader/BarcodeReader';
import OnboardingBackButton from '../../../components/OnboardingBackButton';
import BottomSheetModal from '../../../components/BottomSheetModal';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import useSheetEditSession from '../../../hooks/useSheetEditSession';
import {fontStyle} from '../../../globals/fonts';
import {createSignedOutSheetStyles} from '../../../styles';
import {useOnboardingTheme} from '../../../theme/onboarding';
import QrScanner from '../../../utils/QrScanner/QrScanner';

const DEFAULT_SHEET_MAX_HEIGHT = '80%';
const KEYBOARD_SHEET_BOTTOM_SPACING = 8;
const KEYBOARD_SHEET_TOP_SPACING = 12;
const EMPTY_KEYBOARD_METRICS = {height: 0, visible: false};
const SAVE_FAILED_TEXT = 'Not saved. Try again.';

const detectAddressType = address => {
  const value = address.trim();
  if (value.endsWith('@')) return 'VerusID';
  if (value.startsWith('0x')) return 'Ethereum address';
  if (value.startsWith('i')) return 'Verus i-address';
  if (value.startsWith('R')) return 'Verus R-address';
  if (/^(bc1|[13])/.test(value)) return 'Bitcoin address';
  return value.length >= 20 ? 'Cryptocurrency address' : null;
};

const validateAddress = address => {
  const value = address.trim();
  if (!value) return {valid: false, error: null};
  if (value.endsWith('@')) {
    return value.length > 1
      ? {valid: true, error: null}
      : {valid: false, error: 'VerusID name is required before @'};
  }
  if (value.startsWith('0x')) {
    if (ethers.isAddress(value)) return {valid: true, error: null};
    return value.length < 42
      ? {valid: false, error: null}
      : {valid: false, error: 'Invalid Ethereum address'};
  }
  if (/^[a-zA-Z0-9:]+$/.test(value) && value.length >= 20) {
    return {valid: true, error: null};
  }
  return value.length < 25
    ? {valid: false, error: null}
    : {valid: false, error: 'Address format not recognized'};
};

// The text state lives in the body, which BottomSheetModal renders inside its
// Portal. A text state held outside the Portal re-renders the input with the
// old value first, and Android then moves a mid-text cursor.
//
// BottomSheetModal unmounts the body while an app alert is open. The shell
// keeps a draft of the edit, so the body comes back with the same text. The
// draft starts again only when a new edit session opens.
const AddressBookEditSheetBody = ({
  close,
  draftRef,
  editing,
  keyboardVisible,
  onSave,
  preserveKeyboardLayout,
  resetKeyboardMetrics,
  saving,
  scannerOpen,
  sessionKey,
  setSaving,
  setScannerOpen,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {height: windowHeight} = useWindowDimensions();
  const sheetStyles = useMemo(() => createSignedOutSheetStyles(theme), [theme]);
  const addressInput = useRef(null);
  const [draft, setDraftState] = useState(() => draftRef.current);
  const {address, label, saveFailed, scanError} = draft;
  const editMode = Boolean(editing?.id);

  useEffect(() => {
    setDraftState(draftRef.current);
  }, [draftRef, sessionKey]);

  const updateDraft = useCallback(
    changes => {
      draftRef.current = {...draftRef.current, ...changes};
      setDraftState(draftRef.current);
    },
    [draftRef],
  );
  const setSaveFailed = useCallback(
    value => updateDraft({saveFailed: value}),
    [updateDraft],
  );
  const setScanError = useCallback(
    value => updateDraft({scanError: value}),
    [updateDraft],
  );

  const validation = useMemo(() => validateAddress(address), [address]);
  const detectedType = useMemo(() => detectAddressType(address), [address]);
  const valid = validation.valid && label.trim().length > 0;
  const actionLabel = editMode ? 'Update' : 'Save';
  const sheetTitle = editMode ? 'Edit address' : 'Add address';
  const technicalAddress = detectedType && detectedType !== 'VerusID';

  const changeLabel = useCallback(
    value => updateDraft({label: value, saveFailed: false}),
    [updateDraft],
  );

  const changeAddress = useCallback(
    value => updateDraft({address: value, saveFailed: false, scanError: null}),
    [updateDraft],
  );

  const scanAddress = codes => {
    setScannerOpen(false);
    const raw = codes?.[0]?.value;
    try {
      if (typeof raw !== 'string' || raw.length > 5000) throw new Error();
      const request = QrScanner.processGenericPaymentRequest(raw);
      if (!request.address) throw new Error();
      changeAddress(String(request.address).trim());
    } catch {
      setScanError('This QR code does not contain a supported address.');
    }
  };

  const save = useCallback(async () => {
    if (!valid || saving) return;
    preserveKeyboardLayout.current = true;
    Keyboard.dismiss();
    setSaveFailed(false);
    setSaving(true);
    try {
      await onSave({
        ...editing,
        address: address.trim(),
        label: label.trim(),
      });
    } catch {
      preserveKeyboardLayout.current = false;
      resetKeyboardMetrics();
      setSaving(false);
      setSaveFailed(true);
      AccessibilityInfo.announceForAccessibility(SAVE_FAILED_TEXT);
    }
  }, [
    address,
    editing,
    label,
    onSave,
    preserveKeyboardLayout,
    resetKeyboardMetrics,
    saving,
    setSaveFailed,
    setSaving,
    valid,
  ]);

  return (
    <View style={styles.sheetLayout}>
      {scannerOpen ? (
        <>
          <View style={styles.scannerHeader}>
            <OnboardingBackButton onPress={() => setScannerOpen(false)} />
            <Text style={[theme.typography.titleSheet, {color: theme.colors.textPrimary}]}>Scan address</Text>
          </View>
          <BarcodeReader
            includeBottomInset={false}
            noCameraAction={{label: 'Enter address', onPress: () => setScannerOpen(false)}}
            noCameraHint="Paste or type the address instead."
            onScan={scanAddress}
            style={{height: Math.min(430, windowHeight * 0.6), flex: 0}}
          />
        </>
      ) : (
        <>
          <Text
            accessibilityRole="header"
            style={[sheetStyles.title, styles.title]}>
            {sheetTitle}
          </Text>

          <View style={styles.scrollFrame}>
            <ScrollView
              bounces={false}
              contentContainerStyle={styles.formContent}
              keyboardDismissMode={
                Platform.OS === 'ios' ? 'interactive' : 'on-drag'
              }
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={keyboardVisible}>
              <AppTextInput
                autoCapitalize="words"
                editable={!saving}
                label="Label"
                onChangeText={changeLabel}
                onSubmitEditing={() => {
                  if (editMode) {
                    Keyboard.dismiss();
                  } else {
                    addressInput.current?.focus();
                  }
                }}
                placeholder="Wallet or contact name"
                returnKeyType={editMode ? 'done' : 'next'}
                themeMode={theme.mode}
                value={label}
              />

              <View style={styles.addressSection}>
                <AppAddressInput
                  ref={addressInput}
                  abbreviate={validation.valid}
                  editable={!saving && !editMode}
                  errorText={validation.error || scanError}
                  label="Address"
                  onChangeText={changeAddress}
                  onScan={() => {
                    Keyboard.dismiss();
                    setScannerOpen(true);
                  }}
                  onSubmitEditing={Keyboard.dismiss}
                  placeholder="Address or VerusID"
                  returnKeyType="done"
                  technical={technicalAddress}
                  testID="addressBook.address.input"
                  themeMode={theme.mode}
                  value={address}
                />

                {detectedType && !validation.error ? (
                  <View style={styles.validationRow}>
                    <View style={styles.typeIndicator}>
                      <MaterialCommunityIcons
                        color={theme.colors.success}
                        name="check-circle"
                        size={14}
                      />
                      <Text style={styles.typeIndicatorText}>{detectedType}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </ScrollView>
          </View>

          {saveFailed ? (
            <Text style={styles.saveError}>{SAVE_FAILED_TEXT}</Text>
          ) : null}

          <SafeBottomActionStack
            bottomSpacing={
              keyboardVisible ? KEYBOARD_SHEET_BOTTOM_SPACING : 12
            }
            gap={10}
            horizontalSpacing={20}
            includeBottomInset={false}
            safeAreaSpacing={0}
            style={styles.buttonStack}>
            <AppButton
              accessibilityLabel={`${actionLabel} address`}
              disabled={!valid || saving}
              height={56}
              onPress={save}
              themeMode={theme.mode}>
              {saving ? (
                <ActivityIndicator color={theme.colors.onPrimary} size={18} />
              ) : (
                actionLabel
              )}
            </AppButton>
            <AppButton
              accessibilityLabel="Cancel"
              disabled={saving}
              height={56}
              onPress={close}
              themeMode={theme.mode}
              variant="secondary">
              Cancel
            </AppButton>
          </SafeBottomActionStack>
        </>
      )}
    </View>
  );
};

const AddressBookEditSheet = ({
  editing,
  initialAddress = '',
  initialLabel = '',
  onClose,
  onClosed,
  onSave,
  visible,
}) => {
  const insets = useSafeAreaInsets();
  const {height: windowHeight} = useWindowDimensions();
  const preserveKeyboardLayout = useRef(false);
  const {draftRef, sessionKey} = useSheetEditSession(
    visible,
    [editing, initialAddress, initialLabel],
    () => ({
      address: editing?.address || initialAddress,
      label: editing?.label || initialLabel,
      saveFailed: false,
      scanError: null,
    }),
  );
  const [scannerOpen, setScannerOpen] = useState(false);
  const [keyboardMetrics, setKeyboardMetrics] = useState(
    EMPTY_KEYBOARD_METRICS,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    preserveKeyboardLayout.current = false;
    setScannerOpen(false);
    setKeyboardMetrics(EMPTY_KEYBOARD_METRICS);
    setSaving(false);
  }, [editing, initialAddress, initialLabel, visible]);

  useEffect(() => {
    if (!visible) return undefined;

    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, event => {
      if (preserveKeyboardLayout.current) return;
      setKeyboardMetrics({
        height: event?.endCoordinates?.height || 0,
        visible: true,
      });
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      if (preserveKeyboardLayout.current) return;
      setKeyboardMetrics(EMPTY_KEYBOARD_METRICS);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [visible]);

  const keyboardSheetHeight = Math.max(
    1,
    windowHeight -
      keyboardMetrics.height -
      insets.top -
      KEYBOARD_SHEET_TOP_SPACING -
      KEYBOARD_SHEET_BOTTOM_SPACING,
  );

  const resetKeyboardMetrics = useCallback(
    () => setKeyboardMetrics(EMPTY_KEYBOARD_METRICS),
    [],
  );

  const close = useCallback(() => {
    if (scannerOpen) {
      setScannerOpen(false);
      return;
    }
    preserveKeyboardLayout.current = true;
    Keyboard.dismiss();
    onClose();
  }, [onClose, scannerOpen]);

  const handleClosed = useCallback(() => {
    preserveKeyboardLayout.current = false;
    setScannerOpen(false);
    setKeyboardMetrics(EMPTY_KEYBOARD_METRICS);
    setSaving(false);
    if (typeof onClosed === 'function') {
      onClosed();
    }
  }, [onClosed]);

  return (
    <BottomSheetModal
      avoidKeyboard
      closeDisabled={saving}
      contentContainerStyle={
        keyboardMetrics.visible
          ? {
              marginBottom: KEYBOARD_SHEET_BOTTOM_SPACING,
            }
          : null
      }
      maxHeight={
        keyboardMetrics.visible ? keyboardSheetHeight : DEFAULT_SHEET_MAX_HEIGHT
      }
      onClose={close}
      onClosed={handleClosed}
      visible={visible}>
      <AddressBookEditSheetBody
        close={close}
        draftRef={draftRef}
        editing={editing}
        keyboardVisible={keyboardMetrics.visible}
        onSave={onSave}
        preserveKeyboardLayout={preserveKeyboardLayout}
        resetKeyboardMetrics={resetKeyboardMetrics}
        saving={saving}
        scannerOpen={scannerOpen}
        sessionKey={sessionKey}
        setSaving={setSaving}
        setScannerOpen={setScannerOpen}
      />
    </BottomSheetModal>
  );
};

const createStyles = theme =>
  StyleSheet.create({
    sheetLayout: {
      flexGrow: 0,
      flexShrink: 1,
      paddingTop: 8,
    },
    title: {
      marginHorizontal: 20,
      marginBottom: 20,
    },
    scrollFrame: {
      flexGrow: 0,
      flexShrink: 1,
      minHeight: 0,
      overflow: 'hidden',
    },
    formContent: {
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    addressSection: {
      marginTop: 20,
    },
    scannerHeader: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, marginBottom: 12},
    validationRow: {marginTop: 10},
    typeIndicator: {flexDirection: 'row', alignItems: 'center', gap: 6},
    typeIndicatorText: {
      color: theme.colors.successText,
      fontSize: 13,
      ...fontStyle('medium'),
    },
    buttonStack: {
      paddingTop: 12,
    },
    saveError: {
      ...theme.typography.caption,
      marginHorizontal: 20,
      color: theme.colors.danger,
    },
  });

export default AddressBookEditSheet;
