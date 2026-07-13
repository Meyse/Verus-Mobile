import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Clipboard,
  Keyboard,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {ActivityIndicator, Portal, Text} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {ethers} from 'ethers';
import GradientButton from '../../../components/GradientButton';
import SemiModal from '../../../components/SemiModal';
import {fontStyle} from '../../../globals/fonts';
import {useOnboardingTheme} from '../../../theme/onboarding';

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
  onSave,
  visible,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const addressInput = useRef(null);
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('');
  const [addressFocused, setAddressFocused] = useState(false);
  const [labelFocused, setLabelFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const editMode = Boolean(editing?.id);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', event => {
      setKeyboardHeight(event.endCoordinates?.height || 0);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    setAddress(editing?.address || initialAddress);
    setLabel(editing?.label || initialLabel);
    setSaving(false);
    setKeyboardHeight(0);
  }, [editing, initialAddress, initialLabel, visible]);

  const validation = useMemo(() => validateAddress(address), [address]);
  const detectedType = useMemo(() => detectAddressType(address), [address]);
  const valid = validation.valid && label.trim().length > 0;

  const close = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const paste = useCallback(async () => {
    const value = await Clipboard.getString();
    if (value) setAddress(value.trim());
  }, []);

  const save = useCallback(async () => {
    if (!valid || saving) return;
    Keyboard.dismiss();
    setSaving(true);
    try {
      await onSave({
        ...editing,
        address: address.trim(),
        label: label.trim(),
      });
    } finally {
      setSaving(false);
    }
  }, [address, editing, label, onSave, saving, valid]);

  if (!visible) return null;

  return (
    <Portal>
      <SemiModal
        animationType="slide"
        closeDisabled={saving}
        contentContainerStyle={[
          styles.sheet,
          keyboardHeight > 0 && {marginBottom: keyboardHeight},
        ]}
        flexHeight={0.01}
        modalTheme={theme}
        onRequestClose={close}
        title={editMode ? 'Edit Address' : 'Add Address'}
        visible={visible}>
        <View style={[styles.content, {paddingBottom: 16 + insets.bottom}]}>
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Name</Text>
            <View style={[styles.inputContainer, labelFocused && styles.inputFocused]}>
              <TextInput
                autoCapitalize="words"
                autoCorrect={false}
                editable={!saving}
                onBlur={() => setLabelFocused(false)}
                onChangeText={setLabel}
                onFocus={() => setLabelFocused(true)}
                onSubmitEditing={() => !editMode && addressInput.current?.focus()}
                placeholder="e.g., Mom's wallet"
                placeholderTextColor={theme.colors.textSubtle}
                returnKeyType="next"
                style={styles.input}
                value={label}
              />
            </View>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Address</Text>
            <View
              style={[
                styles.inputContainer,
                addressFocused && styles.inputFocused,
                validation.error && styles.inputError,
              ]}>
              <TextInput
                ref={addressInput}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!saving && !editMode}
                onBlur={() => setAddressFocused(false)}
                onChangeText={setAddress}
                onFocus={() => setAddressFocused(true)}
                onSubmitEditing={Keyboard.dismiss}
                placeholder="R-address, i-address, VerusID, or 0x..."
                placeholderTextColor={theme.colors.textSubtle}
                returnKeyType="done"
                style={styles.input}
                value={address}
              />
            </View>

            {!editMode ? (
              <View style={styles.actionsRow}>
                <TouchableOpacity
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

            {validation.error ? (
              <Text style={styles.errorText}>{validation.error}</Text>
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
                {address.trim().length > 20 ? (
                  <View style={styles.addressPreview}>
                    <Text style={styles.addressPreviewText}>
                      {truncateAddress(address.trim())}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={styles.buttonContainer}>
            <GradientButton
              bottomColor={theme.colors.primary}
              disabled={!valid || saving}
              onPress={save}
              style={styles.saveButton}
              topColor={theme.colors.primary}>
              {saving ? (
                <ActivityIndicator color={theme.colors.onPrimary} size={18} />
              ) : editMode ? (
                'Update'
              ) : (
                'Save'
              )}
            </GradientButton>
          </View>
        </View>
      </SemiModal>
    </Portal>
  );
};

const createStyles = theme =>
  StyleSheet.create({
    sheet: {
      alignSelf: 'flex-end',
      width: '100%',
      maxHeight: '80%',
      flex: 0,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
    },
    content: {paddingHorizontal: 16},
    inputSection: {marginBottom: 20},
    inputLabel: {
      marginBottom: 8,
      color: theme.colors.textSecondary,
      fontSize: 14,
      ...fontStyle('semiBold'),
    },
    inputContainer: {
      height: 52,
      borderWidth: 1,
      borderColor: 'transparent',
      borderRadius: 12,
      backgroundColor: theme.colors.input,
    },
    inputFocused: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.inputFocused,
      shadowColor: theme.colors.primary,
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    inputError: {
      borderColor: theme.colors.danger,
      backgroundColor: theme.colors.inputFocused,
      shadowColor: theme.colors.danger,
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.12,
      shadowRadius: 4,
    },
    input: {
      flex: 1,
      height: 52,
      paddingHorizontal: 16,
      color: theme.colors.textPrimary,
      fontSize: 16,
      ...fontStyle('regular'),
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
    errorText: {marginTop: 8, color: theme.colors.danger, fontSize: 13},
    validationRow: {marginTop: 10},
    typeIndicator: {flexDirection: 'row', alignItems: 'center', gap: 6},
    typeIndicatorText: {
      color: theme.colors.success,
      fontSize: 13,
      ...fontStyle('medium'),
    },
    addressPreview: {
      alignSelf: 'flex-start',
      marginTop: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceMuted,
    },
    addressPreviewText: {
      color: theme.colors.textSecondary,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 14,
      letterSpacing: 0.5,
    },
    buttonContainer: {paddingTop: 8, paddingBottom: 8},
    saveButton: {width: '100%'},
  });

export default AddressBookEditSheet;
