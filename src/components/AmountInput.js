import React, {forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useOnboardingTheme} from '../theme/onboarding';
import {editAmountInput} from '../utils/amountInput';

// Keep a native editable field for selection, paste, hardware input and accessibility.
// The custom keypad edits its text; it never parses or rounds the amount.
const AmountInput = forwardRef(({decimalSeparator, disabled = false, onChangeText, onUnitPress, unit, value}, ref) => {
  const theme = useOnboardingTheme();
  const nativeRef = useRef(null);
  const valueRef = useRef(value);
  const selectionRef = useRef({start: value.length, end: value.length});
  const [selection, setSelection] = useState();
  const [width, setWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const unitRoom = Math.max(48, unit.length * 12) + (onUnitPress ? 20 : 0);
  const fontSize = width > 0
    ? Math.max(20, Math.min(40, Math.floor((width - unitRoom - 8) / (Math.max(value.length, 1) * 0.64))))
    : 40;
  const maxLength = width > 0 ? Math.floor(width * 0.9 / (20 * 0.64)) : 23;
  const measuredWidth = textWidth || Math.max(32, (value.length || 1) * fontSize * 0.64);
  const stacked = width > 0 && measuredWidth + unitRoom + 8 > width;
  const inputWidth = Math.min(width || 320, Math.max(40, Math.ceil(measuredWidth) + 8));

  useLayoutEffect(() => {
    if (valueRef.current === value) return;
    const previousValue = valueRef.current;
    valueRef.current = value;
    // A locale-only separator change keeps the same character positions.
    if (previousValue.replace(/,/g, '.') === value.replace(/,/g, '.')) return;
    const cursor = {start: value.length, end: value.length};
    selectionRef.current = cursor;
    setSelection(cursor);
  }, [value]);

  useImperativeHandle(ref, () => ({
    focus: () => {
      // Android can put the cursor at the start when the field gets focus
      // again (Back from a later step). Keypad keys then type in front of
      // the old text, so always start at the end.
      const end = valueRef.current.length;
      selectionRef.current = {start: end, end};
      setSelection({start: end, end});
      nativeRef.current?.focus();
    },
    edit: key => {
      if (disabled) return;
      const next = editAmountInput(valueRef.current, selectionRef.current, key, decimalSeparator, maxLength);
      valueRef.current = next.value;
      selectionRef.current = next.selection;
      setSelection(next.selection);
      onChangeText(next.value);
      nativeRef.current?.focus();
    },
  }), [decimalSeparator, disabled, maxLength, onChangeText]);

  const amountType = [theme.typography.amountInput, {fontSize, lineHeight: fontSize + 8}];
  return (
    <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={styles.container}>
      <Text
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        onTextLayout={event => setTextWidth(event.nativeEvent.lines[0]?.width || 0)}
        pointerEvents="none"
        style={[amountType, styles.measure]}>
        {value || '0'}
      </Text>
      <View style={[styles.row, stacked && styles.stacked]}>
        <TextInput
          ref={nativeRef}
          accessibilityLabel={`Amount in ${unit}`}
          autoFocus
          editable={!disabled}
          keyboardType="decimal-pad"
          maxLength={maxLength}
          onChangeText={text => {
            valueRef.current = text;
            setSelection(undefined);
            onChangeText(text);
          }}
          onSelectionChange={event => {
            selectionRef.current = event.nativeEvent.selection;
            setSelection(undefined);
          }}
          placeholder="0"
          placeholderTextColor={theme.colors.textSubtle}
          selection={selection}
          selectionColor={theme.colors.primary}
          showSoftInputOnFocus={false}
          style={[amountType, styles.input, {color: theme.colors.textPrimary, width: inputWidth}]}
          value={value}
        />
        {onUnitPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Choose currency, current ${unit}`}
            accessibilityState={{disabled}}
            disabled={disabled}
            onPress={onUnitPress}
            style={styles.unitAction}>
            <Text style={[
              stacked ? theme.typography.labelMd : theme.typography.titleSheet,
              styles.unit,
              {color: theme.colors.textSecondary},
            ]} numberOfLines={1}>{unit}</Text>
            <MaterialCommunityIcons name="chevron-down" size={18} color={theme.colors.textSecondary} />
          </Pressable>
        ) : <Text style={[
          stacked ? theme.typography.labelMd : theme.typography.titleSheet,
          styles.unit,
          {color: theme.colors.textSecondary},
        ]} numberOfLines={1}>{unit}</Text>}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {width: '100%', minHeight: 48},
  measure: {position: 'absolute', width: 2000, opacity: 0},
  row: {minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8},
  stacked: {flexDirection: 'column', gap: 0},
  input: {padding: 0, textAlign: 'center'},
  unit: {flexShrink: 0},
  unitAction: {flexShrink: 0, minWidth: 44, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 2},
});

export default AmountInput;
