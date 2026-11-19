import React, {forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useOnboardingTheme} from '../theme/onboarding';
import {editAmountInput} from '../utils/amountInput';

// Keep a native editable field for selection, paste, hardware input and accessibility.
// The custom keypad edits its text; it never parses or rounds the amount.
// `compact` (small windows) draws the amount at 80% of `amountInput` (32/40)
// and the unit in `titleRow`. The 20-point floor and maxLength are unchanged.
// A clear icon at the right edge empties the field; it shows only when there
// is text (PR 266 review R3, option B). `maxDecimals` limits keypad entry, as
// money entry keeps 2 decimals (R14).
const AmountInput = forwardRef(({compact = false, decimalSeparator, disabled = false, maxDecimals, onChangeText, onUnitPress, unit, value}, ref) => {
  const theme = useOnboardingTheme();
  const nativeRef = useRef(null);
  const valueRef = useRef(value);
  const selectionRef = useRef({start: value.length, end: value.length});
  const [selection, setSelection] = useState();
  const [width, setWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const unitType = compact ? theme.typography.titleRow : theme.typography.titleSheet;
  const maxFontSize = compact
    ? Math.round(theme.typography.amountInput.fontSize * 0.8)
    : theme.typography.amountInput.fontSize;
  // About 0.6 em per unit character: 12 at 20 points, 9.6 at 16 points.
  const unitRoom = Math.max(48, Math.ceil(unit.length * unitType.fontSize * 0.6)) + (onUnitPress ? 20 : 0);
  // The amount stays centered, so the clear slot's width is kept free on both
  // sides. A value too long for that room uses the full width and puts the
  // clear icon on the unit line under it.
  const entryWidth = Math.max(0, width - CLEAR_SLOT * 2);
  const fontSize = width > 0
    ? Math.max(20, Math.min(maxFontSize, Math.floor((entryWidth - unitRoom - 8) / (Math.max(value.length, 1) * 0.64))))
    : maxFontSize;
  const maxLength = width > 0 ? Math.floor(width * 0.9 / (20 * 0.64)) : 23;
  const measuredWidth = textWidth || Math.max(32, (value.length || 1) * fontSize * 0.64);
  const stacked = width > 0 && measuredWidth + unitRoom + 8 > entryWidth;
  const wide = width > 0 && measuredWidth + 8 > entryWidth;
  const inputWidth = Math.min((wide ? width : entryWidth) || 320, Math.max(40, Math.ceil(measuredWidth) + 8));
  const lineHeight = fontSize + 8;
  const showClear = value.length > 0 && !disabled;

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

  const setCursor = cursor => {
    selectionRef.current = cursor;
    setSelection(cursor);
  };

  const clear = () => {
    valueRef.current = '';
    setCursor({start: 0, end: 0});
    onChangeText('');
    nativeRef.current?.focus();
  };

  useImperativeHandle(ref, () => ({
    // Put a value from the caller (such as a converted amount) in the field
    // with all of it selected, so the next key replaces it. Call before the
    // caller's own state update.
    selectAll: next => {
      valueRef.current = next;
      const cursor = {start: 0, end: next.length};
      selectionRef.current = cursor;
      setSelection(cursor);
    },
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
      const next = editAmountInput(valueRef.current, selectionRef.current, key, decimalSeparator, maxLength, maxDecimals ?? Infinity);
      valueRef.current = next.value;
      selectionRef.current = next.selection;
      setSelection(next.selection);
      onChangeText(next.value);
      nativeRef.current?.focus();
    },
  }), [decimalSeparator, disabled, maxDecimals, maxLength, onChangeText]);

  const amountType = [theme.typography.amountInput, {fontSize, lineHeight}];
  return (
    <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={[styles.container, compact && styles.compact]}>
      <Text
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        onTextLayout={event => setTextWidth(event.nativeEvent.lines[0]?.width || 0)}
        pointerEvents="none"
        style={[amountType, styles.measure]}>
        {value || '0'}
      </Text>
      <View style={[styles.row, compact && styles.compact, stacked && styles.stacked]}>
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
              stacked ? theme.typography.labelMd : unitType,
              styles.unit,
              {color: theme.colors.textSecondary},
            ]} numberOfLines={1}>{unit}</Text>
            <MaterialCommunityIcons name="chevron-down" size={18} color={theme.colors.textSecondary} />
          </Pressable>
        ) : <Text style={[
          stacked ? theme.typography.labelMd : unitType,
          styles.unit,
          {color: theme.colors.textSecondary},
        ]} numberOfLines={1}>{unit}</Text>}
      </View>
      {showClear ? (
        <Pressable
          accessibilityLabel="Clear amount"
          accessibilityRole="button"
          hitSlop={CLEAR_HIT_SLOP}
          onPress={clear}
          style={[
            styles.clear,
            wide ? styles.clearBelow : {top: 0, height: Math.max(compact ? 40 : 48, lineHeight)},
          ]}>
          {({pressed}) => (
            <MaterialCommunityIcons
              color={theme.colors.textSecondary}
              name="close-circle-outline"
              size={22}
              style={pressed && styles.pressed}
            />
          )}
        </Pressable>
      ) : null}
    </View>
  );
});

// 44 points wide at the right edge; hit slop keeps a 44-point target on the
// 40-point compact line and on the unit line.
const CLEAR_SLOT = 44;
const CLEAR_HIT_SLOP = {top: 4, bottom: 4};

const styles = StyleSheet.create({
  container: {width: '100%', minHeight: 48},
  measure: {position: 'absolute', width: 2000, opacity: 0},
  compact: {minHeight: 40},
  row: {minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8},
  stacked: {flexDirection: 'column', gap: 0},
  input: {padding: 0, textAlign: 'center'},
  unit: {flexShrink: 0},
  unitAction: {flexShrink: 0, minWidth: 44, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 2},
  clear: {position: 'absolute', right: 0, width: CLEAR_SLOT, alignItems: 'center', justifyContent: 'center'},
  clearBelow: {bottom: 0, height: 36},
  pressed: {opacity: 0.72},
});

export default AmountInput;
