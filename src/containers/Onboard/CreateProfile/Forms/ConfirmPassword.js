/**
 * New file: ConfirmPassword
 * - Single confirm field, inline validation, responsive layout
 */
import React, { useState } from 'react';
import { View, TouchableWithoutFeedback, Keyboard, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SoftSpotlightBackground from '../../../../components/SoftSpotlightBackground';
import useResponsive from '../../../../hooks/useResponsive';
import { useHeaderHeight } from '@react-navigation/elements';
import { AppButton, AppTextField } from '../../../../components/ui';

export default function ConfirmPassword({ password, navigation }) {
  const { isVerySmallHeight, isSmallHeight, height: screenHeight } = useResponsive();
  const headerHeight = useHeaderHeight();
  const topPadding = headerHeight; // content sits directly under native header
  const titleSizeClass = isVerySmallHeight ? 'text-2xl' : isSmallHeight ? 'text-3xl' : 'text-4xl';
  const subtitleLineHeight = isSmallHeight || isVerySmallHeight ? 20 : 22;

  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);

  const getErrorText = () => {
    if (!touched) return '';
    if (!confirm) return 'Please re-enter your password.';
    if (confirm !== password) return 'Passwords do not match.';
    return '';
  };

  const next = () => {
    if (!touched) setTouched(true);
    if (getErrorText()) return;
    navigation.navigate('UseBiometrics');
  };

  return (
    <SafeAreaView className="flex-1">
      <SoftSpotlightBackground pointerEvents="none" className="absolute left-0 right-0 top-0 bottom-0" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          {isVerySmallHeight ? (
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', paddingTop: topPadding }} className="px-5 pb-4">
              <View>
                <View>
                  <Text className={'text-zinc-800 font-bold ' + titleSizeClass}>{'Confirm password'}</Text>
                  <Text className="text-zinc-600 mt-2" style={{ lineHeight: subtitleLineHeight }}>{'Re-enter your password to confirm.'}</Text>
                </View>
                <View className="mt-8">
                  <Text className="text-sm text-zinc-700 mb-2">{'Confirm password'}</Text>
                  <AppTextField
                    placeholder="Re-enter password"
                    value={confirm}
                    onChangeText={text => setConfirm(text)}
                    returnKeyType="done"
                    onSubmitEditing={next}
                    onBlur={() => setTouched(true)}
                    secureTextEntry={true}
                    errorText={getErrorText()}
                  />
                </View>
              </View>
              <AppButton onPress={next} disabled={confirm.length === 0}>{'Next'}</AppButton>
            </ScrollView>
          ) : (
            <View className="flex-1 px-5 pb-6 justify-between" style={{ paddingTop: topPadding }}>
              <View>
                <View>
                  <Text className={'text-zinc-800 font-bold ' + titleSizeClass}>{'Confirm password'}</Text>
                  <Text className="text-zinc-600 mt-2" style={{ lineHeight: subtitleLineHeight }}>{'Re-enter your password to confirm.'}</Text>
                </View>
                <View className="mt-8">
                  <Text className="text-sm text-zinc-700 mb-2">{'Confirm password'}</Text>
                  <AppTextField
                    placeholder="Re-enter password"
                    value={confirm}
                    onChangeText={text => setConfirm(text)}
                    returnKeyType="done"
                    onSubmitEditing={next}
                    onBlur={() => setTouched(true)}
                    secureTextEntry={true}
                    errorText={getErrorText()}
                  />
                </View>
              </View>
              <AppButton onPress={next} disabled={confirm.length === 0}>{'Next'}</AppButton>
            </View>
          )}
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


