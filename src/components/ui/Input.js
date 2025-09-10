/**
 * New file: AppTextField (UI Kit)
 * - Tailwind/NativeWind styled text input with label, helper, and error
 */
import React from 'react';
import { View, TextInput, Text, Platform } from 'react-native';

const AppTextField = ({
  label,
  placeholder,
  value,
  onChangeText,
  autoCapitalize = 'none',
  returnKeyType = 'done',
  onSubmitEditing,
  helperText,
  errorText,
  size = 'md',
  className,
  inputClassName,
  ...rest
}) => {
  const isCompact = size === 'sm';
  return (
    <View className={className}>
      {label ? (
        <Text className="text-sm text-zinc-700 mb-2">{label}</Text>
      ) : null}
      <View className={(isCompact ? "h-11 " : "h-12 ") + "rounded-xl bg-white/60 border border-white/40 px-4"}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          className={(isCompact ? "text-base " : "text-base ") + "text-zinc-800 h-full" + (inputClassName ? " " + inputClassName : "")}
          style={{ paddingVertical: 0, lineHeight: isCompact ? 18 : 20, height: '100%', textAlignVertical: Platform.OS === 'android' ? 'center' : undefined }}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoCorrect={false}
          importantForAutofill="yes"
          {...rest}
        />
      </View>
      {helperText && !errorText ? (
        <Text className="text-xs text-zinc-500 mt-2">{helperText}</Text>
      ) : null}
      {errorText ? (
        <Text className="text-xs text-red-600 mt-2">{errorText}</Text>
      ) : null}
    </View>
  );
};

export default AppTextField;


