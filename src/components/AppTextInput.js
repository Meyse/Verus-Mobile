import React, {forwardRef, useState} from 'react';
import {TextInput, TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../globals/colors';
import {appTextInputStyles as styles} from '../styles';

const AppTextInput = forwardRef(function AppTextInput(
  {
    autoCapitalize = 'none',
    autoCorrect = false,
    containerStyle,
    errorText,
    helperText,
    inputShellStyle,
    inputStyle,
    label,
    labelStyle,
    leftAccessory,
    onBlur,
    onChangeText,
    onFocus,
    onRightPress,
    placeholder,
    placeholderTextColor = '#8E939B',
    rightAccessibilityLabel,
    rightIcon,
    rightIconColor = Colors.verusDarkGray,
    secureTextEntry = false,
    supportingTextStyle,
    value,
    ...inputProps
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const supportingText = errorText || helperText;

  const handleBlur = event => {
    setFocused(false);
    if (typeof onBlur === 'function') onBlur(event);
  };

  const handleFocus = event => {
    setFocused(true);
    if (typeof onFocus === 'function') onFocus(event);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={[styles.label, labelStyle]}>{label}</Text> : null}
      <View
        style={[
          styles.inputShell,
          focused && styles.inputShellFocused,
          errorText && styles.inputShellError,
          inputShellStyle,
        ]}>
        {leftAccessory ? (
          <View style={styles.leftAccessory}>{leftAccessory}</View>
        ) : null}
        <TextInput
          {...inputProps}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          onBlur={handleBlur}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor}
          secureTextEntry={secureTextEntry}
          selectionColor={Colors.primaryColor}
          ref={ref}
          style={[styles.input, inputStyle]}
          value={value}
        />
        {rightIcon ? (
          <TouchableOpacity
            accessibilityLabel={rightAccessibilityLabel}
            accessibilityRole="button"
            activeOpacity={0.72}
            onPress={onRightPress}
            style={styles.rightAction}>
            <MaterialCommunityIcons
              color={rightIconColor}
              name={rightIcon}
              size={22}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {supportingText ? (
        <Text
          style={[
            styles.supportingText,
            errorText && styles.errorText,
            supportingTextStyle,
          ]}>
          {supportingText}
        </Text>
      ) : null}
    </View>
  );
});

export default AppTextInput;
