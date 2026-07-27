import React, {forwardRef, useState} from 'react';
import {TextInput, TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {appTextInputStyles as styles} from '../styles';
import {
  resolveOnboardingTheme,
  useOnboardingTheme,
} from '../theme/onboarding';

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
    placeholderTextColor,
    rightAccessibilityLabel,
    rightIcon,
    rightIconColor,
    secureTextEntry = false,
    size = 'default',
    supportingTextStyle,
    themeMode,
    value,
    ...inputProps
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const onboardingTheme = useOnboardingTheme();
  const theme = themeMode
    ? resolveOnboardingTheme(themeMode)
    : onboardingTheme;
  const supportingText = errorText || helperText;
  const resolvedPlaceholderTextColor =
    placeholderTextColor || theme.colors.textSubtle;
  const resolvedRightIconColor = rightIconColor || theme.colors.textSubtle;
  const isMultiline = inputProps.multiline === true;
  const isCompact = size === 'compact' && !isMultiline;
  const inputBorderColor =
    isCompact && !theme.isDark
      ? theme.colors.borderStrong
      : theme.colors.inputBorder;

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
      {label ? (
        <Text
          style={[
            styles.label,
            {color: theme.colors.textSecondary},
            labelStyle,
          ]}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputShell,
          isMultiline
            ? styles.multilineInputShell
            : styles.singleLineInputShell,
          isCompact && styles.compactInputShell,
          {
            backgroundColor: theme.colors.input,
            borderColor: inputBorderColor,
          },
          focused && styles.inputShellFocused,
          focused && {
            borderColor: theme.colors.primary,
            backgroundColor: theme.colors.inputFocused,
            shadowColor: theme.colors.primary,
          },
          errorText && styles.inputShellError,
          errorText && {
            borderColor: theme.colors.danger,
          },
          inputShellStyle,
        ]}>
        {leftAccessory ? (
          <View
            style={[
              styles.leftAccessory,
              isCompact && styles.compactLeftAccessory,
            ]}>
            {leftAccessory}
          </View>
        ) : null}
        <TextInput
          {...inputProps}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          onBlur={handleBlur}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          placeholder={placeholder}
          placeholderTextColor={resolvedPlaceholderTextColor}
          secureTextEntry={secureTextEntry}
          selectionColor={theme.colors.primary}
          ref={ref}
          style={[
            styles.input,
            isMultiline ? styles.multilineInput : styles.singleLineInput,
            isCompact && styles.compactInput,
            {color: theme.colors.textPrimary},
            inputStyle,
          ]}
          value={value}
        />
        {rightIcon ? (
          <TouchableOpacity
            accessibilityLabel={rightAccessibilityLabel}
            accessibilityRole="button"
            activeOpacity={0.72}
            onPress={onRightPress}
            style={[
              styles.rightAction,
              isCompact && styles.compactRightAction,
            ]}>
            <MaterialCommunityIcons
              color={resolvedRightIconColor}
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
            {color: theme.colors.textSubtle},
            errorText && styles.errorText,
            errorText && {
              color: theme.colors.danger,
            },
            supportingTextStyle,
          ]}>
          {supportingText}
        </Text>
      ) : null}
    </View>
  );
});

export default AppTextInput;
