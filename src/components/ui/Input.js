/**
 * Update: AppTextField (UI Kit)
 * - Tailwind/NativeWind styled text input with label, helper, and error
 * - Show/hide password toggle with eye icon
 */
import React, { useState } from 'react';
import { View, TextInput, Text, Platform, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

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
  secureTextEntry,
  showPasswordToggle = false,
  ...rest
}) => {
  const isCompact = size === 'sm';
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  
  const shouldShowToggle = showPasswordToggle || secureTextEntry;
  const actualSecureEntry = shouldShowToggle ? !isPasswordVisible : secureTextEntry;
  
  return (
    <View className={className}>
      {label ? (
        <Text className="text-sm text-zinc-700 mb-2">{label}</Text>
      ) : null}
      <View className={(isCompact ? "h-11 " : "h-12 ") + "rounded-xl bg-white/60 border border-white/40 px-4 flex-row items-center"}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          className={(isCompact ? "text-base " : "text-base ") + "text-zinc-800 flex-1" + (inputClassName ? " " + inputClassName : "")}
          style={{ paddingVertical: 0, lineHeight: isCompact ? 18 : 20, textAlignVertical: Platform.OS === 'android' ? 'center' : undefined }}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoCorrect={false}
          importantForAutofill="yes"
          secureTextEntry={actualSecureEntry}
          {...rest}
        />
        {shouldShowToggle ? (
          <Pressable 
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            className="ml-2 p-1"
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? "Hide password" : "Show password"}
          >
            <Icon 
              name={isPasswordVisible ? "eye-off" : "eye"} 
              size={20} 
              color="#6B7280" 
            />
          </Pressable>
        ) : null}
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


