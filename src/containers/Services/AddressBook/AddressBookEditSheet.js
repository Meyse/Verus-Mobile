import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Clipboard,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ActivityIndicator, Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {ethers} from 'ethers';
import AppButton from '../../../components/AppButton';
import AppTextInput from '../../../components/AppTextInput';
import BottomSheetModal from '../../../components/BottomSheetModal';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import {fontStyle} from '../../../globals/fonts';
import {createSignedOutSheetStyles} from '../../../styles';
import {useOnboardingTheme} from '../../../theme/onboarding';

const DEFAULT_SHEET_MAX_HEIGHT = '80%';
const KEYBOARD_SHEET_BOTTOM_SPACING = 8;
const KEYBOARD_SHEET_TOP_SPACING = 12;
const EMPTY_KEYBOARD_METRICS = {height: 0, visible: false};

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

const truncateAddress = address =>
  address.length > 20
    ? `${address.slice(0, 8)}...${address.slice(-8)}`
    : address;

const AddressBookEditSheet = ({
  editing,
  initialAddress = '',
  initialLabel = '',
  onClose,
  onClosed,
  onSave,
  visible,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const {height: windowHeight} = useWindowDimensions();
  const sheetStyles = useMemo(() => createSignedOutSheetStyles(theme), [theme]);
  const addressInput = useRef(null);
  const preserveKeyboardLayout = useRef(false);
  const [address, setAddress] = useState('');
  const [addressFocused, setAddressFocused] = useState(false);
  const [keyboardMetrics, setKeyboardMetrics] = useState(
    EMPTY_KEYBOARD_METRICS,
  );
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const editMode = Boolean(editing?.id);

  useEffect(() => {
    if (!visible) return;
    preserveKeyboardLayout.current = false;
    setAddress(editing?.address || initialAddress);
    setAddressFocused(false);
    setLabel(editing?.label || initialLabel);
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

  const validation = useMemo(() => validateAddress(address), [address]);
  const detectedType = useMemo(() => detectAddressType(address), [address]);
  const valid = validation.valid && label.trim().length > 0;
  const actionLabel = editMode ? 'Update' : 'Save';
  const sheetTitle = editMode ? 'Edit address' : 'Add address';
  const trimmedAddress = address.trim();
  const compactAddress =
    validation.valid && !addressFocused
      ? truncateAddress(trimmedAddress)
      : address;
  const technicalAddress = detectedType && detectedType !== 'VerusID';
  const keyboardSheetHeight = Math.max(
    1,
    windowHeight -
      keyboardMetrics.height -
      insets.top -
      KEYBOARD_SHEET_TOP_SPACING -
      KEYBOARD_SHEET_BOTTOM_SPACING,
  );

  const close = useCallback(() => {
    preserveKeyboardLayout.current = true;
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const paste = useCallback(async () => {
    const value = await Clipboard.getString();
    if (value) setAddress(value.trim());
  }, []);

  const save = useCallback(async () => {
    if (!valid || saving) return;
    preserveKeyboardLayout.current = true;
    Keyboard.dismiss();
    setSaving(true);
    try {
      await onSave({
        ...editing,
        address: address.trim(),
        label: label.trim(),
      });
    } catch {
      preserveKeyboardLayout.current = false;
      setKeyboardMetrics(EMPTY_KEYBOARD_METRICS);
      setSaving(false);
    }
  }, [address, editing, label, onSave, saving, valid]);

  const handleClosed = useCallback(() => {
    preserveKeyboardLayout.current = false;
    setAddressFocused(false);
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
      <View style={styles.sheetLayout}>
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
            showsVerticalScrollIndicator={keyboardMetrics.visible}>
            <AppTextInput
              autoCapitalize="words"
              editable={!saving}
              label="Label"
              onChangeText={setLabel}
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
              <AppTextInput
                ref={addressInput}
                accessibilityValue={{text: address}}
                editable={!saving && !editMode}
                errorText={validation.error}
                inputStyle={technicalAddress && styles.addressInput}
                label="Address"
                onBlur={() => setAddressFocused(false)}
                onChangeText={setAddress}
                onFocus={() => setAddressFocused(true)}
                onSubmitEditing={Keyboard.dismiss}
                placeholder="Enter an address or VerusID"
                returnKeyType="done"
                themeMode={theme.mode}
                value={compactAddress}
              />

              {!editMode ? (
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    accessibilityLabel="Paste address"
                    accessibilityRole="button"
                    activeOpacity={0.7}
                    disabled={saving}
                    onPress={paste}
                    style={styles.actionChip}>
                    <MaterialCommunityIcons
                      color={theme.colors.textSecondary}
                      name="content-paste"
                      size={16}
                    />
                    <Text style={styles.actionChipText}>Paste</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

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

        <SafeBottomActionStack
          bottomSpacing={
            keyboardMetrics.visible ? KEYBOARD_SHEET_BOTTOM_SPACING : 12
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
      </View>
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
    addressInput: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      letterSpacing: 0.2,
    },
    actionsRow: {flexDirection: 'row', marginTop: 10},
    actionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
    },
    actionChipText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      ...fontStyle('medium'),
    },
    validationRow: {marginTop: 10},
    typeIndicator: {flexDirection: 'row', alignItems: 'center', gap: 6},
    typeIndicatorText: {
      color: theme.colors.success,
      fontSize: 13,
      ...fontStyle('medium'),
    },
    buttonStack: {
      paddingTop: 12,
    },
  });

export default AddressBookEditSheet;
